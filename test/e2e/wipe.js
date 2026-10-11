// Level reset e2e: "설계값만 처음으로" keeps progress; "레벨 초기화" clears only this level on this platform (stars, guided steps,
// card, Fab log, best/AI, pins/review/missions, design, credits; Design DB only when ticked), the screen shows the fresh level,
// other levels are untouched, and "되돌리기" restores exactly what was there.   node test/e2e/wipe.js [platform]
const { JSDOM } = require('jsdom'); const fs = require('fs');
const html = fs.readFileSync(require('path').join(__dirname, '../../dist/index.html'), 'utf8');
const dom = new JSDOM('<!doctype html><html><head></head><body>' + html + '</body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://w' + Date.now() + '.test/' });
const w = dom.window;
const mkCtx = () => { const g = () => ({ addColorStop() {} }); return new Proxy({}, { get: (t, k) => { if (k === 'measureText') return () => ({ width: 30 }); if (k === 'createImageData') return (a, b) => ({ data: new Uint8ClampedArray(a * b * 4) }); if (k === 'createLinearGradient' || k === 'createRadialGradient') return g; if (k in t) return t[k]; return typeof k === 'string' ? (() => {}) : undefined; }, set: (t, k, v) => { t[k] = v; return true; } }); };
w.HTMLCanvasElement.prototype.getContext = mkCtx; w.atob = (x) => Buffer.from(x, 'base64').toString('binary'); w.ResizeObserver = class { observe() {} };
Object.defineProperty(w.HTMLElement.prototype, 'clientWidth', { get() { return 700; } });
const errs = []; w.addEventListener('error', (e) => errs.push(e.message));
w.eval(html.split('<script>')[1].split('</script>')[0]);
const $ = (s) => w.document.querySelector(s), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const plat = process.argv[2] || 'si1310'; let fail = 0; const ok = (c, m) => { console.log(`  ${c ? 'ok' : 'FAIL'} ${m}`); if (!c) fail++; };
const coach = () => ($('#coach').hidden ? '' : $('#coach').textContent.replace(/\s+/g, ' ').trim());
const prog = () => JSON.parse(w.localStorage.getItem('smq3-progress')).by[plat];
const sm = () => Object.fromEntries([...w.document.querySelectorAll('.prm')].map((p) => [p.querySelector('label i').textContent.trim(), p.querySelector('input').dataset.k]));
const set = (k, v) => { const r = $('#p-' + k); r.value = String(v); r.dispatchEvent(new w.Event('input', { bubbles: true })); };
// follow the numeric coach ("권장: sym = value") until it has nothing to say or the predicate holds
async function follow(stop, n = 40) { for (let i = 0; i < n && !stop(); i++) { await sleep(220); const m = coach().match(/권장: (.+?) \(기준/); if (!m) break; const map = sm(); for (const part of m[1].split('·')) { const q = part.trim().match(/^(\S+) = ([\-\d.]+)/); if (q && map[q[1]]) set(map[q[1]], q[2]); } } }
(async () => {
  await sleep(300);
  $(`#pick-lam .choice[data-lam="${plat.endsWith('1310') ? 1.31 : 1.55}"]`).click(); $(`#pick-mat .choice[data-mat="${plat.startsWith('sin') ? 'sin' : 'si'}"]`).click(); $('#btn-start').click(); await sleep(400);
  $('#hint-seg button[data-h="2"]').click(); await sleep(150);
  // 2-2: earn ★ (+ a card) and run one Fab
  $('.node[data-id="2-2"]').click(); await sleep(300);
  await follow(() => !!(prog().stars.std || {})['2-2']);
  $('#btn-fab').click(); await sleep(3500);
  ok(!!(prog().stars.std || {})['2-2'] && (prog().fab || {})['2-2'] && (prog().fab['2-2'] || []).length === 1, '2-2 has stars and a Fab log before the reset');
  // 1-7: complete Guided step 1 (engine-judged)
  $('.node[data-id="1-7"]').click(); await sleep(300); const g = $('[data-gm="guided"]'); if (g && g.getAttribute('aria-checked') !== 'true') { g.click(); await sleep(200); }
  $('.stp[data-step="0"]').click(); await sleep(300);
  await follow(() => /완료 ✓/.test($('#m-stepnote').textContent));
  ok(/완료 ✓/.test($('#m-stepnote').textContent) && Object.keys(((prog().guide || {})['1-7'] || {}).done || {}).length >= 1, '1-7 step 1 is marked complete');
  const keep22 = JSON.stringify({ s: prog().stars.std['2-2'], c: !!prog().cards['2-2'], f: prog().fab['2-2'] });
  // quick reset: design only — the step stays complete
  $('#btn-reset').click(); await sleep(50); $('#btn-reset').click(); await sleep(300);
  ok(/완료 ✓/.test($('#m-stepnote').textContent), '"설계값만 처음으로" keeps the guided progress');
  // full reset of 1-7
  $('#btn-wipe').click(); await sleep(150);
  ok(!$('#wipe-dlg').hidden && /Guided 학습 진행/.test($('#wipe-list').textContent) && /완료 단계 1개/.test($('#wipe-list').textContent), 'the confirmation lists what will be erased (1 completed step)');
  $('#wipe-go').click(); await sleep(400);
  const G = (prog().guide || {})['1-7'];
  ok($('#wipe-dlg').hidden && !(G && Object.keys(G.done || {}).length), '1-7 guided progress erased');
  ok(!/완료 ✓/.test($('#m-stepnote').textContent) && /STEP 1\/5 · 지금 할 일/.test($('#m-do').textContent), 'the screen shows a fresh level (no "완료", step 1 task)');
  ok(JSON.stringify({ s: prog().stars.std['2-2'], c: !!prog().cards['2-2'], f: prog().fab['2-2'] }) === keep22, 'other level (2-2) untouched');
  ok(!!$('#m-do [data-act="unwipe"]'), 'undo is offered');
  $('#m-do [data-act="unwipe"]').click(); await sleep(400);
  ok(/완료 ✓/.test($('#m-stepnote').textContent) && Object.keys(((prog().guide || {})['1-7'] || {}).done || {}).length >= 1, 'undo restores the step progress');
  // full reset of a level with stars, card, Fab and its Design DB points
  $('.node[data-id="2-2"]').click(); await sleep(300);
  const nDB0 = JSON.parse(w.localStorage.getItem('smq3-db') || '[]').filter((r) => r.lv === '2-2').length;
  $('#btn-wipe').click(); await sleep(150); $('#wipe-db').checked = true; $('#wipe-go').click(); await sleep(400);
  const p = prog(), nDB1 = JSON.parse(w.localStorage.getItem('smq3-db') || '[]').filter((r) => r.lv === '2-2').length;
  ok(!Object.values(p.stars).some((o) => (o || {})['2-2']) && !p.cards['2-2'] && !(p.fab || {})['2-2'] && !(p.best || {})['2-2'], '2-2 stars, card, Fab log and best score erased');
  ok(nDB0 > 0 && nDB1 === 0, `2-2 Design DB points erased when ticked (${nDB0} → ${nDB1})`);
  ok(/★ 기본 스펙/.test($('#m-do').textContent) && $('#yield').textContent.trim() === '—', 'the screen shows the fresh level (★ goal, no yield)');
  ok(errs.length === 0, `no page errors (${errs.slice(0, 2).join(' | ')})`);
  console.log(fail ? `FAILED ${fail}` : 'wipe checks passed'); process.exit(fail ? 1 : 0);
})();
