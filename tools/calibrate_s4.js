// Track B prelude (long delay lines): D-1 spiral, D-2 N-bit switched TTD — per platform, same engine as the game.
module.exports = function (G, pf, S, H) {
  const { KINDS, clamp, snapP, nelderMead } = G, { r2, scaleLev, yieldOf } = H, si = pf.mat === 'si';
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
  const tidy = (o) => { for (const k of Object.keys(o)) if (typeof o[k] === 'number' && k !== 'y') o[k] = k === 'size' ? Math.ceil(o[k] / 1000) * 1000 : +o[k].toPrecision(3); };
  function tune(K, l, starts, tag) {
    for (let it = 0; it < 14; it++) {
      const lh = scaleLev(l, 'hard'), b = opt(K, lh, qAll(K, lh), starts, 200);
      if (process.env.DBG) console.log('   tune', tag, it, r2(b.v, 3), JSON.stringify(b.d), JSON.stringify(lh.s1), JSON.stringify(lh.s2), 'q1', r2(K.q1(lh, b.r), 3), 'q2', r2(K.q2(lh, b.r), 3), 'sz', r2(b.r.size / lh.s2.size, 3));
      if (b.v <= 1.0) { console.log(`  ${tag} hard-mode best q ${r2(b.v)} after ${it} relax`); return; }
      const ns = l.ns || [], hb = l.hb || [];
      for (const t of ['s1', 's2']) for (const k of Object.keys(l[t])) { if (ns.includes(k)) continue; l[t][k] = hb.includes(k) ? l[t][k] / 1.05 : l[t][k] * 1.05; }
    }
    console.log(`  ${tag} WARNING: hard mode still infeasible`);
  }
  /* D-1 spiral */
  {
    const K = KINDS.spiral, start = si ? { w: 0.45, gap: 1.0, rin: 10, ws: 0.45, sb: 0 } : { w: 1.0, gap: 1.5, rin: 30, ws: 1.0, sb: 0 };
    const paper = si ? { w: 2.0, gap: 1.5, rin: 25, ws: 0.6, sb: 1 } : { w: 2.4, gap: 4, rin: 120, ws: 1.2, sb: 1 };
    const l = L('D-1', { s1: { il: 1e9, xtm: -20, xtg: -30 }, s2: { il: 1e9, size: 1e12 }, fab: {}, ns: ['xtm', 'xtg'] });
    const pen = (r) => 50 * Math.max(0, r.xtMode - l.s1.xtm) + 50 * Math.max(0, r.xtGap - l.s1.xtg);
    const lo = opt(K, l, (r) => r.IL + pen(r), [paper, start], 300), ILmin = lo.r.IL;
    const ilCap = 1.25 * ILmin + 0.2;
    const cp = opt(K, l, (r) => r.size / 1e6 + 20 * Math.max(0, r.IL - ilCap) + pen(r), [lo.d, paper], 300);
    l.s1.il = r2(Math.max(2 * ILmin, ILmin + 3), 2); l.s2 = { il: r2(ilCap, 2), size: Math.ceil(cp.r.size * 1.3 / 1000) * 1000 };
    tune(K, l, [lo.d, cp.d], 'D-1'); tidy(l.s1); tidy(l.s2);
    const rb = opt(K, l, qAll(K, l), [cp.d, lo.d], 200);
    l.fab = { il: r2(l.s2.il * 1.1, 2) };
    const yMode = yT(K, l, rb.d); l.fab.y = yMode.std; l.fab.yMode = yMode;
    S['D-1'] = { start, tau: 2, aRef: l.s2.size, dbY: [0, Math.ceil(l.s1.il * 1.5)], s1: l.s1, s2: l.s2, fab: l.fab, ns: l.ns, ref: rb.d, paper };
    const P = (r) => `IL ${r2(r.IL)} dB · ${r2(r.size / 1e6, 2)} mm² · xt ${r2(r.xtMode, 1)}/${r2(r.xtGap, 1)}`;
    console.log(` D-1 min-loss ${JSON.stringify(lo.d)} ${P(lo.r)}\n   compact ${JSON.stringify(cp.d)} ${P(cp.r)}\n   s1 ${JSON.stringify(l.s1)} s2 ${JSON.stringify(l.s2)} ref ${JSON.stringify(rb.d)} ${P(rb.r)} y ${JSON.stringify(yMode)}\n   paper-like ${JSON.stringify(paper)} ${P(K.evaluate(l, paper))} · start ${P(K.evaluate(l, start))}`);
  }
  /* D-2 switched TTD */
  {
    const K = KINDS.ttd, l21 = L('2-1', S['2-1']), ppi = r2(KINDS.to._x.core(l21, S['2-1'].ref).Ppi, 2);
    const parts = { spiral: S['D-1'].ref, ppi };
    const start = { N: 6, dt: 20, wa: pf.w0, useCard: 0 };
    const l = L('D-2', { parts, s1: { range: 5000, step: 10, il: 1e9 }, s2: { dil: 1e9, echo: -30, pw: 1e9, size: 1e12 }, fab: { echo: -28 }, ns: ['range', 'step', 'echo', 'dil', 'il'] });
    // reference: N = 9, Δτ = 10 ps, arm width with the lowest worst-case heater power at echo ≤ −25 dB
    const P = K.params(l)[2]; let ref = null;
    for (let wa = P.min; wa <= P.max + 1e-9; wa += P.step) { const d = { N: 9, dt: 10, wa: snapP(P, wa), useCard: 0 }, r = K.evaluate(l, d); if (r.echo <= -32 && (!ref || r.pw < ref.r.pw)) ref = { d, r }; }
    const R = ref.r;
    l.s1.il = r2(R.ilMax + 3, 2); l.s2 = { dil: r2(R.dil * 1.1 + 0.3, 2), echo: -30, pw: Math.ceil(R.pw * 1.3), size: Math.ceil(R.size * 1.3 / 1000) * 1000 };
    l.fab = { il: l.s1.il, echo: -28 };
    tune(K, l, [ref.d], 'D-2'); tidy(l.s2);
    const yMode = yT(K, l, ref.d); l.fab.y = yMode.std; l.fab.yMode = yMode;
    S['D-2'] = { start, parts, aRef: l.s2.size, dbY: [0, Math.ceil(l.s1.il * 1.3)], s1: l.s1, s2: l.s2, fab: l.fab, ns: l.ns, ref: ref.d };
    const narrow = K.evaluate(l, { ...ref.d, wa: pf.w0 });
    console.log(` D-2 ref ${JSON.stringify(ref.d)} ilMax ${r2(R.ilMax, 1)} dil ${r2(R.dil, 2)} echo ${r2(R.echo, 1)} pw ${Math.round(R.pw)} mW area ${r2(R.size / 1e6, 2)} mm² · narrow-arm echo ${r2(narrow.echo, 1)} pw ${Math.round(narrow.pw)} q0/qπ ${r2(narrow.q0 / narrow.ppiArm, 3)} vs ${r2(R.q0 / R.ppiArm, 3)}\n   s1 ${JSON.stringify(l.s1)} s2 ${JSON.stringify(l.s2)} y ${JSON.stringify(yMode)}`);
  }
};
