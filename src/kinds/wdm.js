// ===== Kind: 1.6T MRR WDM8 transmitter — 8 wavelengths × 200G on one shared bus (Stage 3 · Advanced WDM, Phase E) =====
// A separate Tx architecture, not DR8 with other wavelengths: one external multi-wavelength source (comb, or 8 DFBs muxed in the
// ELS) feeds ONE bus waveguide; eight 2-3R microrings sit on that bus, each modulating its own channel and passing the others.
//   grid      : 8 channels at 200 / 400 / 800 GHz around the platform wavelength (CW-WDM MSA: 8/16/32-λ O-band sources)
//   rings     : the 2-3R ring design (card or reference) at the radius chosen here → FSR, linewidth, OMA, eye, self-heating
//   optics    : every ring is an all-pass Airy filter on the shared bus, periodic in its FSR — through loss of the other channels,
//               modulation crosstalk (ring k's PAM4 levels seen by channel j) and FSR aliasing (ring k's next order on channel j)
//               all come from the same transmission function
//   locking   : red-only heaters; ring k's unheated resonance = its design position (same radius → all near λ₀, stepped radii →
//               each near its own λ_k, 1-nm layout grid residual) − dλ/dT·(T_max − T) + die process shift + ring-to-ring mismatch;
//               assignment fixed (ring k → λ_k) or cyclic (barrel shift: ring k → λ_(k+s) mod 8, s chosen at every temperature);
//               heater thermal crosstalk between rings at pitch p from the 2-1 cross-section (long-heater profile → upper bound)
//   source    : comb (one laser, line powers fixed — parabolic tilt) or 8 DFBs + MUX in the ELS (line powers trimmed to equalise
//               the channel margins at the same total optical power)
//   link      : CPO packaging (3A+ constants), one fibre 500 m, Rx: dense demux (IL / crosstalk assumption) → Ge PD (2-4)
KINDS.wdm = (() => {
  const N = 8, TBPS = 1.6, TLO = 0, THI = 70, DCDC = 0.9, BIT = 224e9, CUM = 2.998e14, TIA = 0.12;
  const GRID = [200, 400, 800];
  const SRC = ['콤 광원 (ELS · 레이저 1개, 선 세기 고정)', 'DFB ×8 + MUX (ELS · 선마다 출력 조정)'];
  const ASG = ['고정 배정 (링 k → λ_k)', '순환 배정 (배럴 시프트)'];
  const RAD = ['같은 반경 (모든 링이 λ₀ 근처)', '계단 반경 (링 k가 λ_k 근처)'];
  // representative assumptions (shown as Unverified Assumption in the UI and docs/wdm8.md)
  const TILT = 2.0;                    // comb: outermost lines this many dB below the centre (parabolic envelope)
  const COMB_WPE = 0.12, ELS_OH = 0.5; // comb ELS wall-plug efficiency, ELS overhead (TEC, control) in W
  const MUX_IL = 2.5, LOCKER = 10, POH = 60;   // DFB ELS: 8:1 dense MUX IL (dB), wavelength locker per laser (mW), drive overhead (mW)
  const LOC_SIG = 0.15;                // nm, ring-to-ring resonance mismatch inside one die (1σ); close rings track each other
  const HMAX = 1.2;                    // heater driver range in units of P_2π (one FSR + 20 %)
  const RXD = { il: 1.5, xt: [-20, -25, -30] };   // Rx dense demux IL (dB) and total crosstalk (dB) per grid
  const TGRID = Array.from({ length: 15 }, (_, i) => TLO + (THI - TLO) * i / 14);
  const gl = (id) => (typeof GAME_LEV !== 'undefined' ? GAME_LEV(id) : null);
  const cards = () => (typeof window !== 'undefined' ? window.GAME_CARDS : global.GAME_CARDS) || {};
  const XC = () => KINDS.xcvr._x, PKG = () => XC().PKG[2];   // CPO packaging constants of 3A+
  const mW = (dbm) => Math.pow(10, dbm / 10), dBm = (mw) => 10 * Math.log10(Math.max(mw, 1e-9));
  const mod = (x, m) => ((x % m) + m) % m;
  const xtPen = (eps) => -10 * Math.log10(Math.max(0.05, 1 - 3 * eps));
  const gaussLike = (proc, k) => gaussR(mulberry((proc.seed || 1) * 29 + k * 709));
  const PR = () => [
    { k: 'P', label: '광원 출력 (채널당, 광원 출력단)', sym: 'P<sub>ch</sub>', min: 4, max: 16, step: 0.5, dec: 1, unit: 'dBm' },
    { k: 'grid', label: '파장 격자 (채널 간격)', sym: 'Δf', min: 0, max: 2, step: 1, dec: 0, unit: '', labels: GRID.map((g) => `${g} GHz`) },
    { k: 'R', label: '링 반경 → FSR (2-3R 링 설계, 반경만 바꿈)', sym: 'R', min: 3, max: 12, step: 0.05, dec: 2, unit: 'µm' },
    { k: 'rad', label: '링 반경 배치', sym: 'R<sub>k</sub>', min: 0, max: 1, step: 1, dec: 0, unit: '', labels: RAD },
    { k: 'asg', label: '공진 배정 (어느 링이 어느 파장을)', sym: 'a(k)', min: 0, max: 1, step: 1, dec: 0, unit: '', labels: ASG },
    { k: 'src', label: '다파장 광원', sym: 'ELS', min: 0, max: 1, step: 1, dec: 0, unit: '', labels: SRC },
    { k: 'pitch', label: '링 간격 (버스 위, 중심–중심)', sym: 'p', min: 15, max: 150, step: 1, dec: 0, unit: 'µm' }
  ];
  const keys = () => ['P', 'grid', 'R', 'rad', 'asg', 'src', 'pitch'];
  const dlam = (l, d) => l.pf.lam * l.pf.lam * GRID[d.grid | 0] * 1e9 / CUM;   // µm, channel spacing
  const pmin = (R) => 2 * R + 20;   // ring cell along the bus (ring + heater leads + coupler), the same cell the GDS draws

  /* ---------- parts: cards (toggle) or the reference design of each level; the ring is the 2-3R design ---------- */
  function parts(l, d) {
    const c = cards(), ref = l.parts, use = !!d.useCard, src = [];
    const pick = (id, f, rv) => { if (use && c[id] && c[id].model) { src.push(id); return f(c[id]); } return rv; };
    const p = { ssc: pick('1-6', (x) => x.model.loss, ref.ssc), sens: pick('2-4', (x) => x.model.sens, ref.sens),
      cplx: pick('2-5', (x) => 0.003 * x.d.th * x.d.th + (x.d.iso ? 1.0 : 0), ref.cplx), fb: pick('2-5', (x) => x.model.fb, ref.fb) };
    const lr = gl('2-3R'); p.ring = lr ? { l: lr, d: pick('2-3R', (x) => x.d, lr.ref) } : null;
    p.src = [...new Set(src)]; p.rin = 2.5 / (1 + Math.exp(-(p.fb + 32) / 2));
    return p;
  }
  /* ---------- ring optics at radius R and input power (2-3R engine; the eye only at one reference power per radius) ---------- */
  const RC = new Map();
  function ringA(p, R, Pin, eye) {
    const key = p.ring.l.pf.id + JSON.stringify(p.ring.d) + '|' + R.toFixed(3) + '|' + Pin.toFixed(2) + (eye ? 'e' : '');
    let r = RC.get(key);
    if (!r) { r = KINDS.mrr._x.analyse(p.ring.l, { ...p.ring.d, R }, null, { Pin, noEye: !eye }); if (RC.size > 1500) RC.clear(); RC.set(key, r); }
    return r;
  }
  // own-channel optics: static OMA gain and thermal loop gain at the channel's own power (0.1 dB grid), eye penalty at the mean power
  // (the lock holds the detuning, so the eye depends on power only through TPA / self-heating — weakly)
  function optics(p, R, Pin, Pref) {
    const a = ringA(p, R, Math.round(Pin * 10) / 10, false), e = ringA(p, R, Math.round(Pref * 2) / 2, true);
    return { gain: a.omaDbm - Math.round(Pin * 10) / 10, pen: e.pen, gth: a.gth, c: a.c, r: a, Ebit: e.Ebit, P2pi: a.P2pi, eye: e };
  }
  // through transmission of a ring at a laser offset dl (µm) from the channel it is locked to, for the four PAM4 levels (Airy, periodic)
  function resp(c, dl) {
    const B = c.B, AP = KINDS.mrr._x.allpass;
    return [0, 1, 2, 3].map((k) => AP(B.a[k], B.t, 2 * Math.PI * (B.lamOpX(k) - (B.lamL + dl)) / B.fsr));
  }
  // heater thermal crosstalk at distance x (µm): 2-1 cross-section lateral temperature profile (a long heater — upper bound for rings)
  function kappa(c, x) {
    const th = KINDS.to._x.thermal({ pf: { mat: 'si' } }, c.hd.h, c.hd.iso | 0);
    return clamp(x <= th.xs[0] ? linterp([0, th.xs[0]], [1, th.prof[0]], x) : linterp(th.xs, th.prof, x), 0, 1);
  }
  // die process shift of the ring resonance (linear sensitivity to width / Si thickness, like 3A+)
  const SENS = new Map();
  function procShift(p, R, proc) {
    if (!proc) return 0;
    const key = p.ring.l.pf.id + JSON.stringify(p.ring.d) + R.toFixed(3); let s = SENS.get(key);
    if (!s) {
      const X = KINDS.mrr._x, l = p.ring.l, pf = l.pf, h = 0.002, dd = { ...p.ring.d, R }, n0 = X.core(l, dd, {}).lamNat;
      s = { w: (X.core(l, dd, { proc: { dw: h, dt: 0 } }).lamNat - n0) / h, t: (X.core(l, dd, { proc: { dw: 0, dt: h * (pf.dt || 0.006) / 0.006 } }).lamNat - n0) / h };
      if (SENS.size > 300) SENS.clear(); SENS.set(key, s);
    }
    const pf = p.ring.l.pf; return s.w * (proc.dw || 0) + s.t * (proc.dt || 0) * 0.006 / (pf.dt || 0.006);
  }
  /* ---------- ring radii (layout, 1-nm grid) and the resonance residual of the grid ---------- */
  function radii(l, d, r) {
    const x = r.c.x, lam = l.pf.lam, dl = dlam(l, d), R0 = r.Rlay, sc = R0 * x.ng / (x.neff * lam);   // dR/dλ at fixed order
    return Array.from({ length: N }, (_, k) => {
      const want = (d.rad | 0) ? (k - (N - 1) / 2) * dl : -((N - 1) / 2) * dl, Rk = Math.round((R0 + want * sc) * 1000) / 1000;
      return { R: Rk, q: (Rk - R0 - want * sc) / sc };   // q: resonance residual (µm) of the 1-nm grid
    });
  }
  /* ---------- locking: red-only heaters, assignment, thermal crosstalk ---------- */
  function lockSolve(need, eff, K, fsr) {
    const n = need.slice(); let P = n.map((v) => v / eff), hops = 0;
    for (let it = 0; it < 80; it++) {
      let ch = 0;
      for (let j = 0; j < N; j++) {
        let x = 0; for (let k = 0; k < N; k++) if (k !== j) x += K[j][k] * P[k];
        let s = n[j] - eff * x; while (s < 0) { n[j] += fsr; s += fsr; hops++; }   // pushed past its target by the neighbours' heat → next order
        const Pj = s / eff; ch = Math.max(ch, Math.abs(Pj - P[j])); P[j] = Pj;
      }
      if (ch < 1e-7) break;
    }
    return { P, hops, tot: P.reduce((a, b) => a + b, 0), max: Math.max(...P) };
  }
  function heaters(l, d, oc, gsh, loc) {
    const { fsr, eff, o, dldT, bm, K, Rk, dl } = oc, lamc = (j) => (j - (N - 1) / 2) * dl;
    const tg = Array.from({ length: N }, (_, j) => lamc(j) + o);   // target (relative to λ_c, µm): resonance o from its laser line
    const base = Rk.map((rk, k) => tg[(d.rad | 0) ? k : 0] - bm + rk.q);   // unheated position at T_max (design)
    const at = (T) => {
      const un = base.map((b, k) => b - dldT * (THI - T) + gsh + (loc ? loc[k] : 0));
      let best = null;
      for (let s = 0; s < ((d.asg | 0) ? N : 1); s++) {
        const need = un.map((u, k) => mod(tg[(k + s) % N] - u, fsr)), sol = lockSolve(need, eff, K, fsr);
        if (!best || sol.tot < best.tot - 1e-9) best = { ...sol, s, need };
      }
      return { T, ...best };
    };
    const rows = TGRID.map(at), worst = rows.reduce((a, b) => (b.tot > a.tot ? b : a));
    return { rows, worst, tot: worst.tot, max: Math.max(...rows.map((x) => x.max)), hops: Math.max(...rows.map((x) => x.hops)), mean: rows.reduce((a, b) => a + b.tot, 0) / rows.length };
  }
  /* ---------- channels on the shared bus ---------- */
  // bus between the rings: Si strip at the ring's bus width (also on SiN platforms — the heterogeneous Si ring layer), D-1 scattering
  function busAlpha(l, r) {
    const pf = l.pf.mat === 'si' ? l.pf : Object.values(PLATFORMS).find((q) => q.mat === 'si' && Math.abs(q.lam - l.pf.lam) < 1e-6) || l.pf;
    return KINDS.spiral._x.xs(pf, r.c.xN.w).alpha;   // dB/cm
  }
  function channels(l, p, d, Pline, proc, g, ov) {   // ov: assumption overrides for the robustness panel only ({ rxXT })
    const pk = PKG(), si = l.pf.mat === 'si', dl = dlam(l, d), R = d.R, gi = d.grid | 0;
    const cpl = p.ssc + p.cplx + ((d.src | 0) ? MUX_IL : 0) + (proc ? 0.4 * g(2) : 0);
    const Pchip = Pline.map((v) => v - cpl), Ptot = Pchip.reduce((s, v) => s + mW(v), 0);
    const tpa = si ? 0.6 * Math.pow(Ptot / 100, 2) : 0;
    let Pin = Pchip.map((v) => v - tpa), opt = null, Tm = null, ab = 0;
    for (let pass = 0; pass < 2; pass++) {
      const Pref = Pin.reduce((s, v) => s + v, 0) / N;
      opt = Pin.map((v) => optics(p, R, v, Pref));
      if (!pass) ab = busAlpha(l, opt[0].r) * Math.max(d.pitch, pmin(R)) * 1e-4;   // dB per ring pitch
      Tm = opt.map((o, k) => Array.from({ length: N }, (_, j) => resp(o.c, (j - k) * dl)));
      const IL = (k, j) => -10 * Math.log10(Math.max(1e-9, Tm[k][j].reduce((a, b) => a + b, 0) / 4));
      Pin = Pchip.map((v, j) => { let s = v - tpa - ab * (j + 0.5); for (let k = 0; k < j; k++) s -= IL(k, j); return s; });
      if (pass) {
        const fsr = opt[0].c.B.fsr, epsRx = Math.pow(10, (ov && ov.rxXT != null ? ov.rxXT : RXD.xt[gi]) / 10), chan = 3.0 + (l.pf.lam > 1.4 ? 0.6 : 0.2);
        return Pin.map((pin, j) => {
          const o = opt[j], own = Tm[j][j], m = Math.abs(own[3] - own[0]);
          let after = 0, eps = 0, alias = Infinity;
          for (let k = 0; k < N; k++) {
            if (k === j) continue;
            if (k > j) after += IL(k, j);
            eps += Math.abs(Tm[k][j][3] - Tm[k][j][0]) / Math.max(m, 1e-6);
            const off = (j - k) * dl, ord = Math.round(off / fsr); if (ord !== 0) alias = Math.min(alias, Math.abs(off - ord * fsr));
          }
          const through = (() => { let s = 0; for (let k = 0; k < N; k++) if (k !== j) s += IL(k, j); return s; })();
          const oma = pin + o.gain - after - ab * (N - j - 0.5) + (proc ? 0.3 * g(10 + j) : 0);
          const rx = oma - p.ssc - chan - p.ssc - RXD.il - pk.fau;
          const xtp = xtPen(eps + epsRx), pen = o.pen + xtp + p.rin + pk.epen, sens = p.sens + pk.esens + (proc ? 0.3 * g(3) : 0);
          return { j, Pline: Pline[j], Pchip: Pchip[j], Pin: pin, gain: o.gain, oma, rx, through, eps, xtdB: 10 * Math.log10(Math.max(eps, 1e-9)), xtp, mpen: o.pen, pen, sens, margin: rx - pen - sens, gth: o.gth, alias, o, tpa, ab, cpl, chan, fsr };
        });
      }
    }
    return null;
  }
  /* ---------- the module ---------- */
  // ov (robustness panel only, never the score): { tilt (dB), rxXT (dB), kScale (thermal coupling ×) }
  function analyse(l, d, proc, ov) {
    const g = (k) => (proc ? gaussLike(proc, k) : 0), p = parts(l, d), pk = PKG(), dl = dlam(l, d), R = d.R, src = d.src | 0, TL = ov && ov.tilt != null ? ov.tilt : TILT;
    const tilt = (j) => (src ? 0 : -TL * Math.pow((j - (N - 1) / 2) / ((N - 1) / 2), 2));
    let Pline = Array.from({ length: N }, (_, j) => d.P + tilt(j) + (proc ? (src ? 0.2 : 0.3) * g(20 + j) : 0));
    let ch = channels(l, p, d, Pline, proc, g, ov);
    if (src) {   // DFB array: trim each laser so the channel margins come out equal at the same total optical power
      const c = ch.map((x) => x.margin - x.Pline), tot = Pline.reduce((s, v) => s + mW(v), 0);
      let lo = d.P - 20, hi = d.P + 20;
      for (let it = 0; it < 60; it++) { const mu = (lo + hi) / 2, s = c.reduce((a, cj) => a + mW(clamp(mu - cj, d.P - 4, d.P + 4)), 0); if (s > tot) hi = mu; else lo = mu; }
      Pline = c.map((cj) => clamp((lo + hi) / 2 - cj, d.P - 4, d.P + 4));
      ch = channels(l, p, d, Pline, proc, g, ov);
    }
    const worst = ch.reduce((a, b) => (b.margin < a.margin ? b : a)), o0 = ch[0].o, c0 = o0.c;
    // locking context (nominal process unless Fab)
    const fsr = c0.B.fsr, eff = fsr / o0.P2pi, Rk = radii(l, d, o0.r), pitch = Math.max(d.pitch, pmin(R));
    const K = Array.from({ length: N }, (_, j) => Array.from({ length: N }, (_, k) => (j === k ? 0 : kappa(c0, Math.abs(j - k) * pitch) * (ov && ov.kScale ? ov.kScale : 1))));
    const oc = { fsr, eff, o: c0.B.lamOpX(0) - c0.B.lamL, dldT: c0.dldT, bm: (p.ring.d.bm || 0) * 1e-3, K, Rk, dl };
    const loc = proc ? Array.from({ length: N }, (_, k) => LOC_SIG * 1e-3 * g(40 + k)) : null;
    const H = heaters(l, d, oc, procShift(p, R, proc), loc);
    const lockOK = H.max <= HMAX * o0.P2pi;
    // power: ELS, heaters (Tx rings + Rx demux tuning assumed equal), lock loops, drivers, TIAs, control, DC-DC
    let laser;
    if (!src) { const opt = Pline.reduce((s, v) => s + mW(v), 0) / 1000; laser = opt / COMB_WPE + ELS_OH; }
    else { const wpe = (P) => 0.22 * Math.max(0.05, 1 - P / 200), el = Pline.reduce((s, v) => s + (mW(v) / wpe(mW(v)) + POH), 0) / 1000, opt = Pline.reduce((s, v) => s + mW(v), 0) / 1000; laser = el + 0.3 + (el - opt) / 0.6 + N * LOCKER / 1000; }
    const Eload = XC().mzmLoadE(), Er = o0.Ebit * 1e-15;
    const PW = { laser, heat: 2 * H.tot / 1000, drv: N * (pk.drv - (Eload - Er) * BIT), tia: N * TIA, ctrl: pk.ctrl + 2 * N * XC().RLOCK / 1000 };
    const raw = Object.values(PW).reduce((a, b) => a + b, 0), pw = raw / DCDC; PW.dcdc = pw - raw;
    const gth = Math.max(...ch.map((x) => x.gth)), stable = gth < 1;
    const fw = l.pf.lam / o0.r.QL, span = N * dl, aliased = ch.filter((x) => x.alias < Math.min(dl / 2, 3 * fw));   // another ring's next order closer than 3 linewidths (and nearer than half a channel)
    const drc = d.pitch < pmin(R) - 1e-9 ? [`링 간격 p ${d.pitch} µm < 링 셀 2R + 20 = ${f2(pmin(R), 1)} µm (링·히터 리드가 겹침)`] : [];
    return { p, ch, worst, margin: worst.margin, pw, pj: pw / TBPS, PW, H, lockOK, stable, gth, fsr, span, dl, eff, kap1: K[0][1], Rk, aliased, oc,
      tpa: ch[0].tpa, Pline, drc, P2pi: o0.P2pi, QL: o0.r.QL, fw, Rlay: o0.r.Rlay, grid: GRID[d.grid | 0], size: 1 };
  }
  const bad = (r) => (r.stable ? 0 : 1 + r.gth) + (r.lockOK ? 0 : 1.5) + (r.drc && r.drc.length ? 3 : 0);   // overlapping ring cells never count
  const r1 = (l, r) => Math.max(1 + (l.s1.margin - r.margin) / 3, r.pw / l.s1.pw, bad(r));
  const r2 = (l, r) => Math.max(1 + (l.s2.margin - r.margin) / 3, r.pw / l.s2.pw, r.H.tot / l.s2.heat, bad(r));
  const PCAT = [['laser', '광원 (ELS)', '#f6c35a'], ['heat', '히터 (Tx 링 + Rx Demux)', '#f2b04a'], ['drv', '드라이버', '#64c9df'], ['tia', 'TIA', '#8fb3ff'], ['ctrl', '제어·락', '#9eabbd'], ['dcdc', 'DC-DC 손실', '#5b6b80']];
  const COLS = ['#8fb3ff', '#64c9df', '#5dd193', '#c6e06b', '#f6c35a', '#f2b04a', '#ff8d9c', '#b48cff'];
  const nmS = (um) => f2(um * 1000, 2);
  const why = (l, r) => {
    const d = r.d || {}, w = r.worst;
    if (r.aliased.length) return `FSR ${nmS(r.fsr)} nm가 8채널 폭 8·Δλ = ${nmS(r.span)} nm보다 좁고, 한 링의 다음 공진 차수가 다른 채널 바로 옆(λ${r.aliased[0].j}에서 ${f2(r.aliased[0].alias * 1000, 2)} nm, 선폭 ${nmS(r.fw)} nm)에 놓였습니다(FSR 별칭) — 그 채널은 남의 링에 깎이고 그 링의 변조를 함께 받습니다.`;
    if (w.xtp > 0.8) return `채널 λ${w.j}가 이웃 링들의 변조를 ${f2(w.xtdB, 1)} dB(진폭 비) 받아 크로스토크 페널티 ${f2(w.xtp, 1)} dB입니다 — 간격 Δλ ${nmS(r.dl)} nm가 링 선폭(FWHM ≈ ${nmS(r.fw)} nm)에 비해 좁습니다.`;
    if (!(d.src | 0) && w.j !== 3 && w.j !== 4) return `콤 광원은 가장자리 선이 ${TILT} dB 약해 λ${w.j}가 가장 나쁩니다(선 세기 ${f2(w.Pline, 1)} dBm) — 선마다 출력을 맞출 수 없습니다.`;
    if (r.tpa > 0.3) return `한 버스에 8채널이 다 실려 Si 버스 TPA가 ${f2(r.tpa, 2)} dB입니다(총 ${f2(dBm(r.ch.reduce((s, x) => s + mW(x.Pchip), 0)), 1)} dBm).`;
    return `최악 채널 λ${w.j}: 변조기 입력 ${f2(w.Pin, 1)} dBm → OMA ${f2(w.oma, 1)} dBm → 수신 ${f2(w.rx, 1)} dBm, 페널티 ${f2(w.pen, 1)} dB.`;
  };
  const heatTxt = (r) => { const d = r.d || {}; return `링 히터 합(최악 온도 ${r.H.worst.T.toFixed(0)} °C) ${f2(r.H.tot, 0)} mW — ${(d.rad | 0) ? '계단 반경' : '같은 반경'}·${(d.asg | 0) ? '순환 배정' : '고정 배정'}.`
    + ((d.rad | 0) && (d.asg | 0) ? ` 순환 배정은 온도·공정의 공통 이동을 채널 간격 단위로 흡수합니다. 깨끗하게 흡수되려면 8·Δλ가 FSR의 정수배여야 합니다(지금 8Δλ/FSR = ${f2(r.span / r.fsr, 2)} — 끝 링이 감아 돌 때 ${f2(Math.abs(r.span - Math.round(r.span / r.fsr) * r.fsr) * 1000, 2)} nm를 더 밀어야 함).`
      : !(d.rad | 0) ? ' 같은 반경이면 링 k는 λ₀에서 λ_k까지 k·Δλ를 히터로 옮겨야 하고(최대 7Δλ), 배정을 돌려도 필요한 이동의 집합은 같습니다.'
        : ' 고정 배정이면 링마다 온도 이동(≈ dλ/dT × 70 K)과 다이 공정 이동 전체를 히터가 맡습니다(최대 한 FSR).'); };
  const K = {
    title: '1.6T WDM8 링 송신', aspect: 0.6, noSize: true, sizeLabel: '—', sizeUnit: '', primaryLabel: '최악 채널 마진 dB', cheap: false,
    params: () => PR(), landKeys: () => ['R'], violation: () => 0,
    toggles: () => [{ k: 'useCard', label: '내 부품 카드로 조립 (링 = 2-3R 카드, 없는 카드는 기준 설계)', needs: '2-3R' }],
    evaluate(l, d, proc) { const a = analyse(l, d, proc); return { d: { ...d }, ...a, primary: a.margin, secondary: a.pw }; },
    perf(l, r) { return 250 * clamp((r.margin + 2) / 6, 0, 1) + 250 * clamp((l.s1.pw * 1.3 - r.pw) / (l.s1.pw * 0.6), 0, 1); },
    comp(l, r) { return 300 * clamp(l.s2.pw / r.pw, 0, 1); },
    q1: r1, q2: r2,
    objectives(l, r) {
      return {
        t1: [{ k: `최악 채널 마진 ≥ ${f2(l.s1.margin, 1)} dB (8파장)`, v: `${f2(r.margin, 2)} dB`, ok: r.margin >= l.s1.margin }, { k: `광엔진 전력 ≤ ${fmtT(l.s1.pw)} W`, v: f2(r.pw, 2) + ' W', ok: r.pw <= l.s1.pw },
          { k: '링 락 (0–70 °C, 히터 범위 안) · 열 안정', v: `${r.lockOK ? '락' : '범위 초과'} · g<sub>th</sub> ${f2(r.gth, 2)}`, ok: r.lockOK && r.stable }],
        t2: [{ k: `최악 채널 마진 ≥ ${f2(l.s2.margin, 1)} dB`, v: `${f2(r.margin, 2)} dB`, ok: r.margin >= l.s2.margin }, { k: `광엔진 전력 ≤ ${fmtT(l.s2.pw)} W (${f2(l.s2.pw / TBPS, 2)} pJ/bit)`, v: `${f2(r.pw, 2)} W`, ok: r.pw <= l.s2.pw },
          { k: `Tx 링 튜닝 전력 ≤ ${fmtT(l.s2.heat)} mW (8개 합, 0–70 °C 최악)`, v: `${f2(r.H.tot, 1)} mW`, ok: r.H.tot <= l.s2.heat }]
      };
    },
    fabPass: (l, r) => r.stable && r.lockOK && r.margin >= l.fab.margin && r.pw <= l.s1.pw,
    fabCrit: (l) => `모든 채널 마진 ≥ ${f2(l.fab.margin, 1)} dB · 전력 ≤ ${fmtT(l.s1.pw)} W · 링 락 (다이 공정 이동 + 링 간 불일치 σ ${LOC_SIG} nm + 결합 ±0.4 dB · 변조 ±0.3 dB · 감도 ±0.3 dB · 선 세기 산포)`,
    meta(l, r) {
      const d = r.d || {};
      return `${r.p.src.length ? '내 카드: ' + r.p.src.join(', ') + ' · 나머지 기준 설계' : '기준 설계 부품으로 조립'} · 8파장 × 200G PAM4 (224 Gb/s 라인) · 한 광섬유 500 m · CPO · 케이스 ${TLO}–${THI} °C`
        + `<br>링: 2-3R ${r.p.src.includes('2-3R') ? '카드' : '기준 설계'}를 R = ${f2(d.R, 2)} µm에서 다시 계산 (레이아웃 ${f2(r.Rlay, 3)} µm) · FSR <b>${nmS(r.fsr)} nm</b> vs 8·Δλ = ${nmS(r.span)} nm · Q<sub>L</sub> ${Math.round(r.QL)} (FWHM ${nmS(r.fw)} nm) · 히터 ${f2(r.eff * 1e6, 0)} pm/mW`
        + `<br>격자 ${GRID[d.grid | 0]} GHz (Δλ ${nmS(r.dl)} nm) · 링 간격 ${Math.max(d.pitch, pmin(d.R))} µm → 이웃 열 결합 ${f2(r.kap1 * 100, 1)} % (2-1 단면 프로파일, 상한) · 광원 ${SRC[d.src | 0]}`;
    },
    tiles(l, r) { return [['최악 채널 마진', `${f2(r.margin, 2)}<small>dB</small> · λ${r.worst.j}`], ['FSR / 8Δλ', `${nmS(r.fsr)} / ${nmS(r.span)}<small>nm</small>`], ['링 히터 합', `${f2(r.H.tot, 0)}<small>mW</small>${r.H.hops ? ` · 홉 ${r.H.hops}` : ''}`], ['광엔진', `${f2(r.pw, 2)}<small>W</small> · ${f2(r.pj, 2)}<small>pJ/b</small>`]]; },
    hint(l, r) {
      const w = r.worst;
      return why(l, r) + `<br>${heatTxt(r)}`
        + `<br>최악 채널 λ${w.j}: 선 ${f2(w.Pline, 1)} dBm → 칩 ${f2(w.Pchip, 1)} dBm${r.tpa > 0.01 ? ` (TPA ${f2(r.tpa, 2)} dB)` : ''} → 링 입력 ${f2(w.Pin, 1)} dBm, 남의 링 통과 손실 ${f2(w.through, 2)} dB, 크로스토크 ${f2(w.xtdB, 1)} dB → 페널티 ${f2(w.xtp, 2)} dB`
        + `<br>전력: ${PCAT.map(([k, n]) => `${n} ${f2(r.PW[k], 2)}`).join(' · ')} W`;
    },
    draw(cv, l, r) {
      const ctx = cv.getContext('2d'), W = cv.width, H = cv.height, pad = 10 * DPR, d = r.d || {}, narrow = W / DPR < 520;
      ctx.fillStyle = '#0b1220'; ctx.fillRect(0, 0, W, H); ctx.font = `${10 * DPR}px "IBM Plex Mono", monospace`; ctx.textBaseline = 'middle';
      // spectrum: window covers the band ± 1.5 channels and at least ± FSR/2 around the centre, so FSR aliases are visible
      const dl = r.dl, half = Math.max(r.span / 2 + 1.5 * dl, r.fsr * 0.6), x0 = pad + 30 * DPR, x1 = W - pad, top = pad + 22 * DPR, bot = H * 0.58;
      const X = (u) => x0 + (u + half) / (2 * half) * (x1 - x0), Y = (db) => top + (-clamp(db, -24, 0)) / 24 * (bot - top);
      ctx.strokeStyle = 'rgba(158,171,189,.25)'; ctx.lineWidth = DPR; [0, -6, -12, -18, -24].forEach((v) => { ctx.beginPath(); ctx.moveTo(x0, Y(v)); ctx.lineTo(x1, Y(v)); ctx.stroke(); ctx.fillStyle = 'rgba(158,171,189,.8)'; ctx.textAlign = 'right'; ctx.fillText(`${v}`, x0 - 4 * DPR, Y(v)); });
      ctx.textAlign = 'left'; ctx.fillText('dB', pad, top - 10 * DPR);
      // bus transmission (level 0 and level 3) = product of the eight rings
      const cs = r.ch.map((c) => c.o.c), tr = (u, lv) => cs.reduce((s, c, k) => s * resp(c, u - (k - (N - 1) / 2) * dl)[lv], 1);
      [[0, 'rgba(100,201,223,.95)'], [3, 'rgba(242,176,74,.8)']].forEach(([lv, col]) => { ctx.strokeStyle = col; ctx.lineWidth = 1.4 * DPR; ctx.beginPath(); for (let i = 0; i <= 900; i++) { const u = -half + 2 * half * i / 900, y = Y(10 * Math.log10(Math.max(tr(u, lv), 1e-6))); i ? ctx.lineTo(X(u), y) : ctx.moveTo(X(u), y); } ctx.stroke(); });
      // laser lines (height ∝ line power), ring k resonance markers at its channel and its ±FSR aliases
      // laser lines: thin full-height markers in the channel colour; the label carries the line power relative to the strongest line
      const pmax = Math.max(...r.Pline);
      r.ch.forEach((c, j) => { const u = (j - (N - 1) / 2) * dl; ctx.globalAlpha = 0.45; ctx.strokeStyle = COLS[j]; ctx.lineWidth = 1.6 * DPR; ctx.beginPath(); ctx.moveTo(X(u), top); ctx.lineTo(X(u), bot); ctx.stroke(); ctx.globalAlpha = 1; ctx.fillStyle = COLS[j]; ctx.textAlign = 'center'; if (!narrow || j % 2 === 0) { ctx.fillText(`λ${j}`, X(u), bot + 9 * DPR); if (!narrow && c.Pline < pmax - 0.05) ctx.fillText(`${f2(c.Pline - pmax, 1)}`, X(u), bot + 20 * DPR); } });
      for (let k = 0; k < N; k++) for (const m of [-2, -1, 1, 2]) { const u = (k - (N - 1) / 2) * dl + m * r.fsr; if (Math.abs(u) > half) continue; ctx.strokeStyle = COLS[k]; ctx.setLineDash([3 * DPR, 3 * DPR]); ctx.lineWidth = 1.2 * DPR; ctx.beginPath(); ctx.moveTo(X(u), top); ctx.lineTo(X(u), bot); ctx.stroke(); ctx.setLineDash([]); }
      const okc = (v) => (v ? '#5dd193' : '#ff6b6b');
      cvPill(ctx, `FSR ${nmS(r.fsr)} nm ${r.fsr >= r.span - 1e-9 ? '≥' : '<'} 8Δλ ${nmS(r.span)} nm${r.aliased.length ? ' · 별칭!' : ''}`, pad, pad + 4 * DPR, 'left', okc(!r.aliased.length));
      cvPill(ctx, `최악 λ${r.worst.j} 마진 ${r.margin >= 0 ? '+' : ''}${f2(r.margin, 2)} dB`, W - pad, pad + 4 * DPR, 'right', okc(r.margin >= l.s1.margin));
      // bus with the eight rings: assignment at the worst temperature, heater bars
      const yb = H * 0.82, rr = Math.min(12 * DPR, (x1 - x0) / (N * 3)), w0 = r.H.worst, Pm = Math.max(1, ...r.H.rows.map((x) => x.max));
      ctx.strokeStyle = '#64c9df'; ctx.lineWidth = 2 * DPR; ctx.beginPath(); ctx.moveTo(x0 - 20 * DPR, yb + rr); ctx.lineTo(x1, yb + rr); ctx.stroke();
      ctx.fillStyle = 'rgba(158,171,189,.85)'; ctx.textAlign = 'left'; ctx.fillText('IN', pad, yb + rr); ctx.textAlign = 'right'; ctx.fillText('OUT', x1, yb + rr + 10 * DPR);
      for (let k = 0; k < N; k++) {
        const cx = x0 + (k + 0.5) * (x1 - x0) / N, a = (k + w0.s) % N;
        ctx.strokeStyle = COLS[a]; ctx.lineWidth = 2 * DPR; ctx.beginPath(); ctx.arc(cx, yb, rr * 0.85, 0, 2 * Math.PI); ctx.stroke();
        const hb = (H - yb - rr * 2.2) * 0.9 * w0.P[k] / Pm; ctx.fillStyle = 'rgba(242,176,74,.75)'; ctx.fillRect(cx - 3 * DPR, yb - rr - 4 * DPR - hb, 6 * DPR, hb);
        ctx.fillStyle = COLS[a]; ctx.textAlign = 'center'; ctx.fillText(`→λ${a}`, cx, yb + rr * 2.3);
      }
      if (!narrow) cvPill(ctx, `${w0.T.toFixed(0)} °C: 히터 합 ${f2(w0.tot, 0)} mW${(d.asg | 0) ? ` · 배럴 s = ${w0.s}` : ''} · 이웃 열 결합 ${f2(r.kap1 * 100, 1)} %`, x0, H - pad - 2 * DPR, 'left', 'rgba(231,236,243,.9)');
    },
    chartTitle: () => '온도에 따른 Tx 링 히터 합 — 반경 배치 × 공진 배정',
    chart(l, r) {
      const d = r.d || {}, cases = [[0, 1, '같은 반경 · 순환 (같은 반경이면 고정과 같음)', 'var(--fg-3)', '2 4'], [0, 0, '같은 반경 · 고정', 'var(--rose)', '7 3'], [1, 0, '계단 반경 · 고정', 'var(--amber)', '5 4'], [1, 1, '계단 반경 · 순환(배럴)', 'var(--cyan)', '5 4']];
      const ser = cases.map(([rad, asg, name, col, dash]) => { const cur = rad === (d.rad | 0) && asg === (d.asg | 0), rr = cur ? r : analyse(l, { ...d, rad, asg }); return { pts: rr.H.rows.map((x) => [x.T, x.tot]), color: col, width: cur ? 3 : 1.6, dash: cur ? '' : dash, name }; });
      const ys = ser.flatMap((s) => s.pts.map((p) => p[1])), y1 = Math.ceil(Math.max(10, ...ys) / 10) * 10;
      const html = svgChart({ x0: TLO, x1: THI, y0: 0, y1, aria: '히터 합 vs 온도', xticks: [0, 10, 20, 30, 40, 50, 60, 70], yticks: [0, Math.round(y1 / 2), y1], ylab: 'mW', xlab: 'T °C', series: ser });
      return { html, legend: legendHTML(ser.map((s) => [s.color, `${s.name}${s.width > 2 ? ' (지금)' : ''}`])) };
    },
    coach(l, r, c) {
      const t = c.tier, d = r.d, ks = keys(), q1 = (x) => r1(l, x), q2 = (x) => keepStar(r1(l, x), r2(l, x));
      const pairs = [['R', 'grid'], ['rad', 'asg'], ['R', 'P'], ['P', 'src'], ['pitch', 'R'], ['asg', 'P']];
      const pick = (q) => lineBestOf(K, l, d, ks, q, 18) || pairs.map((k2) => pairBest(K, l, d, k2, q, 8)).filter(Boolean).sort((a, b) => a.q - b.q)[0] || null;
      const txt = (b) => (!b ? '' : b.ps ? recText2(b, t) : recText(b, t, d));
      if (r.drc && r.drc.length) { const b = pick(q1); return { h: '링 셀이 겹칩니다', b: `${r.drc[0]}. 링 간격을 넓히거나 반경을 줄이세요.` + txt(b) }; }
      if (!c.ob1) {
        if (r.margin < l.s1.margin) { const b = pick(q1); if (b) return { h: r.aliased.length ? 'FSR 별칭: 링의 다음 공진이 다른 채널에 걸립니다' : '닫히지 않는 채널이 있습니다', b: why(l, r) + txt(b) }; }
        if (!r.lockOK || !r.stable) { const b = pick(q1); if (b) return { h: !r.stable ? '링 열 폭주' : '히터가 범위를 넘습니다', b: (!r.stable ? `자기 가열 루프 이득 g<sub>th</sub> ${f2(r.gth, 2)} ≥ 1.` : heatTxt(r)) + txt(b) }; }
        if (r.pw > l.s1.pw) { const b = pick(q1); if (b) { const [k, n] = PCAT.slice().sort((a, b2) => r.PW[b2[0]] - r.PW[a[0]])[0]; return { h: '광엔진 전력 예산 초과', b: `가장 큰 소비는 ${n} ${f2(r.PW[k], 2)} W입니다. ${k === 'heat' ? heatTxt(r) : ''}` + txt(b) }; } }
        return null;
      }
      if (!c.ob2) { const b = pick(q2); if (b) { const hh = r.H.tot > l.s2.heat; return { h: hh ? '★★: 링 튜닝 전력이 큽니다' : r.pw > l.s2.pw ? '★★: 전력을 더 줄여야 합니다' : '★★: 마진 여유가 부족합니다', b: (hh || r.pw > l.s2.pw ? heatTxt(r) : why(l, r)) + txt(b) }; } }
      if (c.ob2 && c.fab && c.fab.yield < l.fab.y) return { h: '양산 다이에서 탈락하는 모듈이 있습니다', b: `다이마다 링 공진이 공정으로 수 nm씩 함께 움직이고(공통), 링끼리도 σ ${LOC_SIG} nm 어긋납니다. 순환 배정은 공통 이동을 채널 간격 단위로 흡수하지만 링 간 불일치와 FSR − 8Δλ 차이는 히터가 맡습니다. 마진·전력 여유를 확보하세요.` };
      return null;
    },
    compareRows: (l, r) => [['최악 채널 마진', r.margin, 'dB', 2, 'hi', 'semi'], ['광엔진 전력', r.pw, 'W', 2, 'lo', 'semi'], ['비트당 에너지', r.pj, 'pJ/bit', 2, 'lo', 'semi'], ['링 히터 합', r.H.tot, 'mW', 0, 'lo', 'semi'], ['FSR', r.fsr * 1e3, 'nm', 2, null, 'an'], ['FSR 별칭 채널', r.aliased.length, '개', 0, 'lo', 'semi']],
    card(l, r) { const d = r.d || {}; return { kind: 'wdm', lines: [`마진 ${f2(r.margin, 2)} dB @ λ${r.worst.j} · ${GRID[d.grid | 0]} GHz`, `${f2(r.pw, 2)} W · ${f2(r.pj, 2)} pJ/bit · FSR ${nmS(r.fsr)} nm · 히터 ${f2(r.H.tot, 0)} mW`], model: { margin: +r.margin.toFixed(2), pw: +r.pw.toFixed(3), pj: +r.pj.toFixed(3), grid: GRID[d.grid | 0], R: d.R, fsr: +(r.fsr * 1000).toFixed(3), heat: +r.H.tot.toFixed(1), Rk: r.Rk.map((x) => x.R), pitch: Math.max(d.pitch, pmin(d.R)) } }; },
    aiStarts: (l) => [l.start, { ...l.start, grid: 0 }, { ...l.start, grid: 0, rad: 1, asg: 1 }],
    _x: { analyse, parts, channels, heaters, lockSolve, radii, resp, kappa, dlam, pmin, GRID, SRC, ASG, RAD, TILT, LOC_SIG, HMAX, RXD, MUX_IL, COMB_WPE, N }
  };

  /* ---------- WDM8 vs DR8 (3A+ MRR ×8, CPO) on the same parts ---------- */
  function panel(l, r) {
    const l3 = gl('3A+'); if (!l3) return null;
    const d = r.d || {}, x = XC(), dr = x.analyse(l3, { ...l3.ref, mod: 1, pkg: 2, useCard: d.useCard });
    const B = { an: 'Analytical', semi: 'Physics-informed Surrogate', asm: 'Unverified Assumption' };
    const rows = [
      ['광섬유 (Tx)', '8', '1', 'an', 'WDM8은 8파장을 한 광섬유에 — 커넥터·FAU 수가 줄어듭니다'],
      ['레이저', `${dr.nLas}개 (DFB, 1:${dr.share})`, (d.src | 0) ? 'DFB 8개 + MUX (ELS)' : '콤 1개 (ELS)', 'asm', ''],
      ['링이 하는 일', '레인마다 자기 광섬유 — 같은 파장, 서로 독립', '한 버스 공유 — 공진 배정, 이웃 크로스토크, FSR 별칭, 열 결합', 'an', ''],
      ['최악 마진', `${f2(dr.margin, 2)} dB`, `${f2(r.margin, 2)} dB`, 'semi', 'DR8: 레인·온도 코너 · WDM8: 채널'],
      ['링 히터', `${f2(dr.PW.heat, 3)} W (8 링)`, `${f2(r.PW.heat, 3)} W (Tx 8 + Rx Demux 같은 양 가정)`, 'semi', ''],
      ['광원 전력', `${f2(dr.PW.laser + dr.PW.tec, 2)} W`, `${f2(r.PW.laser, 2)} W`, 'asm', ''],
      ['엔진 전력 · pJ/bit', `${f2(dr.pw, 2)} W · ${f2(dr.pj, 2)}`, `${f2(r.pw, 2)} W · ${f2(r.pj, 2)}`, 'semi', 'DC-DC 포함, 같은 CPO 상수'],
      ['Rx', 'PD ×8 (광섬유마다)', `Demux (IL ${RXD.il} dB, XT ${RXD.xt[d.grid | 0]} dB 가정) → PD ×8`, 'asm', '']
    ];
    const tb = rows.map(([k, a, b, f, n]) => `<tr><th scope="row">${k}${n ? `<br><span class="note">${n}</span>` : ''}</th><td>${a}</td><td>${b}</td><td>${confBadge(f, true)}</td></tr>`).join('');
    return { title: `같은 부품으로: MRR DR8 (3A+ · CPO) vs MRR WDM8 (이 설계)`, html: `<p class="note" style="margin:0 0 8px">3A+는 기준 설계를 링 ×8 · CPO로 바꿔 같은 엔진으로 계산합니다. 점수에는 들어가지 않습니다.</p><div class="gtbl"><table class="cmp"><tr><th>항목</th><th>MRR DR8</th><th>MRR WDM8</th><th>근거</th></tr>${tb}</table></div><p class="note">WDM8은 광섬유·커넥터를 1/8로 줄이는 대신, 링이 한 버스를 나눠 쓰면서 생기는 문제(공진 배정, 이웃 링 크로스토크, FSR 별칭, 히터 열 결합, 다파장 광원의 선 세기 차이)를 설계로 풀어야 합니다.</p>` + confidence(l, r) };
  }
  /* ---------- what this WDM8 result does and does not rest on (v1.0 §4.2) ---------- */
  const CAUTION_DB = 1.0;   // educational heuristic for "thin margin" — not a foundry or standard requirement
  const RBC = new Map();
  function robust(l, d) {
    const key = l.pf.id + JSON.stringify(d); if (RBC.has(key)) return RBC.get(key);
    const base = analyse(l, d), gi = d.grid | 0;
    const cases = [
      ['Rx Demux 크로스토크 5 dB 나쁨', { rxXT: RXD.xt[gi] + 5 }, `가정 ${RXD.xt[gi]} → ${RXD.xt[gi] + 5} dB`],
      ...((d.src | 0) ? [] : [['콤 선 세기 기울기 +1 dB', { tilt: TILT + 1 }, `가정 ${TILT} → ${TILT + 1} dB`]]),
      ['링 간 열 결합 ×2 (3D 확산 불확도)', { kScale: 2 }, '2-1 단면 프로파일 × 2']
    ].map(([name, ov, how]) => { const r = analyse(l, d, null, ov); return { name, how, dm: r.margin - base.margin, dh: r.H.tot - base.H.tot, lockOK: r.lockOK }; });
    const out = { base, cases }; if (RBC.size > 30) RBC.clear(); RBC.set(key, out); return out;
  }
  function confidence(l, r) {
    const d = r.d || {}, R = robust(l, d), w = r.worst, head = (h) => `<tr><th colspan="3" class="grp">${h}</th></tr>`;
    const row = (k, v, c, n) => `<tr><th scope="row">${k}${n ? `<br><span class="note">${n}</span>` : ''}</th><td>${v}</td><td>${confBadge(c, true)}</td></tr>`;
    const thin = r.margin < CAUTION_DB;
    return `<div class="tsens"><h4>WDM8 결과의 근거 — 광학 모델 · 제어 구조 · 시스템 견고성</h4>`
      + (r.margin < 0 ? `<p class="note" style="color:var(--fail)">✕ 최악 채널 마진 ${f2(r.margin, 2)} dB — 지금 설계는 링크가 닫히지 않습니다. 아래 광학 항목에서 원인을 찾으세요.</p>` : thin ? `<p class="note" style="color:var(--amber)">△ 주의: 최악 채널 마진 ${f2(r.margin, 2)} dB &lt; ${CAUTION_DB} dB — 아래 가정 하나만 나빠져도 링크가 닫힐 수 있습니다 (임계값 ${CAUTION_DB} dB는 교육용 휴리스틱이며 파운드리·표준 요구값이 아닙니다).</p>` : '')
      + `<div class="gtbl"><table class="cmp"><tr><th>항목</th><th>값</th><th>근거</th></tr>`
      + head('Optical Model — 계산된 광학')
      + row('최악 채널 마진', `${f2(r.margin, 2)} dB (λ${w.j})`, 'semi', '버스 위 링 8개의 all-pass 응답 곱 + PAM4 눈')
      + row('FSR 별칭', r.aliased.length ? `<b class="st-FAIL">${r.aliased.length}채널</b>` : '없음', 'semi', `FSR ${nmS(r.fsr)} nm vs 8·Δλ ${nmS(r.span)} nm`)
      + row('이웃 링 크로스토크 (최악 채널)', `${f2(w.xtdB, 1)} dB → 페널티 ${f2(w.xtp, 2)} dB`, 'semi', '')
      + head('Control Architecture — 링 락')
      + row('락 방식', '정적 락 가정: 온도마다 최적 배정을 즉시 선택', 'asm', (d.asg | 0) ? '순환(배럴) 배정 — 재배정 순간의 링크 중단은 계산하지 않음' : '고정 배정')
      + row('히터 범위', `${r.lockOK ? '충분' : '<b class="st-FAIL">부족</b>'} (최악 ${f2(r.H.max, 1)} mW ≤ ${HMAX} × P<sub>2π</sub> ${f2(r.P2pi, 1)} mW)`, 'semi', '')
      + row('링별 모니터 PD', '기본 설계에 없음 (Lab WDM8: NOT VERIFIED)', 'nv', '락 신호를 어디서 얻는지는 검증하지 않음')
      + row('동적 락 획득 · 재락 중단 · 락 루프 상호작용', 'NOT VERIFIED', 'nv', '락 동역학 시뮬레이터 없음 — 정적 결과만')
      + head('System Robustness — 가정이 바뀌면')
      + R.cases.map((c) => row(c.name, `마진 ${c.dm >= 0 ? '+' : ''}${f2(c.dm, 2)} dB${Math.abs(c.dh) > 0.05 ? ` · 히터 합 ${c.dh >= 0 ? '+' : ''}${f2(c.dh, 1)} mW` : ''}${c.lockOK ? '' : ' · <b class="st-FAIL">락 범위 초과</b>'}`, 'asm', c.how)).join('')
      + row('열 모델', '2-1 2D 단면 프로파일 (긴 히터) — 점 열원인 링에는 상한', 'asm', '3D 열해석 필요 (NOT VERIFIED)')
      + `</table></div>${confLegend(['semi', 'asm', 'nv'])}</div>`;
  }
  K.panel = (l, r) => panel(l, r);
  return K;
})();
