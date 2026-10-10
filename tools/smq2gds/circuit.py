"""smq-circuit/1 → hierarchical GDS, preview PNG and a GDS re-check.

    python -m smq2gds.circuit engine_layout.json [-o outdir] [--verification engine_verification.json]

The PIC Design Lab (src/lab/engine.js) exports instances with their placement and the parameters of each cell, and every
waveguide as primitives (straight with optional linear taper, 90° corner — circular or Euler clothoid pair, circular arc).
This module draws exactly those primitives (the same corner construction as the rectangular delay spiral), builds one cell
per distinct component, places the references, writes the GDS, reads it back with KLayout and checks the drawn geometry
against the circuit data: hierarchy, connectivity (merged core pieces, lane paths from input facet to output facet), port
positions, route lengths, instance extents, spacing / width / bend rules, die boundary, and per net on the abstract metal
(RF on M1, DC on M2) one piece from the device contact to its pad and no piece shared by two nets.
Device-local waveguides (MZM arms and S-bends, monitor tap and PD feed, ring bus transitions) come from params.local, the same
primitives the game draws; MMIs are the 1-3 PCell, rings the 2-3R ring_allpass PCell. The ribbon normals at every primitive
end are exact, so abutting shapes meet without notches.

Generic PDK. Implants, metal, pads, Ge and the termination are annotation geometry — not foundry rules, not tape-out ready.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import sys
from pathlib import Path

import gdsfactory as gf
import klayout.db as kdb
import numpy as np

from . import design, pcells

SCHEMA = "smq-circuit/1"
RF_W, DC_W = 10.0, 5.0  # abstract metal line widths (µm)


# ---------------------------------------------------------------- primitives → centre line
def _arc_n(r: float, ang: float) -> int:
    return max(8, int(math.ceil(abs(ang) / math.sqrt(8e-3 / max(r, 1e-6)))))  # sagitta ≲ 1 nm


def _tangent(pts: np.ndarray) -> np.ndarray:
    """Unit tangents of a sampled curve: central chords inside, end chords at the ends (ends are overwritten by exact values)."""
    d = np.diff(pts, axis=0)
    t = np.empty_like(pts)
    t[1:-1] = d[:-1] / np.linalg.norm(d[:-1], axis=1)[:, None] + d[1:] / np.linalg.norm(d[1:], axis=1)[:, None]
    t[0], t[-1] = d[0], d[-1]
    return t / np.linalg.norm(t, axis=1)[:, None]


def _dir(deg: float) -> np.ndarray:
    return np.array([math.cos(math.radians(deg)), math.sin(math.radians(deg))])


def prim_points(p: dict, tangents: bool = False):
    """Centre-line points and widths of one primitive (independent of the game's sampler); with tangents=True also the
    unit tangent at every point, exact at both ends (so ribbon ends are square to the port and abut the next shape)."""
    w = p.get("w", 0.5)
    if p["t"] == "L":
        a, b = np.array(p["a"], float), np.array(p["b"], float)
        w0, w1 = p.get("w0", w), p.get("w1", w)
        pts, wid = np.stack([a, b]), np.array([w0, w1], float)
        if p.get("w0") is not None:  # taper: sample so the width is linear along the segment
            f = np.linspace(0, 1, 9)
            pts, wid = a + (b - a) * f[:, None], w0 + (w1 - w0) * f
        t = np.tile((b - a) / np.hypot(*(b - a)), (len(pts), 1))
    elif p["t"] == "A":
        a0, a1 = math.radians(p["a0_deg"]), math.radians(p["a1_deg"])
        th = np.linspace(a0, a1, _arc_n(p["r"], a1 - a0) + 1)
        pts = np.stack([p["c"][0] + p["r"] * np.cos(th), p["c"][1] + p["r"] * np.sin(th)], axis=1)
        sg = 1.0 if a1 > a0 else -1.0
        t = np.stack([-np.sin(th) * sg, np.cos(th) * sg], axis=1)
        wid = np.full(len(pts), w)
    else:
        loc = pcells._corner_local(p["shape"], p["R"], p["a0"], 0.0)
        pts = pcells._place(loc, p["V"], p["h_deg"], int(p["turn"]))
        t = _tangent(pts)
        t[0], t[-1] = _dir(p["h_deg"]), _dir(p["h_deg"] + 90 * int(p["turn"]))
        wid = np.full(len(pts), w)
    return (pts, wid, t) if tangents else (pts, wid)


def centreline(prims: list, tangents: bool = False):
    """Concatenate primitives. Joins closer than 1 nm (the game's continuity tolerance) are one point."""
    P, W, T = [], [], []
    for p in prims:
        pts, w, t = prim_points(p, True)
        if P and np.hypot(*(P[-1][-1] - pts[0])) < 1e-3:
            T[-1] = T[-1].copy()
            T[-1][-1] = (T[-1][-1] + t[0]) / np.hypot(*(T[-1][-1] + t[0]))
            pts, w, t = pts[1:], w[1:], t[1:]
        P.append(pts), W.append(w), T.append(t)
    pts, w, t = np.vstack(P), np.concatenate(W), np.vstack(T)
    return (pts, w, t) if tangents else (pts, w)


def ribbon(c: gf.Component, prims: list, layer) -> None:
    """Waveguide polygon(s) of a primitive chain: centre line ± w/2 along the exact normals, chunked like pcells._ribbon."""
    pts, w, t = centreline(prims, True)
    nrm = np.stack([-t[:, 1], t[:, 0]], axis=1)
    left, right = pts + nrm * (w[:, None] / 2), pts - nrm * (w[:, None] / 2)
    for i in range(0, len(pts) - 1, pcells.MAX_PTS):
        j = min(i + pcells.MAX_PTS, len(pts) - 1)
        c.add_polygon(np.vstack([left[i : j + 1], right[i : j + 1][::-1]]), layer=tuple(layer))


def poly_len(pts: np.ndarray) -> float:
    return float(np.hypot(*np.diff(pts, axis=0).T).sum())


def _rect(c: gf.Component, x0, y0, x1, y1, layer) -> None:
    c.add_polygon([(x0, y0), (x1, y0), (x1, y1), (x0, y1)], layer=tuple(layer))


def _hash(o) -> str:
    return hashlib.sha1(json.dumps(o, sort_keys=True).encode()).hexdigest()[:8]


# ---------------------------------------------------------------- cells (local frame: optical input at the origin, flow +x)
def _layers(L: dict, lay: dict) -> dict:
    ann = lay.get("annotation", {})
    mat = L["platform"]["mat"]
    return {"core": lay["core"][mat], "si": lay["core"]["si"], "label": lay.get("label"), "fp": lay.get("floorplan"),
            "m1": ann.get("m1", ann.get("pad", [41, 0])), "m2": ann.get("m2", [45, 0]), "pad": ann.get("pad", [41, 0]),
            "heater": ann.get("heater", [47, 0]), "ge": ann.get("ge", [5, 0]), "term": ann.get("term", [49, 0])}


def _ssc(I: dict, Ly: dict) -> gf.Component:
    p = I["params"]
    c = gf.Component(f"smq_ssc_{_hash(p)}")
    Lt, tip, w = p["Lt_um"], p["tip_um"], p["w_um"]
    c.add_polygon([(0, -tip / 2), (Lt, -w / 2), (Lt, w / 2), (0, tip / 2)], layer=tuple(Ly["core"]))
    return c


def _mmi_cell(p: dict, layer) -> gf.Component:
    """1-3 MMI with its input port moved to the origin."""
    g = {"type": "1x2", "w_io_um": p["w_io_um"], "wt_um": p["wt_um"], "taper_len_um": p["taper_len_um"], "L_um": p["L_um"], "W_um": p["W_um"], "s_um": p["s_um"]}
    m = pcells.mmi(g, layer)
    c = gf.Component(f"smq_mmi_{_hash({**g, 'layer': list(layer)})}")
    r = c << m
    o1 = [q for q in m.ports if q.name == "o1"][0]
    r.dmove((-o1.center[0], -o1.center[1]))
    return c


def _mzm(I: dict, Ly: dict) -> gf.Component:
    p = I["params"]
    c = gf.Component(f"smq_mzm_{_hash(p)}")
    mc = _mmi_cell(p["mmi"], Ly["core"])
    c << mc
    out = c << mc
    out.dcplx_trans = kdb.DCplxTrans(1.0, 180.0, False, p["local"]["mmi_out"]["x_um"], 0.0)
    _draw_local(c, p["local"]["prims"], Ly)
    for r in p["local"]["rects"]:
        _rect(c, r["x0"], r["y0"], r["x1"], r["y1"], Ly[r["layer"]])
    return c


def _chains(prims: list) -> list:
    """Split a primitive list into continuous chains (end of one = start of the next)."""
    out, cur = [], []
    for p in prims:
        pts, _ = prim_points(p)
        if cur:
            last, _ = prim_points(cur[-1])
            if np.hypot(*(last[-1] - pts[0])) > 1e-3:
                out.append(cur)
                cur = []
        cur.append(p)
    if cur:
        out.append(cur)
    return out


def _draw_local(c: gf.Component, prims: list, Ly: dict) -> None:
    """Local waveguide primitives of a cell, grouped by layer ('core' unless a prim says 'si')."""
    for lname in dict.fromkeys(p.get("layer", "core") for p in prims):
        for chain in _chains([p for p in prims if p.get("layer", "core") == lname]):
            ribbon(c, chain, Ly[lname])


def _mrr(I: dict, Ly: dict, lay: dict) -> gf.Component:
    g, loc = I["params"]["ring"], I["params"].get("local", {})
    ring, _ = pcells.ring_allpass(g, lay)
    c = gf.Component(f"smq_mrrlane_{_hash(I['params'])}")
    r = c << ring
    R, w, gap = g["R_um"], g["w_um"], g["gap_um"]
    # lab frame: optical input at the origin, bus along y = 0; the ring cell's bus is centred on its own origin
    r.dmove((loc.get("ring_x_um", g.get("bus_len_um", 2 * R + 20) / 2), loc.get("ring_y_um", R + gap + w)))
    _draw_local(c, loc.get("prims", []), Ly)
    return c


def _mrr_wdm(I: dict, Ly: dict, lay: dict) -> gf.Component:
    """WDM8 shared bus (Phase E): eight 2-3R ring cells (one per distinct radius) on a Si bus, transitions at the two ends."""
    p, loc = I["params"], I["params"]["local"]
    c = gf.Component(f"smq_mrrwdm_{_hash(p)}")
    for k, g in enumerate(p["rings"]):
        ring, _ = pcells.ring_allpass(g, lay)
        r = c << ring
        r.dmove((loc["ring_x_um"][k], loc["ring_y_um"][k]))
    _draw_local(c, loc.get("prims", []), Ly)
    return c


def _tap(I: dict, Ly: dict) -> gf.Component:
    p = I["params"]
    c = gf.Component(f"smq_tap_pd_{_hash(p)}")
    _draw_local(c, p["local"]["prims"], Ly)
    for r in p["local"]["rects"]:
        _rect(c, r["x0"], r["y0"], r["x1"], r["y1"], Ly[r["layer"]])
    return c


# ---------------------------------------------------------------- assembly
_OWN = ("SMQ_PIC_", "smq_routes_", "smq_metal_", "smq_mzm_", "smq_mrrwdm_", "smq_mrrlane_", "smq_tap_pd_", "smq_ssc_", "smq_mmi_", "smq_ring_")


def _fresh() -> None:
    """Drop cells of an earlier circuit built in this process (same names would clash in the shared gdsfactory layout)."""
    for pre in _OWN:  # parents first
        for c in [c for c in gf.kcl.each_cell() if c.name.startswith(pre)]:
            gf.kcl.delete_cell(c.cell_index())


def build_circuit(L: dict, lay: dict) -> tuple[gf.Component, dict]:
    if L.get("schema") != SCHEMA:
        raise design.DesignError(f"schema must be {SCHEMA!r}, got {L.get('schema')!r}")
    _fresh()
    Ly, pf, arch, die = _layers(L, lay), L["platform"], L["architecture"], L["die"]
    tag = "WDM8" if arch["modulator"] == "wdm" else f"{arch['modulator'].upper()}_DR8"
    top = gf.Component(f"SMQ_PIC_{pf['id']}_{tag}_{L.get('design_hash', _hash(L['instances']))}")
    cells, refs = {}, {}
    for I in L["instances"]:
        key = I["type"] + _hash(I["params"])
        if key not in cells:
            cells[key] = {"ssc": lambda: _ssc(I, Ly), "mmi1x2": lambda: _mmi_cell(I["params"], Ly["core"]), "mzm": lambda: _mzm(I, Ly),
                          "mrr": lambda: _mrr(I, Ly, lay), "mrr_wdm": lambda: _mrr_wdm(I, Ly, lay), "tap_pd": lambda: _tap(I, Ly)}[I["type"]]()
        r = top << cells[key]
        pl = I["placement"]
        r.dcplx_trans = kdb.DCplxTrans(1.0, float(pl["rot_deg"]), False, pl["x_um"], pl["y_um"])
        refs[I["id"]] = r
    routes = gf.Component(f"smq_routes_{L.get('design_hash', '')}")
    info_routes = []
    for rt in L["routing"]["optical"]:
        if not rt["ok"] or not rt["prims"]:
            info_routes.append({"net": rt["net"], "ok": False})
            continue
        pts, w = centreline(rt["prims"])
        ribbon(routes, rt["prims"], Ly["core"])
        info_routes.append({"net": rt["net"], "from": rt["from"], "to": rt["to"], "length_py_um": poly_len(pts), "length_game_um": rt["length_um"], "start": pts[0].tolist(), "end": pts[-1].tolist()})
    top << routes
    metal = gf.Component(f"smq_metal_{L.get('design_hash', '')}")
    for ln in L["routing"]["electrical"]:
        wl, layer = (ln.get("width_um", RF_W), Ly["m1"]) if ln["kind"] == "rf" else (ln.get("width_um", DC_W), Ly["m2"])
        for (x0, y0), (x1, y1) in zip(ln["pts"][:-1], ln["pts"][1:]):
            _rect(metal, min(x0, x1) - wl / 2, min(y0, y1) - wl / 2, max(x0, x1) + wl / 2, max(y0, y1) + wl / 2, layer)
    for pd in L["routing"]["pads"]:
        h = pd["w"] / 2
        _rect(metal, pd["x"] - h, pd["y"] - h, pd["x"] + h, pd["y"] + h, Ly["m1"] if pd["kind"] == "rf" else Ly["m2"])
    top << metal
    if Ly["fp"]:
        top.add_polygon([(0, 0), (die["W_um"], 0), (die["W_um"], die["H_um"]), (0, die["H_um"])], layer=tuple(Ly["fp"]))
    if Ly["label"]:
        top.add_label(f"{SCHEMA} {pf['id']} 1.6T {'WDM8 Tx MRR x8 shared bus' if arch['modulator'] == 'wdm' else 'DR8 Tx ' + arch['modulator'].upper() + ' x8'} · lasers {arch['lasers']} · hash {L.get('design_hash', '')} · ENGINEERING PROTOTYPE, NOT TAPE-OUT READY", position=(0, die["H_um"] + 20), layer=tuple(Ly["label"]))
        for I in L["instances"]:
            top.add_label(I["id"], position=(I["placement"]["x_um"], I["placement"]["y_um"]), layer=tuple(Ly["label"]))
    return top, {"cells": len(cells), "routes": info_routes, "refs": len(refs)}


# ---------------------------------------------------------------- re-check from the written GDS
def recheck(gds: Path, L: dict, lay: dict, info: dict) -> list[dict]:
    Ly, pf, die, arch = _layers(L, lay), L["platform"], L["die"], L["architecture"]
    out = []

    def add(group, item, ok, detail, warn=False, status=None):
        out.append({"group": group, "item": item, "status": status or ("PASS" if ok else ("WARNING" if warn else "FAIL")), "detail": detail})

    ly = kdb.Layout()
    ly.read(str(gds))
    tops = ly.top_cells()
    add("GDS", "파일 다시 읽기 (top cell 1개)", len(tops) == 1, f"{gds.name}: {gds.stat().st_size / 1024:.0f} KB, top {[t.name for t in tops]}")
    top = tops[0]
    dbu = ly.dbu
    reg = lambda layer: kdb.Region(top.begin_shapes_rec(ly.layer(*layer))).merged() if ly.find_layer(*layer) is not None else kdb.Region()
    # hierarchy: one reference per instance + routes + metal
    n_inst = top.child_instances()
    kinds = {}
    for I in L["instances"]:
        kinds[I["type"]] = kinds.get(I["type"], 0) + 1
    add("GDS", "계층 셀 (소자마다 참조, 같은 소자는 같은 셀)", n_inst == len(L["instances"]) + 2 and info["cells"] <= len(L["instances"]),
        f"참조 {n_inst} = 소자 {len(L['instances'])} + routes + metal · 서로 다른 소자 셀 {info['cells']}개 · {kinds}")
    core = reg(Ly["core"])
    if tuple(Ly["si"]) != tuple(Ly["core"]):
        core = (core + reg(Ly["si"])).merged()  # heterogeneous Si devices on SiN: plan-view union (SiN/Si co-taper overlaps)
    n_rings = kinds.get("mrr", 0) + sum(len(I["params"]["rings"]) for I in L["instances"] if I["type"] == "mrr_wdm")
    n_taps = kinds.get("tap_pd", 0)
    expect = arch["lasers"] + n_rings + n_taps
    add("Connectivity", "광 코어 연결 조각 수", core.count() == expect, f"{core.count()}조각 = 레이저 {arch['lasers']} (트리+레인) + 링 {n_rings} + 탭 암 {n_taps} 기대 {expect}")
    # lane paths: input facet and output facet of each lane lie in the same merged piece
    ports = {(I["id"], q["name"]): q for I in L["instances"] for q in I["ports"]}

    def piece(xy):
        x, y = int(round(xy[0] / dbu)), int(round(xy[1] / dbu))
        box = kdb.Region(kdb.Box(x - 2, y - 2, x + 2, y + 2))
        hit = [k for k, p in enumerate(core.each()) if not (kdb.Region(p) & box).is_empty()]
        return hit[0] if hit else None

    back = {n["to"]: n["from"] for n in L["nets"]["optical"]}
    lane_ok = 0
    outs = [I["id"] for I in L["instances"] if I["role"] == "output"]
    for oid in outs:
        ep = f"{oid}.in"
        while ep in back and not back[ep].startswith("IN"):
            ep = back[ep].split(".")[0] + ".in"
        src = back.get(ep, "").split(".")[0]
        a = ports.get((src, "fib")), ports.get((oid, "fib"))
        if a[0] and a[1]:
            pa, pb = piece(_inward(a[0])), piece(_inward(a[1]))
            if pa is not None and pa == pb:
                lane_ok += 1
    n_out = arch.get("outputs", arch["lanes"])
    add("Connectivity", "레인 경로 (입력 광섬유 단면 ↔ 출력 단면, 같은 도파로 조각)", lane_ok == n_out == len(outs),
        f"{lane_ok}/{n_out} {'출력 (8파장 공유 버스)' if arch['modulator'] == 'wdm' else '레인'}")
    # every optical port has waveguide right behind it
    miss = []
    for (iid, name), q in ports.items():
        if q["kind"] != "optical":
            continue
        x, y = _inward(q)
        if piece((x, y)) is None:
            miss.append(f"{iid}.{name}")
    add("Geometry", "포트 위치에 도파로 (모든 광 포트)", not miss, f"{sum(1 for q in ports.values() if q['kind'] == 'optical')}개 포트" + (f" · 없음: {miss[:4]}" if miss else ""))
    # routes: drawn end points = ports, length = game
    bad_end, bad_len = [], []
    for r in info["routes"]:
        if "start" not in r:
            continue
        fa, fb = r["from"].split("."), r["to"].split(".")
        A, B = ports[(fa[0], fa[1])]["xy_um"], ports[(fb[0], fb[1])]["xy_um"]
        if math.hypot(r["start"][0] - A[0], r["start"][1] - A[1]) > 1e-3 or math.hypot(r["end"][0] - B[0], r["end"][1] - B[1]) > 1e-3:
            bad_end.append(r["net"])
        if abs(r["length_py_um"] - r["length_game_um"]) > 1e-3 * r["length_game_um"] + 0.05:
            bad_len.append(f"{r['net']} {r['length_py_um']:.2f}/{r['length_game_um']:.2f}")
    add("Geometry", "배선 끝점 = 포트 (1 nm)", not bad_end, f"{len(info['routes'])}개 넷" + (f" · 어긋남 {bad_end[:4]}" if bad_end else ""))
    add("Geometry", "배선 길이 = 게임 예측 (0.1 %)", not bad_len, "GDS 중심선 독립 계산" + (f" · {bad_len[:3]}" if bad_len else ""))
    # instance extents vs the circuit data (game bbox)
    over = []
    for inst in top.each_inst():
        cname = ly.cell(inst.cell_index).name
        if cname.startswith(("smq_routes", "smq_metal")):
            continue
        bb = inst.dbbox()
        tx, ty = inst.dcplx_trans.disp.x, inst.dcplx_trans.disp.y
        I = min(L["instances"], key=lambda J: math.hypot(J["placement"]["x_um"] - tx, J["placement"]["y_um"] - ty))
        b = I["bbox_um"]
        if bb.left < b[0] - 0.01 or bb.bottom < b[1] - 0.01 or bb.right > b[2] + 0.01 or bb.top > b[3] + 0.01:
            over.append(f"{I['id']} [{bb.left:.2f},{bb.bottom:.2f},{bb.right:.2f},{bb.top:.2f}] vs {b}")
    add("Geometry", "소자 형상이 게임의 외곽(bbox) 안", not over, f"{len(L['instances'])}개 소자" + (f" · 넘침 {over[:2]}" if over else ""))
    # DRC on the drawn core layers
    gap, litho = pf["rules_um"]["gap"], pf["route_rules"]["litho_min_width_um"]
    sp = []
    for lname in {tuple(Ly["core"]), tuple(Ly["si"])}:
        r = reg(list(lname))
        if r.is_empty():
            continue
        g = gap if lname == tuple(Ly["core"]) else 0.18
        v = r.space_check(int(round(g * 0.98 / dbu)), False, kdb.Metrics.Projection)
        sp.append((lname, v.count(), g))
    add("DRC", "도파로 간격 ≥ 규칙 (코어 층별)", all(n == 0 for _, n, _ in sp), " · ".join(f"{l}: 위반 {n} (≥ {g} µm)" for l, n, g in sp))
    ssc_boxes = kdb.Region()
    for I in L["instances"]:
        if I["type"] == "ssc":
            b = I["bbox_um"]
            ssc_boxes.insert(kdb.Box(int(b[0] / dbu), int((b[1] - 1) / dbu), int(b[2] / dbu), int((b[3] + 1) / dbu)))
    wl = []
    for lname, lm in dict.fromkeys([(tuple(Ly["core"]), litho), (tuple(Ly["si"]), 0.15)]):
        r = reg(list(lname))
        if not r.is_empty():
            wl.append((lname, lm, (r - ssc_boxes).width_check(int(round(lm * 0.98 / dbu)), False, kdb.Metrics.Projection).count()))
    tips = sorted({I["params"]["tip_um"] for I in L["instances"] if I["type"] == "ssc"})
    add("DRC", "최소 선폭 (층별, SSC 끝 제외)", all(n == 0 for *_, n in wl), " · ".join(f"{l} ≥ {m} µm: 위반 {n}" for l, m, n in wl))
    add("DRC", "SSC 끝 폭 (역테이퍼 팁)", min(tips) >= litho, f"팁 {tips} µm vs 리소 가정 {litho} µm — 팁은 1-6 설계값, 공정 능력 확인 필요", warn=True)
    rmin = pf["route_rules"]["R_min_rule_um"]
    tight = [rt["net"] for rt in L["routing"]["optical"] for p in rt["prims"] if (p["t"] == "C" and p["R"] < rmin - 1e-9) or (p["t"] == "A" and p["r"] < rmin - 1e-9)]
    add("DRC", f"굽힘 반경 ≥ {rmin} µm", not tight, f"{len(tight)}곳" if tight else "")
    bb = core.bbox()
    inside = bb.left * dbu >= -1e-3 and bb.bottom * dbu >= die["edge_um"] - 1e-3 and bb.right * dbu <= die["W_um"] + 1e-3 and bb.top * dbu <= die["H_um"] - die["edge_um"] + 1e-3
    add("DRC", "다이 경계 (광 코어)", inside, f"코어 bbox [{bb.left * dbu:.1f}, {bb.bottom * dbu:.1f}, {bb.right * dbu:.1f}, {bb.top * dbu:.1f}] in {die['W_um']}×{die['H_um']} µm")
    # facets: 8 output waveguides reach the east edge
    east = sum(1 for I in L["instances"] if I["role"] == "output" and piece(_inward([q for q in I["ports"] if q["name"] == "fib"][0])) is not None)
    add("Connectivity", f"출력 단면 수 = {n_out} (동쪽 가장자리)", east == n_out, f"{east}")
    # electrical (LVS-like on the abstract metal): every net — its line from the device contact to its pad — is one merged
    # piece of its layer (no open), and no piece carries two nets (no short)
    for kind, lname, label in (("rf", "m1", "RF 금속 (M1)"), ("dc", "m2", "DC 금속 (M2)")):
        polys = list(reg(Ly[lname]).each())

        def at(xy, polys=polys):
            pt = kdb.Point(int(round(xy[0] / dbu)), int(round(xy[1] / dbu)))
            return next((k for k, p in enumerate(polys) if p.bbox().contains(pt) and p.inside(pt)), None)

        nets, owner, opens, shorts = {}, {}, [], set()
        for ln in L["routing"]["electrical"]:
            if ln["kind"] != kind:
                continue
            probes = [ln["pts"][0], ln["pts"][-1]] + [[p["x"], p["y"]] for p in L["routing"]["pads"] if p["net"] == ln["net"]]
            ks = {at(xy) for xy in probes}
            if None in ks or len(ks) != 1:
                opens.append(ln["net"])
                continue
            k = ks.pop()
            nets[ln["net"]] = k
            if k in owner and owner[k] != ln["net"]:
                shorts.add(tuple(sorted((owner[k], ln["net"]))))
            owner.setdefault(k, ln["net"])
        n = sum(1 for x in L["routing"]["electrical"] if x["kind"] == kind)
        add("Electrical", f"{label}: 넷마다 한 조각 (끊김 없음), 넷끼리 분리 (단락 없음)", not opens and not shorts and n > 0,
            f"{n}개 넷 · {len(polys)}조각" + (f" · 끊김 {opens[:3]}" if opens else "") + (f" · 단락 {sorted(shorts)[:3]}" if shorts else ""))
    add("Electrical", "패드·범프 수", len(L["routing"]["pads"]) == sum(1 for n in L["nets"]["electrical"] if n["kind"] in ("rf", "dc")), f"{len(L['routing']['pads'])}")
    add("Model validity", "능동층·금속·패드 추상화", True, "주입·히터·Ge·금속·종단은 주석 레이어 (Generic PDK) — 파운드리 규칙 검증 아님, Tape-out Ready 아님", status="NOT VERIFIED")
    if pf["mat"] == "sin":
        het = [I for I in L["instances"] if I["type"] in ("mrr", "mrr_wdm") and I["params"].get("local", {}).get("prims")]
        add("Model validity", "SiN ↔ Si 층간 전이", True, ("이종 Si 링 버스 양 끝에 SiN/Si 공동 테이퍼를 그림 (평면도, 층간 결합 손실·수직 간격 미계산) — " if het else "")
            + "연결 검사는 SiN ∪ Si 평면 합집합", status="WARNING")
    return out


def _inward(q: dict, d: float = 0.05) -> tuple[float, float]:
    """A point just behind a port, inside the waveguide that ends there."""
    a = math.radians(q["angle_deg"] or 0.0)
    return q["xy_um"][0] - d * math.cos(a), q["xy_um"][1] - d * math.sin(a)


# ---------------------------------------------------------------- preview
def preview(comp: gf.Component, L: dict, path: Path, checks: list) -> None:
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from matplotlib.collections import PathCollection

    from .preview import _paths, _polys

    polys = _polys(comp)
    die = L["die"]
    col = {(1, 0): "#2b6cb0", (34, 0): "#c05621", (41, 0): "#ecc94b", (45, 0): "#a0aec0", (47, 0): "#f6ad55", (5, 0): "#9f7aea", (49, 0): "#e53e3e",
           (3, 0): "#bee3f8", (20, 0): "#9ae6b4", (21, 0): "#fbb6ce"}
    order = [(64, 0), (45, 0), (41, 0), (3, 0), (21, 0), (20, 0), (1, 0), (34, 0), (47, 0), (5, 0), (49, 0)]
    mod0 = [I for I in L["instances"] if I["role"] == "modulator"][0]["bbox_um"]
    fig, axs = plt.subplots(1, 2, figsize=(14, 6.2), gridspec_kw={"width_ratios": [1.6, 1]})
    for k, ax in enumerate(axs):
        for lay_ in order:
            ps = polys.get(lay_)
            if not ps:
                continue
            if lay_ == (64, 0):
                for p in ps:
                    xy = np.array(p[0])
                    ax.plot(np.append(xy[:, 0], xy[0, 0]), np.append(xy[:, 1], xy[0, 1]), "--", color="#999", lw=0.6)
                continue
            a = 0.45 if lay_ in ((41, 0), (45, 0)) else 0.9
            ax.add_collection(PathCollection(_paths(ps), facecolors=col.get(lay_, "#888"), edgecolors=col.get(lay_, "#888"), linewidths=0.3 if k == 0 else 0.2, alpha=a))
        if k == 0:
            ax.set_xlim(-0.02 * die["W_um"], 1.02 * die["W_um"])
            ax.set_ylim(-0.04 * die["H_um"], 1.04 * die["H_um"])
            ax.set_title("full die", fontsize=9)
        elif L["architecture"]["modulator"] == "wdm":   # first three rings with their S / G bumps
            bus = [I for I in L["instances"] if I["type"] == "mrr_wdm"][0]
            x0 = bus["placement"]["x_um"] + bus["params"]["local"]["ring_x_um"][0] - bus["params"]["pitch_um"] * 0.7
            ax.set_xlim(x0, x0 + bus["params"]["pitch_um"] * 3.2)
            ax.set_ylim(mod0[1] - 95, mod0[3] + 95)
            ax.set_title("shared bus, rings 0–2 with S (north) / G (south) bumps", fontsize=9)
        else:
            m = 30
            ax.set_xlim(mod0[0] - m, min(mod0[0] + max(250, (mod0[3] - mod0[1]) * 2.5), mod0[2] + m))
            ax.set_ylim(mod0[1] - m, mod0[3] + m)
            ax.set_title("WDM bus, rings 0–2 (zoom)" if L["architecture"]["modulator"] == "wdm" else "lane 0 modulator (zoom)", fontsize=9)
        ax.set_aspect("equal")
        ax.set_xlabel("x (µm)")
        ax.set_ylabel("y (µm)")
        ax.grid(alpha=0.15)
    a, pf = L["architecture"], L["platform"]
    n = {s: sum(1 for c in checks if c["status"] == s) for s in ("PASS", "WARNING", "FAIL", "NOT VERIFIED")}
    arch_s = (f"1.6T WDM8 Tx PIC · MRR ×8 on one bus · {a['wdm']['grid_GHz']} GHz · FSR {a['wdm']['fsr_nm']:.2f} nm" if a["modulator"] == "wdm"
              else f"1.6T DR8 Tx PIC · {a['modulator'].upper()} ×8 · lasers {a['lasers']} (1:{a['laser_share']})")
    fig.suptitle(f"{pf['id']} · {arch_s} · die {die['W_um'] / 1000:.2f} × {die['H_um'] / 1000:.2f} mm · "
                 f"GDS re-check PASS {n['PASS']} / WARNING {n['WARNING']} / FAIL {n['FAIL']} / NOT VERIFIED {n['NOT VERIFIED']} · engineering prototype, not tape-out ready", fontsize=9.5)
    fig.tight_layout()
    fig.savefig(path, dpi=140)
    plt.close(fig)


# ---------------------------------------------------------------- CLI
def run(layout_path: Path, outdir: Path, verification_path: Path | None = None, layers_path: Path | None = None, png: bool = True) -> dict:
    L = json.loads(Path(layout_path).read_text(encoding="utf-8"))
    lay = design.layers(layers_path)
    comp, info = build_circuit(L, lay)
    outdir.mkdir(parents=True, exist_ok=True)
    gds = outdir / "engine_layout.gds"
    comp.write_gds(gds)
    checks = recheck(gds, L, lay, info)
    vp = verification_path or Path(str(layout_path).replace("engine_layout", "engine_verification"))
    V = json.loads(vp.read_text(encoding="utf-8")) if vp and vp.exists() and vp != Path(layout_path) else {"schema": SCHEMA + "#verification", "checks": []}
    if V.get("design_hash") is not None:  # the three files must come from the same export
        checks.insert(0, {"group": "GDS", "item": "입력 일치 (layout ↔ verification design_hash)", "status": "PASS" if V["design_hash"] == L.get("design_hash") else "FAIL",
                          "detail": f"{L.get('design_hash')} / {V['design_hash']}"})
    if png:
        preview(comp, L, outdir / "engine_preview.png", checks)
    nfail = sum(1 for c in checks if c["status"] == "FAIL")
    for c in V.get("checks", []):
        if c.get("item") == "GDS 재검사":
            c["status"] = "PASS" if nfail == 0 else "FAIL"
            c["detail"] = f"smq2gds.circuit: {len(checks)}개 검사, FAIL {nfail} ({gds.name})"
    V["gds_recheck"] = {"schema": SCHEMA + "#gds-recheck", "design_hash": L.get("design_hash"), "gds": gds.name, "gds_sha1": hashlib.sha1(gds.read_bytes()).hexdigest(),
                        "cells": info["cells"], "checks": checks, "summary": {s: sum(1 for c in checks if c["status"] == s) for s in ("PASS", "WARNING", "FAIL", "NOT VERIFIED")},
                        "generator": "tools/smq2gds/circuit.py (gdsfactory + KLayout re-read)"}
    if "summary" in V and V.get("checks"):
        V["summary"] = {s: sum(1 for c in V["checks"] if c["status"] == s) for s in ("PASS", "WARNING", "FAIL", "NOT VERIFIED")}
    (outdir / "engine_verification.json").write_text(json.dumps(V, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    return {"gds": gds, "checks": checks, "nfail": nfail, "info": info}


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(prog="smq2gds.circuit", description="smq-circuit/1 engine_layout.json → GDS + preview + re-check")
    ap.add_argument("layout", help="engine_layout.json exported by the PIC Design Lab")
    ap.add_argument("-o", "--out", help="output directory (default: next to the layout)")
    ap.add_argument("--verification", help="engine_verification.json to update (default: sibling file)")
    ap.add_argument("--layers", help="layer map yaml")
    ap.add_argument("--no-png", action="store_true")
    a = ap.parse_args(argv)
    lp = Path(a.layout)
    res = run(lp, Path(a.out) if a.out else lp.parent, Path(a.verification) if a.verification else None, Path(a.layers) if a.layers else None, not a.no_png)
    for c in res["checks"]:
        print(f"  [{c['status']}] {c['group']} · {c['item']} — {c['detail']}")
    print(f"→ {res['gds']} · FAIL {res['nfail']}")
    return 1 if res["nfail"] else 0


if __name__ == "__main__":
    sys.exit(main())
