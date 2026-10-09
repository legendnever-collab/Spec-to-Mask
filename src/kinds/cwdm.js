// ===== Kind: CWDM4 demux — binary tree of MZI lattice filters (circuit S-matrix) =====
// Waveguide neff(w, t, λ) / ng from the offline semi-vectorial 2D mode solver tables (WGP, per platform).
KINDS.cwdm = (() => {
  // lattice designs (ideal couplers) optimised offline for ±6.5 nm flat passbands: worst leakage −6.2 / −11.5 / −16.4 dB
  const LAT = {
    1: { mult: [1], ks: [0.5, 0.5], pos: [], ph0: Math.PI },
    2: { mult: [1, 2], ks: [0.5, 0.5901, 0.1233], pos: [3.1466], ph0: 3.1399 },
    3: { mult: [1, 2, 2], ks: [0.5, 0.451, 0.8377, 0.4744], pos: [2.8972, 1.2559], ph0: 4.8124 }
  };
  const HALF = 0.0065;
  let CH, LC, BANDPTS, T, TS, WS, T0, WIDE, cur = null;
  function use(l) {
    if (cur === l.pf.id) return; cur = l.pf.id;
    CH = l.pf.ch; LC = l.pf.lc; BANDPTS = CH.map((c) => band(c - HALF, c + HALF, 7));
    T = WGP[cur]; TS = T.ts; WS = T.ws; T0 = l.pf.t; WIDE = l.pf.mat === 'si' ? 1.0 : 2.4;
    P.wa.min = l.pf.w0; P.wa.max = l.pf.mat === 'si' ? 1.2 : 3.0; P.wa.step = l.pf.mat === 'si' ? 0.02 : 0.05;
  }
  const P = {
    ord: { k: 'ord', label: '필터 차수 (lattice)', sym: 'N', min: 1, max: 3, step: 1, dec: 0, unit: '차' },
    dL1: { k: 'dL1', label: '1단 지연 ΔL₁', sym: 'ΔL₁', min: 4, max: 40, step: 0.01, dec: 2, unit: 'µm' },
    t1: { k: 't1', label: '1단 위상 트림', sym: 'φ₁', min: -1, max: 1, step: 0.01, dec: 2, unit: 'π' },
    dL2: { k: 'dL2', label: '2단 지연 ΔL₂', sym: 'ΔL₂', min: 2, max: 20, step: 0.01, dec: 2, unit: 'µm' },
    t2a: { k: 't2a', label: '2단-A 위상 트림', sym: 'φ₂ₐ', min: -1, max: 1, step: 0.01, dec: 2, unit: 'π' },
    t2b: { k: 't2b', label: '2단-B 위상 트림', sym: 'φ₂ᵦ', min: -1, max: 1, step: 0.01, dec: 2, unit: 'π' },
    wa: { k: 'wa', label: '지연 암 폭', sym: 'wₐ', min: 0.4, max: 1.2, step: 0.05, dec: 2, unit: 'µm' }
  };
  // neff(w, t, λ): bilinear in (w,t), quadratic in λ through the three tabulated wavelengths
  function neffAt(w, t, lam) {
    const it = clamp(t <= TS[1] ? 0 : 1, 0, TS.length - 2), ft = (t - TS[it]) / (TS[it + 1] - TS[it]);
    const lw = (ti) => { const rows = T.te0[String(TS[ti])]; return [0, 1, 2].map((j) => linterp(WS, rows.map((r) => r[j]), w)); };
    const a = lw(it), b = lw(it + 1), n = a.map((v, j) => v + (b[j] - v) * ft);
    const [l0, l1, l2] = T.lams, x = lam;
    return n[0] * (x - l1) * (x - l2) / ((l0 - l1) * (l0 - l2)) + n[1] * (x - l0) * (x - l2) / ((l1 - l0) * (l1 - l2)) + n[2] * (x - l0) * (x - l1) / ((l2 - l0) * (l2 - l1));
  }
  const ngAt = (w, t) => { const n0 = neffAt(w, t, LC - 0.005), n1 = neffAt(w, t, LC + 0.005); return neffAt(w, t, LC) - LC * (n1 - n0) / 0.01; };
  const dndw = (w) => (neffAt(w + 0.01, T0, LC) - neffAt(w - 0.01, T0, LC)) / 0.02;
  // coupler 2x2 (field), κ = cross power fraction, a = amplitude loss
  // complex 2-vector helpers: v = [re0, im0, re1, im1]
  function applyC(k, a, v) {
    const c = Math.sqrt(1 - k) * a, s = Math.sqrt(k) * a;
    // [c, -i s; -i s, c]
    return [c * v[0] + s * v[3], c * v[1] - s * v[2], s * v[1] + c * v[2], -s * v[0] + c * v[3]];
  }
  function applyD(ph, v) { const cs = Math.cos(ph), sn = Math.sin(ph); return [v[0] * cs + v[1] * sn, v[1] * cs - v[0] * sn, v[2], v[3]]; }
  // one lattice filter: returns [P_bar, P_cross] for input on port 0
  function filt(spec, phi, cpls, perr, v) {
    v = applyC(cpls[0].k, cpls[0].a, v);
    spec.mult.forEach((m, i) => { v = applyD(m * phi + (i ? spec.pos[i - 1] : 0) + (perr ? perr[i] : 0), v); v = applyC(cpls[i + 1].k, cpls[i + 1].a, v); });
    return v;
  }
  const pw = (v, i) => v[2 * i] ** 2 + v[2 * i + 1] ** 2;
  const PERMS = (() => { const o = []; const p = (a, r) => { if (!a.length) { o.push(r); return; } a.forEach((x, i) => p(a.filter((_, j) => j !== i), r.concat(x))); }; p([0, 1, 2, 3], []); return o; })();
  function cardCoupler(lam) {
    const cards = (typeof window !== 'undefined' ? window.GAME_CARDS : global.GAME_CARDS) || {};
    const c = cards['1-5']; if (!c || !c.model) return null;
    const m = c.model, el = linterp(m.lams, m.el, lam), imb = linterp(m.lams, m.imb, lam);
    return { k: 1 / (1 + Math.pow(10, imb / 10)), a: Math.sqrt(Math.pow(10, -el / 10)) };
  }
  function response(l, d, proc, lam, rnd) {
    const spec = LAT[d.ord | 0] || LAT[1], dw = proc ? proc.dw : 0, dt = proc ? proc.dt : 0;
    const ne = neffAt(d.wa + dw, T0 + dt, lam) + (proc && proc.dn ? proc.dn : 0), k0 = 2 * Math.PI / lam;   // proc.dn: uniform index offset (temperature)
    const useCard = d.useCard ? cardCoupler(lam) : null, aIdeal = Math.sqrt(Math.pow(10, -0.005));
    const mk = (fi) => spec.ks.map((k, j) => {
      let kk = k, a = aIdeal;
      if (useCard && Math.abs(k - 0.5) < 1e-6) { kk = useCard.k; a = useCard.a; }
      if (rnd) kk = clamp(kk + rnd.k[fi][j], 0.001, 0.999);
      return { k: kk, a };
    });
    const ph1 = k0 * ne * d.dL1 + Math.PI * d.t1, ph2a = k0 * ne * d.dL2 + Math.PI * d.t2a, ph2b = k0 * ne * d.dL2 + Math.PI * d.t2b;
    const loss = (len) => Math.sqrt(Math.pow(10, -0.15 * len / 1000 / 10)); // 1.5 dB/cm on delay arms
    const v1 = filt(spec, ph1, mk(0), rnd && rnd.p[0], [1, 0, 0, 0]);
    const a1 = loss(d.dL1 * 2), a2 = loss(d.dL2 * 2);
    const va = filt(spec, ph2a, mk(1), rnd && rnd.p[1], [v1[0] * a1, v1[1] * a1, 0, 0]);
    const vb = filt(spec, ph2b, mk(2), rnd && rnd.p[2], [v1[2] * a1, v1[3] * a1, 0, 0]);
    return [pw(va, 0) * a2 * a2, pw(va, 1) * a2 * a2, pw(vb, 0) * a2 * a2, pw(vb, 1) * a2 * a2];
  }
  function dieRandom(l, d, proc) {
    if (!proc || proc.seed == null) return null;
    const r = mulberry(proc.seed), spec = LAT[d.ord | 0] || LAT[1], kk = proc.k || 1;
    const sig = (L) => (2 * Math.PI / LC) * Math.abs(dndw(d.wa)) * 0.002 * kk * Math.sqrt(L * 3);
    const p = [d.dL1, d.dL2, d.dL2].map((L) => spec.mult.map((m) => gaussR(r) * sig(m * L)));
    const k = [0, 1, 2].map(() => spec.ks.map(() => gaussR(r) * 0.01 * kk));
    return { p, k };
  }
  function analyse(l, d, proc) {
    const rnd = dieRandom(l, d, proc);
    const Tb = BANDPTS.map((pts) => pts.map((lam) => response(l, d, proc, lam, rnd)));   // [ch][pt][port]
    let best = null;
    for (const pm of PERMS) { let s = 0; for (let c = 0; c < 4; c++) s += Math.min(...Tb[c].map((x) => x[pm[c]])); if (!best || s > best.s) best = { s, pm }; }
    const pm = best.pm, il = [], xt = [];
    for (let c = 0; c < 4; c++) {
      const port = pm[c], tin = Math.min(...Tb[c].map((x) => x[port]));
      il.push(-dB10(tin));
      let leak = 0; for (let c2 = 0; c2 < 4; c2++) if (c2 !== c) leak = Math.max(leak, ...Tb[c2].map((x) => x[port]));
      xt.push(dB10(leak / Math.max(tin, 1e-9)));
    }
    return { pm, il, xt, rnd };
  }
  const area = (d) => { const s = LAT[d.ord | 0] || LAT[1], len = (L) => (s.ks.length) * 12 + s.mult.reduce((a, m) => a + m * L / 2 + 6, 0); return (len(d.dL1) + 2 * len(d.dL2)) * 10; };
  const r1 = (l, r) => Math.max(r.il / l.s1.il, (r.xt - l.xt0) / (l.s1.xt - l.xt0));
  const r2 = (l, r) => Math.max(r.il / l.s2.il, (r.xt - l.xt0) / (l.s2.xt - l.xt0));
  function optTrim(l, d, which) {
    // bar port of the filter should pass its first channel at the lattice design phase
    const spec = LAT[d.ord | 0] || LAT[1], ne = (lam) => neffAt(d.wa, T0, lam);
    const target = which === 't1' ? CH[0] : which === 't2a' ? CH[0] : CH[1];
    const L = which === 't1' ? d.dL1 : d.dL2, base = 2 * Math.PI / target * ne(target) * L;
    let t = ((spec.ph0 - base) / Math.PI) % 2; if (t > 1) t -= 2; if (t < -1) t += 2; return t;
  }
  const K = {
    title: 'CWDM4',  aspect: 0.56,sizeLabel: '면적', sizeUnit: 'µm²', primaryLabel: '최악 IL dB', cheap: true,
    params: (l) => { use(l); return [P.ord, P.dL1, P.t1, P.dL2, P.t2a, P.t2b, P.wa]; },
    toggles: () => [{ k: 'useCard', label: '내 2×2 MMI 카드(1-5)를 3-dB 커플러로 사용', needs: '1-5' }],
    landKeys: () => ['t1', 't2a', 't2b', 'dL1'],
    violation: () => 0,
    evaluate(l, d, proc) {
      use(l);
      const a = analyse(l, d, proc);
      const il = Math.max(...a.il), xt = Math.max(...a.xt);
      return { d: { ...d }, a, il, xt, size: area(d), drc: [], primary: il, secondary: xt };
    },
    perf(l, r) { return 250 * clamp(1 - r.il / l.ilCap, 0, 1) + 250 * clamp((r.xt - l.xtWorst) / (l.xtBest - l.xtWorst), 0, 1); },
    q1: r1, q2: r2,
    objectives(l, r) {
      return {
        t1: [{ k: `채널 최악 IL ≤ ${fmtT(l.s1.il)} dB`, v: f2(r.il) + ' dB', ok: r.il <= l.s1.il }, { k: `최악 XT ≤ ${fmtT(l.s1.xt)} dB`, v: f2(r.xt, 1) + ' dB', ok: r.xt <= l.s1.xt }],
        t2: [{ k: `채널 최악 IL ≤ ${fmtT(l.s2.il)} dB`, v: f2(r.il) + ' dB', ok: r.il <= l.s2.il }, { k: `최악 XT ≤ ${fmtT(l.s2.xt)} dB`, v: f2(r.xt, 1) + ' dB', ok: r.xt <= l.s2.xt }]
      };
    },
    fabPass: (l, r) => r.il <= l.fab.il && r.xt <= l.fab.xt,
    fabCrit: (l) => `IL ≤ ${fmtT(l.fab.il)} dB · XT ≤ ${fmtT(l.fab.xt)} dB`,
    meta(l, r) { use(l); return `${l.pf.short} · CWDM ${CH.map((c) => Math.round(c * 1000)).join('/')} nm · 통과대역 ±6.5 nm<br>n<sub>g</sub>(wₐ) <b>${ngAt(r.d.wa, T0).toFixed(3)}</b> · ∂n<sub>eff</sub>/∂w <b>${dndw(r.d.wa).toFixed(2)}</b>/µm · 2D 모드 솔버 테이블 + 회로 S-matrix`; },
    tiles(l, r) {
      use(l);
      return [['채널 최악 IL', `${f2(r.il)}<small>dB</small>`], ['최악 크로스토크', `${f2(r.xt, 1)}<small>dB</small>`],
        ['CD 10 nm당 채널 이동', `${(LC * 1000 * dndw(r.d.wa) * 0.01 / ngAt(r.d.wa, T0)).toFixed(2)}<small>nm</small>`], ['면적', `${Math.round(r.size)}<small>µm²</small>`]];
    },
    hint(l, r) {
      use(l);
      const d = r.d, ng = ngAt(d.wa, T0), L1 = LC * LC / (ng * 0.04), L2 = LC * LC / (ng * 0.08);
      return `FSR = λ²/(n<sub>g</sub>ΔL), n<sub>g</sub>(wₐ=${d.wa.toFixed(2)}) = ${ng.toFixed(3)}<br>1단 인터리버 FSR 40 nm → <b>ΔL₁ ≈ ${L1.toFixed(2)} µm</b> · 2단 FSR 80 nm → <b>ΔL₂ ≈ ${L2.toFixed(2)} µm</b><br>트림 목표: φ₁ ≈ <b>${optTrim(l, d, 't1').toFixed(2)}π</b>, φ₂ₐ ≈ <b>${optTrim(l, d, 't2a').toFixed(2)}π</b>, φ₂ᵦ ≈ <b>${optTrim(l, d, 't2b').toFixed(2)}π</b> (현재 ΔL 기준)`;
    },
    draw(cv, l, r, ui) {
      use(l);
      const ctx = cv.getContext('2d'), W = cv.width, H = cv.height, d = r.d, spec = LAT[d.ord | 0] || LAT[1];
      ctx.fillStyle = '#0b1220'; ctx.fillRect(0, 0, W, H);
      const cols = ['#64c9df', '#5dd193', '#f2b04a', '#ff8d9c'];
      // schematic: input → F1 → F2a / F2b → 4 ports; each filter drawn as couplers + delay bumps
      const pad = 10 * DPR, x0 = pad + 28 * DPR, x1 = W - pad - 92 * DPR, midY = H * 0.5, yA = H * 0.27, yB = H * 0.73;
      const fW = (x1 - x0) * 0.42, f1x = x0, f2x = x0 + (x1 - x0) * 0.55;
      function drawFilter(x, y, w, L, label) {
        const n = spec.mult.length, seg = w / (n + 1 + n);
        ctx.strokeStyle = 'rgba(214,226,242,0.7)'; ctx.lineWidth = 1.5 * DPR;
        const gap = 9 * DPR; let cx = x;
        for (let i = 0; i <= n; i++) {
          // coupler as two converging lines
          ctx.beginPath(); ctx.moveTo(cx, y - gap); ctx.lineTo(cx + seg, y - gap); ctx.moveTo(cx, y + gap); ctx.lineTo(cx + seg, y + gap); ctx.stroke();
          ctx.fillStyle = 'rgba(242,176,74,0.25)'; ctx.fillRect(cx + seg * 0.2, y - gap - 2 * DPR, seg * 0.6, 2 * gap + 4 * DPR);
          ctx.fillStyle = 'rgba(231,236,243,0.6)'; ctx.font = `${9 * DPR}px "IBM Plex Mono", monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(`κ${(spec.ks[i] * 100).toFixed(0)}`, cx + seg / 2, y);
          cx += seg;
          if (i < n) {
            const bump = Math.min(H * 0.16, (8 + spec.mult[i] * L * 1.2) * DPR);
            ctx.beginPath(); ctx.moveTo(cx, y - gap); ctx.lineTo(cx + seg * 0.15, y - gap - bump); ctx.lineTo(cx + seg * 0.85, y - gap - bump); ctx.lineTo(cx + seg, y - gap); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx, y + gap); ctx.lineTo(cx + seg, y + gap); ctx.stroke();
            cx += seg;
          }
        }
        cvPill(ctx, label, x + w / 2, y + gap + 14 * DPR, 'center', 'rgba(158,171,189,0.95)');
        return { inY: [y - gap, y + gap], outX: cx, outY: [y - gap, y + gap] };
      }
      const F1 = drawFilter(f1x, midY, fW, d.dL1, `F1 · ΔL ${d.dL1.toFixed(2)}`);
      const F2a = drawFilter(f2x, yA, fW, d.dL2, `F2A · ΔL ${d.dL2.toFixed(2)}`);
      const F2b = drawFilter(f2x, yB, fW, d.dL2, `F2B · ΔL ${d.dL2.toFixed(2)}`);
      ctx.strokeStyle = 'rgba(214,226,242,0.45)'; ctx.lineWidth = 1.2 * DPR;
      ctx.beginPath(); ctx.moveTo(pad, F1.inY[0]); ctx.lineTo(f1x, F1.inY[0]);
      ctx.moveTo(F1.outX, F1.outY[0]); ctx.bezierCurveTo(F1.outX + 20 * DPR, F1.outY[0], f2x - 20 * DPR, F2a.inY[0], f2x, F2a.inY[0]);
      ctx.moveTo(F1.outX, F1.outY[1]); ctx.bezierCurveTo(F1.outX + 20 * DPR, F1.outY[1], f2x - 20 * DPR, F2b.inY[0], f2x, F2b.inY[0]); ctx.stroke();
      cvPill(ctx, 'IN', pad, F1.inY[0] - 12 * DPR, 'left');
      const outs = [[F2a, 0], [F2a, 1], [F2b, 0], [F2b, 1]];
      outs.forEach(([F, j], port) => {
        const y = F.outY[j], ch = r.a.pm.indexOf(port);
        ctx.strokeStyle = cols[ch]; ctx.lineWidth = 2 * DPR; ctx.beginPath(); ctx.moveTo(F.outX, y); ctx.lineTo(W - pad - 84 * DPR, y); ctx.stroke();
        const ok = r.a.il[ch] <= l.s1.il && r.a.xt[ch] <= l.s1.xt;
        cvPill(ctx, `${Math.round(CH[ch] * 1000)} · ${r.a.il[ch].toFixed(1)}/${r.a.xt[ch].toFixed(0)}`, W - pad, y, 'right', ok ? '#5dd193' : '#ff6b6b');
      });
      ctx.fillStyle = 'rgba(158,171,189,0.85)'; ctx.font = `${9.5 * DPR}px "IBM Plex Mono", monospace`; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
      ctx.fillText('포트: λ · IL dB / XT dB', W - pad, H - 4 * DPR);
    },
    chartTitle: () => '포트 투과 스펙트럼 · CWDM4',
    chart(l, r) {
      use(l);
      const d = r.d, pts = [];
      for (let i = 0; i <= 184; i++) { const lam = 1.255 + 0.0005 * i; pts.push([lam * 1000, response(l, d, null, lam, null)]); }
      const cols = ['var(--cyan)', 'var(--pass)', 'var(--amber)', 'var(--rose)'];
      const series = [0, 1, 2, 3].map((ch) => ({ pts: pts.map((p) => [p[0], dB10(p[1][r.a.pm[ch]])]), color: cols[ch], width: 1.8 }));
      const html = svgChart({ x0: 1255, x1: 1347, y0: -35, y1: 0, aria: 'CWDM4 포트 스펙트럼', xticks: [1260, 1280, 1300, 1320, 1340], yticks: [0, -10, -20, -30], ylab: 'dB',
        bands: CH.map((c) => [(c - HALF) * 1000, (c + HALF) * 1000]), hlines: [{ y: l.s1.xt, label: `★ XT ${fmtT(l.s1.xt)} dB` }], series });
      return { html, legend: legendHTML(CH.map((c, i) => [cols[i], `CH${i + 1} ${Math.round(c * 1000)}`]).concat([['rgba(242,176,74,.35)', '통과대역 ±6.5 nm']])) };
    },
    coach(l, r, c) {
      use(l);
      const t = c.tier, d = r.d, ng = ngAt(d.wa, T0), L1 = LC * LC / (ng * 0.04), L2 = LC * LC / (ng * 0.08), n = (v, k = 2) => v.toFixed(k);
      if (Math.abs(d.dL1 - L1) > 0.06) return { h: '1단 인터리버의 FSR이 맞지 않습니다', b: `1단 필터는 20 nm 간격 채널을 홀/짝으로 나눠야 하므로 FSR = 40 nm가 필요합니다. ΔL₁을 ${d.dL1 < L1 ? '늘리세요' : '줄이세요'}.` + (t >= 2 ? ` 목표 ΔL₁ ≈ ${n(L1)} µm (n<sub>g</sub> = ${n(ng, 3)}).` : '') };
      if (Math.abs(d.dL2 - L2) > 0.04) return { h: '2단 필터의 FSR이 맞지 않습니다', b: `2단은 40 nm 떨어진 두 채널을 나누므로 FSR = 80 nm가 필요합니다. ΔL₂를 ${d.dL2 < L2 ? '늘리세요' : '줄이세요'}.` + (t >= 2 ? ` 목표 ΔL₂ ≈ ${n(L2)} µm.` : '') };
      for (const k of ['t1', 't2a', 't2b']) {
        const opt = optTrim(l, d, k); let dv = d[k] - opt; dv -= 2 * Math.round(dv / 2);
        if (Math.abs(dv) > 0.04 && !c.ob1) {
          const nm = k === 't1' ? '1단' : k === 't2a' ? '2단-A' : '2단-B';
          return { h: `${nm} 필터의 통과대역 중심이 채널과 어긋납니다`, b: '위상 트림은 필터 응답을 파장 축에서 평행이동시킵니다.' + (t >= 2 ? ` ${P[k].sym} ≈ ${n(opt)}π로 맞추세요.` : ` ${P[k].sym}를 ${dv < 0 ? '키우세요' : '줄이세요'}.`) };
        }
      }
      if (c.ob1 && !c.ob2 && (d.ord | 0) < 3 && r.xt > l.s2.xt) return { h: '★★ 크로스토크에는 더 평평한 응답이 필요합니다', b: `${d.ord | 0}차 lattice의 통과대역 가장자리 누설 한계가 ★★ 기준(${fmtT(l.s2.xt)} dB)보다 큽니다. 차수를 올려 3차 lattice로 바꾸세요. 차수를 바꾸면 위상 트림을 다시 맞춰야 합니다.` };
      if (!c.ob1 && (d.ord | 0) < 3 && r.xt > l.s1.xt) return { h: '사인형 응답으로는 크로스토크가 부족합니다', b: `${d.ord | 0}차 필터는 통과대역 가장자리(±6.5 nm)에서 이웃 채널이 새어 들어옵니다. 필터 차수를 올려 flat-top 응답을 만드세요 (2차 −11.5 dB, 3차 −16.4 dB 한계).` + (t >= 2 ? ' 차수를 바꾸면 트림 목표도 바뀝니다.' : '') };
      if (c.ob2 && c.fab && c.fab.yield < l.fab.y) {
        const shift = LC * 1000 * dndw(d.wa) * 0.008 / ng;
        if (d.wa < WIDE * 0.9) return { h: '공정 변동에 채널이 흔들립니다', b: `CD가 8 nm 변하면 채널이 약 ${shift.toFixed(1)} nm 이동합니다. 지연 암을 넓히면 ∂n<sub>eff</sub>/∂w가 작아져 둔감해집니다. 단, n<sub>g</sub>가 바뀌므로 ΔL과 트림을 다시 맞춰야 합니다.` + (t >= 2 ? ` wₐ ≈ ${WIDE.toFixed(2)} µm이면 이동량이 약 ${(LC * 1000 * dndw(WIDE) * 0.008 / ngAt(WIDE, T0)).toFixed(1)} nm로 줄어듭니다.` : '') };
        return { h: '두께 변동은 폭으로 막을 수 없습니다', b: `코어 두께가 조금만 달라도 n<sub>eff</sub>가 변해 채널 전체가 이동합니다 (Δλ ≈ λ·Δn<sub>eff</sub>/n<sub>g</sub>). 이것이 Stage 2에서 히터 트리밍(TO 위상기)을 배우는 이유입니다. 지금은 ${(d.ord | 0) < 3 ? '차수를 올려 통과대역을 넓히거나 ' : ''}트림을 채널 중심에 정확히 맞춰 여유를 확보하세요.` };
      }
      return null;
    },
    card(l, r) {
      use(l);
      return { kind: 'cwdm', lines: [`IL ${f2(r.il)} dB`, `XT ${f2(r.xt, 1)} dB`, `${r.d.ord | 0}차 lattice`],
        model: { ch: CH, il: r.a.il.map((v) => +v.toFixed(3)), xt: r.a.xt.map((v) => +v.toFixed(2)), ord: r.d.ord | 0 } };
    },
    aiStarts(l) {
      use(l);
      const s = l.start, out = [s];
      [[2, l.pf.w0], [3, WIDE]].forEach(([ord, wa]) => {
        const ng = ngAt(wa, T0), d = { ...s, ord, wa, dL1: +(LC * LC / (ng * 0.04)).toFixed(2), dL2: +(LC * LC / (ng * 0.08)).toFixed(2) };
        ['t1', 't2a', 't2b'].forEach((k) => { d[k] = +optTrim(l, d, k).toFixed(2); }); out.push(d);
      });
      return out;
    },
    _x: { neffAt, ngAt, dndw, optTrim, LAT, response, analyse: (l, d, proc) => { use(l); return analyse(l, d, proc); } }
  };
  return K;
})();
