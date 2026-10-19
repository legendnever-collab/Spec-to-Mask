# P3.1 — Sol Work용 다음 지시문

**실행 상태: 승인 대기 / 미시작입니다. 이 문서를 저장한 것은 P3.1 개발 승인이 아닙니다.** 사용자가 P3.1 진행을 승인한 다음 Work에서만 아래를 실행합니다.

---

SPEC-to-MASK v2.0 — P3.1 200G Lane Assembly

Recommended Model: GPT-6.1 Sol Work

Repository: https://github.com/legendnever-collab/Spec-to-Mask

Branch: `feature/v2-p3-200g-lane`

P2.2 Merge Baseline: `c98998c7d7586716a34cd8386180b6b76580a2c3`

P3.0 Documentation HEAD / Draft PR는 [Checkpoint Log](V2_CHECKPOINT_LOG.md)의 최신 Publication Receipt와 실제 Remote Branch에서 확인합니다. 아래 지시문을 수행하기 전에 사용자 P3.1 개발 승인이 있는지 확인합니다.

Mission: 기존 Tx Model 재사용 → 독립 Lane State → 같은 화면의 Assembly / Tx Physics / Raw Eye → Playable P3.1 Checkpoint.

Stop: P3.1 Source / Test / Documentation, Offline HTML / QA / SHA256, 기존 Draft PR 갱신까지 완료한 뒤 사용자 Play Review에서 중단합니다. **P3.2 / main Merge / P4를 시작하지 않습니다.**

## 0. 먼저 읽을 문서 / Recovery

`AGENTS.md`, `CLAUDE.md`, `docs/V2_P3_ARCHITECTURE.md`, `docs/V2_P3_MODEL_CONTRACT.md`, `docs/V2_P3_CHECKPOINT_PLAN.md`, `docs/V2_CHECKPOINT_LOG.md` 최신 Receipt와 `docs/V2_LANGUAGE_POLICY.md`를 읽습니다. P3.0 Audit를 처음부터 반복하지 않습니다. Source를 읽기 전에 실제 Remote main / P3 Branch / Draft PR / CI, Local Status와 Diff를 짧게 보고합니다.

P2.2는 PR #25 / 위 SHA로 이미 병합됐습니다. 과거 문서의 미병합 정책은 Historical Record입니다. 이번 승인은 P3.1만이며 P3 전체 구현이나 main 병합 승인이 아닙니다. 기존 Local 변경 / Artifact / Save / Legacy / PR #23을 삭제·Reset하지 않고, Force Push하지 않습니다. 다른 사람이 Branch를 진행했다면 먼저 Diff와 최신 Receipt를 확인합니다.

## 1. 구현 범위 / Source 재사용

다음 변경 위치는 제안입니다. 현재 Source 구조와 충돌하면 작은 범위에서 조정하고 문서에 이유를 기록합니다.

- `src/v2/lane.js`: `fresh / importP2 / edit / restore / evaluate / matches` Adapter와 Revision / Identity를 구성합니다. Tx는 기존 `SMQ_V2_MZM.evaluate`를 호출하며, PN / CPW / Source Divider / Driver / FFT / Transfer / Dynamic Eye 계산을 복제하지 않습니다.
- `src/v2/lane_ui.js`와 필요한 최소 CSS: Single Lane Assembly / 기존 Tx Physical View / Live KPI / Learn Physics를 연결합니다. P2 UI를 전체 복사하지 않고 순수 View 재사용 또는 작은 View Helper만 추출합니다. 기존 화면과 Result는 보존합니다.
- `src/v2/schema.js`, `core.js`, `ui.js`, 필요한 Persistence Validation 및 `tools/build.sh`: Optional `lane[platform]`, Session Entry, Load Order를 최소 확장합니다. 기존 Storage Key 안에서 추가하고 Legacy Save를 보존합니다.
- `test/t_v2_p3.js`, `test/browser/v2_p3.js`와 관련 package script는 **이번 구현에서 새로 만들 예정**입니다. 기존 Assertion을 삭제하거나 완화하지 않습니다. CI 연결은 Source와 실제 새 Gate의 필요성에 따라 최소 수정합니다.

기존 `src/kinds/*`, `src/bench/mzm.js`, `src/util.js`의 Physics / Coefficient는 기본적으로 변경하지 않습니다. 재사용에 필요한 Interface 문제가 보이면 원인과 최소 확장안을 먼저 문서화합니다. 물리 불일치를 발견하면 A4의 짧은 질문만 검토하고 수치를 조용히 보정하지 않습니다.

## 2. State / Result 동작

1. Lane은 P2와 독립적인 Design ID / Revision / Original / Comparison / Discovery를 가집니다. Fresh는 기존 Platform Reference를 복사하고 Target Profile은 112 GBd PAM4 / 224 Gb/s raw로 표시합니다.
2. “P2 Design 가져오기”는 사용자 Action에 의한 Deep Copy입니다. P2의 Geometry / Bias / Baud / Driver / Voltage를 그대로 보존하고 Source Provenance를 기록합니다. P2가 20 GBd이면 몰래 112로 바꾸지 않습니다. Target Apply는 명시적 Action과 새 Revision입니다.
3. 같은 Tx Input의 결과는 기존 Evaluator와 일치해야 합니다. Platform / λ / Model Signature / Input / Design ID / Revision / Request ID가 맞는 결과만 채택합니다. Model Cache와 Evidence Identity를 구분하고 Input 변경 시 이전 표시·Target을 즉시 무효화합니다.
4. Blank / Invalid Input, Out-of-domain PN, Non-monotonic Levels, Late Request는 기존 valid Result로 덮어 성공 표시하지 않습니다. Original / Comparison / Restore / Platform Switch도 재계산합니다.
5. Full Backup / Restore / Resume에서 P1 / P2 / Passive / Intro / Legacy Bytes를 보존합니다. 새 Scene / Resume Value도 Schema에서 검증합니다. Model Result / Current PASS를 저장하지 않습니다.

## 3. Learning UI / Physics

첫 질문은 “PN과 MZM이 연결된 이 Lane에서 Length를 바꾸면 어떤 Trade-off가 생길까요?”로 시작합니다. Main Control은 Length 하나이며 Vπ / Optical Loss / Raw Eye Gap 중 해당 Discovery에 필요한 KPI 최대 세 개를 보여 줍니다. Parameter와 결과는 같은 화면에서 즉시 바뀝니다. Applied Voltage / RF·EO 상세는 같은 Tx Context를 사용하는 선택 View로 제공하며 한 번에 모든 Control을 펼치지 않습니다.

Assembly의 Optical Flow는 Laser → MZM → Optical Interface / Fiber → Rx로 연속 연결하고 현재 MZM을 강조합니다. Electrical Source → Driver → PN / CPW의 연결을 분명히 합니다. **Laser / Channel / Rx는 계산하지 않은 후속 Block**으로 표시하며 그 수치를 만들지 않습니다. MZM 내의 Passive Guide / Active PN 색상과 기존 Material 구분을 유지합니다.

Source vpp는 Open-circuit Vpp, Electrode / Effective Junction Voltage와 다릅니다. Optical bias와 PN Reverse Bias도 구분합니다. Main / Complementary Power는 `P/Pin`, Eye는 같은 Model의 Raw Optical Gap입니다. 112 GBd PAM4는 224 Gb/s raw이며 Net200G / BER / FEC / Receiver / End-to-end Closure는 NOT VERIFIED입니다. PN Bias Domain 위반 / Folded Levels에는 유효 Eye / Target을 표시하지 않습니다. EO Crossing이 없으면 >120 GHz이며 정확한 120 GHz로 쓰지 않습니다.

Home / Session / 종료, Light/Dark / Offline Korean Font / Keyboard / Touch / Original / Comparison / Learn Physics를 보존합니다. Discover 완료는 실제 조작·관찰이며 Reference 적용이나 Skip을 관찰 완료로 바꾸지 않습니다. Lane Engineering Closure는 NOT EVALUATED입니다. Target을 강요해 Tutorial 진행을 막지 않습니다. 기술 용어는 English, 설명·질문·서술어는 한글입니다.

## 4. 구현하지 않을 항목

Absolute Laser Power Budget, Channel Loss Control, PD Sensitivity / Reference Margin, TPA / RIN / WPE / FEC / BER, Cascaded Receiver / FFE, 8-Lane Engine, MRM / EAM / 400G는 추가하지 않습니다. ELS / XCVR을 호출해 전체 Link PASS를 표시하지 않습니다. P2.2 MMI Conservation / Symmetry FAIL 및 Material / Field Domain 제한도 수정하거나 숨기지 않습니다.

## 5. Validation / Delivery

Contract C01–C05를 새 Adapter Tests로 확인합니다. 특히 4 Platform Tx Identity / 실제 P2 Import Isolation / Late Request / Blank Input / Raw Rate / Source Divider / Invalid PN / Original / Comparison / Restore를 검사합니다. 기존 MZM Model 111 checks는 변경하지 않습니다.

Source 영향에 맞는 기존 Model / State / Browser / Backup Gate를 실행합니다. 구현에서 Schema / Navigation을 바꾸므로 P1 / P2 / P2.1 / Learning / P2.2 State, Chapter Journey / Session / Full Restore의 관련 Browser Gate를 확인합니다. 이미 통과한 같은 Source / Build / Environment의 Gate는 이유 없이 반복하지 않습니다. 새 실패는 원인을 고치며 Test를 느슨하게 만들지 않습니다. CI가 요구하는 Gate는 생략하지 않습니다.

Source / Test / Docs를 먼저 Commit·Push하고 Version / Build / immutable Canonical을 동결합니다. Build와 같은 파일을 Browser가 동시에 읽지 않도록 합니다. `npm run build`, `node tools/check_rc.js`, Syntax / Source Parity / SHA256, 외부 Runtime HTTP 0과 1440×900 / 1366×768 / 390×844 / 320×568 × Light/Dark의 실제 Canvas / Control / KPI를 검사합니다. Font 변경이 필요한 경우 기존 License / Generator를 사용하고 누락 Glyph만 처리합니다.

새 Versioned Offline HTML과 `dist/index.html`은 같은 Bytes여야 합니다. Source Commit과 Binary / Artifact Commit을 분리합니다. Screenshot / Source ZIP은 Actions Artifact를 우선하며 같은 Base64 / Blob 업로드를 반복하지 않습니다. 기존 P2.2 HTML은 보존합니다.

`docs/V2_CHECKPOINT_LOG.md`, P3 문서의 실제 구현 상태, P3.1 QA / Manifest를 업데이트합니다. Source SHA / Artifact SHA / HTML SHA256 / CI Run / 실행한 Gate와 미실행 Gate / Physics Limit / User Play 대기 상태를 정확히 남깁니다. 기존 P3 Draft PR을 갱신하고 중복 PR을 만들지 않습니다.

최종 보고에는 바로 플레이할 HTML 링크, PR / SHA / QA, 재사용한 Model, 미검증 항목, 사용자가 확인할 세 가지(Length Trade-off / Voltage·Raw Rate 구분 / Import·Resume)를 제시합니다. **사용자의 P3.1 Play Review와 다음 개발 승인에서 중단합니다. P3.2를 자동 시작하지 않습니다.**
