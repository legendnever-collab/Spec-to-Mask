"""Sweep the S-bend curvature-reversal conversion 1−|⟨E₊R|E₋R⟩|² with the local mode solver and save it.

python -m smq2gds.fit_sbend [out.json]   (≈ 20–30 min on 2 CPUs). The game's spiral kind is refitted from this file.
"""
from __future__ import annotations

import json
import math
import sys
import time
from pathlib import Path

from . import sim_mode as sm

PLATS = {
    "si1310": ("si", 1.31, 0.22), "si1550": ("si", 1.55, 0.22),
    "sin1310": ("sin", 1.31, 0.40), "sin1550": ("sin", 1.55, 0.40),
}
GRID = {
    "si": ([0.5, 0.9], [4, 10]),
    "sin": ([1.2, 2.0], [25, 60]),
}


def main(out):
    old = json.loads(Path(out).read_text())["rows"] if Path(out).exists() else []
    rows, t0 = list(old), time.time()
    done = {(r["pf"], r["w"], r["R"]) for r in old}
    for pid, (mat, lam, t) in PLATS.items():
        ws, Rs = GRID[mat]
        for w in ws:
            ng = sm.te0(mat, lam, w, t, True)
            for R in Rs:
                if (pid, w, R) in done:
                    continue
                try:
                    r = sm.reversal(mat, lam, w, t, R, ng)
                    rows.append({"pf": pid, "w": w, "R": R, "neff": ng, "conv": r["conv_power"]})
                    print(f"{pid} w {w} R {R}: conv {10 * math.log10(max(r['conv_power'], 1e-12)):.1f} dB  ({time.time() - t0:.0f} s)", flush=True)
                except Exception as e:  # keep sweeping
                    print(f"{pid} w {w} R {R}: failed {e}", flush=True)
                Path(out).write_text(json.dumps({"schema": "smq-sbend-conv/1", "solver": "tidy3d local FDE, uniform grid, PML", "rows": rows}, indent=1) + "\n")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else str(Path(__file__).parent / "data" / "sbend_conv.json"))
