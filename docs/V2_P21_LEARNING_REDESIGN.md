# P2.1 — Learning Foundations & Visual Redesign

2026-10-18 · 사용자 P2.1 Work Order를 정본으로 적용합니다. P2를 재개발하지 않으며 P3 / main 병합은 승인되지 않았습니다.

## Recovery

- main: `0537a71a3f05670edc4887a2be21f0a7563f227c`
- P2 Baseline / PR #25: `68d5c9b60f9967f6273c9637fce4bb480bae9e0e`, Open Draft입니다.
- Baseline CI: Production 39085585029, P2 39085585046, P1 39085584997, P0 39085584995가 SUCCESS입니다.
- Baseline HTML SHA256: `06ba8d5219598ac36949ac2c1be6a6033c07277b795396cc1947d7732858f99b`를 Local Byte와 대조했습니다.
- 현재 새 Clone은 Clean이며 이전 Workspace의 미Commit 변경에 접근했다고 주장하지 않습니다. 기존 Artifact를 보존합니다.
- 기존 154 / 511 / 93 / 121 / 111 PASS는 역사적 Baseline이며 새 Build 결과로 승격하지 않습니다.

## 학습 흐름

Overview → Waveguide Tutorial → Learning Roadmap 한 페이지 → Passive 3개 → MZM Intro → 기존 MZM 3개 → P2 Summary에서 중단합니다.

신규 사용자는 Tutorial부터 시작합니다. 기존 사용자는 마지막 학습 위치를 Resume하고 모든 완료 기록을 유지합니다. Overview의 하나의 주요 CTA 외에 More에서 단계 재방문 / Skip / Legacy를 제공합니다. Discover Continue는 최적화 Gate가 없으며 실제 조작 관측 / skipped / unobserved를 분리합니다.

## Reuse / Model Support

| 영역 | 연결과 범위 |
|---|---|
| Tutorial | 기존 LAB.routeLoss / P1 State를 그대로 유지합니다. |
| Width / Mode | KINDS.wg.evaluate와 WGP 테이블을 호출합니다. TE / TM Count와 TE0 Effective Index는 기존 계산입니다. 단면 Geometry는 현재 Width이며 Mode 그림은 Conceptual Illustration입니다. Full-wave Field / Effective Area는 NOT VERIFIED입니다. |
| Splitter / Combiner | 기존 dc는 실제 파장 / Geometry 모델이므로 자유 Split Ratio와 혼합하지 않습니다. 별도 명시적 Ideal lossless 2×2 교육 모델을 사용합니다. Field amplitude √r / √(1−r), Power r / 1−r를 구분합니다. |
| Passive MZI | 위 Ideal coupler와 기존 Width의 TE0 n_eff로 Δφ=2π n_eff ΔL/λ를 계산합니다. 주 Output Port를 constructive convention으로 정의하며 Complement와 합은 1입니다. |
| MZM Intro | 기존 PN / MZM Adapter의 고정 Geometry와 Vdiff 조작을 사용합니다. Intro 자체는 기존 MZM Design을 덮어쓰지 않습니다. |
| MZM 세 실험 | 기존 Adapter / Bench / 계수를 그대로 유지합니다. Phase Drive와 Bias Phase를 분리하며 Active Length ηL을 Geometry와 연결합니다. |

## Save / Identity

smq-learning/1에 optional foundations 필드를 추가합니다. Platform별 입력 / revision / Original / Comparison / 각 Step 관측 기록을 둡니다. 이전 by / mzm는 수정하지 않습니다. Intro의 별도 입력도 foundations 안에 저장합니다. 새 결과를 저장하지 않고 Restore / Reload시 재계산합니다. 모든 Plot / Physical / KPI는 동일 Result Identity를 공유합니다. Theme / Learn / Help는 Design을 바꾸지 않습니다.

## Checkpoints

A: Recovery / 설계 / Acceptance를 먼저 Commit·Push합니다.
B: Overview Illustration / Typography / Color를 구현하고 중간 HTML을 검증합니다.
C: Roadmap / Passive 3개 / Additive Save를 구현하고 중간 HTML / Test를 보존합니다.
D: MZM Intro / Length Phase Accumulation / Voltage·Eye 표시 / Glossary를 구현합니다.
E: 새 HTML의 전체 Regression / Screenshot / Offline / Parity / Hash / CI를 검증하고 Draft PR #25를 갱신합니다.

각 단계 Source / Test / Documentation을 Artifact보다 먼저 저장합니다. 사용자 Play 검토에서 중단하며 학습 효과를 자동 PASS로 주장하지 않습니다.
