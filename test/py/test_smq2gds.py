"""Layout checks for tools/smq2gds (no solvers): every example builds, spirals hit the target length,
are one connected waveguide and pass width/space DRC, MMI ports sit where the game puts them.

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
            r = _region(comp, lay["core"][mat])
            assert r.count() == 1, f"{f.name}: waveguide not one piece ({r.count()})"
            if gg["pcell"] == "spiral":
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


def test_layouts():
    check_all()


if __name__ == "__main__":
    check_all()
