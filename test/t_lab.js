// Engine checks for the PIC Design Lab (src/lab/engine.js, no DOM). node test/t_lab.js
//   schematic: 8 lanes, inputs = 8/N, splitter tree = (N−1)·(8/N) MMIs, every optical port used exactly once, lane trace to an input
//   layout:    every route starts / ends exactly on its ports with the port's heading, primitives are continuous, lengths = sampled
//              polyline, bend radius ≥ the set R, spacing ≥ the gap rule (fans never cross), die boundary / overlap / obstacle clean
//              for the auto placement, tapers keep the port width at both ends
//   infeasible: a die smaller than needed fails with the reason and the required size; R below the rule fails
//   electrical: every RF / DC port mapped to one pad, edge-pad RF lines planar, flip-chip shortens the ring drive line below λ/10
//   system:    layout loss is added to the 3A+ engine margin; widening long routes lowers it; export carries smq-circuit/1
const load = require('./load.js');
const G = load();
let fail = 0, n = 0;
const ok = (c, msg) => { n++; if (!c) { fail++; console.log('  FAIL', msg); } else if (process.env.V) console.log('  ok', msg); };
const near = (a, b, t) => Math.abs(a - b) <= t;
const L = G.LAB;
const KW = (l3) => G.KINDS.wdm.evaluate(l3, { ...l3.ref, useCard: 0 }), KR = KW;
const st = (chk, re) => chk.checks.filter((x) => re.test(x.item)).map((x) => x.status);
for (const pid of Object.keys(G.PLATFORMS)) {
  const pf = G.PLATFORMS[pid];
  const LV = (id) => { const l = G.LEVELS.find((x) => x.id === id), S = G.PSPEC[pid][id]; return { ...l, ...S, pf }; };
  G.GAME_LEV = LV; G.PQ.setPlatform(pf.mat, pf.t, pf.rules);
  const ctx = { pf, lev: LV, cards: {} };
  for (const [mod, share] of [[0, 0], [0, 1], [0, 3], [1, 0], [1, 2]]) {
    const tag = `${pid} ${mod ? 'MRR' : 'MZM'} 1:${L.SH[share]}`;
    const d = { ...L.defaults(ctx, { mod, share }), wr: pf.mat === 'si' ? 1.0 : 2.0 };
    const f = L.minDie(ctx, d); d.W = Math.ceil(f.W / 100) / 10; d.H = Math.ceil(f.H / 100) / 10;
    const c = L.build(ctx, d), chk = L.checks(c, ctx), N = L.SH[share];
    /* schematic */
    ok(c.inst.filter((x) => x.role === 'modulator').length === 8 && c.inst.filter((x) => x.role === 'output').length === 8, `${tag}: 8 modulators, 8 outputs`);
    ok(c.inst.filter((x) => x.role === 'input').length === 8 / N && c.inst.filter((x) => x.type === 'mmi1x2').length === (N - 1) * (8 / N), `${tag}: ${8 / N} inputs and ${(N - 1) * (8 / N)} splitter MMIs`);
    ok(st(chk, /광 포트 연결|포트 종류|레인 수|입·출력|전기 포트/).every((s) => s === 'PASS'), `${tag}: connectivity checks pass`);
    /* layout geometry */
    let endsOK = true, contOK = true, lenOK = true, rOK = true, wOK = true;
    for (const r of c.routes) {
      const [fi, fp] = r.from.split('.'), [ti, tp] = r.to.split('.'), A = c.portAbs(c.I(fi), fp), B = c.portAbs(c.I(ti), tp), s = L.sample(r.prims, 0.25);
      if (!r.ok) { endsOK = false; continue; }
      if (!near(s[0][0], A.X, 1e-6) || !near(s[0][1], A.Y, 1e-6) || !near(s[s.length - 1][0], B.X, 1e-6) || !near(s[s.length - 1][1], B.Y, 1e-6)) endsOK = false;
      for (let k = 1; k < r.prims.length; k++) { const a = L.sample([r.prims[k - 1]], 0.5), b = L.sample([r.prims[k]], 0.5); if (Math.hypot(a[a.length - 1][0] - b[0][0], a[a.length - 1][1] - b[0][1]) > 1e-6) contOK = false; }
      let pl = 0; for (let k = 1; k < s.length; k++) pl += Math.hypot(s[k][0] - s[k - 1][0], s[k][1] - s[k - 1][1]);
      if (!near(pl, r.length_um, 2e-3 * r.length_um + 0.05)) lenOK = false;
      if (r.prims.some((p) => (p.t === 'C' && p.R < d.R - 1e-9) || (p.t === 'A' && p.r < d.R - 1e-9))) rOK = false;
      if (!near(s[0][3], pf.w0, 1e-9) || !near(s[s.length - 1][3], pf.w0, 1e-9)) wOK = false;
    }
    ok(endsOK, `${tag}: every route starts and ends exactly on its ports`);
    ok(contOK, `${tag}: route primitives are continuous`);
    ok(lenOK, `${tag}: route length = sampled polyline length`);
    ok(rOK, `${tag}: no bend tighter than R = ${d.R} µm`);
    ok(wOK, `${tag}: routes have the port width at both ends (tapers inside)`);
    ok(st(chk, /광 배선 생성|배선 간격|굽힘 반경|다이 경계|소자 겹침|장애물|최소 선폭/).every((s) => s === 'PASS'), `${tag}: auto placement on the fitted die ${d.W}×${d.H} mm passes routing / spacing / boundary / overlap (min gap ${c.minGap.toFixed(2)} µm)`);
    const M = L.missions(c, chk);
    ok(M.schematic && M.floorplan && M.routing && M.electrical, `${tag}: missions 1–4 complete`);
    /* electrical */
    ok(c.enets.filter((e) => e.kind !== 'rf_term').every((e) => c.pads.some((p) => `pad:${p.id}` === e.to)) && new Set(c.pads.map((p) => p.id)).size === c.pads.length, `${tag}: every electrical net ends on its own pad (${c.pads.length})`);
    ok(st(chk, /RF 배선 교차/)[0] === 'PASS', `${tag}: edge-pad RF lines are planar with the lane stagger ${d.stag} µm`);
    /* system */
    const sys = chk.sys, r3 = G.KINDS.xcvr.evaluate(LV('3A+'), { ...LV('3A+').ref, mod, share });
    ok(near(sys.marginModel, r3.margin, 1e-9) && near(sys.marginLayout, r3.margin - sys.extra, 1e-9) && sys.extra > 0, `${tag}: layout margin = 3A+ margin ${r3.margin.toFixed(2)} − layout loss ${sys.extra.toFixed(2)} dB`);
    /* export */
    const ex = L.exportCircuit(c, chk, { time: 'T' });
    ok(ex.schematic.schema === 'smq-circuit/1' && ex.layout.routing.optical.length === c.routes.length && ex.layout.instances.length === c.inst.length && ex.verification.summary.FAIL === chk.checks.filter((x) => x.status === 'FAIL').length && ex.layout.abstraction.not_tape_out_ready, `${tag}: smq-circuit/1 export (schematic, layout prims, verification)`);
    /* Phase D: what the GDS backend draws */
    { const g1 = (v) => Math.abs(v * 1000 - Math.round(v * 1000)) < 1e-6;
      ok(c.inst.every((I) => g1(I.x) && g1(I.y) && I.ports.every((q) => g1(q.x) && g1(q.y))), `${tag}: placements and local ports on the 1 nm GDS grid`);
      let lc = true, lp = true;
      c.inst.filter((I) => I.params.local && I.params.local.prims.length).forEach((I) => {
        const pr = I.params.local.prims, by = {}; pr.forEach((p) => { (by[p.layer || 'core'] = by[p.layer || 'core'] || []).push(p); });
        const ends = []; Object.values(by).forEach((ps) => { let chain = [ps[0]]; for (let k = 1; k < ps.length; k++) { const a = L.sample([ps[k - 1]], 1), b = L.sample([ps[k]], 1), j = Math.hypot(a[a.length - 1][0] - b[0][0], a[a.length - 1][1] - b[0][1]); if (j > 1e-6 && j < 1e-3) lc = false; if (j > 1e-6) { ends.push(chain); chain = []; } chain.push(ps[k]); } ends.push(chain); });
        if (I.type === 'mzm') { const m = c.P.mmi, ss = I.params.mmi.s_um / 2, want = [[m.Ltot, ss], [m.Ltot, -ss], [I.L - m.Ltot, ss], [I.L - m.Ltot, -ss]], pts = ends.flatMap((ch) => { const a = L.sample([ch[0]], 1), b = L.sample([ch[ch.length - 1]], 1); return [a[0], b[b.length - 1]]; }); if (!want.every((w) => pts.some((q) => Math.hypot(q[0] - w[0], q[1] - w[1]) < 1e-6))) lp = false; }
        if (I.type === 'tap_pd' || I.type === 'mrr') { const io = I.ports.filter((q) => q.k === 'o'), pts = pr.flatMap((p) => { const a = L.sample([p], 1); return [a[0], a[a.length - 1]]; }); if (!io.every((q) => pts.some((r) => Math.hypot(r[0] - q.x, r[1] - q.y) < 1e-6))) lp = false; }
      });
      ok(lc && lp, `${tag}: device-local primitives (MZM arms, tap, ring transitions) are continuous and meet the MMI / instance ports`);
      ok(ex.layout.routing.electrical.every((l) => l.width_um === L.MW[l.kind]) && ex.layout.design_hash === L.designHash(c) && /^[0-9a-f]{8}$/.test(ex.layout.design_hash), `${tag}: export carries metal widths and design_hash ${ex.layout.design_hash}`);
      ok(st(chk, /DC 배선 교차/)[0] === 'PASS', `${tag}: DC fan-out is planar on one metal layer`); }
    if (mod === 1) { const ring = ex.layout.instances.find((x) => x.type === 'mrr'); ok(ring && ring.params.ring.pcell === 'ring_allpass' && near(ring.params.ring.R_um, L.parts(ctx).mrr.R, 1e-12), `${tag}: ring instances carry the 2-3R layout radius ${ring && ring.params.ring.R_um} µm`); }
  }
  /* infeasible / rule violations */
  const d0 = L.defaults(ctx, { mod: 0, share: 0 });
  { const c = L.build(ctx, { ...d0, W: 1.5 }), chk = L.checks(c, ctx), b = chk.checks.find((x) => /다이 경계/.test(x.item));
    ok(b.status === 'FAIL' && /필요 약/.test(b.detail) && !L.missions(c, chk).floorplan, `${pid}: 1.5 mm die → Infeasible with the required size (${b.detail.replace(/<[^>]+>/g, '').slice(0, 60)})`); }
  { const Rr = L.wgModel(pf, pf.w0).Rmin, c = L.build(ctx, { ...d0, R: Rr * 0.5 }), chk = L.checks(c, ctx);
    ok(st(chk, /굽힘 반경/)[0] === 'FAIL', `${pid}: R = ${Rr * 0.5} µm below the rule ${Rr} µm fails`); }
  { const c = L.build(ctx, { ...d0, stag: 0 }), chk = L.checks(c, ctx);
    ok(st(chk, /RF 배선 교차/)[0] === 'FAIL', `${pid}: TW-MZM edge pads without the lane stagger cross RF lines`); }
  { // widening long routes lowers the layout loss (Si: strongly; SiN: little, already low-loss)
    const c1 = L.build(ctx, { ...d0, wr: pf.w0 }), c2 = L.build(ctx, { ...d0, wr: pf.mat === 'si' ? 1.0 : 2.0, W: d0.W + 0.5 }), k1 = L.checks(c1, ctx), k2 = L.checks(c2, ctx);
    ok(k2.sys.extra < k1.sys.extra, `${pid}: wide routes ${k1.sys.extra.toFixed(2)} → ${k2.sys.extra.toFixed(2)} dB layout loss`); }
  { // MRR: edge pads violate the lumped-element condition, flip-chip fixes it and shrinks the die
    const dm = L.defaults(ctx, { mod: 1, share: 0 }), ce = L.build(ctx, dm), ke = L.checks(ce, ctx);
    const df = { ...dm, rf: 1 }; df.stag = L.stagAuto(df); const ff = L.minDie(ctx, df); df.W = Math.ceil(ff.W / 100) / 10; df.H = Math.ceil(ff.H / 100) / 10;
    const cf = L.build(ctx, df), kf = L.checks(cf, ctx);
    ok(st(ke, /링 구동선/)[0] === 'WARNING' && st(kf, /링 구동선/)[0] === 'PASS' && df.W * df.H < dm.W * dm.H, `${pid}: ring drive line ${Math.max(...ce.inst.filter((x) => x.rfLen != null).map((x) => x.rfLen)).toFixed(0)} µm (edge) → ${Math.max(...cf.inst.filter((x) => x.rfLen != null).map((x) => x.rfLen)).toFixed(0)} µm (flip-chip), die ${dm.W}×${dm.H} → ${df.W}×${df.H} mm`);
    ok(st(kf, /범프 배치|광 배선 생성|배선 간격|다이 경계|소자 겹침/).every((s) => s === 'PASS'), `${pid}: flip-chip MRR layout is clean`); }
  { // Phase D: imported GDS re-check (engine_verification.json gds_recheck) → GDS 재검사 PASS / FAIL / stale
    const c = L.build(ctx, d0), h = L.designHash(c), gi = (gds) => L.checks(c, { ...ctx, gds }).checks.find((x) => x.item === 'GDS 재검사');
    const sm = { PASS: 17, WARNING: 1, FAIL: 0, 'NOT VERIFIED': 1 };
    ok(gi(null).status === 'NOT VERIFIED' && gi({ design_hash: h, summary: sm, gds_sha1: 'ab' }).status === 'PASS' && gi({ design_hash: h, summary: { ...sm, FAIL: 2 } }).status === 'FAIL' && gi({ design_hash: 'deadbeef', summary: sm }).status === 'NOT VERIFIED',
      `${pid}: GDS 재검사 = NOT VERIFIED until imported, PASS / FAIL for this design's hash, NOT VERIFIED for another design`);
    const c2 = L.build(ctx, { ...d0, W: d0.W + 0.1 }); ok(L.designHash(c2) !== h, `${pid}: design hash changes with the design`); }
  { // DC fan-out stays planar over staggers, route widths, pad styles and architectures
    let bad = [];
    for (const mod of [0, 1]) for (const rf of [0, 1]) for (const wr of [pf.w0, pf.mat === 'si' ? 1 : 2]) for (const ds of [0, 7, 13, 111]) {
      if (rf === 1 && ds) continue;
      const d = { ...L.defaults(ctx, { mod, share: 0 }), rf, wr }; d.stag = L.stagAuto(d) + ds; const f = L.minDie(ctx, d); d.W = Math.ceil(f.W / 100) / 10; d.H = Math.ceil(f.H / 100) / 10;
      const k = L.checks(L.build(ctx, d), ctx); if (st(k, /DC 배선 교차|RF 배선 교차|범프 배치|패드 배치/).some((x) => x !== 'PASS')) bad.push(`${mod}/${rf}/${wr}/${d.stag}`);
    }
    ok(!bad.length, `${pid}: DC river fan-out and RF metal planar in 24 variants${bad.length ? ' — ' + bad.join(', ') : ''}`); }
  { // Phase E: WDM8 shared bus (3W reference design) — one input, one bus with eight rings, one output, flip-chip
    const d = { ...L.defaults(ctx, { mod: 2, share: 0 }), wr: pf.mat === 'si' ? 1.0 : 2.0 }, f = L.minDie(ctx, d); d.W = Math.ceil(f.W / 100) / 10; d.H = Math.ceil(f.H / 100) / 10;
    const c = L.build(ctx, d), chk = L.checks(c, ctx), M = L.missions(c, chk), B = c.I('BUS'), g = B.geom, l3 = LV('3W');
    ok(c.mod === 'wdm' && c.inst.filter((x) => x.role === 'input').length === 1 && c.inst.filter((x) => x.role === 'output').length === 1 && B.params.rings.length === 8 && st(chk, /채널 수|입·출력/).every((x) => x === 'PASS'), `${pid} WDM8: 1 input → bus with 8 rings → 1 output`);
    ok(M.schematic && M.floorplan && M.routing && M.electrical && M.verification, `${pid} WDM8: missions 1–5 complete on the fitted die ${d.W}×${d.H} mm (${chk.checks.filter((x) => x.status === 'FAIL').map((x) => x.item).join(', ') || 'no FAIL'})`);
    const rk = KR(l3), Rk = rk.Rk.map((x) => x.R);
    ok(JSON.stringify(B.params.rings.map((x) => x.R_um)) === JSON.stringify(Rk) && Math.abs(g.p - l3.ref.pitch) < 1e-9 && B.params.radii === ((l3.ref.rad | 0) ? 'stepped' : 'same'), `${pid} WDM8: ring radii ${Rk[0]}…${Rk[7]} µm and pitch ${g.p} µm are the 3W design's`);
    // the bus is continuous: transitions + fillers + ring-cell buses tile [0, L] without gaps or overlaps
    const segs = g.local.prims.filter((p) => p.layer === 'si' || !g.het).map((p) => [Math.min(p.a[0], p.b[0]), Math.max(p.a[0], p.b[0])]).concat(B.params.rings.map((rg, k) => [g.xs[k] - rg.bus_len_um / 2, g.xs[k] + rg.bus_len_um / 2])).sort((a, b) => a[0] - b[0]);
    let cont = Math.abs(segs[0][0]) < 1e-6 && Math.abs(segs[segs.length - 1][1] - g.L) < 1e-6; for (let k = 1; k < segs.length; k++) if (Math.abs(segs[k][0] - segs[k - 1][1]) > 1e-6) cont = false;
    ok(cont, `${pid} WDM8: Si bus tiles 0…${g.L} µm (end transitions, ${segs.length - 8 - (g.Lt ? 2 : 0)} fillers, 8 ring cells)`);
    const sys = chk.sys, rr = KW(l3);
    ok(Math.abs(sys.marginModel - rr.margin) < 1e-9 && Math.abs(sys.marginLayout - (rr.margin - sys.extra)) < 1e-9 && sys.extra > 0, `${pid} WDM8: layout margin = 3W margin ${rr.margin.toFixed(2)} − layout loss ${sys.extra.toFixed(2)} dB`);
    ok(st(chk, /RF 배선 교차|DC 배선 교차|범프 배치|링 간격/).every((x) => x === 'PASS') && c.pads.length === 2 * 8 + 2 * 8 + (d.mon ? 2 : 0), `${pid} WDM8: ${c.pads.length} bumps (S/G per ring + 16 heater${d.mon ? ' + 2 PD' : ''}), RF / DC planar`);
    const d2 = { ...d, rp: Math.floor(g.pmin) - 1 }, k2 = L.checks(L.build(ctx, d2), ctx);
    ok(st(k2, /링 간격/)[0] === 'FAIL', `${pid} WDM8: ring pitch ${d2.rp} µm < ring cell ${g.pmin.toFixed(1)} µm fails`);
    const ex = L.exportCircuit(c, chk, { time: 'T' }), bi = ex.layout.instances.find((x) => x.type === 'mrr_wdm');
    ok(ex.layout.architecture.outputs === 1 && ex.layout.architecture.wdm.channels === 8 && bi && bi.params.local.ring_x_um.length === 8 && ex.layout.design_hash === L.designHash(c), `${pid} WDM8: export (architecture.wdm, mrr_wdm instance with ring positions, design hash)`);
  }
  { // geometry is deterministic (same design → same export)
    const a = JSON.stringify(L.exportCircuit(L.build(ctx, d0), L.checks(L.build(ctx, d0), ctx), { time: 'T' }).layout), b = JSON.stringify(L.exportCircuit(L.build(ctx, d0), L.checks(L.build(ctx, d0), ctx), { time: 'T' }).layout);
    ok(a === b, `${pid}: layout export is deterministic`); }
}
console.log(`${n - fail}/${n} checks passed`);
process.exit(fail ? 1 : 0);
