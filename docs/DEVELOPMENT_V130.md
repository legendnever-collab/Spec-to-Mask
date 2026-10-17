# v1.3.0-alpha.1 Development

## Baseline / Checkpoint A

2026-10-17: main `289523340dedb04866a07151614c521654c16bc3` confirmed. PR #22 merged, PR #19/#20 remain history. Main CI 39026996889 SUCCESS. No pre-existing local changes. Historical canonical beta.2 SHA256 b5ad7068ef669da067bdb9577d0efde07fa65c3a5d761ba437e1de62a3a76691 and QA artifacts preserved.

Curriculum architecture and all 23 step contracts documented before application coding. Existing model boundaries inspected. Implement only Chapter 0–1; 2–4 Preview. Minimal glue and unsupported metrics identified in CONTENT_MAPPING_V130.md. No main merge.

Checkpoints B–F pending implementation and actual validation; baseline test counts are not alpha.1 PASS.

## Checkpoints B–D (implementation checkpoint)

Sequential controller and isolated Tutorial/MZM workspaces, contextual knowledge, current-design evidence, live PN/Bench adapter, Optical Budget assumptions, Solution/Original, revisions and Final Review implemented. Original model source unchanged. Studio state regression: 56 PASS on the new working build; not final release acceptance. Browser QA and migration adversarial checks remain pending. New PR #23 is Draft.

## Recovery and scoped Checkpoint B — 2026-10-17

Remote initial HEAD `66ef410d817a3249420c369d7dac386737d02d6d`, PR #23 Draft/open; baseline main unchanged. Located the existing local checkout with two unpushed commits (`e0ab3319`, `1f43cee8`) and an untracked journey test. Preserved that checkout and copied the work to a recovery working directory; no previous artifact deleted. The recovered code included Chapter 1 implementation beyond the newly requested scope. Its history is retained, but this checkpoint removes that active implementation and exposes Chapter 1 solely as a Preview entry. No Chapter 1 mission is playable.

Implemented separate additive `smq3-studio.journey` platform records, independent Tutorial/MZM workspaces, sequential guards, revisits, practice/concept/current-evaluation/objective/completion fields, explicit current-model evidence, revision and session validation, source-model dependency signature, backup validation and quarantine recovery preserving valid Legacy fields. Saved numerical PASS is never trusted after reload/restore. Solution Preview and optional knowledge are read-only. Apply/Restore protect Original and snapshots, invalidate evidence, and do not credit hands-on practice.

Default landing offers one Start Learning action; Advanced/Legacy remains secondary. Checkpoint B supplies controller and navigation; playable Tutorial UI is deliberately pending Checkpoint C. Chapter 1–4 are Preview, no alpha.1 RC declaration or canonical packaging. Package metadata identifies `checkpoint-bc-preview`; old release artifacts remain intact.

Changed: `src/journey/{schema,core,ui}.js`, additive Studio/persistence adapters, build/model signature, package metadata, workflow gates, new controller tests and explicit Advanced browser-test entry.

Validation on current source build: `npm ci`, build, syntax (80 source/test/tool files + assembled script), 31 controller/migration checks, Studio 56, MZM model 111, upgrade 357/357, MRR 182/182, DR8 87/87, WDM 81/81, Design Lab unit/e2e/state across Si1310 and SiN1550 PASS. Physics, Bench equations, level IDs, thresholds and Lab engine have zero diff from baseline. Browser acceptance is running separately; it is not inferred from baseline CI. Initial browser run overlapped a build and observed an incomplete file during reload; rerun against the completed build is required.

Remaining: Checkpoint C playable Tutorial; D MZM 1-1…1-8; E review/migration/QA; F offline release candidate. PR #23 stays Draft and main remains unmerged.
