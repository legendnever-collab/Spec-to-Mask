# SPEC-to-MASK v2.0 — Checkpoint / Handoff Log

> Canonical requirements: [V2_MASTER_PLAN.md](V2_MASTER_PLAN.md)
> Original P0 execution order: [V2_P0_SOL_WORK_ORDER.md](V2_P0_SOL_WORK_ORDER.md)
> Owner approval and playable review required after each checkpoint. Update this file **at every new Work** before stopping.

Current handoff: **2026-10-18 사용자 P1 Play / Merge 승인과 P2 개발 승인을 받았습니다. P2는 별도 Branch / Draft PR에서 Play Review까지만 진행합니다. P2 main Merge / P3는 승인되지 않았습니다.** 최신 기록은 문서 하단을 확인합니다.

## Status as of 2026-10-18 (KST)

| Checkpoint | State | User approved? | Evidence |
|---|---|---|---|
| P0 UX Architecture & Wireframes | BLUEPRINT / MOCK DELIVERED, REVIEW PENDING | No | Four design documents + isolated HTML +29 screenshots +164 browser checks |
| P1 Waveguide Tutorial | MERGED / PLAY ACCEPTED | Yes | PR #24 / 0537a71 / CI 39083108046 SUCCESS |
| P2 MZM Physics Workbench | IMPLEMENTED / PLAY REVIEW PENDING | 개발 승인, Play / Merge 승인 전 | docs/V2_P2_MZM_WORKBENCH.md / artifacts/v2-p2/QA.md |
| P3 200G-class MZM Lane | NOT STARTED | No | — |
| P4 1.6T MZM Engine | NOT STARTED | No | — |
| P5 1.6T MRM Engine | NOT STARTED | No | — |
| P6 1.6T EAM Engine | NOT STARTED | No | — |
| P7 3.2T / 400G Challenge | NOT STARTED | No | — |
| P8 Final Integration | NOT STARTED | No | — |

## Repository recovery pointers (must re-check on each start)

- Baseline main observed 2026-10-18: `289523340dedb04866a07151614c521654c16bc3`.
- Historical v1.3 PR #23: https://github.com/legendnever-collab/Spec-to-Mask/pull/23 . Last observed head `25ab11edeeb0af1f66dae8f32d4ae92f6bd43071`, Draft/Open and unmerged. An interrupted work session may contain unavailable, uncommitted local changes; no later patches from it have been verified here.
- v2 work branch: `feature/v2-learning-experience`, created from verified main and intended initially to be **documentation-only**.
- User design decisions were locked in 2026-10-18 chat and transcribed to `V2_MASTER_PLAN.md`. The repository files, not presumed chat memory, are authoritative for subsequent Work.
- No P0 UI code, new EAM solver, or 400G solver has been completed merely by publishing these planning documents.

## Initial handoff (before P0; retained for history)

1. Read this log, `V2_MASTER_PLAN.md`, `V2_P0_SOL_WORK_ORDER.md` on branch `feature/v2-learning-experience`.
2. Inspect real latest remote `main`, v2 branch/PR, PR #23, and local changes.
3. Perform **P0 only**: UX architecture, annotated three-screen wireframes, reusable solver data-flow mapping and P1/P2 tests; isolated mock if feasible. Do not modify physics.
4. Commit/push on the same v2 branch, update this log, keep PR Draft, **do not merge**.
5. Report links to exact artifacts and request user P0 review before P1.

## Checkpoint record template (fill when work actually completes)

### P{N}: <checkpoint name>
- Date (KST):
- Starting branch, HEAD and local changes:
- Source changes / documents:
- Exact commit SHA:
- Offline executable path, SHA256, source parity:
- Desktop/mobile screenshot refs:
- Tests & CI (commands, versions, run URL, PASS/FAIL/PENDING):
- Model boundary and NOT VERIFIED items:
- Known issues:
- User review result / approval date (never infer):
- Next checkpoint authorization:

## P0 — UX blueprint and isolated prototype (2026-10-18 KST)

### Recovery

- main unchanged at `289523340dedb04866a07151614c521654c16bc3`.
- Started existing `feature/v2-learning-experience` / Draft PR#24 at `712cc019cf1bdcc11d00ed2c2f6a646dda6de1cd`.
- PR#23 remains separate Open Draft at `25ab11edeeb0af1f66dae8f32d4ae92f6bd43071`; B/C history preserved, no whole-Journey import.
- Accessible old local folders contained unpushed v1.3 commits and uncommitted journey/studio/dist/tests/screenshots. Left untouched; separate local v2 copy used. No recovery material deleted.
- Starting CI#24 run39044204248 and PR#23 run39033277252 success; new-head runs must be checked separately.

### Delivered files

- `docs/V2_UX_ARCHITECTURE.md`: three view types, Discover/Engineer, responsive priority, read-only Learn, identity/persistence design.
- `docs/V2_WIREFRAMES.md`: annotated Engine / Waveguide / MZM screens, pixel bounds, actual desktop/mobile captures.
- `docs/V2_REUSE_MAP.md`: REUSE/ADAPT/NEW/UNSUPPORTED inventory, source provenance and future production adapter contract.
- `docs/V2_ACCEPTANCE_TESTS.md`: P1/P2 acceptance cases, negative identity/save/model tests, planned human trial.
- `prototypes/v2-p0/index.html`: offline3-scene UX MOCK, no production scripts or storage; `check.cjs`, `audit-source.cjs`, `verification.json`, `source-audit.json`, `QA.md`, `SHA256SUMS`,29PNG screenshots.
- `.github/workflows/v2-p0.yml`: isolated mock browser checks alongside unchanged production CI; evidence uploaded as an Actions artifact.

### Model decisions / limitations

- Existing `KINDS.wg` only supports width/modes/scattering. Deeper Lab inspection confirms **existing `LAB.routeLoss` already integrates90° strip-arc radiation + propagation**, using spiral/EIM helpers. Recommended P1 reuses this path with explicit domain/unit tests; width/mode lesson is fallback. Rib MRR routines are not interchangeable.
- P0 Waveguide displays geometric area and “Not evaluated” optical loss. MZM uses labeled dimensionless fixtures; no calibrated fields/actual volts/dB/BER or game PASS.
- Actual engine audit records four-platform outputs separately. Total arc loss need not decrease with R because propagation length increases; teach bend radiation and propagation separately.
- EAM and400G are NEW future models; no implementation/compliance claim.

### Local evidence

- Prototype164 assertions PASS across1440×900,1366×768,390×844,320×568, Light/Dark. Desktop simultaneous controls/diagram/plot/KPI; phone knob/KPI above fixed actions; below-fold detailed plot intentionally scrolls.
-29 actual screenshots under `prototypes/v2-p0/screenshots/`; hash and bounds in verification.json. No page errors/external runtime HTTP, no prototype storage writes; Learn/restore/theme/skip checks passed.
- Baseline build and canonical RC source parity PASS; production src/dist unchanged.
- Syntax75 files + assembled script PASS; Studio56, MZM Bench111, backup, Lab440 + Si/SiN e2e/state PASS.
- Local Python GDS attempt BLOCKED: `ModuleNotFoundError: klayout`; no local GDS PASS. CI installs pinned requirements; final CI outcome belongs in follow-up receipt below.
- No human learning/discoverability test performed;2–3min completion remains a design target. No production async adapter or migration test claimed.

### Review and stop point

User approval: **NOT GIVEN**. P1 authorization: **NOT GIVEN**. Main merge: **FORBIDDEN pending explicit approval**.

Top review decisions: (1) desktop60/40 + phone physical/KPI/control layout, (2) existing Lab arc-loss Tutorial path vs explicit width fallback, (3) nonblocking Discover/Skip and in-place Engineer constraints.

P1 proposed scope only: reviewed fixed-platform Waveguide lesson, existing loss kernel adapter, current-result identity, optional Learn, observation/skip progression, additive save/backup and viewport regression. No MZM production work, DR8 redesign, EAM or400G in P1. P2 later adds three real MZM experiments with separate approval.

Copyable future instruction (use only after user P1 approval): “Read V2_MASTER_PLAN, all P0 artifacts and V2_CHECKPOINT_LOG; confirm remote HEAD and P0 approval; implement P1 only using the approved Waveguide model path; preserve main/PR#23 and all saves; do not merge main or start P2.”

Implementation commit, artifact SHA256 and latest CI receipt are appended after the review payload is committed. This avoids pretending a commit can contain its own final SHA.

### P0 publication receipt

- Published implementation commit: **`b77ca3c21f7c532cbd1901bdb7dc531f004615cd`**.
- Complete tree: `9a99fe110650398811d2c87676f663d4a7e5afa3`, exactly equal to the locally tested/committed tree (all44 files, including binary screenshots). GitHub connector upload used because terminal HTTPS writes had no credential; no force push or competing branch.
- Local unpublished preparation commit `81f73d5d755bb5fe031f8ed232b0e3d3e39a0ef4` has the same tree and remains recoverable in local git history/reflog. Local branch metadata synchronized only after tree equality; file content was not discarded.
- Prototype HTML SHA256: **`70d592522514a06e842e669b2aa613938763d17ed3abc4eab66ebf6ffb584dd2`**. `sha256sum -c prototypes/v2-p0/SHA256SUMS` passes all34 entries.
- Local prototype164 browser assertions PASS. This is the exact payload tested; follow-up receipt changes only checkpoint/QA text.
- Implementation-head CI started: [P0 browser39047325099](https://github.com/legendnever-collab/Spec-to-Mask/actions/runs/39047325099), [production CI39047325119](https://github.com/legendnever-collab/Spec-to-Mask/actions/runs/39047325119). **IN PROGRESS at receipt**, not reported as PASS here.
- Latest receipt-head CI must be read from [branch runs](https://github.com/legendnever-collab/Spec-to-Mask/actions?query=branch%3Afeature%2Fv2-learning-experience); final PR body/report records the actually observed outcome. Later canceled superseded runs are not failures of physics.
- Main and PR#23 remain unchanged; PR#24 stays Draft. No P1 authorization, no main merge, no scientific/user-learning acceptance inferred.

## P1 시작 기록

- 기준 HEAD: `c231bc982ce693f2b93f7e66c6d5014b8266d6cf`, Local 변경은 없었습니다. main과 PR #23은 기존 HEAD를 유지합니다.
- 사용자 지시에 따라 P1만 구현합니다. P0 전체 사용성 PASS를 추정하지 않습니다.
- 기본 Si1310의 고정 Width에서 기존 `LAB.routeLoss`를 연결합니다. 같은 Kernel을 쓰는 Platform별 Workspace를 분리하고 기존 Solver 계수는 바꾸지 않습니다.
- 새 UI와 Learn Physics는 English 기술 용어 + 한글 서술어로 작성합니다. P0 Prototype과 기존 Release는 보존합니다.

## P1 구현 / 검증 기록 (2026-10-18)

- 사용자 지시에 따라 기술 용어는 English, 설명과 서술어는 한글로 작성했습니다. `docs/V2_LANGUAGE_POLICY.md`에 다음 Work의 대전제로 기록합니다.
- `src/v2/schema.js`, `core.js`, `ui.js`, `workbench.css`로 실제 `LAB.routeLoss`와 연결한 Tutorial을 구현했습니다. Model 계수는 바꾸지 않았습니다.
- 기본 Si1310에서 시작하며 4 Platform별 고정 Width / Radius Domain과 Workspace를 분리합니다. Geometry와 Bend / Propagation / Total Loss를 구분합니다.
- Engine Overview → Waveguide → Summary까지 제공합니다. 관찰 없는 Continue/Skip은 완료 증거로 보지 않습니다. P2 MZM은 아직 구현하지 않았습니다.
- `smq-v2-learning` Namespace를 기존 Store의 Backup / Restore / Undo / Quarantine에 추가했습니다. 기존 `smq3-studio.journey`는 보존하고 새 완료 증거로 가져오지 않습니다.
- 새 실행 파일: `dist/spec-to-mask-v2.0.0-alpha.1-p1.html`. `dist/index.html`과 Byte 단위로 같습니다. 기존 beta.2와 P0 파일은 보존합니다.
- 실제 결과: P1 State/Model 93, P1 Browser 121, Studio State 56, MZM Model 111, Lab 440 + Si/SiN e2e/state, Backup, Legacy Studio Browser 168, Legacy MZM Browser 37을 통과했습니다.
- 4 Viewport × 2 Theme의 실제 한글 화면을 `artifacts/v2-p1/`에 제공합니다. Runtime 외부 HTTP와 Page Error는 없었습니다. Offline Font와 OFL License를 포함합니다.
- Python GDS 검사는 Local klayout 부재로 중단됐습니다. 사용자 학습 효율 / 외부 Physics Accuracy는 검증하지 않았습니다. P1 CI는 게시 후 별도로 확인합니다.
- SHA256 / 상세 QA: `artifacts/v2-p1/SHA256SUMS`, `artifacts/v2-p1/QA.md`, `browser-report.json`에서 확인할 수 있습니다.
- P1 구현 승인은 있으나 Play Acceptance / P2 / main Merge 승인은 없습니다. P1 검토에서 중단합니다.

## P1 Interrupted Work Recovery (2026-10-18)

- 이전 Workspace `/workspace/scratch/414323827069/Spec-to-Mask`에서 Staged 54개 변경과 기존 QA / HTML / PNG를 복구했습니다. 이전 Work의 실행 중 프로세스는 발견되지 않았습니다. 다른 v1.3 Workspace의 미Commit 변경은 그대로 보존했습니다.
- 복구 Local Checkpoint는 `f81161e`입니다. Source / Test / Documentation / HTML을 먼저 게시한 Remote Checkpoint는 **`cf33cf09ec9e7d736b648c5137fc1b224d2af797`**입니다. Parent는 기존 P0 `c231bc982ce693f2b93f7e66c6d5014b8266d6cf`이며 Force Push를 하지 않았습니다.
- 이전 Source / Test / HTML을 재사용했습니다. 기존 Solver / Platform / Level / Data / beta.2 HTML / P0의 Diff는 없습니다. 새 Source 기능이나 P2를 추가하지 않았습니다.
- Screenshot은 핵심 Source와 분리했습니다. 기존 PNG와 새 Browser 검증 화면은 Local에 보존하며 GitHub P1 CI의 `v2-p1-waveguide-evidence` Artifact로 제공합니다. 반복 Base64 / Blob 생성은 하지 않았습니다. 이미지의 Git 등록은 선택적인 후속 항목입니다.
- Recovery에서 실제 재실행: Build + Canonical Parity + Syntax 80개/Assembled Script, P1 Model 93개, P1 Browser 121개, Studio State 56개, MZM Model 111개, Backup, Lab 440개 + Si/SiN e2e/state, Legacy Studio Browser 168개, Legacy MZM Browser 37개가 통과했습니다. Local GDS는 klayout 부재로 실행하지 못했습니다.
- P1 CI [39080990864](https://github.com/legendnever-collab/Spec-to-Mask/actions/runs/39080990864)는 **SUCCESS**입니다. 실제 실행한 npm ci / Build / Parity / State-Model / Browser / Screenshot Artifact Upload가 모두 통과했습니다. 전체 Production CI의 최종 결과는 별도 Receipt에 기록합니다.
- 실행 HTML: `dist/spec-to-mask-v2.0.0-alpha.1-p1.html`, SHA256 **`9e4be1bd32fe6a5b61f53b2357d923a20ffefd45e580aa238b4d73d4e560c487`**. `dist/index.html`과 Byte 단위로 같고 Recovery 재빌드 전후에도 동일합니다.
- Known Issue: Terminal HTTPS Push는 Credential 부재로 사용할 수 없어 GitHub Connector를 사용했습니다. Screenshot은 Git 등록 대신 CI Artifact로 전달합니다. 외부 Physics Accuracy / 사용자 학습 효율 검증은 수행하지 않았습니다.
- 사용자 지시대로 English 기술 용어 + 한글 설명/서술어를 유지합니다. **P1 사용자 검토에서 중단하며 P2 / main Merge는 금지합니다.** PR #24는 Draft로 유지합니다.


## P1 Finalization / P2 Work Order 수신 (2026-10-18)

- 사용자 P1 플레이 완료 / 정상 동작 확인 / PR #24 main 병합 승인을 확인했습니다. P2 세 Experiment 구현도 승인했으며 P2 병합과 P3 진행은 금지합니다.
- Recovery HEAD: `3a0d2fd0b30b2006a9321db8c27a01cced31f6fc`, main `289523340dedb04866a07151614c521654c16bc3`; PR #23 HEAD `25ab11edeeb0af1f66dae8f32d4ae92f6bd43071`은 보존합니다.
- 새 Workspace에서 기존 Branch를 Clone했습니다. 이전 Work의 미Commit Source는 이 Workspace에 없으며 접근했다고 주장하지 않습니다. Recovery 때 Clone은 Clean이었습니다. 새 Local Screenshot / 검증 결과는 보존합니다.
- 누락됐던 `docs/release/*-v2.0.md` 4개가 HEAD에 모두 있습니다. `00183a8..3a0d2fd`는 이 문서 4개만 변경했으며 P1 Runtime은 같습니다.
- Local 재실행: P1 State / Model 93 PASS; P1 Browser 121 PASS (Chromium 134와 151 각각); MZM Bench 111 PASS; Studio State 56 PASS; Backup PASS; Syntax 80 files / Assembled Script PASS; Build / Canonical Parity PASS.
- P1 실행 HTML / Source Build SHA256은 `9e4be1bd32fe6a5b61f53b2357d923a20ffefd45e580aa238b4d73d4e560c487`로 같습니다.
- P1 CI 39083108067의 최초 Numeric-clear Browser Assertion 실패는 Local에서 재현되지 않았습니다. Source / Test를 수정하지 않고 실패 Job만 한 번 재실행해 **SUCCESS**를 확인했습니다. Flaky 가능성을 기록하며 원인이 확정됐다고 주장하지 않습니다.
- Production CI 39083108046의 Quick / GDS / Offline Studio Browser는 SUCCESS이며 4-Platform Matrix와 Release Artifact 완료 후 병합합니다.
- P1 Merge SHA / 최신 main / Main CI는 실제 병합 뒤 아래에 기록합니다.

### P1 Merge 완료 / P2 Checkpoint A

- PR #24를 사용자 승인에 따라 병합했습니다. P1 HEAD `3a0d2fd0b30b2006a9321db8c27a01cced31f6fc`, Merge / main HEAD **`0537a71a3f05670edc4887a2be21f0a7563f227c`**입니다.
- P0 CI 39083108099, P1 CI 39083108067, Production CI 39083108046 및 Push CI 39083104854는 모두 **SUCCESS**입니다. Production은 4 Platform Bot Gate와 Release Artifact까지 성공했습니다.
- Merge Tree의 Runtime / dist는 검증한 P1과 같습니다. main Push CI **39084136359**는 Branch 생성 시 IN PROGRESS였으며 최종 상태는 이후 기록합니다.
- P2 Branch `feature/v2-p2-mzm-workbench`는 이 검증된 main에서 생성했습니다. Local QA / 문서 변경은 Stash로 보관한 뒤 새 Branch에 그대로 복원했습니다. Source Reset / Force Push를 하지 않았습니다.
- `docs/V2_P2_MZM_WORKBENCH.md`에 Model Interface / UX / Domain / Test Plan을 확정했습니다. `AGENTS.md`에 기존 CLAUDE 규칙과 공통 GitHub Development Policy를 연결했습니다.
- Checkpoint A는 문서 / Reuse 조사만 포함합니다. Solver 계수 / 기존 Physics Source / P0 / P1 실행 파일은 변경하지 않았습니다.

### P2 Checkpoint B — Interaction Length

- Checkpoint A Source 저장: `cdfaafd60a0d9e7cfd6d8c0c026b610b24bd7660`입니다.
- 기존 Live PN / MZM Bench Adapter, Additive P2 Schema, Length Physical View / Vπ / Optical Loss / Comparison / Original / Discover / Engineer / Learn을 구현했습니다. 기존 Solver와 계수는 변경하지 않았습니다.
- Model / State 136 PASS (4 Platform의 Length / PN / Transfer / RF / Eye / Identity / Save 경계 포함), 새 HTML에서 P1 State 93 PASS입니다.
- Length Browser 179 PASS: 4 Viewport × Light/Dark × Discover/Engineer, 같은 Identity, Blank Input / Comparison / Original / Learn / Reference / Platform / Backup / Reload를 확인했습니다.
- 최초 1366×768 Engineer Sidebar Overflow를 확인해 설명을 Learn으로 옮기고 Control / Constraint 간격을 조정했습니다. 44px Input / Button을 유지합니다.
- 기존 Font가 P1 문자만 포함해 P2 한글 일부가 보이지 않는 문제를 발견했습니다. 같은 원본 TTF / SHA256과 기존 Font Builder로 P1+P2 Glyph를 확장했습니다. 별도 이미지나 Binary Blob 업로드를 반복하지 않았습니다.
- P2 Package: `2.0.0-alpha.2-p2`; 기존 P1 / beta.2 HTML과 P0는 보존합니다. Voltage / Eye Model은 같은 Adapter에 연결돼 있고 UI는 다음 Checkpoint에서 순차 공개합니다.

### P2 Checkpoint C — Voltage & Interference

- Checkpoint B Source `d128854607415671d2a3cf49f862e9d5c173b163`, Offline HTML `68c86ff2269c72f356ebb4771582409e42519b97`을 저장했습니다.
- Source / Font / HTML Tree를 대조했고 Build Script 실행 권한을 보존하는 Receipt `a35e5ce42a31ac11aa24ef73ae39d11a80e8f3e0`도 저장했습니다.
- Applied Electrode Differential Voltage / Phase / Main Transmission / Transfer Curve / Operating Point를 공개했습니다. 두 Arm의 Field Vector 크기는 같고 Phase가 달라지며 Power 변화는 Combiner 뒤에서 표시합니다.
- Length / Voltage Browser 341 PASS입니다. 4 Viewport / Light-Dark / Discover-Engineer와 동일 Length의 Voltage 변경 / 실제 Transfer / Power Conservation을 확인했습니다.
- Static PN Domain 위반은 N/A, Comparison Domain / EO Crossing 미지원은 숫자 차분으로 바꾸지 않습니다. Engineer Target은 현재 Model로 계산하고 PASS Token을 저장하지 않습니다.
- main Push CI 39084136359 SUCCESS를 확인했습니다. P2 main Merge는 하지 않습니다.

### P2 Checkpoint D — RF/EO & Dynamic Eye

- Checkpoint C Source `388130fbc470ce301aa8c1b21a236e86ebcdb2c2`입니다.
- 세 번째 Experiment를 공개했습니다. 같은 PN / MZM / Bench 설정의 Electrical S21 / EO / Driver 포함 EO와 256-symbol Dynamic Eye Trace를 표시합니다. Symbol Rate가 첫 Control이며 Engineer에서 Driver / Open-circuit Drive Vpp / Optical Phase Bias를 조정합니다.
- 152 Model / State PASS, 506 Browser PASS입니다. 새 HTML의 P1 State 93 / P1 Browser 121 / 기존 MZM Model 111도 통과했습니다.
- 실제 Full Backup / Restore / Undo의 P2 Input 일치, P1 Migration, Legacy Byte 보존, PN Geometry / Model Signature / Late Request 무효화, Quota Failure 안내를 검증했습니다.
- Eye Gap / Source Voltage / PN Domain을 구분하고 Unsupported / Folded Level을 N/A로 표시합니다. 112 GBd PAM4는 224 Gb/s raw이며 BER / FEC / Net 200G는 NOT VERIFIED입니다.
- P2 Summary에서 중단하며 P3로 자동 진행하지 않습니다. P1 CI도 이제 새 P2 Build를 검사하도록 명시했고 P2 전용 CI / Screenshot Artifact를 추가했습니다.
- 마지막 시각 검토에서 Plot Legend의 Font Family를 Embedded Korean Font로 통일하고 Upper / Lower Arm 이름을 추가했습니다. 최종 E에서 새 Bytes로 다시 검증합니다.

### P2 Checkpoint E — Local Freeze / Play Review Candidate

- Checkpoint D Source: `27f149302b06bd3f2d7710eb28f61266bdf1c12d`입니다.
- 최종 Model / State **154 PASS**, P2 Browser **511 PASS**입니다. 실제 Touch Event / Keyboard / Same Result Identity / Blank Numeric / Compare / Original / Reference / Optional Learn / Platform / Backup / Reload를 확인했습니다.
- P1 State 93 / Browser 121, Legacy Studio Browser 168 / MZM Browser 37, Studio State 56, MZM Model 111, Lab 440 + Si1310 / SiN1550 e2e / State, Backup / Restore / Undo, Syntax 85 files / Assembled Script를 통과했습니다. 변경하지 않은 Legacy 영역의 유효한 Pre-freeze 검증은 재사용하고 최종 CI에서도 최신 HTML로 다시 검사합니다.
- Blank Draft를 Mode 변경으로 되살리는 경로와 Bench의 Source Resistance Discrete Domain을 강화했습니다. Unsupported PN에서는 Phase Vector / Δn을 N/A로 표시합니다. 기존 Test 기준을 삭제 / 완화하지 않았습니다.
- Canonical HTML / dist/index.html / Source Build는 Byte 단위로 같으며 SHA256은 **`06ba8d5219598ac36949ac2c1be6a6033c07277b795396cc1947d7732858f99b`**입니다. 실행 파일은 `dist/spec-to-mask-v2.0.0-alpha.2-p2.html`입니다.
- P2 Source / Test / Documentation을 먼저 저장하고 이 검증 HTML을 별도 Artifact Commit으로 게시합니다. PNG는 Git Blob으로 올리지 않고 `v2-p2-mzm-evidence` Actions Artifact로 제공합니다.
- 이 Freeze 시점의 P2 GitHub CI는 **NOT VERIFIED / pending**입니다. 최종 Source / Artifact SHA, 실제 CI / Four-Platform / Release Artifact Run과 결과는 Draft PR의 최종 인수인계에 기록합니다. Source에 CI 성공을 미리 적지 않습니다.
- **P2 Play Review에서 중단합니다. P2 main 병합 / P3 시작은 하지 않습니다.**


## GitHub Publication Receipt — 같은 Runtime의 검증

- Draft PR: [#25](https://github.com/legendnever-collab/Spec-to-Mask/pull/25)입니다. P2는 main에 병합하지 않았습니다.
- Source Freeze: `16a03211d8d4c77e0925db90c1ba556a592dd2b6` / Playable Artifact Commit: `c2fea1adf32c74f953eb56e45a379e194373adf0`입니다.
- 이 Receipt는 Documentation / Evidence만 추가하며 Source / Test / HTML Bytes를 변경하지 않습니다.
- Artifact HEAD의 [P0 CI 39085439140](https://github.com/legendnever-collab/Spec-to-Mask/actions/runs/39085439140), [P1 CI 39085439141](https://github.com/legendnever-collab/Spec-to-Mask/actions/runs/39085439141), [P2 CI 39085439139](https://github.com/legendnever-collab/Spec-to-Mask/actions/runs/39085439139)는 **SUCCESS**입니다.
- [P2 Screenshot / Test Artifact](https://github.com/legendnever-collab/Spec-to-Mask/actions/runs/39085439139/artifacts/12121095268)는 실제로 생성됐습니다. 이름은 `v2-p2-mzm-evidence`이며 Artifact Digest는 `sha256:7b8e73d43555c556ee41050823e066343d89b0369abbf57ca1d1a4145a49411f`입니다.
- Production CI / Four-Platform Matrix / Release Artifact는 Receipt 작성 시 진행 중입니다. 최종 상태는 [PR #25 Checks](https://github.com/legendnever-collab/Spec-to-Mask/pull/25/checks)의 최신 HEAD와 최종 인수인계에서 확인합니다. 문서 저장으로 새 CI가 생성돼도 같은 Source / HTML의 완료된 Evidence를 잃지 않습니다.
- Local Release Packaging / Source ZIP 검사도 PASS입니다. P2의 main Merge나 P3 진행을 승인한 것은 아닙니다.

## P2.1 Checkpoint A — Audit / Plan

2026-10-18 · 사용자 P2.1 전체 A–E 작업 지시를 수신했습니다. Recovery HEAD `68d5c9b60f9967f6273c9637fce4bb480bae9e0e`와 기존 HTML SHA256 / 4개 CI SUCCESS를 확인했습니다. 새 Clone은 Clean입니다. V2_P21_LEARNING_REDESIGN / VISUAL_SYSTEM / ACCEPTANCE에 Curriculum / Model 지원 범위 / Typography / 검증 계약을 확정했습니다. P3 / main 병합은 진행하지 않습니다.

### P2.1 Checkpoint B — Overview / Typography

- Checkpoint A Remote Commit: `6cc1ff26b4d7531298106fb98045fdcc29499646`입니다.
- Laser cavity / Tx PIC 8 Lane / PN / Coupling / Fiber / PD와 연속 Port를 SVG로 구현했습니다. 주요 CTA는 하나이며 More에서 직접 MZM / Tutorial 재방문이 가능합니다.
- 공통 Typography Token / Charcoal Passive / Amber Active / Material·Focus 분리를 추가했습니다. 한글 Offline Font의 Glyph를 확장했습니다.
- 중간 Build에서 기존 P2 Model / State 154 및 Browser 511을 실제 통과했습니다. 기존 Browser Assertion은 모두 보존했고 MZM Entry만 More Navigation에 맞췄습니다.
- Playwright 기본 다운로드가 손상된 응답을 반환해 중단했고, 공식 Chrome for Testing Headless Shell 134를 사용했습니다. 이후 Screenshot / QA는 해당 Browser Version을 명시합니다. 향후 CI는 기존 Playwright Browser도 검사합니다.
- 중간 HTML은 Local `p21-checkpoint-b.html`로 보존하며 최종 Canonical은 E에서 게시합니다. 최종 Font 비교 / Passive / MZM 인과 Visualization은 이어서 진행합니다.

### P2.1 Checkpoint C — Passive Foundations

- Checkpoint B Remote: `d07f08242f6022347d949d25c15b520e8922364a`입니다.
- Tutorial → Roadmap 한 페이지 → Width / Mode → Splitter / Combiner → Path / Interference를 연결했습니다. More 재방문 / Skip / Resume를 제공합니다.
- 기존 KINDS.wg Table과 명시적 Ideal Unitary Coupler를 분리했습니다. Field / Power를 구분하고 Unsupported Field Profile을 수치 결과로 만들지 않았습니다. 자세한 가정은 V2_P21_PASSIVE_PHYSICS.md에 기록합니다.
- 새 Foundations Model / State 135 PASS입니다. 4 Platform Cutoff / Power Conservation / Phase / Migration / Original / Comparison / Backup / Restore / Undo / Legacy / Read-only Learn을 확인했습니다.
- 실제 4 Viewport × 2 Theme의 Passive / Roadmap / Intro Screenshot Matrix를 실행했습니다. 마지막 Contrast 계산에서 #fff 단축 Hex를 읽지 못한 Test Helper를 수정했습니다. 구현 색상이나 기존 기준은 완화하지 않았습니다. 완전한 최종 Browser 결과는 E에 기록합니다.
- 이전 P2 완료 기록을 유지하고 optional foundations Workspace를 추가했습니다. 새 Font는 실제 Light/Dark 비교와 Greek Glyph 검사를 통해 Pretendard OFL Subset / Rename으로 선택했습니다. Runtime 외부 Font 요청은 없습니다.
- 중간 HTML은 Source Build로 생성했으며 기존 alpha.1 / alpha.2 Artifact는 그대로 보존합니다. Intro / MZM 인과 표현을 D에서 마무리합니다.

### P2.1 Checkpoint D — MZM Causal Visualization

- Checkpoint C Remote: `74d0f4813bef6a25d3c721f664bdfdc2ea9e19d6`입니다.
- Passive MZI에 PN Active를 추가하고 Vdiff로 Phase를 바꾸는 Intro를 연결했습니다. 기존 P2 Design은 Intro에서 변경하지 않습니다.
- Length의 핵심 KPI를 Accumulated Voltage-induced Phase / Vπ로 재구성했습니다. Passive Charcoal / Active Amber, 실제 ηL에 비례한 Active 구간, Bias를 포함한 Total Phase Vector, π 기준 Phase Bar를 사용합니다. Optical Loss는 같은 조건의 Plot / 현재 Footnote / Before-Current Table에 연결합니다.
- Voltage의 Electrode Vdiff / Source Vpp 구분과 Eye의 Electrical → PN/MZM → Optical Eye 인과 설명을 연결했습니다. 기존 3개 Experiment / Model / 계수는 보존합니다.
- Quick Glossary는 Learn Physics 안에서 선택적으로 열며 Design / Progress를 변경하지 않습니다. 112 GBd = 224 Gb/s raw / BER-FEC 미검증을 유지합니다.
- 320px Screenshot을 확인하고 Diagram의 세로 비율을 조정해 Label을 확대했습니다. Passive Path Length의 Schematic에도 끊기지 않는 실제 단일 경로를 사용합니다.
- 기존 P2 Browser 511, Foundations Browser 383 / State 135를 수정 중간 Build에서 통과했습니다. E에서 최종 Source / Font / HTML의 같은 Bytes로 재검증합니다.

### P2.1 Checkpoint E — Local Freeze

- D Remote: `50da9cdf215f46a102844c3be5c24c54c199207d`입니다. 최종 Source / Test / Documentation을 먼저 저장하고 HTML은 별도 Commit으로 게시합니다.
- 최종 Canonical에서 P1 Model 93 / Browser 121, P2 Model 154 / Browser 511, P2.1 Model 135 / Browser 390, MZM Model 111 / Legacy MZM Browser 37, Legacy Studio Browser 168이 PASS입니다.
- Studio 56 / Lab 440 + e2e/state / Backup / Smoke / 4종 Engine Identity / Python GDS / Circuit / Syntax 90 Files + Assembled Script를 통과했습니다. 새 Browser는 Chromium 151.0.7922.34이며 초기 134의 Legacy 환경 종료를 이 결과로 대체합니다.
- 최종 실행 파일: `dist/spec-to-mask-v2.0.0-alpha.3-p2-ux.html`입니다. HTML SHA256은 `a2f21b11a9bac77ccc39626746d140bb648b3669e14161521ad29140ce6e247e`입니다. 상세 결과 / Source Manifest는 artifacts/v2-p21/에 기록합니다.
- 기존 P0 / P1 / P2 alpha.2 HTML과 Solver는 보존했습니다. P2 완료 기록을 Additive Migration으로 유지하며 Skip / Resume / Original / Comparison을 검사했습니다.
- Screenshot은 최종 Actions Artifact로 제공합니다. 같은 Binary의 반복 Base64 / Blob 생성은 하지 않습니다. Font Coverage 463 Glyph / 누락 0, 주요 Text AA Contrast를 확인했습니다.
- GitHub 최종 CI는 게시 후 실제 HEAD에서 확인합니다. User Play / External Physics Accuracy / BER / FEC / Net 200G는 NOT VERIFIED입니다. P3 / main 병합 없이 Play Review에서 중단합니다.

### P2.1 Publication / Recovery Receipt

- Source Freeze Remote: `f72f59408764029f3615ac2b0eb85405e166f345`입니다. Source / Test / Documentation을 먼저 Push했습니다.
- Playable Artifact Remote: `9c2f5b45cec4f606cada04fc3e06c3c1269178e8`입니다. Git Tree는 Local 검증 Tree `b39604b38f08aa176673a7969cd9462ee99cc853`과 정확히 같습니다. HTML Blob `2926820d4a3ee96539f7968b4613b1b0cfd953d3`은 한 번만 생성해 Canonical / index에 재사용했습니다.
- HTML / Source Manifest / QA Hash를 검증했습니다. Source Rebuild / Canonical / index가 같고 alpha.2 SHA256은 기존 `06ba8d52…`를 유지합니다.
- 이 Receipt와 v2.0 Handoff 문서 갱신은 Runtime / Test / HTML Bytes를 변경하지 않습니다. 실제 최종 Remote HEAD는 PR #25와 Git Ref에서 읽습니다.
- Artifact HEAD CI: Production 39090924995 / P2.1 39090925204 / P2 39090925015 / P1 39090924984 / P0 39090925032가 게시 후 실행됐습니다. 이 문서 작성 시 진행 중이며 최종 결과는 PR #25의 CI Receipt에 기록합니다. 새 문서 Commit의 CI도 별도로 확인합니다.
- 모든 구현 Checkpoint A–E를 저장했습니다. 사용자 Play Review에서 중단하며 Draft / main 병합 금지 / P3 미시작을 유지합니다.
- P2.1 / P2 / P0 CI는 Artifact HEAD에서 SUCCESS입니다. P1 CI의 첫 Browser 실행은 기존 `blank numeric input invalidates old result`에서 실패했으나 같은 Source / Test / HTML로 해당 Job만 한 번 재실행해 SUCCESS를 확인했습니다. Local 같은 Browser에서도 통과했습니다. 이전 P1 인수인계에도 같은 간헐 실패가 있어 Flaky 가능성을 기록하며 원인을 확정하거나 Test 기준을 완화하지 않았습니다.


## P2.1 Additional Feedback — Checkpoint A

Recovery ac33fbd / main 0537a71 / 5 CI SUCCESS를 확인했습니다. 기존 Source와 untracked Evidence는 보존했습니다. Learning Navigation 4개 / Workspace Settings / 접이식 Backup / Tutorial 하단 3개 선택 / 공통 Chapter Summary를 구현했습니다. Passive Resume가 Intro 방문 후에도 보존됩니다. 기존 Model-State 135 / 신규 Navigation-State 11 PASS입니다. 건너뛴 Tutorial은 observed로 승격하지 않습니다. 새 Canonical은 alpha.3-p21-learning이며 기존 alpha.3-p2-ux는 보존합니다. Terminal Push의 Credential 부재로 GitHub API의 Parent 유지·비강제 Ref Update를 사용합니다. B 구현 전 A를 저장합니다.

### Additional Feedback Checkpoint B — Passive Foundations

A Remote 7e42678190fde3d9b9c57e4fb93679260ba0c841를 저장한 후 진행했습니다. Width의 TE0 / TE1 Conceptual Profile과 실제 Table Cutoff, LAB.routeLoss Bend·Index 비교, Conceptual Y-branch Shape Comparison, 기존 DC / MMI Kernel을 연결했습니다. 1×2 Y-branch와 2×2 Unitary MZI의 Port를 구분했습니다. 새 Course State 41 / 기존 Foundation 135 / Browser 391 / 새 Passive Browser 130 PASS입니다. 4 Viewport × Light/Dark에서 Control과 KPI가 첫 화면에 있고, Source Identity / Offline HTTP 0을 확인했습니다. Mobile Mode Profile은 두 개를 가로 배치해 글자를 읽을 수 있게 수정했습니다. 기존 Alpha.3 Artifact는 보존합니다.

### Additional Feedback Checkpoint C — Active Foundations

B Remote 0ee63e99f7a90758ac5239331b1cea2653045acb를 저장한 후 진행했습니다. Passive MZI / PN / Single-arm·Push-pull / Transfer / Active Summary를 구현했습니다. 기존 PN Nonlinear Kernel을 직접 사용하고 같은 Differential Phase가 되도록 Push-pull Drive를 구했습니다. 신규 Active Model-State 107 / 기존 Foundation 135 / Navigation 11 / 기존 P2.1 Browser 391 / Passive·Active Browser 258 PASS입니다. 4 Viewport × Light/Dark에서 Control·KPI가 하단 고정 Navigation에 가리지 않음을 검사했습니다. 실제 Chirp / 2D Carrier·Optical Field / Voltage-dependent Arm Loss는 NOT VERIFIED입니다. Source / Test / Documentation을 먼저 저장하며 새 Canonical은 E에서 최종 게시합니다. C Source Checkpoint CI는 의도적으로 건너뛰고 최종 Source / HTML 일치 Commit에서 전체 CI를 수행합니다.

### Additional Feedback Checkpoint D — Modulation Formats

C Remote 388c07871fe4f274bdea21e536fd22624f69d8d9를 저장한 후 진행했습니다. NRZ / PAM4 / PAM8의 Same Baud / Same Raw / Level Gap / Conceptual RC·Noise Waveform·Eye를 구현하고 기존 RF/EO 앞에 연결했습니다. Format Model-State 49 / Format Browser 79 / 기존 P2 State 154 / P2 Browser 511 PASS입니다. 1366×768에서도 Next가 보이도록 배치를 검증했습니다. BER / FEC / Net Rate는 NOT VERIFIED입니다. 새 State와 Checkpoint Source / Test / Documentation을 먼저 저장합니다. E에서 최종 Font / HTML을 동결하고 전체 CI를 실행합니다.
