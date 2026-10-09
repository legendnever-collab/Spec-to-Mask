// ===== Kind: switch-based FMCW LiDAR system (Track B-3 capstone) =====
// Monostatic coherent link per channel: P_rx = P_out · ρ · D²/(4R²) · η_het (Lambertian, aperture D = 2w_b), back through the
// same switch tree. Balanced heterodyne SNR over the usable ramp T − 2R/c:
//   SNR = (ℜ P_rx T_int / q) · 2qℜP_LO / (2qℜP_LO + i_n²)  × coherence × chirp-nonlinearity factors (from the B-1 card).
// Detection threshold SNR ≥ 15 dB. Max range by bisection, capped by the ADC range of the chirp.
// Parallel channels split the source; points/s = N_ch / (2T + switch settle).
KINDS.lidar = (() => {
  const C = 2.998e8, Q = 1.602e-19, ETA_HET = 0.4, RHO = 0.1, TH = 13, IN = 10e-12, NCH = [1, 2, 4, 8];
  const cards = () => (typeof window !== 'undefined' ? window.GAME_CARDS : global.GAME_CARDS) || {};
  const PR = () => [
    { k: 'P', label: '광원 출력 (부스터 포함)', sym: 'P<sub>s</sub>', min: 10, max: 30, step: 0.5, dec: 1, unit: 'dBm' },
    { k: 'nch', label: '병렬 채널 수', sym: 'N<sub>ch</sub>', min: 0, max: 3, step: 1, dec: 0, unit: '', labels: NCH.map((n) => n + '채널') },
    { k: 'lo', label: '국부 발진(LO) 분기 비율', sym: 'LO', min: 1, max: 50, step: 1, dec: 0, unit: '%' },
    { k: 'nav', label: '점당 처프 수 (비코히어런트 적산)', sym: 'N<sub>av</sub>', min: 1, max: 16, step: 1, dec: 0, unit: '회' }
  ];
  function parts(l, d) {
    const c = cards(), use = !!d.useCard, src = [], pk = (id, f, rv) => { if (use && c[id] && c[id].model) { src.push(id); return f(c[id].model); } return rv; };
    const ch = pk('B-1', (m) => m, l.parts.chirp), sc = pk('B-2', (m) => m, l.parts.scan), resp = pk('2-4', (m) => m.resp, l.parts.resp), split = pk('1-3', (m) => Math.max(...m.el), l.parts.split);
    return { ch, sc, resp, split, src: [...new Set(src)] };
  }
  function link(l, d, p, R, g) {
    const N = NCH[d.nch | 0], Ps = Math.pow(10, (d.P + (g ? g(1) * 0.3 - 0.2 : 0)) / 10) * 1e-3, lo = d.lo / 100;
    const splitDB = 10 * Math.log10(N) + p.split * Math.log2(N) + 10 * Math.log10(1 / (1 - lo)), Ptx = Ps * Math.pow(10, -splitDB / 10);
    const tpa = l.pf.mat === 'si' ? 0.6 * Math.pow(Ptx * 1e3 / 100, 2) : 0;   // Si: two-photon + free-carrier absorption in the switch tree (dB)
    const Pout = Ptx * Math.pow(10, -(p.sc.il + tpa + (g ? g(2) * 0.3 : 0)) / 10), Dap = 2 * p.sc.wb;
    const Prx = Pout * RHO * Dap * Dap / (4 * R * R) * ETA_HET * Math.pow(10, -p.sc.il / 10);
    const Plo = Ps * lo / N * Math.pow(10, -1.0 / 10), shot = 2 * Q * p.resp * Plo, etaLO = shot / (shot + IN * IN);
    const T = p.ch.T * 1e-6, tauR = 2 * R / C, Tint = Math.max(T - tauR, 0);
    const coh = Math.exp(-2 * Math.PI * p.ch.dnu * tauR), nl = Math.exp(-Math.pow(2 * Math.PI * tauR * p.ch.eres, 2));
    const snr1 = p.resp * Prx * Tint / Q * etaLO * coh * nl, nav = Math.max(1, d.nav | 0), snr = snr1 * Math.sqrt(nav);   // incoherent averaging of nav chirps ≈ √nav detection gain
    return { snr: 10 * Math.log10(Math.max(snr, 1e-12)), snr1, Prx, Pout, Plo, etaLO, coh, nl, Tint, N, Ptx, tpa };
  }
  function analyse(l, d, proc) {
    const p = parts(l, d), g = proc && proc.seed != null ? (k) => gaussR(mulberry(proc.seed * 43 + k * 113)) : null;
    let lo = 1, hi = p.ch.Radc;
    if (link(l, d, p, lo, g).snr < TH) hi = lo; else if (link(l, d, p, hi, g).snr >= TH) lo = hi; else for (let i = 0; i < 40; i++) { const m = 0.5 * (lo + hi); if (link(l, d, p, m, g).snr >= TH) lo = m; else hi = m; }
    const Rmax = lo, at = link(l, d, p, Math.max(Rmax, 1), g), ref200 = link(l, d, p, l.R, g);
    const N = NCH[d.nch | 0], pr = N / ((2 * p.ch.T + p.sc.settle) * Math.max(1, d.nav | 0)) * 1e3;
    const Pmw = Math.pow(10, d.P / 10), wpe = 0.15 * Math.max(0.2, 1 - Pmw / 1000), laserW = Pmw / wpe / 1000 + 0.5;   // narrow-linewidth source + booster + control
    const PW = { laser: laserW, sw: N * p.sc.pw / 1000, rx: N * 2 * 0.12, adc: N * 0.6 }, pw = Object.values(PW).reduce((a, b) => a + b, 0);
    return { p, Rmax, at, ref200, N, pr, pw, PW, size: 1 };
  }
  const r1 = (l, r) => Math.max(l.s1.r / Math.max(r.Rmax, 1), l.s1.pr / r.pr);
  const r2 = (l, r) => Math.max(l.s2.r / Math.max(r.Rmax, 1), l.s2.pr / r.pr, r.pw / l.s2.pw);
  const K = {
    title: 'FMCW LiDAR', aspect: 0.55, noSize: true, sizeLabel: '—', sizeUnit: '', primaryLabel: '최대 거리 m', cheap: true,
    params: () => PR(), landKeys: () => ['P', 'lo', 'nav'], violation: () => 0,
    toggles: () => [{ k: 'useCard', label: '내 부품 카드(B-1·B-2·2-4·1-3)로 시스템 구성', needs: 'B-2' }],
    evaluate(l, d, proc) { const a = analyse(l, d, proc); return { d: { ...d }, ...a, drc: [], primary: a.Rmax, secondary: a.pr }; },
    perf(l, r) { return 250 * clamp(r.Rmax / l.s2.r, 0, 1) + 250 * clamp(r.pr / l.s2.pr, 0, 1); },
    comp(l, r) { return 300 * clamp(l.s2.pw / r.pw, 0, 1); },
    q1: r1, q2: r2,
    objectives(l, r) {
      return {
        t1: [{ k: `반사율 10% 표적 최대 거리 ≥ ${fmtT(l.s1.r)} m`, v: Math.round(r.Rmax) + ' m', ok: r.Rmax >= l.s1.r }, { k: `점 속도 ≥ ${fmtT(l.s1.pr)} kpts/s`, v: f2(r.pr, 1) + ' k', ok: r.pr >= l.s1.pr }],
        t2: [{ k: `최대 거리 ≥ ${fmtT(l.s2.r)} m`, v: Math.round(r.Rmax) + ' m', ok: r.Rmax >= l.s2.r }, { k: `점 속도 ≥ ${fmtT(l.s2.pr)} kpts/s`, v: f2(r.pr, 1) + ' k', ok: r.pr >= l.s2.pr }, { k: `시스템 전력 ≤ ${fmtT(l.s2.pw)} W`, v: f2(r.pw, 1) + ' W', ok: r.pw <= l.s2.pw }]
      };
    },
    fabPass: (l, r) => r.Rmax >= l.fab.r && r.pr >= l.s1.pr,
    fabCrit: (l) => `최대 거리 ≥ ${fmtT(l.fab.r)} m · 점 속도 ★ 기준 (광원 노화, 칩 손실 ±0.3 dB)`,
    meta(l, r) { const p = r.p; return `${p.src.length ? '내 카드: ' + p.src.join(', ') + ' · ' : ''}처프 ${f2(p.ch.B, 1)} GHz/${f2(p.ch.T, 1)} µs (Δν ${p.ch.dnu >= 1e6 ? p.ch.dnu / 1e6 + ' MHz' : p.ch.dnu / 1e3 + ' kHz'}) · 스캐너 ${p.sc.N}점, 편도 ${f2(p.sc.il, 1)} dB, 개구 Ø ${f2(2 * p.sc.wb * 1e3, 2)} mm<br>모노스태틱 코히어런트 수신 · 람베르트 표적 ρ ${RHO} · 헤테로다인 효율 ${ETA_HET} (스펙클) · 균형 검출 · 임계 SNR ${TH} dB${l.pf.mat === 'si' ? ' · Si 비선형 흡수(TPA·FCA)' : ''} · TIA ${IN * 1e12} pA/√Hz`; },
    tiles(l, r) { return [['최대 거리 @10%', `${Math.round(r.Rmax)}<small>m</small>`], ['점 속도', `${f2(r.pr, 1)}<small>kpts/s</small>`], [`SNR @${l.R} m`, `${f2(r.ref200.snr, 1)}<small>dB</small>`], ['시스템 전력', `${f2(r.pw, 1)}<small>W</small>`]]; },
    hint(l, r) {
      const a = r.ref200;
      return `@${l.R} m: 출사 ${f2(10 * Math.log10(a.Pout * 1e3), 1)} dBm → 수신 ${f2(10 * Math.log10(a.Prx * 1e3), 1)} dBm (${(a.Prx / (1.986e-25 / (l.pf.lam * 1e-6)) * a.Tint).toFixed(0)} 광자/램프) · LO ${f2(a.Plo * 1e3, 2)} mW (샷 잡음 비율 ${Math.round(a.etaLO * 100)}%) · 코히어런스 ${f2(10 * Math.log10(a.coh), 1)} dB · 비선형 ${f2(10 * Math.log10(a.nl), 1)} dB`
        + `<br>수신 전력 ∝ 개구 D² = (2w<sub>b</sub>)² — 스캐너의 빔이 클수록 멀리 봅니다. 채널을 나누면 점 속도는 늘지만 채널당 광원 전력이 줄어듭니다.`;
    },
    draw(cv, l, r, ui) {
      const ctx = cv.getContext('2d'), W = cv.width, H = cv.height, pad = 10 * DPR, p = r.p;
      ctx.fillStyle = '#0b1220'; ctx.fillRect(0, 0, W, H);
      const ox = W / 2, oy = H - pad - 8 * DPR, Rv0 = Math.max(r.Rmax, l.s2.r) * 1.4, stp = [1, 2, 5, 10, 20, 50, 100].find((v) => Rv0 / v <= 6) || 100, Rv = Math.ceil(Rv0 / stp) * stp, sc = (H - 2 * pad - 30 * DPR) / Rv, fov = p.sc.fov * Math.PI / 180;
      ctx.font = `${10 * DPR}px "IBM Plex Mono", monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const wedge = (R, fill, stroke) => { ctx.beginPath(); ctx.moveTo(ox, oy); ctx.arc(ox, oy, R * sc, -Math.PI / 2 - fov / 2, -Math.PI / 2 + fov / 2); ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); } };
      wedge(Rv, 'rgba(100,201,223,0.05)', 'rgba(100,201,223,0.25)');
      wedge(Math.min(r.Rmax, Rv), r.Rmax >= l.s2.r ? 'rgba(93,209,147,0.22)' : r.Rmax >= l.s1.r ? 'rgba(242,176,74,0.22)' : 'rgba(255,107,107,0.22)', null);
      for (let R = stp; R <= Rv + 1e-9; R += stp) { ctx.strokeStyle = 'rgba(158,171,189,0.18)'; ctx.beginPath(); ctx.arc(ox, oy, R * sc, -Math.PI / 2 - fov / 2 - 0.05, -Math.PI / 2 + fov / 2 + 0.05); ctx.stroke(); ctx.fillStyle = 'rgba(158,171,189,0.8)'; ctx.fillText(`${R} m`, ox + Math.sin(fov / 2 + 0.12) * R * sc, oy - Math.cos(fov / 2 + 0.12) * R * sc); }
      [[l.s1.r, '★'], [l.s2.r, '★★']].forEach(([R, t]) => { ctx.strokeStyle = 'rgba(231,236,243,0.6)'; ctx.setLineDash([4 * DPR, 3 * DPR]); ctx.beginPath(); ctx.arc(ox, oy, R * sc, -Math.PI / 2 - fov / 2, -Math.PI / 2 + fov / 2); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = '#e7ecf3'; ctx.fillText(t, ox, oy - R * sc - 8 * DPR); });
      // sample points (one per scanner position, up to 64) at the max range
      const n = Math.min(p.sc.N, 64); ctx.fillStyle = '#f6c35a'; for (let i = 0; i < n; i++) { const a = -fov / 2 + fov * (i + 0.5) / n, R = Math.min(r.Rmax, Rv) * (0.85 + 0.15 * Math.sin(i * 1.7)); ctx.fillRect(ox + Math.sin(a) * R * sc - 1.5 * DPR, oy - Math.cos(a) * R * sc - 1.5 * DPR, 3 * DPR, 3 * DPR); }
      ctx.fillStyle = '#e7ecf3'; ctx.fillRect(ox - 8 * DPR, oy - 4 * DPR, 16 * DPR, 8 * DPR);
      cvPill(ctx, `최대 ${Math.round(r.Rmax)} m @10% · FOV ${f2(p.sc.fov, 1)}°`, pad, pad + 4 * DPR, 'left', r.Rmax >= l.s1.r ? '#5dd193' : '#ff6b6b');
      cvPill(ctx, `${f2(r.pr, 1)} kpts/s · ${r.N}채널 · ${f2(r.pw, 1)} W`, W - pad, pad + 4 * DPR, 'right', r.pr >= l.s1.pr ? '#5dd193' : '#f2b04a');
    },
    chartTitle: () => `거리에 따른 SNR — 검출 임계 ${TH} dB`,
    chart(l, r) {
      const d = r.d, p = r.p, pts = [], ideal = [];
      for (let R = 10; R <= 300; R += 5) { const a = link(l, d, p, R); pts.push([R, Math.max(-10, a.snr)]); ideal.push([R, Math.max(-10, a.snr - 10 * Math.log10(a.coh * a.nl))]); }
      const y1 = Math.ceil(Math.max(40, ...ideal.map((x) => x[1])) / 10) * 10;
      const html = svgChart({ x0: 0, x1: 300, y0: -10, y1, aria: 'SNR', xticks: [0, 50, 100, 150, 200, 250, 300], yticks: [-10, 0, TH, 30, y1], ylab: 'dB', xlab: '거리 m',
        vlines: [{ x: Math.min(300, p.ch.Radc), color: 'var(--rose)' }, { x: l.s2.r, color: 'rgba(231,236,243,.5)' }], hlines: [{ y: TH, label: `임계 ${TH} dB` }],
        series: [{ pts, color: 'var(--amber)', width: 2.4 }, { pts: ideal, color: 'var(--cyan)', width: 1.4, dash: '5 4' }] });
      return { html, legend: legendHTML([['var(--amber)', 'SNR (선폭·비선형 포함)'], ['var(--cyan)', '이상적 레이저였다면'], ['var(--rose)', 'ADC 한계 거리 (B-1)']]) };
    },
    coach(l, r, c) {
      const t = c.tier, d = r.d, q1 = (x) => r1(l, x), q2 = (x) => keepStar(r1(l, x), r2(l, x));
      const grid = (q) => { const c = []; for (let P = 10; P <= 30; P += 1) for (let n = 0; n < 4; n++) for (const lo of [2, 5, 10, 20, 35]) for (const nav of [1, 2, 4, 8, 16]) c.push([P, n, lo, nav]); return bestOfCands(K, l, d, ['P', 'nch', 'lo', 'nav'], c, q); };
      const pick = (q) => { const a = lineBestOf(K, l, d, ['P', 'nch', 'lo', 'nav'], q, 24), b = grid(q); return a && (!b || a.q <= b.q * 1.02 || a.q <= 1) ? a : b; };
      const txt = (b) => (!b ? '' : b.ps ? recText2(b, t) : recText(b, t, d));
      const a = r.ref200;
      if (!c.ob1) {
        if (r.Rmax < l.s1.r) {
          const why = a.etaLO < 0.5 ? `LO가 약해(${f2(a.Plo * 1e3, 2)} mW) TIA 열잡음이 샷 잡음보다 큽니다 — 코히어런트 수신의 이득을 못 쓰고 있습니다.` : r.Rmax >= r.p.ch.Radc - 1 ? '처프가 허용하는 ADC 거리 한계에 닿았습니다 — B-1 카드의 처프를 바꿔야 합니다.' : `${l.R} m 수신 전력은 램프당 광자 ${(a.Prx / (1.986e-25 / (l.pf.lam * 1e-6)) * a.Tint).toFixed(0)}개 수준입니다. 출사 전력과 개구가 거리를 정합니다.`;
          const b = pick(q1); if (b) return { h: '반사광이 검출 임계에 못 미칩니다', b: why + txt(b) };
        }
        if (r.pr < l.s1.pr) { const b = pick(q1); if (b) return { h: '점 속도가 부족합니다', b: `빔 하나는 (2T + 스위치 정착) 시간마다 한 점입니다. 채널을 병렬로 늘리면 점 속도가 늘지만 채널마다 광원을 나눠 써야 합니다.` + txt(b) }; }
        return null;
      }
      if (!c.ob2) { const b = pick(q2); if (b) return { h: r.pw > l.s2.pw ? '★★: 전력 예산 초과' : '★★: 거리와 속도를 함께 올리세요', b: (r.pw > l.s2.pw ? `광원이 ${f2(r.PW.laser, 1)} W로 가장 큽니다. 고출력 부스터는 효율이 떨어집니다.` : '광원 출력, 채널 수, LO 비율 사이의 균형점을 찾으세요.') + txt(b) }; }
      return null;
    },
    card(l, r) { return { kind: 'lidar', lines: [`${Math.round(r.Rmax)} m @10% · ${f2(r.pr, 1)} kpts/s`, `${r.N}채널 · ${f2(r.pw, 1)} W`], model: { Rmax: Math.round(r.Rmax), pr: +r.pr.toFixed(1), pw: +r.pw.toFixed(2) } }; },
    aiStarts: (l) => [l.start, { ...l.start, P: 24, nch: 1, lo: 10, nav: 4 }],
    _x: { analyse, link }
  };
  return K;
})();
