> **Recovery update (2026-10-16):** The report below is historical evidence for its stated HTML hash. The current Atomic Test Gate executable, 39 Studio / 141 Browser checks, SHA256 and environment limits are in [the recovery acceptance report](../artifacts/v110-recovery/README.md). Do not use the older hash as the current RC.

# SPEC-to-MASK Quest v1.1.0 — QA Report

## Frozen executable and provenance

- Canonical executable: `dist/spec-to-mask-v1.1.0.html` (single offline HTML, Light/Dark inside).
- SHA256: `fa91d6fe9bd5e38a6cf18e881134bbc9f7a412e10c8cad9be472fcf7cc33282e`.
- Embedded source Commit: `488f4454e43487d2cac66adff3594a969da1657f`; source Tree: `92a727ac31ef5b422cd3c953afd362f4fa247514`.
- Target baseline: main `6bb116e1c5c5bd3fbff345a0e3752a078aa8084a`, original CI 38153873423 SUCCESS.
- Reference: Photonics Architect `d27ea0c2802056dd51c53b55dc19fcfb79bf3b7d`, merged PR #11 / v0.8.1. Target PR #14 stays open; only reviewed UTF-8/HTML5 changes are ported.
- Every final local E2E suite read the frozen delivery bytes via `dist/index.html`; Browser read the canonical file directly. After testing, the deterministic dev build was restored. `tools/check_rc.js` proves exact equality with current Source output except the immutable `SMQ_BUILD` provenance line. CI repeats that parity check and then runs the delivered executable.

## Executed final results

| Validation | Actual result |
|---|---|
| npm ci / build / build:offline / release | PASS |
| Final regression batch | 33 suites PASS, 0 failed |
| Upgrade / MRR / DR8 / WDM engine tests | 357 / 182 / 87 / 81 PASS (707 total) |
| Lab engine | 440/440 PASS |
| Identity baseline handling | 11/11 PASS; original required commits exist; identity blocks really executed |
| New Track state / migration contract | 21 PASS |
| Actual Chromium UI, exact canonical SHA above | 136 assertions PASS; 0 page errors; 0 external HTTP requests |
| Python component / Circuit GDS backend | PASS; 12 circuit cases, 234 reported rechecks, FAIL 0; negative cases caught |
| Export script (additional final run) | PASS; 28 example JSON exports geometrically identical to baseline; timestamp-only outputs archived |
| Syntax + canonical source parity | PASS; current tools included; no external runtime script |

The 33-suite batch includes all requested baseline/upgrade/MRR/DR8/WDM/Lab/flow/guide/backup/migrate/learn/Python/syntax/wipe commands, smoke/Fab/new-state tests, and the remaining four-platform matrix. Every platform has smoke, flow, guide, Lab, Lab state and Fab coverage. Bot gate ran all 21 Levels on Si1310 and the existing nine-Level release set on each of the other three Platforms (48 Level/Platform scenarios, each earned ≥ ★★ under the preserved historical-star rules). A final live design can differ after the Heater coach trades speed for Fab yield; historical stars are not a current-design pass. The Track tests separately require fresh current hard gates.

## Gameplay / interaction

- MZM DR8, MRR DR8 and MRR WDM8 each completed all six local Levels through actual UI Reference Apply, numeric adjustment, Test, Schematic/Floorplan, Routing, Electrical, Verification, Circuit Export and file reload Resume.
- PIC Fundamentals completed its actual Waveguide/Coupler observation missions and six supported Levels. LiDAR/TTD completed supported Device/System Levels and a summary explicitly identifying unsupported full LiDAR PIC GDS.
- Reference Preview changed no Design. Repeated Apply did not overwrite protected Original. Legacy Copy is explicit, Track designs resume independently, historical Platform Stars/DB/legacy Lab are preserved, corrupt JSON raw text is quarantined, old backups validate, checksum/schema tampering is rejected.
- Real CDP Touch Pinch/Pan changed Device and Lab views without changing Design / Geometry Hash or scrolling the body. Fit, mobile numeric editing, independent panel scroll, 44px context actions and desktop panel separation were exercised.
- Actual Track Fab Run recorded seed/sample count; repeating fixed seed reproduced hash/pass count; statistical interval and interpretation remained visible. Theme switching and reload preserved exact Design/Fab/seed data.

## Measured viewports

Actual Canvas rectangles (not console-only assertions). Inspector is a separate bounded column on desktop and an internally scrolling sheet on mobile.

| Viewport | Canvas height | Height / viewport |
|---|---:|---:|
|1440×900|606.0px|67.3%|
|1280×800|506.0px|63.2%|
|1024×640|346.0px|54.1%|
|390×844|650.0px|77.0%|
|360×640|446.0px|69.7%|
|320×568|374.0px|65.8%|
|844×390|218.0px|55.9%|
|667×375|203.0px|54.1%|

No body scroll / horizontal overflow in all eight specified viewports. Photonics Architect v0.8.1 reference portrait heights were 648/444/372px at 390×844 / 360×640 / 320×568; this build measured 650/446/374px. Landscape reference 222/207px vs this build 218/203px. Screenshots were visually inspected for readable key metrics, Korean glyphs, Theme and PIC layout.

## Physics and model boundaries

`BUILD_MANIFEST.json` proves 120 tracked Physics/table/calibration/level/platform/GDS files are byte-identical to main. Combined baseline/current SHA256: `88b4998c56730cf961067f82d7d38d0eeb47d06a27c4e8567d98df6833e88287`. MODEL_VERSION stays `smq-model-1.0`. Thresholds and scoring were not relaxed.

The pre-existing Si1310 Heater Reference at h=0.4µm has metal absorption 0.02137dB vs its 0.020dB requirement. It is not labelled a guaranteed solution; actual h=0.45µm adjustment passed in the Track run. Score/Reference cannot override hard requirements. Current-hash-only Geometry Rechecked is distinct from Design Valid. Foundry Readiness remains NOT VERIFIED. Full LiDAR PIC GDS remains unsupported.

## Evidence and CI

- Raw final logs / suite results / Build manifest: [artifacts/v110-qa](../artifacts/v110-qa/).
- Actual Browser checks and all measured rectangles: [final-browser/results.json](../artifacts/v110-qa/final-browser/results.json).
- [Mobile Light](../artifacts/v110-qa/final-browser/light-390x844.png), [Desktop Dark](../artifacts/v110-qa/final-browser/dark-desktop.png), [Mobile Lab Touch](../artifacts/v110-qa/final-browser/mobile-lab-touch.png), [MZM](../artifacts/v110-qa/final-browser/mzm-dr8-summary.png), [MRR](../artifacts/v110-qa/final-browser/mrr-dr8-summary.png), [WDM](../artifacts/v110-qa/final-browser/mrr-wdm8-summary.png).
- Final publishing Commit and exact current-Head CI Run links/conclusions are maintained in [PR #19](https://github.com/legendnever-collab/Spec-to-Mask/pull/19). This committed report records local frozen evidence independently of later CI completion. Local PASS is not substituted for remote CI status.

Initial long-running probe logs may span development builds and are retained as history, not final acceptance. An interrupted pre-final batch's strict schema test ran against the not-yet-rebuilt HTML and failed; its record is under development/. Final rebuilt frozen tests above passed. Resolved development defects include header overflow, moved Lab handlers, hidden/null Device redraw, exact Original replacement and Legacy Lab navigation. No failed attempt is counted PASS.

## Environment limits / review gate

Local actual Chromium under Linux, file:/// URL, mobile viewport/touch emulation. Locally available Korean system fonts were used for visual QA; app font/CDN download dependency is zero. Physical Windows Chrome/Edge, Android/iOS, Safari/Firefox, native keyboard/clipboard and nonzero hardware safe-area behavior are not certified by emulation. Foundry sign-off is not performed. User play acceptance remains pending; main is not merged.
