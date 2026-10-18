# P2.2 Material / Model / Domain Matrix

공통 Comparison Objective는 λ=1550 nm, quasi-TE, 90° Arc당 Bend Radiation Loss ≤0.1 dB입니다. 이 값은 설계 목표이며 측정 성능이 아닙니다. 1310 nm는 기존 Si/SiN 및 해당 파장 Reference에서만 사용합니다.

| Family | Profile / Source | Geometry / Radius | Quantitative support |
|---|---|---|---|
| Si / SiO₂ | Step-index, 기존 `modes2.py` dispersion | 220 nm strip, 기존 w0 / R 1–10 µm (1550) | C EIM / Marcuse 기존 추정. External accuracy NOT VERIFIED |
| SiN / SiO₂ | Step-index, 기존 dispersion | 400 nm strip, 기존 w0 / R 10–100 µm (1550) | C EIM / Marcuse 기존 추정. External accuracy NOT VERIFIED |
| IOX | Diffusion / field-assisted burial에 따른 Graded-index | 공정별 측정 Profile 필요. mm–cm 탐색 Domain은 View 범위이지 Loss validation 범위가 아님 | Verified full parameter set / Bend lookup 없음: numerical n_eff / loss Unsupported |
| LDW | Thermal / athermal composite, 비균일 positive/negative index morphology | Ross-Adams et al. 2024, 1550 nm / 4 mm에서 1 dB/cm bend attenuation 보고 | Δn=1.12×10⁻²는 논문 조건의 Reference. 단일 point로 Curve를 보간하지 않음. Full profile / propagation loss Unsupported |
| Polymer | Core/cladding step 또는 rib geometry | Boucaud et al. 2024 첨부 논문: rib 11×7 µm, 1310 nm에서 propagation 1.92 dB/cm | 해당 sample의 Propagation Reference만. Index / Bend data 없으면 n_eff / Bend / Total Unsupported |

Fixed Geometry Comparison은 Si / SiN에 공통 width/thickness를 적용한 가상 비교를 Representative Platform 결과와 혼합하지 않습니다. 기존 EIM Bend model의 재검증 없이 Fixed Geometry의 numerical Loss는 표시하지 않습니다. IOX / LDW는 Si rectangular step-index로 대체하지 않습니다. 대표 Geometry가 확인되지 않은 곳에 임의 core size / index를 입력하지 않습니다.

References:
- `tools/modes2.py`, `src/kinds/spiral.js`, `src/lab/engine.js` (기존 educational coefficients)
- Ross-Adams et al., *Low bend loss, high index, composite morphology ultra-fast laser written waveguides*, Light: Advanced Manufacturing (2024), https://doi.org/10.37188/lam.2024.009
- Macrelli et al., *Ion Exchange in Silicate Glasses*, https://arxiv.org/abs/2002.08016 (profile mechanism; complete device calibration가 아님)
- Boucaud et al., *Photonic glass interposer*, APL (2024), 사용자 첨부 `2024-Boucaud-APL-Photonic-Glass-Interposer-ann.pdf`, Fig. 2 / propagation characterization. 다른 플랫폼의 Bend Loss 근거로 사용하지 않음.

IOX / LDW / Polymer의 validated numerical Bend library는 아직 없습니다. 이 사실은 구현 실패를 숨기는 대신 Acceptance / QA의 NOT VERIFIED로 유지합니다. 문헌의 한 지점이나 Propagation Loss를 새 Bend Solver의 검증 결과로 승격하지 않습니다.
