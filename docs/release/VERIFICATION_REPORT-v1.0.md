# SPEC-to-MASK Quest v1.0 — 검증 · 회귀 보고서

작업 시작 commit: `main` **fafd5874808ecd0559d1314e67f08d4c68b4a077** · 브랜치 `feature/v1.0-internal-education-release`. 수행하지 않은 검증은 PASS로 적지 않았습니다.

## 1. 기준선 (fafd587, 수정 전)

| 시험 | 결과 |
|---|---|
| build | OK |
| test:wdm / test:mrr / test:dr8 / test:upgrade | 80/80 · 181/181 · 80/80 · 356/356 |
| test:lab (t_lab 440 + e2e 2플랫폼) · test:guide · test:migrate · test:py (예제 12) | PASS |
| test:flow (4플랫폼) · smoke (4플랫폼) | PASS · 페이지 오류 0 |
| bot std/수치 힌트: si1310 21레벨, si1550 2-3R·3A+·3W | 모두 ★★ 이상 (★★★는 Fab 무작위 시드에 따라 바뀜) |

### 기준선에서 발견한 문제
| # | 문제 | 근거 (재현) | 심각도 |
|---|---|---|---|
| 1 | Design Lab 미션 완료가 설계를 바꿔도 남음 (`recompute()`가 `done=true`만 기록) | 6 미션 완료 → 다이 1.5 mm: Floorplan 검사 FAIL인데 스테퍼 ✓✓✓✓✓✓, 지도 "미션 6/6" (`/tmp` 재현 스크립트, v1.0에서는 `✓!!!!!`, "미션 1/6 · 이전 6") | P0 |
| 2 | localStorage 쓰기 실패를 조용히 무시 (`store.set`의 빈 catch, Lab `save`) | 코드 확인 | P0 |
| 3 | 전체 백업/복원 없음 — 진행 기록이 브라우저 하나에만 | 기능 없음 | P0 |
| 4 | Fab Run 시드가 시간·난수이고 기록되지 않음 → 재현·공정 비교 불가 | `tapeOut()` | P1 |
| 5 | 비교 패널의 "61 다이" 표기 — 실제 웨이퍼는 69 다이 | `makeWafer` 계산 | P1 (사실 오류) |
| 6 | "GDS Generated"가 제조 준비로 오해될 수 있음 | 용어 | P1 |
| 7 | MRR 모듈 전력이 링 열 효율 가정에 민감한데 화면에서 확인할 수 없음 (문서에만) | arch_1p6t_dr8.md §2.3 | P1 |
| 8 | WDM8 정적 락·모니터 부재가 결과 옆에 드러나지 않음 | 3W 패널 | P1 |
| 9 | 보조 글자 대비 3.7–4.3:1 (< 4.5:1), 레벨 캔버스 대체 텍스트가 모든 레벨에서 "MMI 내부 광 강도 분포" | 측정·코드 | P1 |
| 10 | CI 없음, 봇·스모크가 실패해도 종료 코드 0 | 저장소 | P1 |

## 2. 구현 (Phase별 commit)

| Phase | commit | 내용 | 주요 파일 |
|---|---|---|---|
| A · 상태 무결성 | 3674eca | 이전 완료 / 지금 유효 / 식별(hash, sig) 분리, v1 상태 이전, 3단계 칩 | src/lab/ui.js, test/e2e/lab_state.js |
| A · 저장·백업 | f696ad3 | SMQ_STORE, 저장 칩·배너, smq-backup/1, 복원 검증·롤백·되돌리기, 빌드 표기·오프라인 빌드 | src/persist.js, src/shell.js, tools/build.sh, test/e2e/backup.js |
| B · 신뢰도 | 6322454 | MRR 열 민감도, WDM8 근거 구분·견고성, 근거 표시, 속도 정의, Fab 시드 기록·재현, 같은 웨이퍼 비교, 다이 수 수정 | src/kinds/{mrr,xcvr,wdm}.js, src/ui_util.js, src/levels.js, test/e2e/fab.js |
| C · 학습·UI | 3675fd5 | 첫 실행 안내, 학습 경로, Engineering Review, 바꾼 것 → 결과, Lab 진단·레이어·선택 맞춤·두 손가락 확대, Lab 기준 비교, 접근성 | src/learn.js, src/lab/ui.js, src/head.html, test/e2e/learn.js |
| D · 릴리스 | af11fb0 이후 | CI, release.sh, 문법 검사, 봇/스모크 게이트, 문서, 파일럿 키트 | .github/workflows/ci.yml, tools/release.sh, docs/release, docs/pilot |

### 주요 설계 결정
- **상태 정책.** 같은 design hash = 같은 넷리스트·배치·배선 형상·파라미터·플랫폼 → 내보내기와 GDS 재검사를 다시 유효로 봅니다. 검증 실행은 검사 결과 서명(sig)까지 같아야 합니다 — 시스템 검사가 3A+·3W 설계를 읽어 geometry hash만으로는 같은 결과를 보장하지 않기 때문입니다. 이전 완료 기록은 지우지 않습니다.
- **민감도는 엔진 재계산.** MRR 열 민감도는 링 열 컨덕턴스 G′를 바꿔 히터·자기 가열·루프 이득·모듈 전력을 다시 계산하고, WDM 견고성은 가정 상수를 바꿔 다시 계산합니다. 결과에 보정 상수를 곱하지 않습니다. 기본 경로는 바뀌지 않았습니다(test:dr8의 fa9f16a 비트 동일성, test:wdm의 스펙 불변).
- **점수 불변.** 비교·민감도·리뷰·경로·같은 웨이퍼 비교는 별·점수·크레딧·카드·보정을 바꾸지 않습니다 (fab.js, learn.js가 확인).
- **위치를 모르는 오류는 위치를 그리지 않음.** Lab 진단은 검사가 이름을 대는 인스턴스, 실패 넷, 측정된 최소 간격 지점만 표시합니다.

## 3. 엔지니어링 검증

### MRR 열 민감도 (3A+ 기준 설계, 변조기만 MRR)
| 플랫폼 | 모델 | 효율 | 링 히터 | ΔT 자기 가열 | g<sub>th</sub> | MRR 모듈 | MZM 모듈 |
|---|---|---|---|---|---|---|---|
| Si 1310 | Nominal | 547 pm/mW | 12.4 mW | 61.0 K | −22.8 | 4.50 W | 4.49 W |
| Si 1310 | Conservative | 160 | 58.8 | 17.8 | −6.7 | 4.91 | 4.49 |
| Si 1310 | Experimental ref. | 73 | 137.1 | 8.1 | −3.1 | 5.61 | 4.49 |
| SiN 1550 | Nominal | 490 | 9.9 | 88.8 | −24.1 | 5.58 | 5.58 |
| SiN 1550 | Conservative | 160 | 57.9 | 29.0 | −7.9 | 6.01 | 5.58 |
| SiN 1550 | Experimental ref. | 73 | 142.9 | 13.2 | −3.6 | 6.76 | 5.58 |

기준선 문서(arch_1p6t_dr8.md §2.3)의 Si 1310 값(4.50 / 4.91 / 5.61 W, MZM 4.49 W)을 화면에서 같은 엔진으로 재현합니다.

### WDM8 한계 표시
Optical Model(◇) / Control Architecture(정적 락 △, 링별 모니터·동적 락 ○ NOT VERIFIED) / System Robustness(△ 가정 변경 재계산). Si 1310 기준 마진 1.08 dB: Rx XT 5 dB 나쁨 −0.03 dB, 콤 기울기 +1 dB −0.83 dB, 열 결합 ×2 마진 0 (히터 −1.4 mW). SiN 1550 기준 1.30 dB: −0.32 / −1.00 / 0 dB. 1 dB 미만 주의 표시는 교육용 휴리스틱으로 명시.

### GDS 검증 상태
Design Valid / Geometry Rechecked / Foundry Readiness: NOT VERIFIED. 기존 GDS hash·KLayout 재검사·내보내기 형식 불변 (test:py, lab.js의 hash 일치/불일치/FAIL 시나리오).

### Fab 재현성
같은 설계·시드·모델 → 같은 결과 (fab.js: si1310 1-4 58/69 두 번, SiN 두 플랫폼 PASS), 같은 웨이퍼 비교의 다이별 쌍 집계가 엔진 직접 재계산과 일치, 비교 후 별·카드·크레딧 불변.

## 4. 회귀 결과 (v1.0 브랜치, 로컬 — Node 22, Python 3.13, gdsfactory 9.51, KLayout 0.30.12)

| 시험 | 결과 |
|---|---|
| build · check_syntax (61 JS 파일 + 조립 스크립트, 외부 스크립트 없음) | PASS |
| test:upgrade 356/356 · test:mrr 181/181 · test:dr8 80/80 · test:wdm 80/80 | PASS |
| test:lab (t_lab 440/440, lab e2e ×2, lab_state ×2) | PASS |
| test:migrate · test:guide · test:backup · test:learn | PASS |
| test:py (test_smq2gds, test_circuit 예제 12 + 음성 시험) | PASS |
| smoke · flow · fab · lab_state × 4플랫폼 | PASS (fab sin1310/sin1550은 Si 전용 설계를 쓰던 시험을 플랫폼 기준 설계로 고친 뒤 PASS) |
| bot std/수치 힌트, BOT_MIN=2: si1310 21레벨 | 모두 ★★ 이상, 종료 코드 0 (★★★ 미달: 1-7·2-1·3A — Fab 시드 의존, 기준선에서도 같은 성격) |
| bot si1550 9레벨 | 모두 ★★ 이상 (★★★ 미달 1-7·2-5) |
| bot sin1310 9레벨 | 모두 ★★ 이상 (★★★ 미달 2-5) |
| bot sin1550 9레벨 | 모두 ★★★ |
| GitHub Actions quick job (push 43e860c, 8b7753b) | PASS — build, dist 무결성, 문법, 엔진, Lab, e2e si1310, Python GDS |
| GitHub Actions PR #8 run 38051943087 (8b7753b) | **모두 PASS** — quick, release regression × 4플랫폼(smoke·flow·guide·lab·lab_state·fab + 봇 게이트 ★★), release artifacts (CI 산출물 `spec-to-mask-release`) |

### 화면 검증
1280 × 800, 400 × 860, 1024 × 640(≈125 %), 640 × 400(≈200 %)에서 캡처로 확인: 겹침·잘림·가로 넘침 없음(넓은 비교 표는 의도적으로 표 안에서 가로 스크롤). 캡처는 `docs/ux/v1/`. 키보드: 모달 초점 이동·Esc·Tab 순환(첫 실행 안내, 백업 대화 상자, 가이드), 슬라이더 방향키, 리뷰 라디오, Lab 진단 버튼. 스크린리더 실기기 확인은 하지 않았습니다(NOT VERIFIED).

## 5. 미검증 항목 · 남은 문제
| 항목 | 상태 |
|---|---|
| 팀 파일럿 (≥ 6명) | **미실시** — 계획·양식만 (`docs/pilot/`) |
| 실제 스크린리더(NVDA·VoiceOver) 사용성 | NOT VERIFIED |
| Safari·Firefox 실기기 | NOT VERIFIED (Chromium headless만) |
| 사내 브라우저 정책(다운로드·클립보드 차단) 실환경 | 대체 경로(선택된 JSON)는 jsdom에서 확인, 실환경 미확인 |
| WDM 동적 락, RF EM, 3D 열, 파운드리 규칙 | 모델 범위 밖 (MODEL_LIMITATIONS) |
| localStorage 한도 | 현재 사용량 수 kB–수백 kB (Design DB 5000건 상한 ≈ 1 MB) — IndexedDB 이전은 하지 않음 |

## 6. 최종 릴리스 패치 — 독립 코드 검토 5건 (PR #8, be4ce8a 이후)

기능 추가 없이 검토 지적 5건만 고쳤습니다. 각 항목은 먼저 수정 전 코드에서 재현하고, 재현을 회귀 시험으로 남겼습니다. 물리 엔진 결과·스펙·`MODEL_VERSION`(smq-model-1.0)·저장 형식은 바뀌지 않았습니다(test:upgrade/mrr/dr8/wdm 동일성 검사가 실제로 실행되어 통과).

| # | 문제 (심각도) | 수정 전 재현 | 수정 | 회귀 시험 |
|---|---|---|---|---|
| 1 | CI에서 동일성 검사가 조용히 skip될 수 있음 (P0) | `git clone --depth 1`에서 test:upgrade 344/344 · mrr 180/180 · dr8 68/68 · wdm 76/76 모두 “통과” — 기준 커밋을 못 읽어 동일성 검사 12 + 1 + 12 + 4개가 빠짐(wdm은 안내 문구도 없음). test:upgrade의 기준은 `origin/main`(이미 직사각형 나선 포함)이라 깊은 checkout에서도 자기 자신과 비교 | `test/baseline.js`: 기준 커밋 고정(5637cd9 나선 = 직사각형 나선 이전 main, f08011b, fa9f16a ×2, ad7188f), 없으면 종료 코드 1, `BASELINE <commit>:<file> blob`·`IDENTITY <test>: n/n` 출력, 개수가 다르면 실패. CI quick·matrix `fetch-depth: 0`, `tools/check_baselines.js`와 동일성 검사 수를 job summary에 기록 | `npm run test:baseline` (11): 히스토리를 숨기면(GIT_DIR=빈 폴더) test:upgrade·dr8 종료 코드 1 · `SMQ_ALLOW_NO_BASELINE=1`이면 “IDENTITY NOT RUN” 표시 · 히스토리가 있으면 12/12. 얕은 clone에서 네 시험 모두 `BASELINE MISSING`으로 실패 확인 |
| 2 | 손상된 저장 값이 백업에서 조용히 빠지고 검증 통과 (P0) | `smq3-db`에 잘린 JSON → 수정 전 빌드: `data`에 smq3-db 없음, `validate` ok·경고 0, 복원하면 대상 브라우저의 smq3-db까지 삭제. 게임은 시작 시 기본값으로 읽고 다음 저장에서 원문을 덮어씀 | 시작 시 손상 원문을 `smq3-quarantine`에 그대로 보관. 백업: `problems`(read / parse / structure / quarantined) · `unreadable`(원문, `unreadable_checksum`) · `complete:false`; `data`·`checksum`의 의미는 그대로(이전 백업 호환). `validate` → `incomplete` + 경고(“불완전한 백업”), 원문 변조는 오류. 복원은 그 키를 지우지 않고 원문을 대상 보관함에 복사. 저장 칩·데이터 대화 상자·백업/복원 메시지에 표시, 보관 원문 삭제는 확인 후 | `npm run test:backup` (+18): 시작 시 보관 · 게임이 키를 덮어쓴 뒤에도 백업에 원문 · `complete:false` · 검증 incomplete · 원문 변조 거부 · 플래그를 지워도 incomplete · 읽기 거부(SecurityError)도 문제로 기록 · 복원 시 키 보존·원문 복사 · v1.0 백업 호환 |
| 3 | 같은 웨이퍼 비교 결과가 조건이 바뀌어도 현재 결과처럼 보임 (P1) | 결과는 두 설계 hash만 확인 — 난이도(공정 변동 ×1.25, 스펙)·시드(새 Fab Run)·모델 버전이 바뀌어도 그대로 표시 | 결과에 플랫폼·난이도·공정 변동 크기·두께 변동·레벨 스펙 hash·시드·모델 버전·두 설계 hash를 기록(`fabCond`). 하나라도 다르면 “STALE — 바뀐 것: …”으로 표시하고 이전 값은 현재 결과가 아님을 명시, 같은 조건으로 돌아오면 다시 유효. v1.0 기록(조건 필드 없음)은 STALE(기록 없음) | `test:fab` × 4플랫폼 (+13, 4·5번 공통): 난이도 변경 → STALE, 되돌리면 current · 새 시드 → STALE(시드 a → b) → 재계산 · 설계 변경 → STALE · 다시 불러온 뒤 같은 조건 current · 다른 모델 버전 → STALE · v1.0 기록 → STALE |
| 4 | MRR 자기 가열 97 K(arch 문서) vs 61 K(v1.0 문서) (P1) | 같은 링(R 6.099 µm, 547 pm/mW)을 **2-3R 레벨 단독 13 dBm 입력**에서 계산하면 P<sub>abs</sub> 11.38 mW → 97.4 K, 효율 비로 29 / 13 K — Phase B 문서의 값. 모듈(3A+ 기준, 70 °C P<sub>mod</sub> 10.80 dBm → 0.5 dB 격자점 11.0 dBm)에서는 P<sub>abs</sub> 7.12 mW → 61.0 K. Phase B 엔진(bb74e31)으로 다시 계산해도 61.0 K → 엔진 변화가 아니라 문서 표의 계산점 혼합 | 엔진 변경 없음. arch_1p6t_dr8.md §2.3 표를 61.0 / 17.8 / 8.1 K로 고치고 정의(링 코어 평균 ΔT = P<sub>abs</sub>/(G′·L), FCA+TPA 흡수, PAM4 평균, 정상 상태; 칩·접합 최고 온도 아님)·계산점·4플랫폼 추적 표(격자점 / 정확한 P<sub>mod</sub> / 13 dBm) 추가. MODEL_LIMITATIONS §3.1과 3A+ 열 민감도 표 설명에 같은 정의 | `test:dr8` (+6): 문서 표의 히터·ΔT·모듈 전력 = `thermalSens`, 97 K 행 없음, 4플랫폼 추적 표 = 엔진. 수정 전 문서로 돌리면 6개 FAIL 확인 |
| 5 | 같은 시드 수율 비교를 설계 우열로 단정 (P1) | “갈린 다이 수를 보세요 — 같은 웨이퍼라 공정 운이 아니라 설계 차이입니다”, 3A+·2-3R 패널은 수율 차 3 %p 초과면 강조 | 쌍 비교로 설명: k/n 수율 + 95 % Wilson 구간(유지), 판정이 갈린 다이(기준만 / 현재만), 정확 양측 부호 검정 p. 갈림이 한쪽으로 뚜렷할 때만(p < 0.05) “이 웨이퍼·이 공정 모델에서 더 견고하다는 근거”로, 그때도 공간 상관 때문에 p가 낙관적이고 우열의 증명이 아님을 명시. 패널 강조도 같은 기준 | `test:fab`: 부호 검정 값((5,0) p = 0.0625, (0,6) p = 0.031, (3,3) p = 1), 문구, “설계 차이입니다” 없음, Wilson 구간 표시. `test:mrr`·`test:dr8` 패널 시험 통과 |

자기 가열 추적 (3A+ 기준 설계, 변조기 MRR):

| 플랫폼 | P<sub>mod</sub>(70 °C) → 격자점 | 모듈 표시 | 정확한 P<sub>mod</sub> | 2-3R 단독 13 dBm |
|---|---|---|---|---|
| Si 1310 | 10.80 → 11.0 dBm | 61.0 K | 58.1 K | 97.4 K |
| Si 1550 | 12.75 → 12.5 dBm | 78.2 K | 82.9 K | 87.8 K |
| SiN 1310 | 10.97 → 11.0 dBm | 42.9 K | 42.6 K | 69.5 K |
| SiN 1550 | 12.91 → 13.0 dBm | 88.8 K | 86.9 K | 88.8 K |

### 회귀 결과 (최종 패치, 로컬 — Node 22, Python 3.13, gdsfactory 9.51, KLayout 0.30.12)

| 시험 | 결과 |
|---|---|
| build · check_syntax (64 JS 파일 + 조립 스크립트) | PASS |
| test:upgrade 357/357 · test:mrr 182/182 · test:dr8 87/87 · test:wdm 81/81 | PASS — `IDENTITY` 12/12 (5637cd9) · 1/1 (f08011b) · 12/12 (fa9f16a) · 4/4 (ad7188f) |
| test:baseline 11/11 · check_baselines 5/5 | PASS |
| test:lab · migrate · guide · backup · learn | PASS |
| test:py (test_smq2gds, test_circuit 예제 12 + 음성 시험) | PASS |
| smoke · flow · fab · lab_state · lab · guide × 4플랫폼 | PASS (페이지 오류 0) |
| bot std/수치 힌트, BOT_MIN=2: si1310 21레벨, si1550 · sin1310 · sin1550 9레벨 | 모든 레벨 ★★ 이상, 종료 코드 0 (게이트 통과) |
| 화면 (1280 × 800, 400 × 860) | 가로 넘침 0. 캡처 `docs/ux/v1/{desktop,mobile}_backup_incomplete.png`, `_samewafer_stale.png`, `_samewafer_paired.png` |
| GitHub Actions PR #8 | CI_RESULT |

### 이번 패치에서 새로 발견한 문제 (고치지 않음 — 범위 밖)
- **데스크톱(≥ 920 px)에서 sticky 파라미터 카드가 전체 폭 카드(기준 비교 · 3A+/2-3R 비교 패널)의 오른쪽 약 40 %를 덮습니다.** `#params`는 sticky라 아래로 스크롤해도 화면 오른쪽에 남고, 그 아래 행의 `xp`·`cmp` 영역은 두 열을 모두 씁니다. 기준 비교 표의 Δ·근거 열과 STALE 문장의 오른쪽 일부가 가려집니다(휴대폰 400 px에서는 문제 없음). be4ce8a에서도 같음 — v1.0에서 element 단위 캡처만 해 놓쳤습니다. 해결안: 데스크톱에서 `xp`·`cmp`를 왼쪽 열(1.6fr)에만 두거나, sticky를 `mission`·`view` 행 범위로 제한. UI 배치 변경이라 이번 패치에 넣지 않았습니다.
