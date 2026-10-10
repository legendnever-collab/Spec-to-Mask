// Engine checks for the MRR WDM8 transmitter (3W, src/kinds/wdm.js, Phase E). node test/t_wdm.js   (V=1 for every line)
//   grid / FSR: FSR = λ²/(n_g·2πR_lay); a ring's next order on another channel (alias) costs that channel; interleaved FSRs are allowed
//   crosstalk : wider spacing → less modulation crosstalk on the next channel; adjacent rings take more through loss than distant ones
//   locking   : red-only heaters; same radius ≥ stepped radius ≥ stepped + cyclic (barrel) assignment; with 8Δλ = m·FSR the barrel
//               leaves each ring at most about one channel spacing; thermal crosstalk solve; hops when neighbours overshoot
//   source    : comb edge lines are the worst channels by ~TILT; DFB equalisation makes the margins equal at the same optical power
//   bus       : Si TPA grows with the total bus power, none on SiN; layout radii stepped on the 1-nm grid
//   specs     : every other level's specs untouched (Phase D baseline); the reference design is inside ★★ and its Fab yield reaches the target
const load = require('./load.js');
const G = load();
let fail = 0, n = 0;
const ok = (c, msg) => { n++; if (!c) { fail++; console.log('  FAIL', msg); } else if (process.env.V) console.log('  ok', msg); };
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const K = G.KINDS.wdm, X = K._x;
// baseline = Phase D main (ad7188f); a missing baseline fails (test/baseline.js)
const BL = require('./baseline.js'), bsrc = BL.need('ad7188f', 'src/data/pspec.json'), base = bsrc ? JSON.parse(bsrc) : null, ID = BL.identity('test:wdm spec identity', 'ad7188f', Object.keys(G.PLATFORMS).length);
for (const pid of Object.keys(G.PLATFORMS)) {
  const pf = G.PLATFORMS[pid], S = G.PSPEC[pid];
  const LV = (id) => ({ ...G.LEVELS.find((x) => x.id === id), ...S[id], pf });
  G.GAME_LEV = LV; G.PQ.setPlatform(pf.mat, pf.t, pf.rules);
  const l = LV('3W'), ref = l.ref, ev = (d) => K.evaluate(l, { ...ref, ...d });
  ok(!!S['3W'] && l.kind === 'wdm' && l.stage === 3, `${pid}: level 3W in Stage 3 with calibrated specs`);
  /* spec identity of the other Stage 3 levels (3A from the original baseline, 3A+ apart from the Phase B mod key) */
  if (base) {
    const other = Object.keys(base[pid]).filter((k) => JSON.stringify(S[k]) !== JSON.stringify(base[pid][k]));
    ID.hit(); ok(!!base[pid] && !other.length && Object.keys(S).filter((k) => !(k in base[pid])).join() === '3W', `${pid}: every other level's specs unchanged (Phase D baseline), only 3W added${other.length ? ' — changed: ' + other.join(',') : ''}`);
  }
  /* FSR */
  const r0 = ev({}), c = r0.ch[0].o.c, fsrF = pf.lam * pf.lam / (c.x.ng * 2 * Math.PI * r0.Rlay);
  ok(Math.abs(r0.fsr - fsrF) < 1e-6 * fsrF, `${pid}: FSR ${(r0.fsr * 1e3).toFixed(3)} nm = λ²/(n_g·2πR) with R_lay ${r0.Rlay} µm`);
  /* alias: scan R at the 400 GHz grid for an aliased and a clean design */
  {
    let al = null, cl = null;
    for (let R = 3; R <= 12; R += 0.1) { const r = ev({ grid: 1, R: +R.toFixed(2), rad: 1, asg: 1 }); if (r.aliased.length && (!al || r.aliased[0].alias < al.aliased[0].alias)) al = r; if (!r.aliased.length && r.QL > 3000 && (!cl || r.margin > cl.margin)) cl = r; }
    ok(al && cl && al.margin < cl.margin - 1 && al.aliased.some((x) => x.xtp > 1 || x.through > 0.5), `${pid}: FSR alias at R ${al && al.d.R} µm (next order ${al && (al.aliased[0].alias * 1e3).toFixed(2)} nm from λ${al && al.aliased[0].j}) costs ${al && cl ? (cl.margin - al.margin).toFixed(1) : '?'} dB vs the best clean 400 GHz design`);
  }
  /* crosstalk vs channel spacing (one ring, offsets of the three grids — all well inside FSR/2) and through loss vs ring distance */
  {
    const r = ev({}), cc = r.ch[3].o.c, own = X.resp(cc, 0), m = Math.abs(own[3] - own[0]);
    const offs = X.GRID.map((f) => pf.lam * pf.lam * f * 1e9 / 2.998e14), eps = offs.map((o) => Math.max(...[o, -o].map((oo) => { const t = X.resp(cc, oo); return Math.abs(t[3] - t[0]) / m; })));   // both neighbours (shift and junction loss add on one side, cancel on the other)
    ok(offs[2] < r.fsr / 2 && eps[0] > eps[1] && eps[1] > eps[2], `${pid}: a ring's modulation seen by the next channel falls with the spacing: ${eps.map((x) => (x * 100).toFixed(3) + '%').join(' > ')} (200/400/800 GHz)`);
    const rg = ev({ grid: 0 }), cs = rg.ch.map((x) => x.o.c), il = (k, j) => -10 * Math.log10(X.resp(cs[k], (j - k) * rg.dl).reduce((a, b) => a + b, 0) / 4);
    ok(il(3, 4) > il(0, 4) && il(3, 4) > 0 && il(0, 4) >= 0, `${pid}: through loss of the adjacent ring ${il(3, 4).toFixed(3)} dB > distant ring ${il(0, 4).toFixed(4)} dB`);
  }
  /* locking: radius placement × assignment */
  {
    const h = (rad, asg) => ev({ rad, asg }).H;
    const a = h(0, 0), b = h(1, 0), cc = h(1, 1);
    ok(a.tot > b.tot && b.tot > cc.tot, `${pid}: tuning power same/fixed ${a.tot.toFixed(1)} > stepped/fixed ${b.tot.toFixed(1)} > stepped/barrel ${cc.tot.toFixed(1)} mW`);
    const r = ev({ rad: 1, asg: 1 }), m = Math.round(r.span / r.fsr), mis = Math.abs(r.span - m * r.fsr), bound = (r.dl + mis + 0.0002) / r.eff;
    ok(r.H.max <= bound + 1e-9, `${pid}: barrel + stepped: every ring ≤ (Δλ + |8Δλ − ${m}·FSR|)/η = ${bound.toFixed(2)} mW (max ${r.H.max.toFixed(2)})`);
    const rf = ev({ rad: 1, asg: 0 }), cold = rf.H.rows[0].tot, hot = rf.H.rows[rf.H.rows.length - 1].tot;
    ok(cold > hot, `${pid}: fixed assignment pays the cold-case drift: ${cold.toFixed(1)} mW at 0 °C vs ${hot.toFixed(1)} mW at 70 °C`);
  }
  /* thermal crosstalk solve */
  {
    const need = [1, 2, 3, 4, 5, 6, 7, 8].map((v) => v * 1e-3), Z = need.map(() => need.map(() => 0)), eff = 0.5e-3, fsr = 10e-3;
    const s0 = X.lockSolve(need, eff, Z, fsr);
    ok(s0.P.every((p, k) => Math.abs(p - need[k] / eff) < 1e-9) && !s0.hops, `${pid}: no coupling → P = need/η`);
    const K1 = need.map((_, j) => need.map((_, k) => (j === k ? 0 : Math.abs(j - k) === 1 ? 0.05 : 0))), s1 = X.lockSolve(need, eff, K1, fsr);
    const res = s1.P.map((p, j) => eff * (p + K1[j].reduce((a, kk, k) => a + kk * s1.P[k], 0)) - need[j]);
    ok(s1.tot < s0.tot && !s1.hops && res.every((x) => Math.abs(x) < 1e-9), `${pid}: 5 % neighbour coupling: shifts exact, shared heat lowers the total ${s0.tot.toFixed(1)} → ${s1.tot.toFixed(1)} mW`);
    const need2 = [0.1, 6, 0.1, 6, 0.1, 6, 0.1, 6].map((v) => v * 1e-3), K2 = need.map((_, j) => need.map((_, k) => (j === k ? 0 : Math.abs(j - k) === 1 ? 0.2 : 0))), s2 = X.lockSolve(need2, eff, K2, fsr);
    ok(s2.hops > 0 && s2.P.every((p) => p >= 0), `${pid}: strong coupling pushes small-need rings past their target → ${s2.hops} hops to the next order, heaters stay ≥ 0`);
    ok(r0.kap1 > 0 && r0.kap1 < 0.2 && X.kappa(c, 10) > X.kappa(c, 40), `${pid}: 2-1 profile coupling κ(10 µm) ${(X.kappa(c, 10) * 100).toFixed(1)} % > κ(40 µm) ${(X.kappa(c, 40) * 100).toFixed(1)} %`);
  }
  /* source: comb tilt, DFB equalisation */
  {
    const rc = ev({ src: 0 }), mid = (rc.ch[3].margin + rc.ch[4].margin) / 2, edge = Math.min(rc.ch[0].margin, rc.ch[7].margin);
    ok([0, 7].includes(rc.worst.j) && Math.abs(mid - edge - X.TILT) < 0.8, `${pid}: comb edge lines are the worst channels (centre − edge ${(mid - edge).toFixed(2)} dB, tilt ${X.TILT} dB)`);
    const rd = ev({ src: 1 }), ms = rd.ch.map((x) => x.margin), opt = rd.Pline.reduce((s, v) => s + Math.pow(10, v / 10), 0);
    ok(Math.max(...ms) - Math.min(...ms) < 0.1 && Math.abs(opt / (8 * Math.pow(10, ref.P / 10)) - 1) < 0.02, `${pid}: DFB trimming equalises the channels (spread ${(Math.max(...ms) - Math.min(...ms)).toFixed(3)} dB) at the same total optical power`);
  }
  /* bus TPA, layout radii */
  {
    const lo = ev({ P: 8 }), hi = ev({ P: 14 });
    ok(pf.mat === 'si' ? hi.tpa > 10 * lo.tpa && hi.tpa > 0.1 : hi.tpa === 0 && lo.tpa === 0, `${pid}: bus TPA ${lo.tpa.toFixed(3)} → ${hi.tpa.toFixed(3)} dB (8 → 14 dBm per line)${pf.mat === 'si' ? '' : ' — SiN bus, none'}`);
    const st = ev({ rad: 1 }).Rk, sm = ev({ rad: 0 }).Rk, g1 = (v) => Math.abs(v * 1000 - Math.round(v * 1000)) < 1e-6;
    ok(st.every((x, k) => g1(x.R) && (!k || x.R > st[k - 1].R)) && sm.every((x) => x.R === sm[0].R) && st.every((x) => Math.abs(x.q) < 1e-3), `${pid}: stepped radii ${st[0].R}…${st[7].R} µm on the 1-nm grid (residual ≤ ${Math.max(...st.map((x) => Math.abs(x.q * 1e3))).toFixed(3)} nm), same radius ${sm[0].R} µm`);
  }
  /* specs: reference inside ★★, Fab yield, start fails */
  {
    const r = K.evaluate(l, ref), q2 = K.q2(l, r), st = K.evaluate(l, l.start);
    ok(q2 <= 1 && K.q1(l, r) <= 1, `${pid}: reference ${JSON.stringify(ref)} is inside ★★ (margin ${r.margin.toFixed(2)} dB, ${r.pw.toFixed(2)} W, tuning ${r.H.tot.toFixed(1)} mW ≤ ${l.s2.heat})`);
    ok(K.q1(l, st) > 1, `${pid}: the start design does not reach ★ (margin ${st.margin.toFixed(2)} dB${st.aliased.length ? ', FSR alias' : ''})`);
    let p = 0, m = 0; for (const s of [11, 22, 33]) for (const die of G.makeWafer(s * 97, 1)) { m++; if (K.fabPass(l, K.evaluate(l, ref, { ...die, dt: die.dt * pf.dt / 0.006 }))) p++; }
    ok(p / m >= l.fab.y, `${pid}: Fab yield of the reference ${(p / m * 100).toFixed(0)} % ≥ target ${(l.fab.y * 100).toFixed(0)} %`);
  }
}
ok(ID.done(), 'every spec identity check ran');
console.log(`${n - fail}/${n} checks passed`);
process.exit(fail ? 1 : 0);
