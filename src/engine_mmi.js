// ===== PhotonQuest physics engine =====
// 2D effective-index (SOI strip, TE) + eigenmode expansion of the MMI section.
// x: lateral (µm), z: propagation (µm), λ in µm.
const PQ = (() => {
  const nSi = (l) => {
    const l1 = 1.1071, l2 = l * l;
    return Math.sqrt(11.6858 + 0.939816 / l2 + 0.00810461 * l1 * l1 / (l2 - l1 * l1));
  };
  const nOx = (l) => {
    const l2 = l * l;
    return Math.sqrt(1 + 0.6961663 * l2 / (l2 - 0.0684043 ** 2) + 0.4079426 * l2 / (l2 - 0.1162414 ** 2) + 0.8974794 * l2 / (l2 - 9.896161 ** 2));
  };
  // symmetric slab TE0 effective index (Si core thickness t µm, oxide both sides)
  const nSiN = (l) => { const l2 = l * l; return Math.sqrt(1 + 3.0249 * l2 / (l2 - 0.1353406 ** 2) + 40314 * l2 / (l2 - 1239.842 ** 2)); };
  // active platform: core material, nominal thickness, DRC rules, grid
  const PF = { nCore: nSi, t: 0.22, rules: { gap: 0.18, wmin: 0.40, edge: 0.05 } };
  let DX = 0.02, MARGIN = 1.3;
  function setPlatform(mat, t, rules) { PF.nCore = mat === 'sin' ? nSiN : nSi; PF.t = t; PF.rules = rules; DX = mat === 'sin' ? 0.04 : 0.02; MARGIN = mat === 'sin' ? 2.2 : 1.3; }
  function slabNeff(l, t) {
    const n1 = PF.nCore(l), n0 = nOx(l), k0 = 2 * Math.PI / l;
    let lo = n0 + 1e-9, hi = n1 - 1e-9;
    for (let i = 0; i < 80; i++) {
      const m = 0.5 * (lo + hi);
      const ka = k0 * Math.sqrt(n1 * n1 - m * m), ga = k0 * Math.sqrt(m * m - n0 * n0);
      const ph = ka * t / 2;
      const f = ph >= Math.PI / 2 ? 1e9 : ka * Math.tan(ph) - ga;
      if (f > 0) lo = m; else hi = m;   // f decreases as neff increases
    }
    return 0.5 * (lo + hi);
  }


  function makeGrid(W) {
    const X = W + 2 * MARGIN;
    const n = Math.ceil(X / DX);
    const x = new Float64Array(n);
    for (let i = 0; i < n; i++) x[i] = -X / 2 + (i + 0.5) * DX;
    return { x, n };
  }
  // ε profile with sub-cell averaging; cores = [[a,b],...]
  function profile(grid, cores, n1sq, n0sq) {
    const { x, n } = grid, e = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const c0 = x[i] - DX / 2, c1 = x[i] + DX / 2;
      let f = 0;
      for (const [a, b] of cores) f += Math.max(0, Math.min(c1, b) - Math.max(c0, a));
      f = Math.min(1, f / DX);
      e[i] = n0sq + f * (n1sq - n0sq);
    }
    return e;
  }
  // largest eigenpairs of tridiag: diag d_i = k0²ε_i − 2/dx², off = 1/dx²
  function modes(eps, k0, cutoffEps, maxModes) {
    const n = eps.length, b = 1 / (DX * DX), b2 = b * b;
    const d = new Float64Array(n);
    let dmax = -Infinity;
    for (let i = 0; i < n; i++) { d[i] = k0 * k0 * eps[i] - 2 * b; if (d[i] > dmax) dmax = d[i]; }
    const cntGreater = (s) => {
      let neg = 0, q = d[0] - s;
      if (q < 0) neg++;
      for (let i = 1; i < n; i++) {
        q = (d[i] - s) - b2 / (q === 0 ? 1e-300 : q);
        if (q < 0) neg++;
      }
      return n - neg;
    };
    const lo0 = k0 * k0 * cutoffEps;
    const M = Math.min(maxModes, cntGreater(lo0));
    const vals = [], vecs = [];
    let hiPrev = dmax + 2 * b;
    for (let k = 1; k <= M; k++) {
      let lo = lo0, hi = hiPrev;
      for (let it = 0; it < 64; it++) {
        const mid = 0.5 * (lo + hi);
        if (cntGreater(mid) >= k) lo = mid; else hi = mid;
        if (hi - lo < 1e-12 * Math.abs(mid)) break;
      }
      const lam = 0.5 * (lo + hi);
      hiPrev = lam;
      vals.push(lam);
      vecs.push(invIter(d, b, lam, n));
    }
    return { b2: vals, v: vecs };
  }
  function invIter(d, b, lam, n) {
    const mu = lam + 1e-10 * Math.abs(lam);
    let y = new Float64Array(n);
    for (let i = 0; i < n; i++) y[i] = 1 + 0.37 * Math.sin(0.731 * i);
    const cp = new Float64Array(n), dp = new Float64Array(n);
    for (let it = 0; it < 3; it++) {
      // Thomas
      let den = d[0] - mu; if (den === 0) den = 1e-300;
      cp[0] = b / den; dp[0] = y[0] / den;
      for (let i = 1; i < n; i++) {
        den = (d[i] - mu) - b * cp[i - 1]; if (den === 0) den = 1e-300;
        cp[i] = b / den; dp[i] = (y[i] - b * dp[i - 1]) / den;
      }
      const z = new Float64Array(n);
      z[n - 1] = dp[n - 1];
      for (let i = n - 2; i >= 0; i--) z[i] = dp[i] - cp[i] * z[i + 1];
      let s = 0; for (let i = 0; i < n; i++) s += z[i] * z[i];
      s = 1 / Math.sqrt(s * DX);
      for (let i = 0; i < n; i++) z[i] *= s;
      y = z;
    }
    return y;
  }
  const dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s * DX; };

  // design: {type:'1x2'|'2x2', W, L, wt, s}; proc: {dw, dt} in µm
  function solve(des, lam, proc) {
    const dw = proc ? proc.dw : 0, dt = proc ? proc.dt : 0;
    const k0 = 2 * Math.PI / lam;
    const n1 = slabNeff(lam, PF.t + dt), n0 = nOx(lam);
    const n1sq = n1 * n1, n0sq = n0 * n0;
    const W = des.W + dw, wt = des.wt + dw, s = des.s;
    const grid = makeGrid(des.W + 0.1);
    const mmi = modes(profile(grid, [[-W / 2, W / 2]], n1sq, n0sq), k0, n0sq, 60);
    const port = (x0) => {
      const m = modes(profile(grid, [[x0 - wt / 2, x0 + wt / 2]], n1sq, n0sq), k0, n0sq, 1);
      return m.v[0];
    };
    const inX = des.type === '1x2' ? 0 : -s / 2;
    const Ein = port(inX);
    const outs = [port(-s / 2), port(s / 2)];
    const beta = mmi.b2.map(Math.sqrt);
    const c = mmi.v.map((v) => dot(v, Ein));
    const o = outs.map((E) => mmi.v.map((v) => dot(v, E)));
    const amp = o.map((ok) => {
      let re = 0, im = 0;
      for (let m = 0; m < beta.length; m++) {
        const ph = -(beta[m] - beta[0]) * des.L;
        const a = c[m] * ok[m];
        re += a * Math.cos(ph); im += a * Math.sin(ph);
      }
      return [re, im];
    });
    const P = amp.map(([r, i]) => r * r + i * i);
    return { P, amp, grid, mmi, beta, c, o, Ein, outs, n1, n0, port, nModes: beta.length };
  }
  // intensity map |E(x,z)|², nz samples along [0,L]
  function fieldMap(sol, L, nz) {
    const { grid, mmi, beta, c } = sol, n = grid.n, M = beta.length;
    const I = new Float32Array(n * nz);
    const re = new Float64Array(n), im = new Float64Array(n);
    for (let j = 0; j < nz; j++) {
      const z = L * j / (nz - 1);
      re.fill(0); im.fill(0);
      for (let m = 0; m < M; m++) {
        const ph = -(beta[m] - beta[0]) * z, cr = c[m] * Math.cos(ph), ci = c[m] * Math.sin(ph);
        const v = mmi.v[m];
        for (let i = 0; i < n; i++) { re[i] += cr * v[i]; im[i] += ci * v[i]; }
      }
      for (let i = 0; i < n; i++) I[j * n + i] = re[i] * re[i] + im[i] * im[i];
    }
    return I;
  }
  const dB = (p) => 10 * Math.log10(Math.max(p, 1e-12));
  // metrics over a list of wavelengths
  function metrics(des, lams, proc) {
    let worstEL = -Infinity, worstImb = 0, sumEL = 0;
    const rows = [];
    for (const l of lams) {
      const r = solve(des, l, proc);
      const el = Math.max(0, -dB(r.P[0] + r.P[1]));
      const imb = dB(r.P[0]) - dB(r.P[1]);
      worstEL = Math.max(worstEL, el);
      if (Math.abs(imb) > Math.abs(worstImb)) worstImb = imb;
      sumEL += el;
      rows.push({ l, P: r.P, el, imb, sol: r });
    }
    return { worstEL, worstImb, meanEL: sumEL / lams.length, rows };
  }
  // P(L) from cached solutions — only phases change with L
  function powersAt(sol, L, cArr, oArr) {
    const c = cArr || sol.c, o = oArr || sol.o, b = sol.beta, P = [0, 0];
    for (let k = 0; k < 2; k++) {
      let re = 0, im = 0;
      for (let m = 0; m < b.length; m++) { const ph = -(b[m] - b[0]) * L, a = c[m] * o[k][m]; re += a * Math.cos(ph); im += a * Math.sin(ph); }
      P[k] = re * re + im * im;
    }
    return P;
  }
  const worst = (Ps) => { let el = -Infinity, imb = 0; for (const P of Ps) { const e = -dB(P[0] + P[1]), i = dB(P[0]) - dB(P[1]); if (e > el) el = e; if (Math.abs(i) > Math.abs(imb)) imb = i; } return { el, imb }; };
  // sweep L using cached per-λ solutions (rows from metrics)
  function landscapeL(rows, Ls) {
    return Ls.map((L) => worst(rows.map((r) => powersAt(r.sol, L))));
  }
  // sweep port pitch s: MMI modes reused, ports re-solved
  function landscapeS(des, rows, Ss) {
    return Ss.map((s) => worst(rows.map((r) => {
      const sol = r.sol, v = sol.mmi.v;
      const Ein = des.type === '1x2' ? sol.Ein : sol.port(-s / 2);
      const outs = [sol.port(-s / 2), sol.port(s / 2)];
      const c = des.type === '1x2' ? sol.c : v.map((x) => dot(x, Ein));
      const o = outs.map((E) => v.map((x) => dot(x, E)));
      return powersAt(sol, des.L, c, o);
    })));
  }
  function drc(des) {
    const v = [];
    const e = 1e-6;
    const r = PF.rules;
    if (des.s - des.wt < r.gap - e) v.push(`포트 간격 < ${r.gap.toFixed(2)} µm`);
    if (des.s / 2 + des.wt / 2 > des.W / 2 - r.edge + e) v.push('포트가 MMI 경계를 벗어남');
    if (des.wt < r.wmin - e) v.push(`테이퍼 폭 < ${r.wmin.toFixed(2)} µm`);
    return v;
  }
  return { nSi, nSiN, nOx, slabNeff, solve, fieldMap, metrics, drc, dB, get DX() { return DX; }, landscapeL, landscapeS, setPlatform, PF };
})();
if (typeof module !== 'undefined') module.exports = PQ;
