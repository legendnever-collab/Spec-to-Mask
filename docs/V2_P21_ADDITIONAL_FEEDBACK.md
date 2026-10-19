# P2.1 Additional Learning Experience — Checkpoints A–E

2026-10-18 · 사용자 추가 Work Order를 적용합니다. Recovery HEAD ac33fbdd53df98be5d9bdc603deb32e077879676 / main 0537a71입니다. 기존 5개 CI SUCCESS와 Local Source 일치를 확인했고 기존 untracked Screenshot / 로그를 보존합니다.

## 구현 순서

A. More의 Learning Navigation / Workspace Settings를 분리하고 Tutorial의 세 선택과 공통 Summary를 먼저 검증·Commit·Push합니다. Skip과 완료를 구분하고 Stage Resume를 보존합니다.
B. Width & Conceptual TE0/TE1 / Bend / Y-branch / Directional Coupler·MMI / Passive Summary를 연결합니다.
C. Passive MZI / PN / Single-arm·Dual-arm / Transfer / Active Summary를 연결합니다.
D. NRZ·PAM4·PAM8 / Same Baud·Raw Rate / Level Gap / 기존 RF·EO 연결을 구현합니다.
E. 전체 흐름 / Desktop·Mobile / Physics·Save Regression / Offline HTML·Parity·SHA256 / CI / Draft PR #25를 갱신합니다.

## Model 경계

기존 KINDS.wg / LAB.routeLoss / PN / MZM Bench / RF·Eye Solver와 계수는 보존합니다. 신규 Field Shape / Y-branch Optimization / MMI Self-imaging / PAM8 Waveform·Eye는 Conceptual Illustration입니다. 실제 Optimizer / FDTD / Eigenmode / PAM8 BER·FEC를 실행했다고 주장하지 않습니다.

Ansys Traveling Wave MZM은 Y-branch 기반 Splitter / Combiner와 두 Arm의 Optical Modulator를 포함합니다. 기존 Ideal 2×2 MZI는 두 Output을 유지하되 Y-branch 2-to-1과 구분합니다. 실제 예제의 수치 재현은 NOT VERIFIED입니다.

- https://optics.ansys.com/hc/en-us/articles/360042328774-Traveling-Wave-Mach-Zehnder-Modulator
- https://optics.ansys.com/hc/en-us/articles/360042800353-Y-branch
- https://optics.ansys.com/hc/en-us/articles/360042305274-Inverse-design-of-y-branch

기술 용어는 English, 설명은 한글로 유지합니다. 새 State는 optional additive migration을 적용합니다. P3 자동 시작 / PR #25 main 병합은 금지합니다. 최종 사용자 Play Review에서 중단합니다.
