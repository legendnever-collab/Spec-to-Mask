// ===== Kind: strip waveguide — TE/TM, single-mode vs multimode =====
// Modes from the offline semi-vectorial 2D solver (quasi-TE Ex / quasi-TM Ey) per platform (WGP).
KINDS.wg = (() => {
  const T = (l) => WGP[l.pf.id];
  const GUIDE = 0.003;
  const modeAt = (tb, arr, j, w) => linterp(tb.ws, arr.map((a) => (a.length > j ? a[j] : tb.nox - 0.2)), w);
  const lossC = (l) => (l.pf.mat === 'si' ? { base: 0.5, C: 0.35 } : { base: l.pf.lam > 1.4 ? 0.35 : 0.2, C: 0.04 });
  // values at width w and thickness offset dt (fab)
  function at(l, w, dt) {
    const tb = T(l), ts = tb.ts, tt = l.pf.t + (dt || 0);
    const it = tt <= ts[1] ? 0 : 1, ft = (tt - ts[it]) / (ts[it + 1] - ts[it]);
    const mixT = (key, sub) => { const a = tb[key][String(ts[it])], b = tb[key][String(ts[it + 1])]; const fa = linterp(tb.ws, a.map(sub), w), fb = linterp(tb.ws, b.map(sub), w); return fa + (fb - fa) * ft; };
    const n0 = (ww) => { const a = tb.te0[String(ts[it])], b = tb.te0[String(ts[it + 1])]; const fa = linterp(tb.ws, a.map((x) => x[1]), ww), fb = linterp(tb.ws, b.map((x) => x[1]), ww); return fa + (fb - fa) * ft; };
    const te0 = n0(w), te1 = mixT('te1', (x) => x), tm0 = mixT('tm0', (x) => x);
    const dndw = (n0(w + 0.01) - n0(w - 0.01)) / 0.02, L = lossC(l), alpha = L.base + L.C * dndw * dndw;
    return { te0, te1, tm0, dndw, alpha, single: te1 < tb.nox + GUIDE && te0 > tb.nox + GUIDE };
  }
  function wcAt(l, dt) { // TE1 cut-off width (bisection on the interpolated table)
    let a = T(l).ws[0], b = T(l).ws[T(l).ws.length - 1];
    if (at(l, a, dt).te1 >= T(l).nox + GUIDE) return a;
    for (let i = 0; i < 40; i++) { const m = 0.5 * (a + b); if (at(l, m, dt).te1 < T(l).nox + GUIDE) a = m; else b = m; }
    return 0.5 * (a + b);
  }
  function wTE2(l) { const tb = T(l); for (let w = tb.ws[0]; w <= tb.ws[tb.ws.length - 1]; w += 0.005) if (modeAt(tb, tb.te, 2, w) > tb.nox + GUIDE) return w; return tb.ws[tb.ws.length - 1]; }
  function wEqual(l) { // TE0 = TM0 width
    const tb = T(l); let best = tb.ws[0], bd = Infinity;
    for (let w = tb.ws[0]; w <= tb.ws[tb.ws.length - 1]; w += 0.002) { const dd = Math.abs(modeAt(tb, tb.te, 0, w) - modeAt(tb, tb.tm, 0, w)); if (dd < bd) { bd = dd; best = w; } }
    return best;
  }
  const PR = (l) => (l.pf.mat === 'si' ? { k: 'w', label: '도파로 폭', sym: 'w', min: 0.2, max: 2.0, step: 0.01, dec: 2, unit: 'µm' } : { k: 'w', label: '도파로 폭', sym: 'w', min: 0.4, max: 3.0, step: 0.02, dec: 2, unit: 'µm' });
  const MISS = [
    { id: 'multi', label: '멀티모드: TE 모드 3개 이상' },
    { id: 'single', label: '단일모드: TE0만 guided' },
    { id: 'pol', label: 'TE0와 TM0의 n<sub>eff</sub>가 같아지는 폭' }
  ];
  const q2of = (l, r) => Math.max(r.alpha / l.s2.alpha, (r.d.w + l.s2.margin) / r.wc, r.single ? 0 : 2);
  const K = {
    title: 'Waveguide', aspect: 0.5, noSize: true, sizeLabel: '폭', sizeUnit: 'µm', primaryLabel: '산란 손실 dB/cm', cheap: true,
    params: (l) => [PR(l)],
    landKeys: () => [],
    violation: () => 0,
    missions: () => MISS,
    missionDone(l, r, id) {
      if (id === 'multi') return r.nTE >= 3;
      if (id === 'single') return r.nTE === 1;
      return Math.abs(r.te[0] - r.tm[0]) <= 0.01 && r.nTE >= 1 && r.nTM >= 1;
    },
    evaluate(l, d, proc) {
      const tb = T(l), w = d.w + (proc ? proc.dw : 0), dt = proc ? proc.dt : 0;
      const te = [0, 1, 2, 3].map((j) => modeAt(tb, tb.te, j, w)), tm = [0, 1, 2].map((j) => modeAt(tb, tb.tm, j, w));
      const a = at(l, w, dt), nTE = te.filter((v) => v > tb.nox + GUIDE).length, nTM = tm.filter((v) => v > tb.nox + GUIDE).length;
      const wc = wcAt(l, 0);
      return { d: { ...d }, te, tm, nTE: proc ? (a.single ? 1 : 2) : nTE, nTM, single: proc ? a.single : nTE === 1, alpha: a.alpha, dndw: a.dndw, wc, size: d.w, drc: [], primary: a.alpha, secondary: wc - d.w };
    },
    perf(l, r) { return 500 * clamp(1.5 - q2of(l, r), 0, 1); },
    comp(l, r, done) { return 300 * done / MISS.length; },
    q1: (l, r) => (r.single ? 0.5 : 1.5), q2: q2of,
    objectives(l, r) {
      return { t1: [], t2: [
        { k: '단일모드 (TE1 차단)', v: r.single ? '단일' : `TE ${r.nTE}개`, ok: r.single },
        { k: `CD +${Math.round(l.s2.margin * 1000)} nm에도 단일모드`, v: `여유 ${Math.round((r.wc - r.d.w) * 1000)} nm`, ok: r.d.w + l.s2.margin <= r.wc },
        { k: `산란 손실 ≤ ${fmtT(l.s2.alpha)} dB/cm`, v: f2(r.alpha) + ' dB/cm', ok: r.alpha <= l.s2.alpha }] };
    },
    fabPass: (l, r) => r.single && r.alpha <= l.fab.alpha,
    fabCrit: (l) => `단일모드 · 손실 ≤ ${fmtT(l.fab.alpha)} dB/cm`,
    meta(l, r) { const tb = T(l); return `${l.pf.short} · ${MATS[l.pf.mat].full} · SiO₂ 클래딩 (BOX + 상부)<br>n<sub>core</sub> <b>${tb.nco.toFixed(3)}</b> · n<sub>SiO₂</sub> <b>${tb.nox.toFixed(4)}</b> · semi-vectorial 2D 모드 솔버 테이블`; },
    tiles(l, r) { return [['TE 모드', `${r.nTE}<small>개</small>`], ['TM 모드', `${r.nTM}<small>개</small>`], ['TE0 n<sub>eff</sub>', `${r.te[0].toFixed(3)}`], ['산란 손실', `${f2(r.alpha)}<small>dB/cm</small>`]]; },
    hint(l, r) {
      return `TE1 차단 폭 w<sub>c</sub> ≈ <b>${(r.wc * 1000).toFixed(0)} nm</b> (n<sub>eff</sub>(TE1) = n<sub>SiO₂</sub>)<br>TE0 = TM0 폭 ≈ <b>${(wEqual(l) * 1000).toFixed(0)} nm</b> (단면이 정사각형에 가까울 때)<br>산란 손실 ∝ (∂n<sub>eff</sub>/∂w)²: 좁을수록 모드가 측벽을 강하게 느낌. 현재 ∂n<sub>eff</sub>/∂w = ${r.dndw.toFixed(2)}/µm`;
    },
    draw(cv, l, r, ui) {
      const ctx = cv.getContext('2d'), W = cv.width, H = cv.height, tb = T(l), p = PR(l);
      ctx.fillStyle = '#0b1220'; ctx.fillRect(0, 0, W, H);
      const pad = 10 * DPR, plotW = W * 0.56, x0 = pad + 34 * DPR, x1 = plotW - pad, y0 = pad + 6 * DPR, y1 = H - pad - 20 * DPR;
      const nmin = tb.nox - 0.06, nmax = Math.max(...tb.te.map((a) => a[0])) + 0.04;
      const X = (w) => x0 + (w - p.min) / (p.max - p.min) * (x1 - x0), Y = (n) => y1 - (n - nmin) / (nmax - nmin) * (y1 - y0);
      ctx.fillStyle = 'rgba(100,120,150,0.18)'; ctx.fillRect(x0, Y(tb.nox), x1 - x0, y1 - Y(tb.nox));
      ctx.strokeStyle = 'rgba(158,171,189,0.7)'; ctx.setLineDash([4 * DPR, 3 * DPR]); ctx.beginPath(); ctx.moveTo(x0, Y(tb.nox)); ctx.lineTo(x1, Y(tb.nox)); ctx.stroke(); ctx.setLineDash([]);
      ctx.font = `${9.5 * DPR}px "IBM Plex Mono", monospace`; ctx.fillStyle = 'rgba(158,171,189,0.95)'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText(`n_SiO₂ ${tb.nox.toFixed(3)} · 아래는 차단(cut-off)`, x0 + 4 * DPR, Y(tb.nox) + 3 * DPR);
      const curve = (arr, j, col, dash) => {
        ctx.strokeStyle = col; ctx.lineWidth = 1.8 * DPR; ctx.setLineDash(dash ? [5 * DPR, 3 * DPR] : []); ctx.beginPath(); let on = false;
        for (let i = 0; i <= 120; i++) { const w = p.min + (p.max - p.min) * i / 120, n = modeAt(tb, arr, j, w); if (n < nmin) { on = false; continue; } const xx = X(w), yy = Y(n); if (on) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy); on = true; }
        ctx.stroke(); ctx.setLineDash([]);
      };
      const teC = ['#f2b04a', '#e8894a', '#d9684d', '#c0504f'], tmC = ['#64c9df', '#4fa6c9', '#3f86b0'];
      [0, 1, 2, 3].forEach((j) => curve(tb.te, j, teC[j], false)); [0, 1, 2].forEach((j) => curve(tb.tm, j, tmC[j], true));
      // current width + guided markers
      const cx = X(r.d.w); ctx.strokeStyle = 'rgba(231,236,243,0.9)'; ctx.lineWidth = 1.2 * DPR; ctx.beginPath(); ctx.moveTo(cx, y0); ctx.lineTo(cx, y1); ctx.stroke();
      if (ui.hintTier >= 2) { const xc = X(r.wc); ctx.strokeStyle = 'rgba(242,176,74,0.7)'; ctx.setLineDash([3 * DPR, 3 * DPR]); ctx.beginPath(); ctx.moveTo(xc, y0); ctx.lineTo(xc, y1); ctx.stroke(); ctx.setLineDash([]); cvPill(ctx, `w_c ${(r.wc * 1000).toFixed(0)} nm`, xc + 3 * DPR, y0 + 8 * DPR, 'left', 'rgba(242,176,74,0.95)'); }
      r.te.forEach((n, j) => { if (n > tb.nox + GUIDE) { ctx.fillStyle = teC[j]; ctx.beginPath(); ctx.arc(cx, Y(n), 3.5 * DPR, 0, 7); ctx.fill(); } });
      r.tm.forEach((n, j) => { if (n > tb.nox + GUIDE) { ctx.strokeStyle = tmC[j]; ctx.lineWidth = 1.5 * DPR; ctx.beginPath(); ctx.arc(cx, Y(n), 3.5 * DPR, 0, 7); ctx.stroke(); } });
      ctx.fillStyle = 'rgba(158,171,189,0.9)'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      for (let k = 0; k <= 4; k++) { const w = p.min + (p.max - p.min) * k / 4; ctx.fillText(w.toFixed(1), X(w), y1 + 4 * DPR); }
      ctx.textAlign = 'right'; ctx.fillText('폭 µm', x1, y1 + 4 * DPR);
      ctx.save(); ctx.translate(pad + 4 * DPR, (y0 + y1) / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.fillText('n_eff', 0, 0); ctx.restore();
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      [[nmax - 0.02, 'TE (실선)', '#f2b04a'], [nmax - 0.02 - (nmax - nmin) * 0.08, 'TM (점선)', '#64c9df']].forEach(([n, t, c]) => { ctx.fillStyle = c; ctx.fillText(t, x1 - 2 * DPR, Y(n)); });
      // mode tiles at nearest tabulated width that has images
      const idxs = Object.keys(tb.img).map(Number); let bi = idxs[0]; idxs.forEach((i) => { if (Math.abs(tb.ws[i] - r.d.w) < Math.abs(tb.ws[bi] - r.d.w)) bi = i; });
      const ims = tb.img[String(bi)] || {}, gx = plotW + 4 * DPR, gw = W - gx - pad, tw = (gw - 6 * DPR) / 2, th = Math.min((H - 2 * pad - 30 * DPR) / 2, tw * 0.6 + 16 * DPR);
      const names = ['TE0', 'TE1', 'TM0', 'TM1'], wImg = tb.ws[bi];
      names.forEach((nm, k) => {
        const tx = gx + (k % 2) * (tw + 6 * DPR), ty = pad + 14 * DPR + Math.floor(k / 2) * (th + 8 * DPR), ih = th - 16 * DPR;
        ctx.fillStyle = '#0f1726'; ctx.fillRect(tx, ty, tw, th);
        if (ims[nm]) {
          const bin = atob(ims[nm]), n = 40 * 24, off = K._off || (K._off = document.createElement('canvas'));
          off.width = 40; off.height = 24; const octx = off.getContext('2d'), img = octx.createImageData(40, 24);
          for (let i = 0; i < n; i++) { const v = Math.round(255 * Math.pow(bin.charCodeAt(i) / 255, 0.6)); img.data[i * 4] = FIELD_LUT[v * 3]; img.data[i * 4 + 1] = FIELD_LUT[v * 3 + 1]; img.data[i * 4 + 2] = FIELD_LUT[v * 3 + 2]; img.data[i * 4 + 3] = 255; }
          octx.putImageData(img, 0, 0); ctx.imageSmoothingEnabled = true; ctx.drawImage(off, tx, ty + 14 * DPR, tw, ih);
        }
        const sx = tw / (2 * tb.win[0]), sy = ih / (2 * tb.win[1]);
        ctx.strokeStyle = 'rgba(231,236,243,0.85)'; ctx.lineWidth = 1 * DPR; ctx.strokeRect(tx + tw / 2 - wImg / 2 * sx, ty + 14 * DPR + ih / 2 - l.pf.t / 2 * sy, wImg * sx, l.pf.t * sy);
        const guided = !!ims[nm];
        ctx.font = `${9.5 * DPR}px "IBM Plex Mono", monospace`; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = nm.startsWith('TE') ? '#f2b04a' : '#64c9df';
        ctx.fillText(`${nm} · ${nm.startsWith('TE') ? 'Ex' : 'Ey'}`, tx + 3 * DPR, ty + 2 * DPR);
        if (!guided) { ctx.fillStyle = 'rgba(158,171,189,0.9)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('차단', tx + tw / 2, ty + 14 * DPR + ih / 2); }
      });
      ctx.fillStyle = 'rgba(158,171,189,0.85)'; ctx.font = `${9.5 * DPR}px "IBM Plex Mono", monospace`; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText(`|E|² 단면 · w = ${(wImg * 1000).toFixed(0)} nm 근사`, gx, pad);
    },
    chartTitle: () => '폭에 따른 산란 손실과 모드 영역',
    chart(l, r) {
      const p = PR(l), wc = r.wc, pts = [];
      for (let i = 0; i <= 100; i++) { const w = p.min + (p.max - p.min) * i / 100; pts.push([w, at(l, w, 0).alpha]); }
      const ymax = Math.max(1, Math.min(12, Math.ceil(at(l, Math.max(p.min, wc * 0.6), 0).alpha * 1.2)));
      const html = svgChart({ x0: p.min, x1: p.max, y0: 0, y1: ymax, aria: '폭 대비 손실', xticks: [0, 1, 2, 3, 4].map((k) => +(p.min + (p.max - p.min) * k / 4).toFixed(2)), yticks: [0, ymax / 2, ymax].map((v) => +v.toFixed(1)), ylab: 'dB/cm', xlab: '폭 µm',
        bands: [[p.min, wc, 'rgba(93,209,147,0.10)'], [wc, p.max, 'rgba(242,176,74,0.06)']], vlines: [{ x: wc, color: 'rgba(242,176,74,.7)' }, { x: r.d.w, color: 'rgba(231,236,243,.8)' }],
        hlines: [{ y: l.s2.alpha, label: `★★ ${fmtT(l.s2.alpha)} dB/cm` }], series: [{ pts, color: 'var(--amber)', width: 2.2 }], marks: [{ x: r.d.w, y: r.alpha }] });
      return { html, legend: legendHTML([['rgba(93,209,147,.45)', '단일모드 영역'], ['rgba(242,176,74,.35)', '멀티모드 영역'], ['var(--amber)', '산란 손실 (∝ (∂n/∂w)²)']]) };
    },
    coach(l, r, c) {
      const t = c.tier, done = c.missions || {}, nm = (v) => `${Math.round(v * 1000)} nm`;
      if (!done.multi) return { h: '먼저 멀티모드를 관찰해 봅시다', b: '폭을 넓히면 고차 모드(TE1, TE2…)의 n<sub>eff</sub>가 클래딩(SiO₂)보다 커져 guided 됩니다. 오른쪽 단면에서 TE1은 마디(node)가 하나 있는 모양입니다. TE 모드가 3개 이상 될 때까지 넓혀 보세요.' + (t >= 2 ? ` TE2가 guided 되는 폭은 대략 ${nm(wTE2(l))} 이상입니다.` : '') };
      if (!done.single) return { h: '이제 단일모드로 줄이세요', b: '폭을 줄이면 TE1의 n<sub>eff</sub>가 SiO₂ 굴절률 아래로 내려가 차단(cut-off)됩니다. 그 아래 폭에서는 TE0만 전파합니다. 일반 배선 도파로는 이 조건에서 씁니다.' + (t >= 2 ? ` TE1 차단 폭 ≈ ${nm(r.wc)}.` : '') };
      if (!done.pol) return { h: 'TE와 TM을 비교해 보세요', b: `TE(Ex)는 폭 방향, TM(Ey)은 두께 방향 전기장입니다. 두께 ${nm(l.pf.t)}로 얇은 도파로에서는 TM이 덜 갇혀 n<sub>eff</sub>가 낮습니다. 폭을 두께와 비슷하게 만들면 두 편광의 n<sub>eff</sub>가 같아집니다.` + (t >= 2 ? ` 목표 폭 ≈ ${nm(wEqual(l))}.` : '') };
      if (!r.single) return { h: '★★: 단일모드 안에서 설계하세요', b: '배선 도파로는 단일모드여야 합니다. 폭을 TE1 차단 폭 아래로 줄이세요.' };
      if (r.d.w + l.s2.margin > r.wc) return { h: '차단 폭에 너무 가깝습니다', b: `CD가 ${Math.round(l.s2.margin * 1000)} nm만 커져도 TE1이 살아나 멀티모드가 됩니다. 폭을 조금 줄이세요.` + (t >= 2 ? ` 최대 폭 ≈ ${nm(r.wc - l.s2.margin)}.` : '') };
      if (r.alpha > l.s2.alpha) return { h: '측벽 산란 손실이 큽니다', b: '좁은 도파로일수록 모드가 측벽 거칠기를 강하게 느낍니다(∂n<sub>eff</sub>/∂w가 큼). 단일모드 여유를 지키는 한도에서 폭을 넓히세요. 이 두 조건 사이의 좁은 창을 찾는 것이 핵심입니다.' + (t >= 2 ? ` 창: ${nm(l.s2.wlo || r.wc * 0.8)} ~ ${nm(r.wc - l.s2.margin)}.` : '') };
      return null;
    },
    card(l, r) { return { kind: 'wg', lines: [`w ${Math.round(r.d.w * 1000)} nm · 단일모드`, `${f2(r.alpha)} dB/cm`], model: { w: r.d.w, neff: +r.te[0].toFixed(4), alpha: +r.alpha.toFixed(3), wc: +r.wc.toFixed(3) } }; },
    aiStarts: (l) => [l.start],
    _x: { at, wcAt, wEqual }
  };
  return K;
})();
