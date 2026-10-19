# v2 P0 — Existing Physics / UI Reuse Map

2026-10-18 KST · inspected source, not a claim of external model validation.
Code baseline: `289523340dedb04866a07151614c521654c16bc3`. v2 start: `712cc019cf1bdcc11d00ed2c2f6a646dda6de1cd`. Historical Journey: `25ab11edeeb0af1f66dae8f32d4ae92f6bd43071` (PR #23). Local unpushed changes are **not canonical source**.

## 1. Recovery and source provenance

| Surface | Observed state before P0 |
|---|---|
| main | `289523340dedb04866a07151614c521654c16bc3`, v1.2.0-beta.2 merge |
| PR #24 | Open Draft, head `712cc019cf1bdcc11d00ed2c2f6a646dda6de1cd`; CI [39044204248](https://github.com/legendnever-collab/Spec-to-Mask/actions/runs/39044204248) success |
| PR #23 | Open Draft, head `25ab11edeeb0af1f66dae8f32d4ae92f6bd43071`; B `63efbf00dde0463e784fb968f675069c2cf84e2b`, CI 39032264453; C CI [39033277252](https://github.com/legendnever-collab/Spec-to-Mask/actions/runs/39033277252) success |
| v2 creation history | Existing four documentation commits above main; no prior v2 production implementation |
| Old beta.2 local folder | Clean, `fa46a7b8c11e24da3662a7f3cf7c332d2db91a44` |
| Prior v1.3 local folder A | HEAD `1f43cee83c7c49c43f6bb5ce4c79dca3cda805ff`, ahead by 2 vs its local upstream; untracked `test/e2e/journey.js` |
| Prior v1.3 local folder B | HEAD `25ab11ed`; modified dist, journey core/schema/tutorial/ui, studio CSS/JS, journey/tutorial tests, untracked `artifacts/v130-controls/` |
| P0 working copy | Separate local clone, checked out **existing** v2 branch. Neither old folder reset, cleaned, copied into v2, or pushed |
| Other open PRs | #10/#11/#12/#13/#14/#21 observed; outside scope; untouched |

PR #23's reported B/C tests are historical evidence for its own source/executable, not a v2 PASS. Its `core.js` on GitHub still defines Laser → PAM4 → Controls. The locally edited core already differs; it was deliberately excluded from this reuse audit. Do not silently restore either tutorial.

## 2. Model and UI inventory

REUSE = call unchanged; ADAPT = integrate/contextualize without changing coefficients; NEW = implement only at authorized future checkpoint; UNSUPPORTED = unavailable claim in the proposed context.

| Classification / checkpoint | Existing control / source / entry | Physical output / present visual | Model tier and limitation | Workbench adapter decision |
|---|---|---|---|---|
| REUSE + ADAPT · P1 | `src/kinds/wg.js` `params`, `evaluate(l,d,proc)`, `_x.at`, `_x.wcAt` | Width `w`; `te`, `tm`, `nTE`, `nTM`, `alpha`, `dndw`, `wc`; mode/width curves and nearest-tabulated field images | Semi-vectorial offline 2D lookup interpolation; scattering **surrogate** `base+C*(dn_eff/dw)^2`; mode image is nearest sample, not field recomputation | Width/mode is immediately supportable. Label image sample width separately from current width. Do not label scattering as bend radiation |
| UNSUPPORTED in wg · P1 decision | No bend-radius parameter or bend evaluator in `KINDS.wg` | No R-dependent loss; no waveguide bend field output | Cannot show leakage/verified bend-loss value from wg | P0 shows `Not evaluated`, geometric footprint only; choose width fallback or reviewed extension below |
| ADAPT · P1 | `src/lab/engine.js` `wgModel`, `routeLoss`, `primLen`; `src/kinds/spiral.js` `_x.xs`, `_x.bendDBcm`, `_x.rectGeom`/geometry; `src/kinds/mrr.js` `_x.cross`, `_x.bendDBmm` | Lab already integrates strip/EIM bend radiation and propagation on arc/curvature primitives; **rib** ring is a different model | Marcuse slab/EIM approximations; cm vs mm units; strip/rib and roughness calibration differ; spiral has S-bend conversion and total-delay geometry | Prefer unchanged `LAB.routeLoss` on one declared 90° arc, with domain/unit review; do not use whole-engine route IL or ring IL as isolated bend loss. Separate bend and propagation outputs |
| REUSE + ADAPT · P2 | `src/kinds/pn.js` `evaluate`, `_x.analyse`, `_x.optical` | `na,nd,xj,vb` geometry; depletion, Δn, FCA, Cp, Rp, VπL, fRC; field/profile and bias plots | Depletion / plasma dispersion educational model. Card VπL is a 1V secant; Bench live mode uses local bias derivative | Keep PN source and reverse-bias convention in the identity and Learn context. No pure SiN PN claim: active Si/hybrid assumption |
| REUSE + ADAPT · P2 | `src/kinds/mzm.js` `evaluate`, `_x.build`, `_x.analyse` | `L,g,eta,RT`; `Vpi,IL,bw,oma,pen,Hn,Ht`; existing TW/electrode view, EO and legacy eye | Loaded quasi-TEM CPW, RC and mismatch; fixed 112 GBd, 70GHz driver, 2.5V open-circuit source in legacy path | Use actual length/PN outputs. Leave legacy scoring untouched. Do not claim its fixed eye changes with Bench knobs |
| REUSE + ADAPT · P2/P3 | `src/bench/mzm.js` `analyse`, `sample`, `pnAt`, `dynamicEye`; `src/bench/mzm_ui.js` `key`, `invalidate`, `report` | Source/voltage/ng/bias/probe/live PN/reverse bias/baud/driver/modulation/seed; vpi/il/through/transfer, electrical S, loaded Γ, EO, raw eye | `mzm-bench/2`, `mzm-eye/1`; raw 256-symbol periodic eye,16 samples/UI; no noise, EQ, CDR, BER/FEC; >240GHz truncated | One Bench result can drive physical transfer, plot and KPI. Bench settings must be in identity. Discard stale report. Source Vpp is not electrode Vpp |
| ADAPT · P3 | `src/kinds/els.js` `evaluate`; `src/kinds/pd.js` `evaluate` | Laser P/ns/iso/th; SSC/split/OMA/channel budget; PD L/w/di/V → responsivity/transit/RC/sensitivity | Laser WPE/RIN/channel assumptions; PD/TIA sensitivity uses a **separate** fixed PAM4/noise/FFE model and assumed Q for BER 2.4e-4 | Show input OMA and sensitivity provenance. Do not convert raw MZM eye gap into measured/end-to-end BER. Keep distinct Rx and Tx assumptions |
| REUSE + ADAPT · P4 | `src/kinds/xcvr.js` `evaluate`, parts/cards, DR8 comparison | 8 lanes, laser sharing, packaging/cooling, worst lane/temperature margins, W,pJ/bit; macro chain / corner plots | 1.6T educational denominator; estimated electrical/thermal penalties; no all-lane joint high-speed waveform simulation | Bind cumulative current identities. Missing results stay “Not evaluated”; never sum unrelated saved cards into a current engine PASS |
| REUSE + ADAPT · P5 | `src/kinds/mrr.js`, `src/kinds/to.js`, `src/kinds/wdm.js` | Ring R/gap/detuning/doping/bias/drive/heater; Q/FSR/CMT/thermal/eye; DR8 and WDM8 | Analytical/EIM/CMT with literature/assumption mixture; thermal model and coupling limitations; WDM spectral constraints differ from spatial DR8 | New presentation, same coefficients. Compare under common wavelength/source/channel/temperature boundary. No duplicate compulsory common lessons |
| REUSE + ADAPT · P4/P8 | `src/lab/{engine,ui}.js`, `tools/smq2gds/` | Six Lab missions; layout, routing, optical budget, export; hash-bound imported GDS verification | Generic PDK; geometry/connectivity checks do not establish foundry readiness or RF EM closure | Secondary Advanced entry; design-hash-bound evidence and separate verification/export paths preserved |
| ADAPT · P1/P2 | `src/shell.js` `requestEval`, `testIdentity`, `evaluationCurrent`, `applyDesign`, `setScope`; `src/studio.js` `identity`, `fresh`, `recordEvaluation`, `snapshot` | Inputs invalidate current evaluation; queued frame update; live inspector; track isolation, original/snapshot, atomic Next | Studio objectives mix teaching and engineering; currently layout contains long result/control panels | Reuse invalidation and exact identity principle; new compact renderer. Do not expose legacy gate as beginner Discover requirement |
| ADAPT selectively · P1+ | PR23 `src/journey/{core,schema,ui,tutorial}.js` | `designId`, `revision`, `fingerprint`, scoped Tutorial/MZM workspaces, protectedOriginal, practice/evidence/migration | Hash includes model signature/geometry/bench/budget; evidence includes session; curriculum and validation are tied to old three-step tutorial | Port **utilities**, not old steps/objective/complete gate. Document provenance and add separate v2 schema; never cherry-pick whole Journey |
| REUSE + ADAPT · P1/P8 | `src/persist.js`, `src/studio.css`, `src/head.html`, `tools/build.sh` | Quarantine, validation, backup/restore/undo; theme, canvas, self-contained/offline HTML | Existing `smq3-*` own-key allowlists/schema; theme is view state. Normal build and fully offline build differ by font links | Extend versioned ownership/migration in P1, never overwrite legacy keys; keep build parity tests. P0 prototype does **not** load production scripts |
| NEW · P6 | No dedicated EAM solver | None | Absorption/material/chirp/ER/IL/RF scope not specified/validated | Separate model brief, primary references, validity domain, fixtures, then integration. Never rename MZM as EAM |
| NEW / UNSUPPORTED performance claim · P7 | Existing Bench baud max 112 GBd; system 200G educational constants | 400G raw PAM4 would need 200 GBd ignoring overhead | Raising a slider bound does not validate high-speed electro-optics/noise/packaging or net 400G | New high-speed assumptions, bandwidth/electrical/Rx model review and alternatives. No fabricated 400G certification/PASS |

## 3. Existing equations and numerical audit

[Read-only audit output](../prototypes/v2-p0/source-audit.json) records actual baseline engine outputs on four platforms. These numbers are **not** used by the P0 UX mock.

Existing MZM/Bench length equations, unchanged:

- `Vpi = VpiL / (eta * L_mm * 0.1)`; VπL in V·cm.
- `IL_dB = pn.loss_dB_per_mm * eta * L_mm + 0.2*(1-eta)*L_mm + 1.0`.
- Bench `through = 10^(-IL/10)`; `Pmain/Pin = through*(1+cos(pi*(bias + Vdiff/Vpi)))/2`; complementary = through − main.
- Legacy driver voltage is an open-circuit source convention; the loaded electrode voltage is different. P2 Engineer must compare the stated source/loaded swing to the chosen modulation target, **not assume Vπ must equal Vpp for PAM4 operation**.

For Si1310 reference PN / fixed MZM geometry, changing only L from 2 → 3mm gives Vπ **9.295 → 6.1967V**, IL **2.486 → 3.229dB**, legacy EO BW **37.3966 → 30.1740GHz**. This verifies inspectable reuse, not a successful 200G link or external accuracy. P0 fixture uses normalized ratios, not these values. In particular P0 “active loss ratio” omits passive offset and is **not total IL**.

### Bend lesson options (P1 decision)

**A — fallback if the bend adapter domain cannot be accepted:** use existing width control and ask “How does width change the guided modes?” Show actual nTE, n_eff and scattering surrogate. No new bend physics; do not retain the bend-loss question with unrelated outputs.

**B — recommended P1 path, preserve the exact bend question:** `LAB.routeLoss` already computes propagation plus bend loss for arc primitives; `LAB.wgModel` already applies the same 90° bend test when deriving a route radius rule. Review `spiral._x.xs(pf,w)` and `_x.bendDBcm(x,R)` as strip-waveguide candidates. Existing approximate radiation coefficient is `min(1e4,4.343*C1*exp(-U*R)*1e4)` in dB/cm, R in µm. For a constant-curvature 90° arc, existing `LAB.routeLoss` multiplies coefficient by `(πR/2)*1e-4` cm, and adds propagation separately. It returns `{L,prop,bend,total}`; invoke it on `[{t:"A",c:[0,0],r:R,a0_deg:0,a1_deg:90,w:pf.w0}]`. This is existing educational kernel coverage, not externally validated field/radiation simulation or a completed v2 Tutorial. Footprint must be derived from the actual chosen centerline and stroke width; quarter-bend-only outer box `(R+w/2)^2` excludes leads and clearance.

Read-only Lab audit also shows why the two losses must be separated: on Si1310/w=.36µm, R1→2µm gives bend radiation .103839→.002517dB; R8→20µm gives total arc loss .011432→.028580dB because the longer path adds propagation while radiation is already tiny. A proposed initial lesson range1–8µm needs an explicit educational-domain label and useful/logarithmic plot scale; very small values must use a display-floor label, not claim exact zero.

Before binding B to P1: specify platform/wavelength/strip dimensions, unit checks, radius/domain limits, saturation behavior, straight-to-bend transition/mode mismatch omissions; compare appropriate reference/independent sweep; test large-R limit and do not assume *total* bend insertion loss monotonically decreases at every R because path length/scattering also change. Do not borrow rib-ring coefficients or call a color halo an evaluated radiation field. P1 cannot grow into a general new physics project without a scope decision.

## 4. Proposed production adapter contract (not implemented in P0)

```ts
type DesignState = Readonly<{
  schema: 'smq-v2-design/1'; designId: string; revision: number;
  platform: string; lesson: string; geometry: object;
  pn: { source: 'fixed' | 'live'; geometry: object; biasV: number; cardDigest?: string };
  bench: object; budget: object; seed: number; modelSignature: string;
}>;
type Evaluation = Readonly<{
  designId: string; revision: number; requestId: number;
  inputDigest: string; modelSignature: string;
  status: 'current' | 'invalid' | 'unsupported' | 'error';
  physicalObservation: object; plots: object[];
  kpis: Array<{ key: string; value: number | null; unit: string; source: string }>;
  confidence: { tier: 'lookup' | 'analytical' | 'surrogate' | 'assumed' | 'illustrative';
                externalVerified: false; domain: object; limitations: string[] };
}>;
```

Each metric may need its own tier/provenance; the outer tier alone cannot upgrade assumption-derived metrics. Unsupported values are `null` plus an explicit reason, never zero/NaN/last known PASS.

Event sequence:

1. Validate native and schema input. Blank/malformed/out-of-domain input immediately removes CURRENT/target status. Display the bad field and a repair action; preserve recoverable prior design.
2. Freeze accepted state; increment revision; cancel/obsolete pending requests. Include all active dependency signatures; hash canonicalized inputs, preserving the canonical payload for equality/collision defense.
3. Geometry preview may update immediately but says “input preview / evaluating” until matched result arrives. Fast supported evaluation can run on the next animation frame; dynamic eye should coalesce gestures or use a worker. Target <100ms response is **an unmeasured P1/P2 goal**, not an observed production guarantee.
4. Adapter calls `LAB.routeLoss` for the reviewed arc lesson (or `KINDS.wg.evaluate` for the width fallback), or `MZM_BENCH.analyse` unchanged. Avoid mutable global card contamination: explicit copied PN/card context or a carefully scoped existing card access bridge, captured in digest. No coefficient patching.
5. Accept only if designId/platform/revision/digest/modelSignature/requestId all match current request. Commit physicalObservation/plots/KPIs/confidence in one render transaction; targets use this committed Evaluation, not current controls + old result.
6. On restore, platform change, model update or imported backup: invalidate and reevaluate. Earlier evidence remains history, not fresh current PASS. Snapshot compare requires compatible units/platform/model; incompatible comparison is unavailable.

Existing helper mapping: shell's `testIdentity`/`evaluationCurrent` and Studio's atomic `fresh` are starting points; Bench `key` includes settings + PN context; Lab verification hash/signature stays a separate geometry-evidence channel; Journey `fingerprint`, `touch`, `snapshot`, `session` provide provenance. None alone includes the full future v2 dependency graph.

### Save / migration proposal

Add a v2-owned key/schema only in authorized P1; extend persistence allowlist, backup validator, scan/quarantine and restore tests together. Copy legacy design on explicit import; preserve original key bytes. PR23 `smq-journey/1` and its evidence do not map one-to-one to v2 lessons: allow design import, preserve historical completion as historical, start v2 Discover unobserved. Never promote old Laser/PAM4 completion to Waveguide completion. Compare snapshots and protected Original have their own IDs; imported current results start pending.

### P0 isolation

`prototypes/v2-p0/index.html` uses an in-memory object and a read-only test hook, with **zero storage writes**, no production imports, no exportable game PASS. Its revision demonstrates rendering behavior only. Its main/complement fractions refer to an ideal normalized illustration, not actual Pin/through; footprint is geometry-only. Real adapter race handling, schema migration and backups are specifications/tests for P1/P2, not delivered production code.


## P2 Checkpoint A — 확정된 연결 (2026-10-18)

P1은 PR #24 / main `0537a71`에서 병합됐습니다. P2는 별도 Branch로 진행하며 [P2 Model / UX / Test Plan](V2_P2_MZM_WORKBENCH.md)을 따릅니다.

| 연결 | 결정 |
|---|---|
| PN | 기존 Platform 2-2 Geometry를 복사하고 MZM_BENCH.pnAt의 Local Slope / Loss / Cp / Rp를 사용합니다. |
| MZM | 기존 Platform 2-3 Geometry와 명시적인 Live PN Context를 MZM_BENCH.analyse에 전달합니다. useCard:0으로 Global Card 영향을 제거합니다. |
| Length / Voltage | 동일 Bench의 Vπ / VπL / IL / through와 동일 Linearized Transfer를 사용합니다. Active Length는 ηL입니다. |
| RF/EO / Eye | 동일 Bench의 samples / eye를 사용합니다. NRZ / PAM4, Raw Rate / Gap / Domain을 그대로 보존합니다. |
| UI / Save | P1 Layout / Font / Theme / More / Backup를 재사용하고, P2 Controller / Adapter와 Additive Workspace만 추가합니다. |
| Unsupported | Receiver / Noise / Jitter / BER / FEC / Net 200G / Link Closure를 새로 계산하지 않습니다. |

MZM Bench를 4개 L 값에서 조사한 Local 계산은 약165–201ms였습니다. UI는 Input 즉시 무효화하고 요청을 Coalesce하며 Voltage-only 결과는 같은 Bench Context 캐시를 사용합니다. <100ms 응답을 보장한다고 주장하지 않습니다.

## P2.1 Additive Reuse

KINDS.wg.evaluate를 src/v2/foundations.js에서 직접 호출합니다. Splitter / Path는 같은 Adapter의 명시적 Ideal Unitary Model이며 기존 dc / Production Solver 결과로 가장하지 않습니다. 기존 PN / MZM Adapter와 Coefficient는 그대로입니다. Save는 optional foundations를 추가하고 by / mzm 완료 기록을 보존합니다. 새 UI Module은 foundations_ui.js / visual.js이며 기존 P1 Shell을 확장합니다.
