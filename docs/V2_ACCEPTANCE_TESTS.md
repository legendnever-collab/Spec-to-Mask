# v2 P0 — Acceptance Test Contracts and Evidence

2026-10-18 KST · P0 scope only. **Automated UX checks, scientific model validity, and user learning acceptance are separate gates.**

## 1. Test objects and reporting rules

| Object | What can be asserted now | What cannot be asserted now |
|---|---|---|
| P0 isolated HTML | Layout bounds, live fixture revision, reversible interaction, no game writes, optional Learn, offline behavior | Production solver synchronization/races; actual current game scores; net200G/400G; learner comprehension |
| Existing baseline source/executable | Unchanged production diff, rebuild parity, existing regression | New v2 production features not implemented |
| P1/P2 implementation | Contracts below, once approved and implemented | Not currently PASS merely because a mock illustrates the layout |
| Human learning trial | Observations after consenting first-time participants actually perform tasks | No P0 participants tested; no measured 2–3min learning-efficiency PASS |

Evidence ledger: [verification.json](../prototypes/v2-p0/verification.json), [screenshots](../prototypes/v2-p0/screenshots), [QA report](../prototypes/v2-p0/QA.md). P0 fixtures are dimensionless except explicit geometry/length inputs; real baseline audit lives separately in source-audit.json. Never count fixture checks as validated electro-optic performance.

## 2. P1/P2 layout and discoverability contracts

| ID / checkpoint | Setup and action | Concrete expected result / evidence |
|---|---|---|
| UX01 · P1/P2 | Load each scene at1440×900 and1366×768; Light/Dark; test initial and Engineer states | Document/body vertical and horizontal overflow≤1px. Primary knob, physical view, plot, key KPIs and action all fit. Assert rects and panel scrollHeight; capture actual screenshots |
| UX02 · P1/P2 | Load at390×844 and320×568; no prior scrolling | No horizontal overflow; physical view≥100px high. Labeled primary44px input and current key KPIs above bottom-action top. Graph may scroll intentionally. Check fixed action does not cover control/value/endpoint text |
| UX03 · P1/P2 | Touch drag primary knob at min/mid/max; keyboard arrows/Home/End; fine numeric input | Legible value/unit;≥44px primary actions; focused input retained; no modal/scroll jump; live feedback remains near input. No mandatory Tune↔Inspect tab switch |
| UX04 · P1/P2 | First-time user shown Workbench with explanations hidden | Can identify and move main control without Learn or verbal coaching. **Human observation required; currently NOT RUN** |
| UX05 · P1/P2 | 200% browser zoom; keyboard only; reduced motion; contrast sampling | Responsive stack at effective mobile width; no inaccessible action; visible focus and noncolor legend; no animation-dependent information. Screen-reader announcements meaningful and not flooded. **Production accessibility audit pending** |
| UX06 · P1/P2 | Move parameter once; compare before/after and restore | Parameter → structure → curve → KPI/Δ matches the declared model; Original survives repeated captures. Readable explanation names gain/trade-off without misleading attenuation-in-phase-shifter visuals |
| UX07 · P1/P2 | Enter Overview before evaluation / after valid evaluation / after edit | Missing metrics stay “Not evaluated”; current chapter and next action obvious; historic completion never shown as fresh engine validity |

## 3. Physics and identity contracts

| ID / checkpoint | Test procedure | Expected result |
|---|---|---|
| PH01 · P1 bend path | Fix platform/width/wavelength and one90° arc; sweep radius through documented range | Workbench numeric result equals unchanged `LAB.routeLoss` for same primitive/context within floating-point tolerance; length=πR/2µm, area uses declared bounding geometry. Plot marker/KPI share revision |
| PH02 · P1 domain | Review strip/EIM units, width bounds, small-R saturation, transition omissions; compare an appropriate independent reference where available | `bend`, `prop`, `total` individually named; no leaking-field image without field solver. Educational model confidence, external verification absent. No fabricated calibration. If domain unaccepted, use honest width fallback |
| PH03 · P1 width fallback | Sweep only `w`; run existing `KINDS.wg.evaluate` on same platform | Matching mode counts/n_eff/scattering outputs; displayed image tagged with nearest tabulated width. Title asks about width/modes, not bend loss |
| PH04 · P2 length | Fix PN/context,η,g,RT; L=.5,2,3,6mm | Vπ·L constant for fixed PN/η; IL matches actual loss equation including passive1dB term. Actual source outputs, not P0 normalized fixture |
| PH05 · P2 interference | Fixed declared differential voltage/bias, sweep L/voltage | Δφ=π(bias+Vdiff/Vπ); Pmain+Pcomplement=through, each≥0. Phase change in arms, redistribution after combiner. No arbitrary optical gain |
| PH06 · P2 voltage convention | Change source resistance and Vpp vs actual loaded electrode swing | Label open-circuit source vs electrode; never treat Vπ≤source Vpp as sufficient eye/BER pass; genuine target conditions explicitly declared |
| PH07 · P2 PN mode | Fixed reference vs live geometry, reverse bias 0…3V; boundary excursions | Bias dependence only in live mode; source and derivative convention visible; outside-PN-domain eye unavailable. Card1V secant not conflated with live local slope |
| PH08 · P2 RF/eye | Same seed,geometry,PN; vary driver/baud; restore | Dynamic eye and EO use exact Bench settings; seed repeatability; no old fixed Canvas eye masquerading as changed Bench eye; 112×2=224Gb/s raw |
| ID01 · P1/P2 atomic edit | Obtain current result; dispatch failing edit then immediately Continue/Engineer action in same event loop | Prior PASS invalidated before next frame; current outputs either pending or newly matched; no mixed control/result revision |
| ID02 · P1/P2 race | Delay A evaluation; submit B and resolve B first, then A | A discarded by requestId/designId/revision/digest/platform/modelSignature. All views retain B, including confidence/targets |
| ID03 · P1/P2 identity collision | Reuse seed/revision across two design IDs; alter PN/card or model signature only | Evidence cannot transfer. Canonical input equality supplements noncryptographic cache hash |
| ID04 · P1/P2 malformed draft | Blank,NaN,Infinity,out-of-range,invalid integer fields; slow/throwing evaluator | Field-specific error, no CURRENT/target credit; previous valid design recoverable; no hidden clamp or stale success |
| ID05 · P1/P2 restore/platform | Capture, edit, restore; switch platform while evaluation pending; reload/backup restore | New revision on restore; matching-platform workspace; old response ignored; design/history preserved, current engineering re-evaluated |
| ID06 · P2 compare | Same-model/platform vs different platform/model | Same-conditionΔ is correct; incompatible compare unavailable or explicitly separated, no fictitious “improvement” |

## 4. Progression, optional learning, and preservation contracts

| ID / checkpoint | Action | Expected result |
|---|---|---|
| PR01 · P1 | Change one meaningful parameter and receive supported current observation | Discover completion allowed without laser/PAM4/Fab/Verify or demanding performance target |
| PR02 · P1 | Skip or Continue before observation | Move on without deadlock; mark skipped/unobserved, not Discover complete; can return later |
| PR03 · P2 | Enter/leave Engineer | Same screen/design; mode change alone no revision/score/target credit; constraints depend on current evaluation only |
| LP01 · P1/P2 | Capture full store/design/evidence/score/progress/scroll/focus; open Learn; scroll; Close and Escape | Byte-equivalent design/evidence/progress; no score or completion update; selected parameter/current-or-pending state clear; return focus and viewport |
| LP02 · P1/P2 | Open Learn on unsupported value or slow calculation | Explicit unsupported/pending status; no earlier number presented as current; links/assumptions match chosen device/platform |
| SV01 · P1 | Load v1.2 and PR23 backups; explicit legacy import; v2 restart | Original keys/bytes preserved or quarantined with undo; new v2 namespace validated; old Tutorial completion never becomes Waveguide evidence |
| SV02 · P1 | Refuse storage write; corrupt backup; incomplete backup; undo restore | Existing failed-save/incomplete/quarantine behavior remains; never silent data loss or fake successful save |
| RG01 · P1/P2 | Existing Studio/Lab/GDS/Theme/Save regression suite | Original21 stable IDs,4 platforms,6 Lab missions retained; export/recheck bound to matching design hash; no foundry-readiness promotion |
| TR01 · all | Search all main panels/exports for unsupported physical claims | No certified200G, BER/FEC/IEEE/Fab400G assertion. EAM/400G remain future NEW model tasks. Prototype always labeled UX mock |

## 5. P0 executable checks actually performed

Run from repository root:

```sh
SMQ_BROWSER=/path/to/chromium node prototypes/v2-p0/check.cjs
node prototypes/v2-p0/audit-source.cjs
npm run build
node tools/check_rc.js
npm run test:studio
npm run test:mzm-bench
npm run test:backup
npm run test:lab
npm run test:py
```

Browser binary version153.0.8010.0; Node24.19.0; installed repository Playwright dependency. Screenshots of3 scenes ×4 required viewports ×2 themes; initial and in-place Engineer; Learn; two changed-parameter views. The check script records full input SHA256, checks and bounds. It exercises synchronous **mock** revision consistency, state-preserving Learn, capture/restore/Original, keyboard range, optional Continue/Skip, theme, zero external runtime HTTP, no writes to production keys and preservation of a synthetic legacy-storage sentinel.

Actual baseline regressions: Studio56 checks; MZM Bench111 checks; backup end-to-end passed; Lab440/440 plus Si1310/SiN1550 e2e and state integrity passed. Rebuild leaves `src/` and `dist/index.html` byte-identical to starting tree; canonical beta.2 source parity passes. Full legacy browser/four-platform release matrix is left to unchanged GitHub CI; do not claim it ran locally in P0.

**Local Python GDS:** attempted, blocked at `ModuleNotFoundError: klayout`; no scientific/GDS PASS inferred. Existing CI installs pinned dependencies; record new-head CI separately in checkpoint log. This is an environment limitation, not a modified GDS source failure. No network/font/dependency retry loop was started.

## 6. Human learning-efficiency study — PLANNED, NOT RUN

After an approved P1/P2 playable artifact, recruit at least5 first-time learners spanning non-photonics and technical backgrounds (small formative sample, not a statistically proven result). Give one task: “Change this device and tell me what you gained and what you gave up.” Do not point at the knob or require Learn Physics.

Record independently: time to first meaningful manipulation; ability to find current result; explanation in own words; confusion/incorrect causal inference; whether Learn is voluntarily opened; Tutorial completion/skip/deadlock. Target2–3min Tutorial is a design goal only. Suggested acceptance: all can find the control without coaching, at least4/5 identify direction and trade-off, none blocked by irrelevant gates. User decides acceptance from observations; automated tests cannot approve learner comprehension.

## 7. Authorized next scope

P0 stops at reviewed blueprint. After **explicit user P1 authorization**, implement only the Waveguide lesson with the chosen existing model path, identity adapter, optional Learn, supported observation progression, additive save/backup and required viewport tests. P2 is a separate approval: length/voltage/RF-eye MZM experiments, actual engine-linked data. P3+ systems, EAM and400G remain out of scope.
