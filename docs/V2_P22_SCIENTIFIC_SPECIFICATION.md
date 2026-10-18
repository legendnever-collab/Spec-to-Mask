# P2.2 — Physics Fidelity & Scientific Visualization

## 승인 / Recovery

2026-10-18 사용자 Work Order: A–F 전체를 순서대로 구현하고 Checkpoint마다 Source / Test / Documentation을 먼저 Commit·Push합니다. PR #25 Draft를 유지하며 main 병합과 P3 시작은 금지합니다. Technical Term은 English, 서술어는 한글입니다.

Recovery HEAD `88ea82ec0ebf7cd083a573d86fb14763107f16eb`, main `0537a71a3f05670edc4887a2be21f0a7563f227c`. 새 Workspace는 Clean이며 이전 Local Worktree는 접근되지 않습니다. 기존 alpha.3-p21-learning HTML / QA / Source를 보존합니다. Remote의 P0 / P1 / P2 / P2.1 / Production CI 5개 SUCCESS를 실제 조회했습니다.

## Scientific classification

- A: 검증 가능한 Numerical Field Solution. Full-vector Maxwell / FDTD / CHARGE는 이번 Source에 없습니다.
- B: 조건·Mesh·Boundary·Validation을 보관한 Precomputed Field입니다. 내부 수치 일치 검증과 독립 외부 정확도 검증은 분리합니다.
- C: Analytical / Reduced-order Model입니다. Semi-vectorial FD, EIM, CMT, 1D abrupt PN은 이 범주입니다. 이 Solver의 Offline 결과는 **B / C solver**로 표시합니다.
- D: Conceptual Schematic입니다. Geometry 그림과 정량 Field를 구분하며 숫자가 없는 그림을 FDTD로 부르지 않습니다.

## Source reuse audit

| View | 기존 Source / Data | 분류 / 제한 | P2.2 작업 |
|---|---|---|---|
| Waveguide | `kinds/wg.js`, `wg_*.json`, `tools/modes2.py`, `gen_wg.py` | C solver의 B table. TE 4 / TM 3 index. 기존 40×24 intensity는 TE0/1, TM0/1만 있으며 nearest Width입니다. | 같은 Solver / Material / Geometry에서 모든 Guided Mode의 Signed Numeric Array를 계산합니다. 정확한 Sample Width에서만 Field를 표시하고 off-grid는 Unsupported로 처리합니다. |
| Bend | `v2/core.js`, `LAB.routeLoss`, `spiral._x` | C: Strip EIM / Marcuse 추정과 Scattering 가정. Radiation Field 없음. | 90° Arc의 R를 Geometry에 연결하고 Bend / Propagation / Total을 분리합니다. 새 Material에 기존 Si 계수를 복사하지 않습니다. |
| Y-branch | `v2/course_ui.js` | D: 임의 Shape Control / Field 없음 | 의미 없는 Shape Slider를 Physical Taper Length로 교체합니다. Initial / longer taper를 Geometry로 비교하며 Optimization / IL 개선은 미검증입니다. |
| DC | `kinds/dc.js`, DCP | B supermode index + C CMT. 고정 Width / Thickness, Gap interpolation | 실제 2×2 Geometry / Interaction Region과 CMT modal amplitude를 같은 L / Gap으로 표시합니다. 2D Field propagation은 주장하지 않습니다. |
| MMI | `engine_mmi.js`, `kinds/mmi.js` | C: vertical TE0 EIM + lateral scalar eigenmode expansion. Reflection / radiation continuum 없음 | `PQ.solve` / `PQ.fieldMap`의 Field와 Output overlap을 직접 재사용합니다. 1×2 / 2×2와 access position을 구분합니다. |
| Passive MZI | `foundations.ideal` | C: real orthogonal unitary H convention | 1×2 splitter / 실제 2×2 DC topology / two outputs를 그립니다. Reference plane을 명시하고 동일 complex amplitude에서 Field / Power를 생성합니다. |
| PN | `pn._x.mode/optical/analyse` | C: 1D abrupt depletion, lateral EIM, vertical confinement, Soref–Bennett. 2D CHARGE 아님 | 동일 x 좌표에서 Rib / Slab / Doping / Depletion / Carrier / Optical intensity를 비교합니다. Original Kernel 계수는 그대로 유지합니다. |

## Geometry / Result contract

Width View는 Core / SiO₂ Boundary, n, λ, Thickness, Ex/Ey, Mode Number, n_eff, Guided / Cutoff를 표시합니다. Signed E와 dominant-component Intensity를 구분합니다. TE/TM은 Polarization family이며 Mode order와 다릅니다. Cutoff 기준은 기존 `n_eff > n_clad + 0.003`입니다. Full-vector total energy density가 아닙니다.

Mode Array는 solver grid → display grid 보간 / amplitude normalization을 기록합니다. Dataset Width와 현재 Width가 다르면 Field를 표시하지 않습니다. 기존 n_eff Table과 재계산 차이, Mesh / Window 변화, Parity / Nodes / edge tail을 검증합니다. 근접 Cutoff는 finite-window 영향 경고를 제공합니다.

DC는 두 독립 Waveguide의 접근 / 평행 / 분리와 4 Port를 유지합니다. MMI는 Rectangular multimode region과 Access Waveguide를 구분합니다. Geometry는 Parameter에 연결하되 축척 왜곡이 있으면 표기합니다. MMI output overlap은 누락 Radiation을 포함한 Total energy conservation 증명이 아닙니다. Guided expansion norm과 Port collection을 별도로 검사합니다.

PN은 Si Rib 220 nm / Slab 90 nm, wavelength별 기존 width, p+/n+ contact distance와 Junction Offset을 그대로 사용합니다. Bias는 양의 Reverse Bias입니다. Carrier distribution은 piecewise 1D approximation을 Si cross-section에 투영하며 2D electrostatics를 주장하지 않습니다. Δn_eff / absorption / phase / C′는 동일 Geometry와 Bias에서 계산합니다. Active Intro와 MZM Workbench의 별도 Design ownership을 보존하고 기본 PN Geometry 및 Bias convention 일치를 검사합니다.

## Checkpoint / Test plan

A Audit·Domain·Specification → B Home/Session/종료·Mode Library → C multi-material Bend → D passive Geometry/Field → E PN multiphysics → F integration입니다. B–E는 각각 Source Build의 Intermediate HTML을 생성합니다. 기존 Test를 삭제하거나 물리 Assertion을 완화하지 않습니다. Navigation 변경에 따른 selector / entry path만 갱신할 수 있습니다.

새 Test: exact-width dataset identity, TE0–3 존재·parity·index, unsupported rejection, DC power conservation / reciprocity, MMI symmetry / propagation norm / output overlap, MZI complex amplitude norm / phase 0·π·2π, PN charge neutrality / depletion sqrt relation / capacitance monotonicity / exact overlap integral, invalid input / same revision, full Backup / Restore, 4 Platform, Desktop/Mobile Light/Dark, Offline / Parity / SHA256. 외부 Maxwell accuracy / CHARGE / 실제 Material calibration / User Play는 별도 NOT VERIFIED입니다.

## Kernel change decision

기존 Solver / Coefficient / Level / Score / GDS는 변경하지 않습니다. 새 Scientific Adapter와 View만 추가합니다. 필요시 Kernel public diagnostic interface의 확장만 허용하며 기존 numerical output identity를 검증합니다. Unsupported를 임의의 Curve로 채우지 않습니다.
