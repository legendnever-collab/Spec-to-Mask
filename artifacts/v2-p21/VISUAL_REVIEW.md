# P2.1 Screenshot 검토 기록

2026-10-18 · Actual 100% Browser Screenshot을 직접 검토했습니다. Final Browser는 Chromium 151.0.7922.34이며 SMQ_HTML은 최종 Canonical입니다.

- Overview / Roadmap / Width / Splitter / Path / Intro: 1440×900 / 1366×768 / 390×844 / 320×568 × Light/Dark를 자동 측정했습니다. Pairwise SVG Label Collision은 검사 범위에서 0입니다.
- MZM Length / Voltage / Eye: 동일 Viewport × Theme × Discover/Engineer로 검증했습니다. 기존 511 Assertions를 모두 보존했습니다.
- 실제로 열어 본 대표 화면: Light Overview 1440×900, Dark Engineer Length 1366×768, Light Length 320×568, Dark Path 390×844와 Font 3종 Light/Dark Specimen입니다. 이 대표 검토를 모든 픽셀에 대한 사람의 전수검사로 주장하지 않습니다.
- 320px Label을 작게 축소하던 세로 ViewBox를 가로 비율로 조정했습니다. Physical Geometry / Active Region / Total Phase / Voltage-induced Phase를 구분했습니다.
- Body 17 / Secondary 15 / Caption 14 / KPI 28 px의 공통 Token을 사용하며 Mobile은 해당 Token을 조정합니다. SVG는 Responsive Scale의 영향을 받으므로 DOM Font-size만으로 시각 가독성을 승인하지 않았습니다.
- Font 실제 비교: Nanum은 Greek Fallback에 의존했고 Pretendard / Noto는 지원했습니다. 최종 Pretendard Subset Corpus 누락은 0입니다.
- 주요 Ink / Muted / Focus / Active Text Pair의 4.5:1 이상 Contrast를 계산했습니다. 전체 WCAG / Screen Reader Audit와 Native Browser UI 200% Zoom은 별도 미검증입니다.
- Human Learning Acceptance는 사용자 Play에서 확인합니다. 모델 기반 시각 검사는 학습 효과의 증명이 아닙니다.

최종 CI가 생성하는 `v2-p21-foundations-evidence`, `v2-p2-mzm-evidence`, `v2-p1-waveguide-evidence`에서 Screenshot과 Bounds / Assertion JSON을 확인합니다.
