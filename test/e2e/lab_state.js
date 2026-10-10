// PIC Design Lab state integrity (v1.0 P0): historical achievement vs current design validity vs export / GDS identity.
//   all six missions → PASS; shrink the die → Floorplan FAIL; break a bend radius → Routing FAIL; verification and export
//   follow the design hash; restoring the design restores them (same-hash policy); a v1 state (ran: true, exported: time)
//   migrates to "stale"; stars, cards and level designs never change.   node test/e2e/lab_state.js [platform]
const { JSDOM } = require('jsdom'); const fs = require('fs');
const html = fs.readFileSync(require('path').join(__dirname, '../../dist/index.html'), 'utf8');
const plat = process.argv[2] || 'si1310';
let fail = 0; const okm = (c, m) => { if (!c) { fail++; console.log('  FAIL', m); } else console.log('  ok', m); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function boot(seedLab) {
  const dom = new JSDOM('<!doctype html><html><head></head><body>' + html + '</body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://labstate' + Date.now() + Math.random().toString(36).slice(2) + '.test/' });
  const w = dom.window, errs = []; w.addEventListener('error', (e) => errs.push(e.message));
  const g = () => ({ addColorStop() {} });
  w.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: (t, k) => (k === 'measureText' ? () => ({ width: 30 }) : k === 'createImageData' ? (a, b) => ({ data: new Uint8ClampedArray(a * b * 4) }) : k === 'createLinearGradient' || k === 'createRadialGradient' ? g : k in t ? t[k] : () => {}), set: (t, k, v) => { t[k] = v; return true; } });
  w.ResizeObserver = class { observe() {} };
  Object.defineProperty(w.HTMLElement.prototype, 'clientWidth', { get() { return 700; } });
  w.URL.createObjectURL = () => 'blob:x'; w.URL.revokeObjectURL = () => {}; w.HTMLAnchorElement.prototype.click = function () {};
  const prog = { plat, by: { [plat]: { stars: { easy: {}, std: { '3A+': 3, '1-3': 1 }, hard: {} }, best: {}, ai: {}, cards: {}, missions: {} } } };
  w.localStorage.setItem('smq3-progress', JSON.stringify(prog)); w.localStorage.setItem('smq3-designs', JSON.stringify({ [plat]: { '1-3': { W: 3, L: 9 } } }));
  if (seedLab) w.localStorage.setItem('smq3-lab', JSON.stringify(seedLab));
  w.eval(html.split('<script>')[1].split('</script>')[0]);
  const $ = (s) => w.document.querySelector(s);
  const set = async (k, v) => { const r = $('#lp-' + k); if (!r) { okm(false, 'no control ' + k); return; } r.value = String(v); r.dispatchEvent(new w.Event('input', { bubbles: true })); await sleep(250); };
  return { w, $, set, errs, st: () => w.LABUI.state() };
}
(async () => {
  console.log(`lab state integrity · ${plat}`);
  const B = boot(), { w, $, set, st } = B;
  const before = { p: w.localStorage.getItem('smq3-progress'), d: w.localStorage.getItem('smq3-designs') };
  await sleep(400); $('[data-lab]').click(); await sleep(600);
  const live = () => st().s.live, hist = () => st().s.done, chip = (re) => [...$('#lab-prog').children].find((x) => re.test(x.textContent));
  // complete all six missions on the current design
  // wide long-net bodies keep the layout link budget positive (narrow Si waveguides scatter), then fit the die
  $('[data-ms="2"]').click(); await sleep(300); await set('wr', plat.startsWith('si1') ? 1 : 2);
  $('[data-ms="1"]').click(); await sleep(300); $('[data-la="fit"]').click(); await sleep(400);
  console.log('    fails:', st().CHK.checks.filter((x) => x.status === 'FAIL').map((x) => x.item).join(' | ') || 'none');
  $('[data-ms="4"]').click(); await sleep(300); $('[data-la="run"]').click(); await sleep(400);
  $('[data-ms="5"]').click(); await sleep(300); $('[data-la="exp-all"]').click(); await sleep(300);
  let j = null; try { j = JSON.parse($('#lab-json').value); } catch (e) { j = null; }
  const all = (o) => ['schematic', 'floorplan', 'routing', 'electrical', 'verification', 'export'].every((k) => o && o[k]);
  okm(all(live()) && all(hist()) && chip(/Design Valid/).classList.contains('ok'), 'all six missions PASS on the current design (live and historical)');
  okm(st().s.exported && st().s.exported.hash === j.layout.design_hash && st().s.ran.hash === j.layout.design_hash, 'export and verification run carry the design hash');
  okm(/NOT VERIFIED/.test(chip(/Foundry Readiness/).textContent) && !chip(/Foundry Readiness/).classList.contains('ok'), 'Foundry Readiness is shown as NOT VERIFIED, never ✓');
  // GDS re-check for this design
  const load = async (obj) => { const inp = $('#lab-gds'); Object.defineProperty(inp, 'files', { value: [new w.File([JSON.stringify(obj)], 'engine_verification.json', { type: 'application/json' })], configurable: true }); inp.dispatchEvent(new w.Event('change', { bubbles: true })); await sleep(400); };
  await load({ ...j.verification, gds_recheck: { schema: 'smq-circuit/1#gds-recheck', design_hash: j.layout.design_hash, gds: 'engine_layout.gds', gds_sha1: 'ab', cells: 3, summary: {}, checks: [{ group: 'GDS', item: '파일 다시 읽기', status: 'PASS', detail: '' }] } });
  okm(chip(/Geometry Rechecked/).classList.contains('ok'), 'matching GDS re-check → Geometry Rechecked ✓');
  // 1) shrink the die → Floorplan FAIL, verification and export no longer valid for this design
  $('[data-ms="1"]').click(); await sleep(300); const W0 = st().d.W; await set('W', 1.5);
  okm(!live().floorplan && !live().verification && !live().export && hist().floorplan && hist().export, `die 1.5 mm: Floorplan FAIL, Verification / Export invalid now, history kept`);
  okm($('.stp[data-ms="1"]').classList.contains('was') && /현재 무효/.test($('#lab-note').textContent), 'stepper and mission note show "이전 완료 · 현재 무효"');
  okm(!chip(/Design Valid/).classList.contains('ok') && /다른 설계/.test(chip(/Geometry Rechecked/).textContent), 'Design Valid off, imported GDS re-check stale');
  okm(/미션 [0-5]\/6 · 이전 6/.test(w.LABUI.progress()), `map label separates current and historical (${w.LABUI.progress()})`);
  // 2) restore → same hash: floorplan, verification run, export and GDS re-check are valid again (policy)
  await set('W', W0);
  okm(all(live()) && chip(/Geometry Rechecked/).classList.contains('ok'), 'restoring the design (same hash) → all missions, export and re-check valid again');
  // 3) routing condition: Advanced, bend radius below the rule → Routing FAIL
  $('[data-lm="advanced"]').click(); await sleep(300); $('[data-ms="2"]').click(); await sleep(300);
  const R0 = st().d.R, rmin = +$('#lp-R').min; await set('R', rmin);
  const rf = !live().routing;
  okm(rf && !live().verification && !live().export, `bend radius ${rmin} µm → Routing FAIL (${(st().CHK.checks.filter((x) => x.status === 'FAIL').map((x) => x.item)).join(', ')}), verification / export invalid`);
  // 4) a different but valid design: verification must be re-run, export is stale until exported again
  await set('R', R0); await set('wr', +(st().d.wr + 0.1).toFixed(2));
  okm(live().routing && !live().verification && !live().export, 'a different valid design: Routing PASS, but Verification needs a new run and Export is stale');
  $('[data-ms="4"]').click(); await sleep(300); $('[data-la="run"]').click(); await sleep(400);
  okm(live().verification && !live().export, 're-run → Verification PASS; Export still stale (other design hash)');
  $('[data-ms="5"]').click(); await sleep(300); $('[data-la="exp-all"]').click(); await sleep(300);
  okm(all(live()), 're-export → all six missions PASS again');
  okm(w.localStorage.getItem('smq3-progress') === before.p && w.localStorage.getItem('smq3-designs') === before.d, 'stars, cards and level designs unchanged');
  okm(!B.errs.length, `no page errors (${B.errs.slice(0, 2).join(' | ')})`);
  // 5) v1 state migration: ran = true and exported = time carry no design identity → stale; history kept
  const v1 = { [plat]: { d: st().d, done: { schematic: true, floorplan: true, routing: true, electrical: true, verification: true, export: true }, ran: true, exported: '2026-10-01T00:00:00Z', cur: 4 } };
  const B2 = boot(v1); await sleep(400); B2.$('[data-lab]').click(); await sleep(600);
  const s2 = B2.st().s;
  okm(s2.v === 2 && s2.ran === null && s2.exported && s2.exported.hash === null, 'v1 lab state migrates: ran → null, exported → { hash: null }');
  okm(!s2.live.verification && !s2.live.export && s2.done.verification && s2.done.export, 'migrated state: Verification / Export not valid now, historical completion kept');
  okm(!B2.errs.length, 'no page errors after migration');
  console.log(fail ? `FAILED ${fail}` : 'lab state checks passed'); process.exit(fail ? 1 : 0);
})();
