# P2.2 Physics / Scientific Visualization QA

Version `2.0.0-alpha.4-p22-physics`. Baseline `88ea82ec0ebf7cd083a573d86fb14763107f16eb`. Draft PR #25, development branch only. **main 미병합 / P3 미시작 / Human Play Acceptance NOT VERIFIED.**

## Acceptance

| Question | Result | Evidence / limit |
|---|---|---|
| Four guided TE modes individually selectable? | PASS | TE0–TE3 signed numeric arrays at exact supported samples, node/parity tests and browser selection. |
| Field matches current width / λ / platform? | PASS within supported domain | Exact sampled width only; off-grid Unsupported. SiN cutoff disagreement is NOT VERIFIED, not substituted with another field. |
| Radius changes drawn bend? | PASS | Arc radius varies continuously; domain-scaled schematic, no invented radiation image. |
| Five material index-profile mechanisms explained? | PASS for explanation | IOX diffusion/burial, LDW composite morphology, polymer rib separated. Complete calibrated parameter sets for IOX/LDW/Polymer NOT VERIFIED. |
| Bend loss curves are actual calculated results? | PASS for existing Si/SiN C model only | Unchanged LAB / EIM / Marcuse estimate; external accuracy and three new families NOT VERIFIED. Fixed-geometry numerical loss Unsupported. |
| DC coupling region identifiable? | PASS | Independent guides, parallel interaction length / gap, four ports, exact CMT power. Spatial supermode Field is NOT VERIFIED. |
| MMI self-imaging distinguished from DC coupling? | PASS within C model | Same PQ eigenmode expansion / input / λ / geometry drives numeric Field and raw output overlap. |
| Full MMI power conservation / symmetry? | FAIL at documented cases | Nonorthogonal port overlap sum 1.008418 and Si1310 grid imbalance 0.000920. Raw data retained, UI flags NOT VERIFIED. No renormalization or kernel changes. Guided propagation norm passes separately. |
| MZI two-output phase / field / power? | PASS within ideal model | Complex H-reference amplitudes × numeric TE0 x-profile, complementary power, correct 0 / π routing. Static only. |
| PN reverse bias visibly changes depletion? | PASS within C model | Existing abrupt profile, asymmetric xp/xn, fixed dopants vs mobile carriers, shared x coordinates. |
| Carrier distribution connected to optical phase? | PASS within C model | Existing fractional-cell Soref / EIM overlap, same bias / geometry / Δn / phase / loss / capacitance. 2D CHARGE / full-vector validation NOT VERIFIED. |
| Graduate-level scientific accuracy accepted? | NOT VERIFIED | User Play Review and independent solver / measured comparison remain required. |

The overall five-material calibrated bend objective and full-vector/CHARGE accuracy are **not completed**. This release supplies an honest playable model-backed checkpoint, not an externally validated device design tool.

## Source / model preservation

`src/kinds/`, `src/engine_mmi.js`, `src/lab/`, `src/levels.js`, `src/persist.js` are byte-identical to the P2.1 baseline. New adapters reuse existing computations. Additive optional science state preserves old saves and chapter identities. No old physics assertion or checkpoint source was removed.

Scientific details: [Specification](../../docs/V2_P22_SCIENTIFIC_SPECIFICATION.md), [Material Matrix](../../docs/V2_P22_MATERIAL_DOMAIN_MATRIX.md), [Field Provenance](../../docs/V2_P22_MODE_PROVENANCE.md). All classification / solver / mesh / boundary / material / λ data are embedded in numeric JSON.

## Regression / test corrections

New checks cover exact field input identity, node order/parity, cutoff mismatch diagnostics, material domain rejection, dynamic bend geometry, direct MMI exit-field projection, CMT conservation, complex MZI conservation, PN charge neutrality and bias trends, save/exit and browser interaction. Counts and final machine receipts are in `verification.json`.

Initial runs encountered a partially assembled index while building and reading it concurrently. Build now validates a temporary file then atomically renames it, and browser regression reads immutable canonical HTML. Those failures were rerun, not recorded as model failures. Local Chrome's old single-process/no-zygote flags caused crashes and unreliable numeric input; tests now use normal headless processes. Restore waits for the reloaded `window.SMQ_V2` before checking unchanged state. All old assertions remain. The PN view retains the tested Depletion Width label.

Local Python GDS was blocked by missing klayout; GitHub CI installs pinned requirements and is the authoritative GDS gate. Local test success is not substituted for remote CI. CI receipt is appended after the actual final artifact commit runs.

## Build / delivery

Canonical: `dist/spec-to-mask-v2.0.0-alpha.4-p22-physics.html`; same bytes as `dist/index.html`. SHA256SUMS and verification.json record the frozen build. B–E playable intermediates were generated locally from each checkpoint; final source and numeric datasets are in git, screenshots are CI artifacts.

Source-only A–E commits precede artifact publication. Main stays `0537a71a3f05670edc4887a2be21f0a7563f227c`. Draft PR #25 is updated at final verification. No merge and no P3.

## Local frozen-build results

| Gate | Result |
|---|---|
| P2.2 Physics / State | 4,394 PASS |
| P2.2 Scientific Browser | 64 PASS |
| P1 / P2 / P2.1 Model-State | 93 / 154 / 135 PASS |
| Learning Navigation / Course / Active / Format Model-State | 11 / 41 / 107 / 49 PASS |
| MZM / Studio State | 111 / 56 PASS |
| P1 / P2 / P2.1 Browser | 121 / 511 / 391 PASS |
| Navigation / Course / Formats / full Journey Browser | 50 / 322 / 79 / 16 PASS |
| Legacy Studio / MZM Browser | 168 / 37 PASS |
| Lab / Full Backup / Smoke / Migration | PASS after frozen-build rerun |
| Upgrade / MRR / DR8 / WDM / missing-baseline gate | PASS, unchanged kernels |
| Syntax / Offline / Source parity | 112 source/test files + assembled script PASS; no external HTTP in browser; canonical=index |
| Python GDS (local) | NOT RUN: missing klayout. Remote pinned CI required. |

Source Freeze `3e7f6f5827560f64fb4b52ffda9b7dd8a6867b0f`, exact tree `016045e787f7d585786a8ddc56c5a0e595751b81`. HTML SHA256 `b1f9bfa1b49abb9000b279f224dd80e0c66413f9511fd4f5bb9e45b030631351`. Final artifact CI is pending at this document's initial publication; subsequent receipt is authoritative.
