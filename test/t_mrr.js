// Engine-level checks for the 2-3R microring modulator (no DOM). node test/t_mrr.js
//   physics: radius ↔ FSR, resonance condition, coupling ↔ Q, critical coupling, detuning ↔ transmission (Airy vs Lorentzian),
//            temperature ↔ resonance, photon lifetime / RC / detuning in the EO response, static vs dynamic OMA, heater P_2π,
//            self-heating stability sign, layout radius = resonance placement, process shifts, SiN = heterogeneous Si ring
//   learning: every guided step completes from engine results; card and export carry the layout radius
//   system: the MZM / MRR comparison is not one-sided; existing level specs are untouched (vs origin/main)
const load = require('./load.js'), path = require('path'), cp = require('child_process');
const G = load();
let fail = 0, n = 0;
const ok = (c, msg) => { n++; if (!c) { fail++; console.log('  FAIL', msg); } };
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const LV = (id, pid) => { const L = G.LEVELS.find((x) => x.id === id), S = G.PSPEC[pid][id]; return { ...L, ...S, pf: G.PLATFORMS[pid] }; };
G.GAME_LEV = (id) => LV(id, G.__pid);
const K = G.KINDS.mrr, X = K._x;
for (const pid of Object.keys(G.PLATFORMS)) {
  G.__pid = pid;
  const l = LV('2-3R', pid), pf = l.pf; G.PQ.setPlatform(pf.mat, pf.t, pf.rules);
  ok(l.s1 && l.s2 && l.fab && l.ref && l.start && l.st, `${pid}: 2-3R spec calibrated`);
  const ref = { ...l.ref }, lam = pf.lam;
  /* ---- resonance and FSR ---- */
  const fsrAt = (R) => X.analyse(l, { ...ref, R }, null, { noEye: true, natural: true }).fsr;
  const f6 = fsrAt(6), f12 = fsrAt(12), x0 = X.cross(pf);
  ok(near(f6 / f12, 2, 0.02), `${pid}: FSR ∝ 1/R (${(f6 * 1e3).toFixed(2)} vs ${(f12 * 1e3).toFixed(2)} nm)`);
  ok(near(f6, lam * lam / (x0.ng * 2 * Math.PI * 6), 1e-9), `${pid}: FSR = λ²/(n_g·2πR)`);
  { // the natural resonance of order m is where the all-pass phase is a multiple of 2π (dip of the spectrum)
    const c = X.core(l, { ...ref, R: 8 }, { natural: true }), B = c.B; let best = 1, at = 0;
    for (let i = -400; i <= 400; i++) { const lm = c.lamNat + i * 1e-6, t = X.allpass(B.a[0], B.t, 2 * Math.PI * (c.lamNat - lm) / B.fsr); if (t < best) { best = t; at = lm; } }
    const neffAt = x0.neff + c.dn[0] + (x0.neff - x0.ng) * (c.lamNat - lam) / lam;
    ok(near(at, c.lamNat, 2e-6) && near(neffAt * 2 * Math.PI * 8 / c.lay.m, c.lamNat, 1e-7), `${pid}: resonance m=${c.lay.m}: m·λ = n_eff(λ)·L (dip at ${(at * 1e3).toFixed(3)} nm)`);
  }
  /* ---- coupling and Q ---- */
  const qs = [0.14, 0.2, 0.26, 0.32, 0.4, 0.5].map((g) => { const r = X.analyse(l, { ...ref, g }, null, { noEye: true, R: 8 }); return { g, r }; });
  ok(qs.every((q, i) => !i || q.r.c.B.k2 < qs[i - 1].r.c.B.k2), `${pid}: κ² falls monotonically with the gap`);
  ok(qs.every((q, i) => !i || q.r.Qc > qs[i - 1].r.Qc), `${pid}: Q_c rises with the gap`);
  ok(qs.every((q) => q.r.QL <= Math.min(q.r.Qi, q.r.Qc) + 1e-6 && near(1 / q.r.QL, 1 / q.r.Qi + 1 / q.r.Qc, 0.03 / q.r.QL)), `${pid}: 1/Q_L ≈ 1/Q_i + 1/Q_c and Q_L ≤ min(Q_i, Q_c)`);
  { // critical coupling: bisect the gap for t = a → deepest dip
    let lo = 0.1, hi = 0.6; const f = (g) => { const c = X.core(l, { ...ref, g }, { R: 8 }); return c.B.t - c.B.a[0]; };
    for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (f(m) < 0) lo = m; else hi = m; }
    const rc = X.analyse(l, { ...ref, g: (lo + hi) / 2 }, null, { noEye: true, R: 8 });
    ok(rc.erRes > 30 && rc.regime === 'critical', `${pid}: critical coupling at g ≈ ${((lo + hi) / 2).toFixed(3)} µm gives a ${rc.erRes.toFixed(0)} dB dip`);
    const ru = X.analyse(l, { ...ref, g: hi + 0.08 }, null, { noEye: true, R: 8 }), ro = X.analyse(l, { ...ref, g: lo - 0.08 }, null, { noEye: true, R: 8 });
    ok(ru.regime === 'under' && ro.regime === 'over', `${pid}: wider gap → under-coupled, narrower → over-coupled`);
  }
  /* ---- detuning vs transmission: Airy ≈ Lorentzian T = 1 − D/(1 + x²) near resonance ---- */
  {
    const c = X.core(l, ref, {}), B = c.B, fw = c.lam / B.Q(B.a[0]).QL, T0 = X.allpass(B.a[0], B.t, 0), D = 1 - T0;
    let worst = 0; for (let x = -3; x <= 3; x += 0.25) { const T = X.allpass(B.a[0], B.t, 2 * Math.PI * (x * fw / 2) / B.fsr); worst = Math.max(worst, Math.abs(T - (1 - D / (1 + x * x)))); }
    ok(worst < 0.03, `${pid}: Airy vs Lorentzian 1 − D/(1+x²) within ${worst.toFixed(3)} for |x| ≤ 3`);
    const sl = (x) => { const e = 0.01; return Math.abs(X.allpass(B.a[0], B.t, 2 * Math.PI * ((x + e) * fw / 2) / B.fsr) - X.allpass(B.a[0], B.t, 2 * Math.PI * ((x - e) * fw / 2) / B.fsr)) / (2 * e); };
    let xm = 0, sm = 0; for (let x = 0.05; x <= 2; x += 0.01) { const s = sl(x); if (s > sm) { sm = s; xm = x; } }
    ok(near(xm, 1 / Math.sqrt(3), 0.04), `${pid}: maximum static slope at |x| ≈ 1/√3 = 0.58 (found ${xm.toFixed(2)})`);
  }
  /* ---- temperature vs resonance, heater ---- */
  {
    const c = X.core(l, ref, {}), dl = c.unheated(70) - c.unheated(0);
    ok(near(dl, c.dldT * 70, 1e-12) && c.dldT * 1e6 > 50 && c.dldT * 1e6 < 90, `${pid}: ∂λ/∂T = ${(c.dldT * 1e6).toFixed(1)} pm/K (Si rib, 50–90 pm/K)`);
    const a = X.analyse(l, { ...ref, R: 6 }, null, { noEye: true, R: 6 }), b = X.analyse(l, { ...ref, R: 12 }, null, { noEye: true, R: 12 });
    ok(near(a.P2pi, b.P2pi, 1e-9) && near(a.eff / b.eff, 2, 0.03), `${pid}: P_2π (${a.P2pi.toFixed(1)} mW) independent of R; nm/mW ∝ FSR`);
    ok(near(c.need(70), (ref.bm || 0) * 1e-3 - c.lay.resid, 2e-6), `${pid}: layout radius puts the unheated resonance bm = ${ref.bm} nm blue at 70 °C (${(c.need(70) * 1e3).toFixed(3)} nm, 1-nm grid residual ${(c.lay.resid * 1e3).toFixed(3)} nm)`);
    ok(near(c.need(0) - c.need(70), c.dldT * 70, 1e-6) || c.wrap, `${pid}: heater need grows by the drift from 70 to 0 °C`);
    ok(c.PhW <= c.H.P2pi + 1e-9, `${pid}: worst heater ≤ P_2π (one FSR reaches any order)`);
    ok(Math.abs(c.lay.R - ref.R) < ref.R * c.B.fsr / c.lam + 0.002 && Math.abs(Math.round(c.lay.R * 1000) - c.lay.R * 1000) < 1e-6, `${pid}: layout radius ${c.lay.R} µm on the 1-nm grid, within one FSR-step of the slider ${ref.R} µm`);
  }
  /* ---- dynamics: EO response, Q is not the bandwidth, static vs dynamic OMA ---- */
  {
    const r = K.evaluate(l, ref), c = r.c, eo = r.eo, q = X.rates(c, 0, c.Vm);
    ok(near(eo.fQ, 2.998e8 / (2 * c.lam * 1e-6 * r.QL) / 1e9, 0.08 * eo.fQ), `${pid}: f_Q = c/(2λQ_L) = ${eo.fQ.toFixed(1)} GHz`);
    const Tss = (v) => { const z = G.cx.div([0, q.mu], [-(X.rates(c, 0, v).gi + q.ge), X.rates(c, 0, v).Delta]), so = [1 + q.mu * z[1], -q.mu * z[0]]; return so[0] * so[0] + so[1] * so[1]; };
    ok(near(eo.slope / (c.P0 * 1e3), (Tss(c.Vm + 0.01) - Tss(c.Vm - 0.01)) / 0.02, 0.02 * Math.abs(eo.slope / (c.P0 * 1e3))), `${pid}: small-signal DC response = static dT/dV`);
    ok(near(r.eye.T0, r.T[0], 0.03) && near(r.eye.T3, r.T[3], 0.03), `${pid}: CMT steady state matches the Airy levels`);
    const a = K.evaluate(l, { ...ref, det: -0.5 }), b = K.evaluate(l, { ...ref, det: -1.2 });
    ok(near(a.QL, b.QL, 0.03 * a.QL) && Math.abs(a.bw - b.bw) > 0.1 * a.bw, `${pid}: same Q_L, different detuning → EO bandwidth ${a.bw.toFixed(0)} vs ${b.bw.toFixed(0)} GHz (Q alone does not set it)`);
    const lo = K.evaluate(l, { ...ref, dop: 0, vb: 0 }), hi = K.evaluate(l, { ...ref, dop: 0, vb: 3 });
    ok(hi.fRC > lo.fRC && hi.Cj < lo.Cj, `${pid}: reverse bias lowers C_j and raises f_RC (${lo.fRC.toFixed(0)} → ${hi.fRC.toFixed(0)} GHz)`);
    ok(r.omaDyn > 0 && r.oma > 0 && Math.abs(r.omaDynDbm - r.omaDbm) > 0.05, `${pid}: static OMA ${r.omaDbm.toFixed(2)} and dynamic (waveform extrema) ${r.omaDynDbm.toFixed(2)} dBm are distinct`);
    const lowQ = K.evaluate(l, { ...ref, g: ref.g - 0.04 }), hiQ = K.evaluate(l, { ...ref, g: ref.g + 0.08 });
    ok(hiQ.QL > lowQ.QL && hiQ.fQ < lowQ.fQ, `${pid}: higher Q (wider gap) → lower photon-lifetime limit`);
    ok(hiQ.er >= lowQ.er - 0.01 || hiQ.pen > lowQ.pen, `${pid}: higher Q trades static ER against high-speed penalty`);
  }
  /* ---- self-heating stability: blue side stable, red side regenerative ---- */
  {
    const blue = K.evaluate(l, { ...ref, det: -0.8 }), red = K.evaluate(l, { ...ref, det: 0.8 });
    ok(blue.gth < 0 && red.gth > 0, `${pid}: thermal loop gain blue ${blue.gth.toFixed(2)} (stable) / red ${red.gth.toFixed(2)} (regenerative)`);
    ok(K.q2(l, red) >= 1 || red.gth < 1, `${pid}: ★★ rejects a runaway red-side point`);
  }
  /* ---- process: resonance moves by λΔn/n_g, gap shrinks with CD ---- */
  {
    const c0 = X.core(l, ref, {}), c1 = X.core(l, ref, { proc: { dw: 0.01, dt: 0, seed: null } });
    const exp = lam * (X.cross(pf, 0.01, 0).neff - X.cross(pf).neff) / X.cross(pf, 0.01, 0).ng;
    ok(near(c1.lamNat - c0.lamNat, exp, 0.03 * Math.abs(exp)), `${pid}: +10 nm width shifts the resonance by ${((c1.lamNat - c0.lamNat) * 1e3).toFixed(2)} nm (≈ λΔn/n_g)`);
    ok(near(c1.B.gap, ref.g - 0.01, 1e-12) && c1.B.k2 > c0.B.k2, `${pid}: wider guides close the gap and raise κ²`);
  }
  /* ---- SiN platforms: heterogeneously integrated Si ring (same Si physics) ---- */
  if (pf.mat === 'sin') { const si = Object.values(G.PLATFORMS).find((p) => p.mat === 'si' && p.lam === pf.lam); ok(near(X.cross(pf).neff, X.cross(si).neff, 1e-12), `${pid}: SiN platform uses the Si rib ring (no PN model on SiN)`); ok(/이종 집적/.test(K.meta(l, K.evaluate(l, ref))), `${pid}: the heterogeneous-Si assumption is shown`); }
  /* ---- guided steps complete from engine results ---- */
  {
    const st = K.steps(l), [s1, s2, s3, s4, s5, s6] = st;
    ok(st.length === 6 && s6.full, `${pid}: five learning steps + Full Design`);
    const Rt = 2 * Math.PI * 0 + lam * lam / (x0.ng * l.st.fsr * 1e-3) / (2 * Math.PI);
    const d1 = { ...l.start, R: +Rt.toFixed(2) }; ok(s1.done(l, s1.evaluate(l, d1), {}), `${pid}: step 1 done at R = λ²/(n_g·2π·FSR) = ${d1.R} µm`);
    ok(!s1.done(l, s1.evaluate(l, l.start), {}), `${pid}: step 1 not done at the start design`);
    const mem2 = {}; let r2; for (const g of [0.5, 0.45, 0.4, 0.35, 0.3, 0.25, 0.2, 0.15, 0.12]) { r2 = s2.evaluate(l, { ...d1, g }); s2.observe(l, r2, mem2); }
    let best = null; for (let g = 0.1; g <= 0.5; g += 0.005) { const r = s2.evaluate(l, { ...d1, g: +g.toFixed(3) }); s2.observe(l, r, mem2); if (!best || r.erRes > best.erRes) best = r; }
    ok(s2.done(l, best, mem2), `${pid}: step 2 done after under/critical/over and a ${best.erRes.toFixed(0)} dB dip`);
    ok(s3.done(l, s3.evaluate(l, ref), {}), `${pid}: step 3 (static modulation) done with the reference design`);
    ok(s4.done(l, s4.evaluate(l, ref), {}), `${pid}: step 4 (112 GBd PAM4) done with the reference design`);
    const mem5 = {};
    for (const T of [2, 35, 68]) {   // recover each temperature with the heater the coach would compute
      const base = { ...ref, ...s5.init(l, ref), sT: T, sP: 0 }, r0 = s5.evaluate(l, base), Ph = +r0.Pneed.toFixed(2);
      const r = s5.evaluate(l, { ...base, sP: Ph }); s5.observe(l, r, mem5);
      ok(r.ok, `${pid}: step 5 recovers ${T} °C with ${Ph} mW (x ${r.detEff.toFixed(2)} vs ${ref.det})`);
    }
    ok(s5.done(l, null, mem5), `${pid}: step 5 done after cold / mid / hot recovery within budget`);
  }
  /* ---- full design: reference meets ★ and ★★; card and export carry the layout geometry ---- */
  {
    const r = K.evaluate(l, ref);
    ok(K.q1(l, r) <= 1 && K.q2(l, r) <= 1, `${pid}: reference meets ★ (q ${K.q1(l, r).toFixed(2)}) and ★★ (q ${K.q2(l, r).toFixed(2)})`);
    const s = K.evaluate(l, l.start); ok(K.q2(l, s) > 1, `${pid}: start design does not already meet ★★`);
    const cd = K.card(l, r); ok(cd.kind === 'mrr' && Object.values(cd.model).every((v) => Number.isFinite(v)), `${pid}: card model is complete`);
    const ex = K.exportGeom(l, r); ok(ex.R_um === r.Rlay && ex.gap_um === ref.g && ex.order_m === r.m, `${pid}: export carries the layout radius ${ex.R_um} µm, gap and order`);
    const cmp = K.panel(l, r, { stars: 1, hasCard: true, run: true });
    ok(cmp && /MZM이 유리:<\/b> (?!—)/.test(cmp.html) && /MRR이 유리:<\/b> (?!—)/.test(cmp.html), `${pid}: comparison shows advantages on both sides`);
  }
}
/* ---- existing level specs untouched ---- */
{
  // baseline = main before the microring (f08011b); Phase B only adds the 3A+ modulator key (mod 0 = the old design) to start / ref
  const BL = require('./baseline.js'), src = BL.need('f08011b', 'src/data/pspec.json'), ID = BL.identity('test:mrr spec identity', 'f08011b', 1), now = G.PSPEC;
  if (src) { const old = JSON.parse(src);
  const norm = (id, v) => { if (id !== '3A+' || !v) return v; const c = JSON.parse(JSON.stringify(v)); for (const k of ['start', 'ref']) if (c[k] && c[k].mod === 0) delete c[k].mod; return c; };
  let same = true; for (const p of Object.keys(old)) for (const id of Object.keys(old[p])) if (JSON.stringify(old[p][id]) !== JSON.stringify(norm(id, now[p][id]))) { same = false; console.log('  changed', p, id); }
  ID.hit(); ok(same, 'existing level specs identical to f08011b (only 2-3R added; 3A+ start/ref gain mod 0)'); }
  ok(ID.done(), 'the spec identity check ran');
}
console.log(`${n - fail}/${n} checks passed`); process.exit(fail ? 1 : 0);
