"""CLI:  python -m smq2gds design.json [-o out.gds] [--png out.png] [--sim mode|eme|all] [--meep out_meep.py] [--report out.json]

Run from tools/ (or put tools/ on PYTHONPATH). Needs gdsfactory; --sim needs tidy3d (local mode solver, no account)
and meow-sim (EME). --meep writes a MEEP FDTD script for a conda environment that has pymeep.
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

from . import __version__, design


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(prog="smq2gds", description="SPEC-to-MASK Quest design JSON → GDS / simulation decks")
    ap.add_argument("design", help="smq-design/1 JSON exported from the game")
    ap.add_argument("-o", "--out", help="output GDS (default: <design>.gds)")
    ap.add_argument("--layers", help="layer map yaml (default: smq2gds/layers.yaml)")
    ap.add_argument("--png", help="write a layout preview PNG")
    ap.add_argument("--sim", choices=["none", "mode", "eme", "all"], default="none", help="mode = cross-section/bend check (tidy3d), eme = MMI S-matrix (meow)")
    ap.add_argument("--meep", help="write a MEEP FDTD script for this design (MMI only)")
    ap.add_argument("--report", help="write the check results as JSON (default: <design>.check.json when --sim is used)")
    a = ap.parse_args(argv)

    d = design.load(a.design)
    lay = design.layers(a.layers)
    from . import pcells

    t0 = time.time()
    comp, info = pcells.build(d, lay)
    out = Path(a.out or Path(a.design).with_suffix(".gds"))
    comp.write_gds(out)
    g = d["geometry"]
    print(f"[smq2gds {__version__}] {d['platform']['id']} {d['level']['id']} {g['pcell']} → {out} ({out.stat().st_size / 1024:.0f} KB, {time.time() - t0:.1f} s)")
    for p in comp.ports:
        print(f"  port {p.name}: ({p.center[0]:.3f}, {p.center[1]:.3f}) µm, {p.orientation:.1f}°, w {p.width:.3f} µm")
    if info:
        print("  " + json.dumps(_round(info)))

    if a.png:
        from .preview import png

        png(comp, d, a.png)
        print(f"  preview → {a.png}")

    report = {"schema": "smq-check/1", "design": Path(a.design).name, "platform": d["platform"]["id"], "level": d["level"]["id"], "pcell": g["pcell"], "layout": _round(info)}
    if a.sim in ("mode", "all"):
        from . import sim_mode

        report["mode"] = sim_mode.check(d, info)
        _show(report["mode"])
    if a.sim in ("eme", "all"):
        if g["pcell"] != "mmi":
            print("  EME check is for MMI designs; use --sim mode for the spiral")
        else:
            from . import sim_eme

            report["eme"] = sim_eme.check(d, comp)
            _show(report["eme"])
    if a.meep:
        from . import meep_deck

        meep_deck.write(d, a.meep)
        print(f"  MEEP script → {a.meep}")
    if a.sim != "none" or a.report:
        rp = Path(a.report or Path(a.design).with_suffix(".check.json"))
        rp.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"  report → {rp}")
    return 0


def _round(o):
    if isinstance(o, float):
        return round(o, 5)
    if isinstance(o, dict):
        return {k: _round(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return [_round(v) for v in o]
    try:
        import numpy as np

        if isinstance(o, np.generic):
            return _round(o.item())
    except ImportError:
        pass
    return o


def _show(r: dict) -> None:
    for line in r.get("summary", []):
        print("  " + line)


if __name__ == "__main__":
    sys.exit(main())
