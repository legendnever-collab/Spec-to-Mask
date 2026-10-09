// Fit the game's S-bend reversal-conversion model to the mode-solver sweep (tools/smq2gds/data/sbend_conv.json).
// Model (Gaussian-shift picture): conv = sin²(a), a = K · n_s² · w_m³ / (λ² R), mode width w_m = w + c·2/γ
// (γ = lateral decay constant of the EIM lateral slab). c = 0 is the old surrogate (core width only). Fitted per core material.
// node tools/fit_sbend_conv.js [-v]
const fs = require('fs');
const L = require('../test/load.js')();
const D = JSON.parse(fs.readFileSync(__dirname + '/smq2gds/data/sbend_conv.json', 'utf8')).rows;
const SP = L.KINDS.spiral._x, PF = L.PLATFORMS;
const rows = D.filter((r) => r.conv > 1e-5 && r.conv < 0.6).map((r) => { const pf = PF[r.pf], x = SP.xs(pf, r.w); return { ...r, a: Math.asin(Math.sqrt(r.conv)), ns: x.ns, g: x.g, lam: pf.lam }; });
function fit(c, rs) {
  const gk = (r) => r.ns * r.ns * Math.pow(r.w + c * 2 / r.g, 3) / (r.lam * r.lam * r.R);
  const lk = rs.map((r) => Math.log(r.a / gk(r))), m = lk.reduce((s, v) => s + v, 0) / lk.length, K = Math.exp(m);
  const err = rs.map((r) => 10 * Math.log10(Math.pow(Math.sin(Math.min(K * gk(r), Math.PI / 2)), 2) / r.conv));
  return { c, K, rms: Math.sqrt(err.reduce((s, v) => s + v * v, 0) / err.length), max: Math.max(...err.map(Math.abs)), err };
}
for (const mat of ['si', 'sin']) {
  const rs = rows.filter((r) => PF[r.pf].mat === mat);
  if (!rs.length) continue;
  let best = null;
  for (let c = 0; c <= 1.5001; c += 0.05) { const f = fit(+c.toFixed(2), rs); if (!best || f.rms < best.rms - 1e-9) best = f; }
  for (const f of [fit(0, rs), best]) {
    console.log(`${mat}: c = ${f.c.toFixed(2)}  K = ${f.K.toFixed(4)}  conv error: rms ${f.rms.toFixed(2)} dB, max ${f.max.toFixed(2)} dB  (n = ${rs.length})`);
    if (process.argv[2] === '-v') rs.forEach((r, i) => console.log(`   ${r.pf} w ${r.w} R ${r.R}: solver ${(10 * Math.log10(r.conv)).toFixed(1)} dB, model − solver ${f.err[i].toFixed(2)} dB`));
  }
}
