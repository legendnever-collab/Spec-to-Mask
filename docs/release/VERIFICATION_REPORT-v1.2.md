# beta.2 — exact executable verification checkpoint

- Frozen application source: `3df1ea609d306e4d52e5b114a8c1e49d0db93f7c`; source tree `bbbb47332bd845c96d2d375b79b488b348676716`.
- Canonical HTML: `dist/spec-to-mask-v1.2.0-beta.2.html` (2,168,142 bytes).
- HTML SHA256: `b5ad7068ef669da067bdb9577d0efde07fa65c3a5d761ba437e1de62a3a76691`.
- Build/source parity and syntax: PASS. Model 111; Studio state 56; MZM browser 37; existing Studio browser 168 checks PASS.
- Both browser suites use this exact HTML hash, with zero page errors and zero external HTTP runtime requests.
- Desktop/mobile Light/Dark evidence is under `browser/` and `studio-browser/`. Korean glyph coverage is absent on this host, so screenshot review verifies layout, not Korean font rendering. UTF-8 is verified.
- Source CI [39013245792](https://github.com/legendnever-collab/Spec-to-Mask/actions/runs/39013245792): all seven jobs succeeded, including four-platform regression/Bot and Python GDS. This result belongs to the frozen source commit, not the later artifact checkpoint.
- Final checkpoint CI must be read separately at PR #22's current HEAD. No physics source, test thresholds or workflow changes are included.

## Reproduce

```sh
npm ci
npm run build
node tools/check_rc.js
npm run test:syntax
npm run test:mzm-bench
SMQ_HTML=dist/spec-to-mask-v1.2.0-beta.2.html npm run test:studio
SMQ_HTML=dist/spec-to-mask-v1.2.0-beta.2.html npm run test:browser:mzm
SMQ_HTML=dist/spec-to-mask-v1.2.0-beta.2.html npm run test:browser
```

A locally supplied browser may be selected with `SMQ_BROWSER`. Do not restamp the canonical HTML merely because documentation or evidence commits advance HEAD; source parity normalizes provenance only.

After checkpoint publication, `sh tools/release.sh` packages the parity-verified canonical bytes, a source ZIP of that checkpoint, updated guides, handoff ZIP and SHA256SUMS. The HTML's source stamp and the source ZIP's packaging commit intentionally differ only by documentation/artifact additions.

## Review boundary

PR #22 remains Draft and unmerged. User play review is required before merge. Reference fixture calibration and full Tx/Rx/GDS/TFLN/MRM/LiDAR work are outside this checkpoint. Historical beta.1 artifacts remain unchanged.
