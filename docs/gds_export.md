# GDS 내보내기 — PIC Design Lab → smq2gds (Phase D)

PIC Design Lab이 내보낸 회로 데이터(`smq-circuit/1`)를 `tools/smq2gds/circuit.py`가 계층 GDS로 그리고, KLayout으로 **다시 읽어** 형상을 회로 데이터와 대조합니다. 결과는 구조 검증이 가능한 **Engineering Prototype**입니다. Tape-out Ready Mask가 아닙니다 (Generic PDK, 능동층·금속은 주석 레이어).

```
게임 (Lab, 브라우저) ──smq-circuit/1──▶ smq2gds.circuit ──▶ engine_layout.gds        (계층: 소자 셀 · routes · metal)
  engine_schematic.json                                 ├─▶ engine_preview.png        (전체 다이 + 레인 0 확대)
  engine_layout.json      (design_hash)                 └─▶ engine_verification.json  (게임 검사 + gds_recheck)
  engine_verification.json                                        │
        ▲                                                         │
        └──── Mission 6 "GDS 재검사 결과 불러오기" ◀────────────────┘   design_hash가 같고 FAIL 0 → Geometry Rechecked ✓
```

## 1. 사용

```bash
pip install -r tools/smq2gds/requirements.txt          # gdsfactory, klayout, matplotlib
# 게임: Lab → Mission 6 → smq-circuit/1 내보내기 (3개 파일: <플랫폼>_engine_*.json)
cd tools
python -m smq2gds.circuit ~/Downloads/si1310_engine_layout.json -o out/
#   → out/engine_layout.gds, out/engine_preview.png, out/engine_verification.json  (FAIL이 있으면 종료 코드 1)
# 게임: Mission 6 → "GDS 재검사 결과 불러오기" → out/engine_verification.json
```

| 옵션 | 뜻 |
|---|---|
| `-o DIR` | 출력 폴더 (기본: layout 파일 옆) |
| `--verification F` | 갱신할 게임 검증 파일 (기본: 이름의 `engine_layout` → `engine_verification`) |
| `--layers F` | 층 지도 yaml (기본 `layers.yaml`; 파운드리 PDK 번호로 바꿔 쓸 수 있음) |
| `--no-png` | 미리보기 생략 |

예제: `node tools/export_circuit.js all` (4 플랫폼 × MZM DR8 / MRR DR8 / MRR WDM8, 게임과 같은 엔진) → `tools/smq2gds/examples/circuit/`. 생성 결과 예시: [docs/gds/](gds/) (si1310·sin1550 × MZM DR8·MRR DR8·MRR WDM8: GDS, PNG, verification). WDM8은 [wdm8.md](wdm8.md).

## 2. 무엇을 그리나 — 게임과 같은 도형

| 대상 | GDS 셀 | 형상의 출처 |
|---|---|---|
| 입·출력 SSC | `smq_ssc_*` | 팁 → w₀ 선형 역테이퍼 (1-6 `Lt`, `tip`) |
| 1×2 MMI (분배 트리) | `smq_mmi_*` | 1-3 PCell(`pcells.mmi`, gdsfactory mmi1x2) — 입력 포트를 원점으로 |
| TW-MZM | `smq_mzm_*` | 입력 MMI + 거울상 출력 MMI(x = L) + `params.local.prims`(팔 S-bend 4개 + 팔 직선) + `local.rects`(CPW G/S/G → M1, 바이어스 히터, R_T 자리) |
| 링 (MRR) | `smq_mrrlane_*` ⊃ `smq_ring_*` | 2-3R `ring_allpass`(반경 = 레이아웃 반경) + `local.prims`(버스 ↔ w₀ 전이: Si는 선형 테이퍼, SiN 플랫폼은 SiN/Si 공동 테이퍼 60 µm) |
| WDM8 공유 버스 | `smq_mrrwdm_*` ⊃ `smq_ring_*` ×(서로 다른 반경 수) | 링 k = 2-3R `ring_allpass` (반경 R<sub>k</sub>, 3W 계단 반경) at `ring_x_um[k]`, 링 사이 Si 버스 필러와 버스 양 끝 전이(`local.prims`) |
| 모니터 탭 + PD | `smq_tap_pd_*` | `local.prims`(관통 도파로, 2 % 결합 팔, S-bend, PD 아래 도파로) + Ge 사각형 |
| 광 배선 | `smq_routes_*` | `routing.optical[].prims` (L 직선/테이퍼, C 90° 원호·Euler 코너, A 원호) |
| 금속 | `smq_metal_*` | `routing.electrical[]` 선(폭 `width_um`: RF 10 µm → M1, DC 5 µm → M2) + 패드/범프 정사각형 |
| 다이 | top | FLOORPLAN 외곽선 + 라벨("ENGINEERING PROTOTYPE, NOT TAPE-OUT READY", design hash) |

- 같은 종류·같은 파라미터의 소자는 **한 셀**을 여러 번 참조합니다(8개 변조기 → 셀 1개). top의 참조 수 = 소자 수 + routes + metal.
- 기본 도형은 게임과 같은 식으로 다시 계산합니다: 코너는 D-1 직사각형 나선과 같은 `pcells._corner_local`(원호 a₀ = R, Euler a₀ = 1.8701·R, κ_max = 1/R), 원호는 새깃 ≤ 1 nm로 샘플. 리본 법선은 각 도형 끝에서 **정확한 접선**(직선 방향, 코너 입·출사 방향, 원호 해석 접선)을 써서, 포트에서 맞닿는 두 도형 사이에 노치가 생기지 않습니다.
- 좌표는 1 nm GDS 격자: 게임이 배치·포트·소자 길이를 1 nm로 맞춰 내보내므로, 셀 꼭짓점과 배선 끝점이 같은 정수 좌표로 반올림됩니다.

### 층 (layers.yaml, Generic PDK)

| 층 | 번호 | 쓰임 |
|---|---|---|
| si / sin | 1/0, 34/0 | 도파로 코어 (플랫폼 재료). SiN 플랫폼의 링은 이종 Si(1/0) |
| slab, n, p | 3/0, 20/0, 21/0 | 링 리브 슬랩·주입 (주석) |
| heater | 47/0 | 링·MZM 히터 (주석) |
| m1 (= pad) | 41/0 | RF CPW·RF 선·RF 패드/범프 |
| m2 | 45/0 | DC 선·DC 패드/범프 |
| ge | 5/0 | Ge PD 흡수층 (주석) |
| term | 49/0 | 온칩 종단 저항 자리 (주석) |
| floorplan, label | 64/0, 66/0 | 다이 외곽, 라벨 |

## 3. 재검사 — 파일을 다시 읽어서

GDS가 **열리는 것만으로는 아무것도 PASS가 아닙니다.** `recheck()`는 쓰인 GDS를 KLayout으로 다시 읽고, 회로 데이터(JSON)와 독립적으로 잰 값을 비교합니다.

| 묶음 | 항목 | 방법 |
|---|---|---|
| GDS | 입력 일치 | verification의 `design_hash` = layout의 `design_hash` (세 파일이 같은 내보내기) |
| GDS | 다시 읽기 | top cell 1개, 파일 크기 |
| GDS | 계층 | top 참조 = 소자 + 2, 소자 셀 수 ≤ 소자 수 |
| Connectivity | 광 코어 조각 수 | 코어 층(SiN 플랫폼은 SiN ∪ Si) 병합 조각 = 레이저 수(트리 + 레인) + 링 수(링은 간격으로 떨어진 조각, WDM8 버스 안의 링 포함) + 탭 결합 팔 수 |
| Connectivity | 레인 경로 | 출력마다(DR8 8개 · WDM8 1개) 입력 광섬유 단면과 출력 단면 바로 안쪽 점이 **같은 병합 조각** |
| Geometry | 포트에 도파로 | 모든 광 포트에서 0.05 µm 안쪽에 코어가 있음 |
| Geometry | 배선 끝점 | 도형으로 다시 계산한 중심선의 첫·끝 점 = 포트 좌표 (1 nm) |
| Geometry | 배선 길이 | Python 중심선 길이 = 게임 `length_um` (0.1 %) |
| Geometry | 소자 외곽 | 그려진 셀 참조의 bbox ⊂ 게임 bbox (±0.01 µm) |
| DRC | 간격 · 선폭 · 굽힘 | 층별 `space_check`(규칙 간격) · `width_check`(Si 0.15 / SiN 0.3 µm, SSC 팁 영역 제외 — 팁은 WARNING으로 따로) · 모든 C/A 반경 ≥ R_min |
| DRC | 다이 경계 | 코어 bbox가 다이 안, 위·아래 여백 |
| Connectivity | 출력 단면 | 동쪽 가장자리에 `architecture.outputs`개 (8 / 1) |
| Electrical | RF (M1) · DC (M2) | 넷마다 [소자 접점, 선 끝, 패드 중심]이 한 병합 조각(끊김 없음), 한 조각에 두 넷 없음(단락 없음) |
| Electrical | 패드 수 | 패드 = RF + DC 넷 |
| Model validity | 추상화 | 주입·히터·Ge·금속·종단 = 주석 층 → **NOT VERIFIED** (파운드리 규칙 아님) |
| Model validity | SiN ↔ Si 전이 | 이종 Si 링의 공동 테이퍼는 평면도만 — 층간 결합 손실·수직 간격 미계산 → WARNING |

결과는 `engine_verification.json`에 `gds_recheck { design_hash, gds, gds_sha1, cells, checks, summary }`로 붙고, 게임 검사 목록의 "GDS 재검사" 항목이 PASS/FAIL로 바뀝니다. 같은 입력이면 GDS 바이트까지 같습니다(sha1 재현).

### 게임으로 되돌리기

Mission 6의 **GDS 재검사 결과 불러오기**:
- `gds_recheck`가 없으면 거부, 다른 플랫폼이면 거부.
- FAIL 개수는 파일의 `summary`가 아니라 `checks`에서 다시 셉니다.
- `design_hash`가 지금 화면의 설계와 같고 FAIL 0이면 진행 칩 **Geometry Rechecked ✓** (v0.x의 "GDS Generated"; 파운드리 준비는 별도 칩 **Foundry Readiness: NOT VERIFIED**), 검사표의 "GDS 재검사" PASS. 설계를 바꾸면 hash가 달라져 "다른 설계"로 표시되고(되돌리면 다시 일치), 다시 내보내고 GDS를 다시 만들어야 합니다.

## 4. 테스트

| 명령 | 내용 |
|---|---|
| `cd tools && python ../test/py/test_circuit.py` | 12개 예제(WDM8 4개 포함, 링 셀 = 서로 다른 반경 수·링 위치·출력 1): 재검사 FAIL 0, 핵심 항목 PASS, `gds_recheck` hash·sha1, **경로 면적 = ∫w ds** (리본·테이퍼·코너·원호를 독립 적분과 비교, 0.2 %), 변조기 셀 1개. 부정 테스트(si1310 MZM, sin1550 MRR): 배선 끝 0.5 µm 어긋남 → 끝점 FAIL · 배선 하나 삭제 → 조각 수·레인 경로 FAIL · 소자 2 µm 이동 → 조각 수·레인 경로 FAIL · RF 패드를 다른 넷 선 위에 → M1 단락 FAIL · 다른 내보내기의 verification → 입력 일치 FAIL. WDM8 링 셀 3 µm 이동 → 연결 FAIL. Euler/원호 코너 끝점·접선·최소 반경 |
| `npm run test:py` | 위 + 소자 단위 smq-design/1 테스트 |
| `node test/t_lab.js` | 1 nm 격자, 소자 로컬 도형 연속·MMI/포트 일치, 내보내기의 금속 폭·design hash, DC 평면 팬아웃(24 변형), 불러온 재검사 → GDS 재검사 PASS/FAIL/다른 설계 |
| `node test/e2e/lab.js <플랫폼>` | 화면에서 불러오기: gds_recheck 없음 거부, hash 불일치, FAIL, 일치 → Geometry Rechecked ✓, 설계 변경 → stale, 복원 → 일치 |

## 5. 한계 (정직하게)

- **Tape-out Ready 아님.** Generic PDK 층 번호, 파운드리 DRC·LVS·밀도·안테나 규칙 없음. 주입·히터·Ge·종단·금속은 추상 주석 형상.
- 금속은 RF(M1)·DC(M2) 각 **한 층의 추상 선**입니다. 비아·패시베이션 개구·CPW 접지 연속성·RF 전자기는 없습니다. RF·DC 선은 광 도파로 위를 지나갈 수 있고(산화막 위 금속), 그 광 손실은 계산하지 않습니다(게임은 RF–도파로 교차를 WARNING으로 표시).
- DC는 한 층 평면 팬아웃(river routing): 패드를 열(column) 순서로 두고 트랙을 중첩 배정해 교차가 없습니다. 열이 10 µm보다 가까우면 포트 높이의 짧은 스텁으로 비킵니다. 트랙 수 × 10 µm가 DC 쪽 여백이 되어, 가장자리 패드 MZM 다이 높이가 2.5 → 2.7 mm가 됐습니다.
- 링의 안쪽(P) 접점 RF 선은 링 위를 지나는 추상 선입니다(실제로는 상위 금속 + 비아).
- SiN 플랫폼의 이종 Si 링: SiN/Si 공동 테이퍼는 평면도 형상이며 층간 결합·수직 간격·손실은 모델링하지 않습니다(WARNING).
- MMI·SSC 내부의 광학은 각 레벨 엔진/솔버 검증 범위이고, 회로 GDS는 형상만 대조합니다. 모드 솔버·EME를 회로 전체에 돌리지는 않습니다.
- 광 I/O는 입력 서쪽·출력 동쪽만 (U-turn 없음). 레인 간 열 크로스토크·링 락 상호작용은 NOT VERIFIED.
