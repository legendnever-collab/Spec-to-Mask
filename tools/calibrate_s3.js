// Stage 3 (System) specs: 3A (2×FR4) and 3A+ (DR8 / LPO / CPO), assembled from the reference part of every
// earlier level on this platform. Power budgets and margins are architectural constraints and are not
// scaled by difficulty (ns); difficulty acts through process spread, credits and hints.
module.exports = function (G, pf, S, H) {
  const { KINDS, clamp, makeWafer } = G, { r2, scaleLev, yieldOf } = H;
  const LV = Object.fromEntries(G.LEVELS.map((l) => [l.id, l]));
  const L = (id, extra) => ({ ...LV[id], pf, ...extra });
  let MODE = 'std';
  G.GAME_LEV = (id) => scaleLev({ ...LV[id], ...S[id], pf }, MODE);
  const ev = (id) => { const l = L(id, S[id]); G.PQ.setPlatform(pf.mat, pf.t, pf.rules); const K = KINDS[LV[id].kind]; const r = K.evaluate(l, S[id].ref); return { r, m: K.card(l, r).model, l }; };
  // reference parts
  const e16 = ev('1-6'), e13 = ev('1-3'), e23 = ev('2-3'), e24 = ev('2-4'), e21 = ev('2-1'), e25 = ev('2-5');
  const th = S['2-5'].ref.th, iso = S['2-5'].ref.iso;
  const parts = { ssc: r2(e16.m.loss), split: r2(Math.max(...e13.m.el)), gain: e23.m.gain, pen: e23.m.pen, sens: e24.m.sens, ppi: r2(e21.r.Ppi, 2), cplx: r2(0.003 * th * th + (iso ? 1.0 : 0)), fb: e25.r.fb };
  // typical static demux trimming (π units × Σmult) from the 2-1 heater on the reference demux
  {
    const l21 = G.GAME_LEV('2-1'), sums = [];
    for (const s of [11, 22]) for (const die of makeWafer(s * 97, 1)) { const t = KINDS.to._x.trimDie({ ...l21, fab: { pmax: 1e9 } }, l21.ref, { ...die, dt: die.dt * pf.dt / 0.006 }, { Ppi: 1 }, S['1-7'].ref); if (t && t.pass) sums.push(t.power); }
    sums.sort((a, b) => a - b); parts.trimPi = r2(sums[Math.floor(sums.length / 2)] || 2, 2);
  }
  const yT = (K, l, d) => { const out = {}; for (const m of ['easy', 'std', 'hard']) { MODE = m; const y = yieldOf(K, scaleLev(l, m), d, H.MODES[m].sig); out[m] = r2(clamp(Math.floor(Math.min(y - 0.12, y * 0.75) * 20) / 20, 0.05, 0.95), 2); } MODE = 'std'; return out; };
  for (const id of ['3A', '3A+']) {
    const K = KINDS.xcvr, fr4 = LV[id].arch === 'fr4';
    const start = fr4 ? { P: 12, share: 0, tc: 0, mt: 0, dsp: 0, useCard: 0 } : { P: 12, share: 3, tc: 0, pkg: 0, useCard: 0 };
    const l = L(id, { parts, muxRef: S['1-7'].ref, s1: { margin: 0, pw: 1e9 }, s2: { margin: 0, pw: 1e9 }, fab: { margin: 0 }, ns: ['margin', 'pw'] });
    const all = [];
    const ks = fr4 ? { share: [0, 1], tc: [0, 1], mt: [0, 1], dsp: [0, 1] } : { share: [0, 1, 2, 3], tc: [0, 1], pkg: [0, 1, 2] };
    const combos = Object.entries(ks).reduce((acc, [k, vs]) => acc.flatMap((o) => vs.map((v) => ({ ...o, [k]: v }))), [{}]);
    for (let P = 10; P <= 20.001; P += 0.5) for (const c of combos) { const d = { ...start, ...c, P }; all.push({ d, r: K.evaluate(l, d) }); }
    const ok0 = all.filter((x) => x.r.margin >= 0), mmax = Math.max(...all.map((x) => x.r.margin));
    // ★ power: FR4 → 25% above the cheapest closing link; DR8 → reachable with the DSP pluggable (★★ then needs LPO/CPO)
    const pw0 = Math.min(...ok0.filter((x) => fr4 || (x.d.pkg | 0) === 0).map((x) => x.r.pw));
    l.s1.pw = Math.ceil(pw0 * (fr4 ? 1.25 : 1.1) * 2) / 2;
    l.s2.margin = r2(Math.max(0.5, Math.min(1.5, Math.floor((mmax - 0.5) * 2) / 2)), 1);
    const ok2 = all.filter((x) => x.r.margin >= l.s2.margin).sort((a, b) => a.r.pw - b.r.pw);
    l.s2.pw = Math.ceil(ok2[0].r.pw * 1.06 * 10) / 10;
    // reference for the yield target: inside ★★ with the most margin
    const ref = all.filter((x) => x.r.margin >= l.s2.margin && x.r.pw <= l.s2.pw).sort((a, b) => b.r.margin - a.r.margin)[0];
    const yMode = yT(K, l, ref.d); l.fab = { margin: 0, y: yMode.std, yMode };
    S[id] = { start, parts, muxRef: fr4 ? S['1-7'].ref : undefined, aRef: 1, dbY: [-4, 6], s1: l.s1, s2: l.s2, fab: l.fab, ns: l.ns, ref: ref.d };
    const desc = (x) => `${JSON.stringify(x.d)} m ${r2(x.r.margin)} pw ${r2(x.r.pw, 1)}`;
    console.log(` ${id} parts ${JSON.stringify(parts)}\n   max margin ${r2(mmax)} · cheapest ★ ${desc(ok0.sort((a, b) => a.r.pw - b.r.pw)[0])}\n   s1 ${JSON.stringify(l.s1)} s2 ${JSON.stringify(l.s2)} cheapest ★★ ${desc(ok2[0])}\n   ref ${desc(ref)} y ${JSON.stringify(yMode)} start m ${r2(K.evaluate(l, start).margin)} pw ${r2(K.evaluate(l, start).pw, 1)}`);
  }
};
