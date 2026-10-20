# P3.1 — Single Lane Assembly QA

> **Playable Publication Receipt:** Source Freeze `d499f4a45387b47f258e15155a6406b500d6f060` → Artifact Commit `a55a53eedef9fd94f23ba0ec49fd37c0a73edc2c`입니다. HTML SHA256 `b927884eea8a7331df70bae5f35a77b57f20f85dfc6327cb7d1aba4dc7b10a89`, Source Manifest SHA256 `2b76fb28e23af844a56074d97cb58928b51e5af2fe85067e113ec9fbf3c27d82`입니다. Canonical / index / 독립 Local Source Rebuild가 같은 6,749,461 bytes이며 Manifest의 249개 Source Hash를 확인했습니다. 아래 초기 Source / CI Snapshot은 보존합니다. 최신 Remote CI 결과는 PR #26의 실제 Checks와 최종 Remote Receipt를 확인합니다.


Version: `2.0.0-alpha.5-p31-lane` · Recovery: `f1a300626e82dcefa8ddc8d2fde8931240c5524b` · PR #26 · 2026-10-20 KST.

**P3.1만 구현했습니다. Human Play Acceptance / main Merge / P3.2 / P4는 대기입니다.** Source / Test / Documentation을 먼저 게시하고 동일 Source에서 생성한 HTML은 별도 Artifact Commit으로 저장합니다. 실제 Source SHA / Source Manifest SHA256 / Canonical HTML SHA256은 [verification.json](verification.json), [source-manifest.json](source-manifest.json), [SHA256SUMS](SHA256SUMS)에 기록합니다. 이 문서의 초기 Source Checkpoint에서는 해당 생성 Receipt와 Remote CI가 아직 게시 전입니다. Source CI의 Build 단계가 생성하고 최종 Remote Receipt로 상태를 구분합니다.

## 구현 / Model 보존

- Laser → MZM → Interface / Fiber → Receiver, Source → Driver → PN / CPW Path를 연결하고 현재 MZM을 강조했습니다. Laser / Channel / Rx는 NOT EVALUATED입니다.
- 첫 Control은 Interaction Length입니다. Phase / Vπ / Optical Loss / Raw Eye가 같은 현재 Result로 바뀝니다. Voltage / RF Control은 선택 창으로 제공합니다.
- Independent `lane[platform]`, Deep-copy P2 Import / Original / Comparison / Restore / Save / Full Backup / Resume / 4 Platform을 구현했습니다. P2 Baud를 자동 변경하지 않으며 112 GBd PAM4 Target은 명시적으로 적용합니다.
- 기존 SMQ_V2_MZM.evaluate → MZM_BENCH를 호출합니다. PN / CPW / Driver / FFT / Transfer / Eye Solver를 추가하지 않았습니다. `src/kinds/`, `src/bench/`, `src/util.js`, Data / Level / Persistence Kernel은 Recovery와 Byte 일치합니다.
- 기존 P2의 Physical / Plot / Eye를 Pure View로 공유했습니다. Compact MZI는 같은 Numeric Result를 표시하며 기존 P2의 기본 View / Physics는 보존합니다. Learning Menu의 기존 4개 다음에 Lane을 추가했습니다. 기존 Test 두 곳은 5개 Navigation과 미완료 Lane 상태라는 실제 UI 변경에 맞췄으며 물리 Assertion은 완화하지 않았습니다.

## C01–C05 / Acceptance

| Gate | 실제 Local 결과 / 근거 |
|---|---|
| C01 Same Input / Same Tx | PASS · 4 Platform의 전체 Tx Result, RF Sweep / Eye와 기존 Bench가 일치합니다. Input Mutation이 없습니다. |
| C02 Source Divider / Voltage | PASS · 2.5 Vpp Open Circuit / 50 Ω Source / 50 Ω RT → DC 약 1.25 Vpp, 기존 Complex EO Voltage와 일치합니다. |
| C03 Power / Domain | PASS · Main+Complement=through, 유효 Power Bound, PN Excursion / Folded Levels의 Gap null / 무효 관찰을 확인했습니다. |
| C04 Raw Rate | PASS · 112 PAM4=224 raw, 100 PAM4=200 raw, 112 NRZ=112 raw이며 net / FEC를 만들지 않습니다. |
| C05 State / Identity | PASS · Deep-copy P2 Import, Invalid / Blank, Late / Remount Request, Platform Switch, Original / Comparison, Reload / 실제 Backup Restore / Quota Recovery를 확인했습니다. |
| Desktop / Mobile | PASS · 1440×900, 1366×768, 390×844, 320×568 × Light/Dark. Desktop은 Canvas / Control / KPI / Plot이 같은 Viewport에 있고 Mobile Control / KPI는 Fixed Actions 위에 있습니다. |
| Keyboard / Touch / Learn | PASS · Home/End, 실제 Touch, Learn/Escape / Focus / State Bytes, Session / Home / 종료 / Resume를 확인했습니다. |
| Offline / Runtime | PASS · 신규 Browser Error 0 / 외부 HTTP 0, Syntax 117 files + assembled script를 확인했습니다. |
| Human Play / External Accuracy | NOT VERIFIED · 사용자 Review와 측정 / 독립 Solver 검증은 하지 않았습니다. |

## Local Gate Counts

| Gate | 결과 |
|---|---|
| P3.1 Model-State / Browser | 172 / 142 PASS |
| Existing MZM Bench | 111 PASS |
| P1 / P2 / P2.1 Model-State | 93 / 154 / 135 PASS |
| Navigation / Course / Active / Formats | 11 / 41 / 107 / 49 PASS |
| P2.2 Physics-State | 4394 PASS |
| P1 / P2 / P2.1 / P2.2 Browser | 121 / 511 / 391 / 64 PASS |
| Navigation / Course / Formats / Full Journey Browser | 50 / 322 / 79 / 16 PASS |
| Studio State / DR8 Regression | 56 / 87 PASS; fixed baseline identity 12/12 |
| Full Backup / Smoke / Migration | PASS / Error 0 / PASS |
| Legacy Studio / MZM Browser / Python GDS | 이번 Local에서는 미실행입니다. Production CI에서 실행하며 과거 QA로 대체하지 않습니다. |

Local: Node v24.19.0 / Chromium 133.0.6943.0. Remote: Node 22 / CI가 설치한 Chromium으로 별도 실행합니다. Local Playwright Browser Archive가 손상돼 NPM의 pinned Chromium 133을 Scratch에서 사용했습니다. Test Assertion / 실행 Model을 바꾸지 않았습니다. Glyph는 기존 Pretendard Source SHA256 `9599f12fd42fc0bce1cd50b47a0c022e108d7aa64dd0d1bb0ed44f3282d900b4`에서 확장했으며 현재 Source의 Hangul 352개 / 누락 0입니다. Runtime Font는 111,148-byte WOFF2 Subset입니다.

Browser QA 중 320×568의 Fixed Actions / KPI Overlap을 발견해 수정했습니다. Assembly의 Compact View를 키웠고 이후 Viewport / Touch Gate를 다시 통과했습니다. Actual Restore 직후의 Test가 새 문서의 SMQ_V2 로드를 기다리도록 보완했습니다. 제품 오류와 Test Navigation Timing을 구분하고 실패한 실행을 PASS로 계산하지 않습니다.

## Known Limitations / Scope

Local Linearized PN, Equal Arm / Fixed Loss, Heterogeneous Si PN on SiN, 256-symbol periodic Raw Eye / 16 samples/UI / best sample phase / 240 GHz Truncation을 유지합니다. Raw Eye Gap은 BER / FEC / net200G가 아닙니다. Engineering Closure는 NOT EVALUATED입니다. Absolute Laser Power / Optical Link Budget / Receiver Sensitivity / Cascaded Tx-Rx Eye / 8-Lane Engine은 구현하지 않았습니다.

P2.2 MMI Conservation / Symmetry의 문서화된 Cases는 FAIL / UI NOT VERIFIED입니다. Mode exact-sample Domain, SiN Table / Cutoff mismatch, TM Mesh / Window sensitivity, IOX / LDW / Polymer 정량 Bend 미검증을 그대로 보존합니다. 이번 P3.1로 해결했다고 주장하지 않습니다.

## Publication / CI / 다음 단계

P3.0 최종 HEAD의 P0 / PR CI / Push CI는 모두 SUCCESS를 실제 조회했습니다. P3.1 Source Commit의 첫 Runtime Check는 기존 HTML과 새 Source가 달라 아직 최종 Acceptance가 아닙니다. `v2-p3.yml`의 Push Job은 확인한 Source HEAD에서만 생성 HTML / Manifest를 별도 Commit으로 저장하고, 기존 Production Workflow를 해당 Branch에서 명시적으로 실행합니다. main / 다른 Branch에는 쓰지 않으며 Force Push하지 않습니다. Screenshot / Playable Evidence는 Actions Artifact를 우선합니다.

최종 Source / Artifact SHA와 실제 CI Run / Conclusion은 Checkpoint Log의 Publication Receipt와 PR #26을 확인합니다. 다음은 사용자 P3.1 Play Review입니다. 승인 후 별도 Work에서 P3.2 Scalar Optical Budget만 진행하며 P3.3 Sensitivity / A1 검토는 그 이후입니다.


### Keyboard / Dialog follow-up

첫 Remote Source Run [39331789357](https://github.com/legendnever-collab/Spec-to-Mask/actions/runs/39331789357)은 Keyboard Endpoint Wait에서 실패했습니다. Model / State / Parity 단계는 통과했습니다. 실제 Range Value / Focus를 별도 조사했고, Test는 Dialog 종료·Focus 복원을 기다린 뒤 Range Locator에 Home / End를 직접 보냅니다. Endpoint 값과 현재 Model Result의 Assertion은 유지합니다. 후속 Local Browser는 142 checks PASS이며 실패 Run을 성공으로 계산하지 않습니다.

Voltage / RF 창의 제목이 다음 P1 Learn 창에 남지 않도록 Close 시 제목을 복원했습니다. 추가 Browser Check가 이 교차 Navigation을 검사합니다. 이 수정은 Physics / Coefficient / 기존 Test Target을 바꾸지 않습니다. 후속 Source / Artifact / 최종 CI는 아래 Publication Receipt에서 기록합니다.


### Final artifact integrity / Review handoff

- [Playable HTML](https://github.com/legendnever-collab/Spec-to-Mask/blob/a55a53eedef9fd94f23ba0ec49fd37c0a73edc2c/dist/spec-to-mask-v2.0.0-alpha.5-p31-lane.html)은 Source 저장 후 Actions가 생성한 별도 Commit입니다. `node tools/check_rc.js`, `sha256sum -c artifacts/v2-p31/SHA256SUMS`, 독립 Local Rebuild의 Byte Compare가 PASS입니다.
- 추가 1280×800 / 400×860 × Light/Dark도 실제 Screenshot / Overflow / KPI 가림을 확인했습니다. 신규 Browser Report는 [browser/browser-report.json](browser/browser-report.json)에 보존합니다. Screenshot은 Actions Artifact를 우선합니다.
- Source Follow-up Run [39332515900](https://github.com/legendnever-collab/Spec-to-Mask/actions/runs/39332515900)은 조회 당시 Model / MZM / Parity를 통과하고 기존 State Gate를 실행 중이었습니다. Artifact SHA의 Dispatch CI [39332557834](https://github.com/legendnever-collab/Spec-to-Mask/actions/runs/39332557834)는 pending, Bot Commit의 PR Checks는 action_required였습니다. 이것을 SUCCESS로 기록하지 않습니다. 이 Publication Receipt에서 실제 저장된 최종 Source / Artifact를 유지하고 PR HEAD의 CI를 다시 확인합니다.
- Local Code / Runtime은 Source Freeze와 일치합니다. 이 Receipt는 문서·검증 Evidence만 추가하며 새 HTML / Physics를 생성하지 않습니다. [짧은 Handoff](../../docs/HANDOFF_V2_P31.md)를 확인하고 사용자 Play Review에서 중단합니다.


## Final CI Receipt — 2026-10-20 KST

검증 대상 Branch HEAD는 `d9fe2ece171fe59a8f0ade673dd229e33b979e6d`입니다. [CI Evidence](ci-evidence.json)에 실제 조회 시각 / Run / Job / Artifact를 저장했습니다. 아래 결론은 이전 Pending Snapshot을 대체하며 과거 기록은 보존합니다.

- [P3.1 Source CI 39332515900](https://github.com/legendnever-collab/Spec-to-Mask/actions/runs/39332515900) **SUCCESS**: Model-State 172 / Browser 142 / MZM Bench 111, Parity 및 기존 State Gate가 통과했습니다.
- 이 HEAD의 P0 / P1 / P2 / P2.1 / P2.2 / P3.1 Acceptance Run 6개가 모두 completed/success입니다. [PR Production CI 39332793523](https://github.com/legendnever-collab/Spec-to-Mask/actions/runs/39332793523)와 [Push CI 39332787712](https://github.com/legendnever-collab/Spec-to-Mask/actions/runs/39332787712)도 **SUCCESS**입니다.
- Production은 Build / Canonical Parity / Syntax / Engine Identity / MZM / P3 / 기존 State / Design Lab / Smoke / Flow / Guide / Migration / Backup / Fab / Learning / Python GDS를 통과했습니다. GDS Re-read / Hierarchy / Port / Connectivity 및 의도적으로 잘못된 Geometry의 Negative Checks도 확인했습니다.
- Legacy Studio Browser 168 / MZM Browser 37 / P3.1 Browser 142가 CI Chromium에서도 통과했습니다. 기존 Local 미실행 Legacy Browser / Python GDS 항목은 이 Remote 결과로 검증했습니다.
- 4 Platform Release Regression / Bot Gate와 Release Artifact 생성도 모두 **SUCCESS**입니다. [Release Artifact](https://github.com/legendnever-collab/Spec-to-Mask/actions/runs/39332793523/artifacts/12225169755) / [Production Browser Evidence](https://github.com/legendnever-collab/Spec-to-Mask/actions/runs/39332793523/artifacts/12225456462)를 제공합니다.
- [P3.1 Screenshots](https://github.com/legendnever-collab/Spec-to-Mask/actions/runs/39332515900/artifacts/12224349388) / [P3.1 Playable + Manifest](https://github.com/legendnever-collab/Spec-to-Mask/actions/runs/39332515900/artifacts/12224414126)를 Actions에 보존했습니다.

이 최종 Receipt는 QA / Log / Handoff / CI JSON만 바꿉니다. Runtime / Test / Workflow / HTML은 검증 HEAD와 Byte 일치하며 Source / HTML Hash도 같습니다. 동일 Runtime의 전체 CI를 반복하지 않기 위해 문서 Commit은 `[skip ci]`로 저장합니다. 이 Commit 자체에서 CI를 다시 실행했다고 주장하지 않습니다. 사용자 Play Acceptance는 여전히 **PENDING**이며 P3.2 / main Merge / P4는 시작하지 않습니다.
