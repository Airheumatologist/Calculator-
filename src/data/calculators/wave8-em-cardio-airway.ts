import type { Calculator } from '../../types/calculator';
import { num, bool, str, round, clamp, yesNo, selectInput, numberInput, riskFromThresholds } from '../../utils/helpers';

/** Gupta NSQIP procedure categories shared by the pneumonia and respiratory-failure models. */
const GUPTA_PROCEDURES: { label: string; value: string }[] = [
  { label: 'Anorectal', value: 'anorectal' },
  { label: 'Aortic', value: 'aortic' },
  { label: 'Bariatric', value: 'bariatric' },
  { label: 'Brain', value: 'brain' },
  { label: 'Breast', value: 'breast' },
  { label: 'Cardiac', value: 'cardiac' },
  { label: 'ENT (except thyroid/parathyroid)', value: 'ent' },
  { label: 'Foregut or hepatopancreatobiliary', value: 'foregut_hpb' },
  { label: 'Gallbladder, appendix, adrenals, or spleen', value: 'gallbladder_appendix_adrenal_spleen' },
  { label: 'Hernia (ventral, inguinal, femoral)', value: 'hernia' },
  { label: 'Intestinal', value: 'intestinal' },
  { label: 'Neck (thyroid/parathyroid)', value: 'neck_thyroid_parathyroid' },
  { label: 'Obstetric/gynecologic', value: 'obgyn' },
  { label: 'Orthopedic and non-vascular extremity', value: 'orthopedic_extremity' },
  { label: 'Other abdominal', value: 'other_abdominal' },
  { label: 'Peripheral vascular', value: 'peripheral_vascular' },
  { label: 'Skin', value: 'skin' },
  { label: 'Spine', value: 'spine' },
  { label: 'Non-esophageal thoracic', value: 'thoracic' },
  { label: 'Vein', value: 'vein' },
  { label: 'Urology', value: 'urology' },
];

const GUPTA_PNA_PROC: Record<string, number> = {
  anorectal: -0.847, aortic: 0.7178, bariatric: -0.6282, brain: 0.6841, breast: -2.3318,
  cardiac: 0.1382, ent: -0.3665, foregut_hpb: 1.066, gallbladder_appendix_adrenal_spleen: -0.3951,
  hernia: 0, intestinal: 0.6169, neck_thyroid_parathyroid: -0.0872, obgyn: -0.4101,
  orthopedic_extremity: -0.5415, other_abdominal: 0.4021, peripheral_vascular: -0.4519,
  skin: -0.5075, spine: -0.5672, thoracic: 0.8901, vein: -1.476, urology: 0.1076,
};

const GUPTA_RF_PROC: Record<string, number> = {
  anorectal: -1.353, aortic: 1.0781, bariatric: -1.0112, brain: 0.7336, breast: -2.6462,
  cardiac: 0.2744, ent: 0.106, foregut_hpb: 0.9694, gallbladder_appendix_adrenal_spleen: -0.5668,
  hernia: 0, intestinal: 0.5737, neck_thyroid_parathyroid: -0.5271, obgyn: -1.2431,
  orthopedic_extremity: -0.8577, other_abdominal: 0.2416, peripheral_vascular: -0.2389,
  skin: -0.3206, spine: -0.522, thoracic: 0.6715, vein: -2.008, urology: 0.3093,
};

const GUPTA_ASA_OPTIONS = [
  { label: '1: Normal healthy patient', value: 1 },
  { label: '2: Mild systemic disease', value: 2 },
  { label: '3: Severe systemic disease', value: 3 },
  { label: '4: Severe systemic disease that is a constant threat to life', value: 4 },
  { label: '5: Moribund, not expected to survive without surgery', value: 5 },
];

const GUPTA_SEPSIS_OPTIONS = [
  { label: 'None', value: 'none' },
  { label: 'Preoperative SIRS', value: 'sirs' },
  { label: 'Preoperative sepsis', value: 'sepsis' },
  { label: 'Preoperative septic shock', value: 'septic_shock' },
];

const FUNCTIONAL_OPTIONS = [
  { label: 'Independent', value: 'independent' },
  { label: 'Partially dependent', value: 'partial' },
  { label: 'Totally dependent', value: 'total' },
];

const GUPTA_PNA_ASA: Record<number, number> = { 1: -3.0225, 2: -1.6057, 3: -0.4915, 4: 0.0123, 5: 0 };
const GUPTA_PNA_SEPSIS: Record<string, number> = { none: -0.7641, sirs: 0, sepsis: -0.0842, septic_shock: 0.1048 };
const GUPTA_PNA_FUNC: Record<string, number> = { independent: 0, partial: 0.7653, total: 0.94 };

const GUPTA_RF_ASA: Record<number, number> = { 1: -3.5265, 2: -2.0008, 3: -0.6201, 4: 0.2441, 5: 0 };
const GUPTA_RF_SEPSIS: Record<string, number> = { none: -0.784, sirs: 0, sepsis: 0.2752, septic_shock: 0.9035 };
const GUPTA_RF_FUNC: Record<string, number> = { independent: 0, partial: 0.7678, total: 1.4046 };

/** NEDOCS/CEDOCS shared 6-level crowding interpretation (score 0–200). */
function crowdingBand(score: number): { riskLevel: 'low' | 'moderate' | 'high' | 'critical'; label: string } {
  if (score <= 20) return { riskLevel: 'low', label: 'Level 1 — Not busy' };
  if (score <= 60) return { riskLevel: 'low', label: 'Level 2 — Busy' };
  if (score <= 100) return { riskLevel: 'moderate', label: 'Level 3 — Extremely busy but not overcrowded' };
  if (score <= 140) return { riskLevel: 'high', label: 'Level 4 — Overcrowded' };
  if (score <= 180) return { riskLevel: 'critical', label: 'Level 5 — Severely overcrowded' };
  return { riskLevel: 'critical', label: 'Level 6 — Dangerously overcrowded' };
}

/** Wave 8: ED heart-failure disposition, chest-pain rules, periop pulmonary/airway, dosing, ED crowding. */
export const wave8EmCardioAirwayCalcs: Calculator[] = [
  // ─── 1. Ottawa Heart Failure Risk Scale ───────────────────────────────────
  {
    id: 'ohfrs',
    name: 'Ottawa Heart Failure Risk Scale (OHFRS)',
    shortName: 'OHFRS',
    description:
      'Stiell 10-item risk scale estimating 14–30 day serious adverse events (death, intubation, monitored-unit admission, MI, relapse requiring admission) in ED patients with acute heart failure after initial intervention.',
    category: 'emergency',
    tags: ['heart failure', 'ohfrs', 'ottawa', 'disposition', 'dyspnea', 'ed', 'admission'],
    whenToUse:
      'ED patients presenting with acute dyspnea secondary to new-onset or chronic heart failure, applied AFTER initial ED intervention. Do not use before intervention or in hemodynamically unstable patients (e.g., persistent hypotension, malignant arrhythmia, refractory hypoxemia).',
    whyUse:
      'Disposition decisions in acute HF are highly variable and many discharged patients suffer serious adverse events. OHFRS identifies high-risk patients using routinely available data; a score threshold of ≥2 offers ~80% sensitivity for SAEs with fewer admissions than an "admit all ≥1" strategy.',
    inputs: [
      yesNo('strokeTia', 'History of stroke or TIA', 1, 'Documented prior stroke or transient ischemic attack (+1). Marker of comorbidity and frailty in the derivation cohort.', false),
      yesNo('intubated', 'Intubation for respiratory distress', 2, 'Intubated for respiratory distress at any point during this ED presentation (+2). One of the strongest single predictors.', false),
      yesNo('hrArrival', 'Heart rate ≥110/min on ED arrival', 2, 'Initial/triage heart rate of 110 beats/min or higher (+2).', true),
      yesNo('sao2Low', 'SaO₂ <90% on arrival', 1, 'Oxygen saturation below 90% on arrival/initial measurement (+1).', false),
      yesNo('hrWalk', 'HR ≥110/min during 3-minute walk test (or too ill to perform walk test)', 1, 'Either a heart rate ≥110 during a standardized 3-minute walk test OR the patient was too ill to perform the test at all (+1).', true),
      yesNo('ecgIschemia', 'New ischemic changes on ECG', 2, 'New ST-segment or T-wave ischemic changes on the ECG obtained for this visit (+2).', false),
      yesNo('ureaHigh', 'Urea ≥12 mmol/L (BUN ≥33 mg/dL)', 1, 'Blood urea ≥12 mmol/L, equivalent to BUN ≥33 mg/dL (+1).', false),
      yesNo('co2High', 'Serum CO₂ ≥35 mmol/L (mEq/L)', 2, 'Serum bicarbonate/total CO₂ ≥35 mEq/L (+2) — may reflect chronic CO₂ retention or metabolic alkalosis from diuretics.', false),
      yesNo('troponinMi', 'Troponin I or T elevated to MI level', 2, 'Troponin I or T above the acute-MI diagnostic threshold for the local assay (+2).', false),
      yesNo('ntprobnp', 'NT-proBNP ≥5,000 pg/mL', 1, 'NT-proBNP ≥5,000 ng/L (pg/mL) (+1). If NT-proBNP was not measured, answer No — the validated scale functions with or without it.', false),
    ],
    calculate(values) {
      const score =
        (bool(values.strokeTia) ? 1 : 0) +
        (bool(values.intubated) ? 2 : 0) +
        (bool(values.hrArrival) ? 2 : 0) +
        (bool(values.sao2Low) ? 1 : 0) +
        (bool(values.hrWalk) ? 1 : 0) +
        (bool(values.ecgIschemia) ? 2 : 0) +
        (bool(values.ureaHigh) ? 1 : 0) +
        (bool(values.co2High) ? 2 : 0) +
        (bool(values.troponinMi) ? 2 : 0) +
        (bool(values.ntprobnp) ? 1 : 0);
      const r = riskFromThresholds(score, [
        {
          max: 1,
          level: 'low',
          label: 'Low risk (score 0–1)',
          interpretation: `OHFRS ${score}/15. Lowest SAE band (score 0 ≈ 2.8% 14-day SAE in derivation). Discharge may be considered if the patient responded well to initial therapy and reliable follow-up exists.`,
        },
        {
          max: 3,
          level: 'moderate',
          label: 'Intermediate risk (score 2–3)',
          interpretation: `OHFRS ${score}/15. Intermediate band — an admission threshold of ≥2 gave ~80% SAE sensitivity in derivation. Use shared decision-making factoring in response to therapy, comorbidity, and access to follow-up.`,
        },
        {
          max: 15,
          level: 'high',
          label: 'High risk (score ≥4)',
          interpretation: `OHFRS ${score}/15. High SAE risk (risk rises steeply toward ~50% at score 7 and ~89% at score 9). Admission for monitoring and further treatment is generally appropriate.`,
        },
      ]);
      return {
        score,
        unit: 'points',
        label: r.label,
        interpretation: r.interpretation,
        riskLevel: r.riskLevel,
        details: [
          { label: 'Total score', value: `${score} / 15` },
          { label: 'Derivation SAE anchors', value: 'Score 0 ≈ 2.8%; score 9 ≈ 89% 14-day SAE' },
          { label: 'Admission-threshold sensitivity', value: '≥1: 95%; ≥2: 81%; ≥3: 65% (derivation)' },
        ],
        recommendations: [
          'Interpret intermediate scores (1–2) with patient-specific factors: access to care, comorbidity, living situation, frequency of exacerbations',
          'Discharged patients need clear return precautions — HF patients carry higher risk than the general ED population',
          'High or rising score → consider monitored admission and early cardiology/critical-care involvement',
        ],
      };
    },
    evidence: {
      summary:
        'OHFRS (Stiell et al., Acad Emerg Med 2013) assigns 1–2 points to each of 10 history/exam/investigation items (max 15). Predicts 14-day serious adverse events: death, intubation, monitored-unit admission, MI, major cardiac procedure, new dialysis, or relapse requiring admission.',
      formula: 'Sum of 10 items: stroke/TIA +1; intubation +2; HR ≥110 on arrival +2; SaO₂ <90% +1; HR ≥110 on 3-min walk or too ill +1; new ischemic ECG +2; urea ≥12 mmol/L +1; CO₂ ≥35 mmol/L +2; troponin at MI level +2; NT-proBNP ≥5,000 +1',
      validation:
        'Derived prospectively in 559 ED HF visits (11.6% SAE; score 0 ≈ 2.8% to score 9 ≈ 89%). Prospectively validated in 1,100 patients (AEM 2017): threshold ≥1 → 91.8% sensitivity for SAE; threshold ≥2 maintained sensitivity while reducing admissions (57.2%→48.3%). NT-proBNP adds little beyond the other nine items.',
      references: [
        {
          title: 'A risk scoring system to identify emergency department patients with heart failure at high risk for serious adverse events',
          citation: 'Stiell IG et al. Acad Emerg Med. 2013;20(1):17-26',
          year: 2013,
          doi: '10.1111/acem.12056',
        },
        {
          title: 'Prospective and explicit clinical validation of the Ottawa Heart Failure Risk Scale, with and without use of quantitative NT-proBNP',
          citation: 'Stiell IG et al. Acad Emerg Med. 2017;24(3):316-327',
          year: 2017,
        },
      ],
    },
    nextSteps: [
      { condition: 'Score 0–1 with good response to therapy', actions: ['Consider discharge with close follow-up', 'Give explicit return precautions', 'Arrange HF clinic/primary-care follow-up'] },
      { condition: 'Score 2–3', actions: ['Individualized shared decision-making on admission', 'Consider observation unit or short-stay admission', 'Repeat clinical reassessment after diuresis'] },
      { condition: 'Score ≥4', actions: ['Admit to monitored bed', 'Cardiology ± critical care consultation', 'Evaluate triggers (ischemia, arrhythmia, renal failure)'] },
    ],
    pearls: [
      'Apply only AFTER initial ED intervention — the score predicts events in patients the clinician is considering for discharge.',
      'The 3-minute walk test item scores +1 whether the patient desaturated/tachycardic OR was simply too ill to attempt it.',
      'NT-proBNP ≥5,000 contributes only 1 point and the score was validated with and without it — do not delay disposition waiting on BNP.',
    ],
  },

  // ─── 2. EHMRG ─────────────────────────────────────────────────────────────
  {
    id: 'ehmrg',
    name: 'Emergency Heart Failure Mortality Risk Grade (EHMRG)',
    shortName: 'EHMRG',
    description:
      'Lee 10-variable model estimating 7-day mortality in ED patients with acute heart failure. Combines age, EMS arrival, triage vitals (SBP, HR, SpO₂), creatinine, potassium, troponin, active cancer, and metolazone use.',
    category: 'emergency',
    tags: ['heart failure', 'ehmrg', 'mortality', '7-day', 'ed', 'triage', 'disposition'],
    whenToUse:
      'Adults presenting to the ED with acute heart failure (not dialysis-dependent) when estimating short-term mortality to inform admission/discharge decisions.',
    whyUse:
      'Derived and validated on >12,000 Ontario ED HF visits (c-statistic ~0.81–0.83). EHMRG stratifies 7-day mortality across five quintiles and outperformed clinician disposition patterns for identifying high-risk patients.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 18, max: 110, exampleValue: 75, helpText: 'Age in years; enters the model as 2 points per year.' }),
      yesNo('ems', 'Transported by EMS (ambulance)', 60, 'Arrival by emergency medical services rather than self-presentation (+60) — a strong acuity marker.', true),
      numberInput('sbp', 'Systolic blood pressure at triage', { unit: 'mmHg', min: 50, max: 250, exampleValue: 130, helpText: 'Initial/triage SBP. The model subtracts min(SBP, 160) — values above 160 mmHg contribute no further reduction.' }),
      numberInput('hr', 'Heart rate at triage', { unit: 'beats/min', min: 30, max: 220, exampleValue: 95, helpText: 'Initial/triage heart rate. The model clamps HR to the 80–120 range: below 80 counts as 80, above 120 counts as 120.' }),
      numberInput('spo2', 'Lowest initial oxygen saturation', { unit: '%', min: 40, max: 100, exampleValue: 91, helpText: 'Lowest initial/triage SpO₂. The model uses min(SpO₂, 92) — saturations above 92% contribute no further reduction.' }),
      numberInput('creatinine', 'Serum creatinine', { unit: 'mg/dL', unitKind: 'creatinine', min: 0.2, max: 15, step: 0.1, exampleValue: 1.4, helpText: 'First available creatinine; the model adds 20 × creatinine in mg/dL (≈ 0.226 × µmol/L). Not validated in dialysis-dependent patients.' }),
      selectInput('potassium', 'Serum potassium', [
        { label: '≤3.9 mmol/L', value: 'low', points: 54 },
        { label: '4.0–4.5 mmol/L', value: 'normal', points: 0 },
        { label: '≥4.6 mmol/L', value: 'high', points: 30 },
      ], 'normal', 'Hypokalemia (≤3.9) adds +54 and hyperkalemia (≥4.6) adds +30 — the U-shaped mortality relationship in the model.'),
      yesNo('troponin', 'Troponin > upper limit of normal', 60, 'Troponin above the assay upper reference limit (+60).', false),
      yesNo('cancer', 'Active cancer', 45, 'Active malignancy under treatment or with active disease (+45).', false),
      yesNo('metolazone', 'Metolazone use at home', 60, 'Home metolazone use before this visit (+60) — a marker of diuretic-resistant/refractory heart failure. In regions without metolazone, European validations substituted thiazide-like diuretics.', false),
    ],
    calculate(values) {
      const age = num(values.age, 75);
      const sbp = Math.min(num(values.sbp, 130), 160);
      const hr = clamp(num(values.hr, 90), 80, 120);
      const spo2 = Math.min(num(values.spo2, 92), 92);
      const cr = num(values.creatinine, 1.0);
      const kCat = str(values.potassium, 'normal');
      const kPts = kCat === 'low' ? 54 : kCat === 'high' ? 30 : 0;
      const score =
        12 + 2 * age +
        (bool(values.ems) ? 60 : 0) -
        sbp +
        hr -
        2 * spo2 +
        20 * cr +
        kPts +
        (bool(values.troponin) ? 60 : 0) +
        (bool(values.cancer) ? 45 : 0) +
        (bool(values.metolazone) ? 60 : 0);
      const s = round(score, 1);
      const r = riskFromThresholds(s, [
        {
          max: -49.0,
          level: 'low',
          label: 'Quintile 1 — Very low 7-day mortality',
          interpretation: `EHMRG ${s}. Lowest-risk quintile (7-day mortality ~0.3% in derivation). Discharge with early follow-up may be reasonable if clinically appropriate.`,
        },
        {
          max: -15.8,
          level: 'low',
          label: 'Quintile 2 — Low 7-day mortality',
          interpretation: `EHMRG ${s}. Second quintile (7-day mortality ~0.3–0.4% in derivation).`,
        },
        {
          max: 18.0,
          level: 'moderate',
          label: 'Quintile 3 — Intermediate 7-day mortality',
          interpretation: `EHMRG ${s}. Middle quintile (7-day mortality ~0.7% in derivation).`,
        },
        {
          max: 56.6,
          level: 'high',
          label: 'Quintile 4 — High 7-day mortality',
          interpretation: `EHMRG ${s}. Fourth quintile (7-day mortality ~1.9% in derivation). Admission is generally warranted.`,
        },
        {
          max: 1000,
          level: 'critical',
          label: 'Quintile 5 — Very high 7-day mortality',
          interpretation: `EHMRG ${s}. Highest quintile (top deciles ~3.5–8.2% 7-day mortality in derivation). Admission for monitoring and treatment; consider higher level of care.`,
        },
      ]);
      return {
        score: s,
        unit: 'points',
        label: r.label,
        interpretation: r.interpretation,
        riskLevel: r.riskLevel,
        details: [
          { label: 'Clamped inputs', value: `SBP ${sbp} (cap 160), HR ${hr} (80–120), SpO₂ ${spo2} (cap 92)` },
          { label: 'Creatinine contribution', value: `20 × ${cr} mg/dL = ${round(20 * cr, 1)} pts` },
          { label: 'Potassium points', value: `${kPts}` },
          { label: 'Quintile cut points', value: '−49.0 / −15.8 / 18.0 / 56.6 / 89.4' },
        ],
        recommendations: [
          'High-risk patients should be admitted for diuresis, medication management, and evaluation of decompensation triggers',
          'Model is not validated in dialysis-dependent patients or palliative-intent presentations',
          'Use alongside clinical judgment — EHMRG predicts mortality, not all serious adverse events',
        ],
      };
    },
    evidence: {
      summary:
        'EHMRG (Lee et al., Ann Intern Med 2012) is an integer-weighted multivariate index for 7-day mortality in ED heart failure: Score = 12 + 2×age + 60(EMS) − min(SBP,160) + clamp(HR,80,120) − 2×min(SpO₂,92) + 20×creatinine(mg/dL) + K points + 60(troponin>ULN) + 45(active cancer) + 60(home metolazone). Quintile cut points −49.0, −15.8, 18.0, 56.6, 89.4.',
      formula: '12 + 2·age + 60·EMS − min(SBP,160) + HR[80–120] − 2·min(SpO₂,92) + 20·Cr(mg/dL) + K(≤3.9:+54; 4.0–4.5:0; ≥4.6:+30) + 60·trop + 45·cancer + 60·metolazone',
      validation:
        'Derived in 7,433 and validated in 5,158 Ontario ED HF patients (AUC 0.805/0.826); derivation quintile mortality 0.3%, 0.3%, 0.7%, 1.9%, top deciles 3.5% and 8.2%. Externally validated in Alberta (CJC Open 2020) and European cohorts (thiazide-like diuretics substituted for metolazone).',
      references: [
        {
          title: 'Prediction of heart failure mortality in emergent care: a cohort study',
          citation: 'Lee DS, Stitt A, Austin PC, et al. Ann Intern Med. 2012;156(11):767-775',
          year: 2012,
          doi: '10.7326/0003-4819-156-11-201206050-00003',
        },
        {
          title: 'External validation and refinement of Emergency Heart Failure Mortality Risk Grade risk model in patients with heart failure in the emergency department',
          citation: 'McRae AD et al. CJC Open. 2020;2(4):260-268',
          year: 2020,
        },
      ],
    },
    nextSteps: [
      { condition: 'Quintile 1–2 with reassuring clinical picture', actions: ['Consider discharge with rapid follow-up', 'Confirm medication reconciliation and diuretic plan', 'Explicit return precautions'] },
      { condition: 'Quintile 3–5', actions: ['Admit for diuresis and monitoring', 'Investigate decompensation triggers (ischemia, arrhythmia, infection, nonadherence)', 'Cardiology/HF follow-up arranged before discharge'] },
      { condition: 'Very high score with shock signs', actions: ['Resuscitation and monitored/ICU admission', 'Urgent cardiology consultation'] },
    ],
    pearls: [
      'SBP is capped at 160, HR clamped to 80–120, and SpO₂ capped at 92 — extreme normal values cannot artificially lower the score.',
      'Both hypokalemia (≤3.9) and hyperkalemia (≥4.6) increase the score — a U-shaped risk relationship.',
      'Metolazone use is a proxy for refractory HF, not a drug effect; some validations substitute other thiazide-like diuretics where metolazone is unavailable.',
    ],
  },

  // ─── 3. Steinhart model ───────────────────────────────────────────────────
  {
    id: 'steinhart-ahf',
    name: 'Steinhart Model for Acute Heart Failure (AHF) in Undifferentiated Dyspnea',
    shortName: 'Steinhart AHF',
    description:
      'Logistic diagnostic model combining age, clinician pre-test probability, and NT-proBNP (continuous) to yield post-test probability of acute heart failure in undifferentiated dyspneic ED patients.',
    category: 'emergency',
    tags: ['heart failure', 'steinhart', 'nt-probnp', 'dyspnea', 'diagnosis', 'bayes'],
    whenToUse:
      'ED patients with undifferentiated dyspnea and indeterminate probability of acute heart failure after initial clinical assessment, when NT-proBNP is available. Not validated in moderate–severe renal impairment (NT-proBNP rises with azotemia).',
    whyUse:
      'Integrates gestalt with NT-proBNP as a continuous variable — more accurate than NT-proBNP cut-points alone and than unaided physician assessment (AUC 0.93 in prospective validation).',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 18, max: 110, exampleValue: 65, helpText: 'Age in years. In the model, older age modestly lowers post-test probability for a given NT-proBNP because baseline NT-proBNP rises with age.' }),
      numberInput('pretest', 'Pre-test probability of AHF', { unit: '%', min: 0, max: 100, exampleValue: 50, helpText: 'Clinician-estimated probability of acute heart failure (0–100%) from history, exam, ECG, and chest X-ray BEFORE the NT-proBNP result.' }),
      numberInput('ntprobnp', 'NT-proBNP', { unit: 'pg/mL', min: 1, max: 100000, exampleValue: 900, helpText: 'Absolute NT-proBNP in pg/mL (= ng/L). Convert pmol/L × 8.457 = pg/mL. Entered as a continuous value, not a cut-point.' }),
    ],
    calculate(values) {
      const age = num(values.age, 65);
      const pFrac = clamp(num(values.pretest, 50), 0, 100) / 100;
      const bnp = Math.max(num(values.ntprobnp, 900), 1);
      const logNt = Math.log10(bnp);
      // Steinhart 2009 logistic model (probability of NO acute heart failure)
      const x = 8 + 0.011 * age - 5.9 * pFrac - 2.3 * logNt + 0.82 * pFrac * logNt;
      const pPost = clamp(1 / (1 + Math.exp(x)), 0, 1);
      const pct = round(pPost * 100, 1);
      const r = riskFromThresholds(pct, [
        {
          max: 20,
          level: 'low',
          label: 'Low post-test probability (≤20%)',
          interpretation: `Post-test probability of AHF ≈${pct}%. AHF is unlikely — investigate other causes of dyspnea (COPD/asthma, PE, pneumonia, anemia). Very low values (≤2%) were proposed as a rule-out threshold in derivation.`,
        },
        {
          max: 80,
          level: 'moderate',
          label: 'Intermediate post-test probability (20–80%)',
          interpretation: `Post-test probability of AHF ≈${pct}%. Indeterminate — AHF is neither confirmed nor excluded. Additional data (echo, serial NT-proBNP, response to therapy) and clinical judgment should drive the disposition.`,
        },
        {
          max: 100,
          level: 'high',
          label: 'High post-test probability (≥80%)',
          interpretation: `Post-test probability of AHF ≈${pct}%. AHF is likely — treat as acute heart failure while confirming the diagnosis and identifying the trigger.`,
        },
      ]);
      return {
        score: pct,
        unit: '% probability of AHF',
        label: r.label,
        interpretation: r.interpretation,
        riskLevel: r.riskLevel,
        details: [
          { label: 'Post-test probability', value: `${pct}%` },
          { label: 'log₁₀(NT-proBNP)', value: `${round(logNt, 3)} (NT-proBNP ${bnp} pg/mL)` },
          { label: 'Model', value: 'p(no AHF) = 1/(1+eˣ); x = 8 + 0.011·age − 5.9·p − 2.3·log₁₀NT-proBNP + 0.82·p·log₁₀NT-proBNP' },
        ],
        recommendations: [
          'Low probability → pursue alternate diagnoses rather than empiric diuresis',
          'Intermediate → adjunct testing (point-of-care echo, chest imaging review) and reassess after initial therapy',
          'High probability → AHF treatment pathway plus trigger workup (ischemia, AF, hypertension emergency, nonadherence)',
        ],
      };
    },
    evidence: {
      summary:
        'Steinhart et al. (JACC 2009) derived a logistic model for AHF diagnosis from ED undifferentiated dyspnea: logit(no AHF) = 8 + 0.011·age − 5.9·pretest − 2.3·log₁₀(NT-proBNP) + 0.82·pretest·log₁₀(NT-proBNP); post-test probability of AHF = 1/(1+eˣ).',
      formula: 'x = 8 + 0.011·age − 5.9·(pretest/100) − 2.3·log₁₀(NT-proBNP pg/mL) + 0.82·(pretest/100)·log₁₀(NT-proBNP); P(AHF) = 1/(1+eˣ)',
      validation:
        'Derived in 500 ED patients, validated in a separate ~600-patient international cohort, then prospectively tested in the multicenter GASP4Ar RCT (n=197): model AUC 0.93, more accurate than NT-proBNP cut-points and unaided EP diagnosis; applying model treatment thresholds would have redirected 48% of patients with 95% accuracy. Moderate–severe azotemia excluded.',
      references: [
        {
          title: 'Improving the diagnosis of acute heart failure using a validated prediction model',
          citation: 'Steinhart B, Thorpe KE, Bayoumi AM, et al. J Am Coll Cardiol. 2009;54(16):1515-1521',
          year: 2009,
          pmid: '19815122',
          doi: '10.1016/j.jacc.2009.05.065',
        },
        {
          title: 'A randomized control trial using a validated prediction model for diagnosing acute heart failure in undifferentiated dyspneic emergency department patients — the GASP4Ar study',
          citation: 'Steinhart BD, Levy P, Vandenberghe H, et al. CJEM. 2017;19(5):397-407',
          year: 2017,
        },
      ],
    },
    nextSteps: [
      { condition: 'Post-test ≤20%', actions: ['Search for alternate dyspnea causes', 'Avoid reflexive diuresis', 'Reassess if clinical course changes'] },
      { condition: 'Post-test 20–80%', actions: ['Adjunct testing (echo, imaging)', 'Serial biomarkers if needed', 'Empiric therapy only if clinically justified'] },
      { condition: 'Post-test ≥80%', actions: ['Treat as AHF', 'Identify trigger', 'Disposition per response and comorbidity'] },
    ],
    pearls: [
      'Pre-test probability is the clinician estimate BEFORE seeing the NT-proBNP result — entering a post-BNP estimate double-counts the biomarker.',
      'For the same NT-proBNP value, older patients get a slightly lower post-test probability — the model accounts for age-related baseline NT-proBNP elevation.',
      'NT-proBNP enters as a continuous value; conversion: pmol/L × 8.457 ≈ pg/mL.',
    ],
  },

  // ─── 4. HEAR score ────────────────────────────────────────────────────────
  {
    id: 'hear-score',
    name: 'HEAR Score',
    shortName: 'HEAR',
    description:
      'HEART score without troponin (History, ECG, Age, Risk factors; 0–8) for ED chest pain. A score ≤1 identifies very-low-risk patients who may not need troponin testing; ≥2 proceeds to standard ACS evaluation.',
    category: 'emergency',
    tags: ['hear', 'heart', 'chest pain', 'acs', 'nstemi', 'rule-out', 'troponin-free'],
    whenToUse:
      'ED patients with non-traumatic chest pain suspected to be at very low risk for ACS, when deciding whether troponin testing is required at all. Do not use for STEMI or clinically unstable patients.',
    whyUse:
      'HEAR ≤1 identified very-low-risk patients with 30–45 day MACE rates of ~0.4–0.9% across prospective validations — supporting carefully selected troponin-free discharge pathways and reduced ED length of stay.',
    inputs: [
      selectInput('history', 'History', [
        { label: 'Slightly suspicious', value: 0, points: 0 },
        { label: 'Moderately suspicious', value: 1, points: 1 },
        { label: 'Highly suspicious', value: 2, points: 2 },
      ], 1, 'Clinician gestalt of the chest-pain history: slight (0), moderate (+1), or highly suspicious for ACS (+2).'),
      selectInput('ecg', 'ECG', [
        { label: 'Normal', value: 0, points: 0 },
        { label: 'Nonspecific repolarization disturbance', value: 1, points: 1 },
        { label: 'Significant ST-deviation', value: 2, points: 2 },
      ], 0, 'Normal (0); nonspecific repolarization abnormality — e.g., T-wave flattening/inversion without ST-deviation, LBBB/paced without ST-deviation (+1); significant ST-depression or elevation not meeting STEMI criteria (+2).'),
      selectInput('age', 'Age', [
        { label: '<45 years', value: 0, points: 0 },
        { label: '45–64 years', value: 1, points: 1 },
        { label: '≥65 years', value: 2, points: 2 },
      ], 1, 'Age band: <45 (0), 45–64 (+1), ≥65 (+2).'),
      selectInput('riskFactors', 'Risk factors', [
        { label: 'No known risk factors', value: 0, points: 0 },
        { label: '1 or 2 risk factors', value: 1, points: 1 },
        { label: '≥3 risk factors or known atherosclerotic disease', value: 2, points: 2 },
      ], 0, 'Risk factors: diabetes, current/recent smoking, hypertension, hypercholesterolemia, obesity (BMI >30), family history of CAD. Known atherosclerotic disease (prior MI, PCI/CABG, stroke/TIA, PAD) counts as ≥3 → +2.'),
    ],
    calculate(values) {
      const score = num(values.history) + num(values.ecg) + num(values.age) + num(values.riskFactors);
      const r = riskFromThresholds(score, [
        {
          max: 1,
          level: 'low',
          label: 'Very low risk (HEAR ≤1)',
          interpretation: `HEAR ${score}/8. Very low risk for ACS — 30–45 day MACE ~0.4–0.9% in prospective studies. With a nonischemic ECG and no known CAD, troponin testing may be omitted or a single troponin may suffice per local protocol.`,
        },
        {
          max: 8,
          level: 'moderate',
          label: 'Not very low risk (HEAR ≥2)',
          interpretation: `HEAR ${score}/8. Does not meet the very-low-risk threshold — proceed with standard ACS evaluation: HEART score/HEART Pathway with serial troponins.`,
        },
      ]);
      return {
        score,
        unit: 'points',
        label: r.label,
        interpretation: r.interpretation,
        riskLevel: r.riskLevel,
        details: [
          { label: 'Total', value: `${score} / 8 (H + E + A + R)` },
          { label: 'Evidence anchor', value: 'HEAR <2 → 45-day MACE 0.4% (Moumneh); HEAR ≤1 → 30-day MACE 0.9% (Stopyra)' },
        ],
        recommendations: [
          'HEAR ≤1 + nonischemic ECG + no known CAD → consider discharge without troponin per local protocol with clear return precautions',
          'HEAR ≥2 or any ACS concern → HEART score / HEART Pathway and serial troponins',
          '"Very low risk" is not "zero risk" — pair with clinical judgment',
        ],
      };
    },
    evidence: {
      summary:
        'HEAR = HEART minus troponin: each of History, ECG, Age, and Risk factors scores 0–2 (range 0–8). Score ≤1 defines a very-low-risk group in whom MACE occurred in ~0.4–0.9% at 30–45 days without troponin testing.',
      formula: 'HEAR = History (0–2) + ECG (0–2) + Age (0–2) + Risk factors (0–2)',
      validation:
        'Prospective 6-ED validation (Moumneh, Eur J Emerg Med 2022): HEAR <2 in 20% of patients with 45-day MACE 0.4%. Secondary analysis of the HEART Pathway Implementation Study (Stopyra, EMJ 2020): HEAR ≤1 → 30-day MACE 0.9%, troponin testing added nothing (NRI 0.9%). Additional validations in Am J Med 2021 and the RESCUE prehospital study (West J Emerg Med 2022).',
      references: [
        {
          title: 'Identification of very low-risk acute chest pain patients without troponin testing',
          citation: 'Stopyra JP et al. Emerg Med J. 2020;37(11):690-694',
          year: 2020,
        },
        {
          title: 'Evaluation of HEAR score to rule-out major adverse cardiac events without troponin test in patients presenting to the emergency department with chest pain',
          citation: 'Moumneh T et al. Eur J Emerg Med. 2022;29(1):41-46',
          year: 2022,
          doi: '10.1097/mej.0000000000000791',
        },
        {
          title: 'Identifying patients with low risk of acute coronary syndrome without troponin testing: validation of the HEAR score',
          citation: 'Smith SW et al. Am J Med. 2021;134(8):1018-1024',
          year: 2021,
          doi: '10.1016/j.amjmed.2020.09.021',
        },
      ],
    },
    nextSteps: [
      { condition: 'HEAR ≤1, nonischemic ECG, no known CAD', actions: ['Consider discharge without troponin per local pathway', 'Document shared decision-making', 'Clear return precautions and follow-up'] },
      { condition: 'HEAR ≥2', actions: ['Serial troponins', 'HEART score / HEART Pathway', 'Further risk stratification before disposition'] },
    ],
    pearls: [
      'HEAR deliberately excludes troponin — it answers "does this patient even need a troponin?" not "is this ACS?"',
      'A score ≤1 still carries ~0.5–1% MACE — discuss residual risk and give explicit return instructions.',
      'Known atherosclerotic disease counts as ≥3 risk factors → +2, same convention as HEART.',
    ],
  },

  // ─── 5. Newsom score ──────────────────────────────────────────────────────
  {
    id: 'newsom-score',
    name: 'Newsom Score for Non-traumatic Chest Pain',
    shortName: 'Newsom',
    description:
      '12-item clinical decision rule identifying ED patients with non-traumatic chest pain in whom a screening chest x-ray can reasonably be omitted. Any positive criterion means the patient is not low risk.',
    category: 'emergency',
    tags: ['chest pain', 'chest x-ray', 'cxr', 'decision rule', 'newsom', 'low-value imaging'],
    whenToUse:
      'Adults presenting to the ED with non-traumatic chest pain, after ACS evaluation, when deciding whether a screening chest radiograph is indicated.',
    whyUse:
      'CXR yield in non-traumatic chest pain is only ~2–6%. In prospective validation the refined rule had 92.9% sensitivity / 98.4% NPV for clinically significant findings (pneumonia, pleural effusion, pneumothorax, CHF, new mass) and could reduce CXR utilization ~29%.',
    inputs: [
      yesNo('age60', 'Age ≥60 years', 1, 'Age 60 or older.', true),
      yesNo('chf', 'CHF history', 1, 'History of congestive heart failure, as reported by the patient.', false),
      yesNo('smoking', 'Smoking history', 1, 'Any smoking history, as reported by the patient.', false),
      yesNo('hemoptysis', 'Hemoptysis', 1, 'Coughing up blood with this presentation.', false),
      yesNo('tb', 'Tuberculosis history', 1, 'Prior tuberculosis, as reported by the patient.', false),
      yesNo('vte', 'Thromboembolic history', 1, 'Prior DVT/PE or other thromboembolic disease, as reported by the patient.', false),
      yesNo('alcohol', 'Prior or current alcohol abuse', 1, 'Current or prior alcohol abuse, as reported by the patient.', false),
      yesNo('fever', 'Fever ≥100.4°F (38°C)', 1, 'Temperature ≥38.0°C (100.4°F) at triage or during the ED evaluation.', false),
      yesNo('spo2', 'Oxygen saturation <90%', 1, 'SpO₂ below 90%.', false),
      yesNo('rr', 'Respiratory rate >24/min', 1, 'Respiratory rate above 24 breaths/min.', false),
      yesNo('diminished', 'Diminished breath sounds', 1, 'Decreased/absent breath sounds on auscultation.', false),
      yesNo('rales', 'Rales', 1, 'Crackles/rales on auscultation.', false),
    ],
    calculate(values) {
      const flags =
        (bool(values.age60) ? 1 : 0) + (bool(values.chf) ? 1 : 0) + (bool(values.smoking) ? 1 : 0) +
        (bool(values.hemoptysis) ? 1 : 0) + (bool(values.tb) ? 1 : 0) + (bool(values.vte) ? 1 : 0) +
        (bool(values.alcohol) ? 1 : 0) + (bool(values.fever) ? 1 : 0) + (bool(values.spo2) ? 1 : 0) +
        (bool(values.rr) ? 1 : 0) + (bool(values.diminished) ? 1 : 0) + (bool(values.rales) ? 1 : 0);
      const r = riskFromThresholds(flags, [
        {
          max: 0,
          level: 'low',
          label: 'Low risk — CXR may reasonably be omitted',
          interpretation: 'All 12 criteria absent. In prospective validation this group had a 98.4% NPV for clinically significant CXR findings (pneumonia, pleural effusion, pneumothorax, CHF, new mass). A screening chest x-ray can reasonably be omitted.',
        },
        {
          max: 12,
          level: 'moderate',
          label: 'Not low risk — obtain chest x-ray',
          interpretation: `${flags} of 12 criteria present — the patient is not low risk by this rule. Obtain a chest radiograph.`,
        },
      ]);
      return {
        score: flags,
        unit: 'criteria present',
        label: r.label,
        interpretation: r.interpretation,
        riskLevel: r.riskLevel,
        details: [
          { label: 'Criteria present', value: `${flags} / 12` },
          { label: 'Rule-out finding set', value: 'Pneumonia, pleural effusion, pneumothorax, CHF, new mass' },
          { label: 'Validation performance', value: 'Sensitivity 92.9%, specificity 30.4%, NPV 98.4%' },
        ],
        recommendations: [
          'High clinical suspicion for pneumonia or pleural effusion despite all-negative criteria → still image',
          'The rule does not evaluate ACS, PE, or aortic dissection — use dedicated pathways for those',
          'Compare your local CXR-positive prevalence (~6.4% in the study) before applying',
        ],
      };
    },
    evidence: {
      summary:
        'Newsom et al. refined a 12-item history/exam rule (age ≥60, CHF, smoking, hemoptysis, TB, thromboembolic disease, alcohol abuse, fever ≥38°C, SpO₂ <90%, RR >24, diminished breath sounds, rales). All absent → low risk; any present → obtain CXR.',
      formula: 'Presence of ≥1 of 12 criteria = not low risk; score = count of criteria (0–12)',
      validation:
        'Prospective observational validation in 1,111 patients at 3 US EDs (Newsom et al., Acad Emerg Med 2017): 70 (6.4%) significant CXR findings; refined rule sensitivity 92.9%, specificity 30.4%, NPV 98.4%; would have reduced CXR use 28.9% while missing 3 pneumonias and 2 effusions.',
      references: [
        {
          title: 'Prospective validation and refinement of a decision rule to obtain chest x-ray in patients with nontraumatic chest pain in the emergency department',
          citation: 'Newsom CK et al. Acad Emerg Med. 2017;24(9):1135-1143',
          year: 2017,
          doi: '10.1111/acem.13386',
        },
        {
          title: 'Validation of a decision rule and derivation of a modified rule to obtain chest radiograph in patients with nontraumatic chest pain in the emergency department',
          citation: 'Hess EP et al. J Emerg Med. 2014;2014:241935',
          year: 2014,
          doi: '10.1155/2014/241935',
        },
      ],
    },
    nextSteps: [
      { condition: 'All criteria absent', actions: ['CXR may be omitted', 'Continue standard ACS/PE evaluation as indicated', 'Image if clinical suspicion overrides'] },
      { condition: 'Any criterion present', actions: ['Obtain chest radiograph', 'Address the flagged risk factor in the workup'] },
    ],
    pearls: [
      'This is a threshold tool, not an additive score — a single positive item triggers imaging.',
      'The rule missed 3 pneumonias and 2 pleural effusions in validation — clinical suspicion should override a negative screen.',
      'It targets 5 specific radiographic findings, not ACS/PE/dissection.',
    ],
  },

  // ─── 6. InterCHEST ────────────────────────────────────────────────────────
  {
    id: 'interchest',
    name: 'InterCHEST Clinical Prediction Rule for Chest Pain in Primary Care',
    shortName: 'InterCHEST',
    description:
      'Six-item rule (range −1 to +5) derived from pooled primary-care chest-pain cohorts to estimate the probability that chest pain is due to coronary artery disease. Score ≤1 effectively rules out CAD (NPV ~98%).',
    category: 'cardiology',
    tags: ['interchest', 'chest pain', 'primary care', 'cad', 'rule out', 'outpatient'],
    whenToUse:
      'Primary care / outpatient evaluation of chest pain — do NOT use in emergency settings or when symptoms suggest an anginal equivalent or unstable presentation.',
    whyUse:
      'Pooled individual-patient analysis of five primary-care chest-pain studies identified six predictors; score ≤1 has NPV ~98% for CAD and supports safe non-urgent outpatient evaluation.',
    inputs: [
      yesNo('hxCad', 'History of coronary artery disease', 1, 'Prior documented CAD (MI, revascularization, or angiographic disease) (+1).', false),
      yesNo('ageSex', 'Female ≥65 years or male ≥55 years', 1, 'Older age: women ≥65, men ≥55 (+1).', true),
      yesNo('effort', 'Chest pain related to effort', 1, 'Pain provoked by exertion (+1).', true),
      yesNo('palpation', 'Pain reproducible by palpation', -1, 'Localized chest-wall tenderness reproducing the pain (−1) — reduces CAD probability.', false),
      yesNo('serious', 'Physician initially suspected a serious condition', 1, 'The treating physician initially suspected a serious cause for the pain (+1).', false),
      yesNo('pressure', 'Chest discomfort feels like "pressure"', 1, 'Pressure/squeezing quality of the discomfort (+1).', false),
    ],
    calculate(values) {
      const score =
        (bool(values.hxCad) ? 1 : 0) +
        (bool(values.ageSex) ? 1 : 0) +
        (bool(values.effort) ? 1 : 0) +
        (bool(values.palpation) ? -1 : 0) +
        (bool(values.serious) ? 1 : 0) +
        (bool(values.pressure) ? 1 : 0);
      const r = riskFromThresholds(score, [
        {
          max: 1,
          level: 'low',
          label: 'Low CAD probability (score ≤1)',
          interpretation: `InterCHEST ${score} (range −1 to +5). Score ≤1: CAD highly unlikely (NPV ~98%); unstable CAD is not suggested. Non-urgent outpatient evaluation and elective further testing are generally safe.`,
        },
        {
          max: 2,
          level: 'moderate',
          label: 'Intermediate (score 2)',
          interpretation: `InterCHEST ${score}. Score ≥2 does not confirm unstable CAD but warrants more urgent diagnostic evaluation (e.g., expedited stress testing or anatomic evaluation per local pathway).`,
        },
        {
          max: 5,
          level: 'high',
          label: 'High CAD probability (score ≥3)',
          interpretation: `InterCHEST ${score}. Score ≥3 — unstable CAD cannot be excluded; arrange urgent evaluation or admission as clinically appropriate.`,
        },
      ]);
      return {
        score,
        unit: 'points',
        label: r.label,
        interpretation: r.interpretation,
        riskLevel: r.riskLevel,
        details: [
          { label: 'Score range', value: '−1 to +5' },
          { label: 'Rule-out threshold', value: '≤1 (NPV ~98%)' },
        ],
        recommendations: [
          'Score ≤1 → non-urgent outpatient workup is generally appropriate',
          'Score ≥2 → expedited testing; score ≥3 → urgent evaluation or admission',
          'Ischemic ECG changes or clear anginal-equivalent symptoms bypass this rule — evaluate urgently regardless of score',
        ],
      };
    },
    evidence: {
      summary:
        'INTERCHEST (Aerts et al., J Clin Epidemiol 2017) pooled individual patient data from five primary-care chest-pain studies. Six predictors: history of CAD +1, older age (♀≥65/♂≥55) +1, effort-related pain +1, pressure-like discomfort +1, physician suspected serious condition +1, pain reproducible by palpation −1.',
      formula: 'Score = hxCAD + olderAge + effortPain + physicianSuspectedSerious + pressurePain − palpationReproducible (range −1 to +5)',
      validation:
        'Derived by individual-patient meta-analysis across five countries; validation and comparative studies show NPV 96–99% for score ≤1 and c-statistic ~0.85 in urgent primary care (BMJ Open 2021). Do not apply to emergency-department populations.',
      references: [
        {
          title: 'Pooled individual patient data from five countries were used to derive a clinical prediction rule for coronary artery disease in primary care',
          citation: 'Aerts M, Minalu G, Bösner S, et al (INTERCHEST). J Clin Epidemiol. 2017;81:120-128',
          year: 2017,
        },
        {
          title: 'Performance of risk scores for coronary artery disease: a retrospective cohort study of patients with chest pain in urgent primary care',
          citation: 'Verbakel JY et al. BMJ Open. 2021;11:e045387',
          year: 2021,
          doi: '10.1136/bmjopen-2020-045387',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score ≤1 and clinically stable', actions: ['Non-urgent outpatient evaluation', 'Elective CXR/stress testing as indicated', 'Safety-netting advice'] },
      { condition: 'Score 2', actions: ['Expedited diagnostic testing', 'Referral within days, not weeks'] },
      { condition: 'Score ≥3 or unstable features', actions: ['Urgent evaluation or admission', 'ECG and troponin if ACS possible'] },
    ],
    pearls: [
      'Palpation-reproducible pain is the only negative item (−1) — it pulls the score down but never overrides clear anginal features.',
      'The physician-gestalt item is part of the published rule — it is not redundant with the checklist.',
      'InterCHEST rules out CAD as the cause of stable chest pain in primary care; it does not triage ED chest pain.',
    ],
  },

  // ─── 7. Gupta postoperative pneumonia ─────────────────────────────────────
  {
    id: 'gupta-postop-pneumonia',
    name: 'Gupta Postoperative Pneumonia Risk',
    shortName: 'Gupta PNA',
    description:
      'ACS-NSQIP logistic model estimating percent risk of postoperative pneumonia from age, COPD, functional status, ASA class, preoperative sepsis, smoking, and procedure type.',
    category: 'surgery',
    tags: ['gupta', 'pneumonia', 'postoperative', 'nsqip', 'pulmonary complication', 'perioperative'],
    whenToUse:
      'Preoperative risk assessment in adults before surgery, when estimating the probability of postoperative pneumonia to guide prophylaxis, monitoring intensity, and shared decision-making.',
    whyUse:
      'Derived and validated on >460,000 NSQIP cases (c-statistic ~0.86); postoperative pneumonia carries markedly increased 30-day mortality, so preoperative risk stratification can target preventive measures.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 16, max: 110, exampleValue: 65, helpText: 'Age enters the model linearly (0.0144 × age).' }),
      yesNo('copd', 'COPD (functional disability/hospitalization or FEV1 <75%)', null, 'COPD causing functional disability or hospitalization, or FEV1 <75% predicted. Answering "No" subtracts 0.4553 — COPD raises pneumonia risk relative to no COPD.', false),
      selectInput('functional', 'Functional status', FUNCTIONAL_OPTIONS, 'independent', 'Partial dependence +0.7653; total dependence +0.94 versus independent.'),
      selectInput('asa', 'ASA physical status class', GUPTA_ASA_OPTIONS, 2, 'Higher ASA class increases risk (values relative to ASA 5 as reference).'),
      selectInput('sepsis', 'Preoperative sepsis status', GUPTA_SEPSIS_OPTIONS, 'none', 'Highest-risk category is septic shock (+0.1048 relative to SIRS reference).'),
      yesNo('smoker', 'Smoking within the last year', null, 'Current/recent smoking (within 1 year). "No" subtracts 0.4306 — smoking raises risk relative to non-smokers.', false),
      selectInput('procedure', 'Type of procedure', GUPTA_PROCEDURES, 'intestinal', 'Procedure category coefficient — aortic, foregut/hepatopancreatobiliary, and thoracic procedures carry the highest values.'),
    ],
    calculate(values) {
      const age = num(values.age, 65);
      const x =
        -2.8977 +
        0.0144 * age +
        (bool(values.copd) ? 0 : -0.4553) +
        (GUPTA_PNA_FUNC[str(values.functional, 'independent')] ?? 0) +
        (GUPTA_PNA_ASA[num(values.asa, 2)] ?? 0) +
        (GUPTA_PNA_SEPSIS[str(values.sepsis, 'none')] ?? 0) +
        (bool(values.smoker) ? 0 : -0.4306) +
        (GUPTA_PNA_PROC[str(values.procedure, 'hernia')] ?? 0);
      const p = clamp(Math.exp(x) / (1 + Math.exp(x)), 0, 1);
      const pct = round(p * 100, 2);
      const r = riskFromThresholds(pct, [
        {
          max: 1,
          level: 'low',
          label: 'Low pneumonia risk (≤1%)',
          interpretation: `Estimated postoperative pneumonia risk ≈${pct}% (cohort mean ~1.8%). Standard perioperative pulmonary hygiene.`,
        },
        {
          max: 3,
          level: 'moderate',
          label: 'Intermediate pneumonia risk (1–3%)',
          interpretation: `Estimated postoperative pneumonia risk ≈${pct}% — above the NSQIP cohort mean (~1.8%). Consider enhanced prophylaxis and early mobilization protocols.`,
        },
        {
          max: 100,
          level: 'high',
          label: 'High pneumonia risk (>3%)',
          interpretation: `Estimated postoperative pneumonia risk ≈${pct}% — substantially elevated. Consider intensified monitoring, aggressive pulmonary prophylaxis, and discussion of anesthetic/surgical alternatives where feasible.`,
        },
      ]);
      return {
        score: pct,
        unit: '%',
        label: r.label,
        interpretation: r.interpretation,
        riskLevel: r.riskLevel,
        details: [
          { label: 'Linear predictor (x)', value: `${round(x, 3)}` },
          { label: 'Cohort baseline', value: '1.8% of NSQIP cases developed postoperative pneumonia' },
          { label: 'Procedure coefficient', value: `${GUPTA_PNA_PROC[str(values.procedure, 'hernia')] ?? 0}` },
        ],
        recommendations: [
          'High risk → prefer shortest feasible procedure, regional techniques where appropriate, lung recruitment, early mobilization, and aspiration precautions',
          'Optimize COPD and smoking cessation before elective surgery',
          'Preoperative sepsis should be treated/resolved before elective procedures when possible',
        ],
      };
    },
    evidence: {
      summary:
        'Gupta et al. (Mayo Clin Proc 2013) fit a 7-predictor logistic model on 211,410 NSQIP cases (2007) and validated on 257,385 (2008). Risk% = eˣ/(1+eˣ) with x = −2.8977 + 0.0144·age + variable values (COPD, functional status, ASA, sepsis, smoking, procedure type).',
      formula: 'x = −2.8977 + 0.0144·age + COPD(No:−0.4553) + functional(0/0.7653/0.94) + ASA(−3.0225/−1.6057/−0.4915/0.0123/0) + sepsis(−0.7641/0/−0.0842/0.1048) + smoking(No:−0.4306) + procedure coefficient; risk = eˣ/(1+eˣ)',
      validation:
        'C-statistic ~0.86 in validation. Postoperative pneumonia incidence 1.8% with significantly increased 30-day mortality. Published coefficients implemented as in the original model table; note "No" answers for COPD/smoking carry negative values — risk rises when the exposure is present.',
      references: [
        {
          title: 'Development and validation of a risk calculator for predicting postoperative pneumonia',
          citation: 'Gupta H, Gupta PK, Schuller D, et al. Mayo Clin Proc. 2013;88(11):1241-1249',
          year: 2013,
          pmid: '24182703',
          doi: '10.1016/j.mayocp.2013.06.027',
        },
      ],
    },
    nextSteps: [
      { condition: 'Risk > cohort mean (~1.8%)', actions: ['Enhanced pulmonary prophylaxis', 'Early mobilization and chest physiotherapy', 'Aspiration precautions'] },
      { condition: 'Modifiable factors present', actions: ['Smoking cessation pre-op', 'COPD optimization', 'Resolve sepsis before elective surgery'] },
    ],
    pearls: [
      'This is a probability, not a point score — the output is a percent risk of postoperative pneumonia.',
      'In the published parameterization, "No COPD" and "No smoking" subtract points — absence of the exposure lowers risk below the procedure baseline.',
      'Procedure type is the largest single swing factor: aortic/foregut/thoracic highest; breast and vein lowest.',
    ],
  },

  // ─── 8. Gupta postoperative respiratory failure ───────────────────────────
  {
    id: 'gupta-postop-resp-failure',
    name: 'Gupta Postoperative Respiratory Failure Risk',
    shortName: 'Gupta Resp Failure',
    description:
      'ACS-NSQIP logistic model estimating percent risk of postoperative respiratory failure (mechanical ventilation >48 h or unplanned reintubation ≤30 days) from functional status, ASA class, sepsis, emergency status, and procedure type.',
    category: 'surgery',
    tags: ['gupta', 'respiratory failure', 'reintubation', 'ventilation', 'nsqip', 'perioperative'],
    whenToUse:
      'Preoperative risk assessment in adults before surgery when estimating risk of prolonged postoperative ventilation or unplanned reintubation within 30 days.',
    whyUse:
      'Derived and validated on >460,000 NSQIP cases (c-statistic 0.894/0.897). Identifying high-risk patients preoperatively enables planning for postoperative ventilatory support, ICU monitoring, and shared decision-making.',
    inputs: [
      selectInput('functional', 'Functional status', FUNCTIONAL_OPTIONS, 'independent', 'Partial dependence +0.7678; total dependence +1.4046 versus independent.'),
      selectInput('asa', 'ASA physical status class', GUPTA_ASA_OPTIONS, 2, 'Higher ASA class increases risk (values relative to ASA 5 as reference).'),
      selectInput('sepsis', 'Preoperative sepsis status', GUPTA_SEPSIS_OPTIONS, 'none', 'Septic shock carries the highest value (+0.9035 relative to SIRS reference).'),
      yesNo('emergency', 'Emergency case', null, 'Emergency operation. "No" subtracts 0.5739 — emergency surgery raises risk relative to elective.', false),
      selectInput('procedure', 'Type of procedure', GUPTA_PROCEDURES, 'aortic', 'Procedure category coefficient — aortic, foregut/hepatopancreatobiliary, thoracic, and brain procedures carry the highest values.'),
    ],
    calculate(values) {
      const x =
        -1.7397 +
        (GUPTA_RF_FUNC[str(values.functional, 'independent')] ?? 0) +
        (GUPTA_RF_ASA[num(values.asa, 2)] ?? 0) +
        (GUPTA_RF_SEPSIS[str(values.sepsis, 'none')] ?? 0) +
        (bool(values.emergency) ? 0 : -0.5739) +
        (GUPTA_RF_PROC[str(values.procedure, 'hernia')] ?? 0);
      const p = clamp(Math.exp(x) / (1 + Math.exp(x)), 0, 1);
      const pct = round(p * 100, 2);
      const r = riskFromThresholds(pct, [
        {
          max: 1.5,
          level: 'low',
          label: 'Low respiratory-failure risk (≤1.5%)',
          interpretation: `Estimated risk of ventilation >48 h or unplanned reintubation ≈${pct}% (cohort mean ~3.1%). Standard postoperative respiratory monitoring.`,
        },
        {
          max: 5,
          level: 'moderate',
          label: 'Intermediate respiratory-failure risk (1.5–5%)',
          interpretation: `Estimated risk ≈${pct}% — above the NSQIP cohort mean (~3.1%). Plan postoperative monitoring accordingly and minimize residual neuromuscular blockade/sedation.`,
        },
        {
          max: 100,
          level: 'high',
          label: 'High respiratory-failure risk (>5%)',
          interpretation: `Estimated risk ≈${pct}% — markedly elevated. Anticipate possible prolonged ventilation or reintubation; consider postoperative ICU monitoring and staged extubation planning.`,
        },
      ]);
      return {
        score: pct,
        unit: '%',
        label: r.label,
        interpretation: r.interpretation,
        riskLevel: r.riskLevel,
        details: [
          { label: 'Linear predictor (x)', value: `${round(x, 3)}` },
          { label: 'Outcome definition', value: 'Mechanical ventilation >48 h postop OR unplanned reintubation ≤30 days' },
          { label: 'Cohort baseline', value: '3.1% of NSQIP cases' },
          { label: 'Procedure coefficient', value: `${GUPTA_RF_PROC[str(values.procedure, 'hernia')] ?? 0}` },
        ],
        recommendations: [
          'High risk → plan monitored/ICU postoperative care, conservative extubation criteria, and reversal verification for neuromuscular blockade',
          'Optimize functional status and treat preoperative sepsis before elective surgery',
          'A high estimate should not justify avoiding a necessary operation — use it to plan support',
        ],
      };
    },
    evidence: {
      summary:
        'Gupta et al. (CHEST 2011) fit a 5-predictor logistic model on the 2007 NSQIP dataset (n=211,410; 3.1% events) validated on 2008 data (n=257,385). Risk% = eˣ/(1+eˣ), x = −1.7397 + functional status + ASA + sepsis + emergency + procedure coefficients.',
      formula: 'x = −1.7397 + functional(0/0.7678/1.4046) + ASA(−3.5265/−2.0008/−0.6201/0.2441/0) + sepsis(−0.784/0/0.2752/0.9035) + emergency(No:−0.5739) + procedure coefficient; risk = eˣ/(1+eˣ)',
      validation:
        'C-statistic 0.894 (development) and 0.897 (validation). As with the companion pneumonia model, "No" answers for emergency status subtract risk. Predictor set differs from the pneumonia model (no age/COPD/smoking terms).',
      references: [
        {
          title: 'Development and validation of a risk calculator predicting postoperative respiratory failure',
          citation: 'Gupta H, Gupta PK, Fang X, et al. Chest. 2011;140(5):1207-1215',
          year: 2011,
          doi: '10.1378/chest.11-0466',
        },
      ],
    },
    nextSteps: [
      { condition: 'Elevated risk', actions: ['Plan postoperative monitoring level', 'Ensure full reversal of neuromuscular blockade', 'Consider ICU reservation for high-risk cases'] },
      { condition: 'Modifiable factors', actions: ['Treat preoperative sepsis', 'Deconditioning/frailty optimization when surgery can wait'] },
    ],
    pearls: [
      'Outcome = ventilation >48 h OR unplanned reintubation within 30 days — a broader endpoint than pneumonia.',
      'Unlike the pneumonia model, this model contains no age, COPD, or smoking terms — procedure type, ASA, sepsis, functional status, and emergency status drive it.',
      'Brain and aortic procedures carry the highest procedure coefficients.',
    ],
  },

  // ─── 9. El-Ganzouri Risk Index ────────────────────────────────────────────
  {
    id: 'egri-airway',
    name: 'El-Ganzouri Risk Index (EGRI) for Difficult Airway',
    shortName: 'EGRI',
    description:
      'Seven-item preoperative airway risk index (0–12) predicting difficult laryngoscopic intubation. Score ≥4 flags elevated risk warranting advanced-airway preparation.',
    category: 'surgery',
    tags: ['airway', 'el-ganzouri', 'egri', 'difficult intubation', 'anesthesia', 'mallampati'],
    whenToUse:
      'Preoperative airway assessment before general anesthesia when estimating the risk of difficult direct laryngoscopy (Cormack-Lehane grade III/IV).',
    whyUse:
      'Multivariate index derived in 10,507 patients; combines seven bedside criteria and outperforms Mallampati alone for predicting grade IV laryngoscopic views.',
    inputs: [
      selectInput('mouthOpening', 'Mouth opening (inter-incisor distance)', [
        { label: '≥4 cm', value: 0, points: 0 },
        { label: '<4 cm', value: 1, points: 1 },
      ], 0, 'Inter-incisor gap with maximal mouth opening. <4 cm scores +1.'),
      selectInput('thyromental', 'Thyromental distance', [
        { label: '>6.5 cm', value: 0, points: 0 },
        { label: '6.0–6.5 cm', value: 1, points: 1 },
        { label: '<6.0 cm', value: 2, points: 2 },
      ], 0, 'Distance from thyroid notch to mentum with neck extended. 6.0–6.5 cm +1; <6.0 cm +2.'),
      selectInput('mallampati', 'Modified Mallampati class', [
        { label: 'I — soft palate, fauces, uvula, pillars seen', value: 0, points: 0 },
        { label: 'II — soft palate, fauces, uvula seen', value: 1, points: 1 },
        { label: 'III — soft palate and base of uvula seen', value: 2, points: 2 },
        { label: 'IV — soft palate not visible', value: 2, points: 2 },
      ], 0, 'Class I 0, II +1, III +2, IV +2 (III and IV share +2 in the simplified index).'),
      selectInput('neckMovement', 'Neck movement (flexion-extension)', [
        { label: '>90°', value: 0, points: 0 },
        { label: '80–90°', value: 1, points: 1 },
        { label: '<80°', value: 2, points: 2 },
      ], 0, 'Range of atlanto-occipital flexion/extension. 80–90° +1; <80° +2.'),
      selectInput('prognath', 'Ability to prognath (advance lower jaw forward)', [
        { label: 'Yes — lower incisors can reach/past upper incisors', value: 0, points: 0 },
        { label: 'No', value: 1, points: 1 },
      ], 0, 'Inability to protrude the lower jaw beyond the upper incisors scores +1.'),
      selectInput('weight', 'Body weight', [
        { label: '<90 kg', value: 0, points: 0 },
        { label: '90–110 kg', value: 1, points: 1 },
        { label: '>110 kg', value: 2, points: 2 },
      ], 0, '90–110 kg +1; >110 kg +2.'),
      selectInput('hxDifficult', 'History of difficult intubation', [
        { label: 'None', value: 0, points: 0 },
        { label: 'Questionable', value: 1, points: 1 },
        { label: 'Definite', value: 2, points: 2 },
      ], 0, 'Questionable prior difficulty +1; documented definite difficult intubation +2.'),
    ],
    calculate(values) {
      const score =
        num(values.mouthOpening) + num(values.thyromental) + num(values.mallampati) +
        num(values.neckMovement) + num(values.prognath) + num(values.weight) + num(values.hxDifficult);
      const r = riskFromThresholds(score, [
        {
          max: 3,
          level: 'low',
          label: 'Lower predicted difficulty (EGRI 0–3)',
          interpretation: `EGRI ${score}/12. Below the published ≥4 threshold for elevated risk of difficult laryngoscopy — standard airway preparation remains appropriate (a low score does not guarantee an easy airway).`,
        },
        {
          max: 12,
          level: 'high',
          label: 'Elevated predicted difficulty (EGRI ≥4)',
          interpretation: `EGRI ${score}/12. Meets the published high-risk threshold (≥4) for difficult laryngoscopy — consider video laryngoscopy, experienced personnel, difficult-airway cart readiness, or awake technique per ASA guidelines.`,
        },
      ]);
      return {
        score,
        unit: 'points',
        label: r.label,
        interpretation: r.interpretation,
        riskLevel: r.riskLevel,
        details: [
          { label: 'Total score', value: `${score} / 12` },
          { label: 'Published cutoff', value: '≥4 = elevated risk' },
        ],
        recommendations: [
          'EGRI ≥4 → have video laryngoscope, bougie, supraglottic airway, and difficult-airway cart immediately available',
          'Consider awake intubation strategy when multiple predictors combine with anticipated difficult mask ventilation',
          'Always aspirate/plan for cannot-intubate-cannot-ventilate regardless of score',
        ],
      };
    },
    evidence: {
      summary:
        'EGRI (el-Ganzouri et al., Anesth Analg 1996) sums seven weighted criteria: mouth opening <4 cm +1; thyromental 6.0–6.5 +1 / <6.0 +2; Mallampati II +1 / III–IV +2; neck movement 80–90° +1 / <80° +2; no prognath +1; weight 90–110 kg +1 / >110 kg +2; difficult-intubation history questionable +1 / definite +2. Score ≥4 = elevated risk.',
      formula: 'Sum of 7 weighted items (range 0–12); positive test ≥4',
      validation:
        'Derived prospectively in 10,507 patients (1% grade IV views). External validations: sensitivity ~32–36% and specificity ~89–95% at cutoff 4; pooled meta-analysis sensitivity 0.54, specificity 0.80. More specific but less sensitive than bedside gestalt — combine with other assessments.',
      references: [
        {
          title: 'Preoperative airway assessment: predictive value of a multivariate risk index',
          citation: 'el-Ganzouri AR, McCarthy RJ, Tuman KJ, Tanck EN, Ivankovich AD. Anesth Analg. 1996;82(6):1197-1204',
          year: 1996,
        },
        {
          title: 'A prospective validation and comparison of three multivariate models for prediction of difficult intubation in adult patients',
          citation: 'Brazilian Journal of Anesthesiology. 2021',
          year: 2021,
          doi: '10.1016/j.bjane.2021.07.028',
        },
      ],
    },
    nextSteps: [
      { condition: 'EGRI ≥4', actions: ['Video laryngoscopy first-line', 'Difficult-airway cart in room', 'Senior anesthesiology involvement', 'Consider awake technique'] },
      { condition: 'Anticipated difficult mask ventilation too', actions: ['Awake intubation strongly considered', 'ENT/surgical airway backup plan'] },
    ],
    pearls: [
      'EGRI predicts difficult LARYNGOSCOPY — assess mask ventilation and supraglottic rescue separately.',
      'Mallampati III and IV both score +2 in the simplified index; weight and neck mobility contribute up to +2 each.',
      'Sensitivity is modest (~35–54%) — a score <4 does not rule out a difficult airway; keep rescue devices available regardless.',
    ],
  },

  // ─── 10. Tenecteplase STEMI dosing ────────────────────────────────────────
  {
    id: 'tenecteplase-stemi-dosing',
    name: 'Tenecteplase (TNK) Dosing for STEMI',
    shortName: 'TNK STEMI',
    description:
      'Weight-banded single-bolus tenecteplase dose for acute STEMI per the FDA label/ASSENT-2 regimen: <60 kg → 30 mg; 60–<70 → 35 mg; 70–<80 → 40 mg; 80–<90 → 45 mg; ≥90 → 50 mg IV over 5 seconds.',
    category: 'emergency',
    tags: ['tenecteplase', 'tnk', 'stemi', 'fibrinolysis', 'thrombolysis', 'dosing', 'weight'],
    whenToUse:
      'STEMI patients for whom a pharmaco-invasive fibrinolytic strategy is selected (timely primary PCI unavailable). NOT for ischemic stroke dosing (which uses 0.25 mg/kg, max 25 mg).',
    whyUse:
      'Tenecteplase is given as a single 5-second IV bolus in fixed weight bands — simple to administer prehospital or in non-PCI centers. Correct band selection avoids under/over-dosing.',
    inputs: [
      numberInput('weight', 'Patient weight', { unit: 'kg', unitKind: 'weight', min: 30, max: 300, step: 0.1, exampleValue: 75, helpText: 'Actual or best-estimate body weight in kg — dose is selected from fixed weight bands.' }),
      yesNo('elderly', 'Age ≥75 years (half-dose per STREAM)', null, 'In the STREAM/STREAM-2 pharmaco-invasive trials, patients ≥60–75+ years received HALF the weight-banded dose, reducing intracranial hemorrhage risk while preserving efficacy. Check "Yes" to display the half-dose.', false, false),
    ],
    calculate(values) {
      const w = num(values.weight, 75);
      const band =
        w < 60 ? { mg: 30, ml: 6, label: '<60 kg' } :
        w < 70 ? { mg: 35, ml: 7, label: '60–<70 kg' } :
        w < 80 ? { mg: 40, ml: 8, label: '70–<80 kg' } :
        w < 90 ? { mg: 45, ml: 9, label: '80–<90 kg' } :
        { mg: 50, ml: 10, label: '≥90 kg' };
      const half = bool(values.elderly);
      const mg = half ? band.mg / 2 : band.mg;
      const ml = half ? band.ml / 2 : band.ml;
      return {
        score: `${mg} mg`,
        unit: `IV bolus over 5 seconds (${ml} mL)`,
        label: `TNK ${mg} mg — weight band ${band.label}${half ? ' (STREAM half-dose)' : ''}`,
        interpretation: `Tenecteplase ${mg} mg IV as a single bolus over 5 seconds (from one vial reconstituted with 10 mL sterile water → ${ml} mL). Weight band ${band.label}${half ? '; half-dose applied per STREAM strategy for older patients' : ''}.`,
        riskLevel: 'info',
        details: [
          { label: 'Full band dose', value: `${band.mg} mg (${band.ml} mL)` },
          { label: 'Selected dose', value: `${mg} mg (${ml} mL)${half ? ' — half-dose per STREAM' : ''}` },
          { label: 'Maximum label dose', value: '50 mg (10 mL)' },
          { label: 'Band table', value: '<60:30 mg; 60–<70:35; 70–<80:40; 80–<90:45; ≥90:50' },
        ],
        recommendations: [
          'Administer as soon as possible after STEMI onset — greatest benefit within the first 1–3 hours',
          'Screen absolute/relative fibrinolytic contraindications before dosing',
          'Pharmaco-invasive strategy: transfer for angiography/PCI within 2–24 h (rescue PCI immediately if failed reperfusion)',
          'Adjunct antiplatelet/anticoagulant per protocol (ASSENT-2 used weight-based UFH)',
          'Stroke dosing is DIFFERENT (0.25 mg/kg, max 25 mg) — do not use this table for AIS',
        ],
        alerts: w >= 90 && !half ? ['Maximum label dose is 50 mg — do not exceed the ≥90 kg band dose'] : undefined,
      };
    },
    evidence: {
      summary:
        'FDA TNKase label / ASSENT-2 regimen: single IV bolus over 5 seconds dosed by weight band — <60 kg: 30 mg (6 mL); 60–<70 kg: 35 mg (7 mL); 70–<80 kg: 40 mg (8 mL); 80–<90 kg: 45 mg (9 mL); ≥90 kg: 50 mg (10 mL). STREAM/STREAM-2 trials used half-dose in older patients.',
      formula: 'Weight-banded bolus: <60→30 mg; 60–<70→35 mg; 70–<80→40 mg; 80–<90→45 mg; ≥90→50 mg',
      validation:
        'ASSENT-2 (n=16,949): weight-tiered TNK equivalent 30-day mortality to accelerated alteplase with fewer non-cerebral bleeds. STREAM (NEJM 2013) and STREAM-2 (Circulation 2023) support half-dose TNK in older patients within a pharmaco-invasive strategy. Do not confuse with the ischemic-stroke TNK regimen (0.25 mg/kg, max 25 mg) — a different dosing strategy.',
      references: [
        {
          title: 'Single-bolus tenecteplase compared with front-loaded alteplase in acute myocardial infarction: the ASSENT-2 double-blind randomised trial',
          citation: 'ASSENT-2 Investigators. Lancet. 1999;354(9180):716-722',
          year: 1999,
          pmid: '10506392',
        },
        {
          title: 'Fibrinolysis or primary PCI in ST-segment elevation myocardial infarction (STREAM)',
          citation: 'Armstrong PW et al. N Engl J Med. 2013;368:1379-1387',
          year: 2013,
          doi: '10.1056/NEJMoa1301092',
        },
        {
          title: 'TNKase (tenecteplase) prescribing information — weight-tiered STEMI dosing table',
          citation: 'FDA label (Genentech), revised 2024',
          url: 'https://www.accessdata.fda.gov/drugsatfda_docs/label/2024/103909Orig15195Correctedlbl.pdf',
        },
      ],
    },
    nextSteps: [
      { condition: 'Contraindications absent → lytic chosen', actions: ['Give full band dose (or half-dose ≥60–75+ per STREAM protocol)', 'Aspirin + adjunct anticoagulation per protocol', 'Arrange transfer for angiography/PCI'] },
      { condition: 'Failed reperfusion (<50% ST resolution at 60–90 min, ongoing pain/instability)', actions: ['Rescue PCI immediately', 'Do not repeat lytic dose'] },
    ],
    pearls: [
      'One vial = 50 mg/10 mL after reconstitution with the co-packaged 10 mL sterile water — the band dose is drawn from a single vial.',
      'STREAM/STREAM-2 support half-dose in patients ≥60–75+ years — many pharmaco-invasive protocols mandate it for ≥75.',
      'Do NOT use for ischemic stroke: AIS dosing is 0.25 mg/kg (max 25 mg), not banded.',
    ],
  },

  // ─── 11. HIET ─────────────────────────────────────────────────────────────
  {
    id: 'hiet-dosing',
    name: 'High-Dose Insulin Euglycemia Therapy (HIET)',
    shortName: 'HIET',
    description:
      'Computes the HIET bolus and infusion doses for calcium-channel-blocker or beta-blocker cardiogenic shock: insulin 1 U/kg IV bolus + 0.5 g/kg dextrose (if not hyperglycemic), then insulin 1 U/kg/h and dextrose 0.5 g/kg/h.',
    category: 'toxicology',
    tags: ['hiet', 'high-dose insulin', 'euglycemia', 'calcium channel blocker', 'beta blocker', 'overdose', 'antidote'],
    whenToUse:
      'Poison-induced cardiogenic shock from calcium-channel-blocker or beta-blocker overdose (also used as adjunctive inotrope in other toxic cardiogenic shock). Use in consultation with poison control/toxicology.',
    whyUse:
      'HIET improves cardiac output by restoring carbohydrate utilization and direct inotropy, often outperforming conventional pressors in CCB/BB poisoning. Precise weight-based bolus/infusion and concurrent dextrose prevent hypoglycemia.',
    inputs: [
      numberInput('weight', 'Patient weight', { unit: 'kg', unitKind: 'weight', min: 30, max: 300, step: 0.1, exampleValue: 80, helpText: 'Weight in kg for all bolus and infusion calculations.' }),
      numberInput('glucose', 'Serum glucose', { unit: 'mg/dL', min: 20, max: 1000, exampleValue: 120, helpText: 'Determines whether the initial 0.5 g/kg dextrose bolus is given. Protocols withhold the bolus above ~250 mg/dL (≈14 mmol/L; CCB overdose is often already hyperglycemic). mmol/L × 18 = mg/dL.' }),
      selectInput('dextrose', 'Dextrose concentration for bolus/infusion', [
        { label: 'D50 (0.5 g/mL) — central line preferred', value: 'd50' },
        { label: 'D25 (0.25 g/mL) — central line', value: 'd25' },
        { label: 'D10 (0.1 g/mL) — peripheral acceptable', value: 'd10' },
      ], 'd50', 'Concentrated dextrose (D25/D50) limits fluid overload but needs central access; D10 can run peripherally at higher volume.'),
    ],
    calculate(values) {
      const w = num(values.weight, 80);
      const glucose = num(values.glucose, 120);
      const conc = str(values.dextrose, 'd50');
      const gPerMl = conc === 'd10' ? 0.1 : conc === 'd25' ? 0.25 : 0.5;
      const insulinBolus = round(w, 1);
      const insulinRate = round(w, 1);
      const giveDextroseBolus = glucose <= 250;
      const dexBolusG = round(0.5 * w, 1);
      const dexBolusMl = round(dexBolusG / gPerMl, 1);
      const dexRateG = round(0.5 * w, 1);
      const dexRateMl = round(dexRateG / gPerMl, 1);
      const alerts: string[] = [];
      if (!giveDextroseBolus) alerts.push(`Glucose ${glucose} mg/dL >250 — omit the dextrose bolus; still monitor glucose at least every 20–30 min during the first hour.`);
      alerts.push('Hypoglycemia and hypokalemia are the main complications — check glucose q20–30 min initially and potassium regularly.');
      return {
        score: `Insulin ${insulinBolus} U bolus → ${insulinRate} U/h`,
        unit: 'regular insulin IV',
        label: `HIET: bolus ${insulinBolus} U, infusion ${insulinRate} U/h + dextrose`,
        interpretation: `Regular insulin ${insulinBolus} U IV bolus (1 U/kg), then infusion at ${insulinRate} U/h (1 U/kg/h), titrating up by 0.5–1 U/kg/h for persistent shock (typically to 10 U/kg/h; up to 22 U/kg/h reported). ${giveDextroseBolus ? `Give dextrose bolus ${dexBolusG} g (${dexBolusMl} mL of ${conc.toUpperCase()}). ` : 'Dextrose bolus withheld for hyperglycemia. '}Start continuous dextrose infusion at ${dexRateG} g/h (${dexRateMl} mL/h of ${conc.toUpperCase()}).`,
        riskLevel: 'info',
        details: [
          { label: 'Insulin bolus', value: `${insulinBolus} U IV (1 U/kg)` },
          { label: 'Insulin infusion (start)', value: `${insulinRate} U/h (1 U/kg/h), titrate +0.5–1 U/kg/h as needed` },
          { label: 'Dextrose bolus', value: giveDextroseBolus ? `${dexBolusG} g = ${dexBolusMl} mL ${conc.toUpperCase()}` : `Withheld (glucose ${glucose} mg/dL)` },
          { label: 'Dextrose infusion', value: `${dexRateG} g/h = ${dexRateMl} mL/h ${conc.toUpperCase()}` },
          { label: 'Concentration', value: `${conc.toUpperCase()} = ${gPerMl} g/mL` },
        ],
        recommendations: [
          'Reassess cardiac function every 10–15 min; uptitrate insulin by 0.5–1 U/kg/h if perfusion remains depressed',
          'Maintain euglycemia (~5–8 mmol/L); CCB-poisoned patients are often already hyperglycemic — do not stop the insulin for high glucose, adjust dextrose instead',
          'Monitor potassium — insulin drives K⁺ intracellularly; replete to maintain K⁺ ~2.8–3.2 mEq/L per protocol',
          'Use concentrated insulin infusions (e.g., 16 U/mL) via pump with independent double-check',
          'Wean by ~1 U/kg/h decrements once stable; typical duration 1–2 days',
          'Contact poison control/medical toxicology early',
        ],
        alerts,
      };
    },
    evidence: {
      summary:
        'HIET (hyperinsulinemia-euglycemia) for CCB/BB cardiogenic shock: regular insulin 1 U/kg IV bolus with 0.5 g/kg dextrose (omitted above ~250 mg/dL), insulin infusion starting 0.5–1 U/kg/h titrated to response (commonly up to 10 U/kg/h; 22 U/kg/h reported), and continuous dextrose 0.5 g/kg/h.',
      formula: 'Insulin bolus = 1 U/kg; insulin infusion = 0.5–1→10 U/kg/h; dextrose bolus = 0.5 g/kg if glucose ≤250 mg/dL; dextrose infusion = 0.5 g/kg/h',
      validation:
        'Based on animal data, case series, and expert consensus (Engebretsen J Med Toxicol 2011; expert consensus recommendations for CCB poisoning). No RCT dosing standard exists — thresholds for withholding the dextrose bolus vary across sources (250–400 mg/dL); this tool uses a conservative ≤250 mg/dL threshold.',
      references: [
        {
          title: 'High-dose insulin therapy in beta-blocker and calcium channel-blocker poisoning',
          citation: 'Engebretsen KM, Kaczmarek KM, Morgan J, Holger JS. J Med Toxicol. 2011;7(2):100-110',
          year: 2011,
          doi: '10.3109/15563650.2011.582471',
        },
        {
          title: 'Experts consensus recommendations for the management of calcium channel blocker poisoning in adults',
          citation: 'St-Onge M et al. Crit Care. 2017',
          year: 2017,
          pmid: '26951350',
        },
      ],
    },
    nextSteps: [
      { condition: 'Persistent shock after HIET start', actions: ['Uptitrate insulin by 0.5–1 U/kg/h', 'Verify dextrose delivery and glucose/K monitoring', 'Add vasopressors; consider IV lipid emulsion for lipophilic agents (e.g., verapamil, propranolol)', 'Discuss ECMO/impella for refractory shock'] },
      { condition: 'Stable hemodynamics', actions: ['Wean insulin ~1 U/kg/h at a time', 'Continue dextrose until insulin stopped', 'Monitor for recurrent hypoglycemia/hypokalemia during wean'] },
    ],
    pearls: [
      'Give the bolus — saturating insulin receptors speeds the hemodynamic response (onset typically 15–60 min).',
      'Hyperglycemia at presentation is common in CCB overdose and does NOT contraindicate HIET; it only changes whether the initial dextrose bolus is needed.',
      'Central access is preferred for D25/D50 to limit volume; D10 works peripherally but multiplies infusion volume ×5.',
      'Insulin remains stable ~14 days at 16 U/mL — many pharmacies stock concentrated HIET bags for rapid turnaround.',
    ],
  },

  // ─── 12. Local anesthetic dosing ──────────────────────────────────────────
  {
    id: 'local-anesthetic-dosing',
    name: 'Local Anesthetic Dosing Calculator',
    shortName: 'LA dosing',
    description:
      'Weight-based maximum local-anesthetic dose and corresponding maximum volume for bupivacaine/levobupivacaine, lidocaine, mepivacaine, prilocaine, and ropivacaine, with and without epinephrine.',
    category: 'surgery',
    tags: ['local anesthetic', 'lidocaine', 'bupivacaine', 'ropivacaine', 'mepivacaine', 'prilocaine', 'max dose', 'LAST'],
    whenToUse:
      'Before infiltration, peripheral nerve block, or field anesthesia when checking the maximum recommended dose and volume of a local anesthetic for a given weight and concentration.',
    whyUse:
      'Exceeding weight-based maximums raises the risk of local anesthetic systemic toxicity (LAST). Computing both mg and mL at the intended concentration reduces dose-conversion errors.',
    inputs: [
      selectInput('agent', 'Local anesthetic', [
        { label: 'Bupivacaine / Levobupivacaine', value: 'bupivacaine' },
        { label: 'Lidocaine', value: 'lidocaine' },
        { label: 'Mepivacaine', value: 'mepivacaine' },
        { label: 'Prilocaine', value: 'prilocaine' },
        { label: 'Ropivacaine', value: 'ropivacaine' },
      ], 'lidocaine', 'Agent determines the mg/kg maximum and absolute dose ceiling. Not for liposomal bupivacaine.'),
      numberInput('weight', 'Body weight for dosing', { unit: 'kg', unitKind: 'weight', min: 2, max: 300, step: 0.1, exampleValue: 70, helpText: 'Use ideal or lean body weight per ASRA/SOBA guidance in obesity; actual weight is reasonable in typical-range patients.' }),
      selectInput('concentration', 'Solution concentration', [
        { label: '0.25%', value: 0.25 },
        { label: '0.5%', value: 0.5 },
        { label: '0.75%', value: 0.75 },
        { label: '1%', value: 1 },
        { label: '1.5%', value: 1.5 },
        { label: '2%', value: 2 },
        { label: '3%', value: 3 },
        { label: '4%', value: 4 },
      ], 1, '1% solution = 10 mg/mL. Max volume = max dose ÷ (concentration × 10).'),
      yesNo('epinephrine', 'Solution contains epinephrine', null, 'Epinephrine raises the accepted max dose for lidocaine, mepivacaine, prilocaine, and bupivacaine (slower systemic absorption). Ropivacaine gains little because it is intrinsically vasoconstrictive.', false, false),
    ],
    calculate(values) {
      const agent = str(values.agent, 'lidocaine');
      const w = num(values.weight, 70);
      const conc = num(values.concentration, 1);
      const epi = bool(values.epinephrine);
      // Widely-taught published maxima (mg/kg, absolute ceiling mg)
      const TABLE: Record<string, { plain: [number, number]; epi: [number, number]; name: string }> = {
        lidocaine: { plain: [4.5, 300], epi: [7, 500], name: 'Lidocaine' },
        bupivacaine: { plain: [2, 175], epi: [2.5, 225], name: 'Bupivacaine/Levobupivacaine' },
        mepivacaine: { plain: [4.5, 300], epi: [7, 400], name: 'Mepivacaine' },
        prilocaine: { plain: [6, 400], epi: [8, 600], name: 'Prilocaine' },
        ropivacaine: { plain: [3, 225], epi: [3, 225], name: 'Ropivacaine' },
      };
      const entry = TABLE[agent] ?? TABLE.lidocaine;
      const [mgKg, cap] = epi ? entry.epi : entry.plain;
      const weightDose = mgKg * w;
      const maxMg = round(Math.min(weightDose, cap), 1);
      const capped = weightDose > cap;
      const maxMl = round(maxMg / (conc * 10), 1);
      return {
        score: `${maxMg} mg`,
        unit: `≈ ${maxMl} mL of ${conc}% solution`,
        label: `${entry.name}${epi ? ' + epi' : ''}: max ${maxMg} mg (${maxMl} mL)`,
        interpretation: `Max recommended ${entry.name} dose ≈ ${round(mgKg, 1)} mg/kg × ${w} kg = ${round(weightDose, 0)} mg${capped ? `, capped at the ${cap} mg ceiling` : ''} → ${maxMg} mg = ${maxMl} mL of ${conc}% (${conc * 10} mg/mL).`,
        riskLevel: 'info',
        details: [
          { label: 'Rate used', value: `${mgKg} mg/kg${epi ? ' (with epinephrine)' : ' (plain)'}` },
          { label: 'Weight-based dose', value: `${round(weightDose, 0)} mg` },
          { label: 'Absolute ceiling', value: `${cap} mg${capped ? ' — APPLIED' : ''}` },
          { label: 'Concentration', value: `${conc}% = ${conc * 10} mg/mL` },
          { label: 'Max volume', value: `${maxMl} mL` },
        ],
        recommendations: [
          'Use the lowest effective dose; these are maximums, not targets',
          'ASRA/SOBA advise lean body weight in obesity; dose at extremes of age/organ dysfunction cautiously',
          'LAST resuscitation readiness: 20% lipid emulsion available, aspiration before injection, incremental dosing, ultrasound guidance',
          'Doses are additive across agents — do not sum two local anesthetics at full maxima',
        ],
        alerts: capped ? [`Weight-based dose (${round(weightDose, 0)} mg) exceeds the ${cap} mg absolute ceiling — use the capped value.`] : undefined,
      };
    },
    evidence: {
      summary:
        'Commonly published maximum doses: lidocaine 4.5 mg/kg plain (300 mg cap) / 7 mg/kg with epinephrine (500 mg); bupivacaine-levobupivacaine 2 mg/kg (175 mg) / 2.5 mg/kg epi (225 mg); mepivacaine 4.5 mg/kg (300 mg) / 7 mg/kg epi (400 mg); prilocaine 6 mg/kg (400 mg) / 8 mg/kg epi (600 mg); ropivacaine ~3 mg/kg (225 mg; no epi benefit). Max volume = max mg ÷ (concentration% × 10).',
      formula: 'Max dose = min(mg/kg × weight, absolute ceiling); max volume = max dose ÷ mg/mL',
      validation:
        'Published maxima vary modestly across sources (StatPearls/ASRA tables list bupivacaine and ropivacaine at 2 mg/kg regardless of epinephrine; FDA labels dose ropivacaine per-procedure without a flat mg/kg max). Values here follow widely taught infiltration references; verify against local formulary. Newer Goldfrank guidance no longer applies an epinephrine uplift to every agent.',
      references: [
        {
          title: 'ASRA practice advisory on local anesthetic systemic toxicity: 2020 update / checklist',
          citation: 'Neal JM et al. Reg Anesth Pain Med. 2021;46(1):81-101',
          year: 2021,
          pmid: '33148630',
        },
        {
          title: 'Maximum recommended doses of local anesthetics (StatPearls, pediatric regional anesthesia table)',
          citation: 'StatPearls, NCBI Bookshelf',
          url: 'https://www.ncbi.nlm.nih.gov/books/NBK572090/',
        },
      ],
    },
    nextSteps: [
      { condition: 'Desired volume exceeds max volume', actions: ['Lower the volume or dilute the concentration', 'Split the block into staged doses', 'Choose a lower-toxicity agent (e.g., ropivacaine over bupivacaine)'] },
      { condition: 'Signs of LAST (perioral numbness, metallic taste, twitching, arrhythmia)', actions: ['Stop injection, call for help', '100% oxygen, benzodiazepine for seizures', '20% lipid emulsion 1.5 mL/kg bolus then 0.25 mL/kg/min', 'Small-dose epinephrine <1 µg/kg if arrest; avoid CCBs/BBs/lidocaine as antiarrhythmics'] },
    ],
    pearls: [
      '1% = 10 mg/mL — the fastest safety check is max mL = max mg ÷ (10 × concentration%).',
      'Epinephrine roughly doubles the safe lidocaine dose (4.5→7 mg/kg) but does little for ropivacaine, which vasoconstricts on its own.',
      'Obesity: dose to lean/ideal body weight, not actual weight — adipose tissue does not increase safe dose proportionally.',
    ],
  },

  // ─── 13. CEDOCS ───────────────────────────────────────────────────────────
  {
    id: 'cedocs',
    name: 'CEDOCS Score for Emergency Department Overcrowding',
    shortName: 'CEDOCS',
    description:
      'Community ED Overcrowding Scale — quantifies crowding (0–200, six levels) in community emergency departments from critical-care patients, admits’ waits, waiting-room census, ED occupancy ratio, and annual visit volume.',
    category: 'emergency',
    tags: ['cedocs', 'overcrowding', 'ed crowding', 'operations', 'throughput', 'weiss'],
    whenToUse:
      'Community (non-academic) emergency departments measuring crowding each shift or during surge events to trigger escalation/surge plans.',
    whyUse:
      'CEDOCS recalibrates NEDOCS for community hospitals, replacing hospital beds and ventilator counts with annual ED volume, critical-care count, and waiting-room census — variables community EDs actually track.',
    inputs: [
      numberInput('edBeds', 'Number of ED beds', { unit: 'beds', min: 1, max: 500, exampleValue: 20, helpText: 'Total licensed ED treatment beds.' }),
      numberInput('visits', 'ED visits per year', { unit: 'visits/yr', min: 1000, max: 500000, exampleValue: 35000, helpText: 'Annual ED census — enters linearly plus cubic-spline knots at 18,811 / 43,012 / 49,466 / 67,273 visits.' }),
      numberInput('totalPatients', 'Total patients in the ED', { unit: 'patients', min: 0, max: 500, exampleValue: 25, helpText: 'All ED patients now — include doubled-up rooms and hallway beds.' }),
      numberInput('critical', 'Critical care patients in the ED', { unit: 'patients', min: 0, max: 100, exampleValue: 2, helpText: 'Current ED patients meeting critical-care criteria.' }),
      numberInput('waitingRoom', 'Patients in the waiting room', { unit: 'patients', min: 0, max: 500, exampleValue: 10, helpText: 'Current waiting-room census.' }),
      numberInput('longestAdmit', 'Waiting time of longest admitted patient', { unit: 'hours', min: 0, max: 168, step: 0.25, exampleValue: 4, helpText: 'Hours the longest-waiting admitted patient has been boarding in the ED.' }),
      numberInput('scaling', 'Scaling factor (optional — local recalibration)', { min: 0.1, max: 10, step: 0.1, exampleValue: 1, helpText: 'Advanced: multiplies the raw score for locally recalibrated implementations. Leave blank for the standard published score (factor 1).', required: false }),
    ],
    calculate(values) {
      const beds = Math.max(num(values.edBeds, 20), 1);
      const visits = num(values.visits, 35000);
      const ratio = num(values.totalPatients, 0) / beds;
      const spline =
        -1.11e-12 * Math.pow(Math.max(visits - 18811, 0), 3) +
        8.23e-12 * Math.pow(Math.max(visits - 43012, 0), 3) -
        8.2e-12 * Math.pow(Math.max(visits - 49466, 0), 3) +
        1.08e-12 * Math.pow(Math.max(visits - 67273, 0), 3);
      const raw =
        -30.39 +
        3.0 * num(values.critical, 0) +
        0.53 * num(values.longestAdmit, 0) +
        1.16 * num(values.waitingRoom, 0) +
        20.66 * ratio +
        0.00126 * visits +
        spline;
      const scaling = values.scaling === null || values.scaling === undefined || values.scaling === '' ? 1 : num(values.scaling, 1);
      const score = clamp(round(raw * scaling, 0), 0, 200);
      const band = crowdingBand(score);
      return {
        score,
        unit: '/ 200',
        label: band.label,
        interpretation: `CEDOCS ${score} → ${band.label}. Many systems activate surge plans at level 4–5 (score >100–140).`,
        riskLevel: band.riskLevel,
        details: [
          { label: 'ED occupancy ratio', value: `${round(ratio, 2)} patients/bed` },
          { label: 'Raw model score', value: `${round(raw, 1)}${scaling !== 1 ? ` × scaling ${scaling}` : ''}` },
          { label: 'Annual-visit spline', value: `${round(spline, 2)}` },
        ],
        recommendations: [
          'Repeat scoring each shift and during influxes; log with the surge plan',
          'Level ≥4 → activate local overcrowding/surge protocol, escalate boarding and throughput barriers',
          'Level ≥5 → consider diversion criteria and system-level escalation',
        ],
      };
    },
    evidence: {
      summary:
        'CEDOCS (Weiss et al.) = −30.39 + 3.00·(critical care pts) + 0.53·(longest admit wait, h) + 1.16·(waiting room pts) + 20.66·(ED pts/ED beds) + 0.00126·(annual visits) − 1.11e-12·max(visits−18,811,0)³ + 8.23e-12·max(visits−43,012,0)³ − 8.20e-12·max(visits−49,466,0)³ + 1.08e-12·max(visits−67,273,0)³. Scale 0–200 in six levels.',
      formula: 'Linear terms + restricted cubic spline on annual visits; score clamped 0–200',
      validation:
        'Developed for community EDs as a reduced model validated against NEDOCS. Three variables carried over (ED beds, occupancy ratio, longest admit wait); hospital beds→annual visits, ventilators→critical-care count, admits→waiting-room census. Spline-knot sign pattern implemented per the published equation; openEHR transcriptions show minor coefficient rounding differences (e.g., −29.53 intercept, 1.09e-12/8.18e-12 spline weights).',
      references: [
        {
          title: 'Evaluating community ED crowding: the Community ED Overcrowding Scale (CEDOCS) study',
          citation: 'Weiss SJ, Rogers DB, Maas F, Ernst AA, Nick TG. Acad Emerg Med. 2014;21(12):1357-1366',
          year: 2014,
        },
        {
          title: 'Estimating the degree of emergency department overcrowding in academic medical centers: results of the National ED Overcrowding Study (NEDOCS)',
          citation: 'Weiss SJ et al. Acad Emerg Med. 2004;11(1):38-50',
          year: 2004,
          doi: '10.1197/j.aem.2003.07.017',
        },
      ],
    },
    nextSteps: [
      { condition: 'Level 4 (>100–140)', actions: ['Activate surge/overcrowding protocol', 'Escalate inpatient bed availability', 'Expedite discharges and boarding moves'] },
      { condition: 'Level 5–6 (>140)', actions: ['System-level escalation', 'Consider diversion status per policy', 'Deploy additional staffing/space'] },
    ],
    pearls: [
      'CEDOCS is calibrated for community hospitals; NEDOCS fits academic centers better.',
      'Annual visit volume enters through a cubic spline — the score is not linear across very different ED sizes.',
      'Score the same way every time (same census definitions) or trends lose meaning.',
    ],
  },

  // ─── 14. NEDOCS ───────────────────────────────────────────────────────────
  {
    id: 'nedocs',
    name: 'NEDOCS Score for Emergency Department Overcrowding',
    shortName: 'NEDOCS',
    description:
      'National ED Overcrowding Study score — quantifies ED crowding (0–200, six levels) from occupancy ratio, boarding admits relative to hospital beds, ventilated patients, and two wait times.',
    category: 'emergency',
    tags: ['nedocs', 'overcrowding', 'ed crowding', 'operations', 'throughput', 'weiss'],
    whenToUse:
      'Academic and larger emergency departments measuring crowding each shift or during surges to trigger escalation/surge plans.',
    whyUse:
      'The most widely used objective ED crowding measure; correlates with perceived overcrowding, left-without-being-seen rates, and diversion, and is written into state crowding-score legislation.',
    inputs: [
      numberInput('edBeds', 'Number of ED beds', { unit: 'beds', min: 1, max: 500, exampleValue: 30, helpText: 'Total licensed/staffed ED beds including hallway and chair spaces.' }),
      numberInput('hospBeds', 'Number of hospital beds', { unit: 'beds', min: 10, max: 5000, exampleValue: 400, helpText: 'Acute inpatient beds routinely in use (exclude newborn nursery, NICU, OB).', }),
      numberInput('totalPatients', 'Total patients in the ED', { unit: 'patients', min: 0, max: 500, exampleValue: 35, helpText: 'All ED patients — include doubled-up rooms, hallway beds, chairs, and waiting room.' }),
      numberInput('vents', 'Patients on ventilators in the ED', { unit: 'patients', min: 0, max: 100, exampleValue: 1, helpText: 'ED patients currently on mechanical ventilation.' }),
      numberInput('admits', 'Number of admits in the ED', { unit: 'patients', min: 0, max: 300, exampleValue: 4, helpText: 'Patients admitted but still boarding in the ED waiting for an inpatient bed (include transfers).' }),
      numberInput('longestAdmit', 'Waiting time of longest admitted patient', { unit: 'hours', min: 0, max: 168, step: 0.25, exampleValue: 4, helpText: 'Hours the longest-boarding admitted patient has waited in the ED (coefficient 0.93).' }),
      numberInput('lastBedWait', 'Waiting time of longest waiting-room patient', { unit: 'hours', min: 0, max: 168, step: 0.25, exampleValue: 1, helpText: 'Technically the door-to-bed time of the last patient roomed (coefficient 5.64).' }),
    ],
    calculate(values) {
      const edBeds = Math.max(num(values.edBeds, 30), 1);
      const hospBeds = Math.max(num(values.hospBeds, 400), 1);
      const occupancy = num(values.totalPatients, 0) / edBeds;
      const admitRatio = num(values.admits, 0) / hospBeds;
      const raw =
        -20 +
        85.8 * occupancy +
        600 * admitRatio +
        13.4 * num(values.vents, 0) +
        0.93 * num(values.longestAdmit, 0) +
        5.64 * num(values.lastBedWait, 0);
      const score = clamp(round(raw, 0), 0, 200);
      const band = crowdingBand(score);
      return {
        score,
        unit: '/ 200',
        label: band.label,
        interpretation: `NEDOCS ${score} → ${band.label}. Surge/overcrowding plans typically activate at level 4–5 (score >100–140).`,
        riskLevel: band.riskLevel,
        details: [
          { label: 'ED occupancy ratio', value: `${round(occupancy, 2)} pts/bed` },
          { label: 'Admits : hospital beds', value: `${num(values.admits, 0)} / ${hospBeds} = ${round(admitRatio, 4)}` },
          { label: 'Raw model score', value: `${round(raw, 1)}` },
        ],
        recommendations: [
          'Score every shift and during influxes; trend alongside LWBS and diversion metrics',
          'Level ≥4 → activate local surge plan; escalate boarding, staffing, and throughput barriers',
          'Level ≥5 → consider diversion criteria and hospital-level escalation',
        ],
      };
    },
    evidence: {
      summary:
        'NEDOCS (Weiss et al., Acad Emerg Med 2004) = −20 + 85.8·(ED pts/ED beds) + 600·(admits/hospital beds) + 13.4·(ventilated ED pts) + 0.93·(longest admitted wait, h) + 5.64·(last door-to-bed wait, h), scaled 0–200 in six levels.',
      formula: '−20 + 85.8·occupancy + 600·admit ratio + 13.4·vents + 0.93·Tadm + 5.64·Tbed',
      validation:
        'Derived and validated across US academic EDs; correlates with expert-rated crowding, ambulance diversion, and LWBS rates. Statutory implementations (e.g., California AB-1164) cap the critical-care/ventilated count at 4 — this calculator reports the unbounded published variable. Some transcriptions swap the two wait-time coefficients; this implementation follows the EMResource/statutory assignment (0.93 → longest admit; 5.64 → last door-to-bed).',
      references: [
        {
          title: 'Estimating the degree of emergency department overcrowding in academic medical centers: results of the National ED Overcrowding Study (NEDOCS)',
          citation: 'Weiss SJ, Derlet R, Arndahl J, et al. Acad Emerg Med. 2004;11(1):38-50',
          year: 2004,
          doi: '10.1197/j.aem.2003.07.017',
        },
        {
          title: 'Comparison of the National Emergency Department Overcrowding Scale and the Emergency Department Work Index for quantifying emergency department crowding',
          citation: 'Weiss SJ, Ernst AA, Nick TG. Acad Emerg Med. 2006;13(5):513-518',
          year: 2006,
          doi: '10.1197/j.aem.2005.12.009',
        },
      ],
    },
    nextSteps: [
      { condition: 'Level 4 (>100–140)', actions: ['Activate surge/overcrowding protocol', 'Escalate inpatient bed management', 'Address boarding and throughput barriers'] },
      { condition: 'Level 5–6 (>140)', actions: ['Hospital-level escalation', 'Diversion per policy', 'Additional staffing and overflow space'] },
    ],
    pearls: [
      'The two wait times are not interchangeable: 0.93 applies to the longest ADMITTED patient wait, 5.64 to the last door-to-bed (waiting-room) time.',
      'Occupancy ratio >1 means patients exceed licensed beds — the single largest driver.',
      'Designed and validated in academic centers; CEDOCS is the community-ED variant.',
    ],
  },
];
