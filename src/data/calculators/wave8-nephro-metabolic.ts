import type { Calculator } from '../../types/calculator';
import { num, bool, str, round, clamp, yesNo, selectInput, numberInput, riskFromThresholds } from '../../utils/helpers';

/** Truncated cubic-spline term: max(u, 0)^3 — used by the Gupta 2024 CP-AKI model. */
function p3(u: number): number {
  const v = Math.max(u, 0);
  return v * v * v;
}

/**
 * Wave 8 — nephrology + metabolic/lab-ratio fill-ins.
 * Sources verified against the primary literature (see each calculator's
 * evidence block). Note: spot-urine protein excretion estimation is already
 * covered by the existing 'pcr-protein-creatinine' (UPCR) calculator, so it
 * is intentionally omitted here.
 */
export const wave8NephroMetabolicCalcs: Calculator[] = [
  // ─── 1. International IgA Nephropathy Prediction Tool (Barbour 2019) ──────
  {
    id: 'iga-nephropathy-risk',
    name: 'International IgA Nephropathy Prediction Tool',
    shortName: 'IgAN Risk',
    description:
      'Barbour 2019 IIgAN-PT: predicts risk of a 50% decline in eGFR or ESKD at a chosen horizon after biopsy using clinical data, Oxford MEST scores, and optional race (with- and without-race Cox models).',
    category: 'nephrology',
    tags: ['iga', 'igan', 'nephropathy', 'mest', 'oxford', 'barbour', 'gfr', 'prognosis', 'glomerulonephritis'],
    whenToUse:
      'Adults with biopsy-proven IgA nephropathy at the time of biopsy (KDIGO-preferred risk stratification); requires MEST histology scores and clinical data from biopsy.',
    whyUse:
      'Best-validated tool for individual progression risk in IgAN (C-statistic ~0.81–0.82 in validation); recommended by KDIGO 2021 for risk stratification and treatment discussions.',
    inputs: [
      numberInput('age', 'Age at biopsy', { unit: 'years', min: 16, max: 100, exampleValue: 40, helpText: 'Age in years at the time of kidney biopsy; younger age independently raises predicted progression risk.' }),
      numberInput('egfr', 'eGFR at biopsy', { unit: 'mL/min/1.73 m²', min: 5, max: 150, exampleValue: 70, helpText: 'eGFR (CKD-EPI) at biopsy; enters the model as its square root — the strongest single predictor.' }),
      numberInput('map', 'Mean arterial pressure', { unit: 'mmHg', min: 60, max: 160, exampleValue: 95, helpText: 'MAP = DBP + (SBP − DBP)/3, measured around the time of biopsy.' }),
      numberInput('proteinuria', 'Urine protein', { unit: 'g/day', min: 0.05, max: 20, step: 0.05, exampleValue: 1.5, helpText: 'Proteinuria at biopsy in g/day (24-h collection or spot PCR estimate); enters as natural log and in interaction terms.' }),
      selectInput('mestM', 'MEST M score (mesangial hypercellularity)', [
        { label: 'M0', value: 0, description: '≤50% of glomeruli with >3 mesangial cells per mesangial area' },
        { label: 'M1', value: 1, description: '>50% of glomeruli with mesangial hypercellularity' },
      ], 0, 'Oxford M score: M1 = mesangial hypercellularity in more than half of glomeruli.'),
      selectInput('mestE', 'MEST E score (endocapillary hypercellularity)', [
        { label: 'E0', value: 0, description: 'Absent' },
        { label: 'E1', value: 1, description: 'Present in any glomerulus' },
      ], 0, 'Oxford E score: E1 = endocapillary hypercellularity present in any glomerulus.'),
      selectInput('mestS', 'MEST S score (segmental glomerulosclerosis)', [
        { label: 'S0', value: 0, description: 'Absent' },
        { label: 'S1', value: 1, description: 'Present in any glomerulus (includes podocyte hypertrophy/tip lesion per 2017 update)' },
      ], 0, 'Oxford S score: S1 = segmental sclerosis or adhesion present.'),
      selectInput('mestT', 'MEST T score (tubular atrophy/interstitial fibrosis)', [
        { label: 'T0', value: 0, description: '0–25% of cortical area' },
        { label: 'T1', value: 1, description: '26–50% of cortical area' },
        { label: 'T2', value: 2, description: '>50% of cortical area' },
      ], 0, 'Oxford T score: percentage of cortical area with tubular atrophy/interstitial fibrosis; T carries the largest histology weight.'),
      yesNo('rasb', 'Using RASB at or before biopsy', null, 'Renin–angiotensin system blockade (ACE inhibitor or ARB) in use at or prior to the time of biopsy.', true),
      yesNo('isx', 'Using immunosuppression at or before biopsy', null, 'Any immunosuppressive therapy at or prior to biopsy. Note: the model treats it as a covariate, not proof of benefit.', false),
      numberInput('months', 'Risk horizon after biopsy', { unit: 'months', min: 1, max: 240, exampleValue: 60, helpText: 'Time after biopsy at which to estimate risk; 60 months (5-year risk) is most common. The with-race model applies a different Chinese coefficient beyond 36 months.' }),
      selectInput('race', 'Race (optional)', [
        { label: 'White', value: 'white', description: 'Reference group in the with-race model' },
        { label: 'Chinese', value: 'chinese', description: 'Piecewise coefficient: −0.396 ≤36 months, +0.818 >36 months' },
        { label: 'Japanese', value: 'japanese', description: '+0.408' },
        { label: 'Other / prefer not to use', value: 'other', description: '−0.431' },
      ], undefined, 'Optional. If race is selected, the full model with race is used; if left blank, the published without-race model is used (designed for ethnicities outside the derivation cohorts).', false),
    ],
    calculate(values) {
      const age = num(values.age, 40);
      const egfr = Math.max(num(values.egfr, 70), 1);
      const map = num(values.map, 95);
      const prot = Math.max(num(values.proteinuria, 1), 0.01);
      const m1 = num(values.mestM) >= 1 ? 1 : 0;
      const e1 = num(values.mestE) >= 1 ? 1 : 0;
      const s1 = num(values.mestS) >= 1 ? 1 : 0;
      const tVal = num(values.mestT);
      const t1 = tVal === 1 ? 1 : 0;
      const t2 = tVal === 2 ? 1 : 0;
      const rasb = bool(values.rasb) ? 1 : 0;
      const isx = bool(values.isx) ? 1 : 0;
      const months = clamp(num(values.months, 60), 1, 240);
      const lnP = Math.log(prot);
      const x = (months + 0.1) / 100;
      const race = str(values.race, '');
      const useRace = race === 'white' || race === 'chinese' || race === 'japanese' || race === 'other';
      let lp: number;
      let s0: number;
      if (useRace) {
        let rc = 0;
        if (race === 'chinese') rc = months <= 36 ? -0.396 : 0.818;
        else if (race === 'japanese') rc = 0.408;
        else if (race === 'other') rc = -0.431;
        // Barbour 2019 full model WITH race (Chinese coefficient piecewise at 36 months)
        lp =
          -0.351 * (Math.sqrt(egfr) - 8.8) -
          0.0002 * (map - 97) -
          0.093 * (lnP - 0.09) +
          0.006 * (map * lnP - 8.73) +
          0.155 * m1 -
          0.131 * e1 +
          0.097 * s1 +
          0.607 * t1 +
          1.189 * t2 +
          0.109 * t1 * lnP -
          0.339 * t2 * lnP -
          0.016 * (age - 38) +
          rc +
          0.246 * rasb -
          0.225 * isx;
        s0 = 0.9964303 + 0.04392517 * Math.sqrt(x) - 0.1257002 * x;
      } else {
        // Barbour 2019 full model WITHOUT race
        lp =
          -0.320 * (Math.sqrt(egfr) - 8.8) +
          0.002 * (map - 97) -
          0.035 * (lnP - 0.09) +
          0.004 * (map * lnP - 8.73) +
          0.201 * m1 -
          0.035 * e1 +
          0.084 * s1 +
          0.700 * t1 +
          1.237 * t2 +
          0.101 * t1 * lnP -
          0.321 * t2 * lnP -
          0.017 * (age - 38) +
          0.118 * rasb +
          0.166 * rasb * lnP -
          0.266 * isx;
        s0 = 1.0003754 - 0.1131641 * x * x + 0.0964763 * x * x * Math.log(x);
      }
      const riskPct = round(clamp(1 - Math.pow(s0, Math.exp(clamp(lp, -20, 20))), 0, 1) * 100, 1);
      const r = riskFromThresholds(riskPct, [
        { max: 4.9, level: 'low', label: 'Lower predicted progression risk', interpretation: `${months}-month risk ~${riskPct}% of 50% eGFR decline or ESKD (${useRace ? 'with-race' : 'without-race'} model). Optimize supportive care: BP control, RASB, proteinuria reduction, salt intake, lifestyle; consider SGLT2 inhibitor per KDIGO.` },
        { max: 14.9, level: 'moderate', label: 'Intermediate predicted progression risk', interpretation: `${months}-month risk ~${riskPct}%. Optimize supportive care and reassess; discuss whether residual risk justifies additional therapy.` },
        { max: 29.9, level: 'high', label: 'Higher predicted progression risk', interpretation: `${months}-month risk ~${riskPct}%. High-risk — intensify proteinuria/BP control and discuss immunosuppression or trial eligibility after maximal supportive care.` },
        { max: 100, level: 'critical', label: 'Highest predicted progression risk', interpretation: `${months}-month risk ~${riskPct}%. Very high risk of progression — specialist discussion of immunosuppression/clinical trials and kidney-replacement planning.` },
      ]);
      return {
        score: riskPct,
        unit: '%',
        label: `${r.label} (${months}-month)`,
        interpretation: r.interpretation,
        riskLevel: r.riskLevel,
        details: [
          { label: 'Model used', value: useRace ? `Full model with race (${race})` : 'Full model without race' },
          { label: 'Linear predictor', value: String(round(lp, 3)) },
          { label: `Baseline survival S₀(${months} mo)`, value: String(round(s0, 4)) },
          { label: 'Outcome predicted', value: '50% eGFR decline or ESKD' },
        ],
        recommendations: [
          'All IgAN patients: optimize supportive care (BP, RASB, proteinuria <0.5–1 g/day target, salt restriction, smoking cessation); consider SGLT2i per KDIGO.',
          'Predicted risk informs — but does not determine — immunosuppression; weigh treatment toxicity and patient goals.',
        ],
      };
    },
    evidence: {
      summary:
        'IIgAN-PT (Barbour et al., JAMA Intern Med 2019) is a Cox model for the composite of 50% eGFR decline or ESKD, derived in 2,781 adults and externally validated in 1,146. Two full models: with race (White reference; Chinese piecewise at 36 months; Japanese; other) and without race. Risk(t) = 1 − S₀(t)^exp(LP); S₀(60 mo) = 0.95494 (with race) and 0.94176 (without race).',
      formula:
        'Risk(t) = 1 − S₀(t)^exp(LP). Without race: LP = −0.320(√eGFR−8.8) + 0.002(MAP−97) − 0.035(lnP−0.09) + 0.004(MAP·lnP−8.73) + 0.201M1 − 0.035E1 + 0.084S1 + 0.700T1 + 1.237T2 + 0.101T1·lnP − 0.321T2·lnP − 0.017(age−38) + 0.118RASB + 0.166RASB·lnP − 0.266ISx; S₀(t) = 1.0003754 − 0.1131641·x² + 0.0964763·x²·ln x, x=(t+0.1)/100. With race: coefficients as listed in code (Chinese −0.396 ≤36 mo / +0.818 >36 mo, Japanese +0.408, other −0.431); S₀(t) = 0.9964303 + 0.04392517·x^0.5 − 0.1257002·x.',
      validation:
        'Internally and externally validated by Barbour (C-stat 0.81–0.82); independently re-validated in Korean, French, Colombian, Thai, and Chinese cohorts. Race coefficients and S₀(t) verified against the original published formula tables (reproduced in the KRCP and NDT validation supplements). Risk bands shown here are pragmatic; the paper stratifies by LP centiles (<16th, 16–50th, 50–84th, >84th).',
      references: [
        { title: 'Evaluating a New International Risk-Prediction Tool in IgA Nephropathy', citation: 'Barbour SJ et al. JAMA Intern Med. 2019;179(7):942-952', year: 2019, pmid: '30980653', doi: '10.1001/jamainternmed.2019.0600' },
        { title: 'The Oxford classification of IgA nephropathy: rationale, clinicopathological correlations, and classification', citation: 'Working Group of the International IgA Nephropathy Network and the Renal Pathology Society. Kidney Int. 2009;76(5):534-545', year: 2009, pmid: '19571791', doi: '10.1038/ki.2009.243' },
      ],
    },
    nextSteps: [
      { condition: 'Any IgAN', actions: ['Maximize supportive care (RASB, BP, salt restriction)', 'Address proteinuria target', 'Re-estimate risk if clinical course changes'] },
      { condition: 'High/very-high predicted risk', actions: ['Discuss immunosuppression risks/benefits or clinical trials', 'Kidney replacement planning education', 'Confirm adherence to maximal supportive care first'] },
    ],
    pearls: [
      'Apply at the time of biopsy — the 2022 "post-biopsy" update is a different model for 1–2 years after biopsy.',
      'The with-race model uses a piecewise Chinese coefficient (risk flips sign after 36 months); leave race blank to use the without-race model for other ethnicities.',
      'eGFR enters as √eGFR and proteinuria as natural log — small lab errors near the tails matter less than large ones.',
      'RASB/immunosuppression are covariates reflecting treated patients in the derivation cohort — not a treatment-effect estimate.',
    ],
  },

  // ─── 2. CKD Prediction in HIV+ Patients (VHC score, Scherzer 2014) ────────
  {
    id: 'ckd-risk-hiv',
    name: 'CKD Prediction in HIV+ Patients (VA HIV CKD Score)',
    shortName: 'HIV CKD Risk',
    description:
      'Scherzer 2014 VA HIV CKD (VHC) score: predicts 5-year probability of incident CKD (eGFR <60) in HIV-positive adults, with separate risk estimates for tenofovir disoproxil fumarate (TDF) users and non-users.',
    category: 'infectious-disease',
    tags: ['hiv', 'ckd', 'tenofovir', 'tdf', 'scherzer', 'vhc', 'kidney', 'antiretroviral'],
    whenToUse:
      'HIV-positive adults starting or continuing antiretroviral therapy when weighing the renal safety of tenofovir (TDF) versus alternatives such as abacavir or TAF.',
    whyUse:
      'Quantifies absolute 5-year CKD risk with and without TDF so regimen selection can account for the patient\'s comorbidity burden; derived in >21,000 HIV-positive veterans (c = 0.73).',
    inputs: [
      selectInput('ageBand', 'Age', [
        { label: '19–39 years', value: 0, points: 0 },
        { label: '40–49 years', value: 2, points: 2 },
        { label: '50–59 years', value: 4, points: 4 },
        { label: '60–90 years', value: 6, points: 6 },
      ], 2, 'Age band at the time of risk assessment; the oldest band carries the largest single weight (+6).'),
      yesNo('glucose', 'Glucose >140 mg/dL (7.77 mmol/L)', 2, 'Plasma glucose above 140 mg/dL at assessment.', false),
      yesNo('sbp', 'Systolic BP >140 mmHg', 1, 'Systolic blood pressure above 140 mmHg at assessment.', true),
      yesNo('htn', 'Hypertension', 2, 'Documented hypertension diagnosis.', true),
      yesNo('tg', 'Triglycerides >200 mg/dL (>2.26 mmol/L)', 1, 'Fasting or non-fasting triglycerides above 200 mg/dL.', false),
      yesNo('proteinuria', 'Proteinuria', 2, 'Dipstick or quantified proteinuria at assessment.', false),
      yesNo('cd4', 'CD4⁺ count <200 cells/µL', 1, 'Current or nadir CD4⁺ below 200 cells/µL.', false),
      yesNo('tdf', 'Past or present tenofovir (TDF) use', null, 'Tenofovir disoproxil fumarate exposure classed as ever vs never. Applies to TDF, not tenofovir alafenamide (TAF).', false),
    ],
    calculate(values) {
      const score =
        num(values.ageBand) +
        (bool(values.glucose) ? 2 : 0) +
        (bool(values.sbp) ? 1 : 0) +
        (bool(values.htn) ? 2 : 0) +
        (bool(values.tg) ? 1 : 0) +
        (bool(values.proteinuria) ? 2 : 0) +
        (bool(values.cd4) ? 1 : 0);
      // Scherzer 2014 Supplemental Table 2 — observed 5-year CKD event rates (%)
      const tdfUser = [1.4, 2.2, 3.6, 5.3, 7.6, 8.6, 10.9, 13.1, 19.4, 21.4];
      const tdfNon = [0.5, 0.3, 1.5, 1.9, 2.7, 4.1, 5.1, 8.7, 11.0, 16.4];
      const idx = Math.min(Math.max(Math.round(score), 0), 9);
      const use = tdfUser[idx];
      const non = tdfNon[idx];
      const tdf = bool(values.tdf);
      const risk = tdf ? use : non;
      const nnh = risk !== undefined && use - non > 0 ? Math.round(100 / (use - non)) : null;
      const r = riskFromThresholds(score, [
        { max: 2, level: 'low', label: 'Low CKD risk', interpretation: `VHC score ${score}: 5-year CKD risk ≈${risk}%${tdf ? ' with' : ' without'} TDF (≈${use}% TDF user / ≈${non}% non-user at this score). TDF is a reasonable option at this score.` },
        { max: 5, level: 'moderate', label: 'Intermediate CKD risk', interpretation: `VHC score ${score}: 5-year CKD risk ≈${risk}%${tdf ? ' with' : ' without'} TDF (≈${use}% user / ≈${non}% non-user). Weigh TDF against alternatives and monitor renal function.` },
        { max: 8, level: 'high', label: 'High CKD risk', interpretation: `VHC score ${score}: 5-year CKD risk ≈${risk}%${tdf ? ' with' : ' without'} TDF (≈${use}% user / ≈${non}% non-user). Strongly consider a non-TDF regimen; intensify renal monitoring.` },
        { max: 15, level: 'critical', label: 'Very high CKD risk (≥9)', interpretation: `VHC score ${score}: 5-year CKD risk ≈${risk}%${tdf ? ' with' : ' without'} TDF (≈${use}% user / ≈${non}% non-user). TDF should generally be avoided (authors' ≥9-point threshold).` },
      ]);
      return {
        score,
        unit: 'points',
        label: r.label,
        interpretation: r.interpretation,
        riskLevel: r.riskLevel,
        details: [
          { label: '5-year CKD risk — TDF user', value: `≈${use}%` },
          { label: '5-year CKD risk — non-user', value: `≈${non}%` },
          { label: 'Absolute difference (TDF vs none)', value: `≈${round(use - non, 1)}%` },
          { label: 'Approx. number-needed-to-harm (5 y)', value: nnh !== null ? `≈${nnh}` : '—' },
        ],
        recommendations: [
          'Score ≥9: avoid TDF; choose abacavir/lamivudine or TAF-containing regimen.',
          'Monitor eGFR, urine protein, glucose, and BP regardless of regimen.',
        ],
      };
    },
    evidence: {
      summary:
        'VHC score (Scherzer et al., AIDS 2014): Cox-derived point score from 21,590 HIV-positive male VA patients (2,059 CKD events, median 6.3 y). Points: age 19–39 = 0, 40–49 = 2, 50–59 = 4, 60–90 = 6; glucose >140 +2; SBP >140 +1; hypertension +2; TG >200 +1; proteinuria +2; CD4 <200 +1 (range 0–15). Five-year CKD rates by score and TDF exposure come from the paper\'s Supplemental Table 2.',
      formula: 'Sum of weighted items (0–15); risk = published 5-year event-rate table for TDF ever vs never users',
      validation:
        'Good discrimination (c = 0.73) and calibration in derivation; risk table reproduces the published event rates (non-users 0.3–16.4%, users 1.4–21.4%; published NNH 108 → 20 from 0 to ≥9 points). Derived in male US veterans — not validated in women, children, or PrEP/HBV TDF use; the D:A:D score is the European alternative.',
      references: [
        { title: 'A chronic kidney disease risk score to determine tenofovir safety in a prospective cohort of HIV-positive male veterans', citation: 'Scherzer R et al. AIDS. 2014;28(9):1289-1295', year: 2014, pmid: '24922479', doi: '10.1097/QAD.0000000000000258' },
        { title: 'Development and Validation of a Risk Score for Chronic Kidney Disease in HIV Infection Using Prospective Cohort Data from the D:A:D Study', citation: 'Mocroft A et al. PLoS Med. 2015;12(3):e1001809', year: 2015, doi: '10.1371/journal.pmed.1001809' },
      ],
    },
    nextSteps: [
      { condition: 'Score 0–2', actions: ['TDF acceptable; routine renal monitoring per HIV guidelines'] },
      { condition: 'Score 3–8', actions: ['Discuss TDF vs TAF/abacavir', 'Address modifiable risk (BP, glucose, lipids)', 'Baseline and periodic eGFR + urinalysis'] },
      { condition: 'Score ≥9', actions: ['Avoid TDF', 'Choose non-TDF NRTI backbone', 'Nephrology review if CKD emerges'] },
    ],
    pearls: [
      'Outcome is incident CKD = eGFR <60 mL/min/1.73 m² within 5 years.',
      'The TDF hazard is an ever/never exposure comparison — duration ≥1 year carried higher NNH (as low as ~5–6 at high scores).',
      'Score was derived in male veterans with baseline eGFR ≥60; do not apply to existing CKD or to TAF.',
    ],
  },

  // ─── 3. Kinetic eGFR (Chen 2013) ─────────────────────────────────────────
  {
    id: 'kegfr',
    name: 'Kinetic Estimated Glomerular Filtration Rate (KeGFR)',
    shortName: 'KeGFR',
    description:
      'Chen 2013 kinetic eGFR: estimates GFR while serum creatinine is changing acutely, using a baseline creatinine with MDRD steady-state GFR plus two serial creatinines and the interval between them.',
    category: 'nephrology',
    tags: ['kegfr', 'kinetic', 'gfr', 'aki', 'creatinine', 'chen', 'renal'],
    whenToUse:
      'AKI or renal recovery when creatinine is changing rapidly and steady-state eGFR equations (CKD-EPI, MDRD, Cockcroft–Gault) are unreliable — e.g., drug dosing or severity assessment.',
    whyUse:
      'Standard eGFR equations assume steady state; the kinetic formula corrects for the rate of creatinine accumulation and tracks true GFR better during acute changes.',
    inputs: [
      selectInput('sex', 'Sex', [
        { label: 'Female', value: 'F' },
        { label: 'Male', value: 'M' },
      ], 'M', 'Used in the MDRD steady-state term (female ×0.742).'),
      numberInput('age', 'Age', { unit: 'years', min: 18, max: 110, exampleValue: 60, helpText: 'Age in years for the MDRD steady-state GFR term.' }),
      numberInput('crBase', 'Baseline creatinine', { unit: 'mg/dL', unitKind: 'creatinine', min: 0.2, max: 15, step: 0.05, exampleValue: 1.0, helpText: 'Any prior steady-state creatinine; its corresponding MDRD eGFR anchors the steady-state creatinine production rate.' }),
      numberInput('cr1', 'First creatinine (Cr₁)', { unit: 'mg/dL', unitKind: 'creatinine', min: 0.2, max: 20, step: 0.05, exampleValue: 1.2, helpText: 'Earlier of the two serial creatinines.' }),
      numberInput('cr2', 'Second creatinine (Cr₂)', { unit: 'mg/dL', unitKind: 'creatinine', min: 0.2, max: 20, step: 0.05, exampleValue: 1.8, helpText: 'Later of the two serial creatinines.' }),
      numberInput('hours', 'Time between Cr₁ and Cr₂', { unit: 'hours', min: 1, max: 720, exampleValue: 24, helpText: 'Interval between the two measurements in hours; the rate of rise drives the kinetic correction.' }),
      yesNo('black', 'Black race (optional MDRD factor)', null, 'Optional. If selected, applies the MDRD ×1.212 Black coefficient in the steady-state term; leave unanswered to omit the race factor.', false, false),
    ],
    calculate(values) {
      const sex = str(values.sex, 'F');
      const age = num(values.age, 60);
      const crb = Math.max(num(values.crBase, 1), 0.05);
      const cr1 = Math.max(num(values.cr1, 1), 0.05);
      const cr2 = Math.max(num(values.cr2, 1.5), 0.05);
      const dt = Math.max(num(values.hours, 24), 0.1);
      const raceFactor = bool(values.black) ? 1.212 : 1;
      // MDRD (175) steady-state eGFR from the baseline creatinine
      const ssEgfr = 175 * Math.pow(crb, -1.154) * Math.pow(age, -0.203) * (sex === 'F' ? 0.742 : 1) * raceFactor;
      const crMean = (cr1 + cr2) / 2;
      // MaxΔPCrPerDay = 1.5 mg/dL/day; multiplier clamped to 0–1
      const mult = clamp(1 - (24 * (cr2 - cr1)) / (dt * 1.5), 0, 1);
      const kegfr = round((crb * ssEgfr / crMean) * mult, 1);
      const direction = cr2 > cr1 ? 'rising' : cr2 < cr1 ? 'falling' : 'stable';
      const r = riskFromThresholds(kegfr, [
        { max: 14.9, level: 'critical', label: 'Severe reduction (KeGFR <15)', interpretation: `KeGFR ≈${kegfr} mL/min/1.73 m² (baseline MDRD eGFR ≈${round(ssEgfr, 1)}). Creatinine ${direction} → kinetic estimate suggests near-kidney-failure range; evaluate urgently for AKI cause and RRT indications.` },
        { max: 29.9, level: 'high', label: 'Marked reduction (15–29)', interpretation: `KeGFR ≈${kegfr} mL/min/1.73 m² (baseline ≈${round(ssEgfr, 1)}). KeGFR ~30 was ~90% specific for AKI in one small study (O'Sullivan 2017).` },
        { max: 59.9, level: 'moderate', label: 'Moderately reduced (30–59)', interpretation: `KeGFR ≈${kegfr} mL/min/1.73 m² (baseline ≈${round(ssEgfr, 1)}). Consistent with significant AKI-stage function during ${direction === 'stable' ? 'stable' : `${direction} creatinine`} interval.` },
        { max: 10000, level: 'low', label: 'Preserved (≥60)', interpretation: `KeGFR ≈${kegfr} mL/min/1.73 m² (baseline ≈${round(ssEgfr, 1)}). Kinetic estimate suggests preserved GFR over this interval.` },
      ]);
      return {
        score: kegfr,
        unit: 'mL/min/1.73 m²',
        label: r.label,
        interpretation: r.interpretation,
        riskLevel: r.riskLevel,
        details: [
          { label: 'Steady-state eGFR (MDRD, baseline Cr)', value: `≈${round(ssEgfr, 1)} mL/min/1.73 m²` },
          { label: 'Cr trajectory', value: `${cr1} → ${cr2} mg/dL over ${dt} h (${direction})` },
          { label: 'Kinetic multiplier', value: String(round(mult, 3)) },
          { label: 'Assumed max creatinine rise if anuric', value: '1.5 mg/dL/day' },
        ],
        recommendations: [
          'KeGFR is an estimate — measured GFR remains the gold standard when precision matters (e.g., narrow-therapeutic drug dosing).',
          'Not included in the KDIGO AKI definition; use alongside urine output and creatinine criteria.',
        ],
      };
    },
    evidence: {
      summary:
        'Chen 2013 KeGFR = (SS PCr × CrCl / mean PCr) × [1 − 24·ΔPCr/(Δt·MaxΔPCrPerDay)], derived from creatinine mass balance. This implementation uses the MDRD (175) equation for the steady-state term from the baseline creatinine and a fixed MaxΔPCrPerDay of 1.5 mg/dL/day; the correction multiplier is limited to 0–1.',
      formula: 'KeGFR = (Cr_baseline × eGFR_MDRD / Cr_mean) × clamp(1 − 24·(Cr₂−Cr₁)/(Δt_hours × 1.5), 0, 1)',
      validation:
        'Validated by O\'Sullivan 2017 (KeGFR ~30 mL/min was ~90% specific for AKI in a small retrospective ICU cohort) and subsequent small studies; more research needed — no large prospective validation. The 1.5 mg/dL/day maximum-rise assumption approximates an average adult; extremes of muscle mass may shift it.',
      references: [
        { title: 'Retooling the creatinine clearance equation to estimate kinetic GFR when the plasma creatinine is changing acutely', citation: 'Chen S. J Am Soc Nephrol. 2013;24(6):877-888', year: 2013, pmid: '23704286', doi: '10.1681/ASN.2012070653' },
        { title: 'The clinical utility of kinetic glomerular filtration rate', citation: "O'Sullivan ED, Doyle A. Clin Kidney J. 2017;10(2):202-208", year: 2017, pmid: '28396736', doi: '10.1093/ckj/sfw108' },
      ],
    },
    nextSteps: [
      { condition: 'Rising creatinine with low KeGFR', actions: ['Evaluate prerenal/intrinsic/postrenal AKI', 'Review nephrotoxins and hemodynamics', 'Adjust renally cleared drug dosing'] },
      { condition: 'Falling creatinine (recovery)', actions: ['Multiplier caps at 1 — interpret as steady-state equivalent', 'Continue monitoring for full recovery trajectory'] },
    ],
    pearls: [
      'Two creatinines closer together give a noisier rate estimate; ~12–24 h intervals are typical.',
      'Falling creatinine: the correction is capped at 1, so KeGFR ≈ steady-state clearance at the mean creatinine.',
      'The 1.5 mg/dL/day anuric-rise assumption is population-average — cachectic or very muscular patients differ.',
      'Baseline creatinine should reflect a true steady state, not an AKI-phase value.',
    ],
  },

  // ─── 4. Licurse Score for Renal Ultrasound ───────────────────────────────
  {
    id: 'licurse-score',
    name: 'Licurse Score for Renal Ultrasound',
    shortName: 'Licurse',
    description:
      'Licurse 2010 risk-stratification framework: predicts probability of hydronephrosis (and hydronephrosis requiring urologic intervention) on renal ultrasound in hospitalized adults with AKI.',
    category: 'nephrology',
    tags: ['licurse', 'hydronephrosis', 'renal ultrasound', 'aki', 'obstruction', 'rus'],
    whenToUse:
      'Hospitalized adults with new or worsening AKI when deciding whether a screening renal ultrasound is needed to exclude obstruction.',
    whyUse:
      'High negative predictive value (~97–99%) for hydronephrosis requiring intervention in the low-risk group — helps safely defer unnecessary renal ultrasounds.',
    inputs: [
      yesNo('hnHx', 'History of hydronephrosis', 4, 'Documented history of hydronephrosis in the medical record or any imaging evidence of HN in the 2 years before the current RUS. By itself places the patient in the high-risk group.', false),
      selectInput('race', 'Race', [
        { label: 'Black', value: 'black', points: 0 },
        { label: 'Non-Black', value: 'nonblack', points: 1 },
      ], 'nonblack', 'Non-Black race adds 1 point in the published model; included for fidelity — use cautiously and never as a substitute for clinical judgment.'),
      yesNo('uti', 'History of recurrent urinary tract infections', 1, 'Documented recurrent UTIs.', false),
      yesNo('obstructDx', 'Diagnosis consistent with possible obstruction', 1, 'e.g., benign prostatic hyperplasia, abdominal or pelvic cancer, neurogenic bladder, single functional kidney, or previous pelvic surgery.', false),
      yesNo('chf', 'History of congestive heart failure', null, 'CHF is a competing explanation for AKI: its ABSENCE adds 1 point (presence scores 0).', false),
      yesNo('prerenal', 'Sepsis, prerenal AKI, pressor use, or hypotension', null, 'An obvious prerenal/systemic cause is a competing explanation: its ABSENCE adds 1 point (presence scores 0).', true),
      yesNo('nephrotoxin', 'Exposure to nephrotoxic medications before AKI', null, 'Aspirin >81 mg/day, diuretic, ACE inhibitor, or IV vancomycin before the AKI: their ABSENCE adds 1 point (exposure scores 0).', false),
    ],
    calculate(values) {
      const score =
        (bool(values.hnHx) ? 4 : 0) +
        (str(values.race) === 'nonblack' ? 1 : 0) +
        (bool(values.uti) ? 1 : 0) +
        (bool(values.obstructDx) ? 1 : 0) +
        (bool(values.chf) ? 0 : 1) +
        (bool(values.prerenal) ? 0 : 1) +
        (bool(values.nephrotoxin) ? 0 : 1);
      const r = riskFromThresholds(score, [
        { max: 2, level: 'low', label: 'Low risk (≤2)', interpretation: `Licurse score ${score}: low-risk group — external validation found ~4.0% hydronephrosis and ~1.1% needing urologic intervention. RUS may reasonably be deferred if clinical suspicion is low; reassess if AKI persists.` },
        { max: 3, level: 'moderate', label: 'Medium risk (3)', interpretation: `Licurse score ${score}: medium risk — ~6.8% hydronephrosis on imaging in external validation (intervention rates were paradoxically low at this score). Weigh imaging against other clinical clues.` },
        { max: 10, level: 'high', label: 'High risk (≥4)', interpretation: `Licurse score ${score}: high-risk group — ~20.9% hydronephrosis and ~4.9% requiring stent/nephrostomy in external validation. Obtain renal ultrasound.` },
      ]);
      return {
        score,
        unit: 'points',
        label: r.label,
        interpretation: r.interpretation,
        riskLevel: r.riskLevel,
        details: [
          { label: 'Hydronephrosis prevalence (Ip 2016)', value: score <= 2 ? '≈4.0%' : score === 3 ? '≈6.8%' : '≈20.9%' },
          { label: 'HN needing intervention', value: score <= 2 ? '≈1.1%' : score === 3 ? '≈0.5%' : '≈4.9%' },
          { label: 'Automatic high-risk trigger', value: bool(values.hnHx) ? 'Yes — history of hydronephrosis' : 'No' },
        ],
        recommendations: [
          'Known renal abnormalities (horseshoe kidney, solitary kidney, renal transplant): image regardless of score.',
          'If obstruction is strongly suspected clinically, obtain imaging regardless of score.',
        ],
      };
    },
    evidence: {
      summary:
        'Licurse framework (Arch Intern Med 2010): seven items — history of hydronephrosis (carries the high-risk weight, shown here as 4 points), non-Black race, recurrent UTIs, obstruction-consistent diagnosis, and ABSENCE of CHF, prerenal AKI/sepsis/pressors/hypotension, or nephrotoxin exposure (1 point each). Bands: ≤2 low, 3 medium, ≥4 high.',
      formula: 'HN history (4) + non-Black (1) + recurrent UTI (1) + obstruction-consistent dx (1) + no CHF (1) + no prerenal/sepsis/pressors (1) + no nephrotoxin exposure (1)',
      validation:
        'Derived in 200 and validated in 797 Yale inpatients (low-risk HN 3.1%, HN requiring intervention 0.4%); externally validated by Ip et al. 2016 (778 patients: sensitivity 93.4% for HN, 91.3% for intervention) and in a BMJ Open 2021 cross-sectional analysis. A history of HN maps directly to the high-risk group in the published presentation; implemented here as +4 points with identical banding.',
      references: [
        { title: 'Renal ultrasonography in the evaluation of acute kidney injury: developing a risk stratification framework', citation: 'Licurse A et al. Arch Intern Med. 2010;170(21):1900-1907', year: 2010, pmid: '21098348', doi: '10.1001/archinternmed.2010.419' },
        { title: 'External validation of risk stratification strategy in the use of renal ultrasonography in the evaluation of acute kidney injury', citation: 'Ip IK et al. J Hosp Med. 2016;11(11):763-767', year: 2016, pmid: '27186959', doi: '10.1002/jhm.2598' },
      ],
    },
    nextSteps: [
      { condition: 'Score ≤2', actions: ['Consider deferring RUS', 'Work up prerenal/intrinsic causes', 'Reassess if AKI persists despite treatment'] },
      { condition: 'Score 3', actions: ['Weigh imaging vs clinical clues', 'Consider nephrology consultation'] },
      { condition: 'Score ≥4 or HN history', actions: ['Obtain renal ultrasound', 'Urology consult if obstruction confirmed', 'Plan decompression (catheter/stent/nephrostomy) as needed'] },
    ],
    pearls: [
      'The three "absence" items score +1 when the competing explanation is NOT present — answer "No" to add the point.',
      'Exclusions in the derivation (pregnancy, transplant, recent known HN) are not covered — image those patients.',
      'Best used to rule obstruction OUT; a low score does not exclude other serious renal pathology on ultrasound.',
      'Medium-vs-low paradox in intervention rates was seen in validation — wider validation is still needed.',
    ],
  },

  // ─── 5. Cisplatin-Associated AKI (CP-AKI) Risk ───────────────────────────
  {
    id: 'cp-aki',
    name: 'Cisplatin-Associated Acute Kidney Injury (CP-AKI) Risk Calculator',
    shortName: 'CP-AKI',
    description:
      'Gupta 2024 CP-AKI primary model: logistic model with restricted cubic splines estimating the risk of ≥2-fold creatinine rise or kidney replacement therapy within 14 days of a first IV cisplatin dose.',
    category: 'oncology',
    tags: ['cisplatin', 'aki', 'cp-aki', 'chemotherapy', 'nephrotoxicity', 'onconephrology', 'gupta'],
    whenToUse:
      'Before a first dose of IV cisplatin, using the most recent pre-cisplatin labs, to estimate individual risk of moderate–severe cisplatin-associated AKI.',
    whyUse:
      'Largest validated CP-AKI model (24,717 adults, six US cancer centers; C-statistic 0.75); higher predicted risk supports intensified hydration/monitoring and consideration of alternatives.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 18, max: 100, exampleValue: 60, helpText: 'Age in years; modeled with a restricted cubic spline.' }),
      yesNo('htn', 'History of hypertension', null, 'Documented hypertension adds +0.274 to the model logit.', true),
      yesNo('dm', 'History of diabetes mellitus', null, 'Documented diabetes adds +0.253 to the model logit.', false),
      numberInput('cisplatin', 'Cisplatin dose', { unit: 'mg', min: 10, max: 400, exampleValue: 100, helpText: 'Total planned IV cisplatin dose in mg for this administration (spline knots at 38–220 mg).' }),
      numberInput('scr', 'Baseline serum creatinine', { unit: 'mg/dL', unitKind: 'creatinine', min: 0.2, max: 6, step: 0.05, exampleValue: 1.0, helpText: 'Most recent creatinine before cisplatin; spline knots at 0.6–1.3 mg/dL.' }),
      numberInput('albumin', 'Serum albumin', { unit: 'g/dL', min: 1, max: 6, step: 0.1, exampleValue: 4.0, helpText: 'Use g/dL (g/L ÷ 10); lower albumin raises predicted CP-AKI risk.' }),
      numberInput('mg', 'Serum magnesium', { unit: 'mg/dL', unitKind: 'magnesium', min: 0.5, max: 4, step: 0.05, exampleValue: 2.0, helpText: 'mg/dL canonical (mEq/L selectable); normal ≈1.7–2.2 mg/dL — higher Mg is protective in the model.' }),
      numberInput('hgb', 'Hemoglobin', { unit: 'g/dL', min: 4, max: 20, step: 0.1, exampleValue: 13, helpText: 'Use g/dL (g/L ÷ 10); lower hemoglobin raises predicted risk.' }),
      numberInput('wbc', 'White blood cell count', { unit: '×10³/µL', min: 0.5, max: 50, step: 0.1, exampleValue: 7, helpText: 'WBC in ×10³ cells/µL (×10⁹/L); higher counts raise predicted risk.' }),
      numberInput('plt', 'Platelet count', { unit: '×10³/µL', min: 10, max: 1000, exampleValue: 250, helpText: 'Platelets in ×10³/µL (×10⁹/L); higher counts raise predicted risk.' }),
    ],
    calculate(values) {
      const age = num(values.age, 60);
      const htn = bool(values.htn) ? 1 : 0;
      const dm = bool(values.dm) ? 1 : 0;
      const cis = num(values.cisplatin, 100);
      const scr = Math.max(num(values.scr, 1), 0.1);
      const alb = num(values.albumin, 4);
      const mg = num(values.mg, 2);
      const hgb = num(values.hgb, 13);
      const wbc = num(values.wbc, 7);
      const plt = num(values.plt, 250);
      // Gupta 2024 BMJ primary model — exact published coefficients (restricted cubic splines)
      const x =
        -3.686659 +
        (0.04421425 * age +
          0.0000183485 * p3(age - 30) -
          0.0002163227 * p3(age - 51) +
          0.0004394909 * p3(age - 59) -
          0.0002907307 * p3(age - 66) +
          0.0000492141 * p3(age - 76)) -
        (0.2525115 * mg -
          5.801969 * p3(mg - 1.7) +
          29.89521 * p3(mg - 1.9456) -
          43.75054 * p3(mg - 2.1) +
          18.23788 * p3(mg - 2.2) +
          1.419414 * p3(mg - 2.432)) -
        (0.04471118 * hgb -
          0.009984642 * p3(hgb - 9.1) +
          0.07499566 * p3(hgb - 11.6) -
          0.1355953 * p3(hgb - 12.8) +
          0.08595369 * p3(hgb - 13.9) -
          0.01536942 * p3(hgb - 15.5)) +
        (0.01993736 * wbc -
          0.003237126 * p3(wbc - 3.8) +
          0.02176998 * p3(wbc - 5.8) -
          0.03178413 * p3(wbc - 7.1) +
          0.01411246 * p3(wbc - 8.8) -
          0.0008611787 * p3(wbc - 14.5)) -
        (0.4990617 * alb -
          0.02681548 * p3(alb - 3) +
          4.312953 * p3(alb - 3.8) -
          13.50495 * p3(alb - 4.1) +
          10.66724 * p3(alb - 4.3) -
          1.448432 * p3(alb - 4.7)) +
        (0.04708185 * cis -
          0.00001028397 * p3(cis - 38) +
          0.00002391644 * p3(cis - 65) -
          0.00001521614 * p3(cis - 90) +
          0.000002039042 * p3(cis - 150) -
          0.0000004553695 * p3(cis - 220)) +
        (0.00397566 * plt -
          0.0000005145004 * p3(plt - 137) +
          0.00000222745 * p3(plt - 210) -
          0.000002459005 * p3(plt - 255) +
          0.0000007631055 * p3(plt - 312) -
          0.00000001705063 * p3(plt - 488)) -
        (4.626802 * scr +
          94.00696 * p3(scr - 0.6) -
          187.9561 * p3(scr - 0.7) +
          232.7567 * p3(scr - 0.9) -
          153.7796 * p3(scr - 1.0) +
          14.97206 * p3(scr - 1.3)) +
        0.2739952 * htn +
        0.2528551 * dm;
      const risk = round((100 / (1 + Math.exp(-x))) * 10) / 10;
      const r = riskFromThresholds(risk, [
        { max: 1.9, level: 'low', label: 'Low CP-AKI risk', interpretation: `Estimated ${risk}% risk of moderate–severe cisplatin-associated AKI within 14 days. Standard hydration/monitoring protocols apply.` },
        { max: 4.9, level: 'moderate', label: 'Intermediate CP-AKI risk', interpretation: `Estimated ${risk}% risk (cohort mean ≈5%). Ensure guideline hydration and post-dose creatinine monitoring.` },
        { max: 14.9, level: 'high', label: 'High CP-AKI risk', interpretation: `Estimated ${risk}% risk. Consider intensified hydration, closer serial creatinine/electrolyte monitoring, magnesium repletion, and nephrotoxin review.` },
        { max: 100, level: 'critical', label: 'Very high CP-AKI risk', interpretation: `Estimated ${risk}% risk. Discuss alternative regimens or modified dosing with oncology; onconephrology input recommended.` },
      ]);
      return {
        score: risk,
        unit: '%',
        label: r.label,
        interpretation: r.interpretation,
        riskLevel: r.riskLevel,
        details: [
          { label: 'Model logit (x)', value: String(round(x, 3)) },
          { label: 'Outcome predicted', value: '≥2× creatinine or KRT within 14 days' },
          { label: 'Cohort reference incidence', value: '5.2% derivation / 3.3% validation' },
        ],
        recommendations: [
          'Use most recent pre-cisplatin labs; recalculate if labs or dose change between cycles.',
          'Hydration per institutional cisplatin protocol; avoid concurrent nephrotoxins; replete magnesium.',
        ],
      };
    },
    evidence: {
      summary:
        'CP-AKI primary model (Gupta et al., BMJ 2024): multivariable logistic regression with restricted cubic splines for age, serum creatinine, hemoglobin, WBC, albumin, magnesium, platelets, and cisplatin dose, plus hypertension and diabetes indicators. Derived in 11,766 and externally validated in 12,951 adults receiving first-dose IV cisplatin.',
      formula: 'Risk % = 100/(1+e^−x); x = −3.686659 + Σ spline terms (age, Mg, Hgb, WBC, Alb, cisplatin, Plt, SCr) + 0.274·HTN + 0.253·DM',
      validation:
        'C-statistic 0.75 in both cohorts; monotonic risk across simple-score categories (highest vs lowest OR 24.0 derivation, 17.9 validation). Formula coefficients reproduced exactly from the published model (also implemented verbatim in an online tool published by the study authors). Cohort was US academic cancer centers only.',
      references: [
        { title: 'Derivation and external validation of a simple risk score for predicting severe acute kidney injury after intravenous cisplatin: cohort study', citation: 'Gupta S et al. BMJ. 2024;384:e077169', year: 2024, pmid: '38538012', doi: '10.1136/bmj-2023-077169' },
      ],
    },
    nextSteps: [
      { condition: 'Any risk level', actions: ['Guideline cisplatin hydration', 'Serial creatinine and electrolytes (incl. Mg) post-dose', 'Avoid additive nephrotoxins'] },
      { condition: 'High or very-high risk', actions: ['Oncology discussion of alternatives/dose modification', 'Onconephrology consult', 'Intensified monitoring schedule'] },
    ],
    pearls: [
      'Outcome is moderate–severe AKI (≥2× creatinine or KRT within 14 days) — not KDIGO stage 1.',
      'Higher magnesium is protective in the model — hypomagnesemia amplifies risk.',
      'A simple point-based version also exists; this tool implements the primary spline model.',
      'First-dose model — for subsequent cycles, reassess with updated labs and cumulative exposure.',
    ],
  },

  // ─── 6. BUN/Creatinine Ratio ─────────────────────────────────────────────
  {
    id: 'bun-creatinine-ratio',
    name: 'BUN/Creatinine Ratio',
    shortName: 'BUN:Cr',
    description:
      'Computes the blood urea nitrogen to serum creatinine ratio; values above ~20:1 (mg/dL units) suggest a prerenal pattern, while lower values suggest intrinsic renal or low-urea states.',
    category: 'general',
    tags: ['bun', 'creatinine', 'ratio', 'prerenal', 'azotemia', 'aki', 'urea'],
    whenToUse: 'Adjunct in the AKI/azotemia workup to help distinguish prerenal physiology from intrinsic renal disease.',
    whyUse:
      'Urea is reabsorbed with sodium and water in prerenal states while creatinine is not, raising the ratio; it is a quick, ubiquitous adjunct (though nonspecific) alongside FENa and urine indices.',
    inputs: [
      numberInput('bun', 'Blood urea nitrogen (BUN)', { unit: 'mg/dL', min: 1, max: 300, exampleValue: 40, helpText: 'BUN in mg/dL (urea mmol/L × 2.8 ≈ BUN mg/dL). Interpretation bands assume mg/dL units.' }),
      numberInput('scr', 'Serum creatinine', { unit: 'mg/dL', unitKind: 'creatinine', min: 0.2, max: 20, step: 0.05, exampleValue: 1.5, helpText: 'Serum creatinine; the ratio is reported in conventional (mg/dL) units.' }),
    ],
    calculate(values) {
      const bun = num(values.bun, 40);
      const scr = Math.max(num(values.scr, 1.5), 0.05);
      const ratio = round(bun / scr, 1);
      const r = riskFromThresholds(ratio, [
        { max: 9.9, level: 'low', label: 'Low ratio (<10)', interpretation: `BUN:Cr ${ratio}:1 — low ratio. Suggests intrinsic renal disease pattern, low urea generation (low protein intake, liver disease), or states of high creatinine production.` },
        { max: 20, level: 'normal', label: 'Normal (10–20)', interpretation: `BUN:Cr ${ratio}:1 — within the usual 10–20:1 reference band; does not discriminate prerenal from intrinsic causes.` },
        { max: 10000, level: 'moderate', label: 'Elevated (>20)', interpretation: `BUN:Cr ${ratio}:1 — prerenal pattern (volume depletion, heart failure, reduced perfusion). Also raised by GI bleeding, catabolic states, steroids, and high protein intake.` },
      ]);
      return {
        score: ratio,
        unit: ':1',
        label: r.label,
        interpretation: r.interpretation,
        riskLevel: r.riskLevel,
        details: [
          { label: 'BUN', value: `${bun} mg/dL` },
          { label: 'Creatinine', value: `${scr} mg/dL` },
          { label: 'Usual reference', value: '10–20:1 (mg/dL units)' },
        ],
        recommendations: [
          'Combine with FENa/urine indices, exam, and response to fluids — the ratio alone is nonspecific.',
          'Check for GI bleeding, steroid use, and catabolic contributors before attributing a high ratio to prerenal physiology.',
        ],
      };
    },
    evidence: {
      summary:
        'BUN:Cr = BUN (mg/dL) / creatinine (mg/dL). Conventional teaching: ~10–20 normal; >20 suggests prerenal azotemia (enhanced proximal urea reabsorption); <10 suggests intrinsic renal disease or low urea generation.',
      formula: 'BUN:Cr = BUN_mg/dL ÷ SCr_mg/dL',
      validation:
        'A physiologic heuristic rather than a validated score — sensitivity/specificity for prerenal AKI are modest. Confounders: GI bleed, steroids, catabolism, protein load, liver disease, malnutrition, pregnancy. Bands confirmed against StatPearls and standard nephrology references.',
      references: [
        { title: 'Azotemia', citation: 'Tyagi A, Aeddula NR. StatPearls. 2024', url: 'https://www.ncbi.nlm.nih.gov/books/NBK538145/' },
      ],
    },
    nextSteps: [
      { condition: 'Ratio >20 with volume depletion', actions: ['Volume assessment and cautious repletion', 'Recheck BUN/creatinine after intervention', 'Evaluate other causes if no response'] },
      { condition: 'Ratio >20 without volume depletion', actions: ['Screen for GI bleeding', 'Review steroids/catabolism/protein load'] },
      { condition: 'Ratio <10', actions: ['Consider intrinsic renal disease workup', 'Assess liver function and nutrition'] },
    ],
    pearls: [
      'Ratio is only meaningful in mg/dL units — SI urea (mmol/L) requires conversion first.',
      'Elderly and low-muscle patients can show a high ratio from a low creatinine denominator alone.',
      'BUN is influenced by non-renal processes — never use the ratio as the sole indicator of kidney health.',
    ],
  },

  // ─── 7. Stool Osmolar/Osmotic Gap ────────────────────────────────────────
  {
    id: 'stool-osmolar-gap',
    name: 'Stool Osmolar/Osmotic Gap',
    shortName: 'Stool Gap',
    description:
      'Estimates the fecal osmotic gap from stool sodium and potassium to help distinguish osmotic from secretory chronic diarrhea.',
    category: 'gastroenterology',
    tags: ['stool', 'osmolar', 'osmotic', 'gap', 'diarrhea', 'secretory', 'osmotic diarrhea'],
    whenToUse: 'Chronic diarrhea workup when stool electrolytes are available, to classify diarrhea as osmotic vs secretory.',
    whyUse:
      'A large gap (>125 mOsm/kg) indicates unmeasured osmotically active solutes (malabsorption, osmotic laxatives); a small gap (<50) supports secretory diarrhea — narrowing the differential.',
    inputs: [
      numberInput('stoolNa', 'Stool sodium', { unit: 'mEq/L', min: 0, max: 300, exampleValue: 30, helpText: 'Stool water sodium in mEq/L (mmol/L).' }),
      numberInput('stoolK', 'Stool potassium', { unit: 'mEq/L', min: 0, max: 300, exampleValue: 40, helpText: 'Stool water potassium in mEq/L (mmol/L).' }),
    ],
    calculate(values) {
      const na = num(values.stoolNa, 30);
      const k = num(values.stoolK, 40);
      const gap = round(290 - 2 * (na + k), 0);
      const r = riskFromThresholds(gap, [
        { max: 49, level: 'low', label: 'Low gap (<50) — secretory pattern', interpretation: `Stool osmotic gap ${gap} mOsm/kg — supports secretory diarrhea (e.g., bile-acid malabsorption, stimulant laxatives, endocrine, microscopic colitis, congenital transport defects, secretory tumors).` },
        { max: 124, level: 'moderate', label: 'Intermediate gap (50–125)', interpretation: `Stool osmotic gap ${gap} mOsm/kg — indeterminate/mixed; consider overlap disorders (infection, celiac, motility/functional disorders) and clinical context.` },
        { max: 10000, level: 'high', label: 'High gap (≥125) — osmotic pattern', interpretation: `Stool osmotic gap ${gap} mOsm/kg — supports osmotic diarrhea: carbohydrate malabsorption, osmotic laxatives (Mg, PEG, lactulose), sorbitol, short-gut; check for surreptitious laxative use.` },
      ]);
      return {
        score: gap,
        unit: 'mOsm/kg',
        label: r.label,
        interpretation: r.interpretation,
        riskLevel: r.riskLevel,
        details: [
          { label: 'Calculation', value: `290 − 2×(${na} + ${k}) = ${gap}` },
          { label: 'Reference osmolality', value: '290 mOsm/kg (assumed serum equivalence)' },
        ],
        recommendations: [
          'Osmotic pattern: stool pH, carbohydrate testing, laxative screen, breath tests for malabsorption.',
          'Secretory pattern: consider fecal calprotectin/leukocytes to separate inflammatory causes; endocrine workup as indicated.',
        ],
      };
    },
    evidence: {
      summary:
        'Fecal osmotic gap = 290 − 2×(Na + K), from Eherer & Fordtran (Gastroenterology 1992). Gap >125 mOsm/kg indicates unmeasured solutes (osmotic diarrhea); <50 supports secretory diarrhea. Measured stool osmolality is unreliable because bacterial fermentation continues ex vivo — the 290 reference is used instead.',
      formula: 'Stool osmotic gap = 290 − 2×(Na + K) mOsm/kg',
      validation:
        'Derived from Fordtran\'s experimental diarrhea studies; validated conceptually against comprehensive stool analysis literature. A simplified >50/<50 heuristic appears in some secondary tools — the classic Fordtran thresholds (>125 osmotic, <50 secretory, 50–125 indeterminate) are used here and flagged in validation.',
      references: [
        { title: 'Fecal osmotic gap and pH in experimental diarrhea of various causes', citation: 'Eherer AJ, Fordtran JS. Gastroenterology. 1992;103(2):545-551', year: 1992, pmid: '1634072', doi: '10.1016/0016-5085(92)90845-P' },
      ],
    },
    nextSteps: [
      { condition: 'Gap ≥125', actions: ['Dietary review (FODMAP, sorbitol, lactose)', 'Laxative/medication review', 'Malabsorption workup (celiac, pancreatic, SIBO)'] },
      { condition: 'Gap <50', actions: ['Fecal leukocytes/calprotectin for inflammation', 'Consider endocrine and bile-acid causes', 'Rule out infection first before antimotility agents'] },
    ],
    pearls: [
      'Do not rely on measured stool osmolality — it rises ex vivo from continued bacterial fermentation.',
      'Very dilute stool (contamination with water/urine) distorts electrolytes and the gap.',
      'Overlap disorders (infection, celiac, IBS) often sit in the 50–125 zone — interpret in context.',
    ],
  },

  // ─── 8. C-Peptide/Glucose Ratio ──────────────────────────────────────────
  {
    id: 'c-peptide-glucose-ratio',
    name: 'C-Peptide/Glucose Ratio (CGR)',
    shortName: 'CGR',
    description:
      'Assesses endogenous insulin secretory capacity: postprandial C-peptide/glucose ratio (Saisho) or fasting C-peptide/glucose ratio (Fritsche) to help differentiate diabetes types and guide insulin decisions.',
    category: 'endocrinology',
    tags: ['c-peptide', 'cgr', 'glucose', 'insulin', 'beta cell', 'diabetes', 'type 1', 'type 2'],
    whenToUse:
      'Patients with diabetes or prediabetes when assessing residual β-cell function — e.g., distinguishing type 1 vs type 2 diabetes or judging whether insulin therapy is needed.',
    whyUse:
      'C-peptide reflects endogenous insulin secretion even on insulin therapy; normalizing to ambient glucose improves on a raw C-peptide value for estimating secretory capacity.',
    inputs: [
      selectInput('state', 'Measurement state', [
        { label: 'Postprandial (~2 h after meal) — Saisho', value: 'post' },
        { label: 'Fasting (8–12 h) — Fritsche', value: 'fast' },
      ], 'post', 'Select the sampling condition: postprandial reflects maximal β-cell capacity; fasting is less variable and reflects basal secretion.'),
      numberInput('cpeptide', 'Serum C-peptide', { unit: 'ng/mL', min: 0.01, max: 30, step: 0.01, exampleValue: 2.0, helpText: 'C-peptide in ng/mL (pmol/L ÷ 331 ≈ ng/mL; nmol/L × 0.301 ≈ ng/mL).' }),
      numberInput('glucose', 'Plasma glucose', { unit: 'mg/dL', min: 20, max: 800, exampleValue: 150, helpText: 'Glucose at the same draw in mg/dL (mmol/L × 18 ≈ mg/dL).' }),
    ],
    calculate(values) {
      const state = str(values.state, 'post');
      const cpep = Math.max(num(values.cpeptide, 2), 0.01);
      const glu = Math.max(num(values.glucose, 150), 1);
      if (state === 'fast') {
        // Fritsche fasting CGR = C-peptide (pmol/L) / glucose (mg/dL); ng/mL × 331 = pmol/L
        const cgr = round((cpep * 331) / glu, 2);
        const r = riskFromThresholds(cgr, [
          { max: 1.99, level: 'high', label: 'Insulin secretion deficit (CGR <2)', interpretation: `Fasting CGR ${cgr}: insulin deficiency pattern — supports type 1 diabetes or insulin-requiring diabetes; insulin therapy is generally required.` },
          { max: 5, level: 'moderate', label: 'Impaired secretion (CGR 2–5)', interpretation: `Fasting CGR ${cgr}: impaired endogenous insulin secretion — basal insulin plus other agents may be appropriate per Fritsche.` },
          { max: 10000, level: 'low', label: 'Preserved secretion (CGR >5)', interpretation: `Fasting CGR ${cgr}: preserved endogenous insulin secretion — insulin is usually unnecessary; consistent with type 2 physiology.` },
        ]);
        return {
          score: cgr,
          unit: 'pmol/L per mg/dL',
          label: r.label,
          interpretation: r.interpretation,
          riskLevel: r.riskLevel,
          details: [
            { label: 'Formula', value: `(${cpep} ng/mL × 331) / ${glu} mg/dL` },
            { label: 'Model', value: 'Fasting CGR (Fritsche 2022/2023)' },
          ],
          recommendations: ['Interpret with islet autoantibodies and clinical picture — CGR is an adjunct, not a standalone classification.'],
        };
      }
      const cgr = round((cpep / glu) * 100, 2);
      const r = riskFromThresholds(cgr, [
        { max: 1.99, level: 'high', label: 'Loss of β-cell function (<2)', interpretation: `Postprandial CGR ${cgr} (×100): loss of β-cell functional reserve — supports insulin-deficient physiology (type 1 or advanced type 2).` },
        { max: 10000, level: 'low', label: 'Preserved β-cell function (≥2)', interpretation: `Postprandial CGR ${cgr} (×100): preserved β-cell function — more consistent with type 2 diabetes physiology.` },
      ]);
      return {
        score: cgr,
        unit: '×100',
        label: r.label,
        interpretation: r.interpretation,
        riskLevel: r.riskLevel,
        details: [
          { label: 'Formula', value: `(${cpep} ng/mL / ${glu} mg/dL) × 100` },
          { label: 'Model', value: 'Postprandial CGR (Saisho 2016)' },
        ],
        recommendations: ['Insulin deficiency supports type 1 diabetes, but long-standing/severe type 2 diabetes can also reach β-cell failure.'],
      };
    },
    evidence: {
      summary:
        'Postprandial CGR = C-peptide (ng/mL)/glucose (mg/dL) × 100 (Saisho; ~2 cutoff for β-cell reserve). Fasting CGR = C-peptide (pmol/L)/glucose (mg/dL) (Fritsche; <2 deficiency, 2–5 impaired, >5 preserved).',
      formula: 'Postprandial CGR = (CPR_ng/mL / PG_mg/dL) × 100; Fasting CGR = CPR_pmol/L / PG_mg/dL',
      validation:
        'Saisho\'s postprandial CGR predicts subsequent insulin requirement in T2D; Fritsche\'s fasting CGR discriminates insulin deficiency vs hypersecretion for treatment selection. A 2016 head-to-head study found CGR did not outperform fasting C-peptide alone for T1D vs T2D classification — interpret as an adjunct. Not valid in CKD (eGFR <60) because C-peptide is renally cleared.',
      references: [
        { title: 'Postprandial C-Peptide to Glucose Ratio as a Marker of β Cell Function: Implication for the Management of Type 2 Diabetes', citation: 'Saisho Y. Int J Mol Sci. 2016;17(5):744', year: 2016, pmid: '27196896', doi: '10.3390/ijms17050744' },
        { title: 'Considering Insulin Secretory Capacity as Measured by a Fasting C-Peptide/Glucose Ratio in Selecting Glucose-Lowering Medications', citation: 'Fritsche A et al. Exp Clin Endocrinol Diabetes. 2022;130(3):200-204', year: 2022, pmid: '32947641', doi: '10.1055/a-1242-9809' },
        { title: 'Insulin Secretion Capacity as a Crucial Feature to Distinguish Type 1 From Type 2 Diabetes and to Indicate the Need for Insulin Therapy', citation: 'Fritsche A. Exp Clin Endocrinol Diabetes. 2023;131(9):500-503', year: 2023, pmid: '37308105', doi: '10.1055/a-2016-8392' },
      ],
    },
    nextSteps: [
      { condition: 'Low CGR', actions: ['Assess islet autoantibodies if classification unclear', 'Start/continue insulin as indicated', 'Counsel on hypoglycemia and DKA risk'] },
      { condition: 'Preserved CGR', actions: ['Non-insulin agents may suffice', 'Reassess periodically — β-cell function declines over time'] },
    ],
    pearls: [
      'Avoid in CKD (eGFR <60): renal C-peptide clearance falls, falsely elevating the ratio.',
      'Postprandial (~2 h) values probe maximal β-cell capacity; fasting values are steadier basal measures.',
      'Assay variability between laboratories is non-trivial — trend within the same assay when possible.',
    ],
  },

  // ─── 9. Neutrophil–Lymphocyte Ratio (NLR) ────────────────────────────────
  {
    id: 'nlr',
    name: 'Neutrophil–Lymphocyte Ratio (NLR)',
    shortName: 'NLR',
    description:
      'Computes the ratio of neutrophils to lymphocytes from a CBC differential — a nonspecific marker of physiologic stress and systemic inflammation (Zahorec 2001).',
    category: 'general',
    tags: ['nlr', 'neutrophil', 'lymphocyte', 'inflammation', 'stress', 'cbc', 'sepsis'],
    whenToUse:
      'As an adjunct marker of physiologic stress/systemic inflammation — e.g., comparing apparently similar patients, prognostication, or trending illness trajectory.',
    whyUse:
      'In many studies NLR discriminates physiologic stress better than the raw WBC; it is free, instantaneous, and trendable from any CBC with differential.',
    inputs: [
      numberInput('neut', 'Neutrophils (absolute count or %)', { unit: 'cells/µL or %', min: 0, max: 100000, step: 0.01, exampleValue: 7.5, helpText: 'Absolute neutrophil count (×10³/µL) or differential percentage — either yields the same ratio as long as both inputs use the same basis.' }),
      numberInput('lymph', 'Lymphocytes (absolute count or %)', { unit: 'cells/µL or %', min: 0.01, max: 100000, step: 0.01, exampleValue: 2.0, helpText: 'Absolute lymphocyte count or differential percentage on the same basis as the neutrophil entry.' }),
    ],
    calculate(values) {
      const neut = num(values.neut, 7.5);
      const lymph = Math.max(num(values.lymph, 2), 0.01);
      const nlr = round(neut / lymph, 2);
      const r = riskFromThresholds(nlr, [
        { max: 3, level: 'normal', label: 'Normal (1–3)', interpretation: `NLR ${nlr} — within the typical normal range; little systemic stress signal.` },
        { max: 5.9, level: 'low', label: 'Borderline (~4–6)', interpretation: `NLR ${nlr} — upper-normal/borderline; may reflect mild stress — correlate with the clinical picture.` },
        { max: 8.9, level: 'moderate', label: 'Mild stress (6–8)', interpretation: `NLR ${nlr} — mild physiologic stress range (e.g., uncomplicated appendicitis in PulmCrit's framing).` },
        { max: 18, level: 'high', label: 'Moderate stress (9–18)', interpretation: `NLR ${nlr} — moderate physiologic stress; typical of critically ill patients.` },
        { max: 100000, level: 'critical', label: 'Severe stress (>18)', interpretation: `NLR ${nlr} — severe physiologic stress; seen in critical illness (can reach ~100).` },
      ]);
      return {
        score: nlr,
        unit: 'ratio',
        label: r.label,
        interpretation: r.interpretation,
        riskLevel: r.riskLevel,
        details: [
          { label: 'Inputs', value: `Neutrophils ${neut} / Lymphocytes ${lymph}` },
          { label: 'Bands', value: 'PulmCrit 2019 stress ranges' },
        ],
        recommendations: [
          'Interpret only in clinical context — NLR cannot distinguish stress etiologies (hemorrhagic vs septic shock, etc.).',
          'Trend over time for prognostication rather than relying on a single value.',
        ],
      };
    },
    evidence: {
      summary:
        'NLR = neutrophils/lymphocytes (absolute or % — same ratio). Proposed by Zahorec (Bratisl Lek Listy 2001) as a rapid stress/inflammation parameter in critical illness; PulmCrit 2019 informal bands: ~1–3 normal, 6–8 mild, 9–18 moderate, >18 severe.',
      formula: 'NLR = ANC ÷ ALC (or %neutrophils ÷ %lymphocytes)',
      validation:
        'No formally agreed cutoffs — bands are informal (PulmCrit). NLR is skewed by steroids, hematologic disorders, splenectomy, and chronic lymphopenia (e.g., HIV). Prognostic associations reported across sepsis, appendicitis, PE, COVID-19, and ICH literature.',
      references: [
        { title: 'Ratio of neutrophil to lymphocyte counts--rapid and simple parameter of systemic inflammation and stress in critically ill', citation: 'Zahorec R. Bratisl Lek Listy. 2001;102(1):5-14', year: 2001, pmid: '11723675' },
        { title: 'The diagnostic and predictive role of NLR, d-NLR and PLR in COVID-19 patients', citation: 'Yang AP et al. Int Immunopharmacol. 2020;84:106504', year: 2020, doi: '10.1016/j.intimp.2020.106504' },
      ],
    },
    nextSteps: [
      { condition: 'Elevated NLR', actions: ['Evaluate for infection/inflammation source', 'Trend with clinical course', 'Do not use alone to rule in/out disease'] },
      { condition: 'Confounded differential', actions: ['Account for steroids, hematologic disease, chronic lymphopenia before interpreting'] },
    ],
    pearls: [
      'Percentages and absolute counts give the same NLR — just keep both inputs on one basis.',
      'Steroids raise neutrophils and lower lymphocytes → spuriously high NLR.',
      'Useful as a quick second signal when the WBC looks unimpressive but the patient looks sick.',
    ],
  },

  // ─── 10. S.T.O.N.E. Nephrolithometry Score ───────────────────────────────
  {
    id: 'stone-nephrolithometry',
    name: 'S.T.O.N.E. Nephrolithometry Score (CT-based)',
    shortName: 'STONE (CT)',
    description:
      'Okhunov 2013 S.T.O.N.E. nephrolithometry: five CT-based items (Size, Tract length, Obstruction, Number of calyces, Essence/Hounsfield units) grading renal stone complexity to predict PCNL stone-free rates.',
    category: 'urology',
    tags: ['stone', 'nephrolithometry', 'pcnl', 'kidney stone', 'ct', 'okhunov', 'urology'],
    whenToUse:
      'Patients with renal (not ureteral) calculi being evaluated for percutaneous nephrolithotomy, using a preoperative non-contrast CT.',
    whyUse:
      'Quantifies stone complexity reproducibly; higher scores predict lower single-procedure stone-free rates and support counseling, staged planning, and standardized reporting.',
    inputs: [
      selectInput('size', 'Stone size (mm²)', [
        { label: '0–399 mm²', value: 1, points: 1, description: 'Small burden' },
        { label: '400–799 mm²', value: 2, points: 2 },
        { label: '800–1599 mm²', value: 3, points: 3 },
        { label: '≥1600 mm²', value: 4, points: 4, description: 'Large burden' },
      ], 1, 'Length × width in mm² (largest diameter for single stone; sum of largest diameters for multiple stones).'),
      selectInput('tract', 'Tract length — skin-to-stone distance', [
        { label: '≤100 mm', value: 1, points: 1 },
        { label: '>100 mm', value: 2, points: 2, description: 'Roughly corresponds to BMI ≥30' },
      ], 1, 'Vertical distance from stone center to skin on supine non-contrast CT (0°, 45°, 90°); the 10 cm cutoff approximates BMI 30.'),
      selectInput('obstruction', 'Obstruction (hydronephrosis)', [
        { label: 'None or mild', value: 1, points: 1 },
        { label: 'Moderate or severe', value: 2, points: 2 },
      ], 1, 'Degree of pelvicalyceal dilation on CT.'),
      selectInput('calyces', 'Number of calyces involved', [
        { label: '1–2 calyces', value: 1, points: 1 },
        { label: '3 calyces', value: 2, points: 2 },
        { label: 'Full staghorn calculus', value: 3, points: 3 },
      ], 1, 'Calyceal groups containing stone; a full staghorn occupies the entire collecting system.'),
      selectInput('essence', 'Essence — stone density (HU)', [
        { label: '≤950 HU', value: 1, points: 1 },
        { label: '>950 HU', value: 2, points: 2, description: 'Denser stone' },
      ], 1, 'Mean stone attenuation in Hounsfield units on non-contrast CT.'),
    ],
    calculate(values) {
      const score = num(values.size) + num(values.tract) + num(values.obstruction) + num(values.calyces) + num(values.essence);
      const r = riskFromThresholds(score, [
        { max: 6, level: 'low', label: 'Low complexity (5–6)', interpretation: `STONE score ${score}: low-complexity stone — stone-free rates ~90–100% after PCNL in validation cohorts.` },
        { max: 8, level: 'moderate', label: 'Moderate complexity (7–8)', interpretation: `STONE score ${score}: moderate complexity — good stone-free rates but counsel on possible residual fragments.` },
        { max: 13, level: 'high', label: 'High complexity (9–13)', interpretation: `STONE score ${score}: high-complexity stone — markedly lower single-procedure stone-free rates (~27–66% across series); consider staged procedures or adjuncts and set expectations.` },
      ]);
      return {
        score,
        unit: 'points (5–13)',
        label: r.label,
        interpretation: r.interpretation,
        riskLevel: r.riskLevel,
        details: [
          { label: 'S / T / O / N / E', value: `${num(values.size)} / ${num(values.tract)} / ${num(values.obstruction)} / ${num(values.calyces)} / ${num(values.essence)}` },
          { label: 'Cutoff often cited for SFR', value: '≤8 → >90% SFR in several series' },
        ],
        recommendations: [
          'Higher scores: discuss staged PCNL, combined approaches, or realistic stone-free expectations.',
          'Use for standardized reporting alongside Guy\'s Stone Score or CROES nomogram as local practice dictates.',
        ],
      };
    },
    evidence: {
      summary:
        'S.T.O.N.E. score (Okhunov et al., Urology 2013): Size (1–4), Tract length ≤/>100 mm (1–2), Obstruction (1–2), Number of involved calyces (1–3), Essence ≤/>950 HU (1–2); total 5–13. Score inversely correlates with PCNL stone-free rate.',
      formula: 'Score = Size + Tract + Obstruction + Number of calyces + Essence (range 5–13)',
      validation:
        'Predictive of stone-free status in the derivation cohort and in multiple external validations (Akhavein 2015, Labadie 2015, prospective series); several series report >90% SFR for scores ≤8 and progressively lower SFR ≥9. The "1–2 vs 3 vs staghorn" calyces grouping follows the original Okhunov table.',
      references: [
        { title: 'S.T.O.N.E. Nephrolithometry: Novel Surgical Classification System for Kidney Calculi', citation: 'Okhunov Z et al. Urology. 2013;81(6):1154-1160', year: 2013, pmid: '23540858', doi: '10.1016/j.urology.2012.10.083' },
        { title: 'Prediction of single procedure success rate using S.T.O.N.E. nephrolithometry surgical classification system with strict criteria for surgical outcome', citation: 'Akhavein A et al. Urology. 2015;85(1):69-73', year: 2015, pmid: '25530366', doi: '10.1016/j.urology.2014.09.010' },
      ],
    },
    nextSteps: [
      { condition: 'Score ≤8', actions: ['Standard PCNL planning', 'Counsel on high expected stone-free rate'] },
      { condition: 'Score ≥9', actions: ['Counsel on lower SFR and possible staged procedures', 'Consider adjunctive techniques (multiple tracts, combined RIRS)', 'Set expectations for residual fragments'] },
    ],
    pearls: [
      'This is the CT-based renal stone complexity score — different from the ureteral "STONE score" for spontaneous passage.',
      'Non-contrast CT is required; all five elements come from a single scan.',
      'Tract length cutoff of 10 cm approximates a BMI of 30 kg/m².',
      'Score does not capture anatomy anomalies (horseshoe kidney, calyceal diverticulum) — Guy\'s score covers those.',
    ],
  },
];
