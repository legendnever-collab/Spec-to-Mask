"""3D eigenmode expansion of an exported MMI, straight from the GDS polygons (local Tidy3D FDE, no account).

The GDS is cut into piecewise-uniform cells along x (8 per taper, 1 for the MMI body); every cell's cross-section
is solved on the same y–z grid, modes are joined by field overlaps (forward EME — back-reflection at these
low-contrast steps is < −30 dB) and propagated with exp(i·k₀·n_eff·L). The input is the TE0 mode of the isolated
input waveguide; port powers are projections on the TE0 mode of each isolated output waveguide, so a 2×2's
splitting and imbalance come out per port. Same n(λ) as the game. Uniform grid (dl 20 nm Si / 40 nm SiN) without
sub-pixel averaging: beat lengths of the wide MMI body are converged to ≈ 0.1 %, the narrow ports less so.
"""
from __future__ import annotations

import math
import time
import warnings

import numpy as np

from .design import n_core, n_ox

warnings.filterwarnings("ignore")


def _cuts(comp, layer, xs):
    """Lateral core intervals [(y_centre, width), …] of the GDS at each x."""
    import klayout.db as kdb

    ly = comp.kcl
    li = ly.layer(*layer)
    reg = kdb.Region(comp.begin_shapes_rec(li)).merged()
    dbu = ly.dbu
    bb = reg.bbox()
    out = []
    for x in xs:
        xi = int(round(x / dbu))
        cut = reg & kdb.Region(kdb.Box(xi - 1, bb.bottom - 10, xi + 1, bb.top + 10))
        iv = sorted(((p.bbox().bottom + p.bbox().top) / 2 * dbu, (p.bbox().top - p.bbox().bottom) * dbu) for p in cut.each())
        out.append(iv)
    return out


def _solve(mat, lam, t, boxes, Ly, num_modes, dl):
    import tidy3d as td
    from tidy3d.plugins.mode import ModeSolver

    nc, no = n_core(mat, lam), n_ox(lam)
    H = t + 2 * (1.0 if mat == "si" else 1.6)
    sts = [td.Structure(geometry=td.Box(center=(0, c, 0), size=(td.inf, b, t)), medium=td.Medium(permittivity=nc * nc)) for c, b in boxes]
    sim = td.Simulation(size=(4, Ly, H), grid_spec=td.GridSpec.uniform(dl=dl), structures=sts, medium=td.Medium(permittivity=no * no), run_time=1e-12, boundary_spec=td.BoundarySpec.all_sides(boundary=td.PML()))
    d = ModeSolver(simulation=sim, plane=td.Box(center=(0, 0, 0), size=(0, Ly, H)), mode_spec=td.ModeSpec(num_modes=num_modes, target_neff=nc), freqs=[td.C_0 / lam]).solve()
    return d


def _ov(a, b):
    """⟨a_i | b_j⟩ (symmetric power overlap, conjugated) normalised by the self-overlaps → matrix (n_a, n_b)."""
    o = np.asarray(a.outer_dot(b))[0]  # dims (f, mode_index_0, mode_index_1)
    na = np.real(np.diag(np.asarray(a.outer_dot(a))[0]))
    nb = np.real(np.diag(np.asarray(b.outer_dot(b))[0]))
    return o / np.sqrt(np.outer(na, nb))


def solve(d: dict, comp, lam: float, n_taper_cells: int = 8, num_modes: int | None = None, taper_modes: int = 12, L_scan=None):
    """Port powers for the drawn MMI; with L_scan also for other body lengths (same modes, only the phase changes)."""
    g, pf = d["geometry"], d["platform"]
    mat, t = pf["mat"], pf["core_t_um"]
    layer = (1, 0) if mat == "si" else (34, 0)
    Lt, L, W, s, w0 = g["taper_len_um"], g["L_um"], g["W_um"], g["s_um"], g["w_io_um"]
    dl = 0.02 if mat == "si" else 0.04
    Ly = W + 2 * (1.4 if mat == "si" else 2.2)
    if num_modes is None:  # every guided TE+TM mode of the MMI body plus a margin
        nmmi = 2 * int(2 * W * math.sqrt(n_core(mat, lam) ** 2 - n_ox(lam) ** 2) / lam) + 4
        num_modes = min(max(nmmi, 10), 30)
    dz = Lt / n_taper_cells
    lens = [dz] * n_taper_cells + [L] + [dz] * n_taper_cells
    edges = np.concatenate([[-Lt], -Lt + np.cumsum(lens)])
    mids = 0.5 * (edges[:-1] + edges[1:])
    cuts = _cuts(comp, layer, mids)
    k0 = 2 * math.pi / lam
    datas, neffs = [], []
    for k, iv in enumerate(cuts):
        nm = num_modes if k == n_taper_cells else min(num_modes, taper_modes)
        dd = _solve(mat, lam, t, iv, Ly, nm, dl)
        datas.append(dd)
        neffs.append(np.asarray(dd.n_complex).ravel())
    yin = 0.0 if g["type"] == "1x2" else -s / 2
    iso_in = _solve(mat, lam, t, [(yin, w0)], Ly, 1, dl)
    iso_p = _solve(mat, lam, t, [(s / 2, w0)], Ly, 1, dl)
    iso_m = _solve(mat, lam, t, [(-s / 2, w0)], Ly, 1, dl)
    a = _ov(datas[0], iso_in)[:, 0]  # expansion of the isolated input TE0
    p_in = float(np.sum(np.abs(a) ** 2))
    ovs = [None] + [_ov(datas[k], datas[k - 1]) for k in range(1, len(datas))]
    op, om = _ov(iso_p, datas[-1])[0], _ov(iso_m, datas[-1])[0]

    def run(Lb):
        b, trace = a, []
        for k in range(len(datas)):
            if k > 0:
                b = ovs[k] @ b
            b = b * np.exp(1j * k0 * neffs[k] * (Lb if k == n_taper_cells else lens[k]))
            trace.append(float(np.sum(np.abs(b) ** 2)))
        return float(abs(op @ b) ** 2), float(abs(om @ b) ** 2), trace

    Pp, Pm, trace = run(L)
    out = {"lam_um": lam, "P_plus": Pp, "P_minus": Pm, "P_modes_out": trace[-1], "input_overlap": p_in, "num_modes_mmi": num_modes, "cells": len(lens), "power_trace": trace}
    if L_scan is not None:
        out["scan"] = [(float(Lb), *run(Lb)[:2]) for Lb in L_scan]
    return out


def check(d: dict, comp) -> dict:
    g = d["geometry"]
    t0 = time.time()
    rows, summary = [], []
    pred = {round(r["lam_um"], 4): r for r in g.get("predicted_per_lam", [])}
    for lam in g["lams_um"]:
        r = solve(d, comp, lam)
        tot = r["P_plus"] + r["P_minus"]
        el = -10 * math.log10(max(tot, 1e-12))
        imb = 10 * math.log10(max(r["P_plus"], 1e-12) / max(r["P_minus"], 1e-12))
        p = pred.get(round(lam, 4), {})
        rows.append({"lam_um": lam, "game_el_dB": p.get("el_dB"), "eme_el_dB": el, "game_imb_dB": p.get("imb_dB"), "eme_imb_dB": imb, "eme_P": [r["P_plus"], r["P_minus"]], "num_modes_mmi": r["num_modes_mmi"]})
        summary.append(f"  λ {lam * 1000:.0f} nm: EL game {_f(p.get('el_dB'))} dB · EME {el:.3f} dB | imbalance game {_f(p.get('imb_dB'))} dB · EME {imb:+.3f} dB")
    worst = max(r["eme_el_dB"] for r in rows)
    worst_imb = max((r["eme_imb_dB"] for r in rows), key=abs)
    head = f"EME check ({time.time() - t0:.0f} s, local Tidy3D FDE, {rows[0]['num_modes_mmi']} modes in the MMI): worst EL game {_f(d['predicted']['primary']['value'])} dB → EME {worst:.3f} dB"
    return {"solver": "forward EME on local Tidy3D FDE modes (uniform grid), tapers from the GDS", "rows": rows, "worst_el_dB": worst, "worst_imb_dB": worst_imb, "summary": [head, *summary]}


def _f(v):
    return "—" if v is None else f"{float(v):.3f}"
