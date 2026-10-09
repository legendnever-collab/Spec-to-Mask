// ===== Kind: waveguide Ge photodetector (vertical PIN, evanescent coupling) + TIA front end =====
// Absorption: 1 − exp(−Γ·α·L) with Γ = Γ_v(t_Ge)·Γ_h(w); α(λ) of tensile-strained Ge-on-Si, worst CWDM channel.
// Speed: carrier transit (0.45·v/d_i, field-dependent drift velocity) × RC (junction + pad + TIA input, contact + TIA R_in).
// Sensitivity: TIA input-referred noise (rises with C_T) → PAM4 OMA for BER 2.4e-4 through the eye (5-tap FFE, √Σc² noise).
KINDS.pd = (() => {
  const EPS0 = 8.854e-12, EGE = 16.2, VSAT = 6e4, ES = 1.0, CPAD = 5e-15, CIN = 15e-15, RIN = 40, FTIA = 70, BAUD = 112, Q = 3.49;
  const ALPHA = [[1.26, 9000], [1.31, 7000], [1.45, 5200], [1.53, 4200], [1.55, 3500], [1.57, 2600], [1.6, 1400]];
  const alphaAt = (lam) => linterp(ALPHA.map((a) => a[0]), ALPHA.map((a) => a[1]), lam);
  const gaussLike = (proc, k) => gaussR(mulberry((proc.seed || 1) * 17 + k * 307));
  const P = [
    { k: 'L', label: 'Ge 길이', sym: 'L', min: 4, max: 60, step: 0.5, dec: 1, unit: 'µm' },
    { k: 'w', label: 'Ge 폭', sym: 'w', min: 1, max: 8, step: 0.1, dec: 1, unit: 'µm' },
    { k: 'di', label: '진성층 두께', sym: 'd<sub>i</sub>', min: 0.2, max: 1.0, step: 0.01, dec: 2, unit: 'µm' },
    { k: 'V', label: '역바이어스', sym: 'V', min: 0, max: 3, step: 0.1, dec: 1, unit: 'V' }
  ];
  const tia = (f) => { const x = f / FTIA; return cx.div([1, 0], [1 - x * x, Math.SQRT2 * x]); };
  function analyse(l, d, proc) {
    const g = (k) => (proc ? gaussLike(proc, k) : 0), pf = l.pf;
    const di = d.di * (1 + 0.04 * g(1)), lamW = pf.ch.reduce((a, c) => (alphaAt(c) < alphaAt(a) ? c : a), pf.ch[0]), al = alphaAt(lamW) * (1 + 0.08 * g(2)) * 1e-4;   // /µm
    const t = di + 0.1, Gv = t / (t + 0.35), Gh = 1 - Math.exp(-d.w / 1.0), G = Gv * Gh, abs = 1 - Math.exp(-G * al * d.L);
    const etaC = pf.mat === 'si' ? 0.95 : 0.85, resp = 0.92 * etaC * abs * lamW / 1.2398;
    const E = (d.V + 0.5) / di, vf = (E / ES) / (1 + E / ES), ft = 0.45 * VSAT * vf / (di * 1e-6) / 1e9;
    const Cj = EGE * EPS0 * d.L * d.w * 1e-12 / (di * 1e-6), CT = Cj + CPAD * (1 + 0.1 * g(3)) + CIN, Rs = 10 + 200 / d.L, fRC = 1 / (2 * Math.PI * (Rs + RIN) * CT) / 1e9;
    const Hpd = (f) => cx.div([1, 0], cx.mul([1, f / ft], [1, f / fRC]));
    let bw = 150; for (let f = 1; f <= 150; f += 1) { const a = cx.abs(Hpd(f)); if (a < Math.SQRT1_2) { const p = cx.abs(Hpd(f - 1)); bw = f - 1 + (p - Math.SQRT1_2) / (p - a); break; } }
    const Ht = (f) => (f > 300 ? [0, 0] : cx.mul(Hpd(f), tia(f))), eye = pam4Eye(Ht, BAUD, 128, 16, null, 5), ratio = clamp(eye.ratio, 0.02, 1);
    const inn = 10e-12 * (1 + CT / 30e-15), sig = inn * Math.sqrt(0.6 * BAUD * 1e9);
    const sens = 6 * Q * sig / (Math.max(resp, 1e-3) * ratio) * 1e6;                        // µW OMA_outer
    const area = d.L * d.w, per = 2 * (d.L + d.w), dark = (0.1 * area + 0.3 * per) * (1 + 0.3 * E) * Math.exp(0.3 * g(4));   // nA
    return { resp, abs, G, al, lamW, ft, fRC, Cj: Cj * 1e15, CT: CT * 1e15, Rs, bw, eye, ratio, pen: -10 * Math.log10(ratio), sig: sig * 1e6, sens, sensDbm: 10 * Math.log10(sens * 1e-3), dark, E, Hpd, Ht, size: area };
  }
  const r1 = (l, r) => Math.max(l.s1.resp / r.resp, l.s1.bw / r.bw);
  const r2 = (l, r) => Math.max(r.sens / l.s2.sens, r.dark / l.s2.dark);
  const dbm = (uw) => (10 * Math.log10(uw * 1e-3)).toFixed(1);
  const K = {
    title: 'Ge PD + TIA', aspect: 0.5, sizeLabel: 'Ge 면적', sizeUnit: 'µm²', primaryLabel: '감도 dBm', cheap: true,
    params: () => P, landKeys: () => ['L', 'w', 'di', 'V'], violation: () => 0,
    evaluate(l, d, proc) { const a = analyse(l, d, proc); return { d: { ...d }, ...a, drc: [], primary: a.sensDbm, secondary: a.bw }; },
    perf(l, r) { return 200 * clamp(r.resp / 1.0, 0, 1) + 150 * clamp(r.bw / 80, 0, 1) + 150 * clamp((-r.sensDbm - 4) / 8, 0, 1); },
    q1: r1, q2: r2,
    objectives(l, r) {
      return {
        t1: [{ k: `응답도 ≥ ${fmtT(l.s1.resp)} A/W`, v: f2(r.resp, 3) + ' A/W', ok: r.resp >= l.s1.resp }, { k: `PD 대역폭 ≥ ${fmtT(l.s1.bw)} GHz`, v: f2(r.bw, 1) + ' GHz', ok: r.bw >= l.s1.bw }],
        t2: [{ k: `PAM4 감도 (OMA) ≤ ${dbm(l.s2.sens)} dBm`, v: f2(r.sensDbm, 2) + ' dBm', ok: r.sens <= l.s2.sens }, { k: `암전류 ≤ ${fmtT(l.s2.dark)} nA`, v: f2(r.dark, 1) + ' nA', ok: r.dark <= l.s2.dark }]
      };
    },
    fabPass: (l, r) => r.sens <= l.fab.sens && r.dark <= l.fab.dark && r.resp >= l.s1.resp,
    fabCrit: (l) => `감도 ≤ ${dbm(l.fab.sens)} dBm · 암전류 ≤ ${fmtT(l.fab.dark)} nA (d<sub>i</sub> ±4%, α ±8%, 암전류 로그정규 σ 0.3)`,
    meta(l, r) { return `${l.pf.mat === 'si' ? 'Ge-on-Si 수직 PIN, 도파로 결합' : 'SiN → Si 전이층 → Ge (결합 효율 85%)'} · 최악 채널 λ ${Math.round(r.lamW * 1000)} nm, α ${Math.round(r.al * 1e4)} /cm<br>TIA: 입력 ${CIN * 1e15} fF, R<sub>in</sub> ${RIN} Ω, ${FTIA} GHz · 잡음 10 pA/√Hz·(1+C<sub>T</sub>/30 fF) · BER 2.4×10⁻⁴ (Q ${Q}) · 5-tap FFE`; },
    tiles(l, r) { return [['응답도', `${f2(r.resp, 3)}<small>A/W</small>`], ['PD 대역 (전이 · RC)', `${Math.round(r.bw)}<small>GHz</small> · ${Math.round(r.ft)}/${Math.round(r.fRC)}`], ['감도 OMA', `${f2(r.sensDbm, 1)}<small>dBm</small>`], ['C<sub>T</sub> · 암전류', `${f2(r.CT, 1)}<small>fF</small> · ${f2(r.dark, 1)}<small>nA</small>`]]; },
    hint(l, r) { return `흡수 1 − e<sup>−ΓαL</sup> = <b>${Math.round(r.abs * 100)}%</b> (Γ ${f2(r.G, 2)}, α ${Math.round(r.al * 1e4)} /cm)<br>전이 대역 ≈ 0.45·v/d<sub>i</sub> — 얇을수록 빠르지만 C = εLw/d<sub>i</sub>가 커지고 Γ가 줄어듭니다<br>감도 ∝ 잡음(C<sub>T</sub>↑이면 증가) / (응답도 × 눈 열림): 큰 PD는 응답도는 좋아도 C와 암전류가 늘어납니다`; },
    draw(cv, l, r, ui) {
      const ctx = cv.getContext('2d'), W = cv.width, H = cv.height, pad = 12 * DPR, d = r.d;
      ctx.fillStyle = '#0b1220'; ctx.fillRect(0, 0, W, H);
      // top view: waveguide into the Ge pad, absorbed light decays along L
      const vw = W * 0.5, sc = Math.min((vw - 3 * pad) / 66, (H * 0.6) / 10), x0 = pad + 6 * sc, yc = H * 0.45, X = (x) => x0 + x * sc;
      ctx.fillStyle = 'rgba(231,236,243,0.85)'; ctx.fillRect(pad, yc - 0.25 * sc, 6 * sc, 0.5 * sc);
      ctx.fillStyle = 'rgba(160,170,190,0.35)'; ctx.fillRect(X(0), yc - (d.w / 2 + 0.6) * sc, (d.L + 1.2) * sc, (d.w + 1.2) * sc);   // Si slab under Ge
      const n = 60; for (let i = 0; i < n; i++) { const x = d.L * i / n, I = Math.exp(-r.G * r.al * x); ctx.fillStyle = `rgba(246,195,90,${(0.15 + 0.75 * I).toFixed(3)})`; ctx.fillRect(X(0.6 + x), yc - d.w / 2 * sc, d.L / n * sc + 1, d.w * sc); }
      ctx.strokeStyle = 'rgba(231,236,243,0.7)'; ctx.lineWidth = 1.2 * DPR; ctx.strokeRect(X(0.6), yc - d.w / 2 * sc, d.L * sc, d.w * sc);
      ctx.fillStyle = 'rgba(242,176,74,0.9)'; ctx.fillRect(X(0.6), yc - (d.w / 2 + 1.6) * sc, d.L * sc, 0.6 * sc); ctx.fillRect(X(0.6), yc + (d.w / 2 + 1.0) * sc, d.L * sc, 0.6 * sc);
      cvPill(ctx, `흡수 ${Math.round(r.abs * 100)}% · ${f2(r.resp, 2)} A/W`, pad, pad + 4 * DPR, 'left', '#f6c35a');
      cvPill(ctx, `Ge ${d.L.toFixed(1)} × ${d.w.toFixed(1)} µm · d_i ${Math.round(d.di * 1000)} nm`, pad, H - pad - 12 * DPR, 'left');
      // right: received eye after PD + TIA + FFE
      const ex = W * 0.55, ey = pad + 18 * DPR, ew = W - ex - pad, eh = H - ey - pad, tr = r.eye.traces, m = tr[0].length;
      const lo = Math.min(...tr.flat()), hi = Math.max(...tr.flat()), sp = Math.max(hi - lo, 1e-6), XE = (i) => ex + i / (m - 1) * ew, YE = (v) => ey + (1 - (v - lo + 0.08 * sp) / (sp * 1.16)) * eh;
      ctx.strokeStyle = 'rgba(100,201,223,0.16)'; ctx.lineWidth = 1.2 * DPR;
      tr.forEach((t) => { ctx.beginPath(); t.forEach((v, i) => (i ? ctx.lineTo(XE(i), YE(v)) : ctx.moveTo(XE(i), YE(v)))); ctx.stroke(); });
      cvPill(ctx, W / DPR < 520 ? `눈 ${Math.round(r.ratio * 100)}% · ${r.sensDbm.toFixed(1)} dBm` : `수신 눈 ${Math.round(r.ratio * 100)}% · 감도 ${r.sensDbm.toFixed(1)} dBm`, ex, pad + 4 * DPR, 'left', r.sens <= l.s2.sens ? '#5dd193' : '#f2b04a');
    },
    chartTitle: () => '주파수 응답 · PD 단독(실선)과 TIA 포함(점선)',
    chart(l, r) {
      const a = [], b = [];
      for (let f = 1; f <= 120; f += 1.5) { a.push([f, Math.max(-15, 20 * Math.log10(cx.abs(r.Hpd(f))))]); b.push([f, Math.max(-15, 20 * Math.log10(cx.abs(r.Ht(f))))]); }
      const html = svgChart({ x0: 0, x1: 120, y0: -15, y1: 2, aria: 'PD 응답', xticks: [0, 20, 40, 56, 80, 100, 120], yticks: [-15, -10, -6, -3, 0], ylab: 'dB', xlab: 'GHz',
        vlines: [{ x: 56, color: 'rgba(231,236,243,.55)' }, { x: r.bw, color: 'var(--amber)' }], hlines: [{ y: -3, label: '−3 dB' }],
        series: [{ pts: a, color: 'var(--cyan)', width: 2.4 }, { pts: b, color: 'var(--rose)', width: 1.6, dash: '5 4' }] });
      return { html, legend: legendHTML([['var(--cyan)', `PD (전이 ${Math.round(r.ft)} · RC ${Math.round(r.fRC)} GHz)`], ['var(--rose)', `× TIA ${FTIA} GHz`], ['rgba(231,236,243,.55)', 'Nyquist 56 GHz']]) };
    },
    coach(l, r, c) {
      const t = c.tier, d = r.d, q1 = (x) => r1(l, x), q2s = (x) => Math.max(r1(l, x), r2(l, x), x.size / l.s2.size);
      if (!c.ob1) {
        if (r.resp < l.s1.resp) { const b = lineBestOf(K, l, d, ['L', 'w'], q1); if (b) return { h: '빛을 다 흡수하지 못합니다', b: `Ge가 짧거나 좁아 ${Math.round((1 - r.abs) * 100)}%의 빛이 그대로 빠져나갑니다.${l.pf.lam > 1.4 ? ' C-band 장파장 쪽은 Ge 흡수가 급격히 약해지므로(밴드 끝) 더 긴 Ge가 필요합니다.' : ''}` + recText(b, t, d) }; }
        if (r.bw < l.s1.bw) { const slow = r.ft < r.fRC; const b = lineBestOf(K, l, d, slow ? ['V', 'di'] : ['L', 'w', 'di'], q1); if (b) return { h: slow ? '캐리어 이동 시간이 대역을 제한합니다' : 'RC가 대역을 제한합니다', b: (slow ? '진성층이 두껍거나 전기장이 약해 캐리어가 늦게 도착합니다. 바이어스를 올리거나 d<sub>i</sub>를 줄이세요.' : `접합 C ${f2(r.Cj, 1)} fF + 패드 + TIA 입력이 큽니다. Ge 면적을 줄이거나 d<sub>i</sub>를 키우세요.`) + recText(b, t, d) }; }
        return null;
      }
      if (!c.ob2) {
        if (r.dark > l.s2.dark) { const b = lineBestOf(K, l, d, ['V', 'w', 'L'], q2s); if (b) return { h: '★★: 암전류가 큽니다', b: '암전류는 면적·둘레와 전기장에 비례합니다. Ge 결함(전위)에서 생기는 누설이라, 큰 PD와 높은 바이어스가 불리합니다.' + recText(b, t, d) }; }
        if (r.size > l.s2.size) { const b = lineBestOf(K, l, d, ['w', 'L'], q2s); if (b) return { h: `★★: Ge 면적 ${l.s2.size} µm² 초과`, b: '좁은 Ge는 Γ가 줄지만 C·암전류가 함께 줄어듭니다.' + recText(b, t, d) }; }
        const b = lineBestOf(K, l, d, ['di', 'L', 'w', 'V'], q2s); if (b) return { h: '★★: 감도가 부족합니다', b: '감도는 "잡음 ÷ (응답도 × 눈 열림)"입니다. TIA 잡음은 입력 C가 클수록 커지므로, 응답도를 조금 양보해서라도 C<sub>T</sub>를 줄이는 쪽이 이득일 때가 많습니다.' + recText(b, t, d) };
      }
      return null;
    },
    card(l, r) { return { kind: 'pd', lines: [`${f2(r.resp, 2)} A/W · ${Math.round(r.bw)} GHz`, `감도 ${f2(r.sensDbm, 1)} dBm · 암전류 ${f2(r.dark, 0)} nA`], model: { resp: +r.resp.toFixed(3), bw: +r.bw.toFixed(1), sens: +r.sensDbm.toFixed(2), dark: +r.dark.toFixed(1) } }; },
    aiStarts: (l) => [l.start, { L: 15, w: 2.5, di: 0.4, V: 1.5 }],
    _x: { analyse, alphaAt }
  };
  return K;
})();
