import type { Calculator } from '../../types/calculator';
import { num, bool, str, round, yesNo, selectInput, numberInput, riskFromThresholds } from '../../utils/helpers';

/** Logistic CDF; clamps extreme logits so exp() cannot overflow to Infinity. */
function logistic(z: number): number {
  if (z > 30) return 1;
  if (z < -30) return 0;
  return 1 / (1 + Math.exp(-z));
}

/** CKiD U25 creatinine κ (Pierce 2021 / NIDDK Table 1). Age in years; height later in metres. */
function kappaCr(age: number, male: boolean): number {
  if (age < 12) return (male ? 39.0 : 36.1) * 1.008 ** (age - 12);
  if (age < 18) return (male ? 39.0 : 36.1) * (male ? 1.045 : 1.023) ** (age - 12);
  return male ? 50.8 : 41.4;
}

/** CKiD U25 cystatin C κ (Pierce 2021 / NIDDK Table 2). */
function kappaCys(age: number, male: boolean): number {
  if (male) {
    if (age < 15) return 87.2 * 1.011 ** (age - 15);
    if (age < 18) return 87.2 * 0.96 ** (age - 15);
    return 77.1;
  }
  if (age < 12) return 79.9 * 1.004 ** (age - 12);
  if (age < 18) return 79.9 * 0.974 ** (age - 12);
  return 68.3;
}

function hacorHrPts(hr: number): number {
  return hr >= 120 ? 1 : 0;
}
function hacorPhPts(ph: number): number {
  if (ph >= 7.35) return 0;
  if (ph >= 7.3) return 2;
  if (ph >= 7.25) return 3;
  return 4;
}
function hacorGcsPts(gcs: number): number {
  if (gcs >= 15) return 0;
  if (gcs >= 13) return 2;
  if (gcs >= 11) return 5;
  return 10;
}
function hacorPfPts(pf: number): number {
  if (pf >= 201) return 0;
  if (pf >= 151) return 2;
  if (pf >= 101) return 3;
  return 4;
}
function hacorRrPts(rr: number): number {
  if (rr <= 30) return 0;
  if (rr <= 35) return 1;
  if (rr <= 40) return 2;
  if (rr <= 45) return 3;
  return 4;
}

function nutricAgePts(age: number): number {
  if (age >= 75) return 2;
  if (age >= 50) return 1;
  return 0;
}
function nutricApachePts(apache: number): number {
  if (apache >= 28) return 3;
  if (apache >= 20) return 2;
  if (apache >= 15) return 1;
  return 0;
}
function nutricSofaPts(sofa: number): number {
  if (sofa >= 10) return 2;
  if (sofa >= 6) return 1;
  return 0;
}

export const wave7BedsideCalcs: Calculator[] = [
  // ─── 1. CKiD U25 eGFR ──────────────────────────────────────────────────────
  {
    id: 'ckid-u25',
    name: 'CKiD U25 eGFR',
    shortName: 'CKiD U25',
    description:
      'Age- and sex-dependent CKiD U25 estimated GFR from height/creatinine and cystatin C for ages 1–25 years. Displayed value is the average of creatinine- and cystatin-based estimates when both markers are entered.',
    category: 'nephrology',
    tags: ['egfr', 'ckid', 'u25', 'pediatric', 'cystatin', 'creatinine', 'ckd'],
    whenToUse:
      'Children, adolescents, and young adults aged 1–25 years with known or suspected CKD when an eGFR is needed for staging, drug dosing context, or monitoring.',
    whyUse:
      'CKiD U25 is less biased across the pediatric-to-young-adult range than bedside Schwartz or adult CKD-EPI in this age band; averaging Cr and CysC improves precision.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 1, max: 25, step: 0.1, defaultValue: 10 }),
      selectInput('sex', 'Sex', [
        { label: 'Female', value: 'F' },
        { label: 'Male', value: 'M' },
      ]),
      numberInput('height', 'Height', { unit: 'cm', min: 50, max: 220, step: 0.1, defaultValue: 140, helpText: 'Measured standing height (recumbent length in infants). Required for the creatinine equation (height in metres).' }),
      numberInput('scr', 'Serum creatinine', { unit: 'mg/dL', min: 0.1, max: 15, step: 0.01, defaultValue: 0.8 }),
      numberInput('cysc', 'Cystatin C', {
        unit: 'mg/L',
        min: 0.2,
        max: 8,
        step: 0.01,
        defaultValue: 0.8,
        helpText: 'IFCC-standardized (nephelometric preferred). Averaged with the creatinine estimate.',
      }),
    ],
    calculate(values) {
      const age = num(values.age, 10);
      const male = str(values.sex, 'F') === 'M';
      const heightCm = num(values.height, 140);
      const scr = Math.max(num(values.scr, 0.8), 0.1);
      const cysc = Math.max(num(values.cysc, 0.8), 0.2);
      const htM = heightCm / 100;
      const egfrCr = kappaCr(age, male) * (htM / scr);
      const egfrCys = kappaCys(age, male) * (1 / cysc);
      const egfr = round((egfrCr + egfrCys) / 2, 1);
      const r = riskFromThresholds(egfr, [
        {
          max: 14.9,
          level: 'critical',
          label: 'Kidney failure range (G5)',
          interpretation: `Average U25 eGFR ${egfr} mL/min/1.73 m² (<15): kidney-failure range. Confirm with clinical context; discuss nephrology/RRT planning.`,
        },
        {
          max: 29.9,
          level: 'high',
          label: 'Severely decreased (G4)',
          interpretation: `Average U25 eGFR ${egfr} mL/min/1.73 m² (15–29): severely decreased. Nephrology co-management; avoid nephrotoxins; dose-adjust.`,
        },
        {
          max: 59.9,
          level: 'moderate',
          label: 'Moderately decreased (G3)',
          interpretation: `Average U25 eGFR ${egfr} mL/min/1.73 m² (30–59): moderately decreased. Stage, treat cause, BP/proteinuria, CV risk.`,
        },
        {
          max: 89.9,
          level: 'low',
          label: 'Mildly decreased (G2)',
          interpretation: `Average U25 eGFR ${egfr} mL/min/1.73 m² (60–89): mildly decreased if CKD is otherwise documented (markers of damage).`,
        },
        {
          max: 5000,
          level: 'normal',
          label: 'Normal or high (G1)',
          interpretation: `Average U25 eGFR ${egfr} mL/min/1.73 m² (≥90): normal/high filtration. CKD staging still requires markers of kidney damage.`,
        },
      ]);
      return {
        score: egfr,
        unit: 'mL/min/1.73 m²',
        ...r,
        details: [
          { label: 'eGFRcr (U25)', value: `${round(egfrCr, 1)} mL/min/1.73 m²` },
          { label: 'eGFRcys (U25)', value: `${round(egfrCys, 1)} mL/min/1.73 m²` },
          { label: 'Average (displayed)', value: `${egfr} mL/min/1.73 m²` },
          { label: 'κ creatinine', value: round(kappaCr(age, male), 2).toString() },
          { label: 'κ cystatin', value: round(kappaCys(age, male), 2).toString() },
          { label: 'Height', value: `${heightCm} cm (${round(htM, 3)} m)` },
          { label: 'SCr', value: `${scr} mg/dL` },
          { label: 'CysC', value: `${cysc} mg/L` },
        ],
      };
    },
    evidence: {
      summary:
        'CKiD U25 (Pierce 2021) estimates GFR in ages 1–25 using sex- and age-dependent κ. Creatinine: eGFRcr = κ × (height_m / SCr). Cystatin: eGFRcys = κ × (1 / CysC). When both markers are available, the average is more precise and is the displayed result.',
      formula:
        'eGFRcr = κ_cr × (Ht_m / SCr); eGFRcys = κ_cys × (1/CysC); displayed = (eGFRcr + eGFRcys)/2. κ_cr: F/M 1–<12 36.1/39.0 × 1.008^(age−12); 12–<18 36.1×1.023^(age−12) / 39.0×1.045^(age−12); 18–25 41.4/50.8. κ_cys: F 1–<12 79.9×1.004^(age−12); F 12–<18 79.9×0.974^(age−12); F 18–25 68.3; M <15 87.2×1.011^(age−15); M 15–<18 87.2×0.960^(age−15); M 18–25 77.1.',
      validation:
        'Derived and internally validated in CKiD (iohexol GFR). Preferred over bedside Schwartz for longitudinal CKD-range GFR in this age span; not for rapidly changing AKI.',
      references: [
        {
          title: 'Age- and sex-dependent clinical equations to estimate GFR in children and young adults with CKD',
          citation: 'Pierce CB, Muñoz A, Ng DK, Warady BA, Furth SL, Schwartz GJ. Kidney Int. 2021',
          year: 2021,
          pmid: '33188714',
          doi: '10.1016/j.kint.2020.10.047',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'eGFR <60 or known CKD',
        actions: ['Urine ACR / protein', 'BP target and ACEI/ARB if proteinuric', 'Avoid NSAIDs', 'Nephrology follow-up'],
      },
      {
        condition: 'eGFR <30',
        actions: ['Nephrology', 'CKD-MBD / anemia labs', 'RRT education if progressive', 'Vaccine review'],
      },
    ],
    pearls: [
      'Average of U25 creatinine and cystatin C is the preferred reported estimate when both are available.',
      'Do not use U25 in AKI or when creatinine/cystatin is not in steady state.',
      'Height must be measured; recumbent length in infants.',
    ],
  },

  // ─── 2. Body Roundness Index ───────────────────────────────────────────────
  {
    id: 'body-roundness-index',
    name: 'Body Roundness Index (BRI)',
    shortName: 'BRI',
    description:
      'Body Roundness Index from height and waist circumference — an eccentricity-based adiposity metric associated with mortality in contemporary cohorts.',
    category: 'endocrinology',
    tags: ['bri', 'adiposity', 'obesity', 'waist', 'body composition'],
    whenToUse: 'When waist and height are available to describe central adiposity beyond BMI (cardiometabolic risk, epidemiology).',
    whyUse:
      'BRI models the body as an ellipse; higher values indicate rounder (more viscerally adiposity-like) shape. 2024 US cohort data link higher BRI with all-cause mortality.',
    inputs: [
      numberInput('height', 'Height', { unit: 'cm', min: 100, max: 220, step: 0.1, defaultValue: 170 }),
      numberInput('waist', 'Waist circumference', {
        unit: 'cm',
        min: 40,
        max: 200,
        step: 0.1,
        defaultValue: 80,
        helpText: 'Standing, end-expiration. State the site (WHO midpoint last rib–iliac crest vs NIH superior iliac crest) and keep it consistent — several cm difference changes BRI.',
      }),
    ],
    calculate(values) {
      const height = num(values.height, 170);
      const waist = num(values.waist, 80);
      const ecc = waist / (2 * Math.PI);
      const semiMinor = 0.5 * height;
      const ratio = semiMinor > 0 ? ecc / semiMinor : 1;
      const inside = 1 - ratio * ratio;
      const root = Math.sqrt(Math.max(0, inside));
      const bri = round(364.2 - 365.5 * root, 2);
      const r = riskFromThresholds(bri, [
        {
          max: 3.39,
          level: 'low',
          label: 'Lower BRI (<3.4)',
          interpretation: `BRI ${bri}: below the approximate lowest 2024 JAMA Network Open quartile — lower observed mortality than mid/high BRI in that cohort (not a diagnostic cut-off).`,
        },
        {
          max: 4.49,
          level: 'moderate',
          label: 'Mid BRI (3.4–4.4)',
          interpretation: `BRI ${bri}: intermediate roundness. Pair with BP, lipids, glucose, and waist guidelines rather than BRI alone.`,
        },
        {
          max: 5.49,
          level: 'high',
          label: 'High BRI (4.5–5.5)',
          interpretation: `BRI ${bri}: high roundness band (approximate upper quartiles). Address central adiposity and cardiometabolic risk.`,
        },
        {
          max: 400,
          level: 'critical',
          label: 'Very high BRI (≥5.5)',
          interpretation: `BRI ${bri}: very high roundness. Associated with higher all-cause mortality in NHANES analyses; comprehensive metabolic evaluation.`,
        },
      ]);
      return {
        score: bri,
        unit: 'BRI',
        ...r,
        details: [
          { label: 'Height', value: `${height} cm` },
          { label: 'Waist', value: `${waist} cm` },
          { label: 'Waist/(2π)', value: round(ecc, 3).toString() },
          { label: '0.5 × height', value: `${round(semiMinor, 2)} cm` },
        ],
      };
    },
    evidence: {
      summary:
        'Thomas 2013: BRI = 364.2 − 365.5 × √(1 − [(WC/(2π)) / (0.5 × height)]²) with WC and height in the same units. Argument of the square root is floored at 0. Higher BRI = rounder body. 2024 JAMA Network Open linked BRI to U-shaped/all-cause mortality; quartile-style bands are approximate.',
      formula: 'BRI = 364.2 − 365.5 × sqrt(1 − ((WC/(2π))/(0.5×height))²); clamp inner term at 0',
      validation:
        'Geometric derivation (Thomas); mortality association in NHANES (Zhang/Zhou et al. JAMA Netw Open 2024). Not a replacement for BMI or waist in guidelines.',
      references: [
        {
          title: 'Relationships between body roundness with body fat and visceral adipose tissue emerging from a new geometrical model',
          citation: 'Thomas DM et al. Obesity (Silver Spring). 2013',
          year: 2013,
          pmid: '23519954',
          doi: '10.1002/oby.20461',
        },
        {
          title: 'Body Roundness Index and All-Cause Mortality Among US Adults',
          citation: 'Zhang X et al. JAMA Netw Open. 2024',
          year: 2024,
          pmid: '38497988',
          doi: '10.1001/jamanetworkopen.2024.6505',
        },
      ],
    },
    nextSteps: [
      { condition: 'Elevated BRI', actions: ['Waist and BMI staging', 'Cardiometabolic labs', 'Lifestyle / GLP-1 / sleep apnea as indicated'] },
    ],
    pearls: [
      'Measure waist at the iliac crest or midpoint per local protocol; technique changes BRI.',
      'If WC/(2π) ≥ 0.5×height the ellipse is undefined — inner term is clamped and BRI approaches 364.',
    ],
  },

  // ─── 3. ROX index ──────────────────────────────────────────────────────────
  {
    id: 'rox-index',
    name: 'ROX Index (HFNC failure)',
    shortName: 'ROX',
    description:
      'ROX = (SpO₂ / FiO₂) / respiratory rate. Predicts high-flow nasal cannula success vs intubation need, with time-specific cutoffs.',
    category: 'pulmonary',
    tags: ['rox', 'hfnc', 'intubation', 'hypoxemia', 'icu', 'respiratory failure'],
    whenToUse: 'Adults on HFNC for acute hypoxemic respiratory failure (especially pneumonia) when deciding whether to continue HFNC or intubate.',
    whyUse: 'Simple bedside ratio; 12-hour ROX ≥4.88 predicts HFNC success. Earlier 2 h / 6 h cutoffs (2.85 / 3.47) flag high intubation risk.',
    inputs: [
      numberInput('spo2', 'SpO₂', { unit: '%', min: 50, max: 100, step: 1, defaultValue: 98, helpText: 'Current pulse-oximetry SpO₂ (%) on HFNC at the selected timepoint.' }),
      numberInput('fio2', 'FiO₂ (fraction)', {
        unit: 'fraction',
        min: 0.21,
        max: 1,
        step: 0.01,
        defaultValue: 0.4,
        helpText: '0.21 (air) to 1.00. Convert % by dividing by 100 (e.g. 40% → 0.40).',
      }),
      numberInput('rr', 'Respiratory rate', { unit: '/min', min: 8, max: 50, step: 1, defaultValue: 20, helpText: 'Count RR over 30–60 s on HFNC at the same moment as SpO₂/FiO₂.' }),
      selectInput(
        'timepoint',
        'HFNC assessment time',
        [
          { label: '2 hours', value: '2h', description: 'High intubation-risk cutoff ROX <2.85 at 2 h of HFNC.' },
          { label: '6 hours', value: '6h', description: 'High intubation-risk cutoff ROX <3.47 at 6 h of HFNC.' },
          { label: '12 hours', value: '12h', description: '12 h: ≥4.88 success likely; 3.85–4.87 indeterminate; <3.85 high failure risk.' },
        ],
        '12h',
        'Selects which published intubation-risk cutoff is used for the risk band (does not change the ROX number).',
      ),
    ],
    calculate(values) {
      const spo2 = num(values.spo2, 98);
      const fio2 = Math.max(num(values.fio2, 0.4), 0.21);
      const rr = Math.max(num(values.rr, 20), 1);
      const timepoint = str(values.timepoint, '12h');
      const rox = round(spo2 / fio2 / rr, 2);
      const cutoff2 = 2.85;
      const cutoff6 = 3.47;
      const cutoff12Low = 4.88;
      const cutoff12High = 3.85;
      let riskLevel: 'low' | 'moderate' | 'high' = 'low';
      let label = '';
      let interpretation = '';
      if (timepoint === '2h') {
        if (rox >= cutoff2) {
          riskLevel = 'low';
          label = '2h ROX ≥2.85 — lower intubation risk';
          interpretation = `ROX ${rox} at 2 h is ≥2.85. Intubation risk is relatively lower at this early time point; continue HFNC with close monitoring.`;
        } else {
          riskLevel = 'high';
          label = '2h ROX <2.85 — high intubation risk';
          interpretation = `ROX ${rox} at 2 h is <2.85. High risk of HFNC failure — reassess work of breathing and intubation threshold.`;
        }
      } else if (timepoint === '6h') {
        if (rox >= cutoff6) {
          riskLevel = 'low';
          label = '6h ROX ≥3.47 — lower intubation risk';
          interpretation = `ROX ${rox} at 6 h is ≥3.47. Lower predicted intubation risk at 6 hours; continue to reassess.`;
        } else {
          riskLevel = 'high';
          label = '6h ROX <3.47 — high intubation risk';
          interpretation = `ROX ${rox} at 6 h is <3.47. High risk of HFNC failure — consider intubation if work of breathing or hypoxemia is worsening.`;
        }
      } else if (rox >= cutoff12Low) {
        riskLevel = 'low';
        label = '12h ROX ≥4.88 — HFNC success likely';
        interpretation = `ROX ${rox} at 12 h is ≥4.88. HFNC success is likely (Roca validation). Continue current support and wean as able.`;
      } else if (rox >= cutoff12High) {
        riskLevel = 'moderate';
        label = '12h ROX 3.85–4.87 — indeterminate';
        interpretation = `ROX ${rox} at 12 h is between 3.85 and 4.88. Intermediate intubation risk — frequent reassessment of work of breathing.`;
      } else {
        riskLevel = 'high';
        label = '12h ROX <3.85 — high intubation risk';
        interpretation = `ROX ${rox} at 12 h is <3.85. High risk of HFNC failure — prepare for intubation if not already improving.`;
      }
      return {
        score: rox,
        unit: 'ROX',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'SpO₂/FiO₂', value: round(spo2 / fio2, 1).toString() },
          { label: 'RR', value: `${rr} /min` },
          { label: 'Timepoint used', value: timepoint },
          { label: '2 h high-risk cutoff', value: `<${cutoff2}` },
          { label: '6 h high-risk cutoff', value: `<${cutoff6}` },
          { label: '12 h success cutoff', value: `≥${cutoff12Low}` },
          { label: '12 h high-risk cutoff', value: `<${cutoff12High}` },
        ],
      };
    },
    evidence: {
      summary:
        'ROX = (SpO₂/FiO₂)/RR. Roca 2016 (derivation) and subsequent validation: 12 h ROX ≥4.88 predicts HFNC success; <3.85 predicts failure. 2 h cutoff 2.85 and 6 h cutoff 3.47 identify early high risk.',
      formula: 'ROX = (SpO₂ / FiO₂_fraction) / RR',
      validation:
        'Derived in pneumonia/HFNC (Roca J Crit Care 2016); prospectively validated (Roca AJRCCM 2019). Best studied in hypoxemic pneumonia; interpret cautiously in other phenotypes.',
      references: [
        {
          title: 'Predicting success of high-flow nasal cannula in pneumonia patients with hypoxemic respiratory failure: the ROX index',
          citation: 'Roca O et al. J Crit Care. 2016',
          year: 2016,
          pmid: '27481760',
          doi: '10.1016/j.jcrc.2016.05.022',
        },
      ],
    },
    nextSteps: [
      { condition: 'Low risk', actions: ['Continue HFNC', 'Wean FiO₂ as SpO₂ allows', 'Recompute ROX at next timepoint'] },
      { condition: 'High risk', actions: ['ICU/airway-skilled clinician at bedside', 'Reassess work of breathing', 'Do not delay intubation if tiring'] },
    ],
    pearls: [
      'FiO₂ must be the fraction (0.21–1.0), not percent.',
      'ROX does not capture hypercapnia, secretions, or declining mental status — those still warrant intubation.',
    ],
  },

  // ─── 4. HACOR ──────────────────────────────────────────────────────────────
  {
    id: 'hacor',
    name: 'HACOR NIV Failure Score',
    shortName: 'HACOR',
    description:
      'Heart rate, Acidosis (pH), Consciousness (GCS), Oxygenation (PaO₂/FiO₂), and Respiratory rate — predicts noninvasive ventilation failure at 1–2 hours.',
    category: 'critical-care',
    tags: ['hacor', 'niv', 'copd', 'intubation', 'respiratory failure'],
    whenToUse: 'Adults receiving NIV (especially COPD hypercapnic failure) after ~1 hour, to predict NIV failure (intubation or death on NIV).',
    whyUse: 'Score ≥5 at 1–2 h of NIV predicted ~50% failure in derivation; early intubation in high-risk patients was associated with lower mortality.',
    inputs: [
      numberInput('hr', 'Heart rate', { unit: '/min', min: 40, max: 180, step: 1, defaultValue: 90, helpText: 'Use values after ~1 hour of optimized NIV (Duan 2017), not the pre-NIV gas. HACOR is for NIV — not already-intubated patients. HR ≥120 = 1 point.' }),
      numberInput('ph', 'Arterial pH', { min: 6.8, max: 7.6, step: 0.01, defaultValue: 7.36, helpText: 'Arterial pH after ~1 h NIV. ≥7.35 = 0; 7.30–7.34 = 2; 7.25–7.29 = 3; <7.25 = 4.' }),
      numberInput('gcs', 'Glasgow Coma Scale', { min: 3, max: 15, step: 1, defaultValue: 15, helpText: 'Total GCS 3–15. Not for already-intubated patients. 15 = 0; 13–14 = 2; 11–12 = 5; ≤10 = 10.' }),
      numberInput('pf', 'PaO₂/FiO₂', { unit: 'mmHg', min: 40, max: 600, step: 1, defaultValue: 220, helpText: 'PaO₂/FiO₂ after ~1 h NIV. ≥201 = 0; 151–200 = 2; 101–150 = 3; ≤100 = 4.' }),
      numberInput('rr', 'Respiratory rate', { unit: '/min', min: 8, max: 60, step: 1, defaultValue: 24, helpText: 'RR after ~1 h NIV. ≤30 = 0; 31–35 = 1; 36–40 = 2; 41–45 = 3; ≥46 = 4.' }),
    ],
    calculate(values) {
      const hr = num(values.hr, 90);
      const ph = num(values.ph, 7.36);
      const gcs = num(values.gcs, 15);
      const pf = num(values.pf, 220);
      const rr = num(values.rr, 24);
      const hrPts = hacorHrPts(hr);
      const phPts = hacorPhPts(ph);
      const gcsPts = hacorGcsPts(gcs);
      const pfPts = hacorPfPts(pf);
      const rrPts = hacorRrPts(rr);
      const score = hrPts + phPts + gcsPts + pfPts + rrPts;
      const r = riskFromThresholds(score, [
        {
          max: 4,
          level: 'low',
          label: 'HACOR 0–4 — NIV success likely',
          interpretation: `HACOR ${score} at ~1 h: below the failure threshold of 5. NIV success is more likely; continue with serial scores.`,
        },
        {
          max: 7,
          level: 'high',
          label: 'HACOR 5–7 — NIV failure risk',
          interpretation: `HACOR ${score}: ≥5 at 1–2 h predicted NIV failure (~50% in derivation). Reassess for intubation; treat reversible causes.`,
        },
        {
          max: 18,
          level: 'critical',
          label: 'HACOR ≥8 — high NIV failure risk',
          interpretation: `HACOR ${score}: high likelihood of NIV failure. Prepare for intubation unless a rapidly reversible cause is being treated.`,
        },
      ]);
      return {
        score,
        unit: 'points',
        ...r,
        details: [
          { label: 'Heart rate points', value: `${hrPts} (HR ${hr})` },
          { label: 'pH points', value: `${phPts} (pH ${ph})` },
          { label: 'GCS points', value: `${gcsPts} (GCS ${gcs})` },
          { label: 'PaO₂/FiO₂ points', value: `${pfPts} (P/F ${pf})` },
          { label: 'RR points', value: `${rrPts} (RR ${rr})` },
        ],
      };
    },
    evidence: {
      summary:
        'HACOR (Duan 2017): HR <120 = 0, ≥120 = 1; pH ≥7.35 = 0, 7.30–7.34 = 2, 7.25–7.29 = 3, <7.25 = 4; GCS 15 = 0, 13–14 = 2, 11–12 = 5, ≤10 = 10; PaO₂/FiO₂ ≥201 = 0, 151–200 = 2, 101–150 = 3, ≤100 = 4; RR ≤30 = 0, 31–35 = 1, 36–40 = 2, 41–45 = 3, ≥46 = 4. Range 0–18. ≥5 at 1 h predicts NIV failure.',
      formula: 'Sum of HR + pH + GCS + P/F + RR category points (max 18)',
      validation: 'Derived/validated in COPD NIV cohorts (Intensive Care Med 2017); later updated HACOR adds baseline variables.',
      references: [
        {
          title: 'Early prediction of noninvasive ventilation failure in COPD patients: derivation and validation of HACOR',
          citation: 'Duan J et al. Intensive Care Med. 2017 / Crit Care 2019 related reports',
          year: 2017,
          pmid: '28497231',
          doi: '10.1007/s00134-017-4777-1',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score ≥5', actions: ['Airway-skilled clinician', 'Optimize NIV settings / secretions / hemodynamics', 'Do not delay intubation if tiring'] },
      { condition: 'Score <5', actions: ['Continue NIV', 'Repeat HACOR if worsening'] },
    ],
    pearls: [
      'Score the values after ~1 hour of optimized NIV, not the pre-NIV gases alone.',
      'HACOR was derived mainly in COPD; extra-caution in de novo hypoxemic failure.',
    ],
  },

  // ─── 5. 2023 Duke-ISCVID IE criteria ───────────────────────────────────────
  {
    id: 'duke-iscvid-2023',
    name: '2023 Duke-ISCVID Infective Endocarditis Criteria',
    shortName: 'Duke-ISCVID 2023',
    description:
      '2023 Duke–International Society for Cardiovascular Infectious Diseases clinical criteria for infective endocarditis (definite / possible / rejected). Updates imaging (PET/CT, cardiac CTA), microbiology, surgical inspection, and predisposition (TAVR, CIED, LVAD).',
    category: 'infectious-disease',
    tags: ['endocarditis', 'duke', 'iscvid', 'ie', 'pet-ct', 'valve'],
    whenToUse: 'Suspected native, prosthetic, transcatheter, or CIED-associated infective endocarditis.',
    whyUse:
      '2023 update is more sensitive than modified Duke (2000) by counting 18F-FDG PET/CT, cardiac CT, intraoperative inspection, and additional typical organisms, without a large specificity loss in validation cohorts.',
    inputs: [
      yesNo(
        'microMajor',
        'Major microbiology: typical IE organisms from ≥2 blood-culture sets, OR Coxiella / Bartonella / T. whipplei serology or PCR meeting major definitions',
        null,
        'Typical native-valve organisms: S. aureus, S. lugdunensis, E. faecalis, all streptococci except S. pneumoniae and S. pyogenes, Granulicatella/Abiotrophia/Gemella, HACEK. Additional organisms are typical only with prosthetic material. Nontypical organisms need ≥3 separate sets. Coxiella phase I IgG >1:800; Bartonella IgG ≥1:800.',
      ),
      yesNo(
        'imagingMajor',
        'Major imaging: vegetation, abscess, pseudoaneurysm, fistula, new prosthetic dehiscence, or new significant regurgitation on echo/cardiac CTA, OR abnormal 18F-FDG PET/CT involving valve/prosthesis/CIED',
        null,
        'New regurgitation vs prior imaging — worsening of known regurgitation is not major. PET/CT major generally applies ≥3 months after prosthetic implant (postoperative uptake otherwise). Cardiac CTA equivalent findings count.',
      ),
      yesNo(
        'surgicalMajor',
        'Major surgical: intraoperative inspection with evidence of IE',
        null,
        'Vegetation, destruction, abscess, fistula, or infectious prosthetic dehiscence on surgical inspection.',
      ),
      yesNo('pathologic', 'Pathologic criteria: microorganisms or active endocarditis on vegetation, explanted valve/CIED, or embolus', null, 'Pathologic criteria independently make IE definite regardless of clinical count.'),
      yesNo(
        'predisposition',
        'Minor predisposition: prior IE, prosthetic/TAVR valve, valve repair, CHD, CIED, HOCM, >mild native valve disease, IVDU, LVAD/MCS',
        null,
        'Any one counts as the predisposition minor. 2023 list includes TAVR, CIED, prior IE, and LVAD/MCS.',
      ),
      yesNo('fever', 'Minor: fever ≥38.0 °C', null, 'Documented temperature ≥38.0 °C.'),
      yesNo(
        'vascular',
        'Minor vascular: arterial emboli, septic pulmonary infarcts, mycotic aneurysm, ICH, conjunctival hemorrhage, Janeway lesions, splenic/cerebral abscess',
        null,
        'Any one vascular/embolic phenomenon counts. Janeway = nontender palmar/plantar macules (not Osler nodes).',
      ),
      yesNo('immuno', 'Minor immunologic: Osler nodes, Roth spots, glomerulonephritis, rheumatoid factor', null, 'RF = rheumatoid factor, not rheumatic fever.'),
      yesNo(
        'microMinor',
        'Minor microbiology: positive cultures or serology not meeting major definitions',
        null,
        'Use only if major microbiology is not met (do not double-count the same isolates).',
      ),
    ],
    calculate(values) {
      const microMajor = bool(values.microMajor);
      const imagingMajor = bool(values.imagingMajor);
      const surgicalMajor = bool(values.surgicalMajor);
      const pathologic = bool(values.pathologic);
      const predisposition = bool(values.predisposition);
      const fever = bool(values.fever);
      const vascular = bool(values.vascular);
      const immuno = bool(values.immuno);
      const microMinor = bool(values.microMinor);
      const majors: string[] = [];
      if (microMajor) majors.push('microbiology');
      if (imagingMajor) majors.push('imaging');
      if (surgicalMajor) majors.push('surgical');
      const minors: string[] = [];
      if (predisposition) minors.push('predisposition');
      if (fever) minors.push('fever');
      if (vascular) minors.push('vascular');
      if (immuno) minors.push('immunologic');
      if (microMinor) minors.push('microbiology-minor');
      const major = majors.length;
      const minor = minors.length;
      const definiteClinical = major >= 2 || (major >= 1 && minor >= 3) || minor >= 5;
      const possible = (major >= 1 && minor >= 1) || minor >= 3;
      let label = 'Rejected';
      let riskLevel: 'low' | 'moderate' | 'high' = 'low';
      let interpretation =
        'Does not meet 2023 Duke-ISCVID possible or definite clinical criteria. Reject only if an alternate diagnosis is firm or pathology is negative after <4 days of antibiotics.';
      if (pathologic || definiteClinical) {
        label = pathologic && !definiteClinical ? 'Definite IE (pathologic)' : 'Definite IE';
        riskLevel = 'high';
        interpretation = pathologic
          ? 'Pathologic criteria met (and/or definite clinical pattern). Treat as definite IE with ID and cardiology/surgery input.'
          : 'Definite IE by clinical criteria: 2 major, or 1 major + 3 minor, or 5 minor.';
      } else if (possible) {
        label = 'Possible IE';
        riskLevel = 'moderate';
        interpretation = 'Possible IE (1 major + 1 minor, or 3 minor). Do not reject; complete imaging, cultures/PCR, and specialist review.';
      }
      return {
        score: `${major}M/${minor}m`,
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Major count', value: String(major) },
          { label: 'Minor count', value: String(minor) },
          { label: 'Majors present', value: majors.length ? majors.join(', ') : 'none' },
          { label: 'Minors present', value: minors.length ? minors.join(', ') : 'none' },
          { label: 'Pathologic criteria', value: pathologic ? 'Yes' : 'No' },
        ],
      };
    },
    evidence: {
      summary:
        '2023 Duke-ISCVID: definite = pathologic OR 2 major OR 1 major+3 minor OR 5 minor; possible = 1 major+1 minor OR 3 minor. New major: PET/CT, cardiac CT, surgical inspection; expanded typical organisms and predisposition (TAVR, CIED, prior IE).',
      formula: 'Classification from major/minor counts (pathologic independently definite)',
      validation:
        'More sensitive than modified Duke and 2015 ESC in consecutive suspected-IE cohorts, with similar specificity (van der Vaart / Fowler group 2024).',
      references: [
        {
          title: 'The 2023 Duke-ISCVID Criteria for Infective Endocarditis: Updating the Modified Duke Criteria',
          citation: 'Fowler VG et al. Clin Infect Dis. 2023',
          year: 2023,
          pmid: '37138445',
          doi: '10.1093/cid/ciad271',
        },
      ],
    },
    nextSteps: [
      { condition: 'Possible or definite', actions: ['≥3 blood-culture sets before antibiotics if stable', 'TTE ± TEE', 'PET/CT or cardiac CTA if prosthetic/CIED', 'ID + cardiology/surgery'] },
      { condition: 'Rejected', actions: ['Seek alternate diagnosis', 'Stop empiric IE therapy if cultures negative and imaging unrevealing'] },
    ],
    pearls: [
      'This helper is not the 2000 modified Duke tool (`duke-criteria`); use 2023 definitions for current classification.',
      'PET/CT major imaging generally applies ≥3 months after prosthetic implantation to avoid postoperative uptake.',
      'Enterococcus faecalis and additional streptococci are treated as typical in many 2023 lists.',
    ],
  },

  // ─── 6. H2FPEF ─────────────────────────────────────────────────────────────
  {
    id: 'h2fpef',
    name: 'H2FPEF Score',
    shortName: 'H2FPEF',
    description:
      'Estimates the probability that unexplained dyspnea with preserved EF is due to HFpEF (Heavy, Hypertensive, AF, Pulmonary hypertension, Elder, Filling pressure).',
    category: 'cardiology',
    tags: ['hfpef', 'h2fpef', 'heart failure', 'diastolic', 'dyspnea'],
    whenToUse: 'Adults with unexplained dyspnea and LVEF ≥50% when HFpEF is in the differential.',
    whyUse: 'Separates HFpEF from non-cardiac dyspnea using six routinely available variables; high scores can make the diagnosis without invasive testing.',
    inputs: [
      numberInput('bmi', 'BMI', { unit: 'kg/m²', min: 15, max: 60, step: 0.1, defaultValue: 28, helpText: 'Heavy: 2 points if BMI >30' }),
      numberInput('htnMeds', 'Antihypertensive medications', {
        unit: 'agents',
        min: 0,
        max: 8,
        step: 1,
        defaultValue: 1,
        helpText: 'Hypertensive: 1 point if ≥2 BP medicines',
      }),
      yesNo('af', 'Atrial fibrillation (paroxysmal or persistent)', 3, 'Any history of AF (paroxysmal, persistent, or permanent) — 3 points. Heavy (BMI >30) is scored from the BMI field.'),
      numberInput('pasp', 'Estimated PASP (echo)', { unit: 'mmHg', min: 15, max: 80, step: 1, defaultValue: 30, helpText: '1 point if PASP >35' }),
      numberInput('age', 'Age', { unit: 'years', min: 18, max: 100, step: 1, defaultValue: 65, helpText: 'Elder: 1 point if age >60' }),
      numberInput('ee', "E/e′ (average)", { min: 3, max: 25, step: 0.1, defaultValue: 8, helpText: 'Filling pressure: 1 point if E/e′ >9' }),
    ],
    calculate(values) {
      const bmi = num(values.bmi, 28);
      const htnMeds = num(values.htnMeds, 1);
      const af = bool(values.af);
      const pasp = num(values.pasp, 30);
      const age = num(values.age, 65);
      const ee = num(values.ee, 8);
      const heavy = bmi > 30 ? 2 : 0;
      const htn = htnMeds >= 2 ? 1 : 0;
      const afPts = af ? 3 : 0;
      const ph = pasp > 35 ? 1 : 0;
      const elder = age > 60 ? 1 : 0;
      const fill = ee > 9 ? 1 : 0;
      const score = heavy + htn + afPts + ph + elder + fill;
      const r = riskFromThresholds(score, [
        {
          max: 1,
          level: 'low',
          label: 'Low HFpEF probability (0–1)',
          interpretation: `H2FPEF ${score}/9: low probability of HFpEF. Consider non-cardiac dyspnea work-up.`,
        },
        {
          max: 5,
          level: 'moderate',
          label: 'Intermediate (2–5)',
          interpretation: `H2FPEF ${score}/9: intermediate. Diastolic stress echo or invasive hemodynamics (rest ± exercise) often needed.`,
        },
        {
          max: 9,
          level: 'high',
          label: 'High HFpEF probability (6–9)',
          interpretation: `H2FPEF ${score}/9: high probability of HFpEF. Treat congestion, AF, BP, obesity; SGLT2i as indicated.`,
        },
      ]);
      return {
        score,
        unit: '/9',
        ...r,
        details: [
          { label: 'Heavy (BMI>30)', value: `${heavy} (BMI ${bmi})` },
          { label: 'Hypertensive (≥2 meds)', value: `${htn} (${htnMeds} agents)` },
          { label: 'AF', value: `${afPts}` },
          { label: 'Pulmonary HTN (PASP>35)', value: `${ph} (PASP ${pasp})` },
          { label: 'Elder (age>60)', value: `${elder} (age ${age})` },
          { label: "Filling (E/e′>9)", value: `${fill} (E/e′ ${ee})` },
        ],
      };
    },
    evidence: {
      summary:
        'Reddy 2018: Heavy BMI>30 = 2; ≥2 antihypertensives = 1; AF = 3; PASP>35 = 1; age>60 = 1; E/e′>9 = 1. Total 0–9. Higher scores correspond to higher HFpEF probability vs non-cardiac dyspnea.',
      formula: 'H2FPEF = 2·(BMI>30) + 1·(≥2 BP meds) + 3·AF + 1·(PASP>35) + 1·(age>60) + 1·(E/e′>9)',
      validation: 'Derived against invasive hemodynamics; widely used as a pre-test probability tool (ESC/AHA HFpEF pathways).',
      references: [
        {
          title: 'A Simple, Evidence-Based Approach to Help Guide Diagnosis of HFpEF (H2FPEF)',
          citation: 'Reddy YNV, Carter RE, Obokata M, Redfield MM, Borlaug BA. Circulation. 2018',
          year: 2018,
          pmid: '29724363',
          doi: '10.1161/CIRCULATIONAHA.118.034646',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score 0–1', actions: ['Alternative dyspnea causes (lung, deconditioning, ischemia)'] },
      { condition: 'Score 2–5', actions: ['Diastolic stress echo or cath with exercise', 'NT-proBNP'] },
      { condition: 'Score ≥6', actions: ['Treat as HFpEF', 'SGLT2i', 'Volume / AF / BP / obesity management'] },
    ],
    pearls: [
      'AF alone is 3 points — paroxysmal counts.',
      'H2FPEF is not a congestion score; a low score does not exclude other heart disease.',
    ],
  },

  // ─── 7. HFA-PEFF ───────────────────────────────────────────────────────────
  {
    id: 'hfa-peff',
    name: 'HFA-PEFF Diagnostic Score',
    shortName: 'HFA-PEFF',
    description:
      'ESC HFA-PEFF stepwise score for HFpEF: functional, morphological, and biomarker domains (major = 2, minor = 1 each; max 2 per domain, total 0–6).',
    category: 'cardiology',
    tags: ['hfpef', 'hfa-peff', 'esc', 'diastolic', 'nt-probnp'],
    whenToUse: 'Suspected HFpEF after pretest clinical assessment (step 1) when echo and natriuretic peptides are available (step 2).',
    whyUse: '≥5 points = definite HFpEF; 2–4 = intermediate (diastolic stress / invasive); ≤1 = HFpEF unlikely.',
    inputs: [
      selectInput(
        'functional',
        'Functional domain (e′, E/e′, TR velocity/PASP, GLS)',
        [
          { label: 'None', value: 0, points: 0, description: 'No functional minor or major criterion met.' },
          { label: 'Minor only (average E/e′ 9–14 or GLS <16%)', value: 1, points: 1, description: 'Average E/e′ 9–14 or GLS <16%, without a major functional criterion.' },
          { label: 'Major (septal e′ <7 cm/s or lateral e′ <10 cm/s, or E/e′ ≥15, or TR >2.8 m/s)', value: 2, points: 2, description: 'Any one major: septal e′ <7 cm/s, lateral e′ <10 cm/s, average E/e′ ≥15, or TR velocity >2.8 m/s (PASP elevation).' },
        ],
        0,
        'Score the higher criterion only (never 3 in one domain). Septal/lateral e′ and TR >2.8 m/s are major-only. e′ in cm/s; E/e′ unitless; TR in m/s; GLS in %.',
      ),
      selectInput(
        'morphological',
        'Morphological domain (LAVI, LVMI, RWT, wall thickness)',
        [
          { label: 'None', value: 0, points: 0, description: 'No morphological minor or major criterion met.' },
          { label: 'Minor only (LAVI 29–34 mL/m², LVMI ≥115/95 g/m² M/F, RWT >0.42, WT ≥12 mm)', value: 1, points: 1, description: 'LAVI 29–34 mL/m², or LVMI ≥115 (M) / ≥95 (F) g/m², or RWT >0.42, or wall thickness ≥12 mm — without a major morphologic criterion.' },
          { label: 'Major (LAVI >34 mL/m², or LVMI ≥149/122 g/m² M/F AND RWT >0.42)', value: 2, points: 2, description: 'LAVI >34 mL/m², or concentric hypertrophy: LVMI ≥149 (M) / ≥122 (F) g/m² AND RWT >0.42.' },
        ],
        0,
        'Score the higher criterion only (never 3 in one domain). LAVI in mL/m²; LVMI in g/m² (male/female); RWT unitless; wall thickness in mm.',
      ),
      selectInput(
        'biomarker',
        'Biomarker domain (NT-proBNP / BNP by rhythm)',
        [
          { label: 'None', value: 0, points: 0, description: 'NP below the sinus-rhythm minor cutoffs (NT-proBNP <125 or BNP <35 pg/mL in SR; use AF cutoffs if in AF).' },
          { label: 'Minor (NT-proBNP 125–220 SR / 365–660 AF; BNP 35–80 / 105–240 pg/mL)', value: 1, points: 1, description: 'Sinus: NT-proBNP 125–220 or BNP 35–80 pg/mL. AF: NT-proBNP 365–660 or BNP 105–240 pg/mL.' },
          { label: 'Major (NT-proBNP >220 SR / >660 AF; BNP >80 / >240 pg/mL)', value: 2, points: 2, description: 'Sinus: NT-proBNP >220 or BNP >80 pg/mL. AF: NT-proBNP >660 or BNP >240 pg/mL.' },
        ],
        0,
        'Score the higher criterion only (never 3 in one domain). NP values in pg/mL. AF thresholds are higher than sinus rhythm.',
      ),
    ],
    calculate(values) {
      const functional = num(values.functional, 0);
      const morphological = num(values.morphological, 0);
      const biomarker = num(values.biomarker, 0);
      const score = functional + morphological + biomarker;
      const r = riskFromThresholds(score, [
        {
          max: 1,
          level: 'low',
          label: 'HFpEF unlikely (0–1)',
          interpretation: `HFA-PEFF ${score}/6: HFpEF unlikely. Seek alternative diagnoses for dyspnea.`,
        },
        {
          max: 4,
          level: 'moderate',
          label: 'Intermediate (2–4) — further testing',
          interpretation: `HFA-PEFF ${score}/6: intermediate. Proceed to diastolic stress echo and/or invasive hemodynamics (rest ± exercise).`,
        },
        {
          max: 6,
          level: 'high',
          label: 'Definite HFpEF (5–6)',
          interpretation: `HFA-PEFF ${score}/6: definite HFpEF by HFA algorithm step 2. Treat and phenotype (AF, obesity, CKD, amyloid as indicated).`,
        },
      ]);
      return {
        score,
        unit: '/6',
        ...r,
        details: [
          { label: 'Functional', value: String(functional) },
          { label: 'Morphological', value: String(morphological) },
          { label: 'Biomarker', value: String(biomarker) },
        ],
      };
    },
    evidence: {
      summary:
        'Pieske 2019 HFA/ESC: three domains. Major criterion = 2 points, minor = 1; only the higher fulfilled criterion counts per domain (max 2/domain). Total 0–6. ≥5 definite HFpEF; 2–4 intermediate; ≤1 unlikely.',
      formula: 'Score = functional (0–2) + morphological (0–2) + biomarker (0–2)',
      validation: 'Consensus algorithm; validated against invasive HFpEF diagnosis with good specificity at ≥5.',
      references: [
        {
          title: 'How to diagnose heart failure with preserved ejection fraction: the HFA-PEFF diagnostic algorithm',
          citation: 'Pieske B et al. Eur Heart J. 2019',
          year: 2019,
          pmid: '31504452',
          doi: '10.1093/eurheartj/ehz641',
        },
      ],
    },
    nextSteps: [
      { condition: '≤1', actions: ['Alternative dyspnea work-up'] },
      { condition: '2–4', actions: ['Diastolic stress echo', 'Invasive LVEDP/PCWP rest and exercise'] },
      { condition: '≥5', actions: ['Diagnose HFpEF', 'SGLT2i', 'Phenotype-specific therapy'] },
    ],
    pearls: [
      'Do not add major and minor in the same domain — cap at 2 points.',
      'NP thresholds are higher in AF than in sinus rhythm.',
    ],
  },

  // ─── 8. PECARN CSI ─────────────────────────────────────────────────────────
  {
    id: 'pecarn-csi',
    name: 'PECARN Cervical Spine Injury Rule',
    shortName: 'PECARN CSI',
    description:
      '2024 PECARN clinical prediction rule for cervical spine injury after blunt trauma in children — identifies who can be clinically cleared vs who needs x-ray or CT.',
    category: 'emergency',
    tags: ['pecarn', 'c-spine', 'pediatric', 'trauma', 'imaging'],
    whenToUse: 'Children 0–17 years after blunt trauma when CSI is a concern (EMS transport, trauma activation, or imaging being considered).',
    whyUse:
      'No risk factors: CSI ~0.2% and the neck can usually be clinically cleared. High-risk findings (~12% CSI) triage to CT; isolated intermediate findings to x-ray first.',
    inputs: [
      yesNo('gcsUnresponsive', 'High-risk: GCS 3–8 or unresponsive (AVPU = U)', null, 'GCS 3–8, or AVPU = Unresponsive (does not respond to voice or pain). High-risk → CT C-spine.'),
      yesNo('abnormalAbc', 'High-risk: abnormal airway, breathing, or circulation', null, 'Observed abnormal A/B/C: advanced airway, apnea/hypopnea, shock, or CPR — not a vague “looks unwell.”'),
      yesNo('focalNeuro', 'High-risk: focal neurologic deficit (paresthesia, numbness, or weakness)', null, 'New motor or sensory deficit or paresthesia suggesting spinal cord/root injury — not a chronic baseline deficit.'),
      yesNo('ams', 'Intermediate: altered mental status (GCS 9–14, AVPU V/P, or other AMS)', null, 'GCS 9–14 or AVPU Voice/Pain. Distinct from high-risk GCS 3–8 / AVPU U. Intermediate → x-ray first if no high-risk factor.'),
      yesNo('neckPain', 'Intermediate: self-reported neck pain', null, 'Child or caregiver reports neck pain. Distinct from clinician-elicited posterior midline bony tenderness.'),
      yesNo('midlineTenderness', 'Intermediate: posterior midline neck tenderness', null, 'Posterior midline bony tenderness. An uncooperative preverbal exam is not a No — if you cannot assess, do not clear the neck on this item.'),
      yesNo('substantialHead', 'Intermediate: substantial head injury (needs OR or admission)', null, 'Leonard 2024: injury that warrants observation or surgery (e.g. skull fracture).'),
      yesNo('substantialTorso', 'Intermediate: substantial torso injury (needs OR or admission)', null, 'Leonard 2024: injury that warrants observation or surgery (pneumothorax, solid-organ injury, pelvic or spine fracture).'),
    ],
    calculate(values) {
      const gcsUnresponsive = bool(values.gcsUnresponsive);
      const abnormalAbc = bool(values.abnormalAbc);
      const focalNeuro = bool(values.focalNeuro);
      const ams = bool(values.ams);
      const neckPain = bool(values.neckPain);
      const midlineTenderness = bool(values.midlineTenderness);
      const substantialHead = bool(values.substantialHead);
      const substantialTorso = bool(values.substantialTorso);
      const highFlags: string[] = [];
      if (gcsUnresponsive) highFlags.push('GCS≤8/unresponsive');
      if (abnormalAbc) highFlags.push('abnormal ABC');
      if (focalNeuro) highFlags.push('focal neuro deficit');
      const midFlags: string[] = [];
      if (ams) midFlags.push('AMS');
      if (neckPain) midFlags.push('neck pain');
      if (midlineTenderness) midFlags.push('midline tenderness');
      if (substantialHead) midFlags.push('substantial head injury');
      if (substantialTorso) midFlags.push('substantial torso injury');
      const highN = highFlags.length;
      const midN = midFlags.length;
      const score = highN + midN;
      let riskLevel: 'low' | 'moderate' | 'high' = 'low';
      let label = 'Low risk — no CSI predictors';
      let interpretation =
        'No PECARN CSI risk factors. Injury risk ~0.2%; the cervical spine can usually be clinically cleared without imaging (if the exam is reliable and mechanism is not excluded).';
      if (highN > 0) {
        riskLevel = 'high';
        label = 'High risk — CT C-spine';
        interpretation = `${highN} high-risk factor(s). CSI risk ~12%. PECARN algorithm triages to CT (maintain collar; analgesia does not invalidate the exam).`;
      } else if (midN > 0) {
        riskLevel = 'moderate';
        label = 'Intermediate risk — C-spine x-ray first';
        interpretation = `${midN} intermediate factor(s) without high-risk findings. CSI risk ~3%. Start with plain radiographs; CT if x-rays inadequate or injury seen.`;
      }
      return {
        score,
        unit: 'risk factors',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'High-risk count', value: String(highN) },
          { label: 'Intermediate count', value: String(midN) },
          { label: 'High-risk factors', value: highFlags.length ? highFlags.join(', ') : 'none' },
          { label: 'Intermediate factors', value: midFlags.length ? midFlags.join(', ') : 'none' },
        ],
      };
    },
    evidence: {
      summary:
        'Leonard 2024 PECARN (n=22,430, CSI 1.9%). High-risk (CT): GCS 3–8 or AVPU U; abnormal ABC; focal neurologic deficit. Intermediate (x-ray): AMS (GCS 9–14), neck pain, midline tenderness, substantial head injury, substantial torso injury. No factors: clinically clear (NPV 99.9%).',
      formula: 'Count of present high-risk + intermediate factors; imaging pathway from the highest tier present',
      validation: 'Multicentre prospective PECARN derivation/validation; sensitivity ~94% for any CSI when high + intermediate factors combined.',
      references: [
        {
          title: 'PECARN prediction rule for cervical spine imaging of children with blunt trauma',
          citation: 'Leonard JC et al. Lancet Child Adolesc Health. 2024',
          year: 2024,
          pmid: '38843852',
          doi: '10.1016/S2352-4642(24)00104-4',
        },
      ],
    },
    nextSteps: [
      { condition: 'No factors', actions: ['Clinical clearance if exam reliable', 'Remove collar'] },
      { condition: 'Intermediate only', actions: ['C-spine x-rays', 'Keep collar until cleared', 'CT if films inadequate'] },
      { condition: 'Any high-risk', actions: ['CT C-spine', 'Maintain immobilization', 'Pediatric trauma / spine consult if deficit'] },
    ],
    pearls: [
      'Mechanism alone is not a rule-in factor in the 2024 model — but trivial mechanism patients were excluded from the pathway.',
      'SCIWORA is more common in children; MRI if cord injury is suspected despite negative CT.',
    ],
  },

  // ─── 9. 2HELPS2B ───────────────────────────────────────────────────────────
  {
    id: 'helps2b',
    name: '2HELPS2B Seizure Risk (cEEG)',
    shortName: '2HELPS2B',
    description:
      'Predicts electrographic seizure probability in hospitalized patients from 1-hour cEEG screening plus seizure history. Guides how long to continue continuous EEG.',
    category: 'neurology',
    tags: ['ceeg', 'seizure', 'icu', '2helps2b', 'birds'],
    whenToUse: 'Acutely ill inpatients undergoing cEEG (not elective EMU, typically not post-arrest targeted-temperature protocols).',
    whyUse: 'Score 0: ~5% seizure risk (1-hour screen often enough); 1: ~12% (continue ~12 h); ≥2: ≥27% (continue ≥24 h).',
    inputs: [
      yesNo('birds', 'BIRDs — brief (ictal) rhythmic discharges', 2, 'ACNS: rhythmic discharges >4 Hz lasting ≥0.5 s and <10 s. Do not score any brief rhythm as BIRDs.'),
      yesNo('freqGt2', 'Frequency >2 Hz for any periodic or rhythmic pattern', 1, 'Frequency >2 Hz on a periodic/rhythmic pattern except GRDA (GRDA does not score this point).'),
      yesNo('epileptiform', 'Sporadic epileptiform discharges', 1, 'Sporadic non-periodic epileptiform discharges (not the periodic LPD/GPD patterns).'),
      yesNo('lpdLrdaBipd', 'LPDs, LRDA, or bilateral independent PDs', 1, 'LPD or LRDA or BIPD only — do not score GPD or GRDA here.'),
      yesNo('plusFeatures', 'Plus features (superimposed fast, rhythmic, or sharp activity)', 1, '+F / +R / +S on LPD, LRDA, or BIPD only — not on GPDs/GRDA.'),
      yesNo('priorSeizure', 'Prior seizure (acute or remote, including epilepsy)', 1, 'Remote epilepsy or an acute clinical seizure — not EEG-only (electrographic) events counted elsewhere.'),
    ],
    calculate(values) {
      const birds = bool(values.birds) ? 2 : 0;
      const freqGt2 = bool(values.freqGt2) ? 1 : 0;
      const epileptiform = bool(values.epileptiform) ? 1 : 0;
      const lpdLrdaBipd = bool(values.lpdLrdaBipd) ? 1 : 0;
      const plusFeatures = bool(values.plusFeatures) ? 1 : 0;
      const priorSeizure = bool(values.priorSeizure) ? 1 : 0;
      const score = birds + freqGt2 + epileptiform + lpdLrdaBipd + plusFeatures + priorSeizure;
      const risks: Record<number, string> = {
        0: '5%',
        1: '12%',
        2: '27%',
        3: '50%',
        4: '73%',
        5: '88%',
      };
      const riskPct = score >= 6 ? '>95%' : risks[score] ?? '88%';
      const r = riskFromThresholds(score, [
        {
          max: 0,
          level: 'low',
          label: '2HELPS2B 0 — ~5% seizure risk',
          interpretation: `Score 0: ~5% risk. After a 1-hour screening EEG, cEEG can often be stopped unless coma, acute cortical injury, or evolving IIC patterns argue otherwise.`,
        },
        {
          max: 1,
          level: 'low',
          label: '2HELPS2B 1 — ~12% seizure risk',
          interpretation: `Score 1: ~12% risk. Continue cEEG for ~12 hours to keep missed-seizure risk low.`,
        },
        {
          max: 2,
          level: 'moderate',
          label: '2HELPS2B 2 — ~27% seizure risk',
          interpretation: `Score 2: ~27% risk. Continue cEEG for at least 24 hours.`,
        },
        {
          max: 4,
          level: 'high',
          label: '2HELPS2B 3–4 — 50–73% seizure risk',
          interpretation: `Score ${score}: about ${riskPct} seizure risk. Continue ≥24 h cEEG and treat along the ictal–interictal continuum per local protocol.`,
        },
        {
          max: 7,
          level: 'critical',
          label: '2HELPS2B ≥5 — ≥88% seizure risk',
          interpretation: `Score ${score}: ${riskPct} seizure risk. Prolonged cEEG and aggressive seizure/IIC management.`,
        },
      ]);
      return {
        score,
        unit: '/7',
        ...r,
        details: [
          { label: 'Predicted seizure risk', value: riskPct },
          { label: 'BIRDs (2)', value: String(birds) },
          { label: '>2 Hz (1)', value: String(freqGt2) },
          { label: 'Epileptiform (1)', value: String(epileptiform) },
          { label: 'LPD/LRDA/BIPD (1)', value: String(lpdLrdaBipd) },
          { label: 'Plus features (1)', value: String(plusFeatures) },
          { label: 'Prior seizure (1)', value: String(priorSeizure) },
        ],
      };
    },
    evidence: {
      summary:
        'Struck 2017 RiskSLIM model: BIRDs = 2; each of >2 Hz periodic/rhythmic pattern, sporadic epileptiform discharges, LPD/LRDA/BIPD, plus features, and prior seizure = 1. Max 7. Seizure risk ~5/12/27/50/73/88/>95% for scores 0/1/2/3/4/5/6–7.',
      formula: '2HELPS2B = 2·BIRDs + 1·(>2 Hz) + 1·ED + 1·(LPD/LRDA/BIPD) + 1·plus + 1·prior seizure',
      validation: 'Derived on 5427 cEEGs (3 centers); later validated to guide 1 vs 12 vs 24 h monitoring (Struck 2020).',
      references: [
        {
          title: 'Association of an EEG-based risk score with seizure probability in hospitalized patients',
          citation: 'Struck AF et al. JAMA Neurol. 2017',
          year: 2017,
          pmid: '28738117',
          doi: '10.1001/jamaneurol.2017.2564',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score 0', actions: ['Often stop after 1-hour screen if no other indication'] },
      { condition: 'Score 1', actions: ['Continue cEEG ~12 h'] },
      { condition: 'Score ≥2', actions: ['Continue cEEG ≥24 h', 'Review ASM / treat IIC per protocol'] },
    ],
    pearls: [
      'Do not apply to elective epilepsy-monitoring admissions.',
      'BIRDs are 2 points — they drive much of the risk.',
    ],
  },

  // ─── 10. NUTRIC ────────────────────────────────────────────────────────────
  {
    id: 'nutric',
    name: 'NUTRIC Score (ICU nutrition risk)',
    shortName: 'NUTRIC',
    description:
      'Nutrition Risk in the Critically Ill — identifies ICU patients most likely to benefit from aggressive nutrition therapy (age, APACHE II, SOFA, comorbidities, hospital days before ICU, optional IL-6).',
    category: 'critical-care',
    tags: ['nutric', 'nutrition', 'icu', 'malnutrition'],
    whenToUse: 'Adult ICU patients expected to stay >24 h, at admission, to triage intensity of nutrition support.',
    whyUse: 'High NUTRIC patients have worse mortality/ventilation outcomes and are the group in whom more complete calorie/protein delivery was associated with benefit.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 18, max: 100, step: 1, defaultValue: 60, helpText: '0 if <50; 1 if 50–74; 2 if ≥75.' }),
      numberInput('apache', 'APACHE II', { min: 0, max: 50, step: 1, defaultValue: 18, helpText: '0 if <15; 1 if 15–19; 2 if 20–27; 3 if ≥28.' }),
      numberInput('sofa', 'SOFA (initial)', { min: 0, max: 24, step: 1, defaultValue: 5, helpText: '0 if <6; 1 if 6–9; 2 if ≥10. Use the initial (admission) SOFA.' }),
      numberInput('comorbidities', 'Number of comorbidities', { min: 0, max: 12, step: 1, defaultValue: 1, helpText: 'Count of distinct chronic conditions (Heyland used a simple count, not a published Charlson list). 0–1 = 0 points; ≥2 = 1 point.' }),
      numberInput('hospitalDays', 'Days in hospital before ICU', {
        unit: 'days',
        min: 0,
        max: 30,
        step: 1,
        defaultValue: 0,
        helpText: '0 if admitted directly to ICU. ≥1 day scores 1 point.',
      }),
      numberInput('il6', 'IL-6', {
        unit: 'pg/mL',
        min: 0,
        max: 2000,
        step: 1,
        defaultValue: 0,
        helpText: 'Enter 0 if not measured (modified NUTRIC). ≥400 scores 1 point.',
      }),
    ],
    calculate(values) {
      const age = num(values.age, 60);
      const apache = num(values.apache, 18);
      const sofa = num(values.sofa, 5);
      const comorbidities = num(values.comorbidities, 1);
      const hospitalDays = num(values.hospitalDays, 0);
      const il6 = num(values.il6, 0);
      const agePts = nutricAgePts(age);
      const apachePts = nutricApachePts(apache);
      const sofaPts = nutricSofaPts(sofa);
      const comorbPts = comorbidities >= 2 ? 1 : 0;
      const daysPts = hospitalDays >= 1 ? 1 : 0;
      const il6Pts = il6 >= 400 ? 1 : 0;
      const score = agePts + apachePts + sofaPts + comorbPts + daysPts + il6Pts;
      const r = riskFromThresholds(score, [
        {
          max: 4,
          level: 'low',
          label: 'Low nutrition risk (0–4)',
          interpretation: `NUTRIC ${score}: low malnutrition risk. Standard ICU feeding; less evidence that aggressive targets change outcomes.`,
        },
        {
          max: 5,
          level: 'moderate',
          label: 'Borderline (5)',
          interpretation: `NUTRIC ${score}: borderline. Modified NUTRIC (no IL-6) often treats ≥5 as high; with IL-6 the high cut-off is ≥6. Individualize.`,
        },
        {
          max: 10,
          level: 'high',
          label: 'High nutrition risk (≥6)',
          interpretation: `NUTRIC ${score}: high risk (max 10 with IL-6, 9 without). These patients are most likely to benefit from early adequate enteral (or PN) protein/calories.`,
        },
      ]);
      return {
        score,
        unit: 'points',
        ...r,
        details: [
          { label: 'Age points', value: `${agePts} (age ${age})` },
          { label: 'APACHE II points', value: `${apachePts} (APACHE ${apache})` },
          { label: 'SOFA points', value: `${sofaPts} (SOFA ${sofa})` },
          { label: 'Comorbidity points', value: `${comorbPts} (${comorbidities} comorbidities)` },
          { label: 'Hospital-days points', value: `${daysPts} (${hospitalDays} d)` },
          { label: 'IL-6 points', value: `${il6Pts} (IL-6 ${il6})` },
        ],
      };
    },
    evidence: {
      summary:
        'Heyland 2011: Age <50=0, 50–74=1, ≥75=2; APACHE II <15=0, 15–19=1, 20–27=2, ≥28=3; SOFA <6=0, 6–9=1, ≥10=2; comorbidities 0–1=0, ≥2=1; hospital-to-ICU days <1=0, ≥1=1; IL-6 <400=0, ≥400=1. With IL-6 max 10, high ≥6; without IL-6 max 9 (modified NUTRIC high often ≥5).',
      formula: 'Sum of categorical points (age + APACHE II + SOFA + comorbidities + hospital days + IL-6)',
      validation: 'Derived in a mixed ICU cohort against 28-day mortality; ACG nutrition guidelines reference NUTRIC for high-risk ICU patients.',
      references: [
        {
          title: 'Identifying critically ill patients who benefit most from nutrition therapy: the NUTRIC score',
          citation: 'Heyland DK, Dhaliwal R, Jiang X, Day AG. Crit Care. 2011',
          year: 2011,
          pmid: '22088915',
          doi: '10.1186/cc10546',
        },
      ],
    },
    nextSteps: [
      { condition: 'High score', actions: ['Early EN', 'Protein 1.2–2.0 g/kg', 'Do not underfeed high-risk patients without a reason'] },
      { condition: 'Low score', actions: ['Standard ICU feeding protocol'] },
    ],
    pearls: [
      'IL-6 is rarely available — entering 0 yields modified NUTRIC (max 9).',
      'NUTRIC is illness-severity weighted; it is not a full malnutrition diagnostic tool (use GLIM/SGA alongside).',
    ],
  },

  // ─── 11. FAST score ────────────────────────────────────────────────────────
  {
    id: 'fast-score',
    name: 'FAST Score (FibroScan-AST)',
    shortName: 'FAST',
    description:
      'FibroScan-AST score identifying at-risk MASH (NAS ≥4 and fibrosis ≥F2) from liver stiffness, CAP, and AST.',
    category: 'gastroenterology',
    tags: ['fast', 'mash', 'masld', 'nash', 'fibroscan', 'elastography'],
    whenToUse: 'MASLD/MASH evaluation when FibroScan LSM + CAP and a contemporaneous AST are available.',
    whyUse: 'Rule-out <0.35 and rule-in ≥0.67 identify at-risk MASH with ~90% sensitivity / specificity in derivation, shrinking the grey zone vs LSM alone.',
    inputs: [
      numberInput('lsm', 'Liver stiffness (VCTE)', { unit: 'kPa', min: 1.5, max: 75, step: 0.1, defaultValue: 8, helpText: 'Valid FibroScan LSM (kPa), fasting; check IQR/M. Same-encounter CAP and AST for FAST.' }),
      numberInput('cap', 'Controlled attenuation parameter (CAP)', { unit: 'dB/m', min: 100, max: 400, step: 1, defaultValue: 250 }),
      numberInput('ast', 'AST', { unit: 'U/L', min: 5, max: 500, step: 1, defaultValue: 40 }),
    ],
    calculate(values) {
      const lsm = Math.max(num(values.lsm, 8), 1.5);
      const cap = num(values.cap, 250);
      const ast = Math.max(num(values.ast, 40), 5);
      const z = -1.65 + 1.07 * Math.log(lsm) + 2.66e-8 * cap ** 3 - 63.3 / ast;
      const fast = round(logistic(z), 3);
      const r = riskFromThresholds(fast, [
        {
          max: 0.349,
          level: 'low',
          label: 'Rule-out at-risk MASH (<0.35)',
          interpretation: `FAST ${fast}: below 0.35 — at-risk MASH (NAS≥4 and F≥2) is unlikely. Lifestyle care; repeat non-invasive tests as indicated.`,
        },
        {
          max: 0.669,
          level: 'moderate',
          label: 'Grey zone (0.35–0.67)',
          interpretation: `FAST ${fast}: indeterminate. Consider additional fibrosis tests, hepatology review, or biopsy per pathway.`,
        },
        {
          max: 1,
          level: 'high',
          label: 'Rule-in at-risk MASH (≥0.67)',
          interpretation: `FAST ${fast}: ≥0.67 — high likelihood of at-risk MASH. Hepatology for therapy / trial / biopsy decisions.`,
        },
      ]);
      return {
        score: fast,
        ...r,
        details: [
          { label: 'LSM', value: `${lsm} kPa` },
          { label: 'CAP', value: `${cap} dB/m` },
          { label: 'AST', value: `${ast} U/L` },
          { label: 'Logit', value: round(z, 3).toString() },
        ],
      };
    },
    evidence: {
      summary:
        'Newsome 2020: FAST = exp(z)/(1+exp(z)) with z = −1.65 + 1.07·ln(LSM_kPa) + 2.66×10⁻⁸·CAP³ − 63.3·AST⁻¹. Rule-out <0.35; rule-in ≥0.67 for NAS≥4 plus fibrosis ≥F2.',
      formula: 'z = −1.65 + 1.07 ln(LSM) + 2.66e-8·CAP³ − 63.3/AST; FAST = 1/(1+e^{−z})',
      validation: 'Prospective derivation (n=350) and global validation (n=1026); AUROC ~0.80 for at-risk MASH.',
      references: [
        {
          title: 'FibroScan-AST (FAST) score for non-invasive identification of NASH with significant activity and fibrosis',
          citation: 'Newsome PN et al. Lancet Gastroenterol Hepatol. 2020',
          year: 2020,
          pmid: '31975426',
          doi: '10.1016/S2468-1253(19)30383-8',
        },
      ],
    },
    nextSteps: [
      { condition: 'FAST <0.35', actions: ['Lifestyle', 'Repeat NIT in 1–3 years or if metabolic risk changes'] },
      { condition: 'FAST ≥0.67', actions: ['Hepatology', 'Consider MASH pharmacotherapy / biopsy'] },
    ],
    pearls: [
      'FAST requires a valid FibroScan (IQR/M, fasting). Obesity can reduce LSM reliability.',
      'CAP is required — this is not FIB-4 and not a platelet-based score.',
    ],
  },

  // ─── 12. Agile 3+ ──────────────────────────────────────────────────────────
  {
    id: 'agile-3',
    name: 'Agile 3+ (advanced fibrosis in MASLD)',
    shortName: 'Agile 3+',
    description:
      'FibroScan-based logistic score for advanced fibrosis (F≥3) in MASLD using LSM, AST/ALT, platelets, age, sex, and diabetes.',
    category: 'gastroenterology',
    tags: ['agile', 'masld', 'fibrosis', 'fibroscan', 'nash'],
    whenToUse: 'MASLD when VCTE LSM and routine labs are available to rule in/out advanced fibrosis.',
    whyUse: 'Better PPV and a smaller indeterminate zone than LSM or FIB-4 alone for F≥3 (Sanyal 2022).',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 18, max: 90, step: 1, defaultValue: 55 }),
      selectInput('sex', 'Sex', [
        { label: 'Female', value: 'F' },
        { label: 'Male', value: 'M' },
      ]),
      yesNo('diabetes', 'Diabetes mellitus', null, 'Diagnosed diabetes or glucose-lowering therapy (Agile 3+ coefficient).'),
      numberInput('lsm', 'Liver stiffness (VCTE)', { unit: 'kPa', min: 1.5, max: 75, step: 0.1, defaultValue: 10, helpText: 'Valid fasting VCTE LSM in kPa (check IQR/M).' }),
      numberInput('ast', 'AST', { unit: 'U/L', min: 5, max: 500, step: 1, defaultValue: 40 }),
      numberInput('alt', 'ALT', { unit: 'U/L', min: 5, max: 500, step: 1, defaultValue: 45 }),
      numberInput('plt', 'Platelets', { unit: '×10⁹/L', min: 20, max: 600, step: 1, defaultValue: 220 }),
    ],
    calculate(values) {
      const age = num(values.age, 55);
      const male = str(values.sex, 'F') === 'M' ? 1 : 0;
      const diabetes = bool(values.diabetes) ? 1 : 0;
      const lsm = Math.max(num(values.lsm, 10), 1.5);
      const ast = Math.max(num(values.ast, 40), 5);
      const alt = Math.max(num(values.alt, 45), 5);
      const plt = num(values.plt, 220);
      const aarInv = alt / ast;
      const z =
        -3.92368 +
        2.29714 * Math.log(lsm) -
        0.00902 * plt -
        0.98633 * aarInv +
        1.08636 * diabetes -
        0.38581 * male +
        0.03018 * age;
      const p = round(logistic(z), 3);
      const r = riskFromThresholds(p, [
        {
          max: 0.45,
          level: 'low',
          label: 'Rule-out advanced fibrosis (<0.451)',
          interpretation: `Agile 3+ ${p}: below 0.451 — advanced fibrosis (F≥3) is unlikely. Repeat NITs over time.`,
        },
        {
          max: 0.678,
          level: 'moderate',
          label: 'Indeterminate (0.451–0.679)',
          interpretation: `Agile 3+ ${p}: grey zone. Consider MRE, ELF, or biopsy per pathway.`,
        },
        {
          max: 1,
          level: 'high',
          label: 'Rule-in advanced fibrosis (≥0.679)',
          interpretation: `Agile 3+ ${p}: ≥0.679 — high likelihood of F≥3. Hepatology for HCC surveillance discussion and therapy.`,
        },
      ]);
      return {
        score: p,
        ...r,
        details: [
          { label: 'AST/ALT', value: round(ast / alt, 2).toString() },
          { label: 'ALT/AST (AAR⁻¹)', value: round(aarInv, 3).toString() },
          { label: 'LSM', value: `${lsm} kPa` },
          { label: 'Platelets', value: `${plt} ×10⁹/L` },
          { label: 'Diabetes', value: diabetes ? 'Yes' : 'No' },
          { label: 'Sex', value: male ? 'Male' : 'Female' },
          { label: 'Age', value: String(age) },
          { label: 'Logit', value: round(z, 3).toString() },
        ],
      };
    },
    evidence: {
      summary:
        'Sanyal / Boursier 2022 Agile 3+: logit = −3.92368 + 2.29714·ln(LSM) − 0.00902·PLT − 0.98633·(ALT/AST) + 1.08636·diabetes − 0.38581·male + 0.03018·age. Probability = 1/(1+e^{−logit}). Rule-out <0.451; rule-in ≥0.679 for F≥3. Sex: male=1, female=0; diabetes yes=1.',
      formula:
        'logit = −3.92368 + 2.29714 ln(LSM) − 0.00902 PLT − 0.98633 (ALT/AST) + 1.08636 DM − 0.38581 male + 0.03018 age',
      validation: 'Training + internal validation and NASH CRN / French external cohorts; smaller indeterminate zone than LSM or FIB-4.',
      references: [
        {
          title: 'Enhanced diagnosis of advanced fibrosis and cirrhosis in NAFLD using FibroScan-based Agile scores',
          citation: 'Sanyal AJ, Foucquier J, Kennedy WP, et al. J Hepatol. 2023',
          year: 2022,
          pmid: '35176765',
          doi: '10.1016/j.jhep.2022.10.034',
        },
      ],
    },
    nextSteps: [
      { condition: '<0.451', actions: ['Primary-care metabolic care', 'Repeat NIT 1–3 yearly'] },
      { condition: '≥0.679', actions: ['Hepatology', 'HCC risk discussion', 'MASH therapy eligibility'] },
    ],
    pearls: [
      'Male sex has a negative coefficient in the published logit (not a bug).',
      'Requires a reliable VCTE acquisition.',
    ],
  },

  // ─── 13. Agile 4 ───────────────────────────────────────────────────────────
  {
    id: 'agile-4',
    name: 'Agile 4 (cirrhosis in MASLD)',
    shortName: 'Agile 4',
    description:
      'FibroScan-based logistic score for cirrhosis (F4) in MASLD using LSM, AST/ALT, platelets, sex, and diabetes (no age term).',
    category: 'gastroenterology',
    tags: ['agile', 'cirrhosis', 'masld', 'fibroscan'],
    whenToUse: 'MASLD when the question is cirrhosis (F4) rather than advanced fibrosis.',
    whyUse: 'Rule-out <0.251 and rule-in ≥0.565 outperform LSM alone for F4 with fewer indeterminate results.',
    inputs: [
      selectInput('sex', 'Sex', [
        { label: 'Female', value: 'F' },
        { label: 'Male', value: 'M' },
      ]),
      yesNo('diabetes', 'Diabetes mellitus', null, 'Diagnosed diabetes or glucose-lowering therapy (Agile 4 coefficient).'),
      numberInput('lsm', 'Liver stiffness (VCTE)', { unit: 'kPa', min: 1.5, max: 75, step: 0.1, defaultValue: 12, helpText: 'Valid fasting VCTE LSM in kPa (check IQR/M).' }),
      numberInput('ast', 'AST', { unit: 'U/L', min: 5, max: 500, step: 1, defaultValue: 40 }),
      numberInput('alt', 'ALT', { unit: 'U/L', min: 5, max: 500, step: 1, defaultValue: 45 }),
      numberInput('plt', 'Platelets', { unit: '×10⁹/L', min: 20, max: 600, step: 1, defaultValue: 180 }),
    ],
    calculate(values) {
      const male = str(values.sex, 'F') === 'M' ? 1 : 0;
      const diabetes = bool(values.diabetes) ? 1 : 0;
      const lsm = Math.max(num(values.lsm, 12), 1.5);
      const ast = Math.max(num(values.ast, 40), 5);
      const alt = Math.max(num(values.alt, 45), 5);
      const plt = num(values.plt, 180);
      const aarInv = alt / ast;
      const z = 7.50139 - 15.42498 / Math.sqrt(lsm) - 0.01378 * plt - 1.41149 * aarInv - 0.53281 * male + 0.41741 * diabetes;
      const p = round(logistic(z), 3);
      const r = riskFromThresholds(p, [
        {
          max: 0.25,
          level: 'low',
          label: 'Rule-out cirrhosis (<0.251)',
          interpretation: `Agile 4 ${p}: below 0.251 — cirrhosis is unlikely.`,
        },
        {
          max: 0.564,
          level: 'moderate',
          label: 'Indeterminate (0.251–0.565)',
          interpretation: `Agile 4 ${p}: grey zone for F4. Additional imaging, endoscopy risk tools, or biopsy as indicated.`,
        },
        {
          max: 1,
          level: 'high',
          label: 'Rule-in cirrhosis (≥0.565)',
          interpretation: `Agile 4 ${p}: ≥0.565 — high likelihood of cirrhosis. Variceal and HCC surveillance pathways.`,
        },
      ]);
      return {
        score: p,
        ...r,
        details: [
          { label: 'LSM', value: `${lsm} kPa` },
          { label: '1/√LSM', value: round(1 / Math.sqrt(lsm), 4).toString() },
          { label: 'Platelets', value: `${plt} ×10⁹/L` },
          { label: 'ALT/AST', value: round(aarInv, 3).toString() },
          { label: 'Diabetes', value: diabetes ? 'Yes' : 'No' },
          { label: 'Sex', value: male ? 'Male' : 'Female' },
          { label: 'Logit', value: round(z, 3).toString() },
        ],
      };
    },
    evidence: {
      summary:
        'Sanyal 2022 Agile 4: logit = 7.50139 − 15.42498/√LSM − 0.01378·PLT − 1.41149·(ALT/AST) − 0.53281·male + 0.41741·diabetes. Rule-out <0.251; rule-in ≥0.565 for F4. No age term.',
      formula: 'logit = 7.50139 − 15.42498/√LSM − 0.01378 PLT − 1.41149 (ALT/AST) − 0.53281 male + 0.41741 DM',
      validation: 'Same NAFLD/MASLD histology cohorts as Agile 3+; high AUROC for cirrhosis with dual cut-offs.',
      references: [
        {
          title: 'Enhanced diagnosis of advanced fibrosis and cirrhosis in NAFLD using FibroScan-based Agile scores',
          citation: 'Sanyal AJ et al. J Hepatol. 2023',
          year: 2022,
          pmid: '35176765',
          doi: '10.1016/j.jhep.2022.10.034',
        },
      ],
    },
    nextSteps: [
      { condition: 'Rule-in', actions: ['HCC surveillance', 'Baveno/endoscopy pathway', 'Hepatology'] },
      { condition: 'Rule-out', actions: ['Manage MASLD without cirrhosis protocols'] },
    ],
    pearls: [
      'Agile 4 uses 1/√LSM (not ln LSM) — higher stiffness still increases predicted cirrhosis probability.',
      'Does not include age, unlike Agile 3+.',
    ],
  },

  // ─── 14. MASLD criteria ────────────────────────────────────────────────────
  {
    id: 'masld-criteria',
    name: 'MASLD / MetALD Diagnostic Helper',
    shortName: 'MASLD',
    description:
      'Applies 2023 multi-society steatotic liver disease criteria: MASLD vs MetALD vs ALD vs not classified, from steatosis, cardiometabolic traits, competing liver disease, and alcohol grams/day.',
    category: 'gastroenterology',
    tags: ['masld', 'metald', 'nafld', 'sld', 'alcohol', 'steatosis'],
    whenToUse: 'Hepatic steatosis (imaging or biopsy) when assigning the SLD subcategory and deciding whether alcohol intake reclassifies the patient.',
    whyUse: 'MASLD replaced NAFLD; MetALD captures the overlap zone (20–50 g/d women, 30–60 g/d men) with both metabolic features and alcohol.',
    inputs: [
      yesNo('steatosis', 'Hepatic steatosis (imaging, CAP, or histology)', null, 'Steatosis on ultrasound/MRI/CT, CAP, or histology. Required to enter SLD categories.'),
      yesNo('otherLiver', 'Other liver disease that could fully explain steatosis (e.g. HCV, drugs, monogenic)', null),
      yesNo('bmiMet', 'Cardiometabolic: BMI ≥25 kg/m² (≥23 in Asian populations)', null, 'Official adiposity slot is BMI or waist — either counts as one cardiometabolic criterion.'),
      yesNo('waistMet', 'Cardiometabolic: waist ≥94 cm (men) or ≥80 cm (women) — ethnicity-adjusted cutoffs allowed', null, 'Europid ≥94/80 cm (M/F). Asian often ≥90/80 cm. Official adiposity slot is BMI or waist.'),
      yesNo(
        'glucoseMet',
        'Cardiometabolic: fasting glucose ≥100 mg/dL, 2-h OGTT ≥140, HbA1c ≥5.7%, T2D/treatment, or HOMA-IR ≥2.5',
        null,
        '2023 adult glucose criterion: FPG ≥100 mg/dL or 2-h OGTT ≥140 mg/dL or HbA1c ≥5.7% or T2D/treatment; HOMA-IR ≥2.5 is the insulin-resistance add-on.',
      ),
      yesNo('bpMet', 'Cardiometabolic: BP ≥130/85 or antihypertensive therapy', null),
      yesNo('tgMet', 'Cardiometabolic: triglycerides ≥150 mg/dL or lipid-lowering for hypertriglyceridemia', null),
      yesNo('hdlMet', 'Cardiometabolic: HDL <40 mg/dL (men) or <50 (women) or treatment', null),
      selectInput('sex', 'Sex (alcohol thresholds)', [
        { label: 'Female (MASLD <20 g/d; MetALD 20–50; ALD >50)', value: 'F' },
        { label: 'Male (MASLD <30 g/d; MetALD 30–60; ALD >60)', value: 'M' },
      ]),
      numberInput('alcohol', 'Average alcohol intake', {
        unit: 'g/day',
        min: 0,
        max: 150,
        step: 1,
        defaultValue: 0,
        helpText: '1 standard drink ≈ 10–14 g ethanol depending on region.',
      }),
    ],
    calculate(values) {
      const steatosis = bool(values.steatosis);
      const otherLiver = bool(values.otherLiver);
      const bmiMet = bool(values.bmiMet);
      const waistMet = bool(values.waistMet);
      const glucoseMet = bool(values.glucoseMet);
      const bpMet = bool(values.bpMet);
      const tgMet = bool(values.tgMet);
      const hdlMet = bool(values.hdlMet);
      const male = str(values.sex, 'F') === 'M';
      const alcohol = num(values.alcohol, 0);
      const mets: string[] = [];
      if (bmiMet) mets.push('BMI');
      if (waistMet) mets.push('waist');
      if (glucoseMet) mets.push('glucose/DM');
      if (bpMet) mets.push('BP');
      if (tgMet) mets.push('TG');
      if (hdlMet) mets.push('HDL');
      const metN = mets.length;
      const heavy = male ? alcohol > 60 : alcohol > 50;
      const overlap = male ? alcohol >= 30 && alcohol <= 60 : alcohol >= 20 && alcohol <= 50;
      let score = 'Not classified';
      let riskLevel: 'info' | 'low' | 'moderate' | 'high' = 'info';
      let label = 'Not classified';
      let interpretation = '';
      if (!steatosis) {
        interpretation = `No steatosis recorded — SLD categories do not apply. Alcohol ${alcohol} g/day (${male ? 'male' : 'female'}).`;
      } else if (otherLiver && !heavy) {
        score = 'Not classified';
        label = 'Other / competing liver disease';
        riskLevel = 'moderate';
        interpretation = `Steatosis with a competing liver disease and alcohol not in the ALD range (${alcohol} g/day). Classify under that disease ± MASLD as “combination” if metabolic criteria are also present (${metN}).`;
      } else if (heavy) {
        score = 'ALD';
        label = 'ALD (alcohol-associated liver disease)';
        riskLevel = 'high';
        interpretation = `Steatosis with alcohol ${alcohol} g/day (above ${male ? 60 : 50} g/day). Classified as ALD. Metabolic criteria (${metN}) may coexist but alcohol intake is in the ALD range.`;
      } else if (metN >= 1 && overlap) {
        score = 'MetALD';
        label = 'MetALD (metabolic + alcohol overlap)';
        riskLevel = 'high';
        interpretation = `Steatosis + ≥1 cardiometabolic criterion (${mets.join(', ')}) + alcohol ${alcohol} g/day in the overlap band (${male ? '30–60' : '20–50'} g/day).`;
      } else if (metN >= 1) {
        score = 'MASLD';
        label = 'MASLD';
        riskLevel = 'moderate';
        interpretation = `Steatosis + ≥1 cardiometabolic criterion (${mets.join(', ')}) with alcohol ${alcohol} g/day below the MetALD threshold. This is MASLD (formerly NAFLD when alcohol is negligible).`;
      } else if (overlap) {
        score = 'Not classified';
        label = 'Alcohol overlap without metabolic criteria';
        riskLevel = 'moderate';
        interpretation = `Steatosis and alcohol ${alcohol} g/day in the overlap band but no cardiometabolic criterion — not MASLD/MetALD; consider alcohol-related SLD or cryptogenic SLD.`;
      } else {
        score = 'Not classified';
        label = 'Cryptogenic SLD / not MASLD';
        riskLevel = 'low';
        interpretation = `Steatosis without cardiometabolic criteria and alcohol ${alcohol} g/day below overlap. Cryptogenic SLD — look for other causes.`;
      }
      return {
        score,
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Steatosis', value: steatosis ? 'Yes' : 'No' },
          { label: 'Competing liver disease', value: otherLiver ? 'Yes' : 'No' },
          { label: 'Cardiometabolic count', value: String(metN) },
          { label: 'Cardiometabolic traits', value: mets.length ? mets.join(', ') : 'none' },
          { label: 'Alcohol', value: `${alcohol} g/day` },
          { label: 'Sex', value: male ? 'Male' : 'Female' },
          { label: 'Alcohol band', value: heavy ? 'ALD range' : overlap ? 'MetALD overlap' : 'below overlap' },
        ],
      };
    },
    evidence: {
      summary:
        'Rinella / multi-society 2023: MASLD = steatosis + ≥1 cardiometabolic criterion + no other cause, with alcohol <20 g/d (women) or <30 g/d (men). MetALD = MASLD metabolic criteria + alcohol 20–50 (F) or 30–60 (M) g/d. Above 50/60 g/d = ALD.',
      formula: 'Rule-based SLD subcategory from steatosis, metabolic traits, competing disease, and sex-specific alcohol bands',
      validation: 'Consensus nomenclature (AASLD/EASL/ALEH); intended to replace NAFLD terminology in research and clinics.',
      references: [
        {
          title: 'A multi-society Delphi consensus statement on new fatty liver disease nomenclature (MASLD)',
          citation: 'Rinella ME et al. Hepatology. 2023',
          year: 2023,
          pmid: '37363821',
          doi: '10.1097/HEP.0000000000000520',
        },
      ],
    },
    nextSteps: [
      { condition: 'MASLD', actions: ['Cardiometabolic treatment', 'Fibrosis NIT (FIB-4 → VCTE)', 'Lifestyle'] },
      { condition: 'MetALD or ALD', actions: ['Alcohol brief intervention / addiction care', 'Still treat metabolic risk', 'Fibrosis staging'] },
    ],
    pearls: [
      'MASLD does not require exclusion of modest alcohol — MetALD is the overlap category.',
      'Asian BMI threshold is 23 kg/m².',
    ],
  },

  // ─── 15. Age-adjusted D-dimer ──────────────────────────────────────────────
  {
    id: 'age-adjusted-ddimer',
    name: 'Age-Adjusted D-dimer Threshold',
    shortName: 'Age D-dimer',
    description:
      'Age-adjusted D-dimer cutoff for excluding VTE in patients ≥50 years (age × 10 µg/L FEU, or age × 5 for DDU assays), compared with the measured value.',
    category: 'hematology',
    tags: ['d-dimer', 'vte', 'pe', 'dvt', 'age-adjusted'],
    whenToUse:
      'Outpatients with non-high / unlikely pretest probability of PE or DVT (Wells, YEARS, or revised Geneva) when using D-dimer to exclude VTE.',
    whyUse:
      'Conventional 500 µg/L FEU cutoff loses specificity with age. Age × 10 (FEU) from age 50 safely increases the proportion of negative tests (ADJUST-PE).',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 18, max: 110, step: 1, defaultValue: 70 }),
      numberInput('ddimer', 'Measured D-dimer', {
        unit: 'ng/mL or µg/L',
        min: 50,
        max: 10000,
        step: 1,
        defaultValue: 600,
        helpText: 'Same numeric value in ng/mL or µg/L. Interpret in the units of the selected assay type.',
      }),
      selectInput(
        'assay',
        'Assay reporting',
        [
          { label: 'FEU (fibrinogen-equivalent units) — cutoff age × 10 (or 500 if age <50)', value: 'feu' },
          { label: 'DDU (D-dimer units) — cutoff age × 5 (or 250 if age <50)', value: 'ddu' },
        ],
        'feu',
      ),
    ],
    calculate(values) {
      const age = num(values.age, 70);
      const ddimer = num(values.ddimer, 600);
      const assay = str(values.assay, 'feu');
      const conventional = assay === 'ddu' ? 250 : 500;
      const ageAdj = assay === 'ddu' ? age * 5 : age * 10;
      const threshold = age >= 50 ? ageAdj : conventional;
      const ratio = threshold > 0 ? ddimer / threshold : 0;
      const positive = ddimer >= threshold;
      const unit = assay === 'ddu' ? 'µg/L DDU' : 'µg/L FEU';
      return {
        score: threshold,
        unit,
        label: positive ? 'Positive — does not exclude VTE' : 'Negative — below age-adjusted cutoff',
        interpretation: positive
          ? `D-dimer ${ddimer} ${unit} is ≥ the ${age >= 50 ? 'age-adjusted' : 'conventional'} threshold of ${threshold}. Imaging (or YEARS item review) is required if VTE remains in the differential. Never use D-dimer alone in high pretest probability.`
          : `D-dimer ${ddimer} ${unit} is below the ${age >= 50 ? 'age-adjusted' : 'conventional'} threshold of ${threshold}. In non-high pretest probability this helps exclude PE/DVT (3-month VTE ~<1% in ADJUST-PE).`,
        riskLevel: positive ? 'high' : 'low',
        details: [
          { label: 'Measured D-dimer', value: `${ddimer} ${unit}` },
          { label: 'Threshold used', value: `${threshold} ${unit}` },
          { label: 'D-dimer / threshold', value: round(ratio, 2).toString() },
          { label: 'Assay', value: assay === 'ddu' ? 'DDU' : 'FEU' },
          { label: 'Age', value: String(age) },
          { label: 'Rule', value: age >= 50 ? (assay === 'ddu' ? 'age × 5' : 'age × 10') : `conventional ${conventional}` },
        ],
      };
    },
    evidence: {
      summary:
        'For age ≥50, FEU threshold = age × 10 µg/L (ng/mL); DDU threshold = age × 5. Age <50 uses 500 FEU or 250 DDU. Positive if measured D-dimer ≥ threshold. Only for unlikely / non-high pretest probability.',
      formula: 'Threshold = age≥50 ? (FEU: age×10 ; DDU: age×5) : (500 FEU / 250 DDU); positive if D-dimer ≥ threshold',
      validation:
        'Age-adjusted cutoffs meta-analyzed (Schouten / Douma) and prospectively validated in ADJUST-PE (Righini JAMA 2014). YEARS uses a related two-level D-dimer strategy.',
      references: [
        {
          title: 'Diagnostic accuracy of conventional or age-adjusted D-dimer cut-off values in older patients with suspected VTE',
          citation: 'Schouten HJ et al. BMJ. 2013',
          year: 2013,
          pmid: '24716616',
          doi: '10.1136/bmj.f2492',
        },
        {
          title: 'Age-adjusted D-dimer cutoff levels to rule out pulmonary embolism: the ADJUST-PE study',
          citation: 'Righini M et al. JAMA. 2014',
          year: 2014,
          pmid: '24668459',
          doi: '10.1001/jama.2014.2135',
        },
      ],
    },
    nextSteps: [
      { condition: 'Negative + unlikely pretest', actions: ['No imaging for VTE', 'Consider alternative diagnoses'] },
      { condition: 'Positive or high pretest', actions: ['CTPA / VQ or duplex as indicated', 'Do not delay anticoagulation if high probability and low bleed risk'] },
    ],
    pearls: [
      'Confirm whether the lab reports FEU or DDU — mixing them doubles/halves the cutoff.',
      'Do not apply age-adjustment in pregnancy, cancer-only pathways, or high pretest probability.',
    ],
  },
];
