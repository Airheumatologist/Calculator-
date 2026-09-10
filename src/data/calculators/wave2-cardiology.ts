import type { Calculator } from '../../types/calculator';
import { num, bool, round, yesNo, selectInput, numberInput, riskFromThresholds, isMissingValue } from '../../utils/helpers';

export const wave2CardiologyCalcs: Calculator[] = [
  {
    id: 'heart-pathway',
    name: 'HEART Pathway',
    shortName: 'HEART Pathway',
    description:
      'Disposition helper combining HEART score with serial troponin result for low-risk chest pain early-discharge decisions.',
    category: 'emergency',
    tags: ['chest pain', 'acs', 'heart score', 'troponin', 'disposition'],
    whenToUse: 'ED patients with possible ACS when applying a HEART Pathway–style accelerated diagnostic protocol.',
    whyUse: 'Identifies very low-risk patients (HEART 0–3 + negative serial troponins) who may be eligible for early discharge.',
    inputs: [
      selectInput('history', 'History', [
        { label: 'Slightly suspicious', value: 0, points: 0 },
        { label: 'Moderately suspicious', value: 1, points: 1 },
        { label: 'Highly suspicious', value: 2, points: 2 },
      ]),
      selectInput('ecg', 'ECG', [
        { label: 'Normal', value: 0, points: 0 },
        { label: 'Non-specific repolarization disturbance', value: 1, points: 1 },
        { label: 'Significant ST deviation', value: 2, points: 2 },
      ]),
      selectInput('age', 'Age', [
        { label: '< 45 years', value: 0, points: 0 },
        { label: '45–64 years', value: 1, points: 1 },
        { label: '≥ 65 years', value: 2, points: 2 },
      ]),
      selectInput('risk', 'Risk factors', [
        { label: 'No known risk factors', value: 0, points: 0 },
        { label: '1–2 risk factors', value: 1, points: 1 },
        { label: '≥3 risk factors or known atherosclerotic disease', value: 2, points: 2 },
      ], undefined, 'HTN, HLD, DM, obesity, smoking, positive family history'),
      selectInput('troponinPoints', 'Initial troponin (HEART component)', [
        { label: '≤ normal limit', value: 0, points: 0 },
        { label: '1–3× normal limit', value: 1, points: 1 },
        { label: '> 3× normal limit', value: 2, points: 2 },
      ]),
      yesNo('serialTropNeg', 'Serial troponins negative (0 and 3h, assay-specific)', 0, 'Both measurements below local 99th percentile / pathway threshold'),
    ],
    calculate(values) {
      const heart =
        num(values.history) +
        num(values.ecg) +
        num(values.age) +
        num(values.risk) +
        num(values.troponinPoints);
      const serialNeg = bool(values.serialTropNeg);
      const lowRiskPathway = heart <= 3 && serialNeg && num(values.troponinPoints) === 0;

      let riskLevel: 'low' | 'moderate' | 'high' = 'moderate';
      let label = 'Not low-risk by HEART Pathway';
      let interpretation = `HEART score ${heart}. Does not meet combined low-risk criteria for accelerated discharge.`;
      const recommendations: string[] = [];

      if (lowRiskPathway) {
        riskLevel = 'low';
        label = 'Low-risk HEART Pathway';
        interpretation = `HEART ${heart} (0–3) with negative serial troponins: very low short-term MACE risk in pathway studies. Candidate for early discharge with outpatient follow-up if no other concerns.`;
        recommendations.push(
          'Consider early discharge with primary care / cardiology follow-up',
          'Return precautions for recurrent chest pain, dyspnea, syncope',
          'Shared decision-making and ensure social support'
        );
      } else if (heart <= 3 && !serialNeg) {
        riskLevel = 'moderate';
        label = 'HEART low but serial troponin not negative';
        interpretation = `HEART ${heart} but serial troponins not confirmed negative (or initial troponin elevated). Do not use early-discharge pathway; continue ACS workup.`;
        recommendations.push('Complete serial troponins per protocol', 'Observe / further testing as indicated');
      } else if (heart >= 7) {
        riskLevel = 'high';
        label = 'High HEART score';
        interpretation = `HEART ${heart} (7–10): high MACE risk. Cardiology involvement and often early invasive strategy.`;
        recommendations.push('Admit', 'Cardiology consultation', 'Guideline-directed ACS therapy');
      } else {
        interpretation = `HEART ${heart} (4–6): intermediate risk. Observation, serial biomarkers, and provocative testing or imaging as indicated.`;
        recommendations.push('Admit / observe', 'Serial ECGs and troponins', 'Stress test or coronary imaging per local protocol');
      }

      return {
        score: heart,
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'HEART score', value: String(heart) },
          { label: 'Serial troponin negative', value: serialNeg ? 'Yes' : 'No' },
          { label: 'Low-risk pathway criteria', value: lowRiskPathway ? 'Met' : 'Not met' },
        ],
        recommendations,
      };
    },
    evidence: {
      summary:
        'The HEART Pathway uses HEART score 0–3 plus negative serial troponins to identify patients safe for early discharge; higher HEART scores need further evaluation.',
      formula: 'HEART (0–10) + serial troponin pathway flag; low-risk if HEART ≤3 and serial troponins negative',
      validation: 'HEART Pathway RCTs/implementation studies showed reduced objective cardiac testing and hospitalization with low missed MACE.',
      references: [
        { title: 'The HEART Pathway randomized trial', citation: 'Mahler SA et al. Circ Cardiovasc Qual Outcomes. 2015', year: 2015, pmid: '25737484', doi: '10.1161/CIRCOUTCOMES.114.001384' },
        { title: 'HEART score for chest pain patients at the ED', citation: 'Six AJ et al. Neth Heart J. 2008', year: 2008, pmid: '18665203',
          doi: '10.1007/BF03086144', },
      ],
    },
    nextSteps: [
      {
        condition: 'Low-risk pathway met',
        actions: ['Early discharge if clinically appropriate', 'Outpatient follow-up within days', 'Strict return precautions'],
      },
      {
        condition: 'Pathway not met',
        actions: ['Do not early-discharge on pathway alone', 'Risk-stratify further', 'Treat as possible ACS until proven otherwise'],
      },
    ],
    pearls: [
      'Pathway assumes appropriate patient selection (e.g., not STEMI, not unstable).',
      'Use assay- and protocol-specific troponin cutoffs (hs-Tn pathways differ by institution).',
    ],
  },
  {
    id: 'adhere-hf',
    name: 'ADHERE Heart Failure Risk (Simplified Tree)',
    shortName: 'ADHERE HF',
    description: 'In-hospital mortality risk strata for acute decompensated HF using BUN, SBP, and creatinine (ADHERE classification tree).',
    category: 'cardiology',
    tags: ['heart failure', 'adhere', 'mortality', 'bun'],
    whenToUse: 'Adults hospitalized with acute decompensated heart failure for in-hospital mortality risk stratification.',
    whyUse: 'Simple bedside tree from a large US registry; identifies low- vs high-risk groups using three variables.',
    inputs: [
      numberInput('bun', 'BUN', { unit: 'mg/dL', min: 1, max: 200, step: 1, defaultValue: 30 }),
      numberInput('sbp', 'Systolic BP', { unit: 'mmHg', min: 50, max: 250, defaultValue: 120 }),
      numberInput('cr', 'Serum creatinine', { unit: 'mg/dL', min: 0.2, max: 20, step: 0.1, defaultValue: 1.2 }),
    ],
    calculate(values) {
      const bun = num(values.bun, 30);
      const sbp = num(values.sbp, 120);
      const cr = num(values.cr, 1.2);

      let stratum = 'Low risk';
      let mort = '~2.1%';
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
      let interpretation = '';

      if (bun < 43) {
        if (sbp >= 115) {
          stratum = 'Low risk';
          mort = '~2.1%';
          riskLevel = 'low';
          interpretation = `BUN <43 and SBP ≥115: lowest ADHERE tree risk (in-hospital mortality ~2.1% in derivation).`;
        } else {
          stratum = 'Intermediate risk';
          mort = '~5.5%';
          riskLevel = 'moderate';
          interpretation = `BUN <43 but SBP <115: intermediate ADHERE risk (~5.5% in-hospital mortality).`;
        }
      } else if (sbp >= 115) {
        stratum = 'Intermediate risk';
        mort = '~6.4%';
        riskLevel = 'moderate';
        interpretation = `BUN ≥43 and SBP ≥115: intermediate ADHERE risk (~5–6% range).`;
      } else if (cr < 2.75) {
        stratum = 'High risk';
        mort = '~12.4%';
        riskLevel = 'high';
        interpretation = `BUN ≥43, SBP <115, Cr <2.75: high ADHERE risk (~12.4% in-hospital mortality).`;
      } else {
        stratum = 'Very high risk';
        mort = '~21.9%';
        riskLevel = 'critical';
        interpretation = `BUN ≥43, SBP <115, Cr ≥2.75: highest ADHERE tree risk (~21.9% in-hospital mortality).`;
      }

      // Ordinal score for display: 0 low, 1 intermediate, 2 high, 3 very high
      const score = riskLevel === 'low' ? 0 : riskLevel === 'moderate' ? 1 : riskLevel === 'high' ? 2 : 3;

      return {
        score,
        label: stratum,
        interpretation,
        riskLevel,
        details: [
          { label: 'Approx. in-hospital mortality (ADHERE tree)', value: mort },
          { label: 'BUN', value: `${bun} mg/dL` },
          { label: 'SBP', value: `${sbp} mmHg` },
          { label: 'Creatinine', value: `${cr} mg/dL` },
        ],
        recommendations:
          score >= 2
            ? ['Closer monitoring / consider higher level of care', 'Optimize perfusion and congestion', 'Reassess renal function and vasoactive needs']
            : ['Standard ADHF pathway', 'GDMT optimization as tolerated', 'Plan disposition when euvolemic'],
      };
    },
    evidence: {
      summary:
        'ADHERE classification and regression tree identified BUN ≥43 mg/dL, SBP <115 mmHg, and Cr ≥2.75 mg/dL as key splits for in-hospital mortality.',
      formula: 'Tree: BUN 43 → SBP 115 → Cr 2.75 thresholds',
      validation: 'Derived from ADHERE registry (>30,000 hospitalizations); widely cited educational risk tree.',
      references: [
        {
          title: 'Risk stratification for in-hospital mortality in acutely decompensated heart failure (ADHERE)',
          citation: 'Fonarow GC et al. JAMA. 2005',
          year: 2005,
          pmid: '15687312',
          doi: '10.1001/jama.293.5.572',
        },
      ],
    },
    nextSteps: [
      { condition: 'Low risk', actions: ['Usual ADHF care', 'Diuresis and GDMT', 'Early discharge planning if responding'] },
      { condition: 'High / very high risk', actions: ['Intensified monitoring', 'Evaluate cardiogenic shock / advanced therapies', 'Nephrology input if progressive AKI'] },
    ],
    pearls: ['Absolute mortality rates vary by era and case mix; use for relative stratification.', 'Does not replace clinical judgment or natriuretic peptides/imaging.'],
  },
  {
    id: 'effect-hf',
    name: 'EFFECT HF Mortality Score (Simplified)',
    shortName: 'EFFECT HF',
    description:
      'Simplified educational version of key EFFECT predictors for 30-day mortality risk in acute heart failure hospitalizations.',
    category: 'cardiology',
    tags: ['heart failure', 'effect', 'mortality', '30-day'],
    whenToUse: 'Adults admitted with heart failure when estimating short-term mortality risk (educational/simplified).',
    whyUse: 'Highlights major EFFECT variables (age, vitals, labs, comorbidities) without full multi-outcome nomogram complexity.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 18, max: 110, defaultValue: 75 }),
      numberInput('rr', 'Respiratory rate', { unit: '/min', min: 8, max: 60, defaultValue: 20 }),
      numberInput('sbp', 'Systolic BP', { unit: 'mmHg', min: 50, max: 250, defaultValue: 120 }),
      numberInput('bun', 'BUN', { unit: 'mg/dL', min: 1, max: 200, defaultValue: 30 }),
      numberInput('na', 'Sodium', { unit: 'mEq/L', min: 110, max: 160, defaultValue: 138 }),
      numberInput('hb', 'Hemoglobin', { unit: 'g/dL', min: 4, max: 20, step: 0.1, defaultValue: 12 }),
      yesNo('cvd', 'Cerebrovascular disease', 6),
      yesNo('dementia', 'Dementia', 8),
      yesNo('copd', 'COPD', 4),
      yesNo('cirrhosis', 'Hepatic cirrhosis', 10),
      yesNo('cancer', 'Cancer', 8),
    ],
    calculate(values) {
      const age = num(values.age, 75);
      const rr = num(values.rr, 20);
      const sbp = num(values.sbp, 120);
      const bun = num(values.bun, 30);
      const na = num(values.na, 138);
      const hb = num(values.hb, 12);

      // Simplified points inspired by EFFECT 30-day model key weights (educational, not full nomogram)
      let score = age; // age in years contributes as points in original EFFECT
      if (rr >= 20 && rr <= 24) score += 0;
      else if (rr >= 25 && rr <= 29) score += 4;
      else if (rr >= 30) score += 8;
      // low RR not heavily weighted; mild elevation baseline 0

      if (sbp < 90) score += 28;
      else if (sbp < 100) score += 20;
      else if (sbp < 120) score += 13;
      else if (sbp < 140) score += 7;
      else if (sbp < 160) score += 3;

      if (bun >= 90) score += 24;
      else if (bun >= 60) score += 17;
      else if (bun >= 40) score += 12;
      else if (bun >= 30) score += 8;
      else if (bun >= 20) score += 4;

      if (na < 136) score += 4;
      if (hb < 10) score += 3;

      score += bool(values.cvd) ? 6 : 0;
      score += bool(values.dementia) ? 8 : 0;
      score += bool(values.copd) ? 4 : 0;
      score += bool(values.cirrhosis) ? 10 : 0;
      score += bool(values.cancer) ? 8 : 0;

      score = round(score, 0);

      // Approximate 30-day mortality bands (educational; original EFFECT uses full point→risk table)
      const r = riskFromThresholds(score, [
        {
          max: 60,
          level: 'low',
          label: 'Lower risk band',
          interpretation: `Simplified EFFECT-style score ${score}: lower 30-day mortality band. Still individualize care.`,
        },
        {
          max: 90,
          level: 'moderate',
          label: 'Intermediate risk band',
          interpretation: `Simplified EFFECT-style score ${score}: intermediate 30-day mortality risk. Optimize HF therapy and monitor closely.`,
        },
        {
          max: 120,
          level: 'high',
          label: 'Higher risk band',
          interpretation: `Simplified EFFECT-style score ${score}: elevated 30-day mortality risk. Consider intensified care and goals-of-care discussion.`,
        },
        {
          max: 300,
          level: 'critical',
          label: 'Very high risk band',
          interpretation: `Simplified EFFECT-style score ${score}: very high predicted short-term mortality. Multidisciplinary planning and advanced options as appropriate.`,
        },
      ]);

      return {
        score,
        ...r,
        details: [
          { label: 'Note', value: 'Educational simplification — not the full EFFECT calculator' },
          { label: 'Age contribution', value: String(age) },
        ],
        recommendations:
          score > 90
            ? ['Higher-intensity monitoring', 'Reassess congestion, perfusion, comorbidities', 'Palliative care / goals discussion when appropriate']
            : ['Standard HF pathway', 'GDMT optimization', 'Address reversible precipitants'],
      };
    },
    evidence: {
      summary:
        'EFFECT (Enhanced Feedback for Effective Cardiac Treatment) models predict 30-day and 1-year mortality after HF hospitalization using age, vitals, labs, and comorbidities.',
      formula: 'Simplified points from age + RR + SBP + BUN + Na + Hb + selected comorbidities (educational)',
      validation: 'Original EFFECT validated in Ontario HF cohorts; this app version is intentionally simplified.',
      references: [
        {
          title: 'Predicting mortality among patients hospitalized for heart failure (EFFECT)',
          citation: 'Lee DS et al. JAMA. 2003',
          year: 2003,
          pmid: '14625335',
          doi: '10.1001/jama.290.19.2581',
        },
      ],
    },
    nextSteps: [
      { condition: 'Lower risk band', actions: ['Usual inpatient HF care', 'Early ambulation and education'] },
      { condition: 'High / very high band', actions: ['Consider telemetry/ICU if unstable', 'Advanced HF referral if candidate', 'Clarify goals of care'] },
    ],
    pearls: ['Not a substitute for the full published EFFECT point tables or online calculators.', 'Hyponatremia and low SBP are strong adverse markers in acute HF.'],
  },
  {
    id: 'gwtg-hf',
    name: 'GWTG-HF Risk Score (Simplified)',
    shortName: 'GWTG-HF',
    description:
      'Simplified educational Get With The Guidelines–Heart Failure in-hospital mortality risk using major predictors.',
    category: 'cardiology',
    tags: ['heart failure', 'gwtg', 'mortality', 'aha'],
    whenToUse: 'Adults admitted with acute HF for educational in-hospital mortality risk estimate.',
    whyUse: 'Based on major GWTG-HF predictors (age, SBP, BUN, sodium, heart rate, COPD, race).',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 18, max: 110, defaultValue: 72 }),
      numberInput('sbp', 'Systolic BP', { unit: 'mmHg', min: 50, max: 250, defaultValue: 130 }),
      numberInput('bun', 'BUN', { unit: 'mg/dL', min: 1, max: 200, defaultValue: 25 }),
      numberInput('hr', 'Heart rate', { unit: 'bpm', min: 30, max: 200, defaultValue: 80 }),
      numberInput('na', 'Sodium', { unit: 'mEq/L', min: 110, max: 160, defaultValue: 138 }),
      yesNo('copd', 'COPD', 3),
      selectInput('race', 'Race category (GWTG variable)', [
        { label: 'Black', value: 'black' },
        { label: 'Non-black', value: 'nonblack' },
      ]),
    ],
    calculate(values) {
      const age = num(values.age, 72);
      const sbp = num(values.sbp, 130);
      const bun = num(values.bun, 25);
      const hr = num(values.hr, 80);
      const na = num(values.na, 138);

      // Educational point approximation patterned on GWTG-HF nomogram directions
      let pts = 0;
      // Age: ~1 point per year above 19 (scaled)
      pts += Math.max(0, age - 19) * 0.5;
      // Lower SBP → higher risk
      if (sbp < 100) pts += 25;
      else if (sbp < 120) pts += 18;
      else if (sbp < 140) pts += 12;
      else if (sbp < 160) pts += 6;
      else pts += 2;
      // Higher BUN → higher risk
      if (bun >= 60) pts += 22;
      else if (bun >= 40) pts += 15;
      else if (bun >= 30) pts += 10;
      else if (bun >= 20) pts += 5;
      // Higher HR
      if (hr >= 105) pts += 8;
      else if (hr >= 90) pts += 5;
      else if (hr >= 80) pts += 3;
      // Lower sodium
      if (na < 130) pts += 8;
      else if (na < 135) pts += 4;
      else if (na < 138) pts += 1;
      if (bool(values.copd)) pts += 3;
      if (String(values.race) === 'nonblack') pts += 3;

      pts = round(pts, 0);

      const r = riskFromThresholds(pts, [
        {
          max: 33,
          level: 'low',
          label: 'Lower in-hospital mortality band',
          interpretation: `Simplified GWTG-HF points ${pts}: lower predicted in-hospital mortality band.`,
        },
        {
          max: 50,
          level: 'moderate',
          label: 'Intermediate risk band',
          interpretation: `Simplified GWTG-HF points ${pts}: intermediate predicted in-hospital mortality.`,
        },
        {
          max: 70,
          level: 'high',
          label: 'Higher risk band',
          interpretation: `Simplified GWTG-HF points ${pts}: higher predicted in-hospital mortality. Intensify monitoring.`,
        },
        {
          max: 200,
          level: 'critical',
          label: 'Very high risk band',
          interpretation: `Simplified GWTG-HF points ${pts}: very high predicted in-hospital mortality risk.`,
        },
      ]);

      return {
        score: pts,
        ...r,
        details: [
          { label: 'Note', value: 'Educational simplification of GWTG-HF — not the official AHA calculator' },
          { label: 'Key drivers', value: 'Age, low SBP, high BUN, HR, low Na, COPD, race' },
        ],
        recommendations:
          pts > 50
            ? ['Closer inpatient monitoring', 'Reassess perfusion and renal function', 'Early advanced HF input if not responding']
            : ['Standard ADHF care pathway', 'GDMT as tolerated'],
      };
    },
    evidence: {
      summary:
        'GWTG-HF risk score predicts in-hospital mortality using routinely available admission variables from the AHA Get With The Guidelines–HF registry.',
      formula: 'Simplified points from age, SBP, BUN, HR, Na, COPD, race (educational)',
      validation: 'Original score derived/validated in GWTG-HF; this version is simplified for teaching.',
      references: [
        {
          title: 'A validated risk score for in-hospital mortality in heart failure (GWTG-HF)',
          citation: 'Peterson PN et al. Circ Cardiovasc Qual Outcomes. 2010',
          year: 2010,
          pmid: '20123668',
          doi: '10.1161/CIRCOUTCOMES.109.854877',
        },
      ],
    },
    nextSteps: [
      { condition: 'Lower band', actions: ['Routine HF floor care', 'Focus on decongestion and education'] },
      { condition: 'Higher bands', actions: ['Consider step-down/ICU if unstable', 'Address hypotension and renal injury', 'Disposition and goals planning'] },
    ],
    pearls: ['Black race was associated with lower in-hospital mortality in the GWTG derivation — interpret cautiously.', 'Not for outpatient chronic HF prognosis alone.'],
  },
  {
    id: 'cpc-score',
    name: 'Cerebral Performance Category (CPC)',
    shortName: 'CPC',
    description: 'Five-category scale of neurologic function after cardiac arrest (Cerebral Performance Category).',
    category: 'critical-care',
    tags: ['cardiac arrest', 'ohca', 'neurologic', 'cpc', 'outcome'],
    whenToUse: 'Document neurologic outcome after cardiac arrest (research, prognostication discussions, discharge status).',
    whyUse: 'Standard Utstein-style outcome category used across resuscitation literature.',
    inputs: [
      selectInput('cpc', 'Cerebral Performance Category', [
        { label: 'CPC 1 — Good cerebral performance', value: 1, description: 'Conscious, alert, able to work; may have mild deficit' },
        { label: 'CPC 2 — Moderate cerebral disability', value: 2, description: 'Conscious; independent ADLs; may work in sheltered environment' },
        { label: 'CPC 3 — Severe cerebral disability', value: 3, description: 'Conscious but dependent on others for daily support' },
        { label: 'CPC 4 — Coma or vegetative state', value: 4, description: 'Unaware; no interaction; may have sleep-wake cycles' },
        { label: 'CPC 5 — Brain death / death', value: 5, description: 'Certified brain death or dead' },
      ]),
    ],
    calculate(values) {
      const cpc = num(values.cpc, 1);
      const map: Record<number, { label: string; interpretation: string; riskLevel: 'low' | 'moderate' | 'high' | 'critical' | 'info' }> = {
        1: {
          label: 'CPC 1 — Good performance',
          interpretation: 'Good cerebral performance. Favorable neurologic outcome (often grouped with CPC 2 as “good” in trials).',
          riskLevel: 'low',
        },
        2: {
          label: 'CPC 2 — Moderate disability',
          interpretation: 'Moderate cerebral disability but independent in ADLs. Generally considered a favorable outcome in many OHCA studies.',
          riskLevel: 'moderate',
        },
        3: {
          label: 'CPC 3 — Severe disability',
          interpretation: 'Severe cerebral disability; depends on others for daily support. Unfavorable neurologic outcome in most trial definitions.',
          riskLevel: 'high',
        },
        4: {
          label: 'CPC 4 — Coma / vegetative',
          interpretation: 'Coma or vegetative state. Unfavorable outcome; continue multimodal prognostication per guidelines if timing appropriate.',
          riskLevel: 'critical',
        },
        5: {
          label: 'CPC 5 — Death / brain death',
          interpretation: 'Death or brain death. Complete Utstein reporting and family support / organ donation pathways as appropriate.',
          riskLevel: 'critical',
        },
      };
      const m = map[cpc] ?? map[1];
      return {
        score: cpc,
        ...m,
        details: [
          { label: 'Favorable (typical trial grouping)', value: cpc <= 2 ? 'Yes (CPC 1–2)' : 'No (CPC 3–5)' },
        ],
        recommendations:
          cpc <= 2
            ? ['Rehabilitation and secondary prevention', 'ICD / workup per arrest etiology']
            : cpc === 3
              ? ['Supportive care and rehab goals', 'Family meeting on expectations']
              : ['Multimodal neuroprognostication if applicable', 'Avoid premature withdrawal of care before recommended timelines'],
      };
    },
    evidence: {
      summary: 'CPC grades post-arrest cerebral function from 1 (good) to 5 (death). CPC 1–2 often define favorable neurologic outcome.',
      formula: 'Clinician-assigned category CPC 1–5',
      validation: 'Standard in resuscitation research (Utstein templates); coarser than mRS but widely used.',
      references: [
        { title: 'Recommended guidelines for uniform reporting of data from out-of-hospital cardiac arrest (Utstein)', citation: 'Cummins RO et al. Circulation. 1991', year: 1991, pmid: '1860248',
          doi: '10.1161/01.cir.84.2.960', },
        { title: 'Cerebral Performance Categories (CPC) in cardiac arrest outcome reporting', citation: 'Cummins RO et al. Circulation. 1991 (Utstein-style outcome categories including CPC)', year: 1991, pmid: '1860248',
          doi: '10.1161/01.cir.84.2.960', },
      ],
    },
    nextSteps: [
      { condition: 'CPC 1–2', actions: ['Secondary prevention', 'Rehab as needed', 'Cardiology follow-up'] },
      { condition: 'CPC 3–4', actions: ['Goals-of-care discussion', 'Supportive care and disposition planning', 'Rehab as appropriate'] },
    ],
    pearls: ['Assign CPC based on best neurologic status at a defined time point (e.g., discharge).', 'mRS and GOSE provide finer disability granularity when available.'],
  },
  {
    id: 'stroke-volume',
    name: 'Stroke Volume & Ejection Fraction',
    shortName: 'SV / EF',
    description: 'Stroke volume from end-diastolic and end-systolic volumes; ejection fraction and optional cardiac output.',
    category: 'cardiology',
    tags: ['echo', 'stroke volume', 'ejection fraction', 'hemodynamics'],
    whenToUse: 'When EDV and ESV are known from echocardiography, ventriculography, or other imaging.',
    whyUse: 'Fundamental relationships: SV = EDV − ESV; EF = SV/EDV; CO = SV × HR.',
    inputs: [
      numberInput('edv', 'End-diastolic volume (EDV)', { unit: 'mL', min: 20, max: 500, defaultValue: 120 }),
      numberInput('esv', 'End-systolic volume (ESV)', { unit: 'mL', min: 5, max: 400, defaultValue: 50 }),
      numberInput('hr', 'Heart rate (optional, for CO)', { unit: 'bpm', min: 30, max: 220, defaultValue: 70, required: false }),
    ],
    calculate(values) {
      const edv = num(values.edv, 120);
      const esv = num(values.esv, 50);
      const hrProvided = !isMissingValue(values.hr, true);
      const hr = num(values.hr, 0);
      if (edv <= 0) {
        return { score: 0, label: 'Invalid EDV', interpretation: 'EDV must be > 0.', riskLevel: 'info' };
      }
      if (esv < 0 || esv > edv) {
        return {
          score: 0,
          label: 'Invalid volumes',
          interpretation: 'ESV must be ≥ 0 and ≤ EDV.',
          riskLevel: 'info',
        };
      }
      const sv = edv - esv;
      const ef = round((sv / edv) * 100, 1);
      const co = hrProvided ? round((sv * hr) / 1000, 2) : null;

      const r = riskFromThresholds(ef, [
        {
          max: 29.9,
          level: 'critical',
          label: 'Severely reduced EF',
          interpretation: `EF ${ef}% (SV ${sv} mL): severe LV systolic dysfunction by common echo cutoffs.`,
        },
        {
          max: 39.9,
          level: 'high',
          label: 'Moderately reduced EF (HFrEF range)',
          interpretation: `EF ${ef}% (SV ${sv} mL): moderately reduced ejection fraction (HFrEF if chronic HF phenotype).`,
        },
        {
          max: 49.9,
          level: 'moderate',
          label: 'Mildly reduced EF',
          interpretation: `EF ${ef}% (SV ${sv} mL): mildly reduced EF (HFmrEF range if HF present).`,
        },
        {
          max: 70,
          level: 'normal',
          label: 'Preserved / normal EF',
          interpretation: `EF ${ef}% (SV ${sv} mL): preserved EF range for many adults (context-dependent).`,
        },
        {
          max: 100,
          level: 'moderate',
          label: 'High EF',
          interpretation: `EF ${ef}%: higher than typical; consider hyperdynamic states or measurement error.`,
        },
      ]);

      return {
        score: ef,
        unit: '%',
        ...r,
        details: [
          { label: 'Stroke volume', value: `${sv} mL` },
          { label: 'Ejection fraction', value: `${ef}%` },
          { label: 'Cardiac output (SV×HR)', value: co != null ? `${co} L/min` : 'Not calculated — heart rate not entered' },
          { label: 'EDV / ESV', value: `${edv} / ${esv} mL` },
        ],
        recommendations:
          ef < 40
            ? ['Correlate with clinical HF phenotype', 'GDMT for HFrEF when indicated', 'Evaluate cardiomyopathy etiology']
            : ['Interpret with symptoms, diastolic function, and valves', 'SV alone does not define shock'],
      };
    },
    evidence: {
      summary: 'SV = EDV − ESV; EF (%) = 100 × SV/EDV; CO (L/min) = SV(mL) × HR / 1000.',
      formula: 'SV = EDV − ESV; EF = SV/EDV × 100; CO = SV × HR / 1000',
      validation: 'Standard echocardiographic and physiologic definitions.',
      references: [
        { title: 'Recommendations for cardiac chamber quantification', citation: 'Lang RM et al. JASE / ASE-EACVI', year: 2015, pmid: '25559473', doi: '10.1016/j.echo.2014.10.003' },
      ],
    },
    nextSteps: [
      { condition: 'EF ≤40%', actions: ['HF workup', 'GDMT for HFrEF when indicated', 'ICD evaluation if EF remains ≤35% after GDMT'] },
      { condition: 'Low SV with shock', actions: ['Integrate with CI, lactate, filling pressures', 'Resuscitate phenotype-guided'] },
    ],
    pearls: ['Normal SV often ~60–100 mL but varies with body size.', 'Teichholz EF from linear dimensions is less accurate than volumetric methods.'],
  },
  {
    id: 'cardiac-index',
    name: 'Cardiac Index',
    shortName: 'CI',
    description: 'Cardiac index = cardiac output ÷ body surface area (L/min/m²).',
    category: 'critical-care',
    tags: ['hemodynamics', 'cardiac output', 'shock', 'ci'],
    whenToUse: 'When CO and BSA are known (PA catheter, echo estimates, pulse contour) for perfusion assessment.',
    whyUse: 'Indexes CO to body size; used in Forrester classification, shock algorithms, and transplant/MCS evaluation.',
    inputs: [
      numberInput('co', 'Cardiac output (CO)', { unit: 'L/min', min: 0.5, max: 15, step: 0.1, defaultValue: 5.0 }),
      numberInput('bsa', 'Body surface area (BSA)', { unit: 'm²', min: 0.5, max: 3.5, step: 0.01, defaultValue: 1.9 }),
    ],
    calculate(values) {
      const co = num(values.co, 5);
      const bsa = num(values.bsa, 1.9);
      if (bsa <= 0) {
        return { score: 0, label: 'Invalid BSA', interpretation: 'BSA must be > 0.', riskLevel: 'info' };
      }
      const ci = round(co / bsa, 2);
      const r = riskFromThresholds(ci, [
        {
          max: 1.8,
          level: 'critical',
          label: 'Critically low CI',
          interpretation: `CI ${ci} L/min/m²: severely reduced (classic cardiogenic shock threshold often CI ≤2.2 with congestion; ≤1.8 especially concerning).`,
        },
        {
          max: 2.2,
          level: 'high',
          label: 'Low CI',
          interpretation: `CI ${ci} L/min/m²: low cardiac index (Forrester “cold” cutoff often ≤2.2). Assess perfusion and etiology.`,
        },
        {
          max: 2.49,
          level: 'moderate',
          label: 'Borderline low CI',
          interpretation: `CI ${ci} L/min/m²: borderline low vs common normal lower bound (~2.5).`,
        },
        {
          max: 4.0,
          level: 'normal',
          label: 'Normal CI',
          interpretation: `CI ${ci} L/min/m²: within typical resting adult range (~2.5–4.0 L/min/m²).`,
        },
        {
          max: 15,
          level: 'moderate',
          label: 'High CI',
          interpretation: `CI ${ci} L/min/m²: elevated — consider high-output states (sepsis, anemia, thyrotoxicosis, AV fistula).`,
        },
      ]);
      return {
        score: ci,
        unit: 'L/min/m²',
        ...r,
        details: [
          { label: 'CO', value: `${co} L/min` },
          { label: 'BSA', value: `${bsa} m²` },
          { label: 'Formula', value: 'CI = CO / BSA' },
        ],
        recommendations:
          ci <= 2.2
            ? ['Assess lactate, mentation, urine output, ScvO₂', 'Phenotype shock (cold/warm, wet/dry)', 'Consider inotropes/MCS if cardiogenic']
            : ['Interpret with filling pressures and SVR', 'Serial trends > single value'],
      };
    },
    evidence: {
      summary: 'Cardiac index normalizes cardiac output to BSA. Resting adult CI is typically ~2.5–4.0 L/min/m².',
      formula: 'CI (L/min/m²) = CO (L/min) / BSA (m²)',
      validation: 'Standard hemodynamic definition used in shock and HF literature.',
      references: [
        { title: 'Medical therapy of acute myocardial infarction by application of hemodynamic subsets (second of two parts)', citation: 'Forrester JS et al. N Engl J Med. 1976', year: 1976, pmid: '790194',
          doi: '10.1056/NEJM197612162952505', },
      ],
    },
    nextSteps: [
      { condition: 'CI ≤2.2 with hypoperfusion', actions: ['Shock workup', 'Echo', 'Support BP/flow per phenotype'] },
    ],
    pearls: ['Compute BSA with Mosteller/DuBois if not provided.', 'Echo CO estimates have wider error than thermodilution.'],
  },
  {
    id: 'svr-calc',
    name: 'Systemic Vascular Resistance (SVR)',
    shortName: 'SVR',
    description: 'SVR = 80 × (MAP − CVP) / CO in dyn·s·cm⁻⁵.',
    category: 'critical-care',
    tags: ['hemodynamics', 'svr', 'afterload', 'shock'],
    whenToUse: 'When MAP, CVP (or RAP), and CO are available to characterize vasomotor tone.',
    whyUse: 'Distinguishes vasodilatory vs vasoconstricted shock and guides pressor/vasodilator therapy.',
    inputs: [
      numberInput('map', 'Mean arterial pressure (MAP)', { unit: 'mmHg', min: 20, max: 200, defaultValue: 70 }),
      numberInput('cvp', 'CVP / RAP', { unit: 'mmHg', min: 0, max: 40, defaultValue: 8 }),
      numberInput('co', 'Cardiac output (CO)', { unit: 'L/min', min: 0.5, max: 15, step: 0.1, defaultValue: 5.0 }),
    ],
    calculate(values) {
      const map = num(values.map, 70);
      const cvp = num(values.cvp, 8);
      const co = num(values.co, 5);
      if (co <= 0) {
        return { score: 0, label: 'Invalid CO', interpretation: 'CO must be > 0.', riskLevel: 'info' };
      }
      const svr = round((80 * (map - cvp)) / co, 0);
      const wood = round((map - cvp) / co, 1);
      const r = riskFromThresholds(svr, [
        {
          max: 799,
          level: 'high',
          label: 'Low SVR (vasodilated)',
          interpretation: `SVR ${svr} dyn·s·cm⁻⁵: low systemic resistance — distributive physiology (sepsis, vasodilatory shock, anaphylaxis, vasodilators).`,
        },
        {
          max: 1200,
          level: 'normal',
          label: 'Normal SVR',
          interpretation: `SVR ${svr} dyn·s·cm⁻⁵: within common normal range (~800–1200 dyn·s·cm⁻⁵).`,
        },
        {
          max: 1600,
          level: 'moderate',
          label: 'Elevated SVR',
          interpretation: `SVR ${svr} dyn·s·cm⁻⁵: elevated afterload — vasoconstriction, cardiogenic/hypovolemic compensation, or hypertension.`,
        },
        {
          max: 5000,
          level: 'high',
          label: 'Markedly elevated SVR',
          interpretation: `SVR ${svr} dyn·s·cm⁻⁵: markedly high SVR. Consider afterload reduction if CO limited and BP allows.`,
        },
      ]);
      // riskFromThresholds first band uses 'high' for low SVR which is clinically high acuity — adjust label already set
      return {
        score: svr,
        unit: 'dyn·s·cm⁻⁵',
        ...r,
        riskLevel: svr < 800 ? 'high' : r.riskLevel,
        details: [
          { label: 'SVR (Wood units)', value: `${wood} WU` },
          { label: 'MAP − CVP', value: `${map - cvp} mmHg` },
          { label: 'CO', value: `${co} L/min` },
          { label: 'Formula', value: '80 × (MAP − CVP) / CO' },
        ],
        recommendations:
          svr < 800
            ? ['Treat vasodilatory shock (fluids if indicated, norepinephrine)', 'Source control if septic']
            : svr > 1600 && co < 4
              ? ['Consider afterload reduction if congested HF', 'Avoid pure vasoconstriction without flow support']
              : ['Integrate with CI and filling pressures'],
      };
    },
    evidence: {
      summary: 'SVR estimates left-sided afterload from the pressure drop across the systemic circulation divided by flow, scaled by 80 for dyn units.',
      formula: 'SVR = 80 × (MAP − CVP) / CO (dyn·s·cm⁻⁵); Wood units = (MAP − CVP) / CO',
      validation: 'Standard critical care hemodynamic equation.',
      references: [
        { title: 'Hemodynamic calculations (SVR) — standard critical care physiology', citation: 'Textbook of Critical Care / standard hemodynamic equations (MAP−CVP)/CO × 80', year: 2010, url: 'https://www.ncbi.nlm.nih.gov/books/NBK482255/' },
      ],
    },
    nextSteps: [
      { condition: 'Low SVR + hypotension', actions: ['Vasopressors', 'Volume if fluid-responsive', 'Treat cause'] },
      { condition: 'High SVR + low CO', actions: ['Inotrope/vasodilator strategies per phenotype', 'Echo'] },
    ],
    pearls: ['If CVP unknown, some approximate RAP = 0 (overestimates SVR slightly).', 'Normal SVR ≈ 800–1200 dyn·s·cm⁻⁵ (10–15 WU).'],
  },
  {
    id: 'pvr-calc',
    name: 'Pulmonary Vascular Resistance (PVR)',
    shortName: 'PVR',
    description: 'PVR = 80 × (mPAP − PCWP) / CO in dyn·s·cm⁻⁵ (also reports Wood units).',
    category: 'cardiology',
    tags: ['hemodynamics', 'pvr', 'pah', 'pulmonary hypertension'],
    whenToUse: 'Right heart catheterization interpretation for pulmonary hypertension and transplant evaluation.',
    whyUse: 'Defines precapillary component of PH; guides PAH vs left-heart disease physiology.',
    inputs: [
      numberInput('mpap', 'Mean pulmonary artery pressure (mPAP)', { unit: 'mmHg', min: 5, max: 80, defaultValue: 25 }),
      numberInput('pcwp', 'PCWP / PAWP', { unit: 'mmHg', min: 0, max: 50, defaultValue: 12 }),
      numberInput('co', 'Cardiac output (CO)', { unit: 'L/min', min: 0.5, max: 15, step: 0.1, defaultValue: 5.0 }),
    ],
    calculate(values) {
      const mpap = num(values.mpap, 25);
      const pcwp = num(values.pcwp, 12);
      const co = num(values.co, 5);
      if (co <= 0) {
        return { score: 0, label: 'Invalid CO', interpretation: 'CO must be > 0.', riskLevel: 'info' };
      }
      const tpg = mpap - pcwp;
      const pvrDyn = round((80 * tpg) / co, 0);
      const pvrWu = round(tpg / co, 2);

      let riskLevel: 'normal' | 'moderate' | 'high' | 'critical' | 'info' = 'normal';
      let label = 'Normal / near-normal PVR';
      let interpretation = `PVR ${pvrWu} WU (${pvrDyn} dyn·s·cm⁻⁵).`;

      if (tpg < 0) {
        riskLevel = 'info';
        label = 'Negative TPG';
        interpretation = 'mPAP < PCWP yields negative TPG — check measurement fidelity.';
      } else if (pvrWu < 2) {
        riskLevel = 'normal';
        label = 'Normal PVR';
        interpretation = `PVR ${pvrWu} WU (${pvrDyn} dyn): normal pulmonary vascular resistance (<2 WU often considered normal; PH definitions use ≥2–3 WU thresholds by era/guideline).`;
      } else if (pvrWu < 3) {
        riskLevel = 'moderate';
        label = 'Mildly elevated PVR';
        interpretation = `PVR ${pvrWu} WU (${pvrDyn} dyn): mildly elevated. Interpret with mPAP and PCWP for PH group classification.`;
      } else if (pvrWu < 6) {
        riskLevel = 'high';
        label = 'Elevated PVR';
        interpretation = `PVR ${pvrWu} WU (${pvrDyn} dyn): elevated PVR consistent with significant precapillary component when mPAP elevated.`;
      } else {
        riskLevel = 'critical';
        label = 'Markedly elevated PVR';
        interpretation = `PVR ${pvrWu} WU (${pvrDyn} dyn): markedly elevated — severe pulmonary vascular disease physiology.`;
      }

      return {
        score: pvrWu,
        unit: 'WU',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'PVR (dyn·s·cm⁻⁵)', value: String(pvrDyn) },
          { label: 'Transpulmonary gradient', value: `${tpg} mmHg` },
          { label: 'mPAP', value: `${mpap} mmHg` },
          { label: 'PCWP', value: `${pcwp} mmHg` },
          { label: 'Formula', value: '80 × (mPAP − PCWP) / CO' },
        ],
        recommendations:
          pvrWu >= 3 && mpap > 20
            ? ['Classify PH group using PCWP and clinical context', 'Consider PAH workup if precapillary PH', 'Avoid mislabeling isolated post-capillary PH']
            : ['Correlate with echo RVSP and symptoms', 'Ensure zeroing/catheter position accurate'],
      };
    },
    evidence: {
      summary: 'PVR = (mPAP − PCWP) / CO. ESC/ERS PH guidelines define elevated PVR with thresholds that have evolved (historically >3 WU; newer definitions lower).',
      formula: 'PVR (WU) = (mPAP − PCWP) / CO; ×80 for dyn·s·cm⁻⁵',
      validation: 'Standard RHC-derived parameter in PH guidelines.',
      references: [
        { title: 'ESC/ERS Guidelines for pulmonary hypertension', citation: 'Humbert M et al. Eur Heart J. 2022', year: 2022, pmid: '36017548', doi: '10.1093/eurheartj/ehac237' },
      ],
    },
    nextSteps: [
      { condition: 'Precapillary PH pattern', actions: ['mPAP elevated, PCWP ≤15, PVR elevated', 'Referral to PH center as indicated'] },
      { condition: 'Post-capillary pattern', actions: ['Optimize left heart disease', 'Diuresis / GDMT'] },
    ],
    pearls: ['1 WU = 80 dyn·s·cm⁻⁵.', 'DPG (diastolic PAP − PCWP) helps distinguish combined pre/post-capillary PH.'],
  },
  {
    id: 'qtc-framingham',
    name: 'Corrected QT (Framingham)',
    shortName: 'QTc Framingham',
    description: 'QTc using the Framingham linear correction formula.',
    category: 'cardiology',
    tags: ['ecg', 'qt', 'qtc', 'framingham'],
    whenToUse: 'QT correction when an alternative to Bazett/Fridericia is desired; Framingham performs well across HR ranges.',
    whyUse: 'Linear formula derived from Framingham Heart Study; less HR-biased than Bazett at extremes.',
    inputs: [
      numberInput('qt', 'QT interval', { unit: 'ms', min: 200, max: 800, defaultValue: 400 }),
      numberInput('hr', 'Heart rate', { unit: 'bpm', min: 30, max: 220, defaultValue: 70 }),
    ],
    calculate(values) {
      const qt = num(values.qt, 400);
      const hr = num(values.hr, 70);
      if (hr <= 0) {
        return { score: 0, label: 'Invalid HR', interpretation: 'HR must be > 0.', riskLevel: 'info' };
      }
      const rr = 60 / hr; // seconds
      // QTc = QT + 154 × (1 − RR) with QT in ms, RR in seconds
      const qtc = round(qt + 154 * (1 - rr), 0);

      let riskLevel: 'normal' | 'moderate' | 'high' | 'critical' = 'normal';
      let label = 'Normal QTc';
      let interpretation = `Framingham QTc ${qtc} ms.`;
      if (qtc >= 500) {
        riskLevel = 'critical';
        label = 'Markedly prolonged';
        interpretation = `QTc ${qtc} ms (≥500): high torsades risk — stop QT-prolonging drugs, replete K/Mg, telemetry.`;
      } else if (qtc >= 470) {
        riskLevel = 'high';
        label = 'Prolonged';
        interpretation = `QTc ${qtc} ms: prolonged (common cutoffs ≥470 ms women / ≥450–460 ms men — interpret with sex).`;
      } else if (qtc >= 440) {
        riskLevel = 'moderate';
        label = 'Borderline';
        interpretation = `QTc ${qtc} ms: borderline prolongation — review meds and electrolytes.`;
      } else if (qtc < 350) {
        riskLevel = 'moderate';
        label = 'Short QTc';
        interpretation = `QTc ${qtc} ms: short QTc — consider short QT syndrome workup if persistent and symptomatic/familial.`;
      } else {
        interpretation = `Framingham QTc ${qtc} ms within commonly accepted normal range for many adults.`;
      }

      return {
        score: qtc,
        unit: 'ms',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'QT', value: `${qt} ms` },
          { label: 'RR', value: `${round(rr, 3)} s` },
          { label: 'Formula', value: 'QTc = QT + 154×(1−RR)' },
        ],
        recommendations:
          qtc >= 500
            ? ['Telemetry', 'Discontinue QT-prolonging agents', 'Replete K⁺ and Mg²⁺', 'Consider cardiology/EP']
            : qtc >= 470
              ? ['Review medication list', 'Check electrolytes', 'Repeat ECG']
              : ['Document baseline', 'Reassess if new QT drugs started'],
      };
    },
    evidence: {
      summary: 'Framingham QTc uses a linear correction: QTc = QT + 154×(1−RR) (QT in ms, RR in seconds).',
      formula: 'QTc_Framingham = QT + 154 × (1 − RR)',
      validation: 'Derived in Framingham Heart Study; good performance across heart rates vs Bazett.',
      references: [
        {
          title: 'An improved method for adjusting the QT interval for heart rate (Framingham)',
          citation: 'Sagie A et al. Am J Cardiol. 1992',
          year: 1992,
          pmid: '1519533',
          doi: '10.1016/0002-9149(92)90562-d',
        },
      ],
    },
    nextSteps: [
      { condition: 'QTc ≥500 ms', actions: ['Acute TdP precautions', 'Med/electrolyte review', 'EP input if congenital concern'] },
    ],
    pearls: ['Always measure QT in lead with clearest T-wave end; use averaged RR if irregular.', 'Sex-specific cutoffs matter for mild prolongation.'],
  },
  {
    id: 'qtc-hodges',
    name: 'Corrected QT (Hodges)',
    shortName: 'QTc Hodges',
    description: 'QTc using the Hodges formula: QTc = QT + 1.75 × (HR − 60).',
    category: 'cardiology',
    tags: ['ecg', 'qt', 'qtc', 'hodges'],
    whenToUse: 'QT correction with a linear heart-rate formula alternative to Bazett.',
    whyUse: 'Simple linear correction; often better than Bazett at high/low HR.',
    inputs: [
      numberInput('qt', 'QT interval', { unit: 'ms', min: 200, max: 800, defaultValue: 400 }),
      numberInput('hr', 'Heart rate', { unit: 'bpm', min: 30, max: 220, defaultValue: 70 }),
    ],
    calculate(values) {
      const qt = num(values.qt, 400);
      const hr = num(values.hr, 70);
      const qtc = round(qt + 1.75 * (hr - 60), 0);

      let riskLevel: 'normal' | 'moderate' | 'high' | 'critical' = 'normal';
      let label = 'Normal QTc';
      let interpretation = `Hodges QTc ${qtc} ms.`;
      if (qtc >= 500) {
        riskLevel = 'critical';
        label = 'Markedly prolonged';
        interpretation = `QTc ${qtc} ms (≥500): high TdP risk.`;
      } else if (qtc >= 470) {
        riskLevel = 'high';
        label = 'Prolonged';
        interpretation = `QTc ${qtc} ms: prolonged — review drugs/electrolytes.`;
      } else if (qtc >= 440) {
        riskLevel = 'moderate';
        label = 'Borderline';
        interpretation = `QTc ${qtc} ms: borderline.`;
      } else if (qtc < 350) {
        riskLevel = 'moderate';
        label = 'Short QTc';
        interpretation = `QTc ${qtc} ms: short QTc.`;
      } else {
        interpretation = `Hodges QTc ${qtc} ms within typical range for many adults.`;
      }

      return {
        score: qtc,
        unit: 'ms',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'QT', value: `${qt} ms` },
          { label: 'HR', value: `${hr} bpm` },
          { label: 'Formula', value: 'QTc = QT + 1.75×(HR−60)' },
        ],
        recommendations:
          qtc >= 500
            ? ['Telemetry', 'Stop QT drugs', 'Replete K/Mg']
            : ['Compare with prior ECGs', 'Use consistent formula when serial tracking'],
      };
    },
    evidence: {
      summary: 'Hodges linear formula: QTc = QT + 1.75×(HR−60) with QT in milliseconds.',
      formula: 'QTc_Hodges = QT + 1.75 × (HR − 60)',
      validation: 'One of several linear/nonlinear corrections superior to Bazett at extreme HR in comparative studies.',
      references: [
        { title: 'QT interval corrections (Hodges linear formula)', citation: 'Hodges M et al. J Electrocardiol. 1983 (linear QT correction; classic ECG methods)', year: 1983,
          pmid: '34253795',
          doi: '10.1038/s41598-021-93774-9', url: 'https://en.wikipedia.org/wiki/QT_interval#Hodges_correction' },
      ],
    },
    nextSteps: [
      { condition: 'Prolonged QTc', actions: ['Medication review', 'Electrolytes', 'Repeat ECG'] },
    ],
    pearls: ['At HR 60, Hodges QTc equals raw QT.', 'Fridericia is often preferred in drug studies; be consistent within a patient.'],
  },
  {
    id: 'qt-prolongation-risk',
    name: 'Tisdale QTc Prolongation Risk Score',
    shortName: 'Tisdale Score',
    description: 'Predicts risk of significant QTc prolongation in hospitalized patients (Tisdale risk score).',
    category: 'cardiology',
    tags: ['qtc', 'tisdale', 'torsades', 'drug safety'],
    whenToUse: 'Hospitalized adults starting QT-prolonging drugs or with multiple TdP risk factors.',
    whyUse: 'Validated score to identify patients at low/moderate/high risk of QTc >500 ms or large QTc increase.',
    inputs: [
      yesNo('age68', 'Age ≥ 68 years', 1),
      yesNo('female', 'Female sex', 1),
      yesNo('loop', 'Loop diuretic', 1),
      yesNo('kLow', 'Serum K⁺ ≤ 3.5 mEq/L', 2),
      yesNo('qtc450', 'Admission QTc ≥ 450 ms', 2),
      yesNo('ami', 'Acute MI', 2),
      yesNo('oneQtDrug', '1 QTc-prolonging medication (+3)', 3),
      yesNo('twoQtDrugs', '≥2 QTc-prolonging medications (+6 total)', 6),
      yesNo('sepsis', 'Sepsis', 3),
      yesNo('hf', 'Heart failure', 3),
    ],
    calculate(values) {
      // Tisdale: 1 QT drug = +3; ≥2 QT drugs = +3 (for 1) + +3 (for ≥2) = +6 total
      const two = bool(values.twoQtDrugs);
      const one = bool(values.oneQtDrug);
      const qtDrugPts = two ? 6 : one ? 3 : 0;
      const score =
        (bool(values.age68) ? 1 : 0) +
        (bool(values.female) ? 1 : 0) +
        (bool(values.loop) ? 1 : 0) +
        (bool(values.kLow) ? 2 : 0) +
        (bool(values.qtc450) ? 2 : 0) +
        (bool(values.ami) ? 2 : 0) +
        qtDrugPts +
        (bool(values.sepsis) ? 3 : 0) +
        (bool(values.hf) ? 3 : 0);

      const r = riskFromThresholds(score, [
        {
          max: 6,
          level: 'low',
          label: 'Low risk (≤6)',
          interpretation: `Tisdale ${score}: low risk of significant QTc prolongation. Still use QT drugs judiciously.`,
        },
        {
          max: 10,
          level: 'moderate',
          label: 'Moderate risk (7–10)',
          interpretation: `Tisdale ${score}: moderate risk. Check baseline/serial ECGs and electrolytes when using QT-prolonging agents.`,
        },
        {
          max: 30,
          level: 'high',
          label: 'High risk (≥11)',
          interpretation: `Tisdale ${score}: high risk of QTc >500 ms or ≥60 ms rise. Avoid unnecessary QT drugs; monitor closely.`,
        },
      ]);

      return {
        score,
        ...r,
        details: [
          { label: 'QT-drug points', value: two ? '6 (≥2 drugs)' : one ? '3 (1 drug)' : '0' },
          { label: 'Max conceptual score', value: '~21 (1 vs ≥2 QT drugs mutually exclusive)' },
          { label: 'High-risk threshold', value: '≥ 11' },
        ],
        recommendations:
          score >= 11
            ? ['Avoid combination QT-prolonging drugs', 'Maintain K⁺ >4 and Mg²⁺ >2', 'Telemetry / serial QTc']
            : score >= 7
              ? ['Baseline ECG', 'Electrolyte repletion', 'Reassess drug list']
              : ['Standard medication safety practices'],
      };
    },
    evidence: {
      summary:
        'Tisdale et al.: age≥68 (1), female (1), loop diuretic (1), K≤3.5 (2), admission QTc≥450 (2), acute MI (2), 1 QT drug (3), ≥2 QT drugs (3 additional → 6 total), sepsis (3), HF (3).',
      formula: 'Sum of weighted risk factors (0–~21); ≥2 QT drugs score 6; low ≤6, moderate 7–10, high ≥11',
      validation: 'Derived and validated in hospitalized cardiology populations.',
      references: [
        {
          title: 'Development and validation of a risk score to predict QT interval prolongation',
          citation: 'Tisdale JE et al. Circ Cardiovasc Qual Outcomes. 2013',
          year: 2013,
          pmid: '23716032',
          doi: '10.1161/CIRCOUTCOMES.113.000152',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score ≥11', actions: ['Pharmacist review', 'Minimize QT agents', 'Aggressive electrolyte goals', 'Serial ECGs'] },
      { condition: 'Score 7–10', actions: ['ECG before and after QT drug', 'Replete K/Mg'] },
    ],
    pearls: ['Select either 1 or ≥2 QT-prolonging meds — not both.', 'CredibleMeds lists can identify QT-prolonging drugs.'],
  },
  {
    id: 'digoxin-level-interpret',
    name: 'Digoxin Level Interpretation',
    shortName: 'Digoxin Level',
    description: 'Educational interpretation of serum digoxin concentration risk bands (HF vs toxicity context).',
    category: 'cardiology',
    tags: ['digoxin', 'toxicity', 'therapeutic drug monitoring'],
    whenToUse: 'When a serum digoxin level is available and clinical context (efficacy vs toxicity) is being reviewed.',
    whyUse: 'Modern HF targets favor lower levels (≈0.5–0.9 ng/mL); toxicity risk rises as levels increase, especially >2 ng/mL.',
    inputs: [
      numberInput('level', 'Serum digoxin level', { unit: 'ng/mL', min: 0, max: 20, step: 0.1, defaultValue: 0.8 }),
      selectInput('indication', 'Primary context', [
        { label: 'Heart failure rate/symptom adjunct', value: 'hf' },
        { label: 'Atrial fibrillation rate control', value: 'af' },
        { label: 'Suspected toxicity', value: 'tox' },
      ]),
      yesNo('symptoms', 'Symptoms concerning for digoxin toxicity', 0, 'Nausea, visual changes, confusion, new arrhythmias, etc.'),
      yesNo('renalImpair', 'Significant renal impairment / acute kidney injury', 0),
    ],
    calculate(values) {
      const level = num(values.level, 0.8);
      const indication = String(values.indication ?? 'hf');
      const sx = bool(values.symptoms);
      const renal = bool(values.renalImpair);

      let label = '';
      let interpretation = '';
      let riskLevel: 'low' | 'normal' | 'moderate' | 'high' | 'critical' = 'normal';

      if (level < 0.5) {
        label = 'Below usual HF target';
        riskLevel = 'moderate';
        interpretation = `Level ${level} ng/mL: below commonly cited HF range (0.5–0.9). May be subtherapeutic for HF goals; interpret with heart rate and symptoms.`;
      } else if (level <= 0.9) {
        label = 'Optimal HF range';
        riskLevel = 'normal';
        interpretation = `Level ${level} ng/mL: within contemporary HF target range (~0.5–0.9 ng/mL) associated with benefit and lower toxicity in DIG analyses.`;
      } else if (level <= 1.2) {
        label = 'Acceptable / upper therapeutic';
        riskLevel = 'moderate';
        interpretation = `Level ${level} ng/mL: above preferred HF window; may still be used historically for AF rate control but toxicity risk rises. Consider dose reduction in HF.`;
      } else if (level <= 2.0) {
        label = 'Elevated';
        riskLevel = 'high';
        interpretation = `Level ${level} ng/mL: elevated. Increased adverse event risk; reassess dose, renal function, drug interactions (amiodarone, verapamil, macrolides, etc.).`;
      } else if (level <= 2.5) {
        label = 'Toxic range risk';
        riskLevel = 'critical';
        interpretation = `Level ${level} ng/mL: in traditional toxic range. Hold digoxin; evaluate arrhythmias, K⁺, renal function; consider Fab fragments if severe toxicity.`;
      } else {
        label = 'High / potentially life-threatening';
        riskLevel = 'critical';
        interpretation = `Level ${level} ng/mL: markedly elevated. High risk of severe toxicity — urgent management, possible digoxin-specific antibody fragments.`;
      }

      if (sx && level >= 1.2) {
        riskLevel = 'critical';
        interpretation += ' Clinical features of toxicity present — treat clinically, not by number alone.';
      } else if (sx && level < 1.2) {
        interpretation += ' Symptoms present even at lower level — still consider toxicity (especially with hypokalemia or interactions).';
        if (riskLevel === 'normal') riskLevel = 'moderate';
      }
      if (renal) {
        interpretation += ' Renal impairment prolongs digoxin half-life; levels may continue to rise.';
      }
      if (indication === 'af' && level <= 1.2 && level >= 0.5) {
        interpretation += ' AF rate-control targets are individualized; lower levels often preferred in older adults.';
      }

      const indicationLabel =
        indication === 'af' ? 'Atrial fibrillation rate control' : indication === 'tox' ? 'Suspected toxicity' : 'Heart failure rate/symptom adjunct';

      if (indication === 'tox' && riskLevel !== 'critical') {
        interpretation += ' Toxicity-context review: correlate ECG, electrolytes, and symptoms even when level is not frankly toxic.';
        if (riskLevel === 'normal') riskLevel = 'moderate';
      }

      return {
        score: level,
        unit: 'ng/mL',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Primary context', value: indicationLabel },
          { label: 'Toxicity symptoms', value: sx ? 'Yes' : 'No' },
          { label: 'Significant renal impairment', value: renal ? 'Yes' : 'No' },
          { label: 'HF preferred window', value: '0.5–0.9 ng/mL' },
          { label: 'Traditional toxicity concern', value: '>2.0 ng/mL (clinical correlation required)' },
          { label: 'Timing note', value: 'Draw ≥6–8h after dose (steady state preferred)' },
        ],
        recommendations:
          riskLevel === 'critical'
            ? ['Hold digoxin', 'ECG / telemetry', 'Check K⁺, Mg²⁺, creatinine', 'Poison control / consider digoxin Fab if severe']
            : level > 0.9
              ? ['Consider dose reduction', 'Review interactions and renal function', 'Repeat level at steady state']
              : ['Continue monitoring as indicated', 'Ensure correct draw timing'],
      };
    },
    evidence: {
      summary:
        'Post-hoc DIG trial analyses support lower digoxin concentrations (≈0.5–0.9 ng/mL) for HF. Toxicity is clinical; levels >2 ng/mL raise concern but severe toxicity can occur lower.',
      formula: 'Interpret concentration bands with clinical context',
      validation: 'Therapeutic drug monitoring standards and HF guideline digoxin statements.',
      references: [
        { title: 'Association of serum digoxin concentration and outcomes in DIG trial', citation: 'Rathore SS et al. JAMA. 2003', year: 2003, pmid: '12588271',
          doi: '10.1001/jama.289.7.871', },
        { title: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure (Executive Summary)', citation: 'Heidenreich PA et al. J Am Coll Cardiol. 2022', year: 2022, pmid: '35379504', doi: '10.1016/j.jacc.2021.12.011' },
      ],
    },
    nextSteps: [
      { condition: 'Suspected toxicity', actions: ['Hold drug', 'Supportive care', 'Fab for life-threatening arrhythmia/K⁺/level per protocol'] },
      { condition: 'Level >0.9 in HF', actions: ['Reduce dose', 'Recheck steady-state level'] },
    ],
    pearls: [
      'Hypokalemia, hypomagnesemia, and hypercalcemia potentiate toxicity at a given level.',
      'Steady-state levels require ~5–7 days with normal renal function (longer if CKD).',
    ],
  },
  {
    id: 'atria-stroke',
    name: 'ATRIA Stroke Risk Score',
    shortName: 'ATRIA Stroke',
    description: 'ATRIA score estimates thromboembolic stroke risk in atrial fibrillation (alternative to CHA₂DS₂-VASc).',
    category: 'cardiology',
    tags: ['afib', 'stroke', 'atria', 'anticoagulation'],
    whenToUse: 'Patients with non-valvular AF for stroke risk stratification (especially when comparing schemes).',
    whyUse: 'Includes renal function and proteinuria; age is weighted more heavily, with different points if prior stroke.',
    inputs: [
      selectInput('age', 'Age', [
        { label: '< 65 years', value: 'lt65' },
        { label: '65–74 years', value: '65_74' },
        { label: '75–84 years', value: '75_84' },
        { label: '≥ 85 years', value: 'ge85' },
      ]),
      yesNo('priorStroke', 'Prior stroke / TIA', null, 'Does not add a fixed point total — switches age weights (e.g. <65 → 8 pts if prior stroke)'),
      yesNo('female', 'Female sex', 1),
      yesNo('dm', 'Diabetes mellitus', 1),
      yesNo('chf', 'Congestive heart failure', 1),
      yesNo('htn', 'Hypertension', 1),
      yesNo('proteinuria', 'Proteinuria', 1),
      yesNo('renal', 'eGFR < 45 mL/min/1.73 m² or ESRD', 1),
    ],
    calculate(values) {
      const age = String(values.age ?? 'lt65');
      const prior = bool(values.priorStroke);
      // ATRIA: prior stroke changes age points only (not a separate +8 for all ages)
      // No prior: <65=0, 65–74=3, 75–84=5, ≥85=6
      // Prior stroke: <65=8, 65–74=7, 75–84=7, ≥85=9
      let agePts = 0;
      if (!prior) {
        if (age === 'lt65') agePts = 0;
        else if (age === '65_74') agePts = 3;
        else if (age === '75_84') agePts = 5;
        else agePts = 6;
      } else {
        if (age === 'lt65') agePts = 8;
        else if (age === '65_74') agePts = 7;
        else if (age === '75_84') agePts = 7;
        else agePts = 9;
      }
      const score =
        agePts +
        (bool(values.female) ? 1 : 0) +
        (bool(values.dm) ? 1 : 0) +
        (bool(values.chf) ? 1 : 0) +
        (bool(values.htn) ? 1 : 0) +
        (bool(values.proteinuria) ? 1 : 0) +
        (bool(values.renal) ? 1 : 0);

      const r = riskFromThresholds(score, [
        {
          max: 5,
          level: 'low',
          label: 'Low risk (0–5)',
          interpretation: `ATRIA ${score}: low predicted thromboembolism risk category in original scheme.`,
        },
        {
          max: 6,
          level: 'moderate',
          label: 'Moderate risk (6)',
          interpretation: `ATRIA ${score}: moderate risk category. Anticoagulation decisions individualized with bleeding risk.`,
        },
        {
          max: 20,
          level: 'high',
          label: 'High risk (≥7)',
          interpretation: `ATRIA ${score}: high thromboembolism risk category. Oral anticoagulation generally warranted unless contraindicated.`,
        },
      ]);

      return {
        score,
        ...r,
        details: [
          { label: 'Age points', value: String(agePts) },
          { label: 'Prior stroke weighting', value: prior ? 'Yes (higher age points)' : 'No' },
          { label: 'Risk categories', value: 'Low 0–5 · Moderate 6 · High ≥7' },
        ],
        recommendations:
          score >= 7
            ? ['Recommend OAC unless contraindicated', 'Prefer DOAC in most eligible patients', 'Assess bleeding risk']
            : score === 6
              ? ['Shared decision-making on OAC', 'Address modifiable risks']
              : ['Reassess if new risk factors', 'OAC may still be considered based on other schemes/preferences'],
      };
    },
    evidence: {
      summary:
        'ATRIA stroke risk score weights age heavily (and differently after prior stroke) and adds renal impairment and proteinuria to classic AF risk factors.',
      formula:
        'Age points (by prior stroke status) + female + DM + CHF + HTN + proteinuria + eGFR<45/ESRD (1 each for non-age factors)',
      validation: 'Derived in ATRIA cohort; compared with CHADS₂/CHA₂DS₂-VASc in external studies with mixed superiority claims.',
      references: [
        {
          title: 'A new risk scheme to predict ischemic stroke and other thromboembolism in atrial fibrillation: the ATRIA study',
          citation: 'Singer DE et al. J Am Heart Assoc. 2013',
          year: 2013, pmid: '23782923',
          doi: '10.1161/JAHA.113.000250', },
      ],
    },
    nextSteps: [
      { condition: 'High risk (≥7)', actions: ['Start/continue OAC', 'Lab monitoring for DOAC eligibility', 'Patient education'] },
      { condition: 'Low risk', actions: ['Confirm with CHA₂DS₂-VASc', 'Lifestyle and risk-factor control'] },
    ],
    pearls: ['Not for moderate–severe mitral stenosis or mechanical valves.', 'Proteinuria and low eGFR are distinctive ATRIA features.'],
  },
  {
    id: 'abc-stroke',
    name: 'ABC Stroke Score (Simplified Educational)',
    shortName: 'ABC-Stroke',
    description:
      'Simplified educational select-based version of ABC stroke risk concepts (Age, Biomarkers, Clinical history) for AF.',
    category: 'cardiology',
    tags: ['afib', 'stroke', 'abc', 'biomarker'],
    whenToUse: 'Educational stratification of AF stroke risk using age, prior stroke, and biomarker category proxies.',
    whyUse: 'Full ABC-stroke uses continuous NT-proBNP and hs-Tn with coefficients; this version teaches the domains with point bands.',
    inputs: [
      selectInput('age', 'Age', [
        { label: '< 65 years', value: 0, points: 0 },
        { label: '65–74 years', value: 1, points: 1 },
        { label: '≥ 75 years', value: 2, points: 2 },
      ]),
      yesNo('priorStroke', 'Prior stroke / TIA / systemic embolism', 2),
      selectInput('ntprobnp', 'NT-proBNP category (biomarker)', [
        { label: 'Low / normal for context', value: 0, points: 0 },
        { label: 'Moderately elevated', value: 1, points: 1 },
        { label: 'Markedly elevated', value: 2, points: 2 },
      ], undefined, 'Educational tertile proxy — not the full ABC continuous model'),
      selectInput('hstn', 'hs-Troponin category (biomarker)', [
        { label: 'Low / normal for context', value: 0, points: 0 },
        { label: 'Moderately elevated', value: 1, points: 1 },
        { label: 'Markedly elevated', value: 2, points: 2 },
      ], undefined, 'Educational tertile proxy'),
    ],
    calculate(values) {
      const score = num(values.age) + (bool(values.priorStroke) ? 2 : 0) + num(values.ntprobnp) + num(values.hstn);
      const r = riskFromThresholds(score, [
        {
          max: 1,
          level: 'low',
          label: 'Lower educational risk band',
          interpretation: `Simplified ABC-stroke points ${score}: lower band. Full ABC model required for calibrated annual rates.`,
        },
        {
          max: 3,
          level: 'moderate',
          label: 'Intermediate educational risk band',
          interpretation: `Simplified ABC-stroke points ${score}: intermediate band. Biomarkers add risk beyond clinical factors alone.`,
        },
        {
          max: 8,
          level: 'high',
          label: 'Higher educational risk band',
          interpretation: `Simplified ABC-stroke points ${score}: higher band — prior events and elevated biomarkers suggest elevated stroke risk.`,
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'Note', value: 'Educational domain score — NOT the published ABC continuous calculator' },
          { label: 'Domains', value: 'Age + prior stroke + NT-proBNP + hs-Tn categories' },
        ],
        recommendations: [
          'Use validated full ABC-stroke tool or CHA₂DS₂-VASc for treatment decisions',
          'Elevated biomarkers should prompt HF/CAD evaluation as well as stroke risk discussion',
        ],
      };
    },
    evidence: {
      summary:
        'ABC-stroke (Age, Biomarkers [NT-proBNP, hs-Tn], Clinical history of stroke) improves AF stroke risk discrimination vs clinical scores in research cohorts.',
      formula: 'Educational points: age tier + prior stroke + biomarker categories (simplified)',
      validation: 'Original ABC scores validated in ARISTOTLE/RE-LY biomarker substudies; this implementation is educational only.',
      references: [
        {
          title: 'The ABC (age, biomarkers, clinical history) stroke risk score',
          citation: 'Hijazi Z et al. Eur Heart J. 2016',
          year: 2016, pmid: '26920728', doi: '10.1093/eurheartj/ehw054' },
      ],
    },
    nextSteps: [
      { condition: 'Any elevated biomarker band', actions: ['Confirm labs', 'Evaluate structural heart disease', 'Do not rely on this simplified score alone for OAC decisions'] },
    ],
    pearls: ['Clearly labeled simplified — use official ABC calculators for absolute risk.', 'Biomarkers may reclassify risk vs CHA₂DS₂-VASc in research settings.'],
  },
  {
    id: 'abc-bleed',
    name: 'ABC Bleeding Score (Simplified Educational)',
    shortName: 'ABC-Bleed',
    description:
      'Simplified educational version of ABC bleeding risk domains for anticoagulated AF (Age, Biomarkers, Clinical history).',
    category: 'cardiology',
    tags: ['afib', 'bleeding', 'abc', 'anticoagulation'],
    whenToUse: 'Educational bleeding-risk discussion in AF on anticoagulation using age, prior bleed, and biomarker proxies.',
    whyUse: 'Full ABC-bleed uses GDF-15, hs-Tn, and hemoglobin with continuous coefficients; this teaches the concept with categories.',
    inputs: [
      selectInput('age', 'Age', [
        { label: '< 65 years', value: 0, points: 0 },
        { label: '65–74 years', value: 1, points: 1 },
        { label: '≥ 75 years', value: 2, points: 2 },
      ]),
      yesNo('priorBleed', 'Prior major bleeding', 2),
      selectInput('hb', 'Hemoglobin category', [
        { label: 'Normal', value: 0, points: 0 },
        { label: 'Mild anemia', value: 1, points: 1 },
        { label: 'Moderate–severe anemia', value: 2, points: 2 },
      ]),
      selectInput('hstn', 'hs-Troponin category', [
        { label: 'Low / normal', value: 0, points: 0 },
        { label: 'Moderately elevated', value: 1, points: 1 },
        { label: 'Markedly elevated', value: 2, points: 2 },
      ]),
      selectInput('gdf', 'GDF-15 category (if known)', [
        { label: 'Unknown / low', value: 0, points: 0 },
        { label: 'Moderately elevated', value: 1, points: 1 },
        { label: 'Markedly elevated', value: 2, points: 2 },
      ], undefined, 'GDF-15 often research-only; optional educational field'),
    ],
    calculate(values) {
      const score =
        num(values.age) +
        (bool(values.priorBleed) ? 2 : 0) +
        num(values.hb) +
        num(values.hstn) +
        num(values.gdf);
      const r = riskFromThresholds(score, [
        {
          max: 2,
          level: 'low',
          label: 'Lower educational bleed band',
          interpretation: `Simplified ABC-bleed points ${score}: lower band. High stroke risk may still favor OAC.`,
        },
        {
          max: 5,
          level: 'moderate',
          label: 'Intermediate educational bleed band',
          interpretation: `Simplified ABC-bleed points ${score}: intermediate band. Address modifiable bleed risks.`,
        },
        {
          max: 12,
          level: 'high',
          label: 'Higher educational bleed band',
          interpretation: `Simplified ABC-bleed points ${score}: higher band — prior bleed/anemia/biomarkers suggest elevated major bleed risk.`,
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'Note', value: 'Educational domain score — NOT the published ABC continuous calculator' },
          { label: 'Modifiable factors', value: 'BP control, alcohol, NSAIDs/antiplatelets, falls, anemia workup' },
        ],
        recommendations: [
          'Do not withhold indicated anticoagulation based solely on this simplified score',
          'Use HAS-BLED / full ABC-bleed / ORBIT for structured assessment',
          'Correct reversible bleeding risks',
        ],
      };
    },
    evidence: {
      summary:
        'ABC-bleed incorporates age, biomarkers (GDF-15, hs-Tn, hemoglobin), and prior bleeding to estimate major bleeding on anticoagulation.',
      formula: 'Educational points from age + prior bleed + Hb + hs-Tn + GDF-15 categories',
      validation: 'Original model from biomarker substudies of anticoagulation trials; this app version is simplified.',
      references: [
        {
          title: 'The ABC (age, biomarkers, clinical history) bleeding risk score',
          citation: 'Hijazi Z et al. Eur Heart J. 2016',
          year: 2016, pmid: '27056738', doi: '10.1016/S0140-6736(16)00741-8' },
      ],
    },
    nextSteps: [
      { condition: 'Higher band', actions: ['Review concomitant antithrombotics', 'GI protection when indicated', 'Closer follow-up'] },
    ],
    pearls: ['Bleeding risk scores identify modifiable risks — they rarely absolute contraindications to OAC when stroke risk is high.'],
  },
  {
    id: 'acef-score',
    name: 'ACEF Score',
    shortName: 'ACEF',
    description: 'Age, Creatinine, Ejection Fraction score for cardiac surgery mortality risk: Age/EF + 1 if Cr >2.0.',
    category: 'cardiology',
    tags: ['cardiac surgery', 'acef', 'perioperative', 'ef'],
    whenToUse: 'Patients evaluated for cardiac surgery when a simple mortality risk index is desired.',
    whyUse: 'Parsimonious score with discrimination comparable to more complex models in some surgical series.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 18, max: 100, defaultValue: 70 }),
      numberInput('ef', 'LVEF', { unit: '%', min: 10, max: 80, defaultValue: 50 }),
      numberInput('cr', 'Serum creatinine', { unit: 'mg/dL', min: 0.3, max: 15, step: 0.1, defaultValue: 1.0 }),
    ],
    calculate(values) {
      const age = num(values.age, 70);
      const ef = num(values.ef, 50);
      const cr = num(values.cr, 1);
      if (ef <= 0) {
        return { score: 0, label: 'Invalid EF', interpretation: 'EF must be > 0.', riskLevel: 'info' };
      }
      const crAdd = cr > 2.0 ? 1 : 0;
      const score = round(age / ef + crAdd, 2);

      const r = riskFromThresholds(score, [
        {
          max: 1.0,
          level: 'low',
          label: 'Lower ACEF',
          interpretation: `ACEF ${score}: lower surgical risk band in published ACEF strata (approximate).`,
        },
        {
          max: 1.3,
          level: 'moderate',
          label: 'Intermediate ACEF',
          interpretation: `ACEF ${score}: intermediate risk band. Combine with EuroSCORE/STS for operative planning.`,
        },
        {
          max: 10,
          level: 'high',
          label: 'Higher ACEF',
          interpretation: `ACEF ${score}: higher predicted operative risk — advanced age, low EF, and/or Cr >2.0.`,
        },
      ]);

      return {
        score,
        ...r,
        details: [
          { label: 'Age / EF', value: `${age} / ${ef} = ${round(age / ef, 2)}` },
          { label: 'Creatinine >2.0 add-on', value: crAdd ? '+1' : '0' },
          { label: 'Formula', value: 'ACEF = Age/EF(%) + 1 if Cr >2.0 mg/dL' },
        ],
        recommendations:
          score > 1.3
            ? ['Heart team discussion', 'Optimize volume/renal status', 'Consider STS/EuroSCORE II full models']
            : ['Routine preoperative optimization', 'Still compute institutional risk models as required'],
      };
    },
    evidence: {
      summary: 'ACEF = age (years) / EF (%) + 1 if serum creatinine >2.0 mg/dL. Developed for elective cardiac surgery mortality prediction.',
      formula: 'ACEF = Age/EF + (Cr > 2.0 ? 1 : 0)',
      validation: 'Ranucci et al.; good discrimination in multiple cardiac surgery cohorts; ACEF II later refined.',
      references: [
        {
          title: 'Risk stratification using age, creatinine, and ejection fraction (ACEF)',
          citation: 'Ranucci M et al. Circulation. 2009',
          year: 2009,
          pmid: '19506110',
          doi: '10.1161/CIRCULATIONAHA.108.842393',
        },
      ],
    },
    nextSteps: [
      { condition: 'Elevated ACEF', actions: ['Multidisciplinary heart team', 'Full STS/EuroSCORE documentation', 'Optimize comorbidities'] },
    ],
    pearls: ['Use EF as percentage (e.g., 40 not 0.40).', 'ACEF is not a substitute for STS when reporting official operative risk.'],
  },
  {
    id: 'euroscore-ii-simp',
    name: 'EuroSCORE II',
    shortName: 'EuroSCORE II',
    description:
      'Logistic EuroSCORE II (Nashef 2012) predicted in-hospital mortality after major cardiac surgery. Uses published β coefficients and intercept. Post-infarct VSD uses the original EuroSCORE logistic term (insufficient cases in the II derivation).',
    category: 'cardiology',
    tags: ['cardiac surgery', 'euroscore', 'perioperative', 'mortality', 'logistic'],
    whenToUse: 'Adults undergoing major cardiac surgery for in-hospital mortality estimate and consent discussion (alongside STS).',
    whyUse: 'EuroSCORE II recalibrated the original additive/logistic EuroSCORE on 2010 data. Official reporting should still confirm with euroscore.org / STS.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 18, max: 100, defaultValue: 70, helpText: 'Xi = 1 if age ≤60, then +1 per year above 60' }),
      selectInput('sex', 'Sex', [
        { label: 'Male', value: 'm' },
        { label: 'Female', value: 'f' },
      ]),
      numberInput('renal', 'Creatinine clearance (Cockcroft–Gault)', {
        unit: 'mL/min',
        min: 5,
        max: 200,
        defaultValue: 90,
        helpText: '>85 normal; 51–85 moderate; ≤50 severe (ignored if on dialysis)',
      }),
      yesNo('dialysis', 'On dialysis', null),
      yesNo('extracardiac', 'Extracardiac arteriopathy', null),
      yesNo('poorMobility', 'Poor mobility (neurologic or musculoskeletal)', null),
      yesNo('prevCardiacSx', 'Previous cardiac surgery', null),
      yesNo('copd', 'Chronic lung disease', null),
      yesNo('endocarditis', 'Active endocarditis', null),
      yesNo('critical', 'Critical preoperative state', null),
      yesNo('dmInsulin', 'Diabetes on insulin', null),
      selectInput('nyha', 'NYHA class', [
        { label: 'I', value: 1 },
        { label: 'II', value: 2 },
        { label: 'III', value: 3 },
        { label: 'IV', value: 4 },
      ]),
      yesNo('ccs4', 'CCS class 4 angina', null),
      selectInput('lvef', 'LV function', [
        { label: 'Good (EF ≥51%)', value: 0 },
        { label: 'Moderate (EF 31–50%)', value: 1 },
        { label: 'Poor (EF 21–30%)', value: 2 },
        { label: 'Very poor (EF ≤20%)', value: 3 },
      ]),
      yesNo('recentMi', 'Recent MI (≤90 days)', null),
      selectInput('pasp', 'PA systolic pressure', [
        { label: '<31 mmHg', value: 'n' },
        { label: '31–54 mmHg', value: 'm' },
        { label: '≥55 mmHg', value: 's' },
      ]),
      selectInput('urgency', 'Urgency', [
        { label: 'Elective', value: 0 },
        { label: 'Urgent', value: 1 },
        { label: 'Emergency', value: 2 },
        { label: 'Salvage', value: 3 },
      ]),
      selectInput('procedure', 'Weight of procedure', [
        { label: 'Isolated CABG', value: 0 },
        { label: 'Single non-CABG', value: 1 },
        { label: '2 procedures', value: 2 },
        { label: '3+ procedures', value: 3 },
      ]),
      yesNo('thoracicAorta', 'Thoracic aorta surgery', null),
      yesNo('vsd', 'Post-infarct VSD (original EuroSCORE factor)', null, 'Insufficient cases in EuroSCORE II derivation; original logistic coefficient applied and labelled'),
    ],
    calculate(values) {
      const age = num(values.age, 70);
      const ageXi = Math.max(1, age - 59); // ≤60 → 1; 61 → 2; …
      const crcl = num(values.renal, 90);
      const onDialysis = bool(values.dialysis);
      let y = -5.324537;
      y += 0.0285181 * ageXi;
      if (String(values.sex) === 'f') y += 0.2196434;
      if (onDialysis) y += 0.6421508;
      else if (crcl <= 50) y += 0.8592256;
      else if (crcl <= 85) y += 0.303553;
      if (bool(values.extracardiac)) y += 0.5360268;
      if (bool(values.poorMobility)) y += 0.2407181;
      if (bool(values.prevCardiacSx)) y += 1.118599;
      if (bool(values.copd)) y += 0.1886564;
      if (bool(values.endocarditis)) y += 0.6194522;
      if (bool(values.critical)) y += 1.086517;
      if (bool(values.dmInsulin)) y += 0.3542749;
      const nyha = num(values.nyha, 1);
      if (nyha === 2) y += 0.1070545;
      else if (nyha === 3) y += 0.2958358;
      else if (nyha === 4) y += 0.5597929;
      if (bool(values.ccs4)) y += 0.2226147;
      const lv = num(values.lvef, 0);
      if (lv === 1) y += 0.3150652;
      else if (lv === 2) y += 0.8084096;
      else if (lv === 3) y += 0.9346919;
      if (bool(values.recentMi)) y += 0.1528943;
      const pasp = String(values.pasp ?? 'n');
      if (pasp === 'm') y += 0.1788899;
      else if (pasp === 's') y += 0.3491475;
      const urg = num(values.urgency, 0);
      if (urg === 1) y += 0.3174673;
      else if (urg === 2) y += 0.7039121;
      else if (urg === 3) y += 1.362947;
      const proc = num(values.procedure, 0);
      if (proc === 1) y += 0.0062118;
      else if (proc === 2) y += 0.5521478;
      else if (proc === 3) y += 0.9724533;
      if (bool(values.thoracicAorta)) y += 0.6527205;
      if (bool(values.vsd)) y += 1.462009; // original logistic EuroSCORE VSD term
      const mort = round((Math.exp(y) / (1 + Math.exp(y))) * 100, 2);
      const r = riskFromThresholds(mort, [
        {
          max: 2,
          level: 'low',
          label: 'Lower predicted mortality',
          interpretation: `EuroSCORE II predicted in-hospital mortality ≈ ${mort}%. Lower-risk band for isolated elective surgery — still document STS when reporting.`,
        },
        {
          max: 5,
          level: 'moderate',
          label: 'Intermediate predicted mortality',
          interpretation: `EuroSCORE II ≈ ${mort}%. Intermediate operative risk — heart-team discussion as indicated.`,
        },
        {
          max: 10,
          level: 'high',
          label: 'High predicted mortality',
          interpretation: `EuroSCORE II ≈ ${mort}%. High predicted mortality — optimize comorbidities, consider less-invasive alternatives, and use STS in parallel.`,
        },
        {
          max: 100,
          level: 'critical',
          label: 'Very high predicted mortality',
          interpretation: `EuroSCORE II ≈ ${mort}%. Very high predicted mortality (critical state, salvage, combined procedures, dialysis). Confirm with official EuroSCORE II/STS tools.`,
        },
      ]);
      return {
        score: mort,
        unit: '%',
        ...r,
        details: [
          { label: 'Linear predictor y', value: String(round(y, 4)) },
          { label: 'Age Xi', value: String(ageXi) },
          { label: 'Renal coding', value: onDialysis ? 'Dialysis' : crcl <= 50 ? 'CrCl ≤50' : crcl <= 85 ? 'CrCl 51–85' : 'CrCl >85' },
          { label: 'VSD term', value: bool(values.vsd) ? 'Original EuroSCORE logistic β 1.462 applied' : 'Not applied' },
        ],
        recommendations: [
          'Confirm with official EuroSCORE II at euroscore.org for consent/risk reporting',
          'Also compute STS score where applicable',
          'Heart team discussion for elevated risk',
        ],
      };
    },
    evidence: {
      summary:
        'EuroSCORE II logistic model: predicted mortality = exp(y)/(1+exp(y)), y = −5.324537 + Σ βi Xi. Age Xi = 1 if ≤60, then +1 per year. Coefficients from Nashef et al. Table 6 (NYHA, CCS4, IDDM, female, arteriopathy, COPD, poor mobility, redo, dialysis / CrCl bands, endocarditis, critical state, LV function, recent MI, PA pressure, urgency, procedure weight, thoracic aorta). Post-infarct VSD uses the original logistic EuroSCORE coefficient (insufficient II cases).',
      formula: 'p = e^y / (1+e^y); y = −5.324537 + Σ published βi Xi',
      validation: 'Derived on 16 828 and validated on 5553 patients (2010 cohort). Discrimination AUC ≈0.81. Recalibration may be needed in contemporary series.',
      references: [
        {
          title: 'EuroSCORE II',
          citation: 'Nashef SA et al. Eur J Cardiothorac Surg. 2012',
          year: 2012,
          pmid: '22378855',
          doi: '10.1093/ejcts/ezs043',
        },
      ],
    },
    nextSteps: [
      { condition: 'Any operative planning', actions: ['Confirm official EuroSCORE II', 'Document STS risk', 'Heart team as needed'] },
      { condition: 'Predicted mortality ≥5–8%', actions: ['Optimize treatable risks', 'Consider PCI/TAVI/hybrid alternatives where appropriate'] },
    ],
    pearls: [
      'yesNo flags have no point badges — this is a logistic % model, not an additive points score.',
      'Age coding is Xi = 1 at age ≤60, not zero.',
      'Post-infarct VSD was dropped from EuroSCORE II for rarity; the original logistic coefficient is shown only if selected.',
    ],
  },
  {
    id: 'mehran-contrast',
    name: 'Mehran Contrast Nephropathy Risk Score',
    shortName: 'Mehran CIN',
    description: 'Predicts risk of contrast-induced nephropathy after PCI using Mehran score.',
    category: 'cardiology',
    tags: ['contrast', 'aki', 'pci', 'mehran', 'nephropathy'],
    whenToUse: 'Patients undergoing PCI when estimating contrast-induced nephropathy and dialysis risk.',
    whyUse: 'Widely used validated score for contrast-induced nephropathy risk stratification.',
    inputs: [
      yesNo('hypotension', 'Hypotension (SBP <80 for ≥1h requiring support)', 5),
      yesNo('iabp', 'Intra-aortic balloon pump', 5),
      yesNo('chf', 'CHF (NYHA III/IV or acute pulmonary edema)', 5),
      yesNo('age75', 'Age > 75 years', 4),
      yesNo('anemia', 'Anemia (Hct <39% men / <36% women)', 3),
      yesNo('dm', 'Diabetes mellitus', 3),
      numberInput('contrast', 'Contrast volume', { unit: 'mL', min: 0, max: 1000, step: 10, defaultValue: 200 }),
      selectInput('egfr', 'eGFR category (mL/min/1.73 m²)', [
        { label: '≥ 60', value: 0, points: 0 },
        { label: '40–59', value: 2, points: 2 },
        { label: '20–39', value: 4, points: 4 },
        { label: '< 20', value: 6, points: 6 },
      ]),
    ],
    calculate(values) {
      const contrast = num(values.contrast, 200);
      const contrastPts = Math.floor(contrast / 100); // 1 point per 100 mL
      const score =
        (bool(values.hypotension) ? 5 : 0) +
        (bool(values.iabp) ? 5 : 0) +
        (bool(values.chf) ? 5 : 0) +
        (bool(values.age75) ? 4 : 0) +
        (bool(values.anemia) ? 3 : 0) +
        (bool(values.dm) ? 3 : 0) +
        contrastPts +
        num(values.egfr);

      // Mehran CIN and dialysis risk rates
      let cin = '7.5%';
      let dial = '0.04%';
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
      let label = 'Low risk (≤5)';
      if (score <= 5) {
        cin = '7.5%';
        dial = '0.04%';
        riskLevel = 'low';
        label = 'Low risk (≤5)';
      } else if (score <= 10) {
        cin = '14%';
        dial = '0.12%';
        riskLevel = 'moderate';
        label = 'Moderate risk (6–10)';
      } else if (score <= 15) {
        cin = '26.1%';
        dial = '1.09%';
        riskLevel = 'high';
        label = 'High risk (11–15)';
      } else {
        cin = '57.3%';
        dial = '12.6%';
        riskLevel = 'critical';
        label = 'Very high risk (≥16)';
      }

      return {
        score,
        label,
        interpretation: `Mehran score ${score}: estimated CIN risk ~${cin}, dialysis risk ~${dial} (original PCI cohort rates).`,
        riskLevel,
        details: [
          { label: 'Approx. CIN risk', value: cin },
          { label: 'Approx. dialysis risk', value: dial },
          { label: 'Contrast volume points', value: `${contrastPts} (1 per 100 mL)` },
        ],
        recommendations:
          score >= 11
            ? ['Minimize contrast volume', 'Periprocedural hydration protocols', 'Hold nephrotoxins', 'Post-PCI Cr monitoring']
            : ['Standard CIN precautions', 'Adequate hydration', 'Use lowest contrast dose needed'],
      };
    },
    evidence: {
      summary:
        'Mehran score predicts contrast-induced nephropathy after PCI: hypotension (5), IABP (5), CHF (5), age>75 (4), anemia (3), DM (3), contrast 1 pt/100 mL, eGFR strata 2/4/6.',
      formula: 'Sum of weighted predictors (see inputs)',
      validation: 'Derived and validated in large PCI cohorts (Mehran et al. JACC 2004).',
      references: [
        {
          title: 'A simple risk score for prediction of contrast-induced nephropathy after PCI',
          citation: 'Mehran R et al. J Am Coll Cardiol. 2004',
          year: 2004,
          pmid: '15464318',
          doi: '10.1016/j.jacc.2004.06.068',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score ≥11', actions: ['Nephroprotection bundle', 'Staged procedures if feasible', 'Early nephrology if oliguria/AKI'] },
      { condition: 'Any PCI', actions: ['Document eGFR baseline', 'Limit contrast', 'Follow Cr 24–48h if elevated risk'] },
    ],
    pearls: ['Definition of CIN varies (e.g., Cr rise ≥0.5 mg/dL or ≥25%).', 'Hydration and contrast minimization remain primary prevention.'],
  },
  {
    id: 'forrester-class',
    name: 'Forrester Hemodynamic Classification',
    shortName: 'Forrester',
    description: 'Classifies acute MI / HF hemodynamics by cardiac index and PCWP (warm/cold × dry/wet).',
    category: 'critical-care',
    tags: ['hemodynamics', 'forrester', 'shock', 'pcwp', 'mi'],
    whenToUse: 'When CI and PCWP (or clinical surrogates) are available in acute HF/MI shock phenotyping.',
    whyUse: 'Classic 2×2 profile that guides diuretics, inotropes, and vasodilators.',
    inputs: [
      numberInput('ci', 'Cardiac index (CI)', { unit: 'L/min/m²', min: 0.5, max: 6, step: 0.1, defaultValue: 2.4 }),
      numberInput('pcwp', 'PCWP (wedge)', { unit: 'mmHg', min: 0, max: 50, defaultValue: 16 }),
    ],
    calculate(values) {
      const ci = num(values.ci, 2.4);
      const pcwp = num(values.pcwp, 16);
      const cold = ci <= 2.2;
      const wet = pcwp > 18;

      let cls = 1;
      let label = '';
      let interpretation = '';
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
      const recommendations: string[] = [];

      if (!cold && !wet) {
        cls = 1;
        label = 'Forrester I — Warm and dry';
        interpretation = `CI ${ci} (>2.2) and PCWP ${pcwp} (≤18): normal perfusion without congestion. Best prognosis profile.`;
        riskLevel = 'low';
        recommendations.push('Observe', 'Standard MI/HF care', 'Avoid unnecessary vasoactive drugs');
      } else if (!cold && wet) {
        cls = 2;
        label = 'Forrester II — Warm and wet';
        interpretation = `CI ${ci} (>2.2) and PCWP ${pcwp} (>18): congested but perfused. Pulmonary edema physiology.`;
        riskLevel = 'moderate';
        recommendations.push('Diuretics', 'Vasodilators if BP allows (nitroglycerin/nitroprusside)', 'Oxygen / NIPPV as needed');
      } else if (cold && !wet) {
        cls = 3;
        label = 'Forrester III — Cold and dry';
        interpretation = `CI ${ci} (≤2.2) and PCWP ${pcwp} (≤18): hypoperfusion without congestion — consider hypovolemia or RV failure.`;
        riskLevel = 'high';
        recommendations.push('Cautious fluids if RV infarct/hypovolemia', 'Avoid empiric diuresis', 'Reassess diagnosis (RV MI, tamponade, bleeding)');
      } else {
        cls = 4;
        label = 'Forrester IV — Cold and wet';
        interpretation = `CI ${ci} (≤2.2) and PCWP ${pcwp} (>18): cardiogenic shock profile — hypoperfusion with congestion.`;
        riskLevel = 'critical';
        recommendations.push('Shock team', 'Inotropes / vasopressors as needed', 'Revascularize if ACS', 'Consider MCS');
      }

      return {
        score: cls,
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Perfusion', value: cold ? 'Cold (CI ≤2.2)' : 'Warm (CI >2.2)' },
          { label: 'Congestion', value: wet ? 'Wet (PCWP >18)' : 'Dry (PCWP ≤18)' },
          { label: 'Cutoffs used', value: 'CI 2.2 L/min/m² · PCWP 18 mmHg' },
        ],
        recommendations,
      };
    },
    evidence: {
      summary:
        'Forrester et al. stratified AMI patients by CI (cutoff 2.2 L/min/m²) and PCWP (cutoff 18 mmHg) into four hemodynamic subsets with distinct mortality and therapy implications.',
      formula: 'I: CI>2.2 & PCWP≤18; II: CI>2.2 & PCWP>18; III: CI≤2.2 & PCWP≤18; IV: CI≤2.2 & PCWP>18',
      validation: 'Classic Swan-Ganz era classification; clinical wet/cold exam often used when catheters unavailable.',
      references: [
        {
          title: 'Medical therapy of acute myocardial infarction by application of hemodynamic subsets',
          citation: 'Forrester JS et al. N Engl J Med. 1976',
          year: 1976, pmid: '790194',
          doi: '10.1056/NEJM197612162952505', },
      ],
    },
    nextSteps: [
      { condition: 'Class II', actions: ['Decongest', 'Afterload reduction if hypertensive/normotensive'] },
      { condition: 'Class IV', actions: ['Treat as cardiogenic shock', 'Urgent etiology-specific therapy'] },
      { condition: 'Class III', actions: ['Volume challenge if appropriate', 'Exclude RV MI'] },
    ],
    pearls: ['Clinical exam (warm/cold, wet/dry) approximates invasive Forrester profiles.', 'SCAI shock stages refine modern shock care beyond Forrester alone.'],
  },
];
