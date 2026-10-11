// ===== Kind: switch-based focal-plane beam steering (Track B-2) =====
// A 1×N binary tree of 2×2 MZ switches feeds one of N grating emitters on a line in the focal plane of a lens.
// Emitter i at x_i maps to angle atan(x_i/f).  Gaussian emitter (1/e² radius w_e) → collimated beam w_b = λf/(πw_e),
// far-field half-angle w_e/f.  Coverage: beam FWHM angle 1.18·w_e/f vs angular pitch p/f.
// Switches: thermo-optic (2-1 heater: P_π, τ) or carrier-injection PIN (ns, but free-carrier loss and lower extinction).
// Point rate: one point per up+down chirp (2T from the B-1 card) plus the switch settling time.
KINDS.fpsa = (() => {
  const SW = [
    { name: '열광학 MZI (2-1 히터)', il: 0.3, er: -27, settle: null, pw: null },
    { name: 'PIN 주입형 MZI', il: 0.9, er: -19, settle: 0.02, pw: 12 }
  ];
  const cards = () => (typeof window !== 'undefined' ? window.GAME_CARDS : global.GAME_CARDS) || {};
  const PR = () => [
    { k: 'k', label: '스위치 트리 단 수 (N = 2^k 방출기)', sym: 'k', min: 3, max: 9, step: 1, dec: 0, unit: '단' },
    { k: 'p', label: '방출기 간격', sym: 'p', min: 4, max: 80, step: 0.5, dec: 1, unit: 'µm' },
    { k: 'f', label: '렌즈 초점거리', sym: 'f', min: 1, max: 30, step: 0.1, dec: 1, unit: 'mm' },
    { k: 'we', label: '그레이팅 방출 모드 반경', sym: 'w<sub>e</sub>', min: 1, max: 20, step: 0.1, dec: 1, unit: 'µm' },
    { k: 'sw', label: '스위치 종류', sym: 'SW', min: 0, max: 1, step: 1, dec: 0, unit: '', labels: SW.map((s) => s.name) }
  ];
  function parts(l, d) {
    const c = cards(), use = !!d.useCard, src = [];
    const to = use && c['2-1'] && c['2-1'].model ? (src.push('2-1'), c['2-1'].model) : l.parts.to;
    const T = use && c['B-1'] && c['B-1'].model ? (src.push('B-1'), c['B-1'].model.T) : l.parts.T;
    return { to, T, src };
  }
  function analyse(l, d, proc) {
    const pf = l.pf, lam = pf.lam * 1e-6, p = parts(l, d), S = SW[d.sw | 0], N = Math.pow(2, d.k | 0), g = (k) => (proc && proc.seed != null ? gaussR(mulberry(proc.seed * 41 + k * 97)) : 0);
    const f = d.f * 1e-3, pitch = d.p * 1e-6, we = d.we * 1e-6;
    const dth = pitch / f, fov = 2 * Math.atan(N * pitch / (2 * f)), fwhm = 1.177 * we / f, res = Math.max(dth, fwhm), fill = fwhm / dth;
    const wb = lam * f / (Math.PI * we), D = 3 * wb, NA = D / (2 * f);
    const lens = 0.2 + (NA > 0.25 ? 3 * (NA - 0.25) / 0.1 : 0) + 0.15 * Math.pow(Math.tan(fov / 2) / 0.5, 2);   // AR + clipping/aberration + edge-field roll-off
    const grat = 2.0 + 0.15 * Math.pow(3 / d.we, 2);
    const xr = KINDS.spiral._x.xs(pf, pf.mat === 'si' ? 2.0 : 2.4), route = (N * d.p / 2 + (d.k | 0) * 200) * 1e-4 * xr.alpha;
    const ilsw = S.il * (1 + 0.1 * g(1)), il = (d.k | 0) * ilsw + grat + lens + route;
    const ghost = S.er + 2 * g(2) + 10 * Math.log10(1 + (d.k | 0) * 0.15);
    const settle = S.settle != null ? S.settle : 3 * p.to.tau;   // µs to 95 %
    const pw = (d.k | 0) * (S.pw != null ? S.pw : p.to.Ppi);       // mW, worst case: every switch on the path driven
    const pr = 1 / (2 * p.T + settle) * 1e3;                      // kpts/s per beam
    const chip = N * d.p / 1000;                                  // mm
    return { N, dth, fov, fwhm, res, fill, wb, D, NA, lens, grat, route, ilsw, il, ghost, settle, pw, pr, chip, size: N * d.p, S, p, deg: (x) => x * 180 / Math.PI };
  }
  const deg = (x) => x * 180 / Math.PI;
  const r1 = (l, r) => Math.max(l.s1.fov / deg(r.fov), deg(r.res) / l.s1.res, r.il / l.s1.il);
  const r2 = (l, r) => Math.max(l.s2.fmin / r.fill, r.fill / l.s2.fmax, 1 + (r.ghost - l.s2.ghost) / 20);
  const K = {
    title: 'Switch beam scanner', aspect: 0.52, sizeLabel: '방출기 열 길이', sizeUnit: 'mm', sizeFmt: (v) => (v / 1000).toFixed(2), primaryLabel: '편도 손실 dB', cheap: true,
    params: () => PR(), landKeys: () => ['p', 'f', 'we'], violation: () => 0,
    toggles: () => [{ k: 'useCard', label: '내 2-1 히터 · B-1 처프 카드 사용', needs: 'B-1' }],
    evaluate(l, d, proc) { const a = analyse(l, d, proc); return { d: { ...d }, ...a, drc: [], primary: a.il, secondary: deg(a.fov) }; },
    perf(l, r) { return 200 * clamp(deg(r.fov) / l.s1.fov, 0, 1) + 150 * clamp(l.s1.res / deg(r.res), 0, 1) + 150 * clamp(1 - r.il / 15, 0, 1); },
    q1: r1, q2: r2,
    objectives(l, r) {
      return {
        t1: [{ k: `시야각 FOV ≥ ${fmtT(l.s1.fov)}°`, v: f2(deg(r.fov), 1) + '°', ok: deg(r.fov) >= l.s1.fov }, { k: `각 분해능 ≤ ${fmtT(l.s1.res)}°`, v: f2(deg(r.res), 3) + '°', ok: deg(r.res) <= l.s1.res },
          { k: `편도 삽입 손실 ≤ ${fmtT(l.s1.il)} dB`, v: f2(r.il, 2) + ' dB', ok: r.il <= l.s1.il }],
        t2: [{ k: `빈틈 없는 커버리지 ${l.s2.fmin} ≤ FWHM/간격 ≤ ${l.s2.fmax}`, v: f2(r.fill, 2), ok: r.fill >= l.s2.fmin && r.fill <= l.s2.fmax }, { k: `유령 빔(스위치 누설) ≤ ${l.s2.ghost} dB`, v: f2(r.ghost, 1) + ' dB', ok: r.ghost <= l.s2.ghost }]
      };
    },
    fabPass: (l, r) => r1(l, r) <= 1 && r.ghost <= l.fab.ghost,
    fabCrit: (l) => `★ 조건 + 유령 빔 ≤ ${l.fab.ghost} dB (스위치 손실 ±10%, 소광비 산포 σ 2 dB)`,
    meta(l, r) { return `${r.S.name} ×${r.d.k} 단 · ${r.p.src.length ? '내 카드: ' + r.p.src.join(', ') : '기준 2-1 히터 · 기준 B-1 처프'} (램프 ${f2(r.p.T, 1)} µs, ${r.S.settle != null ? '전환 ' + r.S.settle * 1000 + ' ns' : 'τ ' + f2(r.p.to.tau, 1) + ' µs → 정착 ' + f2(r.settle, 0) + ' µs'})<br>렌즈 뒤 빔 반경 w<sub>b</sub> = λf/(πw<sub>e</sub>) = ${f2(r.wb * 1e3, 2)} mm · 개구 ${f2(r.D * 1e3, 1)} mm · NA ${f2(r.NA, 2)}`; },
    tiles(l, r) { return [['FOV · 방출기', `${f2(deg(r.fov), 1)}<small>°</small> · ${r.N}<small>개</small>`], ['각 분해능', `${f2(deg(r.res), 3)}<small>°</small>`], ['편도 손실 · 유령', `${f2(r.il, 1)}<small>dB</small> · ${Math.round(r.ghost)}<small>dB</small>`], ['점 속도 · 빔 Ø', `${f2(r.pr, 1)}<small>k/s</small> · ${f2(2 * r.wb * 1e3, 2)}<small>mm</small>`]]; },
    hint(l, r) {
      return `각 간격 p/f = ${f2(deg(r.dth), 3)}°, 빔 폭(FWHM) 1.18·w<sub>e</sub>/f = ${f2(deg(r.fwhm), 3)}° → 비 ${f2(r.fill, 2)} (1보다 작으면 빈틈, 크면 이웃 빔과 겹침)`
        + `<br>FOV ≈ N·p/f. 분해능이 정해지면 FOV/분해능 = N이 정해지고, 비트 수 k = log₂N만큼 스위치를 지납니다 (모노스태틱이면 왕복 2번)`
        + `<br>손실 분해: 스위치 ${f2((r.d.k | 0) * r.ilsw, 2)} · 그레이팅 ${f2(r.grat, 2)} · 렌즈 ${f2(r.lens, 2)} · 배선 ${f2(r.route, 2)} dB`;
    },
    draw(cv, l, r, ui) {
      const ctx = cv.getContext('2d'), W = cv.width, H = cv.height, pad = 10 * DPR, d = r.d, narrow = W / DPR < 520;
      ctx.fillStyle = '#0b1220'; ctx.fillRect(0, 0, W, H);
      const cy = H / 2, xc = pad + 30 * DPR, xl = xc + Math.min(W * 0.3, 160 * DPR), half = H * 0.38, nShow = Math.min(r.N, 17);
      // emitter column (chip) and lens
      ctx.fillStyle = 'rgba(160,170,190,0.25)'; ctx.fillRect(xc - 10 * DPR, cy - half, 10 * DPR, 2 * half);
      ctx.strokeStyle = '#8fb3ff'; ctx.lineWidth = 2 * DPR; ctx.beginPath(); ctx.ellipse(xl, cy, 6 * DPR, Math.min(half, 30 * DPR + r.D * 1e3 * 4 * DPR), 0, 0, 2 * Math.PI); ctx.stroke();
      const sel = Math.floor(nShow * 0.7);
      for (let i = 0; i < nShow; i++) {
        const u = nShow > 1 ? i / (nShow - 1) - 0.5 : 0, y = cy + u * 2 * half * 0.9, ang = -Math.atan(u * r.N * d.p * 1e-3 / d.f) ;
        ctx.fillStyle = i === sel ? '#f6c35a' : 'rgba(231,236,243,0.6)'; ctx.fillRect(xc - 6 * DPR, y - 1.5 * DPR, 6 * DPR, 3 * DPR);
        const len = W - xl - pad, spread = Math.tan(r.fwhm / 2) * len;
        ctx.strokeStyle = i === sel ? 'rgba(246,195,90,0.9)' : 'rgba(100,201,223,0.18)'; ctx.lineWidth = (i === sel ? 2 : 1) * DPR;
        ctx.beginPath(); ctx.moveTo(xc, y); ctx.lineTo(xl, cy); ctx.lineTo(xl + len, cy + Math.tan(ang) * len); ctx.stroke();
        if (i === sel) { ctx.fillStyle = 'rgba(246,195,90,0.15)'; ctx.beginPath(); ctx.moveTo(xl, cy); ctx.lineTo(xl + len, cy + Math.tan(ang) * len - spread * 3); ctx.lineTo(xl + len, cy + Math.tan(ang) * len + spread * 3); ctx.closePath(); ctx.fill(); }
      }
      cvPill(ctx, `${r.N}개 방출기 · ${f2(r.chip, 2)} mm · 1×${r.N} 스위치 트리 (그림은 ${nShow}개만)`, pad, pad + 4 * DPR, 'left', '#f6c35a');
      cvPill(ctx, `FOV ${f2(deg(r.fov), 1)}° · 분해능 ${f2(deg(r.res), 3)}°`, W - pad, pad + 4 * DPR, 'right', r1(l, r) <= 1 ? '#5dd193' : '#f2b04a');
      if (!narrow) cvPill(ctx, `f ${f2(d.f, 1)} mm · 빔 Ø ${f2(2 * r.wb * 1e3, 2)} mm`, xl, H - pad - 12 * DPR, 'center', '#8fb3ff');
    },
    chartTitle: () => '각도별 커버리지 — 이웃 빔들의 원거리 세기 합 (가운데 8개)',
    chart(l, r) {
      const dth = deg(r.dth), sig = deg(r.fwhm) / 2.355, pts = [], single = [];
      for (let a = -5 * dth; a <= 5 * dth + 1e-12; a += dth / 30) { let s = 0; for (let i = -4; i <= 4; i++) s += Math.exp(-Math.pow(a - i * dth, 2) / (2 * sig * sig)); pts.push([a, s]); single.push([a, Math.exp(-a * a / (2 * sig * sig))]); }
      const ymax = Math.max(1.2, Math.ceil(Math.max(...pts.map((p) => p[1])) * 10) / 10);
      const html = svgChart({ x0: -5 * dth, x1: 5 * dth, y0: 0, y1: ymax, aria: '커버리지', xticks: [-4, -2, 0, 2, 4].map((v) => +(v * dth).toFixed(3)), yticks: [0, 0.5, 1], ylab: '세기', xlab: '각도 °',
        series: [{ pts, color: 'var(--amber)', width: 2.2 }, { pts: single, color: 'var(--cyan)', width: 1.4, dash: '5 4' }] });
      return { html, legend: legendHTML([['var(--amber)', `빔 합 (FWHM/간격 ${f2(r.fill, 2)})`], ['var(--cyan)', '빔 하나']]) };
    },
    coach(l, r, c) {
      const t = c.tier, d = r.d, q1 = (x) => r1(l, x), q2s = (x) => keepStar(r1(l, x), Math.max(r2(l, x), x.size / l.s2.size));
      const pick = (q, ks) => lineBestOf(K, l, d, ks, q, 24) || [['k', 'f'], ['p', 'we'], ['f', 'we'], ['k', 'p']].map((k2) => pairBest(K, l, d, k2, q, 12)).filter(Boolean).sort((a, b) => a.q - b.q)[0] || randomBest(K, l, d, ['k', 'p', 'f', 'we', 'sw'], q, 400);
      const txt = (b) => (!b ? '' : b.ps ? recText2(b, t, d) : recText(b, t, d));
      if (!c.ob1) {
        if (deg(r.res) > l.s1.res || deg(r.fov) < l.s1.fov) {
          // design recipe: N from FOV/resolution, pitch from resolution at the current focal length, mode from the coverage target
          const P = K.params(l), kN = clamp(Math.ceil(Math.log2(l.s1.fov / (l.s1.res * 0.9))), P[0].min, P[0].max), cands = [];
          for (const ff of [d.f, 5, 8, 10, 12, 15, 20]) { const pp = l.s1.res * 0.85 * Math.PI / 180 * ff * 1000; cands.push([kN, pp, ff, pp * 1.1 / 1.177]); }
          const rcp = bestOfCands(K, l, d, ['k', 'p', 'f', 'we'], cands, q1);
          if (rcp && t >= 2) return { h: deg(r.res) > l.s1.res ? '각 분해능이 부족합니다' : '시야각이 좁습니다', b: `설계 순서: ① N ≥ FOV/분해능 → k = ${kN} ② 각 간격 p/f ≈ 분해능 ③ 빈틈 없도록 w<sub>e</sub> ≈ p/1.18.` + recText2(rcp, t, d) };
        }
        if (deg(r.res) > l.s1.res) { const b = pick(q1, ['f', 'p', 'we']); if (b) return { h: '각 분해능이 부족합니다', b: `각 간격 p/f와 빔 퍼짐 w<sub>e</sub>/f 중 큰 쪽이 분해능입니다. 초점거리를 늘리면 둘 다 줄지만 FOV(≈N·p/f)도 줄어듭니다.` + txt(b) }; }
        if (deg(r.fov) < l.s1.fov) { const b = pick(q1, ['k', 'p', 'f']); if (b) return { h: '시야각이 좁습니다', b: `분해능을 유지한 채 FOV를 넓히려면 방출기 수 N = 2<sup>k</sup>를 늘려야 합니다 — 스위치 한 단마다 손실과 전력이 더해집니다.` + txt(b) }; }
        const b = pick(q1, ['sw', 'k', 'we', 'f']); if (b) return { h: '편도 손실이 큽니다', b: '스위치 단 수, 그레이팅 방출 효율, 렌즈 개구(NA)가 손실을 정합니다. 방출 모드가 너무 작으면 렌즈 NA가 커져 잘립니다.' + txt(b) };
        return null;
      }
      if (!c.ob2) {
        const b = pick(q2s, ['we', 'p', 'f', 'sw', 'k']); if (b) return { h: r.fill < l.s2.fmin ? '★★: 빔 사이에 빈틈이 있습니다' : r.fill > l.s2.fmax ? '★★: 이웃 빔과 많이 겹칩니다' : r.ghost > l.s2.ghost ? '★★: 유령 빔이 큽니다' : '★★: 방출기 열이 깁니다', b: (r.ghost > l.s2.ghost ? `스위치 누설이 엉뚱한 방출기로 새어 유령 빔(${f2(r.ghost, 1)} dB)을 만듭니다. PIN 주입형은 빠르지만 소광비가 낮습니다 — 속도 문제는 B-3에서 채널 병렬화로 풀 수도 있습니다.` : '방출 모드 반경 w<sub>e</sub>와 간격 p의 비가 커버리지를 정합니다(렌즈와 무관). 열 길이는 N·p입니다.') + txt(b) };
      }
      return null;
    },
    card(l, r) { return { kind: 'fpsa', lines: [`${r.N}점 · FOV ${f2(deg(r.fov), 1)}° · ${f2(deg(r.res), 3)}°`, `편도 ${f2(r.il, 1)} dB · ${f2(r.pr, 1)} kpts/s`], model: { N: r.N, il: +r.il.toFixed(2), wb: r.wb, settle: r.settle, pw: r.pw, ghost: +r.ghost.toFixed(1), fov: +deg(r.fov).toFixed(2), res: +deg(r.res).toFixed(4) } }; },
    aiStarts: (l) => [l.start, { ...l.start, k: 8, p: 20, f: 10, we: 9 }],
    _x: { analyse, SW }
  };
  return K;
})();
