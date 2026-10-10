// ===== Game shell: campaign, scoring, objectives, coach, fab, AI rival, Design DB, cards =====
(() => {
const $ = (s) => document.querySelector(s);
const store = SMQ_STORE;   // src/persist.js: every write reports success; failures show in the header (save chip) and banner
const MODES = {
  easy: { label: '입문', th: 1.5, area: 1.3, sig: 0.6, credits: 5, maxHint: 3, hint: 2, note: '스펙 1.5배 완화 · 공정 변동 60% · 크레딧 5' },
  std: { label: '표준', th: 1.0, area: 1.0, sig: 1.0, credits: 3, maxHint: 3, hint: 1, note: '기본 스펙 · 크레딧 3' },
  hard: { label: '도전', th: 0.8, area: 0.85, sig: 1.25, credits: 2, maxHint: 1, hint: 0, note: '스펙 20% 강화 · 공정 변동 125% · 크레딧 2 · 방향 힌트까지만' }
};
const HINTS = ['끄기', '방향', '수치', '지형도'];
const LMAP = Object.fromEntries(LEVELS.map((l) => [l.id, l]));
const PLAY = LEVELS.filter((l) => !l.locked);
const popcount = (m) => ((m & 1) + ((m >> 1) & 1) + ((m >> 2) & 1));

/* ---------- persistence: everything is namespaced by platform (wavelength × material) ---------- */
let P = store.get('smq3-progress', null), DB = store.get('smq3-db', null), DES = store.get('smq3-designs', null);
const emptyNS = () => ({ stars: { easy: {}, std: {}, hard: {} }, best: {}, ai: {}, cards: {}, missions: {} });
if (!P || !P.by) {
  P = { plat: null, by: {} }; DES = {}; DB = [];
  // migrate the Si·1310 Stage-1 prototype (levels were renumbered when waveguide + DC were added)
  const old = store.get('smq2-progress', null), map = { '1-1': '1-3', '1-2': '1-4', '1-3': '1-5', '1-4': '1-6', '1-5': '1-7' };
  if (old && old.stars) {
    const ns = emptyNS(), mv = (o) => { const r = {}; Object.keys(o || {}).forEach((k) => { if (map[k]) r[map[k]] = o[k]; }); return r; };
    ['easy', 'std', 'hard'].forEach((m) => { ns.stars[m] = mv(old.stars[m]); });
    ns.best = mv(old.best); ns.ai = mv(old.ai); ns.cards = mv(old.cards); Object.values(ns.cards).forEach((c) => { c.id = Object.keys(map).find((k) => map[k] === c.id) ? map[c.id] || c.id : c.id; });
    Object.keys(ns.cards).forEach((k) => { ns.cards[k].id = k; });
    P.by.si1310 = ns; DES.si1310 = mv(store.get('smq2-designs', {}));
    DB = (store.get('smq2-db', []) || []).filter((r) => map[r.lv]).map((r) => ({ ...r, lv: map[r.lv], pf: 'si1310' }));
  }
}
if (!Array.isArray(DB)) DB = [];
DES = DES || {};
const PP = () => (P.by[state.plat] = P.by[state.plat] || emptyNS());
const DESP = () => (DES[state.plat] = DES[state.plat] || {});

const state = {
  plat: PLATFORMS[P.plat] ? P.plat : null,
  id: '1-1',
  mode: MODES[store.get('smq-mode-v1', 'std')] ? store.get('smq-mode-v1', 'std') : 'std',
  credits: {}, fab: {}, wafer: {}, fromAI: {}, seedFix: {}, cur: null, fabRunning: false, aiRunning: null, lastLogged: '', land: {}, hintTier: 1
};
{ const sid = store.get('smq3-id', '1-1'); if (LMAP[sid] && !LMAP[sid].locked) state.id = sid; }
{ const M = MODES[state.mode]; state.hintTier = clamp(store.get('smq-hint-v1', M.hint) | 0, 0, M.maxHint); }
const persist = () => { P.plat = state.plat; store.set('smq3-progress', P); store.set('smq3-designs', DES); store.set('smq3-id', state.id); };
const persistDB = () => { if (DB.length > 5000) DB = DB.slice(-5000); store.set('smq3-db', DB); };
function applyPlatform() {
  const pf = PLATFORMS[state.plat]; PQ.setPlatform(pf.mat, pf.t, pf.rules);
  Object.keys(effCache).forEach((k) => delete effCache[k]); state.land = {}; state.credits = {}; state.fab = {}; state.wafer = {}; state.fromAI = {};
  window.GAME_CARDS = PP().cards;
}

/* ---------- level / kind helpers ---------- */
const effCache = {};
function lev() {
  const k = state.plat + state.id + state.mode;
  if (!effCache[k]) {
    const pf = PLATFORMS[state.plat], b = { ...LMAP[state.id], ...((PSPEC[state.plat] || {})[state.id] || {}), pf }, M = MODES[state.mode], hb = b.hb || [];
    b.s1 = b.s1 || {}; b.s2 = b.s2 || {}; b.fab = b.fab || {}; b.bandLabel = b.band ? b.band(pf) : pf.short;
    const ns = b.ns || [], sc = (o) => { const r = {}; Object.keys(o).forEach((key) => { const v = o[key]; r[key] = v == null ? v : key === 'yMode' || ns.includes(key) ? v : key === 'y' ? (o.yMode ? o.yMode[state.mode] : v) : key === 'size' ? Math.round(v * M.area) : hb.includes(key) ? +(v / M.th).toFixed(3) : +(v * M.th).toFixed(3); }); return r; };
    effCache[k] = { ...b, s1: sc(b.s1), s2: sc(b.s2), fab: sc(b.fab) };
  }
  return effCache[k];
}
window.GAME_KINDS = KINDS;   // read-only engine access for tests and the Learning Guide examples
window.GAME_LEV = (id) => { if (!LMAP[id] || !state.plat) return null; const sv = state.id; state.id = id; const e = lev(); state.id = sv; return e; };
// read-only snapshot for the Learning Guide (src/guide.js): it explains and explores, it never writes to the design or the score
// read-only view for the PIC Design Lab (src/lab/ui.js): platform, cards, saved designs, campaign map refresh
window.GAME_SHELL = { plat: () => state.plat, pf: () => (state.plat ? PLATFORMS[state.plat] : null), cards: () => (state.plat ? PP().cards : {}), stars: (id) => starsOf(id),
  design: (id) => (state.plat ? { ...(DESP()[id] || {}) } : {}), refreshMap: () => renderMap(), busy: () => state.fabRunning || state.aiRunning != null,
  // v1.0 learning layer (src/learn.js): navigation, learning record, view prefs — never stars, scores or designs
  curId: () => state.id, levels: () => PLAY.map((l) => ({ id: l.id, name: l.name, stage: l.stage, kind: l.kind })),
  go: (id) => { if (!LMAP[id] || state.fabRunning || state.aiRunning != null) return; if (window.LABUI && window.LABUI.isOpen()) window.LABUI.close(); if (state.id !== id) { state.id = id; state.lastLogged = ''; persist(); } setupLevel(); },
  review: () => (state.plat ? (PP().review = PP().review || {}) : {}), save: () => persist(), ui: () => UI, saveUI: () => store.set('smq3-ui', UI),
  onLevel: (f) => levelHooks.push(f), progress: () => progressCount() };
const levelHooks = [];
window.GAME_CTX = () => {
  if (!state.plat || !state.cur) return null;
  const c = state.cur, K = kind(), S = c.S;
  let ob = null; if (!S && !c.pr) { try { ob = objectives(); } catch (e) { ob = null; } }
  return { id: state.id, plat: state.plat, pf: PLATFORMS[state.plat], mode: state.mode, l: c.l, lvl: LMAP[state.id], K, kindId: LMAP[state.id].kind,
    params: params().map((p) => ({ ...p })), d: { ...c.d }, res: c.res, stars: starsOf(state.id), levels: LEVELS, hasCard: (id) => !!PP().cards[id],
    ev: (d, full) => (S ? S.evaluate(c.l, d) : K.evaluate(c.l, d, null, full ? { full: true } : undefined)), tiles: (r) => (S ? (S.tiles ? S.tiles(c.l, r) : []) : K.tiles(c.l, r)),
    step: S ? { id: S.id, title: S.title, idx: stepIdx(), n: stepsOf().length, goals: S.goals(c.l, c.res, stepMem(S)) } : null,
    practice: c.pr ? { title: c.pr.title, note: c.pr.note, goals: c.pr.goals(c.l, c.res) } : null, ob,
    valid: (typeof VALID !== 'undefined' && VALID.by && (VALID.by[state.plat] || {})[state.id]) || null, canvas: $('#field') };
};
const kind = () => KINDS[LMAP[state.id].kind];
const credits0 = () => MODES[state.mode].credits;
function des() {
  const l = lev(), st = l.start, D = DESP();
  if (!D[state.id]) D[state.id] = { ...st };
  const d = D[state.id]; Object.keys(st).forEach((k) => { if (d[k] == null) d[k] = st[k]; });
  if (kind().fill) kind().fill(l, d);   // kind-specific defaults for optional design keys (e.g. layout-mode parameters)
  return d;
}

/* ---------- guided learning steps (kind.steps) and practice states (kind.practice) ----------
   A level whose kind defines steps(l) can be played as a sequence of guided steps before the full design.
   Step state lives in PP().guide[id] = { mode: 'guided' | 'full', cur, done: {stepId: t}, loc: {stepId: {k: v}}, mem: {stepId: {}} }.
   Shared keys (step params that are also level params) write into the level design; keys listed in step.local stay with the step.
   Steps never award stars, cards, AI scores or DB records — those belong to the full design. */
const guideNS = (id) => { const g = (PP().guide = PP().guide || {}); return (g[id] = g[id] || { mode: null, cur: 0, done: {}, loc: {}, mem: {} }); };
function stepMode(id) {
  const K = KINDS[LMAP[id].kind]; if (!K.steps) return null;
  const G = guideNS(id);
  // players who already cleared the level (stars in any difficulty or a card) start in Full Design and can skip the steps
  if (!G.mode) G.mode = Object.values(PP().stars).some((o) => o[id]) || PP().cards[id] ? 'full' : 'guided';
  return G.mode;
}
const stepsOf = () => (kind().steps ? kind().steps(lev()) : []);
function stepIdx() { const G = guideNS(state.id), n = stepsOf().length; return clamp(G.cur | 0, 0, Math.max(0, n - 1)); }
function curStep() { if (stepMode(state.id) !== 'guided') return null; const S = stepsOf()[stepIdx()]; return S && !S.full ? S : null; }
function stepLoc(S) { const G = guideNS(state.id); if (!G.loc[S.id]) G.loc[S.id] = S.init ? S.init(lev(), des()) : {}; return G.loc[S.id]; }
const stepMem = (S) => { const G = guideNS(state.id); return (G.mem[S.id] = G.mem[S.id] || {}); };
// current values seen by the controls: level design, step-local values, and keys a step pins (e.g. lattice order 1)
function dv() { const S = curStep(); return S ? { ...des(), ...stepLoc(S), ...(S.fixed || {}) } : des(); }
function putV(k, v) { const S = curStep(); if (S && S.local && S.local.includes(k)) stepLoc(S)[k] = v; else des()[k] = v; }
const params = () => { const S = curStep(); return S ? S.params(lev(), dv()) : kind().params(lev(), des()); };
const practiceOf = () => (!curStep() && kind().practice ? kind().practice(lev(), des()) : null);   // { note, goals(l, r) } → evaluation only
const keyOf = (d) => Object.keys(d).sort().map((k) => k + '=' + (+d[k]).toFixed(4)).join('|');
const pFmt = (p, v) => (p.labels ? `${v | 0} · ${p.labels[v | 0]}` : p.unit === 'π' ? `${(+v).toFixed(p.dec)}π` : p.unit === '차' ? `${v | 0}차` : `${(+v).toFixed(p.dec)}${p.unit ? ' ' + p.unit : ''}`);
const credits = () => (state.credits[state.id] != null ? state.credits[state.id] : (state.credits[state.id] = credits0()));
const starsOf = (id) => PP().stars[state.mode][id] | 0;

/* ---------- campaign map ---------- */
function renderMap() {
  const byStage = {}; LEVELS.forEach((l) => (byStage[l.stage] = byStage[l.stage] || []).push(l));
  $('#map').innerHTML = Object.keys(byStage).map((s) => `<div class="stage"><div class="stage-h">${STAGES[s]}</div><div class="stage-n">${byStage[s].map((l) => {
    const m = starsOf(l.id), st = [1, 2, 4].map((b) => (m & b ? '<b>★</b>' : '☆')).join('');
    return `<button class="node" data-id="${l.id}" aria-current="${l.id === state.id}" ${l.locked ? 'disabled title="준비 중"' : ''}>
      <span class="t1">${l.id}${PP().cards[l.id] ? '<span class="card-dot" title="카드 보유"></span>' : ''}</span><span class="t2">${l.name}</span><span class="stars">${l.locked ? '준비 중' : st}</span></button>`;
  }).join('')}</div></div>`).join('') + (window.LABUI ? `<div class="stage"><div class="stage-h">Design Lab (Track A 후속)</div><div class="stage-n"><button class="node lab-node" data-lab="1" aria-current="${window.LABUI.isOpen()}"><span class="t1">LAB</span><span class="t2">1.6T Tx PIC 설계</span><span class="stars">${window.LABUI.progress()}</span></button></div></div>` : '');
  const n = PLAY.filter((l) => PP().cards[l.id]).length, inLab = !!(window.LABUI && window.LABUI.isOpen()), st = LMAP[state.id].stage;
  $('#cardcount').hidden = false;
  $('#cardcount').innerHTML = `<span class="wide">부품 </span>카드 <b>${n}</b> / ${PLAY.length} · ${inLab ? 'Design Lab' : STAGES[st].split(' · ')[0]}`;
  const pf = PLATFORMS[state.plat];
  $('#brand-sub').textContent = `${inLab ? 'Design Lab · 1.6T Tx PIC' : st >= 4 ? 'Track B · FMCW LiDAR' : 'Track A · 1.6T 트랜시버'} · ${MATS[pf.mat].full} · ${pf.band}`;
  // keep the current chapter in sight on the horizontally scrolling map (the page itself does not move)
  const map = $('#map'), cur = map.querySelector(inLab ? '.lab-node' : '.node[aria-current="true"]');
  if (cur && map.clientWidth) { const x = cur.offsetLeft - map.offsetLeft, w = cur.offsetWidth; if (x < map.scrollLeft || x + w > map.scrollLeft + map.clientWidth) map.scrollLeft = Math.max(0, x - (map.clientWidth - w) / 2); }
  mapArrows();
  if (typeof miniCheck === 'function') miniCheck();
}
// mouse users have no horizontal wheel: arrows page the campaign map (touch scrolls it directly)
function mapArrows() { const m = $('#map'), max = m.scrollWidth - m.clientWidth; $('#map-l').hidden = !(max > 4 && m.scrollLeft > 4); $('#map-r').hidden = !(max > 4 && m.scrollLeft < max - 4); }
$('#map').addEventListener('scroll', () => mapArrows(), { passive: true });
['l', 'r'].forEach((k) => $('#map-' + k).addEventListener('click', () => { const m = $('#map'); m.scrollBy ? m.scrollBy({ left: (k === 'l' ? -1 : 1) * m.clientWidth * 0.8, behavior: smqMotion() }) : (m.scrollLeft += (k === 'l' ? -1 : 1) * m.clientWidth * 0.8); }));
window.addEventListener('resize', () => mapArrows());
$('#map').addEventListener('click', (e) => {
  if (e.target.closest('[data-lab]')) { if (window.LABUI && !state.fabRunning && state.aiRunning == null) { window.LABUI.open(); renderMap(); } return; }
  const b0 = e.target.closest('.node'); if (b0 && window.LABUI && window.LABUI.isOpen()) { window.LABUI.close(); renderMap(); if (b0.dataset.id === state.id) return; }
  const b = e.target.closest('.node'); if (!b || b.disabled || b.dataset.id === state.id) return;
  state.id = b.dataset.id; state.lastLogged = ''; persist(); setupLevel();
});

/* ---------- params ---------- */
function renderParams() {
  const l = lev(), K = kind(), S = curStep(), lk = !S && K.landKeys ? K.landKeys(l, des()) : [];
  let h = params().map((p) => `<div class="prm"><div class="prm-h"><label for="p-${p.k}">${p.label}<i>${p.sym}</i></label><output id="o-${p.k}" for="p-${p.k}"></output></div>
      <div class="prm-r"><button class="nudge" data-k="${p.k}" data-d="-1" aria-label="${p.label} 감소">−</button>
      <input type="range" id="p-${p.k}" data-k="${p.k}" min="${p.min}" max="${p.max}" step="${p.step}">
      <button class="nudge" data-k="${p.k}" data-d="1" aria-label="${p.label} 증가">+</button></div>${lk.includes(p.k) ? `<div class="land" id="land-${p.k}" data-k="${p.k}" hidden></div>` : ''}</div>`).join('');
  (K.toggles && !S ? K.toggles(l) : []).forEach((t) => {
    const ok = !t.needs || PP().cards[t.needs];
    h += `<label class="toggle"><input type="checkbox" id="tg-${t.k}" data-k="${t.k}" ${ok ? '' : 'disabled'}><span>${t.label}${ok ? '' : ` <span style="color:var(--fg-3)">(${t.needs} 카드 필요)</span>`}</span></label>`;
  });
  $('#prm-list').innerHTML = h;
}
function syncParamUI() {
  const d = dv(), dd = des();
  params().forEach((p) => { $('#p-' + p.k).value = d[p.k]; $('#o-' + p.k).textContent = pFmt(p, d[p.k]); });
  (kind().toggles && !curStep() ? kind().toggles(lev()) : []).forEach((t) => { const el = $('#tg-' + t.k); if (el) el.checked = !!dd[t.k] && !el.disabled; if (el && el.disabled) dd[t.k] = 0; });
}
function setParam(k, v, fromBtn) {
  const p = params().find((x) => x.k === k); if (!p) return;
  const nv = snapP(p, v);
  if (nv === dv()[k] && !fromBtn) return;
  noteChange(k, dv()[k], nv);
  putV(k, nv); state.fromAI[state.id] = false;
  const K = kind();
  if (!curStep() && K.onParam) K.onParam(lev(), des(), k);   // e.g. a boundary preset writes W and H
  if (p.relayout) {   // a discrete choice that changes the parameter list
    const had = document.activeElement && document.activeElement.dataset ? document.activeElement : null, hk = had && had.dataset.k, hd = had && had.dataset.d;
    renderParams(); syncParamUI();
    const back = hk ? document.querySelector(hd ? `.nudge[data-k="${hk}"][data-d="${hd}"]` : `#p-${hk}`) : null; if (back) back.focus();
  }
  else { if (fromBtn) $('#p-' + k).value = nv; $('#o-' + k).textContent = pFmt(p, nv); }
  requestEval(); store.pending(); scheduleCommit();
}
{
  const list = $('#prm-list');
  list.addEventListener('input', (e) => { const el = e.target; if (el.type === 'range') setParam(el.dataset.k, +el.value, false); });
  list.addEventListener('change', (e) => { const el = e.target; if (el.type === 'checkbox') { des()[el.dataset.k] = el.checked ? 1 : 0; state.fromAI[state.id] = false; requestEval(); scheduleCommit(); } });
  let holdT = null, holdI = null; const stop = () => { clearTimeout(holdT); clearInterval(holdI); holdT = holdI = null; };
  list.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('.nudge'); if (!b) return; e.preventDefault();
    const k = b.dataset.k, dir = +b.dataset.d, p = params().find((x) => x.k === k);
    const step = () => setParam(k, dv()[k] + dir * p.step, true);
    step(); stop(); holdT = setTimeout(() => { holdI = setInterval(step, 70); }, 380);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => list.addEventListener(ev, stop));
  list.addEventListener('keydown', (e) => { const b = e.target.closest('.nudge'); if (!b || (e.key !== 'Enter' && e.key !== ' ')) return; e.preventDefault(); const p = params().find((x) => x.k === b.dataset.k); setParam(p.k, dv()[p.k] + (+b.dataset.d) * p.step, true); });
  list.addEventListener('click', (e) => {
    const box = e.target.closest('.land'); if (!box) return;
    const p = params().find((x) => x.k === box.dataset.k), rc = box.getBoundingClientRect();
    const fx = (e.clientX - rc.left) / rc.width; setParam(p.k, p.min + ((fx * 320 - 4) / 312) * (p.max - p.min), true);
  });
}

/* ---------- evaluation ---------- */
let evalQueued = false;
function requestEval() { if (evalQueued) return; evalQueued = true; requestAnimationFrame(() => { evalQueued = false; evaluate(); }); }
const missionsOf = (id) => (PP().missions[id] = PP().missions[id] || {});
function scoreOf(l, res, K) {
  K = K || kind();
  if (res.drc && res.drc.length) return { perf: 0, comp: 0, total: 0 };
  const perf = K.perf(l, res), comp = K.comp ? K.comp(l, res, Object.keys(missionsOf(l.id)).length) : 300 * clamp(l.aRef / res.size, 0, 1);
  return { perf, comp, total: perf + comp };
}
function evaluate() {
  const l = lev(), K = kind(), S = curStep(), d = { ...dv() };
  if (S) {   // guided step: the step's own physics view; completion is decided by the same engine results
    const res = S.evaluate(l, d), mem = stepMem(S), G = guideNS(state.id);
    let ch = S.observe ? S.observe(l, res, mem) : false;
    if (!G.done[S.id] && S.done(l, res, mem)) { G.done[S.id] = Date.now(); ch = true; }
    state.cur = { l, d, res, sc: { perf: 0, comp: 0, total: 0 }, key: keyOf(d), robust: 0, fabHere: null, S, pr: null };
    if (ch) { persist(); renderGuided(); }
    drawView(); renderHUD(); renderObjectives(); renderDelta(); renderFabPanel(); renderHint(); scheduleIdle();
    return;
  }
  const res = K.evaluate(l, d, null, { full: true });
  if (K.missions && !state.fromAI[state.id]) { const ms = missionsOf(state.id); let nw = false; K.missions(l).forEach((m) => { if (!ms[m.id] && K.missionDone(l, res, m.id)) { ms[m.id] = Date.now(); nw = true; } }); if (nw) { persist(); setTimeout(() => { awardStars(); renderMap(); }, 0); } }
  const sc = scoreOf(l, res), key = keyOf(d), fab = state.fab[state.id], fabHere = fab && fab.key === key ? fab : null;
  const robust = fabHere && !(res.drc && res.drc.length) ? 200 * fabHere.yield : 0;
  const pr = practiceOf();
  state.cur = { l, d, res, sc: pr ? { perf: 0, comp: 0, total: 0 } : sc, key, robust: pr ? 0 : robust, fabHere: pr ? null : fabHere, S: null, pr };
  {   // a full-design guided step (e.g. CWDM step 5) completes from the level's real objectives / Fab run
    const st = stepMode(state.id) === 'guided' ? stepsOf()[stepIdx()] : null, G = guideNS(state.id);
    if (st && st.full && st.fullDone && !pr && !G.done[st.id] && st.fullDone(l, res, { fab: fabHere, ob: objectives() })) { G.done[st.id] = Date.now(); persist(); renderGuided(); }
  }
  if (K.landKeys && K.landKeys(l, d).includes('L') && K.land && !K.cheap) landFor('L');   // MMI coach needs the L sweep
  drawView(); renderHUD(); renderObjectives(); renderDelta(); renderFabPanel(); renderHint(); drawStrips(false); scheduleIdle();
}
let idleT = null;
function scheduleIdle() { clearTimeout(idleT); idleT = setTimeout(() => { computeChart(); drawStrips(true); renderCoach(); renderPanel(); renderCompare(); }, 110); }
/* ---------- baseline comparison (v1.0 §7.4): pin a design, compare the engine's own numbers; no combined score ---------- */
const CMPC = new Map();
const cmpEval = (l, K, d) => { const k = state.plat + state.id + state.mode + keyOf(d); if (!CMPC.has(k)) { if (CMPC.size > 40) CMPC.clear(); CMPC.set(k, K.evaluate(l, d, null, { full: true })); } return CMPC.get(k); };
function renderCompare(runFab) {
  const box = $('#cmpcard'), c = state.cur, K = kind();
  box.hidden = !c || !!c.S || !!c.pr || !K.compareRows; if (box.hidden) return;
  const l = c.l, pins = (PP().pins = PP().pins || {}), pin = pins[state.id];
  if (!pin) { $('#cmp-body').innerHTML = '<p class="note" style="margin:0 0 8px">지금 설계를 기준으로 고정한 뒤 파라미터를 바꾸면, 같은 엔진으로 계산한 값을 기준과 나란히 봅니다(점수·별과 무관). 같은 웨이퍼(같은 시드·같은 공정 변동)로 두 설계의 수율도 비교할 수 있습니다.</p><div class="row-btns"><button class="btn pri" data-pin="set">현재 설계를 기준으로 고정</button></div>'; return; }
  let rb; try { rb = cmpEval(l, K, pin.d); } catch (e) { rb = null; }
  if (!rb) { $('#cmp-body').innerHTML = '<p class="note">기준 설계를 이 레벨에서 다시 계산할 수 없습니다.</p><div class="row-btns"><button class="btn" data-pin="clear">기준 해제</button></div>'; return; }
  const A = K.compareRows(l, rb), B = K.compareRows(l, c.res), up = [], dn = [];
  const rows = B.map(([k, v, u, dec, better, conf], i) => {
    const a = A[i] ? A[i][1] : null, dv = a == null || !Number.isFinite(v) || !Number.isFinite(a) ? null : v - a, tol = Math.pow(10, -dec) / 2;
    const cls = dv == null || Math.abs(dv) <= tol || !better ? 'dlt-0' : (better === 'hi') === (dv > 0) ? 'dlt-up' : 'dlt-dn';
    if (cls === 'dlt-up') up.push(k); if (cls === 'dlt-dn') dn.push(k);
    const fmt = (x) => (Number.isFinite(x) ? (+x).toFixed(dec) : '—');
    return `<tr><th scope="row">${k}</th><td>${fmt(a)} ${u}</td><td>${fmt(v)} ${u}</td><td class="${cls}">${dv == null ? '—' : (dv > 0 ? '+' : '') + fmt(dv)}${cls === 'dlt-up' ? ' ▲좋아짐' : cls === 'dlt-dn' ? ' ▼나빠짐' : ''}</td><td>${confBadge(conf, true)}</td></tr>`;
  }).join('');
  const changed = params().filter((p) => pin.d[p.k] != null && +pin.d[p.k] !== +c.d[p.k]).map((p) => `${p.sym || p.k} ${pFmt(p, pin.d[p.k])} → ${pFmt(p, c.d[p.k])}`);
  const fab = pin.fab && pin.fab.cur === dhash(c.d) && pin.fab.base === dhash(pin.d) ? pin.fab : null;
  const seed = state.seedFix[state.id] != null ? state.seedFix[state.id] : (fabLog(state.id)[0] ? fabLog(state.id)[0].seed : 1067);
  let fh = '';
  if (fab) {
    const ca = wilson(fab.pa, fab.n), cb = wilson(fab.pb, fab.n);
    fh = `<p class="note" style="margin:8px 0 4px"><b>같은 웨이퍼 (시드 ${fab.seed}, ${fab.n} 다이 — 두 설계에 같은 다이별 공정 변동)</b>: 기준 ${pct(fab.pa / fab.n)} % (${pct(ca[0])}–${pct(ca[1])}) · 현재 ${pct(fab.pb / fab.n)} % (${pct(cb[0])}–${pct(cb[1])}). 다이별로: 둘 다 양품 ${fab.both} · 기준만 ${fab.aOnly} · 현재만 ${fab.bOnly} · 둘 다 불량 ${fab.none}. ${fab.aOnly + fab.bOnly <= 3 ? '차이를 만든 다이가 몇 개뿐이라 의미 있는 차이로 보기 어렵습니다.' : '갈린 다이 수를 보세요 — 같은 웨이퍼라 공정 운이 아니라 설계 차이입니다(다른 웨이퍼에서는 달라질 수 있음).'} 크레딧·별에는 반영하지 않습니다.</p>`;
  }
  $('#cmp-body').innerHTML = `<p class="note" style="margin:0 0 8px">기준: ${changed.length ? `바뀐 파라미터 ${changed.join(' · ')}` : '지금 설계와 같음'} · 고정 ${String(pin.t).slice(0, 16).replace('T', ' ')}</p>`
    + `<div class="gtbl"><table class="cmp"><tr><th>항목</th><th>기준</th><th>현재</th><th>Δ</th><th>근거</th></tr>${rows}</table></div>`
    + `<p class="note"><b>Trade-off:</b> ${up.length ? `좋아진 것 — ${up.join(', ')}` : '좋아진 항목 없음'}${dn.length ? ` / 나빠진 것 — ${dn.join(', ')}` : ''}. 하나의 점수로 합치지 않습니다 — 어떤 항목을 우선할지는 미션 목표와 시스템 요구가 정합니다.</p>`
    + fh + `<div class="row-btns"><button class="btn" data-pin="fab">같은 웨이퍼로 수율 비교 (시드 ${seed}${fabLog(state.id)[0] || state.seedFix[state.id] != null ? '' : ', 기본'})</button><button class="btn" data-pin="set">지금 설계를 새 기준으로</button><button class="btn" data-pin="load">기준 설계로 되돌리기</button><button class="btn" data-pin="clear">기준 해제</button></div>`;
  if (runFab) sameWafer(seed, pin);
}
function sameWafer(seed, pin) {
  const c = state.cur, K = kind(), l = c.l, dies = makeWafer(seed, MODES[state.mode].sig);
  let pa = 0, pb = 0, both = 0, aOnly = 0, bOnly = 0, none = 0;
  for (const die of dies) {
    const prc = { ...die, dt: die.dt * l.pf.dt / 0.006 }, a = K.fabPass(l, K.evaluate(l, pin.d, prc)), b = K.fabPass(l, K.evaluate(l, c.d, prc));
    if (a) pa++; if (b) pb++; if (a && b) both++; else if (a) aOnly++; else if (b) bOnly++; else none++;
  }
  pin.fab = { seed, n: dies.length, pa, pb, both, aOnly, bOnly, none, base: dhash(pin.d), cur: dhash(c.d), model: MODEL_VERSION };
  persist(); renderCompare();
}
$('#cmp-body').addEventListener('click', (e) => {
  const b = e.target.closest('[data-pin]'); if (!b || state.fabRunning || state.aiRunning != null || !state.cur) return;
  const pins = (PP().pins = PP().pins || {}), a = b.dataset.pin;
  if (a === 'set') { pins[state.id] = { d: { ...state.cur.d }, t: new Date().toISOString() }; persist(); renderCompare(); }
  else if (a === 'clear') { delete pins[state.id]; persist(); renderCompare(); }
  else if (a === 'load' && pins[state.id]) { DESP()[state.id] = { ...pins[state.id].d }; state.fromAI[state.id] = false; persist(); setupLevel(); }
  else if (a === 'fab' && pins[state.id]) { b.disabled = true; b.textContent = '계산 중…'; setTimeout(() => renderCompare(true), 30); }
});
// optional kind panel (e.g. the MZM vs MRR comparison): full design only, recomputed when idle
function renderPanel(run) {
  const box = $('#xpanel'), K = kind(), c = state.cur;
  let out = null;
  try { out = c && !c.S && !c.pr && K.panel && !(c.res.drc && c.res.drc.length) ? K.panel(c.l, c.res, { stars: starsOf(state.id), hasCard: !!PP().cards[state.id], run: !!run }) : null; } catch (e) { out = null; }
  box.hidden = !out; if (!out) return;
  $('#xp-title').textContent = out.title; $('#xp-body').innerHTML = out.html;
}
$('#xp-body').addEventListener('click', (e) => { const b = e.target.closest('[data-xp-run]'); if (!b) return; b.disabled = true; b.textContent = '계산 중…'; setTimeout(() => renderPanel(true), 30); });
let commitT = null;
function scheduleCommit() { clearTimeout(commitT); commitT = setTimeout(commit, 450); }
function commit() {
  const c = state.cur; if (!c) return;
  persist();
  if (c.S || c.pr || (c.res.drc && c.res.drc.length) || state.fromAI[state.id]) return;
  if (c.key !== state.lastLogged) { state.lastLogged = c.key; DB.push(rec(state.id, 'H', c.d, c.res)); persistDB(); }
  awardStars(); maybeCard();
  if (c.sc.total > (PP().best[state.id] || 0)) PP().best[state.id] = Math.round(c.sc.total);
  persist(); renderMap(); renderAI(); renderDB(); renderCards(); renderPanel();
}
const rec = (id, src, d, r) => ({ lv: id, pf: state.plat, src, p: { ...d }, y: +(+r.primary).toFixed(4), y2: r.secondary != null ? +(+r.secondary).toFixed(4) : null, a: +(+r.size).toFixed(2), t: Date.now() });

/* ---------- landscapes ---------- */
function landFor(k) {
  const l = lev(), K = kind(), d = state.cur.d, deps = K.landDeps ? K.landDeps(k, d) : Object.keys(d).filter((x) => x !== k).map((x) => d[x]);
  const sig = state.id + state.mode + k + JSON.stringify(deps), have = state.land[k];
  if (have && have.sig === sig) return have.data;
  let data;
  if (K.land) data = K.land(l, state.cur.res, k);
  else {
    const p = params().find((x) => x.k === k), xs = [];
    const N = p.unit === '차' ? (p.max - p.min + 1) : 121;
    for (let i = 0; i < N; i++) xs.push(snapP(p, p.min + (p.max - p.min) * i / (N - 1)));
    data = { xs, rs: xs.map((x) => { const nd = { ...d, [k]: x }; return K.violation(l, nd) > 0 ? null : K.evaluate(l, nd); }) };
  }
  state.land[k] = { sig, data };
  return data;
}
function landData() { const o = {}; Object.keys(state.land).forEach((k) => { o[k] = state.land[k].data; }); return o; }
function drawStrips(heavy) {
  const K = kind(), l = lev(), keys = K.landKeys && !curStep() ? K.landKeys(l, des()) : [];
  keys.forEach((k) => {
    const box = $('#land-' + k); if (!box) return;
    box.hidden = state.hintTier < 3; if (box.hidden || !state.cur) return;
    const deps = K.landDeps ? K.landDeps(k, state.cur.d) : null;
    const cached = state.land[k] && state.land[k].sig === state.id + state.mode + k + JSON.stringify(deps || Object.keys(state.cur.d).filter((x) => x !== k).map((x) => state.cur.d[x]));
    if (!cached && !heavy && !(k === 'L' && !K.cheap)) { moveMarker(box, k); return; }
    const data = landFor(k), p = params().find((x) => x.k === k);
    const W = 320, H = 50, top = 4, bot = H - 14, X = (v) => 4 + (v - p.min) / (p.max - p.min) * (W - 8), Y = (q) => top + Math.min(q, 2) / 2 * (bot - top);
    let base = '', g1 = '', g2 = '', p0 = false, p1 = false, p2 = false;
    data.xs.forEach((x, i) => {
      const r = data.rs[i]; if (!r) { p0 = p1 = p2 = false; return; }
      const q = K.q1(l, r), q2 = K.q2(l, r), px = X(x).toFixed(1), py = Y(q).toFixed(1);
      base += (p0 ? 'L' : 'M') + px + ',' + py; p0 = true;
      if (q <= 1) { g1 += (p1 ? 'L' : 'M') + px + ',' + py; p1 = true; } else p1 = false;
      if (q2 <= 1) { g2 += (p2 ? 'L' : 'M') + px + ',' + py; p2 = true; } else p2 = false;
    });
    const cur = X(dv()[k]);
    box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${p.label} 지형도: 위로 갈수록 좋은 설계">
      <line x1="4" x2="${W - 4}" y1="${Y(1)}" y2="${Y(1)}" stroke="var(--fg-3)" stroke-dasharray="2 3"/>
      <path d="${base}" fill="none" stroke="var(--line-2)" stroke-width="1.4"/>
      <path d="${g1}" fill="none" stroke="var(--pass)" stroke-width="2.4"/>
      <path d="${g2}" fill="none" stroke="var(--amber)" stroke-width="3"/>
      <line class="cur" x1="${cur}" x2="${cur}" y1="${top - 2}" y2="${bot + 2}" stroke="var(--fg)" stroke-width="1.5"/>
      <text x="4" y="${H - 2}" font-size="10" font-family="var(--mono)" fill="var(--fg-3)">${p.min}</text>
      <text x="${W / 2}" y="${H - 2}" text-anchor="middle" font-size="10" font-family="var(--mono)" fill="var(--fg-3)">초록 ★ · 주황 ★★ 성능 · 탭하면 이동</text>
      <text x="${W - 4}" y="${H - 2}" text-anchor="end" font-size="10" font-family="var(--mono)" fill="var(--fg-3)">${p.max} ${p.unit}</text></svg>`;
  });
}
function moveMarker(box, k) {
  const ln = box.querySelector('line.cur'), p = params().find((x) => x.k === k); if (!ln) return;
  const x = 4 + (dv()[k] - p.min) / (p.max - p.min) * 312; ln.setAttribute('x1', x); ln.setAttribute('x2', x);
}

/* ---------- objectives / stars / cards ---------- */
function objectives() {
  const l = lev(), K = kind(), c = state.cur, r = c.res, o = K.objectives(l, r), hasDrc = !!K.violation && l.kind === 'mmi';
  const drcOK = !(r.drc && r.drc.length);
  const ms = missionsOf(state.id), mi = K.missions ? K.missions(l).map((m) => ({ k: '미션 · ' + m.label, v: ms[m.id] ? '완료' : '미완료', ok: !!ms[m.id] })) : [];
  const t1 = (hasDrc ? [{ k: 'DRC', v: drcOK ? '통과' : r.drc.length + '건 위반', ok: drcOK }] : []).concat(mi, o.t1.map((x) => ({ ...x, ok: drcOK && x.ok })));
  const t2 = o.t2.map((x) => ({ ...x, ok: drcOK && x.ok })).concat(K.noSize ? [] : [{ k: `${K.sizeLabel} ≤ ${K.sizeFmt ? K.sizeFmt(l.s2.size) : l.s2.size} ${K.sizeUnit}`, v: `${K.sizeFmt ? K.sizeFmt(r.size) : r.size < 100 ? r.size.toFixed(1) : Math.round(r.size)} ${K.sizeUnit}`, ok: drcOK && r.size <= l.s2.size }]);
  const y = c.fabHere ? c.fabHere.yield : null;
  const t3 = [{ k: `Fab 수율 ≥ ${Math.round(l.fab.y * 100)}%`, v: y == null ? '미실시' : Math.round(y * 100) + '%', ok: y != null && drcOK && y >= l.fab.y, na: y == null }, { k: '판정', v: K.fabCrit(l), ok: null, na: true, crit: true }];
  const p1 = t1.every((x) => x.ok), p2 = p1 && t2.every((x) => x.ok), p3 = p1 && t3[0].ok;
  return [{ t: 1, items: t1, pass: p1, tag: '기본 스펙' }, { t: 2, items: t2, pass: p2, tag: '고성능 + 컴팩트' }, { t: 3, items: t3, pass: p3, tag: '양산 수율' }];
}
function awardStars() {
  if (state.fromAI[state.id] || !state.cur || state.cur.S || state.cur.pr) return;
  let m = starsOf(state.id); objectives().forEach((o, i) => { if (o.pass) m |= (1 << i); });
  PP().stars[state.mode][state.id] = m;
}
function maybeCard() {
  const c = state.cur; if (!c || c.S || c.pr) return;
  const ob = objectives(); if (!ob[0].pass || state.fromAI[state.id]) return;
  const old = PP().cards[state.id], score = Math.round(c.sc.total + c.robust);
  if (old && old.score > score) return;
  const l = lev(), card = kind().card(l, c.res);
  PP().cards[state.id] = { id: state.id, name: l.name, dev: l.dev, role: l.role, mode: state.mode, score, stars: popcount(starsOf(state.id)), lines: card.lines, model: card.model, d: { ...c.d }, yield: c.fabHere ? c.fabHere.yield : null, t: Date.now() };
}
function renderObjectives() {
  const c = state.cur;
  if (c && (c.S || c.pr)) {   // guided step / practice: goals computed from the same engine, no stars
    const g = c.S ? c.S.goals(c.l, c.res, stepMem(c.S)) : c.pr.goals(c.l, c.res), done = c.S && guideNS(state.id).done[c.S.id];
    $('#objs').innerHTML = `<div class="obj goals ${done ? 'got live' : g.every((x) => x.ok) ? 'live' : ''}"><div class="obj-h"><span class="st">${c.S ? `STEP ${stepIdx() + 1} 목표` : '연습 모드'}</span><span class="tag">${c.S ? (done ? '단계 완료 ✓' : '물리 엔진 결과로 판정') : '별·카드·AI 없음'}</span></div>
      <ul>${g.map((x) => `<li class="${x.na ? 'na' : x.ok ? 'ok' : 'no'}"><span class="k">${x.k}</span><span class="v">${x.v}</span></li>`).join('')}</ul></div>`;
    $('#m-next').innerHTML = '';
    return;
  }
  const ob = objectives(), got = starsOf(state.id);
  renderNext(got);
  $('#objs').innerHTML = ob.map((o, i) => `<div class="obj ${got & (1 << i) ? 'got' : ''} ${o.pass ? 'live' : ''}">
      <div class="obj-h"><span class="st">${'★'.repeat(o.t) + '☆'.repeat(3 - o.t)}</span><span class="tag">${o.pass ? '현재 설계 달성' : o.tag}</span></div>
      <ul>${o.items.map((x) => `<li class="${x.na ? 'na' : x.ok ? 'ok' : 'no'}${x.crit ? ' crit' : ''}"><span class="k">${x.k}</span><span class="v">${x.v}</span></li>`).join('')}</ul></div>`).join('');
}
// once a level has a star, offer the way forward right under the objectives (the map stays the free route)
function renderNext(got) {
  const box = $('#m-next'), i = PLAY.findIndex((l) => l.id === state.id), nx = PLAY[i + 1], l = LMAP[state.id];
  if (!got || i < 0) { box.innerHTML = ''; return; }
  const lab = window.LABUI && (state.id === '3A+' || state.id === '3W'), newStage = nx && nx.stage !== l.stage;
  const what = nx ? `다음${newStage ? ' Stage' : ''}: <b>${nx.id}</b> ${nx.name}${newStage ? ` <span class="eyebrow">${STAGES[nx.stage]}</span>` : ''}` : '마지막 레벨입니다 — 지도에서 다른 트랙이나 Design Lab으로 갈 수 있습니다.';
  box.innerHTML = `<div class="nextlv"><span><b>${'★'.repeat(popcount(got))} 획득</b> · ${what}</span><span class="row-btns" style="margin:0">${lab ? '<button class="btn" data-open-lab="1">Design Lab에서 PIC 그리기</button>' : ''}${nx ? `<button class="btn pri" data-next="${nx.id}">다음 레벨 →</button>` : ''}</span></div>`;
}
$('#m-next').addEventListener('click', (e) => {
  if (state.fabRunning || state.aiRunning != null) return;
  const b = e.target.closest('[data-next]'), lb = e.target.closest('[data-open-lab]');
  if (lb && window.LABUI) { window.LABUI.open(); renderMap(); return; }
  if (!b || !LMAP[b.dataset.next]) return;
  state.id = b.dataset.next; state.lastLogged = ''; persist(); setupLevel();
  const m = $('#mission'); if (m.scrollIntoView) m.scrollIntoView({ block: 'start', behavior: smqMotion() });
});
/* ---------- parameter → result feedback (v1.0 §6.3 / §7.3): what changed, which mission metrics moved, why, trade-off ---------- */
// The "before" is taken when a burst of changes to one knob starts (a slider drag is one change); up to three objective rows
// that moved are shown, status flips first. The physical reason and trade-off come from the Learning Guide's parameter table.
function metricRows() {
  const c = state.cur; if (!c) return [];
  try {
    const rows = c.S ? c.S.goals(c.l, c.res, stepMem(c.S)) : c.pr ? c.pr.goals(c.l, c.res) : objectives().flatMap((o) => o.items);
    return rows.filter((x) => !x.na && !x.crit).map((x) => ({ k: String(x.k).replace(/<[^>]+>/g, ''), v: String(x.v).replace(/<[^>]+>/g, ''), ok: !!x.ok }));
  } catch (e) { return []; }
}
function noteChange(k, from, to) {
  const ch = state.chg, now = Date.now();
  if (!ch || ch.id !== state.id || ch.k !== k || now - ch.at > 1500 || !!ch.step !== !!curStep()) state.chg = { id: state.id, k, from, to, at: now, before: metricRows(), step: !!curStep() };
  else { ch.to = to; ch.at = now; }
}
const numOf = (v) => { const m = String(v).replace(/−/g, '-').match(/-?\d+(?:\.\d+)?/); return m ? +m[0] : null; };
function renderDelta() {
  const box = $('#delta'), ch = state.chg, c = state.cur;
  if (!ch || !c || ch.id !== state.id || ch.from === ch.to || ch.from == null) { box.hidden = true; return; }
  const p = params().find((x) => x.k === ch.k); if (!p) { box.hidden = true; return; }
  const now = metricRows(), prev = new Map(ch.before.map((x) => [x.k, x]));
  const moved = now.map((x) => { const b = prev.get(x.k); if (!b || b.v === x.v) return null; const a = numOf(b.v), z = numOf(x.v); return { k: x.k, from: b.v, to: x.v, flip: b.ok !== x.ok ? (x.ok ? 'pass' : 'fail') : null, rel: a != null && z != null ? Math.abs(z - a) / Math.max(1e-9, Math.abs(a)) : 0 }; }).filter(Boolean)
    .sort((a, b) => (!!b.flip - !!a.flip) || b.rel - a.rel).slice(0, 3);
  const G = window.GAME_GUIDE && window.GAME_GUIDE.content && window.GAME_GUIDE.content[LMAP[state.id].kind], row = G && G.P && G.P[ch.k];
  const up = +ch.to > +ch.from, why = row ? (up ? row.up : row.dn) : null;
  box.hidden = false;
  box.innerHTML = `<div class="dh"><b>바꾼 것</b><span>${p.label}${p.sym ? ` (${p.sym})` : ''}: ${pFmt(p, ch.from)} → ${pFmt(p, ch.to)}</span></div>`
    + (moved.length ? `<ul aria-label="미션 지표 변화">${moved.map((m) => `<li>${m.k}: ${m.from} → <b>${m.to}</b>${m.flip ? `<span class="flip ${m.flip === 'pass' ? 'st-PASS' : 'st-FAIL'}">${m.flip === 'pass' ? '✓ 이제 충족' : '✕ 이제 미달'}</span>` : ''}</li>`).join('')}</ul>` : '<p>미션 지표는 바뀌지 않았습니다 (이 손잡이는 지금 목표에 직접 걸려 있지 않거나 변화가 표시 자릿수보다 작습니다).</p>')
    + (why ? `<p><b>물리적으로</b> ${p.sym || p.k} ${up ? '↑' : '↓'}: ${why}</p>` : '')
    + (row && row.tr ? `<p><b>Trade-off</b> ${row.tr}${row.f ? ` · 관계식 <span style="font-family:var(--mono)">${row.f}</span>` : ''}</p>` : '');
}
function renderCards() {
  const slots = LEVELS.slice(), n = PLAY.filter((l) => PP().cards[l.id]).length, last = PLAY.filter((l) => PP().cards[l.id]).sort((a, b) => PP().cards[b.id].t - PP().cards[a.id].t)[0];
  $('#cards-sum').textContent = `${n} / ${PLAY.length} 보유${last ? ` · 최근 ${last.id}` : ''}`;
  $('#cardgrid').innerHTML = slots.map((l) => {
    const c = PP().cards[l.id];
    if (!c) return `<div class="pcard empty"><div class="h"><span class="id">${l.id}</span><span class="sc">${l.locked ? '준비 중' : '미획득'}</span></div><div class="nm">${l.name}</div><div class="role">${l.role}</div></div>`;
    return `<div class="pcard"><div class="h"><span class="id">${l.id}</span><span class="sc">${'★'.repeat(c.stars)} · ${c.score}점 · ${MODES[c.mode] ? MODES[c.mode].label : ''}</span></div>
      <div class="nm">${c.name}</div><div class="ln">${c.lines.join('<br>')}${c.yield != null ? `<br>수율 ${Math.round(c.yield * 100)}%` : ''}</div><div class="role">→ ${c.role || l.role}</div></div>`;
  }).join('');
}

/* ---------- HUD, view, chart ---------- */
function sizeCanvas() {
  const cv = $('#field'), w = $('#cwrap').clientWidth, K = kind(), S = curStep();
  const h = Math.max(180, Math.min(400, Math.round(w * ((S && S.aspect) || K.aspect || 0.44))));
  cv.width = Math.round(w * DPR); cv.height = Math.round(h * DPR); cv.style.height = h + 'px';
  if (state.cur) drawView();
}
function drawView() { const c = state.cur; if (c) $('#field').setAttribute('aria-label', `${c.l.id} ${c.l.name} 소자 화면 — 점수·핵심 수치는 아래 타일, 목표는 미션 카드에 텍스트로 있습니다`); if (!c || c.l.id !== state.id) return; ((c.S && c.S.draw) || kind().draw)($('#field'), c.l, c.res, { hintTier: state.hintTier, redraw: drawView }); }
function renderHUD() {
  const c = state.cur, K = kind();
  if (c.S) {
    const n = stepsOf().length;
    $('#score-big').innerHTML = `STEP ${stepIdx() + 1}<small>/${n}</small>`; $('#score-brk').textContent = c.S.title;
    $('#hud-meta').innerHTML = c.S.meta ? c.S.meta(c.l, c.res) : K.meta(c.l, c.res); $('#drcbar').hidden = true;
    $('#tiles').innerHTML = (c.S.tiles ? c.S.tiles(c.l, c.res) : []).map(([l, v]) => `<div class="tile"><div class="l">${l}</div><div class="v">${v}</div></div>`).join('');
    return;
  }
  $('#score-big').innerHTML = `${Math.round(c.sc.total + c.robust)}<small>/1000</small>`;
  $('#score-brk').textContent = `성능 ${Math.round(c.sc.perf)} · ${K.sizeLabel} ${Math.round(c.sc.comp)} · 수율 ${c.fabHere ? Math.round(c.robust) : '—'}`;
  $('#hud-meta').innerHTML = K.meta(c.l, c.res) + (state.fromAI[state.id] ? ' · <b style="color:var(--cyan)">AI 설계 표시 중</b>' : '');
  const drc = $('#drcbar'); if (c.res.drc && c.res.drc.length) { drc.hidden = false; drc.textContent = 'DRC 위반: ' + c.res.drc.join(' · '); } else drc.hidden = true;
  $('#tiles').innerHTML = K.tiles(c.l, c.res).map(([l, v]) => `<div class="tile"><div class="l">${l}</div><div class="v">${v}</div></div>`).join('');
  renderMini();
}
function computeChart() {
  const c = state.cur, src = c.S && c.S.chart ? c.S : kind(), out = src.chart(c.l, c.res);
  $('#chart').innerHTML = out.html; $('#legend').innerHTML = out.legend; $('#chart-title').textContent = src.chartTitle(c.l, c.res);
  // text alternative: the chart title and its legend (the numbers behind it are in the tiles and objectives as text)
  const svg = $('#chart svg'); if (svg) { svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', `${$('#chart-title').textContent} — ${$('#legend').textContent.replace(/\s+/g, ' ').trim()}`); }
}
function renderHint() {
  const h = $('#hint'), c = state.cur; h.hidden = state.hintTier < 2 || !c || c.l.id !== state.id;
  if (!h.hidden) { const f = c.S ? c.S.hint : kind().hint, t = f ? f(c.l, c.res) : null; h.hidden = !t; if (t) h.innerHTML = t; }
}

/* ---------- coach ---------- */
function bestMove(obj, keepSize) {
  const l = lev(), K = kind(), c = state.cur, d = c.d; let best = null;
  const consider = (k, to, r) => { if (!r || (r.drc && r.drc.length)) return; if (keepSize && !K.noSize && r.size > l.s2.size) return; const v = obj(r); if (!best || v < best.v) best = { k, to, v }; };
  if (K.moveCandidates) K.moveCandidates(l, c.res, landData()).forEach((m) => consider(m.k, m.to, m.r));
  const keys = K.moveKeys ? K.moveKeys(l) : params().filter((p) => !p.noAI).map((p) => p.k);   // layout/target choices (noAI) are the player's, not a design move
  const steps = K.cheap ? [-10, -3, -1, 1, 3, 10] : [-3, -1, 1, 3];
  keys.forEach((k) => {
    const p = params().find((x) => x.k === k);
    steps.forEach((m) => {
      const to = snapP(p, d[k] + m * p.step); if (to === d[k]) return;
      const nd = { ...d, [k]: to }; if (K.violation(l, nd) > 0) return;
      consider(k, to, K.evaluate(l, nd));
    });
  });
  return best;
}
function moveText(mv, t, cur, star) {
  const p = params().find((x) => x.k === mv.k), d = state.cur.d, up = mv.to > d[mv.k];
  if (t < 2) return ` 추천 한 수: ${p.label}(${p.sym})를 조금 ${up ? '키우세요' : '줄이세요'}.`;
  return ` 추천 한 수: ${p.sym} ${pFmt(p, d[mv.k])} → ${pFmt(p, mv.to)} (${star} 기준 대비 ${Math.round(cur * 100)}% → ${Math.round(mv.v * 100)}%).`;
}
function coachMsg() {
  const t = state.hintTier; if (!t || !state.cur) return null;
  const l = lev(), K = kind(), c = state.cur, r = c.res;
  if (c.S) {
    if (guideNS(state.id).done[c.S.id]) return { h: '단계 완료 — 다음 단계로 가세요', b: (c.S.doneText || '이 단계의 목표를 물리 엔진 결과로 확인했습니다.') + ' 위의 <b>다음 단계 →</b> 버튼으로 넘어갑니다.' };
    return c.S.coach(l, r, { tier: t, mem: stepMem(c.S) });
  }
  if (c.pr) return K.coach(l, r, { tier: t, practice: c.pr, land: landData() }) || { h: c.pr.title || '연습 모드', b: c.pr.note };
  const ob = objectives(), got = starsOf(state.id);
  const m = K.coach(l, r, { tier: t, ob1: ob[0].pass, ob2: ob[1].pass, land: landData(), fab: c.fabHere, missions: missionsOf(state.id) }); if (m) return m;
  if (r.drc && r.drc.length) return { h: 'DRC 위반', b: r.drc.join(' · ') };
  const q1 = K.q1(l, r), q2 = K.q2(l, r);
  if (!ob[0].pass) {
    const mv = bestMove((x) => K.q1(l, x), false);
    if (mv && mv.v < q1 - 0.005) return { h: '★ 스펙까지 조금 남았습니다', b: '한 칸씩 움직여 본 결과 가장 좋아지는 방향입니다.' + moveText(mv, t, q1, '★') };
    return { h: '★ 스펙까지 조금 남았습니다', b: '한 칸 이동으로는 개선되지 않습니다. 큰 파라미터(구조)를 바꿔 다른 해를 찾아보세요.' + (t < 3 ? ' 지형도 힌트가 도움이 됩니다.' : '') };
  }
  if (!ob[1].pass) {
    if (!K.noSize && r.size > l.s2.size) return { h: `★★ ${K.sizeLabel} ${K.sizeFmt ? K.sizeFmt(l.s2.size) : l.s2.size} ${K.sizeUnit} 초과`, b: `성능을 유지하면서 ${K.sizeLabel}을 줄이는 구조를 찾으세요.` };
    const qq = Math.max(q1, q2), mv = bestMove((x) => Math.max(K.q1(l, x), K.q2(l, x)), true);
    if (mv && mv.v < qq - 0.005) return { h: '★★ 성능 여유가 부족합니다', b: '목표선에 가까워졌습니다.' + moveText(mv, t, qq, '★★') };
    return { h: '★★ 성능 여유가 부족합니다', b: '한 칸 이동으로는 더 좋아지지 않습니다. 다른 구조(폭·차수 등)를 시도하세요.' };
  }
  const q12 = Math.max(q1, q2), f = c.fabHere, margin = 1 - q12, both = (x) => Math.max(K.q1(l, x), K.q2(l, x));   // margin moves must not break ★
  if (!f && margin < 0.25) { const mv = bestMove(both, true); if (mv && mv.v < q12 - 0.03) return { h: '★★ 달성! Tape-out 전에 여유를 키우세요', b: `공칭 여유가 ${Math.round(margin * 100)}%뿐이라 공정 변동에서 탈락 다이가 나올 수 있습니다.` + moveText(mv, t, q12, '★★') }; }
  if (!f) return { h: '★★ 달성! 이제 Tape-out 해보세요', b: 'Fab Run에서 공정 변동 속에서도 판정선을 지키는지 확인합니다.' + (t >= 2 ? ` 현재 ★★ 기준 대비 공칭 여유 ${Math.round(margin * 100)}%.` : '') };
  if (f.yield < l.fab.y) { const mv = bestMove(both, false); return { h: '공정 변동에 약한 설계입니다', b: `수율 ${Math.round(f.yield * 100)}%. 공칭 여유(${Math.round(margin * 100)}%)를 키우면 변동을 견딥니다.` + (mv && mv.v < q12 - 0.03 ? moveText(mv, t, q12, '★★') : '') }; }
  return { h: got === 7 ? '세 별 모두 달성' : '이 설계로 목표를 모두 넘었습니다', b: '카드가 인벤토리에 저장되었습니다. AI 라이벌보다 높은 설계 점수에 도전하거나 다음 레벨로 가세요.' };
}
function renderCoach() {
  const box = $('#coach'), m = coachMsg(); box.hidden = !m; state.coachH = m ? m.h : ''; renderMini(); if (!m) return;
  const go = !state.cur.S && !state.cur.pr && /Tape-out|공정 변동/.test(m.h) && !$('#btn-fab').disabled ? '<div class="row-btns" style="margin-top:6px"><button class="btn" data-go="fab">Fab Run으로 ↓</button></div>' : '';
  box.innerHTML = `<div class="coach-h"><span class="badge">코치 · ${HINTS[state.hintTier]}</span><b>${m.h}</b></div><p>${m.b}</p>${go}`;
}
$('#coach').addEventListener('click', (e) => { if (!e.target.closest('[data-go="fab"]')) return; const f = $('#fab'); if (f.scrollIntoView) f.scrollIntoView({ block: 'center', behavior: smqMotion() }); setTimeout(() => $('#btn-fab').focus({ preventScroll: true }), 350); });
/* ---------- mini status bar: score, stars and the coach headline stay in sight while the field is scrolled away ---------- */
const mini = { off: true, dir: '▲' };
function renderMini() {
  const bar = $('#minibar'), c = state.cur, lab = window.LABUI && window.LABUI.isOpen();
  bar.hidden = mini.off || !c || lab || !$('#setup').hidden || $('main.game').hidden; if (bar.hidden) return;
  $('#mb-s').innerHTML = $('#score-big').innerHTML;
  if (c.S || c.pr) { const g = c.S ? c.S.goals(c.l, c.res, stepMem(c.S)) : c.pr.goals(c.l, c.res), ok = g.filter((x) => x.ok).length; $('#mb-st').textContent = `목표 ${ok}/${g.length}`; }
  else { const m = starsOf(state.id); $('#mb-st').innerHTML = [1, 2, 4].map((b) => (m & b ? '<b>★</b>' : '☆')).join(''); }
  const drc = c.res && c.res.drc && c.res.drc.length, t = $('#mb-t'); t.className = 'mb-t' + (drc ? ' bad' : ''); t.textContent = drc ? 'DRC 위반' : state.coachH || '';
  $('#mb-go').textContent = `${mini.dir} 화면`;
}
// shown only once the field has scrolled away above (e.g. while working the controls below it on a phone).
// A scroll check, not an IntersectionObserver: a jump from below the field to above it crosses no threshold.
let miniRaf = 0;
function miniCheck() { miniRaf = 0; const r = $('#view').getBoundingClientRect(); const off = !r.height || r.bottom > 80; if (off !== mini.off) { mini.off = off; renderMini(); } }
const miniSched = () => { if (!miniRaf) miniRaf = requestAnimationFrame(miniCheck); };
window.addEventListener('scroll', miniSched, { passive: true }); window.addEventListener('resize', miniSched);
$('#mb-go').addEventListener('click', () => { const v = $('#view'); if (v.scrollIntoView) v.scrollIntoView({ block: 'center', behavior: smqMotion() }); });

/* ---------- Fab run ---------- */
function drawWafer(dies, done) {
  const cv = $('#wafer'), ctx = cv.getContext('2d'), S = cv.width, R = S * 0.47, cx = S / 2, cy = S / 2;
  ctx.clearRect(0, 0, S, S); ctx.fillStyle = '#1a2431'; ctx.strokeStyle = '#334459'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, R, 0.5 * Math.PI + 0.12, 2.5 * Math.PI - 0.12); ctx.closePath(); ctx.fill(); ctx.stroke();
  const cell = (2 * R * 0.94) / 9.4, g = cell * 0.12, all = dies || makeWafer(1);
  all.forEach((die, idx) => { const x = cx + (die.i - 4) * cell, y = cy + (die.j - 4) * cell; ctx.fillStyle = dies && idx < done ? (die.pass ? '#5dd193' : '#ff6b6b') : '#253244'; ctx.fillRect(x - cell / 2 + g, y - cell / 2 + g, cell - 2 * g, cell - 2 * g); });
}
/* ---------- Fab Run reproducibility (v1.0 §5): seed log, Wilson interval, fixed seed for same-wafer comparisons ---------- */
const dhash = (d) => SMQ_STORE.fnv(keyOf(d));
function fabLog(id) { const pp = PP(); pp.fab = pp.fab || {}; return (pp.fab[id] = pp.fab[id] || []); }
// 95 % Wilson score interval for k passes of n dies (dies share the wafer offset and bowl → not independent; the interval is optimistic)
function wilson(k, n) { if (!n) return [0, 1]; const z = 1.96, p = k / n, dn = 1 + z * z / n, c = p + z * z / (2 * n), h = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)); return [Math.max(0, (c - h) / dn), Math.min(1, (c + h) / dn)]; }
const pct = (x) => Math.round(x * 100);
function renderFabRepro() {
  const box = $('#fab-repro'), c = state.cur; if (!c || c.S || c.pr) { box.innerHTML = ''; return; }
  const id = state.id, log = fabLog(id), last = log[0], fix = state.seedFix[id];
  let h = '';
  if (last) {
    const ci = wilson(last.pass, last.n), same = last.hash === dhash(c.d);
    h += `<div>마지막 런: 시드 <b>${last.seed}</b> · ${last.n} 다이 · 양품 <b>${last.pass}</b> · 수율 <b>${pct(last.y)} %</b> (95 % 구간 ${pct(ci[0])}–${pct(ci[1])} %) · ${MODES[last.mode] ? MODES[last.mode].label : last.mode} · ${last.model} · 설계 ${last.hash}${same ? '' : ' <span class="st-WARNING">(지금 설계와 다름)</span>'}</div>`;
    if (log.length > 1) h += `<details><summary>이전 런 ${log.length - 1}개</summary>${log.slice(1).map((r) => `<div>시드 ${r.seed} · ${r.pass}/${r.n} (${pct(r.y)} %) · 설계 ${r.hash} · ${String(r.t).slice(0, 16).replace('T', ' ')}</div>`).join('')}</details>`;
  }
  h += `<div>다음 Tape-out 시드: <b>${fix != null ? fix + ' (고정)' : '새로 뽑음'}</b></div>`;
  h += `<div class="note" style="font-family:var(--body)">수율은 ${makeWafer(1).length}개 다이의 Monte Carlo 추정입니다. 웨이퍼 오프셋·bowl을 다이가 함께 받으므로(공간 상관) 다이는 독립 표본이 아니고, 구간에는 모델 자체의 불확실성이 들어 있지 않습니다 — 몇 % 차이를 확정적인 성능 차이로 읽지 마세요. 같은 설계·시드·모델 버전이면 결과가 같습니다.</div>`;
  h += `<div class="row-btns">${last ? `<button class="btn" data-seed="fix">시드 ${last.seed} 고정</button>` : ''}${fix != null ? '<button class="btn" data-seed="free">시드 고정 해제</button>' : ''}</div>`;
  box.innerHTML = h;
}
$('#fab-repro').addEventListener('click', (e) => {
  const b = e.target.closest('[data-seed]'); if (!b || state.fabRunning) return;
  const log = fabLog(state.id);
  if (b.dataset.seed === 'fix' && log[0]) state.seedFix[state.id] = log[0].seed; else delete state.seedFix[state.id];
  renderFabRepro(); renderCompare();
});
function renderFabPanel() {
  const l = lev(), c = state.cur, cr = credits(), btn = $('#btn-fab'), drcBad = c.res.drc && c.res.drc.length;
  if (c.S || c.pr) {
    btn.disabled = true; btn.textContent = 'Tape-out'; $('#yield').textContent = '—'; $('#yield').className = 'yield na'; $('#fab-kv').innerHTML = '';
    $('#fab-note').textContent = c.S ? 'Guided 단계에서는 공정 런이 없습니다. 마지막 단계(Full Design)에서 같은 설계로 Tape-out 합니다.' : c.pr.note;
    renderFabRepro(); return;
  }
  btn.disabled = state.fabRunning || cr <= 0 || drcBad;
  btn.textContent = state.fabRunning ? '공정 진행 중…' : `Tape-out · 크레딧 ${cr}/${credits0()}`;
  const f = state.fab[state.id], y = $('#yield');
  if (!state.fabRunning) { if (f) { y.textContent = Math.round(f.yield * 100) + '%'; y.className = 'yield ' + (f.yield >= l.fab.y ? 'ok' : 'no'); } else { y.textContent = '—'; y.className = 'yield na'; } }
  const crit = kind().fabCrit(l), stale = f && f.key !== c.key;
  $('#fab-kv').innerHTML = f ? `양품 <b>${f.pass}</b> / ${f.n} 다이<br>판정 ${crit}<br>목표 ≥ ${Math.round(l.fab.y * 100)}%${stale ? '<br><span style="color:var(--fail)">설계가 바뀌어 수율 점수 미반영</span>' : ''}`
    : `판정 ${crit}<br>목표 ≥ ${Math.round(l.fab.y * 100)}%<br>다이 ${makeWafer(1).length}개 · 9×9 grid`;
  $('#fab-note').textContent = drcBad ? 'DRC를 통과해야 Tape-out할 수 있습니다.' : cr <= 0 ? '크레딧을 모두 썼습니다. 레벨 재시작으로 충전하세요.'
    : '웨이퍼마다 CD 오프셋, 두께 bowl, 다이 랜덤 변동이 새로 뽑힙니다(시드를 고정하면 같은 웨이퍼). 공칭 성능에 여유가 없으면 수율이 무너집니다.';
  renderFabRepro();
}
function tapeOut() {
  const c = state.cur, id = state.id, l = lev(), K = kind();
  if (state.fabRunning || c.S || c.pr || (c.res.drc && c.res.drc.length) || credits() <= 0) return;
  state.credits[id] = credits() - 1; state.fabRunning = true;
  // seed: fixed by the player (same wafer for two designs) or new; recorded with the design hash and model version (reproducible)
  const seed = state.seedFix[id] != null ? state.seedFix[id] : ((Date.now() ^ (Math.random() * 1e9)) & 0x7fffffff), sig = MODES[state.mode].sig;
  const dies = makeWafer(seed, sig), d = { ...c.d }, key = c.key;
  let k = 0, pass = 0; $('#yield').textContent = '…'; $('#yield').className = 'yield na'; renderFabPanel();
  const step = () => {
    const t0 = performance.now();
    while (k < dies.length && performance.now() - t0 < 14) { dies[k].pass = K.fabPass(l, K.evaluate(l, d, { ...dies[k], dt: dies[k].dt * l.pf.dt / 0.006 })); if (dies[k].pass) pass++; k++; }
    if (id === state.id) { drawWafer(dies, k); $('#yield').textContent = Math.round(pass / Math.max(1, k) * 100) + '%'; }
    if (k < dies.length) { requestAnimationFrame(step); return; }
    state.fabRunning = false; state.fab[id] = { key, yield: pass / dies.length, pass, n: dies.length, seed }; state.wafer[id] = dies;
    const log = fabLog(id); log.unshift({ seed, plat: state.plat, mode: state.mode, sig, hash: dhash(d), n: dies.length, pass, y: +(pass / dies.length).toFixed(4), model: MODEL_VERSION, t: new Date().toISOString() }); log.length = Math.min(log.length, 10);
    if (id === state.id) { evaluate(); awardStars(); maybeCard(); persist(); renderMap(); renderObjectives(); renderCards(); }
  };
  requestAnimationFrame(step);
}
$('#btn-fab').addEventListener('click', tapeOut);

/* ---------- AI rival ---------- */
function* aiRun(id) {
  const lb = LMAP[id], l = (() => { const sv = state.id; state.id = id; const e = lev(); state.id = sv; return e; })();
  const K = KINDS[lb.kind]; let best = null, evals = 0; const logs = [];
  // the AI tunes design parameters only; layout-mode / boundary choices (noAI) are taken from the player's current design
  const cur = { ...l.start, ...(DESP()[id] || {}) }, all = K.params(l, cur), ps = all.filter((p) => !p.noAI), base = { ...l.start };
  all.filter((p) => p.noAI).forEach((p) => { base[p.k] = cur[p.k]; }); if (K.fill) K.fill(l, base);
  const toDes = (u) => { const d = { ...base }; ps.forEach((p, i) => { d[p.k] = snapP(p, p.min + (p.max - p.min) * clamp(u[i], 0, 1)); }); return d; };
  const toU = (d) => ps.map((p) => (d[p.k] - p.min) / (p.max - p.min));
  const f = (u) => {
    evals++; const d = toDes(u), gv = K.violation(l, d); if (gv > 0) return 500 + 2000 * gv;
    const r = K.evaluate(l, d), sc = scoreOf(l, r, K); if (r.drc && r.drc.length) return 500;
    logs.push(rec(id, 'A', d, r)); if (!best || sc.total > best.sc) best = { sc: sc.total, d }; return -sc.total;
  };
  const rnd = mulberry(7 + id.charCodeAt(0) + id.charCodeAt(2)), starts = K.aiStarts(l).slice();
  starts.push(Object.fromEntries(ps.map((p) => [p.k, p.min + (p.max - p.min) * (0.2 + 0.6 * rnd())])));
  const maxE = K.cheap ? 160 : 90;
  for (const s0 of starts) { const g = nelderMead(f, toU({ ...base, ...s0 }), 0.06, maxE); for (const _ of g) yield { evals, best }; }
  return { evals, best, logs };
}
function summonAI() {
  if (state.aiRunning != null || (state.cur && (state.cur.S || state.cur.pr))) return;
  const id = state.id, it = aiRun(id); state.aiRunning = id;
  const btn = $('#btn-ai'); btn.disabled = true; btn.textContent = 'AI 탐색 중…'; let last = null;
  const step = () => {
    const t0 = performance.now(); let r;
    while (performance.now() - t0 < 14) { r = it.next(); if (r.done) break; last = r.value; }
    if (state.id === id && last) { $('#ai-bar').style.width = Math.min(100, last.evals / 3) + '%'; $('#ai-best').textContent = last.best ? Math.round(last.best.sc) : '—'; $('#verdict').innerHTML = `탐색 중 · 평가 <b>${last.evals}</b>회`; }
    if (!r || !r.done) { requestAnimationFrame(step); return; }
    const res = r.value; state.aiRunning = null; btn.disabled = false;
    if (!res.best) { renderAI(); return; }
    const sv = state.id; state.id = id; const l = lev(), K = kind(), rr = K.evaluate(l, res.best.d), sc = scoreOf(l, rr); state.id = sv;
    PP().ai[id] = { score: Math.round(sc.total), evals: res.evals, d: res.best.d }; DB.push(...res.logs); persistDB(); persist();
    if (state.id === id) { $('#ai-bar').style.width = '100%'; renderAI(); renderDB(); } else renderAI();
  };
  requestAnimationFrame(step);
}
function renderAI() {
  const id = state.id, a = PP().ai[id], you = PP().best[id] || 0, c = state.cur;
  $('#you-best').textContent = you || '—'; $('#ai-best').textContent = a ? a.score : '—'; $('#btn-ai-load').disabled = !a || !!(c && (c.S || c.pr));
  if (c && (c.S || c.pr) && state.aiRunning == null) {
    $('#btn-ai').disabled = true; $('#btn-ai').textContent = 'AI 라이벌 소환';
    $('#verdict').textContent = c.S ? 'Guided 단계는 원리를 익히는 시간입니다. AI 라이벌은 Full Design에서 같은 점수로 겨룹니다.' : 'AI 라이벌은 별 점수가 있는 설계 모드에서만 겨룹니다.'; $('#ai-bar').style.width = '0%';
    return;
  }
  if (state.aiRunning == null) { $('#btn-ai').disabled = false; $('#btn-ai').textContent = a ? 'AI 라이벌 다시 소환' : 'AI 라이벌 소환'; }
  else if (state.aiRunning !== id) { $('#btn-ai').disabled = true; $('#btn-ai').textContent = `${state.aiRunning} AI 탐색 중…`; }
  if (!a) { $('#verdict').textContent = state.aiRunning === id ? '' : 'AI를 소환하면 같은 surrogate로 최적화를 돌려 점수를 남깁니다.'; $('#ai-bar').style.width = '0%'; return; }
  $('#ai-bar').style.width = '100%';
  const ps = params(), v = you > a.score ? `<b style="color:var(--pass)">당신이 앞섭니다 (+${you - a.score})</b>` : you === a.score ? '<b>동점</b>' : `<b style="color:var(--cyan)">AI가 앞섭니다 (${you ? '−' + (a.score - you) : '도전 전'})</b>`;
  $('#verdict').innerHTML = `${v}<br><span style="font-family:var(--mono);font-size:11.5px;color:var(--fg-3)">AI 설계 ${ps.filter((p) => a.d[p.k] != null && !p.noAI).map((p) => `${p.sym} ${pFmt(p, a.d[p.k])}`).join(' · ')} · 평가 ${a.evals}회</span>`;
}
$('#btn-ai').addEventListener('click', summonAI);
$('#btn-ai-load').addEventListener('click', () => { const a = PP().ai[state.id]; if (!a || curStep()) return; Object.assign(des(), a.d); state.fromAI[state.id] = true; renderParams(); syncParamUI(); evaluate(); persist(); });

/* ---------- Design DB ---------- */
function renderDB() {
  const id = state.id, l = lev(), K = kind(), rows = DB.filter((r) => r.lv === id && (r.pf || 'si1310') === state.plat), h = rows.filter((r) => r.src === 'H').length;
  $('#db-stats').innerHTML = `${id} 레코드 <b>${rows.length}</b>건 · 사람 <b style="color:var(--amber)">${h}</b> · AI <b style="color:var(--cyan)">${rows.length - h}</b> · 전체 ${DB.length}건`;
  const W = 640, H = 220, ml = 44, mr = 12, mt = 10, mb = 32, ax0 = Math.log10(l.aRef / 12), ax1 = Math.log10(l.aRef * 12), [y0, y1] = l.dbY || [0, 1];
  const X = (A) => ml + (clamp(Math.log10(Math.max(A, 1e-6)), ax0, ax1) - ax0) / (ax1 - ax0) * (W - ml - mr), Y = (e) => mt + (1 - (clamp(e, y0, y1) - y0) / (y1 - y0)) * (H - mt - mb);
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="크기 대비 성능 산점도">`;
  [0, 0.25, 0.5, 0.75, 1].forEach((f) => { const v = y0 + (y1 - y0) * f; s += `<line x1="${ml}" x2="${W - mr}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)"/><text x="${ml - 6}" y="${Y(v) + 4}" text-anchor="end" font-size="11" font-family="var(--mono)" fill="var(--fg-3)">${+v.toFixed(2)}</text>`; });
  [-1, -0.5, 0, 0.5, 1].forEach((e) => { const v = l.aRef * Math.pow(10, e); s += `<text x="${X(v)}" y="${H - mb + 17}" text-anchor="middle" font-size="11" font-family="var(--mono)" fill="var(--fg-3)">${v >= 10 ? Math.round(v) : +v.toFixed(1)}</text>`; });
  s += `<text x="${W - mr}" y="${H - 4}" text-anchor="end" font-size="10.5" font-family="var(--mono)" fill="var(--fg-3)">${K.sizeLabel} ${K.sizeUnit} (log)</text><text x="${ml}" y="${mt + 2}" dx="4" dy="8" font-size="10.5" font-family="var(--mono)" fill="var(--fg-3)">${K.primaryLabel}</text>`;
  if (Number.isFinite(X(lev().s2.size))) s += `<line x1="${X(lev().s2.size)}" x2="${X(lev().s2.size)}" y1="${mt}" y2="${H - mb}" stroke="rgba(242,176,74,.35)" stroke-dasharray="3 4"/>`;   // levels without a ★★ size target have no line
  const show = rows.slice(-1200);
  show.filter((r) => r.src === 'A').forEach((r) => { s += `<circle cx="${X(r.a).toFixed(1)}" cy="${Y(r.y).toFixed(1)}" r="2.4" fill="var(--cyan)" fill-opacity=".45"/>`; });
  show.filter((r) => r.src === 'H').forEach((r) => { s += `<circle cx="${X(r.a).toFixed(1)}" cy="${Y(r.y).toFixed(1)}" r="2.8" fill="var(--amber)" fill-opacity=".85"/>`; });
  if (state.cur && !state.cur.S && !(state.cur.res.drc && state.cur.res.drc.length) && Number.isFinite(state.cur.res.size) && Number.isFinite(state.cur.res.primary)) s += `<circle cx="${X(state.cur.res.size).toFixed(1)}" cy="${Y(state.cur.res.primary).toFixed(1)}" r="7" fill="none" stroke="var(--fg)" stroke-width="1.5"/>`;
  $('#db-chart').innerHTML = s + '</svg>';
}
$('#btn-csv').addEventListener('click', () => {
  const csv = ['level,source,params,primary,secondary,size,timestamp', ...DB.map((r) => [r.lv, r.src === 'H' ? 'human' : 'ai', '"' + Object.entries(r.p).map(([k, v]) => `${k}=${v}`).join(';') + '"', r.y, r.y2 == null ? '' : r.y2, r.a, new Date(r.t).toISOString()].join(','))].join('\n');
  const btn = $('#btn-csv'), ta = $('#csvOut'), fb = () => { ta.hidden = false; ta.value = csv; ta.focus(); ta.select(); btn.textContent = '아래 텍스트를 복사하세요'; };
  try { navigator.clipboard.writeText(csv).then(() => { btn.textContent = `복사됨 · ${DB.length}행`; setTimeout(() => (btn.textContent = 'CSV 복사'), 1800); }, fb); } catch (e) { fb(); }
});
let clearArm = null;
$('#btn-clear').addEventListener('click', () => {
  const b = $('#btn-clear');
  if (!clearArm) { b.textContent = '한 번 더 누르면 삭제'; clearArm = setTimeout(() => { clearArm = null; b.textContent = 'DB 비우기'; }, 2500); return; }
  clearTimeout(clearArm); clearArm = null; DB = []; persistDB(); b.textContent = '비웠습니다'; setTimeout(() => (b.textContent = 'DB 비우기'), 1500); renderDB();
});

/* ---------- mode / hint / reset ---------- */
function renderModeSeg() { $('#mode-seg').innerHTML = Object.entries(MODES).map(([k, M]) => `<button role="radio" aria-checked="${k === state.mode}" data-m="${k}">${M.label}</button>`).join(''); $('#mode-note').textContent = MODES[state.mode].note; }
function renderHintSeg() { const M = MODES[state.mode]; $('#hint-seg').innerHTML = HINTS.map((h, i) => `<button role="radio" aria-checked="${i === state.hintTier}" data-h="${i}" ${i > M.maxHint ? 'disabled' : ''}>${h}</button>`).join(''); }
$('#mode-seg').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b || b.dataset.m === state.mode || state.fabRunning) return;
  state.mode = b.dataset.m; store.set('smq-mode-v1', state.mode);
  state.credits = {}; state.fab = {}; state.wafer = {}; state.land = {};
  state.hintTier = MODES[state.mode].hint; store.set('smq-hint-v1', state.hintTier); setupLevel();
});
$('#hint-seg').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b || b.disabled) return;
  state.hintTier = +b.dataset.h; store.set('smq-hint-v1', state.hintTier);
  renderHintSeg(); renderHint(); drawView(); drawStrips(true); renderCoach();
});
let resetArm = null;
$('#btn-reset').addEventListener('click', () => {
  const b = $('#btn-reset');
  if (!resetArm) { b.textContent = '한 번 더: 설계·크레딧 초기화'; resetArm = setTimeout(() => { resetArm = null; b.textContent = '레벨 재시작'; }, 2500); return; }
  clearTimeout(resetArm); resetArm = null; b.textContent = '레벨 재시작';
  DESP()[state.id] = { ...lev().start }; state.credits[state.id] = credits0(); state.fab[state.id] = null; state.wafer[state.id] = null; state.fromAI[state.id] = false;
  persist(); setupLevel();
});

/* ---------- design-intent export (smq-design/1 → tools/smq2gds) ---------- */
const plainTxt = (h) => String(h).replace(/<sub>(.*?)<\/sub>/g, '_$1').replace(/<sup>(.*?)<\/sup>/g, '^$1').replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
function designJSON() {
  const c = state.cur; if (!c) return null;
  // a guided step exports the level's full design (the step only edits part of it); practice states export with no objectives
  const l = lev(), K = kind(), pf = PLATFORMS[state.plat], full = !c.S, d = full ? c.d : { ...des() }, r = full ? c.res : K.evaluate(l, d, null, { full: true });
  const card = K.card ? K.card(l, r) : null, ob = full && !c.pr ? objectives() : [], sc = full ? c.sc : scoreOf(l, r, K), ps = K.params(l, d);
  const num = (v) => (typeof v === 'number' && isFinite(v) ? +v.toPrecision(6) : v);
  const geom = K.exportGeom ? K.exportGeom(l, r) : null;
  return {
    schema: 'smq-design/1', generator: 'SPEC-to-MASK Quest', exported: new Date().toISOString(),
    platform: { id: pf.id, mat: pf.mat, lam_um: pf.lam, core_t_um: pf.t, w0_um: pf.w0, clad: 'SiO2', box: 'SiO2', rules_um: { ...pf.rules } },
    level: { id: l.id, kind: LMAP[state.id].kind, name: l.name, device: plainTxt(l.dev || ''), mode: state.mode, stars: starsOf(l.id) },
    params: Object.fromEntries(ps.map((p) => [p.k, { value: num(d[p.k]), unit: p.unit || '', label: plainTxt(p.label), ...(p.labels ? { option: p.labels[d[p.k] | 0] } : {}) }])),
    geometry: geom,
    predicted: {
      model: 'game surrogate (see README · 모델 범위)', primary: { label: K.primaryLabel, value: num(r.primary) }, size: { value: num(r.size), unit: K.sizeUnit },
      card: card ? card.model : null, score: Math.round(sc.total), ...(c.S ? { guided_step: plainTxt(c.S.title) } : {}), ...(c.pr ? { practice: plainTxt(c.pr.note) } : {}),
      objectives: ob.flatMap((g) => g.items.filter((o) => !o.na && !o.crit).map((o) => ({ tier: g.t, spec: plainTxt(o.k), value: plainTxt(o.v), ok: !!o.ok }))),
      fab_criterion: plainTxt(K.fabCrit(l))
    },
    next: geom ? 'python -m smq2gds design.json -o out.gds  (tools/smq2gds, README 참조)' : `이 소자(${LMAP[state.id].kind})의 PCell은 아직 없습니다. 파라미터·예측값만 기록합니다.`
  };
}
// inside the claude.ai viewer a page may only offer files through the `downloads` capability; elsewhere a plain blob link works
const dlCap = (typeof window !== 'undefined' && window.claude && typeof window.claude.use === 'function') ? window.claude.use('downloads').catch(() => null) : Promise.resolve(null);
$('#btn-export').addEventListener('click', async () => {
  const j = designJSON(); if (!j) return;
  const txt = JSON.stringify(j, null, 2), name = `smq_${state.plat}_${state.id}.json`, note = $('#export-note'), ta = $('#jsonOut');
  ta.hidden = false; ta.value = txt;
  try { navigator.clipboard.writeText(txt).catch(() => {}); } catch (e) { /* clipboard unavailable */ }
  const tail = j.geometry ? `<code>python -m smq2gds ${name} -o ${name.replace('.json', '.gds')}</code> 로 GDS를 만들고, <code>--sim ${j.geometry.pcell === 'mmi' ? 'eme' : 'mode'}</code>로 같은 형상을 솔버로 검증합니다.` : '이 소자는 아직 GDS PCell이 없어 파라미터와 예측값만 담깁니다 (현재 MMI·지연 나선 지원).';
  const body = (lead) => { note.hidden = false; note.innerHTML = lead + '아래에 같은 JSON이 있습니다 (클립보드에도 복사 시도). ' + tail; };
  body('');
  const dl = await dlCap;
  if (dl) {
    try { await dl.save({ filename: name, data: txt }); body(`<b>${name}</b>을 저장했습니다. `); }
    catch (e) { body(e && e.code === 'declined' ? '저장을 취소했습니다. ' : '이 화면에서는 파일 저장을 쓸 수 없습니다. '); }
    return;
  }
  let ok = false;
  try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'application/json' })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); ok = true; } catch (e) { ok = false; }
  body(ok ? `<b>${name}</b> 내려받기를 시도했고, ` : '');
});
$('#jsonOut').addEventListener('focus', (e) => e.target.select());

/* ---------- offline solver validation of the reference design (src/data/validation.json ← tools/smq2gds/validate.py) ---------- */
function renderValidation() {
  const box = $('#valid'), v = typeof VALID !== 'undefined' && VALID.by && (VALID.by[state.plat] || {})[state.id];
  box.hidden = !v; if (!v) return;
  const num = (x, d) => (x == null ? '—' : typeof x === 'string' ? x : d == null && Math.abs(x) > 0 && (Math.abs(x) < 1e-3 || Math.abs(x) >= 1e4) ? (+x).toExponential(1) : (+x).toFixed(d == null ? 3 : d).replace(/^-(0\.0+)$/, '$1'));
  const ds = Object.entries(v.design || {}).map(([k, x]) => `${k} ${x}`).join(' · ');
  let h = `<p style="margin:2px 0 6px">게임이 보정한 참조 설계(${ds})를 같은 굴절률로 오프라인 솔버에 다시 넣은 결과입니다. 지금 화면의 설계가 아니라 이 레벨의 기준점에 대한 검증이며, 내 설계는 <b>설계 내보내기</b> → <code>python -m smq2gds 파일.json --sim ${v.eme ? 'eme' : 'mode'}</code>로 같은 검사를 돌립니다.</p>`;
  if (v.eme) {
    const g = v.game, e = v.eme, dL = (e.L_best_um / g.L_um - 1) * 100;
    h += `<div class="scroll"><table class="vt"><tr><th>λ ${Math.round(v.lam_um * 1000)} nm</th><th>게임 (2D EIM)</th><th>3D EME</th></tr>`
      + `<tr><td>EL, 설계 L ${g.L_um} µm</td><td>${num(g.el_dB)} dB</td><td class="${e.el_dB - g.el_dB > 0.2 ? 'bad' : ''}">${num(e.el_dB)} dB</td></tr>`
      + `<tr><td>불균형</td><td>${num(g.imb_dB, 2)} dB</td><td>${num(e.imb_dB, 2)} dB</td></tr>`
      + `<tr><td>EL이 최소인 L</td><td>${g.L_um} µm</td><td>${num(e.L_best_um, 2)} µm (${dL >= 0 ? '+' : ''}${dL.toFixed(0)}%)</td></tr>`
      + `<tr><td>그 L에서 EL</td><td>—</td><td>${num(e.el_best_dB)} dB</td></tr></table></div>`
      + `<p style="margin:4px 0 0">게임의 MMI는 2D 유효굴절률법이라 고대비 단면에서 모드 간 위상차(L<sub>π</sub>)가 3D와 달라 결상 위치가 어긋납니다. 3D EME에는 게임이 단열로 가정한 w<sub>0</sub>→w<sub>t</sub> 테이퍼 손실도 들어 있습니다. 셀·모드 수를 늘려 보면 설계 L에서의 EL과 최적 L은 약 1% 안에서 수렴하고, 최소 EL 값은 ±0.15 dB 정도 움직입니다. 대칭 1×2에서 보이는 0.2 dB 이하의 불균형은 격자 비대칭에서 오는 수치 오차입니다. 실제 마스크 전에는 이렇게 3D 솔버로 L을 다시 맞춥니다.</p>`;
  } else if (v.rows) {
    const KO = [[/^n_eff \(arm TE0\)/, 'n<sub>eff</sub> (나선 팔 TE0)'], [/^n_g \(arm TE0\)/, 'n<sub>g</sub> (나선 팔 TE0)'], [/^guided TE modes \(arm\)/, '팔의 TE 가이드 모드 수'],
      [/^α scattering\+material/, 'α 산란+재료'], [/^bend loss/, '굽힘 손실'], [/^S-bend reversal conversion/, 'S-bend 곡률 반전 모드 변환'], [/^insertion loss/, '삽입 손실'],
      [/FDE, Richardson dl→0/, 'FDE, Richardson 외삽'], [/material dispersion included/, '재료 분산 포함'], [/same Payne–Lacey constants, solver ∂n_eff/, '같은 Payne–Lacey 상수, ∂n_eff만 솔버 값'],
      [/S-bend centre/, 'S-bend 중앙'], [/innermost turn/, '가장 안쪽 회전'], [/upper bound \(caustic beyond the PML\)/, '상한값 (caustic이 PML 밖)'], [/upper bound/, '상한값'], [/arm bend radiation kept from the game/, '팔 굽힘 방사는 게임 값 사용']];
    const ko = (t) => KO.reduce((a, [re, k]) => a.replace(re, k), String(t || ''));
    h += '<div class="scroll"><table class="vt"><tr><th></th><th>게임</th><th>솔버</th></tr>'
      + v.rows.map((r) => { const bad = typeof r.game === 'number' && typeof r.solver === 'number' && /conversion/.test(r.quantity) && r.solver - r.game > 6, sv = /bend loss/.test(r.quantity) && typeof r.solver === 'number' && Math.abs(r.solver) < 0.05 ? '≈ 0' : num(r.solver); const sv2 = typeof r.solver === 'number' && Number.isInteger(r.solver) ? String(r.solver) : sv; return `<tr><td>${ko(r.quantity)}${r.note ? `<br><span style="color:var(--fg-3)">${ko(r.note)}</span>` : ''}</td><td>${num(r.game)}</td><td class="${bad ? 'bad' : ''}">${sv2}</td></tr>`; }).join('')
      + '</table></div>'
      + `<p style="margin:4px 0 0">그린 경로 길이로 지연 ${num(v.tau_drawn_ns, 4)} ns (솔버 n<sub>g</sub>), 정확한 τ에 필요한 길이 ${Math.round(v.length_for_target_um)} µm. 직선 단면은 두 격자 + Richardson 외삽, 굽힘은 PML과 등각 변환을 쓴 국소 모드 솔버입니다(|손실| < 0.05 dB/cm는 수치 잡음 수준이라 ≈ 0). S-bend 변환 모델은 이 솔버의 스윕(곡률 반전 모드 겹침)으로 다시 맞춘 것이라, 예전 게임 값(논문 원호 결과 하나로 맞춘 상수)보다 Si에서 약 15 dB 비관적입니다.</p>`;
  }
  $('#valid-body').innerHTML = h + (v.note ? `<p style="margin:6px 0 0">${v.note}</p>` : '');
}

/* ---------- Stage 0: platform setup ---------- */
const pick = { lam: null, mat: null };
const pidOf = (lam, mat) => mat + (lam === 1.31 ? '1310' : '1550');
function nsSummary(pid) {
  const ns = P.by[pid]; if (!ns) return '';
  const st = Object.values(ns.stars).reduce((a, o) => a + Object.values(o).reduce((b, m) => b + popcount(m), 0), 0), cards = Object.keys(ns.cards).length;
  return st || cards ? `진행 기록: ★ ${st}개 · 카드 ${cards}장` : '';
}
function showSetup(on) {
  $('#setup').hidden = !on; $('#gamewrap').hidden = on;
  $('#plat-chip').hidden = on || !state.plat; $('#btn-cancel').hidden = !state.plat; $('#cardcount').hidden = on;
  if (on) renderSetup();
  miniCheck();
}
function renderSetup() {
  $('#pick-lam').innerHTML = [1.31, 1.55].map((lm) => { const B = BANDS[lm]; return `<button class="choice" data-lam="${lm}" aria-pressed="${pick.lam === lm}"><div class="ttl">${B.name}</div><div class="tag">${B.track}</div><ul>${B.pros.map((x) => `<li>${x}</li>`).join('')}${B.cons.map((x) => `<li class="c">${x}</li>`).join('')}</ul></button>`; }).join('');
  $('#pick-mat').innerHTML = ['si', 'sin'].map((m) => {
    const M = MATS[m], pf = pick.lam ? PLATFORMS[pidOf(pick.lam, m)] : null, prog = pf ? nsSummary(pf.id) : '';
    return `<button class="choice" data-mat="${m}" aria-pressed="${pick.mat === m}"><div class="ttl">${M.name}</div><div class="tag">${M.full} · n ${M.n} · 코어–클래딩 Δn ${M.dn}</div><ul>${M.pros.map((x) => `<li>${x}</li>`).join('')}${M.cons.map((x) => `<li class="c">${x}</li>`).join('')}</ul>${pf ? `<div class="nums">이 파장에서 단일모드 폭 &lt; ${Math.round(pf.wc * 1000)} nm${prog ? ' · ' + prog : ''}</div>` : ''}</button>`;
  }).join('');
  const ok = pick.lam && pick.mat, sum = $('#pick-sum');
  $('#btn-start').disabled = !ok;
  if (!ok) { sum.innerHTML = '파장과 물질을 하나씩 고르세요.'; return; }
  const pf = PLATFORMS[pidOf(pick.lam, pick.mat)], M = MATS[pick.mat], lines = [`<b>${pf.short}</b> · 코어 ${M.full}, SiO₂ 클래딩 · 표준 단일모드 폭 ${Math.round(pf.w0 * 1000)} nm`];
  if (pf.id === 'si1310') lines.push('<span class="ok">Track A(1.6T 트랜시버)의 표준 조합입니다.</span>');
  if (pick.lam === 1.55) lines.push('<span class="warn">1.6T 데이터센터 트랜시버(FR4·DR8)는 O-band 표준입니다. Stage 1은 그대로 진행되지만, 이 대역은 Track B(FMCW LiDAR)와 더 잘 맞습니다.</span>');
  if (pick.mat === 'sin') lines.push('<span class="warn">SiN에는 변조기·수광기를 직접 만들 수 없어 Stage 2 능동 소자는 Si·III-V 이종 집적을 전제로 진행됩니다. 대신 패시브는 저손실·공정 둔감에서 유리합니다.</span>');
  const prog = nsSummary(pf.id); if (prog) lines.push(prog + ' — 이어서 진행합니다.');
  sum.innerHTML = lines.join('<br>');
}
$('#pick-lam').addEventListener('click', (e) => { const b = e.target.closest('.choice'); if (!b) return; pick.lam = +b.dataset.lam; renderSetup(); });
$('#pick-mat').addEventListener('click', (e) => { const b = e.target.closest('.choice'); if (!b) return; pick.mat = b.dataset.mat; renderSetup(); });
$('#btn-start').addEventListener('click', () => {
  if (!pick.lam || !pick.mat || state.fabRunning || state.aiRunning != null) return;
  const pid = pidOf(pick.lam, pick.mat), fresh = !P.by[pid];
  state.plat = pid; applyPlatform(); if (fresh) state.id = '1-1';
  if (window.LABUI && window.LABUI.isOpen()) window.LABUI.close();
  persist(); showSetup(false); setupLevel();
});
$('#btn-cancel').addEventListener('click', () => showSetup(false));
$('#plat-chip').addEventListener('click', () => { if (state.fabRunning || state.aiRunning != null) return; const pf = PLATFORMS[state.plat]; pick.lam = pf.lam; pick.mat = pf.mat; showSetup(true); });

/* ---------- guided steps UI ---------- */
function renderGuided() {
  const box = $('#m-guided'), mode = stepMode(state.id);
  box.hidden = !mode; if (!mode) return;
  const ss = stepsOf(), G = guideNS(state.id), i = stepIdx(), S = ss[i], ndone = ss.filter((s) => G.done[s.id]).length;
  $('#gmode-seg').innerHTML = [['guided', 'Guided 학습'], ['full', 'Full Design']].map(([k, t]) => `<button role="radio" aria-checked="${mode === k}" data-gm="${k}">${t}</button>`).join('');
  $('#m-steps').innerHTML = ss.map((s, j) => `<li><button class="stp ${G.done[s.id] ? 'done' : ''}" data-step="${j}" aria-current="${mode === 'guided' && j === i ? 'step' : 'false'}" aria-label="${j + 1}단계 ${s.title}${G.done[s.id] ? ' (완료)' : ''}"><span class="num">${G.done[s.id] ? '✓' : j + 1}</span><span class="t">${s.short}</span></button></li>`).join('');
  const note = $('#m-stepnote');
  if (mode === 'full') { note.innerHTML = `<b>Full Design</b> · 모든 파라미터를 한꺼번에 다룹니다. 학습 단계 ${ndone}/${ss.length} 완료${ndone < ss.length ? ' — 단계 번호를 누르면 그 단계부터 Guided 학습을 합니다.' : '.'}`; return; }
  const done = G.done[S.id], nx = ss[i + 1];
  note.innerHTML = `<div class="sn-h"><b>STEP ${i + 1} · ${S.title}</b>${done ? '<span class="ok">완료 ✓</span>' : ''}</div><div class="sn-b">${S.intro}</div>`
    + (nx ? `<div class="row-btns"><button class="btn ${done ? 'pri' : ''}" id="step-next">다음 단계 → ${nx.short}</button></div>` : '');
}
$('#m-guided').addEventListener('click', (e) => {
  if (state.fabRunning || state.aiRunning != null) return;
  const G = guideNS(state.id), gm = e.target.closest('[data-gm]'), st = e.target.closest('[data-step]'), nx = e.target.closest('#step-next');
  if (gm) { if (G.mode === gm.dataset.gm) return; G.mode = gm.dataset.gm; }
  else if (st) { G.mode = 'guided'; G.cur = +st.dataset.step; }
  else if (nx) G.cur = Math.min(stepsOf().length - 1, stepIdx() + 1);
  else return;
  state.lastLogged = ''; persist(); setupLevel();
  const f = $(nx ? '#m-stepnote' : st ? `.stp[data-step="${G.cur}"]` : `[data-gm="${G.mode}"]`); if (f && f.focus) { if (nx) { f.tabIndex = -1; } f.focus(); }
});

/* ---------- level setup ---------- */
function setupLevel() {
  const l = lev();
  $('#jsonOut').hidden = true; $('#export-note').hidden = true; renderValidation();
  $('#m-eyebrow').textContent = `${l.id} · ${l.dev} · ${l.bandLabel}`; $('#m-name').textContent = l.name; $('#m-brief').innerHTML = l.brief;
  const pre = $('#m-preface'); pre.hidden = !l.preface; pre.innerHTML = l.preface || '';
  const cc = $('#m-concepts'); cc.hidden = !l.concepts;
  if (l.concepts) { const seen = (PP().seen = PP().seen || {}); cc.innerHTML = `<summary>개념 노트 · ${l.concepts.length}개 — ${l.concepts.map((c) => c[0].replace(/<[^>]+>/g, '')).join(', ')}</summary><dl>${l.concepts.map(([t, d]) => `<dt>${t}</dt><dd>${d}</dd>`).join('')}</dl>`; cc.open = !seen[l.id] && !curStep(); seen[l.id] = 1; }   // a guided step carries its own intro, so the notes start folded there
  { const rb = $('#m-rate'); rb.hidden = !RATE_LEVELS.includes(l.id); if (!rb.hidden) $('#m-rate-b').innerHTML = RATE_DEF; }
  const pf = PLATFORMS[state.plat]; $('#plat-chip').innerHTML = `${pf.short} · ${pf.band}<span>변경</span>`; $('#plat-chip').hidden = false;
  state.land = {}; state.cur = null; state.chg = null;
  // a guided step gives no stars, cards, AI or tape-out: those panels step aside until Full Design
  $('main.game').classList.toggle('stepping', !!curStep());
  renderMap(); renderGuided(); renderParams(); syncParamUI(); renderModeSeg(); renderHintSeg(); sizeCanvas();
  const w = state.wafer[state.id]; drawWafer(w, w ? w.length : 0);
  evaluate(); renderAI(); renderDB(); renderCards();
  levelHooks.forEach((f) => { try { f(state.id); } catch (e) { /* learning layer must not break the level */ } });
}
const hot = window.claude && window.claude.hot;
if (hot && hot.snapshot) hot.snapshot(() => ({ id: state.id, DES }));
/* ---------- save state and full backup / restore (src/persist.js) ---------- */
const progressCount = () => Object.values(P.by || {}).reduce((a, ns) => a + Object.values((ns && ns.stars) || {}).reduce((b, o) => b + Object.values(o || {}).reduce((c, m) => c + popcount(m | 0), 0), 0) + Object.keys((ns && ns.cards) || {}).length, 0);
const kb = (n) => (n >= 1e6 ? (n / 1e6).toFixed(2) + ' MB' : (n / 1e3).toFixed(1) + ' kB');
const tstr = (t) => { if (!t) return '—'; const d = new Date(t); return isNaN(d) ? String(t) : d.toLocaleString('ko-KR', { hour12: false }); };
function renderSave(st) {
  st = st || store.status();
  const chip = $('#save-chip'), adv = st.state === 'saved' ? store.backupAdvice(progressCount()) : null;
  const k = st.state === 'failed' ? 'failed' : st.state === 'saving' ? 'saving' : adv ? 'advice' : 'saved';
  chip.dataset.st = k;
  $('#save-txt').textContent = { saved: '저장됨', saving: '저장 중…', failed: '저장 실패', advice: '백업 권장' }[k];
  chip.title = k === 'failed' ? `저장 실패: ${st.err || ''} — 누르면 전체 백업` : k === 'advice' ? `${adv} — 누르면 전체 백업` : '저장 상태 · 전체 백업 / 복원';
  const w = $('#save-warn'); w.hidden = st.state !== 'failed';
  if (!w.hidden) $('#save-warn-t').textContent = `${st.available ? '' : '이 브라우저가 저장소를 막았습니다(시크릿 창·정책). '}${st.err || ''} — 지금까지의 작업은 이 창에만 남아 있고, 창을 닫으면 마지막 저장 이후의 변경이 사라집니다. 전체 백업을 내려받아 보관하세요.`;
  if (DATA.isOpen()) renderDataStatus(st, adv);
}
const DATA = smqModal($('#data-dlg'));
function renderDataStatus(st, adv) {
  st = st || store.status(); const u = store.usage(), m = st.meta || {};
  const name = { 'smq3-id': '현재 레벨', 'smq-mode-v1': '난이도', 'smq-hint-v1': '힌트 단계', 'smq-guide-depth': '가이드 깊이', 'smq3-progress': '진행 기록 (별·카드·학습 기록)', 'smq3-designs': '레벨 설계', 'smq3-db': 'Design DB', 'smq3-lab': 'Design Lab 프로젝트', 'smq3-ui': '화면 설정', 'smq3-meta': '백업 메타', 'smq3-undo': '복원 직전 데이터' };
  $('#data-status').innerHTML = `<table class="ltbl"><tr><th>상태</th><td>${st.state === 'failed' ? `<b class="st-FAIL">✕ 저장 실패</b> · ${st.err || ''}${st.failed.length ? ` (${st.failed.join(', ')})` : ''}` : st.state === 'saving' ? '저장 중…' : '<b class="st-PASS">✓ 저장됨</b>'}${st.lastOk ? ` · 마지막 저장 ${tstr(st.lastOk)}` : ''}</td></tr>`
    + (() => { const q = st.quarantine || [], c = (st.corrupt || []).filter((x) => !q.some((y) => y.key === x.key)); if (!q.length && !c.length) return '';
      return `<tr><th>읽을 수 없는 데이터</th><td><b class="st-WARNING">⚠ ${[...q.map((x) => `${name[x.key] || x.key} — 원문 ${x.n}건 ${kb(x.bytes)} 보관`), ...c.map((x) => `${name[x.key] || x.key} — ${x.kind === 'read' ? '브라우저가 읽기를 거부' : '읽을 수 없음'}`)].join(' · ')}</b>`
        + `<br><span class="note">게임은 이 항목을 기본값으로 시작했습니다. 손상 원문은 지우지 않고 보관했으며 전체 백업의 <code>unreadable</code>에 그대로 들어갑니다 — 백업을 내려받아 두세요.${st.quarantineKept === false ? ` <b class="st-FAIL">원문 보관 실패(${st.quarantineErr}) — 지금 바로 백업을 내려받으세요.</b>` : ''}</span>`
        + (q.length ? ' <button class="btn" id="bk-qclear">보관한 원문 지우기</button>' : '') + '</td></tr>'; })()
    + `<tr><th>마지막 전체 백업</th><td>${m.lastBackup ? tstr(m.lastBackup) : '없음'}${adv ? ` · <span class="st-WARNING">${adv}</span>` : ''}</td></tr>`
    + `<tr><th>사용량</th><td>${kb(u.total)} (브라우저 한도 보통 ≈ 5 MB)<br><span class="note">${Object.entries(u.by).map(([k2, v]) => `${name[k2] || k2} ${kb(v)}`).join(' · ')}</span></td></tr>`
    + `<tr><th>빌드</th><td>v${BUILD.version} · ${BUILD.commit ? BUILD.commit.slice(0, 10) + ' · ' + String(BUILD.date || '').slice(0, 10) : BUILD.channel + ' build'}${BUILD.offline ? ' · 오프라인(외부 폰트 없음)' : ''}</td></tr></table>`;
}
function openData(focusSel) { renderDataStatus(); renderUndo(); DATA.open(focusSel || '#bk-dl'); }
$('#save-chip').addEventListener('click', () => openData());
$('#save-warn-b').addEventListener('click', () => openData('#bk-dl'));
store.subscribe(renderSave);
const bkName = () => `spec-to-mask-backup-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '')}.json`;
// an incomplete backup is never reported as a plain success
const bkWarn = (b) => (b.complete === false ? `<b class="st-WARNING">⚠ 불완전한 백업</b> — 읽을 수 없는 항목: ${(b.problems || []).map((p) => p.key).join(', ')}. 정상 데이터로는 들어가지 않았고, 원문은 백업의 <code>unreadable</code>에 그대로 보관했습니다. ` : '');
$('#data-status').addEventListener('click', (e) => {
  if (e.target.id !== 'bk-qclear') return;
  if (!confirm('보관한 손상 원문을 이 브라우저에서 지웁니다. 원문이 들어 있는 전체 백업을 이미 내려받았나요?')) return;
  store.clearQuarantine(); renderDataStatus(); renderSave();
});
$('#bk-dl').addEventListener('click', async () => {
  persist(); persistDB();   // the backup must contain what is on screen
  const b = store.makeBackup($('#bk-ui').checked), txt = JSON.stringify(b, null, 1), msg = $('#bk-msg');
  const r = await smqDownload(bkName(), txt);
  $('#bk-ta').hidden = false; $('#bk-ta').value = txt;
  if (r.ok) { store.markBackup(); msg.innerHTML = `${bkWarn(b)}<b>${bkName()}</b> 저장을 시작했습니다 — 별 ${b.summary.stars} · 카드 ${b.summary.cards} · 설계 ${b.summary.designs} · DB ${b.summary.db}건 · ${kb(txt.length)}. 같은 내용이 아래에 있습니다.`; }
  else msg.innerHTML = bkWarn(b) + (r.how === 'declined' ? '저장을 취소했습니다.' : '이 화면에서는 파일 저장이 막혀 있습니다 — 아래 JSON을 전부 선택해 복사(Ctrl/⌘+C)한 뒤 .json 파일로 보관하세요.');
  renderSave();
});
$('#bk-copy').addEventListener('click', async () => {
  persist(); persistDB();
  const b = store.makeBackup($('#bk-ui').checked), txt = JSON.stringify(b), ok = await smqCopy(txt, $('#bk-ta'));
  if (ok) store.markBackup();
  $('#bk-msg').innerHTML = bkWarn(b) + (ok ? `클립보드에 복사했습니다 (${kb(txt.length)}). 메모장 등에 붙여 .json으로 보관하세요.` : '클립보드를 쓸 수 없습니다 — 아래 선택된 JSON을 Ctrl/⌘+C로 복사하세요 (복사 후에는 백업으로 기록되지 않으니 보관을 확인하세요).');
  renderSave();
});
let RS = null;   // parsed + validated backup awaiting confirmation
const ctxV = () => ({ platforms: PLATFORMS, levels: LMAP });
function checkRestore(txt) {
  const out = $('#rs-out'); RS = null; let b;
  try { b = JSON.parse(txt); } catch (e) { out.innerHTML = '<p class="rs-err">JSON으로 읽을 수 없습니다 (파일이 잘렸거나 다른 형식).</p>'; return; }
  const v = store.validate(b, ctxV());
  if (!v.ok) { out.innerHTML = `<p class="rs-err"><b>복원할 수 없습니다.</b> ${v.errors.slice(0, 6).join(' ')}</p><p class="note">지금 데이터는 바뀌지 않았습니다.</p>`; return; }
  persist(); persistDB();
  const cur = store.makeBackup(false).summary, nb = v.summary, rowS = (lab, a, c) => `<tr><td>${lab}</td><td class="num">${a}</td><td class="num">${c}</td></tr>`;
  RS = b;
  out.innerHTML = `<p>백업 <b>${b.app_version ? 'v' + b.app_version : ''}</b> · ${tstr(b.created)} · ${b.schema}${b.includes_ui ? ' · 화면 설정 포함' : ''} · 체크섬 일치${v.incomplete ? ' · <b class="st-WARNING">⚠ 불완전한 백업</b>' : ''}</p>`
    + `<table class="ltbl"><tr><th>항목</th><th>백업</th><th>지금 이 브라우저</th></tr>${rowS('플랫폼', nb.platforms.map((x) => x.id).join(', ') || '—', cur.platforms.map((x) => x.id).join(', ') || '—')}${rowS('별', nb.stars, cur.stars)}${rowS('부품 카드', nb.cards, cur.cards)}${rowS('레벨 설계', nb.designs, cur.designs)}${rowS('Design DB 레코드', nb.db, cur.db)}${rowS('Design Lab 미션 (이전 완료 포함)', nb.labMissions, cur.labMissions)}</table>`
    + (v.warnings.length ? `<p class="rs-warn">${v.warnings.slice(0, 5).join(' ')}</p>` : '')
    + (v.incomplete ? '<p class="note">불완전한 백업의 손상 원문은 복원 시 이 브라우저의 보관함(smq3-quarantine)에도 복사되어 나중에 복구할 수 있습니다.</p>' : '')
    + `<p class="note">복원하면 위 “지금” 데이터가 백업 내용으로 <b>바뀝니다</b>(합치기 아님). 복원 직전 데이터는 자동 보관되어 “복원 되돌리기”로 돌아갈 수 있습니다.</p>`
    + '<label class="chk"><input type="checkbox" id="rs-ok"> 지금 데이터를 이 백업으로 바꾸는 것을 확인했습니다</label><label class="chk"><input type="checkbox" id="rs-had"> 지금 데이터를 이미 따로 백업했습니다 (보관 공간이 없을 때만 필요)</label>'
    + '<div class="row-btns"><button class="btn pri" id="rs-go" disabled>이 백업으로 복원</button></div><p class="note" id="rs-msg" aria-live="polite"></p>';
}
$('#rs-check').addEventListener('click', () => checkRestore($('#rs-ta').value));
$('#rs-file').addEventListener('change', (e) => { const f = e.target.files && e.target.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { $('#rs-ta').value = String(rd.result); checkRestore(String(rd.result)); }; rd.readAsText(f); e.target.value = ''; });
$('#rs-out').addEventListener('change', (e) => { if (e.target.id === 'rs-ok') $('#rs-go').disabled = !e.target.checked; });
const reloadSoon = () => setTimeout(() => { try { location.reload(); } catch (e) { /* the page keeps the old state until reopened */ } }, 900);
$('#rs-out').addEventListener('click', (e) => {
  if (e.target.id !== 'rs-go' || !RS || state.fabRunning || state.aiRunning != null) return;
  const r = store.restore(RS, { ctx: ctxV(), allowNoUndo: !!($('#rs-had') && $('#rs-had').checked) }), msg = $('#rs-msg');
  if (!r.ok) { msg.innerHTML = `<span class="rs-err">${r.err}</span> 지금 데이터는 그대로입니다.`; return; }
  msg.innerHTML = `<b class="st-PASS">복원했습니다.</b> ${r.undoSaved ? '복원 직전 데이터를 보관했습니다. ' : ''}${r.rawKept > 0 ? `손상 원문 ${r.rawKept}건을 보관함에 복사했습니다. ` : r.rawKept < 0 ? '<b class="st-FAIL">손상 원문을 보관함에 복사하지 못했습니다 — 백업 파일을 지우지 마세요.</b> ' : ''}새 데이터로 다시 불러옵니다…`; RS = null; reloadSoon();
});
function renderUndo() {
  const u = store.undoInfo(), box = $('#rs-undo');
  box.innerHTML = u ? `<p class="note">복원 직전 데이터가 보관되어 있습니다 (${tstr(u.at)}). <button class="btn" id="rs-undo-b">복원 되돌리기</button></p>` : '';
}
$('#rs-undo').addEventListener('click', (e) => { if (e.target.id !== 'rs-undo-b') return; const r = store.undo(); $('#rs-undo').innerHTML = r.ok ? '<p class="note"><b class="st-PASS">되돌렸습니다.</b> 다시 불러옵니다…</p>' : `<p class="rs-err">${r.err}</p>`; if (r.ok) reloadSoon(); });
window.GAME_DATA = { open: openData };
// a model-confidence badge opens the Learning Guide at its model-limits section (F)
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-conf]'); if (!b || !window.GAME_GUIDE) return;
  const lab = window.LABUI && window.LABUI.isOpen();
  if (lab) { const g = $('#lab-guide'); if (g) g.click(); } else window.GAME_GUIDE.open();
  setTimeout(() => { const h = document.querySelector('#g-F-h'); if (h) { if (h.scrollIntoView) h.scrollIntoView({ block: 'start' }); h.focus({ preventScroll: true }); } }, 60);
});

const UI = store.get('smq3-ui', {}) || {};   // view-only preferences (which sections are open); never progress or designs
$('#cards').open = !!UI.cards; $('#cards').addEventListener('toggle', () => { UI.cards = $('#cards').open; store.set('smq3-ui', UI); });
$('#scope').addEventListener('toggle', () => { UI.scope = $('#scope').open; store.set('smq3-ui', UI); }); $('#scope').open = !!UI.scope;
function start(data) {
  renderSave();
  if (data && data.DES) { DES = data.DES; if (LMAP[data.id] && !LMAP[data.id].locked) state.id = data.id; }
  if (!state.plat) { showSetup(true); } else { applyPlatform(); showSetup(false); setupLevel(); }
  let lastW = 0; new ResizeObserver(() => { const w = $('#cwrap').clientWidth; if (w && w !== lastW) { lastW = w; sizeCanvas(); } }).observe($('#cwrap'));   // w = 0 while the Design Lab hides the game
}
if (hot && hot.ready) hot.ready(start); else start(hot && hot.data ? hot.data : {});
})();
