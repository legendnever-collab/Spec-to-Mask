# P3.2 — Play Review / 다음 Work Handoff

기존 Draft [PR #26](https://github.com/legendnever-collab/Spec-to-Mask/pull/26), Branch `feature/v2-p3-200g-lane`을 유지합니다. 사용자 승인은 P3.1 Rendering 수정 + P3.2 Scalar Ledger까지입니다. main은 병합하지 않습니다.

- A Rendering: `f52cdf9af5dcf729a4e367b835e6c10611b1176d`
- B Ledger Model: `8aa5f7799bc6f4dbd47c79f0d07473d6811faed6`
- C Budget UI: `3f0d4f96fab2b38ec54a189ab9b02fd7468212a8`
- Runtime Source: `dc19ef31d9735db3cf18bd806aaf48d951a4b9c8`
- Final Metadata Source: `dadcc77c092af571072a1ebfade8957fad35231d`
- Artifact: `c1ee3281a83b810a9b9a5b784ec3c4d33bf57017`
- HTML SHA256: `451921b01b47775cbf0aec784e794518f2031cd8b5a41c2d00a3a4bb5c86dcd1`
- Source Manifest SHA256: `7119a3f24ecefcc7004885f7b36c0d945c1dded0f77edbb188f11516f9ca5c1d`
- Final Source / Artifact SHA와 CI: [Checkpoint Log](V2_CHECKPOINT_LOG.md), [QA](../artifacts/v2-p32/QA.md), [Build Receipt](../artifacts/v2-p32/verification.json)를 확인합니다. Source 저장 후 Actions에서 HTML을 별도 Commit으로 생성합니다.
- [P3.2 Offline HTML](../dist/spec-to-mask-v2.0.0-alpha.6-p32-link-budget.html). 기존 P3.1 Canonical SHA256 `b927884eea8a7331df70bae5f35a77b57f20f85dfc6327cb7d1aba4dc7b10a89`는 그대로입니다.

## Play Review

1. **Session → 200G-class Lane · P3.1 / P3.2**에서 Length를 연속 조절합니다. Physical / Plot이 사라지지 않고 Previous Preview가 Current Result와 구분되는지 확인합니다.
2. Laser ↗ 또는 P3.1 Summary의 Optical Budget으로 이동합니다. A / E / C Flow Tile을 누르면 Laser / Channel / Tx Length로 이동합니다. 같은 Mounted Tx / Ledger Root를 유지합니다.
3. Laser를 +1 dB 올려 A–F Power / C–F OMA 증가를 보고, Channel Loss를 +1 dB 늘려 E/F만 감소하는지 확인합니다. 밑줄 강조와 Before/After는 실제 이전·현재 Ledger 차이입니다.
4. CW A/B, 등확률 Settled Average C–F, OMA_outer C–F와 Tx의 Raw Eye Gap을 구분합니다. Coupling / Detail에서 세 Coupling Loss / mW / Owner를 확인합니다. MZM IL은 Transfer 안에 이미 포함돼 있습니다.
5. P2 Import / Original / Comparison, 4 Platform, Full Backup / Restore, 종료 / Resume를 확인합니다. Import Baud를 자동 변경하지 않습니다. 112 GBd PAM4는 224 Gb/s raw입니다.

## Model Boundary / 다음 단계

Laser 10 dBm / Tx Input 1 dB / Tx Output 1 dB / Channel 3 dB / Rx Input 1 dB는 교육용 시작 가정이며 측정값이 아닙니다. Constant-loss / Linear-power Scaling만 합니다. PN / MZM / Raw Eye / P2.2 MMI Conservation·Symmetry / Mode·Material 한계는 그대로입니다. Source Power별 실제 Nonlinear 정확도, RIN / TPA / Self-heating / Feedback / Dispersion / Receiver Noise / FFE / BER / FEC / Net200G는 미검증입니다. Dynamic Average / Dynamic OMA / Sensitivity / Link Margin은 null입니다.

Feedback은 P3.1 Rendering / P3.2 범위에서 수정합니다. **P3.2 Play Acceptance와 P3.3 개발 승인이 모두 있어야 다음 Work를 시작합니다.** 그때 Contract A1의 기존 PD `6×Q×sigma/(R×ratio)`와 λ / 112 GBd / Noise / 5-tap FFE 조건만 좁게 검토합니다. 해결되지 않으면 Device Response-only Scope를 명시적으로 결정합니다. Cascaded Tx/Rx / 단일 FFE / BER는 별도 승인이 필요합니다. 지금 P3.3 / main Merge / P4를 시작하지 않습니다.

[Runtime CI](../artifacts/v2-p32/runtime-ci.json)는 SUCCESS이며, Source / HTML / 255개 Hash가 일치합니다. 전체 Production CI와 최신 문서 HEAD의 Conclusion은 최종 QA / PR Receipt에서 별도로 확인합니다.
