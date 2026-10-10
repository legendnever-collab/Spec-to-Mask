# 2-3R Microring Modulator — 물리 모델 문서

`src/kinds/mrr.js` · 레벨 `2-3R` · Stage 2 (2-3 TW-MZM 다음). 이 문서는 게임이 계산하는 식, 각 식의 근거와 적용 범위, 그리고 문헌 측정값과의 비교를 정리합니다. 모든 수치는 학습용 모델이며, 최종 검증은 게임 밖 솔버(모드 솔버·FDTD·TCAD·3D 열해석)로 넘기는 것을 전제로 합니다.

## 1. 구조와 가정

| 항목 | 값 / 가정 | 근거 등급 |
|---|---|---|
| 링 형태 | All-pass (버스 하나), 원형 | Analytical |
| 단면 | Si 리브 220 nm / 슬랩 90 nm, 폭 0.45 µm (1310) · 0.50 µm (1550) — 2-2 위상기와 같은 리브 | Physics-informed Surrogate |
| SiN 플랫폼 | Si 활성층 이종 집적 가정, Si 리브 링으로 계산 (SiN에 PN 모델 적용하지 않음) | Unverified Assumption |
| 접합 | 2-2 PN 위상기 모델(카드 또는 기준 설계), 둘레의 η = 75% (나머지는 결합 영역), 도핑 증가 손잡이 0–0.8 decade | Calibrated (Soref–Bennett) |
| 히터 | 2-1 히터 단면(h, 격리)의 Si 적층 열해석 테이블, 둘레의 85% | Physics-informed Surrogate |
| 입력 광 | 13 dBm (2-3 MZM과 동일), 외부 광원(ELS) 파장 고정 | Unverified Assumption |
| 구동 | 112 GBd PAM4 (224 Gb/s 라인 속도), 드라이버 2차 70 GHz, 소스 50 Ω | Unverified Assumption |
| 온도 범위 | 0–70 °C (3A의 모듈 케이스 코너와 같음) | Unverified Assumption |

## 2. 식

### 2.1 공진과 FSR
- 공진 조건 m·λ = n<sub>eff</sub>(λ)·L, L = 2πR. n(λ) ≈ n₀ + δn + (n₀ − n<sub>g</sub>)(λ − λ₀)/λ₀ 로 선형화하면 λ<sub>m</sub> = L(n<sub>g</sub> + δn)/(m − L(n₀ − n<sub>g</sub>)/λ₀).
- FSR = λ²/(n<sub>g</sub>L).
- **레이아웃 반경**: 플레이어의 반경 슬라이더 값에서 차수 m = round(L·(n₀+δn)/λ)을 정하고, 최고 온도(70 °C)에서 히터 없이(자기 가열 포함) 레벨 0 공진이 동작점보다 Δλ<sub>b</sub>만큼 파랑 쪽에 오도록 L = mλ/(n<sub>g</sub> + δn + (n₀ − n<sub>g</sub>)λ/λ₀) 를 풀고 1 nm 격자로 반올림합니다. 이 반경이 화면·카드·`exportGeom`(→ GDS)에 같은 값으로 나갑니다. 반올림 잔차(≤ 약 0.1 nm)는 공진 오프셋으로 그대로 계산에 남습니다.

### 2.2 투과와 Q (Bogaerts et al. 2012)
- T = (a² − 2at·cosφ + t²)/(1 − 2at·cosφ + a²t²), φ = 2π(λ<sub>r</sub> − λ)/FSR (공진 근처).
- 필드 자기결합 t = √(1 − κ²) (무손실 결합기), 한 바퀴 필드 투과 a = 10<sup>−αL/20</sup>.
- Q<sub>i</sub> = πn<sub>g</sub>L√a/(λ(1−a)), Q<sub>c</sub> = πn<sub>g</sub>L√t/(λ(1−t)), Q<sub>L</sub> = πn<sub>g</sub>L√(at)/(λ(1−at)).
- 결합: 결합 슬랩 κ(d) = κ₀·e<sup>−γd</sup> (Marcuse, EIM 측면 슬랩)을 휘어진 간격 d(z) = g + z²/2R 위에서 적분 → κ<sub>f</sub> = sin(κ₀e<sup>−γg</sup>√(2πR/γ)).
- 손실 α (dB/mm) = η(α<sub>FCA</sub>(V) + 0.15) + (1−η)·0.15 + α<sub>bend</sub>(R) + 0.85·α<sub>heater metal</sub> + α<sub>TPA</sub>.
  - α<sub>FCA</sub>(V): 2-2 모델 (Soref–Bennett 흡수, 공핍 근사).
  - α<sub>bend</sub>: Marcuse 슬랩 방사 (리브 코어 vs 90 nm 슬랩).
  - α<sub>TPA</sub> = β·P<sub>circ</sub>/A<sub>eff</sub>, β ≈ 0.9 / 0.8 cm/GW (1310 / 1550), A<sub>eff</sub> 0.13 / 0.16 µm², 순환 전력 P<sub>circ</sub> = P<sub>in</sub>·κ²/(1 − 2at·cosφ + a²t²) (3회 고정점 반복).
- 디튜닝 x = 2(λ<sub>L</sub> − λ<sub>r</sub>)/FWHM (Huang et al. 2026과 같은 정의, 음수 = 파랑 쪽). Lorentzian 근사 T = 1 − D/(1 + x²)에서 정적 기울기 최대 |x| = 1/√3 ≈ 0.58.

### 2.3 접합 변조
- Δλ<sub>k</sub> = λ·η·(Δn(V<sub>k</sub>) − Δn(V<sub>0</sub>))/n<sub>g</sub>, PAM4 레벨 V<sub>k</sub> = V<sub>b</sub> + k·V<sub>pp</sub>/3.
- C<sub>j</sub> = C′(V<sub>mid</sub>)·ηL, R<sub>j</sub> = R′/(ηL) (2-2의 C′, R′), τ<sub>RC</sub> = (R<sub>j</sub> + 50 Ω)·C<sub>j</sub>.
- 구동 에너지 E<sub>bit</sub> = 0.104·C<sub>j</sub>·V<sub>pp</sub>² (무작위 PAM4에서 상승 전이의 평균 전하량, 드라이버 회로 자체 전력 제외).

### 2.4 동역학 (결합 모드 이론)
- da/dt = (jΔ(t) − 1/τ(t))·a − jμ·s, s<sub>out</sub> = s − jμ·a, μ² = 2/τ<sub>e</sub>, 1/τ<sub>e</sub> = κ²/(2T<sub>rt</sub>), 1/τ<sub>i</sub> = (1 − a²)/(2T<sub>rt</sub>), T<sub>rt</sub> = n<sub>g</sub>L/c.
- Δ(t) = 2πc(λ<sub>L</sub> − λ<sub>r</sub>(V(t)))/λ², V(t) = 드라이버(2차 70 GHz) × RC 극을 거친 PAM4 파형.
- 시간영역: 샘플마다 계수를 상수로 보고 정확한 지수 전파 a ← a·e<sup>ch</sup> + (−jμ)(e<sup>ch</sup> − 1)/c (c = jΔ − 1/τ), 128 심볼 × 16 샘플, 두 주기 중 두 번째.
- 눈: 5-tap FFE 기준 수신기(LS), 최악 내부 눈 / (2/3) / √Σc² → 페널티 = −10log₁₀(비). 2-3 MZM과 같은 평가기.
- OMA: **OMA<sub>outer</sub>** = 정착 레벨(정적, TDECQ 방식, 목표 판정에 사용) · **동적 OMA** = 파형 극값(전이 오버슈트 포함, 참고 표시) — Huang et al. 2026의 구분.
- 소신호 응답: 선형화 CMT δa = (jδΔ − δγ)a₀/(jΩ − jΔ + 1/τ) 와 켤레 항으로 δP(Ω), × RC 극 (Sacher & Poon 2008). 공진 중심의 광자 수명 한계 f<sub>Q</sub> = c/(2λQ<sub>L</sub>)는 참고선. 디튜닝에서 Ω ≈ |Δ| 근처에 피크가 생겨 대역이 넓어지거나 응답이 왜곡됩니다 — 대역은 Q 하나로 정해지지 않습니다.

### 2.5 열
- ∂λ/∂T = λ(∂n<sub>eff</sub>/∂T)/n<sub>g</sub>, ∂n<sub>eff</sub>/∂T는 리브 EIM에 dn/dT(Si 1.86×10⁻⁴, SiO₂ 0.95×10⁻⁵ /K).
- 히터: G′(단위 길이 열 컨덕턴스)는 2-1 열해석 테이블(Si 적층), P<sub>π</sub> = λG′/(2∂n<sub>eff</sub>/∂T), P<sub>2π</sub> = 2P<sub>π</sub> — 반경과 무관. 이동 Δλ = (P/P<sub>2π</sub>)·FSR, 빨강 쪽으로만.
- 필요 이동(T) = (동작점 − 히터 없는 공진(T)) mod FSR — 한 FSR 안에서 다음 공진 차수도 쓸 수 있음. 온도 범위에서 경계를 넘으면 최악값 = FSR (P<sub>2π</sub>).
- 자기 가열: 흡수 전력 = P<sub>in</sub>·(1 − T)·(α<sub>FCA</sub> + α<sub>TPA</sub>)/α<sub>total</sub>를 4레벨 평균(열 시상수 ≫ 심볼), ΔT = P<sub>abs</sub>/(G′L). 동작점은 히터 락으로 유지되므로 설계 배치에 반영.
- 열적 안정: 개루프 이득 g<sub>th</sub> = (∂P<sub>abs</sub>/∂λ<sub>r</sub>)·(∂λ/∂T)/(G′L). 파랑 쪽(x < 0)은 g<sub>th</sub> < 0 (자기 안정), 빨강 쪽은 양의 되먹임, g<sub>th</sub> ≥ 1이면 열 폭주 → ★★ 불합격 (Carmon et al. 2004).

### 2.6 공정 변동 (Fab Run)
- 다이마다 폭 dw, 두께 dt(Si 층 산포로 환산), 도핑 ±8%, 주입 정렬 15 nm (2-2와 같음).
- 공진 이동 λΔn<sub>eff</sub>/n<sub>g</sub> (∂λ/∂w ≈ 0.23–0.28 nm/nm, ∂λ/∂t ≈ 1.4–1.9 nm/nm), 간격 g − dw (결합 변화).
- 판정: 페널티·OMA<sub>outer</sub>·EO 대역·열적 안정 + 0–70 °C 전체의 최악 히터 전력 ≤ 예산. 예산은 기준 설계의 다이별 필요 전력 80번째 백분위수, 단 P<sub>2π</sub>의 85% 이하로 제한(공정 산포가 FSR과 비슷해 80번째 백분위수가 P<sub>2π</sub>에 닿는 경우에도 FSR·배치 여유·히터 효율이 수율을 정하도록).

## 3. 문헌과의 비교 (Experimental Reference)

| 양 | 이 모델 (기준 설계, 플랫폼별 §4) | 문헌 | 비고 |
|---|---|---|---|
| 공진 이동 | 9–25 pm/V (도핑 증가 0–0.8 decade) | 11–16 pm/V (Z-형 2-분절, Yuan 2024), 27–33 pm/V (Huang 2026) | 가로 접합만 모델 — Z/L/U형은 2D 모델 필요 |
| Q<sub>L</sub> | 수천 (Over-coupled) | ≈3700 (Yuan 2024), 2500–4300 (Huang 2026) | |
| EO 대역 | 30–60 GHz 대 | ≈49 GHz (Yuan 2024), 45–67 GHz (Huang 2026) | |
| 바깥 ER @200G PAM4 | 1–3 dB 대 | 3.6 dB (Yuan 2024) | 접합 효율 차이 |
| 히터 효율 | 0.2–0.5 nm/mW | 73 pm/mW (Yuan 2024), 160 pm/mW (Huang 2026) | 직선 단면 열해석을 링 둘레에 적용 — 3D 확산·히터 위치 차이로 낙관적일 수 있음 |
| ∂λ/∂T | 64 (1310) / 76 (1550) pm/K | ≈80 pm/K 인용, 모델 54.6 pm/K (Huang 2026) | |
| 자기 가열 | 수백 pm/mW 흡수 | 160 pm/mW 흡수 (Huang 2026) | 같은 열 경로 → 같은 방향의 낙관 |
| 구동 에너지 | 수~10 fJ/bit | 6.3 fJ/bit (Yuan 2024) | |

## 4. 플랫폼별 기준 설계 (calibrate_s2.js)

`node tools/calibrate.js all 2`가 같은 엔진에서 계산합니다. 값은 `src/data/pspec.json`의 `2-3R` 블록을 보세요 (start · ref · st · s1 · s2 · fab).

## 4a. 레이아웃과 GDS (`ring_allpass`)

| 형상 | GDS | 게임 모델과의 관계 | 검사 (`test/py/test_smq2gds.py`) |
|---|---|---|---|
| 링 | 원점 중심 고리 R ± w/2 (Si 코어 층, 꼭짓점 처짐 < 0.25 nm) | R = 레이아웃 반경 (§2.1), w = 리브 폭 | 내·외 반경 1 nm 이내 |
| 버스 | 직선, 링 바깥 가장자리에서 간격 g, 폭 = w, 길이 2R + 20 µm, 포트 o1(180°)·o2(0°) | κ 적분의 g (휜 간격 d(z) = g + z²/2R) | 간격 1 nm 이내, 링+버스 = 2조각, 포트 위치 |
| 리브 슬랩 | 링 ± 2 µm, 버스 ± 2 µm | 슬랩 90 nm (EIM) | 층 존재 (주석) |
| P / N 주입 | 안쪽 P · 바깥 N, 270° 호, 결합부 반대쪽 중심 | 덮개 η = 0.75 | 결합부 반대쪽 중심 (주석) |
| 히터 | TiN 2 µm 호, 결합부 쪽 개구 54°(덮개 0.85), 리드는 버스보다 ≥ 0.5 µm 위로 빠져 패드로 | 히터 금속 손실 × 0.85, 2-1 단면 G′ | 히터가 버스에서 ≥ 0.3 µm (작은 R에서는 개구를 넓히고 `arc_deg_drawn`으로 보고 — 예: SiN 1310 기준 R 5.37 µm에서 299°) |

SiN 플랫폼에서도 링·버스는 Si 코어 층(1/0)에 그립니다 (이종 집적 Si 활성층 가정, `heterogeneous_si: true`). SiN 도파로에서 Si 층으로 옮기는 층간 결합기는 그리지 않습니다 — Phase D(회로 GDS) 범위입니다. 링에 대한 모드 솔버 검사(`--sim mode`)는 아직 없어서 `NOT VERIFIED`로 보고합니다.

## 5. 알려진 한계

| 한계 | 영향 | 검증 경로 |
|---|---|---|
| 굽힘에 의한 모드 이동(외측 쏠림)과 접합 겹침 변화 무시 | 작은 반경에서 pm/V 오차 | 링 단면 모드 솔버 + TCAD |
| 결합 구간의 위상·파장 분산 무시 (κ 파장 무관) | 넓은 스펙트럼 표시의 FSR별 결합 변화 미반영 | FDTD / EME |
| 직선 단면 열해석을 둘레에 적용 | 작은 링의 히터·자기 가열 효율 과대 가능 | 3D 열해석 (Ansys HEAT 등) |
| TPA로 생긴 자유 캐리어 흡수 무시 | 고출력에서 손실 과소 | 역바이어스 접합의 캐리어 수명 포함 모델 |
| 자기 가열은 정상 상태 평균 | 패턴 의존 열 드리프트·기동(acquisition) 미포함 | 시간영역 열-광 결합 모델 (Huang 2026의 compact model) |
| 잡음 없는 눈 | 감도·BER는 2-4/2-5에서 다룸 | |
| PN 주입·금속 스택 | GDS에는 주석(abstraction) 레이어로만, 접합 콘택·비아 없음 | 파운드리 PDK |
| 링 FSR·Q의 솔버 교차 검증 없음 | 게임 n<sub>g</sub>·κ는 EIM·결합 슬랩 근사 | 모드 솔버 + FDTD (Phase D) |

## 6. 참고 문헌
- W. Bogaerts et al., "Silicon microring resonators," Laser & Photonics Reviews 6(1), 47–73 (2012). https://doi.org/10.1002/lpor.201100017
- W. D. Sacher, J. K. S. Poon, "Dynamics of microring resonator modulators," Opt. Express 16(20), 15741 (2008). https://doi.org/10.1364/OE.16.015741
- Y. Yuan et al., "A 5 × 200 Gbps microring modulator silicon chip empowered by two-segment Z-shape junctions," Nature Communications 15, 918 (2024). https://doi.org/10.1038/s41467-024-45301-3
- Z. Huang et al., "Co-design of Silicon Microring Modulator beyond 200 Gb/s per Lane," arXiv:2609.36690 (2026, 프리프린트). https://arxiv.org/abs/2609.36690
- Q. Xu et al., "Micrometre-scale silicon electro-optic modulator," Nature 435, 325 (2005). https://doi.org/10.1038/nature03569
- T. Carmon, L. Yang, K. J. Vahala, "Dynamical thermal behavior and thermal self-stability of microcavities," Opt. Express 12(20), 4742 (2004). https://doi.org/10.1364/OPEX.12.004742
- K. Padmaraju, K. Bergman, "Resolving the thermal challenges for silicon microring resonator devices," Nanophotonics 3(4–5), 269 (2014). https://doi.org/10.1515/nanoph-2013-0013
- A. D. Bristow, N. Rotenberg, H. M. van Driel, "Two-photon absorption and Kerr coefficients of silicon for 850–2200 nm," Appl. Phys. Lett. 90, 191104 (2007). https://doi.org/10.1063/1.2737359
- R. A. Soref, B. R. Bennett, "Electrooptical effects in silicon," IEEE J. Quantum Electron. 23(1), 123 (1987). https://doi.org/10.1109/JQE.1987.1073206
