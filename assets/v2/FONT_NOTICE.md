# SMQ Learning Korean

NanumGothic-Regular를 기반으로 P1 / P2 UI의 Glyph를 Subset하고 Font Name을 변경했습니다. SIL OFL 1.1 License를 적용하며 [OFL.txt](OFL.txt)를 제공합니다.

- Source: https://github.com/google/fonts/blob/main/ofl/nanumgothic/NanumGothic-Regular.ttf
- Git blob: `2aa2b20905b4136808a0126d8e36e5c0f576715c`
- Source SHA256: `76f45ef4a6bcff344c837c95a7dcc26e017e38b5846d5ae0cdcb5b86be2e2d31`
- Derivative family: `SMQ Learning Korean` (Reserved Font Name을 사용하지 않습니다.)
- Runtime에는 Font를 다운로드하지 않고 src/v2/font.css에 포함한 WOFF Data URL을 사용합니다. System Font도 Fallback으로 유지합니다.

## P2.1 — 실제 Browser 비교 후 변경

Nanum / Pretendard / Noto Sans KR를 같은 18 px Specimen으로 Light/Dark에서 비교했습니다. 기존 Nanum은 한글이 읽히지만 Greek Glyph Δ η λ π φ가 없어 System Fallback에 의존했습니다. Pretendard와 Noto는 해당 Glyph를 직접 포함했습니다. Pretendard의 Mixed Korean/Latin UI와 실제 Weight 지원을 선택하고 Subset / Rename했습니다. 원본 전체 파일은 배포하지 않습니다.

- Source: https://github.com/orioncactus/pretendard/blob/main/packages/pretendard/dist/web/variable/woff2/PretendardVariable.woff2
- Source SHA256: `9599f12fd42fc0bce1cd50b47a0c022e108d7aa64dd0d1bb0ed44f3282d900b4`
- License: [PRETENDARD-OFL.txt](PRETENDARD-OFL.txt), SIL OFL 1.1입니다. Reserved Font Name을 쓰지 않는 SMQ Learning Korean으로 이름을 바꿉니다.
- Runtime: src/v2/font.css의 WOFF2 Data URL / weight 100–900을 사용하며 외부 Font 요청이 없습니다.
- Specimen Subset 크기: Nanum 9,800 / Pretendard 16,332 / Noto 11,212 bytes입니다. 최종 UI Subset은 별도 Glyph Coverage / Byte 검사를 기록합니다.
- Browser 비교 Screenshot과 JSON은 artifacts/v2-p21/ 및 최종 Actions Artifact에 보관합니다. 이 비교는 사용자 선호의 검증이 아닌 개발 시각 검토입니다.

## P3.1 — 동일 Source의 Glyph 확장

위와 동일한 Pretendard Variable Source SHA256을 NPM `pretendard@1.3.9`의 WOFF2에서 확인했습니다. 기존 Generator / Rename / OFL을 유지하고 Lane 문구의 Glyph만 확장했습니다. 현재 Hangul 352개 / 누락 0, Subset 111,148 bytes입니다. Font는 Runtime Data URL에 포함하며 외부 요청이 없습니다.

## P3.2 Glyph Extension — 2026-10-20 KST

동일 Pretendard Source SHA256 / Generator / Rename / OFL을 유지했습니다. 새 문구의 실제 Missing Glyph를 확인해 필요한 Glyph만 확장했습니다. WOFF2 112,368 bytes로 P3.1보다 1,220 bytes 증가했습니다. Font Family / Layout / 외부 요청 정책은 바꾸지 않았습니다.
