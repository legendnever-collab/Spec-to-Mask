// Reference smq-circuit/1 examples from the PIC Design Lab engine (same code as the game), for tools/smq2gds (Phase D).
//   node tools/export_circuit.js [platform|all] [outdir]
// Designs: MZM DR8 (1:1 lasers, edge wire-bond pads), MRR DR8 (1:1, flip-chip micro-bumps) and MRR WDM8 (3W reference design:
// one input, shared bus with eight rings, one output, flip-chip), wide low-loss routes,
// die = the smallest 0.1-mm die that fits the auto placement. Reference parts of each level (no cards).
const fs = require('fs'), path = require('path');
const load = require('../test/load.js');
const G = load(), L = G.LAB;
const plats = (process.argv[2] || 'all') === 'all' ? Object.keys(G.PLATFORMS) : process.argv[2].split(',');
const out = process.argv[3] || path.join(__dirname, 'smq2gds', 'examples', 'circuit');
fs.mkdirSync(out, { recursive: true });
for (const pid of plats) {
  const pf = G.PLATFORMS[pid], LV = (id) => ({ ...G.LEVELS.find((x) => x.id === id), ...G.PSPEC[pid][id], pf });
  G.GAME_LEV = LV; G.PQ.setPlatform(pf.mat, pf.t, pf.rules);
  const ctx = { pf, lev: LV, cards: {} };
  for (const [name, mod, rf] of [['mzm_dr8', 0, 0], ['mrr_dr8', 1, 1], ['mrr_wdm8', 2, 1]]) {
    const d = { ...L.defaults(ctx, { mod, share: 0 }), rf, wr: pf.mat === 'si' ? 1.0 : 2.0 };
    d.stag = L.stagAuto(d);
    const f = L.minDie(ctx, d); d.W = Math.ceil(f.W / 100) / 10; d.H = Math.ceil(f.H / 100) / 10;
    const c = L.build(ctx, d), chk = L.checks(c, ctx), ex = L.exportCircuit(c, chk, { time: '2026-10-10T00:00:00Z' });
    ex.layout.design = d; ex.schematic.design = d;
    for (const [k, v] of Object.entries(ex)) fs.writeFileSync(path.join(out, `${pid}_${name}_engine_${k}.json`), JSON.stringify(v, null, 1) + '\n');
    const s = ex.verification.summary;
    console.log(`${pid} ${name}: die ${d.W}×${d.H} mm · ${c.inst.length} instances · ${c.routes.length} routes · PASS ${s.PASS} WARNING ${s.WARNING} FAIL ${s.FAIL} NOT VERIFIED ${s['NOT VERIFIED']} · margin ${chk.sys.marginLayout.toFixed(2)} dB`);
  }
}
