// Track B (switch-based FMCW LiDAR): B-1 chirp + reference MZI, B-2 focal-plane switch scanner, B-3 system.
// Parts come from the reference designs of D-1 (spiral), 2-1 (heater), 2-4 (PD), 1-3 (splitter) on the same platform.
module.exports = function (G, pf, S, H) {
  const { KINDS, clamp, snapP, nelderMead } = G, { r2, scaleLev, yieldOf } = H;
  const LV = Object.fromEntries(G.LEVELS.map((l) => [l.id, l]));
  const L = (id, extra) => ({ ...LV[id], pf, ...extra });
  G.GAME_LEV = (id) => scaleLev({ ...LV[id], ...S[id], pf }, 'std');
  function opt(K, l, obj, starts, maxE) {
    const ps = K.params(l); let best = null;
    for (const s0 of starts) {
      const toDes = (u) => { const d = { ...s0 }; ps.forEach((p, i) => { d[p.k] = snapP(p, p.min + (p.max - p.min) * clamp(u[i], 0, 1)); }); return d; };
      const f = (u) => { const d = toDes(u), r = K.evaluate(l, d), v = obj(r, d); if (!best || v < best.v) best = { v, d, r }; return v; };
      const g = nelderMead(f, ps.map((p) => (s0[p.k] - p.min) / (p.max - p.min)), 0.08, maxE || 260); while (!g.next().done);
    }
    return best;
  }
  const qAll = (K, l) => (r) => Math.max(K.q1(l, r), K.q2(l, r), K.noSize ? 0 : r.size / l.s2.size);
  const yT = (K, l, d) => { const out = {}; for (const m of ['easy', 'std', 'hard']) { const lm = scaleLev(l, m), dm = opt(K, lm, qAll(K, lm), [d], 120).d, y = yieldOf(K, lm, dm, H.MODES[m].sig); out[m] = r2(clamp(Math.floor(Math.min(y - 0.12, y * 0.75) * 20) / 20, 0.05, 0.95), 2); } return out; };
  function tune(K, l, starts, tag) {
    for (let it = 0; it < 14; it++) {
      const lh = scaleLev(l, 'hard'), b = opt(K, lh, qAll(K, lh), starts, 200);
      if (process.env.DBG) console.log('   tune', tag, it, r2(b.v, 3), JSON.stringify(b.d), 'q1', r2(K.q1(lh, b.r), 3), 'q2', r2(K.q2(lh, b.r), 3), 'sz', K.noSize ? '-' : r2(b.r.size / lh.s2.size, 3));
      if (b.v <= 1.0) { console.log(`  ${tag} hard-mode best q ${r2(b.v)} after ${it} relax`); return; }
      const ns = l.ns || [], hb = l.hb || [];
      for (const t of ['s1', 's2']) for (const k of Object.keys(l[t])) { if (ns.includes(k)) continue; l[t][k] = hb.includes(k) ? l[t][k] / 1.05 : l[t][k] * 1.05; }
    }
    console.log(`  ${tag} WARNING: hard mode still infeasible`);
  }
  const p3 = (o) => { for (const k of Object.keys(o)) if (typeof o[k] === 'number' && k !== 'y') o[k] = k === 'size' ? Math.ceil(o[k]) : +o[k].toPrecision(3); return o; };
  /* B-1 chirp */
  {
    const K = KINDS.chirp, start = { las: 0, B: 1, T: 5, tau: 1, tc: 0, useCard: 0 };
    const l = L('B-1', { parts: { spiral: S['D-1'].ref }, s1: { dr: 5, refil: 30 }, s2: { loss: 1e9, cal: 2, pr: 100, size: 1e12 }, fab: {}, ns: ['dr', 'refil', 'cal', 'pr'] });
    const pen = (r) => 30 * Math.max(0, K.q1(l, r) - 1) + 30 * Math.max(0, r.cal / l.s2.cal - 1) + 30 * Math.max(0, l.s2.pr / r.pr - 1);
    const ecl = opt(K, l, (r) => r.loss + 0.05 * r.area / 1e6 + pen(r), [{ las: 1, B: 3.2, T: 4, tau: 5, tc: 1, useCard: 0 }, { las: 1, B: 4, T: 4.5, tau: 10, tc: 1, useCard: 0 }], 300);
    const nar = opt(K, l, (r) => r.loss + 0.05 * r.area / 1e6 + pen(r), [{ las: 2, B: 2.4, T: 4, tau: 5, tc: 1, useCard: 0 }], 200);
    l.s2.loss = r2(ecl.r.loss * 1.1 + 0.3, 2); l.s2.size = Math.ceil(Math.max(ecl.r.area, nar.r.area) * 1.4 / 1000) * 1000;
    tune(K, l, [ecl.d, nar.d], 'B-1'); p3(l.s2);
    const rb = opt(K, l, qAll(K, l), [ecl.d, nar.d], 200);
    l.fab = { loss: r2(l.s2.loss * 1.1, 2) }; const yMode = yT(K, l, rb.d); l.fab.y = yMode.std; l.fab.yMode = yMode;
    S['B-1'] = { start, parts: l.parts, aRef: l.s2.size, dbY: [0, 12], s1: l.s1, s2: l.s2, fab: l.fab, ns: l.ns, ref: rb.d };
    const P = (x) => `${JSON.stringify(x.d)} loss ${r2(x.r.loss)} cal ${r2(x.r.cal, 1)} pr ${r2(x.r.pr, 1)} area ${r2(x.r.area / 1e6, 2)} refIL ${r2(x.r.refIL, 1)}`;
    console.log(` B-1 ECL ${P(ecl)}\n   narrow ${P(nar)}\n   s2 ${JSON.stringify(l.s2)} ref ${P(rb)} y ${JSON.stringify(yMode)}`);
  }
  /* B-2 focal-plane switch scanner */
  {
    const K = KINDS.fpsa, to = KINDS.to._x.core(L('2-1', S['2-1']), S['2-1'].ref), l1 = L('B-1', S['B-1']), T = S['B-1'].ref.T;
    const start = { k: 4, p: 20, f: 3, we: 3, sw: 1, useCard: 0 };
    const l = L('B-2', { parts: { to: { Ppi: r2(to.Ppi, 2), tau: r2(to.tau, 2) }, T }, s1: { fov: 30, res: 0.1, il: 1e9 }, s2: { fmin: 0.8, fmax: 1.5, ghost: -20, size: 1e12 }, fab: { ghost: -20 }, ns: ['fov', 'res', 'fmin', 'fmax', 'ghost'] });
    const pen = (r) => 30 * Math.max(0, l.s1.fov / (r.fov * 57.2958) - 1) + 30 * Math.max(0, r.res * 57.2958 / l.s1.res - 1) + 30 * Math.max(0, l.s2.fmin / r.fill - 1) + 30 * Math.max(0, r.fill / l.s2.fmax - 1) + 3 * Math.max(0, r.ghost - l.s2.ghost);
    const b = opt(K, l, (r) => r.il + 0.05 * r.chip + pen(r), [{ k: 9, p: 12, f: 10, we: 10, sw: 0, useCard: 0 }, { k: 9, p: 20, f: 18, we: 17, sw: 0, useCard: 0 }], 300);
    l.s1.il = r2(b.r.il * 1.25 + 0.5, 2); l.s2.size = Math.ceil(b.r.size * 1.3);
    tune(K, l, [b.d], 'B-2'); p3(l.s1); p3(l.s2);
    const rb = opt(K, l, qAll(K, l), [b.d], 200);
    const yMode = yT(K, l, rb.d); l.fab.y = yMode.std; l.fab.yMode = yMode;
    S['B-2'] = { start, parts: l.parts, aRef: l.s2.size, dbY: [0, 15], s1: l.s1, s2: l.s2, fab: l.fab, ns: l.ns, ref: rb.d };
    const pin = K.evaluate(l, { ...rb.d, sw: 1 });
    console.log(` B-2 best ${JSON.stringify(b.d)} il ${r2(b.r.il)} fill ${r2(b.r.fill)} chip ${r2(b.r.chip, 2)} mm pr ${r2(b.r.pr, 1)} wb ${r2(b.r.wb * 1e3, 3)} mm\n   s1 ${JSON.stringify(l.s1)} s2 ${JSON.stringify(l.s2)} ref ${JSON.stringify(rb.d)} y ${JSON.stringify(yMode)} · PIN il ${r2(pin.il)} pr ${r2(pin.pr, 1)} ghost ${r2(pin.ghost, 1)}`);
  }
  /* B-3 system */
  {
    const K = KINDS.lidar, l1 = L('B-1', S['B-1']), l2 = L('B-2', S['B-2']);
    const chirp = KINDS.chirp.card(l1, KINDS.chirp.evaluate(l1, S['B-1'].ref)).model, scan = KINDS.fpsa.card(l2, KINDS.fpsa.evaluate(l2, S['B-2'].ref)).model;
    const l24 = L('2-4', S['2-4']), resp = r2(KINDS.pd.evaluate(l24, S['2-4'].ref).resp, 3);
    const l13 = L('1-3', S['1-3']); G.PQ.setPlatform(pf.mat, pf.t, pf.rules); const split = r2(Math.max(...KINDS.mmi.card(l13, KINDS.mmi.evaluate(l13, S['1-3'].ref)).model.el), 3);
    const parts = { chirp, scan, resp, split }, start = { P: 13, nch: 0, lo: 1, nav: 1, useCard: 0 };
    const l = L('B-3', { parts, s1: { r: 0, pr: 0 }, s2: { r: 0, pr: 0, pw: 1e9 }, fab: {}, ns: ['r', 'pr'] });
    const base = 1 / (2 * chirp.T + scan.settle) * 1e3, all = [];
    for (let P = 10; P <= 30.001; P += 1) for (let nch = 0; nch < 4; nch++) for (const lo of [1, 3, 5, 10, 20, 35, 50]) for (const nav of [1, 2, 4, 8, 16]) { const d = { P, nch, lo, nav, useCard: 0 }; all.push({ d, r: K.evaluate(l, d) }); }
    l.s1.pr = r2(Math.max(1, Math.round(base * 0.5)), 2); l.s2.pr = r2(Math.round(base * 1.5), 2);
    const best1 = all.filter((x) => x.r.pr >= l.s1.pr).sort((a, b) => b.r.Rmax - a.r.Rmax)[0], best2 = all.filter((x) => x.r.pr >= l.s2.pr).sort((a, b) => b.r.Rmax - a.r.Rmax)[0];
    console.log('   B-3 best R @★pr', r2(best1.r.Rmax, 1), JSON.stringify(best1.d), '@★★pr', r2(best2.r.Rmax, 1), JSON.stringify(best2.d), 'base pr', r2(base, 1));
    const rr = (x) => (x >= 20 ? Math.floor(x / 5) * 5 : Math.floor(x));
    l.s2.r = Math.max(3, rr(best2.r.Rmax * 0.85)); l.s1.r = Math.max(2, Math.min(rr(best1.r.Rmax * 0.6), l.s2.r - 1));
    const ok2 = all.filter((x) => x.r.pr >= l.s2.pr && x.r.Rmax >= l.s2.r).sort((a, b) => a.r.pw - b.r.pw);
    l.s2.pw = r2(Math.ceil(ok2[0].r.pw * 1.15 * 10) / 10, 3);
    l.fab = { r: l.s1.r };
    tune(K, l, [ok2[0].d], 'B-3'); p3(l.s2);
    const rb = all.filter((x) => x.r.pr >= l.s2.pr && x.r.pw <= l.s2.pw).sort((a, b) => b.r.Rmax - a.r.Rmax)[0] || ok2[0];
    const yMode = yT(K, l, rb.d); l.fab.y = yMode.std; l.fab.yMode = yMode;
    S['B-3'] = { start, parts, aRef: 1, dbY: [0, Math.ceil(best1.r.Rmax / 10) * 10], s1: l.s1, s2: l.s2, fab: l.fab, ns: l.ns, ref: rb.d };
    const D = (x) => `${JSON.stringify(x.d)} R ${Math.round(x.r.Rmax)} m pr ${r2(x.r.pr, 1)} pw ${r2(x.r.pw, 1)} W`;
    console.log(` B-3 base pr ${r2(base, 1)} · best@★pr ${D(best1)} · best@★★pr ${D(best2)}\n   s1 ${JSON.stringify(l.s1)} s2 ${JSON.stringify(l.s2)} ref ${D(rb)} y ${JSON.stringify(yMode)} · start R ${Math.round(K.evaluate(l, start).Rmax)}`);
  }
};
