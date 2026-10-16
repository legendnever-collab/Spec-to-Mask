# v1.1.0 recovery acceptance

Application source: `af18d590636140832645564fb6434033e8328d51`. No application, Physics, calibration, thresholds or GDS source changes. Test revisions are included in this checkpoint and hashed in MANIFEST.json.

Canonical executable: `dist/spec-to-mask-v1.1.0.html`  
SHA256: `c7d327a6c07420f2ba903bc14d723bab4b525bd10ec4c7d3d6cd493ef52fd71e`

| Check | Result | Evidence |
| --- | --- | --- |
| Current source build / offline build | PASS | build.log, build-offline.log, build-canonical.log, build-final.log |
| Atomic / Studio state, source build | 39 PASS | studio.log |
| Atomic / Studio state, exact canonical HTML | 39 PASS | studio-canonical.log |
| Actual Chromium, file URL, exact canonical HTML | 141 PASS | browser.log, browser/results.json |
| Backup / Restore, canonical bytes | PASS | backup.log |
| Migration, canonical bytes | PASS; no page errors | migrate.log |
| Source / HTML parity | PASS | source-parity.log |
| Deliberate source mismatch | Correctly rejected | parity-negative.log |
| JavaScript syntax | 71 files + assembled script PASS | syntax.log |

## Atomic cases
A: Apply Reference, actual solver PASS, fresh Test and enabled Next.
B: Edit `na` to 17 and click Test/Next synchronously in one browser task, before animation-frame evaluation. Actual VπL = 2.48 V·cm > 2.1 V·cm, optical loss = 0.57 dB/mm <= 0.84 dB/mm. The recorded Test identity matches the current failing design; Next stays disabled and the Level does not advance. Exact objectives and identity are in browser/atomic-gate.json.
C: Restore the original parameter and immediately Test: current solver PASS and Next enabled. Browser also verifies Reference Apply / Test recovery.
D: Track switch, Original restore, reload/resume, full backup restore/reload and Guided/Full mode switching reject another design or mode's Test. Valid identity-matched saved Tests may remain valid for the same design.

## Recovery decisions and limits
- The original workspace `/workspace/scratch/4f7e8220ee6d/Spec-to-Mask` is untouched. Its modified GDS examples and extra logs were not discarded or included in this checkpoint.
- Local npm ci --offline failed because xmlchars was not cached. The original node_modules was reused only after package-lock byte equality; npm ls confirmed the required top-level versions. Remote CI performs clean npm ci.
- Existing /tmp/chromium was used. No browser or font download was attempted. There were zero browser errors and zero external HTTP requests.
- Local process inspection through ps failed; /proc inspection found no old npm/test/browser process in the visible namespace. Other Work sessions cannot be ruled out.
- Historical broad Physics/Lab/GDS/four-platform logs and screenshots remain under artifacts/v110-qa and apply to their recorded older hash. They are not relabeled as fresh local acceptance. New browser screenshots are preserved in the recovery workspace, while text/JSON evidence is committed here.
- Reused pending tools/check_rc.js / tools/release.sh changes allow parity-checking a fresh release build and then shipping the exact tested canonical bytes. No full release packaging was run locally.
- CLI dry-run Push failed for missing credentials. Publish this checkpoint through connected GitHub Git-data APIs with an expected-head lease. CI status is tracked on PR #19 against the resulting commit.
- PR stays Open/Draft. No merge, tag or official release.
