// ===== PIC Design Lab engine — 1.6T DR8 Tx PIC: schematic → floorplan → optical routing → electrical interface → verification =====
// Pure functions (no DOM). Every component is built from the player's part cards (or each level's reference design) on the
// current platform, so a ring radius, an MMI or an electrode length here is the same number the device level computed.
// Coordinates: µm, die origin bottom-left, x east, y north. Optical flow west → east (input facets on W, output facets on E).
// Route geometry is kept as primitives so the Python backend (Phase D) draws exactly the same shapes:
//   {t:'L', a:[x,y], b:[x,y]}                         straight
//   {t:'C', V:[x,y], h_deg, turn, shape, R, a0}        90° corner at vertex V (incoming heading h_deg, turn +1 left / −1 right),
//                                                      circular (a0 = R) or Euler clothoid pair (a0 = 1.8701·R_min) — the same
//                                                      cornerLocal() the rectangular delay spiral exports
//   {t:'A', c:[cx,cy], r, a0_deg, a1_deg}              circular arc (small lateral jogs: S-bend of two arcs)
const LAB = (() => {
  const SCHEMA = 'smq-circuit/1', LANES = 8, LANE_GBPS = 224, NET_GBPS = 200;
  const PAD = { w: 80, rfPitch: 100 };   // abstract wire-bond pads (µm)
  const BUMP = { w: 30, pitch: 45 };     // abstract flip-chip micro-bumps (µm, Cu-pillar class)
  const RING_BX = 50;                   // ring RF bumps: nearer (G) bump centre this far west of the ring (clear of the next lane's DC bump row)
  const MW = { rf: 10, dc: 5 };
  const DC_TP = 10;                      // DC fan-out track pitch (µm) = line 5 + space 5          // abstract metal line widths (µm) — the same widths are drawn in the GDS (smq2gds)
  const LITHO = { si: 0.15, sin: 0.3 };  // generic minimum printable width (µm)
  const XT_HET = 60;                     // SiN↔Si co-taper length (µm) for a heterogeneous Si ring on SiN — Unverified Assumption
  const r3 = (v) => Math.round(v * 1000) / 1000;   // 1 nm GDS grid
  const SW = 15, GW = 50;                // CPW signal / ground width of the TW-MZM (2-3 engine: signal 15 µm; ground width abstract)
  const TAP = 0.02;                      // monitor tap power ratio (−17 dB)
  const SH = [1, 2, 4, 8];
  const deg = (r) => r * 180 / Math.PI, rad = (d) => d * Math.PI / 180;
  const r4 = (v) => +(+v).toFixed(4);
  const SPX = () => KINDS.spiral._x;

  /* ---------------- parts from cards / level references ---------------- */
  const PARTC = new Map();
  function parts(ctx) {
    const pf = ctx.pf, cards = ctx.cards || {}, key = pf.id + JSON.stringify(Object.keys(cards).sort().map((k) => [k, cards[k].t || 0]));
    if (PARTC.has(key)) return PARTC.get(key);
    const pick = (id) => { const l = ctx.lev(id); if (!l) return null; const c = cards[id]; return c && c.d ? { l, d: { ...l.start, ...c.d }, src: `내 ${id} 카드` } : { l, d: { ...l.ref }, src: `${id} 기준 설계` }; };
    if (typeof PQ !== 'undefined' && PQ.setPlatform) PQ.setPlatform(pf.mat, pf.t, pf.rules);
    const out = {};
    const s16 = pick('1-6'); if (s16) { const r = KINDS.ssc.evaluate(s16.l, s16.d); out.ssc = { Lt: s16.d.Lt, tw: s16.d.tw, loss: r.loss, src: s16.src, id: '1-6' }; }
    const s13 = pick('1-3'); if (s13) { const r = KINDS.mmi.evaluate(s13.l, s13.d), tl = pf.mat === 'si' ? 10 : 30; out.mmi = { W: s13.d.W, L: s13.d.L, wt: s13.d.wt, s: s13.d.s, tl, Ltot: s13.d.L + 2 * tl, el: r.el, src: s13.src, id: '1-3' }; }
    const s21 = pick('2-1'); if (s21) { const r = KINDS.to.evaluate(s21.l, s21.d); out.heater = { L: s21.d.L, h: s21.d.h, iso: s21.d.iso | 0, Ppi: r.Ppi, w: 2, src: s21.src, id: '2-1' }; }
    const s23 = pick('2-3'); if (s23) { const r = KINDS.mzm.evaluate(s23.l, s23.d); out.mzm = { Le: s23.d.L * 1000, g: s23.d.g, RT: s23.d.RT, IL: r.IL, gain: r.omaDbm - KINDS.mzm._x.PIN, pen: r.pen, bw: r.bw, src: s23.src, id: '2-3' }; }
    const s3r = pick('2-3R'); if (s3r) { const r = KINDS.mrr.evaluate(s3r.l, s3r.d), g = KINDS.mrr.exportGeom(s3r.l, r); out.mrr = { geom: g, R: g.R_um, gap: g.gap_um, w: g.w_um, IL: r.IL, gain: r.omaDbm - KINDS.mrr._x.PIN, pen: r.pen, bw: r.bw, PhW: r.PhW, P2pi: r.P2pi, fsr: r.fsr * 1e3, src: s3r.src, id: '2-3R' }; }
    const s24 = pick('2-4'); if (s24) { const r = KINDS.pd.evaluate(s24.l, s24.d); out.pd = { L: s24.d.L, w: s24.d.w, resp: r.resp, src: s24.src, id: '2-4' }; }
    PARTC.clear(); PARTC.set(key, out);
    return out;
  }

  /* ---------------- waveguide cross-section and bend rule ---------------- */
  const WGC = new Map();
  function wgModel(pf, w) {
    const key = pf.id + '|' + (+w).toFixed(4); if (WGC.has(key)) return WGC.get(key);
    const x = SPX().xs(pf, w), si = pf.mat === 'si';
    // rule radius: smallest R whose 90° bend radiation is below 0.005 dB (Marcuse lateral slab, same model as D-1)
    let Rmin = si ? 400 : 3000;
    for (let R = si ? 1 : 10; R <= (si ? 400 : 3000); R += si ? 0.5 : 5) if (SPX().bendDBcm(x, R) * (Math.PI * R / 2) * 1e-4 < 0.005) { Rmin = R; break; }
    const o = { x, alpha: x.alpha, ng: x.ng, Rmin, multi: x.multi, wc: pf.wc };
    if (WGC.size > 400) WGC.clear(); WGC.set(key, o);
    return o;
  }
  const tapLen = (pf, w, gap) => { const x = SPX().xs(pf, w), k = SPX().kappa(x, w, gap); return Math.asin(Math.sqrt(TAP)) / k; };   // µm, coupled-mode length for a 2 % tap

  /* ---------------- design parameters ---------------- */
  // d: { mod 0/1, share 0..3, W, H (mm), edge (µm), P (lane pitch µm), stag (µm), fp (fiber pitch µm), rf 0 edge pads / 1 flip-chip,
  //      rfSide 0 N / 1 S, pp (pad pitch µm), bend 0 arc / 1 euler, R (µm), wr (route width µm), jog (fan jog pitch µm), mon 0/1 }
  function defaults(ctx, arch) {
    const pf = ctx.pf, si = pf.mat === 'si', P = parts(ctx), wm = wgModel(pf, pf.w0);
    const mod = arch && arch.mod != null ? arch.mod : 0, share = arch && arch.share != null ? arch.share : 0;
    const d = { mod, share, edge: 50, fp: 127, rf: 0, rfSide: 0, pp: 100, bend: 1, R: Math.max(wm.Rmin, si ? 10 : 100), wr: pf.w0, jog: si ? 4 : 8, mon: 1, W: 6, H: 4 };
    const lb = laneBox(ctx, d, P);
    d.P = Math.max(d.fp, Math.ceil((lb.h + 40) / 5) * 5);
    d.stag = stagAuto(d);
    const fit = minDie(ctx, d);
    d.W = Math.ceil(fit.W / 500) * 0.5; d.H = Math.ceil(fit.H / 500) * 0.5;   // smallest 0.5-mm die that fits the auto placement
    return d;
  }
  // RF pad group width per lane on the die edge (GSG for the TW-MZM, GS for the lumped ring) and the lane stagger it needs
  const rfPads = (d) => ((d.mod | 0) === 1 ? 2 : 3);
  const groupW = (d) => (rfPads(d) - 1) * d.pp + PAD.w;
  const DC_SEP = MW.dc + 5;   // centre spacing of parallel DC verticals (line + 5 µm space)
  const stagAuto = (d) => ((d.rf | 0) === 1 ? 0 : Math.ceil((groupW(d) + 40) / 10) * 10);

  /* ---------------- component footprints (local frame: optical input at the origin, flow +x) ---------------- */
  function mzmGeom(ctx, d, P) {
    const pf = ctx.pf, m = P.mmi, z = P.mzm, h = P.heater, R = d.R, da = SW + z.g, dy = (da - m.s) / 2;
    const sb = sBend(dy, R, d.bend ? 'euler' : 'arc'), Lsb = sb.len;
    const x0 = m.Ltot, xe0 = x0 + Lsb + 20, xe1 = xe0 + z.Le, xh0 = xe1 + 30, xh1 = xh0 + h.L, xa1 = xh1 + 20, x1 = Math.ceil((xa1 + Lsb) * 1000 - 1e-6) / 1000, Ltot = r3(x1 + m.Ltot);   // output MMI and length on the 1 nm grid (arms end ≤ 1 nm straight later)
    const half = SW / 2 + z.g + GW;
    return { kind: 'mzm', L: Ltot, h: 2 * half, y0: -half, y1: half, da, xe0, xe1, xh0, xh1, sb, arms: { x0, xa0: x0 + Lsb, xa1, x1 },
      ports: [{ n: 'in', k: 'o', x: 0, y: 0, a: 180 }, { n: 'out', k: 'o', x: Ltot, y: 0, a: 0 },
        { n: 'rf_s', k: 'rf', x: xe0, y: 0 }, { n: 'rf_g1', k: 'rf', x: xe0, y: SW / 2 + z.g + GW / 2 }, { n: 'rf_g2', k: 'rf', x: xe0, y: -(SW / 2 + z.g + GW / 2) },
        { n: 'term', k: 'int', x: xe1, y: 0 }, { n: 'h_p', k: 'dc', x: xh0, y: da / 2 }, { n: 'h_n', k: 'dc', x: xh1, y: da / 2 }] };
  }
  function mrrGeom(ctx, d, P) {
    const g = P.mrr.geom, R = g.R_um, w = g.w_um, gap = g.gap_um, Lb = g.bus_len_um || 2 * R + 20, yc = R + gap + w;   // ring centre above the bus
    // bus ↔ route port (w0): same core → linear taper; Si ring on a SiN platform → SiN/Si co-taper (vertical transition, plan view)
    const pf = ctx.pf, wb = g.bus_w_um || w, het = pf.mat !== 'si';
    const Lt = het ? XT_HET : Math.abs(wb - pf.w0) > 1e-9 ? r3(taperLen(pf, pf.w0, wb)) : 0, L = Lb + 2 * Lt, xc = Lt + Lb / 2;
    const tp = (a, b, w0, w1, layer) => ({ t: 'L', a: [a, 0], b: [b, 0], w0, w1, w: Math.max(w0, w1), layer });
    const prims = !Lt ? [] : het
      ? [tp(0, Lt, pf.w0, LITHO.sin, 'core'), tp(0, Lt, LITHO.si, wb, 'si'), tp(L - Lt, L, wb, LITHO.si, 'si'), tp(L - Lt, L, LITHO.sin, pf.w0, 'core')]
      : [tp(0, Lt, pf.w0, wb, 'core'), tp(L - Lt, L, wb, pf.w0, 'core')];
    // contacts: P (inside, ring centre) and N (outside, above the ring) of the lateral junction; heater lead ends as drawn by
    // tools/smq2gds ring_allpass (leads leave the arc ends beside the coupler and run up to R + 8 µm above the ring centre)
    const y0 = -(Math.max(w, pf.w0) / 2 + 3), y1 = yc + R + 10;
    return { kind: 'mrr', L, h: y1 - y0, y0, y1, R, w, gap, yc, xc, Lt, Lb, het, local: { prims, ring_x_um: xc, ring_y_um: yc, transition: !Lt ? 'none' : het ? `SiN ${pf.w0}→${LITHO.sin} / Si ${LITHO.si}→${wb} µm co-taper ${XT_HET} µm (vertical SiN–Si transition, plan view; loss not computed)` : `linear taper ${pf.w0}→${wb} µm` },
      ports: [{ n: 'in', k: 'o', x: 0, y: 0, a: 180 }, { n: 'out', k: 'o', x: L, y: 0, a: 0 },
        { n: 'rf_s', k: 'rf', x: xc, y: yc }, { n: 'rf_g', k: 'rf', x: xc, y: yc + R + 5 },
        { n: 'h_p', k: 'dc', x: xc - (R + 4), y: yc + R + 8 }, { n: 'h_n', k: 'dc', x: xc + (R + 4), y: yc + R + 8 }] };
  }
  function tapGeom(ctx, d, P) {
    const pf = ctx.pf, w = d.wr, gap = Math.max(pf.rules.gap * 2, pf.mat === 'si' ? 0.3 : 0.6), Lc = tapLen(pf, w, gap), pd = P.pd;
    const yt = -(w + gap), sb = sBend(Math.max(8, 4 * w) , d.R, d.bend ? 'euler' : 'arc'), Lpd = pd.L, L = r3(10 + Lc + sb.len + Lpd + 10);
    return { kind: 'tap', L, h: 20 + sb.dy, y0: yt - sb.dy - pd.w / 2 - 4, y1: 4, Lc, gap, yt, sb, xpd: 10 + Lc + sb.len, Lpd, pdw: pd.w,
      ports: [{ n: 'in', k: 'o', x: 0, y: 0, a: 180 }, { n: 'out', k: 'o', x: L, y: 0, a: 0 },
        { n: 'pd_a', k: 'dc', x: 10 + Lc + sb.len + Lpd * 0.25, y: yt - sb.dy }, { n: 'pd_k', k: 'dc', x: 10 + Lc + sb.len + Lpd * 0.75, y: yt - sb.dy }] };
  }
  function laneBox(ctx, d, P) {
    P = P || parts(ctx);
    const m = (d.mod | 0) === 1 ? mrrGeom(ctx, d, P) : mzmGeom(ctx, d, P), t = d.mon ? tapGeom(ctx, d, P) : null;
    const y0 = Math.min(m.y0, t ? t.y0 : 0), y1 = Math.max(m.y1, t ? t.y1 : 0);
    return { m, t, L: m.L + (t ? 10 + t.L : 0), y0, y1, h: y1 - y0 };
  }

  /* ---------------- route primitives ---------------- */
  const EU = () => SPX().EU90;
  const a0Of = (shape, R) => (shape === 'euler' ? EU() * R : R);
  // S-bend for a lateral offset dy (sign = direction): two 90° corners + a vertical straight when the offset allows, otherwise two arcs
  function sBend(dy, R, shape) {
    const a = a0Of(shape, R), ady = Math.abs(dy);
    if (ady < 1e-9) return { kind: 'none', len: 0, dx: 0, dy: 0 };
    if (ady >= 2 * a) return { kind: 'corners', len: 2 * a, dx: 2 * a, dy: ady, a, shape, R };
    if (ady >= 2 * R) return { kind: 'corners', len: 2 * R, dx: 2 * R, dy: ady, a: R, shape: 'arc', mixed: shape === 'euler', R };   // Euler footprint too large: circular corners
    const th = Math.acos(1 - ady / (2 * R));   // circular arcs for small offsets (Euler footprint too large)
    return { kind: 'arcs', len: 2 * R * Math.sin(th), dx: 2 * R * Math.sin(th), dy: ady, th, R };
  }
  // horizontal route from p0 (heading +x) to p1 (heading +x) with the vertical jog centred at xj
  function jogRoute(p0, p1, xj, R, shape) {
    const dy = p1[1] - p0[1], sb = sBend(dy, R, shape), s = Math.sign(dy) || 1, prims = [];
    if (sb.kind === 'none') { prims.push({ t: 'L', a: [p0[0], p0[1]], b: [p1[0], p1[1]] }); return { prims, ok: p1[0] > p0[0], why: p1[0] > p0[0] ? '' : '포트가 반대 방향' }; }
    const xa = xj - sb.dx / 2, xb = xj + sb.dx / 2;
    if (xa < p0[0] - 1e-6 || xb > p1[0] + 1e-6) return { prims: [], ok: false, why: xb > p1[0] + 1e-6 ? `팬 영역이 도착 포트를 넘음 (S-bend ${sb.dx.toFixed(0)} µm, 남은 길이 ${Math.max(0, p1[0] - Math.max(xa, p0[0])).toFixed(0)} µm) — 다이를 넓히거나 R·피치 조정` : `출발 포트 앞 공간 부족 (S-bend ${sb.dx.toFixed(0)} µm)`, code: 'space' };
    if (xa > p0[0]) prims.push({ t: 'L', a: [p0[0], p0[1]], b: [xa, p0[1]] });
    if (sb.kind === 'corners') {
      const a = sb.a, turn = s, sh = sb.shape;   // left turn (+1) when going up
      prims.push({ t: 'C', V: [xa + a, p0[1]], h_deg: 0, turn, shape: sh, R, a0: a });
      if (sb.dy - 2 * a > 1e-9) prims.push({ t: 'L', a: [xa + a, p0[1] + s * a], b: [xa + a, p1[1] - s * a] });
      prims.push({ t: 'C', V: [xa + a, p1[1]], h_deg: s > 0 ? 90 : 270, turn: -turn, shape: sh, R, a0: a });
    } else {
      const th = sb.th, Rr = sb.R, c1 = [xa, p0[1] + s * Rr], c2 = [xb, p1[1] - s * Rr];
      prims.push({ t: 'A', c: c1, r: Rr, a0_deg: s > 0 ? -90 : 90, a1_deg: s > 0 ? -90 + deg(th) : 90 - deg(th) });
      prims.push({ t: 'A', c: c2, r: Rr, a0_deg: s > 0 ? 90 + deg(th) : -90 - deg(th), a1_deg: s > 0 ? 90 : -90 });
    }
    if (p1[0] > xb + 1e-9) prims.push({ t: 'L', a: [xb, p1[1]], b: [p1[0], p1[1]] });
    return { prims, ok: true, why: '' };
  }
  // sample primitives → [[x, y, κ, w]] (κ for bend loss, w = local width), step ≈ ds µm
  function sample(prims, ds) {
    const out = [];
    for (const p of prims) {
      const w0 = p.w0 != null ? p.w0 : p.w, w1 = p.w1 != null ? p.w1 : p.w;
      if (p.t === 'L') { const n = Math.max(1, Math.ceil(Math.hypot(p.b[0] - p.a[0], p.b[1] - p.a[1]) / ds)); for (let i = 0; i <= n; i++) out.push([p.a[0] + (p.b[0] - p.a[0]) * i / n, p.a[1] + (p.b[1] - p.a[1]) * i / n, 0, w0 + (w1 - w0) * i / n]); }
      else if (p.t === 'A') { const n = Math.max(4, Math.ceil(p.r * Math.abs(rad(p.a1_deg - p.a0_deg)) / ds)); for (let i = 0; i <= n; i++) { const t = rad(p.a0_deg + (p.a1_deg - p.a0_deg) * i / n); out.push([p.c[0] + p.r * Math.cos(t), p.c[1] + p.r * Math.sin(t), 1 / p.r, p.w]); } }
      else if (p.t === 'C') { const loc = SPX().cornerLocal(p.shape === 'euler', p.R, p.a0, 0, Math.max(16, Math.ceil(p.R * 2 / ds))), pts = SPX().place({ V: p.V, h: rad(p.h_deg), turn: p.turn }, loc); pts.forEach((q, i) => out.push([q[0], q[1], loc[i][2], p.w])); }
    }
    return out;
  }
  // widen long routes: linear w_port → w_body tapers on the first and last straight (adiabatic length, representative), else stay narrow
  const taperLen = (pf, w0, w1) => (pf.mat === 'si' ? 15 + 20 * Math.abs(w1 - w0) : 40 + 40 * Math.abs(w1 - w0));
  function widen(prims, pf, w0, w1) {
    prims.forEach((p) => { p.w = w0; });
    if (w1 <= w0 + 1e-9 || !prims.length) return { narrow: false, Lt: 0 };
    const Lt = taperLen(pf, w0, w1), len = (p) => Math.hypot(p.b[0] - p.a[0], p.b[1] - p.a[1]);
    const ok = prims.map((p) => p.t === 'L' && len(p) >= Lt + 1), i = ok.indexOf(true), j = ok.lastIndexOf(true);
    if (i < 0 || (i === j && len(prims[i]) < 2 * Lt + 2)) return { narrow: true, Lt };
    const at = (p, f) => [p.a[0] + (p.b[0] - p.a[0]) * f, p.a[1] + (p.b[1] - p.a[1]) * f], out = [];
    prims.forEach((p, k) => {
      if (k < i || k > j) { out.push({ ...p, w: w0 }); return; }
      if (k > i && k < j) { out.push({ ...p, w: w1 }); return; }
      let a = p.a; const b = p.b, L = len(p);
      if (k === i) { const m = at(p, Lt / L); out.push({ t: 'L', a, b: m, w0, w1, w: w1 }); a = m; }
      if (k === j) { const m = at(p, 1 - Lt / L); if (Math.hypot(m[0] - a[0], m[1] - a[1]) > 1e-6) out.push({ t: 'L', a, b: m, w: w1 }); out.push({ t: 'L', a: m, b, w0: w1, w1: w0, w: w1 }); }
      else out.push({ t: 'L', a, b, w: w1 });
    });
    prims.length = 0; out.forEach((p) => prims.push(p));
    return { narrow: false, Lt };
  }
  function primLen(p) {
    if (p.t === 'L') return Math.hypot(p.b[0] - p.a[0], p.b[1] - p.a[1]);
    if (p.t === 'A') return p.r * Math.abs(rad(p.a1_deg - p.a0_deg));
    return p.shape === 'euler' ? Math.PI * p.R : Math.PI / 2 * p.R;   // Euler 90° pair: total length π·R_min (κ_max = 1/R_min); arc: πR/2
  }
  // propagation (sidewall + surface scattering of the local width, D-1 model) + bend radiation along the local curvature
  function routeLoss(prims, pf) {
    let L = 0, bend = 0, prop = 0;
    for (const p of prims) {
      const l = primLen(p); L += l;
      const al = p.w0 != null ? (wgModel(pf, p.w0).alpha + wgModel(pf, p.w1).alpha) / 2 : wgModel(pf, p.w).alpha, x = SPX().xs(pf, p.w);
      prop += al * l * 1e-4;
      if (p.t === 'A') bend += SPX().bendDBcm(x, p.r) * l * 1e-4;
      if (p.t === 'C') { const s = sample([p], 0.5); for (let i = 1; i < s.length; i++) { const k = (s[i][2] + s[i - 1][2]) / 2, ds = Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]); if (k > 1e-9) bend += SPX().bendDBcm(x, 1 / k) * ds * 1e-4; } }
    }
    return { L, prop, bend, total: prop + bend };
  }

  // local-frame geometry of composite cells, exported so the GDS backend draws exactly these primitives
  const prw = (prims, w) => prims.map((p) => ({ ...p, w }));
  function mzmLocal(m, P, pf) {
    const mm = P.mmi, a = m.arms, h = m.da / 2, prims = [], Rb = m.sb.R, sh = m.sb.kind === 'corners' && !m.sb.mixed ? m.sb.shape : 'euler';
    for (const sg of [1, -1]) {
      prims.push(...jogRoute([mm.Ltot, sg * mm.s / 2], [a.xa0, sg * h], mm.Ltot + m.sb.dx / 2, Rb, sh).prims);
      prims.push({ t: 'L', a: [a.xa0, sg * h], b: [a.xa1, sg * h] });
      prims.push(...jogRoute([a.xa1, sg * h], [a.x1, sg * mm.s / 2], a.xa1 + m.sb.dx / 2, Rb, sh).prims);
    }
    const g = P.mzm.g, rects = [
      { layer: 'm1', role: 'G1', x0: m.xe0, x1: m.xe1, y0: SW / 2 + g, y1: SW / 2 + g + GW }, { layer: 'm1', role: 'S', x0: m.xe0, x1: m.xe1, y0: -SW / 2, y1: SW / 2 },
      { layer: 'm1', role: 'G2', x0: m.xe0, x1: m.xe1, y0: -(SW / 2 + g + GW), y1: -(SW / 2 + g) },
      { layer: 'heater', role: 'bias heater', x0: m.xh0, x1: m.xh1, y0: h - 1, y1: h + 1 }, { layer: 'term', role: `R_T ${P.mzm.RT} Ω (placeholder)`, x0: m.xe1, x1: m.xe1 + 20, y0: -SW / 2, y1: SW / 2 }];
    return { local: { prims: prw(prims, pf.w0), mmi_in: { x_um: 0, mirror: false }, mmi_out: { x_um: m.L, mirror: true }, rects } };
  }
  function tapLocal(t, d, pf) {
    const w = pf.w0, xe = 10 + t.Lc, yp = t.yt - t.sb.dy, prims = [{ t: 'L', a: [0, 0], b: [t.L, 0] }, { t: 'L', a: [10, t.yt], b: [xe, t.yt] }];
    prims.push(...jogRoute([xe, t.yt], [t.xpd, yp], xe + t.sb.dx / 2, d.R, d.bend ? 'euler' : 'arc').prims);
    prims.push({ t: 'L', a: [t.xpd, yp], b: [t.xpd + t.Lpd, yp] });   // waveguide under the Ge absorber
    return { local: { prims: prw(prims, w), rects: [{ layer: 'ge', role: 'Ge PD', x0: t.xpd, x1: t.xpd + t.Lpd, y0: yp - t.pdw / 2, y1: yp + t.pdw / 2 }] } };
  }
  // horizontal room a fan needs (same ordering as route(): corners share the jog pitch, arc S-bends are laid side by side)
  function fanWidth(moves, R, shape, jog, compress) {
    const w = (g) => { if (!g.length) return 0; g = g.slice().sort((p, q) => Math.abs(p) - Math.abs(q)); if (!compress) g.reverse(); let lastV = -Infinity, lastEnd = -jog, end = 0; g.forEach((dy) => { const sb = sBend(dy, R, shape), xj = Math.max(lastV + jog, lastEnd + jog + sb.dx / 2, sb.dx / 2); lastV = xj; lastEnd = Math.max(lastEnd, xj + sb.dx / 2); end = Math.max(end, xj + sb.dx / 2); }); return end; };
    return Math.max(w(moves.filter((m) => m > 1e-6)), w(moves.filter((m) => m < -1e-6))) + 30;
  }
  /* ---------------- build the circuit (schematic + placement + routes + electrical) ---------------- */
  // smallest die for the auto placement: optical length (+ DC pad row) in x; everything incl. pads / bumps in y (edge pads sit on the edges)
  function minDie(ctx, d) {
    const c = build(ctx, { ...d, W: 20, H: 20 }), e = d.edge, ys = [];
    c.inst.forEach((I) => { const b = c.bbox(I); ys.push(b[1], b[3]); });
    const flip = (d.rf | 0) === 1;
    (c.pads || []).forEach((p) => { if (flip) ys.push(p.y - p.w / 2, p.y + p.w / 2); });
    const xr = Math.max(0, ...(c.pads || []).map((p) => p.x + p.w / 2 + e)), span = Math.max(...ys) - Math.min(...ys);
    return { W: Math.max(c.need.W, xr), H: flip ? span + 2 * e + 20 : c.need.H };
  }
  function build(ctx, d, opt) {
    opt = opt || {};
    const pf = ctx.pf, P = parts(ctx), mod = (d.mod | 0) === 1 ? 'mrr' : 'mzm', N = SH[d.share | 0], nL = LANES / N, depth = Math.log2(N);
    const W = d.W * 1000, H = d.H * 1000, e = d.edge, shape = d.bend ? 'euler' : 'arc', R = d.R, wm = wgModel(pf, Math.max(d.wr, pf.w0)), a = a0Of(shape, R);
    const lb = laneBox(ctx, d, P), inst = [], onets = [], enets = [], issues = [];
    const add = (o) => { o.x = r3(o.x); o.y = r3(o.y); o.ports = o.ports.map((p) => ({ ...p, x: r3(p.x), y: r3(p.y) })); inst.push(o); return o; };   // placement and ports on the 1 nm grid
    const portAbs = (I, n) => { const p = I.ports.find((q) => q.n === n); return { ...p, X: I.x + p.x * (I.rot === 180 ? -1 : 1), Y: I.y + p.y * (I.rot === 180 ? -1 : 1), A: I.rot === 180 ? (p.a + 180) % 360 : p.a }; };
    const bbox = (I) => (I.rot === 180 ? [I.x - I.L, I.y - I.y1, I.x, I.y - I.y0] : [I.x, I.y + I.y0, I.x + I.L, I.y + I.y1]);
    // vertical stack: lanes centred between the two pad rows
    const rfH = (d.rf | 0) === 1 ? 0 : PAD.w + 30, yL = (i) => yc + (i - (LANES - 1) / 2) * d.P;
    let yc = H / 2, dcH = rfH;   // yc is moved below once the DC fan-out channel height is known
    // x columns
    const ssc = P.ssc, mmi = P.mmi, rootY = (k) => (yL(k * N) + yL(k * N + N - 1)) / 2, finY = (k) => yc + (k - (nL - 1) / 2) * d.fp;
    const fanIn = fanWidth(Array.from({ length: nL }, (_, k) => rootY(k) - finY(k)), R, shape, d.jog, d.fp > N * d.P);
    const xTree0 = ssc.Lt + 10 + fanIn;
    const lvlLen = []; for (let j = 0; j < depth; j++) { const dyj = d.P * Math.pow(2, depth - j - 2) - mmi.s / 2; lvlLen.push(mmi.Ltot + sBend(Math.max(dyj, 0), R, shape).len + 20); }
    let xMod0 = xTree0 + lvlLen.reduce((s, v) => s + v, 0) + (N === 1 ? 0 : 10) + 20;
    if ((d.rf | 0) === 0) { const xf = lb.m.ports.find((p) => p.n === 'rf_s').x; xMod0 = Math.max(xMod0, e + PAD.w / 2 + 30 + (rfPads(d) - 1) * d.pp + 10 - xf); }
    else if (lb.m.kind === 'mrr') xMod0 = Math.max(xMod0, e + BUMP.w / 2 + RING_BX + (rfPads(d) - 1) * BUMP.pitch + lb.m.R - lb.m.xc + 5);   // bump row west of the ring
    else xMod0 = Math.max(xMod0, e + BUMP.w / 2 + 40 - lb.m.xe0 + 5);
    const stag = (i) => ((d.rfSide | 0) === 1 ? (LANES - 1 - i) : i) * d.stag;
    // edge pads: DC lines fan out planar to the pad row through a channel of one track per line (dcPlan) — the channel sets the
    // margin on the DC side; lanes are centred between the RF pad margin and the DC margin
    if ((d.rf | 0) === 0) {
      const its = []; for (let i = 0; i < LANES; i++) { const xm = r3(xMod0 + stag(i)), y = (i - (LANES - 1) / 2) * d.P; lb.m.ports.filter((p) => p.k === 'dc').forEach((p) => its.push({ X: r3(xm + p.x), Y: y + p.y })); if (lb.t) lb.t.ports.filter((p) => p.k === 'dc').forEach((p) => its.push({ X: r3(r3(xm + lb.m.L + 10) + p.x), Y: y + p.y })); }
      dcH = PAD.w + 30 + dcPlan(its, d.pp, e + PAD.w / 2 + 10, W - e - PAD.w / 2 - 10).n * DC_TP;
      yc = (d.rfSide | 0) === 0 ? (e + dcH + H - e - rfH) / 2 : (e + rfH + H - e - dcH) / 2;
    }
    // ---- instances ----
    const ins = []; for (let k = 0; k < nL; k++) ins.push(add({ id: `IN${k}`, type: 'ssc', role: 'input', lane: null, x: 0, y: yc + (k - (nL - 1) / 2) * d.fp, rot: 0, L: ssc.Lt, y0: -2, y1: 2, params: { Lt_um: ssc.Lt, tip_um: ssc.tw, w_um: pf.w0 }, src: ssc.src,
      ports: [{ n: 'fib', k: 'fib', x: 0, y: 0, a: 180 }, { n: 'out', k: 'o', x: ssc.Lt, y: 0, a: 0 }] }));
    // splitter tree: node (k, j, idx) covers lanes [k·N + idx·N/2^j, … + N/2^j)
    const tree = [];
    for (let k = 0; k < nL; k++) {
      let x = xTree0;
      for (let j = 0; j < depth; j++) {
        const span = N / Math.pow(2, j);
        for (let q = 0; q < Math.pow(2, j); q++) {
          const l0 = k * N + q * span, yy = (yL(l0) + yL(l0 + span - 1)) / 2;
          tree.push(add({ id: `SP${k}_${j}_${q}`, type: 'mmi1x2', role: 'splitter', k, j, q, l0, span, x, y: yy, rot: 0, L: mmi.Ltot, y0: -mmi.W / 2, y1: mmi.W / 2,
            params: { W_um: mmi.W, L_um: mmi.L, wt_um: mmi.wt, s_um: mmi.s, taper_len_um: mmi.tl, w_io_um: d.wr }, src: mmi.src,
            ports: [{ n: 'in', k: 'o', x: 0, y: 0, a: 180 }, { n: 'o1', k: 'o', x: mmi.Ltot, y: mmi.s / 2, a: 0 }, { n: 'o2', k: 'o', x: mmi.Ltot, y: -mmi.s / 2, a: 0 }] }));
        }
        x += lvlLen[j];
      }
    }
    const mods = [], taps = [];
    for (let i = 0; i < LANES; i++) {
      const m = lb.m, x = xMod0 + stag(i), y = yL(i);
      const src = mod === 'mrr' ? P.mrr.src : `${P.mzm.src} + ${P.mmi.src} + ${P.heater.src}`;
      mods.push(add({ id: `MOD${i}`, type: mod, role: 'modulator', lane: i, x, y, rot: 0, L: m.L, y0: m.y0, y1: m.y1, geom: m, src,
        params: mod === 'mrr' ? { ring: { ...P.mrr.geom, local_pads: false }, local: m.local } : { L_e_um: P.mzm.Le, gap_um: P.mzm.g, signal_um: SW, ground_um: GW, arm_sep_um: m.da, RT_ohm: P.mzm.RT, mmi: { W_um: mmi.W, L_um: mmi.L, wt_um: mmi.wt, s_um: mmi.s, taper_len_um: mmi.tl, w_io_um: pf.w0 },
          heater: { L_um: P.heater.L, w_um: 2, h_um: P.heater.h, x0_um: m.xh0 }, sbend: m.sb, ...mzmLocal(m, P, pf) },
        ports: m.ports }));
      if (lb.t) { const t = lb.t; taps.push(add({ id: `MON${i}`, type: 'tap_pd', role: 'monitor', lane: i, x: x + m.L + 10, y, rot: 0, L: t.L, y0: t.y0, y1: t.y1, geom: t, src: `${P.pd.src} (Ge ${P.pd.L}×${P.pd.w} µm) · 2 % 방향성 결합기`,
        params: { Lc_um: r4(t.Lc), gap_um: t.gap, ratio: TAP, pd_L_um: t.Lpd, pd_w_um: t.pdw, ...tapLocal(t, d, pf) }, ports: t.ports })); }
    }
    const lastX = Math.max(...(lb.t ? taps : mods).map((I) => I.x + I.L));
    const fanOut = fanWidth(Array.from({ length: LANES }, (_, i) => yc + (i - (LANES - 1) / 2) * d.fp - yL(i)), R, shape, d.jog, d.P > d.fp) + 20, xOutFacet = W;
    const outs = []; for (let i = 0; i < LANES; i++) outs.push(add({ id: `OUT${i}`, type: 'ssc', role: 'output', lane: i, x: xOutFacet, y: yc + (i - (LANES - 1) / 2) * d.fp, rot: 180, L: ssc.Lt, y0: -2, y1: 2,
      params: { Lt_um: ssc.Lt, tip_um: ssc.tw, w_um: pf.w0 }, src: ssc.src, ports: [{ n: 'fib', k: 'fib', x: 0, y: 0, a: 180 }, { n: 'in', k: 'o', x: ssc.Lt, y: 0, a: 0 }] }));
    // die size actually needed
    const nDC = (lb.m.ports.filter((p) => p.k === 'dc').length + (lb.t ? 2 : 0)) * LANES;
    const needW = Math.max(lastX + fanOut + ssc.Lt + e, (d.rf | 0) === 1 ? 0 : 2 * e + PAD.w + 20 + nDC * d.pp), ys = inst.flatMap((I) => { const b = bbox(I); return [b[1], b[3]]; });
    const needH = (Math.max(...ys) - Math.min(...ys)) + rfH + dcH + 2 * e + 20;
    // ---- optical nets ----
    const net = (from, to, lane, kind) => onets.push({ id: `n${onets.length}`, from, to, lane, kind });
    for (let k = 0; k < nL; k++) {
      if (depth === 0) net(`IN${k}.out`, `MOD${k}.in`, k, 'feed');
      else net(`IN${k}.out`, `SP${k}_0_0.in`, null, 'feed');
      for (let j = 0; j < depth; j++) for (let q = 0; q < Math.pow(2, j); q++) {
        const id = `SP${k}_${j}_${q}`;
        if (j + 1 < depth) { net(`${id}.o1`, `SP${k}_${j + 1}_${2 * q + 1}.in`, null, 'tree'); net(`${id}.o2`, `SP${k}_${j + 1}_${2 * q}.in`, null, 'tree'); }
        else { const l0 = k * N + q * 2; net(`${id}.o1`, `MOD${l0 + 1}.in`, l0 + 1, 'tree'); net(`${id}.o2`, `MOD${l0}.in`, l0, 'tree'); }
      }
    }
    for (let i = 0; i < LANES; i++) {
      if (lb.t) { net(`MOD${i}.out`, `MON${i}.in`, i, 'lane'); net(`MON${i}.out`, `OUT${i}.in`, i, 'out'); }
      else net(`MOD${i}.out`, `OUT${i}.in`, i, 'out');
    }
    const I = (id) => inst.find((x) => x.id === id);
    const circ = { schema: SCHEMA, platform: pf, d, mod, N, nL, depth, W, H, inst, onets, enets, issues, need: { W: needW, H: needH }, lb, wm, a, shape, I, portAbs, bbox, yL, P };
    if (opt.noRoute) return circ;
    route(circ);
    electrical(circ);
    return circ;
  }

  /* ---------------- optical routing ---------------- */
  function route(c) {
    const d = c.d, R = d.R, shape = c.shape, a = c.a;
    c.routes = [];
    const ends = (n) => { const [fi, fp] = n.from.split('.'), [ti, tp] = n.to.split('.'); return { A: c.portAbs(c.I(fi), fp), B: c.portAbs(c.I(ti), tp), fi, ti }; };
    // fan groups: jog x chosen so that verticals never cross (inner routes jog first when compressing, outer first when expanding)
    const plan = (list, xlo, xhi) => {
      const cen = list.reduce((s, x) => s + x.A.Y, 0) / list.length;
      const up = list.filter((x) => x.B.Y > x.A.Y + 1e-6).sort((p, q) => Math.abs(p.B.Y - p.A.Y) - Math.abs(q.B.Y - q.A.Y));
      const dn = list.filter((x) => x.B.Y < x.A.Y - 1e-6).sort((p, q) => Math.abs(p.B.Y - p.A.Y) - Math.abs(q.B.Y - q.A.Y));
      // compression (moving toward the centre line) → the route with the smallest move jogs first; expansion → the largest first
      const order = (g, compress) => (compress ? g : g.slice().reverse());
      // verticals strictly ordered (the analysis of crossing-free fans needs monotonic jog x), arc S-bends side by side
      const assign = (g, compress) => { let lastV = -Infinity, lastEnd = xlo + 10 - d.jog; order(g, compress).forEach((x) => { const sb = sBend(x.B.Y - x.A.Y, R, shape); x.xj = Math.max(lastV + d.jog, lastEnd + d.jog + sb.dx / 2, xlo + 10 + sb.dx / 2); lastV = x.xj; lastEnd = Math.max(lastEnd, x.xj + sb.dx / 2); }); };
      const compress = (g) => g.length && Math.abs(g[0].B.Y - cen) < Math.abs(g[0].A.Y - cen) + 1e-6;
      up.forEach((x) => { x.sbW = sBend(x.B.Y - x.A.Y, R, shape).dx; }); dn.forEach((x) => { x.sbW = sBend(x.B.Y - x.A.Y, R, shape).dx; });
      assign(up, compress(up)); assign(dn, compress(dn));
      list.filter((x) => Math.abs(x.B.Y - x.A.Y) <= 1e-6).forEach((x) => { x.xj = (xlo + xhi) / 2; });
    };
    const feeds = c.onets.filter((n) => n.kind === 'feed').map((n) => ({ n, ...ends(n) }));
    const trees = c.onets.filter((n) => n.kind === 'tree').map((n) => ({ n, ...ends(n) }));
    const lanes = c.onets.filter((n) => n.kind === 'lane').map((n) => ({ n, ...ends(n) }));
    const outs = c.onets.filter((n) => n.kind === 'out').map((n) => ({ n, ...ends(n) }));
    if (feeds.length) plan(feeds, Math.max(...feeds.map((x) => x.A.X)), Math.min(...feeds.map((x) => x.B.X)));
    if (outs.length) plan(outs, Math.max(...outs.map((x) => x.A.X)), Math.min(...outs.map((x) => x.B.X)));
    // tree branches jog right after their MMI (offsets of one branch never cross: siblings go opposite ways)
    trees.forEach((x) => { const sb = sBend(x.B.Y - x.A.Y, R, shape); x.xj = x.A.X + 10 + sb.dx / 2; });
    lanes.forEach((x) => { x.xj = (x.A.X + x.B.X) / 2; });
    for (const x of [...feeds, ...trees, ...lanes, ...outs]) {
      const r = { net: x.n.id, from: x.n.from, to: x.n.to, lane: x.n.lane, kind: x.n.kind, prims: [], ok: true, why: '' };
      if (Math.abs(x.A.A) > 1e-6 && Math.abs(x.A.A - 360) > 1e-6) { r.ok = false; r.why = '출발 포트가 동쪽을 향하지 않음'; r.code = 'port'; }
      else if (Math.abs(x.B.A - 180) > 1e-6) { r.ok = false; r.why = '도착 포트가 서쪽을 향하지 않음 (포트 불일치)'; r.code = 'port'; }
      else { const j = jogRoute([x.A.X, x.A.Y], [x.B.X, x.B.Y], x.xj, R, shape); r.prims = j.prims; r.ok = j.ok; r.why = j.why; r.code = j.code; }
      const wd = widen(r.prims, c.platform, c.platform.w0, Math.max(d.wr, c.platform.w0)); r.narrow = wd.narrow; r.w = r.narrow || d.wr <= c.platform.w0 ? c.platform.w0 : d.wr;
      const lo = routeLoss(r.prims, c.platform); r.length_um = lo.L; r.loss_dB = lo.total; r.bend_dB = lo.bend;
      if (r.ok && lo.L > 20000) { r.ok = false; r.why = `배선 길이 ${(lo.L / 1000).toFixed(1)} mm 초과 (> 20 mm)`; r.code = 'long'; }
      if (!r.ok) r.at = [(x.A.X + x.B.X) / 2, (x.A.Y + x.B.Y) / 2];
      c.routes.push(r);
    }
  }

  /* ---------------- electrical interface (pads, RF feeds, DC lines, termination) ---------------- */
  function electrical(c) {
    const d = c.d, H = c.H, e = d.edge, flip = (d.rf | 0) === 1, N_side = (d.rfSide | 0) === 0;
    c.pads = []; c.elines = []; c.enets.length = 0;
    const yRF = N_side ? H - e - PAD.w / 2 : e + PAD.w / 2, yDC = N_side ? e + PAD.w / 2 : H - e - PAD.w / 2;
    const pad = (id, kind, x, y, net, w) => { const p = { id, kind, x, y, w: w || (flip ? BUMP.w : PAD.w), net }; c.pads.push(p); return p; };
    const line = (net, kind, pts, layer) => { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.abs(pts[i][0] - pts[i - 1][0]) + Math.abs(pts[i][1] - pts[i - 1][1]); c.elines.push({ net, kind, pts, layer, width_um: MW[kind], length_um: L }); return L; };
    const dcAll = [];
    for (const M of c.inst.filter((x) => x.role === 'modulator')) {
      const i = M.lane, P = (n) => c.portAbs(M, n), rf = M.ports.filter((p) => p.k === 'rf').map((p) => p.n);
      // RF: GSG (TW-MZM) or GS (ring). Edge pads: pads in a row at the feed x, lines go west then straight to the edge (planar by the
      // lane stagger). Flip-chip: bumps next to the electrode (3D-stacked driver), stub lines only.
      const s = P('rf_s'), dir = N_side ? 1 : -1;
      const order = c.mod === 'mzm' ? ['rf_g2', 'rf_s', 'rf_g1'] : ['rf_s', 'rf_g'];
      const order2 = N_side ? order : order.slice().reverse();
      let rfLen = 0;
      order2.forEach((n, k) => {
        const p = P(n), id = `RF${i}_${n.slice(3)}`;
        if (flip) {   // bump column 50 µm west of the feed point, 55 µm pitch (3D-stacked driver right above)
          const kk = k - (order2.length - 1) / 2, g = M.geom;
          const xr = M.x + g.xc - g.R - RING_BX, sY = P('rf_s').Y;   // ring: S bump west at the junction height, G bump nearer and raised so the S line passes below it
          const b = c.mod === 'mrr' ? (n === 'rf_s' ? pad(id, 'rf', xr - BUMP.pitch, p.Y, `${M.id}.${n}`) : pad(id, 'rf', xr, Math.max(p.Y, sY + MW.rf / 2 + 5 + BUMP.w / 2), `${M.id}.${n}`))
            : pad(id, 'rf', s.X - 40, s.Y + kk * BUMP.pitch * dir, `${M.id}.${n}`);                                                    // column at the electrode start
          rfLen = Math.max(rfLen, line(`${M.id}.${n}`, 'rf', [[p.X, p.Y], [b.x, p.Y], [b.x, b.y]], 'M1'));
        }
        else {
          const px = s.X - 30 - (order2.length - 1 - k) * d.pp, b = pad(id, 'rf', px, yRF, `${M.id}.${n}`);
          rfLen = Math.max(rfLen, line(`${M.id}.${n}`, 'rf', [[p.X, p.Y], [px, p.Y], [px, b.y]], 'M1'));
        }
        c.enets.push({ id: `${M.id}.${n}`, kind: 'rf', lane: i, from: `${M.id}.${n}`, to: `pad:${id}` });
      });
      M.rfLen = rfLen;
      if (c.mod === 'mzm') c.enets.push({ id: `${M.id}.term`, kind: 'rf_term', lane: i, from: `${M.id}.term`, to: `R_T ${M.params.RT_ohm} Ω (온칩, 추상)` });
      // DC: heater ± and monitor PD ± → pads on the opposite edge (or local bumps)
      const dcp = M.ports.filter((p) => p.k === 'dc').map((p) => ({ n: p.n, I: M })).concat(c.inst.filter((x) => x.role === 'monitor' && x.lane === i).flatMap((T) => T.ports.filter((p) => p.k === 'dc').map((p) => ({ n: p.n, I: T }))));
      dcp.forEach((q) => { const p = c.portAbs(q.I, q.n); dcAll.push({ ...q, i, X: p.X, Y: p.Y, id: `DC${i}_${q.n}`, net: `${q.I.id}.${q.n}`, laneY0: M.y + lbY0(c) }); });
    }
    // DC: planar fan-out (dcPlan) — flip-chip: a bump row under each lane; edge: one pad row on the DC edge for the whole die
    const dcDraw = (grp, py, tdir, t0, pitch, lo, hi) => {
      const pl = dcPlan(grp, pitch, lo, hi);
      grp.forEach((q, k) => {
        const b = pad(q.id, 'dc', pl.px[k], py, q.net), t = r3(py + tdir * (t0 + pl.tr[k] * DC_TP)), x = pl.col[k];
        const head = x !== q.X ? [[q.X, q.Y], [x, q.Y]] : [[q.X, q.Y]];   // stub at the port height to the line's own column
        line(q.net, 'dc', pl.tr[k] < 0 ? [...head, [x, b.y]] : [...head, [x, t], [b.x, t], [b.x, b.y]], 'M2');
        c.enets.push({ id: q.net, kind: 'dc', lane: q.i, from: q.net, to: `pad:${q.id}` });
      });
      return pl;
    };
    if (flip) for (let i = 0; i < LANES; i++) {
      const grp = dcAll.filter((q) => q.i === i); if (!grp.length) continue;
      const M = c.inst.find((x) => x.id === `MOD${i}`), g = M.geom;
      const lo = c.mod === 'mrr' ? M.x + g.xc - g.R - RING_BX + BUMP.pitch : -Infinity;   // ring: DC bumps east of the RF bump column (clear of it at any height)
      const n = dcPlan(grp, BUMP.pitch, lo, Infinity).n, t0 = BUMP.w / 2 + 8;
      dcDraw(grp, r3(grp[0].laneY0 - 5 - Math.max(n - 1, 0) * DC_TP - t0), 1, t0, BUMP.pitch, lo, Infinity);   // top track 5 µm under the lane box
    }
    else { const dir = N_side ? 1 : -1; c.dcPlan = dcDraw(dcAll, yDC, dir, PAD.w / 2 + 20, d.pp, e + PAD.w / 2 + 10, c.W - e - PAD.w / 2 - 10); }
  }
  // planar ("river") fan-out of DC lines (ports {X, Y} above a pad row) on one metal layer:
  // 1. columns — lines are taken from the lowest port up; a line keeps its port x unless a column already taken (or a stub
  //    already drawn below it) is closer than DC_SEP, then it runs a short stub at its own port height to the nearest free column
  //    (the stub may not pass a column whose port is within DC_SEP of this height);
  // 2. pads in column order, centred under the columns (clamped to [lo, hi] when the row fits), one horizontal track per line:
  //    lines going left — the larger column takes the track nearer the pads; going right — mirrored. No vertical then crosses
  //    another line's track, and left / right groups never overlap.
  function dcPlan(items, pitch, lo, hi) {
    const n = items.length, col = new Array(n), px = new Array(n), tr = new Array(n).fill(-1);
    if (!n) return { px, tr, col, n: 0 };
    const fixed = [];   // { x: column, top, sx0, sx1, sy } — vertical from top down; stub [sx0, sx1] at height sy
    const free = (x, h, x0) => fixed.every((f) => Math.abs(f.x - x) >= DC_SEP - 1e-9 && !(f.sx1 > f.sx0 && f.sy < h + DC_SEP && x > f.sx0 - DC_SEP && x < f.sx1 + DC_SEP))
      && (x === x0 || fixed.every((f) => { const dir = Math.sign(x - x0), a = (f.x - x0) * dir, b = (f.x - x) * dir; return !(f.top > h - DC_SEP && a >= 0 && b < DC_SEP); }));   // the stub may not run over or past a column reaching this height (columns behind the stub start are fine)
    items.map((q, k) => k).sort((a, b) => items[a].Y - items[b].Y || items[a].X - items[b].X).forEach((k) => {
      const { X, Y } = items[k]; let x = X;
      if (!free(X, Y, X)) for (let s = 1; s <= 400; s++) { const c1 = r3(X + s * 0.5), c2 = r3(X - s * 0.5); if (free(c1, Y, X)) { x = c1; break; } if (free(c2, Y, X)) { x = c2; break; } }
      col[k] = x; fixed.push({ x, top: Y, sx0: Math.min(X, x), sx1: Math.max(X, x), sy: Y });
    });
    const ord = col.map((x, k) => k).sort((a, b) => col[a] - col[b]);
    let x0 = col.reduce((s, v) => s + v, 0) / n - (n - 1) / 2 * pitch;
    if (hi - (n - 1) * pitch >= lo) x0 = Math.min(Math.max(x0, lo), hi - (n - 1) * pitch);
    ord.forEach((k, r) => { px[k] = r3(x0 + r * pitch); });
    const left = ord.filter((k) => px[k] < col[k] - 1e-6), right = ord.filter((k) => px[k] > col[k] + 1e-6);
    left.forEach((k, r) => { tr[k] = left.length - 1 - r; }); right.forEach((k, r) => { tr[k] = r; });
    return { px, tr, col, n: Math.max(left.length, right.length) };
  }

  const lbY0 = (c) => c.lb.y0;   // lane bottom incl. the monitor tap (DC bumps sit below it, away from the RF bumps)
  /* ---------------- checks ---------------- */
  const ST = { P: 'PASS', W: 'WARNING', F: 'FAIL', N: 'NOT VERIFIED' };
  function checks(c, ctx) {
    const out = [], add = (g, item, st, detail) => out.push({ group: g, item, status: st, detail });
    const d = c.d, pf = c.platform, W = c.W, H = c.H, e = d.edge;
    /* connectivity */
    const used = new Map(); let dup = 0;
    const use = (ep) => { used.set(ep, (used.get(ep) || 0) + 1); if (used.get(ep) > 1) dup++; };
    c.onets.forEach((n) => { use(n.from); use(n.to); });
    const opPorts = c.inst.flatMap((I) => I.ports.filter((p) => p.k === 'o').map((p) => `${I.id}.${p.n}`));
    const miss = opPorts.filter((p) => !used.has(p));
    const kinds = c.onets.every((n) => { const [fi, fp] = n.from.split('.'), [ti, tp] = n.to.split('.'), A = c.I(fi).ports.find((p) => p.n === fp), B = c.I(ti).ports.find((p) => p.n === tp); return A && B && A.k === 'o' && B.k === 'o'; });
    add('Connectivity', '광 포트 연결 (모든 광 포트 정확히 한 번)', miss.length || dup ? ST.F : ST.P, miss.length ? `연결 안 된 포트 ${miss.length}개: ${miss.slice(0, 4).join(', ')}` : dup ? `중복 연결 ${dup}` : `${opPorts.length}개 포트, ${c.onets.length}개 광 넷`);
    add('Connectivity', '포트 종류 (광↔광, 전기↔패드)', kinds ? ST.P : ST.F, kinds ? '광 넷은 광 포트끼리만 연결' : '광 넷에 광 포트가 아닌 끝점');
    // lane trace: every output reaches back to an input through splitters
    const back = new Map(c.onets.map((n) => [n.to, n.from])), lanesOK = [];
    for (let i = 0; i < LANES; i++) { let ep = `OUT${i}.in`, hops = 0, okL = false; while (back.has(ep) && hops < 20) { const f = back.get(ep), id = f.split('.')[0]; hops++; if (id.startsWith('IN')) { okL = true; break; } const I = c.I(id); ep = `${id}.in`; if (!I) break; } lanesOK.push(okL); }
    const nOK = lanesOK.filter(Boolean).length;
    add('Connectivity', `레인 수 = ${LANES} (입력 → 변조기 → 출력)`, nOK === LANES ? ST.P : ST.F, `${nOK}/${LANES} 레인이 입력 광섬유까지 이어짐`);
    const nIn = c.inst.filter((x) => x.role === 'input').length, nOut = c.inst.filter((x) => x.role === 'output').length;
    add('Connectivity', '입·출력 일관성', nIn === c.nL && nOut === LANES ? ST.P : ST.F, `입력 ${nIn} (레이저 ${c.nL}개, 1:${c.N}) · 출력 ${nOut}`);
    const eports = c.inst.flatMap((I) => I.ports.filter((p) => p.k === 'rf' || p.k === 'dc').map((p) => `${I.id}.${p.n}`)), emapped = new Set(c.enets.map((n) => n.from));
    const emiss = eports.filter((p) => !emapped.has(p));
    if (c.pads) add('Connectivity', '전기 포트 → 패드 매핑', emiss.length ? ST.F : ST.P, emiss.length ? `패드 없는 전기 포트 ${emiss.length}개` : `${eports.length}개 전기 포트 → ${c.pads.length}개 패드${c.mod === 'mzm' ? ` + 온칩 종단 ${LANES}개 (추상)` : ''}`);
    /* geometry */
    const rmin = wgModel(pf, pf.w0).Rmin, litho = pf.mat === 'si' ? 0.15 : 0.3;
    const wlo = Math.min(pf.w0, d.wr);
    add('Geometry', `최소 선폭 (${wlo} µm ≥ ${litho} µm, 일반 리소 가정)`, wlo >= litho ? ST.P : ST.F, '게임의 rules.wmin은 MMI 테이퍼 등 다중모드 구조용 — 단일모드 배선에는 리소 한계를 적용 (Unverified Assumption)');
    const wide = (c.routes || []).filter((r) => r.ok && r.w > pf.wc + 1e-9), nar = (c.routes || []).filter((r) => r.narrow).length;
    const mmB = wide.reduce((s, r) => s + r.prims.filter((p) => p.t !== 'L').length, 0);
    add('Geometry', `넓은 배선의 굽힘 (w > w<sub>c</sub> ${pf.wc} µm)`, !wide.length ? ST.P : d.bend ? ST.W : ST.F, !wide.length ? `모든 배선이 단일모드 폭${nar ? ` (테이퍼 공간이 없는 짧은 넷 ${nar}개는 w0 유지)` : ''}` : `다중모드 폭 ${d.wr} µm 배선 ${wide.length}개, 굽힘 ${mmB}곳 — ${d.bend ? 'Euler 굽힘(곡률 연속)이라 모드 변환은 작지만 계산하지 않음' : '원호 굽힘의 곡률 점프에서 고차 모드로 변환 — Euler로 바꾸세요'}${nar ? ` · 짧은 넷 ${nar}개는 w0` : ''}`);
    add('Geometry', `최소 굽힘 반경 R ≥ ${rmin} µm (w0, 90° 방사 < 0.005 dB)`, d.R >= rmin - 1e-9 ? ST.P : ST.F, `설정 R ${d.R} µm${d.bend ? ' (Euler: R<sub>min</sub>)' : ''} · 작은 S-bend 원호 포함`);
    const failed = (c.routes || []).filter((r) => !r.ok);
    add('Geometry', '광 배선 생성', failed.length ? ST.F : ST.P, failed.length ? failed.slice(0, 3).map((r) => `${r.from}→${r.to}: ${r.why}`).join(' · ') : `${(c.routes || []).length}개 넷 모두 배선`);
    // spacing between different nets (centre-line distance − width)
    const wmax = Math.max(d.wr, pf.w0), samp = (c.routes || []).filter((r) => r.ok).map((r) => ({ r, s: sample(r.prims, 0.5) }));
    const cell = Math.max(2, wmax + pf.rules.gap) * 2, grid = new Map();
    samp.forEach((o, k) => o.s.forEach((p) => { const key = `${Math.floor(p[0] / cell)},${Math.floor(p[1] / cell)}`; if (!grid.has(key)) grid.set(key, []); grid.get(key).push([p[0], p[1], k, p[3]]); }));
    let minGap = Infinity, where = null;
    samp.forEach((o, k) => o.s.forEach((p) => { const cx = Math.floor(p[0] / cell), cy = Math.floor(p[1] / cell); for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) { const g = grid.get(`${cx + dx},${cy + dy}`); if (!g) continue; for (const q of g) { if (q[2] === k) continue; const dd = Math.hypot(q[0] - p[0], q[1] - p[1]) - (p[3] + q[3]) / 2; if (dd < minGap) { minGap = dd; where = [p[0], p[1]]; } } } }));
    // pairs that share an MMI output start s apart by the MMI's own design (its DRC is the 1-3 level's)
    add('Geometry', `배선 간격 ≥ ${pf.rules.gap} µm`, !Number.isFinite(minGap) || minGap >= pf.rules.gap - 1e-6 ? ST.P : ST.F, Number.isFinite(minGap) ? `최소 ${minGap.toFixed(3)} µm${minGap < pf.rules.gap ? ` @ (${where[0].toFixed(0)}, ${where[1].toFixed(0)})` : ''}` : `서로 다른 넷이 ${cell.toFixed(1)} µm 안에 오지 않음`, where);
    c.minGap = minGap; c.gapAt = where;
    // die boundary / overlap / obstacle
    const bbs = c.inst.map((I) => ({ I, b: c.bbox(I) }));
    const outside = bbs.filter(({ I, b }) => (I.type === 'ssc' ? b[1] < e || b[3] > H - e || b[0] < -1e-6 || b[2] > c.W + 1e-6 : b[0] < e || b[1] < e || b[2] > c.W - e || b[3] > H - e));
    add('Geometry', `다이 경계 (${(c.W / 1000).toFixed(2)} × ${(H / 1000).toFixed(2)} mm, 여유 ${e} µm)`, outside.length ? ST.F : ST.P, outside.length ? `경계 밖 ${outside.length}개: ${outside.slice(0, 3).map((x) => x.I.id).join(', ')} · 필요 약 ${(c.need.W / 1000).toFixed(2)} × ${(c.need.H / 1000).toFixed(2)} mm` : '');
    let ov = []; for (let i = 0; i < bbs.length; i++) for (let j = i + 1; j < bbs.length; j++) { const A = bbs[i].b, B = bbs[j].b; if (A[0] < B[2] - 1e-6 && B[0] < A[2] - 1e-6 && A[1] < B[3] - 1e-6 && B[1] < A[3] - 1e-6) ov.push(`${bbs[i].I.id}/${bbs[j].I.id}`); }
    add('Geometry', '소자 겹침', ov.length ? ST.F : ST.P, ov.length ? ov.slice(0, 4).join(', ') : `${bbs.length}개 소자`);
    let obst = [];
    samp.forEach((o) => { const ends = [o.r.from.split('.')[0], o.r.to.split('.')[0]]; for (const { I, b } of bbs) { if (ends.includes(I.id)) continue; if (o.s.some((p) => p[0] > b[0] + 0.5 && p[0] < b[2] - 0.5 && p[1] > b[1] + 0.5 && p[1] < b[3] - 0.5)) { obst.push(`${o.r.from}→${I.id}`); break; } } });
    add('Geometry', '배선–소자 간섭 (장애물)', obst.length ? ST.F : ST.P, obst.length ? obst.slice(0, 3).join(', ') : '');
    c.obstacles = obst;
    if (c.pads) {
      const pOut = c.pads.filter((p) => p.x - p.w / 2 < e || p.x + p.w / 2 > c.W - e || p.y - p.w / 2 < e - 1e-6 || p.y + p.w / 2 > H - e + 1e-6);
      let pov = 0; for (let i = 0; i < c.pads.length; i++) for (let j = i + 1; j < c.pads.length; j++) { const A = c.pads[i], B = c.pads[j]; const sp = (d.rf | 0) === 1 ? BUMP.pitch - BUMP.w : 10; if (Math.abs(A.x - B.x) < (A.w + B.w) / 2 + sp - 1e-6 && Math.abs(A.y - B.y) < (A.w + B.w) / 2 + sp - 1e-6) pov++; }
      add('Geometry', (d.rf | 0) === 1 ? `범프 배치 (다이 안, 간격 ≥ ${BUMP.pitch - BUMP.w} µm)` : '패드 배치 (다이 안, 간격 ≥ 10 µm)', pOut.length || pov ? ST.F : ST.P, `${c.pads.length}개 ${(d.rf | 0) === 1 ? '범프' : '패드'}${pOut.length ? ` · 경계 밖 ${pOut.length}` : ''}${pov ? ` · 겹침 ${pov}` : ''}`);
      // RF metal (lines drawn MW.rf wide + RF pads / bumps) of different nets on one layer must not touch — the GDS draws the same rectangles
      const rf = c.elines.filter((l) => l.kind === 'rf'); let cross = 0;
      const segs = (l) => l.pts.slice(1).map((p, k) => [l.pts[k], p]);
      const hit = (s, t) => { const [a, b] = s, [p, q] = t; const ax0 = Math.min(a[0], b[0]), ax1 = Math.max(a[0], b[0]), ay0 = Math.min(a[1], b[1]), ay1 = Math.max(a[1], b[1]), bx0 = Math.min(p[0], q[0]), bx1 = Math.max(p[0], q[0]), by0 = Math.min(p[1], q[1]), by1 = Math.max(p[1], q[1]); return ax0 <= bx1 + 1 && bx0 <= ax1 + 1 && ay0 <= by1 + 1 && by0 <= ay1 + 1; };
      const box = (s, h) => [Math.min(s[0][0], s[1][0]) - h, Math.min(s[0][1], s[1][1]) - h, Math.max(s[0][0], s[1][0]) + h, Math.max(s[0][1], s[1][1]) + h];
      const ov = (A, B) => A[0] < B[2] && B[0] < A[2] && A[1] < B[3] && B[1] < A[3];
      const shorts = (kind) => {   // pairs of nets whose drawn metal (lines MW[kind] wide + pads) touch on the one layer of that kind
        const ls = c.elines.filter((l) => l.kind === kind), nets = [...new Set(ls.map((l) => l.net))];
        const mt = nets.map((net) => ls.filter((l) => l.net === net).flatMap((l) => segs(l).map((s) => box(s, MW[kind] / 2))).concat(c.pads.filter((p) => p.kind === kind && p.net === net).map((p) => [p.x - p.w / 2, p.y - p.w / 2, p.x + p.w / 2, p.y + p.w / 2])));
        let n = 0; for (let i = 0; i < nets.length; i++) for (let j = i + 1; j < nets.length; j++) if (mt[i].some((A) => mt[j].some((B) => ov(A, B)))) n++;
        return n;
      };
      cross = shorts('rf');
      add('Geometry', 'RF 배선 교차 (같은 금속층)', cross ? ST.F : ST.P, cross ? `${cross}쌍 교차·접촉 (M1, 선폭 ${MW.rf} µm, 패드 포함) — 레인 엇갈림(stagger)을 늘리거나 플립칩` : `M1 선폭 ${MW.rf} µm · 패드·범프 포함`);
      const dcx = shorts('dc');
      add('Geometry', 'DC 배선 교차 (같은 금속층)', dcx ? ST.F : ST.P, dcx ? `${dcx}쌍 교차·접촉 (M2, 선폭 ${MW.dc} µm)` : `M2 한 층, 선폭 ${MW.dc} µm · 평면 팬아웃 (트랙 ${DC_TP} µm 간격${c.dcPlan ? ` × ${c.dcPlan.n}` : ''})`);
      // RF over optical waveguide crossings (information)
      const wgSeg = (c.routes || []).filter((r) => r.ok).flatMap((r) => r.prims.filter((p) => p.t === 'L').map((p) => [p.a, p.b]));
      let ox = 0; rf.forEach((l) => segs(l).forEach((s) => { ox += wgSeg.filter((t) => hit(s, t)).length; }));
      add('Geometry', 'RF 금속 – 광 도파로 교차', ox ? ST.W : ST.P, ox ? `${ox}곳 (산화막 위 금속: 광 손실·RF 결합 미계산)` : '');
    }
    /* system */
    const sys = system(c, ctx);
    add('System', `레인 속도 ${LANE_GBPS} Gb/s 라인 (${NET_GBPS}G 순 데이터, 112 GBd PAM4)`, ST.P, '모든 레인 같은 변조기');
    add('System', `총 용량 ${LANES} × ${NET_GBPS}G = 1.6 Tb/s`, nOK === LANES ? ST.P : ST.F, `${nOK}개 레인 연결`);
    add('System', '변조기 종류 ↔ 3A+ 아키텍처', sys.archMatch ? ST.P : ST.W, sys.archNote);
    add('System', '광 파워 버짓 (레이아웃 배선 손실 포함)', sys.marginLayout >= 0 ? ST.P : ST.F, `3A+ 모델 마진 ${sys.marginModel.toFixed(2)} dB − 배선 손실(최악 레인) ${sys.extra.toFixed(2)} dB = ${sys.marginLayout.toFixed(2)} dB`);
    if (c.inst.some((x) => x.role === 'modulator' && x.rfLen != null)) {
      const L = Math.max(...c.inst.filter((x) => x.role === 'modulator').map((x) => x.rfLen));
      if (c.mod === 'mzm') { const g = c.P.mzm.g, al = (0.35 + 3 / g) * Math.sqrt(56), loss = al * L * 1e-4; add('System', 'RF 급전선 손실 (56 GHz, CPW 도체 손실)', loss <= 0.5 ? ST.P : loss <= 1.5 ? ST.W : ST.F, `최장 ${L.toFixed(0)} µm → ${loss.toFixed(2)} dB (2-3 CPW 손실식, 반사·분산 미포함)`); }
      else { const lam10 = 299792458 / (56e9 * Math.sqrt((11.7 + 1) / 2)) * 1e6 / 10; add('System', '링 구동선 길이 (집중 소자 조건 ≪ λ<sub>RF</sub>/10)', L <= lam10 ? ST.P : ST.W, `최장 ${L.toFixed(0)} µm vs λ/10 = ${lam10.toFixed(0)} µm @56 GHz — 넘으면 반사·공진, 구동기를 링 옆에(플립칩)`); }
    }
    /* model validity */
    add('Model validity', 'RF 전극·급전선 전자기 해석', ST.N, 'CPW·패드·종단은 추상 형상 — EM 시뮬레이션 필요');
    add('Model validity', '레인 간 열 크로스토크 · 링 락 상호작용', ST.N, '레인 간 거리만 표시, 열해석 없음');
    add('Model validity', '파운드리 DRC (주입·금속·비아 규칙)', ST.N, '일반 규칙만: 선폭·간격·굽힘·경계·겹침');
    { const gr = ctx && ctx.gds, cur = gr ? designHash(c) : null, sm = gr && gr.summary;   // imported tools/smq2gds re-check (engine_verification.json gds_recheck)
      if (!gr) add('Model validity', 'GDS 재검사', ST.N, 'tools/smq2gds.circuit로 GDS를 만들고 다시 읽어 검사한 결과(engine_verification.json)를 Mission 6에서 불러오면 반영');
      else if (gr.design_hash !== cur) add('Model validity', 'GDS 재검사', ST.N, `불러온 결과는 다른 설계 (hash ${String(gr.design_hash).replace(/[^0-9a-f]/g, '')} ≠ 지금 ${cur}) — 다시 내보내고 GDS를 다시 만드세요`);
      else add('Model validity', 'GDS 재검사', sm.FAIL ? ST.F : ST.P, `smq2gds: PASS ${sm.PASS} · WARNING ${sm.WARNING} · FAIL ${sm.FAIL}${sm['NOT VERIFIED'] != null ? ` · NOT VERIFIED ${sm['NOT VERIFIED']}` : ''} · GDS sha1 ${String(gr.gds_sha1 || '').replace(/[^0-9a-f]/g, '').slice(0, 10)} (hash ${cur})`); }
    return { checks: out, sys };
  }

  /* ---------------- system prediction: 3A+ engine vs layout ---------------- */
  function system(c, ctx) {
    const l3 = ctx.lev('3A+'), cd = (ctx.cards || {})['3A+'], src = cd && cd.d ? { d: { ...l3.start, ...cd.d }, s: '내 3A+ 카드' } : { d: { ...l3.start, ...(ctx.des3 || l3.ref) }, s: ctx.des3 ? '3A+ 현재 설계' : '3A+ 기준 설계' };
    const dm = { ...src.d, mod: c.mod === 'mrr' ? 1 : 0, share: c.d.share | 0 };
    const r = KINDS.xcvr.evaluate(l3, dm), archMatch = (src.d.mod | 0) === (dm.mod | 0) && (src.d.share | 0) === (dm.share | 0);
    // the module model already counts SSC, coupling and splitter excess loss; the layout adds propagation + bends on chip and the tap
    const lanes = []; for (let i = 0; i < LANES; i++) {
      const rs = (c.routes || []).filter((x) => x.lane === i || (x.lane == null && false));
      // feed + tree path to lane i: follow the nets back
      let ep = `MOD${i}.in`, prop = 0; const back = new Map((c.routes || []).map((x) => [x.to, x]));
      for (let k = 0; k < 10 && back.has(ep); k++) { const x = back.get(ep); prop += x.loss_dB; ep = `${x.from.split('.')[0]}.in`; }
      const after = (c.routes || []).filter((x) => x.lane === i && (x.kind === 'out' || x.kind === 'lane')).reduce((s, x) => s + x.loss_dB, 0);
      lanes.push({ lane: i, before: prop, after, tap: c.d.mon ? -10 * Math.log10(1 - TAP) : 0, total: prop + after + (c.d.mon ? -10 * Math.log10(1 - TAP) : 0) }); void rs;
    }
    const extra = Math.max(...lanes.map((x) => x.total));
    return { r, dm, src: src.s, archMatch, archNote: archMatch ? `${src.s}와 같음 (${c.mod.toUpperCase()} ×8, 1:${c.N})` : `${src.s}: ${(src.d.mod | 0) ? 'MRR' : 'MZM'}, 1:${SH[src.d.share | 0]} ↔ Lab: ${c.mod.toUpperCase()}, 1:${c.N} — 아래 예측은 Lab 구성으로 다시 계산`,
      marginModel: r.margin, extra, marginLayout: r.margin - extra, lanes, pw: r.pw, pj: r.pj };
  }

  /* ---------------- mission states ---------------- */
  function missions(c, chk) {
    const by = (g, re) => chk.checks.filter((x) => x.group === g && (!re || re.test(x.item)));
    const noFail = (xs) => xs.every((x) => x.status !== 'FAIL');
    const sch = noFail(by('Connectivity', /광 포트|포트 종류|레인 수|입·출력/));
    const fp = noFail(by('Geometry', /다이 경계|소자 겹침/)) && noFail(by('Geometry', /패드 배치/));
    const rt = noFail(by('Geometry', /광 배선 생성|배선 간격|굽힘 반경|장애물|최소 선폭/));
    const el = noFail(by('Connectivity', /전기 포트/)) && noFail(by('Geometry', /RF 배선 교차|DC 배선 교차|패드 배치/));
    const vf = chk.checks.every((x) => x.status !== 'FAIL');
    return { schematic: sch, floorplan: fp, routing: rt, electrical: el, verification: vf };
  }

  /* ---------------- export: smq-circuit/1 ---------------- */
  // design identity of a built circuit (same as engine_layout.json design_hash)
  function designHash(c) { return layoutData(c, '').layout.design_hash; }
  function exportCircuit(c, chk, meta) {
    const { schematic, layout } = layoutData(c, (meta && meta.time) || new Date().toISOString()), pf = c.platform;
    const sys = chk.sys;
    const verification = { schema: SCHEMA + '#verification', platform: pf.id, design_hash: layout.design_hash, checks: chk.checks.map(({ group, item, status, detail }) => ({ group, item: item.replace(/<[^>]+>/g, ''), status, detail: String(detail || '').replace(/<[^>]+>/g, '') })),
      summary: ['PASS', 'WARNING', 'FAIL', 'NOT VERIFIED'].reduce((o, s) => ({ ...o, [s]: chk.checks.filter((x) => x.status === s).length }), {}),
      performance: { model: '3A+ engine (' + sys.src + ')', margin_model_dB: r4(sys.marginModel), layout_route_loss_dB_worst: r4(sys.extra), margin_with_layout_dB: r4(sys.marginLayout), module_W: r4(sys.pw), pJ_per_bit: r4(sys.pj),
        lanes: sys.lanes.map((x) => ({ lane: x.lane, before_mod_dB: r4(x.before), after_mod_dB: r4(x.after), tap_dB: r4(x.tap), total_dB: r4(x.total) })) } };
    return { schematic, layout, verification };
  }
  function layoutData(c, time) {
    const pf = c.platform, inst = c.inst.map((I) => ({ id: I.id, type: I.type, role: I.role, lane: I.lane, source: I.src, params: I.params,
      placement: { x_um: r4(I.x), y_um: r4(I.y), rot_deg: I.rot }, bbox_um: c.bbox(I).map(r4), size_um: [r4(I.L), r4(I.y1 - I.y0)],
      ports: I.ports.map((p) => { const q = c.portAbs(I, p.n); return { name: p.n, kind: p.k === 'o' || p.k === 'fib' ? 'optical' : p.k === 'int' ? 'internal' : 'electrical', sub: p.k, xy_um: [r4(q.X), r4(q.Y)], angle_deg: q.A != null ? q.A : null }; }) }));
    const base = { schema: SCHEMA, generator: 'SPEC-to-MASK Quest · PIC Design Lab', exported: time,
      platform: { id: pf.id, mat: pf.mat, lam_um: pf.lam, core_t_um: pf.t, w0_um: pf.w0, wc_um: pf.wc, clad: 'SiO2', box: 'SiO2', rules_um: pf.rules,
        route_rules: { port_width_um: pf.w0, body_width_um: Math.max(c.d.wr, pf.w0), taper: 'linear on the first / last straight (short nets stay at the port width)', bend: c.shape, R_um: c.d.R, R_min_rule_um: wgModel(pf, pf.w0).Rmin, alpha_body_dB_cm: r4(c.wm.alpha), alpha_port_dB_cm: r4(wgModel(pf, pf.w0).alpha), litho_min_width_um: pf.mat === 'si' ? 0.15 : 0.3 } },
      architecture: { name: '1.6T DR8 Tx PIC', lanes: LANES, lane_rate_gbps: LANE_GBPS, net_rate_gbps: NET_GBPS, baud_gbd: 112, format: 'PAM4', modulator: c.mod, laser_share: c.N, lasers: c.nL, splitter_depth: c.depth, monitor_pd: !!c.d.mon },
      die: { W_um: c.W, H_um: c.H, edge_um: c.d.edge, optical_io: { input: 'W', output: 'E', fiber_pitch_um: c.d.fp }, electrical_io: (c.d.rf | 0) === 1 ? { type: 'flip-chip bumps (abstract)', side: 'local' } : { type: 'edge wire-bond pads (abstract)', rf_side: (c.d.rfSide | 0) === 0 ? 'N' : 'S', dc_side: (c.d.rfSide | 0) === 0 ? 'S' : 'N', pad_pitch_um: c.d.pp, pad_um: PAD.w }, lane_pitch_um: c.d.P, lane_stagger_um: c.d.stag },
      instances: inst };
    const schematic = { ...base, nets: { optical: c.onets, electrical: c.enets } };
    const fnv = (str) => { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, '0'); };
    const layout = { ...base, nets: { optical: c.onets, electrical: c.enets },
      routing: { optical: (c.routes || []).map((r) => ({ net: r.net, from: r.from, to: r.to, lane: r.lane, ok: r.ok, reason: r.why || null, body_width_um: r.w, length_um: r4(r.length_um), loss_dB: r4(r.loss_dB), prims: r.prims.map((p) => JSON.parse(JSON.stringify(p, (k, v) => (typeof v === 'number' ? r4(v) : v)))) })),
        electrical: (c.elines || []).map((l) => ({ net: l.net, kind: l.kind, layer: l.layer, width_um: l.width_um, length_um: r4(l.length_um), pts: l.pts.map((p) => p.map(r4)) })), pads: (c.pads || []).map((p) => ({ ...p, x: r4(p.x), y: r4(p.y) })) },
      abstraction: { implants: 'annotation layers (generic PDK)', rf_metal: 'abstract CPW / pads, not foundry RF rules', termination: 'on-chip resistor placeholder', not_tape_out_ready: true } };
    // design identity: hash of the layout content (without the export time); the GDS backend echoes it so the Lab can tell
    // whether a GDS re-check belongs to the design on screen
    const hash = fnv(JSON.stringify({ ...layout, exported: '' }));
    layout.design_hash = hash; schematic.design_hash = hash;
    return { schematic, layout };
  }

  return { SCHEMA, LANES, SH, SW, GW, MW, DC_TP, parts, wgModel, defaults, laneBox, stagAuto, minDie, build, checks, missions, system, exportCircuit, designHash, sample, sBend, jogRoute, routeLoss, primLen, a0Of, PAD, BUMP, tapLen };
})();
if (typeof module !== 'undefined') module.exports = LAB;
