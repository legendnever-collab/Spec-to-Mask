"""Validate the game's calibrated reference designs offline and write src/data/validation.json for the game.

    python -m smq2gds.validate [examples_dir] [--levels 1-3,1-5,D-1] [--plats si1310,...]

MMI levels: forward EME at λc on the GDS (tapers included), plus a body-length scan (same modes) to find where the
3D optimum sits relative to the game's L. Spiral levels: the mode/bend checks of sim_mode.
Results are merged into the existing file, so platforms/levels can be run separately.
"""
from __future__ import annotations

import argparse
import json
import math
import time
from pathlib import Path

import numpy as np

from . import design, pcells

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "src" / "data" / "validation.json"
EME_CFG = dict(n_taper_cells=16, num_modes=30, taper_modes=16)


def _el(p, m):
    return -10 * math.log10(max(p + m, 1e-12))


def mmi(d, comp):
    from . import sim_eme

    g = d["geometry"]
    lc = g["lc_um"]
    L0 = g["L_um"]
    scan = np.round(np.linspace(0.65 * L0, 1.35 * L0, 141), 3)
    r = sim_eme.solve(d, comp, lc, L_scan=scan, **EME_CFG)
    pred = next((p for p in g["predicted_per_lam"] if abs(p["lam_um"] - lc) < 1e-4), None)
    best = min(r["scan"], key=lambda x: _el(x[1], x[2]))
    return {
        "solver": "forward EME, local Tidy3D FDE modes, GDS tapers ({n_taper_cells} cells each), {num_modes} modes in the MMI".format(**EME_CFG),
        "lam_um": lc,
        "game": {"el_dB": pred and pred["el_dB"], "imb_dB": pred and pred["imb_dB"], "L_um": L0},
        "eme": {"el_dB": _el(r["P_plus"], r["P_minus"]), "imb_dB": 10 * math.log10(r["P_plus"] / r["P_minus"]), "L_best_um": best[0], "el_best_dB": _el(best[1], best[2]),
                "imb_best_dB": 10 * math.log10(best[1] / best[2])},
        "scan": [[x[0], round(_el(x[1], x[2]), 4)] for x in r["scan"][::5]],
    }


def spiral(d, info):
    from . import sim_mode

    r = sim_mode.check(d, info)
    return {k: r[k] for k in ("solver", "rows", "tau_drawn_ns", "length_for_target_um", "bend_domains_ok")}


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("examples", nargs="?", default=str(Path(__file__).parent / "examples"))
    ap.add_argument("--levels", default="1-3,1-4,1-5,D-1")
    ap.add_argument("--plats", default="si1310,si1550,sin1310,sin1550")
    ap.add_argument("--force", action="store_true", help="recompute entries that already exist")
    a = ap.parse_args(argv)
    lay = design.layers()
    data = json.loads(OUT.read_text()) if OUT.exists() else {"schema": "smq-validation/1", "by": {}}
    for pid in a.plats.split(","):
        for lid in a.levels.split(","):
            if not a.force and lid in data["by"].get(pid, {}):
                print("have", pid, lid)
                continue
            f = Path(a.examples) / f"smq_{pid}_{lid}.json"
            if not f.exists():
                print("skip", f.name)
                continue
            d = design.load(f)
            comp, info = pcells.build(d, lay)
            t0 = time.time()
            res = mmi(d, comp) if d["geometry"]["pcell"] == "mmi" else spiral(d, info)
            res["design"] = {k: v["value"] for k, v in d["params"].items()}
            res["seconds"] = round(time.time() - t0)
            cur = json.loads(OUT.read_text()) if OUT.exists() else data  # merge: other runs may have written meanwhile
            cur["by"].setdefault(pid, {})[lid] = res
            cur["updated"] = time.strftime("%Y-%m-%d")
            OUT.write_text(json.dumps(cur, indent=1, ensure_ascii=False) + "\n")
            data = cur
            print(f"{pid} {lid}: {res['seconds']} s", json.dumps(res.get("eme") or [r["solver"] for r in res["rows"]][:1]) if "eme" in res else "", flush=True)
            if "rows" in res:
                for row in res["rows"]:
                    print("   ", row["quantity"], row["game"], "→", row["solver"], flush=True)


if __name__ == "__main__":
    main()
