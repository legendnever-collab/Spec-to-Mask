"""Layout checks for tools/smq2gds (no solvers): every example builds, spirals hit the target length,
are one connected waveguide and pass width/space DRC, MMI ports sit where the game puts them.
The all-pass microring (2-3R): ring + bus are exactly two core pieces on the Si layer (also on SiN platforms: heterogeneous Si),
the drawn ring radius and the bus gap equal the game's layout radius / gap within 1 nm, ports sit on the bus ends, the heater
metal stays off the bus, and every annotation layer is present.
Rectangular (boundary-aware) spirals additionally: the GDS polygons stay inside the boundary minus the edge clearance,
the ports sit exactly where the game shows them, the centre S-bend radius re-derived here matches the game, and the
smallest radius measured on the drawn centre line is not below the design's minimum bend radius.

    cd tools && python -m pytest ../test/py -q      (or: python ../test/py/test_smq2gds.py)
"""
import copy
import json
import sys
from pathlib import Path

TOOLS = Path(__file__).resolve().parents[2] / "tools"
sys.path.insert(0, str(TOOLS))

import klayout.db as kdb  # noqa: E402

from smq2gds import design, pcells  # noqa: E402

EX = TOOLS / "smq2gds" / "examples"


def _region(comp, layer):
    return kdb.Region(comp.begin_shapes_rec(comp.kcl.layer(*layer))).merged()


def check_all():
    lay = design.layers()
    files = sorted(EX.glob("smq_*.json"))
    assert len(files) >= 16, "run node test/e2e/export.js all first"
    for f in files:
        d = design.load(f)
        g, mat = d["geometry"], d["platform"]["mat"]
        variants = [d]
        if g["pcell"] == "spiral":  # also the arc S-bend of the same design
            d2 = copy.deepcopy(d)
            d2["geometry"].update(sbend="arc", ws_um=g["w_um"])
            variants.append(d2)
        for dd in variants:
            comp, info = pcells.build(dd, lay)
            gg = dd["geometry"]
            if gg["pcell"] == "ring_allpass":
                check_ring(f, gg, info, comp, lay)
                print(f"ok {f.name} ring_allpass R={gg['R_um']} g={gg['gap_um']}")
                continue
            r = _region(comp, lay["core"][mat])
            assert r.count() == 1, f"{f.name}: waveguide not one piece ({r.count()})"
            if gg["pcell"] == "spiral_rect":
                check_rect(f, gg, info, r, comp)
            elif gg["pcell"] == "spiral":
                assert abs(info["path_um"] - gg["length_um"]) < 1e-3 * gg["length_um"], f"{f.name}: length {info['path_um']} vs {gg['length_um']}"
                assert abs(info["rout_um"] - gg["rout_um"]) < 0.01 * gg["rout_um"], f"{f.name}: r_out {info['rout_um']} vs game {gg['rout_um']}"
                wmin = min(gg["ws_um"], gg["w_io_um"], gg["w_um"])
                assert r.space_check(int(gg["gap_um"] * 980)).count() == 0, f"{f.name} {gg['sbend']}: spacing < gap"
                assert r.width_check(int(wmin * 980)).count() == 0, f"{f.name} {gg['sbend']}: width < {wmin}"
            else:
                ys = sorted(round(p.center[1], 3) for p in comp.ports if p.orientation == 0)
                s = gg["s_um"]
                assert ys == [round(-s / 2, 3), round(s / 2, 3)], f"{f.name}: output ports {ys} vs ±s/2"
            print(f"ok {f.name} {gg['pcell']} {gg.get('sbend', '')}")


def check_ring(f, g, info, comp, lay):
    dbu = comp.kcl.dbu
    r = _region(comp, lay["core"][g["core_mat"]])
    assert r.count() == 2, f"{f.name}: ring + bus should be 2 core pieces ({r.count()})"
    other = [m for m in lay["core"] if m != g["core_mat"]]
    assert all(_region(comp, lay["core"][m]).count() == 0 for m in other), f"{f.name}: ring drawn on a second core layer"
    R, w, gap = g["R_um"], g["w_um"], g["gap_um"]
    ring = [p for p in r.each() if p.holes() == 1]
    assert len(ring) == 1, f"{f.name}: no closed ring polygon"
    b = ring[0].bbox()
    ro = (b.right - b.left) * dbu / 2
    ri = max(abs(q.x) for q in ring[0].each_point_hole(0)) * dbu  # the hole has vertices on the x axis
    assert abs(ro - (R + w / 2)) < 1e-3 and abs(ri - (R - w / 2)) < 1e-3, f"{f.name}: drawn ring {ri:.4f}–{ro:.4f} vs R {R} ± w/2"
    assert abs((b.left + b.right) * dbu / 2) < 1e-3 and abs((b.bottom + b.top) * dbu / 2) < 1e-3, f"{f.name}: ring not centred at the origin"
    bus = [p for p in r.each() if p.holes() == 0][0].bbox()
    g_meas = (b.bottom - bus.top) * dbu
    assert abs(g_meas - gap) < 1e-3, f"{f.name}: drawn gap {g_meas:.4f} vs game {gap}"
    assert r.space_check(int(gap * 980)).count() == 0, f"{f.name}: spacing < gap"
    yb = (bus.bottom + bus.top) * dbu / 2
    for name, sx, ang in (("o1", -1, 180), ("o2", 1, 0)):
        x, y, a = info["ports"][name]
        assert abs(y - yb) < 1e-3 and abs(x - sx * bus.width() * dbu / 2) < 1e-3 and abs(a - ang) < 1e-6, f"{f.name}: port {name} ({x},{y},{a})"
    ann = lay["annotation"]
    for k in ("slab", "p", "n", "heater", "pad"):
        assert _region(comp, ann[k]).count() > 0, f"{f.name}: annotation layer {k} missing"
    busr = kdb.Region(bus)
    heat = _region(comp, ann["heater"])
    assert (heat & busr).is_empty(), f"{f.name}: heater metal over the bus"
    assert heat.separation_check(busr, int(0.3 * 1000)).count() == 0, f"{f.name}: heater closer than 0.3 µm to the bus"
    hd = info["heater"]
    assert abs(hd["arc_deg_drawn"] - hd["arc_deg_model"]) < 1e-6 or hd["arc_deg_drawn"] < hd["arc_deg_model"], f"{f.name}: heater arc"
    # P/N arcs centred opposite the coupler (+y), arc angle as exported
    for k in ("p", "n"):
        jb = _region(comp, ann[k]).bbox()
        assert jb.top * dbu > R - 1e-3 and abs((jb.left + jb.right) * dbu / 2) < 1e-3, f"{f.name}: {k} implant not centred opposite the coupler"


def check_rect(f, g, info, r, comp):
    L = g["length_um"]
    assert abs(info["path_um"] - L) < 1e-4 * L, f"{f.name}: drawn path {info['path_um']:.3f} vs game {L:.3f} µm"
    bb, B, e = r.bbox(), g["boundary"], g["boundary"]["clearance_um"]
    dbu = comp.kcl.dbu
    box = [bb.left * dbu, bb.bottom * dbu, bb.right * dbu, bb.top * dbu]
    tol = 2e-3
    assert box[0] >= e - tol and box[1] >= e - tol and box[2] <= B["W_um"] - e + tol and box[3] <= B["H_um"] - e + tol, f"{f.name}: GDS bbox {box} leaves the boundary {B['W_um']}x{B['H_um']} - {e}"
    gb = g["bbox_um"]
    assert max(abs(a - b) for a, b in zip(box, gb)) < 0.02, f"{f.name}: GDS bbox {box} vs game {gb}"
    for q in g["ports_um"]:
        x, y, ang = info["ports"][q["name"]]
        assert abs(x - q["xy"][0]) < 1e-3 and abs(y - q["xy"][1]) < 1e-3, f"{f.name}: port {q['name']} at ({x:.4f},{y:.4f}) vs game {q['xy']}"
        assert abs(((ang - q["angle_deg"]) + 180) % 360 - 180) < 1e-3, f"{f.name}: port {q['name']} angle {ang} vs {q['angle_deg']}"
    sb = info["sbend"]
    assert abs(sb["Rmin_um"] - sb["Rmin_game_um"]) < 1e-3 * sb["Rmin_game_um"], f"{f.name}: S-bend R_min {sb['Rmin_um']} vs game {sb['Rmin_game_um']}"
    rmin = min(g["R_um"], g["Rmin_sbend_um"])
    assert info["min_radius_um"] >= 0.995 * rmin, f"{f.name}: drawn radius {info['min_radius_um']:.3f} < design minimum {rmin}"
    wmin = min(g["ws_um"], g["w_io_um"], g["w_um"])
    assert r.space_check(int(g["gap_um"] * 980)).count() == 0, f"{f.name}: spacing < gap"
    assert r.width_check(int(wmin * 980)).count() == 0, f"{f.name}: width < {wmin}"


def test_layouts():
    check_all()


if __name__ == "__main__":
    check_all()
