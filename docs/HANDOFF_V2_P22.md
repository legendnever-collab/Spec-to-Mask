# P2.2 Handoff / Play Review

Branch `feature/v2-p2-mzm-workbench`, Draft PR #25. main `0537a71a3f05670edc4887a2be21f0a7563f227c` remains untouched. Do not merge main or start P3 without user instruction.

Open `dist/spec-to-mask-v2.0.0-alpha.4-p22-physics.html` offline. If a legacy workspace is resumed, choose the Learning Workbench entry. Home opens Engine Overview. Session selects Tutorial / Passive / Active / MZM; Workspace Settings holds Platform, Theme, Backup and Legacy. 종료 saves then displays a safe close instruction; failed save blocks the exit screen.

Play Review:
1. Passive → Width: select an exact sample at width 2 µm on Si1310, then TE0/1/2/3, Signed E / |E|². Compare nodes and n_eff operating points. Fine off-grid widths must show Unsupported.
2. Bend: vary R and material; inspect separate Radiation / Propagation / Total, Representative / Fixed comparison. IOX / LDW / Polymer curves are intentionally unsupported.
3. Y: vary real Taper Length. DC: vary Gap and Interaction Length. MMI: switch 1×2 / 2×2 and inspect computed EIM evolution / raw port overlap diagnostics.
4. Active → Passive MZI: phase 0 / π routes two outputs. PN: sweep 0–3 V to compare asymmetric Depletion and Carrier Density with Optical Intensity / Overlap / Δn / Loss / C′. Drive compares the same demo PN geometry at a common 1.5 V reverse bias.
5. Save / Comparison / Session Resume / Theme / Full Backup / Reload / 종료를 확인합니다.

Known scientific limits: exact sampled mode width only; SiN historical table mismatch; nonconverged semi-vectorial TM sensitivity; no full parameter set for three new materials; MMI nonorthogonal port overlap and grid asymmetry; no optimized Y Field; 1D PN and bias-independent optical perturbation approximation. Do not promote these to full-wave or measured validation.

Recovery commits: A `8b6833a`, B `b8f5d22`, C `9270f0c`, D `3e4c9ac`, E `c319544`. Source-only checkpoints used [skip ci]. The final artifact commit and actual CI receipt are recorded in QA / PR; earlier P2.1 green CI is not evidence for P2.2.

Run `SMQ_HTML=dist/index.html npm run test:v2:p22`; `npm run test:browser:v2:p22` uses installed Playwright Chromium (or SMQ_BROWSER). Existing tests remain. Build uses atomic rename; avoid modifying the executable under active regression. Large numeric JSON Field data are separate source files; no raster Field images or uploaded screenshot binaries are required in git.

Final Artifact: `e826849c1d0b8b098019a29698b4539249cf1406`. Source/HTML parity and local+remote test logs confirmed. P2/P2.1/P2.2 SUCCESS; P0 job SUCCESS. P1/Production log and Release Artifact complete, but aggregate status API reconciliation remains NOT VERIFIED. See final QA receipt before interpreting pending badges. No rerun of passed jobs is necessary merely to change the displayed status.
