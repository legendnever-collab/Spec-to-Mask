// ===== Kind: thermo-optic phase shifter (TiN heater over the waveguide) =====
// Heat transport: offline 2D finite-volume solutions (THERMAL: ΔT at core / heater per W/m, lateral profile, τ)
// for top-cladding gap h and isolation (none / deep trench / trench + substrate undercut).
// dn_eff/dT from a two-step effective-index strip model; metal absorption from the vertical evanescent tail.
// ★★★: the heater is put to work — trimming the 1-7 CWDM demux die by die.
KINDS.to = (() => {
  const DNDT = { si: 1.86e-4, sin: 2.45e-5, ox: 0.95e-5 }, HW = 2.0, TMAX = 200, ALPHA_M = 1.0e4, GLEAK = 0.5;
  // heater sheet resistance / driver limit: TiN 10 Ω/□ on a 5 V rail (Si); thicker TiN 5 Ω/□ on a 20 V driver (SiN: P_π is ~8× larger)
  const RSo = { si: 10, sin: 5 }, VMo = { si: 5, sin: 20 };
  let RS = 15, VMAX = 3.3;
  const ISO = ['없음', '딥 트렌치', '트렌치 + 언더컷'];
  function slab(n1, n0, t, lam, tm) {
    const k0 = 2 * Math.PI / lam; let lo = n0 + 1e-9, hi = n1 - 1e-9;
    for (let i = 0; i < 80; i++) {
      const m = 0.5 * (lo + hi), ka = k0 * Math.sqrt(n1 * n1 - m * m), ga = k0 * Math.sqrt(m * m - n0 * n0), ph = ka * t / 2;
      const f = ph >= Math.PI / 2 ? 1e9 : ka * Math.tan(ph) - (tm ? (n1 * n1) / (n0 * n0) : 1) * ga;
      if (f > 0) lo = m; else hi = m;
    }
    return 0.5 * (lo + hi);
  }
  const ncore = (pf, lam) => (pf.mat === 'si' ? PQ.nSi(lam) : PQ.nSiN(lam));
  // TE strip via EIM: vertical slab (TE) then lateral slab (TM, Ex normal to the side walls)
  const strip = (n1, n0, pf) => slab(slab(n1, n0, pf.t, pf.lam, false), n0, pf.w0, pf.lam, true);
  const cache = {};
  function optics(pf) {
    if (cache[pf.id]) return cache[pf.id];
    const n1 = ncore(pf, pf.lam), n0 = PQ.nOx(pf.lam), dT = 10, ne = strip(n1, n0, pf);
    const dndT = (strip(n1 + DNDT[pf.mat] * dT, n0 + DNDT.ox * dT, pf) - ne) / dT;
    const nv = slab(n1, n0, pf.t, pf.lam, false), gam = 2 * Math.PI / pf.lam * Math.sqrt(Math.max(ne * ne - n0 * n0, 1e-6));
    return (cache[pf.id] = { ne, dndT, gam, nv });
  }
  const TT = (l) => THERMAL[l.pf.mat];
  function thermal(l, h, iso) {
    const tb = TT(l), rows = tb.iso[String(iso)], hs = tb.hs;
    const g = (k) => linterp(hs, rows.map((r) => r[k]), h);
    // a fully released bridge is only held by the arm ends / tethers: 3D leakage the 2D cross-section cannot see
    const G2 = 1 / g('dTcore'), sc = iso === 2 ? G2 / (G2 + GLEAK) : 1;
    return { dTcore: g('dTcore') * sc, dTheat: g('dTheat') * sc, tau: g('tau') * sc, prof: rows[0].prof.map((_, j) => linterp(hs, rows.map((r) => r.prof[j]), h)), xs: rows[0].xs };
  }
  const xtAt = (th, x) => (x <= th.xs[0] ? linterp([0, th.xs[0]], [1, th.prof[0]], x) : linterp(th.xs, th.prof, x));
  const PR = (l) => [
    { k: 'h', label: '히터–도파로 간격 (상부 클래딩)', sym: 'h', min: 0.4, max: 3.0, step: 0.05, dec: 2, unit: 'µm' },
    { k: 'iso', label: '열 격리', sym: 'iso', min: 0, max: 2, step: 1, dec: 0, unit: '', labels: ISO },
    { k: 'L', label: '히터 길이', sym: 'L<sub>h</sub>', min: 10, max: l.pf.mat === 'si' ? 500 : 1500, step: l.pf.mat === 'si' ? 1 : 5, dec: 0, unit: 'µm' },
    { k: 'pitch', label: '이웃 도파로 간격', sym: 'p', min: 5, max: 60, step: 0.5, dec: 1, unit: 'µm' }
  ];
  function core(l, d, proc) {
    RS = RSo[l.pf.mat]; VMAX = VMo[l.pf.mat];
    const o = optics(l.pf), h = Math.max(0.3, d.h * (1 + (proc ? proc.dt / l.pf.t * 0.5 : 0))), th = thermal(l, h, d.iso | 0);
    const Gp = 1 / th.dTcore;                                         // W/(m·K)
    const Ppi = l.pf.lam * 1e-6 * Gp / (2 * o.dndT);                  // W
    const Lm = d.L * 1e-6, rs = RS * (proc ? 1 + 0.1 * (proc.dw / 0.008) : 1);
    const dTh2pi = th.dTheat * (2 * Ppi / Lm), R = rs * d.L / HW, V2pi = Math.sqrt(2 * Ppi * R);
    const metal = ALPHA_M * Math.exp(-2 * o.gam * d.h) * d.L * 1e-4;  // dB
    const xt = xtAt(th, d.pitch);
    return { Ppi: Ppi * 1e3, tau: th.tau * 1e6, dTh2pi, V2pi, R, metal, xt, dndT: o.dndT, th, size: d.L * d.pitch };
  }
  // per-die trimming of the 1-7 CWDM demux with heaters on both arms (trim range ±π on each delay unit)
  function trimDie(l, d, proc, r) {
    const l7 = typeof GAME_LEV !== 'undefined' ? GAME_LEV('1-7') : null; if (!l7) return null;
    const cards = (typeof window !== 'undefined' ? window.GAME_CARDS : global.GAME_CARDS) || {};
    const base = cards['1-7'] && cards['1-7'].d ? { ...cards['1-7'].d } : { ...l7.ref };
    const C = KINDS.cwdm, sm = C._x.LAT[base.ord | 0].mult.reduce((a, b) => a + b, 0);
    const q = (x) => Math.max(x.il / l7.fab.il, (x.xt - l7.xt0) / (l7.fab.xt - l7.xt0));
    const ck = [proc.seed, proc.dw, proc.dt, l7.fab.il, l7.fab.xt, JSON.stringify(base)].join('|');
    let hit = TRIM_CACHE.get(ck);
    if (!hit) { hit = search(l7, base, proc, C, q); if (TRIM_CACHE.size > 3000) TRIM_CACHE.clear(); TRIM_CACHE.set(ck, hit); }
    const { before, best, tr } = hit;
    const power = (Math.abs(tr.t1) + Math.abs(tr.t2a) + Math.abs(tr.t2b)) * sm * r.Ppi;   // mW (π units × P_π per unit section)
    return { before, after: best, power, tr, pass: best.il <= l7.fab.il && best.xt <= l7.fab.xt && power <= l.fab.pmax };
  }
  const TRIM_CACHE = new Map();
  function search(l7, base, proc, C, q) {
    const before = C.evaluate(l7, base, proc);
    let best = before, bq = q(before); const tr = { t1: 0, t2a: 0, t2b: 0 };
    const tryK = (k, vals) => { for (const v of vals) { const t = +clamp(v, -1, 1).toFixed(2); if (t === tr[k]) continue; const rr = C.evaluate(l7, { ...base, t1: base.t1 + (k === 't1' ? t : tr.t1), t2a: base.t2a + (k === 't2a' ? t : tr.t2a), t2b: base.t2b + (k === 't2b' ? t : tr.t2b) }, proc), qq = q(rr); if (qq < bq - 1e-9) { bq = qq; best = rr; tr[k] = t; } } };
    const KS = ['t1', 't2a', 't2b'];
    for (const k of KS) { tryK(k, [-1, -0.75, -0.5, -0.25, 0.25, 0.5, 0.75, 1]); const c0 = tr[k]; tryK(k, [-0.2, -0.15, -0.1, -0.05, 0.05, 0.1, 0.15, 0.2].map((x) => c0 + x)); }
    for (const k of KS) { const c0 = tr[k]; tryK(k, [-0.1, -0.05, 0.05, 0.1].map((x) => c0 + x)); }
    return { before, best, tr };
  }
  const r1 = (l, r) => Math.max(r.Ppi / l.s1.ppi, r.dTh2pi / TMAX, r.V2pi / VMAX, r.metal / l.s1.metal);
  const r2 = (l, r) => Math.max(r.Ppi / l.s2.ppi, r.tau / l.s2.tau, r.xt / l.s2.xt);
  const K = {
    title: 'TO phase shifter', aspect: 0.48, sizeLabel: '점유 면적', sizeUnit: 'µm²', primaryLabel: 'P<sub>π</sub> mW', cheap: true,
    params: (l) => PR(l), landKeys: () => ['h', 'L', 'pitch'], violation: () => 0,
    evaluate(l, d, proc) {
      const c = core(l, d, proc), res = { d: { ...d }, ...c, drc: [], primary: c.Ppi, secondary: c.tau };
      if (proc && proc.seed != null) res.trim = trimDie(l, d, proc, c);
      return res;
    },
    perf(l, r) { return 200 * clamp(l.s1.ppi / r.Ppi / 3, 0, 1) + 150 * clamp(1 - r.xt / 0.15, 0, 1) + 150 * clamp(1 - Math.log10(Math.max(r.tau, 1)) / 3, 0, 1); },
    q1: r1, q2: r2,
    objectives(l, r) {
      return {
        t1: [{ k: `P<sub>π</sub> ≤ ${fmtT(l.s1.ppi)} mW`, v: f2(r.Ppi, 1) + ' mW', ok: r.Ppi <= l.s1.ppi }, { k: `2π에서 히터 ΔT ≤ ${TMAX} K`, v: Math.round(r.dTh2pi) + ' K', ok: r.dTh2pi <= TMAX },
          { k: `2π 구동 전압 ≤ ${VMAX} V`, v: f2(r.V2pi) + ' V', ok: r.V2pi <= VMAX }, { k: `금속 흡수 ≤ ${fmtT(l.s1.metal)} dB`, v: f2(r.metal, 3) + ' dB', ok: r.metal <= l.s1.metal }],
        t2: [{ k: `P<sub>π</sub> ≤ ${fmtT(l.s2.ppi)} mW`, v: f2(r.Ppi, 1) + ' mW', ok: r.Ppi <= l.s2.ppi }, { k: `응답 시간 τ ≤ ${fmtT(l.s2.tau)} µs`, v: f2(r.tau, 1) + ' µs', ok: r.tau <= l.s2.tau },
          { k: `이웃 도파로 열 크로스토크 ≤ ${Math.round(l.s2.xt * 100)}%`, v: (r.xt * 100).toFixed(1) + '%', ok: r.xt <= l.s2.xt }]
      };
    },
    fabPass: (l, r) => !!(r.trim && r.trim.pass),
    fabCrit: (l) => { const c = ((typeof window !== 'undefined' ? window.GAME_CARDS : global.GAME_CARDS) || {})['1-7']; return `${c && c.d ? '내 1-7 카드' : '기준 1-7 설계'}의 CWDM을 다이마다 히터로 트리밍한 뒤 ★ 스펙 · 다이당 트리밍 전력 ≤ ${Math.round(l.fab.pmax)} mW`; },
    meta(l, r) { return `${l.pf.short} · TiN 히터 ${HW} µm, R<sub>s</sub> ${RS} Ω/□ · BOX ${l.pf.mat === 'si' ? 2 : 3} µm<br>dn<sub>eff</sub>/dT <b>${(r.dndT * 1e4).toFixed(2)}×10⁻⁴</b>/K · 2D 유한체적 열해석 테이블 + EIM 광학`; },
    tiles(l, r) { return [['P<sub>π</sub>', `${f2(r.Ppi, 1)}<small>mW</small>`], ['응답 시간 τ', `${f2(r.tau, 1)}<small>µs</small>`], ['열 크로스토크', `${(r.xt * 100).toFixed(1)}<small>%</small>`], ['2π 히터 ΔT · 전압', `${Math.round(r.dTh2pi)}<small>K</small> · ${f2(r.V2pi, 1)}<small>V</small>`]]; },
    hint(l, r) {
      return `P<sub>π</sub> = λ·G′ / (2·dn<sub>eff</sub>/dT), G′ = 히터 전력/길이당 도파로 온도 상승의 역수 → <b>길이와 무관</b><br>히터 온도 ∝ (P/L), 구동 전압 V = √(P·R<sub>s</sub>·L/w) → L은 온도(짧으면 과열)와 전압(길면 초과) 사이 창에서 고릅니다<br>트렌치는 옆으로 새는 열을, 언더컷은 기판으로 새는 열을 막습니다 (효율↑, 응답 느려짐)`;
    },
    draw(cv, l, r, ui) {
      const ctx = cv.getContext('2d'), W = cv.width, H = cv.height, d = r.d, iso = d.iso | 0, narrow = W / DPR < 520, pad = 10 * DPR;
      ctx.fillStyle = '#0b1220'; ctx.fillRect(0, 0, W, H);
      const box = l.pf.mat === 'si' ? 2 : 3, tco = l.pf.t, ytop = tco + d.h + 0.12 + 1.0, XR = 13;
      const vw = narrow ? W : W * 0.66, ux = vw / (2 * XR), uy = Math.min((H - 30 * DPR) / (ytop + box + 2.2), 3 * ux), cx = vw / 2;
      const X = (x) => cx + x * ux, Y = (y) => 24 * DPR + (ytop - y) * uy;
      // layers (vertical scale exaggerated for legibility)
      ctx.fillStyle = '#1f2b3b'; ctx.fillRect(X(-XR), Y(-box), 2 * XR * ux, H - Y(-box));
      ctx.fillStyle = 'rgba(120,140,170,0.20)'; ctx.fillRect(X(-XR), Y(ytop), 2 * XR * ux, (ytop + box) * uy);
      // heat glow: wide without isolation, confined by trenches, trapped by the undercut
      const R0 = ux * (iso === 0 ? 9 : iso === 1 ? 5 : 4), g = ctx.createRadialGradient(X(0), Y(tco + d.h), 2, X(0), Y(tco + d.h), R0);
      g.addColorStop(0, `rgba(255,141,100,${iso === 2 ? 0.9 : 0.7})`); g.addColorStop(1, 'rgba(255,141,100,0)');
      ctx.fillStyle = g; ctx.fillRect(X(-XR), Y(ytop), 2 * XR * ux, H - Y(ytop));
      if (iso >= 1) { ctx.fillStyle = '#0b1220'; [-1, 1].forEach((sg) => { const x0 = sg > 0 ? HW / 2 + 2 : -(HW / 2 + 6); ctx.fillRect(X(x0), Y(ytop), 4 * ux, Math.min(H, Y(-box - 10)) - Y(ytop)); }); }
      if (iso >= 2) { ctx.fillStyle = '#0b1220'; ctx.fillRect(X(-(HW / 2 + 6)), Y(-box), (HW + 12) * ux, Math.min(H, Y(-box - 12)) - Y(-box)); }
      // waveguide core, heater, neighbour
      ctx.fillStyle = '#e7ecf3'; ctx.fillRect(X(-l.pf.w0 / 2), Y(tco), Math.max(2, l.pf.w0 * ux), Math.max(2, tco * uy));
      ctx.fillStyle = '#f2b04a'; ctx.fillRect(X(-HW / 2), Y(tco + d.h + 0.12), HW * ux, Math.max(3, 0.12 * uy));
      const xn = Math.min(d.pitch, XR - 1); ctx.fillStyle = 'rgba(231,236,243,0.55)'; ctx.fillRect(X(xn - l.pf.w0 / 2), Y(tco), Math.max(2, l.pf.w0 * ux), Math.max(2, tco * uy));
      ctx.font = `${10 * DPR}px "IBM Plex Mono", monospace`; ctx.fillStyle = 'rgba(158,171,189,0.95)'; ctx.textBaseline = 'top'; ctx.textAlign = 'left';
      ctx.fillText('SiO₂', X(-XR) + 4 * DPR, Y(ytop) + 3 * DPR); ctx.fillText(`BOX ${box} µm`, X(-XR) + 4 * DPR, Y(0) + 3 * DPR); ctx.fillText('Si 기판 (방열판)', X(-XR) + 4 * DPR, Y(-box) + 3 * DPR);
      cvPill(ctx, `TiN 히터 · h ${d.h.toFixed(2)} µm`, X(0), Y(tco + d.h + 0.12) - 12 * DPR, 'center', '#f2b04a');
      cvPill(ctx, d.pitch > XR - 1 ? `이웃 → ${d.pitch} µm · ${(r.xt * 100).toFixed(1)}%` : `이웃 ${(r.xt * 100).toFixed(1)}%`, X(xn), Y(-0.5), 'center');
      cvPill(ctx, `격리: ${ISO[iso]}`, pad, 6 * DPR, 'left', iso ? '#64c9df' : 'rgba(231,236,243,.9)');
      ctx.fillStyle = 'rgba(158,171,189,0.7)'; ctx.textAlign = 'right'; ctx.fillText('세로 확대', vw - 4 * DPR, H - 14 * DPR);
      if (narrow) return;
      const px = W * 0.70;
      [['P_π', `${r.Ppi.toFixed(1)} mW`], ['τ', `${r.tau.toFixed(1)} µs`], ['2π 히터 ΔT', `${Math.round(r.dTh2pi)} K`], ['2π 전압', `${r.V2pi.toFixed(2)} V`], ['히터 저항', `${Math.round(r.R)} Ω`], ['금속 흡수', `${r.metal.toFixed(3)} dB`]].forEach(([k, v], i) => {
        ctx.fillStyle = 'rgba(158,171,189,0.95)'; ctx.textAlign = 'left'; ctx.fillText(k, px, pad + i * 20 * DPR);
        ctx.fillStyle = '#e7ecf3'; ctx.textAlign = 'right'; ctx.fillText(v, W - pad, pad + i * 20 * DPR);
      });
    },
    chartTitle: () => '열 퍼짐 · 히터 중심에서 거리별 도파로 온도 (자기 대비)',
    chart(l, r) {
      const d = r.d, mk = (iso) => { const th = thermal(l, d.h, iso), pts = [[0, 100]]; th.xs.forEach((x, i) => pts.push([x, th.prof[i] * 100])); return pts; };
      const html = svgChart({ x0: 0, x1: 60, y0: 0, y1: 100, aria: '열 크로스토크', xticks: [0, 10, 20, 30, 40, 50, 60], yticks: [0, 25, 50, 75, 100], ylab: '%', xlab: '거리 µm',
        vlines: [{ x: d.pitch, color: 'rgba(231,236,243,.8)' }], hlines: [{ y: l.s2.xt * 100, label: `★★ ${Math.round(l.s2.xt * 100)}%` }],
        series: [0, 1, 2].map((iso) => ({ pts: mk(iso), color: ['var(--rose)', 'var(--amber)', 'var(--cyan)'][iso], width: iso === (d.iso | 0) ? 2.6 : 1.2, dash: iso === (d.iso | 0) ? '' : '4 4' })) });
      return { html, legend: legendHTML([['var(--rose)', '격리 없음'], ['var(--amber)', '딥 트렌치'], ['var(--cyan)', '트렌치 + 언더컷'], ['rgba(231,236,243,.8)', '이웃 도파로 위치']]) };
    },
    coach(l, r, c) {
      const t = c.tier, d = r.d, n = (v, k = 2) => v.toFixed(k);
      if (r.metal > l.s1.metal) { let hmin = d.h; for (let h = d.h; h <= 3; h += 0.05) { if (core(l, { ...d, h }).metal <= l.s1.metal * 0.8) { hmin = h; break; } } return { h: '히터 금속이 빛을 흡수합니다', b: '도파로 모드의 꼬리가 위쪽 금속에 닿으면 손실이 생깁니다. 상부 클래딩(h)을 두껍게 하세요. SiN처럼 모드가 크게 퍼지는 플랫폼에서 특히 중요합니다.' + (t >= 2 ? ` h ≥ ${n(hmin)} µm.` : '') }; }
      const st = K.params(l)[2].step, Lmin = Math.ceil(r.dTh2pi * d.L / TMAX / st) * st, Lmax = Math.floor(d.L * Math.pow(VMAX / r.V2pi, 2) / st) * st;
      if (Lmin > Lmax || Lmin > K.params(l)[2].max) {
        const nx = (d.iso | 0) < 2 ? core(l, { ...d, iso: (d.iso | 0) + 1 }) : null, ok = nx && Math.ceil(nx.dTh2pi * d.L / TMAX) <= Math.floor(d.L * Math.pow(VMAX / nx.V2pi, 2));
        return { h: '온도와 전압을 동시에 만족하는 길이가 없습니다', b: `히터 온도 조건은 L ≳ ${Lmin} µm, 전압 조건은 L ≲ ${Lmax} µm을 요구합니다. 길이로는 풀 수 없으니 P<sub>π</sub> 자체를 낮춰야 합니다 — 열이 옆과 아래로 새지 않게 막으세요.` + (t >= 2 && ok ? ` 열 격리 = ${(d.iso | 0) + 1}.` : '') };
      }
      if (r.dTh2pi > TMAX) return { h: '히터가 너무 뜨겁습니다', b: '같은 전력을 짧은 히터에 몰면 히터 온도가 올라가 전자이동(electromigration)으로 수명이 줄어듭니다. 히터를 길게 하세요 — P<sub>π</sub>는 길이와 무관하니 효율 손해는 없습니다.' + (t >= 2 ? ` L ≥ ${Lmin} µm.` : '') };
      if (r.V2pi > VMAX) return { h: '구동 전압이 너무 높습니다', b: '히터가 길수록 저항이 커져 같은 전력에 더 높은 전압이 필요합니다. 길이를 줄이세요.' + (t >= 2 ? ` L ≤ ${Lmax} µm${Lmax < Lmin ? ' — 하지만 온도 조건과 겹치는 창이 없습니다. P<sub>π</sub> 자체를 낮춰야 합니다 (h↓ 또는 트렌치).' : ''}.` : '') };
      if (r.Ppi > l.s1.ppi) { const up = (d.iso | 0) < 2 && core(l, { ...d, iso: (d.iso | 0) + 1 }).Ppi <= l.s1.ppi; let hb = null; if (!up) for (let h = d.h; h >= 0.4 - 1e-9; h -= 0.05) { const cc = core(l, { ...d, h }); if (cc.metal > l.s1.metal) break; if (cc.Ppi <= l.s1.ppi * 0.97) { hb = +h.toFixed(2); break; } }
        if (t >= 2 && hb == null && !up) return null;
        return { h: 'P<sub>π</sub>가 큽니다', b: '히터를 도파로에 가깝게(h↓) 두면 열이 더 많이 도파로를 지나갑니다. 단, 너무 가까우면 금속 흡수가 생깁니다.' + (hb != null && t >= 2 ? ` h ≈ ${n(hb)} µm.` : '') + (up ? ` 이 플랫폼에서는 h만으로 부족합니다 — 옆으로 새는 열을 막으세요.${t >= 2 ? ` 열 격리 = ${(d.iso | 0) + 1}.` : ''}` : '') }; }
      if (c.ob1 && !c.ob2) {
        if (r.Ppi > l.s2.ppi) return { h: '★★: 열이 옆과 아래로 새고 있습니다', b: '격리 없는 히터는 열 대부분이 옆 클래딩과 기판으로 퍼져 도파로를 거의 데우지 않습니다. 딥 트렌치로 옆길을 막아 보세요.' + ((d.iso | 0) === 0 && t >= 2 ? ' 열 격리 = 1 (딥 트렌치).' : '') };
        if (r.tau > l.s2.tau) return { h: '★★: 응답이 너무 느립니다', b: '언더컷은 기판으로의 열 경로를 끊어 효율이 수십 배 좋아지지만, 열이 빠져나갈 길도 막혀 τ가 수백 µs로 느려집니다. 빠른 보정이 필요하면 트렌치까지만 쓰세요.' + (t >= 2 ? ' 열 격리 = 1.' : '') };
        if (r.xt > l.s2.xt) { let pm = d.pitch; for (let p = d.pitch; p <= 60; p += 0.5) { if (xtAt(r.th, p) <= l.s2.xt * 0.9) { pm = p; break; } } return { h: '★★: 이웃 도파로가 같이 데워집니다', b: '열 크로스토크는 옆 회로의 위상을 흔듭니다. 간격을 넓히거나 트렌치로 막으세요.' + (t >= 2 ? ` 간격 p ≥ ${n(pm, 1)} µm.` : '') }; }
        if (r.size > l.s2.size) return { h: '★★: 면적이 큽니다', b: '히터 길이와 간격을 조건이 허락하는 만큼 줄이세요.' + (t >= 2 ? ` 길이 하한 ≈ ${Lmin} µm.` : '') };
      }
      if (c.ob2 && c.fab && c.fab.yield < l.fab.y) return { h: '보정 전력 예산이 모자랍니다', b: '두께 변동으로 밀린 CWDM 채널을 다시 맞추려면 다이마다 위상을 최대 ±π까지 돌려야 합니다. P<sub>π</sub>가 작을수록 같은 예산으로 더 많은 다이를 살립니다.' };
      return null;
    },
    card(l, r) { return { kind: 'to', lines: [`P<sub>π</sub> ${f2(r.Ppi, 1)} mW · τ ${f2(r.tau, 1)} µs`, `열 크로스토크 ${(r.xt * 100).toFixed(1)}%`], model: { Ppi: +r.Ppi.toFixed(3), tau: +r.tau.toFixed(2), xt: +r.xt.toFixed(4) } }; },
    aiStarts: (l) => [l.start, { ...l.start, iso: 1, h: 0.8 }],
    _x: { core, thermal, optics, trimDie, lim: (pf) => ({ TMAX, VMAX: VMo[pf.mat], RS: RSo[pf.mat] }), LAT: () => KINDS.cwdm._x.LAT }
  };
  return K;
})();
