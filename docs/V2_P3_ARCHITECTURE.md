# P3.0 — Architecture & Model Reuse Audit

> **P3.1 실행 승인 — 2026-10-20 KST:** 사용자가 P3.1 Single Lane Assembly의 구현 / 검증 / Offline HTML / PR #26 갱신을 승인했습니다. P3.1 구현은 [QA](../artifacts/v2-p31/QA.md)와 Checkpoint Log에서 추적합니다. 아래 P3.0 Audit / 설계 기록은 보존하며 최신 사용자 지시가 우선합니다. P3.2–P3.4 / main Merge / P4는 승인되지 않았습니다.


2026-10-20 KST · **P3.0 문서 설계만 승인됐습니다. P3.1–P3.4는 미구현 / 승인 대기입니다.**

정본: [Model Contract](V2_P3_MODEL_CONTRACT.md) · [Checkpoint Plan](V2_P3_CHECKPOINT_PLAN.md) · [P3.1 Next Task](V2_P3_NEXT_TASK.md) · [Checkpoint Log](V2_CHECKPOINT_LOG.md).

## 1. Recovery Receipt

| 확인 대상 | 실제 확인 결과 |
|---|---|
| Repository / main | `legendnever-collab/Spec-to-Mask` / `c98998c7d7586716a34cd8386180b6b76580a2c3` |
| PR #25 | `merged=true`, Merge SHA가 main과 일치합니다. Merge 시각은 2026-10-19 21:15:16 UTC입니다. |
| Local | 이번 Scratch에는 기존 Checkout이 없었습니다. Repository를 Clone했고 최초 `git status --porcelain=v1`은 비어 있었습니다. 다른 Session의 미저장 Local 변경은 확인하지 못했습니다. Reset / 삭제는 하지 않았습니다. |
| P3 Branch | Remote 조회 시 `feature/v2-p3-200g-lane`은 없었습니다. 확인한 main에서 새 Local Branch를 만들었습니다. |
| main CI | [Run 39326037439](https://github.com/legendnever-collab/Spec-to-Mask/actions/runs/39326037439) `completed/success`입니다. Build + Regression + GDS 및 Offline Studio Browser Check가 SUCCESS, Release Matrix / Artifact는 main push 조건에서 SKIPPED입니다. 과거 Artifact HEAD의 상태 API 불일치를 이번 main 결과와 혼합하지 않습니다. |
| Playable HTML | `dist/spec-to-mask-v2.0.0-alpha.4-p22-physics.html`과 `dist/index.html`이 같은 Git Blob `ce30c94e4cafa89c18074e4eb8d7a6d0351c6a74` / SHA256 `b1f9bfa1b49abb9000b279f224dd80e0c66413f9511fd4f5bb9e45b030631351`입니다. |
| 이번 Local 확인 | `npm run build`, `node tools/check_rc.js`, `npm run test:syntax`(112 files + script), `npm run test:mzm-bench`(111 checks)를 실행해 통과했습니다. Build 후 tracked Runtime / HTML 변경은 없습니다. Node v24.19.0이며 CI는 Node 22입니다. |
| 이번에 하지 않은 검증 | 새 Browser / 전체 Regression / 외부 Solver 검증은 실행하지 않았습니다. P3 Runtime과 새 HTML을 만들지 않았습니다. 기존 QA Counts는 `artifacts/v2-p22/QA.md`의 Historical Evidence입니다. |

P2.2 병합 승인은 확인된 사실입니다. 기존 문서의 “P2 미병합 / P3 미승인”은 당시 기록으로 보존합니다. 이번 승인은 **P3.0 Audit / Contract / Planning / Draft PR**까지이며 P3 구현·main 병합 승인으로 확장하지 않습니다.

## 2. Source Audit / Classification

Classification은 파일 전체의 정확도 등급이 아닌, P3에서의 사용 방법입니다. REUSE여도 외부 정확도가 검증됐다는 뜻은 아닙니다.

| Source / 실제 Entry Point | 분류 | P3 사용 / 발견한 경계 |
|---|---|---|
| `src/kinds/pn.js`: `KINDS.pn._x.analyse/optical/mode` | REUSE | 기존 Abrupt PN / EIM / Soref 계산을 보존합니다. `analyse`는 1 V Secant VπL, `optical`은 해당 Bias의 dn / alpha입니다. SiN에서도 Active Layer는 Heterogeneous Si입니다. |
| `src/kinds/mzm.js`: `_x.build/analyse`, `card` | REUSE | Loaded CPW / Junction RC / Reflection을 보존합니다. Legacy `analyse`는 13 dBm / 112 GBd / 70 GHz Driver와 5-tap FFE Penalty를 내장하므로 새 Lane의 관찰 경로로 직접 대체하지 않습니다. |
| `src/bench/mzm.js`: `MZM_BENCH.analyse/pnAt/dynamicEye` | REUSE | P3 Tx의 유일한 정량 경로입니다. 기존 `mzm-bench/2`를 사용합니다. Source Vpp, Optical Bias, Live PN, Driver, RF/EO와 Raw Eye의 의미가 이미 분리돼 있습니다. |
| `src/v2/mzm.js`: `SMQ_V2_MZM.evaluate/payload/matches` | ADAPT | 기존 Identity / Reference / Workspace 패턴을 사용합니다. P3 소유 Lane State에서 기존 Tx Evaluator를 호출하며 P2 Design을 몰래 변경하지 않습니다. |
| `src/kinds/els.js`: `KINDS.els._x.analyse/parts` | ADAPT / VALIDATE | Laser Sharing, dB Ledger, WPE / Feedback은 Reference로 재사용 가능합니다. 현재 Solver는 Laser→Chip SSC + Tx/Rx SSC + Mux/Demux와 고정 Channel, 200G Energy Denominator를 가진 닫힌 Link입니다. Single Lane에 호출해 Mux를 그림에서만 지우는 연결은 금지합니다. |
| `src/kinds/pd.js`: `KINDS.pd._x.analyse` | REUSE / VALIDATE | Responsivity, Transit / RC, PD×TIA Ht를 재사용합니다. Sensitivity는 고정 112 GBd / Q=3.49 / 5-tap FFE / TIA Noise 근사이며 `sens`는 µW OMA_outer입니다. `pf.ch` 중 최악 Absorption 파장을 자동 선택합니다. |
| `src/kinds/xcvr.js`: `_x.analyse/parts` | REUSE (Legacy Reference) / VALIDATE | 8 Lane, Temperature Corners, Packaging Penalty, nominal 1.6 Tb/s 전력 분모를 가진 P4 Reference입니다. P3 Single Lane의 권위 Solver로 호출하거나 전체 전력을 8로 나눠 인증하지 않습니다. |
| `src/util.js`: `pam4Eye`, `fftInPlace`, `cx` | REUSE / VALIDATE | Legacy Eye는 128 symbols / 5-tap FFE + Noise Enhancement가 있으며 Bench Raw Eye와 다릅니다. 같은 Plot / Penalty 이름으로 섞지 않습니다. |
| `src/v2/schema.js`, `core.js`, `src/persist.js` | ADAPT | 기존 Revision / Optional State / Full Backup / Restore / Quarantine을 확장합니다. 신규 Key보다 기존 `smq-v2-learning` 내부 Optional Lane State를 우선합니다. |
| P3 Lane State / Port Ledger / Discovery UI | NEW (Composition) | 기존 Model 호출과 Unit 변환 / State 소유권 / Learning Flow만 새로 구성합니다. 새 Maxwell / Carrier Solver는 만들지 않습니다. |
| Tx Optical Waveform → PD / TIA → 단일 FFE Chain | NEW / VALIDATE | 현재 Bench는 full waveform을 공개하지 않고 Traces / Group Summary만 반환합니다. FFE를 두 번 적용하지 않는 중간 Waveform Interface가 필요하며 P3.3 별도 승인·검토 전 구현하지 않습니다. |
| BER / FEC / Net 200G / TDECQ Compliance / Measured Receiver / EAM / 400G | UNSUPPORTED | 이번 Source로 End-to-end 검증할 수 없습니다. `null` + Reason을 유지합니다. |

## 3. Target Architecture / Ownership

P3는 **200G-class MZM Single Lane**을 배우는 Chapter입니다. Target Profile은 112 GBd PAM4 / 224 Gb/s raw이며 net200G는 미검증입니다. P4의 8-Lane Engine은 이번 범위 밖입니다.

물리 순서는 CW Laser → Tx Input Coupling → MZM → Tx Output Coupling → Scalar Channel → Rx Input Coupling → Ge PD / TIA입니다. Electrical Branch는 Source Open-circuit Vpp → Driver → Loaded CPW / PN → MZM입니다. Optical Phase Bias와 PN Reverse Bias를 독립 Input으로 유지합니다. Mux / Demux / Laser Sharing / TEC는 P3 기본 Single Lane에 추가하지 않습니다.

P3.1에서는 Tx만 실제 계산하며 Laser / Channel / Rx는 **후속 Checkpoint의 미계산 Block**으로 명확히 표시합니다. 이어지는 P3.2에서 절대 Optical Power Ledger, P3.3에서 Receiver Reference를 연결합니다. Preview Block은 Done / PASS 근거가 아닙니다.

`LaneInput → 기존 Tx Evaluator → LaneResult Identity → Canvas / Plot / KPI`를 한 경로로 유지합니다. P3는 `lane[platform]`의 독립 State를 소유하고, P2 가져오기는 명시적인 Snapshot Copy로만 수행합니다. P2 / Intro / Legacy Card를 Live Global 참조로 연결하지 않습니다. Waveguide / Passive / Active / P2 완료 기록은 자동 재수상하지 않습니다.

Desktop은 Canvas / Live Plot와 우측 Tune을 같은 Viewport에 배치합니다. 첫 화면은 한 질문, 주 Control 하나와 KPI 최대 세 개로 시작합니다. Mobile은 Canvas / 핵심 KPI / Control 순서를 유지합니다. 상단은 Home / Session / 종료를 보존하며 상세 Equation / Model Limit는 Learn Physics로 제공합니다. Technical Term은 English, 설명은 한글입니다.

## 4. 핵심 Integration 결정

1. Live PN은 `MZM_BENCH.pnAt`의 Bias-local Slope를 사용합니다. Legacy Card의 1 V Secant를 같은 값으로 취급하지 않습니다.
2. Optical Power는 MZM 입력면을 기준으로 Bench `P/Pin`을 mW로 한 번 Scaling합니다. Tx IL은 Bench `through` 안에 이미 있으므로 별도 Budget에서 재차 빼지 않습니다.
3. ELS / XCVR의 완성된 Legacy Link를 새 Lane Solver로 포장하지 않습니다. P3.2의 새 작업은 Port Composition / Arithmetic이며 새 Device Physics가 아닙니다. 추가 TPA / Feedback / WPE Model을 넣으려면 별도 명세·승인이 필요합니다.
4. P3.3의 최소 범위는 PD / TIA의 Device Response와 조건을 명시한 Standalone Sensitivity입니다. End-to-end Waveform / BER / FEC는 자동 추가하지 않습니다. Reference Budget과 실제 Cascaded Quality를 별도 필드로 유지합니다.
5. P3.1–P3.4는 각 Work에서 하나만 구현합니다. 다음 진입은 실제 사용자 승인 기록을 요구합니다. CI SUCCESS는 Play 승인이나 Merge 승인을 대체하지 않습니다.

## 5. 보존할 Known Limitations

- P2.2 MMI Raw Port Overlap 합 1.008418과 Si1310 Imbalance 0.000920이 보고됐습니다. Conservation / Symmetry는 해당 Cases에서 FAIL, UI는 NOT VERIFIED입니다. 재정규화하거나 해결됐다고 기록하지 않습니다. P3 Budget의 Splitter로 검증되지 않은 MMI를 암묵 사용하지 않습니다.
- Mode Field는 exact sampled width에서만 지원합니다. SiN cutoff/table mismatch, TM mesh/window sensitivity, Full-vector 정확도 제한을 보존합니다.
- IOX / LDW / Polymer의 정량 Bend Library / Full Parameter Set은 미확보입니다. Fixed Geometry Loss도 Unsupported입니다.
- PN은 1D Abrupt Junction / Perturbative EIM, MZM은 Local Linearized Phase / Equal Arm / Fixed Loss입니다. Forward Bias / Breakdown / Large-signal Carrier Dynamics / Chirp / Full RF EM은 미검증입니다.
- Bench Raw Eye는 256-symbol periodic pattern / 16 samples/UI / Seeded이며 No Noise / FFE / CDR / BER입니다. 240 GHz 위는 Truncated입니다. Best Gap은 측정 Eye나 CDR 최적점의 보증이 아닙니다.
- Legacy PD의 Q / Noise / FFE와 ELS / XCVR Penalty는 근사입니다. Sensitivity 숫자만으로 표준 적합성이나 End-to-end BER를 주장하지 않습니다.

## 6. Token-Efficient 운영

다음 Work는 이 네 문서와 Log의 최신 Receipt, 변경한 Entry Point만 읽습니다. 위 Audit를 처음부터 반복하지 않고 `git diff <audited SHA>..HEAD -- <relevant paths>`로 달라진 곳만 조사합니다. Baseline / CI / Git Status는 매번 짧게 확인합니다.

Source / Test / Documentation을 먼저 Commit·Push하고 HTML / Screenshot / ZIP은 후속 Artifact Commit 또는 Actions Artifact로 분리합니다. 같은 Blob을 반복 Encode하지 않습니다. 같은 SHA / Build / Environment의 성공 검증은 재사용하고 새로운 변경·실패가 있을 때만 관련 Gate를 반복합니다. P3.0은 문서 전용이므로 새 Screenshot / ZIP / HTML이 없습니다.

Astra는 [Contract §8](V2_P3_MODEL_CONTRACT.md#8-astra-review-questions)의 제한된 Physics Question만 검토합니다. 전체 Repository / UI / 이미 통과한 Test를 다시 설계하도록 요청하지 않습니다. P3.1의 State / UI Adapter는 Sol에서 진행할 수 있으나 **이번 Work에서는 시작하지 않습니다.**

## 7. 첨부 자료 확인 범위

이번 Audit에서 첨부 `AI_Optical_Interconnect_200G_to_400G_Technical_Report_Claude.docx`와 `AI_DC_Connectivity_CPO_Technical_Report_20260905(1).docx`의 Rate / FEC / OMA 관련 문단을 확인했습니다. 문서가 구분하는 Service Rate / Raw Rate, Average Power / OMA / Sensitivity의 구분을 Contract에 반영했습니다. 첨부 보고서나 그림을 Calibration Data / 독립 Solver 검증으로 사용하지 않았습니다. 다른 첨부 전체의 검토 완료를 주장하지 않습니다. 이번 Contract의 실제 구현 근거는 위에 명시한 Baseline Source입니다.
