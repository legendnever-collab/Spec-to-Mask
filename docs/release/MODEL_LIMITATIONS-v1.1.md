# v1.1 모델 범위

v1.0의 Physics / Fab / GDS 모델을 그대로 사용합니다. 기존 `MODEL_LIMITATIONS-v1.0.md`, `docs/mrr_physics.md`, `docs/arch_1p6t_dr8.md`, `docs/wdm8.md`, `docs/gds_export.md`의 경계가 계속 적용됩니다.

- Analytical / Surrogate / Experimental reference / Assumption / NOT VERIFIED 근거 구분을 유지합니다. UI 정리는 모델 검증 수준을 높이지 않습니다.
- MRR은 CMT × RC와 Thermal loop를 사용합니다. Heater efficiency, laser drift, ring lock power, WDM source/MUX/Rx assumptions는 모델 가정이며 실측 보증이 아닙니다.
- Fab는 같은 Seed / Platform / Mode / Design / MODEL_VERSION에서 재현하는 Monte Carlo 추정입니다. Wilson 구간, 웨이퍼 내 공간 상관, same-wafer paired interpretation을 유지합니다.
- Circuit JSON과 Python GDS 재검사는 동일 Geometry / Design Hash를 사용합니다. 전극 형상은 generic placeholder이며 파운드리 RF / 제조 규칙 승인과 다릅니다.
- Design Valid / Geometry Rechecked / Foundry Readiness는 서로 다릅니다. Foundry Readiness는 항상 NOT VERIFIED입니다.
- 전체 FMCW LiDAR PIC Mask Generation은 지원하지 않습니다. 제공 Device / System 학습과 지원 Component JSON / Geometry 범위만 완료 판정합니다.
- Si1310 Heater의 기존 Reference는 h=0.4 µm에서 금속 흡수 0.02137 dB로 0.020 dB 조건을 약간 초과합니다. Reference를 Apply해도 통과가 보장되지 않으며 실제 수치를 확인해 조절해야 합니다. 본 버전은 원래 모델과 조건을 변경하지 않습니다.
