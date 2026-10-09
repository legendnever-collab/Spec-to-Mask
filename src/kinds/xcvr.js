// ===== Kind: 1.6T transceiver — Stage 3 capstone (Track A) =====
// l.arch = 'fr4': 2×800G FR4 (two CWDM4 groups, 2 km), pluggable with DSP
// l.arch = 'dr8': 8 parallel fibres at one wavelength (500 m), pluggable DSP / LPO / CPO
// Every optical block is a part card (or that level's reference design). The player decides the architecture:
// laser count & power, laser cooling, mux thermal tracking, DSP / packaging.
// Link: worst lane over CWDM channels × case-temperature corners (0 / 70 °C), demux IL/XT re-evaluated
// with the 1-7 lattice at the thermally shifted index. Power: lasers (WPE vs P and T), TEC, heaters,
// drivers, TIAs, DSP, control, DC-DC.
KINDS.xcvr = (() => {
  const LANES = 8, TBPS = 1.6, POH = 60, TLO = 0, THI = 70, TD = 35, MZB = 15, DCDC = 0.9;
  const SH = { fr4: [1, 2], dr8: [1, 2, 4, 8] };
  const PKG = [
    { name: '플러거블 + DSP', short: 'DSP', dsp: 10.0, drv: 0.35, ctrl: 0.8, epen: 0, esens: 0, fau: 0 },
    { name: 'LPO (DSP 없음)', short: 'LPO', dsp: 0, drv: 0.35, ctrl: 0.6, epen: 1.5, esens: 0.5, fau: 0 },
    { name: 'CPO (스위치 옆 광엔진)', short: 'CPO', dsp: 0, drv: 0.15, ctrl: 0.3, epen: 0.5, esens: 0.3, fau: 1.0 }
  ];
  const TIA = 0.12, MLSE_W = 1.5, MLSE_DB = 1.0;
  const gaussLike = (proc, k) => gaussR(mulberry((proc.seed || 1) * 23 + k * 503));
  const cards = () => (typeof window !== 'undefined' ? window.GAME_CARDS : global.GAME_CARDS) || {};
  const gl = (id) => (typeof GAME_LEV !== 'undefined' ? GAME_LEV(id) : null);
  const fr4 = (l) => l.arch === 'fr4';
  const PR = (l) => fr4(l) ? [
    { k: 'P', label: '레이저 출력 (각)', sym: 'P<sub>las</sub>', min: 10, max: 20, step: 0.5, dec: 1, unit: 'dBm' },
    { k: 'share', label: '레이저 공유 (두 FR4 그룹)', sym: 'N', min: 0, max: 1, step: 1, dec: 0, unit: '', labels: ['1:1 · 레이저 8개', '1:2 · 레이저 4개'] },
    { k: 'tc', label: '레이저 온도 관리', sym: 'TEC', min: 0, max: 1, step: 1, dec: 0, unit: '', labels: ['비냉각', 'TEC 25 °C'] },
    { k: 'mt', label: 'Mux/Demux 열 대응', sym: 'Mux', min: 0, max: 1, step: 1, dec: 0, unit: '', labels: ['고정 (35 °C 설계)', '히터 추적'] },
    { k: 'dsp', label: 'DSP 등화', sym: 'DSP', min: 0, max: 1, step: 1, dec: 0, unit: '', labels: ['FFE', 'FFE + MLSE'] }
  ] : [
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
  function analyse(l, d, proc) {
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
    for (const T of [TLO, THI]) {
      const dn = F && !d.mt ? dndT(l) * (T - TD) : 0, m = F ? mux(l, p.mux, dn) : null;
      const Pl = d.P - derate(T, tc) - (proc ? 0.2 + 0.3 * Math.abs(g(1)) : 0);
      const cpl = p.ssc + p.cplx + (proc ? 0.4 * g(2) : 0), Pchip = Pl - cpl, tpa = si ? 0.6 * Math.pow(Math.pow(10, Pchip / 10) / 100, 2) : 0;
      const split = 10 * Math.log10(share) + p.split * Math.log2(share), Pmod = Pchip - tpa - split, oma = Pmod + p.gain + (proc ? 0.3 * g(4) : 0);
      for (let c = 0; c < chs; c++) {
        const il = F ? m.il[c] + resid[c] : 0, xt = F ? m.xt[c] : -60;
        const rx = oma - il - p.ssc - chan - p.ssc - il - pk.fau;
        const pen = p.pen + xtPen(xt) + p.rin + pk.epen - (mlse ? MLSE_DB : 0), sens = p.sens + pk.esens + (proc ? 0.3 * g(3) : 0);
        corners.push({ T, c, il, xt, rx, pen, sens, margin: rx - pen - sens, Pmod, oma, derate: derate(T, tc), split, tpa });
      }
    }
    const worst = corners.reduce((a, b) => (b.margin < a.margin ? b : a));
    // power
    const Pmw = Math.pow(10, d.P / 10), Tl = tc ? 25 : THI, PelL = Pmw / wpe(Pmw, Tl, tc) + POH, laser = nLas * PelL / 1000;
    const tec = tc ? 0.3 + (laser - nLas * Pmw / 1000) / 0.6 : 0;
    const sm = F ? (KINDS.cwdm._x.LAT[p.mux.ord | 0] || KINDS.cwdm._x.LAT[1]).mult.reduce((a, b) => a + b, 0) : 0;
    const trimW = F ? 4 * (trim ? trim.power : p.ppi * l.parts.trimPi) / 1000 : 0;
    const trackW = F && d.mt ? 4 * sm * (drift * (THI - TLO)) / 10 * p.ppi / 1000 : 0;
    const biasW = LANES * 0.5 * MZB / 1000;
    const drv = LANES * pk.drv, tia = LANES * TIA, dsp = pk.dsp + (mlse ? MLSE_W : 0), ctrl = pk.ctrl;
    const parts_W = { laser, tec, heat: trimW + trackW + biasW, drv, tia, dsp, ctrl };
    const raw = Object.values(parts_W).reduce((a, b) => a + b, 0), pw = raw / DCDC; parts_W.dcdc = pw - raw;
    return { p, share, nLas, pk, mlse, chan, corners, worst, margin: worst.margin, pw, pj: pw / TBPS, PW: parts_W, drift, trim, trimOK: !trim || trim.pass, size: 1 };
  }
  const r1 = (l, r) => Math.max(1 + (l.s1.margin - r.margin) / 3, r.pw / l.s1.pw);
  const r2 = (l, r) => Math.max(1 + (l.s2.margin - r.margin) / 3, r.pw / l.s2.pw);
  const keys = (l) => (fr4(l) ? ['P', 'share', 'tc', 'mt', 'dsp'] : ['P', 'share', 'tc', 'pkg']);
  const PCAT = [['laser', '레이저', '#f6c35a'], ['tec', 'TEC', '#ff8d9c'], ['heat', '히터', '#f2b04a'], ['drv', '드라이버', '#64c9df'], ['tia', 'TIA', '#8fb3ff'], ['dsp', 'DSP', '#b48cff'], ['ctrl', '제어', '#9eabbd'], ['dcdc', 'DC-DC 손실', '#5b6b80']];
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
        t1: [{ k: `최악 레인 마진 ≥ ${f2(l.s1.margin, 1)} dB (0·70 °C${fr4(l) ? ' × 4채널' : ''})`, v: `${f2(r.margin, 2)} dB`, ok: r.margin >= l.s1.margin }, { k: `모듈 전력 ≤ ${fmtT(l.s1.pw)} W`, v: f2(r.pw, 1) + ' W', ok: r.pw <= l.s1.pw }],
        t2: [{ k: `최악 레인 마진 ≥ ${f2(l.s2.margin, 1)} dB`, v: `${f2(r.margin, 2)} dB`, ok: r.margin >= l.s2.margin }, { k: `모듈 전력 ≤ ${fmtT(l.s2.pw)} W (${f2(l.s2.pw / TBPS, 1)} pJ/bit)`, v: `${f2(r.pw, 1)} W`, ok: r.pw <= l.s2.pw }]
      };
    },
    fabPass: (l, r) => r.trimOK && r.margin >= l.fab.margin && r.pw <= l.s1.pw,
    fabCrit: (l) => `모든 레인·온도 코너에서 마진 ≥ ${f2(l.fab.margin, 1)} dB · 전력 ≤ ${fmtT(l.s1.pw)} W${fr4(l) ? ' · Demux 다이별 히터 트리밍 성공' : ''} (레이저 노화, 결합 ±0.4 dB, 변조 ±0.3 dB, 감도 ±0.3 dB)`,
    meta(l, r) {
      const p = r.p;
      return `${p.src.length ? '내 카드: ' + p.src.join(', ') + ' · 나머지 기준 설계' : '기준 설계 부품으로 조립'} · 8×200G PAM4 · ${fr4(l) ? `CWDM4 × 2 그룹, 2 km (채널 ${f2(r.chan, 1)} dB)` : `병렬 8 광섬유, 500 m (채널 ${f2(r.chan, 1)} dB)`} · 케이스 ${TLO}–${THI} °C`
        + `<br>${fr4(l) ? `Demux 열 이동 ${f2(r.drift * 1000, 0)} pm/K (${l.pf.mat === 'si' ? 'Si' : 'SiN'}) · ` : ''}DFB WPE 22%·(1 − P/200 mW)·(비냉각 −0.5%/K) + 구동 ${POH} mW · DC-DC ${DCDC * 100}%`;
    },
    tiles(l, r) { return [['최악 레인 마진', `${f2(r.margin, 2)}<small>dB</small>`], ['최악 코너', `<span style="font-size:.8em">${cornerTxt(l, r.worst)}</span>`], ['모듈 전력', `${f2(r.pw, 1)}<small>W</small> · ${f2(r.pj, 1)}<small>pJ/b</small>`], ['레이저', `${r.nLas}<small>개</small> · ${f2(r.PW.laser + r.PW.tec, 2)}<small>W</small>`]]; },
    hint(l, r) {
      const w = r.worst;
      return `최악 코너 ${cornerTxt(l, w)}: 변조기 입력 ${f2(w.Pmod, 1)} dBm → OMA ${f2(w.oma, 1)} dBm → 수신 ${f2(w.rx, 1)} dBm, 페널티 ${f2(w.pen, 1)} dB, 감도 ${f2(w.sens, 1)} dBm${fr4(l) ? `, Demux IL ${f2(w.il, 2)} dB` : ''}`
        + `<br>전력: ${PCAT.map(([k, n]) => `${n} ${f2(r.PW[k], 2)}`).join(' · ')} W`
        + (fr4(l) ? '<br>2×FR4의 두 그룹은 같은 4파장을 쓰므로 레이저 하나를 두 그룹이 나눠 쓸 수 있습니다(1:2). 그 이상은 파장이 달라 불가능합니다.' : '<br>DR8은 8레인이 같은 파장이라 레이저 하나를 여러 레인이 나눠 쓸 수 있습니다. CPO는 DSP를 없애는 대신 광섬유 접속 손실과 전기 페널티를 떠안습니다.');
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
      const tx = [[`LD ×${r.nLas}`, `${f2(d.P, 1)} dBm${d.tc ? ' · TEC' : ''}`, '#f6c35a'], [`1:${r.share}`, `−${f2(r.worst.split, 1)} dB`, '#9eabbd'], ['MZM ×8', `${f2(r.p.gain, 1)} dB`, '#64c9df'],
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
    card(l, r) { return { kind: 'xcvr', lines: [`마진 ${f2(r.margin, 2)} dB @ ${cornerTxt(l, r.worst)}`, `${f2(r.pw, 1)} W · ${f2(r.pj, 1)} pJ/bit · 레이저 ${r.nLas}개`], model: { margin: +r.margin.toFixed(2), pw: +r.pw.toFixed(2), pj: +r.pj.toFixed(2), nLas: r.nLas } }; },
    aiStarts: (l) => [l.start, fr4(l) ? { ...l.start, P: 16, share: 1, mt: 1 } : { ...l.start, P: 17, share: 2, pkg: 2 }],
    _x: { analyse, parts, mux, muxDrift, PKG, SH }
  };
  return K;
})();
