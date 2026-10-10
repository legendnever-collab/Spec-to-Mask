# 검증 · 회귀 보고서 — Phase A–E 와 사용성 정리

> v1.0 사내 교육 릴리스의 보고서는 [docs/release/VERIFICATION_REPORT-v1.0.md](release/VERIFICATION_REPORT-v1.0.md)입니다. 이 문서는 v0.x(Phase A–E) 기록입니다.

마스터 지시서 §15·§16(산출물 10)에 대응하는 종합 보고서입니다. 각 Phase의 상세 검증은 해당 문서에 있고, 여기에는 무엇을 어떤 시험이 지키는지와 현재 결과, 남은 항목을 모읍니다.

## 1. Phase별 산출물과 지키는 시험

| Phase | 병합 | 무엇 | 상세 문서 | 지키는 시험 |
|---|---|---|---|---|
| A · MRR 학습 | PR #2 (fa9f16a) | 2-3R 링 변조기(Guided 5단계 + Full), MZM 비교, 링 PCell | docs/mrr_physics.md | `npm run test:mrr` (반경↔FSR, 결합↔Q, 디튜닝↔투과, 온도↔공진, 광자 수명/RC 한계, 정적/동적 OMA), `test:flow`, `test:py`(check_ring) |
| B · 1.6T 아키텍처 | PR #3 (1ed8ad6) | 3A+ 변조기 선택 MZM ×8 / MRR ×8, 링 레인 열·락·전력 | docs/arch_1p6t_dr8.md | `npm run test:dr8` (MZM 경로 fa9f16a와 비트 동일, 8레인 용량, 레이저 공유, 열 예산, 링크 마진, 비교) |
| C · PIC Design Lab | PR #4 (8a36877) | 회로도 → 평면 배치 → 광 배선 → 전기 I/F → 검증 → smq-circuit/1 | docs/design_lab.md, docs/circuit_schema.md | `npm run test:lab` (t_lab 440 + e2e 2플랫폼: 배치·포트 연결·배선 생성·최소 굽힘·간격·다이 경계·Infeasible 처리) |
| D · GDS 내보내기 | PR #5 (ad7188f) | smq-circuit/1 → 계층 GDS, 미리보기, GDS 재검사 | docs/gds_export.md | `npm run test:py` (test_circuit: GDS 생성·재읽기·계층 셀·포트 위치·광 형상 일치·레인 수·연결성, 음성 시험 6종) |
| E · Advanced WDM | PR #6 (2ee55e0) | 3W 링 WDM8, Lab WDM8, WDM GDS | docs/wdm8.md | `npm run test:wdm` (80), test_circuit WDM 예제·음성 시험 |
| 사용성 정리 | 이 PR | 화면 배치·조작 동선(아래 §4) | README "화면 구성과 조작" | 아래 §2 전체 + 데스크톱/휴대폰 화면 캡처 확인 |

게임 화면의 레이아웃 미리보기와 GDS는 같은 기본 도형(L/C/A)과 같은 `design_hash`를 씁니다. GDS가 열리는 것만으로 PASS가 아니며, 재검사 결과는 해시가 같을 때만 반영합니다.

## 2. 현재 회귀 결과 (main 2ee55e0 + 사용성 브랜치)

| 시험 | 결과 |
|---|---|
| `npm run build` | BUILD OK (단일 HTML, 외부 스크립트 없음) |
| `npm run test:smoke` (4플랫폼) | 오류 0 |
| `npm run test:flow` (4플랫폼) | 통과 |
| `npm run test:guide` (si1310, sin1550) | 통과 (C 표 누락 행 없음) |
| `npm run test:upgrade` | 356/356 |
| `npm run test:migrate` | 통과 (smq2 → smq3 진행 기록·카드 유지) |
| `npm run test:mrr` / `test:dr8` / `test:wdm` | 181/181 · 80/80 · 80/80 |
| `npm run test:lab` | t_lab 440/440, e2e 통과 |
| `npm run test:py` | test_smq2gds OK, test_circuit OK (예제 12개) |
| `npm run test:bot` (21레벨, si1310, 표준·수치 힌트) | 모든 레벨 ★★ 이상 |
| `node test/e2e/bot.js std 2 3W <플랫폼>` | 4플랫폼 ★★★ |

## 3. 지시서 대비 남은 항목과 의도적 차이

| 항목 | 상태 | 설명 |
|---|---|---|
| Mission 3 "gdsfactory Routing 우선 활용" | 의도적 차이 | 브라우저 미리보기와 GDS가 같은 형상이어야 하므로 배선을 게임 엔진의 기본 도형(직선·원호·Euler 코너·테이퍼)으로 만들고 smq2gds가 같은 도형을 그립니다. gdsfactory는 PCell·계층·GDS 쓰기·재읽기에 씁니다. |
| Foundry PDK·RF 규칙 | NOT VERIFIED | Generic PDK, 금속은 RF(M1)·DC(M2) 추상 선. RF 전자기, 레인 간 열 크로스토크, 파운드리 DRC는 검사하지 않음 |
| 링 락 동역학 | NOT VERIFIED | 3A+ MRR·3W 모두 정적 락(온도마다 최적 배정). 재락 중 링크 중단·락 루프 상호작용 없음 |
| Lab WDM8 링별 모니터 | NOT VERIFIED | 드롭 포트 모니터 PD 미배치 |
| 3D 열해석 | 미구현 | 링 열 효율·열 결합은 2D 단면 기반(상한/낙관) |
| Rx PIC 레이아웃 | 범위 밖 | Design Lab은 지시서대로 Tx PIC. Rx는 시스템 모델(감도·Demux)로만 |
| 휴대폰에서 Lab 레이아웃 | 사용성 한계 | 6 × 3 mm 다이를 400 px 폭에 맞추면 세부가 작음 — 확대·드래그로 봄 |

Tape-out 준비 상태가 아닙니다. 결과는 구조 검증이 가능한 Engineering Prototype입니다.

## 4. 사용성 정리 (이 PR)

데스크톱 1280 × 800과 휴대폰 400 × 860에서 Stage 0, 1-1, 1-3, 1-7, 2-3, 2-3R, 2-5, 3A+, 3W, D-1, B-3, Lab 미션 1–6, 학습 가이드를 캡처해 검토했습니다.

| 문제 | 영향 | 고침 |
|---|---|---|
| CSS `display`가 `hidden` 속성을 덮어씀 | `dist/index.html`을 직접 열면 Lab을 열어도 레벨 화면이 남고, 레벨 화면 아래에 빈 Lab이 보임 | 전역 `[hidden]{display:none!important}` |
| 데스크톱에서 손잡이(오른쪽 위)와 화면(왼쪽 아래)이 한 화면에 안 들어옴 | 슬라이더를 움직이며 결과를 볼 수 없음 | 파라미터 카드를 sticky로 (화면 높이 안에서 스크롤) |
| 휴대폰에서 화면이 손잡이 위로 스크롤되어 사라짐 | 조작 중 점수·별을 못 봄 | 하단 상태 바(점수·별/목표·코치 제목·DRC, 누르면 화면으로) |
| 모델 범위가 페이지 끝의 한 문단(휴대폰에서 화면 3장 분량) | 페이지가 길고 읽기 어려움 | 접는 섹션 + 절별 문단 |
| 부품 카드 21장이 매 레벨 아래에 펼쳐짐 | 휴대폰 페이지 길이의 1/4 | 접는 섹션, 요약에 보유 수·최근 카드 |
| Guided 단계에서도 Fab·AI·DB 카드가 보임(쓸 수 없음) | 혼란 | 단계 중에는 숨기고 Full Design에서 보임 |
| ★ 달성 뒤 다음 레벨로 가는 버튼이 없음 | 지도에서 찾아야 함 | 목표 아래 **다음 레벨 →**(Stage가 바뀌면 표시), 3A+·3W는 Design Lab 바로가기 |
| 코치가 "Tape-out 해보세요"라고만 함 | Fab 카드를 찾아 스크롤 | 코치에 "Fab Run으로 ↓" 버튼 |
| 머리글이 항상 "Track A · SOI 220 nm · O-band" | SiN·1550·Track B·Lab에서 틀림 | 트랙·플랫폼·Lab에 따라 바뀜 |
| 지도에서 현재 레벨이 보이지 않을 수 있음, 마우스로 가로 스크롤 불편 | 길 찾기 | 현재 노드 자동 맞춤, 마우스 환경 ◀ ▶ |
| Lab 미션 5·6의 주 동작 버튼이 오른쪽 Inspector에만 | 미션 설명을 읽고 버튼을 찾아야 함 | 미션 설명 아래에도 같은 버튼, 검사 뒤 결과 표로 스크롤 |
| Lab Library가 길어 Workspace 아래가 비어 보임 | 스크롤 낭비 | 데스크톱에서 목록을 화면 높이 안에서 스크롤, 캔버스 높이 확대 |
| 링 Step 1 캔버스 숫자 겹침(휴대폰) | 읽기 어려움 | 폭에 맞춰 글자 축소, 그래도 넘치면 값을 다음 줄로 |
| 한글 제목이 음절 단위로 줄바꿈 | 가독성 | `word-break:keep-all` |
| 파라미터 카드의 힌트 설명이 MMI 전용 문구(L<sub>π</sub>, L·s) | 다른 레벨에서 틀림 | 일반 문구로 |

물리 엔진·점수·스펙·내보내기 형식은 바꾸지 않았습니다(`test:upgrade`, `test:dr8`, `test:wdm`, `test:py` 그대로 통과).

캡처: `docs/ux/desktop_sticky_params.png`(3W — 화면과 손잡이 7개가 한 화면에), `docs/ux/desktop_next_level.png`(★ 뒤 다음 레벨), `docs/ux/mobile_status_bar.png`(휴대폰 하단 상태 바, 긴 선택값 줄바꿈), `docs/ux/lab_mission5.png`(미션 설명 아래 검사 실행), `docs/ux/before_lab_hidden_bug.png`(고치기 전: `dist/index.html`을 직접 열면 Lab과 레벨 화면이 함께 보임).
