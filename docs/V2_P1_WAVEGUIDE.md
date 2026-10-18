# v2 P1 — Waveguide Tutorial

> 이 문서는 P1 당시 범위를 보존합니다. P1은 이후 사용자 승인과 전체 CI 성공 후 PR #24로 병합됐습니다. 현재 P2 범위는 [V2_P2_MZM_WORKBENCH.md](V2_P2_MZM_WORKBENCH.md)에서 확인합니다.

2026-10-18 · 사용자 지시에 따라 P1만 구현했습니다. 기술 용어는 English, 설명과 서술어는 한글로 작성합니다. P2 개발과 main 병합 승인은 없습니다.

## 실행과 학습 흐름

[실행 HTML](../dist/spec-to-mask-v2.0.0-alpha.1-p1.html)을 다운로드해 Browser에서 열면 Engine Overview가 표시됩니다.

1. **Waveguide Tutorial 시작하기**를 누릅니다.
2. **Bend Radius**를 움직이며 **Physical View**, **Loss Plot**, **Bend Radiation Loss**, **Footprint**를 함께 관찰합니다.
3. 필요하면 **Comparison 저장하기 / 복원하기**, **Original 복원하기**를 사용합니다.
4. 자세한 원리와 현재 수치는 선택 기능인 **Learn Physics**에서 확인합니다.
5. **계속하기** 또는 **건너뛰기**로 Summary에 이동합니다. 성능 PASS나 Verify는 필요하지 않습니다.

조작 없이 계속하면 `unobserved`, 건너뛰면 `skipped`로 기록합니다. 실제 Parameter 변경과 현재 Model 결과가 함께 확인된 경우에만 `observed`로 완료할 수 있습니다. 이전의 관찰 완료 History는 이후 건너뛰어도 보존합니다. P2 MZM Workbench는 아직 구현하지 않았습니다.

**More**에서 Platform과 Full Backup / Restore를 사용할 수 있습니다. **Advanced / Legacy 열기**로 기존 Studio에 진입하며, 기존 More의 **Learning Journey 열기**로 돌아올 수 있습니다. `?experience=legacy`는 기존 기능을 직접 실행하는 명시적 경로입니다.

## 기존 Model 연결

`src/v2/core.js`는 기존 `LAB.routeLoss`에 하나의 90° Arc를 전달합니다. `src/kinds`, `src/bench`, `src/lab`의 Solver와 계수는 수정하지 않았습니다.

| Platform | 고정 Width | Bend Radius 범위 | 최초 Radius |
|---|---:|---:|---:|
| Si1310 | 0.36 µm | 1–8 µm | 1 µm |
| Si1550 | 0.46 µm | 1–10 µm | 1 µm |
| SiN1310 | 0.78 µm | 10–80 µm | 10 µm |
| SiN1550 | 1.00 µm | 10–100 µm | 10 µm |

기본 Platform은 Si1310입니다. 나머지 Platform도 같은 기존 Strip / EIM Kernel을 사용하며 각 Workspace를 분리합니다. 이 범위는 현상을 관찰하기 위한 Educational Domain이며 Foundry 허용 범위를 뜻하지 않습니다.

- `Larc = πR/2 µm`로 계산합니다.
- `Bend Radiation Loss`와 `Propagation Loss`는 기존 Kernel의 별도 출력을 사용합니다.
- `Total Arc Loss = Bend Radiation Loss + Propagation Loss`로 표시합니다.
- `Footprint = (R + Width/2)² µm²`는 Lead / Clearance를 제외한 Quarter Arc의 Bounding Square입니다.
- `Pout/Pin = 10^(−Total Arc Loss/10)`로 계산합니다. Diagram에는 Geometry만 표시하며 임의의 Leakage Field를 만들지 않습니다.
- `Bend Radiation Loss < 1e−9 dB`는 Display Floor 미만으로 표시합니다. 정확한 0이라고 주장하지 않습니다.

Si1310에서 R=1→2 µm로 바꾸면 기존 Model의 Bend Radiation Loss는 약 0.103839→0.002517 dB로 줄고 Footprint는 1.3924→4.7524 µm²로 증가합니다. 큰 R에서는 Radiation이 이미 작아져도 Propagation Length가 증가하므로 Total Arc Loss가 다시 커질 수 있습니다.

## Model Confidence와 검증 범위

Analytical / Surrogate Model입니다. Small-R Saturation, EIM과 기존 Scattering 가정을 그대로 유지합니다. Straight–Bend Transition의 Mode Mismatch, 3D Full-wave Field, Process Variation, Foundry Sign-off는 계산하지 않습니다. 기존 Kernel과의 일치를 검증했으며 별도의 Measurement / 독립 Full-wave Simulation으로 정확도를 검증하지는 않았습니다.

## Design Identity / Save

새 Namespace는 `smq-v2-learning`, Schema는 `smq-learning/1`입니다. 기존 Studio / Lab / Legacy 키는 덮어쓰지 않습니다. PR #23의 Journey는 기존 `smq3-studio.journey` 안에 그대로 보관하며 v2 완료 증거로 전환하지 않습니다.

- `Design ID + Revision + Platform + Radius + Width + Wavelength + Model Signature`가 결과 Identity를 구성합니다.
- Input Event에서 이전 결과를 즉시 무효화합니다. Pending / Invalid 상태에서는 이전 Plot과 KPI를 현재 결과로 표시하지 않습니다.
- Animation Frame에서 Snapshot을 계산한 뒤 현재 Request / Identity와 일치할 때만 세 View에 함께 반영합니다.
- Comparison과 Original은 Parameter Snapshot으로 보관하고 복원할 때 새 Revision으로 재계산합니다. 과거 Model 결과를 새 PASS로 복구하지 않습니다.
- Reload에서는 Design / Learning History만 읽고 결과는 다시 계산합니다. Learn Physics와 Theme는 Design Revision을 변경하지 않습니다.
- Full Backup / Restore / Undo / Quarantine은 기존 Store를 재사용합니다. 새 Namespace의 검증을 추가했으며 기존 Backup도 계속 읽습니다.

## Source / Artifact

| 역할 | Path |
|---|---|
| Schema | `src/v2/schema.js`를 사용합니다. |
| Physics Adapter | `src/v2/core.js`를 사용합니다. |
| UI / Learn Physics | `src/v2/ui.js`, `src/v2/workbench.css`를 사용합니다. |
| Offline Font | `src/v2/font.css`, `assets/v2/OFL.txt`를 포함합니다. |
| State / Model Test | `test/t_v2.js`로 검증합니다. |
| Browser Test | `test/browser/v2.js`로 검증합니다. |
| 실행 파일 | `dist/spec-to-mask-v2.0.0-alpha.1-p1.html`로 제공합니다. |
| QA / Screenshot | `artifacts/v2-p1/`에 기록합니다. |

기존 beta.2 실행 파일과 P0 Prototype은 보존합니다. Package Version은 `2.0.0-alpha.1-p1`이며 정식 v2 Release나 main 병합을 뜻하지 않습니다.

## 검토와 다음 범위

Desktop 1440×900 / 1366×768에서는 조작·Diagram·Plot·KPI를 한 화면에 표시합니다. Mobile 390×844 / 320×568에서는 Physical View·KPI·Slider를 우선 표시하고 상세 Plot과 설명은 아래로 이어집니다.

실제 사용자에게서 2–3분 학습 효과를 검증한 결과는 없습니다. 사용자는 문장 이해도, 조작과 결과의 연결, Mobile 가독성을 검토해야 합니다. P1 검토 후 별도 승인이 있으면 P2의 MZM Length / Voltage / RF-Eye 실험을 진행합니다.
