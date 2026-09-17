import type { Calculator } from '../../types/calculator';
import { num, bool, str, round, yesNo, selectInput, numberInput } from '../../utils/helpers';

/* --------------------------------------------------------------------------
 * Local helpers
 * ------------------------------------------------------------------------ */

/** Linear interpolation of (x,y) knots; clamps to end values outside range. */
function interp(x: number, knots: [number, number][]): number {
  if (x <= knots[0][0]) return knots[0][1];
  for (let i = 1; i < knots.length; i++) {
    if (x <= knots[i][0]) {
      const [x0, y0] = knots[i - 1];
      const [x1, y1] = knots[i];
      return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
    }
  }
  return knots[knots.length - 1][1];
}

/** MFIS 0-4 frequency response option set. */
function mfisItem(id: string, label: string, exampleValue: number) {
  return selectInput(
    id,
    label,
    [
      { label: 'Never', value: 0, points: 0 },
      { label: 'Rarely', value: 1, points: 1 },
      { label: 'Sometimes', value: 2, points: 2 },
      { label: 'Often', value: 3, points: 3 },
      { label: 'Almost always', value: 4, points: 4 },
    ],
    exampleValue,
    'Because of your fatigue during the past 4 weeks — rate how often this statement applied to you.'
  );
}

/** CIRS-G 0-4 severity select for one organ system. */
function cirsSystem(id: string, label: string, anchors: string, exampleValue: number) {
  return selectInput(
    id,
    label,
    [
      { label: '0 — No problem', value: 0, points: 0 },
      { label: '1 — Current mild problem or past significant problem', value: 1, points: 1 },
      { label: '2 — Moderate disability / requires first-line therapy', value: 2, points: 2 },
      { label: '3 — Severe / constant significant disability / hard-to-control', value: 3, points: 3 },
      { label: '4 — Extremely severe / immediate treatment / organ failure', value: 4, points: 4 },
    ],
    exampleValue,
    anchors
  );
}

/** G8 select helper. */
function g8Item(
  id: string,
  label: string,
  options: { label: string; value: number; points?: number }[],
  exampleValue: number,
  helpText: string
) {
  return selectInput(id, label, options, exampleValue, helpText);
}

/** FIB-4 = age × AST / (platelets × sqrt(ALT)). */
function fib4(age: number, ast: number, alt: number, plt: number): number {
  const denom = plt * Math.sqrt(Math.max(alt, 1));
  return denom > 0 ? (age * ast) / denom : 0;
}

/** VACS Index 2.0 → 5-year all-cause mortality (McGinnis CID 2022 calibration, 2010-2018). */
const VACS2_MORTALITY: [number, number][] = [
  [0, 0.3],
  [10, 0.7],
  [20, 1.6],
  [30, 3.3],
  [40, 6.4],
  [50, 11.7],
  [60, 19.8],
  [70, 31.1],
  [80, 45.0],
  [90, 60.1],
  [100, 74.3],
  [129, 92],
];

/** VACS 1.0 score → approximate 5-year mortality (nomogram anchors; approximate). */
const VACS1_MORTALITY: [number, number][] = [
  [0, 0.9],
  [20, 2],
  [30, 3],
  [40, 5],
  [50, 9],
  [60, 14],
  [70, 22],
  [80, 32],
  [90, 45],
  [100, 58],
  [110, 68],
  [130, 85],
];

/** 2010 CAROC femoral-neck T-score cutoffs by age/sex (Papaioannou 2010 / Leslie 2011). */
const CAROC_WOMEN: [number, number, number][] = [
  // [age, low-risk cutoff (T above → low), high-risk cutoff (T below → high)]
  [50, -2.5, -3.8],
  [55, -2.5, -3.8],
  [60, -2.3, -3.7],
  [65, -1.9, -3.5],
  [70, -1.7, -3.2],
  [75, -1.2, -2.9],
  [80, -0.5, -2.6],
  [85, 0.1, -2.2],
];
const CAROC_MEN: [number, number, number][] = [
  [50, -2.5, -3.9],
  [55, -2.5, -3.9],
  [60, -2.5, -3.7],
  [65, -2.4, -3.7],
  [70, -2.3, -3.7],
  [75, -2.3, -3.8],
  [80, -2.1, -3.8],
  [85, -2.0, -3.8],
];

function carocCutoffs(age: number, male: boolean): { low: number; high: number } {
  const table = male ? CAROC_MEN : CAROC_WOMEN;
  const low = interp(age, table.map((r) => [r[0], r[1]] as [number, number]));
  const high = interp(age, table.map((r) => [r[0], r[2]] as [number, number]));
  return { low, high };
}

/** 0 = low, 1 = moderate, 2 = high. */
function carocCategoryLabel(cat: number): string {
  return cat === 2 ? 'High risk (>20%)' : cat === 1 ? 'Moderate risk (10–20%)' : 'Low risk (<10%)';
}

export const wave8IdGeriCalcs: Calculator[] = [
  // ─── 1. VACS 1.0 Index ────────────────────────────────────────────────────
  {
    id: 'vacs-1',
    name: 'Veterans Aging Cohort Study (VACS) 1.0 Index',
    shortName: 'VACS 1.0',
    description:
      'Point-weighted index of 5-year all-cause mortality in people with HIV using age, CD4, HIV-1 RNA, hemoglobin, FIB-4, eGFR, and hepatitis C status.',
    category: 'infectious-disease',
    tags: ['vacs', 'hiv', 'mortality', 'prognosis', 'fib-4', 'justice', 'cd4'],
    whenToUse:
      'Adults with HIV (typically established on ART) to quantify physiologic frailty and 5-year all-cause mortality risk.',
    whyUse:
      'The VACS Index integrates HIV-specific and organ-injury biomarkers; it discriminates mortality better than age/CD4/viral load alone and tracks frailty longitudinally.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 18, max: 110, exampleValue: 55, helpText: '<50: 0 pts; 50–64: +12; ≥65: +27.' }),
      numberInput('cd4', 'CD4 count', { unit: 'cells/mm³', min: 0, max: 3000, exampleValue: 350, helpText: '≥500: 0; 350–499: +6; 200–349: +6; 100–199: +10; 50–99: +28; <50: +29.' }),
      numberInput('rna', 'HIV-1 RNA (viral load)', { unit: 'copies/mL', min: 0, max: 10000000, exampleValue: 50000, helpText: '<500: 0; 500–99,999: +7; ≥100,000: +14. Use the numeric result; treat "undetectable" as <500.' }),
      numberInput('hgb', 'Hemoglobin', { unit: 'g/dL', min: 3, max: 22, step: 0.1, exampleValue: 12.5, helpText: '≥14: 0; 12–13.9: +10; 10–11.9: +22; <10: +38.' }),
      numberInput('ast', 'AST', { unit: 'U/L', min: 5, max: 2000, exampleValue: 40, helpText: 'Used with age, ALT, and platelets to derive the FIB-4 index: <1.45: 0; 1.45–3.25: +6; >3.25: +25.' }),
      numberInput('alt', 'ALT', { unit: 'U/L', min: 5, max: 2000, exampleValue: 35, helpText: 'Denominator of the FIB-4 formula (age × AST / platelets / √ALT).' }),
      numberInput('plt', 'Platelet count', { unit: '×10³/µL', min: 10, max: 1000, exampleValue: 220, helpText: 'Platelets in 10³/µL (e.g., 220 for 220,000/µL); used for FIB-4.' }),
      numberInput('egfr', 'eGFR', { unit: 'mL/min/1.73 m²', min: 5, max: 200, exampleValue: 75, helpText: '≥60: 0; 45–59.9: +6; 30–44.9: +8; <30: +26.' }),
      yesNo('hcv', 'Hepatitis C co-infection', 5, 'Positive HCV antibody or RNA adds 5 points.', false),
    ],
    calculate(values) {
      const age = num(values.age, 50);
      const cd4 = num(values.cd4, 350);
      const rna = num(values.rna, 0);
      const hgb = num(values.hgb, 14);
      const ast = num(values.ast, 30);
      const alt = num(values.alt, 30);
      const plt = num(values.plt, 250);
      const egfr = num(values.egfr, 90);
      const f4 = fib4(age, ast, alt, plt);

      const agePts = age >= 65 ? 27 : age >= 50 ? 12 : 0;
      const cd4Pts = cd4 >= 500 ? 0 : cd4 >= 350 ? 6 : cd4 >= 200 ? 6 : cd4 >= 100 ? 10 : cd4 >= 50 ? 28 : 29;
      const rnaPts = rna >= 100000 ? 14 : rna >= 500 ? 7 : 0;
      const hgbPts = hgb >= 14 ? 0 : hgb >= 12 ? 10 : hgb >= 10 ? 22 : 38;
      const fibPts = f4 > 3.25 ? 25 : f4 >= 1.45 ? 6 : 0;
      const gfrPts = egfr >= 60 ? 0 : egfr >= 45 ? 6 : egfr >= 30 ? 8 : 26;
      const hcvPts = bool(values.hcv) ? 5 : 0;
      const score = agePts + cd4Pts + rnaPts + hgbPts + fibPts + gfrPts + hcvPts;
      const mort = round(interp(score, VACS1_MORTALITY), 1);

      const band =
        score >= 75
          ? { riskLevel: 'critical' as const, label: 'Very high mortality risk' }
          : score >= 50
          ? { riskLevel: 'high' as const, label: 'High mortality risk' }
          : score >= 30
          ? { riskLevel: 'moderate' as const, label: 'Intermediate mortality risk' }
          : { riskLevel: 'low' as const, label: 'Lower mortality risk' };

      return {
        score,
        unit: 'points',
        label: band.label,
        interpretation: `VACS Index ${score} (range ~0–164) — estimated 5-year all-cause mortality ≈${mort}% (approximate; derived from published nomogram). Driven by age (+${agePts}), CD4 (+${cd4Pts}), HIV RNA (+${rnaPts}), hemoglobin (+${hgbPts}), FIB-4 ${round(f4, 2)} (+${fibPts}), eGFR (+${gfrPts}), HCV (+${hcvPts}).`,
        riskLevel: band.riskLevel,
        details: [
          { label: 'Age points', value: `+${agePts} (age ${age})` },
          { label: 'CD4 points', value: `+${cd4Pts} (CD4 ${cd4}/mm³)` },
          { label: 'HIV RNA points', value: `+${rnaPts}` },
          { label: 'Hemoglobin points', value: `+${hgbPts} (${hgb} g/dL)` },
          { label: 'FIB-4', value: `${round(f4, 2)} → +${fibPts}` },
          { label: 'eGFR points', value: `+${gfrPts} (${egfr} mL/min/1.73 m²)` },
          { label: 'HCV points', value: `+${hcvPts}` },
          { label: 'Est. 5-year mortality', value: `≈${mort}% (approximate)` },
        ],
        recommendations: [
          'Address modifiable components: sustain viral suppression, manage anemia, renal disease, and liver fibrosis/HCV.',
          'Use serial VACS scores to follow physiologic frailty and guide preventive screening.',
        ],
      };
    },
    evidence: {
      summary:
        'VACS Index 1.0 weights age (<50:0, 50–64:+12, ≥65:+27), CD4 (≥500:0 → <50:+29), HIV-1 RNA (<500:0, 500–99,999:+7, ≥10⁵:+14), hemoglobin (≥14:0 → <10:+38), FIB-4 (<1.45:0, 1.45–3.25:+6, >3.25:+25), eGFR (≥60:0 → <30:+26), and HCV (+5).',
      formula:
        'Score = sum of categorical weights (0–164). FIB-4 = age × AST / (platelets × √ALT).',
      validation:
        'Derived in the Veterans Aging Cohort Study and validated in NA-ACCORD (C-statistic ~0.77 vs 0.74 for age/CD4/RNA alone; NRI 12%). Score→mortality translation uses the published gamma-model nomogram; the estimate shown is an approximation of that curve.',
      references: [
        {
          title: 'Predictive accuracy of the Veterans Aging Cohort Study index for mortality with HIV infection: a North American cross cohort analysis',
          citation: 'Tate JP, Justice AC, Hughes MD, et al. J Acquir Immune Defic Syndr. 2013;62(2):149-163',
          year: 2013,
          pmid: '23187941',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score ≥50', actions: ['Review drivers (age, CD4, anemia, FIB-4, eGFR, HCV)', 'Intensify preventive screening and comorbidity management', 'Consider HCV treatment if coinfected'] },
      { condition: 'Rising score over time', actions: ['Re-check ART adherence and viral suppression', 'Evaluate for progressive organ injury (liver, renal, marrow)'] },
    ],
    pearls: [
      'About half of the derivation cohort started ART before 2004 — newer regimens may shift absolute risk.',
      'The index also predicts hospitalization, ICU admission, and fragility-fracture risk, not just mortality.',
      'A single VACS score is a snapshot; trajectory over time is more informative.',
    ],
  },

  // ─── 2. VACS 2.0 Index ────────────────────────────────────────────────────
  {
    id: 'vacs-2',
    name: 'Veterans Aging Cohort Study (VACS) 2.0 Index',
    shortName: 'VACS 2.0',
    description:
      'Updated VACS mortality index adding albumin, WBC, and BMI with continuous functional forms. Educational approximation calibrated to the published score–mortality table.',
    category: 'infectious-disease',
    tags: ['vacs', 'hiv', 'mortality', 'albumin', 'wbc', 'bmi', 'tate'],
    status: 'educational',
    validationStatus: 'unverified',
    whenToUse:
      'Adults with HIV on ART for 5-year all-cause mortality estimation when albumin, WBC, and BMI are also available.',
    whyUse:
      'VACS Index 2.0 adds albumin, white blood cell count, and BMI to version 1.0 and uses continuous functional forms, improving discrimination (C-statistic ~0.80–0.84) across international cohorts.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 18, max: 110, exampleValue: 55, helpText: 'Age contributes continuously; risk rises roughly linearly per year above mid-adulthood.' }),
      selectInput('sex', 'Sex at birth', [
        { label: 'Male', value: 'M' },
        { label: 'Female', value: 'F' },
      ], 'M', 'VACS 2.0 is a sex-stratified model; female sex carried a modestly lower coefficient in the derivation.'),
      numberInput('bmi', 'BMI', { unit: 'kg/m²', min: 10, max: 80, step: 0.1, exampleValue: 27, helpText: 'J-shaped relationship — low BMI (<25) raises risk more than overweight/obesity.' }),
      numberInput('cd4', 'CD4 count', { unit: 'cells/mm³', min: 0, max: 3000, exampleValue: 450, helpText: 'Lower CD4 raises risk; benefit of higher counts plateaus above ~500.' }),
      numberInput('rna', 'HIV-1 RNA (viral load)', { unit: 'copies/mL', min: 0, max: 10000000, exampleValue: 20, helpText: 'Entered as copies/mL; risk rises with log of viral load above suppression.' }),
      numberInput('hgb', 'Hemoglobin', { unit: 'g/dL', min: 3, max: 22, step: 0.1, exampleValue: 14.2, helpText: 'Anemia is a strong general-organ-injury signal in the index.' }),
      numberInput('ast', 'AST', { unit: 'U/L', min: 5, max: 2000, exampleValue: 28, helpText: 'With age, ALT, and platelets, used to compute FIB-4 (liver fibrosis marker).' }),
      numberInput('alt', 'ALT', { unit: 'U/L', min: 5, max: 2000, exampleValue: 30, helpText: 'Denominator of FIB-4.' }),
      numberInput('plt', 'Platelet count', { unit: '×10³/µL', min: 10, max: 1000, exampleValue: 230, helpText: 'Platelets in 10³/µL; low platelets raise FIB-4.' }),
      numberInput('egfr', 'eGFR', { unit: 'mL/min/1.73 m²', min: 5, max: 200, exampleValue: 85, helpText: 'CKD-EPI eGFR; lower values mark renal organ injury.' }),
      numberInput('albumin', 'Serum albumin', { unit: 'g/dL', min: 1, max: 6, step: 0.1, exampleValue: 4.1, helpText: 'New in VACS 2.0 — low albumin independently predicts mortality.' }),
      numberInput('wbc', 'WBC count', { unit: '×10³/µL', min: 0.5, max: 60, step: 0.1, exampleValue: 5.8, helpText: 'New in VACS 2.0 — leukopenia marks advanced disease/marrow injury.' }),
      yesNo('hcv', 'Hepatitis C co-infection', null, 'Positive HCV serostatus adds to mortality risk.', false),
    ],
    calculate(values) {
      const age = num(values.age, 50);
      const female = str(values.sex, 'M') === 'F';
      const bmi = num(values.bmi, 25);
      const cd4 = num(values.cd4, 500);
      const rna = Math.max(num(values.rna, 20), 1);
      const hgb = num(values.hgb, 14);
      const ast = num(values.ast, 25);
      const alt = num(values.alt, 25);
      const plt = num(values.plt, 240);
      const egfr = num(values.egfr, 90);
      const alb = num(values.albumin, 4);
      const wbc = Math.max(num(values.wbc, 6), 0.5);
      const f4 = fib4(age, ast, alt, plt);

      // Educational approximation of the published continuous functional forms:
      // LP is a log-hazard deviation from a reference patient (score ≈ 40 ↔ 6.4% 5-yr mortality).
      const lpAge = Math.min(Math.max(0.04 * (age - 45), -1.2), 2.5);
      const lpCd4 = Math.min(-0.65 * Math.log(Math.min(cd4, 800) / 500), 2.5);
      const lpRna = rna <= 500 ? 0 : Math.min(0.2 * Math.log(rna / 500), 1.6);
      const lpHgb = Math.min(Math.max(-0.4 * (hgb - 14), -1.2), 2.8);
      const lpFib = f4 > 1.45 ? Math.min(0.6 * Math.log(f4 / 1.45), 2.2) : 0;
      const lpGfr = egfr < 60 ? Math.min(1.0 * Math.log(60 / Math.max(egfr, 10)), 1.8) : 0;
      const lpHcv = bool(values.hcv) ? 0.35 : 0;
      const lpAlb = Math.min(Math.max(-0.55 * (alb - 4), -1.0), 2.0);
      const lpWbc = Math.min(Math.max(-0.4 * Math.log(wbc / 6), -0.8), 1.2);
      const lpBmi = bmi < 25 ? Math.min(-0.06 * (bmi - 25), 1.2) : Math.min(0.01 * (bmi - 25), 0.4);
      const lpSex = female ? -0.1 : 0;
      const lp = lpAge + lpCd4 + lpRna + lpHgb + lpFib + lpGfr + lpHcv + lpAlb + lpWbc + lpBmi + lpSex;
      // ~HR 2 per 10 points → 10/ln2 ≈ 14.4 points per log unit
      const score = Math.round(Math.min(Math.max(40 + 14.43 * lp, 0), 129));
      const mort = round(interp(score, VACS2_MORTALITY), 1);

      const band =
        score >= 70
          ? { riskLevel: 'critical' as const, label: 'Very high mortality risk' }
          : score >= 55
          ? { riskLevel: 'high' as const, label: 'High mortality risk' }
          : score >= 40
          ? { riskLevel: 'moderate' as const, label: 'Intermediate mortality risk' }
          : { riskLevel: 'low' as const, label: 'Lower mortality risk' };

      return {
        score,
        unit: 'points',
        label: band.label,
        interpretation: `Estimated VACS 2.0 score ≈${score} (observed range 0–129) → predicted 5-year all-cause mortality ≈${mort}% using the published North American calibration. Approximation — the exact component weights are in the Tate 2019 supplement.`,
        riskLevel: band.riskLevel,
        details: [
          { label: 'Score (approx.)', value: `${score} / 129` },
          { label: 'Est. 5-year mortality', value: `≈${mort}% (published calibration)` },
          { label: 'FIB-4', value: `${round(f4, 2)}` },
          { label: 'New v2.0 components', value: `Albumin ${alb} g/dL, WBC ${wbc}, BMI ${bmi}` },
        ],
        recommendations: [
          'Confirm with the official VACS Index 2.0 calculator when precision matters (published weights differ).',
          'Optimize modifiable components: nutrition/albumin, anemia, renal and hepatic disease, weight, and viral suppression.',
        ],
      };
    },
    evidence: {
      summary:
        'VACS Index 2.0 extends version 1.0 with albumin, WBC, and BMI using continuous functional forms; derived in the published cohort of 28,390 VACS patients and validated in 12,109 ART-CC patients (C 0.805/0.831). Score→5-year mortality calibration per McGinnis 2022 (score 40→6.4%, 60→19.8%, 100→74.3%).',
      formula:
        'Weighted sum of 13 components scaled ~0–129. This implementation approximates the published functional forms (educational); mortality mapping uses the published calibration table.',
      validation:
        'Exact component weights are published only in the supplement of Tate 2019; this tool reproduces the published direction and magnitude of each term and the published score→mortality table. C-statistics 0.80–0.84 in derivation/validation cohorts.',
      references: [
        {
          title: 'Albumin, white blood cell count, and body mass index improve discrimination of mortality in HIV-positive individuals',
          citation: 'Tate JP, Sterne JAC, Justice AC. AIDS. 2019;33(5):903-912',
          year: 2019,
          doi: '10.1097/QAD.0000000000002140',
        },
        {
          title: 'Discrimination and calibration of the Veterans Aging Cohort Study Index 2.0 for predicting mortality among people with HIV in North America',
          citation: 'McGinnis KA, Justice AC, Moore RD, et al. Clin Infect Dis. 2022;75(2):297-304',
          year: 2022,
          doi: '10.1093/cid/ciab883',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score ≥55', actions: ['Multidisciplinary review of organ injury (liver, renal, hematologic, nutritional)', 'Consider geriatric/frailty assessment and goals-of-care discussion'] },
      { condition: 'Score 40–54', actions: ['Address modifiable organ-injury markers', 'Repeat periodically to track physiologic frailty'] },
    ],
    pearls: [
      'Each ~10-point increase roughly doubles 5-year mortality in the published validation cohorts.',
      'Nadir CD4, CD8, and CD4:CD8 ratio did not improve prediction — current labs matter more.',
      'Sex-specific functional forms exist in the original model; female sex scored slightly lower.',
    ],
  },

  // ─── 3. Denver HIV Risk Score ──────────────────────────────────────────────
  {
    id: 'denver-hiv-risk',
    name: 'Denver HIV Risk Score',
    shortName: 'Denver HIV',
    description:
      'Validated behavioral/demographic score predicting probability of undiagnosed HIV infection to target screening.',
    category: 'infectious-disease',
    tags: ['hiv', 'screening', 'denver', 'haukoos', 'risk score', 'testing'],
    whenToUse: 'Adults in ED, clinic, or community settings when deciding whether to offer HIV testing.',
    whyUse:
      'The score stratifies patients into five risk strata (prevalence 0.3% to 3.6%); a cutoff ≥30 identifies patients who should be routinely offered HIV testing.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 13, max: 100, exampleValue: 34, helpText: '<22 or >60: 0; 22–25 or 55–60: +4; 26–32 or 47–54: +10; 33–46: +12.' }),
      selectInput('gender', 'Gender', [
        { label: 'Female', value: 'F', points: 0 },
        { label: 'Male', value: 'M', points: 21 },
      ], 'M', 'Male gender adds 21 points in the derivation model.'),
      selectInput('sexPractice', 'Sexual practices (highest-scoring applicable)', [
        { label: 'Sex with a male', value: 'msm', points: 22, description: 'Patient is male or has male partners' },
        { label: 'Receptive anal intercourse', value: 'rai', points: 8 },
        { label: 'Vaginal intercourse', value: 'vaginal', points: -10 },
        { label: 'None of the above', value: 'none', points: 0 },
      ], 'msm', 'Choose the single applicable practice yielding the highest score.'),
      yesNo('idu', 'Injection drug use', 9, 'Ever or current injection drug use adds 9 points.', false),
      yesNo('pastTest', 'Past HIV testing', -4, 'A previous HIV test is protective (−4 points).', true),
      selectInput('race', 'Race/ethnicity (optional)', [
        { label: 'Prefer not to say / not assessed', value: 'none', points: 0 },
        { label: 'White', value: 'white', points: 0 },
        { label: 'Other', value: 'other', points: 0 },
        { label: 'Hispanic', value: 'hispanic', points: 3 },
        { label: 'Black', value: 'black', points: 9 },
      ], 'none', 'Optional input. Race terms were part of the published score (Black +9, Hispanic +3) but may or may not improve estimates; leaving blank contributes 0.', false),
    ],
    calculate(values) {
      const age = num(values.age, 34);
      const agePts = age >= 33 && age <= 46 ? 12 : (age >= 26 && age <= 32) || (age >= 47 && age <= 54) ? 10 : (age >= 22 && age <= 25) || (age >= 55 && age <= 60) ? 4 : 0;
      const genderPts = str(values.gender) === 'M' ? 21 : 0;
      const practicePts = { msm: 22, rai: 8, vaginal: -10, none: 0 }[str(values.sexPractice, 'none')] ?? 0;
      const iduPts = bool(values.idu) ? 9 : 0;
      const testPts = bool(values.pastTest) ? -4 : 0;
      const racePts = { black: 9, hispanic: 3, white: 0, other: 0, none: 0 }[str(values.race, 'none')] ?? 0;
      const score = agePts + genderPts + practicePts + iduPts + testPts + racePts;

      const band =
        score >= 50
          ? { riskLevel: 'high' as const, label: 'Very high risk', prev: '≈3.6% HIV prevalence (≥50)' }
          : score >= 40
          ? { riskLevel: 'high' as const, label: 'High risk', prev: '≈1.6% HIV prevalence (40–49)' }
          : score >= 30
          ? { riskLevel: 'moderate' as const, label: 'Moderate risk', prev: '≈1.0% HIV prevalence (30–39)' }
          : score >= 20
          ? { riskLevel: 'low' as const, label: 'Low risk', prev: '≈0.4% HIV prevalence (20–29)' }
          : { riskLevel: 'low' as const, label: 'Very low risk', prev: '≈0.3% HIV prevalence (<20)' };

      return {
        score,
        unit: 'points',
        label: band.label,
        interpretation: `Denver HIV Risk Score ${score} (range −14 to +81): ${band.prev}. ${score >= 30 ? 'Score ≥30 — routinely offer HIV testing.' : 'Score <30 — universal screening still recommended once for ages 13–64 regardless of score.'}`,
        riskLevel: band.riskLevel,
        details: [
          { label: 'Age', value: `+${agePts}` },
          { label: 'Gender', value: `+${genderPts}` },
          { label: 'Sexual practices', value: `${practicePts >= 0 ? '+' : ''}${practicePts}` },
          { label: 'Injection drug use', value: `+${iduPts}` },
          { label: 'Past HIV testing', value: `${testPts}` },
          { label: 'Race/ethnicity', value: `+${racePts}` },
        ],
        recommendations: score >= 30
          ? ['Offer HIV Ag/Ab (4th generation) testing now', 'Confirmatory testing and linkage to care if positive', 'Discuss PrEP if test negative and risk persists']
          : ['Offer routine opt-out HIV testing per CDC (ages 13–64 at least once)', 'Re-screen periodically if risk factors persist'],
      };
    },
    evidence: {
      summary:
        'Denver HIV Risk Score (Haukoos 2012): age bands 0–12, male +21, race (Black +9, Hispanic +3), sex with a male +22, receptive anal intercourse +8, vaginal intercourse −10, IDU +9, past HIV test −4. Range −14 to +81; strata <20 (0.31%), 20–29 (0.41%), 30–39 (0.99%), 40–49 (1.59%), ≥50 (3.59%).',
      formula: 'Sum of 8 weighted demographic/behavioral items.',
      validation:
        'Derived from 92,635 STD-clinic patients and externally validated in 22,983 ED patients (AUC 0.85, calibration slope 0.95). Race/ethnicity terms follow the published score; race is optional here.',
      references: [
        {
          title: 'Derivation and validation of the Denver Human Immunodeficiency Virus (HIV) risk score for targeted HIV screening',
          citation: 'Haukoos JS, Lyons MS, Lindsell CJ, et al. Am J Epidemiol. 2012;175(8):838-846',
          year: 2012,
          doi: '10.1093/aje/kwr389',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score ≥30', actions: ['Offer HIV testing (Ag/Ab ± RNA)', 'Counsel on prevention and PrEP if negative', 'Repeat testing periodically while risk persists'] },
      { condition: 'Positive test', actions: ['Confirmatory testing', 'Linkage to HIV care and ART', 'Partner services per local law'] },
    ],
    pearls: [
      'The score augments, not replaces, opt-out screening — CDC recommends testing everyone 13–64 at least once.',
      'Vaginal intercourse scores −10: it is a protective predictor relative to other practices in the model.',
      'Race terms can be omitted without breaking the model, but omitting them lowers estimated risk for Black and Hispanic patients.',
    ],
  },

  // ─── 4. HIRI-MSM ───────────────────────────────────────────────────────────
  {
    id: 'hiri-msm',
    name: 'HIV Incidence Risk Index for MSM (HIRI-MSM)',
    shortName: 'HIRI-MSM',
    description:
      '7-item questionnaire identifying men who have sex with men at substantial risk of HIV acquisition; score ≥10 suggests PrEP evaluation.',
    category: 'infectious-disease',
    tags: ['hiv', 'msm', 'prep', 'hiri', 'screening', 'smith'],
    isQuestionnaire: true,
    whenToUse: 'HIV-negative men who have sex with men when assessing eligibility for PrEP and screening frequency.',
    whyUse:
      'HIRI-MSM is a CDC-developed index predicting incident HIV infection; a score ≥10 identifies MSM at substantial risk who benefit most from PrEP and intensified screening.',
    inputs: [
      numberInput('age', 'Age today', { unit: 'years', min: 13, max: 100, exampleValue: 30, helpText: '18–28: +8; 29–40: +5; 41–48: +2; <18 or ≥49: 0.' }),
      selectInput('partners', 'How many men have you had sex with in the last 6 months?', [
        { label: '0–5', value: 0, points: 0 },
        { label: '6–10', value: 4, points: 4 },
        { label: '>10', value: 7, points: 7 },
      ], 4, 'Number of male sex partners in the past 6 months.'),
      selectInput('receptive', 'Times of receptive anal sex (you were the bottom) without a condom, last 6 months', [
        { label: '0', value: 0, points: 0 },
        { label: '≥1', value: 10, points: 10 },
      ], 0, 'Any condomless receptive anal intercourse scores 10 — the largest single item.'),
      selectInput('hivPartners', 'How many of your male sex partners were HIV-positive?', [
        { label: '0', value: 0, points: 0 },
        { label: '1', value: 4, points: 4 },
        { label: '>1', value: 8, points: 8 },
      ], 0, 'Partners known or believed to be HIV-positive.'),
      selectInput('insertive', 'Times of insertive anal sex (you were the top) without a condom with an HIV-positive man, last 6 months', [
        { label: '0–4', value: 0, points: 0 },
        { label: '≥5', value: 6, points: 6 },
      ], 0, 'Five or more episodes of condomless insertive anal sex with an HIV-positive partner.'),
      yesNo('meth', 'Methamphetamine use (crystal, speed) in the last 6 months', 5, 'Any methamphetamine use in the past 6 months.', false),
      yesNo('poppers', 'Poppers (amyl nitrite) use in the last 6 months', 3, 'Any inhaled nitrite use in the past 6 months.', false),
    ],
    calculate(values) {
      const age = num(values.age, 30);
      const agePts = age >= 18 && age <= 28 ? 8 : age >= 29 && age <= 40 ? 5 : age >= 41 && age <= 48 ? 2 : 0;
      const score =
        agePts +
        num(values.partners) +
        num(values.receptive) +
        num(values.hivPartners) +
        num(values.insertive) +
        (bool(values.meth) ? 5 : 0) +
        (bool(values.poppers) ? 3 : 0);
      const high = score >= 10;

      return {
        score,
        unit: 'points',
        label: high ? 'High risk — PrEP evaluation indicated' : 'Lower risk',
        interpretation: high
          ? `HIRI-MSM ${score} ≥10: substantial risk of HIV acquisition. Recommend PrEP evaluation and routine HIV/STI screening every 3–6 months.`
          : `HIRI-MSM ${score} <10: below the high-risk threshold. PrEP may still be appropriate — use shared decision-making; continue routine screening.`,
        riskLevel: high ? 'high' : 'low',
        details: [
          { label: 'Age points', value: `+${agePts}` },
          { label: 'Threshold', value: '≥10 = high risk (CDC/HIRI-MSM)' },
        ],
        recommendations: high
          ? ['Initiate or refer for PrEP (daily oral TDF/FTC, TAF/FTC, or long-acting cabotegravir)', 'HIV Ag/Ab + STI screening now and q3–6 months', 'Harm-reduction counseling for methamphetamine use if applicable']
          : ['Offer PrEP by shared decision-making if any risk factors present', 'Repeat HIRI-MSM and HIV/STI screening periodically'],
      };
    },
    evidence: {
      summary:
        'HIRI-MSM (Smith 2012): age 18–28 +8, 29–40 +5, 41–48 +2; 6–10 partners +4, >10 +7; any condomless receptive anal sex +10; 1 HIV+ partner +4, >1 +8; ≥5 condomless insertive acts with HIV+ partner +6; methamphetamine +5; poppers +3. Score ≥10 = substantial risk.',
      formula: 'Sum of 7 weighted items (range 0–45).',
      validation:
        'Developed from US MSM cohorts and externally validated in multiple studies; pooled AUC ~0.68–0.83 in meta-analyses. CDC uses ≥10 to flag MSM who would benefit most from PrEP.',
      references: [
        {
          title: 'Development of a clinical screening index predictive of incident HIV infection among men who have sex with men in the United States',
          citation: 'Smith DK, Pals SL, Herbst JH, Shinde S, Carey JW. J Acquir Immune Defic Syndr. 2012;60(4):421-427',
          year: 2012,
        },
      ],
    },
    nextSteps: [
      { condition: 'Score ≥10', actions: ['Offer PrEP and risk-reduction counseling', 'Screen for STIs every 3–6 months', 'Refer for substance-use services if methamphetamine use'] },
      { condition: 'Score <10 with ongoing risk', actions: ['Discuss PrEP by shared decision-making', 'Repeat screening periodically'] },
    ],
    pearls: [
      'A single episode of condomless receptive anal sex already scores 10 — meeting the high-risk threshold.',
      'Score does not capture self-perceived risk well; many high-risk men underestimate their risk.',
      'Local cutoffs (e.g., ≥25) have been studied for resource allocation but CDC guidance uses ≥10.',
    ],
  },

  // ─── 5. Menza Score ────────────────────────────────────────────────────────
  {
    id: 'menza-score',
    name: 'Menza Score (HIV Acquisition Risk in MSM)',
    shortName: 'Menza',
    description:
      '4-item score predicting 4-year risk of HIV acquisition in men who have sex with men; ≥1 suggests intensified prevention.',
    category: 'infectious-disease',
    tags: ['hiv', 'msm', 'menza', 'prep', 'risk score'],
    isQuestionnaire: true,
    whenToUse: 'HIV-negative MSM when stratifying risk of HIV acquisition to target prevention interventions.',
    whyUse:
      'The Menza score was derived and validated to predict 4-year HIV incidence in MSM; a cutoff ≥1 identifies most seroconverters and flags candidates for PrEP and intensified screening.',
    inputs: [
      yesNo('sti', 'Gonorrhea, chlamydia, or syphilis — current or history', 4, 'Diagnosis of gonorrhea, chlamydia, or syphilis currently or in the past.', false),
      yesNo('drugs', 'Methamphetamine or inhaled nitrites (poppers) in the prior 6 months', 11, 'Any methamphetamine or popper use in the previous 6 months — the heaviest-weighted item.', false),
      yesNo('uai', 'Unprotected anal intercourse with an HIV-positive or unknown-status partner in the prior year', 1, 'Condomless anal intercourse in the prior 12 months with a partner of positive or unknown HIV status.', false),
      yesNo('partners10', '10 or more male sexual partners in the prior year', 3, 'Ten or more male partners in the previous 12 months.', false),
    ],
    calculate(values) {
      const score =
        (bool(values.sti) ? 4 : 0) +
        (bool(values.drugs) ? 11 : 0) +
        (bool(values.uai) ? 1 : 0) +
        (bool(values.partners10) ? 3 : 0);
      const high = score >= 1;
      return {
        score,
        unit: 'points',
        label: high ? 'High risk — targeted prevention indicated' : 'Lower risk',
        interpretation: high
          ? `Menza score ${score} ≥1: high risk of HIV acquisition over 4 years. Offer PrEP evaluation, condoms, and intensified HIV/STI screening.`
          : 'Menza score 0: below the published high-risk threshold. Continue routine periodic HIV/STI screening.',
        riskLevel: high ? 'high' : 'low',
        details: [
          { label: 'Bacterial STI (current/history)', value: bool(values.sti) ? '+4' : '0' },
          { label: 'Methamphetamine/poppers', value: bool(values.drugs) ? '+11' : '0' },
          { label: 'UAI with HIV+/unknown partner', value: bool(values.uai) ? '+1' : '0' },
          { label: '≥10 partners/year', value: bool(values.partners10) ? '+3' : '0' },
        ],
        recommendations: high
          ? ['Offer PrEP (daily oral or long-acting cabotegravir)', 'HIV and STI screening every 3 months', 'Risk-reduction and substance-use counseling']
          : ['Routine HIV/STI screening per CDC', 'Repeat risk assessment periodically'],
      };
    },
    evidence: {
      summary:
        'Menza score (Menza 2009): bacterial STI +4, methamphetamine or poppers +11, UAI with HIV+/unknown partner +1, ≥10 partners +3. Validation and clinical studies used a cutoff of ≥1 to identify high-risk individuals.',
      formula: 'Sum of 4 items (range 0–19).',
      validation:
        'Derived in Seattle/King County MSM and externally validated (pooled AUC ~0.7 in systematic reviews). Note: this Menza instrument measures HIV-acquisition risk — it is not an anal-cancer/HSIL score.',
      references: [
        {
          title: 'Prediction of HIV acquisition among men who have sex with men',
          citation: 'Menza TW, Hughes JP, Celum CL, Golden MR. Sex Transm Dis. 2009;36(9):547-555',
          year: 2009,
          doi: '10.1097/OLQ.0b013e3181a9cc41',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score ≥1', actions: ['PrEP evaluation', '3-month HIV/STI screening', 'Substance-use support if stimulant/nitrite use'] },
    ],
    pearls: [
      'Methamphetamine or popper use alone (11 points) exceeds the ≥1 threshold by far — prioritize these patients.',
      'The score predicts HIV acquisition, not undiagnosed prevalent infection — pair with HIV testing.',
      'Any single positive item meets the high-risk cutoff, so the score functions mainly as a minimal-risk screen.',
    ],
  },

  // ─── 6. Shapiro Rule ───────────────────────────────────────────────────────
  {
    id: 'shapiro-rule',
    name: 'Shapiro Rule (Blood Culture Decision)',
    shortName: 'Shapiro',
    description:
      'Decision rule indicating whether an ED patient with suspected infection should have blood cultures drawn (1 major or ≥2 minor criteria).',
    category: 'infectious-disease',
    tags: ['bacteremia', 'blood culture', 'sepsis', 'shapiro', 'emergency'],
    whenToUse:
      'Emergency department patients with suspected infection when deciding whether blood cultures are warranted.',
    whyUse:
      'The Shapiro rule identifies patients at low risk of true bacteremia in whom cultures may be omitted, while maintaining high sensitivity when any major or ≥2 minor criteria are present.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 18, max: 110, exampleValue: 70, helpText: 'Age >65 is a minor criterion (+1).' }),
      numberInput('temp', 'Temperature', { unit: '°C', min: 34, max: 42, step: 0.1, exampleValue: 38.8, helpText: '38.3–39.3°C = minor (+1); ≥39.4°C (103°F) = major criterion.' }),
      yesNo('endocarditis', 'Suspected endocarditis', 3, 'Clinical suspicion of infective endocarditis is a major criterion — always culture.', false),
      yesNo('catheter', 'Indwelling vascular catheter', 2, 'Any indwelling vascular catheter is a major criterion.', false),
      yesNo('chills', 'Chills', 1, 'Rigors or shaking chills with this presentation.', false),
      yesNo('vomiting', 'Vomiting', 1, 'Vomiting associated with this presentation.', false),
      yesNo('hypotension', 'Hypotension (SBP <90 mm Hg)', 1, 'Systolic blood pressure below 90 mm Hg.', false),
      yesNo('wbc18', 'WBC >18,000 cells/mm³', 1, 'Leukocytosis above 18,000/mm³.', false),
      yesNo('bands', 'Bands >5%', 1, 'Bandemia >5% on differential.', false),
      yesNo('plt150', 'Platelets <150,000 cells/mm³', 1, 'Thrombocytopenia below 150,000/mm³.', false),
      yesNo('cr2', 'Creatinine >2.0 mg/dL', 1, 'Serum creatinine above 2.0 mg/dL.', false),
    ],
    calculate(values) {
      const age = num(values.age, 65);
      const temp = num(values.temp, 37);
      const major =
        (temp >= 39.4 ? 1 : 0) +
        (bool(values.endocarditis) ? 1 : 0) +
        (bool(values.catheter) ? 1 : 0);
      const minor =
        (age > 65 ? 1 : 0) +
        (temp >= 38.3 && temp < 39.4 ? 1 : 0) +
        (bool(values.chills) ? 1 : 0) +
        (bool(values.vomiting) ? 1 : 0) +
        (bool(values.hypotension) ? 1 : 0) +
        (bool(values.wbc18) ? 1 : 0) +
        (bool(values.bands) ? 1 : 0) +
        (bool(values.plt150) ? 1 : 0) +
        (bool(values.cr2) ? 1 : 0);
      const score = major + minor;
      const culture = major >= 1 || minor >= 2;

      return {
        score,
        unit: 'criteria',
        label: culture ? 'Blood culture recommended' : 'Low risk — culture may be omitted',
        interpretation: culture
          ? `${major} major and ${minor} minor criteria: blood cultures are recommended by the Shapiro Rule (≥1 major or ≥2 minor). Obtain 2 sets before antibiotics if this does not delay therapy.`
          : `${major} major and ${minor} minor criteria: below the Shapiro threshold for blood culture. Clinical judgment may still justify cultures (e.g., immunocompromise).`,
        riskLevel: culture ? 'high' : 'low',
        details: [
          { label: 'Major criteria (≥39.4°C, endocarditis, catheter)', value: `${major}` },
          { label: 'Minor criteria (9 items)', value: `${minor}` },
          { label: 'Rule', value: 'Culture if ≥1 major OR ≥2 minor' },
        ],
        recommendations: culture
          ? ['Draw two sets of blood cultures before antibiotics when feasible', 'Assess for sepsis (qSOFA/NEWS2) and source control']
          : ['No rule overrides judgment — culture if clinical suspicion of bacteremia, endocarditis, or immunocompromise'],
      };
    },
    evidence: {
      summary:
        'Shapiro rule (Shapiro 2008): major criteria = temperature ≥39.4°C, suspected endocarditis, indwelling vascular catheter; minor criteria = temperature 38.3–39.3°C, age >65, chills, vomiting, hypotension (SBP<90), WBC >18k, bands >5%, platelets <150k, creatinine >2.0. Culture if ≥1 major or ≥2 minor.',
      formula: 'Count of major and minor criteria.',
      validation:
        'Prospectively derived and validated in ~4,500 ED patients; sensitivity for true bacteremia ~97–98% at the published threshold while reducing unnecessary cultures.',
      references: [
        {
          title: 'Who needs a blood culture? A prospectively derived and validated prediction rule',
          citation: 'Shapiro NI, Wolfe RE, Wright SB, Moore R, Bates DW. J Emerg Med. 2008;35(3):255-264',
          year: 2008,
        },
      ],
    },
    nextSteps: [
      { condition: 'Rule positive', actions: ['Two blood-culture sets pre-antibiotics', 'Evaluate sepsis severity and source', 'Repeat cultures if persistent fever or endocarditis suspected'] },
      { condition: 'Rule negative but high suspicion', actions: ['Culture anyway for immunocompromised, endocarditis suspicion, or sepsis'] },
    ],
    pearls: [
      'Suspected endocarditis always warrants cultures (≥3 sets ideally) regardless of other criteria.',
      'The rule predicts true bacteremia; contaminated cultures are a separate problem of technique.',
      'Do not delay antibiotics in septic shock to obtain cultures.',
    ],
  },

  // ─── 7. Perioperative Anticoagulation Management ──────────────────────────
  {
    id: 'periop-anticoag-management',
    name: 'Perioperative Anticoagulation Management (PAUSE/CHEST 2022)',
    shortName: 'Periop AC',
    description:
      'Guides when to stop and resume warfarin or DOACs around elective procedures by drug, renal function, and procedural bleed risk; includes bridging guidance.',
    category: 'hematology',
    tags: ['anticoagulation', 'perioperative', 'pause', 'warfarin', 'doac', 'chest', 'bridging'],
    whenToUse:
      'Patients on warfarin or DOACs (apixaban, dabigatran, edoxaban, rivaroxaban) undergoing elective surgery/procedures.',
    whyUse:
      'Standardized periprocedural interruption (PAUSE protocol, endorsed by 2022 CHEST guidelines) avoids excessive interruption while keeping bleeding risk low; bridging is reserved for a small high-thrombotic-risk minority.',
    inputs: [
      selectInput('drug', 'Anticoagulant', [
        { label: 'Warfarin', value: 'warfarin' },
        { label: 'Apixaban', value: 'apixaban' },
        { label: 'Dabigatran', value: 'dabigatran' },
        { label: 'Edoxaban', value: 'edoxaban' },
        { label: 'Rivaroxaban', value: 'rivaroxaban' },
      ], 'apixaban', 'The drug determines the interruption interval — dabigatran also depends on renal function.'),
      selectInput('bleedRisk', 'Procedure bleeding risk', [
        { label: 'Low to moderate', value: 'low', description: 'e.g., minor dental/derm, cataracts, most laparoscopic/general/orthopedic procedures' },
        { label: 'High', value: 'high', description: 'e.g., cardiac/thoracic/major cancer or reconstructive surgery, neuraxial procedures, major urologic/bowel resection, re-do surgery' },
      ], 'low', 'PAUSE/CHEST two-tier bleed-risk classification of the planned procedure.'),
      selectInput('crcl', 'Creatinine clearance (for dabigatran)', [
        { label: '≥50 mL/min', value: 'ok' },
        { label: '30–49 mL/min', value: 'mod' },
        { label: '<30 mL/min or dialysis', value: 'severe' },
        { label: 'Unknown / not on dabigatran', value: 'na' },
      ], 'ok', 'Renal function only changes the plan for dabigatran; for other drugs choose “not on dabigatran”.'),
      selectInput('thrombosis', 'Thromboembolic context (bridging assessment)', [
        { label: 'None of the high-risk features below', value: 'standard' },
        { label: 'Mechanical mitral valve, older mechanical valve, or valve + stroke risk factors, or recent (<3 mo) valve thrombosis/embolism', value: 'valve' },
        { label: 'AF with CHA₂DS₂-VASc ≥7, recent (<3 mo) stroke/TIA, or rheumatic valvular disease', value: 'af' },
        { label: 'VTE <3 months ago, severe thrombophilia, APS, or high-risk cancer (pancreatic/gastric/esophageal/brain/MPN)', value: 'vte' },
      ], 'standard', 'Bridging (full-dose LMWH) is suggested only for these high-thrombotic-risk situations — mainly during warfarin interruption.'),
    ],
    calculate(values) {
      const drug = str(values.drug, 'apixaban');
      const highBleed = str(values.bleedRisk) === 'high';
      const crcl = str(values.crcl, 'ok');
      const context = str(values.thrombosis, 'standard');
      const bridgeIndicated = drug === 'warfarin' && context !== 'standard';

      let lastDose = '';
      let offDays = '';
      let resume = '';
      const alerts: string[] = [];

      if (drug === 'warfarin') {
        lastDose = 'Stop warfarin ~5 days before surgery (last dose ~day −6; confirm INR ≤1.5, ideally ~1.0–1.2, on day −1).';
        offDays = 'INR-normalized interval ~4–5 days.';
        resume = highBleed
          ? 'Resume warfarin the evening after surgery or next day as hemostasis allows; therapeutic anticoagulation (if bridging) deferred ~48–72 h for high-bleed-risk procedures.'
          : 'Resume warfarin the evening of surgery or the next day; expect ~5 days to re-therapeutic INR.';
      } else {
        let off = highBleed ? 2 : 1; // drug-free days before procedure
        if (drug === 'dabigatran') {
          if (crcl === 'mod') off = highBleed ? 4 : 2;
          else if (crcl === 'severe') {
            off = highBleed ? 4 : 2;
            alerts.push('Dabigatran with CrCl <30 mL/min is contraindicated in labeling — consider alternative agent and longer interruption; specialist input advised.');
          }
        } else if (crcl === 'severe' && drug !== 'dabigatran') {
          alerts.push('Severe renal impairment may prolong DOAC clearance — consider an extra day of interruption and/or drug-level testing.');
        }
        lastDose = `Last dose on day −${off + 1} (omit the drug for ${off} full day${off > 1 ? 's' : ''} before the procedure).`;
        offDays = `${off} day${off > 1 ? 's' : ''} off drug pre-procedure (PAUSE).`;
        resume = highBleed
          ? 'Resume ~48–72 h after surgery (day +2 to +3) once hemostasis is secure.'
          : 'Resume ~24 h after surgery (day +1) once hemostasis is secure.';
      }

      const bridgeText =
        drug !== 'warfarin'
          ? 'Bridging not recommended during DOAC interruption for elective procedures.'
          : bridgeIndicated
          ? 'Bridging suggested: full-dose SC LMWH (enoxaparin 1 mg/kg BID or 1.5 mg/kg daily; or dalteparin 100 IU/kg BID or 200 IU/kg daily) starting ~3 days before, last dose AM of day −1 at half the total daily dose; resume ~24 h post-op for low-bleed or 48–72 h for high-bleed-risk procedures.'
          : 'Bridging NOT suggested for low-to-moderate thrombotic risk during warfarin interruption.';

      const doac = drug !== 'warfarin';
      return {
        score: highBleed ? 'High bleed risk' : 'Low/moderate bleed risk',
        label: `${drug.charAt(0).toUpperCase() + drug.slice(1)} — periprocedural plan`,
        interpretation: `${lastDose} ${resume} ${bridgeText}`,
        riskLevel: highBleed || bridgeIndicated ? 'moderate' : 'low',
        alerts,
        details: [
          { label: 'Last dose', value: lastDose },
          { label: 'Drug-free interval', value: offDays },
          { label: 'Resumption', value: resume },
          { label: 'Bridging', value: bridgeText },
        ],
        recommendations: [
          doac ? 'Do not use heparin bridging for DOAC interruption.' : 'Check INR the day before surgery; give 1–2 mg oral vitamin K if INR still ≥1.5.',
          'For urgent procedures, a DOAC level (anti-Xa or dilute thrombin time for dabigatran) can guide timing.',
          'Individualize for severe renal/hepatic impairment and interacting drugs (CYP3A4/P-gp inhibitors).',
        ],
      };
    },
    evidence: {
      summary:
        'PAUSE protocol: apixaban/rivaroxaban/edoxaban — omit 1 day (low/moderate bleed risk) or 2 days (high risk) before the procedure; dabigatran same for CrCl ≥50, and 2/4 days for CrCl 30–49. Resume ~24 h (low/moderate) or 48–72 h (high) post-op. Warfarin stopped ~5 days pre-op; LMWH bridging only for high-thrombotic-risk patients.',
      formula: 'Drug- and renal-function-specific interruption intervals; no routine bridging.',
      validation:
        'PAUSE (JAMA Intern Med 2019) demonstrated low major bleeding (~1.4%) and arterial thromboembolism (~0.2%) without bridging. The 2022 CHEST guideline endorses this approach and suggests bridging only in the high-thrombotic-risk groups listed.',
      references: [
        {
          title: 'Executive summary: perioperative management of antithrombotic therapy — antithrombotic therapy and prevention of thrombosis, 9th ed update / CHEST 2022 guideline',
          citation: 'Douketis JD, Spyropoulos AC, Murad MH, et al. Chest. 2022;162(1):207-243',
          year: 2022,
          pmid: '35964704',
          doi: '10.1016/j.chest.2022.07.025',
        },
        {
          title: 'Perioperative management of patients with atrial fibrillation receiving a direct oral anticoagulant (PAUSE)',
          citation: 'Douketis JD, Spyropoulos AC, Duncan J, et al. JAMA Intern Med. 2019;179(11):1469-1478',
          year: 2019,
          doi: '10.1001/jamainternmed.2019.3977',
        },
      ],
    },
    nextSteps: [
      { condition: 'Warfarin, high thrombotic risk', actions: ['LMWH bridging days −3 to −1 (last dose AM day −1 at half dose)', 'Resume LMWH ~24 h (low-bleed) or 48–72 h (high-bleed) post-op'] },
      { condition: 'DOAC, high-bleed-risk procedure', actions: ['Omit 2 days pre-op (4 if dabigatran + CrCl 30–49)', 'Resume 48–72 h post-op', 'No bridging'] },
      { condition: 'Urgent surgery', actions: ['Measure DOAC level if feasible', 'Consider reversal agents only for life-threatening bleeding'] },
    ],
    pearls: [
      '“Days off” counts full 24-h days without drug before the procedure, not calendar days.',
      'Neuraxial anesthesia has its own ASRA timing rules — coordinate with anesthesia.',
      'Resuming too early after high-bleed-risk surgery is the commonest source of postoperative bleeding.',
    ],
  },

  // ─── 8. Adult Immunization Schedule ───────────────────────────────────────
  {
    id: 'immunization-adult',
    name: 'Adult Immunization Schedule (ACIP-Based)',
    shortName: 'Immunizations',
    description:
      'Age- and condition-based checklist generating the vaccines currently indicated for an adult per CDC/ACIP recommendations.',
    category: 'general',
    tags: ['vaccine', 'immunization', 'acip', 'cdc', 'prevention', 'zoster', 'pneumococcal', 'rsv'],
    whenToUse: 'Adults (≥19 years) at preventive visits to generate a due-vaccine checklist by age and risk conditions.',
    whyUse:
      'ACIP adult recommendations combine universal age-based vaccines with condition-triggered ones; a structured checklist reduces missed vaccination opportunities.',
    inputs: [
      selectInput('ageBand', 'Age', [
        { label: '19–26 years', value: 'young' },
        { label: '27–49 years', value: 'adult' },
        { label: '50–64 years', value: 'mid' },
        { label: '65–74 years', value: 'senior' },
        { label: '≥75 years', value: 'old' },
      ], 'mid', 'Age drives HPV, zoster, pneumococcal, and RSV recommendations.'),
      yesNo('pregnant', 'Currently pregnant', null, 'Pregnancy changes recommendations: Tdap each pregnancy; live vaccines (MMR, varicella) are contraindicated; inactivated influenza/COVID-19 are recommended.', false),
      yesNo('immunocomp', 'Immunocompromised', null, 'HIV with low CD4, transplant, immunosuppressive therapy, hematologic malignancy — triggers earlier pneumococcal/zoster and meningococcal indications; live vaccines often contraindicated.', false),
      yesNo('asplenia', 'Asplenia or complement deficiency', null, 'Anatomic/functional asplenia or complement inhibitor use/deficiency — triggers meningococcal ACWY + B series and earlier pneumococcal.', false),
      yesNo('chronic', 'Chronic heart, lung, liver, or kidney disease', null, 'Chronic cardiac/pulmonary/hepatic/renal disease, alcoholism — triggers earlier pneumococcal and hepatitis B risk indications.', false),
      yesNo('diabetes', 'Diabetes mellitus', null, 'Diabetes is an indication for hepatitis B vaccination (<60 years) and pneumococcal vaccination before age 50.', false),
      yesNo('hcw', 'Healthcare worker or high exposure risk', null, 'Healthcare/institutional exposure — strengthens HepB, MMR, varicella, and influenza indications.', false),
      yesNo('priorTdap', 'Ever received Tdap', null, 'At least one lifetime Tdap dose; Td or Tdap booster is still due every 10 years.', true),
      yesNo('hepbDone', 'Completed hepatitis B series', null, 'Documented completion of a HepB series or serologic immunity.', true),
      yesNo('mmrVarImmune', 'Evidence of MMR and varicella immunity', null, 'Born before 1957 counts for MMR in most settings; varicella needs disease history, titers, or documented 2-dose series.', true),
    ],
    calculate(values) {
      const band = str(values.ageBand, 'mid');
      const age = { young: 22, adult: 38, mid: 57, senior: 70, old: 80 }[band] ?? 57;
      const pregnant = bool(values.pregnant);
      const immunocomp = bool(values.immunocomp);
      const asplenia = bool(values.asplenia);
      const chronic = bool(values.chronic);
      const diabetes = bool(values.diabetes);
      const hcw = bool(values.hcw);
      const riskCondition = immunocomp || asplenia || chronic || diabetes;

      const due: string[] = [];
      const notes: string[] = [];

      due.push('Influenza — 1 dose annually (all adults)');
      due.push('COVID-19 — current seasonal dose per CDC');
      if (pregnant) due.push('Tdap — 1 dose during EACH pregnancy (27–36 weeks)');
      if (!bool(values.priorTdap)) due.push('Tdap — 1 dose now if never received');
      due.push('Td or Tdap — booster every 10 years');

      if (band === 'young') due.push('HPV — complete series if not previously vaccinated (routine through age 26)');
      if (band === 'adult') due.push('HPV — ages 27–45: shared clinical decision if incompletely vaccinated');
      if (age >= 50 || immunocomp) due.push(`Zoster (RZV) — 2 doses ${immunocomp && age < 50 ? '(recommended ≥19 y if immunocompromised)' : '(age ≥50)'}`);
      if (age >= 50 || riskCondition) due.push('Pneumococcal — PCV20 or PCV21 once (or PCV15 followed by PPSV23)' + (age < 50 ? ' — risk-based' : ' — routine ≥50'));
      if (age >= 75) due.push('RSV — single dose (all adults ≥75)');
      else if (age >= 60 && riskCondition) due.push('RSV — single dose (ages 60–74 with risk conditions)');
      if (!bool(values.hepbDone)) due.push('Hepatitis B — series (universal through age 59; ≥60 by risk/shared decision)' + (diabetes && age < 60 ? ' — diabetes indication' : ''));
      if (chronic || immunocomp || hcw) due.push('Hepatitis A — if not immune and risk factors (liver disease, exposure, travel, occupational)');
      if (!bool(values.mmrVarImmune) && !pregnant && !immunocomp) {
        due.push(`MMR — ≥1 dose${hcw ? ' (2 doses for healthcare workers)' : ''} if no evidence of immunity`);
        due.push('Varicella — 2 doses if no evidence of immunity');
      }
      if (asplenia || immunocomp) {
        due.push('Meningococcal ACWY — series + boosters (asplenia/complement deficiency/inhibitor use)');
        due.push('Meningococcal B — series + boosters (asplenia/complement deficiency/inhibitor use)');
      } else if (band === 'young') {
        due.push('Meningococcal B — ages 16–23 shared clinical decision');
      }
      due.push('Mpox / polio catch-up / travel vaccines — assess individual risk, occupation, and travel');

      if (pregnant) notes.push('Live vaccines (MMR, varicella) are contraindicated in pregnancy — vaccinate postpartum if nonimmune.');
      if (immunocomp) notes.push('Live vaccines may be contraindicated with immunosuppression — verify before MMR/varicella/zoster-live.');

      return {
        score: due.length,
        unit: 'vaccines due',
        label: `${due.length} vaccine item${due.length === 1 ? '' : 's'} indicated`,
        interpretation: `ACIP-based checklist for an adult in the ${band} age band: ${due.length} vaccination items to review. Verify against the current CDC adult schedule and the patient's records.`,
        riskLevel: 'info',
        details: due.map((v) => ({ label: 'Due', value: v })),
        recommendations: [
          ...notes,
          'Screen for contraindications (pregnancy for live vaccines, severe allergy to components).',
          'Document administration and update the state immunization registry.',
        ],
      };
    },
    evidence: {
      summary:
        'Checklist mirrors CDC/ACIP adult immunization schedule: annual influenza and COVID-19; Tdap once + Td/Tdap q10y and each pregnancy; HPV through 26 (shared decision 27–45); RZV ≥50 (or ≥19 if immunocompromised); pneumococcal ≥50 or risk-based; RSV ≥75 (60–74 risk-based); HepB universal <60 and risk-based ≥60; HepA risk-based; MMR/varicella for nonimmune; meningococcal for risk groups.',
      formula: 'Age band × condition flags → indicated vaccine list.',
      validation:
        'Logic follows the published CDC adult immunization schedule notes (2024–2025). Recommendations change — always verify against the current CDC schedule.',
      references: [
        {
          title: 'CDC Adult Immunization Schedule (current)',
          citation: 'Advisory Committee on Immunization Practices / CDC',
          url: 'https://www.cdc.gov/vaccines/hcp/imz-schedules/adult-age.html',
        },
      ],
    },
    nextSteps: [
      { condition: 'Any due items', actions: ['Offer same-day vaccination', 'Screen contraindications', 'Schedule series completion'] },
      { condition: 'Immunocompromised', actions: ['Review live-vaccine contraindications', 'Earlier pneumococcal, zoster, and meningococcal indications apply'] },
    ],
    pearls: [
      'Catch-up vaccination does not require restarting a series — resume where the schedule left off.',
      'Pneumococcal options changed recently: PCV20/PCV21 alone or PCV15 + PPSV23; ACIP lowered the routine adult age to 50.',
      'RSV vaccine is currently a single dose for ≥75, and for 60–74 with risk conditions.',
    ],
  },

  // ─── 9. Paxlovid Indications ───────────────────────────────────────────────
  {
    id: 'paxlovid-indications',
    name: 'Indications for Paxlovid (Nirmatrelvir-Ritonavir)',
    shortName: 'Paxlovid',
    description:
      'Eligibility checklist for ritonavir-boosted nirmatrelvir in nonhospitalized COVID-19 patients at high risk of progression, with renal dosing.',
    category: 'infectious-disease',
    tags: ['covid', 'paxlovid', 'nirmatrelvir', 'ritonavir', 'antiviral', 'epic-hr'],
    whenToUse: 'Symptomatic COVID-19-positive outpatients (or those hospitalized for other reasons) to determine Paxlovid eligibility and dose.',
    whyUse:
      'Paxlovid reduces progression to severe COVID-19 when started within 5 days of symptoms in high-risk patients; eligibility requires confirming risk status, timing, hepatic function, renal dose, and drug interactions.',
    inputs: [
      yesNo('ageWt', '>12 years old AND >40 kg', null, 'FDA approval covers adults; EUA covers ≥12 years and ≥40 kg at high risk.', true),
      yesNo('mildMod', 'Mild-to-moderate COVID-19', null, 'Symptomatic COVID without need for supplemental oxygen or hospitalization for COVID itself.', true),
      yesNo('days5', 'Symptoms began ≤5 days ago', null, 'Efficacy established when started within 5 days of symptom onset.', true),
      yesNo('highRisk', '≥1 high-risk condition for severe COVID', null, 'Age ≥50–65, obesity (BMI ≥25–30), diabetes, chronic heart/lung/kidney/liver disease, immunocompromise, cancer, pregnancy, smoking, disability, or unvaccinated status — per CDC/NIH lists.', true),
      yesNo('severeHepatic', 'Severe hepatic impairment (Child-Pugh C)', null, 'Paxlovid is not recommended in Child-Pugh class C cirrhosis.', false),
      yesNo('interactions', 'Taking medications with serious ritonavir interactions', null, 'e.g., certain antiarrhythmics, anticonvulsants, statins, anticoagulants, immunosuppressants, rifampin, St. John’s wort — check the Liverpool interaction checker; some are absolute contraindications.', false),
      numberInput('egfr', 'eGFR', { unit: 'mL/min', min: 5, max: 150, exampleValue: 70, helpText: 'Determines dose: >60 standard; 30–59 reduced; <30 daily regimen (dialysis: dose after HD).' }),
    ],
    calculate(values) {
      const egfr = num(values.egfr, 60);
      const eligible =
        bool(values.ageWt) &&
        bool(values.mildMod) &&
        bool(values.days5) &&
        bool(values.highRisk) &&
        !bool(values.severeHepatic) &&
        !bool(values.interactions);
      const dose =
        egfr >= 60
          ? 'Nirmatrelvir 300 mg + ritonavir 100 mg PO BID × 5 days'
          : egfr >= 30
          ? 'Nirmatrelvir 150 mg + ritonavir 100 mg PO BID × 5 days'
          : 'Day 1: 300/100 mg once daily; days 2–5: 150/100 mg once daily (after dialysis on HD days)';

      const reasons: string[] = [];
      if (!bool(values.ageWt)) reasons.push('age/weight criteria not met');
      if (!bool(values.mildMod)) reasons.push('disease not mild-moderate');
      if (!bool(values.days5)) reasons.push('beyond 5-day symptom window');
      if (!bool(values.highRisk)) reasons.push('no high-risk condition');
      if (bool(values.severeHepatic)) reasons.push('severe hepatic impairment');
      if (bool(values.interactions)) reasons.push('contraindicated interacting medication');

      return {
        score: eligible ? 'Eligible' : 'Not eligible',
        label: eligible ? 'Paxlovid appropriate' : 'Paxlovid not appropriate',
        interpretation: eligible
          ? `Meets criteria for Paxlovid. ${dose}. Screen for drug interactions before prescribing (ritonavir is a strong CYP3A4/P-gp inhibitor).`
          : `Does not meet Paxlovid criteria: ${reasons.join('; ')}. Consider alternatives per IDSA/NIH guidance (remdesivir, molnupiravir) or supportive care.`,
        riskLevel: eligible ? 'moderate' : 'info',
        alerts: bool(values.interactions)
          ? ['A serious drug–drug interaction may be an absolute contraindication — verify with the Liverpool COVID-19 interaction checker.']
          : undefined,
        details: [
          { label: 'Eligibility', value: eligible ? 'All inclusion criteria met' : reasons.join('; ') },
          { label: 'Dose', value: eligible ? dose : '—' },
        ],
        recommendations: eligible
          ? ['Start as soon as possible after diagnosis', 'Counsel on rebound (may occur ~day 8–12) and dysgeusia', 'Document interaction review']
          : ['If beyond 5 days but hospitalized for another reason with high risk — Paxlovid may still be considered per NIH', 'Molnupiravir or 3-day IV remdesivir are outpatient alternatives'],
      };
    },
    evidence: {
      summary:
        'Eligibility checklist mirrors the FDA approval/EUA: mild-moderate COVID-19, symptom onset ≤5 days, high risk of progression, age/weight thresholds, no severe hepatic impairment; renal dosing eGFR >60 / 30–59 / <30 per label.',
      formula: 'All-criteria-met gate + eGFR-stratified dosing.',
      validation:
        'EPIC-HR trial (NEJM 2022): 89% relative reduction in hospitalization/death in high-risk unvaccinated outpatients treated ≤3 days of symptom onset. Label and NIH/IDSA guidance define current criteria.',
      references: [
        {
          title: 'Oral nirmatrelvir for high-risk, nonhospitalized adults with COVID-19 (EPIC-HR)',
          citation: 'Hammond J, Leister-Tebbe H, Gardner A, et al. N Engl J Med. 2022;386:1397-1408',
          year: 2022,
          pmid: '35172054',
          doi: '10.1056/NEJMoa2118542',
        },
      ],
    },
    nextSteps: [
      { condition: 'Eligible', actions: ['Prescribe per renal dose', 'Check interactions (Liverpool checker)', 'Advise on rebound and completion of 5-day course'] },
      { condition: 'Not eligible — no risk factor', actions: ['Supportive care; reassess if condition worsens'] },
      { condition: 'Not eligible — timing/interactions', actions: ['Consider remdesivir ×3 days or molnupiravir per IDSA'] },
    ],
    pearls: [
      'Hospitalized patients admitted for other reasons but with mild-moderate COVID and high risk may still receive Paxlovid.',
      'Ritonavir interactions are the commonest reason to withhold — tacrolimus, certain antiarrhythmics, and some DOACs are problematic.',
      'Rebound symptoms after treatment are common and do not usually require retreatment.',
    ],
  },

  // ─── 10. G8 Geriatric Screening Tool ───────────────────────────────────────
  {
    id: 'g8-geriatric',
    name: 'G8 Geriatric Screening Tool',
    shortName: 'G8',
    description:
      '8-item screening tool (derived from the MNA) identifying older cancer patients who should undergo comprehensive geriatric assessment; score ≤14 is abnormal.',
    category: 'geriatrics',
    tags: ['g8', 'geriatric', 'oncology', 'cga', 'frailty', 'screening', 'mna'],
    isQuestionnaire: true,
    whenToUse: 'Patients ≥65–70 with cancer before treatment decisions, to triage who needs a full geriatric assessment.',
    whyUse:
      'G8 is a fast, validated screen endorsed by SIOG/EORTC; a score ≤14 identifies patients likely to have impairments on comprehensive geriatric assessment who benefit from CGA-guided care.',
    inputs: [
      g8Item('food', 'Food intake declined over past 3 months (appetite, chewing, swallowing)?', [
        { label: 'Severe decrease', value: 0, points: 0 },
        { label: 'Moderate decrease', value: 1, points: 1 },
        { label: 'No decrease', value: 2, points: 2 },
      ], 2, 'MNA item A — decline in food intake over the past 3 months.'),
      g8Item('wtLoss', 'Weight loss during the last 3 months?', [
        { label: '>3 kg', value: 0, points: 0 },
        { label: 'Does not know', value: 1, points: 1 },
        { label: '1–3 kg', value: 2, points: 2 },
        { label: 'No weight loss', value: 3, points: 3 },
      ], 3, 'MNA item B — unintentional weight loss.'),
      g8Item('mobility', 'Mobility', [
        { label: 'Bed or chair bound', value: 0, points: 0 },
        { label: 'Out of bed/chair but does not go out', value: 1, points: 1 },
        { label: 'Goes out', value: 2, points: 2 },
      ], 2, 'MNA item C — mobility.'),
      g8Item('neuro', 'Neuropsychological problems', [
        { label: 'Severe dementia or depression', value: 0, points: 0 },
        { label: 'Mild dementia', value: 1, points: 1 },
        { label: 'No psychological problems', value: 2, points: 2 },
      ], 2, 'MNA item E — neuropsychological problems.'),
      g8Item('bmi', 'Body mass index', [
        { label: '<19', value: 0, points: 0 },
        { label: '19 to <21', value: 1, points: 1 },
        { label: '21 to <23', value: 2, points: 2 },
        { label: '≥23', value: 3, points: 3 },
      ], 3, 'MNA item F — BMI in kg/m².'),
      g8Item('drugs', 'Takes more than 3 prescription drugs per day?', [
        { label: 'Yes', value: 0, points: 0 },
        { label: 'No', value: 1, points: 1 },
      ], 1, 'Polypharmacy item — more than three prescription drugs daily scores 0.'),
      g8Item('health', 'Self-rated health vs. people of the same age', [
        { label: 'Not as good', value: 0, points: 0 },
        { label: 'Does not know', value: 0.5, points: 0.5 },
        { label: 'As good', value: 1, points: 1 },
        { label: 'Better', value: 2, points: 2 },
      ], 1, 'MNA item D — comparative self-perceived health.'),
      g8Item('age', 'Age', [
        { label: '>85 years', value: 0, points: 0 },
        { label: '80–85 years', value: 1, points: 1 },
        { label: '<80 years', value: 2, points: 2 },
      ], 2, 'Age item added to the 7 MNA-derived items.'),
    ],
    calculate(values) {
      const score =
        num(values.food) + num(values.wtLoss) + num(values.mobility) + num(values.neuro) +
        num(values.bmi) + num(values.drugs) + num(values.health) + num(values.age);
      const abnormal = score <= 14;
      return {
        score,
        unit: '/ 17',
        label: abnormal ? 'Abnormal — refer for CGA' : 'Normal',
        interpretation: abnormal
          ? `G8 score ${score} ≤14: abnormal — proceed to comprehensive geriatric assessment to identify vulnerabilities and guide cancer-treatment adaptation.`
          : `G8 score ${score} >14: within normal range — proceed with planned oncologic treatment while monitoring for emerging frailty.`,
        riskLevel: abnormal ? 'moderate' : 'low',
        details: [
          { label: 'Total', value: `${score} / 17` },
          { label: 'Cutoff', value: '≤14 abnormal' },
        ],
        recommendations: abnormal
          ? ['Comprehensive geriatric assessment (function, comorbidity, cognition, mood, nutrition, polypharmacy, social support)', 'Chemo-toxicity estimation (CRASH, CARG-TT)', 'Adapt treatment intensity to vulnerabilities']
          : ['Proceed with planned oncologic care', 'Re-screen if functional decline emerges'],
      };
    },
    evidence: {
      summary:
        'G8 = 7 Mini Nutritional Assessment items (food intake, weight loss, mobility, neuropsych, BMI, polypharmacy, self-rated health) + age; total 0–17; ≤14 abnormal.',
      formula: 'Sum of 8 items (max 17).',
      validation:
        'Developed by Bellera et al. (Ann Oncol 2012) and validated in multiple oncology cohorts; pooled sensitivity ~85%+ for CGA abnormalities at the ≤14 cutoff. Recommended by SIOG/ASCO as a triage screen.',
      references: [
        {
          title: 'Screening older cancer patients: first evaluation of the G-8 geriatric screening tool',
          citation: 'Bellera CA, Rainfray M, Mathoulin-Pélissier S, et al. Ann Oncol. 2012;23(10):2166-2171',
          year: 2012,
          doi: '10.1093/annonc/mdr587',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score ≤14', actions: ['Refer for CGA', 'Consider CRASH/CARG-TT for chemo toxicity', 'Intervene on identified deficits before treatment'] },
      { condition: 'Score >14', actions: ['Standard oncologic pathway', 'Periodic re-screening'] },
    ],
    pearls: [
      'G8 is a screen, not a CGA — an abnormal result triggers assessment, not treatment changes by itself.',
      'The self-rated health item carries a 0.5-point "does not know" option — the only fractional item.',
      'A normal G8 does not exclude frailty; sensitivity is high but not perfect.',
    ],
  },

  // ─── 11. CIRS-G ────────────────────────────────────────────────────────────
  {
    id: 'cirs-g',
    name: 'Cumulative Illness Rating Scale–Geriatric (CIRS-G)',
    shortName: 'CIRS-G',
    description:
      'Comorbidity burden scale rating 14 organ systems 0–4; reports total score, severity index (mean), and number of systems scoring ≥2.',
    category: 'geriatrics',
    tags: ['cirs', 'comorbidity', 'geriatric', 'miller', 'burden of illness'],
    isQuestionnaire: true,
    whenToUse: 'Older adults (clinical or research settings) when a structured organ-system comorbidity burden is needed.',
    whyUse:
      'CIRS-G provides a validated, reproducible comorbidity index; total score, severity index, and count of systems ≥2 each carry prognostic information beyond a simple disease count.',
    inputs: [
      cirsSystem('heart', 'Heart', '1: old MI >5y, occasional angina PRN. 2: compensated CHF, daily antianginal, LVH, AF, BBB, daily antiarrhythmic. 3: MI ≤5y, abnormal stress test, prior PTCA/CABG. 4: marked restriction (unstable angina, intractable CHF).', 0),
      cirsSystem('vascular', 'Vascular', '1: HTN on salt restriction/weight loss, cholesterol >200. 2: daily antihypertensives or 1 atherosclerosis symptom, aneurysm <4 cm. 3: ≥2 atherosclerosis symptoms. 4: prior vascular surgery or aneurysm ≥4 cm.', 0),
      cirsSystem('heme', 'Hematopoietic', '1: Hgb F 10–12/M 12–14, anemia of chronic disease. 2: Hgb F 8–10/M 10–12, deficiency or CRF anemia, WBC 2–4k. 3: Hgb F <8/M <10, WBC <2k. 4: any leukemia/lymphoma.', 0),
      cirsSystem('resp', 'Respiratory', '1: recurrent bronchitis, PRN-inhaler asthma, 10–20 pack-yr. 2: CXR COPD, daily inhalers/theophylline, pneumonia ×2 in 5y, 21–40 pack-yr. 3: limited ambulation, oral steroids, >40 pack-yr. 4: supplemental O₂, prior respiratory failure, lung cancer.', 0),
      cirsSystem('eent', 'Eyes/ears/nose/throat/larynx', '1: corrected 20/40, chronic sinusitis, mild hearing loss. 2: 20/60 or difficult newsprint, hearing aid, chronic sinonasal/vertigo meds. 3: partially blind, impaired hearing despite aid. 4: functional blindness/deafness, laryngectomy, vertigo surgery.', 0),
      cirsSystem('ugi', 'Upper GI', '1: hiatal hernia, PRN heartburn meds. 2: daily H2-blocker/antacid, ulcer within 5y. 3: active ulcer, guaiac+, dysphagia. 4: gastric cancer, perforated ulcer, melena/hematochezia.', 0),
      cirsSystem('lgi', 'Lower GI', '1: PRN constipation meds, hemorrhoids, hernia repair. 2: daily bulk laxatives, diverticulosis, untreated hernia. 3: impaction past year, daily stimulant laxatives/enemas. 4: hematochezia, current impaction, diverticulitis, obstruction, carcinoma.', 0),
      cirsSystem('liver', 'Liver/pancreas/biliary', '1: hepatitis >5y ago, cholecystectomy. 2: LFTs ≤150% ULN, hepatitis ≤5y, cholelithiasis, heavy alcohol ≤5y. 3: bilirubin >2, LFTs >150%, pancreatic enzymes. 4: biliary obstruction, biliary carcinoma, cholecystitis, pancreatitis, active hepatitis.', 0),
      cirsSystem('renal', 'Renal', '1: stone ≤10y or asymptomatic, pyelonephritis ≤5y. 2: creatinine 1.5–3.0 off diuretics/antihypertensives. 3: creatinine >3.0 or >1.5 on therapy, current pyelonephritis. 4: dialysis or renal carcinoma.', 0),
      cirsSystem('gu', 'Genitourinary', '1: stress incontinence, hysterectomy, asymptomatic BPH. 2: abnormal Pap, ≥3 UTIs/yr, non-stress incontinence, symptomatic BPH, current UTI, diversion, s/p TURP. 3: prostate/CIS cancer, vaginal bleeding, hematuria, urosepsis past year. 4: acute retention, other GU carcinoma.', 0),
      cirsSystem('msk', 'Musculoskeletal/skin', '1: PRN arthritis meds, mild ADL limits, excised NMSC, skin infection ≤1y. 2: daily antiarthritics/assistive device, moderate ADL limits, daily skin meds, melanoma w/o mets. 3: severe ADL impairment, steroid-dependent arthritis, vertebral compression fracture. 4: wheelchair, severe deformity, osteomyelitis, bone/muscle carcinoma, metastatic melanoma.', 0),
      cirsSystem('neuro', 'Neurologic', '1: PRN headache meds, prior TIA. 2: daily headache meds or interfering headaches, old CVA no residual, mild neurodegenerative disease. 3: CVA with mild residual, CNS surgery, moderate neurodegenerative disease. 4: CVA with hemiparesis/aphasia, severe neurodegenerative disease.', 0),
      cirsSystem('endo', 'Endocrine/breast', '1: diet-controlled diabetes, BMI >30, thyroid replacement. 2: diabetes on insulin/oral agents, fibrocystic disease. 3: electrolyte disturbance needing hospitalization, BMI >45. 4: brittle/poorly controlled diabetes or diabetic coma ≤1y, adrenal replacement, adrenal/thyroid/breast carcinoma.', 0),
      cirsSystem('psych', 'Psychiatric illness', '1: minor condition/history, crisis treatment, remote depression Rx, episodic anxiolytics, mild early dementia. 2: major depression ≤10y, mild dementia, prior psychiatric hospitalization, psychotic episode, substance abuse >10y ago. 3: current major depression or ≥2 episodes ≤10y, moderate dementia, daily anxiolytic/antipsychotic, current substance abuse. 4: illness requiring hospitalization/institutionalization, severe dementia.', 0),
    ],
    calculate(values) {
      const ids = ['heart','vascular','heme','resp','eent','ugi','lgi','liver','renal','gu','msk','neuro','endo','psych'];
      const total = ids.reduce((s, id) => s + num(values[id]), 0);
      const severity = round(total / 14, 2);
      const affected = ids.filter((id) => num(values[id]) >= 2).length;
      const band =
        severity >= 3 ? { riskLevel: 'high' as const, label: 'Very high comorbidity burden' }
        : severity >= 2 ? { riskLevel: 'moderate' as const, label: 'High comorbidity burden' }
        : severity >= 1 ? { riskLevel: 'moderate' as const, label: 'Moderate comorbidity burden' }
        : { riskLevel: 'low' as const, label: 'Low comorbidity burden' };
      return {
        score: total,
        unit: '/ 56',
        label: band.label,
        interpretation: `CIRS-G total ${total}/56, severity index ${severity}, ${affected} system${affected === 1 ? '' : 's'} scoring ≥2 (comorbidity count). Higher totals and ≥2-counts track hospitalization, medication burden, and mortality risk.`,
        riskLevel: band.riskLevel,
        details: [
          { label: 'Total score', value: `${total} / 56` },
          { label: 'Severity index (mean/system)', value: `${severity}` },
          { label: 'Systems ≥2 (comorbidity count)', value: `${affected}` },
        ],
        recommendations: [
          'Use all three outputs — total, severity index, and ≥2 count — as in the literature.',
          'Re-score longitudinally to follow comorbidity evolution.',
        ],
      };
    },
    evidence: {
      summary:
        'CIRS-G rates 14 organ systems 0–4 by published anchors; derived indices: total (0–56), severity index (total/14), and number of systems scored ≥2.',
      formula: 'Total = Σ 14 systems; Severity index = total/14; Comorbidity count = systems ≥2.',
      validation:
        'Miller et al. (Psychiatry Res 1992) validated CIRS-G against physician-rated illness burden; widely used in geriatric oncology and outcomes research.',
      references: [
        {
          title: 'Rating chronic medical illness burden in geropsychiatric practice and research: application of the Cumulative Illness Rating Scale',
          citation: 'Miller MD, Paradis CF, Houck PR, et al. Psychiatry Res. 1992;41(3):237-248',
          year: 1992,
        },
      ],
    },
    nextSteps: [
      { condition: 'Severity index ≥2 or ≥4 systems ≥2', actions: ['Structured medication review', 'Coordinate multispecialty care', 'Incorporate burden into treatment-intensity and goals-of-care discussions'] },
    ],
    pearls: [
      'Score current problems — past issues score only when they left significant sequelae.',
      'A single level-4 system signals serious illness even when the total looks modest.',
      'The severity index allows comparison across patients with different counts of affected systems.',
    ],
  },

  // ─── 12. CAROC ─────────────────────────────────────────────────────────────
  {
    id: 'caroc',
    name: 'CAROC 10-Year Fracture Risk (2010 Update)',
    shortName: 'CAROC',
    description:
      'Canadian system categorizing 10-year major osteoporotic fracture risk (low <10%, moderate 10–20%, high >20%) from age, sex, femoral-neck T-score, fragility fracture, and glucocorticoid use.',
    category: 'geriatrics',
    tags: ['caroc', 'osteoporosis', 'fracture risk', 'canada', 't-score', 'glucocorticoid'],
    whenToUse: 'Canadians ≥50 being assessed for osteoporosis treatment decisions, with or without a femoral-neck BMD result.',
    whyUse:
      'CAROC reproduces Canadian FRAX risk categories without a computer (concordance ~88–89%) and directly maps to the low/moderate/high treatment thresholds in the Canadian guideline.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 50, max: 95, exampleValue: 68, helpText: 'CAROC is validated from age 50; risk zones are tabulated 50–85+.' }),
      selectInput('sex', 'Sex', [
        { label: 'Woman', value: 'F' },
        { label: 'Man', value: 'M' },
      ], 'F', 'Sex-specific T-score zones — men shift to higher risk at older ages.'),
      numberInput('tscore', 'Femoral neck T-score (leave blank if BMD unavailable)', { unit: 'SD', min: -5, max: 3, step: 0.1, exampleValue: -1.8, helpText: 'NHANES III female-white reference T-score. If blank, basal risk is estimated from age/sex alone (approximation).', required: false }),
      selectInput('fracture', 'Fragility fracture after age 40', [
        { label: 'None', value: 'none' },
        { label: 'Single fragility fracture (non-vertebral, non-hip)', value: 'single' },
        { label: 'Vertebral or hip fragility fracture, or multiple fragility fractures', value: 'severe' },
      ], 'none', 'Vertebral/hip or multiple fragility fractures are automatically high risk; other fragility fractures raise the basal category by one level.'),
      yesNo('steroid', 'Current systemic glucocorticoid therapy >3 months', null, 'Prednisone-equivalent ≥7.5 mg/day cumulatively ≥3 months in the past year raises the basal category by one level.', false),
    ],
    calculate(values) {
      const age = num(values.age, 65);
      const male = str(values.sex) === 'M';
      const tRaw = values.tscore;
      const hasT = tRaw !== null && tRaw !== undefined && tRaw !== '' && Number.isFinite(num(tRaw, NaN));
      const t = hasT ? num(tRaw) : -1.0; // population-average assumption, documented
      const { low, high } = carocCutoffs(age, male);
      let cat = t > low ? 0 : t < high ? 2 : 1;

      const fx = str(values.fracture, 'none');
      const steroid = bool(values.steroid);
      if (fx === 'severe') cat = 2;
      else {
        if (fx === 'single') cat = Math.min(cat + 1, 2);
        if (steroid) cat = Math.min(cat + 1, 2);
      }

      const catText = carocCategoryLabel(cat);
      const riskText = cat === 2 ? '>20%' : cat === 1 ? '10–20%' : '<10%';
      return {
        score: catText,
        label: catText,
        interpretation: `CAROC category: ${catText} — estimated 10-year major osteoporotic fracture risk ${riskText}.${hasT ? '' : ' (Basal estimate without BMD; enter femoral-neck T-score for the published zone classification.)'}`,
        riskLevel: cat === 2 ? 'high' : cat === 1 ? 'moderate' : 'low',
        details: [
          { label: 'Basal category', value: hasT ? `T ${num(tRaw)} → ${carocCategoryLabel(t > low ? 0 : t < high ? 2 : 1)}` : 'Not assessed (no T-score)' },
          { label: 'Fragility fracture', value: fx === 'severe' ? 'Vertebral/hip or multiple → automatic high risk' : fx === 'single' ? '+1 category' : 'None' },
          { label: 'Glucocorticoid', value: steroid ? '+1 category' : 'No' },
          { label: 'Final category', value: catText },
        ],
        recommendations: [
          cat === 2 ? 'Pharmacologic therapy recommended per Canadian guidelines; assess calcium/vitamin D and fall risk.' : cat === 1 ? 'Pharmacotherapy suggested for moderate risk — individualize with FRAX including BMD.' : 'Lifestyle measures, calcium/vitamin D adequacy, reassess in 3–5 years.',
          'Vertebral/hip or multiple fragility fractures warrant treatment regardless of BMD.',
        ],
      };
    },
    evidence: {
      summary:
        '2010 CAROC: basal risk zone from age + sex + femoral-neck T-score (published cutoff table); fragility fracture after 40 or prolonged glucocorticoid use raises the category by one; vertebral/hip or multiple fragility fractures (or both risk factors) → high risk regardless.',
      formula: 'Basal zone (low <10%, moderate 10–20%, high >20%) then category shifts.',
      validation:
        'Validated against Canadian FRAX in CaMos and Manitoba cohorts (concordance ~88–89%; observed 10-year fracture 6.1–6.5% low, 13.5–14.6% moderate, 22.3–29.1% high). When no T-score is entered this tool uses an age/sex basal estimate — an approximation.',
      references: [
        {
          title: 'Construction and validation of a simplified fracture risk assessment tool for Canadian women and men: results from the CaMos and Manitoba cohorts',
          citation: 'Leslie WD, Berger C, Langsetmo L, et al. CMAJ. 2011;183(16):1864-1876',
          year: 2011,
          pmid: '20967422',
        },
        {
          title: '2010 clinical practice guidelines for the diagnosis and management of osteoporosis in Canada',
          citation: 'Papaioannou A, Morin S, Cheung AM, et al. CMAJ. 2010;182(17):1864-1873',
          year: 2010,
        },
      ],
    },
    nextSteps: [
      { condition: 'High risk', actions: ['Offer pharmacotherapy', 'Calcium/vitamin D, exercise, fall prevention', 'Investigate secondary causes if indicated'] },
      { condition: 'Moderate risk', actions: ['FRAX with BMD to refine', 'Discuss treatment options'] },
      { condition: 'Low risk', actions: ['Lifestyle measures', 'Reassess periodically'] },
    ],
    pearls: [
      'A hip or vertebral fragility fracture — or any two fragility fractures — is automatically high risk.',
      'In a treated patient the tool shows the theoretical risk of a treatment-naïve twin, not residual benefit.',
      'Use the female-white NHANES III femoral-neck reference for the T-score, including in men.',
    ],
  },

  // ─── 13. OSIRIS ────────────────────────────────────────────────────────────
  {
    id: 'osiris',
    name: 'Osteoporosis Index of Risk (OSIRIS)',
    shortName: 'OSIRIS',
    description:
      'Four-variable index (age, weight, hormone therapy, prior low-impact fracture) stratifying osteoporosis risk in postmenopausal women.',
    category: 'geriatrics',
    tags: ['osiris', 'osteoporosis', 'bmd', 'screening', 'postmenopausal', 'sedrine'],
    whenToUse: 'Asymptomatic postmenopausal women when deciding who warrants bone densitometry.',
    whyUse:
      'OSIRIS is a simple validated triage score; values ≤1 flag women in whom DXA is most likely to change management.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 45, max: 100, exampleValue: 68, helpText: 'Age lowers the index via −0.2 × age.' }),
      numberInput('weight', 'Weight', { unit: 'kg', unitKind: 'weight', min: 30, max: 250, step: 0.5, exampleValue: 62, helpText: 'Body weight in kg; higher weight is protective (+0.2 × weight).' }),
      yesNo('hrt', 'Current hormone replacement therapy', 2, 'Current estrogen therapy adds +2.', false),
      yesNo('fracture', 'Prior low-impact fracture', -2, 'Any previous fracture from a low-energy mechanism subtracts 2.', false),
    ],
    calculate(values) {
      const age = num(values.age, 65);
      const wt = num(values.weight, 65);
      const score = round(0.2 * (wt - age) + (bool(values.hrt) ? 2 : 0) - (bool(values.fracture) ? 2 : 0), 1);
      const band =
        score < -3 ? { riskLevel: 'high' as const, label: 'High risk — DXA strongly indicated' }
        : score <= 1 ? { riskLevel: 'moderate' as const, label: 'Intermediate risk — DXA recommended' }
        : { riskLevel: 'low' as const, label: 'Low risk' };
      return {
        score,
        unit: 'points',
        label: band.label,
        interpretation: `OSIRIS ${score}: ${score > 1 ? 'low risk (>1) — densitometry can usually be deferred.' : score >= -3 ? 'intermediate risk (−3 to +1) — bone densitometry recommended.' : 'high risk (<−3) — bone densitometry strongly indicated.'}`,
        riskLevel: band.riskLevel,
        details: [
          { label: '0.2 × (weight − age)', value: `${round(0.2 * (wt - age), 1)}` },
          { label: 'HRT', value: bool(values.hrt) ? '+2' : '0' },
          { label: 'Prior low-impact fracture', value: bool(values.fracture) ? '−2' : '0' },
          { label: 'Bands', value: '>1 low; −3 to +1 intermediate; <−3 high' },
        ],
        recommendations: [
          score <= 1 ? 'Order DXA (femoral neck + lumbar spine) and calculate FRAX.' : 'Lifestyle measures; reassess periodically.',
          'Not for men or secondary osteoporosis (steroids, hyperparathyroidism).',
        ],
      };
    },
    evidence: {
      summary: 'OSIRIS = 0.2 × (weight[kg] − age[y]) + 2 if current estrogen − 2 if prior low-impact fracture. Bands: >+1 low; −3 to +1 intermediate; <−3 high.',
      formula: '0.2×(W−A) + 2×HRT − 2×fracture.',
      validation:
        'Developed and validated by Sedrine et al. (2002); in comparative studies OSIRIS showed similar discriminative performance to OST/ORAI for identifying low BMD.',
      references: [
        {
          title: 'Development and assessment of the Osteoporosis Index of Risk (OSIRIS) to facilitate selection of women for bone densitometry',
          citation: 'Sedrine WB, Chevallier T, Zegels B, et al. Gynecol Endocrinol. 2002;16(3):245-250',
          year: 2002,
        },
      ],
    },
    nextSteps: [
      { condition: 'Score ≤1', actions: ['Bone densitometry', 'FRAX with clinical risk factors'] },
      { condition: 'Score >1', actions: ['Reassure; lifestyle measures', 'Re-screen periodically'] },
    ],
    pearls: [
      'OSIRIS asks about prior low-impact fracture and HRT — the two modifiers that OST/ORAI lack.',
      'Low body weight is the dominant driver: a 60 kg 75-year-old scores −3 before modifiers.',
      'Do not apply to premenopausal women or men.',
    ],
  },

  // ─── 14. ORAI ──────────────────────────────────────────────────────────────
  {
    id: 'orai',
    name: 'Osteoporosis Risk Assessment Instrument (ORAI)',
    shortName: 'ORAI',
    description:
      'Three-variable instrument (age, weight, estrogen use) selecting women ≥45 for bone densitometry; score ≥9 recommends BMD testing.',
    category: 'geriatrics',
    tags: ['orai', 'osteoporosis', 'bmd', 'screening', 'cadarette'],
    whenToUse: 'Women ≥45 years when deciding whether to order bone densitometry.',
    whyUse:
      'ORAI identifies ~90%+ of women with low BMD while sparing densitometry in low-scoring patients; score ≥9 is the validated screening cutoff.',
    inputs: [
      selectInput('ageBand', 'Age', [
        { label: '45–54 years', value: 0, points: 0 },
        { label: '55–64 years', value: 5, points: 5 },
        { label: '65–74 years', value: 9, points: 9 },
        { label: '≥75 years', value: 15, points: 15 },
      ], 9, 'Age band contributes 0–15 points.'),
      selectInput('weightBand', 'Weight', [
        { label: '>69 kg (>152 lb)', value: 0, points: 0 },
        { label: '60–69 kg (132–152 lb)', value: 3, points: 3 },
        { label: '<60 kg (<132 lb)', value: 9, points: 9 },
      ], 0, 'Weight band contributes 0–9 points.'),
      selectInput('estrogen', 'Current estrogen use', [
        { label: 'Yes', value: 0, points: 0 },
        { label: 'No', value: 2, points: 2 },
      ], 2, 'No current estrogen (HRT) use adds 2 points.'),
    ],
    calculate(values) {
      const score = num(values.ageBand) + num(values.weightBand) + num(values.estrogen);
      const high = score >= 9;
      return {
        score,
        unit: 'points',
        label: high ? 'Recommend bone densitometry' : 'Below screening threshold',
        interpretation: high
          ? `ORAI ${score} ≥9: high risk for osteoporosis — bone densitometry is warranted.`
          : `ORAI ${score} <9: below the threshold; densitometry may be deferred, but clinical risk factors can still justify testing.`,
        riskLevel: high ? 'moderate' : 'low',
        details: [
          { label: 'Age', value: `+${num(values.ageBand)}` },
          { label: 'Weight', value: `+${num(values.weightBand)}` },
          { label: 'No estrogen', value: `+${num(values.estrogen)}` },
          { label: 'Cutoff', value: '≥9 → BMD' },
        ],
        recommendations: [
          high ? 'Order DXA and compute FRAX with clinical risk factors.' : 'Reassess periodically; ORAI does not capture all risk factors (steroids, fractures, falls).',
        ],
      };
    },
    evidence: {
      summary: 'ORAI (Cadarette 2000): age 55–64 +5, 65–74 +9, ≥75 +15; weight 60–69 kg +3, <60 +9; no current estrogen +2. Score ≥9 → recommend densitometry.',
      formula: 'Age points + weight points + estrogen points (0–26).',
      validation:
        'Derived and validated in Canadian women ≥45 (sensitivity ~90–94% for low BMD at cutoff 9); externally validated in multiple cohorts.',
      references: [
        {
          title: 'Development and validation of the Osteoporosis Risk Assessment Instrument to facilitate selection of women for bone densitometry',
          citation: 'Cadarette SM, Jaglal SB, Kreiger N, McIsaac WJ, Darlington GA, Tu JV. CMAJ. 2000;162(9):1289-1294',
          year: 2000,
        },
      ],
    },
    nextSteps: [
      { condition: 'Score ≥9', actions: ['DXA femoral neck/spine', 'FRAX if borderline', 'Calcium/vitamin D review'] },
    ],
    pearls: [
      'ORAI deliberately favors sensitivity over specificity — a low score reassures more than a high score diagnoses.',
      'Not validated for men or secondary osteoporosis.',
      'Weight <60 kg and age ≥75 are each near-diagnostic single items.',
    ],
  },

  // ─── 15. OST ───────────────────────────────────────────────────────────────
  {
    id: 'ost-score',
    name: 'Osteoporosis Self-Assessment Tool (OST/OSTA)',
    shortName: 'OST',
    description:
      'Two-variable index (0.2 × [weight − age]) classifying osteoporosis risk in postmenopausal women and men.',
    category: 'geriatrics',
    tags: ['ost', 'osta', 'osteoporosis', 'bmd', 'screening', 'koh'],
    whenToUse: 'Postmenopausal women (and men, with caveats) to triage who needs bone densitometry.',
    whyUse:
      'OST requires only age and weight yet performs comparably to longer instruments; it is the simplest validated pre-DXA triage tool.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 40, max: 100, exampleValue: 70, helpText: 'Age in years (validated ~45–85).' }),
      selectInput('sex', 'Sex', [
        { label: 'Female', value: 'F' },
        { label: 'Male', value: 'M' },
      ], 'F', 'Cutoff bands were derived mainly in postmenopausal women; male cutoffs differ.'),
      numberInput('weight', 'Weight', { unit: 'kg', unitKind: 'weight', min: 30, max: 250, step: 0.5, exampleValue: 60, helpText: 'Body weight in kg.' }),
    ],
    calculate(values) {
      const age = num(values.age, 70);
      const wt = num(values.weight, 60);
      const male = str(values.sex) === 'M';
      const score = round(0.2 * (wt - age), 1);
      // Standard OST bands (derived in white women; OSTA Asian cutoffs differ).
      const band =
        score < -3 ? { riskLevel: 'high' as const, label: 'High risk — DXA strongly indicated' }
        : score < 2 ? { riskLevel: 'moderate' as const, label: 'Intermediate risk — DXA recommended' }
        : { riskLevel: 'low' as const, label: 'Low risk' };
      return {
        score,
        unit: 'points',
        label: band.label,
        interpretation: `OST ${score} (= 0.2 × [${wt} − ${age}]): ${score >= 2 ? 'low risk (≥2) — densitometry may be deferred.' : score >= -3 ? 'intermediate risk (−3 to <2) — recommend bone densitometry.' : 'high risk (<−3) — bone densitometry strongly indicated.'}${male ? ' Bands were derived in women; interpret with caution in men.' : ''}`,
        riskLevel: band.riskLevel,
        details: [
          { label: 'Index', value: `0.2 × (${wt} kg − ${age} y) = ${score}` },
          { label: 'Bands (women)', value: '≥2 low; −3 to <2 intermediate; <−3 high' },
        ],
        recommendations: [
          score < 2 ? 'Order DXA and compute FRAX.' : 'Reassure; periodic re-screening.',
          male ? 'For men, ethnicity- and sex-specific cutoffs differ — combine with clinical risk factors.' : 'Asian (OSTA) cutoffs differ: >−1 low, −4 to −1 moderate, <−4 high.',
        ],
      };
    },
    evidence: {
      summary: 'OST/OSTA = 0.2 × (weight[kg] − age[y]). Common bands: ≥2 low, −3 to <2 intermediate, <−3 high (score <2 → recommend BMD); Asian OSTA bands: >−1 low, −4 to −1 moderate, <−4 high.',
      formula: '0.2 × (weight − age).',
      validation:
        'Koh et al. (Osteoporos Int 2001) derived OSTA in 8 Asian cohorts (~91% sensitivity for T ≤−2.5); OST performs similarly in white populations (comparative studies, e.g., Rubin 2013).',
      references: [
        {
          title: 'A simple tool to identify Asian women at increased risk of osteoporosis',
          citation: 'Koh LKH, Sedrine WB, Torralba TP, et al. Osteoporos Int. 2001;12(8):699-705',
          year: 2001,
        },
      ],
    },
    nextSteps: [
      { condition: 'Score <2', actions: ['Bone densitometry', 'FRAX assessment'] },
      { condition: 'Score ≥2', actions: ['Lifestyle measures', 'Re-screen periodically'] },
    ],
    pearls: [
      'OST is the minimal sufficient screen — only age and weight.',
      'A thin elderly person scores high risk automatically; a heavy younger person scores low.',
      'Ethnicity-specific cutoffs matter: OSTA uses −1/−4 rather than 2/−3.',
    ],
  },

  // ─── 16. Fracture Index ────────────────────────────────────────────────────
  {
    id: 'fracture-index',
    name: 'FRACTURE Index',
    shortName: 'Fracture Index',
    description:
      'Predicts hip, vertebral, and non-vertebral fracture risk in postmenopausal women, with or without a hip T-score; cutoffs ≥4 (no BMD) or ≥6 (with BMD).',
    category: 'geriatrics',
    tags: ['fracture index', 'osteoporosis', 'black', 'epidos', 'bmd'],
    whenToUse: 'Postmenopausal women to estimate fracture risk and select candidates for BMD testing or treatment.',
    whyUse:
      'The Fracture Index predicts fractures (not just low BMD) and works with or without densitometry; it was validated in SOF and EPIDOS cohorts.',
    inputs: [
      selectInput('ageBand', 'Age', [
        { label: '<65 years', value: 0, points: 0 },
        { label: '65–69 years', value: 1, points: 1 },
        { label: '70–74 years', value: 2, points: 2 },
        { label: '75–79 years', value: 3, points: 3 },
        { label: '80–84 years', value: 4, points: 4 },
        { label: '≥85 years', value: 5, points: 5 },
      ], 2, 'Age band contributes 0–5 points.'),
      yesNo('priorFx', 'Any fracture after age 50', 1, 'Personal history of any fracture after age 50.', false),
      yesNo('maternalFx', 'Mother’s hip fracture after age 50', 1, 'Maternal history of hip fracture after age 50.', false),
      yesNo('lowWeight', 'Weight ≤125 lb (≤56.7 kg)', 1, 'Current body weight at or below 125 lb / 56.7 kg.', false),
      yesNo('smoker', 'Current smoker', 1, 'Current cigarette smoking.', false),
      yesNo('armsStand', 'Needs arms to stand from a chair', 2, 'Requires using arms to rise from a chair — a frailty/strength marker.', false),
      selectInput('tscore', 'Total hip T-score (optional)', [
        { label: 'Not available', value: 'na' },
        { label: '≥−1', value: 0, points: 0 },
        { label: '−1 to −2', value: 2, points: 2 },
        { label: '−2 to −2.5', value: 3, points: 3 },
        { label: '<−2.5', value: 4, points: 4 },
      ], 'na', 'Optional total-hip T-score; when entered, the score and the ≥6 cutoff apply.', false),
    ],
    calculate(values) {
      const tsel = str(values.tscore, 'na');
      const hasBmd = tsel !== 'na';
      const score =
        num(values.ageBand) +
        (bool(values.priorFx) ? 1 : 0) +
        (bool(values.maternalFx) ? 1 : 0) +
        (bool(values.lowWeight) ? 1 : 0) +
        (bool(values.smoker) ? 1 : 0) +
        (bool(values.armsStand) ? 2 : 0) +
        (hasBmd ? num(tsel) : 0);
      const cutoff = hasBmd ? 6 : 4;
      const flagged = score >= cutoff;
      return {
        score,
        unit: 'points',
        label: flagged ? `Above threshold (≥${cutoff})` : `Below threshold (<${cutoff})`,
        interpretation: `Fracture Index ${score}${hasBmd ? ' (with BMD)' : ' (without BMD)'}: ${flagged ? `≥${cutoff} — further evaluation and potential management indicated.` : `<${cutoff} — below the published action threshold.`}`,
        riskLevel: flagged ? 'high' : 'low',
        details: [
          { label: 'Age', value: `+${num(values.ageBand)}` },
          { label: 'BMD contribution', value: hasBmd ? `+${num(tsel)}` : 'not entered' },
          { label: 'Cutoff applied', value: `≥${cutoff} (${hasBmd ? 'with' : 'without'} BMD)` },
        ],
        recommendations: [
          flagged
            ? 'DXA (if not done), FRAX, calcium/vitamin D, exercise, fall prevention; discuss pharmacotherapy.'
            : 'Lifestyle measures; repeat assessment if new risk factors or fracture occur.',
        ],
      };
    },
    evidence: {
      summary:
        'FRACTURE Index (Black 2001): age bands 0–5, prior fracture +1, maternal hip fracture +1, weight ≤125 lb +1, smoking +1, arm-assisted standing +2; optional hip T-score: ≥−1:0, −1 to −2:+2, −2 to −2.5:+3, <−2.5:+4. Action cutoffs ≥4 (without BMD) or ≥6 (with BMD).',
      formula: 'Sum of items; two validated thresholds.',
      validation:
        'Derived in the SOF cohort and validated in EPIDOS; predicted hip, vertebral, and non-vertebral fractures both with and without BMD.',
      references: [
        {
          title: 'An assessment tool for predicting fracture risk in postmenopausal women',
          citation: 'Black DM, Steinbuch M, Palermo L, et al. Osteoporos Int. 2001;12(6):519-525',
          year: 2001,
        },
      ],
    },
    nextSteps: [
      { condition: 'Score ≥4 without BMD', actions: ['Obtain DXA', 'Full FRAX assessment'] },
      { condition: 'Score ≥6 with BMD', actions: ['Discuss pharmacologic therapy', 'Address falls, nutrition, vitamin D'] },
    ],
    pearls: [
      'The "arms to stand" item captures frailty and is worth 2 points — a quick functional test.',
      'Not evaluated in men or secondary/steroid-induced osteoporosis.',
      'The tool predicts fracture events, which makes it complementary to BMD-based tools.',
    ],
  },

  // ─── 17. MFIS (21 items) ───────────────────────────────────────────────────
  {
    id: 'mfis',
    name: 'Modified Fatigue Impact Scale (MFIS)',
    shortName: 'MFIS',
    description:
      '21-item measure of how fatigue affects daily life in multiple sclerosis and other conditions; total 0–84 with physical, cognitive, and psychosocial subscales.',
    category: 'neurology',
    tags: ['mfis', 'fatigue', 'multiple sclerosis', 'msqli', 'fisk'],
    isQuestionnaire: true,
    whenToUse: 'Patients with MS or other conditions to quantify fatigue impact at baseline and longitudinally.',
    whyUse:
      'MFIS is the standard MS fatigue instrument (part of the MSQLI); its physical, cognitive, and psychosocial subscales help target management.',
    inputs: [
      mfisItem('q1', '1. I have been less alert.', 1),
      mfisItem('q2', '2. I have had difficulty paying attention.', 1),
      mfisItem('q3', '3. I have been unable to think clearly.', 1),
      mfisItem('q4', '4. I have been clumsy and uncoordinated.', 1),
      mfisItem('q5', '5. I have been forgetful.', 1),
      mfisItem('q6', '6. I have had to pace myself in my physical activities.', 1),
      mfisItem('q7', '7. I have been less motivated to do anything that requires physical effort.', 1),
      mfisItem('q8', '8. I have been less motivated to participate in social activities.', 1),
      mfisItem('q9', '9. I have been limited in my ability to do things away from home.', 1),
      mfisItem('q10', '10. I have had trouble maintaining physical effort for long periods.', 1),
      mfisItem('q11', '11. I have had difficulty making decisions.', 1),
      mfisItem('q12', '12. I have been less motivated to do anything that requires thinking.', 1),
      mfisItem('q13', '13. My muscles have felt weak.', 1),
      mfisItem('q14', '14. I have been physically uncomfortable.', 1),
      mfisItem('q15', '15. I have had trouble finishing tasks that require thinking.', 1),
      mfisItem('q16', '16. I have had difficulty organizing things.', 1),
      mfisItem('q17', '17. I have been less able to complete tasks that require physical effort.', 1),
      mfisItem('q18', '18. My thinking has been slowed down.', 1),
      mfisItem('q19', '19. I have had trouble concentrating.', 1),
      mfisItem('q20', '20. I have limited my physical activities.', 1),
      mfisItem('q21', '21. I have needed to rest more often or for longer periods.', 1),
    ],
    calculate(values) {
      const v = (id: string) => num(values[id]);
      const physical = v('q4') + v('q6') + v('q7') + v('q10') + v('q13') + v('q14') + v('q17') + v('q20') + v('q21');
      const cognitive = v('q1') + v('q2') + v('q3') + v('q5') + v('q11') + v('q12') + v('q15') + v('q16') + v('q18') + v('q19');
      const psychosocial = v('q8') + v('q9');
      const total = physical + cognitive + psychosocial;
      const band =
        total >= 60 ? { riskLevel: 'high' as const, label: 'Severe fatigue impact' }
        : total >= 38 ? { riskLevel: 'moderate' as const, label: 'Moderate fatigue impact' }
        : { riskLevel: 'low' as const, label: 'Mild/minimal fatigue impact' };
      return {
        score: total,
        unit: '/ 84',
        label: band.label,
        interpretation: `MFIS total ${total}/84 — physical ${physical}/36, cognitive ${cognitive}/40, psychosocial ${psychosocial}/8. Higher scores indicate greater fatigue impact; scores ≥38 are commonly cited as clinically significant MS fatigue.`,
        riskLevel: band.riskLevel,
        details: [
          { label: 'Physical subscale', value: `${physical} / 36 (items 4,6,7,10,13,14,17,20,21)` },
          { label: 'Cognitive subscale', value: `${cognitive} / 40 (items 1,2,3,5,11,12,15,16,18,19)` },
          { label: 'Psychosocial subscale', value: `${psychosocial} / 8 (items 8,9)` },
        ],
        recommendations: [
          'Track serial MFIS scores to monitor fatigue interventions.',
          'Address treatable contributors: sleep, mood, medications, deconditioning, MS activity.',
        ],
      };
    },
    evidence: {
      summary:
        'MFIS = 21 items rated 0–4 (never–almost always) over the past 4 weeks; total 0–84. Subscales: physical (items 4,6,7,10,13,14,17,20,21), cognitive (1,2,3,5,11,12,15,16,18,19), psychosocial (8,9).',
      formula: 'Total = sum of 21 items; subscales as published.',
      validation:
        'Developed for MS within the MSQLI battery (Fisk/Fischer 1994–1997); widely validated and used as an outcome in MS trials.',
      references: [
        {
          title: 'Measuring the functional impact of fatigue: initial validation of the fatigue impact scale',
          citation: 'Fisk JD, Ritvo PG, Ross L, Haase DA, Marrie TJ, Schlech WF. Can J Neurol Sci. 1994;21(1):9-14',
          year: 1994,
        },
        {
          title: 'Administration and scoring manual for the Multiple Sclerosis Quality of Life Inventory (MSQLI)',
          citation: 'Fischer JS, LaRocca NG, Miller DM, Ritvo PG, Andrews H, Paty D. National Multiple Sclerosis Society. 1997',
          year: 1997,
        },
      ],
    },
    nextSteps: [
      { condition: 'Total ≥38 or rising', actions: ['Evaluate sleep, mood, medications, and disease activity', 'Energy-conservation strategies', 'Consider fatigue-directed pharmacotherapy per clinician'] },
    ],
    pearls: [
      'Recall window is the past 4 weeks — keep it consistent across administrations.',
      'The physical subscale is the largest; a cognitive-dominant profile may suggest different contributors.',
      'The 5-item shortened MFIS (items 1, 9, 10, 17, 19) is a validated quick alternative.',
    ],
  },

  // ─── 18. Shortened MFIS (5 items) ──────────────────────────────────────────
  {
    id: 'mfis-5',
    name: 'Shortened Modified Fatigue Impact Scale (MFIS-5)',
    shortName: 'MFIS-5',
    description:
      '5-item abbreviated MFIS (items 1, 9, 10, 17, 19) for rapid fatigue-impact screening; total 0–20.',
    category: 'neurology',
    tags: ['mfis', 'fatigue', 'multiple sclerosis', 'short form', 'fisk'],
    isQuestionnaire: true,
    whenToUse: 'Quick fatigue screening in MS when the full 21-item MFIS is impractical.',
    whyUse:
      'The 5-item version retains much of the full MFIS signal for rapid screening and longitudinal tracking.',
    inputs: [
      mfisItem('q1', '1. I have been less alert.', 1),
      mfisItem('q9', '9. I have been limited in my ability to do things away from home.', 1),
      mfisItem('q10', '10. I have had trouble maintaining physical effort for long periods.', 1),
      mfisItem('q17', '17. I have been less able to complete tasks that require physical effort.', 1),
      mfisItem('q19', '19. I have had trouble concentrating.', 1),
    ],
    calculate(values) {
      const total = num(values.q1) + num(values.q9) + num(values.q10) + num(values.q17) + num(values.q19);
      const band =
        total >= 13 ? { riskLevel: 'high' as const, label: 'Substantial fatigue impact' }
        : total >= 8 ? { riskLevel: 'moderate' as const, label: 'Moderate fatigue impact' }
        : { riskLevel: 'low' as const, label: 'Mild/minimal fatigue impact' };
      return {
        score: total,
        unit: '/ 20',
        label: band.label,
        interpretation: `Shortened MFIS ${total}/20 (items 1, 9, 10, 17, 19 of the full MFIS). Higher scores indicate greater fatigue impact; consider the full 21-item MFIS for subscale detail.`,
        riskLevel: band.riskLevel,
        details: [{ label: 'Items', value: '1, 9, 10, 17, 19 of MFIS' }],
        recommendations: ['Administer the full MFIS when subscale profiling is needed.', 'Re-administer at the same 4-week recall window for tracking.'],
      };
    },
    evidence: {
      summary: 'MFIS-5 uses items 1, 9, 10, 17, and 19 of the 21-item MFIS, each scored 0–4; total 0–20.',
      formula: 'Sum of 5 items.',
      validation:
        'The shortened form is documented in the MSQLI manual and performs comparably for screening purposes in MS cohorts.',
      references: [
        {
          title: 'Administration and scoring manual for the Multiple Sclerosis Quality of Life Inventory (MSQLI)',
          citation: 'Fischer JS, LaRocca NG, Miller DM, Ritvo PG, Andrews H, Paty D. National Multiple Sclerosis Society. 1997',
          year: 1997,
        },
      ],
    },
    nextSteps: [
      { condition: 'High score', actions: ['Full MFIS for subscale detail', 'Assess sleep, mood, medications, and MS activity'] },
    ],
    pearls: [
      'Five questions take under two minutes — useful for routine visits.',
      'It cannot decompose physical vs cognitive fatigue like the full MFIS.',
    ],
  },

  // ─── 19. RUIS ──────────────────────────────────────────────────────────────
  {
    id: 'ruis',
    name: 'Revised Urinary Incontinence Scale (RUIS)',
    shortName: 'RUIS',
    description:
      '5-item scale assessing urinary incontinence symptom severity and monitoring treatment response; total 0–16.',
    category: 'urology',
    tags: ['ruis', 'urinary incontinence', 'incontinence', 'sansoni', 'urology'],
    isQuestionnaire: true,
    whenToUse: 'Patients reporting urinary leakage to grade symptom severity, phenotype (urge vs stress), and track response to treatment.',
    whyUse:
      'RUIS is a brief validated instrument that quantifies incontinence severity and separates urge from stress components, useful for screening and outcome monitoring.',
    inputs: [
      selectInput('urge', 'Urine leakage related to the feeling of urgency — how bothered?', [
        { label: 'Not at all', value: 0, points: 0 },
        { label: 'Slightly', value: 1, points: 1 },
        { label: 'Moderately', value: 2, points: 2 },
        { label: 'Greatly', value: 3, points: 3 },
      ], 0, 'Bother from urgency-related leakage (urge component).'),
      selectInput('stress', 'Urine leakage related to physical activity, coughing, or sneezing — how bothered?', [
        { label: 'Not at all', value: 0, points: 0 },
        { label: 'Slightly', value: 1, points: 1 },
        { label: 'Moderately', value: 2, points: 2 },
        { label: 'Greatly', value: 3, points: 3 },
      ], 0, 'Bother from stress-related leakage (stress component).'),
      selectInput('small', 'Small amounts of urine leakage (drops) — how bothered?', [
        { label: 'Not at all', value: 0, points: 0 },
        { label: 'Slightly', value: 1, points: 1 },
        { label: 'Moderately', value: 2, points: 2 },
        { label: 'Greatly', value: 3, points: 3 },
      ], 0, 'Bother from small-volume leakage/drops.'),
      selectInput('freq', 'How often do you experience urine leakage?', [
        { label: 'Never', value: 0, points: 0 },
        { label: 'Less than once a month', value: 1, points: 1 },
        { label: 'A few times a month', value: 2, points: 2 },
        { label: 'A few times a week', value: 3, points: 3 },
        { label: 'Every day and/or night', value: 4, points: 4 },
      ], 1, 'Frequency of leakage episodes.'),
      selectInput('amount', 'How much urine do you lose each time?', [
        { label: 'None', value: 0, points: 0 },
        { label: 'Drops', value: 1, points: 1 },
        { label: 'Small splashes', value: 2, points: 2 },
        { label: 'More', value: 3, points: 3 },
      ], 0, 'Typical volume lost per episode.'),
    ],
    calculate(values) {
      const urge = num(values.urge);
      const stress = num(values.stress);
      const small = num(values.small);
      const freq = num(values.freq);
      const amount = num(values.amount);
      const total = urge + stress + small + freq + amount;
      const pattern =
        urge > 0 && urge >= stress + 1 ? 'Urge-predominant' :
        stress > 0 && stress >= urge + 1 ? 'Stress-predominant' :
        urge > 0 || stress > 0 ? 'Mixed' : 'No reported bother';
      const band =
        total >= 10 ? { riskLevel: 'high' as const, label: 'Severe incontinence' }
        : total >= 6 ? { riskLevel: 'moderate' as const, label: 'Moderate incontinence' }
        : total >= 1 ? { riskLevel: 'low' as const, label: 'Mild incontinence' }
        : { riskLevel: 'normal' as const, label: 'No incontinence reported' };
      return {
        score: total,
        unit: '/ 16',
        label: band.label,
        interpretation: `RUIS ${total}/16 — ${band.label.toLowerCase()}, ${pattern.toLowerCase()} pattern (urge ${urge}/3 vs stress ${stress}/3). Use serial scores to monitor treatment response.`,
        riskLevel: band.riskLevel,
        details: [
          { label: 'Urge component', value: `${urge}/3` },
          { label: 'Stress component', value: `${stress}/3` },
          { label: 'Drops bother', value: `${small}/3` },
          { label: 'Frequency', value: `${freq}/4` },
          { label: 'Amount', value: `${amount}/3` },
          { label: 'Pattern', value: pattern },
        ],
        recommendations: [
          pattern === 'Stress-predominant' ? 'Pelvic floor muscle training first-line; consider pessary or surgical evaluation if severe.' : 'Conservative measures first-line.',
          pattern === 'Urge-predominant' ? 'Bladder training, fluid/caffeine modification; antimuscarinic/beta-3 therapy if persistent.' : 'Evaluate for mixed-picture contributors.',
          total >= 6 ? 'Consider referral for urodynamics or specialist evaluation.' : 'Reassess periodically.',
        ],
      };
    },
    evidence: {
      summary:
        'RUIS = 5 items: bother from urge leakage (0–3), stress leakage (0–3), drops (0–3), frequency (0–4), and amount per episode (0–3); total 0–16. Item pattern suggests urge- vs stress-predominant incontinence.',
      formula: 'Sum of 5 items.',
      validation:
        'Developed by Sansoni and Hawthorne as a revision of the Urinary Incontinence Scale for the Australian Longitudinal Study on Women’s Health; validated for screening and outcome monitoring.',
      references: [
        {
          title: 'The Revised Urinary Incontinence Scale (RUIS)',
          citation: 'Sansoni J, Hawthorne G. University of Melbourne / Australian Longitudinal Study on Women’s Health. 2005',
          year: 2005,
        },
      ],
    },
    nextSteps: [
      { condition: 'Stress-predominant', actions: ['Pelvic floor therapy', 'Weight and activity modification', 'Surgical referral if severe'] },
      { condition: 'Urge-predominant', actions: ['Bladder diary', 'Behavioral therapy', 'Pharmacotherapy trial if indicated'] },
      { condition: 'Total ≥10 or refractory', actions: ['Specialist referral', 'Consider urodynamic testing'] },
    ],
    pearls: [
      'The first two items separate urge from stress bother — the pattern guides therapy choice.',
      'Frequency (0–4) is weighted slightly more than bother items (0–3).',
      'Serial administration is the intended use — a falling score documents response.',
    ],
  },
];
