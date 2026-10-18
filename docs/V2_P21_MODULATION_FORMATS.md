# Modulation Formats — Model Boundary

NRZ / PAM2: 2 Level / 1 Bit, PAM4: 4 Level / 2 Bit, PAM8: 8 Level / 3 Bit를 비교합니다. Same Baud 56 GBd의 Raw Rate는 56 / 112 / 168 Gb/s입니다. Same Raw 112 Gb/s의 Baud는 112 / 56 / 37.333 GBd입니다. Raw Rate는 FEC / Line Coding / Payload Overhead를 제외한 관계식입니다.

같은 원시 Bit Pattern을 자연 Binary로 묶고 각 Format을 0–1 Amplitude로 정규화합니다. 공통 물리 Time Axis를 사용합니다. Level Gap은 1 / (M−1)입니다. 1st-order RC Low-pass와 Seeded Synthetic Uniform Noise를 사용한 Conceptual Waveform / Eye이며 실제 MZM Voltage-to-Optical Transfer / PAM8 Solver / BER / FEC / Net Rate / Compliance는 NOT VERIFIED입니다.

Ideal Baseband Nyquist Minimum은 Rs/2이지만 실제 Driver / EO Bandwidth Spec과 동일하지 않습니다. Pulse Shaping / Equalization / Channel / Target Error Rate에 의존합니다. Same Raw에서는 고차 PAM의 Baud를 줄일 수 있지만 Noise / Linearity 여유는 감소합니다.

새 State는 optional formats[platform]이며 기존 by / mzm / foundations를 덮어쓰지 않습니다. 처음 Workbench Voltage에서 Eye로 진행할 때 Formats를 먼저 보여줍니다. 기존 Eye Save는 Resume를 보존합니다. Dropdown의 Modulation Formats에서 재방문할 수 있습니다. Introduced / Observed / Skipped를 구분하며 Conceptual Lesson이 Engineering PASS를 만들지 않습니다. 그다음 기존 RF / EO / Dynamic Eye를 그대로 재사용합니다.
