# v1.2.0-beta.2 — Solution and live PN / dynamic eye

This release candidate adds Solution preview, explicit Apply and protected Original restore to the existing Studio. Lab Solution explains the current mission without changing verification or export state. The Lab reference pane now tolerates a transient missing mission.

The single-lane MZM bench supports live workspace PN geometry, a 0–3 V reverse-bias sweep, and a deterministic NRZ/PAM4 dynamic eye. Source/load conditions, driver bandwidth, symbol rate and bias update the linked Inspect plots. Bench Solution provides a labeled 28 GBd NRZ starting experiment; it is not an imported reference or guaranteed PASS.

The bench remains independent of the legacy Canvas Eye, Mission score and Next gate. Legacy physics and thresholds are unchanged. Quantitative external reference reproduction is NOT VERIFIED; full Tx/Rx/GDS curriculum, calibrated geometry, nonlinear PN, TFLN, MRM expansion and standalone LiDAR remain future milestones.

Exact beta.2 executable evidence: `artifacts/v120-beta2/manifest.json`. Beta.1 files and evidence are preserved as historical results. PR #22 remains Draft and unmerged pending user play review.
