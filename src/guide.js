// ===== Learning Guide (원리 배우기): A objectives · B physical principle · C parameters · D interactive example ·
//       E mission connection · F model limitations · G references — for every level, offline.
// The parameter table is generated from the level's live parameter definitions (so names and units can never drift),
// the interactive example evaluates the same kind engine on a copy of the design, and the mission section reads the live
// objectives. The guide never writes to the design, the score, the stars or the progress.
// Roles: Learning Guide = 원리·변수 학습 / Coach = 지금 설계의 다음 한 수 / Hint = 목표 수치·방향 / Physics engine = 평가.
// All figures are drawn here as own schematics (SVG); no third-party figure is reproduced.
(() => {
  const $ = (s) => document.querySelector(s);
  const strip = (h) => String(h == null ? '' : h).replace(/<[^>]+>/g, '');
  const nm = (v) => Math.round(v * 1000);
  // model-fidelity classes (one vocabulary for the whole game): Analytical · Physics-informed Surrogate · Calibrated ·
  // Experimental Reference · Unverified Assumption — plus a flag for what only a full-wave / TCAD solver can settle
  const CLS = {
    an: ['Analytical', 'b-an', '닫힌 식'], semi: ['Physics-informed Surrogate', 'b-semi', '물리 기반 근사 모델'], pre: ['Physics-informed Surrogate · 사전계산 솔버', 'b-pre', '오프라인 모드·열 솔버 결과 테이블'],
    emp: ['Calibrated', 'b-emp', '측정값에 맞춘 상수'], exp: ['Experimental Reference', 'b-exp', '문헌 측정값을 비교 기준으로 사용'], asm: ['Unverified Assumption', 'b-asm', '검증되지 않은 대표값 가정'],
    fw: ['Full-wave / TCAD Verification Required', 'b-fw', '게임 밖 솔버로 검증 필요']
  };
  /* ---------- references (checked links; DOIs resolve to the publisher) ---------- */
  const REF = {
    chrost: { t: 'L. Chrostowski, M. Hochberg, Silicon Photonics Design: From Devices to Systems (Cambridge University Press, 2015)', u: 'https://doi.org/10.1017/CBO9781316084168', n: '도파로·커플러·MZI·변조기·수광기 설계의 표준 교재' },
    rp_wg: { t: 'RP Photonics Encyclopedia — Waveguides', u: 'https://www.rp-photonics.com/waveguides.html' },
    rp_modes: { t: 'RP Photonics Encyclopedia — Modes', u: 'https://www.rp-photonics.com/modes.html' },
    rp_neff: { t: 'RP Photonics Encyclopedia — Effective Refractive Index', u: 'https://www.rp-photonics.com/effective_refractive_index.html' },
    rp_ng: { t: 'RP Photonics Encyclopedia — Group Index', u: 'https://www.rp-photonics.com/group_index.html' },
    rp_fsr: { t: 'RP Photonics Encyclopedia — Free Spectral Range', u: 'https://www.rp-photonics.com/free_spectral_range.html' },
    rp_ifm: { t: 'RP Photonics Encyclopedia — Interferometers', u: 'https://www.rp-photonics.com/interferometers.html' },
    rp_filt: { t: 'RP Photonics Encyclopedia — Optical Filters', u: 'https://www.rp-photonics.com/optical_filters.html' },
    rp_wdm: { t: 'RP Photonics Encyclopedia — Wavelength Division Multiplexing (CWDM 절)', u: 'https://www.rp-photonics.com/wavelength_division_multiplexing.html#Coarse-Wavelength-Division-Multiplexing' },
    rp_cpl: { t: 'RP Photonics Encyclopedia — Fiber Couplers (결합 원리 일반)', u: 'https://www.rp-photonics.com/fiber_couplers.html' },
    rp_bs: { t: 'RP Photonics Encyclopedia — Beam Splitters', u: 'https://www.rp-photonics.com/beam_splitters.html' },
    rp_bend: { t: 'RP Photonics Encyclopedia — Bend Losses', u: 'https://www.rp-photonics.com/bend_losses.html' },
    rp_prop: { t: 'RP Photonics Encyclopedia — Propagation Losses', u: 'https://www.rp-photonics.com/propagation_losses.html' },
    rp_mfc: { t: 'RP Photonics Encyclopedia — Mode Field Converters', u: 'https://www.rp-photonics.com/mode_field_converters.html' },
    rp_mr: { t: 'RP Photonics Encyclopedia — Mode Radius', u: 'https://www.rp-photonics.com/mode_radius.html' },
    rp_sip: { t: 'RP Photonics Encyclopedia — Silicon Photonics', u: 'https://www.rp-photonics.com/silicon_photonics.html' },
    rp_pic: { t: 'RP Photonics Encyclopedia — Photonic Integrated Circuits', u: 'https://www.rp-photonics.com/photonic_integrated_circuits.html' },
    rp_mod: { t: 'RP Photonics Encyclopedia — Optical Modulators', u: 'https://www.rp-photonics.com/optical_modulators.html' },
    rp_eom: { t: 'RP Photonics Encyclopedia — Electro-optic Modulators', u: 'https://www.rp-photonics.com/electro_optic_modulators.html' },
    rp_pd: { t: 'RP Photonics Encyclopedia — Photodiodes', u: 'https://www.rp-photonics.com/photodiodes.html' },
    rp_det: { t: 'RP Photonics Encyclopedia — Photodetectors', u: 'https://www.rp-photonics.com/photodetectors.html' },
    rp_ofc: { t: 'RP Photonics Encyclopedia — Optical Fiber Communications', u: 'https://www.rp-photonics.com/optical_fiber_communications.html' },
    rp_tx: { t: 'RP Photonics Encyclopedia — Telecom Transmitters', u: 'https://www.rp-photonics.com/telecom_transmitters.html' },
    rp_dl: { t: 'RP Photonics Encyclopedia — Optical Delay Lines', u: 'https://www.rp-photonics.com/optical_delay_lines.html' },
    rp_lidar: { t: 'RP Photonics Encyclopedia — LIDAR', u: 'https://www.rp-photonics.com/lidar.html' },
    rp_chirp: { t: 'RP Photonics Encyclopedia — Chirp', u: 'https://www.rp-photonics.com/chirp.html' },
    rp_lw: { t: 'RP Photonics Encyclopedia — Linewidth', u: 'https://www.rp-photonics.com/linewidth.html' },
    rp_het: { t: 'RP Photonics Encyclopedia — Optical Heterodyne Detection', u: 'https://www.rp-photonics.com/optical_heterodyne_detection.html' },
    rp_scan: { t: 'RP Photonics Encyclopedia — Laser Scanners', u: 'https://www.rp-photonics.com/laser_scanners.html' },
    soldano: { t: 'L. B. Soldano, E. C. M. Pennings, "Optical multi-mode interference devices based on self-imaging: principles and applications," J. Lightwave Technol. 13(4), 615–627 (1995)', u: 'https://doi.org/10.1109/50.372474', n: 'MMI 자기결상(self-imaging)의 원전' },
    horst: { t: 'F. Horst et al., "Cascaded Mach-Zehnder wavelength filters in silicon photonics for low loss and flat pass-band WDM (de-)multiplexing," Opt. Express 21, 11652 (2013)', u: 'https://doi.org/10.1364/OE.21.011652', n: '1-7과 같은 MZI lattice 트리 CWDM Demux' },
    madsen: { t: 'C. K. Madsen, J. H. Zhao, Optical Filter Design and Analysis: A Signal Processing Approach (Wiley, 1999)', n: 'Lattice 필터 합성(결합비·위상) 이론' },
    okamoto: { t: 'K. Okamoto, Fundamentals of Optical Waveguides, 2nd ed. (Academic Press, 2006)', n: '결합 모드 이론, 방향성 결합기, 슬랩·채널 도파로' },
    payne: { t: 'F. P. Payne, J. P. R. Lacey, "A theoretical analysis of scattering loss from planar optical waveguides," Opt. Quantum Electron. 26, 977–986 (1994)', u: 'https://doi.org/10.1007/BF00708101', n: '측벽 거칠기 산란 손실 모델' },
    marcuse: { t: 'D. Marcuse, "Bending losses of the asymmetric slab waveguide," Bell Syst. Tech. J. 50(8), 2551–2563 (1971)', u: 'https://www.nokia.com/bell-labs/publications-and-media/publications/bending-losses-of-the-asymmetric-slab-waveguide/', n: '굽힘 방사 손실 C₁·exp(−U·R)' },
    almeida: { t: 'V. R. Almeida, R. R. Panepucci, M. Lipson, "Nanotaper for compact mode conversion," Opt. Lett. 28, 1302 (2003)', u: 'https://doi.org/10.1364/OL.28.001302', n: 'Si 역테이퍼 SSC' },
    harris: { t: 'N. C. Harris et al., "Efficient, compact and low loss thermo-optic phase shifter in silicon," Opt. Express 22(9), 10487 (2014)', u: 'https://doi.org/10.1364/OE.22.010487', n: 'arXiv:1410.3616 공개본' },
    soref: { t: 'R. A. Soref, B. R. Bennett, "Electrooptical effects in silicon," IEEE J. Quantum Electron. 23(1), 123–129 (1987)', u: 'https://doi.org/10.1109/JQE.1987.1073206', n: '자유 캐리어 굴절률·흡수 변화 (plasma dispersion)' },
    reed: { t: 'G. T. Reed et al., "Silicon optical modulators," Nature Photonics 4, 518–526 (2010)', u: 'https://doi.org/10.1038/nphoton.2010.179' },
    michel: { t: 'J. Michel, J. Liu, L. C. Kimerling, "High-performance Ge-on-Si photodetectors," Nature Photonics 4, 527–534 (2010)', u: 'https://doi.org/10.1038/nphoton.2010.157' },
    cwwdm: { t: 'CW-WDM MSA — O-band 다파장(8/16/32파장) 연속광 광원 규격', u: 'https://cw-wdm.org/', n: 'WDM 링 송신기용 다파장 외부 광원 (콤·DFB 배열)' },
    krish11: { t: 'A. V. Krishnamoorthy et al., "Exploiting CMOS Manufacturing to Reduce Tuning Requirements for Resonant Optical Devices," IEEE Photonics Journal 3(3), 567–579 (2011)', u: 'https://doaj.org/article/68ebd1f292c946b98df1dfedde066c0d', n: '가까운 링끼리의 간격·FSR은 웨이퍼 간에도 잘 맞고 절대 위치는 안 맞음 → 200 GHz 격자 정렬에 채널당 평균 < 1.2 nm 튜닝' },
    choi24: { t: 'S. Choi, V. Stojanović, "Scalable Wavelength Arbitration for Microring-based DWDM Transceivers," arXiv:2411.14810 (2024)', u: 'https://arxiv.org/abs/2411.14810', n: '공진 배정 정책: 고정(Lock-to-Deterministic) · 순환(Lock-to-Cyclic, 배럴 시프트) · 임의(Lock-to-Any) — 튜닝 범위 LtD > LtC > LtA' },
    padma14: { t: 'K. Padmaraju, K. Bergman, "Resolving the thermal challenges for silicon microring resonator devices," Nanophotonics 3(4–5), 269–281 (2014)', u: 'https://nanophotonics-journal.com/issues/volume03/volume3_issue04', n: '링 열 안정화·락 방식 리뷰' },
    sun15: { t: 'C. Sun et al., "Single-chip microprocessor that communicates directly using light," Nature 528, 534–538 (2015)', u: 'https://doi.org/10.1038/nature16454', n: '한 버스의 링 WDM 송수신과 열 튜닝' },
    ieee3dj: { t: 'IEEE P802.3dj — 200 Gb/s, 400 Gb/s, 800 Gb/s and 1.6 Tb/s Ethernet Task Force', u: 'https://www.ieee802.org/3/dj/', n: '1.6T(8×200G) 광 PMD 표준화 현황' },
    oif: { t: 'Optical Internetworking Forum (OIF) — CPO·외부 광원(ELSFP) 등 구현 협약', u: 'https://www.oiforum.com/' },
    bogaerts: { t: 'W. Bogaerts et al., "Silicon microring resonators," Laser & Photonics Reviews 6(1), 47–73 (2012)', u: 'https://doi.org/10.1002/lpor.201100017', n: 'all-pass/add-drop 전달함수, Q, 결합 영역 — 이 레벨의 링 식' },
    sacher: { t: 'W. D. Sacher, J. K. S. Poon, "Dynamics of microring resonator modulators," Opt. Express 16(20), 15741–15753 (2008)', u: 'https://doi.org/10.1364/OE.16.015741', n: '결합 모드 이론 소신호 응답, 디튜닝 피크' },
    xu05: { t: 'Q. Xu, B. Schmidt, S. Pradhan, M. Lipson, "Micrometre-scale silicon electro-optic modulator," Nature 435, 325–327 (2005)', u: 'https://doi.org/10.1038/nature03569', n: '최초의 µm급 Si 링 변조기' },
    yuan24: { t: 'Y. Yuan et al., "A 5 × 200 Gbps microring modulator silicon chip empowered by two-segment Z-shape junctions," Nature Communications 15, 918 (2024)', u: 'https://doi.org/10.1038/s41467-024-45301-3', n: '실험 기준: R 12 µm, Q≈3700, 11–16 pm/V, EO ≈49 GHz, 바깥 ER 3.6 dB, 히터 73 pm/mW' },
    huang26: { t: 'Z. Huang et al., "Co-design of Silicon Microring Modulator beyond 200 Gb/s per Lane: Device Physics, Operating Point, and Compact Models for Scale-Up and Scale-Out Optical I/O," arXiv:2609.36690 (2026)', u: 'https://arxiv.org/abs/2609.36690', n: '정적/동적 OMA 구분, 파랑 쪽 디튜닝(x ≈ −0.6…−1), 자기 가열·히터 여유·냉간 공진 배치 (프리프린트)' },
    carmon04: { t: 'T. Carmon, L. Yang, K. J. Vahala, "Dynamical thermal behavior and thermal self-stability of microcavities," Opt. Express 12(20), 4742–4750 (2004)', u: 'https://doi.org/10.1364/OPEX.12.004742', n: '열 자기안정(파랑 쪽)과 쌍안정' },
    padmaraju: { t: 'K. Padmaraju, K. Bergman, "Resolving the thermal challenges for silicon microring resonator devices," Nanophotonics 3(4–5), 269–281 (2014)', u: 'https://doi.org/10.1515/nanoph-2013-0013', n: '링의 열 드리프트와 안정화 방법 총설' },
    bristow: { t: 'A. D. Bristow, N. Rotenberg, H. M. van Driel, "Two-photon absorption and Kerr coefficients of silicon for 850–2200 nm," Appl. Phys. Lett. 90, 191104 (2007)', u: 'https://doi.org/10.1063/1.2737359', n: 'Si TPA 계수 (통신 파장 ≈0.8 cm/GW)' },
    hong: { t: 'S. Hong et al., "Ultralow-loss compact silicon photonic waveguide spirals and delay lines," Photonics Research 10(1), 1 (2022)', u: 'https://www.researching.cn/articles/OJ1f5643a2091e40d7', n: 'D-1·D-2의 기준 논문 (넓힌 나선 + Euler S-bend, 10-bit TTD)' },
    xie: { t: 'Y. Xie et al., "Low-loss chip-scale programmable silicon photonic processor," Opto-Electronic Advances 6(3), 220030 (2023)', u: 'https://doi.org/10.29026/oea.2023.220030', n: '넓은 암 MZ 스위치로 위상 오차 감소' },
    cherchi: { t: 'M. Cherchi et al., "Dramatic size reduction of waveguide bends on a micron-scale silicon photonic platform," Opt. Express 21(15), 17814 (2013)', u: 'https://doi.org/10.1364/OE.21.017814', n: 'Euler(clothoid) 굽힘 — arXiv:1301.2197 공개본' },
    rogers: { t: 'C. Rogers et al., "A universal 3D imaging sensor on a silicon photonics platform," Nature 590, 256–261 (2021)', u: 'https://doi.org/10.1038/s41586-021-03259-y', n: '초점면 스위치 어레이 FMCW LiDAR — arXiv:2008.02411 공개본' },
    gdsf: { t: 'gdsfactory documentation (PCell · 레이아웃 · GDS)', u: 'https://gdsfactory.github.io/gdsfactory/', n: 'tools/smq2gds의 GDS 백엔드' },
    meep: { t: 'MEEP documentation (FDTD)', u: 'https://meep.readthedocs.io/en/latest/', n: 'smq2gds --meep 스크립트의 대상 솔버' },
    tidy3d: { t: 'Flexcompute Tidy3D documentation (FDTD · 모드 솔버)', u: 'https://docs.flexcompute.com/projects/tidy3d/en/latest/', n: '오프라인 검증의 로컬 모드 솔버' },
    ansys: { t: 'Ansys Optics knowledge base (Lumerical FDTD·MODE·CHARGE·HEAT·INTERCONNECT 예제)', u: 'https://optics.ansys.com/hc/en-us' },
    luceda: { t: 'Luceda Academy (IPKISS · PDK · 회로 설계 튜토리얼)', u: 'https://academy.lucedaphotonics.com/' }
  };
  const TOOLREFS = ['gdsf', 'meep', 'tidy3d', 'ansys', 'luceda'];

  /* ---------- level objectives (A) ---------- */
  const GL = {
    '1-1': { goal: '고굴절 코어가 빛을 가두는 원리와 TE/TM 모드, 단일모드 조건을 직접 확인하고 실제 배선용 폭을 고릅니다.', prev: ['Stage 0: 파장(1310/1550)과 코어 물질(Si/SiN) 선택이 모든 모드 테이블을 정합니다.'], next: ['1-2: 같은 단일모드 도파로 두 개를 붙여 결합기를 만듭니다.', '1-3~1-5: MMI는 일부러 멀티모드 폭을 씁니다.', 'D-1: 넓힌 멀티모드 도파로를 천천히 굽혀 저손실 지연선을 만듭니다.'] },
    '1-2': { goal: '두 도파로 사이의 에바네센트 결합(슈퍼모드 맥놀이)으로 전력 분배비를 설계하고, 그 파장·공정 민감도를 체감합니다.', prev: ['1-1: 단일모드 폭 w₀와 n_eff.'], next: ['1-3~1-5: 같은 일을 더 둔감하게 하는 MMI.', '2-1·D-2: MZI·스위치의 분배기.'] },
    '1-3': { goal: '자기결상(self-imaging)으로 1×2 균등 분배기를 만들고 길이 L과 포트 피치 s의 역할을 배웁니다.', prev: ['1-1: 멀티모드 도파로의 모드들.', '1-2: 결합기가 공정에 민감하다는 문제의식.'], next: ['1-4: 광대역·소형화.', '2-5·B-3: 분배 트리, 모니터 탭.'] },
    '1-4': { goal: 'O-band 전체(1260–1360 nm)에서 손실을 지키면서 면적을 줄이는 MMI — 대역폭과 크기의 교환을 배웁니다.', prev: ['1-3: 1×2 자기결상 길이.'], next: ['2-5: 레이저 1:N 분배.'] },
    '1-5': { goal: '2×2 MMI 3-dB 커플러를 CWDM 4채널 전체에서 균형 있게 만듭니다. 이 카드는 1-7 lattice의 커플러가 됩니다.', prev: ['1-3·1-4: 자기결상과 대역폭.'], next: ['1-7: MZI·lattice의 3-dB 커플러 (카드 사용 토글).', '2-3: MZM의 분배·결합.'] },
    '1-6': { goal: '수백 nm 칩 모드를 수 µm 광섬유 모드에 맞추는 역테이퍼 SSC를 설계합니다 (모드 정합·단열 테이퍼·기판 누설).', prev: ['1-1: 폭이 줄면 모드가 클래딩으로 퍼진다는 관찰.'], next: ['2-5·3A: 칩–광섬유 결합 손실은 링크 버짓의 큰 항목입니다.'] },
    '1-7': { goal: '단일 MZI의 간섭에서 출발해 FSR, 인터리버, 1×4 트리, 고차 lattice까지 직접 쌓아 CWDM4 Demux를 완성하고, 공정 변동이 왜 능동 보정을 부르는지 경험합니다.', prev: ['1-1: n_eff·n_g 테이블.', '1-5: 3-dB 커플러 (카드로 대체 가능).'], next: ['2-1: TO 히터로 다이마다 위상 트리밍 (★★★).', '3A: 2×FR4 Rx Demux · Tx Mux.'] },
    '2-1': { goal: '열광학 위상기의 P_π·응답 시간·열 크로스토크를 설계하고, 1-7 CWDM을 다이마다 트리밍해 수율을 올립니다.', prev: ['1-7: 공정 오차로 밀린 채널 (Phase Trim의 한계).'], next: ['2-3: MZM 바이어스.', 'D-2·B-2: MZ 스위치 위상기.'] },
    '2-2': { goal: '캐리어 공핍 PN 위상기의 효율(V_πL)·광 손실·RC 속도를 도핑과 접합 위치로 교환합니다.', prev: ['2-1: 위상기의 개념 (열 대신 캐리어).'], next: ['2-3: 이 위상기를 진행파 MZM의 코어로 씁니다.'] },
    '2-3': { goal: '112 GBd PAM4(224G)용 진행파 MZM의 전극 길이·임피던스·속도 정합을 설계해 눈(eye)을 엽니다.', prev: ['2-2: 접합 C′·R′와 V_πL (카드).', '1-5: 3-dB 커플러.'], next: ['2-5: 링크 버짓의 변조기 항목.', '3A·3A+: 모듈 송신부.'] },
    '2-3R': { goal: '링 공진기의 공진·FSR·결합·Q부터 PN 접합 변조, 112 GBd PAM4, 온도 드리프트와 히터 제어까지 단계별로 쌓아 MRR 변조기를 설계하고, 같은 조건에서 2-3 MZM과 비교합니다.', prev: ['2-2: 접합 Δn(V)·C′·R′ (카드, 도핑을 더 올릴 수 있음).', '2-1: 히터 단면 h·격리 (카드).', '2-3: 같은 PAM4 눈 평가와 비교 대상.'], next: ['3A+: DR8 송신부의 변조기 선택 (Phase B).', 'PIC Design Lab: 링 PCell과 히터·패드 배치 (Phase C·D).'] },
    '2-4': { goal: 'Ge 도파로 수광기의 흡수·전이 시간·RC와 TIA 잡음을 함께 보며 감도(OMA)를 최적화합니다.', prev: ['1-1·1-6: 도파로와 결합.'], next: ['2-5: 수신 감도.', 'B-3: 균형 검출 LiDAR 수신.'] },
    '2-5': { goal: '외부 광원부터 수광기까지 레인당 링크 버짓을 부품 카드로 조립하고, 레이저 출력·공유·반사 대책을 결정합니다.', prev: ['1-3·1-6·1-7·2-3·2-4 카드.'], next: ['3A·3A+: 모듈 전체 전력과 온도 코너.'] },
    '3A': { goal: '1.6T 2×FR4 모듈을 아키텍처 수준(레이저 수·냉각·Mux 열 추적·DSP)에서 설계해 0–70 °C 최악 레인 마진과 전력을 맞춥니다.', prev: ['Stage 1·2 카드 전부 (특히 1-7 Demux, 2-1 히터).'], next: ['3A+: 병렬 광섬유·LPO·CPO 비교.'] },
    '3A+': { goal: 'DR8 병렬 광학에서 변조기(MZM ×8 / 링 ×8)와 DSP/LPO/CPO 패키징을 비교해 비트당 에너지와 마진을 최적화합니다.', prev: ['3A: 모듈 버짓의 구조.'], next: ['3W: 같은 링으로 8파장을 한 버스·한 광섬유에 (WDM8).', '실제 제품 아키텍처 검토 (IEEE 802.3dj, OIF CPO/ELSFP).'] },
    '3W': { goal: '8파장을 한 버스·한 광섬유에 싣는 링 WDM 송신기를 설계합니다 — 파장 격자와 FSR(별칭), 이웃 링 크로스토크, 링 반경 배치와 공진 배정(배럴 시프트), 히터 열 결합, 다파장 광원의 선 세기.', prev: ['2-3R: 링 변조기 (반경만 바꿔 다시 계산).', '3A+: 같은 부품의 MRR DR8 — 비교 표.', '2-1: 히터 단면과 열 결합 프로파일.'], next: ['PIC Design Lab: WDM8 공유 버스 레이아웃과 GDS.'] },
    'D-1': { goal: '2 ns(수십 cm) 지연선을 저손실·소면적으로 감는 법 — 산란·굽힘·S-bend 모드 변환·이웃 결합을 함께 다루고, 직사각형 사용 영역 안에 실제 배치까지 합니다.', prev: ['1-1: 폭과 측벽 산란, 멀티모드 조건.'], next: ['D-2: 이진 지연선의 지연 소자.', 'B-1: FMCW 기준 간섭계의 지연.'] },
    'D-2': { goal: 'MZ 스위치와 이진 지연 나선으로 0–5 ns를 10 ps 단위로 바꾸는 실시간 지연선(TTD)을 설계합니다 — 스위치 누설·에코·보정 전력.', prev: ['D-1: 나선 (카드).', '2-1: 히터 P_π.'], next: ['B-2: 같은 스위치 트리로 빔 조향.'] },
    'B-1': { goal: 'FMCW 처프(대역폭·램프 시간)와 칩 위 기준 간섭계로 거리 분해능·비트 주파수·처프 비선형 보정을 설계합니다.', prev: ['D-1: 기준 지연 나선.'], next: ['B-2·B-3: 점 속도와 SNR.'] },
    'B-2': { goal: '1×N 스위치 트리와 그레이팅 방출기·렌즈로 초점면 빔 조향기를 만들어 FOV·분해능·유령 빔을 맞춥니다.', prev: ['2-1: TO 스위치.', 'B-1: 점당 처프 시간.'], next: ['B-3: 시스템 링크 버짓.'] },
    'B-3': { goal: '반사율 10% 표적에 대한 코히어런트 FMCW LiDAR 링크 버짓으로 최대 거리·점 속도·전력을 함께 최적화합니다.', prev: ['B-1·B-2·2-4·1-3 카드.'], next: ['Track B 완료 — 실제 시스템 검증(광학 설계, 눈 안전 규격)으로.'] }
  };

  /* ---------- own schematics (SVG) ---------- */
  const T = (x, y, s, o) => `<text x="${x}" y="${y}" fill="${(o && o.c) || '#9eabbd'}" font-size="${(o && o.s) || 11}" font-family="IBM Plex Mono, monospace" text-anchor="${(o && o.a) || 'middle'}">${s}</text>`;
  const W0 = (w, h, inner, label) => `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}">${inner}</svg>`;
  const ARROW = '<defs><marker id="gar" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L8,4L0,8z" fill="#f2b04a"/></marker></defs>';
  const SVG = {
    wg: (c) => W0(420, 220, `<rect x="0" y="0" width="420" height="220" fill="#0b1220"/><rect x="20" y="130" width="380" height="70" fill="#1d2a3b"/><rect x="20" y="40" width="380" height="90" fill="#16202d"/>
      <rect x="165" y="104" width="90" height="26" fill="#f2b04a" opacity=".9"/><ellipse cx="210" cy="117" rx="68" ry="30" fill="none" stroke="#64c9df" stroke-dasharray="4 3"/><ellipse cx="210" cy="117" rx="42" ry="18" fill="none" stroke="#64c9df"/>
      ${T(210, 98, `w`, { c: '#e7ecf3' })}${T(268, 121, `t ${nm(c.pf.t)} nm`, { a: 'start' })}${T(60, 60, 'SiO₂ 상부 클래딩', { a: 'start' })}${T(60, 160, 'SiO₂ BOX', { a: 'start' })}${T(60, 190, 'Si 기판', { a: 'start', c: '#6c7b90' })}
      ${T(330, 70, 'TE: E ↔ (폭 방향)', { c: '#64c9df' })}${T(330, 86, 'TM: E ↕ (두께 방향)', { c: '#ff8d9c' })}${T(210, 214, `코어 ${c.pf.mat === 'si' ? 'Si' : 'SiN'} · n_clad < n_eff < n_core`, { c: '#e7ecf3' })}`, '도파로 단면 모식도'),
    dc: () => W0(420, 200, `<rect width="420" height="200" fill="#0b1220"/><path d="M20 60 H120 C160 60 160 92 200 92 H300 C340 92 340 60 400 60" fill="none" stroke="#e7ecf3" stroke-width="3"/><path d="M20 140 H120 C160 140 160 108 200 108 H300 C340 108 340 140 400 140" fill="none" stroke="#e7ecf3" stroke-width="3"/>
      <rect x="200" y="84" width="100" height="32" fill="rgba(242,176,74,.15)"/>${T(250, 80, '결합 길이 L', { c: '#f2b04a' })}${T(250, 128, '갭 g', { c: '#f2b04a' })}${T(30, 52, 'IN', { a: 'start', c: '#64c9df' })}${T(395, 52, 'BAR', { a: 'end' })}${T(395, 160, 'CROSS', { a: 'end' })}
      <path d="M210 175 ${Array.from({ length: 41 }, (_, i) => `L${210 + i * 4.5} ${175 - 30 * Math.pow(Math.sin(i / 40 * Math.PI), 2)}`).join(' ')}" fill="none" stroke="#5dd193" stroke-width="1.5"/>${T(300, 196, 'CROSS = sin²(πΔn·L/λ)', { s: 10, c: '#5dd193' })}`, '방향성 결합기 모식도'),
    mmi: () => W0(420, 200, `<rect width="420" height="200" fill="#0b1220"/><rect x="110" y="40" width="200" height="120" fill="#1d2a3b" stroke="#e7ecf3"/><path d="M20 100 H80 L110 92 V108 L80 100" fill="#e7ecf3" opacity=".8"/>
      <path d="M310 70 L340 64 H400 M310 130 L340 136 H400" stroke="#e7ecf3" stroke-width="3" fill="none"/>${[0.2, 0.4, 0.6, 0.8].map((f) => `<path d="M${110 + 200 * f} 40 V160" stroke="rgba(100,201,223,.25)"/>`).join('')}
      <path d="M110 100 C150 50 170 150 210 100 S270 50 310 70" fill="none" stroke="#f2b04a" stroke-width="1.5" opacity=".8"/><path d="M110 100 C150 150 170 50 210 100 S270 150 310 130" fill="none" stroke="#f2b04a" stroke-width="1.5" opacity=".8"/>
      ${T(210, 32, 'W (멀티모드 폭)', { c: '#e7ecf3' })}${T(210, 178, 'L = 3L_π/8 (1×2 대칭) · 3L_π/2 (2×2 일반)', { c: '#f2b04a', s: 10 })}${T(370, 58, '포트 피치 s', { s: 10 })}${T(60, 92, 'wₜ', { s: 10 })}`, 'MMI 모식도'),
    ssc: () => W0(420, 200, `<rect width="420" height="200" fill="#0b1220"/><path d="M20 94 H160 L330 99 V101 L160 106 H20 Z" fill="#f2b04a" opacity=".85"/>
      <ellipse cx="130" cy="100" rx="40" ry="10" fill="none" stroke="#64c9df"/><ellipse cx="300" cy="100" rx="70" ry="38" fill="none" stroke="#64c9df"/><rect x="340" y="40" width="70" height="120" fill="rgba(100,201,223,.08)" stroke="#334459"/><circle cx="375" cy="100" r="34" fill="none" stroke="#5dd193" stroke-dasharray="4 3"/>
      ${T(90, 82, 'w₀', { c: '#e7ecf3' })}${T(320, 125, 'w_tip', { c: '#e7ecf3' })}${T(245, 170, '테이퍼 길이 L_t (단열)', { c: '#f2b04a' })}${T(375, 152, '광섬유 MFD', { c: '#5dd193', s: 10 })}${T(210, 30, '팁이 좁아질수록 모드가 클래딩으로 퍼져 광섬유 모드와 겹침', { s: 10 })}`, 'SSC 모식도'),
    cwdm: () => W0(440, 210, `<rect width="440" height="210" fill="#0b1220"/>${ARROW}
      <rect x="40" y="85" width="90" height="40" fill="none" stroke="#e7ecf3"/>${T(85, 110, 'F1 · ΔL₁', { c: '#e7ecf3' })}<rect x="210" y="30" width="90" height="40" fill="none" stroke="#e7ecf3"/>${T(255, 55, 'F2A · ΔL₂', { c: '#e7ecf3' })}<rect x="210" y="140" width="90" height="40" fill="none" stroke="#e7ecf3"/>${T(255, 165, 'F2B · ΔL₂', { c: '#e7ecf3' })}
      <path d="M10 105 H40 M130 98 C170 98 170 50 210 50 M130 112 C170 112 170 160 210 160 M300 42 H380 M300 58 H380 M300 152 H380 M300 168 H380" stroke="#9eabbd" fill="none"/>
      ${T(170, 80, 'CH1·CH3', { c: '#64c9df', s: 10 })}${T(170, 140, 'CH2·CH4', { c: '#5dd193', s: 10 })}${T(410, 45, 'CH1', { c: '#64c9df', s: 10 })}${T(410, 61, 'CH3', { c: '#f2b04a', s: 10 })}${T(410, 155, 'CH2', { c: '#5dd193', s: 10 })}${T(410, 171, 'CH4', { c: '#ff8d9c', s: 10 })}
      ${T(85, 140, 'FSR 40 nm', { s: 10 })}${T(255, 90, 'FSR 80 nm', { s: 10 })}${T(220, 205, '각 필터 = N차 MZI lattice (커플러 N+1개, 지연 N단)', { s: 10 })}`, 'CWDM 트리 모식도'),
    to: () => W0(420, 210, `<rect width="420" height="210" fill="#0b1220"/>${ARROW}<rect x="20" y="150" width="380" height="50" fill="#1d2a3b"/><rect x="20" y="40" width="380" height="110" fill="#16202d"/>
      <rect x="180" y="118" width="60" height="16" fill="#f2b04a"/><rect x="170" y="56" width="80" height="10" fill="#9eabbd"/><rect x="110" y="40" width="22" height="125" fill="#0b1220" stroke="#334459"/><rect x="288" y="40" width="22" height="125" fill="#0b1220" stroke="#334459"/>
      <path d="M210 70 V112" stroke="#ff8d9c" marker-end="url(#gar)"/><path d="M190 66 L150 100" stroke="#ff8d9c" stroke-dasharray="3 3" marker-end="url(#gar)"/>${T(210, 50, 'TiN 히터', { c: '#e7ecf3' })}${T(255, 100, 'h', { c: '#f2b04a' })}${T(121, 185, '트렌치', { s: 10 })}${T(299, 185, '트렌치', { s: 10 })}${T(210, 146, '도파로', { s: 10, c: '#e7ecf3' })}
      ${T(210, 22, 'P_π = λG′ / (2·dn_eff/dT) — 길이 L과 무관', { c: '#f2b04a', s: 10.5 })}`, 'TO 위상기 단면 모식도'),
    pn: () => W0(420, 200, `<rect width="420" height="200" fill="#0b1220"/><rect x="40" y="120" width="340" height="24" fill="#334459"/><rect x="160" y="80" width="100" height="64" fill="#334459"/>
      <rect x="40" y="120" width="160" height="24" fill="rgba(255,141,156,.35)"/><rect x="160" y="80" width="40" height="64" fill="rgba(255,141,156,.35)"/><rect x="220" y="80" width="40" height="64" fill="rgba(100,201,223,.35)"/><rect x="220" y="120" width="160" height="24" fill="rgba(100,201,223,.35)"/>
      <rect x="200" y="80" width="20" height="64" fill="rgba(242,176,74,.5)"/><rect x="50" y="98" width="30" height="22" fill="#9eabbd"/><rect x="340" y="98" width="30" height="22" fill="#9eabbd"/>${T(110, 164, 'p (N_A)', { c: '#ff8d9c' })}${T(310, 164, 'n (N_D)', { c: '#64c9df' })}${T(210, 72, '공핍층 W(V_b)', { c: '#f2b04a', s: 10 })}
      ${T(65, 90, '컨택', { s: 10 })}${T(355, 90, '컨택', { s: 10 })}${T(210, 190, '역바이어스 ↑ → 공핍 폭 ↑ → 캐리어 ↓ → Δn (plasma dispersion)', { s: 10 })}${T(120, 60, 'd_c', { s: 10 })}`, 'PN 위상기 단면 모식도'),
    mzm: () => W0(440, 200, `<rect width="440" height="200" fill="#0b1220"/><path d="M20 100 H60 C90 100 90 70 120 70 H330 C360 70 360 100 390 100 H420 M60 100 C90 100 90 130 120 130 H330 C360 130 360 100 390 100" stroke="#e7ecf3" stroke-width="2.5" fill="none"/>
      <rect x="120" y="40" width="210" height="16" fill="#9eabbd"/><rect x="120" y="92" width="210" height="16" fill="#f2b04a" opacity=".8"/><rect x="120" y="144" width="210" height="16" fill="#9eabbd"/>${T(225, 34, '접지 (G)', { s: 10 })}${T(225, 104, '신호 (S) — 마이크로파 진행 →', { s: 10, c: '#0b1220' })}${T(225, 178, '접지 (G) · 간격 g', { s: 10 })}
      ${T(100, 190, 'RF in', { c: '#f2b04a', s: 10 })}${T(350, 190, '종단 R_T', { c: '#f2b04a', s: 10 })}${T(225, 18, '전기 속도 c/n_µ ≈ 광 군속도 c/n_g 이면 대역폭이 길이에 덜 묶임', { s: 10 })}`, '진행파 MZM 모식도'),
    mrr: () => W0(440, 220, `<rect width="440" height="220" fill="#0b1220"/><circle cx="170" cy="95" r="62" fill="none" stroke="#e7ecf3" stroke-width="3"/>
      <path d="M131 145 A55 55 0 1 1 209 145" fill="none" stroke="rgba(255,141,156,.8)" stroke-width="5"/><path d="M122 152 A69 69 0 1 1 218 152" fill="none" stroke="rgba(100,201,223,.8)" stroke-width="5"/>
      <path d="M110 162 A78 78 0 1 1 230 162" fill="none" stroke="#f2b04a" stroke-width="2" stroke-dasharray="5 4"/><path d="M20 168 H320" stroke="#e7ecf3" stroke-width="3"/>
      ${T(170, 92, 'R', { c: '#e7ecf3' })}${T(170, 108, 'L = 2πR', { s: 10 })}${T(190, 185, '갭 g → κ', { c: '#f2b04a', s: 10 })}${T(40, 160, 'IN', { a: 'start', c: '#64c9df' })}${T(318, 160, 'THROUGH', { a: 'end' })}
      ${T(60, 40, 'p (안쪽)', { c: '#ff8d9c', s: 10 })}${T(270, 40, 'n (바깥)', { c: '#64c9df', s: 10 })}${T(285, 70, '히터', { c: '#f2b04a', s: 10 })}
      <path d="M340 170 C352 170 356 120 362 120 C368 120 372 170 384 170 H420" stroke="#f2b04a" fill="none"/>${T(380, 110, '공진 골', { s: 10 })}${T(380, 196, 'λ ↦ T(λ)', { s: 10 })}
      ${T(220, 212, 'mλ = n_eff·L · T = (a² − 2at·cosφ + t²)/(1 − 2at·cosφ + a²t²)', { s: 10, c: '#f2b04a' })}`, '링 변조기 모식도'),
    pd: () => W0(420, 200, `<rect width="420" height="200" fill="#0b1220"/><rect x="20" y="120" width="380" height="20" fill="#f2b04a" opacity=".6"/><rect x="170" y="78" width="140" height="42" fill="#5d6b80"/><rect x="170" y="70" width="140" height="8" fill="#9eabbd"/>
      <path d="M40 130 H170" stroke="#64c9df" stroke-width="3"/>${[0, 1, 2, 3, 4].map((i) => `<path d="M${180 + i * 25} 128 V${92 - i * 2}" stroke="#64c9df" opacity="${0.8 - i * 0.14}"/>`).join('')}${T(240, 62, 'Ge (진성층 d_i)', { c: '#e7ecf3', s: 10 })}${T(100, 112, 'Si 도파로', { s: 10 })}
      ${T(240, 160, '길이 L: 흡수 1−exp(−ΓαL) ↑ · 커패시턴스 ↑', { s: 10 })}${T(350, 100, '→ TIA', { c: '#f2b04a' })}`, 'Ge 수광기 모식도'),
    els: () => W0(460, 150, `<rect width="460" height="150" fill="#0b1220"/>${['레이저', 'SSC', '1:N', 'MZM', 'Mux', '광섬유', 'Demux', 'PD'].map((t, i) => `<rect x="${10 + i * 56}" y="50" width="48" height="34" rx="5" fill="none" stroke="${i === 0 ? '#f2b04a' : '#9eabbd'}"/>${T(34 + i * 56, 71, t, { s: 10, c: '#e7ecf3' })}${i ? `<path d="M${i * 56 + 2} 67 H${10 + i * 56}" stroke="#64c9df"/>` : ''}`).join('')}
      ${T(230, 30, '마진 = 레이저 출력 − Σ(각 블록 손실·페널티) − 수신 감도', { s: 10.5, c: '#f2b04a' })}${T(230, 118, '반사 → 레이저 RIN: 경사 결합면·아이솔레이터로 억제', { s: 10 })}`, '링크 버짓 모식도'),
    xcvr: () => W0(460, 170, `<rect width="460" height="170" fill="#0b1220"/>${['DSP', '드라이버', '변조기 ×8', 'Mux', '광섬유'].map((t, i) => `<rect x="${10 + i * 90}" y="30" width="80" height="34" rx="5" fill="none" stroke="#9eabbd"/>${T(50 + i * 90, 51, t, { s: 10, c: '#e7ecf3' })}`).join('')}
      ${['DSP', 'TIA', 'PD ×8', 'Demux', '광섬유'].map((t, i) => `<rect x="${10 + i * 90}" y="100" width="80" height="34" rx="5" fill="none" stroke="#9eabbd"/>${T(50 + i * 90, 121, t, { s: 10, c: '#e7ecf3' })}`).join('')}${T(230, 90, '레이저 N개 · TEC 유무 · Mux 열 추적 · 0–70 °C 코너', { s: 10, c: '#f2b04a' })}${T(230, 160, '최악 레인 마진 ≥ 0 · 모듈 전력 (W) · pJ/bit', { s: 10 })}`, '트랜시버 모듈 모식도'),
    spiral: (c) => {
      const rect = c.d && (c.d.lay | 0) >= 1; let pth = '';
      if (!rect) { for (const sg of [1, -1]) { let s = ''; for (let i = 0; i <= 400; i++) { const th = i / 400 * 6 * Math.PI, r = 16 + 12 * th / (2 * Math.PI) + (sg < 0 ? 6 : 0); s += `${i ? 'L' : 'M'}${(210 + sg * r * Math.cos(th)).toFixed(1)} ${(100 + sg * r * Math.sin(th)).toFixed(1)} `; } pth += `<path d="${s}" fill="none" stroke="${sg > 0 ? '#f2b04a' : '#64c9df'}" stroke-width="1.6"/>`; } }
      else { for (let k = 0; k < 4; k++) { const o = 10 + k * 12; pth += `<rect x="${130 - o}" y="${70 - o}" width="${160 + 2 * o}" height="${60 + 2 * o}" rx="${8 + o / 2}" fill="none" stroke="${k % 2 ? '#64c9df' : '#f2b04a'}" stroke-width="1.6"/>`; } pth += '<rect x="60" y="10" width="300" height="180" fill="none" stroke="#64c9df" stroke-dasharray="5 4"/>'; }
      return W0(420, 200, `<rect width="420" height="200" fill="#0b1220"/>${pth}<path d="M198 100 C198 84 222 84 222 100 C222 116 198 116 198 100" fill="none" stroke="#5dd193" stroke-width="2"/>
        ${T(210, 196, rect ? '직사각형 이중 나선 (경계 = 점선) · 코너 원호/Euler · 중앙 S-bend' : '이중 아르키메데스 나선 · 중앙 S-bend (곡률 반전)', { s: 10 })}${T(210, 14, 'τ = n_g·L / c', { c: '#f2b04a' })}`, '지연 나선 모식도');
    },
    ttd: () => W0(460, 170, `<rect width="460" height="170" fill="#0b1220"/>${[0, 1, 2, 3].map((k) => `<rect x="${20 + k * 105}" y="70" width="34" height="30" fill="none" stroke="#9eabbd"/>${T(37 + k * 105, 90, 'SW', { s: 9.5 })}<path d="M${54 + k * 105} 78 H${122 + k * 105}" stroke="#e7ecf3"/><path d="M${54 + k * 105} 94 C${70 + k * 105} 140 ${108 + k * 105} 140 ${124 + k * 105} 94" stroke="#f2b04a" fill="none"/>${T(88 + k * 105, 148, `${Math.pow(2, k)}Δτ`, { c: '#f2b04a', s: 10 })}`).join('')}
      ${T(230, 40, '비트마다 짧은 길 / 2^k·Δτ 나선을 MZ 스위치로 선택 → 0 … (2^N−1)Δτ', { s: 10 })}${T(230, 62, '스위치 누설 → 다른 경로의 빛이 "에코"로 섞임', { s: 10, c: '#ff8d9c' })}`, '스위치형 지연선 모식도'),
    chirp: () => W0(420, 190, `<rect width="420" height="190" fill="#0b1220"/><path d="M40 160 L160 40 L280 160 L400 40" stroke="#f2b04a" stroke-width="2" fill="none"/><path d="M70 160 L190 40 L310 160 L400 70" stroke="#64c9df" stroke-width="2" fill="none" stroke-dasharray="5 3"/>
      <path d="M40 170 H400 M30 160 V30" stroke="#334459"/>${T(410, 180, 't', { a: 'end' })}${T(24, 30, 'f', {})}${T(115, 75, 'B', { c: '#f2b04a' })}${T(100, 182, 'T', { c: '#f2b04a' })}${T(210, 22, '송신(주황)과 τ = 2R/c 늦은 수신(파랑) 사이 주파수 차 = 비트 f_b = 2Rγ/c', { s: 10 })}
      <path d="M160 92 H190" stroke="#5dd193" stroke-width="2"/>${T(176, 108, 'f_b', { c: '#5dd193' })}`, 'FMCW 처프 모식도'),
    fpsa: () => W0(420, 200, `<rect width="420" height="200" fill="#0b1220"/><path d="M200 30 Q220 100 200 170 Q180 100 200 30" fill="rgba(100,201,223,.2)" stroke="#64c9df"/>${[-3, -1, 1, 3].map((i) => `<circle cx="80" cy="${100 + i * 15}" r="4" fill="#f2b04a"/><path d="M80 ${100 + i * 15} L200 ${100 - i * 8} L400 ${100 - i * 32}" stroke="#f2b04a" opacity=".55" fill="none"/>`).join('')}
      ${T(80, 40, '방출기 (간격 p)', { s: 10, c: '#e7ecf3' })}${T(200, 190, '렌즈 (초점거리 f)', { s: 10, c: '#64c9df' })}${T(320, 30, 'θ_i = atan(x_i / f)', { c: '#f2b04a' })}${T(80, 175, '1×N 스위치 트리가 하나를 선택', { s: 10 })}`, '초점면 스위치 어레이 모식도'),
    wdm: () => W0(460, 200, `<rect width="460" height="200" fill="#0b1220"/><path d="M20 120 H440" stroke="#64c9df" stroke-width="3"/>${T(30, 110, 'λ₀…λ₇ (콤/DFB)', { a: 'start', s: 10, c: '#f6c35a' })}
      ${['#8fb3ff', '#64c9df', '#5dd193', '#c6e06b', '#f6c35a', '#f2b04a', '#ff8d9c', '#b48cff'].map((c, k) => `<circle cx="${70 + k * 47}" cy="94" r="17" fill="none" stroke="${c}" stroke-width="3"/>${T(70 + k * 47, 98, 'λ' + k, { s: 9, c })}`).join('')}${T(440, 140, '→ 한 광섬유', { a: 'end', s: 10 })}
      ${T(230, 30, '링 k의 공진: λ_k + m·FSR (FSR = λ²/(n_g·2πR))', { s: 10.5, c: '#f2b04a' })}${T(230, 50, '8·Δλ ≈ m·FSR → 순환 배정이 공통 이동을 Δλ 단위로 흡수', { s: 10 })}
      ${T(230, 170, '이웃 링: 통과 손실 + 변조 크로스토크 · 히터 열 결합 κ(p)', { s: 10 })}${T(230, 190, '히터는 빨강 쪽으로만: need = (λ_target − λ_unheated) mod FSR', { s: 10, c: '#9eabbd' })}`, '링 WDM8 공유 버스 모식도'),
    lidar: () => W0(440, 180, `<rect width="440" height="180" fill="#0b1220"/>${ARROW}<rect x="20" y="70" width="70" height="40" fill="none" stroke="#f2b04a"/>${T(55, 94, '광원', { c: '#e7ecf3', s: 10 })}<rect x="140" y="70" width="80" height="40" fill="none" stroke="#9eabbd"/>${T(180, 94, '스위치·렌즈', { c: '#e7ecf3', s: 10 })}
      <rect x="380" y="50" width="20" height="80" fill="#5d6b80"/>${T(390, 145, '표적 ρ', { s: 10 })}<path d="M220 82 H378" stroke="#f2b04a" marker-end="url(#gar)"/><path d="M378 98 H222" stroke="#64c9df" stroke-dasharray="4 3" marker-end="url(#gar)"/>
      <rect x="140" y="130" width="80" height="34" fill="none" stroke="#5dd193"/>${T(180, 151, '균형 검출', { c: '#5dd193', s: 10 })}<path d="M90 100 C110 140 120 147 140 147" stroke="#9eabbd" fill="none"/>${T(100, 168, 'LO', { s: 10 })}
      ${T(300, 30, 'P_rx = P_out·ρ·D²/(4R²)·η_het', { c: '#f2b04a', s: 10.5 })}`, 'FMCW LiDAR 시스템 모식도')
  };

  /* ---------- per-kind content ---------- */
  const R = (o) => o;   // readability
  const GK = {
    wg: R({
      basic: (c) => `<p>빛은 굴절률이 높은 <b>코어</b>(${c.pf.mat === 'si' ? 'Si n≈3.5' : 'SiN n≈2.0'})에 갇혀 SiO₂(n≈1.45) 클래딩 사이를 진행합니다. 진행하면서 모양이 변하지 않는 전계 분포를 <b>모드</b>라 부르고, 모드가 "느끼는" 평균 굴절률이 <b>유효굴절률 n<sub>eff</sub></b>입니다. n<sub>eff</sub>가 클래딩 굴절률보다 크면 모드가 갇히고(guided), 같아지면 빠져나갑니다(cut-off).</p>
        <p>폭을 넓히면 더 많은 모드(TE0, TE1, …)가 갇힙니다. 배선은 기본모드 하나만 다니는 <b>단일모드</b> 폭을 쓰고, MMI처럼 모드 간섭을 이용하는 소자는 일부러 멀티모드를 씁니다. 이 플랫폼(${c.pf.short})에서 TE1이 생기기 시작하는 폭은 약 <b>${nm(c.pf.wc)} nm</b>입니다.</p>`,
      deep: (c) => `<p>대칭 슬랩 근사에서 V = k₀(w/2)√(n₁²−n₂²)이고 TE1은 V &gt; π/2에서 guided가 됩니다. 실제 strip은 세로·가로 구속이 함께 있어, 게임은 semi-vectorial 2D 유한차분 솔버(quasi-TE E<sub>x</sub>, quasi-TM E<sub>y</sub>)로 폭·두께·파장별 모드 테이블을 미리 계산해 씁니다(tools/modes2.py).</p>
        <p>측벽 거칠기 산란은 Payne–Lacey형 근사 α<sub>sw</sub> ∝ σ²·(n₁²−n₂²)·∂n<sub>eff</sub>/∂w 로 둡니다. ∂n<sub>eff</sub>/∂w는 "폭이 1 nm 변할 때 n<sub>eff</sub>가 얼마나 변하는가"로, 산란 손실과 공정 민감도를 동시에 정합니다 — 넓힐수록 둘 다 작아지지만 멀티모드가 됩니다. TM0는 얇은 방향으로 눌려 n<sub>eff</sub>가 낮고 기판 쪽으로 더 퍼지므로, 대부분의 Si 소자는 TE 기준으로 설계합니다.</p>`,
      fig: 'wg', cap: '도파로 단면: 코어(주황), 모드 강도 등고선(점선 바깥일수록 약함). TE는 폭 방향, TM은 두께 방향 전계.',
      P: { w: { m: '코어 폭. 두께는 플랫폼에서 고정(Si 220 nm / SiN 400 nm)', up: 'n<sub>eff</sub>↑, 모드 수↑, 측벽 산란↓, 공정 민감도↓', dn: '모드가 클래딩으로 퍼짐, 기판 누설↑, 결국 cut-off', tr: '단일모드(배선) ↔ 저손실·공정 둔감(넓은 폭)', f: 'n<sub>SiO₂</sub> &lt; n<sub>eff</sub>(w) &lt; n<sub>core</sub> · α<sub>sw</sub> ∝ σ²(n₁²−n₂²)∂n<sub>eff</sub>/∂w', rg: (c) => `단일모드 w &lt; ${nm(c.pf.wc)} nm (이 플랫폼)` } },
      ix: { k: 'w', m: [['TE0 n_eff', (r) => r.te[0], '', 3], ['TE1 n_eff (갇히면 &gt; n_SiO₂)', (r) => r.te[1], '', 3], ['TM0 n_eff', (r) => r.tm[0], '', 3], ['측벽 산란 손실', (r) => r.alpha, 'dB/cm', 2]], note: 'TE1 곡선이 클래딩 굴절률(≈1.45)을 넘는 폭이 단일모드 한계입니다.' },
      miss: [[/멀티모드|단일모드|TE0만/, 'w', 'TE1 차단 조건 (B · Deep Dive의 V-수)'], [/n<sub>eff<\/sub>가 같아|편광|TM/, 'w', 'TE·TM의 구속 차이 (폭과 두께의 비)'], [/손실|산란|dB\/cm/, 'w', '측벽 산란 ∝ ∂n_eff/∂w'], [/수율|공정|Fab/, 'w', '폭 오차에 대한 n_eff 민감도']],
      lim: [['모드 n<sub>eff</sub>·모드 형상', 'pre', 'semi-vectorial 2D 유한차분(quasi-TE/TM) 사전계산 테이블. 벡터 솔버보다 n<sub>eff</sub>가 약간 큼 (500×220 nm Si@1550: 2.49 vs ≈2.44)'], ['측벽 산란 손실', 'emp', 'Payne–Lacey형 비례식, 상수는 Si 측정값(Hong 2022)에 한 번 맞춤'], ['기판 누설', 'semi', 'BOX 터널링 근사 α ≈ γ·exp(−2γ·t<sub>BOX</sub>)'], ['TE↔TM 혼합, 굽힘', 'fw', '직선 단면만 다룹니다. 편광 변환·굽힘은 벡터 솔버/FDTD로 확인']],
      refs: ['rp_wg', 'rp_modes', 'rp_neff', 'payne', 'chrost']
    }),
    dc: R({
      basic: () => `<p>두 도파로를 수백 nm 간격으로 붙이면 한쪽 모드의 에바네센트 꼬리가 다른 쪽에 닿아 빛이 서서히 <b>건너갑니다</b>. 다 건너간 뒤에는 다시 돌아오기를 반복합니다. 건너가는 데 걸리는 길이 L<sub>π</sub>와 실제 길이 L의 비가 분배비(BAR/CROSS)를 정합니다.</p><p>간격 g가 조금만 달라져도 L<sub>π</sub>가 지수적으로 변해 분배비가 흔들립니다 — 단순하지만 공정·파장에 민감한 소자라는 점이 이 레벨의 핵심 관찰입니다.</p>`,
      deep: () => `<p>두 도파로를 하나의 구조로 보면 짝(even)·홀(odd) 슈퍼모드가 생기고, 입력은 두 슈퍼모드의 합입니다. 진행하며 위상차가 쌓여 P<sub>cross</sub> = sin²(πΔn·L/λ), Δn = n<sub>even</sub> − n<sub>odd</sub>, L<sub>π</sub> = λ/(2Δn) 입니다. Δn ≈ A·exp(−γg)라 갭에 지수적으로 의존하고, 파장이 길수록 모드가 퍼져 Δn이 커집니다(분산). 게임은 2D 솔버로 갭·폭·두께·파장별 짝/홀 n<sub>eff</sub>를 사전계산해 씁니다.</p>`,
      fig: 'dc', cap: '방향성 결합기: 결합 구간에서 빛이 sin² 형태로 건너감.',
      P: { g: { m: '두 도파로 사이 간격', up: 'Δn↓(지수적) → L<sub>π</sub>↑, 소자가 길어짐', dn: 'L<sub>π</sub>↓, 짧지만 g 오차·파장에 더 민감', tr: '크기 ↔ 공정·파장 둔감도', f: 'Δn ≈ A·e<sup>−γg</sup>, L<sub>π</sub> = λ/(2Δn)', rg: (c) => `DRC 최소 간격 ${c.pf.rules.gap} µm 이상` }, L: { m: '두 도파로가 나란한 결합 길이', up: 'CROSS 비율이 sin²로 진동 (L = L<sub>π</sub>에서 완전 결합)', dn: '결합량↓', tr: '목표 분배비를 맞추는 길이 vs 파장 대역', f: 'P<sub>cross</sub> = sin²(πΔn·L/λ)', rg: '3-dB: L ≈ L<sub>π</sub>/2' } },
      ix: { k: 'g', m: [['완전 결합 길이 L_π', (r) => r.Lpi, 'µm', 1], ['CROSS @ λc', (r) => r.k * 100, '%', 1]], note: '갭을 0.05 µm만 바꿔도 L_π가 크게 변하는 것을 확인하세요.' },
      miss: [[/완전 결합|CROSS ≥/, 'L, g', 'L = L_π 조건'], [/3-dB|50/, 'L, g', 'L = L_π/2와 갭 지수 의존성'], [/대역|파장|±/, 'g', 'Δn의 파장 분산'], [/수율|공정/, 'g', 'Δn의 갭 민감도']],
      lim: [['짝/홀 슈퍼모드 n<sub>eff</sub>', 'pre', '2D 모드 솔버 사전계산 테이블 (갭·폭·두께·파장)'], ['결합 공식', 'an', '이상적 두 모드 맥놀이, 손실·반사 없음'], ['입출력 S-bend 구간의 결합', 'fw', '직선 결합 구간만 계산. 굽힘 구간 기여는 FDTD/EME 필요'], ['공정 변동', 'asm', '웨이퍼 CD 오프셋 + 두께 bowl + 다이 랜덤 (CD σ≈8 nm)']],
      refs: ['okamoto', 'rp_cpl', 'chrost']
    }),
    mmi: R({
      basic: () => `<p>넓은 멀티모드 구간에 빛을 넣으면 여러 모드가 서로 다른 속도로 진행하며 간섭합니다. 특정 길이에서 입력 모양이 다시 나타나거나(단일 상), 여러 개로 나뉘어 나타납니다 — <b>자기결상(self-imaging)</b>. 그 위치에 출력 도파로를 두면 분배기가 됩니다.</p><p>MMI는 방향성 결합기보다 공정과 파장에 둔감하지만 크기가 크고, 길이 L과 폭 W가 정확히 맞아야 손실이 작습니다.</p>`,
      deep: () => `<p>맥놀이 길이 L<sub>π</sub> = π/(β₀−β₁) ≈ 4n<sub>r</sub>W<sub>e</sub>²/(3λ₀), W<sub>e</sub> = W + (λ₀/π)(n₁²−n₀²)<sup>−1/2</sup> (TE). 일반 간섭: N중 상이 L = 3L<sub>π</sub>/N (2×2 3-dB는 3L<sub>π</sub>/2). 입력을 ±W<sub>e</sub>/6에 두는 paired 간섭: L<sub>π</sub>/N. 중앙 입력 대칭 간섭: 3L<sub>π</sub>/(4N) (1×2는 3L<sub>π</sub>/8). 게임은 2D 유효굴절률법 + 고유모드 전개로 계산하고, 참조 설계는 GDS를 자른 3D EME로 오프라인 검증합니다(“오프라인 솔버 검증” 패널).</p>`,
      fig: 'mmi', cap: 'MMI: 멀티모드 간섭으로 입력 상이 출력 위치에 다시 맺힘.',
      P: { W: { m: '멀티모드 구간 폭', up: 'L<sub>π</sub> ∝ W² 로 길어짐, 모드 수↑', dn: '짧아지지만 포트 간격·DRC 여유↓', tr: '크기 ↔ 포트 분리·대역폭', f: 'L<sub>π</sub> ≈ 4n<sub>r</sub>W<sub>e</sub>²/(3λ)', rg: '포트 피치 s + 테이퍼 폭이 들어가야 함' }, L: { m: '멀티모드 구간 길이', up: '결상 위치를 지나치면 손실↑', dn: '결상 전이면 손실↑', tr: '결상 길이에 정확히 맞추기', f: '1×2 대칭 3L<sub>π</sub>/8 · 2×2 일반 3L<sub>π</sub>/2 · paired L<sub>π</sub>/2', rg: '보통 수~수십 µm (Si)' }, wt: { m: '입출력 테이퍼 끝 폭', up: '포트 모드가 넓어져 결상 결합↑ (일정 한도)', dn: '좁으면 결상과 모양 불일치', tr: '결합 효율 ↔ 포트 간 간격(DRC)', f: '결상 모드와 포트 모드의 overlap', rg: (c) => `최소 폭 ${c.pf.rules.wmin} µm` }, s: { m: '두 출력 포트 중심 간격', up: '결상 위치에서 벗어나면 손실↑ / 불균형', dn: '포트끼리 붙어 DRC 위반', tr: '결상 위치 정렬 ↔ DRC', f: '대칭 2중 상: ±W<sub>e</sub>/4 근처', rg: (c) => `s − wₜ ≥ ${c.pf.rules.gap} µm` } },
      ixCustom: 'mmi', ix: { k: 'L', m: [['최악 초과손실 EL', (r) => r.el, 'dB', 2]], note: '길이 L을 훑으면 결상 위치에서 손실이 최소가 됩니다.' },
      miss: [[/EL|손실/, 'L, W', '자기결상 길이와 L_π ∝ W²'], [/불균형|imb/, 's, wt', '포트 위치와 결상 대칭'], [/DRC/, 's, wt, W', 'DRC 간격 규칙'], [/면적|크기/, 'W', 'L_π ∝ W²'], [/대역|1260/, 'W, L', 'L_π의 파장 의존성 (∝ 1/λ)']],
      lim: [['MMI 전달', 'semi', '2D 유효굴절률법 + 고유모드 전개(EIM). 고대비 단면에서 3D와 L<sub>π</sub>가 어긋남'], ['테이퍼', 'asm', '단열 가정 (손실 없음). 3D EME에는 테이퍼 손실 포함'], ['3D 검증', 'pre', '참조 설계를 GDS에서 잘라 3D EME로 검증 (src/data/validation.json)'], ['반사·후방산란', 'fw', '포함하지 않음 — FDTD 필요']],
      refs: ['soldano', 'chrost', 'rp_bs']
    }),
    ssc: R({
      basic: () => `<p>칩 도파로 모드는 수백 nm, 광섬유 모드는 수 µm라 그대로 붙이면 대부분 빛이 버려집니다. 끝으로 갈수록 폭을 아주 좁히면(<b>역테이퍼</b>) 모드가 코어 밖으로 크게 퍼져 광섬유 모드와 비슷해집니다.</p><p>너무 급하게 좁히면 모드가 따라오지 못해(비단열) 손실이 생기고, 너무 퍼지면 아래 기판으로 새어 나갑니다.</p>`,
      deep: () => `<p>결합 효율 η = |∫E<sub>wg</sub>E<sub>fib</sub>*dA|² / (∫|E<sub>wg</sub>|²dA·∫|E<sub>fib</sub>|²dA). 팁 모드는 2D 솔버 테이블, 광섬유는 가우시안. 테이퍼 손실은 1차 결합 국소모드 이론(단계별 결합의 위상을 포함한 합), 기판 누설은 BOX 터널링 α ≈ γ·exp(−2γ·t<sub>BOX</sub>). 정렬 공차는 overlap을 이동시켜 계산합니다.</p>`,
      fig: 'ssc', cap: '역테이퍼: 팁에서 모드가 커져 광섬유 모드(초록 점선)와 겹침.',
      P: { tw: { m: '테이퍼 끝(팁) 폭', up: '모드가 작아 광섬유와 부정합↑', dn: '모드가 커지지만 기판 누설↑, 공정 한계', tr: '모드 정합 ↔ 기판 누설·제작 한계', f: 'η = |⟨E<sub>wg</sub>|E<sub>fib</sub>⟩|²', rg: '수십~200 nm (Si)' }, Lt: { m: '테이퍼 길이', up: '단열↑ (손실↓), 공간↑', dn: '비단열 결합 손실↑', tr: '손실 ↔ 길이', f: '국소모드 결합 ∝ (dw/dz)', rg: '수십~수백 µm' }, p: { m: '테이퍼 모양 지수 (폭이 z<sup>p</sup>처럼 변함)', up: '끝부분을 천천히 좁힘', dn: '앞부분을 천천히 좁힘', tr: '모드가 빨리 변하는 구간에서 천천히', f: 'w(z) = w₀ + (w<sub>tip</sub>−w₀)(z/L)<sup>p</sup>', rg: '0.3–3' } },
      ix: { k: 'tw', m: [['총 결합 손실', (r) => r.loss, 'dB', 2], ['모드 부정합', (r) => r.mis, 'dB', 2]], note: '최적 팁 폭은 광섬유 MFD에 따라 달라집니다.' },
      miss: [[/손실|loss/i, 'tw, Lt', '모드 overlap과 단열 조건'], [/공차|정렬/, 'tw', '모드가 클수록 정렬 공차↑'], [/길이|면적/, 'Lt, p', '테이퍼 모양으로 단열 구간 배분']],
      lim: [['팁 모드', 'pre', '2D 모드 솔버 사전계산 (폭·두께·파장)'], ['광섬유 모드', 'asm', '가우시안 MFD (렌즈드/일반 광섬유 대표값)'], ['테이퍼 손실', 'semi', '1차 결합 국소모드 이론'], ['파셋 반사·3D 방사', 'fw', '포함하지 않음 — 3D FDTD/EME 필요']],
      refs: ['almeida', 'rp_mfc', 'rp_mr', 'chrost']
    }),
    cwdm: R({
      basic: () => `<p><b>MZI</b>는 빛을 두 팔로 나눴다가 다시 합칩니다. 한 팔이 ΔL만큼 길면 두 빛의 위상차 Δφ가 파장마다 달라져, 어떤 파장은 Bar로, 어떤 파장은 Cross로 나갑니다. 이 반복 주기가 <b>FSR</b>입니다.</p><p>20 nm 간격 네 채널을 나누려면: FSR 40 nm MZI(F1)로 홀/짝을 나누고, FSR 80 nm MZI 두 개(F2A·F2B)로 다시 나눕니다. 단순 MZI 응답은 사인형이라 채널 가장자리(±6.5 nm)에서 이웃 채널이 새어 들어오므로, 커플러와 지연을 여러 단 쌓은 <b>lattice 필터</b>로 통과대역을 평평하게 만듭니다.</p>
        <p><b>Phase Trim vs TO Heater</b> — 이 레벨의 위상 트림 φ는 마스크에 그려지는 설계 위상(지연 팔에 δL = φλ/(2n<sub>eff</sub>)만큼 더한 길이)이라 <i>공칭</i> 정렬만 합니다. 칩마다 다른 공정 오차는 Stage 2-1의 TO 히터처럼 제작 후 능동 보정으로만 고칠 수 있습니다.</p>`,
      deep: () => `<p>Δφ(λ) = 2πn<sub>eff</sub>(λ)ΔL/λ + φ, Bar = sin²(Δφ/2). dΔφ/dλ = −2πn<sub>g</sub>ΔL/λ² 이므로 FSR = λ²/(n<sub>g</sub>ΔL) — 위상 굴절률이 아니라 <b>군굴절률</b>이 주기를 정합니다. N차 lattice: 커플러 N+1개(결합비 κ<sub>i</sub>), 지연 단마다 ΔL의 정수배(게임: 1·2·2배). κ와 단 사이 위상은 오프라인 최적화(tools/lattice.py)로 ±6.5 nm flat-top에 맞췄고, 이상적 커플러 기준 가장자리 누설 한계는 1차 −6.2, 2차 −11.5, 3차 −16.4 dB입니다. 차수를 바꾸면 설계 위상 ph₀가 달라져 트림을 다시 맞춰야 합니다.</p>
        <p>공정 민감도: 채널 이동 Δλ ≈ λ·Δn<sub>eff</sub>/n<sub>g</sub>. 폭 변화는 ∂n<sub>eff</sub>/∂w가 작은 넓은 지연 암(wₐ)으로 줄일 수 있지만, 두께 변화는 모든 암에 공통이라 폭으로 막을 수 없습니다 → 다이별 열 트리밍(2-1).</p>`,
      fig: 'cwdm', cap: '1×4 CWDM 트리: F1(FSR 40 nm) → F2A/F2B(FSR 80 nm).',
      P: {
        mL: { m: '단일 MZI 두 팔의 길이 차 (Guided 1단계)', up: 'FSR↓ (스펙트럼 주기가 촘촘해짐)', dn: 'FSR↑', tr: 'FSR은 채널 간격이 정함 (40 nm)', f: 'FSR = λ²/(n<sub>g</sub>ΔL)', rg: 'Si ≈ 10 µm, SiN ≈ 20 µm 근처에서 FSR 40 nm' },
        mP: { m: '두 팔 위상차에 더하는 상수 (설계 위상)', up: '스펙트럼이 파장 축에서 평행이동', dn: '반대 방향 이동', tr: '주기는 그대로, 중심만 이동', f: 'Δφ = 2πn<sub>eff</sub>ΔL/λ + φ · 0.5π ↔ FSR/4 이동', rg: '−π … π (2π 주기)' },
        ord: { m: 'Lattice 차수 N (커플러 N+1개)', up: '통과대역 평평 → 가장자리 크로스토크↓', dn: '사인형 응답, 면적·손실↓', tr: 'XT ↔ 면적·IL·트림 복잡도', f: '누설 한계 −6.2 / −11.5 / −16.4 dB (N = 1/2/3)', rg: '1–3' },
        dL1: { m: '1단(F1) 지연 길이 차', up: 'FSR₁↓', dn: 'FSR₁↑', tr: 'FSR₁ = 40 nm (홀/짝 분리)', f: 'ΔL₁ = λ²/(n<sub>g</sub>·40 nm)', rg: 'n<sub>g</sub>(wₐ)에 따라 다름' },
        t1: { m: 'F1 위상 트림 (마스크 설계 위상)', up: 'F1 응답 평행이동', dn: '반대 이동', tr: '공칭 정렬만 (다이별 오차는 2-1 히터)', f: 'δL = φλ/(2n<sub>eff</sub>)', rg: '−π … π' },
        dL2: { m: '2단(F2A·F2B) 지연 길이 차', up: 'FSR₂↓', dn: 'FSR₂↑', tr: 'FSR₂ = 80 nm → ΔL₂ ≈ ΔL₁/2', f: 'ΔL₂ = λ²/(n<sub>g</sub>·80 nm)', rg: 'ΔL₁의 절반 근처' },
        t2a: { m: 'F2A 위상 트림', up: 'F2A 응답 이동', dn: '반대 이동', tr: 'F2A는 CH1/CH3 담당', f: '트림 목표는 차수마다 다름 (ph₀)', rg: '−π … π' },
        t2b: { m: 'F2B 위상 트림', up: 'F2B 응답 이동', dn: '반대 이동', tr: 'F2B는 CH2/CH4 담당 — F2A와 20 nm 어긋남', f: '트림 목표는 차수마다 다름 (ph₀)', rg: '−π … π' },
        wa: { m: '지연 암 폭', up: '∂n<sub>eff</sub>/∂w↓ → CD 변동에 둔감, n<sub>g</sub> 변화', dn: '공정 민감↑', tr: '수율 ↔ ΔL·트림 재조정', f: 'Δλ ≈ λ(∂n<sub>eff</sub>/∂w)Δw/n<sub>g</sub>', rg: (c) => `w₀ ${c.pf.w0} µm 이상` }
      },
      ixCustom: 'cwdm', ix: { m: [] },
      miss: [[/FSR/, 'ΔL', 'FSR = λ²/(n_g ΔL)'], [/Bar|Cross|포트|Group|채널 →/, 'φ', '위상 오프셋은 스펙트럼 평행이동'], [/XT|크로스토크/, 'N, φ', 'Lattice flat-top과 가장자리 누설'], [/IL|손실/, 'φ, N', '통과 중심 정렬과 커플러 수'], [/면적/, 'N, ΔL', '차수·지연 길이와 면적'], [/수율|Fab/, 'wₐ, N', '공정 이동 Δλ = λΔn/n_g, 능동 보정(2-1)']],
      lim: [['n<sub>eff</sub>·n<sub>g</sub>', 'pre', '2D 모드 솔버 테이블 (폭·두께·파장)'], ['필터 응답', 'an', '이상적 커플러의 회로 S-matrix (전달 행렬)'], ['커플러 결합비', 'asm', 'lattice 설계값 고정, 파장 무관(이상적). 1-5 카드 사용 시 MMI 카드의 파장별 값'], ['지연 암 손실', 'asm', '1.5 dB/cm 고정'], ['공정 변동', 'asm', 'CD 오프셋·두께 bowl·다이 랜덤 + 위상 오차 ∝ √L'], ['커플러 분산·반사', 'fw', '실제 MMI/DC의 파장 의존 결합비는 EME/FDTD로 검증']],
      refs: ['horst', 'madsen', 'rp_ifm', 'rp_fsr', 'rp_ng', 'rp_wdm', 'rp_filt']
    }),
    to: R({
      basic: () => `<p>도파로 위 히터에 전류를 흘리면 온도가 오르고 굴절률이 변해(<b>열광학 효과</b>) 위상이 돌아갑니다. Si는 SiN보다 약 8배 민감해 같은 위상에 훨씬 적은 열이 듭니다.</p><p>놀라운 사실: π 위상에 드는 전력 P<sub>π</sub>는 히터 길이와 무관합니다 — 길면 온도는 덜 올라도 오래 쬐기 때문입니다. 열이 옆과 아래로 새는 것을 트렌치·언더컷으로 막으면 P<sub>π</sub>가 줄지만, 식는 데도 오래 걸려 응답이 느려집니다.</p>`,
      deep: () => `<p>Δφ = (2π/λ)(dn<sub>eff</sub>/dT)·ΔT·L, ΔT = (P/L)/G′ → P<sub>π</sub> = λG′/(2·dn<sub>eff</sub>/dT). G′(단위 길이당 열 컨덕턴스)는 히터–도파로 간격 h와 격리 구조로 정해지는 단면 2D 유한체적 열해석 테이블에서 옵니다. 응답 τ는 국소 적층 에너지법(C′/G′ 근사). 히터가 가까울수록(h↓) 효율은 좋지만 금속 흡수가 생깁니다. dn/dT: Si 1.86×10⁻⁴/K, SiN 2.45×10⁻⁵/K, SiO₂ 0.95×10⁻⁵/K.</p>`,
      fig: 'to', cap: 'TO 위상기 단면: 히터의 열이 도파로로(실선) 또는 옆으로(점선) 퍼짐. 트렌치가 옆 누설을 막음.',
      P: { h: { m: '히터와 도파로 사이 상부 클래딩 두께', up: '금속 흡수↓, P<sub>π</sub>↑', dn: 'P<sub>π</sub>↓, 금속 흡수↑', tr: '효율 ↔ 광 손실', f: 'P<sub>π</sub> ∝ G′(h)', rg: '0.5–2 µm' }, iso: { m: '열 격리: 없음 / 딥 트렌치 / 트렌치+언더컷', up: 'G′↓ → P<sub>π</sub>↓, τ↑', dn: '빠르지만 전력↑', tr: '효율 ↔ 속도', f: 'τ ≈ C′/G′', rg: '공정 단계 추가 비용' }, L: { m: '히터 길이', up: '히터 온도↓, 저항↑(구동 전압↑)', dn: '히터가 뜨거워짐(신뢰성 한계)', tr: 'P<sub>π</sub>는 불변 — 온도 ↔ 전압 창', f: 'P<sub>π</sub> 독립, ΔT<sub>heater</sub> ∝ P/L', rg: '수십~수백 µm' }, pitch: { m: '이웃 도파로 간격', up: '열 크로스토크↓, 면적↑', dn: '옆 채널 위상 오염', tr: '집적도 ↔ 크로스토크', f: '측방 온도 분포 (2D 열해석)', rg: '10–50 µm' } },
      ix: { k: 'h', m: [['P_π', (r) => r.Ppi, 'mW', 1], ['응답 시간 τ', (r) => r.tau, 'µs', 1], ['열 크로스토크', (r) => r.xt * 100, '%', 1]], note: '격리(iso)를 바꿔 같은 그래프를 다시 보세요 — 효율과 속도의 교환이 보입니다.' },
      miss: [[/P<sub>π<\/sub>|전력|Pπ/, 'h, iso', 'P_π = λG′/(2dn/dT)'], [/τ|응답|속도/, 'iso', '열 격리와 τ의 교환'], [/크로스토크|xt/i, 'pitch, iso', '측방 열 확산'], [/수율|트리밍|다이/, 'h, iso, L', '다이별 CWDM 트리밍 전력 예산']],
      lim: [['단면 열전달', 'pre', '2D 유한체적 열해석 사전계산 (tools/gen_thermal.py)'], ['3D 끝단·테더 누설', 'emp', '언더컷에 0.5 W/m·K 추가 (2D에서 볼 수 없는 경로)'], ['dn<sub>eff</sub>/dT', 'semi', '유효굴절률법'], ['히터 저항·드라이버', 'asm', 'TiN 시트저항·전압 한계 대표값'], ['최종 검증', 'fw', 'Ansys HEAT/CHARGE 등 3D 열·전기 해석']],
      refs: ['harris', 'rp_sip', 'chrost']
    }),
    pn: R({
      basic: () => `<p>Si에 p형·n형 도핑으로 접합을 만들고 역방향 전압을 걸면 접합 근처의 자유 캐리어가 빠져나갑니다(<b>공핍</b>). 캐리어 농도가 바뀌면 굴절률과 흡수가 변하는데(<b>plasma dispersion</b>), 이것으로 빠르게 위상을 바꿉니다.</p><p>도핑을 진하게 하면 효율(V<sub>π</sub>L↓)과 속도(저항↓)가 좋아지지만 캐리어 흡수 손실이 커집니다 — 효율·손실·속도의 삼각 교환이 이 레벨의 주제입니다.</p>`,
      deep: () => `<p>Soref–Bennett(1.55 µm): Δn = −(8.8×10⁻²²ΔN + 8.5×10⁻¹⁸ΔP<sup>0.8</sup>), Δα = 8.5×10⁻¹⁸ΔN + 6.0×10⁻¹⁸ΔP [cm⁻¹] (1.31 µm 계수 별도). 계단 접합 공핍 폭 W = √(2ε(V<sub>bi</sub>+V)(N<sub>A</sub>+N<sub>D</sub>)/(qN<sub>A</sub>N<sub>D</sub>)), 접합 C′ = εh/W, 슬랩 직렬 저항(Caughey–Thomas 이동도) → f<sub>RC</sub> = 1/(2πR′C′). 위상 변화는 공핍 변화 구간과 모드의 겹침(가로 1D 고유모드 × 세로 구속 Γ<sub>y</sub>)으로 계산합니다.</p>`,
      fig: 'pn', cap: 'PN 위상기: 역바이어스로 공핍층(주황)이 넓어지며 캐리어가 빠져 굴절률이 변함.',
      P: { na: { m: 'p 영역 도핑 농도 (log₁₀ cm⁻³)', up: '효율↑, 저항↓, 흡수 손실↑', dn: '손실↓, 효율↓', tr: '효율·속도 ↔ 손실', f: 'Δn ∝ ΔP<sup>0.8</sup> (정공이 더 효율적)', rg: '10¹⁷–5×10¹⁸' }, nd: { m: 'n 영역 도핑 농도 (log₁₀ cm⁻³)', up: '저항↓, 흡수↑', dn: '손실↓', tr: '전자는 손실 대비 Δn이 작음', f: 'Δn = −8.8×10⁻²²ΔN', rg: '10¹⁷–5×10¹⁸' }, xj: { m: '접합 위치 (리브 중심 기준)', up: '공핍 영역이 모드 중심에서 벗어남', dn: '반대 방향', tr: '모드 겹침 최대화', f: '위상 ∝ ∫ΔN(x)·|E(x)|²dx', rg: '±0.1 µm' }, vb: { m: '동작 역바이어스', up: '공핍↑ → 효율↑, C′↓ (빠름)', dn: '반대', tr: '구동 전압 ↔ 효율', f: 'W ∝ √(V<sub>bi</sub>+V)', rg: '0–3 V' }, dc: { m: '리브에서 컨택까지 거리', up: '금속 흡수↓, 저항↑', dn: '저항↓, 흡수↑', tr: '속도 ↔ 손실', f: 'R′ ∝ d<sub>c</sub>/(qμN·t<sub>slab</sub>)', rg: '0.5–1.5 µm' } },
      ix: { k: 'vb', m: [['V_πL', (r) => r.VpiL, 'V·cm', 2], ['광 손실', (r) => r.loss, 'dB/mm', 2], ['RC 대역폭', (r) => r.fRC, 'GHz', 0]], note: '도핑(N_A)을 바꿔 다시 보면 효율과 손실의 교환이 보입니다.' },
      miss: [[/V<sub>π<\/sub>L|효율/, 'na, nd, xj', 'plasma dispersion과 모드 겹침'], [/손실/, 'na, nd, dc', '자유 캐리어 흡수'], [/대역|RC|GHz/, 'na, nd, dc, vb', 'C′(W)와 R′']],
      lim: [['굴절률·흡수 변화', 'emp', 'Soref–Bennett 실험식 (1.31/1.55 µm)'], ['공핍 폭', 'an', '계단 접합 근사'], ['이동도', 'emp', 'Caughey–Thomas'], ['광 모드', 'semi', '리브 EIM + 1D 고유모드'], ['도핑 프로파일·2D 전계', 'fw', 'TCAD(Ansys CHARGE 등) 필요']],
      refs: ['soref', 'reed', 'rp_eom', 'chrost']
    }),
    mzm: R({
      basic: () => `<p>224 Gb/s 신호를 실으려면 마이크로파가 전극을 따라 빛과 <b>함께 진행</b>(traveling-wave)해야 합니다. 전극이 길수록 같은 위상에 낮은 전압(V<sub>π</sub>↓)이 들지만, 전기 손실과 빛·전기 속도 차 때문에 고주파에서 효율이 떨어집니다(대역폭↓).</p><p>전극 임피던스가 50 Ω 소스·종단과 맞지 않으면 반사가 생기고, PAM4 눈(eye)이 닫힙니다.</p>`,
      deep: () => `<p>CPW 등각사상(Hilberg)으로 무부하 Z<sub>0</sub>, ε<sub>eff</sub>; 직렬 push-pull 접합 부하 Y′ = η·jωC′/2/(1+jωR′C′)로 전신방정식 γ, Z<sub>L</sub>; 도체 손실 ∝ √f. EO 응답은 광 진행 좌표계에서 접합 전압을 적분(속도 부정합 n<sub>µ</sub> vs n<sub>g</sub>, 감쇠, 양끝 반사). 112 GBd PAM4 눈은 드라이버(2차, 70 GHz) × EO 응답 × MZM 사인 전달, 5-tap FFE 기준 수신기(잡음 증폭 √Σc²)로 평가합니다.</p>`,
      fig: 'mzm', cap: '진행파 MZM: 신호 전극 아래 두 팔의 PN 위상기를 마이크로파가 따라가며 구동.',
      P: { L: { m: '전극(변조) 길이', up: 'V<sub>π</sub>↓, 대역폭↓', dn: '대역폭↑, 구동 전압↑', tr: '효율 ↔ 속도', f: 'V<sub>π</sub> = V<sub>π</sub>L/L', rg: '1–4 mm' }, g: { m: 'CPW 신호–접지 간격', up: 'Z<sub>0</sub>↑', dn: 'Z<sub>0</sub>↓, 손실 변화', tr: '임피던스·속도 정합', f: 'Z<sub>0</sub> ∝ K(k′)/K(k) (등각사상)', rg: '수~수십 µm' }, eta: { m: '세그먼트 채움 비율 (접합 부하 비율)', up: '부하↑ → Z<sub>L</sub>↓, 속도↓, 효율↑', dn: '반대', tr: '효율 ↔ 임피던스·속도', f: 'Y′ = η·jωC′/2/(1+jωR′C′)', rg: '0.3–1' }, RT: { m: '종단 저항', up: '반사·전압 진폭 변화', dn: '반대', tr: 'Z<sub>L</sub>에 맞추면 반사↓', f: 'Γ = (R<sub>T</sub>−Z<sub>L</sub>)/(R<sub>T</sub>+Z<sub>L</sub>)', rg: '30–60 Ω' } },
      ix: { k: 'L', m: [['EO 대역폭', (r) => r.bw, 'GHz', 1], ['V_π', (r) => r.Vpi, 'V', 2], ['PAM4 페널티', (r) => r.pen, 'dB', 1]], note: '길이를 늘리면 V_π는 내려가지만 대역폭이 먼저 무너지는 지점을 찾으세요.' },
      miss: [[/대역|GHz/, 'L, eta, g', '속도 정합·RF 손실'], [/OMA|페널티|눈|eye/, 'L, RT, g', 'V_π와 대역폭의 균형, 반사'], [/S11|반사/, 'RT, g, eta', '임피던스 정합']],
      lim: [['CPW 임피던스', 'an', '등각사상 준-TEM'], ['접합 부하', 'semi', '2-2 카드의 C′, R′ 집중 모델'], ['도체 손실', 'emp', '√f 스케일'], ['눈 다이어그램', 'semi', 'PAM4 의사난수 + FFE 기준 수신기 (TDECQ 근사)'], ['RF 전자기장', 'fw', '3D EM(HFSS 등)·INTERCONNECT 검증 필요']],
      refs: ['reed', 'rp_eom', 'rp_mod', 'ieee3dj']
    }),
    mrr: R({
      basic: (c) => `<p>버스 도파로 옆에 둘레 L = 2πR인 고리를 두면, 한 바퀴 돈 빛이 같은 위상으로 돌아오는 파장(<b>mλ = n<sub>eff</sub>L</b>)에서 빛이 고리에 쌓입니다(공진). 버스의 투과 스펙트럼에는 공진마다 좁은 골이 생기고, 골 사이 간격이 <b>FSR ≈ λ²/(n<sub>g</sub>L)</b>입니다.</p>
        <p>고리 둘레에 PN 접합을 감고 역바이어스를 바꾸면 굴절률이 변해 공진이 옆으로 이동합니다. 레이저를 공진 골의 <b>사면</b>에 두면 이 이동이 세기 변화(변조)가 됩니다. 수십 µm의 작은 크기와 fJ/bit급 구동 에너지가 장점이고, 대신 공진이 온도에 매우 민감해(${c.pf.lam > 1.4 ? '≈75' : '≈64'} pm/K) <b>히터와 제어</b>가 반드시 필요합니다.</p>
        <p>이 레벨은 Guided 학습 다섯 단계(공진 → 결합·Q → 전기광학 → 고속 PAM4 → 온도)와 Full Design으로 되어 있습니다. 코치는 지금 설계의 다음 한 수를, 이 가이드는 왜 그런지를 설명합니다.</p>`,
      deep: () => `<p><b>All-pass 링</b>(Bogaerts 2012): 필드 자기결합 t, 결합 κ (t² + κ² = 1, 무손실 결합기), 한 바퀴 필드 투과 a = 10<sup>−αL/20</sup>. T = (a² − 2at·cosφ + t²)/(1 − 2at·cosφ + a²t²), φ = 2πn<sub>eff</sub>L/λ. Q<sub>i</sub> = πn<sub>g</sub>L√a/(λ(1−a)), Q<sub>c</sub> = πn<sub>g</sub>L√t/(λ(1−t)), Q<sub>L</sub> = πn<sub>g</sub>L√(at)/(λ(1−at)), 1/Q<sub>L</sub> ≈ 1/Q<sub>i</sub> + 1/Q<sub>c</sub>. t = a(Critical)에서 공진 골이 0, t &gt; a는 Under-, t &lt; a는 Over-coupled.</p>
        <p><b>결합</b>: 결합 슬랩 κ(d) = κ₀e<sup>−γd</sup>(Marcuse)를 휘어진 간격 d(z) = g + z²/2R 위에서 적분 → κ<sub>f</sub> = sin(κ₀e<sup>−γg</sup>√(2πR/γ)). <b>단면</b>: Si 리브 220/90 nm의 유효굴절률법(n<sub>eff</sub>, n<sub>g</sub>, ∂n/∂T, ∂n/∂w, ∂n/∂t). <b>접합</b>: 2-2와 같은 Soref–Bennett·공핍 근사로 Δn<sub>eff</sub>(V), α(V), C′(V), R′ — 둘레의 η = 75%를 덮음.</p>
        <p><b>동역학</b>: 결합 모드 이론 da/dt = (jΔ(t) − 1/τ(t))a − jμs, μ² = 2/τ<sub>e</sub>, 출력 s − jμa. 112 GBd PAM4 구동(드라이버 70 GHz × 접합 RC)을 시간영역으로 적분하고, 소신호 응답은 선형화한 CMT(Sacher &amp; Poon 2008) × RC 극. 공진 중심의 광자 수명 한계는 c/(2λQ<sub>L</sub>)이지만, 디튜닝 x = 2(λ<sub>L</sub> − λ<sub>r</sub>)/FWHM이 클수록 Ω ≈ |Δ| 근처에 피크가 생겨 대역이 넓어지고 정적 기울기는 줄어듭니다. OMA<sub>outer</sub>는 정착 레벨(TDECQ 방식), 동적 OMA는 파형 극값(오버슈트 포함, Huang 2026)으로 구분합니다.</p>
        <p><b>열</b>: ∂λ/∂T = λ(∂n<sub>eff</sub>/∂T)/n<sub>g</sub>. 히터 이동 Δλ = (P/P<sub>2π</sub>)·FSR, P<sub>2π</sub> = λG′/(∂n<sub>eff</sub>/∂T) — 반경과 무관, 그래서 작은 링(FSR↑)이 nm/mW에 유리. 히터는 빨강 쪽으로만 옮기고, 한 FSR 안에서 어느 공진 차수든 쓸 수 있어 최악 필요 전력은 P<sub>2π</sub>입니다. 흡수된 빛(자유 캐리어 + TPA)은 링을 데워 공진을 빨강 쪽으로 끌고(자기 가열), 레이저가 빨강 쪽(x &gt; 0)이면 양의 되먹임(열 폭주·쌍안정, Carmon 2004), 파랑 쪽이면 자기 안정입니다.</p>`,
      fig: 'mrr', cap: '링 변조기: 버스(아래) 옆의 링, 안쪽 p·바깥 n 접합(둘레 75%), 링 위 히터(점선). 오른쪽은 투과 스펙트럼의 공진 골.',
      P: {
        R: { m: '링 반경. 게임이 레이저 파장에 공진 차수 m을 맞춘 레이아웃 반경(1 nm 격자)으로 바꿔 GDS에 그대로 씀', up: 'FSR↓, 굽힘 손실↓, C<sub>j</sub>↑, 면적↑', dn: 'FSR↑ (히터 nm/mW↑), 굽힘 방사↑ (Q<sub>i</sub>↓)', tr: '열 튜닝 효율·FSR ↔ 굽힘 손실·C', f: 'FSR = λ²/(n<sub>g</sub>·2πR) · mλ = n<sub>eff</sub>·2πR', rg: 'Si 리브 링 ≈ 5–15 µm (90 nm 슬랩은 작은 반경에서 방사)' },
        g: { m: '버스–링 간격 (결합)', up: 'κ↓ → Q<sub>c</sub>↑ (Under-coupling 쪽), 선폭↓', dn: 'κ↑ → Over-coupling, Q<sub>L</sub>↓, 대역↑, ER↓', tr: '정적 기울기·ER ↔ 광자 수명 대역', f: 'κ<sub>f</sub> = sin(κ₀e<sup>−γg</sup>√(2πR/γ)) · t = √(1−κ²)', rg: '0.15–0.35 µm (고속 변조기는 보통 Over-coupled)' },
        dop: { m: '2-2 접합 도핑을 양쪽 모두 올리는 양 (log₁₀ decade)', up: 'pm/V↑, R↓, 자유 캐리어 손실↑ (Q<sub>i</sub>↓), C↑', dn: '손실↓, 효율↓', tr: '변조 효율 ↔ 손실·C', f: 'Δλ = λ·η·Δn<sub>eff</sub>/n<sub>g</sub> (Soref–Bennett)', rg: '0–0.8 decade (링 접합은 MZM보다 진하게 도핑하는 경우가 많음)' },
        vb: { m: 'DC 역바이어스 (PAM4 최저 레벨)', up: '공핍↑ → C<sub>j</sub>↓ (빠름), pm/V는 √V로 둔화', dn: 'C↑, 효율 구간 이동', tr: 'RC ↔ 효율', f: 'W ∝ √(V<sub>bi</sub>+V)', rg: '0–3 V' },
        vpp: { m: 'PAM4 바깥 레벨 사이 구동 진폭', up: 'OMA↑, 레벨 압축(Lorentzian 비선형)↑, CV² 에너지↑', dn: 'OMA↓', tr: 'OMA ↔ 선형성·구동 에너지', f: 'E<sub>bit</sub> ≈ 0.104·C<sub>j</sub>·V<sub>pp</sub>² (PAM4 충전)', rg: '1–3 V<sub>pp</sub>' },
        det: { m: '레이저와 레벨 0 공진의 간격, 반선폭 단위 x = 2(λ<sub>L</sub> − λ<sub>r</sub>)/FWHM (음수 = 파랑 쪽)', up: '|x|↑: 정적 기울기↓, 동적 응답 피크·대역↑, IL↓', dn: '|x|↓: 공진 골 가까이 (IL↑, 기울기 최대 |x| ≈ 0.58)', tr: '정적 기울기 ↔ 대역·IL · 파랑 쪽만 열적으로 안정', f: 'T(x) = 1 − D/(1 + x²) (Lorentzian 근사)', rg: '−1 … −0.5 (Huang 2026의 동작점 범위)' },
        bm: { m: '공진 배치 여유: 최고 온도에서 히터 없이 레이저보다 얼마나 파랑 쪽에 둘지', up: '공정 오차로 빨강 쪽으로 밀린 다이도 수용, 대신 평균 히터 전력↑', dn: '히터 전력↓, 공정 여유↓ (FSR 넘는 재정렬 증가)', tr: '수율 ↔ 열 제어 전력', f: '필요 이동 = 드리프트 + Δλ<sub>b</sub> − δ<sub>공정</sub> (mod FSR)', rg: '0 – FSR' },
        sT: { m: '칩 온도 (Guided 5단계)', up: '공진이 빨강 쪽으로 이동 (∂λ/∂T)', dn: '파랑 쪽 이동', tr: '온도 범위 = 필요한 히터 범위', f: 'Δλ = λ(∂n<sub>eff</sub>/∂T)ΔT/n<sub>g</sub>', rg: '0–70 °C (모듈 케이스 기준)' },
        sP: { m: '히터 전력 (Guided 5단계)', up: '공진이 빨강 쪽으로 (P/P<sub>2π</sub>·FSR)', dn: '되돌아감 (식는 쪽으로만 — 냉각 불가)', tr: '정렬 ↔ 전력', f: 'Δλ = (P/P<sub>2π</sub>)·FSR', rg: '0 – P<sub>2π</sub>' },
        sL: { m: '외부 광원(ELS) 파장 미세 조정 (Guided 5단계)', up: '레이저가 빨강 쪽 → 모든 온도에서 히터↑', dn: '파랑 쪽 → 최고 온도에서 히터로 못 따라감', tr: '히터 범위의 중심 맞추기', f: '필요 이동 = 드리프트 + Δλ<sub>b</sub> + Δλ<sub>L</sub>', rg: '±수백 pm' }
      },
      ix: { k: 'g', m: [['Q_L', (r) => r.QL, '', 0], ['EO 대역폭', (r) => r.bw, 'GHz', 1], ['OMA_outer', (r) => r.omaDbm, 'dBm', 1], ['정적 ER', (r) => r.er, 'dB', 2]], note: '간격을 줄이면(Over-coupling) Q_L이 떨어져 대역은 넓어지고 ER·OMA는 줄어드는 교환을 확인하세요. 디튜닝(x)을 바꿔 다시 보면 대역과 기울기의 교환이 보입니다.' },
      miss: [[/FSR/, 'R', 'FSR = λ²/(n_g·2πR)'], [/골|ER|Critical|Under|Over/, 'g', 't = a 임계 결합'], [/대역|GHz/, 'g, det, vb', '광자 수명 × 디튜닝 피크 × RC'], [/OMA|페널티|눈/, 'det, vpp, g', '정적 기울기와 레벨 압축, ISI'], [/히터|온도|°C/, 'bm, R', 'P_2π와 FSR, 드리프트'], [/열적 안정|루프/, 'det', '파랑 쪽 자기 안정'], [/IL|손실/, 'det, g', '공진 골과의 거리'], [/수율|Fab/, 'bm, R', '공정 공진 산포와 FSR 안의 히터 여유']],
      lim: [['링 전달함수·Q', 'an', 'all-pass Airy 식 (Bogaerts 2012), 무손실 결합기 가정'], ['리브 단면 n<sub>eff</sub>·n<sub>g</sub>·∂n/∂T', 'semi', '유효굴절률법 (벡터 모드 솔버보다 근사)'], ['결합 κ(g, R)', 'semi', '결합 슬랩 κ를 휘어진 간격 위에서 적분 — 결합 구간의 위상·파장 분산 무시'], ['굽힘 방사', 'semi', 'Marcuse 슬랩 식 (리브 측면 누설은 근사)'], ['접합 Δn(V)·α(V)·C·R', 'emp', '2-2 모델 (Soref–Bennett 실험식, 계단 접합) — 링 굽힘의 모드 이동 무시, 둘레 75% 가정'], ['동역학·EO 응답', 'an', '결합 모드 이론 (Haus; Sacher & Poon 2008) × RC 극, 드라이버 2차 70 GHz'], ['PAM4 눈', 'semi', '의사난수 128 심볼 + 5-tap FFE 기준 수신기 (TDECQ 근사, 잡음 미포함)'], ['열 단면 G′·히터', 'pre', '2-1 열해석 테이블(직선 단면)을 링 둘레에 적용 — 작은 링의 3D 열 확산 무시. 측정 히터 효율 73–160 pm/mW (Yuan 2024, Huang 2026)보다 낙관적일 수 있음'], ['자기 가열·TPA', 'asm', '흡수 = 자유 캐리어 + TPA(β ≈ 0.8–0.9 cm/GW, A<sub>eff</sub> 추정), 평균 전력의 정상 상태'], ['실험 기준 (참고)', 'exp', 'Yuan 2024: R 12 µm, Q≈3700, 11–16 pm/V, EO≈49 GHz, 바깥 ER 3.6 dB @200G PAM4 — 이 게임의 수치는 같은 범위인지 비교만 함'], ['3D 구조·도핑 프로파일', 'fw', '링 결합 영역 FDTD, 접합 TCAD, 3D 열해석으로 검증 필요']],
      refs: ['bogaerts', 'sacher', 'xu05', 'yuan24', 'huang26', 'carmon04', 'padmaraju', 'bristow', 'soref', 'reed']
    }),
    pd: R({
      basic: () => `<p>Si는 1.1 µm보다 긴 빛을 흡수하지 못하므로, 그 위에 키운 <b>Ge</b>가 빛을 흡수해 전자–정공을 만듭니다. Ge가 길면 빛을 다 흡수하지만 커패시턴스가 커져 느려지고, 진성층이 두꺼우면 캐리어가 이동하는 시간이 길어집니다.</p><p>수광기 뒤 TIA의 잡음은 입력 커패시턴스가 클수록 커집니다 — 감도는 흡수·속도·잡음의 균형입니다.</p>`,
      deep: () => `<p>응답도 ℜ = η·qλ/(hc) ≈ η·λ[µm]/1.24 A/W, η = 1 − exp(−Γ·α·L). 전이 한계 f<sub>t</sub> ≈ 0.45·v/d<sub>i</sub>, RC 한계 f<sub>RC</sub> = 1/(2π(R<sub>s</sub>+R<sub>in</sub>)C<sub>T</sub>), 합성 1/f² = 1/f<sub>t</sub>² + 1/f<sub>RC</sub>². 감도(OMA)는 TIA 입력 환산 잡음(C<sub>T</sub>에 비례 증가)과 PAM4 BER 2.4×10⁻⁴, 5-tap FFE 눈에서 계산합니다.</p>`,
      fig: 'pd', cap: 'Ge 수광기: Si 도파로의 빛이 위의 Ge로 에바네센트 결합되어 흡수됨.',
      P: { L: { m: 'Ge 흡수 길이', up: '흡수↑, 커패시턴스↑', dn: '흡수 부족', tr: '응답도 ↔ RC 대역', f: 'η = 1 − e<sup>−ΓαL</sup>', rg: '수~수십 µm' }, w: { m: 'Ge 폭', up: '정렬 여유·흡수 겹침↑, C↑', dn: 'C↓', tr: '흡수 ↔ 속도', f: 'C ∝ ε·w·L/d<sub>i</sub>', rg: '1–8 µm' }, di: { m: '진성층 두께', up: 'C↓, 전이 시간↑', dn: '빠른 전이, C↑', tr: '전이 ↔ RC', f: 'f<sub>t</sub> ≈ 0.45v/d<sub>i</sub>', rg: '0.2–1 µm' }, V: { m: '역바이어스', up: '전계↑ → 드리프트 속도 포화, 암전류↑', dn: '느린 전이', tr: '속도 ↔ 암전류', f: 'v(E) 포화 모델', rg: '0–3 V' } },
      ix: { k: 'L', m: [['응답도', (r) => r.resp, 'A/W', 3], ['PD 대역폭', (r) => r.bw, 'GHz', 0], ['감도 OMA', (r) => r.sensDbm, 'dBm', 1]], note: '길이가 짧으면 흡수가, 길면 커패시턴스가 감도를 망칩니다.' },
      miss: [[/응답도|흡수/, 'L, w', '흡수 1−e^(−ΓαL)'], [/대역|GHz/, 'di, L, w, V', '전이 시간과 RC'], [/감도|OMA/, 'L, di', 'TIA 잡음 ∝ C_T']],
      lim: [['Ge 흡수 계수', 'emp', '인장 변형 Ge-on-Si 문헌값 (최악 CWDM 채널)'], ['결합 Γ', 'semi', '수직·수평 겹침 근사'], ['속도', 'an', '전이 × RC 1차 극'], ['TIA 잡음', 'asm', '입력 C에 비례하는 대표 모델'], ['소자 물리', 'fw', 'TCAD·FDTD로 검증']],
      refs: ['michel', 'rp_pd', 'rp_det', 'chrost']
    }),
    els: R({
      basic: () => `<p>링크 버짓은 "레이저 출력에서 각 블록의 손실과 페널티를 빼고, 남은 신호가 수신 감도보다 큰가"를 dB로 더하는 계산입니다. 남는 여유를 <b>마진</b>이라 합니다.</p><p>레이저 하나로 여러 레인을 나누면 레이저 수는 줄지만 레인당 빛이 줄고, 칩에서 반사된 빛이 레이저로 돌아가면 잡음(RIN)이 커집니다 — 결합면을 비스듬히 깎거나 아이솔레이터를 씁니다.</p>`,
      deep: () => `<p>마진 = P<sub>las</sub> − (결합·분배 10log N·변조기 OMA 변환·Mux·채널·Demux 손실) − 페널티 − 감도. 반사 궤환: 파셋 Fresnel R = ((n₁−n₂)/(n₁+n₂))²에 경사각에 따른 가우시안 overlap 감소, 아이솔레이터, 왕복 결합 손실을 곱해 레이저가 보는 궤환 → RIN 페널티 로지스틱 근사. 레이저 WPE는 출력에 따라 감소(열) → 레인당 전력·pJ/bit.</p>`,
      fig: 'els', cap: '레인당 링크: 각 블록은 부품 카드(또는 그 레벨의 기준 설계) 값.',
      P: { P: { m: '레이저 출력', up: '마진↑, 전력↑, Si TPA↑', dn: '마진↓', tr: '마진 ↔ 전력·비선형', f: 'P<sub>el</sub> = P<sub>opt</sub>/WPE(P)', rg: '10–20 dBm' }, ns: { m: '레이저 하나가 맡는 레인 수', up: '레이저 수↓ (비용·전력↓), 레인당 −10log N', dn: '레이저 수↑', tr: '부품 수 ↔ 마진', f: '분배 손실 10·log₁₀N + 초과손실', rg: '1–8 레인' }, iso: { m: '광 아이솔레이터 유무', up: '반사 궤환↓, 삽입손실·비용↑', dn: '궤환 위험', tr: 'RIN ↔ 손실·비용', f: '궤환 dB 합산', rg: '—' }, th: { m: '결합면 경사각', up: '반사 궤환↓ (overlap 감소)', dn: '궤환↑', tr: '궤환 ↔ 결합 효율·공정', f: 'η<sub>fb</sub> ≈ exp(−(πθwn/λ)²)', rg: '0–12°' } },
      ix: { k: 'P', m: [['링크 마진', (r) => r.margin, 'dB', 2], ['pJ/bit', (r) => r.pj, 'pJ/b', 2], ['레이저 궤환', (r) => r.fb, 'dB', 1]] },
      miss: [[/마진/, 'P, ns', 'dB 합산 버짓'], [/반사|궤환|RIN/, 'th, iso', '파셋 반사와 경사 결합'], [/전력|pJ/, 'P, ns', 'WPE와 레이저 공유']],
      lim: [['버짓', 'an', '부품 카드 대표값의 dB 합'], ['반사·RIN 페널티', 'emp', 'Fresnel × 가우시안 overlap, 로지스틱 근사'], ['레이저 WPE', 'asm', '출력에 따른 열 감소 대표값'], ['시스템 검증', 'fw', 'INTERCONNECT 등 시스템 시뮬레이션과 측정']],
      refs: ['ieee3dj', 'oif', 'rp_ofc', 'rp_tx']
    }),
    xcvr: R({
      basic: () => `<p>마지막 단계는 소자가 아니라 <b>아키텍처</b>를 고르는 일입니다: 레이저 몇 개를 어떤 출력으로 돌릴지, 레이저를 냉각할지, Mux/Demux가 온도에 따라 밀리는 것을 히터로 따라갈지, DSP를 얼마나 쓸지.</p><p>케이스 온도 0–70 °C에서 가장 나쁜 레인의 마진이 0 이상이어야 하고, 그 와중에 모듈 전력(W)과 비트당 에너지(pJ/bit)를 줄여야 합니다.</p>`,
      deep: () => `<p>레인 마진 = 4채널 × 0/70 °C 코너의 최솟값. Demux는 1-7 lattice를 dn<sub>eff</sub>/dT만큼 굴절률을 옮겨 다시 계산(밴드 ±6.5 nm 최악) → 채널 드리프트 dλ/dT = λ(dn<sub>eff</sub>/dT)/n<sub>g</sub>. 비냉각 DFB −0.02 dB/K(25 °C 이상), WPE −0.5%/K, TEC 0.3 W + 발열/COP 0.6. 크로스토크 페널티 −10log(1−3·XT). DSP·드라이버·TIA·DC-DC 상수는 학습용 대표값입니다.</p>
        <p><b>DR8 링 변조기 (3A+).</b> 레인 링 = 2-3R 설계를 모듈의 변조기 입력 P<sub>mod</sub>(레이저 − 결합 − TPA − 분기)에서 다시 계산합니다: 이득 = OMA<sub>outer</sub>/P<sub>mod</sub>, 페널티는 같은 CMT × RC 눈. 히터(레인당) = [λ<sub>op</sub> + Δλ<sub>L</sub>(T) − λ<sub>r,unheated</sub>(T, P<sub>mod</sub>)] mod FSR × P<sub>2π</sub>/FSR, Δλ<sub>L</sub> = (dλ<sub>DFB</sub>/dT)(T − 25 °C) (비냉각) 또는 0 (TEC). 0–70 °C 최악값을 모듈 전력에 넣습니다. 자기 가열 개루프 이득 g<sub>th</sub> ≥ 1(빨강 쪽 디튜닝)이면 열 폭주로 링크가 닫히지 않는 것으로 봅니다. Fab: 다이의 폭·두께 오차로 생기는 공진 이동(선형 감도)과 레이저 파장 산포를 히터가 흡수합니다(한 FSR 안).</p>`,
      fig: 'xcvr', cap: '모듈: 송신(DSP→드라이버→변조기→Mux)과 수신(Demux→PD→TIA→DSP).',
      P: { P: { m: '레이저 출력(각)', up: '마진↑, 전력↑', dn: '마진↓', tr: '마진 ↔ 전력', f: '레인 마진 합산', rg: '10–20 dBm' }, share: { m: '레이저 공유 (레이저 수)', up: '레이저↓, 분배 손실↑', dn: '레이저↑', tr: '전력·비용 ↔ 마진', f: '−10log N', rg: '구성에 따름' }, tc: { m: '레이저 온도 관리 (비냉각/TEC)', up: 'TEC: 출력·WPE 안정, TEC 전력↑', dn: '비냉각: 고온 코너 마진↓', tr: '마진 ↔ 전력', f: 'P(T) −0.02 dB/K', rg: '—' }, mt: { m: 'Mux/Demux 열 대응 (고정/히터 추적)', up: '채널 드리프트 보정, 히터 전력↑', dn: '코너에서 밴드 밖으로', tr: '마진 ↔ 전력', f: 'dλ/dT = λ(dn/dT)/n<sub>g</sub>', rg: '—' }, dsp: { m: 'DSP 등화 (FFE / FFE+MLSE)', up: '페널티↓, 전력↑', dn: '전력↓', tr: '마진 ↔ 전력', f: 'MLSE +1.5 W', rg: '—' }, pkg: { m: '패키징 (DSP 플러거블 / LPO / CPO)', up: '전력↓ (DSP 제거·짧은 전기 경로)', dn: '—', tr: '전력 ↔ 전기/광 페널티', f: 'LPO/CPO 페널티 대표값', rg: '—' }, mod: { m: '변조기 (DR8 레인당): TW-MZM(2-3) / 링(2-3R)', up: 'MRR: 이득(OMA/P<sub>in</sub>)↑·면적↓, 레인별 히터·락 필요', dn: 'MZM: 광대역·온도 무관, 바이어스 히터만', tr: '마진·구동 ↔ 히터·락·열 안정', f: '링 히터 = (링 드리프트 − 레이저 드리프트)·ΔT mod FSR', rg: '0 = MZM, 1 = MRR' } },
      ix: { k: 'P', m: [['최악 레인 마진', (r) => r.margin, 'dB', 2], ['모듈 전력', (r) => r.pw, 'W', 1]] },
      miss: [[/마진/, 'P, tc, mt', '온도 코너와 드리프트'], [/전력|W|pJ/, 'share, tc, dsp, pkg', '아키텍처별 전력 항목'], [/수율/, 'mt, tc', '코너 마진의 여유']],
      lim: [['모듈 버짓', 'an', '부품 카드 대표값의 dB·W 조립'], ['Demux 열 이동', 'semi', '1-7 lattice를 dn<sub>eff</sub>/dT로 재계산'], ['DR8 링 변조기', 'semi', '2-3R 엔진을 모듈의 변조기 입력 파워에서 재계산(0.5 dB 격자 보간), 링 광학은 공칭 공정 + ±0.3 dB, 다이 공정 이동은 히터로'], ['DFB 파장 드리프트·산포, 링 락 전력, 드라이버 부하 차', 'asm', 'DFB 0.085/0.1 nm/K, σ 0.5 nm, 락 2 mW/레인, 드라이버 = MZM 등급 − 부하 에너지 차'], ['전력 상수', 'asm', 'DSP 10 W, MLSE +1.5 W, 드라이버·TIA·DC-DC 대표값'], ['실제 제품', 'fw', '표준(IEEE 802.3dj) 지표와 측정 검증']],
      refs: ['ieee3dj', 'oif', 'rp_wdm', 'rp_ofc']
    }),
    wdm: R({
      basic: () => `<p>DR8에서는 링 8개가 각자 광섬유를 가졌지만, WDM8에서는 8개의 파장이 <b>버스 하나</b>를 지나며 링 8개를 모두 통과합니다. 링 k는 자기 파장 λ<sub>k</sub>만 변조하고 나머지는 그냥 지나가게 해야 합니다.</p>
        <p>그러려면 (1) 링의 다음 공진 차수(FSR 간격으로 반복)가 다른 채널 위에 놓이지 않아야 하고(<b>FSR 별칭</b>), (2) 채널 간격이 링 선폭보다 충분히 넓어 이웃 링의 꼬리와 변조가 덜 섞여야 하고(<b>크로스토크</b>), (3) 공정·온도로 함께 움직이는 공진을 히터가 각자의 파장으로 데려가야 합니다(<b>공진 배정</b>). 히터는 빨강 쪽으로만 밀 수 있다는 점이 핵심입니다.</p>`,
      deep: () => `<p><b>버스 투과.</b> 채널 j의 세기 = 광원 선 P<sub>j</sub> − 결합 − (Si) 버스 TPA(8채널 합 파워) − Σ<sub>k≠j</sub> 링 k의 통과 손실 + 자기 링의 OMA 변환. 링 k의 투과는 2-3R과 같은 all-pass Airy 식 T(φ), φ = 2π(λ<sub>r,k</sub> − λ<sub>j</sub>)/FSR — 주기적이므로 FSR 별칭이 자동으로 들어갑니다. 변조 크로스토크 ε<sub>j</sub> = Σ<sub>k</sub>|T<sub>k</sub>(λ<sub>j</sub>; 레벨 3) − T<sub>k</sub>(λ<sub>j</sub>; 레벨 0)| / (자기 링의 같은 값), 페널티 −10log(1 − 3ε) (Rx Demux 크로스토크 합산).</p>
        <p><b>공진 배정과 히터.</b> 링 k의 가열 전 공진 = 설계 위치(같은 반경: 모두 λ₀ 근처 · 계단 반경: λ<sub>k</sub> 근처, 1 nm 레이아웃 격자 잔차) − (dλ/dT)(T<sub>max</sub> − T) + 다이 공정 이동 + 링 간 불일치. 필요 이동 = (목표 − 가열 전) mod FSR ≥ 0. 고정 배정: 링 k → λ<sub>k</sub>. 순환 배정(배럴 시프트): 링 k → λ<sub>(k+s) mod 8</sub>, 온도마다 히터 합이 최소인 s. 계단 반경이면 링들이 FSR 원 위에 고르게 퍼지므로, 8·Δλ가 FSR의 정수배일 때 공통 이동이 Δλ 단위로 흡수되고 각 링은 Δλ 이하만 밉니다(Krishnamoorthy 2011, Choi 2024의 Lock-to-Cyclic).</p>
        <p><b>열 결합.</b> 링 j의 이동 = η(P<sub>j</sub> + Σκ<sub>jk</sub>P<sub>k</sub>), κ(거리)는 2-1 히터 단면의 가로 온도 프로파일(긴 히터 기준이라 점 열원인 링에는 상한). 이웃 열이 목표를 넘겨 밀면 히터는 식힐 수 없으므로 다음 차수로 넘어갑니다(홉, 한 FSR 더).</p>
        <p><b>광원.</b> 콤: 레이저 하나, 선 세기 포물선(가장자리 −${KINDS.wdm._x.TILT} dB 가정), WPE ${KINDS.wdm._x.COMB_WPE * 100}% 가정. DFB ×8 + MUX(ELS 안): MUX ${KINDS.wdm._x.MUX_IL} dB, TEC·파장 잠금기, 같은 총 광출력에서 채널 마진이 같아지도록 선마다 출력을 맞춥니다.</p>`,
      fig: 'wdm', cap: '공유 버스: 8파장이 링 8개를 모두 지나고, 링 k는 λ_k(또는 순환 배정된 파장)만 변조.',
      P: { P: { m: '광원 선 세기 (채널당)', up: '마진↑, 버스 총 파워↑ → Si TPA·광원 전력↑', dn: '마진↓', tr: '마진 ↔ 전력·비선형', f: 'TPA ∝ (Σ P)²', rg: '4–16 dBm' },
        grid: { m: '파장 격자 Δf → Δλ = λ²Δf/c', up: '크로스토크↓, 8Δλ↑ → FSR이 더 커야 별칭 없음(작은 링)', dn: '크로스토크↑', tr: '크로스토크 ↔ FSR(반경)', f: 'Δλ = λ²Δf/c', rg: '200/400/800 GHz' },
        R: { m: '링 반경 (2-3R 설계, 반경만 변경)', up: 'FSR↓ (별칭 위험), 굽힘 손실↓', dn: 'FSR↑, 굽힘 손실↑ → Q·OMA↓', tr: 'FSR ↔ 링 손실', f: 'FSR = λ²/(n<sub>g</sub>·2πR)', rg: '3–12 µm' },
        rad: { m: '링 반경 배치 (같은 / 계단)', up: '계단: 링 k가 λ<sub>k</sub> 근처에서 출발 → 히터 이동↓ (셀이 링마다 다름)', dn: '같은 반경: 링 k가 k·Δλ를 히터로', tr: '튜닝 전력 ↔ 레이아웃 셀 수', f: 'ΔR<sub>k</sub> = R·n<sub>g</sub>Δλ<sub>k</sub>/(n<sub>eff</sub>λ)', rg: '—' },
        asg: { m: '공진 배정 (고정 / 순환)', up: '순환: 공통 이동을 채널 간격 단위로 흡수 (배럴 시프터로 데이터 레인 재배치)', dn: '고정: 공통 이동 전체를 히터로 (최대 한 FSR)', tr: '튜닝 전력 ↔ 데이터 경로 재배치', f: 'need = (λ<sub>(k+s)</sub> − λ<sub>unheated,k</sub>) mod FSR', rg: '—' },
        src: { m: '다파장 광원 (콤 / DFB ×8 + MUX)', up: 'DFB: 선마다 출력 조정 → 채널 마진 균일', dn: '콤: 레이저 하나, 가장자리 선 약함', tr: '마진 균일성 ↔ 광원 전력·MUX 손실', f: '같은 총 광출력에서 마진 등화', rg: '—' },
        pitch: { m: '링 간격 (버스 위)', up: '열 결합↓, 버스 손실·면적↑', dn: '열 결합↑ (홉 위험)', tr: '열 결합 ↔ 면적', f: 'κ(p): 2-1 단면 프로파일', rg: '2R + 20 µm 이상' } },
      ix: { k: 'R', m: [['최악 채널 마진', (r) => r.margin, 'dB', 2], ['FSR', (r) => r.fsr * 1000, 'nm', 2], ['Tx 링 히터 합', (r) => r.H.tot, 'mW', 1]], note: '8·Δλ 근처에서 FSR이 어디에 놓이는지 보세요 — 별칭과 순환 배정의 효율이 같이 바뀝니다.' },
      miss: [[/마진/, 'P, grid, R, src', 'FSR 별칭·크로스토크·선 세기'], [/튜닝|히터/, 'rad, asg, R', '8Δλ ≈ m·FSR과 순환 배정'], [/전력|W|pJ/, 'P, src', '광원 전력'], [/락|열/, 'pitch, R', '열 결합·히터 범위']],
      lim: [['버스 투과·크로스토크·별칭', 'an', 'all-pass Airy 곱 (2-3R 링 파라미터)'], ['링 광학', 'semi', '2-3R 엔진을 채널 입력 파워·반경에서 재계산 (눈은 평균 파워 하나)'], ['열 결합', 'semi', '2-1 2D 단면 프로파일 — 링(점 열원)에는 상한'], ['링 간 불일치 σ, 콤 기울기, 광원 WPE, MUX·Demux IL/XT, 히터 범위', 'asm', `σ ${KINDS.wdm._x.LOC_SIG} nm · 가장자리 −${KINDS.wdm._x.TILT} dB · WPE ${KINDS.wdm._x.COMB_WPE * 100}% · MUX ${KINDS.wdm._x.MUX_IL} dB · Rx Demux ${KINDS.wdm._x.RXD.il} dB · 1.2·P<sub>2π</sub>`], ['락 동역학·배정 알고리즘', 'fw', '온도마다 최적 배정을 고른다고 가정 — 재락 중 링크 중단·탐색 실패는 NOT VERIFIED']],
      refs: ['krish11', 'choi24', 'padma14', 'sun15', 'cwwdm', 'bogaerts']
    }),
    spiral: R({
      basic: (c) => `<p>빛을 2 ns 붙잡으려면 수십 cm의 도파로가 필요합니다(τ = n<sub>g</sub>L/c). 그 길이를 칩 위에 감으려면 <b>손실</b>(측벽 산란·굽힘 방사·S-bend 모드 변환)과 <b>면적</b>, 이웃 회전 사이의 <b>결합</b>을 함께 다뤄야 합니다.</p><p>요령은 도파로를 넓혀 측벽 산란을 줄이고(넓으면 멀티모드), 아주 천천히 굽혀 기본모드만 유지하는 것입니다. 곡률이 갑자기 바뀌는 곳(직선↔원호, S-bend 중심)에서는 기본모드가 고차모드로 바뀌므로 곡률을 서서히 바꾸는 Euler 곡선을 씁니다.</p>
        ${c.d && (c.d.lay | 0) >= 1 ? '<p><b>경계 기반 모드</b>: 먼저 사용 가능한 직사각형(W × H, 가장자리 여유, 포트 변)을 정하면, 생성기가 그 안에 직선이 경계와 평행한 직사각형 이중 나선을 실제 기하로 배치합니다. Mode A는 목표 지연을 정확히 맞추고(남는 면적을 억지로 채우지 않음), Mode B는 경계와 손실 예산이 허락하는 최대 지연을 찾습니다.</p>' : ''}`,
      deep: (c) => {
        const d = c.d || {}, p = (d.w || 2) + (d.gap || 1), Rr = d.rc || d.rin || 20;
        return `<p>산란: α<sub>sw</sub> ∝ σ<sub>sw</sub>²·(n₁²−n₂²)·∂n<sub>eff</sub>/∂w, α<sub>s</sub> ∝ σ<sub>s</sub>²·(n₁²−n₂²)·∂n<sub>eff</sub>/∂t (상수는 Hong 2022 Si 측정값에 한 번 맞춤). 굽힘: Marcuse 슬랩 방사 C₁·exp(−U·R), 경로를 따라 적분. 이웃 결합: 결합 슬랩 κ(gap) → L<sub>c</sub> = π/(2κ), 결합량 sin²(κL). 곡률 불연속 모드 변환: 가우시안 이동 그림 a = K·n<sub>s</sub>²·w³/(λ²R) (곡률 반전 2/R 기준, 모드 솔버 스윕에 맞춤), 직선↔원호 이음매(곡률 1/R 점프)는 a/2.</p>
        <p><b>직사각형 이중 나선의 기하</b> (경계 기반 모드): 팔 A의 k번째 회전 선은 위 y = H<sub>t</sub>+2kp, 오른쪽 x = c<sub>x</sub>+a₀+2kp, 아래 y = −(H<sub>t</sub>+p)−2kp, 왼쪽 x = −(c<sub>x</sub>+a₀+p)−2kp, 팔 B는 A를 180° 회전한 것이라 모든 변에서 정확히 p = W<sub>m</sub>+W<sub>gap</sub> 간격으로 맞물립니다. j번째 코너는 기본 코너를 바깥으로 j·p/2만큼 평행이동(offset)한 곡선 — 원호면 반경 R+d, Euler면 곡률 κ/(1+dκ)라 이음매에서 곡률이 0으로 연속입니다. 중앙 S-bend: 원호(반원 2개, R = H<sub>t</sub>/2, 중심에서 곡률 ±2/R 반전) 또는 Euler U-turn 2개(R<sub>min</sub> = H<sub>t</sub>/2.754, 중심에서 곡률이 0을 지나 연속). 길이·지연·손실·DRC·포트 위치는 모두 이 기하에서 계산되고, GDS(smq2gds spiral_rect)도 같은 기본 도형으로 그립니다.</p>
        <h4>구조 비교 (현재 피치 p ≈ ${p.toFixed(2)} µm, R ≈ ${Rr} µm 기준)</h4>
        <div class="gtbl"><table><tr><th>구조</th><th>면적 효율</th><th>곡률 불연속</th><th>직사각형 적합</th><th>이 게임</th></tr>
        <tr><td>원형 이중 나선 (Legacy)</td><td>원 안을 피치 p로 채움, 경계 사각형의 모서리 ≈21% 미사용</td><td>아르키메데스 곡률은 연속, 중앙 S-bend만</td><td>정사각형에 가까울 때</td><td>D-1 기본</td></tr>
        <tr><td>직사각형 나선 · 원호 코너</td><td>직선 구간으로 직사각형을 채움, 피치 p 유지</td><td>코너마다 직선↔원호 1/R 점프 → 넓은 멀티모드는 큰 R 필요</td><td>좋음</td><td>레이아웃 2번</td></tr>
        <tr><td>직사각형 나선 · Euler 코너</td><td>동일 (코너 접선 길이 a₀ = 1.87·R<sub>min</sub>)</td><td>offset 곡선도 곡률 연속 → 이음매 변환 없음</td><td>좋음</td><td>레이아웃 3번 (권장)</td></tr>
        <tr><td>Serpentine (지그재그)</td><td>이웃 직선 간격이 2R로 제한 → 피치 대비 약 ${(2 * Rr / p).toFixed(0)}배 성김</td><td>180° 굽힘마다 반전</td><td>포트 배치는 쉬움</td><td>구현하지 않음 (면적 효율 열세)</td></tr></table></div>`;
      },
      fig: 'spiral', cap: (c) => (c.d && (c.d.lay | 0) >= 1 ? '직사각형 이중 나선: 두 팔이 피치 p로 맞물리고 중앙 S-bend로 이어짐. 점선 = 사용 가능 경계.' : '이중 아르키메데스 나선: 두 팔(주황·파랑)이 맞물려 감기고 중앙 S-bend(초록)로 이어짐.'),
      P: {
        lay: { m: '레이아웃 방식: 원형(Legacy) / 직사각형 원호 코너 / 직사각형 Euler 코너', up: '—', dn: '—', tr: '면적 채움·곡률 연속성', f: '아래 구조 비교 표', rg: '경계가 직사각형이면 2·3번' },
        w: { m: '나선 도파로 폭', up: '측벽 산란↓(∂n<sub>eff</sub>/∂w↓), 멀티모드화, 피치↑', dn: '산란↑, 단일모드', tr: '손실 ↔ 모드 변환·면적', f: 'α<sub>sw</sub> ∝ σ²(n₁²−n₂²)∂n<sub>eff</sub>/∂w', rg: 'Si 1.5–2.5 µm 근처에서 손실 최소권' },
        gap: { m: '이웃 회전 사이 간격', up: '결합↓(지수적), 면적↑', dn: '면적↓, 결합↑', tr: '결합 ↔ 면적 (≈ 면적/피치 = 길이)', f: 'κ ∝ e<sup>−γ·gap</sup>, L<sub>c</sub> = π/(2κ)', rg: (c) => `DRC 최소 ${c.pf.rules.gap} µm` },
        rin: { m: '나선 안쪽 반경 (원형) = S-bend 최대 반경', up: '굽힘·S-bend 손실↓, 면적↑', dn: 'S-bend 급해짐', tr: '손실 ↔ 면적', f: '굽힘 C₁e<sup>−UR</sup>', rg: 'Si 수십 µm, SiN 수백 µm' },
        ws: { m: 'S-bend 중앙 폭 (Euler에서 테이퍼)', up: '좁은 구간 산란↓, 고차모드 허용', dn: '중앙이 단일모드에 가까워 변환 억제, 산란↑', tr: '변환 ↔ 산란', f: '변환 a ∝ w³/(λ²R)', rg: '단일모드 폭 근처' },
        sb: { m: '중앙 S-bend 종류', up: 'Euler: 곡률 연속(직사각형) / 테이퍼 Euler(원형)', dn: '원호: 곡률 반전 2/R', tr: '변환 ↔ 크기', f: '원호 R = H<sub>t</sub>/2 · Euler U-turn R<sub>min</sub> = H<sub>t</sub>/2.754', rg: '—' },
        bp: { m: '사용 가능 영역 프리셋', up: '—', dn: '—', tr: '칩/유리 기판의 직사각형 영역', f: 'W × H (mm)', rg: '5×5, 5×15, 10×30, 직접 입력' },
        bw: { m: '경계 폭 W (가로, x)', up: '더 긴 직선 가능', dn: '—', tr: '면적 ↔ 지연', f: '정준 좌표의 긴 축 = max(W, H)', rg: '1–40 mm' },
        bh: { m: '경계 높이 H (세로, y)', up: '회전 수 여유↑', dn: '—', tr: '면적 ↔ 지연', f: '정준 좌표의 짧은 축 = min(W, H)', rg: '1–40 mm' },
        ec: { m: '가장자리 여유 (도파로 금지 띠)', up: '사용 영역↓', dn: '경계에 붙음', tr: '다이싱·결합 여유 ↔ 면적', f: '사용 영역 (W−2e)×(H−2e)', rg: '50–500 µm' },
        port: { m: '입출력 포트 위치 (짧은 변 / 동서 / 남북)', up: '—', dn: '—', tr: '긴 변으로 나가려면 90° 코너 + 여유 띠 필요', f: '포트는 여유 선 위에서 끝남', rg: '패키지 광섬유 배치에 맞춤' },
        dm: { m: '설계 모드 A(목표 지연) / B(최대 사용 지연)', up: '—', dn: '—', tr: 'A: 정확한 τ, 남는 면적은 비움 · B: 면적·손실 한계까지', f: 'A: L = cτ/n<sub>g</sub> · B: min(L<sub>면적</sub>, L<sub>손실 예산</sub>)', rg: '별·카드는 A (τ = 레벨 기준)' },
        tau: { m: '목표 지연 (Mode A)', up: '길이↑ → 손실↑, 회전↑', dn: '—', tr: '지연 ↔ 손실·면적', f: 'L = cτ/n<sub>g</sub>', rg: '레벨 별 기준 2 ns' },
        ilb: { m: 'Mode B 허용 삽입 손실', up: '더 긴 지연 허용', dn: '—', tr: '지연 ↔ 손실', f: 'L<sub>손실</sub> = (IL<sub>max</sub> − 고정 손실)/α', rg: '응용에 따름' },
        env: { m: '점유 상한 f (경계 대비 나선 본체 크기)', up: '회전 수↓, 반경·S-bend↑ → 손실↓, 면적↑', dn: '컴팩트, 회전↑, S-bend↓', tr: '면적 ↔ 손실·모드 변환', f: '본체 ≤ f × 사용 영역, 최소 회전 수로 τ를 맞춘 뒤 코어를 줄여 정확히 맞춤', rg: '0.02–1' },
        rc: { m: '코너 반경 R (원호) / 코너 최소 반경 R<sub>min</sub> (Euler 꼭짓점)', up: '굽힘·이음매 변환↓, 코어 최소 크기↑', dn: '컴팩트, 변환·굽힘↑', tr: '손실 ↔ 면적', f: '원호 a₀ = R · Euler a₀ = 1.87R<sub>min</sub>, 길이 πR<sub>min</sub>', rg: '굽힘 방사 &lt; 0.01 dB/cm인 최소값부터' },
        tl: { m: '입출력 테이퍼 길이 (W<sub>m</sub> → w₀)', up: '단열↑, 포트 직선이 길어야 함', dn: '짧은 스텁', tr: '테이퍼 손실 ↔ 포트 직선', f: '포트 직선 ≥ L<sub>t</sub> (DRC)', rg: 'Si 30–100 µm, SiN 100–300 µm' }
      },
      ixCustom: 'spiral', ix: (c) => (c.d && (c.d.lay | 0) >= 1 ? { k: 'env', m: [['삽입 손실', (r) => (r.drc && r.drc.length ? NaN : r.IL), 'dB', 2], ['본체 면적', (r) => (r.drc && r.drc.length ? NaN : r.size / 1e6), 'mm²', 2], ['고차모드 변환', (r) => (r.drc && r.drc.length ? NaN : r.xtMode), 'dB', 1]], note: '끊긴 구간은 그 값에서 Infeasible(경계 안에 못 들어감)입니다.' } : { k: 'w', m: [['전파 손실 α', (r) => r.x.alpha, 'dB/cm', 3], ['삽입 손실', (r) => r.IL, 'dB', 2], ['S-bend 변환', (r) => r.xtMode, 'dB', 1]] }),
      miss: [[/손실/, 'w, rin/R, f', '산란 ∝ ∂n_eff/∂w, 굽힘 방사'], [/변환|고차모드/, 'sb, ws, R', '곡률 불연속과 Euler 곡선'], [/결합|이웃/, 'gap', 'κ(gap)와 L_c'], [/면적|bbox|점유/, 'gap, f, R', '면적 ≈ 길이 × 피치'], [/DRC|경계|Infeasible/, 'f, gap, R', '경계 안 배치 조건'], [/수율/, 'w', '거칠기·CD 변동']],
      lim: [['단면 n<sub>eff</sub>·n<sub>g</sub>', 'semi', 'EIM (세로 TE 슬랩 → 가로 TM 슬랩)'], ['산란 상수', 'emp', 'Hong 2022 Si 측정(0.28/0.38/5.5 dB/cm)에 한 번 맞춤, SiN은 σ 가정'], ['굽힘 방사', 'semi', 'Marcuse 슬랩 식 — SiN 임계 반경을 실제보다 작게 예측하는 경향'], ['S-bend 반전 변환', 'pre', '국소 모드 솔버 스윕(1−|⟨E₊|E₋⟩|²)에 맞춘 상수'], ['직선↔원호 이음매 변환', 'semi', '같은 식의 a/2를 이음매마다 비간섭 합 (Engineering Estimate)'], ['TE1 재결합·벤드 구간 결합', 'fw', '포함하지 않음 — 3D/EME로 검증'], ['기하·GDS', 'an', '게임 화면·예측·GDS가 같은 기본 도형 (smq2gds spiral_rect, 길이·경계·간격 테스트)']],
      refs: ['hong', 'xie', 'payne', 'marcuse', 'cherchi', 'rp_bend', 'rp_prop', 'rp_dl', 'gdsf']
    }),
    ttd: R({
      basic: () => `<p>N개의 스위치가 각자 "짧은 길" 또는 "2<sup>k</sup>·Δτ 지연 나선"을 고르면 0부터 (2<sup>N</sup>−1)Δτ까지 Δτ 단위로 지연을 바꿀 수 있습니다(<b>true-time delay</b>).</p><p>스위치가 완벽히 꺼지지 않으면 다른 길로 새어 든 빛이 늦게 도착하는 "에코"가 생깁니다. 공정 오차로 생긴 위상 오차를 히터로 보정하는 전력도 비트 수만큼 늘어납니다.</p>`,
      deep: () => `<p>스위치 위상 오차 σφ = (2π/λ)·|∂n<sub>eff</sub>/∂w|·σ<sub>w</sub>·√(L·l<sub>c</sub>) (국소 폭 요동 σ<sub>w</sub> 2 nm, 상관 길이 l<sub>c</sub> 3 µm 가정). 보정 전력 Q₀ = (|δφ|/π)·P<sub>π</sub>, 보정 후 잔차(초기의 15% 가정) → 스위치 누설 → 에코. 넓은 멀티모드 암은 ∂n<sub>eff</sub>/∂w를 한 자릿수 줄입니다(Xie 2023: 2 µm 암에서 Q₀/Q<sub>π</sub> &lt; 0.05).</p>`,
      fig: 'ttd', cap: 'N-bit TTD: 각 단의 MZ 스위치가 짧은 길 또는 2^k·Δτ 나선을 선택.',
      P: { N: { m: '비트 수 (스위치 단 수)', up: '범위 2<sup>N</sup>Δτ↑, 손실·에코·전력↑', dn: '범위↓', tr: '범위 ↔ 손실·전력', f: 'τ ∈ {0 … (2<sup>N</sup>−1)Δτ}', rg: '3–11' }, dt: { m: '최소 지연 단위', up: '범위↑, 분해능↓', dn: '분해능↑', tr: '분해능 ↔ 범위', f: 'τ<sub>k</sub> = 2<sup>k</sup>Δτ', rg: '수~수십 ps' }, wa: { m: '스위치 위상기 암 폭', up: '∂n<sub>eff</sub>/∂w↓ → 위상 오차↓, P<sub>π</sub> 변화', dn: '오차↑', tr: '보정 전력·에코 ↔ 크기', f: 'σφ ∝ |∂n<sub>eff</sub>/∂w|', rg: '단일모드 ~ 2.5 µm' } },
      ix: { k: 'wa', m: [['최악 에코', (r) => r.echo, 'dB', 1], ['보정 히터 전력', (r) => r.pw, 'mW', 0], ['손실 변동', (r) => r.dil, 'dB', 2]] },
      miss: [[/에코|echo/i, 'wa, N', '스위치 누설과 위상 오차'], [/범위|분해능/, 'N, dt', '이진 지연 구성'], [/전력/, 'wa, N', '보정 전력 Q₀'], [/손실/, 'N, dt', '나선 손실 누적']],
      lim: [['나선', 'semi', 'D-1 모델(카드 또는 기준 설계)'], ['위상 오차 통계', 'asm', 'σ<sub>w</sub> 2 nm, l<sub>c</sub> 3 µm 가정'], ['보정 잔차', 'asm', '초기 오차의 15%'], ['스위치 분산·크로스토크', 'fw', '회로 시뮬레이션·측정 필요']],
      refs: ['hong', 'xie', 'rp_dl']
    }),
    chirp: R({
      basic: () => `<p>FMCW LiDAR는 레이저 주파수를 시간에 따라 쓸어 올리고(처프) 내립니다. 표적에서 돌아온 빛은 τ = 2R/c만큼 늦으므로, 지금 내보내는 빛과 섞으면 거리에 비례하는 <b>비트 주파수</b>가 나옵니다.</p><p>쓸어 올리는 폭(대역폭 B)이 넓을수록 거리 분해능이 좋아지고(c/2B), 레이저 선폭이 넓으면 먼 거리에서 신호가 흐려집니다. 처프가 직선이 아니면 비트가 번지므로 칩 위 <b>기준 간섭계</b>로 비선형을 측정해 보정합니다.</p>`,
      deep: () => `<p>γ = B/T, f<sub>b</sub> = 2Rγ/c ≤ ADC 대역(500 MHz 가정), 분해능 ΔR = c/(2B), 각 램프의 데드타임 2R/c. 코히어런스: exp(−2πΔν·2R/c). 예왜곡 잔류 처프 오차 e = √(e<sub>j</sub>² + Δν/(2πτ<sub>ref</sub>M) + e<sub>meas</sub>²) → 비트 위상 오차 σφ = 2π(2R/c)e → exp(−σφ²). 기준 지연의 온도 의존: ΔR/R = (1/n<sub>g</sub>)(dn<sub>g</sub>/dT)ΔT.</p>`,
      fig: 'chirp', cap: 'FMCW: 송신 처프(주황)와 τ만큼 늦은 수신(파랑)의 주파수 차가 비트 f_b.',
      P: { las: { m: '레이저 종류 (선폭·튜닝·지터)', up: '—', dn: '—', tr: '선폭 ↔ 처프 범위·비용', f: 'exp(−2πΔν·2R/c)', rg: '대표값 가정' }, B: { m: '처프 대역폭', up: '분해능↑, 비트↑ (ADC 한계)', dn: '분해능↓', tr: '분해능 ↔ ADC 거리', f: 'ΔR = c/2B, f<sub>b</sub> = 2RB/(cT)', rg: '1–10 GHz' }, T: { m: '램프 시간(한 방향)', up: '비트↓, 점 속도↓', dn: '점 속도↑, 비트↑', tr: '점 속도 ↔ ADC·SNR', f: 'γ = B/T', rg: '수~수십 µs' }, tau: { m: '기준 간섭계 지연', up: '처프 측정 정밀도↑, 나선 손실↑', dn: '정밀도↓', tr: '보정 정밀도 ↔ 손실·면적', f: 'e ∝ √(Δν/(τ<sub>ref</sub>M))', rg: 'D-1 나선 수 ns' }, tc: { m: '기준 지연 온도 보정', up: '거리 눈금 오차↓', dn: '±10 K 드리프트', tr: '보정 회로 ↔ 정확도', f: 'ΔR/R = (1/n<sub>g</sub>)(dn<sub>g</sub>/dT)ΔT', rg: '—' } },
      ix: { k: 'B', m: [['거리 분해능', (r) => r.dR, 'cm', 1], ['SNR 손실', (r) => r.loss, 'dB', 2], ['ADC 최대 거리', (r) => r.Radc, 'm', 0]] },
      miss: [[/분해능/, 'B', 'ΔR = c/2B'], [/SNR|손실/, 'las, tau', '코히어런스와 처프 비선형'], [/눈금|보정|cal/i, 'tc, tau', '기준 지연 온도 의존'], [/ADC|거리/, 'B, T', 'f_b = 2RB/(cT)']],
      lim: [['처프·비트 관계', 'an', 'FMCW 기본식'], ['레이저 선폭·지터', 'asm', '대표값 가정'], ['잔류 처프 오차', 'semi', '통계 모델 (예왜곡 평균 M = 1000 가정)'], ['도플러·다중 반사', 'fw', '포함하지 않음 — 시스템 시뮬레이션/측정']],
      refs: ['rp_lidar', 'rp_chirp', 'rp_lw', 'rp_het', 'rogers']
    }),
    fpsa: R({
      basic: () => `<p>렌즈의 초점면에 방출기를 한 줄로 늘어놓고 스위치로 하나를 켜면, 방출기 위치에 따라 빛이 나가는 <b>각도</b>가 정해집니다 — 기계적으로 움직이지 않는 빔 조향입니다.</p><p>초점거리가 길면 각도 분해능은 좋아지지만 시야각(FOV)이 좁아지고, 방출기 간격과 빔 퍼짐이 맞지 않으면 빈틈이나 유령 빔이 생깁니다.</p>`,
      deep: () => `<p>방출기 i: θ<sub>i</sub> = atan(x<sub>i</sub>/f). 가우시안 방출 모드(1/e² 반경 w<sub>e</sub>) → 렌즈 뒤 빔 반경 w<sub>b</sub> = λf/(πw<sub>e</sub>), 각 퍼짐 w<sub>e</sub>/f (FWHM 1.18배). 커버리지 = 빔 FWHM 각 / 각 피치 p/f. 수차는 NA·시야각에 대한 경험식. 스위치: 열광학(0.3 dB, −27 dB 소광) 또는 PIN(0.9 dB, −19 dB, ns) 대표값.</p>`,
      fig: 'fpsa', cap: '초점면 스위치 어레이: 켜진 방출기의 위치가 빔 각도를 정함.',
      P: { k: { m: '스위치 트리 단 수 (방출기 N = 2<sup>k</sup>)', up: '각도 수↑, 손실·전력↑', dn: 'FOV·분해능↓', tr: '점 수 ↔ 손실', f: 'N = 2<sup>k</sup>', rg: '3–9' }, p: { m: '방출기 간격', up: 'FOV↑, 빈틈↑', dn: '겹침·유령↑', tr: '커버리지 ↔ FOV', f: 'Δθ = p/f', rg: '수~수십 µm' }, f: { m: '렌즈 초점거리', up: '분해능↑, FOV↓, 렌즈 큼', dn: 'FOV↑, 분해능↓', tr: 'FOV ↔ 분해능', f: 'θ = atan(x/f), w<sub>b</sub> = λf/(πw<sub>e</sub>)', rg: '수 mm' }, we: { m: '그레이팅 방출 모드 반경', up: '빔 퍼짐↓ (분해능↑)', dn: '퍼짐↑', tr: '퍼짐 ↔ 간격', f: '퍼짐 w<sub>e</sub>/f', rg: '수 µm' }, sw: { m: '스위치 종류 (열광학 / PIN)', up: 'PIN: 빠름(ns), 손실·누설↑', dn: '열: 느림(µs), 저손실', tr: '점 속도 ↔ 손실·유령', f: '대표값', rg: '—' } },
      ix: { k: 'f', m: [['FOV', (r) => r.fov * 180 / Math.PI, '°', 1], ['각 분해능', (r) => r.res * 180 / Math.PI, '°', 3], ['편도 손실', (r) => r.il, 'dB', 1]] },
      miss: [[/FOV|시야/, 'p, f, k', 'θ = atan(x/f)'], [/분해능/, 'f, we', '빔 퍼짐 w_e/f'], [/유령|ghost|커버/i, 'p, we', 'FWHM/피치 커버리지'], [/손실|점 속도/, 'k, sw', '스위치 손실과 정착 시간']],
      lim: [['가우시안 빔 광학', 'an', '근축 근사'], ['렌즈 수차', 'emp', 'NA·시야각 경험식'], ['스위치 손실·소광', 'asm', '대표값'], ['그레이팅 방출기', 'fw', '방출 패턴은 FDTD로 설계해야 함']],
      refs: ['rogers', 'rp_scan', 'rp_lidar']
    }),
    lidar: R({
      basic: () => `<p>표적에서 돌아오는 빛은 거리의 제곱에 반비례해 약해집니다. 코히어런트 검출은 약한 신호를 강한 국부 발진(LO) 빛과 섞어 증폭하므로, 아주 약한 신호도 잡을 수 있습니다.</p><p>광원 출력·채널 수·LO 비율·점당 처프 수를 조절해 반사율 10% 표적의 최대 거리와 초당 점 수, 전력을 함께 맞춥니다.</p>`,
      deep: () => `<p>P<sub>rx</sub> = P<sub>out</sub>·ρ·D²/(4R²)·η<sub>het</sub> (람베르트 표적, η<sub>het</sub> 0.4: 스펙클), 왕복 칩 손실. 균형 검출 SNR = ℜP<sub>rx</sub>T<sub>int</sub>/q × (2qℜP<sub>LO</sub>/(2qℜP<sub>LO</sub>+i<sub>n</sub>²)) × 코히어런스·처프 비선형 인자, N<sub>av</sub>개 비코히어런트 적산 √N<sub>av</sub>, 검출 임계 13 dB. Si는 고출력에서 TPA/FCA 손실(근사).</p>`,
      fig: 'lidar', cap: '모노스태틱 코히어런트 FMCW LiDAR 링크.',
      P: { P: { m: '광원 출력 (부스터 포함)', up: '거리↑, 전력·TPA↑, 눈 안전 검토', dn: '거리↓', tr: '거리 ↔ 전력', f: 'P<sub>rx</sub> ∝ P<sub>out</sub>/R²', rg: '10–30 dBm' }, nch: { m: '병렬 채널 수', up: '점 속도↑, 채널당 출력↓', dn: '—', tr: '점 속도 ↔ 거리', f: '출력/N<sub>ch</sub>', rg: '1–8' }, lo: { m: 'LO 분기 비율', up: '샷잡음 한계 접근, 송신 출력↓', dn: '열잡음 지배', tr: '수신 이득 ↔ 송신 출력', f: 'SNR 인자 2qℜP<sub>LO</sub>/(…+i<sub>n</sub>²)', rg: '수~수십 %' }, nav: { m: '점당 처프 수 (적산)', up: 'SNR √N<sub>av</sub>↑, 점 속도↓', dn: '—', tr: 'SNR ↔ 점 속도', f: '√N<sub>av</sub>', rg: '1–16' } },
      ix: { k: 'P', m: [['최대 거리 @10%', (r) => r.Rmax, 'm', 0], ['점 속도', (r) => r.pr, 'kpts/s', 1], ['전력', (r) => r.pw, 'W', 2]] },
      miss: [[/거리/, 'P, lo, nav', 'P_rx ∝ ρD²/R²와 코히어런트 이득'], [/점 속도/, 'nch, nav', '병렬화와 적산'], [/전력/, 'P, nch', '광원·부스터 전력']],
      lim: [['링크 식', 'an', '모노스태틱 람베르트'], ['스펙클·η<sub>het</sub>', 'asm', '0.4 가정'], ['TIA 잡음·임계', 'asm', '10 pA/√Hz, 13 dB'], ['눈 안전·도플러·다중 반사', 'fw', '다루지 않음 — 규격·시스템 해석 필요']],
      refs: ['rp_lidar', 'rp_het', 'rogers', 'rp_pd']
    })
  };

  /* ---------- UI ---------- */
  const dlg = $('#guide-dlg'), box = dlg.querySelector('.gdlg'), body = $('#guide-body');
  let lastFocus = null, ctx = null, depth = 'basic';
  try { const v = String(localStorage.getItem('smq-guide-depth') || '').replace(/"/g, ''); if (v === 'deep' || v === 'basic') depth = v; } catch (e) { /* storage unavailable */ }   // raw (v0.x) or JSON (SMQ_STORE)
  const fn = (v, c) => (typeof v === 'function' ? v(c) : v);
  const lvName = (id) => { const L = ctx && ctx.levels.find((x) => x.id === id); return L ? `${id} ${L.name}` : id; };
  const sec = (id, n, title, html) => `<section class="gsec" id="g-${id}" aria-labelledby="g-${id}-h"><h3 id="g-${id}-h" tabindex="-1"><span class="n">${n}</span>${title}</h3>${html}</section>`;
  function secA(c, G) {
    const g = GL[c.id] || {}, lv = c.lvl;
    return `<p><b>이 레벨의 목적.</b> ${g.goal || strip(lv.brief)}</p>`
      + `<div class="roles"><div><b>이전에 배운 것</b>${(g.prev || []).map((x) => `· ${x}`).join('<br>') || '—'}</div><div><b>다음에 쓰는 곳</b>${(g.next || []).map((x) => `· ${x}`).join('<br>') || '—'}</div><div><b>부품 카드의 역할</b>${lv.role || '—'}${c.hasCard(c.id) ? ' · <span style="color:var(--pass)">카드 보유</span>' : ''}</div></div>`
      + (c.step ? `<p class="note">지금은 Guided 학습 ${c.step.idx + 1}/${c.step.n}단계(${c.step.title})입니다. 이 가이드는 레벨 전체의 원리를 다룹니다.</p>` : '');
  }
  function secB(c, G) {
    let img = '';
    try { const cv = c.canvas; if (cv && cv.width && typeof cv.toDataURL === 'function' && !/jsdom/i.test(navigator.userAgent)) { const u = cv.toDataURL('image/png'); if (u && u.length > 100) img = `<figure><img src="${u}" alt="현재 설계 화면"><figcaption>지금 설계의 게임 화면 (열 때의 스냅숏).</figcaption></figure>`; } } catch (e) { img = ''; }
    const concepts = c.lvl.concepts ? `<h4>게임 개념 노트</h4><ul>${c.lvl.concepts.map(([t, d]) => `<li><b>${t}</b> — ${d}</li>`).join('')}</ul>` : '';
    return fn(G.basic, c) + `<div class="gfig"><figure>${(SVG[G.fig] || (() => ''))(c)}<figcaption>${fn(G.cap, c)} (자체 작성 모식도)</figcaption></figure>${img}</div>` + `<div class="deep">${fn(G.deep, c)}</div>` + concepts;
  }
  function secC(c, G) {
    const rows = c.params.map((p) => {
      const g = (G.P || {})[p.k], rng = `게임 범위 ${p.labels ? p.labels.join(' / ') : `${p.min}–${p.max}${p.unit && p.unit !== 'π' ? ' ' + p.unit : p.unit === 'π' ? 'π' : ''}`}`;
      if (!g) return `<tr class="miss" data-k="${p.k}"><td>${p.label}</td><td class="sym">${p.sym}</td><td>${p.unit || '—'}</td><td colspan="5">설명 준비 중</td><td>${rng}</td></tr>`;
      return `<tr data-k="${p.k}"><td>${p.label}</td><td class="sym">${p.sym}</td><td>${p.unit || (p.labels ? '선택' : '무차원')}</td><td>${fn(g.m, c)}</td><td>↑ ${fn(g.up, c)}<br>↓ ${fn(g.dn, c)}</td><td>${fn(g.tr, c)}</td><td>${fn(g.f, c)}</td><td>${fn(g.rg, c) || '—'}</td><td>${rng}</td></tr>`;
    }).join('');
    const tog = c.K.toggles && !c.step ? c.K.toggles(c.l) : [];
    return `<p>지금 화면의 설계 변수 ${c.params.length}개입니다 (게임의 실제 파라미터 정의에서 바로 만든 표).</p><div class="gtbl wide" tabindex="0" role="region" aria-label="설계 변수 표 (가로 스크롤)"><table><tr><th>이름</th><th>기호</th><th>단위</th><th>물리적 의미</th><th>키우면 / 줄이면</th><th>핵심 Trade-off</th><th>관련 식</th><th>전형 범위 · 주의</th><th>게임 범위</th></tr>${rows}</table></div>`
      + (tog.length ? `<p class="note">토글: ${tog.map((t) => `${t.label} (${t.needs} 카드 필요)`).join(' · ')} — 앞 레벨에서 만든 부품 카드의 실제 값을 이 레벨 계산에 씁니다.</p>` : '');
  }
  function secD(c, G) {
    const ix = fn(G.ix, c) || { m: [] }, ps = c.params, k0 = ps.some((p) => p.k === ix.k) ? ix.k : ps[0] && ps[0].k;
    let h = '';
    if (G.ixCustom === 'cwdm') h += `<div class="gix" id="gx-cw"><div class="row"><label for="gx-cwL">팔 길이 차 ΔL</label><input type="range" id="gx-cwL" min="2" max="40" step="0.1" value="10"><output id="gx-cwLo"></output></div><div class="row"><label for="gx-cwN">Lattice 차수 N</label><select id="gx-cwN"><option value="1">1차 (MZI)</option><option value="2">2차</option><option value="3">3차</option></select><label for="gx-cwT">위상 오프셋 φ</label><input type="range" id="gx-cwT" min="-1" max="1" step="0.01" value="0"><output id="gx-cwTo"></output></div><div class="tiles2" id="gx-cwt"></div><div id="gx-cwc"></div><p class="note">ΔL로 FSR(주기), φ로 중심 이동, N으로 통과대역 모양을 바꿔 봅니다. 게임 설계값은 바뀌지 않습니다.</p></div>`;
    if (G.ixCustom === 'mmi') h += `<div class="gix" id="gx-mm"><div class="row"><label for="gx-mmW">MMI 폭 W</label><input type="range" id="gx-mmW" min="1.5" max="16" step="0.05" value="3"><output id="gx-mmWo"></output></div><div class="tiles2" id="gx-mmt"></div><div id="gx-mmc"></div><p class="note">L<sub>π</sub> ∝ W² — 폭을 두 배로 하면 결상 길이는 네 배가 됩니다.</p></div>`;
    if (G.ixCustom === 'spiral') h += `<div class="gix" id="gx-sp"><div class="row"><label for="gx-spW">도파로 폭 W<sub>m</sub></label><input type="range" id="gx-spW" min="${c.pf.mat === 'si' ? 0.4 : 0.8}" max="${c.pf.mat === 'si' ? 3 : 4}" step="0.05" value="${(c.d && c.d.w) || 2}"><output id="gx-spWo"></output></div><div class="tiles2" id="gx-spt"></div><div class="charts" id="gx-spc"></div><p class="note">같은 단면 모델로 굽힘 방사(반경)와 이웃 결합(간격)을 따로 봅니다.</p></div>`;
    if (ps.length) h += `<div class="gix" id="gx-gen"><div class="row"><label for="gx-k">변수</label><select id="gx-k">${ps.map((p) => `<option value="${p.k}" ${p.k === k0 ? 'selected' : ''}>${strip(p.label)} (${strip(p.sym)})</option>`).join('')}</select></div><div class="row"><input type="range" id="gx-v" aria-label="선택한 변수 값"><output id="gx-vo"></output></div><div class="tiles2" id="gx-t"></div><div class="charts" id="gx-c"></div><p class="note">${ix.note || ''} 지금 설계의 다른 값은 그대로 두고 이 변수만 바꿔 같은 물리 엔진으로 계산합니다 (게임 설계값은 바뀌지 않음).</p></div>`;
    return h;
  }
  function secE(c, G) {
    const mapTo = (txt) => { const t = strip(txt); const m = (G.miss || []).find(([re]) => re.test(txt) || re.test(t)); return m ? `<span class="note"> → 관련 변수 <b>${m[1]}</b> · 개념: ${m[2]}</span>` : ''; };
    const li = (x) => `<li class="${x.na ? '' : x.ok ? 'ok' : 'no'}">${x.k}<span class="st">${x.na ? x.v : (x.ok ? '✓ ' : '✗ ') + x.v}</span>${!x.ok && !x.na ? mapTo(x.k) : ''}</li>`;
    let h = '<p>지금 목표와 각 변수를 연결합니다. 정답 수치는 주지 않습니다 — 수치 목표는 <b>힌트</b>, 다음 한 수는 <b>코치</b>의 역할입니다.</p>';
    if (c.step) h += `<h4>Guided ${c.step.idx + 1}단계 목표 · ${c.step.title}</h4><ul class="gmis">${c.step.goals.map(li).join('')}</ul>`;
    else if (c.practice) h += `<h4>${c.practice.title}</h4><p>${c.practice.note}</p><ul class="gmis">${c.practice.goals.map(li).join('')}</ul>`;
    else if (c.ob) {
      const first = c.ob.find((o) => !o.pass);
      h += c.ob.map((o) => `<h4>${'★'.repeat(o.t)} ${o.tag}${o.pass ? ' — 지금 설계로 달성' : ''}</h4><ul class="gmis">${o.items.filter((x) => !x.crit).map(li).join('')}</ul>`).join('');
      if (first) { const bad = first.items.filter((x) => !x.ok && !x.na && !x.crit); h += `<p><b>지금 막힌 곳:</b> ${'★'.repeat(first.t)}의 ${bad.map((x) => strip(x.k)).join(', ') || '수율 (Tape-out 필요)'} — 위의 B·C에서 해당 개념과 변수를 확인하고, 수치 방향이 필요하면 힌트 단계를 올리세요.</p>`; }
      else h += '<p><b>세 별을 모두 달성했습니다.</b> AI 라이벌의 설계와 비교하거나, Deep Dive에서 모델의 한계를 확인해 보세요.</p>';
    }
    return h;
  }
  function secF(c, G) {
    const rows = (G.lim || []).concat([['공정 변동 (Fab Run)', 'asm', '웨이퍼 CD 오프셋 + 두께 bowl + 다이 랜덤 (CD σ≈8 nm, 두께 σ≈Si 3 nm / SiN 5 nm)']]);
    return `<p>게임 수치는 학습용 surrogate입니다. 각 계산이 어떤 근거에서 오는지 구분합니다. 실제 마스크 전에는 내보내기(smq-design/1) → tools/smq2gds로 GDS·솔버 입력을 만들어 검증합니다.</p>`
      + `<div class="gtbl"><table><tr><th>계산 항목</th><th>근거 분류</th><th>내용</th></tr>${rows.map(([q, k, n]) => `<tr><td>${q}</td><td><span class="badge2 ${CLS[k][1]}">${CLS[k][0]}</span><br><span class="note">${CLS[k][2]}</span></td><td>${n}</td></tr>`).join('')}</table></div>`
      + (c.valid ? '<p>이 레벨의 참조 설계는 오프라인 솔버로 검증되어 있습니다 — 파라미터 패널의 <b>오프라인 솔버 검증</b>에서 게임 예측과 솔버 값을 나란히 볼 수 있습니다.</p>' : '');
  }
  function secG(c, G) {
    const it = (id) => { const r = REF[id]; return r ? `<li>${r.u ? `<a href="${r.u}" target="_blank" rel="noopener noreferrer">${r.t}</a>` : r.t}${r.n ? ` — <span class="note">${r.n}</span>` : ''}</li>` : ''; };
    return `<h4>원리·논문</h4><ul class="grefs">${(G.refs || []).map(it).join('')}${(G.refs || []).includes('chrost') ? '' : it('chrost')}</ul><h4>설계·검증 도구 (외부 Solver로 확장)</h4><ul class="grefs">${TOOLREFS.map(it).join('')}</ul>`
      + '<p class="note">외부 링크 없이도 A–F는 오프라인으로 동작합니다. 이 가이드의 설명과 그림은 위 자료의 원리와 식을 확인한 뒤 자체 한국어 설명과 자체 모식도로 재구성했으며, 외부 그림을 재사용하지 않았습니다.</p>';
  }
  const SECS = [['A', 'Learning Objectives · 학습 목표', secA], ['B', 'Physical Principle · 물리 원리', secB], ['C', 'Parameters · 설계 변수', secC], ['D', 'Interactive Example · 직접 해보기', secD], ['E', 'Game Mission · 게임 목표와 연결', secE], ['F', 'Model Limitations · 모델의 한계', secF], ['G', 'References · 더 읽을거리', secG]];

  /* ---------- interactive examples ---------- */
  function miniChart(xs, ys, cur, lab, unit, xlab) {
    const pts = xs.map((x, i) => [x, ys[i]]).filter((p) => Number.isFinite(p[1]));
    if (pts.length < 2) return `<div class="note">${lab}: 계산 범위 밖</div>`;
    const lo = Math.min(...pts.map((p) => p[1])), hi = Math.max(...pts.map((p) => p[1])), pad = (hi - lo) * 0.08 || Math.abs(hi) * 0.05 || 1, y0 = lo - pad, y1 = hi + pad;
    const segs = []; let curS = [];
    xs.forEach((x, i) => { if (Number.isFinite(ys[i])) curS.push([x, ys[i]]); else if (curS.length) { segs.push(curS); curS = []; } }); if (curS.length) segs.push(curS);
    const fmt = (v) => (Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 1 ? v.toFixed(2) : v.toPrecision(2));
    return `<div><div class="note">${lab}${unit ? ` [${unit}]` : ''}</div>${svgChart({ x0: xs[0], x1: xs[xs.length - 1], y0, y1, H: 150, aria: lab, xticks: [xs[0], xs[Math.floor(xs.length / 2)], xs[xs.length - 1]].map((v) => +(+v).toPrecision(3)), yticks: [y0, (y0 + y1) / 2, y1].map((v) => +fmt(v)), xlab, vlines: [{ x: cur, color: 'rgba(231,236,243,.7)' }], series: segs.map((s) => ({ pts: s, color: 'var(--cyan)', width: 2 })) })}</div>`;
  }
  const tilesHTML = (t) => (t || []).map(([l, v]) => `<div><div class="l">${l}</div><div class="v">${v}</div></div>`).join('');
  function wireGeneric(c, G) {
    const sel = $('#gx-k'), rng = $('#gx-v'), out = $('#gx-vo'); if (!sel) return;
    const ix = fn(G.ix, c) || { m: [] };
    let sweep = null, tmr = null;
    const P = () => c.params.find((p) => p.k === sel.value);
    const fmtV = (p, v) => (p.labels ? `${v | 0} · ${p.labels[v | 0]}` : `${(+v).toFixed(p.dec)}${p.unit ? (p.unit === 'π' ? 'π' : ' ' + p.unit) : ''}`);
    const evalAt = (v, full) => { const p = P(), d = { ...c.d, [p.k]: v }; try { return c.ev(d, full); } catch (e) { return null; } };
    const draw = () => {
      const p = P(), v = +rng.value; out.textContent = fmtV(p, v);
      const r = evalAt(v, true); let t = null; try { t = r ? c.tiles(r) : null; } catch (e) { t = null; } $('#gx-t').innerHTML = t ? tilesHTML(t) : '<div class="note">이 값에서는 계산할 수 없습니다.</div>';
      if (sweep && sweep.k === p.k) $('#gx-c').innerHTML = ix.m.map(([lab, f, unit], i) => miniChart(sweep.xs, sweep.ys[i], v, lab, unit, strip(p.sym))).join('');
    };
    const resweep = () => {
      const p = P(); if (!ix.m.length) { sweep = null; $('#gx-c').innerHTML = ''; return; }
      const n = p.labels ? p.max - p.min + 1 : 25, xs = [], ys = ix.m.map(() => []);
      for (let i = 0; i < n; i++) { const v = p.labels ? p.min + i : snapP(p, p.min + (p.max - p.min) * i / (n - 1)); xs.push(v); const r = evalAt(v); ix.m.forEach(([, f], j) => { let y = NaN; try { y = r ? f(r) : NaN; } catch (e) { y = NaN; } ys[j].push(Number.isFinite(y) ? y : NaN); }); }
      sweep = { k: p.k, xs, ys }; draw();
    };
    const setup = () => { const p = P(); rng.min = p.min; rng.max = p.max; rng.step = p.step; rng.value = c.d[p.k] != null ? c.d[p.k] : p.min; $('#gx-c').innerHTML = '<div class="note">계산 중…</div>'; draw(); clearTimeout(tmr); tmr = setTimeout(resweep, 30); };
    sel.addEventListener('change', setup); rng.addEventListener('input', draw); setup();
  }
  function wireCwdm(c) {
    const K = c.K, X = K._x; if (!X || !X.filt1) return; K.params(c.l);
    const pf = c.pf, wa = (c.d && c.d.wa) || pf.w0, A = X.axis(), lc = pf.lc;
    const L = $('#gx-cwL'), N = $('#gx-cwN'), Tt = $('#gx-cwT');
    const ng = X.ngLam(wa, lc); L.value = (lc * lc / (ng * 0.04)).toFixed(1);
    const draw = () => {
      const dL = +L.value, n = +N.value, t0 = +Tt.value, fsr = lc * lc / (ng * dL) * 1000; $('#gx-cwLo').textContent = `${dL.toFixed(1)} µm`; $('#gx-cwTo').textContent = `${t0.toFixed(2)}π`;
      const bar = [], cr = []; for (let lam = A.x0 / 1000; lam <= A.x1 / 1000 + 1e-9; lam += 0.0005) { const p = X.filt1(n, dL, t0, lam, wa); bar.push([lam * 1000, dB10(p[0])]); cr.push([lam * 1000, dB10(p[1])]); }
      $('#gx-cwt').innerHTML = tilesHTML([['FSR = λ²/(n_g ΔL)', `${fsr.toFixed(1)}<small>nm</small>`], ['n_g (지연 암)', ng.toFixed(3)], ['커플러 수', `${n + 1}`], ['가장자리 누설 한계', `${X.LEAK[n]}<small>dB</small>`]]);
      $('#gx-cwc').innerHTML = svgChart({ x0: A.x0, x1: A.x1, y0: -35, y1: 0, H: 190, aria: 'MZI/lattice 응답', xticks: A.xt, yticks: [0, -10, -20, -30], ylab: 'dB', xlab: 'λ nm', bands: pf.ch.map((ch) => [(ch - 0.0065) * 1000, (ch + 0.0065) * 1000]), series: [{ pts: bar, color: 'var(--amber)', width: 2 }, { pts: cr, color: 'var(--rose)', width: 1.5 }] });
    };
    [L, N, Tt].forEach((e) => e.addEventListener('input', draw)); N.addEventListener('change', draw); draw();
  }
  function wireMmi(c) {
    const W = $('#gx-mmW'); if (!W || typeof PQ === 'undefined') return;
    const lc = c.l.lc || c.pf.lam, n1 = PQ.slabNeff(lc, PQ.PF.t), n0 = PQ.nOx(lc), r = c.pf.mat === 'si' ? [1.5, 6] : [3, 16];
    W.min = r[0]; W.max = r[1]; W.value = (c.d && c.d.W) || (r[0] + r[1]) / 3;
    const Lpi = (w) => { const We = w + (lc / Math.PI) / Math.sqrt(n1 * n1 - n0 * n0); return 4 * n1 * We * We / (3 * lc); };
    const draw = () => {
      const w = +W.value, lp = Lpi(w); $('#gx-mmWo').textContent = `${w.toFixed(2)} µm`;
      $('#gx-mmt').innerHTML = tilesHTML([['L_π = 4n_rW_e²/(3λ)', `${lp.toFixed(1)}<small>µm</small>`], ['1×2 대칭 3L_π/8', `${(3 * lp / 8).toFixed(1)}<small>µm</small>`], ['2×2 일반 3L_π/2', `${(1.5 * lp).toFixed(1)}<small>µm</small>`], ['2×2 paired L_π/2', `${(lp / 2).toFixed(1)}<small>µm</small>`]]);
      const xs = [], ys = []; for (let i = 0; i <= 30; i++) { const v = r[0] + (r[1] - r[0]) * i / 30; xs.push(+v.toFixed(3)); ys.push(Lpi(v)); }
      $('#gx-mmc').innerHTML = miniChart(xs, ys, w, 'L_π (슬랩 n_r ' + n1.toFixed(3) + ')', 'µm', 'W µm');
    };
    W.addEventListener('input', draw); draw();
  }
  function wireSpiral(c) {
    const Wm = $('#gx-spW'), X = c.K._x; if (!Wm || !X || !X.xs) return;
    const si = c.pf.mat === 'si';
    const draw = () => {
      const w = +Wm.value, x = X.xs(c.pf, w); $('#gx-spWo').textContent = `${w.toFixed(2)} µm`;
      $('#gx-spt').innerHTML = tilesHTML([['전파 손실 α', `${x.alpha.toFixed(3)}<small>dB/cm</small>`], ['n_g', x.ng.toFixed(3)], ['∂n_eff/∂w', `${x.dndw.toFixed(3)}<small>/µm</small>`], ['멀티모드', x.multi ? '예 (TE1 guided)' : '아니오']]);
      const Rs = [], bl = [], gs = [], lc = []; for (let i = 0; i <= 60; i++) { const lr = Math.log10(si ? 1 : 10) + (Math.log10(si ? 100 : 1000) - Math.log10(si ? 1 : 10)) * i / 60; Rs.push(lr); bl.push(Math.log10(Math.max(X.bendDBcm(x, Math.pow(10, lr)), 1e-4))); }
      for (let i = 0; i <= 30; i++) { const g = (si ? 0.2 : 0.5) + (si ? 3.8 : 9.5) * i / 30; gs.push(+g.toFixed(2)); lc.push(Math.log10(Math.PI / (2 * X.kappa(x, w, g)) / 1e4)); }
      const cur = c.d && (c.d.rc || c.d.rin);
      const lt = si ? [0, 1, 2] : [1, 2, 3], bend = `<div><div class="note">굽힘 방사 손실 vs 반경 (log–log, 0.0001 dB/cm 아래는 0으로 표시)</div>${svgChart({ x0: Rs[0], x1: Rs[Rs.length - 1], y0: -4, y1: Math.max(1, Math.ceil(Math.max(...bl))), H: 150, aria: '굽힘 손실 대 반경', xticks: lt, xfmt: (v) => String(Math.round(Math.pow(10, v))), yticks: [-4, -2, 0], xlab: 'R µm', ylab: 'log dB/cm', vlines: cur ? [{ x: Math.log10(cur), color: 'rgba(231,236,243,.7)' }] : [], series: [{ pts: Rs.map((v, i) => [v, bl[i]]), color: 'var(--cyan)', width: 2 }] })}</div>`;
      $('#gx-spc').innerHTML = bend + miniChart(gs, lc, (c.d && c.d.gap) || gs[10], 'log₁₀ 결합 길이 L_c (cm) vs 간격', '', 'gap µm');
    };
    Wm.addEventListener('input', draw); draw();
  }

  /* ---------- open / close ---------- */
  function render() {
    const c = ctx, G = GK[c.kindId] || { P: {} }, l = c.l;
    $('#guide-title').textContent = `${c.id} · ${c.lvl.name}`;
    $('#guide-sub').innerHTML = `${c.lvl.dev} · ${l.bandLabel} · ${c.pf.short}<br><span class="note">Learning Guide = 원리와 변수 · Coach = 지금 설계의 다음 한 수 · Hint = 목표 수치와 방향 · Physics Engine = 평가</span>`;
    box.dataset.depth = depth; [...$('#guide-depth').querySelectorAll('button')].forEach((b) => b.setAttribute('aria-checked', String(b.dataset.depth === depth)));
    $('#guide-toc').innerHTML = SECS.map(([id, title]) => `<a href="#g-${id}" data-sec="${id}">${id} · ${title.split(' · ')[1] || title}</a>`).join('');
    body.innerHTML = SECS.map(([id, title, f], i) => { let h = ''; try { h = f(c, G); } catch (e) { h = `<p class="note">이 절을 만들 수 없습니다: ${e.message}</p>`; } return sec(id, id, title, h); }).join('');
    try { wireGeneric(c, G); } catch (e) { /* example unavailable for this state */ }
    try { if (G.ixCustom === 'cwdm') wireCwdm(c); if (G.ixCustom === 'mmi') wireMmi(c); if (G.ixCustom === 'spiral') wireSpiral(c); } catch (e) { /* custom example unavailable */ }
    body.scrollTop = 0;
  }
  function open() {
    ctx = window.GAME_CTX ? window.GAME_CTX() : null; if (!ctx) return;
    lastFocus = document.activeElement; render();
    dlg.hidden = false; document.body.style.overflow = 'hidden';
    ['#gamewrap', '.top', 'footer'].forEach((s) => { const e = $(s); if (e) { e.setAttribute('aria-hidden', 'true'); e.inert = true; } });
    $('#guide-close').focus();
  }
  function close() {
    if (dlg.hidden) return;
    dlg.hidden = true; document.body.style.overflow = '';
    ['#gamewrap', '.top', 'footer'].forEach((s) => { const e = $(s); if (e) { e.removeAttribute('aria-hidden'); e.inert = false; } });
    body.innerHTML = '';   // drop the example widgets; nothing in the game changed while the guide was open
    const f = lastFocus && lastFocus !== document.body && document.contains(lastFocus) ? lastFocus : $('#btn-guide'); if (f && f.focus) f.focus();
  }
  $('#btn-guide').addEventListener('click', open);
  $('#guide-close').addEventListener('click', close);
  dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); });
  dlg.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'Tab') return;
    const f = [...box.querySelectorAll('a[href], button:not([disabled]), input, select, [tabindex]:not([tabindex="-1"])')].filter((x) => !x.hidden && x.offsetParent !== null || x === document.activeElement);
    if (!f.length) return; const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  $('#guide-depth').addEventListener('click', (e) => { const b = e.target.closest('[data-depth]'); if (!b) return; depth = b.dataset.depth; SMQ_STORE.set('smq-guide-depth', depth); box.dataset.depth = depth; [...$('#guide-depth').querySelectorAll('button')].forEach((x) => x.setAttribute('aria-checked', String(x.dataset.depth === depth))); });
  $('#guide-toc').addEventListener('click', (e) => { const a = e.target.closest('[data-sec]'); if (!a) return; e.preventDefault(); const h = $(`#g-${a.dataset.sec}-h`); if (h) { h.scrollIntoView({ block: 'start', behavior: 'smooth' }); h.focus({ preventScroll: true }); } });
  $('#guide-pop').addEventListener('click', () => {   // static copy in a separate window (offline: everything inline, examples omitted)
    const css = [...document.querySelectorAll('style')].map((s) => s.textContent).join('\n'), cl = body.cloneNode(true);
    cl.querySelectorAll('.gix').forEach((g) => { g.outerHTML = '<p class="note">조작 예제는 게임 안의 학습 창에서만 동작합니다.</p>'; });
    const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${$('#guide-title').textContent} · Learning Guide</title><style>${css} body{padding:16px} .gdlg{height:auto;margin:0 auto}</style></head><body><div class="gdlg" data-depth="${depth}"><div class="gdlg-h"><div><div class="eyebrow">Learning Guide · 원리 배우기</div><h2>${$('#guide-title').textContent}</h2><p class="gsub">${$('#guide-sub').innerHTML}</p></div></div><div class="gdlg-body">${cl.innerHTML}</div></div></body></html>`;
    let w = null; try { w = window.open(URL.createObjectURL(new Blob([html], { type: 'text/html' })), '_blank', 'noopener'); } catch (e) { w = null; }
    if (!w) { const n = $('#guide-sub'); n.innerHTML += '<br><span style="color:var(--rose)">이 화면에서는 새 창을 열 수 없습니다 — 학습 창을 그대로 쓰세요.</span>'; }
  });
  // same dialog, same A–G section layout for content that is not a campaign level (PIC Design Lab missions)
  function openCustom(spec) {
    lastFocus = document.activeElement;
    $('#guide-title').textContent = spec.title; $('#guide-sub').innerHTML = spec.sub || '';
    box.dataset.depth = depth; [...$('#guide-depth').querySelectorAll('button')].forEach((b) => b.setAttribute('aria-checked', String(b.dataset.depth === depth)));
    $('#guide-toc').innerHTML = spec.secs.map(([id, title]) => `<a href="#g-${id}" data-sec="${id}">${id} · ${title.split(' · ')[1] || title}</a>`).join('');
    body.innerHTML = spec.secs.map(([id, title, html]) => sec(id, id, title, html)).join(''); body.scrollTop = 0;
    dlg.hidden = false; document.body.style.overflow = 'hidden';
    ['#gamewrap', '.top', 'footer'].forEach((q) => { const e = $(q); if (e) { e.setAttribute('aria-hidden', 'true'); e.inert = true; } });
    $('#guide-close').focus();
  }
  const fmtLim = (rows) => `<div class="gtbl"><table><tr><th>계산 항목</th><th>근거 분류</th><th>내용</th></tr>${rows.map(([q, k, n]) => `<tr><td>${q}</td><td><span class="badge2 ${CLS[k][1]}">${CLS[k][0]}</span><br><span class="note">${CLS[k][2]}</span></td><td>${n}</td></tr>`).join('')}</table></div>`;
  const fmtRefs = (ids) => `<ul class="grefs">${ids.map((id) => { const r = REF[id]; return r ? `<li>${r.u ? `<a href="${r.u}" target="_blank" rel="noopener noreferrer">${r.t}</a>` : r.t}${r.n ? ` — <span class="note">${r.n}</span>` : ''}</li>` : ''; }).join('')}</ul>`;
  window.GAME_GUIDE = { open, close, openCustom, fmt: { lim: fmtLim, refs: fmtRefs }, content: GK, levels: GL, refs: REF, classes: CLS };
})();
