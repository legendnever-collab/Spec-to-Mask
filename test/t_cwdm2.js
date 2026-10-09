const G = require('./load')();
const K = G.KINDS.cwdm, X = K._x;
const l = { s1: { il: 1.5, xt: -8 }, s2: { il: 1.0, xt: -12 }, xt0: -40 };
const q = (r) => Math.max(r.il / 1.0, (r.xt + 40) / 28);
function polish(d) { let bd = d, best = K.evaluate(l, d); for (let it = 0; it < 4; it++) for (const k of ['t1', 't2a', 't2b', 'dL1', 'dL2']) for (const s of [-0.05, -0.02, -0.01, 0.01, 0.02, 0.05]) { const nd = { ...bd, [k]: +(bd[k] + s).toFixed(2) }, rr = K.evaluate(l, nd); if (q(rr) < q(best)) { best = rr; bd = nd; } } return { d: bd, r: best }; }
for (const [wa, ord] of [[1.0, 3], [1.2, 3], [0.6, 3], [1.0, 2]]) {
  const ng = X.ngAt(wa, 0.22); let d = { ord, wa, dL1: +(1.301 ** 2 / (ng * 0.04)).toFixed(2), dL2: +(1.301 ** 2 / (ng * 0.08)).toFixed(2), t1: 0, t2a: 0, t2b: 0 };
  ['t1', 't2a', 't2b'].forEach((k) => d[k] = +X.optTrim(l, d, k).toFixed(2));
  const { d: bd, r } = polish(d);
  const out = [];
  for (const [il, xt] of [[1.5, -8], [1.5, -10], [1.3, -10], [1.2, -12]]) { let pass = 0, n = 0; for (const seed of [1, 2, 3]) { const dies = G.makeWafer(seed * 77, 1); for (const die of dies) { const rr = K.evaluate(l, bd, die); n++; if (rr.il <= il && rr.xt <= xt) pass++; } } out.push(`${il}/${xt}:${(pass / n * 100).toFixed(0)}%`); }
  console.log(`wa ${wa} ord ${ord} nominal IL ${r.il.toFixed(2)} XT ${r.xt.toFixed(1)} area ${Math.round(r.size)} | yields ${out.join('  ')} | ${JSON.stringify(bd)}`);
}
