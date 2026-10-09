// ===== Stage 0: platform = wavelength × core material (all physics follows this choice) =====
const PLATFORMS = {
  si1310: { id: 'si1310', mat: 'si', lam: 1.31, t: 0.22, dt: 0.006, w0: 0.36, wc: 0.394, band: 'O-band', short: 'Si · 1310 nm',
    rules: { gap: 0.18, wmin: 0.40, edge: 0.05 }, ch: [1.271, 1.291, 1.311, 1.331], lc: 1.301, bb: [1.26, 1.36] },
  si1550: { id: 'si1550', mat: 'si', lam: 1.55, t: 0.22, dt: 0.006, w0: 0.46, wc: 0.50, band: 'C-band', short: 'Si · 1550 nm',
    rules: { gap: 0.18, wmin: 0.40, edge: 0.05 }, ch: [1.531, 1.551, 1.571, 1.591], lc: 1.561, bb: [1.50, 1.60] },
  sin1310: { id: 'sin1310', mat: 'sin', lam: 1.31, t: 0.40, dt: 0.010, w0: 0.78, wc: 0.844, band: 'O-band', short: 'SiN · 1310 nm',
    rules: { gap: 0.40, wmin: 0.80, edge: 0.10 }, ch: [1.271, 1.291, 1.311, 1.331], lc: 1.301, bb: [1.26, 1.36] },
  sin1550: { id: 'sin1550', mat: 'sin', lam: 1.55, t: 0.40, dt: 0.010, w0: 1.00, wc: 1.098, band: 'C-band', short: 'SiN · 1550 nm',
    rules: { gap: 0.40, wmin: 0.80, edge: 0.10 }, ch: [1.531, 1.551, 1.571, 1.591], lc: 1.561, bb: [1.50, 1.60] }
};
const MATS = {
  si: { name: 'Silicon', full: 'Si · SOI 220 nm', n: '≈ 3.5', dn: '≈ 2.0', pros: ['굴절률 차가 커서 소자가 작음 (벤드 반경 수 µm)', 'PN 변조기·Ge 수광기 등 능동 소자를 같은 칩에 집적', '데이터센터 트랜시버·CPO의 표준 플랫폼'], cons: ['폭·두께 몇 nm에도 특성이 크게 변함 (공정 민감)', '측벽 산란 손실 1–3 dB/cm', '고출력에서 이광자 흡수(TPA)'] },
  sin: { name: 'Silicon Nitride', full: 'SiN · 400 nm', n: '≈ 2.0', dn: '≈ 0.55', pros: ['손실이 매우 낮음 (< 0.5 dB/cm)', '공정 허용오차가 큼, 열에 둔감 (dn/dT ≈ Si의 1/7)', '고출력·넓은 투명 대역 (LiDAR, 비선형, 바이오)'], cons: ['굴절률 차가 작아 소자가 큼 (벤드 수십~100 µm)', '자체 능동 변조·수광 불가 → 이종 집적 필요'] }
};
const BANDS = {
  1.31: { name: 'O-band · 1310 nm', pros: ['표준 단일모드 광섬유의 분산이 거의 0 → 분산 보상 없이 PAM4 직접검출', '데이터센터 트랜시버 표준 대역 (DR/FR/LR, CWDM4), CPO 표준'], cons: ['광섬유 손실이 1550보다 큼 (≈0.35 dB/km)', 'EDFA 같은 광증폭기를 쓰기 어려움'], track: 'Track A · 1.6T 트랜시버 권장' },
  1.55: { name: 'C-band · 1550 nm', pros: ['광섬유 손실 최저 (≈0.2 dB/km), EDFA 증폭 가능', '코히어런트 통신·장거리, FMCW LiDAR (눈 안전 고출력)'], cons: ['광섬유 분산이 커서 고속 직접검출 거리가 짧음', '데이터센터 IM/DD 표준과 맞지 않음'], track: 'Track B · FMCW LiDAR 권장' }
};
