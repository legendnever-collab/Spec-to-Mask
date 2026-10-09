// ===== Kind: long on-chip delay line — broadened Archimedean double spiral with a tapered Euler S-bend =====
// After S. Hong et al., Photon. Res. 10, 1 (2022) and Y. Xie et al., Opto-Electron. Adv. 6, 220030 (2023).
// Cross-section: EIM strip (vertical slab TE → lateral slab with TM boundary conditions).
// Scattering: perturbation (Payne–Lacey-type) α_sw ∝ σ_sw²·(n₁²−n₂²)·∂n_eff/∂w, α_surf ∝ σ_s²·(n₁²−n₂²)·∂n_eff/∂t,
//   constants fitted once to the Si 2.0/1.6/0.45-µm cut-back data of Hong 2022 (0.28 / 0.38 / 5.5 dB/cm, σ 4.6 / 0.42 nm).
// Bends: Marcuse slab radiation loss C₁·exp(−U·R) on the EIM lateral slab, integrated along the spiral.
// S-bend: mode conversion at the curvature reversal a ∝ n²w³/(λ²R) — arc (width w, R = r_in/2) vs Euler (width W_s, R = r_in).
// Adjacent turns: coupled-slab κ (Marcuse) → coupling length L_c = π/(2κ); footprint from the double-spiral packing.
KINDS.spiral = (() => {
  const C_CM_NS = 29.9792, A_SW = 0.0147, B_S = 0.034, K_C = 0.377;
  const ROUGH = { si: { sw: 4.6, s: 0.42 }, sin: { sw: 5.0, s: 0.40 } };
  const matLoss = (pf) => (pf.mat === 'si' ? 0 : pf.lam > 1.4 ? 0.06 : 0.02);   // dB/cm, residual N–H / Si–H absorption in annealed LPCVD SiN
  function slab(n1, n0, t, lam, tm) {
    const k0 = 2 * Math.PI / lam; let lo = n0 + 1e-9, hi = n1 - 1e-9;
    for (let i = 0; i < 70; i++) { const m = 0.5 * (lo + hi), ka = k0 * Math.sqrt(n1 * n1 - m * m), ga = k0 * Math.sqrt(m * m - n0 * n0), ph = ka * t / 2; const f = ph >= Math.PI / 2 ? 1e9 : ka * Math.tan(ph) - (tm ? (n1 * n1) / (n0 * n0) : 1) * ga; if (f > 0) lo = m; else hi = m; }
    return 0.5 * (lo + hi);
  }
  const ncore = (pf, lam) => (pf.mat === 'si' ? PQ.nSi(lam) : PQ.nSiN(lam));
  const CACHE = new Map();
  // cross-section properties of a strip of width w on platform pf (cached)
  function xs(pf, w, sigScale) {
    const key = pf.id + '|' + w.toFixed(4) + '|' + (sigScale || 1).toFixed(4);
    let r = CACHE.get(key); if (r) return r;
    const lam = pf.lam, n1 = ncore(pf, lam), n0 = PQ.nOx(lam), t = pf.t;
    const ne = (ww, tt, ll) => { const nn1 = ncore(pf, ll), nn0 = PQ.nOx(ll), ns = slab(nn1, nn0, tt, ll, false); return slab(ns, nn0, ww, ll, true); };
    const ns = slab(n1, n0, t, lam, false), neff = slab(ns, n0, w, lam, true);
    const dndw = (ne(w + 0.01, t, lam) - ne(w - 0.01, t, lam)) / 0.02, dndt = (ne(w, t + 0.004, lam) - ne(w, t - 0.004, lam)) / 0.008;
    const ng = neff - lam * (ne(w, t, lam + 0.005) - ne(w, t, lam - 0.005)) / 0.01, dn2 = n1 * n1 - n0 * n0, R = ROUGH[pf.mat], s = sigScale || 1, lf = 1.55 / lam;
    const asw = A_SW * Math.pow(R.sw * s, 2) * dn2 * Math.max(dndw, 0) * lf, as = B_S * Math.pow(R.s, 2) * dn2 * Math.max(dndt, 0) * lf, am = matLoss(pf);
    // lateral slab for bends / coupling
    const k0 = 2 * Math.PI / lam, b = k0 * neff, g = k0 * Math.sqrt(Math.max(neff * neff - n0 * n0, 1e-9)), h = k0 * Math.sqrt(Math.max(ns * ns - neff * neff, 1e-9));
    const C1 = g * g * h * h * Math.pow(Math.cos(h * w / 2), 2) * Math.exp(g * w) / (b * (1 + g * w / 2) * (ns * ns - n0 * n0) * k0 * k0), U = (2 / 3) * g * g * g / (b * b);
    // TE1 cut-off check on the lateral slab (second root exists if V > π)
    const V = k0 * w * Math.sqrt(ns * ns - n0 * n0);
    r = { neff, ng, ns, n0, dndw, dndt, asw, as, am, alpha: asw + as + am, b, g, h, C1, U, multi: V > Math.PI, lam };
    if (CACHE.size > 5000) CACHE.clear(); CACHE.set(key, r);
    return r;
  }
  const bendDBcm = (x, R) => Math.min(1e4, 4.343 * x.C1 * Math.exp(-x.U * R) * 1e4);   // dB/cm at radius R (µm)
  const kappa = (x, w, gap) => 2 * x.h * x.h * x.g * Math.exp(-x.g * gap) / (x.b * (w + 2 / x.g) * (x.h * x.h + x.g * x.g));   // 1/µm
  const convA = (x, w, R) => K_C * x.ns * x.ns * w * w * w / (x.lam * x.lam * R);
  // full spiral for a target delay τ (ns). d = { w, gap, rin, ws, sb }
  function build(pf, d, tau, proc) {
    const g = (k) => (proc && proc.seed != null ? gaussR(mulberry(proc.seed * 29 + k * 601)) : 0);
    const dw = proc ? proc.dw || 0 : 0, sig = 1 + 0.2 * g(1);
    const w = d.w + dw, x = xs(pf, w, sig), Lcm = C_CM_NS * tau / x.ng, Lum = Lcm * 1e4, p = d.w + d.gap;
    const rin = d.rin, rout = Math.sqrt(Lum * p / Math.PI + rin * rin);
    // bend radiation integrated over the spiral (dL = 2πr dr / p)
    let bend = 0; const nS = 60;
    for (let i = 0; i < nS; i++) { const r0 = rin + (rout - rin) * Math.pow(i / nS, 2), r1 = rin + (rout - rin) * Math.pow((i + 1) / nS, 2), rm = 0.5 * (r0 + r1); bend += bendDBcm(x, rm) * (2 * Math.PI * rm * (r1 - r0) / p) * 1e-4; }
    // S-bend in the centre
    const euler = (d.sb | 0) === 1, Ls = 2 * Math.PI * rin * 0.7, Rmin = rin / 2.5;
    const xj = euler ? xs(pf, Math.max(0.2, d.ws + dw), sig) : x, wj = euler ? d.ws + dw : w, Rj = euler ? rin : rin / 2;
    const sRad = euler ? bendDBcm(xj, Rmin) * 0.4 * Ls * 1e-4 + bendDBcm(xj, rin) * 0.6 * Ls * 1e-4 : bendDBcm(x, rin / 2) * Ls * 1e-4;
    const sScat = (euler ? xj.alpha : x.alpha) * Ls * 1e-4;
    const a = convA(xj, wj, Rj), conv = Math.pow(Math.sin(Math.min(a, Math.PI / 2)), 2), xtMode = 10 * Math.log10(Math.max(conv, 1e-9));
    const convLoss = -10 * Math.log10(Math.max(1 - conv, 1e-6));
    const taper = 2 * (0.02 + x.alpha * 0.01);   // two bent tapers to the single-mode I/O
    const prop = x.alpha * Lcm, IL = prop + bend + sRad + sScat + convLoss + taper;
    const k = kappa(x, w, d.gap), Lc = Math.PI / (2 * k), xtGap = 10 * Math.log10(Math.max(Math.pow(Math.sin(Math.min(Math.PI / 2, k * Lum)), 2), 1e-12));
    const side = 2 * rout + 20, area = side * side;
    return { x, w, Lcm, rout, p, prop, bend, sRad, sScat, conv, convLoss, xtMode, taper, IL, k, Lc, xtGap, area, euler, Rmin, xj, wj, Rj,
      parts: { sw: x.asw * Lcm, surf: x.as * Lcm, mat: x.am * Lcm, bend: bend + sRad, sb: convLoss + sScat, taper } };
  }
  const PR = (l) => l.pf.mat === 'si' ? [
    { k: 'w', label: '나선 도파로 폭', sym: 'W<sub>m</sub>', min: 0.4, max: 3.0, step: 0.05, dec: 2, unit: 'µm' },
    { k: 'gap', label: '이웃 회전 간격', sym: 'W<sub>gap</sub>', min: 0.2, max: 4, step: 0.1, dec: 1, unit: 'µm' },
    { k: 'rin', label: '나선 안쪽 반경 (S-bend R<sub>max</sub>)', sym: 'R<sub>in</sub>', min: 5, max: 200, step: 1, dec: 0, unit: 'µm' },
    { k: 'ws', label: 'S-bend 중앙 폭', sym: 'W<sub>s</sub>', min: 0.3, max: 2.0, step: 0.05, dec: 2, unit: 'µm' },
    { k: 'sb', label: '중앙 S-bend', sym: 'S', min: 0, max: 1, step: 1, dec: 0, unit: '', labels: ['원호 (폭 Wm 그대로)', '테이퍼 Euler (Ws)'] }
  ] : [
    { k: 'w', label: '나선 도파로 폭', sym: 'W<sub>m</sub>', min: 0.8, max: 4.0, step: 0.05, dec: 2, unit: 'µm' },
    { k: 'gap', label: '이웃 회전 간격', sym: 'W<sub>gap</sub>', min: 0.5, max: 10, step: 0.1, dec: 1, unit: 'µm' },
    { k: 'rin', label: '나선 안쪽 반경 (S-bend R<sub>max</sub>)', sym: 'R<sub>in</sub>', min: 20, max: 1000, step: 5, dec: 0, unit: 'µm' },
    { k: 'ws', label: 'S-bend 중앙 폭', sym: 'W<sub>s</sub>', min: 0.6, max: 3.0, step: 0.05, dec: 2, unit: 'µm' },
    { k: 'sb', label: '중앙 S-bend', sym: 'S', min: 0, max: 1, step: 1, dec: 0, unit: '', labels: ['원호 (폭 Wm 그대로)', '테이퍼 Euler (Ws)'] }
  ];
  const other = (pf) => Object.values(PLATFORMS).find((p) => p.lam === pf.lam && p.mat !== pf.mat);
  const mm2 = (a) => (a / 1e6).toFixed(a < 1e5 ? 3 : 2);
  const r1 = (l, r) => Math.max(r.IL / l.s1.il, 1 + (r.xtMode - l.s1.xtm) / 20, 1 + (r.xtGap - l.s1.xtg) / 30);
  const r2 = (l, r) => r.IL / l.s2.il;
  const keysFor = (r) => ['w', 'gap', 'rin', 'ws', 'sb'];
  const K = {
    title: 'Delay spiral', aspect: 0.56, sizeLabel: '점유 면적', sizeUnit: 'mm²', sizeFmt: (v) => mm2(v), primaryLabel: '삽입 손실 dB', cheap: true,
    params: (l) => PR(l), landKeys: () => ['w', 'gap', 'rin'], violation: () => 0,
    evaluate(l, d, proc) { const b = build(l.pf, d, l.tau, proc); return { d: { ...d }, ...b, size: b.area, drc: [], primary: b.IL, secondary: b.Lcm }; },
    perf(l, r) { return 250 * clamp(l.s2.il / r.IL, 0, 1) + 125 * clamp((-r.xtMode - 10) / 30, 0, 1) + 125 * clamp((-r.xtGap - 20) / 40, 0, 1); },
    q1: r1, q2: r2,
    objectives(l, r) {
      return {
        t1: [{ k: `${l.tau} ns 지연 삽입 손실 ≤ ${fmtT(l.s1.il)} dB`, v: f2(r.IL, 2) + ' dB', ok: r.IL <= l.s1.il }, { k: `S-bend 고차모드 변환 ≤ ${l.s1.xtm} dB`, v: f2(r.xtMode, 1) + ' dB', ok: r.xtMode <= l.s1.xtm },
          { k: `이웃 회전 결합 ≤ ${l.s1.xtg} dB`, v: r.xtGap < -99 ? '< −99 dB' : f2(r.xtGap, 1) + ' dB', ok: r.xtGap <= l.s1.xtg }],
        t2: [{ k: `삽입 손실 ≤ ${fmtT(l.s2.il)} dB`, v: f2(r.IL, 2) + ' dB', ok: r.IL <= l.s2.il }]
      };
    },
    fabPass: (l, r) => r.IL <= l.fab.il && r.xtMode <= l.s1.xtm && r.xtGap <= l.s1.xtg,
    fabCrit: (l) => `삽입 손실 ≤ ${fmtT(l.fab.il)} dB · 모드 변환·이웃 결합 ★ 기준 (측벽 거칠기 웨이퍼 간 ±20%, CD 산포)`,
    meta(l, r) {
      const R = ROUGH[l.pf.mat];
      return `${l.pf.short} · 지연 ${l.tau} ns = ${f2(r.Lcm, 1)} cm (n<sub>g</sub> ${f2(r.x.ng, 2)}) · σ<sub>측벽</sub> ${R.sw} nm, σ<sub>상하면</sub> ${R.s} nm${matLoss(l.pf) ? ` · 재료 흡수 ${matLoss(l.pf)} dB/cm` : ''}`
        + `<br>EIM 단면 + Payne–Lacey형 산란(Hong 2022 Si 데이터로 상수 보정) · Marcuse 굽힘 방사 · 이중 아르키메데스 나선`;
    },
    tiles(l, r) { return [['삽입 손실', `${f2(r.IL, 2)}<small>dB</small>`], ['전파 손실', `${f2(r.x.alpha, 3)}<small>dB/cm</small>`], ['면적', `${mm2(r.area)}<small>mm²</small>`], ['모드 변환 · 이웃 결합', `${Math.round(r.xtMode)}<small>dB</small> · ${r.xtGap < -99 ? '<−99' : Math.round(r.xtGap)}<small>dB</small>`]]; },
    hint(l, r) {
      const P = r.parts;
      return `손실 분해: 측벽 산란 ${f2(P.sw, 2)} · 상하면 ${f2(P.surf, 2)} · 재료 ${f2(P.mat, 2)} · 굽힘 방사 ${f2(P.bend, 2)} · S-bend ${f2(P.sb, 2)} · 테이퍼 ${f2(P.taper, 2)} dB`
        + `<br>측벽 산란 ∝ σ²·(n₁²−n₂²)·∂n<sub>eff</sub>/∂w: 폭을 넓히면 측벽의 전계가 줄어 급감합니다 (지금 ∂n<sub>eff</sub>/∂w = ${f2(r.x.dndw, 3)} /µm)`
        + `<br>결합 길이 L<sub>c</sub> = π/(2κ) = ${r.Lc > 1e7 ? (r.Lc / 1e6).toExponential(1) + ' m' : f2(r.Lc / 1e4, 1) + ' cm'} vs 나선 길이 ${f2(r.Lcm, 1)} cm · 바깥 반경 ${Math.round(r.rout)} µm`;
    },
    draw(cv, l, r, ui) {
      const ctx = cv.getContext('2d'), W = cv.width, H = cv.height, pad = 10 * DPR, narrow = W / DPR < 520, d = r.d;
      ctx.fillStyle = '#0b1220'; ctx.fillRect(0, 0, W, H);
      const vw = narrow ? W : W * 0.62, cx = vw / 2, cy = H / 2 + 6 * DPR, Rpx = Math.min(vw, H) / 2 - 18 * DPR;
      // drawn turns are a scaled-down picture of the real spiral (pitch exaggerated)
      const turns = (r.rout - d.rin) / r.p, nT = Math.max(2, Math.min(14, Math.round(turns / 2))), rinPx = Rpx * clamp(d.rin / r.rout, 0.12, 0.5), pitchPx = (Rpx - rinPx) / nT;
      const tot = r.prop + r.bend;
      const arm = (sgn, phase) => {
        const n = nT * 80; let prev = null;
        for (let i = 0; i <= n; i++) {
          const th = i / n * nT * 2 * Math.PI, rr = rinPx + pitchPx * th / (2 * Math.PI) + (phase ? pitchPx / 2 : 0), xx = cx + sgn * rr * Math.cos(th), yy = cy + sgn * rr * Math.sin(th);
          if (prev) { const frac = phase ? 0.5 + 0.5 * (1 - i / n) : 0.5 * (i / n); const att = Math.pow(10, -tot * frac / 10); ctx.strokeStyle = `rgba(246,195,90,${(0.25 + 0.75 * att).toFixed(3)})`; ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(xx, yy); ctx.stroke(); }
          prev = [xx, yy];
        }
      };
      ctx.lineWidth = Math.max(1, Math.min(3 * DPR, pitchPx * 0.45));
      arm(1, false); arm(-1, true);
      // centre S-bend
      ctx.strokeStyle = r.xtMode > l.s1.xtm ? '#ff6b6b' : '#5dd193'; ctx.lineWidth = 2 * DPR; ctx.beginPath();
      ctx.arc(cx - rinPx / 2, cy, rinPx / 2, 0, Math.PI); ctx.stroke(); ctx.beginPath(); ctx.arc(cx + rinPx / 2, cy, rinPx / 2, Math.PI, 2 * Math.PI); ctx.stroke();
      cvPill(ctx, `${l.tau} ns · ${f2(r.Lcm, 1)} cm · 실제 ${Math.round(turns)}회전 (그림은 축약)`, pad, pad + 4 * DPR, 'left', '#f6c35a');
      cvPill(ctx, `${mm2(r.area)} mm² · Ø ${f2(2 * r.rout / 1000, 2)} mm`, pad, H - pad - 12 * DPR, 'left');
      if (narrow) return;
      // loss breakdown bar
      const px = W * 0.66, pw = W - px - pad, top = pad + 26 * DPR, bot = H - pad - 6 * DPR, P = r.parts;
      const items = [['sw', '측벽 산란', '#ff8d9c'], ['surf', '상하면', '#b48cff'], ['mat', '재료 흡수', '#9eabbd'], ['bend', '굽힘 방사', '#64c9df'], ['sb', 'S-bend', '#f2b04a'], ['taper', '테이퍼', '#5b6b80']];
      const sc = (bot - top) / Math.max(r.IL, l.s1.il * 1.05); let y = bot;
      ctx.font = `${10 * DPR}px "IBM Plex Mono", monospace`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      items.forEach(([k, n, c]) => { const h = P[k] * sc; if (h <= 0.3) return; ctx.fillStyle = c; ctx.fillRect(px, y - h, pw * 0.3, h); if (h > 11 * DPR) { ctx.fillStyle = 'rgba(231,236,243,0.9)'; ctx.fillText(`${n} ${f2(P[k], P[k] < 1 ? 2 : 1)}`, px + pw * 0.34, y - h / 2); } y -= h; });
      [[l.s1.il, '★'], [l.s2.il, '★★']].forEach(([v, t]) => { const yy = bot - v * sc; if (yy < top - 4 * DPR) return; ctx.strokeStyle = 'rgba(231,236,243,0.6)'; ctx.setLineDash([4 * DPR, 3 * DPR]); ctx.beginPath(); ctx.moveTo(px - 4 * DPR, yy); ctx.lineTo(px + pw * 0.3 + 4 * DPR, yy); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = 'rgba(231,236,243,0.8)'; ctx.textAlign = 'right'; ctx.fillText(t, px - 6 * DPR, yy); ctx.textAlign = 'left'; });
      cvPill(ctx, `손실 ${f2(r.IL, 2)} dB`, W - pad, pad + 4 * DPR, 'right', r.IL <= l.s1.il ? '#5dd193' : '#ff6b6b');
    },
    chartTitle: (l) => `같은 ${l.tau} ns 지연선 · 나선 폭에 따른 손실(전파 + 굽힘, S-bend 제외) — Si vs SiN (${Math.round(l.pf.lam * 1000)} nm)`,
    chart(l, r) {
      const d = r.d, op = other(l.pf), oref = ((PSPEC[op.id] || {})['D-1'] || {}).ref, mine = [], oth = [];
      const ws = []; for (let w = 0.4; w <= 4.0001; w += 0.1) ws.push(+w.toFixed(2));
      const P0 = PR(l)[0], Po = PR({ pf: op })[0];
      const pb = (pf, dd) => { const b = build(pf, dd, l.tau); return Math.min(60, b.prop + b.bend + b.taper); };   // spiral body only (S-bend excluded)
      ws.forEach((w) => { if (w >= P0.min - 1e-9 && w <= P0.max + 1e-9) mine.push([w, pb(l.pf, { ...d, w })]); if (oref && w >= Po.min - 1e-9 && w <= Po.max + 1e-9) oth.push([w, pb(op, { ...oref, w })]); });
      const ymax = Math.min(60, Math.max(l.s1.il * 2, ...oth.map((p) => p[1])));
      const html = svgChart({ x0: 0.4, x1: 4, y0: 0, y1: Math.ceil(ymax), aria: '폭에 따른 손실', xticks: [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4], yticks: [0, Math.ceil(ymax / 2), Math.ceil(ymax)], ylab: 'dB', xlab: '폭 µm',
        vlines: [{ x: d.w, color: 'rgba(231,236,243,.7)' }], hlines: [{ y: l.s2.il, label: `★★ ${fmtT(l.s2.il)} dB` }],
        series: [{ pts: mine, color: l.pf.mat === 'si' ? 'var(--amber)' : 'var(--cyan)', width: 2.4 }].concat(oth.length ? [{ pts: oth, color: l.pf.mat === 'si' ? 'var(--cyan)' : 'var(--amber)', width: 1.6, dash: '5 4' }] : []) });
      return { html, legend: legendHTML([[l.pf.mat === 'si' ? 'var(--amber)' : 'var(--cyan)', `${l.pf.mat === 'si' ? 'Si' : 'SiN'} (지금 설계, 폭만 변경)`], [l.pf.mat === 'si' ? 'var(--cyan)' : 'var(--amber)', `${op.mat === 'si' ? 'Si' : 'SiN'} (그 플랫폼의 기준 나선)`]]) };
    },
    coach(l, r, c) {
      const t = c.tier, d = r.d, q1 = (x) => r1(l, x), q2s = (x) => Math.max(r1(l, x), r2(l, x), x.size / l.s2.size), P = r.parts;
      const pick = (q, ks) => lineBestOf(K, l, d, ks, q, 24) || [['w', 'gap'], ['rin', 'ws'], ['w', 'rin']].map((k2) => pairBest(K, l, d, k2, q, 10)).filter(Boolean).sort((a, b) => a.q - b.q)[0] || null;
      const txt = (b) => (!b ? '' : b.ps ? recText2(b, t) : recText(b, t, d));
      if (!c.ob1) {
        if (r.xtMode > l.s1.xtm) { const b = pick(q1, ['sb', 'ws', 'rin']); if (b) return { h: '중앙 S-bend에서 고차모드가 생깁니다', b: `넓은 멀티모드 도파로를 원호로 꺾으면 곡률이 뒤집히는 이음매에서 기본모드가 TE1로 바뀝니다(지금 ${f2(r.xtMode, 1)} dB). 곡률을 서서히 바꾸고 이음매만 좁히는 테이퍼 Euler S-bend가 해법입니다 — Hong 2022는 R<sub>max</sub> 25 µm, W<sub>s</sub> 0.6 µm로 −30 dB 이하를 얻었습니다.` + txt(b) }; }
        if (r.xtGap > l.s1.xtg) { const b = pick(q1, ['gap']); if (b) return { h: '이웃 회전으로 빛이 건너갑니다', b: `결합 길이 L<sub>c</sub>가 나선 길이(${f2(r.Lcm, 1)} cm)보다 충분히 길어야 합니다. 간격을 넓히면 κ가 지수적으로 줄어듭니다.` + txt(b) }; }
        if (r.IL > l.s1.il) {
          const dom = [['sw', '측벽 산란이 손실 대부분입니다', '좁은 단일모드 도파로는 측벽에 전계가 많이 걸려 거칠기 산란이 큽니다. 폭을 넓혀 모드를 코어 안으로 모으세요 — 넓힌 도파로는 멀티모드가 되지만 나선을 천천히 굽히면 기본모드만 유지됩니다.', ['w']],
            ['bend', '굽힘 방사 손실이 큽니다', l.pf.mat === 'si' ? '안쪽 회전 반경이 너무 작습니다.' : 'SiN은 굴절률 대비가 작아 반경 수십 µm 이하에서 빛이 바깥으로 새어 나갑니다. 안쪽 반경을 키우세요(면적과 교환).', ['rin', 'w']],
            ['sb', 'S-bend 손실이 큽니다', 'S-bend의 좁은 구간이 너무 급하게 꺾이거나 모드 변환이 손실로 나갑니다.', ['ws', 'rin', 'sb']]].sort((a, b) => P[b[0]] - P[a[0]])[0];
          const b = pick(q1, dom[3]); if (b) return { h: dom[1], b: dom[2] + txt(b) };
        }
        return null;
      }
      if (!c.ob2) { const b = pick(q2s, ['w', 'gap', 'rin', 'ws']); if (b) return { h: r.size > l.s2.size ? '★★: 나선이 너무 큽니다' : '★★: 손실을 더 줄여야 합니다', b: (r.size > l.s2.size ? '면적은 (폭 + 간격) × 길이로 정해집니다. 결합이 허락하는 만큼 간격을 줄이고, 안쪽 반경을 줄이세요.' : '폭, 반경, 간격의 균형을 다듬으세요.') + txt(b) }; }
      return null;
    },
    card(l, r) { return { kind: 'spiral', lines: [`${f2(r.x.alpha, 3)} dB/cm · W ${f2(r.d.w, 2)} µm`, `${l.tau} ns: ${f2(r.IL, 2)} dB · ${mm2(r.area)} mm²`], model: { alpha: +r.x.alpha.toFixed(4), ng: +r.x.ng.toFixed(3), IL: +r.IL.toFixed(3), area: Math.round(r.area) } }; },
    aiStarts: (l) => [l.start, { ...l.start, w: l.pf.mat === 'si' ? 2 : 2.4, sb: 1 }],
    _x: { build, xs, bendDBcm, kappa, other, ROUGH }
  };
  return K;
})();
