const G = require('./load')();
const K = G.KINDS.cwdm, X = K._x;
const l = { s1: { il: 1.5, xt: -10 }, s2: { il: 1.0, xt: -15 }, xt0: -40 };
for (const wa of [0.45, 0.8, 1.0]) {
  const ng = X.ngAt(wa, 0.22), L1 = 1.301 ** 2 / (ng * 0.04), L2 = 1.301 ** 2 / (ng * 0.08);
  for (const ord of [1, 2, 3]) {
    let d = { ord, dL1: +L1.toFixed(2), dL2: +L2.toFixed(2), wa, t1: 0, t2a: 0, t2b: 0 };
    d.t1 = +X.optTrim(l, d, 't1').toFixed(2); d.t2a = +X.optTrim(l, d, 't2a').toFixed(2); d.t2b = +X.optTrim(l, d, 't2b').toFixed(2);
    const r = K.evaluate(l, d);
    // local polish of trims
    let best = r, bd = d;
    for (let it = 0; it < 3; it++) for (const k of ['t1', 't2a', 't2b', 'dL1', 'dL2']) for (const s of [-0.03, -0.01, 0.01, 0.03]) {
      const nd = { ...bd, [k]: +(bd[k] + s).toFixed(2) }, rr = K.evaluate(l, nd);
      if (Math.max(rr.il, (rr.xt + 40) / 25) < Math.max(best.il, (best.xt + 40) / 25)) { best = rr; bd = nd; }
    }
    // fab yield with die randomness
    const dies = G.makeWafer(42, 1); let pass = 0;
    for (const die of dies) { const rr = K.evaluate(l, bd, die); if (rr.il <= 1.3 && rr.xt <= -12) pass++; }
    console.log(`wa ${wa} ord ${ord} ng ${ng.toFixed(3)} L1 ${L1.toFixed(2)} L2 ${L2.toFixed(2)} | trims ${d.t1},${d.t2a},${d.t2b} -> IL ${r.il.toFixed(2)} XT ${r.xt.toFixed(1)} | polished IL ${best.il.toFixed(2)} XT ${best.xt.toFixed(1)} area ${Math.round(best.size)} yield ${(pass / dies.length * 100).toFixed(0)}%`);
  }
}
