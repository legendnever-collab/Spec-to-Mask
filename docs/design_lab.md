# PIC Design Lab — 사용자 가이드 (Phase C · D · E)

캠페인 맵 오른쪽 끝 **Design Lab (Track A 후속) → LAB** 에서 들어갑니다. 1.6T DR8 송신(Tx) PIC를 회로도 → 평면 배치 → 광 배선 → 전기 인터페이스 → 검증 → 회로 데이터 내보내기 순서로 설계합니다. Lab은 별·카드·레벨 설계를 바꾸지 않고, 상태는 `localStorage['smq3-lab']`에 플랫폼별로 저장됩니다.

- 미리보기는 언제든 가능하고, 정식 **Project Completion**은 3A+ ★ 이후입니다(상단 진행 칩).
- 부품은 **내 카드**가 있으면 그 설계, 없으면 각 레벨의 기준 설계입니다(왼쪽 Design Library에 출처 표시). 링 반경, MMI 치수, 전극 길이, SSC 길이는 해당 레벨 엔진이 계산한 값 그대로입니다.
- Beginner는 핵심 결정만, Advanced는 다이 여유·레인 피치·엇갈림·광섬유 피치·굽힘 반경·팬 간격·패드 변·패드 피치까지 다룹니다.

## 화면

| 영역 | 내용 |
|---|---|
| 상단 | 진행 상태 칩: Schematic / Floorplan / Routing / Electrical / Verification Complete (모두 **지금 설계** 기준), 검증 3단계 **Design Valid** (게임 모델) · **Geometry Rechecked** (smq2gds 재검사 결과가 지금 설계와 일치, FAIL 0; v0.x의 "GDS Generated") · **Foundry Readiness: NOT VERIFIED**, 3A+ ★ 연계 · 미션 1–6 스테퍼(✓ 지금 유효, ! 이전 완료·지금 무효) · 미션 설명과 주 동작 버튼 · Engineering Review (M5·M6) |
| 왼쪽 Design Library | SSC(1-6) · 1×2 MMI(1-3) · TW-MZM(2-3) 또는 MRR(2-3R) · 히터(2-1) · PD 인터페이스(2-4) · 배선 도파로 · 광원 인터페이스. 누르면 해당 소자 강조 |
| 가운데 Workspace | Schematic(소자·포트·넷) / Physical Layout(다이, 소자, 도파로, 패드·범프, RF·DC 선, 실패 표시). 드래그 이동, Ctrl/⌘+휠·두 손가락 확대, ＋ − 맞춤 · 선택(선택 소자·진단 위치로), 보기 전용 레이어(광·전기·검사 표시 — GDS 무관) |
| 오른쪽 Mission · Inspector | 이 미션의 손잡이 · 선택한 소자의 출처·위치·크기·포트·연결·손실·DRC |
| 아래 결과 | 미션별 표: 회로 구성, 배치 지표, 넷별 배선 길이·손실, 레인별 전기 인터페이스, 검증표, 최종 요약 |

## 미션

| # | 미션 | 하는 일 | 완료 (엔진 판정) |
|---|---|---|---|
| 1 | 회로도 | 송신 아키텍처(DR8 MZM ×8 / DR8 MRR ×8 / **WDM8 공유 버스 링 ×8, 3W 설계**), 레이저 공유(DR8: 1:1–1:8 → 입력 수·MMI 트리 깊이), 모니터 탭+PD. 기본 회로 자동 생성 | 모든 광 포트가 정확히 한 번 연결, 8 레인이 입력까지 이어짐, 입·출력 수 일치, 포트 종류 일치 |
| 2 | Floorplan | 다이 W·H, (Adv) 가장자리 여유·레인 피치·RF 급전 통로(레인 엇갈림)·FAU 피치. 자동 배치 + "필요 크기로 맞춤" | 다이 경계·소자 겹침·패드(범프) 배치 PASS. 실패하면 Infeasible + 원인 + 필요한 크기 |
| 3 | Optical Routing | 배선 폭(긴 넷은 테이퍼로 넓힘), 원호/Euler, (Adv) R·팬 간격 | 모든 넷 배선, 간격 ≥ 규칙, R ≥ 규칙, 장애물 없음, 선폭. 실패 넷은 빨간 표시 + 이유 |
| 4 | Electrical Interface | 가장자리 와이어본드 패드 / 플립칩 마이크로범프, (Adv) RF 패드 변·패드 피치 | 모든 전기 포트 → 패드, RF(M1)·DC(M2) 금속이 다른 넷과 닿지 않음 |
| 5 | Verification | "검사 실행" | FAIL 없음 (WARNING·NOT VERIFIED 허용) |
| 6 | Export | smq-circuit/1 세 파일 내보내기 + 최종 요약 + GDS 재검사 결과 불러오기 + 기준 설계 고정·비교 | 지금 설계(design hash)를 내보냄 + 검증 FAIL 없음 (Geometry Rechecked는 별도 칩) |

## 상태: 이전 완료 · 지금 유효 · 내보내기 식별 (v1.0)

| 상태 | 저장 위치 (`smq3-lab[플랫폼]`) | 규칙 |
|---|---|---|
| 이전 완료 (학습 기록) | `done[미션]` | 한 번 충족하면 남음 — 지우지 않음 |
| 지금 유효 | `live[미션]` | 설계가 바뀔 때마다 엔진 검사로 다시 판정. 스테퍼 ✓/!, 칩, 지도 라벨(`미션 n/6 · 이전 m`)이 이것을 씀 |
| 검증 실행 | `ran = { hash, sig, at }` | 지금 design hash와 같고 **검사 결과(sig)도 같을 때만** 유효 — 시스템 검사는 3A+·3W 설계도 읽어 geometry hash만으로는 부족 |
| 내보내기 | `exported = { at, hash }` | 지금 design hash와 같을 때 유효 (같은 설계로 돌아오면 다시 유효) |
| GDS 재검사 | `gds.design_hash` | 같은 hash일 때만 반영 (Geometry Rechecked) |

v1 상태(`ran: true`, `exported: 시각`)는 식별 정보가 없어 처음 열 때 **stale**로 바뀌고(`v: 2`), 이전 완료 기록은 그대로입니다. 시험: `test/e2e/lab_state.js`.

## 진단 (v1.0)
검사 표의 FAIL/WARNING 행 → **위치 보기**: 그 검사가 이름을 대는 소자(텍스트의 인스턴스 id), 실패한 배선 넷, 측정된 최소 간격 지점만 강조하고 확대합니다. 좌표를 계산하지 않는 검사(RF/DC 금속 교차, 파워 버짓)는 관련 소자만 표시하고 임의의 지점을 찍지 않습니다. Inspector에 원인, 고칠 손잡이, 해당 미션으로 가는 버튼이 나옵니다.

GDS 생성·재검사는 `python -m smq2gds.circuit <플랫폼>_engine_layout.json -o out/` ([gds_export.md](gds_export.md)). 결과는 **구조 검증이 가능한 Engineering Prototype**이며 Tape-out Ready Mask가 아닙니다.

## WDM8 (Phase E)

Mission 1에서 **WDM8 · 공유 버스 링 ×8 (3W)** 를 고르면 입력 1 → Si 버스 하나의 링 8개(3W의 반경·간격·격자) → 출력 1인 회로가 만들어집니다. 레이저 공유·패드 변·레인 피치·엇갈림은 숨겨지고, Floorplan(Advanced)에 **링 간격**이 생기며(바꾸면 시스템 예측이 그 간격으로 3W 엔진을 다시 계산), 전기 인터페이스는 플립칩만입니다(S 범프 북쪽 2열 · G 범프 남쪽 2열 · 히터 16선 → 남쪽 범프 열 평면 팬아웃). 검증에 FSR 별칭·이웃 링 크로스토크·공진 배정/튜닝·링 간격·금속–버스 교차가 더해집니다. 물리와 한계: [wdm8.md](wdm8.md).

## 물리·형상 모델

| 항목 | 모델 | 분류 |
|---|---|---|
| 부품 성능 | 각 레벨 엔진 (SSC 1-6, MMI 1-3, TW-MZM 2-3, MRR 2-3R, 히터 2-1, Ge PD 2-4) | Physics-informed Surrogate |
| 배선 형상 | 직선, 90° 코너(원호 R / Euler 클로소이드 쌍, D-1 직사각형 나선과 같은 `cornerLocal`), 작은 오프셋은 원호 S-bend. Euler 발자국(1.87·R<sub>min</sub>)이 안 들어가면 원호 코너 | Analytical |
| 팬 (피치 변환) | 모일 때 안쪽부터, 퍼질 때 바깥부터 수직선을 놓아 교차 없음, 원호 S-bend는 x로 겹치지 않게 | Analytical |
| 전파 손실 | 측벽·상하면 산란 ∝ σ²(n₁²−n₂²)∂n<sub>eff</sub>/∂w (D-1 모델) — 좁은 Si strip이 훨씬 큼 | Physics-informed Surrogate |
| 굽힘 손실 | Marcuse 횡방향 슬랩 방사, 국소 곡률 적분. 규칙 R<sub>min</sub> = w<sub>0</sub>에서 90° 방사 < 0.005 dB | Physics-informed Surrogate |
| 테이퍼 | 선형, 길이 Si 15 + 20·Δw, SiN 40 + 40·Δw µm. 모드 변환 미계산 | Unverified Assumption |
| 모니터 탭 | 2 % 방향성 결합기, 길이 = asin(√0.02)/κ (결합 슬랩 κ) | Physics-informed Surrogate |
| MZM 전극 | CPW 신호 15 µm (2-3), 접지 50 µm(추상), 팔은 S–G 간격 중앙 | Unverified Assumption (형상) |
| 패드 / 범프 | 와이어본드 80 µm, 피치 100 µm (Adv 90–200) / 마이크로범프 30 µm, 피치 45 µm | Unverified Assumption |
| 금속 선 | RF 10 µm(M1), DC 5 µm(M2) 추상 선 — GDS에 같은 폭. DC는 한 층 평면 팬아웃(패드를 열 순서로, 트랙 10 µm 간격 중첩 배정, 열 간격 < 10 µm면 포트 높이 스텁) | Unverified Assumption (폭) · Analytical (평면성) |
| 링 버스 전이 | Si: w₀ → 버스 폭 선형 테이퍼. SiN 플랫폼(이종 Si 링): SiN w₀→0.3 / Si 0.15→버스 폭 공동 테이퍼 60 µm, 손실 미계산 | Unverified Assumption |
| RF 급전 손실 (MZM) | (0.35 + 3/g)·√f dB/cm, f = 56 GHz (2-3 CPW 도체 손실식) — 0.5 dB↑ WARNING, 1.5 dB↑ FAIL | Physics-informed Surrogate |
| 링 구동선 (MRR) | 집중 소자 조건: 길이 ≤ λ<sub>RF</sub>/10 = c/(f√ε<sub>eff</sub>)/10 ≈ 212 µm @56 GHz | Analytical (기준) |
| 시스템 예측 | 3A+ 엔진(같은 변조기·레이저 공유) 최악 레인 마진 − 레이아웃 배선 손실(최악 레인) | Physics-informed Surrogate |
| NOT VERIFIED | RF EM, 레인 간 열 크로스토크·링 락 상호작용, 파운드리 DRC. GDS 재검사는 smq2gds 결과를 불러오기 전까지 NOT VERIFIED | — |

## 배울 수 있는 것 (기준 부품, 자동 배치)

| 관찰 | 이유 |
|---|---|
| 좁은 Si 배선(0.36 µm, 1310)은 9 dB/cm — 수 mm 배선이 링크 마진을 다 먹음 | 측벽 산란 ∝ ∂n<sub>eff</sub>/∂w. 긴 넷을 1 µm로 넓히면 0.7 dB/cm (코치가 넓힌 폭의 결과를 계산해 제안) |
| TW-MZM DR8 다이 ≈ 5–8 mm 폭, MRR DR8(플립칩) ≈ 0.5–0.7 mm | 전극 길이(mm)와 RF 급전 통로(레인 엇갈림)가 MZM 다이를 키움 |
| 링 + 가장자리 패드 → "링 구동선 WARNING" | 링은 수 fF 집중 소자 — 구동선이 λ/10을 넘으면 반사·공진. 3D 플립칩 구동기(CPO)가 링과 짝을 이루는 이유 |
| 엇갈림 Δx = 0이면 RF 선 교차 FAIL | 같은 금속층의 RF 선은 평면이어야 함 — 각 레인 급전선이 위 레인 전극 앞을 지나도록 엇갈림 |
| 와이어본드 DC 패드 수가 변 길이를 정함 | 레인당 히터 2 + PD 2 패드 × 8 레인 × 100 µm |
| DC 패드 쪽 여백이 RF 쪽보다 넓음 | 32개 DC 선을 한 금속층에서 교차 없이 패드 열로 모으려면 트랙이 필요 — 트랙 수 × 10 µm |

## 테스트

| 명령 | 내용 |
|---|---|
| `node test/t_lab.js` | 4 플랫폼 × 5 아키텍처: 레인·입력·MMI 수, 연결성, 배선이 포트에서 정확히 시작·끝, 기본 도형 연속, 길이 = 샘플 길이, R ≥ 설정, 양 끝 포트 폭, 간격·경계·겹침·장애물, 패드 매핑, RF 평면성, 시스템 마진, 내보내기, Infeasible·R 위반·엇갈림 0, 넓은 배선, 링 플립칩, 결정성 |
| `node test/e2e/lab.js <플랫폼>` | 맵 진입, 미션 이동, 레이저 공유 → 트리, Infeasible + 맞춤, 배선 표·코치, 전기, 검증 실행 전/후, 내보내기, 가이드 A–G, MRR 플립칩, 캠페인 복귀, 별·카드·설계 불변 |
| `npm run test:lab` | 위 둘 (si1310, sin1550) |
| `npm run test:py` | GDS 백엔드: 8개 예제 GDS 생성·재검사 FAIL 0, 면적 = ∫w ds, 부정 테스트 5종 ([gds_export.md](gds_export.md)) |

## 예제

`tools/smq2gds/examples/circuit/` — 4 플랫폼 × {MZM DR8 (1:1, 가장자리 패드), MRR DR8 (1:1, 플립칩)}의 `engine_schematic.json`, `engine_layout.json`, `engine_verification.json` (`node tools/export_circuit.js all`, 같은 엔진). 이 입력으로 만든 GDS·미리보기·재검사 결과: [docs/gds/](gds/) (si1310·sin1550).

## 한계

- 광 I/O는 입력 서쪽 · 출력 동쪽만 (같은 변 U-turn 배선은 아직 없음).
- WDM8: 링별 락 모니터(드롭 포트 PD)는 그리지 않음(NOT VERIFIED), 전기는 플립칩만, 다파장 광원은 칩 밖.
- 전기 배선은 추상 선(RF M1 10 µm, DC M2 5 µm): 같은 층 접촉만 검사. 비아·CPW 접지 연속성·RF 전자기 없음, 금속–도파로 교차의 광 손실 미계산.
- 레인 간 열 크로스토크·락 상호작용, RF 전자기, 파운드리 규칙은 계산하지 않음 (NOT VERIFIED).
- 수동 배치는 레인 피치·엇갈림·다이 크기 같은 제한된 조정만 (블록 끌어 놓기 없음).
- GDS는 브라우저 밖(tools/smq2gds)에서 만들고, 결과 파일을 불러와 반영합니다. Tape-out Ready 아님(Generic PDK, 주석 층).
