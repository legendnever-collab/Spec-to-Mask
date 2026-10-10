# SPEC-to-MASK Quest

Photonic IC 설계를 게임으로 배우는 단계별 학습 프로그램입니다. 브라우저 하나로 동작하는 단일 HTML(`dist/index.html`)로 빌드됩니다.

## 학습 흐름

| 단계 | 내용 |
|---|---|
| Stage 0 · 플랫폼 | 파장(1310 O-band / 1550 C-band) → 코어 물질(Si 220 nm / SiN 400 nm, SiO₂ 클래딩) 선택. 진행 기록·부품 카드는 플랫폼별로 저장 |
| Stage 1 · Passive | 1-1 도파로(TE/TM, 단일/멀티모드) → 1-2 방향성 결합기 → 1-3~1-5 MMI(1×2, 광대역, 2×2) → 1-6 Spot-Size Converter → 1-7 CWDM Demux (Stage 1 피날레 · Active 맛보기) |
| Stage 2 · Active | 2-1 TO 위상기(★★★ = 1-7 CWDM 다이별 히터 트리밍) → 2-2 PN 공핍 위상기 → 2-3 224G TW-MZM(112 GBd PAM4 눈) → 2-3R 링 변조기(Guided 5단계, MZM과 같은 조건 비교) → 2-4 Ge PD + TIA → 2-5 외부 광원과 링크 버짓(Stage 2 피날레, 부품 카드로 링크 구성) |
| Stage 3 · System | 3A 1.6T 2×FR4(8×200G, CWDM4 × 2 그룹, 0–70 °C 코너, ★★★ = 다이별 Demux 트리밍 + 산포 수율) → 3A+ 1.6T DR8 / LPO / CPO(비트당 에너지, 변조기 MZM ×8 / 링 ×8 선택). 손잡이는 아키텍처: 레이저 수·출력·냉각, Mux 열 추적, DSP·패키징. Stage 1·2 부품 카드(또는 각 레벨 기준 설계)로 조립 |
| Track B 준비 · 긴 지연선 | D-1 저손실 지연 나선(2 ns; 넓힌 아르키메데스 나선 + 테이퍼 Euler S-bend, Hong et al., Photon. Res. 10, 1 (2022)) → D-2 N-bit 스위치형 실시간 지연선(0–5 ns, 10 ps; Hong 2022의 10-bit 칩, Xie et al., Opto-Electron. Adv. 6, 220030 (2023)의 2 µm 암 MZ 스위치). 같은 지연을 Si와 SiN에서 비교 |
| Stage 3 · System (Track B) | 스위치 기반 FMCW LiDAR: B-1 처프 + 칩 위 기준 간섭계(D-1 나선; 선폭·비선형·데드타임·온도 보정) → B-2 초점면 스위치 어레이(1×N MZ 트리 + 그레이팅 방출기 + 렌즈; FOV·분해능·커버리지·유령 빔) → B-3 시스템 캡스톤(코히어런트 링크 버짓, 반사율 10% 최대 거리·점 속도·전력) |

각 레벨은 ★ 기본 스펙 / ★★ 고성능+크기 / ★★★ Fab Run 수율의 세 목표, 코치 힌트 4단계(끄기·방향·수치·지형도), 난이도 3단계(입문·표준·도전), AI 라이벌(Nelder–Mead), Design DB(사람·AI 탐색 기록, CSV 복사)를 가집니다.

### 학습 가이드 (모든 레벨)

미션 패널의 **원리 배우기 · Learning Guide** 버튼이 레벨별 모달을 엽니다 (오프라인, 키보드·스크린리더, 모바일 전체 화면). 기본/심화(Deep Dive) 두 깊이.

| 절 | 내용 |
|---|---|
| A 학습 목표 | 레벨에서 익힐 것 |
| B 동작 원리 | 소자 개략도(SVG)와 핵심 식 |
| C 파라미터 표 | 지금 화면의 **실제 파라미터 목록**에서 만든 표 — 이름·기호·단위·의미·↑/↓ 효과·Trade-off·관련 식·범위 |
| D 상호작용 예제 | 게임 엔진 그대로: 변수 하나를 움직이면 같은 kind의 `evaluate`로 타일과 25점 스윕 곡선 (CWDM·MMI·나선은 전용 예제). 현재 설계와 점수는 바뀌지 않음 |
| E 미션 연결 | 이 레벨의 목표가 어떤 물리량과 이어지는지 (정답 값은 주지 않음) |
| F 모델 한계 | 해석식 / 반경험식 / 사전계산 테이블 / 경험식 / 가정 / 게임 밖 솔버 필요 6분류 배지 |
| G 참고 문헌 | 출처 링크 (DOI·제조사 문서·교재) |

코치(지금 무엇을 바꿀지)·힌트(수치 제안)와 달리 가이드는 "왜 그런가"를 설명하고 설계를 건드리지 않습니다.

### 1-7 CWDM Guided 학습

1-7은 **Guided 학습 / Full Design** 두 모드를 가집니다. 처음 오는 플레이어는 Guided, 이미 별이나 카드가 있는 플레이어는 Full Design에서 시작하며 언제든 바꾸거나 단계 번호로 건너뛸 수 있습니다.

| 단계 | 다루는 변수 | 완료 조건 (엔진 계산) |
|---|---|---|
| 1 단일 2×2 MZI | ΔL, 위상 φ (연습용, 설계에 쓰지 않음) | FSR 40 ± 2 nm, λ_A → Bar ≥ 95 %, λ_B → Cross ≥ 95 % |
| 2 F1 인터리버 | ΔL₁, φ₁ (1차 고정) | FSR 40 nm, CH1+CH3 / CH2+CH4 분리 ≥ 95 % |
| 3 F2A / F2B | ΔL₂, φ₂ₐ, φ₂ᵦ | FSR 80 nm, 네 채널 → 네 포트, 출력 전력의 ≥ 95 % |
| 4 고차 Lattice | 차수 1/2/3, 트림 | 세 차수 응답을 모두 비교 + ★ XT·IL |
| 5 Full Design | 전체 | 원래 1-7 (★·★★·★★★ Fab Run) |

2–4단계의 값은 실제 1-7 설계에 기록됩니다. 단계 중에는 별·카드·AI·Tape-out이 없습니다. 스펙트럼 축은 플랫폼 밴드(O/C)를 따르며, 각 단계 화면은 MZI 개략도·팔 위상·Bar/Cross 막대·FSR 표시·공정 코너(CD +8 nm, 두께 +Δt/2) 점선을 보여 줍니다. 위상 트림 φ는 설계 단계의 이상적 위상 오프셋이고, 실제 칩에서는 2-1의 TO 히터가 다이별로 이를 맞춥니다.

### 2-3R 링 변조기 (Microring Modulator — Resonance to 200G PAM4)

2-3 바로 뒤의 새 레벨(기존 ID 재번호 없음). 2-2 PN 접합 모델과 2-1 히터 단면을 그대로 써서 all-pass 링 변조기를 설계합니다. 처음 오는 플레이어는 Guided, 별·카드가 있으면 Full Design.

| 단계 | 다루는 변수 | 완료 조건 (엔진 계산) |
|---|---|---|
| 1 공진 · FSR | 반경 R | FSR이 목표 ±0.5 nm (FSR = λ²/(n<sub>g</sub>·2πR)) |
| 2 결합 · Q | 간격 g | Under / Critical / Over 세 영역 관찰 + 공진 골 ≥ 15 dB |
| 3 EO 변조 (DC) | 바이어스, 도핑, 디튜닝 | 공진 이동(pm/V)과 정적 ER·OMA — 고속 성능과 구분 |
| 4 200G PAM4 | g, V<sub>pp</sub>, 디튜닝, 바이어스, 도핑 | 112 GBd PAM4(224 Gb/s 라인) 눈 페널티·OMA, 광자 수명 × RC 응답 |
| 5 온도 · 히터 | 온도, 히터, 레이저 파장 (단계 로컬) | 차가움 / 중간 / 뜨거움에서 히터로 동작 복구 |
| 6 Full Design | 전체 + 공진 배치 여유 | ★ 기본 / ★★ 페널티·OMA·히터 예산·열 안정(빨강 쪽 자기 가열 금지) / ★★★ Fab 수율 |

- 레이아웃: 설정 반경 → 1 nm 격자에서 차수 m의 공진을 설계 파장(히터 여유 포함)에 맞춘 **레이아웃 반경**. 내보내기·GDS는 이 반경을 그립니다.
- MZM vs MRR 비교 패널: ★ 또는 2-3R 카드가 있으면 열림. 같은 112 GBd PAM4, 13 dBm 입력, 0–70 °C, 2-3 ★★ 링크 요구에서 광 대역·EO 대역·면적·IL·OMA·페널티·구동/열 에너지·비트당 에너지·수율을 항목별로 비교(점수 미반영, 충실도 배지 표시).
- 물리·식·문헌 비교: [docs/mrr_physics.md](docs/mrr_physics.md). 설계 방향 검토와 단계 계획: [docs/design_review_mrr_designlab.md](docs/design_review_mrr_designlab.md).

### 3A+ DR8 변조기 선택 (MZM ×8 / MRR ×8)

3A+에 **변조기 (레인당)** 손잡이가 있습니다(기본 MZM). 링을 고르면 레인마다 2-3R 링(카드 또는 기준 설계)을 모듈의 실제 변조기 입력 파워에서 다시 계산하고, 레인별 히터가 공진을 설계 디튜닝에 잡아 둡니다. 히터는 0–70 °C에서 링 드리프트 − 레이저 드리프트(비냉각 DFB는 같은 방향으로 움직임, TEC면 0)를 FSR 안에서 따라가고, 자기 가열 루프 이득 ≥ 1이면 링크가 닫히지 않습니다. 같은 아키텍처에서 두 변조기를 나란히 보여 주는 비교 패널이 있습니다(점수 미반영).

- 스펙은 MZM 기준 그대로이고, `mod` 키 없는 기존 설계는 MZM으로 열립니다. MZM·2×FR4 결과는 이전과 비트 단위로 같습니다.
- 3A(2×FR4)는 MZM만 — 링 Tx는 WDM 링 다중화(공진 배정·크로스토크)가 필요한 별도 아키텍처(Phase E)입니다.
- 모델·가정·결과·열 효율 민감도: [docs/arch_1p6t_dr8.md](docs/arch_1p6t_dr8.md).

### PIC Design Lab (Track A 후속)

캠페인 맵의 **LAB** 노드. 1.6T DR8 Tx PIC를 회로도 → Floorplan → 광 배선 → 전기 인터페이스 → 검증 → 회로 데이터 내보내기(smq-circuit/1) 여섯 미션으로 설계합니다. 부품은 카드(없으면 기준 설계)에서, 배선 형상은 직선·원호/Euler 코너·S-bend 기본 도형으로, 손실은 D-1 산란·굽힘 모델로 계산하고, 3A+ 엔진의 링크 예측에 레이아웃 손실을 더해 비교합니다. 진행은 점수가 아니라 상태(Schematic / Floorplan / Routing / Verification Complete, GDS Generated)로 표시하고, 별·카드·레벨 설계는 건드리지 않습니다(`smq3-lab`). GDS는 `tools/smq2gds/circuit.py`가 같은 기본 도형으로 그리고 KLayout으로 다시 읽어 검사하며(연결·포트·길이·간격·선폭·금속 단락), 그 결과를 Mission 6에서 불러오면 GDS Generated가 됩니다.
- 사용법·모델·한계: [docs/design_lab.md](docs/design_lab.md) · 데이터 형식: [docs/circuit_schema.md](docs/circuit_schema.md) · GDS 내보내기: [docs/gds_export.md](docs/gds_export.md) · 예제 GDS: [docs/gds/](docs/gds/)

### D-1 직사각형 나선

D-1 `레이아웃` 파라미터: 원형 이중 나선(Legacy, 기존과 같은 결과) / 직사각형 나선 · 원호 코너 / 직사각형 나선 · Euler 코너.

- 경계 먼저: 프리셋 5×5, 5×15, 10×30 mm 또는 사용자 W×H, 경계 여유, 포트 변(짧은 변 / E–W / S–N). 10×30과 30×10(짧은 변 포트)은 회전만 다른 같은 레이아웃입니다.
- 목표: **Mode A** 목표 지연 τ → 경로 길이 L = cτ/n_g를 정확히 맞추는 가장 적은 회전 수(가장 큰 반경); **Mode B** 손실 예산 IL<sub>max</sub> 안에서 경계가 담을 수 있는 최대 지연(손실·면적 중 먼저 걸리는 쪽 표시). Mode B와 목표 τ를 바꾼 Mode A는 별·카드·AI 없는 탐색 모드입니다.
- 생성기: 직선은 경계 변과 평행, 두 팔은 점대칭으로 피치 p = W<sub>m</sub> + W<sub>gap</sub>로 맞물리고, 중앙은 원호 S-bend(곡률 반전) 또는 Euler U-turn 두 개(곡률 연속)입니다. 들어가지 않으면 **Infeasible**과 이유·대안을 보여 주고 배치를 그리지 않습니다.
- 물리는 형상에서: 직선·코너·S-bend 길이, 국소 반경의 굽힘 방사, 곡률 점프마다 접합 모드 변환(원호 코너), 이웃 간격 결합, 테이퍼.
- 뷰어: 경계·여유선·경로·포트·bbox·mm 눈금, 확대/맞춤/이동(버튼, Ctrl+휠, 드래그), 길이·지연·점유율·IL·최소 간격·최소 반경·DRC 타일.
- 내보내기: `geometry.pcell = "spiral_rect"`(armA 프리미티브, 경계, 변환, 포트) → `tools/smq2gds`가 같은 프리미티브로 GDS를 다시 그리고 테스트가 길이·bbox·포트·S-bend R<sub>min</sub>·DRC를 게임 예측과 대조합니다.

## 게임 밖으로: 설계 → GDS → 솔버

모든 레벨의 **설계 내보내기 (JSON)** 버튼이 `smq-design/1` 파일을 줍니다.
- 파일 내용: 플랫폼, 파라미터, 게임 예측값, 목표 달성 여부, (MMI·지연 나선·링 변조기는) 레이아웃 형상. 링(`ring_allpass`)은 링·버스·결합 간격·포트를 실제 형상으로, 리브 슬랩·P/N 주입·히터·패드는 주석 레이어로 그립니다(파운드리 규칙 아님).
- `tools/smq2gds`가 이 파일을 다음으로 바꿉니다 (자세한 내용은 [tools/smq2gds/README.md](tools/smq2gds/README.md)).
  - GDS (gdsfactory, 레이어 맵 교체 가능)
  - 로컬 모드 솔버·3D EME 검사
  - MEEP FDTD 스크립트
- 각 레벨 참조 설계의 검증 결과(`src/data/validation.json`)는 게임의 "오프라인 솔버 검증" 패널에 게임 예측과 나란히 표시됩니다.

## 빠른 시작

```sh
npm install            # jsdom (e2e 테스트용)
npm run build          # src → dist/index.html
open dist/index.html
```

## 구조

```
src/
  head.html          마크업·스타일
  util.js            수치 유틸 (Nelder–Mead, 웨이퍼 공정 변동 모델, 보간)
  ui_util.js         캔버스·SVG 차트 헬퍼
  engine_mmi.js      MMI 엔진: 유효굴절률법 + 유한차분 고유모드 전개 (Si/SiN)
  platforms.js       Stage 0 플랫폼 정의 (λ × 물질, DRC 규칙, CWDM 채널) + 선택 화면 설명
  kinds/             레벨 종류별 물리·시각화·코치: wg, dc, mmi, ssc, cwdm (Stage 1) · to, pn, mzm, mrr, pd, els (Stage 2) · xcvr (Stage 3) · spiral, ttd (긴 지연선) · chirp, fpsa, lidar (Track B)
  levels.js          캠페인 텍스트·개념 노트 (수치 스펙은 data/pspec.js)
  shell.js           범용 게임 셸: 플랫폼, 점수, 목표·미션, 코치, Fab Run, AI 라이벌, Design DB, 부품 카드, Guided 단계·연습 모드
  guide.js           레벨별 학습 가이드 모달 (A–G, 상호작용 예제는 kind 엔진 사용) · openCustom (Design Lab 미션 가이드)
  lab/engine.js      PIC Design Lab 엔진 (LAB): 부품 조립, 배치, 배선 기본 도형, 전기 인터페이스, 검사, smq-circuit/1 내보내기
  lab/ui.js          PIC Design Lab 화면 (LABUI): 라이브러리 · 회로도/레이아웃 · 미션·인스펙터 · 결과표
  data/
    wg_*.json        도파로 TE/TM 모드 테이블 (폭·두께·파장)
    dc_*.json        방향성 결합기 짝/홀 슈퍼모드 테이블 (갭·폭·두께·파장)
    ssc_*.json       SSC 팁 모드·광섬유 overlap 테이블 (ssc_table.json = Si 1310)
    thermal.json     TO 히터 단면 열해석 테이블 (tools/gen_thermal.py)
    pspec.json       플랫폼별 레벨 스펙 (tools/calibrate.js 생성)
    tables.js, pspec.js   위 JSON을 묶은 빌드 입력 (tools/build_data.py 생성)
tools/
  modes2.py          semi-vectorial 2D 유한차분 모드 솔버 (quasi-TE Ex / quasi-TM Ey, 대칭 격자)
  gen_wg.py, gen_dc.py, gen_ssc2.py   플랫폼별 테이블 생성 (python3 tools/gen_wg.py si1310 등)
  modes2d.py, gen_tables.py           Si 1310 SSC 테이블을 만든 초기 솔버 (재현용)
  lattice.py         CWDM lattice 커플러 값 최적화
  calibrate.js       플랫폼별 레벨 스펙·출발점·난이도별 수율 목표 자동 보정 (node tools/calibrate.js [플랫폼|all] [1,2])
  calibrate_s2.js    Stage 2 스펙 블록 (도전 난이도에서도 ★★ 도달 가능하도록 자동 완화)
  calibrate_s4.js    긴 지연선 스펙 블록 (D-1, D-2)
  calibrate_s5.js    Track B 스펙 블록 (B-1, B-2, B-3)
  export_circuit.js  Design Lab 예제 smq-circuit/1 (MZM DR8 · MRR DR8 × 4 플랫폼) → smq2gds/examples/circuit
  calibrate_s3.js    Stage 3 스펙 블록 (기준 부품으로 아키텍처 전수 탐색 → 전력 예산·마진 목표)
  gen_thermal.py     히터 단면 2D 유한체적 열해석 (Si/SiN × 간격 × 격리)
  build_data.py      data/*.json → tables.js, pspec.js
  build.sh           단일 HTML 빌드
  smq2gds/           설계 JSON → GDS(gdsfactory PCell) · 모드/EME 검사 · MEEP 스크립트 · 참조 설계 검증 (python -m smq2gds)
                     circuit.py: Design Lab smq-circuit/1 → 계층 GDS + 미리보기 + 재검사 (python -m smq2gds.circuit)
test/
  load.js            node VM에서 엔진·kind 로드
  t_*.js             레벨 난이도·수율 탐색 스크립트
  e2e/smoke.js       jsdom: 플랫폼 선택 → Stage 1·2 전 레벨 렌더 확인 (node test/e2e/smoke.js <플랫폼> [레벨들])
  e2e/bot.js         jsdom: 코치 문장만 따라가 각 레벨을 클리어하는 봇 (회귀 테스트)
  e2e/migrate.js     이전 버전 진행 기록 이전 확인
  e2e/export.js      jsdom: 참조 설계로 "설계 내보내기" → tools/smq2gds/examples/*.json
  e2e/guide.js       jsdom: 모든 레벨 학습 가이드 (절 A–G, 파라미터 행, 예제, 포커스 복원, 설계·점수 불변)
  e2e/flow.js        jsdom: 1-7 Guided 흐름(단계·건너뛰기·값 기록·별 없음·밴드 축) + D-1 직사각형(프리셋·Infeasible·spiral_rect 내보내기)
  e2e/flow.js (2-3R) Guided 기본·1단계 R → 설계 기록·별 없음·Full Design·비교 패널·내보내기 반경 = 레이아웃 반경
  t_lab.js           Design Lab 엔진: 연결성·포트 일치·기본 도형 연속·길이·R·간격·경계·Infeasible·RF/DC 평면성·플립칩·내보내기·1 nm 격자·GDS 재검사 불러오기 (npm run test:lab)
  e2e/lab.js         jsdom: 맵 진입 → 6 미션 → 검증 → 내보내기 → 가이드 → 복귀, 캠페인 불변
  t_dr8.js           3A+ DR8 변조기 선택: MZM 결과 비트 동일·스펙 불변, 링 = 2-3R 엔진(모듈 입력 파워), 히터(TEC/비냉각), 공정 감도, 열 폭주, 드라이버 (npm run test:dr8)
  t_mrr.js           링 엔진: 반경↔FSR, 공진 조건, Q 관계, Critical coupling, Airy↔Lorentz, 최대 기울기 1/√3, dλ/dT, P_2π, 레이아웃 배치, Q≠대역폭, 정적/동적 OMA, 열 안정 부호, 공정 이동, SiN 이종, 단계 완료, 기존 스펙 불변 (npm run test:mrr)
  t_upgrade.js       엔진: MZI 식·FSR·위상 이동·단계 완료·Lattice 차수 / 직사각형 나선 길이 = cτ/n_g·경계·회전·Mode B·Legacy 동일성
  py/test_smq2gds.py 예제 전부 GDS 생성 + 연결성·폭·간격 DRC·길이·포트 위치 (솔버 없이; spiral_rect는 bbox ⊂ 경계−여유, 포트, S-bend R<sub>min</sub>; ring_allpass는 링 반경·간격 1 nm, 링+버스 2조각, 포트, 히터가 버스 위에 없음, 주석 레이어)
  py/test_circuit.py 회로 GDS: 8개 예제 재검사 FAIL 0, 경로 면적 = ∫w ds, hash·sha1, 부정 테스트(끝점·삭제·이동·RF 단락·입력 불일치)
```

## 데이터 재생성 순서

```sh
python3 tools/gen_wg.py si1310        # 플랫폼별 (si1310 si1550 sin1310 sin1550), 각 2–5분
python3 tools/gen_dc.py si1310 0.36   # 두 번째 인자 = 표준 단일모드 폭 (tools/w0.json)
python3 tools/gen_ssc2.py si1550 0.46
npm run tables && npm run calibrate && npm run build
node test/e2e/export.js all                               # 참조 설계 JSON (calibrate 뒤)
(cd tools && python -m smq2gds.validate) && npm run build # 오프라인 검증 → 게임 패널 (수십 분)
npm run test:smoke && npm run test:bot
npm run test:upgrade && npm run test:flow && npm run test:guide
DES='{"D-1":{"lay":2,"sb":1}}' node test/e2e/bot.js std 2 D-1 si1310   # 직사각형 나선 봇
node test/e2e/bot.js std 2 2-1,2-2,2-3,2-3R,2-4,2-5 sin1550   # Stage 2 회귀
npm run test:mrr                                          # 링 변조기 물리
npm run test:dr8                                          # 3A+ DR8 MZM/MRR
npm run test:lab && node tools/export_circuit.js all      # PIC Design Lab + 회로 예제
npm run test:py                                           # smq2gds: 소자 GDS + 회로 GDS 재검사·부정 테스트
(cd tools && python -m smq2gds.circuit smq2gds/examples/circuit/si1310_mzm_dr8_engine_layout.json -o ../docs/gds/si1310_mzm_dr8)   # 예제 GDS
DES='{"3A+":{"mod":1}}' node test/e2e/bot.js std 2 3A+ si1310   # MRR DR8 봇
node test/e2e/bot.js std 2 3A,3A+ si1310                  # Stage 3 회귀
node test/e2e/bot.js std 2 D-1,D-2 sin1550                # 긴 지연선 회귀
node test/e2e/bot.js std 2 B-1,B-2,B-3 si1550             # Track B 회귀
```

## Kind 인터페이스

필수: `params, evaluate(l, d, proc, opt), perf, q1, q2, objectives, fabPass, fabCrit, draw, chart, chartTitle, tiles, meta, hint, coach, card, aiStarts, violation`
선택: `missions/missionDone`(관찰 미션), `noSize/comp`(크기 대신 다른 보너스), `params[].labels`(이산 선택지 표시), `landKeys/land/landDeps`(지형도), `moveKeys/moveCandidates`(코치의 한 수 탐색), `toggles`(카드 사용 등), `cheap`, `aspect`, `fill(l, d)`(설계 기본값 채우기), `onParam`(값 변경 연동; `relayout` 파라미터는 목록을 다시 그림), `steps(l)`(Guided 단계: `params/evaluate/goals/done/coach/draw/chart`, 마지막은 `{full: true}`), `practice(l, d)`(별·카드·AI 없는 탐색 모드), `params[].noAI`(AI·코치 한 수가 건드리지 않는 목표·레이아웃 변수).

새 레벨 = `src/kinds/`에 kind 하나 + `levels.js` 항목 하나 + `calibrate.js`(또는 `calibrate_s2.js`) 스펙 블록 하나. 셸은 kind 내부를 모른 채 동작합니다.

다른 레벨을 참조하는 kind는 `window.GAME_LEV(id)`(현재 플랫폼·난이도의 유효 레벨)와 `window.GAME_CARDS`(부품 카드)를 씁니다. 코치 수치 제안은 `lineBest/lineBestOf/pairBest`(src/util.js)로 실제 개선을 확인한 값만 `권장: 기호 = 값` 형식으로 보여줍니다.

## 모델 범위

모든 수치는 학습용 surrogate입니다. 2-3R 링 변조기의 단순화(3D 열 퍼짐 무시로 낙관적인 히터 효율, Si 리브 EIM, 결합 슬랩 κ, SiN 플랫폼은 이종 Si 가정, 주입·히터·패드는 GDS에서 주석 레이어)는 [docs/mrr_physics.md](docs/mrr_physics.md)의 "한계" 절에 정리했습니다. 직사각형 나선의 원호 코너 접합 모드 변환은 곡률 점프마다 가우시안 이동 a = convA/2를 비간섭으로 더한 공학적 추정이며, Euler 코너·U-turn은 곡률이 연속이라 접합 변환을 0으로 둡니다(방사 손실은 국소 반경으로 적분). 반사, 3D 방사, 벤드 구간 결합, 편광 혼합은 포함하지 않아 FDTD·벡터 솔버보다 낙관적입니다 (예: 500×220 nm Si @1550 TE0 n<sub>eff</sub> 2.49 vs 벡터 해 ≈ 2.44). 각 보스 레벨의 최종 검증은 Tidy3D FDTD, Ansys(CHARGE/HEAT/INTERCONNECT)로 넘기는 것을 전제로 합니다.
