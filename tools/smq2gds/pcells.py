"""Parametric cells for smq-design/1 geometries (gdsfactory backend).

mmi     — 1×2 / 2×2 MMI with linear w0 → wₜ tapers (gdsfactory mmi1x2 / mmi2x2).
spiral  — double Archimedean delay spiral, r = r_in + (p/π)θ per arm (arms interleaved → waveguide pitch p),
          centre S-bend either two circular arcs or two clothoid ("Euler") halves with a w → W_s width taper,
          and straight w → w0 tapers at both outer ends. Arm length is solved so that the drawn path length
          (arms + S-bend) equals geometry.length_um from the game.
spiral_rect — boundary-aware rectangular double spiral (game layout modes 1/2): the game exports arm A as straight lines and
          90° corners (arc, or Euler clothoid pair, offset outward by d), arm B = −A, the centre S-bend is re-derived here from
          H_t (two semicircles, or two Euler 180° U-turns), and the whole path is mapped into the chip boundary (0,0)–(W,H).
ring_allpass — all-pass microring modulator (level 2-3R): ring annulus at the game's resonance-aligned layout radius R
          (centred at the origin), straight bus at edge-to-edge gap g, rib slab, lateral P (inside) / N (outside) junction
          arcs centred opposite the coupler, heater arc with its opening at the coupler (metal kept off the bus), leads and pads.
          Ring and bus are drawn on the Si core layer (SiN platforms: heterogeneous Si active layer, as in the game).
          Implants, heater and pads are ANNOTATION layers (generic PDK) — not foundry implant / metal rules.
"""
from __future__ import annotations

import hashlib
import json
import math

import gdsfactory as gf
import numpy as np
from scipy.integrate import cumulative_trapezoid
from scipy.optimize import least_squares

try:
    gf.gpdk.PDK.activate()  # generic PDK for the layer/cross-section registry; layers themselves come from layers.yaml
except Exception:  # pragma: no cover - older gdsfactory
    gf.get_generic_pdk().activate()

MAX_PTS = 1990  # vertices per edge per chunk → ≤ 3982 per boundary, record < 32 KB (portable GDS)


# ---------------------------------------------------------------- helpers
def _xs(width: float, layer):
    return gf.cross_section.cross_section(width=width, layer=tuple(layer))


def _ribbon(c: gf.Component, pts: np.ndarray, w: np.ndarray, layer) -> None:
    """Add a variable-width ribbon along centreline pts (N×2) as chunked polygons."""
    sl = np.concatenate([[0.0], np.cumsum(np.hypot(*np.diff(pts, axis=0).T))])
    t = np.gradient(pts, sl, axis=0)  # 2nd-order on non-uniform spacing (S-bend and arms are sampled differently)
    t /= np.linalg.norm(t, axis=1)[:, None]
    nrm = np.stack([-t[:, 1], t[:, 0]], axis=1)
    left, right = pts + nrm * (w[:, None] / 2), pts - nrm * (w[:, None] / 2)
    n = len(pts)
    for i in range(0, n - 1, MAX_PTS):
        j = min(i + MAX_PTS, n - 1)
        poly = np.vstack([left[i : j + 1], right[i : j + 1][::-1]])
        c.add_polygon(poly, layer=tuple(layer))


def _label(c: gf.Component, text: str, pos, layer) -> None:
    c.add_label(text, position=tuple(pos), layer=tuple(layer))


# ---------------------------------------------------------------- MMI
def mmi(g: dict, layer, label_layer=None) -> gf.Component:
    f = gf.components.mmi1x2 if g["type"] == "1x2" else gf.components.mmi2x2
    c = f(
        width=g["w_io_um"],
        width_taper=g["wt_um"],
        length_taper=g["taper_len_um"],
        length_mmi=g["L_um"],
        width_mmi=g["W_um"],
        gap_mmi=g["s_um"] - g["wt_um"],
        cross_section=_xs(g["w_io_um"], layer),
    )
    return c


# ---------------------------------------------------------------- spiral
def _arm(rin: float, p: float, theta_max: float, w: float):
    """Arm A centreline, θ ∈ [0, θmax], adaptive step for < 1 nm sagitta error."""
    a = p / math.pi
    th = [0.0]
    while th[-1] < theta_max:
        r = rin + a * th[-1]
        th.append(min(theta_max, th[-1] + min(0.02, math.sqrt(8e-3 / r))))
    th = np.asarray(th)
    r = rin + a * th
    pts = np.stack([r * np.cos(th), r * np.sin(th)], axis=1)
    return th, pts


def _arm_length(rin: float, p: float, theta: float) -> float:
    a = p / math.pi
    F = lambda t: 0.5 * ((rin + a * t) * math.hypot(rin + a * t, a) + a * a * math.asinh((rin + a * t) / a)) / a  # ∫√(r²+a²)dθ
    return F(theta) - F(0.0)


def _half_arc(P: np.ndarray, t: np.ndarray, ds: float = 0.02):
    """Circular arc from the origin to P arriving with unit heading t (CCW). Returns points, widths-free."""
    nl = np.array([-t[1], t[0]])
    R = -(P @ P) / (2 * (P @ nl))
    C = P + R * nl
    a0 = math.atan2(-C[1], -C[0])
    a1 = math.atan2(P[1] - C[1], P[0] - C[0])
    while a1 < a0:
        a1 += 2 * math.pi
    n = max(16, int(R * (a1 - a0) / ds))
    a = np.linspace(a0, a1, n)
    return np.stack([C[0] + R * np.cos(a), C[1] + R * np.sin(a)], axis=1), R


def _clothoid(k0: float, ke: float, L: float, n: int = 4000):
    """Curvature linear in arc length, k0 at the origin → ke at s = L (heading 0 at the origin)."""
    s = np.linspace(0, L, n)
    ph = cumulative_trapezoid(k0 + (ke - k0) * s / L, s, initial=0)
    x = cumulative_trapezoid(np.cos(ph), s, initial=0)
    y = cumulative_trapezoid(np.sin(ph), s, initial=0)
    return s, np.stack([x, y], axis=1), ph


def _half_euler(P: np.ndarray, t: np.ndarray, ke: float):
    """Euler half S-bend (Hong 2022 style): curvature 1/R_min at the centre falling linearly to the spiral's
    curvature ke at the junction, so the junction is curvature-continuous; the two halves meet at the origin
    with a curvature reversal ±1/R_min. R_min and the half length are solved from the end point and heading."""
    dP, aP, at = float(np.hypot(*P)), math.atan2(P[1], P[0]), math.atan2(t[1], t[0])
    rel = at - aP

    def res(x):
        k0, L = x
        _, q, ph = _clothoid(k0, ke, L, 1500)
        e = q[-1]
        return [math.hypot(*e) / dP - 1, math.remainder(ph[-1] - math.atan2(e[1], e[0]) - rel, 2 * math.pi)]

    sol = least_squares(res, [2.6 / dP, 2.2 * dP], bounds=([ke, 0.1 * dP], [50 / dP, 10 * dP]))
    if sol.cost > 1e-12:
        raise RuntimeError("Euler S-bend: no solution for this r_in")
    k0, L = sol.x
    s, q, _ = _clothoid(k0, ke, L)
    rot = aP - math.atan2(q[-1, 1], q[-1, 0])
    cr, sr = math.cos(rot), math.sin(rot)
    q = q @ np.array([[cr, sr], [-sr, cr]])
    return s, q, 1.0 / k0


def spiral(g: dict, layer, label_layer=None) -> tuple[gf.Component, dict]:
    w, p, rin, w0 = g["w_um"], g["pitch_um"], g["rin_um"], g["w_io_um"]
    a = p / math.pi
    P = np.array([rin, 0.0])
    tA = np.array([a, rin]) / math.hypot(a, rin)  # arm-A heading at θ = 0
    kA = (rin * rin + 2 * a * a) / (rin * rin + a * a) ** 1.5  # Archimedean curvature at θ = 0

    # centre S-bend: half from origin to P (arm A start), the other half is its point reflection
    if g["sbend"] == "euler":
        s_h, half, Rmin = _half_euler(P, tA, kA)
        w_h = g["ws_um"] + (w - g["ws_um"]) * s_h / s_h[-1]
        L_half = float(s_h[-1])
        sb_info = {"type": "euler", "Rmin_um": Rmin, "Rmin_game_um": g["Rmin_um"], "R_junction_um": 1 / kA, "half_len_um": L_half}
    else:
        half, R = _half_arc(P, tA)
        w_h = np.full(len(half), w)
        L_half = float(np.sum(np.hypot(*np.diff(half, axis=0).T)))
        sb_info = {"type": "arc", "R_um": R, "half_len_um": L_half}
    L_s = 2 * L_half

    # arm length so that arms + S-bend = target path length
    L_arm = (g["length_um"] - L_s) / 2
    lo, hi = 0.0, 1.0
    while _arm_length(rin, p, hi) < L_arm:
        hi *= 2
    for _ in range(80):
        mid = 0.5 * (lo + hi)
        lo, hi = (mid, hi) if _arm_length(rin, p, mid) < L_arm else (lo, mid)
    th_max = 0.5 * (lo + hi)
    th, armA = _arm(rin, p, th_max, w)
    rout = rin + a * th_max

    # straight tapers w → w0 tangent to the arm ends
    Lt = g["taper_len_um"]
    te = np.array([a * math.cos(th_max) - rout * math.sin(th_max), a * math.sin(th_max) + rout * math.cos(th_max)])
    te /= np.linalg.norm(te)
    sT = np.linspace(0, Lt, 200)[1:]
    tapA = armA[-1] + sT[:, None] * te
    wT = w + (w0 - w) * sT / Lt

    h = hashlib.sha1(json.dumps(g, sort_keys=True).encode()).hexdigest()[:6]
    c = gf.Component(f"smq_spiral_w{w:g}_p{p:g}_r{rin:g}_{g['sbend']}_{h}".replace(".", "p"))
    # path order: port o1 (arm B outer end) → arm B inward → S-bend → arm A outward → port o2
    # one continuous centreline so the ribbon normals are consistent across every junction (no notches)
    outA, wA = np.vstack([armA[1:], tapA]), np.concatenate([np.full(len(armA) - 1, w), wT])
    cl = np.vstack([-outA[::-1], -half[::-1], half[1:], outA])
    wl = np.concatenate([wA[::-1], w_h[::-1], w_h[1:], wA])
    _ribbon(c, cl, wl, layer)
    endA = tapA[-1]
    angA = math.degrees(math.atan2(te[1], te[0]))
    c.add_port("o2", center=tuple(endA), width=w0, orientation=angA, layer=tuple(layer))
    c.add_port("o1", center=tuple(-endA), width=w0, orientation=(angA + 180) % 360, layer=tuple(layer))

    L_draw = 2 * _arm_length(rin, p, th_max) + L_s
    info = {
        "theta_max_rad": th_max,
        "turns_per_arm": th_max / (2 * math.pi),
        "rout_um": rout,
        "rout_game_um": g.get("rout_um"),
        "path_um": L_draw,
        "path_with_tapers_um": L_draw + 2 * Lt,
        "target_um": g["length_um"],
        "sbend": sb_info,
        "centreline_points": int(2 * (len(armA) + len(tapA) + len(half))),
    }
    if label_layer:
        _label(c, f"SMQ spiral tau={g['tau_ns']}ns w={w} p={p} rin={rin} L={L_draw:.0f}um", (0, -rout - 20), label_layer)
    return c, info


# ---------------------------------------------------------------- rectangular (boundary-aware) double spiral
def _turn_unit(total: float, n: int):
    """Symmetric clothoid pair with κmax = 1 (R_min = 1), left turn by `total` from the origin heading +x.
    Integrated here independently of the game (cumulative trapezoid on a fine grid)."""
    L = 2 * total
    s = np.linspace(0.0, L, n + 1)
    th = np.where(s <= L / 2, s * s / L, total - (L - s) ** 2 / L)
    kap = np.where(s <= L / 2, 2 * s / L, 2 * (L - s) / L)
    x = cumulative_trapezoid(np.cos(th), s, initial=0)
    y = cumulative_trapezoid(np.sin(th), s, initial=0)
    return s, x, y, th, kap


_U90 = _turn_unit(math.pi / 2, 200000)
_U180 = _turn_unit(math.pi, 400000)
EU90_A0 = float(_U90[1][-1])  # tangent length of the Euler 90° corner per unit R_min (≈ 1.8701)
EU180_D = float(_U180[2][-1])  # end-point separation of the Euler U-turn per unit R_min (≈ 2.7537)


def _resample(u, n):
    idx = np.unique(np.linspace(0, len(u[0]) - 1, n).round().astype(int))
    return [a[idx] for a in u]


def _corner_local(shape: str, R: float, a0: float, d: float) -> np.ndarray:
    """Left-turn corner with its tangent-line vertex at the origin, incoming along +x, offset outward by d (sagitta ≤ ~1 nm)."""
    if shape == "arc":
        a = a0 + d
        n = max(8, int(math.ceil((math.pi / 2) / math.sqrt(8e-3 / a))))
        t = np.linspace(-math.pi / 2, 0.0, n + 1)
        return np.stack([-a + a * np.cos(t), a + a * np.sin(t)], axis=1)
    n = int(np.clip(math.pi * math.sqrt((R + d) / 8e-3) * 1.5, 120, 6000))
    _, x, y, th, _ = _resample(_U90, n)
    return np.stack([-a0 + R * x + d * np.sin(th) - d, R * y - d * np.cos(th) + d], axis=1)


def _place(pts: np.ndarray, V, h_deg: float, turn: int) -> np.ndarray:
    h = math.radians(h_deg)
    cs, sn = math.cos(h), math.sin(h)
    x, y = pts[:, 0], turn * pts[:, 1]
    return np.stack([V[0] + x * cs - y * sn, V[1] + x * sn + y * cs], axis=1)


def _s_half(kind: str, Ht: float):
    """Arm-A half of the centre S-bend: origin → (0, H_t) arriving heading +x. Returns points, fraction along it, R_min."""
    if kind == "arc":
        rr = Ht / 2
        n = max(16, int(math.ceil(math.pi / math.sqrt(8e-3 / rr))))
        f = np.linspace(-math.pi / 2, -1.5 * math.pi, n + 1)
        return np.stack([rr * np.cos(f), rr + rr * np.sin(f)], axis=1), np.linspace(0, 1, n + 1), rr
    sc = Ht / EU180_D
    n = int(np.clip(2 * math.pi * math.sqrt(sc / 8e-3) * 1.5, 200, 20000))
    s, x, y, _, _ = _resample(_U180, n)
    return np.stack([-x * sc, y * sc], axis=1), s / s[-1], sc


def spiral_rect(g: dict, layer, label_layer=None) -> tuple[gf.Component, dict]:
    """Boundary-aware rectangular double spiral, drawn from the primitives the game exported (arm A: lines + corners,
    arm B = −A, centre S-bend re-derived here from H_t). Output is in chip coordinates with the boundary at (0,0)–(W,H)."""
    w, w0, Lt = g["w_um"], g["w_io_um"], g["taper_len_um"]
    shape, R, a0 = g["corner"], g["R_um"], g["a0_um"]
    a0_py = EU90_A0 * R if shape == "euler" else R
    if abs(a0_py - a0) > 1e-3 * max(a0, 1):
        raise ValueError(f"corner tangent length mismatch: game {a0} vs smq2gds {a0_py}")
    pts, wid = [np.array([[0.0, g["Ht_um"]]])], [np.array([w])]
    for s in g["armA"]:
        if s["t"] == "L":
            a, b = np.array(s["a"], float), np.array(s["b"], float)
            if s.get("port"):
                u = (b - a) / np.linalg.norm(b - a)
                L = float(np.linalg.norm(b - a))
                q = [a, b - u * min(Lt, L), b]
                pts.append(np.array(q)), wid.append(np.array([w, w, w0]))
            else:
                pts.append(np.array([a, b])), wid.append(np.array([w, w]))
        else:
            q = _place(_corner_local(shape, R, a0, s["d"]), s["V"], s["h_deg"], s["turn"])
            pts.append(q), wid.append(np.full(len(q), w))
    armA = np.vstack(pts)
    wA = np.concatenate(wid)
    keep = np.concatenate([[True], np.hypot(*np.diff(armA, axis=0).T) > 1e-3])  # pieces meet within export rounding (< 1 nm)
    armA, wA = armA[keep], wA[keep]
    half, frac, Rs = _s_half("arc" if g["sbend"] == "arc" else "euler", g["Ht_um"])
    w_h = np.full(len(half), w) if g["sbend"] == "arc" else g["ws_um"] + (w - g["ws_um"]) * frac
    # arm A starts at (0, H_t) = the S-bend's end point, so both arms drop their first point at the junction
    cl = np.vstack([-armA[1:][::-1], -half[::-1], half[1:], armA[1:]])
    wl = np.concatenate([wA[1:][::-1], w_h[::-1], w_h[1:], wA[1:]])
    keep = np.concatenate([[True], np.hypot(*np.diff(cl, axis=0).T) > 1e-3])
    cl, wl = cl[keep], wl[keep]
    B = g["boundary"]
    W, H = B["W_um"], B["H_um"]
    if g["transform"]["rot90"]:
        cl = np.stack([W / 2 - cl[:, 1], H / 2 + cl[:, 0]], axis=1)
    else:
        cl = cl + np.array([W / 2, H / 2])
    h = hashlib.sha1(json.dumps(g, sort_keys=True).encode()).hexdigest()[:6]
    c = gf.Component(f"smq_spiral_rect_{g['topology']}_w{w:g}_p{g['pitch_um']:g}_R{R:g}_{h}".replace(".", "p"))
    _ribbon(c, cl, wl, layer)
    for name, i, j in (("o1", 0, 1), ("o2", -1, -2)):
        v = cl[i] - cl[j]
        c.add_port(name, center=tuple(cl[i]), width=w0, orientation=math.degrees(math.atan2(v[1], v[0])) % 360, layer=tuple(layer))
    seg = np.hypot(*np.diff(cl, axis=0).T)
    # discrete curvature on the sampled centre line (circumradius of consecutive triples) — independent bend-radius check
    p0, p1, p2 = cl[:-2], cl[1:-1], cl[2:]
    a_, b_, c_ = np.hypot(*(p1 - p0).T), np.hypot(*(p2 - p1).T), np.hypot(*(p2 - p0).T)
    cross = np.abs((p1 - p0)[:, 0] * (p2 - p0)[:, 1] - (p1 - p0)[:, 1] * (p2 - p0)[:, 0])
    ok = (cross > 1e-12) & (a_ < 50) & (b_ < 50)
    rad = (a_ * b_ * c_)[ok] / (2 * cross[ok]) if ok.any() else np.array([np.inf])
    info = {"path_um": float(seg.sum()), "target_um": g["length_um"], "bbox_um": [float(v) for v in (c.dbbox().left, c.dbbox().bottom, c.dbbox().right, c.dbbox().top)],   # drawn polygons (µm)
            "sbend": {"type": g["sbend"], "Rmin_um": float(Rs if g["sbend"] == "arc" else g["Ht_um"] / EU180_D), "Rmin_game_um": g["Rmin_sbend_um"]},
            "min_radius_um": float(rad.min()), "corners": 2 * sum(1 for s in g["armA"] if s["t"] == "C"), "centreline_points": int(len(cl)),
            "ports": {p.name: [float(p.center[0]), float(p.center[1]), float(p.orientation)] for p in c.ports}}
    if label_layer:
        _label(c, f"SMQ spiral_rect {g['topology']} tau={g['tau_ns']}ns w={w} p={g['pitch_um']} R={R} L={info['path_um']:.0f}um", (W / 2, -20), label_layer)
    return c, info


# ---------------------------------------------------------------- microring (all-pass)
def _nseg(r: float, tol: float = 2.5e-4) -> int:
    """Segments for a circle of radius r with sagitta < tol µm, a multiple of 8 (vertices at 0°, 90°, … so the bbox is exact)."""
    n = math.pi / math.acos(max(1 - tol / r, -1.0))
    return int(math.ceil(n / 8) * 8)


def _arc_pts(r: float, a0: float, a1: float, n: int) -> np.ndarray:
    t = np.linspace(a0, a1, n)
    return np.stack([r * np.cos(t), r * np.sin(t)], axis=1)


def _sector(c: gf.Component, r0: float, r1: float, a0_deg: float, a1_deg: float, layer) -> None:
    """Annular sector r0..r1 between angles a0..a1 (degrees, CCW) as one polygon (sub-360°)."""
    a0, a1 = math.radians(a0_deg), math.radians(a1_deg)
    n = max(8, int(_nseg(r1) * (a1 - a0) / (2 * math.pi)) + 1)
    poly = np.vstack([_arc_pts(r1, a0, a1, n), _arc_pts(r0, a1, a0, n)])
    c.add_polygon(poly, layer=tuple(layer))


def _annulus(c: gf.Component, r0: float, r1: float, layer) -> None:
    """Full annulus as one polygon with a hole (exact vertices on both circles)."""
    import klayout.db as kdb

    n = _nseg(r1)
    t = np.arange(n) * 2 * math.pi / n
    outer = [kdb.DPoint(r1 * math.cos(a), r1 * math.sin(a)) for a in t]
    inner = [kdb.DPoint(r0 * math.cos(a), r0 * math.sin(a)) for a in t]
    p = kdb.DPolygon(outer)
    p.insert_hole(inner)
    c.add_polygon(p, layer=tuple(layer))


def ring_allpass(g: dict, lay: dict, label_layer=None):
    R, w, gap = g["R_um"], g["w_um"], g["gap_um"]
    wb, Lb = g.get("bus_w_um", w), g.get("bus_len_um", 2 * R + 20)
    core = lay["core"][g.get("core_mat", "si")]
    ann = lay.get("annotation", {})
    e = g["rib"].get("slab_ext_um", 2.0)
    yb = -(R + w / 2 + gap + wb / 2)  # bus centre line
    h = hashlib.sha1(json.dumps(g, sort_keys=True).encode()).hexdigest()[:6]
    c = gf.Component(f"smq_ring_R{R:g}_g{gap:g}_w{w:g}_{h}".replace(".", "p"))
    _annulus(c, R - w / 2, R + w / 2, core)
    c.add_polygon([(-Lb / 2, yb - wb / 2), (Lb / 2, yb - wb / 2), (Lb / 2, yb + wb / 2), (-Lb / 2, yb + wb / 2)], layer=tuple(core))
    if ann.get("slab"):  # rib slab: ring ± e and the bus ± e (one merged partial-etch region)
        _annulus(c, max(R - w / 2 - e, 0.2), R + w / 2 + e, ann["slab"])
        c.add_polygon([(-Lb / 2, yb - wb / 2 - e), (Lb / 2, yb - wb / 2 - e), (Lb / 2, yb + wb / 2 + e), (-Lb / 2, yb + wb / 2 + e)], layer=tuple(ann["slab"]))
    J, Hh = g["junction"], g["heater"]
    if ann.get("p") and ann.get("n"):  # lateral junction at the rib centre, arc centred opposite the coupler (+y)
        a = J["arc_deg"] / 2
        _sector(c, max(R - w / 2 - e, 0.2), R, 90 - a, 90 + a, ann["p"])
        _sector(c, R, R + w / 2 + e, 90 - a, 90 + a, ann["n"])
    hw, yh = Hh.get("w_um", 2.0), R + 8.0
    bus_top = yb + wb / 2
    # heater arc with its opening at the coupler (like the junction): the metal must not cover the bus. The opening is the model's
    # (1 − coverage)·360°, widened only if the arc's outer corner would come closer than 0.3 µm to the bus in plan view.
    a_mod = (360 - Hh["arc_deg"]) / 2
    a_min = math.degrees(math.acos(min(1.0, (-(bus_top + 0.3)) / (R + hw / 2)))) if -(bus_top + 0.3) < R + hw / 2 else 0.0
    a = max(a_mod, a_min)
    heat = {"arc_deg_model": Hh["arc_deg"], "arc_deg_drawn": 360 - 2 * a}
    if ann.get("heater"):
        _sector(c, R - hw / 2, R + hw / 2, 270 + a, 270 - a + 360, ann["heater"])
        for s in (-1, 1):  # leads: horizontally out of each arc end (kept ≥ 0.5 µm above the bus), then up to two pads
            ang = math.radians(270 + s * a)
            xm, ym = R * math.cos(ang), R * math.sin(ang)
            y0 = max(ym - hw / 2, bus_top + 0.5)
            xo = s * (R + hw / 2 + 3.0)
            xs = sorted([xm, xo + s * hw / 2])
            c.add_polygon([(xs[0], y0), (xs[1], y0), (xs[1], y0 + hw), (xs[0], y0 + hw)], layer=tuple(ann["heater"]))
            c.add_polygon([(xo - hw / 2, y0), (xo + hw / 2, y0), (xo + hw / 2, yh), (xo - hw / 2, yh)], layer=tuple(ann["heater"]))
            if ann.get("pad") and g.get("local_pads", True):
                c.add_polygon([(xo - 5, yh), (xo + 5, yh), (xo + 5, yh + 10), (xo - 5, yh + 10)], layer=tuple(ann["pad"]))
    for name, x, o in (("o1", -Lb / 2, 180), ("o2", Lb / 2, 0)):
        c.add_port(name, center=(x, yb), width=wb, orientation=o, layer=tuple(core))
    import klayout.db as kdb

    reg = kdb.Region(c.begin_shapes_rec(c.kcl.layer(*core))).merged()
    dbu = c.kcl.dbu
    pieces = sorted(([p.bbox().left * dbu, p.bbox().bottom * dbu, p.bbox().right * dbu, p.bbox().top * dbu] for p in reg.each()), key=lambda b: b[2] - b[0])
    ring_bb = [b for b in pieces if abs((b[2] - b[0]) - 2 * (R + w / 2)) < 0.01]
    info = {"R_um": R, "R_outer_measured_um": (ring_bb[0][2] - ring_bb[0][0]) / 2 if ring_bb else None,
            "gap_measured_um": (ring_bb[0][1] - (yb + wb / 2)) if ring_bb else None, "bus_y_um": yb, "order_m": g["order_m"],
            "core_pieces": reg.count(), "heterogeneous_si": bool(g.get("heterogeneous_si")),
            "ports": {p.name: [float(p.center[0]), float(p.center[1]), float(p.orientation)] for p in c.ports},
            "heater": heat, "annotations": sorted(k for k in ("slab", "p", "n", "heater", "pad") if ann.get(k))}
    if label_layer:
        _label(c, f"SMQ ring_allpass R={R} g={gap} w={w} m={g['order_m']} lam={g['lambda_design_um']}um", (-Lb / 2, yb - 6), label_layer)
    return c, info


def build(d: dict, lay: dict) -> tuple[gf.Component, dict]:
    g, mat = d["geometry"], d["platform"]["mat"]
    core, lab = lay["core"][mat], lay.get("label")
    if g["pcell"] == "mmi":
        c, info = mmi(g, core, lab), {}
    elif g["pcell"] == "spiral":
        c, info = spiral(g, core, lab)
    elif g["pcell"] == "spiral_rect":
        c, info = spiral_rect(g, core, lab)
    elif g["pcell"] == "ring_allpass":
        c, info = ring_allpass(g, lay, lab)
    else:
        raise ValueError(f"no PCell for {g['pcell']!r}")
    h = hashlib.sha1(json.dumps(g, sort_keys=True).encode()).hexdigest()[:6]  # unique per geometry (several builds per process)
    top = gf.Component(f"SMQ_{d['platform']['id']}_{d['level']['id'].replace('+', 'p').replace('-', '_')}_{h}")
    ref = top << c
    top.add_ports(ref.ports)
    if lab:
        bb = top.bbox()
        top.add_label(f"smq-design/1 {d['platform']['id']} {d['level']['id']} {d['level']['device']}", position=(bb.left, bb.top + 2), layer=tuple(lab))
    if lay.get("floorplan"):
        if g["pcell"] == "spiral_rect":  # the user's usable rectangle, not the device bbox
            W, H = g["boundary"]["W_um"], g["boundary"]["H_um"]
            top.add_polygon([(0, 0), (W, 0), (W, H), (0, H)], layer=tuple(lay["floorplan"]))
        else:
            bb = top.bbox()
            top.add_polygon([(bb.left, bb.bottom), (bb.right, bb.bottom), (bb.right, bb.top), (bb.left, bb.top)], layer=tuple(lay["floorplan"]))
    return top, info
