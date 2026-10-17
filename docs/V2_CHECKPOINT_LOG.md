# SPEC-to-MASK v2.0 — Checkpoint / Handoff Log

> Canonical requirements: [V2_MASTER_PLAN.md](V2_MASTER_PLAN.md)
> Original P0 execution order: [V2_P0_SOL_WORK_ORDER.md](V2_P0_SOL_WORK_ORDER.md)
> Owner approval and playable review required after each checkpoint. Update this file **at every new Work** before stopping.

Current handoff: **P0 delivered; review only. P1 requires explicit user approval.** See the P0 record and commit/CI receipt at the end.

## Status as of 2026-10-18 (KST)

| Checkpoint | State | User approved? | Evidence |
|---|---|---|---|
| P0 UX Architecture & Wireframes | BLUEPRINT / MOCK DELIVERED, REVIEW PENDING | No | Four design documents + isolated HTML +29 screenshots +164 browser checks |
| P1 Waveguide Tutorial | NOT STARTED | No | — |
| P2 MZM Physics Workbench | NOT STARTED | No | — |
| P3 200G-class MZM Lane | NOT STARTED | No | — |
| P4 1.6T MZM Engine | NOT STARTED | No | — |
| P5 1.6T MRM Engine | NOT STARTED | No | — |
| P6 1.6T EAM Engine | NOT STARTED | No | — |
| P7 3.2T / 400G Challenge | NOT STARTED | No | — |
| P8 Final Integration | NOT STARTED | No | — |

## Repository recovery pointers (must re-check on each start)

- Baseline main observed 2026-10-18: `289523340dedb04866a07151614c521654c16bc3`.
- Historical v1.3 PR #23: https://github.com/legendnever-collab/Spec-to-Mask/pull/23 . Last observed head `25ab11edeeb0af1f66dae8f32d4ae92f6bd43071`, Draft/Open and unmerged. An interrupted work session may contain unavailable, uncommitted local changes; no later patches from it have been verified here.
- v2 work branch: `feature/v2-learning-experience`, created from verified main and intended initially to be **documentation-only**.
- User design decisions were locked in 2026-10-18 chat and transcribed to `V2_MASTER_PLAN.md`. The repository files, not presumed chat memory, are authoritative for subsequent Work.
- No P0 UI code, new EAM solver, or 400G solver has been completed merely by publishing these planning documents.

## Initial handoff (before P0; retained for history)

1. Read this log, `V2_MASTER_PLAN.md`, `V2_P0_SOL_WORK_ORDER.md` on branch `feature/v2-learning-experience`.
2. Inspect real latest remote `main`, v2 branch/PR, PR #23, and local changes.
3. Perform **P0 only**: UX architecture, annotated three-screen wireframes, reusable solver data-flow mapping and P1/P2 tests; isolated mock if feasible. Do not modify physics.
4. Commit/push on the same v2 branch, update this log, keep PR Draft, **do not merge**.
5. Report links to exact artifacts and request user P0 review before P1.

## Checkpoint record template (fill when work actually completes)

### P{N}: <checkpoint name>
- Date (KST):
- Starting branch, HEAD and local changes:
- Source changes / documents:
- Exact commit SHA:
- Offline executable path, SHA256, source parity:
- Desktop/mobile screenshot refs:
- Tests & CI (commands, versions, run URL, PASS/FAIL/PENDING):
- Model boundary and NOT VERIFIED items:
- Known issues:
- User review result / approval date (never infer):
- Next checkpoint authorization:

## P0 — UX blueprint and isolated prototype (2026-10-18 KST)

### Recovery

- main unchanged at `289523340dedb04866a07151614c521654c16bc3`.
- Started existing `feature/v2-learning-experience` / Draft PR#24 at `712cc019cf1bdcc11d00ed2c2f6a646dda6de1cd`.
- PR#23 remains separate Open Draft at `25ab11edeeb0af1f66dae8f32d4ae92f6bd43071`; B/C history preserved, no whole-Journey import.
- Accessible old local folders contained unpushed v1.3 commits and uncommitted journey/studio/dist/tests/screenshots. Left untouched; separate local v2 copy used. No recovery material deleted.
- Starting CI#24 run39044204248 and PR#23 run39033277252 success; new-head runs must be checked separately.

### Delivered files

- `docs/V2_UX_ARCHITECTURE.md`: three view types, Discover/Engineer, responsive priority, read-only Learn, identity/persistence design.
- `docs/V2_WIREFRAMES.md`: annotated Engine / Waveguide / MZM screens, pixel bounds, actual desktop/mobile captures.
- `docs/V2_REUSE_MAP.md`: REUSE/ADAPT/NEW/UNSUPPORTED inventory, source provenance and future production adapter contract.
- `docs/V2_ACCEPTANCE_TESTS.md`: P1/P2 acceptance cases, negative identity/save/model tests, planned human trial.
- `prototypes/v2-p0/index.html`: offline3-scene UX MOCK, no production scripts or storage; `check.cjs`, `audit-source.cjs`, `verification.json`, `source-audit.json`, `QA.md`, `SHA256SUMS`,29PNG screenshots.
- `.github/workflows/v2-p0.yml`: isolated mock browser checks alongside unchanged production CI; evidence uploaded as an Actions artifact.

### Model decisions / limitations

- Existing `KINDS.wg` only supports width/modes/scattering. Deeper Lab inspection confirms **existing `LAB.routeLoss` already integrates90° strip-arc radiation + propagation**, using spiral/EIM helpers. Recommended P1 reuses this path with explicit domain/unit tests; width/mode lesson is fallback. Rib MRR routines are not interchangeable.
- P0 Waveguide displays geometric area and “Not evaluated” optical loss. MZM uses labeled dimensionless fixtures; no calibrated fields/actual volts/dB/BER or game PASS.
- Actual engine audit records four-platform outputs separately. Total arc loss need not decrease with R because propagation length increases; teach bend radiation and propagation separately.
- EAM and400G are NEW future models; no implementation/compliance claim.

### Local evidence

- Prototype164 assertions PASS across1440×900,1366×768,390×844,320×568, Light/Dark. Desktop simultaneous controls/diagram/plot/KPI; phone knob/KPI above fixed actions; below-fold detailed plot intentionally scrolls.
-29 actual screenshots under `prototypes/v2-p0/screenshots/`; hash and bounds in verification.json. No page errors/external runtime HTTP, no prototype storage writes; Learn/restore/theme/skip checks passed.
- Baseline build and canonical RC source parity PASS; production src/dist unchanged.
- Syntax75 files + assembled script PASS; Studio56, MZM Bench111, backup, Lab440 + Si/SiN e2e/state PASS.
- Local Python GDS attempt BLOCKED: `ModuleNotFoundError: klayout`; no local GDS PASS. CI installs pinned requirements; final CI outcome belongs in follow-up receipt below.
- No human learning/discoverability test performed;2–3min completion remains a design target. No production async adapter or migration test claimed.

### Review and stop point

User approval: **NOT GIVEN**. P1 authorization: **NOT GIVEN**. Main merge: **FORBIDDEN pending explicit approval**.

Top review decisions: (1) desktop60/40 + phone physical/KPI/control layout, (2) existing Lab arc-loss Tutorial path vs explicit width fallback, (3) nonblocking Discover/Skip and in-place Engineer constraints.

P1 proposed scope only: reviewed fixed-platform Waveguide lesson, existing loss kernel adapter, current-result identity, optional Learn, observation/skip progression, additive save/backup and viewport regression. No MZM production work, DR8 redesign, EAM or400G in P1. P2 later adds three real MZM experiments with separate approval.

Copyable future instruction (use only after user P1 approval): “Read V2_MASTER_PLAN, all P0 artifacts and V2_CHECKPOINT_LOG; confirm remote HEAD and P0 approval; implement P1 only using the approved Waveguide model path; preserve main/PR#23 and all saves; do not merge main or start P2.”

Implementation commit, artifact SHA256 and latest CI receipt are appended after the review payload is committed. This avoids pretending a commit can contain its own final SHA.
