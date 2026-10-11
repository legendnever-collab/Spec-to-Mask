// ===== Kind: N-bit switched true-time-delay line (cascaded 2×2 thermo-optic MZ switches + binary delay spirals) =====
// After the 10-bit, 10-ps, 5.12-ns silicon TTD of Hong 2022 and the 5-bit (5.68 ps) channels of Xie 2023.
// Stage k delay spiral: τ_k = 2^k·Δτ, built with the D-1 spiral cross-section and packing rules (card or reference).
// MZ switch: random phase error from local width fluctuation σφ = (2π/λ)·|∂n_eff/∂w|·σ_w·√(L·l_c) per arm
//   → calibration power Q₀ = (|δφ|/π)·P_π; residual error after calibration → switch leakage → delay echoes.
// Wide (multimode) arms cut ∂n_eff/∂w by an order of magnitude (Xie 2023: Q₀/Q_π < 0.05 with 2-µm arms).
KINDS.ttd = (() => {
  const L_ARM = 300, SIG_W = 0.002, LCOR = 3, IL_SW = 0.25, LEAK0 = 3e-4;
  const gaussLike = (proc, k) => gaussR(mulberry((proc.seed || 1) * 31 + k * 701));
  const cards = () => (typeof window !== 'undefined' ? window.GAME_CARDS : global.GAME_CARDS) || {};
  const PR = (l) => [
    { k: 'N', label: '비트 수 (스위치 단 수)', sym: 'N', min: 3, max: 11, step: 1, dec: 0, unit: 'bit' },
    { k: 'dt', label: '최소 지연 단위', sym: 'Δτ', min: 1, max: 40, step: 0.5, dec: 1, unit: 'ps' },
    { k: 'wa', label: '스위치 위상기 암 폭', sym: 'W<sub>arm</sub>', min: l.pf.mat === 'si' ? 0.4 : 0.8, max: l.pf.mat === 'si' ? 2.5 : 3.0, step: 0.05, dec: 2, unit: 'µm' }
  ];
  function parts(l, d) {
    const c = cards(), use = !!d.useCard, src = [];
    const sp = use && c['D-1'] && c['D-1'].d ? (src.push('D-1'), c['D-1'].d) : l.parts.spiral;
    const ppi = use && c['2-1'] && c['2-1'].model ? (src.push('2-1'), c['2-1'].model.Ppi) : l.parts.ppi;
    return { sp, ppi, src };
  }
  function analyse(l, d, proc) {
    const pf = l.pf, S = KINDS.spiral._x, p = parts(l, d), N = d.N | 0, g = (k) => (proc ? gaussLike(proc, k) : 0);
    const stages = [];
    let ilOn = 0, area = 0;
    for (let k = 0; k < N; k++) {
      const tau = d.dt * Math.pow(2, k) / 1000, b = S.build(pf, p.sp, tau, proc);    // ns
      stages.push({ k, tau: tau * 1000, IL: b.IL, Lcm: b.Lcm, area: b.area }); ilOn += b.IL; area += b.area;
    }
    // MZ switches (N + 1)
    const xa = S.xs(pf, d.wa), sphi = (2 * Math.PI / pf.lam) * Math.abs(xa.dndw) * SIG_W * Math.sqrt(L_ARM * LCOR) * Math.SQRT2;
    const ppiArm = p.ppi * Math.pow(Math.max(d.wa, pf.w0) / pf.w0, 0.25), q0 = Math.sqrt(2 / Math.PI) * sphi / Math.PI * ppiArm;
    const taperL = 2 * 30 * Math.max(0, d.wa - pf.w0) / 0.5, swArea = (L_ARM + taperL + 120) * 90;
    const ilSw = IL_SW + 0.01 * Math.max(0, d.wa - pf.w0) + xa.alpha * (L_ARM + taperL) * 1e-4;
    const nSw = N + 1, res = 0.005 + 0.15 * sphi * (proc ? Math.abs(1 + 0.5 * g(1)) : 1);   // residual phase after calibration (drift, DAC step) grows with the initial error
    const leak = Math.pow(Math.sin(res / 2), 2) + LEAK0, echo = 10 * Math.log10(leak);   // strongest single replica (each leaking switch adds one delayed copy)
    const ilMin = nSw * ilSw * (proc ? 1 + 0.05 * g(2) : 1), ilMax = ilMin + ilOn, dil = ilOn;
    const range = (Math.pow(2, N) - 1) * d.dt, totArea = (area + nSw * swArea) * 1.2;
    const pw = nSw * (ppiArm + q0);   // mW, worst case: every switch flipped and calibrated
    return { p, N, stages, sphi, q0, ppiArm, ilSw, nSw, leak, echo, ilMin, ilMax, dil, range, step: d.dt, size: totArea, pw, xa };
  }
  const r1 = (l, r) => Math.max(l.s1.range / r.range, r.step / l.s1.step, r.ilMax / l.s1.il);
  const r2 = (l, r) => Math.max(r.dil / l.s2.dil, 1 + (r.echo - l.s2.echo) / 20, r.pw / l.s2.pw);
  const mm2 = (a) => (a / 1e6).toFixed(2);
  const K = {
    title: 'N-bit TTD', aspect: 0.5, sizeLabel: '칩 면적', sizeUnit: 'mm²', sizeFmt: (v) => mm2(v), primaryLabel: '최대 손실 dB', cheap: true,
    params: (l) => PR(l), landKeys: () => ['dt', 'wa'], violation: () => 0,
    toggles: () => [{ k: 'useCard', label: '내 D-1 나선 카드(와 2-1 히터)로 지연선 구성', needs: 'D-1' }],
    evaluate(l, d, proc) { const a = analyse(l, d, proc); return { d: { ...d }, ...a, drc: [], primary: a.ilMax, secondary: a.range }; },
    perf(l, r) { return 200 * clamp(l.s2.dil / r.dil, 0, 1) + 150 * clamp((-r.echo - 10) / 25, 0, 1) + 150 * clamp(l.s2.pw / r.pw, 0, 1); },
    q1: r1, q2: r2,
    objectives(l, r) {
      return {
        t1: [{ k: `지연 범위 ≥ ${l.s1.range / 1000} ns`, v: f2(r.range / 1000, 2) + ' ns', ok: r.range >= l.s1.range }, { k: `분해능 Δτ ≤ ${l.s1.step} ps`, v: f2(r.step, 1) + ' ps', ok: r.step <= l.s1.step },
          { k: `최대 경로 손실 ≤ ${fmtT(l.s1.il)} dB`, v: f2(r.ilMax, 1) + ' dB', ok: r.ilMax <= l.s1.il }],
        t2: [{ k: `상태 간 손실 변동 ≤ ${fmtT(l.s2.dil)} dB`, v: f2(r.dil, 2) + ' dB', ok: r.dil <= l.s2.dil }, { k: `지연 에코(스위치 누설) ≤ ${l.s2.echo} dB`, v: f2(r.echo, 1) + ' dB', ok: r.echo <= l.s2.echo },
          { k: `히터 전력(최악) ≤ ${fmtT(l.s2.pw)} mW`, v: Math.round(r.pw) + ' mW', ok: r.pw <= l.s2.pw }]
      };
    },
    fabPass: (l, r) => r.ilMax <= l.fab.il && r.echo <= l.fab.echo && r.range >= l.s1.range && r.step <= l.s1.step,
    fabCrit: (l) => `최대 손실 ≤ ${fmtT(l.fab.il)} dB · 에코 ≤ ${l.fab.echo} dB (측벽 거칠기 ±20%, 스위치 위상 오차·보정 잔차 다이별)`,
    meta(l, r) { return `${r.p.src.length ? '내 카드: ' + r.p.src.join(', ') : '기준 D-1 나선 · 기준 2-1 히터'} · 나선 W ${f2(r.p.sp.w, 2)} µm, ${f2(KINDS.spiral._x.xs(l.pf, r.p.sp.w).alpha, 3)} dB/cm · 스위치 ${r.nSw}개 (P<sub>π</sub> ${f2(r.ppiArm, 1)} mW)<br>암 위상 오차 σφ ${f2(r.sphi, 3)} rad → 보정 전력 Q₀/Q<sub>π</sub> ${f2(r.q0 / r.ppiArm, 3)} · 스위치당 누설 ${f2(10 * Math.log10(r.leak), 1)} dB`; },
    tiles(l, r) { return [['지연 범위 / Δτ', `${f2(r.range / 1000, 2)}<small>ns</small> / ${f2(r.step, 1)}<small>ps</small>`], ['최대 · 변동 손실', `${f2(r.ilMax, 1)}<small>dB</small> · ${f2(r.dil, 1)}<small>dB</small>`], ['에코', `${f2(r.echo, 1)}<small>dB</small>`], ['면적 · 히터', `${mm2(r.size)}<small>mm²</small> · ${Math.round(r.pw)}<small>mW</small>`]]; },
    hint(l, r) {
      const need = Math.ceil(Math.log2(l.s1.range / Math.min(r.step, l.s1.step) + 1));
      return `범위 = (2<sup>N</sup> − 1)·Δτ. Δτ ${f2(Math.min(r.step, l.s1.step), 1)} ps로 ${l.s1.range / 1000} ns를 덮으려면 N ≥ ${need}`
        + `<br>가장 긴 나선이 전체 길이의 절반: 총 나선 ${f2(r.stages.reduce((a, s) => a + s.Lcm, 0), 1)} cm → 모두 켠 경로와 모두 끈 경로의 손실 차 = 상태 간 변동`
        + `<br>좁은 단일모드 암은 ∂n<sub>eff</sub>/∂w = ${f2(r.xa.dndw, 3)} /µm로 CD 요동에 민감합니다. 넓은 암은 오차가 작아 보정 전력과 누설(에코)이 함께 줄어듭니다`;
    },
    draw(cv, l, r, ui) {
      const ctx = cv.getContext('2d'), W = cv.width, H = cv.height, pad = 10 * DPR, narrow = W / DPR < 520, N = r.N;
      ctx.fillStyle = '#0b1220'; ctx.fillRect(0, 0, W, H);
      const x0 = pad + 8 * DPR, x1 = W - pad - 8 * DPR, yc = H * 0.5, step = (x1 - x0) / (N + 0.5), sw = Math.min(step * 0.42, 34 * DPR);
      ctx.font = `${9.5 * DPR}px "IBM Plex Mono", monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const maxR = Math.sqrt(r.stages[N - 1].area);
      for (let i = 0; i <= N; i++) {
        const x = x0 + i * step;
        ctx.strokeStyle = r.echo <= l.s2.echo ? '#64c9df' : '#f2b04a'; ctx.lineWidth = 1.4 * DPR; ctx.strokeRect(x, yc - 10 * DPR, sw, 20 * DPR);
        if (!narrow || i === 0 || i === N) { ctx.fillStyle = '#64c9df'; ctx.fillText('MZS', x + sw / 2, yc); }
        if (i < N) {
          const s = r.stages[i], rad = Math.max(3 * DPR, Math.min(step * 0.45, (H * 0.36) * Math.sqrt(s.area) / maxR)), cxs = x + sw + (step - sw) / 2;
          ctx.strokeStyle = 'rgba(158,171,189,0.6)'; ctx.beginPath(); ctx.moveTo(x + sw, yc - 6 * DPR); ctx.lineTo(x + step, yc - 6 * DPR); ctx.stroke();
          ctx.strokeStyle = '#f6c35a'; ctx.beginPath(); ctx.moveTo(x + sw, yc + 6 * DPR); ctx.lineTo(cxs, yc + 6 * DPR + rad * 0.2); ctx.lineTo(x + step, yc + 6 * DPR); ctx.stroke();
          ctx.beginPath(); ctx.arc(cxs, yc + 6 * DPR + rad * 0.2 + rad, rad, 0, 2 * Math.PI); ctx.stroke();
          if (!narrow || i === N - 1) { ctx.fillStyle = 'rgba(231,236,243,0.85)'; ctx.fillText(s.tau >= 1000 ? `${f2(s.tau / 1000, 2)} ns` : `${f2(s.tau, s.tau < 10 ? 1 : 0)} ps`, cxs, yc - 20 * DPR); }
        }
      }
      cvPill(ctx, `${N}-bit · Δτ ${f2(r.step, 1)} ps · 0–${f2(r.range / 1000, 2)} ns`, pad, pad + 4 * DPR, 'left', r.range >= l.s1.range && r.step <= l.s1.step ? '#5dd193' : '#f2b04a');
      cvPill(ctx, `손실 ${f2(r.ilMin, 1)}–${f2(r.ilMax, 1)} dB · 에코 ${f2(r.echo, 0)} dB`, pad, H - pad - 12 * DPR, 'left');
      if (!narrow) cvPill(ctx, `${mm2(r.size)} mm² · 히터 ${Math.round(r.pw)} mW`, W - pad, pad + 4 * DPR, 'right');
    },
    chartTitle: () => '설정 지연에 따른 경로 손실 — 지금 플랫폼(실선) vs 다른 코어 물질(점선, 그 플랫폼의 기준 나선)',
    chart(l, r) {
      const d = r.d, S = KINDS.spiral._x, op = S.other(l.pf), oref = ((PSPEC[op.id] || {})['D-1'] || {}).ref;
      const curve = (pf, sp) => { const pts = [], n = Math.pow(2, d.N), stp = Math.max(1, Math.floor(n / 64)), per = []; for (let k = 0; k < d.N; k++) per.push(S.build(pf, sp, d.dt * Math.pow(2, k) / 1000).IL); for (let s = 0; s < n; s += stp) { let il = r.ilMin; for (let k = 0; k < d.N; k++) if (s >> k & 1) il += per[k]; pts.push([s * d.dt / 1000, il]); } return pts; };
      const a = curve(l.pf, r.p.sp), b = oref ? curve(op, oref) : [];
      const ymax = Math.ceil(Math.max(...a.map((p) => p[1]), ...b.map((p) => p[1]), 1)), xmax = Math.max(r.range / 1000, 0.01);
      const html = svgChart({ x0: 0, x1: xmax, y0: 0, y1: ymax, aria: '지연별 손실', xticks: [0, xmax / 2, xmax].map((v) => +v.toFixed(2)), yticks: [0, Math.round(ymax / 2), ymax], ylab: 'dB', xlab: '지연 ns',
        series: [{ pts: a, color: l.pf.mat === 'si' ? 'var(--amber)' : 'var(--cyan)', width: 2 }].concat(b.length ? [{ pts: b, color: l.pf.mat === 'si' ? 'var(--cyan)' : 'var(--amber)', width: 1.4, dash: '5 4' }] : []) });
      return { html, legend: legendHTML([[l.pf.mat === 'si' ? 'var(--amber)' : 'var(--cyan)', `${l.pf.mat === 'si' ? 'Si' : 'SiN'} (지금)`], [l.pf.mat === 'si' ? 'var(--cyan)' : 'var(--amber)', `${op.mat === 'si' ? 'Si' : 'SiN'} 기준 나선, 같은 N·Δτ`]]) };
    },
    coach(l, r, c) {
      const t = c.tier, d = r.d, q1 = (x) => r1(l, x), q2s = (x) => keepStar(r1(l, x), Math.max(r2(l, x), x.size / l.s2.size));
      const pick = (q, ks) => lineBestOf(K, l, d, ks, q, 24) || pairBest(K, l, d, ['N', 'dt'], q, 12) || pairBest(K, l, d, ['dt', 'wa'], q, 10) || randomBest(K, l, d, ['N', 'dt', 'wa'], q, 200);
      const txt = (b) => (!b ? '' : b.ps ? recText2(b, t, d) : recText(b, t, d));
      if (!c.ob1) {
        if (r.step > l.s1.step || r.range < l.s1.range) { const b = pairBest(K, l, d, ['N', 'dt'], q1, 16) || pick(q1, ['N', 'dt']); if (b) return { h: '지연 범위와 분해능을 함께 맞추세요', b: `가장 짧은 나선이 분해능 Δτ, 비트 수 N이 범위 (2<sup>N</sup>−1)·Δτ를 정합니다. 비트를 하나 늘릴 때마다 가장 긴 나선이 두 배가 되므로 손실·면적도 거의 두 배가 됩니다.` + txt(b) }; }
        if (r.ilMax > l.s1.il) { const b = pick(q1, ['N', 'dt', 'wa']); return { h: '가장 긴 경로의 손실이 큽니다', b: `모든 비트를 켠 경로는 나선 총 ${f2(r.stages.reduce((a, s) => a + s.Lcm, 0), 1)} cm를 지납니다. 나선 자체의 dB/cm를 낮추려면 D-1에서 더 넓고 매끄러운 나선을 만들어 카드로 쓰세요.` + txt(b) }; }
        return null;
      }
      if (!c.ob2) {
        if (r.echo > l.s2.echo || r.pw > l.s2.pw) { const b = pick(q2s, ['wa']); if (b) return { h: r.echo > l.s2.echo ? '★★: 스위치 누설이 지연 에코를 만듭니다' : '★★: 히터 전력이 큽니다', b: `좁은 암의 MZ 스위치는 CD 요동으로 위상 오차가 커서(σφ ${f2(r.sphi, 2)} rad) 보정 전력이 들고 잔차가 누설로 남습니다. Xie 2023처럼 암을 2 µm로 넓히면 Q₀/Q<sub>π</sub> < 0.05가 됩니다.` + txt(b) }; }
        const b = pick(q2s, ['N', 'dt', 'wa']); if (b) return { h: r.size > l.s2.size ? '★★: 칩 면적이 큽니다' : '★★: 상태 간 손실 변동이 큽니다', b: '변동 손실은 나선 총 길이 × dB/cm입니다. 같은 범위를 덮는 가장 작은 N·Δτ 조합을 고르고, 나선 카드를 개선하세요.' + txt(b) };
      }
      return null;
    },
    card(l, r) { return { kind: 'ttd', lines: [`${r.N}-bit · ${f2(r.step, 1)} ps · ${f2(r.range / 1000, 2)} ns`, `손실 ${f2(r.ilMin, 1)}–${f2(r.ilMax, 1)} dB · 에코 ${f2(r.echo, 0)} dB`], model: { N: r.N, dt: r.step, range: r.range, ilMin: +r.ilMin.toFixed(2), ilMax: +r.ilMax.toFixed(2), echo: +r.echo.toFixed(1) } }; },
    aiStarts: (l) => [l.start, { ...l.start, N: 9, dt: 10, wa: l.pf.mat === 'si' ? 2 : 2.4 }],
    _x: { analyse }
  };
  return K;
})();
