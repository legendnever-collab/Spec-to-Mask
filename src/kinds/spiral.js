// ===== Kind: long on-chip delay line — broadened Archimedean double spiral with a tapered Euler S-bend =====
// After S. Hong et al., Photon. Res. 10, 1 (2022) and Y. Xie et al., Opto-Electron. Adv. 6, 220030 (2023).
// Cross-section: EIM strip (vertical slab TE → lateral slab with TM boundary conditions).
// Scattering: perturbation (Payne–Lacey-type) α_sw ∝ σ_sw²·(n₁²−n₂²)·∂n_eff/∂w, α_surf ∝ σ_s²·(n₁²−n₂²)·∂n_eff/∂t,
//   constants fitted once to the Si 2.0/1.6/0.45-µm cut-back data of Hong 2022 (0.28 / 0.38 / 5.5 dB/cm, σ 4.6 / 0.42 nm).
// Bends: Marcuse slab radiation loss C₁·exp(−U·R) on the EIM lateral slab, integrated along the spiral.
// S-bend: mode conversion at the curvature reversal, conv = sin²a, a = K_C·n_s²·w³/(λ²R) (Gaussian-shift picture), evaluated
//   where the curvature flips: arc (width w, R = r_in/2) vs Euler (width W_s, R = R_min = r_in/2.65, the clothoid that tools/smq2gds
//   draws). K and the mode-width term are fitted to a local mode-solver sweep of 1 − |⟨E₊R|E₋R⟩|² (tools/smq2gds/fit_sbend.py → tools/fit_sbend_conv.js).
// Adjacent turns: coupled-slab κ (Marcuse) → coupling length L_c = π/(2κ); footprint from the double-spiral packing.
KINDS.spiral = (() => {
  const C_CM_NS = 29.9792, A_SW = 0.0147, B_S = 0.034, RMIN_F = 2.65;
  // reversal conversion: a = K·n_s²·(w + c·2/γ)³/(λ²R), fitted per core material to the mode-solver sweep (rms error Si 0.5 dB, SiN 0.24 dB)
  const KC = { si: { K: 0.80, c: 0 }, sin: { K: 0.633, c: 1.05 } };
  const ROUGH = { si: { sw: 4.6, s: 0.42 }, sin: { sw: 5.0, s: 0.40 } };
  const matLoss = (pf) => (pf.mat === 'si' ? 0 : pf.lam > 1.4 ? 0.06 : 0.02);   // dB/cm, residual N–H / Si–H absorption in annealed LPCVD SiN
  function slab(n1, n0, t, lam, tm) {
    const k0 = 2 * Math.PI / lam; let lo = n0 + 1e-9, hi = n1 - 1e-9;
    for (let i = 0; i < 70; i++) { const m = 0.5 * (lo + hi), ka = k0 * Math.sqrt(n1 * n1 - m * m), ga = k0 * Math.sqrt(m * m - n0 * n0), ph = ka * t / 2; const f = ph >= Math.PI / 2 ? 1e9 : ka * Math.tan(ph) - (tm ? (n1 * n1) / (n0 * n0) : 1) * ga; if (f > 0) lo = m; else hi = m; }
    return 0.5 * (lo + hi);
  }
  const ncore = (pf, lam) => (pf.mat === 'si' ? PQ.nSi(lam) : PQ.nSiN(lam));
  const CACHE = new Map();
  // cross-section properties of a strip of width w on platform pf (cached)
  function xs(pf, w, sigScale) {
    const key = pf.id + '|' + w.toFixed(4) + '|' + (sigScale || 1).toFixed(4);
    let r = CACHE.get(key); if (r) return r;
    const lam = pf.lam, n1 = ncore(pf, lam), n0 = PQ.nOx(lam), t = pf.t;
    const ne = (ww, tt, ll) => { const nn1 = ncore(pf, ll), nn0 = PQ.nOx(ll), ns = slab(nn1, nn0, tt, ll, false); return slab(ns, nn0, ww, ll, true); };
    const ns = slab(n1, n0, t, lam, false), neff = slab(ns, n0, w, lam, true);
    const dndw = (ne(w + 0.01, t, lam) - ne(w - 0.01, t, lam)) / 0.02, dndt = (ne(w, t + 0.004, lam) - ne(w, t - 0.004, lam)) / 0.008;
    const ng = neff - lam * (ne(w, t, lam + 0.005) - ne(w, t, lam - 0.005)) / 0.01, dn2 = n1 * n1 - n0 * n0, R = ROUGH[pf.mat], s = sigScale || 1, lf = 1.55 / lam;
    const asw = A_SW * Math.pow(R.sw * s, 2) * dn2 * Math.max(dndw, 0) * lf, as = B_S * Math.pow(R.s, 2) * dn2 * Math.max(dndt, 0) * lf, am = matLoss(pf);
    // lateral slab for bends / coupling
    const k0 = 2 * Math.PI / lam, b = k0 * neff, g = k0 * Math.sqrt(Math.max(neff * neff - n0 * n0, 1e-9)), h = k0 * Math.sqrt(Math.max(ns * ns - neff * neff, 1e-9));
    const C1 = g * g * h * h * Math.pow(Math.cos(h * w / 2), 2) * Math.exp(g * w) / (b * (1 + g * w / 2) * (ns * ns - n0 * n0) * k0 * k0), U = (2 / 3) * g * g * g / (b * b);
    // TE1 cut-off check on the lateral slab (second root exists if V > π)
    const V = k0 * w * Math.sqrt(ns * ns - n0 * n0);
    r = { neff, ng, ns, n0, dndw, dndt, asw, as, am, alpha: asw + as + am, b, g, h, C1, U, multi: V > Math.PI, lam };
    if (CACHE.size > 5000) CACHE.clear(); CACHE.set(key, r);
    return r;
  }
  const bendDBcm = (x, R) => Math.min(1e4, 4.343 * x.C1 * Math.exp(-x.U * R) * 1e4);   // dB/cm at radius R (µm)
  const kappa = (x, w, gap) => 2 * x.h * x.h * x.g * Math.exp(-x.g * gap) / (x.b * (w + 2 / x.g) * (x.h * x.h + x.g * x.g));   // 1/µm
  const convA = (pf, x, w, R) => { const k = KC[pf.mat], wm = w + k.c * 2 / x.g; return k.K * x.ns * x.ns * wm * wm * wm / (x.lam * x.lam * R); };
  // full spiral for a target delay τ (ns). d = { w, gap, rin, ws, sb }
  function build(pf, d, tau, proc) {
    const g = (k) => (proc && proc.seed != null ? gaussR(mulberry(proc.seed * 29 + k * 601)) : 0);
    const dw = proc ? proc.dw || 0 : 0, sig = 1 + 0.2 * g(1);
    const w = d.w + dw, x = xs(pf, w, sig), Lcm = C_CM_NS * tau / x.ng, Lum = Lcm * 1e4, p = d.w + d.gap;
    const rin = d.rin, rout = Math.sqrt(Lum * p / Math.PI + rin * rin);
    // bend radiation integrated over the spiral (dL = 2πr dr / p)
    let bend = 0; const nS = 60;
    for (let i = 0; i < nS; i++) { const r0 = rin + (rout - rin) * Math.pow(i / nS, 2), r1 = rin + (rout - rin) * Math.pow((i + 1) / nS, 2), rm = 0.5 * (r0 + r1); bend += bendDBcm(x, rm) * (2 * Math.PI * rm * (r1 - r0) / p) * 1e-4; }
    // S-bend in the centre
    const euler = (d.sb | 0) === 1, Ls = 2 * Math.PI * rin * 0.7, Rmin = rin / RMIN_F;
    const xj = euler ? xs(pf, Math.max(0.2, d.ws + dw), sig) : x, wj = euler ? d.ws + dw : w, Rj = euler ? Rmin : rin / 2;
    const sRad = euler ? bendDBcm(xj, Rmin) * 0.4 * Ls * 1e-4 + bendDBcm(xj, rin) * 0.6 * Ls * 1e-4 : bendDBcm(x, rin / 2) * Ls * 1e-4;
    const sScat = (euler ? xj.alpha : x.alpha) * Ls * 1e-4;
    const a = convA(pf, xj, wj, Rj), conv = Math.pow(Math.sin(Math.min(a, Math.PI / 2)), 2), xtMode = 10 * Math.log10(Math.max(conv, 1e-9));
    const convLoss = -10 * Math.log10(Math.max(1 - conv, 1e-6));
    const taper = 2 * (0.02 + x.alpha * 0.01);   // two bent tapers to the single-mode I/O
    const prop = x.alpha * Lcm, IL = prop + bend + sRad + sScat + convLoss + taper;
    const k = kappa(x, w, d.gap), Lc = Math.PI / (2 * k), xtGap = 10 * Math.log10(Math.max(Math.pow(Math.sin(Math.min(Math.PI / 2, k * Lum)), 2), 1e-12));
    const side = 2 * rout + 20, area = side * side;
    return { x, w, Lcm, rout, p, prop, bend, sRad, sScat, conv, convLoss, xtMode, taper, IL, k, Lc, xtGap, area, euler, Rmin, xj, wj, Rj,
      parts: { sw: x.asw * Lcm, surf: x.as * Lcm, mat: x.am * Lcm, bend: bend + sRad, sb: convLoss + sScat, taper } };
  }
  const PR = (l) => l.pf.mat === 'si' ? [
    { k: 'w', label: '나선 도파로 폭', sym: 'W<sub>m</sub>', min: 0.4, max: 3.0, step: 0.05, dec: 2, unit: 'µm' },
    { k: 'gap', label: '이웃 회전 간격', sym: 'W<sub>gap</sub>', min: 0.2, max: 4, step: 0.1, dec: 1, unit: 'µm' },
    { k: 'rin', label: '나선 안쪽 반경 (S-bend R<sub>max</sub>)', sym: 'R<sub>in</sub>', min: 5, max: 200, step: 1, dec: 0, unit: 'µm' },
    { k: 'ws', label: 'S-bend 중앙 폭', sym: 'W<sub>s</sub>', min: 0.3, max: 2.0, step: 0.05, dec: 2, unit: 'µm' },
    { k: 'sb', label: '중앙 S-bend', sym: 'S', min: 0, max: 1, step: 1, dec: 0, unit: '', labels: ['원호 (폭 Wm 그대로)', '테이퍼 Euler (Ws)'] }
  ] : [
    { k: 'w', label: '나선 도파로 폭', sym: 'W<sub>m</sub>', min: 0.8, max: 4.0, step: 0.05, dec: 2, unit: 'µm' },
    { k: 'gap', label: '이웃 회전 간격', sym: 'W<sub>gap</sub>', min: 0.5, max: 10, step: 0.1, dec: 1, unit: 'µm' },
    { k: 'rin', label: '나선 안쪽 반경 (S-bend R<sub>max</sub>)', sym: 'R<sub>in</sub>', min: 20, max: 1000, step: 5, dec: 0, unit: 'µm' },
    { k: 'ws', label: 'S-bend 중앙 폭', sym: 'W<sub>s</sub>', min: 0.6, max: 3.0, step: 0.05, dec: 2, unit: 'µm' },
    { k: 'sb', label: '중앙 S-bend', sym: 'S', min: 0, max: 1, step: 1, dec: 0, unit: '', labels: ['원호 (폭 Wm 그대로)', '테이퍼 Euler (Ws)'] }
  ];
  const other = (pf) => Object.values(PLATFORMS).find((p) => p.lam === pf.lam && p.mat !== pf.mat);
  const mm2 = (a) => (a / 1e6).toFixed(a < 1e5 ? 3 : 2);
  /* ===================== Boundary-aware rectangular double spiral (layout 1 = arc corners, 2 = Euler corners) =====================
     The player first fixes the usable rectangle (W × H, edge clearance, port edges); the generator then lays out a point-symmetric
     double spiral whose straights run parallel to the rectangle edges. Canonical frame: long axis = x, centre at the origin.
       arm A starts at (0, H_t) on the top line and winds outward clockwise; arm B is A rotated by 180°; a centre S-bend joins them.
       loop k of arm A:  top y = H_t + 2kp,  right x = c_x + a₀ + 2kp,  bottom y = −(H_t + p) − 2kp,  left x = −(c_x + a₀ + p) − 2kp,
       so arm B's lines interleave with arm A's at exactly p = W_m + W_gap on every side.
       corner j (four per loop) = the base corner offset outward by d_j = j·p/2 (tangent length a₀ + d_j):
         arc   — quarter circle of radius R + d (curvature jumps 1/(R+d) at both ends → straight↔bend mode mismatch),
         Euler — symmetric clothoid 90° bend (κ 0 → 1/R → 0), a₀ = 1.870·R, length π·R + d·π/2; its parallel offsets keep κ
                 continuous (κ/(1+dκ)) and the spacing exactly p.
       centre S-bend (0, −H_t) → (0, H_t), H_t = c_y + a₀:  arc = two semicircles R = H_t/2 (curvature reversal ±2/R at the centre);
         Euler = two Euler 180° U-turns (R_min = H_t/2.7537, D = 2.7537·R_min, bulge 2.4501·R_min) — κ passes through 0 at the centre,
         width tapered W_m → W_s → W_m.
       ports: 'short' = the outermost top line of A runs straight to the boundary (B mirrored);
              'long'  = an extra 90° corner (same shape) turns A up to the long edge.
     Path length, bend radiation, junction conversion, clearances and DRC are all computed from this geometry, and the export
     (pcell 'spiral_rect') hands smq2gds the same primitives so the GDS is drawn from them. */
  function sampleTurn(total, n) {   // symmetric clothoid pair, κmax = 1, left turn from (0,0) heading +x: [x, y, θ, κ]
    const L = 2 * total, th = (s) => (s <= L / 2 ? s * s / L : total - (L - s) * (L - s) / L), kap = (s) => (s <= L / 2 ? 2 * s / L : 2 * (L - s) / L);
    const out = [[0, 0, 0, 0]]; let x = 0, y = 0;
    for (let i = 0; i < n; i++) { const s0 = i * L / n, s1 = s0 + L / n, sm = (s0 + s1) / 2, f = (s) => [Math.cos(th(s)), Math.sin(th(s))], a = f(s0), b = f(sm), c = f(s1);
      x += (L / n) * (a[0] + 4 * b[0] + c[0]) / 6; y += (L / n) * (a[1] + 4 * b[1] + c[1]) / 6; out.push([x, y, th(s1), kap(s1)]); }
    return { pts: out, L };
  }
  const U90 = sampleTurn(Math.PI / 2, 240), U180 = sampleTurn(Math.PI, 480);
  // shape constants taken from the same integration (≈ 1.8701, 2.7537, 2.4501) so S-bend and corner end points close exactly at any scale
  const EU90 = U90.pts[U90.pts.length - 1][0], EU180_D = U180.pts[U180.pts.length - 1][1], EU180_B = Math.max(...U180.pts.map((q) => q[0]));
  // corner in its local frame: left turn, vertex at the origin, incoming along +x; base tangent length a0 (arc: a0 = R), outward offset d
  function cornerLocal(euler, R, a0, d, n) {
    const out = [];
    if (!euler) { const a = a0 + d; for (let i = 0; i <= n; i++) { const t = -Math.PI / 2 + (Math.PI / 2) * i / n; out.push([-a + a * Math.cos(t), a + a * Math.sin(t), 1 / a]); } return out; }
    const P = U90.pts, st = Math.max(1, Math.floor((P.length - 1) / n));
    for (let i = 0; i < P.length; i += st) { const [x, y, th, k] = P[i]; out.push([-a0 + R * x + d * Math.sin(th) - d, R * y - d * Math.cos(th) + d, (k / R) / (1 + d * k / R)]); }
    if ((P.length - 1) % st) { const [x, y, th, k] = P[P.length - 1]; out.push([-a0 + R * x + d * Math.sin(th) - d, R * y - d * Math.cos(th) + d, (k / R) / (1 + d * k / R)]); }
    return out;
  }
  const place = (c, pts) => { const cs = Math.cos(c.h), sn = Math.sin(c.h); return pts.map(([x, y]) => { const yy = c.turn * y; return [c.V[0] + x * cs - yy * sn, c.V[1] + x * sn + yy * cs]; }); };
  // centre S-bend half for arm A: origin → (0, H_t), arriving heading +x (arc: semicircle; Euler: mirrored unit U-turn)
  function sHalf(euler, Ht, n) {
    const out = [];
    if (!euler) { const rr = Ht / 2; for (let i = 0; i <= n; i++) { const f = -Math.PI / 2 - Math.PI * i / n; out.push([rr * Math.cos(f), rr + rr * Math.sin(f), 1 / rr, i / n]); } return out; }
    const P = U180.pts, sc = Ht / EU180_D, st = Math.max(1, Math.floor((P.length - 1) / n));
    for (let i = 0; i < P.length; i += st) out.push([-P[i][0] * sc, P[i][1] * sc, P[i][3] / sc, i / (P.length - 1)]);
    if ((P.length - 1) % st) { const q = P[P.length - 1]; out.push([-q[0] * sc, q[1] * sc, q[3] / sc, 1]); }
    return out;
  }
  const PRESET = [[5, 5], [5, 15], [10, 30]];
  const LAYL = ['원형 이중 나선 (Legacy)', '직사각형 나선 · 원호 코너', '직사각형 나선 · Euler 코너'];
  const isRect = (d) => !!d && (d.lay | 0) >= 1;
  // default corner radius from the physics: smallest R at which bend radiation of the current arm width is below 0.01 dB/cm
  function defaultR(pf, w) { const si = pf.mat === 'si', x = xs(pf, w), st = si ? 1 : 5; for (let R = si ? 2 : 20; R <= (si ? 500 : 2000); R += st) if (bendDBcm(x, R) < 0.01) return R; return si ? 500 : 2000; }
  function rectDefaults(l, d) {
    const si = l.pf.mat === 'si', set = (k, v) => { if (d[k] == null) d[k] = v; };
    set('bp', 2); set('bw', PRESET[2][0]); set('bh', PRESET[2][1]); set('ec', 100); set('port', 0); set('dm', 0); set('tau', l.tau); set('ilb', 10); set('env', 1);
    if (d.rc == null) d.rc = defaultR(l.pf, d.w); set('tl', si ? 60 : 150);
  }
  // the layout itself (design values only — process variation never moves the mask)
  function rectGeom(pf, d, tau) {
    const W = d.bw * 1000, H = d.bh * 1000, e = d.ec, w = d.w, p = d.w + d.gap, euler = (d.lay | 0) === 2, R = d.rc, sbE = (d.sb | 0) === 1;
    const a0 = euler ? EU90 * R : R, Lc0 = euler ? Math.PI * R : Math.PI / 2 * R, rot = W < H, Wc = Math.max(W, H), Hc = Math.min(W, H);
    const pm = d.port === 0 ? 'short' : d.port === 1 ? (W >= H ? 'short' : 'long') : (W >= H ? 'long' : 'short');
    const Xb = Wc / 2 - e, Yb = Hc / 2 - e, tl = d.tl, env = d.env;
    const Xe = env * Xb, Ye = Math.min(env * Yb, pm === 'long' ? Yb - a0 - tl - w / 2 : Infinity);
    const S = (Ht) => (sbE ? { R: Ht / EU180_D, bulge: EU180_B * Ht / EU180_D, L: 4 * Math.PI * Ht / EU180_D } : { R: Ht / 2, bulge: Ht / 2, L: Math.PI * Ht });
    const htMin = sbE ? EU180_D * R : 2 * R, cyMin = Math.max(htMin - a0, -p / 4), cxMin = (cy) => Math.max(p / 4, S(cy + a0).bulge + p - a0);
    const len = (N, cx, cy) => { const Ht = cy + a0, arm = cx * (1 + 4 * N) + 4 * N * cy + 4 * N * Lc0 + (Math.PI * p / 2) * N * (4 * N - 1);
      const stub = pm === 'short' ? Xb - cx : Lc0 + (Yb - (Ht + 2 * N * p + a0)); return 2 * (arm + stub) + S(Ht).L; };
    const cx0 = (N) => Math.min(Xe - (a0 + (2 * N - 1) * p + w / 2), pm === 'short' ? Xb - tl : Infinity),   // short ports keep a straight ≥ taper length
       cy0 = (N) => Ye - (a0 + 2 * N * p + w / 2);
    const fits = (N) => cy0(N) >= cyMin && cx0(N) >= cxMin(cy0(N));
    const core = (N, dl) => { const cy = Math.max(cyMin, cy0(N) - dl); return { cy, cx: Math.max(cxMin(cy), cx0(N) - dl) }; };
    const NMAX = 4000, out = { W, H, e, w, p, euler, sbE, R, a0, Lc0, rot, Wc, Hc, pm, Xb, Yb, Xe, Ye, tl, S, htMin };
    // largest N whose full-size core still fits → geometric capacity of this envelope
    let Nfit = 0; while (Nfit < NMAX && fits(Nfit + 1)) Nfit++;
    out.Nfit = Nfit; out.Lgeo = Nfit ? len(Nfit, cx0(Nfit), cy0(Nfit)) : 0;
    out.solveFor = (Lt) => {   // fewest loops (largest radii) that reach Lt, then shrink the core to hit Lt exactly
      if (!Nfit) return { err: 'box' };
      for (let N = 1; N <= Nfit; N++) {
        if (len(N, cx0(N), cy0(N)) < Lt) continue;
        const cmin = core(N, 1e12); if (len(N, cmin.cx, cmin.cy) > Lt) return { err: 'short', N };
        let lo = 0, hi = Math.max(cx0(N), cy0(N)) + 1; for (let i = 0; i < 80; i++) { const m = 0.5 * (lo + hi); if (len(N, core(N, m).cx, core(N, m).cy) > Lt) lo = m; else hi = m; }
        const c = core(N, 0.5 * (lo + hi)); return { N, cx: c.cx, cy: c.cy };
      }
      return { err: 'long' };
    };
    out.len = len;
    // shortest layout this boundary allows (one loop, smallest core, full port leads) — sets the lower end of Mode A / the floor of Mode B
    out.Lmin = Nfit ? (() => { const c = core(1, 1e12); return len(1, c.cx, c.cy); })() : 0;
    return out;
  }
  // arm A primitives (canonical, µm). Lines {t:'L', a, b}, corners {t:'C', V, h, turn, d}; the last line is the port line.
  function armA(G, N, cx, cy) {
    const { a0, p } = G, Ht = cy + a0, out = [], L = (a, b, port) => out.push({ t: 'L', a, b, ...(port ? { port: true } : {}) }), C = (V, h, turn, dd) => out.push({ t: 'C', V, h, turn, d: dd });
    for (let k = 0; k < N; k++) {
      const Yt = Ht + 2 * k * p, Xr = cx + a0 + 2 * k * p, Ybt = -(Ht + p) - 2 * k * p, Xl = -(cx + a0 + p) - 2 * k * p;
      L([k ? -cx + p / 2 : 0, Yt], [cx, Yt]); C([Xr, Yt], 0, -1, 2 * k * p);
      L([Xr, cy], [Xr, -cy - p / 2]); C([Xr, Ybt], -Math.PI / 2, -1, p / 2 + 2 * k * p);
      L([cx - p / 2, Ybt], [-cx, Ybt]); C([Xl, Ybt], Math.PI, -1, p + 2 * k * p);
      L([Xl, -cy], [Xl, cy + p / 2]); C([Xl, Yt + 2 * p], Math.PI / 2, -1, 1.5 * p + 2 * k * p);
    }
    const YN = Ht + 2 * N * p; L([-cx + p / 2, YN], [cx, YN]);
    if (G.pm === 'short') L([cx, YN], [G.Xb, YN], true);
    else { C([cx + a0, YN], 0, 1, 0); L([cx + a0, YN + a0], [cx + a0, G.Yb], true); }
    return out;
  }
  const segLen = (G, s) => (s.t === 'L' ? Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]) : G.Lc0 + Math.PI / 2 * s.d);
  // canonical → chip coordinates (µm, boundary corner at the origin)
  const toChip = (G, x, y) => (G.rot ? [G.W / 2 - y, G.H / 2 + x] : [G.W / 2 + x, G.H / 2 + y]);
  // minimum centre-line distance between the S-bend and loop 0 of both arms (numeric clearance check; must be ≥ p)
  function sClear(G, segs, Ht) {
    // arm A's S-bend half against loop 0 of both arms, except arm A's first line, which it joins at (0, H_t) by construction;
    // by point symmetry the arm-B half sees the same distances. Lines: exact point–segment distance; corners: sampled, bbox-culled.
    const half = sHalf(G.sbE, Ht, 90).map((q) => [q[0], q[1]]), lines = [], cps = [];
    let hx0 = Infinity, hx1 = -Infinity, hy0 = Infinity, hy1 = -Infinity; half.forEach(([x, y]) => { hx0 = Math.min(hx0, x); hx1 = Math.max(hx1, x); hy0 = Math.min(hy0, y); hy1 = Math.max(hy1, y); });
    const near = (x, y) => x > hx0 - 2 * G.p && x < hx1 + 2 * G.p && y > hy0 - 2 * G.p && y < hy1 + 2 * G.p;
    segs.slice(0, Math.min(segs.length, 8)).forEach((sg, i) => [1, -1].forEach((m) => {
      if (m === 1 && i === 0) return;
      if (sg.t === 'L') lines.push([m * sg.a[0], m * sg.a[1], m * sg.b[0], m * sg.b[1]]);
      else place(sg, cornerLocal(G.euler, G.R, G.a0, sg.d, 32)).forEach(([x, y]) => { if (near(m * x, m * y)) cps.push([m * x, m * y]); });
    }));
    let mn = Infinity;
    for (const [px, py] of half) {
      for (const [ax, ay, bx, by] of lines) { const vx = bx - ax, vy = by - ay, t = clamp(((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy || 1), 0, 1), dd = Math.hypot(px - ax - t * vx, py - ay - t * vy); if (dd < mn) mn = dd; }
      for (const [qx, qy] of cps) { const dd = Math.hypot(px - qx, py - qy); if (dd < mn) mn = dd; }
    }
    return mn;
  }
  function rectEval(l, d, proc) {
    const pf = l.pf, g = (k) => (proc && proc.seed != null ? gaussR(mulberry(proc.seed * 29 + k * 601)) : 0);
    const dw = proc ? proc.dw || 0 : 0, sig = 1 + 0.2 * g(1), x = xs(pf, d.w + dw, sig), ng = x.ng;
    const G = rectGeom(pf, d, d.tau), modeB = (d.dm | 0) === 1, drc = [], alts = [];
    const tau0 = (L) => L * 1e-4 * ng / C_CM_NS;
    let Lt, sol, limit = null, Lloss = null;
    const lossOf = (geo) => (geo ? rectLoss(l, d, x, G, geo, dw, sig) : null);
    const lay = (Ltarget) => { const s = G.solveFor(Ltarget); if (s.err) return { s }; const segs = armA(G, s.N, s.cx, s.cy); return { s, segs, Ht: s.cy + G.a0 }; };
    let geo;
    if (!modeB) { Lt = C_CM_NS * d.tau / ng * 1e4; geo = lay(Lt); }
    else {   // Mode B: largest delay the boundary holds (geometry) and the loss budget allows, whichever is smaller
      Lt = G.Lgeo; geo = G.Lgeo ? lay(G.Lgeo * (1 - 1e-9)) : { s: { err: 'box' } };
      // fixed losses (corners, S-bend, tapers) move with the layout, so iterate L ← L − (IL − budget)/α until IL sits on the budget,
      // then never end above it (the last step backs off by the residual)
      for (let it = 0; it < 24 && geo.segs; it++) {
        const ls = lossOf(geo), al = Math.max(x.alpha, 1e-6) * 1e-4;
        if (it === 0) { const fixed = ls.IL - al * ls.Lum; Lloss = Math.max(0, (d.ilb - fixed) / al); limit = Lloss < G.Lgeo ? 'loss' : 'area'; if (limit === 'area') break; }
        const res = ls.IL - d.ilb; if (res <= 0 && res > -2e-4) break;
        const nL = Math.min(G.Lgeo, Lt - res / al - (res > 0 ? 1e-4 / al : 0));
        if (nL >= G.Lgeo * (1 - 1e-12) && res <= 0) { limit = 'area'; break; }
        Lt = nL; Lloss = Lt; limit = 'loss'; if (Lt < 1) { geo = { s: { err: 'budget' } }; break; } geo = lay(Lt * (1 - 1e-9));
      }
      // IL(L) jumps where the loop count changes; if the iteration ended above the budget, bisect for the longest L that stays within it
      if (geo.segs && limit === 'loss' && lossOf(geo).IL > d.ilb) {
        let lo = 0, hi = Lt, best = null;
        for (let i = 0; i < 40; i++) { const m = 0.5 * (lo + hi), g2 = lay(m * (1 - 1e-9)), ok = g2.segs && lossOf(g2).IL <= d.ilb; if (ok) { lo = m; best = g2; } else hi = m; }
        if (best) { geo = best; Lt = lo; Lloss = lo; } else geo = { s: { err: 'budget' } };
      }
    }
    const fail = (msg) => drc.push(msg);
    if (!geo.segs) {
      const why = geo.s.err;
      if (why === 'box') fail(`Infeasible: 경계 ${d.bw}×${d.bh} mm, 여유 ${d.ec} µm, 점유 ${Math.round(d.env * 100)}%에는 한 바퀴도 들어가지 않습니다 (코너 a₀ ${f2(G.a0, 0)} µm, S-bend 최소 높이 ${f2(G.htMin, 0)} µm)`);
      else if (why === 'long') fail(`Infeasible: 목표 ${d.tau} ns(${f2(Lt / 1e4, 1)} cm)가 이 영역의 최대 ${f2(tau0(G.Lgeo), 2)} ns(${f2(G.Lgeo / 1e4, 1)} cm)보다 깁니다`);
      else if (why === 'short' && !modeB) fail(`Infeasible: 목표 ${d.tau} ns(${f2(Lt / 1e4, 2)} cm)가 이 경계에서 만들 수 있는 가장 짧은 배치 ${f2(tau0(G.Lmin), 2)} ns(${f2(G.Lmin / 1e4, 2)} cm — 포트까지의 직선 포함)보다 짧습니다`);
      else if (modeB && G.Lmin) fail(`Infeasible: 손실 예산 ${d.ilb} dB로는 이 경계의 가장 짧은 배치(${f2(G.Lmin / 1e4, 2)} cm, 전파 손실만 ≈ ${f2(x.alpha * G.Lmin * 1e-4, 1)} dB — 포트까지의 직선 포함)도 만들 수 없습니다`);
      else fail(`Infeasible: 손실 예산 ${d.ilb} dB가 고정 손실(코너·S-bend·테이퍼)보다 작습니다`);
      if (why === 'short' || why === 'budget') {
        if (modeB) { alts.push(`손실 예산 IL<sub>max</sub>를 늘리세요 (지금 ${d.ilb} dB)`); alts.push(`폭 W<sub>m</sub>을 넓혀 측벽 산란 dB/cm를 낮추세요 (지금 α ${f2(x.alpha, 2)} dB/cm)`); }
        else alts.push('목표 지연 τ를 늘리거나 Mode B로 이 경계의 지연 범위를 확인하세요');
        alts.push(G.pm === 'short' ? '긴 변 쪽 포트(E–W/S–N)나 더 작은 경계를 쓰면 포트까지의 직선이 짧아집니다' : '더 작은 경계를 쓰면 포트까지의 직선이 짧아집니다');
      }
      if (why === 'long' || why === 'box') {
        if (d.env < 1) alts.push(`점유 상한 f를 키우세요 (지금 ${Math.round(d.env * 100)}%)`);
        alts.push(`간격 W<sub>gap</sub> 또는 폭 W<sub>m</sub>을 줄이면 피치 p(${f2(G.p, 2)} µm)가 작아져 같은 면적에 더 감깁니다`);
        alts.push(`코너 반경 R(${d.rc} µm)을 줄이면 코어 최소 크기가 줄어듭니다 (굽힘 손실과 교환)`);
        if (why === 'long' && G.Lgeo) alts.push(`이 영역·피치로는 최대 ${f2(tau0(G.Lgeo), 2)} ns — Mode B로 최대 지연을 확인하세요`);
      }
    }
    if (d.gap < pf.rules.gap - 1e-9) fail(`간격 ${d.gap} µm < DRC 최소 간격 ${pf.rules.gap} µm`);
    let res = { rect: true, G, geo, drc, alts, limit, Lloss, x, ng, modeB };
    if (!geo.segs) return { ...res, IL: 99, xtMode: 0, xtGap: -200, conv: 0, convLoss: 0, Lcm: Lt / 1e4, Lum: Lt, area: G.W * G.H, tauP: tau0(Lt), parts: { sw: 0, surf: 0, mat: 0, bend: 0, sb: 0, taper: 0, conv: 0 }, k: 0, Lc: Infinity, xtGap0: -200, bboxMM: [0, 0, 0, 0], util: 0, ports: [], minR: 0, minGap: d.gap };
    const ls = lossOf(geo);
    // clearance of the centre S-bend against the first loop, and the port line against the taper
    const clr = sClear(G, geo.segs, geo.Ht);
    if (clr < G.p * (1 - 1e-3)) fail(`S-bend와 첫 회전의 중심선 간격 ${f2(clr, 2)} µm < 피치 ${f2(G.p, 2)} µm`);
    const pl = geo.segs[geo.segs.length - 1], plen = segLen(G, pl);
    if (plen < d.tl) fail(`포트 직선 ${f2(plen, 0)} µm < 테이퍼 길이 ${d.tl} µm`);
    // bounding box (canonical, centre line ± w/2) and chip-frame quantities
    const N = geo.s.N, cx = geo.s.cx, cy = geo.s.cy, Ht = geo.Ht, p = G.p, a0 = G.a0;
    // ports end on the clearance line: along their own axis the guide stops there, sideways it is ±w/2 like everything else
    const Xext = Math.max(cx + a0 + (2 * N - 1) * p + d.w / 2, G.pm === 'short' ? G.Xb : 0), Yext = Math.max(Ht + 2 * N * p + d.w / 2, G.pm === 'long' ? G.Yb : 0);
    const bodyX = cx + a0 + (2 * N - 1) * p + d.w / 2, bodyY = Ht + 2 * N * p + d.w / 2;
    const c1 = toChip(G, -Xext, -Yext), c2 = toChip(G, Xext, Yext), bb = [Math.min(c1[0], c2[0]), Math.min(c1[1], c2[1]), Math.max(c1[0], c2[0]), Math.max(c1[1], c2[1])];
    if (bb[0] < d.ec - 1e-6 || bb[1] < d.ec - 1e-6 || bb[2] > G.W - d.ec + 1e-6 || bb[3] > G.H - d.ec + 1e-6) fail('경계(여유 포함)를 벗어났습니다');
    const pe = pl.b, ang = G.pm === 'short' ? 0 : 90, rotA = (a) => (G.rot ? a + 90 : a) % 360;
    const ports = [{ n: 'o1', xy: toChip(G, -pe[0], -pe[1]), ang: rotA(ang + 180) }, { n: 'o2', xy: toChip(G, pe[0], pe[1]), ang: rotA(ang) }];
    const areaBody = 4 * bodyX * bodyY, wgArea = ls.Lum * d.w;
    const minR = Math.min(G.R, G.S(Ht).R);
    res = { ...res, ...ls, N, cx, cy, Ht, bodyX, bodyY, bboxMM: bb.map((v) => v / 1000), area: areaBody, util: wgArea / (G.W * G.H), fill: wgArea / areaBody, ports, minR, minGap: d.gap, clr, tauP: tau0(ls.Lum), Lt };
    return res;
  }
  // optical budget of a laid-out rectangular spiral: everything from the geometry (lengths, local radii, curvature jumps, gap)
  function rectLoss(l, d, x, G, geo, dw, sig) {
    const pf = l.pf, segs = geo.segs, Ht = geo.Ht, w = d.w;
    let Lline = 0, Lcorn = 0, bend = 0, conv = 0, nJ = 0;
    const cnv = (a) => Math.pow(Math.sin(Math.min(a, Math.PI / 2)), 2);
    for (const s of segs) {
      if (s.t === 'L') { Lline += segLen(G, s); continue; }
      const L = segLen(G, s); Lcorn += L;
      if (!G.euler) { const Rc = G.R + s.d; bend += bendDBcm(x, Rc) * L * 1e-4; const a = convA(pf, x, w, Rc) / 2; conv += 2 * cnv(a); nJ += 2; }
      else if (bendDBcm(x, G.R + s.d) > 1e-7) {   // κ(s) of the offset clothoid; skip corners whose tightest radius radiates nothing
        const P = U90.pts, st = 10; for (let i = st; i < P.length; i += st) { const k = (P[i][3] + P[i - st][3]) / 2, ds = (G.R + s.d * k) * (U90.L / (P.length - 1)) * st; if (k > 1e-9) bend += bendDBcm(x, G.R / k + s.d) * ds * 1e-4; }
      }
    }
    // centre S-bend (both halves)
    const Sg = G.S(Ht); let sRad = 0, sScat = 0, sConv = 0;
    if (!G.sbE) { sRad = bendDBcm(x, Sg.R) * Sg.L * 1e-4; sScat = x.alpha * Sg.L * 1e-4; const a = convA(pf, x, w, Sg.R); sConv = cnv(a) + 2 * cnv(a / 2); }
    else {   // Euler U-turn halves: width W_s at the centre → W_m at the junction; curvature continuous (no jump conversion)
      // six sub-sections of the half, each with its own cross-section (width rounded to 10 nm so scans reuse the EIM cache)
      const P = U180.pts, sc = Ht / EU180_D, n = P.length - 1, M = 6, st = 8, ds = U180.L * sc / n * st;
      for (let m = 0; m < M; m++) {
        const ww = d.ws + (w - d.ws) * (m + 0.5) / M, xw = xs(pf, Math.max(0.2, Math.round((ww + (dw || 0)) * 100) / 100), sig), i0 = Math.round(n * m / M), i1 = Math.round(n * (m + 1) / M);
        sScat += 2 * xw.alpha * (U180.L * sc * (i1 - i0) / n) * 1e-4;
        for (let i = i0 + st; i <= i1; i += st) { const k = (P[i][3] + P[i - st][3]) / 2 / sc; if (k > 1e-9) sRad += 2 * bendDBcm(xw, 1 / k) * ds * 1e-4; }
      }
    }
    const Lum = 2 * (Lline + Lcorn) + Sg.L, convT = Math.min(0.999, conv * 2 + sConv);   // ×2: arm B mirrors arm A
    const xtMode = 10 * Math.log10(Math.max(convT, 1e-9)), convLoss = -10 * Math.log10(Math.max(1 - convT, 1e-6));
    const taper = 2 * (0.02 + x.alpha * 0.01), prop = x.alpha * 2 * (Lline + Lcorn) * 1e-4, bendT = 2 * bend + sRad;
    const IL = prop + bendT + sScat + convLoss + taper;
    const k = kappa(x, w, d.gap), xtGap = 10 * Math.log10(Math.max(Math.pow(Math.sin(Math.min(Math.PI / 2, k * Lum)), 2), 1e-12));
    const Lcm = Lum / 1e4, Lac = 2 * (Lline + Lcorn) * 1e-4;
    return { IL, Lum, Lcm, prop, bend: bendT, sRad, sScat, conv: convT, sConv, cornerConv: conv * 2, nJ: nJ * 2, xtMode, convLoss, taper, k, Lc: Math.PI / (2 * k), xtGap, Lline: 2 * Lline, Lcorn: 2 * Lcorn, LS: Sg.L,
      parts: { sw: x.asw * Lac, surf: x.as * Lac, mat: x.am * Lac, bend: bendT, sb: sScat + convLoss, taper } };
  }
  const r1 = (l, r) => (r.drc && r.drc.length ? 50 : Math.max(r.IL / l.s1.il, 1 + (r.xtMode - l.s1.xtm) / 20, 1 + (r.xtGap - l.s1.xtg) / 30));
  const r2 = (l, r) => (r.drc && r.drc.length ? 50 : r.IL / l.s2.il);
  const keysFor = (r) => ['w', 'gap', 'rin', 'ws', 'sb'];
  const LEG = {   // legacy circular double spiral — unchanged physics, coach and export
    title: 'Delay spiral', aspect: 0.56, sizeLabel: '점유 면적', sizeUnit: 'mm²', sizeFmt: (v) => mm2(v), primaryLabel: '삽입 손실 dB', cheap: true,
    params: (l) => PR(l), landKeys: () => ['w', 'gap', 'rin'], violation: () => 0,
    evaluate(l, d, proc) { const b = build(l.pf, d, l.tau, proc); return { d: { ...d }, ...b, size: b.area, drc: [], primary: b.IL, secondary: b.Lcm }; },
    perf(l, r) { return 250 * clamp(l.s2.il / r.IL, 0, 1) + 125 * clamp((-r.xtMode - 10) / 30, 0, 1) + 125 * clamp((-r.xtGap - 20) / 40, 0, 1); },
    q1: r1, q2: r2,
    objectives(l, r) {
      return {
        t1: [{ k: `${l.tau} ns 지연 삽입 손실 ≤ ${fmtT(l.s1.il)} dB`, v: f2(r.IL, 2) + ' dB', ok: r.IL <= l.s1.il }, { k: `S-bend 고차모드 변환 ≤ ${l.s1.xtm} dB`, v: f2(r.xtMode, 1) + ' dB', ok: r.xtMode <= l.s1.xtm },
          { k: `이웃 회전 결합 ≤ ${l.s1.xtg} dB`, v: r.xtGap < -99 ? '< −99 dB' : f2(r.xtGap, 1) + ' dB', ok: r.xtGap <= l.s1.xtg }],
        t2: [{ k: `삽입 손실 ≤ ${fmtT(l.s2.il)} dB`, v: f2(r.IL, 2) + ' dB', ok: r.IL <= l.s2.il }]
      };
    },
    fabPass: (l, r) => r.IL <= l.fab.il && r.xtMode <= l.s1.xtm && r.xtGap <= l.s1.xtg,
    fabCrit: (l) => `삽입 손실 ≤ ${fmtT(l.fab.il)} dB · 모드 변환·이웃 결합 ★ 기준 (측벽 거칠기 웨이퍼 간 ±20%, CD 산포)`,
    meta(l, r) {
      const R = ROUGH[l.pf.mat];
      return `${l.pf.short} · 지연 ${l.tau} ns = ${f2(r.Lcm, 1)} cm (n<sub>g</sub> ${f2(r.x.ng, 2)}) · σ<sub>측벽</sub> ${R.sw} nm, σ<sub>상하면</sub> ${R.s} nm${matLoss(l.pf) ? ` · 재료 흡수 ${matLoss(l.pf)} dB/cm` : ''}`
        + `<br>EIM 단면 + Payne–Lacey형 산란(Hong 2022 Si 데이터로 상수 보정) · Marcuse 굽힘 방사 · 이중 아르키메데스 나선`;
    },
    tiles(l, r) { return [['삽입 손실', `${f2(r.IL, 2)}<small>dB</small>`], ['전파 손실', `${f2(r.x.alpha, 3)}<small>dB/cm</small>`], ['면적', `${mm2(r.area)}<small>mm²</small>`], ['모드 변환 · 이웃 결합', `${Math.round(r.xtMode)}<small>dB</small> · ${r.xtGap < -99 ? '<−99' : Math.round(r.xtGap)}<small>dB</small>`]]; },
    hint(l, r) {
      const P = r.parts;
      return `손실 분해: 측벽 산란 ${f2(P.sw, 2)} · 상하면 ${f2(P.surf, 2)} · 재료 ${f2(P.mat, 2)} · 굽힘 방사 ${f2(P.bend, 2)} · S-bend ${f2(P.sb, 2)} · 테이퍼 ${f2(P.taper, 2)} dB`
        + `<br>측벽 산란 ∝ σ²·(n₁²−n₂²)·∂n<sub>eff</sub>/∂w: 폭을 넓히면 측벽의 전계가 줄어 급감합니다 (지금 ∂n<sub>eff</sub>/∂w = ${f2(r.x.dndw, 3)} /µm)`
        + `<br>결합 길이 L<sub>c</sub> = π/(2κ) = ${r.Lc > 1e7 ? (r.Lc / 1e6).toExponential(1) + ' m' : f2(r.Lc / 1e4, 1) + ' cm'} vs 나선 길이 ${f2(r.Lcm, 1)} cm · 바깥 반경 ${Math.round(r.rout)} µm`;
    },
    draw(cv, l, r, ui) {
      const ctx = cv.getContext('2d'), W = cv.width, H = cv.height, pad = 10 * DPR, narrow = W / DPR < 520, d = r.d;
      ctx.fillStyle = '#0b1220'; ctx.fillRect(0, 0, W, H);
      const vw = narrow ? W : W * 0.62, cx = vw / 2, cy = H / 2 + 6 * DPR, Rpx = Math.min(vw, H) / 2 - 18 * DPR;
      // drawn turns are a scaled-down picture of the real spiral (pitch exaggerated)
      const turns = (r.rout - d.rin) / r.p, nT = Math.max(2, Math.min(14, Math.round(turns / 2))), rinPx = Rpx * clamp(d.rin / r.rout, 0.12, 0.5), pitchPx = (Rpx - rinPx) / nT;
      const tot = r.prop + r.bend;
      const arm = (sgn, phase) => {
        const n = nT * 80; let prev = null;
        for (let i = 0; i <= n; i++) {
          const th = i / n * nT * 2 * Math.PI, rr = rinPx + pitchPx * th / (2 * Math.PI) + (phase ? pitchPx / 2 : 0), xx = cx + sgn * rr * Math.cos(th), yy = cy + sgn * rr * Math.sin(th);
          if (prev) { const frac = phase ? 0.5 + 0.5 * (1 - i / n) : 0.5 * (i / n); const att = Math.pow(10, -tot * frac / 10); ctx.strokeStyle = `rgba(246,195,90,${(0.25 + 0.75 * att).toFixed(3)})`; ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(xx, yy); ctx.stroke(); }
          prev = [xx, yy];
        }
      };
      ctx.lineWidth = Math.max(1, Math.min(3 * DPR, pitchPx * 0.45));
      arm(1, false); arm(-1, true);
      // centre S-bend
      ctx.strokeStyle = r.xtMode > l.s1.xtm ? '#ff6b6b' : '#5dd193'; ctx.lineWidth = 2 * DPR; ctx.beginPath();
      ctx.arc(cx - rinPx / 2, cy, rinPx / 2, 0, Math.PI); ctx.stroke(); ctx.beginPath(); ctx.arc(cx + rinPx / 2, cy, rinPx / 2, Math.PI, 2 * Math.PI); ctx.stroke();
      cvPill(ctx, `${l.tau} ns · ${f2(r.Lcm, 1)} cm · 실제 ${Math.round(turns)}회전 (그림은 축약)`, pad, pad + 4 * DPR, 'left', '#f6c35a');
      cvPill(ctx, `${mm2(r.area)} mm² · Ø ${f2(2 * r.rout / 1000, 2)} mm`, pad, H - pad - 12 * DPR, 'left');
      if (narrow) return;
      // loss breakdown bar
      const px = W * 0.66, pw = W - px - pad, top = pad + 26 * DPR, bot = H - pad - 6 * DPR, P = r.parts;
      const items = [['sw', '측벽 산란', '#ff8d9c'], ['surf', '상하면', '#b48cff'], ['mat', '재료 흡수', '#9eabbd'], ['bend', '굽힘 방사', '#64c9df'], ['sb', 'S-bend', '#f2b04a'], ['taper', '테이퍼', '#5b6b80']];
      const sc = (bot - top) / Math.max(r.IL, l.s1.il * 1.05); let y = bot;
      ctx.font = `${10 * DPR}px "IBM Plex Mono", monospace`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      items.forEach(([k, n, c]) => { const h = P[k] * sc; if (h <= 0.3) return; ctx.fillStyle = c; ctx.fillRect(px, y - h, pw * 0.3, h); if (h > 11 * DPR) { ctx.fillStyle = 'rgba(231,236,243,0.9)'; ctx.fillText(`${n} ${f2(P[k], P[k] < 1 ? 2 : 1)}`, px + pw * 0.34, y - h / 2); } y -= h; });
      [[l.s1.il, '★'], [l.s2.il, '★★']].forEach(([v, t]) => { const yy = bot - v * sc; if (yy < top - 4 * DPR) return; ctx.strokeStyle = 'rgba(231,236,243,0.6)'; ctx.setLineDash([4 * DPR, 3 * DPR]); ctx.beginPath(); ctx.moveTo(px - 4 * DPR, yy); ctx.lineTo(px + pw * 0.3 + 4 * DPR, yy); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = 'rgba(231,236,243,0.8)'; ctx.textAlign = 'right'; ctx.fillText(t, px - 6 * DPR, yy); ctx.textAlign = 'left'; });
      cvPill(ctx, `손실 ${f2(r.IL, 2)} dB`, W - pad, pad + 4 * DPR, 'right', r.IL <= l.s1.il ? '#5dd193' : '#ff6b6b');
    },
    chartTitle: (l) => `같은 ${l.tau} ns 지연선 · 나선 폭에 따른 손실(전파 + 굽힘, S-bend 제외) — Si vs SiN (${Math.round(l.pf.lam * 1000)} nm)`,
    chart(l, r) {
      const d = r.d, op = other(l.pf), oref = ((PSPEC[op.id] || {})['D-1'] || {}).ref, mine = [], oth = [];
      const ws = []; for (let w = 0.4; w <= 4.0001; w += 0.1) ws.push(+w.toFixed(2));
      const P0 = PR(l)[0], Po = PR({ pf: op })[0];
      const pb = (pf, dd) => { const b = build(pf, dd, l.tau); return Math.min(60, b.prop + b.bend + b.taper); };   // spiral body only (S-bend excluded)
      ws.forEach((w) => { if (w >= P0.min - 1e-9 && w <= P0.max + 1e-9) mine.push([w, pb(l.pf, { ...d, w })]); if (oref && w >= Po.min - 1e-9 && w <= Po.max + 1e-9) oth.push([w, pb(op, { ...oref, w })]); });
      const ymax = Math.min(60, Math.max(l.s1.il * 2, ...oth.map((p) => p[1])));
      const html = svgChart({ x0: 0.4, x1: 4, y0: 0, y1: Math.ceil(ymax), aria: '폭에 따른 손실', xticks: [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4], yticks: [0, Math.ceil(ymax / 2), Math.ceil(ymax)], ylab: 'dB', xlab: '폭 µm',
        vlines: [{ x: d.w, color: 'rgba(231,236,243,.7)' }], hlines: [{ y: l.s2.il, label: `★★ ${fmtT(l.s2.il)} dB` }],
        series: [{ pts: mine, color: l.pf.mat === 'si' ? 'var(--amber)' : 'var(--cyan)', width: 2.4 }].concat(oth.length ? [{ pts: oth, color: l.pf.mat === 'si' ? 'var(--cyan)' : 'var(--amber)', width: 1.6, dash: '5 4' }] : []) });
      return { html, legend: legendHTML([[l.pf.mat === 'si' ? 'var(--amber)' : 'var(--cyan)', `${l.pf.mat === 'si' ? 'Si' : 'SiN'} (지금 설계, 폭만 변경)`], [l.pf.mat === 'si' ? 'var(--cyan)' : 'var(--amber)', `${op.mat === 'si' ? 'Si' : 'SiN'} (그 플랫폼의 기준 나선)`]]) };
    },
    coach(l, r, c) {
      const t = c.tier, d = r.d, q1 = (x) => r1(l, x), q2s = (x) => keepStar(r1(l, x), Math.max(r2(l, x), x.size / l.s2.size)), P = r.parts;
      const pick = (q, ks) => lineBestOf(K, l, d, ks, q, 24) || [['w', 'gap'], ['rin', 'ws'], ['w', 'rin']].map((k2) => pairBest(K, l, d, k2, q, 10)).filter(Boolean).sort((a, b) => a.q - b.q)[0] || randomBest(K, l, d, ['w', 'gap', 'rin', 'ws', 'sb'], q, 300);
      const txt = (b) => (!b ? '' : b.ps ? recText2(b, t) : recText(b, t, d));
      if (!c.ob1) {
        if (r.xtMode > l.s1.xtm) { const b = pick(q1, ['sb', 'ws', 'rin']); if (b) return { h: '중앙 S-bend에서 고차모드가 생깁니다', b: `넓은 멀티모드 도파로를 원호로 꺾으면 곡률이 뒤집히는 이음매에서 기본모드가 TE1로 바뀝니다(지금 ${f2(r.xtMode, 1)} dB). 곡률을 서서히 바꾸고 이음매만 좁히는 테이퍼 Euler S-bend가 해법입니다 — Hong 2022는 R<sub>max</sub> 25 µm, W<sub>s</sub> 0.6 µm로 −30 dB 이하를 얻었습니다.` + txt(b) }; }
        if (r.xtGap > l.s1.xtg) { const b = pick(q1, ['gap']); if (b) return { h: '이웃 회전으로 빛이 건너갑니다', b: `결합 길이 L<sub>c</sub>가 나선 길이(${f2(r.Lcm, 1)} cm)보다 충분히 길어야 합니다. 간격을 넓히면 κ가 지수적으로 줄어듭니다.` + txt(b) }; }
        if (r.IL > l.s1.il) {
          const dom = [['sw', '측벽 산란이 손실 대부분입니다', '좁은 단일모드 도파로는 측벽에 전계가 많이 걸려 거칠기 산란이 큽니다. 폭을 넓혀 모드를 코어 안으로 모으세요 — 넓힌 도파로는 멀티모드가 되지만 나선을 천천히 굽히면 기본모드만 유지됩니다.', ['w']],
            ['bend', '굽힘 방사 손실이 큽니다', l.pf.mat === 'si' ? '안쪽 회전 반경이 너무 작습니다.' : 'SiN은 굴절률 대비가 작아 반경 수십 µm 이하에서 빛이 바깥으로 새어 나갑니다. 안쪽 반경을 키우세요(면적과 교환).', ['rin', 'w']],
            ['sb', 'S-bend 손실이 큽니다', 'S-bend의 좁은 구간이 너무 급하게 꺾이거나 모드 변환이 손실로 나갑니다.', ['ws', 'rin', 'sb']]].sort((a, b) => P[b[0]] - P[a[0]])[0];
          const b = pick(q1, dom[3]); if (b) return { h: dom[1], b: dom[2] + txt(b) };
        }
        return null;
      }
      if (!c.ob2) { const b = pick(q2s, ['w', 'gap', 'rin', 'ws']); if (b) return { h: r.size > l.s2.size ? '★★: 나선이 너무 큽니다' : '★★: 손실을 더 줄여야 합니다', b: (r.size > l.s2.size ? '면적은 (폭 + 간격) × 길이로 정해집니다. 결합이 허락하는 만큼 간격을 줄이고, 안쪽 반경을 줄이세요.' : '폭, 반경, 간격의 균형을 다듬으세요.') + txt(b) }; }
      return null;
    },
    // layout intent for tools/smq2gds: double Archimedean spiral r = r_in + (p/π)θ per arm (arms interleaved → pitch p),
    // centre S-bend (arc R = r_in/2, or Euler with R_max = r_in at the junction, R_min ≈ r_in/2.65 at the centre, width tapered to W_s), tapers to w0 at both ends
    exportGeom(l, r) {
      const d = r.d, pf = l.pf, euler = (d.sb | 0) === 1;
      return { pcell: 'spiral', w_um: d.w, gap_um: d.gap, pitch_um: +(d.w + d.gap).toFixed(4), rin_um: d.rin, sbend: euler ? 'euler' : 'arc', ws_um: euler ? d.ws : d.w,
        Rmin_um: euler ? +r.Rmin.toFixed(3) : +(d.rin / 2).toFixed(3), tau_ns: l.tau, ng_model: +r.x.ng.toFixed(5), neff_model: +r.x.neff.toFixed(5),
        length_um: Math.round(r.Lcm * 1e4), rout_um: +r.rout.toFixed(2), w_io_um: pf.w0, taper_len_um: pf.mat === 'si' ? 60 : 150,
        model: { neff: +r.x.neff.toFixed(5), ng: +r.x.ng.toFixed(5), dneff_dw_per_um: +r.x.dndw.toFixed(5), dneff_dt_per_um: +r.x.dndt.toFixed(5), multimode: r.x.multi,
          alpha_sw_dBcm: +r.x.asw.toFixed(4), alpha_surf_dBcm: +r.x.as.toFixed(4), alpha_mat_dBcm: +r.x.am.toFixed(4),
          sbend_R_um: +r.Rj.toFixed(3), sbend_w_um: +r.wj.toFixed(3), bend_centre: { R_um: +(euler ? r.Rmin : d.rin / 2).toFixed(3), w_um: +r.wj.toFixed(3), dB_cm: +bendDBcm(r.xj, euler ? r.Rmin : d.rin / 2).toPrecision(4) },
          bend_rin: { R_um: d.rin, w_um: d.w, dB_cm: +bendDBcm(r.x, d.rin).toPrecision(4) }, conv_power: +r.conv.toPrecision(4) },
        predicted: { alpha_dBcm: +r.x.alpha.toFixed(4), IL_dB: +r.IL.toFixed(3), parts_dB: Object.fromEntries(Object.entries(r.parts).map(([k, v]) => [k, +v.toFixed(4)])), xtMode_dB: +r.xtMode.toFixed(2), xtGap_dB: +r.xtGap.toFixed(2), area_um2: Math.round(r.area) } };
    },
    card(l, r) { return { kind: 'spiral', lines: [`${f2(r.x.alpha, 3)} dB/cm · W ${f2(r.d.w, 2)} µm`, `${l.tau} ns: ${f2(r.IL, 2)} dB · ${mm2(r.area)} mm²`], model: { alpha: +r.x.alpha.toFixed(4), ng: +r.x.ng.toFixed(3), IL: +r.IL.toFixed(3), area: Math.round(r.area) } }; },
    aiStarts: (l) => [l.start, { ...l.start, w: l.pf.mat === 'si' ? 2 : 2.4, sb: 1 }],
    _x: { build, xs, bendDBcm, kappa, other, ROUGH }
  };
  /* ---------- layout-mode parameters ---------- */
  const PLAY = { k: 'lay', label: '레이아웃 방식 (Topology)', sym: 'Topo', min: 0, max: 2, step: 1, dec: 0, unit: '', labels: LAYL, relayout: true, noAI: true };
  function PRECT(l, d) {
    const si = l.pf.mat === 'si', byK = Object.fromEntries(PR(l).map((p) => [p.k, p])), ps = [
      { k: 'bp', label: '사용 가능 영역 (Boundary)', sym: 'Box', min: 0, max: 3, step: 1, dec: 0, unit: '', labels: ['5 × 5 mm', '5 × 15 mm', '10 × 30 mm', '직접 입력 (Custom)'], relayout: true, noAI: true }];
    if ((d.bp | 0) === 3) ps.push({ k: 'bw', label: '경계 폭 W (가로, x)', sym: 'W', min: 1, max: 40, step: 0.5, dec: 1, unit: 'mm', noAI: true }, { k: 'bh', label: '경계 높이 H (세로, y)', sym: 'H', min: 1, max: 40, step: 0.5, dec: 1, unit: 'mm', noAI: true });
    ps.push({ k: 'ec', label: '가장자리 여유 (Edge clearance)', sym: 'e', min: 0, max: 1000, step: 10, dec: 0, unit: 'µm', noAI: true },
      { k: 'port', label: '입출력 포트 위치', sym: 'Port', min: 0, max: 2, step: 1, dec: 0, unit: '', labels: ['짧은 변 (긴 축 방향 출사)', '동/서 변 (E–W)', '남/북 변 (S–N)'], noAI: true },
      { k: 'dm', label: '설계 모드', sym: 'Mode', min: 0, max: 1, step: 1, dec: 0, unit: '', labels: ['A · 목표 지연을 경계 안에', 'B · 경계 안 최대 사용 지연'], relayout: true, noAI: true },
      (d.dm | 0) === 1 ? { k: 'ilb', label: '허용 삽입 손실 (Mode B 예산)', sym: 'IL<sub>max</sub>', min: 1, max: 60, step: 0.5, dec: 1, unit: 'dB', noAI: true }
        : { k: 'tau', label: '목표 지연 (Target delay)', sym: 'τ', min: 0.2, max: 20, step: 0.1, dec: 1, unit: 'ns', noAI: true },
      { k: 'env', label: '점유 상한 f (경계 대비 Footprint)', sym: 'f', min: 0.02, max: 1, step: 0.01, dec: 2, unit: '' },
      byK.w, byK.gap,
      { k: 'rc', label: (d.lay | 0) === 2 ? '코너 최소 반경 R<sub>min</sub> (Euler 꼭짓점)' : '코너 반경 R (최소 굽힘 반경)', sym: 'R', min: si ? 2 : 20, max: si ? 500 : 2000, step: si ? 1 : 5, dec: 0, unit: 'µm' },
      { k: 'sb', label: '중앙 S-bend', sym: 'S', min: 0, max: 1, step: 1, dec: 0, unit: '', labels: ['원호 (반원 2개, 곡률 반전)', 'Euler U-turn 2개 (곡률 연속)'] },
      { ...byK.ws, label: 'S-bend 중앙 폭 (Euler에서 테이퍼)' },
      { k: 'tl', label: '입출력 테이퍼 길이 (Wm → w₀)', sym: 'L<sub>t</sub>', min: si ? 10 : 20, max: si ? 300 : 600, step: 5, dec: 0, unit: 'µm' });
    return ps;
  }
  const nsOf = (r, L) => L * 1e-4 * r.ng / C_CM_NS;
  const bbStr = (r) => `${f2(r.bboxMM[2] - r.bboxMM[0], 2)} × ${f2(r.bboxMM[3] - r.bboxMM[1], 2)}`;
  const drcRow = (r) => ({ k: '경계 안 배치 · DRC (간격·반경·클리어런스)', v: !r.drc.length ? '통과' : /^Infeasible/.test(r.drc[0]) ? 'Infeasible' : `${r.drc.length}건 위반`, ok: !r.drc.length });
  function goalsA(l, r) {
    return [drcRow(r), { k: `목표 지연 ${r.d.tau} ns`, v: r.drc.length ? '—' : `${f2(r.tauP, 3)} ns (${f2(r.Lcm, 2)} cm)`, ok: !r.drc.length && Math.abs(r.tauP - r.d.tau) < 0.005 * r.d.tau },
      { k: '예측 삽입 손실', v: r.drc.length ? '—' : `${f2(r.IL, 2)} dB`, na: true }, { k: '고차모드 변환 (S-bend + 코너)', v: r.drc.length ? '—' : `${f2(r.xtMode, 1)} dB`, na: true }];
  }
  function goalsB(l, r) {
    const d = r.d, ok = !r.drc.length;
    return [drcRow(r), { k: `최대 사용 지연 (IL ≤ ${d.ilb} dB)`, v: ok ? `${f2(r.tauP, 3)} ns · ${f2(r.Lcm, 1)} cm` : '—', ok },
      { k: '예측 삽입 손실', v: ok ? `${f2(r.IL, 2)} dB` : '—', ok: ok && r.IL <= d.ilb + 0.02 },
      { k: '제한 요인', v: !ok ? '—' : r.limit === 'loss' ? '손실 예산' : '경계 면적 (기하 한계)', na: true },
      { k: '면적이 허락하는 최대 지연 (손실 무시)', v: `${f2(nsOf(r, r.G.Lgeo), 2)} ns`, na: true },
      { k: '손실 예산이 허락하는 최대 지연 (면적 무시)', v: r.Lloss != null ? `${f2(nsOf(r, r.Lloss), 2)} ns` : '—', na: true }];
  }

  /* ---------- true-scale layout viewer (mm), zoom / pan / fit ---------- */
  const VIEW = { z: 1, vx: null, vy: null, key: '', bound: false, active: false, last: null, btn: [] };
  function viewerBind(cv) {
    if (cv._smqRect) return; cv._smqRect = true;
    let drag = null;
    const redraw = () => { if (VIEW.active && VIEW.last) VIEW.last(); };
    const toW = (e) => { const rc = cv.getBoundingClientRect(), px = (e.clientX - rc.left) * cv.width / rc.width, py = (e.clientY - rc.top) * cv.height / rc.height; return [px, py]; };
    const zoomAt = (f, px, py) => { const T = VIEW.T; if (!T) return; const wx = T.ix(px), wy = T.iy(py); VIEW.z = clamp(VIEW.z * f, 1, 4000); const T2 = VIEW.mk(); VIEW.vx += wx - T2.ix(px); VIEW.vy += wy - T2.iy(py); redraw(); };
    cv.addEventListener('wheel', (e) => { if (!VIEW.active || !(e.ctrlKey || e.metaKey || VIEW.z > 1)) return; e.preventDefault(); const [px, py] = toW(e); zoomAt(Math.pow(1.0015, -e.deltaY), px, py); }, { passive: false });
    cv.addEventListener('pointerdown', (e) => { if (!VIEW.active) return; const [px, py] = toW(e); drag = { px, py, vx: VIEW.vx, vy: VIEW.vy, moved: false }; });
    cv.addEventListener('pointermove', (e) => { if (!VIEW.active || !drag || VIEW.z <= 1) return; const [px, py] = toW(e), T = VIEW.T; if (Math.hypot(px - drag.px, py - drag.py) > 4) drag.moved = true; VIEW.vx = drag.vx - (px - drag.px) / T.s; VIEW.vy = drag.vy + (py - drag.py) / T.s; redraw(); });
    cv.addEventListener('pointerup', (e) => {
      if (!VIEW.active || !drag) return; const [px, py] = toW(e), wasDrag = drag.moved; drag = null; if (wasDrag) return;
      const b = VIEW.btn.find((q) => px >= q.x && px <= q.x + q.w && py >= q.y && py <= q.y + q.h); if (!b) return;
      if (b.id === 'in') zoomAt(2, VIEW.T.cx, VIEW.T.cy); else if (b.id === 'out') zoomAt(0.5, VIEW.T.cx, VIEW.T.cy); else { VIEW.z = 1; VIEW.vx = VIEW.vy = null; redraw(); }
    });
    cv.addEventListener('pointerleave', () => { drag = null; });
    cv.addEventListener('dblclick', (e) => { if (!VIEW.active) return; VIEW.z = 1; VIEW.vx = VIEW.vy = null; redraw(); });
    cv.addEventListener('keydown', (e) => {
      if (!VIEW.active || !VIEW.T) return; const T = VIEW.T, st = 40 / T.s;
      if (e.key === '+' || e.key === '=') zoomAt(2, T.cx, T.cy); else if (e.key === '-') zoomAt(0.5, T.cx, T.cy); else if (e.key === '0') { VIEW.z = 1; VIEW.vx = VIEW.vy = null; redraw(); }
      else if (e.key.startsWith('Arrow') && VIEW.z > 1) { VIEW.vx += e.key === 'ArrowLeft' ? -st : e.key === 'ArrowRight' ? st : 0; VIEW.vy += e.key === 'ArrowUp' ? st : e.key === 'ArrowDown' ? -st : 0; redraw(); } else return;
      e.preventDefault();
    });
  }
  function drawRect(cv, l, r, ui) {
    const ctx = cv.getContext('2d'), Wp = cv.width, Hp = cv.height, d = r.d, G = r.G, mL = 46 * DPR, mB = 24 * DPR, mT = 30 * DPR, mR = 12 * DPR;
    ctx.fillStyle = '#0b1220'; ctx.fillRect(0, 0, Wp, Hp);
    viewerBind(cv); VIEW.active = true; VIEW.last = () => drawRect(cv, l, r, ui); cv.tabIndex = 0; cv.style.touchAction = VIEW.z > 1 ? 'none' : 'pan-y'; cv.dataset.zoom = VIEW.z.toFixed(3);
    cv.setAttribute('aria-label', `직사각형 나선 레이아웃 ${d.bw}×${d.bh} mm (실측 비율). 버튼 또는 +/−/0 키로 확대·축소·맞춤, 확대 후 끌어서 이동`);
    const key = `${d.bw}|${d.bh}`; if (VIEW.key !== key) { VIEW.key = key; VIEW.z = 1; VIEW.vx = VIEW.vy = null; }
    const W = G.W, H = G.H, pw = Wp - mL - mR, ph = Hp - mT - mB, s0 = Math.min(pw / (W * 1.04), ph / (H * 1.04));
    if (VIEW.vx == null) { VIEW.vx = W / 2; VIEW.vy = H / 2; }
    VIEW.mk = () => { const s = s0 * VIEW.z, cx = mL + pw / 2, cy = mT + ph / 2; return { s, cx, cy, X: (x) => cx + (x - VIEW.vx) * s, Y: (y) => cy - (y - VIEW.vy) * s, ix: (px) => VIEW.vx + (px - cx) / s, iy: (py) => VIEW.vy - (py - cy) / s }; };
    const T = (VIEW.T = VIEW.mk()), X = T.X, Y = T.Y, chip = (x, y) => toChip(G, x, y);
    ctx.save(); ctx.beginPath(); ctx.rect(mL, mT, pw, ph); ctx.clip();
    // mm grid
    const stepMM = [0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10].find((v) => v * 1000 * T.s >= 64 * DPR) || 10, sg = stepMM * 1000;
    ctx.strokeStyle = 'rgba(120,150,190,0.10)'; ctx.lineWidth = 1;
    const x0w = T.ix(mL), x1w = T.ix(mL + pw), y0w = T.iy(mT + ph), y1w = T.iy(mT);
    for (let v = Math.floor(x0w / sg) * sg; v <= x1w; v += sg) { ctx.beginPath(); ctx.moveTo(X(v), mT); ctx.lineTo(X(v), mT + ph); ctx.stroke(); }
    for (let v = Math.floor(y0w / sg) * sg; v <= y1w; v += sg) { ctx.beginPath(); ctx.moveTo(mL, Y(v)); ctx.lineTo(mL + pw, Y(v)); ctx.stroke(); }
    // boundary and keep-out
    ctx.setLineDash([6 * DPR, 4 * DPR]); ctx.strokeStyle = 'rgba(100,201,223,0.9)'; ctx.lineWidth = 1.5 * DPR; ctx.strokeRect(X(0), Y(H), W * T.s, H * T.s);
    ctx.setLineDash([2 * DPR, 3 * DPR]); ctx.strokeStyle = 'rgba(100,201,223,0.45)'; ctx.lineWidth = 1 * DPR; ctx.strokeRect(X(d.ec), Y(H - d.ec), (W - 2 * d.ec) * T.s, (H - 2 * d.ec) * T.s); ctx.setLineDash([]);
    if (r.geo && r.geo.segs) {
      const segs = r.geo.segs, lw = Math.max(1, Math.min(6 * DPR, d.w * T.s)), visible = (pts) => pts.some(([x, y]) => { const px = X(x), py = Y(y); return px > mL - 50 && px < mL + pw + 50 && py > mT - 50 && py < mT + ph + 50; });
      const path = (pts, col, wd) => { ctx.strokeStyle = col; ctx.lineWidth = wd || lw; ctx.beginPath(); pts.forEach(([x, y], i) => { const [cxp, cyp] = chip(x, y); if (i) ctx.lineTo(X(cxp), Y(cyp)); else ctx.moveTo(X(cxp), Y(cyp)); }); ctx.stroke(); };
      [1, -1].forEach((sg2) => {
        segs.forEach((s) => {
          if (s.t === 'L') { const a = [sg2 * s.a[0], sg2 * s.a[1]], b = [sg2 * s.b[0], sg2 * s.b[1]]; path([a, b], s.port ? '#ff8d9c' : 'rgba(242,176,74,0.9)'); return; }
          const Lpx = (G.Lc0 + Math.PI / 2 * s.d) * T.s, n = clamp(Math.ceil(Lpx / (3 * DPR)), 2, G.euler ? 60 : 48);
          let pts = place(s, cornerLocal(G.euler, G.R, G.a0, s.d, n)); if (sg2 < 0) pts = pts.map(([x, y]) => [-x, -y]);
          if (!visible(pts.map(([x, y]) => chip(x, y)))) return;
          path(pts, '#64c9df');
        });
      });
      const sh = sHalf(G.sbE, r.Ht, 120).map((q) => [q[0], q[1]]), sOK = r.xtMode <= (l.s1 ? l.s1.xtm : -20) || r.sConv < 1e-3;
      path(sh, sOK ? '#5dd193' : '#ff6b6b', Math.max(lw, 1.6 * DPR)); path(sh.map(([x, y]) => [-x, -y]), sOK ? '#5dd193' : '#ff6b6b', Math.max(lw, 1.6 * DPR));
      // bounding box and ports
      const bb = r.bboxMM.map((v) => v * 1000); ctx.setLineDash([3 * DPR, 3 * DPR]); ctx.strokeStyle = 'rgba(231,236,243,0.55)'; ctx.lineWidth = 1 * DPR; ctx.strokeRect(X(bb[0]), Y(bb[3]), (bb[2] - bb[0]) * T.s, (bb[3] - bb[1]) * T.s); ctx.setLineDash([]);
      r.ports.forEach((q) => { const px = X(q.xy[0]), py = Y(q.xy[1]); ctx.fillStyle = '#ff8d9c'; ctx.beginPath(); ctx.arc(px, py, 4 * DPR, 0, 2 * Math.PI); ctx.fill(); cvPill(ctx, `${q.n} (${f2(q.xy[0] / 1000, 3)}, ${f2(q.xy[1] / 1000, 3)}) mm · ${Math.round(q.ang)}°`, clamp(px + 6 * DPR, mL, mL + pw - 150 * DPR), clamp(py - 10 * DPR, mT + 8 * DPR, mT + ph - 8 * DPR), 'left', '#ff8d9c'); });
    }
    ctx.restore();
    // axes (mm)
    ctx.fillStyle = 'rgba(158,171,189,0.95)'; ctx.font = `${9.5 * DPR}px "IBM Plex Mono", monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    const fmt = (v) => (stepMM >= 1 ? String(Math.round(v / 1000)) : (v / 1000).toFixed(stepMM >= 0.1 ? 1 : stepMM >= 0.01 ? 2 : 3));
    for (let v = Math.ceil(x0w / sg) * sg; v <= x1w; v += sg) ctx.fillText(fmt(v), X(v), mT + ph + 4 * DPR);
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; for (let v = Math.ceil(y0w / sg) * sg; v <= y1w; v += sg) ctx.fillText(fmt(v), mL - 4 * DPR, Y(v));
    ctx.textAlign = 'left'; ctx.fillText('x, y [mm]', 4 * DPR, Hp - 9 * DPR);
    // HUD and buttons
    const ok = !r.drc.length;
    cvPill(ctx, ok ? `τ ${f2(r.tauP, 3)} ns · L ${f2(r.Lcm, 2)} cm · ${r.N}회전/팔 · IL ${f2(r.IL, 2)} dB` : 'Infeasible / DRC — 아래 설명 참고', mL, 12 * DPR, 'left', ok ? '#f6c35a' : '#ff6b6b');
    if (ok) cvPill(ctx, `bbox ${bbStr(r)} mm · 경계 활용 ${f2(r.util * 100, 1)}% · 최소 R ${f2(r.minR, 1)} µm · gap ${d.gap} µm`, mL + 4 * DPR, mT + ph - 10 * DPR, 'left');
    VIEW.btn = []; const bw = 26 * DPR, bh = 20 * DPR; [['in', '+'], ['out', '−'], ['fit', 'Fit']].forEach(([id, t], i) => { const bx = Wp - mR - (3 - i) * (bw + 4 * DPR) - (id === 'fit' ? 8 * DPR : 0), by = 4 * DPR, ww = id === 'fit' ? bw + 8 * DPR : bw; VIEW.btn.push({ id, x: bx, y: by, w: ww, h: bh }); ctx.fillStyle = 'rgba(25,35,48,0.95)'; ctx.fillRect(bx, by, ww, bh); ctx.strokeStyle = 'rgba(51,68,89,1)'; ctx.strokeRect(bx, by, ww, bh); ctx.fillStyle = 'rgba(231,236,243,0.95)'; ctx.font = `${11 * DPR}px "IBM Plex Mono", monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(t, bx + ww / 2, by + bh / 2 + 0.5); });
    if (VIEW.z > 1) cvPill(ctx, `×${VIEW.z < 10 ? VIEW.z.toFixed(1) : Math.round(VIEW.z)} · 끌어서 이동`, Wp - mR, 34 * DPR, 'right');
    if (!ok) {   // explain why and what to change
      const lines = r.drc.concat(r.alts.map((a) => '→ ' + a)).map((s) => s.replace(/<[^>]+>/g, ''));
      ctx.fillStyle = 'rgba(40,8,12,0.9)'; const bx = mL + 8 * DPR, by = mT + 26 * DPR, ww = pw - 16 * DPR; let hh = 10 * DPR; const wrapped = [];
      ctx.font = `${10 * DPR}px "IBM Plex Sans KR", sans-serif`; lines.forEach((s) => { let cur = ''; for (const ch of s) { if (ctx.measureText(cur + ch).width > ww - 16 * DPR) { wrapped.push(cur); cur = ''; } cur += ch; } wrapped.push(cur); });
      hh += wrapped.length * 14 * DPR; ctx.fillRect(bx, by, ww, hh); ctx.strokeStyle = 'rgba(255,107,107,0.6)'; ctx.strokeRect(bx, by, ww, hh);
      ctx.fillStyle = '#ffb3bd'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; wrapped.forEach((s, i) => ctx.fillText(s, bx + 8 * DPR, by + 6 * DPR + i * 14 * DPR));
    }
  }
  /* ---------- chart: footprint ↔ loss (Mode A) or footprint ↔ maximum delay (Mode B) ---------- */
  function chartRect(l, r) {
    const d = r.d, modeB = (d.dm | 0) === 1, fs = [], A = [], B = [];
    for (let i = 0; i <= 24; i++) fs.push(+(0.04 + 0.96 * i / 24).toFixed(3));
    const seg = (arr) => { const out = []; let cur = []; arr.forEach((p) => { if (p) cur.push(p); else if (cur.length) { out.push(cur); cur = []; } }); if (cur.length) out.push(cur); return out; };
    fs.forEach((f) => { const q = rectEval(l, { ...d, env: f }); const ok = !q.drc.length; A.push(ok ? [f, modeB ? q.tauP : q.IL] : null); B.push(ok ? [f, q.area / 1e6] : null); });
    const ys = A.filter(Boolean).map((p) => p[1]), ymax = ys.length ? Math.max(...ys) * 1.15 : 1, top = modeB ? Math.max(ymax, 0.1) : Math.max(ymax, l.s1.il * 1.1);
    const yt = [0, +(top / 2).toPrecision(2), +top.toPrecision(2)];
    const extra = (X, Y) => B.filter((p, i) => p && i % 6 === 0).map((p, i) => { const a = A[fs.indexOf(p[0])]; return a ? `<text x="${X(p[0])}" y="${Y(a[1]) - 7}" text-anchor="middle" font-size="9.5" font-family="var(--mono)" fill="var(--fg-3)">${p[1] < 1 ? p[1].toFixed(2) : p[1].toFixed(1)} mm²</text>` : ''; }).join('');
    const html = svgChart({ x0: 0, x1: 1, y0: 0, y1: top, aria: modeB ? '점유 상한에 따른 최대 지연' : '점유 상한에 따른 삽입 손실', xticks: [0, 0.25, 0.5, 0.75, 1], yticks: yt, ylab: modeB ? 'ns' : 'dB', xlab: '점유 상한 f',
      vlines: [{ x: d.env, color: 'rgba(231,236,243,.7)' }], hlines: modeB ? [] : [{ y: l.s1.il, label: `★ ${fmtT(l.s1.il)} dB` }, { y: l.s2.il, label: `★★ ${fmtT(l.s2.il)} dB` }],
      series: seg(A).map((pts) => ({ pts, color: modeB ? 'var(--cyan)' : 'var(--amber)', width: 2.2 })), extra });
    return { html, legend: legendHTML([[modeB ? 'var(--cyan)' : 'var(--amber)', modeB ? `최대 사용 지연 (IL ≤ ${d.ilb} dB)` : `${d.tau} ns 지연선의 삽입 손실`], ['var(--fg-3)', '숫자 = 그 점의 bbox 면적 · 끊긴 구간 = Infeasible']]) };
  }
  /* ---------- coach for the boundary layout (moves are evaluated before they are suggested) ---------- */
  function coachRect(l, r, c) {
    const t = c.tier, d = r.d, tx = (b) => (!b ? '' : b.ps ? recText2(b, t) : recText(b, t, d));
    if (r.drc.length) {
      const q = (x) => (x.drc && x.drc.length ? 10 + x.drc.length : x.IL / 100);
      const b = lineBestOf(K, l, d, ['env', 'gap', 'rc', 'w'], q, 32) || pairBest(K, l, d, ['env', 'rc'], q, 12);
      return { h: r.drc[0].replace(/^Infeasible: /, 'Infeasible — '), b: (r.alts.length ? '가능한 대안: ' + r.alts.join(' · ') + '.' : '') + tx(b) };
    }
    if (c.practice) {
      if ((d.dm | 0) === 1) {
        const q = (x) => (x.drc && x.drc.length ? 1e3 : 1 / Math.max(x.tauP, 1e-6)), b = lineBestOf(K, l, d, r.limit === 'loss' ? ['w', 'rc', 'gap'] : ['gap', 'w', 'env', 'rc'], q, 24);
        return { h: r.limit === 'loss' ? `손실 예산이 지연을 제한합니다 (최대 ${f2(r.tauP, 2)} ns)` : `경계 면적이 지연을 제한합니다 (최대 ${f2(r.tauP, 2)} ns)`,
          b: (r.limit === 'loss' ? `같은 ${d.ilb} dB로 더 긴 지연을 얻으려면 dB/cm를 낮춰야 합니다 — 폭을 넓히면 측벽 산란(∝ ∂n<sub>eff</sub>/∂w)이 줄어듭니다. 지금 α ${f2(r.x.alpha, 3)} dB/cm.` : `피치 p = W<sub>m</sub> + W<sub>gap</sub> = ${f2(r.G.p, 2)} µm가 면적당 길이(≈ 면적/p)를 정합니다. 결합이 허락하는 만큼 간격을 줄이세요.`) + tx(b) };
      }
      return null;
    }
    const q1 = (x) => r1(l, x), q2s = (x) => keepStar(r1(l, x), Math.max(r2(l, x), x.size / l.s2.size)), P = r.parts;
    const pick = (q, ks) => lineBestOf(K, l, d, ks, q, 24) || pairBest(K, l, d, [ks[0], ks[1] || 'env'], q, 10);
    if (!c.ob1) {
      if (r.xtMode > l.s1.xtm) {
        const corner = r.cornerConv >= r.sConv, b = pick(q1, corner ? ['rc', 'w', 'sb'] : ['sb', 'ws', 'rc']);
        return { h: corner ? '코너 이음매에서 고차모드가 생깁니다' : '중앙 S-bend에서 고차모드가 생깁니다',
          b: (corner ? `직선과 원호가 만나는 곳마다 곡률이 0 → 1/R로 뛰어 굽은 모드와 곧은 모드의 위치가 어긋납니다(코너 ${r.nJ}개 이음매 합 ${f2(10 * Math.log10(Math.max(r.cornerConv, 1e-9)), 1)} dB). 반경을 키우거나, 곡률이 0에서 서서히 커지는 Euler 코너(레이아웃 방식 3번)를 쓰면 이음매 변환이 사라집니다.`
            : `반원 두 개가 만나는 중심에서 곡률이 +1/R → −1/R로 뒤집힙니다. 곡률이 0을 지나 연속으로 바뀌는 Euler U-turn S-bend가 해법입니다.`) + tx(b) };
      }
      if (r.xtGap > l.s1.xtg) { const b = pick(q1, ['gap', 'w']); return { h: '이웃 회전으로 빛이 건너갑니다', b: `결합 길이 L<sub>c</sub> = π/(2κ)가 전체 길이(${f2(r.Lcm, 1)} cm)보다 충분히 길어야 합니다. 간격을 넓히면 κ가 지수적으로 줄어듭니다.` + tx(b) }; }
      if (r.IL > l.s1.il) {
        const dom = [['sw', '측벽 산란이 손실 대부분입니다', '좁은 도파로는 측벽에 전계가 많이 걸립니다. 폭을 넓혀 모드를 코어 안으로 모으세요.', ['w', 'gap']],
          ['bend', '굽힘 방사 손실이 큽니다', '가장 안쪽 코너와 S-bend의 반경이 너무 작습니다. R을 키우거나 점유 상한 f를 키워 코어를 넓히세요.', ['rc', 'env', 'w']],
          ['sb', 'S-bend와 이음매 손실이 큽니다', 'S-bend의 좁은 구간 산란이나 모드 변환이 손실로 나갑니다.', ['sb', 'ws', 'rc']]].sort((a, b) => P[b[0]] - P[a[0]])[0];
        const b = pick(q1, dom[3]); if (b) return { h: dom[1], b: dom[2] + tx(b) };
      }
      return null;
    }
    if (!c.ob2) {
      // the footprint fraction needs a finer look than a 24-point grid: walk f down geometrically and keep the best that still holds ★
      const pe = PRECT(l, d).find((p) => p.k === 'env'), q0 = q2s(r);
      const envScan = (dd) => { let be = null; const qd = q2s(K.evaluate(l, dd)); for (let k = 1; k <= 30; k++) { const v = snapP(pe, dd.env * Math.pow(0.9, k)); if (v >= dd.env) continue; const qq = q2s(K.evaluate(l, { ...dd, env: v })); if (qq < (be ? be.q : qd) - 1e-9) be = { v, q: qq }; if (v <= pe.min) break; } return be; };
      const be = envScan(d), b = [be && be.q < q0 * 0.99 ? { ...be, q0, p: pe } : null, lineBestOf(K, l, d, ['sb', 'w', 'gap', 'rc', 'ws'], q2s, 24)].filter(Boolean).sort((x, y) => x.q - y.q)[0];
      // one-move lookahead: shrinking f makes the centre S-bend tight; with the curvature-continuous Euler U-turns it may hold ★ where the arc cannot
      const flip = { ...d, sb: 1 - (d.sb | 0) }, bf = envScan(flip);
      if (bf && bf.q < (b ? b.q : q0) - 0.02) { const ps = PRECT(l, d).find((p) => p.k === 'sb'); return { h: '★★: S-bend를 바꾸면 더 작게 감을 수 있습니다', b: `점유 상한 f를 줄이면 코어가 작아져 중앙 S-bend의 반경이 줄고, 원호 S-bend는 곡률 반전 변환이 ★ 기준을 넘습니다. ${(d.sb | 0) ? '원호' : '곡률이 0을 지나 연속으로 바뀌는 Euler U-turn'} S-bend로 바꾼 뒤 f를 줄이세요 (그다음 f ≈ ${bf.v.toFixed(2)}에서 ★★ 기준 대비 ${Math.round(bf.q * 100)}%).` + recText({ p: ps, v: flip.sb, q: q2s(K.evaluate(l, flip)), q0 }, t, d) }; }
      if (b) return { h: r.size > l.s2.size ? `★★: 점유 bbox ${f2(r.size / 1e6, 2)} mm² > ${f2(l.s2.size / 1e6, 2)} mm²` : '★★: 손실을 더 줄여야 합니다', b: (r.size > l.s2.size ? '경계 전체를 쓰면 반경이 커져 손실은 낮지만 칩 면적을 차지합니다. 점유 상한 f를 줄여 나선을 모으세요 — 대신 회전 수가 늘고 S-bend가 작아집니다.' : '폭, 반경, 간격, 점유 상한의 균형을 다듬으세요.') + tx(b) };
      if ((d.lay | 0) === 1) {   // arc corners: compare with the same design on Euler corners before giving up
        const alt = { ...d, lay: 2, sb: 1, rc: defaultR(l.pf, d.w) }, ba = envScan(alt), ra = ba ? K.evaluate(l, { ...alt, env: ba.v }) : null;
        if (ra) return { h: '★★: 원호 코너로는 더 작게 감기 어렵습니다', b: `넓은 멀티모드 도파로는 직선↔원호 이음매마다 곡률이 1/R로 뛰어 TE1이 생기므로, ★를 지키려면 R을 크게(지금 ${d.rc} µm) 둬야 하고 그만큼 코어가 커집니다. 같은 단면을 Euler 코너(레이아웃 방식 3번, R<sub>min</sub> ${alt.rc} µm, Euler S-bend)로 감으면 이음매 곡률이 연속이라 f ≈ ${ba.v.toFixed(2)}에서 ${f2(ra.IL, 2)} dB · ${f2(ra.size / 1e6, 2)} mm²${ba.q <= 1 ? '로 ★★ 기준을 만족합니다' : `까지 줄어듭니다 (★★ 기준 대비 ${Math.round(ba.q * 100)}%)`}.` };
      }
    }
    return null;
  }
  function exportRect(l, r) {
    const d = r.d, G = r.G, pf = l.pf, rd = (v) => +(+v).toFixed(5);
    if (!r.geo || !r.geo.segs) return null;
    return { pcell: 'spiral_rect', topology: (d.lay | 0) === 2 ? 'rect-euler' : 'rect-arc', corner: G.euler ? 'euler' : 'arc', R_um: d.rc, a0_um: rd(G.a0), corner_len0_um: rd(G.Lc0),
      w_um: d.w, gap_um: d.gap, pitch_um: rd(G.p), sbend: G.sbE ? 'euler-u' : 'arc', ws_um: G.sbE ? d.ws : d.w, Ht_um: rd(r.Ht), Rmin_sbend_um: rd(G.S(r.Ht).R),
      boundary: { W_um: G.W, H_um: G.H, clearance_um: d.ec, preset: ['5x5', '5x15', '10x30', 'custom'][d.bp | 0], port_edges: ['short', 'E-W', 'S-N'][d.port | 0], port_mode: G.pm },
      transform: { rot90: G.rot, offset_um: [G.W / 2, G.H / 2], note: 'chip = rot90 ? (W/2 − y, H/2 + x) : (W/2 + x, H/2 + y); arm B = −(arm A); path = reverse(B) + S-bend + A' },
      mode: (d.dm | 0) === 1 ? 'B' : 'A', tau_target_ns: (d.dm | 0) === 1 ? null : d.tau, il_budget_dB: (d.dm | 0) === 1 ? d.ilb : null, envelope: d.env,
      loops_per_arm: r.N, core_um: [rd(r.cx), rd(r.cy)], w_io_um: pf.w0, taper_len_um: d.tl,
      armA: r.geo.segs.map((s) => (s.t === 'L' ? { t: 'L', a: s.a.map(rd), b: s.b.map(rd), ...(s.port ? { port: true } : {}) } : { t: 'C', V: s.V.map(rd), h_deg: rd(s.h * 180 / Math.PI), turn: s.turn, d: rd(s.d) })),
      length_um: rd(r.Lum), tau_ns: rd(r.tauP), ng_model: rd(r.ng), neff_model: rd(r.x.neff),
      ports_um: r.ports.map((q) => ({ name: q.n, xy: q.xy.map(rd), angle_deg: q.ang })), bbox_um: r.bboxMM.map((v) => rd(v * 1000)),
      model: { neff: rd(r.x.neff), ng: rd(r.ng), dneff_dw_per_um: rd(r.x.dndw), alpha_sw_dBcm: rd(r.x.asw), alpha_surf_dBcm: rd(r.x.as), alpha_mat_dBcm: rd(r.x.am), multimode: r.x.multi,
        corner_junctions: r.nJ, corner_conv_power: +r.cornerConv.toPrecision(4), sbend_conv_power: +r.sConv.toPrecision(4),
        corner_bend_dB_cm: +bendDBcm(r.x, d.rc).toPrecision(4), sbend_apex_dB_cm: +bendDBcm(G.sbE ? xs(l.pf, 0.5 * (d.w + d.ws)) : r.x, G.S(r.Ht).R).toPrecision(4), approximation: 'junction conversion: Gaussian-shift a = convA/2 per curvature jump, summed incoherently (engineering estimate)' },
      predicted: { alpha_dBcm: rd(r.x.alpha), IL_dB: rd(r.IL), parts_dB: Object.fromEntries(Object.entries(r.parts).map(([k, v]) => [k, rd(v)])), xtMode_dB: rd(r.xtMode), xtGap_dB: rd(r.xtGap), bbox_area_um2: Math.round(r.area), boundary_util: rd(r.util) } };
  }

  /* ---------- the kind: legacy circular spiral (lay 0) or boundary-aware rectangular spiral (lay 1/2) ---------- */
  const K = {
    ...LEG,
    params: (l, d) => (!d ? PR(l) : [PLAY].concat(isRect(d) ? PRECT(l, d) : PR(l))),   // calibrate.js calls params(l): legacy set only
    fill(l, d) { if (d.lay == null) d.lay = 0; if (isRect(d)) rectDefaults(l, d); },
    onParam(l, d, k) { if (k === 'lay') K.fill(l, d); if (k === 'bp' && (d.bp | 0) < 3) { d.bw = PRESET[d.bp | 0][0]; d.bh = PRESET[d.bp | 0][1]; } },
    practice(l, d) {
      if (!isRect(d)) return null;
      if ((d.dm | 0) === 1) return { title: 'Mode B · 최대 사용 지연 탐색', note: `Mode B는 경계 안에서 손실 예산 ${d.ilb} dB가 허락하는 가장 긴 지연을 찾는 탐색입니다. 별·카드·AI·Tape-out은 Mode A(목표 ${l.tau} ns)에서 겨룹니다.`, goals: goalsB };
      if (Math.abs(d.tau - l.tau) > 1e-9) return { title: `목표 지연 ${d.tau} ns 탐색`, note: `이 레벨의 별 기준은 ${l.tau} ns 지연선입니다. 다른 지연은 탐색만 하고, τ = ${l.tau} ns로 돌아오면 별·카드·AI·Tape-out이 다시 켜집니다.`, goals: goalsA };
      return null;
    },
    landKeys: (l, d) => (isRect(d) ? ['w', 'gap', 'rc', 'env'] : ['w', 'gap', 'rin']),
    evaluate(l, d, proc) {
      if (!isRect(d)) return LEG.evaluate(l, d, proc);
      const r = rectEval(l, d, proc); return { d: { ...d }, ...r, size: r.area, drc: r.drc, primary: r.IL, secondary: r.Lcm };
    },
    objectives(l, r) {
      if (!r.rect) return LEG.objectives(l, r);
      return {
        t1: [drcRow(r), { k: `${l.tau} ns 지연 삽입 손실 ≤ ${fmtT(l.s1.il)} dB`, v: r.drc.length ? '—' : f2(r.IL, 2) + ' dB', ok: !r.drc.length && r.IL <= l.s1.il },
          { k: `고차모드 변환 (S-bend + 코너 이음매) ≤ ${l.s1.xtm} dB`, v: f2(r.xtMode, 1) + ' dB', ok: r.xtMode <= l.s1.xtm },
          { k: `이웃 회전 결합 ≤ ${l.s1.xtg} dB`, v: r.xtGap < -99 ? '< −99 dB' : f2(r.xtGap, 1) + ' dB', ok: r.xtGap <= l.s1.xtg }],
        t2: [{ k: `삽입 손실 ≤ ${fmtT(l.s2.il)} dB`, v: f2(r.IL, 2) + ' dB', ok: !r.drc.length && r.IL <= l.s2.il }]
      };
    },
    fabPass: (l, r) => !(r.drc && r.drc.length) && LEG.fabPass(l, r),
    meta(l, r) {
      if (!r.rect) return LEG.meta(l, r);
      const d = r.d, G = r.G;
      return `${l.pf.short} · ${LAYL[d.lay | 0]} · 경계 ${d.bw} × ${d.bh} mm (여유 ${d.ec} µm, 포트 ${['짧은 변', 'E–W', 'S–N'][d.port | 0]} → ${G.pm === 'short' ? '직선 출사' : '90° 코너 후 출사'})`
        + `<br>${r.drc.length ? '<b style="color:var(--fail)">Infeasible</b>' : `지연 <b>${f2(r.tauP, 3)} ns</b> = ${f2(r.Lcm, 2)} cm (n<sub>g</sub> ${f2(r.ng, 3)}) · ${r.N}회전/팔 · 코너 R ${d.rc} µm (a₀ ${f2(G.a0, 1)} µm) · S-bend R<sub>min</sub> ${f2(G.S(r.Ht).R, 1)} µm`} · 기하 기반 손실`;
    },
    tiles(l, r) {
      if (!r.rect) return LEG.tiles(l, r);
      if (r.drc.length) return [['상태', '<span style="color:var(--fail)">Infeasible</span>'], ['영역 최대 지연', `${f2(nsOf(r, r.G.Lgeo), 2)}<small>ns</small>`], ['피치 p', `${f2(r.G.p, 2)}<small>µm</small>`], ['코너 a₀', `${f2(r.G.a0, 1)}<small>µm</small>`]];
      return [['삽입 손실', `${f2(r.IL, 2)}<small>dB</small>`], ['지연 τ', `${f2(r.tauP, 3)}<small>ns</small>`], ['bbox', `${bbStr(r)}<small>mm</small>`], ['모드 변환 · 이웃 결합', `${Math.round(r.xtMode)}<small>dB</small> · ${r.xtGap < -99 ? '<−99' : Math.round(r.xtGap)}<small>dB</small>`]];
    },
    hint(l, r) {
      if (!r.rect) return LEG.hint(l, r);
      if (r.drc.length) return `경계 면적 ÷ 피치 ≈ 담을 수 있는 길이: ${f2(r.G.W * r.G.H / r.G.p / 1e4, 0)} cm (빈틈 없는 이상적 상한) · 지금 점유 상한에서의 실제 최대 ${f2(r.G.Lgeo / 1e4, 1)} cm`;
      const P = r.parts;
      return `τ = n<sub>g</sub>·L/c: ${f2(r.ng, 3)} × ${f2(r.Lcm, 3)} cm / c = <b>${f2(r.tauP, 3)} ns</b> · 직선 ${f2(r.Lline / 1e4, 2)} + 코너 ${f2(r.Lcorn / 1e4, 2)} + S-bend ${f2(r.LS / 1e4, 3)} cm`
        + `<br>손실 분해: 측벽 ${f2(P.sw, 2)} · 상하면 ${f2(P.surf, 2)} · 재료 ${f2(P.mat, 2)} · 굽힘 방사 ${f2(P.bend, 2)} · S-bend+이음매 ${f2(P.sb, 2)} · 테이퍼 ${f2(P.taper, 2)} dB`
        + `<br>고차모드: 코너 이음매 ${r.nJ}개 ${r.nJ ? f2(10 * Math.log10(Math.max(r.cornerConv, 1e-9)), 1) + ' dB' : '(Euler: 곡률 연속 → 0)'} · S-bend ${f2(10 * Math.log10(Math.max(r.sConv, 1e-9)), 1)} dB · 경계 활용 ${f2(r.util * 100, 1)}%, bbox 채움 ${f2(r.fill * 100, 1)}%`;
    },
    draw(cv, l, r, ui) { if (!r.rect) { VIEW.active = false; cv.style.touchAction = ''; cv.removeAttribute('tabindex'); return LEG.draw(cv, l, r, ui); } drawRect(cv, l, r, ui); },
    chartTitle: (l, r) => (!r || !r.rect ? LEG.chartTitle(l) : (r.d.dm | 0) === 1 ? `점유 상한에 따른 최대 사용 지연 (IL ≤ ${r.d.ilb} dB) — 경계 ${r.d.bw} × ${r.d.bh} mm` : `점유 상한 f에 따른 ${r.d.tau} ns 지연선의 손실 — 넓게 쓸수록 반경↑ 손실↓, 대신 면적↑`),
    chart: (l, r) => (r.rect ? chartRect(l, r) : LEG.chart(l, r)),
    coach: (l, r, c) => (r.rect ? coachRect(l, r, c) : LEG.coach(l, r, c)),
    exportGeom: (l, r) => (r.rect ? exportRect(l, r) : LEG.exportGeom(l, r)),
    card(l, r) {
      if (!r.rect) return LEG.card(l, r);
      return { kind: 'spiral', lines: [`${f2(r.x.alpha, 3)} dB/cm · W ${f2(r.d.w, 2)} µm`, `${l.tau} ns: ${f2(r.IL, 2)} dB · ${bbStr(r)} mm`], model: { alpha: +r.x.alpha.toFixed(4), ng: +r.ng.toFixed(3), IL: +r.IL.toFixed(3), area: Math.round(r.area), layout: (r.d.lay | 0) === 2 ? 'rect-euler' : 'rect-arc' } };
    },
    _x: { ...LEG._x, rectEval, rectGeom, armA, cornerLocal, sHalf, place, toChip, EU90, EU180_D, EU180_B, PRESET }
  };
  return K;
})();
