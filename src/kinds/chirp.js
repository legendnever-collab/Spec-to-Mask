// ===== Kind: FMCW chirp + on-chip reference interferometer (Track B-1) =====
// Range resolution c/2B, beat f_b = 2Rγ/c (γ = B/T) within the ADC band, dead time 2R/c of each ramp.
// Linewidth Δν: coherence penalty exp(−2πΔν·τ_R) of the beat peak at τ_R = 2R/c (τ_R ≪ T).
// Linearisation: predistortion learned from the reference MZI (delay τ_ref, a D-1 spiral) averaged over M chirps:
//   residual chirp error e = √(e_j² + Δν/(2π τ_ref M) + e_meas²) → beat phase error 2π τ_R e → peak loss exp(−σφ²).
//   e_meas from the reference fringe SNR (spiral loss).  Range calibration: R ∝ τ_ref, so ΔR/R = (1/n_g)(dn_g/dT)·ΔT.
KINDS.chirp = (() => {
  const C = 2.998e8, FADC = 500e6, M = 1000, PTAP = 1e-3, BREF = 50e6, Q = 1.602e-19, EJ_IDX = 0;
  const LAS = [
    { name: 'DFB (전류 튜닝)', dnu: 1e6, bmax: 10, ej: 80e3 },
    { name: 'ECL (외부 공진)', dnu: 100e3, bmax: 5, ej: 30e3 },
    { name: '초협선폭 (SiN 링 외부공진)', dnu: 10e3, bmax: 2.5, ej: 15e3 }
  ];
  const cards = () => (typeof window !== 'undefined' ? window.GAME_CARDS : global.GAME_CARDS) || {};
  const PR = () => [
    { k: 'las', label: '레이저', sym: 'LD', min: 0, max: 2, step: 1, dec: 0, unit: '', labels: LAS.map((x) => x.name) },
    { k: 'B', label: '처프 대역폭', sym: 'B', min: 0.5, max: 10, step: 0.1, dec: 1, unit: 'GHz' },
    { k: 'T', label: '램프 시간 (한 방향)', sym: 'T', min: 2, max: 50, step: 0.5, dec: 1, unit: 'µs' },
    { k: 'tau', label: '기준 간섭계 지연', sym: 'τ<sub>ref</sub>', min: 0.2, max: 20, step: 0.1, dec: 1, unit: 'ns' },
    { k: 'tc', label: '기준 지연 온도 보정', sym: 'TC', min: 0, max: 1, step: 1, dec: 0, unit: '', labels: ['없음 (±10 K)', '온도 센서 보정 (±1 K)'] }
  ];
  function spiralOf(l, d) { const c = cards()['D-1']; return d.useCard && c && c.d ? { sp: c.d, src: 'D-1' } : { sp: l.parts.spiral, src: '' }; }
  function analyse(l, d, proc) {
    const pf = l.pf, L = LAS[d.las | 0], R = l.R, tauR = 2 * R / C, B = d.B * 1e9, T = d.T * 1e-6, g = proc && proc.seed != null ? gaussR(mulberry(proc.seed * 37 + 11)) : 0;
    const dR = C / (2 * B) * 100, gam = B / T, Radc = FADC * C / (2 * gam), u = 1 - tauR / T, pr = 1 / (2 * T) / 1000, fref = gam * d.tau * 1e-9;
    const S = spiralOf(l, d), sb = KINDS.spiral._x.build(pf, S.sp, d.tau, proc), refIL = sb.IL;
    const Pref = PTAP * Math.pow(10, -refIL / 10) * 0.25, snrRef = Pref * 0.9 / (Q * BREF), emeas = 1 / Math.sqrt(snrRef) / (2 * Math.PI * d.tau * 1e-9) / Math.sqrt(M);
    const ej = L.ej * (1 + 0.15 * g), epn = Math.sqrt(L.dnu / (2 * Math.PI * d.tau * 1e-9 * M)), eres = Math.sqrt(ej * ej + epn * epn + emeas * emeas);
    const sphi = 2 * Math.PI * tauR * eres, Lnl = 4.343 * sphi * sphi, Lcoh = 4.343 * 2 * Math.PI * L.dnu * tauR, Ldead = u > 0.01 ? -10 * Math.log10(u) : 20;
    const loss = Lnl + Lcoh + Ldead;
    const o = KINDS.to._x.optics(pf), x = KINDS.spiral._x.xs(pf, S.sp.w), dngdT = o.dndT * x.ng / x.neff, dT = d.tc ? 1 : 10, cal = R * (dngdT / x.ng) * dT * 100;   // cm
    return { L, dR, Radc, u, pr, fref, refIL, snrRef, eres, ej, epn, emeas, sphi, Lnl, Lcoh, Ldead, loss, cal, dngdT, area: sb.area, tauR, size: sb.area, src: S.src, ng: x.ng };
  }
  const r1 = (l, r, d) => Math.max(r.dR / l.s1.dr, l.R / Math.max(r.Radc, 1), (d ? d.B : r.d.B) / r.L.bmax, r.fref / FADC, r.refIL / l.s1.refil);
  const r2 = (l, r) => Math.max(r.loss / l.s2.loss, r.cal / l.s2.cal, l.s2.pr / r.pr);
  const K = {
    title: 'FMCW chirp', aspect: 0.5, sizeLabel: '기준 나선 면적', sizeUnit: 'mm²', sizeFmt: (v) => (v / 1e6).toFixed(3), primaryLabel: 'SNR 손실 dB', cheap: true,
    params: () => PR(), landKeys: () => ['B', 'T', 'tau'], violation: () => 0,
    toggles: () => [{ k: 'useCard', label: '내 D-1 나선 카드로 기준 간섭계 구성', needs: 'D-1' }],
    evaluate(l, d, proc) { const a = analyse(l, d, proc); return { d: { ...d }, ...a, drc: [], primary: a.loss, secondary: a.dR }; },
    perf(l, r) { return 200 * clamp(l.s1.dr / r.dR, 0, 1) + 150 * clamp(1 - r.loss / 12, 0, 1) + 150 * clamp(r.pr / 100, 0, 1); },
    q1: (l, r) => r1(l, r), q2: r2,
    objectives(l, r) {
      return {
        t1: [{ k: `거리 분해능 c/2B ≤ ${fmtT(l.s1.dr)} cm`, v: f2(r.dR, 1) + ' cm', ok: r.dR <= l.s1.dr }, { k: `ADC(${FADC / 1e6} MHz) 안에 ${l.R} m 비트`, v: Math.round(r.Radc) + ' m', ok: r.Radc >= l.R },
          { k: `레이저 튜닝 범위 B ≤ ${r.L.bmax} GHz`, v: f2(r.d.B, 1) + ' GHz', ok: r.d.B <= r.L.bmax }, { k: `기준 간섭계 손실 ≤ ${fmtT(l.s1.refil)} dB`, v: f2(r.refIL, 1) + ' dB', ok: r.refIL <= l.s1.refil }],
        t2: [{ k: `${l.R} m에서 SNR 손실 ≤ ${fmtT(l.s2.loss)} dB`, v: f2(r.loss, 2) + ' dB', ok: r.loss <= l.s2.loss }, { k: `거리 보정 오차 ≤ ${fmtT(l.s2.cal)} cm`, v: f2(r.cal, 1) + ' cm', ok: r.cal <= l.s2.cal },
          { k: `점 속도 (빔 1개) ≥ ${fmtT(l.s2.pr)} kpts/s`, v: f2(r.pr, 1) + ' k', ok: r.pr >= l.s2.pr }]
      };
    },
    fabPass: (l, r) => r1(l, r) <= 1 && r.loss <= l.fab.loss && r.cal <= l.s2.cal,
    fabCrit: (l) => `★ 조건 + SNR 손실 ≤ ${fmtT(l.fab.loss)} dB (나선 거칠기·CD 산포, 처프 지터 ±15%)`,
    meta(l, r) { return `${r.L.name}: Δν ${r.L.dnu >= 1e6 ? r.L.dnu / 1e6 + ' MHz' : r.L.dnu / 1e3 + ' kHz'}, 처프 지터 ${r.L.ej / 1e3} kHz · ADC ${FADC / 1e6} MHz · 예왜곡 학습 ${M}회 평균 · 기준 탭 ${PTAP * 1e3} mW<br>기준 간섭계 = ${r.src ? '내 D-1 카드' : '기준 D-1'} 나선 (n<sub>g</sub> ${f2(r.ng, 2)}, dn<sub>g</sub>/dT ${(r.dngdT * 1e5).toFixed(1)}×10⁻⁵/K)`; },
    tiles(l, r) { return [['분해능 · ADC 거리', `${f2(r.dR, 1)}<small>cm</small> · ${Math.round(r.Radc)}<small>m</small>`], [`SNR 손실 @${l.R} m`, `${f2(r.loss, 2)}<small>dB</small>`], ['잔류 처프 오차', `${f2(r.eres / 1e3, 1)}<small>kHz</small>`], ['보정 오차 · 점 속도', `${f2(r.cal, 1)}<small>cm</small> · ${f2(r.pr, 0)}<small>k/s</small>`]]; },
    hint(l, r) {
      return `손실 분해 @${l.R} m (τ<sub>R</sub> = ${f2(r.tauR * 1e6, 2)} µs): 코히어런스 ${f2(r.Lcoh, 2)} + 비선형 ${f2(r.Lnl, 2)} + 데드타임 ${f2(r.Ldead, 2)} dB`
        + `<br>잔류 처프 오차 = √(지터 ${f2(r.ej / 1e3, 0)}² + 기준 위상잡음 ${f2(r.epn / 1e3, 0)}² + 측정 ${f2(r.emeas / 1e3, 1)}²) kHz — 기준 지연이 길수록 위상잡음 항이 1/√τ<sub>ref</sub>로 줄어듭니다`
        + `<br>c/2B와 ADC 거리 2R·B/(cT) ≤ ${FADC / 1e6} MHz는 B와 T를 반대 방향으로 당깁니다. 데드타임 2R/c는 T가 짧을수록 아깝습니다.`;
    },
    draw(cv, l, r, ui) {
      const ctx = cv.getContext('2d'), W = cv.width, H = cv.height, pad = 10 * DPR, narrow = W / DPR < 520, d = r.d;
      ctx.fillStyle = '#0b1220'; ctx.fillRect(0, 0, W, H);
      const vw = narrow ? W : W * 0.64, x0 = pad + 52 * DPR, x1 = vw - pad, y0 = pad + 24 * DPR, y1 = H - pad - 22 * DPR;
      const Tn = 2 * d.T, X = (t) => x0 + t / (2 * Tn) * (x1 - x0), Y = (f) => y1 - f / (d.B * 1.15) * (y1 - y0);
      const tri = (t) => { const ph = ((t % Tn) + Tn) % Tn; return ph < d.T ? ph / d.T * d.B : (2 * d.T - ph) / d.T * d.B; };
      ctx.strokeStyle = 'rgba(158,171,189,0.35)'; ctx.lineWidth = 1 * DPR; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, y1); ctx.lineTo(x1, y1); ctx.stroke();
      const trace = (shift, col, w, nlAmp) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); for (let i = 0; i <= 400; i++) { const t = i / 400 * 2 * Tn, f = tri(t - shift) + nlAmp * Math.sin(2 * Math.PI * 3 * t / d.T) ; const xx = X(t), yy = Y(Math.max(0, f)); i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke(); };
      const nlVis = Math.min(d.B * 0.05, r.eres / 1e9 * 400);
      trace(0, '#f6c35a', 2 * DPR, nlVis); trace(r.tauR * 1e6, 'rgba(100,201,223,0.85)', 1.6 * DPR, nlVis);
      ctx.font = `${10 * DPR}px "IBM Plex Mono", monospace`; ctx.fillStyle = 'rgba(158,171,189,0.95)'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillText(`${f2(d.B, 1)} GHz`, x0 - 4 * DPR, Y(d.B)); ctx.fillText('0', x0 - 4 * DPR, Y(0)); ctx.textAlign = 'center'; ctx.fillText(`${f2(Tn * 2, 0)} µs`, x1 - 20 * DPR, y1 + 12 * DPR);
      // dead-time shading
      ctx.fillStyle = 'rgba(255,107,107,0.12)'; for (let k = 0; k < 4; k++) { const ts = k * d.T; ctx.fillRect(X(ts), y0, X(ts + r.tauR * 1e6) - X(ts), y1 - y0); }
      cvPill(ctx, `송신 처프 · ${f2(r.tauR * 1e6, 2)} µs 늦은 ${l.R} m 반사 (빨강: 데드타임)`, pad, pad + 4 * DPR, 'left', '#f6c35a');
      if (narrow) return;
      const px = W * 0.68;
      [['f_b @' + l.R + ' m', `${f2(2 * l.R * d.B * 1e9 / d.T * 1e6 / 2.998e8 / 1e6, 0)} MHz`], ['f_ref', `${f2(r.fref / 1e6, 2)} MHz`], ['ΔR = c/2B', `${f2(r.dR, 1)} cm`], ['잔류 처프 오차', `${f2(r.eres / 1e3, 1)} kHz`], ['σφ @' + l.R + ' m', `${f2(r.sphi, 2)} rad`], ['기준 나선 손실', `${f2(r.refIL, 1)} dB`], ['보정 오차', `${f2(r.cal, 1)} cm`]].forEach(([k, v], i) => {
        const y = pad + 8 * DPR + i * 20 * DPR; ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(158,171,189,0.95)'; ctx.fillText(k, px, y); ctx.textAlign = 'right'; ctx.fillStyle = '#e7ecf3'; ctx.fillText(v, W - pad, y);
      });
    },
    chartTitle: () => '거리에 따른 SNR 손실 — 코히어런스 · 처프 비선형 · 데드타임',
    chart(l, r) {
      const d = r.d, a = [], b = [], c = [], tot = [];
      for (let R = 5; R <= 300; R += 5) { const ll = { ...l, R }, x = analyse(ll, d); a.push([R, Math.min(20, x.Lcoh)]); b.push([R, Math.min(20, x.Lnl)]); c.push([R, Math.min(20, x.Ldead)]); tot.push([R, Math.min(20, x.loss)]); }
      const ymax = Math.min(20, Math.max(6, Math.ceil(Math.max(...tot.map((p) => p[1])))));
      const html = svgChart({ x0: 0, x1: 300, y0: 0, y1: ymax, aria: 'SNR 손실', xticks: [0, 50, 100, 150, 200, 250, 300], yticks: [0, Math.round(ymax / 2), ymax], ylab: 'dB', xlab: '거리 m',
        vlines: [{ x: l.R, color: 'rgba(231,236,243,.6)' }, { x: Math.min(300, r.Radc), color: 'var(--rose)' }], hlines: [{ y: l.s2.loss, label: `★★ ${fmtT(l.s2.loss)} dB` }],
        series: [{ pts: tot, color: 'var(--fg)', width: 2.4 }, { pts: a, color: 'var(--amber)', width: 1.4, dash: '5 4' }, { pts: b, color: 'var(--cyan)', width: 1.4, dash: '5 4' }, { pts: c, color: 'var(--rose)', width: 1.4, dash: '2 3' }] });
      return { html, legend: legendHTML([['var(--fg)', '합계'], ['var(--amber)', '코히어런스 (선폭)'], ['var(--cyan)', '처프 비선형'], ['var(--rose)', '데드타임 · ADC 한계 거리']]) };
    },
    coach(l, r, c) {
      const t = c.tier, d = r.d, q1 = (x) => r1(l, x), q2s = (x) => keepStar(r1(l, x), Math.max(r2(l, x), x.size / l.s2.size));
      const pick = (q, ks) => lineBestOf(K, l, d, ks, q, 24) || [['B', 'T'], ['las', 'B'], ['T', 'tau']].map((k2) => pairBest(K, l, d, k2, q, 12)).filter(Boolean).sort((a, b) => a.q - b.q)[0] || randomBest(K, l, d, ['las', 'B', 'T', 'tau', 'tc'], q, 400);
      const txt = (b) => (!b ? '' : b.ps ? recText2(b, t, d) : recText(b, t, d));
      if (!c.ob1) {
        if (d.B > r.L.bmax) { const b = pick(q1, ['B', 'las']); if (b) return { h: '레이저가 그만큼 튜닝되지 않습니다', b: `${r.L.name}의 모드 홉 없는 튜닝 범위는 약 ${r.L.bmax} GHz입니다. 선폭이 좁은 레이저일수록 빠르고 넓은 튜닝이 어렵습니다.` + txt(b) }; }
        if (r.dR > l.s1.dr || r.Radc < l.R) { const b = pick(q1, ['B', 'T']); if (b) return { h: r.dR > l.s1.dr ? '거리 분해능이 부족합니다' : `${l.R} m의 비트 주파수가 ADC를 넘습니다`, b: `분해능은 c/2B, 비트 주파수는 2R·B/(c·T)입니다. B를 키우면 분해능이 좋아지지만 같은 T에서 비트가 ADC 대역(${FADC / 1e6} MHz)을 넘으니 T도 함께 늘려야 합니다.` + txt(b) }; }
        const b = pick(q1, ['tau']); if (b) return { h: '기준 간섭계가 너무 손실이 큽니다', b: '기준 나선이 길수록 손실이 커져 기준 프린지가 잡음에 묻힙니다.' + txt(b) };
        return null;
      }
      if (!c.ob2) {
        const dom = r.Lcoh > r.Lnl && r.Lcoh > r.Ldead ? ['선폭이 코히어런스를 깎습니다', `지연 τ<sub>R</sub>가 레이저 코히어런스 시간 1/(πΔν)에 비해 길면 비트 스펙트럼이 퍼져 피크가 낮아집니다(지금 ${f2(r.Lcoh, 1)} dB). 선폭이 좁은 레이저가 필요합니다.`, ['las']]
          : r.Lnl >= r.Ldead ? ['처프 비선형이 피크를 퍼뜨립니다', `잔류 처프 오차 ${f2(r.eres / 1e3, 0)} kHz × 2π τ<sub>R</sub> = ${f2(r.sphi, 2)} rad의 위상 오차가 생깁니다. 기준 지연을 늘리면 학습한 예왜곡이 정확해집니다(나선이 길어지는 대가).`, ['tau', 'las']]
            : ['데드타임이 아깝습니다', `각 램프의 처음 ${f2(r.tauR * 1e6, 2)} µs는 반사광이 아직 돌아오지 않아 쓸 수 없습니다. 램프를 길게 하면 비율이 줄지만 점 속도가 떨어집니다.`, ['T']];
        if (r.cal > l.s2.cal) { const b = pick(q2s, ['tc', 'tau']); if (b) return { h: '기준 지연이 온도에 따라 늘어납니다', b: `거리를 기준 간섭계로 환산하므로 τ<sub>ref</sub>의 열 변화가 그대로 거리 오차가 됩니다(${l.pf.mat === 'si' ? 'Si는 dn/dT가 커서' : 'SiN도'} ±10 K에서 ${f2(r.cal, 1)} cm). 온도를 재서 보정하세요.` + txt(b) }; }
        const b = pick(q2s, dom[2].concat(['B', 'T', 'tau'])); if (b) return { h: '★★: ' + dom[0], b: dom[1] + txt(b) };
      }
      return null;
    },
    card(l, r) { return { kind: 'chirp', lines: [`${r.L.name.split(' ')[0]} · B ${f2(r.d.B, 1)} GHz · T ${f2(r.d.T, 1)} µs`, `ΔR ${f2(r.dR, 1)} cm · 손실 ${f2(r.loss, 1)} dB @${l.R} m`], model: { las: r.d.las, B: r.d.B, T: r.d.T, dnu: r.L.dnu, eres: Math.round(r.eres), Radc: Math.round(r.Radc), dR: +r.dR.toFixed(2) } }; },
    aiStarts: (l) => [l.start, { ...l.start, las: 1, B: 3, T: 10, tau: 10 }],
    _x: { analyse, LAS, FADC }
  };
  return K;
})();
