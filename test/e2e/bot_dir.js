// Direction-hint player: follows only the coach's "방향" tier (which knob, which way — no numbers), nudging a slider a few
// steps per move like a person would. Measures whether a level/step can be finished on direction hints alone.
//   node test/e2e/bot_dir.js <level> <platform> [steps e.g. 2,3,full] — prints moves used per step and the result
// Not part of CI: it is a usability probe (a person reads the explanation too; this player reads only the coach line).
const { JSDOM } = require('jsdom'); const fs = require('fs');
const html = fs.readFileSync(require('path').join(__dirname, '../../dist/index.html'), 'utf8');
const dom = new JSDOM('<!doctype html><html><head></head><body>' + html + '</body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://d' + Date.now() + '.test/' });
const w = dom.window;
const mkCtx = () => { const g = () => ({ addColorStop() {} }); return new Proxy({}, { get: (t, k) => { if (k === 'measureText') return () => ({ width: 30 }); if (k === 'createImageData') return (a, b) => ({ data: new Uint8ClampedArray(a * b * 4) }); if (k === 'createLinearGradient' || k === 'createRadialGradient') return g; if (k in t) return t[k]; return typeof k === 'string' ? (() => {}) : undefined; }, set: (t, k, v) => { t[k] = v; return true; } }); };
w.HTMLCanvasElement.prototype.getContext = mkCtx; w.atob = (x) => Buffer.from(x, 'base64').toString('binary'); w.ResizeObserver = class { observe() {} };
Object.defineProperty(w.HTMLElement.prototype, 'clientWidth', { get() { return 700; } });
const errs = []; w.addEventListener('error', (e) => errs.push(e.message));
w.eval(html.split('<script>')[1].split('</script>')[0]);
const $ = (s) => w.document.querySelector(s), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const coach = () => ($('#coach').hidden ? '' : $('#coach').textContent.replace(/\s+/g, ' ').trim());
const id = process.argv[2] || '2-3R', plat = process.argv[3] || 'si1310', want = (process.argv[4] || '2,3,full').split(','), MAX = +(process.env.MAXIT || 150);
const sliders = () => Object.fromEntries([...w.document.querySelectorAll('.prm')].map((p) => [p.querySelector('label i').textContent.trim(), p.querySelector('input')]));
// a move: n slider steps, or a fraction of the slider for the coach's how-far words (조금 / 꽤 / 크게)
const FRAC = { '아주 조금': 0.008, 조금: 0.03, 꽤: 0.1, 크게: 0.25 };
const nudge = (inp, dir, n, word) => { const st = +inp.step, span = +inp.max - +inp.min, dv = word && /한두 칸/.test(word) ? st : word ? Math.max(st, FRAC[word] * span / Math.max(1, n === 1 ? 2 : 1)) : st * n, v = +inp.value + dir * dv; inp.value = String(Math.min(+inp.max, Math.max(+inp.min, v))); inp.dispatchEvent(new w.Event('input', { bubbles: true })); };
// every "(sym)를 키우…/줄이…" in the line, plus the few plain-word directions the ring steps use
function moves(t) {
  const sm = sliders(), out = [], re = /\(([^()]+)\)를 (?:(아주 조금|조금|꽤|크게|한두 칸\(−\/\+ 버튼으로\)) )?(키우|줄이)/g; let m;
  const rec = (t.match(/추천(?: 한 수)?: (.*)$/) || [])[1] || ''; while ((m = re.exec(rec))) if (sm[m[1]]) out.push([sm[m[1]], m[3] === '키우' ? 1 : -1, m[2]]);
  if (!out.length) {
    const plain = [[/R을 키우세요/, 'R', 1], [/R을 줄이세요/, 'R', -1], [/간격을 줄이세요/, 'g', -1], [/간격을 넓히세요/, 'g', 1], [/히터를 올리세요/, 'P_h', 1], [/히터를 내리세요/, 'P_h', -1]];
    for (const [r, s, d] of plain) if (r.test(t)) { const k = Object.keys(sm).find((x) => x.replace(/\s/g, '') === s.replace('_', '') || x === s); if (k) out.push([sm[k], d]); }
  }
  return out;
}
async function runStep(label) {
  let used = 0, last = '', same = 0;
  for (let i = 0; i < MAX; i++) {
    await sleep(+(process.env.WAIT || 350)); const t = coach(), done = $('#m-stepnote') && /완료 ✓/.test($('#m-stepnote').textContent);
    if (label !== 'full' && done) return { used, ok: true };
    if (label === 'full') { const ob = [...w.document.querySelectorAll('.obj')].slice(0, 2).map((o) => o.classList.contains('live')); if (ob[0] && ob[1]) return { used, ok: true, stars: '★★' }; }
    // a person reads a tile the coach points to (e.g. "‘필요 히터 @T’ 타일 값까지") and drags the slider there
    const tileRef = t.match(/‘([^’]+)’ 타일 값까지/), tile = tileRef && [...w.document.querySelectorAll('.tile')].find((x) => x.querySelector('.l') && x.querySelector('.l').textContent.trim() === tileRef[1]);
    if (tile && /히터 전력\(Ph\)/.test(t) && $('#p-sP')) { const v = parseFloat(tile.querySelector('.v').textContent); if (Number.isFinite(v) && Math.abs(v - +$('#p-sP').value) > 1e-9) { $('#p-sP').value = String(v); $('#p-sP').dispatchEvent(new w.Event('input', { bubbles: true })); used++; continue; } }
    const mv = moves(t); if (!mv.length) return { used, ok: false, stuck: `${t.slice(0, 160)} | design ${JSON.stringify(w.GAME_CTX().d)}` };
    same = t === last ? same + 1 : 0; last = t; const n = same > 4 ? 1 : 3;   // smaller nudges when the same advice repeats (overshoot)
    if (process.env.V) console.log('   ', i, mv.map(([inp, d]) => inp.dataset.k + (d > 0 ? '+' : '-')).join(' '), '|', process.env.V === '2' ? JSON.stringify(w.GAME_CTX().d) : '', t.slice(0, 170));
    mv.forEach(([inp, d, word]) => nudge(inp, d, n, word)); used++;
  }
  const ob = [...w.document.querySelectorAll('.obj')].map((o) => (o.classList.contains('live') ? '✓' : '✗')).join('');
  return { used, ok: false, stuck: `max moves · ${ob} · ${coach().slice(0, 140)}` };
}
(async () => {
  await sleep(300);
  $(`#pick-lam .choice[data-lam="${plat.endsWith('1310') ? 1.31 : 1.55}"]`).click(); $(`#pick-mat .choice[data-mat="${plat.startsWith('sin') ? 'sin' : 'si'}"]`).click(); $('#btn-start').click(); await sleep(300);
  $(`.node[data-id="${id}"]`).click(); await sleep(300);
  $('#hint-seg button[data-h="1"]').click(); await sleep(200);
  for (const s of want) {
    if (s === 'full') { const g = $('[data-gm="full"]'); if (g) g.click(); } else { const g = $('[data-gm="guided"]'); if (g && g.getAttribute('aria-checked') !== 'true') g.click(); await sleep(150); $(`.stp[data-step="${+s - 1}"]`).click(); }
    await sleep(300);
    const r = await runStep(s); console.log(`${id} ${plat} step ${s}: ${r.ok ? `done in ${r.used} moves${r.stars ? ' ' + r.stars : ''}` : `NOT done after ${r.used} moves — ${r.stuck}`}`);
  }
  console.log('errors', errs.slice(0, 3)); process.exit(0);
})();
