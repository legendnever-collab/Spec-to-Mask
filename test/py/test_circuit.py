"""GDS backend for the PIC Design Lab (smq-circuit/1 → tools/smq2gds/circuit.py).

For every example (4 platforms × MZM DR8 / MRR DR8 / MRR WDM8, exported by the game engine with node tools/export_circuit.js all):
  * the GDS is written, read back with KLayout and every re-check passes (no FAIL): one top cell, one reference per instance,
    connectivity (merged core pieces, input facet ↔ output facet per lane), a waveguide at every optical port, route end points
    on the ports, route lengths = game, drawn instance extents inside the game's bbox, spacing / width / bend rules, die
    boundary, 8 output facets, RF and DC metal of different nets never touch;
  * the drawn route area equals ∫ w ds of the primitives (an independent check of the ribbon geometry);
  * the result block (gds_recheck) carries the layout's design_hash and the GDS sha1;
  * WDM8: one shared-bus cell, one ring cell per distinct (stepped) radius placed at the exported ring positions, one output facet.
Negative tests (the re-check must catch them): a route end moved off its port, a missing route, an instance moved away from
its routes, an RF pad dropped on another net's line, a verification file from another export, a WDM ring cell moved along the bus.

    cd tools && python ../test/py/test_circuit.py      (or: python -m pytest ../test/py -q)
"""
import copy
import hashlib
import json
import math
import sys
import tempfile
from pathlib import Path

TOOLS = Path(__file__).resolve().parents[2] / "tools"
sys.path.insert(0, str(TOOLS))

import klayout.db as kdb  # noqa: E402
import numpy as np  # noqa: E402

from smq2gds import circuit, design, pcells  # noqa: E402

EX = TOOLS / "smq2gds" / "examples" / "circuit"


def _prim_len(p):
    if p["t"] == "L":
        return math.hypot(p["b"][0] - p["a"][0], p["b"][1] - p["a"][1])
    if p["t"] == "A":
        return p["r"] * abs(math.radians(p["a1_deg"] - p["a0_deg"]))
    return circuit.poly_len(circuit.prim_points(p)[0])


def _prim_area(p):
    if p["t"] == "L" and p.get("w0") is not None:
        return _prim_len(p) * (p["w0"] + p["w1"]) / 2
    return _prim_len(p) * p["w"]


def _run(L, tmp, name, V=None):
    d = Path(tmp) / name
    d.mkdir(parents=True, exist_ok=True)
    lp, vp = d / "engine_layout.json", d / "engine_verification.json"
    lp.write_text(json.dumps(L), encoding="utf-8")
    if V is not None:
        vp.write_text(json.dumps(V), encoding="utf-8")
    res = circuit.run(lp, d / "out", vp if V is not None else None, None, png=False)
    return res, {c["item"]: c for c in res["checks"]}, d / "out"


def _status(ch, prefix):
    hits = [c for k, c in ch.items() if k.startswith(prefix)]
    assert hits, f"no check named {prefix!r}"
    return hits[0]["status"]


def check_examples(tmp):
    files = sorted(EX.glob("*_engine_layout.json"))
    assert len(files) == 12, "run node tools/export_circuit.js all first"
    lay = design.layers()
    for f in files:
        L = json.loads(f.read_text(encoding="utf-8"))
        V = json.loads(Path(str(f).replace("engine_layout", "engine_verification")).read_text(encoding="utf-8"))
        res, ch, out = _run(L, tmp, f.stem, V)
        fails = [f"{c['item']}: {c['detail']}" for c in res["checks"] if c["status"] == "FAIL"]
        assert not fails, f"{f.name}: {fails}"
        for need in ("파일 다시 읽기", "계층 셀", "광 코어 연결 조각 수", "레인 경로", "포트 위치에 도파로", "배선 끝점", "배선 길이", "소자 형상", "도파로 간격",
                     "최소 선폭", "다이 경계", "출력 단면 수", "RF 금속 (M1)", "DC 금속 (M2)", "입력 일치"):
            assert _status(ch, need) == "PASS", f"{f.name}: {need} → {_status(ch, need)}"
        # the verification file now carries the GDS re-check for this design
        Vo = json.loads((out / "engine_verification.json").read_text(encoding="utf-8"))
        gr = Vo["gds_recheck"]
        assert gr["design_hash"] == L["design_hash"] and gr["summary"]["FAIL"] == 0, f"{f.name}: gds_recheck block"
        assert gr["gds_sha1"] == hashlib.sha1((out / "engine_layout.gds").read_bytes()).hexdigest(), f"{f.name}: sha1"
        assert [c for c in Vo["checks"] if c["item"] == "GDS 재검사"][0]["status"] == "PASS", f"{f.name}: GDS 재검사 item"
        # independent geometry check: drawn route area = ∫ w ds of the exported primitives (ribbons, tapers, corners, arcs)
        ly = kdb.Layout()
        ly.read(str(out / "engine_layout.gds"))
        routes = [c for c in ly.each_cell() if c.name.startswith("smq_routes")][0]
        core = lay["core"][L["platform"]["mat"]]
        area = kdb.Region(routes.begin_shapes_rec(ly.layer(*core))).merged().area() * ly.dbu**2
        expect = sum(_prim_area(p) for r in L["routing"]["optical"] for p in r["prims"])
        assert abs(area - expect) < 2e-3 * expect, f"{f.name}: route area {area:.2f} vs ∫w ds {expect:.2f} µm²"
        # hierarchy: identical components share one cell (8 modulators → 1 cell)
        mods = {i.cell_index for i in ly.top_cell().each_inst() if ly.cell(i.cell_index).name.startswith(("smq_mzm", "smq_mrrlane", "smq_mrrwdm"))}
        assert len(mods) == 1, f"{f.name}: modulator cells {len(mods)}"
        if L["architecture"]["modulator"] == "wdm":   # one shared bus: one output facet, one ring cell per distinct radius at the exported positions
            bus = [I for I in L["instances"] if I["type"] == "mrr_wdm"][0]
            rings = [c for c in ly.each_cell() if c.name.startswith("smq_ring_")]
            radii = {g["R_um"] for g in bus["params"]["rings"]}
            assert len(rings) == len(radii) and len(bus["params"]["rings"]) == 8, f"{f.name}: ring cells {len(rings)} vs radii {len(radii)}"
            assert sum(1 for I in L["instances"] if I["role"] == "output") == 1 and _status(ch, "출력 단면 수 = 1") == "PASS", f"{f.name}: WDM output"
            wcell = [c for c in ly.each_cell() if c.name.startswith("smq_mrrwdm")][0]
            pos = sorted(round(it.dcplx_trans.disp.x, 3) for it in wcell.each_inst())
            assert pos == sorted(round(x, 3) for x in bus["params"]["local"]["ring_x_um"]), f"{f.name}: ring positions {pos}"
        print(f"  {f.stem}: {len(res['checks'])} checks, FAIL 0 · route area {area:.1f} µm² (∫w ds {expect:.1f})")


def check_negative(tmp):
    for name in ("si1310_mzm_dr8", "sin1550_mrr_dr8"):
        L0 = json.loads((EX / f"{name}_engine_layout.json").read_text(encoding="utf-8"))
        # 1. last primitive of a lane route ends 0.5 µm off its port
        L = copy.deepcopy(L0)
        r = [x for x in L["routing"]["optical"] if x["to"].startswith("OUT")][0]
        p = r["prims"][-1]
        assert p["t"] == "L"
        p["b"] = [p["b"][0], p["b"][1] + 0.5]
        _, ch, _ = _run(L, tmp, f"{name}_offport")
        assert _status(ch, "배선 끝점") == "FAIL", f"{name}: route off its port not caught"
        # 2. a missing route: one lane loses its output
        L = copy.deepcopy(L0)
        r = [x for x in L["routing"]["optical"] if x["to"].startswith("OUT")][3]
        r["prims"], r["ok"] = [], False
        _, ch, _ = _run(L, tmp, f"{name}_noroute")
        assert _status(ch, "광 코어 연결 조각 수") == "FAIL" and _status(ch, "레인 경로") == "FAIL", f"{name}: missing route not caught"
        # 3. an instance moved 2 µm away from its routes (ports in the data unchanged)
        L = copy.deepcopy(L0)
        I = [x for x in L["instances"] if x["id"] == "MOD2"][0]
        I["placement"]["y_um"] += 2.0
        _, ch, _ = _run(L, tmp, f"{name}_moved")
        assert _status(ch, "광 코어 연결 조각 수") == "FAIL" and _status(ch, "레인 경로") == "FAIL", f"{name}: moved instance not caught"
        # 4. an RF pad dropped onto another net's RF line
        L = copy.deepcopy(L0)
        rf = [x for x in L["routing"]["electrical"] if x["kind"] == "rf"]
        pad = [x for x in L["routing"]["pads"] if x["net"] == rf[0]["net"]][0]
        a, b = rf[1]["pts"][0], rf[1]["pts"][1]
        pad["x"], pad["y"] = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
        _, ch, _ = _run(L, tmp, f"{name}_rfshort")
        assert _status(ch, "RF 금속 (M1)") == "FAIL", f"{name}: RF short not caught"
        # 5. a verification file from another export
        V = json.loads((EX / f"{name}_engine_verification.json").read_text(encoding="utf-8"))
        V["design_hash"] = "00000000"
        _, ch, _ = _run(copy.deepcopy(L0), tmp, f"{name}_otherV", V)
        assert _status(ch, "입력 일치") == "FAIL", f"{name}: mismatched verification not caught"
        print(f"  {name}: off-port end, missing route, moved instance, RF short, foreign verification → FAIL as expected")
    # WDM8: a ring cell moved 3 µm along the bus leaves a gap in the shared bus → the eight channels no longer reach the output
    L0 = json.loads((EX / "si1310_mrr_wdm8_engine_layout.json").read_text(encoding="utf-8"))
    L = copy.deepcopy(L0)
    bus = [x for x in L["instances"] if x["type"] == "mrr_wdm"][0]
    bus["params"]["local"]["ring_x_um"][3] += 3.0
    _, ch, _ = _run(L, tmp, "wdm_ring_moved")
    assert _status(ch, "광 코어 연결 조각 수") == "FAIL" and _status(ch, "레인 경로") == "FAIL", "WDM: moved ring cell not caught"
    print("  si1310_mrr_wdm8: ring cell moved off the bus → connectivity FAIL as expected")


def check_primitives():
    # Euler / arc corners drawn by circuit.py are the same construction as the game (a0 = 1.8701 R, κ_max = 1/R)
    for shape, R in (("arc", 10.0), ("euler", 10.0), ("euler", 100.0)):
        a0 = pcells.EU90_A0 * R if shape == "euler" else R
        p = {"t": "C", "V": [0.0, 0.0], "h_deg": 0, "turn": 1, "shape": shape, "R": R, "a0": a0, "w": 0.5}
        pts, _, t = circuit.prim_points(p, True)
        assert abs(pts[0][0] + a0) < 1e-6 and abs(pts[0][1]) < 1e-6 and abs(pts[-1][0]) < 1e-6 and abs(pts[-1][1] - a0) < 1e-6, f"{shape} corner ends"
        assert abs(t[0][0] - 1) < 1e-12 and abs(t[-1][1] - 1) < 1e-12, f"{shape} corner end tangents"
        d1, d2 = pts[1:-1] - pts[:-2], pts[2:] - pts[1:-1]
        ang = np.abs(np.arctan2(d1[:, 0] * d2[:, 1] - d1[:, 1] * d2[:, 0], (d1 * d2).sum(1)))
        ds = (np.hypot(*d1.T) + np.hypot(*d2.T)) / 2
        rmin = (ds / ang.clip(1e-12)).min()
        assert rmin >= 0.99 * R, f"{shape} corner: drawn radius {rmin:.3f} < R {R}"


def main():
    with tempfile.TemporaryDirectory() as tmp:
        check_primitives()
        check_examples(tmp)
        check_negative(tmp)
    print("test_circuit: OK")


def test_circuit():
    main()


if __name__ == "__main__":
    main()
