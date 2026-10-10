// ===== Kind: all-pass microring modulator (Si rib ring, lateral PN depletion junction, integrated TiN heater) =====
// Cross-section: EIM rib (vertical TE slabs 220 / 90 nm → lateral slab with TM boundary conditions): n_eff, n_g, ∂n/∂T, ∂n/∂w, ∂n/∂t.
// Ring: all-pass response T = (a² − 2at·cosφ + t²)/(1 − 2at·cosφ + a²t²) with field self-coupling t and round-trip field a;
//   Q_i = πn_gL√a/(λ(1−a)), Q_c = πn_gL√t/(λ(1−t)), Q_L = πn_gL√(at)/(λ(1−at))  (Bogaerts et al., Laser Photon. Rev. 6, 47 (2012)).
//   Bus–ring coupling: coupled-slab κ(d) = κ₀e^{−γd} (Marcuse) integrated over the curved gap d(z) = g + z²/2R → κ_f = sin(κ₀e^{−γg}√(2πR/γ)).
//   Bend radiation: Marcuse slab formula on the EIM lateral slab (rib core vs 90-nm slab).
// Junction: the 2-2 PN phase-shifter physics (Soref–Bennett plasma dispersion, depletion approximation, same doping / geometry)
//   gives Δn_eff(V), α_FCA(V), C′(V), R′; it covers a fraction η of the circumference (the rest is the coupling region).
// Dynamics: temporal coupled-mode theory (Haus) da/dt = (jΔ(t) − 1/τ(t))·a − jμs driven by the RC-filtered PAM4 drive
//   (exact exponential stepping); small-signal EO response from the linearised CMT (Sacher & Poon, Opt. Express 16, 15741 (2008))
//   × the junction RC pole — the modulation bandwidth is set by photon lifetime, detuning and RC together, never by Q alone.
// Thermal: ∂λ/∂T = λ(∂n_eff/∂T)/n_g; heater P_2π = 2P_π = λG′/(∂n_eff/∂T) from the 2-1 thermal cross-section (Si stack), red-only tuning,
//   one FSR covers every resonance order; self-heating from the absorbed (FCA + TPA) part of the dropped power, open-loop thermal gain.
// SiN platforms: the modulator is a heterogeneously integrated Si rib ring (same assumption as 2-2); no PN model is applied to SiN.
KINDS.mrr = (() => {
  const C = 2.998e8, PIN = 13, BAUD = 112, FDRV = 70, RSRC = 50, ETA = 0.75, SWL = 0.15, BUS = 0.3, T_RIB = 0.22, T_SLAB = 0.09;
  const DNDT = { si: 1.86e-4, ox: 0.95e-5 }, TREF = 25, ALPHA_M = 1.0e4, HCOV = 0.85;
  const BETA = (lam) => (lam < 1.4 ? 0.9 : 0.8) * 1e-11;   // Si TPA coefficient (m/W): ≈0.8–0.9 cm/GW at telecom wavelengths (Bristow et al. 2007, literature value; assumption)
  const AEFF = (lam) => (lam < 1.4 ? 0.13 : 0.16) * 1e-12;   // rib-mode effective area (m², estimate)
  const wr = (pf) => (pf.lam < 1.4 ? 0.45 : 0.5);              // same rib as the 2-2 phase shifter
  const TRng = (l) => l.tr || [0, 70];
  const cards = () => (typeof window !== 'undefined' ? window.GAME_CARDS : global.GAME_CARDS) || {};
  function slab(n1, n0, t, lam, tm) {
    const k0 = 2 * Math.PI / lam; let lo = n0 + 1e-9, hi = n1 - 1e-9;
    for (let i = 0; i < 70; i++) { const m = 0.5 * (lo + hi), ka = k0 * Math.sqrt(n1 * n1 - m * m), ga = k0 * Math.sqrt(m * m - n0 * n0), ph = ka * t / 2; const f = ph >= Math.PI / 2 ? 1e9 : ka * Math.tan(ph) - (tm ? (n1 * n1) / (n0 * n0) : 1) * ga; if (f > 0) lo = m; else hi = m; }
    return 0.5 * (lo + hi);
  }
  /* ---------- rib cross-section (cached) ---------- */
  const XC = new Map();
  function cross(pf, dw, dt) {
    dw = dw || 0; dt = dt || 0;
    const key = pf.id + '|' + dw.toFixed(5) + '|' + dt.toFixed(5); let r = XC.get(key); if (r) return r;
    const lam = pf.lam, w = wr(pf) + dw;
    const ne = (ll, dT, ddw, ddt) => { const n1 = PQ.nSi(ll) + DNDT.si * dT, n0 = PQ.nOx(ll) + DNDT.ox * dT, a = slab(n1, n0, T_RIB + dt + ddt, ll, false), b = slab(n1, n0, T_SLAB + dt + ddt, ll, false); return { n: slab(a, b, w + ddw, ll, true), a, b }; };
    const x = ne(lam, 0, 0, 0), n0 = x.n;
    const ng = n0 - lam * (ne(lam + 0.005, 0, 0, 0).n - ne(lam - 0.005, 0, 0, 0).n) / 0.01;
    const dndT = (ne(lam, 10, 0, 0).n - n0) / 10, dndw = (ne(lam, 0, 0.01, 0).n - ne(lam, 0, -0.01, 0).n) / 0.02, dndt = (ne(lam, 0, 0, 0.004).n - ne(lam, 0, 0, -0.004).n) / 0.008;
    const k0 = 2 * Math.PI / lam, g = k0 * Math.sqrt(Math.max(n0 * n0 - x.b * x.b, 1e-9)), h = k0 * Math.sqrt(Math.max(x.a * x.a - n0 * n0, 1e-9)), b = k0 * n0;
    const C1 = g * g * h * h * Math.pow(Math.cos(h * w / 2), 2) * Math.exp(g * w) / (b * (1 + g * w / 2) * (x.a * x.a - x.b * x.b) * k0 * k0), U = (2 / 3) * g * g * g / (b * b);
    const kap0 = 2 * h * h * g / (b * (w + 2 / g) * (h * h + g * g));
    const gv = k0 * Math.sqrt(Math.max(n0 * n0 - PQ.nOx(lam) * PQ.nOx(lam), 1e-9));   // vertical decay into the top oxide (heater metal absorption)
    r = { lam, w, neff: n0, ng, dndT, dndw, dndt, g, h, b, C1, U, kap0, gv, nrib: x.a, nslab: x.b };
    if (XC.size > 3000) XC.clear(); XC.set(key, r);
    return r;
  }
  const bendDBmm = (x, R) => Math.min(1e3, 4.343 * x.C1 * Math.exp(-x.U * R) * 1e3);     // dB/mm at radius R (µm)
  const kapF = (x, R, gap) => Math.sin(Math.min(x.kap0 * Math.exp(-x.g * Math.max(gap, 0.02)) * Math.sqrt(2 * Math.PI * R / x.g), Math.PI / 2));   // field cross-coupling κ
  /* ---------- junction: 2-2 PN physics on a 0.1-V grid (cached per design / die) ---------- */
  const PNC = new Map();
  function pnTab(pf, pnD, proc) {
    const key = pf.id + JSON.stringify(pnD) + (proc && proc.seed != null ? '|' + proc.seed : '');
    let t = PNC.get(key); if (t) return t;
    const l = { pf }, V = [], dn = [], al = [];
    for (let i = 0; i <= 60; i++) { const v = i * 0.1, o = KINDS.pn._x.optical(l, pnD, v, proc); V.push(v); dn.push(o.dn); al.push(o.alpha); }
    const A = KINDS.pn._x.analyse(l, pnD, proc), cp = new Map();
    t = { V, dn, al, Rp: A.Rp, pnD,
      at(arr, v) { const x = clamp(v, 0, 5.999) / 0.1, i = Math.floor(x), f = x - i; return arr[i] + (arr[i + 1] - arr[i]) * f; },
      Cp(v) { const k = v.toFixed(3); if (!cp.has(k)) cp.set(k, KINDS.pn._x.analyse(l, { ...pnD, vb: clamp(v, 0, 5) }, proc).Cp); return cp.get(k); } };
    if (PNC.size > 400) PNC.clear(); PNC.set(key, t);
    return t;
  }
  // the 2-2 lateral junction (card or reference), optionally with both dopings raised by `dop` decades (ring junctions are usually
  // doped harder than MZM ones: more pm/V and lower R, at the cost of free-carrier loss and C) — same Soref–Bennett / depletion model
  function pnDesign(l, d) {
    const c = cards()['2-2'], base = d.useCard && c && c.d ? { ...c.d, src: '내 2-2 카드' } : { ...(l.pnD || { na: 17.6, nd: 17.8, xj: 0.05, vb: 0.7, dc: 0.4 }), src: '기준 2-2 위상기' };
    const dop = d.dop || 0; delete base.src;
    return { na: +Math.min(18.7, base.na + dop).toFixed(3), nd: +Math.min(18.7, base.nd + dop).toFixed(3), xj: base.xj, vb: base.vb, dc: base.dc };
  }
  const pnSrc = (l, d) => { const c = cards()['2-2']; return (d.useCard && c && c.d ? '내 2-2 카드' : '기준 2-2 위상기') + ((d.dop || 0) > 0 ? ` (도핑 +${(+d.dop).toFixed(2)} decade)` : ''); };
  function heaterDesign(l, d) { const c = cards()['2-1']; return d.useHeater && c && c.d ? { h: c.d.h, iso: c.d.iso | 0, src: '내 2-1 카드' } : { ...(l.hd || { h: 1.0, iso: 0 }), src: '기준 2-1 히터' }; }
  function heater(pf, x, hd) {   // ring heater: G′ from the Si-stack thermal cross-section; P_π = λG′/(2∂n/∂T), P_2π = 2P_π (one FSR)
    const th = KINDS.to._x.thermal({ pf: { mat: 'si' } }, hd.h, hd.iso | 0), Gp = 1 / th.dTcore, Ppi = pf.lam * 1e-6 * Gp / (2 * x.dndT) * 1e3;
    return { Gp, Ppi, P2pi: 2 * Ppi, tau: th.tau * 1e6, metal: ALPHA_M * Math.exp(-2 * x.gv * hd.h) * 1e-1 };   // metal: dB/mm under the heater
  }
  const allpass = (a, t, phi) => { const c = Math.cos(phi); return (a * a - 2 * a * t * c + t * t) / (1 - 2 * a * t * c + a * a * t * t); };
  const circ = (a, t, k2, phi) => k2 / (1 - 2 * a * t * Math.cos(phi) + a * a * t * t);   // circulating / bus power

  /* ---------- layout radius: the order-m resonance placed at the design wavelength (1-nm layout grid) ---------- */
  // n(λ) ≈ n₀ + δn + (n₀ − n_g)(λ − λ₀)/λ₀ → resonance m: L = mλ/(n_g + δn + (n₀ − n_g)λ/λ₀)
  function layout(l, d, x, dn0, lamT) {
    const lam0 = l.pf.lam, L0 = 2 * Math.PI * d.R, den = x.ng + dn0 + (x.neff - x.ng) * lamT / lam0;
    const m = Math.max(1, Math.round(L0 * den / lamT)), R = Math.round(m * lamT / den / (2 * Math.PI) * 1000) / 1000;
    return { m, R, L: 2 * Math.PI * R, resid: lamRes(l.pf, x, 2 * Math.PI * R, m, dn0) - lamT };   // resid: λ error from the 1-nm grid (µm)
  }

  /* ---------- static operating point ---------- */
  // resonance m of a ring of length L (µm) on cross-section x with junction index change dn0: λ = L(n_g + δn)/(m − L(n₀ − n_g)/λ₀)
  const lamRes = (pf, x, L, m, dn0) => L * (x.ng + dn0) / (m - L * (x.neff - x.ng) / pf.lam);
  // env: { proc, R (explicit radius), noAlign (slider radius), natural (resonance where the geometry puts it), lamR0 (explicit level-0 resonance, µm), sL (laser trim, pm), Pin (input dBm; default 13) }
  // The layout radius is always designed at the level's 13 dBm input (it is the drawn part); Pin only changes the operating point.
  function core(l, d, env) {
    env = env || {};
    const pf = l.pf, lam = pf.lam, proc = env.proc || null, P0 = 1e-3 * Math.pow(10, (env.Pin != null ? env.Pin : PIN) / 10), tr = TRng(l);   // env.Pin: modulator input (dBm), e.g. inside a module
    const dw = proc ? proc.dw || 0 : 0, dt = proc ? (proc.dt || 0) * 0.006 / (pf.dt || 0.006) : 0;   // Si-layer thickness spread on every platform
    const pnD = pnDesign(l, d), hd = heaterDesign(l, d), xN = cross(pf), x = proc ? cross(pf, dw, dt) : xN;
    const tabN = pnTab(pf, pnD, null), tab = proc ? pnTab(pf, pnD, proc) : tabN;
    const V = [0, 1, 2, 3].map((k) => d.vb + d.vpp * k / 3), Vm = d.vb + d.vpp / 2;
    const dn = V.map((v) => ETA * tab.at(tab.dn, v)), dnN0 = ETA * tabN.at(tabN.dn, d.vb);
    // env.gs: thermal-model sensitivity only (v1.0 comparison panels) — scales the ring's thermal conductance G′, so heater power
    // (∝ G′), self-heating (∝ 1/G′) and the thermal loop gain move together; the drawn ring (designLayout) is unchanged
    const H0 = heater(pf, x, hd), H = env.gs && env.gs !== 1 ? { ...H0, Gp: H0.Gp * env.gs, Ppi: H0.Ppi * env.gs, P2pi: H0.P2pi * env.gs } : H0, lamL = lam + (env.sL || 0) * 1e-6;
    // radius: explicit, slider, or the design layout (order-m resonance placed for the temperature range; process-free)
    const R = env.R || (env.noAlign || env.natural ? d.R : designLayout(l, d).R), L = 2 * Math.PI * R;
    const lay = env.R || env.noAlign || env.natural ? { R, m: Math.max(1, Math.round(L * (x.neff + dn[0]) / lam)), resid: 0 } : designLayout(l, d);
    const gap = d.g - dw, kf = kapF(x, R, gap), t = Math.sqrt(1 - kf * kf), k2 = kf * kf, bend = bendDBmm(x, R);
    const alp = V.map((v) => ETA * (tab.at(tab.al, v) + SWL) + (1 - ETA) * SWL + bend + HCOV * H.metal);   // dB/mm without TPA
    const fsr = lam * lam / (x.ng * L), T_rt = x.ng * L * 1e-6 / C;
    const aLin = alp.map((al) => Math.pow(10, -al * L * 1e-3 / 20));
    const QLlin = Math.PI * x.ng * L * Math.sqrt(aLin[0] * t) / (lam * (1 - aLin[0] * t)), fw = lam / QLlin;   // µm, cold linear linewidth
    // level-0 resonance while operating: heater-locked at δ linewidths from the laser, explicit, or where the geometry puts it
    const lamNat = lamRes(pf, x, L, lay.m, dn[0]);
    const lamR0 = env.lamR0 != null ? env.lamR0 : env.natural ? lamNat : lamL - d.det * fw / 2;   // det = x = 2(λ_L − λ_r)/FWHM
    const sh = dn.map((v) => lam * (v - dn[0]) / x.ng), lamOpX = (k) => lamR0 + sh[k];
    // TPA from the circulating power (three fixed-point passes)
    let atp = [0, 0, 0, 0], a = aLin, T = [], Pc = [];
    for (let it = 0; it < 3; it++) {
      a = alp.map((al, k) => Math.pow(10, -(al + atp[k]) * L * 1e-3 / 20)); T = []; Pc = [];
      for (let k = 0; k < 4; k++) { const ph = 2 * Math.PI * (lamOpX(k) - lamL) / fsr; T.push(allpass(a[k], t, ph)); Pc.push(P0 * circ(a[k], t, k2, ph)); }
      atp = Pc.map((p) => 4.343 * BETA(lam) * p / AEFF(lam) * 1e-3);   // dB/mm
    }
    const B = { L, R, gap, kf, t, k2, bend, alp, fsr, T_rt, atp, a, T, Pc, lamL, lamOpX, sh,
      Q: (aa) => ({ Qi: Math.PI * x.ng * L * Math.sqrt(aa) / (lam * (1 - aa)), QL: Math.PI * x.ng * L * Math.sqrt(aa * t) / (lam * (1 - aa * t)) }), Qc: Math.PI * x.ng * L * Math.sqrt(t) / (lam * (1 - t)) };
    // self-heating: the absorbed (FCA + TPA) part of the dropped power, averaged over the four levels (thermal τ ≫ symbol)
    const heatFrac = (k) => (ETA * tab.at(tab.al, V[k]) + atp[k]) / Math.max(alp[k] + atp[k], 1e-9);
    const Pabs = [0, 1, 2, 3].reduce((s, k) => s + P0 * (1 - T[k]) * heatFrac(k), 0) / 4;   // W
    const dldT = lam * x.dndT / x.ng, selfK = Pabs / (H.Gp * L * 1e-6), lamSelf = dldT * selfK;
    // unheated level-0 resonance of this ring at temperature T (incl. its self-heating at the operating point)
    const unheated = (Tc) => lamNat + dldT * (Tc - TREF) + lamSelf;
    // red-only heater; one FSR reaches the next order. Nominal operating point = the laser at δ linewidths (no trim)
    const lamOp = lam - d.det * fw / 2;
    const need = (Tc) => { const s = lamOp - unheated(Tc); return ((s % fsr) + fsr) % fsr; };
    const sHot = lamOp - unheated(tr[1]), sCold = lamOp - unheated(tr[0]), wrap = Math.floor(sHot / fsr) !== Math.floor(sCold / fsr);
    const needMax = wrap ? fsr : Math.max(need(tr[0]), need(tr[1]));
    let na = 0; for (let i = 0; i <= 14; i++) na += need(tr[0] + (tr[1] - tr[0]) * i / 14); na /= 15;
    return { pf, lam, P0, V, Vm, dn, dnN0, tab, pnD: { ...pnD, src: pnSrc(l, d) }, hd, H, x, xN, lay, B, fw, lamOp, lamNat, dldT, lamSelf, selfK, Pabs, need, needMax, PhW: needMax / fsr * H.P2pi, PhA: na / fsr * H.P2pi, wrap, unheated, dw, dt, d };
  }
  // design layout: slider radius → linewidth & self-heating → the order-m resonance whose unheated position at T_max is bm nm blue
  // of the operating point; the radius is snapped to the 1-nm layout grid (the residual is carried as a resonance offset)
  const LAYC = new Map();
  function designLayout(l, d) {
    const key = l.pf.id + JSON.stringify(d) + JSON.stringify(pnDesign(l, d)) + JSON.stringify(heaterDesign(l, d)) + String(l.tr || '');
    let r = LAYC.get(key); if (r) return r;
    const tr = TRng(l), target = (c) => c.lamOp - (d.bm || 0) * 1e-3 - c.lamSelf - c.dldT * (tr[1] - TREF);
    let c0 = core(l, d, { noAlign: true });
    r = layout(l, d, c0.xN, c0.dnN0, target(c0));
    // refine once on the layout radius (linewidth and self-heating move slightly with R), keeping the order m
    c0 = core(l, d, { R: r.R });
    { const lamT = target(c0), den = c0.xN.ng + c0.dnN0 + (c0.xN.neff - c0.xN.ng) * lamT / l.pf.lam, R = Math.round(r.m * lamT / den / (2 * Math.PI) * 1000) / 1000;
      r = { m: r.m, R, L: 2 * Math.PI * R, resid: lamRes(l.pf, c0.xN, 2 * Math.PI * R, r.m, c0.dnN0) - lamT }; }
    if (LAYC.size > 2000) LAYC.clear(); LAYC.set(key, r);
    return r;
  }

  /* ---------- static metrics ---------- */
  function statics(c) {
    const B = c.B, T = B.T, eff = Math.pow(10, -BUS / 10), qq = B.Q(B.a[0]), fwhm = c.lam / qq.QL;
    const hi = Math.max(T[0], T[3]), lo = Math.min(T[0], T[3]);
    const oma = c.P0 * 1e3 * eff * Math.abs(T[3] - T[0]);   // mW
    const sgn = Math.sign(T[3] - T[0]) || 1, steps = [T[1] - T[0], T[2] - T[1], T[3] - T[2]], mono = steps.every((s) => s * sgn > 0);
    const rlm = mono ? Math.min(...steps.map(Math.abs)) / (Math.abs(T[3] - T[0]) / 3) : 0;
    const shiftPmV = c.lam * (c.dn[3] - c.dn[0]) / c.x.ng / (c.d.vpp || 1e-9) * 1e6;
    const regime = Math.abs(B.t - B.a[0]) < 0.25 * (1 - B.a[0]) ? 'critical' : B.t > B.a[0] ? 'under' : 'over';
    const erRes = -10 * Math.log10(Math.max(allpass(B.a[0], B.t, 0), 1e-7));   // on-resonance extinction (level 0)
    return { T, oma, omaDbm: 10 * Math.log10(Math.max(oma, 1e-9)), er: 10 * Math.log10(hi / Math.max(lo, 1e-9)), IL: -10 * Math.log10(Math.max(hi, 1e-9)) + BUS, mono, rlm, sgn,
      Qi: qq.Qi, Qc: B.Qc, QL: qq.QL, fwhm, fsr: B.fsr, finesse: B.fsr / fwhm, shiftPmV, regime, erRes };
  }
  /* ---------- rates for coupled-mode theory (SI, per second) ---------- */
  function rates(c, k, v) {   // level k (or explicit voltage v) → { Δ (rad/s), gi, ge (field decay 1/s), mu }
    const B = c.B, tab = c.tab, lam = c.lam * 1e-6, T_rt = B.T_rt;
    const vv = v != null ? v : c.V[k];
    const dnv = ETA * tab.at(tab.dn, vv), alp = ETA * (tab.at(tab.al, vv) + SWL) + (1 - ETA) * SWL + B.bend + HCOV * c.H.metal + B.atp.reduce((s, x) => s + x, 0) / 4;
    const a = Math.pow(10, -alp * B.L * 1e-3 / 20), lamR = (B.lamOpX(0) + c.lam * (dnv - c.dn[0]) / c.x.ng) * 1e-6;
    const ge = B.k2 / (2 * T_rt), gi = (1 - a * a) / (2 * T_rt), Delta = 2 * Math.PI * C * (B.lamL * 1e-6 - lamR) / (lam * lam);
    return { Delta, gi, ge, mu: Math.sqrt(2 * ge), a };
  }
  /* ---------- small-signal EO response (linearised CMT × junction RC pole) ---------- */
  function eoResp(c) {
    const Vm = c.Vm, r0 = rates(c, 0, Vm), dv = 0.02, rp = rates(c, 0, Vm + dv), rm = rates(c, 0, Vm - dv);
    const dD = (rp.Delta - rm.Delta) / (2 * dv), dG = (rp.gi - rm.gi) / (2 * dv);   // per volt
    const g = r0.gi + r0.ge, D = r0.Delta, mu = r0.mu;
    const a0 = cx.div([0, mu], [-g, D]);                     // a0 = jμ/(jΔ − 1/τ)
    const so = cx.sub([1, 0], cx.mul([0, mu], a0));          // s_out0 = 1 − jμa0
    const Cj = c.tab.Cp(Vm) * ETA * c.B.L * 1e-3 * 1e-12, Rj = c.tab.Rp / (ETA * c.B.L * 1e-3), tRC = (RSRC + Rj) * Cj;
    const H = (fG) => {
      const W = 2 * Math.PI * fG * 1e9;
      const da = cx.div(cx.mul([-dG, dD], a0), [g, W - D]);                     // (jδω − δγ)a0 / (jΩ − jΔ + g)
      const dac = cx.div(cx.mul([-dG, -dD], [a0[0], -a0[1]]), [g, W + D]);       // (−jδω − δγ)a0* / (jΩ + jΔ + g)
      const dP = cx.add(cx.mul([so[0], -so[1]], cx.mul([0, -mu], da)), cx.mul(so, cx.mul([0, mu], dac)));
      return cx.div(dP, [1, W * tRC]);
    };
    const h0 = cx.abs(H(0.01)) || 1e-12, hs = []; let bw = 200;
    for (let f = 1; f <= 200; f += f < 60 ? 1 : 2) { const v = cx.abs(H(f)) / h0; hs.push([f, v]); if (bw === 200 && v < Math.SQRT1_2) { const p = hs.length > 1 ? hs[hs.length - 2] : [0, 1]; bw = p[0] + (p[1] - Math.SQRT1_2) / Math.max(p[1] - v, 1e-9) * (f - p[0]); } }
    const fRC = 1 / (2 * Math.PI * tRC) / 1e9, fQ = g / (2 * Math.PI) / 1e9;   // fQ: on-resonance photon-lifetime limit c/(2λQ_L)
    const pk = Math.max(...hs.map((h) => h[1]));
    return { bw, fRC, fQ, Cj, Rj, tRC, hs, slope: h0 * c.P0 * 1e3, peak: 20 * Math.log10(pk), Hn: (f) => cx.abs(H(f)) / h0 };
  }
  /* ---------- 112 GBd PAM4 through the ring (time-domain CMT) ---------- */
  const drv = (f) => { const x = f / FDRV; return cx.div([1, 0], [1 - x * x, Math.SQRT2 * x]); };
  function eyeSim(c, eo, opt) {
    opt = opt || {};
    const nsym = opt.nsym || 128, sps = 16, n = nsym * sps, r = mulberry(1234), sym = [];
    for (let i = 0; i < nsym; i++) sym.push([-3, -1, 1, 3][Math.floor(r() * 4)]);
    const re = new Float64Array(n), im = new Float64Array(n);
    for (let i = 0; i < n; i++) re[i] = sym[Math.floor(i / sps)] / 3;
    fftInPlace(re, im, false);
    const binG = BAUD * sps / n;
    for (let k = 0; k < n; k++) { const f = (k <= n / 2 ? k : k - n) * binG, af = Math.abs(f), h0 = cx.div(drv(af), [1, af * 1e9 * 2 * Math.PI * eo.tRC]), hi = f < 0 ? -h0[1] : h0[1], a = re[k], b = im[k]; re[k] = a * h0[0] - b * hi; im[k] = a * hi + b * h0[0]; }
    fftInPlace(re, im, true);
    // voltage → (Δ, γ) lookup on a fine grid
    const vmin = c.d.vb - 0.3 * c.d.vpp, vmax = c.d.vb + 1.3 * c.d.vpp, NV = 120, LUT = [];
    for (let i = 0; i <= NV; i++) { const v = Math.max(0, vmin + (vmax - vmin) * i / NV), q = rates(c, 0, v); LUT.push(q); }
    const look = (v) => { const xx = clamp((v - vmin) / (vmax - vmin), 0, 1) * NV, i = Math.min(NV - 1, Math.floor(xx)), f = xx - i, A = LUT[i], B2 = LUT[i + 1]; return [A.Delta + (B2.Delta - A.Delta) * f, A.gi + (B2.gi - A.gi) * f]; };
    const mu = LUT[0].mu, ge = LUT[0].ge, h = 1 / (BAUD * 1e9 * sps);
    // per-sample propagator for piecewise-constant coefficients: a ← a·e^{ch} + (−jμ)(e^{ch} − 1)/c, c = jΔ − 1/τ (exact)
    const ER = new Float64Array(n), EI = new Float64Array(n), PR = new Float64Array(n), PI = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const [D, gi] = look(c.d.vb + c.d.vpp * (re[i] + 1) / 2), cr = -(gi + ge), ci = D;
      const e = Math.exp(cr * h), er = e * Math.cos(ci * h), ei = e * Math.sin(ci * h), den = cr * cr + ci * ci, nr = er - 1, ni = ei, qr = (nr * cr + ni * ci) / den, qi = (ni * cr - nr * ci) / den;
      ER[i] = er; EI[i] = ei; PR[i] = mu * qi; PI[i] = -mu * qr;
    }
    // start from the steady state of the first sample, run two periods, keep the second
    let ar = 0, ai = 0;
    { const [D0, gi0] = look(c.d.vb + c.d.vpp * (re[0] + 1) / 2), z = cx.div([0, mu], [-(gi0 + ge), D0]); ar = z[0]; ai = z[1]; }
    const out = new Float64Array(n);
    for (let pass = 0; pass < 2; pass++) for (let i = 0; i < n; i++) {
      const tr = ar * ER[i] - ai * EI[i] + PR[i], ti = ar * EI[i] + ai * ER[i] + PI[i]; ar = tr; ai = ti;
      if (pass === 1) { const sr = 1 + mu * ai, si = -mu * ar; out[i] = sr * sr + si * si; }
    }
    // normalise with the CMT steady state of the outer levels (static OMA in the same model)
    const ss = (v) => { const [D, gi] = look(v), z = cx.div([0, mu], [-(gi + ge), D]), so = [1 + mu * z[1], -mu * z[0]]; return so[0] * so[0] + so[1] * so[1]; };
    const T0 = ss(c.V[0]), T3 = ss(c.V[3]), mid = (T0 + T3) / 2, half = (T3 - T0) / 2 || 1e-9;
    const y = Array.from(out, (v) => (v - mid) / half);
    const at = (i) => y[((i % n) + n) % n];
    const ntap = 5, hh = 2;
    let best = { ratio: -Infinity, ph: 0, c: [1], ne: 1, lv: null }, dynFrac = -Infinity;
    const mean = (a) => a.reduce((s, v) => s + v, 0) / Math.max(a.length, 1);
    for (let ph = 0; ph < sps; ph++) {
      const A = Array.from({ length: ntap }, () => new Array(ntap).fill(0)), bb = new Array(ntap).fill(0);
      for (let s = 8; s < nsym; s++) { const row = []; for (let k = 0; k < ntap; k++) row.push(at((s + hh - k) * sps + ph)); for (let i = 0; i < ntap; i++) { bb[i] += row[i] * sym[s] / 3; for (let j = 0; j < ntap; j++) A[i][j] += row[i] * row[j]; } }
      const cc = solveLin(A, bb), z = (s) => { let v = 0; for (let k = 0; k < ntap; k++) v += cc[k] * at((s + hh - k) * sps + ph); return v; };
      const lv = [[], [], [], []], raw = [[], [], [], []];
      for (let s = 8; s < nsym; s++) { lv[(sym[s] + 3) / 2].push(z(s)); raw[(sym[s] + 3) / 2].push(at(s * sps + ph)); }
      let worst = Infinity; for (let k = 0; k < 3; k++) worst = Math.min(worst, Math.min(...lv[k + 1]) - Math.max(...lv[k]));
      const ne = Math.sqrt(cc.reduce((a, v) => a + v * v, 0)), ratio = worst / (2 / 3) / ne;
      if (ratio > best.ratio) best = { ratio, ph, c: cc, ne, raw };
      dynFrac = Math.max(dynFrac, (mean(raw[3]) - mean(raw[0])) / 2);   // best unequalised sampling phase
    }
    const traces = []; for (let s = 8; s < Math.min(nsym - 2, 72); s++) { const tr = []; for (let k = -sps / 2; k <= sps * 1.5; k++) tr.push(at(s * sps + best.ph + k)); traces.push(tr); }
    let mx = -Infinity, mn = Infinity; for (let i = 0; i < n; i++) { if (y[i] > mx) mx = y[i]; if (y[i] < mn) mn = y[i]; }
    return { ratio: best.ratio, ph: best.ph, taps: best.c, ne: best.ne, dynFrac, ext: (mx - mn) / 2, traces, sps, T0, T3 };
  }

  /* ---------- full analysis ---------- */
  function analyse(l, d, proc, opt) {
    opt = opt || {};
    const c = core(l, d, { proc, R: opt.R, noAlign: opt.noAlign, natural: opt.natural, sL: opt.sL, lamR0: opt.lamR0, Pin: opt.Pin, gs: opt.gs });
    const s = statics(c), eo = eoResp(c);
    const eye = opt.noEye ? null : eyeSim(c, eo);
    const pen = !eye ? 0 : eye.ratio > 0.02 && s.mono ? Math.max(0, -10 * Math.log10(Math.min(1, eye.ratio))) : 17;
    const omaDyn = eye ? s.oma * Math.max(eye.ext, 1e-6) : s.oma;   // waveform extrema incl. transition overshoot (Huang et al. 2026)
    // open-loop thermal gain: absorbed-power change per resonance shift × ∂λ/∂T / (G′L) (> 0 on the red side, ≥ 1 = runaway)
    const eps = 1e-4, cs = core(l, d, { proc, R: c.lay.R, lamR0: c.B.lamOpX(0) + eps, sL: opt.sL, Pin: opt.Pin }), dP = (cs.Pabs - c.Pabs) / eps;
    const gth = dP * c.dldT / (c.H.Gp * c.B.L * 1e-6);
    const Ebit = 0.104 * eo.Cj * d.vpp * d.vpp * 1e15;   // fJ/bit, PAM4 C·V² charging energy (driver circuit excluded)
    const Eth = c.PhA * 1e-3 / (2 * BAUD * 1e9) * 1e15;    // fJ/bit, mean heater power over the temperature range
    const area = Math.pow(2 * c.lay.R + 8, 2);             // µm², ring + contacts / heater leads
    return { d: { ...d }, c, ...s, eo, eye, pen, bw: eo.bw, fRC: eo.fRC, fQ: eo.fQ, Cj: eo.Cj * 1e15, omaDyn, omaDynDbm: 10 * Math.log10(Math.max(omaDyn, 1e-9)), gth,
      PhW: c.PhW, PhA: c.PhA, P2pi: c.H.P2pi, eff: c.B.fsr * 1e3 / c.H.P2pi, dldTpm: c.dldT * 1e6, selfK: c.selfK, Ebit, Eth, Etot: Ebit + Eth, area, size: area,
      Rlay: c.lay.R, m: c.lay.m, Pcirc: Math.max(...c.B.Pc) * 1e3, tpa: Math.max(...c.B.atp) };
  }
  const r1 = (l, r) => Math.max(r.IL / l.s1.il, l.s1.er / Math.max(r.er, 1e-3), l.s1.bw / Math.max(r.bw, 1e-3));
  const r2 = (l, r) => Math.max(r.pen / l.s2.pen, l.s2.oma / Math.max(r.oma, 1e-6), r.PhW / l.s2.ph, r.gth >= 1 ? 2 : 0);
  const dbm = (mw) => (10 * Math.log10(mw)).toFixed(1);
  const P = (l) => [
    { k: 'R', label: '링 반경 (설정값 → 공진 정렬 레이아웃 반경)', sym: 'R', min: 4, max: 20, step: 0.05, dec: 2, unit: 'µm' },
    { k: 'g', label: '버스–링 결합 간격', sym: 'g', min: 0.10, max: 0.50, step: 0.005, dec: 3, unit: 'µm' },
    { k: 'dop', label: '링 접합 도핑 증가 (2-2 접합 대비, 양쪽)', sym: 'ΔN', min: 0, max: 0.8, step: 0.05, dec: 2, unit: 'decade' },
    { k: 'vb', label: 'DC 역바이어스 (PAM4 최저 레벨)', sym: 'V<sub>b</sub>', min: 0, max: 3, step: 0.05, dec: 2, unit: 'V' },
    { k: 'vpp', label: '구동 진폭 (PAM4 바깥 레벨 간)', sym: 'V<sub>pp</sub>', min: 0.3, max: 3, step: 0.05, dec: 2, unit: 'V' },
    { k: 'det', label: '레이저 디튜닝 x = 2(λ<sub>L</sub> − λ<sub>r</sub>)/FWHM (음수 = 파랑 쪽)', sym: 'x', min: -3, max: 3, step: 0.02, dec: 2, unit: '' },
    { k: 'bm', label: '공진 배치 여유 (최고 온도에서 레이저보다 파랑 쪽)', sym: 'Δλ<sub>b</sub>', min: 0, max: 12, step: 0.05, dec: 2, unit: 'nm' }
  ];
  const regimeTxt = { under: 'Under-coupled (κ² < 손실)', critical: 'Critical coupling', over: 'Over-coupled (κ² > 손실)' };
  const PCT = (x) => `${(x * 100).toFixed(1)}%`, NMf = (v, k) => (v * 1e3).toFixed(k == null ? 2 : k);

  /* ---------- drawing ---------- */
  function bg(cv) { const ctx = cv.getContext('2d'); ctx.fillStyle = '#0b1220'; ctx.fillRect(0, 0, cv.width, cv.height); return ctx; }
  function txt(ctx, s, x, y, o) { o = o || {}; ctx.font = `${(o.size || 10.5) * DPR}px "IBM Plex Mono", monospace`; ctx.fillStyle = o.color || 'rgba(231,236,243,0.85)'; ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.base || 'middle'; ctx.fillText(s, x, y); }
  // top view: bus at the bottom, ring with junction (p inside / n outside) and heater arc, glow ∝ circulating power
  function drawRing(ctx, cxp, cyp, rad, o) {
    o = o || {};
    const busY = cyp + rad + Math.max(4 * DPR, rad * 0.12), ww = Math.max(2.2 * DPR, rad * 0.07);
    if (o.glow) { ctx.strokeStyle = `rgba(246,195,90,${clamp(o.glow, 0.05, 0.85)})`; ctx.lineWidth = ww * 3.2; ctx.beginPath(); ctx.arc(cxp, cyp, rad, 0, 2 * Math.PI); ctx.stroke(); }
    // junction over η of the circumference, centred opposite the coupler
    const a0 = Math.PI / 2 + Math.PI * (1 - ETA), a1 = Math.PI / 2 + Math.PI * (1 + ETA);
    ctx.lineWidth = ww * 1.0; ctx.strokeStyle = 'rgba(255,141,156,0.75)'; ctx.beginPath(); ctx.arc(cxp, cyp, rad - ww * 0.9, a0, a1); ctx.stroke();
    ctx.strokeStyle = 'rgba(100,201,223,0.75)'; ctx.beginPath(); ctx.arc(cxp, cyp, rad + ww * 0.9, a0, a1); ctx.stroke();
    if (o.heater) { ctx.setLineDash([4 * DPR, 3 * DPR]); ctx.strokeStyle = `rgba(242,176,74,${0.35 + 0.6 * clamp(o.heater, 0, 1)})`; ctx.lineWidth = 1.6 * DPR; ctx.beginPath(); ctx.arc(cxp, cyp, rad + ww * 2.6, Math.PI * 0.62, Math.PI * 2.38); ctx.stroke(); ctx.setLineDash([]); }
    ctx.strokeStyle = 'rgba(214,226,242,0.9)'; ctx.lineWidth = ww * 0.55; ctx.beginPath(); ctx.arc(cxp, cyp, rad, 0, 2 * Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(o.x0 != null ? o.x0 : cxp - rad * 2.2, busY); ctx.lineTo(o.x1 != null ? o.x1 : cxp + rad * 2.2, busY); ctx.stroke();
    return { busY };
  }
  function eyeDraw(ctx, eye, x0, y0, w, h, label, good) {
    const tr = eye.traces, n = tr[0].length, lo = Math.min(...tr.flat()), hi = Math.max(...tr.flat()), sp = Math.max(hi - lo, 1e-6);
    const X = (i) => x0 + i / (n - 1) * w, Y = (v) => y0 + (1 - (v - lo + 0.08 * sp) / (sp * 1.16)) * h;
    ctx.strokeStyle = 'rgba(100,201,223,0.16)'; ctx.lineWidth = 1.2 * DPR;
    tr.forEach((t) => { ctx.beginPath(); t.forEach((v, i) => (i ? ctx.lineTo(X(i), Y(v)) : ctx.moveTo(X(i), Y(v)))); ctx.stroke(); });
    ctx.strokeStyle = 'rgba(242,176,74,0.7)'; ctx.setLineDash([3 * DPR, 3 * DPR]); ctx.beginPath(); ctx.moveTo(X(eye.sps / 2), y0); ctx.lineTo(X(eye.sps / 2), y0 + h); ctx.stroke(); ctx.setLineDash([]);
    cvPill(ctx, label, x0, y0 - 8 * DPR, 'left', good ? '#5dd193' : '#f2b04a');
  }
  function numbers(ctx, rows, x, y, w) {   // label left, value right; on a narrow canvas the font shrinks, then the value drops under its label
    let fs = 10; const fit = () => { ctx.font = `${fs * DPR}px "IBM Plex Mono", monospace`; return rows.every(([k, v]) => ctx.measureText(k).width + ctx.measureText(v).width + 8 * DPR <= w); };
    while (!fit() && fs > 8) fs -= 0.5;
    const two = !fit(), lh = (two ? 2 * (fs + 2.5) : 17) * DPR; ctx.textBaseline = 'top';
    rows.forEach(([k, v], i) => { const yy = y + i * lh; ctx.fillStyle = 'rgba(158,171,189,0.95)'; ctx.textAlign = 'left'; ctx.fillText(k, x, yy); ctx.fillStyle = '#e7ecf3'; ctx.textAlign = 'right'; ctx.fillText(v, x + w, two ? yy + (fs + 2.5) * DPR : yy); });
    ctx.textAlign = 'left';
  }

  /* ---------- charts ---------- */
  // transmission around the laser: span in µm, optional level curves (4 PAM4 levels)
  function specChart(r, o) {
    const c = r.c, B = c.B, lamL = o.center != null ? o.center : B.lamL, span = o.span, N = 360, ser = [];
    const curve = (k, col, w, dash) => { const p = []; for (let i = 0; i <= N; i++) { const lm = lamL - span + 2 * span * i / N, ph = 2 * Math.PI * (B.lamOpX(k) - lm) / B.fsr; p.push([(lm - lamL) * 1e3, 10 * Math.log10(Math.max(allpass(B.a[k], B.t, ph), 1e-6))]); } ser.push({ pts: p, color: col, width: w || 2, dash }); };
    if (o.levels) [0, 1, 2, 3].forEach((k) => curve(k, ['#64c9df', '#5dd193', '#f2b04a', '#ff8d9c'][k], k === 0 || k === 3 ? 2.2 : 1.4)); else curve(0, 'var(--amber)', 2.4);
    const y0 = o.y0 != null ? o.y0 : -30, sx = span * 1e3, tick = sx > 8 ? Math.round(sx / 3) : sx > 1 ? +(sx / 3).toFixed(1) : +(sx / 3).toFixed(2);
    const marks = o.levels ? [0, 1, 2, 3].map((k) => ({ x: 0, y: 10 * Math.log10(Math.max(B.T[k], 1e-6)), color: ['#64c9df', '#5dd193', '#f2b04a', '#ff8d9c'][k] })) : [];
    return svgChart({ x0: -sx, x1: sx, y0, y1: 1, H: o.H || 230, aria: o.aria || '투과 스펙트럼', xticks: [-3 * tick, -2 * tick, -tick, 0, tick, 2 * tick, 3 * tick].filter((v) => Math.abs(v) <= sx), yticks: [y0, Math.round(y0 * 2 / 3), Math.round(y0 / 3), 0], ylab: 'dB', xlab: o.center != null ? 'λ − λ_공진 (nm)' : 'λ − λ_레이저 (nm)',
      vlines: (Math.abs(B.lamL - lamL) * 1e3 <= sx ? [{ x: (B.lamL - lamL) * 1e3, color: 'rgba(231,236,243,.7)' }] : []).concat(o.vl || []), bands: o.bands, series: ser, marks, hlines: o.hl });
  }
  function eoChart(r, H) {
    const eo = r.eo, a = [], b = [], rc = [];
    for (let f = 1; f <= 120; f += 1.5) { a.push([f, Math.max(-15, 20 * Math.log10(eo.Hn(f)))]); rc.push([f, -10 * Math.log10(1 + Math.pow(f / eo.fRC, 2))]); b.push([f, Math.max(-15, 20 * Math.log10(eo.Hn(f) * cx.abs(drv(f))))]); }
    return svgChart({ x0: 0, x1: 120, y0: -15, y1: 6, H: H || 230, aria: 'EO 응답', xticks: [0, 20, 40, 56, 80, 100, 120], yticks: [-15, -10, -6, -3, 0, 3, 6], ylab: 'dB', xlab: 'GHz',
      vlines: [{ x: 56, color: 'rgba(231,236,243,.55)' }, { x: Math.min(eo.bw, 120), color: 'var(--amber)' }, { x: Math.min(eo.fQ, 120), color: 'rgba(255,141,156,.6)' }], hlines: [{ y: -3, label: '−3 dB' }],
      series: [{ pts: rc, color: 'rgba(158,171,189,.8)', width: 1.4, dash: '2 4' }, { pts: a, color: 'var(--cyan)', width: 2.4 }, { pts: b, color: 'var(--rose)', width: 1.6, dash: '5 4' }] });
  }
  const eoLegend = (r) => legendHTML([['var(--cyan)', 'EO S21 (CMT + RC, 정규화)'], ['var(--rose)', `× 드라이버 ${FDRV} GHz`], ['rgba(158,171,189,.8)', `RC 극점만 (f<sub>RC</sub> ${Math.round(r.fRC)} GHz)`], ['rgba(255,141,156,.6)', `공진 중심 광자 수명 한계 c/(2λQ<sub>L</sub>) ${Math.round(r.fQ)} GHz`], ['var(--amber)', `EO −3 dB ${f2(r.bw, 1)} GHz`]]);

  // coach objective: the worst ratio plus half the summed excess of the others — gives the search a slope along the
  // ridge where two goals conflict (a move is still only shown when it lowers this distance-to-goal)
  const smooth = (rs) => Math.max(...rs) + 0.5 * rs.reduce((a, v) => a + Math.max(0, v - 1), 0);
  // local pattern search around the current design (single knobs ± a few slider steps, then pairs): narrow valleys that a
  // full-range line scan steps over. Returns the pairBest-style { ps, v, q0, q } only for a verified improvement.
  function localBest(KK, l, d, keys, q) {
    const ps = KK.params(l).filter((p) => keys.includes(p.k)), q0 = q(KK.evaluate(l, d)); let best = null;
    const tryC = (ch) => { const nd = { ...d }; ch.forEach(([p, m]) => { nd[p.k] = snapP(p, d[p.k] + m * p.step); }); if (ch.every(([p]) => nd[p.k] === d[p.k])) return; const v = q(KK.evaluate(l, nd)); if (!best || v < best.q) best = { q: v, ps: ch.map(([p]) => p), v: ch.map(([p]) => nd[p.k]) }; };
    for (const p of ps) for (const m of [-10, -4, 4, 10]) tryC([[p, m]]);
    if (!best || best.q >= q0 * 0.995) for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) for (const a of [-5, 5]) for (const b of [-5, 5]) tryC([[ps[i], a], [ps[j], b]]);
    return best && best.q < q0 * 0.995 ? { ...best, q0 } : null;
  }
  /* ---------- guided steps ---------- */
  function stepDefs(l) {
    const lam = l.pf.lam, st = l.st || {}, fsrT = st.fsr || 10, tr = TRng(l);
    const P0 = P(l), pk = (k) => P0.find((p) => p.k === k);
    const evS = (l2, d, o) => analyse(l2, d, null, { noEye: true, noAlign: true, ...o });
    /* Step 1 — resonance and FSR */
    const s1 = {
      id: 'res', short: '공진 · FSR', title: 'Ring 공진 — 공진 조건과 FSR', aspect: 0.56,
      intro: `둘레 L = 2πR의 고리를 한 바퀴 돈 빛이 제자리에서 같은 위상이 되면(mλ = n<sub>eff</sub>L) 빛이 쌓여 공진합니다. 버스 도파로의 투과 스펙트럼에는 공진마다 좁은 골(dip)이 생기고, 그 간격이 FSR ≈ λ²/(n<sub>g</sub>L)입니다. 반경 R만 바꾸면서 FSR과 공진 차수 m이 어떻게 바뀌는지 보고, FSR을 목표 ${fsrT} nm 근처로 맞추세요 (작은 링 = 넓은 FSR = 다음 단계들에서 열 튜닝이 쉬워짐).`,
      doneText: '공진 조건 mλ = n<sub>eff</sub>L과 FSR = λ²/(n<sub>g</sub>L)을 확인했습니다. 다음은 골의 깊이와 폭을 정하는 결합(κ)과 손실입니다.',
      params: () => [pk('R')],
      evaluate: (l2, d) => evS(l2, d, { noAlign: false, natural: true }),
      goals: (l2, r) => [
        { k: `FSR ≈ ${fsrT} nm (±0.5 nm)`, v: `${NMf(r.fsr)} nm`, ok: Math.abs(r.fsr * 1e3 - fsrT) <= 0.5 },
        { k: '공진 차수 m = n<sub>eff</sub>L/λ', v: `m = ${r.m}`, ok: true, na: true },
        { k: '반경 줄이면 FSR↑ · 굽힘 손실↑', v: `굽힘 ${f2(r.c.B.bend, 2)} dB/mm`, ok: r.c.B.bend < 1, na: true }],
      done: (l2, r) => Math.abs(r.fsr * 1e3 - fsrT) <= 0.5,
      coach(l2, r, c) {
        const fsr = r.fsr * 1e3; if (Math.abs(fsr - fsrT) <= 0.5) return null;
        const Rt = r.d.R * fsr / fsrT;
        return { h: fsr > fsrT ? 'FSR이 넓습니다 — 링이 작습니다' : 'FSR이 좁습니다 — 링이 큽니다', b: `FSR = λ²/(n<sub>g</sub>·2πR)은 반경에 반비례합니다. 지금 ${fsr.toFixed(2)} nm.` + (c.tier >= 2 ? ` 권장: R = ${Rt.toFixed(2)} µm (기준: n<sub>g</sub> ${r.c.x.ng.toFixed(3)}로 FSR ${fsrT} nm).` : ` R을 ${fsr > fsrT ? '키우세요' : '줄이세요'}.`) };
      },
      meta: (l2, r) => `${l2.pf.mat === 'si' ? '' : '이종 집적 '}Si 리브 ${Math.round(r.c.x.w * 1000)}×220 nm (슬랩 90 nm) · EIM: n<sub>eff</sub> <b>${r.c.x.neff.toFixed(4)}</b>, n<sub>g</sub> <b>${r.c.x.ng.toFixed(3)}</b> · λ ${Math.round(lam * 1000)} nm`,
      tiles: (l2, r) => [['FSR', `${NMf(r.fsr)}<small>nm</small>`], ['공진 차수 m', `${r.m}`], ['둘레 L', `${f2(2 * Math.PI * r.d.R, 1)}<small>µm</small>`], ['n<sub>eff</sub> · n<sub>g</sub>', `${r.c.x.neff.toFixed(3)} · ${r.c.x.ng.toFixed(3)}`]],
      hint: (l2, r) => `공진: m·λ = n<sub>eff</sub>·2πR → λ<sub>m</sub> = 2πR·n<sub>eff</sub>/m · FSR ≈ λ²/(n<sub>g</sub>·2πR)<br>n<sub>g</sub> = n<sub>eff</sub> − λ·dn<sub>eff</sub>/dλ (분산 포함)이므로 FSR은 n<sub>eff</sub>가 아니라 n<sub>g</sub>로 계산합니다`,
      draw(cv, l2, r) {
        const ctx = bg(cv), W = cv.width, H = cv.height, pad = 12 * DPR, rad = Math.min(H * 0.3, W * 0.16) * clamp(0.55 + r.d.R / 40, 0.6, 1.1);
        const cxp = W * 0.3, cyp = H * 0.44; drawRing(ctx, cxp, cyp, rad, { glow: 0.2 });
        txt(ctx, `R = ${r.d.R.toFixed(2)} µm`, cxp, cyp, { align: 'center' }); txt(ctx, `L = 2πR = ${(2 * Math.PI * r.d.R).toFixed(1)} µm`, cxp, cyp + 14 * DPR, { align: 'center', size: 9.5, color: 'rgba(158,171,189,0.95)' });
        numbers(ctx, [['공진 조건', 'mλ = n_eff·L'], ['차수 m', `${r.m}`], ['FSR', `${NMf(r.fsr)} nm`], ['n_eff / n_g', `${r.c.x.neff.toFixed(3)} / ${r.c.x.ng.toFixed(3)}`], ['굽힘 손실', `${f2(r.c.B.bend, 3)} dB/mm`]], W * 0.58, pad + 18 * DPR, W * 0.38);
        cvPill(ctx, 'IN', pad, cyp + rad + 8 * DPR, 'left'); cvPill(ctx, 'THROUGH', W * 0.52, cyp + rad + 8 * DPR, 'right');
      },
      chartTitle: () => '버스 투과 스펙트럼 — 공진 골 사이 간격이 FSR',
      chart: (l2, r) => ({ html: specChart(r, { span: 1.6 * r.c.B.fsr, y0: -30 }), legend: legendHTML([['var(--amber)', '투과 T(λ) (약결합)'], ['rgba(231,236,243,.7)', `레이저 ${Math.round(lam * 1000)} nm`]]) })
    };
    /* Step 2 — coupling and Q */
    const s2 = {
      id: 'q', short: '결합 · Q', title: '결합과 Q — Under / Critical / Over coupling', aspect: 0.56,
      intro: '버스와 링 사이 간격 g가 결합계수 κ(필드, |κ|² = 한 번 지날 때 건너가는 파워 비율)를 정합니다. 링 한 바퀴의 필드 투과 a(손실)와 버스 자기결합 t = √(1−κ²)의 대소가 공진 골의 모양을 정합니다: t = a 이면 Critical coupling(골이 0까지 내려감), t > a 이면 Under-coupled, t < a 이면 Over-coupled. Q<sub>L</sub>는 선폭 = λ/Q<sub>L</sub>을, 1/Q<sub>L</sub> = 1/Q<sub>i</sub> + 1/Q<sub>c</sub>로 손실과 결합 모두가 정합니다. 세 영역을 모두 지나가 보고, 골이 15 dB 이상 깊은 지점을 찾으세요.',
      doneText: '결합과 손실의 균형이 골의 깊이(ER)와 폭(Q)을 정한다는 것을 확인했습니다. 실제 고속 변조기는 대역폭 때문에 보통 Over-coupled 쪽을 씁니다 — 4단계에서 그 이유를 봅니다.',
      params: () => [pk('g')],
      evaluate: (l2, d) => evS(l2, d, { R: d.R }),
      observe: (l2, r, mem) => { mem.seen = mem.seen || []; if (!mem.seen.includes(r.regime)) { mem.seen.push(r.regime); return true; } return false; },
      goals: (l2, r, mem) => { const seen = mem.seen || []; return [
        { k: 'Under · Critical · Over 모두 관찰', v: ['under', 'critical', 'over'].map((x) => `${{ under: 'U', critical: 'C', over: 'O' }[x]}${seen.includes(x) ? '✓' : '·'}`).join(' '), ok: ['under', 'critical', 'over'].every((x) => seen.includes(x)) },
        { k: '공진 골 깊이 ≥ 15 dB', v: `${f2(r.erRes, 1)} dB`, ok: r.erRes >= 15 },
        { k: '지금 영역', v: regimeTxt[r.regime], ok: true, na: true }]; },
      done: (l2, r, mem) => ['under', 'critical', 'over'].every((x) => (mem.seen || []).includes(x)) && r.erRes >= 15,
      coach(l2, r, c) {
        const seen = (c.mem && c.mem.seen) || [], miss = ['under', 'critical', 'over'].filter((x) => !seen.includes(x));
        // numeric suggestion (tier ≥ 2): scan the gap slider for the nearest gap in the wanted regime (deepest dip for critical)
        const scan = (want) => { let best = null; const p = pk('g'); for (let i = 0; i <= 80; i++) { const g = snapP(p, p.min + (p.max - p.min) * i / 80), x = evS(l2, { ...r.d, g }, { R: r.d.R }); const sc = want === 'critical' ? -x.erRes : x.regime === want ? Math.abs(g - r.d.g) : 1e9; if (sc < 1e8 && (!best || sc < best.sc)) best = { g, sc }; } return best; };
        if (miss.length) { const b = c.tier >= 2 ? scan(miss[0]) : null; return { h: `아직 못 본 영역: ${miss.map((x) => regimeTxt[x]).join(', ')}`, b: '간격을 넓히면 κ가 지수적으로 줄어 Under-coupled로, 좁히면 Over-coupled로 갑니다. 그 사이 한 점에서 t = a가 됩니다.' + (b ? ` 권장: g = ${b.g.toFixed(3)} µm (기준: ${regimeTxt[miss[0]]}).` : '') }; }
        if (r.erRes < 15) { const b = c.tier >= 2 ? scan('critical') : null; return { h: 'Critical coupling 근처를 찾으세요', b: `지금 t = ${r.c.B.t.toFixed(4)}, a = ${r.c.B.a[0].toFixed(4)} → ${r.regime === 'under' ? '결합이 손실보다 약합니다: 간격을 줄이세요.' : '결합이 손실보다 강합니다: 간격을 넓히세요.'}` + (b ? ` 권장: g = ${b.g.toFixed(3)} µm (기준: t = a).` : '') }; }
        return null;
      },
      meta: (l2, r) => `R ${r.d.R.toFixed(2)} µm · 결합: κ(d) = κ₀e<sup>−γd</sup>, d(z) = g + z²/2R 적분 (γ ${r.c.x.g.toFixed(2)} /µm) · 손실: 도핑(2-2 모델, 바이어스 ${r.d.vb} V) + 측벽 ${SWL} dB/mm + 굽힘 + 히터 금속`,
      tiles: (l2, r) => [['κ² · t', `${f2(r.c.B.k2, 4)} · ${r.c.B.t.toFixed(4)}`], ['a (한 바퀴)', `${r.c.B.a[0].toFixed(4)}`], ['Q<sub>i</sub> · Q<sub>c</sub>', `${Math.round(r.Qi / 100) / 10}k · ${Math.round(r.Qc / 100) / 10}k`], ['Q<sub>L</sub> · 선폭', `${Math.round(r.QL / 100) / 10}k · ${f2(r.fwhm * 1e3, 0)}<small>pm</small>`]],
      hint: (l2, r) => `T<sub>min</sub> = (a − t)²/(1 − at)² → t = a에서 0 · Q<sub>L</sub> = πn<sub>g</sub>L√(at)/(λ(1 − at)) · 1/Q<sub>L</sub> = 1/Q<sub>i</sub> + 1/Q<sub>c</sub><br>κ는 필드 진폭, κ²가 파워입니다 (t² + κ² = 1, 무손실 결합기 가정)`,
      draw(cv, l2, r) {
        const ctx = bg(cv), W = cv.width, H = cv.height, pad = 12 * DPR, rad = Math.min(H * 0.3, W * 0.16), cxp = W * 0.28, cyp = H * 0.42;
        const enh = r.c.B.Pc[0] / r.c.P0; const g0 = drawRing(ctx, cxp, cyp, rad, { glow: Math.log10(1 + enh) / 2 });
        txt(ctx, `g ${Math.round(r.d.g * 1000)} nm`, cxp + rad * 0.15, g0.busY - 6 * DPR, { size: 9.5, color: '#f2b04a' });
        txt(ctx, regimeTxt[r.regime], cxp, cyp, { align: 'center', size: 10, color: r.regime === 'critical' ? '#5dd193' : '#f2b04a' });
        numbers(ctx, [['κ² (파워 결합)', f2(r.c.B.k2, 4)], ['t (자기결합)', r.c.B.t.toFixed(4)], ['a (왕복 필드)', r.c.B.a[0].toFixed(4)], ['Q_i / Q_c', `${Math.round(r.Qi)} / ${Math.round(r.Qc)}`], ['Q_L', `${Math.round(r.QL)}`], ['공진 골', `${f2(r.erRes, 1)} dB`], ['내부 파워 증폭', `×${f2(enh, 1)}`]], W * 0.56, pad + 12 * DPR, W * 0.4);
      },
      chartTitle: () => '공진 하나를 확대 — 골의 깊이(ER)와 폭(선폭 = λ/Q_L)',
      chart: (l2, r) => ({ html: specChart(r, { center: r.c.B.lamOpX(0), span: Math.max(4 * r.fwhm, 0.0002), y0: -40 }), legend: legendHTML([['var(--amber)', `T(λ) — Q<sub>L</sub> ${Math.round(r.QL)}, 선폭 ${f2(r.fwhm * 1e3, 0)} pm`]]) })
    };
    /* Step 3 — electro-optic modulation (static) */
    const s3 = {
      id: 'eo', short: '전기광학', title: 'PN 접합으로 공진 옮기기 — 정적 변조', aspect: 0.56,
      intro: '2-2의 PN 접합이 링 둘레의 η = 75%를 덮습니다. 역바이어스를 키우면 공핍이 넓어져 자유 캐리어가 빠지고 n<sub>eff</sub>가 올라가 공진이 장파장 쪽(빨강)으로 이동합니다(Δλ = λΔn<sub>eff</sub>/n<sub>g</sub>). 레이저를 공진 옆에(디튜닝 x = 2(λ<sub>L</sub> − λ<sub>r</sub>)/FWHM) 두면 이 이동이 투과 세기 변화가 됩니다. 바이어스, 구동 진폭, 디튜닝으로 PAM4 네 레벨의 정적 OMA와 ER을 확보하세요. 여기서 보는 것은 DC 특성뿐입니다 — 기울기가 가파르다고 고속에서 좋은 것은 아닙니다(다음 단계).',
      doneText: '공진 이동(pm/V)과 레이저 디튜닝으로 세기 변조를 만들었습니다. 다음 단계에서 같은 설계를 112 GBd로 구동하면 광자 수명과 RC가 끼어듭니다.',
      params: () => [pk('dop'), pk('vb'), pk('vpp'), pk('det')],
      evaluate: (l2, d) => evS(l2, d, { R: d.R }),
      goals: (l2, r) => [
        { k: `정적 OMA<sub>outer</sub> ≥ ${dbm(l2.s1.omaS)} dBm (입력 ${PIN} dBm)`, v: `${f2(r.omaDbm, 2)} dBm`, ok: r.oma >= l2.s1.omaS },
        { k: `정적 ER ≥ ${fmtT(l2.s1.er)} dB`, v: `${f2(r.er, 2)} dB`, ok: r.er >= l2.s1.er },
        { k: `삽입 손실 ≤ ${fmtT(l2.s1.il)} dB`, v: `${f2(r.IL, 2)} dB`, ok: r.IL <= l2.s1.il },
        { k: 'PAM4 레벨이 한 방향으로 정렬', v: r.mono ? `RLM ${f2(r.rlm, 2)}` : '레벨 역전', ok: r.mono, na: true }],
      done: (l2, r) => r.oma >= l2.s1.omaS && r.er >= l2.s1.er && r.IL <= l2.s1.il && r.mono,
      coach(l2, r, c) {
        const t = c.tier, d = r.d, q = (x) => Math.max(l2.s1.omaS / Math.max(x.oma, 1e-6), l2.s1.er / Math.max(x.er, 1e-3), x.IL / l2.s1.il, x.mono ? 0 : 3);
        if (q(r) <= 1) return null;
        const b = lineBestOf({ params: () => s3.params(), evaluate: (ll, dd) => evS(ll, dd, { R: dd.R }) }, l2, d, ['det', 'vpp', 'dop', 'vb'], q, 40);
        if (!r.mono) return { h: 'PAM4 레벨이 공진 골을 넘나듭니다', b: '구동 진폭 동안 공진이 레이저를 가로지르면 레벨 순서가 뒤집힙니다. 레이저를 공진 한쪽 사면에 두세요.' + recText(b, t, d) };
        return { h: r.oma < l2.s1.omaS ? '세기 변화가 작습니다' : r.IL > l2.s1.il ? '레이저가 공진 골에 너무 가깝습니다 (손실)' : 'ER이 부족합니다', b: `공진 이동 ${f2(r.shiftPmV, 1)} pm/V × ${d.vpp} V = ${f2(r.shiftPmV * d.vpp, 0)} pm vs 선폭 ${f2(r.fwhm * 1e6, 0)} pm. 이동이 선폭에 비해 작으면 사면의 가장 가파른 곳(|x| ≈ 0.58, 파랑 쪽 x < 0)에 레이저를 두거나 진폭을 키웁니다.` + recText(b, t, d) };
      },
      meta: (l2, r) => `${r.c.pnD.src}: Soref–Bennett Δn(V) · η ${ETA} · 공진 이동 <b>${f2(r.shiftPmV, 1)} pm/V</b> · C<sub>j</sub> ${f2(r.Cj, 1)} fF · 입력 ${PIN} dBm`,
      tiles: (l2, r) => [['공진 이동', `${f2(r.shiftPmV, 1)}<small>pm/V</small>`], ['정적 OMA', `${f2(r.omaDbm, 1)}<small>dBm</small>`], ['ER · IL', `${f2(r.er, 1)} · ${f2(r.IL, 1)}<small>dB</small>`], ['C<sub>j</sub>', `${f2(r.Cj, 1)}<small>fF</small>`]],
      hint: (l2, r) => `Δλ = λ·η·Δn<sub>eff</sub>/n<sub>g</sub> (역바이어스↑ → Δn > 0 → 장파장 이동) · 정적 기울기는 Lorentzian 사면에서 |x| ≈ 0.58 (x = 2(λ<sub>L</sub> − λ<sub>r</sub>)/FWHM)에서 최대<br>OMA = P<sub>in</sub>·|T(V<sub>3</sub>) − T(V<sub>0</sub>)|, ER = T<sub>max</sub>/T<sub>min</sub>`,
      draw(cv, l2, r) { drawFull(cv, l2, r, false); },
      chartTitle: () => 'PAM4 네 레벨에서의 투과 스펙트럼 — 레이저 위치의 세로 점이 네 출력 레벨',
      chart: (l2, r) => ({ html: specChart(r, { span: Math.max(3 * r.fwhm, Math.abs(r.d.det) * r.fwhm / 2 + 2 * r.fwhm), levels: true, y0: -30 }), legend: legendHTML([['#64c9df', `V<sub>0</sub> ${r.c.V[0].toFixed(2)} V`], ['#5dd193', 'V<sub>1</sub>'], ['#f2b04a', 'V<sub>2</sub>'], ['#ff8d9c', `V<sub>3</sub> ${r.c.V[3].toFixed(2)} V`], ['rgba(231,236,243,.7)', '레이저']]) })
    };
    /* Step 4 — high-speed PAM4 */
    const s4 = {
      id: 'pam4', short: '200G PAM4', title: '112 GBd PAM4 — 광자 수명, RC, 디튜닝', aspect: 0.5,
      intro: '이제 112 GBd PAM4(224 Gb/s 라인 속도 — FEC·부호화 오버헤드 후 200G급 레인)로 구동합니다. 링 안의 빛은 광자 수명 τ<sub>p</sub> = Q<sub>L</sub>λ/(2πc)만큼 머물러 빠른 변화를 따라가지 못하고, 접합 C<sub>j</sub>와 저항(R<sub>j</sub> + 드라이버 50 Ω)이 전압을 늦춥니다. 레이저를 공진에서 떼어 두면(디튜닝) 응답에 피크가 생겨 대역이 넓어지기도 합니다. Q가 높을수록 정적 기울기는 가파르지만 눈은 닫힐 수 있습니다 — 결합 간격과 디튜닝, 진폭으로 눈을 여세요.',
      doneText: '고속에서는 Q·디튜닝·RC가 함께 대역을 정한다는 것을 확인했습니다. 마지막 학습 단계는 링의 가장 큰 약점인 온도입니다.',
      params: () => [pk('g'), pk('det'), pk('vpp'), pk('vb'), pk('dop')],
      evaluate: (l2, d) => analyse(l2, d, null, { noAlign: true, R: d.R }),
      goals: (l2, r) => [
        { k: `EO 대역폭 ≥ ${fmtT(l2.s1.bw)} GHz`, v: `${f2(r.bw, 1)} GHz`, ok: r.bw >= l2.s1.bw },
        { k: `PAM4 눈 페널티 ≤ ${fmtT(l2.s2.pen)} dB (5-tap FFE)`, v: `${f2(r.pen, 2)} dB`, ok: r.pen <= l2.s2.pen },
        { k: `OMA<sub>outer</sub> (정착 레벨, TDECQ 방식) ≥ ${dbm(l2.s2.oma)} dBm`, v: `${f2(r.omaDbm, 2)} dBm`, ok: r.oma >= l2.s2.oma },
        { k: '참고: 동적 OMA (파형 극값, 오버슈트 포함)', v: `${f2(r.omaDynDbm, 2)} dBm`, ok: true, na: true }],
      done: (l2, r) => r.bw >= l2.s1.bw && r.pen <= l2.s2.pen && r.oma >= l2.s2.oma,
      coach(l2, r, c) {
        const t = c.tier, d = r.d, rs = (x) => [l2.s1.bw / Math.max(x.bw, 1e-3), x.pen / l2.s2.pen, l2.s2.oma / Math.max(x.oma, 1e-6)], q = (x) => smooth(rs(x));
        if (Math.max(...rs(r)) <= 1) return null;
        const KK = { params: () => s4.params(), evaluate: (ll, dd) => analyse(ll, dd, null, { noAlign: true, R: dd.R }) };
        let b = lineBestOf(KK, l2, d, ['g', 'det', 'vpp', 'dop', 'vb'], q, 10);
        if (!b) {   // coupled knobs: try pairs, then a deterministic random search — only verified improvements are shown
          const b2 = localBest(KK, l2, d, ['g', 'det', 'vpp', 'vb', 'dop'], q) || [['g', 'vpp'], ['g', 'det'], ['det', 'vpp']].map((ks) => pairBest(KK, l2, d, ks, q, 8)).filter(Boolean).sort((x, y) => x.q - y.q)[0];
          if (b2) return { h: '손잡이 하나로는 더 나아지지 않습니다', b: 'Q(간격)를 낮추면 대역은 늘지만 기울기가 줄고, 디튜닝·진폭은 OMA와 레벨 압축을 함께 바꿉니다. 여러 손잡이를 함께 움직이세요.' + recText2(b2, t) };
        }
        if (r.bw < l2.s1.bw) return { h: r.fQ < r.fRC ? '광자 수명이 대역을 막습니다 (Q가 높음)' : 'RC가 대역을 막습니다', b: (r.fQ < r.fRC ? `Q<sub>L</sub> ${Math.round(r.QL)} → 공진 중심 한계 ${Math.round(r.fQ)} GHz. 간격을 줄여 Over-coupling 쪽으로 가면 Q<sub>L</sub>이 낮아져 빛이 빨리 빠져나갑니다(대신 ER·기울기↓). 디튜닝을 키우면 응답 피크로 대역이 조금 넓어집니다.` : `C<sub>j</sub> ${f2(r.Cj, 1)} fF · (R<sub>j</sub> + 50 Ω) → f<sub>RC</sub> ${Math.round(r.fRC)} GHz. 바이어스를 키우면 공핍이 넓어져 C가 줄어듭니다.`) + recText(b, t, d) };
        return { h: r.pen > l2.s2.pen ? '눈이 덜 열렸습니다' : 'OMA가 부족합니다', b: 'PAM4 레벨은 Lorentzian 사면에서 고르지 않게 압축되고(비선형), 광자 수명·RC는 심볼 간 간섭을 만듭니다. 진폭을 키우면 OMA는 늘지만 레벨 압축이 커집니다.' + recText(b, t, d) };
      },
      meta: (l2, r) => `시간영역 CMT (da/dt = (jΔ − 1/τ)a − jμs) · 드라이버 ${FDRV} GHz · RC: C<sub>j</sub> ${f2(r.Cj, 1)} fF, R<sub>j</sub> ${Math.round(r.eo.Rj)} Ω + ${RSRC} Ω · Q<sub>L</sub> ${Math.round(r.QL)} · τ<sub>p</sub> ${f2(r.QL * lam * 1e-6 / (2 * Math.PI * C) * 1e12, 2)} ps`,
      tiles: (l2, r) => [['EO 대역폭', `${f2(r.bw, 1)}<small>GHz</small>`], ['f<sub>Q</sub> · f<sub>RC</sub>', `${Math.round(r.fQ)} · ${Math.round(r.fRC)}<small>GHz</small>`], ['눈 페널티', `${f2(r.pen, 2)}<small>dB</small>`], ['OMA 정적 · 동적', `${f2(r.omaDbm, 1)} · ${f2(r.omaDynDbm, 1)}<small>dBm</small>`]],
      hint: (l2, r) => `f<sub>Q</sub> = c/(2λQ<sub>L</sub>) (공진 중심), f<sub>RC</sub> = 1/(2π(R<sub>j</sub>+R<sub>s</sub>)C<sub>j</sub>) · 디튜닝에서 응답은 Ω ≈ |Δ| 근처에 피크를 가집니다 (Sacher & Poon 2008) — 동적 OMA·대역은 |x| ≈ 0.8–1에서 커집니다 (Huang et al. 2026)<br>정적 기울기 ∝ Q, 광 대역 ∝ 1/Q — 고속 링은 보통 Over-coupled, Q<sub>L</sub> 수천 대`,
      draw(cv, l2, r) { drawFull(cv, l2, r, true); },
      chartTitle: () => 'EO 응답 — 광자 수명·디튜닝(피크)·RC가 함께 만드는 대역',
      chart: (l2, r) => ({ html: eoChart(r), legend: eoLegend(r) })
    };
    /* Step 5 — thermal stability */
    const pT = { k: 'sT', label: '칩 온도', sym: 'T', min: tr[0], max: tr[1], step: 1, dec: 0, unit: '°C' };
    const pH = { k: 'sP', label: '히터 전력', sym: 'P<sub>h</sub>', min: 0, max: 40, step: 0.01, dec: 2, unit: 'mW' };
    const pL = { k: 'sL', label: '레이저(ELS) 파장 미세 조정', sym: 'Δλ<sub>L</sub>', min: -800, max: 800, step: 5, dec: 0, unit: 'pm' };
    const ev5 = (l2, d) => {
      const base = analyse(l2, d, null, {}), c = base.c, T = d.sT, lamR = c.unheated(T) + d.sP / c.H.P2pi * c.B.fsr;
      const r = analyse(l2, d, null, { R: c.lay.R, lamR0: lamR, sL: d.sL });
      const detEff = 2 * (c.lam + d.sL * 1e-6 - lamR) / base.fwhm;
      const ok = r.oma >= 0.8 * base.oma && r.pen <= l2.s2.pen && Math.abs(detEff - d.det) < 0.4;
      const need = c.need(T) + (d.sL || 0) * 1e-6, Pneed = ((need % c.B.fsr) + c.B.fsr) % c.B.fsr / c.B.fsr * c.H.P2pi;
      return { ...r, base, T, detEff, ok, Pneed, lamR };
    };
    const binOf = (T) => (T <= tr[0] + 5 ? 'cold' : T >= tr[1] - 5 ? 'hot' : Math.abs(T - (tr[0] + tr[1]) / 2) <= 5 ? 'mid' : null);
    const BIN = { cold: `저온 ${tr[0]}–${tr[0] + 5} °C`, mid: `중간 ${(tr[0] + tr[1]) / 2 - 5}–${(tr[0] + tr[1]) / 2 + 5} °C`, hot: `고온 ${tr[1] - 5}–${tr[1]} °C` };
    const s5 = {
      id: 'thermal', short: '온도 · 히터', title: '열 안정성 — 온도 드리프트, 히터, 레이저 파장', aspect: 0.56, local: ['sT', 'sP', 'sL'],
      intro: `실리콘 링의 공진은 온도에 따라 ∂λ/∂T ≈ ${(lam * cross(l.pf).dndT / cross(l.pf).ng * 1e6).toFixed(0)} pm/K 움직입니다 — 선폭(수십~수백 pm)보다 훨씬 큽니다. 레이저(외부 광원, 파장 고정)는 그대로이므로 몇 도만 바뀌어도 변조가 멈춥니다. 히터는 공진을 장파장 쪽으로만 옮길 수 있고, 한 FSR이면 어떤 공진 차수든 맞출 수 있습니다(P<sub>2π</sub>). 온도를 저온·중간·고온으로 옮기며 히터 전력(필요하면 레이저 파장 미세 조정)으로 동작점을 되찾고, 각 온도에서 쓴 히터 전력이 예산 ${fmtT(l.s2.ph)} mW 이하인지 확인하세요.`,
      doneText: '링의 작은 크기와 낮은 구동 에너지 뒤에는 온도 제어 비용이 있다는 것을 확인했습니다. 이제 모든 변수를 열고 공정 오차까지 겹친 Fab Run으로 갑니다.',
      init: (l2, d) => ({ sT: Math.round((tr[0] + tr[1]) / 2), sP: 0, sL: 0 }),
      params: () => [pT, pH, pL, pk('bm')],
      evaluate: (l2, d) => ev5(l2, d),
      observe: (l2, r, mem) => { const b = binOf(r.T); mem.rec = mem.rec || {}; if (b && r.ok && r.d.sP <= l2.s2.ph && (mem.rec[b] == null || r.d.sP < mem.rec[b])) { mem.rec[b] = +r.d.sP.toFixed(2); return true; } return false; },
      goals: (l2, r, mem) => { const rec = mem.rec || {}; return ['cold', 'mid', 'hot'].map((b) => ({ k: `${BIN[b]}에서 동작 복구 (히터 ≤ ${fmtT(l2.s2.ph)} mW)`, v: rec[b] != null ? `${rec[b]} mW ✓` : '—', ok: rec[b] != null }))
        .concat([{ k: '지금: 동작점 (디튜닝 오차)', v: `${r.ok ? '복구됨' : '어긋남'} · x ${f2(r.detEff, 2)} vs ${f2(r.d.det, 2)}`, ok: r.ok, na: true }, { k: '이 온도에서 필요한 히터 (계산)', v: `${f2(r.Pneed, 1)} mW`, ok: r.Pneed <= l2.s2.ph, na: true }]); },
      done: (l2, r, mem) => ['cold', 'mid', 'hot'].every((b) => (mem.rec || {})[b] != null),
      coach(l2, r, c) {
        if (r.ok) { const miss = ['cold', 'mid', 'hot'].filter((b) => (((c.mem && c.mem.rec) || {})[b]) == null), Tn = { cold: tr[0] + 2, mid: Math.round((tr[0] + tr[1]) / 2), hot: tr[1] - 2 };
          return miss.length ? { h: '이 온도에서는 복구됐습니다', b: `남은 온도 구간: ${miss.map((b) => BIN[b]).join(', ')}. 온도를 옮기면 공진이 다시 벗어납니다 — 거기서 히터로 되찾으세요.` + (c.tier >= 2 ? ` 권장: T = ${Tn[miss[0]]} °C (기준: ${BIN[miss[0]]}).` : '') } : null; }
        const dP = r.Pneed - r.d.sP;
        return { h: r.Pneed > l2.s2.ph ? '히터 예산을 넘습니다 — 레이저 파장이나 배치 여유를 바꾸세요' : '공진이 레이저에서 벗어나 있습니다', b: `지금 T = ${r.T} °C에서 공진이 레이저 기준 ${f2((r.detEff - r.d.det) * r.base.fwhm / 2 * 1e6, 0)} pm 어긋나 있습니다. 히터는 빨강 쪽으로만 옮길 수 있고, 모자라면 한 FSR(${NMf(r.fsr, 1)} nm) 옆의 다음 공진을 씁니다.` + (c.tier >= 2 ? (r.Pneed > l2.s2.ph ? ` 필요 ${f2(r.Pneed, 2)} mW는 예산 초과 — 레이저를 파랑 쪽으로 옮기거나 Δλ<sub>b</sub>를 줄이세요. 권장: Δλ<sub>L</sub> = ${Math.round(r.d.sL - (r.Pneed - l2.s2.ph * 0.9) * r.eff * 1e3 / 5) * 5} pm (기준: 히터 예산 안).` : ` 권장: P<sub>h</sub> = ${f2(r.Pneed, 2)} mW (기준: 필요 이동 ÷ FSR × P<sub>2π</sub>).`) : ` 히터를 ${dP > 0 ? '올리세요' : '내리세요'}.`) };
      },
      meta: (l2, r) => `∂λ/∂T ${f2(r.dldTpm, 1)} pm/K · ${r.c.hd.src} (h ${r.c.hd.h} µm, ${['격리 없음', '트렌치', '언더컷'][r.c.hd.iso]}) → P<sub>2π</sub> ${f2(r.P2pi, 1)} mW, ${f2(r.eff, 3)} nm/mW · 자기 가열 ${f2(r.selfK, 1)} K (흡수 ${f2(r.c.Pabs * 1e3, 1)} mW) · ELS 파장 고정 가정`,
      tiles: (l2, r) => [['∂λ/∂T', `${f2(r.dldTpm, 1)}<small>pm/K</small>`], ['튜닝 효율', `${f2(r.eff, 3)}<small>nm/mW</small>`], ['필요 히터 @T', `${f2(r.Pneed, 1)}<small>mW</small>`], ['선폭 · 드리프트 범위', `${f2(r.base.fwhm * 1e6, 0)}<small>pm</small> · ${f2(r.dldTpm * (tr[1] - tr[0]) / 1e3, 2)}<small>nm</small>`]],
      hint: (l2, r) => `∂λ/∂T = λ(∂n<sub>eff</sub>/∂T)/n<sub>g</sub> · 히터: Δλ = (P/P<sub>2π</sub>)·FSR, P<sub>2π</sub> = λG′/(∂n<sub>eff</sub>/∂T) (반경과 무관) → 작은 링(FSR↑)일수록 nm/mW↑<br>최고 온도에서 히터 0이 되도록 공진을 Δλ<sub>b</sub>만큼 파랑 쪽에 두고, 온도가 내려가면 히터로 올립니다`,
      draw(cv, l2, r) {
        const ctx = bg(cv), W = cv.width, H = cv.height, pad = 12 * DPR, rad = Math.min(H * 0.27, W * 0.14), cxp = W * 0.24, cyp = H * 0.42;
        drawRing(ctx, cxp, cyp, rad, { glow: r.ok ? 0.5 : 0.12, heater: r.d.sP / Math.max(l2.s2.ph, 1) });
        txt(ctx, `${r.T} °C`, cxp, cyp - 6 * DPR, { align: 'center', size: 12, color: r.T > (tr[0] + tr[1]) / 2 ? '#ff8d9c' : '#64c9df' }); txt(ctx, `히터 ${f2(r.d.sP, 1)} mW`, cxp, cyp + 10 * DPR, { align: 'center', size: 9.5, color: '#f2b04a' });
        // wavelength ruler: laser, resonance, drift range
        const x0 = W * 0.46, x1 = W - pad, yR = H * 0.28, span = Math.max(r.c.dldT * (tr[1] - tr[0]) * 1.6, 3 * r.base.fwhm, 0.002), lamL = r.c.lam + r.d.sL * 1e-6, X = (lm) => x0 + (lm - (lamL - span * 0.7)) / span * (x1 - x0);
        ctx.strokeStyle = 'rgba(214,226,242,0.4)'; ctx.lineWidth = 1 * DPR; ctx.beginPath(); ctx.moveTo(x0, yR); ctx.lineTo(x1, yR); ctx.stroke();
        const lo = r.c.unheated(tr[0]), hi = r.c.unheated(tr[1]); ctx.fillStyle = 'rgba(100,201,223,0.18)'; ctx.fillRect(X(lo), yR - 8 * DPR, X(hi) - X(lo), 16 * DPR);
        txt(ctx, `히터 없이 ${tr[0]}→${tr[1]} °C 공진 이동`, (X(lo) + X(hi)) / 2, yR + 18 * DPR, { align: 'center', size: 9, color: 'rgba(100,201,223,0.95)' });
        ctx.fillStyle = '#f2b04a'; ctx.fillRect(X(r.lamR) - 1.5 * DPR, yR - 14 * DPR, 3 * DPR, 28 * DPR); txt(ctx, '공진', X(r.lamR), yR - 20 * DPR, { align: 'center', size: 9.5, color: '#f2b04a' });
        ctx.fillStyle = '#e7ecf3'; ctx.fillRect(X(lamL) - 1 * DPR, yR - 14 * DPR, 2 * DPR, 28 * DPR); txt(ctx, '레이저', X(lamL), yR + 30 * DPR, { align: 'center', size: 9.5 });
        numbers(ctx, [['동작점', r.ok ? '복구됨' : '어긋남'], ['디튜닝 x', `${f2(r.detEff, 2)} (목표 ${f2(r.d.det, 2)})`], ['OMA', `${f2(r.omaDbm, 1)} dBm`], ['눈 페널티', `${f2(r.pen, 1)} dB`], ['필요 히터', `${f2(r.Pneed, 1)} mW`]], x0, H * 0.52, x1 - x0);
      },
      chartTitle: () => '온도에 따른 OMA — 히터 고정(현재 값) vs 매 온도 재정렬(락)',
      chart(l2, r) {
        const fixed = [], lock = [], heat = [], c = r.base.c, ys = [];
        for (let T = tr[0]; T <= tr[1] + 1e-9; T += (tr[1] - tr[0]) / 14) {
          const lamR = c.unheated(T) + r.d.sP / c.H.P2pi * c.B.fsr, a = analyse(l2, r.d, null, { R: c.lay.R, lamR0: lamR, sL: r.d.sL, noEye: true });
          fixed.push([T, a.omaDbm]); lock.push([T, r.base.omaDbm]); heat.push([T, ((c.need(T) + r.d.sL * 1e-6) % c.B.fsr + c.B.fsr) % c.B.fsr / c.B.fsr * c.H.P2pi]); ys.push(a.omaDbm);
        }
        const y1 = Math.ceil(Math.max(r.base.omaDbm, ...ys) + 1), y0 = Math.floor(Math.min(...ys, y1 - 12)), hmax = Math.max(...heat.map((h) => h[1]), l2.s2.ph, 1);
        const sc = (v) => y0 + v / hmax * (y1 - y0);
        const html = svgChart({ x0: tr[0], x1: tr[1], y0, y1, aria: 'OMA vs 온도', xticks: [tr[0], (tr[0] + tr[1]) / 2, tr[1]], yticks: [y0, Math.round((y0 + y1) / 2), y1], ylab: 'dBm', xlab: '°C',
          vlines: [{ x: r.T, color: 'rgba(231,236,243,.6)' }], hlines: [{ y: sc(l2.s2.ph), label: `히터 예산 ${fmtT(l2.s2.ph)} mW`, color: 'rgba(242,176,74,.6)' }],
          series: [{ pts: lock, color: 'var(--pass)', width: 1.6, dash: '5 4' }, { pts: fixed, color: 'var(--cyan)', width: 2.4 }, { pts: heat.map(([x, v]) => [x, sc(v)]), color: 'var(--amber)', width: 1.6 }] });
        return { html, legend: legendHTML([['var(--cyan)', `정적 OMA, 히터 ${f2(r.d.sP, 1)} mW 고정`], ['var(--pass)', '매 온도 히터 락 (설계 OMA)'], ['var(--amber)', `필요 히터 전력 (0–${f2(hmax, 0)} mW 축 환산)`]]) };
      }
    };
    const s6 = { id: 'full', full: true, short: 'Full · Fab', title: 'Full MRR 설계 · Fab Run', intro: '모든 변수를 열고 반경·결합·바이어스·진폭·디튜닝·배치 여유를 함께 맞춥니다. ★는 정적 특성(IL·ER·EO 대역), ★★는 112 GBd PAM4 눈·동적 OMA·온도 범위 전체의 히터 전력·열적 안정, ★★★는 공정 오차(폭·두께·도핑)와 온도를 겹친 Fab Run 수율입니다.', fullDone: (l2, r, c) => !!c.fab && c.ob[0].pass };
    return [s1, s2, s3, s4, s5, s6];
  }
  // full-design / step-3/4 view: eye (or static levels) + ring top view + numbers
  function drawFull(cv, l, r, withEye) {
    const ctx = bg(cv), W = cv.width, H = cv.height, pad = 12 * DPR, narrow = W / DPR < 520;
    const ex = pad, ey = pad + 22 * DPR, ew = (narrow ? W : W * 0.58) - 2 * pad, eh = H - ey - pad;
    if (withEye && r.eye) eyeDraw(ctx, r.eye, ex, ey, ew, eh, `112 GBd PAM4 · 눈 ${Math.round(Math.max(r.eye.ratio, 0) * 100)}% · 페널티 ${r.pen.toFixed(1)} dB${narrow ? ` · EO ${Math.round(r.bw)} GHz` : ''}`, r.pen <= l.s2.pen);
    else {   // static transfer: T vs drive voltage at the laser
      const vs = [], c = r.c; for (let i = 0; i <= 60; i++) { const v = c.d.vb - 0.2 * c.d.vpp + 1.4 * c.d.vpp * i / 60, q = rates(c, 0, Math.max(0, v)), z = cx.div([0, q.mu], [-(q.gi + q.ge), q.Delta]), so = [1 + q.mu * z[1], -q.mu * z[0]]; vs.push([v, so[0] * so[0] + so[1] * so[1]]); }
      const X = (v) => ex + (v - vs[0][0]) / (vs[vs.length - 1][0] - vs[0][0]) * ew, Y = (t) => ey + (1 - t) * eh;
      ctx.strokeStyle = 'rgba(214,226,242,0.35)'; ctx.lineWidth = 1 * DPR; ctx.strokeRect(ex, ey, ew, eh);
      ctx.strokeStyle = '#f2b04a'; ctx.lineWidth = 2 * DPR; ctx.beginPath(); vs.forEach(([v, t], i) => (i ? ctx.lineTo(X(v), Y(t)) : ctx.moveTo(X(v), Y(t)))); ctx.stroke();
      c.V.forEach((v, k) => { ctx.fillStyle = ['#64c9df', '#5dd193', '#f2b04a', '#ff8d9c'][k]; ctx.beginPath(); ctx.arc(X(v), Y(r.T[k]), 4 * DPR, 0, 2 * Math.PI); ctx.fill(); });
      cvPill(ctx, `정적 전달: T(V) at 레이저 · OMA ${f2(r.omaDbm, 1)} dBm · ER ${f2(r.er, 1)} dB`, ex, pad + 4 * DPR, 'left', '#f2b04a');
      txt(ctx, `${vs[0][0].toFixed(1)} V`, ex, ey + eh - 8 * DPR, { size: 9 }); txt(ctx, `${vs[vs.length - 1][0].toFixed(1)} V (역바이어스)`, ex + ew, ey + eh - 8 * DPR, { size: 9, align: 'right' });
    }
    if (narrow) return;
    const px = W * 0.62, pw = W - px - pad, rad = Math.min(pw * 0.22, H * 0.16);
    drawRing(ctx, px + pw * 0.3, pad + 20 * DPR + rad, rad, { glow: Math.log10(1 + r.c.B.Pc[0] / r.c.P0) / 2, heater: r.PhA / Math.max(l.s2.ph || 10, 1), x0: px, x1: px + pw * 0.62 });
    numbers(ctx, [['R (레이아웃)', `${r.Rlay.toFixed(3)} µm`], ['g', `${Math.round(r.d.g * 1000)} nm`], ['Q_L / 선폭', `${Math.round(r.QL)} / ${f2(r.fwhm * 1e6, 0)} pm`], ['f_Q / f_RC', `${Math.round(r.fQ)} / ${Math.round(r.fRC)} GHz`], ['이동', `${f2(r.shiftPmV, 1)} pm/V`], ['C_j', `${f2(r.Cj, 1)} fF`], ['IL / ER', `${f2(r.IL, 1)} / ${f2(r.er, 1)} dB`]], px, pad + 30 * DPR + 2 * rad, pw);
  }

  const K = {
    title: 'Microring modulator', aspect: 0.5, noSize: true, sizeLabel: '면적', sizeUnit: 'µm²', primaryLabel: 'OMA−페널티 dBm',
    params: (l) => P(l), landKeys: () => ['R', 'g', 'det', 'vpp'], violation: () => 0,
    toggles: () => [{ k: 'useCard', label: '내 PN 위상기 카드(2-2)를 링 접합으로 사용', needs: '2-2' }, { k: 'useHeater', label: '내 히터 카드(2-1)의 단면(h·격리)을 링 히터로 사용', needs: '2-1' }],
    evaluate(l, d, proc, opt) { const a = analyse(l, d, proc); return { ...a, drc: a.Rlay < 3 ? ['링 반경이 너무 작습니다'] : [], primary: a.omaDbm - a.pen, secondary: a.bw }; },
    perf(l, r) { return 200 * clamp(1 - r.pen / 6, 0, 1) + 150 * clamp(r.bw / 70, 0, 1) + 150 * clamp((r.omaDbm + 4) / 8, 0, 1); },
    comp(l, r) { return 300 * clamp(l.s2.eb / Math.max(r.Etot, 1e-3), 0, 1); },
    q1: r1, q2: r2,
    objectives(l, r) {
      return {
        t1: [{ k: `삽입 손실 ≤ ${fmtT(l.s1.il)} dB`, v: f2(r.IL, 2) + ' dB', ok: r.IL <= l.s1.il }, { k: `정적 ER ≥ ${fmtT(l.s1.er)} dB`, v: f2(r.er, 2) + ' dB', ok: r.er >= l.s1.er }, { k: `EO 대역폭 ≥ ${fmtT(l.s1.bw)} GHz`, v: f2(r.bw, 1) + ' GHz', ok: r.bw >= l.s1.bw }],
        t2: [{ k: `112 GBd PAM4 페널티 ≤ ${fmtT(l.s2.pen)} dB`, v: f2(r.pen, 2) + ' dB', ok: r.pen <= l.s2.pen }, { k: `OMA<sub>outer</sub> ≥ ${dbm(l.s2.oma)} dBm`, v: f2(r.omaDbm, 2) + ' dBm', ok: r.oma >= l.s2.oma },
          { k: `최악 히터 전력 (${TRng(l)[0]}–${TRng(l)[1]} °C) ≤ ${fmtT(l.s2.ph)} mW`, v: f2(r.PhW, 1) + ' mW', ok: r.PhW <= l.s2.ph }, { k: '열적 안정 (자기 가열 루프 이득 < 1)', v: f2(r.gth, 2), ok: r.gth < 1 }]
      };
    },
    fabPass: (l, r) => r.pen <= l.fab.pen && r.oma >= l.fab.oma && r.PhW <= l.fab.ph && r.gth < 1 && r.bw >= l.s1.bw,
    fabCrit: (l) => `페널티 ≤ ${fmtT(l.fab.pen)} dB · OMA ≥ ${dbm(l.fab.oma)} dBm · 온도 ${TRng(l)[0]}–${TRng(l)[1]} °C 전체 히터 ≤ ${fmtT(l.fab.ph)} mW (폭·두께·도핑·간격 공정 오차, 공진 위치는 다이마다 무작위)`,
    meta(l, r) { return `${l.pf.mat === 'si' ? '' : '이종 집적 '}Si 리브 링 · ${r.c.pnD.src} (η ${ETA}) · ${r.c.hd.src} · 입력 ${PIN} dBm · 112 GBd PAM4 (224 Gb/s 라인) · 드라이버 ${FDRV} GHz, ${RSRC} Ω<br>레이아웃 반경 <b>${r.Rlay.toFixed(3)} µm</b> (차수 m ${r.m}, 최고 온도 ${TRng(l)[1]} °C에서 레이저보다 ${f2(r.d.bm, 2)} nm 파랑) · 자기 가열 ${f2(r.selfK, 1)} K · 내부 파워 ${f2(r.Pcirc, 0)} mW`; },
    tiles(l, r) { return [['EO 대역폭', `${f2(r.bw, 1)}<small>GHz</small>`], ['OMA · 페널티', `${f2(r.omaDbm, 1)}<small>dBm</small> · ${f2(r.pen, 1)}<small>dB</small>`], ['히터 최악 · 평균', `${f2(r.PhW, 1)} · ${f2(r.PhA, 1)}<small>mW</small>`], ['에너지 (구동 + 열)', `${f2(r.Ebit, 1)} + ${f2(r.Eth, 0)}<small>fJ/bit</small>`]]; },
    hint(l, r) { return `Q<sub>L</sub> ${Math.round(r.QL)} (Q<sub>i</sub> ${Math.round(r.Qi)}, Q<sub>c</sub> ${Math.round(r.Qc)}) · ${regimeTxt[r.regime]} · 선폭 ${f2(r.fwhm * 1e6, 0)} pm · FSR ${NMf(r.fsr, 2)} nm<br>대역: 광자 수명(Q) × 디튜닝 피크 × RC (f<sub>RC</sub> ${Math.round(r.fRC)} GHz) — Q만으로 정해지지 않습니다<br>히터: P<sub>2π</sub> ${f2(r.P2pi, 1)} mW는 반경과 무관 → 필요 이동 (드리프트 ${f2(r.dldTpm * (TRng(l)[1] - TRng(l)[0]) / 1e3, 2)} nm + 여유) ÷ FSR이 전력을 정합니다`; },
    draw(cv, l, r) { drawFull(cv, l, r, true); },
    chartTitle: () => 'PAM4 레벨 스펙트럼(위) · EO 응답(아래)',
    chart(l, r) { return { html: specChart(r, { span: Math.max(3 * r.fwhm, Math.abs(r.d.det) * r.fwhm / 2 + 2 * r.fwhm), levels: true, y0: -30, H: 190 }) + eoChart(r, 200), legend: eoLegend(r) }; },
    coach(l, r, c) {
      const t = c.tier, d = r.d, rs1 = (x) => [x.IL / l.s1.il, l.s1.er / Math.max(x.er, 1e-3), l.s1.bw / Math.max(x.bw, 1e-3)], rs2 = (x) => [x.pen / l.s2.pen, l.s2.oma / Math.max(x.oma, 1e-6), x.PhW / l.s2.ph, x.gth >= 1 ? 2 : 0];
      const q1 = (x) => smooth(rs1(x)), q2s = (x) => keepStar(r1(l, x), smooth(rs2(x)));
      if (!c.ob1) {
        const b = lineBestOf(K, l, d, ['g', 'det', 'vpp', 'dop', 'vb', 'R'], q1, 10);
        if (!b) { const b2 = localBest(K, l, d, ['g', 'det', 'vpp', 'vb', 'dop', 'R'], q1) || [['g', 'vpp'], ['g', 'det'], ['det', 'vpp']].map((ks) => pairBest(K, l, d, ks, q1, 8)).filter(Boolean).sort((x, y) => x.q - y.q)[0]; if (b2) return { h: '★: 손잡이 하나로는 더 나아지지 않습니다', b: '대역·ER·IL이 서로 묶여 있습니다 — 여러 손잡이를 함께 움직이세요.' + recText2(b2, t) }; }
        if (r.bw < l.s1.bw) return { h: r.fQ < r.fRC ? 'EO 대역이 부족합니다 — 광자 수명' : 'EO 대역이 부족합니다 — RC', b: (r.fQ < r.fRC ? `Q<sub>L</sub> ${Math.round(r.QL)}: 빛이 링에 오래 머뭅니다. 간격을 줄여 Over-coupling으로 Q<sub>L</sub>을 낮추거나 디튜닝을 키우세요.` : `f<sub>RC</sub> ${Math.round(r.fRC)} GHz: 바이어스를 키워 C<sub>j</sub>를 줄이거나 반경을 줄이세요(C ∝ 둘레).`) + recText(b, t, d) };
        if (r.IL > l.s1.il) return { h: '삽입 손실이 큽니다', b: '레이저가 공진 골에 가깝거나 링 손실이 큽니다. 디튜닝을 키우거나 Over-coupling 쪽으로 가세요.' + recText(b, t, d) };
        if (r.er < l.s1.er) return { h: 'ER이 부족합니다', b: `공진 이동 ${f2(r.shiftPmV * d.vpp, 0)} pm vs 선폭 ${f2(r.fwhm * 1e6, 0)} pm. 진폭을 키우거나 디튜닝을 사면의 가파른 곳으로 옮기세요.` + recText(b, t, d) };
        return null;
      }
      if (!c.ob2) {
        if (r.gth >= 1) return { h: '★★: 자기 가열로 열 폭주합니다', b: `레이저가 공진의 장파장 쪽(x > 0)에 있으면 흡수된 빛이 링을 데워 공진을 레이저 쪽으로 끌어오고, 그러면 더 많이 흡수합니다 (루프 이득 ${f2(r.gth, 2)}). 레이저를 단파장 쪽(x < 0)에 두면 음의 되먹임으로 안정합니다.` };
        if (r.PhW > l.s2.ph) { const b = lineBestOf(K, l, d, ['bm', 'R'], q2s, 30); return { h: '★★: 온도 범위 전체를 덮는 히터 전력이 큽니다', b: `필요 이동 = 드리프트 ${f2(r.dldTpm * (TRng(l)[1] - TRng(l)[0]) / 1e3, 2)} nm + 배치 여유 ${f2(d.bm, 2)} nm, 전력 = 이동/FSR × P<sub>2π</sub>(${f2(r.P2pi, 1)} mW). 반경을 줄이면 FSR이 넓어져 같은 이동이 적은 전력이 됩니다.` + recText(b, t, d) }; }
        const b = lineBestOf(K, l, d, ['det', 'vpp', 'g', 'dop', 'vb', 'R'], q2s, 10);
        if (b) return { h: r.pen > l.s2.pen ? '★★: 눈이 덜 열렸습니다' : '★★: OMA가 부족합니다', b: (r.pen > l.s2.pen ? 'Lorentzian 사면의 비선형이 PAM4 레벨을 압축하고, 광자 수명·RC가 심볼 간 간섭을 만듭니다.' : '정적 OMA가 커도 고속에서는 광자 수명·RC 때문에 바깥 레벨까지 못 갑니다.') + recText(b, t, d) };
        const b2 = localBest(K, l, d, ['g', 'det', 'vpp', 'vb', 'dop', 'R', 'bm'], q2s) || [['g', 'vpp'], ['g', 'det'], ['det', 'vpp']].map((ks) => pairBest(K, l, d, ks, q2s, 8)).filter(Boolean).sort((x, y) => x.q - y.q)[0];
        if (b2) return { h: '★★: 손잡이 하나로는 더 나아지지 않습니다', b: 'Q를 낮추면 대역은 늘지만 기울기가 줄고, 디튜닝을 옮기면 OMA와 레벨 간격이 함께 바뀝니다. 두 손잡이를 함께 움직이세요.' + recText2(b2, t) };
      }
      if (c.ob2 && c.fab && c.fab.yield < l.fab.y) return { h: '공정 오차에 공진 위치가 흔들립니다', b: `다이마다 폭·두께 오차로 공진이 수 nm씩 움직입니다(∂λ/∂t ≈ ${f2(r.c.x.dndt * r.c.lam / r.c.x.ng, 2)} nm/nm). 히터가 빨강 쪽으로만 옮길 수 있으므로 배치 여유 Δλ<sub>b</sub>로 분포의 가운데를 맞추고, FSR을 넓혀(반경↓) 한 FSR 안의 히터 전력을 줄이세요.` };
      return null;
    },
    compareRows: (l, r) => [['OMA (외곽)', r.omaDbm, 'dBm', 2, 'hi', 'semi'], ['눈 페널티', r.pen, 'dB', 2, 'lo', 'semi'], ['삽입 손실 (동작점)', r.IL, 'dB', 2, 'lo', 'semi'], ['EO 대역폭', r.bw, 'GHz', 1, 'hi', 'semi'], ['히터 (0–70 °C 최악)', r.PhW, 'mW', 1, 'lo', 'semi'], ['에너지 (구동 + 열)', r.Etot, 'fJ/bit', 0, 'lo', 'semi'], ['열 루프 이득 g_th', r.gth, '', 2, 'lo', 'semi'], ['면적', r.area, 'µm²', 0, 'lo', 'an']],
    card(l, r) { return { kind: 'mrr', lines: [`EO ${f2(r.bw, 1)} GHz · IL ${f2(r.IL, 1)} dB · R ${r.Rlay.toFixed(2)} µm`, `OMA ${f2(r.omaDbm, 1)} dBm @${PIN} dBm · 페널티 ${f2(r.pen, 1)} dB · 히터 ${f2(r.PhW, 1)} mW`],
      model: { bw: +r.bw.toFixed(1), il: +r.IL.toFixed(2), gain: +(r.omaDbm - PIN).toFixed(2), pen: +r.pen.toFixed(2), R: r.Rlay, g: r.d.g, fsr: +(r.fsr * 1e3).toFixed(3), QL: Math.round(r.QL), er: +r.er.toFixed(2), ph: +r.PhW.toFixed(2), pha: +r.PhA.toFixed(2), p2pi: +r.P2pi.toFixed(2), eb: +r.Ebit.toFixed(2), eth: +r.Eth.toFixed(1), area: Math.round(r.area), dldT: +(r.dldTpm).toFixed(1), cj: +r.Cj.toFixed(2), vpp: r.d.vpp } }; },
    aiStarts: (l) => [l.start, { ...l.start, g: 0.18, det: -0.5, vpp: 1.5 }],
    exportGeom(l, r) { return exportRing(l, r); },
    panel: (l, r, ctx) => panel(l, r, ctx),
    _x: { analyse, core, cross, pnTab, heater, layout, allpass, statics, eoResp, eyeSim, rates, kapF, bendDBmm, ETA, PIN, BAUD, BUS, TRng }
  };

  /* ---------- MZM vs MRR comparison (after ★ or with a 2-3R card) — same 112 GBd PAM4, same 13 dBm input, same 0–70 °C, same link requirement ---------- */
  const CMP = new Map();
  const cmpKey = (l, r, d23) => l.pf.id + JSON.stringify(r.d) + JSON.stringify(d23) + JSON.stringify(r.c.pnD) + JSON.stringify(r.c.hd);
  function compare(l, r, run) {
    const lev = (id) => (typeof GAME_LEV !== 'undefined' ? GAME_LEV(id) : null), l23 = lev('2-3'); if (!l23) return null;
    const cd = cards(), d23 = cd['2-3'] && cd['2-3'].d ? cd['2-3'].d : l23.ref, src23 = cd['2-3'] && cd['2-3'].d ? '내 2-3 카드' : '2-3 기준 설계';
    const key = cmpKey(l, r, d23);
    if (CMP.has(key)) return CMP.get(key);
    if (!run) return { pending: true };
    const M = KINDS.mzm, m = M.evaluate(l23, d23), RB = 2 * BAUD * 1e9;
    // driver load energy: MZM — PAM4 mean-square line voltage into R_T, ×2 for the matched source; MRR — PAM4 C·V² charging
    const v0 = m.v0, Emzm = 2 * (v0 * v0 / 4) * (5 / 9) / d23.RT / RB * 1e15;
    // thermal control: MZM bias heater (balanced arms: no temperature drift) needs a random bias phase in [0, π/2] → mean P_π/4;
    // MRR: heater over the temperature range and over the process (any resonance order within one FSR) — Monte Carlo mean
    const PpiB = r.c.H.Ppi, EthM = PpiB / 4 * 1e-3 / RB * 1e15;
    const dies = makeWafer(11 * 97, 1), yM = [], yR = []; let pha = 0, n = 0;
    for (const die of dies) {
      const proc = { ...die, dt: die.dt * l.pf.dt / 0.006 };
      const a = KINDS.mrr.evaluate(l, r.d, proc); pha += a.PhA; n++; yR.push(KINDS.mrr.fabPass(l, a));
      yM.push(M.fabPass(l23, M.evaluate(l23, d23, proc)));
    }
    const EthR = pha / n * 1e-3 / RB * 1e15;
    // optical bandwidth without retuning: laser range keeping the static OMA within 1 dB (MRR); balanced MZI: coupler-limited
    let lo = 0, hi = 0; const o0 = r.omaDbm, step = r.fwhm * 1e6 / 20;
    for (let k = 1; k <= 120; k++) { const a = analyse(l, r.d, null, { R: r.Rlay, lamR0: r.c.B.lamOpX(0), sL: -k * step, noEye: true }); if (a.omaDbm < o0 - 1) break; lo = k * step; }
    for (let k = 1; k <= 120; k++) { const a = analyse(l, r.d, null, { R: r.Rlay, lamR0: r.c.B.lamOpX(0), sL: k * step, noEye: true }); if (a.omaDbm < o0 - 1) break; hi = k * step; }
    // uncorrected ±5 K drift (heater lock off): static OMA loss
    const drift = (dT) => analyse(l, r.d, null, { R: r.Rlay, lamR0: r.c.B.lamOpX(0) + r.c.dldT * dT, noEye: true }).omaDbm;
    const d5 = Math.min(drift(5), drift(-5)) - o0;
    const areaM = d23.L * 1000 * (2 * d23.g + 15 + 100);
    const req = l23.s2, pass = (pen, oma) => pen <= req.pen && oma >= req.oma;
    // the same dies for both modulators → paired counts (dies whose verdicts differ)
    const out = { m, d23, src23, Emzm, EthM, EthR, yM: yM.filter(Boolean).length / yM.length, yR: yR.filter(Boolean).length / yR.length, nY: yM.length, okM: yM.filter(Boolean).length, okR: yR.filter(Boolean).length, mOnly: yM.filter((f, i) => f && !yR[i]).length, rOnly: yM.filter((f, i) => !f && yR[i]).length, obw: (lo + hi), d5, areaM, req, passM: pass(m.pen, m.oma), passR: pass(r.pen, r.oma), PpiB };
    if (CMP.size > 20) CMP.clear(); CMP.set(key, out);
    return out;
  }
  function panel(l, r, ctx) {
    const title = 'MZM vs MRR 비교 — 같은 112 GBd PAM4 · 13 dBm 입력 · 0–70 °C · 같은 링크 요구';
    if (!ctx.stars && !ctx.hasCard) return { title, html: '<p class="note">2-3R에서 ★를 달성하면(또는 2-3R 카드가 있으면) 이 자리에 2-3 TW-MZM과의 같은 조건 비교가 열립니다. 비교는 점수에 들어가지 않습니다.</p>' };
    const c = compare(l, r, ctx.run); if (!c) return null;
    if (c.pending) return { title, html: `<p class="note" style="margin:0 0 8px">지금 설계(R ${r.Rlay.toFixed(2)} µm)를 2-3 TW-MZM과 같은 조건에서 비교합니다. 공정 몬테카를로(같은 웨이퍼 69 다이 × 두 변조기, 시드 1067)를 포함해 1–2초 걸립니다.</p><div class="row-btns"><button class="btn pri" data-xp-run="1">같은 조건으로 비교 계산</button></div>` };
    const m = c.m, fmt = (v, k) => (Number.isFinite(v) ? (+v).toFixed(k == null ? 1 : k) : '—');
    // differences inside the model's resolution are ties (abs. tolerance for dB, relative 5 % for GHz / fJ / area, 3 points for yield)
    const win = (a, b, better, tol) => { const t = tol == null ? 0.05 * Math.max(Math.abs(a), Math.abs(b)) : tol; if (Math.abs(a - b) <= t) return -1; return better === 'hi' ? (a > b ? 0 : 1) : (a < b ? 0 : 1); };
    const rows = [
      ['광 대역 (재조정 없이 OMA −1 dB 이내)', '≥ 40 nm (균형 MZI, 3-dB 커플러 한계 · 가정)', `${fmt(c.obw, 0)} pm`, 0, 'asm', 'MZM은 파장에 거의 무관, MRR은 선폭 안쪽에서만 동작'],
      ['EO 대역폭', `${fmt(m.bw)} GHz`, `${fmt(r.bw)} GHz`, win(m.bw, r.bw, 'hi'), 'semi', 'MZM: 진행파 속도·임피던스 정합 · MRR: 광자 수명·디튜닝·RC'],
      ['면적 (소자)', `${fmt(c.areaM / 1e6, 3)} mm²`, `${fmt(r.area / 1e6, 4)} mm²`, win(c.areaM, r.area, 'lo'), 'asm', 'MZM: 전극 길이 × (2g + 15 + 2×50 µm) · MRR: (2R + 8 µm)²'],
      ['삽입 손실', `${fmt(m.IL, 2)} dB`, `${fmt(r.IL, 2)} dB`, win(m.IL, r.IL, 'lo', 0.1), 'semi', ''],
      ['OMA<sub>outer</sub> (정착 레벨)', `${fmt(m.omaDbm, 2)} dBm`, `${fmt(r.omaDbm, 2)} dBm`, win(m.omaDbm, r.omaDbm, 'hi', 0.1), 'semi', ''],
      ['PAM4 눈 페널티 (5-tap FFE)', `${fmt(m.pen, 2)} dB`, `${fmt(r.pen, 2)} dB`, win(m.pen, r.pen, 'lo', 0.1), 'semi', ''],
      ['구동(부하) 에너지', `${fmt(c.Emzm, 1)} fJ/bit`, `${fmt(r.Ebit, 1)} fJ/bit`, win(c.Emzm, r.Ebit, 'lo'), 'an', 'MZM: 종단 + 정합 소스 손실 · MRR: PAM4 C·V² (드라이버 회로 자체 전력 제외)'],
      ['열 제어 에너지 (평균)', `${fmt(c.EthM, 1)} fJ/bit`, `${fmt(c.EthR, 1)} fJ/bit`, win(c.EthM, c.EthR, 'lo'), 'semi', `MZM 바이어스 히터 평균 P<sub>π</sub>/4 (P<sub>π</sub> ${fmt(c.PpiB, 1)} mW, 균형 팔: 온도 무관) · MRR: 0–70 °C × 공정 몬테카를로 평균`],
      ['비트당 에너지 합계', `${fmt(c.Emzm + c.EthM, 1)} fJ/bit`, `${fmt(r.Ebit + c.EthR, 1)} fJ/bit`, win(c.Emzm + c.EthM, r.Ebit + c.EthR, 'lo'), 'semi', '레이저(같은 13 dBm 입력)·DSP 제외'],
      ['±5 K 드리프트 (락 꺼짐) OMA 손실', '≈ 0 dB (균형 팔)', `${fmt(c.d5, 1)} dB`, c.d5 < -0.1 ? 0 : -1, 'semi', '열 견고성'],
      ['Fab 수율 (같은 웨이퍼 쌍 비교 · 시드 1067 · 69 다이, Monte Carlo 추정)', `${c.okM}/${c.nY} = ${fmt(c.yM * 100, 0)} %`, `${c.okR}/${c.nY} = ${fmt(c.yR * 100, 0)} %`, (() => { const t = pairedSign(c.mOnly, c.rOnly); return t.k && t.p < 0.05 ? (t.dir > 0 ? 1 : 0) : -1; })(), 'semi', `각 레벨 자신의 ★★★ 판정 (MRR은 히터 예산·온도 포함) · ${pairedText('MZM', 'MRR', c.mOnly, c.rOnly, true)}`],
      [`공통 링크 요구 (2-3 ★★: 페널티 ≤ ${fmtT(c.req.pen)} dB, OMA ≥ ${dbm(c.req.oma)} dBm)`, c.passM ? '충족' : '미달', c.passR ? '충족' : '미달', c.passM && !c.passR ? 0 : c.passR && !c.passM ? 1 : -1, 'semi', '']
    ];
    const B = { an: 'Analytical', semi: 'Physics-informed Surrogate', asm: 'Unverified Assumption' };
    const td = (v, w) => `<td class="${w ? 'win' : ''}">${v}</td>`;
    const tb = rows.map(([k, a, b, w, f, note]) => `<tr><th scope="row">${k}${note ? `<br><span class="note">${note}</span>` : ''}</th>${td(a, w === 0)}${td(b, w === 1)}<td><span class="badge2 b-${f}">${B[f]}</span></td></tr>`).join('');
    const nm = (w) => rows.filter((x) => x[3] === w).map((x) => x[0].replace(/<[^>]+>/g, '').replace(/ \(.*$/, '')), mz = nm(0), mr = nm(1), tie = nm(-1).filter((x) => !/공통 링크/.test(x));
    return { title, html: `<p class="note" style="margin:0 0 8px">MZM: ${c.src23} (L ${c.d23.L} mm) · MRR: 지금 설계 (R ${r.Rlay.toFixed(2)} µm). 점수 합산이 아니라 항목별로 어느 쪽이 유리한지 보여 줍니다 — 어느 하나가 항상 이기지 않습니다.</p>
      <div class="gtbl"><table class="cmp"><tr><th>항목</th><th>2-3 TW-MZM</th><th>2-3R MRR</th><th>근거</th></tr>${tb}</table></div>
      <p class="note"><b>MZM이 유리:</b> ${mz.join(' · ') || '—'}<br><b>MRR이 유리:</b> ${mr.join(' · ') || '—'}${tie.length ? `<br><b>비슷 (모델 분해능 이내, 수율은 쌍 비교로 구분되지 않음):</b> ${tie.join(' · ')}` : ''}<br>MZM은 광대역·온도 견고성, MRR은 면적·구동 에너지가 본질적 장점이고, MRR의 대가는 온도·공정 추적에 드는 히터 전력과 제어입니다.</p>` };
  }
  function exportRing(l, r) {
    const c = r.c, rd = (v) => +(+v).toFixed(4);
    return { pcell: 'ring_allpass', core_mat: 'si', R_um: c.lay.R, R_slider_um: r.d.R, gap_um: r.d.g, w_um: rd(c.xN.w), bus_w_um: rd(c.xN.w), bus_len_um: rd(2 * c.lay.R + 20),
      rib: { t_um: T_RIB, slab_um: T_SLAB, slab_ext_um: 2.0 }, order_m: c.lay.m, heterogeneous_si: l.pf.mat !== 'si',
      junction: { type: 'lateral PN (P inside, N outside)', coverage: ETA, arc_deg: rd(360 * ETA), centred_opposite_coupler: true, abstraction: 'PN implants drawn as annotation layers (generic PDK: not foundry implant rules)' },
      heater: { h_um: c.hd.h, iso: c.hd.iso, coverage: HCOV, w_um: 2.0, arc_deg: rd(360 * HCOV), gap_centred_opposite_coupler: true, abstraction: 'heater arc + leads + pads on an abstract heater layer (TiN 2 µm as in 2-1)' },
      lambda_design_um: rd(c.lamOp), predicted: { fsr_nm: rd(r.fsr * 1e3), QL: Math.round(r.QL), Qi: Math.round(r.Qi), Qc: Math.round(r.Qc), kappa2: +c.B.k2.toPrecision(4), shift_pm_per_V: rd(r.shiftPmV), Cj_fF: rd(r.Cj), PhW_mW: rd(r.PhW), dlambda_dT_pm_K: rd(r.dldTpm) },
      model: { neff: rd(c.xN.neff), ng: rd(c.xN.ng), approximation: 'EIM rib + Marcuse coupled-slab κ over the curved gap; bend radiation (Marcuse); junction Δn from the 2-2 PN model; engineering surrogate, verify with a mode solver / FDTD' } };
  }
  K.steps = (l) => stepDefs(l);
  return K;
})();
