// Stage 2 (Active) level specs, derived from the same kinds the game runs.
// Called from calibrate.js per platform: fills S['2-1'] .. S['2-5'].
module.exports = function (G, pf, S, H) {
  const { KINDS, snapP, clamp, nelderMead, makeWafer } = G, { r2, scaleLev, yieldOf } = H, si = pf.mat === 'si';
  const LV = Object.fromEntries(G.LEVELS.map((l) => [l.id, l]));
  const L = (id, extra) => ({ ...LV[id], pf, ...extra });
  const stored = (l, keys) => Object.fromEntries(keys.filter((k) => l[k] !== undefined).map((k) => [k, l[k]]));
  let MODE = 'std';
  G.GAME_LEV = (id) => scaleLev({ ...LV[id], ...S[id], pf }, MODE);
  const yT = (K, l, d) => { const out = {}; for (const m of ['easy', 'std', 'hard']) { MODE = m; const lm = scaleLev(l, m), dm = (opt(K, lm, (r) => Math.max(K.q1(lm, r), K.q2(lm, r), K.noSize ? 0 : r.size / lm.s2.size), [d], 120) || { d }).d, y = yieldOf(K, lm, dm, H.MODES[m].sig); out[m] = r2(clamp(Math.floor(Math.min(y - 0.12, y * 0.75) * 20) / 20, 0.05, 0.95), 2); } MODE = 'std'; return out; };
  function opt(K, l, obj, starts, maxE) {
    const ps = K.params(l); let best = null;
    for (const s0 of starts) {
      const toDes = (u) => { const d = { ...s0 }; ps.forEach((p, i) => { d[p.k] = snapP(p, p.min + (p.max - p.min) * clamp(u[i], 0, 1)); }); return d; };
      const f = (u) => { const d = toDes(u), r = K.evaluate(l, d), v = obj(r, d); if (!best || v < best.v) best = { v, d, r }; return v; };
      const g = nelderMead(f, ps.map((p) => (s0[p.k] - p.min) / (p.max - p.min)), 0.08, maxE || 220); while (!g.next().done);
    }
    return best;
  }
  // make sure the hardest mode can still reach ★+★★ (relax thresholds 5% at a time otherwise)
  function tune(K, l, starts, tag) {
    for (let it = 0; it < 14; it++) {
      const lh = scaleLev(l, 'hard'), b = opt(K, lh, (r) => Math.max(K.q1(lh, r), K.q2(lh, r), K.noSize ? 0 : r.size / lh.s2.size), starts, 200);
      if (b.v <= 0.97) { console.log(`  ${tag} hard-mode best q ${r2(b.v)} after ${it} relax`); tidy(l); return b; }
      const hb = l.hb || [], ns = l.ns || [];
      for (const t of ['s1', 's2']) for (const k of Object.keys(l[t])) { if (ns.includes(k)) continue; const v = l[t][k]; l[t][k] = hb.includes(k) ? v / 1.05 : v * 1.05; }
      for (const k of Object.keys(l.fab)) { if (k === 'y' || k === 'yMode' || ns.includes(k)) continue; l.fab[k] = (l.hb || []).includes(k) ? l.fab[k] / 1.05 : l.fab[k] * 1.05; }
    }
    console.log(`  ${tag} WARNING: hard mode still infeasible`); tidy(l); return null;
  }
  // round thresholds to 3 significant digits (sizes to 50) so the UI shows clean numbers
  function tidy(l) { for (const t of ['s1', 's2', 'fab']) for (const k of Object.keys(l[t] || {})) { const v = l[t][k]; if (typeof v !== 'number' || k === 'y') continue; l[t][k] = k === 'size' ? (v > 200 ? Math.ceil(v / 50) * 50 : Math.ceil(v)) : +v.toPrecision(3); } }
  const rnd = G.mulberry(4242);

  /* 2-1 TO phase shifter */
  {
    const K = KINDS.to, X = K._x, lim = X.lim(pf), l = L('2-1', { s1: { ppi: 1e9, metal: 0.02 }, s2: { ppi: 1e9, tau: 1e9, xt: 0.03, size: 1e9 }, fab: { pmax: 1e9 }, ns: ['ppi', 'xt'] });
    const P = K.params(l), hs = []; for (let h = 0.4; h <= 3.0001; h += 0.05) hs.push(+h.toFixed(2));
    const win = (h, iso) => {
      const c = X.core(l, { h, iso, L: 100, pitch: 20 }), lo = Math.max(P[2].min, Math.ceil(c.dTh2pi * 100 / lim.TMAX)), hi = Math.min(P[2].max, Math.floor(100 * Math.pow(lim.VMAX / c.V2pi, 2)));
      return { h, iso, Ppi: c.Ppi, tau: c.tau, lo, hi, ok: lo <= hi && c.metal / 100 * lo <= l.s1.metal };
    };
    const rows = []; for (const iso of [0, 1, 2]) for (const h of hs) rows.push(win(h, iso));
    const minP = (iso) => Math.min(...rows.filter((r) => r.iso === iso && r.ok).map((r) => r.Ppi));
    const p0 = minP(0), p1 = minP(1), p2 = minP(2);
    l.s1.ppi = Math.ceil((isFinite(p0) ? p0 * 1.2 : p1 * 1.3) * (si ? 1 : 0.2)) / (si ? 1 : 0.2);
    l.s2.ppi = r2(Math.min(p1 * 1.15, isFinite(p0) ? (p0 + p1) / 2 : 1e9), 1);
    const t1 = Math.max(...rows.filter((r) => r.iso === 1 && r.ok && r.Ppi <= l.s2.ppi).map((r) => r.tau)), t2 = Math.min(...rows.filter((r) => r.iso === 2 && r.ok).map((r) => r.tau));
    l.s2.tau = Math.round(Math.sqrt(t1 * t2));
    // most compact ★★ design (L at the bottom of its window, pitch at the crosstalk limit)
    let best = null;
    for (const r of rows.filter((x) => x.iso === 1 && x.ok && x.Ppi <= l.s2.ppi)) {
      let pm = null; for (let p = P[3].min; p <= P[3].max; p += P[3].step) { if (X.core(l, { h: r.h, iso: 1, L: r.lo, pitch: p }).xt <= l.s2.xt * 0.9) { pm = p; break; } }
      if (pm != null && (!best || r.lo * pm < best.a)) best = { a: r.lo * pm, d: { h: r.h, iso: 1, L: r.lo, pitch: pm }, w: r };
    }
    l.s2.size = Math.ceil(best.a * 1.5 / 50) * 50;
    const ref = { h: best.d.h, iso: 1, L: snapP(P[2], Math.min(best.w.hi, Math.max(best.w.lo + 5, Math.floor(l.s2.size / best.d.pitch * 0.85)))), pitch: best.d.pitch };
    // trimming budget: per-die heater power needed to recover the 1-7 demux with the reference heater
    const rr = X.core(l, ref), sums = [];
    for (const s of [11, 22, 33]) for (const die of makeWafer(s * 97, 1)) { const proc = { ...die, dt: die.dt * pf.dt / 0.006 }, t = X.trimDie({ ...l, fab: { pmax: 1e9 } }, ref, proc, rr); if (t && t.pass) sums.push(t.power / rr.Ppi); }
    sums.sort((a, b) => a - b);
    const q = sums[Math.floor(sums.length * 0.8)] || 1;
    l.fab.pmax = Math.ceil(q * rr.Ppi * 1.05);
    tune(K, l, [ref, { ...ref, h: 1.2 }], '2-1');
    const yMode = yT(K, l, ref);
    l.fab = { ...l.fab, y: yMode.std, yMode };
    S['2-1'] = { start: { h: si ? 0.6 : 0.8, iso: 0, L: si ? 30 : 200, pitch: 8 }, aRef: l.s2.size, dbY: [0, si ? 30 : 200], ...stored(l, ['s1', 's2', 'fab', 'ns']), ref };
    console.log(' 2-1 Ppi iso0/1/2', r2(p0, 1), r2(p1, 1), r2(p2, 1), 's1', JSON.stringify(l.s1), 's2', JSON.stringify(l.s2), 'ref', JSON.stringify(ref), 'trim πsum q80', r2(q), 'pmax', l.fab.pmax, 'trimmable', sums.length, 'y', JSON.stringify(yMode));
  }
  /* 2-2 PN depletion phase shifter (Si active layer on every platform) */
  {
    const K = KINDS.pn, A = K._x.analyse, l = L('2-2', { s1: {}, s2: {}, fab: {}, hb: ['frc'], ns: ['vpil', 'frc'] }), P = K.params(l);
    const pool = []; for (let i = 0; i < 3000; i++) { const d = Object.fromEntries(P.map((p) => [p.k, snapP(p, p.min + (p.max - p.min) * rnd())])); pool.push({ d, a: A(l, d) }); }
    const mf = pool.slice().sort((x, y) => x.a.FOM - y.a.FOM)[0];
    const vpil = Math.floor(mf.a.VpiL * 0.8 * 20) / 20;
    const okV = pool.filter((p) => p.a.VpiL <= vpil);
    const loss1 = Math.ceil(Math.min(...okV.map((p) => p.a.loss)) * 1.8 * 20) / 20;
    const fmax = Math.max(...okV.map((p) => p.a.fRC)), frc = Math.round(fmax * 0.4 / 5) * 5;
    const seed = okV.filter((p) => p.a.fRC >= frc).sort((x, y) => x.a.FOM - y.a.FOM).slice(0, 3).map((p) => p.d);
    const b = opt(K, l, (r) => r.FOM + 50 * Math.max(0, frc / r.fRC - 1) + 50 * Math.max(0, r.VpiL / vpil - 1), seed, 200);
    l.s1 = { vpil, loss: loss1 }; l.s2 = { fom: r2(b.r.FOM * 1.25, 2), frc }; l.fab = { fom: r2(b.r.FOM * 1.3, 2), frc: Math.round(frc * 0.92) };
    const start = { na: 17.3, nd: 17.3, xj: 0, vb: 0.5, dc: 1.2 };
    tune(K, l, [b.d, start], '2-2');
    // robust reference for the yield target: the ★★ design with most margin
    const rb = opt(K, l, (r) => Math.max(K.q1(l, r), K.q2(l, r)), [b.d], 160);
    const yMode = yT(K, l, rb.d); l.fab.y = yMode.std; l.fab.yMode = yMode;
    S['2-2'] = { start, aRef: 1, dbY: [0, 5], ...stored(l, ['s1', 's2', 'fab', 'hb', 'ns']), ref: rb.d };
    console.log(' 2-2 minFOM', r2(mf.a.FOM, 1), 's1', JSON.stringify(l.s1), 's2', JSON.stringify(l.s2), 'ref', JSON.stringify(rb.d), 'VpiL', r2(rb.r.VpiL), 'loss', r2(rb.r.loss), 'fRC', Math.round(rb.r.fRC), 'y', JSON.stringify(yMode));
  }
  /* 2-3 TW-MZM driven by the 2-2 reference phase shifter */
  {
    const l22 = { ...L('2-2', S['2-2']) }, a = KINDS.pn._x.analyse(l22, S['2-2'].ref);
    const pnRef = { VpiL: r2(a.VpiL, 3), loss: r2(a.loss, 3), Cp: +(a.Cp).toFixed(4), Rp: r2(a.Rp, 3) };
    const K = KINDS.mzm, start = { L: 5, g: 6, eta: 1, RT: 50, useCard: 0 };
    const l = L('2-3', { pnRef, s1: { bw: 1, il: 1e9, oma: 1e-9 }, s2: { pen: 1e9, oma: 1e-9, size: 1e9 }, fab: {}, hb: ['bw', 'oma'], ns: ['oma'] });
    const b = opt(K, l, (r, d) => -(r.omaDbm - r.pen) + 0.12 * d.L, [start, { L: 2.5, g: 10, eta: 0.6, RT: 35, useCard: 0 }, { L: 3.5, g: 20, eta: 0.5, RT: 40, useCard: 0 }], 220);
    const R = b.r;
    l.s1 = { bw: Math.floor(R.bw * 0.75), il: Math.ceil((R.IL + 1.5) * 10) / 10, oma: +(R.oma * Math.pow(10, -0.3)).toFixed(4) };
    l.s2 = { pen: r2(Math.max(R.pen * 1.25, R.pen + 0.4), 2), oma: +(R.oma * Math.pow(10, -0.08)).toFixed(4), size: Math.ceil(b.d.L * 1000 * 1.25 / 50) * 50 };
    l.fab = { pen: r2(l.s2.pen * 1.15, 2), oma: +(l.s2.oma * Math.pow(10, -0.05)).toFixed(4) };
    tune(K, l, [b.d, start], '2-3');
    const yMode = yT(K, l, b.d); l.fab.y = yMode.std; l.fab.yMode = yMode;
    S['2-3'] = { start, pnRef, aRef: l.s2.size, dbY: [-8, 6], ...stored(l, ['s1', 's2', 'fab', 'hb', 'ns']), ref: b.d };
    console.log(' 2-3 pnRef', JSON.stringify(pnRef), 'ref', JSON.stringify(b.d), 'bw', r2(R.bw, 1), 'IL', r2(R.IL), 'OMA', r2(R.omaDbm), 'pen', r2(R.pen), '→ s1', JSON.stringify(l.s1), 's2', JSON.stringify(l.s2), 'y', JSON.stringify(yMode));
  }
  /* 2-3R microring modulator: the 2-2 reference junction on a Si rib ring, the 2-1 reference heater cross-section */
  {
    const K = KINDS.mrr, pnD = S['2-2'].ref, hd = { h: S['2-1'].ref.h, iso: S['2-1'].ref.iso | 0 }, tr = [0, 70];
    const start = { R: 12, g: 0.3, dop: 0, vb: 0.5, vpp: 1.0, det: -0.6, bm: 1.0, useCard: 0, useHeater: 0 };
    const l = L('2-3R', { pnD, hd, tr, st: { fsr: 10 }, s1: { il: 1e9, er: 1e-9, bw: 1, omaS: 1e-9 }, s2: { pen: 1e9, oma: 1e-9, ph: 1e9, eb: 1 }, fab: { pen: 1e9, oma: 1e-9, ph: 1e9 }, hb: ['bw', 'er', 'oma', 'omaS'], ns: ['oma', 'omaS', 'eb'] });
    // best OMA − penalty with a heater-power term; red-side (thermally regenerative) points are excluded
    const obj = (r) => -(r.omaDbm - r.pen) + 0.04 * r.PhW + (r.gth >= 1 ? 20 : 0) + 0.1 * Math.max(0, 40 - r.bw);
    const b = opt(K, l, obj, [{ ...start, R: 7.5, g: 0.24, dop: 0.6, vb: 1.0, vpp: 2.0, det: -0.6 }, { ...start, R: 6, g: 0.2, dop: 0.4, vb: 1.2, vpp: 2.4, det: -0.8 }, { ...start, R: 10, g: 0.26, dop: 0.5, vb: 0.8, vpp: 2.2, det: -0.5 }], 240);
    const R = b.r;
    l.st = { fsr: Math.round(R.fsr * 1e3 * 2) / 2 };
    l.s1 = { il: Math.ceil((R.IL + 1.0) * 10) / 10, er: Math.floor(R.er * 0.6 * 10) / 10, bw: Math.floor(R.bw * 0.75), omaS: +(R.oma * Math.pow(10, -0.3)).toFixed(4) };
    l.s2 = { pen: r2(Math.max(R.pen * 1.25, R.pen + 0.4), 2), oma: +(R.oma * Math.pow(10, -0.08)).toFixed(4), ph: Math.ceil(R.PhW * 1.3 * 10) / 10, eb: r2(R.Etot * 1.2, 1) };
    // heater budget for the Fab run: 80th percentile of the per-die worst-case heater power (process moves the resonance by nm)
    const need = []; for (const s of [11, 22, 33]) for (const die of makeWafer(s * 97, 1)) need.push(K.evaluate(l, b.d, { ...die, dt: die.dt * pf.dt / 0.006 }).PhW);
    need.sort((x, y) => x - y);
    // when the process spread is comparable to the FSR the 80th percentile reaches P_2π (any order is reachable within one FSR);
    // the budget is then capped at 85 % of P_2π so that FSR, placement margin and heater efficiency still decide the yield
    const q80 = need[Math.floor(need.length * 0.8)];
    l.fab = { pen: r2(l.s2.pen * 1.15, 2), oma: +(l.s2.oma * Math.pow(10, -0.05)).toFixed(4), ph: Math.ceil(Math.max(Math.min(q80 * 1.05, 0.85 * R.P2pi), l.s2.ph * 1.1) * 10) / 10 };
    tune(K, l, [b.d, start], '2-3R');
    const yMode = yT(K, l, b.d); l.fab.y = yMode.std; l.fab.yMode = yMode;
    S['2-3R'] = { start, pnD, hd, tr, aRef: 1, dbY: [-8, 8], ...stored(l, ['st', 's1', 's2', 'fab', 'hb', 'ns']), ref: b.d };
    console.log(' 2-3R ref', JSON.stringify(b.d), 'R', R.Rlay, 'QL', Math.round(R.QL), 'shift', r2(R.shiftPmV, 1), 'pm/V bw', r2(R.bw, 1), 'IL', r2(R.IL), 'ER', r2(R.er), 'OMA', r2(R.omaDbm), 'pen', r2(R.pen), 'PhW', r2(R.PhW, 1), 'E', r2(R.Ebit, 1), '+', r2(R.Eth, 1), 'fJ/b → s1', JSON.stringify(l.s1), 's2', JSON.stringify(l.s2), 'fab', JSON.stringify(l.fab), 'heater q80', r2(need[Math.floor(need.length * 0.8)], 1));
  }
  /* 2-4 Ge PD + TIA */
  {
    const K = KINDS.pd, start = { L: 40, w: 4, di: 0.8, V: 0.5 };
    const l = L('2-4', { s1: { resp: 0, bw: 1 }, s2: { sens: 1e9, dark: 1e9, size: 1e9 }, fab: {}, hb: ['bw'], ns: ['resp'] });
    const Rmax = K.evaluate(l, { L: 60, w: 8, di: 1.0, V: 1 }).resp, resp = Math.floor(Rmax * 0.85 * 100) / 100;
    const b = opt(K, l, (r) => r.sensDbm + 0.02 * r.dark + 0.002 * r.size + 20 * Math.max(0, resp / r.resp - 1), [start, { L: 15, w: 2.5, di: 0.4, V: 1.5 }, { L: 30, w: 2, di: 0.5, V: 2 }], 220);
    const R = b.r;
    l.s1 = { resp, bw: Math.floor(R.bw * 0.8) };
    l.s2 = { sens: r2(R.sens * Math.pow(10, 0.06), 2), dark: Math.ceil(R.dark * 1.4), size: Math.ceil(R.size * 1.4 / 5) * 5 };
    l.fab = { sens: r2(l.s2.sens * Math.pow(10, 0.03), 2), dark: Math.ceil(l.s2.dark * 1.3) };
    tune(K, l, [b.d, start], '2-4');
    const yMode = yT(K, l, b.d); l.fab.y = yMode.std; l.fab.yMode = yMode;
    S['2-4'] = { start, aRef: l.s2.size, dbY: [-10, -2], ...stored(l, ['s1', 's2', 'fab', 'hb', 'ns']), ref: b.d };
    console.log(' 2-4 Rmax', r2(Rmax), 'ref', JSON.stringify(b.d), 'R', r2(R.resp), 'bw', r2(R.bw, 1), 'sens', r2(R.sensDbm), 'dark', r2(R.dark, 1), '→ s1', JSON.stringify(l.s1), 's2', JSON.stringify(l.s2), 'y', JSON.stringify(yMode));
  }
  /* 2-5 ELS + link budget, assembled from the reference part of every earlier level */
  {
    const ev = (id) => { const l = { ...L(id, S[id]) }; G.PQ.setPlatform(pf.mat, pf.t, pf.rules); const K = KINDS[LV[id].kind]; return K.card(l, K.evaluate(l, S[id].ref)).model; };
    const m16 = ev('1-6'), m13 = ev('1-3'), m17 = ev('1-7'), m23 = ev('2-3'), m24 = ev('2-4');
    const parts = { ssc: r2(m16.loss), split: r2(Math.max(...m13.el)), mux: r2(Math.max(...m17.il)), gain: m23.gain, pen: m23.pen, sens: m24.sens };
    const K = KINDS.els, start = { P: 10, ns: 2, iso: 0, th: 0, useCard: 0 };
    const l = L('2-5', { parts, s1: { margin: 0, fb: -30 }, s2: { margin: 1.5, pj: 1e9, fb: -36 }, fab: { margin: 0 }, ns: ['margin', 'fb'] });
    const all = []; for (let P = 8; P <= 20; P += 0.5) for (let ns = 0; ns < 4; ns++) for (const iso of [0, 1]) for (let th = 0; th <= 12; th += 0.5) { const d = { P, ns, iso, th, useCard: 0 }; all.push({ d, r: K.evaluate(l, d) }); }
    const stable = all.filter((x) => x.r.fb <= l.s2.fb), mmax = Math.max(...stable.map((x) => x.r.margin));
    l.s2.margin = r2(Math.max(0.5, Math.min(2.0, Math.floor((mmax - 0.6) * 2) / 2)), 1);
    const okk = stable.filter((x) => x.r.margin >= l.s2.margin).sort((a, b) => a.r.pj - b.r.pj), bst = okk[0];
    l.s2.pj = r2(bst.r.pj * 1.3, 3);
    tune(K, l, [bst.d, start], '2-5');
    // robust reference: cheapest design with ≥1 dB extra margin and pj within ★★
    const rob = stable.filter((x) => x.r.margin >= l.s2.margin + 0.8 && x.r.pj <= l.s2.pj).sort((a, b) => a.r.pj - b.r.pj)[0] || bst;
    const yMode = yT(K, l, rob.d); l.fab.y = yMode.std; l.fab.yMode = yMode;
    S['2-5'] = { start, parts, aRef: 1, dbY: [-4, 6], ...stored(l, ['s1', 's2', 'fab', 'ns']), ref: rob.d };
    console.log(' 2-5 parts', JSON.stringify(parts), 'max margin (stable)', r2(mmax), 's2', JSON.stringify(l.s2), 'cheapest', JSON.stringify(bst.d), r2(bst.r.pj, 3), 'ref', JSON.stringify(rob.d), 'y', JSON.stringify(yMode));
  }
};
