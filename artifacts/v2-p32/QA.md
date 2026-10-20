# P3.1 Rendering Fix + P3.2 Optical Ledger QA

## Checkpoint A

- Local Node v24.19.0 / Chromium 133.0.6943.0. Source-first Checkpoint이며 최종 Release 결과와 구분합니다.
- C01–C05 172 / P3.1 Browser 142 / Rendering Browser 8 PASS. Test는 Previous Preview의 명시적 무효화를 검사하도록 변경했으며 기존 수치 Assertion은 유지합니다.
- Rendering: 50회 별도 rAF + 80회 Burst / Release, SVG·Path Reference 유지, Blank 0, Node·Listener 누적 0, 최신 Revision·KPI·Save / Stale Reject PASS. [Report](render/render-report.json). Trace / PNG는 최종 GitHub Actions Artifact를 우선합니다. FPS / Latency 측정은 하지 않았습니다.
- 기존 P3.1 Canonical은 변경하지 않았습니다. Model / Coefficient / PN / CPW / FFT 변경은 없습니다.

P3.2 Model / UI / Final QA는 다음 Receipt에서 실제 결과만 기록합니다.

## Checkpoint B

`SMQ_HTML=dist/index.html node test/t_v2_p32.js`: 324 checks PASS. 4 Platform, dBm/mW Round-trip, exact 3 dB, Laser +1 dB / 각 Loss Owner +1 dB의 영향 Plane, MZM IL 중복 없음, Settled Average / OMA / Raw Gap 분리, Zero / NaN / Infinity / Negative Loss, PN Domain / Folded Levels, Old Save / Backup / P2 Import / Original을 검사했습니다. Negative dBm은 유효한 Power이며 Negative Linear mW는 Invalid입니다. 같은 Tx Input의 Optical Edit에서 Tx Evaluator 호출 1회 유지와 현재 Revision / Request Identity 재연결을 확인했습니다.

## Checkpoint C

`test/browser/v2_p32.js` 74 PASS. 6 Viewport × Light/Dark와 실제 Node / Plane Bounds, Tx↔Budget Root 유지, Laser / Channel +1 dB, 변화 Plane 강조, Invalid / Stale, Original / Comparison / Coupling / Learn, 4 Platform, Reload / Full Restore / Exit / Summary / Offline HTTP 0을 확인했습니다. 이 Source Checkpoint는 Source-only이며 Final Artifact Hash는 이후 Receipt입니다. 최종 2개 설명 문구 보완은 Physics / Layout 변경이 없습니다.

Visual QA에서 320×568 Flow 상·하단 Clipping과 Fixed Actions의 KPI 가림을 발견해 Compact Label / Flow / Action 배치로 수정했습니다. Pseudo-arrow의 의도된 연결 영역은 Overflow로 오판하지 않고 실제 Text Range와 각 Tile Bounds를 검사합니다. 새 Font Family를 도입하지 않았고 같은 원본의 누락 Glyph만 +1,220-byte Subset으로 보완했습니다.

## Final Local Integration / Source Freeze

| Gate | 실제 결과 |
|---|---|
| P3.2 C06–C07 Model-State | 326 PASS; Negative dBm도 양의 Linear Power임과 Zero Loss chain을 추가 확인 |
| P3.1 C01–C05 Model-State / Browser | 172 / 142 PASS |
| P3.2 Browser | 74 PASS; 6 Viewport × Light/Dark, 전체 Flow Tile / Text / Primary Control / KPI |
| Stable Rendering Browser | 11 PASS; Length 50 + Burst 80 / Release, Optical Loss 50, Node 유지 / Blank 0 / Tx reuse / Save / Stale Reject |
| P1 / P2 / P2.1 State | 93 / 154 / 135 PASS |
| Navigation / Course / Active / Formats | 11 / 41 / 107 / 49 PASS |
| Backup / Smoke / Migration | PASS / errors 0 / PASS |
| Syntax | 123 files + assembled script PASS |
| Legacy Browser / GDS / 4 Platform Production CI | Source 게시 전 Pending. 다음 Receipt에서 실제 Conclusion 기록 |
| 사용자 Play Acceptance / 외부 Physics 정확도 | PENDING / NOT VERIFIED |

Local Node v24.19.0 / Chromium 133.0.6943.0. Runtime 외부 HTTP 0 / Browser Error 0입니다. 실제 Trace / Frame Screenshot / MutationObserver / Stable Node Reference로 검사했으며 FPS / Latency 수치를 추정하지 않았습니다. Local Browser Report에는 각 Candidate HTML SHA256이 기록됩니다. 마지막 P3.1 Laser Preview 문구를 NOT EVALUATED로 보존해 기존 3개 미계산 Block Assertion도 그대로 통과했습니다. 최종 Remote는 Versioned Artifact를 다시 검사합니다.

동일 Pretendard의 Hangul 362 / Missing 0, WOFF2 112,368 bytes입니다. 배경 / Font Family / Navigation을 대규모로 바꾸지 않았습니다.

## Physics Assumptions / Known Limitations

A/B CW는 dBm / mW, C–F는 등확률 Settled Average와 OMA_outer입니다. Raw Eye Gap은 최소 인접 Gap(P/Pin)으로 별도입니다. OMA=0의 Log는 null이며 임의 Floor / Link PASS를 만들지 않습니다. Folded Levels의 Level Range는 Diagnostic, OMA는 N/A입니다. PN Domain 밖 Modulated Evidence는 N/A입니다. MZM IL은 Bench.eye.ideal에 포함되어 한 번만 적용합니다. B→C Average Drop에는 Operating Point / Modulation도 포함됩니다. Scalar Loss는 명시한 A→B / C→D / D→E / E→F Owner가 한 번씩 적용합니다.

Defaults 10 dBm / Input 1 dB / TxOut 1 dB / Channel 3 dB / RxIn 1 dB는 교육 가정이며 측정값이 아닙니다. Source Power별 Nonlinear 정확도, RIN / TPA / Self-heating / Feedback / Dispersion / Rx Noise / FFE / BER / FEC / Net200G / Link Closure는 NOT VERIFIED입니다. Dynamic Average / OMA, Receiver Sensitivity / Margin은 null입니다. 기존 Local Linearized PN / Equal Arm / Fixed Loss / Heterogeneous Si PN / periodic Raw Eye와 P2.2 MMI Conservation·Symmetry FAIL / UI NOT VERIFIED, Sample Domain / SiN mismatch / TM sensitivity / Material Bend 제한을 유지합니다. 이를 해결했다고 주장하지 않습니다.

Source / HTML / Hash / CI 및 Play Review는 다음 Publication Receipt와 [Handoff](../../docs/HANDOFF_V2_P32.md)를 확인합니다. P3.3 / main Merge / P4는 진행하지 않습니다.

## Manifest Scope Clarification

Actions Artifact `17b9a7c`의 HTML / Local Candidate / index SHA256은 모두 `451921b01b47775cbf0aec784e794518f2031cd8b5a41c2d00a3a4bb5c86dcd1`입니다. Source 255개 Hash도 확인했습니다. Generator의 오래된 `linkBudget:null` 표기를 구현된 `opticalLedger: MODEL` / 미구현 `endToEndLinkClosure:null`로 구분합니다. Runtime / HTML / Test는 그대로이며, Source 저장 후 JSON / SHA Text만 재생성해 별도 저장합니다.

## Publication / Remote Runtime CI

Final Runtime Source `dc19ef31d9735db3cf18bd806aaf48d951a4b9c8`, Final Metadata Source `dadcc77c092af571072a1ebfade8957fad35231d`, Artifact `c1ee3281a83b810a9b9a5b784ec3c4d33bf57017`です。HTML SHA256 `451921b01b47775cbf0aec784e794518f2031cd8b5a41c2d00a3a4bb5c86dcd1` / Source Manifest SHA256 `7119a3f24ecefcc7004885f7b36c0d945c1dded0f77edbb188f11516f9ca5c1d`、6,781,350 bytes、Source 255 Hash / Canonical-index-local parity PASSです。

[Source Run 39400966867](https://github.com/legendnever-collab/Spec-to-Mask/actions/runs/39400966867) completed/successを実際に確認しました。P3.2 326 / P3.1 172 / Bench 111 / Browser 74 / Rendering 11、既存 State Gateも通過しました。[Runtime CI JSON](runtime-ci.json)と[Actions Screenshot / Trace](https://github.com/legendnever-collab/Spec-to-Mask/actions/runs/39400966867/artifacts/12255003508)を保管します。RuntimeとHTMLはそのまま、Metadata Follow-up後の Manifestは上記 Final Artifactを正本にします。

Source-first直後の古いHTML Parity Failureはこの成功に含めません。最新文書HEADの全Acceptance / Production / Legacy / GDS / 4 Platform CIはまだPendingであり、最終Receiptで実際の結論を記録します。
