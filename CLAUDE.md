# CLAUDE.md

## 프로젝트
SPEC-to-MASK Quest — Photonic IC 설계 학습 게임. 사용자는 광소자 전문가(Ph.D.)이므로 물리는 정확해야 하고, 단순화는 화면 하단 "모델 범위"와 README에 명시합니다. UI·코치 문구는 한국어.

## 작업 규칙
- 소스는 `src/`의 모듈 파일만 수정하고 `npm run build`로 `dist/index.html`을 다시 만듭니다. `dist/index.html`을 직접 고치지 않습니다.
- `src/data/tables.js`, `src/data/pspec.js`는 생성물입니다. JSON을 바꾼 뒤 `npm run tables`.
- 레벨 스펙(목표값·출발점·수율 목표)은 손으로 넣지 말고 `tools/calibrate.js`로 같은 엔진에서 계산합니다 (`node tools/calibrate.js <플랫폼|all> <1,2,3,4,5>` — Stage별 블록은 calibrate_s2/s3/s4/s5.js(4 = 긴 지연선, 5 = Track B LiDAR), 뒤 Stage는 앞 Stage의 ref를 부품으로 씁니다). Si 1310의 MMI 세 레벨만 검증된 수기 값을 유지합니다.
- 새 kind의 코치 문구는 숫자 목표를 tier ≥ 2에서만 보여줍니다. 코치가 제안하는 이동은 실제로 개선되는지 계산한 뒤에만 제안합니다.
- 변경 후 확인: `npm run test:smoke` (오류 0), 관련 레벨에 `node test/e2e/bot.js std 2 <ids> <platform>` — 봇이 표준 난이도·수치 힌트로 ★★ 이상에 도달해야 합니다.
- 진행 기록 localStorage 키는 `smq3-*`. 구조를 바꾸면 `shell.js`의 마이그레이션도 함께 갱신합니다.
- 설계 내보내기 형식은 `smq-design/1` (shell.js `designJSON`, kind의 `exportGeom`). 필드를 바꾸면 `tools/smq2gds`와 `test/e2e/export.js`도 함께 고치고, calibrate 뒤에는 `node test/e2e/export.js all`로 예제를 다시 만든 다음 `npm run test:py`.
- `src/data/validation.json`은 `python -m smq2gds.validate`(tools/에서) 생성물입니다. 손으로 고치지 않습니다.
- Guided 단계(`kind.steps`)와 연습 모드(`kind.practice`)는 별·카드·AI·Tape-out을 주지 않습니다. 단계 완료(`done`)는 반드시 엔진 계산 결과로 판정하고, 단계에서 고친 값은 `putV`로 실제 레벨 설계에 기록합니다(1단계 MZI 연습값 `mL/mP`만 단계 로컬).
- 학습 가이드(`src/guide.js`)의 C 표는 현재 `params()` 목록에서 만들므로, 파라미터를 추가하면 `GK[kind].P`에 설명 행도 추가합니다(`node test/e2e/guide.js <플랫폼>`이 빠진 행을 잡습니다). 가이드는 설계·점수를 바꾸지 않으며 미션 정답 값을 보여 주지 않습니다.
- D-1 원형 나선(lay 0)은 main과 결과가 같아야 합니다(`node test/t_upgrade.js`). 직사각형 나선의 형상을 바꾸면 `exportRect`, `tools/smq2gds/pcells.py`의 `spiral_rect`, `test/py/test_smq2gds.py`의 `check_rect`를 함께 고칩니다.
- 2-3R 링(`src/kinds/mrr.js`): Q만으로 대역폭을 정하지 않습니다(CMT × RC). 점수용 OMA는 정착 레벨(정적), 동적 OMA는 따로 표시. SiN 플랫폼에 Si PN을 직접 적용하지 않습니다(이종 Si 가정 명시). 내보내기 `R_um`은 레이아웃 반경(= GDS 반경)이며 형상을 바꾸면 `pcells.py`의 `ring_allpass`와 `test_smq2gds.py`의 `check_ring`을 함께 고칩니다. 엔진 변경 뒤 `npm run test:mrr`, `node tools/calibrate.js all 2`(2-3R 외 스펙 불변 확인).
- 3A+ 변조기 선택(`xcvr.js`, `mod`): MZM 경로(mod 0 / 키 없음)는 fa9f16a와 비트 동일해야 합니다(`npm run test:dr8`). 3A/3A+ 스펙은 MZM 조합으로만 보정하고 MRR은 보고만 합니다. 2×FR4에 링을 넣지 않습니다(WDM 링 Tx는 별도 아키텍처). DFB 드리프트·파장 산포·락 전력·드라이버 차는 가정이므로 화면에 Unverified Assumption으로 표시합니다.
- PIC Design Lab(`src/lab/engine.js` 순수 엔진, `src/lab/ui.js` 화면): 별·카드·레벨 설계를 쓰지 않습니다(상태는 `smq3-lab`). 배선 형상은 기본 도형(L/C/A)으로만 만들고 내보내기와 미리보기가 같은 도형을 씁니다. 검사하지 않은 항목은 NOT VERIFIED이지 PASS가 아닙니다. 형식(`smq-circuit/1`)을 바꾸면 docs/circuit_schema.md, `tools/export_circuit.js`, smq2gds를 함께 고치고 `npm run test:lab`.
- 페이지는 단일 파일, 외부 스크립트 없음, 폰트만 Google Fonts. 모바일 폭(≈400px)에서 동작해야 합니다.
