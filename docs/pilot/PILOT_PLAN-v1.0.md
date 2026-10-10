# SPEC-to-MASK v1.0 — 팀 파일럿 계획 · 평가 기준

**상태: 미실시 (NOT RUN).** 자동 시험 통과는 교육 효과의 증거가 아닙니다. 아래 파일럿을 실제로 진행하기 전까지 교육 효과는 검증되지 않은 것으로 둡니다. 결과를 PASS로 미리 적지 않습니다.

## 1. 참가자 (권장 ≥ 6명, 서로 다른 배경)
| ID | 직무 | 목적 |
|---|---|---|
| P01–P02 | PIC 설계 | 물리·용어의 정확성, Design Lab 흐름 |
| P03 | Optical Packaging | CPO·DR8·WDM8 비교, 열 가정 |
| P04 | Optical System | 링크 버짓, 속도 정의, 수율 해석 |
| P05 | Electronic / RF | 전기 인터페이스·RF 추상화가 오해를 부르지 않는지 |
| P06 | 신규 연구원 | 처음 안내·학습 경로 A의 이해도 |

## 2. 진행
- 1인 60–75분, 관찰자 1명(개입 최소화), 화면·발화 기록(동의 후).
- 시작 전: 배경 설문(직무·경력·광소자 경험 1–5).
- 과제마다: 완료 여부, 시간, 도움 수준, 사용자 오류, **오해**(아래 정의), 쉬움(1–5).
- 종료 후: 자유 의견 + 오해 사례 재확인 인터뷰 5분.

## 3. 과제 (`pilot_results_template.csv`의 task_id)
| ID | 과제 | 완료 기준 | 관찰할 오해 |
|---|---|---|---|
| T1 | 1-1 또는 1-7에서 파라미터 하나를 바꾸고 결과 변화를 말로 설명 | "바꾼 것 → 결과" 상자를 근거로 인과를 설명 | 상관을 인과로, 표시 자릿수 이하 변화를 의미 있게 해석 |
| T2 | 2-3R 비교 패널로 MZM vs MRR trade-off 설명 | 대역(Q × 디튜닝 × RC), 열 제어 비용, 크기·구동 에너지를 언급 | "Q가 낮으면 무조건 빠르다", "MRR이 항상 저전력" |
| T3 | 3W 비교 패널로 DR8 vs WDM8 비교 | 광섬유 수 ↔ 공진 배정·크로스토크·FSR 별칭·락의 trade-off | WDM8 결과를 동적 락까지 검증된 것으로 이해 |
| T4 | 3A+ 열 민감도에서 MRR 열 가정의 영향 확인 | Nominal/Conservative/Experimental ref. 차이와 "이 링의 측정값이 아님"을 설명 | Experimental ref.를 이 설계의 측정값으로 오해 |
| T5 | Design Lab에서 의도적으로 FAIL 만들기 (예: 다이 축소) | FAIL 행 → 위치 보기로 원인 확인 | "이전 완료 ✓"를 현재 유효로 오해 |
| T6 | 원인 수정 후 검증 다시 실행 | Mission 5 완료, Design Valid ✓ | Geometry Rechecked를 Tape-out 준비로 오해 |
| T7 | 전체 백업 → 다른 브라우저(또는 시크릿 창)에서 복원 | 별·카드·Lab 상태가 같음 | 설계 내보내기(smq-design/1)를 백업으로 오해 |

## 4. 측정과 판정
| 지표 | 정의 | 목표 (파일럿 1차) |
|---|---|---|
| Task Completion | 완료(Y)/부분/실패 | 과제별 ≥ 5/6명 Y |
| Assistance Required | none / hint / explained / took_over | took_over 0, explained ≤ 1명/과제 |
| User Error | 의도와 다른 조작 수 | 기록만 (UI 개선 근거) |
| Misinterpretation | **critical**: 물리·검증 범위를 잘못 이해해 잘못된 공학 결론에 이름 (예: Geometry Rechecked = Tape-out 가능) / minor: 용어 혼동, 스스로 바로잡음 | **critical 0** |
| Time to Understand | 과제 시작 → 올바른 설명까지 | 기록만 |
| Overall Ease of Use | 1–5 | 중앙값 ≥ 4 |

**critical 오해가 1건이라도 나오면** 해당 화면 문구·가이드를 고치고, 고친 뒤 그 과제만 다른 참가자 2명으로 다시 확인합니다.

## 5. 결과 기록
- 원자료: `pilot_results_template.csv`를 복사해 `pilot_results_<날짜>.csv`로 채웁니다.
- 요약: 과제별 완료율·도움 수준 분포·critical/minor 오해 목록과 조치 → `PILOT_REPORT-v1.0.md` (파일럿 후 작성).
