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
  { // geometry is deterministic (same design → same export)
    const a = JSON.stringify(L.exportCircuit(L.build(ctx, d0), L.checks(L.build(ctx, d0), ctx), { time: 'T' }).layout), b = JSON.stringify(L.exportCircuit(L.build(ctx, d0), L.checks(L.build(ctx, d0), ctx), { time: 'T' }).layout);
    ok(a === b, `${pid}: layout export is deterministic`); }
}
console.log(`${n - fail}/${n} checks passed`);
process.exit(fail ? 1 : 0);
