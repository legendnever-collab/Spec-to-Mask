const G = require('./load')();
const K = G.KINDS.ssc, A = K._x.analyse;
for (const d of [{ tw: 0.10, Lt: 50, p: 1 }, { tw: 0.10, Lt: 150, p: 1 }, { tw: 0.10, Lt: 300, p: 1 }, { tw: 0.10, Lt: 150, p: 2 }, { tw: 0.104, Lt: 200, p: 1.5 }, { tw: 0.11, Lt: 120, p: 1.5 }, { tw: 0.12, Lt: 100, p: 1.2 }, { tw: 0.15, Lt: 60, p: 1 }]) {
  const r = A(d); console.log(JSON.stringify(d), 'loss', r.loss.toFixed(2), 'mis', r.mis.toFixed(2), 'tap', r.tap.toFixed(2), 'lk', r.lk.toFixed(2), 'tol', r.tolX.toFixed(2), r.tolY.toFixed(2));
}
// process sensitivity
for (const d of [{ tw: 0.10, Lt: 200, p: 1.5 }, { tw: 0.106, Lt: 200, p: 1.5 }, { tw: 0.112, Lt: 160, p: 1.3 }]) {
  const out = []; for (const dw of [-0.01, -0.005, 0, 0.005, 0.01]) out.push(A(d, { dw, dt: 0 }).loss.toFixed(2));
  const o2 = []; for (const dt of [-0.006, 0, 0.006]) o2.push(A(d, { dw: 0, dt }).loss.toFixed(2));
  console.log('sens', JSON.stringify(d), 'dw', out.join(' '), '| dt', o2.join(' '));
}
