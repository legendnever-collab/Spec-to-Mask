# 1.6T MRR WDM8 송신 — 3W 레벨과 Design Lab WDM8 (Phase E)

DR8(3A+)의 링 ×8은 레인마다 자기 광섬유를 가져서 링끼리 파장을 나눌 필요가 없었습니다. WDM8은 **8개의 파장이 버스 하나를 지나며 링 8개를 모두 통과**하는 별도 송신 아키텍처입니다. DR8 모델에서 파장 숫자만 바꾼 것이 아니라, 공유 버스의 광학·공진 배정·열 결합·다파장 광원을 새로 모델링했습니다 (`src/kinds/wdm.js`).

```
다파장 광원(ELS) ─광섬유─▶ SSC ─▶ [Si 버스: 링0 링1 … 링7] ─▶ SSC ─광섬유 500 m─▶ Demux ─▶ PD ×8
 콤 또는 DFB×8+MUX          (Si는 버스 TPA)  링 k = 2-3R 설계 (반경만 3W에서)      Rx: IL·XT 가정
```

## 1. 무엇을 계산하나

| 항목 | 모델 | 분류 |
|---|---|---|
| 채널 격자 | 8채널, Δf = 200/400/800 GHz → Δλ = λ²Δf/c (플랫폼 λ 중심) | Analytical |
| 링 | 2-3R 엔진(카드 또는 기준 설계)을 3W에서 고른 반경 R로 다시 계산: 레이아웃 반경(공진 정렬), FSR = λ²/(n<sub>g</sub>·2πR), Q, OMA, 눈, 자기 가열, 히터 P<sub>2π</sub> | Physics-informed Surrogate |
| 버스 투과 | 채널 j의 세기 = Π<sub>k</sub> T<sub>k</sub>(λ<sub>j</sub>), T = 2-3R과 같은 all-pass Airy 식 — FSR마다 주기적이라 **FSR 별칭이 자동으로 포함** | Analytical |
| 변조 크로스토크 | ε<sub>j</sub> = Σ<sub>k≠j</sub> \|T<sub>k</sub>(λ<sub>j</sub>; 레벨 3) − T<sub>k</sub>(λ<sub>j</sub>; 레벨 0)\| / (자기 링의 같은 값), 페널티 −10log(1 − 3ε) (Rx Demux XT 합산). 이웃 채널 한쪽에서는 공진 이동과 접합 흡수 변화가 더해지고 다른 쪽에서는 상쇄됨 | Analytical |
| 링 입력 파워 | 광원 선 − 결합(1-6 SSC + 2-5) − (DFB) MUX − Si 버스 TPA(8채널 합 파워, 0.6·(P/100 mW)² dB) − 앞선 링들의 통과 손실 − 버스 전파(D-1 산란, 링 버스 폭) | Physics-informed Surrogate |
| 공진 배정·히터 | 가열 전 공진 = 설계 위치(같은 반경: λ₀ 근처, 계단 반경: λ<sub>k</sub> 근처, 1 nm 레이아웃 격자 잔차) − dλ/dT·(70 °C − T) + 다이 공정 이동 + 링 간 불일치; 필요 이동 = (목표 − 가열 전) mod FSR ≥ 0 (빨강 쪽만). 고정 배정 링 k → λ<sub>k</sub>, 순환 배정 링 k → λ<sub>(k+s) mod 8</sub>(온도마다 히터 합 최소인 s) | Analytical |
| 열 결합 | 링 j 이동 = η(P<sub>j</sub> + Σκ<sub>jk</sub>P<sub>k</sub>), κ(거리) = 2-1 히터 단면의 가로 온도 프로파일. 이웃이 목표를 넘겨 밀면 다음 차수로 넘어감(홉, +FSR) — Gauss–Seidel 풀이 | Physics-informed Surrogate (2D → 링에는 상한) |
| 광원 | 콤: 레이저 1개, 선 세기 포물선(가장자리 −2 dB), WPE 12 % + 0.5 W. DFB ×8 + MUX(ELS 안): MUX 2.5 dB, WPE 22 %·(1 − P/200 mW), TEC, 파장 잠금기 10 mW/개, **같은 총 광출력에서 채널 마진이 같아지도록 선마다 출력 조정** | Unverified Assumption |
| 링크·전력 | CPO 상수(3A+): FAU 1 dB, 전기 페널티·감도, 드라이버 = MZM 등급 − 부하 에너지 차, TIA, 락 2 mW/링 (Tx + Rx), Rx Demux 1.5 dB · XT −20/−25/−30 dB, Rx Demux 튜닝 전력 = Tx 히터와 같다고 가정, DC-DC 90 % | Unverified Assumption |
| Fab | 다이 공정 이동(2-3R 선형 감도), 링 간 불일치 σ 0.15 nm, 결합 ±0.4, 변조 ±0.3, 감도 ±0.3 dB, 선 세기 산포 | Physics-informed Surrogate |

## 2. 배우는 것 (기준 부품, `node test/t_wdm.js`에서 확인)

| 관찰 | 숫자 (si1310) | 이유 |
|---|---|---|
| 출발 설계(400 GHz, 2-3R 반경 6.1 µm)는 −6.9 dB | FSR 11.2 nm < 8Δλ 18.3 nm, 다음 차수가 λ₀ 옆 0.24 nm | **FSR 별칭**: 남의 링이 그 채널을 깎고 변조까지 섞음 |
| FSR < 8Δλ여도 되는 경우가 있음 | 800 GHz, R 5.55 µm: FSR 12.25 nm, 8Δλ = 36.6 nm ≈ 3·FSR | 다음 차수가 채널 **사이**에 놓이면(간격 ≫ 선폭) 별칭 없음 — 별칭 판정은 "가장 가까운 다른 링의 차수가 3 선폭·반 채널보다 가까운가" |
| 크로스토크는 간격에 따라 빠르게 감소 | 0.39 % → 0.08 % → 0.02 % (200/400/800 GHz) | 로렌츠 꼬리의 기울기 |
| 히터: 같은/고정 > 계단/고정 > 계단/순환 | 91 → 62 → 20 mW (Tx 8개, 0–70 °C 최악) | 순환 배정은 공통 이동(온도 ≈ 4.5 nm, 공정 수 nm)을 채널 간격 단위로 흡수 — **8·Δλ가 FSR의 정수배일 때** 각 링은 Δλ 이하만 밂 |
| 고정 배정은 차가울 때 비쌈 | 0 °C 62 mW vs 70 °C 6 mW | 링이 최고 온도에서 레이저 조금 파랑에 놓이도록 설계 → 차가우면 dλ/dT·70 K만큼 더 밀어야 함 |
| 콤의 가장자리 채널이 최악 | 중앙 − 가장자리 ≈ 2 dB | 선 세기 기울기 — DFB는 맞출 수 있지만 레이저·TEC·MUX만큼 전력 |
| Si 버스 TPA | 8 → 14 dBm/선: 0.06 → 0.93 dB | 8채널이 한 버스에 실림 (SiN 버스는 없음) |

캘리브레이션(`node tools/calibrate.js <플랫폼> 3`, `tools/calibrate_s3.js`의 3W 블록 — 다른 레벨 스펙은 그대로):

| 플랫폼 | ★ (마진 ≥ 0, 전력 ≤) | ★★ (마진 · 전력 · Tx 튜닝) | 기준 설계 | Fab 목표 |
|---|---|---|---|---|
| si1310 | 5.65 W | ≥ 0.5 dB · ≤ 5.1 W · ≤ 29 mW | 800 GHz · R 5.55 · 계단 · 순환 · 콤 · 14.5 dBm | 65 % |
| si1550 | 6.6 W | ≥ 0 dB · ≤ 5.5 W · ≤ 36 mW | 200 GHz · R 7.1 · 계단 · 순환 · 콤 · 15 dBm | 30 % |
| sin1310 | 5.7 W | ≥ 1.0 dB · ≤ 5.1 W · ≤ 33 mW | 800 GHz · R 5.45 · 계단 · 순환 · 콤 · 14.5 dBm | 70 % |
| sin1550 | 6.15 W | ≥ 1.0 dB · ≤ 5.5 W · ≤ 40 mW | 200 GHz · R 7.05 · 계단 · 순환 · 콤 · 15 dBm | 70 % |

★은 계단 반경·순환 배정 없이도(같은 반경·고정 배정으로) 닿는 전력의 1.2배, ★★는 콤 광원으로 닿는 마진과 그 마진의 최소 전력 + 4 %, 그리고 Tx 튜닝 전력 ≤ 가능한 최솟값의 1.5배 — 계단 반경 + 순환 배정 + 8Δλ ≈ m·FSR이 필요합니다. 봇(표준 난이도·수치 힌트)은 si1310에서 200 GHz · R 7.5 µm(FSR ≈ 8Δλ) · 계단 · 순환으로 ★★★에 도달했습니다.

**DR8과 비교 (같은 부품, CPO, 기준 설계)**: si1310 WDM8 5.05 W · 3.16 pJ/bit (마진 1.1 dB) vs MRR DR8 4.50 W · 2.81 pJ/bit (마진 3.7 dB). 이 게임의 가정에서는 WDM8이 전력으로 이기지 않습니다 — 콤 광원 WPE(12 %)가 DFB(22 %)보다 낮고 Rx Demux 손실·Rx 튜닝이 더해지기 때문입니다. WDM8의 이득은 광섬유·FAU·커넥터가 1/8로 줄어드는 것입니다(3W 화면의 비교 표).

## 3. Design Lab WDM8

Mission 1의 송신 아키텍처에서 **WDM8 · 공유 버스 링 ×8 (3W)** 를 고르면 3W 설계(카드 → 현재 설계 → 기준 설계 순)로 레이아웃을 만듭니다.

| 요소 | 형상 |
|---|---|
| 광 | IN0 SSC → 배선 → `mrr_wdm` 인스턴스(Si 버스 + 링 셀 8개, 간격 p, w₀ ↔ 버스 전이는 버스 **양 끝에만** — SiN 플랫폼은 SiN/Si 공동 테이퍼 한 쌍) → 배선 → OUT0 SSC (출력 1개). 출력 탭은 기본 없음(8개 링을 잠그려면 링마다 모니터가 필요 — 그리지 않음, NOT VERIFIED) |
| 링 | 링 k = 2-3R `ring_allpass`, 반경 R<sub>k</sub> = 3W의 계단 반경(1 nm 격자) — 반경이 다르면 GDS 셀도 다름 |
| 전기 | 플립칩만: S 범프는 북쪽 2열, G 범프는 남쪽 2열(링을 번갈아), 히터 16선은 남쪽 범프 한 줄로 평면 팬아웃(M2, dcPlan) — 링 간격 2R + 20 µm까지 45 µm 범프 피치에 들어감 |
| 검사 | 채널 수 = 8 (출력까지 이어진 버스의 링), 입·출력 1/1, 링 간격 ≥ 링 셀, FSR 별칭·크로스토크·공진 배정(3W 엔진, Lab 링 간격으로 재계산), RF·DC 금속–버스 교차(WARNING), 링 구동선 λ/10, 파워 버짓(3W 마진 − 레이아웃 배선 손실) |

GDS: `python -m smq2gds.circuit <플랫폼>_engine_layout.json` — `smq_mrrwdm_*` 셀(링 셀 + 버스 필러 + 끝 전이). 재검사는 링 수를 버스 안의 링까지 세고(코어 조각 = 레이저 1 + 링 8 + 탭), 출력 단면 1개, 경로 1개를 확인합니다. 예제: `tools/smq2gds/examples/circuit/*_mrr_wdm8_*`, `docs/gds/*_mrr_wdm8/`.

예제 결과(`node tools/export_circuit.js all`): 다이 0.9 × 0.5 mm, 범프 32개, 4 플랫폼 모두 검사 FAIL 0. si1550 WDM8은 3W 기준 설계의 마진이 0.14 dB라 레이아웃 배선 손실을 빼면 0.09 dB — 가장 빡빡한 플랫폼입니다(버스 TPA + 콤 기울기). 출력 탭(2 %, 0.09 dB)을 켜면 이 플랫폼은 파워 버짓 FAIL입니다.

## 4. 테스트

| 명령 | 내용 |
|---|---|
| `npm run test:wdm` (`test/t_wdm.js`, 80) | 다른 레벨 스펙 불변 · FSR 식 · 별칭 비용 · 크로스토크 vs 간격 · 인접/먼 링 통과 손실 · 같은/계단/순환 히터 순서 · 순환 상한 (Δλ + \|8Δλ − m·FSR\|)/η · 차가운 코너 · 열 결합 풀이(정확·홉) · 콤 기울기 · DFB 등화(같은 총 광출력) · TPA · 계단 반경 1 nm 격자 · 기준 설계 ★★ · 출발 설계 ★ 미달 · Fab 수율 |
| `node test/t_lab.js` | WDM8 4 플랫폼: 1 → 링 8 → 1, 미션 1–5, 링 반경·간격 = 3W, 버스 연속(전이·필러·링 셀), 시스템 마진 = 3W − 레이아웃, 범프·RF·DC 평면, 링 간격 위반 FAIL, 내보내기 |
| `node test/e2e/lab.js` | 화면에서 WDM8 전환 → 전기·검증·내보내기 → DR8 복귀 |
| `python ../test/py/test_circuit.py` | WDM8 예제 4개 GDS 재검사 FAIL 0, 링 셀 = 서로 다른 반경 수, 링 위치 = 내보낸 위치, 출력 1, 부정: 링 셀 3 µm 이동 → 연결 FAIL |
| `node test/e2e/bot.js std 2 3W <플랫폼>` | 4 플랫폼 ★★★ (si1310 · si1550 · sin1310 · sin1550) |

## 5. 한계

- 링 락은 "온도마다 최적 배정을 고른다"는 정적 가정입니다. 재락 중 링크 중단, 배정 탐색 알고리즘(Choi 2024의 정책·실패 모드), 락 루프 상호작용은 계산하지 않습니다(NOT VERIFIED). 임의 배정(Lock-to-Any, 크로스바)은 넣지 않았습니다.
- 열 결합은 2-1의 2D 단면(긴 히터) 프로파일 — 점 열원인 링에는 과대(상한)이고, 먼 거리에서 ~1–2 %의 2D 바닥값이 남습니다. 3D 열해석이 필요합니다.
- 링 열 효율은 2-3R과 같은 2D 단면 × 둘레라 낙관적입니다(3A+ 문서의 문헌 비교) — 튜닝 전력의 절대값은 작게 나옵니다. 비교(같은/계단, 고정/순환)는 같은 모델 안에서의 상대값입니다.
- 링 간 불일치 σ 0.15 nm, 콤 기울기·WPE, DFB+MUX 손실, Rx Demux IL/XT와 Rx 튜닝 전력 = Tx는 대표값 가정입니다.
- 링의 비선형(자기 가열·TPA)은 채널마다 자기 입력 파워로 계산하지만, 다른 채널이 링에 주는 흡수 가열은 넣지 않았습니다. 눈 페널티는 채널 평균 파워 하나에서 계산합니다.
- 역반사·링 간 결맞음(버스 위 반사), 편광, 버스의 분산은 없습니다.
- Lab WDM8은 링별 모니터 PD(드롭 포트)를 그리지 않고, 전기는 플립칩만, 다파장 광원은 칩 밖입니다.

## 참고

- A. V. Krishnamoorthy et al., "Exploiting CMOS Manufacturing to Reduce Tuning Requirements for Resonant Optical Devices," IEEE Photonics Journal 3(3), 567–579 (2011) — 가까운 링끼리의 간격·FSR은 잘 맞고 절대 위치는 안 맞음 → 200 GHz 격자에 채널당 평균 < 1.2 nm 튜닝.
- S. Choi, V. Stojanović, "Scalable Wavelength Arbitration for Microring-based DWDM Transceivers," arXiv:2411.14810 (2024) — Lock-to-Deterministic / Cyclic(배럴 시프트) / Any.
- K. Padmaraju, K. Bergman, "Resolving the thermal challenges for silicon microring resonator devices," Nanophotonics 3(4–5), 269–281 (2014).
- C. Sun et al., "Single-chip microprocessor that communicates directly using light," Nature 528, 534–538 (2015).
- CW-WDM MSA (cw-wdm.org) — O-band 8/16/32파장 연속광 광원 규격.
- W. Bogaerts et al., "Silicon microring resonators," Laser & Photonics Reviews 6(1), 47–73 (2012).
