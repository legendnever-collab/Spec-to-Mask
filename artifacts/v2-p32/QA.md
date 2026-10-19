# P3.1 Rendering Fix + P3.2 Optical Ledger QA

## Checkpoint A

- Local Node v24.19.0 / Chromium 133.0.6943.0. Source-first Checkpoint이며 최종 Release 결과와 구분합니다.
- C01–C05 172 / P3.1 Browser 142 / Rendering Browser 8 PASS. Test는 Previous Preview의 명시적 무효화를 검사하도록 변경했으며 기존 수치 Assertion은 유지합니다.
- Rendering: 50회 별도 rAF + 80회 Burst / Release, SVG·Path Reference 유지, Blank 0, Node·Listener 누적 0, 최신 Revision·KPI·Save / Stale Reject PASS. [Report](render/render-report.json). Trace / PNG는 최종 GitHub Actions Artifact를 우선합니다. FPS / Latency 측정은 하지 않았습니다.
- 기존 P3.1 Canonical은 변경하지 않았습니다. Model / Coefficient / PN / CPW / FFT 변경은 없습니다.

P3.2 Model / UI / Final QA는 다음 Receipt에서 실제 결과만 기록합니다.

## Checkpoint B

`SMQ_HTML=dist/index.html node test/t_v2_p32.js`: 324 checks PASS. 4 Platform, dBm/mW Round-trip, exact 3 dB, Laser +1 dB / 각 Loss Owner +1 dB의 영향 Plane, MZM IL 중복 없음, Settled Average / OMA / Raw Gap 분리, Zero / NaN / Infinity / Negative Loss, PN Domain / Folded Levels, Old Save / Backup / P2 Import / Original을 검사했습니다. Negative dBm은 유효한 Power이며 Negative Linear mW는 Invalid입니다. 같은 Tx Input의 Optical Edit에서 Tx Evaluator 호출 1회 유지와 현재 Revision / Request Identity 재연결을 확인했습니다.
