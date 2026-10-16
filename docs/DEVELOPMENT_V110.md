# SPEC-to-MASK v1.1.0 — Development

## Authoritative baseline (2026-10-15 UTC)
- Target main: `6bb116e1c5c5bd3fbff345a0e3752a078aa8084a`; CI run 38153873423 SUCCESS.
- Reference main: `d27ea0c2802056dd51c53b55dc19fcfb79bf3b7d`; PR #11 merged; v0.8.1.
- Target PR #14 `b688b1244e6b334d1e8ce351552a5bb9ced94a57`: OPEN, CI 38098752405 SUCCESS. Only the reviewed HTML5/UTF-8 head/body/build correction is ported; PR remains unmerged.
- Release policy: PR to main, user play review before merge. No auto-merge.

## Design contract
Incremental presentation/navigation/state adapter. Engine, calibration, IDs, geometry, thresholds and MODEL_VERSION remain unchanged. Historical stars/cards are shared assets, not current validity. Track completion requires current engine gates and an explicit fresh Test. Lab final stage requires actual verification identity and circuit export. Geometry Rechecked is only from matching Python recheck; Foundry Readiness always NOT VERIFIED.

## Checkpoints
0. Baseline/audit: running original identity and UI regression; retain full logs.
1. Unified shell: semantic Light/Dark, compact header, viewport-sized canvas, independent sheets, encoding/offline.
2. Tracks: additive registry, per-platform independent workspace, protected original/reference, fresh gates and non-destructive legacy copy.
3. Lab: same six missions, contextual panels and truthful final summary.
4. Release: new build regression, browser evidence, HTML/ZIP/PR.

## Audit findings
Existing mission/map/path UI precedes canvas and pushes it below mobile fold. Parameters use a sticky wrapper while results span the grid. Device canvas is parameter-driven; Lab canvas supports selection/pan/pinch and generated layout. Retain those distinctions.

Reference visual measurements: v0.8.1 Canvas portrait 390×844=648px, 360×640=444px, 320×568=372px; landscape 844×390=222px, 667×375=207px. These are comparison targets, not an automatic pass threshold for this device simulator.

## Shell checkpoint
Unified semantic Light/Dark, HTML5/UTF-8/offline and viewport shell implemented. Track adapter lives in new `src/studio.js` / `studio.css`; no physics modules changed. Existing parameter, Lab and result DOM nodes retain handlers; Lab event delegation now follows their panel locations. Original engine regressions and pre-shell baseline suites recorded. Fresh smoke/flow/lab-state run on the new build. Browser launched through a packaged Chromium binary after the default CDN download failed; no further CDN retries. Locally present Korean font subsets are used for QA, with no app font dependency.

Git CLI push has no credentials. Connected GitHub Git-data API publishes commits with a branch-head lease; local sources are preserved. The initial remote design contract is `ff33b59edcc327e82a70a1671241a67b2a7ae49f`.

## Track / Lab checkpoint
Five additive six-Level Tracks implemented with original Level IDs and original six Lab missions. Track design, guided state, comparison pins, runtime Fab seed/results and Lab project are isolated per platform; historic stars/cards remain shared. Reference Apply protects Original and a revision; Legacy import requires Copy. Compact onboarding replaces the first-run four-page sequence; the original onboarding/path guides remain in Advanced.

Browser development run completed MZM DR8, MRR DR8 and MRR WDM8 through all six local Levels with real UI Reference Apply / numeric edits / hard gates / verification / circuit exports / reload. This is development evidence; final acceptance reruns the frozen executable. A pre-existing Heater Reference has metal absorption 0.02137 dB vs 0.020 dB limit on Si1310. The UI does not waive it: h=0.45 µm is tested to meet the actual model. No reference/spec/physics recalibration is made.

Measured new Canvas: 390×844 650px, 360×640 446px, 320×568 374px; landscape 844×390 218px, 667×375 203px. No horizontal/body overflow. Lab controls retain real delegate handlers after reparenting; ± and numeric input added through the same parameter path. Physics / calibration / GDS source files are unchanged.

## Stabilization findings
Actual Chromium caught two hidden-stage redraw errors (null device context during Lab resume; zero-width hidden canvas causing negative draw radius). Presentation redraw now skips hidden/uninitialized Device stages without changing solver calculations. The new state suite verifies non-destructive v1.0 restore, per-Track resume, protected Original, full-backup checksum/schema and raw Quarantine. Python GDS regression completed with original modules and negative geometry tests.

## Final frozen local acceptance
Canonical `dist/spec-to-mask-v1.1.0.html` is built from source Commit `488f4454e43487d2cac66adff3594a969da1657f`, SHA256 `fa91d6fe9bd5e38a6cf18e881134bbc9f7a412e10c8cad9be472fcf7cc33282e`. All final local E2E suites read those exact bytes. 33 regression suites passed, plus final export; Engine 707, Lab engine 440, new state 21 and Browser 136 assertions passed. Four-platform coverage and Python GDS checks passed. Canonical parity against current dev build is enforced by `tools/check_rc.js`; only the immutable provenance line may differ. CI copies the parity-verified delivered HTML before its own acceptance tests.

Exact measured viewport rectangles, raw final logs, screenshots, unchanged 120-file physics manifest, model boundaries and environment limits are in TEST_REPORT_V110.md / artifacts/v110-qa. Git-data publications use immutable snapshots and verify exact Source Tree SHA, with an expected branch-head lease. Final current-Head remote CI links/conclusions are recorded in PR #19 after they finish; local results are not substituted for CI. Main remains unmerged pending user play approval.

## Recovery stabilization checkpoint (2026-10-16)

Recovered remote/source HEAD `af18d590636140832645564fb6434033e8328d51`; main `6bb116e1c5c5bd3fbff345a0e3752a078aa8084a`; PR #19 remains Open/Draft. The previous successful CI run 38769887720 covers aaf24832 only.

Atomic fix is valid without another application patch. Added explicit failing solver/Test identity, blocked Next, same-task valid-parameter recovery, failed-design reload, Track switch, Original restore, backup restore/reload and Guided/Full regression. Studio 39 PASS on both current build and delivered HTML; Chromium 141 PASS, zero page errors/HTTP requests. Migration, backup, syntax and positive/negative source parity passed.

Regenerated canonical HTML from af18d590: SHA256 `c7d327a6c07420f2ba903bc14d723bab4b525bd10ec4c7d3d6cd493ef52fd71e`. This supersedes the older fa91d6fe hash in the historical acceptance section above. Current results and environment limits: [recovery acceptance](../artifacts/v110-recovery/README.md), [manifest](../artifacts/v110-recovery/MANIFEST.json). Application Source is unchanged; Physics/GDS evidence is preserved, not rerun locally.

Adopted the prior pending release parity safeguard: freshly build, parity-check, then copy the tested canonical bytes for release packaging. The original workspace and its other uncommitted changes are preserved. Clean npm ci is deferred to remote CI because local offline cache was incomplete; existing exact-lock dependencies were reused. New checkpoint publication and its exact-head CI results are recorded on PR #19. No main merge.
