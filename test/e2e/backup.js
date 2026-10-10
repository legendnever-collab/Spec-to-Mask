// Persistence reliability + full backup / restore (v1.0 P0), jsdom on dist/index.html.
//   save chip states, a refused write (quota) is shown and recovers; backup (copy fallback without the Clipboard API) has
//   schema, checksum and summary; restore checks schema / checksum / structure, shows a summary, needs confirmation,
//   replaces the data, keeps an undo copy; a refused write during restore rolls every key back.   node test/e2e/backup.js
const { JSDOM, VirtualConsole } = require('jsdom'); const fs = require('fs');
const html = fs.readFileSync(require('path').join(__dirname, '../../dist/index.html'), 'utf8');
let fail = 0; const okm = (c, m) => { if (!c) { fail++; console.log('  FAIL', m); } else console.log('  ok', m); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const plat = 'si1310';
function boot(seed, rawSeed) {
  const dom = new JSDOM('<!doctype html><html><head></head><body>' + html + '</body></html>', { virtualConsole: (() => { const vc = new VirtualConsole(); vc.on('jsdomError', (e) => { if (!/Not implemented: navigation/.test(e.message)) console.log('jsdom:', e.message); }); return vc; })(), runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://backup' + Date.now() + Math.random().toString(36).slice(2) + '.test/' });
  const w = dom.window, errs = []; w.addEventListener('error', (e) => errs.push(e.message));
  const g = () => ({ addColorStop() {} });
  w.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: (t, k) => (k === 'measureText' ? () => ({ width: 30 }) : k === 'createImageData' ? (a, b) => ({ data: new Uint8ClampedArray(a * b * 4) }) : k === 'createLinearGradient' || k === 'createRadialGradient' ? g : k in t ? t[k] : () => {}), set: (t, k, v) => { t[k] = v; return true; } });
  w.ResizeObserver = class { observe() {} };
  Object.defineProperty(w.HTMLElement.prototype, 'clientWidth', { get() { return 700; } });
  w.URL.createObjectURL = () => 'blob:x'; w.URL.revokeObjectURL = () => {}; w.HTMLAnchorElement.prototype.click = function () {};
  Object.entries(seed || {}).forEach(([k, v]) => w.localStorage.setItem(k, JSON.stringify(v)));
  Object.entries(rawSeed || {}).forEach(([k, v]) => w.localStorage.setItem(k, v));   // raw text, e.g. a truncated value
  w.eval(html.split('<script>')[1].split('</script>')[0]);
  return { w, $: (s) => w.document.querySelector(s), errs };
}
(async () => {
  console.log('backup / persistence e2e');
  const seed = {
    'smq3-progress': { plat, by: { [plat]: { stars: { easy: {}, std: { '1-1': 3, '1-3': 1, '2-3': 7 }, hard: {} }, best: { '1-1': 700 }, ai: {}, cards: { '1-1': { id: '1-1', name: 'x', score: 700, stars: 2, lines: [], d: { w: 0.4 }, t: 1 } }, missions: {} } } },
    'smq3-designs': { [plat]: { '1-1': { w: 0.4 }, '1-3': { W: 3, L: 9 } } },
    'smq3-db': [{ lv: '1-1', pf: plat, src: 'H', p: { w: 0.4 }, y: 1, a: 1, t: 1 }],
    'smq3-lab': { [plat]: { d: null, done: { schematic: true }, v: 2 } },
    'smq3-id': '1-1'
  };
  const A = boot(seed), { w, $ } = A; await sleep(600);
  okm($('#save-chip') && /저장됨|백업 권장/.test($('#save-txt').textContent) && $('#save-warn').hidden, `save chip after start: ${$('#save-txt').textContent}`);
  // a refused write (quota) is shown, and recovers on the next successful write
  const real = w.Storage.prototype.setItem;
  w.Storage.prototype.setItem = function (k, v) { if (/^smq3-(progress|designs)$/.test(k)) { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; } return real.call(this, k, v); };
  const r = $('#p-w'); r.value = '0.5'; r.dispatchEvent(new w.Event('input', { bubbles: true })); await sleep(50);
  okm(/저장 중|저장 실패/.test($('#save-txt').textContent), `parameter change → ${$('#save-txt').textContent}`);
  await sleep(700);
  okm($('#save-chip').dataset.st === 'failed' && !$('#save-warn').hidden && /창을 닫으면/.test($('#save-warn').textContent), 'refused write → 저장 실패 chip + banner (data may be lost when the window closes)');
  w.Storage.prototype.setItem = real;
  r.value = '0.45'; r.dispatchEvent(new w.Event('input', { bubbles: true })); await sleep(800);
  okm($('#save-chip').dataset.st !== 'failed' && $('#save-warn').hidden, 'next successful write → saved again, banner hidden');
  // backup through the copy path (no Clipboard API in jsdom → visible textarea fallback)
  $('#save-chip').click(); await sleep(100);
  okm(!$('#data-dlg').hidden && /사용량/.test($('#data-status').textContent), 'data dialog opens with save state and storage usage');
  $('#bk-copy').click(); await sleep(150);
  let bk = null; try { bk = JSON.parse($('#bk-ta').value); } catch (e) { bk = null; }
  okm(bk && bk.schema === 'smq-backup/1' && /^fnv1a32:/.test(bk.checksum) && bk.data['smq3-progress'] && bk.data['smq3-db'].length >= 1 && bk.summary.stars === 2 + 1 + 3 && bk.summary.cards === 1, `backup JSON: schema, checksum, summary (stars ${bk && bk.summary.stars}, cards ${bk && bk.summary.cards})`);
  okm(!$('#bk-ta').hidden && /Ctrl/.test($('#bk-msg').textContent), 'no Clipboard API → the JSON is shown selected for manual copy');
  okm(w.SMQ_STORE.validate(bk).ok, 'the backup validates');
  // corrupted / foreign files are refused and change nothing
  const before = () => ['smq3-progress', 'smq3-designs', 'smq3-db', 'smq3-lab'].map((k) => w.localStorage.getItem(k)).join('|');
  const b0 = before();
  const bad = JSON.parse(JSON.stringify(bk)); bad.data['smq3-progress'].by[plat].stars.std['1-1'] = 1;
  $('#rs-ta').value = JSON.stringify(bad); $('#rs-check').click(); await sleep(50);
  okm(/체크섬/.test($('#rs-out').textContent) && !$('#rs-go') && before() === b0, 'edited backup → checksum error (corrupted), nothing changed');
  $('#rs-ta').value = JSON.stringify(bk).slice(0, 300); $('#rs-check').click(); await sleep(50);
  okm(/JSON으로 읽을 수 없습니다/.test($('#rs-out').textContent), 'truncated file → not JSON');
  $('#rs-ta').value = JSON.stringify({ schema: 'smq-design/1', params: {} }); $('#rs-check').click(); await sleep(50);
  okm(/smq-backup\/1\)이 아닙니다/.test($('#rs-out').textContent), 'a design export (smq-design/1) is not a backup');
  const v2 = JSON.parse(JSON.stringify(bk)); v2.data['smq3-db'] = 'x'; v2.checksum = 'fnv1a32:' + w.SMQ_STORE.fnv(JSON.stringify(v2.data));
  okm(!w.SMQ_STORE.validate(v2).ok, 'structure check: a Design DB that is not an array is refused even with a matching checksum');
  // a different browser state, then restore the backup
  const B = boot({ 'smq3-progress': { plat, by: { [plat]: { stars: { easy: {}, std: { '1-2': 1 }, hard: {} }, best: {}, ai: {}, cards: {}, missions: {} } } }, 'smq3-id': '1-2' }); await sleep(600);
  B.$('#save-chip').click(); await sleep(50);
  B.$('#rs-ta').value = JSON.stringify(bk); B.$('#rs-check').click(); await sleep(50);
  okm(/별/.test(B.$('#rs-out').textContent) && B.$('#rs-go') && B.$('#rs-go').disabled && /바뀝니다/.test(B.$('#rs-out').textContent), 'valid backup → summary (backup vs now) and a disabled restore button until confirmed');
  const prevB = B.w.localStorage.getItem('smq3-progress');
  B.$('#rs-ok').checked = true; B.$('#rs-ok').dispatchEvent(new B.w.Event('change', { bubbles: true }));
  okm(!B.$('#rs-go').disabled, 'confirmation enables restore');
  B.$('#rs-go').click(); await sleep(50);
  okm(B.w.localStorage.getItem('smq3-progress') === JSON.stringify(bk.data['smq3-progress']) && B.w.localStorage.getItem('smq3-db') === JSON.stringify(bk.data['smq3-db']) && /복원했습니다/.test(B.$('#rs-msg').textContent), 'restore writes the backup data');
  okm(JSON.parse(B.w.localStorage.getItem('smq3-undo')).data['smq3-progress'] === prevB, 'the data before the restore is kept for undo');
  // in-memory state cannot overwrite the restored data before the reload
  B.w.SMQ_STORE.set('smq3-progress', { by: {} }); okm(B.w.localStorage.getItem('smq3-progress') === JSON.stringify(bk.data['smq3-progress']), 'writes are locked after a restore until the page reloads');
  // rollback: a refused write during restore leaves every key as it was
  const C = boot({ 'smq3-progress': { plat, by: { [plat]: { stars: { easy: {}, std: { '1-4': 1 }, hard: {} }, best: {}, ai: {}, cards: {}, missions: {} } } } }); await sleep(600);
  const keys = ['smq3-progress', 'smq3-designs', 'smq3-db', 'smq3-lab', 'smq3-id'], snap = keys.map((k) => C.w.localStorage.getItem(k));
  const realC = C.w.Storage.prototype.setItem;
  C.w.Storage.prototype.setItem = function (k, v) { if (k === 'smq3-db') { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; } return realC.call(this, k, v); };
  const res = C.w.SMQ_STORE.restore(bk, {});
  C.w.Storage.prototype.setItem = realC;
  okm(!res.ok && /되돌렸습니다/.test(res.err) && keys.every((k, i) => C.w.localStorage.getItem(k) === snap[i]), 'a refused write during restore → error, every key rolled back');
  // undo after a restore
  const D = boot({ 'smq3-progress': { plat, by: { [plat]: { stars: { easy: {}, std: { '1-5': 1 }, hard: {} }, best: {}, ai: {}, cards: {}, missions: {} } } } }); await sleep(600);
  const pD = D.w.localStorage.getItem('smq3-progress');
  okm(D.w.SMQ_STORE.restore(bk, {}).ok && D.w.SMQ_STORE.undo().ok && D.w.localStorage.getItem('smq3-progress') === pD, 'undo returns the data from before the restore');
  // ---- release review finding: corrupted stored data was dropped from the backup and the backup still validated (v1.0.1) ----
  //   before the fix: makeBackup skipped an unparsable key, the game then overwrote it with defaults, validate() → ok, no warning
  okm(bk.complete === true && !bk.problems && !bk.unreadable && w.SMQ_STORE.validate(bk).incomplete === false, 'a clean backup is complete (no problems, no unreadable)');
  { const old = JSON.parse(JSON.stringify(bk)); delete old.complete; const vo = w.SMQ_STORE.validate(old); okm(vo.ok && !vo.incomplete, 'a v1.0 backup without the completeness fields still validates (compatibility)'); }
  const DB_RAW = '[{"lv":"1-1","pf":"si1310","src":"H","p":{"w":0.4},"y":1,"a":1,"t":1},{"lv":"1-3","pf":"si1', LAB_RAW = '[1,2]';
  const E = boot({ 'smq3-progress': seed['smq3-progress'], 'smq3-designs': seed['smq3-designs'], 'smq3-id': '1-1' }, { 'smq3-db': DB_RAW, 'smq3-lab': LAB_RAW }); await sleep(600);
  const q0 = JSON.parse(E.w.localStorage.getItem('smq3-quarantine') || '{}');
  okm(q0['smq3-db'] && q0['smq3-db'][0].raw === DB_RAW && q0['smq3-db'][0].kind === 'parse' && q0['smq3-lab'] && q0['smq3-lab'][0].kind === 'structure', 'start-up: the unparsable Design DB and the malformed Lab state are copied verbatim to smq3-quarantine');
  okm(/읽을 수 없는/.test(E.$('#save-chip').title) && E.$('#save-chip').dataset.st === 'advice', `save chip asks for a backup: ${E.$('#save-chip').title}`);
  E.$('#save-chip').click(); await sleep(100);
  okm(/읽을 수 없는 데이터/.test(E.$('#data-status').textContent) && /Design DB/.test(E.$('#data-status').textContent) && E.$('#bk-qclear'), 'data dialog lists the unreadable keys and the kept raw text');
  E.$('#bk-copy').click(); await sleep(150);   // persist() + persistDB() run first: the game now overwrites smq3-db with its default
  let be = null; try { be = JSON.parse(E.$('#bk-ta').value); } catch (e) { be = null; }
  okm(E.w.localStorage.getItem('smq3-db') !== DB_RAW, 'the game has overwritten the corrupted key (the raw text survives only in quarantine)');
  okm(be && be.complete === false && be.problems.some((p) => p.key === 'smq3-db') && be.problems.some((p) => p.key === 'smq3-lab'), `backup is marked incomplete: ${be && be.problems.map((p) => p.key + ':' + p.kind).join(', ')}`);
  okm(be && be.unreadable['smq3-db'].some((e) => e.raw === DB_RAW) && be.unreadable['smq3-lab'].some((e) => e.raw === LAB_RAW) && /^fnv1a32:/.test(be.unreadable_checksum), 'the raw text is in the backup verbatim (unreadable) with its own checksum');
  okm(/불완전한 백업/.test(E.$('#bk-msg').textContent), `the copy message says the backup is incomplete: ${E.$('#bk-msg').textContent.slice(0, 60)}`);
  const ve = E.w.SMQ_STORE.validate(be);
  okm(ve.ok && ve.incomplete === true && /불완전한 백업/.test(ve.warnings[0]) && /smq3-db/.test(ve.warnings[0]), 'validate: restorable but INCOMPLETE with a warning (not a silent PASS)');
  { const t = JSON.parse(JSON.stringify(be)); t.unreadable['smq3-db'][0].raw = t.unreadable['smq3-db'][0].raw.slice(0, 20); okm(!E.w.SMQ_STORE.validate(t).ok && /원문의 체크섬/.test(E.w.SMQ_STORE.validate(t).errors.join()), 'edited raw text → checksum error'); }
  { const t = JSON.parse(JSON.stringify(be)); delete t.problems; t.complete = true; okm(E.w.SMQ_STORE.validate(t).incomplete === true, 'raw text present → incomplete even if the flags are removed'); }
  // a read the browser refuses is a problem too, never an absent key
  { const rg = E.w.Storage.prototype.getItem; E.w.Storage.prototype.getItem = function (k) { if (k === 'smq3-designs') { const e = new Error('denied'); e.name = 'SecurityError'; throw e; } return rg.call(this, k); };
    const br = E.w.SMQ_STORE.makeBackup(false); E.w.Storage.prototype.getItem = rg;
    okm(br.complete === false && br.problems.some((p) => p.key === 'smq3-designs' && p.kind === 'read') && E.w.SMQ_STORE.validate(br).incomplete, 'a refused read → incomplete backup with the key listed'); }
  // restoring the incomplete backup elsewhere: the restore screen says so, the unreadable keys are not deleted, the raw text is kept
  const LAB_F = { [plat]: { d: null, done: { schematic: true }, v: 2 } };
  const F = boot({ 'smq3-progress': { plat, by: { [plat]: { stars: { easy: {}, std: { '1-2': 1 }, hard: {} }, best: {}, ai: {}, cards: {}, missions: {} } } }, 'smq3-lab': LAB_F }); await sleep(600);
  F.$('#save-chip').click(); await sleep(50);
  F.$('#rs-ta').value = JSON.stringify(be); F.$('#rs-check').click(); await sleep(50);
  okm(/불완전한 백업/.test(F.$('#rs-out').textContent) && F.$('#rs-go'), 'restore check shows "불완전한 백업" next to the checksum');
  F.$('#rs-ok').checked = true; F.$('#rs-ok').dispatchEvent(new F.w.Event('change', { bubbles: true })); F.$('#rs-go').click(); await sleep(50);
  const qF = JSON.parse(F.w.localStorage.getItem('smq3-quarantine') || '{}');
  okm(F.w.localStorage.getItem('smq3-lab') === JSON.stringify(LAB_F) && F.w.localStorage.getItem('smq3-progress') === JSON.stringify(be.data['smq3-progress']), 'restore: the key the backup could not carry (smq3-lab) is left as it was; the rest is restored');
  okm(qF['smq3-db'] && qF['smq3-db'].some((e) => e.raw === DB_RAW) && /손상 원문 \d+건/.test(F.$('#rs-msg').textContent), 'restore copies the raw text into this browser\'s quarantine for recovery');
  // clearing the kept raw text needs a confirmation
  E.w.confirm = () => false; E.$('#bk-qclear').click(); okm(E.w.localStorage.getItem('smq3-quarantine'), 'declined confirmation keeps the raw text');
  E.w.confirm = () => true; E.$('#bk-qclear').click(); okm(!E.w.localStorage.getItem('smq3-quarantine'), 'confirmed: the kept raw text is removed');
  okm(![A, B, C, D, E, F].some((x) => x.errs.length), `no page errors (${[A, B, C, D, E, F].flatMap((x) => x.errs).slice(0, 2).join(' | ')})`);
  console.log(fail ? `FAILED ${fail}` : 'backup checks passed'); process.exit(fail ? 1 : 0);
})();
