# P2 — Local QA Snapshot / Play Review

Version: **2.0.0-alpha.2-p2** · HTML SHA256: `06ba8d5219598ac36949ac2c1be6a6033c07277b795396cc1947d7732858f99b`

P1은 사용자 Play / Merge 승인 후 PR #24 / `0537a71`로 병합했고 전체 P1 CI와 main CI는 SUCCESS입니다. P2는 별도 Branch에서 사용자 Play Review를 기다립니다.

| 검증 | 상태 | 실제 Evidence / 범위 |
|---|---|---|
| PN / MZM / Phase / Length / RF / Eye | PASS | Model / State 154; 4 Platform, 동일 Bench Output / Power / Seed / Domain / Identity를 확인했습니다. |
| P2 Browser / UX | PASS | 511 Checks; 4 Viewport × Light/Dark × Discover/Engineer, Keyboard / 실제 Touch Event / Focus / Comparison / Original / Learn / Reference / Save를 검사했습니다. |
| Desktop / Mobile | PASS | Desktop 주요 View / Control / KPI / Plot이 한 화면에 보이며 Mobile 핵심 KPI / 44px Control은 Fixed Actions 위에 있습니다. 상세 Plot / Engineer 추가 조건은 아래로 이어집니다. |
| P1 Regression | PASS | 새 P2 HTML에서 State 93 / Browser 121을 확인했습니다. |
| Legacy Studio / MZM Browser | PASS | 168 / 37. 변경하지 않은 Legacy 영역의 Pre-freeze 검증을 재사용하며 최종 Production CI도 최신 HTML에서 반복합니다. |
| Studio / Lab / Backup | PASS | Studio 56, Lab 440 + Si1310 / SiN1550 e2e / State Integrity, Backup / Restore / Undo / Quarantine을 확인했습니다. |
| P2 Migration / Backup | PASS | P1 완료 기록과 Legacy Bytes 보존, Platform별 Input, 실제 Full Restore / Undo, 잘못된 Schema / Quota / Late Request를 검사했습니다. |
| Build / Parity / Syntax | PASS | Canonical / dist/index.html Byte 일치, Syntax 85 files + Assembled Script, 외부 Runtime Request 0입니다. |
| Korean Offline Font | PASS | 기존 Licensed TTF에서 Glyph를 확장했고 누락 Hangul 0 / 실제 화면을 확인했습니다. |
| P2 GitHub CI / 4-Platform Release Matrix | NOT VERIFIED at local freeze | 이 Snapshot은 CI 실행 전에 저장합니다. 최종 결과는 Draft PR의 같은 HEAD Checks와 최종 인수인계에 기록합니다. Local 검사와 CI 성공을 혼동하지 않습니다. |
| External Measurement / Full-wave / Foundry | NOT VERIFIED | 기존 Educational / Analytical Model과의 일치를 검사했으며 외부 정확도 검증은 하지 않았습니다. |
| BER / FEC / Net 200G / Rx / Noise / Jitter | NOT VERIFIED | 112 GBd PAM4는 224 Gb/s raw이며 Eye Gap은 BER이 아닙니다. |
| Human Learning / 200% Zoom / Screen Reader Audit | NOT VERIFIED | 사용자 Play와 별도 Accessibility 검토가 필요합니다. |

## 구현과 재사용

- Interaction Length: Active ηL / Vπ / VπL / Optical Loss / Phase를 같은 Live PN / MZM Model로 연결했습니다.
- Voltage & Interference: Electrode Vdiff / 두 Arm Phase / Transfer Curve / Operating Point / Main-Complement Power를 표시합니다.
- RF/EO & Eye: 기존 Loaded CPW / Junction RC / Butterworth Driver / Dynamic Eye Trace를 사용합니다. Y축은 P/Pin이며 Eye를 임의로 정규화하지 않습니다.
- `src/kinds`, `src/bench`, `src/lab`, Data / Platform / Level / 기존 Studio와 P0 / P1 HTML은 변경하지 않았습니다. P2 Adapter / UI / Additive Save만 추가했습니다.

## 경계와 수정

Local Linearized PN / Fixed Loss / Equal-arm 50:50 MZI를 가정합니다. PN Domain 위반 / Folded Levels는 N/A, 관찰 범위 내 EO Crossing이 없으면 >120 GHz입니다. Static Vdiff와 Source Open-circuit Vpp, PN Reverse Bias와 Optical Phase Bias를 구분합니다.

1366×768 Engineer Overflow, P2 Font Glyph / Legend Font, Single-process Browser의 추가 Context 제약을 수정했습니다. Blank Draft에서 Mode만 바꿔도 이전 Target이 되살아나지 않도록 하고 별도 State 검사를 추가했습니다. Unsupported PN에서 Phase Vector / Δn을 유효 결과로 표시하지 않습니다. 기존 Regression을 삭제하거나 약화하지 않았습니다.

## Evidence / Stop

[Model·State Log](state-model.log), [Browser Report](browser-report.json), [Verification / Input Hashes](verification.json), [SHA256SUMS](SHA256SUMS)를 확인합니다. Screenshot은 `v2-p2-mzm-evidence` Actions Artifact로 제공합니다. 최초 Source가 Artifact보다 먼저 게시됐으며 PNG의 반복 Base64 / Blob 업로드는 하지 않았습니다.

**P2 Play Review에서 중단합니다. P2 main Merge와 P3 시작은 하지 않습니다.**
