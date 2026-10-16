# v1.1.1 — Live Tune / Inspect

2026-10-16. First implementation increment of the approved Transceiver build plan.
Based on v1.1.0 recovery commit `03e2eb51b4ab99676377bc167bf658d2595b8799`.
PR #19 stays Open/Draft; no merge to main. Follow-up work is stacked on its development branch.

## Implemented

- Desktop: persistent right Tune / Build and bottom Inspect below the Canvas. Each panel scrolls independently.
- Mobile portrait: Canvas + live KPI strip + Tune remain visible together; Details expands Inspect. Landscape keeps Tune on the right.
- More is between Start New and Guide. The bottom Tune / Inspect / Test / More bar is removed.
- Device edits automatically evaluate the existing solver. Valid numeric inputs apply before blur; blank, invalid and pending inputs block Next.
- Next synchronously evaluates the current design. An evaluated identity includes platform, difficulty, level, parameters, Guided/Full mode, step, card dependencies and model version.
- Lab pending edits are checked against the evaluated design; Next evaluates current geometry before proceeding. Verification and Export stay explicit and hash-bound. Their actions flush delayed edits first.
- Lab Export refreshes Next immediately. Lab Inspect shows Lab metrics, not the preceding device's tiles. Numeric rendering preserves keyboard focus.
- Version-based CI selects the current canonical executable rather than the historical v1.1.0 file.

No physics, hard requirement, score threshold, GDS generator, track ID or backup schema changes. Existing v1.1.0 evidence and executable remain historical deliverables.

## Verification checkpoint

- Current-source Studio/state: 56 PASS, including device and Lab immediate edit → Next, invalid numeric input, recovery, Reference/Original, track switch, modes, reload and backup.
- Pre-follow-up source checkpoint 4c6be84 Chromium browser: 167 PASS, zero page errors and zero external HTTP requests.
- Lab state integrity (si1310): PASS.
- JavaScript syntax: PASS, 71 files and assembled script.
- Canonical offline HTML: Studio 56 PASS and Chromium 168 PASS; zero page errors / external HTTP requests.
- Source parity and intentional mismatch rejection: PASS.
- Executable: `dist/spec-to-mask-v1.1.1.html`; SHA256 `d3718f1393f7237aa84b872e82a2ff5cb3e2e222ad573ae4cdee4fceb3157cdf`.
- Source/build checkpoint: `6d4b1165a49f008933007f6ea6feddbbc4715f03`. Complete evidence: `artifacts/v111-live/manifest.json` and `browser/results.json`.
- Stacked PR #20: final exact-head CI is reported in the PR after this artifact checkpoint. Source checkpoint CI is not substituted for it.

Local dependencies reuse the existing unchanged dependency lock; no package upgrades. Local Chromium 153 was extracted from an already cached package. The local OS has no Korean system font; geometry screenshots therefore do not certify Korean glyph rendering. No external fonts or runtime requests are added.

## Remaining build-plan milestones

This increment is the Live UI and automatic evaluation milestone only. The following are still planned, not represented as implemented:

1. MZM single-lane bench, clearly separated Si PN / TFLN assumptions and reference validation.
2. 1.6T MZM Tx + Rx course, reusable component cards, monitored eight-lane integration and GDS handoff.
3. MRM DR8 / WDM8 course and thermal/control comparisons.
4. Independent FMCW LiDAR chapter, separate project progression and capstone.

User play review of this increment precedes the next course/model expansion. Main merge and formal release require separate user approval.

## Final input-draft correction and interrupted-file recovery

The added Lab regression reproduced an invalid draft being overwritten when focus left before the 90ms render. Scheduled rendering now preserves incomplete fields even after blur; intentional navigation still rebuilds controls. The regression fails before this fix and passes afterward. No solver changes.

2026-10-17: the interrupted local HTML was incomplete. Rebuilding from source reproduced the exact previously tested `d3718f…3157cdf` bytes (168 browser checks), and all 56 state checks were completed again against that canonical file. Only complete logs count as PASS. Prior f9473e8 CI completed successfully; the latest follow-up commit's CI is reported separately in PR #20.
