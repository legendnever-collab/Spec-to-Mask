# Existing Content Mapping

| Content | Main journey mapping | Advanced / optional |
|---|---|---|
| 2-2 PN | 1-2 → live PN throughout 1-3…1-8 | PN library |
| 2-3 MZM | Tutorial, 1-1, 1-3…1-8 | existing MZM DR8 Track |
| MZM Bench + dynamic Eye | 1-3…1-8; fresh current identity | independent legacy bench preserved |
| 2-4 PD / 2-5 Laser | 0-1; 1-6 receiver assumption/budget | original Ge PD/TIA and ELS |
| 2-3R MRR / 2-1 Heater | Chapter 2–3 blueprint only | existing Guided MRR usable |
| 1-1 WG / 1-2 DC / 1-3,1-4,1-5 MMI | contextual optional knowledge | existing Fundamentals Track |
| 1-6 SSC / 1-7 CWDM | contextual optional knowledge | existing Fundamentals Track |
| 3A / 3A+ / 3W | not required in alpha.1 | DR8 / WDM8 |
| D-1 / D-2 / B-1 / B-2 / B-3 | not required | LiDAR / TTD |
| Six Design Lab missions | not required | Schematic, Floorplan, Routing, Electrical, Verify, GDS |
| Four platforms | Chapter data isolated per platform | all previous workspaces retained |

## Reuse vs minimal connections

Direct reuse: all PN/CPW/Bench/Eye solvers; device parameter controls and Canvas; full backup; Light/Dark; numerical solution evaluation; legacy Fab perturbation model.

Minimal glue: sequential controller; Chapter workspace; PN vb→reverseBias synchronization and live geometry context; current raw Eye gap→declared OMA budget using existing ELS loss accounting; evidence dependency fingerprints; protected Original and revisions; final report; contextual read-only library.

Not implemented: new MRM solver, BER/FEC/compliance, a fully linked receiver transient, novel yield solver, standard certified 200G.
