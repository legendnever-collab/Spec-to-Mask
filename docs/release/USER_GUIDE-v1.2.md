# MZM bench beta.2 — play review guide

1. Open `spec-to-mask-v1.2.0-beta.2.html` in a desktop browser. No server or network is required. Light/Dark uses the same design and progress.
2. Select Si 1310 → MZM DR8 → Level 1. Use **Solution** beside Next to preview values, then **Explicit Apply** when desired. Preview alone does not modify the design. **Restore Original** recovers the protected device.
3. Complete the PN stage and advance to TW-MZM. Tune and Inspect stay visible together. L / gap / fill / RT remain device controls; Single-lane Bench controls define an independent experiment.
4. Choose **Live workspace PN geometry**, change reverse bias, and compare C′, VπL, RF/EO and the dynamic eye. If a saved upstream PN geometry is absent, the platform fallback is explicitly labeled.
5. Use **Apply Bench Solution** for a live-PN 1.5 V bias, 50 Ω source, 2.5 Vpp open-circuit drive, quadrature, 70 GHz driver and 28 GBd NRZ example. **Restore Bench Original** recovers the protected experiment separately from device Original.
6. Compare NRZ/PAM4, symbol rate, drive voltage and driver bandwidth. **Dynamic Eye 보기** opens the result. At 112 GBd PAM4 the raw rate is 224 Gb/s/lane; no net-200G certification is claimed.
7. Export analysis JSON, reload, switch Tracks, and exercise Text Backup/Snapshot. Invalid or pending fields must hide stale results and disable export. In Lab, Solution shows mission-specific steps; verification and export remain explicit actions.

Review 320/390 px mobile views and desktop Light/Dark. Bench settings do not change the legacy Canvas Eye / Mission / Next experiment. JSON analysis is not GDS; the existing Lab/Python GDS workflow is retained.
