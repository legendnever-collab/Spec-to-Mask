// ===== Kind: directional coupler — even/odd supermode beating =====
// Δn = n_even − n_odd(gap, λ, t, w) from the offline 2D solver (two identical guides of width w0).
KINDS.dc = (() => {
  const T = (l) => DCP[l.pf.id];
  const dnTab = (row) => Math.max(row[0] - row[1], 1e-7);
  // log-linear interpolation in gap (Δn decays ~exponentially)
  const lgi = (gs, vals, g) => Math.exp(linterp(gs, vals.map((v) => Math.log(v)), g));
  function dn(l, g, lam, dw, dt) {
    const tb = T(l), [la, lb, lc] = tb.lams;
    const d3 = [0, 1, 2].map((j) => lgi(tb.gs, tb.lam.map((r) => dnTab(r[j])), g));
    // quadratic in λ through the three tabulated wavelengths
    let v = d3[0] * (lam - lb) * (lam - lc) / ((la - lb) * (la - lc)) + d3[1] * (lam - la) * (lam - lc) / ((lb - la) * (lb - lc)) + d3[2] * (lam - la) * (lam - lb) / ((lc - la) * (lc - lb));
    if (dw) { const key = dw > 0 ? '1' : '-1', r = lgi(tb.gs, tb.w[key].map(dnTab), g) / lgi(tb.gs, tb.lam.map((x) => dnTab(x[1])), g); v *= Math.pow(r, Math.abs(dw) / tb.dw); }
    if (dt) { const key = String(dt > 0 ? tb.ts[2] : tb.ts[0]), r = lgi(tb.gs, tb.t[key].map(dnTab), g) / lgi(tb.gs, tb.lam.map((x) => dnTab(x[1])), g); v *= Math.pow(r, Math.abs(dt) / (tb.ts[2] - tb.ts[1])); }
    return Math.max(v, 1e-7);
  }
  const cross = (l, d, lam, proc) => {
    const dw = proc ? proc.dw : 0, dt = proc ? proc.dt : 0, g = Math.max(T(l).gs[0] * 0.5, d.g - dw);
    const s = Math.sin(Math.PI * d.L * dn(l, g, lam, dw, dt) / lam); return s * s;
  };
  const PR = (l) => (l.pf.mat === 'si'
    ? [{ k: 'g', label: '갭', sym: 'g', min: 0.10, max: 0.60, step: 0.01, dec: 2, unit: 'µm' }, { k: 'L', label: '결합 길이', sym: 'L', min: 1, max: 300, step: 0.5, dec: 1, unit: 'µm' }]
    : [{ k: 'g', label: '갭', sym: 'g', min: 0.30, max: 1.50, step: 0.02, dec: 2, unit: 'µm' }, { k: 'L', label: '결합 길이', sym: 'L', min: 5, max: 800, step: 1, dec: 0, unit: 'µm' }]);
  const BANDW = 0.02;
  const MISS = [{ id: 'full', label: '완전 결합: CROSS ≥ 95%' }, { id: 'half', label: '3-dB 분배: CROSS 50 ± 3%' }];
  const r1 = (l, r) => Math.abs(r.k - 0.5) / l.s1.dk;
  const r2 = (l, r) => Math.max(Math.abs(r.k - 0.5) / l.s2.dk, r.kband / l.s2.dkb);
  const Lpi = (l, g, lam) => { const la = lam || l.pf.lam; return la / (2 * dn(l, g, la, 0, 0)); };
  const K = {
    title: 'Directional coupler', aspect: 0.42, sizeLabel: '결합 길이', sizeUnit: 'µm', primaryLabel: '|CROSS − 50%|', cheap: true,
    params: (l) => PR(l), landKeys: () => ['g', 'L'], violation: () => 0,
    missions: () => MISS,
    missionDone: (l, r, id) => (id === 'full' ? r.k >= 0.95 : Math.abs(r.k - 0.5) <= 0.03),
    evaluate(l, d, proc) {
      const lam = l.pf.lam, k = cross(l, d, lam, proc), ks = [-BANDW, -BANDW / 2, 0, BANDW / 2, BANDW].map((x) => cross(l, d, lam + x, proc));
      const kband = Math.max(...ks.map((v) => Math.abs(v - 0.5)));
      return { d: { ...d }, k, ks, kband, Lpi: Lpi(l, d.g), size: d.L, drc: [], primary: Math.abs(k - 0.5), secondary: kband };
    },
    perf(l, r) { return 250 * clamp(1 - Math.abs(r.k - 0.5) / 0.25, 0, 1) + 250 * clamp(1 - r.kband / 0.3, 0, 1); },
    q1: r1, q2: r2,
    objectives(l, r) {
      return {
        t1: [{ k: `λ<sub>c</sub>에서 CROSS 50 ± ${Math.round(l.s1.dk * 100)}%`, v: (r.k * 100).toFixed(1) + '%', ok: r1(l, r) <= 1 }],
        t2: [{ k: `λ<sub>c</sub>에서 50 ± ${Math.round(l.s2.dk * 100)}%`, v: (r.k * 100).toFixed(1) + '%', ok: Math.abs(r.k - 0.5) <= l.s2.dk }, { k: `±${BANDW * 1000} nm 대역 최악 50 ± ${Math.round(l.s2.dkb * 100)}%`, v: '±' + (r.kband * 100).toFixed(1) + '%', ok: r.kband <= l.s2.dkb }]
      };
    },
    fabPass: (l, r) => Math.abs(r.k - 0.5) <= l.fab.dk,
    fabCrit: (l) => `λc에서 CROSS 50 ± ${Math.round(l.fab.dk * 100)}%`,
    meta(l, r) { return `${l.pf.short} · 도파로 폭 <b>${Math.round(T(l).w0 * 1000)} nm</b> (단일모드) · TE<br>Δn = n<sub>even</sub> − n<sub>odd</sub> = <b>${dn(l, r.d.g, l.pf.lam, 0, 0).toExponential(2)}</b> · 2D 슈퍼모드 테이블 + 결합 모드 이론`; },
    tiles(l, r) { return [['CROSS @ λc', `${(r.k * 100).toFixed(1)}<small>%</small>`], ['완전 결합 길이 L<sub>π</sub>', `${r.Lpi < 1000 ? r.Lpi.toFixed(1) : Math.round(r.Lpi)}<small>µm</small>`], [`±${BANDW * 1000} nm 최악 편차`, `${(r.kband * 100).toFixed(1)}<small>%p</small>`], ['결합 길이', `${r.d.L.toFixed(1)}<small>µm</small>`]]; },
    hint(l, r) {
      return `L<sub>π</sub> = λ / (2Δn) = <b>${r.Lpi.toFixed(1)} µm</b> (갭 ${r.d.g.toFixed(2)} µm)<br>CROSS = sin²(πLΔn/λ) → 완전 결합 L = L<sub>π</sub>, 3-dB L = <b>L<sub>π</sub>/2 = ${(r.Lpi / 2).toFixed(1)} µm</b><br>갭이 넓어질수록 Δn이 지수적으로 줄고, 파장이 길수록 모드가 퍼져 Δn이 커집니다 → 파장 의존성의 원인`;
    },
    draw(cv, l, r, ui) {
      const ctx = cv.getContext('2d'), W = cv.width, H = cv.height, d = r.d, lam = l.pf.lam, dnv = dn(l, d.g, lam, 0, 0);
      ctx.fillStyle = '#0b1220'; ctx.fillRect(0, 0, W, H);
      const pad = 12 * DPR, xin = pad + 30 * DPR, xout = W - pad - 70 * DPR, bend = (xout - xin) * 0.14, xa = xin + bend, xb = xout - bend;
      const yc = H * 0.46, sep = Math.max(16 * DPR, Math.min(H * 0.12, (d.g + T(l).w0) * 12 * DPR)), far = H * 0.3;
      const yT = (x) => (x < xa ? yc - sep / 2 - far * (1 - (1 - Math.cos(Math.PI * (x - xin) / bend)) / 2) : x > xb ? yc - sep / 2 - far * (1 - Math.cos(Math.PI * (x - xb) / bend)) / 2 : yc - sep / 2);
      const yB = (x) => 2 * yc - yT(x);
      const N = 160;
      for (let i = 0; i < N; i++) {
        const x = xin + (xout - xin) * (i + 0.5) / N, z = clamp((x - xa) / (xb - xa), 0, 1) * d.L;
        const p2 = Math.sin(Math.PI * z * dnv / lam) ** 2, p1 = 1 - p2;
        [[yT(x), p1], [yB(x), p2]].forEach(([y, p]) => { const v = Math.round(255 * Math.pow(p, 0.6)); ctx.fillStyle = `rgb(${FIELD_LUT[v * 3]},${FIELD_LUT[v * 3 + 1]},${FIELD_LUT[v * 3 + 2]})`; ctx.fillRect(x - (xout - xin) / N / 2, y - 5 * DPR, (xout - xin) / N + 1, 10 * DPR); });
      }
      ctx.strokeStyle = 'rgba(214,226,242,0.55)'; ctx.lineWidth = 1 * DPR;
      [yT, yB].forEach((f) => { ctx.beginPath(); for (let i = 0; i <= N; i++) { const x = xin + (xout - xin) * i / N; i ? ctx.lineTo(x, f(x) - 5 * DPR) : ctx.moveTo(x, f(x) - 5 * DPR); } ctx.stroke(); ctx.beginPath(); for (let i = 0; i <= N; i++) { const x = xin + (xout - xin) * i / N; i ? ctx.lineTo(x, f(x) + 5 * DPR) : ctx.moveTo(x, f(x) + 5 * DPR); } ctx.stroke(); });
      cvPill(ctx, 'IN', pad, yT(xin), 'left');
      cvPill(ctx, `BAR ${((1 - r.k) * 100).toFixed(1)}%`, W - pad, yT(xout), 'right');
      cvPill(ctx, `CROSS ${(r.k * 100).toFixed(1)}%`, W - pad, yB(xout), 'right', Math.abs(r.k - 0.5) <= l.s1.dk ? '#5dd193' : 'rgba(231,236,243,0.95)');
      ctx.fillStyle = 'rgba(158,171,189,0.9)'; ctx.font = `${10 * DPR}px "IBM Plex Mono", monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText(`결합 구간 L = ${d.L.toFixed(1)} µm · 갭 ${d.g.toFixed(2)} µm`, (xa + xb) / 2, H - pad - 12 * DPR);
      if (ui.hintTier >= 2) { ctx.fillStyle = 'rgba(242,176,74,0.95)'; ctx.fillText(`L/Lπ = ${(d.L / r.Lpi).toFixed(2)}`, (xa + xb) / 2, pad); }
      ctx.strokeStyle = 'rgba(242,176,74,0.5)'; ctx.setLineDash([3 * DPR, 3 * DPR]); [xa, xb].forEach((x) => { ctx.beginPath(); ctx.moveTo(x, pad + 14 * DPR); ctx.lineTo(x, H - pad - 16 * DPR); ctx.stroke(); }); ctx.setLineDash([]);
    },
    chartTitle: (l) => `결합비 스펙트럼 · ${Math.round((l.pf.lam - 0.06) * 1000)}–${Math.round((l.pf.lam + 0.06) * 1000)} nm`,
    chart(l, r) {
      const lam = l.pf.lam, pts = [];
      for (let i = 0; i <= 120; i++) { const x = lam - 0.06 + 0.12 * i / 120; pts.push([x * 1000, cross(l, r.d, x, null) * 100]); }
      const html = svgChart({ x0: (lam - 0.06) * 1000, x1: (lam + 0.06) * 1000, y0: 0, y1: 100, aria: '결합비 스펙트럼', xticks: [-60, -30, 0, 30, 60].map((v) => Math.round(lam * 1000 + v)), yticks: [0, 25, 50, 75, 100], ylab: '%',
        bands: [[(lam - BANDW) * 1000, (lam + BANDW) * 1000]], hlines: [{ y: 50, label: '3-dB' }, { y: 50 + l.s2.dkb * 100, color: 'rgba(242,176,74,.5)' }, { y: 50 - l.s2.dkb * 100, color: 'rgba(242,176,74,.5)' }],
        series: [{ pts, color: 'var(--rose)', width: 2.2 }, { pts: pts.map((p) => [p[0], 100 - p[1]]), color: 'var(--amber)', width: 1.6, dash: '5 4' }] });
      return { html, legend: legendHTML([['var(--rose)', 'CROSS'], ['var(--amber)', 'BAR'], ['rgba(242,176,74,.35)', `★★ 대역 ±${BANDW * 1000} nm`]]) };
    },
    coach(l, r, c) {
      const t = c.tier, d = r.d, done = c.missions || {}, n1 = (v) => v.toFixed(1);
      if (!done.full) return { h: '빛을 옆 도파로로 완전히 넘겨보세요', b: '두 도파로가 가까우면 짝(even)·홀(odd) 슈퍼모드가 서로 다른 속도로 진행하며 맥놀이(beating)를 만듭니다. 결합 길이가 L<sub>π</sub>일 때 빛이 전부 반대편으로 넘어갑니다.' + (t >= 2 ? ` 지금 갭에서 L<sub>π</sub> ≈ ${n1(r.Lpi)} µm.` : ' L을 바꾸며 CROSS가 최대가 되는 점을 찾으세요.') };
      if (!done.half) return { h: '이제 절반만 넘겨 3-dB 커플러를 만드세요', b: 'CROSS = sin²(πL/2L<sub>π</sub>)이므로 L = L<sub>π</sub>/2에서 50:50이 됩니다.' + (t >= 2 ? ` 목표 L ≈ ${n1(r.Lpi / 2)} µm.` : '') };
      if (c.ob1 && !c.ob2 && (r.kband > l.s2.dkb || d.L > l.s2.size)) {
        let rec = null;
        if (t >= 2) { const P = PR(l); for (let g = P[0].max; g >= P[0].min - 1e-9; g -= P[0].step) { const gg = +g.toFixed(2), L = snapP(P[1], Lpi(l, gg) / 2), rr = K.evaluate(l, { g: gg, L }); if (rr.kband <= l.s2.dkb * 0.9 && L <= l.s2.size && Math.abs(rr.k - 0.5) <= l.s2.dk) { rec = { g: gg, L }; break; } } }
        return { h: '파장이 바뀌면 분배비가 흔들립니다', b: '파장이 길어지면 모드가 퍼져 결합이 강해집니다(Δn↑). 갭이 넓을수록 결합이 모드 꼬리에 더 의존해 파장 의존성이 커지고 결합기도 길어집니다. 갭을 줄이고 L을 다시 L<sub>π</sub>/2에 맞춰 보세요.' + (rec ? ` 예: 갭 ≈ ${rec.g.toFixed(2)} µm, L ≈ ${rec.L.toFixed(1)} µm.` : '') };
      }
      if (c.ob2 && c.fab && c.fab.yield < l.fab.y) return { h: '방향성 결합기는 공정에 민감합니다', b: 'CD가 커지면 도파로는 넓어지고 갭은 좁아져 Δn이 크게 변합니다. 짧은(좁은 갭) 결합기가 상대적으로 둔감합니다. 그래도 한계가 있어서 다음 레벨의 MMI가 등장합니다 — MMI는 같은 3-dB 기능을 훨씬 공정에 둔감하게 해냅니다.' };
      return null;
    },
    card(l, r) { return { kind: 'dc', lines: [`CROSS ${(r.k * 100).toFixed(1)}%`, `L ${r.d.L.toFixed(1)} µm · g ${r.d.g.toFixed(2)}`], model: { k: +r.k.toFixed(4), kband: +r.kband.toFixed(4), g: r.d.g, L: r.d.L } }; },
    aiStarts: (l) => [l.start, { g: l.start.g, L: Lpi(l, l.start.g) / 2 }],
    _x: { dn, cross, Lpi }
  };
  return K;
})();
