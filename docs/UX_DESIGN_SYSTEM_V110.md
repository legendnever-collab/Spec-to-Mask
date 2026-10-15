# Unified Photonics Studio design system

Reference: Photonics Architect v0.8.1 `src/style.css` / `src/studio.js`.

| Role | Light | Dark |
|---|---|---|
| Surface | #f2f6fb | #101d2d |
| Panel | #ffffff | #101a2a |
| Canvas | #f7f9fc | #091321 |
| Control | #e8eff7 | #182638 |
| Text | #1a3048 | #dce9f7 |
| Muted | #48617c | #a5bad0 |
| Line | #b5c6d8 | #436077 |
| Accent | #006b64 | #62e4ce |
| Warning | #824d00 | #ffc169 |
| Failure | #b32143 | #ff7183 |

System fonts with Malgun Gothic / Apple SD Gothic Neo fallback; no font download. Spacing 4/8/12/16/24; card radius 12, control 8; minimum primary touch target 44px. Header, track bar, compact goal and canvas keep a stable viewport. Mobile sheets scroll internally; desktop inspector is a bounded column, comparisons do not sit underneath sticky controls. Keyboard resizes use visualViewport. Device remains a parameter-driven simulator, Lab remains its existing generated-layout editor.

Canvas presentation palette is resolved from semantic tokens at draw time; spectral category/thermal ramps keep their scientific meaning across themes. State uses text plus color (PASS / FAIL / STALE / NOT VERIFIED).
