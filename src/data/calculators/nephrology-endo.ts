import type { Calculator } from '../../types/calculator';
import { num, round, selectInput, numberInput, riskFromThresholds } from '../../utils/helpers';

export const nephrologyEndoCalcs: Calculator[] = [
  {
    id: 'cockcroft-gault',
    name: 'Cockcroft-Gault CrCl',
    shortName: 'CrCl (C-G)',
    description: 'Estimates creatinine clearance for drug dosing.',
    category: 'nephrology',
    tags: ['gfr', 'renal', 'dosing'],
    whenToUse: 'Drug dosing adjustments based on renal function.',
    whyUse: 'Still used in many FDA drug labels despite CKD-EPI for staging.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 18, max: 110, defaultValue: 60 }),
      numberInput('weight', 'Weight', { unit: 'kg', min: 20, max: 300, defaultValue: 70 }),
      numberInput('scr', 'Serum creatinine', { unit: 'mg/dL', min: 0.1, max: 20, step: 0.1, defaultValue: 1.0 }),
      selectInput('sex', 'Sex', [
        { label: 'Male', value: 1 },
        { label: 'Female (×0.85)', value: 0.85 },
      ]),
    ],
    calculate(values) {
      const age = num(values.age, 60);
      const wt = num(values.weight, 70);
      const scr = num(values.scr, 1);
      const sex = num(values.sex, 1);
      const crcl = round(((140 - age) * wt * sex) / (72 * scr), 1);
      const r = riskFromThresholds(crcl, [
        { max: 29, level: 'high', label: 'Severely reduced', interpretation: 'CrCl <30: major dose adjustments / avoid nephrotoxic drugs.' },
        { max: 59, level: 'moderate', label: 'Moderately reduced', interpretation: 'CrCl 30–59: adjust renally cleared medications.' },
        { max: 89, level: 'low', label: 'Mildly reduced / low-normal', interpretation: 'Mild reduction possible; check drug-specific cutoffs.' },
        { max: 300, level: 'normal', label: 'Normal / high', interpretation: 'Generally normal clearance for dosing in most contexts.' },
      ]);
      return { score: crcl, unit: 'mL/min', ...r, details: [{ label: 'Formula', value: '((140−age)×wt×sex)/(72×SCr)' }] };
    },
    evidence: {
      summary: 'Cockcroft-Gault estimates CrCl from age, weight, SCr, and sex.',
      formula: 'CrCl = (140−age) × weight(kg) × (0.85 if female) / (72 × SCr)',
      validation: 'Derived 1976; still used for dosing. Over/underestimates in extremes of muscle mass.',
      references: [{ title: 'Prediction of creatinine clearance from serum creatinine', citation: 'Cockcroft DW, Gault MH. Nephron. 1976', year: 1976, pmid: '1244564',
          doi: '10.1159/000180580', }],
    },
    nextSteps: [
      { condition: 'Reduced CrCl', actions: ['Adjust renally cleared drugs', 'Avoid nephrotoxins when possible', 'Consider CKD-EPI for staging'] },
    ],
  },
  {
    id: 'ckd-epi',
    name: 'CKD-EPI Creatinine eGFR (2021)',
    shortName: 'CKD-EPI eGFR',
    description: 'Estimates GFR from creatinine using 2021 race-free CKD-EPI equation.',
    category: 'nephrology',
    tags: ['gfr', 'ckd', 'egfr'],
    whenToUse: 'CKD detection, staging, and monitoring.',
    whyUse: 'Preferred equation in current KDIGO/NKF guidance (2021 race-free).',
    inputs: [
      numberInput('scr', 'Serum creatinine', { unit: 'mg/dL', min: 0.1, max: 20, step: 0.1, defaultValue: 1.0 }),
      numberInput('age', 'Age', { unit: 'years', min: 18, max: 110, defaultValue: 50 }),
      selectInput('sex', 'Sex', [
        { label: 'Female', value: 'F' },
        { label: 'Male', value: 'M' },
      ]),
    ],
    calculate(values) {
      const scr = num(values.scr, 1);
      const age = num(values.age, 50);
      const female = values.sex === 'F';
      const kappa = female ? 0.7 : 0.9;
      const alpha = female ? -0.241 : -0.302;
      const minRatio = Math.min(scr / kappa, 1);
      const maxRatio = Math.max(scr / kappa, 1);
      let egfr = 142 * minRatio ** alpha * maxRatio ** -1.2 * 0.9938 ** age;
      if (female) egfr *= 1.012;
      egfr = round(egfr, 0);
      let stage = 'G1';
      let riskLevel: 'normal' | 'low' | 'moderate' | 'high' | 'critical' = 'normal';
      if (egfr >= 90) {
        stage = 'G1';
        riskLevel = 'normal';
      } else if (egfr >= 60) {
        stage = 'G2';
        riskLevel = 'low';
      } else if (egfr >= 45) {
        stage = 'G3a';
        riskLevel = 'moderate';
      } else if (egfr >= 30) {
        stage = 'G3b';
        riskLevel = 'moderate';
      } else if (egfr >= 15) {
        stage = 'G4';
        riskLevel = 'high';
      } else {
        stage = 'G5';
        riskLevel = 'critical';
      }
      return {
        score: egfr,
        unit: 'mL/min/1.73m²',
        label: `CKD stage ${stage}`,
        interpretation: `eGFR ${egfr}. Stage ${stage} (albuminuria needed for full CGA staging).`,
        riskLevel,
      };
    },
    evidence: {
      summary: '2021 CKD-EPI creatinine equation removes race coefficient.',
      formula: '142 × min(SCr/κ,1)^α × max(SCr/κ,1)^−1.200 × 0.9938^Age × (1.012 if female)',
      validation: 'Developed on diverse cohorts; endorsed by NKF-ASN task force.',
      references: [{ title: 'New Creatinine- and Cystatin C–Based Equations to Estimate GFR without Race', citation: 'Inker LA et al. N Engl J Med. 2021', year: 2021, pmid: '34554658',
          doi: '10.1056/NEJMoa2102953', }],
    },
    nextSteps: [
      { condition: 'eGFR <60', actions: ['Confirm chronicity', 'Urine ACR', 'Med review', 'BP/glucose control'] },
      { condition: 'eGFR <30', actions: ['Nephrology referral', 'Prepare for RRT education if progressive'] },
    ],
  },
  {
    id: 'mdrd',
    name: 'MDRD eGFR (4-variable)',
    shortName: 'MDRD',
    description: 'Historical 4-variable MDRD estimated GFR.',
    category: 'nephrology',
    tags: ['gfr', 'mdrd'],
    whenToUse: 'Legacy reports; prefer CKD-EPI for new estimates.',
    whyUse: 'Still appears on older lab reports.',
    inputs: [
      numberInput('scr', 'Serum creatinine', { unit: 'mg/dL', min: 0.1, max: 20, step: 0.1, defaultValue: 1.0 }),
      numberInput('age', 'Age', { unit: 'years', min: 18, max: 110, defaultValue: 50 }),
      selectInput('sex', 'Sex', [
        { label: 'Male', value: 1 },
        { label: 'Female', value: 0.742 },
      ]),
      selectInput('race', 'Race factor (legacy)', [
        { label: 'Non-Black', value: 1 },
        { label: 'Black (legacy ×1.212)', value: 1.212 },
      ]),
    ],
    calculate(values) {
      const scr = num(values.scr, 1);
      const age = num(values.age, 50);
      const sex = num(values.sex, 1);
      const race = num(values.race, 1);
      const egfr = round(175 * scr ** -1.154 * age ** -0.203 * sex * race, 0);
      return {
        score: egfr,
        unit: 'mL/min/1.73m²',
        label: 'MDRD eGFR',
        interpretation: 'Legacy equation. Prefer 2021 CKD-EPI without race for clinical use.',
        riskLevel: egfr < 60 ? 'moderate' : 'normal',
      };
    },
    evidence: {
      summary: 'MDRD study equation; less accurate than CKD-EPI at higher GFR.',
      references: [{ title: 'A more accurate method to estimate GFR from serum creatinine', citation: 'Levey AS et al. Ann Intern Med. 1999', year: 1999, pmid: '10075613',
          doi: '10.7326/0003-4819-130-6-199903160-00002', }],
      validation: 'Widely used historically; race coefficient no longer recommended.',
    },
    nextSteps: [{ condition: 'Any', actions: ['Prefer CKD-EPI 2021 for staging'] }],
  },
  {
    id: 'fena',
    name: 'Fractional Excretion of Sodium (FENa)',
    shortName: 'FENa',
    description: 'Helps differentiate prerenal azotemia from acute tubular necrosis.',
    category: 'nephrology',
    tags: ['aki', 'fena', 'sodium'],
    whenToUse: 'Oliguric AKI when patient not on diuretics.',
    whyUse: 'Classic tool; limited if diuretics used (prefer FeUrea).',
    inputs: [
      numberInput('pna', 'Plasma Na', { unit: 'mEq/L', min: 100, max: 180, defaultValue: 140 }),
      numberInput('una', 'Urine Na', { unit: 'mEq/L', min: 1, max: 300, defaultValue: 20 }),
      numberInput('pcr', 'Plasma creatinine', { unit: 'mg/dL', min: 0.1, max: 20, step: 0.1, defaultValue: 2.0 }),
      numberInput('ucr', 'Urine creatinine', { unit: 'mg/dL', min: 1, max: 500, defaultValue: 100 }),
    ],
    calculate(values) {
      const pna = num(values.pna, 140);
      const una = num(values.una, 20);
      const pcr = num(values.pcr, 2);
      const ucr = num(values.ucr, 100);
      const fena = round(((una * pcr) / (pna * ucr)) * 100, 2);
      let label = 'Indeterminate';
      let interpretation = 'FENa 1–2%: indeterminate; integrate clinical context.';
      let riskLevel: 'low' | 'moderate' | 'info' = 'info';
      if (fena < 1) {
        label = 'Suggests prerenal';
        interpretation = 'FENa <1% suggests prerenal physiology (or other Na-avid states).';
        riskLevel = 'low';
      } else if (fena > 2) {
        label = 'Suggests ATN / intrinsic';
        interpretation = 'FENa >2% suggests ATN or other intrinsic renal injury (or salt wasting).';
        riskLevel = 'moderate';
      }
      return { score: fena, unit: '%', label, interpretation, riskLevel };
    },
    evidence: {
      summary: 'FENa = (UNa×PCr)/(PNa×UCr)×100. <1% prerenal, >2% ATN in oliguric AKI without diuretics.',
      validation: 'Classic teaching; many exceptions (contrast, rhabdo, contrast nephropathy, CKD, diuretics).',
      references: [{ title: 'Urinary sodium and diagnostic indices in acute renal failure', citation: 'Espinel CH. JAMA. 1976', year: 1976, pmid: '947239',
          doi: '10.1001/jama.236.6.579', }],
    },
    nextSteps: [
      { condition: 'Prerenal pattern', actions: ['Volume resuscitation if hypovolemic', 'Hold nephrotoxins/ACEi/NSAIDs as appropriate'] },
      { condition: 'ATN pattern', actions: ['Supportive care', 'Avoid volume overload', 'Monitor electrolytes'] },
    ],
  },
  {
    id: 'feurea',
    name: 'Fractional Excretion of Urea (FeUrea)',
    shortName: 'FeUrea',
    description: 'Differentiates prerenal AKI from ATN when diuretics confound FENa.',
    category: 'nephrology',
    tags: ['aki', 'urea'],
    whenToUse: 'AKI on diuretics when FENa unreliable.',
    whyUse: 'Urea handling less affected by loop diuretics than sodium.',
    inputs: [
      numberInput('purea', 'Plasma urea (BUN)', { unit: 'mg/dL', min: 1, max: 200, defaultValue: 40 }),
      numberInput('uurea', 'Urine urea', { unit: 'mg/dL', min: 1, max: 2000, defaultValue: 200 }),
      numberInput('pcr', 'Plasma creatinine', { unit: 'mg/dL', min: 0.1, max: 20, step: 0.1, defaultValue: 2 }),
      numberInput('ucr', 'Urine creatinine', { unit: 'mg/dL', min: 1, max: 500, defaultValue: 100 }),
    ],
    calculate(values) {
      const purea = num(values.purea, 40);
      const uurea = num(values.uurea, 200);
      const pcr = num(values.pcr, 2);
      const ucr = num(values.ucr, 100);
      const fe = round(((uurea * pcr) / (purea * ucr)) * 100, 1);
      if (fe < 35) {
        return { score: fe, unit: '%', label: 'Suggests prerenal', interpretation: 'FeUrea <35% favors prerenal azotemia.', riskLevel: 'low' };
      }
      if (fe > 50) {
        return { score: fe, unit: '%', label: 'Suggests ATN', interpretation: 'FeUrea >50% favors ATN.', riskLevel: 'moderate' };
      }
      return { score: fe, unit: '%', label: 'Indeterminate', interpretation: 'FeUrea 35–50%: indeterminate.', riskLevel: 'info' };
    },
    evidence: {
      summary: 'FeUrea useful when diuretics limit FENa interpretation.',
      references: [{ title: 'Fractional excretion of urea for diagnosis of prerenal failure', citation: 'Carvounis CP et al. Kidney Int. 2002', year: 2002, pmid: '12427149',
          doi: '10.1046/j.1523-1755.2002.00683.x', }],
      validation: 'Supportive studies in diuretic-treated patients; not perfect.',
    },
    nextSteps: [{ condition: 'Any', actions: ['Correlate with volume status and clinical course'] }],
  },
  {
    id: 'anion-gap',
    name: 'Anion Gap (Serum)',
    shortName: 'Anion Gap',
    description: 'Calculates serum anion gap for metabolic acidosis workup.',
    category: 'nephrology',
    tags: ['abg', 'acidosis', 'electrolytes'],
    whenToUse: 'Metabolic acidosis differential (HAGMA vs NAGMA).',
    whyUse: 'Core acid-base calculation.',
    inputs: [
      numberInput('na', 'Sodium', { unit: 'mEq/L', min: 100, max: 180, defaultValue: 140 }),
      numberInput('cl', 'Chloride', { unit: 'mEq/L', min: 70, max: 140, defaultValue: 104 }),
      numberInput('hco3', 'Bicarbonate', { unit: 'mEq/L', min: 1, max: 50, defaultValue: 24 }),
      numberInput('albumin', 'Albumin (optional correction)', { unit: 'g/dL', min: 1, max: 6, step: 0.1, defaultValue: 4.0 }),
    ],
    calculate(values) {
      const na = num(values.na, 140);
      const cl = num(values.cl, 104);
      const hco3 = num(values.hco3, 24);
      const alb = num(values.albumin, 4);
      const ag = round(na - (cl + hco3), 1);
      const agCorr = round(ag + 2.5 * (4 - alb), 1);
      const elevated = agCorr > 12;
      return {
        score: ag,
        unit: 'mEq/L',
        label: elevated ? 'Elevated anion gap' : 'Normal anion gap',
        interpretation: elevated
          ? 'High AG: consider MUDPILES/GOLDMARK (methanol, uremia, DKA, paraldehyde/phenformin, iron/INH, lactic, ethylene glycol, salicylates).'
          : 'Normal AG metabolic acidosis if low HCO₃: diarrhea, RTA, saline, etc.',
        riskLevel: elevated ? 'moderate' : 'normal',
        details: [
          { label: 'Albumin-corrected AG', value: `${agCorr} mEq/L` },
          { label: 'Typical normal', value: '8–12 (lab-dependent)' },
        ],
      };
    },
    evidence: {
      summary: 'AG = Na − (Cl + HCO₃). Correct ~2.5 mEq/L per 1 g/dL albumin below 4.',
      validation: 'Standard clinical chemistry.',
      references: [{ title: 'The anion gap', citation: 'Emmett M, Narins RG. Medicine. 1977', year: 1977, pmid: '401925' }],
    },
    nextSteps: [
      { condition: 'High AG', actions: ['Lactate, ketones, toxic alcohols if indicated', 'ABG/VBG', 'Osmolal gap'] },
    ],
  },
  {
    id: 'corrected-calcium',
    name: 'Corrected Calcium',
    shortName: 'Corr. Calcium',
    description: 'Adjusts total calcium for albumin concentration.',
    category: 'nephrology',
    tags: ['calcium', 'albumin'],
    whenToUse: 'Hypoalbuminemia when ionized Ca not available.',
    whyUse: 'Rough estimate; ionized calcium preferred.',
    inputs: [
      numberInput('ca', 'Total calcium', { unit: 'mg/dL', min: 4, max: 16, step: 0.1, defaultValue: 8.0 }),
      numberInput('alb', 'Albumin', { unit: 'g/dL', min: 1, max: 6, step: 0.1, defaultValue: 2.5 }),
    ],
    calculate(values) {
      const ca = num(values.ca, 8);
      const alb = num(values.alb, 2.5);
      const corr = round(ca + 0.8 * (4 - alb), 2);
      const r = riskFromThresholds(corr, [
        { max: 8.4, level: 'moderate', label: 'Low corrected Ca', interpretation: 'Hypocalcemia range — confirm with ionized Ca; check Mg, PTH, vitamin D.' },
        { max: 10.5, level: 'normal', label: 'Normal range', interpretation: 'Roughly normal corrected calcium (lab-dependent).' },
        { max: 20, level: 'high', label: 'High corrected Ca', interpretation: 'Hypercalcemia range — work up PTH-dependent vs independent causes.' },
      ]);
      return { score: corr, unit: 'mg/dL', ...r };
    },
    evidence: {
      summary: 'Corrected Ca = measured Ca + 0.8×(4 − albumin). Imperfect vs ionized Ca.',
      validation: 'Common clinical approximation; less accurate in critically ill.',
      references: [{ title: 'Calcium correction formulas', citation: 'Payne RB et al. Br Med J. 1973', year: 1973, pmid: '4758544',
          doi: '10.1136/bmj.4.5893.643', }],
    },
    nextSteps: [{ condition: 'Abnormal', actions: ['Prefer ionized calcium', 'ECG if severe', 'Treat underlying cause'] }],
  },
  {
    id: 'corrected-sodium',
    name: 'Corrected Sodium (Hyperglycemia)',
    shortName: 'Corr. Sodium',
    description: 'Corrects measured sodium for hyperglycemia.',
    category: 'endocrinology',
    tags: ['sodium', 'glucose', 'dka', 'hhs'],
    whenToUse: 'Hyperglycemia, DKA, HHS to estimate true sodium.',
    whyUse: 'Hyperglycemia lowers measured Na; correction guides free water status.',
    inputs: [
      numberInput('na', 'Measured sodium', { unit: 'mEq/L', min: 100, max: 180, defaultValue: 130 }),
      numberInput('glu', 'Glucose', { unit: 'mg/dL', min: 50, max: 2000, defaultValue: 400 }),
      selectInput('factor', 'Correction factor', [
        { label: '1.6 per 100 mg/dL (classic)', value: 1.6 },
        { label: '2.4 per 100 mg/dL (Hillier)', value: 2.4 },
      ]),
    ],
    calculate(values) {
      const na = num(values.na, 130);
      const glu = num(values.glu, 400);
      const factor = num(values.factor, 1.6);
      const corr = round(na + factor * ((glu - 100) / 100), 1);
      return {
        score: corr,
        unit: 'mEq/L',
        label: 'Corrected sodium',
        interpretation: 'Use corrected Na to assess water balance in hyperglycemia. Monitor Na as glucose falls with treatment.',
        riskLevel: 'info',
        details: [{ label: 'Measured Na', value: `${na} mEq/L` }],
      };
    },
    evidence: {
      summary: 'Classic Katz correction +1.6 mEq/L per 100 mg/dL glucose over 100; Hillier suggests 2.4.',
      references: [
        { title: 'Hyperglycemia-induced hyponatremia', citation: 'Katz MA. N Engl J Med. 1973', year: 1973, pmid: '4763428',
          doi: '10.1056/NEJM197310182891607', },
        { title: 'Hyponatremia: evaluating the correction factor for hyperglycemia', citation: 'Hillier TA et al. Am J Med. 1999', year: 1999, pmid: '10225241',
          doi: '10.1016/s0002-9343(99)00055-8', },
      ],
      validation: 'Standard endocrine/electrolyte practice.',
    },
    nextSteps: [{ condition: 'DKA/HHS', actions: ['Use corrected Na for fluid planning', 'Follow ADA/AACE protocols'] }],
  },
  {
    id: 'winters',
    name: "Winter's Formula",
    shortName: "Winter's",
    description: 'Expected PaCO₂ compensation in metabolic acidosis.',
    category: 'nephrology',
    tags: ['acid-base', 'compensation'],
    whenToUse: 'Metabolic acidosis to detect mixed disorders.',
    whyUse: 'If measured PaCO₂ differs from expected, additional respiratory disorder present.',
    inputs: [
      numberInput('hco3', 'HCO₃⁻', { unit: 'mEq/L', min: 1, max: 40, defaultValue: 12 }),
      numberInput('paco2', 'Measured PaCO₂', { unit: 'mmHg', min: 5, max: 100, defaultValue: 28 }),
    ],
    calculate(values) {
      const hco3 = num(values.hco3, 12);
      const measured = num(values.paco2, 28);
      const expected = round(1.5 * hco3 + 8, 1);
      const low = expected - 2;
      const high = expected + 2;
      let label = 'Appropriate respiratory compensation';
      let interpretation = `Expected PaCO₂ ≈ ${expected} (±2). Measured ${measured} is within range.`;
      let riskLevel: 'normal' | 'moderate' | 'high' = 'normal';
      if (measured > high) {
        label = 'Additional respiratory acidosis';
        interpretation = `PaCO₂ higher than expected (${expected}). Concurrent respiratory acidosis (or incomplete compensation).`;
        riskLevel = 'high';
      } else if (measured < low) {
        label = 'Additional respiratory alkalosis';
        interpretation = `PaCO₂ lower than expected (${expected}). Concurrent respiratory alkalosis.`;
        riskLevel = 'moderate';
      }
      return {
        score: expected,
        unit: 'mmHg',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Expected range', value: `${low}–${high}` },
          { label: 'Measured PaCO₂', value: `${measured}` },
        ],
      };
    },
    evidence: {
      summary: "Winter's formula: expected PCO₂ = 1.5 × [HCO₃] + 8 ± 2.",
      validation: 'Standard acid-base teaching.',
      references: [{ title: 'Simple and mixed acid-base disorders: a practical approach (Winter\'s formula teaching)', citation: 'Narins RG, Emmett M. Medicine (Baltimore). 1980', year: 1980, pmid: '6774200',
          doi: '10.1097/00005792-198005000-00001', }],
    },
    nextSteps: [
      { condition: 'Mixed disorder', actions: ['Search for second process (e.g., pneumonia + DKA)', 'ABG correlation'] },
    ],
  },
  {
    id: 'serum-osmolality',
    name: 'Calculated Serum Osmolality',
    shortName: 'Serum Osm',
    description: 'Calculates serum osmolality and optional osmolal gap.',
    category: 'nephrology',
    tags: ['osmolality', 'toxicology'],
    whenToUse: 'Hyponatremia workup, toxic alcohol suspicion.',
    whyUse: 'Calculated osm for hyponatremia tonicity; gap screens toxic alcohols/other osmoles.',
    inputs: [
      numberInput('na', 'Sodium', { unit: 'mEq/L', min: 100, max: 180, defaultValue: 140 }),
      numberInput('glu', 'Glucose', { unit: 'mg/dL', min: 40, max: 2000, defaultValue: 100 }),
      numberInput('bun', 'BUN', { unit: 'mg/dL', min: 1, max: 200, defaultValue: 14 }),
      numberInput('etoh', 'Ethanol (optional)', { unit: 'mg/dL', min: 0, max: 500, defaultValue: 0 }),
      numberInput('measured', 'Measured osm (optional)', { unit: 'mOsm/kg', min: 0, max: 500, defaultValue: 0 }),
    ],
    calculate(values) {
      const na = num(values.na, 140);
      const glu = num(values.glu, 100);
      const bun = num(values.bun, 14);
      const etoh = num(values.etoh, 0);
      const calc = round(2 * na + glu / 18 + bun / 2.8 + etoh / 4.6, 1);
      const measured = num(values.measured, 0);
      const details = [{ label: 'Formula', value: '2·Na + glu/18 + BUN/2.8 + EtOH/4.6' }];
      if (measured > 0) {
        const gap = round(measured - calc, 1);
        details.push({ label: 'Osmolal gap', value: `${gap}` });
        const elevated = gap > 10;
        return {
          score: calc,
          unit: 'mOsm/kg',
          label: elevated ? 'Elevated osmolal gap' : 'Normal osmolal gap',
          interpretation: elevated
            ? 'Gap >10: consider methanol, ethylene glycol, isopropyl, mannitol, severe hyperlipidemia/proteinemia artifact.'
            : 'Osmolal gap not elevated.',
          riskLevel: elevated ? 'high' : 'normal',
          details,
        };
      }
      return {
        score: calc,
        unit: 'mOsm/kg',
        label: 'Calculated osmolality',
        interpretation: 'Normal serum osm roughly 275–295 mOsm/kg. Enter measured osm to compute gap.',
        riskLevel: 'info',
        details,
      };
    },
    evidence: {
      summary: 'Calculated osm and gap help detect unmeasured osmoles in toxic alcohol ingestion.',
      validation: 'Standard toxicology and electrolyte practice.',
      references: [{ title: 'Serum osmolality and the osmolar gap', citation: 'Purssell RA et al. various reviews', year: 2001, pmid: '18442409',
          doi: '10.1186/1471-227X-8-5', }],
    },
    nextSteps: [
      { condition: 'High gap + suspicion', actions: ['Urgent toxic alcohol testing', 'Fomepizole if indicated', 'Nephrology for dialysis criteria'] },
    ],
  },
  {
    id: 'osmolal-gap',
    name: 'Osmolal Gap',
    shortName: 'Osm Gap',
    description: 'Difference between measured and calculated serum osmolality.',
    category: 'toxicology',
    tags: ['toxic alcohol', 'osmolality'],
    whenToUse: 'Suspected toxic alcohol ingestion.',
    whyUse: 'Rapid screen while awaiting levels.',
    inputs: [
      numberInput('measured', 'Measured osmolality', { unit: 'mOsm/kg', min: 200, max: 500, defaultValue: 320 }),
      numberInput('calculated', 'Calculated osmolality', { unit: 'mOsm/kg', min: 200, max: 500, defaultValue: 290 }),
    ],
    calculate(values) {
      const gap = round(num(values.measured, 320) - num(values.calculated, 290), 1);
      if (gap > 20) {
        return { score: gap, unit: 'mOsm/kg', label: 'Significantly elevated', interpretation: 'Strongly consider toxic alcohols or other osmoles; treat empirically if high suspicion.', riskLevel: 'critical' };
      }
      if (gap > 10) {
        return { score: gap, unit: 'mOsm/kg', label: 'Elevated', interpretation: 'Elevated gap — investigate methanol/EG, isopropyl, mannitol, etc.', riskLevel: 'high' };
      }
      return { score: gap, unit: 'mOsm/kg', label: 'Normal', interpretation: 'Gap ≤10 generally normal (lab-dependent). Note: late presentation may have normal gap with high AG.', riskLevel: 'normal' };
    },
    evidence: {
      summary: 'Osm gap = measured − calculated. Early toxic alcohol: high gap; later metabolized acids raise AG as gap falls.',
      validation: 'Core toxicology concept.',
      references: [{ title: 'AACT practice guidelines on methanol and ethylene glycol poisoning', citation: 'Barceloux DG et al. J Toxicol Clin Toxicol. 1999/2002', year: 2002, pmid: '12216995',
          doi: '10.1081/clt-120006745', }],
    },
    nextSteps: [
      { condition: 'Elevated + clinical suspicion', actions: ['Fomepizole', 'Check ABG, AG, renal function', 'Hemodialysis if severe'] },
    ],
  },
  {
    id: 'free-water-deficit',
    name: 'Free Water Deficit (Hypernatremia)',
    shortName: 'Free Water Deficit',
    description: 'Estimates free water deficit in hypernatremia.',
    category: 'nephrology',
    tags: ['sodium', 'hypernatremia', 'fluids'],
    whenToUse: 'Hypernatremia fluid replacement planning.',
    whyUse: 'Guides free water replacement rate (avoid overly rapid correction).',
    inputs: [
      numberInput('weight', 'Body weight', { unit: 'kg', min: 20, max: 300, defaultValue: 70 }),
      numberInput('na', 'Serum Na', { unit: 'mEq/L', min: 145, max: 200, defaultValue: 155 }),
      numberInput('goalNa', 'Goal Na', { unit: 'mEq/L', min: 140, max: 150, defaultValue: 140 }),
      selectInput('tbw', 'TBW fraction', [
        { label: 'Young men (0.6)', value: 0.6 },
        { label: 'Young women / elderly men (0.5)', value: 0.5 },
        { label: 'Elderly women (0.45)', value: 0.45 },
      ]),
    ],
    calculate(values) {
      const wt = num(values.weight, 70);
      const na = num(values.na, 155);
      const goal = num(values.goalNa, 140);
      const f = num(values.tbw, 0.5);
      const deficit = round(f * wt * ((na / goal) - 1), 1);
      return {
        score: deficit,
        unit: 'L',
        label: 'Estimated free water deficit',
        interpretation: `Replace free water carefully. Typical correction ≤10 mEq/L/day (slower if chronic). Account for ongoing losses.`,
        riskLevel: 'info',
      };
    },
    evidence: {
      summary: 'Deficit = TBW × ([Na]/goal − 1). TBW≈0.6×wt men, 0.5 women.',
      validation: 'Standard nephrology teaching.',
      references: [{ title: 'Hypernatremia', citation: 'Adrogué HJ, Madias NE. N Engl J Med. 2000', year: 2000, pmid: '10816188',
          doi: '10.1056/NEJM200005183422006', }],
    },
    nextSteps: [
      { condition: 'Hypernatremia', actions: ['Prefer enteral free water if possible', 'D5W IV if NPO', 'Serial Na q4–6h during correction'] },
    ],
  },
  {
    id: 'bicarb-deficit',
    name: 'Bicarbonate Deficit',
    shortName: 'HCO₃ Deficit',
    description: 'Estimates bicarbonate deficit for severe metabolic acidosis.',
    category: 'nephrology',
    tags: ['acidosis', 'bicarbonate'],
    whenToUse: 'Severe acidemia when bicarbonate therapy considered (selected cases).',
    whyUse: 'Rough dosing guide; treat underlying cause primarily.',
    inputs: [
      numberInput('weight', 'Weight', { unit: 'kg', min: 20, max: 300, defaultValue: 70 }),
      numberInput('hco3', 'Current HCO₃', { unit: 'mEq/L', min: 1, max: 24, defaultValue: 10 }),
      numberInput('goal', 'Goal HCO₃', { unit: 'mEq/L', min: 10, max: 24, defaultValue: 15 }),
    ],
    calculate(values) {
      const wt = num(values.weight, 70);
      const hco3 = num(values.hco3, 10);
      const goal = num(values.goal, 15);
      const deficit = round(0.5 * wt * (goal - hco3), 0);
      return {
        score: deficit,
        unit: 'mEq',
        label: 'Estimated HCO₃ deficit',
        interpretation: 'Give only a portion initially and reassess. Bicarb therapy controversial outside specific indications (e.g., selected toxicities, severe AKI with acidosis).',
        riskLevel: 'info',
      };
    },
    evidence: {
      summary: 'Deficit ≈ 0.5 × weight × (desired − measured HCO₃).',
      validation: 'Teaching estimate; Vd of bicarb increases as pH falls.',
      references: [{ title: 'Lactic acidosis', citation: 'Kraut JA, Madias NE. N Engl J Med. 2014', year: 2014, pmid: '25494270', doi: '10.1056/NEJMra1309483' }],
    },
    nextSteps: [{ condition: 'Severe acidosis', actions: ['Treat cause (source control, insulin, dialysis)', 'Avoid overcorrection'] }],
  },
  {
    id: 'bmi',
    name: 'Body Mass Index (BMI)',
    shortName: 'BMI',
    description: 'BMI from height and weight with WHO categories.',
    category: 'endocrinology',
    tags: ['obesity', 'nutrition'],
    whenToUse: 'Weight classification and health risk counseling.',
    whyUse: 'Standard anthropometric index.',
    inputs: [
      numberInput('weight', 'Weight', { unit: 'kg', min: 20, max: 400, step: 0.1, defaultValue: 70 }),
      numberInput('height', 'Height', { unit: 'cm', min: 100, max: 250, defaultValue: 170 }),
    ],
    calculate(values) {
      const w = num(values.weight, 70);
      const h = num(values.height, 170) / 100;
      const bmi = round(w / (h * h), 1);
      const r = riskFromThresholds(bmi, [
        { max: 18.4, level: 'moderate', label: 'Underweight', interpretation: 'BMI <18.5: underweight — evaluate nutrition and underlying disease.' },
        { max: 24.9, level: 'normal', label: 'Normal', interpretation: 'BMI 18.5–24.9: normal range (WHO).' },
        { max: 29.9, level: 'moderate', label: 'Overweight', interpretation: 'BMI 25–29.9: overweight — lifestyle counseling.' },
        { max: 34.9, level: 'moderate', label: 'Obesity class I', interpretation: 'BMI 30–34.9: class I obesity.' },
        { max: 39.9, level: 'high', label: 'Obesity class II', interpretation: 'BMI 35–39.9: class II obesity.' },
        { max: 100, level: 'high', label: 'Obesity class III', interpretation: 'BMI ≥40: class III (severe) obesity.' },
      ]);
      return { score: bmi, unit: 'kg/m²', ...r };
    },
    evidence: {
      summary: 'BMI = weight(kg)/height(m)². WHO cutoffs; limitations in athletes, elderly, different ethnicities.',
      validation: 'Population-level risk marker.',
      references: [{
        title: 'WHO BMI classification',
        citation: 'World Health Organization. Obesity: preventing and managing the global epidemic (TRS 894) / BMI classification',
        year: 2000,
        url: 'https://www.who.int/data/gho/data/themes/topics/topic-details/GHO/body-mass-index',
      }],
    },
    nextSteps: [
      { condition: 'BMI ≥30', actions: ['Lifestyle intervention', 'Screen comorbidities', 'Consider pharmacotherapy/bariatric referral per guidelines'] },
    ],
  },
  {
    id: 'ibw',
    name: 'Ideal Body Weight (Devine)',
    shortName: 'IBW',
    description: 'Ideal body weight using Devine formula.',
    category: 'general',
    tags: ['dosing', 'weight'],
    whenToUse: 'Drug dosing (e.g., some antimicrobials), nutrition estimates.',
    whyUse: 'Common pharmacy standard.',
    inputs: [
      numberInput('height', 'Height', { unit: 'cm', min: 140, max: 220, defaultValue: 170 }),
      selectInput('sex', 'Sex', [
        { label: 'Male', value: 'M' },
        { label: 'Female', value: 'F' },
      ]),
    ],
    calculate(values) {
      const cm = num(values.height, 170);
      const inches = cm / 2.54;
      const over60 = Math.max(0, inches - 60);
      const ibw = values.sex === 'F' ? 45.5 + 2.3 * over60 : 50 + 2.3 * over60;
      return {
        score: round(ibw, 1),
        unit: 'kg',
        label: 'Ideal body weight',
        interpretation: 'Devine IBW. For obese patients, many drugs use adjusted body weight.',
        riskLevel: 'info',
      };
    },
    evidence: {
      summary: 'Devine (1974): Men 50 + 2.3 kg/inch >5 ft; Women 45.5 + 2.3 kg/inch >5 ft.',
      validation: 'Widely used in clinical pharmacy.',
      references: [{ title: 'Gentamicin therapy (Devine ideal body weight formula)', citation: 'Devine BJ. Drug Intell Clin Pharm. 1974 (classic IBW; widely cited in pharmacy dosing)', year: 1974, url: 'https://pubmed.ncbi.nlm.nih.gov/?term=Devine+BJ+gentamicin+1974' }],
    },
    nextSteps: [{ condition: 'Obesity', actions: ['Calculate AdjBW = IBW + 0.4×(TBW−IBW) for selected drugs'] }],
  },
  {
    id: 'abw',
    name: 'Adjusted Body Weight',
    shortName: 'AdjBW',
    description: 'Adjusted body weight for dosing in obesity.',
    category: 'general',
    tags: ['dosing', 'obesity'],
    whenToUse: 'Obese patients for selected drug dosing.',
    whyUse: 'Accounts for partial distribution into adipose tissue.',
    inputs: [
      numberInput('tbw', 'Total body weight', { unit: 'kg', min: 30, max: 400, defaultValue: 100 }),
      numberInput('ibw', 'Ideal body weight', { unit: 'kg', min: 30, max: 150, defaultValue: 70 }),
      numberInput('factor', 'Correction factor', { unit: '', min: 0.2, max: 0.5, step: 0.05, defaultValue: 0.4 }),
    ],
    calculate(values) {
      const tbw = num(values.tbw, 100);
      const ibw = num(values.ibw, 70);
      const f = num(values.factor, 0.4);
      const abw = round(ibw + f * (tbw - ibw), 1);
      return {
        score: abw,
        unit: 'kg',
        label: 'Adjusted body weight',
        interpretation: 'AdjBW = IBW + factor×(TBW−IBW). Common factor 0.4. Verify drug-specific recommendations.',
        riskLevel: 'info',
      };
    },
    evidence: {
      summary: 'Adjusted body weight commonly used for aminoglycosides and some other agents in obesity.',
      validation: 'Pharmacy practice standard; factor may vary by drug.',
      references: [{ title: 'The effects of obesity on drug pharmacokinetics in humans', citation: 'Hanley MJ et al. Expert Opin Drug Metab Toxicol. 2010', year: 2010, pmid: '20067334',
          doi: '10.2165/11318100-000000000-00000', }],
    },
    nextSteps: [{ condition: 'Any', actions: ['Confirm specific drug monograph for weight scalar'] }],
  },
  {
    id: 'bsa',
    name: 'Body Surface Area (Mosteller)',
    shortName: 'BSA',
    description: 'BSA using Mosteller formula for chemo and physiologic indexing.',
    category: 'general',
    tags: ['bsa', 'chemotherapy', 'dosing'],
    whenToUse: 'Chemotherapy dosing and cardiac index normalization.',
    whyUse: 'Mosteller is simple and widely accepted.',
    inputs: [
      numberInput('height', 'Height', { unit: 'cm', min: 50, max: 250, defaultValue: 170 }),
      numberInput('weight', 'Weight', { unit: 'kg', min: 10, max: 400, defaultValue: 70 }),
    ],
    calculate(values) {
      const h = num(values.height, 170);
      const w = num(values.weight, 70);
      const bsa = round(Math.sqrt((h * w) / 3600), 2);
      return {
        score: bsa,
        unit: 'm²',
        label: 'Body surface area',
        interpretation: 'Mosteller BSA. Average adult ~1.7 m².',
        riskLevel: 'info',
      };
    },
    evidence: {
      summary: 'Mosteller: BSA = √([Ht(cm)×Wt(kg)]/3600).',
      validation: 'Comparable to DuBois with simpler math.',
      references: [{ title: 'Simplified calculation of body-surface area', citation: 'Mosteller RD. N Engl J Med. 1987', year: 1987, pmid: '3657876',
          doi: '10.1056/NEJM198710223171717', }],
    },
    nextSteps: [{ condition: 'Chemo dosing', actions: ['Apply regimen mg/m² carefully', 'Consider caps in obesity per protocol'] }],
  },
  {
    id: 'maintenance-fluids',
    name: 'Maintenance IV Fluids (4-2-1)',
    shortName: '4-2-1 Fluids',
    description: 'Holliday-Segar maintenance fluid rate.',
    category: 'general',
    tags: ['fluids', 'pediatrics', 'ivf'],
    whenToUse: 'Maintenance fluid estimates for children and adults.',
    whyUse: 'Classic weight-based hourly rate.',
    inputs: [numberInput('weight', 'Weight', { unit: 'kg', min: 1, max: 200, step: 0.1, defaultValue: 20 })],
    calculate(values) {
      const w = num(values.weight, 20);
      let rate = 0;
      if (w <= 10) rate = 4 * w;
      else if (w <= 20) rate = 40 + 2 * (w - 10);
      else rate = 60 + 1 * (w - 20);
      const daily = round(rate * 24, 0);
      return {
        score: round(rate, 1),
        unit: 'mL/hr',
        label: 'Maintenance rate',
        interpretation: `≈${daily} mL/day by Holliday-Segar. Adjust for losses, fever, renal/heart failure. Prefer isotonic fluids in children per AAP.`,
        riskLevel: 'info',
        details: [{ label: 'Daily volume', value: `${daily} mL/day` }],
      };
    },
    evidence: {
      summary: '4 mL/kg/hr first 10 kg + 2 mL/kg/hr next 10 + 1 mL/kg/hr thereafter.',
      validation: 'Holliday-Segar 1957; modern pediatric guidance favors isotonic maintenance fluids.',
      references: [{ title: 'The maintenance need for water in parenteral fluid therapy', citation: 'Holliday MA, Segar WE. Pediatrics. 1957', year: 1957, pmid: '13431307' }],
    },
    nextSteps: [{ condition: 'Pediatric', actions: ['Use isotonic fluids with appropriate dextrose/K', 'Monitor Na and volume status'] }],
  },
  {
    id: 'homa-ir',
    name: 'HOMA-IR',
    shortName: 'HOMA-IR',
    description: 'Homeostatic model assessment of insulin resistance.',
    category: 'endocrinology',
    tags: ['insulin', 'diabetes', 'metabolic'],
    whenToUse: 'Research/clinical estimate of insulin resistance (fasting labs).',
    whyUse: 'Simple surrogate without clamp studies.',
    inputs: [
      numberInput('glucose', 'Fasting glucose', { unit: 'mg/dL', min: 50, max: 400, defaultValue: 100 }),
      numberInput('insulin', 'Fasting insulin', { unit: 'µU/mL', min: 1, max: 100, step: 0.1, defaultValue: 10 }),
    ],
    calculate(values) {
      const g = num(values.glucose, 100);
      const i = num(values.insulin, 10);
      const homa = round((g * i) / 405, 2);
      const r = riskFromThresholds(homa, [
        { max: 1.0, level: 'normal', label: 'Insulin sensitive', interpretation: 'Lower HOMA-IR suggests better insulin sensitivity (cutoffs vary by lab/population).' },
        { max: 2.5, level: 'moderate', label: 'Early resistance range', interpretation: 'Borderline/elevated depending on reference population.' },
        { max: 50, level: 'high', label: 'Insulin resistance', interpretation: 'Elevated HOMA-IR suggests insulin resistance; correlate clinically.' },
      ]);
      return { score: homa, ...r };
    },
    evidence: {
      summary: 'HOMA-IR = (fasting glucose × fasting insulin) / 405 (glucose in mg/dL).',
      validation: 'Correlates moderately with clamp-derived insulin sensitivity.',
      references: [{ title: 'Homeostasis model assessment', citation: 'Matthews DR et al. Diabetologia. 1985', year: 1985, pmid: '3899825',
          doi: '10.1007/BF00280883', }],
    },
    nextSteps: [{ condition: 'Elevated', actions: ['Lifestyle intervention', 'Screen for metabolic syndrome / T2DM'] }],
  },
  {
    id: 'eag',
    name: 'eAG from HbA1c',
    shortName: 'eAG',
    description: 'Converts HbA1c to estimated average glucose.',
    category: 'endocrinology',
    tags: ['diabetes', 'a1c'],
    whenToUse: 'Patient education linking A1c to average glucose.',
    whyUse: 'ADA-endorsed conversion from ADAG study.',
    inputs: [numberInput('a1c', 'HbA1c', { unit: '%', min: 4, max: 20, step: 0.1, defaultValue: 7.0 })],
    calculate(values) {
      const a1c = num(values.a1c, 7);
      const eag = round(28.7 * a1c - 46.7, 0);
      const r = riskFromThresholds(a1c, [
        { max: 5.6, level: 'normal', label: 'Normal A1c range', interpretation: `eAG ≈ ${eag} mg/dL.` },
        { max: 6.4, level: 'moderate', label: 'Prediabetes range', interpretation: `eAG ≈ ${eag} mg/dL. Prediabetes if 5.7–6.4%.` },
        { max: 20, level: 'high', label: 'Diabetes range', interpretation: `eAG ≈ ${eag} mg/dL. Individualize A1c target.` },
      ]);
      return { score: eag, unit: 'mg/dL', ...r, details: [{ label: 'HbA1c', value: `${a1c}%` }] };
    },
    evidence: {
      summary: 'eAG (mg/dL) = 28.7 × A1c − 46.7 (ADAG study).',
      validation: 'ADA uses this conversion for patient communication.',
      references: [{ title: 'Translating the A1C assay into estimated average glucose', citation: 'Nathan DM et al. Diabetes Care. 2008', year: 2008, pmid: '18540046',
          doi: '10.2337/dc08-0545', }],
    },
    nextSteps: [{ condition: 'Elevated A1c', actions: ['Confirm diabetes diagnosis as needed', 'Lifestyle + pharmacotherapy per ADA'] }],
  },
  {
    id: 'ldl-friedewald',
    name: 'LDL Cholesterol (Friedewald)',
    shortName: 'LDL Friedewald',
    description: 'Calculates LDL-C from total cholesterol, HDL, and triglycerides.',
    category: 'endocrinology',
    tags: ['cholesterol', 'lipid', 'ldl'],
    whenToUse: 'Standard lipid panel when TG <400 mg/dL.',
    whyUse: 'Most common calculated LDL method.',
    inputs: [
      numberInput('tc', 'Total cholesterol', { unit: 'mg/dL', min: 50, max: 500, defaultValue: 200 }),
      numberInput('hdl', 'HDL', { unit: 'mg/dL', min: 10, max: 120, defaultValue: 50 }),
      numberInput('tg', 'Triglycerides', { unit: 'mg/dL', min: 30, max: 1000, defaultValue: 150 }),
    ],
    calculate(values) {
      const tc = num(values.tc, 200);
      const hdl = num(values.hdl, 50);
      const tg = num(values.tg, 150);
      if (tg >= 400) {
        return {
          score: '—',
          label: 'Not valid',
          interpretation: 'Friedewald invalid when TG ≥400 mg/dL. Use direct LDL or Martin-Hopkins.',
          riskLevel: 'info',
        };
      }
      const ldl = round(tc - hdl - tg / 5, 0);
      const r = riskFromThresholds(ldl, [
        { max: 99, level: 'normal', label: 'Optimal / near optimal', interpretation: 'LDL <100 optimal for many; <70 for very high-risk ASCVD.' },
        { max: 129, level: 'low', label: 'Borderline', interpretation: 'LDL 100–129: borderline high depending on risk.' },
        { max: 159, level: 'moderate', label: 'High', interpretation: 'LDL 130–159: high.' },
        { max: 500, level: 'high', label: 'Very high', interpretation: 'LDL ≥160: high/very high — consider therapy intensity.' },
      ]);
      return { score: ldl, unit: 'mg/dL', ...r };
    },
    evidence: {
      summary: 'LDL = TC − HDL − TG/5 (mg/dL). Invalid if TG ≥400.',
      validation: 'Friedewald 1972; Martin-Hopkins improves accuracy at low LDL/high TG.',
      references: [{ title: 'Estimation of concentration of low-density lipoprotein cholesterol', citation: 'Friedewald WT et al. Clin Chem. 1972', year: 1972, pmid: '4337382' }],
    },
    nextSteps: [{ condition: 'Elevated LDL', actions: ['ASCVD risk assessment', 'Statin therapy per guidelines'] }],
  },
  {
    id: 'anc',
    name: 'Absolute Neutrophil Count (ANC)',
    shortName: 'ANC',
    description: 'Calculates ANC from WBC and neutrophil percentage.',
    category: 'hematology',
    tags: ['neutropenia', 'oncology', 'wbc'],
    whenToUse: 'Chemotherapy, febrile neutropenia risk, clozapine monitoring.',
    whyUse: 'Defines neutropenia severity.',
    inputs: [
      numberInput('wbc', 'WBC', { unit: '×10³/µL', min: 0.1, max: 100, step: 0.1, defaultValue: 4.0 }),
      numberInput('neut', 'Neutrophils (segs)', { unit: '%', min: 0, max: 100, defaultValue: 50 }),
      numberInput('bands', 'Bands', { unit: '%', min: 0, max: 50, defaultValue: 0 }),
    ],
    calculate(values) {
      const wbc = num(values.wbc, 4);
      const neut = num(values.neut, 50);
      const bands = num(values.bands, 0);
      const anc = round(wbc * 1000 * ((neut + bands) / 100), 0);
      const r = riskFromThresholds(anc, [
        { max: 499, level: 'critical', label: 'Severe neutropenia', interpretation: 'ANC <500: severe neutropenia — high infection risk; febrile neutropenia protocols if fever.' },
        { max: 999, level: 'high', label: 'Moderate neutropenia', interpretation: 'ANC 500–999: moderate neutropenia.' },
        { max: 1499, level: 'moderate', label: 'Mild neutropenia', interpretation: 'ANC 1000–1499: mild neutropenia.' },
        { max: 100000, level: 'normal', label: 'Normal / near normal', interpretation: 'ANC ≥1500 generally not neutropenic.' },
      ]);
      return { score: anc, unit: '/µL', ...r };
    },
    evidence: {
      summary: 'ANC = WBC × % (segs + bands) / 100 (with WBC in cells/µL).',
      validation: 'Standard hematology definition for neutropenia grades.',
      references: [{ title: 'Common Terminology Criteria for Adverse Events (CTCAE) v5.0', citation: 'National Cancer Institute CTEP. CTCAE v5.0. 2017', year: 2017, url: 'https://ctep.cancer.gov/protocoldevelopment/electronic_applications/ctc.htm' }],
    },
    nextSteps: [
      { condition: 'ANC <500 + fever', actions: ['Urgent broad-spectrum antibiotics', 'Cultures', 'Oncology pathways'] },
    ],
  },
];
