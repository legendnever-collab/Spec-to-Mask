// ===== Kind: MMI splitter / coupler (EIM + eigenmode expansion) =====
KINDS.mmi = (() => {
  // parameter ranges depend on the platform (Si vs SiN index contrast)
  const RANGES = {
    si: { W: [1.5, 6, 0.05, 2], L: [2, 80, 0.1, 1], wt: [0.4, 2.0, 0.02, 2], s: [0.5, 4.5, 0.02, 2] },
    sin: { W: [3, 16, 0.1, 1], L: [5, 400, 0.5, 1], wt: [0.8, 5, 0.05, 2], s: [1.2, 12, 0.05, 2] }
  };
  const LBL = { W: ['MMI 폭', 'W'], L: ['MMI 길이', 'L'], wt: ['테이퍼 끝 폭', 'wₜ'], s: ['포트 피치', 's'] };
  const PC = {};
  const Pof = (l) => { const m = l.pf.mat; if (!PC[m]) { PC[m] = {}; Object.keys(LBL).forEach((k) => { const [a, b, st, dec] = RANGES[m][k]; PC[m][k] = { k, label: LBL[k][0], sym: LBL[k][1], min: a, max: b, step: st, dec, unit: 'µm' }; }); } return PC[m]; };
  const GC = {};
  const grids = (l) => { const m = l.pf.mat; if (!GC[m]) { const P = Pof(l), L = [], S = [], dl = P.L.step * 2; for (let v = P.L.min; v <= P.L.max + 1e-9; v += dl) L.push(+v.toFixed(2)); for (let v = P.s.min; v <= P.s.max + 1e-9; v += P.s.step) S.push(+v.toFixed(2)); GC[m] = { L, S }; } return GC[m]; };
  const RU = () => PQ.PF.rules;
  const full = (l, d) => ({ type: l.type, W: d.W, L: d.L, wt: d.wt, s: d.s });
  const r1 = (l, r) => (l.type === '1x2' ? r.el / l.s1.el : Math.max(r.el / l.s1.el, Math.abs(r.imb) / l.s1.imb));
  const r2 = (l, r) => (l.type === '1x2' ? r.el / l.s2.el : Math.max(r.el / l.s2.el, Math.abs(r.imb) / l.s2.imb));
  function lpiInfo(W, lc) {
    const n1 = PQ.slabNeff(lc, PQ.PF.t), n0 = PQ.nOx(lc);
    const We = W + (lc / Math.PI) / Math.sqrt(n1 * n1 - n0 * n0);
    return { We, Lpi: 4 * n1 * We * We / (3 * lc) };
  }
  const K = {
    title: 'MMI',
    sizeLabel: '면적', sizeUnit: 'µm²', primaryLabel: '최악 EL dB', cheap: false,
    params: (l) => { const P = Pof(l); return [P.W, P.L, P.wt, P.s]; },
    landKeys: () => ['L', 's'],
    moveKeys: () => ['s', 'wt'],
    violation(l, d) { const u = RU(); return Math.max(0, u.gap - (d.s - d.wt)) + Math.max(0, d.s / 2 + d.wt / 2 - (d.W / 2 - u.edge)) + Math.max(0, u.wmin - d.wt); },
    evaluate(l, d, proc, opt) {
      const fd = full(l, d), m = PQ.metrics(fd, l.lams, proc);
      const res = { d: fd, m, el: m.worstEL, imb: m.worstImb, size: d.W * d.L, drc: PQ.drc(fd), primary: m.worstEL, secondary: m.worstImb };
      if (opt && opt.full) { res.sol = PQ.solve(fd, l.lc, proc); res.elc = -PQ.dB(res.sol.P[0] + res.sol.P[1]); }
      return res;
    },
    perf(l, r) {
      if (l.type === '1x2') return 500 * clamp(1 - r.el / l.elCap, 0, 1);
      return 250 * clamp(1 - r.el / l.elCap, 0, 1) + 250 * clamp(1 - Math.abs(r.imb) / l.imbCap, 0, 1);
    },
    q1: (l, r) => r1(l, r), q2: (l, r) => r2(l, r),
    objectives(l, r) {
      const single = l.lams.length === 1, lbl = single ? 'EL @ 1310 nm' : '대역 최악 EL', imb = Math.abs(r.imb);
      const t1 = [{ k: `${lbl} ≤ ${fmtT(l.s1.el)}`, v: f2(r.el, 3) + ' dB', ok: r.el <= l.s1.el }];
      if (l.s1.imb != null) t1.push({ k: `|불균형| ≤ ${fmtT(l.s1.imb)}`, v: f2(imb) + ' dB', ok: imb <= l.s1.imb });
      const t2 = [{ k: `${lbl} ≤ ${fmtT(l.s2.el)}`, v: f2(r.el, 3) + ' dB', ok: r.el <= l.s2.el }];
      if (l.s2.imb != null) t2.push({ k: `|불균형| ≤ ${fmtT(l.s2.imb)}`, v: f2(imb) + ' dB', ok: imb <= l.s2.imb });
      return { t1, t2 };
    },
    fabPass: (l, r) => r.el <= l.fab.el && (l.type === '1x2' || Math.abs(r.imb) <= l.fab.imb),
    fabCrit: (l) => (l.type === '1x2' ? `EL ≤ ${fmtT(l.fab.el)} dB` : `EL ≤ ${fmtT(l.fab.el)} dB · |불균형| ≤ ${fmtT(l.fab.imb)} dB`),
    meta(l, r) { return `λ <b>${(l.lc * 1000).toFixed(0)} nm</b> · 가이드 모드 <b>${r.sol.nModes}</b>개 · n<sub>slab</sub> <b>${r.sol.n1.toFixed(3)}</b><br>EIM + 고유모드 전개 surrogate`; },
    tiles(l, r) {
      return [
        ['EL @ λc', `${f2(r.elc, 3)}<small>dB</small>`],
        l.lams.length > 1 ? ['대역 최악 EL', `${f2(r.el, 3)}<small>dB</small>`] : ['가이드 모드', `${r.sol.nModes}<small>개</small>`],
        [l.type === '1x2' ? '불균형' : '대역 최악 불균형', `${f2(r.imb)}<small>dB${l.type === '1x2' ? ' 대칭' : ''}</small>`],
        ['면적', `${r.size.toFixed(1)}<small>µm²</small>`]
      ];
    },
    hint(l, r) {
      const { We, Lpi } = lpiInfo(r.d.W, l.lc);
      return l.type === '1x2'
        ? `W<sub>e</sub> = ${We.toFixed(2)} µm · L<sub>π</sub> = 4n<sub>r</sub>W<sub>e</sub>²/3λ = ${Lpi.toFixed(1)} µm<br>대칭 결상 1×2: L = <b>3L<sub>π</sub>/8 = ${(3 * Lpi / 8).toFixed(1)} µm</b>, 상 위치 ±W<sub>e</sub>/4 → s ≈ <b>${(We / 2).toFixed(2)} µm</b>`
        : `W<sub>e</sub> = ${We.toFixed(2)} µm · L<sub>π</sub> = ${Lpi.toFixed(1)} µm<br>General: L = <b>3L<sub>π</sub>/2 = ${(1.5 * Lpi).toFixed(1)} µm</b> (s 자유)<br>Paired: s = W<sub>e</sub>/3 = <b>${(We / 3).toFixed(2)} µm</b>, L = <b>L<sub>π</sub>/2 = ${(Lpi / 2).toFixed(1)} µm</b>`;
    },
    draw(cv, l, r, ui) {
      const ctx = cv.getContext('2d'), Wc = cv.width, Hc = cv.height, d = r.d, sol = r.sol, g = sol.grid, n = g.n;
      ctx.fillStyle = '#0b1220'; ctx.fillRect(0, 0, Wc, Hc);
      const zin = Math.max(1.2, d.L * 0.15), z0 = -zin, z1 = d.L + zin, xmax = -g.x[0] + PQ.DX / 2;
      const pl = 8 * DPR, pr = 8 * DPR, pt = 8 * DPR, pb = 24 * DPR;
      const zx = (z) => pl + (z - z0) / (z1 - z0) * (Wc - pl - pr), xy = (x) => pt + (xmax - x) / (2 * xmax) * (Hc - pt - pb);
      const nz = 150, nin = 18, nout = 18, cols = nin + nz + nout, I = PQ.fieldMap(sol, d.L, nz);
      const Pin = new Float64Array(n), Pout = new Float64Array(n);
      for (let i = 0; i < n; i++) { Pin[i] = sol.Ein[i] ** 2; Pout[i] = sol.P[0] * sol.outs[0][i] ** 2 + sol.P[1] * sol.outs[1][i] ** 2; }
      let Imax = 0; for (let i = 0; i < n; i++) Imax = Math.max(Imax, Pin[i]);
      for (let i = 0; i < I.length; i++) if (I[i] > Imax) Imax = I[i];
      const off = K._off || (K._off = document.createElement('canvas'));
      off.width = cols; off.height = n;
      const octx = off.getContext('2d'), img = octx.createImageData(cols, n), px = img.data;
      for (let col = 0; col < cols; col++) for (let rr = 0; rr < n; rr++) {
        const i = n - 1 - rr; const v = col < nin ? Pin[i] : col < nin + nz ? I[(col - nin) * n + i] : Pout[i];
        const t = Math.min(255, Math.round(255 * Math.pow(v / Imax, 0.6))), o = (rr * cols + col) * 4;
        px[o] = FIELD_LUT[t * 3]; px[o + 1] = FIELD_LUT[t * 3 + 1]; px[o + 2] = FIELD_LUT[t * 3 + 2]; px[o + 3] = 255;
      }
      octx.putImageData(img, 0, 0);
      ctx.imageSmoothingEnabled = true;
      const y0 = xy(xmax), hh = xy(-xmax) - y0;
      ctx.drawImage(off, 0, 0, nin, n, zx(z0), y0, zx(0) - zx(z0), hh);
      ctx.drawImage(off, nin, 0, nz, n, zx(0), y0, zx(d.L) - zx(0), hh);
      ctx.drawImage(off, nin + nz, 0, nout, n, zx(d.L), y0, zx(z1) - zx(d.L), hh);
      const inX = d.type === '1x2' ? [0] : [-d.s / 2, d.s / 2], outX = [-d.s / 2, d.s / 2];
      ctx.strokeStyle = 'rgba(214,226,242,0.62)'; ctx.lineWidth = Math.max(1, DPR);
      const rect = (za, zb, xc, w) => ctx.strokeRect(zx(za), xy(xc + w / 2), zx(zb) - zx(za), xy(xc - w / 2) - xy(xc + w / 2));
      inX.forEach((x) => rect(z0, 0, x, d.wt)); outX.forEach((x) => rect(d.L, z1, x, d.wt)); rect(0, d.L, 0, d.W);
      if (ui.hintTier >= 2) {
        const { Lpi } = lpiInfo(d.W, l.lc);
        const guides = d.type === '1x2' ? [[3 * Lpi / 8, '3Lπ/8'], [3 * Lpi / 4, '3Lπ/4']] : [[Lpi / 2, 'Lπ/2'], [3 * Lpi / 2, '3Lπ/2']];
        ctx.save(); ctx.setLineDash([4 * DPR, 4 * DPR]); ctx.strokeStyle = 'rgba(242,176,74,0.85)';
        ctx.font = `${10.5 * DPR}px "IBM Plex Mono", monospace`; ctx.fillStyle = 'rgba(242,176,74,0.95)'; ctx.textAlign = 'center';
        guides.forEach(([z, lab]) => { if (z > 0 && z < z1) { const X = zx(z); ctx.beginPath(); ctx.moveTo(X, xy(d.W / 2) - 2 * DPR); ctx.lineTo(X, xy(-d.W / 2) + 2 * DPR); ctx.stroke(); ctx.fillText(lab, X, Math.max(11 * DPR, xy(d.W / 2) - 5 * DPR)); } });
        ctx.restore();
      }
      const names = d.type === '1x2' ? ['OUT1', 'OUT2'] : ['BAR', 'CROSS'];
      [1, 0].forEach((k) => { const Y = xy(outX[k]) + (k === 1 ? -11 : 11) * DPR; cvPill(ctx, `${names[k]} ${(sol.P[k] * 100).toFixed(1)}%`, Wc - pr - 2 * DPR, clamp(Y, pt + 8 * DPR, Hc - pb - 8 * DPR), 'right'); });
      cvPill(ctx, 'IN', pl + 2 * DPR, Math.min(Hc - pb - 8 * DPR, xy(inX[0]) + 12 * DPR), 'left');
      ctx.fillStyle = 'rgba(158,171,189,0.9)'; ctx.strokeStyle = 'rgba(158,171,189,0.5)'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      const st = [0.5, 1, 2, 5, 10, 20].find((s) => d.L / s <= 6) || 20;
      for (let z = 0; z <= d.L + 1e-9; z += st) { const X = zx(z); ctx.beginPath(); ctx.moveTo(X, Hc - pb + 2 * DPR); ctx.lineTo(X, Hc - pb + 6 * DPR); ctx.stroke(); ctx.fillText(String(+z.toFixed(1)), X, Hc - pb + 8 * DPR); }
      ctx.textAlign = 'right'; ctx.fillText('z µm', Wc - pr, Hc - pb + 8 * DPR);
      const sb = xy(-0.5) - xy(0.5), sx = pl + 2 * DPR, sy = pt + 4 * DPR;
      ctx.strokeStyle = 'rgba(231,236,243,0.8)'; ctx.lineWidth = 1.5 * DPR;
      if (sb < Hc * 0.5) { ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, sy + sb); ctx.stroke(); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(231,236,243,0.85)'; ctx.fillText('1 µm', sx + 5 * DPR, sy + sb / 2); }
    },
    chartTitle: (l) => `스펙트럼 · ${Math.round(l.pf.bb[0] * 1000)}–${Math.round(l.pf.bb[1] * 1000)} nm`,
    chart(l, r) {
      const pts = [];
      const [b0w, b1w] = l.pf.bb; for (let i = 0; i <= 20; i++) { const lam = b0w + (b1w - b0w) * i / 20, s = PQ.solve(r.d, lam); pts.push([lam * 1000, s.P[0], s.P[1]]); }
      const n1 = l.type === '1x2' ? ['OUT1', 'OUT2'] : ['BAR', 'CROSS'];
      const b0 = l.lams[0] * 1000, b1 = l.lams[l.lams.length - 1] * 1000;
      const X0 = Math.round(b0w * 1000), html = svgChart({ x0: X0, x1: X0 + 100, y0: -9, y1: 0, aria: '파장별 포트 출력', xticks: [0, 20, 40, 60, 80, 100].map((v) => X0 + v), yticks: [0, -3, -6, -9], ylab: 'dB',
        bands: b1 > b0 ? [[b0, b1]] : [], vlines: b1 > b0 ? [] : [{ x: b0 }], hlines: [{ y: -3.01, label: '이상적 −3.01 dB' }],
        series: [{ pts: pts.map((p) => [p[0], PQ.dB(p[1] + p[2])]), color: 'var(--fg-2)', width: 1.5 }, { pts: pts.map((p) => [p[0], PQ.dB(p[2])]), color: 'var(--rose)' }, { pts: pts.map((p) => [p[0], PQ.dB(p[1])]), color: 'var(--amber)', dash: l.type === '1x2' ? '6 4' : '' }] });
      return { html, legend: legendHTML([['var(--fg-2)', '합계 (−EL)'], ['var(--rose)', n1[1]], ['var(--amber)', n1[0]], ['rgba(242,176,74,.35)', l.bandLabel]]) };
    },
    // cheap sweeps reusing cached per-λ modal solutions
    land(l, r, k) {
      const d = r.d;
      const G = grids(l), u = RU();
      if (k === 'L') return { xs: G.L, rs: PQ.landscapeL(r.m.rows, G.L) };
      const SGRID = G.S, valid = SGRID.filter((s) => s - d.wt >= u.gap - 1e-6 && s / 2 + d.wt / 2 <= d.W / 2 - u.edge + 1e-6);
      const vals = PQ.landscapeS(d, r.m.rows, valid), mp = new Map(valid.map((s, i) => [s, vals[i]]));
      return { xs: SGRID, rs: SGRID.map((s) => mp.get(s) || null) };
    },
    landDeps: (k, d) => (k === 'L' ? [d.W, d.wt, d.s] : [d.W, d.wt, d.L]),
    moveCandidates(l, r, land) {
      const out = [], d = r.d, L = land.L; if (!L) return out;
      L.xs.forEach((x, i) => { if (x !== d.L && Math.abs(x - d.L) <= 3 && L.rs[i]) out.push({ k: 'L', to: x, r: L.rs[i] }); });
      return out;
    },
    coach(l, r, c) {
      const t = c.tier, d = r.d, n = (v, k = 2) => v.toFixed(k), { We, Lpi } = lpiInfo(d.W, l.lc), u = RU(), P = Pof(l);
      if (r.drc.length) {
        const gap = d.s - d.wt, edge = d.W / 2 - (d.s / 2 + d.wt / 2), fl = (v) => Math.floor(v * 50 + 1e-6) / 50;
        if (d.wt < u.wmin - 1e-6) return { h: 'DRC · 테이퍼가 너무 좁습니다', b: `wₜ를 ${n(u.wmin)} µm 이상으로 키우세요.` };
        if (gap < u.gap - 1e-6) {
          const wtFix = fl(d.s - u.gap), okW = wtFix >= u.wmin;
          return { h: 'DRC · 두 포트가 너무 가깝습니다', b: (okW ? '테이퍼 폭 wₜ를 줄이세요. 포트 피치 s는 상 위치에 맞춰져 있을 때 그대로 두는 편이 좋습니다.' : '포트 피치 s를 키우세요.') + (t >= 2 ? ` 현재 간격 ${n(gap)} µm, 최소 ${n(u.gap)} µm → ${okW ? `wₜ ≤ ${n(wtFix)} µm (권장) 또는 ` : ''}s ≥ ${n(d.wt + u.gap)} µm.` : '') };
        }
        const wtMax = fl(d.W - d.s - 2 * u.edge), sMax = fl(d.W - d.wt - 2 * u.edge), opts = [];
        if (wtMax >= u.wmin && d.s - wtMax >= u.gap - 1e-6) opts.push(`wₜ ≤ ${n(wtMax)} µm`);
        if (sMax - d.wt >= u.gap - 1e-6) opts.push(`s ≤ ${n(sMax)} µm`);
        if (!opts.length) { const sT = snapP(P.s, l.type === '1x2' ? We / 2 : Math.max(We / 3, u.wmin + u.gap)), wT = fl(Math.min(sT - u.gap - 0.02, d.W - sT - 2 * u.edge)); if (wT >= u.wmin) opts.push(`s ${n(sT)} · wₜ ${n(wT)} µm로 함께 조정`); }
        opts.push(`W ≥ ${n(d.s + d.wt + 2 * u.edge)} µm`);
        return { h: 'DRC · 포트가 MMI 경계를 넘습니다', b: 's나 wₜ를 줄이거나 W를 키우세요.' + (t >= 2 ? ` 가장자리 여유 ${n(edge)} µm (최소 ${n(u.edge)}) → ${opts.join(' 또는 ')}.` : '') };
      }
      const qCur = r1(l, r), L = c.land.L;
      if (L) {
        const q = L.rs.map((x) => r1(l, x)); let tgt = -1, dist = Infinity, gmin = 0;
        q.forEach((v, i) => { if (v < q[gmin]) gmin = i; if (v <= 1 && Math.abs(L.xs[i] - d.L) < dist) { dist = Math.abs(L.xs[i] - d.L); tgt = i; } });
        if (tgt < 0) tgt = gmin;
        if (qCur > 1 && Math.abs(L.xs[tgt] - d.L) >= 0.2 && qCur - q[tgt] > 0.1) {
          const x = L.rs[tgt], up = L.xs[tgt] > d.L;
          let b = `L을 ${up ? '늘리세요 (→)' : '줄이세요 (←)'}. 지금 길이에서는 출력면에 상이 포트 위로 맺히지 않아 빛이 포트 사이와 MMI 벽으로 흩어집니다.`;
          if (t >= 2) b += ` 목표 L ≈ ${L.xs[tgt].toFixed(1)} µm (최악 EL ${n(x.el, 3)} dB${l.type === '2x2' ? `, 불균형 ${n(x.imb)} dB` : ''}).`;
          if (q[tgt] > 1) b += ' 이 W·s 조합으로는 L만으로 ★ 스펙이 안 나오니, L을 맞춘 다음 포트를 조정해야 합니다.';
          return { h: '길이 L이 결상점에서 벗어나 있습니다', b };
        }
      }
      const ev = (dd) => K.evaluate(l, dd);
      if (l.type === '1x2') {
        const sI = We / 2, sIs = snapP(P.s, sI);
        const tryS = Math.abs(d.s - sI) > 0.08 && !PQ.drc({ ...d, s: sIs }).length ? ev({ ...d, s: sIs }) : null;
        if (tryS && r1(l, tryS) < qCur - 0.05 && (qCur > 1 || !c.ob2)) {
          let b = `두 상은 중심에서 ±W<sub>e</sub>/4에 맺힙니다. s를 ${d.s < sI ? '키우세요' : '줄이세요'}.`;
          if (t >= 2) b += ` 목표 s ≈ ${n(sIs)} µm (W<sub>e</sub> = ${n(We)} µm).`;
          return { h: '출력 포트가 상 위치와 어긋나 있습니다', b };
        }
      } else {
        const sP = We / 3, dv = Math.abs(d.s - sP), sPs = snapP(P.s, sP);
        const tryP = dv < 0.3 && dv > 0.06 && qCur > 1 && !PQ.drc({ ...d, s: sPs }).length ? ev({ ...d, s: sPs }) : null;
        if (tryP && r1(l, tryP) < qCur - 0.05) return { h: 'Paired interference 쪽으로 가보세요', b: `포트를 ±W<sub>e</sub>/6 근처에 두면 L<sub>π</sub>/2의 짧은 결상이 됩니다. s를 ${d.s < sP ? '키우세요' : '줄이세요'}.` + (t >= 2 ? ` s ≈ ${n(sPs)} µm로 옮긴 뒤 L을 다시 맞추세요 (해석값 L<sub>π</sub>/2 ≈ ${n(Lpi / 2, 1)} µm).` : '') };
      }
      const wMax = Math.min(d.s - u.gap - 0.02, d.W - d.s - 2 * u.edge - 0.02, P.wt.max);
      if ((qCur > 1 || !c.ob2) && d.wt < wMax - 2 * P.wt.step) {
        const w2 = snapP(P.wt, Math.min(wMax, d.wt + 10 * P.wt.step)), m2 = ev({ ...d, wt: w2 });
        if (qCur - r1(l, m2) > 0.05) return { h: '테이퍼가 좁아 상을 다 받지 못합니다', b: 'wₜ를 넓히면 출력 상과 포트 모드의 overlap이 커져 손실이 줄어듭니다.' + (t >= 2 ? ` wₜ = ${n(w2)} µm이면 최악 EL ${n(m2.el, 3)} dB.` : '') };
      }
      if (l.lams.length > 1 && !c.ob1 && r.elc != null && r.el - r.elc > 0.08) return { h: '대역 끝에서 손실이 커집니다', b: '결상 길이 L<sub>π</sub> ∝ W²/λ 이라 긴 MMI일수록 대역 끝에서 결상점이 크게 밀립니다. W를 줄여 MMI를 짧게 만드세요.' + (t >= 2 ? ` 현재 λc EL ${n(r.elc, 3)} dB vs 대역 최악 ${n(r.el, 3)} dB.` : '') };
      if (c.ob1 && !c.ob2 && r.size > l.s2.size) {
        if (L) {
          let sh = -1, shv = Infinity;
          L.rs.forEach((x, i) => { if (!x || d.W * L.xs[i] > l.s2.size) return; const v = Math.max(r1(l, x), r2(l, x)); if (v <= 1 && v < shv) { shv = v; sh = i; } });
          if (sh >= 0) return { h: `★★ 면적 ${l.s2.size} µm² 초과 (현재 ${n(r.size, 1)})`, b: '지금 W에서도 더 짧은 결상점이 있습니다. 같은 W에서 L을 줄여 그 점을 찾으세요.' + (t >= 2 ? ` L ≈ ${L.xs[sh].toFixed(1)} µm → 면적 ${n(d.W * L.xs[sh], 1)} µm², ★★ 성능 충족.` : '') };
        }
        const ref = l.ref; let b = '결상 길이가 W²에 비례하므로, W를 줄이면 면적이 빠르게 줄어듭니다. W를 바꾼 뒤 L과 s를 다시 맞추세요.';
        if (t >= 2 && ref) b += t >= 3 ? ` 검증된 출발점: W ${n(ref.W)} · L ${n(ref.L, 1)} · s ${n(ref.s)} · wₜ ${n(ref.wt)} µm.` : ` 출발점: W ≈ ${n(ref.W, 1)} µm, s ≈ ${n(ref.s, 1)} µm. 두 값을 바꾼 뒤 L과 wₜ는 코치를 따라 맞추세요.`;
        return { h: `★★ 면적 ${l.s2.size} µm² 초과 (현재 ${n(r.size, 1)})`, b };
      }
      return null;
    },
    card(l, r) {
      return { kind: 'mmi', lines: [`EL ${f2(r.el, 3)} dB`, l.type === '2x2' ? `불균형 ${f2(r.imb)} dB` : `면적 ${f2(r.size, 1)} µm²`],
        model: { type: l.type, lams: l.lams, el: r.m.rows.map((x) => +x.el.toFixed(4)), imb: r.m.rows.map((x) => +x.imb.toFixed(4)) } };
    },
    // layout intent for tools/smq2gds (the surrogate treats the w0 → wₜ taper as adiabatic; the GDS draws it)
    exportGeom(l, r) {
      const d = r.d, pf = l.pf;
      return { pcell: 'mmi', type: l.type, W_um: d.W, L_um: d.L, wt_um: d.wt, s_um: d.s, gap_mmi_um: +(d.s - d.wt).toFixed(4), w_io_um: pf.w0,
        taper_len_um: pf.mat === 'si' ? 10 : 30, lc_um: l.lc, lams_um: l.lams,
        predicted_per_lam: r.m.rows.map((x) => ({ lam_um: x.l, P_out: x.P.map((v) => +v.toFixed(5)), el_dB: +x.el.toFixed(4), imb_dB: +x.imb.toFixed(4) })) };
    },
    aiStarts(l) {
      const S0 = l.start, { We, Lpi } = lpiInfo(S0.W, l.lc);
      const phys = l.type === '1x2' ? { ...S0, L: 3 * Lpi / 8, s: We / 2 } : { ...S0, L: Lpi / 2, s: We / 3, wt: 0.8 };
      return [S0, phys];
    }
  };
  return K;
})();
