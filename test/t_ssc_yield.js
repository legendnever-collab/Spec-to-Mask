const G = require('./load')();
const K = G.KINDS.ssc, A = K._x.analyse;
const ys = (d, k, thr) => { let p = 0, n = 0; for (const s of [11, 22, 33, 44]) for (const die of G.makeWafer(s, k)) { n++; if (A(d, die).loss <= thr) p++; } return p / n; };
const res = [];
for (let tw = 0.096; tw <= 0.13; tw += 0.004) for (const Lt of [120, 160, 200, 250]) for (const p of [1.0, 1.3, 1.6, 2.0]) {
  const d = { tw: +tw.toFixed(3), Lt, p }, a = A(d); if (a.loss > 1.0 || a.tolX < 0.65) continue;
  const corners = [-0.008, 0.008].flatMap((dw) => [-0.004, 0.004].map((dt) => A(d, { dw, dt }).loss));
  res.push({ ...d, loss: +a.loss.toFixed(2), tol: +a.tolX.toFixed(2), worst: +Math.max(...corners).toFixed(2), y: ys(d, 1, 1.3), yE: ys(d, 0.6, 1.95), yH: ys(d, 1.25, 1.04) });
}
res.sort((a, b) => b.y - a.y); console.log(res.slice(0, 8).map((r) => JSON.stringify(r)).join('\n'));
console.log('count ★★ designs', res.length);
