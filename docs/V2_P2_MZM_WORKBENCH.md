# P2 — MZM Interactive Physics Workbench

Recommended Model: **GPT-6.1 Sol Work**. 사용자 Work Order: 2026-10-18.

P1 검증 / 병합 후 `feature/v2-p2-mzm-workbench`에서 구현합니다. P2는 Draft PR과 Playable Checkpoint까지 진행하며 main 병합 / P3 시작은 하지 않습니다.

## 학습 경험과 범위

Experience First, Explanation on Demand · One Screen, One Discovery · Discover → Engineer를 유지합니다. 긴 설명은 선택형 Learn Physics로 옮깁니다. 세 Experiment는 같은 Platform별 MZM Design을 이어 사용합니다.

| Experiment | 첫 Control | 관찰할 결과 | Engineering 확장 |
|---|---|---|---|
| Interaction Length | Electrode Length L (mm) | PN Phase Shifter의 Active Length ηL, Vπ / Optical Loss / Phase | Vπ / Loss의 예시 Constraint를 현재 Model로 평가합니다. |
| Voltage & Interference | Applied Differential Voltage (V) | 같은 크기의 Arm Field에서 Phase가 변하고 Combiner 뒤 Power가 재분배됩니다. | 실제 전압 Convention과 Transmission 목표를 구분합니다. |
| RF/EO & PAM4 Eye | Symbol Rate (GBd) | Electrical S21 / EO Frequency Response와 실제 Dynamic Eye가 바뀝니다. | Driver Bandwidth / Open-circuit Drive Vpp / Phase Bias를 추가합니다. |

Discover는 조작 후 현재 Model 결과를 관찰하면 진행합니다. 최적값 / 성능 PASS / Learn 읽기는 필수가 아닙니다. 조작 없는 Continue와 Skip은 unobserved / skipped로 남깁니다. Reference / Restore는 조작 학습으로 집계하지 않습니다.

P3 Link Budget Closure, P4 8-Lane Engine, MRM / EAM / 400G는 이번 구현 범위에 없습니다.

## 재사용할 Model Interface

- `KINDS.pn._x.optical`, `MZM_BENCH.pnAt`의 Live PN Geometry / Local Bias Slope를 사용합니다.
- `KINDS.mzm._x.build`와 `MZM_BENCH.analyse`를 변경하지 않습니다.
- PN Geometry는 Platform의 기존 2-2 Reference, MZM Geometry는 기존 2-3 Reference에서 복사하되 최초 Discover는 L=4.5 mm / 20 GBd / Vdiff=1 V로 시작합니다. 이는 조작과 Interference / 저속 Eye를 보기 위한 Educational Initial Design이며 Reference Solution이나 새 Physics 계수는 아닙니다. `useCard:0`과 명시적인 PN Context로 Global Card 오염을 방지합니다.
- SiN Platform에서도 Active Layer는 Heterogeneous Si PN 가정입니다. Pure SiN Carrier-Depletion Model이라고 표시하지 않습니다.
- `MZM_BENCH` 결과의 `vpi / il / through / pn / samples / transfer / eye`를 같은 Design Identity로 연결합니다.

Local Linearization은 같은 Reverse Bias와 같은 PN Geometry에서 계산한 Differential Slope를 사용합니다. Card의 1 V Secant와 섞지 않습니다.

```text
Vπ = VπL / (η L_mm × 0.1)
L_active = η L_mm
IL = PN.loss × η L_mm + 0.2(1−η)L_mm + 1.0 dB
through = 10^(−IL/10)
dneff/dV = λ_um × 1e−4 / (2 VπL)
Δn_eff,differential = (dneff/dV) × Vdiff
Δφ = π(phaseBias + Vdiff/Vπ)
Pmain/Pin = through × (1 + cos Δφ)/2
Pcomplement/Pin = through − Pmain/Pin
```

Applied Voltage는 **Electrode Differential Voltage**입니다. PN 두 Arm은 Reverse Bias에서 각각 ±Vdiff/2를 봅니다. 이 값은 Eye를 구동하는 **Open-circuit Source Vpp**와 별개입니다. Phase Bias는 Optical Differential Phase이며 PN Reverse Bias와 다릅니다.

유효 PN Reverse Bias 범위는 기존 0–3 V입니다. Large-signal PN Dynamics / Voltage-dependent Loss를 새로 발명하지 않습니다. 범위를 벗어나면 해당 관찰을 지원하지 않는다고 표시합니다. Static Transfer의 Ideal Equal-arm / 50:50 Coupler 가정과 PN / Fixed Optical Loss를 포함한 실제 Educational Model을 함께 설명합니다.

## RF/EO와 Eye 경계

- Electrical S21은 50 Ω Two-port, EO는 Junction Voltage의 Optical-frame Integral을 DC로 정규화한 결과입니다. 두 곡선을 같은 물리량으로 부르지 않습니다.
- Driver는 기존 2nd-order Butterworth, CPW / Junction RC / EO와 Cosine Transfer를 사용합니다.
- 기존 `dynamicEye`의 256 Symbols / 16 Samples per UI / Seed / Best Vertical Gap과 240 GHz Cutoff를 유지합니다. Eye 그림은 계산된 Trace를 그립니다.
- 112 GBd PAM4 = **224 Gb/s raw**입니다. Net 200G / BER / FEC / IEEE Compliance는 NOT VERIFIED입니다.
- Noise / Jitter / Receiver / CDR / Equalizer는 미포함입니다. Null Gap / Non-monotonic Levels / PN Domain 위반은 N/A / NOT VERIFIED로 표시하며 0 또는 PASS로 대체하지 않습니다.
- Model Consistency와 외부 정확도 검증은 다릅니다. Measurement / Full-wave / Foundry 검증은 수행하지 않았습니다.

## State / Identity / Save

기존 `smq-learning/1`, `smq-v2-learning`을 Additive하게 확장합니다. P1의 `by`와 Completion을 보존하며 별도의 `mzm` Platform Workspace를 추가합니다. 기존 Backup은 이 필드 없이도 읽습니다. PR #23 Journey와 Legacy Namespace는 그대로 보존합니다.

Design ID / Revision / Platform / Wavelength / PN Geometry·Source / MZM Geometry / Bench Settings / Applied Voltage / Model Signature를 Canonical Identity에 넣습니다. Mode / Learn / Theme는 Physical Identity에서 제외합니다.

Input 시 결과를 즉시 Stale 처리하고 계산 요청을 Coalesce합니다. Snapshot 결과를 받아도 최신 Request / Identity가 아니면 폐기합니다. Voltage-only 변경은 같은 Bench 조건의 결과를 캐시하고 같은 Transfer Function의 Operating Point를 계산할 수 있습니다. 캐시와 과거 PASS는 서로 다른 개념입니다.

Original은 보호된 최초 Input Snapshot, Comparison은 명시적으로 Capture한 Input Snapshot입니다. Restore / Reference Apply는 새 Revision으로 재계산합니다. Reload / Backup Restore는 Input / History만 복구하고 결과는 다시 계산합니다. 유효한 Checksum이어도 잘못된 P2 구조는 Restore를 거절합니다.

## Checkpoint와 Test Plan

| Checkpoint | 완료 조건 |
|---|---|
| A | P1 병합 / Main CI 상태 기록, Adapter Interface / Reuse Map / Test Plan, Source 우선 저장합니다. |
| B | Length Sweep에서 VπL / Loss / Phase 일치, Physical Length 변경, Desktop / Mobile을 검증합니다. |
| C | Transfer Curve / Operating Point / 두 Arm Phase / Power Conservation, Comparison / Original을 검증합니다. |
| D | 동일 Bench / PN / Design의 RF/EO / Dynamic Eye, Rate / Driver / Bias 변화와 Unsupported를 검증합니다. |
| E | 세 Experiment Flow, P1 / Legacy / MZM / Lab / Backup / Four Platform Regression, Offline Parity / SHA256 / CI / Screenshot / Draft PR을 제공합니다. |

Model Test에는 4 Platform, L=.5/2/3/6 mm, PN Slope, Phase / Power Conservation, Source와 Electrode 구분, Seed 재현성, Invalid / Late Result / Design Collision / Restore / Migration / Backup를 포함합니다. Browser는 1440×900 / 1366×768 / 390×844 / 320×568 × Light/Dark와 Discover / Engineer, Numeric / Keyboard / Learn / Backup / Reload를 검사합니다.

Human Learning Acceptance와 2–3분 학습 효율은 자동 검증할 수 없으며 사용자 Play Review까지 NOT VERIFIED입니다.

## 최종 구현 / Checkpoint E

| 역할 | 실제 Source |
|---|---|
| Validation / Migration | `src/v2/schema.js`에서 P1 Save를 허용하고 P2 Input / Snapshot / History를 추가 검사합니다. |
| Adapter | `src/v2/mzm.js`에서 기존 Bench를 호출하고 같은 Local PN / Static Transfer / Loss를 연결합니다. |
| Workbench / Plot / Learn | `src/v2/mzm_ui.js`, `src/v2/mzm.css`에서 세 Experiment를 제공합니다. |
| P1 Shell / Backup / Theme | `src/v2/ui.js`의 기존 Shell을 확장합니다. |
| Tests / CI | `test/t_v2_p2.js`, `test/browser/v2_p2.js`, `.github/workflows/v2-p2.yml`에서 검증합니다. |
| Delivery | `dist/spec-to-mask-v2.0.0-alpha.2-p2.html`, `artifacts/v2-p2/QA.md`, `verification.json`, `SHA256SUMS`를 제공합니다. |

Input 변경 시 이전 View / Target을 즉시 무효화하고, Blank Draft는 Mode를 바꿔도 유지합니다. Original / Comparison 복원과 Reference Apply는 명시적인 새 Revision으로 처리합니다. Unsupported PN의 Phase Vector / Effective Index Change는 유효 수치로 표시하지 않습니다.

최종 Local 검증은 Model / State 154, Browser 511 PASS입니다. 실제 Touch Event를 390×844 / 320×568에서 확인했습니다. External Accuracy / Net 200G / Human Play Acceptance는 NOT VERIFIED입니다. CI의 최종 상태는 Draft PR에서 같은 HEAD를 기준으로 확인합니다.
