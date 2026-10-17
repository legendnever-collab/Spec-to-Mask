# MZM bench beta.2 — model limits

Educational analytical model; quantitative external reference reproduction remains **NOT VERIFIED**. No measured BER, foundry signoff or standards-compliance claim is made.

- Versions: `mzm-bench/2`, `mzm-eye/1`, export `smq-mzm-bench/2`. Legacy engine/scoring remains unchanged. Fixed PN mode preserves the prior analytical response.
- Live PN reuses the existing Si depletion/overlap model. C′, R′ and depletion width follow bias. Local VπL uses a ±0.01 V optical slope (one-sided at the 0/3 V bounds); it is a small-signal approximation. SiN active components assume hybrid Si integration.
- S parameters reference 50 Ω at the electrode ends; actual loaded input reflection uses RT. Normalized EO is distinct from electrical S21. RC Smith data represent the lumped series junction pair.
- Dynamic eye: deterministic periodic 256-symbol sequence, 16 samples/UI, second-order Butterworth driver, loaded CPW/junction response and equal-arm cosine optical transfer. Response is truncated above 240 GHz. Constant optical loss and linearized PN slope are used.
- The raw vertical gap selects among 16 sample phases and ±8 UI delays. No noise, CDR, FFE, BER or compliance scoring is simulated. Folded/non-monotonic levels have no opening value.
- Live-PN junction excursions Vbias ± Vdiff/2 must stay within 0–3 V; outside this domain the eye is hidden and opening is null. This is not nonlinear large-signal carrier simulation.
- Bench conditions affect Inspect, not the legacy Canvas Eye / Mission / Next gate. RF geometry calibration, external solver fixtures, full 1.6T Tx/Rx/GDS course, TFLN, MRM and standalone LiDAR remain incomplete.

Detailed conventions: `docs/DEVELOPMENT_V120.md`. Exact-file evidence: `artifacts/v120-beta2/manifest.json`.
