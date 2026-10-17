# P1 QA Report

2026-10-18 · 사용자 Play Review와 학습 효율 검증은 아직 수행하지 않았습니다.

- 실행 파일은 `dist/spec-to-mask-v2.0.0-alpha.1-p1.html`입니다.
- SHA256은 `9e4be1bd32fe6a5b61f53b2357d923a20ffefd45e580aa238b4d73d4e560c487`입니다.
- `dist/index.html`과 Canonical HTML은 Byte 단위로 일치합니다.
- Model 계수와 기존 `src/kinds`, `src/bench`, `src/lab`, Platform/Level/Data는 변경하지 않았습니다.
- 기존 beta.2 실행 파일과 P0 Prototype은 변경하지 않았습니다.

| 검증 | 실제 결과 |
|---|---|
| P1 State / Model | 93개를 통과했습니다. 4 Platform Kernel 일치, Invalid Input, Identity, Full Backup/Restore/Undo, PR23 nested Journey 보존, Quarantine, Save 실패를 검사했습니다. |
| P1 Browser | 121개를 통과했습니다. Chromium 153.0.8010.0에서 실제 새 실행 파일을 검사했습니다. |
| Viewport | 1440×900,1366×768,390×844,320×568의 Light/Dark를 검사했습니다. Desktop에는 핵심 조작과 결과가 함께 표시되며 Mobile에는 핵심 KPI와 Slider가 고정 버튼에 가려지지 않습니다. |
| 한글 UI / Font | 기술 용어는 English로 유지하고 설명·질문·서술어를 한글로 작성했습니다. Font를 실행 파일에 포함하며 외부 다운로드는 없습니다. |
| 기존 Studio State | 56개를 통과했습니다. |
| 기존 MZM Bench Model | 111개를 통과했습니다. |
| 기존 Lab | 440개와 Si1310/SiN1550 e2e/state를 통과했습니다. |
| 기존 Backup | 기존 e2e를 통과했습니다. |
| 기존 Studio Browser | 168개를 통과했습니다. 새 실행 파일의 명시적 Legacy 경로를 검사했습니다. |
| 기존 MZM Browser | 37개를 통과했습니다. |
| Source Parity / Syntax | Canonical Parity와 80개 JS File + Assembled Script 검사를 통과했습니다. |
| Python GDS | Local 환경에 klayout이 없어 실행하지 못했습니다. CI 결과와 구분합니다. |
| Runtime | P1 Browser에서 Page Error와 외부 HTTP Request는 없었습니다. |

P1의 최종 Browser Report와 State/Model Log를 함께 제공합니다. Historical UI 검사는 `?experience=legacy`를 명시하며 기존 Assertion을 제거하지 않았습니다.

작은 R 범위는 Educational Domain입니다. 기존 Kernel과의 일치를 검증했으며 외부 Measurement, Full-wave Accuracy, Foundry Readiness, BER/FEC/IEEE Compliance를 검증하지 않았습니다.

P1에서는 Waveguide만 구현했습니다. MZM Workbench와 1.6T Engine은 다음 단계의 계획이며 아직 v2 구현 완료로 표시하지 않습니다. 실제 학습 효율의 2–3분 목표는 사용자 테스트 전이므로 PASS라고 보고하지 않습니다.

GitHub Commit / CI는 Checkpoint Log와 PR #24에 게시 후 기록합니다. Local 실행 결과를 새 HEAD의 CI 성공으로 대체하지 않습니다.
