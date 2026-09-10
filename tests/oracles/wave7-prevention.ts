import type { OracleCase } from './types';

/**
 * Hand-derived oracles for wave-7 prevention calculators.
 * Expected values counted or evaluated from the published definitions cited in `source`,
 * never copied from calculator output.
 */
export const wave7PreventionOracles: OracleCase[] = [
  {
    calcId: 'cha2ds2-va',
    description: '74-year-old with hypertension and diabetes: age 65–74 (1) + HTN (1) + DM (1) = 3',
    inputs: { chf: false, htn: true, age: 1, dm: true, stroke: false, vascular: false },
    expect: { score: 3 },
    source:
      'ESC 2024 AF guideline CHA₂DS₂-VA (Van Gelder Eur Heart J 2024 PMID 39210723): same points as CHA₂DS₂-VASc without female sex. Lip Chest 2010 PMID 19762550 point definition.',
  },
  {
    calcId: 'cha2ds2-va',
    description: 'Age <65, no risk factors = 0',
    inputs: { chf: false, htn: false, age: 0, dm: false, stroke: false, vascular: false },
    expect: { score: 0, riskLevel: 'low' },
    source: 'ESC 2024 CHA₂DS₂-VA: score 0 is the lowest thromboembolic-risk stratum (no OAC generally).',
  },
  {
    calcId: 'cha2ds2-va',
    description: 'Age ≥75 (2) + prior stroke/TIA/TE (2) = 4',
    inputs: { chf: false, htn: false, age: 2, dm: false, stroke: true, vascular: false },
    expect: { score: 4, riskLevel: 'high' },
    source: 'CHA₂DS₂-VA points: Age ≥75 = 2, Stroke/TIA/TE = 2. OAC recommended at ≥2 (ESC 2024).',
  },
  {
    calcId: 'cha2ds2-va',
    description: 'Age 65–74 (1) + CHF (1) + vascular disease (1) = 3',
    inputs: { chf: true, htn: false, age: 1, dm: false, stroke: false, vascular: true },
    expect: { score: 3 },
    source: 'CHA₂DS₂-VA: CHF 1 + Age 65–74 1 + Vascular 1 = 3 (max 8).',
  },
  {
    calcId: 'prevent-cvd',
    description:
      '55F, TC 200, HDL 50, SBP 130, BMI 28, eGFR 90, no DM/smoking/BP-tx/statin, UACR 0, HbA1c 0: hand-evaluated PREVENT 10y total CVD logistic ≈ 3.58%',
    inputs: {
      age: 55,
      sex: 'F',
      totalChol: 200,
      hdl: 50,
      sbp: 130,
      bmi: 28,
      egfr: 90,
      diabetes: false,
      smoker: false,
      bpTx: false,
      statin: false,
      uacr: 0,
      hba1c: 0,
    },
    expect: { score: 3.58, tolerance: 0.3 },
    source:
      'Khan SS et al. Circulation 2024 PMID 37947085 PREVENT 10-year CVD female coefficients. Scaled: age_t=0, nh_t=(150×0.02586)−3.5=0.379, hdl_t=(1.293−1.3)/0.3=−0.02333, s_lt=s_gte=0, b_lt=0.6 (BMI coeff 0), e_lt=e_gte=0. LP = −3.307728 + 0.0305239×0.379 + (−0.1606857)×(−0.02333) = −3.29241. Risk% = 100×e^LP/(1+e^LP) = 3.58%.',
  },
  {
    calcId: 'score2-europe',
    description:
      'Paper example: 50-year-old male smoker, SBP 140, TC 5.5 mmol/L, HDL 1.3 mmol/L, low-risk region → ~5.9%',
    inputs: { age: 50, sex: 'male', smoker: true, sbp: 140, totalChol: 5.5, hdl: 1.3, region: 'low' },
    expect: { score: 5.9, tolerance: 2 },
    source:
      'SCORE2 working group Eur Heart J 2021 PMID 34120177. Worked: cage=−2, csbp=1, ctchol=−0.5, chdl=0, smoking=1. Men LP=0.2315. Uncal=1−0.9605^exp(0.2315)≈4.95%. Low-risk men scale1=−0.5699 scale2=0.7476 → calibrated ≈5.91%. Paper states 5.9% low-risk and 14.0% very-high-risk region.',
  },
];
