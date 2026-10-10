# SPEC-to-MASK Quest v1.0 — Internal Education Release Candidate

기준선: `main` fafd587 (Phase A–E + 사용성 정리). 브랜치: `feature/v1.0-internal-education-release`. 새 챕터·소자·시뮬레이터는 추가하지 않았고, 기존 레벨 ID·별/점수 규칙·Fab 크레딧·AI 라이벌·Design DB·학습 가이드·Guided 모드·직사각형 나선·DR8·WDM8·Design Lab 6 미션·`smq-design/1`·`smq-circuit/1`·GDS 생성/재검사·플랫폼 4종·단일 HTML은 그대로입니다.

## 바뀐 것

### 릴리스 차단 문제 (P0)
- **Design Lab 상태 무결성.** 한 번 완료한 미션이 설계를 바꿔도 ✓로 남던 문제를 고쳤습니다. 이전 완료(학습 기록)·지금 유효(실시간 판정)·내보내기/검증/GDS 재검사의 설계 식별(design hash)을 분리했습니다. 같은 hash로 돌아오면 내보내기·GDS 재검사가 다시 유효해지고, 검증 실행은 검사 결과까지 같을 때만 유효합니다. v1 상태는 안전하게 stale로 변환됩니다.
- **저장 신뢰성.** localStorage 쓰기 실패를 더 이상 삼키지 않습니다: 머리글 저장 표시(저장됨 · 저장 중 · 저장 실패 · 백업 권장)와 실패 배너.
- **전체 백업 / 복원** (`smq-backup/1`): 진행 기록·별·카드·설계·Design DB·Lab 프로젝트·학습 기록(+ 선택: 화면 설정). 체크섬·구조 검사, 손상 파일 거부, 복원 전 요약과 확인, 복원 직전 데이터 자동 보관(되돌리기), 거부된 쓰기 시 전체 롤백. 내려받기·복사가 막히면 화면에 선택된 JSON.
- **오프라인 배포 빌드**: 외부 글꼴 요청 없는 HTML (`npm run build:offline`, 릴리스 HTML).

### 엔지니어링 신뢰도 (P1)
- **MRR 열 민감도** (3A+ 비교 패널): Nominal / Conservative (160 pm/mW) / Experimental ref. (73 pm/mW, Yuan 2024)을 같은 엔진에서 링 열 컨덕턴스만 바꿔 다시 계산 — 히터, 국부 온도 상승, 열 되먹임 안정, 모듈 전력, pJ/bit, MZM 대비. 점수에 들어가지 않음.
- **WDM8 결과의 근거** (3W 비교 패널): Optical Model / Control Architecture (정적 락 = 가정, 링별 모니터·동적 락 = NOT VERIFIED) / System Robustness (Rx XT·콤 기울기·열 결합 ×2를 다시 계산). 얇은 마진 경고(1 dB, 교육용 휴리스틱으로 명시).
- **GDS 용어**: "GDS Generated" → **Design Valid · Geometry Rechecked · Foundry Readiness: NOT VERIFIED**.
- **1.6T 속도 정의**: 112 GBd × 2 = 224 Gb/s 라인(게임 대표값) · 200 Gb/s 데이터 · 256b/257b + RS(544,514) → 212.5 Gb/s(106.25 GBd) · 내부 FEC 변형 113.4375 GBd · IEEE P802.3dj 상태와 확인 날짜 명시.
- **Fab Run 재현성**: 시드·플랫폼·난이도·설계 hash·다이 수·양품·수율·모델 버전·시각을 기록, 시드 고정 시 같은 결과, 95 % Wilson 구간과 공간 상관 안내. 비교 패널의 다이 수 표기 오류(61 → 69) 수정.
- **같은 웨이퍼 비교**: 기준 설계를 고정하고 같은 시드의 같은 다이별 변동을 두 설계에 적용(갈린 다이 수 표시), 크레딧·별 없음.

### 학습 · UI/UX (P1)
- 첫 실행 안내(신규 사용자만, 건너뛰기/다시 보기), 학습 경로 A/B/C와 다음 권장 행동, Engineering Review(1-7, 2-3/2-3R, 3A+, 3W, Lab M5/M6 — 모든 보기에 공학적 설명, 점수 무관).
- **바꾼 것 → 결과**: 바꾼 손잡이, 움직인 미션 지표 최대 3개(이전 → 현재, 충족/미달 전환), 물리적 이유와 trade-off(학습 가이드의 파라미터 표).
- 기준 설계 고정 비교(2-3R · 3A+ · 3W · Design Lab), 하나의 점수로 합치지 않음.
- Design Lab 진단: FAIL/WARNING → 관련 소자·넷·지점 강조와 확대, 원인, 고칠 손잡이, 해당 미션으로 이동. 위치를 계산하지 않는 검사는 관련 소자만. 보기 전용 레이어, 선택 맞춤, 두 손가락 확대.
- 근거 표시(◆ ◇ ● △ ○ + 글자, PASS/FAIL과 분리) — 누르면 학습 가이드 모델 한계.
- 접근성: 보조 글자 대비 4.0 → 5.4–6.4:1, 터치 대상 확대(coarse pointer), 동작 줄이기, 차트·캔버스 텍스트 대안.

### 릴리스 엔지니어링
- GitHub Actions (`.github/workflows/ci.yml`): 빠른 PR 검사 + 4개 플랫폼 릴리스 매트릭스(봇 게이트 ★★) + 릴리스 산출물.
- `npm run release`: 오프라인 HTML(버전·커밋·커밋 날짜 표기), 소스 ZIP, Handoff ZIP, 문서, `SHA256SUMS.txt`.

## 산출물
| 파일 | 내용 |
|---|---|
| `spec-to-mask-v1.0.html` | 실행 파일 (오프라인, 외부 요청 없음) |
| `spec-to-mask-v1.0-source.zip` | 해당 커밋의 소스 (git archive) |
| `spec-to-mask-v1.0-HANDOFF.zip` | HTML + 릴리스 문서 + Python GDS 백엔드(선택) + 스키마·Lab·GDS 문서 + 예제 GDS + 파일럿 양식 |
| `RELEASE_NOTES` · `VERIFICATION_REPORT` · `USER_GUIDE` · `MODEL_LIMITATIONS` (v1.0) | 문서 |
| `SHA256SUMS.txt` | 위 파일의 SHA-256 (산출물과 함께 배포) |

## 알려진 한계
`MODEL_LIMITATIONS-v1.0.md`. 요약: 링·WDM 락은 정적, 링 열 효율은 2D 단면 기반(낙관적), 파운드리 준비·RF 전자기·3D 열·레인 간 열 크로스토크는 NOT VERIFIED, 결과는 Tape-out Ready가 아닙니다. 팀 파일럿은 아직 진행하지 않았습니다(`docs/pilot/PILOT_PLAN-v1.0.md`).
