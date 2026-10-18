# SPEC-to-MASK v2.0 P1 — Model Limitations

Waveguide Bend tutorial reuses the existing LAB.routeLoss analytical / surrogate 90-degree strip arc calculation. The model distinguishes bend radiation and propagation loss; total loss can be non-monotonic with radius as path length grows. Footprint is a geometric quarter-arc bounding estimate excluding routing clearances and straight leads. Domain limits are educational, not foundry rules.

This is not independent measurement, full 3D electromagnetic simulation, fabrication sign-off, verified BER, FEC, or standards compliance. The MZM production Workbench, MRM/EAM and 400G models are future checkpoints. See docs/V2_P1_WAVEGUIDE.md for assumptions.
