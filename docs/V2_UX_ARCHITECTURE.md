# v2 P0 — Learning Experience / UX Architecture

2026-10-18 KST · **P0 review candidate; user acceptance pending**
Authority: [Master plan](V2_MASTER_PLAN.md), [P0 order](V2_P0_SOL_WORK_ORDER.md).
Scope: design + isolated prototype. Production UI, solvers, saves, scores and original IDs are unchanged.

## 1. Experience contract

The first complete learning deliverable remains **1.6T MZM Engine**. The learner proceeds through Waveguide → 200G-class MZM lane → 1.6T MZM → 1.6T MRM → 1.6T EAM → architecture comparison → 3.2T / 400G-class-lane challenge. These are educational architecture targets; 112 GBd PAM4 is **224 Gb/s raw**, without a net-rate/certification claim.

At each stop the learner can answer: **What am I changing? What moved? What did I gain and give up?**

| Layer | Primary content | Navigation / state effect |
|---|---|---|
| Engine Overview | Laser → Tx PIC → optical interface → fiber → Rx; eight lanes; current chapter; current cumulative KPIs | One Start/Resume action returns to last lesson and parameter; no implicit reset |
| Interactive Workbench | One question; one initial knob; physical observation; plot; 2–3 KPIs; short causal note | Overview is always reachable; Discover/Engineer share the same design |
| Learn Physics | Selected parameter/value; intuition; mechanism; equations; assumptions; model confidence; sources | Read-only modal or mobile full-height dialog; Escape/Close returns focus and scroll |
| Advanced / Legacy | Existing Studio tracks, Lab, GDS, fabrication, solution and historical designs | Secondary explicit menu; separate namespace; never silently imports a legacy PASS |

Main-screen copy budget: one question (target ≤90 English characters / short Korean equivalent), one action cue (≤15 words), two short causal sentences (target ≤38 English words), one compact model-status phrase. Explanations and citation tables belong in Learn Physics. The final localized copy must be remeasured; the P0 prototype uses English for reliable local font rendering.

## 2. Desktop composition

Reference grids and captured images: [Wireframes](V2_WIREFRAMES.md). At 1440×900, the 64px shell + 30px prototype banner leave an approximately 666px-high working region beneath the question. The Workbench uses `3fr 2fr`, a 16px gap and 28px outer padding: roughly **821px physical/plot : 547px controls/results**. Visual observation gets two rows: physical structure above, response plot below. Both remain visible.

At 1366×768: 12px top content padding; 66–78px actual heading; compact sidebar gaps and 16px inset; same two columns. Original/compare are small secondary actions. Model details move to Learn, while the global mock label and plot caption remain. Engineer replaces the short discovery card with a constraint card at this height; it does not add a new page or hide the physical view/knob/KPIs.

Avoid a dashboard of independent scrolling panels. Desktop primary controls, diagram, chart, KPIs and main action all fit in the viewport. Modal reading may scroll after opt-in. The small P0 scene selector occupies the top shell and is **review-only UI**, to remove from production.

## 3. Mobile composition

At ≤760px width the semantic order becomes:

1. Compact question and Discover/Engineer control.
2. Physical view.
3. Two live KPI tiles, including Δ.
4. One large labeled slider.
5. Live plot, constraint/discovery, optional comparison controls.
6. Fixed bottom action bar: Learn Physics + Continue, with Skip for Tutorial.

390×844: physical card about 208px, controls and critical KPIs in the initial viewport. 320×568: physical card about 110px, compressed heading/spacing, short labels. The **live KPI and knob remain above the fixed action bar**; detailed graph and explanation can be reached with intentional vertical scrolling. The compact diagram is schematic; optical field images require a zoomable read-only enlargement in production. No horizontal page scrolling and no auto-scroll jump during a slider gesture.

For future lessons needing a second control: show an explicit “More conditions” expansion under the primary knob. Its expanded state must retain a compact result summary beside/above the active control. Do not add Tune/Inspect tab switching. Engineer can scroll on small phones; desktop no-scroll remains the main acceptance gate.

## 4. Discover → Engineer behavior

| Event / state | User-visible response | Evidence / progression effect |
|---|---|---|
| Enter Discover | Initial design, current model status, visible action cue | No target gate; no mandatory theory read |
| Real input change | Invalidate old evaluation immediately; update geometry; commit evaluated results atomically | Record an interaction only after a changed input gets a current supported observation |
| Meaningful observation | Live response differs from baseline or a categorical change is observed | Mark Discover observed, not Engineer PASS |
| Continue before manipulating | Let learner continue; record skipped/unobserved, not completed | No hard block; learner may return later |
| Skip | Continue to next learning stop | `skipped`, no completion credit; never creates physics evidence |
| Enter Engineer | Same state/camera/knob; target bands and constraints appear | Does not change design or revision; targets require fresh evaluation |
| Target met | “Model target met” with assumptions and current identity | Distinct from Discover completion and external verification |
| Learn open / close | Contextual document, then exact prior viewport/focus | No revision, score, learning evidence or progress mutation |
| Reference preview / apply | Read-only comparison, then explicit Apply if chosen | Apply protects Original, increments revision, invalidates prior engineering evidence; does not award hands-on practice |
| Return Overview | Highlight current part; summarize current model output | Historical completion and current design validity remain separate |

Production needs a short observation criterion, not a dwell-time or repeated-Verify maze. A slider step generating a real change is sufficient for easy Tutorial completion; a model failure is recoverable and never strands the learner (Skip/Continue remains available). A mock animation alone cannot award supported physics evidence. P0 buttons exercise navigation only.

## 5. Causal chains and visual truthfulness

| Scene / lesson | Parameter → physical state → computed response → KPI/Δ → discovery |
|---|---|
| Waveguide bend concept | R → curvature / occupied area → geometric bbox; optical loss **not connected in P0; wg itself unsupported, Lab kernel available** → geometric area ratio + “Not evaluated” loss → gentle turns cost area; optical magnitude needs a bend model |
| P1 low-risk fallback | w → cross-section / supported guided modes → unmodified `KINDS.wg.evaluate` → TE count, n_eff or scattering surrogate → width changes mode guidance and scattering sensitivity; not a bend lesson |
| P2 MZM length | L, fixed η and PN → longer phase interaction → actual Vπ and IL formulas → Vπ, IL, Δ → lower voltage requirement trades against propagation loss |
| P2 voltage / interference | Differential electrode voltage / bias → Δφ of two coherent arms → same normalized cosine transfer → main/complement power → phase shift becomes amplitude modulation at recombination |
| P2 baud/RF / eye | Baud or driver bandwidth → voltage response through loaded line + RC → actual Bench dynamic eye → raw gap / EO response → bandwidth and pattern distortion reduce raw separation; not BER |

Do not show a phase shifter as a variable optical attenuator. In the P0 MZI sketch, phase vectors are schematic, both paths remain present, and main/complement output marks change only after the combiner. Diagram lengths are not to scale. P2 must account for surviving power (`through=10^(-IL/10)`) before output normalization and name the chosen voltage convention.

## 6. State, evaluation and comparison architecture

Detailed contract: [Reuse map](V2_REUSE_MAP.md#4-proposed-production-adapter-contract-not-implemented-in-p0).

- One immutable DesignState per accepted edit; all dependencies (platform, PN geometry/source, MZM geometry, Bench settings, optical budget assumptions, seed, model versions) enter its identity.
- Presentation state (theme, Learn visibility, focus, camera, lesson mode) is separate. Neither theme nor optional reading changes physical identity.
- On edit: clear current engineering status synchronously, show “Updating” or “Invalid input”, then compute. A prior chart may remain only as visibly dimmed comparison data with its own revision; never as current.
- Commit physical observation, plot, KPIs and confidence together for one matching `{designId, revision, requestId, inputDigest, modelSignature}`. Ignore late results. A hash is a cache key, not scientific validation.
- Compare captures immutable input + result + identity + assumptions, not a mutable reference to current state. Deltas only if platform/model/units match. Otherwise explain incompatibility.
- Original is the first protected design per lesson/platform, separate from a replaceable comparison snapshot. Restore creates a **new** revision and reevaluates; never restores an old PASS token.
- Platform switch cancels pending evaluations and uses separate workspace. Reload keeps designs and learning history but marks current engineering evidence pending reevaluation. Backups are versioned and validated; original bytes stay recoverable.

## 7. Learn Physics content schema

`{device, parameter, value, units, designIdentity, resultIdentity, confidence, supportedDomain, intuition, mechanism, equations, assumptions, sources, unavailable}`.

Sections: intuition → physical mechanism → equations/derivation → operating trade-offs → model and limitations → references. Sources must resolve to the model/parameter actually in use. Fixed-card PN and live-bias local-slope PN require different explanations. If results are pending, show current input plus “result pending”; do not reuse earlier numeric values. P0 links to inspected engine sources and the audit; it does not pretend the literature has been externally validated.

Accessibility: native modal focus trap and background inertness; explicit Close and Escape; return focus to Learn trigger; preserve underlying scroll; no parameter inputs in the reading panel. Reading-only context can be snapshotted on open, with its revision named. In production asynchronous updates must not rewrite the article mid-reading.

## 8. Accessibility and rendering policy

- Labeled native range input with value + unit; keyboard arrows and Home/End; production also provides an accessible numeric entry via explicit fine-tune.
- Primary actions and mode chips ≥44px touch height; the compact mobile range input is also44px high. Production localization must preserve these sizes.
- Color plus text/line style for plot categories and target state; do not encode status solely in red/green.
- `aria-live=polite` short observation summary; throttle announcements to gesture end in P1 so readers are not flooded. Diagram gets a concise nonvisual description; KPI text remains actual DOM text.
- Reduced-motion preference: no required animation. High contrast and browser 200% zoom must be checked during localized P1, including a responsive stack when effective CSS width falls below 760px.
- Use local system fonts in P0. No font download is required to run the prototype. The environment lacks Korean glyph fonts in the legacy screenshot; production Korean copy needs separate visual QA.

## 9. P0 review decisions and P1 boundary

1. Approve simultaneous 60/40 desktop view and compact mobile KPI-before-knob order; review 320px diagrams and intentional below-fold plot.
2. Select the P1 model path: **recommended existing Lab strip-arc loss adapter**, reviewed for one fixed-platform 90° bend; width/mode using existing wg is the fallback if the bend domain cannot be accepted. A width lesson changes the question explicitly.
3. Approve Discover's nonblocking Continue/Skip and in-place Engineer constraint card; review the44px mobile controls and compact schematic before localization.

P1 authorization is **not given by P0 completion or CI**. Proposed P1 scope: one Waveguide lesson with the selected supported model, shared adapter identity, optional Learn, skip/observation progression, additive persistence and four-viewport regression. No production MZM, EAM, DR8 redesign or 400G implementation in P1. P2 later implements three MZM experiments after separate approval.
