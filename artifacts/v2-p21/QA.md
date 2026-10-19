# P2.1 — Local QA Freeze / Play Review

2026-10-18 · v2.0.0-alpha.3-p2-ux · 사용자 Play Acceptance는 아직 없습니다.

## 결과

- P1 State / Model **93**, P2 **154**, P2.1 **135**, MZM Bench **111** PASS입니다.
- 새 Canonical HTML에서 P1 Browser **121**, P2 **511**, P2.1 **390**, Legacy Studio **168**, Legacy MZM **37** PASS입니다. 마지막 Browser는 Chromium 151.0.7922.34입니다.
- Studio State 56, Lab 440 + Si1310 / SiN1550 e2e / State, Backup / Restore / Undo, Smoke, Engine Identity (Upgrade 357 / MRR 182 / DR8 87 / WDM 81), Python GDS / Circuit이 PASS입니다.
- Syntax 90 Files + Assembled Script를 통과했습니다. 기존 Solver / 계수 / Data / Platform / Level / Lab Source는 변경하지 않았습니다.
- 4 Viewport × Light/Dark × Discover/Engineer에서 Control / KPI / Continue 위치와 44px Hit Area를 검사했습니다. Label Collision / Major Text Contrast ≥4.5:1 / 한글-English-Math Glyph를 검사했습니다.
- 실제 100% Screenshot을 직접 검토했습니다. 320px Diagram을 가로로 확장해 Label을 확대했고 Desktop / Mobile의 Active / Passive를 구분했습니다. 주요 구조/라벨 충돌은 검토 범위에서 발견되지 않았습니다. Human Learning Acceptance와 전체 Accessibility 인증을 의미하지 않습니다.
- Font: Nanum / Pretendard / Noto의 실제 Light/Dark Specimen 비교 후 Greek Glyph / UI Weight를 지원하는 Pretendard Subset을 선택했습니다. WOFF2 **100,768 bytes**, Corpus **463 Glyph**, 누락 **0**입니다. OFL / Source SHA를 보관합니다.
- 외부 Runtime HTTP / Page Error는 새 Browser 검사에서 **0**입니다. Learn / Glossary / Theme의 Design / Progress 비변경을 확인했습니다.

## Artifact Integrity

- HTML: `dist/spec-to-mask-v2.0.0-alpha.3-p2-ux.html`
- SHA256: `a2f21b11a9bac77ccc39626746d140bb648b3669e14161521ad29140ce6e247e`
- Source Manifest SHA256: `69506b62e134881b8272ead85dbbd0262d3e0883ed4ff280bee1d75b689b56dc` (170 files)
- `dist/index.html` / Canonical Byte 일치를 확인했습니다. Source Rebuild / GitHub Committed Bytes는 게시 후 Receipt와 CI에서 확인합니다.
- Source / Test / Documentation을 먼저 Commit·Push하고 HTML은 별도 Artifact Commit으로 게시합니다. 최종 Commit은 자기 자신의 SHA를 포함할 수 없어 이후 PR / Receipt에 기록합니다.

## 알려진 제한 / NOT VERIFIED

Width의 점선 Mode Shape은 Conceptual Illustration입니다. 실제 지원하는 Count / Effective Index만 기존 Table 계산값입니다. Passive Coupler는 명시적 Ideal Unitary / Lossless Model이며 실제 Geometry / Device Loss / Bandwidth를 검증하지 않습니다. SiN의 Active는 Heterogeneous Si PN 가정입니다.

Phase Vector는 Phase Indicator이며 Full-wave Field가 아닙니다. MZM은 기존 Local PN / RF / Dynamic Eye를 사용합니다. 112 GBd PAM4는 224 Gb/s raw입니다. BER / FEC / Net 200G / Receiver / Noise / Jitter / External Accuracy / Human Learning은 **NOT VERIFIED**입니다.

최초 Chrome 134의 Legacy Browser는 환경 종료로 완료하지 못했으나 Chromium 151에서 같은 Test / Criteria를 그대로 통과했습니다. Test를 삭제 / 완화하지 않았습니다. GitHub CI와 Four-Platform Matrix는 이 Freeze 시점에 pending이며 이후 실제 최종 HEAD 결과를 따로 기록합니다.

**P2.1 사용자 Play 검토에서 중단합니다. Draft PR #25 유지 · main 병합 금지 · P3 미시작.**
