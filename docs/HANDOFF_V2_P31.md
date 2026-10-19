# P3.1 — Play Review / 다음 Work Handoff

현재 PR은 [#26](https://github.com/legendnever-collab/Spec-to-Mask/pull/26), Branch는 `feature/v2-p3-200g-lane`입니다. **P3.1 구현 완료 / 사용자 Play Review 대기이며 main은 병합하지 않았습니다.**

- Source Freeze: `d499f4a45387b47f258e15155a6406b500d6f060`
- Playable Artifact Commit: `a55a53eedef9fd94f23ba0ec49fd37c0a73edc2c`
- [Offline HTML](../dist/spec-to-mask-v2.0.0-alpha.5-p31-lane.html) · [QA](../artifacts/v2-p31/QA.md) · [SHA256](../artifacts/v2-p31/SHA256SUMS)
- HTML SHA256: `b927884eea8a7331df70bae5f35a77b57f20f85dfc6327cb7d1aba4dc7b10a89`
- Source Manifest SHA256: `2b76fb28e23af844a56074d97cb58928b51e5af2fe85067e113ec9fbf3c27d82`

## 사용자가 확인할 세 가지

1. HTML을 열고 **Session → 200G-class Lane · P3.1**으로 들어갑니다. Interaction Length를 바꾸며 Phase / Vπ / Optical Loss / Raw Eye가 같은 화면에서 함께 바뀌는지 봅니다.
2. P2 Design이 있으면 가져오기를 눌러 Baud가 그대로인지 확인합니다. 저장된 P2가 없으면 먼저 MZM Workbench에서 조작한 뒤 Lane으로 돌아옵니다. Voltage / RF에서 112 GBd PAM4 Target은 명시적으로 적용합니다. 224 Gb/s raw / Net200G 미검증 표기를 확인합니다.
3. Comparison / Original, Platform Switch, Session Full Backup / Restore, 종료 / Resume를 확인합니다. Learn Physics는 선택이며 원본 Design / Progress를 바꾸지 않습니다.

## 다음 Work의 경계

사용자 Feedback이 있으면 **P3.1만 수정**합니다. P3.1 Play Acceptance와 **P3.2 개발 승인**을 받은 뒤에만 `V2_P3_CHECKPOINT_PLAN.md`의 P3.2 Scalar Optical Power / OMA Ledger를 진행합니다. 같은 Tx Result를 재사용하고 MZM Loss를 중복 차감하지 않습니다. Receiver Sensitivity / Cascaded Tx-Rx Eye / BER / FEC / 8-Lane / 새로운 Solver는 그 Work에도 자동 추가하지 않습니다.

Astra A1은 P3.3의 Receiver Sensitivity 조건 검토, A2는 별도 승인을 받은 Cascaded Quality 설계 시에만 사용합니다. P3.1에서 Model 불일치는 발견되지 않았으며 PN / CPW / FFT를 다시 만들지 않습니다. P2.2 MMI / Material / Field 제한을 보존합니다.

다음 Session은 최신 Remote main / P3 Branch / PR #26 / CI / Local Status와 이 Handoff의 Source Diff만 짧게 확인합니다. P3.0 Audit를 반복하지 않습니다. 최신 CI / 문서 Receipt SHA는 Checkpoint Log와 PR HEAD에서 읽습니다. **P3.2 자동 시작 / main Merge / P4 시작은 금지합니다.**
