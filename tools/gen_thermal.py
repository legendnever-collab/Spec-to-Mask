# 2D steady-state heat conduction in the waveguide cross-section (finite volume, non-uniform grid).
# Heater (TiN, 2 µm x 0.12 µm) above the waveguide; optional air trenches / substrate undercut.
# Output per (material, top-cladding gap h, isolation): ΔT at core per heater power per length,
# heater self-heating, lateral ΔT profile (thermal crosstalk), thermal time constant (energy method).
import numpy as np, scipy.sparse as sp, scipy.sparse.linalg as sla, json, sys, time

K = {'si': 148.0, 'ox': 1.38, 'sin': 30.0, 'air': 0.026, 'tin': 20.0}
RC = {'si': 1.63e6, 'ox': 1.64e6, 'sin': 2.1e6, 'air': 1.2e3, 'tin': 2.5e6}   # J/m^3/K

def axis(fine_lo, fine_hi, lo, hi, dfine, dcoarse, growth=1.15):
    xs = list(np.arange(fine_lo, fine_hi + 1e-9, dfine))
    d = dfine
    while xs[-1] < hi:
        d = min(dcoarse, d * growth); xs.append(xs[-1] + d)
    d = dfine; x0 = [xs[0]]
    while x0[-1] > lo:
        d = min(dcoarse, d * growth); x0.append(x0[-1] - d)
    return np.array(sorted(set(np.round(x0[1:] + xs, 5))))

def solve(mat, h, iso):
    tco = 0.22 if mat == 'si' else 0.40; box = 2.0 if mat == 'si' else 3.0; wco = 0.5 if mat == 'si' else 1.0
    hw, ht, pas = 2.0, 0.12, 1.0                      # heater width/thickness, passivation above heater
    ytop = tco + h + ht + pas
    xe = axis(-6, 6, -60, 60, 0.05, 2.0)              # cell edges
    ye = np.unique(np.round(np.concatenate([axis(-box - 0.5, ytop + 0.2, -box - 100, ytop + 0.2, 0.04, 4.0)]), 5))
    ye = ye[ye <= ytop + 1e-9]
    xc = 0.5 * (xe[1:] + xe[:-1]); yc = 0.5 * (ye[1:] + ye[:-1]); dx = np.diff(xe); dy = np.diff(ye)
    nx, ny = len(xc), len(yc)
    X, Y = np.meshgrid(xc, yc)
    kk = np.full(X.shape, K['ox']); rc = np.full(X.shape, RC['ox'])
    sub = Y < -box; kk[sub] = K['si']; rc[sub] = RC['si']
    core = (np.abs(X) <= wco / 2) & (Y >= 0) & (Y <= tco); kk[core] = K[mat]; rc[core] = RC[mat]
    heat = (np.abs(X) <= hw / 2) & (Y >= tco + h) & (Y <= tco + h + ht); kk[heat] = K['tin']; rc[heat] = RC['tin']
    if iso >= 1:   # deep air trenches beside the heater, through cladding and BOX
        tr = (np.abs(X) >= hw / 2 + 2.0) & (np.abs(X) <= hw / 2 + 6.0) & (Y >= -box - 10.0)
        kk[tr] = K['air']; rc[tr] = RC['air']
    if iso >= 2:   # substrate undercut below the arm (released bridge)
        uc = (np.abs(X) <= hw / 2 + 6.0) & (Y < -box) & (Y >= -box - 12.0)
        kk[uc] = K['air']; rc[uc] = RC['air']
    N = nx * ny; idx = lambda i, j: j * nx + i
    rows, cols, vals = [], [], []; b = np.zeros(N)
    Ah = heat.sum() and (dx[None, :] * dy[:, None])[heat].sum()
    q = 1.0 / Ah                                       # W/m^3 for 1 W/m per unit length (µm^2 → scale below)
    diag = np.zeros(N)
    for j in range(ny):
        for i in range(nx):
            p = idx(i, j)
            if heat[j, i]: b[p] = q * dx[i] * dy[j]
            for (ii, jj, area, dist) in ((i + 1, j, dy[j], 0.5 * (dx[i] + dx[i + 1]) if i + 1 < nx else 0), (i - 1, j, dy[j], 0.5 * (dx[i] + dx[i - 1]) if i > 0 else 0),
                                         (i, j + 1, dx[i], 0.5 * (dy[j] + dy[j + 1]) if j + 1 < ny else 0), (i, j - 1, dx[i], 0.5 * (dy[j] + dy[j - 1]) if j > 0 else 0)):
                if 0 <= ii < nx and 0 <= jj < ny:
                    k1, k2 = kk[j, i], kk[jj, ii]
                    d1 = (dx[i] if ii != i else dy[j]) / 2; d2 = (dx[ii] if ii != i else dy[jj]) / 2
                    g = area / (d1 / k1 + d2 / k2)
                    rows.append(p); cols.append(idx(ii, jj)); vals.append(-g); diag[p] += g
                elif jj < 0:   # bottom: heat sink at T=0
                    g = area / (dy[j] / 2 / kk[j, i]); diag[p] += g
                # sides and top: adiabatic
    rows += list(range(N)); cols += list(range(N)); vals += list(diag)
    A = sp.csr_matrix((vals, (rows, cols)), shape=(N, N))
    T = sla.spsolve(A.tocsc(), b).reshape(ny, nx)     # K per (W/m) — lengths in µm cancel in conductance
    ycore = tco / 2; jc = np.argmin(np.abs(yc - ycore))
    dT_core = float(np.interp(0, xc, T[jc]))
    dT_heat = float(T[heat].max())
    prof_x = [3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50, 60]
    prof = [float(np.interp(x, xc, T[jc]) / dT_core) for x in prof_x]
    dA = dx[None, :] * dy[:, None]
    loc = (np.abs(X) <= 10.0) & (Y >= -box - 2.0)     # dominant (fast) pole: heat stored in the local stack
    tau = float((rc * T * dA)[loc].sum()) * 1e-12      # s = J/m per W/m (µm² → m²)
    return {'dTcore': dT_core, 'dTheat': dT_heat, 'xs': prof_x, 'prof': [round(v, 5) for v in prof], 'tau': tau}

out = {}
t0 = time.time()
for mat in ('si', 'sin'):
    out[mat] = {'hs': [], 'iso': {}}
    hs = [round(0.4 + 0.2 * i, 2) for i in range(14)]
    out[mat]['hs'] = hs
    for iso in (0, 1, 2):
        rows = []
        for h in hs:
            r = solve(mat, h, iso); rows.append(r)
            print(mat, iso, h, 'dTcore K/(W/m)', round(r['dTcore'], 3), 'heater', round(r['dTheat'], 3), 'tau us', round(r['tau'] * 1e6, 3), 'xt@10', round(r['prof'][5], 4), round(time.time() - t0), flush=True)
        out[mat]['iso'][str(iso)] = rows
json.dump(out, open('src/data/thermal.json', 'w'), separators=(',', ':'))
print('DONE')
