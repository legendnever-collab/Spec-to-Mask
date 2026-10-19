# P2.2 Mode / Field Dataset Provenance

Generator: `tools/gen_p22_fields.py`. Solver: unchanged `tools/modes2.py`, semi-vectorial finite difference Ex / Ey, SciPy sparse eigenvalues. Classification **B / C solver**. No full-vector cross-component coupling, no FDTD. Each JSON embeds solver SHA256, material indices, wavelength, thickness, mesh, boundary, physical x/y coordinates, validation results and exact sample width.

| Platform | λ / t (µm) | Mesh (µm) | Width samples | Maximum table Δn_eff | Maximum refinement Δn_eff |
|---|---|---|---:|---:|---:|
| Si1310 | 1.31 / 0.22 | 0.025 | 38 | 4.99e-7 | 0.02204 |
| Si1550 | 1.55 / 0.22 | 0.025 | 38 | 4.94e-7 | 0.02523 |
| SiN1310 | 1.31 / 0.40 | 0.035 | 28 | 0.001836 | 0.01037 |
| SiN1550 | 1.55 / 0.40 | 0.035 | 27 | 0.003215 | 0.01976 |

Table maximum includes cutoff / radiation-like eigenvalues. Guided-mode SiN discrepancy is ≤0.00147. sin1550 at width 2.7 µm TE3 has a guided/cutoff disagreement and is explicitly NOT VERIFIED. Si data reproduce the old table; reproducing a table does not establish physical accuracy. Refinement simultaneously reduces mesh by 1.5 and expands x/y windows by 0.4 µm at two representative widths; therefore the deltas are a sensitivity diagnostic, not a separated mesh convergence proof. TM sensitivity prevents claiming converged full-vector accuracy.

The solver window is x half-width = w/2 + 1.2 µm (Si) or +1.8 µm (SiN), y half-width = 1.2 / 1.8 µm. Exterior field is zero (Dirichlet), no PML. Each display grid is 64×40 over this physical window. Bilinear resampling is followed by signed int quantization E×127; decode by division by 127. The dominant component is peak normalized, not normalized power density. |E|² is its square, not full-vector total energy.

All old table widths plus actual platform defaults are available. No width / wavelength / thickness interpolation of Field arrays occurs. Fine values outside this exact library show Unsupported, with a user-applied sample selector. Legacy 40×24 nearest-width unsigned snapshots are preserved but not described as realtime solver output.

665 saved guided Field arrays pass lateral node-order checks (central row, |quantized E|>3 floor), finite-array tests and mirror parity tests. Test count differs from array count because the disputed cutoff mode is not rendered as supported. Internal Table / Field consistency and node parity are PASS within stated tolerances. External Maxwell validation, absolute E normalization and mesh-converged accuracy are NOT VERIFIED.

## Scientific references and reuse

- Existing solver and coefficients: `tools/modes2.py`, `src/engine_mmi.js`, `src/kinds/dc.js`, `src/kinds/pn.js`, `src/kinds/spiral.js`, `src/lab/engine.js`.
- Soref & Bennett, *Electrooptical effects in silicon*, IEEE JQE 23(1), 123–129 (1987), https://doi.org/10.1109/JQE.1987.1073206 ; author-paper archive https://zenodo.org/records/1232209 . Existing PN coefficient provenance; not an independent validation of this device.
- Marcuse, *Curvature loss formula for optical fibers*, JOSA 66, 216 (1976), https://doi.org/10.1364/JOSA.66.000216 . Reduced-order theoretical background; not validation of high-contrast Si bends or the five-family comparison.
- Material-specific primary references and supplied Boucaud PDF are listed in `V2_P22_MATERIAL_DOMAIN_MATRIX.md`. No dataset was inferred from an illustration or a single literature point.
