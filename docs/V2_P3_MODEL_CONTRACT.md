# P3.0 — Physics Model Contract

Contract ID: `p3-lane-contract/1` · Audited Source: `c98998c7d7586716a34cd8386180b6b76580a2c3` · 2026-10-20 KST.

**이 문서는 제안 Interface와 구현 전 Acceptance Contract입니다. 아래 Lane Type / Function은 Source에 아직 없습니다.** Existing Entry Point와 Proposed Adapter를 구분합니다. P3.1–P3.4 개발은 각각 별도 사용자 승인이 필요합니다.

## 1. Existing Entry Points / Units

| Existing API / Field | Input / Output Unit | 실제 의미 / 제약 |
|---|---|---|
| `pn._x.analyse(l,d)` | `l.pf.lam`: µm; na/nd: log10(cm⁻³); xj/dc: µm; vb: V | VpiL: V·cm, loss: dB/mm, Cp: pF/mm, Rp: Ω·mm, fRC: GHz, Wd: µm입니다. VpiL은 vb→vb+1 V Secant입니다. |
| `pn._x.optical(l,d,V)` | dn: dimensionless; alpha: dB/mm | alpha는 Carrier Loss이며 `analyse.loss`와 같은 Loss가 아닙니다. Sidewall 0.15 dB/mm를 중복 가산하지 않습니다. |
| `MZM_BENCH.pnAt(l,geometry,vb)` | 위 PN Unit과 동일합니다. | ±0.01 V Finite Difference, 0/3 V 경계는 One-sided입니다. loss=alpha(vb)+0.15입니다. |
| `mzm._x.build(l,d)` | L: mm; g: µm; eta: ratio; RT: Ω | b.Cp: F/m, b.Rp: Ω·m, b.Lm: m입니다. Bench가 기존 Unit 변환을 담당합니다. |
| `MZM_BENCH.analyse(l,d,cfg,pnContext)` | vpp: Vpp Open Circuit; source/RT: Ω; bias: π rad; reverseBias: V; baud: GBd; driver/probe: GHz | `through`, transfer.main/complement, eye.ideal/traces/opening은 MZM Input Power에 대한 비율입니다. vpi는 V입니다. Geometry / cfg는 호출 시 Clone합니다. |
| `MZM_BENCH` RF Result | Complex `[re,im]`; f: GHz | `s11/s21`은 50 Ω Two-port, `loadedReflection`은 실제 RT 조건입니다. `eoNormalized`는 0.001 GHz 기준 Junction Voltage 응답입니다. |
| `pd._x.analyse(l,d)` | L/w/di: µm; V: V; resp: A/W; Cj/CT: fF; sig: µA | `sens`: µW OMA_outer; `sensDbm`: dBm OMA_outer; Hpd/Ht: dimensionless Complex입니다. λ=lamW / 112 GBd / 5-tap FFE를 기록합니다. |
| `els._x.analyse` | P/Pchip/Pmod/oma/rx/sens: dBm; split/chan/penalty: dB | `oma`는 Tx Output 뒤 OMA, rx는 Rx PD 앞 OMA입니다. Pel/lane은 mW, RATE=200에 따른 pj는 nominal service-rate 분모입니다. |
| `xcvr._x.analyse` | Pmod/oma/rx/sens: dBm; margin: dB; pw: W | LANES=8 / TBPS=1.6의 nominal 분모와 별도 BIT=224e9가 공존합니다. P3의 Raw-rate Energy와 같은 필드로 재사용하지 않습니다. |

기존 API는 `_x` 내부 Interface이므로 Adapter의 의존 지점을 명시하고, 변경 시 Signature와 관련 Regression을 함께 확인합니다. P3.0은 기존 API를 수정하지 않습니다.

## 2. Proposed Lane Input / Result

아래는 문서용 Type 표기입니다. P3.1에서 Field 이름을 확정해 구현할 때 Contract와 Test를 함께 맞춥니다.

```ts
type LaneInput = {
  schema: 'smq-lane/1'; designId: string; revision: number;
  platform: 'si1310' | 'si1550' | 'sin1310' | 'sin1550';
  wavelengthUm: number;                     // Platform λ와 일치합니다.
  tx: { design: MzmDesign; pn: PnContext; bench: BenchConfig; voltage: number };
  source: null | { cwPowerDbm: number };     // P3.1은 null입니다.
  passive: null | {
    txInputLossDb: number; txOutputLossDb: number;
    channelLossDb: number; rxInputLossDb: number;
    provenance: string;                    // 각 Term의 가정 / Source를 추적합니다.
  };                                       // P3.1은 null입니다.
  receiver: null | {
    geometry: PdDesign;
    spectralPolicy: 'legacy-worst-channel' | 'single-wavelength';
  };                                       // P3.1 / P3.2는 null입니다.
};
type Metric = {
  value: number | null; unit: string;
  status: 'MODEL' | 'NOT VERIFIED' | 'UNSUPPORTED' | 'INVALID';
  reason: string | null; plane: string | null; basis: string;
};
type LaneResult = {
  identity: string; inputDigest: string; requestId: number;
  designId: string; revision: number; platform: string; wavelengthUm: number;
  contractVersion: 'p3-lane-contract/1'; modelSignature: string;
  tx: ExistingV2MzmResult | null;
  rate: { modulation: 'NRZ' | 'PAM4'; baudGBd: number;
          rawGbps: number; netGbps: null; fecVerified: false };
  optical: null | PortLedger; receiver: null | ReceiverReference;
  metrics: Record<string, Metric>;
  discovery: 'unobserved' | 'observed' | 'skipped';
  engineering: 'NOT EVALUATED' | 'TARGET NOT MET' | 'MODEL TARGET MET';
  externalVerified: false; limitations: string[];
};
```

`MzmDesign`, `PnContext`, `BenchConfig`는 `SMQ_V2_MZM.snapshot` / `SMQ_V2_SCHEMA.mzmInputs`의 기존 Field Shape를 그대로 의미합니다. `ExistingV2MzmResult`는 `SMQ_V2_MZM.evaluate`의 실제 Result입니다. `PdDesign`은 pd.params의 L/w/di/V입니다. `PortLedger`는 §4 Plane별 Power / OMA와 Term 목록, `ReceiverReference`는 §6의 λ / Baud / Q / FFE / Noise / Sensitivity를 기록하는 Proposed Record입니다.

Proposed API는 `fresh(platform)`, `importP2(snapshot, platform)`, `evaluate(input, requestId)`, `matches(result,input,requestId)`, `edit/restore`로 제한합니다. 구현은 P3.1의 `src/v2/lane.js` 등 Adapter에서 수행할 예정이며 현재 존재하지 않습니다. Tx는 기존 `SMQ_V2_MZM.evaluate`를 호출합니다. PN / CPW / FFT / MZM Transfer 수식을 복제하지 않습니다.

기존 `SMQ_V2_MZM.evaluate`는 단순 Snapshot이 아니라 `mzmWorkspace` 전체 Shape를 검사합니다. Lane Adapter는 `input.tx`를 직접 넘기지 않고 Lane ID / Revision과 Snapshot을 가진 **호출 전용 Workspace**를 구성해야 합니다. Original은 유효한 Snapshot, Comparison은 null, Experiment / Mode / Progress는 기존 Schema의 유효한 구조로 채우되 실제 P2 Progress와 공유하거나 보상으로 저장하지 않습니다. 이 구조는 평가 입력의 형식을 맞추기 위한 것이며 Lane Discovery는 독립 관리합니다. 평가 중 새 ID / Timestamp를 생성하지 않으며 Model Signature / Snapshot / ID / Revision을 Lane Result Identity에도 포함합니다. 같은 입력을 다른 Workspace 형식으로 재구성해도 Tx 수치는 변하지 않아야 합니다.

P3.1 Target은 PAM4 112 GBd입니다. Fresh Lane은 기존 Platform Reference를 복사하고, P2 Import는 입력 Baud까지 그대로 복사합니다. 112 GBd 변경은 명시적인 Target Apply로 Revision을 증가시킵니다. 기존 10–112 GBd / NRZ 관찰 Domain을 보존하되 Target Profile과 구분합니다. 새 Lane 생성 / Import는 P2 원본을 변경하지 않습니다.

Identity는 기존 Canonical Serialization 패턴으로 **모든 계산 Input, Source Provenance, Platform / λ, Model Signature / Contract Version, Design ID / Revision**을 포함합니다. inputDigest는 표시·검색용이며 단독 매칭 근거가 아닙니다. `requestId`와 전체 identity가 일치해야 현재 Result로 채택합니다. Inputs / Results의 깊은 객체를 공유해 원본을 바꾸지 않습니다. Edit / Import / Restore / Platform Switch 때 Live Result / Engineering Status를 즉시 무효화합니다. 늦게 완료된 다른 요청과 과거 PASS를 버립니다.

State는 기존 `smq-v2-learning`에 Optional `lane[platform]`로 추가할 예정입니다. Legacy / P1 / P2 State를 보존하고 Invalid Lane Restore는 기존 Validate / Quarantine 동작을 따릅니다. Model Result나 PASS Token을 저장하지 않으며 Reload 후 재계산합니다. Historical Discovery는 현 Revision의 Engineering Evidence와 분리합니다.

## 3. Rate / Voltage / RF Contract

- Raw Rate는 `baudGBd × log2(M)`입니다. 112 GBd PAM4=224 Gb/s raw, 100 GBd PAM4=200 Gb/s raw입니다. 후자는 현재 Receiver Sensitivity의 112 GBd 조건을 충족하지 않습니다. Net200G / FEC Overhead / Coding Gain은 `null` / NOT VERIFIED입니다. 임의 효율을 곱해 net200G를 만들지 않습니다.
- Source `vpp`는 Thevenin Open-circuit Differential Vpp입니다. DC Electrode Vpp는 근사적으로 `vpp×RT/(source+RT)`이며 주파수별 Junction Voltage는 Bench에서 계산합니다. NRZ/PAM4 Waveform의 Source Peak는 vpp/2입니다. 50 Ω Source + 50 Ω RT에서 2.5 Vpp Source는 1.25 Vpp Electrode / 0.625 V Peak입니다. RT와 관계없이 2.5 V를 Junction Vpp로 표시하지 않습니다.
- Bench `bias`는 Optical Differential Phase / π, `reverseBias`는 양의 Junction Reverse Bias입니다. 같은 Control로 취급하지 않습니다. Equal Series PN의 각 Junction Swing은 ±Vdiff/2이며 실제 Eye Voltage extrema로 0–3 V Domain을 검사합니다. Domain 밖 Eye는 `opening=null` / traces 없음으로 처리합니다.
- RF `s21`과 EO Response는 다릅니다. Electrical S에는 Source Vpp / Optical ng / Actual Termination의 Loaded 결과를 섞지 않습니다. EO dB는 **20log10(|H|)**, Optical Power / OMA Ratio dB는 **10log10(ratio)**입니다.
- EO BW가 관찰 범위 120 GHz 안에서 Crossing이 없으면 `null`과 “>120 GHz / Crossing 미관측”을 표시합니다. 정확한 120 GHz BW로 만들지 않습니다. Eye의 240 GHz Truncation도 명시합니다.

## 4. Optical Plane / OMA / dBm Contract

| Plane ID | Reference Plane | 표시 / 계산 |
|---|---|---|
| A | CW Laser Output | CW Power mW / dBm만 있습니다. 변조 전 OMA는 N/A입니다. |
| B | MZM Optical Input | `Pmod_mW = 10^((cwPowerDbm−txInputLossDb)/10)`입니다. |
| C | MZM Main Output | `Plevel_mW[k] = Pmod_mW × bench.eye.ideal[k]`입니다. through에는 전체 MZM IL이 포함돼 있습니다. |
| D | Tx Output Coupling 뒤 | C의 모든 Optical Power를 `10^(−txOutputLossDb/10)`으로 감쇠합니다. |
| E | Scalar Channel 뒤 | D에서 channelLossDb를 한 번 적용합니다. Fiber Dispersion을 계산하지 않습니다. |
| F | Rx Input Coupling 뒤 / PD Input | E에서 rxInputLossDb를 한 번 적용합니다. Receiver Sensitivity도 이 Plane을 기준으로 표시합니다. |

기본 Single Lane에서 Splitter와 Mux/Demux는 없습니다. Loss가 0인 Through Block은 “추가 손실 없음이라는 가정”이며 실측 0 dB가 아닙니다. P3.2 기본값을 정할 때 Source / 실제 Plane / Unit을 명시하고, Legacy의 `ssc`, Channel lumped 값은 그대로 여러 번 복사하지 않습니다. Term 하나당 Owner는 하나입니다. Passive Input은 유한한 nonnegative dB이며 Active Gain / Negative Loss는 지원하지 않습니다.

Settled OMA_outer는 `max(Plevel_mW) − min(Plevel_mW)`로 정의합니다. Arithmetic mean은 등확률 정착 Symbol Level의 평균일 때만 `PavgSettled_mW`로 표시합니다. Dynamic Average / Dynamic OMA는 원본 Waveform이나 별도 명세 없이는 계산하지 않습니다. Bench의 Ideal Level order가 Non-monotonic이면 Diagnostic Range는 별도 표시할 수 있으나 Data OMA / Gap을 유효 Link 근거로 사용하지 않습니다.

`powerDbm = 10log10(power_mW)`, `omaDbm = 10log10(OMA_mW)`입니다. dBm끼리 더해 Power를 합산하지 않으며 여러 Power는 Linear Unit에서 합산합니다. `omaGainDb = 10log10(OMA_mW/Pmod_mW)`는 Ratio이며 dBm이 아닙니다. `Power_dBm − Loss_dB`는 유효하지만 `Power_dBm − OMA_dBm`을 Optical Loss로 부르지 않습니다.

OMA=0이면 Linear 값 0을 보존하고 dBm은 `null`, “0 mW / logarithm 미정의”로 표시합니다. 임의 floor로 finite Link PASS를 만들지 않습니다. Negative Gap은 닫힌 Eye라는 Signed Diagnostic으로 보존하고 dBm으로 변환하지 않습니다. Negative / NaN / Infinity Power는 INVALID입니다.

Bench `eye.opening`은 Pin에 대한 **최소 인접 Raw Vertical Gap**입니다. `rawGap_mW=Pmod_mW×opening`으로 환산할 수 있지만 OMA_outer나 BER가 아닙니다. main+complement=through는 Bench의 Equal-arm 이상 Model 범위의 보존식이며 실제 MMI의 Conservation 증명이 아닙니다.

P3.2는 기존 Constant-loss / Linear-power MZM 관찰 Model의 Scaling만 합니다. Nonlinear TPA / Self-heating / Reflection / RIN / WPE를 새 수식으로 추가하지 않습니다. 해당 현상의 External Accuracy와 Source 전력별 유효 범위는 NOT VERIFIED입니다. ELS / XCVR 결과는 조건을 보존한 Legacy Reference로만 표시할 수 있습니다.

## 5. OMA Audit 결과 / Double-count 방지

Legacy `mzm.analyse.oma`는 13 dBm Input의 정착 OMA_outer입니다. `card.model.gain = omaDbm−13`으로 ELS/XCVR에 전달합니다. Bench에서는 Absolute Input 없이 동일 Transfer의 Optical Fraction을 반환합니다. 4 Platform Reference / Fixed PN / 기본 Quadrature에서 실제 호출한 비교는 다음과 같습니다.

| Platform | Legacy OMA (mW) | Bench settled OMA × 13 dBm (mW) |
|---|---:|---:|
| si1310 / sin1310 | 2.742821663 | 2.742866396 |
| si1550 / sin1550 | 1.945676079 | 1.945694010 |

차이는 최대 약 4.48e-5 mW이며 Legacy는 0.001 GHz, Bench Eye DC는 DC Divider를 사용합니다. 이 비교는 정의 확인용이며 arbitrary Bias / Overdrive에서 전역 동일하다는 검증이 아닙니다. Live PN Slope와 Legacy Secant도 다르므로 해당 경로의 Bit Parity를 요구하지 않습니다.

Legacy MZM `pen`은 5-tap FFE를 포함한 Tx Eye Ratio에서 계산합니다. PD `sens`에도 별도의 5-tap FFE Ratio와 Noise Enhancement가 들어갑니다. ELS/XCVR은 `rx−pen−sens`를 사용하지만 이것은 **Legacy Surrogate Budget**이며 하나의 Cascaded Receiver FFE가 아닙니다. P3에서 같은 식을 새 End-to-end BER 검증으로 승격하지 않습니다. Tx Raw Gap, Rx-only Sensitivity, Legacy Penalty를 합산해 중복 차감하지 않습니다.

## 6. Receiver Contract / 비교 가능성

`pd.analyse`는 `pf.ch`의 최소 Absorption을 가진 λ를 택합니다. 실제 Reference 결과는 1310 Platform에서 1.331 µm, 1550 Platform에서 1.591 µm이며 Platform 중심 λ와 다릅니다. P3 Single Lane λ와 비교하려면 다음 중 하나를 명시적으로 선택해야 합니다.

1. `legacy-worst-channel`: 기존 pf.ch를 그대로 사용하고 lamW를 표시합니다. λ가 Lane과 다르면 **Wavelength-mismatched Reference / Margin NOT VERIFIED**로 처리합니다.
2. `single-wavelength`: Local Clone `pf.ch=[lane.wavelengthUm]`만 PD에 전달합니다. 기존 PD Absorption / Transit / RC / Noise를 그대로 사용하고 Global Platform / PSPEC / Level / Card는 바꾸지 않습니다. 이것은 P3.3의 ADAPT 대상이며 구현 전 λ별 Source Identity / Legacy Unchanged 검사로 검증합니다. 이번 P3.0에서 실행한 Calibration이나 완료 기능이 아닙니다.

PD의 Sensitivity Equation은 `OMAreq_uW = 6×3.49×sigma_A / (responsivity_AperW × ratio) × 1e6`입니다. sigma_A는 `10e-12×(1+CT_F/30e-15)×sqrt(0.6×112e9)`이며 Ratio는 112 GBd / 128-symbol / 5-tap FFE 결과를 [0.02,1]로 Clamp한 값입니다. Q=3.49와 BER 2.4e-4의 연결은 **기존 Model의 가정**으로만 기록합니다. 실제 BER Calculator / FEC Decoder가 아닙니다. Shot Noise / RIN / Jitter / CDR / Receiver Saturation / measured TIA는 포함되지 않습니다.

P3.3 최소 구현은 위 조건을 명시한 Standalone Receiver Reference입니다. Rate가 112 GBd PAM4가 아니거나 λ / OMA Plane / Model Identity가 맞지 않으면 Reference Margin을 계산하지 않습니다. 정합한 경우 `referenceMarginDb = OMA_F_dBm − sensitivityDbm`은 **이상적인 Incident PAM4를 가정한 Reference Budget**으로만 표시할 수 있습니다. Tx ISI가 반영된 End-to-end Margin / Design Closure는 여전히 `null`입니다. 양의 Reference Margin에 `Link PASS`를 붙이지 않습니다. Rx가 계산되기 전 P3.1 / P3.2에서는 이 Margin 자체가 null입니다.

Cascaded Receiver Quality를 추후 승인할 경우 Optical Intensity Waveform → Responsivity Scaling → Hpd×TIA → 단일 FFE / Noise 경로를 새 명세로 검토해야 합니다. Hpd를 MZM Nonlinearity 앞에 곱하거나 2개의 FFE Gap을 곱하는 단축은 금지합니다. Existing Bench full waveform의 최소 공유 Interface를 먼저 제안하고 FFT / PN / CPW / Transfer를 중복 구현하지 않습니다. 이 작업은 P3.3 기본 승인에 자동 포함되지 않습니다.

## 7. Physics Validation Criteria / Status

아래는 **미래 구현의 Acceptance Criteria**입니다. P3 Test가 이미 존재하거나 통과했다는 뜻은 아닙니다.

| ID | 검증 기준 / 수치 허용오차 | 적용 Checkpoint |
|---|---|---|
| C01 | Same Tx Input / cfg / Platform에서 기존 Bench Result와 같아야 합니다. Pure Scalar / Complex 값은 abs 1e-9 이내, Input Mutation은 0입니다. | P3.1 |
| C02 | Source 50 Ω / RT 50 Ω의 DC Divider와 Peak/Vpp 변환을 확인합니다. EO는 기존 0.001 GHz Bench 값과 abs 1e-9, DC Divider 근사는 기존 Test처럼 0.01 V입니다. | P3.1 |
| C03 | main+complement=through, 0≤P≤through를 abs 1e-9 이내 확인합니다. Non-monotonic / PN Domain 위반은 Gap / Engineering Evidence를 무효화합니다. | P3.1 |
| C04 | 112 PAM4=224 raw, 100 PAM4=200 raw, 112 NRZ=112 raw입니다. net/FEC 값은 null / false입니다. | P3.1 |
| C05 | Edit / Import / Platform / Restore / Late request / Blank input / Reload가 stale Engineering Evidence를 남기지 않습니다. P2 / Legacy / Backup State를 보존합니다. | P3.1 |
| C06 | Linear Power와 dBm 왕복 abs 1e-9, 3 dB=10^(-0.3) Power Scaling입니다. 고정 Linear Model에서 +1 dB Laser는 모든 변조 후 Level / OMA를 +1 dB, +1 dB Passive Loss는 이후만 −1 dB로 바꿉니다. | P3.2 |
| C07 | Plane B/C와 Loss Term Owner가 일치하고 MZM IL이 중복 차감되지 않습니다. Zero / Invalid OMA에서 false finite dBm / PASS가 없습니다. | P3.2 |
| C08 | 기존 PD Hpd/Ht / Sensitivity와 같은 Context의 결과가 abs 1e-9 이내입니다. legacy λ와 single λ를 구분하고 Rate / FFE / Noise Basis 불일치 시 Margin은 null입니다. | P3.3 |
| C09 | Rx Reference와 Tx Raw Eye / Legacy Penalty가 분리됩니다. Unsupported BER / FEC / net / Cascaded Margin이 null입니다. | P3.3 |
| C10 | 4 Platform / P1–P2.2 / Legacy Model Regression, Save / Backup / Restore, Offline, Source/HTML Parity / Hash / CI를 확인하고 사용자 Play와 분리합니다. | 각 관련 Checkpoint / P3.4 |

Discovery 완료와 MODEL TARGET MET, External Verification을 분리합니다. P3.1은 Tx 조작·관찰 완료까지만 허용하고 Lane Closure Target은 NOT EVALUATED입니다. P3.4의 Engineering Closure도 **지원된 Model Target과 검증되지 않은 항목의 명시적 Closeout**이며 실제 Ethernet Link 인증을 의미하지 않습니다.

## 8. Astra Review Questions

이 질문은 아직 검토받지 않았습니다. Sol이 먼저 위 Source 발췌와 해당 수치만 제공하고, Astra는 질문별 결론 / 근거 / 필요한 최소 Test / 미검증 조건만 반환하도록 합니다.

| ID / 우선 시점 | 짧은 Physics Question / 필요한 결정 |
|---|---|
| A1 / P3.3 전 | `pd.js`의 `6×Q×sigma/(R×ratio)`와 `pam4Eye` Noise Enhancement가 어떤 PAM4 / BER / FFE 조건에만 성립합니까? Reference Sensitivity의 명칭과 유효 조건을 확인해 주세요. |
| A2 / Cascaded Quality 승인 전 | MZM Intensity Nonlinearity 뒤 PD×TIA와 단일 FFE를 놓으려면 Bench가 어떤 최소 Waveform / Time Grid / Seed를 공개해야 합니까? Tx·Rx Penalty 중복을 막는 검증 Fixture를 정해 주세요. |
| A3 / P3.2 전 새 Penalty가 필요할 때 | `els/xcvr`의 TPA·Feedback RIN·Channel Lumped Loss 중 이 Single Lane에 물리적으로 이식 가능한 항목은 무엇입니까? 현재 Linear Ledger에 남겨야 할 Unsupported 경계를 확인해 주세요. 새 Penalty가 없으면 이 검토를 강제하지 않습니다. |
| A4 / P3.1 중 계산 불일치 발견 시 | Bench의 Source Vpp / Effective Vdiff / π Phase / PN ±Vdiff/2가 동일한 Push-pull Convention입니까? Legacy Saturated OMA와 임의 Bias의 Settled OMA 차이를 설명해 주세요. 불일치가 없으면 기존 111 Test를 재사용합니다. |

A1이 미해결이면 P3.3은 Device Response / 조건 표시까지만 승인 요청하고 Sensitivity 기반 Target 판정을 보류합니다. A2가 미해결이면 Cascaded Quality는 NOT VERIFIED로 남깁니다. A3/A4를 이유로 전체 Repository나 기존 Solver를 재작성하지 않습니다. MMI Conservation / Symmetry 수정은 별도의 Physics Task이며 이 질문 묶음의 구현 범위에 넣지 않습니다.
