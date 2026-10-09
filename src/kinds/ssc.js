// ===== Kind: Si inverse-taper edge coupler (spot-size converter) =====
// Modes from the offline semi-vectorial 2D solver (SSC_T). Facet: overlap with Gaussian fiber mode.
// Taper: first-order coupled local-mode theory (coherent sum of step couplings with sinc dephasing).
// Substrate leakage: tunnelling through the BOX, α ≈ γ·exp(−2γ·t_box).
KINDS.ssc = (() => {
  const T_BOX = 3.0, cache = new Map();
  let TB, W_END, LAM, K0, NOX, WS, I0, TS, OFFS, P, imgs, cur = null;
  // switch the tabulated platform (mode tables differ per wavelength × material)
  function use(l) {
    if (cur === l.pf.id) return; cur = l.pf.id; cache.clear();
    TB = SSCP[cur]; W_END = l.pf.w0; LAM = TB.lam; K0 = 2 * Math.PI / LAM; NOX = TB.nox; TS = TB.ts; OFFS = TB.offs;
    const nom = TB.tab[String(TS[1])];
    WS = TB.ws.filter((w, i) => nom[i].neff > NOX + 5e-4 && w <= W_END + 1e-9); I0 = TB.ws.indexOf(WS[0]);
    const si = l.pf.mat === 'si';
    P = {
      tw: { k: 'tw', label: '팁 폭', sym: 'w<sub>tip</sub>', min: +WS[0].toFixed(3), max: si ? 0.2 : 0.6, step: si ? 0.002 : 0.005, dec: 3, unit: 'µm' },
      Lt: { k: 'Lt', label: '테이퍼 길이', sym: 'L<sub>t</sub>', min: 10, max: si ? 400 : 800, step: si ? 1 : 2, dec: 0, unit: 'µm' },
      p: { k: 'p', label: '테이퍼 형상 지수', sym: 'p', min: 0.3, max: 3, step: 0.05, dec: 2, unit: '' }
    };
    imgs = nom.map((r) => r.img);
  }
  // row access with thickness interpolation
  function rows(t) {
    const it = t <= TS[1] ? 0 : 1, ft = clamp((t - TS[it]) / (TS[it + 1] - TS[it]), -0.5, 1.5);
    const n = WS.length, A = TB.tab[String(TS[it])].slice(I0, I0 + n + 1), B = TB.tab[String(TS[it + 1])].slice(I0, I0 + n + 1);
    const mix = (a, b) => a + (b - a) * ft;
    return A.map((ra, i) => {
      const rb = B[i], e = (key, ax) => ra.eta[key][ax].map((v, j) => mix(v, rb.eta[key][ax][j]));
      return { w: ra.w, mfd: mix(ra.mfdx, rb.mfdx), neff: Math.max(NOX + 1e-5, mix(ra.neff, rb.neff)), oPrev: i ? mix(ra.oPrev, rb.oPrev) : 1, lat: e(K.mfd.toFixed(1), 'lat'), ver: e(K.mfd.toFixed(1), 'ver') };
    });
  }
  
  const rowsC = (t) => { const k = t.toFixed(5); if (!cache.has(k)) { if (cache.size > 64) cache.clear(); cache.set(k, rows(t)); } return cache.get(k); };
  function at(R, w) {
    const ws = R.map((r) => r.w);
    return { mfd: linterp(ws, R.map((r) => r.mfd), w), neff: linterp(ws, R.map((r) => r.neff), w), lat: R[0].lat.map((_, j) => linterp(ws, R.map((r) => r.lat[j]), w)), ver: R[0].ver.map((_, j) => linterp(ws, R.map((r) => r.ver[j]), w)) };
  }
  const tol1dB = (arr) => { const th = arr[0] * Math.pow(10, -0.1); for (let i = 1; i < arr.length; i++) if (arr[i] < th) return OFFS[i - 1] + (OFFS[i] - OFFS[i - 1]) * (arr[i - 1] - th) / (arr[i - 1] - arr[i]); return OFFS[OFFS.length - 1]; };
  const alpha = (neff) => { const g = K0 * Math.sqrt(Math.max(neff * neff - NOX * NOX, 1e-8)); return g * Math.exp(-2 * g * T_BOX); };
  function analyse(d, proc) {
    const dw = proc ? proc.dw : 0, dt = proc ? proc.dt : 0;
    const R = rowsC(TS[1] + dt), wt = clamp(d.tw + dw, WS[0], W_END - 0.01), we = W_END + dw;
    const tip = at(R, wt), eta0 = tip.lat[0];
    // taper nodes: tip, then table widths above it, up to w_end
    const nodes = [{ w: wt, neff: tip.neff, k: 0 }];
    for (let i = 1; i < R.length; i++) {
      if (R[i].w <= wt) continue;
      const prevW = R[i - 1].w, frac = clamp((R[i].w - Math.max(prevW, wt)) / (R[i].w - prevW), 0, 1);
      nodes.push({ w: R[i].w, neff: R[i].neff, k: Math.sqrt(Math.max(0, 1 - R[i].oPrev * R[i].oPrev)) * frac });
      if (R[i].w >= we - 1e-9) break;
    }
    const zOf = (w) => d.Lt * Math.pow(clamp((w - wt) / (we - wt), 0, 1), 1 / d.p);
    let phi = 0, re = 0, im = 0, leak = 0;
    for (let i = 1; i < nodes.length; i++) {
      const a = nodes[i - 1], b = nodes[i], dz = zOf(b.w) - zOf(a.w);
      const dbeta = K0 * (0.5 * (a.neff + b.neff) - NOX), dphi = dbeta * dz;
      const sinc = Math.abs(dphi) < 1e-6 ? 1 : Math.sin(dphi / 2) / (dphi / 2), mid = phi + dphi / 2;
      re += b.k * sinc * Math.cos(mid); im += b.k * sinc * Math.sin(mid);
      phi += dphi;
      leak += 0.5 * (alpha(a.neff) + alpha(b.neff)) * dz;
    }
    const pRad = Math.min(0.99, re * re + im * im);
    const mis = -dB10(eta0), tap = -dB10(1 - pRad), lk = 4.343 * leak;
    return { eta0, mis, tap, lk, loss: mis + tap + lk, tolX: tol1dB(tip.lat), tolY: tol1dB(tip.ver), lat: tip.lat, ver: tip.ver, wt, neffTip: tip.neff };
  }
  const r1 = (l, r) => Math.max(r.loss / l.s1.loss, l.s1.tol / Math.max(r.tolX, 1e-3));
  const r2 = (l, r) => Math.max(r.loss / l.s2.loss, l.s2.tol / Math.max(r.tolX, 1e-3));
  // mode image (nominal thickness) at nearest tabulated width
  const btCache = {};
  function bestTip() { if (btCache[cur]) return btCache[cur]; let bw = WS[0], be = 0; for (let w = WS[0]; w <= P.tw.max; w += P.tw.step) { const e = at(rowsC(TS[1]), w).lat[0]; if (e > be) { be = e; bw = w; } } return (btCache[cur] = { bw, be }); }
  function modeImg(w) { let bi = I0, bd = Infinity; TB.ws.forEach((x, i) => { if (i >= I0 && Math.abs(x - w) < bd) { bd = Math.abs(x - w); bi = i; } }); return imgs[bi]; }
  const K = {
    title: 'Edge coupler', mfd: 3.0, aspect: 0.42, sizeLabel: '길이', sizeUnit: 'µm', primaryLabel: '결합 손실 dB', cheap: true,
    params: (l) => { use(l); return [P.tw, P.Lt, P.p]; },
    landKeys: () => ['tw', 'Lt', 'p'],
    violation: () => 0,
    evaluate(l, d, proc) { use(l); const a = analyse(d, proc); return { d: { ...d }, ...a, size: d.Lt, drc: [], primary: a.loss, secondary: a.tolX }; },
    perf(l, r) { return 300 * clamp(1 - r.loss / l.lossCap, 0, 1) + 200 * clamp(r.tolX / l.tolBest, 0, 1); },
    q1: r1, q2: r2,
    objectives(l, r) {
      return {
        t1: [{ k: `결합 손실 ≤ ${fmtT(l.s1.loss)} dB`, v: f2(r.loss) + ' dB', ok: r.loss <= l.s1.loss }, { k: `1-dB 정렬 허용 ≥ ±${fmtT(l.s1.tol)} µm`, v: '±' + f2(r.tolX) + ' µm', ok: r.tolX >= l.s1.tol }],
        t2: [{ k: `결합 손실 ≤ ${fmtT(l.s2.loss)} dB`, v: f2(r.loss) + ' dB', ok: r.loss <= l.s2.loss }, { k: `1-dB 정렬 허용 ≥ ±${fmtT(l.s2.tol)} µm`, v: '±' + f2(r.tolX) + ' µm', ok: r.tolX >= l.s2.tol }]
      };
    },
    fabPass: (l, r) => r.loss <= l.fab.loss,
    fabCrit: (l) => `결합 손실 ≤ ${fmtT(l.fab.loss)} dB`,
    meta(l, r) { use(l); return `${l.pf.short} · ${MATS[l.pf.mat].full} → 렌즈 광섬유 MFD <b>${K.mfd.toFixed(1)} µm</b> · BOX <b>${T_BOX} µm</b><br>팁 n<sub>eff</sub> <b>${r.neffTip.toFixed(4)}</b> · semi-vectorial 2D 모드 솔버 테이블 + 국소모드 결합`; },
    tiles(l, r) { return [['총 결합 손실', `${f2(r.loss)}<small>dB</small>`], ['모드 부정합', `${f2(r.mis)}<small>dB</small>`], ['테이퍼 비단열', `${f2(r.tap)}<small>dB</small>`], ['기판 누설', `${f2(r.lk)}<small>dB</small>`]]; },
    hint(l, r) {
      use(l);
      const { bw, be } = bestTip();
      return `광섬유 정합 최적 팁 ≈ <b>${bw.toFixed(3)} µm</b> (η = ${(be * 100).toFixed(1)}%)<br>단열 조건: 팁 근처에서 Δβ = k₀(n<sub>eff</sub> − n<sub>ox</sub>)가 작아 국소 비트길이 2π/Δβ ≈ <b>${(2 * Math.PI / (K0 * Math.max(r.neffTip - NOX, 1e-4))).toFixed(0)} µm</b>. 이 구간을 천천히 지나야 합니다 (p > 1).<br>누설: α ≈ γ·e<sup>−2γ·t<sub>BOX</sub></sup>, γ = k₀√(n<sub>eff</sub>² − n<sub>ox</sub>²)`;
    },
    draw(cv, l, r, ui) {
      use(l);
      const ctx = cv.getContext('2d'), W = cv.width, H = cv.height, d = r.d;
      ctx.fillStyle = '#0b1220'; ctx.fillRect(0, 0, W, H);
      const pad = 10 * DPR, secS = Math.min(H - 2 * pad, W * 0.38), secX = W - pad - secS, secY = (H - secS) / 2;
      // cross-section at facet: mode intensity (±4 µm window) + fiber 1/e² circle + core
      const hex = modeImg(r.wt), n = 48, off = K._off || (K._off = document.createElement('canvas'));
      off.width = n; off.height = n; const octx = off.getContext('2d'), img = octx.createImageData(n, n);
      for (let i = 0; i < n * n; i++) { const v = parseInt(hex.substr(i * 2, 2), 16), t = Math.round(255 * Math.pow(v / 255, 0.6)); img.data[i * 4] = FIELD_LUT[t * 3]; img.data[i * 4 + 1] = FIELD_LUT[t * 3 + 1]; img.data[i * 4 + 2] = FIELD_LUT[t * 3 + 2]; img.data[i * 4 + 3] = 255; }
      octx.putImageData(img, 0, 0); ctx.imageSmoothingEnabled = true; ctx.drawImage(off, secX, secY, secS, secS);
      const um = secS / 8, cx = secX + secS / 2, cy = secY + secS / 2;
      ctx.strokeStyle = 'rgba(100,201,223,0.95)'; ctx.lineWidth = 1.5 * DPR; ctx.setLineDash([5 * DPR, 4 * DPR]);
      ctx.beginPath(); ctx.arc(cx, cy, K.mfd / 2 * um, 0, 2 * Math.PI); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(231,236,243,0.9)'; ctx.lineWidth = 1 * DPR; ctx.strokeRect(cx - r.wt / 2 * um, cy - l.pf.t / 2 * um, r.wt * um, l.pf.t * um);
      cvPill(ctx, `팁 단면 · η ${(r.eta0 * 100).toFixed(1)}%`, secX + 4 * DPR, secY + 10 * DPR, 'left');
      cvPill(ctx, `광섬유 MFD ${K.mfd} µm`, secX + secS - 4 * DPR, secY + secS - 10 * DPR, 'right', 'rgba(100,201,223,0.95)');
      // top view of taper: facet at left; width exaggerated; glow = local mode size; red floor = leakage
      const tx0 = pad + 18 * DPR, tx1 = secX - 22 * DPR, ty = H * 0.5, R0 = rowsC(TS[1]);
      const zOf = (u) => u * d.Lt, wOf = (u) => r.wt + (W_END - r.wt) * Math.pow(u, d.p);
      const sx = (tx1 - tx0), wScale = H * 0.18 / W_END, N = 90;
      for (let i = 0; i < N; i++) {
        const u = (i + 0.5) / N, w = wOf(u), q = at(R0, w), ne = q.neff, mf = Math.min(3.6, q.mfd);
        const x = tx0 + u * sx, hw = mf * H * 0.11;
        const g = ctx.createLinearGradient(0, ty - hw, 0, ty + hw);
        g.addColorStop(0, 'rgba(242,176,74,0)'); g.addColorStop(0.5, 'rgba(242,176,74,0.35)'); g.addColorStop(1, 'rgba(242,176,74,0)');
        ctx.fillStyle = g; ctx.fillRect(x - sx / N / 2, ty - hw, sx / N + 1, 2 * hw);
        const a = Math.min(1, alpha(ne) * 4.343 * 40);
        if (a > 0.02) { ctx.fillStyle = `rgba(255,107,107,${0.15 + 0.7 * a})`; ctx.fillRect(x - sx / N / 2, H - pad - 10 * DPR, sx / N + 1, 6 * DPR); }
      }
      ctx.fillStyle = 'rgba(214,226,242,0.9)'; ctx.beginPath();
      for (let i = 0; i <= N; i++) { const u = i / N; ctx.lineTo(tx0 + u * sx, ty - wOf(u) * wScale); }
      for (let i = N; i >= 0; i--) { const u = i / N; ctx.lineTo(tx0 + u * sx, ty + wOf(u) * wScale); }
      ctx.closePath(); ctx.fill();
      // fiber at facet
      ctx.strokeStyle = 'rgba(100,201,223,0.9)'; ctx.lineWidth = 1.5 * DPR; ctx.beginPath(); ctx.moveTo(pad, ty - 14 * DPR); ctx.lineTo(tx0 - 3 * DPR, ty - 14 * DPR); ctx.moveTo(pad, ty + 14 * DPR); ctx.lineTo(tx0 - 3 * DPR, ty + 14 * DPR); ctx.stroke();
      ctx.fillStyle = 'rgba(158,171,189,0.9)'; ctx.font = `${10 * DPR}px "IBM Plex Mono", monospace`; ctx.textBaseline = 'top'; ctx.textAlign = 'left';
      ctx.fillText(`facet · w ${r.wt.toFixed(3)}`, tx0, pad); ctx.textAlign = 'right'; ctx.fillText(`${W_END} µm · L ${d.Lt} µm`, tx1, pad);
      ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillStyle = 'rgba(255,141,156,0.95)'; ctx.fillText('기판 누설', tx0, H - pad - 12 * DPR);
      ctx.fillStyle = 'rgba(242,176,74,0.9)'; ctx.textAlign = 'right'; ctx.fillText('주황 = 국소 모드 크기', tx1, H - pad - 12 * DPR);
    },
    chartTitle: () => '정렬 허용오차 · 광섬유 오프셋 대비 손실',
    chart(l, r) {
      use(l);
      const extra = r.tap + r.lk, mk = (arr) => { const pts = []; for (let i = OFFS.length - 1; i > 0; i--) pts.push([-OFFS[i], -dB10(arr[i]) + extra]); OFFS.forEach((o, i) => pts.push([o, -dB10(arr[i]) + extra])); return pts; };
      const html = svgChart({ x0: -2, x1: 2, y0: 0, y1: 8, aria: '오프셋 대비 결합 손실', xticks: [-2, -1, 0, 1, 2], yticks: [0, 2, 4, 6, 8], ylab: 'dB', xlab: '오프셋 µm',
        hlines: [{ y: r.loss + 1, label: '최소 손실 + 1 dB' }, { y: l.s2.loss, label: `★★ ${fmtT(l.s2.loss)} dB`, color: 'rgba(242,176,74,.6)' }],
        bands: [[-r.tolX, r.tolX, 'rgba(93,209,147,0.08)']],
        series: [{ pts: mk(r.ver), color: 'var(--cyan)', width: 1.6, dash: '5 4' }, { pts: mk(r.lat), color: 'var(--amber)', width: 2.2 }] });
      return { html, legend: legendHTML([['var(--amber)', `수평 (±${f2(r.tolX)} µm @1 dB)`], ['var(--cyan)', `수직 (±${f2(r.tolY)} µm @1 dB)`], ['rgba(93,209,147,.35)', '1-dB 허용 범위']]) };
    },
    coach(l, r, c) {
      use(l);
      const t = c.tier, d = r.d, n = (v, k = 2) => v.toFixed(k);
      const { bw, be } = bestTip();
      const terms = [['mis', r.mis], ['tap', r.tap], ['lk', r.lk]].sort((a, b) => b[1] - a[1]);
      if (!c.ob1 || !c.ob2) {
        if (r.tolX < (c.ob1 ? l.s2.tol : l.s1.tol) && d.tw > bw) return { h: '정렬 허용오차가 부족합니다', b: '팁의 모드가 작으면 광섬유가 조금만 어긋나도 손실이 급격히 커집니다. 팁을 좁혀 모드를 키우세요.' + (t >= 2 ? ` 광섬유와 크기가 맞는 팁은 ≈ ${n(bw, 3)} µm입니다.` : '') };
        const [term, val] = terms[0];
        if (term === 'mis' && val > 0.3) return { h: '팁 모드와 광섬유 모드 크기가 다릅니다', b: (d.tw > bw ? '팁이 넓어 모드가 너무 작습니다. 팁을 좁히세요.' : '팁이 너무 좁아 모드가 지나치게 퍼졌습니다. 팁을 조금 넓히세요.') + (t >= 2 ? ` 최적 팁 ≈ ${n(bw, 3)} µm (η ${(be * 100).toFixed(0)}%).` : '') };
        // best (Lt, p) for the current tip within the ★★ length budget
        const shape = () => { let bs = null; for (let L = 40; L <= l.s2.size; L += 10) for (let pp = 0.8; pp <= 2.6; pp += 0.1) { const a = analyse({ ...d, Lt: L, p: +pp.toFixed(2) }), v = a.tap + a.lk; if (!bs || v < bs.v - 0.005 || (v < bs.v + 0.005 && L < bs.L)) bs = { L, p: +pp.toFixed(2), v }; } return bs; };
        if (term === 'tap' && val > 0.15) {
          const bs = t >= 2 ? shape() : null;
          if (!bs || Math.abs(bs.L - d.Lt) >= 10 || Math.abs(bs.p - d.p) >= 0.1) return { h: '테이퍼가 너무 급해 빛이 방사됩니다', b: '팁 근처는 모드가 크게 변하는 데 비해 비트 길이가 길어서 천천히 지나야 합니다. L<sub>t</sub>를 늘리거나 p를 키워 팁 쪽에 길이를 더 쓰세요.' + (bs ? ` 지금 팁에서는 Lt ≈ ${bs.L} µm, p ≈ ${bs.p.toFixed(2)}일 때 비단열+누설 ${n(bs.v)} dB로 최소입니다.` : '') };
        }
        if (term === 'lk' && val > 0.15) {
          const bs = t >= 2 ? shape() : null;
          if (!bs || Math.abs(bs.L - d.Lt) >= 10 || Math.abs(bs.p - d.p) >= 0.1) return { h: '기판으로 빛이 새고 있습니다', b: '모드가 퍼진 팁 구간이 길수록 BOX를 뚫고 Si 기판으로 누설됩니다. p를 줄여 팁 구간을 빨리 지나거나, 테이퍼를 짧게, 또는 팁을 약간 넓히세요.' + (bs ? ` 균형점: Lt ≈ ${bs.L} µm, p ≈ ${bs.p.toFixed(2)} (비단열+누설 ${n(bs.v)} dB).` : '') };
        }
      }
      if (c.ob2 && (!c.fab || c.fab.yield < l.fab.y) && t >= 2) {
        // robust tip for the current taper: minimise the worst process corner while keeping ★★ nominal
        let rb = null;
        for (let w = Math.max(P.tw.min, bestTip().bw - 6 * P.tw.step); w <= bestTip().bw + 18 * P.tw.step + 1e-9; w += P.tw.step) {
          const dd = { ...d, tw: +w.toFixed(3) }, nom = analyse(dd);
          if (nom.loss > l.s2.loss || nom.tolX < l.s2.tol) continue;
          const worst = Math.max(...[-0.008, 0.008].flatMap((dw) => [-0.6 * l.pf.dt, 0.6 * l.pf.dt].map((dt) => analyse(dd, { dw, dt }).loss)));
          if (!rb || worst < rb.v - 1e-3) rb = { w: +w.toFixed(3), v: worst };
        }
        if (rb && Math.abs(rb.w - d.tw) < P.tw.step - 1e-9 && !c.fab) return { h: '★★ 달성! 이 팁은 공정 코너에 견고합니다', b: `★★를 유지하는 팁 가운데 최악 공정 코너가 가장 좋은 지점입니다 (최악 ${n(rb.v)} dB). 이제 Tape-out 해보세요.` };
        if (rb && Math.abs(rb.w - d.tw) >= P.tw.step - 1e-9) return { h: c.fab ? '팁 CD 변동에 민감합니다' : '★★ 달성! Tape-out 전에 팁을 견고하게', b: `팁이 좁을수록 모드가 cutoff 근처에 있어 CD가 조금만 줄어도 모드가 폭발적으로 커집니다. ★★를 유지하는 범위에서 최악 공정 코너가 가장 좋은 팁으로 옮기세요. 최악 코너(CD ±8 nm, 두께 변동) 기준 최적 팁 ≈ ${rb.w.toFixed(3)} µm (최악 ${n(rb.v)} dB).` };
      }
      if (c.ob2 && c.fab && c.fab.yield < l.fab.y) {
        let rb = null;
        if (t >= 2) for (let w = Math.max(P.tw.min, bestTip().bw - 6 * P.tw.step); w <= bestTip().bw + 18 * P.tw.step + 1e-9; w += P.tw.step) { const dd = { ...d, tw: +w.toFixed(3) }; const worst = Math.max(...[-0.008, 0.008].flatMap((dw) => [-0.6 * l.pf.dt, 0.6 * l.pf.dt].map((dt) => analyse(dd, { dw, dt }).loss))); if (!rb || worst < rb.v) rb = { w: +w.toFixed(3), v: worst }; }
        return { h: '팁 CD 변동에 민감합니다', b: `팁이 좁을수록 모드가 cutoff 근처에 있어 CD가 8 nm만 줄어도 모드가 폭발적으로 커집니다. η(w) 곡선이 완만한 쪽, 즉 최적점보다 약간 넓은 팁으로 옮기세요. 공칭 손실은 조금 손해지만 최악 코너가 좋아집니다.` + (rb && Math.abs(rb.w - d.tw) >= 0.002 ? ` 최악 코너(CD ±8 nm, 두께 변동) 기준 최적 팁 ≈ ${rb.w.toFixed(3)} µm (최악 ${n(rb.v)} dB).` : '') };
      }
      return null;
    },
    card(l, r) { return { kind: 'ssc', lines: [`손실 ${f2(r.loss)} dB`, `±${f2(r.tolX)} µm @1dB`], model: { loss: +r.loss.toFixed(3), tolX: +r.tolX.toFixed(3), tolY: +r.tolY.toFixed(3), mfd: K.mfd } }; },
    aiStarts: (l) => [l.start, { tw: 0.104, Lt: 200, p: 1.5 }],
    _x: { analyse, at, rowsC }
  };
  return K;
})();
