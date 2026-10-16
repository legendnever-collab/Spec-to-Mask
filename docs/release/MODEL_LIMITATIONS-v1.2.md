# MZM bench model limits

Educational analytical estimates, not external solver/measurement validation. `Reference checked: NOT VERIFIED` is always explicit. Legacy PN/loaded CPW feeds the bench without changing legacy scores. S parameters use electrode-end 50-ohm references; loaded input reflection uses actual RT. EO is normalized mean junction voltage in the optical frame, distinct from electrical S21. RC Smith data represent a lumped series pair for active length.

Static transfer assumes equal arms, fixed loss and linear phase. No new PN bias dependence, wavelength dispersion, field maps, RF geometry calibration, dynamic eye, noise, BER or foundry signoff is supplied. TFLN Pockels is a separate pending material model. SiN active components keep the existing hybrid-integration assumption. Numerical reference reproduction and the full 1.6T Tx/Rx/GDS course are incomplete.

Detailed conventions and equations: `docs/DEVELOPMENT_V120.md`. Exact executable evidence: `artifacts/v120-bench/manifest.json`.
