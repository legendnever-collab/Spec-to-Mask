// ===== Learning layer (v1.0 §6–7): first-run onboarding, three learning paths over existing missions, Engineering Review =====
// Nothing here changes a design, a score, a star, a card or a Fab result. Paths are navigation; reviews are self-checks whose
// answers are kept as a learning record (progress.by[platform].review) and included in the full backup.
(() => {
  const SH = () => window.GAME_SHELL; if (!SH()) return;
  const $ = (s) => document.querySelector(s);
  /* ---------- learning paths: recommended order over the existing missions (free exploration stays open) ---------- */
  const PATHS = {
    A: { name: 'PIC Fundamentals', who: 'PIC 입문자', line: 'Waveguide → Coupler → MZI → Modulator', steps: ['1-1', '1-2', '1-5', '1-7', '2-3'] },
    B: { name: 'Optical Engine Architect', who: 'Optical System · Packaging 엔지니어', line: 'MZM vs MRR → DR8 → WDM8 → Link Budget', steps: ['2-3', '2-3R', '3A+', '3W', '2-5'] },
    C: { name: 'PIC Design Challenge', who: 'PIC 설계 엔지니어', line: 'Schematic → Floorplan → Routing → Verification → GDS', steps: ['LAB:0', 'LAB:1', 'LAB:2', 'LAB:3', 'LAB:4', 'LAB:5'] }
  };
  const LABN = ['회로도', '평면 배치', '광 배선', '전기 I/F', '검증', '내보내기'], LABK = ['schematic', 'floorplan', 'routing', 'electrical', 'verification', 'export'];
  const ui = () => SH().ui(), lvName = (id) => (SH().levels().find((l) => l.id === id) || {}).name || id;
  const labLive = () => { const st = window.LABUI && window.LABUI.state && window.LABUI.state(); return (st && st.s && st.s.live) || {}; };
  const stepDone = (st) => (st.startsWith('LAB:') ? !!labLive()[LABK[+st.slice(4)]] : SH().stars(st) > 0);
  const stepLabel = (st) => (st.startsWith('LAB:') ? `LAB M${+st.slice(4) + 1} ${LABN[+st.slice(4)]}` : `${st} ${lvName(st)}`);
  const here = (st) => (st.startsWith('LAB:') ? window.LABUI && window.LABUI.isOpen() && window.LABUI.state().s && (window.LABUI.state().s.cur | 0) === +st.slice(4) : !(window.LABUI && window.LABUI.isOpen()) && SH().curId() === st);
  function goStep(st) {
    if (st.startsWith('LAB:')) { if (!window.LABUI) return; const k = +st.slice(4); if (!window.LABUI.isOpen()) window.LABUI.open(); window.LABUI.mission(k); SH().refreshMap(); return; }
    SH().go(st); const m = $('#mission'); if (m && m.scrollIntoView) m.scrollIntoView({ block: 'start', behavior: smqMotion() });
  }
  function renderPath() {
    const box = $('#pathbar'); if (!box || !SH().plat()) return;
    const k = ui().path, P = PATHS[k];
    if (!P) { box.innerHTML = `<span class="pb-h">학습 경로</span><span class="note" style="margin:0">자유 탐색 중 — 경로를 고르면 권장 순서와 다음 행동을 보여 줍니다 (진행 기록은 그대로).</span>${Object.entries(PATHS).map(([id, p]) => `<button class="btn pb-pick" data-path="${id}">${id} · ${p.name}</button>`).join('')}<button class="btn pb-help" data-onb="1">처음 안내</button>`; return; }
    const nx = P.steps.find((st) => !stepDone(st));
    box.innerHTML = `<span class="pb-h">학습 경로 ${k} · ${P.name}</span><ol class="pb-steps">${P.steps.map((st) => `<li><button class="pb-st ${stepDone(st) ? 'done' : ''} ${here(st) ? 'here' : ''}" data-step="${st}" ${here(st) ? 'aria-current="step"' : ''} aria-label="${stepLabel(st)}${stepDone(st) ? ' (완료)' : ''}">${stepDone(st) ? '✓ ' : ''}${st.startsWith('LAB:') ? 'M' + (+st.slice(4) + 1) : st}</button></li>`).join('')}</ol>`
      + (nx ? `<button class="btn pri pb-next" data-step="${nx}">다음 권장: ${stepLabel(nx)} →</button>` : '<span class="st-PASS pb-done">✓ 이 경로를 모두 마쳤습니다</span>')
      + `<button class="btn pb-help" data-path="">경로 바꾸기</button><button class="btn pb-help" data-onb="1">처음 안내</button>`;
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('#pathbar [data-step], #pathbar [data-path], #pathbar [data-onb]'); if (!b) return;
    if (b.dataset.onb) { openOnb(0); return; }
    if (b.dataset.path != null) { ui().path = b.dataset.path || null; SH().saveUI(); renderPath(); return; }
    goStep(b.dataset.step); renderPath();
  });

  /* ---------- Engineering Review: 1–2 questions where a concept turns; every option explains itself ---------- */
  const RV = {
    '1-7': [
      { q: '1단 인터리버의 지연 ΔL을 늘리면 투과 스펙트럼의 주기(FSR)는?', a: 1, o: [
        ['늘어난다', 'FSR = λ²/(n<sub>g</sub>ΔL) — ΔL이 분모에 있어 반대입니다.'],
        ['줄어든다', '맞습니다. FSR = λ²/(n<sub>g</sub>ΔL). 20 nm 간격 채널을 홀/짝으로 나누려면 FSR 40 nm에 맞는 ΔL이 필요합니다.'],
        ['변하지 않고 위상만 바뀐다', '위상 트림은 통과대역의 위치를 옮기지만, 주기는 ΔL과 n<sub>g</sub>가 정합니다.']] },
      { q: '공정에서 도파로 폭이 몇 nm 바뀐 다이에서 CWDM 채널이 어긋나는 주된 이유는?', a: 0, o: [
        ['n<sub>eff</sub>가 바뀌어 MZI 위상 2πn<sub>eff</sub>ΔL/λ가 움직이고, 통과대역 중심이 이동한다', '맞습니다. 그래서 다이별 히터 트리밍(Stage 2의 TO 위상기)이 필요합니다 — 이 레벨이 “왜 Active가 필요한가”를 보여 주는 이유입니다.'],
        ['FSR만 바뀌고 중심 파장은 그대로다', 'FSR은 n<sub>g</sub>에 따라 조금 바뀌지만, 훨씬 큰 효과는 n<sub>eff</sub> 변화로 인한 중심 이동입니다.'],
        ['삽입 손실만 늘어난다', '손실보다 파장 이동이 지배적입니다 — 몇 nm의 폭 변화로 수 nm의 채널 이동이 생깁니다.']] }
    ],
    '2-3R': [
      { q: '같은 112 GBd에서 링 변조기의 EO 대역을 정하는 것으로 가장 맞는 것은?', a: 1, o: [
        ['Q 하나 — Q가 낮을수록 대역이 넓다', '광자 수명 한계는 Q로 정해지지만, 디튜닝에 따른 응답 피크와 접합 RC 극이 곱해집니다. Q만으로 대역을 말하면 틀립니다.'],
        ['광자 수명(Q) × 레이저 디튜닝 × 접합 RC의 결합', '맞습니다. 디튜닝이 크면 Ω ≈ |Δ| 근처에 피크가 생겨 대역이 넓어지지만 정적 기울기(OMA)는 줄어듭니다. 그 위에 RC 극이 곱해집니다.'],
        ['링 반경만', '반경은 FSR·면적·접합 C에 영향을 주지만, 대역은 Q·디튜닝·RC가 함께 정합니다.']] },
      { q: '케이스 온도가 0→70 °C로 변할 때 MZM과 비교해 MRR에 필요한 것은?', a: 0, o: [
        ['링 공진이 약 60–80 pm/K 움직이므로 히터와 락으로 레이저와의 간격을 유지해야 한다', '맞습니다. 70 K면 수 nm — 선폭(수십 pm)보다 훨씬 큽니다. 균형 MZI는 두 팔이 함께 움직여 온도에 둔감합니다. 이 열 제어 비용이 MRR의 작은 크기·낮은 구동 에너지와 맞바꾸는 대가입니다.'],
        ['아무것도 — 링은 작아서 온도에 둔감하다', '작은 크기는 열 질량이 작다는 뜻이지 공진이 덜 움직인다는 뜻이 아닙니다. Si의 dn/dT로 공진은 크게 이동합니다.'],
        ['MZM과 똑같이 바이어스 히터 하나면 된다', 'MZM 바이어스는 위상 오프셋만 잡으면 되지만, 링은 매 순간 공진을 레이저에 붙잡아 두는 락이 필요합니다.']] }
    ],
    '3A+': [
      { q: 'DR8에서 링 ×8을 쓸 때, 링들을 서로 다른 파장에 배정해야 하는가?', a: 1, o: [
        ['그렇다 — 링끼리 간섭하지 않도록 파장을 나눠야 한다', 'DR8은 레인마다 광섬유가 따로라 링들이 한 버스를 공유하지 않습니다. 파장 배정은 WDM8(3W)의 문제입니다.'],
        ['아니다 — 레인마다 독립 경로라 같은 파장이어도 된다', '맞습니다. DR8 링의 숙제는 레인별 히터·락과 레이저 드리프트 추적입니다.'],
        ['FSR이 8채널보다 넓을 때만 그렇다', 'FSR 별칭은 공유 버스(WDM)에서의 문제입니다.']] },
      { q: '링 열 효율이 모델(수백 pm/mW)이 아니라 측정값(≈ 73 pm/mW, 다른 링)에 가깝다면 DR8 모듈 비교는?', a: 2, o: [
        ['변하지 않는다 — 히터는 모듈 전력의 작은 부분이다', '열 민감도 표를 보세요: 같은 엔진에서 히터 효율을 낮추면 링 히터가 레인당 수십–백여 mW로 늘어 모듈 전력이 약 1 W 늘어납니다.'],
        ['MZM도 같은 비율로 나빠진다', 'MZM 바이어스는 균형 팔이라 링 열 효율과 무관합니다.'],
        ['MRR의 전력 이점이 줄거나 사라진다 — 결론이 링 열 격리에 달려 있다', '맞습니다. 그래서 비교 패널은 Nominal / Conservative / Experimental ref.를 함께 보여 줍니다. 이 값들은 이 링의 측정값이 아니라 민감도입니다.']] }
    ],
    '3W': [
      { q: '링의 FSR이 8채널 폭(8·Δλ)보다 좁으면 무엇이 생길 수 있는가?', a: 0, o: [
        ['한 링의 다음 공진 차수가 다른 채널 위에 놓여 그 채널을 깎고 변조를 섞는다 (FSR 별칭)', '맞습니다. 단 8·Δλ ≈ m·FSR처럼 차수가 채널 사이에 끼도록 배치하면(인터리브) 별칭을 피할 수 있습니다 — 그래서 FSR과 격자를 함께 고릅니다.'],
        ['아무 문제 없다 — 링은 자기 채널만 본다', '버스의 투과는 모든 링 응답의 곱이라 다른 링의 공진도 모든 채널에 작용합니다.'],
        ['히터 전력만 줄어든다', 'FSR이 작으면 2π 튜닝 전력(P<sub>2π</sub>)은 커지고, 별칭 위험이 생깁니다.']] },
      { q: '이 레벨의 결과 가운데 검증되지 않은(NOT VERIFIED) 것은?', a: 2, o: [
        ['버스 투과와 크로스토크', '이들은 2-3R 링 응답을 곱해 계산한 Physics-informed 결과입니다.'],
        ['히터 범위 안에서 배정이 가능한지', '정적 배정과 히터 범위는 계산합니다(가정: 온도마다 즉시 최적 배정).'],
        ['동적 락 획득, 재배정 중 링크 중단, 락 루프 상호작용', '맞습니다. 이 프로그램은 정적 락만 계산합니다 — 실제 송신기에서는 락 동역학과 링별 모니터가 별도 검증 대상입니다.']] }
    ],
    'LAB:4': [
      { q: '검증 표의 PASS가 뜻하는 것은?', a: 1, o: [
        ['파운드리 DRC/LVS를 통과했다', '이 Lab은 Generic PDK·추상 금속으로 게임 규칙을 검사합니다 — 파운드리 검사가 아닙니다.'],
        ['이 프로그램의 모델과 규칙(연결·기하·시스템 예측)을 만족했다', '맞습니다. PASS는 “그 모델 안에서”의 판정입니다. 제조 가능성은 Foundry Readiness(NOT VERIFIED)로 따로 둡니다.'],
        ['실제 칩에서 링크가 동작한다', '시스템 판정도 대표값 가정이 들어간 모델 예측입니다.']] },
      { q: 'NOT VERIFIED 항목(예: RF 전자기, 레인 간 열 크로스토크)을 PASS로 바꾸려면?', a: 0, o: [
        ['게임 밖의 검증 — 파운드리 PDK DRC/LVS, RF EM 해석, 3D 열해석 등 — 이 필요하다', '맞습니다. 검사하지 않은 항목에 PASS를 주지 않는 것이 이 Lab의 원칙입니다.'],
        ['검사를 다시 실행하면 된다', '다시 실행해도 그 항목을 계산하는 모델이 없습니다.'],
        ['FAIL이 0이면 자동으로 PASS가 된다', 'FAIL이 없다는 것과 검증했다는 것은 다릅니다.']] }
    ],
    'LAB:5': [
      { q: '“Geometry Rechecked ✓”가 확인한 것은?', a: 1, o: [
        ['이 GDS로 Tape-out할 수 있다', 'Generic PDK로 그린 Engineering Prototype이며 Tape-out Ready가 아닙니다.'],
        ['smq2gds가 만든 GDS를 다시 읽어, 지금 설계(design hash)와 같은 형상·연결임을 검사했다', '맞습니다. 같은 기본 도형으로 그린 GDS의 계층·포트·연결·길이·간격·선폭·금속 단락을 다시 읽어 검사합니다.'],
        ['GDS 파일이 열렸다', '파일이 열리는 것만으로는 PASS가 아닙니다 — 재검사 결과와 design hash가 맞아야 합니다.']] }
    ]
  };
  RV['2-3'] = RV['2-3R'];   // the same MZM-vs-MRR questions from either side
  function reviewHTML(id) {
    const qs = RV[id]; if (!qs) return '';
    const R = SH().review(), mine = R[id] || {};
    const done = qs.filter((_, i) => mine[i] != null).length;
    return `<summary>Engineering Review · ${qs.length}문항${done ? ` · ${done}개 답함` : ''} — 이해 확인용 (별·점수와 무관)</summary><div class="rv">${qs.map((q, i) => {
      const pick = mine[i];
      return `<fieldset class="rv-q"><legend>${i + 1}. ${q.q}</legend>${q.o.map((o, j) => `<label class="rv-o ${pick != null && j === q.a ? 'ans' : ''} ${pick === j && j !== q.a ? 'wrong' : ''}"><input type="radio" name="rv-${id}-${i}" data-rv="${id}|${i}|${j}" ${pick === j ? 'checked' : ''}> <span>${o[0]}</span></label>`).join('')}${pick != null ? `<p class="rv-x ${pick === q.a ? 'st-PASS' : 'st-WARNING'}"><b>${pick === q.a ? '✓ 맞습니다.' : '✕ 다시 생각해 보세요.'}</b> ${q.o[pick][1]}${pick !== q.a ? ` <span class="note">정답: ${q.o[q.a][0]} — ${q.o[q.a][1]}</span>` : ''}</p>` : ''}</fieldset>`;
    }).join('')}</div>`;
  }
  function renderReview(id) {
    const box = $('#m-review'); if (!box) return;
    const h = reviewHTML(id); box.hidden = !h; if (h) { const open = box.open; box.innerHTML = h; box.open = open; }
  }
  function renderLabReview() {
    const box = $('#lab-review'); if (!box || !window.LABUI || !window.LABUI.isOpen()) return;
    const k = (window.LABUI.state().s || {}).cur | 0, h = reviewHTML('LAB:' + k);
    box.hidden = !h; if (h) { const open = box.open; box.innerHTML = h; box.open = open; }
  }
  document.addEventListener('change', (e) => {
    const r = e.target.closest('[data-rv]'); if (!r) return;
    const [id, i, j] = r.dataset.rv.split('|'), R = SH().review(); R[id] = R[id] || {}; R[id][+i] = +j; SH().save();
    if (id.startsWith('LAB:')) renderLabReview(); else renderReview(id);
    const fs = document.querySelector(`[name="rv-${id}-${i}"]`); const p = fs && fs.closest('fieldset'); const x = p && p.querySelector('.rv-x'); if (x) { x.tabIndex = -1; x.focus({ preventScroll: true }); }
  });

  /* ---------- first-run onboarding (after Stage 0; skip / replay) ---------- */
  const ONB = smqModal($('#onb-dlg'), { onClose: () => { ui().onboarded = 1; SH().saveUI(); renderPath(); } });
  let onbStep = 0;
  const OS = [
    { t: '무엇을 하는 프로그램인가요?', h: () => `<p>SPEC-to-MASK는 광소자 하나에서 1.6T 광엔진, 그리고 실제 GDS 레이아웃까지 <b>설계 결정을 직접 내리며</b> 배우는 학습 플랫폼입니다. 계산은 물리 기반 모델이고, 각 결과가 무엇에 근거하는지(해석식·근사·문헌값·가정·미검증)를 함께 보여 줍니다.</p><p>어디서 시작할까요? (언제든 바꿀 수 있고, 지도에서 아무 레벨이나 자유롭게 갈 수 있습니다)</p><div class="onb-paths">${Object.entries(PATHS).map(([k, p]) => `<button class="choice" data-opath="${k}" aria-pressed="${ui().path === k}"><div class="ttl">${k} · ${p.name}</div><div class="tag">${p.who}</div><div class="note" style="margin:0">${p.line}</div></button>`).join('')}<button class="choice" data-opath="" aria-pressed="${!ui().path}"><div class="ttl">자유 탐색</div><div class="tag">경로 없이 지도에서 고르기</div></button></div>` },
    { t: '손잡이를 움직이면', h: () => '<p>각 레벨의 <b>설계 파라미터</b>(데스크톱: 오른쪽, 휴대폰: 화면 아래) 슬라이더나 −/+ 버튼을 움직이면, 같은 물리 엔진이 즉시 다시 계산합니다.</p><ul><li><b>화면</b>: 소자 그림과 점수, 핵심 수치 타일</li><li><b>바꾼 것 → 결과</b>: 방금 바꾼 손잡이와, 미션 지표가 어떻게 움직였는지(이전 → 현재), 물리적 이유와 trade-off</li><li><b>코치</b>: 다음 한 수 제안 — 실제로 좋아지는지 계산한 뒤에만 제안합니다</li></ul>' },
    { t: '별과 Fab Run', h: () => '<ul><li>★ 기본 스펙 · ★★ 고성능 + 크기 · ★★★ <b>Fab Run 수율</b></li><li>Fab Run은 웨이퍼 공정 변동(폭·두께·다이 랜덤)을 뽑아 다이마다 판정하는 <b>Monte Carlo 추정</b>입니다. 시드가 기록되어 같은 설계·시드면 결과가 같고, 시드를 고정해 두 설계를 같은 웨이퍼로 비교할 수 있습니다.</li><li>Guided 학습 단계는 별·카드·Tape-out이 없는 연습입니다. 마지막 단계(Full Design)에서 겨룹니다.</li><li>비교 패널의 값은 점수에 들어가지 않습니다.</li></ul>' },
    { t: '가이드 · Design Lab · 저장', h: () => '<ul><li><b>원리 배우기 · Learning Guide</b>: 미션 카드 위 버튼. 원리·식·파라미터 표·모델 한계(F)를 봅니다. 결과 옆의 근거 표시(◆ ◇ ● △ ○)를 누르면 모델 한계로 갑니다.</li><li><b>Design Lab</b>(지도의 LAB): 1.6T Tx PIC을 회로도 → 배치 → 배선 → 전기 → 검증 → 내보내기. <b>Design Valid</b>(게임 모델 충족) · <b>Geometry Rechecked</b>(만든 GDS를 다시 읽어 검사) · <b>Foundry Readiness: NOT VERIFIED</b>(이 프로그램은 제조 준비를 검증하지 않음)를 구분합니다.</li><li><b>저장</b>: 진행 기록은 이 브라우저에만 있습니다. 머리글의 저장 표시를 눌러 <b>전체 백업</b>을 받아 두세요.</li></ul>' }
  ];
  function renderOnb() {
    const S = OS[onbStep];
    $('#onb-h').textContent = S.t; $('#onb-b').innerHTML = S.h();
    $('#onb-n').textContent = `${onbStep + 1} / ${OS.length}`;
    $('#onb-prev').disabled = onbStep === 0; $('#onb-next').textContent = onbStep === OS.length - 1 ? (ui().path ? `시작: ${stepLabel(PATHS[ui().path].steps.find((st) => !stepDone(st)) || PATHS[ui().path].steps[0])}` : '시작하기') : '다음 →';
  }
  function openOnb(k) { onbStep = k || 0; renderOnb(); ONB.open('#onb-next'); }
  $('#onb-dlg').addEventListener('click', (e) => {
    const p = e.target.closest('[data-opath]'); if (p) { ui().path = p.dataset.opath || null; SH().saveUI(); renderOnb(); return; }
    if (e.target.closest('#onb-prev')) { onbStep = Math.max(0, onbStep - 1); renderOnb(); return; }
    if (e.target.closest('#onb-next')) {
      if (onbStep < OS.length - 1) { onbStep++; renderOnb(); $('#onb-next').focus(); return; }
      ONB.close(); const P = PATHS[ui().path]; if (P) goStep(P.steps.find((st) => !stepDone(st)) || P.steps[0]);
    }
  });
  window.GAME_LEARN = { openOnb, renderPath, paths: PATHS, reviews: RV };
  SH().onLevel((id) => { renderPath(); renderReview(id); if (!window.SMQ_STUDIO && SH().plat() && !ui().onboarded && !SH().progress() && !ONB.isOpen() && $('#setup').hidden) openOnb(0); });   // first run only: existing players are not interrupted (replay: 처음 안내)
  if (window.LABUI && window.LABUI.onRender) window.LABUI.onRender(() => { renderPath(); renderLabReview(); });
  renderPath();
})();
