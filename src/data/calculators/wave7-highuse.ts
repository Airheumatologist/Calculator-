import type { Calculator } from '../../types/calculator';
import { num, bool, str, round, yesNo, selectInput, numberInput, riskFromThresholds } from '../../utils/helpers';

/** Wave 7 high-use / high-visibility P1 calculators. */

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function logitProb(lp: number): number {
  const x = clamp(lp, -20, 20);
  return 1 / (1 + Math.exp(-x));
}

// ─── MAGGIC integer tables (Pocock Eur Heart J 2013) ─────────────────────────
function maggicEfPts(ef: number): number {
  if (ef >= 40) return 0;
  if (ef >= 35) return 1;
  if (ef >= 30) return 2;
  if (ef >= 25) return 3;
  if (ef >= 20) return 5;
  return 7;
}

function maggicAgePts(age: number, ef: number): number {
  // Age is more predictive when EF is preserved (Pocock 2013 interaction).
  if (ef >= 40) {
    if (age < 55) return 0;
    if (age < 60) return 3;
    if (age < 65) return 5;
    if (age < 70) return 7;
    if (age < 75) return 9;
    if (age < 80) return 12;
    return 15;
  }
  if (ef >= 30) {
    if (age < 55) return 0;
    if (age < 60) return 2;
    if (age < 65) return 4;
    if (age < 70) return 6;
    if (age < 75) return 8;
    if (age < 80) return 10;
    return 13;
  }
  if (age < 55) return 0;
  if (age < 60) return 1;
  if (age < 65) return 2;
  if (age < 70) return 4;
  if (age < 75) return 6;
  if (age < 80) return 8;
  return 10;
}

function maggicSbpPts(sbp: number, ef: number): number {
  if (ef < 30) {
    if (sbp < 110) return 5;
    if (sbp < 120) return 4;
    if (sbp < 130) return 3;
    if (sbp < 140) return 2;
    if (sbp < 150) return 1;
    return 0;
  }
  if (ef < 40) {
    if (sbp < 110) return 3;
    if (sbp < 120) return 2;
    if (sbp < 140) return 1;
    return 0;
  }
  if (sbp < 110) return 2;
  if (sbp < 130) return 1;
  return 0;
}

function maggicBmiPts(bmi: number): number {
  if (bmi < 15) return 6;
  if (bmi < 20) return 5;
  if (bmi < 25) return 3;
  if (bmi < 30) return 1;
  return 0;
}

function maggicCrPts(crUmol: number): number {
  if (crUmol < 90) return 0;
  if (crUmol < 110) return 1;
  if (crUmol < 130) return 2;
  if (crUmol < 150) return 3;
  if (crUmol < 170) return 4;
  if (crUmol < 210) return 5;
  if (crUmol < 250) return 6;
  return 8;
}

/** Pocock 2013 Table 4–style mapping (exponential fit to published 1y/3y). */
function maggicMortality(score: number, years: 1 | 3): number {
  const s = clamp(score, 0, 60);
  const base = years === 1 ? 0.0151 : 0.0397;
  return clamp(1 - Math.exp(-base * Math.exp(0.098 * s)), 0, 0.99);
}

// ─── PRISM III (Pollack CCM 1996) ────────────────────────────────────────────
type PrismAge = 'neonate' | 'infant' | 'child' | 'adolescent';

function prismAgeGroup(ageMonths: number): PrismAge {
  if (ageMonths < 1) return 'neonate';
  if (ageMonths < 12) return 'infant';
  if (ageMonths < 144) return 'child';
  return 'adolescent';
}

function prismSbpPts(sbp: number, g: PrismAge): number {
  const mid = g === 'neonate' ? 55 : g === 'infant' ? 65 : g === 'child' ? 75 : 85;
  const low = g === 'neonate' ? 40 : g === 'infant' ? 45 : g === 'child' ? 55 : 65;
  if (sbp < low) return 7;
  if (sbp <= mid) return 3;
  return 0;
}

function prismHrPts(hr: number, g: PrismAge): number {
  const lo = g === 'adolescent' ? 145 : g === 'child' ? 185 : 215;
  const hi = g === 'adolescent' ? 155 : g === 'child' ? 205 : 225;
  if (hr > hi) return 4;
  if (hr >= lo) return 3;
  return 0;
}

function prismCrPts(cr: number, g: PrismAge): number {
  const cut = g === 'neonate' ? 0.85 : g === 'adolescent' ? 1.3 : 0.9;
  return cr > cut ? 2 : 0;
}

function prismBunPts(bun: number, g: PrismAge): number {
  const cut = g === 'neonate' ? 11.9 : 14.9;
  return bun > cut ? 3 : 0;
}

function prismAcidosisPts(ph: number, tco2: number): number {
  const fromPh = ph < 7.0 ? 6 : ph <= 7.28 ? 2 : 0;
  const fromCo2 = tco2 < 5 ? 6 : tco2 < 17 ? 2 : 0;
  return Math.max(fromPh, fromCo2);
}

function prismHighPhPts(ph: number): number {
  if (ph > 7.55) return 3;
  if (ph >= 7.48) return 2;
  return 0;
}

function prismPltPts(plt: number): number {
  if (plt < 50) return 5;
  if (plt < 100) return 4;
  if (plt <= 200) return 2;
  return 0;
}

// ─── WIfI clinical stage (Mills JVS 2014 amputation-risk grid) ────────────────
function wifiClinicalStage(w: number, i: number, fi: number): number {
  const grid: number[][][] = [
    [
      [1, 1, 2, 3],
      [1, 2, 3, 4],
      [2, 2, 3, 4],
      [2, 3, 3, 4],
    ],
    [
      [1, 1, 2, 3],
      [1, 2, 3, 4],
      [2, 3, 4, 4],
      [3, 3, 4, 4],
    ],
    [
      [2, 2, 3, 4],
      [3, 3, 4, 4],
      [3, 4, 4, 4],
      [4, 4, 4, 4],
    ],
    [
      [3, 3, 4, 4],
      [4, 4, 4, 4],
      [4, 4, 4, 4],
      [4, 4, 4, 5],
    ],
  ];
  const ww = clamp(Math.round(w), 0, 3);
  const ii = clamp(Math.round(i), 0, 3);
  const ff = clamp(Math.round(fi), 0, 3);
  return grid[ww][ii][ff];
}

export const wave7HighuseCalcs: Calculator[] = [
  // ─── 1. Seattle Heart Failure Model (educational) ──────────────────────────
  {
    id: 'seattle-hf',
    name: 'Seattle Heart Failure Model (Educational)',
    shortName: 'SHFM',
    description:
      'Educational transparent SHFM-style 1–3 year survival using Levy 2006 predictors. Not the licensed SeattleHF clinical applet.',
    category: 'cardiology',
    tags: ['heart failure', 'seattle', 'shfm', 'survival', 'prognosis'],
    whenToUse: 'Adults with chronic HF when an educational 1–3 year survival estimate from routine labs and GDMT is desired.',
    whyUse:
      'Shows how NYHA, EF, labs, diuretic dose, and GDMT/devices shift predicted survival. Official decisions require the licensed SeattleHF tool.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 18, max: 100, defaultValue: 65 }),
      selectInput(
        'sex',
        'Sex',
        [
          { label: 'Female', value: 'female' },
          { label: 'Male', value: 'male' },
        ],
        'female'
      ),
      selectInput(
        'nyha',
        'NYHA class',
        [
          { label: 'I — No limitation', value: 1, description: 'Ordinary physical activity does not cause undue fatigue, palpitation, or dyspnea' },
          { label: 'II — Slight limitation', value: 2, description: 'Comfortable at rest; ordinary physical activity causes fatigue, palpitation, or dyspnea' },
          { label: 'III — Marked limitation', value: 3, description: 'Comfortable at rest; less than ordinary activity causes symptoms' },
          { label: 'IV — Symptoms at rest', value: 4, description: 'Unable to carry on any physical activity without discomfort; symptoms at rest' },
        ],
        2,
        'Select without point chips — NYHA enters the linear predictor, not an integer sum.'
      ),
      numberInput('lvef', 'LVEF', { unit: '%', min: 8, max: 70, defaultValue: 30 }),
      yesNo('ischemic', 'Ischemic etiology', null),
      numberInput('sbp', 'Systolic BP', { unit: 'mmHg', min: 70, max: 200, defaultValue: 110 }),
      numberInput('diureticMg', 'Loop diuretic (furosemide equivalent)', {
        unit: 'mg/day',
        min: 0,
        max: 400,
        defaultValue: 40,
        helpText: 'Daily furosemide-equivalent dose. Combined with weight as mg/kg.',
      }),
      numberInput('weightKg', 'Weight', { unit: 'kg', min: 30, max: 200, step: 0.5, defaultValue: 80 }),
      numberInput('sodium', 'Serum sodium', { unit: 'mEq/L', min: 115, max: 150, defaultValue: 138 }),
      numberInput('hemoglobin', 'Hemoglobin', { unit: 'g/dL', min: 7, max: 18, step: 0.1, defaultValue: 13 }),
      numberInput('lymphocytes', 'Lymphocytes', { unit: '%', min: 5, max: 60, defaultValue: 25 }),
      numberInput('uricAcid', 'Uric acid', { unit: 'mg/dL', min: 2, max: 16, step: 0.1, defaultValue: 7 }),
      numberInput('cholesterol', 'Total cholesterol', { unit: 'mg/dL', min: 80, max: 350, defaultValue: 180 }),
      yesNo('acei', 'ACE inhibitor', null),
      yesNo('arb', 'ARB (if not on ACEI)', null),
      yesNo('bb', 'Evidence-based beta-blocker', null),
      yesNo('kSparing', 'K-sparing diuretic / MRA', null),
      yesNo('statin', 'Statin', null),
      yesNo('allopurinol', 'Allopurinol', null, 'SHFM treats allopurinol as a risk marker (higher K), not a therapy benefit.'),
      yesNo('icd', 'ICD in situ', null),
      yesNo('crt', 'CRT (CRT-P or CRT-D)', null),
    ],
    calculate(values) {
      const age = num(values.age, 65);
      const male = str(values.sex, 'female') === 'male' ? 1 : 0;
      const nyha = clamp(num(values.nyha, 2), 1, 4);
      const lvef = num(values.lvef, 30);
      const ischemic = bool(values.ischemic) ? 1 : 0;
      const sbp = num(values.sbp, 110);
      const diureticMg = num(values.diureticMg, 0);
      const weightKg = Math.max(num(values.weightKg, 80), 30);
      const mgPerKg = diureticMg / weightKg;
      const sodium = num(values.sodium, 138);
      const hemoglobin = num(values.hemoglobin, 13);
      const lymphocytes = num(values.lymphocytes, 25);
      const uricAcid = num(values.uricAcid, 7);
      const cholesterol = num(values.cholesterol, 180);
      const acei = bool(values.acei) ? 1 : 0;
      const arb = bool(values.arb) ? 1 : 0;
      const bb = bool(values.bb) ? 1 : 0;
      const kSparing = bool(values.kSparing) ? 1 : 0;
      const statin = bool(values.statin) ? 1 : 0;
      const allopurinol = bool(values.allopurinol) ? 1 : 0;
      const icd = bool(values.icd) ? 1 : 0;
      const crt = bool(values.crt) ? 1 : 0;

      // Educational linear predictor approximating Levy Circulation 2006 structure.
      // Survival(t) = exp(−λ t exp(K)) with λ = 0.0405 / year (PRAISE-1 baseline).
      const k =
        0.0086 * age +
        0.23 * male +
        0.4 * (nyha - 1) -
        0.025 * lvef +
        0.25 * ischemic -
        0.009 * sbp +
        0.15 * mgPerKg -
        0.05 * (sodium - 138) -
        0.12 * (hemoglobin - 13) -
        0.008 * (lymphocytes - 20) +
        0.04 * uricAcid -
        0.002 * cholesterol -
        0.53 * acei -
        0.24 * arb -
        0.49 * bb -
        0.22 * kSparing -
        0.28 * statin +
        0.3 * allopurinol -
        0.4 * icd -
        0.3 * crt;

      const kClamped = clamp(k, -6, 8);
      const expK = Math.exp(kClamped);
      const s1 = clamp(Math.exp(-0.0405 * expK) * 100, 0.1, 99.9);
      const s2 = clamp(Math.exp(-0.081 * expK) * 100, 0.1, 99.9);
      const s3 = clamp(Math.exp(-0.1215 * expK) * 100, 0.1, 99.9);
      const surv1 = round(s1, 1);
      const mort1 = 100 - surv1;
      const r = riskFromThresholds(mort1, [
        {
          max: 10,
          level: 'low',
          label: '1-year survival ≥90%',
          interpretation: `Educational SHFM-style 1-year survival ${surv1}%. Low predicted mortality band. Optimize GDMT and reassess trajectory.`,
        },
        {
          max: 20,
          level: 'moderate',
          label: '1-year survival 80–90%',
          interpretation: `Educational SHFM-style 1-year survival ${surv1}%. Intermediate band — intensify GDMT, evaluate devices, and address congestion.`,
        },
        {
          max: 30,
          level: 'high',
          label: '1-year survival 70–80%',
          interpretation: `Educational SHFM-style 1-year survival ${surv1}%. High predicted mortality — advanced-HF review, devices, and goals of care.`,
        },
        {
          max: 100,
          level: 'critical',
          label: '1-year survival <70%',
          interpretation: `Educational SHFM-style 1-year survival ${surv1}%. Critical predicted mortality — consider transplant/MCS evaluation and palliative parallel planning.`,
        },
      ]);

      return {
        score: surv1,
        unit: '%',
        ...r,
        details: [
          { label: '1-year survival', value: `${surv1}%` },
          { label: '2-year survival', value: `${round(s2, 1)}%` },
          { label: '3-year survival', value: `${round(s3, 1)}%` },
          { label: 'Linear predictor K', value: String(round(kClamped, 3)) },
          { label: 'Age / sex / NYHA', value: `${age} y, ${male ? 'male' : 'female'}, NYHA ${nyha}` },
          { label: 'LVEF / ischemic / SBP', value: `${lvef}% / ${ischemic ? 'yes' : 'no'} / ${sbp} mmHg` },
          { label: 'Furosemide equivalent', value: `${diureticMg} mg/day (${round(mgPerKg, 2)} mg/kg at ${weightKg} kg)` },
          { label: 'Na / Hb / lymph / UA / chol', value: `${sodium} / ${hemoglobin} / ${lymphocytes}% / ${uricAcid} / ${cholesterol}` },
          {
            label: 'GDMT / devices',
            value: `ACEI ${acei ? 'yes' : 'no'}, ARB ${arb ? 'yes' : 'no'}, BB ${bb ? 'yes' : 'no'}, MRA ${kSparing ? 'yes' : 'no'}, statin ${statin ? 'yes' : 'no'}, allopurinol ${allopurinol ? 'yes' : 'no'}, ICD ${icd ? 'yes' : 'no'}, CRT ${crt ? 'yes' : 'no'}`,
          },
        ],
        recommendations:
          surv1 < 80
            ? ['Use official SeattleHF for clinical decisions', 'Advanced-HF referral if phenotype fits', 'Review GDMT doses and devices']
            : ['Use official SeattleHF for clinical decisions', 'Continue GDMT titration', 'Recompute after major therapy changes'],
      };
    },
    evidence: {
      summary:
        'Levy 2006 SHFM combines age, sex, NYHA, EF, ischemic etiology, SBP, diuretic mg/kg, sodium, hemoglobin, lymphocyte %, uric acid, cholesterol, ACEI/ARB, β-blocker, K-sparing diuretic, statin, allopurinol, ICD and CRT into a Cox score. Survival(t)=exp(−0.0405·t·e^K). This module is an educational coefficient implementation, not the licensed applet.',
      formula:
        'K ≈ 0.0086·age + 0.23·male + 0.40·(NYHA−1) − 0.025·LVEF + 0.25·ischemic − 0.009·SBP + 0.15·(furosemide mg/kg) − 0.05·(Na−138) − 0.12·(Hb−13) − 0.008·(lymph%−20) + 0.04·UA − 0.002·chol − 0.53·ACEI − 0.24·ARB − 0.49·BB − 0.22·MRA − 0.28·statin + 0.30·allopurinol − 0.40·ICD − 0.30·CRT; S(t)=exp(−0.0405·t·e^K)',
      validation:
        'Original SHFM derived in PRAISE-1 (n=1,125) and validated in 9,942 patients (ROC ~0.73). Educational coefficients here are rounded/transparent and must not replace SeattleHF.',
      references: [
        {
          title: 'The Seattle Heart Failure Model: prediction of survival in heart failure',
          citation: 'Levy WC et al. Circulation. 2006',
          year: 2006,
          pmid: '16534009',
          doi: '10.1161/CIRCULATIONAHA.105.584102',
        },
      ],
    },
    nextSteps: [
      {
        condition: '1-year survival <80% (educational)',
        actions: ['Run official SeattleHF', 'Advanced-HF / transplant-MCS pathway if eligible', 'Revisit GDMT, congestion, and devices'],
      },
      {
        condition: 'Any estimate',
        actions: ['Do not use this educational K for listing or device candidacy', 'Recalculate after GDMT changes'],
      },
    ],
    pearls: [
      'Official SHFM at SeattleHF is the clinical tool; this is an educational coefficient implementation.',
      'Allopurinol increases K (risk marker of hyperuricemia), whereas ACEI/BB/MRA/ICD/CRT decrease K.',
      'Diuretic dose enters as furosemide-equivalent mg/kg — both milligrams and weight move K.',
    ],
  },

  // ─── 2. MAGGIC HF risk ─────────────────────────────────────────────────────
  {
    id: 'maggic-hf',
    name: 'MAGGIC Heart Failure Risk Score',
    shortName: 'MAGGIC',
    description: 'Integer MAGGIC score (Pocock 2013) with 1- and 3-year all-cause mortality estimates in chronic HF.',
    category: 'cardiology',
    tags: ['heart failure', 'maggic', 'mortality', 'prognosis'],
    whenToUse: 'Adults with chronic HFrEF or HFpEF when estimating 1- and 3-year mortality from routine variables.',
    whyUse: 'Simple integer score from 39,372 patients; age and SBP interact with EF as in the published model.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 18, max: 100, defaultValue: 50 }),
      numberInput('lvef', 'LVEF', { unit: '%', min: 10, max: 70, defaultValue: 50 }),
      numberInput('sbp', 'Systolic BP', { unit: 'mmHg', min: 80, max: 200, defaultValue: 150 }),
      numberInput('bmi', 'BMI', { unit: 'kg/m²', min: 12, max: 50, step: 0.1, defaultValue: 32 }),
      numberInput('creatinine', 'Creatinine', {
        unit: 'µmol/L',
        min: 40,
        max: 400,
        defaultValue: 70,
        helpText: 'µmol/L (mg/dL × 88.4). Points rise from 90 µmol/L upward.',
      }),
      selectInput('nyha', 'NYHA class', [
        { label: 'I — No limitation', value: 1, points: 0, description: 'Ordinary physical activity does not cause undue fatigue, palpitation, or dyspnea' },
        { label: 'II — Slight limitation', value: 2, points: 2, description: 'Comfortable at rest; ordinary activity causes HF symptoms' },
        { label: 'III — Marked limitation', value: 3, points: 6, description: 'Comfortable at rest; less than ordinary activity causes symptoms' },
        { label: 'IV — Symptoms at rest', value: 4, points: 8, description: 'Unable to carry on any activity without discomfort; symptoms at rest' },
      ]),
      yesNo('male', 'Male sex', 1),
      yesNo('diabetes', 'Diabetes mellitus', 3),
      yesNo('copd', 'COPD', 2),
      yesNo('smoker', 'Current smoker', 1),
      yesNo('hfOver18mo', 'HF first diagnosed ≥18 months ago', 2, 'heartfailurerisk.org correction (Sep 2013): chronic HF adds 2 points.'),
      yesNo('noBb', 'Not prescribed a beta-blocker', 3),
      yesNo('noAcei', 'Not prescribed ACEI or ARB', 1),
    ],
    calculate(values) {
      const age = num(values.age, 50);
      const lvef = num(values.lvef, 50);
      const sbp = num(values.sbp, 150);
      const bmi = num(values.bmi, 32);
      const creatinine = num(values.creatinine, 70);
      const nyha = num(values.nyha, 1);
      const nyhaPts = nyha >= 4 ? 8 : nyha === 3 ? 6 : nyha === 2 ? 2 : 0;
      const male = bool(values.male) ? 1 : 0;
      const diabetes = bool(values.diabetes) ? 3 : 0;
      const copd = bool(values.copd) ? 2 : 0;
      const smoker = bool(values.smoker) ? 1 : 0;
      const hfOver18mo = bool(values.hfOver18mo) ? 2 : 0;
      const noBb = bool(values.noBb) ? 3 : 0;
      const noAcei = bool(values.noAcei) ? 1 : 0;
      const efPts = maggicEfPts(lvef);
      const agePts = maggicAgePts(age, lvef);
      const sbpPts = maggicSbpPts(sbp, lvef);
      const bmiPts = maggicBmiPts(bmi);
      const crPts = maggicCrPts(creatinine);
      const score =
        efPts + agePts + sbpPts + bmiPts + crPts + nyhaPts + male + diabetes + copd + smoker + hfOver18mo + noBb + noAcei;
      const mort1 = maggicMortality(score, 1);
      const mort3 = maggicMortality(score, 3);
      const r = riskFromThresholds(score, [
        {
          max: 12,
          level: 'low',
          label: 'Low MAGGIC (0–12)',
          interpretation: `MAGGIC ${score}. Low-risk integer band. Estimated 1-year mortality ${round(mort1 * 100, 1)}%, 3-year ${round(mort3 * 100, 1)}%. Continue GDMT and routine HF follow-up.`,
        },
        {
          max: 20,
          level: 'moderate',
          label: 'Intermediate MAGGIC (13–20)',
          interpretation: `MAGGIC ${score}. Intermediate mortality. Estimated 1-year ${round(mort1 * 100, 1)}%, 3-year ${round(mort3 * 100, 1)}%. Intensify GDMT; consider ICD/CRT if EF qualifies.`,
        },
        {
          max: 29,
          level: 'high',
          label: 'High MAGGIC (21–29)',
          interpretation: `MAGGIC ${score}. High mortality. Estimated 1-year ${round(mort1 * 100, 1)}%, 3-year ${round(mort3 * 100, 1)}%. Advanced-HF review and close follow-up.`,
        },
        {
          max: 99,
          level: 'critical',
          label: 'Very high MAGGIC (≥30)',
          interpretation: `MAGGIC ${score}. Very high predicted mortality (3-year often >50% in the original mapping). Consider advanced therapies and goals of care.`,
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: '1-year mortality (est.)', value: `${round(mort1 * 100, 1)}%` },
          { label: '3-year mortality (est.)', value: `${round(mort3 * 100, 1)}%` },
          { label: 'EF points', value: `${efPts} (LVEF ${lvef}%)` },
          { label: 'Age points (EF-interacted)', value: `${agePts} (age ${age})` },
          { label: 'SBP points (EF-interacted)', value: `${sbpPts} (SBP ${sbp})` },
          { label: 'BMI points', value: `${bmiPts} (BMI ${bmi})` },
          { label: 'Creatinine points', value: `${crPts} (${creatinine} µmol/L)` },
          { label: 'NYHA points', value: `${nyhaPts} (class ${nyha})` },
          {
            label: 'Clinical add-ons',
            value: `male ${male}, DM ${diabetes}, COPD ${copd}, smoker ${smoker}, HF≥18 mo ${hfOver18mo}, no BB ${noBb}, no ACEI/ARB ${noAcei}`,
          },
        ],
        recommendations:
          score >= 21
            ? ['Advanced-HF referral if eligible', 'Optimize GDMT and devices', 'Discuss prognosis']
            : ['Optimize GDMT', 'Reassess after decompensation or lab shifts'],
      };
    },
    evidence: {
      summary:
        'MAGGIC integer score from 39,372 HF patients (reduced and preserved EF). 13 predictors: age (EF interaction), EF, NYHA, creatinine, diabetes, no β-blocker, SBP (EF interaction), BMI, HF duration, smoker, COPD, male sex, no ACEI/ARB. 3-year mortality ~4% at score 0 to >60% at high scores.',
      formula:
        'Integer sum of EF, age×EF, SBP×EF, BMI, creatinine, NYHA (0/2/6/8), male +1, DM +3, COPD +2, smoker +1, HF≥18 months +2, no BB +3, no ACEI/ARB +1. 1y mort ≈ 1−exp(−0.0151·e^{0.098·score}); 3y ≈ 1−exp(−0.0397·e^{0.098·score}) (fit to Pocock Table 4).',
      validation: 'Pocock et al. Eur Heart J 2013; www.heartfailurerisk.org. Observed 3-year mortality 10% (bottom quintile) to 70% (top decile).',
      references: [
        {
          title: 'Predicting survival in heart failure: a risk score based on 39 372 patients from 30 studies',
          citation: 'Pocock SJ et al. Eur Heart J. 2013',
          year: 2013,
          pmid: '23095984',
          doi: '10.1093/eurheartj/ehs337',
        },
      ],
    },
    nextSteps: [
      { condition: 'MAGGIC ≥21', actions: ['Advanced-HF pathway', 'ICD/CRT eligibility', 'Palliative parallel planning if appropriate'] },
      { condition: 'Any score', actions: ['Recalculate after GDMT changes or decompensation', 'Do not use in isolation for transplant listing'] },
    ],
    pearls: [
      'A zero-risk profile (young, female, NYHA I, EF ≥40, high SBP/BMI, normal creatinine, no comorbidities, on BB and ACEI/ARB, recent HF diagnosis) scores 0.',
      'Age and SBP points increase more when EF is preserved — do not ignore HFpEF.',
      'From 18 Sep 2013, +2 points if HF was diagnosed ≥18 months ago (not for recent new diagnosis).',
    ],
  },

  // ─── 3. T-MACS ─────────────────────────────────────────────────────────────
  {
    id: 'tmacs',
    name: 'T-MACS (Troponin-only Manchester ACS)',
    shortName: 'T-MACS',
    description:
      'Educational T-MACS logistic probability of ACS from ECG ischemia, admission troponin ratio, and clinical features (Body 2016).',
    category: 'emergency',
    tags: ['acs', 't-macs', 'chest pain', 'troponin', 'ed'],
    whenToUse: 'ED patients with suspected ACS when a single admission hs-cTn and clinical features are available.',
    whyUse: 'Can rule out ACS in ~40% with high NPV using one blood test; also identifies a high-probability rule-in group.',
    inputs: [
      yesNo('ecgIschemia', 'Acute ECG ischemia (ST depression or ischemic T inversion)', null, 'T-MACS: typically new ST-segment depression or T-wave inversion consistent with ischemia, not isolated nonspecific ST–T changes. STEMI pathways override this tool.'),
      numberInput('tropRatio', 'Admission troponin / URL ratio', {
        min: 0,
        max: 40,
        step: 0.1,
        defaultValue: 0,
        helpText: 'Observed hs-cTn divided by the assay 99th-centile URL. Coefficient scaled from 0.089 per ng/L hs-cTnT (URL 14 ng/L).',
      }),
      yesNo('radiatingPain', 'Pain radiating to right arm or shoulder', null),
      yesNo('vomiting', 'Vomiting with the pain', null),
      yesNo('sweating', 'Sweating observed by clinician', null),
      yesNo('hypotension', 'Hypotension (SBP <100 mmHg on arrival)', null),
      yesNo('worseningAngina', 'Worsening (crescendo) angina', null),
    ],
    calculate(values) {
      const ecg = bool(values.ecgIschemia) ? 1 : 0;
      const tropRatio = num(values.tropRatio, 0);
      const radiatingPain = bool(values.radiatingPain) ? 1 : 0;
      const vomiting = bool(values.vomiting) ? 1 : 0;
      const sweating = bool(values.sweating) ? 1 : 0;
      const hypotension = bool(values.hypotension) ? 1 : 0;
      const worseningAngina = bool(values.worseningAngina) ? 1 : 0;
      const lp =
        1.713 * ecg +
        0.847 * worseningAngina +
        0.607 * radiatingPain +
        1.417 * vomiting +
        2.058 * sweating +
        1.208 * hypotension +
        1.246 * tropRatio -
        4.766;
      const p = logitProb(lp);
      const pct = round(p * 100, 1);
      const r = riskFromThresholds(p, [
        {
          max: 0.019999,
          level: 'low',
          label: 'Very low (<2%) — discharge candidate',
          interpretation: `T-MACS probability ${pct}%. Very low ACS risk in derivation/validation — eligible for immediate discharge in validated pathways if ECG is non-ischemic and follow-up is arranged.`,
        },
        {
          max: 0.05,
          level: 'moderate',
          label: 'Low (2–5%)',
          interpretation: `T-MACS probability ${pct}%. Low (not very-low) band — usually serial troponin / observation rather than immediate discharge.`,
        },
        {
          max: 0.95,
          level: 'high',
          label: 'Moderate (5–95%)',
          interpretation: `T-MACS probability ${pct}%. Intermediate band — admit/observe, serial biomarkers, and cardiology review as indicated.`,
        },
        {
          max: 1,
          level: 'critical',
          label: 'High (>95%) — rule-in',
          interpretation: `T-MACS probability ${pct}%. High/rule-in band — treat as ACS, anti-ischemic therapy, and urgent cardiology.`,
        },
      ]);
      return {
        score: pct,
        unit: '%',
        ...r,
        details: [
          { label: 'ACS probability', value: `${pct}%` },
          { label: 'Linear predictor', value: String(round(lp, 3)) },
          { label: 'ECG ischemia', value: ecg ? 'yes' : 'no' },
          { label: 'Troponin / URL', value: String(tropRatio) },
          { label: 'Right-arm radiation', value: radiatingPain ? 'yes' : 'no' },
          { label: 'Vomiting', value: vomiting ? 'yes' : 'no' },
          { label: 'Observed sweating', value: sweating ? 'yes' : 'no' },
          { label: 'SBP <100', value: hypotension ? 'yes' : 'no' },
          { label: 'Crescendo angina', value: worseningAngina ? 'yes' : 'no' },
        ],
        recommendations:
          p < 0.02
            ? ['Consider discharge if pathway-approved', 'Ensure follow-up and return precautions']
            : p > 0.95
              ? ['ACS pathway', 'Urgent cardiology']
              : ['Serial troponin', 'Do not discharge on a single very-low threshold miss'],
      };
    },
    evidence: {
      summary:
        'T-MACS re-derives MACS without H-FABP. p=1/(1+e^−lp) with ECG, crescendo angina, right-arm radiation, vomiting, observed sweating, SBP <100, and admission hs-cTnT. Very low <2% supports discharge; >95% rules in.',
      formula:
        'lp = 1.713·ECG + 0.847·crescendo + 0.607·right-arm + 1.417·vomit + 2.058·sweat + 1.208·SBP<100 + 1.246·(Tn/URL) − 4.766 (1.246 = 0.089 × 14 ng/L URL). p=1/(1+e^−lp).',
      validation:
        'Body et al. Emerg Med J 2017: NPV 99.3%, sensitivity ~98% for very-low band; ~40% ruled out with hs-cTnT.',
      references: [
        {
          title: 'Troponin-only Manchester Acute Coronary Syndromes (T-MACS) decision aid: single biomarker re-derivation and external validation in three cohorts',
          citation: 'Body R et al. Emerg Med J. 2017;34:349-356',
          year: 2017,
          pmid: '27565197',
          doi: '10.1136/emermed-2016-205983',
        },
      ],
    },
    nextSteps: [
      { condition: 'Very low (<2%)', actions: ['Discharge if local T-MACS pathway allows', 'GP/cardiology follow-up', 'Return precautions'] },
      { condition: 'High (>95%)', actions: ['Activate ACS pathway', 'Anti-ischemic therapy', 'Admit'] },
      { condition: 'Low/moderate', actions: ['Serial troponin', 'Do not use as a standalone rule-out if trop ratio is pending'] },
    ],
    pearls: [
      'Sweating must be observed, not only reported.',
      'Pain radiation is specifically right arm/shoulder in T-MACS (not left arm).',
    ],
  },

  // ─── 4. GLIM malnutrition ──────────────────────────────────────────────────
  {
    id: 'glim-malnutrition',
    name: 'GLIM Malnutrition Criteria',
    shortName: 'GLIM',
    description:
      'Global Leadership Initiative on Malnutrition (GLIM): ≥1 phenotypic AND ≥1 etiologic criterion, with moderate vs severe staging.',
    category: 'geriatrics',
    tags: ['malnutrition', 'glim', 'nutrition', 'bmi', 'weight loss'],
    whenToUse: 'Adults at risk of malnutrition (after a positive screen such as MUST/NRS-2002) to confirm and stage GLIM malnutrition.',
    whyUse: 'Current global consensus definition used in nutrition research and increasingly in hospital coding/pathways.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 18, max: 110, defaultValue: 70 }),
      numberInput('bmi', 'BMI', { unit: 'kg/m²', min: 10, max: 50, step: 0.1, defaultValue: 24, helpText: 'Phenotypic low BMI: <20 if age <70, <22 if age ≥70. Severe: <18.5 / <20. Asian cut-offs differ.' }),
      selectInput('weightLoss', 'Unintentional weight loss', [
        { label: 'None / below GLIM threshold', value: 'none', description: 'Loss ≤5% in 6 months and ≤10% beyond 6 months' },
        { label: 'Moderate (>5% in 6 months or >10% beyond 6 months)', value: 'moderate', description: 'Phenotypic moderate: >5% over 6 months, or >10% beyond 6 months' },
        { label: 'Severe (>10% in 6 months or >20% beyond 6 months)', value: 'severe', description: 'Phenotypic severe: >10% over 6 months, or >20% beyond 6 months' },
      ], undefined, 'Unintentional only. Use usual (premorbid) weight as the baseline.'),
      yesNo('reducedMuscle', 'Reduced muscle mass (validated method)', null, 'DXA, BIA, ultrasound, calf circumference, or physical exam per GLIM.'),
      yesNo('reducedIntake', 'Reduced food intake or assimilation', null, '≤50% of requirements >1 week, any reduction >2 weeks, or chronic GI malabsorption.'),
      yesNo('inflammation', 'Inflammation / disease burden', null, 'Acute illness/injury or chronic inflammatory disease (CRP, albumin as supportive).'),
    ],
    calculate(values) {
      const age = num(values.age, 70);
      const bmi = num(values.bmi, 24);
      const weightLoss = str(values.weightLoss, 'none');
      const reducedMuscle = bool(values.reducedMuscle);
      const reducedIntake = bool(values.reducedIntake);
      const inflammation = bool(values.inflammation);
      const severeBmi = age >= 70 ? bmi < 20 : bmi < 18.5;
      const moderateBmi = !severeBmi && (age >= 70 ? bmi < 22 : bmi < 20);
      const lowBmi = severeBmi || moderateBmi;
      const phenotypic = weightLoss !== 'none' || lowBmi || reducedMuscle;
      const etiologic = reducedIntake || inflammation;
      const severePhenotypic = weightLoss === 'severe' || severeBmi;
      let score: string;
      let riskLevel: 'low' | 'moderate' | 'high';
      let label: string;
      let interpretation: string;
      if (!phenotypic || !etiologic) {
        score = 'No GLIM malnutrition';
        riskLevel = 'low';
        label = 'GLIM negative';
        interpretation = `GLIM not met (need ≥1 phenotypic AND ≥1 etiologic). Phenotypic ${phenotypic ? 'yes' : 'no'}; etiologic ${etiologic ? 'yes' : 'no'}. Continue screening and treat reversible intake barriers.`;
      } else if (severePhenotypic) {
        score = 'GLIM severe';
        riskLevel = 'high';
        label = 'GLIM severe malnutrition';
        interpretation =
          'GLIM malnutrition, severe (stage 2): etiologic criterion plus severe weight loss and/or severe low BMI. Nutrition-support urgency is high.';
      } else {
        score = 'GLIM moderate';
        riskLevel = 'moderate';
        label = 'GLIM moderate malnutrition';
        interpretation =
          'GLIM malnutrition, moderate (stage 1): ≥1 phenotypic and ≥1 etiologic criterion without severe BMI/weight-loss thresholds.';
      }
      return {
        score,
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Age', value: `${age} y (BMI cut ${age >= 70 ? '<22 / severe <20' : '<20 / severe <18.5'})` },
          { label: 'BMI', value: `${bmi} kg/m²${lowBmi ? (severeBmi ? ' — severe phenotypic' : ' — moderate phenotypic') : ''}` },
          { label: 'Weight loss', value: weightLoss },
          { label: 'Reduced muscle mass', value: reducedMuscle ? 'yes (phenotypic)' : 'no' },
          { label: 'Reduced intake/assimilation', value: reducedIntake ? 'yes (etiologic)' : 'no' },
          { label: 'Inflammation/disease burden', value: inflammation ? 'yes (etiologic)' : 'no' },
          { label: 'Phenotypic criterion', value: phenotypic ? 'met' : 'not met' },
          { label: 'Etiologic criterion', value: etiologic ? 'met' : 'not met' },
        ],
        recommendations: phenotypic && etiologic
          ? ['Dietitian-led plan', 'Treat inflammation/intake barrier', 'Repeat anthropometrics']
          : ['If screen-positive, re-check muscle mass and intake', 'Do not diagnose GLIM on etiology or phenotype alone'],
      };
    },
    evidence: {
      summary:
        'GLIM (2018/2019): malnutrition requires ≥1 phenotypic (weight loss, low BMI, reduced muscle mass) AND ≥1 etiologic (reduced intake/assimilation, inflammation). Severity is staged by degree of weight loss or low BMI (age-specific; Asian cut-offs differ).',
      formula:
        'Positive = (≥1 phenotypic) AND (≥1 etiologic). Severe if weight loss is the severe band or BMI <18.5 (<70 y) / <20 (≥70 y); otherwise moderate when positive.',
      validation: 'Consensus of ASPEN/ESPEN/FELANPE/PENSA. Subsequent cohort studies support prognostic association with mortality and LOS.',
      references: [
        {
          title: 'GLIM criteria for the diagnosis of malnutrition — a consensus report from the global clinical nutrition community',
          citation: 'Cederholm T et al. Clin Nutr. 2019',
          year: 2019,
          pmid: '30181091',
          doi: '10.1016/j.clnu.2018.08.002',
        },
      ],
    },
    nextSteps: [
      { condition: 'GLIM moderate or severe', actions: ['Nutrition support pathway', 'Address etiologic driver', 'Monitor intake and weight'] },
      { condition: 'GLIM negative but high risk', actions: ['Repeat screen', 'Consider muscle-mass measurement'] },
    ],
    pearls: [
      'A positive malnutrition screen is the usual entry step before applying GLIM.',
      'Asian BMI cut-offs are lower (<18.5 / <17.0); this tool uses non-Asian adult thresholds.',
      'Reduced muscle mass alone without etiologic disease/intake does not meet GLIM.',
    ],
  },

  // ─── 5. PRISM III ──────────────────────────────────────────────────────────
  {
    id: 'prism-iii',
    name: 'PRISM III (Pediatric Risk of Mortality)',
    shortName: 'PRISM III',
    description: 'PRISM III physiologic point score for PICU mortality risk (Pollack 1996), using published age-banded ranges.',
    category: 'pediatrics',
    tags: ['picu', 'prism', 'mortality', 'pediatric icu', 'severity'],
    whenToUse: 'PICU admissions when computing PRISM III from first-12/24-hour worst physiologic values.',
    whyUse: 'Classic pediatric ICU severity score; higher points = higher mortality risk. Use institutional PRISM IV/PIM-3 for calibrated death probabilities.',
    inputs: [
      numberInput('ageMonths', 'Age', { unit: 'months', min: 0, max: 216, defaultValue: 36, helpText: 'Neonate <1 mo, infant 1–11 mo, child 12–143 mo, adolescent ≥144 mo.' }),
      numberInput('sbp', 'Lowest systolic BP', { unit: 'mmHg', min: 30, max: 180, defaultValue: 100 }),
      numberInput('hr', 'Highest heart rate', { unit: '/min', min: 40, max: 250, defaultValue: 120 }),
      numberInput('temp', 'Temperature (most abnormal)', { unit: '°C', min: 32, max: 41.5, step: 0.1, defaultValue: 37 }),
      numberInput('gcs', 'GCS (worst; not post-sedation)', { min: 3, max: 15, defaultValue: 15 }),
      selectInput('pupils', 'Pupillary reflexes', [
        { label: 'Both reactive', value: 0, points: 0, description: 'Both pupils reactive to light' },
        { label: 'One fixed (>3 mm)', value: 7, points: 7, description: 'One pupil dilated >3 mm and unreactive' },
        { label: 'Both fixed (>3 mm)', value: 11, points: 11, description: 'Both pupils dilated >3 mm and unreactive' },
      ], undefined, 'Fixed pupils are dilated (>3 mm) and not reactive. Do not score after iatrogenic mydriasis; use pre-dilatation status. Do not score GCS within 2 hours of sedation/paralysis.'),
      numberInput('ph', 'pH (most abnormal)', { min: 6.8, max: 7.7, step: 0.01, defaultValue: 7.4 }),
      numberInput('pco2', 'Highest PCO2', { unit: 'mmHg', min: 20, max: 100, defaultValue: 40 }),
      numberInput('pao2', 'Lowest PaO2', { unit: 'mmHg', min: 30, max: 150, defaultValue: 90 }),
      numberInput('tco2', 'Total CO2 (most abnormal)', { unit: 'mmol/L', min: 3, max: 45, defaultValue: 24 }),
      numberInput('glucose', 'Highest glucose', { unit: 'mg/dL', min: 40, max: 500, defaultValue: 100 }),
      numberInput('potassium', 'Highest potassium', { unit: 'mEq/L', min: 2.2, max: 9, step: 0.1, defaultValue: 4 }),
      numberInput('creatinine', 'Highest creatinine', { unit: 'mg/dL', min: 0.1, max: 8, step: 0.1, defaultValue: 0.4 }),
      numberInput('bun', 'Highest BUN', { unit: 'mg/dL', min: 2, max: 80, defaultValue: 10 }),
      numberInput('wbc', 'Lowest WBC', { unit: '×10³/µL', min: 0.5, max: 40, step: 0.1, defaultValue: 8 }),
      numberInput('pt', 'Highest PT', { unit: 's', min: 10, max: 60, defaultValue: 12 }),
      numberInput('ptt', 'Highest PTT', { unit: 's', min: 20, max: 150, defaultValue: 32 }),
      numberInput('platelets', 'Lowest platelets', { unit: '×10³/µL', min: 10, max: 450, defaultValue: 250 }),
    ],
    calculate(values) {
      const ageMonths = num(values.ageMonths, 36);
      const sbp = num(values.sbp, 100);
      const hr = num(values.hr, 120);
      const temp = num(values.temp, 37);
      const gcs = num(values.gcs, 15);
      const pupils = num(values.pupils, 0);
      const ph = num(values.ph, 7.4);
      const pco2 = num(values.pco2, 40);
      const pao2 = num(values.pao2, 90);
      const tco2 = num(values.tco2, 24);
      const glucose = num(values.glucose, 100);
      const potassium = num(values.potassium, 4);
      const creatinine = num(values.creatinine, 0.4);
      const bun = num(values.bun, 10);
      const wbc = num(values.wbc, 8);
      const pt = num(values.pt, 12);
      const ptt = num(values.ptt, 32);
      const platelets = num(values.platelets, 250);
      const g = prismAgeGroup(ageMonths);
      const sbpPts = prismSbpPts(sbp, g);
      const hrPts = prismHrPts(hr, g);
      const tempPts = temp < 33 || temp > 40 ? 3 : 0;
      const gcsPts = gcs < 8 ? 5 : 0;
      const pupilPts = pupils >= 11 ? 11 : pupils >= 7 ? 7 : 0;
      const acidPts = prismAcidosisPts(ph, tco2);
      const highPhPts = prismHighPhPts(ph);
      const pco2Pts = pco2 > 75 ? 3 : pco2 >= 50 ? 1 : 0;
      const pao2Pts = pao2 < 42 ? 6 : pao2 < 50 ? 3 : 0;
      const tco2HighPts = tco2 > 34 ? 4 : 0;
      const gluPts = glucose > 200 ? 2 : 0;
      const kPts = potassium > 6.9 ? 3 : 0;
      const crPts = prismCrPts(creatinine, g);
      const bunPts = prismBunPts(bun, g);
      const wbcPts = wbc < 3 ? 4 : 0;
      const coagCutPtt = g === 'neonate' ? 85 : 57;
      const coagPts = pt > 22 || ptt > coagCutPtt ? 3 : 0;
      const pltPts = prismPltPts(platelets);
      const neuro = gcsPts + pupilPts;
      const nonNeuro =
        sbpPts + hrPts + tempPts + acidPts + highPhPts + pco2Pts + pao2Pts + tco2HighPts + gluPts + kPts + crPts + bunPts + wbcPts + coagPts + pltPts;
      const score = neuro + nonNeuro;
      const r = riskFromThresholds(score, [
        {
          max: 5,
          level: 'low',
          label: 'PRISM III 0–5 (low)',
          interpretation: `PRISM III ${score}. Low physiologic derangement band. Still interpret with diagnosis, age, and local calibration — not a stand-alone death probability.`,
        },
        {
          max: 10,
          level: 'moderate',
          label: 'PRISM III 6–10 (moderate)',
          interpretation: `PRISM III ${score}. Moderate severity. Ensure organ-support readiness and serial labs.`,
        },
        {
          max: 16,
          level: 'high',
          label: 'PRISM III 11–16 (high)',
          interpretation: `PRISM III ${score}. High severity — mortality risk is substantially increased in original cohorts.`,
        },
        {
          max: 99,
          level: 'critical',
          label: 'PRISM III ≥17 (critical)',
          interpretation: `PRISM III ${score}. Critical physiologic derangement. Highest original mortality band; use with PIM/PRISM IV for calibrated risk.`,
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'Age group', value: `${g} (${ageMonths} months)` },
          { label: 'Neurologic subscore', value: String(neuro) },
          { label: 'Non-neurologic subscore', value: String(nonNeuro) },
          { label: 'SBP points', value: `${sbpPts} (${sbp} mmHg)` },
          { label: 'HR points', value: `${hrPts} (${hr}/min)` },
          { label: 'Temp points', value: `${tempPts} (${temp} °C)` },
          { label: 'GCS points', value: `${gcsPts} (GCS ${gcs})` },
          { label: 'Pupils points', value: String(pupilPts) },
          { label: 'Acidosis / high pH / TCO2 high', value: `${acidPts} / ${highPhPts} / ${tco2HighPts} (pH ${ph}, TCO2 ${tco2})` },
          { label: 'PCO2 / PaO2', value: `${pco2Pts} / ${pao2Pts} (${pco2} / ${pao2} mmHg)` },
          { label: 'Glucose / K / Cr / BUN', value: `${gluPts} / ${kPts} / ${crPts} / ${bunPts} (${glucose}, ${potassium}, ${creatinine}, ${bun})` },
          { label: 'WBC / PT-PTT / platelets', value: `${wbcPts} / ${coagPts} / ${pltPts} (WBC ${wbc}, PT ${pt}s, PTT ${ptt}s, Plt ${platelets})` },
        ],
        recommendations:
          score >= 11
            ? ['PICU-level monitoring', 'Do not convert this integer to a death % without a calibrated model']
            : ['Continue physiologic charting', 'Re-score if using 12- vs 24-hour window consistently'],
      };
    },
    evidence: {
      summary:
        'PRISM III assigns points across 17 physiologic variables (26 ranges), age-banded for SBP, HR, creatinine and BUN. Mental status (GCS <8 = 5) and pupils (1 fixed = 7, both = 11) dominate. This implementation uses published Pollack 1996 ranges.',
      formula:
        'Sum of age-banded SBP (0/3/7) and HR (0/3/4); temp <33 or >40 = 3; GCS <8 = 5; pupils 0/7/11; acidosis 0/2/6; high pH 0/2/3; PCO2 0/1/3; PaO2 0/3/6; TCO2 >34 = 4; glucose >200 = 2; K >6.9 = 3; Cr/BUN age cuts; WBC <3 = 4; PT >22 or PTT >57 (>85 neonate) = 3; platelets 0/2/4/5.',
      validation: 'Derived on 11,165 PICU admissions (543 deaths). Use PRISM IV or PIM-3 when a calibrated mortality probability is required.',
      references: [
        {
          title: 'PRISM III: an updated Pediatric Risk of Mortality score',
          citation: 'Pollack MM, Patel KM, Ruttimann UE. Crit Care Med. 1996',
          year: 1996,
          pmid: '8706448',
          doi: '10.1097/00003246-199605000-00004',
        },
      ],
    },
    nextSteps: [
      { condition: 'PRISM III ≥11', actions: ['Confirm values are worst in the official time window', 'Pair with diagnosis-specific risk'] },
      { condition: 'Any score', actions: ['Do not quote an uncalibrated death percentage from the integer alone'] },
    ],
    pearls: [
      'Do not score GCS within 2 hours of sedation/paralysis; use pre-sedation status if continuously sedated.',
      'Pupil size is invalid after iatrogenic dilatation; HR is invalid during crying/iatrogenic agitation.',
      'Neurologic and non-neurologic subscores are sometimes reported separately (and feed PRISM IV).',
    ],
  },

  // ─── 6. PRISM IV ───────────────────────────────────────────────────────────
  {
    id: 'prism-iv',
    name: 'PRISM IV (Educational PICU Mortality)',
    shortName: 'PRISM IV',
    description:
      'Educational PRISM IV-style PICU mortality probability using first-4-hour physiology plus age, admission source, cancer, and cardiac arrest (Pollack 2016 structure).',
    category: 'pediatrics',
    tags: ['picu', 'prism-iv', 'mortality', 'pediatric icu'],
    whenToUse: 'PICU admissions when an educational PRISM IV-style death probability is wanted alongside PRISM III points.',
    whyUse: 'PRISM IV converts 4-hour physiology plus context (age, source, cancer, arrest) into a mortality probability. This module is labeled educational.',
    inputs: [
      numberInput('ageMonths', 'Age', { unit: 'months', min: 0, max: 216, defaultValue: 36, helpText: 'Neonate <1 mo, infant 1–11 mo, child 12–143 mo, adolescent ≥144 mo. PRISM IV uses a 4-hour window.' }),
      selectInput(
        'source',
        'Admission source',
        [
          { label: 'OR / PACU', value: 'or' },
          { label: 'Emergency department', value: 'ed' },
          { label: 'Inpatient floor', value: 'floor' },
          { label: 'Another hospital', value: 'transfer' },
        ],
        'ed'
      ),
      yesNo('cancer', 'Oncologic diagnosis', null),
      yesNo('arrest', 'Cardiac arrest in prior 24 h', null),
      numberInput('sbp', 'Lowest systolic BP (first 4 h)', { unit: 'mmHg', min: 30, max: 180, defaultValue: 100 }),
      numberInput('hr', 'Highest heart rate (first 4 h)', { unit: '/min', min: 40, max: 250, defaultValue: 120 }),
      numberInput('gcs', 'Worst GCS (first 4 h)', { min: 3, max: 15, defaultValue: 15, helpText: 'Do not score GCS within 2 hours of sedation/paralysis; use pre-sedation status if continuously sedated.' }),
      selectInput('pupils', 'Pupillary reflexes', [
        { label: 'Both reactive', value: 'none' },
        { label: 'One fixed (>3 mm)', value: 'one' },
        { label: 'Both fixed (>3 mm)', value: 'both' },
      ], undefined, 'Fixed pupils are dilated (>3 mm) and not reactive. Do not score after iatrogenic mydriasis; use pre-dilatation status. 4-hour window (not 12/24-hour PRISM III).'),
      numberInput('ph', 'Most abnormal pH', { min: 6.8, max: 7.7, step: 0.01, defaultValue: 7.4 }),
      numberInput('pco2', 'Highest PCO2', { unit: 'mmHg', min: 20, max: 100, defaultValue: 40 }),
      numberInput('creatinine', 'Highest creatinine', { unit: 'mg/dL', min: 0.1, max: 8, step: 0.1, defaultValue: 0.4 }),
      numberInput('wbc', 'Lowest WBC', { unit: '×10³/µL', min: 0.5, max: 40, step: 0.1, defaultValue: 8 }),
      numberInput('platelets', 'Lowest platelets', { unit: '×10³/µL', min: 10, max: 450, defaultValue: 250 }),
      numberInput('glucose', 'Highest glucose', { unit: 'mg/dL', min: 40, max: 500, defaultValue: 100 }),
    ],
    calculate(values) {
      const ageMonths = num(values.ageMonths, 36);
      const source = str(values.source, 'ed');
      const cancer = bool(values.cancer) ? 1 : 0;
      const arrest = bool(values.arrest) ? 1 : 0;
      const sbp = num(values.sbp, 100);
      const hr = num(values.hr, 120);
      const gcs = num(values.gcs, 15);
      const pupils = str(values.pupils, 'none');
      const ph = num(values.ph, 7.4);
      const pco2 = num(values.pco2, 40);
      const creatinine = num(values.creatinine, 0.4);
      const wbc = num(values.wbc, 8);
      const platelets = num(values.platelets, 250);
      const glucose = num(values.glucose, 100);
      const g = prismAgeGroup(ageMonths);
      // Educational 4-hour physiology with PRISM-IV-flavoured (slightly different) cuts.
      const sbpPts = prismSbpPts(sbp, g);
      const hrPts = prismHrPts(hr, g);
      const gcsPts = gcs < 9 ? 4 : 0;
      const pupilPts = pupils === 'both' ? 10 : pupils === 'one' ? 6 : 0;
      const phPts = ph < 7.1 ? 5 : ph < 7.3 ? 2 : ph > 7.55 ? 2 : 0;
      const pco2Pts = pco2 > 70 ? 2 : pco2 >= 50 ? 1 : 0;
      const crPts = prismCrPts(creatinine, g);
      const wbcPts = wbc < 3 ? 3 : 0;
      const pltPts = platelets < 50 ? 4 : platelets < 100 ? 2 : 0;
      const gluPts = glucose > 250 ? 2 : glucose > 150 ? 1 : 0;
      const phys = sbpPts + hrPts + gcsPts + pupilPts + phPts + pco2Pts + crPts + wbcPts + pltPts + gluPts;
      const sourcePts = source === 'or' ? -0.6 : source === 'ed' ? 0 : source === 'floor' ? 0.35 : 0.55;
      const ageTerm = ageMonths < 1 ? 0.45 : ageMonths < 12 ? 0.2 : ageMonths < 144 ? 0 : -0.15;
      const lp = -5.4 + 0.17 * phys + ageTerm + sourcePts + 0.85 * cancer + 1.15 * arrest;
      const p = logitProb(lp);
      const pct = round(p * 100, 1);
      const r = riskFromThresholds(p, [
        {
          max: 0.05,
          level: 'low',
          label: 'Predicted PICU mortality <5%',
          interpretation: `Educational PRISM IV-style mortality ${pct}%. Low predicted death risk. Physiology subscore ${phys}. Not a substitute for the official CPCCRN PRISM IV calculator.`,
        },
        {
          max: 0.15,
          level: 'moderate',
          label: 'Predicted PICU mortality 5–15%',
          interpretation: `Educational PRISM IV-style mortality ${pct}%. Intermediate band (physiology ${phys}).`,
        },
        {
          max: 0.3,
          level: 'high',
          label: 'Predicted PICU mortality 15–30%',
          interpretation: `Educational PRISM IV-style mortality ${pct}%. High predicted death risk.`,
        },
        {
          max: 1,
          level: 'critical',
          label: 'Predicted PICU mortality ≥30%',
          interpretation: `Educational PRISM IV-style mortality ${pct}%. Critical predicted death risk. Confirm with official PRISM IV / PIM-3.`,
        },
      ]);
      return {
        score: pct,
        unit: '%',
        ...r,
        details: [
          { label: 'Predicted mortality', value: `${pct}%` },
          { label: 'Physiology subscore', value: String(phys) },
          { label: 'Age group / months', value: `${g} / ${ageMonths}` },
          { label: 'Admission source', value: source },
          { label: 'Cancer / arrest', value: `${cancer ? 'yes' : 'no'} / ${arrest ? 'yes' : 'no'}` },
          { label: 'SBP / HR', value: `${sbp} mmHg (${sbpPts} pts) / ${hr} (${hrPts} pts)` },
          { label: 'GCS / pupils', value: `${gcs} (${gcsPts}) / ${pupils} (${pupilPts})` },
          { label: 'pH / PCO2 / Cr', value: `${ph} (${phPts}) / ${pco2} (${pco2Pts}) / ${creatinine} (${crPts})` },
          { label: 'WBC / platelets / glucose', value: `${wbc} (${wbcPts}) / ${platelets} (${pltPts}) / ${glucose} (${gluPts})` },
          { label: 'lp', value: String(round(lp, 3)) },
        ],
        recommendations: ['Use official PRISM IV for benchmarking', 'This educational probability is not for quality-report SMR'],
      };
    },
    evidence: {
      summary:
        'PRISM IV (Pollack 2016) predicts PICU mortality from 4-hour neurologic and non-neurologic PRISM physiology plus age, admission source, cancer, and recent cardiac arrest. This module uses an educational logistic on a documented physiologic subset with slightly different cuts than PRISM III.',
      formula:
        'phys = SBP/HR (age-banded) + GCS<9 (4) + pupils (6/10) + pH + PCO2 + Cr + WBC<3 + platelets + glucose; lp = −5.4 + 0.17·phys + ageTerm + source + 0.85·cancer + 1.15·arrest; p=1/(1+e^−lp).',
      validation:
        'Official PRISM IV was developed in VPS. Educational coefficients here are not the published VPS β-vector — use CPCCRN/VPS tools for calibrated SMR.',
      references: [
        {
          title: 'The Pediatric Risk of Mortality Score: update 2015 (PRISM IV)',
          citation: 'Pollack MM et al. Pediatr Crit Care Med. 2016',
          year: 2016,
          pmid: '26492059',
          doi: '10.1097/PCC.0000000000000558',
        },
      ],
    },
    nextSteps: [
      { condition: 'Predicted mortality ≥15%', actions: ['Confirm official PRISM IV / PIM-3', 'Family update with calibrated numbers only'] },
      { condition: 'Any result', actions: ['Do not submit this educational % to quality dashboards'] },
    ],
    pearls: [
      'PRISM IV uses a 4-hour window (not 12/24-hour PRISM III).',
      'Admission source and cardiac arrest often outweigh modest lab abnormalities.',
      'GCS <9 (not <8) is the educational neurologic cut used here so PRISM IV is not a clone of PRISM III.',
    ],
  },

  // ─── 7. PRAM ───────────────────────────────────────────────────────────────
  {
    id: 'pram',
    name: 'Pediatric Respiratory Assessment Measure',
    shortName: 'PRAM',
    description: 'PRAM 0–12 bedside asthma severity score (suprasternal, scalene, air entry, wheeze, SpO2).',
    category: 'pediatrics',
    tags: ['asthma', 'pram', 'pediatric ed', 'wheeze'],
    whenToUse: 'Children with acute asthma in ED/ward to grade severity and track response to bronchodilators.',
    whyUse: 'Validated 12-point score used in pediatric ED pathways; change in PRAM is a common research and clinical endpoint.',
    inputs: [
      selectInput('retractions', 'Suprasternal retractions', [
        { label: 'Absent', value: 0, points: 0, description: 'No visible indrawing above the sternum or between the SCMs' },
        { label: 'Present', value: 2, points: 2, description: 'Visible indrawing in the suprasternal notch / between the SCMs on inspiration' },
      ], undefined, 'Visible indrawing above the sternum / between the SCMs. Inspect, do not palpate this item.'),
      selectInput('scalene', 'Scalene muscle use', [
        { label: 'Absent', value: 0, points: 0, description: 'No palpable scalene contraction on inspiration' },
        { label: 'Present', value: 2, points: 2, description: 'Palpable scalene contraction in the floor of the lateral neck on inspiration' },
      ], undefined, 'Palpate, do not inspect. Scalenes in the floor of the lateral neck between SCM, trapezius, and clavicle; contraction palpable on inspiration, not visible.'),
      selectInput('airEntry', 'Air entry', [
        { label: 'Normal', value: 0, points: 0, description: 'Equal breath sounds throughout both lungs' },
        { label: 'Decreased at bases', value: 1, points: 1, description: 'Reduced air entry at the bases only; apices preserved' },
        { label: 'Decreased at apex and bases', value: 2, points: 2, description: 'Reduced air entry at both apex and base of the scored lung field' },
        { label: 'Minimal or absent', value: 3, points: 3, description: 'Silent chest or barely audible air entry throughout' },
      ], undefined, 'If asymmetric, score the worst apex–base field.'),
      selectInput('wheeze', 'Wheezing', [
        { label: 'None', value: 0, points: 0, description: 'No wheeze on auscultation' },
        { label: 'Expiratory only', value: 1, points: 1, description: 'Wheeze heard with the stethoscope in expiration only' },
        { label: 'Inspiratory and expiratory', value: 2, points: 2, description: 'Wheeze in both inspiration and expiration with the stethoscope' },
        { label: 'Audible without stethoscope or silent chest with minimal air entry', value: 3, points: 3, description: 'Wheeze heard across the room, OR no wheeze because of extremely poor air movement (score together with air-entry 3)' },
      ], undefined, 'If asymmetric, score the two worst auscultation zones.'),
      selectInput('spo2', 'Oxygen saturation (on room air if feasible)', [
        { label: '≥95%', value: 0, points: 0 },
        { label: '92–94%', value: 1, points: 1 },
        { label: '<92%', value: 2, points: 2 },
      ], undefined, 'Score on room air when safe. Supplemental O2 can mask this component.'),
    ],
    calculate(values) {
      const retractions = num(values.retractions, 0);
      const scalene = num(values.scalene, 0);
      const airEntry = num(values.airEntry, 0);
      const wheeze = num(values.wheeze, 0);
      const spo2 = num(values.spo2, 0);
      const score = retractions + scalene + airEntry + wheeze + spo2;
      const r = riskFromThresholds(score, [
        {
          max: 3,
          level: 'low',
          label: 'Mild PRAM (0–3)',
          interpretation: `PRAM ${score}/12. Mild exacerbation — usually spaced β-agonists, consider dexamethasone, and observe response.`,
        },
        {
          max: 7,
          level: 'moderate',
          label: 'Moderate PRAM (4–7)',
          interpretation: `PRAM ${score}/12. Moderate exacerbation — frequent bronchodilators, systemic steroid, and timed reassessment.`,
        },
        {
          max: 11,
          level: 'high',
          label: 'Severe PRAM (8–11)',
          interpretation: `PRAM ${score}/12. Severe — continuous/hourly β-agonist, ipratropium, steroid, consider magnesium and admission.`,
        },
        {
          max: 12,
          level: 'critical',
          label: 'Impending respiratory failure (12)',
          interpretation: `PRAM ${score}/12. Maximal score — impending respiratory failure; prepare for escalation (NIV/intubation) and PICU.`,
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'Suprasternal', value: String(retractions) },
          { label: 'Scalene', value: String(scalene) },
          { label: 'Air entry', value: String(airEntry) },
          { label: 'Wheeze', value: String(wheeze) },
          { label: 'SpO2 band', value: String(spo2) },
        ],
        recommendations:
          score >= 8
            ? ['Frequent or continuous albuterol', 'Ipratropium', 'Systemic corticosteroid', 'Consider MgSO4']
            : ['Bronchodilator trial', 'Early steroid if PRAM ≥4', 'Re-score after 1–2 hours'],
      };
    },
    evidence: {
      summary:
        'PRAM (Chalut/Ducharme): 0–12 from suprasternal retractions (0/2), scalene use (0/2), air entry (0–3), wheeze (0–3), and SpO2 (≥95=0, 92–94=1, <92=2). Mild 0–3, moderate 4–7, severe 8–12.',
      formula: 'PRAM = retractions + scalene + air entry + wheeze + SpO2 points (max 12)',
      validation: 'Validated in pediatric ED asthma; used as a primary endpoint in multiple RCTs of acute asthma therapy.',
      references: [
        {
          title: 'The Pediatric Respiratory Assessment Measure: a valid clinical score for assessing acute asthma severity from toddlers to teenagers',
          citation: 'Ducharme FM et al. J Pediatr. 2008;152:476-480',
          year: 2008,
          pmid: '18346499',
          doi: '10.1016/j.jpeds.2007.08.034',
        },
      ],
    },
    nextSteps: [
      { condition: 'PRAM ≥8', actions: ['Severe pathway', 'Reassess q15–30 min', 'PICU consult if not improving'] },
      { condition: 'PRAM ≤3 after treatment', actions: ['Discharge planning with action plan and steroid'] },
    ],
    pearls: [
      'Score on room air when safe; supplemental O2 can mask the SpO2 component.',
      'Silent chest with poor air entry is scored as wheeze 3 plus air-entry 3.',
      'A fall of 3 or more points is a commonly cited clinically important improvement.',
    ],
  },

  // ─── 8. WIfI ───────────────────────────────────────────────────────────────
  {
    id: 'wifi-diabetic-foot',
    name: 'SVS WIfI Threatened Limb Classification',
    shortName: 'WIfI',
    description: 'Society for Vascular Surgery Wound, Ischemia, and foot Infection (WIfI) threatened-limb staging.',
    category: 'surgery',
    tags: ['wifi', 'diabetic foot', 'cli', 'amputation', 'ischemia'],
    whenToUse: 'Chronic threatened limb (ulcer, gangrene, or ischemic rest pain), including diabetic foot, to stage amputation risk and revascularization benefit.',
    whyUse: 'Replaces one-dimensional “CLI” with a 3-axis grid that better matches diabetic foot reality (wound + perfusion + infection).',
    inputs: [
      selectInput('wound', 'Wound (W)', [
        { label: '0 — No ulcer, no gangrene (ischemic rest pain only)', value: 0, description: 'Ischemic rest pain without ulcer or gangrene' },
        { label: '1 — Small shallow ulcer; no exposed bone (unless distal phalanx); no gangrene', value: 1, description: 'Shallow ulcer of the distal leg/foot; bone exposure only if limited to the distal phalanx; no gangrene' },
        { label: '2 — Deeper ulcer ± exposed bone/joint/tendon; gangrene limited to digits', value: 2, description: 'Deeper ulcer with exposed bone, joint, or tendon, and/or gangrene confined to digits' },
        { label: '3 — Extensive deep ulcer / forefoot–midfoot gangrene / extensive heel necrosis', value: 3, description: 'Extensive ulcer covering the forefoot or midfoot, or full-thickness heel ulcer with calcaneal involvement, or extensive gangrene' },
      ]),
      selectInput('ischemia', 'Ischemia (I)', [
        { label: '0 — ABI >0.80, toe pressure ≥60 mmHg', value: 0, description: 'Ankle systolic pressure >100 mmHg; TcPO2 ≥60 mmHg. Prefer toe pressure or TcPO2 in diabetes.' },
        { label: '1 — ABI 0.60–0.79, toe pressure 40–59 mmHg', value: 1, description: 'Ankle systolic pressure 70–100 mmHg; TcPO2 40–59 mmHg' },
        { label: '2 — ABI 0.40–0.59, toe pressure 30–39 mmHg', value: 2, description: 'Ankle systolic pressure 50–70 mmHg; TcPO2 30–39 mmHg' },
        { label: '3 — ABI <0.40, toe pressure <30 mmHg', value: 3, description: 'Ankle systolic pressure <50 mmHg; TcPO2 <30 mmHg' },
      ], undefined, 'If ABI and toe pressure/TcPO2 conflict, prefer toe pressure or TcPO2 in diabetes (ABI can be falsely high).'),
      selectInput('infection', 'foot Infection (fI)', [
        { label: '0 — Uninfected', value: 0, description: 'No symptoms or signs of infection' },
        { label: '1 — Mild (skin/subcut only, erythema ≤2 cm)', value: 1, description: 'Local infection involving only skin and subcutaneous tissue; erythema ≤2 cm around the ulcer; no SIRS' },
        { label: '2 — Moderate (deeper or erythema >2 cm)', value: 2, description: 'Erythema >2 cm, or infection deeper than skin/subcut (abscess, osteomyelitis, septic arthritis, fasciitis); no SIRS' },
        { label: '3 — Severe (SIRS / systemic infection)', value: 3, description: 'Local infection PLUS SIRS (≥2 of: T >38 or <36 °C; HR >90; RR >20 or PaCO2 <32 mmHg; WBC >12 or <4 ×10³/µL or >10% bands)' },
      ], undefined, 'IDSA/IWGDF diabetic-foot infection grades mapped to WIfI fI. SIRS defines grade 3 — local extent alone is grade 1–2.'),
    ],
    calculate(values) {
      const wound = num(values.wound, 0);
      const ischemia = num(values.ischemia, 0);
      const infection = num(values.infection, 0);
      const sum = wound + ischemia + infection;
      const stage = wifiClinicalStage(wound, ischemia, infection);
      const stageLabel =
        stage <= 1
          ? 'Stage 1 — very low amputation risk'
          : stage === 2
            ? 'Stage 2 — low amputation risk'
            : stage === 3
              ? 'Stage 3 — moderate amputation risk'
              : stage === 4
                ? 'Stage 4 — high amputation risk'
                : 'Stage 5 — unsalvageable / extreme';
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical';
      if (stage <= 2) riskLevel = 'low';
      else if (stage === 3) riskLevel = 'moderate';
      else if (stage === 4) riskLevel = 'high';
      else riskLevel = 'critical';
      const interpretation =
        stage <= 1
          ? `WIfI clinical stage ${stage} (W${wound}-I${ischemia}-fI${infection}; sum ${sum}). ${stageLabel}. Lower threatened-limb burden — optimize perfusion work-up if rest pain and infection control.`
          : stage === 2
            ? `WIfI clinical stage ${stage} (W${wound}-I${ischemia}-fI${infection}; sum ${sum}). ${stageLabel}. Multidisciplinary diabetic-foot follow-up; optimize offloading and perfusion assessment.`
            : stage === 3
              ? `WIfI clinical stage ${stage} (W${wound}-I${ischemia}-fI${infection}; sum ${sum}). ${stageLabel}. Multidisciplinary diabetic-foot / vascular review; revascularization often considered.`
              : stage === 4
                ? `WIfI clinical stage ${stage} (W${wound}-I${ischemia}-fI${infection}; sum ${sum}). ${stageLabel}. High 1-year amputation risk in SVS consensus — urgent limb-salvage pathway.`
                : `WIfI clinical stage ${stage} (W${wound}-I${ischemia}-fI${infection}; sum ${sum}). ${stageLabel}. Extreme limb threat; salvage vs amputation decision with vascular surgery.`;
      return {
        score: stage,
        label: stageLabel,
        interpretation,
        riskLevel,
        details: [
          { label: 'WIfI code', value: `W${wound}-I${ischemia}-fI${infection}` },
          { label: 'Clinical stage (amputation-risk grid)', value: String(stage) },
          { label: 'W+I+fI sum (0–9)', value: String(sum) },
          { label: 'Wound', value: String(wound) },
          { label: 'Ischemia', value: String(ischemia) },
          { label: 'foot Infection', value: String(infection) },
        ],
        recommendations:
          stage >= 3
            ? ['Vascular imaging', 'Revascularization discussion', 'Infection source control', 'Offloading / wound care']
            : ['Optimize perfusion assessment (toe pressure preferred in diabetes)', 'Podiatry / offloading', 'Treat infection'],
      };
    },
    evidence: {
      summary:
        'SVS WIfI grades Wound 0–3, Ischemia 0–3, and foot Infection 0–3. A published expert grid maps the 64 combinations to clinical stages 1–4 (very low → high 1-year amputation risk); the most extreme W3-I3-fI3 cell is labeled stage 5 here. Displayed score is the clinical stage; the 0–9 sum and WIfI code are in details.',
      formula: 'Clinical stage from Mills 2014 amputation-risk grid (VL=1, L=2, M=3, H=4; W3-I3-fI3 = 5). Sum = W + I + fI (0–9) is shown in details, not used as the live risk band.',
      validation: 'Mills et al. J Vasc Surg 2014; subsequent series correlate stage with amputation, wound healing, and benefit of revascularization.',
      references: [
        {
          title: 'The Society for Vascular Surgery Lower Extremity Threatened Limb Classification System (WIfI)',
          citation: 'Mills JL Sr et al. J Vasc Surg. 2014',
          year: 2014,
          pmid: '24126108',
          doi: '10.1016/j.jvs.2013.08.003',
        },
      ],
    },
    nextSteps: [
      { condition: 'Stage ≥3 or sum ≥5', actions: ['Urgent vascular surgery', 'Revascularization candidacy', 'ID / wound service'] },
      { condition: 'Any diabetic foot ulcer', actions: ['Offloading', 'Glycemic control', 'Repeat WIfI after infection control'] },
    ],
    pearls: [
      'In diabetes, ABI can be falsely high — prefer toe pressure or TcPO2 for the ischemia grade.',
      'WIfI 221 (W2-I2-fI1) is a classic high-risk example (stage 4) even though the integer sum is 5.',
      'Revascularization-benefit stage is a separate published grid from amputation-risk stage.',
    ],
  },

  // ─── 9. HITS IPV ───────────────────────────────────────────────────────────
  {
    id: 'hits-ipv',
    name: 'HITS Intimate Partner Violence Screen',
    shortName: 'HITS',
    description: '4-item HITS screen (Hurt, Insult, Threaten, Scream), each 1–5; score 4–20 with ≥10 positive.',
    category: 'emergency',
    tags: ['ipv', 'hits', 'domestic violence', 'screen', 'primary care'],
    whenToUse: 'Adults in primary care, antenatal clinic, or ED when screening for intimate partner violence.',
    whyUse: 'Brief validated screen; ≥10 suggests IPV and warrants a private, safety-focused assessment.',
    inputs: [
      selectInput('hurt', 'How often does your partner physically Hurt you?', [
        { label: 'Never (1)', value: 1, points: 1, description: 'Not at all' },
        { label: 'Rarely (2)', value: 2, points: 2, description: 'Infrequent' },
        { label: 'Sometimes (3)', value: 3, points: 3, description: 'Occasional' },
        { label: 'Fairly often (4)', value: 4, points: 4, description: 'More often than not' },
        { label: 'Frequently (5)', value: 5, points: 5, description: 'Most or all of the time' },
      ], undefined, 'Ask privately — partner not in the room. Never=1 through Frequently=5 on each stem. Sum ≥10 is a positive screen.'),
      selectInput('insult', 'How often does your partner Insult or talk down to you?', [
        { label: 'Never (1)', value: 1, points: 1 },
        { label: 'Rarely (2)', value: 2, points: 2 },
        { label: 'Sometimes (3)', value: 3, points: 3 },
        { label: 'Fairly often (4)', value: 4, points: 4 },
        { label: 'Frequently (5)', value: 5, points: 5 },
      ]),
      selectInput('threaten', 'How often does your partner Threaten you with harm?', [
        { label: 'Never (1)', value: 1, points: 1 },
        { label: 'Rarely (2)', value: 2, points: 2 },
        { label: 'Sometimes (3)', value: 3, points: 3 },
        { label: 'Fairly often (4)', value: 4, points: 4 },
        { label: 'Frequently (5)', value: 5, points: 5 },
      ]),
      selectInput('scream', 'How often does your partner Scream or curse at you?', [
        { label: 'Never (1)', value: 1, points: 1 },
        { label: 'Rarely (2)', value: 2, points: 2 },
        { label: 'Sometimes (3)', value: 3, points: 3 },
        { label: 'Fairly often (4)', value: 4, points: 4 },
        { label: 'Frequently (5)', value: 5, points: 5 },
      ]),
    ],
    calculate(values) {
      const hurt = num(values.hurt, 1);
      const insult = num(values.insult, 1);
      const threaten = num(values.threaten, 1);
      const scream = num(values.scream, 1);
      const score = hurt + insult + threaten + scream;
      const positive = score >= 10;
      const r = riskFromThresholds(score, [
        {
          max: 9,
          level: 'low',
          label: 'HITS negative (<10)',
          interpretation: `HITS ${score}/20. Below the conventional positive cut-off of 10. A negative screen does not exclude IPV — remain open to disclosure and safety cues.`,
        },
        {
          max: 20,
          level: 'high',
          label: 'HITS positive (≥10)',
          interpretation: `HITS ${score}/20. Positive screen for intimate partner violence. See the patient alone, assess immediate safety, and offer resources. Do not document in a portal the abuser can access without a safety plan.`,
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'Hurt', value: String(hurt) },
          { label: 'Insult', value: String(insult) },
          { label: 'Threaten', value: String(threaten) },
          { label: 'Scream', value: String(scream) },
          { label: 'Screen', value: positive ? 'positive' : 'negative' },
        ],
        recommendations: positive
          ? ['Interview privately', 'Safety assessment', 'Offer hotline / advocacy', 'Follow mandatory-reporting laws']
          : ['Document screen', 'Re-screen when indicators appear'],
      };
    },
    evidence: {
      summary: 'HITS (Sherin 1998) sums four 1–5 frequency items (Hurt, Insult, Threaten, Scream). Range 4–20; ≥10 is the usual positive cut-off in family practice.',
      formula: 'HITS = Hurt + Insult + Threaten + Scream (each 1–5). Positive if ≥10.',
      validation: 'Original family-practice derivation; subsequently used in ED and prenatal settings. Not a diagnostic instrument.',
      references: [
        {
          title: 'HITS: a short domestic violence screening tool for use in a family practice setting',
          citation: 'Sherin KM et al. Fam Med. 1998',
          year: 1998,
          pmid: '9669164',
        },
      ],
    },
    nextSteps: [
      { condition: 'HITS ≥10', actions: ['Private interview', 'Safety planning', 'Local IPV advocacy / 800-799-7233 (US)'] },
      { condition: 'Any disclosure of immediate danger', actions: ['Do not send the patient home to an unsafe setting without a plan', 'Involve social work / security as appropriate'] },
    ],
    pearls: [
      'Never screen for IPV with a partner in the room.',
      'All-never answers score 4 (minimum); all-sometimes scores 12 and is positive.',
      'A “sometimes” pattern on all four items is already above threshold.',
    ],
  },

  // ─── 10. CARG chemo toxicity ───────────────────────────────────────────────
  {
    id: 'carg-chemo',
    name: 'CARG Chemotherapy Toxicity Score',
    shortName: 'CARG',
    description: 'Cancer and Aging Research Group 11-item score (Hurria 2011) for grade 3–5 chemo toxicity in adults ≥65 years.',
    category: 'oncology',
    tags: ['carg', 'geriatric oncology', 'chemotherapy', 'toxicity', 'hurria'],
    whenToUse: 'Adults ≥65 starting a new chemotherapy regimen to estimate risk of grade 3–5 toxicity.',
    whyUse: 'ASCO geriatric-oncology–endorsed tool; outperforms KPS for toxicity prediction in older adults.',
    inputs: [
      yesNo('age72', 'Age ≥72 years', 2),
      yesNo('giGu', 'GI or GU cancer', 2),
      yesNo('standardDose', 'Standard (not reduced) first-cycle dose', 2),
      yesNo('polychemo', 'Polychemotherapy (>1 drug)', 2),
      yesNo('anemia', 'Anemia (Hb <11 g/dL men, <10 g/dL women)', 3),
      yesNo('crclLow', 'Creatinine clearance <34 mL/min', 3),
      yesNo('hearing', 'Hearing fair, poor, or deaf', 2, 'Patient self-report (not an audiogram): fair, poor, or deaf versus excellent/good.'),
      yesNo('falls', '≥1 fall in the past 6 months', 3),
      yesNo('limitedWalk', 'Limited in walking 1 block', 2, 'MOS physical function: cannot walk one block (≈ city block) without limitation.'),
      yesNo('medsHelp', 'Needs assistance taking medications', 1, 'Needs help to take medications correctly (not merely a reminder app).'),
      yesNo('socialDec', 'Decreased social activity because of health', 1, 'Less social activity than previously because of physical or emotional health.'),
    ],
    calculate(values) {
      const age72 = bool(values.age72) ? 2 : 0;
      const giGu = bool(values.giGu) ? 2 : 0;
      const standardDose = bool(values.standardDose) ? 2 : 0;
      const polychemo = bool(values.polychemo) ? 2 : 0;
      const anemia = bool(values.anemia) ? 3 : 0;
      const crclLow = bool(values.crclLow) ? 3 : 0;
      const hearing = bool(values.hearing) ? 2 : 0;
      const falls = bool(values.falls) ? 3 : 0;
      const limitedWalk = bool(values.limitedWalk) ? 2 : 0;
      const medsHelp = bool(values.medsHelp) ? 1 : 0;
      const socialDec = bool(values.socialDec) ? 1 : 0;
      const score = age72 + giGu + standardDose + polychemo + anemia + crclLow + hearing + falls + limitedWalk + medsHelp + socialDec;
      const r = riskFromThresholds(score, [
        {
          max: 5,
          level: 'low',
          label: 'Low CARG (0–5) ~30% G3–5 toxicity',
          interpretation: `CARG ${score}/23. Low-risk band in Hurria 2011 (~30% grade 3–5 toxicity). Still requires geriatric assessment of unmeasured domains.`,
        },
        {
          max: 9,
          level: 'moderate',
          label: 'Intermediate CARG (6–9) ~52% G3–5 toxicity',
          interpretation: `CARG ${score}/23. Intermediate risk (~52% grade 3–5). Consider dose modification, growth-factor support, and closer monitoring.`,
        },
        {
          max: 23,
          level: 'high',
          label: 'High CARG (≥10) ~83% G3–5 toxicity',
          interpretation: `CARG ${score}/23. High risk (~80–83% grade 3–5 toxicity). Strongly consider alternative regimens, primary prophylaxis, and geriatric-oncology co-management.`,
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'Age ≥72', value: String(age72) },
          { label: 'GI/GU cancer', value: String(giGu) },
          { label: 'Standard dose', value: String(standardDose) },
          { label: 'Polychemotherapy', value: String(polychemo) },
          { label: 'Anemia', value: String(anemia) },
          { label: 'CrCl <34', value: String(crclLow) },
          { label: 'Hearing', value: String(hearing) },
          { label: 'Falls', value: String(falls) },
          { label: 'Limited walking 1 block', value: String(limitedWalk) },
          { label: 'Needs help with meds', value: String(medsHelp) },
          { label: 'Decreased social activity', value: String(socialDec) },
        ],
        recommendations:
          score >= 10
            ? ['Geriatric oncology review', 'Discuss toxicity trade-offs', 'Primary G-CSF if myelotoxic']
            : score >= 6
              ? ['Close toxicity monitoring', 'Early growth-factor consideration']
              : ['Standard monitoring', 'Repeat if treatment plan changes'],
      };
    },
    evidence: {
      summary:
        'Hurria 2011 CARG-TT: 11 predictors, score 0–23. Age ≥72 (+2), GI/GU cancer (+2), standard dose (+2), polychemotherapy (+2), anemia (+3), CrCl <34 (+3), hearing (+2), falls (+3), limited 1-block walk (+2), help with meds (+1), decreased social activity (+1). Grade 3–5 toxicity: 30% (0–5), 52% (6–9), 83% (≥10).',
      formula: 'Sum of the 11 weighted items (max 23).',
      validation: 'Prospective multicenter n=500 adults ≥65. Externally validated; recommended in ASCO geriatric oncology guidelines (with CRASH).',
      references: [
        {
          title: 'Predicting chemotherapy toxicity in older adults with cancer: a prospective multicenter study',
          citation: 'Hurria A et al. J Clin Oncol. 2011',
          year: 2011,
          pmid: '21810685',
          doi: '10.1200/JCO.2011.34.7625',
        },
      ],
    },
    nextSteps: [
      { condition: 'CARG ≥10', actions: ['Geriatric assessment', 'Regimen/dose reconsideration', 'Caregiver and fall-prevention plan'] },
      { condition: 'CARG 6–9', actions: ['Enhanced monitoring', 'Prehab / nutrition / pharmacy review'] },
    ],
    pearls: [
      'KPS did not predict toxicity in the derivation cohort — CARG adds geriatric domains KPS misses.',
      'This is the pan-cancer CARG-TT, not the breast-specific CARG-BC (different items).',
      'Age ≥72 (2) + anemia (3) + falls (3) = 8, which is already intermediate risk.',
    ],
  },

  // ─── 11. NHS PREDICT breast (educational) ──────────────────────────────────
  {
    id: 'predict-breast',
    name: 'NHS PREDICT Breast Survival (Educational)',
    shortName: 'PREDICT≈',
    description:
      'Educational Cox-style 5- and 10-year overall survival after breast-cancer surgery. Licensed official tool is predict.nhs.uk — not this approximation.',
    category: 'oncology',
    tags: ['breast cancer', 'predict', 'nhs', 'survival', 'adjuvant'],
    whenToUse: 'Teaching how age, size, grade, nodes, ER/HER2/Ki67, detection mode, and chemo generation shift survival. Not for adjuvant decisions.',
    whyUse: 'Shows direction and rough magnitude of PREDICT inputs. Official PREDICT (v2.2+/v3) must be used for counseling.',
    inputs: [
      numberInput('age', 'Age at diagnosis', { unit: 'years', min: 25, max: 90, defaultValue: 55 }),
      numberInput('sizeMm', 'Tumor size', { unit: 'mm', min: 1, max: 150, defaultValue: 20 }),
      selectInput('grade', 'Histologic grade', [
        { label: 'Grade 1', value: 1, description: 'Well differentiated — Nottingham/Elston–Ellis score 3–5 (tubule formation, mild nuclear pleomorphism, low mitotic count)' },
        { label: 'Grade 2', value: 2, description: 'Moderately differentiated — Nottingham score 6–7' },
        { label: 'Grade 3', value: 3, description: 'Poorly differentiated — Nottingham score 8–9 (little tubule formation, marked nuclear pleomorphism, high mitotic count)' },
      ], undefined, 'Transcribe from the pathology report. If only a Nottingham score is given: 3–5 = grade 1, 6–7 = grade 2, 8–9 = grade 3.'),
      numberInput('nodes', 'Positive axillary nodes', { min: 0, max: 30, defaultValue: 0 }),
      yesNo('erPos', 'ER positive', null),
      yesNo('her2Pos', 'HER2 positive', null),
      selectInput('ki67', 'Ki67', [
        { label: 'Unknown / not used', value: 'unknown', description: 'No Ki67 hazard applied (optional biomarker)' },
        { label: 'Low (<10%)', value: 'low', description: 'Ki67 <10% (PREDICT v2 low band)' },
        { label: 'High (≥10%)', value: 'high', description: 'Ki67 ≥10% (PREDICT v2 high band)' },
      ], undefined, 'Optional PREDICT biomarker. If the lab reports a percent, <10% = low and ≥10% = high.'),
      selectInput('detection', 'Mode of detection', [
        { label: 'Symptomatic', value: 'symptom', description: 'Presented with a lump, pain, nipple change, or other symptom' },
        { label: 'Screen-detected', value: 'screen', description: 'Asymptomatic cancer found on screening mammography' },
      ]),
      selectInput('chemoGen', 'Adjuvant chemotherapy generation', [
        { label: 'None', value: 0, description: 'No adjuvant chemotherapy' },
        { label: '2nd generation (e.g. AC, FEC60)', value: 2, description: 'Anthracycline-based, non-taxane (e.g. AC, FEC60)' },
        { label: '3rd generation (taxane / dose-dense)', value: 3, description: 'Taxane-containing or dose-dense (e.g. FEC-T, TAC, ddAC-T)' },
      ]),
    ],
    calculate(values) {
      const age = num(values.age, 55);
      const sizeMm = num(values.sizeMm, 20);
      const grade = clamp(num(values.grade, 2), 1, 3);
      const nodes = num(values.nodes, 0);
      const erPos = bool(values.erPos) ? 1 : 0;
      const her2Pos = bool(values.her2Pos) ? 1 : 0;
      const ki67 = str(values.ki67, 'unknown');
      const detection = str(values.detection, 'symptom');
      const chemoGen = num(values.chemoGen, 0);
      const kiTerm = ki67 === 'high' ? 0.2 : ki67 === 'low' ? -0.08 : 0;
      const lp =
        0.018 * (age - 55) +
        0.018 * (sizeMm - 20) +
        0.48 * (grade - 1) +
        0.13 * Math.min(nodes, 12) -
        0.55 * erPos +
        0.32 * her2Pos +
        kiTerm +
        (detection === 'screen' ? -0.28 : 0);
      const chemoRr = chemoGen >= 3 ? 0.68 : chemoGen >= 2 ? 0.8 : 1;
      const cancerHaz5 = 0.07 * Math.exp(clamp(lp, -4, 5)) * chemoRr;
      const cancerHaz10 = 0.14 * Math.exp(clamp(lp, -4, 5)) * chemoRr;
      const otherHaz5 = 1 - Math.pow(0.997, Math.max(age - 40, 0) * 5);
      const otherHaz10 = 1 - Math.pow(0.997, Math.max(age - 40, 0) * 10);
      const os5 = clamp((Math.exp(-cancerHaz5) * (1 - otherHaz5 * 0.9)) * 100, 1, 99.5);
      const os10 = clamp((Math.exp(-cancerHaz10) * (1 - otherHaz10 * 0.9)) * 100, 1, 99.5);
      const s10 = round(os10, 1);
      const s5 = round(os5, 1);
      const r = riskFromThresholds(100 - s10, [
        {
          max: 15,
          level: 'low',
          label: 'Educational 10-year OS ≥85%',
          interpretation: `Educational 10-year OS ${s10}% (5-year ${s5}%). Favorable PREDICT-style profile. Use official predict.nhs.uk for decisions.`,
        },
        {
          max: 30,
          level: 'moderate',
          label: 'Educational 10-year OS 70–85%',
          interpretation: `Educational 10-year OS ${s10}% (5-year ${s5}%). Intermediate. Chemo generation and ER/HER2 drive much of the spread — confirm on the official tool.`,
        },
        {
          max: 50,
          level: 'high',
          label: 'Educational 10-year OS 50–70%',
          interpretation: `Educational 10-year OS ${s10}% (5-year ${s5}%). Higher-risk educational estimate.`,
        },
        {
          max: 100,
          level: 'critical',
          label: 'Educational 10-year OS <50%',
          interpretation: `Educational 10-year OS ${s10}% (5-year ${s5}%). Very high-risk educational estimate — official PREDICT required before counseling.`,
        },
      ]);
      return {
        score: s10,
        unit: '%',
        ...r,
        details: [
          { label: '5-year OS (educational)', value: `${s5}%` },
          { label: '10-year OS (educational)', value: `${s10}%` },
          { label: 'Age / size / grade / nodes', value: `${age} y / ${sizeMm} mm / G${grade} / ${nodes} nodes` },
          { label: 'ER / HER2 / Ki67', value: `${erPos ? 'ER+' : 'ER−'} / ${her2Pos ? 'HER2+' : 'HER2−'} / Ki67 ${ki67}` },
          { label: 'Detection / chemo', value: `${detection}, chemo gen ${chemoGen || 'none'}` },
          { label: 'Cancer lp (educational)', value: String(round(lp, 3)) },
        ],
        recommendations: ['Open predict.nhs.uk for official 5-, 10-, and 15-year estimates', 'Do not use this module in MDT minutes'],
      };
    },
    evidence: {
      summary:
        'NHS PREDICT is a licensed Cox model for breast-cancer overall and breast-cancer-specific survival. This educational equation uses the same input list (age, size, grade, nodes, ER, HER2, optional Ki67, mode of detection, chemo generation) with transparent hazards. It is not PREDICT v2/v3.',
      formula:
        'lp = 0.018·(age−55) + 0.018·(size_mm−20) + 0.48·(grade−1) + 0.13·min(nodes,12) − 0.55·ER+ + 0.32·HER2+ + Ki67 + screen(−0.28); chemo RR 0.80/0.68 for 2nd/3rd gen; OS combines cancer hazard with an age competing-risk term.',
      validation: 'Official PREDICT validated in multiple registries (Wishart 2010; PREDICT v2 2017). This clone is for teaching input directionality only.',
      references: [
        {
          title: 'PREDICT: a new UK prognostic model that predicts survival following surgery for invasive breast cancer',
          citation: 'Wishart GC et al. Breast Cancer Res. 2010',
          year: 2010,
          pmid: '20053270',
          doi: '10.1186/bcr2464',
        },
      ],
    },
    nextSteps: [
      { condition: 'Any result', actions: ['Use official predict.nhs.uk', 'Include comorbidity and exact endocrine/anti-HER2 plan there'] },
    ],
    pearls: [
      'Clearly educational — use official PREDICT for decisions.',
      'Screen detection and ER-positivity improve survival; grade, size, nodes, and HER2 worsen it.',
      'Ki67 “unknown” does not apply a Ki67 hazard, matching PREDICT’s optional biomarker.',
    ],
  },

  // ─── 12. Leibovich 2018 RCC ────────────────────────────────────────────────
  {
    id: 'leibovich-2018',
    name: 'Leibovich 2018 ccRCC Progression Score',
    shortName: 'Leibovich 2018',
    description:
      'Integer progression score after nephrectomy for non-metastatic clear-cell RCC using 2018-style T/N/size/grade/necrosis points.',
    category: 'urology',
    tags: ['rcc', 'leibovich', 'kidney cancer', 'ssign', 'nephrectomy'],
    whenToUse: 'After nephrectomy for non-metastatic clear-cell RCC to estimate progression risk and surveillance intensity.',
    whyUse: '2018 Mayo update of the Leibovich/SSIGN family; integer points remain usable at the bedside.',
    inputs: [
      selectInput('tStage', 'Pathologic T stage', [
        { label: 'pT1a', value: 0, points: 0, description: 'Tumor ≤4 cm, limited to kidney' },
        { label: 'pT1b', value: 2, points: 2, description: 'Tumor >4 cm and ≤7 cm, limited to kidney' },
        { label: 'pT2a', value: 3, points: 3, description: 'Tumor >7 cm and ≤10 cm, limited to kidney' },
        { label: 'pT2b', value: 4, points: 4, description: 'Tumor >10 cm, limited to kidney' },
        { label: 'pT3a', value: '3a', points: 4, description: 'Extends into renal vein or perinephric/renal sinus fat, not beyond Gerota' },
        { label: 'pT3b', value: '3b', points: 4, description: 'Grossly extends into IVC below the diaphragm' },
        { label: 'pT3c / pT4', value: 6, points: 6, description: 'IVC above the diaphragm or invades Gerota fascia / adjacent organs' },
      ]),
      selectInput('nStage', 'Pathologic N stage', [
        { label: 'pNx / pN0', value: 0, points: 0, description: 'Nodes not sampled, or no regional node metastasis' },
        { label: 'pN1', value: 2, points: 2, description: 'Metastasis in regional lymph node(s)' },
      ]),
      numberInput('sizeCm', 'Tumor size', {
        unit: 'cm',
        min: 0.5,
        max: 20,
        step: 0.5,
        defaultValue: 4,
        helpText: '+1 if ≥10 cm (Leibovich integer models). Greatest dimension on pathology.',
      }),
      selectInput('grade', 'WHO/ISUP (or Fuhrman) grade', [
        { label: 'Grade 1–2', value: 0, points: 0, description: 'G1: nucleoli absent or inconspicuous at 400×. G2: nucleoli conspicuous and eosinophilic at 400× but not prominent at 100×. Combined 0 points.' },
        { label: 'Grade 3', value: 1, points: 1, description: 'Nucleoli conspicuous and eosinophilic at 100×' },
        { label: 'Grade 4', value: 3, points: 3, description: 'Extreme nuclear pleomorphism and/or tumor giant cells and/or sarcomatoid or rhabdoid differentiation' },
      ], undefined, 'Use WHO/ISUP (Delahunt) nuclear grade from the pathology report. Fuhrman 1–2 / 3 / 4 maps to the same point bands. Score the highest grade in the tumor.'),
      yesNo('necrosis', 'Coagulative tumor necrosis', 2, 'Coagulative tumor necrosis on pathology — not hyalinization, hemorrhage, or treatment effect.'),
    ],
    calculate(values) {
      const tRaw = values.tStage;
      const tPts = tRaw === '3a' || tRaw === '3b' ? 4 : num(tRaw, 0);
      const nPts = num(values.nStage, 0);
      const sizeCm = num(values.sizeCm, 4);
      const sizePts = sizeCm >= 10 ? 1 : 0;
      const gradePts = num(values.grade, 0);
      const necrosis = bool(values.necrosis) ? 2 : 0;
      const score = tPts + nPts + sizePts + gradePts + necrosis;
      const r = riskFromThresholds(score, [
        {
          max: 2,
          level: 'low',
          label: 'Low risk (0–2)',
          interpretation: `Leibovich-style score ${score}. Low progression risk after nephrectomy (classic 0–2 group). Standard surveillance is usually appropriate.`,
        },
        {
          max: 5,
          level: 'moderate',
          label: 'Intermediate risk (3–5)',
          interpretation: `Leibovich-style score ${score}. Intermediate progression risk. Intensify imaging surveillance; adjuvant-therapy trials/options may be discussed.`,
        },
        {
          max: 40,
          level: 'high',
          label: 'High risk (≥6)',
          interpretation: `Leibovich-style score ${score}. High progression risk. Close surveillance and multidisciplinary review for adjuvant immunotherapy/TKI where indicated.`,
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'T points', value: `${tPts} (input ${String(tRaw)})` },
          { label: 'N points', value: String(nPts) },
          { label: 'Size points', value: `${sizePts} (${sizeCm} cm)` },
          { label: 'Grade points', value: String(gradePts) },
          { label: 'Necrosis', value: String(necrosis) },
        ],
        recommendations:
          score >= 6
            ? ['High-intensity surveillance', 'Adjuvant-therapy discussion']
            : score >= 3
              ? ['Intermediate surveillance protocol']
              : ['Standard post-nephrectomy surveillance'],
      };
    },
    evidence: {
      summary:
        'Leibovich 2018 (Eur Urol) updates histology-specific models for PFS/CSS after RCC surgery. This bedside integer uses 2018-style T-stage granularity plus N, size ≥10 cm, grade (1–2 / 3 / 4) and coagulative necrosis (+2), with classic 0–2 / 3–5 / ≥6 risk groups from the Leibovich family.',
      formula: 'pT1a 0, T1b 2, T2a 3, T2b 4, T3a 4, T3b 4, T3c/T4 6; N1 +2; size ≥10 cm +1; grade 3 +1, grade 4 +3; necrosis +2.',
      validation:
        '2018 Mayo models report C-indices ~0.83–0.86 for ccRCC. Integer grouping here is a transparent bedside approximation, not the full histology-specific nomogram.',
      references: [
        {
          title: 'Predicting oncologic outcomes in renal cell carcinoma after surgery',
          citation: 'Leibovich BC et al. Eur Urol. 2018',
          year: 2018,
          pmid: '29398265',
          doi: '10.1016/j.eururo.2018.01.005',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score ≥6', actions: ['GU medical oncology', 'High-intensity imaging', 'Adjuvant-trial eligibility'] },
      { condition: 'Papillary or chromophobe histology', actions: ['Use the histology-specific 2018 tables — this integer is ccRCC-oriented'] },
    ],
    pearls: [
      'Necrosis is coagulative tumor necrosis, not hyalinization or hemorrhage.',
      'pT3a and pT3b share 4 points here; pT3c/T4 is 6.',
      'Full 2018 model also includes symptoms, sarcomatoid features, and thrombus level for CSS — not all are in this integer.',
    ],
  },

  // ─── 13. ACEF II ───────────────────────────────────────────────────────────
  {
    id: 'acef-ii',
    name: 'ACEF II Cardiac Surgery Score',
    shortName: 'ACEF II',
    description:
      'ACEF II (Ranucci 2018): age/LVEF plus creatinine >2 mg/dL, emergency surgery, and anemia (hematocrit <36%).',
    category: 'surgery',
    tags: ['acef', 'cardiac surgery', 'perioperative', 'anemia'],
    whenToUse: 'Patients evaluated for cardiac surgery when a parsimonious operative-mortality index including emergency and anemia is desired.',
    whyUse: 'Updates ACEF (age/EF + Cr>2) with emergency surgery and preoperative anemia, still only five inputs.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 18, max: 100, defaultValue: 70 }),
      numberInput('ef', 'LVEF', { unit: '%', min: 10, max: 80, defaultValue: 50 }),
      numberInput('cr', 'Serum creatinine', { unit: 'mg/dL', min: 0.3, max: 12, step: 0.1, defaultValue: 1, helpText: 'ACEF II adds +2 if creatinine >2 mg/dL.' }),
      yesNo('emergency', 'Emergency surgery', null),
      numberInput('hct', 'Hematocrit', { unit: '%', min: 18, max: 55, defaultValue: 40, helpText: '0.2 points per HCT point below 36%.' }),
    ],
    calculate(values) {
      const age = num(values.age, 70);
      const ef = Math.max(num(values.ef, 50), 5);
      const cr = num(values.cr, 1);
      const emergency = bool(values.emergency);
      const hct = num(values.hct, 40);
      const crAdd = cr > 2 ? 2 : 0;
      const emAdd = emergency ? 3 : 0;
      const anAdd = hct < 36 ? round((36 - hct) * 0.2, 2) : 0;
      const score = round(age / ef + crAdd + emAdd + anAdd, 2);
      const r = riskFromThresholds(score, [
        {
          max: 1.2,
          level: 'low',
          label: 'Lower ACEF II',
          interpretation: `ACEF II ${score}. Lower parsimonious risk band. Still combine with STS/EuroSCORE II for official reporting.`,
        },
        {
          max: 1.8,
          level: 'moderate',
          label: 'Intermediate ACEF II',
          interpretation: `ACEF II ${score}. Intermediate operative-risk band. Optimize hematocrit and renal status when time allows.`,
        },
        {
          max: 3,
          level: 'high',
          label: 'High ACEF II',
          interpretation: `ACEF II ${score}. High predicted operative risk from age/low EF, Cr >2, emergency, and/or anemia.`,
        },
        {
          max: 40,
          level: 'critical',
          label: 'Very high ACEF II',
          interpretation: `ACEF II ${score}. Very high parsimonious risk — heart-team discussion and full STS/EuroSCORE II.`,
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'Age / LVEF', value: `${age} / ${ef} = ${round(age / ef, 2)}` },
          { label: 'Creatinine >2.0 mg/dL', value: crAdd ? `+2 (Cr ${cr})` : `0 (Cr ${cr})` },
          { label: 'Emergency surgery', value: emAdd ? '+3' : '0' },
          { label: 'Anemia (HCT <36%)', value: anAdd ? `+${anAdd} (HCT ${hct}%)` : `0 (HCT ${hct}%)` },
        ],
        recommendations:
          score > 1.8
            ? ['Heart team', 'Optimize anemia/renal status if not truly emergency', 'Document STS/EuroSCORE II']
            : ['Routine preoperative optimization', 'Still compute institutional models'],
      };
    },
    evidence: {
      summary:
        'ACEF II = age(years)/LVEF(%) + 2 if serum creatinine >2.0 mg/dL + 3 if emergency surgery + 0.2 × (36 − HCT) if HCT <36%. Derived in 7,011 cardiac-surgery patients and validated in 1,687.',
      formula: 'ACEF II = age/EF + 2·(Cr>2) + 3·(emergency) + 0.2·max(0, 36−HCT)',
      validation: 'Ranucci et al. Eur Heart J 2018. Discrimination improved vs original ACEF by adding emergency and anemia.',
      references: [
        {
          title: 'The ACEF II Risk Score for cardiac surgery: updated but still parsimonious',
          citation: 'Ranucci M et al. Eur Heart J. 2018',
          year: 2018,
          pmid: '28498904',
          doi: '10.1093/eurheartj/ehx228',
        },
      ],
    },
    nextSteps: [
      { condition: 'ACEF II ≥1.8', actions: ['Multidisciplinary heart team', 'Full STS/EuroSCORE II', 'Treat reversible anemia when feasible'] },
      { condition: 'Emergency', actions: ['Do not delay truly emergency surgery solely to raise HCT'] },
    ],
    pearls: [
      'Original ACEF added only +1 for Cr >2; ACEF II uses +2 and adds emergency (+3) and anemia.',
      'Use EF as a percent (50 not 0.50). Age 70 / EF 50 with normal Cr, elective, HCT 40 = 1.4.',
      'ACEF II is not a replacement for STS when reporting official operative risk.',
    ],
  },

  // ─── 14. SYNTAX II ─────────────────────────────────────────────────────────
  {
    id: 'syntax-ii',
    name: 'SYNTAX Score II (Educational 4-year Mortality)',
    shortName: 'SYNTAX II',
    description:
      'Educational PCI vs CABG 4-year mortality estimates from anatomical SYNTAX plus age, sex, CrCl, LVEF, left main, PAD, COPD, and smoking.',
    category: 'cardiology',
    tags: ['syntax', 'pci', 'cabg', 'revascularization', 'left main'],
    whenToUse: 'Complex CAD (3VD or left main) when the heart team is choosing PCI vs CABG and an educational 4-year death estimate is wanted.',
    whyUse: 'SYNTAX II showed that age, CrCl, LVEF, sex, COPD, PAD and left main modify the PCI vs CABG decision beyond anatomy alone.',
    inputs: [
      numberInput('syntaxScore', 'Anatomical SYNTAX score', { min: 0, max: 60, defaultValue: 22, helpText: 'Enter the official diagram-based anatomical SYNTAX (Sianos/Serruys), not the simplified helper in this file.' }),
      numberInput('age', 'Age', { unit: 'years', min: 30, max: 90, defaultValue: 65 }),
      selectInput('sex', 'Sex', [
        { label: 'Male', value: 'male' },
        { label: 'Female', value: 'female' },
      ]),
      numberInput('crcl', 'Creatinine clearance', { unit: 'mL/min', min: 15, max: 150, defaultValue: 80 }),
      numberInput('lvef', 'LVEF', { unit: '%', min: 15, max: 70, defaultValue: 55 }),
      yesNo('leftMain', 'Unprotected left main disease', null),
      yesNo('pad', 'Peripheral arterial disease', null),
      yesNo('copd', 'COPD', null),
      yesNo('smoker', 'Current smoker', null, 'Included as an educational clinical factor (SYNTAX II 2020 family); 2013 core model omitted smoking.'),
    ],
    calculate(values) {
      const syntaxScore = num(values.syntaxScore, 22);
      const age = num(values.age, 65);
      const female = str(values.sex, 'male') === 'female' ? 1 : 0;
      const crcl = num(values.crcl, 80);
      const lvef = num(values.lvef, 55);
      const leftMain = bool(values.leftMain) ? 1 : 0;
      const pad = bool(values.pad) ? 1 : 0;
      const copd = bool(values.copd) ? 1 : 0;
      const smoker = bool(values.smoker) ? 1 : 0;
      const lpPci =
        0.028 * (age - 65) -
        0.01 * (Math.min(crcl, 90) - 80) -
        0.022 * (Math.min(lvef, 50) - 50) +
        0.018 * (syntaxScore - 22) +
        0.15 * female +
        0.35 * copd +
        0.45 * pad +
        0.12 * leftMain +
        0.28 * smoker;
      const lpCabg =
        0.04 * (age - 65) -
        0.014 * (Math.min(crcl, 90) - 80) -
        0.03 * (Math.min(lvef, 50) - 50) +
        0.006 * (syntaxScore - 22) +
        0.35 * female +
        0.55 * copd +
        0.5 * pad -
        0.12 * leftMain +
        0.22 * smoker;
      const pci4 = round(clamp((1 - Math.exp(-0.045 * Math.exp(clamp(lpPci, -3, 4)))) * 100, 0.5, 60), 1);
      const cabg4 = round(clamp((1 - Math.exp(-0.04 * Math.exp(clamp(lpCabg, -3, 4)))) * 100, 0.5, 60), 1);
      const r = riskFromThresholds(pci4, [
        {
          max: 8,
          level: 'low',
          label: 'Lower educational PCI 4-year mortality',
          interpretation: `Educational PCI 4-year death ${pci4}% vs CABG ${cabg4}%. Anatomy and comorbidities still require a heart-team discussion; use official SYNTAX Score II nomogram for decisions.`,
        },
        {
          max: 15,
          level: 'moderate',
          label: 'Intermediate educational PCI 4-year mortality',
          interpretation: `Educational PCI 4-year death ${pci4}% vs CABG ${cabg4}%. Compare the two estimates and local surgical risk.`,
        },
        {
          max: 25,
          level: 'high',
          label: 'High educational PCI 4-year mortality',
          interpretation: `Educational PCI 4-year death ${pci4}% vs CABG ${cabg4}%. High predicted PCI mortality — CABG often favored unless surgical risk is prohibitive.`,
        },
        {
          max: 100,
          level: 'critical',
          label: 'Very high educational PCI 4-year mortality',
          interpretation: `Educational PCI 4-year death ${pci4}% vs CABG ${cabg4}%. Extreme predicted risk — official SYNTAX II + STS/EuroSCORE required.`,
        },
      ]);
      return {
        score: pci4,
        unit: '%',
        ...r,
        details: [
          { label: 'PCI 4-year mortality (educational)', value: `${pci4}%` },
          { label: 'CABG 4-year mortality (educational)', value: `${cabg4}%` },
          { label: 'Anatomical SYNTAX', value: String(syntaxScore) },
          { label: 'Age / sex / CrCl / LVEF', value: `${age} y, ${female ? 'female' : 'male'}, CrCl ${crcl}, LVEF ${lvef}%` },
          { label: 'Left main / PAD / COPD / smoker', value: `${leftMain ? 'yes' : 'no'} / ${pad ? 'yes' : 'no'} / ${copd ? 'yes' : 'no'} / ${smoker ? 'yes' : 'no'}` },
        ],
        recommendations: ['Heart team with official SYNTAX II nomogram', 'Do not choose PCI vs CABG from this educational pair alone'],
      };
    },
    evidence: {
      summary:
        'SYNTAX Score II (Farooq Lancet 2013) adds age, CrCl, LVEF, ULMCA, PAD, female sex, and COPD to the anatomical SYNTAX score to predict 4-year mortality after PCI vs CABG. This educational Cox uses those inputs (plus smoking) with transparent hazards; displayed score is PCI 4-year mortality %.',
      formula:
        'Separate PCI/CABG linear predictors from age, min(CrCl,90), min(LVEF,50), SYNTAX, female, COPD, PAD, left main, smoker. 4y death ≈ 1−exp(−λ e^lp) with λ_PCI=0.045, λ_CABG=0.040.',
      validation:
        'Original nomogram from SYNTAX trial (n=1,800) with external validation (DELTA). Educational coefficients are not the published nomogram points.',
      references: [
        {
          title: 'Anatomical and clinical characteristics to guide decision making between CABG and PCI: SYNTAX score II',
          citation: 'Farooq V et al. Lancet. 2013',
          year: 2013,
          pmid: '23439103',
          doi: '10.1016/S0140-6736(13)60108-7',
        },
      ],
    },
    nextSteps: [
      { condition: 'PCI estimate much higher than CABG', actions: ['Favor surgical discussion unless comorbidities prohibit CABG'] },
      { condition: 'Any complex CAD', actions: ['Official SYNTAX II calculator + STS/EuroSCORE II', 'Heart-team documentation'] },
    ],
    pearls: [
      'Younger patients, women, and low EF needed lower anatomical SYNTAX for PCI to match CABG in the 2013 nomogram.',
      'COPD and older age shifted the balance toward PCI.',
      'Displayed score is PCI 4-year mortality; CABG estimate is in the details.',
    ],
  },

  // ─── 15. Anatomical SYNTAX (simplified helper) ─────────────────────────────
  {
    id: 'syntax-score',
    name: 'Anatomical SYNTAX Helper (Simplified)',
    shortName: 'SYNTAX≈',
    description:
      'Simplified anatomic SYNTAX-style helper from lesion count and high-weight features. Not the official diagram-based SYNTAX calculator.',
    category: 'cardiology',
    tags: ['syntax', 'coronary anatomy', 'pci', 'cto', 'left main'],
    whenToUse: 'Teaching which angiographic features drive the anatomical SYNTAX score when the official segment diagram is not being scored.',
    whyUse: 'Official SYNTAX needs 16-segment scoring with dominance, bifurcations, and CTO weights. This helper is a transparent weighted checklist.',
    inputs: [
      numberInput('nLesions', 'Number of significant lesions (≥50%)', {
        min: 0,
        max: 12,
        defaultValue: 1,
        helpText: 'Each lesion contributes 2 points in this helper (not official segment weights).',
      }),
      yesNo('leftMain', 'Left main ≥50%', null, 'Helper weight +5 (official LM weights are segment-based and higher).'),
      yesNo('threeVd', 'Three-vessel disease', null),
      yesNo('cto', 'Any chronic total occlusion', null, 'TIMI 0 antegrade flow, presumed duration ≥3 months.'),
      yesNo('bifurcation', 'Any Medina bifurcation lesion', null, 'Medina plaque in main and side branch (any 1.1.1 / 1.1.0 / 1.0.1 / 0.1.1).'),
      yesNo('calcium', 'Heavy calcification', null, 'Multiple persisting opacifications of the vessel wall visible in more than one projection.'),
      yesNo('longLesion', 'Long lesion (>20 mm)', null),
      yesNo('aortoOstial', 'Aorto-ostial lesion', null),
      yesNo('thrombus', 'Thrombus-containing lesion', null, 'Spherical, ovoid, or irregular intraluminal filling defect.'),
      yesNo('tortuosity', 'Severe tortuosity', null, '≥1 bend ≥90° or ≥3 bends of 45–90° proximal to the lesion.'),
    ],
    calculate(values) {
      const nLesions = num(values.nLesions, 1);
      const leftMain = bool(values.leftMain) ? 5 : 0;
      const threeVd = bool(values.threeVd) ? 4 : 0;
      const cto = bool(values.cto) ? 5 : 0;
      const bifurcation = bool(values.bifurcation) ? 2 : 0;
      const calcium = bool(values.calcium) ? 2 : 0;
      const longLesion = bool(values.longLesion) ? 2 : 0;
      const aortoOstial = bool(values.aortoOstial) ? 1 : 0;
      const thrombus = bool(values.thrombus) ? 1 : 0;
      const tortuosity = bool(values.tortuosity) ? 2 : 0;
      const score = nLesions * 2 + leftMain + threeVd + cto + bifurcation + calcium + longLesion + aortoOstial + thrombus + tortuosity;
      const r = riskFromThresholds(score, [
        {
          max: 22,
          level: 'low',
          label: 'Helper score ≤22 (low tertile-style)',
          interpretation: `Simplified anatomic helper ${score}. Low-tertile-style anatomy. Official SYNTAX (Sianos/Serruys diagram) is required for PCI vs CABG decisions.`,
        },
        {
          max: 32,
          level: 'moderate',
          label: 'Helper score 23–32 (intermediate)',
          interpretation: `Simplified anatomic helper ${score}. Intermediate-complexity anatomy. Use the official SYNTAX calculator.`,
        },
        {
          max: 44,
          level: 'high',
          label: 'Helper score 33–44 (high)',
          interpretation: `Simplified anatomic helper ${score}. High-complexity anatomy on this checklist.`,
        },
        {
          max: 99,
          level: 'critical',
          label: 'Helper score ≥45',
          interpretation: `Simplified anatomic helper ${score}. Extreme checklist complexity — official diagram score needed.`,
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'Lesions ×2', value: `${nLesions} × 2 = ${nLesions * 2}` },
          { label: 'Left main', value: String(leftMain) },
          { label: '3VD', value: String(threeVd) },
          { label: 'CTO', value: String(cto) },
          { label: 'Bifurcation', value: String(bifurcation) },
          { label: 'Heavy calcium', value: String(calcium) },
          { label: 'Long lesion', value: String(longLesion) },
          { label: 'Aorto-ostial', value: String(aortoOstial) },
          { label: 'Thrombus', value: String(thrombus) },
          { label: 'Severe tortuosity', value: String(tortuosity) },
        ],
        recommendations: ['Score the official SYNTAX diagram before heart-team decisions', 'This helper is teaching-only'],
      };
    },
    evidence: {
      summary:
        'Official anatomical SYNTAX (Sianos 2005; Serruys SYNTAX trial) scores each lesion by segment, dominance, and adverse features (CTO, bifurcation, calcium, length, ostial, thrombus, tortuosity). This module is a simplified weighted helper (lesions×2 + LM 5 + 3VD 4 + CTO 5 + bifurcation 2 + calcium 2 + long 2 + ostial 1 + thrombus 1 + tortuosity 2), not the official calculator.',
      formula: 'helper = 2·n_lesions + 5·LM + 4·3VD + 5·CTO + 2·bifurcation + 2·calcium + 2·long + 1·ostial + 1·thrombus + 2·tortuosity',
      validation: 'Official SYNTAX tertiles (≤22 / 23–32 / ≥33) predicted PCI vs CABG outcomes in the SYNTAX trial. Helper tertile cut-points are analogical only.',
      references: [
        {
          title: 'The SYNTAX Score: an angiographic tool grading the complexity of coronary artery disease',
          citation: 'Sianos G et al. EuroIntervention. 2005;1:219-227',
          year: 2005,
          pmid: '19758907',
        },
      ],
    },
    nextSteps: [
      { condition: 'Helper ≥23 or left main / 3VD', actions: ['Complete official SYNTAX scoring', 'Heart team'] },
    ],
    pearls: [
      'Not the official SYNTAX calculator — that requires a coronary diagram and dominance.',
      'CTO and left main dominate both the official score and this helper.',
      'Use SYNTAX II once a true anatomical score is available.',
    ],
  },

  // ─── 16. ISTH-SSC BAT (full domain scorer) ─────────────────────────────────
  {
    id: 'isth-ssc-bat',
    name: 'ISTH-SSC Bleeding Assessment Tool (14 domains)',
    shortName: 'ISTH-SSC BAT',
    description:
      'Full ISTH-SSC Bleeding Assessment Tool summing 14 domains (0–4 each). Abnormal: ≥4 in adult men, ≥6 in adult women. Distinct from the total-only interpreter `isth-bat`.',
    category: 'hematology',
    tags: ['isth', 'bat', 'bleeding', 'vwd', 'hemostasis'],
    whenToUse: 'When scoring a mucocutaneous/surgical bleeding history for possible mild bleeding disorder (VWD, platelet function disorder).',
    whyUse: 'Standardized ISTH-SSC BAT domains; this module sums them rather than only interpreting a pre-computed total.',
    inputs: [
      selectInput('sex', 'Patient sex (cutoff)', [
        { label: 'Adult male (positive ≥4)', value: 'male' },
        { label: 'Adult female (positive ≥6)', value: 'female' },
      ], undefined, 'Score worst lifetime episode before diagnosis; 0 if never challenged. Consultation only = sought evaluation/specialist/labs. Children <18 y: published positive cutoff ≥3 (Elbatarny) — this form still applies adult male/female cutoffs.'),
      selectInput('epistaxis', 'Epistaxis', [
        { label: '0 — None / trivial', value: 0, points: 0, description: 'No or trivial (≤5 episodes/year)' },
        { label: '1 — Frequent or prolonged', value: 1, points: 1, description: '>5/year or lasting >10 minutes' },
        { label: '2 — Consultation only', value: 2, points: 2, description: 'Sought medical evaluation; no packing/cautery/drugs' },
        { label: '3 — Packing / cautery / antifibrinolytic', value: 3, points: 3, description: 'Packing, cauterization, or antifibrinolytic therapy' },
        { label: '4 — Transfusion / replacement / DDAVP', value: 4, points: 4, description: 'Blood transfusion, replacement (hemostatic components/rFVIIa), or desmopressin' },
      ]),
      selectInput('cutaneous', 'Cutaneous (bruising / purpura)', [
        { label: '0 — None / trivial', value: 0, points: 0, description: 'No or trivial bruising' },
        { label: '1 — ≥5 bruises >1 cm in exposed areas', value: 1, points: 1, description: 'Five or more bruises >1 cm in exposed areas' },
        { label: '2 — Consultation only', value: 2, points: 2, description: 'Sought medical evaluation for bruising' },
        { label: '3 — Extensive', value: 3, points: 3, description: 'Extensive cutaneous bleeding' },
        { label: '4 — Spontaneous hematoma needing transfusion', value: 4, points: 4, description: 'Spontaneous hematoma requiring blood transfusion' },
      ]),
      selectInput('minorWounds', 'Bleeding from minor wounds', [
        { label: '0 — None / trivial', value: 0, points: 0, description: 'No or trivial (≤5/year)' },
        { label: '1 — Frequent or prolonged', value: 1, points: 1, description: '>5/year or lasting >10 minutes' },
        { label: '2 — Consultation only', value: 2, points: 2, description: 'Sought medical evaluation; no surgical hemostasis' },
        { label: '3 — Surgical hemostasis', value: 3, points: 3, description: 'Surgical hemostasis required' },
        { label: '4 — Transfusion / replacement / DDAVP', value: 4, points: 4, description: 'Blood transfusion, replacement therapy, or desmopressin' },
      ]),
      selectInput('oralCavity', 'Oral cavity bleeding', [
        { label: '0 — None / trivial', value: 0, points: 0, description: 'No or trivial' },
        { label: '1 — Present', value: 1, points: 1, description: 'Gum bleeding at least once, or bleeds from bites to lips/tongue' },
        { label: '2 — Consultation only', value: 2, points: 2, description: 'Sought medical evaluation' },
        { label: '3 — Surgical hemostasis or antifibrinolytic', value: 3, points: 3, description: 'Surgical hemostasis or antifibrinolytic therapy' },
        { label: '4 — Transfusion / replacement / DDAVP', value: 4, points: 4, description: 'Blood transfusion, replacement therapy, or desmopressin' },
      ]),
      selectInput('gi', 'GI bleeding', [
        { label: '0 — None / trivial', value: 0, points: 0, description: 'No or trivial' },
        { label: '1 — Spontaneous (not ulcer/PHTN/hemorrhoids/angiodysplasia)', value: 1, points: 1, description: 'Present and not associated with ulcer, portal hypertension, hemorrhoids, or angiodysplasia' },
        { label: '2 — Consultation only', value: 2, points: 2, description: 'Sought medical evaluation' },
        { label: '3 — Surgical hemostasis or antifibrinolytic', value: 3, points: 3, description: 'Surgical hemostasis or antifibrinolytic therapy' },
        { label: '4 — Transfusion / replacement / DDAVP', value: 4, points: 4, description: 'Blood transfusion, replacement therapy, or desmopressin' },
      ]),
      selectInput('hematuria', 'Hematuria', [
        { label: '0 — None / trivial', value: 0, points: 0, description: 'No or trivial' },
        { label: '1 — Present', value: 1, points: 1, description: 'Macroscopic hematuria present' },
        { label: '2 — Consultation only', value: 2, points: 2, description: 'Sought medical evaluation' },
        { label: '3 — Surgical hemostasis or iron therapy', value: 3, points: 3, description: 'Surgical hemostasis or iron therapy' },
        { label: '4 — Transfusion / replacement / DDAVP', value: 4, points: 4, description: 'Blood transfusion, replacement therapy, or desmopressin' },
      ]),
      selectInput('toothExtraction', 'Tooth extraction', [
        { label: '0 — None / not applicable / no bleeding', value: 0, points: 0, description: 'None done, or no bleeding in procedures performed' },
        { label: '1 — <25% of procedures, no intervention', value: 1, points: 1, description: 'Bleeding reported in <25% of extractions; no intervention' },
        { label: '2 — >25% of procedures, no intervention', value: 2, points: 2, description: 'Bleeding reported in >25% of extractions; no intervention' },
        { label: '3 — Resuturing or packing', value: 3, points: 3, description: 'Resuturing or packing required' },
        { label: '4 — Transfusion / replacement / DDAVP', value: 4, points: 4, description: 'Blood transfusion, replacement therapy, or desmopressin' },
      ]),
      selectInput('surgery', 'Surgery', [
        { label: '0 — None / not applicable / no bleeding', value: 0, points: 0, description: 'None done, or no bleeding in procedures performed' },
        { label: '1 — <25% of procedures, no intervention', value: 1, points: 1, description: 'Bleeding reported in <25% of surgeries; no intervention' },
        { label: '2 — >25% of procedures, no intervention', value: 2, points: 2, description: 'Bleeding reported in >25% of surgeries; no intervention' },
        { label: '3 — Surgical hemostasis or antifibrinolytic', value: 3, points: 3, description: 'Surgical hemostasis or antifibrinolytics' },
        { label: '4 — Transfusion / replacement / DDAVP', value: 4, points: 4, description: 'Blood transfusion, replacement therapy, or desmopressin' },
      ]),
      selectInput('menorrhagia', 'Menorrhagia (0 if not applicable)', [
        { label: '0 — None / not applicable', value: 0, points: 0, description: 'No menorrhagia, male patient, or not applicable' },
        { label: '1 — Consultation / pads q2h / PBAC >100', value: 1, points: 1, description: 'Consultation only, changing pads more often than every 2 h, clot and flooding, or PBAC >100' },
        { label: '2 — Time off work/school or single-agent therapy', value: 2, points: 2, description: 'Time off work/school >2/year, or requiring antifibrinolytics or hormonal or iron therapy' },
        { label: '3 — Combined hormones + antifibrinolytic or from menarche >12 mo', value: 3, points: 3, description: 'Combined antifibrinolytic + hormonal therapy, or present since menarche and >12 months' },
        { label: '4 — Acute D&C / hysterectomy / transfusion', value: 4, points: 4, description: 'Hospital admission, transfusion/replacement/DDAVP, D&C, endometrial ablation, or hysterectomy' },
      ]),
      selectInput('postpartum', 'Post-partum hemorrhage (0 if not applicable)', [
        { label: '0 — None / not applicable', value: 0, points: 0, description: 'No deliveries, no PPH, or not applicable' },
        { label: '1 — Consultation / oxytocin / lochia >6 weeks', value: 1, points: 1, description: 'Consultation only, treated with oxytocin, or lochia >6 weeks' },
        { label: '2 — Antifibrinolytic or iron therapy', value: 2, points: 2, description: 'Treated with antifibrinolytic or iron therapy' },
        { label: '3 — Transfusion / DDAVP / balloon / EUA', value: 3, points: 3, description: 'Transfusion, replacement, desmopressin, exam under anesthesia, or uterine balloon' },
        { label: '4 — Critical care or surgery', value: 4, points: 4, description: 'ICU, hysterectomy, iliac-artery ligation, uterine-artery embolization, or uterine brace' },
      ]),
      selectInput('muscle', 'Muscle hematomas', [
        { label: '0 — Never', value: 0, points: 0, description: 'Never' },
        { label: '1 — Post-trauma, no treatment', value: 1, points: 1, description: 'Post-trauma; no therapy required' },
        { label: '2 — Spontaneous, no treatment', value: 2, points: 2, description: 'Spontaneous onset; no therapy required' },
        { label: '3 — Required DDAVP or replacement', value: 3, points: 3, description: 'Spontaneous or traumatic, requiring desmopressin or replacement therapy' },
        { label: '4 — Transfusion or surgery', value: 4, points: 4, description: 'Spontaneous or traumatic, requiring blood transfusion or surgical intervention' },
      ]),
      selectInput('joint', 'Hemarthrosis', [
        { label: '0 — Never', value: 0, points: 0, description: 'Never' },
        { label: '1 — Post-trauma, no treatment', value: 1, points: 1, description: 'Post-trauma; no therapy required' },
        { label: '2 — Spontaneous, no treatment', value: 2, points: 2, description: 'Spontaneous onset; no therapy required' },
        { label: '3 — Required DDAVP or replacement', value: 3, points: 3, description: 'Spontaneous or traumatic, requiring desmopressin or replacement therapy' },
        { label: '4 — Transfusion or surgery', value: 4, points: 4, description: 'Spontaneous or traumatic, requiring blood transfusion or surgical intervention' },
      ]),
      selectInput('cns', 'CNS bleeding', [
        { label: '0 — Never', value: 0, points: 0, description: 'Never. Official ISTH CNS scoring uses 0, 3, or 4 only' },
        { label: '1 — Not used officially', value: 1, points: 1, description: 'Not used in official ISTH CNS scoring — choose 0, 3 (subdural), or 4 (intracerebral)' },
        { label: '2 — Not used officially', value: 2, points: 2, description: 'Not used in official ISTH CNS scoring — choose 0, 3 (subdural), or 4 (intracerebral)' },
        { label: '3 — Subdural, any intervention', value: 3, points: 3, description: 'Subdural hematoma, any intervention' },
        { label: '4 — Intracerebral, any intervention', value: 4, points: 4, description: 'Intracerebral hemorrhage, any intervention' },
      ], undefined, 'Official ISTH-SSC BAT scores CNS as 0 / 3 / 4 only (no 1 or 2).'),
      selectInput('other', 'Other bleeding', [
        { label: '0 — None / trivial', value: 0, points: 0, description: 'No or trivial' },
        { label: '1 — Present', value: 1, points: 1, description: 'Umbilical stump, cephalohematoma, conjunctival, venipuncture, or circumcision bleeding present' },
        { label: '2 — Consultation only', value: 2, points: 2, description: 'Sought medical evaluation' },
        { label: '3 — Surgical hemostasis or antifibrinolytic', value: 3, points: 3, description: 'Surgical hemostasis or antifibrinolytics' },
        { label: '4 — Transfusion / replacement / DDAVP', value: 4, points: 4, description: 'Blood transfusion, replacement therapy, or desmopressin' },
      ], undefined, 'Includes umbilical stump, cephalohematoma, conjunctival hemorrhage, excessive bleeding after venipuncture or circumcision.'),
    ],
    calculate(values) {
      const sex = str(values.sex, 'male');
      const epistaxis = num(values.epistaxis, 0);
      const cutaneous = num(values.cutaneous, 0);
      const minorWounds = num(values.minorWounds, 0);
      const oralCavity = num(values.oralCavity, 0);
      const gi = num(values.gi, 0);
      const hematuria = num(values.hematuria, 0);
      const toothExtraction = num(values.toothExtraction, 0);
      const surgery = num(values.surgery, 0);
      const menorrhagia = num(values.menorrhagia, 0);
      const postpartum = num(values.postpartum, 0);
      const muscle = num(values.muscle, 0);
      const joint = num(values.joint, 0);
      const cns = num(values.cns, 0);
      const other = num(values.other, 0);
      const score =
        epistaxis +
        cutaneous +
        minorWounds +
        oralCavity +
        gi +
        hematuria +
        toothExtraction +
        surgery +
        menorrhagia +
        postpartum +
        muscle +
        joint +
        cns +
        other;
      const cut = sex === 'female' ? 6 : 4;
      const positive = score >= cut;
      return {
        score,
        label: positive ? `Abnormal ISTH-SSC BAT (≥${cut} for this sex)` : `Normal range (0–${cut - 1} for this sex)`,
        interpretation: positive
          ? `ISTH-SSC BAT ${score} is ≥ ${cut} for ${sex === 'female' ? 'adult women' : 'adult men'}. Increased likelihood of an underlying mild bleeding disorder — pursue directed hemostasis labs. Score is not a diagnosis.`
          : `ISTH-SSC BAT ${score} is within the reported normal range for ${sex === 'female' ? 'adult women' : 'adult men'} (cutoff ≥${cut}). A low score does not exclude a bleeding disorder before major challenge.`,
        riskLevel: positive ? 'high' : 'low',
        details: [
          { label: 'Sex / cutoff', value: `${sex} (≥${cut})` },
          { label: 'Epistaxis', value: String(epistaxis) },
          { label: 'Cutaneous', value: String(cutaneous) },
          { label: 'Minor wounds', value: String(minorWounds) },
          { label: 'Oral cavity', value: String(oralCavity) },
          { label: 'GI', value: String(gi) },
          { label: 'Hematuria', value: String(hematuria) },
          { label: 'Tooth extraction', value: String(toothExtraction) },
          { label: 'Surgery', value: String(surgery) },
          { label: 'Menorrhagia', value: String(menorrhagia) },
          { label: 'Post-partum', value: String(postpartum) },
          { label: 'Muscle', value: String(muscle) },
          { label: 'Joint', value: String(joint) },
          { label: 'CNS', value: String(cns) },
          { label: 'Other', value: String(other) },
        ],
        recommendations: positive
          ? ['CBC, PT/aPTT, fibrinogen', 'VWF antigen/activity', 'Hematology referral']
          : ['Re-score after new hemostatic challenges', 'Still test if family history is strong'],
      };
    },
    evidence: {
      summary:
        'ISTH-SSC BAT scores 14 domains 0–4 (epistaxis, cutaneous, minor wounds, oral cavity, GI, hematuria, tooth extraction, surgery, menorrhagia, postpartum, muscle, joint, CNS, other). Abnormal: adult men ≥4, adult women ≥6, children ≥3. Each domain’s official descriptors are more specific than this 0–4 helper — use the ISTH worksheet for publication-grade scoring.',
      formula: 'Sum of 14 domain scores (0–4). Positive if ≥4 (men) or ≥6 (women).',
      validation: 'ISTH-SSC BAT; normal ranges from Elbatarny et al. and subsequent pediatric data.',
      references: [
        {
          title: 'ISTH/SSC bleeding assessment tool: a standardized questionnaire and a proposal for a new bleeding score for inherited bleeding disorders',
          citation: 'Rodeghiero F et al. J Thromb Haemost. 2010',
          year: 2010,
          pmid: '20626619',
          doi: '10.1111/j.1538-7836.2010.03975.x',
        },
        {
          title: 'Normal range of bleeding scores for the ISTH-BAT: adult and pediatric data',
          citation: 'Elbatarny M et al. Haemophilia. 2014',
          year: 2014,
          pmid: '25196510',
          doi: '10.1111/hae.12503',
        },
      ],
    },
    nextSteps: [
      { condition: 'Positive score', actions: ['Hemostasis laboratory panel', 'Hematology referral', 'Avoid empiric invasive procedures without a plan'] },
      { condition: 'Male score 4 from few 1-point domains', actions: ['Still positive by adult-male cutoff — do not dismiss as “only 1s”'] },
    ],
    pearls: [
      'Companion calculator `isth-bat` only interprets a pre-summed total; this module scores the 14 domains.',
      'Menorrhagia and postpartum are scored 0 when not applicable (males, nulliparous).',
      'Four domains of 1 in a man already meet the ≥4 abnormal threshold.',
      'CNS is officially 0 / 3 (subdural) / 4 (intracerebral) only — do not use 1 or 2.',
      'Pediatric positive cutoff is ≥3; this UI still applies adult male ≥4 / female ≥6 cutoffs.',
    ],
  },
];
