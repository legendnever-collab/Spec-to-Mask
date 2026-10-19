# P2.1 — Visual / Typography Specification

## Semantic Color

Si Passive는 Charcoal, SiN은 Slate-blue, PN Active는 Amber, Interaction Focus는 Teal Border / Tint를 사용합니다. Material과 Focus를 다른 속성으로 표현합니다. Phase는 동일 길이 Vector와 Accumulation Bar, Power는 Combiner 뒤 Main / Complement Meter로 표시합니다. 임의 Optical Power Flow Animation을 만들지 않습니다.

## Typography

Desktop Page 32 / Section 24 / Card 20 / Body 17 / Secondary 15 / Caption 14 / KPI 28 px를 공통 Token으로 정의합니다. Body line-height 1.5, Numeric tabular-nums를 사용합니다. Mobile은 Page 23 / Card 18 / Body 16 / Secondary 14 / Caption 14 / KPI 25로 조정하며 320×568에서는 설명을 아래로 이동합니다. Canvas는 짧은 별도 Annotation을 사용하고 Geometry 내부에 긴 Label을 넣지 않습니다.

## Font 조사 / 결정 절차

기존 SMQ Learning Korean은 NanumGothic OFL Subset / Data URL입니다. P2까지의 Glyph만 포함해 새 문장의 Glyph 확장이 필요합니다.

- Pretendard 공식 배포 / License: https://github.com/orioncactus/pretendard (OFL, Variable / WOFF2, Mixed Korean/Latin UI)
- Noto Sans KR 공식 안내: https://notofonts.github.io/noto-docs/specimen/NotoSansCJKkr/ 및 https://github.com/notofonts/noto-cjk (OFL, Hangul/Hanja coverage)
- 기존 NanumGothic Source / SHA는 assets/v2/FONT_NOTICE.md를 따릅니다.
- 세 Font를 실제 Browser specimen에서 같은 크기의 한글 / English / π Δ η λ / Numeral로 비교한 뒤 기존 Font 유지 여부를 결정합니다. 다운로드 불가시 반복 대기하지 않고 기존 Font Glyph 확장과 System Math fallback을 사용하며 제한을 기록합니다.

## Layout / Collision

Overview는 Laser cavity → Tx PIC의 8개 병렬 Waveguide / PN 구간 → Coupling taper → Fiber → Rx PD를 연속 Port로 연결합니다. Mobile은 세로 Illustration으로 전환합니다. Current Stage는 Text / Border로 표시하고 이후 Engine은 준비 중으로 구분합니다.

Workbench Desktop는 Physical / Live Plot + Tune / KPI / Discovery / Continue를 같은 Viewport에 표시합니다. Mobile는 Physical → KPI → Knob 순서이며 상세 Plot과 설명은 아래로 둡니다. Label은 별도 Row / Anchor에 놓습니다.

Contrast는 https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html 의 Normal Text 4.5:1을 기준으로 주요 Text pair를 자동 계산합니다. 이는 전체 WCAG Audit 인증이 아닙니다. 최종 100% Screenshot을 직접 확인하고 200% Browser Zoom에 대응하는 Reflow도 검사합니다.

## 최종 Font 선택 / 검토

세 Font의 실제 18 px Specimen을 Light/Dark Browser에서 비교했습니다. Nanum의 Greek Glyph 누락을 확인했고, Pretendard의 Mixed UI / Glyph Coverage / Variable Weight를 선택했습니다. 원본을 Subset / Rename한 Offline WOFF2는 100,768 bytes입니다. 최종 Corpus의 Font Coverage는 QA JSON에 기록합니다. 공식 Source / SHA256 / OFL은 assets/v2/FONT_NOTICE.md와 PRETENDARD-OFL.txt에 보관합니다. 다른 Font가 나쁘다는 일반적 판정이 아닌 이 UI의 개발 선택입니다.
