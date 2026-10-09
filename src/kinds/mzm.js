// ===== Kind: traveling-wave Mach–Zehnder modulator (series push-pull, segmented CPW) =====
// Electrode: CPW (signal 15 µm) via conformal mapping (Hilberg K/K′), quasi-TEM ε_eff = (ε_Si + 1)/2.
// Loading: series push-pull junction pair per unit length, Y′ = η·jωC′/2 / (1 + jωR′C′) (C′, R′ from the 2-2 card).
// Line: telegrapher γ, Z_L with √f conductor loss; source 50 Ω, termination R_T, reflections at both ends.
// EO response: junction voltage integrated along the arm in the optical frame (velocity mismatch, attenuation, RC).
// Eye: 112 GBd PAM4 through driver (2nd-order, 70 GHz) × EO response, then the MZM sine transfer.
KINDS.mzm = (() => {
  const C0 = 2.998e8, SW = 15, NU = Math.sqrt((11.7 + 1) / 2), ZS = 50, VS = 2.5, PIN = 13, BAUD = 112, NG = 3.9, FDRV = 70, FMAX = 240;
  const kk = (k) => { const kp = Math.sqrt(1 - k * k); return k <= 0.7071 ? Math.PI / Math.log(2 * (1 + Math.sqrt(kp)) / (1 - Math.sqrt(kp))) : Math.log(2 * (1 + Math.sqrt(k)) / (1 - Math.sqrt(k))) / Math.PI; };
  const Zu = (g) => 30 * Math.PI / NU / kk(SW / (SW + 2 * g));
  const acond = (g) => 0.35 + 3.0 / g;                        // dB/cm/√GHz (current crowding at narrow gaps)
  const gaussLike = (proc, k) => gaussR(mulberry((proc.seed || 1) * 13 + k * 211));
  const cards = () => (typeof window !== 'undefined' ? window.GAME_CARDS : global.GAME_CARDS) || {};
  function pnModel(l, d) {
    const c = cards()['2-2'];
    if (d.useCard && c && c.model) return { ...c.model, src: '내 2-2 카드' };
    return { ...l.pnRef, src: '기준 PN 위상기' };
  }
  const P = [
    { k: 'L', label: '전극(변조) 길이', sym: 'L', min: 0.5, max: 6, step: 0.05, dec: 2, unit: 'mm' },
    { k: 'g', label: 'CPW 신호–접지 간격', sym: 'g', min: 4, max: 60, step: 0.5, dec: 1, unit: 'µm' },
    { k: 'eta', label: '세그먼트 채움 비율', sym: 'η', min: 0.3, max: 1, step: 0.01, dec: 2, unit: '' },
    { k: 'RT', label: '종단 저항', sym: 'R<sub>T</sub>', min: 20, max: 70, step: 1, dec: 0, unit: 'Ω' }
  ];
  function build(l, d, proc) {
    const pn = pnModel(l, d), g = (k) => (proc ? gaussLike(proc, k) : 0);
    const VpiL = pn.VpiL * (1 + 0.05 * g(1)), Cp = pn.Cp * 1e-9 * (1 + 0.05 * g(2)), Rp = pn.Rp * 1e-3 * (1 + 0.08 * g(3)), loss = pn.loss * (1 + 0.05 * g(6));
    const RT = d.RT * (1 + 0.03 * g(4)), z0 = Zu(d.g) * (1 + 0.03 * g(5)), Lm = d.L * 1e-3, eta = d.eta;
    const Lp = z0 * NU / C0, Cu = NU / (C0 * z0), ac = acond(d.g) / 8.686 * 100;
    function line(fG) {
      const w = 2 * Math.PI * fG * 1e9, Z = [2 * z0 * ac * Math.sqrt(fG), w * Lp];
      const yl = cx.div([0, w * eta * Cp / 2], [1, w * Rp * Cp]), Y = [yl[0], w * Cu + yl[1]];
      return { w, gam: cx.sqrt(cx.mul(Z, Y)), ZL: cx.sqrt(cx.div(Z, Y)) };
    }
    function resp(fG) {
      fG = Math.max(fG, 1e-3);
      const { w, gam, ZL } = line(fG), one = [1, 0];
      const GL = cx.div(cx.sub([RT, 0], ZL), cx.add([RT, 0], ZL)), Ge = cx.mul(GL, cx.exp(cx.sc(gam, -2 * Lm)));
      const Zin = cx.mul(ZL, cx.div(cx.add(one, Ge), cx.sub(one, Ge)));
      const V0 = cx.mul([VS, 0], cx.div(Zin, cx.add(Zin, [ZS, 0]))), Vp = cx.div(V0, cx.add(one, Ge));
      const ko = w * NG / C0, a1 = cx.add(cx.sc(gam, -1), [0, ko]), a2 = cx.add(gam, [0, ko]);
      const I1 = cx.div(cx.sub(cx.exp(cx.sc(a1, Lm)), one), a1), I2 = cx.mul(Ge, cx.div(cx.sub(cx.exp(cx.sc(a2, Lm)), one), a2));
      const V = cx.sc(cx.div(cx.mul(Vp, cx.add(I1, I2)), [1, w * Rp * Cp]), 1 / Lm);
      return { V, s11: cx.div(cx.sub(Zin, [ZS, 0]), cx.add(Zin, [ZS, 0])), ZL, gam };
    }
    return { pn, VpiL, Cp, Rp, loss, RT, z0, Lm, eta, line, resp };
  }
  const drv = (f) => { const x = f / FDRV; return cx.div([1, 0], [1 - x * x, Math.SQRT2 * x]); };
  function analyse(l, d, proc) {
    const b = build(l, d, proc), V0 = b.resp(1e-3).V, v0 = cx.abs(V0), DF = 2, NF = FMAX / DF;
    const grid = [[1, 0]]; for (let i = 1; i <= NF; i++) grid.push(cx.div(b.resp(i * DF).V, V0));
    const Hn = (f) => { const x = f / DF, i = Math.floor(x); if (i >= NF) return grid[NF]; const t = x - i, a = grid[i], c = grid[i + 1]; return [a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t]; };
    let bw = 120; for (let i = 1; i <= 60; i++) { const a = cx.abs(grid[i - 1]), c = cx.abs(grid[i]); if (c < Math.SQRT1_2) { bw = (i - 1 + (a - Math.SQRT1_2) / Math.max(a - c, 1e-9)) * DF; break; } }
    const Vpi = b.VpiL / (b.eta * d.L * 0.1), th = Math.PI * v0 / (2 * Vpi);
    const IL = b.loss * b.eta * d.L + 0.2 * (1 - b.eta) * d.L + 1.0, P0 = Math.pow(10, (PIN - IL) / 10), oma = P0 * Math.sin(Math.min(th, Math.PI / 2));
    const st = Math.sin(Math.min(th, Math.PI / 2)), nl = th > 1e-6 ? (x) => Math.sin(th * x) / st : null;
    const Ht = (f) => (f > FMAX ? [0, 0] : cx.mul(Hn(f), drv(f)));
    const eye = pam4Eye(Ht, BAUD, 128, 16, nl, 5), pen = eye.ratio > 0.02 ? Math.max(0, -10 * Math.log10(Math.min(1, eye.ratio))) : 17;
    const r56 = b.resp(56), s11 = 20 * Math.log10(Math.max(cx.abs(r56.s11), 1e-6)), nmw = r56.gam[1] * C0 / (2 * Math.PI * 56e9), ZL = cx.abs(r56.ZL);
    return { bw, Vpi, v0, th, IL, oma, omaDbm: 10 * Math.log10(Math.max(oma, 1e-9)), pen, eye, s11, nmw, ZL, z0: b.z0, pn: b.pn, Hn, Ht, size: d.L * 1000 };
  }
  const r1 = (l, r) => Math.max(l.s1.bw / r.bw, r.IL / l.s1.il, l.s1.oma / r.oma);
  const r2 = (l, r) => Math.max(r.pen / l.s2.pen, l.s2.oma / r.oma);
  const dbm = (mw) => (10 * Math.log10(mw)).toFixed(1);
  const K = {
    title: 'TW-MZM', aspect: 0.5, sizeLabel: '전극 길이', sizeUnit: 'µm', primaryLabel: 'OMA−페널티 dBm',
    params: () => P, landKeys: () => ['L', 'g', 'eta', 'RT'], violation: () => 0,
    toggles: () => [{ k: 'useCard', label: '내 PN 위상기 카드(2-2)를 변조기 코어로 사용', needs: '2-2' }],
    evaluate(l, d, proc, opt) { const a = analyse(l, d, proc); return { d: { ...d }, ...a, drc: [], primary: a.omaDbm - a.pen, secondary: a.bw }; },
    perf(l, r) { return 200 * clamp(1 - r.pen / 6, 0, 1) + 150 * clamp(r.bw / 70, 0, 1) + 150 * clamp((r.omaDbm + 4) / 8, 0, 1); },
    q1: r1, q2: r2,
    objectives(l, r) {
      return {
        t1: [{ k: `EO 대역폭 ≥ ${fmtT(l.s1.bw)} GHz`, v: f2(r.bw, 1) + ' GHz', ok: r.bw >= l.s1.bw }, { k: `삽입 손실 ≤ ${fmtT(l.s1.il)} dB`, v: f2(r.IL, 2) + ' dB', ok: r.IL <= l.s1.il },
          { k: `OMA<sub>outer</sub> ≥ ${dbm(l.s1.oma)} dBm`, v: f2(r.omaDbm, 2) + ' dBm', ok: r.oma >= l.s1.oma }],
        t2: [{ k: `112 GBd PAM4 눈 페널티 ≤ ${fmtT(l.s2.pen)} dB`, v: f2(r.pen, 2) + ' dB', ok: r.pen <= l.s2.pen }, { k: `OMA<sub>outer</sub> ≥ ${dbm(l.s2.oma)} dBm`, v: f2(r.omaDbm, 2) + ' dBm', ok: r.oma >= l.s2.oma }]
      };
    },
    fabPass: (l, r) => r.pen <= l.fab.pen && r.oma >= l.fab.oma && r.bw >= l.s1.bw,
    fabCrit: (l) => `눈 페널티 ≤ ${fmtT(l.fab.pen)} dB · OMA ≥ ${dbm(l.fab.oma)} dBm (V<sub>π</sub>L ±5%, C′ ±5%, R′ ±8%, Z ±3%)`,
    meta(l, r) { return `${r.pn.src}: V<sub>π</sub>L ${f2(r.pn.VpiL)} V·cm · C′ ${f2(r.pn.Cp, 2)} pF/mm · R′ ${f2(r.pn.Rp, 1)} Ω·mm<br>구동 ${VS} V<sub>pp</sub> (50 Ω 소스, 개방 전압) · 입력 ${PIN} dBm · 드라이버 ${FDRV} GHz · 직렬 push-pull · n<sub>g,opt</sub> ${NG}`; },
    tiles(l, r) { return [['EO 대역폭', `${f2(r.bw, 1)}<small>GHz</small>`], ['OMA · 페널티', `${f2(r.omaDbm, 1)}<small>dBm</small> · ${f2(r.pen, 1)}<small>dB</small>`], ['Z<sub>L</sub> · n<sub>µ</sub> @56G', `${Math.round(r.ZL)}<small>Ω</small> · ${f2(r.nmw, 2)}`], ['V<sub>π</sub> · S11', `${f2(r.Vpi, 1)}<small>V</small> · ${Math.round(r.s11)}<small>dB</small>`]]; },
    hint(l, r) {
      return `세 가지가 대역폭을 정합니다: ① 속도 정합 — RF 위상속도 n<sub>µ</sub> ≈ n<sub>g,opt</sub> ${NG} (지금 ${f2(r.nmw, 2)}) ② 임피던스 — 부하된 선로 Z<sub>L</sub> ≈ R<sub>T</sub> (지금 ${Math.round(r.ZL)} vs ${l.id ? Math.round(r.d.RT) : ''} Ω) ③ RF 손실 — 길수록, 간격이 좁을수록 커집니다<br>접합 C를 실으면 n<sub>µ</sub>↑, Z<sub>L</sub>↓ — 세그먼트 채움 η로 부하량을 조절합니다<br>V<sub>π</sub> = V<sub>π</sub>L / (ηL): 길게 만들면 OMA는 늘지만 손실과 대역폭이 나빠집니다`;
    },
    draw(cv, l, r, ui) {
      const ctx = cv.getContext('2d'), W = cv.width, H = cv.height, pad = 12 * DPR, narrow = W / DPR < 520;
      ctx.fillStyle = '#0b1220'; ctx.fillRect(0, 0, W, H);
      const ex = pad, ey = pad + 18 * DPR, ew = (narrow ? W : W * 0.62) - 2 * pad, eh = H - ey - pad, tr = r.eye.traces, n = tr[0].length;
      const lo = Math.min(...tr.flat()), hi = Math.max(...tr.flat()), sp = Math.max(hi - lo, 1e-6), X = (i) => ex + i / (n - 1) * ew, Y = (v) => ey + (1 - (v - lo + 0.08 * sp) / (sp * 1.16)) * eh;
      ctx.strokeStyle = 'rgba(100,201,223,0.16)'; ctx.lineWidth = 1.2 * DPR;
      tr.forEach((t) => { ctx.beginPath(); t.forEach((v, i) => (i ? ctx.lineTo(X(i), Y(v)) : ctx.moveTo(X(i), Y(v)))); ctx.stroke(); });
      ctx.strokeStyle = 'rgba(242,176,74,0.7)'; ctx.setLineDash([3 * DPR, 3 * DPR]); ctx.beginPath(); ctx.moveTo(X(r.eye.sps / 2), ey); ctx.lineTo(X(r.eye.sps / 2), ey + eh); ctx.stroke(); ctx.setLineDash([]);
      cvPill(ctx, `${narrow ? '' : '112 GBd PAM4 · '}눈 ${Math.round(Math.max(r.eye.ratio, 0) * 100)}% · 페널티 ${r.pen.toFixed(1)} dB${narrow ? ` · EO ${Math.round(r.bw)} GHz` : ''}`, ex, pad + 4 * DPR, 'left', r.pen <= l.s2.pen ? '#5dd193' : '#f2b04a');
      if (narrow) return;
      // right panel: electrode top view + numbers
      const px = W * 0.66, pw = W - px - pad, segs = 10, sy = pad + 24 * DPR, sh = 46 * DPR;
      ctx.fillStyle = 'rgba(242,176,74,0.85)'; ctx.fillRect(px, sy, pw, 5 * DPR); ctx.fillRect(px, sy + sh - 5 * DPR, pw, 5 * DPR);
      const gpx = clamp(r.d.g / 40, 0.1, 1) * sh * 0.3; ctx.fillRect(px, sy + sh / 2 - 4 * DPR, pw, 8 * DPR);
      ctx.fillStyle = 'rgba(100,201,223,0.75)'; for (let i = 0; i < segs; i++) { const x0 = px + i * pw / segs; ctx.fillRect(x0, sy + sh / 2 - 4 * DPR - gpx, pw / segs * r.d.eta, gpx); ctx.fillRect(x0, sy + sh / 2 + 4 * DPR, pw / segs * r.d.eta, gpx); }
      ctx.font = `${10 * DPR}px "IBM Plex Mono", monospace`; ctx.textBaseline = 'top';
      [['L', `${r.d.L.toFixed(2)} mm`], ['Z_L @56G', `${Math.round(r.ZL)} Ω`], ['R_T', `${Math.round(r.d.RT)} Ω`], ['n_µ / n_g', `${r.nmw.toFixed(2)} / ${NG}`], ['V_π', `${r.Vpi.toFixed(1)} V`], ['IL', `${r.IL.toFixed(2)} dB`]].forEach(([k, v], i) => {
        const y = sy + sh + 10 * DPR + i * 18 * DPR; ctx.fillStyle = 'rgba(158,171,189,0.95)'; ctx.textAlign = 'left'; ctx.fillText(k, px, y); ctx.fillStyle = '#e7ecf3'; ctx.textAlign = 'right'; ctx.fillText(v, W - pad, y);
      });
      ctx.textAlign = 'left'; cvPill(ctx, `GSG CPW · 세그먼트 η ${r.d.eta.toFixed(2)}`, px, pad + 4 * DPR, 'left', '#64c9df');
    },
    chartTitle: () => 'EO 응답 · 변조기 단독(실선)과 드라이버 포함(점선)',
    chart(l, r) {
      const a = [], b = [], s = [];
      for (let f = 1; f <= 100; f += 1.5) { a.push([f, Math.max(-15, 20 * Math.log10(cx.abs(r.Hn(f))))]); b.push([f, Math.max(-15, 20 * Math.log10(cx.abs(r.Ht(f))))]); }
      const html = svgChart({ x0: 0, x1: 100, y0: -15, y1: 3, aria: 'EO 응답', xticks: [0, 20, 40, 56, 80, 100], yticks: [-15, -10, -6, -3, 0, 3], ylab: 'dB', xlab: 'GHz',
        vlines: [{ x: 56, color: 'rgba(231,236,243,.55)' }, { x: r.bw, color: 'var(--amber)' }], hlines: [{ y: -3, label: '−3 dB' }],
        series: [{ pts: a, color: 'var(--cyan)', width: 2.4 }, { pts: b, color: 'var(--rose)', width: 1.6, dash: '5 4' }] });
      return { html, legend: legendHTML([['var(--cyan)', 'EO S21 (정규화)'], ['var(--rose)', `× 드라이버 ${FDRV} GHz`], ['rgba(231,236,243,.55)', 'Nyquist 56 GHz'], ['var(--amber)', `EO −3 dB ${f2(r.bw, 1)} GHz`]]) };
    },
    coach(l, r, c) {
      const t = c.tier, d = r.d, q1 = (x) => r1(l, x), q2s = (x) => Math.max(r2(l, x), x.size / l.s2.size);
      if (!c.ob1) {
        if (r.bw < l.s1.bw) {
          if (Math.abs(r.nmw - NG) > 0.35) { const b = lineBestOf(K, l, d, ['eta', 'g'], q1); if (b) return { h: '속도 부정합: 전기 신호와 빛이 같이 달리지 않습니다', b: `RF 위상속도 지수 n<sub>µ</sub> ${f2(r.nmw, 2)} vs 광 군굴절률 ${NG}. ${r.nmw > NG ? '접합 부하(C)가 RF를 너무 느리게 만듭니다 — 채움 비율 η를 낮추세요.' : 'RF가 빛보다 빠릅니다 — 접합 부하(η)를 늘리거나 간격 g를 넓혀 부하 효과를 키우면 n<sub>µ</sub>가 올라갑니다. 단, 부하가 늘면 RC·손실도 늘어 최적점이 있습니다.'}` + recText(b, t, d) }; }
          if (Math.abs(r.ZL - d.RT) / d.RT > 0.2) { const b = lineBest(K, l, d, 'RT', q1); if (b) return { h: '임피던스 부정합', b: `부하된 선로 임피던스 ${Math.round(r.ZL)} Ω과 종단 ${Math.round(d.RT)} Ω이 다르면 반사파가 생겨 응답에 굴곡이 생깁니다. 대신 R<sub>T</sub>를 낮추면 대역폭↑, 구동 전압(OMA)↓의 교환도 있습니다.` + recText(b, t, d) }; }
          const b = lineBest(K, l, d, 'L', q1); if (b) return { h: 'RF 손실이 대역을 제한합니다', b: '전극이 길수록 고주파 성분이 끝까지 가지 못합니다. 길이를 줄이면 대역폭이 늘지만 V<sub>π</sub>가 커져 OMA가 줄어듭니다.' + recText(b, t, d) };
        }
        if (r.IL > l.s1.il) { const b = lineBestOf(K, l, d, ['L', 'eta'], q1); if (b) return { h: '삽입 손실이 큽니다', b: '도핑된 도파로는 mm당 손실이 큽니다. 길이나 채움 비율을 줄이세요.' + recText(b, t, d) }; }
        if (r.oma < l.s1.oma) { const b = lineBestOf(K, l, d, ['L', 'RT', 'eta'], q1); if (b) return { h: 'OMA가 작습니다 — 위상 변조가 부족합니다', b: 'V<sub>π</sub> = V<sub>π</sub>L/(ηL)에 비해 구동 전압이 작습니다. 길이·채움 비율을 늘리거나 종단 저항을 올려 접합에 걸리는 전압을 키우세요.' + recText(b, t, d) }; }
        return null;
      }
      if (!c.ob2) {
        if (r.size > l.s2.size) { const b = lineBestOf(K, l, d, ['L', 'eta', 'RT', 'g'], q2s); if (b) return { h: `★★ 전극 길이 ${l.s2.size} µm 초과`, b: '짧은 전극으로 같은 OMA를 내려면 채움 비율과 종단 저항으로 접합 전압을 확보해야 합니다.' + recText(b, t, d) }; }
        { const b = lineBestOf(K, l, d, ['RT', 'eta', 'g', 'L'], q2s); if (!b) { const b2 = [['L', 'eta'], ['L', 'RT'], ['eta', 'RT']].map((ks) => pairBest(K, l, d, ks, q2s, 10)).filter(Boolean).sort((x, y) => x.q - y.q)[0]; if (b2) return { h: '★★: 손잡이 하나로는 더 나아지지 않습니다', b: '길이를 줄이면 V<sub>π</sub>가 커지고, 부하를 늘리면 대역이 줄어듭니다. 두 손잡이를 함께 움직여야 다음 해로 넘어갈 수 있습니다.' + recText2(b2, t) }; } if (b) return { h: r.pen > l.s2.pen ? '★★: 눈이 덜 열렸습니다' : '★★: OMA 여유가 부족합니다', b: (r.pen > l.s2.pen ? '대역 부족(ISI)과 사인 전달함수의 압축이 바깥 눈을 닫습니다. 대역폭과 변조 깊이 사이의 균형점을 찾으세요.' : 'OMA는 변조 깊이와 손실의 곱입니다.') + recText(b, t, d) }; }
      }
      return null;
    },
    card(l, r) { return { kind: 'mzm', lines: [`EO ${f2(r.bw, 1)} GHz · IL ${f2(r.IL, 1)} dB`, `OMA ${f2(r.omaDbm, 1)} dBm @${PIN} dBm · 페널티 ${f2(r.pen, 1)} dB`], model: { bw: +r.bw.toFixed(1), il: +r.IL.toFixed(2), gain: +(r.omaDbm - PIN).toFixed(2), pen: +r.pen.toFixed(2), L: r.d.L } }; },
    aiStarts: (l) => [l.start, { ...l.start, eta: 0.6, RT: 35, L: 2.5 }],
    _x: { analyse, build, Zu, PIN }
  };
  return K;
})();
