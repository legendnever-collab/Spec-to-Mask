// ===== Kind: 1.6T transceiver — Stage 3 capstone (Track A) =====
// l.arch = 'fr4': 2×800G FR4 (two CWDM4 groups, 2 km), pluggable with DSP
// l.arch = 'dr8': 8 parallel fibres at one wavelength (500 m), pluggable DSP / LPO / CPO
// Every optical block is a part card (or that level's reference design). The player decides the architecture:
// laser count & power, laser cooling, mux thermal tracking, DSP / packaging.
// Link: worst lane over CWDM channels × case-temperature corners (0 / 70 °C), demux IL/XT re-evaluated
// with the 1-7 lattice at the thermally shifted index. Power: lasers (WPE vs P and T), TEC, heaters,
// drivers, TIAs, DSP, control, DC-DC.
// DR8 only: modulator choice (Phase B) — 8 × TW-MZM (2-3) or 8 × all-pass microring (2-3R). Each ring is evaluated with the
// 2-3R engine at the module's modulator input power (self-heating, TPA, thermal loop gain), locked at its design detuning by
// its own heater; the heater covers ring drift minus laser drift (uncooled DFB co-drifts with the case, TEC holds it at 25 °C).
// 2×FR4 stays MZM: a ring transmitter there needs WDM ring multiplexing (resonance assignment, crosstalk) = a separate architecture.
KINDS.xcvr = (() => {
  const LANES = 8, TBPS = 1.6, POH = 60, TLO = 0, THI = 70, TD = 35, MZB = 15, DCDC = 0.9;
  const SH = { fr4: [1, 2], dr8: [1, 2, 4, 8] };
  const PKG = [
    { name: '플러거블 + DSP', short: 'DSP', dsp: 10.0, drv: 0.35, ctrl: 0.8, epen: 0, esens: 0, fau: 0 },
    { name: 'LPO (DSP 없음)', short: 'LPO', dsp: 0, drv: 0.35, ctrl: 0.6, epen: 1.5, esens: 0.5, fau: 0 },
    { name: 'CPO (스위치 옆 광엔진)', short: 'CPO', dsp: 0, drv: 0.15, ctrl: 0.3, epen: 0.5, esens: 0.3, fau: 1.0 }
  ];
  const TIA = 0.12, MLSE_W = 1.5, MLSE_DB = 1.0;
  // DR8 microring option. DFB emission drift (nm/K) and wavelength tolerance (nm, 1σ, per module), ring lock loop (monitor PD +
  // DAC, mW per lane): representative assumptions, labelled as such in the UI and docs.
  const DLAS = (pf) => (pf.lam > 1.4 ? 0.10 : 0.085), LAS_SIG = 0.5, RLOCK = 2, BIT = 224e9;
  const MODS = ['MZM ×8 (2-3 TW-MZM)', 'MRR ×8 (2-3R 링)'];
  const gaussLike = (proc, k) => gaussR(mulberry((proc.seed || 1) * 23 + k * 503));
  const cards = () => (typeof window !== 'undefined' ? window.GAME_CARDS : global.GAME_CARDS) || {};
  const gl = (id) => (typeof GAME_LEV !== 'undefined' ? GAME_LEV(id) : null);
  const fr4 = (l) => l.arch === 'fr4';
  const isMRR = (l, d) => !fr4(l) && (d.mod | 0) === 1;
  const PR = (l) => fr4(l) ? [
    { k: 'P', label: '레이저 출력 (각)', sym: 'P<sub>las</sub>', min: 10, max: 20, step: 0.5, dec: 1, unit: 'dBm' },
    { k: 'share', label: '레이저 공유 (두 FR4 그룹)', sym: 'N', min: 0, max: 1, step: 1, dec: 0, unit: '', labels: ['1:1 · 레이저 8개', '1:2 · 레이저 4개'] },
    { k: 'tc', label: '레이저 온도 관리', sym: 'TEC', min: 0, max: 1, step: 1, dec: 0, unit: '', labels: ['비냉각', 'TEC 25 °C'] },
    { k: 'mt', label: 'Mux/Demux 열 대응', sym: 'Mux', min: 0, max: 1, step: 1, dec: 0, unit: '', labels: ['고정 (35 °C 설계)', '히터 추적'] },
    { k: 'dsp', label: 'DSP 등화', sym: 'DSP', min: 0, max: 1, step: 1, dec: 0, unit: '', labels: ['FFE', 'FFE + MLSE'] }
  ] : [
    { k: 'mod', label: '변조기 (레인당)', sym: 'MOD', min: 0, max: 1, step: 1, dec: 0, unit: '', labels: MODS },
    { k: 'P', label: '레이저 출력 (각)', sym: 'P<sub>las</sub>', min: 10, max: 20, step: 0.5, dec: 1, unit: 'dBm' },
    { k: 'share', label: '레이저 하나가 맡는 레인', sym: 'N', min: 0, max: 3, step: 1, dec: 0, unit: '', labels: ['1:1 · 레이저 8개', '1:2 · 4개', '1:4 · 2개', '1:8 · 1개'] },
    { k: 'tc', label: '레이저 온도 관리', sym: 'TEC', min: 0, max: 1, step: 1, dec: 0, unit: '', labels: ['비냉각', 'TEC 25 °C'] },
    { k: 'pkg', label: '패키징 · 전기 인터페이스', sym: 'PKG', min: 0, max: 2, step: 1, dec: 0, unit: '', labels: PKG.map((p) => p.name) }
  ];
  // ----- parts: cards (when the toggle is on) or the reference design of each level -----
  function parts(l, d) {
    const c = cards(), ref = l.parts, use = !!d.useCard, src = [];
    const pick = (id, f, rv) => { if (use && c[id] && c[id].model) { src.push(id); return f(c[id]); } return rv; };
    const p = {
      ssc: pick('1-6', (x) => x.model.loss, ref.ssc), split: pick('1-3', (x) => Math.max(...x.model.el), ref.split),
      gain: pick('2-3', (x) => x.model.gain, ref.gain), pen: pick('2-3', (x) => x.model.pen, ref.pen), sens: pick('2-4', (x) => x.model.sens, ref.sens),
      ppi: pick('2-1', (x) => x.model.Ppi, ref.ppi), cplx: pick('2-5', (x) => 0.003 * x.d.th * x.d.th + (x.d.iso ? 1.0 : 0), ref.cplx), fb: pick('2-5', (x) => x.model.fb, ref.fb),
      mux: fr4(l) ? pick('1-7', (x) => x.d, l.muxRef) : null
    };
    if (isMRR(l, d)) { const lr = gl('2-3R'); p.ring = lr ? { l: lr, d: pick('2-3R', (x) => x.d, lr.ref) } : null; }
    p.src = [...new Set(src)]; p.rin = 2.5 / (1 + Math.exp(-(p.fb + 32) / 2));
    return p;
  }
  // demux response at a uniform index offset (temperature), cached per design
  const MUXC = new Map();
  function mux(l, md, dn) {
    const key = l.pf.id + '|' + JSON.stringify(md) + '|' + dn.toFixed(7);
    let r = MUXC.get(key);
    if (!r) { const l7 = gl('1-7') || { ...l, pf: l.pf }; KINDS.cwdm.params(l7); const a = KINDS.cwdm._x.analyse(l7, md, { dw: 0, dt: 0, dn }); r = { il: a.il, xt: a.xt }; if (MUXC.size > 400) MUXC.clear(); MUXC.set(key, r); }
    return r;
  }
  const dndT = (l) => KINDS.to._x.optics(l.pf).dndT;
  const muxDrift = (l, md) => { KINDS.cwdm.params(gl('1-7') || l); const ng = KINDS.cwdm._x.ngAt(md.wa, l.pf.t); return l.pf.lc * 1000 * dndT(l) / ng; };   // nm/K
  const wpe = (Pmw, T, tc) => 0.22 * Math.max(0.05, 1 - Pmw / 200) * (tc ? 1 : 1 - 0.005 * Math.max(0, T - 25));
  const derate = (T, tc) => (tc ? 0 : 0.02 * Math.max(0, T - 25));
  const xtPen = (xt) => -10 * Math.log10(Math.max(0.05, 1 - 3 * Math.pow(10, xt / 10)));
  // ----- DR8 microring lane: 2-3R engine at the module's modulator input power (cached) -----
  const RINGC = new Map();
  function ringAt(p, Pmod, gs) {
    const key = p.ring.l.pf.id + JSON.stringify(p.ring.d) + JSON.stringify(p.ring.l.ref || {}) + '|' + Pmod.toFixed(2) + (gs && gs !== 1 ? '|g' + gs.toFixed(4) : '');
    let r = RINGC.get(key);
    if (!r) { r = KINDS.mrr._x.analyse(p.ring.l, p.ring.d, null, gs && gs !== 1 ? { Pin: Pmod, gs } : { Pin: Pmod }); if (RINGC.size > 600) RINGC.clear(); RINGC.set(key, r); }
    return r;
  }
  // optics on a 0.5 dB input-power grid, linear in between (the eye simulation is the expensive part; gain, penalty and loop gain
  // vary smoothly with input power), so Fab Run dies with scattered laser power reuse the cached grid points
  const PG = 0.5;
  function ringOpt(p, Pmod, gs) {
    const a = Math.floor(Pmod / PG) * PG, f = (Pmod - a) / PG, r0 = ringAt(p, a, gs), r1 = ringAt(p, a + PG, gs), mix = (x, y) => x + (y - x) * f;
    return { gain: mix(r0.omaDbm - a, r1.omaDbm - a - PG), pen: mix(r0.pen, r1.pen), gth: mix(r0.gth, r1.gth), Ebit: r0.Ebit, P2pi: r0.P2pi, omaDyn: mix(r0.omaDynDbm - a, r1.omaDynDbm - a - PG), r: f < 0.5 ? r0 : r1 };
  }
  // ring resonance sensitivity to the die's width / Si-thickness offsets (linear; checked against the full core in test/t_dr8.js)
  const SENS = new Map();
  function ringSens(p) {
    const key = p.ring.l.pf.id + JSON.stringify(p.ring.d); let s = SENS.get(key); if (s) return s;
    const X = KINDS.mrr._x, l = p.ring.l, pf = l.pf, h = 0.002, n0 = X.core(l, p.ring.d, {}).lamNat;
    s = { w: (X.core(l, p.ring.d, { proc: { dw: h, dt: 0 } }).lamNat - n0) / h, t: (X.core(l, p.ring.d, { proc: { dw: 0, dt: h * (pf.dt || 0.006) / 0.006 } }).lamNat - n0) / h };
    if (SENS.size > 200) SENS.clear(); SENS.set(key, s); return s;
  }
  const procShift = (p, proc) => { if (!proc) return 0; const s = ringSens(p), pf = p.ring.l.pf; return s.w * (proc.dw || 0) + s.t * (proc.dt || 0) * 0.006 / (pf.dt || 0.006); };   // µm
  // ring heater power (mW) at case temperature T: red-only, one FSR reaches the next order; the laser moves by dλ_DFB/dT when uncooled
  function ringHeat(l, p, Pmod, proc, T, tc, dLas, gs) {
    const c = KINDS.mrr._x.core(p.ring.l, p.ring.d, gs && gs !== 1 ? { Pin: Pmod, gs } : { Pin: Pmod }), fsr = c.B.fsr, dl = (tc ? 0 : DLAS(l.pf) * 1e-3 * (T - 25)) + (dLas || 0) * 1e-3;
    const s = c.lamOp + dl - c.unheated(T) - procShift(p, proc);
    return (((s % fsr) + fsr) % fsr) / fsr * c.H.P2pi;
  }
  const TGRID = Array.from({ length: 15 }, (_, i) => TLO + (THI - TLO) * i / 14);
  // driver: same driver class as the MZM (pk.drv) minus the load-energy difference vs the 2-3 reference TW-MZM (terminated line V²/R_T
  // vs ring C·V²); the driver IC's own overhead dominates either way
  function mzmLoadE() { const l23 = gl('2-3'); if (!l23) return 0; const m = KINDS.mzm.evaluate(l23, l23.ref); return 2 * (m.v0 * m.v0 / 4) * (5 / 9) / l23.ref.RT / BIT; }
  function analyse(l, d, proc, opt) {
    const gs = opt && opt.gs;   // thermal-model sensitivity (G′ scale) for the comparison panel only; scores never pass it
    const g = (k) => (proc ? gaussLike(proc, k) : 0), p = parts(l, d), F = fr4(l), si = l.pf.mat === 'si';
    const share = SH[l.arch][d.share | 0], nLas = LANES / share, tc = d.tc | 0, pk = F ? PKG[0] : PKG[d.pkg | 0], mlse = F && (d.dsp | 0) === 1;
    const chan = F ? 4.0 + (l.pf.lam > 1.4 ? 1.0 : 0.3) : 3.0 + (l.pf.lam > 1.4 ? 0.6 : 0.2);
    const chs = F ? 4 : 1, corners = [];
    // fabrication: per-die demux trimming with the 2-1 heater (fails if the heater budget cannot recover it)
    let trim = null, resid = [0, 0, 0, 0];
    if (F && proc && proc.seed != null) {
      const l21 = gl('2-1'); if (l21) {
        trim = KINDS.to._x.trimDie(l21, l21.ref, proc, { Ppi: p.ppi }, p.mux);
        if (trim) { const n0 = mux(l, p.mux, 0); resid = trim.after.a.il.map((v, c) => Math.max(0, v - n0.il[c])); }
      }
    }
    const drift = F ? muxDrift(l, p.mux) : 0;
    // modulator input power at case temperature T (laser derating, coupling, Si TPA, laser sharing)
    const pmodAt = (T) => {
      const Pl = d.P - derate(T, tc) - (proc ? 0.2 + 0.3 * Math.abs(g(1)) : 0);
      const cpl = p.ssc + p.cplx + (proc ? 0.4 * g(2) : 0), Pchip = Pl - cpl, tpa = si ? 0.6 * Math.pow(Math.pow(10, Pchip / 10) / 100, 2) : 0;
      const split = 10 * Math.log10(share) + p.split * Math.log2(share);
      return { Pmod: Pchip - tpa - split, tpa, split };
    };
    for (const T of [TLO, THI]) {
      const dn = F && !d.mt ? dndT(l) * (T - TD) : 0, m = F ? mux(l, p.mux, dn) : null;
      const { Pmod, tpa, split } = pmodAt(T);
      // ring optics at the nominal process: the lock holds the design detuning on every die, like the MZM part the module only adds the
      // ±0.3 dB modulation spread below; the die's process shift reaches the module through the ring heater (ringHeat)
      const ring = p.ring ? ringOpt(p, Pmod, gs) : null, gain = ring ? ring.gain : p.gain, mpen = ring ? ring.pen : p.pen;
      const oma = Pmod + gain + (proc ? 0.3 * g(4) : 0);
      for (let c = 0; c < chs; c++) {
        const il = F ? m.il[c] + resid[c] : 0, xt = F ? m.xt[c] : -60;
        const rx = oma - il - p.ssc - chan - p.ssc - il - pk.fau;
        const pen = mpen + xtPen(xt) + p.rin + pk.epen - (mlse ? MLSE_DB : 0), sens = p.sens + pk.esens + (proc ? 0.3 * g(3) : 0);
        corners.push({ T, c, il, xt, rx, pen, sens, margin: rx - pen - sens, Pmod, oma, gain, mpen, derate: derate(T, tc), split, tpa, gth: ring ? ring.gth : 0, ring });
      }
    }
    const worst = corners.reduce((a, b) => (b.margin < a.margin ? b : a));
    // power
    const Pmw = Math.pow(10, d.P / 10), Tl = tc ? 25 : THI, PelL = Pmw / wpe(Pmw, Tl, tc) + POH, laser = nLas * PelL / 1000;
    const tec = tc ? 0.3 + (laser - nLas * Pmw / 1000) / 0.6 : 0;
    const sm = F ? (KINDS.cwdm._x.LAT[p.mux.ord | 0] || KINDS.cwdm._x.LAT[1]).mult.reduce((a, b) => a + b, 0) : 0;
    const trimW = F ? 4 * (trim ? trim.power : p.ppi * l.parts.trimPi) / 1000 : 0;
    const trackW = F && d.mt ? 4 * sm * (drift * (THI - TLO)) / 10 * p.ppi / 1000 : 0;
    let biasW = LANES * 0.5 * MZB / 1000, drvLane = pk.drv, ringH = null, ctrl = pk.ctrl;
    if (p.ring) {
      // every ring is locked at its design detuning; heater = worst case temperature of the 0–70 °C range, nominal process
      // (Fab Run: the die's ring process shift and the laser wavelength tolerance)
      const dLas = proc ? LAS_SIG * g(5) : 0, ref = corners.find((c) => c.T === THI).ring;
      const hs = TGRID.map((T) => ringHeat(l, p, pmodAt(T).Pmod, proc, T, tc, dLas, gs)), Eload = mzmLoadE(), Er = ref.Ebit * 1e-15;
      const rr = ringOpt(p, pmodAt(THI).Pmod, gs).r;
      ringH = { max: Math.max(...hs), mean: hs.reduce((a, b) => a + b, 0) / hs.length, P2pi: ref.P2pi, Eload: Eload * 1e15, Er: Er * 1e15, dLas,
        eff: rr.fsr * 1e6 / rr.P2pi, selfK: rr.selfK, R: rr.Rlay, h: rr.c.hd.h, iso: rr.c.hd.iso | 0 };
      biasW = LANES * ringH.max / 1000; drvLane = pk.drv - (Eload - Er) * BIT; ctrl += LANES * RLOCK / 1000;
    }
    const drv = LANES * drvLane, tia = LANES * TIA, dsp = pk.dsp + (mlse ? MLSE_W : 0);
    const parts_W = { laser, tec, heat: trimW + trackW + biasW, drv, tia, dsp, ctrl };
    const raw = Object.values(parts_W).reduce((a, b) => a + b, 0), pw = raw / DCDC; parts_W.dcdc = pw - raw;
    const mrr = !!p.ring, gth = mrr ? Math.max(...corners.map((c) => c.gth)) : 0;
    return { p, share, nLas, pk, mlse, chan, corners, worst, margin: worst.margin, pw, pj: pw / TBPS, PW: parts_W, drift, trim, trimOK: !trim || trim.pass, size: 1,
      mrr, ringH, gth, stable: !mrr || gth < 1, modName: MODS[mrr ? 1 : 0] };
  }
  const unst = (r) => (r.stable ? 0 : 1 + r.gth);   // ring thermal runaway (red-side self-heating loop gain ≥ 1) never closes a link
  const r1 = (l, r) => Math.max(1 + (l.s1.margin - r.margin) / 3, r.pw / l.s1.pw, unst(r));
  const r2 = (l, r) => Math.max(1 + (l.s2.margin - r.margin) / 3, r.pw / l.s2.pw, unst(r));
  const keys = (l) => (fr4(l) ? ['P', 'share', 'tc', 'mt', 'dsp'] : ['P', 'share', 'tc', 'pkg', 'mod']);
  const PCAT = [['laser', '레이저', '#f6c35a'], ['tec', 'TEC', '#ff8d9c'], ['heat', '히터', '#f2b04a'], ['drv', '드라이버', '#64c9df'], ['tia', 'TIA', '#8fb3ff'], ['dsp', 'DSP', '#b48cff'], ['ctrl', '제어', '#9eabbd'], ['dcdc', 'DC-DC 손실', '#5b6b80']];
  const d0 = (r) => r.d || {};
  const cornerTxt = (l, w) => `${w.T} °C${fr4(l) ? ` · ${Math.round(l.pf.ch[w.c] * 1000)} nm` : ''}`;
  const K = {
    title: '1.6T transceiver', aspect: 0.56, noSize: true, sizeLabel: '—', sizeUnit: '', primaryLabel: '최악 레인 마진 dB', cheap: true,
    params: (l) => PR(l), landKeys: () => ['P'], violation: () => 0,
    toggles: () => [{ k: 'useCard', label: '내 부품 카드로 조립 (없는 카드는 기준 설계)', needs: '2-3' }],
    evaluate(l, d, proc) { const a = analyse(l, d, proc); return { d: { ...d }, ...a, drc: [], primary: a.margin, secondary: a.pw }; },
    perf(l, r) { return 250 * clamp((r.margin + 2) / 6, 0, 1) + 250 * clamp((l.s1.pw * 1.3 - r.pw) / (l.s1.pw * 0.6), 0, 1); },
    comp(l, r) { return 300 * clamp(l.s2.pw / r.pw, 0, 1); },
    q1: r1, q2: r2,
    objectives(l, r) {
      const w = r.worst;
      return {
        t1: [{ k: `최악 레인 마진 ≥ ${f2(l.s1.margin, 1)} dB (0·70 °C${fr4(l) ? ' × 4채널' : ''})`, v: `${f2(r.margin, 2)} dB`, ok: r.margin >= l.s1.margin }, { k: `모듈 전력 ≤ ${fmtT(l.s1.pw)} W`, v: f2(r.pw, 1) + ' W', ok: r.pw <= l.s1.pw }]
          .concat(r.mrr ? [{ k: '링 열 안정 (자기 가열 루프 이득 < 1, 모든 코너)', v: `g<sub>th</sub> ${f2(r.gth, 2)}`, ok: r.stable }] : []),
        t2: [{ k: `최악 레인 마진 ≥ ${f2(l.s2.margin, 1)} dB`, v: `${f2(r.margin, 2)} dB`, ok: r.margin >= l.s2.margin }, { k: `모듈 전력 ≤ ${fmtT(l.s2.pw)} W (${f2(l.s2.pw / TBPS, 1)} pJ/bit)`, v: `${f2(r.pw, 1)} W`, ok: r.pw <= l.s2.pw }]
      };
    },
    fabPass: (l, r) => r.trimOK && r.stable && r.margin >= l.fab.margin && r.pw <= l.s1.pw,
    fabCrit: (l) => `모든 레인·온도 코너에서 마진 ≥ ${f2(l.fab.margin, 1)} dB · 전력 ≤ ${fmtT(l.s1.pw)} W${fr4(l) ? ' · Demux 다이별 히터 트리밍 성공' : ' · (MRR) 링 열 안정, 다이 공정 이동과 레이저 파장 산포(σ ' + LAS_SIG + ' nm)를 히터로 흡수'} (레이저 노화, 결합 ±0.4 dB, 변조 ±0.3 dB, 감도 ±0.3 dB)`,
    meta(l, r) {
      const p = r.p;
      return `${p.src.length ? '내 카드: ' + p.src.join(', ') + ' · 나머지 기준 설계' : '기준 설계 부품으로 조립'} · 8×200G PAM4 · ${fr4(l) ? `CWDM4 × 2 그룹, 2 km (채널 ${f2(r.chan, 1)} dB)` : `병렬 8 광섬유, 500 m (채널 ${f2(r.chan, 1)} dB)`} · 케이스 ${TLO}–${THI} °C`
        + `<br>${fr4(l) ? `Demux 열 이동 ${f2(r.drift * 1000, 0)} pm/K (${l.pf.mat === 'si' ? 'Si' : 'SiN'}) · ` : ''}DFB WPE 22%·(1 − P/200 mW)·(비냉각 −0.5%/K) + 구동 ${POH} mW · DC-DC ${DCDC * 100}%`
        + (r.mrr ? `<br>변조기: <b>링 ×8</b> (${r.p.src.includes('2-3R') ? '내 2-3R 카드' : '2-3R 기준 설계'}, 레인마다 히터 락 · ${l.pf.mat === 'si' ? '' : '이종 Si · '}DFB 드리프트 ${DLAS(l.pf)} nm/K 가정${d0(r).tc ? ', TEC로 고정' : ''}) · 링 히터 최악 ${f2(r.ringH.max, 1)} mW/레인 · g<sub>th</sub> ${f2(r.gth, 2)}` : !fr4(l) ? '<br>변조기: TW-MZM ×8 (2-3)' : '');
    },
    tiles(l, r) { return [['최악 레인 마진', `${f2(r.margin, 2)}<small>dB</small>`], ['최악 코너', `<span style="font-size:.8em">${cornerTxt(l, r.worst)}</span>`], ['모듈 전력', `${f2(r.pw, 1)}<small>W</small> · ${f2(r.pj, 1)}<small>pJ/b</small>`], ['레이저', `${r.nLas}<small>개</small> · ${f2(r.PW.laser + r.PW.tec, 2)}<small>W</small>`]]; },
    hint(l, r) {
      const w = r.worst;
      return `최악 코너 ${cornerTxt(l, w)}: 변조기 입력 ${f2(w.Pmod, 1)} dBm → OMA ${f2(w.oma, 1)} dBm → 수신 ${f2(w.rx, 1)} dBm, 페널티 ${f2(w.pen, 1)} dB, 감도 ${f2(w.sens, 1)} dBm${fr4(l) ? `, Demux IL ${f2(w.il, 2)} dB` : ''}`
        + `<br>전력: ${PCAT.map(([k, n]) => `${n} ${f2(r.PW[k], 2)}`).join(' · ')} W`
        + (r.mrr ? `<br>링: 변조기 입력 ${f2(r.worst.Pmod, 1)} dBm에서 이득(OMA/P<sub>in</sub>) ${f2(r.worst.gain, 2)} dB · 페널티 ${f2(r.worst.mpen, 2)} dB · 히터 최악 ${f2(r.ringH.max, 1)} / 평균 ${f2(r.ringH.mean, 1)} mW (P<sub>2π</sub> ${f2(r.ringH.P2pi, 1)} mW) · 구동 부하 ${f2(r.ringH.Er, 1)} fJ/bit (MZM 기준 ${f2(r.ringH.Eload, 1)})` : '')
        + (fr4(l) ? '<br>2×FR4의 두 그룹은 같은 4파장을 쓰므로 레이저 하나를 두 그룹이 나눠 쓸 수 있습니다(1:2). 그 이상은 파장이 달라 불가능합니다.' : '<br>DR8은 8레인이 같은 파장이라 레이저 하나를 여러 레인이 나눠 쓸 수 있습니다. CPO는 DSP를 없애는 대신 광섬유 접속 손실과 전기 페널티를 떠안습니다. 링 변조기는 레인마다 공진을 레이저에 맞춰 잡는 히터·락이 필요하지만, 레인끼리 파장을 나눌 필요는 없습니다(WDM 링 Tx와 다른 점).');
    },
    draw(cv, l, r, ui) {
      const ctx = cv.getContext('2d'), W = cv.width, H = cv.height, pad = 10 * DPR, narrow = W / DPR < 520, F = fr4(l), d = r.d;
      ctx.fillStyle = '#0b1220'; ctx.fillRect(0, 0, W, H);
      ctx.font = `${10 * DPR}px "IBM Plex Mono", monospace`; ctx.textBaseline = 'middle';
      const vw = narrow ? W : W * 0.64, y0 = pad + 26 * DPR, rowH = (H - y0 - pad) / 2;
      const box = (x, y, w, h, t, col, sub) => { ctx.fillStyle = 'rgba(231,236,243,0.05)'; ctx.strokeStyle = col; ctx.lineWidth = 1.4 * DPR; ctx.fillRect(x, y, w, h); ctx.strokeRect(x, y, w, h); ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.fillText(t, x + w / 2, y + h / 2 - (sub ? 6 * DPR : 0)); if (sub) { ctx.fillStyle = 'rgba(158,171,189,0.95)'; ctx.fillText(sub, x + w / 2, y + h / 2 + 7 * DPR); } };
      const arrow = (x1, y, x2) => { ctx.strokeStyle = 'rgba(158,171,189,0.6)'; ctx.lineWidth = 1.2 * DPR; ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke(); };
      const cols = 5, cw = (vw - 2 * pad) / cols, bw = cw * 0.78, bh = Math.min(rowH * 0.62, 44 * DPR), X = (i) => pad + i * cw + (cw - bw) / 2;
      // Tx row
      const yt = y0 + (rowH - bh) / 2, yr = y0 + rowH + (rowH - bh) / 2, ok = (v) => (v ? '#5dd193' : '#ff6b6b');
      ctx.fillStyle = 'rgba(158,171,189,0.9)'; ctx.textAlign = 'left'; ctx.fillText('Tx', pad, y0 - 8 * DPR); ctx.fillText('Rx', pad, y0 + rowH - 4 * DPR);
      const tx = [[`LD ×${r.nLas}`, `${f2(d.P, 1)} dBm${d.tc ? ' · TEC' : ''}`, '#f6c35a'], [`1:${r.share}`, `−${f2(r.worst.split, 1)} dB`, '#9eabbd'], [r.mrr ? 'MRR ×8' : 'MZM ×8', `${f2(r.worst.gain, 1)} dB${r.mrr ? ` · H ${f2(r.ringH.max, 0)} mW` : ''}`, '#64c9df'],
        F ? ['MUX ×2', d.mt ? '히터 추적' : '고정', '#f2b04a'] : ['FAU ×8', r.pk.short, '#f2b04a'], [F ? '2 광섬유' : '8 광섬유', `${f2(r.chan, 1)} dB`, '#9eabbd']];
      const rx = [[F ? '2 광섬유' : '8 광섬유', '', '#9eabbd'], F ? ['DEMUX ×2', `IL ${f2(r.worst.il, 2)} dB`, '#f2b04a'] : ['SSC ×8', `${f2(r.p.ssc, 2)} dB`, '#9eabbd'], ['Ge PD ×8', `${f2(r.p.sens, 1)} dBm`, '#8fb3ff'], ['TIA ×8', '', '#8fb3ff'], [F || r.pk.dsp ? (r.mlse ? 'DSP+MLSE' : 'DSP') : 'Host SerDes', r.pk.dsp ? `${f2(r.PW.dsp, 1)} W` : '선형', '#b48cff']];
      tx.forEach(([t, s, c], i) => { if (i) arrow(X(i - 1) + bw, yt + bh / 2, X(i)); box(X(i), yt, bw, bh, t, c, narrow ? '' : s); });
      rx.forEach(([t, s, c], i) => { if (i) arrow(X(i - 1) + bw, yr + bh / 2, X(i)); box(X(i), yr, bw, bh, t, c, narrow ? '' : s); });
      cvPill(ctx, `최악 ${cornerTxt(l, r.worst)} · 마진 ${r.margin >= 0 ? '+' : ''}${r.margin.toFixed(2)} dB`, pad, pad + 4 * DPR, 'left', ok(r.margin >= l.s1.margin));
      if (narrow) return;
      // power stack
      const px = W * 0.70, pw = W - px - pad, top = pad + 24 * DPR, bot = H - pad - 4 * DPR, scale = (bot - top) / Math.max(r.pw, l.s1.pw * 1.05);
      let y = bot; ctx.textAlign = 'left';
      PCAT.forEach(([k, n, c]) => { const h = r.PW[k] * scale; if (h <= 0) return; ctx.fillStyle = c; ctx.fillRect(px, y - h, pw * 0.34, h); if (h > 11 * DPR) { ctx.fillStyle = 'rgba(231,236,243,0.9)'; ctx.fillText(`${n} ${f2(r.PW[k], 1)}`, px + pw * 0.38, y - h / 2); } y -= h; });
      [[l.s1.pw, '★'], [l.s2.pw, '★★']].forEach(([v, t]) => { const yy = bot - v * scale; ctx.strokeStyle = 'rgba(231,236,243,0.6)'; ctx.setLineDash([4 * DPR, 3 * DPR]); ctx.beginPath(); ctx.moveTo(px - 4 * DPR, yy); ctx.lineTo(px + pw * 0.34 + 4 * DPR, yy); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = 'rgba(231,236,243,0.8)'; ctx.textAlign = 'right'; ctx.fillText(t, px - 6 * DPR, yy); ctx.textAlign = 'left'; });
      cvPill(ctx, `모듈 ${f2(r.pw, 1)} W · ${f2(r.pj, 1)} pJ/bit`, W - pad, pad + 4 * DPR, 'right', ok(r.pw <= l.s1.pw));
    },
    chartTitle: () => '레이저 출력에 따른 최악 레인 마진 (온도 코너별)과 모듈 전력',
    chart(l, r) {
      const d = r.d, lo = [], hi = [], pws = [];
      for (let P = 10; P <= 20.001; P += 0.5) { const a = analyse(l, { ...d, P }); const m = (T) => Math.min(...a.corners.filter((c) => c.T === T).map((c) => c.margin)); lo.push([P, m(TLO)]); hi.push([P, m(THI)]); pws.push(a.pw); }
      const all = lo.concat(hi).map((x) => x[1]), y0 = Math.floor(Math.min(...all, -2)), y1 = Math.ceil(Math.max(...all, 3)), pmax = Math.max(...pws), pmin = Math.min(...pws);
      const pwl = pws.map((v, i) => [10 + 0.5 * i, y0 + (v - pmin) / Math.max(pmax - pmin, 1e-6) * (y1 - y0)]);
      const html = svgChart({ x0: 10, x1: 20, y0, y1, aria: '마진 vs 레이저 출력', xticks: [10, 12, 14, 16, 18, 20], yticks: [y0, 0, y1], ylab: 'dB', xlab: 'P_las dBm',
        vlines: [{ x: d.P, color: 'rgba(231,236,243,.7)' }], hlines: [{ y: l.s2.margin, label: `★★ ${f2(l.s2.margin, 1)} dB` }],
        series: [{ pts: lo, color: 'var(--cyan)', width: 2.2 }, { pts: hi, color: 'var(--rose)', width: 2.2 }, { pts: pwl, color: 'var(--amber)', width: 1.4, dash: '5 4' }] });
      return { html, legend: legendHTML([['var(--cyan)', `${TLO} °C 코너`], ['var(--rose)', `${THI} °C 코너`], ['var(--amber)', `모듈 전력 ${f2(pmin, 1)}–${f2(pmax, 1)} W (정규화)`]]) };
    },
    coach(l, r, c) {
      const t = c.tier, d = r.d, q1 = (x) => r1(l, x), q2 = (x) => r2(l, x), w = r.worst, ks = keys(l);
      const pick = (q) => lineBestOf(K, l, d, ks, q, 20) || [['P', 'share'], ['P', 'tc'], ['P', fr4(l) ? 'dsp' : 'pkg'], fr4(l) ? ['P', 'mt'] : ['share', 'pkg']].map((k2) => pairBest(K, l, d, k2, q, 10)).filter(Boolean).sort((a, b) => a.q - b.q)[0] || null;
      const txt = (b) => (!b ? '' : b.ps ? recText2(b, t) : recText(b, t, d));
      const why = () => {
        const n0 = fr4(l) ? mux(l, r.p.mux, 0) : null, muxEx = fr4(l) && !d.mt ? 2 * (w.il - n0.il[w.c]) + xtPen(w.xt) - xtPen(n0.xt[w.c]) : 0;
        const terms = [[muxEx, `온도에 따라 Demux 통과대역이 밀려(${f2(r.drift * 1000, 0)} pm/K, ±${THI - TD} K → ±${f2(r.drift * (THI - TD), 1)} nm) ${cornerTxt(l, w)} 채널에 IL·크로스토크 손해 ${f2(muxEx, 1)} dB가 생깁니다.`],
          [w.derate, `뜨거운 코너(${THI} °C)에서 비냉각 레이저 출력이 ${f2(w.derate, 1)} dB 떨어지고 효율도 나빠집니다.`],
          [r.share > 1 ? w.split : 0, `레이저 하나를 ${r.share}레인이 나눠 써서 분기 손실이 ${f2(w.split, 1)} dB입니다.`],
          [r.pk.epen + r.pk.esens, `DSP가 없어서 전기 페널티 ${f2(r.pk.epen, 1)} dB와 감도 손해 ${f2(r.pk.esens, 1)} dB를 떠안았습니다.`]].sort((x, y) => y[0] - x[0]);
        return terms[0][0] > 0.3 ? terms[0][1] : `최악 코너 ${cornerTxt(l, w)}에서 수신 OMA ${f2(w.rx, 1)} dBm이 필요량에 못 미칩니다.`;
      };
      const big = () => { const [k, n] = PCAT.slice().sort((a, b) => r.PW[b[0]] - r.PW[a[0]])[0]; return `가장 큰 소비는 ${n} ${f2(r.PW[k], 1)} W입니다.`; };
      if (!c.ob1) {
        if (r.margin < l.s1.margin) { const b = pick(q1); if (b) return { h: '링크가 닫히지 않는 레인이 있습니다', b: why() + txt(b) }; }
        if (r.pw > l.s1.pw) { const b = pick(q1); if (b) return { h: '모듈 전력 예산 초과', b: big() + ' 레이저는 출력을 올릴수록 효율(WPE)이 떨어지고, TEC는 레이저 발열의 1.7배를 더 씁니다.' + txt(b) }; }
        return null;
      }
      if (!c.ob2) { const b = pick(q2); if (b) return { h: r.pw > l.s2.pw ? '★★: 전력을 더 줄여야 합니다' : '★★: 마진 여유가 부족합니다', b: (r.pw > l.s2.pw ? big() : why()) + txt(b) }; }
      if (c.ob2 && c.fab && c.fab.yield < l.fab.y) return { h: '양산·환경 코너에서 탈락하는 모듈이 있습니다', b: '레이저 노화와 결합 오차, 다이마다 다른 Demux 트리밍 결과가 겹치면 공칭 마진이 금방 사라집니다. 마진 여유를 1 dB 이상 확보하세요.' };
      return null;
    },
    compareRows: (l, r) => [['최악 레인 마진', r.margin, 'dB', 2, 'hi', 'semi'], ['모듈 전력', r.pw, 'W', 2, 'lo', 'semi'], ['비트당 에너지', r.pj, 'pJ/bit', 2, 'lo', 'semi'], ['히터 (8레인)', r.PW.heat, 'W', 3, 'lo', 'semi'], ['레이저 (전력)', r.PW.laser + r.PW.tec, 'W', 2, 'lo', 'asm'], ['레이저 수', r.nLas, '개', 0, null, 'an']].concat(r.mrr ? [['링 히터 (레인 최악)', r.ringH.max, 'mW', 1, 'lo', 'semi']] : []),
    card(l, r) { return { kind: 'xcvr', lines: [`마진 ${f2(r.margin, 2)} dB @ ${cornerTxt(l, r.worst)}`, `${f2(r.pw, 1)} W · ${f2(r.pj, 1)} pJ/bit · 레이저 ${r.nLas}개${fr4(l) ? '' : r.mrr ? ' · MRR' : ' · MZM'}`], model: { margin: +r.margin.toFixed(2), pw: +r.pw.toFixed(2), pj: +r.pj.toFixed(2), nLas: r.nLas, mod: fr4(l) ? 'mzm' : r.mrr ? 'mrr' : 'mzm' } }; },
    aiStarts: (l) => [l.start, fr4(l) ? { ...l.start, P: 16, share: 1, mt: 1 } : { ...l.start, P: 17, share: 2, pkg: 2 }].concat(fr4(l) ? [] : [{ ...l.start, P: 16, share: 1, pkg: 2, mod: 1 }]),
    _x: { thermalSens, analyse, parts, mux, muxDrift, PKG, SH, ringAt, ringOpt, ringHeat, ringSens, procShift, mzmLoadE, DLAS, LAS_SIG, RLOCK, MODS }
  };

  /* ---------- DR8: MZM ×8 vs MRR ×8 in the same architecture (laser count / power, TEC, packaging) ---------- */
  const XPC = new Map();
  function yields(l, d) {
    const key = l.pf.id + JSON.stringify(d) + JSON.stringify(l.fab) + JSON.stringify(Object.keys(cards()));
    if (XPC.has(key)) return XPC.get(key);
    const dies = makeWafer(11 * 97, 1), out = {};
    for (const mod of [0, 1]) { let n = 0, ok = 0, hs = []; for (const die of dies) { const r = analyse(l, { ...d, mod }, die); n++; if (K.fabPass(l, r)) ok++; if (r.ringH) hs.push(r.ringH.max); } out[mod] = { y: ok / n, hmax: hs.length ? Math.max(...hs) : 0, hmin: hs.length ? Math.min(...hs) : 0 }; }
    if (XPC.size > 20) XPC.clear(); XPC.set(key, out); return out;
  }
  /* ---------- MRR thermal-model sensitivity (v1.0 §4.1): the same engine with the ring's thermal conductance G′ re-scaled ----------
     nominal = the 2-1 cross-section G′ around the circumference (optimistic: no 3D spread or lead loss);
     conservative = G′ raised until the ring reaches 160 pm/mW (upper end reported for un-isolated rings; an engineering assumption);
     experimental reference = 73 pm/mW measured by Yuan et al. 2024 on a different ring (R 12 µm, no isolation).
     Heater power, self-heating, loop gain and module power are recomputed, not scaled after the fact. Never part of the score. */
  const TSC = new Map(), TS_REF = [['nom', null, 'Nominal model', 'semi'], ['cons', 160, 'Conservative (160 pm/mW)', 'asm'], ['exp', 73, 'Experimental ref. (73 pm/mW)', 'exp']];
  function thermalSens(l, d) {
    const key = l.pf.id + JSON.stringify(d) + JSON.stringify(Object.keys(cards())); if (TSC.has(key)) return TSC.get(key);
    const mz = analyse(l, { ...d, mod: 0 }), b0 = analyse(l, { ...d, mod: 1 }), eff0 = b0.ringH.eff;
    const rows = TS_REF.map(([id, eff, name, conf]) => {
      const gs = eff ? Math.max(1, eff0 / eff) : 1, b = gs === 1 ? b0 : analyse(l, { ...d, mod: 1 }, null, { gs });
      return { id, name, conf, gs, eff: b.ringH.eff, heat: b.ringH.max, heatW: b.PW.heat, selfK: b.ringH.selfK, gth: b.gth, stable: b.stable, pw: b.pw, pj: b.pj, margin: b.margin, dPw: b.pw - mz.pw };
    });
    const out = { rows, mzm: { pw: mz.pw, pj: mz.pj, heatW: mz.PW.heat } };
    if (TSC.size > 20) TSC.clear(); TSC.set(key, out); return out;
  }
  function thermalHTML(l, d) {
    const t = thermalSens(l, d), R = t.rows, mx = Math.max(t.mzm.pw, ...R.map((x) => x.pw)) * 1.08;
    const bar = (v, c) => `<span style="display:inline-block;height:8px;width:${Math.max(2, 100 * v / mx).toFixed(1)}px;background:${c};border-radius:2px;vertical-align:middle;margin-right:6px"></span>`;
    const tr = (k, f, conf) => `<tr><th scope="row">${k}</th>${R.map(f).map((v) => `<td>${v}</td>`).join('')}<td>${conf ? confBadge(conf, true) : ''}</td></tr>`;
    return `<div class="tsens"><h4>MRR 열 민감도 (Thermal Sensitivity) — 같은 엔진, 링 열 컨덕턴스 G′만 바꿔 다시 계산</h4>
      <div class="gtbl"><table class="cmp"><tr><th>항목</th>${R.map((x) => `<th>${x.name}<br>${confBadge(x.conf, true)}</th>`).join('')}<th>근거</th></tr>
      ${tr('히터 효율', (x) => `${f2(x.eff, 0)} pm/mW${x.gs > 1 ? ` <span class="note">(G′ ×${f2(x.gs, 2)})</span>` : ''}`)}
      ${tr('링 히터 (레인, 0–70 °C 최악)', (x) => `${f2(x.heat, 1)} mW`, 'semi')}
      ${tr('국부 온도 상승 (자기 가열)', (x) => `${f2(x.selfK, 1)} K`, 'semi')}
      ${tr('열 되먹임 안정 (루프 이득 g<sub>th</sub>)', (x) => `${f2(x.gth, 2)} ${x.stable ? '· 안정' : '· <b class="st-FAIL">열 폭주</b>'}`, 'semi')}
      ${tr('모듈 전력', (x) => `${bar(x.pw, '#64c9df')}${f2(x.pw, 2)} W`, 'semi')}
      ${tr('비트당 에너지', (x) => `${f2(x.pj, 2)} pJ/b`, 'semi')}
      ${tr('MZM ×8 대비 모듈 전력', (x) => `${x.dPw >= 0 ? '+' : ''}${f2(x.dPw, 2)} W`, 'semi')}
      </table></div>
      <p class="note">MZM ×8: ${bar(t.mzm.pw, '#f2b04a')}${f2(t.mzm.pw, 2)} W · ${f2(t.mzm.pj, 2)} pJ/b (열 효율과 무관 — 균형 MZI 바이어스). 마진은 세 경우 모두 같습니다(락이 디튜닝을 유지). <b>읽는 법:</b> G′가 커지면(효율↓) 히터 전력은 늘고 자기 가열·루프 이득은 줄어 열적으로는 더 안정해집니다 — MRR의 전력 이점은 링 열 격리가 실제로 얼마나 되는지에 달려 있습니다. Conservative는 문헌의 격리 없는 링 상한을 가정한 보수 추정, Experimental ref.는 다른 링(Yuan 2024, R 12 µm)의 측정 효율을 이 링에 적용한 참고값이며, 둘 다 이 링의 측정값이 아닙니다. 별·점수·보정에는 쓰지 않습니다.</p></div>`;
  }
  function panel(l, r, ctx) {
    if (fr4(l)) return null;
    const d = r.d || {}, a = analyse(l, { ...d, mod: 0 }), b = analyse(l, { ...d, mod: 1 }), wa = a.worst, wb = b.worst;
    const title = `같은 DR8 아키텍처에서 MZM ×8 vs MRR ×8 — 레이저 ${a.nLas}개 · ${d.P} dBm · ${d.tc ? 'TEC' : '비냉각'} · ${a.pk.short}`;
    const y = ctx.run ? yields(l, d) : XPC.get(l.pf.id + JSON.stringify(d) + JSON.stringify(l.fab) + JSON.stringify(Object.keys(cards()))) || null;
    const win = (x, z, hi, tol) => (Math.abs(x - z) <= tol ? -1 : hi ? (x > z ? 0 : 1) : (x < z ? 0 : 1));
    const B = { an: 'Analytical', semi: 'Physics-informed Surrogate', asm: 'Unverified Assumption' };
    const rows = [
      ['변조기 입력 P<sub>mod</sub> (최악 코너)', `${f2(wa.Pmod, 1)} dBm`, `${f2(wb.Pmod, 1)} dBm`, -1, 'an', '같은 레이저·분기·결합 — 두 변조기가 같은 빛을 받습니다'],
      ['변조기 이득 OMA<sub>outer</sub>/P<sub>mod</sub>', `${f2(wa.gain, 2)} dB`, `${f2(wb.gain, 2)} dB`, win(wa.gain, wb.gain, true, 0.1), 'semi', 'MZM: 2-3 카드값 · MRR: 2-3R 엔진을 이 입력 파워에서 다시 계산(자기 가열·TPA 포함)'],
      ['눈 페널티 (5-tap FFE)', `${f2(wa.mpen, 2)} dB`, `${f2(wb.mpen, 2)} dB`, win(wa.mpen, wb.mpen, false, 0.1), 'semi', ''],
      ['최악 레인 마진', `${f2(a.margin, 2)} dB`, `${f2(b.margin, 2)} dB`, win(a.margin, b.margin, true, 0.1), 'semi', `${cornerTxt(l, wa)} / ${cornerTxt(l, wb)}`],
      ['히터 (8레인)', `${f2(a.PW.heat, 3)} W`, `${f2(b.PW.heat, 3)} W`, win(a.PW.heat, b.PW.heat, false, 0.01), 'semi', `MZM: 바이어스 평균 ${MZB / 2} mW/레인 (균형 팔, 온도 무관) · MRR: 0–70 °C 최악 ${f2(b.ringH.max, 1)} mW/레인, 링 드리프트 − 레이저 드리프트${d.tc ? '(TEC: 레이저 고정)' : ` (비냉각 DFB ${DLAS(l.pf)} nm/K 가정)`}`],
      ['드라이버 (8레인)', `${f2(a.PW.drv, 3)} W`, `${f2(b.PW.drv, 3)} W`, win(a.PW.drv, b.PW.drv, false, 0.01), 'asm', `같은 드라이버 IC 등급 − 부하 에너지 차 (MZM 종단 ${f2(b.ringH.Eload, 1)} vs 링 C·V² ${f2(b.ringH.Er, 1)} fJ/bit) — IC 자체 소모가 지배`],
      ['제어 (락·바이어스)', `${f2(a.PW.ctrl, 3)} W`, `${f2(b.PW.ctrl, 3)} W`, win(a.PW.ctrl, b.PW.ctrl, false, 0.005), 'asm', `MRR: 링 락(모니터 PD + DAC) ${RLOCK} mW/레인 가정 추가`],
      ['모듈 전력', `${f2(a.pw, 2)} W · ${f2(a.pj, 2)} pJ/b`, `${f2(b.pw, 2)} W · ${f2(b.pj, 2)} pJ/b`, win(a.pw, b.pw, false, 0.05), 'semi', 'DC-DC 손실 포함'],
      ['열 안정 (자기 가열 루프 이득)', '해당 없음', `g<sub>th</sub> ${f2(b.gth, 2)}${b.stable ? '' : ' — 열 폭주'}`, b.stable ? -1 : 0, 'semi', '파랑 쪽 디튜닝은 음의 되먹임'],
      ['링 열 효율 (튜닝)', '—', `${f2(b.ringH.eff, 0)} pm/mW · 자기 가열 ${f2(b.ringH.selfK, 0)} K`, -1, 'asm', `R ${f2(b.ringH.R, 2)} µm · 히터 ${b.ringH.iso ? '트렌치 격리' : '격리 없음'}, h ${b.ringH.h} µm (2-1 단면 G′ × 둘레, 3D 퍼짐·리드 손실 없음 → 낙관적). 문헌: 격리 없는 R ≈ 12 µm 링 73–160 pm/mW ↔ 같은 조건의 모델 140–180 pm/mW`],
      ['레이저 파장 허용', '넓음 (균형 MZI)', `히터가 한 FSR 안에서 추적 (P<sub>2π</sub> ${f2(b.ringH.P2pi, 1)} mW)`, 0, 'semi', `Fab: 다이 공정 이동 + 레이저 파장 σ ${LAS_SIG} nm 가정`],
      [`★ (마진 ≥ ${f2(l.s1.margin, 1)} dB · ≤ ${fmtT(l.s1.pw)} W)`, r1(l, a) <= 1 ? '충족' : '미달', r1(l, b) <= 1 ? '충족' : '미달', -1, 'semi', ''],
      [`★★ (마진 ≥ ${f2(l.s2.margin, 1)} dB · ≤ ${fmtT(l.s2.pw)} W)`, r2(l, a) <= 1 ? '충족' : '미달', r2(l, b) <= 1 ? '충족' : '미달', r2(l, a) <= 1 && r2(l, b) > 1 ? 0 : r2(l, b) <= 1 && r2(l, a) > 1 ? 1 : -1, 'semi', ''],
      ['Fab 수율 (같은 웨이퍼 · 시드 1067 · 69 다이, Monte Carlo 추정)', y ? `${Math.round(y[0].y * 100)} %` : '—', y ? `${Math.round(y[1].y * 100)} %${y[1].hmax ? ` · 히터 ${f2(y[1].hmin, 1)}–${f2(y[1].hmax, 1)} mW` : ''}` : '—', y ? win(y[0].y, y[1].y, true, 0.03) : -1, 'semi', '이 레벨의 ★★★ 판정']
    ];
    const td = (v, w) => `<td class="${w ? 'win' : ''}">${v}</td>`;
    const tb = rows.map(([k, x, z, w, f, note]) => `<tr><th scope="row">${k}${note ? `<br><span class="note">${note}</span>` : ''}</th>${td(x, w === 0)}${td(z, w === 1)}<td>${confBadge(f, true)}</td></tr>`).join('');
    const nm = (w) => rows.filter((x) => x[3] === w).map((x) => x[0].replace(/<[^>]+>/g, '').replace(/ \(.*$/, ''));
    const tie = () => rows.filter((x) => x[3] === -1 && /dB|W/.test(x[1] + x[2]) && !/^변조기 입력|^★|^Fab|링 열 효율/.test(x[0])).map((x) => x[0].replace(/<[^>]+>/g, '').replace(/ \(.*$/, ''));
    return { title, html: `<p class="note" style="margin:0 0 8px">지금 고른 변조기: <b>${r.modName}</b>. 레이저·냉각·패키징은 그대로 두고 변조기만 바꿔 같은 엔진으로 계산합니다. 점수에는 들어가지 않습니다.</p>
      <div class="gtbl"><table class="cmp"><tr><th>항목</th><th>MZM ×8</th><th>MRR ×8</th><th>근거</th></tr>${tb}</table></div>
      <p class="note"><b>MZM이 유리:</b> ${nm(0).join(' · ') || '—'}<br><b>MRR이 유리:</b> ${nm(1).join(' · ') || '—'}${tie().length ? `<br><b>비슷 (모델 분해능 이내):</b> ${tie().join(' · ')}` : ''}<br>DR8에서는 레인마다 광섬유가 따로라 링끼리 파장을 나눌 필요가 없습니다 — 링의 숙제는 레인별 히터·락과 레이저 드리프트 추적뿐입니다. 파장 다중화(WDM8)는 공진 배정·크로스토크·FSR 별칭이 더해지는 다른 아키텍처입니다.</p>`
      + (y ? '' : '<div class="row-btns"><button class="btn" data-xp-run="1">Fab 수율까지 비교 (같은 웨이퍼 69 다이 × 두 변조기)</button></div>') + thermalHTML(l, d) + confLegend(['an', 'semi', 'exp', 'asm']) };
  }
  K.panel = (l, r, ctx) => panel(l, r, ctx);
  return K;
})();
