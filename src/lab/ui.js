// ===== PIC Design Lab UI: library | workspace (schematic / layout) | mission + inspector, six missions, progress states =====
// State lives in localStorage 'smq3-lab' per platform ({ d, done, mode, cur, view, ran, exported }); nothing in the campaign
// (stars, cards, designs) is written from here. Every number comes from src/lab/engine.js (LAB), which builds the PIC from the
// player's cards or the levels' reference designs.
window.LABUI = (() => {
  const $ = (s) => document.querySelector(s), box = $('#lab');
  if (!box || typeof LAB === 'undefined') return null;
  const KEY = 'smq3-lab';
  const load = () => { try { const v = localStorage.getItem(KEY); return v ? JSON.parse(v) : {}; } catch (e) { return {}; } };
  const save = () => scope ? (window.SMQ_STUDIO && window.SMQ_STUDIO.save()) : SMQ_STORE.set(KEY, LS);   // a refused write shows in the header save chip (src/persist.js)
  let LS = load(), isOpen = false, C = null, CHK = null, MS = null, sel = null, cam = null, drag = null, timer = null, diag = null;
  const SH = () => window.GAME_SHELL;
  let scope = null;
  const S = () => { if (scope) return scope.lab || (scope.lab = {}); const p = SH().plat(); LS[p] = LS[p] || {}; return LS[p]; };
  const ctx = () => ({ pf: SH().pf(), lev: (id) => window.GAME_LEV(id), cards: SH().cards(), des3: Object.keys(SH().design('3A+')).length ? SH().design('3A+') : null, desW: Object.keys(SH().design('3W') || {}).length ? SH().design('3W') : null, gds: S().gds || null });
  function arch3() {
    const cd = SH().cards()['3A+']; if (cd && cd.d) return { mod: cd.d.mod | 0, share: cd.d.share | 0, src: '내 3A+ 카드' };
    const de = SH().design('3A+'); if (Object.keys(de).length) return { mod: de.mod | 0, share: de.share | 0, src: '3A+ 현재 설계' };
    const l = window.GAME_LEV('3A+'); return { mod: l.ref.mod | 0, share: l.ref.share | 0, src: '3A+ 기준 설계' };
  }
  const des = () => { const s = S(); if (!s.d) { const a = arch3(); s.d = LAB.defaults(ctx(), a); save(); } return s.d; };

  /* ---------------- parameters and missions ---------------- */
  const SHL = ['1:1 · 레이저 8개', '1:2 · 레이저 4개', '1:4 · 레이저 2개', '1:8 · 레이저 1개'];
  const PR = (pf) => ({
    mod: { k: 'mod', label: '송신 아키텍처 (변조기)', sym: 'MOD', min: 0, max: 2, step: 1, dec: 0, unit: '', labels: ['DR8 · TW-MZM ×8 (2-3)', 'DR8 · MRR ×8 (2-3R)', 'WDM8 · 공유 버스 링 ×8 (3W)'] },
    share: { k: 'share', label: '레이저 공유 (입력 수 · 분배 트리)', sym: 'N', min: 0, max: 3, step: 1, dec: 0, unit: '', labels: SHL },
    mon: { k: 'mon', label: '모니터 탭 + Ge PD (바이어스·링 락)', sym: 'MON', min: 0, max: 1, step: 1, dec: 0, unit: '', labels: ['없음', '2 % 탭 + PD'] },
    W: { k: 'W', label: '다이 폭', sym: 'W', min: 0.5, max: 12, step: 0.1, dec: 1, unit: 'mm' },
    H: { k: 'H', label: '다이 높이', sym: 'H', min: 0.5, max: 8, step: 0.1, dec: 1, unit: 'mm' },
    edge: { k: 'edge', label: '가장자리 여유', sym: 'e', min: 0, max: 300, step: 5, dec: 0, unit: 'µm' },
    P: { k: 'P', label: '레인 피치', sym: 'p<sub>L</sub>', min: 50, max: 600, step: 5, dec: 0, unit: 'µm' },
    stag: { k: 'stag', label: '레인 엇갈림 (RF 급전 통로)', sym: 'Δx', min: 0, max: 800, step: 10, dec: 0, unit: 'µm' },
    fp: { k: 'fp', label: '광섬유 피치 (FAU)', sym: 'p<sub>F</sub>', min: 127, max: 250, step: 123, dec: 0, unit: 'µm' },
    wr: { k: 'wr', label: '배선 도파로 폭 (긴 넷 몸통)', sym: 'w<sub>r</sub>', min: +pf.w0.toFixed(2), max: pf.mat === 'si' ? 3 : 4, step: 0.02, dec: 2, unit: 'µm' },
    bend: { k: 'bend', label: '굽힘 형상', sym: 'bend', min: 0, max: 1, step: 1, dec: 0, unit: '', labels: ['원호', 'Euler (곡률 연속)'] },
    R: { k: 'R', label: '굽힘 반경 (Euler: R<sub>min</sub>)', sym: 'R', min: pf.mat === 'si' ? 1 : 10, max: pf.mat === 'si' ? 100 : 500, step: pf.mat === 'si' ? 0.5 : 5, dec: 1, unit: 'µm' },
    jog: { k: 'jog', label: '팬 수직선 간격', sym: 'p<sub>j</sub>', min: 1, max: 40, step: 0.5, dec: 1, unit: 'µm' },
    rf: { k: 'rf', label: '전기 인터페이스', sym: 'I/O', min: 0, max: 1, step: 1, dec: 0, unit: '', labels: ['가장자리 와이어본드 패드', '플립칩 마이크로범프 (3D 구동기)'] },
    rfSide: { k: 'rfSide', label: 'RF 패드 변 (DC는 반대 변)', sym: 'RF', min: 0, max: 1, step: 1, dec: 0, unit: '', labels: ['북(N)', '남(S)'] },
    pp: { k: 'pp', label: '패드 피치', sym: 'p<sub>pad</sub>', min: 90, max: 200, step: 5, dec: 0, unit: 'µm' },
    rp: { k: 'rp', label: '링 간격 (WDM 버스, 3W 설계값에서 시작)', sym: 'p<sub>ring</sub>', min: 15, max: 150, step: 1, dec: 0, unit: 'µm' }
  });
  const MISS = [
    { id: 'schematic', short: '회로도', title: 'Mission 1 · 1.6T Tx 회로도', keys: ['mod', 'share', 'mon'], adv: [],
      intro: '1.6T 송신 PIC의 회로를 정합니다 (DR8: MZM ×8 또는 링 ×8 · WDM8: 3W의 공유 버스 링 ×8, 입력·출력 각 1개). 변조기 8개, 레이저 입력과 1×2 MMI 분배 트리, 레인마다 출력 SSC가 자동으로 만들어집니다. 레이저 공유를 바꾸면 입력 포트 수와 분배 트리의 깊이가 함께 바뀝니다. 모든 소자는 실제 광·전기 포트를 가진 객체이고, 연결은 포트 사이의 넷입니다.',
      done: (m) => m.schematic },
    { id: 'floorplan', short: '평면 배치', title: 'Mission 2 · Floorplan', keys: ['W', 'H'], adv: ['edge', 'P', 'stag', 'fp'],
      intro: '다이 크기를 정하고 소자를 배치합니다. 입력 광섬유는 서쪽(W), 출력 8개는 동쪽(E) 가장자리에 FAU 피치로 놓이고, RF 패드는 북쪽, DC 패드는 남쪽입니다. 자동 배치가 레인 피치와 RF 급전 통로(레인 엇갈림)를 정합니다 — 다이가 작으면 원인과 필요한 크기를 알려 줍니다.',
      done: (m) => m.floorplan },
    { id: 'routing', short: '광 배선', title: 'Mission 3 · Optical Routing', keys: ['wr', 'bend'], adv: ['R', 'jog'],
      intro: '회로도의 광 넷을 실제 도파로로 그립니다: 직선, 90° 코너(원호 또는 Euler), 작은 S-bend. 긴 넷은 넓은 도파로로 테이퍼해 손실을 줄일 수 있습니다. 실패한 넷은 빨간 표시와 이유(공간 부족·굽힘 반경·장애물·포트 불일치·과도한 길이)를 보여 줍니다.',
      done: (m) => m.routing },
    { id: 'electrical', short: '전기 I/F', title: 'Mission 4 · Electrical Interface', keys: ['rf'], adv: ['rfSide', 'pp'],
      intro: '광 배치만으로는 PIC가 끝나지 않습니다. MZM은 RF 입력(GSG)·진행파 전극·온칩 종단·바이어스 히터, 링은 PN 구동 전극(GS)·히터·DC 바이어스·모니터 PD 패드가 필요합니다. 패드는 Generic PDK에 없는 공정이라 추상 형상(placeholder)으로 그립니다 — 파운드리 RF 규칙을 검증한 것이 아닙니다.',
      done: (m) => m.electrical },
    { id: 'verification', short: '검증', title: 'Mission 5 · Design Verification', keys: [], adv: [],
      intro: '연결성, 기하(선폭·간격·굽힘·경계·겹침·간섭), 시스템(레인 속도·용량·변조기·파워 버짓·RF) 검사를 실행합니다. 결과는 PASS / WARNING / FAIL / NOT VERIFIED로 나뉘고, 검사하지 않은 항목에는 PASS를 주지 않습니다. FAIL이 없어야 완료입니다.',
      done: (m, v) => m.verification && v.ran },
    { id: 'export', short: '내보내기', title: 'Mission 6 · Circuit Export (→ GDS)', keys: [], adv: [],
      intro: '설계를 smq-circuit/1 데이터(회로 넷리스트, 소자 파라미터, 포트 연결, 배치, 배선 형상, 플랫폼·규칙, 성능 예측, 검증 결과)로 내보냅니다. tools/smq2gds가 같은 데이터로 PCell 조립·GDS·미리보기·재검사를 하고, 그 결과(engine_verification.json)를 다시 불러와 지금 설계와 design hash가 같고 FAIL이 없으면 Geometry Rechecked가 됩니다. 파운드리 준비(Foundry Readiness)는 이 게임이 검증하지 않습니다.',
      done: (m, v) => v.exp && m.verification }
  ];
  // map label: missions valid for the current design (last computed), plus the historical count when it is higher
  const progress = () => { if (!SH() || !SH().plat()) return '—'; const s = scope ? (scope.lab || {}) : LS[SH().plat()] || {}, n = MISS.filter((m) => (s.live || {})[m.id]).length, h = MISS.filter((m) => (s.done || {})[m.id]).length; return `미션 ${n}/${MISS.length}${h > n ? ` · 이전 ${h}` : ''}`; };

  /* ---------------- compute ---------------- */
  /* Three kinds of state (docs/design_lab.md §상태):
     - historical achievement s.done[id] — set once a mission was met, never cleared (learning record, like stars);
     - current validity s.live[id] — recomputed from the design on every change (what the stepper and chips show);
     - export / verification identity — s.ran = { hash, sig }, s.exported = { at, hash }, s.gds.design_hash.
     Policy: the same design_hash means the same netlist, placement, routing geometry, parameters and platform, so an export or
     GDS re-check made for that hash is valid again when the design returns to it. A verification run is valid only while the
     check results are also identical (sig): system checks read campaign designs (3A+, 3W) that are not part of the geometry hash. */
  const fnv = (str) => { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, '0'); };
  const vsig = (chk) => fnv(JSON.stringify(chk.checks.filter((x) => x.item !== 'GDS 재검사').map((x) => [x.group, x.item, x.status, String(x.detail || '')])));
  function migrate(s) {   // v1 state: ran = true/false, exported = ISO time → no design identity, so treat both as stale
    if (s.v === 2) return;
    if (s.ran != null && typeof s.ran !== 'object') s.ran = null;
    if (s.exported != null && typeof s.exported !== 'object') s.exported = { at: s.exported, hash: null };
    s.v = 2;
  }
  const valid = () => { const s = S(); return { ran: !!(s.ran && C && s.ran.hash === C.hash && s.ran.sig === CHK.sig), exp: !!(s.exported && C && s.exported.hash === C.hash) }; };
  function recompute() {
    const d = des(), cx = ctx();
    C = LAB.build(cx, d); CHK = LAB.checks(C, cx); MS = LAB.missions(C, CHK);
    C.hash = LAB.designHash(C); CHK.sig = vsig(CHK);
    const s = S(); migrate(s); s.done = s.done || {}; s.live = {};
    const v = valid();
    MISS.forEach((m) => { const ok = !!m.done(MS, v); s.live[m.id] = ok; if (ok) s.done[m.id] = true; });
    C.samples = (C.routes || []).map((r) => ({ r, pts: LAB.sample(r.prims, Math.max(1, (C.W + C.H) / 4000)) }));
    save();
  }
  // imported GDS re-check: 'PASS' | 'FAIL' (matches this design) | 'stale' (another design) | null
  function gdsSt() { const g = S().gds; if (!g || !C) return null; return g.design_hash !== C.hash ? 'stale' : g.summary.FAIL ? 'FAIL' : 'PASS'; }
  function gdsMsg() {
    const g = S().gds, st = gdsSt(); if (!g) return S().gdsErr ? `<span class="st-FAIL">${S().gdsErr}</span>` : '아직 불러온 GDS 재검사 결과가 없습니다.';
    const sm = g.summary, E = (v) => String(v == null ? '' : v).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]); return `${st === 'stale' ? '<span class="st-WARNING">불러온 결과는 지금과 다른 설계입니다 — 다시 내보내고 GDS를 다시 만드세요.</span> ' : ''}GDS ${E(g.gds)} · sha1 ${E(String(g.gds_sha1).slice(0, 12))} · 셀 ${E(g.cells)}개 · PASS ${sm.PASS} · WARNING ${sm.WARNING} · FAIL ${sm.FAIL}${sm['NOT VERIFIED'] != null ? ` · NOT VERIFIED ${sm['NOT VERIFIED']}` : ''} (hash ${E(g.design_hash)})`;
  }
  function importGds(txt) {
    let V; S().gdsErr = null;
    try { V = JSON.parse(txt); } catch (er) { S().gdsErr = 'JSON이 아닙니다.'; return; }
    const r = V && V.gds_recheck;
    if (!r || r.schema !== LAB.SCHEMA + '#gds-recheck' || !r.summary || !Array.isArray(r.checks)) { S().gdsErr = 'gds_recheck가 없는 파일입니다 — smq2gds.circuit가 만든 engine_verification.json을 고르세요.'; return; }
    if (V.platform && V.platform !== SH().plat()) { S().gdsErr = `다른 플랫폼(${V.platform})의 결과입니다.`; return; }
    const sm = { PASS: 0, WARNING: 0, FAIL: 0, 'NOT VERIFIED': 0 }; r.checks.forEach((c) => { if (sm[c.status] != null) sm[c.status]++; });   // count from the checks themselves, not the stated summary
    S().gds = { design_hash: r.design_hash, gds: r.gds, gds_sha1: r.gds_sha1, cells: r.cells, summary: sm, checks: r.checks.map(({ group, item, status, detail }) => ({ group, item, status, detail })), at: new Date().toISOString() };
  }
  function setV(k, v) { diag = null; const d = des(); if (k === 'mod' && ((v | 0) === 2) !== ((d.mod | 0) === 2)) { S().d = LAB.defaults(ctx(), { mod: v | 0, share: 0 }); save(); return; } d[k] = v; if (k === 'mod' || k === 'rf') d.stag = LAB.stagAuto(d); save(); }   // no reset: run / export validity follows the design hash

  /* ---------------- render ---------------- */
  const pfP = () => PR(SH().pf());
  const fmtV = (p, v) => (p.labels ? p.labels[v | 0] : `${(+v).toFixed(p.dec)}${p.unit ? ' ' + p.unit : ''}`);
  const cur = () => Math.min(MISS.length - 1, S().cur | 0);
  const stBadge = (st) => `<span class="stbadge st-${st.split(' ')[0]}">${st}</span>`;
  function renderHead() {
    const s = S(), mode = s.mode || 'beginner';
    $('#lab-mode').innerHTML = [['beginner', 'Beginner'], ['advanced', 'Advanced']].map(([k, t]) => `<button role="radio" aria-checked="${mode === k}" data-lm="${k}">${t}</button>`).join('');
    const a3 = SH().stars('3A+') > 0, v = valid(), L = s.live || {}, H = s.done || {};
    const st = [['Schematic Complete', L.schematic], ['Floorplan Complete', L.floorplan], ['Routing Complete', L.routing], ['Electrical Interface', L.electrical], ['Verification Complete', L.verification]];
    // three separate levels of "done": the game model, the re-read GDS geometry, and the foundry (never claimed here)
    const g = gdsSt(), dv = MISS.slice(0, 5).every((m) => L[m.id]);
    $('#lab-prog').innerHTML = st.map(([t, ok]) => `<span class="${ok ? 'ok' : ''}">${ok ? '✓' : '·'} ${t}</span>`).join('')
      + `<span class="lvl ${dv ? 'ok' : 'pend'}" title="게임 모델의 연결·기하·시스템 검사를 지금 설계로 실행했고 FAIL이 없음">${dv ? '✓' : '·'} Design Valid</span>`
      + `<span class="lvl ${g === 'PASS' ? 'ok' : 'pend'}" title="tools/smq2gds.circuit가 만든 GDS를 다시 읽어 기하·연결을 검사한 결과(engine_verification.json)가 지금 설계(design hash)와 같고 FAIL이 없음">${g === 'PASS' ? '✓' : '·'} Geometry Rechecked${g === 'FAIL' ? ' (재검사 FAIL)' : g === 'stale' ? ' (다른 설계)' : ''}</span>`
      + '<span class="lvl nv" title="Generic PDK·추상 금속·파운드리 DRC/LVS·RF·열 검사 없음 — 이 GDS는 Tape-out Ready가 아닙니다">○ Foundry Readiness · NOT VERIFIED</span>'
      + `<span class="${a3 ? 'ok' : 'pend'}" title="정식 Project Completion은 Stage 3 설계 완료와 연계">${a3 ? '✓' : '·'} 3A+ ★ 연계 ${a3 ? '' : '(미리보기 모드)'}</span>`;
    $('#lab-steps').innerHTML = MISS.map((m, j) => { const ok = L[m.id], was = !ok && H[m.id];
      return `<li><button class="stp ${ok ? 'done' : was ? 'was' : ''}" data-ms="${j}" aria-current="${j === cur() ? 'step' : 'false'}" aria-label="미션 ${j + 1} ${m.title}${ok ? ' (현재 설계로 완료)' : was ? ' (이전에 완료 · 지금 설계에서는 미충족)' : ''}" title="${ok ? '현재 설계로 완료' : was ? '이전에 완료했지만 지금 설계에서는 조건을 충족하지 않습니다' : ''}"><span class="num">${ok ? '✓' : was ? '!' : j + 1}</span><span class="t">${m.short}</span></button></li>`; }).join('');
    const m = MISS[cur()], ok = !!L[m.id], was = !ok && H[m.id], nx = MISS[cur() + 1];
    const why = was ? (m.id === 'verification' ? (s.ran ? '설계(또는 시스템 검사 결과)가 마지막 검사 이후 바뀌었습니다 — 다시 실행하세요.' : '이 설계로 아직 검사를 실행하지 않았습니다.') : m.id === 'export' ? (!MS.verification ? '지금 설계에 FAIL이 있습니다.' : '내보낸 파일은 다른 설계(design hash)입니다 — 다시 내보내세요.') : '지금 설계가 이 미션의 검사를 통과하지 않습니다 — 아래 표의 FAIL을 보세요.') : '';
    $('#lab-note').innerHTML = `<div class="sn-h"><b>${m.title}</b>${ok ? '<span class="ok">완료 ✓</span>' : was ? '<span class="was-tag">이전 완료 · 현재 무효</span>' : ''}</div><div class="sn-b">${m.intro}</div>`
      + (why ? `<p class="note was-why">${why}</p>` : '')
      + `<div class="row-btns">${m.id === 'verification' ? `<button class="btn ${ok ? '' : 'pri'}" data-la="run">${v.ran ? '검사 다시 실행' : '검사 실행'}</button>` : m.id === 'export' ? `<button class="btn ${v.exp ? '' : 'pri'}" data-la="exp-all">smq-circuit/1 내보내기 (3개 파일)</button>` : ''}`
      + (nx ? `<button class="btn ${ok ? 'pri' : ''}" id="lab-next">다음 미션 → ${nx.short}</button>` : '') + '</div>';
  }
  function renderParams() {
    const s = S(), m = MISS[cur()], P = pfP(), d = des(), wdm = (d.mod | 0) === 2, skipW = ['share', 'P', 'stag', 'fp', 'rf', 'rfSide', 'pp'];
    const keys = m.keys.concat((s.mode || 'beginner') === 'advanced' ? m.adv : []).concat(wdm && m.id === 'floorplan' ? ['rp'] : []).filter((k) => !(wdm && skipW.includes(k)));
    let h = keys.map((k) => { const p = P[k]; return `<div class="prm"><div class="prm-h"><label for="lp-${k}">${p.label}<i>${p.sym}</i></label><output id="lo-${k}">${fmtV(p, d[k])}</output></div><div class="prm-r"><input type="range" id="lp-${k}" data-lk="${k}" min="${p.min}" max="${p.max}" step="${p.step}" value="${d[k]}"></div></div>`; }).join('');
    if (wdm && m.id === 'schematic') h += `<p class="note">WDM8: 다파장 광원 입력 1개 → 버스 하나에 링 8개(3W 설계: <b>${C.wdm.s}</b> · ${C.wdm.r.grid} GHz · R ${C.wdm.d.R} µm · ${(C.wdm.d.rad | 0) ? '계단 반경' : '같은 반경'} · ${(C.wdm.d.asg | 0) ? '순환 배정' : '고정 배정'}) → 출력 1개. 링 설계는 3W 레벨에서 바꿉니다.</p>`;
    if (wdm && m.id === 'electrical') h += '<p class="note">WDM8은 플립칩 마이크로범프만: 링마다 S 범프(북쪽 2열)·G 범프(남쪽 2열), 히터 16선은 남쪽 범프 열로 평면 팬아웃(M2).</p>';
    if (m.id === 'schematic' && !wdm) { const a = arch3(); h += `<p class="note">아키텍처 출처: <b>${a.src}</b> (${a.mod ? 'MRR' : 'MZM'} ×8, ${SHL[a.share]}). 바꾸면 시스템 예측도 Lab 구성으로 다시 계산합니다.</p><div class="row-btns"><button class="btn" data-la="arch">3A+ 구성으로 되돌리기</button></div>`; }
    if (m.id === 'floorplan') h += `<p class="note">자동 배치 기준 필요한 다이: <b>${(C.need.W / 1000).toFixed(2)} × ${(C.need.H / 1000).toFixed(2)} mm</b>.</p><div class="row-btns"><button class="btn" data-la="fit">필요 크기로 맞춤 (0.1 mm 올림)</button><button class="btn" data-la="auto">자동 배치 값 복원</button></div>`;
    if (m.id === 'routing') h += `<p class="note">배선 폭 w<sub>r</sub> &gt; w<sub>0</sub> ${SH().pf().w0} µm이면 긴 넷의 직선 구간에 선형 테이퍼를 넣어 몸통만 넓힙니다 (짧은 넷은 w<sub>0</sub>). 단일모드 차단 폭 ${SH().pf().wc} µm 이상은 다중모드 — 굽힘은 Euler로.</p>`;
    if (m.id === 'verification') { const v = valid(); h += `<div class="row-btns"><button class="btn pri" data-la="run">검사 실행</button></div><p class="note">${v.ran ? '마지막 실행 결과가 아래 표에 있습니다. 설계를 바꾸면 다시 실행해야 합니다.' : S().ran ? '마지막 실행 이후 설계가 바뀌었습니다 — 다시 실행하세요 (아래 표는 지금 설계의 결과입니다).' : '아직 실행하지 않았습니다.'}</p>`; }
    if (m.id === 'export') h += `<div class="row-btns"><button class="btn pri" data-la="exp-all">smq-circuit/1 내보내기 (3개 파일)</button></div><div class="row-btns"><button class="btn" data-la="exp-s">engine_schematic.json</button><button class="btn" data-la="exp-l">engine_layout.json</button><button class="btn" data-la="exp-v">engine_verification.json</button></div><textarea id="lab-json" class="jsonout" hidden readonly aria-label="smq-circuit JSON"></textarea>`
      + `<h4 class="sub">GDS (tools/smq2gds)</h4><p class="note">내려받은 세 파일과 같은 폴더에서: <code>python -m smq2gds.circuit ${SH().plat()}_engine_layout.json -o gds/</code> → engine_layout.gds · engine_preview.png · engine_verification.json(GDS 재검사 포함). 그 verification 파일을 불러오면 지금 설계(design hash)와 맞는지 확인해 반영합니다.</p>`
      + `<div class="row-btns"><label class="btn" for="lab-gds">GDS 재검사 결과 불러오기</label><input type="file" id="lab-gds" accept=".json,application/json" hidden></div><p class="note" id="lab-gds-msg">${gdsMsg()}</p>`;
    $('#lab-params').innerHTML = h || '<p class="note">이 미션에는 손잡이가 없습니다.</p>';
  }
  function renderLib() {
    const P = C.P, it = [];
    const add = (type, name, src, kv, id) => it.push(`<button class="libitem ${/내 /.test(src) ? 'card' : ''}" data-lt="${type}" aria-pressed="${sel && sel.type === type}"><b>${name}</b> <span class="note">${id || ''}</span><span class="src">${src}</span><span class="lab-kv">${kv}</span></button>`);
    add('ssc', 'SSC (광섬유 I/O)', P.ssc.src, `L<sub>t</sub> ${P.ssc.Lt} µm · 팁 ${P.ssc.tw} µm · ${P.ssc.loss.toFixed(2)} dB`, '1-6');
    add('mmi1x2', 'Splitter (1×2 MMI)', P.mmi.src, `${P.mmi.W}×${P.mmi.L} µm · s ${P.mmi.s} · EL ${P.mmi.el.toFixed(2)} dB`, '1-3');
    if (C.mod === 'mzm') add('mzm', 'TW-MZM', P.mzm.src, `L ${(P.mzm.Le / 1000).toFixed(2)} mm · g ${P.mzm.g} µm · IL ${P.mzm.IL.toFixed(1)} dB · ${P.mzm.bw.toFixed(0)} GHz`, '2-3');
    else if (C.mod === 'wdm') { const w = C.wdm, g = C.I('BUS').geom; add('mrr_wdm', 'MRR ×8 · 공유 버스 (WDM8)', g.src, `R ${g.rings[0].R_um}…${g.rings[7].R_um} µm · 간격 ${g.p} µm · FSR ${(w.r.fsr * 1e3).toFixed(2)} nm vs 8Δλ ${(w.r.span * 1e3).toFixed(2)} nm · ${w.r.grid} GHz`, '2-3R / 3W'); }
    else add('mrr', 'MRR (all-pass)', P.mrr.src, `R ${P.mrr.R} µm · g ${P.mrr.gap} µm · FSR ${P.mrr.fsr.toFixed(1)} nm · ${P.mrr.bw.toFixed(0)} GHz`, '2-3R');
    add('heater', 'Heater (TiN)', P.heater.src, `h ${P.heater.h} µm · P<sub>π</sub> ${P.heater.Ppi.toFixed(1)} mW${C.mod === 'mzm' ? ` · L ${P.heater.L} µm` : ' · 링 히터 호'}`, '2-1');
    if (C.d.mon) add('tap_pd', 'PD Interface (2 % 탭 + Ge PD)', P.pd.src, `Ge ${P.pd.L}×${P.pd.w} µm · ${P.pd.resp.toFixed(2)} A/W`, '2-4');
    add('wg', 'WG (배선 도파로)', `${SH().pf().short} strip`, `w<sub>0</sub> ${SH().pf().w0} µm (${C.wm && LAB.wgModel(SH().pf(), SH().pf().w0).alpha.toFixed(2)} dB/cm) · w<sub>r</sub> ${Math.max(C.d.wr, SH().pf().w0)} µm (${C.wm.alpha.toFixed(2)} dB/cm) · R<sub>min</sub> ${LAB.wgModel(SH().pf(), SH().pf().w0).Rmin} µm`, '1-1');
    if (C.mod === 'wdm') add('src', 'Optical Source Interface', `다파장 외부 광원 (${(C.wdm.d.src | 0) ? 'DFB ×8 + MUX' : '콤'}, 3W)`, `입력 1개 · 8파장 · 출력 1개 (한 광섬유)`, '3W');
    else add('src', 'Optical Source Interface', '외부 광원 (DR8 CW 레이저, 3A+)', `입력 ${C.nL}개 · 1:${C.N} 공유 · FAU 피치 ${C.d.fp} µm`, '2-5 / 3A+');
    $('#lab-lib-list').innerHTML = it.join('') + '<p class="note">카드가 있으면 내 설계, 없으면 각 레벨의 기준 설계로 조립합니다. 항목을 누르면 그 소자들이 강조됩니다.</p>';
  }
  function renderSel() {
    if (diag) {
      const D = diag, mi = D.fix ? MISS.findIndex((m) => m.id === D.fix.m) : -1, P = pfP();
      $('#lab-sel').innerHTML = `<div class="diag"><h3>진단 · ${D.item}</h3><p class="note">${stBadge(D.status)} ${D.why || ''}</p>`
        + `<p class="note">${D.located ? `표시: ${[D.ids.length ? `소자 ${D.ids.slice(0, 6).join(', ')}${D.ids.length > 6 ? ' …' : ''}` : '', D.nets.length ? `넷 ${D.nets.length}개` : '', D.pt ? `지점 (${D.pt[0].toFixed(0)}, ${D.pt[1].toFixed(0)}) µm` : ''].filter(Boolean).join(' · ')}` : '이 검사는 위치를 계산하지 않습니다 — 캔버스에 임의의 지점을 표시하지 않습니다.'}</p>`
        + (D.fix ? `<p class="note"><b>고칠 곳:</b> ${D.fix.t}${D.fix.keys.length ? ` (손잡이: ${D.fix.keys.map((k) => (P[k] ? P[k].label : k)).join(', ')})` : ''}</p><div class="row-btns">${mi >= 0 ? `<button class="btn" data-goto="${D.fix.m}" ${D.fix.keys.some((k) => MISS[mi].adv.includes(k)) ? 'data-adv="1"' : ''}>Mission ${mi + 1}로 가기</button>` : ''}<button class="btn" data-diag-clear="1">진단 닫기</button></div>` : '<div class="row-btns"><button class="btn" data-diag-clear="1">진단 닫기</button></div>') + '</div>';
      return;
    }
    const box2 = $('#lab-sel');
    if (!sel || !sel.id) { box2.innerHTML = sel && sel.type ? `<h3>${sel.type} 강조</h3><p class="note">${C.inst.filter((x) => x.type === sel.type).length}개 — 캔버스에서 하나를 누르면 상세를 봅니다.</p>` : '<p class="note">캔버스(회로도·레이아웃)에서 소자를 누르면 여기에 파라미터·포트·연결·크기·손실·DRC 상태가 나옵니다.</p>'; return; }
    const I = C.I(sel.id); if (!I) { box2.innerHTML = ''; return; }
    const ports = I.ports.map((p) => { const q = C.portAbs(I, p.n), full = `${I.id}.${p.n}`, on = C.onets.find((n) => n.from === full || n.to === full), en = C.enets.find((n) => n.from === full); return `<tr><td>${p.n}</td><td>${p.k === 'o' ? '광' : p.k === 'fib' ? '광섬유' : p.k === 'int' ? '내부' : p.k.toUpperCase()}</td><td class="num">${q.X.toFixed(1)}, ${q.Y.toFixed(1)}</td><td>${on ? (on.from === full ? '→ ' + on.to : '← ' + on.from) : en ? '→ ' + en.to : p.k === 'fib' ? 'die facet' : p.k === 'int' ? '온칩 종단' : '<span class="st-FAIL">미연결</span>'}</td></tr>`; }).join('');
    const b = C.bbox(I), routes = (C.routes || []).filter((r) => r.from.startsWith(I.id + '.') || r.to.startsWith(I.id + '.'));
    const iss = CHK.checks.filter((x) => x.status === 'FAIL' && String(x.detail).includes(I.id));
    const loss = I.type === 'mzm' ? `IL ${C.P.mzm.IL.toFixed(2)} dB (2-3 엔진, 이득 ${C.P.mzm.gain.toFixed(2)} dB)` : I.type === 'mrr' ? `IL ${C.P.mrr.IL.toFixed(2)} dB @ 동작점 (2-3R 엔진)` : I.type === 'mmi1x2' ? `분기 3.01 dB + EL ${C.P.mmi.el.toFixed(2)} dB` : I.type === 'ssc' ? `결합 ${C.P.ssc.loss.toFixed(2)} dB (1-6 엔진)` : I.type === 'tap_pd' ? `탭 ${(-10 * Math.log10(0.98)).toFixed(3)} dB (L<sub>c</sub> ${I.params.Lc_um} µm)` : '—';
    box2.innerHTML = `<h3>${I.id} · ${I.type}</h3><div class="lab-kv">출처 <b>${I.src}</b><br>위치 (${I.x.toFixed(1)}, ${I.y.toFixed(1)}) µm · 회전 ${I.rot}°<br>크기 ${I.L.toFixed(1)} × ${(I.y1 - I.y0).toFixed(1)} µm · bbox [${b.map((v) => v.toFixed(0)).join(', ')}]<br>광 손실 ${loss}<br>${routes.length ? `배선 ${routes.map((r) => `${r.ok ? '' : '✗ '}${r.length_um.toFixed(0)} µm / ${r.loss_dB.toFixed(3)} dB`).join(' · ')}` : ''}<br>DRC ${iss.length ? `<span class="st-FAIL">${iss.map((x) => x.item).join(', ')}</span>` : '<span class="st-PASS">이 소자 관련 FAIL 없음</span>'}</div>`
      + `<table class="ltbl"><tr><th>포트</th><th>종류</th><th>위치 µm</th><th>연결</th></tr>${ports}</table>`
      + `<p class="note">파라미터: ${Object.entries(I.params || {}).filter(([, v]) => typeof v !== 'object').map(([k, v]) => `${k} ${typeof v === 'number' ? +v.toFixed(3) : v}`).join(' · ')}</p>`;
  }
  const row = (cells) => `<tr>${cells.map((c, i) => `<td${i && /^[-−]?\d[\d.,]*$/.test(String(c)) ? ' class="num"' : ''}>${c}</td>`).join('')}</tr>`;
  function renderOut() {
    const m = MISS[cur()], d = des(), pf = SH().pf(); let t = '', h = '';
    const chk = (re) => CHK.checks.filter((x) => re.test(x.item));
    const ctab = (rows) => `<table class="ltbl"><tr><th>검사</th><th>상태</th><th>내용</th></tr>${rows.map((x) => `<tr><td>${x.item}</td><td>${stBadge(x.status)}${x.status === 'FAIL' || x.status === 'WARNING' ? `<br><button class="btn diagbtn" data-diag="${CHK.checks.indexOf(x)}" aria-label="${String(x.item).replace(/<[^>]+>/g, '')} 위치 보기">위치 보기</button>` : ''}</td><td>${x.detail || ''}</td></tr>`).join('')}</table>`;
    if (m.id === 'schematic') {
      t = '회로 구성';
      h = `<table class="ltbl">${row(['레인', `${LAB.LANES} × ${224} Gb/s 라인 (200G 순 데이터)`])}${row(['변조기', C.mod === 'mzm' ? 'TW-MZM (2-3) + 바이어스 히터' : C.mod === 'wdm' ? `공유 버스 all-pass 링 ×8 (2-3R, 3W) · ${C.wdm.r.grid} GHz · 출력 1` : 'all-pass 링 (2-3R) + 링 히터'])}${row(['레이저 입력', `${C.nL}개 (1:${C.N})`])}${row(['분배 트리', C.depth ? `1×2 MMI ${C.depth}단 × ${C.nL} = ${C.inst.filter((x) => x.type === 'mmi1x2').length}개` : '없음'])}${row(['모니터', d.mon ? '레인마다 2 % 탭 + Ge PD' : '없음'])}${row(['소자 / 광 넷 / 전기 넷', `${C.inst.length} / ${C.onets.length} / ${C.enets.length}`])}</table>` + ctab(CHK.checks.filter((x) => x.group === 'Connectivity'));
    } else if (m.id === 'floorplan') {
      t = '평면 배치';
      const bbs = C.inst.map((I) => C.bbox(I)), occ = bbs.reduce((s, b) => s + (b[2] - b[0]) * (b[3] - b[1]), 0), die = C.W * C.H;
      let gmin = Infinity; const mods = C.inst.filter((x) => x.role === 'modulator').map((I) => C.bbox(I)); for (let i = 1; i < mods.length; i++) gmin = Math.min(gmin, mods[i][1] - mods[i - 1][3]);
      const nRF = (C.pads || []).filter((p) => p.kind === 'rf').length, nDC = (C.pads || []).filter((p) => p.kind === 'dc').length, flip = (d.rf | 0) === 1;
      const edgeL = C.W - 2 * d.edge, dcNeed = nDC * d.pp;
      h = `<table class="ltbl">${row(['다이', `${d.W.toFixed(1)} × ${d.H.toFixed(1)} mm (필요 ${(C.need.W / 1000).toFixed(2)} × ${(C.need.H / 1000).toFixed(2)} mm)`])}${row(['소자 점유 면적', `${(occ / 1e6).toFixed(3)} mm² (${(100 * occ / die).toFixed(1)} %)`])}${row(['배선 가능 면적', `${((die - occ) / 1e6).toFixed(2)} mm²`])}${row(['변조기 간 간격 (최소)', `${gmin.toFixed(0)} µm · 레인 피치 ${d.P} µm`])}${row(['광 포트 정렬', `출력 SSC ${LAB.LANES}개 · FAU 피치 ${d.fp} µm, 입력 ${C.nL}개`])}${row(['전기 인터페이스 공간', flip ? `플립칩 범프 ${nRF + nDC}개 (소자 옆)` : `RF 패드 ${nRF}개 (N, 레인 엇갈림 ${d.stag} µm) · DC 패드 ${nDC}개 × ${d.pp} µm = ${(dcNeed / 1000).toFixed(2)} mm / 변 길이 ${(edgeL / 1000).toFixed(2)} mm`])}</table>`
        + ctab(chk(/다이 경계|소자 겹침|패드 배치|범프 배치/));
      const bad = chk(/다이 경계|소자 겹침|패드 배치|범프 배치/).filter((x) => x.status === 'FAIL');
      if (bad.length) h += `<p class="note"><b style="color:var(--fail)">Infeasible</b> — ${bad.map((x) => `${x.item}: ${x.detail}`).join(' / ')}. 필요한 다이는 약 ${(C.need.W / 1000).toFixed(2)} × ${(C.need.H / 1000).toFixed(2)} mm입니다${flip ? '' : ' (와이어본드 패드 수가 변 길이를 정하는 경우가 많습니다 — 플립칩이면 작아집니다)'}.</p>`;
    } else if (m.id === 'routing') {
      t = '광 배선';
      const rs = C.routes || [];
      h = `<table class="ltbl"><tr><th>넷</th><th>레인</th><th>길이 µm</th><th>폭 µm</th><th>손실 dB</th><th>상태</th></tr>${rs.map((r) => `<tr><td>${r.from} → ${r.to}</td><td class="num">${r.lane == null ? '—' : r.lane}</td><td class="num">${r.length_um.toFixed(0)}</td><td class="num">${(r.w || pf.w0).toFixed(2)}</td><td class="num">${r.loss_dB.toFixed(3)}</td><td>${r.ok ? '<span class="st-PASS">OK</span>' : `<span class="st-FAIL">✗ ${r.why}</span>`}</td></tr>`).join('')}</table>`
        + `<p class="note">레인별 배선 손실 (입력 → 변조기 → 출력, 탭 포함): ${CHK.sys.lanes.map((x) => x.total.toFixed(2)).join(' · ')} dB · 전파 손실 w<sub>0</sub> ${LAB.wgModel(pf, pf.w0).alpha.toFixed(2)} dB/cm, w<sub>r</sub> ${C.wm.alpha.toFixed(2)} dB/cm (D-1 측벽 산란 모델)</p>` + ctab(chk(/광 배선 생성|배선 간격|굽힘 반경|최소 선폭|넓은 배선|장애물/));
    } else if (m.id === 'electrical') {
      t = '전기 인터페이스';
      const mods = C.inst.filter((x) => x.role === 'modulator');
      if (C.mod === 'wdm') { const L = (n) => (C.elines.find((x) => x.net === n) || { length_um: 0 }).length_um; h = `<table class="ltbl"><tr><th>링 (λ)</th><th>RF</th><th>S / G 선 µm</th><th>DC 범프</th><th>종단</th></tr>${C.I('BUS').params.rings.map((_, k) => `<tr><td class="num">${k}</td><td>GS 범프 (S 북 ${k % 2 ? '2' : '1'}열 · G 남 ${k % 2 ? '2' : '1'}열)</td><td class="num">${L(`BUS.rf_s${k}`).toFixed(0)} / ${L(`BUS.rf_g${k}`).toFixed(0)}</td><td class="num">${C.enets.filter((n) => n.kind === 'dc' && n.lane === k).length}</td><td>없음 (집중 소자)</td></tr>`).join('')}</table>`; }
      else h = `<table class="ltbl"><tr><th>레인</th><th>RF</th><th>RF 선 길이 µm</th><th>DC 패드</th><th>종단</th></tr>${mods.map((M) => `<tr><td class="num">${M.lane}</td><td>${C.mod === 'mzm' ? 'GSG (진행파 전극)' : 'GS (집중 소자 PN)'}</td><td class="num">${(M.rfLen || 0).toFixed(0)}</td><td class="num">${C.enets.filter((n) => n.kind === 'dc' && n.lane === M.lane).length}</td><td>${C.mod === 'mzm' ? `R<sub>T</sub> ${C.P.mzm.RT} Ω 온칩 (추상)` : '없음 (집중 소자)'}</td></tr>`).join('')}</table>`
        + ctab(chk(/전기 포트|RF 배선 교차|RF 금속|패드 배치|범프 배치|RF 급전선|링 구동선/));
    } else if (m.id === 'verification') {
      t = '설계 검증';
      if (!S().ran) h = '<p class="note">“검사 실행”을 누르면 아래에 결과가 나옵니다.</p>';
      if (S().ran) {
        if (!valid().ran) h = '<p class="note"><b class="st-WARNING">마지막 실행 이후 설계가 바뀌었습니다.</b> 아래는 지금 설계의 결과이며, “검사 실행”을 다시 눌러야 Mission 5가 완료됩니다.</p>';
        const n = (st) => CHK.checks.filter((x) => x.status === st).length;
        h += `<p>${stBadge('PASS')} ${n('PASS')} · ${stBadge('WARNING')} ${n('WARNING')} · ${stBadge('FAIL')} ${n('FAIL')} · ${stBadge('NOT VERIFIED')} ${n('NOT VERIFIED')}</p>`
          + ['Connectivity', 'Geometry', 'System', 'Model validity'].map((g) => `<h4>${g}</h4>` + ctab(CHK.checks.filter((x) => x.group === g))).join('')
          + sysTable();
      }
    } else {
      t = '최종 결과 · 내보내기';
      h = summary();
    }
    $('#lab-out-t').textContent = t; $('#lab-out-b').innerHTML = h;
  }
  function sysTable() {
    const s = CHK.sys;
    const lv = s.wdm ? '3W' : '3A+';
    return `<h4>레이아웃 결과 vs 시스템 예측 (${lv} 엔진)</h4><table class="ltbl">${row([s.wdm ? '3W 모델 (같은 링·격자·배정·링 간격)' : '3A+ 모델 (같은 변조기·레이저 공유)', `${s.src} → 최악 ${s.wdm ? '채널' : '레인'} 마진 ${s.marginModel.toFixed(2)} dB · 모듈 ${s.pw.toFixed(2)} W · ${s.pj.toFixed(2)} pJ/bit`])}${row(['레이아웃이 더한 손실 (최악 레인)', `${s.extra.toFixed(2)} dB — ${lv} 모델에 없는 칩 위 배선 전파·굽힘 + 모니터 탭${s.wdm ? ' (링 사이 버스는 3W가 이미 셈)' : ''}`])}${row(['레이아웃 반영 마진', `<b>${s.marginLayout.toFixed(2)} dB</b>`])}</table><p class="note">3A+ 모델은 SSC·결합·분배기 과잉손실을 이미 셉니다. 여기서는 레이아웃에서 생긴 길이만 더합니다 (RF 급전 손실은 위 RF 항목에서 따로 표시).</p>`;
  }
  // baseline (v1.0 §7.4): the system numbers of a pinned Lab design next to the current one — engine values only, no single score
  const labSnap = () => ({ margin: CHK.sys.marginLayout, pw: CHK.sys.pw, pj: CHK.sys.pj, extra: CHK.sys.extra, area: C.W * C.H / 1e6, W: C.W, H: C.H, mod: C.mod, nL: C.nL, fails: CHK.checks.filter((x) => x.status === 'FAIL').length });
  function pinTable() {
    const P0 = S().pin; if (!P0) return '<div class="row-btns"><button class="btn" data-la="pin">이 설계를 기준으로 고정 (비교용)</button></div>';
    const a = P0.snap, b = labSnap(), r = (k, x, y, dec, u, better) => { const dv = y - x, tol = Math.pow(10, -dec) / 2, cls = Math.abs(dv) <= tol || !better ? 'dlt-0' : (better === 'hi') === (dv > 0) ? 'dlt-up' : 'dlt-dn'; return `<tr><td>${k}</td><td class="num">${x.toFixed(dec)} ${u}</td><td class="num">${y.toFixed(dec)} ${u}</td><td class="num ${cls}">${dv > 0 ? '+' : ''}${dv.toFixed(dec)}</td></tr>`; };
    return `<h4>기준 설계와 비교 (고정 ${String(P0.at).slice(0, 16).replace('T', ' ')} · hash ${P0.hash}${P0.hash === C.hash ? ' — 지금과 같음' : ''})</h4><table class="ltbl"><tr><th>항목</th><th>기준</th><th>현재</th><th>Δ</th></tr>`
      + `<tr><td>변조기 · 레이저</td><td>${a.mod.toUpperCase()} · ${a.nL}개</td><td>${b.mod.toUpperCase()} · ${b.nL}개</td><td></td></tr>`
      + r('링크 마진 (레이아웃 반영)', a.margin, b.margin, 2, 'dB', 'hi') + r('칩 배선 손실 (최악 레인)', a.extra, b.extra, 2, 'dB', 'lo') + r('모듈 전력', a.pw, b.pw, 2, 'W', 'lo') + r('비트당 에너지', a.pj, b.pj, 2, 'pJ/bit', 'lo') + r('다이 면적', a.area, b.area, 2, 'mm²', 'lo') + r('검증 FAIL 수', a.fails, b.fails, 0, '', 'lo')
      + `</table><p class="note">같은 Lab 엔진 값만 나란히 둡니다. 하나의 점수로 합치지 않습니다.</p><div class="row-btns"><button class="btn" data-la="pin">지금 설계를 새 기준으로</button><button class="btn" data-la="unpin">기준 해제</button></div>`;
  }
  function summary() {
    const s = CHK.sys, n = (st) => CHK.checks.filter((x) => x.status === st).length, a3 = SH().stars('3A+') > 0;
    return `<table class="ltbl">${row(['총 데이터 속도', `${LAB.LANES} × 200 Gb/s = 1.6 Tb/s 데이터 (게임 라인 대표값 ${LAB.LANES} × 224 Gb/s = 112 GBd PAM4; 표준 라인은 FEC·부호화 포함 212.5 Gb/s/레인 — 3A+의 “1.6T 속도 정의”)`])}${row(['변조기', C.mod === 'mzm' ? 'TW-MZM ×8 (DR8)' : C.mod === 'wdm' ? 'MRR WDM8 (공유 버스 · 광섬유 1)' : 'MRR ×8 (DR8)'])}${row(['다이', `${des().W.toFixed(1)} × ${des().H.toFixed(1)} mm`])}${row(['광 손실 추정 (칩 배선, 최악 레인)', `${s.extra.toFixed(2)} dB`])}${row(['링크 마진 (레이아웃 반영)', `${s.marginLayout.toFixed(2)} dB`])}${row(['비트당 에너지 (3A+ 모듈 모델)', `${s.pj.toFixed(2)} pJ/bit`])}${row(['검증 요약', `PASS ${n('PASS')} · WARNING ${n('WARNING')} · FAIL ${n('FAIL')} · NOT VERIFIED ${n('NOT VERIFIED')}${valid().ran ? '' : S().ran ? ' (마지막 실행 이후 설계 변경 — 다시 실행)' : ' (검사 미실행)'}`])}${row(['설계 식별 (design hash)', `${C.hash}${S().exported ? ` · 마지막 내보내기 ${S().exported.hash || '(식별 없음, 이전 버전)'} ${valid().exp ? '<span class="st-PASS">현재 설계와 같음</span>' : '<span class="st-WARNING">Stale — 다시 내보내기</span>'}` : ' · 아직 내보내지 않음'}`])}${row(['Design Valid (게임 모델)', MISS.slice(0, 5).every((m) => (S().live || {})[m.id]) ? '<span class="st-PASS">✓ 충족</span>' : '<span class="st-WARNING">미충족</span>'])}${row(['Geometry Rechecked (smq2gds)', gdsMsg()])}${row(['Foundry Readiness', '<span class="st-NOT">NOT VERIFIED</span> — Generic PDK · 추상 금속 · 파운드리 DRC/LVS·RF·열 검사 없음'])}${row(['Project Completion', a3 ? (MISS.every((m) => (S().live || {})[m.id]) ? '<span class="st-PASS">완료 (현재 설계)</span>' : MISS.every((m) => (S().done || {})[m.id]) ? '<span class="st-WARNING">이전에 완료 · 현재 설계는 미충족</span>' : '진행 중') : '3A+ ★ 이후 정식 완료 (지금은 미리보기)'])}</table>`
      + `<p class="note">GDS는 같은 smq-circuit/1 데이터를 tools/smq2gds가 읽어 같은 기본 도형으로 그리고, 다시 읽어 계층·연결·포트·길이·간격·선폭·금속 단락을 검사합니다. 이 결과는 구조 검증이 가능한 Engineering Prototype이며 Tape-out Ready Mask가 아닙니다.</p>` + pinTable();
  }
  function renderCoach() {
    const m = MISS[cur()], el = $('#lab-coach'), fails = CHK.checks.filter((x) => x.status === 'FAIL');
    let msg = null;
    if (m.id === 'floorplan' && !MS.floorplan) msg = { h: 'Infeasible — 다이 안에 들어가지 않습니다', b: `필요한 크기는 약 ${(C.need.W / 1000).toFixed(2)} × ${(C.need.H / 1000).toFixed(2)} mm입니다. “필요 크기로 맞춤”을 누르거나, Advanced에서 레인 피치·엇갈림을 줄여 보세요 (엇갈림은 RF 급전선이 다른 레인 전극을 피하는 통로입니다).` };
    else if (m.id === 'routing' && !MS.routing) { const f = (C.routes || []).find((r) => !r.ok); msg = { h: '배선 실패', b: f ? `${f.from} → ${f.to}: ${f.why}` : fails.map((x) => x.item + ': ' + x.detail).join(' / ') }; }
    else if (m.id === 'routing' && CHK.sys.marginLayout < 0) {
      const pf = SH().pf(), ws = [0.6, 0.8, 1, 1.5, 2, 2.5].filter((w) => w > pf.w0 && w <= (pf.mat === 'si' ? 3 : 4)); let best = null;
      for (const w of ws) { const cx = ctx(), c2 = LAB.build(cx, { ...des(), wr: w }), k2 = LAB.checks(c2, cx); if (LAB.missions(c2, k2).routing && k2.sys.marginLayout > CHK.sys.marginLayout + 0.05) { best = { w, m: k2.sys.marginLayout }; if (k2.sys.marginLayout >= 0) break; } }
      msg = { h: '칩 위 배선 손실이 링크 마진을 먹습니다', b: `좁은 ${pf.mat === 'si' ? 'Si' : 'SiN'} 도파로(${pf.w0} µm)는 측벽 산란이 커서 ${LAB.wgModel(pf, pf.w0).alpha.toFixed(1)} dB/cm입니다. 긴 넷을 넓히면 줄어듭니다.` + (best ? ` 계산 결과: w<sub>r</sub> = ${best.w} µm → 레이아웃 반영 마진 ${best.m.toFixed(2)} dB.` : ' 넓혀도 마진이 회복되지 않으면 아키텍처(레이저 공유·출력)를 3A+에서 다시 보세요.') };
    }
    else if (m.id === 'electrical' && !MS.electrical) msg = { h: '전기 인터페이스 문제', b: fails.filter((x) => /전기|RF|패드|범프/.test(x.item)).map((x) => x.item + ': ' + x.detail).join(' / ') };
    else if (m.id === 'electrical') { const w = CHK.checks.find((x) => /링 구동선|RF 급전선/.test(x.item) && x.status !== 'PASS'); if (w) msg = { h: C.mod === 'mrr' ? '링 구동선이 집중 소자 조건을 넘습니다' : 'RF 급전선이 깁니다', b: `${w.detail}. 플립칩(3D 구동기)으로 바꾸면 선이 수십 µm로 짧아집니다 — CPO가 링 변조기와 짝을 이루는 이유입니다.` }; }
    else if (m.id === 'verification' && S().ran && fails.length) msg = { h: `FAIL ${fails.length}건`, b: fails.map((x) => `${x.item}: ${String(x.detail).slice(0, 120)}`).join(' / ') };
    el.hidden = !msg; if (msg) el.innerHTML = `<div class="coach-h"><span class="badge">코치</span><b>${msg.h}</b></div><p>${msg.b}</p>`;
  }
  function legend() {
    const v = S().view || 'layout', LY = S().layers || { opt: 1, ele: 1, drc: 1 };
    $('#lab-layers').innerHTML = v === 'layout' ? [['opt', '광'], ['ele', '전기 (RF·DC·패드)'], ['drc', '검사 표시 (실패·위반)']].map(([k, t]) => `<label><input type="checkbox" data-ly="${k}" ${LY[k] ? 'checked' : ''}> ${t}</label>`).join('') + '<span class="note" style="margin:0">보기 전용 — 내보내는 GDS에는 영향 없음</span>' : '';
    $('#lab-view').innerHTML = [['schematic', 'Schematic'], ['layout', 'Physical Layout']].map(([k, t]) => `<button role="radio" aria-checked="${v === k}" data-lv="${k}">${t}</button>`).join('');
    $('#lab-legend').innerHTML = v === 'layout' ? legendHTML([['#64c9df', '광 도파로'], ['#f2b04a', 'RF 전극·선 (추상)'], ['#9eabbd', 'DC 선 (M2, 추상)'], ['#b48cff', 'Ge PD'], ['#ff6b6b', '실패·위반']]) : legendHTML([['#64c9df', '광 넷'], ['#f2b04a', 'RF 포트'], ['#9eabbd', 'DC 포트'], ['#ff6b6b', '미연결·실패']]);
  }

  /* ---------------- diagnosis: a FAIL / WARNING row → the related instances, nets or point, the cause and the knob ---------------- */
  // Only places the check itself names are marked (instance ids in its text, failed route nets, the measured min-gap point);
  // checks without coordinates (RF / DC metal shorts, budgets) highlight the related parts, never a guessed spot.
  const MI = { schematic: 0, floorplan: 1, routing: 2, electrical: 3 };
  function diagOf(x) {
    const txt = `${x.item} ${x.detail}`, pf = SH().pf(), rmin = LAB.wgModel(pf, pf.w0).Rmin, it = x.item;
    let ids = C.inst.filter((I) => new RegExp(`(^|[^A-Za-z0-9_])${I.id}([^A-Za-z0-9_]|$)`).test(txt)).map((I) => I.id), nets = [], pt = null, fix = null, why = '';
    const fails = (C.routes || []).filter((r) => !r.ok);
    if (/광 배선 생성|장애물/.test(it)) { nets = fails.map((r) => r.net); const r0 = fails.find((r) => r.at); if (r0) pt = r0.at; why = fails.length ? fails.slice(0, 2).map((r) => `${r.from} → ${r.to}: ${r.why}`).join(' · ') : String(x.detail); fix = { m: 'routing', keys: ['R', 'jog'], t: '굽힘 반경·팬 간격을 줄이거나, 평면 배치에서 레인 피치·엇갈림을 늘려 공간을 만드세요.' }; }
    else if (/배선 간격/.test(it)) { if (C.gapAt) pt = C.gapAt; why = `두 넷의 도파로 가장자리 간격이 규칙 ${pf.rules.gap} µm보다 좁습니다.`; fix = { m: 'routing', keys: ['jog'], t: 'Advanced의 팬 수직선 간격(p_j)을 늘리거나 레인 피치를 늘리세요.' }; }
    else if (/굽힘 반경/.test(it)) { nets = (C.routes || []).map((r) => r.net); why = `모든 넷이 같은 굽힘 반경 설정을 씁니다 (R ${C.d.R} µm < ${rmin} µm).`; fix = { m: 'routing', keys: ['R'], t: `Advanced의 굽힘 반경을 ${rmin} µm 이상으로.` }; }
    else if (/넓은 배선의 굽힘/.test(it)) { nets = (C.routes || []).filter((r) => r.ok && r.w > pf.wc).map((r) => r.net); why = '다중모드 폭의 도파로가 원호로 굽으면 고차 모드가 섞입니다.'; fix = { m: 'routing', keys: ['bend', 'wr'], t: 'Euler 굽힘을 고르거나 배선 폭을 단일모드로.' }; }
    else if (/다이 경계|소자 겹침/.test(it)) { why = String(x.detail).replace(/<[^>]+>/g, ''); fix = { m: 'floorplan', keys: ['W', 'H'], t: '“필요 크기로 맞춤”을 누르거나 다이를 키우세요.' }; }
    else if (/패드 배치|범프 배치/.test(it)) { why = String(x.detail).replace(/<[^>]+>/g, ''); fix = { m: 'floorplan', keys: ['W', 'H'], t: '다이 변 길이가 패드 수 × 피치보다 커야 합니다 — 다이를 키우거나 패드 피치를 줄이세요(Advanced).' }; }
    else if (/RF 배선 교차|RF 금속|RF 급전선|링 구동선/.test(it)) { ids = ids.length ? ids : C.inst.filter((I) => I.role === 'modulator').map((I) => I.id); why = 'RF 선의 정확한 교차 좌표는 계산하지 않으므로 관련 변조기만 표시합니다.'; fix = { m: 'electrical', keys: ['rf'], t: '플립칩(3D 구동기)으로 바꾸거나 Advanced에서 레인 엇갈림을 늘리세요.' }; }
    else if (/DC 배선 교차/.test(it)) { why = 'DC 선 교차 좌표는 계산하지 않습니다.'; fix = { m: 'electrical', keys: ['pp'], t: '패드 피치·다이 크기를 바꿔 팬아웃 트랙 공간을 만드세요.' }; }
    else if (/파워 버짓|마진/.test(it)) { why = '시스템 예측(3A+ / 3W 엔진)에서 레이아웃 배선 손실을 뺀 마진입니다 — 특정 위치가 아니라 전체 손실의 합입니다.'; fix = { m: 'routing', keys: ['wr'], t: '긴 넷을 넓은 도파로로(배선 폭 w_r) — 산란 손실이 줄어듭니다.' }; }
    else if (/선폭/.test(it)) { fix = { m: 'routing', keys: ['wr'], t: '배선 폭을 리소 한계 이상으로.' }; }
    else if (/광 포트|포트 종류|레인 수|입·출력|전기 포트/.test(it)) { why = String(x.detail).replace(/<[^>]+>/g, ''); fix = { m: 'schematic', keys: ['mod', 'share'], t: '회로도(Mission 1)의 구성을 확인하세요.' }; }
    else why = String(x.detail).replace(/<[^>]+>/g, '');
    return { item: String(it).replace(/<[^>]+>/g, ''), status: x.status, ids, nets, pt, fix, why, located: !!(ids.length || nets.length || pt) };
  }
  function diagBox(D) {
    const bs = D.ids.map((id) => C.bbox(C.I(id))).concat((C.routes || []).filter((r) => D.nets.includes(r.net)).flatMap((r) => LAB.sample(r.prims, 5).map((p) => [p[0], p[1], p[0], p[1]])));
    if (D.pt) bs.push([D.pt[0] - 120, D.pt[1] - 120, D.pt[0] + 120, D.pt[1] + 120]);
    if (!bs.length) return null;
    return [Math.min(...bs.map((b) => b[0])), Math.min(...bs.map((b) => b[1])), Math.max(...bs.map((b) => b[2])), Math.max(...bs.map((b) => b[3]))];
  }
  function fitBox(b) { if (!b) { fit(); return; } const { w, h } = size(), pad = 60, bw = Math.max(80, b[2] - b[0] + 2 * pad), bh = Math.max(80, b[3] - b[1] + 2 * pad); cam = { s: Math.min(w / bw, h / bh), x: (b[0] + b[2]) / 2, y: (b[1] + b[3]) / 2 }; }
  function showDiag(i) {
    const x = CHK.checks[i]; if (!x) return;
    diag = diagOf(x); sel = diag.ids.length === 1 ? { id: diag.ids[0] } : null;
    if ((S().view || 'layout') !== 'layout') { S().view = 'layout'; save(); legend(); }
    fitBox(diagBox(diag)); renderSel(); draw();
    const ws = $('#lab-ws'); if (ws && ws.scrollIntoView) ws.scrollIntoView({ block: 'start', behavior: smqMotion() });
  }

  /* ---------------- canvas ---------------- */
  const CV = $('#lab-cv'), cv = () => CV;   // cached: TX/TY run per drawn point
  function size() { const c = cv(), w = Math.max(100, c.parentElement.clientWidth || 600), h = document.body.classList.contains('studio-ready') && c.parentElement.clientHeight ? Math.max(100,c.parentElement.clientHeight) : Math.round(Math.min(640, Math.max(280, w * 0.62))); c.width = w * DPR; c.height = h * DPR; c.style.height = h + 'px'; return { w: c.width, h: c.height }; }
  function world() { return (S().view || 'layout') === 'layout' ? { x0: 0, y0: 0, x1: C.W, y1: C.H } : schemBox(); }
  function fit() { const { w, h } = size(), b = world(), s = Math.min(w / (b.x1 - b.x0), h / (b.y1 - b.y0)) * 0.94; cam = { s, x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 }; }
  const TX = (x) => (x - cam.x) * cam.s + CV.width / 2, TY = (y) => CV.height / 2 - (y - cam.y) * cam.s;
  const IX = (px) => (px - CV.width / 2) / cam.s + cam.x, IY = (py) => cam.y - (py - CV.height / 2) / cam.s;
  // schematic: logical columns, lanes as rows
  function schem() {
    const col = { input: 0, mod: 2 + C.depth, monitor: 3 + C.depth, output: 4 + C.depth }, pos = {};
    C.inst.forEach((I) => {
      let x, y;
      if (I.role === 'input') { const k = +I.id.slice(2); x = col.input; y = C.mod === 'wdm' ? 0 : k * C.N + C.N / 2 - 0.5 - (LAB.LANES - 1) / 2; }
      else if (I.role === 'splitter') { x = 1 + I.j; y = I.l0 + I.span / 2 - 0.5 - (LAB.LANES - 1) / 2; }
      else if (I.role === 'modulator') { x = col.mod; y = I.lane == null ? 0 : I.lane - (LAB.LANES - 1) / 2; }
      else if (I.role === 'monitor') { x = col.monitor; y = I.lane == null ? 0 : I.lane - (LAB.LANES - 1) / 2; }
      else { x = col.output; y = C.mod === 'wdm' ? 0 : I.lane - (LAB.LANES - 1) / 2; }
      pos[I.id] = { x: x * 120, y: y * 44, w: 84, h: 26 };
    });
    return pos;
  }
  function schemBox() { const p = Object.values(schem()); return { x0: Math.min(...p.map((q) => q.x)) - 70, x1: Math.max(...p.map((q) => q.x)) + 70, y0: Math.min(...p.map((q) => q.y)) - 50, y1: Math.max(...p.map((q) => q.y)) + 50 }; }
  function draw() {
    const c = cv(); if (!c || !C) return; const g = c.getContext('2d'); if (!g) return;
    if (!cam) fit();
    g.fillStyle = '#0b1220'; g.fillRect(0, 0, c.width, c.height);
    g.font = `${10 * DPR}px "IBM Plex Mono", monospace`; g.textBaseline = 'middle';
    if ((S().view || 'layout') === 'layout') drawLayout(g); else drawSchem(g);
  }
  function drawSchem(g) {
    const pos = schem(), bad = new Set((C.routes || []).filter((r) => !r.ok).map((r) => r.net));
    const pp = (ep) => { const [id, pn] = ep.split('.'), p = pos[id], I = C.I(id), q = I.ports.find((z) => z.n === pn); const out = q && q.a === 0; return [p.x + (out ? p.w / 2 : -p.w / 2), p.y + (I.type === 'mmi1x2' && pn !== 'in' ? (q.y > 0 ? 7 : -7) : 0)]; };
    C.onets.forEach((n) => { const a = pp(n.from), b = pp(n.to), r = (C.routes || []).find((x) => x.net === n.id); g.strokeStyle = r && !r.ok ? '#ff6b6b' : '#64c9df'; g.lineWidth = 1.4 * DPR; g.beginPath(); g.moveTo(TX(a[0]), TY(a[1])); const xm = (a[0] + b[0]) / 2; g.lineTo(TX(xm), TY(a[1])); g.lineTo(TX(xm), TY(b[1])); g.lineTo(TX(b[0]), TY(b[1])); g.stroke(); void bad; });
    C.inst.forEach((I) => {
      const p = pos[I.id], on = sel && (sel.id === I.id || sel.type === I.type), col = I.type === 'mzm' || I.type === 'mrr' || I.type === 'mrr_wdm' ? '#64c9df' : I.type === 'tap_pd' ? '#b48cff' : I.type === 'mmi1x2' ? '#9eabbd' : '#f6c35a';
      g.fillStyle = on ? 'rgba(100,201,223,.25)' : 'rgba(231,236,243,.06)'; g.strokeStyle = col; g.lineWidth = (on ? 2.2 : 1.2) * DPR;
      g.fillRect(TX(p.x - p.w / 2), TY(p.y + p.h / 2), p.w * cam.s, p.h * cam.s); g.strokeRect(TX(p.x - p.w / 2), TY(p.y + p.h / 2), p.w * cam.s, p.h * cam.s);
      if (cam.s * p.w > 40 * DPR) { g.fillStyle = '#e7ecf3'; g.textAlign = 'center'; g.fillText(I.type === 'ssc' ? (I.role === 'input' ? `IN${I.id.slice(2)} SSC` : `OUT${I.lane} SSC`) : I.type === 'mmi1x2' ? '1×2 MMI' : I.type === 'tap_pd' ? 'tap+PD' : I.type === 'mrr_wdm' ? 'MRR ×8 버스' : `${I.type.toUpperCase()}${I.lane}`, TX(p.x), TY(p.y)); }
      // electrical pins
      const ep = I.ports.filter((q) => q.k === 'rf' || q.k === 'dc');
      ep.forEach((q, k) => { const mapped = C.enets.some((n) => n.from === `${I.id}.${q.n}`); g.fillStyle = !mapped ? '#ff6b6b' : q.k === 'rf' ? '#f2b04a' : '#9eabbd'; g.fillRect(TX(p.x - p.w / 2 + 6 + k * 9), TY(p.y + p.h / 2 + 5), 5 * DPR, 5 * DPR); });
    });
    g.textAlign = 'left'; g.fillStyle = 'rgba(158,171,189,.9)'; g.fillText(`1.6T DR8 Tx PIC · ${C.mod.toUpperCase()} ×8 · 레이저 ${C.nL}개 (1:${C.N}) · 광 넷 ${C.onets.length} · 전기 넷 ${C.enets.length}`, 8 * DPR, 12 * DPR);
  }
  function drawLayout(g) {
    const s = cam.s, px = (v) => Math.max(1, v * s);
    // die, edge margin
    g.strokeStyle = 'rgba(231,236,243,.7)'; g.lineWidth = 1.2 * DPR; g.strokeRect(TX(0), TY(C.H), C.W * s, C.H * s);
    g.setLineDash([4 * DPR, 4 * DPR]); g.strokeStyle = 'rgba(158,171,189,.35)'; const e = C.d.edge; g.strokeRect(TX(e), TY(C.H - e), (C.W - 2 * e) * s, (C.H - 2 * e) * s); g.setLineDash([]);
    const LY = S().layers || { opt: 1, ele: 1, drc: 1 };   // view-only layer toggles (the exported GDS is not affected)
    // electrical lines under everything
    if (LY.ele) (C.elines || []).forEach((l) => { g.strokeStyle = l.kind === 'rf' ? 'rgba(242,176,74,.75)' : 'rgba(158,171,189,.45)'; g.lineWidth = Math.max((l.kind === 'rf' ? 1.4 : 1) * DPR, (l.width_um || 0) * s); if (l.kind !== 'rf' && (l.width_um || 0) * s < 2 * DPR) g.setLineDash([3 * DPR, 3 * DPR]); g.beginPath(); l.pts.forEach((p, i) => (i ? g.lineTo(TX(p[0]), TY(p[1])) : g.moveTo(TX(p[0]), TY(p[1])))); g.stroke(); g.setLineDash([]); });
    if (LY.ele) (C.pads || []).forEach((p) => { g.fillStyle = p.kind === 'rf' ? 'rgba(242,176,74,.55)' : 'rgba(158,171,189,.4)'; g.fillRect(TX(p.x - p.w / 2), TY(p.y + p.w / 2), p.w * s, p.w * s); });
    // components
    const bad = new Set(); if (LY.drc) CHK.checks.filter((x) => x.status === 'FAIL').forEach((x) => C.inst.forEach((I) => { if (String(x.detail).includes(I.id)) bad.add(I.id); }));
    C.inst.forEach((I) => {
      const b = C.bbox(I), on = sel && (sel.id === I.id || sel.type === I.type);
      g.strokeStyle = bad.has(I.id) ? '#ff6b6b' : on ? '#64c9df' : 'rgba(158,171,189,.35)'; g.lineWidth = (on || bad.has(I.id) ? 2 : 1) * DPR;
      if (on) { g.fillStyle = 'rgba(100,201,223,.12)'; g.fillRect(TX(b[0]) - 3 * DPR, TY(b[3]) - 3 * DPR, Math.max(2, (b[2] - b[0]) * s) + 6 * DPR, Math.max(2, (b[3] - b[1]) * s) + 6 * DPR); }
      g.strokeRect(TX(b[0]), TY(b[3]), Math.max(2, (b[2] - b[0]) * s), Math.max(2, (b[3] - b[1]) * s));
      if (LY.opt || I.role === 'modulator') drawComp(g, I, px);
      if (on && sel.id) { g.fillStyle = '#64c9df'; g.textAlign = 'left'; g.fillText(`▸ ${I.id}`, TX(b[0]), TY(b[3]) - 8 * DPR); }
    });
    // routes
    if (LY.opt) C.samples.forEach(({ r, pts }) => { if (!pts.length || (!r.ok && !LY.drc)) return; g.strokeStyle = r.ok ? '#64c9df' : '#ff6b6b'; g.lineWidth = Math.max(1.2 * DPR, (r.w || 0.5) * s); g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(TX(p[0]), TY(p[1])) : g.moveTo(TX(p[0]), TY(p[1])))); g.stroke(); });
    // failure markers
    const mark = (x, y, t) => { g.strokeStyle = '#ff6b6b'; g.lineWidth = 2 * DPR; g.beginPath(); g.arc(TX(x), TY(y), 9 * DPR, 0, 2 * Math.PI); g.stroke(); g.fillStyle = '#ff6b6b'; g.textAlign = 'left'; g.fillText(t, TX(x) + 12 * DPR, TY(y)); };
    if (LY.drc) { (C.routes || []).filter((r) => !r.ok && r.at).forEach((r) => mark(r.at[0], r.at[1], `✗ ${r.code || '배선'}`));
      if (C.gapAt && C.minGap < SH().pf().rules.gap) mark(C.gapAt[0], C.gapAt[1], `간격 ${C.minGap.toFixed(2)} µm`); }
    // the selected diagnosis: its instances, nets and point in amber (drawn last, on top)
    if (diag) {
      g.setLineDash([6 * DPR, 4 * DPR]); g.strokeStyle = '#f2b04a'; g.lineWidth = 2.4 * DPR;
      diag.ids.forEach((id) => { const I = C.I(id); if (!I) return; const b = C.bbox(I); g.strokeRect(TX(b[0]) - 4 * DPR, TY(b[3]) - 4 * DPR, (b[2] - b[0]) * s + 8 * DPR, (b[3] - b[1]) * s + 8 * DPR); });
      g.setLineDash([]);
      C.samples.filter(({ r }) => diag.nets.includes(r.net)).forEach(({ pts }) => { g.strokeStyle = 'rgba(242,176,74,.9)'; g.lineWidth = Math.max(3 * DPR, 2 * s); g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(TX(p[0]), TY(p[1])) : g.moveTo(TX(p[0]), TY(p[1])))); g.stroke(); });
      if (diag.pt) { g.strokeStyle = '#f2b04a'; g.lineWidth = 2 * DPR; const X0 = TX(diag.pt[0]), Y0 = TY(diag.pt[1]); g.beginPath(); g.moveTo(X0 - 14 * DPR, Y0); g.lineTo(X0 + 14 * DPR, Y0); g.moveTo(X0, Y0 - 14 * DPR); g.lineTo(X0, Y0 + 14 * DPR); g.stroke(); g.beginPath(); g.arc(X0, Y0, 10 * DPR, 0, 2 * Math.PI); g.stroke(); }
      g.fillStyle = '#f2b04a'; g.textAlign = 'left'; g.fillText(`진단: ${diag.item.slice(0, 40)}${diag.located ? '' : ' (위치 정보 없음)'}`, 8 * DPR, 28 * DPR);
    }
    g.textAlign = 'left'; g.fillStyle = 'rgba(158,171,189,.9)'; g.fillText(`${(C.W / 1000).toFixed(2)} × ${(C.H / 1000).toFixed(2)} mm · ${C.mod.toUpperCase()} ×8 · 광 넷 ${(C.routes || []).length} (실패 ${(C.routes || []).filter((r) => !r.ok).length}) · 패드 ${(C.pads || []).length}`, 8 * DPR, 12 * DPR);
    // scale bar
    const bar = [10, 20, 50, 100, 200, 500, 1000, 2000].find((v) => v * s > 60 * DPR) || 5000; g.strokeStyle = '#e7ecf3'; g.lineWidth = 2 * DPR; g.beginPath(); g.moveTo(10 * DPR, cv().height - 12 * DPR); g.lineTo(10 * DPR + bar * s, cv().height - 12 * DPR); g.stroke(); g.fillStyle = '#e7ecf3'; g.fillText(`${bar >= 1000 ? bar / 1000 + ' mm' : bar + ' µm'}`, 14 * DPR + bar * s, cv().height - 12 * DPR);
  }
  function drawComp(g, I, px) {
    const s = cam.s, gm = I.geom, X = (x) => TX(I.rot === 180 ? I.x - x : I.x + x), Y = (y) => TY(I.rot === 180 ? I.y - y : I.y + y);
    const line = (x0, y0, x1, y1, col, w) => { g.strokeStyle = col; g.lineWidth = w || Math.max(1, 0.5 * s); g.beginPath(); g.moveTo(X(x0), Y(y0)); g.lineTo(X(x1), Y(y1)); g.stroke(); };
    const rect = (x0, y0, x1, y1, col) => { g.fillStyle = col; const a = X(x0), b = X(x1); g.fillRect(Math.min(a, b), Math.min(Y(y0), Y(y1)), Math.max(1, Math.abs(b - a)), Math.max(1, Math.abs(Y(y1) - Y(y0)))); };
    if (I.type === 'ssc') { g.fillStyle = '#64c9df'; g.beginPath(); g.moveTo(X(0), Y(0.5 * px(1) / s)); g.lineTo(X(I.L), Y(Math.max(0.6, I.params.w_um / 2))); g.lineTo(X(I.L), Y(-Math.max(0.6, I.params.w_um / 2))); g.lineTo(X(0), Y(-0.5 * px(1) / s)); g.fill(); }
    else if (I.type === 'mmi1x2') { const p = I.params; rect(p.taper_len_um, -p.W_um / 2, p.taper_len_um + p.L_um, p.W_um / 2, 'rgba(100,201,223,.8)'); line(0, 0, p.taper_len_um, 0, '#64c9df'); line(p.taper_len_um + p.L_um, p.s_um / 2, I.L, p.s_um / 2, '#64c9df'); line(p.taper_len_um + p.L_um, -p.s_um / 2, I.L, -p.s_um / 2, '#64c9df'); }
    else if (I.type === 'mzm') {   // the same local primitives and rectangles the GDS backend draws (params.local)
      const P = C.P, m = P.mmi, loc = I.params.local, lc = { m1: 'rgba(242,176,74,.45)', heater: '#f6ad55', term: '#e53e3e' };
      loc.rects.forEach((r) => rect(r.x0, r.y0, r.x1, r.y1, lc[r.layer] || 'rgba(231,236,243,.3)'));
      rect(m.tl, -m.W / 2, m.tl + m.L, m.W / 2, 'rgba(100,201,223,.7)'); rect(gm.L - m.tl - m.L, -m.W / 2, gm.L - m.tl, m.W / 2, 'rgba(100,201,223,.7)');
      [1, -1].forEach((sg) => { line(0, 0, m.tl, 0, '#64c9df'); line(m.tl + m.L, sg * m.s / 2, m.Ltot, sg * m.s / 2, '#64c9df'); line(gm.L - m.tl, 0, gm.L, 0, '#64c9df'); line(gm.L - m.Ltot, sg * m.s / 2, gm.L - m.tl - m.L, sg * m.s / 2, '#64c9df'); });
      wg(loc.prims, '#64c9df');
    } else if (I.type === 'mrr') {
      const loc = I.params.local || { prims: [] };
      wg(loc.prims.filter((p) => p.layer !== 'si'), '#64c9df'); wg(loc.prims.filter((p) => p.layer === 'si'), '#3b82c4');
      line(gm.Lt || 0, 0, gm.L - (gm.Lt || 0), 0, '#64c9df', Math.max(1, gm.w * s)); g.strokeStyle = '#64c9df'; g.lineWidth = Math.max(1.2 * DPR, gm.w * s); g.beginPath(); g.arc(X(gm.xc), Y(gm.yc), Math.max(2, gm.R * s), 0, 2 * Math.PI); g.stroke();
      g.strokeStyle = 'rgba(246,173,85,.8)'; g.lineWidth = Math.max(1, 2 * s); g.beginPath(); g.arc(X(gm.xc), Y(gm.yc), Math.max(2, gm.R * s), -(270 - 27) * Math.PI / 180, -(270 + 27 - 360) * Math.PI / 180, true); g.stroke();
    } else if (I.type === 'mrr_wdm') {   // the same primitives the GDS draws: bus fillers + end transitions (local), ring cells at (x_k, y_k)
      const loc = I.params.local, cols = ['#8fb3ff', '#64c9df', '#5dd193', '#c6e06b', '#f6c35a', '#f2b04a', '#ff8d9c', '#b48cff'];
      wg(loc.prims.filter((p) => p.layer !== 'si'), '#64c9df'); wg(loc.prims.filter((p) => p.layer === 'si'), '#64c9df');
      I.params.rings.forEach((rg, k) => { const x = loc.ring_x_um[k], y = loc.ring_y_um[k]; line(x - rg.bus_len_um / 2, 0, x + rg.bus_len_um / 2, 0, '#64c9df', Math.max(1, rg.bus_w_um * s)); g.strokeStyle = cols[k]; g.lineWidth = Math.max(1.2 * DPR, rg.w_um * s); g.beginPath(); g.arc(X(x), Y(y), Math.max(2, rg.R_um * s), 0, 2 * Math.PI); g.stroke(); });
    } else if (I.type === 'tap_pd') {
      const loc = I.params.local; wg(loc.prims, '#64c9df'); loc.rects.forEach((r) => rect(r.x0, r.y0, r.x1, r.y1, 'rgba(180,140,255,.8)'));
    }
    function wg(prims, col) { if (!prims.length) return; prims.forEach((p) => { const pts = LAB.sample([p], Math.max(0.05, 1.5 / s)); g.strokeStyle = col; g.lineWidth = Math.max(1, (p.w0 != null ? Math.max(p.w0, p.w1) : p.w) * s); g.beginPath(); pts.forEach((q, i) => (i ? g.lineTo(X(q[0]), Y(q[1])) : g.moveTo(X(q[0]), Y(q[1])))); g.stroke(); }); }
  }
  function hit(px, py) {
    const x = IX(px), y = IY(py);
    if ((S().view || 'layout') === 'layout') { let best = null; C.inst.forEach((I) => { const b = C.bbox(I), m = 4 / cam.s; if (x >= b[0] - m && x <= b[2] + m && y >= b[1] - m && y <= b[3] + m) { const a = (b[2] - b[0]) * (b[3] - b[1]); if (!best || a < best.a) best = { I, a }; } }); return best && best.I; }
    const pos = schem(); return C.inst.find((I) => { const p = pos[I.id]; return Math.abs(x - p.x) <= p.w / 2 && Math.abs(y - p.y) <= p.h / 2; }) || null;
  }

  /* ---------------- guide (A–G, same dialog as the level guides) ---------------- */
  function guide() {
    const m = MISS[cur()], G = window.GAME_GUIDE, P = pfP(), pf = SH().pf(), d = des();
    const keys = m.keys.concat(m.adv), D = GD[m.id];
    const C2 = keys.length ? `<div class="gtbl wide"><table><tr><th>이름</th><th>기호</th><th>단위</th><th>의미</th><th>키우면 / 줄이면</th><th>Trade-off</th><th>지금</th></tr>${keys.map((k) => { const p = P[k], q = (D.P || {})[k] || {}; return `<tr data-k="${k}"><td>${p.label}</td><td class="sym">${p.sym}</td><td>${p.unit || (p.labels ? '선택' : '—')}</td><td>${q.m || ''}</td><td>${q.ud || ''}</td><td>${q.tr || ''}</td><td>${fmtV(p, d[k])}${m.adv.includes(k) ? ' <span class="note">(Advanced)</span>' : ''}</td></tr>`; }).join('')}</table></div>` : '<p>이 미션은 손잡이 대신 검사·내보내기 동작을 다룹니다.</p>';
    const goals = CHK.checks.filter((x) => D.re && D.re.test(x.item)).map((x) => `<li class="${x.status === 'PASS' ? 'ok' : x.status === 'FAIL' ? 'no' : ''}">${x.item}<span class="st">${x.status}</span></li>`).join('');
    G.openCustom({ title: `Design Lab · ${m.title}`, sub: `${pf.short} · ${C.mod.toUpperCase()} ×8 · ${des().W.toFixed(1)} × ${des().H.toFixed(1)} mm<br><span class="note">Learning Guide = 원리와 결정 · Coach = 지금 막힌 곳 · 검사 = 엔진 계산</span>`,
      secs: [['A', 'Learning Objectives · 학습 목표', `<p>${D.A}</p>`],
        ['B', 'Physical Principle · 원리', `${D.B}<div class="deep">${typeof D.deep === 'function' ? D.deep() : D.deep}</div>`],
        ['C', 'Parameters · 설계 변수', C2],
        ['D', 'Interactive Example · 직접 해보기', `<p>${D.D}</p><p class="note">가운데 Workspace가 이 미션의 예제입니다 — 값을 바꾸면 같은 엔진이 회로·배치·배선·검사를 다시 계산합니다.</p>`],
        ['E', 'Game Mission · 미션 연결', `<p>이 미션의 완료는 아래 검사 결과로 판정합니다 (정답 값은 주지 않습니다).</p><ul class="gmis">${goals || '<li>검사 실행 후 표시</li>'}</ul>`],
        ['F', 'Model Limitations · 모델의 한계', G.fmt.lim(D.F)],
        ['G', 'References · 더 읽을거리', G.fmt.refs(D.G)]] });
  }
  const GD = {
    schematic: { re: /광 포트|포트 종류|레인 수|입·출력/, A: '1.6T DR8 송신기가 어떤 블록으로 이루어지는지, 레이저 공유가 입력 포트와 분배 트리를 어떻게 바꾸는지, 포트와 넷으로 회로를 표현하는 법을 익힙니다.',
      B: '<p>DR8은 8개 레인이 같은 파장(O-band 1311 nm)으로 각자 광섬유를 씁니다. 레이저 하나를 N개 레인이 나눠 쓰면 1×2 MMI를 log₂N단 거쳐 빛이 1/N로 나뉩니다(분배 손실 10 log N + 단마다 MMI 과잉손실). 각 레인은 변조기 → (모니터 탭) → 출력 SSC로 이어집니다.</p>',
      deep: '<p>회로도는 소자(instance)와 포트, 포트 사이의 넷으로 이루어집니다. 광 포트는 방향(angle)과 폭을 가지며, 넷은 출발 포트가 동쪽, 도착 포트가 서쪽을 향해야 이 배선기의 가정에 맞습니다. 전기 포트(RF·DC)는 패드로 가는 전기 넷을 가집니다.</p>',
      D: '레이저 공유를 1:1 → 1:8로 바꿔 입력 수와 MMI 트리가 함께 바뀌는 것을 보세요. 변조기를 MRR로 바꾸면 전기 포트 구성(GSG → GS + 히터)이 달라집니다.',
      P: { mod: { m: '레인 변조기', ud: 'MRR: 작음·이득↑·히터 필요 / MZM: 광대역·온도 무관', tr: '면적·이득 ↔ 열 관리' }, share: { m: '레이저 하나가 맡는 레인 수', ud: '↑ 레이저↓, 분배 손실↑', tr: '부품 수 ↔ 광 파워' }, mon: { m: '레인별 모니터(탭+PD)', ud: '있으면 바이어스·링 락 가능, 탭 0.09 dB', tr: '제어 가능성 ↔ 손실·면적' } },
      F: [['회로 구성', 'an', '포트·넷 그래프 (연결성은 정확히 검사)'], ['부품 성능', 'semi', '각 레벨 엔진(카드 또는 기준 설계)'], ['광원 인터페이스', 'asm', 'CW 레이저는 외부 광원, 칩 위 모델 없음']],
      G: ['ieee3dj', 'oif', 'chrost'] },
    floorplan: { re: /다이 경계|소자 겹침|패드 배치|범프 배치/, A: '다이 크기, 가장자리 여유, 광 I/O 변과 전기 I/O 변이 배치를 어떻게 제약하는지 배웁니다. 무엇이 다이 크기를 정하는지(광 길이? 패드 수?) 확인합니다.',
      B: '<p>광 I/O는 광섬유 배열(FAU)의 피치(127 µm)에 맞춘 SSC 가장자리 결합입니다. TW-MZM은 전극 길이(mm)가 다이 폭을, 와이어본드 패드 수가 변 길이를 정합니다. RF 급전선이 다른 레인의 전극을 가로지르지 않도록 레인을 엇갈려(Δx) 각 급전선이 지나갈 통로를 만듭니다.</p>',
      deep: '<p>자동 배치: 레인 피치 = max(FAU 피치, 레인 높이 + 40 µm), 엇갈림 Δx = (RF 패드 수 − 1)·패드 피치 + 패드 폭 + 40 µm(가장자리 패드일 때), 분배 트리 각 단의 길이 = MMI + 그 단 S-bend + 여유. 필요한 다이 = 광 경로 길이 + 출력 팬 + SSC + 여유, 그리고 DC 패드 줄 길이 중 큰 값.</p>',
      D: '다이 폭을 필요 크기보다 줄여 Infeasible 이유가 어떻게 바뀌는지 보세요. Advanced에서 엇갈림을 0으로 하면 RF 배선이 교차합니다(Mission 4).',
      P: { rp: { m: 'WDM8 링 간격 (버스 위, 3W 설계값에서 시작)', ud: '↑ 열 결합↓, 버스 길이·면적↑ · ↓ 링 셀(2R + 20 µm)과 범프 열이 겹칠 수 있음', tr: '열 결합 ↔ 면적' }, W: { m: '다이 가로', ud: '↓ 웨이퍼당 다이↑, 배선·패드 공간↓', tr: '비용 ↔ 실현 가능성' }, H: { m: '다이 세로', ud: '↓ 레인·패드 줄 공간↓', tr: '비용 ↔ 레인 피치' }, edge: { m: '다이싱·패키지 여유', ud: '↑ 안전, 공간↓', tr: '수율 ↔ 면적' }, P: { m: '레인 간격', ud: '↑ 열·RF 결합↓, 다이↑', tr: '크로스토크 ↔ 면적' }, stag: { m: 'RF 급전 통로 폭', ud: '↓ 다이 폭↓, RF 교차 위험', tr: '면적 ↔ 평면 배선 가능성' }, fp: { m: 'FAU 광섬유 피치', ud: '250 µm: 팬 길이↑', tr: '패키지 표준' } },
      F: [['배치', 'an', '직사각형 bbox 기준 경계·겹침'], ['패드·범프 크기', 'asm', '와이어본드 80 µm / 피치 100, 마이크로범프 30 / 45 µm'], ['열 크로스토크', 'fw', '레인 간 열해석 없음']],
      G: ['chrost', 'oif', 'gdsf'] },
    routing: { re: /광 배선 생성|배선 간격|굽힘 반경|최소 선폭|넓은 배선|장애물/, A: '회로 넷을 실제 도파로 형상(직선·코너·S-bend·테이퍼)으로 바꾸고, 굽힘 반경·간격·길이가 손실과 실현 가능성을 어떻게 정하는지 배웁니다.',
      B: '<p>90° 코너는 원호(반경 R) 또는 Euler(곡률이 0에서 1/R<sub>min</sub>까지 선형으로 변함)로 그립니다. 원호는 직선과 만나는 곳에서 곡률이 튀어 모드 불일치가 생기고, Euler는 곡률이 연속이라 넓은(다중모드) 도파로에서도 고차 모드 여기가 작습니다. 광섬유 피치와 레인 피치가 다르면 팬(fan)이 필요하고, 수직선이 서로 가로지르지 않도록 순서를 정합니다 — 모일 때는 안쪽부터, 퍼질 때는 바깥부터.</p>',
      deep: () => { const pf = SH().pf(); return `<p>전파 손실은 측벽·상하면 산란 ∝ σ²(n₁²−n₂²)∂n<sub>eff</sub>/∂w (D-1과 같은 모델)이라 좁은 도파로가 훨씬 손실이 큽니다: ${pf.short} w<sub>0</sub> ${pf.w0} µm에서 ${LAB.wgModel(pf, pf.w0).alpha.toFixed(2)} dB/cm. 긴 넷은 선형 테이퍼(Si 15 µm + 20 µm/µm, SiN 40 µm + 40 µm/µm, 대표값)로 몸통만 넓힙니다. 굽힘 방사는 Marcuse 횡방향 슬랩 식을 국소 곡률로 적분합니다. 규칙 반경 R<sub>min</sub>은 w<sub>0</sub>에서 90° 방사가 0.005 dB 미만인 최소 R입니다.</p>`; },
      D: '배선 폭을 넓혀 레인별 배선 손실 표가 어떻게 줄어드는지, R을 키워 팬이 다이 끝을 넘어가는지 보세요.',
      P: { wr: { m: '긴 넷 몸통 폭', ud: '↑ 산란 손실↓, 다중모드(굽힘 주의)', tr: '손실 ↔ 모드 순도' }, bend: { m: '코너 곡률 형태', ud: 'Euler: 모드 변환↓, 길이↑', tr: '손실 ↔ 면적' }, R: { m: '굽힘 반경', ud: '↑ 방사↓, 팬 길이↑', tr: '손실 ↔ 면적' }, jog: { m: '팬 수직선 간격', ud: '↑ 간격 여유, 팬 길이↑', tr: 'DRC ↔ 면적' } },
      F: [['경로 형상', 'an', '직선·원호·Euler 코너 기하 (GDS와 같은 기본 도형)'], ['전파·굽힘 손실', 'semi', '측벽 산란 근사 + Marcuse 굽힘 방사'], ['테이퍼 길이', 'asm', '단열 조건 대표값 — 모드 변환 미계산'], ['다중모드 굽힘', 'fw', '넓은 도파로의 고차 모드 변환은 EME/FDTD 필요']],
      G: ['hong', 'cherchi', 'chrost', 'gdsf'] },
    electrical: { re: /전기 포트|RF 배선 교차|RF 금속|패드 배치|범프 배치|RF 급전선|링 구동선/, A: 'MZM과 링이 서로 다른 전기 인터페이스를 요구하는 이유(진행파 전극 vs 집중 소자), 패드 배치와 RF 선 길이가 성능과 다이 크기에 미치는 영향을 배웁니다.',
      B: '<p>TW-MZM은 RF가 전극을 따라 진행하는 전송선이라 50 Ω급 GSG 입력과 끝단 종단 저항이 필요하고, 급전선이 길어도 정합만 되면 동작하지만 도체 손실(∝√f)이 쌓입니다. 링은 수 fF의 집중 용량이라 구동선이 RF 파장의 1/10보다 길면 반사·공진이 생깁니다 — 그래서 링 변조기는 구동기를 바로 위에 붙이는 3D/플립칩(CPO)과 짝을 이룹니다. 히터와 모니터 PD는 DC 패드가 필요합니다.</p>',
      deep: '<p>MZM 급전 손실 = (0.35 + 3/g)·√f<sub>GHz</sub> dB/cm (2-3 CPW 도체 손실식, g = 2-3 설계의 신호–접지 간격), f = 56 GHz(112 GBd 나이퀴스트). 링 구동선 기준 λ/10 = c/(f√ε<sub>eff</sub>)/10, ε<sub>eff</sub> = (11.7+1)/2. 가장자리 패드는 RF를 한 변(N), DC를 반대 변(S)에 두고, RF 선(M1, 폭 10 µm)은 같은 금속층이라 다른 넷과 닿으면 FAIL. DC 선(M2, 폭 5 µm)은 패드 열까지 평면 팬아웃(river routing): 패드를 포트 x 순서로 놓고, 왼쪽으로 가는 선은 x가 큰 것부터 패드에 가까운 트랙을 쓰고 오른쪽은 반대로 — 그러면 수직선이 다른 선의 수평 트랙을 가로지르지 않아 한 층으로 충분하며, 트랙 수 × 10 µm가 DC 쪽 여백(다이 높이)이 됩니다.</p>',
      D: '같은 MRR 설계를 가장자리 패드와 플립칩으로 바꿔 링 구동선 길이 WARNING이 사라지고 다이가 얼마나 작아지는지 비교하세요.',
      P: { rf: { m: '구동기 연결 방식', ud: '플립칩: 선 짧음·다이↓, 3D 공정 필요', tr: 'RF 성능 ↔ 패키지 복잡도' }, rfSide: { m: 'RF 패드 변', ud: '엇갈림 방향이 바뀜', tr: '구동기 위치' }, pp: { m: '패드 피치', ud: '↑ 본딩 쉬움, 변 길이↑', tr: '조립 ↔ 다이 크기' } },
      F: [['패드·전극·종단', 'asm', '추상 형상 (Generic PDK에 RF 금속·저항 없음)'], ['RF 손실·반사', 'semi', 'CPW 도체 손실식 / λ/10 기준만 — EM 해석 아님'], ['파운드리 RF 규칙', 'fw', '검증하지 않음 (NOT VERIFIED)']],
      G: ['ieee3dj', 'oif', 'chrost'] },
    verification: { re: /./, A: '설계 검증을 연결성·기하·시스템·모델 유효성으로 나누고, 검사하지 않은 것을 PASS로 표시하지 않는 습관을 익힙니다.',
      B: '<p>연결성은 그래프 검사(모든 광 포트가 정확히 한 번, 8 레인이 입력까지 이어짐, 전기 포트마다 패드), 기하는 실제 형상의 샘플로 선폭·간격·굽힘·경계·겹침·간섭을 계산합니다. 시스템은 3A+ 모듈 엔진의 예측에 레이아웃이 더한 칩 위 배선 손실을 빼서 링크가 여전히 닫히는지 봅니다.</p>',
      deep: '<p>간격 검사는 서로 다른 넷의 중심선 샘플 사이 최소 거리 − (두 폭의 평균)입니다. 소자 내부(MMI 출력 포트 간격 등)는 각 레벨의 DRC가 맡습니다. NOT VERIFIED 항목(EM, 열 크로스토크, 파운드리 DRC)은 이 게임이 계산하지 않는 것들입니다. GDS 재검사는 tools/smq2gds 결과를 Mission 6에서 불러오면 PASS/FAIL이 됩니다 — GDS에서 다시 잰 연결·포트·길이·간격·선폭·금속 단락.</p>',
      D: '검사를 실행한 뒤 FAIL 항목을 눌러 원인 미션으로 돌아가 고쳐 보세요.',
      P: {}, F: [['연결성', 'an', '정확한 그래프 검사'], ['기하', 'an', '샘플 기반 (0.5 µm) 간격·경계·겹침'], ['시스템 예측', 'semi', '3A+ 엔진 + 레이아웃 배선 손실'], ['EM·열·파운드리 규칙', 'fw', 'NOT VERIFIED']],
      G: ['chrost', 'gdsf', 'luceda'] },
    export: { re: /GDS|변조기 종류|파워 버짓/, A: '브라우저 게임과 GDS 백엔드의 책임을 나누는 회로 데이터(smq-circuit/1)를 이해합니다.',
      B: '<p>게임은 넷리스트·소자 파라미터·포트 연결·배치·배선 형상(직선·코너·원호 기본 도형)·플랫폼·규칙·성능 예측·검증 결과를 내보냅니다. GDS 백엔드는 그 데이터를 읽어 PCell을 만들고 배치·조립·형상 검증·GDS·미리보기를 만듭니다. 형상을 기본 도형으로 넘기므로 게임 미리보기와 GDS가 같은 모양이 됩니다.</p>',
      deep: '<p>세 파일: engine_schematic.json(소자·포트·넷), engine_layout.json(배치·배선 기본 도형·패드·추상화 수준), engine_verification.json(검사 결과·성능 예측). 링 소자는 2-3R의 ring_allpass PCell 데이터를, MZM은 2-3 전극 길이·간격과 1-3 MMI·2-1 히터를 그대로 담습니다.</p>',
      D: '내보낸 JSON의 routing.optical[].prims가 캔버스에 그린 선과 같은 기본 도형인지 확인해 보세요.',
      P: {}, F: [['회로 데이터', 'an', '게임 상태 그대로'], ['GDS 생성·재검사', 'an', 'tools/smq2gds: 같은 기본 도형 → GDS → KLayout으로 다시 읽어 검사'], ['능동층·금속', 'asm', '주석 레이어 추상화 — Tape-out Ready 아님']],
      G: ['gdsf', 'luceda', 'chrost'] }
  };

  /* ---------------- events ---------------- */
  function renderAll(refit) {
    if (!isOpen) return;
    recompute(); renderHead(); renderParams(); renderLib(); legend(); renderSel(); renderOut(); renderCoach();
    if (refit || !cam) fit(); else size();
    draw();
    if (SH() && SH().refreshMap) SH().refreshMap();
    renderHooks.forEach((f) => { try { f(); } catch (e) { /* learning layer */ } });
  }
  const sched = (refit) => { clearTimeout(timer); timer = setTimeout(() => renderAll(refit), 90); };
  document.addEventListener('input', (e) => { if (!e.target.closest('#lab,#lab-insp,#lab-lib,#lab-out')) return; const t = e.target.closest('[data-lk]'); if (!t) return; const p = pfP()[t.dataset.lk], v = +t.value; $('#lo-' + p.k).textContent = fmtV(p, v); setV(p.k, v); sched(p.k === 'W' || p.k === 'H' || p.k === 'mod' || p.k === 'share'); });
  document.addEventListener('change', (e) => { if (!e.target.closest('#lab,#lab-insp,#lab-lib,#lab-out')) return;
    const ly = e.target.closest && e.target.closest('[data-ly]'); if (ly) { const L2 = { opt: 1, ele: 1, drc: 1, ...(S().layers || {}) }; L2[ly.dataset.ly] = ly.checked ? 1 : 0; S().layers = L2; save(); draw(); return; }
    if (e.target.id !== 'lab-gds' || !e.target.files || !e.target.files[0]) return;
    const f = e.target.files[0], rd = new FileReader();
    rd.onload = () => { importGds(String(rd.result)); save(); renderAll(); };
    rd.readAsText(f);
  });
  document.addEventListener('click', (e) => { if (!e.target.closest('#lab,#lab-insp,#lab-lib,#lab-out')) return;
    const lm = e.target.closest('[data-lm]'), ms = e.target.closest('[data-ms]'), nx = e.target.closest('#lab-next'), la = e.target.closest('[data-la]'), lv = e.target.closest('[data-lv]'), lt = e.target.closest('[data-lt]'), z = e.target.closest('[data-z]');
    if (lm) { S().mode = lm.dataset.lm; save(); renderAll(); return; }
    if (ms) { S().cur = +ms.dataset.ms; save(); renderAll(); return; }
    if (nx) { S().cur = Math.min(MISS.length - 1, cur() + 1); save(); renderAll(); return; }
    if (lv) { S().view = lv.dataset.lv; save(); cam = null; renderAll(true); return; }
    if (lt) { sel = sel && sel.type === lt.dataset.lt ? null : { type: lt.dataset.lt }; renderLib(); renderSel(); draw(); return; }
    if (z) { if (z.dataset.z === 'fit') fit(); else if (z.dataset.z === 'sel') fitBox(diag ? diagBox(diag) : sel && sel.id && C.I(sel.id) ? C.bbox(C.I(sel.id)) : null); else cam.s *= z.dataset.z === 'in' ? 1.6 : 1 / 1.6; draw(); return; }
    const dg = e.target.closest('[data-diag]'); if (dg) { showDiag(+dg.dataset.diag); return; }
    if (e.target.closest('[data-diag-clear]')) { diag = null; renderSel(); draw(); return; }
    const gm = e.target.closest('[data-goto]'); if (gm) { S().cur = MI[gm.dataset.goto] != null ? MI[gm.dataset.goto] : S().cur; if (gm.dataset.adv) S().mode = 'advanced'; save(); renderAll(); return; }
    if (e.target.closest('#lab-back')) { close(); if (SH()) SH().refreshMap(); return; }
    if (e.target.closest('#lab-guide')) { guide(); return; }
    if (la) {
      const a = la.dataset.la, d = des();
      if (a === 'fit') { d.W = Math.ceil(C.need.W / 100) / 10; d.H = Math.ceil(C.need.H / 100) / 10; save(); renderAll(true); }
      if (a === 'auto') { const nd = LAB.defaults(ctx(), { mod: d.mod, share: d.share }); Object.assign(d, { P: nd.P, stag: nd.stag, edge: nd.edge, fp: nd.fp, W: nd.W, H: nd.H }); save(); renderAll(true); }
      if (a === 'arch') { const a3 = arch3(); d.mod = a3.mod; d.share = a3.share; d.stag = LAB.stagAuto(d); save(); renderAll(true); }
      if (a === 'pin') { S().pin = { hash: C.hash, at: new Date().toISOString(), snap: labSnap() }; save(); renderOut(); }
      if (a === 'unpin') { delete S().pin; save(); renderOut(); }
      if (a === 'run') { S().ran = { hash: C.hash, sig: CHK.sig, at: new Date().toISOString() }; save(); renderAll(); const o = $('#lab-out'); if (o && o.scrollIntoView) o.scrollIntoView({ block: 'start', behavior: smqMotion() }); }   // the result table is below the workspace
      if (a.startsWith('exp')) exportFiles(a);
    }
  });
  function exportFiles(a) {
    const ex = LAB.exportCircuit(C, CHK), files = { 'exp-s': [['engine_schematic.json', ex.schematic]], 'exp-l': [['engine_layout.json', ex.layout]], 'exp-v': [['engine_verification.json', ex.verification]] }[a] || [['engine_schematic.json', ex.schematic], ['engine_layout.json', ex.layout], ['engine_verification.json', ex.verification]];
    files.forEach(([name, obj]) => { const txt = JSON.stringify(obj, null, 1); try { const el = document.createElement('a'); el.href = URL.createObjectURL(new Blob([txt], { type: 'application/json' })); el.download = `${SH().plat()}_${name}`; document.body.appendChild(el); el.click(); setTimeout(() => { URL.revokeObjectURL(el.href); el.remove(); }, 1000); } catch (er) { /* download unavailable */ } });
    const ta = $('#lab-json'); if (ta) { ta.hidden = false; ta.value = JSON.stringify({ schematic: ex.schematic, layout: ex.layout, verification: ex.verification }); }
    if (a === 'exp-all') { S().exported = { at: new Date().toISOString(), hash: ex.layout.design_hash }; save(); recompute(); }
    renderHead(); renderOut(); if (SH()) SH().refreshMap();
  }
  // canvas: drag to pan, Ctrl/⌘ + wheel to zoom, click to select
  const c0 = $('#lab-cv');
  // two fingers pinch-zoom (touch); one finger / mouse drags; a tap selects
  const touches = new Map(); let pinch = null;
  const tdist = () => { const v = [...touches.values()]; return Math.hypot(v[0].x - v[1].x, v[0].y - v[1].y); };
  c0.addEventListener('pointerdown', (e) => { touches.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (touches.size === 2 && cam) { pinch = { d0: tdist(), s0: cam.s, x: cam.x, y: cam.y, mid: [...touches.values()].reduce((a,p)=>({x:a.x+p.x/2,y:a.y+p.y/2}),{x:0,y:0}) }; drag = null; return; } drag = { x: e.clientX, y: e.clientY, cx: cam && cam.x, cy: cam && cam.y, moved: false }; c0.setPointerCapture && c0.setPointerCapture(e.pointerId); });
  ['pointerup', 'pointercancel'].forEach((ev) => c0.addEventListener(ev, (e) => { touches.delete(e.pointerId); if (touches.size < 2) pinch = null; }));
  c0.addEventListener('pointermove', (e) => { if (touches.has(e.pointerId)) touches.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pinch && touches.size === 2 && cam) { cam.s = pinch.s0 * Math.max(0.2, Math.min(8, tdist() / Math.max(1, pinch.d0))); const mid = [...touches.values()].reduce((a,p)=>({x:a.x+p.x/2,y:a.y+p.y/2}),{x:0,y:0}); cam.x = pinch.x - (mid.x-pinch.mid.x)*DPR/cam.s; cam.y = pinch.y + (mid.y-pinch.mid.y)*DPR/cam.s; draw(); return; } if (!drag || !cam) return; const dx = (e.clientX - drag.x) * DPR, dy = (e.clientY - drag.y) * DPR; if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true; if (drag.moved) { cam.x = drag.cx - dx / cam.s; cam.y = drag.cy + dy / cam.s; draw(); } });
  c0.addEventListener('pointerup', (e) => { if (!drag) return; const moved = drag.moved; drag = null; if (moved || !C) return; const r = c0.getBoundingClientRect(), I = hit((e.clientX - r.left) * DPR, (e.clientY - r.top) * DPR); sel = I ? { id: I.id, type: I.type } : null; renderLib(); renderSel(); draw(); });
  c0.addEventListener('wheel', (e) => { if (!(e.ctrlKey || e.metaKey) || !cam) return; e.preventDefault(); const r = c0.getBoundingClientRect(), px = (e.clientX - r.left) * DPR, py = (e.clientY - r.top) * DPR, wx = IX(px), wy = IY(py); cam.s *= e.deltaY < 0 ? 1.25 : 0.8; cam.x = wx - (px - c0.width / 2) / cam.s; cam.y = wy + (py - c0.height / 2) / cam.s; draw(); }, { passive: false });
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => { if (isOpen && C) { fit(); draw(); } }).observe(c0.parentElement);

  function open() { if (!SH() || !SH().plat()) return; isOpen = true; box.hidden = false; const g = $('main.game'); if (g) g.hidden = true; cam = null; renderAll(true); box.scrollIntoView && box.scrollIntoView({ block: 'start' }); }
  function close() { isOpen = false; box.hidden = true; const g = $('main.game'); if (g) g.hidden = false; }
  // focus(x, y, w): centre the layout view on (x, y) µm showing w µm across (inspection, screenshots)
  const focus = (x, y, w) => { if (!C || !CV) return; cam = { s: CV.width / w, x, y }; draw(); };
  const renderHooks = [];
  const mission = (k) => { S().cur = Math.max(0, Math.min(MISS.length - 1, k | 0)); save(); renderAll(); };
  return { open, close, setScope: (v) => { clearTimeout(timer); scope = v; C = null; CHK = null; MS = null; cam = null; sel = null; diag = null; }, redraw: () => { if (isOpen && C) { size(); draw(); } }, gdsPaste: (txt) => { importGds(txt); save(); renderAll(); }, isOpen: () => isOpen, progress, focus, mission, onRender: (f) => renderHooks.push(f), state: () => ({ C, CHK, MS, d: isOpen ? des() : null, s: SH() && SH().plat() ? S() : null }), MISS };
})();
if (window.LABUI && window.GAME_SHELL && window.GAME_SHELL.plat()) window.GAME_SHELL.refreshMap();
