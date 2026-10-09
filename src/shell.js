// ===== Game shell: campaign, scoring, objectives, coach, fab, AI rival, Design DB, cards =====
(() => {
const $ = (s) => document.querySelector(s);
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
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
  credits: {}, fab: {}, wafer: {}, fromAI: {}, cur: null, fabRunning: false, aiRunning: null, lastLogged: '', land: {}, hintTier: 1
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
window.GAME_LEV = (id) => { if (!LMAP[id] || !state.plat) return null; const sv = state.id; state.id = id; const e = lev(); state.id = sv; return e; };
// read-only snapshot for the Learning Guide (src/guide.js): it explains and explores, it never writes to the design or the score
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
  }).join('')}</div></div>`).join('');
  const n = PLAY.filter((l) => PP().cards[l.id]).length;
  $('#cardcount').hidden = false;
  $('#cardcount').innerHTML = `부품 카드 <b>${n}</b> / ${PLAY.length} · Stage ${LMAP[state.id].stage}`;
}
$('#map').addEventListener('click', (e) => {
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
  putV(k, nv); state.fromAI[state.id] = false;
  const K = kind();
  if (!curStep() && K.onParam) K.onParam(lev(), des(), k);   // e.g. a boundary preset writes W and H
  if (p.relayout) {   // a discrete choice that changes the parameter list
    const had = document.activeElement && document.activeElement.dataset ? document.activeElement : null, hk = had && had.dataset.k, hd = had && had.dataset.d;
    renderParams(); syncParamUI();
    const back = hk ? document.querySelector(hd ? `.nudge[data-k="${hk}"][data-d="${hd}"]` : `#p-${hk}`) : null; if (back) back.focus();
  }
  else { if (fromBtn) $('#p-' + k).value = nv; $('#o-' + k).textContent = pFmt(p, nv); }
  requestEval(); scheduleCommit();
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
    drawView(); renderHUD(); renderObjectives(); renderFabPanel(); renderHint(); scheduleIdle();
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
  drawView(); renderHUD(); renderObjectives(); renderFabPanel(); renderHint(); drawStrips(false); scheduleIdle();
}
let idleT = null;
function scheduleIdle() { clearTimeout(idleT); idleT = setTimeout(() => { computeChart(); drawStrips(true); renderCoach(); }, 110); }
let commitT = null;
function scheduleCommit() { clearTimeout(commitT); commitT = setTimeout(commit, 450); }
function commit() {
  const c = state.cur; if (!c) return;
  persist();
  if (c.S || c.pr || (c.res.drc && c.res.drc.length) || state.fromAI[state.id]) return;
  if (c.key !== state.lastLogged) { state.lastLogged = c.key; DB.push(rec(state.id, 'H', c.d, c.res)); persistDB(); }
  awardStars(); maybeCard();
  if (c.sc.total > (PP().best[state.id] || 0)) PP().best[state.id] = Math.round(c.sc.total);
  persist(); renderMap(); renderAI(); renderDB(); renderCards();
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
    return;
  }
  const ob = objectives(), got = starsOf(state.id);
  $('#objs').innerHTML = ob.map((o, i) => `<div class="obj ${got & (1 << i) ? 'got' : ''} ${o.pass ? 'live' : ''}">
      <div class="obj-h"><span class="st">${'★'.repeat(o.t) + '☆'.repeat(3 - o.t)}</span><span class="tag">${o.pass ? '현재 설계 달성' : o.tag}</span></div>
      <ul>${o.items.map((x) => `<li class="${x.na ? 'na' : x.ok ? 'ok' : 'no'}${x.crit ? ' crit' : ''}"><span class="k">${x.k}</span><span class="v">${x.v}</span></li>`).join('')}</ul></div>`).join('');
}
function renderCards() {
  const slots = LEVELS.slice();
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
function drawView() { const c = state.cur; if (!c || c.l.id !== state.id) return; ((c.S && c.S.draw) || kind().draw)($('#field'), c.l, c.res, { hintTier: state.hintTier, redraw: drawView }); }
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
}
function computeChart() {
  const c = state.cur, src = c.S && c.S.chart ? c.S : kind(), out = src.chart(c.l, c.res);
  $('#chart').innerHTML = out.html; $('#legend').innerHTML = out.legend; $('#chart-title').textContent = src.chartTitle(c.l, c.res);
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
  const box = $('#coach'), m = coachMsg(); box.hidden = !m; if (!m) return;
  box.innerHTML = `<div class="coach-h"><span class="badge">코치 · ${HINTS[state.hintTier]}</span><b>${m.h}</b></div><p>${m.b}</p>`;
}

/* ---------- Fab run ---------- */
function drawWafer(dies, done) {
  const cv = $('#wafer'), ctx = cv.getContext('2d'), S = cv.width, R = S * 0.47, cx = S / 2, cy = S / 2;
  ctx.clearRect(0, 0, S, S); ctx.fillStyle = '#1a2431'; ctx.strokeStyle = '#334459'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, R, 0.5 * Math.PI + 0.12, 2.5 * Math.PI - 0.12); ctx.closePath(); ctx.fill(); ctx.stroke();
  const cell = (2 * R * 0.94) / 9.4, g = cell * 0.12, all = dies || makeWafer(1);
  all.forEach((die, idx) => { const x = cx + (die.i - 4) * cell, y = cy + (die.j - 4) * cell; ctx.fillStyle = dies && idx < done ? (die.pass ? '#5dd193' : '#ff6b6b') : '#253244'; ctx.fillRect(x - cell / 2 + g, y - cell / 2 + g, cell - 2 * g, cell - 2 * g); });
}
function renderFabPanel() {
  const l = lev(), c = state.cur, cr = credits(), btn = $('#btn-fab'), drcBad = c.res.drc && c.res.drc.length;
  if (c.S || c.pr) {
    btn.disabled = true; btn.textContent = 'Tape-out'; $('#yield').textContent = '—'; $('#yield').className = 'yield na'; $('#fab-kv').innerHTML = '';
    $('#fab-note').textContent = c.S ? 'Guided 단계에서는 공정 런이 없습니다. 마지막 단계(Full Design)에서 같은 설계로 Tape-out 합니다.' : c.pr.note;
    return;
  }
  btn.disabled = state.fabRunning || cr <= 0 || drcBad;
  btn.textContent = state.fabRunning ? '공정 진행 중…' : `Tape-out · 크레딧 ${cr}/${credits0()}`;
  const f = state.fab[state.id], y = $('#yield');
  if (!state.fabRunning) { if (f) { y.textContent = Math.round(f.yield * 100) + '%'; y.className = 'yield ' + (f.yield >= l.fab.y ? 'ok' : 'no'); } else { y.textContent = '—'; y.className = 'yield na'; } }
  const crit = kind().fabCrit(l), stale = f && f.key !== c.key;
  $('#fab-kv').innerHTML = f ? `양품 <b>${f.pass}</b> / ${f.n} 다이<br>판정 ${crit}<br>목표 ≥ ${Math.round(l.fab.y * 100)}%${stale ? '<br><span style="color:var(--fail)">설계가 바뀌어 수율 점수 미반영</span>' : ''}`
    : `판정 ${crit}<br>목표 ≥ ${Math.round(l.fab.y * 100)}%<br>다이 ${makeWafer(1).length}개 · 9×9 grid`;
  $('#fab-note').textContent = drcBad ? 'DRC를 통과해야 Tape-out할 수 있습니다.' : cr <= 0 ? '크레딧을 모두 썼습니다. 레벨 재시작으로 충전하세요.'
    : '웨이퍼마다 CD 오프셋, 두께 bowl, 다이 랜덤 변동이 새로 뽑힙니다. 공칭 성능에 여유가 없으면 수율이 무너집니다.';
}
function tapeOut() {
  const c = state.cur, id = state.id, l = lev(), K = kind();
  if (state.fabRunning || c.S || c.pr || (c.res.drc && c.res.drc.length) || credits() <= 0) return;
  state.credits[id] = credits() - 1; state.fabRunning = true;
  const dies = makeWafer((Date.now() ^ (Math.random() * 1e9)) & 0x7fffffff, MODES[state.mode].sig), d = { ...c.d }, key = c.key;
  let k = 0, pass = 0; $('#yield').textContent = '…'; $('#yield').className = 'yield na'; renderFabPanel();
  const step = () => {
    const t0 = performance.now();
    while (k < dies.length && performance.now() - t0 < 14) { dies[k].pass = K.fabPass(l, K.evaluate(l, d, { ...dies[k], dt: dies[k].dt * l.pf.dt / 0.006 })); if (dies[k].pass) pass++; k++; }
    if (id === state.id) { drawWafer(dies, k); $('#yield').textContent = Math.round(pass / Math.max(1, k) * 100) + '%'; }
    if (k < dies.length) { requestAnimationFrame(step); return; }
    state.fabRunning = false; state.fab[id] = { key, yield: pass / dies.length, pass, n: dies.length }; state.wafer[id] = dies;
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
  s += `<line x1="${X(lev().s2.size)}" x2="${X(lev().s2.size)}" y1="${mt}" y2="${H - mb}" stroke="rgba(242,176,74,.35)" stroke-dasharray="3 4"/>`;
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
  if (l.concepts) { const seen = (PP().seen = PP().seen || {}); cc.innerHTML = `<summary>개념 노트 · ${l.concepts.length}개 — ${l.concepts.map((c) => c[0].replace(/<[^>]+>/g, '')).join(', ')}</summary><dl>${l.concepts.map(([t, d]) => `<dt>${t}</dt><dd>${d}</dd>`).join('')}</dl>`; cc.open = !seen[l.id]; seen[l.id] = 1; }
  const pf = PLATFORMS[state.plat]; $('#plat-chip').innerHTML = `${pf.short} · ${pf.band}<span>변경</span>`; $('#plat-chip').hidden = false;
  state.land = {}; state.cur = null;
  renderMap(); renderGuided(); renderParams(); syncParamUI(); renderModeSeg(); renderHintSeg(); sizeCanvas();
  const w = state.wafer[state.id]; drawWafer(w, w ? w.length : 0);
  evaluate(); renderAI(); renderDB(); renderCards();
}
const hot = window.claude && window.claude.hot;
if (hot && hot.snapshot) hot.snapshot(() => ({ id: state.id, DES }));
function start(data) {
  if (data && data.DES) { DES = data.DES; if (LMAP[data.id] && !LMAP[data.id].locked) state.id = data.id; }
  if (!state.plat) { showSetup(true); } else { applyPlatform(); showSetup(false); setupLevel(); }
  let lastW = 0; new ResizeObserver(() => { const w = $('#cwrap').clientWidth; if (w !== lastW) { lastW = w; sizeCanvas(); } }).observe($('#cwrap'));
}
if (hot && hot.ready) hot.ready(start); else start(hot && hot.data ? hot.data : {});
})();
