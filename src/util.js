// ===== shared math / process utilities =====
const band = (a, b, n) => Array.from({ length: n }, (_, i) => +(a + (b - a) * i / (n - 1)).toFixed(4));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function* nelderMead(f, x0, step, maxEval) {
  const n = x0.length; let S = [x0.slice()];
  for (let i = 0; i < n; i++) { const x = x0.slice(); x[i] += step; S.push(x); }
  let F = []; for (const x of S) { F.push(f(x)); yield; }
  let ev = n + 1;
  while (ev < maxEval) {
    const idx = F.map((v, i) => i).sort((a, b) => F[a] - F[b]); S = idx.map((i) => S[i]); F = idx.map((i) => F[i]);
    const c = Array(n).fill(0); for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) c[j] += S[i][j] / n;
    const xr = c.map((v, j) => v + (v - S[n][j])); const fr = f(xr); ev++; yield;
    if (fr < F[0]) { const xe = c.map((v, j) => v + 2 * (v - S[n][j])); const fe = f(xe); ev++; yield; if (fe < fr) { S[n] = xe; F[n] = fe; } else { S[n] = xr; F[n] = fr; } }
    else if (fr < F[n - 1]) { S[n] = xr; F[n] = fr; }
    else {
      const xc = c.map((v, j) => v + 0.5 * (S[n][j] - v)); const fc = f(xc); ev++; yield;
      if (fc < F[n]) { S[n] = xc; F[n] = fc; } else { for (let i = 1; i <= n; i++) { S[i] = S[i].map((v, j) => S[0][j] + 0.5 * (v - S[0][j])); F[i] = f(S[i]); ev++; yield; } }
    }
    if (Math.abs(F[n] - F[0]) < 1e-4 && ev > 40) break;
  }
}
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function gaussR(r) { let u = 0; while (!u) u = r(); const v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
// wafer: 9x9 die grid inside the wafer; wafer-level CD offset + thickness bowl + die-level random; k scales all sigmas
function makeWafer(seed, k) {
  k = k || 1; const r = mulberry(seed), dies = [];
  const wW = gaussR(r) * 0.005 * k, wT = gaussR(r) * 0.003 * k, bowl = (0.004 + gaussR(r) * 0.0015) * k;
  for (let j = 0; j < 9; j++) for (let i = 0; i < 9; i++) {
    const x = i - 4, y = j - 4, rr = Math.hypot(x, y) / 4.6; if (rr > 1) continue;
    dies.push({ i, j, dw: wW - 0.006 * k * rr * rr + gaussR(r) * 0.005 * k, dt: wT + bowl * (rr * rr - 0.4) + gaussR(r) * 0.0015 * k, seed: (r() * 2147483647) | 0, k });
  }
  return dies;
}
const linterp = (xs, ys, x) => {
  if (x <= xs[0]) return ys[0] + (ys[1] - ys[0]) * (x - xs[0]) / (xs[1] - xs[0]);
  const n = xs.length; if (x >= xs[n - 1]) return ys[n - 1] + (ys[n - 1] - ys[n - 2]) * (x - xs[n - 1]) / (xs[n - 1] - xs[n - 2]);
  let i = 1; while (xs[i] < x) i++;
  return ys[i - 1] + (ys[i] - ys[i - 1]) * (x - xs[i - 1]) / (xs[i] - xs[i - 1]);
};
const dB10 = (p) => 10 * Math.log10(Math.max(p, 1e-12));
if (typeof module !== 'undefined') module.exports = { band, clamp, nelderMead, mulberry, gaussR, makeWafer, linterp, dB10 };
const snapP = (p, v) => +clamp(Math.round(v / p.step) * p.step, p.min, p.max).toFixed(4);
if (typeof module !== 'undefined') module.exports.snapP = snapP;
// ===== PAM4 eye simulator (shared by modulator / receiver levels) =====
function fftInPlace(re, im, inv) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) {
    const a = (inv ? 2 : -2) * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a);
    for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let k = 0; k < len / 2; k++) { const ur = re[i + k], ui = im[i + k], vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci, vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr; re[i + k] = ur + vr; im[i + k] = ui + vi; re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi; const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t; } }
  }
  if (inv) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
}
// Hf(fGHz) -> [re, im] with H(0) = 1. Optional nl() acts on the received waveform; ntap > 1 adds a T-spaced
// least-squares FFE (TDECQ-style reference receiver) and charges its noise enhancement √Σc².
// Returns the worst inner-eye opening relative to the ideal level spacing.
function solveLin(A, b) {
  const n = b.length, M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]]; const v = M[c][c] || 1e-12;
    for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / v; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
  }
  return M.map((r, i) => r[n] / (r[i] || 1e-12));
}
function pam4Eye(Hf, baudG, nsym, sps, nl, ntap) {
  nsym = nsym || 128; sps = sps || 16; ntap = ntap || 1; const n = nsym * sps, r = mulberry(1234), sym = [], h = (ntap - 1) >> 1;
  for (let i = 0; i < nsym; i++) sym.push([-3, -1, 1, 3][Math.floor(r() * 4)]);
  const re = new Float64Array(n), im = new Float64Array(n);
  for (let i = 0; i < n; i++) re[i] = sym[Math.floor(i / sps)] / 3;
  fftInPlace(re, im, false);
  const binG = baudG * sps / n;
  for (let k = 0; k < n; k++) { const f = (k <= n / 2 ? k : k - n) * binG, [hr, hi0] = Hf(Math.abs(f)), hi = f < 0 ? -hi0 : hi0, a = re[k], b = im[k]; re[k] = a * hr - b * hi; im[k] = a * hi + b * hr; }
  fftInPlace(re, im, true);
  if (nl) for (let i = 0; i < n; i++) re[i] = nl(re[i]);
  const at = (i) => re[((i % n) + n) % n];
  let best = { ratio: -Infinity, ph: 0, c: [1] };
  for (let ph = 0; ph < sps; ph++) {
    let c = [1];
    if (ntap > 1) {
      const A = Array.from({ length: ntap }, () => new Array(ntap).fill(0)), b = new Array(ntap).fill(0);
      for (let s = 8; s < nsym; s++) { const row = []; for (let k = 0; k < ntap; k++) row.push(at((s + h - k) * sps + ph)); for (let i = 0; i < ntap; i++) { b[i] += row[i] * sym[s] / 3; for (let j = 0; j < ntap; j++) A[i][j] += row[i] * row[j]; } }
      c = solveLin(A, b);
    }
    const z = (s) => { let v = 0; for (let k = 0; k < c.length; k++) v += c[k] * at((s + (c.length > 1 ? h : 0) - k) * sps + ph); return v; };
    const lv = [[], [], [], []];
    for (let s = 8; s < nsym; s++) lv[(sym[s] + 3) / 2].push(z(s));
    let worst = Infinity; for (let k = 0; k < 3; k++) worst = Math.min(worst, Math.min(...lv[k + 1]) - Math.max(...lv[k]));
    const ne = Math.sqrt(c.reduce((a, v) => a + v * v, 0)), ratio = worst / (2 / 3) / ne;
    if (ratio > best.ratio) best = { ratio, ph, c, ne };
  }
  const c = best.c, hh = c.length > 1 ? h : 0, zt = (i) => { let v = 0; for (let k = 0; k < c.length; k++) v += c[k] * at(i + (hh - k) * sps); return v; };
  const traces = []; for (let s = 8; s < Math.min(nsym - 2, 72); s++) { const tr = []; for (let k = -sps / 2; k <= sps * 1.5; k++) tr.push(zt(s * sps + best.ph + k)); traces.push(tr); }
  return { ratio: best.ratio, ph: best.ph, traces, sps, taps: c, ne: best.ne || 1 };
}
if (typeof module !== 'undefined') Object.assign(module.exports, { fftInPlace, pam4Eye });
// small complex helpers [re, im]
const cx = { add: (a, b) => [a[0] + b[0], a[1] + b[1]], sub: (a, b) => [a[0] - b[0], a[1] - b[1]], mul: (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]],
  div: (a, b) => { const d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; },
  sqrt: (a) => { const r = Math.hypot(a[0], a[1]), t = Math.atan2(a[1], a[0]) / 2; return [Math.sqrt(r) * Math.cos(t), Math.sqrt(r) * Math.sin(t)]; },
  exp: (a) => { const e = Math.exp(a[0]); return [e * Math.cos(a[1]), e * Math.sin(a[1])]; }, abs: (a) => Math.hypot(a[0], a[1]), sc: (a, k) => [a[0] * k, a[1] * k] };
if (typeof module !== 'undefined') module.exports.cx = cx;
// coach helper: 1-D scan of one parameter; returns the best value only if it really improves q
function lineBest(K, l, d, k, q, n) {
  const p = K.params(l).find((x) => x.k === k), q0 = q(K.evaluate(l, d)); let best = { v: d[k], q: q0 }; n = n || 24;
  for (let i = 0; i <= n; i++) { const v = snapP(p, p.min + (p.max - p.min) * i / n); if (v === d[k]) continue; const qq = q(K.evaluate(l, { ...d, [k]: v })); if (qq < best.q - 1e-9) best = { v, q: qq }; }
  return best.q < q0 * 0.99 ? { ...best, q0, p } : null;
}
const lineBestOf = (K, l, d, ks, q, n) => ks.map((k) => lineBest(K, l, d, k, q, n)).filter(Boolean).sort((a, b) => a.q - b.q)[0] || null;
const recText = (b, t, d) => (!b ? '' : t >= 2 ? ` 권장: ${b.p.sym} = ${(+b.v).toFixed(b.p.dec)}${b.p.unit ? ' ' + b.p.unit : ''} (기준 대비 ${Math.round(b.q0 * 100)}% → ${Math.round(b.q * 100)}%).` : ` 추천: ${b.p.label}(${b.p.sym})를 ${b.v > d[b.p.k] ? '키우세요' : '줄이세요'}.`);
if (typeof module !== 'undefined') Object.assign(module.exports, { lineBest, lineBestOf, recText });
// two-parameter coarse grid (for coupled constraints a single-knob scan cannot escape)
function pairBest(K, l, d, ks, q, n) {
  const ps = ks.map((k) => K.params(l).find((x) => x.k === k)), q0 = q(K.evaluate(l, d)); let best = { v: ks.map((k) => d[k]), q: q0 }; n = n || 10;
  for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) {
    const v = [snapP(ps[0], ps[0].min + (ps[0].max - ps[0].min) * i / n), snapP(ps[1], ps[1].min + (ps[1].max - ps[1].min) * j / n)];
    const qq = q(K.evaluate(l, { ...d, [ks[0]]: v[0], [ks[1]]: v[1] })); if (qq < best.q - 1e-9) best = { v, q: qq };
  }
  return best.q < q0 * 0.99 ? { ...best, q0, ps } : null;
}
const recText2 = (b, t) => (!b ? '' : t >= 2 ? ` 권장: ${b.ps.map((p, i) => `${p.sym} = ${(+b.v[i]).toFixed(p.dec)}${p.unit ? ' ' + p.unit : ''}`).join(' · ')} (기준 대비 ${Math.round(b.q0 * 100)}% → ${Math.round(b.q * 100)}%).` : ` 추천: ${b.ps.map((p) => p.label).join('와 ')}을 함께 바꿔 보세요.`);
if (typeof module !== 'undefined') Object.assign(module.exports, { pairBest, recText2 });
