# P3.1 Rendering Fix + P3.2 Optical Ledger QA

## Checkpoint A

- Local Node v24.19.0 / Chromium 133.0.6943.0. Source-first Checkpoint이며 최종 Release 결과와 구분합니다.
- C01–C05 172 / P3.1 Browser 142 / Rendering Browser 8 PASS. Test는 Previous Preview의 명시적 무효화를 검사하도록 변경했으며 기존 수치 Assertion은 유지합니다.
- Rendering: 50회 별도 rAF + 80회 Burst / Release, SVG·Path Reference 유지, Blank 0, Node·Listener 누적 0, 최신 Revision·KPI·Save / Stale Reject PASS. [Report](render/render-report.json). Trace / PNG는 최종 GitHub Actions Artifact를 우선합니다. FPS / Latency 측정은 하지 않았습니다.
- 기존 P3.1 Canonical은 변경하지 않았습니다. Model / Coefficient / PN / CPW / FFT 변경은 없습니다.

P3.2 Model / UI / Final QA는 다음 Receipt에서 실제 결과만 기록합니다.
