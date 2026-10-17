# SPEC-to-MASK v1.3.0 Curriculum Blueprint

Baseline: `289523340dedb04866a07151614c521654c16bc3` (PR #22 merged). Main CI 39026996889 SUCCESS. Target milestone: **v1.3.0-alpha.1**, Chapter 0 + 1 only. No main merge before user play approval.

## Journey

Tutorial (3) → Build a 200G MZM Link (8) → Learn the Microring (5) → Build a 200G MRM Link (6) → Architecture Decision (1). Chapter 2–4 are labelled **PREVIEW / NOT IMPLEMENTED** in this milestone.

Understand → Tune → Observe → Verify → Complete → Next. Tutorials remain short and use actual models. Common concepts are optional; engineering practice and current evidence are mandatory. 112 GBd PAM4 = 224 Gb/s raw, never net 200G certification.

## Preservation and scope

Keep all 21 stable level IDs, six Lab missions, four platforms, all physics coefficients, thresholds and model versions. Advanced / Legacy is an explicit separate workspace. Historical stars, cards and PASS never become curriculum evidence. Main sequence has a Chapter-local sandbox; no silent copy from Legacy. No new physics solver.

## Per-step implementation contract

All Chapter 0–1 steps below are required. Chapter 2–4 rows specify later gates, not working features. Every row includes objective, mapping, prerequisite, parameter, observable, gate, source, limitation and carried state.

### 0-1 · Optical Communication Overview

- Learning objective: 광원 출력과 링크 예산 변화를 이해하고 설계 근거로 설명한다.
- Mapping: 2-5 / Laser → MZM → Fiber → PD
- Prerequisite: 없음
- Required / optional: Step은 필수; contextual Common Knowledge는 선택.
- Parameters: Laser P
- Observe: 광원 출력과 링크 예산 변화
- Completion: 부품 역할 확인 + P를 실제 변경
- Evidence: 2-5 evaluate / 사용자 확인
- Limitation: 교육용 역할 설명; 완전 Tx/Rx transient 아님
- Continuity: Tutorial sandbox만 저장

### 0-2 · Understanding 200G

- Learning objective: NRZ/PAM4 raw line rate; Dynamic Eye를 이해하고 설계 근거로 설명한다.
- Mapping: MZM_BENCH / 2-3
- Prerequisite: 0-1
- Required / optional: Step은 필수; contextual Common Knowledge는 선택.
- Parameters: modulation, baud
- Observe: NRZ/PAM4 raw line rate; Dynamic Eye
- Completion: 112 GBd PAM4 선택 + raw=224 확인
- Evidence: mzm-eye/1
- Limitation: Net 200G / IEEE compliance 미검증
- Continuity: Tutorial bench sandbox

### 0-3 · Learn the Controls

- Learning objective: 현재 입력과 계산 identity를 이해하고 설계 근거로 설명한다.
- Mapping: 2-3 / Studio adapter
- Prerequisite: 0-2
- Required / optional: Step은 필수; contextual Common Knowledge는 선택.
- Parameters: L / driver
- Observe: 현재 입력과 계산 identity
- Completion: 실제 Tune + 현재 결과 Verify + 개념 확인
- Evidence: 현재 입력의 MZM_BENCH
- Limitation: Canvas legacy Eye와 Bench Eye는 별개
- Continuity: Tutorial 완료; Chapter 1은 독립 설계

### 1-1 · Understand the 200G Target

- Learning objective: raw rate, EO BW, IL, Eye를 이해하고 설계 근거로 설명한다.
- Mapping: 2-3 / MZM_BENCH
- Prerequisite: Tutorial 완료
- Required / optional: Step은 필수; contextual Common Knowledge는 선택.
- Parameters: baud, modulation
- Observe: raw rate, EO BW, IL, Eye
- Completion: 112 GBd PAM4 설정 + 목표/한계 확인 + 계산
- Evidence: mzm-bench/2; mzm-eye/1
- Limitation: 224 Gb/s raw; net/FEC 인증 아님
- Continuity: 고정 목표와 bench conditions

### 1-2 · Design a PN Phase Shifter

- Learning objective: Cp, Rp, VpiL, loss, fRC를 이해하고 설계 근거로 설명한다.
- Mapping: 2-2 / KINDS.pn
- Prerequisite: 1-1
- Required / optional: Step은 필수; contextual Common Knowledge는 선택.
- Parameters: na, nd, xj, vb, dc
- Observe: Cp, Rp, VpiL, loss, fRC
- Completion: 실제 PN 변경 + 유효 모델 평가; 기존 PN t1 목표
- Evidence: KINDS.pn.evaluate / objectives
- Limitation: Si depletion surrogate; SiN은 hybrid Si 가정
- Continuity: 현재 PN geometry; vb를 Bench reverseBias로 동기화

### 1-3 · Build a TW-MZM

- Learning objective: live PN loaded CPW, Vpi, IL를 이해하고 설계 근거로 설명한다.
- Mapping: 2-3 / KINDS.mzm + MZM_BENCH
- Prerequisite: 1-2
- Required / optional: Step은 필수; contextual Common Knowledge는 선택.
- Parameters: L, gap, eta, RT
- Observe: live PN loaded CPW, Vpi, IL
- Completion: 실제 파라미터 조작 + 현재 live PN RF/EO 계산
- Evidence: mzm-bench/2 samples
- Limitation: 전체 EM 검증 아님; Canvas score와 분리
- Continuity: PN + MZM + bench settings

### 1-4 · Optimize RF / EO

- Learning objective: S21, S11, Zc, Smith, EO bandwidth를 이해하고 설계 근거로 설명한다.
- Mapping: MZM_BENCH
- Prerequisite: 1-3
- Required / optional: Step은 필수; contextual Common Knowledge는 선택.
- Parameters: gap, eta, RT, source, ng, probe
- Observe: S21, S11, Zc, Smith, EO bandwidth
- Completion: 조작 전/후 현재 모델 비교 + RF/EO 결과 설명
- Evidence: 동일 PN/MZM, 120 frequency samples
- Limitation: 수치 최적해/규격 BW threshold를 임의로 만들지 않음; 유효 계산 학습 목표
- Continuity: 현재 조건 RF/EO evidence

### 1-5 · Open the PAM4 Eye

- Learning objective: raw vertical gap, bias domain, ISI를 이해하고 설계 근거로 설명한다.
- Mapping: mzm-eye/1
- Prerequisite: 1-4
- Required / optional: Step은 필수; contextual Common Knowledge는 선택.
- Parameters: driver, vpp, bias, baud, modulation
- Observe: raw vertical gap, bias domain, ISI
- Completion: 112 GBd PAM4, live PN, 유효 bias, monotonic, positive raw gap
- Evidence: MZM_BENCH.analyse.eye
- Limitation: No noise/FFE/CDR/BER/FEC; positive gap은 model-only
- Continuity: current eye + same-design identity

### 1-6 · Close the Optical Link

- Learning objective: current raw OMA loss budget / Rx sensitivity assumption를 이해하고 설계 근거로 설명한다.
- Mapping: KINDS.els + bench Eye + KINDS.pd
- Prerequisite: 1-5
- Required / optional: Step은 필수; contextual Common Knowledge는 선택.
- Parameters: Laser P, iso, th; coupling/fiber assumptions
- Observe: current raw OMA loss budget / Rx sensitivity assumption
- Completion: 현재 raw gap→OMA budget; margin >= 0 dB; 가정 확인
- Evidence: 2-5 evaluate with explicit parts; current bench gap; 2-4 reference sensitivity
- Limitation: PD 감도는 독립 legacy receiver 가정; coupled end-to-end BER 아님
- Continuity: Laser, explicit budget assumptions, current model-only margin

### 1-7 · Improve the Design

- Learning objective: 개선 전/후 비교 + same-seed legacy MZM Fab sensitivity를 이해하고 설계 근거로 설명한다.
- Mapping: 기존 PN/MZM + KINDS.mzm Fab perturbations
- Prerequisite: 1-6
- Required / optional: Step은 필수; contextual Common Knowledge는 선택.
- Parameters: L/gap/driver/vpp 또는 Laser P
- Observe: 개선 전/후 비교 + same-seed legacy MZM Fab sensitivity
- Completion: 실제 revision + 설명 + 기존 Fab model 민감도 계산; 1-5/1-6 목표 유지
- Evidence: KINDS.mzm.evaluate(proc) / fabPass; current bench/budget
- Limitation: Legacy Fab는 fixed PN reference 조건; live-PN Eye yield로 표시 금지
- Continuity: revision snapshot + current RF/EO/Eye/budget evidence

### 1-8 · Final MZM 200G Review

- Learning objective: Target, PN, MZM, RF/EO, Eye, budget, trade-off, confidence를 이해하고 설계 근거로 설명한다.
- Mapping: Chapter summary + JSON export
- Prerequisite: 1-1…1-7
- Required / optional: Step은 필수; contextual Common Knowledge는 선택.
- Parameters: 설계 변경 없음; review explanation
- Observe: Target, PN, MZM, RF/EO, Eye, budget, trade-off, confidence
- Completion: 필수 evidence 모두 current + model eye/budget 목표 + review 확인
- Evidence: 동일 Chapter design identity/revision에 연결된 실제 결과
- Limitation: External / BER / FEC / IEEE: NOT VERIFIED
- Continuity: My MZM 200G Design export

### 2-1 · Resonance & FSR

- Learning objective: FSR/resonance를 이해하고 설계 근거로 설명한다.
- Mapping: 2-3R Guided resonance
- Prerequisite: Chapter 1
- Required / optional: Step은 필수; contextual Common Knowledge는 선택.
- Parameters: R
- Observe: FSR/resonance
- Completion: 후속 구현: 공진 조건 이해+현재 결과
- Evidence: KINDS.mrr
- Limitation: PREVIEW ONLY alpha.1
- Continuity: 별도 MRM Chapter state

### 2-2 · Coupling & Quality Factor

- Learning objective: QL, extinction를 이해하고 설계 근거로 설명한다.
- Mapping: 2-3R Guided coupling
- Prerequisite: 2-1
- Required / optional: Step은 필수; contextual Common Knowledge는 선택.
- Parameters: g
- Observe: QL, extinction
- Completion: 후속 구현: coupling/Q tradeoff
- Evidence: KINDS.mrr
- Limitation: MRR resonator, MRM modulator 구분
- Continuity: ring geometry

### 2-3 · Electro-Optic Modulation

- Learning objective: resonance shift를 이해하고 설계 근거로 설명한다.
- Mapping: 2-3R Guided EO
- Prerequisite: 2-2
- Required / optional: Step은 필수; contextual Common Knowledge는 선택.
- Parameters: bias, detuning
- Observe: resonance shift
- Completion: 후속 구현: EO modulation 계산
- Evidence: KINDS.mrr
- Limitation: PN 공통 개념 반복 필수 아님
- Continuity: MRM operating point

### 2-4 · Photon Lifetime & Bandwidth

- Learning objective: photon lifetime, RC, BW를 이해하고 설계 근거로 설명한다.
- Mapping: 2-3R Guided bandwidth
- Prerequisite: 2-3
- Required / optional: Step은 필수; contextual Common Knowledge는 선택.
- Parameters: Q/detuning
- Observe: photon lifetime, RC, BW
- Completion: 후속 구현: 현재 bandwidth 제약
- Evidence: KINDS.mrr
- Limitation: MZM bench와 모델 평가법 차이
- Continuity: MRM bandwidth evidence

### 2-5 · Thermal Tuning & Stability

- Learning objective: resonance drift를 이해하고 설계 근거로 설명한다.
- Mapping: 2-3R thermal / 2-1 heater
- Prerequisite: 2-4
- Required / optional: Step은 필수; contextual Common Knowledge는 선택.
- Parameters: heater, temperature
- Observe: resonance drift
- Completion: 후속 구현: thermal stability
- Evidence: KINDS.mrr / to
- Limitation: PREVIEW ONLY
- Continuity: thermal state

### 3-1 · Same 200G Target

- Learning objective: 112 GBd PAM4를 이해하고 설계 근거로 설명한다.
- Mapping: 2-3R / same platform
- Prerequisite: Chapter 2
- Required / optional: Step은 필수; contextual Common Knowledge는 선택.
- Parameters: 목표 확인
- Observe: 112 GBd PAM4
- Completion: 후속 구현: same assumptions 확인
- Evidence: MRM target
- Limitation: PREVIEW ONLY
- Continuity: new MRM identity

### 3-2 · Design the Ring Modulator

- Learning objective: MRM performance를 이해하고 설계 근거로 설명한다.
- Mapping: 2-3R
- Prerequisite: 3-1
- Required / optional: Step은 필수; contextual Common Knowledge는 선택.
- Parameters: R,g,bias,detuning
- Observe: MRM performance
- Completion: 후속 구현: current model gate
- Evidence: KINDS.mrr
- Limitation: Bench outputs와 등가 검증 금지
- Continuity: MRM geometry

### 3-3 · Achieve PAM4 Modulation

- Learning objective: MRM Eye를 이해하고 설계 근거로 설명한다.
- Mapping: 2-3R dynamic model
- Prerequisite: 3-2
- Required / optional: Step은 필수; contextual Common Knowledge는 선택.
- Parameters: drive
- Observe: MRM Eye
- Completion: 후속 구현: 기존 MRM 지원 범위 명시
- Evidence: KINDS.mrr
- Limitation: 기존 FFE receiver와 raw bench gap 비교 주의
- Continuity: MRM Eye evidence

### 3-4 · Manage Thermal Stability

- Learning objective: drift/lock를 이해하고 설계 근거로 설명한다.
- Mapping: 2-3R / 2-1
- Prerequisite: 3-3
- Required / optional: Step은 필수; contextual Common Knowledge는 선택.
- Parameters: heater, tuning
- Observe: drift/lock
- Completion: 후속 구현: thermal objective
- Evidence: KINDS.mrr
- Limitation: MRM unique learning
- Continuity: thermal evidence

### 3-5 · Close the Optical Link

- Learning objective: budget를 이해하고 설계 근거로 설명한다.
- Mapping: 2-5 / explicit adapter
- Prerequisite: 3-4
- Required / optional: Step은 필수; contextual Common Knowledge는 선택.
- Parameters: Laser/loss
- Observe: budget
- Completion: 후속 구현: common assumptions
- Evidence: KINDS.els
- Limitation: MRM vs MZM metric compatibility 명시
- Continuity: MRM budget

### 3-6 · Final MRM 200G Review

- Learning objective: MRM summary를 이해하고 설계 근거로 설명한다.
- Mapping: new summary
- Prerequisite: 3-1…3-5
- Required / optional: Step은 필수; contextual Common Knowledge는 선택.
- Parameters: review
- Observe: MRM summary
- Completion: 후속 구현: same identity evidence
- Evidence: Chapter 3 evidence
- Limitation: PREVIEW ONLY
- Continuity: My MRM 200G Design

### 4-1 · Architecture Decision

- Learning objective: BW/loss/modulation/area/thermal/drive/heater/fab/complexity를 이해하고 설계 근거로 설명한다.
- Mapping: Chapter 1 + Chapter 3 reports
- Prerequisite: Chapter 3
- Required / optional: Step은 필수; contextual Common Knowledge는 선택.
- Parameters: choice + rationale
- Observe: BW/loss/modulation/area/thermal/drive/heater/fab/complexity
- Completion: 후속 구현: evidence-based rationale; 정답 강제 없음
- Evidence: 양 Chapter reports + compatibility labels
- Limitation: 동일 조건 비교 불가능 항목은 분리; 미계산 power 추정 금지
- Continuity: decision rationale

