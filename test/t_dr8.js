// Phase B engine checks: 3A+ DR8 modulator choice (MZM ×8 / MRR ×8). node test/t_dr8.js
//   compatibility: the MZM path (mod 0 / no mod key) is bit-identical to the pre-Phase-B transceiver (commit fa9f16a); 3A / 3A+ specs
//                  equal that commit's except the new mod key in start/ref; 2×FR4 has no modulator choice
//   ring in the module: optics = the 2-3R engine at the module's modulator input power (grid interpolation error small);
//                  heater with a TEC-held laser = the 2-3R heater at 13 dBm; uncooled DFB co-drift shrinks the heater swing to
//                  |dλ_DFB/dT − dλ_ring/dT|·ΔT; less input power → less self-heating → more heater; linear process sensitivity
//                  matches the full model; red-side thermal runaway fails the level; driver = MZM driver − load-energy difference
//   system: the comparison panel shows both sides; MRR DR8 reaches ★ and ★★ against the unchanged specs; Fab Run stays fast;
//           the player's 2-3R card is used when cards are on
const load = require('./load.js'), path = require('path'), cp = require('child_process'), vm = require('vm');
const G = load();
let fail = 0, n = 0;
const ok = (c, msg) => { n++; if (!c) { fail++; console.log('  FAIL', msg); } else if (process.env.V) console.log('  ok', msg); };
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const LV = (id, pid, P) => { const L = G.LEVELS.find((x) => x.id === id), S = (P || G.PSPEC)[pid][id]; return { ...L, ...S, pf: G.PLATFORMS[pid] }; };
G.GAME_LEV = (id) => LV(id, G.__pid);
const K = G.KINDS.xcvr, X = K._x, M = G.KINDS.mrr._x;
const BASE = 'fa9f16a';
const BL = require('./baseline.js'), ID = BL.identity('test:dr8 MZM path + specs', BASE, 12);   // a missing baseline fails (test/baseline.js)
const oldX = BL.need(BASE, 'src/kinds/xcvr.js'), oldP = BL.need(BASE, 'src/data/pspec.json');
let G0 = null;
if (oldX) { G0 = load(); vm.runInContext(oldX.replace(/^const (\w+) =/gm, 'var $1 ='), G0); G0.GAME_LEV = (id) => LV(id, G.__pid); }
const P0 = oldP ? JSON.parse(oldP) : null;
const strip = (o) => { const c = { ...o }; delete c.mod; return c; };

for (const pid of Object.keys(G.PLATFORMS)) {
  G.__pid = pid;
  const l = LV('3A+', pid), pf = l.pf; G.PQ.setPlatform(pf.mat, pf.t, pf.rules);
  /* ---- compatibility ---- */
  if (P0) for (const id of ['3A', '3A+']) {
    const a = { ...G.PSPEC[pid][id], start: strip(G.PSPEC[pid][id].start), ref: strip(G.PSPEC[pid][id].ref) };
    ID.hit(); ok(JSON.stringify(a) === JSON.stringify(P0[pid][id]), `${pid} ${id}: specs equal ${BASE} (apart from the mod key)`);
  }
  ok(!K.params(LV('3A', pid)).some((p) => p.k === 'mod') && K.params(l).some((p) => p.k === 'mod'), `${pid}: modulator choice only in DR8 (3A+)`);
  if (G0) {
    const r = G.mulberry(7), ds = [l.ref, l.start];
    for (let i = 0; i < 12; i++) ds.push({ P: 10 + Math.round(r() * 20) / 2, share: (r() * 4) | 0, tc: (r() * 2) | 0, pkg: (r() * 3) | 0, useCard: 0 });
    const dies = G.makeWafer(11 * 97, 1).slice(0, 6);
    let same = true;
    for (const d of ds) for (const proc of [null, ...dies]) {
      const a = K.evaluate(l, { ...d, mod: 0 }, proc), b = G0.KINDS.xcvr.evaluate(l, strip(d), proc), c = K.evaluate(l, strip(d), proc);
      if (a.margin !== b.margin || a.pw !== b.pw || c.margin !== b.margin || c.pw !== b.pw || K.fabPass(l, a) !== G0.KINDS.xcvr.fabPass(l, b)) same = false;
    }
    const lf = LV('3A', pid); for (const d of [lf.ref, lf.start]) { const a = K.evaluate(lf, d), b = G0.KINDS.xcvr.evaluate(lf, d); if (a.margin !== b.margin || a.pw !== b.pw) same = false; }
    ID.hit(); ok(same, `${pid}: MZM DR8 and 2×FR4 results bit-identical to ${BASE} (${ds.length} designs × 7 process states)`);
  }
  /* ---- ring in the module ---- */
  const dR = { ...l.ref, mod: 1 }, rR = K.evaluate(l, dR), p = X.parts(l, dR), lr = G.GAME_LEV('2-3R');
  ok(rR.mrr && p.ring && JSON.stringify(p.ring.d) === JSON.stringify(lr.ref), `${pid}: MRR lanes use the 2-3R reference design when cards are off`);
  { // optics: grid points are the 2-3R engine itself; interpolation between them stays small
    const Pm = Math.floor(rR.worst.Pmod * 2) / 2, a = M.analyse(lr, lr.ref, null, { Pin: Pm }), o = X.ringOpt(p, Pm);
    ok(near(o.gain, a.omaDbm - Pm, 1e-9) && near(o.pen, a.pen, 1e-9) && near(o.gth, a.gth, 1e-9), `${pid}: ring optics at P_mod ${Pm} dBm = 2-3R engine (gain ${o.gain.toFixed(2)} dB, pen ${o.pen.toFixed(2)} dB)`);
    const mid = Pm + 0.25, am = M.analyse(lr, lr.ref, null, { Pin: mid }), om = X.ringOpt(p, mid);
    ok(near(om.gain, am.omaDbm - mid, 0.05) && near(om.pen, am.pen, 0.1), `${pid}: 0.5 dB grid interpolation error at ${mid} dBm: gain ${(om.gain - am.omaDbm + mid).toFixed(3)} dB, pen ${(om.pen - am.pen).toFixed(3)} dB`);
    const a13 = M.analyse(lr, lr.ref), o13 = X.ringOpt(p, 13);
    ok(near(o13.gain, a13.omaDbm - 13, 1e-9), `${pid}: at 13 dBm the module ring equals the 2-3R level result`);
  }
  { // heater: TEC-held laser at 13 dBm = the 2-3R heater; uncooled co-drift
    const T = Array.from({ length: 15 }, (_, i) => 70 * i / 14), a13 = M.analyse(lr, lr.ref);
    const hT = T.map((t) => X.ringHeat(l, p, 13, null, t, 1, 0)), hU = T.map((t) => X.ringHeat(l, p, 13, null, t, 0, 0));
    ok(near(Math.max(...hT), a13.PhW, 1e-6) && near(hT.reduce((s, v) => s + v, 0) / 15, a13.PhA, 1e-6), `${pid}: TEC laser → ring heater = 2-3R heater (worst ${a13.PhW.toFixed(2)} mW, mean ${a13.PhA.toFixed(2)} mW)`);
    const c = M.core(lr, lr.ref, { Pin: 13 }), dr = c.dldT * 1e3, dl = X.DLAS(pf), k = c.H.P2pi / (c.B.fsr * 1e3);
    const sw = (h) => Math.max(...h) - Math.min(...h), mono = (h) => h.every((v, i) => !i || Math.abs(v - h[i - 1]) < 0.5 * c.H.P2pi);
    if (mono(hT) && mono(hU)) {
      ok(near(sw(hT), dr * 70 * k, 0.02 * sw(hT)) && near(sw(hU), Math.abs(dl - dr) * 70 * k, 0.02 * Math.max(sw(hU), 0.1)), `${pid}: heater swing 0–70 °C: TEC ${sw(hT).toFixed(2)} mW (ring ${(dr * 1e3).toFixed(0)} pm/K) vs uncooled ${sw(hU).toFixed(2)} mW (|${dl * 1e3} − ${(dr * 1e3).toFixed(0)}| pm/K)`);
    }
    // less input power → less self-heating → the resonance sits bluer → more heater (away from an FSR wrap)
    const h = [9, 11, 13].map((Pin) => X.ringHeat(l, p, Pin, null, 70, 1, 0)), cs = [9, 11, 13].map((Pin) => M.core(lr, lr.ref, { Pin }).lamSelf);
    ok(cs[0] < cs[1] && cs[1] < cs[2] && (h[0] > h[1] && h[1] > h[2] || Math.max(...h) - Math.min(...h) > 0.5 * c.H.P2pi), `${pid}: self-heating shift ${cs.map((v) => (v * 1e6).toFixed(0)).join('/')} pm at 9/11/13 dBm → heater ${h.map((v) => v.toFixed(2)).join('/')} mW`);
  }
  { // process: linear sensitivity vs the full core
    const dies = G.makeWafer(22 * 97, 1).slice(0, 8), n0 = M.core(lr, lr.ref, {}).lamNat; let worst = 0, span = 0;
    for (const die of dies) { const proc = { ...die, dt: die.dt * pf.dt / 0.006 }, full = M.core(lr, lr.ref, { proc }).lamNat - n0, lin = X.procShift(p, proc); worst = Math.max(worst, Math.abs(full - lin)); span = Math.max(span, Math.abs(full)); }
    ok(worst < Math.max(0.03 * span, 20e-6), `${pid}: linear process shift error ${(worst * 1e6).toFixed(1)} pm over shifts up to ${(span * 1e3).toFixed(2)} nm`);
  }
  { // driver
    const a = K.evaluate(l, { ...l.ref, mod: 0 }), b = rR, E = X.mzmLoadE();
    ok(near(b.PW.drv - a.PW.drv, -8 * (E - b.ringH.Er * 1e-15) * 224e9, 1e-9) && b.PW.drv < a.PW.drv, `${pid}: MRR driver = MZM driver − load-energy difference (${((b.PW.drv - a.PW.drv) * 1e3).toFixed(1)} mW for 8 lanes)`);
    ok(near(b.PW.ctrl - a.PW.ctrl, 8 * X.RLOCK / 1000, 1e-12), `${pid}: ring lock adds ${X.RLOCK} mW per lane`);
    ok(near(b.PW.heat, 8 * b.ringH.max / 1000, 1e-12) && b.ringH.max <= b.ringH.P2pi + 1e-9, `${pid}: ring heaters = 8 × worst-temperature heater ≤ P_2π`);
  }
  { // red-side runaway fails the level: scan red detunings of a card ring at full laser power for the first g_th ≥ 1
    const l2 = { ...l }; let hit = null;
    for (const det of [0.3, 0.4, 0.5, 0.6, 0.8, 1.0, 1.2, 1.5]) { G.GAME_CARDS = { '2-3R': { d: { ...lr.ref, det }, model: {} } }; const r = K.evaluate(l2, { ...l.ref, P: 20, share: 0, mod: 1, useCard: 1 }); if (r.gth >= 1) { hit = { det, r }; break; } }
    G.GAME_CARDS = {};
    ok(hit && hit.r.p.src.includes('2-3R') && !hit.r.stable && K.q1(l2, hit.r) > 1 && !K.fabPass(l2, hit.r), `${pid}: red-detuned card ring (x = ${hit && hit.det}) at 20 dBm runs away (g_th ${hit ? hit.r.gth.toFixed(2) : '—'}) → no ★, no Fab pass`);
    const blue = K.evaluate(l, { ...l.ref, P: 20, share: 0, mod: 1 });
    ok(blue.stable && blue.gth < 0, `${pid}: the blue-detuned reference ring stays stable at 20 dBm (g_th ${blue.gth.toFixed(2)})`);
  }
  { // reachability against the unchanged specs
    let s1 = 0, s2 = 0; for (const share of [0, 1, 2]) for (const P of [13, 15, 17]) { const r = K.evaluate(l, { ...l.ref, P, share, pkg: 2, mod: 1 }); if (K.q1(l, r) <= 1) s1++; if (K.q2(l, r) <= 1 && K.q1(l, r) <= 1) s2++; }
    ok(s1 > 0 && s2 > 0, `${pid}: MRR DR8 reaches ★ (${s1}) and ★★ (${s2}) of 9 CPO designs`);
  }
  { // panel
    const r0 = K.evaluate(l, { ...l.ref, mod: 0 }), pa = K.panel(l, r0, { run: false }), pf4 = K.panel(LV('3A', pid), K.evaluate(LV('3A', pid), LV('3A', pid).ref), { run: false });
    ok(pa && /MZM ×8/.test(pa.html) && /MRR ×8/.test(pa.html) && /data-xp-run/.test(pa.html) && pf4 === null, `${pid}: DR8 comparison panel (2×FR4: none)`);
    const t0 = Date.now(), pr = K.panel(l, r0, { run: true }), ms = Date.now() - t0;
    ok(pr && /MZM이 유리:<\/b> (?!—)/.test(pr.html) && /MRR이 유리:<\/b> (?!—)/.test(pr.html) && /Fab 수율/.test(pr.html) && ms < 4000, `${pid}: panel with Fab yields lists advantages on both sides (${ms} ms)`);
  }
}
ok(ID.done(), 'every MZM identity check ran');
console.log(`${n - fail}/${n} checks passed` + (G0 ? '' : ` (${BASE} not available — identity NOT RUN)`));
process.exit(fail ? 1 : 0);
