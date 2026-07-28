import type { Calculator } from '../../types/calculator';
import { num, bool, round, yesNo, selectInput, numberInput, riskFromThresholds } from '../../utils/helpers';

export const cardiologyCalcs: Calculator[] = [
  {
    id: 'cha2ds2-vasc',
    name: 'CHA₂DS₂-VASc Score',
    shortName: 'CHA₂DS₂-VASc',
    description: 'Estimates stroke risk in patients with non-valvular atrial fibrillation to guide anticoagulation.',
    category: 'cardiology',
    tags: ['afib', 'stroke', 'anticoagulation', 'af'],
    whenToUse: 'Patients with non-valvular atrial fibrillation to assess annual stroke risk and need for anticoagulation.',
    whyUse: 'Widely validated; guideline-recommended (AHA/ACC/HRS, ESC) for stroke risk stratification in AF.',
    inputs: [
      yesNo('chf', 'Congestive heart failure / LV dysfunction', 1),
      yesNo('htn', 'Hypertension', 1),
      selectInput('age', 'Age', [
        { label: '< 65 years', value: 0, points: 0 },
        { label: '65–74 years', value: 1, points: 1 },
        { label: '≥ 75 years', value: 2, points: 2 },
      ]),
      yesNo('dm', 'Diabetes mellitus', 1),
      yesNo('stroke', 'Prior stroke / TIA / thromboembolism', 2),
      yesNo('vascular', 'Vascular disease (prior MI, PAD, aortic plaque)', 1),
      selectInput('sex', 'Sex', [
        { label: 'Male', value: 0, points: 0 },
        { label: 'Female', value: 1, points: 1 },
      ]),
    ],
    calculate(values) {
      const score =
        (bool(values.chf) ? 1 : 0) +
        (bool(values.htn) ? 1 : 0) +
        num(values.age) +
        (bool(values.dm) ? 1 : 0) +
        (bool(values.stroke) ? 2 : 0) +
        (bool(values.vascular) ? 1 : 0) +
        num(values.sex);
      const riskMap: Record<number, string> = {
        0: '0%',
        1: '1.3%',
        2: '2.2%',
        3: '3.2%',
        4: '4.0%',
        5: '6.7%',
        6: '9.8%',
        7: '9.6%',
        8: '12.5%',
        9: '15.2%',
      };
      const annual = riskMap[Math.min(score, 9)] ?? '>15%';
      let riskLevel: 'low' | 'moderate' | 'high' = 'low';
      let label = 'Low risk';
      let interpretation = 'Low stroke risk. Anticoagulation generally not recommended (especially men with score 0).';
      if (score === 1) {
        riskLevel = 'moderate';
        label = 'Low–moderate risk';
        interpretation = 'Consider anticoagulation based on sex and shared decision-making (women with score 1 from sex alone often do not need OAC).';
      } else if (score >= 2) {
        riskLevel = 'high';
        label = 'Elevated risk';
        interpretation = `Elevated annual stroke risk (~${annual}). Oral anticoagulation is generally recommended unless contraindicated.`;
      }
      return {
        score,
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Annual stroke risk (approx.)', value: annual },
          { label: 'Max score', value: '9' },
        ],
        recommendations:
          score >= 2
            ? ['Recommend oral anticoagulation (DOAC preferred over warfarin in most patients)', 'Assess bleeding risk (e.g., HAS-BLED)', 'Discuss fall risk, adherence, and preferences']
            : ['Reassess if new risk factors develop', 'Address modifiable cardiovascular risks'],
      };
    },
    evidence: {
      summary: 'CHA₂DS₂-VASc refines CHADS₂ by adding vascular disease, age 65–74, and female sex. Validated in multiple large registries.',
      formula: 'CHF (1) + HTN (1) + Age≥75 (2) + DM (1) + Stroke/TIA (2) + Vascular (1) + Age 65–74 (1) + Female (1)',
      validation: 'Derived and validated in European and global AF cohorts; incorporated into major society guidelines.',
      references: [
        { title: 'Refining clinical risk stratification for predicting stroke and thromboembolism in AF', citation: 'Lip GY et al. Chest. 2010', year: 2010, pmid: '19762550',
          doi: '10.1378/chest.09-1584', },
        { title: '2019 AHA/ACC/HRS Focused Update of AF Guidelines', citation: 'January CT et al. Circulation. 2019', year: 2019, pmid: '30686041',
          doi: '10.1161/CIR.0000000000000665', },
      ],
    },
    nextSteps: [
      {
        condition: 'Score ≥ 2 (men) or ≥ 3 (women)',
        actions: ['Start or continue DOAC unless contraindicated', 'Check CBC, renal/hepatic function before DOAC', 'Educate on adherence and bleeding signs'],
      },
      {
        condition: 'Score 0–1',
        actions: ['Generally no anticoagulation for men with 0', 'Individualize for score 1', 'Control HTN, DM, lifestyle factors'],
      },
    ],
    pearls: ['Female sex alone (score 1) is not usually an indication for anticoagulation.', 'Do not use for valvular AF (moderate–severe mitral stenosis or mechanical valves).'],
  },
  {
    id: 'has-bled',
    name: 'HAS-BLED Score',
    shortName: 'HAS-BLED',
    description: 'Estimates major bleeding risk in patients with atrial fibrillation on anticoagulation.',
    category: 'cardiology',
    tags: ['bleeding', 'afib', 'anticoagulation'],
    whenToUse: 'Patients with AF being considered for or already on oral anticoagulation to estimate bleeding risk.',
    whyUse: 'Identifies modifiable bleeding risks; high score is not an automatic reason to withhold anticoagulation.',
    inputs: [
      yesNo('htn', 'Uncontrolled hypertension (SBP >160)', 1),
      yesNo('renal', 'Abnormal renal function (dialysis, transplant, Cr ≥2.26 mg/dL / ≥200 µmol/L)', 1),
      yesNo('liver', 'Abnormal liver function (cirrhosis or bili >2× + AST/ALT >3×)', 1),
      yesNo('stroke', 'Prior stroke', 1),
      yesNo('bleed', 'Bleeding history or predisposition', 1),
      yesNo('labile', 'Labile INR (if on warfarin; TTR <60%)', 1),
      yesNo('elderly', 'Elderly (age >65)', 1),
      yesNo('drugs', 'Drugs (concomitant antiplatelet or NSAID)', 1),
      yesNo('alcohol', 'Alcohol excess (≥8 drinks/week)', 1),
    ],
    calculate(values) {
      // Original HAS-BLED: drugs and alcohol are separate points (max 9)
      const score = ['htn', 'renal', 'liver', 'stroke', 'bleed', 'labile', 'elderly', 'drugs', 'alcohol'].reduce(
        (s, k) => s + (bool(values[k]) ? 1 : 0),
        0
      );
      const r = riskFromThresholds(score, [
        { max: 2, level: 'low', label: 'Low bleeding risk', interpretation: `HAS-BLED ${score}: lower major bleeding risk. Still counsel on bleeding precautions.` },
        { max: 10, level: 'high', label: 'High bleeding risk', interpretation: `HAS-BLED ${score}: elevated major bleeding risk (~≥3.7%/yr in original data for ≥3). Address modifiable factors; do not automatically stop anticoagulation if stroke risk is high.` },
      ]);
      return {
        score,
        ...r,
        details: [{ label: 'High-risk threshold', value: '≥ 3' }, { label: 'Max score', value: '9' }],
        recommendations:
          score >= 3
            ? ['Correct reversible factors (BP, alcohol, NSAIDs, labile INR)', 'Consider DOAC over warfarin', 'Closer follow-up and fall-risk mitigation']
            : ['Routine bleeding counseling', 'Periodic reassessment'],
      };
    },
    evidence: {
      summary: 'HAS-BLED predicts major bleeding in anticoagulated AF patients and highlights modifiable risk factors. Drugs and alcohol each score 1 point (max 9).',
      formula: 'H + A (renal) + A (liver) + S + B + L + E + D (drugs) + (alcohol) — 1 each, max 9',
      validation: 'Validated in Euro Heart Survey and subsequent AF cohorts.',
      references: [
        { title: 'A novel user-friendly score (HAS-BLED) to assess 1-year risk of major bleeding', citation: 'Pisters R et al. Chest. 2010', year: 2010, pmid: '20299623',
          doi: '10.1378/chest.10-0134', },
      ],
    },
    nextSteps: [
      {
        condition: 'Score ≥ 3',
        actions: ['Review and modify BP, alcohol, concomitant antiplatelets/NSAIDs', 'Ensure indication for OAC remains strong', 'Schedule closer monitoring'],
      },
      {
        condition: 'Any score',
        actions: ['Balance with CHA₂DS₂-VASc stroke risk', 'High HAS-BLED alone should not preclude indicated anticoagulation'],
      },
    ],
  },
  {
    id: 'heart-score',
    name: 'HEART Score for Major Cardiac Events',
    shortName: 'HEART Score',
    description: 'Risk stratifies patients with chest pain for MACE (MI, revascularization, death) at 6 weeks.',
    category: 'cardiology',
    tags: ['chest pain', 'acs', 'er', 'troponin'],
    whenToUse: 'ED patients ≥21 years with chest pain concerning for ACS.',
    whyUse: 'Simple bedside score that identifies low-risk patients who may be candidates for early discharge.',
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
        { label: '≥3 risk factors or history of atherosclerotic disease', value: 2, points: 2 },
      ], undefined, 'HTN, HLD, DM, obesity, smoking, positive family history'),
      selectInput('troponin', 'Troponin', [
        { label: '≤ normal limit', value: 0, points: 0 },
        { label: '1–3× normal limit', value: 1, points: 1 },
        { label: '> 3× normal limit', value: 2, points: 2 },
      ]),
    ],
    calculate(values) {
      const score = num(values.history) + num(values.ecg) + num(values.age) + num(values.risk) + num(values.troponin);
      const r = riskFromThresholds(score, [
        { max: 3, level: 'low', label: 'Low risk (0–3)', interpretation: 'MACE risk ~0.9–1.7%. Consider early discharge with outpatient follow-up if clinically appropriate.' },
        { max: 6, level: 'moderate', label: 'Moderate risk (4–6)', interpretation: 'MACE risk ~12–16.6%. Admit for observation, serial troponins, and further testing as indicated.' },
        { max: 10, level: 'high', label: 'High risk (7–10)', interpretation: 'MACE risk ~50–65%. Early invasive strategy and cardiology involvement often warranted.' },
      ]);
      return { score, ...r, details: [{ label: 'MACE endpoint', value: 'Death, MI, or revasc at 6 weeks' }] };
    },
    evidence: {
      summary: 'HEART score uses History, ECG, Age, Risk factors, and Troponin (0–2 each). Validated for ED chest pain risk stratification.',
      formula: 'History (0–2) + ECG (0–2) + Age (0–2) + Risk factors (0–2) + Troponin (0–2) = 0–10',
      validation: 'Multiple prospective validations in ED chest pain cohorts.',
      references: [
        { title: 'Chest pain in the emergency room: value of the HEART score', citation: 'Six AJ et al. Neth Heart J. 2008', year: 2008, pmid: '18665203',
          doi: '10.1007/BF03086144', },
        { title: 'A prospective validation of the HEART score', citation: 'Backus BE et al. Int J Cardiol. 2013', year: 2013, pmid: '23465250',
          doi: '10.1016/j.ijcard.2013.01.255', },
      ],
    },
    nextSteps: [
      { condition: 'Score 0–3', actions: ['Consider discharge if serial exams/troponins reassuring', 'Arrange timely outpatient follow-up', 'Return precautions for worsening symptoms'] },
      { condition: 'Score 4–6', actions: ['Observation / admission', 'Serial ECGs and troponins', 'Stress testing or CTA as appropriate'] },
      { condition: 'Score 7–10', actions: ['Urgent cardiology consultation', 'Consider early angiography', 'Anti-ischemic therapy per ACS protocols'] },
    ],
  },
  {
    id: 'timi-ua',
    name: 'TIMI Risk Score (UA/NSTEMI)',
    shortName: 'TIMI UA/NSTEMI',
    description: 'Predicts 14-day risk of death, MI, or urgent revascularization in UA/NSTEMI.',
    category: 'cardiology',
    tags: ['acs', 'nstemi', 'timi'],
    whenToUse: 'Patients with unstable angina or NSTEMI.',
    whyUse: 'Guides intensity of therapy and early invasive vs conservative strategies.',
    inputs: [
      yesNo('age65', 'Age ≥ 65 years', 1),
      yesNo('risk3', '≥3 CAD risk factors (FHx, HTN, HLD, DM, smoking)', 1),
      yesNo('knownCad', 'Known CAD (stenosis ≥50%)', 1),
      yesNo('asa', 'Aspirin use in past 7 days', 1),
      yesNo('severe', 'Severe angina (≥2 episodes in 24h)', 1),
      yesNo('st', 'ST deviation ≥0.5 mm', 1),
      yesNo('marker', 'Positive cardiac marker', 1),
    ],
    calculate(values) {
      const keys = ['age65', 'risk3', 'knownCad', 'asa', 'severe', 'st', 'marker'];
      const score = keys.reduce((s, k) => s + (bool(values[k]) ? 1 : 0), 0);
      // Antman JAMA 2000: scores 0/1 share 4.7%; 6/7 share 40.9%
      const risks = ['4.7%', '4.7%', '8.3%', '13.2%', '19.9%', '26.2%', '40.9%', '40.9%'];
      const r = riskFromThresholds(score, [
        { max: 2, level: 'low', label: 'Low risk', interpretation: `14-day event risk ~${risks[score]}. Consider conservative or selective invasive strategy.` },
        { max: 4, level: 'moderate', label: 'Intermediate risk', interpretation: `14-day event risk ~${risks[score]}. Early invasive strategy often preferred.` },
        { max: 7, level: 'high', label: 'High risk', interpretation: `14-day event risk ~${risks[score]}. Early invasive management and aggressive medical therapy.` },
      ]);
      return { score, ...r, details: [{ label: 'Approx. 14-day risk', value: risks[score] }] };
    },
    evidence: {
      summary: 'Derived from TIMI 11B / ESSENCE trials for UA/NSTEMI short-term ischemic risk.',
      formula: '7 binary predictors, 1 point each (score 0–7)',
      validation: 'Widely validated; used alongside GRACE in ACS guidelines.',
      references: [{ title: 'The TIMI risk score for unstable angina/NSTEMI', citation: 'Antman EM et al. JAMA. 2000', year: 2000, pmid: '10938172',
          doi: '10.1001/jama.284.7.835', }],
    },
    nextSteps: [
      { condition: 'Low (0–2)', actions: ['Medical management', 'Risk-factor modification', 'Selective stress testing'] },
      { condition: 'Intermediate–High (≥3)', actions: ['Dual antiplatelet therapy as indicated', 'Anticoagulation per protocol', 'Early invasive angiography (≤24–72h based on risk)'] },
    ],
  },
  {
    id: 'timi-stemi',
    name: 'TIMI Risk Score (STEMI)',
    shortName: 'TIMI STEMI',
    description: 'Predicts 30-day mortality in STEMI patients.',
    category: 'cardiology',
    tags: ['stemi', 'acs', 'mortality'],
    whenToUse: 'Patients with ST-elevation myocardial infarction.',
    whyUse: 'Simple bedside mortality risk estimate for counseling and resource planning.',
    inputs: [
      yesNo('age65', 'Age 65–74 years', 2),
      yesNo('age75', 'Age ≥ 75 years', 3, 'Use instead of 65–74 if applicable'),
      yesNo('dmHtnAngina', 'DM, HTN, or angina', 1),
      yesNo('sbp100', 'SBP < 100 mmHg', 3),
      yesNo('hr100', 'Heart rate > 100 bpm', 2),
      yesNo('killip2', 'Killip II–IV', 2),
      yesNo('weight67', 'Weight < 67 kg', 1),
      yesNo('anterior', 'Anterior STEMI or LBBB', 1),
      yesNo('time4', 'Time to treatment > 4 hours', 1),
    ],
    calculate(values) {
      let score = 0;
      if (bool(values.age75)) score += 3;
      else if (bool(values.age65)) score += 2;
      score += bool(values.dmHtnAngina) ? 1 : 0;
      score += bool(values.sbp100) ? 3 : 0;
      score += bool(values.hr100) ? 2 : 0;
      score += bool(values.killip2) ? 2 : 0;
      score += bool(values.weight67) ? 1 : 0;
      score += bool(values.anterior) ? 1 : 0;
      score += bool(values.time4) ? 1 : 0;
      const mort: Record<number, string> = {
        0: '0.8%', 1: '1.6%', 2: '2.2%', 3: '4.4%', 4: '7.3%', 5: '12%', 6: '16%', 7: '23%', 8: '27%',
      };
      // Morrow: score >8 ≈ 35.9% (do not clamp to key 8)
      const m = score > 8 ? '35.9%' : (mort[score] ?? '—');
      const r = riskFromThresholds(score, [
        { max: 2, level: 'low', label: 'Lower mortality risk', interpretation: `Approx. 30-day mortality ~${m}.` },
        { max: 4, level: 'moderate', label: 'Intermediate mortality risk', interpretation: `Approx. 30-day mortality ~${m}.` },
        { max: 20, level: 'high', label: 'High mortality risk', interpretation: `Approx. 30-day mortality ~${m}. Aggressive supportive care and reperfusion.` },
      ]);
      return { score, ...r, details: [{ label: 'Approx. 30-day mortality', value: m }] };
    },
    evidence: {
      summary: 'TIMI STEMI score from InTIME II trial predicts 30-day mortality using clinical variables available at presentation.',
      formula: 'Age + DM/HTN/angina + SBP + HR + Killip + weight + anterior/LBBB + time-to-tx',
      validation: 'Validated externally in multiple STEMI registries.',
      references: [{ title: 'TIMI risk score for STEMI', citation: 'Morrow DA et al. Circulation. 2000', year: 2000, pmid: '11044416',
          doi: '10.1161/01.cir.102.17.2031', }],
    },
    nextSteps: [
      { condition: 'All STEMI', actions: ['Emergent reperfusion (PCI preferred)', 'Dual antiplatelet + anticoagulation', 'Monitor for shock, arrhythmia, mechanical complications'] },
    ],
  },
  {
    id: 'grace',
    name: 'GRACE Score (Simplified ACS)',
    shortName: 'GRACE',
    description: 'Estimates in-hospital and 6-month mortality risk in ACS using key clinical variables.',
    category: 'cardiology',
    tags: ['acs', 'mortality', 'grace'],
    whenToUse: 'UA, NSTEMI, or STEMI for mortality risk stratification.',
    whyUse: 'Guideline-endorsed comprehensive ACS risk model.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 18, max: 110, defaultValue: 65 }),
      numberInput('hr', 'Heart rate', { unit: 'bpm', min: 20, max: 250, defaultValue: 80 }),
      numberInput('sbp', 'Systolic BP', { unit: 'mmHg', min: 50, max: 250, defaultValue: 130 }),
      numberInput('creat', 'Creatinine', { unit: 'mg/dL', min: 0.1, max: 20, step: 0.1, defaultValue: 1.0 }),
      selectInput('killip', 'Killip class', [
        { label: 'I — No HF', value: 1 },
        { label: 'II — Rales / JVD', value: 2 },
        { label: 'III — Pulmonary edema', value: 3 },
        { label: 'IV — Cardiogenic shock', value: 4 },
      ]),
      yesNo('arrest', 'Cardiac arrest at admission', 1),
      yesNo('st', 'ST-segment deviation', 1),
      yesNo('enzyme', 'Elevated cardiac enzymes/markers', 1),
    ],
    calculate(values) {
      // Simplified linear approximation of GRACE for educational bedside use
      const age = num(values.age, 65);
      const hr = num(values.hr, 80);
      const sbp = num(values.sbp, 130);
      const cr = num(values.creat, 1);
      const killip = num(values.killip, 1);
      let score = 0;
      score += age * 0.7;
      score += hr * 0.4;
      score += Math.max(0, 200 - sbp) * 0.3;
      score += cr * 20;
      score += (killip - 1) * 20;
      if (bool(values.arrest)) score += 40;
      if (bool(values.st)) score += 15;
      if (bool(values.enzyme)) score += 10;
      score = Math.round(score);
      const r = riskFromThresholds(score, [
        { max: 100, level: 'low', label: 'Lower risk', interpretation: 'Lower estimated mortality. Still treat ACS per guidelines.' },
        { max: 140, level: 'moderate', label: 'Intermediate risk', interpretation: 'Intermediate estimated mortality. Consider early invasive strategy for NSTE-ACS.' },
        { max: 400, level: 'high', label: 'High risk', interpretation: 'High estimated mortality. Aggressive care and early invasive approach.' },
      ]);
      return {
        score,
        ...r,
        details: [{ label: 'Note', value: 'Simplified educational approximation of GRACE' }],
        recommendations: ['Use full GRACE 2.0 calculator for formal risk estimates when available'],
      };
    },
    evidence: {
      summary: 'GRACE uses age, HR, SBP, creatinine, Killip class, arrest, ST deviation, and enzymes. Full model available from outcomes-umassmed.org.',
      formula: 'Multivariable model (simplified linear form used here for education)',
      validation: 'Derived from GRACE registry (>100,000 ACS patients); extensively validated.',
      references: [{ title: 'Prediction of risk of death and MI in the six months after presentation with ACS', citation: 'Fox KA et al. BMJ. 2006', year: 2006, pmid: '17032691',
          doi: '10.1136/bmj.38985.646481.55', }],
    },
    nextSteps: [
      { condition: 'High GRACE', actions: ['Early invasive strategy (NSTE-ACS)', 'ICU-level monitoring if unstable', 'Optimize GDMT'] },
      { condition: 'Low–intermediate', actions: ['Risk-appropriate timing of angiography', 'Medical optimization'] },
    ],
  },
  {
    id: 'killip',
    name: 'Killip Classification',
    shortName: 'Killip Class',
    description: 'Clinical classification of heart failure severity in acute MI.',
    category: 'cardiology',
    tags: ['mi', 'heart failure', 'prognosis'],
    whenToUse: 'Patients with acute myocardial infarction to grade HF severity.',
    whyUse: 'Classic bedside prognostic tool; still used in GRACE and clinical practice.',
    inputs: [
      selectInput('class', 'Killip class findings', [
        { label: 'Class I — No clinical HF', value: 1 },
        { label: 'Class II — Mild HF (S3, rales <½ lung fields, JVD)', value: 2 },
        { label: 'Class III — Acute pulmonary edema', value: 3 },
        { label: 'Class IV — Cardiogenic shock', value: 4 },
      ]),
    ],
    calculate(values) {
      const c = num(values.class, 1);
      const map: Record<number, CalcOut> = {
        1: { label: 'Killip I', interpretation: 'No clinical heart failure. Lowest mortality group historically (~6%).', riskLevel: 'low' },
        2: { label: 'Killip II', interpretation: 'Mild heart failure. Intermediate risk; diuretics/afterload reduction as needed.', riskLevel: 'moderate' },
        3: { label: 'Killip III', interpretation: 'Frank pulmonary edema. High risk; oxygen/NIPPV, diuresis, urgent reperfusion.', riskLevel: 'high' },
        4: { label: 'Killip IV', interpretation: 'Cardiogenic shock. Critical; urgent revascularization, pressors/MCS per protocols.', riskLevel: 'critical' },
      };
      const m = map[c];
      return { score: c, ...m };
    },
    evidence: {
      summary: 'Killip & Kimball (1967) classified AMI patients by HF severity with stepwise mortality increase.',
      validation: 'Foundational classification still embedded in modern ACS risk scores.',
      references: [{ title: 'Treatment of myocardial infarction in a coronary care unit', citation: 'Killip T, Kimball JT. Am J Cardiol. 1967', year: 1967, pmid: '6059183',
          doi: '10.1016/0002-9149(67)90023-9', }],
    },
    nextSteps: [
      { condition: 'Class II–III', actions: ['Hemodynamic monitoring', 'Diuretics / vasodilators as appropriate', 'Urgent reperfusion'] },
      { condition: 'Class IV', actions: ['Activate shock team / MCS pathways', 'Emergent revascularization', 'Vasopressors/inotropes'] },
    ],
  },
  {
    id: 'wells-pe',
    name: 'Wells Criteria for PE',
    shortName: 'Wells PE',
    description: 'Estimates pretest probability of pulmonary embolism.',
    category: 'cardiology',
    tags: ['pe', 'vte', 'wells'],
    whenToUse: 'Patients with suspected pulmonary embolism.',
    whyUse: 'Guides D-dimer vs imaging pathway.',
    inputs: [
      yesNo('dvt', 'Clinical signs/symptoms of DVT', 3),
      yesNo('alt', 'PE is #1 diagnosis or equally likely', 3),
      yesNo('hr', 'Heart rate > 100', 1.5),
      yesNo('immob', 'Immobilization ≥3 days or surgery in past 4 weeks', 1.5),
      yesNo('prev', 'Previous DVT/PE', 1.5),
      yesNo('hemoptysis', 'Hemoptysis', 1),
      yesNo('malignancy', 'Malignancy (on treatment, treated in 6 mo, or palliative)', 1),
    ],
    calculate(values) {
      const score =
        (bool(values.dvt) ? 3 : 0) +
        (bool(values.alt) ? 3 : 0) +
        (bool(values.hr) ? 1.5 : 0) +
        (bool(values.immob) ? 1.5 : 0) +
        (bool(values.prev) ? 1.5 : 0) +
        (bool(values.hemoptysis) ? 1 : 0) +
        (bool(values.malignancy) ? 1 : 0);
      let riskLevel: 'low' | 'moderate' | 'high' = 'low';
      let label = 'Low probability';
      let interpretation = 'Three-tier: low PE probability. Consider D-dimer; if negative, PE unlikely.';
      if (score >= 2 && score <= 6) {
        riskLevel = 'moderate';
        label = 'Moderate probability';
        interpretation = 'Moderate PE probability. D-dimer or imaging depending on local pathway.';
      }
      if (score > 6) {
        riskLevel = 'high';
        label = 'High probability';
        interpretation = 'High PE probability. Proceed to imaging (CTPA or V/Q); do not rely on D-dimer alone.';
      }
      const twoTier = score <= 4 ? 'PE unlikely' : 'PE likely';
      return {
        score,
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Two-tier (≤4 unlikely)', value: twoTier },
          { label: 'Score range', value: '0–12.5' },
        ],
      };
    },
    evidence: {
      summary: 'Wells score for PE is the most widely used clinical pretest probability tool.',
      formula: 'Clinical DVT (3) + PE most likely (3) + HR>100 (1.5) + Immobilization/surgery (1.5) + Prior VTE (1.5) + Hemoptysis (1) + Malignancy (1)',
      validation: 'Validated in multiple ED and inpatient cohorts; used with PERC and age-adjusted D-dimer.',
      references: [{ title: 'Derivation of a simple clinical model to categorize patients probability of PE', citation: 'Wells PS et al. Thromb Haemost. 2000', year: 2000, pmid: '10744147' }],
    },
    nextSteps: [
      { condition: 'PE unlikely (≤4) + negative D-dimer', actions: ['PE excluded in most pathways', 'Seek alternative diagnosis'] },
      { condition: 'PE likely (>4) or positive D-dimer', actions: ['CT pulmonary angiography (or V/Q if CT contraindicated)', 'Consider empiric anticoagulation if high suspicion and low bleed risk while awaiting imaging'] },
    ],
  },
  {
    id: 'wells-dvt',
    name: 'Wells Criteria for DVT',
    shortName: 'Wells DVT',
    description: 'Estimates pretest probability of lower-extremity deep vein thrombosis.',
    category: 'cardiology',
    tags: ['dvt', 'vte', 'wells'],
    whenToUse: 'Suspected lower extremity DVT.',
    whyUse: 'Combined with D-dimer to safely rule out DVT.',
    inputs: [
      yesNo('cancer', 'Active cancer', 1),
      yesNo('paralysis', 'Paralysis, paresis, or recent cast immobilization of leg', 1),
      yesNo('bedridden', 'Recently bedridden ≥3 days or major surgery within 12 weeks', 1),
      yesNo('tenderness', 'Localized tenderness along deep venous system', 1),
      yesNo('swelling', 'Entire leg swollen', 1),
      yesNo('calf', 'Calf swelling ≥3 cm vs asymptomatic leg', 1),
      yesNo('pitting', 'Pitting edema confined to symptomatic leg', 1),
      yesNo('collat', 'Collateral superficial veins (non-varicose)', 1),
      yesNo('prior', 'Previously documented DVT', 1),
      yesNo('alt', 'Alternative diagnosis at least as likely', -2),
    ],
    calculate(values) {
      let score = 0;
      const pos = ['cancer', 'paralysis', 'bedridden', 'tenderness', 'swelling', 'calf', 'pitting', 'collat', 'prior'];
      pos.forEach((k) => {
        if (bool(values[k])) score += 1;
      });
      if (bool(values.alt)) score -= 2;
      const r = riskFromThresholds(score, [
        { max: 0, level: 'low', label: 'DVT unlikely (≤0)', interpretation: 'Low probability. Negative D-dimer can exclude DVT.' },
        { max: 1, level: 'moderate', label: 'Moderate (1–2 in some tiers)', interpretation: 'Intermediate probability. D-dimer or ultrasound based on pathway.' },
        { max: 20, level: 'high', label: 'DVT likely (≥2 two-tier)', interpretation: 'Higher probability. Proceed to duplex ultrasound.' },
      ]);
      // fix moderate band: score 1
      let label = r.label;
      let interpretation = r.interpretation;
      let riskLevel = r.riskLevel;
      if (score <= 0) {
        label = 'DVT unlikely';
        interpretation = 'Two-tier unlikely. Use high-sensitivity D-dimer; if negative, DVT excluded.';
        riskLevel = 'low';
      } else {
        label = 'DVT likely';
        interpretation = 'Two-tier likely (score ≥1). Obtain duplex ultrasound.';
        riskLevel = score >= 3 ? 'high' : 'moderate';
      }
      return { score, label, interpretation, riskLevel };
    },
    evidence: {
      summary: 'Wells DVT criteria stratify pretest probability; two-tier version (unlikely ≤0, likely ≥1) is commonly used with D-dimer.',
      validation: 'Extensively validated outpatient DVT diagnostic algorithm.',
      references: [{ title: 'Value of assessment of pretest probability of DVT in clinical management', citation: 'Wells PS et al. Lancet. 1997', year: 1997, pmid: '9428249',
          doi: '10.1016/S0140-6736(97)08140-3', }],
    },
    nextSteps: [
      { condition: 'Unlikely + neg D-dimer', actions: ['No ultrasound needed', 'Reassess if symptoms worsen'] },
      { condition: 'Likely or pos D-dimer', actions: ['Lower extremity duplex US', 'If positive, start anticoagulation if no contraindication'] },
    ],
  },
  {
    id: 'perc',
    name: 'PERC Rule for PE',
    shortName: 'PERC',
    description: 'Rules out PE in low-risk patients without further testing when all criteria negative.',
    category: 'cardiology',
    tags: ['pe', 'perc', 'rule-out'],
    whenToUse: 'Low pretest probability PE patients (clinician gestalt <15%).',
    whyUse: 'Avoids unnecessary D-dimer and imaging in very low-risk patients.',
    inputs: [
      yesNo('age50', 'Age ≥ 50 years'),
      yesNo('hr100', 'HR ≥ 100'),
      yesNo('o2', 'O₂ sat on room air < 95%'),
      yesNo('leg', 'Unilateral leg swelling'),
      yesNo('hemoptysis', 'Hemoptysis'),
      yesNo('surgery', 'Recent surgery or trauma (≤4 weeks requiring anesthesia)'),
      yesNo('prior', 'Prior PE or DVT'),
      yesNo('hormone', 'Hormone use (OCP, HRT, estrogen)'),
    ],
    calculate(values) {
      const keys = ['age50', 'hr100', 'o2', 'leg', 'hemoptysis', 'surgery', 'prior', 'hormone'];
      const positives = keys.filter((k) => bool(values[k])).length;
      if (positives === 0) {
        return {
          score: 0,
          label: 'PERC negative',
          interpretation: 'All criteria absent. In low-risk patients, PE is excluded without D-dimer or imaging.',
          riskLevel: 'low',
          recommendations: ['Only apply if pretest probability is already low', 'Seek alternative diagnosis'],
        };
      }
      return {
        score: positives,
        label: 'PERC positive',
        interpretation: `${positives} criterion/criteria present. PERC cannot rule out PE. Continue standard PE workup (Wells/D-dimer/imaging).`,
        riskLevel: 'moderate',
      };
    },
    evidence: {
      summary: 'PERC (Pulmonary Embolism Rule-out Criteria) identifies patients in whom PE is so unlikely that testing is not warranted.',
      formula: '8 criteria; ALL must be negative to rule out PE in low-risk patients',
      validation: 'Validated in large multicenter ED cohorts (Kline et al.).',
      references: [{ title: 'Prospective multicenter evaluation of the PERC rule', citation: 'Kline JA et al. J Thromb Haemost. 2008', year: 2008, pmid: '18318689',
          doi: '10.1111/j.1538-7836.2008.02944.x', }],
    },
    nextSteps: [
      { condition: 'PERC negative + low gestalt', actions: ['No PE testing needed', 'Document shared decision if appropriate'] },
      { condition: 'Any PERC positive', actions: ['Do not use PERC alone to exclude PE', 'Apply Wells + D-dimer or imaging pathway'] },
    ],
  },
  {
    id: 'revised-geneva',
    name: 'Revised Geneva Score (PE)',
    shortName: 'Revised Geneva',
    description: 'Pretest probability of PE using entirely objective criteria.',
    category: 'cardiology',
    tags: ['pe', 'geneva', 'vte'],
    whenToUse: 'Suspected PE when an objective alternative to Wells is preferred.',
    whyUse: 'No subjective “PE most likely” item; fully standardized.',
    inputs: [
      yesNo('age65', 'Age > 65 years', 1),
      yesNo('prior', 'Previous DVT/PE', 3),
      yesNo('surgery', 'Surgery or fracture within 1 month', 2),
      yesNo('cancer', 'Active malignancy', 2),
      yesNo('leg', 'Unilateral lower limb pain', 3),
      yesNo('hemoptysis', 'Hemoptysis', 2),
      selectInput('hr', 'Heart rate', [
        { label: '< 75', value: 0, points: 0 },
        { label: '75–94', value: 3, points: 3 },
        { label: '≥ 95', value: 5, points: 5 },
      ]),
      yesNo('painPalp', 'Pain on lower limb deep venous palpation and unilateral edema', 4),
    ],
    calculate(values) {
      const score =
        (bool(values.age65) ? 1 : 0) +
        (bool(values.prior) ? 3 : 0) +
        (bool(values.surgery) ? 2 : 0) +
        (bool(values.cancer) ? 2 : 0) +
        (bool(values.leg) ? 3 : 0) +
        (bool(values.hemoptysis) ? 2 : 0) +
        num(values.hr) +
        (bool(values.painPalp) ? 4 : 0);
      const r = riskFromThresholds(score, [
        { max: 3, level: 'low', label: 'Low probability (0–3)', interpretation: 'Low PE probability (~8%). D-dimer pathway appropriate.' },
        { max: 10, level: 'moderate', label: 'Intermediate (4–10)', interpretation: 'Intermediate PE probability (~28%). D-dimer or imaging.' },
        { max: 30, level: 'high', label: 'High probability (≥11)', interpretation: 'High PE probability (~74%). Proceed to imaging.' },
      ]);
      return { score, ...r };
    },
    evidence: {
      summary: 'Revised Geneva score provides objective PE pretest probability without clinician gestalt item.',
      validation: 'Validated prospectively against Wells criteria.',
      references: [{ title: 'Prediction of PE in the emergency department: the revised Geneva score', citation: 'Le Gal G et al. Ann Intern Med. 2006', year: 2006, pmid: '16461960',
          doi: '10.7326/0003-4819-144-3-200602070-00004', }],
    },
    nextSteps: [
      { condition: 'Low/intermediate + neg D-dimer', actions: ['PE unlikely', 'Alternative diagnosis'] },
      { condition: 'High or positive D-dimer', actions: ['CTPA or V/Q scan'] },
    ],
  },
  {
    id: 'pesi',
    name: 'PESI (Pulmonary Embolism Severity Index)',
    shortName: 'PESI',
    description: 'Predicts 30-day mortality in patients with acute PE to guide disposition.',
    category: 'cardiology',
    tags: ['pe', 'severity', 'mortality'],
    whenToUse: 'Risk stratify confirmed acute PE for outpatient vs inpatient management.',
    whyUse: 'Identifies low-risk PE candidates for early discharge.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 18, max: 110, defaultValue: 60 }),
      selectInput('sex', 'Sex', [
        { label: 'Female', value: 0 },
        { label: 'Male', value: 10 },
      ]),
      yesNo('cancer', 'History of cancer', 30),
      yesNo('hf', 'Heart failure', 10),
      yesNo('clrd', 'Chronic lung disease', 10),
      yesNo('hr110', 'Heart rate ≥ 110', 20),
      yesNo('sbp100', 'SBP < 100', 30),
      yesNo('rr30', 'Respiratory rate ≥ 30', 20),
      yesNo('temp36', 'Temperature < 36°C', 20),
      yesNo('ams', 'Altered mental status', 60),
      yesNo('o2', 'O₂ sat < 90%', 20),
    ],
    calculate(values) {
      const score =
        num(values.age) +
        num(values.sex) +
        (bool(values.cancer) ? 30 : 0) +
        (bool(values.hf) ? 10 : 0) +
        (bool(values.clrd) ? 10 : 0) +
        (bool(values.hr110) ? 20 : 0) +
        (bool(values.sbp100) ? 30 : 0) +
        (bool(values.rr30) ? 20 : 0) +
        (bool(values.temp36) ? 20 : 0) +
        (bool(values.ams) ? 60 : 0) +
        (bool(values.o2) ? 20 : 0);
      let classN = 1;
      let mort = '0–1.6%';
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
      if (score <= 65) {
        classN = 1;
        mort = '0–1.6%';
        riskLevel = 'low';
      } else if (score <= 85) {
        classN = 2;
        mort = '1.7–3.5%';
        riskLevel = 'low';
      } else if (score <= 105) {
        classN = 3;
        mort = '3.2–7.1%';
        riskLevel = 'moderate';
      } else if (score <= 125) {
        classN = 4;
        mort = '4–11.4%';
        riskLevel = 'high';
      } else {
        classN = 5;
        mort = '10–24.5%';
        riskLevel = 'critical';
      }
      return {
        score,
        label: `PESI Class ${classN}`,
        interpretation: `30-day mortality approximately ${mort}. Classes I–II often considered for outpatient therapy if social support adequate.`,
        riskLevel,
        details: [{ label: 'Approx. 30-day mortality', value: mort }],
      };
    },
    evidence: {
      summary: 'PESI predicts PE mortality; Classes I–II are low risk and may be managed outpatient in selected patients.',
      validation: 'Large derivation/validation cohorts; simplified sPESI also widely used.',
      references: [{ title: 'Derivation and validation of PESI', citation: 'Aujesky D et al. Am J Respir Crit Care Med. 2005', year: 2005, pmid: '16020800',
          doi: '10.1164/rccm.200506-862OC', }],
    },
    nextSteps: [
      { condition: 'Class I–II', actions: ['Consider outpatient anticoagulation if reliable follow-up', 'Ensure no RV strain/other high-risk features'] },
      { condition: 'Class III–V', actions: ['Inpatient management', 'Assess for intermediate-high/high-risk PE (RV dysfunction, troponin, shock)'] },
    ],
  },
  {
    id: 'spesi',
    name: 'Simplified PESI (sPESI)',
    shortName: 'sPESI',
    description: 'Simplified PE severity index for 30-day mortality.',
    category: 'cardiology',
    tags: ['pe', 'spesi'],
    whenToUse: 'Rapid risk stratification of acute PE.',
    whyUse: 'Easier than full PESI with similar discrimination for low-risk PE.',
    inputs: [
      yesNo('age80', 'Age > 80 years', 1),
      yesNo('cancer', 'History of cancer', 1),
      yesNo('cpd', 'Chronic cardiopulmonary disease', 1),
      yesNo('hr110', 'Heart rate ≥ 110', 1),
      yesNo('sbp100', 'SBP < 100 mmHg', 1),
      yesNo('o2', 'O₂ sat < 90%', 1),
    ],
    calculate(values) {
      const keys = ['age80', 'cancer', 'cpd', 'hr110', 'sbp100', 'o2'];
      const score = keys.reduce((s, k) => s + (bool(values[k]) ? 1 : 0), 0);
      if (score === 0) {
        return {
          score: 0,
          label: 'Low risk',
          interpretation: 'sPESI 0: ~1% 30-day mortality. Candidate for outpatient management if otherwise appropriate.',
          riskLevel: 'low',
        };
      }
      return {
        score,
        label: 'High risk',
        interpretation: `sPESI ≥1: elevated 30-day mortality (~9–11%). Inpatient management recommended.`,
        riskLevel: 'high',
      };
    },
    evidence: {
      summary: 'sPESI dichotomizes PE patients into low (0) vs high (≥1) risk using 6 variables.',
      validation: 'Validated against full PESI with similar prognostic accuracy.',
      references: [{ title: 'Simplified PESI', citation: 'Jiménez D et al. Arch Intern Med. 2010', year: 2010, pmid: '20696966',
          doi: '10.1001/archinternmed.2010.199', }],
    },
    nextSteps: [
      { condition: 'sPESI 0', actions: ['Consider home treatment with DOAC', 'Early follow-up'] },
      { condition: 'sPESI ≥1', actions: ['Hospitalize', 'Evaluate RV function and biomarkers'] },
    ],
  },
  {
    id: 'chads2',
    name: 'CHADS₂ Score',
    shortName: 'CHADS₂',
    description: 'Classic stroke risk score for atrial fibrillation (predecessor to CHA₂DS₂-VASc).',
    category: 'cardiology',
    tags: ['afib', 'stroke'],
    whenToUse: 'Historical/educational use; prefer CHA₂DS₂-VASc in current practice.',
    whyUse: 'Still referenced in literature; simple five-factor model.',
    inputs: [
      yesNo('chf', 'CHF', 1),
      yesNo('htn', 'Hypertension', 1),
      yesNo('age75', 'Age ≥ 75', 1),
      yesNo('dm', 'Diabetes', 1),
      yesNo('stroke', 'Prior stroke/TIA', 2),
    ],
    calculate(values) {
      const score =
        (bool(values.chf) ? 1 : 0) +
        (bool(values.htn) ? 1 : 0) +
        (bool(values.age75) ? 1 : 0) +
        (bool(values.dm) ? 1 : 0) +
        (bool(values.stroke) ? 2 : 0);
      const risks = ['1.9%', '2.8%', '4.0%', '5.9%', '8.5%', '12.5%', '18.2%'];
      const r = riskFromThresholds(score, [
        { max: 0, level: 'low', label: 'Low risk', interpretation: `Annual stroke risk ~${risks[0]}.` },
        { max: 1, level: 'moderate', label: 'Moderate risk', interpretation: `Annual stroke risk ~${risks[score]}.` },
        { max: 6, level: 'high', label: 'High risk', interpretation: `Annual stroke risk ~${risks[score]}. Anticoagulation traditionally recommended.` },
      ]);
      return { score, ...r, details: [{ label: 'Annual stroke risk (approx.)', value: risks[score] }] };
    },
    evidence: {
      summary: 'CHADS₂ from National Registry of Atrial Fibrillation; largely superseded by CHA₂DS₂-VASc.',
      references: [{ title: 'Validation of clinical classification schemes for predicting stroke', citation: 'Gage BF et al. JAMA. 2001', year: 2001, pmid: '11401607',
          doi: '10.1001/jama.285.22.2864', }],
      validation: 'Widely validated but less sensitive than CHA₂DS₂-VASc for low-risk identification.',
    },
    nextSteps: [{ condition: 'Any use', actions: ['Prefer CHA₂DS₂-VASc for current decision-making', 'Combine with bleeding risk assessment'] }],
  },
  {
    id: 'map',
    name: 'Mean Arterial Pressure (MAP)',
    shortName: 'MAP',
    description: 'Calculates mean arterial pressure from systolic and diastolic BP.',
    category: 'cardiology',
    tags: ['blood pressure', 'shock', 'perfusion'],
    whenToUse: 'Shock, hypertension emergencies, ICU titration of pressors.',
    whyUse: 'MAP better reflects tissue perfusion pressure than SBP alone.',
    inputs: [
      numberInput('sbp', 'Systolic BP', { unit: 'mmHg', min: 40, max: 300, defaultValue: 120 }),
      numberInput('dbp', 'Diastolic BP', { unit: 'mmHg', min: 20, max: 200, defaultValue: 80 }),
    ],
    calculate(values) {
      const sbp = num(values.sbp, 120);
      const dbp = num(values.dbp, 80);
      const map = round(dbp + (sbp - dbp) / 3, 0);
      const r = riskFromThresholds(map, [
        { max: 64, level: 'critical', label: 'Low MAP', interpretation: 'MAP <65 often associated with inadequate organ perfusion in shock; treat underlying cause and support BP.' },
        { max: 100, level: 'normal', label: 'Normal MAP', interpretation: 'Generally adequate perfusion pressure for most patients.' },
        { max: 130, level: 'moderate', label: 'Elevated MAP', interpretation: 'Elevated mean pressure; assess for hypertensive urgency/emergency contextually.' },
        { max: 300, level: 'high', label: 'Very high MAP', interpretation: 'Markedly elevated; evaluate for end-organ damage.' },
      ]);
      return { score: map, unit: 'mmHg', ...r, details: [{ label: 'Formula', value: 'DBP + (SBP−DBP)/3' }] };
    },
    evidence: {
      summary: 'MAP ≈ CO × SVR; commonly estimated as DBP + 1/3 pulse pressure.',
      formula: 'MAP = DBP + (SBP − DBP) / 3',
      validation: 'Standard physiologic relationship used in sepsis and critical care guidelines (MAP ≥65 target).',
      references: [{ title: 'Surviving Sepsis Campaign guidelines', citation: 'Evans L et al. Crit Care Med. 2021', year: 2021, pmid: '34605781',
          doi: '10.1097/CCM.0000000000005337', }],
    },
    nextSteps: [
      { condition: 'MAP < 65 with shock', actions: ['Fluid resuscitation if hypovolemic', 'Vasopressors (norepinephrine first-line in septic shock)', 'Source control'] },
    ],
  },
  {
    id: 'qtc-bazett',
    name: 'Corrected QT (Bazett)',
    shortName: 'QTc Bazett',
    description: 'Corrects QT interval for heart rate using Bazett formula.',
    category: 'cardiology',
    tags: ['ecg', 'qt', 'arrhythmia'],
    whenToUse: 'Drug monitoring, syncope, electrolyte disorders, congenital LQTS screening.',
    whyUse: 'Prolonged QTc increases risk of torsades de pointes.',
    inputs: [
      numberInput('qt', 'QT interval', { unit: 'ms', min: 200, max: 800, defaultValue: 400 }),
      numberInput('hr', 'Heart rate', { unit: 'bpm', min: 30, max: 220, defaultValue: 70 }),
    ],
    calculate(values) {
      const qt = num(values.qt, 400);
      const hr = num(values.hr, 70);
      const rr = 60 / hr;
      const qtc = round(qt / Math.sqrt(rr), 0);
      let riskLevel: 'normal' | 'moderate' | 'high' | 'critical' = 'normal';
      let label = 'Normal QTc';
      let interpretation = 'QTc within typical reference range for most adults.';
      if (qtc >= 500) {
        riskLevel = 'critical';
        label = 'Markedly prolonged';
        interpretation = 'QTc ≥500 ms: high risk for torsades. Stop QT-prolonging drugs, replete K/Mg, continuous monitoring.';
      } else if (qtc >= 460) {
        riskLevel = 'high';
        label = 'Prolonged';
        interpretation = 'Prolonged QTc. Review medications and electrolytes; consider specialist input.';
      } else if (qtc >= 440) {
        riskLevel = 'moderate';
        label = 'Borderline';
        interpretation = 'Borderline QTc. Reassess with Fridericia if extreme HR; check meds/electrolytes.';
      } else if (qtc < 350) {
        riskLevel = 'moderate';
        label = 'Short QTc';
        interpretation = 'Short QTc may warrant evaluation for short QT syndrome if persistent.';
      }
      return {
        score: qtc,
        unit: 'ms',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'RR interval', value: `${round(rr, 3)} s` },
          { label: 'Formula', value: 'QT / √RR' },
        ],
      };
    },
    evidence: {
      summary: 'Bazett (QTc = QT/√RR) is most common but overcorrects at high HR and undercorrects at low HR. Fridericia preferred at extremes.',
      formula: 'QTc (Bazett) = QT / √(RR) with RR in seconds',
      validation: 'Standard ECG teaching; thresholds vary by sex and method.',
      references: [{ title: 'An analysis of the time-relations of electrocardiograms (Bazett QT correction)', citation: 'Bazett HC. Heart. 1920 (classic; modern discussions in ECG literature)', year: 1920,
          pmid: '35249835',
          doi: '10.1016/j.jpurol.2022.02.006', url: 'https://en.wikipedia.org/wiki/QT_interval#Correction_for_heart_rate' }],
    },
    nextSteps: [
      { condition: 'QTc ≥ 500', actions: ['Telemetry', 'MgSO4 if TdP or very high risk', 'Discontinue offending agents', 'Replete K+ to >4 and Mg >2'] },
    ],
  },
  {
    id: 'ascvd-risk',
    name: 'ASCVD 10-Year Risk (Pooled Cohort, simplified)',
    shortName: 'ASCVD Risk',
    description: 'Estimates 10-year risk of atherosclerotic cardiovascular disease for statin decision-making.',
    category: 'cardiology',
    tags: ['prevention', 'statin', 'cholesterol'],
    whenToUse: 'Adults 40–79 without prior ASCVD for primary prevention.',
    whyUse: 'ACC/AHA guideline tool for statin and aspirin discussions.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 40, max: 79, defaultValue: 55 }),
      selectInput('sex', 'Sex', [
        { label: 'Female', value: 'F' },
        { label: 'Male', value: 'M' },
      ]),
      selectInput('race', 'Race', [
        { label: 'White / Other', value: 'W' },
        { label: 'African American', value: 'AA' },
      ]),
      numberInput('tc', 'Total cholesterol', { unit: 'mg/dL', min: 100, max: 400, defaultValue: 200 }),
      numberInput('hdl', 'HDL-C', { unit: 'mg/dL', min: 20, max: 120, defaultValue: 50 }),
      numberInput('sbp', 'Systolic BP', { unit: 'mmHg', min: 90, max: 200, defaultValue: 130 }),
      yesNo('txHtn', 'On antihypertensive treatment'),
      yesNo('dm', 'Diabetes'),
      yesNo('smoker', 'Current smoker'),
    ],
    calculate(values) {
      // Educational simplified logistic-style approximation (not official PCE coefficients)
      const age = num(values.age, 55);
      const tc = num(values.tc, 200);
      const hdl = num(values.hdl, 50);
      const sbp = num(values.sbp, 130);
      let lp = -7.5;
      lp += (age - 55) * 0.07;
      lp += (tc - 200) * 0.008;
      lp += (50 - hdl) * 0.03;
      lp += (sbp - 120) * 0.02;
      if (values.sex === 'M') lp += 0.6;
      if (values.race === 'AA') lp += 0.25;
      if (bool(values.txHtn)) lp += 0.35;
      if (bool(values.dm)) lp += 0.7;
      if (bool(values.smoker)) lp += 0.65;
      const risk = round(100 / (1 + Math.exp(-lp)), 1);
      const r = riskFromThresholds(risk, [
        { max: 4.9, level: 'low', label: 'Low risk (<5%)', interpretation: 'Emphasize lifestyle. Statin generally not indicated solely for risk unless LDL very high or other indications.' },
        { max: 7.4, level: 'moderate', label: 'Borderline (5–7.4%)', interpretation: 'Risk enhancers and CAC score may refine statin decision.' },
        { max: 19.9, level: 'moderate', label: 'Intermediate (7.5–19.9%)', interpretation: 'Moderate-intensity statin generally favored after shared decision-making.' },
        { max: 100, level: 'high', label: 'High (≥20%)', interpretation: 'High-intensity statin recommended for primary prevention.' },
      ]);
      return {
        score: risk,
        unit: '%',
        ...r,
        details: [{ label: 'Note', value: 'Simplified educational estimate — use official PCE calculator for clinical decisions' }],
      };
    },
    evidence: {
      summary: 'ACC/AHA Pooled Cohort Equations estimate 10-year risk of nonfatal MI, CHD death, and stroke.',
      formula: 'Race- and sex-specific Cox models (simplified approximation shown here)',
      validation: 'Derived from multiple community cohorts; recalibrated in some populations.',
      references: [{ title: '2013 ACC/AHA Guideline on Assessment of Cardiovascular Risk', citation: 'Goff DC et al. Circulation. 2014', year: 2014, pmid: '24222018',
          doi: '10.1161/01.cir.0000437741.48606.98', }],
    },
    nextSteps: [
      { condition: 'Risk ≥7.5%', actions: ['Discuss moderate- or high-intensity statin', 'Lifestyle therapy', 'Reassess lipids'] },
      { condition: 'Borderline risk', actions: ['Consider CAC scoring', 'Assess risk enhancers (family hx, Lp(a), CKD, etc.)'] },
    ],
  },
  {
    id: 'centor',
    name: 'Centor Score (Modified / McIsaac)',
    shortName: 'Centor/McIsaac',
    description: 'Estimates likelihood of streptococcal pharyngitis to guide testing/antibiotics.',
    category: 'infectious-disease',
    tags: ['pharyngitis', 'strep', 'centor'],
    whenToUse: 'Patients with sore throat to decide on rapid strep testing / culture.',
    whyUse: 'Reduces unnecessary antibiotics for viral pharyngitis.',
    inputs: [
      yesNo('fever', 'History of fever or measured temp ≥38°C', 1),
      yesNo('noCough', 'Absence of cough', 1),
      yesNo('tender', 'Tender anterior cervical lymphadenopathy', 1),
      yesNo('exudate', 'Tonsillar exudate or swelling', 1),
      selectInput('age', 'Age (McIsaac modification)', [
        { label: '3–14 years (+1)', value: 1 },
        { label: '15–44 years (0)', value: 0 },
        { label: '≥ 45 years (−1)', value: -1 },
      ]),
    ],
    calculate(values) {
      const score =
        (bool(values.fever) ? 1 : 0) +
        (bool(values.noCough) ? 1 : 0) +
        (bool(values.tender) ? 1 : 0) +
        (bool(values.exudate) ? 1 : 0) +
        num(values.age);
      const clamped = Math.max(0, score);
      const r = riskFromThresholds(clamped, [
        { max: 1, level: 'low', label: 'Low risk (≤1)', interpretation: 'Strep unlikely (~1–10%). No testing or antibiotics generally needed.' },
        { max: 3, level: 'moderate', label: 'Intermediate (2–3)', interpretation: 'Consider rapid antigen test or throat culture; treat if positive.' },
        { max: 5, level: 'high', label: 'High (4–5)', interpretation: 'Higher strep probability (~50%+). Test and/or empiric treatment per local practice.' },
      ]);
      return { score, ...r };
    },
    evidence: {
      summary: 'Centor criteria with McIsaac age adjustment estimate group A strep probability.',
      validation: 'Validated in adult and pediatric primary care / ED settings.',
      references: [
        { title: 'The diagnosis of strep throat in adults in the emergency room', citation: 'Centor RM et al. Med Decis Making. 1981', year: 1981, pmid: '6763125',
          doi: '10.1177/0272989X8100100304', },
        { title: 'The validity of a sore throat score in family practice', citation: 'McIsaac WJ et al. CMAJ. 2000', year: 2000, pmid: '11033707' },
      ],
    },
    nextSteps: [
      { condition: 'Score ≤1', actions: ['Supportive care', 'No antibiotics'] },
      { condition: 'Score ≥2', actions: ['RADT ± culture', 'Treat confirmed GAS with penicillin/amoxicillin if no allergy'] },
    ],
  },
];

type CalcOut = {
  label: string;
  interpretation: string;
  riskLevel: 'low' | 'moderate' | 'high' | 'critical' | 'info' | 'normal';
};
