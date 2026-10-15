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
