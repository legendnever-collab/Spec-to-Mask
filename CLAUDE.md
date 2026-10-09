# CLAUDE.md

## 프로젝트
SPEC-to-MASK Quest — Photonic IC 설계 학습 게임. 사용자는 광소자 전문가(Ph.D.)이므로 물리는 정확해야 하고, 단순화는 화면 하단 "모델 범위"와 README에 명시합니다. UI·코치 문구는 한국어.

## 작업 규칙
- 소스는 `src/`의 모듈 파일만 수정하고 `npm run build`로 `dist/index.html`을 다시 만듭니다. `dist/index.html`을 직접 고치지 않습니다.
- `src/data/tables.js`, `src/data/pspec.js`는 생성물입니다. JSON을 바꾼 뒤 `npm run tables`.
- 레벨 스펙(목표값·출발점·수율 목표)은 손으로 넣지 말고 `tools/calibrate.js`로 같은 엔진에서 계산합니다 (`node tools/calibrate.js <플랫폼|all> <1,2,3,4>` — Stage별 블록은 calibrate_s2/s3/s4.js(4 = 긴 지연선), 뒤 Stage는 앞 Stage의 ref를 부품으로 씁니다). Si 1310의 MMI 세 레벨만 검증된 수기 값을 유지합니다.
- 새 kind의 코치 문구는 숫자 목표를 tier ≥ 2에서만 보여줍니다. 코치가 제안하는 이동은 실제로 개선되는지 계산한 뒤에만 제안합니다.
- 변경 후 확인: `npm run test:smoke` (오류 0), 관련 레벨에 `node test/e2e/bot.js std 2 <ids> <platform>` — 봇이 표준 난이도·수치 힌트로 ★★ 이상에 도달해야 합니다.
- 진행 기록 localStorage 키는 `smq3-*`. 구조를 바꾸면 `shell.js`의 마이그레이션도 함께 갱신합니다.
- 페이지는 단일 파일, 외부 스크립트 없음, 폰트만 Google Fonts. 모바일 폭(≈400px)에서 동작해야 합니다.
