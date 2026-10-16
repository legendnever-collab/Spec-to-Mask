# v1.2.0-beta.1 — Single-lane MZM analysis checkpoint

## Approved baseline

User approved merging existing work before the next step. PR #19 merged as `824fff15a4cbb266fb5323db871b446a5bf45ca2`; PR #20 merged as `713a063b515bf4461920986e523dca523316845c`. PR #20 exact-head CI `38974493796` passed all seven jobs on `6afe506`; push CI `38974489241` also succeeded. Historical v1.1.0 and v1.1.1 executables and evidence are preserved.

This branch starts from merged main. It implements the first analysis increment of the approved MZM bench milestone, not the complete v1.2 Tx/Rx/GDS course. No legacy engine, threshold, level ID, platform, or card formula is replaced. New observation model version: `mzm-bench/1`; legacy MODEL_VERSION unchanged.

## Use

Select MZM DR8 → Level 1. Complete/apply the PN reference and advance to TW-MZM (2/2). Tune L, CPW gap, fill and termination as before. Scroll Tune to **Single-lane Bench** for source resistance, open-circuit Vpp, optical group index, differential phase bias and probe frequency. Inspect now includes the bench across its full width.

Bench conditions are independent experiments. They change bench curves and the exported analysis, but do not change the existing Mission, Canvas eye, score or Next gate. This boundary is stated beside the controls. The existing Canvas remains the legacy 112 GBd PAM4 experiment. No new system compliance claim follows from the bench.

Results: normalized EO response, electrical S21, complex characteristic impedance, RF attenuation/index at the probe, electrical S11, actual-termination input reflection, lumped junction Smith locus, complementary optical transfer, effective Vπ and source/electrode voltage distinction. `Export analysis JSON` includes 120 frequency samples, conditions, PN model, design, application provenance and full analysis identity.

## Model contract

- Reuse `KINDS.mzm._x.build` for the same loaded CPW and PN card. Do not alter `src/kinds/mzm.js`.
- Phasor exp(+jwt); propagation exp(-gamma z); line lengths SI internally. Sweep 1–120 GHz with 1 GHz spacing; normalization at 0.001 GHz.
- Two-port ABCD: A=D=cosh(gamma L), B=Zc sinh(gamma L), C=sinh(gamma L)/Zc. S parameters have equal real 50-ohm references at electrode ends. They do not depend on actual source/load resistances.
- Loaded input reflection uses the actual RT, referenced to 50 ohm. It differs from two-port S11. The lumped PN pair is another curve, with C=eta*Cprime*L/2 and R=2*Rprime/(eta*L), keeping RC=Rprime*Cprime.
- EO integrates forward and reflected junction voltage in the optical frame, then divides by its near-DC value. It is not electrical S21. `meanExp` handles matched velocity without a singularity.
- Static transfer uses constant legacy insertion loss and linear differential phase: main=T*(1+cos(phi_bias+pi*V/Vpi))/2, complementary=T-main. Voltage is the electrode differential voltage. This is not a PN reverse-bias sweep, wavelength spectrum or dynamic eye.
- Bandwidth reports the first -3 dB crossing with interpolation; absent crossing is `>120 GHz`, not a falsely exact bandwidth.
- CPW geometry/loss remain educational estimates. Pure SiN does not acquire a PN junction; existing SiN active models assume hybrid components.
- Every report remains **Educational model / Reference checked: NOT VERIFIED**. No field-map, EM, measured-BER, standards-compliance or GDS-generation claim is added.

## Reference boundary

Official sources inspected 2026-10-16:

- [Ansys TW-MZM](https://optics.ansys.com/hc/en-us/articles/360042328774-Traveling-Wave-Mach-Zehnder-Modulator): Si PN workflow links charge/RC, optical mode, RF and circuit stages. The current increment makes related analytical observations accessible; it has no imported reference curves or quantitative reproduction pass.
- [PhotonForge 1.1.6 EO-MZM](https://docs.flexcompute.com/projects/photonforge/en/v1.1.6/examples/EO-MZM.html): TFLN Pockels/LNOI400 example. This separate material model is not implemented by substituting Si PN parameters.

## Persistence / freshness

`mzmBench` is additive per-platform/per-Track workspace data, included in full backup and snapshots. Legacy backups without it use defaults. Invalid restored settings fall back to defaults without claiming saved results. No results are trusted from storage: each is recalculated.

Analysis identity includes current shell design/platform/card/model identity, bench model version and all bench conditions. Device edits invalidate it synchronously before rAF. Blank/out-of-range bench drafts hide prior curves and disable export; a render after blur preserves the draft. Reference Apply/Original recompute the device with independent experiment settings retained. Track switch, reload, backup/restore and snapshot/restore recompute their own identities.

## Validation and evidence

`artifacts/v120-bench/manifest.json` and `SHA256SUMS.txt` identify the final tested source and executable. Only completed runs in those files are PASS. Test commands:

```
npm run build
npm run test:mzm-bench
npm run test:studio
npm run test:syntax
SMQ_HTML=dist/spec-to-mask-v1.2.0-beta.1.html npm run test:browser:mzm
SMQ_HTML=dist/spec-to-mask-v1.2.0-beta.1.html npm run test:browser
node tools/check_rc.js
```

Model checks cover matched/zero-length limits, lossy transmission, velocity mismatch cancellation, legacy EO equality on all four platforms, passive power bounds, optical conservation and distinct electrical/EO responses. Browser checks cover actual inputs, stale export blocking, Reference/Original, Track/reload/backup/snapshot, JSON download, mobile/desktop layout and shared dark theme. Existing Studio/Atomic regression remains mandatory. CI now runs the new model and browser tests too.

Implementation findings: the first model run caught a scalar/complex reference mismatch in load reflection; corrected to complex division and rechecked. Visual inspection found the bench constrained to one Inspect grid column; it now spans the grid. Initial browser test selectors incorrectly assumed a theme ID and that Snapshot Restore left More open; tests were corrected to the actual UI. No physics thresholds were relaxed. Local system fonts do not render Korean glyphs; screenshots validate geometry, with UTF-8 and zero external-font requests retained.

## Remaining milestones

1. PN bias-dependent data/model packs and reference fixture validation; CPW geometry calibration and parameter-linked layout.
2. Bench drive/bias conditions connected to a separately versioned dynamic NRZ/PAM4 eye and mission pathway.
3. Monitored eight-lane MZM Tx, high-speed Rx/link, integrated GDS handoff.
4. Separate TFLN reference lab, MRM course, standalone LiDAR chapter.

This beta does not count these remaining items as implemented. Review the current checkpoint before merging its PR.
