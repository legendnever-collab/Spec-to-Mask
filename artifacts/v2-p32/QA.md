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
