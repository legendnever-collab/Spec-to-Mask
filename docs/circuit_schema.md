# smq-circuit/1 — 회로 수준 설계 데이터

소자 단위 `smq-design/1`(레벨 내보내기)은 그대로 두고, PIC Design Lab이 회로 전체를 내보내는 새 스키마입니다. 게임(브라우저)은 데이터를 만들고, GDS 백엔드(`tools/smq2gds/circuit.py`)는 데이터를 읽어 PCell·배치·배선·조립·GDS·미리보기를 만들고 다시 읽어 검사합니다([gds_export.md](gds_export.md)). 배선과 소자 내부 도파로를 기본 도형으로 넘기므로 게임 미리보기와 GDS가 같은 모양입니다.

생성: `src/lab/engine.js` `LAB.exportCircuit(c, chk)` · 예제: `tools/smq2gds/examples/circuit/*` (`node tools/export_circuit.js all`).

## 파일

| 파일 | 내용 |
|---|---|
| `engine_schematic.json` | platform, architecture, die, instances(파라미터·배치·포트), nets(optical / electrical) |
| `engine_layout.json` | 위 전부 + routing.optical(기본 도형), routing.electrical(추상 선), pads, abstraction |
| `engine_verification.json` | design_hash, checks(group·item·status·detail), summary(PASS/WARNING/FAIL/NOT VERIFIED 개수), performance(3A+ 모델 마진, 레이아웃 손실, 모듈 W, pJ/bit, 레인별 손실). smq2gds가 `gds_recheck`를 덧붙임 (아래) |

## 공통 머리

```
schema: "smq-circuit/1"
generator, exported
platform: { id, mat, lam_um, core_t_um, w0_um, wc_um, clad, box, rules_um{gap, wmin, edge},
            route_rules{ port_width_um, body_width_um, taper, bend: "arc"|"euler", R_um, R_min_rule_um,
                         alpha_body_dB_cm, alpha_port_dB_cm, litho_min_width_um } }
architecture: { name, outputs (8 DR8 / 1 WDM8), lanes: 8, lane_rate_gbps: 224, net_rate_gbps: 200, baud_gbd: 112, format: "PAM4",
                modulator: "mzm"|"mrr"|"wdm", laser_share, lasers, splitter_depth, monitor_pd,
                wdm?: { channels, grid_GHz, lambda_um[8], fsr_nm, radii, assignment, ring_pitch_um, source, model } }
die: { W_um, H_um, edge_um, optical_io{input:"W", output:"E", fiber_pitch_um}, electrical_io{…}, lane_pitch_um, lane_stagger_um }
```

좌표: µm, 다이 원점 왼쪽 아래, x 동쪽, y 북쪽. 각도: 도, 포트가 바라보는 방향(0 = 동쪽). 배치·포트·소자 길이는 1 nm 격자(GDS dbu)에 맞춥니다.

`design_hash`: layout 내용(내보낸 시각 제외)의 FNV-1a 32비트 hex. 세 파일과 smq2gds의 `gds_recheck`가 같은 값을 갖고, Lab은 이 값으로 불러온 GDS 재검사가 지금 설계의 것인지 판정합니다.

## instances[]

| 필드 | 의미 |
|---|---|
| `id` | `IN{k}` 입력 SSC, `SP{k}_{level}_{q}` 1×2 MMI, `MOD{i}` 변조기, `MON{i}` 모니터 탭+PD, `OUT{i}` 출력 SSC · WDM8: `IN0`, `BUS`, (`MON0`), `OUT0` |
| `type` | `ssc`, `mmi1x2`, `mzm`, `mrr`, `mrr_wdm`, `tap_pd` |
| `role`, `lane` | input / splitter / modulator / monitor / output, 레인 번호 |
| `source` | "내 2-3R 카드", "1-3 기준 설계" 등 |
| `params` | 형상을 다시 만들 수 있는 값 (아래) |
| `placement` | `{x_um, y_um, rot_deg}` — 로컬 원점(광 입력 포트 또는 SSC 단면)의 위치, 회전 0 또는 180 |
| `bbox_um`, `size_um` | 배치된 외곽, 로컬 크기 |
| `ports[]` | `{name, kind: optical|electrical|internal, sub, xy_um, angle_deg}` (절대 좌표) |

`params` (type별):

| type | params |
|---|---|
| `ssc` | `Lt_um`, `tip_um`, `w_um` |
| `mmi1x2` | `W_um`, `L_um`, `wt_um`, `s_um`, `taper_len_um`, `w_io_um` (1-3 smq-design/1 mmi와 같은 의미) |
| `mzm` | `L_e_um`, `gap_um`, `signal_um`(15), `ground_um`(50, 추상), `arm_sep_um`, `RT_ohm`, `mmi{…}`, `heater{L_um, w_um, h_um, x0_um}`, `sbend{kind, len, dx, dy, a, shape | th, R}`, `local{prims, mmi_in{x_um, mirror}, mmi_out{x_um, mirror}, rects}` |
| `mrr` | `ring` = 2-3R `exportGeom` 그대로 (`pcell: "ring_allpass"`, `R_um` = 레이아웃 반경, `gap_um`, `w_um`, `bus_w_um`, `bus_len_um`, rib, junction, heater, predicted, model, `local_pads: false`), `local{prims, ring_x_um, ring_y_um, transition}` |
| `tap_pd` | `Lc_um`, `gap_um`, `ratio`(0.02), `pd_L_um`, `pd_w_um`, `local{prims, rects}` |
| `mrr_wdm` | WDM8 공유 버스: `rings[]` (링마다 2-3R `exportGeom` + `R_um` = 3W 계단/같은 반경, `bus_len_um`, `channel`), `pitch_um`, `channels`, `grid_GHz`, `radii`, `assignment`, `local{prims (끝 전이 + 링 사이 Si 버스 필러, layer "si"), ring_x_um[], ring_y_um[], transition}` — 포트 `in`, `out`, `rf_s{k}`, `rf_g{k}`, `h_p{k}`, `h_n{k}` |

`local` = 소자 내부 형상(소자 로컬 좌표: 광 입력 포트가 원점, 진행 +x):

| 필드 | 뜻 |
|---|---|
| `prims[]` | 아래 routing과 같은 기본 도형(L/C/A). `layer`가 없으면 플랫폼 코어, `"si"`면 Si 층(SiN 플랫폼의 이종 Si 전이). MZM: 입력 MMI 출력 → 팔(S-bend + 직선) → 출력 MMI 입력. 탭: 관통 도파로, 결합 팔, S-bend, PD 아래 도파로. 링: 버스 ↔ w₀ 전이(Si 선형 테이퍼 / SiN·Si 공동 테이퍼) |
| `rects[]` | `{layer: m1|heater|term|ge, role, x0, y0, x1, y1}` — CPW G/S/G, 바이어스 히터, 종단 자리, Ge 흡수층 (주석) |
| `mmi_in`, `mmi_out` | 1-3 MMI 셀 위치 (출력은 x = L에서 180° 회전) |
| `ring_x_um`, `ring_y_um` | `ring_allpass` 셀(버스 중심이 원점)을 놓는 위치 |

## nets

| 종류 | 형식 |
|---|---|
| optical | `{id, from: "INST.port", to: "INST.port", lane, kind: feed|tree|lane|out}` — 출발 포트는 동쪽, 도착 포트는 서쪽 |
| electrical | `{id, kind: rf|dc|rf_term, lane, from: "INST.port", to: "pad:ID" | "R_T … 온칩"}` |

## routing.optical[]

```
{ net, from, to, lane, ok, reason, body_width_um, length_um, loss_dB, prims: [...] }
```

| prim | 필드 | 형상 |
|---|---|---|
| `L` | `a:[x,y]`, `b:[x,y]`, `w` (또는 `w0`→`w1` 선형 테이퍼) | 직선 |
| `C` | `V:[x,y]`, `h_deg`(들어오는 방향), `turn`(+1 왼쪽 / −1 오른쪽), `shape`("arc"/"euler"), `R`, `a0`, `w` | 90° 코너, 꼭짓점 V. 들어오는 직선은 V − a0·(입사 방향)에서 끝나고 나가는 직선은 V + a0·(출사 방향)에서 시작. 원호: a0 = R. Euler: κ_max = 1/R, 클로소이드 쌍, a0 = 1.8701·R (D-1 `spiral_rect`와 같은 `cornerLocal`) |
| `A` | `c:[cx,cy]`, `r`, `a0_deg`, `a1_deg`, `w` | 원호 (작은 S-bend) |

prim들은 끝점이 이어지고(오차 < 1 nm), 첫 점·끝 점이 포트 위치와 같습니다(`test/t_lab.js`).

## routing.electrical[], pads[]

```
electrical: { net, kind: rf|dc, layer: M1|M2, width_um (RF 10, DC 5), length_um, pts: [[x,y], …] }   — 추상 직교 선 (GDS에 이 폭으로 그림)
pads:       { id, kind: rf|dc, x, y, w, net }                              — 와이어본드 패드 또는 마이크로범프 (정사각형)
abstraction: { implants, rf_metal, termination, not_tape_out_ready: true }
```

전기 배선: RF는 소자 접점에서 패드/범프로 (같은 M1에서 다른 넷과 닿으면 FAIL), DC는 패드 열까지 한 층(M2) 평면 팬아웃 — 열 순서로 패드를 놓고 트랙을 중첩 배정해 교차가 없게 합니다(열이 10 µm보다 가까우면 포트 높이 스텁으로 비킴).

## gds_recheck (smq2gds가 engine_verification.json에 덧붙임)

```
gds_recheck: { schema: "smq-circuit/1#gds-recheck", design_hash, gds, gds_sha1, cells, generator,
               checks: [{group, item, status, detail}], summary: {PASS, WARNING, FAIL, NOT VERIFIED} }
```

검사 목록의 "GDS 재검사" 항목도 PASS/FAIL로 바뀝니다. 항목 설명은 [gds_export.md](gds_export.md).

## 성능 모델과 형상의 연결

- 링 반경 = 2-3R 레이아웃 반경 (공진 정렬, 1 nm 격자) — 바꾸면 2-3R 엔진의 공진·FSR·응답과 `ring_allpass` 형상, 레인 높이(배치 여유)가 함께 바뀝니다.
- MZM 길이·간격 = 2-3 설계 → 다이 폭, 레인 높이, RF 급전 손실.
- 배선 손실 = 형상(길이·폭·곡률)에서 계산 → 시스템 예측(3A+ 마진 − 배선 손실).
- 형상만으로 성능을 예측할 수 없는 항목(RF EM, 열 크로스토크, 파운드리 규칙)은 `verification.checks`에 NOT VERIFIED로 남습니다.

## 버전 규칙

필드를 바꾸면 `src/lab/engine.js`(`exportCircuit`), `tools/export_circuit.js`, `tools/smq2gds/circuit.py`, `test/t_lab.js`, `test/py/test_circuit.py`를 함께 고치고 예제를 다시 만듭니다(`node tools/export_circuit.js all` → `npm run test:py`). 호환되지 않는 변경은 `smq-circuit/2`로 올립니다.
