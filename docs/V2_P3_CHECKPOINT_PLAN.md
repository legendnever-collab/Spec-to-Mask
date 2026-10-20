# P3 — Incremental Checkpoint Plan

> **P3.1 실행 승인 — 2026-10-20 KST:** 사용자가 P3.1 Single Lane Assembly의 구현 / 검증 / Offline HTML / PR #26 갱신을 승인했습니다. P3.1 구현은 [QA](../artifacts/v2-p31/QA.md)와 Checkpoint Log에서 추적합니다. 아래 P3.0 Audit / 설계 기록은 보존하며 최신 사용자 지시가 우선합니다. P3.2–P3.4 / main Merge / P4는 승인되지 않았습니다.


2026-10-20 KST · Baseline `c98998c7d7586716a34cd8386180b6b76580a2c3`.

**이번 승인은 P3.0 문서 작성 / GitHub 저장까지만입니다. P3.1–P3.4는 아래 계획이며 미구현입니다.** 각 Checkpoint의 개발 시작 승인, Play Acceptance, main Merge 승인은 별도로 기록합니다. Next를 누르거나 CI가 성공한 사실은 사용자 승인으로 대신하지 않습니다.

정본: [Architecture](V2_P3_ARCHITECTURE.md) · [Model Contract](V2_P3_MODEL_CONTRACT.md) · [Next Task](V2_P3_NEXT_TASK.md).

## P3.0 — Architecture & Model Contract

1. **Learning Question:** 기존 Component가 하나의 200G-class Lane으로 연결될 때 어떤 계산은 재사용하고 어떤 주장은 아직 할 수 없을까요?
2. **Reused Model:** PN / TW-MZM / Bench / ELS / PD / XCVR 및 기존 Identity / Save / Tests를 읽고 Audit합니다. Runtime에는 연결하지 않습니다.
3. **New Implementation Scope:** 네 개 설계 문서, Checkpoint Log와 최신 승인 상태의 문서 갱신, 문서 전용 Commit / Draft PR만 수행합니다.
4. **Physics Validation Criteria:** Contract의 Unit / OMA Plane / Source Voltage / RF vs EO / Raw Rate / Receiver λ·FFE·Noise의 충돌을 명시합니다. 이번 실제 검증은 기존 MZM 111 checks, Build / Canonical Parity / Syntax이며 P3 Test는 없습니다.
5. **Playable HTML Scope:** 새 파일이 없습니다. 기존 P2.2 Canonical / index의 SHA256 `b1f9bfa1b49abb9000b279f224dd80e0c66413f9511fd4f5bb9e45b030631351`과 Source Rebuild Parity를 확인했습니다.
6. **User Play Review Criteria:** P3.0은 플레이 변경이 없으므로 문서 Review입니다. 사용자는 P3.1의 Tx-only 범위, 112 GBd / 224 raw 표기, 후속 단계의 경계를 확인합니다. 이번 Work에서 P3.1 승인으로 간주하지 않습니다.
7. **Next Checkpoint Prerequisites:** 네 문서와 Receipt가 GitHub에 저장되고 Draft PR / SHA를 확인한 뒤 **사용자가 P3.1 개발을 승인**해야 합니다. [P3.1 지시문](V2_P3_NEXT_TASK.md)을 다음 Work에 사용합니다.

## P3.1 — 200G Lane Assembly

1. **Learning Question:** 내가 조정한 PN / MZM이 어떻게 하나의 Tx Lane에서 Phase·Power·Raw PAM4 Eye를 만들까요?
2. **Reused Model:** `SMQ_V2_MZM.evaluate` → `MZM_BENCH.analyse` → 기존 PN / Loaded CPW / Driver / Transfer / Raw Eye를 재사용합니다. P2의 Snapshot / Identity / Schema / Backup 패턴을 확장합니다.
3. **New Implementation Scope:** Lane Chapter의 독립 State / Snapshot Import / Original·Comparison, 작은 Assembly UI와 연결된 기존 Tx Result를 만듭니다. Fresh Lane은 Reference / Import는 P2 Input을 복사합니다. Target은 112 GBd PAM4이나 Imported Baud는 자동 변경하지 않습니다. Laser / Fiber / Rx는 미계산 Block입니다. 절대 Laser Budget / Sensitivity / BER / 새 Solver는 추가하지 않습니다.
4. **Physics Validation Criteria:** Contract C01–C05를 만족합니다. 4 Platform에서 기존 Tx 출력 일치, Source Divider, Phase / Power Bounds, Raw Rate, PN Domain / Folded Level Invalid, Stale Request / Edit / Restore / Platform Identity를 확인합니다. P2 원본과 Legacy Card / Score / Model Bytes를 보존합니다.
5. **Playable HTML Scope:** 기존 P2.2 전체 + 새 Tx Lane Assembly만 제공합니다. Source / Test Commit 이후 별도 Build Artifact Commit으로 Versioned Offline HTML / SHA256 / Parity를 게시합니다. 새 Chapter의 첫 조작은 Length이며 Applied Voltage / RF·Eye 상세는 같은 Tx Context에서 펼칩니다. Desktop 1440×900·1366×768, Mobile 390×844·320×568 / Light·Dark를 확인합니다.
6. **User Play Review Criteria:** 사용자가 현재 Lane / MZM 위치를 찾고, Length를 바꿔 Phase·Vπ·Loss·Raw Eye의 변화를 같은 화면에서 관찰할 수 있어야 합니다. Source Vpp와 Junction Voltage, 224 raw와 미검증 net200G를 구분할 수 있어야 합니다. P2 Import / Original / Session Resume가 이해 가능해야 합니다. Lane Link PASS는 표시하지 않습니다.
7. **Next Checkpoint Prerequisites:** Source / Artifact SHA와 Gate 결과 기록, P3.1 사용자 Play Acceptance, **P3.2 개발에 대한 명시적 승인**이 필요합니다. Feedback이 있으면 같은 Checkpoint를 고치고 중단합니다.

## P3.2 — Optical Link Budget

1. **Learning Question:** Laser Power와 Optical Loss가 MZM Input / Tx Output / PD Input의 OMA를 어떻게 바꿀까요?
2. **Reused Model:** 같은 Lane Tx Result / through / Settled Levels를 재사용합니다. ELS / XCVR의 실제 dB Ledger를 Source Reference로 읽되 닫힌 Legacy WDM / 8-Lane 분석을 Single Lane Solver로 쓰지 않습니다.
3. **New Implementation Scope:** Contract A–F의 Scalar Power Ledger와 한 개 Laser Power Control / 한 개 Loss Control, Plane별 Power·OMA / Term Provenance를 추가합니다. MZM Transfer는 재계산 결과를 재사용하고 Pmod로 한 번 Scaling합니다. Passive Loss는 명시한 가정 입력입니다. MZM IL / Coupling / Channel의 중복 차감을 막습니다. TPA / RIN / WPE / Sharing / Fiber Dispersion / 새 Penalty는 기본 범위에 포함하지 않습니다. Receiver는 미계산입니다.
4. **Physics Validation Criteria:** C06–C07 및 C01–C05의 영향 범위를 확인합니다. dBm↔mW, 3 dB Scaling, 고정 Linear Model의 Laser +1 dB / Loss +1 dB, OMA Outer vs Average, Zero / Negative / NaN, Loss Owner와 Plane의 일치를 검증합니다. Source 전력에 따른 실제 Nonlinear 정확도는 미검증입니다. 새 Penalty가 꼭 필요할 때만 A3를 검토합니다.
5. **Playable HTML Scope:** P3.1 + Absolute Power / OMA Ledger입니다. Receiver Sensitivity / Link Margin은 `null` / “P3.3에서 확인합니다”로 표시합니다. 새 HTML / SHA / Source Parity를 별도 Artifact로 제공합니다.
6. **User Play Review Criteria:** 사용자가 Laser를 +1 dB 올릴 때와 Channel Loss를 +1 dB 늘릴 때 영향을 받는 Plane을 설명할 수 있어야 합니다. 변조 전 CW Power와 변조 후 OMA가 다른 값임을 알 수 있어야 합니다. Current / Comparison의 Ledger가 같은 Revision / Plane 기준임을 확인합니다.
7. **Next Checkpoint Prerequisites:** P3.2 사용자 Play Acceptance와 **P3.3 개발 승인**, Receiver A1 Review 또는 미해결 시 Response-only 제한에 대한 명시적 Scope 결정이 필요합니다. Cascaded Quality는 별도 승인 없으면 계속 제외합니다.

## P3.3 — Receiver & PAM4 Quality

1. **Learning Question:** 같은 Incident OMA라도 PD Geometry / Bandwidth / Noise Assumption이 달라지면 왜 Receiver Reference가 달라질까요?
2. **Reused Model:** 기존 `pd._x.analyse`의 Responsivity / Absorption / Transit / RC / Hpd / TIA / Standalone FFE Sensitivity와 P3 Tx Raw Eye를 각각 재사용합니다. 두 Eye를 같은 Cascaded Waveform으로 합치지 않습니다.
3. **New Implementation Scope:** PD Geometry Control, λ Policy와 112 GBd / Q / FFE / Noise 조건을 명시한 Receiver Reference를 추가합니다. Default Single Lane은 Local `pf.ch=[lane λ]` Context를 제안하되 Legacy Result는 보존합니다. Context가 맞으면 Ideal-incident Reference Margin만 표시하고 End-to-end Margin / BER / FEC는 미검증으로 둡니다. A1 미해결이면 Device Response만 구현합니다. **Waveform Export / Cascaded PD / 단일 FFE 모델은 A2 검토와 별도 사용자 승인 후에만 추가 계획**합니다.
4. **Physics Validation Criteria:** C08–C09, Responsivity / CT / Transit / RC / λ 선택의 기존 Model 일치를 확인합니다. 100 GBd·NRZ·λ 불일치에서 Reference Sensitivity Margin을 계산하지 않고, FFE·Noise Basis를 명시합니다. Raw Tx Gap / PD-only FFE Ratio / OMA Sensitivity를 혼용하거나 Penalty를 두 번 차감하지 않습니다. Q=3.49를 실측 BER로 주장하지 않습니다.
5. **Playable HTML Scope:** P3.2 + PD / TIA Response와 별도 Receiver Reference / Assumption Panel입니다. Raw Tx Eye와 Rx-only Reference Eye에 서로 다른 제목·Unit·Basis를 붙입니다. 실제 Received Eye라는 제목은 Cascaded Model 없이는 사용하지 않습니다.
6. **User Play Review Criteria:** PD를 길게 만들 때 Absorption 증가와 Capacitance / Bandwidth Trade-off를 같은 화면에서 관찰할 수 있어야 합니다. 사용자가 Raw Eye가 열려도 BER / FEC PASS가 아니며, 양의 Reference Budget도 실제 End-to-end Closure가 아님을 구분할 수 있어야 합니다.
7. **Next Checkpoint Prerequisites:** P3.3 사용자 Play Acceptance / **P3.4 개발 승인**, 검토된 Assumption과 미검증 목록, 남은 Blocker의 명시적 처리 결정이 필요합니다. Cascaded Quality가 없다는 사실을 숨기고 P3.4 Closure로 넘어가지 않습니다.

## P3.4 — Engineering Closure & Final QA

1. **Learning Question:** 내가 만든 Lane에서 어떤 Engineering Evidence가 현재 유효하고, 무엇을 더 검증해야 실제 Link라고 말할 수 있을까요?
2. **Reused Model:** P3.1–P3.3의 같은 Lane Result / Budget / Receiver Reference / Identity를 재사용합니다. 기존 P1–P2.2 / Legacy / Save / Offline / CI / Build Gate를 그대로 적용합니다.
3. **New Implementation Scope:** Current Design Evidence Summary, Assumption / Unsupported List, Original·Comparison / Export / Resume / Summary 연결과 실제 QA만 마무리합니다. 새 Physics / 8-Lane / P4는 추가하지 않습니다. Engineering Closure는 지원된 Model Target의 Closeout이며 Unsupported 항목이 있는 실제 Link는 미검증입니다. 목표 수치는 구현 Model / 유효 조건에서 도출하고 임의 Spec을 입력해 PASS를 만들지 않습니다.
4. **Physics Validation Criteria:** C10과 남은 C01–C09를 적용하고 실제 구현한 항목만 결과를 기록합니다. Contract / Input / Result Identity / Report / Build가 일치해야 합니다. P2.2 MMI Fail / Material Domain / PN / Raw Eye / BER-FEC 제한을 보존합니다. Remote CI와 Local / User Play를 각각 기록합니다.
5. **Playable HTML Scope:** 승인된 P3 Runtime만 포함한 Final Offline HTML, Source ZIP / QA / SHA256 Manifest입니다. Source Commit과 Binary Artifact를 분리하고 ZIP / Screenshot은 Actions Artifact를 우선합니다. 기존 P2.2 HTML은 보존합니다.
6. **User Play Review Criteria:** 사용자 혼자 P2 Import 또는 새 Lane에서 시작해 Budget / Receiver Reference까지 탐색·저장·복원하고 주요 Trade-off와 미검증 항목을 설명할 수 있어야 합니다. Summary의 근거가 현재 Revision과 연결돼야 하며 unsupported 수치가 PASS가 되면 실패입니다.
7. **Next Checkpoint Prerequisites:** P3.4 Play Acceptance 뒤에도 **main Merge는 별도 승인**을 받아야 합니다. P4는 새 Work Order로만 시작합니다. 이 계획은 P3 Merge / P4 자동 시작을 승인하지 않습니다.

## 공통 Source / Test / Artifact / Token Policy

각 구현 Work는 짧은 Recovery → 관련 Source Diff → 작은 Adapter / Test → 관련 Gate → Source/Test/Docs Commit·Push → Build/Artifact → QA Receipt → 사용자 Play에서 중단하는 순서입니다. 소스가 동결되기 전 전체 Screenshot / Binary Packaging을 반복하지 않습니다.

새 `test/t_v2_p3.js`, `test/browser/v2_p3.js` 등의 이름은 **예정된 Test 이름**입니다. 현재 파일·script가 있는 것처럼 실행 결과를 쓰지 않습니다. 구현하면서 기존 `test:v2`, `test:v2:p2`, `test:v2:p21`, `test:v2:learning`, `test:v2:p22`, `test:mzm-bench`와 영향받은 Browser / Backup / Studio Gate를 선택합니다. Final QA는 CI가 요구하는 전체 Gate를 수행합니다. 같은 Source / Build의 성공 Gate를 이유 없이 재실행하지 않으며 Failure / Change가 있으면 영향 범위만 다시 확인합니다.

Source SHA, Artifact SHA / HTML SHA256, Test Command / Count / Environment, CI Run / Conclusion, Unsupported / FAIL / Play Status와 Next Approval을 Log에 남깁니다. Archive의 성공 숫자를 현재 Checkpoint의 신규 검증으로 옮기지 않습니다. 문서만 변경한 P3.0에서는 새 Browser / Physics Regression을 중복 실행하지 않습니다.
