const G = require('./load')();
const K = G.KINDS.cwdm, X = K._x;
const l = { s1: { il: 1.5, xt: -8 }, s2: { il: 1.0, xt: -12 }, xt0: -40 };
const q = (r) => Math.max(r.il / 1.0, (r.xt + 40) / 28);
function polish(d) { let bd = d, best = K.evaluate(l, d); for (let it = 0; it < 4; it++) for (const k of ['t1', 't2a', 't2b', 'dL1', 'dL2']) for (const s of [-0.05, -0.02, -0.01, 0.01, 0.02, 0.05]) { const nd = { ...bd, [k]: +(bd[k] + s).toFixed(2) }, rr = K.evaluate(l, nd); if (q(rr) < q(best)) { best = rr; bd = nd; } } return bd; }
for (const wa of [0.45, 1.0]) {
  const ng = X.ngAt(wa, 0.22); let d = { ord: 3, wa, dL1: +(1.301 ** 2 / (ng * 0.04)).toFixed(2), dL2: +(1.301 ** 2 / (ng * 0.08)).toFixed(2), t1: 0, t2a: 0, t2b: 0 };
  ['t1', 't2a', 't2b'].forEach((k) => d[k] = +X.optTrim(l, d, k).toFixed(2)); d = polish(d);
  for (const [nm, k, il, xt] of [['easy', 0.6, 2.25, -5.33], ['std', 1, 1.5, -8], ['hard', 1.25, 1.2, -10]]) {
    let p = 0, n = 0; for (const s of [5, 6, 7, 8]) for (const die of G.makeWafer(s * 31, k)) { n++; const r = K.evaluate(l, d, die); if (r.il <= il && r.xt <= xt) p++; }
    console.log('wa', wa, nm, (p / n * 100).toFixed(0) + '%');
  }
}
