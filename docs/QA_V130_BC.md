# v1.3.0-alpha.1 — Checkpoint B/C Preview QA

This is a playable Tutorial preview, not the final alpha.1 release candidate. Chapter 1 missions 1-1…1-8 and Chapters 2–4 are not playable. Main is not merged.

## Recovery

Remote initial HEAD: `66ef410d817a3249420c369d7dac386737d02d6d`. Same branch `feature/v1.3-learning-journey`, same Draft PR #23. Existing local `e0ab3319` / `1f43cee8` and the untracked test were preserved in their original checkout and a recovery Git bundle. Their out-of-scope Chapter 1 implementation is not exposed in this checkpoint. No previous released HTML was deleted.

Checkpoint B GitHub commit: `63efbf00dde0463e784fb968f675069c2cf84e2b`. Its exact-head CI run 39032264453 succeeded, including the four-platform matrix. Checkpoint C CI is requested separately and must not be inferred from that B run.

## Tutorial play

| Step | Actual interaction and model | Gate |
| --- | --- | --- |
| 0-1 | Laser power input / ± buttons; existing `KINDS.els` output, loss and reference-link margin | Real edit, current results inspected, PD role check, explicit Verify |
| 0-2 | NRZ → PAM4; baud → 112; existing `mzm-eye/1` dynamic traces | Both controls changed, 224 Gb/s raw confirmed, current result inspected, explicit Verify |
| 0-3 | MZM length or driver tune; Canvas and live Inspect; Verify then read-only Solution | Current revision verified, concept check, Canvas/Inspect confirmations, Preview view, final Next |

The Tutorial teaches controls and concepts. A closed Eye can still satisfy a Tutorial learning objective; this is not an engineered 200G link PASS. 112 GBd PAM4 is 224 Gb/s raw. Net 200G, BER, FEC and IEEE compliance are not verified. Laser output is chip-input power from the existing ELS reference link, with its original assumptions. Tutorial results never initialize the independent MZM workspace.

Tutorial completion is saved and unlocks only the Chapter 1 curriculum entry. The completion screen says PREVIEW ONLY and offers no playable Chapter 1 mission.

## Final source verification

| Command / scenario | Result |
| --- | --- |
| npm ci / npm run build | PASS |
| npm run test:syntax | PASS, 83 JS files plus assembled script |
| npm run test:studio | 56 PASS |
| npm run test:lab | 440/440 + Si1310/SiN1550 actual Lab e2e and state PASS |
| npm run test:mzm-bench | 111 PASS |
| npm run test:journey | 36 PASS, including actual four-platform switching |
| npm run test:tutorial | 26 PASS, actual controls and full Tutorial |
| Chromium Tutorial | 93 PASS |
| Chromium existing Studio | 168 PASS |
| Chromium MZM bench | 37 PASS |
| Backup and migration | Existing Restore/Undo and Legacy preservation PASS |
| Physics / Bench / specs / Lab engine baseline diff | Zero |

Tutorial browser acceptance completed all three steps at 1440×900, 390×844 and 320×568, in Light and Dark. It covers Step 2 reload, incorrect/missing action, Preview/Apply/Original, Advanced return, future locks, Preview-only content, same-task invalid-input/Next, mobile touch Pinch/Pan, readable Canvas, simultaneous live Inspect/Tune, zero horizontal body overflow, Uncaught Page Error 0 and External Runtime HTTP Request 0. Screenshots use an installed Korean font; the application has no runtime font download.

The first local browser attempt exposed delayed Legacy star/DB writes while Preview was open. Curriculum scopes now skip those Legacy automatic awards. Actual platform-switch regression exposed old-scope default-design writes; the old scope is detached before platform setup. Both fixes are included in the successful final runs. Local Chromium needs a fresh process per test context; the test harness relaunches it. Initial failed diagnostic runs are not PASS evidence.

## Artifact integrity

`dist/index.html`, a fresh source rebuild, and `dist/spec-to-mask-v1.3.0-alpha.1-checkpoint-bc-preview.html` match byte for byte.

SHA256: `580c0d4387e9bf573f21f56c77db0020f56f2d0898ac0ceb96a9a916147871ab`

Detailed command records, three browser acceptance JSON records, the complete source SHA256 map, and SHA256SUMS are in `artifacts/v130-final`. Full successful QA logs and browser screenshots are in the delivered QA archive. The build now publishes its HTML atomically after syntax validation, so a reload cannot observe a partial assembly.

## Remaining

D: MZM 200G steps 1-1…1-8. E: final review / migration / QA. F: canonical offline release candidate and source ZIP. The current PR remains Draft. No release tag, official release, canonical alpha.1 HTML or Source ZIP is created here.
