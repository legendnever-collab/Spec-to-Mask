# P3.1 — Single Lane Assembly QA

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
