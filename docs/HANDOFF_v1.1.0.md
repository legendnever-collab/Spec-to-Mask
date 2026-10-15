# v1.1.0 Release Candidate handoff

Branch: `feature/v1.1-unified-photonics-studio`. Base: main `6bb116e1c5c5bd3fbff345a0e3752a078aa8084a`. Main merge requires user play approval. PR #14 stays unmerged; its reviewed encoding fix is ported.

## Run
Open `spec-to-mask-v1.1.0.html` in Chrome / Edge. It is one UTF-8 HTML with no external font/CDN/runtime dependency. Existing v1.0 storage and backup are supported. Header Save provides text-only backup/restore with schema/checksum check and pre-restore undo.

## Navigation
Five six-Level Tracks share original Platform Stars / Cards but isolate workspace designs, guided state, Fab runs/seeds, comparisons and Lab. First-run Track selection is compact; original guides/AI/DB/cards/model scope remain in More / Advanced. Device is parameter-driven; view gestures do not move physical components. Lab keeps its existing parameter-generated layout and instance/diagnostic selection.

## Engineering integrity
Original kinds, solver, tables/calibration, geometry and Python GDS sources are unchanged. Next requires the current hard requirements and a fresh Test; historical completion is labelled separately. All six original Lab missions remain reachable, including Legacy Lab. Circuit export is not foundry sign-off. Only matching actual Python GDS recheck can mark Geometry Rechecked; Foundry Readiness stays NOT VERIFIED. Full LiDAR PIC GDS is unsupported.

## Verification and reproduction
`npm ci; npm run build; npm run build:offline`. Run original test scripts, `npm run test:studio`, and `npm run test:browser`. Browser suite accepts `SMQ_HTML`, `SMQ_QA_OUT` and optional `SMQ_BROWSER` executable. It records the exact HTML SHA256 and real viewport rectangles. `npm run test:py` uses `tools/smq2gds/requirements-ci.txt`.

Reference identity checks require full Git history, as on GitHub (`fetch-depth:0`). A source ZIP is intentionally history-free: identity baseline checks fail unless explicitly marked NOT RUN; that is not release validation. Use the repository for authoritative regression.

Release: `npm run release` produces exact-version HTML, Source ZIP, optional Python handoff ZIP and SHA256SUMS. See `docs/TEST_REPORT_V110.md` for final results, raw logs, CI linkage and limits.

## Next scope
User play acceptance first. Physical Windows/Edge, Android/iOS, Safari/Firefox and native keyboard/notch behavior remain separate device validation. Evaluate learning pacing and reference usability; any future Heater recalibration or foundry-specific PDK/DRC must be a separate physics change with new evidence and model/version policy.
