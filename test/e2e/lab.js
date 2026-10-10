// PIC Design Lab e2e (jsdom, dist/index.html): map entry → six missions → verification → smq-circuit/1 export → guide → back.
// The lab must not write stars, cards or level designs. node test/e2e/lab.js [platform]
const { JSDOM } = require('jsdom'); const fs = require('fs');
const html = fs.readFileSync(require('path').join(__dirname, '../../dist/index.html'), 'utf8');
const plat = process.argv[2] || 'si1310';
let fail = 0; const okm = (c, m) => { if (!c) { fail++; console.log('  FAIL', m); } else console.log('  ok', m); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  console.log(`lab e2e · ${plat}`);
  const dom = new JSDOM('<!doctype html><html><head></head><body>' + html + '</body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://lab' + Date.now() + '.test/' });
  const w = dom.window, errs = []; w.addEventListener('error', (e) => errs.push(e.message));
  const g = () => ({ addColorStop() {} });
  w.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: (t, k) => (k === 'measureText' ? () => ({ width: 30 }) : k === 'createImageData' ? (a, b) => ({ data: new Uint8ClampedArray(a * b * 4) }) : k === 'createLinearGradient' || k === 'createRadialGradient' ? g : k in t ? t[k] : () => {}), set: (t, k, v) => { t[k] = v; return true; } });
  w.ResizeObserver = class { observe() {} };
  Object.defineProperty(w.HTMLElement.prototype, 'clientWidth', { get() { return 700; } });
  w.URL.createObjectURL = () => 'blob:x'; w.URL.revokeObjectURL = () => {}; w.HTMLAnchorElement.prototype.click = function () {};
  const prog = { plat, by: { [plat]: { stars: { easy: {}, std: { '3A+': 1 }, hard: {} }, best: {}, ai: {}, cards: {}, missions: {} } } };
  w.localStorage.setItem('smq3-progress', JSON.stringify(prog)); w.localStorage.setItem('smq3-designs', JSON.stringify({ [plat]: { '1-3': { W: 3, L: 9 } } }));
  w.eval(html.split('<script>')[1].split('</script>')[0]);
  const $ = (s) => w.document.querySelector(s), $$ = (s) => [...w.document.querySelectorAll(s)];
  const set = async (k, v) => { const r = $('#lp-' + k); if (!r) { okm(false, 'no control ' + k); return; } r.value = String(v); r.dispatchEvent(new w.Event('input', { bubbles: true })); await sleep(250); };
  const before = { p: w.localStorage.getItem('smq3-progress'), d: w.localStorage.getItem('smq3-designs') };
  await sleep(400);
  const node = $('[data-lab]');
  okm(node && /미션 0\/6/.test(node.textContent), `campaign map shows the Design Lab node (${node && node.textContent.trim()})`);
  node.click(); await sleep(600);
  okm(!$('#lab').hidden && $('main.game').hidden, 'the lab replaces the level screen');
  const st = () => w.LABUI.state();
  okm(st().MS.schematic && $$('.stp.done').length >= 1, 'Mission 1: the auto-generated schematic is complete (8 lanes, connectivity)');
  okm($$('#lab-lib-list .libitem').length >= 7 && /1-3/.test($('#lab-lib-list').textContent), 'design library lists the parts and their sources');
  // mission 1: laser sharing rebuilds inputs and the splitter tree
  await set('share', 2); await sleep(200);
  okm(st().C.inst.filter((x) => x.role === 'input').length === 2 && st().C.inst.filter((x) => x.type === 'mmi1x2').length === 6, 'laser sharing 1:4 → 2 inputs and 6 splitter MMIs');
  okm(JSON.parse(w.localStorage.getItem('smq3-lab'))[plat].d.share === 2, 'the lab design is stored under smq3-lab');
  // mission 2: infeasible die and the fit action
  $('[data-ms="1"]').click(); await sleep(400);
  const W0 = st().d.W; await set('W', 1.5); await sleep(200);
  okm(!st().MS.floorplan && /Infeasible/.test($('#lab-out-b').textContent) && /필요/.test($('#lab-coach').textContent), 'a 1.5 mm die is Infeasible with the reason and the required size');
  $('[data-la="fit"]').click(); await sleep(500);
  okm(st().MS.floorplan && st().d.W >= 1.5, `“필요 크기로 맞춤” → ${st().d.W} × ${st().d.H} mm fits (was ${W0})`);
  // mission 3: routing table, coach about narrow-waveguide loss when the budget fails
  $('[data-ms="2"]').click(); await sleep(400);
  okm($$('#lab-out-b table tr').length > st().C.routes.length && st().MS.routing, `routing table lists ${st().C.routes.length} nets, all routed`);
  if (st().CHK.sys.marginLayout < 0) okm(/배선 손실/.test($('#lab-coach').textContent), 'coach explains the on-chip routing loss when the link budget fails');
  await set('wr', plat.startsWith('si1') ? 1 : 2); await sleep(200);
  $('[data-ms="1"]').click(); await sleep(300); $('[data-la="fit"]').click(); await sleep(500); $('[data-ms="2"]').click(); await sleep(300);
  okm(st().MS.routing && st().C.routes.some((r) => r.w > st().C.platform.w0), 'wide routes with tapers on the long nets');
  // mission 4
  $('[data-ms="3"]').click(); await sleep(400);
  okm(st().MS.electrical && /GSG|GS/.test($('#lab-out-b').textContent), 'electrical interface: every port on a pad, RF lines planar');
  // mission 5: verification must be run
  $('[data-ms="4"]').click(); await sleep(400);
  okm(!st().s.ran && /실행하지 않았/.test($('#lab-params').textContent), 'verification is not shown as done before it is run');
  $('[data-la="run"]').click(); await sleep(500);
  const ck = st().CHK.checks, stat = (s) => ck.filter((x) => x.status === s).length;
  okm(st().s.ran && /Connectivity/.test($('#lab-out-b').textContent) && stat('NOT VERIFIED') >= 4, `verification table: PASS ${stat('PASS')} · WARNING ${stat('WARNING')} · FAIL ${stat('FAIL')} · NOT VERIFIED ${stat('NOT VERIFIED')}`);
  okm(/레이아웃 결과 vs 시스템 예측/.test($('#lab-out-b').textContent), 'layout vs 3A+ system prediction table');
  // mission 6: export
  $('[data-ms="5"]').click(); await sleep(400);
  $('[data-la="exp-all"]').click(); await sleep(300);
  let j = null; try { j = JSON.parse($('#lab-json').value); } catch (e) { j = null; }
  okm(j && j.schematic.schema === 'smq-circuit/1' && j.layout.routing.optical.length === st().C.routes.length && j.verification.checks.length === ck.length && j.layout.instances.some((x) => x.type === 'mzm'), 'smq-circuit/1 export: schematic, layout primitives, verification');
  okm(!!st().s.exported && /Tape-out Ready Mask가 아닙니다/.test($('#lab-out-b').textContent), 'final summary marks the export and the abstraction level');
  // GDS re-check import (the file tools/smq2gds.circuit writes; the checks here are a stand-in for its output)
  const load = async (obj) => { const inp = $('#lab-gds'); Object.defineProperty(inp, 'files', { value: [new w.File([JSON.stringify(obj)], 'engine_verification.json', { type: 'application/json' })], configurable: true }); inp.dispatchEvent(new w.Event('change', { bubbles: true })); await sleep(400); };
  const gchip = () => [...$('#lab-prog').children].find((x) => /Geometry Rechecked/.test(x.textContent));
  okm(gchip() && !gchip().classList.contains('ok') && /불러온 GDS 재검사 결과가 없습니다/.test($('#lab-gds-msg').textContent), 'before import: Geometry Rechecked pending, GDS 재검사 NOT VERIFIED');
  await load({ platform: plat });
  okm(/gds_recheck가 없는 파일/.test($('#lab-gds-msg').textContent) && !gchip().classList.contains('ok'), 'a verification file without gds_recheck is refused');
  const rc = (hash, fail) => ({ ...j.verification, gds_recheck: { schema: 'smq-circuit/1#gds-recheck', design_hash: hash, gds: 'engine_layout.gds', gds_sha1: '0123456789abcdef', cells: 3, summary: { PASS: 18, WARNING: 1, FAIL: 0 }, checks: [{ group: 'GDS', item: '파일 다시 읽기', status: 'PASS', detail: '' }, { group: 'DRC', item: 'x', status: fail ? 'FAIL' : 'PASS', detail: '' }] } });
  await load(rc('deadbeef', 0));
  okm(/다른 설계/.test($('#lab-gds-msg').textContent) && !gchip().classList.contains('ok') && st().CHK.checks.find((x) => x.item === 'GDS 재검사').status === 'NOT VERIFIED', 'a re-check of another design (hash mismatch) is not applied');
  await load(rc(j.layout.design_hash, 1));
  okm(st().CHK.checks.find((x) => x.item === 'GDS 재검사').status === 'FAIL' && !gchip().classList.contains('ok'), 'a re-check with a FAIL (counted from its checks, not its summary) → GDS 재검사 FAIL');
  await load(rc(j.layout.design_hash, 0));
  okm(st().CHK.checks.find((x) => x.item === 'GDS 재검사').status === 'PASS' && gchip().classList.contains('ok') && /sha1 0123456789ab/.test($('#lab-gds-msg').textContent), 'matching design hash, FAIL 0 → GDS 재검사 PASS, Geometry Rechecked ✓');
  $('[data-ms="1"]').click(); await sleep(300); const Wg = st().d.W; await set("W", Wg + 0.1); await sleep(300);
  okm(!gchip().classList.contains('ok') && /다른 설계/.test(gchip().textContent), 'changing the design makes the imported GDS stale');
  await set("W", Wg); await sleep(300);
  okm(gchip().classList.contains('ok'), 'restoring the design restores the match (same design hash)');
  // guide for the current mission and for mission 3
  $('[data-ms="2"]').click(); await sleep(300);
  $('#lab-guide').click(); await sleep(300);
  okm(!$('#guide-dlg').hidden && $$('#guide-body .gsec').length === 7 && $$('#guide-body tr[data-k]').length === 4 && /Euler/.test($('#guide-body').textContent), 'Learning Guide A–G for Mission 3 with a row per mission parameter');
  $('#guide-close').click(); await sleep(100);
  okm($('#guide-dlg').hidden, 'guide closes');
  // MRR: flip-chip removes the lumped-element warning
  $('[data-ms="0"]').click(); await sleep(300); await set('mod', 1); await sleep(300);
  $('[data-ms="3"]').click(); await sleep(300);
  const warn = () => (st().CHK.checks.find((x) => /링 구동선/.test(x.item)) || {}).status;
  const w0 = warn(); await set('rf', 1); await sleep(300);
  okm(w0 === 'WARNING' && warn() === 'PASS', `MRR drive line: edge pads ${w0} → flip-chip ${warn()}`);
  // WDM8 (Phase E): the shared-bus architecture from the 3W design
  $('[data-ms="0"]').click(); await sleep(300); await set('mod', 2); await sleep(500);
  const C2 = st().C, bus = C2.I('BUS');
  okm(C2.mod === 'wdm' && bus && bus.params.rings.length === 8 && C2.inst.filter((x) => x.role === 'output').length === 1 && /3W/.test($('#lab-params').textContent) && !$('#lp-share'), 'WDM8: one bus with eight 3W rings, one output; laser sharing hidden');
  okm(/MRR ×8 · 공유 버스/.test($('#lab-lib-list').textContent), 'library lists the WDM shared bus with its radii and FSR');
  $('[data-ms="3"]').click(); await sleep(400);
  okm(!$('#lp-rf') && /S \/ G 선/.test($('#lab-out-b').textContent) && st().MS.electrical, 'WDM8 electrical: flip-chip bumps per ring (S north / G south), planar heaters, mission complete');
  $('[data-ms="4"]').click(); await sleep(300); $('[data-la="run"]').click(); await sleep(400);
  okm(/FSR 별칭/.test($('#lab-out-b').textContent) && /공진 배정/.test($('#lab-out-b').textContent) && /3W 엔진/.test($('#lab-out-b').textContent), 'WDM8 verification: FSR alias, resonance assignment / tuning, 3W system prediction');
  $('[data-ms="5"]').click(); await sleep(300); $('[data-la="exp-all"]').click(); await sleep(300);
  let jw = null; try { jw = JSON.parse($('#lab-json').value); } catch (e) { jw = null; }
  okm(jw && jw.layout.architecture.wdm && jw.layout.instances.some((x) => x.type === 'mrr_wdm'), 'WDM8 export: architecture.wdm + mrr_wdm instance');
  $('[data-ms="0"]').click(); await sleep(300); await set('mod', 0); await sleep(500);
  okm(st().C.mod === 'mzm' && st().C.inst.filter((x) => x.role === 'output').length === 8, 'back to DR8 (MZM): eight outputs again');
  // back to the campaign; nothing in the campaign changed
  $('#lab-back').click(); await sleep(300);
  okm($('#lab').hidden && !$('main.game').hidden, 'back to the campaign');
  okm(w.localStorage.getItem('smq3-progress') === before.p && w.localStorage.getItem('smq3-designs') === before.d, 'stars, cards and level designs untouched by the lab');
  okm(/미션 [1-6]\/6/.test($('[data-lab]').textContent), `map node shows lab progress (${$('[data-lab]').textContent.trim()})`);
  okm(!errs.length, `no page errors (${errs.slice(0, 3).join(' | ')})`);
  console.log(fail ? `FAILED ${fail}` : 'lab checks passed'); process.exit(fail ? 1 : 0);
})();
