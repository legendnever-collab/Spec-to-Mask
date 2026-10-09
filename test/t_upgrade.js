// Engine-level acceptance checks for the learning-guide upgrade (no DOM):
//   A. CWDM guided steps — single MZI outputs are consistent, ΔL sets the FSR, the phase offset shifts the spectrum,
//      F1 / F2A / F2B separate the channels step by step, lattice orders give different transfer functions,
//      and the full-level physics (response / analyse) is unchanged by the step code.
//   B. Rectangular spiral — length ↔ delay consistency, geometry inside the boundary, pitch / radius rules,
//      infeasible designs report a reason, the circular spiral is bit-identical to main, rotation-only boxes match.
// node test/t_upgrade.js            (exit code 1 on any failure)
const load = require('./load.js');
const G = load();
let fail = 0, n = 0;
const ok = (c, msg) => { n++; if (!c) { fail++; console.log('  FAIL', msg); } };
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const LV = (id, pid) => { const L = G.LEVELS.find((x) => x.id === id), S = G.PSPEC[pid][id]; return { ...L, ...S, pf: G.PLATFORMS[pid], s1: S.s1, s2: S.s2, fab: S.fab }; };

/* ---------------- A. CWDM ---------------- */
for (const pid of Object.keys(G.PLATFORMS)) {
  const K = G.KINDS.cwdm, X = K._x, l = LV('1-7', pid), pf = l.pf;
  K.params(l);
  const steps = K.steps(l), [s1, s2, s3, s4, s5] = steps;
  ok(steps.length === 5 && s5.full, `${pid}: five steps, the last is the full design`);
  // single MZI: bar + cross = coupler transmission (two couplers at 0.05 dB excess each), independent of ΔL and φ
  const a2 = Math.pow(10, -0.01);
  for (const [dL, ph] of [[5, 0], [9.9, 0.3], [21, -0.7]]) for (const lam of [pf.ch[0], pf.ch[1], pf.lc]) {
    const p = X.filt1(1, dL, ph, lam, pf.w0); ok(near(p[0] + p[1], a2, 1e-9), `${pid}: MZI power conservation ΔL ${dL} φ ${ph}`);
    const ne = X.neffAt(pf.w0, pf.t, lam), dphi = 2 * Math.PI * ne * dL / lam + Math.PI * ph;
    ok(near(p[0], a2 * Math.pow(Math.sin(dphi / 2), 2), 1e-9), `${pid}: Bar = sin²(Δφ/2)`);
  }
  // ΔL → FSR: doubling ΔL halves the FSR (measured from the bar peaks)
  // ΔL values scaled with n_g so that every platform shows several periods inside the ±150 nm scan (FSR ≈ 30 / 15 nm)
  const ngc = X.ngLam(pf.w0, pf.lc), dA = +(pf.lc * pf.lc / (ngc * 0.03)).toFixed(2), dB = 2 * dA;
  const peaks = (dL, ph) => { const o = []; let prev = null, prev2 = null; for (let lam = pf.lc - 0.15; lam <= pf.lc + 0.15; lam += 0.00005) { const v = X.filt1(1, dL, ph, lam, pf.w0)[0]; if (prev2 != null && prev > prev2 && prev >= v) o.push(lam - 0.00005); prev2 = prev; prev = v; } return o; };
  const fsrOf = (dL) => { const pk = peaks(dL, 0); const ds = pk.slice(1).map((v, i) => v - pk[i]); return ds.reduce((a, b) => a + b, 0) / ds.length * 1000; };
  const f1 = fsrOf(dA), f2 = fsrOf(dB);
  ok(near(f1 / f2, 2, 0.06), `${pid}: FSR(ΔL) ∝ 1/ΔL (${f1.toFixed(1)} vs ${f2.toFixed(1)} nm)`);
  const ng = X.ngLam(pf.w0, pf.lc); ok(near(f2, pf.lc * pf.lc / (ng * dB) * 1000, 0.05 * f2), `${pid}: FSR = λ²/(n_g ΔL)`);
  // φ shifts the spectrum by φ/2 · FSR without changing the period
  const p0 = peaks(dB, 0), p5 = peaks(dB, 0.5), c0 = p0.reduce((b, v) => (Math.abs(v - pf.lc) < Math.abs(b - pf.lc) ? v : b)), c5 = p5.reduce((b, v) => (Math.abs(v - c0) < Math.abs(b - c0) ? v : b));
  ok(near(Math.abs(c5 - c0) * 1000, f2 / 4, 0.12 * f2 / 4), `${pid}: φ = 0.5π shifts the peak by FSR/4 (${(Math.abs(c5 - c0) * 1000).toFixed(2)} nm)`);
  // step 1 is solved by ΔL = λ²/(n_g·40 nm) and the coached phase; step 2/3 by the hint values; step 4 by order + trims
  const lm = (pf.ch[0] + pf.ch[1]) / 2, ngm = X.ngLam(pf.w0, lm), L40 = lm * lm / (ngm * 0.04);
  const d1 = { mL: +L40.toFixed(2), mP: 0 }, ne = X.neffAt(pf.w0, pf.t, pf.ch[0]); let t = 1 - 2 * ne * d1.mL / pf.ch[0]; t = ((t + 1) % 2 + 2) % 2 - 1; d1.mP = +t.toFixed(2);
  const r1 = s1.evaluate(l, d1); ok(s1.done(l, r1, {}), `${pid}: step 1 solved by ΔL = λ²/(n_g·40 nm), φ = 1 − 2n_eff ΔL/λ_A (Bar ${(r1.pa[0] * 100).toFixed(1)}%, Cross ${(r1.pb[1] * 100).toFixed(1)}%)`);
  ok(!s1.done(l, s1.evaluate(l, { mL: +(L40 / 2).toFixed(2), mP: 0 }), {}), `${pid}: step 1 not done at the start (FSR 80 nm)`);
  const ref = { ...l.ref }, base = { ...l.start, wa: ref.wa };
  const ng1 = X.ngAt(ref.wa, pf.t), d2 = { ...base, ord: 1, dL1: +(pf.lc * pf.lc / (ng1 * 0.04)).toFixed(2) };
  d2.t1 = +((((X.optTrim(l, d2, 't1') + 1) % 2 + 2) % 2) - 1).toFixed(2);
  const r2 = s2.evaluate(l, d2); ok(s2.done(l, r2, {}), `${pid}: step 2 (F1 interleaver) groups CH1+CH3 / CH2+CH4 (worst ${(r2.sep * 100).toFixed(1)}%)`);
  const d3 = { ...d2, dL2: +(pf.lc * pf.lc / (ng1 * 0.08)).toFixed(2) };
  // the player sets φ₂ₐ / φ₂ᵦ on a 0.01π grid by watching the channel-centre split, so the test does the same
  { const W = (a, b) => s3.evaluate(l, { ...d3, t2a: a, t2b: b }).worst; let ba = 0, bb = 0, bv = -1;
    for (let i = 0; i < 40; i++) for (let j = 0; j < 40; j++) { const a = -1 + 0.05 * i, b = -1 + 0.05 * j, v = W(a, b); if (v > bv) { bv = v; ba = a; bb = b; } }
    const ca = ba, cb = bb; for (let i = -5; i <= 5; i++) for (let j = -5; j <= 5; j++) { const a = +(ca + 0.01 * i).toFixed(2), b = +(cb + 0.01 * j).toFixed(2), v = W(a, b); if (v > bv) { bv = v; ba = a; bb = b; } }
    d3.t2a = ba; d3.t2b = bb; }
  const r3 = s3.evaluate(l, d3); ok(s3.done(l, r3, {}), `${pid}: step 3 (F2A/F2B) routes four channels to four ports (worst ${(r3.worst * 100).toFixed(1)}%)`);
  ok(r3.xtBand > l.s1.xt, `${pid}: first-order tree still fails ★ crosstalk at the band edges (${r3.xtBand.toFixed(1)} dB) — motivates step 4`);
  // lattice orders: different transfer functions, decreasing band-edge leakage with ideal trims
  const leak = [1, 2, 3].map((o) => { const dd = { ...d3, ord: o }; ['t1', 't2a', 't2b'].forEach((k) => { dd[k] = X.optTrim(l, dd, k); }); return Math.max(...X.analyse(l, dd).xt); });
  ok(leak[0] > leak[1] && leak[1] > leak[2], `${pid}: worst XT improves with lattice order ${leak.map((v) => v.toFixed(1)).join(' > ')}`);
  const tf = (o) => { const dd = { ...d3, ord: o }, tr = X.optTrim(l, dd, 't1'); return X.filt1(o, d3.dL1, tr, pf.ch[0] + 0.0065, ref.wa)[1]; };
  ok(tf(1) > tf(3) * 2, `${pid}: 3rd-order passband edge leaks less than 1st order (${tf(1).toExponential(2)} vs ${tf(3).toExponential(2)})`);
  const d4 = { ...d3, ord: 3 }; ['t1', 't2a', 't2b'].forEach((k) => { d4[k] = +((((X.optTrim(l, d4, k) + 1) % 2 + 2) % 2) - 1).toFixed(2); });
  const r4 = s4.evaluate(l, d4); ok(s4.done(l, r4, { ords: [1, 2, 3] }), `${pid}: step 4 done with ord 3 after comparing 1/2/3 (XT ${r4.xt.toFixed(1)} dB)`);
  ok(!s4.done(l, r4, { ords: [3] }), `${pid}: step 4 requires the order comparison`);
  // the full level is untouched: the calibrated reference still meets ★★ with the same engine
  const rr = K.evaluate(l, { ...l.ref }); ok(rr.il <= l.s2.il && rr.xt <= l.s2.xt, `${pid}: calibrated 1-7 reference still meets ★★ (IL ${rr.il.toFixed(2)}, XT ${rr.xt.toFixed(1)})`);
  // the spectrum axis follows the band
  const ax = X.axis(); ok(ax.x0 < pf.ch[0] * 1000 && ax.x1 > pf.ch[3] * 1000 && ax.x1 - ax.x0 < 140, `${pid}: spectrum axis ${ax.x0}–${ax.x1} nm covers the ${pf.band} grid`);
}

/* ---------------- B. rectangular spiral ---------------- */
const fs = require('fs'), vm = require('vm'), path = require('path');
let base = null;
try { const src = require('child_process').execSync('git show HEAD~0:src/kinds/spiral.js', { cwd: path.join(__dirname, '..'), stdio: ['ignore', 'pipe', 'ignore'] }).toString(); if (!/rectGeom/.test(src)) base = src; } catch (e) { base = null; }
try { if (!base) base = require('child_process').execSync('git show origin/main:src/kinds/spiral.js', { cwd: path.join(__dirname, '..'), stdio: ['ignore', 'pipe', 'ignore'] }).toString(); } catch (e) { base = null; }
if (!base) console.log("  note: main spiral.js not found — legacy identity check skipped");
let G0 = null; if (base) { G0 = load(); vm.runInContext(base.replace(/^const (\w+) =/gm, 'var $1 ='), G0); }
for (const pid of Object.keys(G.PLATFORMS)) {
  const K = G.KINDS.spiral, l = LV('D-1', pid), pf = l.pf, S = G.PSPEC[pid]['D-1'];
  if (G0) for (const d of [S.ref, S.start, S.paper]) { const a = K.evaluate(l, { ...d, lay: 0 }), b = G0.KINDS.spiral.evaluate(l, d); ok(a.IL === b.IL && a.area === b.area && a.xtMode === b.xtMode, `${pid}: circular spiral identical to main`); }
  const mk = (o) => { const d = { ...S.ref, lay: 2, sb: 1, ...o }; K.fill(l, d); return d; };
  for (const [tag, o] of [['10x30 short', {}], ['10x30 E-W', { port: 1 }], ['5x5', { bp: 0, bw: 5, bh: 5 }], ['compact f .2', { env: 0.2 }], ['arc corners', { lay: 1, rc: pf.mat === 'si' ? 200 : 400 }]]) {
    const d = mk(o), r = K.evaluate(l, d);
    ok(!r.drc.length, `${pid} ${tag}: feasible (${r.drc.join('|')})`); if (r.drc.length) continue;
    const Lexp = 29.9792458 * d.tau / r.ng * 1e4;
    ok(near(r.Lum, Lexp, 1e-6 * Lexp + 1), `${pid} ${tag}: path length = cτ/n_g (${r.Lum.toFixed(2)} vs ${Lexp.toFixed(2)} µm)`);
    ok(near(r.tauP, d.tau, 1e-6), `${pid} ${tag}: predicted delay ${r.tauP.toFixed(6)} ns`);
    let sum = 0; r.geo.segs.forEach((s) => { sum += s.t === 'L' ? Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]) : r.G.Lc0 + Math.PI / 2 * s.d; }); sum = 2 * sum + r.G.S(r.Ht).L;
    ok(near(sum, r.Lum, 1e-6 * r.Lum), `${pid} ${tag}: segment lengths add up to the path`);
    const [x0, y0, x1, y1] = r.bboxMM.map((v) => v * 1000); ok(x0 >= d.ec - 1e-6 && y0 >= d.ec - 1e-6 && x1 <= d.bw * 1000 - d.ec + 1e-6 && y1 <= d.bh * 1000 - d.ec + 1e-6, `${pid} ${tag}: bbox inside boundary − clearance`);
    ok(r.minR >= Math.min(d.rc, r.G.S(r.Ht).R) - 1e-9 && r.G.S(r.Ht).R >= d.rc - 1e-9, `${pid} ${tag}: S-bend radius ≥ R (${r.G.S(r.Ht).R.toFixed(1)} ≥ ${d.rc})`);
    ok(r.clr >= r.G.p * (1 - 1e-3), `${pid} ${tag}: S-bend clears the first loop by ≥ p (${r.clr.toFixed(2)} ≥ ${r.G.p.toFixed(2)} µm)`);
    ok(r.ports.every((q) => near(q.xy[0], d.ec, 1e-6) || near(q.xy[0], d.bw * 1000 - d.ec, 1e-6) || near(q.xy[1], d.ec, 1e-6) || near(q.xy[1], d.bh * 1000 - d.ec, 1e-6)), `${pid} ${tag}: ports on the clearance line`);
    const Ec = d.lay === 2 ? r.nJ === 0 && r.cornerConv === 0 : r.nJ > 0; ok(Ec, `${pid} ${tag}: junction conversion ${d.lay === 2 ? 'absent (Euler, curvature-continuous)' : 'counted (arc corners)'}`);
  }
  // rotation only: 10×30 and 30×10 with ports on the short edges are the same layout
  const a = K.evaluate(l, mk({})), b = K.evaluate(l, mk({ bp: 3, bw: 30, bh: 10 }));
  ok(near(a.IL, b.IL, 1e-9) && near(a.area, b.area, 1e-6) && a.N === b.N, `${pid}: 10×30 and 30×10 (short-edge ports) are rotations of each other`);
  const c = K.evaluate(l, mk({ port: 1 })); ok(Math.abs(c.area - a.area) > 1 || c.N !== a.N || Math.abs(c.Lum - a.Lum) > 0, `${pid}: E–W ports on the tall box change the layout (90° exits + reserved margin)`);
  // Mode B never exceeds its loss budget and reports which limit binds
  const B = K.evaluate(l, mk({ dm: 1, ilb: 10 })); ok(!B.drc.length && B.IL <= 10 + 0.05 && (B.limit === 'loss' || B.limit === 'area'), `${pid}: Mode B IL ${B.IL.toFixed(2)} ≤ 10 dB, limit ${B.limit}, τ ${B.tauP.toFixed(2)} ns`);
  // infeasible: a reason and alternatives, never a silent layout
  const bad = K.evaluate(l, mk({ env: 0.02, tau: 20 })); ok(bad.drc.length && /Infeasible/.test(bad.drc[0]) && bad.alts.length >= 2, `${pid}: infeasible target reported with alternatives`);
  const rule = K.evaluate(l, mk({ gap: pf.rules.gap / 2 })); ok(rule.drc.some((m) => /DRC 최소 간격/.test(m)), `${pid}: gap below the DRC rule is flagged`);
  // legacy cards stay usable by D-2 / B-1 (they rebuild a circular spiral from the card design)
  const leg = K._x.build(pf, mk({}), 2); ok(Number.isFinite(leg.IL), `${pid}: a rectangular-mode design keeps valid legacy keys for D-2 / B-1`);
}
console.log(`${n - fail}/${n} checks passed` + (G0 ? '' : ' (main spiral.js not available — legacy identity not checked)'));
process.exit(fail ? 1 : 0);
