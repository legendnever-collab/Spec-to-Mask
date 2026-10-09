// ===== Kind: carrier-depletion PN phase shifter (Si rib, lateral junction) =====
// Optics: rib mode via effective index (vertical slab TE → lateral 1D eigenmode), vertical confinement Γ_y.
// Electrostatics: abrupt-junction depletion width; plasma dispersion & absorption (Soref–Bennett, 1.3 / 1.55 µm).
// Electrical: junction capacitance, slab series resistance (Caughey–Thomas mobility) → RC bandwidth.
// Always a Si active layer (on SiN platforms this is the heterogeneously integrated Si layer).
KINDS.pn = (() => {
  const Q = 1.602e-19, EPS0 = 8.854e-12, ESI = 11.7, NI = 1e10, KT = 0.02585, VPP = 1.0, T_RIB = 0.22, T_SLAB = 0.09, NPP = 1e20;
  const SOREF = { 1.31: { ne: 6.2e-22, nh: 6.0e-18, ae: 6.0e-18, ah: 4.0e-18 }, 1.55: { ne: 8.8e-22, nh: 8.5e-18, ae: 8.5e-18, ah: 6.0e-18 } };
  const sor = (lam) => SOREF[lam < 1.4 ? 1.31 : 1.55];
  const mu = (N, h) => (h ? 44.9 + (470.5 - 44.9) / (1 + Math.pow(N / 2.23e17, 0.719)) : 68.5 + (1414 - 68.5) / (1 + Math.pow(N / 9.2e16, 0.711)));
  function slabTE(n1, n0, t, lam) {
    const k0 = 2 * Math.PI / lam; let lo = n0 + 1e-9, hi = n1 - 1e-9;
    for (let i = 0; i < 80; i++) { const m = 0.5 * (lo + hi), ka = k0 * Math.sqrt(n1 * n1 - m * m), ga = k0 * Math.sqrt(m * m - n0 * n0), ph = ka * t / 2; const f = ph >= Math.PI / 2 ? 1e9 : ka * Math.tan(ph) - ga; if (f > 0) lo = m; else hi = m; }
    const m = 0.5 * (lo + hi), ka = k0 * Math.sqrt(n1 * n1 - m * m), ga = k0 * Math.sqrt(m * m - n0 * n0);
    const inC = t / 2 + Math.sin(ka * t) / (2 * ka), outC = Math.cos(ka * t / 2) ** 2 / ga;
    return { n: m, gam: inC / (inC + outC) };
  }
  // lateral mode (scalar 1D FD, power iteration with shift) on the rib/slab effective-index profile
  const modeCache = {};
  function mode(lam, wr) {
    const key = lam + '|' + wr; if (modeCache[key]) return modeCache[key];
    const n1 = PQ.nSi(lam), n0 = PQ.nOx(lam), a = slabTE(n1, n0, T_RIB, lam), b = slabTE(n1, n0, T_SLAB, lam);
    const dx = 0.01, X = 3.0, N = Math.round(2 * X / dx), x = [], e = new Float64Array(N), k0 = 2 * Math.PI / lam;
    for (let i = 0; i < N; i++) { x.push(-X + (i + 0.5) * dx); e[i] = Math.abs(x[i]) <= wr / 2 ? a.n * a.n : b.n * b.n; }
    // inverse iteration on (σ − A) with σ above the top eigenvalue
    const d = new Float64Array(N), off = 1 / (dx * dx), sigma = k0 * k0 * a.n * a.n + 1e-3;
    for (let i = 0; i < N; i++) d[i] = sigma - (k0 * k0 * e[i] - 2 * off);
    let v = new Float64Array(N).fill(1);
    for (let it = 0; it < 60; it++) {
      const c = new Float64Array(N), y = new Float64Array(N); c[0] = -off / d[0]; y[0] = v[0] / d[0];
      for (let i = 1; i < N; i++) { const den = d[i] + off * c[i - 1]; c[i] = -off / den; y[i] = (v[i] + off * y[i - 1]) / den; }
      for (let i = N - 2; i >= 0; i--) y[i] -= c[i] * y[i + 1];
      let s = 0; for (let i = 0; i < N; i++) s += y[i] * y[i]; s = Math.sqrt(s * dx); for (let i = 0; i < N; i++) v[i] = y[i] / s;
    }
    const I = Array.from(v, (q) => q * q);
    return (modeCache[key] = { x, I, dx, gam: a.gam, gamSlab: b.gam, nrib: a.n });
  }
  const P = [
    { k: 'na', label: 'p 도핑 (log₁₀ cm⁻³)', sym: 'N<sub>A</sub>', min: 17, max: 18.7, step: 0.05, dec: 2, unit: '' },
    { k: 'nd', label: 'n 도핑 (log₁₀ cm⁻³)', sym: 'N<sub>D</sub>', min: 17, max: 18.7, step: 0.05, dec: 2, unit: '' },
    { k: 'xj', label: '접합 위치 (중심 기준)', sym: 'x<sub>j</sub>', min: -0.2, max: 0.2, step: 0.005, dec: 3, unit: 'µm' },
    { k: 'vb', label: '역바이어스', sym: 'V<sub>b</sub>', min: 0, max: 3, step: 0.05, dec: 2, unit: 'V' },
    { k: 'dc', label: '리브–컨택 거리', sym: 'd<sub>c</sub>', min: 0.3, max: 1.5, step: 0.05, dec: 2, unit: 'µm' }
  ];
  const wr = (l) => (l.pf.lam < 1.4 ? 0.45 : 0.5);
  function profile(l, d, V, proc) {
    const NA = Math.pow(10, d.na) * (proc ? 1 + 0.08 * gaussLike(proc, 1) : 1), ND = Math.pow(10, d.nd) * (proc ? 1 + 0.08 * gaussLike(proc, 2) : 1);
    const xj = d.xj + (proc ? 0.015 * gaussLike(proc, 3) : 0), w = wr(l);
    const vbi = KT * Math.log(NA * ND / (NI * NI));
    const Wd = Math.sqrt(2 * ESI * EPS0 * (vbi + V) / Q * (NA + ND) / (NA * ND) * 1e-6) * 1e6;   // µm (N in cm⁻³ → m⁻³)
    const xp = Wd * ND / (NA + ND), xn = Wd * NA / (NA + ND);
    return { NA, ND, xj, Wd, xp, xn, w, vbi };
  }
  // deterministic per-die pseudo-random numbers from the die seed
  function gaussLike(proc, k) { const r = mulberry((proc.seed || 1) * 7 + k * 101); return gaussR(r); }
  function optical(l, d, V, proc) {
    const lam = l.pf.lam, m = mode(lam, wr(l)), s = sor(lam), p = profile(l, d, V, proc);
    let dn = 0, al = 0;
    const cp = -(p.w / 2 + d.dc), cn = p.w / 2 + d.dc;
    // exact fractional coverage of each grid cell by the five doping regions (depletion edges move sub-cell)
    const edges = [-1e9, cp, p.xj - p.xp, p.xj + p.xn, cn, 1e9], carriers = [[0, NPP], [0, p.NA], [0, 0], [p.ND, 0], [NPP, 0]];
    const dnR = carriers.map(([N, Pp]) => -(s.ne * N + s.nh * Math.pow(Pp, 0.8))), alR = carriers.map(([N, Pp]) => s.ae * N + s.ah * Pp);
    for (let i = 0; i < m.x.length; i++) {
      const x = m.x[i], c0 = x - m.dx / 2, c1 = x + m.dx / 2, I = m.I[i], g = Math.abs(x) <= p.w / 2 ? m.gam : m.gamSlab;
      for (let k = 0; k < 5; k++) { const ov = Math.max(0, Math.min(c1, edges[k + 1]) - Math.max(c0, edges[k])); if (ov > 0) { dn += I * g * ov * dnR[k]; al += I * g * ov * alR[k]; } }
    }
    return { dn, alpha: al * 4.343 * 0.1, p };   // alpha: cm⁻¹ → dB/mm
  }
  function analyse(l, d, proc) {
    const lam = l.pf.lam, a = optical(l, d, d.vb, proc), b = optical(l, d, d.vb + VPP, proc);
    const dndv = Math.abs(b.dn - a.dn) / VPP, VpiL = lam * 1e-4 / (2 * dndv);   // V·cm
    const loss = 0.5 * (a.alpha + b.alpha) + 0.15;                              // dB/mm incl. 0.15 dB/mm sidewall
    const p = a.p, Cp = ESI * EPS0 * (T_RIB * 1e-6) / (p.Wd * 1e-6) * 1.15;   // F/m (fringe ×1.15)
    const rho = (N, h) => 1 / (Q * mu(N, h) * N) * 1e-2;                        // Ω·m
    const lp = p.w / 2 + p.xj, ln = p.w / 2 - p.xj;
    const Rp = rho(p.NA, true) * (Math.max(lp, 0.02) / T_RIB + d.dc / T_SLAB) + rho(p.ND, false) * (Math.max(ln, 0.02) / T_RIB + d.dc / T_SLAB);   // Ω·m (× µm/µm)
    const fRC = 1 / (2 * Math.PI * Rp * Cp) / 1e9;
    return { VpiL, loss, FOM: VpiL * loss * 10, Cp: Cp * 1e12 * 1e-3, Rp: Rp * 1e3, fRC, p, a, b };   // Cp pF/mm, Rp Ω·mm
  }
  const r1 = (l, r) => Math.max(r.VpiL / l.s1.vpil, r.loss / l.s1.loss);
  const r2 = (l, r) => Math.max(r.FOM / l.s2.fom, l.s2.frc / r.fRC);
  const K = {
    title: 'PN phase shifter', aspect: 0.46, noSize: true, sizeLabel: '—', sizeUnit: '', primaryLabel: 'V<sub>π</sub>L V·cm', cheap: true,
    params: () => P, landKeys: () => ['na', 'nd', 'xj', 'dc'], violation: () => 0,
    evaluate(l, d, proc) { const a = analyse(l, d, proc); return { d: { ...d }, ...a, size: 1, drc: [], primary: a.VpiL, secondary: a.loss }; },
    perf(l, r) { return 200 * clamp(1 - (r.VpiL - 1) / 3, 0, 1) + 150 * clamp(1 - r.loss / 4, 0, 1) + 150 * clamp(r.fRC / 100, 0, 1); },
    comp(l, r) { return 300 * clamp(l.s2.fom / r.FOM, 0, 1); },
    q1: r1, q2: r2,
    objectives(l, r) {
      return {
        t1: [{ k: `V<sub>π</sub>L ≤ ${fmtT(l.s1.vpil)} V·cm`, v: f2(r.VpiL) + ' V·cm', ok: r.VpiL <= l.s1.vpil }, { k: `광 손실 ≤ ${fmtT(l.s1.loss)} dB/mm`, v: f2(r.loss) + ' dB/mm', ok: r.loss <= l.s1.loss }],
        t2: [{ k: `FOM V<sub>π</sub>L·α ≤ ${fmtT(l.s2.fom)} V·dB`, v: f2(r.FOM, 1) + ' V·dB', ok: r.FOM <= l.s2.fom }, { k: `RC 대역폭 ≥ ${fmtT(l.s2.frc)} GHz`, v: Math.round(r.fRC) + ' GHz', ok: r.fRC >= l.s2.frc }]
      };
    },
    fabPass: (l, r) => r.FOM <= l.fab.fom && r.fRC >= l.fab.frc && r.VpiL <= l.s1.vpil,
    fabCrit: (l) => `FOM ≤ ${fmtT(l.fab.fom)} V·dB · f<sub>RC</sub> ≥ ${fmtT(l.fab.frc)} GHz (도핑 ±8%, 주입 정렬 σ 15 nm)`,
    meta(l, r) { const s = sor(l.pf.lam); return `${l.pf.mat === 'si' ? '' : '이종 집적 '}Si 리브 ${Math.round(wr(l) * 1000)}×220 nm, 슬랩 90 nm · 구동 ${VPP} V<sub>pp</sub> · λ ${Math.round(l.pf.lam * 1000)} nm<br>Soref–Bennett Δn = −(${s.ne.toExponential(1)}·ΔN + ${s.nh.toExponential(1)}·ΔP<sup>0.8</sup>) · 1D 모드 overlap + 공핍 근사`; },
    tiles(l, r) { return [['V<sub>π</sub>L', `${f2(r.VpiL)}<small>V·cm</small>`], ['광 손실', `${f2(r.loss)}<small>dB/mm</small>`], ['RC 대역폭', `${Math.round(r.fRC)}<small>GHz</small>`], ['C′ · R′', `${f2(r.Cp, 2)}<small>pF/mm</small> · ${f2(r.Rp, 1)}<small>Ω·mm</small>`]]; },
    hint(l, r) { return `공핍폭 W = √(2ε(V<sub>bi</sub>+V)/q · (N<sub>A</sub>+N<sub>D</sub>)/(N<sub>A</sub>N<sub>D</sub>)) = <b>${(r.p.Wd * 1000).toFixed(0)} nm</b> @ V<sub>b</sub><br>도핑↑ → 같은 전압에 더 많은 캐리어가 움직여 V<sub>π</sub>L↓, R↓(대역폭↑) — 대신 흡수 손실↑, 접합 C↑<br>정공(ΔP<sup>0.8</sup>)이 전자보다 굴절률을 더 크게 바꾸므로 접합을 n 쪽으로 약간 옮겨 p 영역이 모드 중심을 덮게 하는 것이 유리합니다`; },
    draw(cv, l, r, ui) {
      const ctx = cv.getContext('2d'), W = cv.width, H = cv.height, d = r.d, m = mode(l.pf.lam, wr(l)), p = r.p;
      ctx.fillStyle = '#0b1220'; ctx.fillRect(0, 0, W, H);
      const pad = 12 * DPR, xr = 1.9, X = (x) => W / 2 + x / xr * (W / 2 - pad), ySl = H * 0.66, um = (W / 2 - pad) / xr, Yv = (y) => ySl - y * um * 0.9;
      // doping regions
      const cp = -(p.w / 2 + d.dc), cn = p.w / 2 + d.dc;
      const reg = (a, b, col, top) => { ctx.fillStyle = col; ctx.fillRect(X(a), Yv(top), X(b) - X(a), Yv(0) - Yv(top)); };
      reg(-xr, cp, 'rgba(255,141,156,0.55)', T_SLAB); reg(cn, xr, 'rgba(100,201,223,0.55)', T_SLAB);
      reg(cp, Math.min(p.xj - p.xp, p.w / 2), 'rgba(255,141,156,0.25)', T_SLAB); reg(Math.max(p.xj + p.xn, -p.w / 2), cn, 'rgba(100,201,223,0.25)', T_SLAB);
      reg(Math.max(-p.w / 2, cp), p.xj - p.xp, 'rgba(255,141,156,0.25)', T_RIB); reg(p.xj + p.xn, Math.min(p.w / 2, cn), 'rgba(100,201,223,0.25)', T_RIB);
      // depletion at Vb and Vb + Vpp
      const pb = r.b.p; ctx.fillStyle = 'rgba(242,176,74,0.18)'; ctx.fillRect(X(pb.xj - pb.xp), Yv(T_RIB), X(pb.xj + pb.xn) - X(pb.xj - pb.xp), Yv(0) - Yv(T_RIB));
      ctx.fillStyle = 'rgba(242,176,74,0.45)'; ctx.fillRect(X(p.xj - p.xp), Yv(T_RIB), X(p.xj + p.xn) - X(p.xj - p.xp), Yv(0) - Yv(T_RIB));
      ctx.strokeStyle = 'rgba(231,236,243,0.85)'; ctx.lineWidth = 1.2 * DPR; ctx.beginPath(); ctx.moveTo(X(-xr), Yv(T_SLAB)); ctx.lineTo(X(-p.w / 2), Yv(T_SLAB)); ctx.lineTo(X(-p.w / 2), Yv(T_RIB)); ctx.lineTo(X(p.w / 2), Yv(T_RIB)); ctx.lineTo(X(p.w / 2), Yv(T_SLAB)); ctx.lineTo(X(xr), Yv(T_SLAB)); ctx.lineTo(X(xr), Yv(0)); ctx.lineTo(X(-xr), Yv(0)); ctx.closePath(); ctx.stroke();
      // mode intensity profile
      const Im = Math.max(...m.I); ctx.strokeStyle = '#f6c35a'; ctx.lineWidth = 2 * DPR; ctx.beginPath();
      m.x.forEach((x, i) => { if (Math.abs(x) > xr) return; const yy = Yv(T_RIB) - 8 * DPR - m.I[i] / Im * H * 0.32; i && Math.abs(m.x[i - 1]) <= xr ? ctx.lineTo(X(x), yy) : ctx.moveTo(X(x), yy); }); ctx.stroke();
      ctx.strokeStyle = 'rgba(231,236,243,0.6)'; ctx.setLineDash([3 * DPR, 3 * DPR]); ctx.beginPath(); ctx.moveTo(X(p.xj), pad); ctx.lineTo(X(p.xj), Yv(0)); ctx.stroke(); ctx.setLineDash([]);
      cvPill(ctx, `P ${Number(p.NA).toExponential(1)}`, X(-xr) + 4 * DPR, Yv(0) + 12 * DPR, 'left', '#ff8d9c'); cvPill(ctx, `N ${Number(p.ND).toExponential(1)}`, X(xr) - 4 * DPR, Yv(0) + 12 * DPR, 'right', '#64c9df');
      cvPill(ctx, `P++ 컨택`, X(cp) - 4 * DPR, Yv(T_SLAB) - 12 * DPR, 'right', 'rgba(255,141,156,.95)'); cvPill(ctx, `N++ 컨택`, X(cn) + 4 * DPR, Yv(T_SLAB) - 12 * DPR, 'left', 'rgba(100,201,223,.95)');
      cvPill(ctx, `공핍 ${Math.round(p.Wd * 1000)} → ${Math.round(pb.Wd * 1000)} nm`, X(p.xj), Yv(T_RIB) - 14 * DPR - H * 0.32, 'center', '#f2b04a');
      cvPill(ctx, '|E|² 모드', pad, pad + 6 * DPR, 'left', '#f6c35a');
    },
    chartTitle: () => '역바이어스에 따른 위상 변화와 손실',
    chart(l, r) {
      const d = r.d, base = optical(l, d, 0, null).dn, pts = [], lp = [];
      for (let v = 0; v <= 4.0001; v += 0.2) { const o = optical(l, d, v, null); pts.push([v, (o.dn - base) * 1e4]); lp.push([v, o.alpha + 0.15]); }
      const y1 = Math.max(...pts.map((p) => p[1]), 1), lmax = Math.max(...lp.map((p) => p[1]));
      const html = svgChart({ x0: 0, x1: 4, y0: 0, y1: Math.ceil(y1), aria: 'Δn_eff vs 바이어스', xticks: [0, 1, 2, 3, 4], yticks: [0, Math.ceil(y1) / 2, Math.ceil(y1)].map((v) => +v.toFixed(1)), ylab: '×10⁻⁴', xlab: '역바이어스 V',
        bands: [[d.vb, d.vb + VPP, 'rgba(242,176,74,0.10)']], series: [{ pts, color: 'var(--amber)', width: 2.4 }, { pts: lp.map(([v, a]) => [v, a / lmax * Math.ceil(y1)]), color: 'var(--rose)', width: 1.6, dash: '5 4' }] });
      return { html, legend: legendHTML([['var(--amber)', 'Δn<sub>eff</sub> (0 V 대비)'], ['var(--rose)', `손실 (최대 ${lmax.toFixed(1)} dB/mm로 정규화)`], ['rgba(242,176,74,.35)', `구동 구간 ${VPP} V<sub>pp</sub>`]]) };
    },
    coach(l, r, c) {
      const t = c.tier, d = r.d, q1 = (x) => r1(l, x), q2 = (x) => r2(l, x);
      if (r.VpiL > l.s1.vpil) { const b = lineBestOf(K, l, d, ['na', 'nd', 'xj', 'vb'], q1, 34); if (b) return { h: 'V<sub>π</sub>L이 큽니다 — 위상이 잘 안 바뀝니다', b: '움직이는 캐리어가 모드와 겹치는 양이 적습니다. 도핑을 올리거나 접합을 모드 중심 가까이 두세요. 정공이 굴절률을 더 크게 바꾸므로 접합을 n 쪽(+x)으로 조금 옮기는 것도 효과가 있습니다.' + recText(b, t, d) }; }
      if (r.loss > l.s1.loss) { const b = lineBestOf(K, l, d, ['dc', 'na', 'nd', 'vb'], q1, 34); if (b) return { h: '자유 캐리어 흡수가 큽니다', b: '도핑이 높거나 P++/N++ 컨택이 모드 꼬리에 닿고 있습니다. 컨택 거리 d<sub>c</sub>를 늘리거나 도핑을 낮추세요.' + recText(b, t, d) }; }
      if (c.ob1 && !c.ob2) {
        if (r.fRC < l.s2.frc) { const b = lineBestOf(K, l, d, ['dc', 'na', 'nd', 'vb'], q2, 34); if (b) return { h: '★★: RC 대역폭이 부족합니다', b: '슬랩 저항이 큽니다. 컨택을 가까이(d<sub>c</sub>↓) 하거나 도핑을 올려 저항을 낮추고, 역바이어스를 키워 공핍을 넓히면 접합 C가 줄어듭니다.' + recText(b, t, d) }; }
        if (r.FOM > l.s2.fom) { const b = lineBestOf(K, l, d, ['na', 'nd', 'xj', 'vb', 'dc'], q2, 34); if (b) return { h: '★★: 효율과 손실의 균형 (FOM)', b: 'V<sub>π</sub>L·α는 "π 위상을 얻는 데 드는 손실"입니다. 도핑을 무작정 올리면 V<sub>π</sub>L은 줄지만 손실이 더 빨리 늘어납니다. 손실 대부분은 공핍되지 않는 영역의 캐리어에서 생기니, 모드 중심만 공핍되도록 접합 위치와 바이어스를 다듬으세요.' + recText(b, t, d) }; }
      }
      if (c.ob2 && c.fab && c.fab.yield < l.fab.y) return { h: '주입 정렬 오차에 민감합니다', b: 'p/n 주입 마스크가 15 nm만 어긋나도 접합이 모드 중심에서 벗어납니다. 접합을 모드의 평평한 꼭대기 근처에 두고, 스펙 경계에서 여유를 확보하세요.' };
      return null;
    },
    card(l, r) { return { kind: 'pn', lines: [`V<sub>π</sub>L ${f2(r.VpiL)} V·cm · ${f2(r.loss)} dB/mm`, `C′ ${f2(r.Cp, 2)} pF/mm · f<sub>RC</sub> ${Math.round(r.fRC)} GHz`], model: { VpiL: +r.VpiL.toFixed(3), loss: +r.loss.toFixed(3), Cp: +r.Cp.toFixed(4), Rp: +r.Rp.toFixed(3), fRC: +r.fRC.toFixed(1) } }; },
    aiStarts: (l) => [l.start, { na: 17.8, nd: 17.8, xj: 0.05, vb: 1.0, dc: 0.8 }],
    _x: { analyse, mode, optical }
  };
  return K;
})();
