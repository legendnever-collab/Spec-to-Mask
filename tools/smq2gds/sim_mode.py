"""Cross-section and bend checks, local only (no account, no FDTD credits).

Straight strip (n_eff, n_g, ∂n_eff/∂w, ∂n_eff/∂t, guided modes): Tidy3D local FDE on two uniform grids with
Richardson extrapolation (the local solver has no sub-pixel averaging; staircase error is O(dl)).
500×220 nm Si @1550: TE0 2.444, TM0 1.769.
Bends (radiation loss, curvature-reversal overlap): Tidy3D local ModeSolver with PML and the conformal bend
transformation. The local solver has no sub-pixel averaging, so the core looks ~½ cell wider: bend numbers are
slightly optimistic (lower loss / less conversion), which is noted in the report.

All materials use the same n(λ) as the game, so a difference is model error, not material data.
"""
from __future__ import annotations

import math
import time
import warnings

import numpy as np

from .design import n_core, n_ox

warnings.filterwarnings("ignore")
LOG10E = 10 / math.log(10)


# ---------------------------------------------------------------- straight: tidy3d, two grids + Richardson
def _strip_modes(mat, lam, w, t, dl, num_modes=2, yc=0.0, boxes=None, width=None):
    """Modes of strips in SiO₂ on a uniform grid (local Tidy3D FDE). boxes = [(y_centre, width), …] overrides one strip."""
    import tidy3d as td
    from tidy3d.plugins.mode import ModeSolver

    boxes = boxes or [(yc, w)]
    nc, no = n_core(mat, lam), n_ox(lam)
    Ly = width or (max(abs(c) + b / 2 for c, b in boxes) * 2 + 2 * (1.2 if mat == "si" else 2.0))
    H = t + 2 * (1.6 if mat == "si" else 2.2)
    sts = [td.Structure(geometry=td.Box(center=(0, c, 0), size=(td.inf, b, t)), medium=td.Medium(permittivity=nc * nc)) for c, b in boxes]
    sim = td.Simulation(size=(4, Ly, H), grid_spec=td.GridSpec.uniform(dl=dl), structures=sts, medium=td.Medium(permittivity=no * no), run_time=1e-12, boundary_spec=td.BoundarySpec.all_sides(boundary=td.PML()))
    return ModeSolver(simulation=sim, plane=td.Box(center=(0, 0, 0), size=(0, Ly, H)), mode_spec=td.ModeSpec(num_modes=num_modes, target_neff=nc), freqs=[td.C_0 / lam]).solve()


def _te_list(data, lam):
    ne, te = np.asarray(data.n_eff).ravel(), np.asarray(data.pol_fraction.te).ravel()
    return [(float(n), float(f)) for n, f in sorted(zip(ne, te), key=lambda x: -x[0])]


DL = {"si": (0.02, 0.01), "sin": (0.04, 0.02)}


def straight(mat, lam, w, t, num_modes=1):
    """TE/TM modes (n_eff, te_fraction), Richardson-extrapolated from two grids (staircase error is O(dl)):
    500×220 nm Si @1550 TE0 → 2.444, TM0 → 1.769 (literature 2.44 / 1.77)."""
    a, b = DL[mat]
    ma, mb = _te_list(_strip_modes(mat, lam, w, t, a, num_modes), lam), _te_list(_strip_modes(mat, lam, w, t, b, num_modes), lam)
    return [(2 * nb - na, fb) for (na, fa), (nb, fb) in zip(ma, mb)]


def te0(mat, lam, w, t, fine_only=False):
    a, b = DL[mat]
    f = lambda dl: max((m for m in _te_list(_strip_modes(mat, lam, w, t, dl, 2), lam) if m[1] > 0.5), key=lambda m: m[0])[0]
    return f(b) if fine_only else 2 * f(b) - f(a)


# ---------------------------------------------------------------- bends: tidy3d
def bend(mat, lam, w, t, R, n_guess, compact=False):
    import tidy3d as td
    from tidy3d.plugins.mode import ModeSolver

    no = n_ox(lam)
    caustic = abs(R) * max(n_guess / no - 1, 0.02)  # radiation caustic distance from the guide centre
    # loss needs the PML beyond the radiation caustic; the reversal overlap only needs the guided field
    # far caustic (large R): PML at ≤ 6 µm absorbs part of the evanescent tail → the loss is an upper bound (flagged)
    L = min(1.9 * abs(R), w + 8.0) if compact else min(1.9 * abs(R), 2 * (min(caustic, 6.0) + w / 2 + 2.0))
    H = t + 2 * (1.6 if mat == "si" else 2.2)
    dl = 0.02 if mat == "si" else 0.03
    core = td.Structure(geometry=td.Box(center=(0, 0, 0), size=(td.inf, w, t)), medium=td.Medium(permittivity=n_core(mat, lam) ** 2))
    sim = td.Simulation(size=(4, L, H), grid_spec=td.GridSpec.uniform(dl=dl), structures=[core], medium=td.Medium(permittivity=no * no), run_time=1e-12, boundary_spec=td.BoundarySpec.all_sides(boundary=td.PML()))
    spec = td.ModeSpec(num_modes=3, target_neff=n_guess, bend_radius=R, bend_axis=1, num_pml=(12, 12))
    d = ModeSolver(simulation=sim, plane=td.Box(center=(0, 0, 0), size=(0, L, H)), mode_spec=spec, freqs=[td.C_0 / lam]).solve()
    nc = np.asarray(d.n_complex).ravel()
    te = np.asarray(d.pol_fraction.te).ravel()
    ok = [i for i in range(len(nc)) if te[i] > 0.5 and nc[i].imag < 0.02]  # drop PML-dominated solutions
    i = max(ok or range(len(nc)), key=lambda k: nc[k].real)
    k0 = 2 * math.pi / lam
    return {"data": d, "i": i, "neff": complex(nc[i]), "dB_cm": LOG10E * 2 * k0 * nc[i].imag * 1e4, "domain_um": L, "outer_pml_beyond_caustic": L / 2 > caustic + w / 2, "upper_bound": caustic > 6.0}


def reversal(mat, lam, w, t, R, n_guess):
    """Abrupt curvature flip +R → −R (S-bend inflection): power kept in the fundamental = |⟨E₊|E₋⟩|²."""
    a, b = bend(mat, lam, w, t, R, n_guess, True), bend(mat, lam, w, t, -R, n_guess, True)
    da, db, i, j = a["data"], b["data"], a["i"], b["i"]
    sab = complex(np.asarray(da.outer_dot(db))[0][i, j])
    saa = complex(np.asarray(da.outer_dot(da))[0][i, i])
    sbb = complex(np.asarray(db.outer_dot(db))[0][j, j])
    eta = abs(sab) ** 2 / abs(saa * sbb)
    return {"eta": eta, "conv_power": max(0.0, 1 - eta), "bend": a}


# ---------------------------------------------------------------- report
def check(d: dict, info: dict) -> dict:
    g, pf = d["geometry"], d["platform"]
    if g["pcell"] == "spiral_rect":
        return _check_rect(d, info)
    if g["pcell"] == "ring_allpass":
        return {"status": "NOT VERIFIED", "summary": ["ring_allpass: no solver check yet (geometry checks only: radius, gap, ports in test_smq2gds)"]}
    if g["pcell"] != "spiral":
        return _check_mmi_ports(d)
    mat, lam, t, w = pf["mat"], pf["lam_um"], pf["core_t_um"], g["w_um"]
    M = g.get("model", {})
    t0 = time.time()
    ms = straight(mat, lam, w, t, 6)
    ne = max(m[0] for m in ms if m[1] > 0.5)
    guided_te = sum(1 for m in ms if m[1] > 0.5 and m[0] > n_ox(lam) + 1e-3)
    dlam, h = 0.01, DL[mat][1]  # derivatives on the fine grid; geometry steps of one cell per edge
    ng = ne - lam * (te0(mat, lam + dlam, w, t, True) - te0(mat, lam - dlam, w, t, True)) / (2 * dlam)
    dndw = (te0(mat, lam, w + 2 * h, t, True) - te0(mat, lam, w - 2 * h, t, True)) / (4 * h)
    dndt = (te0(mat, lam, w, t + 2 * h, True) - te0(mat, lam, w, t - 2 * h, True)) / (4 * h)

    sb = info.get("sbend", {})
    euler = g["sbend"] == "euler"
    Rc = float(sb.get("Rmin_um") if euler else sb.get("R_um"))
    wc = g["ws_um"] if euler else w
    nc_guess = te0(mat, lam, wc, t)
    rev = reversal(mat, lam, wc, t, Rc, nc_guess)
    rev["bend"] = bend(mat, lam, wc, t, Rc, nc_guess)  # loss on the full (caustic-wide) domain
    bj = bend(mat, lam, w, t, g["rin_um"], ne)

    L_cm = info.get("path_um", g["length_um"]) * 1e-4
    tau = L_cm * 1e-2 * ng / 299792458 * 1e9
    L_fix = g["length_um"] * M.get("ng", g["ng_model"]) / ng
    a_sw = M.get("alpha_sw_dBcm", 0) * dndw / M["dneff_dw_per_um"] if M.get("dneff_dw_per_um") else 0
    a_s = M.get("alpha_surf_dBcm", 0) * dndt / M["dneff_dt_per_um"] if M.get("dneff_dt_per_um") else 0
    alpha = a_sw + a_s + M.get("alpha_mat_dBcm", 0)
    parts = g["predicted"]["parts_dB"]
    Ls = 2 * sb.get("half_len_um", 0)
    conv_dB = -10 * math.log10(max(1 - rev["conv_power"], 1e-9))
    xt_dB = 10 * math.log10(max(rev["conv_power"], 1e-12))
    sb_rad = max(rev["bend"]["dB_cm"], 0) * (0.4 if euler else 1.0) * Ls * 1e-4
    IL = alpha * L_cm + parts.get("bend", 0) + sb_rad + conv_dB + parts.get("taper", 0)
    rows = [
        ("n_eff (arm TE0)", M.get("neff"), ne, "FDE, Richardson dl→0"),
        ("n_g (arm TE0)", M.get("ng"), ng, "Δλ ±10 nm, material dispersion included"),
        ("guided TE modes (arm)", ("≥2" if M.get("multimode") else "1"), guided_te, ""),
        ("∂n_eff/∂w (1/µm)", M.get("dneff_dw_per_um"), dndw, ""),
        ("∂n_eff/∂t (1/µm)", M.get("dneff_dt_per_um"), dndt, ""),
        ("α scattering+material (dB/cm)", g["predicted"]["alpha_dBcm"], alpha, "same Payne–Lacey constants, solver ∂n_eff"),
        (f"bend loss R {Rc:.2f} µm, w {wc} µm (dB/cm)", M.get("bend_centre", {}).get("dB_cm"), rev["bend"]["dB_cm"], "S-bend centre" + (" · upper bound" if rev["bend"]["upper_bound"] else "")),
        (f"bend loss R {g['rin_um']} µm, w {w} µm (dB/cm)", M.get("bend_rin", {}).get("dB_cm"), bj["dB_cm"], "innermost turn" + (" · upper bound (caustic beyond the PML)" if bj["upper_bound"] else "")),
        ("S-bend reversal conversion (dB)", g["predicted"].get("xtMode_dB"), xt_dB, "10log(1−|⟨E₊R|E₋R⟩|²)"),
        ("insertion loss (dB)", g["predicted"]["IL_dB"], IL, "arm bend radiation kept from the game"),
    ]
    summary = [f"mode check ({time.time() - t0:.0f} s; Tidy3D local FDE — straight: two grids + Richardson, bends: PML + conformal map)"]
    for k, a, b, note in rows:
        summary.append(f"  {k:<44} game {_f(a):>10}   solver {_f(b):>10}" + (f"   {note}" if note else ""))
    summary.append(f"  drawn path {L_cm:.3f} cm → τ {tau:.4f} ns with the solver n_g (target {g['tau_ns']} ns) · length for exact τ: {L_fix:.0f} µm")
    return {
        "solver": {"straight": "tidy3d.plugins.mode local FDE, uniform grids dl/2·dl, Richardson", "bend": "tidy3d.plugins.mode local FDE, uniform grid, PML, conformal bend"},
        "rows": [{"quantity": k, "game": _num(a), "solver": _num(b), "note": n} for k, a, b, n in rows],
        "tau_drawn_ns": tau,
        "length_for_target_um": L_fix,
        "bend_domains_ok": bool(rev["bend"]["outer_pml_beyond_caustic"] and bj["outer_pml_beyond_caustic"]),
        "summary": summary,
    }


def _check_rect(d: dict, info: dict) -> dict:
    """Boundary-aware rectangular spiral: same cross-section checks as the circular spiral, plus the bends this layout
    actually has — the innermost corner (R, w) and the centre S-bend (arc: curvature reversal at R = H_t/2;
    Euler U-turns: apex R_min at the mid-width (w + W_s)/2, no reversal). Corner straight↔arc junction conversion stays a game estimate."""
    g, pf = d["geometry"], d["platform"]
    mat, lam, t, w = pf["mat"], pf["lam_um"], pf["core_t_um"], g["w_um"]
    M = g.get("model", {})
    t0 = time.time()
    ms = straight(mat, lam, w, t, 6)
    ne = max(m[0] for m in ms if m[1] > 0.5)
    guided_te = sum(1 for m in ms if m[1] > 0.5 and m[0] > n_ox(lam) + 1e-3)
    dlam, h = 0.01, DL[mat][1]
    ng = ne - lam * (te0(mat, lam + dlam, w, t, True) - te0(mat, lam - dlam, w, t, True)) / (2 * dlam)
    dndw = (te0(mat, lam, w + 2 * h, t, True) - te0(mat, lam, w - 2 * h, t, True)) / (4 * h)
    a_sw = M.get("alpha_sw_dBcm", 0) * dndw / M["dneff_dw_per_um"] if M.get("dneff_dw_per_um") else 0
    alpha = a_sw + M.get("alpha_surf_dBcm", 0) + M.get("alpha_mat_dBcm", 0)
    bc = bend(mat, lam, w, t, g["R_um"], ne)
    rows = [
        ("n_eff (arm TE0)", M.get("neff"), ne, "FDE, Richardson dl→0"),
        ("n_g (arm TE0)", M.get("ng"), ng, "Δλ ±10 nm, material dispersion included"),
        ("guided TE modes (arm)", ("≥2" if M.get("multimode") else "1"), guided_te, ""),
        ("∂n_eff/∂w (1/µm)", M.get("dneff_dw_per_um"), dndw, ""),
        ("α scattering+material (dB/cm)", g["predicted"]["alpha_dBcm"], alpha, "solver ∂n_eff/∂w; surface term kept from the game"),
        (f"bend loss innermost corner R {g['R_um']} µm, w {w} µm (dB/cm)", M.get("corner_bend_dB_cm"), bc["dB_cm"], g["corner"] + (" · upper bound" if bc["upper_bound"] else "")),
    ]
    Rs = float(info.get("sbend", {}).get("Rmin_um", g["Rmin_sbend_um"]))
    if g["sbend"] == "arc":
        nc_guess = te0(mat, lam, w, t)
        rev = reversal(mat, lam, w, t, Rs, nc_guess)
        rows.append(("S-bend reversal conversion (dB)", 10 * math.log10(max(M.get("sbend_conv_power", 1e-12), 1e-12)), 10 * math.log10(max(rev["conv_power"], 1e-12)), "10log(1−|⟨E₊R|E₋R⟩|²)"))
        sb = bend(mat, lam, w, t, Rs, nc_guess)
    else:
        wm = 0.5 * (w + g["ws_um"])
        sb = bend(mat, lam, wm, t, Rs, te0(mat, lam, wm, t))
    rows.append((f"bend loss S-bend apex R {Rs:.1f} µm (dB/cm)", M.get("sbend_apex_dB_cm"), sb["dB_cm"], "Euler U-turn: κ through 0 at the centre, no reversal" if g["sbend"] != "arc" else "arc S-bend"))
    L_cm = info.get("path_um", g["length_um"]) * 1e-4
    tau = L_cm * 1e-2 * ng / 299792458 * 1e9
    summary = [f"rect spiral mode check ({time.time() - t0:.0f} s; Tidy3D local FDE)"] + [f"  {k:<52} game {_f(a):>10}   solver {_f(b):>10}" + (f"   {n}" if n else "") for k, a, b, n in rows]
    summary.append(f"  drawn path {L_cm:.3f} cm → τ {tau:.4f} ns with the solver n_g (game {g['tau_ns']} ns)")
    return {"solver": {"straight": "tidy3d local FDE, two grids + Richardson", "bend": "tidy3d local FDE, PML, conformal bend"},
            "rows": [{"quantity": k, "game": _num(a), "solver": _num(b), "note": n} for k, a, b, n in rows], "tau_drawn_ns": tau, "summary": summary}


def _check_mmi_ports(d):
    g, pf = d["geometry"], d["platform"]
    ms = straight(pf["mat"], pf["lam_um"], g["w_io_um"], pf["core_t_um"], 3)
    te = [m for m in ms if m[1] > 0.5 and m[0] > n_ox(pf["lam_um"]) + 1e-3]
    return {"solver": "tidy3d local FDE", "io_waveguide": {"neff_te0": te[0][0] if te else None, "guided_te": len(te)}, "summary": [f"I/O waveguide w0 {g['w_io_um']} µm: TE0 n_eff {te[0][0]:.4f}, guided TE modes {len(te)}"]}


def _num(v):
    if isinstance(v, (bool, type(None), str)):
        return v
    return float(v)


def _f(v):
    if v is None:
        return "—"
    if isinstance(v, (bool, str)):
        return str(v)
    v = float(v)
    if v != 0 and (abs(v) < 1e-3 or abs(v) >= 1e4):
        return f"{v:.2e}"
    return f"{v:.4f}"
