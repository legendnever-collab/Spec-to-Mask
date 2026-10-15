# v1.1.0 QA report — execution in progress

This document is intentionally not a release PASS claim until the frozen release artifact is tested.

## Baseline
Target main `6bb116e1c5c5bd3fbff345a0e3752a078aa8084a`, original main CI 38153873423 SUCCESS. Reference main `d27ea0c2802056dd51c53b55dc19fcfb79bf3b7d` / merged PR #11. Target PR #14 remains open; reviewed document-shell correction is ported.

Original engine identity baselines exist and executed (no silent skip): Upgrade 357/357; MRR 182/182; DR8 87/87; WDM8 81/81; baseline handling 11/11. Initial Lab / smoke / flow / guide / backup / migrate / learn / Fab / wipe probes were also executed. Those long-running logs may span development build changes and are retained as probe history; only the frozen final rerun is authoritative UI evidence.

## Development evidence (not frozen-release acceptance)
Actual Chromium development expanded suite: 135 PASS, 0 page errors, 0 external HTTP requests. Five Track flows completed through their supported scope; MZM/MRR/WDM end in valid actual Lab Verification + Circuit Export and resume after file reload. Actual CDP Device and Lab Pinch / Pan, body-scroll containment, fixed Canvas during panel scroll, numeric edits, Reference Preview, 44px actions, Light/Dark reload and repeated Track Fab seed results were exercised. Final browser suite additionally tests mobile numeric input.

Additive state suite: 21 checks passed for legacy restore, independent Track design, explicit Copy, protected Original, old/new backup validation, checksum and raw Quarantine. Python GDS suites completed with unchanged GDS source and negative geometry tests.

The pre-final parallel batch was interrupted after its initial original suites completed; a deliberately tightened schema test ran against the not-yet-rebuilt HTML and failed. Its partial result is retained under development/ and is not counted as final evidence. The frozen final build will be run separately. No test failure is hidden or relabelled PASS.

## Browser measurements (development)
| Viewport | Device Canvas height |
|---|---:|
|390×844|650px|
|360×640|446px|
|320×568|374px|
|844×390|218px|
|667×375|203px|

No body/horizontal overflow in all eight specified viewports. Desktop Canvas/Inspector rectangles do not overlap. Values are measured actual rectangles, compared with Photonics Architect v0.8.1 rather than copied from it.

## Resolved development defects
Header overflow; Lab handlers after panel moves; hidden/null Device redraw during Lab resume; exact Original replacement; Legacy Lab mission navigation; strict Track bounds; current-hash-only Geometry Recheck summary. The original Si1310 Heater reference slightly misses its unchanged metal-absorption gate; a real h adjustment is needed and is not waived by score/reference.

## Environment limits
Local real Chromium running under Linux, with mobile viewport/touch emulation and file:/// URL. Local available Korean system font subsets were installed for QA; the app has no font download dependency. Korean glyphs are visually inspected in delivered screenshots. Physical Windows Chrome/Edge, Android/iOS, Safari/Firefox, native keyboard/clipboard and hardware safe-area behavior are not certified by emulation. No foundry sign-off or full LiDAR PIC GDS is claimed.

Final hash, suite counts, commit / CI links and outcome are appended after execution.
