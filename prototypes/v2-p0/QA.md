# P0 Verification Record

2026-10-18 KST · **Review candidate, user acceptance pending.**

## Scope and executable

- Source baseline: `289523340dedb04866a07151614c521654c16bc3`.
- Starting v2 commit: `712cc019cf1bdcc11d00ed2c2f6a646dda6de1cd`.
- Tested deliverable: `prototypes/v2-p0/index.html`, self-contained **UX mock**, not the production game.
- HTML SHA256: `70d592522514a06e842e669b2aa613938763d17ed3abc4eab66ebf6ffb584dd2`.
- Tests were run on these exact HTML bytes before commit. The checkpoint log records the implementation commit; later documentation-only commits do not change this artifact.
- Runtime: Nodev24.19.0, Chromium153.0.8010.0; repository-installed development dependencies reused. No dependency versions or lockfile changed.

## Actual results

| Check | Result / scope |
|---|---|
| Prototype browser | **164 assertions PASS**.3 scenes ×4 viewports ×2 themes,44px actions/range, desktop no page scroll, mobile primary control/KPI visible |
| Interaction | Same mock revision in diagram/plot/KPI; length/radius change; keyboard; protected Original vs captured comparison; in-place Engineer |
| Optional reading | Learn selected state; Close/Escape preserve memory state and return focus |
| Progression fixture | Continue/Skip without Engineering PASS; no false observed completion when unmanipulated |
| Isolation |0 external runtime HTTP,0 page errors,0 prototype storage writes; synthetic preexisting legacy key bytes preserved |
| Screenshots |29 actual PNGs:24 required scene/theme/size captures, Engineer, Learn,2 edited views,1 baseline Studio |
| Read-only source audit |4 platforms; widths, actual MZM length outputs and Lab90° arc loss components recorded; no external accuracy assertion |
| `npm run build` |PASS; `git diff --exit-code -- src dist/index.html` clean |
| `node tools/check_rc.js` |PASS; historical canonical beta.2 SHA256 `b5ad7068ef669da067bdb9577d0efde07fa65c3a5d761ba437e1de62a3a76691` preserved |
| `npm run test:syntax` |PASS,75 files + assembled script; prototype inline syntax parsed separately and executes in Chromium |
| `npm run test:studio` |56 checks PASS |
| `npm run test:mzm-bench` |111 checks PASS |
| `npm run test:backup` |PASS, existing persistence/backup/quarantine/rollback end-to-end |
| `npm run test:lab` |440/440 engine checks + Si1310/SiN1550 e2e + state integrity PASS |
| `npm run test:py` |**BLOCKED locally**, missing `klayout`; first Python script exits before GDS tests, circuit script not reached |
| GitHub CI |Starting-head CI39044204248 success. New-head CI is recorded separately in checkpoint log; no new-head success inferred from starting run |

## Limits and review items

- No P1/P2 production UI, model adapter, new save schema, score or coefficients implemented.
- Mock curve consistency is not scientific validation. Actual asynchronous identity races are P1/P2 tests, not implemented/tested here.
- `KINDS.wg` has no bend model; existing Lab strip/EIM arc model is the recommended P1 reuse route after domain/unit review. P0 itself computes geometry only and labels loss unavailable.
- No user learning study,2–3min efficiency result, external model calibration, BER/FEC/IEEE/net-rate, EAM or400G validation.
- Mobile graph is intentionally below the initial viewport. Readable compact schematics replace shrunken desktop diagrams; detailed phase/field views require optional enlargement in P1/P2.
- English prototype copy avoids this container's missing Korean fonts. The preserved baseline screenshot shows missing legacy Korean glyphs; Korean localization/zoom/screen-reader QA remains pending.
- User should review desktop60/40, mobile physical→KPI→control priority, existing Lab bend path vs width fallback, and nonblocking Discover→Engineer behavior.

See [acceptance contracts](../../docs/V2_ACCEPTANCE_TESTS.md) for future gates and [checkpoint log](../../docs/V2_CHECKPOINT_LOG.md) for exact commit/CI handoff.
