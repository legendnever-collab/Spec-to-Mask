# SPEC-to-MASK 개발 규칙

기존 Physics / Save / Level 규칙은 `CLAUDE.md`를 함께 읽습니다. 사용자 지시가 문서보다 우선합니다.

## P3.1 Rendering Fix + P3.2 현재 실행 범위 — 2026-10-20 KST

사용자는 P3.1을 플레이했고 Rendering 깜빡임 수정 후 P3.2 Scalar Optical Power / OMA Ledger 구현·검증·Offline HTML·기존 PR #26 갱신을 승인했습니다. Checkpoint A를 먼저 저장합니다. Model Contract C01–C07과 기존 Solver를 재사용하며 P3.0 재설계는 하지 않습니다. P3.2 Play Review에서 중단합니다. P3.3 / main Merge / P4는 승인되지 않았습니다. 아래 승인은 과거 기록입니다.

## P3.1 현재 실행 범위 — 2026-10-20 KST

사용자가 P3.1 Single Lane Assembly 구현 / C01–C05 검증 / Playable HTML / QA / 기존 PR #26 갱신을 승인했습니다. P3.0 문서를 다시 설계하지 않고 `docs/V2_P3_NEXT_TASK.md` / Model Contract를 구현합니다. 사용자 Play Review에서 중단하며 P3.2 / main Merge / P4는 진행하지 않습니다. 아래 P3.0 승인은 당시 기록입니다.

## 최신 승인 상태 — 2026-10-20 KST

P2.2는 사용자 승인 후 PR #25 / `c98998c7d7586716a34cd8386180b6b76580a2c3`로 main에 병합됐습니다. 이번 승인은 `feature/v2-p3-200g-lane`의 **P3.0 Architecture Audit / Model Contract / 계획 문서 / Draft PR만**입니다. 정본은 `docs/V2_P3_ARCHITECTURE.md`, `docs/V2_P3_MODEL_CONTRACT.md`, `docs/V2_P3_CHECKPOINT_PLAN.md`, `docs/V2_P3_NEXT_TASK.md`와 Checkpoint Log의 최신 Receipt입니다. 아래 과거 P2 미병합 / P3 미승인 기록은 당시 범위이며 이 최신 승인 상태가 우선합니다. P3.1–P3.4 구현 / P3 main 병합 / P4 시작은 승인되지 않았습니다.

## Recovery와 Checkpoint

- 작업 시작 시 Remote HEAD, PR/CI, Local Status, 미Commit 변경, 기존 Artifact와 마지막 성공 Checkpoint를 확인합니다.
- 기존 Source와 미Commit 변경은 보존합니다. Reset / Force Push / 재개발로 이전 작업을 제거하지 않습니다.
- 현재 사용자 승인 범위만 구현합니다. P1은 사용자 Play/Merge 승인이 있으며, P2 / P2.1 / P2.2는 별도 Branch/Draft PR #25에서 Play Review까지 진행합니다. P2.1 정본은 docs/V2_P21_ADDITIONAL_FEEDBACK.md / LEARNING_REDESIGN / VISUAL_SYSTEM / ACCEPTANCE / ACTIVE_PHYSICS / MODULATION_FORMATS입니다. P2 main 병합과 P3 시작은 승인되지 않았습니다.
- `docs/V2_MASTER_PLAN.md`, `docs/V2_CHECKPOINT_LOG.md`, `docs/V2_LANGUAGE_POLICY.md`, 현재 Work Order를 정본으로 사용합니다.
- Technical Term / Parameter / Unit / Equation은 English, 설명과 서술어는 한글로 작성합니다.

## 재사용과 검증

- `src/`를 수정하고 Build로 HTML을 생성합니다. 생성 HTML만 직접 고치지 않습니다.
- 기존 Solver / 계수 / Regression 기준은 검증 없이 변경하지 않습니다. 새 View는 기존 Model을 호출하는 Adapter로 구성합니다.
- DesignState → Solver → Result Identity → Physical View / Plot / KPI가 일치해야 합니다. Input 변경 즉시 현재 결과/검증을 무효화하며, 이전 결과를 새 Revision의 PASS로 쓰지 않습니다.
- Model Unsupported는 N/A / NOT VERIFIED로 표시합니다. Raw Eye Gap을 BER / FEC / Net Rate / Foundry 검증으로 승격하지 않습니다.
- Learn Physics는 Design / Progress를 바꾸지 않습니다. Reference Preview는 완료 증거가 아니며 Apply 후 재계산합니다.
- 기존 테스트를 삭제하거나 약화해 통과시키지 않습니다. 성공한 검증은 Source / Build / 환경이 유효하면 재사용하고 실패 원인만 최소 수정합니다.
- PASS / FAIL / NOT VERIFIED와 사람의 Play Acceptance를 분리해 기록합니다.

## 공통 GitHub Development Policy

다른 Repository에서도 아래 운영 규칙을 재사용할 수 있습니다.

1. Source / Test / Documentation을 먼저 Commit·Push합니다. Binary 때문에 Source 저장을 미루지 않습니다.
2. Screenshot / PNG / Source ZIP 등의 Binary는 우선 GitHub Actions Artifact로 제공합니다.
3. 같은 Binary의 Base64 Encoding / Git Blob 생성 / 업로드를 반복하지 않습니다. File Hash / 기존 Blob SHA / Remote 존재 여부를 먼저 확인합니다.
4. 같은 업로드가 두 번 실패하면 원인을 확인하고 Actions Artifact 등 다른 경로를 사용합니다. Binary 실패 중에도 Source 저장과 CI는 계속합니다.
5. 도구가 멈추면 마지막 출력 / 실행 Process / 원인을 확인합니다. 동일 명령의 무한 반복과 무기한 대기를 피하고 완료한 변경부터 Checkpoint로 보존합니다.
6. Terminal Push에 Credential이 없으면 연결된 GitHub API로 Text Tree / Commit / Ref를 게시할 수 있습니다. 기존 Parent를 유지하고 예상 HEAD를 확인하며 Force Push를 하지 않습니다.
7. 최종 Report에 Source SHA, 실행 HTML SHA256 / Parity, CI Evidence, 미검증 항목과 중단 지점을 남깁니다.

## P2.2 정본

`docs/V2_P22_SCIENTIFIC_SPECIFICATION.md`, `docs/V2_P22_MATERIAL_DOMAIN_MATRIX.md`, `docs/V2_P22_MODE_PROVENANCE.md`, `artifacts/v2-p22/QA.md`를 따릅니다. Numerical provenance와 Unsupported를 보존하고 기존 Regression을 완화하지 않습니다. `tools/build.sh`는 temporary output 검증 후 atomic rename으로 실행 HTML을 게시합니다. Browser Test는 immutable canonical을 사용하며 Build와 같은 파일을 동시 읽지 않습니다.
