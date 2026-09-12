import type { OracleCase } from './types';

export const wave7BedsideOracles: OracleCase[] = [
  // ---------------------------------------------------------------- CKiD U25
  {
    calcId: 'ckid-u25',
    description:
      'Male age 10, height 90 cm, SCr 1.4, CysC 1.0: κ_cr = 39.0×1.008^(−2) = 38.383; eGFRcr = 38.383×(0.90/1.4) = 24.68 (kidney.epi example). κ_cys = 87.2×1.011^(−5) = 82.56; eGFRcys = 82.56. Average = 53.6',
    inputs: { age: 10, sex: 'M', height: 90, scr: 1.4, cysc: 1.0 },
    expect: { score: 53.6, tolerance: 0.2, riskLevel: 'moderate' },
    source: 'Pierce CB et al. Kidney Int 2021;99:948-956 (PMID 33188714) — CKiD U25; creatinine example matches the published male-10y-90cm-SCr-1.4 case (~24.68) averaged with CysC 1.0.',
  },

  // ---------------------------------------------------------------- BRI
  {
    calcId: 'body-roundness-index',
    description:
      'Height 170 cm, waist 80 cm: WC/(2π)=12.732; 0.5×ht=85; ratio=0.1498; 1−ratio²=0.9776; √=0.9887; BRI=364.2−365.5×0.9887=2.82',
    inputs: { height: 170, waist: 80 },
    expect: { score: 2.82, tolerance: 0.15, riskLevel: 'moderate' },
    source: 'Thomas DM et al. Obesity 2013;21:2264-2271 (PMID 23519954) — BRI formula. Zhang et al. JAMA Netw Open 2024: U-shaped mortality; BRI <3.4 is not a protective band (HR 1.25 vs mid quintile).',
  },

  // ---------------------------------------------------------------- ROX
  {
    calcId: 'rox-index',
    description: 'SpO₂ 98, FiO₂ 0.40, RR 20: ROX = (98/0.40)/20 = 245/20 = 12.25 (12 h ≥4.88 → low intubation risk)',
    inputs: { spo2: 98, fio2: 0.4, rr: 20, timepoint: '12h' },
    expect: { score: 12.25, tolerance: 0.05, riskLevel: 'low' },
    source: 'Roca O et al. J Crit Care 2016;35:200-205 (PMID 27481760) — ROX = (SpO₂/FiO₂)/RR; 12 h ≥4.88 predicts HFNC success.',
  },

  // ---------------------------------------------------------------- HACOR
  {
    calcId: 'hacor',
    description: 'HR 130 (1) + pH 7.28 (3) + GCS 15 (0) + P/F 180 (2) + RR 32 (1) = 7',
    inputs: { hr: 130, ph: 7.28, gcs: 15, pf: 180, rr: 32 },
    expect: { score: 7, riskLevel: 'high' },
    source: 'Duan J et al. Intensive Care Med 2017 (PMID 28497231) — HACOR category points; ≥5 at 1 h predicts NIV failure.',
  },

  // ---------------------------------------------------------------- Duke-ISCVID 2023
  {
    calcId: 'duke-iscvid-2023',
    description: '2 major (microbiology + imaging), 0 minor → Definite IE (2M/0m)',
    inputs: {
      microMajor: true,
      imagingMajor: true,
      surgicalMajor: false,
      pathologic: false,
      predisposition: false,
      fever: false,
      vascular: false,
      immuno: false,
      microMinor: false,
    },
    expect: { score: '2M/0m', riskLevel: 'high', labelMatches: /definite/i },
    source: 'Fowler VG et al. Clin Infect Dis 2023 (PMID 37138445) — definite = 2 major OR 1 major+3 minor OR 5 minor.',
  },
  {
    calcId: 'duke-iscvid-2023',
    description: '1 major + 1 minor (microbiology + fever) → Possible IE (1M/1m)',
    inputs: {
      microMajor: true,
      imagingMajor: false,
      surgicalMajor: false,
      pathologic: false,
      predisposition: false,
      fever: true,
      vascular: false,
      immuno: false,
      microMinor: false,
    },
    expect: { score: '1M/1m', riskLevel: 'moderate', labelMatches: /possible/i },
    source: 'Fowler VG et al. Clin Infect Dis 2023 (PMID 37138445) — possible = 1 major+1 minor OR 3 minor.',
  },

  // ---------------------------------------------------------------- H2FPEF
  {
    calcId: 'h2fpef',
    description: 'BMI 32 (2) + age 70 (1) + AF (3) + PASP 30 (0) + E/e′ 8 (0) + 0 BP meds (0) = 6',
    inputs: { bmi: 32, htnMeds: 0, af: true, pasp: 30, age: 70, ee: 8 },
    expect: { score: 6, riskLevel: 'high' },
    source: 'Reddy YNV et al. Circulation 2018;138:861-870 (PMID 29724363) — H2FPEF weights: BMI>30 = 2, AF = 3, age>60 = 1.',
  },

  // ---------------------------------------------------------------- HFA-PEFF
  {
    calcId: 'hfa-peff',
    description: 'Functional major (2) + morphological major (2) + biomarker minor (1) = 5 → definite HFpEF',
    inputs: { functional: 2, morphological: 2, biomarker: 1 },
    expect: { score: 5, riskLevel: 'high', labelMatches: /definite/i },
    source: 'Pieske B et al. Eur Heart J 2019;40:3297-3317 (PMID 31504452) — HFA-PEFF ≥5 = definite HFpEF; max 2 per domain.',
  },

  // ---------------------------------------------------------------- PECARN CSI
  {
    calcId: 'pecarn-csi',
    description: 'All risk factors absent → 0, low risk, clinically clear',
    inputs: {
      gcsUnresponsive: false,
      abnormalAbc: false,
      focalNeuro: false,
      ams: false,
      neckPain: false,
      midlineTenderness: false,
      substantialHead: false,
      substantialTorso: false,
    },
    expect: { score: 0, riskLevel: 'low' },
    source: 'Leonard JC et al. Lancet Child Adolesc Health 2024;8:482-490 (PMID 38843852) — no predictors, CSI ~0.2%.',
  },
  {
    calcId: 'pecarn-csi',
    description: 'AMS only (intermediate factor) → 1 risk factor, not low risk',
    inputs: {
      gcsUnresponsive: false,
      abnormalAbc: false,
      focalNeuro: false,
      ams: true,
      neckPain: false,
      midlineTenderness: false,
      substantialHead: false,
      substantialTorso: false,
    },
    expect: { score: 1, riskLevel: 'moderate' },
    source: 'Leonard JC et al. Lancet Child Adolesc Health 2024 — isolated AMS (GCS 9–14) is an intermediate (x-ray) factor.',
  },

  // ---------------------------------------------------------------- 2HELPS2B
  {
    calcId: 'helps2b',
    description: 'BIRDs (2) + prior seizure (1) = 3 → ~50% seizure risk',
    inputs: {
      birds: true,
      freqGt2: false,
      epileptiform: false,
      lpdLrdaBipd: false,
      plusFeatures: false,
      priorSeizure: true,
    },
    expect: { score: 3, riskLevel: 'high' },
    source: 'Struck AF et al. JAMA Neurol 2017;74:1419-1424 (PMID 28738117) — BIRDs = 2, prior seizure = 1; score 3 ≈ 50% seizure risk.',
  },

  // ---------------------------------------------------------------- NUTRIC
  {
    calcId: 'nutric',
    description: 'Age 80 (2) + APACHE 30 (3) + SOFA 11 (2) + 3 comorbidities (1) + 2 hospital days (1) + IL-6 0 (0) = 9 high',
    inputs: { age: 80, apache: 30, sofa: 11, comorbidities: 3, hospitalDays: 2, il6: 0 },
    expect: { score: 9, riskLevel: 'high' },
    source: 'Heyland DK et al. Crit Care 2011;15:R268 (PMID 22088915) — NUTRIC categorical points; high ≥6 with IL-6 (max 10).',
  },

  // ---------------------------------------------------------------- FAST (Newsome 2020: LSM + CAP + AST)
  {
    calcId: 'fast-score',
    description:
      'LSM 8 kPa, CAP 250 dB/m, AST 40: z = −1.65 + 1.07·ln(8) + 2.66e-8·250³ − 63.3/40 = −0.592; FAST = 1/(1+e^{0.592}) = 0.356 (grey zone)',
    inputs: { lsm: 8, cap: 250, ast: 40 },
    expect: { score: 0.356, tolerance: 0.05, riskLevel: 'moderate' },
    source: 'Newsome PN et al. Lancet Gastroenterol Hepatol 2020;5:362-373 (PMID 31975426) — FAST = exp(z)/(1+exp(z)); z = −1.65 + 1.07 ln(LSM) + 2.66×10⁻⁸ CAP³ − 63.3/AST. Rule-out <0.35, rule-in ≥0.67.',
  },

  // ---------------------------------------------------------------- Agile 3+
  {
    calcId: 'agile-3',
    description:
      'Age 55, male, DM, LSM 12, AST 40, ALT 50, PLT 180: logit = −3.92368 + 2.29714·ln(12) − 0.00902·180 − 0.98633·(50/40) + 1.08636 − 0.38581 + 0.03018·55 = 1.288; p = 0.784 (rule-in)',
    inputs: { age: 55, sex: 'M', diabetes: true, lsm: 12, ast: 40, alt: 50, plt: 180 },
    expect: { score: 0.784, tolerance: 0.02, riskLevel: 'high' },
    source: 'Sanyal AJ et al. J Hepatol 2023;78:247-259 (PMID 35176765) — Agile 3+ published logit; rule-in ≥0.679 for F≥3.',
  },

  // ---------------------------------------------------------------- Agile 4
  {
    calcId: 'agile-4',
    description:
      'Male, DM, LSM 12, AST 40, ALT 50, PLT 180: logit = 7.50139 − 15.42498/√12 − 0.01378·180 − 1.41149·(50/40) − 0.53281 + 0.41741 = −1.312; p = 0.212 (rule-out)',
    inputs: { sex: 'M', diabetes: true, lsm: 12, ast: 40, alt: 50, plt: 180 },
    expect: { score: 0.212, tolerance: 0.02, riskLevel: 'low' },
    source: 'Sanyal AJ et al. J Hepatol 2023;78:247-259 — Agile 4 logit with 1/√LSM; rule-out <0.251 for F4.',
  },

  // ---------------------------------------------------------------- MASLD
  {
    calcId: 'masld-criteria',
    description: 'Steatosis + BMI criterion + male alcohol 10 g/day (<30) → MASLD',
    inputs: {
      steatosis: true,
      otherLiver: false,
      bmiMet: true,
      waistMet: false,
      glucoseMet: false,
      bpMet: false,
      tgMet: false,
      hdlMet: false,
      sex: 'M',
      alcohol: 10,
    },
    expect: { score: 'MASLD', riskLevel: 'moderate' },
    source: 'Rinella ME et al. Hepatology 2023 (PMID 37363821) — MASLD = steatosis + ≥1 cardiometabolic trait + alcohol below 20/30 g/day (F/M).',
  },
  {
    calcId: 'masld-criteria',
    description: 'Same metabolic MASLD profile but male alcohol 40 g/day (30–60) → MetALD',
    inputs: {
      steatosis: true,
      otherLiver: false,
      bmiMet: true,
      waistMet: false,
      glucoseMet: false,
      bpMet: false,
      tgMet: false,
      hdlMet: false,
      sex: 'M',
      alcohol: 40,
    },
    expect: { score: 'MetALD', riskLevel: 'high' },
    source: 'Rinella ME et al. Hepatology 2023 — MetALD overlap 30–60 g/day in men with metabolic criteria.',
  },
  {
    calcId: 'masld-criteria',
    description: 'Steatosis + metabolic + male alcohol 80 g/day (>60) → ALD',
    inputs: {
      steatosis: true,
      otherLiver: false,
      bmiMet: true,
      waistMet: false,
      glucoseMet: false,
      bpMet: false,
      tgMet: false,
      hdlMet: false,
      sex: 'M',
      alcohol: 80,
    },
    expect: { score: 'ALD', riskLevel: 'high' },
    source: 'Rinella ME et al. Hepatology 2023 — alcohol >60 g/day (men) classifies as ALD.',
  },

  // ---------------------------------------------------------------- Age-adjusted D-dimer
  {
    calcId: 'age-adjusted-ddimer',
    description: 'Age 75, FEU assay: threshold = 75 × 10 = 750 µg/L; measured 700 is below cutoff (negative)',
    inputs: { age: 75, ddimer: 700, assay: 'feu' },
    expect: { score: 750, riskLevel: 'low', labelMatches: /negative/i },
    source: 'Douma / Schouten age-adjusted D-dimer (PMID 24716616); ADJUST-PE (Righini JAMA 2014) — FEU cutoff = age × 10 µg/L if age ≥50.',
  },
];
