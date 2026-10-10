// Learning layer + diagnostics (v1.0 §6–7), jsdom on dist/index.html:
//   first-run onboarding (once, skip / replay), learning paths A/B/C over existing missions, next recommended action,
//   Engineering Review (answers kept, explanations, no score effect), parameter → result feedback, model-confidence badges,
//   Design Lab FAIL → location / cause / knob, view-only layer toggles.   node test/e2e/learn.js
const { JSDOM } = require('jsdom'); const fs = require('fs');
const html = fs.readFileSync(require('path').join(__dirname, '../../dist/index.html'), 'utf8');
let fail = 0; const okm = (c, m) => { if (!c) { fail++; console.log('  FAIL', m); } else console.log('  ok', m); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function boot(seed) {
  const dom = new JSDOM('<!doctype html><html><head></head><body>' + html + '</body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://learn' + Date.now() + Math.random().toString(36).slice(2) + '.test/' });
  const w = dom.window, errs = []; w.addEventListener('error', (e) => errs.push(e.message));
  const g = () => ({ addColorStop() {} });
  w.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: (t, k) => (k === 'measureText' ? () => ({ width: 30 }) : k === 'createImageData' ? (a, b) => ({ data: new Uint8ClampedArray(a * b * 4) }) : k === 'createLinearGradient' || k === 'createRadialGradient' ? g : k in t ? t[k] : () => {}), set: (t, k, v) => { t[k] = v; return true; } });
  w.ResizeObserver = class { observe() {} };
  Object.defineProperty(w.HTMLElement.prototype, 'clientWidth', { get() { return 700; } });
  Object.entries(seed || {}).forEach(([k, v]) => w.localStorage.setItem(k, JSON.stringify(v)));
  w.eval(html.split('<script>')[1].split('</script>')[0]);
  return { w, $: (s) => w.document.querySelector(s), $$: (s) => [...w.document.querySelectorAll(s)], errs };
}
(async () => {
  console.log('learning layer e2e');
  // 1) first run: Stage 0 → onboarding once; path A; finish → first step
  const A = boot(), { w, $, $$ } = A; await sleep(400);
  $('#pick-lam .choice[data-lam="1.31"]').click(); $('#pick-mat .choice[data-mat="si"]').click(); $('#btn-start').click(); await sleep(600);
  okm(!$('#onb-dlg').hidden && /무엇을 하는 프로그램/.test($('#onb-h').textContent), 'a new player sees the onboarding after Stage 0');
  $('[data-opath="A"]').click(); await sleep(50);
  for (let i = 0; i < 3; i++) { $('#onb-next').click(); await sleep(50); }
  okm(/Design Valid/.test($('#onb-b').textContent) && /Foundry Readiness/.test($('#onb-b').textContent) && /백업/.test($('#onb-b').textContent), 'onboarding explains Learning Guide, Design Lab vs GDS levels, and backup');
  $('#onb-next').click(); await sleep(400);
  const UI = () => JSON.parse(w.localStorage.getItem('smq3-ui') || '{}');
  okm($('#onb-dlg').hidden && UI().onboarded === 1 && UI().path === 'A', 'finishing stores onboarded + path A');
  okm(/학습 경로 A/.test($('#pathbar').textContent) && $$('#pathbar .pb-st').length === 5 && /다음 권장: 1-1/.test($('#pathbar').textContent), `path bar: 5 steps, next recommended ${($('.pb-next') || {}).textContent}`);
  // 2) parameter → result feedback with the guide's physics and trade-off
  const r = $('#p-w'); r.value = '0.8'; r.dispatchEvent(new w.Event('input', { bubbles: true })); await sleep(300);
  okm(!$('#delta').hidden && /0\.60 µm → 0\.80 µm/.test($('#delta').textContent) && /→/.test($('#delta li') ? $('#delta li').textContent : '') && /물리적으로/.test($('#delta').textContent) && /Trade-off/.test($('#delta').textContent), 'delta box: changed knob, moved mission metrics (before → after), physical reason, trade-off');
  // 3) next recommended and path switching keep progress
  const prog0 = w.localStorage.getItem('smq3-progress');
  $('[data-path=""]').click(); await sleep(50);
  okm(/자유 탐색/.test($('#pathbar').textContent) && UI().path == null, 'path cleared → free exploration');
  $('.pb-pick[data-path="B"]').click(); await sleep(50); $('.pb-next').click(); await sleep(900);
  okm(w.GAME_SHELL.curId() === '2-3' && $('.pb-st.here') && /2-3/.test($('.pb-st.here').textContent), 'path B → next recommended opens 2-3 and marks it current');
  okm(w.localStorage.getItem('smq3-progress').length >= prog0.length, 'changing the path deletes no progress');
  // 4) Engineering Review: answers, explanations, no stars
  const st0 = JSON.stringify(JSON.parse(w.localStorage.getItem('smq3-progress')).by.si1310.stars);
  okm(!$('#m-review').hidden && $$('#m-review fieldset').length === 2, 'Engineering Review on 2-3 (MZM vs MRR, 2 questions)');
  const wrong = $('#m-review [data-rv="2-3|0|0"]'); wrong.checked = true; wrong.dispatchEvent(new w.Event('change', { bubbles: true })); await sleep(50);
  okm(/다시 생각해/.test($('#m-review').textContent) && /정답/.test($('#m-review').textContent) && /RC/.test($('#m-review').textContent), 'a wrong answer gets the engineering explanation and the right answer');
  const right = $('#m-review [data-rv="2-3|1|0"]'); right.checked = true; right.dispatchEvent(new w.Event('change', { bubbles: true })); await sleep(50);
  const rv = JSON.parse(w.localStorage.getItem('smq3-progress')).by.si1310.review;
  okm(rv && rv['2-3'][0] === 0 && rv['2-3'][1] === 0 && /맞습니다/.test($('#m-review').textContent), 'answers are kept as a learning record');
  okm(JSON.stringify(JSON.parse(w.localStorage.getItem('smq3-progress')).by.si1310.stars) === st0, 'reviews never change stars');
  // 5) model-confidence badge opens the guide's model limits
  w.GAME_SHELL.go('3A+'); await sleep(1500);
  const badge = $('#xpanel [data-conf]');
  okm(badge && /Surrogate|Assumption|Analytical|Experimental/.test(badge.textContent), 'comparison rows carry model-confidence badges (shape + text)');
  okm(/Thermal Sensitivity/.test($('#xp-body').textContent) && /Experimental ref/.test($('#xp-body').textContent) && /Conservative/.test($('#xp-body').textContent), '3A+ panel: MRR thermal sensitivity (nominal / conservative / experimental ref.)');
  badge.click(); await sleep(150);
  okm(!$('#guide-dlg').hidden && $('#g-F-h'), 'badge → Learning Guide, model limits section');
  $('#guide-close').click(); await sleep(50);
  okm(!$('#m-rate').hidden && /212\.5 Gb\/s/.test($('#m-rate').textContent) && /P802\.3dj/.test($('#m-rate').textContent), '1.6T rate definition on 3A+ (line vs data rate, FEC, standard status)');
  // 6) onboarding is not shown again; replay works
  okm($('#onb-dlg').hidden, 'onboarding is not shown again on level changes');
  $('#pathbar [data-onb]').click(); await sleep(50);
  okm(!$('#onb-dlg').hidden, 'replay from the path bar'); $('#onb-dlg [data-close]').click(); await sleep(50);
  // 7) existing player: no automatic onboarding
  const B = boot({ 'smq3-progress': { plat: 'si1310', by: { si1310: { stars: { easy: {}, std: { '1-1': 1 }, hard: {} }, best: {}, ai: {}, cards: {}, missions: {} } } } }); await sleep(600);
  okm(B.$('#onb-dlg').hidden, 'an existing player is not interrupted by the onboarding');
  // 8) Design Lab: FAIL → location, cause, knob; view-only layers; Lab review
  B.$('[data-lab]').click(); await sleep(600);
  B.$('[data-ms="1"]').click(); await sleep(300);
  const W = B.$('#lp-W'); W.value = '1.5'; W.dispatchEvent(new B.w.Event('input', { bubbles: true })); await sleep(400);
  const db = B.$('#lab-out-b [data-diag]');
  okm(!!db, 'a FAIL row offers “위치 보기”');
  db.click(); await sleep(200);
  okm(/진단/.test(B.$('#lab-sel').textContent) && /고칠 곳/.test(B.$('#lab-sel').textContent) && /Mission 2/.test(B.$('#lab-sel').textContent), 'diagnosis in the inspector: cause, the knob, a jump to the mission');
  okm(/표시: 소자/.test(B.$('#lab-sel').textContent), 'the instances named by the check are highlighted (not a guessed point)');
  const ly = B.$('[data-ly="ele"]'); ly.checked = false; ly.dispatchEvent(new B.w.Event('change', { bubbles: true })); await sleep(50);
  const L = JSON.parse(B.w.localStorage.getItem('smq3-lab')).si1310.layers;
  okm(L && L.ele === 0, 'layer toggle stored as a view preference');
  B.$('[data-ms="4"]').click(); await sleep(300);
  okm(!B.$('#lab-review').hidden && /PASS가 뜻하는/.test(B.$('#lab-review').textContent), 'Lab Mission 5 has its Engineering Review');
  okm(!A.errs.length && !B.errs.length, `no page errors (${A.errs.concat(B.errs).slice(0, 2).join(' | ')})`);
  console.log(fail ? `FAILED ${fail}` : 'learning checks passed'); process.exit(fail ? 1 : 0);
})();
