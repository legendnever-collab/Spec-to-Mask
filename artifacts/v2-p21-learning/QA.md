# P2.1 Additional Learning Experience — QA

2026-10-18 · PR #25 · 사용자 Play Review Candidate입니다.

- Source Freeze: `3cf4c2f932dd251fb09e51d19713ac680246ac1c`
- Version: `2.0.0-alpha.3-p21-learning`
- Offline HTML: `dist/spec-to-mask-v2.0.0-alpha.3-p21-learning.html` · 2,506,418 bytes
- HTML SHA256: `99803b91f53d69712cf8c6c0e84454a7a68eda6c83943ff6c6b986832004141a`
- Source Manifest SHA256: `2b29c1fa6cd920f849e1d1e362a8ad308223f10fba66b1cf1ff6a8b249ce7dca`
- Canonical / index / 새 Source Rebuild가 Byte 단위로 같습니다. 이전 alpha.2 / alpha.3-p2-ux 파일은 기존 SHA256을 유지합니다.

| 새 학습 검사 | PASS |
|---|---:|
| Navigation / Passive / Active / Formats Model-State | 11 / 41 / 107 / 49 |
| Navigation / Passive·Active / Formats Browser | 50 / 322 / 79 |
| 전체 Tutorial → Passive → Active → MZM → Formats → RF/EO → Summary + 실제 Backup Restore Reload | 16 |
| 기존 P1 / P2 / P2.1 Model-State | 93 / 154 / 135 |
| 기존 P1 / P2 / P2.1 Browser | 121 / 511 / 391 |
| MZM Model / Studio State | 111 / 56 |
| Legacy Studio / Legacy MZM Browser | 168 / 37 |
| Upgrade / MRR / DR8 / WDM Identity | 357 / 182 / 87 / 81 |
| Lab / Full Backup·Restore·Undo / Smoke / Python GDS·Circuit | PASS |
| Syntax / Font | 105 Files + Assembled Script / 503 Glyph, Korean·Greek 누락 0 |

Browser는 Chrome for Testing 151.0.7922.34입니다. 1440×900 / 1366×768 / 390×844 / 320×568 × Light/Dark를 검사했습니다. Diagram Label bbox Collision 0, 주요 Control·KPI의 하단 Navigation 가림 0, Horizontal Overflow 0, 주요 Action의 44 px Target, Current Result Identity, 외부 Runtime HTTP 0을 확인했습니다. 주요 Screenshot을 직접 확인했습니다. 정식 Accessibility Audit는 수행하지 않았습니다.

기존 Physics / 계수 / Persistence Source는 Baseline과 변경이 없습니다. 새 입력은 optional Additive State이며 Stage별 Resume, 기존 완료 기록, Skip / Unobserved / Observed를 구분합니다. 실제 UI Backup Restore 후 Curriculum State가 원본과 정확히 같았습니다. Source 변경 없는 유효한 Regression은 재사용하고 변경된 UI는 다시 검사했습니다. GitHub CI는 게시 Commit의 새 HTML 전체를 다시 검사합니다.

중간 CI에서 기존 Summary Repeat / 접힌 Backup을 찾던 Browser Automation이 실패했습니다. 사용자 요청의 새 More / Disclosure 경로로 Selector만 갱신했고 수치 Assertion은 유지했습니다. Python 환경에는 GDS Dependency가 없어 Repository requirements-ci.txt를 설치한 뒤 전체 GDS / Circuit 검사를 통과했습니다.

## Model 범위

Field Profile / Y-branch Shape Optimization / Generic NRZ·PAM4·PAM8 Waveform·Eye는 Conceptual Illustration입니다. 기존 Mode / Bend / DC / MMI Kernel을 재사용했습니다. Active의 같은 Differential Phase 비교는 기존 PN Nonlinear Optical Kernel로 계산합니다. 실제 Optimizer / FDTD / Dynamic Chirp / BER / FEC / Net Rate / External Accuracy / Human Learning Acceptance는 NOT VERIFIED입니다.

GitHub CI의 최종 Run / Artifact / Digest는 [PR #25의 최종 CI Receipt](https://github.com/legendnever-collab/Spec-to-Mask/pull/25)에서 확인합니다. 위 결과는 실제 Local QA이며 CI 성공을 미리 주장하지 않습니다.

**PR #25 Draft 유지 · main 병합 금지 · P3 미시작 · 사용자 Play Review에서 중단합니다.**
