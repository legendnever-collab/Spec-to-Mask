// Derive per-platform level specs (start designs, thresholds, reference designs, yield targets)
// from the same physics the game runs. Output: src/data/pspec.js
const fs = require('fs');
const G = require('../test/load')(['util.js', 'ui_util.js', 'engine_mmi.js', 'data/tables.js', 'platforms.js', 'kinds/wg.js', 'kinds/dc.js', 'kinds/mmi.js', 'kinds/ssc.js', 'kinds/cwdm.js', 'kinds/to.js', 'kinds/pn.js', 'kinds/mzm.js', 'kinds/pd.js', 'kinds/els.js', 'kinds/xcvr.js', 'kinds/spiral.js', 'kinds/ttd.js', 'kinds/chirp.js', 'kinds/fpsa.js', 'kinds/lidar.js', 'levels.js']);
const { PLATFORMS, KINDS, PQ, makeWafer, snapP, nelderMead, clamp, band } = G;
const only = process.argv[2] && process.argv[2] !== 'all' ? process.argv[2].split(',') : Object.keys(PLATFORMS);
const stages = (process.argv[3] || '1,2,3,4,5').split(','), doS1 = stages.includes('1'), doS2 = stages.includes('2'), doS3 = stages.includes('3'), doS4 = stages.includes('4'), doS5 = stages.includes('5');
let PREV = {}; try { PREV = JSON.parse(fs.readFileSync(__dirname + '/../src/data/pspec.json', 'utf8')); } catch (e) {}
const r2 = (v, k = 3) => +v.toFixed(k);
const MODES = { easy: { th: 1.5, area: 1.3, sig: 0.6 }, std: { th: 1, area: 1, sig: 1 }, hard: { th: 0.8, area: 0.85, sig: 1.25 } };
const scaleLev = (l, m) => { const M = MODES[m], hb = l.hb || [], ns = l.ns || [], sc = (o) => { const r = {}; for (const k in o) { const v = o[k]; r[k] = v == null ? v : k === 'y' || k === 'yMode' || ns.includes(k) ? v : k === 'size' ? Math.round(v * M.area) : hb.includes(k) ? v / M.th : v * M.th; } return r; }; return { ...l, s1: sc(l.s1), s2: sc(l.s2), fab: sc(l.fab) }; };
function yieldOf(K, l, d, sig, seeds = [11, 22, 33]) {
  let p = 0, n = 0;
  for (const s of seeds) for (const die of makeWafer(s * 97, sig)) { n++; const proc = { ...die, dt: die.dt * l.pf.dt / 0.006 }; if (K.fabPass(l, K.evaluate(l, d, proc))) p++; }
  return p / n;
}
function yTargets(K, l, d) {
  const out = {};
  for (const m of ['easy', 'std', 'hard']) { const lm = scaleLev(l, m), y = yieldOf(K, lm, d, MODES[m].sig); out[m] = r2(clamp(Math.floor(Math.min(y - 0.12, y * 0.75) * 20) / 20, 0.05, 0.95), 2); }
  return out;
}
const SPEC = {};
for (const pid of only) {
  const pf = PLATFORMS[pid], si = pf.mat === 'si', S = (SPEC[pid] = { ...(PREV[pid] || {}) });
  PQ.setPlatform(pf.mat, pf.t, pf.rules);
  const base = (extra) => ({ pf, ...extra });
  console.log('==', pid);

  if (doS1) {
  /* 1-1 waveguide */
  {
    const K = KINDS.wg, l0 = base({ s1: {}, s2: {}, fab: {} }), X = K._x, wc = X.wcAt(l0, 0), margin = 0.016;
    const wmax = wc - margin, win = si ? 0.04 : 0.10, wlo = wmax - win, alpha2 = X.at(l0, wlo, 0).alpha;
    const l = base({ start: { w: si ? 0.6 : 1.3 }, s1: {}, s2: { alpha: Math.ceil(alpha2 * 1000 + 0.5) / 1000, margin, wlo: r2(wlo, 3) }, fab: { alpha: Math.ceil(alpha2 * 1150 + 0.5) / 1000, y: 0.8 }, aRef: 1, dbY: [0, si ? 8 : 0.6], ns: ['alpha', 'margin', 'wlo'] });
    const d = { w: snapP(K.params(l)[0], (wlo + wmax) / 2) };
    l.fab.yMode = yTargets(K, l, d); l.fab.y = l.fab.yMode.std;
    S['1-1'] = { start: l.start, s1: l.s1, s2: l.s2, fab: l.fab, aRef: 1, dbY: l.dbY, ref: d, ns: l.ns };
    console.log(' wg wc', r2(wc), 'window', r2(wlo), '-', r2(wmax), 'alpha2', r2(alpha2), 'y', JSON.stringify(l.fab.yMode));
  }
  /* 1-2 directional coupler */
  {
    const K = KINDS.dc, X = K._x, tb = G.DCP[pid];
    const l = base({ s1: { dk: 0.05 }, s2: { dk: 0.03, dkb: 0.1, size: 1e9 }, fab: { dk: 0.05, y: 0.5 } });
    const rows = tb.gs.map((g) => { const L = X.Lpi(l, g) / 2, r = K.evaluate(l, { g, L }); return { g, L, kband: r.kband }; });
    // target: the band spec reachable only in the smaller-gap half; length budget from that gap
    const sorted = rows.slice().sort((a, b) => a.kband - b.kband), pick = rows[Math.min(2, rows.length - 1)];
    const dkb = r2(Math.max(0.03, pick.kband * 1.15), 3), size = Math.ceil(pick.L * 1.4);
    l.s2 = { dk: 0.03, dkb, size };
    const P = K.params(l), ref = { g: snapP(P[0], pick.g), L: snapP(P[1], pick.L) };
    l.fab.yMode = yTargets(K, l, ref); l.fab.y = l.fab.yMode.std;
    S['1-2'] = { start: { g: si ? 0.30 : 0.70, L: si ? 12 : 40 }, s1: l.s1, s2: l.s2, fab: l.fab, aRef: size, dbY: [0, 0.5], ref };
    console.log(' dc', rows.map((x) => `${x.g}:${r2(x.L, 1)}µm/±${r2(x.kband * 100, 1)}%`).join(' '), '| dkb', dkb, 'size', size, 'y', JSON.stringify(l.fab.yMode));
  }
  /* 1-3 .. 1-5 MMI */
  {
    const K = KINDS.mmi;
    const defs = {
      '1-3': { type: '1x2', lc: pf.lam, lams: [pf.lam], s1: { el: 0.30 }, s2el: 0.05, imb: false },
      '1-4': { type: '1x2', lc: pf.lam, lams: band(pf.bb[0], pf.bb[1], 5), s1: { el: 0.20 }, s2el: 0.08, imb: false },
      '1-5': { type: '2x2', lc: pf.lc, lams: [pf.ch[0], pf.lc, pf.ch[3]], s1: { el: 0.6, imb: 0.6 }, s2el: 0.45, s2imb: 0.3, imb: true }
    };
    for (const id of Object.keys(defs)) {
      const df = defs[id], l = base({ type: df.type, lc: df.lc, lams: df.lams, s1: df.s1, s2: { el: df.s2el, imb: df.s2imb, size: 1e9 }, fab: {}, elCap: 2 * df.s1.el, imbCap: 1.2, aRef: 1 });
      const P = K.params(l), u = pf.rules;
      // optimise q2 under a growing area budget: find the most compact design with margin
      let best = null;
      const q = (r) => (df.imb ? Math.max(r.el / df.s2el, Math.abs(r.imb) / df.s2imb) : r.el / df.s2el);
      const toDes = (x) => ({ W: snapP(P[0], x[0]), L: snapP(P[1], x[1]), wt: snapP(P[2], x[2]), s: snapP(P[3], x[3]) });
      const f = (x) => { const d = toDes(x), v = K.violation(l, d); if (v > 0) return 50 + 100 * v; const r = K.evaluate(l, d), a = d.W * d.L, sc = q(r) + 0.08 * Math.log(a); if (!best || sc < best.sc) best = { sc, d, r, a, q: q(r) }; return sc; };
      const starts = [];
      for (const W of si ? [1.8, 2.5, 3.2] : [4, 6, 8]) {
        const n1 = PQ.slabNeff(df.lc, pf.t), n0 = PQ.nOx(df.lc), We = W + (df.lc / Math.PI) / Math.sqrt(n1 * n1 - n0 * n0), Lpi = 4 * n1 * We * We / (3 * df.lc);
        const sI = df.type === '1x2' ? We / 2 : We / 3, wt = Math.max(u.wmin, Math.min(sI - u.gap - 0.02, W - sI - 2 * u.edge - 0.02));
        starts.push([W, df.type === '1x2' ? 3 * Lpi / 8 : Lpi / 2, wt, sI]);
        if (df.type === '2x2') starts.push([W, 3 * Lpi / 2, Math.max(u.wmin, W * 0.3), W * 0.5]);
      }
      for (const s0 of starts) { const scl = [P[0].max - P[0].min, P[1].max - P[1].min, P[2].max - P[2].min, P[3].max - P[3].min], g = nelderMead((u2) => f(u2.map((v, i) => v * scl[i])), s0.map((v, i) => v / scl[i]), 0.03, 140); while (!g.next().done); }
      const b = best, el2 = r2(Math.min(0.8 * df.s1.el, Math.max(df.s2el, b.r.el * 1.3)), 3), imb2 = df.imb ? r2(Math.min(0.8 * df.s1.imb, Math.max(df.s2imb, Math.abs(b.r.imb) * 1.3)), 3) : undefined;
      const fA = id === '1-3' ? 1.8 : 1.4, size = si ? Math.max(8, Math.ceil(b.a * fA)) : Math.ceil(b.a * fA / 10) * 10;
      const lv = { ...l, s2: { el: el2, imb: imb2, size }, fab: { el: el2, imb: imb2 } };
      const yMode = yTargets(K, lv, b.d);
      const startW = si ? 3.0 : 8.0, n1 = PQ.slabNeff(df.lc, pf.t), n0 = PQ.nOx(df.lc), We = startW + (df.lc / Math.PI) / Math.sqrt(n1 * n1 - n0 * n0), Lpi = 4 * n1 * We * We / (3 * df.lc);
      const start = id === '1-3' ? { W: startW, L: snapP(P[1], 3 * Lpi / 8 * 1.75), wt: si ? 0.8 : 2.0, s: snapP(P[3], We / 2) }
        : id === '1-4' ? { W: startW, L: snapP(P[1], 3 * Lpi / 8 * 1.2), wt: si ? 1.0 : 2.4, s: snapP(P[3], We / 2) }
          : { W: startW, L: snapP(P[1], Lpi), wt: si ? 0.8 : 2.0, s: snapP(P[3], We * 0.53) };
      if (pid === 'si1310') {
        const H = { '1-3': { start: { W: 3.0, L: 20.0, wt: 0.8, s: 1.6 }, aRef: 25, s2: { el: 0.05, size: 25 }, fab: { el: 0.05, y: 0.95, yMode: { easy: 0.95, std: 0.95, hard: 0.9 } }, ref: { W: 2.05, L: 5.3, wt: 0.82, s: 1.10 } },
          '1-4': { start: { W: 3.0, L: 11.2, wt: 1.0, s: 1.6 }, aRef: 8, s2: { el: 0.08, size: 8 }, fab: { el: 0.08, y: 0.9, yMode: { easy: 0.9, std: 0.9, hard: 0.8 } }, ref: { W: 1.70, L: 3.7, wt: 0.70, s: 0.90 } },
          '1-5': { start: { W: 3.0, L: 30, wt: 0.8, s: 1.6 }, aRef: 100, s2: { el: 0.45, imb: 0.3, size: 100 }, fab: { el: 0.45, imb: 0.3, y: 0.7, yMode: { easy: 0.7, std: 0.7, hard: 0.55 } }, ref: { W: 3.55, L: 20.8, wt: 1.18, s: 1.38 } } }[id];
        S[id] = { type: df.type, lc: df.lc, lams: df.lams, elCap: 2 * df.s1.el, imbCap: 1.2, s1: df.s1, dbY: [0, df.imb ? 1.5 : 1], ...H };
        console.log(` ${id} (hand-tuned Si 1310 specs kept)`); continue;
      }
      S[id] = { type: df.type, lc: df.lc, lams: df.lams, start, elCap: 2 * df.s1.el, imbCap: 1.2, aRef: size, s1: df.s1, s2: { el: el2, imb: imb2, size }, fab: { el: el2, imb: imb2, y: yMode.std, yMode }, ref: b.d, dbY: [0, df.imb ? 1.5 : 1] };
      console.log(` ${id} best`, JSON.stringify(b.d), 'el', r2(b.r.el), 'imb', r2(b.r.imb || 0), 'area', r2(b.a, 1), '→ el2', el2, 'imb2', imb2, 'size', size, 'y', JSON.stringify(yMode));
    }
  }
  /* 1-6 SSC */
  if (G.SSCP[pid]) {
    const K = KINDS.ssc, l0 = base({ s1: { loss: 2, tol: 0.55 }, s2: { loss: 1, tol: 0.6, size: 1e9 }, fab: { loss: 1.3 } });
    const P = K.params(l0), A = K._x.analyse, res = [];
    for (let tw = P[0].min; tw <= P[0].max + 1e-9; tw += P[0].step * 2) for (const Lt of si ? [60, 100, 150, 200, 260] : [100, 200, 300, 450, 600]) for (const p of [0.8, 1.0, 1.3, 1.6, 2.0]) {
      const d = { tw: +tw.toFixed(3), Lt, p }, a = A(d); res.push({ d, loss: a.loss, tol: a.tolX });
    }
    res.sort((a, b) => a.loss - b.loss);
    const top = res[0], loss2 = r2(Math.max(1.0, top.loss * 1.25 + 0.1), 2), tol2 = r2(Math.min(0.75, top.tol * 0.95), 2);
    const ok = res.filter((x) => x.loss <= loss2 && x.tol >= tol2).sort((a, b) => a.d.Lt - b.d.Lt);
    const size = Math.ceil((ok.length ? ok[0].d.Lt : top.d.Lt) * 1.8 / 10) * 10;
    const l = base({ s1: { loss: 2.0, tol: r2(Math.min(0.55, tol2 * 0.85), 2) }, s2: { loss: loss2, tol: tol2, size }, fab: { loss: r2(loss2 * 1.3, 2) }, hb: ['tol'] });
    // most robust ★★ design for the yield target
    let rb = null;
    for (const x of ok.filter((o) => o.d.Lt <= size).slice(0, 40)) { const y = yieldOf(K, l, x.d, 1, [5]); if (!rb || y > rb.y) rb = { ...x, y }; }
    const ref = rb ? rb.d : top.d, yMode = yTargets(K, l, ref);
    S['1-6'] = { start: { tw: si ? 0.15 : +(P[0].min + (P[0].max - P[0].min) * 0.7).toFixed(3), Lt: 40, p: 1.0 }, lossCap: 3.0, tolBest: r2(Math.max(0.75, top.tol * 1.1), 2), aRef: size, s1: l.s1, s2: l.s2, fab: { ...l.fab, y: yMode.std, yMode }, hb: ['tol'], ref, dbY: [0, 4] };
    console.log(' 1-6 best', JSON.stringify(top.d), 'loss', r2(top.loss, 2), 'tol', r2(top.tol, 2), '→ s2', JSON.stringify(l.s2), 'ref', JSON.stringify(ref), 'y', JSON.stringify(yMode));
  } else console.log(' 1-6 (table pending)');
  /* 1-7 CWDM */
  {
    const K = KINDS.cwdm, X = K._x, l = base({ s1: { il: 1.5, xt: -8 }, s2: { il: 1.0, xt: -12, size: 1e9 }, fab: { il: 1.5, xt: -8 }, xt0: -40, hb: ['xt'] });
    const P = K.params(l), wide = si ? 1.0 : 2.4, ng = X.ngAt(wide, pf.t);
    let d = { ord: 3, wa: snapP(P[6], wide), dL1: snapP(P[1], pf.lc * pf.lc / (ng * 0.04)), dL2: snapP(P[3], pf.lc * pf.lc / (ng * 0.08)), t1: 0, t2a: 0, t2b: 0, useCard: 0 };
    ['t1', 't2a', 't2b'].forEach((k) => (d[k] = snapP(P[{ t1: 2, t2a: 4, t2b: 5 }[k]], X.optTrim(l, d, k))));
    const q = (r) => Math.max(r.il / 1.0, (r.xt + 40) / 28); let best = K.evaluate(l, d);
    for (let it = 0; it < 4; it++) for (const k of ['t1', 't2a', 't2b', 'dL1', 'dL2']) for (const s of [-0.05, -0.02, -0.01, 0.01, 0.02, 0.05]) { const nd = { ...d, [k]: +(d[k] + s).toFixed(2) }, rr = K.evaluate(l, nd); if (q(rr) < q(best)) { best = rr; d = nd; } }
    const size = Math.ceil(best.size * 1.15 / 100) * 100;
    l.s2.size = size; const yMode = yTargets(K, l, d);
    const ngs = X.ngAt(pf.w0, pf.t);
    S['1-7'] = { start: { ord: 1, dL1: snapP(P[1], pf.lc * pf.lc / (ngs * 0.04) * 0.78), t1: 0, dL2: snapP(P[3], pf.lc * pf.lc / (ngs * 0.08) * 0.78), t2a: 0, t2b: 0, wa: pf.w0, useCard: 0 },
      ilCap: 2.0, xtWorst: 0, xtBest: -16, xt0: -40, aRef: size, s1: l.s1, s2: { il: 1.0, xt: -12, size }, fab: { il: 1.5, xt: -8, y: yMode.std, yMode }, hb: ['xt'], ref: d, dbY: [0, 4] };
    console.log(' 1-7 ref IL', r2(best.il), 'XT', r2(best.xt, 1), 'area', Math.round(best.size), 'size', size, 'y', JSON.stringify(yMode));
  }
  }
  if (doS2) require('./calibrate_s2')(G, pf, S, { r2, MODES, scaleLev, yieldOf, yTargets });
  if (doS3) require('./calibrate_s3')(G, pf, S, { r2, MODES, scaleLev, yieldOf });
  if (doS4) require('./calibrate_s4')(G, pf, S, { r2, MODES, scaleLev, yieldOf });
  if (doS5) require('./calibrate_s5')(G, pf, S, { r2, MODES, scaleLev, yieldOf });
}
const prev = PREV; Object.assign(prev, SPEC);
fs.writeFileSync(__dirname + '/../src/data/pspec.json', JSON.stringify(prev));
console.log('wrote pspec.json for', Object.keys(prev).join(','));
