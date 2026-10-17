# SPEC-to-MASK v2.0 — Checkpoint / Handoff Log

> Canonical requirements: [V2_MASTER_PLAN.md](V2_MASTER_PLAN.md)
> Original P0 execution order: [V2_P0_SOL_WORK_ORDER.md](V2_P0_SOL_WORK_ORDER.md)
> Owner approval and playable review required after each checkpoint. Update this file **at every new Work** before stopping.

Current handoff: **P1 진행을 사용자에게 승인받았습니다 (2026-10-18 01:06 KST). 기술 용어는 English, 설명과 서술어는 한글로 작성합니다. P2/merge 승인은 없습니다.** See the P0 record and commit/CI receipt at the end.

## Status as of 2026-10-18 (KST)

| Checkpoint | State | User approved? | Evidence |
|---|---|---|---|
| P0 UX Architecture & Wireframes | BLUEPRINT / MOCK DELIVERED, REVIEW PENDING | No | Four design documents + isolated HTML +29 screenshots +164 browser checks |
| P1 Waveguide Tutorial | IMPLEMENTED / PLAY REVIEW PENDING | Implementation authorized; play acceptance pending | User: “P1 진행하는데 대전제가 기술적 용어는 영어 서술어는 한글로 해줘.” |
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

### P0 publication receipt

- Published implementation commit: **`b77ca3c21f7c532cbd1901bdb7dc531f004615cd`**.
- Complete tree: `9a99fe110650398811d2c87676f663d4a7e5afa3`, exactly equal to the locally tested/committed tree (all44 files, including binary screenshots). GitHub connector upload used because terminal HTTPS writes had no credential; no force push or competing branch.
- Local unpublished preparation commit `81f73d5d755bb5fe031f8ed232b0e3d3e39a0ef4` has the same tree and remains recoverable in local git history/reflog. Local branch metadata synchronized only after tree equality; file content was not discarded.
- Prototype HTML SHA256: **`70d592522514a06e842e669b2aa613938763d17ed3abc4eab66ebf6ffb584dd2`**. `sha256sum -c prototypes/v2-p0/SHA256SUMS` passes all34 entries.
- Local prototype164 browser assertions PASS. This is the exact payload tested; follow-up receipt changes only checkpoint/QA text.
- Implementation-head CI started: [P0 browser39047325099](https://github.com/legendnever-collab/Spec-to-Mask/actions/runs/39047325099), [production CI39047325119](https://github.com/legendnever-collab/Spec-to-Mask/actions/runs/39047325119). **IN PROGRESS at receipt**, not reported as PASS here.
- Latest receipt-head CI must be read from [branch runs](https://github.com/legendnever-collab/Spec-to-Mask/actions?query=branch%3Afeature%2Fv2-learning-experience); final PR body/report records the actually observed outcome. Later canceled superseded runs are not failures of physics.
- Main and PR#23 remain unchanged; PR#24 stays Draft. No P1 authorization, no main merge, no scientific/user-learning acceptance inferred.

## P1 시작 기록

- 기준 HEAD: `c231bc982ce693f2b93f7e66c6d5014b8266d6cf`, Local 변경은 없었습니다. main과 PR #23은 기존 HEAD를 유지합니다.
- 사용자 지시에 따라 P1만 구현합니다. P0 전체 사용성 PASS를 추정하지 않습니다.
- 기본 Si1310의 고정 Width에서 기존 `LAB.routeLoss`를 연결합니다. 같은 Kernel을 쓰는 Platform별 Workspace를 분리하고 기존 Solver 계수는 바꾸지 않습니다.
- 새 UI와 Learn Physics는 English 기술 용어 + 한글 서술어로 작성합니다. P0 Prototype과 기존 Release는 보존합니다.

## P1 구현 / 검증 기록 (2026-10-18)

- 사용자 지시에 따라 기술 용어는 English, 설명과 서술어는 한글로 작성했습니다. `docs/V2_LANGUAGE_POLICY.md`에 다음 Work의 대전제로 기록합니다.
- `src/v2/schema.js`, `core.js`, `ui.js`, `workbench.css`로 실제 `LAB.routeLoss`와 연결한 Tutorial을 구현했습니다. Model 계수는 바꾸지 않았습니다.
- 기본 Si1310에서 시작하며 4 Platform별 고정 Width / Radius Domain과 Workspace를 분리합니다. Geometry와 Bend / Propagation / Total Loss를 구분합니다.
- Engine Overview → Waveguide → Summary까지 제공합니다. 관찰 없는 Continue/Skip은 완료 증거로 보지 않습니다. P2 MZM은 아직 구현하지 않았습니다.
- `smq-v2-learning` Namespace를 기존 Store의 Backup / Restore / Undo / Quarantine에 추가했습니다. 기존 `smq3-studio.journey`는 보존하고 새 완료 증거로 가져오지 않습니다.
- 새 실행 파일: `dist/spec-to-mask-v2.0.0-alpha.1-p1.html`. `dist/index.html`과 Byte 단위로 같습니다. 기존 beta.2와 P0 파일은 보존합니다.
- 실제 결과: P1 State/Model 93, P1 Browser 121, Studio State 56, MZM Model 111, Lab 440 + Si/SiN e2e/state, Backup, Legacy Studio Browser 168, Legacy MZM Browser 37을 통과했습니다.
- 4 Viewport × 2 Theme의 실제 한글 화면을 `artifacts/v2-p1/`에 제공합니다. Runtime 외부 HTTP와 Page Error는 없었습니다. Offline Font와 OFL License를 포함합니다.
- Python GDS 검사는 Local klayout 부재로 중단됐습니다. 사용자 학습 효율 / 외부 Physics Accuracy는 검증하지 않았습니다. P1 CI는 게시 후 별도로 확인합니다.
- SHA256 / 상세 QA: `artifacts/v2-p1/SHA256SUMS`, `artifacts/v2-p1/QA.md`, `browser-report.json`에서 확인할 수 있습니다.
- P1 구현 승인은 있으나 Play Acceptance / P2 / main Merge 승인은 없습니다. P1 검토에서 중단합니다.
