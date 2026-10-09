// Upgrade flow e2e (jsdom, dist/index.html):
//   1-7  a new player starts in Guided mode at step 1 with only ΔL / φ; the spectrum axis follows the platform band;
//        solving step 1 marks it done without awarding stars; step 2 values are written into the real 1-7 design;
//        Full Design shows every parameter; a player who already has 1-7 stars starts in Full Design.
//   D-1  the rectangular layout exposes the boundary parameters, presets rewrite W × H, an impossible target is reported as
//        Infeasible with alternatives, and the export carries the pcell 'spiral_rect' with the same boundary.
// node test/e2e/flow.js [platform]
const { JSDOM } = require('jsdom'); const fs = require('fs');
const html = fs.readFileSync(require('path').join(__dirname, '../../dist/index.html'), 'utf8');
const plat = process.argv[2] || 'si1550';
let fail = 0; const bad = (m) => { fail++; console.log('  FAIL', m); }, okm = (c, m) => { if (!c) bad(m); else console.log('  ok', m); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function boot(seed) {
  const dom = new JSDOM('<!doctype html><html><head></head><body>' + html + '</body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://f' + Date.now() + Math.random().toString(36).slice(2) + '.test/' });
  const w = dom.window;
  const mkCtx = () => { const g = () => ({ addColorStop() {} }); return new Proxy({}, { get: (t, k) => { if (k === 'measureText') return () => ({ width: 30 }); if (k === 'createImageData') return (a, b) => ({ data: new Uint8ClampedArray(a * b * 4) }); if (k === 'createLinearGradient' || k === 'createRadialGradient') return g; if (k in t) return t[k]; return typeof k === 'string' ? (() => {}) : undefined; }, set: (t, k, v) => { t[k] = v; return true; } }); };
  w.HTMLCanvasElement.prototype.getContext = mkCtx; w.ResizeObserver = class { observe() {} };
  Object.defineProperty(w.HTMLElement.prototype, 'clientWidth', { get() { return 700; } });
  w.atob = (s) => Buffer.from(s, 'base64').toString('binary');
  const errs = []; w.addEventListener('error', (e) => errs.push(e.message));
  if (seed) seed(w);
  w.eval(html.split('<script>')[1].split('</script>')[0]);
  const $ = (s) => w.document.querySelector(s), $$ = (s) => [...w.document.querySelectorAll(s)];
  const set = async (k, v) => { const r = $('#p-' + k); if (!r) { bad('no control #p-' + k); return; } r.value = String(v); r.dispatchEvent(new w.Event('input', { bubbles: true })); r.dispatchEvent(new w.Event('change', { bubbles: true })); await sleep(60); };
  const start = async () => { await sleep(300); $(`#pick-lam .choice[data-lam="${plat.endsWith('1310') ? 1.31 : 1.55}"]`).click(); $(`#pick-mat .choice[data-mat="${plat.startsWith('sin') ? 'sin' : 'si'}"]`).click(); $('#btn-start').click(); await sleep(400); };
  const go = async (id) => { $(`.node[data-id="${id}"]`).click(); await sleep(500); };
  const store = (k) => JSON.parse(w.localStorage.getItem(k) || 'null');
  return { w, $, $$, set, start, go, store, errs };
}
const keys = ($$) => $$('#prm-list .prm input[id^="p-"]').map((e) => e.id.slice(2));

(async () => {
  console.log(`flow e2e · ${plat}`);
  /* ---------------- 1-7 guided learning ---------------- */
  const A = boot(); await A.start(); await A.go('1-7');
  const { $, $$, w } = A;
  okm(!$('#m-guided').hidden, '1-7 shows the learning path');
  okm($('[data-gm="guided"]').getAttribute('aria-checked') === 'true', 'new player starts in Guided mode');
  okm($('.stp[aria-current="step"]') && $('.stp[aria-current="step"]').dataset.step === '0', 'step 1 is the current step');
  okm(keys($$).sort().join() === 'mL,mP', `step 1 exposes only ΔL and φ (${keys($$)})`);
  let ctx = w.GAME_CTX(); const pf = ctx.pf;
  // the spectrum axis follows the band (the C-band platforms used to be drawn on the O-band axis)
  const ticks = $$('#chart svg text').map((t) => +t.textContent.trim()).filter((v) => v > 1000 && v < 1700);
  okm(ticks.length >= 3 && ticks.every((v) => v > pf.ch[0] * 1000 - 80 && v < pf.ch[3] * 1000 + 80), `spectrum axis ticks ${ticks.join('/')} lie in ${pf.band}`);
  // solve step 1 the way the coach explains it: ΔL = λ²/(n_g·40 nm), then φ so that λ_A exits Bar
  const X = ctx.K._x, lm = (pf.ch[0] + pf.ch[1]) / 2, L40 = lm * lm / (X.ngLam(pf.w0, lm) * 0.04);
  const mL = +L40.toFixed(2), ne = X.neffAt(pf.w0, pf.t, pf.ch[0]); let t = 1 - 2 * ne * mL / pf.ch[0]; t = ((t + 1) % 2 + 2) % 2 - 1;
  await A.set('mL', mL); await A.set('mP', +t.toFixed(2)); await sleep(300);
  ctx = w.GAME_CTX();
  okm(ctx.step && ctx.step.goals.every((g) => g.ok || g.na), 'step 1 goals met (FSR 40 nm, λ_A → Bar, λ_B → Cross)');
  okm(/완료/.test($('#m-stepnote').textContent), 'step 1 marked complete');
  okm($$('.stp.done').length === 1, 'stepper shows one completed step');
  const pr = A.store('smq3-progress'), ns = (pr && pr.by && pr.by[plat]) || {};
  okm(!['easy', 'std', 'hard'].some((m) => ns.stars && ns.stars[m] && ns.stars[m]['1-7']) && !(ns.cards || {})['1-7'], 'no stars or design card awarded during a learning step');
  // step 2: its ΔL₁ is the real 1-7 design value
  $('#step-next').click(); await sleep(500);
  okm($('.stp[aria-current="step"]').dataset.step === '1', '"다음 단계" moves to step 2');
  okm(keys($$).sort().join() === 'dL1,t1', `step 2 exposes ΔL₁ and φ₁ (${keys($$)})`);
  const v = +(pf.lc * pf.lc / (X.ngAt(ctx.d.wa || pf.w0, pf.t) * 0.04)).toFixed(2);
  await A.set('dL1', v); await sleep(700);
  $('[data-gm="full"]').click(); await sleep(500);
  const full = keys($$);
  okm(full.length > 4 && full.includes('dL1') && full.includes('ord'), `Full Design shows all parameters (${full.length})`);
  okm(Math.abs(+$('#p-dL1').value - v) < 1e-9, `ΔL₁ = ${v} µm chosen in step 2 is the Full Design value`);
  okm(Math.abs(((A.store('smq3-designs') || {})[plat] || {})['1-7'].dL1 - v) < 1e-9, 'and it is stored in the 1-7 design');
  // jumping straight to a later step (skip) works
  $('.stp[data-step="3"]').click(); await sleep(500);
  okm($('[data-gm="guided"]').getAttribute('aria-checked') === 'true' && $('.stp[aria-current="step"]').dataset.step === '3', 'a step number jumps directly to that step');
  okm(keys($$).sort().join() === 'ord,t1,t2a,t2b', `step 4 exposes order and trims (${keys($$)})`);

  /* ---------------- existing player skips to Full Design ---------------- */
  const B = boot((w2) => {
    const ns2 = { stars: { easy: {}, std: { '1-7': 1 }, hard: {} }, best: {}, ai: {}, cards: {}, missions: {} };
    w2.localStorage.setItem('smq3-progress', JSON.stringify({ plat, by: { [plat]: ns2 } }));
  });
  await sleep(300); if (!B.$('.node[data-id="1-7"]')) await B.start(); await B.go('1-7');
  okm(B.$('[data-gm="full"]') && B.$('[data-gm="full"]').getAttribute('aria-checked') === 'true', 'a player with 1-7 stars starts in Full Design');
  okm(keys(B.$$).length > 4, 'and sees every parameter');

  /* ---------------- D-1 rectangular spiral ---------------- */
  await A.go('D-1'); await A.set('lay', 2); await sleep(400);
  const rk = keys($$);
  okm(['bp', 'ec', 'port', 'dm', 'tau', 'env', 'rc', 'tl'].every((k) => rk.includes(k)), `rectangular layout exposes boundary / target / corner parameters (${rk.join(',')})`);
  await A.set('bp', 0); await sleep(500);
  let dd = ((A.store('smq3-designs') || {})[plat] || {})['D-1'] || {};
  okm(dd.bw === 5 && dd.bh === 5, `preset 5×5 rewrites the boundary (${dd.bw}×${dd.bh} mm)`);
  await A.set('bp', 2); await sleep(400);
  dd = ((A.store('smq3-designs') || {})[plat] || {})['D-1'] || {};
  okm(dd.bw === 10 && dd.bh === 30, `preset 10×30 (${dd.bw}×${dd.bh} mm)`);
  okm(!/Infeasible/.test($('#objs').textContent), 'the default target fits in 10×30');
  const tauMax = +$('#p-tau').max; await A.set('bp', 0); await A.set('env', 0.1); await A.set('tau', tauMax); await sleep(500);
  okm(/Infeasible/.test($('#objs').textContent), `τ = ${tauMax} ns in 5×5 at f = 10% is reported as Infeasible in the objectives`);
  okm(/Infeasible/.test($('#coach').textContent) && /대안/.test($('#coach').textContent), 'the coach states the reason and the alternatives');
  ctx = w.GAME_CTX(); okm(ctx.res && ctx.res.alts && ctx.res.alts.length >= 2, `with ${ctx.res && ctx.res.alts ? ctx.res.alts.length : 0} alternatives`);
  await A.set('bp', 2); await A.set('env', 1); await A.set('tau', ctx.l.tau); await sleep(500);
  $('#btn-export').click(); await sleep(80);
  let j = null; try { j = JSON.parse($('#jsonOut').value); } catch (e) { j = null; }
  const g = j && j.geometry;
  okm(g && g.pcell === 'spiral_rect' && g.boundary.W_um === 10000 && g.boundary.H_um === 30000, 'export carries pcell spiral_rect with the 10×30 mm boundary');
  okm(g && Math.abs(g.tau_ns - ctx.l.tau) < 1e-4 && j.predicted, `exported delay ${g && g.tau_ns} ns = target, predicted block present`);

  okm(!A.errs.length && !B.errs.length, `no page errors (${A.errs.concat(B.errs).slice(0, 3).join(' | ')})`);
  console.log(fail ? `FAILED ${fail}` : 'flow checks passed'); process.exit(fail ? 1 : 0);
})();
