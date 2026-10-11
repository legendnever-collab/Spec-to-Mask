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
  // wavelength window of the platform's CWDM grid (O-band 1271–1331, C-band 1531–1591 nm) with a 16 nm margin
  const axis = () => { const x0 = Math.round((CH[0] - 0.016) * 1000), x1 = Math.round((CH[3] + 0.016) * 1000), xt = []; for (let v = Math.ceil(x0 / 20) * 20; v <= x1; v += 20) xt.push(v); return { x0, x1, xt }; };
  const CHC = ['var(--cyan)', 'var(--pass)', 'var(--amber)', 'var(--rose)'];
  // four-port spectrum of the tree (port of channel c = pm[c]); opt.corner overlays a process corner (CD +8 nm, thickness +1σ)
  function portChart(l, d, pm, opt) {
    const A = axis(), pts = [], cpts = [], o = opt || {}, cor = { dw: 0.008, dt: l.pf.dt / 2 };
    for (let lam = A.x0 / 1000; lam <= A.x1 / 1000 + 1e-9; lam += 0.0005) { pts.push([lam * 1000, response(l, d, null, lam, null)]); if (o.corner) cpts.push([lam * 1000, response(l, d, cor, lam, null)]); }
    const series = [0, 1, 2, 3].map((ch) => ({ pts: pts.map((p) => [p[0], dB10(p[1][pm[ch]])]), color: CHC[ch], width: 1.8 }))
      .concat(o.corner ? [0, 1, 2, 3].map((ch) => ({ pts: cpts.map((p) => [p[0], dB10(p[1][pm[ch]])]), color: CHC[ch], width: 1, dash: '3 3' })) : []);
    const html = svgChart({ x0: A.x0, x1: A.x1, y0: -35, y1: 0, aria: `CWDM4 포트 스펙트럼 ${l.pf.band}`, xticks: A.xt, yticks: [0, -10, -20, -30], ylab: 'dB', xlab: 'λ nm', H: o.H,
      bands: CH.map((c) => [(c - HALF) * 1000, (c + HALF) * 1000]), hlines: [{ y: l.s1.xt, label: `★ XT ${fmtT(l.s1.xt)} dB` }], series });
    const leg = CH.map((c, i) => [CHC[i], `CH${i + 1} ${Math.round(c * 1000)}`]).concat([['rgba(242,176,74,.35)', '통과대역 ±6.5 nm']]);
    return { html, legend: legendHTML(o.corner ? leg.concat([['repeating-linear-gradient(90deg,var(--fg-2) 0 3px,transparent 3px 6px)', `공정 코너 (CD +8 nm · 두께 +${Math.round(l.pf.dt / 2 * 1000)} nm, 점선)`]]) : leg) };
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
    chartTitle: (l) => `포트 투과 스펙트럼 · CWDM4 ${l.pf.band}`,
    chart(l, r) { return portChart(l, r.d, r.a.pm, { corner: true }); },
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

  /* ===================== Guided learning steps for 1-7 =====================
     1 single 2×2 MZI → 2 F1 interleaver → 3 F2A/F2B (1×4 tree) → 4 higher-order lattice → 5 full design + Fab run.
     Every step uses the same n_eff/n_g tables, coupler matrices, filt() and response() as the full level, and a step is
     complete only when those results meet its goal (FSR, port power at channel centres, band-edge crosstalk) — never a score.
     Step values that are also level parameters (ΔL₁, φ₁, ΔL₂, φ₂ₐ, φ₂ᵦ, N) are written into the 1-7 design itself. */
  const aIdl = Math.sqrt(Math.pow(10, -0.005));   // same ideal-coupler excess loss as response()
  const cplOf = (spec) => spec.ks.map((k) => ({ k, a: aIdl }));
  const wrapPi = (t) => +((((t + 1) % 2) + 2) % 2 - 1).toFixed(4);   // π units → [−1, 1)
  const PCT = (x) => `${(x * 100).toFixed(1)}%`, NM = (lam) => Math.round(lam * 1000);
  const ngLam = (w, lam) => neffAt(w, T0, lam) - lam * (neffAt(w, T0, lam + 0.005) - neffAt(w, T0, lam - 0.005)) / 0.01;
  const fsrNm = (lam, ng, L) => lam * lam / (ng * L) * 1000;
  // one filter of lattice order ord at λ, light into port 0 → [P_bar, P_cross] (port 0 = bar)
  function filt1(ord, dL, trim, lam, wa) { const spec = LAT[ord] || LAT[1], v = filt(spec, 2 * Math.PI / lam * neffAt(wa, T0, lam) * dL + Math.PI * trim, cplOf(spec), null, [1, 0, 0, 0]); return [pw(v, 0), pw(v, 1)]; }
  // scan a π-unit trim over [−1, 1] for the best objective (ties → closest to the current value): the coach only suggests verified moves
  function scanTrim(cur, f) { let best = null; for (let i = 0; i <= 200; i++) { const t = +(-1 + 0.01 * i).toFixed(2), v = f(t); if (!best || v > best.v + 1e-9 || (Math.abs(v - best.v) <= 1e-9 && Math.abs(t - cur) < Math.abs(best.t - cur))) best = { t, v }; } return best; }
  const rec = (t, sym, v, unit, why) => (t >= 2 ? ` 권장: ${sym} = ${v}${unit} (기준: ${why}).` : '');

  /* ---------- drawing helpers for the steps ---------- */
  const COLS = ['#64c9df', '#5dd193', '#f2b04a', '#ff8d9c'];
  function bg(cv) { const ctx = cv.getContext('2d'); ctx.fillStyle = '#0b1220'; ctx.fillRect(0, 0, cv.width, cv.height); return ctx; }
  function txt(ctx, s, x, y, o) { o = o || {}; ctx.font = `${(o.size || 10.5) * DPR}px "IBM Plex Mono", monospace`; ctx.fillStyle = o.color || 'rgba(231,236,243,0.85)'; ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.base || 'middle'; ctx.fillText(s, x, y); }
  // 2×2 MZI schematic between x0 and x1 with arms at yT / yB; returns output points. pw = [[bar, cross] per colour], cols = colours
  function drawMZI(ctx, x0, x1, yT, yB, bump, lab, pws, cols) {
    const g = (yB - yT) / 2, ym = (yT + yB) / 2, c1 = x0 + (x1 - x0) * 0.18, c2 = x0 + (x1 - x0) * 0.82, cw = (x1 - x0) * 0.1;
    ctx.lineWidth = 1.6 * DPR; ctx.strokeStyle = 'rgba(214,226,242,0.75)';
    // couplers: the two guides come within a small gap over cw
    [c1, c2].forEach((cx) => { ctx.fillStyle = 'rgba(242,176,74,0.18)'; ctx.fillRect(cx - cw / 2, ym - g * 0.42, cw, g * 0.84); });
    const lane = (y, sgn) => { ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(c1 - cw * 0.9, y); ctx.quadraticCurveTo(c1 - cw / 2, y, c1 - cw / 2, ym + sgn * g * 0.22); ctx.lineTo(c1 + cw / 2, ym + sgn * g * 0.22); ctx.quadraticCurveTo(c1 + cw / 2, y, c1 + cw * 0.9, y); return ctx; };
    lane(yT, -1).stroke(); lane(yB, 1).stroke();
    // arms: upper arm carries the extra length ΔL as a bump
    ctx.beginPath(); ctx.moveTo(c1 + cw * 0.9, yT); const a0 = c1 + cw * 1.3, a1 = c2 - cw * 1.3; ctx.lineTo(a0, yT); ctx.lineTo(a0 + 6 * DPR, yT - bump); ctx.lineTo(a1 - 6 * DPR, yT - bump); ctx.lineTo(a1, yT); ctx.lineTo(c2 - cw * 0.9, yT); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(c1 + cw * 0.9, yB); ctx.lineTo(c2 - cw * 0.9, yB); ctx.stroke();
    const lane2 = (y, sgn) => { ctx.beginPath(); ctx.moveTo(c2 - cw * 0.9, y); ctx.quadraticCurveTo(c2 - cw / 2, y, c2 - cw / 2, ym + sgn * g * 0.22); ctx.lineTo(c2 + cw / 2, ym + sgn * g * 0.22); ctx.quadraticCurveTo(c2 + cw / 2, y, c2 + cw * 0.9, y); ctx.lineTo(x1, y); return ctx; };
    lane2(yT, -1).stroke(); lane2(yB, 1).stroke();
    txt(ctx, '3-dB', c1, ym, { align: 'center', size: 9, color: 'rgba(242,176,74,0.95)' }); txt(ctx, '3-dB', c2, ym, { align: 'center', size: 9, color: 'rgba(242,176,74,0.95)' });
    if (lab) txt(ctx, lab, (a0 + a1) / 2, yT - bump - 9 * DPR, { align: 'center', size: 9.5 });
    // light in each output, drawn as coloured strands whose opacity follows the port power
    (pws || []).forEach((p, i) => {
      [[yT, p[0]], [yB, p[1]]].forEach(([y, v]) => { ctx.strokeStyle = cols[i]; ctx.globalAlpha = 0.08 + 0.92 * v; ctx.lineWidth = (1 + 3 * v) * DPR; const off = (i - (pws.length - 1) / 2) * 3 * DPR; ctx.beginPath(); ctx.moveTo(c2 + cw, y + off); ctx.lineTo(x1, y + off); ctx.stroke(); });
    });
    ctx.globalAlpha = 1;
    return { c1, c2, cw, a0, a1, outT: [x1, yT], outB: [x1, yB] };
  }
  // stacked power bars for one output port: p = channel powers (0..1)
  function portBars(ctx, x, y, p, cols, w) {
    const h = 6 * DPR, bw = w || 46 * DPR;
    p.forEach((v, i) => { ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(x, y + (i - p.length / 2) * (h + 1.5 * DPR), bw, h); ctx.fillStyle = cols[i]; ctx.fillRect(x, y + (i - p.length / 2) * (h + 1.5 * DPR), bw * clamp(v, 0, 1), h); });
  }
  // colour key for the four channels ("which colour is which wavelength"), wraps to two rows when narrow
  function chLegend(ctx, x, y, maxW) {
    const item = 92 * DPR, per = Math.max(2, Math.min(4, Math.floor((maxW - 44 * DPR) / item)));
    txt(ctx, '색 =', x, y, { size: 10, color: 'rgba(158,171,189,0.95)' });
    CH.forEach((c, i) => {
      const cx = x + 30 * DPR + (i % per) * item, cy = y + Math.floor(i / per) * 14 * DPR;
      ctx.fillStyle = COLS[i]; ctx.beginPath(); ctx.arc(cx + 4 * DPR, cy, 4 * DPR, 0, 2 * Math.PI); ctx.fill();
      txt(ctx, `CH${i + 1} ${Math.round(c * 1000)} nm`, cx + 12 * DPR, cy, { size: 10, color: COLS[i] });
    });
  }
  // one output: title, then a row per channel — colour dot, name, power bar, % (power at the channel centre)
  function portList(ctx, x, y, title, p, w, wide) {
    const rh = 12 * DPR, top = y - (p.length * rh) / 2, lab = 30 * DPR, pct = wide ? 40 * DPR : 34 * DPR, bw = w - lab - pct;
    txt(ctx, title, x, top - 9 * DPR, { size: 10, color: 'rgba(231,236,243,0.9)' });
    p.forEach((v, i) => {
      const yy = top + i * rh + rh / 2, on = v >= 0.05;
      txt(ctx, `CH${i + 1}`, x, yy, { size: 9.5, color: on ? COLS[i] : 'rgba(158,171,189,0.45)' });
      ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(x + lab, yy - 3.5 * DPR, bw, 7 * DPR);
      ctx.fillStyle = COLS[i]; ctx.fillRect(x + lab, yy - 3.5 * DPR, bw * clamp(v, 0, 1), 7 * DPR);
      txt(ctx, `${Math.round(v * 100)}%`, x + w, yy, { size: 9.5, align: 'right', color: on ? 'rgba(231,236,243,0.9)' : 'rgba(158,171,189,0.45)' });
    });
  }

  function stepDefs(l) {
    use(l);
    const w0 = l.pf.w0, lA = CH[0], lB = CH[1], lm = (lA + lB) / 2;
    const ngm = ngLam(w0, lm), L40 = lm * lm / (ngm * 0.04), neA = neffAt(w0, T0, lA), dLtrim = LC / (2 * neffAt(w0, T0, LC)) * 0.5;
    // step help (map / knobs / how) — explanation only, no target values (those stay in the coach at tier ≥ 2)
    const [c1, c2, c3, c4] = CH.map(NM), neC = neffAt(w0, T0, LC);
    // how far a 0.01 µm change of ΔL slides the response: δλ = FSR · n_eff · δL / λ (it moves the curve as well as the FSR)
    const slide = (fsr) => (fsr * neC * 0.01 / LC).toFixed(1);
    const chip = (i) => `<span class="rm-ch" style="--c:${COLS[i]}">CH${i + 1} <b>${NM(CH[i])}</b></span>`;
    const grp = (a, b) => `<i style="--c:${COLS[a]}"></i><i style="--c:${COLS[b]}"></i><span>CH${a + 1}·CH${b + 1}</span>`;
    // where every colour must end up; `on` = the parts this step builds
    function routeMap(on, cap) {
      const o = (k) => (on.includes(k) ? ' on' : '');
      return `<div class="rmap" role="img" aria-label="경로 지도: 입력 CH1–CH4 → F1이 CH1·CH3 / CH2·CH4로 나눔 → F2A·F2B가 각 묶음을 한 색씩 → 출력 포트 4개">`
        + [['입력', ' (광섬유 1개)'], ['1단', ''], ['두 묶음', ''], ['2단', ''], ['출력', ' 포트 (한 색씩)']].map(([h, x], j) => `<span class="rm-h" style="grid-area:h${j + 1}">${h}${x ? `<span class="lg">${x}</span>` : ''}</span>`).join('')
        + `<div class="rm-c rm-in">${[0, 1, 2, 3].map((i) => chip(i)).join('')}</div>`
        + `<div class="rm-c rm-f rm-arr${o('f1')}" style="grid-area:f1">F1<small>홀/짝</small></div>`
        + `<div class="rm-c rm-g rm-arr${o('g')}" style="grid-area:ga">${grp(0, 2)}</div><div class="rm-c rm-g rm-arr${o('g')}" style="grid-area:gb">${grp(1, 3)}</div>`
        + `<div class="rm-c rm-f rm-arr${o('f2')}" style="grid-area:fa">F2A</div><div class="rm-c rm-f rm-arr${o('f2')}" style="grid-area:fb">F2B</div>`
        + `<div class="rm-c rm-o rm-arr${o('out')}" style="grid-area:oa">${chip(0)}${chip(2)}</div><div class="rm-c rm-o rm-arr${o('out')}" style="grid-area:ob">${chip(1)}${chip(3)}</div>`
        + `</div><p class="rm-cap">${cap}</p>`;
    }

    /* ---------- Step 1: single 2×2 MZI ---------- */
    const pL = { k: 'mL', label: '팔 길이 차 ΔL (위 팔이 더 김)', sym: 'ΔL', min: 2, max: 40, step: 0.01, dec: 2, unit: 'µm' };
    const pP = { k: 'mP', label: '위상 오프셋 φ (설계 위상)', sym: 'φ', min: -1, max: 1, step: 0.01, dec: 2, unit: 'π' };
    const ev1 = (d) => { const pa = filt1(1, d.mL, d.mP, lA, w0), pb = filt1(1, d.mL, d.mP, lB, w0), ph = (lam) => wrapPi(2 * neffAt(w0, T0, lam) * d.mL / lam + d.mP);
      return { d: { ...d }, pa, pb, phA: ph(lA), phB: ph(lB), fsr: fsrNm(lm, ngm, d.mL) }; };
    const s1 = {
      id: 'mzi', short: '단일 MZI', title: '단일 2×2 MZI — 간섭과 FSR', local: ['mL', 'mP'], aspect: 0.6,
      intro: `<b>이 레벨에서 할 일:</b> 광섬유 하나에 섞여 들어오는 네 가지 색(파장 채널 CH1–CH4, 20 nm 간격)을 출력 포트 네 개로 <b>한 색씩</b> 보내는 것입니다(아래 지도). 이 일을 하는 필터 F1·F2A·F2B는 모두 <b>MZI</b>라는 같은 부품이므로, 먼저 MZI 하나로 두 색 — λ<sub>A</sub> = CH1 ${NM(lA)} nm, λ<sub>B</sub> = CH2 ${NM(lB)} nm — 을 서로 다른 출구로 보내 보며 원리를 익힙니다.<br>`
        + `<b>MZI가 색을 가르는 원리:</b> ① 3-dB 커플러가 빛을 두 팔로 반씩 나눕니다 ② 위 팔이 ΔL만큼 길어 그 팔의 빛이 위상이 더 늦어집니다: Δφ(λ) = 2πn<sub>eff</sub>ΔL/λ + φ ③ 두 번째 커플러에서 두 빛이 다시 만나 간섭합니다 ④ Δφ = π면 전부 Bar, Δφ = 0이면 전부 Cross로 나갑니다(Bar = sin²(Δφ/2)). Δφ는 λ로 나눈 값이라 <b>색마다 다르고, 그래서 색마다 나가는 출구가 달라집니다.</b> 목표: λ<sub>A</sub>는 Bar로, λ<sub>B</sub>는 Cross로.`,
      map: routeMap(['f1'], `Step 1은 연습입니다 — 지도의 상자 하나(MZI 하나)가 두 색을 두 출구로 가르는 원리를 봅니다. 실제 네 색 분리는 Step 2(F1)부터입니다.`),
      knobs: [
        { sym: 'ΔL', name: '팔 길이 차', does: `색이 바뀔 때 위상차 Δφ가 얼마나 빨리 도는지를 정합니다. 그 결과 Bar/Cross 줄무늬의 반복 주기 <b>FSR = λ²/(n<sub>g</sub>ΔL)</b>가 정해집니다 — ΔL을 늘리면 줄무늬가 촘촘해집니다(FSR↓). 곡선의 위치도 함께 장파장(오른쪽)으로 밀립니다(FSR 40 nm 근처에서 ΔL 0.01 µm당 약 ${slide(40)} nm).`, see: '아래 두 위상 다이얼 바늘 사이의 각도(= 2π × 20 nm ÷ FSR), 스펙트럼 위 FSR 괄호' },
        { sym: 'φ', name: '위상 오프셋', does: '모든 색에 같은 위상을 더해 줄무늬 전체를 <b>모양 그대로 옆으로</b> 옮깁니다. FSR은 바뀌지 않습니다. φ를 키우면 장파장(오른쪽)으로, 0.5π가 FSR의 ¼만큼입니다(FSR 40 nm면 10 nm).', see: '두 다이얼 바늘이 같은 각도만큼 함께 돕니다. 스펙트럼의 회색 점선은 φ = 0일 때 곡선' }],
      how: [
        `<b>ΔL로 간격부터.</b> 두 색은 20 nm 떨어져 있습니다. 20 nm가 정확히 반 주기(FSR = 40 nm)가 되면 두 색의 위상차가 π — 한 색이 Bar 끝에 있을 때 다른 색은 반드시 Cross 끝에 있습니다. 두 다이얼 바늘이 <b>서로 정반대(180°)</b>를 가리킬 때까지 ΔL을 움직이세요.`,
        `<b>φ로 위치를 맞춥니다.</b> 두 바늘을 함께 돌려 λ<sub>A</sub>(청록) 바늘이 π(왼쪽 = Bar 100%)를 가리키게 하면, λ<sub>B</sub>(초록)는 저절로 0(오른쪽 = Cross 100%)에 옵니다.`,
        '<b>순서가 중요합니다.</b> ΔL은 간격과 위치를 함께 바꾸고 φ는 위치만 바꾸므로, 언제나 ΔL 먼저 → φ 마지막.'],
      doneText: 'MZI 하나가 파장에 따라 출력을 바꾸는 필터임을 확인했습니다. 주기(FSR)는 ΔL이, 통과 중심은 φ가 정합니다. 다음 단계에서 같은 MZI로 네 채널을 두 그룹으로 나눕니다.',
      init: () => ({ mL: +(L40 / 2).toFixed(2), mP: 0 }),
      params: () => [pL, pP],
      evaluate: (l, d) => ev1(d),
      goals: (l, r) => [
        { k: `FSR = λ²/(n<sub>g</sub>ΔL) ≈ 40 nm (두 파장 간격 20 nm의 2배)`, v: `${r.fsr.toFixed(1)} nm`, ok: Math.abs(r.fsr - 40) <= 2 },
        { k: `λ<sub>A</sub> ${NM(lA)} nm → Bar ≥ 95%`, v: PCT(r.pa[0]), ok: r.pa[0] >= 0.95 },
        { k: `λ<sub>B</sub> ${NM(lB)} nm → Cross ≥ 95%`, v: PCT(r.pb[1]), ok: r.pb[1] >= 0.95 }],
      done: (l, r) => Math.abs(r.fsr - 40) <= 2 && r.pa[0] >= 0.95 && r.pb[1] >= 0.95,
      coach(l, r, c) {
        const t = c.tier, d = r.d;
        if (Math.abs(r.fsr - 40) > 2) return { h: r.fsr > 40 ? 'FSR이 넓어 두 파장이 거의 같은 비율로 나갑니다' : 'FSR이 너무 좁습니다 (통과대역도 함께 좁아짐)',
          b: `두 파장을 서로 다른 출력으로 보내려면 둘 사이의 위상차가 π여야 합니다. 위상차 ≈ 2π·n<sub>g</sub>ΔL·Δλ/λ²이므로 간격 20 nm가 반주기, 즉 FSR = 40 nm가 되어야 합니다. 지금 FSR ${r.fsr.toFixed(1)} nm → FSR ∝ 1/ΔL이니 ΔL을 ${r.fsr > 40 ? '늘리세요' : '줄이세요'}.` + rec(t, 'ΔL', L40.toFixed(2), ' µm', `n<sub>g</sub> ${ngm.toFixed(3)} → FSR 40 nm`) };
        if (r.pa[0] < 0.95 || r.pb[1] < 0.95) {
          const po = wrapPi(1 - 2 * neA * d.mL / lA), dvv = wrapPi(po - d.mP);
          return { h: 'FSR은 맞습니다 — 이제 스펙트럼을 옆으로 옮기세요', b: `φ는 위상차에 상수를 더해 Bar/Cross 곡선 전체를 파장 축에서 평행이동시킵니다 (φ 0.5π ↔ FSR/4 = 10 nm). λ<sub>A</sub>에서 위상차가 정확히 π(Bar 최대)가 되게 하세요. 지금 λ<sub>A</sub>의 위상차 ${r.phA.toFixed(2)}π.` + (t >= 2 ? rec(t, 'φ', po.toFixed(2), 'π', 'Δφ(λ<sub>A</sub>) = π') : ` φ를 ${dvv > 0 ? '키우세요' : '줄이세요'}.`) };
        }
        return null;
      },
      meta: (l, r) => `${l.pf.short} · 단일 2×2 MZI · 이상적 3-dB 커플러 · 팔 폭 w₀ ${w0} µm: n<sub>eff</sub>(λ<sub>A</sub>) <b>${neA.toFixed(3)}</b>, n<sub>g</sub> <b>${ngm.toFixed(3)}</b> (2D 모드 솔버 테이블)`,
      tiles: (l, r) => [['FSR', `${r.fsr.toFixed(1)}<small>nm</small>`], [`λ_A ${NM(lA)} → Bar`, `${(r.pa[0] * 100).toFixed(1)}<small>%</small>`], [`λ_B ${NM(lB)} → Cross`, `${(r.pb[1] * 100).toFixed(1)}<small>%</small>`], ['Δφ(λ_A) · Δφ(λ_B)', `${r.phA.toFixed(2)}π · ${r.phB.toFixed(2)}π`]],
      hint: (l, r) => `FSR = λ²/(n<sub>g</sub>ΔL) → <b>ΔL ≈ ${L40.toFixed(2)} µm</b>이면 40 nm · Bar(λ) = sin²(Δφ/2), Δφ = 2πn<sub>eff</sub>(λ)ΔL/λ + φ<br>λ<sub>A</sub>를 Bar로: <b>φ ≈ ${wrapPi(1 - 2 * neA * r.d.mL / lA).toFixed(2)}π</b> (현재 ΔL 기준)`,
      draw(cv, l, r) {
        const ctx = bg(cv), W = cv.width, H = cv.height, pad = 12 * DPR, d = r.d, narrow = W / DPR < 520;
        const yT = H * 0.25, yB = H * 0.47, bump = Math.min(H * 0.13, (5 + d.mL * 0.9) * DPR);
        const m = drawMZI(ctx, pad + 30 * DPR, W - pad - 76 * DPR, yT, yB, bump, `ΔL = ${d.mL.toFixed(2)} µm · φ = ${d.mP.toFixed(2)}π`, [r.pa, r.pb], [COLS[0], COLS[1]]);
        ctx.strokeStyle = 'rgba(231,236,243,0.9)'; ctx.lineWidth = 2.2 * DPR; ctx.beginPath(); ctx.moveTo(pad, yT); ctx.lineTo(pad + 30 * DPR, yT); ctx.stroke();
        cvPill(ctx, 'IN λA+λB', pad, yT - 13 * DPR, 'left');
        txt(ctx, 'Bar', W - pad - 72 * DPR, yT - 10 * DPR, { size: 10 }); txt(ctx, 'Cross', W - pad - 72 * DPR, yB + 11 * DPR, { size: 10 });
        portBars(ctx, W - pad - 46 * DPR, yT, [r.pa[0], r.pb[0]], [COLS[0], COLS[1]], 44 * DPR); portBars(ctx, W - pad - 46 * DPR, yB, [r.pa[1], r.pb[1]], [COLS[0], COLS[1]], 44 * DPR);
        // step markers ①–④
        [['①', m.c1, (yT + yB) / 2 + (yB - yT) * 0.62], ['②', (m.a0 + m.a1) / 2, yB + 13 * DPR], ['③', m.c2, (yT + yB) / 2 + (yB - yT) * 0.62], ['④', W - pad - 60 * DPR, (yT + yB) / 2]].forEach(([s, x, y]) => txt(ctx, s, x, y, { align: 'center', size: 11, color: '#f2b04a' }));
        // phase dials for the two wavelengths
        const dy = H * 0.78, R = Math.min(H * 0.14, 36 * DPR), xs = narrow ? [W * 0.27, W * 0.73] : [W * 0.2, W * 0.5];
        [[lA, r.phA, r.pa, 0, 'Bar'], [lB, r.phB, r.pb, 1, 'Cross']].forEach(([lam, ph, p, i, want], k) => {
          const cx = xs[k], ok = want === 'Bar' ? p[0] >= 0.95 : p[1] >= 0.95;
          ctx.strokeStyle = 'rgba(158,171,189,0.5)'; ctx.lineWidth = 1 * DPR; ctx.beginPath(); ctx.arc(cx, dy, R, 0, 2 * Math.PI); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx - R - 4 * DPR, dy); ctx.lineTo(cx + R + 4 * DPR, dy); ctx.stroke();
          const ang = ph * Math.PI; ctx.strokeStyle = COLS[i]; ctx.lineWidth = 2.4 * DPR; ctx.beginPath(); ctx.moveTo(cx, dy); ctx.lineTo(cx + R * Math.cos(ang), dy - R * Math.sin(ang)); ctx.stroke();
          txt(ctx, 'π', cx - R - 7 * DPR, dy, { align: 'right', size: 9, color: 'rgba(158,171,189,0.9)' }); txt(ctx, '0', cx + R + 7 * DPR, dy, { size: 9, color: 'rgba(158,171,189,0.9)' });
          txt(ctx, `λ ${NM(lam)} · Δφ ${ph.toFixed(2)}π`, cx, dy - R - 10 * DPR, { align: 'center', size: 9.5, color: COLS[i] });
          txt(ctx, `Bar ${(p[0] * 100).toFixed(0)}% · Cross ${(p[1] * 100).toFixed(0)}% → ${want}`, cx, dy + R + 11 * DPR, { align: 'center', size: 9.5, color: ok ? '#5dd193' : '#ff6b6b' });
        });
        if (!narrow) { txt(ctx, 'Δφ = π → Bar 100%', W * 0.7, dy - 14 * DPR, { size: 10 }); txt(ctx, 'Δφ = 0 → Cross 100%', W * 0.7, dy + 2 * DPR, { size: 10 }); txt(ctx, `FSR ${r.fsr.toFixed(1)} nm`, W * 0.7, dy + 20 * DPR, { size: 10, color: Math.abs(r.fsr - 40) <= 2 ? '#5dd193' : '#f2b04a' }); }
      },
      chartTitle: () => '단일 MZI 투과 스펙트럼 (선형) — FSR = λ²/(n_gΔL), φ는 곡선을 평행이동',
      chart(l, r) {
        const d = r.d, x0 = Math.round((lm - 0.05) * 1000), x1 = Math.round((lm + 0.05) * 1000), bar = [], cr = [], g0 = [];
        for (let i = 0; i <= 400; i++) { const lam = x0 / 1000 + (x1 - x0) / 1000 * i / 400, p = filt1(1, d.mL, d.mP, lam, w0); bar.push([lam * 1000, p[0]]); cr.push([lam * 1000, p[1]]); if (Math.abs(d.mP) > 0.005) g0.push([lam * 1000, filt1(1, d.mL, 0, lam, w0)[0]]); }
        const pk = []; for (let i = 1; i < bar.length - 1; i++) if (bar[i][1] >= bar[i - 1][1] && bar[i][1] > bar[i + 1][1] && bar[i][1] > 0.5) pk.push(bar[i][0]);
        let br = null; for (let i = 0; i + 1 < pk.length; i++) { const mid = (pk[i] + pk[i + 1]) / 2; if (!br || Math.abs(mid - lm * 1000) < Math.abs(br[2] - lm * 1000)) br = [pk[i], pk[i + 1], mid]; }
        const xt = []; for (let v = Math.ceil(x0 / 20) * 20; v <= x1; v += 20) xt.push(v);
        const extra = (X, Y) => {
          let s = '';
          if (!br) s += `<text x="${X(x0) + 8}" y="${Y(1.1)}" font-size="11" font-family="var(--mono)" fill="var(--amber)">FSR ${r.fsr.toFixed(1)} nm — 창(100 nm)보다 넓어 한 주기만 보임</text>`;
          if (br) s += `<g stroke="var(--amber)" stroke-width="1.2"><line x1="${X(br[0])}" x2="${X(br[1])}" y1="${Y(1.1)}" y2="${Y(1.1)}"/><line x1="${X(br[0])}" x2="${X(br[0])}" y1="${Y(1.05)}" y2="${Y(1.15)}"/><line x1="${X(br[1])}" x2="${X(br[1])}" y1="${Y(1.05)}" y2="${Y(1.15)}"/></g><text x="${(X(br[0]) + X(br[1])) / 2}" y="${Y(1.1) - 4}" text-anchor="middle" font-size="11" font-family="var(--mono)" fill="var(--amber)">FSR ${(br[1] - br[0]).toFixed(1)} nm</text>`;
          [[lA, 'λA', r.pa[0], 'var(--cyan)'], [lB, 'λB', r.pb[1], 'var(--pass)']].forEach(([lam, n, v, c]) => { s += `<text x="${X(lam * 1000)}" y="${Y(-0.02) + 14}" text-anchor="middle" font-size="10.5" font-family="var(--mono)" fill="${c}">${n}</text>`; });
          return s;
        };
        const html = svgChart({ x0, x1, y0: 0, y1: 1.18, aria: '단일 MZI Bar/Cross 스펙트럼', xticks: xt, yticks: [0, 0.5, 1], ylab: '투과', xlab: 'λ nm', extra,
          vlines: [{ x: lA * 1000, color: 'rgba(100,201,223,.7)' }, { x: lB * 1000, color: 'rgba(93,209,147,.7)' }],
          series: (g0.length ? [{ pts: g0, color: 'var(--fg-3)', width: 1, dash: '3 4' }] : []).concat([{ pts: bar, color: 'var(--amber)', width: 2.2 }, { pts: cr, color: 'var(--rose)', width: 1.6 }]),
          marks: [{ x: lA * 1000, y: r.pa[0], color: 'var(--cyan)' }, { x: lB * 1000, y: r.pb[1], color: 'var(--pass)' }] });
        return { html, legend: legendHTML([['var(--amber)', 'Bar = sin²(Δφ/2)'], ['var(--rose)', 'Cross = cos²(Δφ/2)']].concat(g0.length ? [['var(--fg-3)', 'φ = 0일 때 Bar (이동 전)']] : [])) };
      }
    };

    /* ---------- Step 2: F1 interleaver (odd/even groups) ---------- */
    const ev2 = (d) => {
      const wa = d.wa, ng = ngAt(wa, T0), T = CH.map((c) => filt1(1, d.dL1, d.t1, c, wa));
      const s0 = Math.min(T[0][0], T[2][0], T[1][1], T[3][1]), s1v = Math.min(T[0][1], T[2][1], T[1][0], T[3][0]), A = s0 >= s1v ? 0 : 1;
      return { d: { ...d }, T, A, sep: Math.max(s0, s1v), fsr: fsrNm(LC, ng, d.dL1), ng, L1: LC * LC / (ng * 0.04) };
    };
    const grpTxt = (A) => (A === 0 ? ['Bar', 'Cross'] : ['Cross', 'Bar']);
    const s2 = {
      id: 'f1', short: 'F1 인터리버', title: 'F1 인터리버 — 네 채널을 홀/짝 두 그룹으로', fixed: { ord: 1 }, aspect: 0.56,
      intro: `이제 네 색이 모두 들어옵니다: CH1 ${c1} · CH2 ${c2} · CH3 ${c3} · CH4 ${c4} nm. MZI는 출구가 둘(Bar·Cross)뿐이라 넷을 한 번에 가를 수 없으므로 두 번에 나눕니다. 1단 F1의 일은 <b>“한 칸 건너” 짝을 지어 둘로 나누기</b> — CH1·CH3(Group A)은 한 출구로, CH2·CH4(Group B)는 다른 출구로. 이웃한 색(20 nm 차이)은 반대 출구, 한 칸 건넌 색(40 nm 차이)은 같은 출구로 가야 하므로 F1의 FSR은 40 nm입니다. 어느 묶음이 Bar로 가든 상관없습니다. ΔL₁·φ₁만 움직이며(1차 MZI 고정), 여기서 정한 값은 실제 1-7 설계의 F1에 그대로 기록됩니다.`,
      map: routeMap(['f1', 'g'], '이 단계: <b>F1</b>만 만듭니다. 네 색 → 두 묶음(CH1·CH3 / CH2·CH4). 묶음을 다시 한 색씩 나누는 F2A·F2B는 Step 3.'),
      knobs: [
        { sym: 'ΔL₁', name: 'F1 지연 (팔 길이 차)', does: `F1 줄무늬의 주기 FSR을 정합니다. FSR이 40 nm면 CH1과 CH3(40 nm 차이)의 위상차가 정확히 한 바퀴(2π) → <b>같은 출구</b>, 이웃한 색은 반 바퀴(π) → <b>반대 출구</b>가 됩니다. 늘리면 FSR↓, 그리고 곡선 전체가 오른쪽으로 밀립니다(0.01 µm당 약 ${slide(40)} nm).`, see: '‘F1 FSR’ 타일, 스펙트럼에서 Bar(주황)·Cross(분홍) 봉우리 사이 간격' },
        { sym: 'φ₁', name: 'F1 위상 트림', does: 'F1 곡선을 모양 그대로 옆으로 옮겨, 봉우리를 채널 중심(밝은 띠)에 올립니다. 키우면 오른쪽으로, 0.5π = 10 nm(FSR 40 nm의 ¼).', see: '그림 오른쪽 출구별 막대 — Bar 출구에 두 색, Cross 출구에 나머지 두 색만 남으면 성공' }],
      how: [
        'ΔL₁로 ‘F1 FSR’을 40 nm 근처(±2 nm)로 맞춥니다. 이때 곡선 위치도 움직이니 아직 채널이 섞여 있어도 괜찮습니다.',
        'φ₁로 곡선을 옮겨 CH1(청록) 막대가 한 출구에서 가득 차게 합니다. CH3(주황)은 정확히 한 주기 떨어져 있어 같은 출구에 함께 따라옵니다.',
        '확인: 출구마다 막대가 두 색씩(A: CH1·CH3, B: CH2·CH4)이면 완료. 네 색이 두 출구에 반씩 퍼져 있으면 FSR부터 다시 보세요.',
        '<b>왜 “앞 둘 / 뒤 둘”로 나누지 않을까?</b> MZI 응답은 둥근 사인 곡선이 주기적으로 반복됩니다. 이 곡선은 이웃 색을 번갈아 나누는 일(인터리버)에는 잘 맞지만, 40 nm 폭을 평평하게 통과시키는 일은 하지 못합니다.'],
      doneText: 'F1이 채널을 홀/짝 그룹으로 나눕니다. 다음 단계에서는 각 그룹을 다시 둘로 나눠 1×4 Demux를 완성합니다.',
      params: () => [P.dL1, P.t1],
      evaluate: (l, d) => ev2(d),
      goals: (l, r) => { const [ga, gb] = grpTxt(r.A); return [
        { k: 'F1 FSR ≈ 40 nm (채널 간격 20 nm × 2)', v: `${r.fsr.toFixed(1)} nm`, ok: Math.abs(r.fsr - 40) <= 2 },
        { k: `Group A: CH1·CH3 → ${ga} ≥ 95% (채널 중심)`, v: PCT(Math.min(r.T[0][r.A], r.T[2][r.A])), ok: Math.min(r.T[0][r.A], r.T[2][r.A]) >= 0.95 },
        { k: `Group B: CH2·CH4 → ${gb} ≥ 95%`, v: PCT(Math.min(r.T[1][1 - r.A], r.T[3][1 - r.A])), ok: Math.min(r.T[1][1 - r.A], r.T[3][1 - r.A]) >= 0.95 }]; },
      done: (l, r) => Math.abs(r.fsr - 40) <= 2 && r.sep >= 0.95,
      coach(l, r, c) {
        const t = c.tier, d = r.d;
        if (Math.abs(r.fsr - 40) > 2) return { h: 'F1의 FSR이 40 nm가 아닙니다 — 채널이 섞입니다', b: `이웃 채널(20 nm)은 반대 포트, 두 칸 떨어진 채널(40 nm)은 같은 포트로 가야 하므로 FSR = 40 nm. 지금 ${r.fsr.toFixed(1)} nm → ΔL₁을 ${r.fsr > 40 ? '늘리세요' : '줄이세요'}.` + rec(t, 'ΔL₁', r.L1.toFixed(2), ' µm', `n<sub>g</sub>(wₐ) ${r.ng.toFixed(3)} → FSR 40 nm`) };
        if (r.sep < 0.95) { const b = scanTrim(d.t1, (tv) => ev2({ ...d, t1: tv }).sep); if (b.v > r.sep + 1e-3) return { h: 'FSR은 맞습니다 — 통과 중심이 채널과 어긋나 있습니다', b: `φ₁로 F1 응답을 평행이동해 CH1·CH3의 피크가 한 포트에 오게 하세요. 지금 가장 나쁜 채널 ${PCT(r.sep)}.` + (t >= 2 ? rec(t, 'φ₁', b.t.toFixed(2), 'π', `CH1·CH3 → 같은 포트 최대 ${PCT(b.v)}`) : ` φ₁을 ${b.t > d.t1 ? '키우세요' : '줄이세요'}.`) }; }
        return null;
      },
      meta: (l, r) => `${l.pf.short} · F1 = 1차 MZI 인터리버 · 지연 암 wₐ ${r.d.wa.toFixed(2)} µm, n<sub>g</sub> <b>${r.ng.toFixed(3)}</b> · 채널 ${CH.map(NM).join('/')} nm`,
      tiles: (l, r) => [['F1 FSR', `${r.fsr.toFixed(1)}<small>nm</small>`], ['Group A 최소', `${(Math.min(r.T[0][r.A], r.T[2][r.A]) * 100).toFixed(1)}<small>%</small>`], ['Group B 최소', `${(Math.min(r.T[1][1 - r.A], r.T[3][1 - r.A]) * 100).toFixed(1)}<small>%</small>`], ['ΔL₁ 목표', `${r.L1.toFixed(2)}<small>µm</small>`]],
      hint: (l, r) => `FSR = λ²/(n<sub>g</sub>ΔL₁) = 40 nm → <b>ΔL₁ ≈ ${r.L1.toFixed(2)} µm</b> (n<sub>g</sub> ${r.ng.toFixed(3)})<br>그다음 φ₁로 CH1의 피크를 한 포트에 맞추면 CH3도 같은 포트(2π 차이)에 옵니다.`,
      draw(cv, l, r) {
        const ctx = bg(cv), W = cv.width, H = cv.height, pad = 12 * DPR, d = r.d, yT = H * 0.4, yB = H * 0.64, wide = W / DPR >= 520;
        chLegend(ctx, pad, 16 * DPR, W - 2 * pad);
        CH.forEach((c, i) => { ctx.strokeStyle = COLS[i]; ctx.lineWidth = 2 * DPR; ctx.beginPath(); ctx.moveTo(pad, yT - 9 * DPR + i * 6 * DPR); ctx.lineTo(pad + 52 * DPR, yT); ctx.stroke(); });
        cvPill(ctx, 'IN CH1–4', pad, yT - 24 * DPR, 'left');
        const listW = wide ? 150 * DPR : 112 * DPR;
        drawMZI(ctx, pad + 52 * DPR, W - pad - listW - 8 * DPR, yT, yB, Math.min(H * 0.14, (5 + d.dL1 * 0.8) * DPR), `F1 · ΔL₁ ${d.dL1.toFixed(2)} µm · φ₁ ${d.t1.toFixed(2)}π`, r.T, COLS);
        const [ga, gb] = grpTxt(r.A), x = W - pad - listW;
        // each exit: which colours actually leave there (name + %), so "CH1·CH3 → one exit" can be read directly
        [[yT, 0, 'Bar 출구'], [yB, 1, 'Cross 출구']].forEach(([y, j, n]) => portList(ctx, x, y, n, r.T.map((p) => p[j]), listW, wide));
        const ok = r.sep >= 0.95;
        txt(ctx, ok ? `✓ Group A (CH1·CH3) → ${ga} · Group B (CH2·CH4) → ${gb}` : '목표: 한 출구엔 CH1·CH3, 다른 출구엔 CH2·CH4 (어느 쪽이든 상관없음)', pad, H - 14 * DPR, { size: 10, color: ok ? '#5dd193' : '#f2b04a' });
        if (!ok) txt(ctx, '지금은 색이 섞여 있습니다 — 한 색이 두 출구에 나뉘어 나감', pad, H - 30 * DPR, { size: 10, color: '#ff6b6b' });
      },
      chartTitle: () => 'F1 출력 스펙트럼 (dB) — 채널 중심의 점이 원하는 포트에 와야 함',
      chart(l, r) {
        const A = axis(), d = r.d, bar = [], cr = [];
        for (let lam = A.x0 / 1000; lam <= A.x1 / 1000 + 1e-9; lam += 0.0005) { const p = filt1(1, d.dL1, d.t1, lam, d.wa); bar.push([lam * 1000, dB10(p[0])]); cr.push([lam * 1000, dB10(p[1])]); }
        const html = svgChart({ x0: A.x0, x1: A.x1, y0: -35, y1: 0, aria: 'F1 인터리버 스펙트럼', xticks: A.xt, yticks: [0, -10, -20, -30], ylab: 'dB', xlab: 'λ nm',
          bands: CH.map((c) => [(c - HALF) * 1000, (c + HALF) * 1000]), series: [{ pts: bar, color: 'var(--amber)', width: 2 }, { pts: cr, color: 'var(--rose)', width: 1.6 }],
          marks: CH.map((c, i) => ({ x: c * 1000, y: dB10(r.T[i][i % 2 === 0 ? r.A : 1 - r.A]), color: CHC[i] })) });
        return { html, legend: legendHTML([['var(--amber)', 'F1 Bar'], ['var(--rose)', 'F1 Cross']].concat(CH.map((c, i) => [CHC[i], `CH${i + 1} ${NM(c)} (원하는 포트의 투과)`]))) };
      }
    };

    /* ---------- Step 3: F2A / F2B → 1×4 demux ---------- */
    const ev3 = (d) => {
      const dd = { ...d, ord: 1 }, ng = ngAt(d.wa, T0), T = CH.map((c) => response(l, dd, null, c, null)), port = T.map((p) => p.indexOf(Math.max(...p)));
      // routing share: the fraction of each channel's output power that leaves through its port (coupler excess loss ≈ 0.05 dB × 4 is a loss,
      // not a routing error, so it is normalised out here and counted in step 4/5 where IL matters)
      const Tn = T.map((p) => { const s = p.reduce((a, b) => a + b, 0) || 1; return p.map((v) => v / s); });
      const distinct = new Set(port).size === 4, worst = distinct ? Math.min(...Tn.map((p, c) => p[port[c]])) : 0, f1 = ev2(d);
      const a = analyse(l, dd, null);
      return { d: dd, T, Tn, port, distinct, worst, f1, fsr: fsrNm(LC, ng, d.dL2), ng, L2: LC * LC / (ng * 0.08), a, xtBand: Math.max(...a.xt), ilBand: Math.max(...a.il) };
    };
    const f2obj = (r, which) => {   // F2A gets the group on F1's bar port; returns how well it splits its two channels
      const g = r.f1.A === 0 ? [[0, 2], [1, 3]] : [[1, 3], [0, 2]], [i, j] = which === 'a' ? g[0] : g[1], o = which === 'a' ? 0 : 2;
      return Math.max(Math.min(r.Tn[i][o], r.Tn[j][o + 1]), Math.min(r.Tn[i][o + 1], r.Tn[j][o]));
    };
    const s3 = {
      id: 'f2', short: 'F2A · F2B', title: 'F2A / F2B — 그룹 안의 두 채널 나누기 (1×4 Demux 완성)', fixed: { ord: 1 }, aspect: 0.56,
      intro: `F1을 지나면 출구마다 <b>두 색</b>이 남습니다. F1의 Bar 출구는 <b>F2A</b>로, Cross 출구는 <b>F2B</b>로 이어집니다(Step 2에서 CH1·CH3을 Bar로 보냈다면 F2A가 CH1·CH3, F2B가 CH2·CH4를 받습니다). 이제 F2A·F2B가 각자 받은 두 색을 자기 두 출구로 하나씩 보내면, 네 색이 네 포트로 하나씩 갈라진 <b>1×4 Demux</b>가 완성됩니다. 한 F2 안의 두 색은 40 nm 떨어져 있으므로 이번에는 40 nm가 반 주기, 즉 F2의 FSR은 80 nm입니다(ΔL₂ ≈ ΔL₁의 절반).`,
      map: routeMap(['g', 'f2', 'out'], '이 단계: <b>F2A·F2B</b>를 만듭니다. 각 묶음의 두 색 → 서로 다른 두 출력 포트. F1(Step 2 값)은 그대로 쓰입니다.'),
      knobs: [
        { sym: 'ΔL₂', name: '2단 지연 (F2A·F2B 공통)', does: `F2의 주기 FSR을 정합니다. 80 nm면 40 nm 떨어진 두 색의 위상차가 반 바퀴(π) → <b>서로 다른 출구</b>. 한 값이 F2A와 F2B에 함께 들어갑니다. 늘리면 FSR↓, 곡선은 오른쪽으로 밀립니다(0.01 µm당 약 ${slide(80)} nm).`, see: '‘F2 FSR’ 타일, ‘ΔL₂ / ΔL₁’ 타일(≈ 0.5 근처)' },
        { sym: 'φ₂ₐ', name: 'F2A 위상 트림', does: 'F2A 곡선만 옆으로 옮깁니다. 키우면 오른쪽으로, 0.5π = 20 nm(FSR 80 nm의 ¼).', see: '그림 위쪽 두 출력(F2A) — 출력마다 한 색만 남아야 합니다' },
        { sym: 'φ₂ᵦ', name: 'F2B 위상 트림', does: 'F2B 곡선만 옆으로 옮깁니다. F2B가 받는 색은 F2A의 색보다 20 nm(F2 주기의 ¼) 옆에 있어서, 맞는 값은 φ₂ₐ와 약 0.5π 다릅니다. 같은 값을 그대로 쓰면 F2B의 두 색이 반씩 섞입니다.', see: '그림 아래쪽 두 출력(F2B)' }],
      how: [
        '목표 2번째 줄(F1이 여전히 홀/짝을 가름)이 초록인지 먼저 봅니다. 빨강이면 Step 2로 돌아가 F1부터.',
        'ΔL₂로 ‘F2 FSR’을 80 nm 근처(±4 nm)로 맞춥니다.',
        'φ₂ₐ로 위쪽 두 출력이 한 색씩이 되게 → φ₂ᵦ로 아래쪽 두 출력도 한 색씩. 각 출력 옆 라벨이 초록(한 색 ≥ 95%)이면 그 출력은 완료입니다.',
        '완료 뒤 스펙트럼을 보세요: 채널 <b>중심</b>에서는 네 색이 갈렸지만, 밝은 띠(±6.5 nm)의 <b>가장자리</b>에서는 옆 색이 아직 꽤 새어 듭니다 — Step 4에서 해결합니다.'],
      doneText: '네 채널이 네 포트로 갈라지는 1×4 CWDM Demux 트리를 완성했습니다. 하지만 통과대역 가장자리(±6.5 nm)에서는 아직 크로스토크가 큽니다 — 다음 단계의 Lattice 필터가 그 해법입니다.',
      params: () => [P.dL2, P.t2a, P.t2b],
      evaluate: (l, d) => ev3(d),
      goals: (l, r) => [
        { k: 'F2 FSR ≈ 80 nm (그룹 내 간격 40 nm × 2)', v: `${r.fsr.toFixed(1)} nm`, ok: Math.abs(r.fsr - 80) <= 4 },
        { k: 'F1이 여전히 홀/짝을 가름 (≥ 95%)', v: PCT(r.f1.sep), ok: r.f1.sep >= 0.95 },
        { k: '네 채널 → 서로 다른 네 포트, 출력 전력의 ≥ 95% (채널 중심)', v: r.distinct ? PCT(r.worst) : '포트 겹침', ok: r.distinct && r.worst >= 0.95 },
        { k: '참고: 통과대역 가장자리(±6.5 nm) 최악 XT', v: `${r.xtBand.toFixed(1)} dB`, ok: r.xtBand <= l.s1.xt, na: true }],
      done: (l, r) => Math.abs(r.fsr - 80) <= 4 && r.f1.sep >= 0.95 && r.distinct && r.worst >= 0.95,
      coach(l, r, c) {
        const t = c.tier, d = r.d;
        if (r.f1.sep < 0.95) return { h: 'F1이 흐트러져 있습니다', b: 'F2는 F1이 홀/짝을 제대로 나눈 뒤에야 의미가 있습니다. 위 단계 번호 2를 눌러 F1부터 맞추세요.' };
        if (Math.abs(r.fsr - 80) > 4) return { h: 'F2의 FSR이 80 nm가 아닙니다', b: `F2는 40 nm 떨어진 두 채널을 가르므로 FSR = 80 nm, 즉 ΔL₂ ≈ ΔL₁/2입니다. 지금 ${r.fsr.toFixed(1)} nm → ΔL₂를 ${r.fsr > 80 ? '늘리세요' : '줄이세요'}.` + rec(t, 'ΔL₂', r.L2.toFixed(2), ' µm', `n<sub>g</sub> ${r.ng.toFixed(3)} → FSR 80 nm`) };
        for (const [k, w, nm] of [['t2a', 'a', 'F2A'], ['t2b', 'b', 'F2B']]) {
          const cur = f2obj(r, w); if (cur >= 0.95) continue;
          const b = scanTrim(d[k], (tv) => f2obj(ev3({ ...d, [k]: tv }), w));
          if (b.v > cur + 1e-3) return { h: `${nm}의 통과 중심이 어긋나 있습니다`, b: `${nm}의 두 채널이 한 포트씩 나가도록 ${P[k].sym}로 응답을 옮기세요. F2A와 F2B는 ΔL₂가 같아도 담당 채널이 20 nm 어긋나 있어 트림이 다릅니다. 지금 ${PCT(cur)}.` + (t >= 2 ? rec(t, P[k].sym, b.t.toFixed(2), 'π', `${nm} 분리 ${PCT(b.v)}`) : ` ${P[k].sym}를 ${b.t > d[k] ? '키우세요' : '줄이세요'}.`) };
        }
        return null;
      },
      meta: (l, r) => `${l.pf.short} · 1×4 트리 (F1 → F2A/F2B, 모두 1차 MZI) · 회로 S-matrix · 지연 암 손실 1.5 dB/cm · 채널 ${CH.map(NM).join('/')} nm`,
      tiles: (l, r) => [['F2 FSR', `${r.fsr.toFixed(1)}<small>nm</small>`], ['채널 중심 최악', r.distinct ? `${(r.worst * 100).toFixed(1)}<small>%</small>` : '겹침'], ['가장자리 최악 XT', `${r.xtBand.toFixed(1)}<small>dB</small>`], ['ΔL₂ / ΔL₁', `${(r.d.dL2 / r.d.dL1).toFixed(3)}`]],
      hint: (l, r) => `F2: FSR 80 nm → <b>ΔL₂ ≈ ${r.L2.toFixed(2)} µm</b> (= ΔL₁/2 근처)<br>F2A는 F1 ${r.f1.A === 0 ? 'Bar' : 'Cross'}의 CH1/CH3, F2B는 CH2/CH4를 받습니다 → φ₂ₐ·φ₂ᵦ를 따로 맞춥니다.`,
      draw(cv, l, r) {
        const ctx = bg(cv), W = cv.width, H = cv.height, pad = 12 * DPR, d = r.d, wide = W / DPR >= 520, bh = 38 * DPR;
        const bw = wide ? Math.min(124 * DPR, W * 0.2) : W * 0.2, labW = wide ? 122 * DPR : 54 * DPR, barW = wide ? 56 * DPR : 40 * DPR;
        chLegend(ctx, pad, 16 * DPR, W - 2 * pad);
        const top = wide ? 30 * DPR : 44 * DPR, f1 = [pad + 50 * DPR, top + (H - top) * 0.5], fa = [W * (wide ? 0.34 : 0.42), top + (H - top) * 0.27], fb = [fa[0], top + (H - top) * 0.75];
        const box = (x, y, t1, t2, ok) => { ctx.strokeStyle = ok ? 'rgba(93,209,147,0.8)' : 'rgba(214,226,242,0.6)'; ctx.lineWidth = 1.4 * DPR; ctx.strokeRect(x, y - bh / 2, bw, bh); txt(ctx, t1, x + bw / 2, y - 7 * DPR, { align: 'center', size: 10 }); txt(ctx, t2, x + bw / 2, y + 8 * DPR, { align: 'center', size: 9, color: 'rgba(158,171,189,0.95)' }); };
        ctx.strokeStyle = 'rgba(214,226,242,0.45)'; ctx.lineWidth = 1.2 * DPR;
        ctx.beginPath(); ctx.moveTo(pad, f1[1]); ctx.lineTo(f1[0], f1[1]); ctx.moveTo(f1[0] + bw, f1[1] - 8 * DPR); ctx.bezierCurveTo(f1[0] + bw + 30 * DPR, f1[1] - 8 * DPR, fa[0] - 30 * DPR, fa[1], fa[0], fa[1]);
        ctx.moveTo(f1[0] + bw, f1[1] + 8 * DPR); ctx.bezierCurveTo(f1[0] + bw + 30 * DPR, f1[1] + 8 * DPR, fb[0] - 30 * DPR, fb[1], fb[0], fb[1]); ctx.stroke();
        const sh = (s) => (wide ? s : s.replace(/^ΔL\S* [\d.]+ · /, ''));
        box(f1[0], f1[1], 'F1', sh(`ΔL₁ ${d.dL1.toFixed(2)} · ${d.t1.toFixed(2)}π`), r.f1.sep >= 0.95);
        box(fa[0], fa[1], 'F2A', sh(`ΔL₂ ${d.dL2.toFixed(2)} · ${d.t2a.toFixed(2)}π`), f2obj(r, 'a') >= 0.95); box(fb[0], fb[1], 'F2B', sh(`ΔL₂ ${d.dL2.toFixed(2)} · ${d.t2b.toFixed(2)}π`), f2obj(r, 'b') >= 0.95);
        // what each F2 receives: F1's bar → F2A, cross → F2B (names the group once F1 sorts them)
        const gTxt = (j) => (r.f1.sep >= 0.95 ? ((j === r.f1.A) ? 'CH1·CH3' : 'CH2·CH4') : '섞임');
        txt(ctx, `← F1 Bar: ${gTxt(0)}`, fa[0], fa[1] - bh / 2 - 7 * DPR, { size: 9, color: 'rgba(158,171,189,0.95)' });
        txt(ctx, `← F1 Cross: ${gTxt(1)}`, fb[0], fb[1] + bh / 2 + 9 * DPR, { size: 9, color: 'rgba(158,171,189,0.95)' });
        cvPill(ctx, 'IN', pad, f1[1] - 13 * DPR, 'left');
        // each of the four outputs: the colour that leaves there and its share of that channel's output (goal: one colour ≥ 95%)
        const ox = fa[0] + bw, bx = W - pad - labW - barW - 6 * DPR;
        [[fa, -9, 0], [fa, 9, 1], [fb, -9, 2], [fb, 9, 3]].forEach(([F, off, port], n) => {
          const y = F[1] + off * DPR * 1.9, ch = r.port.indexOf(port); ctx.strokeStyle = ch >= 0 && r.distinct ? COLS[ch] : 'rgba(214,226,242,0.45)'; ctx.lineWidth = 1.6 * DPR;
          ctx.beginPath(); ctx.moveTo(ox, F[1] + off * DPR); ctx.lineTo(bx - 8 * DPR, y); ctx.stroke();
          portBars(ctx, bx, y, r.T.map((p) => p[port]), COLS, barW);
          const sh2 = r.Tn.map((p) => p[port]), tot = r.T.reduce((a, p) => a + p[port], 0) || 1, mine = r.T.map((p) => p[port] / tot);
          const top1 = mine.indexOf(Math.max(...mine)), good = ch >= 0 && r.distinct && sh2[ch] >= 0.95;
          const lab = good ? `${wide ? `출력 ${n + 1} · ` : ''}CH${ch + 1} ${Math.round(sh2[ch] * 100)}%` : `${wide ? `출력 ${n + 1} · ` : ''}섞임${wide ? ` (CH${top1 + 1} ${Math.round(mine[top1] * 100)}%)` : ''}`;
          txt(ctx, lab, bx + barW + 6 * DPR, y, { size: 9.5, color: good ? COLS[ch] : '#ff6b6b' });
        });
        if (wide) txt(ctx, '목표: 출력 4개에 한 색씩 (막대 = 그 출력으로 나가는 CH1·2·3·4 전력)', W - pad, H - 10 * DPR, { align: 'right', size: 9.5, color: 'rgba(158,171,189,0.9)' });
      },
      chartTitle: () => '1×4 트리 포트 스펙트럼 (1차 MZI) — 사인형 응답의 가장자리 누설에 주목',
      chart: (l, r) => portChart(l, r.d, r.a.pm)
    };

    /* ---------- Step 4: higher-order lattice ---------- */
    const ORDS = [1, 2, 3], LEAK = { 1: -6.2, 2: -11.5, 3: -16.4 };
    const ev4 = (d) => { const a = analyse(l, d, null); return { d: { ...d }, a, il: Math.max(...a.il), xt: Math.max(...a.xt), size: area(d) }; };
    const s4 = {
      id: 'lat', short: 'Lattice 차수', title: '고차 Lattice — flat-top 통과대역과 크로스토크', aspect: 0.56,
      intro: `실제 CWDM 레이저의 파장은 제조 산포와 온도 때문에 채널 중심에서 ±6.5 nm까지 벗어날 수 있습니다. 그래서 필터는 중심 한 점이 아니라 <b>그 폭 전체(스펙트럼의 밝은 띠)</b>에서 자기 색은 통과시키고 옆 색은 막아야 합니다. 1차 MZI의 응답은 둥근 사인형이라 중심에서만 완벽하고, 띠 가장자리에서는 옆 색이 약 ${LEAK[1]} dB 새어 듭니다(크로스토크). 커플러 N+1개(결합비 κ가 서로 다름)와 지연 N단을 이어 붙인 <b>N차 Lattice</b>는 통과대역 윗부분을 평평하게(flat-top), 경사를 가파르게 만들어 이 누설을 줄입니다 — 대신 커플러·지연이 늘어 면적과 삽입 손실이 커집니다. 1·2·3차를 모두 비교하고 ★ 크로스토크를 달성하세요.`,
      map: routeMap(['f1', 'g', 'f2', 'out'], '이 단계: 길은 그대로, <b>F1·F2A·F2B 세 필터를 모두</b> N차로 바꿔 각 출력에 옆 색이 덜 섞이게 합니다. ΔL₁·ΔL₂는 앞 단계 값을 씁니다.'),
      knobs: [
        { sym: 'N', name: '필터 차수 (세 필터 공통)', does: `각 필터를 이루는 MZI 단의 수. 올리면 통과대역이 평평해지고 가장자리가 가팔라져, 띠 가장자리 누설 한계가 1차 ${LEAK[1]} → 2차 ${LEAK[2]} → 3차 ${LEAK[3]} dB로 내려갑니다(이상적 커플러). 대가: 커플러·지연이 늘어 면적과 삽입 손실↑.`, see: '위 그래프에서 차수별 F1 곡선 모양(실선 = 현재 차수), ‘면적’ 타일' },
        { sym: 'φ₁ φ₂ₐ φ₂ᵦ', name: '세 위상 트림', does: '차수를 바꾸면 필터 안의 설계 위상이 달라져 곡선 위치가 밀립니다. 세 트림을 다시 맞춰 각 통과대역을 채널 띠 한가운데로 되돌립니다. 역할은 Step 2·3과 같습니다(곡선을 옆으로 이동).', see: '아래 그래프 — 네 포트 곡선이 각자 자기 밝은 띠를 덮는지, 옆 색 곡선이 띠 안에서 ★ XT 점선 아래로 내려가는지' }],
      how: [
        'N을 1 → 2 → 3으로 바꾸며 위 그래프에서 통과대역 모양이 둥근 산에서 평평한 고원으로 바뀌는 것을 비교합니다(목표 1번째 줄).',
        '차수를 바꿀 때마다 φ₁ → φ₂ₐ → φ₂ᵦ 순서로 다시 맞춥니다. 앞 단(F1)이 어긋나면 뒤 단도 엉키므로 F1부터.',
        '‘최악 XT’가 ★ 기준 아래, ‘최악 IL’이 ★ 기준 아래면 완료입니다.'],
      doneText: '차수가 높을수록 통과대역이 평평해져 가장자리 크로스토크가 줄어드는 것을 실제 전달함수로 확인했습니다. 마지막 단계에서 모든 변수를 열고 Fab Run까지 갑니다.',
      params: () => [P.ord, P.t1, P.t2a, P.t2b],
      evaluate: (l, d) => ev4(d),
      observe: (l, r, mem) => { const o = r.d.ord | 0; mem.ords = mem.ords || []; if (!mem.ords.includes(o)) { mem.ords.push(o); return true; } return false; },
      goals: (l, r, mem) => { const seen = mem.ords || []; return [
        { k: '1차 · 2차 · 3차 응답 모두 비교', v: ORDS.map((o) => `${o}차${seen.includes(o) ? '✓' : '·'}`).join(' '), ok: ORDS.every((o) => seen.includes(o)) },
        { k: `최악 XT ≤ ★ ${fmtT(l.s1.xt)} dB (통과대역 ±6.5 nm 전체)`, v: `${r.xt.toFixed(1)} dB`, ok: r.xt <= l.s1.xt },
        { k: `최악 IL ≤ ★ ${fmtT(l.s1.il)} dB`, v: `${r.il.toFixed(2)} dB`, ok: r.il <= l.s1.il }]; },
      done: (l, r, mem) => ORDS.every((o) => (mem.ords || []).includes(o)) && r.xt <= l.s1.xt && r.il <= l.s1.il,
      coach(l, r, c) {
        const t = c.tier, d = r.d, N = d.ord | 0, seen = c.mem.ords || [];
        if (N < 3 && !ORDS.every((o) => seen.includes(o))) return { h: `${N}차 응답을 보았습니다 — 차수를 올려 비교하세요`, b: `${N}차 lattice는 커플러 ${N + 1}개, 가장자리 누설 한계 약 ${LEAK[N]} dB(이상적 커플러)입니다. 차수를 올려 ${N + 1}차의 통과대역 모양을 비교하세요. 차수를 올리면 설계 위상이 바뀌므로 트림도 다시 맞춰야 합니다.` };
        for (const k of ['t1', 't2a', 't2b']) {
          const opt = optTrim(l, d, k); let dvv = d[k] - opt; dvv -= 2 * Math.round(dvv / 2);
          if (Math.abs(dvv) > 0.04 && (r.xt > l.s1.xt || r.il > l.s1.il)) {
            const cand = ev4({ ...d, [k]: +wrapPi(opt).toFixed(2) });
            if (cand.xt < r.xt - 0.05 || cand.il < r.il - 0.01) return { h: `${N}차 설계 위상에 맞게 ${P[k].sym}를 다시 맞추세요`, b: `${N}차 lattice의 설계 위상 ph₀ = ${LAT[N].ph0.toFixed(2)} rad${N > 1 ? '와 커플러 사이 위상 오프셋' : ''}이 1차와 다르므로, 같은 ΔL이라도 통과 중심을 채널에 두는 트림 값이 달라집니다.` + (t >= 2 ? rec(t, P[k].sym, wrapPi(opt).toFixed(2), 'π', `${N}차 ph₀ 정렬`) : ` ${P[k].sym}를 ${dvv < 0 ? '키우세요' : '줄이세요'}.`) };
          }
        }
        if (r.xt > l.s1.xt || r.il > l.s1.il) {   // fallback: a verified one-parameter trim scan on the real band-edge metrics
          const q = (x) => Math.max((x.xt - l.s1.xt) / 4, (x.il - l.s1.il) / 0.3);
          const best = ['t1', 't2a', 't2b'].map((k) => ({ k, ...scanTrim(d[k], (tv) => -q(ev4({ ...d, [k]: tv }))) })).sort((x, y) => y.v - x.v)[0];
          if (best && -best.v < q(r) - 0.02 && (N === 3 || -best.v <= 0)) return { h: '트림을 조금 더 다듬으세요', b: `통과대역 가장자리 크로스토크와 손실을 함께 보며 ${P[best.k].sym}를 옮기면 좋아집니다.` + (t >= 2 ? rec(t, P[best.k].sym, best.t.toFixed(2), 'π', '±6.5 nm 최악 XT·IL 스캔') : ` ${P[best.k].sym}를 ${best.t > d[best.k] ? '키우세요' : '줄이세요'}.`) };
        }
        if (N < 3 && r.xt > l.s1.xt) return { h: '사인형에 가까운 응답으로는 크로스토크가 부족합니다', b: `차수를 올려 통과대역을 평평하게 만드세요 (2차 ${LEAK[2]} dB, 3차 ${LEAK[3]} dB 한계). 차수를 올린 뒤 트림을 다시 맞춥니다.` };
        if (N === 3 && !seen.includes(1)) return { h: '1차 응답도 비교해 보세요', b: '차수를 1로 내려 사인형 응답과 3차의 flat-top을 비교한 뒤 다시 올리세요.' };
        return null;
      },
      meta: (l, r) => `${l.pf.short} · ${r.d.ord | 0}차 lattice × 3 (F1, F2A, F2B) · 커플러 κ = ${LAT[r.d.ord | 0].ks.map((k) => (k * 100).toFixed(0)).join('/')}% · 회로 S-matrix, ±6.5 nm 통과대역 전체에서 IL·XT`,
      tiles: (l, r) => { const N = r.d.ord | 0; return [['차수 · 커플러 수', `${N}차 · ${N + 1}개`], ['최악 XT (±6.5 nm)', `${r.xt.toFixed(1)}<small>dB</small>`], ['최악 IL', `${r.il.toFixed(2)}<small>dB</small>`], ['면적', `${Math.round(r.size)}<small>µm²</small>`]]; },
      hint: (l, r) => `가장자리 누설 한계(이상적 커플러): 1차 ${LEAK[1]} · 2차 ${LEAK[2]} · 3차 ${LEAK[3]} dB<br>트림 목표: φ₁ ≈ <b>${wrapPi(optTrim(l, r.d, 't1')).toFixed(2)}π</b>, φ₂ₐ ≈ <b>${wrapPi(optTrim(l, r.d, 't2a')).toFixed(2)}π</b>, φ₂ᵦ ≈ <b>${wrapPi(optTrim(l, r.d, 't2b')).toFixed(2)}π</b> (현재 차수 기준)`,
      draw: (cv, l, r, ui) => K.draw(cv, l, r, ui),
      chartTitle: () => 'F1 전달함수 비교 (각 차수의 최적 트림) · 아래: 현재 설계의 4포트 스펙트럼',
      chart(l, r) {
        const A = axis(), d = r.d, N = d.ord | 0, ser = [], cols = { 1: 'var(--fg-2)', 2: 'var(--cyan)', 3: 'var(--amber)' };
        ORDS.forEach((o) => { const dd = { ...d, ord: o }, tr = optTrim(l, dd, 't1'), pts = []; for (let lam = A.x0 / 1000; lam <= A.x1 / 1000 + 1e-9; lam += 0.0005) pts.push([lam * 1000, dB10(filt1(o, d.dL1, tr, lam, d.wa)[0])]); ser.push({ pts, color: cols[o], width: o === N ? 2.6 : 1.2, dash: o === N ? '' : '4 3' }); });
        const top = svgChart({ x0: A.x0, x1: A.x1, y0: -35, y1: 0, aria: 'Lattice 차수별 F1 전달함수', xticks: A.xt, yticks: [0, -10, -20, -30], ylab: 'dB', H: 200,
          bands: CH.map((c) => [(c - HALF) * 1000, (c + HALF) * 1000]), hlines: [{ y: l.s1.xt, label: `★ XT ${fmtT(l.s1.xt)} dB` }], series: ser });
        const bot = portChart(l, d, r.a.pm, { H: 200 });
        return { html: top + bot.html, legend: legendHTML(ORDS.map((o) => [cols[o], `F1 Bar · ${o}차 (누설 한계 ${LEAK[o]} dB)${o === N ? ' ← 현재' : ''}`])) + '<br>' + bot.legend };
      }
    };

    /* ---------- Step 5: full design (all parameters, score, Fab) ---------- */
    const s5 = {
      id: 'full', full: true, short: 'Full · Fab', title: 'Full CWDM 설계 · Fab Run',
      intro: `모든 변수(차수, ΔL₁·ΔL₂, 세 위상 트림, 지연 암 폭 wₐ)가 열리고 점수·AI 라이벌·Fab Run이 켜집니다. ★ IL·XT → ★★ 더 엄격한 XT와 면적 → ★★★ Tape-out 수율. 스펙트럼의 점선은 공정 코너(CD +8 nm, 두께 +${Math.round(l.pf.dt / 2 * 1000)} nm)에서 같은 설계가 얼마나 밀리는지 보여줍니다. <b>Phase Trim과 TO 히터는 다릅니다.</b> 지금의 φ는 마스크에 그려지는 설계 위상(지연 팔에 δL = φ·λ/(2n<sub>eff</sub>), 예: 0.5π ≈ ${(dLtrim * 1000).toFixed(0)} nm 더 긴 경로)으로 <i>공칭</i> 정렬만 할 뿐, 칩마다 다른 공정 오차는 고칠 수 없습니다. Stage 2-1의 TO 히터는 제작 후 다이마다 전력으로 위상을 다시 맞추는 <i>능동 보정</i>입니다. 이 단계는 ★ 설계로 Tape-out을 한 번 해 보면 완료됩니다.`,
      map: routeMap(['f1', 'g', 'f2', 'out'], '이 단계: 전체 Demux를 한꺼번에 다룹니다. 길과 손잡이의 역할은 Step 2–4와 같고, 새로 열리는 것은 지연 팔의 폭 wₐ입니다.'),
      knobs: [
        { sym: 'N', name: '필터 차수', does: '통과대역의 평평함 ↔ 면적·손실 (Step 4).' },
        { sym: 'ΔL₁ ΔL₂', name: '지연', does: 'F1(40 nm) · F2(80 nm)의 주기 FSR (Step 2·3). 곡선 위치도 함께 밀리므로 바꾼 뒤엔 트림을 다시 봅니다.' },
        { sym: 'φ₁ φ₂ₐ φ₂ᵦ', name: '위상 트림', does: '각 필터 곡선을 옆으로 옮겨 채널 띠 중앙에 맞춤 (Step 2·3·4).' },
        { sym: 'wₐ', name: '지연 팔 폭', does: '넓히면 폭(CD) 오차가 n<sub>eff</sub>를 덜 흔들어(∂n<sub>eff</sub>/∂w↓) 채널이 덜 밀립니다 → 수율에 유리. 대신 n<sub>g</sub>가 바뀌어 FSR이 달라지므로 ΔL₁·ΔL₂와 트림을 다시 맞춰야 합니다.', see: '‘CD 10 nm당 채널 이동’ 타일, 스펙트럼의 점선(공정 코너에서 같은 설계가 밀린 모습)' }],
      how: [
        '★: 앞 단계 값이 그대로 들어와 있습니다. 최악 IL·XT를 ★ 기준 아래로.',
        '★★: 더 엄격한 XT — 3차 lattice와 정밀한 트림, 그리고 면적.',
        '★★★(Tape-out 수율): wₐ를 넓혀 폭 오차에 둔감하게 → ΔL·트림 다시 맞춤 → Tape-out. 두께 오차는 패시브 설계로는 막을 수 없어서, ★★★는 패시브만으로는 거의 닿지 않습니다(Stage 2-1 히터가 해법).'],
      fullDone: (l, r, c) => !!c.fab && c.ob[0].pass
    };
    return [s1, s2, s3, s4, s5];
  }
  K.steps = (l) => stepDefs(l);
  Object.assign(K._x, { filt1, axis, ngLam, LEAK: { 1: -6.2, 2: -11.5, 3: -16.4 } });   // used by the Learning Guide's interactive example
  return K;
})();
