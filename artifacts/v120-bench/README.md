# MZM bench beta evidence

Canonical HTML SHA256: `735a1dce82a43d7932d60fa6f27edbcae656d88d9d78e52fe904b7603a26da37`. Source: `e88ce59f88bc80d47659fe680a30a8065716e5a2`.

- `model.log`: 58 source-model checks.
- `studio.log`: 56 canonical Studio/Atomic state checks.
- `browser/acceptance.json`: 23 canonical bench browser checks, plus exported analysis and screenshots.
- `studio-browser/results.json`: 168 canonical legacy Track/Atomic browser checks, plus geometry measurements, state evidence and screenshots.
- `build.log`, `syntax.log`, `parity.log`: build, JS syntax and source/canonical comparison.

No external HTTP requests or page errors in either browser run. These tests do not imply external solver calibration, full 1.6T Tx/Rx completion, or foundry qualification. See manifest for environment and historical-CI boundaries.
