// ===== Persistence: one place that writes localStorage, reports save state, and makes / checks / restores full backups =====
// Every write goes through SMQ_STORE.set, which returns false and flips the state to 'failed' when the browser refuses
// (quota, private mode, blocked storage). Nothing is retried silently: the header shows the state and the data dialog
// offers a full backup. The backup is one versioned JSON (smq-backup/1) of every key the game owns.
const BUILD = (typeof SMQ_BUILD !== 'undefined' && SMQ_BUILD) || { version: '1.0.0', channel: 'dev', commit: null, date: null, offline: false };
// model identity recorded with every Fab Run: same design + seed + model version → the same wafer result
const MODEL_VERSION = 'smq-model-1.0';
const SMQ_STORE = (() => {
  const W = typeof window !== 'undefined' ? window : null;
  const LS = () => (W ? W.localStorage : null);
  // keys the game owns; 'ui' keys are view preferences (optional in a backup)
  const KEYS = ['smq3-progress', 'smq3-designs', 'smq3-db', 'smq3-lab', 'smq3-id', 'smq-mode-v1', 'smq-hint-v1'];
  const UI_KEYS = ['smq3-ui', 'smq-guide-depth'];
  const META = 'smq3-meta', UNDO = 'smq3-undo';
  // raw copies of stored values that could not be read as JSON — kept before the game overwrites them with defaults
  const QUAR = 'smq3-quarantine';
  const SCHEMA = 'smq-backup/1';
  const S = { state: 'saved', failed: new Set(), err: null, lastOk: null, available: true };
  const subs = [];
  const emit = () => subs.forEach((f) => { try { f(status()); } catch (e) { /* listener error */ } });
  try { const k = '__smq_probe__'; LS().setItem(k, '1'); LS().removeItem(k); } catch (e) { S.available = false; S.state = 'failed'; S.err = (e && e.name) || 'storage unavailable'; }
  const isObj = (o) => o && typeof o === 'object' && !Array.isArray(o);
  function get(k, d) { try { const v = LS().getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function raw(k) { try { return LS().getItem(k); } catch (e) { return null; } }
  // read one key: { v } (null when absent) or { err } when the browser refuses the read
  function readKey(k) { try { return { v: LS().getItem(k) }; } catch (e) { return { err: (e && e.name) || String(e) }; } }
  const errMsg = (e) => String((e && e.message) || e).slice(0, 160);
  // per-key structure (the same rules a restore applies); a list of problems, empty when the value is usable
  function checkKey(k, v, ctx) {
    const errors = [], warnings = [], plats = (ctx && ctx.platforms) || null, levels = (ctx && ctx.levels) || null;
    if (k === 'smq3-progress') {
      if (!isObj(v) || !isObj(v.by)) errors.push('smq3-progress 구조가 올바르지 않습니다 (by 없음).');
      else Object.entries(v.by).forEach(([pid, ns]) => {
        if (plats && !plats[pid]) warnings.push(`알 수 없는 플랫폼 ${pid}`);
        if (!isObj(ns) || !isObj(ns.stars) || !['easy', 'std', 'hard'].every((m) => isObj(ns.stars[m] || {}))) errors.push(`${pid}: stars 구조가 올바르지 않습니다.`);
        else ['easy', 'std', 'hard'].forEach((m) => Object.entries(ns.stars[m] || {}).forEach(([id, x]) => { if (!Number.isInteger(x) || x < 0 || x > 7) errors.push(`${pid}/${m}/${id}: 별 값 ${x}`); if (levels && !levels[id]) warnings.push(`알 수 없는 레벨 ${id}`); }));
        if (ns.cards != null && !isObj(ns.cards)) errors.push(`${pid}: cards 구조가 올바르지 않습니다.`);
      });
    }
    if (k === 'smq3-designs' && !isObj(v)) errors.push('smq3-designs 구조가 올바르지 않습니다.');
    if (k === 'smq3-db' && (!Array.isArray(v) || v.some((r) => !isObj(r) || typeof r.lv !== 'string'))) errors.push('smq3-db(Design DB) 구조가 올바르지 않습니다.');
    if (k === 'smq3-lab' && !isObj(v)) errors.push('smq3-lab 구조가 올바르지 않습니다.');
    if (k === 'smq3-id' && typeof v !== 'string') errors.push('smq3-id가 문자열이 아닙니다.');
    return { errors, warnings };
  }
  // quarantine: { key: [{ at, error, kind, raw }] } — a raw value is kept once (same text = same entry), at most 5 per key
  function quarantine() { const q = get(QUAR, {}); return isObj(q) ? q : {}; }
  function keepRaw(q, k, ent) { const a = Array.isArray(q[k]) ? q[k] : []; if (!a.some((x) => x && x.raw === ent.raw)) a.push(ent); q[k] = a.slice(-5); }
  const QS = { found: [], kept: true, err: null };   // start-up scan result (shown in the data dialog and the save chip)
  function scan() {
    if (!S.available) return;
    const q = quarantine(); let add = false;
    KEYS.concat(UI_KEYS).forEach((k) => {
      const r = readKey(k); if (r.err) { QS.found.push({ key: k, kind: 'read', error: r.err }); return; }
      if (r.v == null) return;
      let o, kind = null, error = null;
      try { o = JSON.parse(r.v); } catch (e) { kind = 'parse'; error = errMsg(e); }
      if (!kind) { const c = checkKey(k, o); if (c.errors.length) { kind = 'structure'; error = c.errors.slice(0, 3).join(' '); } }
      if (!kind) return;
      QS.found.push({ key: k, kind, error, bytes: r.v.length * 2 });
      keepRaw(q, k, { at: new Date().toISOString(), kind, error, raw: r.v }); add = true;
    });
    if (add) { try { LS().setItem(QUAR, JSON.stringify(q)); } catch (e) { QS.kept = false; QS.err = (e && e.name) || String(e); } }
  }
  // write one key; false (and state 'failed') when the browser refuses
  let locked = false;   // after a restore / undo the page reloads; until then nothing in memory may overwrite the restored data
  function set(k, v, opt) {
    if (locked) return true;
    try {
      LS().setItem(k, JSON.stringify(v));
      S.failed.delete(k); S.lastOk = Date.now();
      if (!S.failed.size) { S.state = 'saved'; S.err = null; }
      if (!(opt && opt.quiet) && KEYS.includes(k)) touch();
      emit(); return true;
    } catch (e) {
      S.failed.add(k); S.state = 'failed'; S.err = (e && (e.name === 'QuotaExceededError' || e.code === 22)) ? '저장 공간 부족 (QuotaExceeded)' : (e && e.name) || String(e);
      emit(); return false;
    }
  }
  function pending() { if (S.state !== 'failed') { S.state = 'saving'; emit(); } }
  function meta() { return get(META, {}) || {}; }
  function touch() { const m = meta(); m.lastChange = Date.now(); try { LS().setItem(META, JSON.stringify(m)); } catch (e) { /* meta is advisory */ } }
  function usage() {
    const by = {}; let total = 0;
    [...KEYS, ...UI_KEYS, META, UNDO, QUAR].forEach((k) => { const v = raw(k); if (v != null) { by[k] = v.length * 2; total += v.length * 2; } });   // UTF-16 bytes
    return { by, total };
  }
  // a backup is worth suggesting after real progress that has never been backed up, a week after the last backup, or when saving failed
  function backupAdvice(progressCount) {
    const m = meta(), now = Date.now();
    if (S.state === 'failed') return '저장 실패 — 지금 전체 백업을 내려받으세요';
    if (QS.found.length || Object.keys(quarantine()).length) return '읽을 수 없는 저장 데이터 발견 — 원문을 보관했습니다. 전체 백업을 내려받으세요';
    if (usage().total > 3.5e6) return '저장 공간의 70 % 이상 사용 — 백업 후 Design DB를 비우는 것을 권장';
    if (!progressCount) return null;
    if (!m.lastBackup) return progressCount >= 3 ? '아직 백업이 없습니다' : null;
    if (m.lastChange && m.lastChange > m.lastBackup && now - m.lastBackup > 7 * 864e5) return '마지막 백업 후 7일이 지났습니다';
    return null;
  }
  function status() { return { state: S.state, err: S.err, failed: [...S.failed], lastOk: S.lastOk, available: S.available, meta: meta(), corrupt: QS.found.slice(), quarantine: quarInfo(), quarantineKept: QS.kept, quarantineErr: QS.err }; }
  function quarInfo() { const q = quarantine(); return Object.keys(q).map((k) => ({ key: k, n: (q[k] || []).length, bytes: (q[k] || []).reduce((a, e) => a + String((e && e.raw) || '').length * 2, 0), at: ((q[k] || []).slice(-1)[0] || {}).at })); }
  function clearQuarantine() { try { LS().removeItem(QUAR); QS.found = QS.found.filter((p) => p.kind === 'read'); emit(); return true; } catch (e) { return false; } }
  const fnv = (str) => { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, '0'); };
  // ---- full backup ----
  function summarize(data) {
    const P = data['smq3-progress'] || {}, by = (P && P.by) || {}, out = { platforms: [], stars: 0, cards: 0, designs: 0, db: Array.isArray(data['smq3-db']) ? data['smq3-db'].length : 0, labMissions: 0 };
    const pc = (m) => ((m & 1) + ((m >> 1) & 1) + ((m >> 2) & 1));
    Object.keys(by).forEach((pid) => {
      const ns = by[pid] || {}, st = ns.stars || {};
      const n = ['easy', 'std', 'hard'].reduce((a, md) => a + Object.values(st[md] || {}).reduce((b, m) => b + pc(m | 0), 0), 0);
      const c = Object.keys(ns.cards || {}).length, dz = Object.keys((data['smq3-designs'] || {})[pid] || {}).length;
      const lab = ((data['smq3-lab'] || {})[pid] || {}).done || {};
      out.platforms.push({ id: pid, stars: n, cards: c, designs: dz, lab: Object.values(lab).filter(Boolean).length });
      out.stars += n; out.cards += c; out.designs += dz; out.labMissions += Object.values(lab).filter(Boolean).length;
    });
    return out;
  }
  // A backup never drops data silently: a key that cannot be read, parsed or used is listed in `problems`, its raw text goes to
  // `unreadable` (with the raw copies kept at start-up), `complete` is false, and `unreadable_checksum` protects that text.
  // `data` and `checksum` keep the smq-backup/1 meaning, so older readers and older backups stay compatible.
  function makeBackup(withUI) {
    const data = {}, problems = [], unreadable = {}, now = new Date().toISOString();
    KEYS.concat(withUI ? UI_KEYS : []).forEach((k) => {
      const r = readKey(k);
      if (r.err) { problems.push({ key: k, kind: 'read', error: r.err }); return; }
      if (r.v == null) return;
      let o; try { o = JSON.parse(r.v); } catch (e) { problems.push({ key: k, kind: 'parse', error: errMsg(e), bytes: r.v.length * 2 }); keepRaw(unreadable, k, { at: now, kind: 'parse', error: errMsg(e), raw: r.v, source: 'current' }); return; }
      const c = checkKey(k, o);
      if (c.errors.length) { const er = c.errors.slice(0, 3).join(' '); problems.push({ key: k, kind: 'structure', error: er, bytes: r.v.length * 2 }); keepRaw(unreadable, k, { at: now, kind: 'structure', error: er, raw: r.v, source: 'current' }); return; }
      data[k] = o;
    });
    const q = quarantine();
    Object.keys(q).filter((k) => KEYS.includes(k) || (withUI && UI_KEYS.includes(k))).forEach((k) => {
      (q[k] || []).forEach((e) => { if (e && typeof e.raw === 'string') keepRaw(unreadable, k, { ...e, source: 'quarantine' }); });
      if (!problems.some((p) => p.key === k)) problems.push({ key: k, kind: 'quarantined', error: ((q[k] || []).slice(-1)[0] || {}).error || '', at: ((q[k] || []).slice(-1)[0] || {}).at });
    });
    const body = JSON.stringify(data), b = { schema: SCHEMA, app: 'SPEC-to-MASK Quest', app_version: BUILD.version, build: BUILD.commit || BUILD.channel, created: now, includes_ui: !!withUI,
      complete: !problems.length, summary: summarize(data), checksum: 'fnv1a32:' + fnv(body), data };
    if (problems.length) b.problems = problems;
    if (Object.keys(unreadable).length) { b.unreadable = unreadable; b.unreadable_checksum = 'fnv1a32:' + fnv(JSON.stringify(unreadable)); }
    return b;
  }
  function markBackup() { const m = meta(); m.lastBackup = Date.now(); try { LS().setItem(META, JSON.stringify(m)); } catch (e) { /* advisory */ } emit(); }
  // structural check of a parsed backup; returns { ok, incomplete, errors[], warnings[], problems[], summary }
  //   ok = restorable; incomplete = the backup itself says some stored data could not be read (never shown as a plain PASS)
  function validate(b, ctx) {
    const errors = [], warnings = [];
    if (!isObj(b)) return { ok: false, errors: ['JSON 객체가 아닙니다.'], warnings };
    if (b.schema !== SCHEMA) { errors.push(typeof b.schema === 'string' && /^smq-backup\//.test(b.schema) ? `지원하지 않는 백업 버전 ${b.schema} (이 프로그램은 ${SCHEMA})` : 'SPEC-to-MASK 전체 백업(smq-backup/1)이 아닙니다. 설계 내보내기(smq-design/1)나 smq-circuit/1 파일은 복원할 수 없습니다.'); return { ok: false, errors, warnings }; }
    if (!isObj(b.data)) { errors.push('data가 없습니다.'); return { ok: false, errors, warnings }; }
    const ck = 'fnv1a32:' + fnv(JSON.stringify(b.data));
    if (b.checksum !== ck) errors.push('체크섬이 맞지 않습니다 — 파일이 잘렸거나 수정되었습니다 (손상된 백업).');
    const d = b.data;
    Object.keys(d).forEach((k) => { if (!KEYS.includes(k) && !UI_KEYS.includes(k)) warnings.push(`알 수 없는 키 ${k}는 무시합니다.`); });
    Object.keys(d).forEach((k) => { const c = checkKey(k, d[k], ctx); errors.push(...c.errors); warnings.push(...c.warnings); });
    // completeness (v1.0.1): unreadable raw text must be intact, and an incomplete backup is reported, not passed silently
    const U = b.unreadable;
    if (U != null) {
      if (!isObj(U) || Object.values(U).some((a) => !Array.isArray(a) || a.some((e) => !isObj(e) || typeof e.raw !== 'string'))) errors.push('unreadable(보관된 원문) 구조가 올바르지 않습니다.');
      else if (b.unreadable_checksum !== 'fnv1a32:' + fnv(JSON.stringify(U))) errors.push('보관된 원문의 체크섬이 맞지 않습니다 — 파일이 잘렸거나 수정되었습니다.');
    }
    const problems = Array.isArray(b.problems) ? b.problems.filter(isObj) : [];
    const incomplete = b.complete === false || problems.length > 0 || (!!isObj(U) && Object.keys(U).length > 0);
    if (incomplete) {
      const kname = { parse: 'JSON으로 읽을 수 없음', structure: '구조 오류', read: '브라우저가 읽기를 거부', quarantined: '시작할 때 손상 발견 (원문 보관)' };
      const ks = problems.length ? problems.map((p) => `${p.key}: ${kname[p.kind] || p.kind}`) : Object.keys(U || {}).map((k) => `${k}: 원문만 보관`);
      warnings.unshift(`불완전한 백업 — ${ks.join(' · ')}. 이 항목은 백업에 정상 데이터로 들어 있지 않습니다${isObj(U) && Object.keys(U).length ? ' (원문은 unreadable에 그대로 보관)' : ''}. 복원해도 이 항목의 지금 데이터는 지우지 않습니다.`);
    }
    return { ok: !errors.length, incomplete, problems, errors, warnings, summary: summarize(d) };
  }
  // replace the game's keys with the backup's; on any refused write, put every key back as it was
  function restore(b, opt) {
    const v = validate(b, opt && opt.ctx); if (!v.ok) return { ok: false, err: v.errors.join(' ') };
    const keys = KEYS.concat(b.includes_ui ? UI_KEYS : []), prev = {};
    keys.forEach((k) => { prev[k] = raw(k); });
    let undoSaved = false;
    try { LS().setItem(UNDO, JSON.stringify({ at: new Date().toISOString(), data: prev })); undoSaved = true; } catch (e) { undoSaved = false; }
    if (!undoSaved && !(opt && opt.allowNoUndo)) return { ok: false, err: '복원 전 현재 데이터를 보관할 공간이 없습니다. 먼저 “백업 파일 내려받기”로 현재 데이터를 저장한 뒤, “현재 데이터를 이미 백업했습니다”를 체크하고 다시 복원하세요.', needUndo: true };
    try {
      // a key the backup could not carry (listed in problems / unreadable) is left as it is here, never deleted
      const skip = new Set([...(Array.isArray(b.problems) ? b.problems.map((p) => p && p.key) : []), ...Object.keys(isObj(b.unreadable) ? b.unreadable : {})]);
      keys.forEach((k) => { if (b.data[k] !== undefined) LS().setItem(k, JSON.stringify(b.data[k])); else if (!skip.has(k)) LS().removeItem(k); });
    } catch (e) {
      keys.forEach((k) => { try { if (prev[k] == null) LS().removeItem(k); else LS().setItem(k, prev[k]); } catch (e2) { /* best effort */ } });
      return { ok: false, err: '복원 중 저장이 거부되어 원래 데이터로 되돌렸습니다 (' + ((e && e.name) || e) + ').' };
    }
    const m = meta(); m.restoredAt = Date.now(); m.lastBackup = Date.now(); try { LS().setItem(META, JSON.stringify(m)); } catch (e) { /* advisory */ }
    // the backup's unreadable raw text is copied into this browser's quarantine, so it stays recoverable here too
    let rawKept = 0;
    if (isObj(b.unreadable)) { const q = quarantine(); Object.entries(b.unreadable).forEach(([k, a]) => (a || []).forEach((e) => { keepRaw(q, k, { at: e.at, kind: e.kind, error: e.error, raw: e.raw }); rawKept++; })); try { LS().setItem(QUAR, JSON.stringify(q)); } catch (e) { rawKept = -1; } }
    locked = true;
    return { ok: true, undoSaved, rawKept };
  }
  function undoInfo() { const u = get(UNDO, null); return u && u.at ? { at: u.at } : null; }
  function undo() {
    const u = get(UNDO, null); if (!u || !isObj(u.data)) return { ok: false, err: '되돌릴 데이터가 없습니다.' };
    const now = {}; Object.keys(u.data).forEach((k) => { now[k] = raw(k); });
    try { Object.entries(u.data).forEach(([k, v]) => { if (v == null) LS().removeItem(k); else LS().setItem(k, v); }); LS().removeItem(UNDO); locked = true; return { ok: true }; }
    catch (e) { Object.entries(now).forEach(([k, v]) => { try { if (v == null) LS().removeItem(k); else LS().setItem(k, v); } catch (e2) { /* best effort */ } }); return { ok: false, err: String((e && e.name) || e) }; }
  }
  scan();
  return { get, set, isLocked: () => locked, pending, status, usage, backupAdvice, makeBackup, markBackup, validate, restore, undo, undoInfo, quarantine, clearQuarantine, subscribe: (f) => subs.push(f), KEYS, UI_KEYS, SCHEMA, QUAR, fnv };
})();
if (typeof window !== 'undefined') { window.SMQ_STORE = SMQ_STORE; window.SMQ_BUILD_INFO = BUILD; }
