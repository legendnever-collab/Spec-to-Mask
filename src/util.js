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
