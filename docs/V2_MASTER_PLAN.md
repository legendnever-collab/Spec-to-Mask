# SPEC-to-MASK Quest v2.0 — Master Development Plan

> **Authoritative project brief** — 2026-10-18 (Asia/Seoul)  
> Repository: https://github.com/legendnever-collab/Spec-to-Mask  
> Development branch: `feature/v2-p2-mzm-workbench` (P1: `feature/v2-learning-experience`, merged PR #24)  
> Current status: **P1은 사용자 Play 승인 후 PR #24로 병합했습니다. P2 MZM Workbench는 별도 Branch에서 구현하며 Play Review 전 main 병합을 금지합니다.** ([architecture](V2_UX_ARCHITECTURE.md), [wireframes](V2_WIREFRAMES.md), [reuse map](V2_REUSE_MAP.md), [acceptance tests](V2_ACCEPTANCE_TESTS.md)). P1 구현 범위는 [V2_P1_WAVEGUIDE.md](V2_P1_WAVEGUIDE.md)에 기록합니다. P2 범위 / Model / Test Plan은 [V2_P2_MZM_WORKBENCH.md](V2_P2_MZM_WORKBENCH.md)을 따릅니다. 사용자 학습 효율과 P2 Play 승인은 아직 검증하지 않았습니다.
> Release policy: each checkpoint requires an offline playable review artifact; **do not merge main without explicit user approval**.

## P2.2 현재 범위 — 2026-10-20

사용자 Physics Fidelity Work Order의 A–F를 같은 PR #25에서 진행합니다. [Scientific Specification](V2_P22_SCIENTIFIC_SPECIFICATION.md), [Material Matrix](V2_P22_MATERIAL_DOMAIN_MATRIX.md), [Mode Provenance](V2_P22_MODE_PROVENANCE.md), [QA](../artifacts/v2-p22/QA.md)가 현재 정본입니다. 기존 Solver와 계수는 보존하며, B/C/D 분류와 Unsupported를 노출합니다. UI·모델 일치 검증과 외부 물리 정확도는 별도입니다. Full Parameter Set이 없는 Material의 임의 Loss Curve를 만들지 않습니다. 최종 Play Review 전 main 병합 / P3 시작은 금지합니다.

## P2.1 이전 범위 — 2026-10-18

사용자 Feedback에 따라 P2.1 Learning Foundations / Visual Redesign을 같은 PR #25 / Branch에서 진행합니다. Tutorial → Roadmap → Passive 3개 → MZM Intro → 기존 MZM 3개 흐름이며 [P2.1 설계](V2_P21_LEARNING_REDESIGN.md) / [Visual System](V2_P21_VISUAL_SYSTEM.md) / [Acceptance](V2_P21_ACCEPTANCE.md)을 현재 정본으로 사용합니다. 아래 P0–P8의 역사적 설계와 Baseline은 보존합니다. 이번 사용자 지시는 P2.1 내부 Checkpoint A–E 전체 구현을 승인하지만 P3 / main 병합은 승인하지 않습니다.

## Language policy — 사용자 확정 (2026-10-18)

기술 용어와 Parameter/KPI 이름은 English로 유지하고, 설명·질문·서술어는 한글로 작성한다. 예: “Bend Radius를 늘리면 Bend Radiation Loss가 감소하지만 Footprint는 증가합니다.” 신규 UI, Learn Physics, Discovery, 오류 안내와 인수인계에 적용한다. 기존 Legacy 문구와 Historical Artifact의 일괄 번역은 이번 P1 범위에 포함하지 않는다.

## 0. The non-negotiable product mission

Transform a component-by-component photonics puzzle into an **Interactive Engineering Learning Simulator**.

The learner should first **build a 1.6 Tb/s MZM optical engine** (initial engineering path: 8 × 200G-class lanes), then build/compare **MRM** and **EAM** alternatives, and ultimately understand what becomes difficult when targeting **3.2 Tb/s with 400G-class lanes**. The capstone is an *architecture decision*, not a fabricated 400G PASS.

The learner should be able to explain in their own words:
- Why increasing MZM interaction length can reduce drive voltage while increasing loss and potentially creating RF/EO trade-offs.
- Why a resonant MRM can be compact and efficient but requires resonance/detuning/thermal control.
- Why EAM has a different absorption-driven operating point and loss/chirp/material trade-offs.
- Why per-lane speed doubling challenges modulator EO/RF, drivers/TIA, optical power/OMA, noise/ISI, thermal, packaging, and verification, with architectural alternatives (e.g., 8×400G vs 16×200G).

### Definitive UX philosophy
**Experience First, Explanation on Demand.**  
**One Screen, One Discovery.**  
**Discover → Engineer**, not read → optimize blindly → Verify repeatedly → Next.

A new learner must be able to manipulate a visible physical parameter and **simultaneously see physical cause, performance result, and trade-off** without first studying a long text. Detailed technical learning belongs in optional, context-aware **Learn Physics** content, reachable with an explicit button; depth there is welcome.

This is not a "click Next many times" tutorial. One meaningful experiment can involve repeated manipulation and before/after comparison *within a single screen*.

### Decisions already fixed by the user — do not re-litigate
1. Main story: Waveguide onboarding → 200G MZM lane → 1.6T MZM engine → 1.6T MRM engine → 1.6T EAM engine → architecture comparison → 3.2T/400G challenge.
2. **First completed target is a 1.6T MZM engine**, not merely an isolated 200G link.
3. Desktop engineering interaction must place manipulation and visual response on the **same viewport**, not across separate scroll sections or tabs.
4. On the main screen show a **one-line question, action, visual result, and one-/two-sentence discovery**, not a long article or a forest of controls.
5. Deep physics, equations, assumptions, citations, and reference material are **optional**, contextual, and may be extensive; opening/closing Learn Physics must not mutate design/progress.
6. Beginner Discover is exploratory and passable without optimization gates; Engineer adds real design constraints and evidence; high-performance optimization, Fab/yield, and packaging complexity may be separate challenges.
7. Use existing physics, Lab/GDS, offline, Save/Restore, themes and Advanced/Legacy functionality where valid; **preserve historical data**.
8. Implement **one checkpoint per Work session** and stop for user play validation; no autonomous completion of all P0–P8.

## 1. Actual starting baseline and recovery protocol

As checked on 2026-10-18:
- `main`: `289523340dedb04866a07151614c521654c16bc3` (v1.2.0-beta.2 base).
- Existing open Draft **PR #23**: `feature/v1.3-learning-journey`, last observed HEAD `25ab11edeeb0af1f66dae8f32d4ae92f6bd43071`; Checkpoints B/C for v1.3 Tutorial were reported, D/E/F outstanding. The screenshot's interrupted Work may have **uncommitted, inaccessible changes**; never assert those were pushed.
- Existing relevant models/components: `src/kinds/{wg,pn,mzm,mrr,pd,els,xcvr,wdm}.js`, MZM bench / dynamic Eye, Stage 3 1.6T DR8 & WDM, 6-mission Design Lab, offline HTML, backup/restore, GDS recheck.
- Reusable work on PR #23: sequential controller and scoped workspaces `src/journey/{schema,core,ui,tutorial}.js`, revision-linked evidence/fingerprints, practice vs objective flags, protected Original/Solution, persistence and migration. **Selective extraction only**; do not import v1.3 Laser→PAM4→Verify tutorial as v2 onboarding.
- **EAM dedicated solver and validated 400G/lane engineering model are not existing completed modules**. Model-spec and validation gates are required before claiming such features.

On **every new Work session**, fetch latest remote `main`, PR #23, v2 branch/PR, check source and HEAD, document availability of local worktrees and their git status, preserve any changes, then continue from the last verified v2 checkpoint. Never assume the above SHA remains current. Never restart/replace history to hide prior work. Keep PR #23 intact and do not merge it into main as a shortcut.

**Canonical v2 knowledge handoff**: this file + `docs/V2_P0_SOL_WORK_ORDER.md` + `docs/V2_CHECKPOINT_LOG.md`. At every checkpoint update this plan if decisions actually change, and update the checkpoint log with commit, HTML, SHA256, tests, known limitations, pending items and next-step input.

## 2. Learning journey and curriculum structure

| Stage | Learner's engineering question | Experience / deliverable | Reuse and new work |
|---|---|---|---|
| 0. Play Tutorial | How do I change something and read a physical response? | Waveguide bend radius ↔ loss ↔ footprint; short interaction, no performance gate | `wg` / existing bend/loss/geometry where supportable; adapt only faithfully |
| 1. MZM Discover | How do PN, length, phase, voltage, RF/EO and eye relate? | Interactive 200G-class MZM lane experiments; physics + live comparison | PN, MZM, bench, eye |
| 2. 1.6T MZM Engineer | Can 8 lanes close an optical link and fit a package? | 8-lane DR8 dashboard, optical budget, schematic/routing, evidence | DR8/ELS/PD/Lab/GDS |
| 3. MRM | What resonance trade-offs change my architecture? | Resonance/FSR/Q/photon lifetime/detuning/thermal + MRM engine | MRR/TO/DR8/WDM |
| 4. EAM | What changes with absorption-driven modulation? | Bias, absorption, ER/IL/OMA/chirp and engine | New physics model required; no renamed MZM proxy |
| 5. Architecture Review | Which modulator do I choose under the same assumptions? | Comparable KPI scorecard + caveats + learner rationale | Existing results + honest normalization |
| 6. 3.2T Challenge | What breaks when attempting 400G per lane? | Bottleneck discovery; compare 8×400G vs 16×200G and other justified options | New/further validated high-speed assumptions |

**Terminology:** at 112 GBd PAM4, gross line rate = **224 Gb/s raw**, not independently verified net 200G/FEC compliance. `1.6T = 8×200G` and `3.2T = 8×400G` in the game are **defined educational architecture targets**, not proof of Ethernet compliance. For 400G PAM4, 200 GBd corresponds to 400 Gb/s raw ignoring overhead. Do not conflate predicted raw Eye gap with BER/FEC or certification.

### Reuse without repetitive instruction
Once learned, common concepts (waveguide, PN, laser, PD, RF and link budget) are available via optional contextual Learn Physics and may be recalled briefly. The same **engineering evidence must still be re-evaluated** under new MRM/EAM design-specific assumptions. No inherited historical stars/cards constitute current target PASS.

## 3. Design system: three reusable views

### A. Engine Overview (macro-level)
Show `Laser → Tx PIC → 8 lanes → Fiber/FAU/package → Rx` with current device, cumulative performance, unavailable or model-only KPIs explicitly marked. A user should always know "What am I building, what part am I exploring now, and what is next?" Do not flood first entry with every advanced component.

### B. Interactive Physics Workbench (micro-level, primary)
For desktop reference at **1440×900** (also check 1366×768):
- Compact header: progress + one **question** + return to Engine Overview.
- Large physical/behavioral Canvas and live response chart occupying approximately 60% of main area.
- Adjacent Tune/Observe panel approximately 40%: 1 main knob at Discover entry, initially no more than 2–3 relevant knobs; **visible directly beside live results**.
- At most three primary KPI tiles with before/after Δ, one compact **Why / Discovery** note (≤2 short sentences), Learn Physics entry.
- Context-dependent action: Continue Experiment / Enter Engineer / Next when applicable. No redundant row of Test/Verify/Solution/Next/More as simultaneous primary buttons.
- Changing a real design state triggers solver → physical view, chart and KPI from **one exact current-result identity**. Old/pass/stale results must not masquerade as current.
- Visual animation must reflect actual model physics; e.g., MZM electrical phase shift is not simply a brightness dimming inside one arm, but interference after recombination.
- Use temporary visual emphasis/arrows only to point at the affected structure or plotted change; avoid misleading decorative animations.
- Present a baseline vs current result or reversible snapshot where it improves discovery. Keep Reset/Undo/Original reliable.

**Mobile:** 390×844 and 320×568. Prioritize Canvas + live KPI + one control in viewport; offer compact stacked controls or bottom sheet, not tiny text, horizontal overflow, or hiding essential data behind inaccessible scroll. The desktop *one viewport* criterion is primary, while mobile may scroll intentionally with visible action/result linkage.

### C. Deep Learning Library (optional, separate overlay/panel)
Contextual to the selected device, parameter, present physical state and relevant calculated numbers. Organize: intuition → actual mechanism → equation/derivation → operating constraints/trade-offs → model assumptions & validation tier → sources/references. May be lengthy and scrollable **only after user opts in**. The Learn Physics trigger must not add mandatory gates, advance the lesson, modify parameters or award credits.

## 4. Progression, hints, and achievement

Keep these three concepts distinct:
- **Discover Completed:** learner actually manipulated and observed at least one meaningful change, not just clicked through; no difficult target or hard Verify requirement.
- **Engineer Design Target Met:** computed from current model/design revision against declared targets/assumptions; use constraints and traceable evidence, not invented gates.
- **Externally Verified:** only when genuinely backed by external measurement/solver/standard evidence; otherwise display NOT VERIFIED.

Tutorial should take approximately **2–3 minutes for a typical first-time learner as a design target**, to be verified in user testing, not claimed as a proven statistic. Onboarding Waveguide changes a geometry/control once and visibly reads result, then Next or Skip Tutorial. No Laser 18 dBm task, no PAM4, no repeated Verify gating.

Recommended **Discover → Engineer** in one Workbench:
- Discover: free slider, physical change, one short trade-off, no win/lose.
- Engineer: introduce a tangible design constraint and perhaps a second knob without switching UI. Example MZM length can reduce required Vπ but raise optical loss and create high-speed RF effects under stated conditions.
- Deep-dive and Expert Challenge are optional; users who skip them still progress through the main 1.6T learning journey.
- Existing Solution may remain in Advanced/Engineer as preview + explicit apply + recoverable Original. Applying reference must not automatically imply hands-on understanding or fresh engineering PASS.

## 5. Nine checkpoints — one at a time

| CP | Scope | Review artifact | User gate |
|---|---|---|---|
| P0 — Blueprint | audit existing UI/solver/controller & recovery; define UX system, three wireframes, source re-use map, design state interface, P1/P2 test contracts | design docs, representative mock screens; optional **non-physics** UI shell only if isolated and safe | Approve architecture and viewport layout |
| P1 — Waveguide | implement new onboarding with one live geometric control, loss/footprint, short why note and skip/next; no unrelated new physics | playable offline Waveguide Tutorial + screenshots + regression | First-time learner can discover cause/effect in 2–3 min |
| P2 — MZM Workbench | 3 experiments: length↔Vπ/loss; voltage↔phase/interference; baud/RF↔eye. Use actual existing engine and model accuracy labels | playable 3-experiment Workbench with before/after and contextual Learn | **Critical UX approval**: one-screen physics comprehension |
| P3 — 200G Lane | connect PN→TW-MZM→EO/Eye→optical link and assumptions under same Chapter design identity | playable end-to-end model-only 200G-class lane + evidence dashboard | Learner can describe why/where margin changes |
| P4 — 1.6T MZM | reuse 3A+/DR8/Lab to build 8 lanes: routing, losses, laser sharing, energy/area and layout constraints | playable 1.6T MZM engine + report/exports | **Critical system approval**: one complete engineering story |
| P5 — MRM | resonance, Q, coupling, temperature/lock; system recheck and MZM comparison | playable 1.6T MRM engine, comparable KPI with caveats | Trade-offs discovered and explained |
| P6 — EAM | model evidence & material scope first; new EAM physics/visuals + RF/optical/thermal assumptions, then engine | EAM model/spec/test report + playable engine | Model validity and engineering explanation |
| P7 — 3.2T | examine 400G/lane bottlenecks; compare candidate architectures without fake compliance/pass | challenge + bottleneck/decision report | Engineering rationale, not forced PASS |
| P8 — Release | migration, all-device/desktop/mobile, browser and engine regression, offline parity, manifest/CI/release | release HTML, source ZIP, QA, checksums, release notes | Final explicit approval before main merge |

**No automatic advancement across P0–P8.** Even a green CI is not user play approval. Checkpoint commits, PR and artifacts must preserve prior stages. A failure should be scoped and documented; do not rebuild the entire product unless demonstrably necessary.

## 6. Physics & evidence preservation

- Existing `src/kinds/*`, `src/bench/*`, 21 stable IDs, 4 platforms, six Lab missions, original 1.6T paths, GDS geometry recheck, Save/Backup and offline mode are protected assets.
- Old models are educational analytical/surrogate/assumption mixes. Any new plot, dynamic field image or number must come from a documented supported model or be **clearly labelled illustrative**, never silently portrayed as calibrated physics.
- Physics parameter causality: when a knob moves, the visual, graph, and KPI are computed from a shared current state or explicitly separated conditional model. No reused stale evidence, no hidden state mutation when reading docs.
- Avoid inventing BER, FEC compliance, external RF EM validation, foundry readiness, or quantified fab yield that existing solver cannot support.
- EAM and 400G require a separate physics-model brief, source citations, boundary conditions and test fixtures before claims of validation.
- At all times preserve `main` and PR #23; do not merge either until their own user-approved policy allows it.

## 7. Minimum test/quality gate per checkpoint

Deliver **the exact playable offline HTML**, SHA256 digest and tested commit SHA; screenshot desktop (1440×900, 1366×768) + narrow/mobile (390×844, 320×568 when in scope), Light/Dark where available; verify no viewport horizontal overflow, runtime exception or external HTTP; run relevant existing CI/test scripts and add interaction-specific browser tests; include failure cases (stale identity, undo/restore, platform switch, direct/illegal navigation, backup/migration).

**UX review rubric:**
1. At desktop reference resolution, primary control and observable response appear together without scrolling.
2. First-time learner can identify what to move without opening a guide.
3. Geometry/physical response, live result and relevant KPI all change for a justified reason, using the same design state.
4. Baseline/Δ plus causal trade-off is understandable, not just a numeric score.
5. Opening Learn Physics is optional; closing it returns to the exact prior state.

Checkpoint pass means **code verified + user play acceptance**, separately. If play review reports confusion, revise the same checkpoint; do not move forward.

## 8. Branch, PR, and restart contract

- `feature/v2-learning-experience` contains this shared v2 plan and is the v2 work branch; do not add new competing master branches or duplicate PRs without reason.
- Source baseline is main `28952334...`; selectively cherry-pick or port verified v1.3 utilities if needed **after** checking branch differences. Document provenance.
- Keep v2 PR **Draft** until user asks to change; user play approval and explicit merge authorization are required before merging main.
- After each checkpoint: commit+push; update `docs/V2_CHECKPOINT_LOG.md`; provide the current PR, commit, offline artifact, model/QA caveats and **clear stop point**.
- A new Work prompt can be: “Read `docs/V2_MASTER_PLAN.md`, `docs/V2_P0_SOL_WORK_ORDER.md` (or the current checkpoint instruction) and `docs/V2_CHECKPOINT_LOG.md` from branch `feature/v2-learning-experience`; inspect actual remote state; resume only the specified checkpoint; do not modify main or PR #23.”

## 9. Open implementation decisions for P0 investigation (not UX philosophy decisions)

- How to map existing `wg` evaluator parameters to a **truthful** bend-radius/loss/footprint visual without claiming unsupported simulations; if unsupported, use a supported genuine control or isolate a plainly-labelled illustrative prototype pending solver work.
- Exact desktop component sizes / KPI order and mobile inspector behavior based on actual Playwright viewport captures.
- Physics/visual adapter interface and evaluation update cadence for performant live changes without stale frames.
- Where the v1.3 journey controller can be reused or simplified to remove novice hard gates while preserving revision/evidence validity.
- Which quantitative system KPIs can be faithfully driven today, and which need new models/validation in P3–P7.

Never turn open engineering questions into made-up performance claims. Record the decision, source, limitation, and user review at the relevant checkpoint.

## P2 Work Order — 2026-10-18 추가 승인

P1은 `3a0d2fd`에서 P0 / P1 / Production CI / 4-Platform / Release Artifact 성공 후 PR #24 / `0537a71a3f05670edc4887a2be21f0a7563f227c`로 병합했습니다. 이 main Push CI 39084136359도 SUCCESS입니다.

사용자는 P2 세 Experiment (Interaction Length, Voltage & Interference, RF/EO & PAM4 Eye)를 별도 Branch에서 구현하도록 승인했습니다. A–E 단위로 Source / Test / Documentation을 먼저 저장하며 기존 Physics / P1 Save / Legacy / PR #23을 보존합니다. **P2 Play Review에서 중단하고 main Merge / P3는 하지 않습니다.**

공통 Binary / Blob 반복 방지 운영은 `AGENTS.md`를 따릅니다. Screenshot / Binary는 Actions Artifact로 제공하며 같은 Encoding / Blob 생성을 반복하지 않습니다.
