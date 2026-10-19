# Passive Basics — Model / Convention

## Width / Mode

KINDS.wg.evaluate를 같은 Platform / Width로 호출합니다. WGP의 Semi-vectorial 2D Table과 기존 Interpolation / Guidance Threshold (n_cladding + 0.003)를 변경하지 않았습니다. TE / TM Count와 TE0 Effective Index는 실제 기존 계산입니다. Core Geometry는 Width / Thickness에 연결하고 점선 Mode Shape은 Conceptual Illustration으로 표시합니다. Field Profile / Confinement Factor / Effective Area는 NOT VERIFIED입니다. 기존 Level ID와 Reference는 그대로입니다.

## Ideal Splitter / Combiner

교육용 H_r = [[√r, √(1−r)], [√(1−r), −√r]]는 실수 Unitary Matrix입니다. Splitter는 H_r, Combiner는 Balanced H_0.5를 사용합니다. Arm Reference Phase를 이 식으로 정의하며 φ=0에서 선택한 Main Port가 Constructive입니다. 일반적인 i Cross-coupling Convention과는 Port Reference Phase가 다릅니다.

- Upper Field amplitude = √r, Power = r입니다.
- Lower Field amplitude = √(1−r), Power = 1−r입니다.
- Main = [1 + 2√(r(1−r)) cos φ] / 2입니다.
- Complement = 1 − Main입니다.
- 두 Output 합은 1입니다. 실제 Device의 Excess Loss / Geometry / Bandwidth / Thermal / Fabrication을 계산하지 않습니다.

## Path Difference

같은 coherent Mode / Wavelength의 두 Arm에 대해 β = 2π n_eff / λ와 φ = β ΔL을 사용합니다. n_eff는 같은 Platform / 현재 Width의 기존 TE0 Table에서 가져옵니다. Path Step은 r=0.5로 고정합니다. TE0가 Guided되지 않으면 Path 관찰은 NOT VERIFIED로 남깁니다. 그림 경로는 Schematic이며 µm Scale의 Geometry Simulation이 아닙니다. Main+Complement=1은 명시한 Ideal Model의 보존식입니다.

## Intro / Existing MZM

기존 MZM Adapter / Live PN Geometry / Local Slope / Reverse Bias를 사용합니다. Intro는 별도 Input이며 기존 P2 Design이나 완료 기록을 덮어쓰지 않습니다. PN 활성화 시 Fixed Optical Loss와 PN Loss도 포함하므로 Ideal Passive 대비 효율 개선 / 악화로 주장하지 않습니다. SiN Platform에서는 Heterogeneous Si PN을 가정합니다. 전기 인가의 Δn_eff,diff는 두 Arm의 Differential Index Change이고 Δφ_drive=2π Δn_eff,diff ηL/λ=πVdiff/Vπ입니다.

## Additional Feedback — Component Course

Width는 기존 Mode Count와 n_eff를 사용하고 TE0 단일 Lobe / TE1 반대 부호 Lobe를 Conceptual Illustration으로 표시합니다. Field 색은 Carrier가 아닙니다. Confinement Factor / Effective Area는 계산하지 않습니다.
Bend는 LAB.routeLoss를 재사용하며 비교 Platform의 Width / Thickness / 유효 Radius를 모두 명시합니다. Index Contrast만 바꾼 독립 실험이 아닙니다.
Y-branch Shape Slider는 Optimizer가 아닙니다. Ideal 50:50의 Port IL 3.0103 dB와 Excess Loss 0을 설명하되 실제 Shape에 대한 IL / Excess / Reflection은 NOT VERIFIED입니다. 점선 Initial과 실선 Candidate를 비교합니다.
DC는 기존 KINDS.dc의 Supermode Table, MMI는 기존 KINDS.mmi의 EIM / Eigenmode Expansion을 사용합니다. MMI 호출 전후 PQ Platform을 try/finally로 복원합니다. Path 그림은 Conceptual이며 수치 Loss와 구분합니다. Footprint / Bandwidth / Tolerance에 대한 일반 우열을 주장하지 않습니다.
