// ===== Campaign: Track A (1.6T transceiver) =====
// Text and structure live here; platform-specific numbers (start design, thresholds, references) live in PSPEC
// (tools/calibrate.js → src/data/pspec.js). Thresholds are "표준" values; difficulty modes scale them.
const nm = (v) => Math.round(v * 1000);
const LEVELS = [
  { id: '1-1', stage: 1, kind: 'wg', name: '도파로와 모드', dev: 'Strip waveguide · TE / TM',
    band: (pf) => `${nm(pf.lam)} nm · ${MATS[pf.mat].full} in SiO₂`,
    brief: '모든 광회로의 출발점입니다. 코어(Si 또는 SiN)가 SiO₂(아래는 BOX, 위는 상부 클래딩)에 둘러싸여 있습니다. 폭을 바꾸며 어떤 모드가 갇히는지 관찰하세요. 아래 세 가지 관찰 미션을 마치면 ★, 실제로 쓸 배선 도파로를 설계하면 ★★입니다.',
    concepts: [
      ['TE 모드', '전기장이 주로 기판과 평행한 폭 방향(Ex)으로 진동합니다. 얇고 넓은 도파로에서 가장 잘 갇혀 대부분의 Si 소자는 TE 기준으로 설계합니다.'],
      ['TM 모드', '전기장이 두께 방향(Ey)입니다. 얇은 방향으로 눌려 덜 갇히므로 n<sub>eff</sub>가 낮고, 기판 쪽으로 더 퍼집니다.'],
      ['유효굴절률 n<sub>eff</sub>', '모드가 느끼는 평균 굴절률. n<sub>SiO₂</sub> < n<sub>eff</sub> < n<sub>core</sub>이면 guided, n<sub>SiO₂</sub> 아래로 내려가면 차단(cut-off)되어 클래딩으로 빠져나갑니다.'],
      ['단일모드 vs 멀티모드', '폭이 좁으면 기본모드(TE0, TM0)만 갇힙니다. 넓히면 TE1, TE2…가 차례로 생깁니다. 배선은 단일모드, 간섭을 이용하는 MMI는 일부러 멀티모드를 씁니다.']
    ],
    role: '모든 회로의 배선' },
  { id: '1-2', stage: 1, kind: 'dc', name: '두 도파로의 대화', dev: 'Directional coupler',
    band: (pf) => `${nm(pf.lam)} nm ±20 nm`,
    brief: '1-1의 단일모드 도파로 두 개를 가까이 붙이면 빛이 옆으로 건너갑니다. 갭과 결합 길이로 건너가는 양을 조절해 완전 결합과 3-dB 분배를 만들어 보세요. 파장과 공정에 얼마나 민감한지 느껴보는 것이 이 레벨의 진짜 목적입니다.',
    concepts: [
      ['슈퍼모드', '두 도파로가 가까우면 하나의 구조로 보고 짝(even)·홀(odd) 모드로 나눠 생각합니다. 두 모드의 n<sub>eff</sub> 차이 Δn이 결합 세기입니다.'],
      ['맥놀이 (beating)', '입력 빛은 두 슈퍼모드의 합입니다. 진행하며 위상차가 쌓여 L<sub>π</sub> = λ/(2Δn)마다 빛이 완전히 건너갔다 돌아옵니다.'],
      ['민감도', 'Δn은 갭에 지수적으로 의존하고 파장에 따라 변합니다. 그래서 방향성 결합기는 간단하지만 공정·파장에 민감합니다 → 다음 레벨의 MMI가 필요한 이유.']
    ],
    role: '탭·분배 (공정 민감형)' },
  { id: '1-3', stage: 1, kind: 'mmi', type: '1x2', name: '첫 번째 분기', dev: '1×2 MMI Splitter',
    band: (pf) => `${nm(pf.lam)} nm`,
    brief: '폭이 넓은 멀티모드 구간(MMI)에서는 여러 모드가 간섭하며 특정 길이마다 입력의 상이 복제됩니다(자기결상). 길이 L이 결상점에 맞으면 두 개의 밝은 상이 정확히 출력 포트 위에 맺힙니다. 지금은 L이 어긋나 있습니다.',
    concepts: [['자기결상', 'MMI 안의 모드들이 서로 다른 속도로 진행하다 특정 길이에서 위상이 다시 맞아 입력 상이 N개로 복제됩니다. 1×2 대칭 분기는 L = 3L<sub>π</sub>/8.'], ['DC와 비교', '같은 50:50 분배를 하지만 결상 원리라 공정·파장에 훨씬 둔감합니다.']],
    role: '스플리터 · 모니터 탭' },
  { id: '1-4', stage: 1, kind: 'mmi', type: '1x2', name: '광대역 컴팩트', dev: '1×2 MMI Splitter',
    band: (pf) => `${nm(pf.bb[0])}–${nm(pf.bb[1])} nm`,
    brief: '대역 전체에서 손실을 낮게 유지하면서 면적을 줄이세요. 결상 길이는 W²/λ에 비례하므로, 짧고 좁은 MMI일수록 파장에 둔감해집니다. 단, 좁아질수록 포트 간격 DRC가 발목을 잡습니다.',
    concepts: [['대역폭', '결상 길이가 λ에 반비례하므로 파장이 바뀌면 결상점이 밀립니다. MMI가 짧을수록 밀리는 양이 작습니다.']],
    role: '광대역 파워 분배' },
  { id: '1-5', stage: 1, kind: 'mmi', type: '2x2', name: '3-dB 커플러', dev: '2×2 MMI Coupler',
    band: (pf) => `CWDM ${nm(pf.ch[0])}–${nm(pf.ch[3])} nm`,
    brief: '아래쪽 입력의 빛을 BAR/CROSS 두 포트로 절반씩 나누세요. 포트 피치 s를 바꾸면 general interference(3Lπ/2)와 paired interference(Lπ/2) 사이를 오갈 수 있습니다. 이 레벨의 카드는 1-7 CWDM 필터의 커플러로 쓸 수 있습니다.',
    concepts: [['General vs Paired', '입력 위치가 자유로우면 3L<sub>π</sub>/2에서, 입력을 ±W<sub>e</sub>/6에 두면 일부 모드가 여기되지 않아 L<sub>π</sub>/2에서 3-dB 상이 생깁니다.']],
    role: 'MZI·lattice 커플러' },
  { id: '1-6', stage: 1, kind: 'ssc', name: '칩과 광섬유 잇기', dev: 'Spot-Size Converter (inverse taper)',
    band: (pf) => `${nm(pf.lam)} nm · 렌즈드 파이버 MFD 3 µm`,
    brief: '렌즈를 만드는 게임이 아닙니다. 칩 가장자리(facet)에서 도파로 끝을 점점 가늘게 깎아(inverse taper) 모드를 코어 밖으로 퍼뜨려, 광섬유 모드(MFD 3 µm) 크기에 맞추는 칩 위 구조를 설계합니다. 광섬유는 고정이고, 당신이 정하는 것은 팁 폭·테이퍼 길이·테이퍼 모양 세 가지입니다.',
    concepts: [
      ['왜 필요한가', '단일모드 도파로의 모드는 0.3–1 µm, 광섬유 모드는 3–10 µm입니다. 그대로 맞대면 크기 차이로 대부분의 빛을 잃습니다.'],
      ['Inverse taper', '도파로를 좁히면 코어가 빛을 붙잡지 못해 모드가 SiO₂로 퍼집니다. 팁이 적당히 좁으면 퍼진 모드가 광섬유 모드와 크기가 같아집니다.'],
      ['세 가지 손실', '① 팁 모드와 광섬유 모드의 크기 차이(부정합) ② 테이퍼가 급해서 생기는 방사(비단열) ③ 너무 퍼진 모드가 BOX를 뚫고 Si 기판으로 새는 누설.']
    ],
    role: '광섬유 I/O (Tx·Rx)' },
  { id: '1-7', stage: 1, kind: 'cwdm', finale: true, name: '네 가지 색', dev: 'CWDM Demux · MZI Lattice Tree',
    band: (pf) => `CWDM ${pf.ch.map(nm).join('/')} nm ±6.5 nm`,
    brief: '네 파장 채널을 네 포트로 나누세요. 1단 인터리버(FSR 40 nm)가 홀짝을, 2단 필터(FSR 80 nm)가 나머지를 가릅니다. 지연 ΔL이 FSR을, 위상 트림이 중심 파장을 정합니다. 사인형 응답으로는 크로스토크가 부족하니 lattice 차수를 올려야 합니다.',
    preface: '<b>Stage 1 피날레 · Active 맛보기.</b> 지금까지 익힌 패시브 소자(도파로, 커플러, 지연선)만으로 파장 필터를 만들어 봅니다. 이 레벨의 ★★★(수율)는 패시브 설계만으로는 거의 닿지 않도록 되어 있습니다 — 두께가 몇 nm만 달라도 채널 전체가 밀리기 때문입니다. 이 벽을 넘는 방법(히터로 위상을 맞추는 TO 위상기)이 Stage 2 Active의 첫 레벨입니다.',
    concepts: [['FSR', 'MZI의 투과 주기. FSR = λ²/(n<sub>g</sub>ΔL). 지연 길이가 길수록 주기가 짧아집니다.'], ['Lattice 필터', '커플러와 지연을 여러 단 쌓으면 통과대역이 평평해져(flat-top) 이웃 채널 누설이 줄어듭니다.'], ['왜 Active가 필요한가', '공정 오차로 생긴 위상 오차는 칩마다 다릅니다. 만든 뒤 히터로 위상을 보정하는 것이 현실적인 해법입니다.']],
    role: '2×FR4 Rx Demux · Tx Mux' },
  { id: '2-1', stage: 2, locked: true, name: 'TO 위상기', dev: 'Thermo-optic phase shifter', role: 'CWDM 트리밍 · 바이어스' },
  { id: '2-2', stage: 2, locked: true, name: 'PN 공핍 위상기', dev: 'Carrier-depletion phase shifter', role: '변조기 코어' },
  { id: '2-3', stage: 2, locked: true, name: '224G TW-MZM', dev: 'Traveling-wave MZM', role: '200G/lane PAM4 Tx' },
  { id: '2-4', stage: 2, locked: true, name: 'Ge PD + TIA', dev: 'Germanium photodetector', role: '200G/lane Rx' },
  { id: '2-5', stage: 2, locked: true, name: '외부 광원', dev: 'ELS · DFB laser', role: 'CW 광원' },
  { id: '3A', stage: 3, locked: true, name: '1.6T 2×FR4', dev: '8×200G PAM4 transceiver', role: '캡스톤' },
  { id: '3A+', stage: 3, locked: true, name: '1.6T DR8 / CPO', dev: 'Parallel optics · co-packaged engine', role: '캡스톤 확장' }
];
const STAGES = { 1: 'Stage 1 · Passive', 2: 'Stage 2 · Active', 3: 'Stage 3 · System (Track A)' };
