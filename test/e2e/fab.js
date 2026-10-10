// Fab Run reproducibility + same-wafer comparison (v1.0 §5, §7.4), jsdom on dist/index.html.
//   every run logs seed / platform / difficulty / design hash / dies / passes / yield / model / time; a fixed seed on the same
//   design reproduces the run exactly; the baseline comparison applies one wafer's die-by-die variation to both designs and
//   changes no credit, star or card.   node test/e2e/fab.js [platform]
const { JSDOM } = require('jsdom'); const fs = require('fs');
const html = fs.readFileSync(require('path').join(__dirname, '../../dist/index.html'), 'utf8');
const plat = process.argv[2] || 'si1310';
let fail = 0; const okm = (c, m) => { if (!c) { fail++; console.log('  FAIL', m); } else console.log('  ok', m); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  console.log(`fab reproducibility · ${plat}`);
  const dom = new JSDOM('<!doctype html><html><head></head><body>' + html + '</body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://fab' + Date.now() + '.test/' });
  const w = dom.window, errs = []; w.addEventListener('error', (e) => errs.push(e.message));
  const g = () => ({ addColorStop() {} });
  w.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: (t, k) => (k === 'measureText' ? () => ({ width: 30 }) : k === 'createImageData' ? (a, b) => ({ data: new Uint8ClampedArray(a * b * 4) }) : k === 'createLinearGradient' || k === 'createRadialGradient' ? g : k in t ? t[k] : () => {}), set: (t, k, v) => { t[k] = v; return true; } });
  w.ResizeObserver = class { observe() {} };
  Object.defineProperty(w.HTMLElement.prototype, 'clientWidth', { get() { return 700; } });
  const prog = { plat, by: { [plat]: { stars: { easy: {}, std: { '3A+': 1 }, hard: {} }, best: {}, ai: {}, cards: {}, missions: {} } } };
  // each platform's calibrated reference designs (a Si 1-4 MMI would break the SiN design rules)
  const PS = require('../../src/data/pspec.json')[plat];
  w.localStorage.setItem('smq3-progress', JSON.stringify(prog)); w.localStorage.setItem('smq3-designs', JSON.stringify({ [plat]: { '1-4': { ...PS['1-4'].ref }, '3A+': { ...PS['3A+'].ref, mod: 0 } } })); w.localStorage.setItem('smq3-id', JSON.stringify('1-4'));
  w.eval(html.split('<script>')[1].split('</script>')[0]);
  const $ = (s) => w.document.querySelector(s), P = () => JSON.parse(w.localStorage.getItem('smq3-progress')).by[plat];
  await sleep(500);
  const tape = async () => { $('#btn-fab').click(); for (let i = 0; i < 100 && /진행 중/.test($('#btn-fab').textContent); i++) await sleep(100); await sleep(700); };
  // 1) a run is logged with everything needed to reproduce it
  await tape();
  const L1 = (P().fab || {})['1-4'] || [], r1 = L1[0];
  okm(r1 && Number.isInteger(r1.seed) && r1.plat === plat && r1.mode === 'std' && /^[0-9a-f]{8}$/.test(r1.hash) && r1.n === 69 && r1.pass >= 0 && r1.y === +(r1.pass / r1.n).toFixed(4) && r1.model && r1.t, `run logged: seed ${r1 && r1.seed} · ${r1 && r1.pass}/${r1 && r1.n} · hash ${r1 && r1.hash} · ${r1 && r1.model}`);
  okm(/95 % 구간/.test($('#fab-repro').textContent) && /Monte Carlo/.test($('#fab-repro').textContent) && /독립 표본이 아니/.test($('#fab-repro').textContent), 'the panel states seed, sample count, Monte Carlo estimate, the 95 % interval and spatial correlation');
  // 2) fixed seed + same design → identical result
  $('[data-seed="fix"]').click(); await sleep(50);
  okm(/고정/.test($('#fab-repro').textContent), 'seed fixed for the next tape-out');
  await tape();
  const r2 = P().fab['1-4'][0];
  okm(r2.seed === r1.seed && r2.pass === r1.pass && r2.hash === r1.hash, `same design + seed ${r2.seed} → same result (${r2.pass}/${r2.n} both runs)`);
  // 3) engine-level determinism of the wafer
  okm(JSON.stringify(w.eval('makeWafer(12345, 1)')) === JSON.stringify(w.eval('makeWafer(12345, 1)')), 'makeWafer(seed) is deterministic');
  // 4) same-wafer comparison on 3A+: MZM baseline vs MRR current; no credit / star / card change
  $('.node[data-id="3A+"]').click(); await sleep(1500);
  $('[data-pin="set"]').click(); await sleep(400);
  okm(!$('#cmpcard').hidden && /기준/.test($('#cmp-body').textContent) && $('#cmp-body table'), 'baseline pinned: comparison table appears');
  const r = $('#p-mod'); r.value = '1'; r.dispatchEvent(new w.Event('input', { bubbles: true })); await sleep(2500);
  okm(/MOD/.test($('#cmp-body').textContent) && /나빠짐|좋아짐/.test($('#cmp-body').textContent) && /Trade-off/.test($('#cmp-body').textContent), 'current vs baseline with deltas, changed parameter and trade-off (no single score)');
  await sleep(800); const before = JSON.stringify({ s: P().stars, c: P().cards }), cr0 = $('#btn-fab').textContent;
  $('[data-pin="fab"]').click();
  for (let i = 0; i < 300 && !/같은 웨이퍼 \(시드/.test($('#cmp-body').textContent); i++) await sleep(100);
  const pin = P().pins && P().pins['3A+'], fb = pin && pin.fab;
  okm(fb && fb.n === 69 && fb.both + fb.aOnly + fb.bOnly + fb.none === fb.n && fb.pa === fb.both + fb.aOnly && fb.pb === fb.both + fb.bOnly, `same wafer (seed ${fb && fb.seed}): baseline ${fb && fb.pa}/69 · current ${fb && fb.pb}/69 · paired counts consistent`);
  // the same dies, evaluated directly with the engine, give the same counts
  const chk = w.eval(`(() => { const l = GAME_LEV('3A+'), K = GAME_KINDS.xcvr, dies = makeWafer(${fb ? fb.seed : 1}, 1), d0 = ${JSON.stringify(pin ? pin.d : {})}, d1 = { ...d0, mod: 1 }; let a = 0, b = 0; for (const die of dies) { const p = { ...die, dt: die.dt * l.pf.dt / 0.006 }; if (K.fabPass(l, K.evaluate(l, d0, p))) a++; if (K.fabPass(l, K.evaluate(l, d1, p))) b++; } return [a, b]; })()`);
  okm(fb && chk[0] === fb.pa && chk[1] === fb.pb, `independent recount on the same seed: ${chk.join(' / ')}`);
  okm(JSON.stringify({ s: P().stars, c: P().cards }) === before && $('#btn-fab').textContent === cr0, 'comparison changed no star, card or credit');
  okm(!errs.length, `no page errors (${errs.slice(0, 2).join(' | ')})`);
  console.log(fail ? `FAILED ${fail}` : 'fab checks passed'); process.exit(fail ? 1 : 0);
})();
