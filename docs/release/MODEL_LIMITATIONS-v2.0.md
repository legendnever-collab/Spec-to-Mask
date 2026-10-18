# P2 — Model Limitations

기존 `KINDS.pn`, `KINDS.mzm`, `MZM_BENCH`를 변경하지 않고 Adapter로 재사용합니다. Si1310 / Si1550과 SiN1310 / SiN1550 Workspace를 지원하며 SiN에서도 Active PN은 Heterogeneous Si Layer 가정입니다.

- PN은 Depletion / Soref–Bennett / Mode Overlap 기반 Educational Model입니다. Live PN의 Local Slope를 같은 Reverse Bias에서 계산하며 1 V Card Secant와 혼합하지 않습니다.
- Static MZI는 Balanced Arms / 50:50 Couplers / Fixed Optical Loss / Local Linearized PN Phase를 가정합니다. Large-signal Carrier Dynamics, Voltage-dependent Arm Absorption, Coupler Imbalance는 새로 계산하지 않습니다.
- Applied Voltage는 Electrode Differential Voltage입니다. Source Open-circuit Vpp와 다릅니다. 두 PN은 Reverse Bias에서 ±Vdiff/2를 보며 0–3 V Domain 위반은 N/A입니다. Optical Phase Bias는 PN Reverse Bias와 다릅니다.
- Electrical S21은 50 Ω Two-port이며 EO는 Loaded CPW / RC / Optical-frame Integral입니다. EO / Driver / Eye는 동일 Bench Input을 사용합니다. 120 GHz 안에 −3 dB Crossing이 없으면 >120 GHz로 표시합니다.
- Dynamic Eye는 256-symbol Periodic Pattern / 16 Samples/UI / Best Sample Phase / ±8 UI Delay와 240 GHz Cutoff를 사용합니다. Noise / Jitter / Receiver / Equalizer / CDR은 미포함입니다.
- Raw Gap은 측정 BER이 아니며 음수면 Level이 겹칩니다. Folded Levels / PN Domain 위반은 N/A입니다. 112 GBd PAM4 = 224 Gb/s raw이며 Net 200G / FEC / IEEE Compliance / Link Closure는 NOT VERIFIED입니다.
- Schematic은 실제 길이 비례 / Full-wave Optical Field / Leakage Simulation이 아닙니다. Arm Field Vector 크기는 같고 Phase Difference / Combiner Output을 설명합니다.
- Engineer Constraint는 예시이며 Industry Requirement가 아닙니다. Model과의 일치가 Measurement / Foundry / External Accuracy 검증을 뜻하지 않습니다.
- P1은 기존 LAB.routeLoss의 90° Strip Arc Model을 유지하며 Footprint는 Lead / Clearance를 제외한 Bounding Square입니다.

Human Learning / 2–3분 효율, 200% Zoom / Screen Reader / 정식 Accessibility Audit는 NOT VERIFIED입니다.
