import type { Calculator } from '../../types/calculator';
import { num, bool, str, round, yesNo, selectInput, numberInput, riskFromThresholds } from '../../utils/helpers';

/** Convert canonical mmol/L cholesterol to mg/dL for the ATP III point tables. */
const MMOL_TO_MGDL_CHOL = 38.67;

// ─── ATP III / Wilson 1998 Framingham "hard CHD" point tables ────────────────
function frsAgeBand(age: number): number {
  if (age < 40) return 0;
  if (age < 50) return 1;
  if (age < 60) return 2;
  if (age < 70) return 3;
  return 4;
}
function frsAgePoints(age: number, male: boolean): number {
  const men = [-9, -4, 0, 3, 6, 8, 10, 11, 12, 13];
  const women = [-7, -3, 0, 3, 6, 8, 10, 12, 14, 16];
  const idx = age < 35 ? 0 : age < 40 ? 1 : age < 45 ? 2 : age < 50 ? 3 : age < 55 ? 4 : age < 60 ? 5 : age < 65 ? 6 : age < 70 ? 7 : age < 75 ? 8 : 9;
  return (male ? men : women)[idx];
}
function frsTcBand(tcMgdl: number): number {
  if (tcMgdl < 160) return 0;
  if (tcMgdl < 200) return 1;
  if (tcMgdl < 240) return 2;
  if (tcMgdl < 280) return 3;
  return 4;
}
function frsTcPoints(age: number, tcMgdl: number, male: boolean): number {
  const men = [
    [0, 4, 7, 9, 11],
    [0, 3, 5, 6, 8],
    [0, 2, 3, 4, 5],
    [0, 1, 1, 2, 3],
    [0, 0, 0, 1, 1],
  ];
  const women = [
    [0, 4, 8, 11, 13],
    [0, 3, 6, 8, 10],
    [0, 2, 4, 5, 7],
    [0, 1, 2, 3, 4],
    [0, 1, 1, 2, 2],
  ];
  return (male ? men : women)[frsAgeBand(age)][frsTcBand(tcMgdl)];
}
function frsSmokePoints(age: number, male: boolean): number {
  const men = [8, 5, 3, 1, 1];
  const women = [9, 7, 4, 2, 1];
  return (male ? men : women)[frsAgeBand(age)];
}
function frsHdlPoints(hdlMgdl: number): number {
  if (hdlMgdl >= 60) return -1;
  if (hdlMgdl >= 50) return 0;
  if (hdlMgdl >= 40) return 1;
  return 2;
}
function frsSbpPoints(sbp: number, treated: boolean, male: boolean): number {
  const menU = [0, 0, 1, 1, 2];
  const menT = [0, 1, 2, 2, 3];
  const womenU = [0, 1, 2, 3, 4];
  const womenT = [0, 3, 4, 5, 6];
  const idx = sbp < 120 ? 0 : sbp < 130 ? 1 : sbp < 140 ? 2 : sbp < 160 ? 3 : 4;
  return (male ? (treated ? menT : menU) : treated ? womenT : womenU)[idx];
}
function frsRisk(pts: number, male: boolean): string {
  if (male) {
    if (pts < 0) return '<1';
    const table = [1, 1, 1, 1, 1, 2, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 25];
    if (pts <= 16) return `${table[pts]}`;
    return '≥30';
  }
  if (pts < 9) return '<1';
  const table = [1, 1, 1, 1, 2, 2, 3, 4, 5, 6, 8, 11, 14, 17, 22, 27];
  if (pts <= 24) return `${table[pts - 9]}`;
  return '≥30';
}

export const wave8EmStaplesCalcs: Calculator[] = [
  // ─── 1. HScore for Reactive Hemophagocytic Syndrome ────────────────────────
  {
    id: 'hscore-hemophagocytic',
    name: 'HScore for Reactive Hemophagocytic Syndrome',
    shortName: 'HScore',
    description:
      'Fardet 2014 diagnostic score for reactive hemophagocytic syndrome (secondary HLH) combining clinical, biologic, and cytologic criteria. Score ≥169 had 93% sensitivity / 86% specificity in derivation.',
    category: 'hematology',
    tags: ['hscore', 'hlh', 'hemophagocytic', 'ferritin', 'cytopenia', 'fardet', 'mas'],
    whenToUse:
      'Adult patients with suspected reactive (secondary) hemophagocytic lymphohistiocytosis — e.g., unexplained fever, cytopenias, hyperferritinemia in the setting of infection, malignancy, or rheumatologic disease.',
    whyUse:
      'HLH lacks a single diagnostic feature and mimics severe sepsis and hematologic malignancy. The HScore estimates the probability of reactive HLH from nine weighted variables and outperformed the HLH-2004 criteria for sensitivity in several cohorts.',
    inputs: [
      yesNo('immunosuppression', 'Known underlying immunosuppression', 18, 'HIV positive, or receiving long-term immunosuppressive therapy (glucocorticoids, cyclosporine, azathioprine, etc.).', true),
      selectInput('temperature', 'Maximum temperature', [
        { label: '<38.4 °C (<101.1 °F)', value: 0, points: 0 },
        { label: '38.4–39.4 °C (101.1–102.9 °F)', value: 33, points: 33 },
        { label: '>39.4 °C (>102.9 °F)', value: 49, points: 49 },
      ], 49, 'Highest documented temperature; high fever is weighted heavily in the HScore.'),
      selectInput('organomegaly', 'Organomegaly', [
        { label: 'None', value: 0, points: 0 },
        { label: 'Hepatomegaly OR splenomegaly', value: 23, points: 23 },
        { label: 'Hepatomegaly AND splenomegaly', value: 38, points: 38 },
      ], 38, 'Clinical or radiologic hepatomegaly and/or splenomegaly.'),
      selectInput('cytopenias', 'Number of cytopenic lineages', [
        { label: '1 lineage', value: 0, points: 0 },
        { label: '2 lineages', value: 24, points: 24 },
        { label: '3 lineages', value: 34, points: 34 },
      ], 34, 'Cytopenia defined as hemoglobin ≤9.2 g/dL, WBC ≤5,000/mm³, and/or platelets ≤110,000/mm³. Count the number of affected lineages.'),
      selectInput('ferritin', 'Ferritin (ng/mL or µg/L)', [
        { label: '<2,000', value: 0, points: 0 },
        { label: '2,000–6,000', value: 35, points: 35 },
        { label: '>6,000', value: 50, points: 50 },
      ], 50, 'Highest serum ferritin during the episode.'),
      selectInput('triglycerides', 'Triglycerides', [
        { label: '<132.7 mg/dL (<1.5 mmol/L)', value: 0, points: 0 },
        { label: '132.7–354 mg/dL (1.5–4 mmol/L)', value: 44, points: 44 },
        { label: '>354 mg/dL (>4 mmol/L)', value: 64, points: 64 },
      ], 44, 'Fasting or random serum triglycerides; convert mmol/L × 88.5 ≈ mg/dL.'),
      selectInput('fibrinogen', 'Fibrinogen', [
        { label: '>250 mg/dL (>2.5 g/L)', value: 0, points: 0 },
        { label: '≤250 mg/dL (≤2.5 g/L)', value: 30, points: 30 },
      ], 30, 'Low fibrinogen (≤250 mg/dL) scores 30 points.'),
      selectInput('ast', 'AST (SGOT)', [
        { label: '<30 U/L', value: 0, points: 0 },
        { label: '≥30 U/L', value: 19, points: 19 },
      ], 19, 'Aspartate aminotransferase; ≥30 U/L scores 19 points.'),
      yesNo('hemophagocytosis', 'Hemophagocytosis features on bone marrow aspirate', 35, 'Documented hemophagocytosis on marrow aspirate. Absence does not exclude HLH — marrow is often negative early.', true),
    ],
    calculate(values) {
      const score =
        (bool(values.immunosuppression) ? 18 : 0) +
        num(values.temperature) +
        num(values.organomegaly) +
        num(values.cytopenias) +
        num(values.ferritin) +
        num(values.triglycerides) +
        num(values.fibrinogen) +
        num(values.ast) +
        (bool(values.hemophagocytosis) ? 35 : 0);
      const r = riskFromThresholds(score, [
        {
          max: 90,
          level: 'low',
          label: 'Very low probability of HLH (<1%)',
          interpretation: `HScore ${score}: probability of reactive hemophagocytic syndrome is <1% in the derivation cohort. Seek alternative diagnoses.`,
        },
        {
          max: 168,
          level: 'moderate',
          label: 'Intermediate probability — below the ≥169 cutoff',
          interpretation: `HScore ${score}: below the published diagnostic cutoff of 169 (93% sensitivity, 86% specificity for HLH). Repeat assessment as labs evolve and pursue the underlying trigger.`,
        },
        {
          max: 249,
          level: 'high',
          label: 'Meets/exceeds HScore diagnostic cutoff (≥169)',
          interpretation: `HScore ${score}: at or above the published cutoff of 169 — high probability of reactive HLH. Identify and treat the trigger and consult an HLH specialist; HLH-94/2004-based therapy may be indicated.`,
        },
        {
          max: 999,
          level: 'critical',
          label: 'Very high probability of HLH (>99% at ≥250)',
          interpretation: `HScore ${score}: ≥250 corresponds to >99% probability of reactive hemophagocytic syndrome in the Fardet derivation cohort. Urgent specialist consultation and treatment of the trigger.`,
        },
      ]);
      return {
        score,
        unit: 'points',
        label: r.label,
        interpretation: r.interpretation,
        riskLevel: r.riskLevel,
        details: [
          { label: 'Score anchors', value: '≤90 → <1%; 169 → published cutoff; ≥250 → >99% probability' },
          { label: 'Median score in HLH cases (derivation)', value: '230 (IQR 203–257)' },
        ],
        recommendations: [
          'Identify and treat the trigger (infection, malignancy, autoimmune flare, drugs)',
          'Prompt consultation with an HLH specialist; Histiocyte Society protocols (HLH-94/HLH-2004) guide therapy',
          'Missing data are scored 0 in the original tool — re-score as results return',
        ],
      };
    },
    evidence: {
      summary:
        'Nine weighted variables — 3 clinical (immunosuppression 18, temperature 0/33/49, organomegaly 0/23/38), 5 biologic (triglycerides 0/44/64, ferritin 0/35/50, AST 0/19, fibrinogen 0/30, cytopenias 0/24/34), and 1 cytologic (marrow hemophagocytosis 35). Maximum 337; missing data scored 0.',
      formula: 'Sum of weighted items; probability of HLH <1% at ≤90, ~50% near the 169 cutoff region, >99% at ≥250.',
      validation:
        'Derived and validated in a multicenter retrospective cohort of 312 patients (Fardet 2014); median HScore 230 in HLH vs 125 without. A 2022 multicenter external validation (PMID 35434872) found HScore ≥169 had 96% sensitivity but only 71% specificity — HLH-2004 criteria outperformed HScore in most etiologies except inflammatory/autoimmune HLH; an optimal cutoff nearer 200 performed comparably to HLH-2004.',
      references: [
        {
          title: 'Development and validation of the HScore, a score for the diagnosis of reactive hemophagocytic syndrome',
          citation: 'Fardet L et al. Arthritis Rheumatol. 2014;66(9):2613-20',
          year: 2014,
          pmid: '24782338',
          doi: '10.1002/art.38690',
        },
        {
          title: 'Validation of the HScore and the HLH-2004 diagnostic criteria for the diagnosis of hemophagocytic lymphohistiocytosis in a multicenter cohort',
          citation: 'Debaugnies F et al. Front Immunol. 2022',
          year: 2022,
          pmid: '35434872',
        },
      ],
    },
    nextSteps: [
      { condition: 'HScore ≥169', actions: ['Urgent hematology/rheumatology or HLH specialist consult', 'Search for trigger (infection workup, malignancy screen, autoimmune activity)', 'Consider HLH-directed therapy per HLH-94/2004 with specialist guidance'] },
      { condition: 'HScore 91–168 with clinical suspicion', actions: ['Repeat score as ferritin/fibrinogen/triglycerides/marrow results return', 'Consider soluble IL-2 receptor (sCD25) and NK-cell activity testing', 'Treat the suspected underlying disease'] },
      { condition: 'HScore ≤90', actions: ['Pursue alternative diagnoses (sepsis, malignancy, autoimmune flare)'] },
    ],
    pearls: [
      'Marrow hemophagocytosis is neither sensitive nor specific — a negative aspirate does not exclude HLH, and hemophagocytosis can be seen in non-HLH illness.',
      'Ferritin >6,000 contributes 50 points; extreme hyperferritinemia (>10,000) in adults should still prompt malignancy/Still disease workup, not reflex HLH treatment.',
      'Missing variables are scored 0 — the score underestimates probability when workup is incomplete.',
    ],
  },

  // ─── 2. Framingham Risk Score for Hard CHD (ATP III point tables) ──────────
  {
    id: 'framingham-hard-chd',
    name: 'Framingham Risk Score for Hard Coronary Heart Disease',
    shortName: 'Framingham CHD',
    description:
      'ATP III / Wilson 1998 Framingham point-score estimate of 10-year risk of hard CHD (MI or coronary death) in adults without diabetes, CHD, or claudication.',
    category: 'cardiology',
    tags: ['framingham', 'chd', '10-year risk', 'atp iii', 'lipids', 'primary prevention'],
    status: 'legacy',
    supersededBy: 'ascvd-risk',
    whenToUse:
      'Adults 30–79 years without diabetes, established CHD, or intermittent claudication, for 10-year hard CHD risk estimation. Largely superseded by ACC/AHA Pooled Cohort and PREVENT equations in current guidelines.',
    whyUse:
      'Historically the standard North American primary-prevention risk tool; the ATP III point tables remain useful for teaching and for comparison with older guideline thresholds (low <10%, intermediate 10–20%, high >20% 10-year risk).',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 30, max: 79, exampleValue: 55, helpText: 'Age 30–79 years at risk assessment. The point tables cover 20–79; this tool is intended for 30–79.' }),
      selectInput('sex', 'Sex', [
        { label: 'Female', value: 'F' },
        { label: 'Male', value: 'M' },
      ], 'M', 'Sex-specific point tables from Wilson 1998 / ATP III.'),
      yesNo('smoker', 'Current cigarette smoker', null, 'Any cigarette smoking in the past month (ATP III definition).', true),
      numberInput('totalChol', 'Total cholesterol', { unit: 'mmol/L', unitKind: 'cholesterol', min: 2, max: 13, step: 0.1, exampleValue: 5.4, helpText: 'Average of ≥2 fasting lipoprotein measurements. Point bands are defined in mg/dL (<160, 160–199, 200–239, 240–279, ≥280).' }),
      numberInput('hdl', 'HDL cholesterol', { unit: 'mmol/L', unitKind: 'cholesterol', min: 0.3, max: 4, step: 0.1, exampleValue: 1.1, helpText: 'HDL-C; ≥60 mg/dL (≥1.55 mmol/L) subtracts a point.' }),
      numberInput('sbp', 'Systolic blood pressure', { unit: 'mmHg', min: 80, max: 260, exampleValue: 140, helpText: 'Average of several recent readings, regardless of treatment.' }),
      yesNo('bpTreated', 'On antihypertensive medication', null, 'Treated hypertension adds extra points beyond the SBP level because it carries residual risk.', false),
    ],
    calculate(values) {
      const age = num(values.age, 55);
      const male = str(values.sex, 'M') === 'M';
      const tc = num(values.totalChol, 5.4) * MMOL_TO_MGDL_CHOL;
      const hdl = num(values.hdl, 1.1) * MMOL_TO_MGDL_CHOL;
      const sbp = num(values.sbp, 140);
      const smoker = bool(values.smoker);
      const treated = bool(values.bpTreated);
      const pts =
        frsAgePoints(age, male) +
        frsTcPoints(age, tc, male) +
        (smoker ? frsSmokePoints(age, male) : 0) +
        frsHdlPoints(hdl) +
        frsSbpPoints(sbp, treated, male);
      const riskStr = frsRisk(pts, male);
      const riskNum = parseFloat(riskStr.replace(/[<≥]/g, ''));
      const r = riskFromThresholds(riskNum, [
        {
          max: 9.999,
          level: 'low',
          label: 'Low 10-year hard CHD risk (<10%)',
          interpretation: `Framingham point score ${pts} → 10-year hard CHD risk ${riskStr}%. Lifestyle measures are the mainstay; statin generally not indicated on risk alone.`,
        },
        {
          max: 20,
          level: 'moderate',
          label: 'Intermediate 10-year hard CHD risk (10–20%)',
          interpretation: `Framingham point score ${pts} → 10-year hard CHD risk ${riskStr}%. Under historical ATP III categories this is intermediate risk; contemporary decisions should use the Pooled Cohort / PREVENT equations and risk-enhancing factors.`,
        },
        {
          max: 999,
          level: 'high',
          label: 'High 10-year hard CHD risk (>20%)',
          interpretation: `Framingham point score ${pts} → 10-year hard CHD risk ${riskStr}% — historically a "CHD risk equivalent" category warranting intensive risk-factor management.`,
        },
      ]);
      return {
        score: `${riskStr}`,
        unit: '% 10-year risk',
        label: r.label,
        interpretation: r.interpretation,
        riskLevel: r.riskLevel,
        details: [
          { label: 'Point total', value: `${pts}` },
          { label: 'Sex / smoking / treated HTN', value: `${male ? 'Male' : 'Female'} / ${smoker ? 'smoker' : 'nonsmoker'} / ${treated ? 'treated' : 'untreated'}` },
          { label: 'TC / HDL (mg/dL)', value: `${round(tc, 0)} / ${round(hdl, 0)}` },
          { label: 'Risk bands (ATP III)', value: '<10% low; 10–20% intermediate; >20% high' },
        ],
        recommendations: [
          'Use the ACC/AHA Pooled Cohort Equations or PREVENT for contemporary treatment decisions — FRS is retained for historical/teaching comparison.',
          'Diabetes and established ASCVD are risk equivalents — do not apply this score to those patients.',
        ],
      };
    },
    evidence: {
      summary:
        'Sex-specific point tables (Wilson 1998 as published in ATP III): age, total cholesterol by age band, smoking by age band, HDL-C, and systolic BP (separate untreated/treated columns). Point total maps to 10-year hard CHD (MI/coronary death) risk.',
      formula: 'Points(age) + Points(TC|age) + Points(smoker|age) + Points(HDL) + Points(SBP|treated) → sex-specific risk table.',
      validation:
        'Derived from Framingham cohort data (Wilson 1998) and promulgated by ATP III (2001). Externally validated across ethnicities (D’Agostino 2001) with reasonable performance after recalibration. Superseded in current guidelines by the 2013 Pooled Cohort Equations and 2023 PREVENT equations.',
      references: [
        {
          title: 'Prediction of coronary heart disease using risk factor categories',
          citation: 'Wilson PWF et al. Circulation. 1998;97(18):1837-47',
          year: 1998,
          pmid: '9603536',
          doi: '10.1161/01.CIR.97.18.1837',
        },
        {
          title: 'Executive Summary of the Third Report of the NCEP Expert Panel on Detection, Evaluation, and Treatment of High Blood Cholesterol in Adults (ATP III)',
          citation: 'Expert Panel on Detection, Evaluation, and Treatment of High Blood Cholesterol in Adults. JAMA. 2001;285(19):2486-97',
          year: 2001,
          pmid: '11368702',
          doi: '10.1001/jama.285.19.2486',
        },
        {
          title: 'Validation of the Framingham coronary heart disease prediction scores: results of a multiple ethnic groups investigation',
          citation: 'D’Agostino RB et al. JAMA. 2001;286(2):180-7',
          year: 2001,
          pmid: '11448281',
          doi: '10.1001/jama.286.2.180',
        },
      ],
    },
    nextSteps: [
      { condition: 'Risk <10%', actions: ['Lifestyle counseling: diet, activity, weight, smoking cessation', 'Reassess risk periodically'] },
      { condition: 'Risk 10–20%', actions: ['Recalculate with Pooled Cohort / PREVENT', 'Consider risk enhancers (CAC, hs-CRP, Lp(a), family history) to guide statin decision'] },
      { condition: 'Risk >20%', actions: ['Intensive risk-factor management per current guidelines', 'High-intensity statin generally appropriate; BP and tobacco control'] },
    ],
    pearls: [
      'Do not use in diabetics, established CHD, or claudication — those patients are already high risk.',
      'The "smoker" item means any cigarettes in the last month.',
      'Treated hypertension adds points at the same SBP — residual risk persists after treatment.',
    ],
  },

  // ─── 3. Mangled Extremity Severity Score (MESS) ────────────────────────────
  {
    id: 'mess-score',
    name: 'Mangled Extremity Severity Score (MESS)',
    shortName: 'MESS',
    description:
      'Johansen/Helfet score for severe lower-extremity trauma with vascular compromise. MESS ≥7 predicted amputation with 100% accuracy in the derivation cohorts.',
    category: 'orthopedics',
    tags: ['mess', 'mangled extremity', 'trauma', 'amputation', 'limb salvage', 'vascular injury'],
    whenToUse:
      'Severe lower-extremity trauma with vascular compromise when weighing limb salvage versus primary amputation — after initial trauma resuscitation and stabilization.',
    whyUse:
      'Provides objective criteria at the bedside to support early salvage-vs-amputation decisions, where prolonged ischemia worsens outcomes.',
    inputs: [
      selectInput('ischemia', 'Limb ischemia', [
        { label: 'Pulse reduced but perfusion normal', value: 1, points: 1 },
        { label: 'Pulseless; paresthesias; slow capillary refill', value: 2, points: 2 },
        { label: 'Cool, paralyzed, insensate/numb', value: 3, points: 3 },
      ], 2, 'Ischemia severity. The score was derived in limbs with vascular compromise; ischemia points are doubled when ischemia exceeds 6 hours.'),
      yesNo('ischemiaOver6h', 'Limb ischemia for >6 hours', null, 'If ischemia has persisted >6 hours, the ischemia component is doubled.', false),
      selectInput('ageBand', 'Patient age', [
        { label: '<30 years', value: 0, points: 0 },
        { label: '30–50 years', value: 1, points: 1 },
        { label: '>50 years', value: 2, points: 2 },
      ], 1, 'Age band per the published score.'),
      selectInput('shock', 'Shock', [
        { label: 'SBP consistently >90 mmHg', value: 0, points: 0 },
        { label: 'Transient hypotension', value: 1, points: 1 },
        { label: 'Persistent hypotension', value: 2, points: 2 },
      ], 1, 'Blood pressure trajectory during evaluation/resuscitation.'),
      selectInput('mechanism', 'Injury mechanism (skeletal/soft-tissue damage)', [
        { label: 'Low energy (stab, gunshot, simple fracture)', value: 1, points: 1 },
        { label: 'Medium energy (dislocation, open/multiple fractures)', value: 2, points: 2 },
        { label: 'High energy (high-speed MVA or rifle)', value: 3, points: 3 },
        { label: 'Very high energy (high-speed trauma with gross contamination)', value: 4, points: 4 },
      ], 2, 'Energy of injury as a surrogate for skeletal/soft-tissue damage.'),
    ],
    calculate(values) {
      const isch = num(values.ischemia, 1) * (bool(values.ischemiaOver6h) ? 2 : 1);
      const score = isch + num(values.ageBand) + num(values.shock) + num(values.mechanism);
      const high = score >= 7;
      return {
        score,
        unit: 'points',
        label: high ? 'MESS ≥7 — amputation predicted' : 'MESS <7 — limb likely salvageable',
        interpretation: high
          ? `MESS ${score}: ≥7 predicted amputation with 100% accuracy in the derivation and prospective cohorts (salvaged limbs averaged ~4). Decisions must still integrate clinical judgment, ischemia time, contamination, and patient factors — the score supports, not mandates, amputation.`
          : `MESS ${score}: below the amputation threshold of 7. In derivation cohorts, salvaged limbs averaged ~4. Continue urgent vascular/orthopedic evaluation; prolonged ischemia worsens salvage odds.`,
        riskLevel: high ? 'critical' : 'moderate',
        details: [
          { label: 'Ischemia component (after doubling)', value: `${isch}` },
          { label: 'Threshold', value: '≥7 → predicted amputation (100% accuracy in derivation cohorts)' },
        ],
        recommendations: [
          'Urgent orthopedic and vascular surgery consultation; transfer to a higher level of care if needed',
          'Restore perfusion emergently when salvage is attempted — ischemia time is critical',
          'Manage life-threatening cranial, thoracic, abdominal, and pelvic injuries before limb decisions',
        ],
        alerts: high ? ['MESS ≥7 — predicted need for amputation; urgent surgical decision required.'] : undefined,
      };
    },
    evidence: {
      summary:
        'MESS = skeletal/soft-tissue injury energy (1–4) + limb ischemia (1–3, doubled if >6 h) + shock (0–2) + age (0–2). Score ≥7 predicted amputation in retrospective (25 patients) and prospective (26 limbs) cohorts.',
      formula: 'Mechanism (1–4) + Ischemia (1–3; ×2 if >6 h) + Shock (0–2) + Age (0–2); range 3–12.',
      validation:
        'Retrospective derivation (Johansen 1990): salvaged limbs mean MESS 4.88 vs amputated 9.11; prospective two-center confirmation showed the same discrimination — MESS ≥7 was 100% predictive of amputation in those small cohorts. Later studies report lower positive predictive value; use as an adjunct, not a sole criterion.',
      references: [
        {
          title: 'Objective criteria accurately predict amputation following lower extremity trauma',
          citation: 'Johansen K et al. J Trauma. 1990;30(5):568-72',
          year: 1990,
          pmid: '2342140',
          doi: '10.1097/00005373-199005000-00007',
        },
        {
          title: 'Limb salvage versus amputation. Preliminary results of the Mangled Extremity Severity Score',
          citation: 'Helfet DL et al. Clin Orthop Relat Res. 1990;(256):80-6',
          year: 1990,
          pmid: '2194732',
        },
      ],
    },
    nextSteps: [
      { condition: 'MESS ≥7', actions: ['Multidisciplinary amputation-vs-salvage decision (trauma, ortho, vascular, patient/family)', 'Document ischemia time and neurovascular status', 'Do not delay hemorrhage control or life-saving care'] },
      { condition: 'MESS <7 with vascular compromise', actions: ['Urgent revascularization', 'Fasciotomy assessment; serial compartment checks', 'Reassess score as status evolves'] },
    ],
    pearls: [
      'Ischemia points double when ischemia exceeds 6 hours — document time of injury and arrival.',
      'MESS ≥7 was 100% predictive only in small 1990 cohorts; modern series show false positives — never use it alone to justify amputation.',
      'Gross contamination pushes the mechanism to "very high energy" (4 points).',
    ],
  },

  // ─── 4. Katz Index of Independence in ADL ──────────────────────────────────
  {
    id: 'katz-adl',
    name: 'Katz Index of Independence in Activities of Daily Living',
    shortName: 'Katz ADL',
    description:
      'Katz 1963 index of independence in six basic ADLs (bathing, dressing, toileting, transferring, continence, feeding). Score 6 = fully independent; lower scores indicate increasing care needs.',
    category: 'geriatrics',
    tags: ['katz', 'adl', 'functional status', 'geriatrics', 'disability', 'discharge planning'],
    whenToUse:
      'Quantifying basic functional status and care needs in older adults — baseline assessment, post-acute planning, and tracking change over time.',
    whyUse:
      'Simple, ordinal, and widely used: dependence in ADLs predicts care needs, institutionalization risk, and rehabilitation targets. Complements IADL and mobility assessments.',
    inputs: [
      selectInput('bathing', 'Bathing', [
        { label: 'Independent — bathes self completely or needs help with only one body part (e.g., back, disabled extremity)', value: 1, points: 1 },
        { label: 'Dependent — needs help bathing more than one part, getting in/out of tub, or does not bathe self', value: 0, points: 0 },
      ], 1, 'Sponge, shower, or tub bathing.'),
      selectInput('dressing', 'Dressing', [
        { label: 'Independent — retrieves clothes, dresses including fasteners and braces (tying shoes excluded)', value: 1, points: 1 },
        { label: 'Dependent — does not dress self or remains partially undressed', value: 0, points: 0 },
      ], 1, 'Includes outer garments, braces, and fasteners; tying shoes is excluded.'),
      selectInput('toileting', 'Toileting', [
        { label: 'Independent — gets to toilet, transfers on/off, arranges clothes, cleanses self (may use supports; may manage own bedpan at night only)', value: 1, points: 1 },
        { label: 'Dependent — uses bedpan/commode or needs help getting to or using the toilet', value: 0, points: 0 },
      ], 1, 'Transferring on/off the toilet plus hygiene afterward.'),
      selectInput('transferring', 'Transferring', [
        { label: 'Independent — moves in and out of bed and chair (mechanical supports allowed)', value: 1, points: 1 },
        { label: 'Dependent — needs help moving in/out of bed or chair, or does not transfer', value: 0, points: 0 },
      ], 0, 'Bed-to-chair transfers.'),
      selectInput('continence', 'Continence', [
        { label: 'Independent — complete control of urination and defecation', value: 1, points: 1 },
        { label: 'Dependent — partial/total incontinence, or needs enemas, catheters, or regulated urinals/bedpans', value: 0, points: 0 },
      ], 1, 'Bladder and bowel control.'),
      selectInput('feeding', 'Feeding', [
        { label: 'Independent — gets food from plate to mouth (pre-cut food and prep excluded)', value: 1, points: 1 },
        { label: 'Dependent — needs feeding assistance, does not eat, or is parenterally fed', value: 0, points: 0 },
      ], 1, 'Self-feeding once food is prepared and presented.'),
    ],
    calculate(values) {
      const score =
        num(values.bathing) + num(values.dressing) + num(values.toileting) +
        num(values.transferring) + num(values.continence) + num(values.feeding);
      const r = riskFromThresholds(score, [
        {
          max: 2,
          level: 'high',
          label: 'Severe functional impairment (0–2)',
          interpretation: `Katz Index ${score}/6: severe impairment — dependent in most basic ADLs. Substantial daily care needs; formal care planning and possible institutional-level support should be discussed.`,
        },
        {
          max: 5,
          level: 'moderate',
          label: 'Partial dependence (3–5)',
          interpretation: `Katz Index ${score}/6: moderate impairment. Targeted PT/OT, home safety evaluation, caregiver support, and discharge planning are appropriate.`,
        },
        {
          max: 6,
          level: 'normal',
          label: 'Fully independent (6)',
          interpretation: 'Katz Index 6/6: independent in all six basic ADLs. Consider IADL and mobility assessment to detect subtler deficits.',
        },
      ]);
      return {
        score,
        unit: '/6',
        label: r.label,
        interpretation: r.interpretation,
        riskLevel: r.riskLevel,
        details: [
          { label: 'Dependent functions', value: `${6 - score} of 6` },
          { label: 'Interpretation anchors', value: '6 = independent; 4 ≈ moderate impairment; ≤2 = severe impairment' },
        ],
        recommendations: [
          'Patients who refuse to perform a function are scored dependent in that function',
          'Trend over time to monitor rehabilitation response',
          'Complete the functional picture with IADLs (Lawton) and mobility/fall-risk assessment',
        ],
      };
    },
    evidence: {
      summary:
        'Six dichotomous ADL items — bathing, dressing, toileting, transferring, continence, feeding — each scored 1 (independent) or 0 (dependent); total 0–6. Katz described an ordinal hierarchy of dependence.',
      formula: 'Sum of 6 items (0–6); refusals count as dependent.',
      validation:
        'Introduced by Katz et al. (JAMA 1963) in studies of illness in the aged; widely validated for functional assessment, mortality prediction, and care planning in older adults.',
      references: [
        {
          title: 'Studies of illness in the aged. The index of ADL: a standardized measure of biological and psychosocial function',
          citation: 'Katz S et al. JAMA. 1963;185:914-9',
          year: 1963,
          pmid: '14044222',
          doi: '10.1001/jama.1963.03060120024016',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score ≤2', actions: ['Formal care-needs assessment', 'PT/OT evaluation', 'Caregiver support and respite planning', 'Consider home safety evaluation or facility-level care discussion'] },
      { condition: 'Score 3–5', actions: ['Targeted rehabilitation referral', 'Assistive devices and home modifications', 'Fall-prevention measures'] },
      { condition: 'Score 6', actions: ['Screen IADLs and mobility for subtler deficits', 'Reassess after illness, hospitalization, or functional change'] },
    ],
    pearls: [
      'Dependence typically develops in a predictable order (bathing first, feeding last) — the index is partly ordinal.',
      'A patient who refuses a function scores dependent even if physically capable.',
      'Different from the Barthel Index: Katz is dichotomous per item; Barthel gives weighted finer gradation.',
    ],
  },

  // ─── 5. LACE Index for Readmission ─────────────────────────────────────────
  {
    id: 'lace-index',
    name: 'LACE Index for Readmission',
    shortName: 'LACE',
    description:
      'van Walraven 2010 index predicting 30-day death or unplanned readmission after discharge to the community: Length of stay, Acuity of admission, Charlson comorbidity, ED visits.',
    category: 'general',
    tags: ['lace', 'readmission', 'discharge planning', 'charlson', '30-day'],
    whenToUse:
      'Adults (≥18) being discharged to the community from medical or surgical wards, to flag those who may benefit from intensified transitional care.',
    whyUse:
      'Four routinely available variables give a 0–19 score; expected 30-day death-or-readmission risk rises from ~2% (score 0) to ~44% (score 19), supporting targeted post-discharge interventions.',
    inputs: [
      selectInput('los', 'Length of stay (days)', [
        { label: '1', value: 1, points: 1 },
        { label: '2', value: 2, points: 2 },
        { label: '3', value: 3, points: 3 },
        { label: '4–6', value: 4, points: 4 },
        { label: '7–13', value: 5, points: 5 },
        { label: '≥14', value: 7, points: 7 },
      ], 4, 'Total inpatient days for the index admission.'),
      yesNo('acute', 'Acute (emergent) admission', 3, 'Admission through the ED/urgent rather than elective.', true),
      selectInput('cci', 'Charlson Comorbidity Index', [
        { label: '0 points', value: 0, points: 0 },
        { label: '1 point', value: 1, points: 1 },
        { label: '2 points', value: 2, points: 2 },
        { label: '3 points', value: 3, points: 3 },
        { label: '≥4 points', value: 5, points: 5 },
      ], 2, 'Charlson comorbidity score banded 0 / 1 / 2 / 3 / ≥4.'),
      selectInput('edVisits', 'ED visits within 6 months (excluding the visit for this admission)', [
        { label: '0', value: 0, points: 0 },
        { label: '1', value: 1, points: 1 },
        { label: '2', value: 2, points: 2 },
        { label: '3', value: 3, points: 3 },
        { label: '≥4', value: 4, points: 4 },
      ], 1, 'Number of emergency department visits in the 6 months before the index admission, not counting the visit that led to it.'),
    ],
    calculate(values) {
      const score = num(values.los) + (bool(values.acute) ? 3 : 0) + num(values.cci) + num(values.edVisits);
      const r = riskFromThresholds(score, [
        {
          max: 4,
          level: 'low',
          label: 'Lower expected 30-day risk',
          interpretation: `LACE ${score}/19: lower expected risk of death or unplanned readmission within 30 days (score 0 ≈ 2% expected risk in derivation). Standard discharge follow-up.`,
        },
        {
          max: 9,
          level: 'moderate',
          label: 'Intermediate expected 30-day risk',
          interpretation: `LACE ${score}/19: intermediate expected risk (roughly 5–12%). Consider structured discharge planning, medication reconciliation, and early follow-up.`,
        },
        {
          max: 14,
          level: 'high',
          label: 'High expected 30-day risk',
          interpretation: `LACE ${score}/19: high expected risk (roughly 12–30%). Strong candidate for transitional-care interventions — early follow-up, pharmacist review, home-health referral.`,
        },
        {
          max: 19,
          level: 'critical',
          label: 'Very high expected 30-day risk',
          interpretation: `LACE ${score}/19: expected risk approaching ~30–44% (score 19 ≈ 43.7% in derivation). Highest priority for readmission-reduction interventions.`,
        },
      ]);
      return {
        score,
        unit: '/19',
        label: r.label,
        interpretation: r.interpretation,
        riskLevel: r.riskLevel,
        details: [
          { label: 'Published anchors', value: 'Score 0 ≈ 2.0% expected risk; score 19 ≈ 43.7%' },
          { label: 'Components', value: `LOS ${num(values.los)} + acute ${bool(values.acute) ? 3 : 0} + CCI ${num(values.cci)} + ED visits ${num(values.edVisits)}` },
        ],
        recommendations: [
          'Use to target transitional-care resources — the score flags risk; interventions must address modifiable drivers',
          'Post-discharge medication reconciliation and adherence check, especially in heart failure',
        ],
      };
    },
    evidence: {
      summary:
        'L = length of stay (1/2/3/4–6/7–13/≥14 d → 1/2/3/4/5/7); A = acute admission (+3); C = Charlson comorbidity (0/1/2/3/≥4 → 0/1/2/3/5); E = ED visits in prior 6 months (0/1/2/3/≥4 → 0/1/2/3/4). Range 0–19.',
      formula: 'LACE = LOS points + 3×(acute) + CCI points + ED-visit points.',
      validation:
        'Derived and validated in a prospective cohort of 4,812 discharges (C-statistic 0.684) and externally in 1,000,000 Ontario discharges (van Walraven 2010). Mid-band expected risks are interpolated from published endpoints; exact per-score probabilities are in the source paper. Discrimination is modest — best used to target transitional care rather than to predict individuals.',
      references: [
        {
          title: 'Derivation and validation of an index to predict early death or unplanned readmission after discharge from hospital to the community',
          citation: 'van Walraven C et al. CMAJ. 2010;182(6):551-7',
          year: 2010,
          pmid: '20194559',
          doi: '10.1503/cmaj.091117',
        },
      ],
    },
    nextSteps: [
      { condition: 'LACE ≥10', actions: ['Schedule early post-discharge follow-up (within ~7 days)', 'Medication reconciliation and adherence review', 'Consider home-health or transitional-care referral'] },
      { condition: 'Any LACE', actions: ['Clear discharge instructions and teach-back', 'Address social drivers that could impede recovery'] },
    ],
    pearls: [
      'LACE predicts death OR readmission — it is not purely a readmission score.',
      'Emergency visits count only in the 6 months before, excluding the visit for the index admission.',
      'Modest discrimination (C≈0.68); best used to triage transitional-care intensity.',
    ],
  },

  // ─── 6. HOSPITAL Score for Readmissions ────────────────────────────────────
  {
    id: 'hospital-score',
    name: 'HOSPITAL Score for Readmissions',
    shortName: 'HOSPITAL',
    description:
      'Donzé 2013 score predicting 30-day potentially avoidable readmission in medical patients, computed before discharge from seven routine variables.',
    category: 'general',
    tags: ['hospital score', 'readmission', 'discharge planning', 'donze', '30-day', 'avoidable'],
    whenToUse:
      'Adults on medical services nearing discharge, to identify patients most likely to benefit from intensified transitional care and post-discharge support.',
    whyUse:
      'Validated internationally (C≈0.71–0.72) for potentially avoidable readmission; identifies a high-risk group (~18% avoidable-readmission risk in derivation) for targeted intervention.',
    inputs: [
      numberInput('hgb', 'Hemoglobin at discharge', { unit: 'g/dL', min: 4, max: 20, step: 0.1, exampleValue: 11.2, helpText: 'Last hemoglobin before discharge; <12 g/dL adds 1 point.' }),
      yesNo('oncology', 'Discharged from an oncology service', 2, 'Discharge from the oncology division/service.', false),
      numberInput('sodium', 'Sodium at discharge', { unit: 'mEq/L', min: 100, max: 170, exampleValue: 133, helpText: 'Last sodium before discharge; <135 mEq/L adds 1 point.' }),
      yesNo('procedure', 'Any procedure performed during the hospital stay', 1, 'Any ICD-coded procedure during the index admission.', true),
      selectInput('admissionType', 'Index admission type', [
        { label: 'Elective', value: 0, points: 0 },
        { label: 'Urgent or emergent', value: 1, points: 1 },
      ], 1, 'Urgent/emergent index admission adds 1 point.'),
      selectInput('priorAdmissions', 'Hospital admissions during the previous year', [
        { label: '0–1', value: 0, points: 0 },
        { label: '2–5', value: 2, points: 2 },
        { label: '>5', value: 5, points: 5 },
      ], 0, 'Count of hospital admissions in the last 12 months.'),
      selectInput('los', 'Length of stay', [
        { label: '<5 days', value: 0, points: 0 },
        { label: '≥5 days', value: 2, points: 2 },
      ], 0, 'Index-admission length of stay ≥5 days adds 2 points.'),
    ],
    calculate(values) {
      const score =
        (num(values.hgb, 12) < 12 ? 1 : 0) +
        (bool(values.oncology) ? 2 : 0) +
        (num(values.sodium, 135) < 135 ? 1 : 0) +
        (bool(values.procedure) ? 1 : 0) +
        num(values.admissionType) +
        num(values.priorAdmissions) +
        num(values.los);
      const r = riskFromThresholds(score, [
        {
          max: 4,
          level: 'low',
          label: 'Low risk of avoidable readmission (0–4)',
          interpretation: `HOSPITAL score ${score}: low-risk category (~5% potentially avoidable 30-day readmission risk in validation cohorts). Standard discharge planning.`,
        },
        {
          max: 6,
          level: 'moderate',
          label: 'Intermediate risk (5–6)',
          interpretation: `HOSPITAL score ${score}: intermediate-risk category (~10% avoidable-readmission risk). Consider enhanced transitional-care elements.`,
        },
        {
          max: 99,
          level: 'high',
          label: 'High risk of avoidable readmission (≥7)',
          interpretation: `HOSPITAL score ${score}: high-risk category (~18% potentially avoidable readmission in derivation). Highest yield for transitional-care interventions.`,
        },
      ]);
      return {
        score,
        unit: 'points',
        label: r.label,
        interpretation: r.interpretation,
        riskLevel: r.riskLevel,
        details: [
          { label: 'Risk categories (published)', value: '0–4 low; 5–6 intermediate; ≥7 high' },
          { label: 'Anemia / hyponatremia flags', value: `${num(values.hgb, 12) < 12 ? 'Hgb <12 (+1)' : 'Hgb ≥12'} / ${num(values.sodium, 135) < 135 ? 'Na <135 (+1)' : 'Na ≥135'}` },
        ],
        recommendations: [
          'High-risk patients: optimize medical conditions before discharge, case management, early follow-up or home health, thorough medication reconciliation, teach-back education',
          'Combine with clinical judgment — social determinants of health also drive readmission',
        ],
      };
    },
    evidence: {
      summary:
        'HOSPITAL = Hemoglobin <12 (+1), Oncology service (+2), Sodium <135 (+1), Procedure during stay (+1), Index admission urgent/emergent (+1), Admissions in prior year (0–1 → 0, 2–5 → +2, >5 → +5), LOS ≥5 d (+2). Range 0–13.',
      formula: 'Sum of 7 items; 0–4 low (~5%), 5–6 intermediate (~10%), ≥7 high (~18% avoidable readmission).',
      validation:
        'Derived/validated in 10,731 Boston medical discharges (Donzé 2013, C≈0.71, high-risk group 18% avoidable readmission) and externally validated in 117,065 discharges across 4 countries (Donzé 2016, C≈0.72, excellent calibration).',
      references: [
        {
          title: 'Potentially avoidable 30-day hospital readmissions in medical patients: derivation and validation of a prediction model',
          citation: 'Donzé J et al. JAMA Intern Med. 2013;173(8):632-8',
          year: 2013,
          pmid: '23529073',
          doi: '10.1001/jamainternmed.2013.3023',
        },
        {
          title: 'International validity of the HOSPITAL score to predict 30-day potentially avoidable hospital readmissions',
          citation: 'Donzé JD et al. JAMA Intern Med. 2016;176(4):496-502',
          year: 2016,
          pmid: '26954698',
          doi: '10.1001/jamainternmed.2015.8462',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score ≥7', actions: ['Transitional-care/case-management referral', 'Early outpatient follow-up or home health', 'Medication reconciliation and warning-sign education', 'Address anemia/hyponatremia before discharge where feasible'] },
      { condition: 'Score 5–6', actions: ['Enhanced discharge instructions', 'Early follow-up call/visit'] },
      { condition: 'Score ≤4', actions: ['Standard discharge process'] },
    ],
    pearls: [
      'Predicts potentially avoidable readmission (SQLape algorithm), not all readmissions.',
      'Uses only data available before discharge — designed for prospective flagging.',
      'A simplified variant (cancer dx instead of oncology service, no procedure item) performs similarly.',
    ],
  },

  // ─── 7. READMITS Score for Readmissions in Acute MI ────────────────────────
  {
    id: 'readmits-score',
    name: 'READMITS Score for Readmissions in Acute MI',
    shortName: 'READMITS',
    description:
      'Nguyen 2018 first-day risk score for 30-day all-cause readmission after acute MI (R renal function, E elevated BNP, A age, D diabetes, M nonmale sex, I timely PCI, T —, S systolic BP). Not externally validated.',
    category: 'cardiology',
    tags: ['readmits', 'readmission', 'acute mi', 'stemi', '30-day', 'nguyen'],
    whenToUse:
      'Within the first 24 hours of an acute MI admission (derived in a STEMI-predominant cohort) to flag patients at high 30-day readmission risk for early transitional-care interventions.',
    whyUse:
      'All seven predictors are available on hospital day 1, enabling early identification while readmission-reduction interventions are most effective. Caution: not externally validated.',
    inputs: [
      yesNo('renal', 'Serum creatinine >2 mg/dL (176.8 µmol/L) within first 24 h', 6, 'Any creatinine >2 mg/dL during the first hospital day.', false),
      yesNo('bnp', 'Elevated BNP or NT-proBNP within first 24 h', 8, 'BNP ≥50 pg/mL or NT-proBNP ≥125 pg/mL at any time in the first 24 hours.', true),
      numberInput('age', 'Age', { unit: 'years', min: 18, max: 110, exampleValue: 68, helpText: 'Contributes 1 point per decade above 18 years (published predictor: age per decade >18 y).' }),
      yesNo('dm', 'Diabetes mellitus history', 4, 'Documented history of diabetes mellitus.', true),
      selectInput('sex', 'Sex', [
        { label: 'Male', value: 0, points: 0 },
        { label: 'Female', value: 2, points: 2 },
      ], 2, 'Nonmale sex adds 2 points in the published score.'),
      selectInput('pci', 'Intervention with timely PCI (within first 24 h of presentation)', [
        { label: 'Yes — timely PCI performed', value: 0, points: 0 },
        { label: 'No — no timely PCI', value: 1, points: 1 },
      ], 0, 'Percutaneous coronary intervention within the first 24 hours of presenting to hospital.'),
      yesNo('sbp100', 'Systolic BP <100 mmHg within first 24 h', 3, 'Any SBP <100 mmHg during the first hospital day.', false),
    ],
    calculate(values) {
      const age = num(values.age, 60);
      const agePts = Math.max(0, Math.round((age - 18) / 10));
      const score =
        (bool(values.renal) ? 6 : 0) +
        (bool(values.bnp) ? 8 : 0) +
        agePts +
        (bool(values.dm) ? 4 : 0) +
        num(values.sex) +
        num(values.pci) +
        (bool(values.sbp100) ? 3 : 0);
      const r = riskFromThresholds(score, [
        {
          max: 13,
          level: 'low',
          label: 'Extremely low risk (≤13) — ~3% predicted',
          interpretation: `READMITS ${score}: bottom-quintile risk; ~2% observed / 3% predicted 30-day readmission in derivation.`,
        },
        {
          max: 15,
          level: 'low',
          label: 'Low risk (14–15) — ~7% predicted',
          interpretation: `READMITS ${score}: low-risk quintile; ~8% observed / 7% predicted 30-day readmission.`,
        },
        {
          max: 17,
          level: 'moderate',
          label: 'Moderate risk (16–17) — ~11% predicted',
          interpretation: `READMITS ${score}: moderate-risk quintile; ~9% observed / 11% predicted. ≥16 was used in one implementation as the threshold for expedited cardiology follow-up.`,
        },
        {
          max: 19,
          level: 'high',
          label: 'High risk (18–19) — ~16% predicted',
          interpretation: `READMITS ${score}: high-risk quintile; ~17% observed / 16% predicted. Targeted readmission-reduction interventions indicated.`,
        },
        {
          max: 99,
          level: 'critical',
          label: 'Extremely high risk (≥20) — ~35% predicted',
          interpretation: `READMITS ${score}: top quintile; ~34% observed / 35% predicted — about one in three patients readmitted within 30 days.`,
        },
      ]);
      return {
        score,
        unit: 'points',
        label: r.label,
        interpretation: r.interpretation,
        riskLevel: r.riskLevel,
        details: [
          { label: 'Age contribution', value: `${agePts} points (1 per decade >18 y)` },
          { label: 'Published quintiles', value: '≤13 ~3%; 14–15 ~7%; 16–17 ~11%; 18–19 ~16%; ≥20 ~35%' },
        ],
        recommendations: [
          'Not externally validated — use with caution and alongside clinical judgment',
          'Early coronary intervention (timely PCI) is itself a component — pursue guideline-directed AMI care',
          'High-risk patients: transition-of-care program, follow-up scheduled before discharge, early cardiology visit',
        ],
      };
    },
    evidence: {
      summary:
        'Seven first-day predictors: Cr >2 (+6), elevated BNP/NT-proBNP (+8), age 1 point per decade above 18 y, diabetes (+4), nonmale sex (+2), no timely PCI (+1), SBP <100 (+3). Quintile bands map to ~3/7/11/16/35% predicted risk.',
      formula: 'READMITS = 6·renal + 8·BNP + (age−18)/10 + 4·DM + 2·nonmale + 1·(no timely PCI) + 3·(SBP<100).',
      validation:
        'Derived and cross-validated in 826 AMI hospitalizations from 6 North Texas hospitals (Nguyen 2018): optimism-corrected C-statistic 0.73, well calibrated; outperformed multicondition readmission models. Not externally validated — flagged as such by the authors. Age points operationalized here as 1 point per decade above age 18, rounded to the nearest integer.',
      references: [
        {
          title: 'Predicting 30-day hospital readmissions in acute myocardial infarction: the AMI "READMITS" score',
          citation: 'Nguyen OK et al. J Am Heart Assoc. 2018;7(8):e008882',
          year: 2018,
          pmid: '29666065',
          doi: '10.1161/JAHA.118.008882',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score ≥16', actions: ['Expedited cardiology follow-up (one implementation used ≤7 days for ≥16)', 'Transition-of-care program enrollment', 'Ensure guideline-directed AMI therapy completed'] },
      { condition: 'Score ≤13', actions: ['Standard post-MI follow-up per local protocol'] },
    ],
    pearls: [
      'All items must come from the first 24 hours — the model is deliberately a first-day score.',
      'Elevated BNP (≥50) or NT-proBNP (≥125) is the largest single contributor (+8).',
      'A full-stay version adds IV diuretics, discharge anemia, and post-acute disposition — this tool is the first-day score only.',
    ],
  },

  // ─── 8. HINTS for Stroke in Acute Vestibular Syndrome ──────────────────────
  {
    id: 'hints-avs',
    name: 'HINTS for Stroke in Acute Vestibular Syndrome',
    shortName: 'HINTS',
    description:
      'Three-step bedside oculomotor battery (Head Impulse, Nystagmus, Test of Skew) for distinguishing central (stroke) from peripheral causes of acute vestibular syndrome — for trained examiners only.',
    category: 'neurology',
    tags: ['hints', 'vertigo', 'acute vestibular syndrome', 'stroke', 'head impulse', 'skew', 'nystagmus'],
    whenToUse:
      'Continuous, persistent acute vestibular syndrome (ongoing vertigo/dizziness with nystagmus, nausea, gait unsteadiness, head-motion intolerance) — only in patients who still have symptoms and only by clinicians trained in the technique. NOT for brief episodic dizziness or BPPV.',
    whyUse:
      'In trained hands, a "dangerous" HINTS pattern was 100% sensitive and 96% specific for stroke in the Kattah 2009 cohort — more sensitive than early MRI-DWI in the first 24–48 h.',
    inputs: [
      selectInput('hit', 'Horizontal head impulse test (h-HIT)', [
        { label: 'Abnormal (corrective saccade present — peripheral pattern)', value: 'abnormal' },
        { label: 'Normal / untestable (concerning — central pattern)', value: 'normal' },
      ], 'normal', 'A corrective saccade after rapid head turn indicates peripheral vestibular hypofunction. A NORMAL (negative) test in continuous AVS is a central warning sign.'),
      selectInput('nystagmus', 'Observed nystagmus', [
        { label: 'Direction-fixed horizontal nystagmus (peripheral pattern)', value: 'fixed' },
        { label: 'Direction-changing on eccentric gaze / vertical / untestable (central pattern)', value: 'changing' },
      ], 'changing', 'Direction-fixed unidirectional horizontal nystagmus fits a peripheral lesion; direction-changing, vertical, or purely torsional nystagmus suggests central.'),
      selectInput('skew', 'Test of skew (alternate cover test)', [
        { label: 'Absent skew deviation (peripheral pattern)', value: 'absent' },
        { label: 'Present / untestable skew deviation (central pattern)', value: 'present' },
      ], 'present', 'Vertical refixation on alternate cover testing indicates skew deviation — a brainstem sign.'),
    ],
    calculate(values) {
      const central: string[] = [];
      if (str(values.hit) === 'normal') central.push('normal h-HIT');
      if (str(values.nystagmus) === 'changing') central.push('direction-changing/untestable nystagmus');
      if (str(values.skew) === 'present') central.push('skew deviation present/untestable');
      const dangerous = central.length > 0;
      return {
        score: dangerous ? 'Dangerous' : 'Benign',
        unit: 'HINTS pattern',
        label: dangerous ? 'Dangerous HINTS — concerning for central lesion (stroke)' : 'Benign HINTS — consistent with peripheral lesion',
        interpretation: dangerous
          ? `Central-pattern finding(s): ${central.join('; ')}. In Kattah 2009, any one of normal h-HIT, direction-changing nystagmus, or skew deviation was 100% sensitive / 96% specific for stroke in AVS. Urgent stroke workup — MRI and vascular imaging — is warranted.`
          : 'All three findings follow a peripheral pattern (abnormal h-HIT, direction-fixed nystagmus, no skew) — consistent with vestibular neuritis or similar peripheral lesion. Caveat: AICA-territory strokes can mimic a benign pattern, especially with ipsilateral hearing loss; correlate with risk factors and full neurologic exam.',
        riskLevel: dangerous ? 'high' : 'low',
        details: [
          { label: 'Central-pattern findings', value: central.length ? central.join('; ') : 'None' },
          { label: 'Reported accuracy (Kattah 2009)', value: 'Any central sign: 100% sensitive, 96% specific for stroke' },
        ],
        recommendations: [
          'HINTS applies ONLY to continuous AVS with ongoing nystagmus — not episodic dizziness, positional vertigo, or patients who feel normal',
          'Only trained examiners should perform/interpret h-HIT — untrained use is dangerous',
          'Add hearing assessment ("HINTS+"): new unilateral hearing loss increases stroke concern (AICA)',
          'Do not skip neuroimaging on the basis of HINTS alone',
        ],
        alerts: dangerous ? ['Dangerous HINTS pattern — arrange urgent stroke workup (MRI, CTA/MRA) and neurology consultation.'] : undefined,
      };
    },
    evidence: {
      summary:
        'HINTS = horizontal Head Impulse test, Nystagmus pattern, Test of Skew. Any central-pattern result (normal h-HIT, direction-changing/vertical nystagmus, skew deviation) flags possible stroke; all three peripheral-pattern results suggest a peripheral lesion.',
      formula: 'Dangerous = normal h-HIT OR direction-changing nystagmus OR skew deviation (or untestable). Benign requires all three peripheral.',
      validation:
        'Prospective cross-sectional study of 101 high-risk AVS patients (Kattah 2009): central-pattern HINTS was 100% sensitive, 96% specific for stroke; early MRI-DWI was falsely negative in 12%. Newman-Toker 2013 confirmed HINTS outperformed ABCD2 for stroke screening in dizziness. Validated only in trained hands.',
      references: [
        {
          title: 'HINTS to diagnose stroke in the acute vestibular syndrome: three-step bedside oculomotor examination more sensitive than early MRI diffusion-weighted imaging',
          citation: 'Kattah JC et al. Stroke. 2009;40(11):3504-10',
          year: 2009,
          pmid: '19762709',
          doi: '10.1161/STROKEAHA.109.551234',
        },
        {
          title: 'HINTS outperforms ABCD2 to screen for stroke in acute continuous vertigo and dizziness',
          citation: 'Newman-Toker DE et al. Acad Emerg Med. 2013;20(10):986-96',
          year: 2013,
          pmid: '24127701',
          doi: '10.1111/acem.12223',
        },
      ],
    },
    nextSteps: [
      { condition: 'Dangerous HINTS', actions: ['Urgent MRI brain + vascular imaging (CTA/MRA)', 'Neurology/stroke consultation', 'Admit for monitoring and stroke workup'] },
      { condition: 'Benign HINTS with AICA-risk features (vascular risk factors, sudden onset, ipsilateral hearing loss)', actions: ['Still consider MRI — AICA strokes can produce a benign pattern', 'Neurology/neuro-otology consultation'] },
      { condition: 'Benign HINTS, typical vestibular neuritis', actions: ['Peripheral pathway: symptomatic care, early vestibular rehab', 'Avoid prolonged vestibular suppressants — they impede compensation'] },
    ],
    pearls: [
      'In continuous AVS, a NORMAL head-impulse test is the dangerous finding — counterintuitive.',
      'Skew deviation specifically suggests brainstem (often lateral pontine) lesions.',
      'Do not apply to BPPV, orthostatic dizziness, or resolved symptoms — misapplication causes false reassurance or alarm.',
    ],
  },

  // ─── 9. ASTRAL Score for Stroke ────────────────────────────────────────────
  {
    id: 'astral-score',
    name: 'ASTRAL Score for Stroke',
    shortName: 'ASTRAL',
    description:
      'Ntaios 2012 six-item admission score (Age, Severity/NIHSS, Time, Range of visual fields, Acute glucose, Level of consciousness) predicting 3-month unfavorable outcome (mRS >2) in acute ischemic stroke.',
    category: 'neurology',
    tags: ['astral', 'stroke', 'prognosis', 'nihss', 'outcome', 'ntaios'],
    whenToUse:
      'Patients with acute ischemic stroke admitted within 24 hours of onset, for early prognostic framing of 3-month functional outcome.',
    whyUse:
      'Six admission variables give a calibrated probability of unfavorable outcome (score ~31 ≈ 50%); validated in the Athens and Vienna registries and externally in the China National Stroke Registry.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 18, max: 110, exampleValue: 75, helpText: 'Contributes 1 point per 5 years of age.' }),
      numberInput('nihss', 'NIHSS on admission', { unit: 'points', min: 0, max: 42, exampleValue: 12, helpText: 'Admission NIH Stroke Scale score; contributes 1 point per NIHSS point.' }),
      yesNo('timeGt3h', 'Onset (or last seen well) to admission >3 hours', 2, 'Time from symptom onset — or last time seen without stroke symptoms when onset is unknown — to admission >3 h.', true),
      yesNo('vfd', 'Any new visual field defect', 2, 'Any visual field defect at admission (NIHSS item 3).', true),
      numberInput('glucose', 'Admission glucose', { unit: 'mg/dL', min: 20, max: 800, exampleValue: 150, helpText: '+1 if >131 mg/dL (7.3 mmol/L) or <66 mg/dL (3.7 mmol/L).' }),
      yesNo('loc', 'Impaired level of consciousness', 3, 'Any reduction in consciousness at admission (NIHSS item 1a >0).', false),
    ],
    calculate(values) {
      const age = num(values.age, 70);
      const nihss = num(values.nihss, 10);
      const glucose = num(values.glucose, 110);
      const glucPts = glucose > 131 || glucose < 66 ? 1 : 0;
      const score =
        Math.round(age / 5) +
        nihss +
        (bool(values.timeGt3h) ? 2 : 0) +
        (bool(values.vfd) ? 2 : 0) +
        glucPts +
        (bool(values.loc) ? 3 : 0);
      const r = riskFromThresholds(score, [
        {
          max: 24,
          level: 'low',
          label: 'Lower likelihood of unfavorable outcome',
          interpretation: `ASTRAL ${score}: below the ~50%-likelihood anchor of 31 — more likely than not to reach mRS ≤2 at 3 months in the derivation model.`,
        },
        {
          max: 30,
          level: 'moderate',
          label: 'Intermediate likelihood of unfavorable outcome',
          interpretation: `ASTRAL ${score}: approaching the 50% unfavorable-outcome anchor (score 31). Prognosis is uncertain — use to frame, not finalize, goals-of-care discussions.`,
        },
        {
          max: 999,
          level: 'high',
          label: '≥50% likelihood of unfavorable outcome (score ≥31)',
          interpretation: `ASTRAL ${score}: at/above the published anchor of 31 ≈ 50% chance of mRS >2 at 3 months; risk rises further per point. Do not use to withhold reperfusion therapy.`,
        },
      ]);
      return {
        score,
        unit: 'points',
        label: r.label,
        interpretation: r.interpretation,
        riskLevel: r.riskLevel,
        details: [
          { label: 'Age points (per 5 y)', value: `${Math.round(age / 5)}` },
          { label: 'Glucose abnormal flag', value: glucPts ? `+1 (${glucose} mg/dL outside 66–131)` : `0 (${glucose} mg/dL in range)` },
          { label: 'Published anchor', value: 'Score 31 ≈ 50% likelihood of mRS >2 at 3 months' },
        ],
        recommendations: [
          'Adjunct to NIHSS, imaging, and clinical judgment — not a treatment-selection tool',
          'Acute stroke remains time-sensitive: evaluate for thrombolysis and thrombectomy regardless of score',
        ],
      };
    },
    evidence: {
      summary:
        'ASTRAL = age (1 pt/5 y) + NIHSS (1 pt/point) + onset-to-admission >3 h (+2) + visual field defect (+2) + admission glucose >7.3 or <3.7 mmol/L (+1) + reduced consciousness (+3).',
      formula: 'Score = age/5 + NIHSS + 2·(T>3h) + 2·VFD + 1·(glucose abnormal) + 3·(LOC impaired).',
      validation:
        'Derived in 1,645 ASTRAL-registry patients (AUC 0.85) and externally validated in Athens (AUC 0.937) and Vienna (AUC 0.771) cohorts, and in the China National Stroke Registry. A score of 31 indicates ~50% likelihood of unfavorable outcome (Ntaios 2012). Age contribution implemented as 1 point per 5 years, rounded.',
      references: [
        {
          title: 'An integer-based score to predict functional outcome in acute ischemic stroke: the ASTRAL score',
          citation: 'Ntaios G et al. Neurology. 2012;78(24):1916-22',
          year: 2012,
          doi: '10.1212/WNL.0b013e318259e221',
        },
        {
          title: 'External validation of the ASTRAL score to predict 3- and 12-month functional outcome in the China National Stroke Registry',
          citation: 'Stroke. 2013',
          year: 2013,
          doi: '10.1161/STROKEAHA.113.000993',
        },
      ],
    },
    nextSteps: [
      { condition: 'Any suspected ischemic stroke', actions: ['STAT noncontrast CT and CTA', 'Neurology consultation', 'Assess tPA and thrombectomy eligibility'] },
      { condition: 'ASTRAL ≥31', actions: ['Early realistic goals-of-care conversation', 'Intensive monitoring and complication prevention', 'Do not withhold reperfusion on score alone'] },
    ],
    pearls: [
      'Glucose counts if either high (>131 mg/dL) or low (<66 mg/dL) — dysglycemia in either direction worsens prognosis.',
      'Visual field defect and impaired LOC are taken from NIHSS items 3 and 1a.',
      'Designed for presentation within 24 h of onset; imaging adds little to its discrimination.',
    ],
  },

  // ─── 10. PLAN Score for Stroke ─────────────────────────────────────────────
  {
    id: 'plan-score',
    name: 'PLAN Score for Stroke',
    shortName: 'PLAN',
    description:
      'O’Donnell/Saposnik 2012 bedside rule (Preadmission comorbidities, Level of consciousness, Age, Neurologic deficits) predicting death and severe disability after acute ischemic stroke. Max 25.',
    category: 'neurology',
    tags: ['plan', 'stroke', 'mortality', 'disability', 'prognosis', 'saposnik'],
    whenToUse:
      'At admission for acute ischemic stroke to estimate 30-day and 1-year mortality and risk of death or severe dependence (mRS 5–6) at discharge — usable by nonspecialists.',
    whyUse:
      'All variables are available at the bedside without imaging or NIHSS training; the score predicted 30-day mortality (C≈0.87), death/severe dependence (C≈0.88), and 1-year mortality (C≈0.84) in the Canadian validation cohort.',
    inputs: [
      yesNo('dependence', 'Preadmission dependence', 1.5, 'Dependent in activities of daily living before the stroke.', false),
      yesNo('cancer', 'Cancer', 1.5, 'Active/documented cancer in the history (not a new diagnosis made this admission).', false),
      yesNo('chf', 'Congestive heart failure', 1, 'Pre-existing CHF history.', false),
      yesNo('af', 'Atrial fibrillation', 1, 'Known atrial fibrillation.', true),
      selectInput('loc', 'Level of consciousness', [
        { label: 'Normal', value: 0, points: 0 },
        { label: 'Reduced', value: 5, points: 5 },
      ], 0, 'Any reduction in level of consciousness adds 5 points — the largest single item.'),
      numberInput('age', 'Age', { unit: 'years', min: 18, max: 110, exampleValue: 78, helpText: 'Contributes 1 point per decade of age.' }),
      yesNo('armWeak', 'Arm weakness — significant or total', 2, 'Significant or complete arm weakness on exam.', true),
      yesNo('legWeak', 'Leg weakness — significant or total', 2, 'Significant or complete leg weakness on exam.', true),
      yesNo('neglectAphasia', 'Neglect or aphasia', 1, 'Aphasia or neglect on examination.', false),
    ],
    calculate(values) {
      const score =
        (bool(values.dependence) ? 1.5 : 0) +
        (bool(values.cancer) ? 1.5 : 0) +
        (bool(values.chf) ? 1 : 0) +
        (bool(values.af) ? 1 : 0) +
        num(values.loc) +
        round(num(values.age, 70) / 10, 1) +
        (bool(values.armWeak) ? 2 : 0) +
        (bool(values.legWeak) ? 2 : 0) +
        (bool(values.neglectAphasia) ? 1 : 0);
      const total = round(score, 1);
      const r = riskFromThresholds(total, [
        {
          max: 9.9,
          level: 'low',
          label: 'Lower predicted risk of death/severe disability',
          interpretation: `PLAN ${total}/25: lower-risk profile. Still requires standard acute stroke pathway evaluation.`,
        },
        {
          max: 14.9,
          level: 'moderate',
          label: 'Intermediate predicted risk',
          interpretation: `PLAN ${total}/25: intermediate risk of death or severe dependence. Framing prognosis with family should be cautious and serially reassessed.`,
        },
        {
          max: 25,
          level: 'high',
          label: 'High predicted risk of death/severe disability',
          interpretation: `PLAN ${total}/25: high risk for death or mRS 5–6 at discharge. Early goals-of-care discussion is appropriate; trajectory may still evolve over days.`,
        },
      ]);
      return {
        score: total,
        unit: '/25',
        label: r.label,
        interpretation: r.interpretation,
        riskLevel: r.riskLevel,
        details: [
          { label: 'Published performance (validation)', value: '30-day mortality C≈0.87; death/severe dependence C≈0.88; 1-year mortality C≈0.84' },
          { label: 'Components', value: `Comorbidities ${(bool(values.dependence) ? 1.5 : 0) + (bool(values.cancer) ? 1.5 : 0) + (bool(values.chf) ? 1 : 0) + (bool(values.af) ? 1 : 0)} + LOC ${num(values.loc)} + age ${round(num(values.age, 70) / 10, 1)} + deficits ${(bool(values.armWeak) ? 2 : 0) + (bool(values.legWeak) ? 2 : 0) + (bool(values.neglectAphasia) ? 1 : 0)}` },
        ],
        recommendations: [
          'Augment, do not replace, NIHSS, imaging, and clinical judgment',
          'Do not use the score to support or withhold reperfusion therapies',
          'Serial reassessment improves prognostic reliability',
        ],
      };
    },
    evidence: {
      summary:
        'PLAN = Preadmission comorbidities (dependence 1.5, cancer 1.5, CHF 1, AF 1) + Level of consciousness (reduced 5) + Age (1/decade) + Neurologic deficits (leg 2, arm 2, aphasia/neglect 1). Maximum 25.',
      formula: 'Sum of 9 weighted items; age contributes years/10.',
      validation:
        'Derived (n=4,943) and validated (n=4,904) in the Registry of the Canadian Stroke Network (O’Donnell 2012). Validation: 30-day mortality C 0.87, death or severe dependence at discharge C 0.88, 1-year mortality C 0.84, favorable outcome (mRS 0–2) C 0.80.',
      references: [
        {
          title: 'The PLAN score: a bedside prediction rule for death and severe disability following acute ischemic stroke',
          citation: 'O’Donnell MJ et al. Arch Intern Med. 2012;172(20):1548-56',
          year: 2012,
          pmid: '23147454',
          doi: '10.1001/2013.jamainternmed.30',
        },
      ],
    },
    nextSteps: [
      { condition: 'High PLAN score', actions: ['Early goals-of-care discussion', 'Stroke-unit care and complication prevention', 'Serial reassessment as trajectory evolves'] },
      { condition: 'Any PLAN score', actions: ['Standard acute stroke pathway: imaging, reperfusion eligibility, secondary prevention workup'] },
    ],
    pearls: [
      'Reduced level of consciousness is the single largest item (5 points).',
      'Preadmission dependence and cancer each carry 1.5 points — chronic burden matters as much as deficits.',
      'Designed for nonspecialist use at admission; age alone contributes up to 10 of the 25 points.',
    ],
  },

  // ─── 11. THRIVE Score for Stroke Outcome ───────────────────────────────────
  {
    id: 'thrive-score',
    name: 'THRIVE Score for Stroke Outcome',
    shortName: 'THRIVE',
    description:
      'Flint 2010 Totaled Health Risks In Vascular Events score (age, NIHSS, hypertension, diabetes, atrial fibrillation) predicting good outcome and mortality after acute ischemic stroke.',
    category: 'neurology',
    tags: ['thrive', 'stroke', 'outcome', 'endovascular', 'nihss', 'prognosis'],
    whenToUse:
      'Acute ischemic stroke — derived for endovascular-treated patients and validated in thrombolysis and general stroke cohorts — to frame 90-day good-outcome and mortality expectations.',
    whyUse:
      'Strongly predicts good outcome and mortality at 90 days: 0–2 → ~65% good outcome/~6% mortality; 3–5 → ~44%/~30%; 6–9 → ~11%/~56% (MERCI cohorts).',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 18, max: 110, exampleValue: 72, helpText: '<60 → 0; 60–79 → 1; ≥80 → 2 points.' }),
      numberInput('nihss', 'NIHSS on admission', { unit: 'points', min: 0, max: 42, exampleValue: 16, helpText: '≤10 → 0; 11–20 → 2; ≥21 → 4 points.' }),
      yesNo('htn', 'History of hypertension', 1, 'Chronic Disease Scale component.', true),
      yesNo('dm', 'History of diabetes mellitus', 1, 'Chronic Disease Scale component.', false),
      yesNo('af', 'History of atrial fibrillation', 1, 'Chronic Disease Scale component.', false),
      selectInput('lvo', 'Large vessel occlusion (LVO)', [
        { label: 'No or unknown', value: 'no' },
        { label: 'Yes', value: 'yes' },
      ], 'no', 'Documented intracranial LVO on vascular imaging. Contextual — it does not change the integer THRIVE score (the published score uses only age, NIHSS, and the Chronic Disease Scale) but matters for EVT triage.', false),
      selectInput('aspects', 'ASPECTS on initial CT', [
        { label: 'Unknown', value: 'unknown' },
        { label: '10', value: '10' },
        { label: '9', value: '9' },
        { label: '8', value: '8' },
        { label: '7', value: '7' },
        { label: '6', value: '6' },
        { label: '5', value: '5' },
        { label: '4', value: '4' },
        { label: '3', value: '3' },
        { label: '2', value: '2' },
        { label: '1', value: '1' },
        { label: '0', value: '0' },
      ], 'unknown', 'Alberta Stroke Program Early CT Score. Contextual — low ASPECTS (≤7) indicates early ischemic change and worsens prognosis beyond the integer score.', false),
    ],
    calculate(values) {
      const age = num(values.age, 65);
      const nihss = num(values.nihss, 15);
      const agePts = age < 60 ? 0 : age < 80 ? 1 : 2;
      const nihssPts = nihss <= 10 ? 0 : nihss <= 20 ? 2 : 4;
      const cdsPts = (bool(values.htn) ? 1 : 0) + (bool(values.dm) ? 1 : 0) + (bool(values.af) ? 1 : 0);
      const score = agePts + nihssPts + cdsPts;
      const lvo = str(values.lvo) === 'yes';
      const aspects = str(values.aspects, 'unknown');
      const aspectsNote = aspects !== 'unknown' && num(aspects, 10) <= 7
        ? ` ASPECTS ${aspects} (≤7) indicates early ischemic change — worsens expected prognosis.`
        : '';
      const lvoNote = lvo ? ' Documented LVO — evaluate for endovascular thrombectomy.' : '';
      const r = riskFromThresholds(score, [
        {
          max: 2,
          level: 'low',
          label: 'Low THRIVE (0–2) — favorable prognosis',
          interpretation: `THRIVE ${score}/9: in the MERCI/Multi-MERCI derivation, good outcome (mRS 0–2) occurred in ~65% and 90-day mortality ~6%.${lvoNote}${aspectsNote}`,
        },
        {
          max: 5,
          level: 'moderate',
          label: 'Moderate THRIVE (3–5)',
          interpretation: `THRIVE ${score}/9: derivation cohort good outcome ~44%, 90-day mortality ~30%.${lvoNote}${aspectsNote}`,
        },
        {
          max: 9,
          level: 'high',
          label: 'High THRIVE (6–9) — poor prognosis',
          interpretation: `THRIVE ${score}/9: derivation cohort good outcome only ~11%, 90-day mortality ~56%.${lvoNote}${aspectsNote}`,
        },
      ]);
      return {
        score,
        unit: '/9',
        label: r.label,
        interpretation: r.interpretation,
        riskLevel: r.riskLevel,
        details: [
          { label: 'Age points', value: `${agePts}` },
          { label: 'NIHSS points', value: `${nihssPts}` },
          { label: 'Chronic Disease Scale points', value: `${cdsPts}` },
          { label: 'LVO / ASPECTS', value: `${lvo ? 'LVO present' : 'No/unknown LVO'} / ${aspects === 'unknown' ? 'ASPECTS unknown' : `ASPECTS ${aspects}`} (contextual — not scored)` },
        ],
        recommendations: [
          'Not a treatment-selection tool — do not use to withhold thrombolysis or thrombectomy',
          'THRIVE-c (logistic model with continuous variables) gives patient-specific probability when a computer is available',
          'Documented LVO → emergent EVT evaluation regardless of score',
        ],
      };
    },
    evidence: {
      summary:
        'THRIVE = age (<60:0, 60–79:1, ≥80:2) + NIHSS (≤10:0, 11–20:2, ≥21:4) + Chronic Disease Scale (1 point each for HTN, DM, AF). Range 0–9.',
      formula: 'Score = age pts + NIHSS pts + (# of HTN/DM/AF).',
      validation:
        'Derived in MERCI/Multi-MERCI endovascular trials (Flint 2010) and validated in the Merci Registry, the NINDS tPA trial, VISTA, SWIFT/STAR, SITS-MOST, and the China National Stroke Registry. The thrivescore.org LVO and ASPECTS fields do not change the integer score (published THRIVE contains only age, NIHSS, CDS); they are captured here as clinical context — THRIVE-c is the continuous logistic extension.',
      references: [
        {
          title: 'Predicting long-term outcome after endovascular stroke treatment: the totaled health risks in vascular events score',
          citation: 'Flint AC et al. AJNR Am J Neuroradiol. 2010;31(7):1192-6',
          year: 2010,
          pmid: '20223889',
          doi: '10.3174/ajnr.A2050',
        },
        {
          title: 'Validation of the Totaled Health Risks In Vascular Events (THRIVE) score for outcome prediction in endovascular stroke treatment',
          citation: 'Flint AC et al. Int J Stroke. 2014;9(1):32-6',
          year: 2014,
          pmid: '22928705',
          doi: '10.1111/j.1747-4949.2012.00872.x',
        },
      ],
    },
    nextSteps: [
      { condition: 'LVO present', actions: ['Emergent thrombectomy evaluation', 'CTA/perfusion as locally indicated', 'Stroke code / neurointerventional consult'] },
      { condition: 'THRIVE 6–9', actions: ['Early realistic prognosis discussion', 'Aggressive secondary prevention and complication surveillance'] },
      { condition: 'THRIVE 0–2', actions: ['Standard reperfusion-eligibility assessment', 'Favorable expected trajectory'] },
    ],
    pearls: [
      'The Chronic Disease Scale is just the count of HTN, DM, and AF (0–3 points).',
      'THRIVE predicts outcome independent of recanalization status — it is a baseline-risk tool.',
      'ASPECTS ≤7 flags early infarction; it informs prognosis but is not part of the 0–9 integer score.',
    ],
  },

  // ─── 12. Canadian TIA Score ────────────────────────────────────────────────
  {
    id: 'canadian-tia-score',
    name: 'Canadian TIA Score',
    shortName: 'Canadian TIA',
    description:
      'Perry 2014/2021 score stratifying 7-day stroke (or carotid revascularization) risk after TIA in ED patients — outperformed ABCD2 and ABCD2i in prospective multicenter validation.',
    category: 'neurology',
    tags: ['canadian tia', 'tia', 'stroke risk', 'perry', '7-day', 'abcd2'],
    whenToUse:
      'Adults diagnosed with TIA in the emergency department to stratify risk of subsequent stroke within 7 days and guide disposition (outpatient vs expedited workup vs same-visit consult).',
    whyUse:
      'Thirteen variables spanning clinical findings and ED investigations; in prospective validation it stratified risk (low ≤0.5%, medium ~2.3%, high ~5.9%) more accurately than ABCD2 (AUC 0.70 vs 0.60).',
    inputs: [
      yesNo('firstTia', 'First TIA in lifetime', 2, 'First-ever TIA — no prior TIA episodes.', true),
      yesNo('symptoms10', 'Symptoms ≥10 minutes', 2, 'Duration of TIA symptoms ≥10 minutes.', true),
      yesNo('carotidStenosis', 'History of carotid stenosis', 2, 'Known carotid artery stenosis.', false),
      yesNo('antiplatelet', 'Already on antiplatelet therapy', 3, 'On an antiplatelet agent before this TIA.', false),
      yesNo('gait', 'History of gait disturbance', 1, 'Gait disturbance as part of the TIA history.', false),
      yesNo('weakness', 'History of unilateral weakness', 1, 'Unilateral weakness during the event.', true),
      yesNo('vertigo', 'History of vertigo', -3, 'Vertigo as a feature — subtracts 3 points (argues against impending stroke).', false),
      yesNo('dbp110', 'Initial triage diastolic BP ≥110 mmHg', 3, 'Diastolic blood pressure at initial triage ≥110 mmHg.', false),
      yesNo('dysarthriaAphasia', 'Dysarthria or aphasia (history or examination)', 1, 'Language disturbance by history or on exam.', true),
      yesNo('afEcg', 'Atrial fibrillation on ECG', 2, 'AF on the ED electrocardiogram.', false),
      yesNo('ctInfarct', 'Infarction (new or old) on CT', 1, 'Any infarct seen on initial CT head.', false),
      yesNo('platelets400', 'Platelet count ≥400 ×10⁹/L', 2, 'Thrombocytosis on initial labs.', false),
      yesNo('glucose15', 'Glucose ≥15 mmol/L (270 mg/dL)', 3, 'Marked hyperglycemia on initial labs.', false),
    ],
    calculate(values) {
      const score =
        (bool(values.firstTia) ? 2 : 0) +
        (bool(values.symptoms10) ? 2 : 0) +
        (bool(values.carotidStenosis) ? 2 : 0) +
        (bool(values.antiplatelet) ? 3 : 0) +
        (bool(values.gait) ? 1 : 0) +
        (bool(values.weakness) ? 1 : 0) +
        (bool(values.vertigo) ? -3 : 0) +
        (bool(values.dbp110) ? 3 : 0) +
        (bool(values.dysarthriaAphasia) ? 1 : 0) +
        (bool(values.afEcg) ? 2 : 0) +
        (bool(values.ctInfarct) ? 1 : 0) +
        (bool(values.platelets400) ? 2 : 0) +
        (bool(values.glucose15) ? 3 : 0);
      const r = riskFromThresholds(score, [
        {
          max: 3,
          level: 'low',
          label: 'Low risk (≤3) — ~≤0.5% 7-day risk',
          interpretation: `Canadian TIA Score ${score}: low stratum — ~0.5% or less risk of stroke/CEA/CAS within 7 days in prospective validation. Outpatient management with primary-care follow-up was the authors’ suggested pathway.`,
        },
        {
          max: 8,
          level: 'moderate',
          label: 'Medium risk (4–8) — ~2.3% 7-day risk',
          interpretation: `Canadian TIA Score ${score}: medium stratum — ~2.3% risk. Suggested pathway: investigations with follow-up within 2 days, including full TIA workup.`,
        },
        {
          max: 99,
          level: 'high',
          label: 'High risk (≥9) — ~5.9% 7-day risk',
          interpretation: `Canadian TIA Score ${score}: high stratum — ~5.9% risk. Suggested pathway: same-visit consultation and investigations.`,
        },
      ]);
      return {
        score,
        unit: 'points',
        label: r.label,
        interpretation: r.interpretation,
        riskLevel: r.riskLevel,
        details: [
          { label: 'Score range', value: '−3 to 19' },
          { label: 'Validation risk strata', value: 'Low ≤0.5%; medium 2.3%; high 5.9% (stroke/CEA/CAS within 7 d)' },
        ],
        recommendations: [
          'Start secondary prevention promptly — antiplatelet, statin, BP management per guidelines',
          'Carotid imaging for anterior-circulation events; echocardiogram and rhythm monitoring as indicated',
          'Use with clinical judgment and local TIA pathways',
        ],
      };
    },
    evidence: {
      summary:
        '13 variables: first TIA +2, symptoms ≥10 min +2, carotid stenosis +2, on antiplatelet +3, gait disturbance +1, unilateral weakness +1, vertigo −3, DBP ≥110 +3, dysarthria/aphasia +1, AF on ECG +2, infarction on CT +1, platelets ≥400 +2, glucose ≥15 mmol/L +3. Range −3 to 19.',
      formula: 'Sum of 13 weighted items; bands ≤3 low / 4–8 medium / ≥9 high.',
      validation:
        'Derived in 3,906 ED TIA patients across 8 Canadian EDs (Perry 2014, C-statistic 0.77) and prospectively validated in 7,607 patients at 13 EDs (Perry BMJ 2021): stratified 7-day stroke/revascularization risk as ≤0.5%/2.3%/5.9% with AUC 0.70 vs 0.60 (ABCD2) and 0.64 (ABCD2i).',
      references: [
        {
          title: 'A prospective cohort study of patients with transient ischemic attack to identify high-risk clinical characteristics',
          citation: 'Perry JJ et al. Stroke. 2014;45(1):92-7',
          year: 2014,
          doi: '10.1161/STROKEAHA.113.003085',
        },
        {
          title: 'Prospective validation of Canadian TIA Score and comparison with ABCD2 and ABCD2i for subsequent stroke risk after transient ischaemic attack: multicentre prospective cohort study',
          citation: 'Perry JJ et al. BMJ. 2021;372:n49',
          year: 2021,
          pmid: '33541890',
          doi: '10.1136/bmj.n49',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score ≤3', actions: ['Outpatient pathway with primary-care/TIA-clinic follow-up', 'Antiplatelet + statin per guidelines', 'Return precautions for recurrent symptoms'] },
      { condition: 'Score 4–8', actions: ['Investigations within 2 days: carotid imaging, ECG monitoring, labs', 'Expedited TIA clinic or neurology follow-up'] },
      { condition: 'Score ≥9', actions: ['Same-visit neurology consultation', 'Urgent imaging and etiologic workup', 'Consider admission or observation unit'] },
    ],
    pearls: [
      'Vertigo subtracts 3 points — it argues against impending stroke in this rule.',
      'Already being on an antiplatelet adds 3 points (TIA despite therapy = higher risk).',
      'Incorporates ED investigations (ECG, CT, platelets, glucose) — unlike ABCD2 it is not purely clinical.',
    ],
  },

  // ─── 13. Rapid Emergency Medicine Score (REMS) ─────────────────────────────
  {
    id: 'rems-score',
    name: 'Rapid Emergency Medicine Score (REMS)',
    shortName: 'REMS',
    description:
      'Olsson 2004 APACHE II–derived ED score (age, MAP, HR, RR, SpO₂, GCS) predicting in-hospital mortality in nonsurgical emergency patients.',
    category: 'emergency',
    tags: ['rems', 'triage', 'mortality', 'emergency', 'apache', 'vital signs'],
    whenToUse:
      'Nonsurgical adult patients presenting to the ED, to flag high in-hospital mortality risk early using only age and routine vitals plus GCS.',
    whyUse:
      'In the derivation cohort every patient with REMS <3 survived; mortality rises steeply above ~10. Useful triage/acuity adjunct needing no labs.',
    inputs: [
      selectInput('age', 'Age (years)', [
        { label: '<45', value: 0, points: 0 },
        { label: '45–54', value: 2, points: 2 },
        { label: '55–64', value: 3, points: 3 },
        { label: '65–74', value: 5, points: 5 },
        { label: '>74', value: 6, points: 6 },
      ], 3, 'Age band per the published score.'),
      selectInput('map', 'Mean arterial pressure (mmHg)', [
        { label: '>159', value: 4, points: 4 },
        { label: '130–159', value: 3, points: 3 },
        { label: '110–129', value: 2, points: 2 },
        { label: '70–109', value: 0, points: 0 },
        { label: '50–69', value: 2, points: 2 },
        { label: '≤49', value: 4, points: 4 },
      ], 0, 'MAP = DBP + (SBP − DBP)/3; use the earliest measured value.'),
      selectInput('hr', 'Heart rate (beats/min)', [
        { label: '>179', value: 4, points: 4 },
        { label: '140–179', value: 3, points: 3 },
        { label: '110–139', value: 2, points: 2 },
        { label: '70–109', value: 0, points: 0 },
        { label: '55–69', value: 2, points: 2 },
        { label: '40–54', value: 3, points: 3 },
        { label: '≤39', value: 4, points: 4 },
      ], 0, 'Earliest recorded heart rate.'),
      selectInput('rr', 'Respiratory rate (breaths/min)', [
        { label: '>49', value: 4, points: 4 },
        { label: '35–49', value: 3, points: 3 },
        { label: '25–34', value: 1, points: 1 },
        { label: '12–24', value: 0, points: 0 },
        { label: '10–11', value: 1, points: 1 },
        { label: '6–9', value: 2, points: 2 },
        { label: '≤5', value: 4, points: 4 },
      ], 0, 'Earliest recorded respiratory rate.'),
      selectInput('spo2', 'Peripheral oxygen saturation', [
        { label: '<75%', value: 4, points: 4 },
        { label: '75–85%', value: 3, points: 3 },
        { label: '86–89%', value: 1, points: 1 },
        { label: '>89%', value: 0, points: 0 },
      ], 0, 'Pulse-oximetry saturation.'),
      selectInput('gcs', 'Glasgow Coma Scale', [
        { label: '<5', value: 4, points: 4 },
        { label: '5–7', value: 3, points: 3 },
        { label: '8–10', value: 2, points: 2 },
        { label: '11–13', value: 1, points: 1 },
        { label: '>13', value: 0, points: 0 },
      ], 0, 'GCS at ED presentation.'),
    ],
    calculate(values) {
      const score =
        num(values.age) + num(values.map) + num(values.hr) +
        num(values.rr) + num(values.spo2) + num(values.gcs);
      const r = riskFromThresholds(score, [
        {
          max: 2,
          level: 'low',
          label: 'Low risk (REMS <3)',
          interpretation: `REMS ${score}: in the Olsson 2004 derivation cohort, all patients with REMS <3 survived. Routine-triage level risk.`,
        },
        {
          max: 10,
          level: 'moderate',
          label: 'Elevated risk (3–10) — may need aggressive treatment',
          interpretation: `REMS ${score}: above the low-risk threshold of 3 — consider closer monitoring and earlier escalation. Mortality rises steeply above 10.`,
        },
        {
          max: 26,
          level: 'high',
          label: 'High risk (REMS >10)',
          interpretation: `REMS ${score}: mortality increases rapidly above a score of 10 — consider aggressive treatment/escalation consistent with patient wishes and clinical judgment.`,
        },
      ]);
      return {
        score,
        unit: 'points',
        label: r.label,
        interpretation: r.interpretation,
        riskLevel: r.riskLevel,
        details: [
          { label: 'Published anchors', value: 'REMS <3 → all survived (derivation); mortality rises steeply >10' },
          { label: 'Components', value: `Age ${num(values.age)} + MAP ${num(values.map)} + HR ${num(values.hr)} + RR ${num(values.rr)} + SpO₂ ${num(values.spo2)} + GCS ${num(values.gcs)}` },
        ],
        recommendations: [
          'Adjunct to — not a substitute for — clinical judgment about escalation',
          'Serial REMS values track physiologic trajectory',
        ],
      };
    },
    evidence: {
      summary:
        'REMS = APACHE II–style banded points for age, MAP, heart rate, respiratory rate, oxygen saturation, and GCS. Range 0–26.',
      formula: 'Sum of six banded physiology items.',
      validation:
        'Derived/validated in nonsurgical ED patients in Sweden (Olsson 2004): REMS <3 carried ~0% observed mortality in the cohort; discrimination for in-hospital mortality was comparable to other APACHE II derivatives.',
      references: [
        {
          title: 'Rapid Emergency Medicine score: a new prognostic tool for in-hospital mortality in nonsurgical emergency department patients',
          citation: 'Olsson T et al. J Intern Med. 2004;255(5):579-87',
          year: 2004,
          pmid: '15078500',
        },
      ],
    },
    nextSteps: [
      { condition: 'REMS <3', actions: ['Routine triage pathway per clinical picture'] },
      { condition: 'REMS 3–10', actions: ['Closer monitoring and repeat vitals', 'Early escalation triggers per local protocol'] },
      { condition: 'REMS >10', actions: ['Consider ICU/step-up evaluation', 'Discuss goals of care for severely ill patients'] },
    ],
    pearls: [
      'Requires no labs — computable at triage with vitals and GCS.',
      'SpO₂ substitutes for the APACHE II oxygenation term, simplifying use outside the ICU.',
      'Very high or very low physiology both score points — the bands are bidirectional.',
    ],
  },

  // ─── 14. Preoperative Mortality Predictor (PMP) Score ──────────────────────
  {
    id: 'pmp-score',
    name: 'Preoperative Mortality Predictor (PMP) Score',
    shortName: 'PMP',
    description:
      'Vaid 2012 bedside score from ACS-NSQIP data predicting 30-day mortality in general surgery patients using only preoperative variables. Range −1 to 30.',
    category: 'surgery',
    tags: ['pmp', 'preoperative', 'mortality', 'nsqip', 'general surgery', 'risk'],
    whenToUse:
      'Adults undergoing general surgery (derived in open pancreas and open/laparoscopic colorectal, hernia, and gallbladder procedures) for preoperative mortality risk framing.',
    whyUse:
      'A 30-point bedside score needing no labs or imaging; correctly classified ~98.6% of patients and showed ~93% accuracy (ROC) for predicting death in NSQIP validation data.',
    inputs: [
      yesNo('inpatient', 'Inpatient status', 6, 'Admitted inpatient at time of surgery — the largest single contributor.', true),
      yesNo('sepsis', 'Sepsis', 4, 'Preoperative sepsis/septic shock.', false),
      yesNo('functional', 'Poor functional status', 3, 'Totally dependent — requires total assistance for all daily activities.', false),
      yesNo('cancer', 'Disseminated cancer', 1, 'Disseminated/metastatic cancer.', false),
      selectInput('ageBand', 'Age (years)', [
        { label: '<65', value: 0, points: 0 },
        { label: '65–69', value: 0.5, points: 0.5 },
        { label: '70–79', value: 1, points: 1 },
        { label: '≥80', value: 2, points: 2 },
      ], 2, 'Age band per the published score.'),
      yesNo('cardiac', 'Cardiac comorbidity', 5, 'Dyspnea with CHF history, prior MI or angina, peripheral artery disease, or hypertension requiring medication.', true),
      yesNo('pulmonary', 'Pulmonary comorbidity', 3, 'On ventilator, COPD history, or current pneumonia.', false),
      yesNo('renal', 'Renal comorbidity', 1, 'Dialysis or renal failure.', false),
      yesNo('liver', 'Liver comorbidity', 1, 'Ascites or esophageal varices.', false),
      yesNo('steroids', 'Steroids for chronic condition', 1, 'Chronic steroid use.', false),
      yesNo('weightLoss', 'Weight loss >10% body weight in last 6 months', 1, 'Involuntary >10% weight loss over 6 months.', false),
      yesNo('bleeding', 'Bleeding disorder', 1, 'Coagulopathy/bleeding disorder.', false),
      yesNo('dnr', 'DNR status', 1, 'Pre-existing do-not-resuscitate directive.', false),
      yesNo('obesity', 'Obesity', -1, 'Obesity subtracts 1 point (protective in the derivation data).', false),
    ],
    calculate(values) {
      const score =
        (bool(values.inpatient) ? 6 : 0) +
        (bool(values.sepsis) ? 4 : 0) +
        (bool(values.functional) ? 3 : 0) +
        (bool(values.cancer) ? 1 : 0) +
        num(values.ageBand) +
        (bool(values.cardiac) ? 5 : 0) +
        (bool(values.pulmonary) ? 3 : 0) +
        (bool(values.renal) ? 1 : 0) +
        (bool(values.liver) ? 1 : 0) +
        (bool(values.steroids) ? 1 : 0) +
        (bool(values.weightLoss) ? 1 : 0) +
        (bool(values.bleeding) ? 1 : 0) +
        (bool(values.dnr) ? 1 : 0) +
        (bool(values.obesity) ? -1 : 0);
      const r = riskFromThresholds(score, [
        {
          max: 5,
          level: 'low',
          label: 'Low predicted mortality (≤5)',
          interpretation: `PMP ${score}/30: the 0–5 score band carried <1% mortality in the derivation data. Standard perioperative pathway.`,
        },
        {
          max: 10,
          level: 'moderate',
          label: 'Intermediate predicted mortality (6–10)',
          interpretation: `PMP ${score}/30: mortality rises with each 5-point interval — intermediate band. Optimize modifiable contributors where feasible.`,
        },
        {
          max: 19,
          level: 'high',
          label: 'High predicted mortality (11–19)',
          interpretation: `PMP ${score}/30: substantially elevated predicted mortality — merits explicit perioperative risk discussion and optimization.`,
        },
        {
          max: 30,
          level: 'critical',
          label: 'Very high predicted mortality (≥20)',
          interpretation: `PMP ${score}/30: the 20–30 band carried ~73% mortality in derivation — careful risk-benefit discussion of surgery is essential.`,
        },
      ]);
      return {
        score,
        unit: '/30',
        label: r.label,
        interpretation: r.interpretation,
        riskLevel: r.riskLevel,
        details: [
          { label: 'Published anchors', value: '0–5 → <1% mortality; 20–30 → ~73% mortality (5-point intervals)' },
          { label: 'Score range', value: '−1 to 30' },
        ],
        recommendations: [
          'Use as a shared-decision aid — pair with procedure-specific risk and functional assessment',
          'Potentially useful for benchmarking/systems-quality comparison',
          'Derived only in general surgery — do not extrapolate to other specialties',
        ],
      };
    },
    evidence: {
      summary:
        'PMP = inpatient +6, sepsis +4, poor functional status +3, cardiac comorbidity +5, pulmonary comorbidity +3, disseminated cancer/renal/liver/steroids/weight loss/bleeding disorder/DNR +1 each, age (<65:0, 65–69:0.5, 70–79:1, ≥80:2), obesity −1. Range −1 to 30.',
      formula: 'Sum of weighted preoperative variables.',
      validation:
        'Derived from ACS-NSQIP 2005–2008 general surgery data and validated on 2009 data (Vaid 2012): correctly classified ~98.6% of cases, ROC accuracy ~93%, Spearman correlation with the NSQIP mortality predictor ~86.9%. Mortality rose monotonically across 5-point intervals.',
      references: [
        {
          title: 'Predicting risk of death in general surgery patients on the basis of preoperative variables using American College of Surgeons National Surgical Quality Improvement Program data',
          citation: 'Vaid S et al. Perm J. 2012;16(4):10-7',
          year: 2012,
          pmid: '23251111',
          doi: '10.7812/TPP/12-019',
        },
      ],
    },
    nextSteps: [
      { condition: 'PMP ≥20', actions: ['Formal risk-benefit discussion of surgery vs alternatives', 'Anesthesia and critical-care planning', 'Goals-of-care conversation before elective procedures'] },
      { condition: 'PMP 6–19', actions: ['Optimize sepsis, cardiac, pulmonary contributors preoperatively', 'Enhanced perioperative monitoring'] },
      { condition: 'PMP ≤5', actions: ['Standard perioperative pathway'] },
    ],
    pearls: [
      'Obesity subtracts a point — counterintuitive but derived from the NSQIP data.',
      'Inpatient status (+6) and cardiac comorbidity (+5) dominate the score.',
      'Bedside tool — no labs required; complements rather than replaces ASA class or procedure-specific models.',
    ],
  },
];
