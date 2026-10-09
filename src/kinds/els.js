// ===== Kind: external light source (CW DFB) + per-lane link budget =====
// Budget per lane: laser → chip coupling (SSC, facet angle, optional isolator) → 1:N split (MMI tree)
// → MZM (OMA conversion & eye penalty) → mux → SSC → channel → SSC → demux → PD sensitivity.
// Every block comes from a part card (or the reference design of that level).
// Optical feedback: Fresnel reflection of the coupling facet, reduced by the facet angle (Gaussian-beam overlap)
// and by the isolator, seen by the laser after the round-trip coupling loss → RIN / coherence-collapse penalty.
// Laser efficiency: WPE rolls off with output power (thermal) → electrical laser power per lane → pJ/bit.
KINDS.els = (() => {
  const NS = [1, 2, 4, 8], RF = 10 * Math.log10(Math.pow(0.45 / 2.45, 2)), W0 = 1.5, NOX = 1.45, ISO = 25, ISO_IL = 1.0, POH = 60, RINT = -40, CH_IL = 4.0, RATE = 200;
  const gaussLike = (proc, k) => gaussR(mulberry((proc.seed || 1) * 19 + k * 401));
  const cards = () => (typeof window !== 'undefined' ? window.GAME_CARDS : global.GAME_CARDS) || {};
  const P = [
    { k: 'P', label: '레이저 출력', sym: 'P<sub>las</sub>', min: 8, max: 20, step: 0.5, dec: 1, unit: 'dBm' },
    { k: 'ns', label: '레이저 하나가 맡는 레인 수', sym: 'N', min: 0, max: 3, step: 1, dec: 0, unit: '', labels: NS.map((n) => n + '레인') },
    { k: 'iso', label: '광 아이솔레이터', sym: 'iso', min: 0, max: 1, step: 1, dec: 0, unit: '', labels: ['없음', '있음'] },
    { k: 'th', label: '결합면 경사각', sym: 'θ', min: 0, max: 12, step: 0.5, dec: 1, unit: '°' }
  ];
  function parts(l, d) {
    const c = cards(), ref = l.parts, use = !!d.useCard, src = [];
    const pick = (id, f, rv) => { if (use && c[id] && c[id].model) { src.push(id); return f(c[id].model); } return rv; };
    return {
      ssc: pick('1-6', (m) => m.loss, ref.ssc), split: pick('1-3', (m) => Math.max(...m.el), ref.split),
      gain: pick('2-3', (m) => m.gain, ref.gain), pen: pick('2-3', (m) => m.pen, ref.pen), mux: pick('1-7', (m) => Math.max(...m.il), ref.mux),
      sens: pick('2-4', (m) => m.sens, ref.sens), src: [...new Set(src)]
    };
  }
  function analyse(l, d, proc) {
    const g = (k) => (proc ? gaussLike(proc, k) : 0), p = parts(l, d), N = NS[d.ns | 0], si = l.pf.mat === 'si';
    const Pl = d.P - 0.3 * Math.abs(g(1)) - 0.2, cpl = p.ssc + 0.003 * d.th * d.th + (d.iso ? ISO_IL : 0) + 0.4 * g(2);
    const Pchip = Pl - cpl, tpa = si ? 0.6 * Math.pow(Math.pow(10, Pchip / 10) / 100, 2) : 0;
    const split = 10 * Math.log10(N) + p.split * Math.log2(N), Pmod = Pchip - tpa - split;
    const oma = Pmod + p.gain - p.mux - p.ssc, chan = CH_IL + (l.pf.lam > 1.4 ? 1.0 : 0.3);
    const rx = oma - chan - p.ssc - p.mux;
    const th = d.th * Math.PI / 180, ovl = 10 * Math.log10(Math.exp(-Math.pow(2 * Math.PI * NOX * W0 * th / l.pf.lam, 2)));
    const facet = RF + ovl, back = 10 * Math.log10(Math.pow(10, facet / 10) + Math.pow(10, RINT / 10)) + 2 * g(3);
    const fb = back - 2 * cpl - (d.iso ? 2 * ISO : 0);
    const rin = 2.5 / (1 + Math.exp(-(fb + 32) / 2));
    const sens = p.sens + 0.3 * g(4), margin = rx - p.pen - rin - sens;
    const Pmw = Math.pow(10, d.P / 10), wpe = 0.22 * Math.max(0.05, 1 - Pmw / 200), Pel = Pmw / wpe + POH, lane = Pel / N, pj = lane * 1e-3 / (RATE * 1e9) * 1e12;
    return { N, Pchip, tpa, split, Pmod, oma, rx, chan, facet, fb, rin, sens, margin, wpe, Pel, lane, pj, cpl, p, size: 1 };
  }
  const r1 = (l, r) => Math.max(1 + (l.s1.margin - r.margin) / 3, 1 + (r.fb - l.s1.fb) / 10);
  const r2 = (l, r) => Math.max(1 + (l.s2.margin - r.margin) / 3, r.pj / l.s2.pj, 1 + (r.fb - l.s2.fb) / 10);
  const K = {
    title: 'ELS & link budget', aspect: 0.5, noSize: true, sizeLabel: '—', sizeUnit: '', primaryLabel: '링크 마진 dB', cheap: true,
    params: () => P, landKeys: () => ['P', 'th'], violation: () => 0,
    toggles: () => [{ k: 'useCard', label: '내 부품 카드(1-3·1-6·1-7·2-3·2-4)로 링크 구성', needs: '2-3' }],
    evaluate(l, d, proc) { const a = analyse(l, d, proc); return { d: { ...d }, ...a, drc: [], primary: a.margin, secondary: a.pj }; },
    perf(l, r) { return 250 * clamp((r.margin + 2) / 6, 0, 1) + 250 * clamp((-r.fb - 20) / 25, 0, 1); },
    comp(l, r) { return 300 * clamp(l.s2.pj / r.pj, 0, 1); },
    q1: r1, q2: r2,
    objectives(l, r) {
      return {
        t1: [{ k: `링크 마진 ≥ ${f2(l.s1.margin, 1)} dB`, v: f2(r.margin, 2) + ' dB', ok: r.margin >= l.s1.margin }, { k: `레이저로 돌아오는 반사 ≤ ${l.s1.fb} dB`, v: f2(r.fb, 1) + ' dB', ok: r.fb <= l.s1.fb }],
        t2: [{ k: `링크 마진 ≥ ${f2(l.s2.margin, 1)} dB`, v: f2(r.margin, 2) + ' dB', ok: r.margin >= l.s2.margin }, { k: `레이저 전력 ≤ ${fmtT(l.s2.pj)} pJ/bit`, v: f2(r.pj, 3) + ' pJ/bit', ok: r.pj <= l.s2.pj }, { k: `반사 ≤ ${l.s2.fb} dB (안정 영역)`, v: f2(r.fb, 1) + ' dB', ok: r.fb <= l.s2.fb }]
      };
    },
    fabPass: (l, r) => r.margin >= l.fab.margin && r.fb <= l.s1.fb,
    fabCrit: (l) => `링크 마진 ≥ ${f2(l.fab.margin, 1)} dB · 반사 ≤ ${l.s1.fb} dB (레이저 노화 −0.2~−0.5 dB, 결합 ±0.4 dB, 반사 ±2 dB, 감도 ±0.3 dB)`,
    meta(l, r) { const p = r.p; return `${p.src.length ? '내 카드: ' + p.src.join(', ') + ' · 나머지 기준 설계' : '기준 설계 부품'} · ${RATE}G/lane · 채널 ${CH_IL} dB + ${l.pf.lam > 1.4 ? '분산 1.0 dB (C-band, 단거리 가정)' : '분산 0.3 dB'}<br>DFB WPE 22%·(1 − P/200 mW) + 레이저당 구동·제어 ${POH} mW · 아이솔레이터 ${ISO} dB / IL ${ISO_IL} dB · 파셋 Fresnel ${f2(RF, 1)} dB${l.pf.mat === 'si' ? ' · Si TPA 포함' : ''}`; },
    tiles(l, r) { return [['링크 마진', `${f2(r.margin, 2)}<small>dB</small>`], ['레이저 반사', `${f2(r.fb, 1)}<small>dB</small>`], ['전력 / 레인', `${Math.round(r.lane)}<small>mW</small> · ${f2(r.pj, 2)}<small>pJ/b</small>`], ['변조기 입력', `${f2(r.Pmod, 1)}<small>dBm</small>`]]; },
    hint(l, r) { return `마진 = 수신 OMA − (변조기 페널티 + 반사 RIN 페널티) − PD 감도<br>레이저 하나를 N레인이 나눠 쓰면 레인당 전력은 1/N이지만 분기 손실 10log₁₀N이 붙고, 출력을 올리면 WPE가 떨어집니다 (지금 ${Math.round(r.wpe * 100)}%)<br>반사: 파셋 경사 θ는 반사광이 도파로 모드로 돌아오는 양을 가우시안 overlap으로 줄이고(지금 파셋 ${f2(r.facet, 1)} dB), 아이솔레이터는 ${ISO} dB를 막는 대신 ${ISO_IL} dB 손실과 부품이 추가됩니다`; },
    draw(cv, l, r, ui) {
      const ctx = cv.getContext('2d'), W = cv.width, H = cv.height, pad = 12 * DPR, p = r.p, narrow = W / DPR < 520;
      ctx.fillStyle = '#0b1220'; ctx.fillRect(0, 0, W, H);
      const lb = narrow ? ['LD', '칩', '분기', 'OMA', '출력', '채널', 'PD', '필요'] : ['레이저', '칩 입력', `1:${r.N} 분기`, 'MZM OMA', '칩 출력', '채널 후', 'PD 앞', '필요'];
      const steps = [r.Pchip + r.cpl, r.Pchip, r.Pmod, r.Pmod + p.gain, r.oma, r.oma - r.chan, r.rx, r.sens + p.pen + r.rin].map((v, i) => [lb[i], v]);
      const vmax = Math.ceil(Math.max(...steps.map((s) => s[1])) + 1), vmin = Math.floor(Math.min(...steps.map((s) => s[1])) - 1);
      const x0 = pad + 34 * DPR, x1 = W - pad, y0 = pad + 22 * DPR, y1 = H - pad - 26 * DPR, X = (i) => x0 + (i + 0.5) * (x1 - x0) / steps.length, Y = (v) => y0 + (vmax - v) / (vmax - vmin) * (y1 - y0);
      ctx.font = `${10 * DPR}px "IBM Plex Mono", monospace`; ctx.textBaseline = 'middle';
      for (let v = vmin; v <= vmax; v += Math.max(1, Math.round((vmax - vmin) / 6))) { ctx.strokeStyle = 'rgba(158,171,189,0.15)'; ctx.beginPath(); ctx.moveTo(x0, Y(v)); ctx.lineTo(x1, Y(v)); ctx.stroke(); ctx.fillStyle = 'rgba(158,171,189,0.9)'; ctx.textAlign = 'right'; ctx.fillText(v + '', x0 - 4 * DPR, Y(v)); }
      ctx.strokeStyle = '#f6c35a'; ctx.lineWidth = 2.2 * DPR; ctx.beginPath(); steps.slice(0, 7).forEach((s, i) => (i ? ctx.lineTo(X(i), Y(s[1])) : ctx.moveTo(X(i), Y(s[1])))); ctx.stroke();
      steps.forEach((s, i) => { ctx.fillStyle = i === 7 ? '#ff8d9c' : '#f6c35a'; ctx.beginPath(); ctx.arc(X(i), Y(s[1]), 3.5 * DPR, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(158,171,189,0.95)'; ctx.textAlign = 'center'; ctx.fillText(s[0], X(i), y1 + 14 * DPR); });
      ctx.strokeStyle = r.margin >= 0 ? '#5dd193' : '#ff6b6b'; ctx.setLineDash([4 * DPR, 3 * DPR]); ctx.beginPath(); ctx.moveTo(X(6), Y(r.rx)); ctx.lineTo(X(7), Y(steps[7][1])); ctx.stroke(); ctx.setLineDash([]);
      cvPill(ctx, `마진 ${r.margin >= 0 ? '+' : ''}${r.margin.toFixed(2)} dB · 반사 ${r.fb.toFixed(1)} dB`, pad, pad + 4 * DPR, 'left', r.margin >= 0 ? '#5dd193' : '#ff6b6b');
      if (!narrow) cvPill(ctx, 'dBm (OMA는 변조 이후)', W - pad, pad + 4 * DPR, 'right');
    },
    chartTitle: () => '레이저 출력에 따른 링크 마진과 레인당 전력',
    chart(l, r) {
      const d = r.d, m = [], e = [], pjs = [];
      for (let P2 = 8; P2 <= 20.001; P2 += 0.5) { const a = analyse(l, { ...d, P: P2 }); m.push([P2, a.margin]); pjs.push(a.pj); }
      const pmax = Math.max(...pjs), y0 = Math.floor(Math.min(...m.map((x) => x[1]), -2)), y1 = Math.ceil(Math.max(...m.map((x) => x[1]), 4));
      m.forEach((x, i) => e.push([x[0], y0 + (pjs[i] / pmax) * (y1 - y0)]));
      const html = svgChart({ x0: 8, x1: 20, y0, y1, aria: '마진 vs 레이저 출력', xticks: [8, 10, 12, 14, 16, 18, 20], yticks: [y0, 0, y1], ylab: 'dB', xlab: 'P_las dBm',
        vlines: [{ x: d.P, color: 'rgba(231,236,243,.7)' }], hlines: [{ y: l.s2.margin, label: `★★ ${f2(l.s2.margin, 1)} dB` }],
        series: [{ pts: m, color: 'var(--amber)', width: 2.4 }, { pts: e, color: 'var(--cyan)', width: 1.6, dash: '5 4' }] });
      return { html, legend: legendHTML([['var(--amber)', '링크 마진'], ['var(--cyan)', `pJ/bit (최대 ${f2(pmax, 2)}로 정규화)`]]) };
    },
    coach(l, r, c) {
      const t = c.tier, d = r.d, q1 = (x) => r1(l, x), q2 = (x) => r2(l, x);
      if (!c.ob1) {
        if (r.fb > l.s1.fb) { const b = lineBestOf(K, l, d, ['th', 'iso'], q1); if (b) return { h: '레이저가 반사광에 흔들립니다', b: `칩 결합면에서 반사된 빛(${f2(r.fb, 1)} dB)이 레이저 공진기로 돌아가면 선폭이 넓어지고 RIN이 커집니다(코히어런스 붕괴). 결합면을 기울이거나 아이솔레이터를 넣으세요.` + recText(b, t, d) }; }
        if (r.margin < l.s1.margin) { const b = lineBestOf(K, l, d, ['P', 'ns'], q1); if (b) return { h: '수신 광이 감도에 못 미칩니다', b: '링크 버짓의 가장 큰 항목은 분기 손실(10log₁₀N), 변조기 OMA 변환, SSC 네 번, 채널입니다. 레이저 출력을 올리거나 레이저 하나가 맡는 레인 수를 줄이세요.' + recText(b, t, d) }; }
        return null;
      }
      if (!c.ob2) {
        const b = lineBestOf(K, l, d, ['ns', 'P', 'th', 'iso'], q2);
        if (b) return { h: r.pj > l.s2.pj ? '★★: 레이저 전력이 큽니다' : r.fb > l.s2.fb ? '★★: 반사 여유가 부족합니다' : '★★: 링크 마진이 부족합니다', b: (r.pj > l.s2.pj ? `WPE가 출력에 따라 떨어지므로(지금 ${Math.round(r.wpe * 100)}%) 고출력 레이저 하나보다 적당한 출력으로 여러 레인을 나누는 것이 유리할 때가 있습니다. 반대로 너무 많이 나누면 마진이 사라집니다.` : '여러 손잡이 사이의 균형점을 찾으세요.') + recText(b, t, d) };
      }
      return null;
    },
    card(l, r) { return { kind: 'els', lines: [`${f2(r.d.P, 1)} dBm × 1:${r.N} · 마진 ${f2(r.margin, 1)} dB`, `${f2(r.pj, 2)} pJ/bit · 반사 ${f2(r.fb, 0)} dB`], model: { P: r.d.P, N: r.N, margin: +r.margin.toFixed(2), pj: +r.pj.toFixed(3), fb: +r.fb.toFixed(1) } }; },
    aiStarts: (l) => [l.start, { ...l.start, P: 16, ns: 1, th: 8 }],
    _x: { analyse, parts }
  };
  return K;
})();
