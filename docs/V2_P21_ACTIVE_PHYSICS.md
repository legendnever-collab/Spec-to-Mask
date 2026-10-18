# Active Foundations — Model / Convention

MZM Introduction을 Passive MZI → PN → Single-arm / Push-pull → Transfer로 구성합니다. Demo Input은 foundations.activeDemo에 저장하고 P2 Workbench의 입력 / 완료 기록을 변경하지 않습니다. 기존 intro Model과 기록도 보존합니다.

## 실제 재사용

PN의 KINDS.pn._x.optical / Carrier Depletion Electrostatics를 그대로 호출합니다. Δn_eff는 동일 Geometry의 0 V 또는 1.5 V Reverse Bias 기준 차이입니다. Active Length는 기존 Reference의 ηL입니다. φ = 2π Δn_eff L_active / λ를 계산합니다. Optical Mode Profile과 Carrier Density는 다른 물리량이며 같은 Heatmap으로 표시하지 않습니다. Depletion Width는 계산값, 그림의 Density / 크기와 위치는 Schematic입니다. SiN에서는 Heterogeneous Si PN을 가정합니다.

## Single-arm / Push-pull

공통 Reverse Bias B=1.5 V에서 Single-arm은 Upper ΔV=v / Lower ΔV=0입니다. Push-pull은 Upper +Vdiff/2 / Lower −Vdiff/2입니다. 각 Arm의 Reverse Bias와 Phase를 표시합니다. 실제 Junction Voltage는 Reverse Bias의 음수입니다. 정적 ΔV를 Driver Vpp로 해석하지 않습니다.

같은 Differential Phase를 만들기 위해 Single-arm의 Nonlinear Phase를 목표로 삼고 Push-pull Vdiff를 55회 Bisection합니다. 모든 Arm은 0–3 V Reverse Bias Domain 안에 있습니다. Local Linear 근사에서는 각 Arm이 약 절반의 Excursion을 나누지만 전체 Differential Voltage까지 절반이라는 뜻은 아닙니다. Vπ는 기존 Local PN Slope의 VπL / L_active(cm)입니다.

## Power / Port / Chirp

Passive MZI는 Ideal 50:50 Split이며 Field Amplitude √0.5를 사용합니다. Active도 Ideal 2×2 Combiner의 Main / Complement를 표시합니다. Y-branch 2-to-1은 Complement Port가 없는 별도 Topology입니다. Main + Complement는 고정 Throughput과 같습니다. Voltage-dependent Arm Loss / Imbalance를 추가 계산하지 않습니다. Common Phase는 표시하지만 Dynamic Chirp α / Spectrum / BER / FEC는 NOT VERIFIED입니다.

Foundation Identity에는 새로운 Input과 Step을 포함합니다. 오래된 Result를 다른 Step의 현재 Result로 쓰지 않습니다. 저장된 Completion을 재계산 PASS로 승격하지 않습니다.
