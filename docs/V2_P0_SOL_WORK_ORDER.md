# GPT-6.1 Sol Work — P0 Detailed Development Order
## SPEC-to-MASK Quest v2.0 | UX Architecture & Interactive Physics Workbench Blueprint

> **Execution scope: P0 ONLY**  
> Canonical requirements: [V2_MASTER_PLAN.md](V2_MASTER_PLAN.md)  
> Checkpoint log: [V2_CHECKPOINT_LOG.md](V2_CHECKPOINT_LOG.md)  
> Repository: https://github.com/legendnever-collab/Spec-to-Mask  
> Target branch: `feature/v2-learning-experience`  
> Release policy: **Draft PR, NO main merge**, no automatic P1+ development.

### 0. Mission and roles

Act as (1) learning experience director, (2) photonics educational architect, (3) expert PIC/SiPh engineer, (4) UI/UX designer, (5) frontend/software architect, (6) engineering model-verification reviewer, and (7) release/QA engineer.

**Mission:** Turn the already developed Spec-to-Mask into an intuitive physics-to-engineering learning journey. **Do not implement all v2.0 in this task.** Produce a coherent, reviewable P0 blueprint, genuinely inspect existing code and representative screenshots, and produce a lightweight UI prototype or wireframe set if safe. Stop and seek user play/design review after P0.

### 1. Essential user decisions — do not reinterpret

- **Experience First, Explanation on Demand**: learners should discover physics through direct manipulation instead of reading before doing. Optional Learn Physics can be detailed.
- **One Screen, One Discovery**: at desktop 1440×900, a one-line current question, physical view, live observed effect, 1–3 controls, key KPI and a 1–2 sentence cause/trade-off belong on the same first viewport.
- **Discover → Engineer**: same Workbench; Discover is easy/ungated exploratory interaction, Engineer adds meaningful design constraints without replacing the entire interaction screen. Optional optimization/Fab/advanced challenges should not block basic learning.
- Overall learning story: Waveguide → 200G-class MZM Lane → **1.6T MZM Engine first milestone** → MRM → EAM → 3.2T/400G lane architectural challenges. Reuse established common knowledge instead of compulsory repetitions.
- Main UI must not proliferate long reading panels or Verify/Next click mazes. Learn Physics is optional, contextual, scrollable separately, no saved-state changes.
- Visuals must communicate **physically plausible causality**. One shared design/evaluation identity drives physical visual, live graph and KPI. Avoid animations that imply false optics (e.g. MZM modulation solely as light dimming inside a phase shifter).
- Existing `src/kinds`, MZM bench/eye, DR8, MRR, six Lab missions, platform system, GDS, original level IDs, Save/Backup, Light/Dark, Legacy mode are protected. Unverified model metrics must never be presented as truth.

### 2. Recovery first (must be first execution)

Before modifying files:
1. Read latest GitHub main, PR #23, all v2 branch commits, currently open PRs/CI and local git status. Check any interrupted Work changes if actually accessible; if not, say so. Record exact observed SHAs and never substitute historical status claims.
2. Inspect `docs/V2_MASTER_PLAN.md`, this order and `docs/V2_CHECKPOINT_LOG.md` from the v2 branch; do not rely on chat-only summaries for requirements.
3. Locate implementation boundaries in `src/studio.js`, `src/studio.css`, `src/head.html`, `src/shell.js`, `src/kinds/wg.js`, `src/kinds/pn.js`, `src/kinds/mzm.js`, `src/kinds/mrr.js`, `src/bench/`, `src/lab/`, `src/journey/` (available on PR #23 only).
4. Review real code/relevant tests for preexisting Live Inspector, control → evaluator → result, current design hash, MZM bench dynamic eye, legacy Lab save and offline build. Categorize as **REUSE AS-IS / ADAPT / NEW / UNSUPPORTED**.
5. Keep `main`, PR #23, historic release HTML and all user data unchanged. Do not cherry-pick whole PR #23 automatically. Do not reset uncommitted files; back them up first.

**Expected recovery report:** concise `Remote HEAD / v2 branch / PR#23 / CI / local changes / reuse findings`.

### 3. Deliverable A — architecture design, not generic UX prose

Create `docs/V2_UX_ARCHITECTURE.md` with:
- Information hierarchy and navigation: Engine Overview ↔ Physics Workbench ↔ optional Learn Physics; progress, return, current part and engine context visible but compact.
- Precise desktop 1440×900 component layout: header/mission height, main left physical Canvas+graph area (target ~60%), adjacent right controls + immediate 2–3 KPI + discovery (target ~40%); how to deal with 1366×768.
- Mobile layouts for 390×844 and 320×568 with priority on canvas→critical KPI→control and minimal excessive scrolling, no horizontal overflow.
- Main view copy **budget**: one question, one action cue, a 1–2 sentence discovery; no technical tables unless contextual, no duplicated primary actions.
- 3 screen types and 2 activity states (**Discover/Engineer**), action/feedback/state transition rules and accessibility (keyboard, focus, contrast, input labels, prefers-reduced-motion).
- A structured "causal chain" per lesson: `change parameter → physical state → computed response → KPI & Δ → one-sentence why`.
- Optional Learn Physics overlay: selected device/parameter/value, intuition, physical theory, formulas, actual assumptions & validity level, citations, no state/progress mutation; returns focus and viewport to previous state.
- Before/after snapshot, reset/undo/protected Original, stale-identity handling.
- The approach for keeping old Advanced/Legacy functionality discoverable but secondary.

### 4. Deliverable B — 3 annotated UI wireframes (reviewable)

Create `docs/V2_WIREFRAMES.md` **plus** a representative viewable, standalone mock HTML in `prototypes/v2-p0/` if technically feasible without touching current production physics or risking an endless implementation detour. The mock must state **UX MOCK — NOT PHYSICS VERIFIED**, not show made-up solver metrics as actual outcomes.

Create **three specific scenes**:
A. Engine Overview: user sees `Laser → Tx MZM×8 → optical interface/fiber → Rx`, Stage completion and a single Continue/Start action. Show current part and 1.6T goal; signal unavailable metrics as "not yet evaluated".
B. Waveguide Tutorial Workbench: bend radius input (or genuinely supported existing `wg` control following audit), physical waveguide path, meaningful loss/footprint response, contextual why/discovery, Next/Skip, Learn Physics. **No laser-power, PAM4 or mandatory Verify**.
C. MZM Phase Shifter Workbench: interaction length ↔ Vπ/optical loss with live MZI phase/interference view; Discover vs Engineer by adding constrained drive/loss goals; contextual Learn Physics. Outline optional RF/Eye expansion but do not code it here.

For each scene state exact x/y/width/height or equivalent CSS Grid allocation, primary action, what responds to which change, where model assumptions appear, and what is hidden until advanced usage. Show 1440×900 and 390×844 reference screenshots when browser tooling permits. A wireframe must be concrete enough for P1/P2 to implement without guessing.

### 5. Deliverable C — existing-code and physics adapter mapping

Create `docs/V2_REUSE_MAP.md` with a code-path table: existing control name, solver/evaluator entry, physical output, current visual, model tier, limitations, proposed adapter/reuse, and responsible checkpoint.

Required focus:
- Waveguide bend radius: **verify existing actual model coverage**. If current `wg` evaluator does not expose physical bend loss, mark as unsupported, propose a small P1 extension with documented formula/limitations **or choose a truly supported waveguide control**. Never animate/model bend loss as if supported without evidence.
- MZM PN geometry, interaction length, phase modulation, RF/EO and dynamic PAM4 Eye: distinguish direct actual-engine data from proposed illustrative visualization. Confirm linked vs independent bench results and how they are synchronized.
- 1.6T DR8, optical budget and Rx assumptions: no invented end-to-end BER.
- MRR and heater/WDM engine reuse; EAM/400G are **NEW model tasks** and need future scope/verification.
- Input-state identity flow, revision invalidation, persistence migration and recovery.
- Record `112 GBd × 2 PAM4 bits/symbol = 224 Gb/s raw`; educational 200G-class link ≠ certified net 200G. 3.2T/400G scenario ≠ validated external compliance.

Include interface proposal `DesignState → evaluate (unchanged base solver) → {physicalObservation,plots,KPIs,confidence,designHash}`, identify which existing functions can be reused instead of inventing new physics.

### 6. Deliverable D — UX test strategy and P1/P2 acceptance cases

Create `docs/V2_ACCEPTANCE_TESTS.md`.
At minimum:
1. Desktop 1440×900 and 1366×768: primary knob+Canvas+key results visible simultaneously without vertical scroll; no obscured control/overlap.
2. Mobile 390×844 / 320×568: readable, touch-operable, no horizontal scroll; visible or easy-to-reach live feedback.
3. Tutorial: no Laser/PAM4/gating; change value, get immediate physical response; first-time user can Continue/Skip without studying Learn.
4. MZM: voltage or length change updates **same-revision** physical diagram, graph and KPI; reverse and restore; no stale PASS; comparison before/after; actual model assumptions exposed.
5. Deep Learn open/close changes no design, evidence, completion, or focus continuity.
6. Contextual error handling: unsupported variable, malformed input, same-seed/revision, slow solver, theme switch, reload/backup migration/Legacy separation.
7. Keep existing regression suite: `npm run test:studio`, `npm run test:mzm-bench`, `npm run test:lab`, `npm run test:py`, `npm run test:backup`, relevant browser tests; record actual runtime and scope, never claim tests not run.
8. Physics truthfulness audit: model/visual consistency, assumptions visibly indicated where necessary, no fake BER/IEEE/Fab.
9. Learner observation: can test user discoverability with a short 2–3-minute first-time task, but distinguish **planned validation** from **observed usability test PASS**.

### 7. Deliverable E — P1/P2 handoff plan and checkpoint log

Update `docs/V2_CHECKPOINT_LOG.md`:
- P0 commit(s), exact files, SHA, screenshots/mock URL if any; actual tests + CI (pending vs verified); open issues / model gaps; user review questions; and specific **P1 implementation boundary**.
- Confirm no P1+ production physics/UI work was secretly done.
- Provide the next Work's suggested copyable instruction: “Read v2 master plan, P0 artifacts and checkpoint log; confirm remote HEAD; implement P1 only; do not merge main.”

### 8. Change discipline, CI, PR and stop condition

- Prefer **documentation-first** edits and an isolated HTML mock for P0. Do not modify existing solver coefficients, level thresholds, scoring, save schema or production engine in P0.
- If HTML mock is produced, ensure it is self-contained, functional enough to compare controls and responsive layouts, visually labelled as prototype. Screen captures should come from the actual prototype, not AI-generated illustrative graphics.
- Build/test only the changed artifacts and basic smoke/CI; report what actually ran and whether legacy CI is applicable to docs-only work.
- Commit & push P0 on `feature/v2-learning-experience`; create/update **one Draft PR** to main for the branch. Never automatically merge, close PR #23 or approve P1 for the user.
- If a tool or environment blocks something, record precisely which deliverable is incomplete and finish remaining independent tasks. Do not wait indefinitely, rerun a stuck command without diagnosis, or pretend success.
- End with: short recovery status, links to documents/PR, any mock HTML, screenshots, tested commit/hash, top three design decisions requiring user review; explicitly state **STOP: P0 complete/pending user approval**.

### 9. Success criterion

The user must be able to look at the P0 artifacts and decide whether to build the Waveguide Tutorial and MZM Workbench in this format. This checkpoint succeeds **only if concrete screen composition, interaction causality, source reuse and physics honesty are auditable**. A generic strategy memo or an unreviewable plan is not sufficient.
