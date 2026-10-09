# SPEC-to-MASK Quest

Photonic IC 설계를 게임으로 배우는 단계별 학습 프로그램입니다. 브라우저 하나로 동작하는 단일 HTML(`dist/index.html`)로 빌드됩니다.

## 학습 흐름

| 단계 | 내용 |
|---|---|
| Stage 0 · 플랫폼 | 파장(1310 O-band / 1550 C-band) → 코어 물질(Si 220 nm / SiN 400 nm, SiO₂ 클래딩) 선택. 진행 기록·부품 카드는 플랫폼별로 저장 |
| Stage 1 · Passive | 1-1 도파로(TE/TM, 단일/멀티모드) → 1-2 방향성 결합기 → 1-3~1-5 MMI(1×2, 광대역, 2×2) → 1-6 Spot-Size Converter → 1-7 CWDM Demux (Stage 1 피날레 · Active 맛보기) |
| Stage 2 · Active | TO 위상기, PN 공핍 위상기, 224G TW-MZM, Ge PD + TIA, 외부 광원 (준비 중) |
| Stage 3 · System | Track A: 1.6T 2×FR4 / DR8·CPO 트랜시버 — Stage 1·2 부품 카드로만 조립 (준비 중) |

각 레벨은 ★ 기본 스펙 / ★★ 고성능+크기 / ★★★ Fab Run 수율의 세 목표, 코치 힌트 4단계(끄기·방향·수치·지형도), 난이도 3단계(입문·표준·도전), AI 라이벌(Nelder–Mead), Design DB(사람·AI 탐색 기록, CSV 복사)를 가집니다.

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
  kinds/             레벨 종류별 물리·시각화·코치: wg, dc, mmi, ssc, cwdm
  levels.js          캠페인 텍스트·개념 노트 (수치 스펙은 data/pspec.js)
  shell.js           범용 게임 셸: 플랫폼, 점수, 목표·미션, 코치, Fab Run, AI 라이벌, Design DB, 부품 카드
  data/
    wg_*.json        도파로 TE/TM 모드 테이블 (폭·두께·파장)
    dc_*.json        방향성 결합기 짝/홀 슈퍼모드 테이블 (갭·폭·두께·파장)
    ssc_*.json       SSC 팁 모드·광섬유 overlap 테이블 (ssc_table.json = Si 1310)
    pspec.json       플랫폼별 레벨 스펙 (tools/calibrate.js 생성)
    tables.js, pspec.js   위 JSON을 묶은 빌드 입력 (tools/build_data.py 생성)
tools/
  modes2.py          semi-vectorial 2D 유한차분 모드 솔버 (quasi-TE Ex / quasi-TM Ey, 대칭 격자)
  gen_wg.py, gen_dc.py, gen_ssc2.py   플랫폼별 테이블 생성 (python3 tools/gen_wg.py si1310 등)
  modes2d.py, gen_tables.py           Si 1310 SSC 테이블을 만든 초기 솔버 (재현용)
  lattice.py         CWDM lattice 커플러 값 최적화
  calibrate.js       플랫폼별 레벨 스펙·출발점·난이도별 수율 목표 자동 보정
  build_data.py      data/*.json → tables.js, pspec.js
  build.sh           단일 HTML 빌드
test/
  load.js            node VM에서 엔진·kind 로드
  t_*.js             레벨 난이도·수율 탐색 스크립트
  e2e/smoke.js       jsdom: 플랫폼 선택 → Stage 1 전 레벨 렌더 확인
  e2e/bot.js         jsdom: 코치 문장만 따라가 각 레벨을 클리어하는 봇 (회귀 테스트)
  e2e/migrate.js     이전 버전 진행 기록 이전 확인
```

## 데이터 재생성 순서

```sh
python3 tools/gen_wg.py si1310        # 플랫폼별 (si1310 si1550 sin1310 sin1550), 각 2–5분
python3 tools/gen_dc.py si1310 0.36   # 두 번째 인자 = 표준 단일모드 폭 (tools/w0.json)
python3 tools/gen_ssc2.py si1550 0.46
npm run tables && npm run calibrate && npm run build
npm run test:smoke && npm run test:bot
```

## Kind 인터페이스

필수: `params, evaluate(l, d, proc, opt), perf, q1, q2, objectives, fabPass, fabCrit, draw, chart, chartTitle, tiles, meta, hint, coach, card, aiStarts, violation`
선택: `missions/missionDone`(관찰 미션), `noSize/comp`(크기 대신 다른 보너스), `landKeys/land/landDeps`(지형도), `moveKeys/moveCandidates`(코치의 한 수 탐색), `toggles`(카드 사용 등), `cheap`, `aspect`.

새 레벨 = `src/kinds/`에 kind 하나 + `levels.js` 항목 하나 + `calibrate.js` 스펙 블록 하나. 셸은 kind 내부를 모른 채 동작합니다.

## 모델 범위

모든 수치는 학습용 surrogate입니다. 반사, 3D 방사, 벤드 구간 결합, 편광 혼합은 포함하지 않아 FDTD·벡터 솔버보다 낙관적입니다 (예: 500×220 nm Si @1550 TE0 n<sub>eff</sub> 2.49 vs 벡터 해 ≈ 2.44). 각 보스 레벨의 최종 검증은 Tidy3D FDTD, Ansys(CHARGE/HEAT/INTERCONNECT)로 넘기는 것을 전제로 합니다.
