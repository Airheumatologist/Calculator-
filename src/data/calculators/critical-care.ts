import type { Calculator } from '../../types/calculator';
import { num, bool, round, yesNo, selectInput, numberInput, riskFromThresholds } from '../../utils/helpers';

export const criticalCareCalcs: Calculator[] = [
  {
    id: 'gcs',
    name: 'Glasgow Coma Scale (GCS)',
    shortName: 'GCS',
    description: 'Standardized assessment of consciousness via eye, verbal, and motor responses.',
    category: 'critical-care',
    tags: ['neuro', 'trauma', 'coma'],
    whenToUse: 'Altered mental status, trauma, ICU sedation assessment.',
    whyUse: 'Universal language for neurologic status and triage.',
    inputs: [
      selectInput('eye', 'Eye opening', [
        { label: '4 — Spontaneous', value: 4 },
        { label: '3 — To speech', value: 3 },
        { label: '2 — To pain', value: 2 },
        { label: '1 — None', value: 1 },
      ]),
      selectInput('verbal', 'Verbal response', [
        { label: '5 — Oriented', value: 5 },
        { label: '4 — Confused', value: 4 },
        { label: '3 — Inappropriate words', value: 3 },
        { label: '2 — Incomprehensible sounds', value: 2 },
        { label: '1 — None', value: 1 },
      ]),
      selectInput('motor', 'Motor response', [
        { label: '6 — Obeys commands', value: 6 },
        { label: '5 — Localizes pain', value: 5 },
        { label: '4 — Withdraws from pain', value: 4 },
        { label: '3 — Abnormal flexion (decorticate)', value: 3 },
        { label: '2 — Abnormal extension (decerebrate)', value: 2 },
        { label: '1 — None', value: 1 },
      ]),
    ],
    calculate(values) {
      const e = num(values.eye, 4);
      const v = num(values.verbal, 5);
      const m = num(values.motor, 6);
      const score = e + v + m;
      const r = riskFromThresholds(score, [
        { max: 8, level: 'critical', label: 'Severe (≤8)', interpretation: 'Severe brain injury range. Consider airway protection (often intubate ≤8).' },
        { max: 12, level: 'high', label: 'Moderate (9–12)', interpretation: 'Moderate impairment. Close monitoring and urgent workup.' },
        { max: 15, level: 'low', label: 'Mild (13–15)', interpretation: 'Mild impairment or normal. Serial exams still important after trauma.' },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'E / V / M', value: `${e} / ${v} / ${m}` },
          { label: 'Range', value: '3–15' },
        ],
      };
    },
    evidence: {
      summary: 'Teasdale & Jennett GCS remains the global standard for consciousness assessment.',
      formula: 'Eye (1–4) + Verbal (1–5) + Motor (1–6)',
      validation: 'Decades of trauma and critical care use; report component scores, not only total.',
      references: [{ title: 'Assessment of coma and impaired consciousness', citation: 'Teasdale G, Jennett B. Lancet. 1974', year: 1974, pmid: '4136544',
          doi: '10.1016/s0140-6736(74)91639-0', }],
    },
    nextSteps: [
      { condition: 'GCS ≤ 8', actions: ['Airway assessment / RSI as indicated', 'Urgent CT head if trauma/unknown cause', 'Treat reversible causes (glucose, opioids, etc.)'] },
      { condition: 'Any drop ≥2 points', actions: ['Urgent reassessment', 'Repeat imaging as indicated'] },
    ],
  },
  {
    id: 'qsofa',
    name: 'qSOFA Score',
    shortName: 'qSOFA',
    description: 'Bedside prompt for patients with suspected infection at risk of poor outcomes.',
    category: 'critical-care',
    tags: ['sepsis', 'infection', 'sofa'],
    whenToUse: 'Outside ICU, patients with suspected infection.',
    whyUse: 'Bedside mortality/organ-dysfunction risk prompt; not a sole sepsis screen (SSC 2021) or diagnostic criterion alone.',
    inputs: [
      yesNo('rr', 'Respiratory rate ≥ 22/min', 1),
      yesNo('ams', 'Altered mentation', 1),
      yesNo('sbp', 'SBP ≤ 100 mmHg', 1),
    ],
    calculate(values) {
      const score = (bool(values.rr) ? 1 : 0) + (bool(values.ams) ? 1 : 0) + (bool(values.sbp) ? 1 : 0);
      if (score >= 2) {
        return {
          score,
          label: 'Positive qSOFA (≥2)',
          interpretation: 'Higher risk of poor outcomes. Assess for sepsis, obtain lactate, cultures, and escalate care.',
          riskLevel: 'high',
        };
      }
      return {
        score,
        label: 'Negative qSOFA (<2)',
        interpretation: 'Lower risk by qSOFA, but do not exclude sepsis. Use clinical judgment and SOFA if in ICU.',
        riskLevel: 'low',
      };
    },
    evidence: {
      summary: 'qSOFA introduced in Sepsis-3 as a bedside tool associated with increased mortality in infected patients.',
      formula: 'RR≥22 + Altered mentation + SBP≤100 (1 each)',
      validation: 'Predicts mortality better than SIRS in some non-ICU cohorts; limited sensitivity.',
      references: [{ title: 'The Third International Consensus Definitions for Sepsis and Septic Shock (Sepsis-3)', citation: 'Singer M et al. JAMA. 2016', year: 2016, pmid: '26903338',
          doi: '10.1001/jama.2016.0287', }],
    },
    nextSteps: [
      { condition: 'qSOFA ≥2', actions: ['Measure lactate', 'Blood cultures before antibiotics if no delay', 'Broad-spectrum antibiotics for suspected sepsis', 'Fluid resuscitation and source control'] },
    ],
  },
  {
    id: 'sofa',
    name: 'SOFA Score',
    shortName: 'SOFA',
    description: 'Sequential Organ Failure Assessment across 6 organ systems.',
    category: 'critical-care',
    tags: ['sepsis', 'icu', 'organ failure'],
    whenToUse: 'ICU patients, especially suspected sepsis, to track organ dysfunction.',
    whyUse: 'Sepsis-3 defines organ dysfunction as acute change in SOFA ≥2.',
    inputs: [
      selectInput('resp', 'Respiration (PaO₂/FiO₂)', [
        { label: '≥ 400 (0)', value: 0 },
        { label: '< 400 (1)', value: 1 },
        { label: '< 300 (2)', value: 2 },
        { label: '< 200 + ventilated (3)', value: 3 },
        { label: '< 100 + ventilated (4)', value: 4 },
      ]),
      selectInput('coag', 'Coagulation (Platelets ×10³/µL)', [
        { label: '≥ 150 (0)', value: 0 },
        { label: '< 150 (1)', value: 1 },
        { label: '< 100 (2)', value: 2 },
        { label: '< 50 (3)', value: 3 },
        { label: '< 20 (4)', value: 4 },
      ]),
      selectInput('liver', 'Liver (Bilirubin mg/dL)', [
        { label: '< 1.2 (0)', value: 0 },
        { label: '1.2–1.9 (1)', value: 1 },
        { label: '2.0–5.9 (2)', value: 2 },
        { label: '6.0–11.9 (3)', value: 3 },
        { label: '≥ 12.0 (4)', value: 4 },
      ]),
      selectInput('cv', 'Cardiovascular', [
        { label: 'MAP ≥ 70 (0)', value: 0 },
        { label: 'MAP < 70 (1)', value: 1 },
        { label: 'Dopamine ≤5 or dobutamine (2)', value: 2 },
        { label: 'Dopamine >5 or epi/norepi ≤0.1 (3)', value: 3 },
        { label: 'Dopamine >15 or epi/norepi >0.1 (4)', value: 4 },
      ]),
      selectInput('cns', 'CNS (GCS)', [
        { label: '15 (0)', value: 0 },
        { label: '13–14 (1)', value: 1 },
        { label: '10–12 (2)', value: 2 },
        { label: '6–9 (3)', value: 3 },
        { label: '< 6 (4)', value: 4 },
      ]),
      selectInput('renal', 'Renal (Creatinine or UOP)', [
        { label: 'Cr < 1.2 (0)', value: 0 },
        { label: 'Cr 1.2–1.9 (1)', value: 1 },
        { label: 'Cr 2.0–3.4 (2)', value: 2 },
        { label: 'Cr 3.5–4.9 or UOP <500 (3)', value: 3 },
        { label: 'Cr ≥ 5.0 or UOP <200 (4)', value: 4 },
      ]),
    ],
    calculate(values) {
      const score =
        num(values.resp) + num(values.coag) + num(values.liver) + num(values.cv) + num(values.cns) + num(values.renal);
      const r = riskFromThresholds(score, [
        { max: 1, level: 'low', label: 'Minimal dysfunction', interpretation: 'SOFA 0–1. Low organ failure burden.' },
        { max: 5, level: 'moderate', label: 'Moderate', interpretation: 'Rising mortality risk as SOFA increases; serial scores useful.' },
        { max: 11, level: 'high', label: 'High', interpretation: 'Significant multi-organ dysfunction; high mortality risk.' },
        { max: 24, level: 'critical', label: 'Very high', interpretation: 'Severe multi-organ failure; mortality often >50–80% depending on trajectory.' },
      ]);
      return { score, ...r, details: [{ label: 'Max score', value: '24' }] };
    },
    evidence: {
      summary: 'SOFA quantifies organ dysfunction; ΔSOFA ≥2 used in Sepsis-3 definition with suspected infection.',
      validation: 'Validated for ICU mortality prediction across diagnoses.',
      references: [
        { title: 'The SOFA score to describe organ dysfunction/failure', citation: 'Vincent JL et al. Intensive Care Med. 1996', year: 1996, pmid: '8844239',
          doi: '10.1007/BF01709751', },
        { title: 'Sepsis-3 definitions', citation: 'Singer M et al. JAMA. 2016', year: 2016, pmid: '26903338',
          doi: '10.1001/jama.2016.0287', },
      ],
    },
    nextSteps: [
      { condition: 'Acute increase ≥2 with infection', actions: ['Treat as sepsis', 'Hour-1 bundle elements', 'ICU-level care as needed'] },
    ],
  },
  {
    id: 'sirs',
    name: 'SIRS Criteria',
    shortName: 'SIRS',
    description: 'Systemic Inflammatory Response Syndrome criteria (historical sepsis screen).',
    category: 'critical-care',
    tags: ['sepsis', 'sirs'],
    whenToUse: 'Educational/historical; still used in some pathways as infection screen.',
    whyUse: 'Sensitive but non-specific; replaced by SOFA for sepsis definition.',
    inputs: [
      yesNo('temp', 'Temp >38°C or <36°C', 1),
      yesNo('hr', 'HR > 90', 1),
      yesNo('rr', 'RR > 20 or PaCO₂ < 32 mmHg', 1),
      yesNo('wbc', 'WBC >12k, <4k, or >10% bands', 1),
    ],
    calculate(values) {
      const score = ['temp', 'hr', 'rr', 'wbc'].reduce((s, k) => s + (bool(values[k]) ? 1 : 0), 0);
      if (score >= 2) {
        return {
          score,
          label: 'SIRS positive',
          interpretation: '≥2 criteria: SIRS present. With infection this was formerly “sepsis”; use clinical judgment and SOFA.',
          riskLevel: 'moderate',
        };
      }
      return { score, label: 'SIRS negative', interpretation: 'Fewer than 2 criteria.', riskLevel: 'low' };
    },
    evidence: {
      summary: 'SIRS defined in 1991/2001 sepsis consensus; highly sensitive, poorly specific.',
      validation: 'Superseded by Sepsis-3 for defining sepsis but still appears in research.',
      references: [{ title: 'SCCM/ESICM/ACCP/ATS/SIS sepsis definitions', citation: 'Levy MM et al. Crit Care Med. 2003', year: 2003, pmid: '12682500',
          doi: '10.1097/01.CCM.0000050454.01978.3B', }],
    },
    nextSteps: [
      { condition: 'SIRS + suspected infection', actions: ['Evaluate for sepsis with lactate, cultures', 'Prefer SOFA/qSOFA for risk stratification'] },
    ],
  },
  {
    id: 'news2',
    name: 'NEWS2 Score',
    shortName: 'NEWS2',
    description: 'National Early Warning Score 2 for detecting acute deterioration.',
    category: 'critical-care',
    tags: ['early warning', 'deterioration', 'triage'],
    whenToUse: 'Hospitalized adults for routine observation and escalation.',
    whyUse: 'Standardized track-and-trigger system (NHS).',
    inputs: [
      selectInput('rr', 'Respiratory rate', [
        { label: '≤8 (3)', value: 3 },
        { label: '9–11 (1)', value: 1 },
        { label: '12–20 (0)', value: 0 },
        { label: '21–24 (2)', value: 2 },
        { label: '≥25 (3)', value: 3 },
      ]),
      selectInput('spo2', 'SpO₂ Scale 1 (%)', [
        { label: '≥96 (0)', value: 0 },
        { label: '94–95 (1)', value: 1 },
        { label: '92–93 (2)', value: 2 },
        { label: '≤91 (3)', value: 3 },
      ]),
      yesNo('o2air', 'On supplemental oxygen', 2),
      selectInput('temp', 'Temperature °C', [
        { label: '≤35.0 (3)', value: 3 },
        { label: '35.1–36.0 (1)', value: 1 },
        { label: '36.1–38.0 (0)', value: 0 },
        { label: '38.1–39.0 (1)', value: 1 },
        { label: '≥39.1 (2)', value: 2 },
      ]),
      selectInput('sbp', 'Systolic BP', [
        { label: '≤90 (3)', value: 3 },
        { label: '91–100 (2)', value: 2 },
        { label: '101–110 (1)', value: 1 },
        { label: '111–219 (0)', value: 0 },
        { label: '≥220 (3)', value: 3 },
      ]),
      selectInput('hr', 'Heart rate', [
        { label: '≤40 (3)', value: 3 },
        { label: '41–50 (1)', value: 1 },
        { label: '51–90 (0)', value: 0 },
        { label: '91–110 (1)', value: 1 },
        { label: '111–130 (2)', value: 2 },
        { label: '≥131 (3)', value: 3 },
      ]),
      selectInput('conscious', 'Consciousness', [
        { label: 'Alert (0)', value: 0 },
        { label: 'New confusion / V / P / U (3)', value: 3 },
      ]),
    ],
    calculate(values) {
      const score =
        num(values.rr) +
        num(values.spo2) +
        (bool(values.o2air) ? 2 : 0) +
        num(values.temp) +
        num(values.sbp) +
        num(values.hr) +
        num(values.conscious);
      const r = riskFromThresholds(score, [
        { max: 4, level: 'low', label: 'Low (0–4)', interpretation: 'Continue routine monitoring (unless single parameter = 3).' },
        { max: 6, level: 'moderate', label: 'Low–medium (5–6)', interpretation: 'Urgent ward-based response; increase monitoring frequency.' },
        { max: 20, level: 'high', label: 'High (≥7)', interpretation: 'Emergency response / critical care review.' },
      ]);
      return { score, ...r };
    },
    evidence: {
      summary: 'NEWS2 is the UK standard early warning score including SpO₂ scales for hypercapnic respiratory failure.',
      validation: 'NHS England endorsed; predicts ICU transfer and mortality.',
      references: [{ title: 'National Early Warning Score (NEWS) 2', citation: 'Royal College of Physicians. NEWS2 standardising the assessment of acute-illness severity in the NHS. 2017', year: 2017, url: 'https://www.rcp.ac.uk/improving-care/resources/national-early-warning-score-news-2/' }],
    },
    nextSteps: [
      { condition: 'Score ≥7', actions: ['Emergency critical care assessment', 'Continuous monitoring / higher-level care'] },
      { condition: 'Score 5–6', actions: ['Urgent ward-based review', 'Increase observation frequency'] },
      { condition: 'Single param = 3', actions: ['Urgent ward doctor review', 'Adjust monitoring / consider escalation'] },
    ],
  },
  {
    id: 'mews',
    name: 'MEWS (Modified Early Warning Score)',
    shortName: 'MEWS',
    description: 'Simple early warning score using vital signs and AVPU.',
    category: 'critical-care',
    tags: ['early warning', 'mews'],
    whenToUse: 'Ward patients to detect clinical deterioration.',
    whyUse: 'Predecessor/alternative to NEWS used in many hospitals.',
    inputs: [
      selectInput('sbp', 'SBP', [
        { label: '≤70 (3)', value: 3 },
        { label: '71–80 (2)', value: 2 },
        { label: '81–100 (1)', value: 1 },
        { label: '101–199 (0)', value: 0 },
        { label: '≥200 (2)', value: 2 },
      ]),
      selectInput('hr', 'Heart rate', [
        { label: '≤40 (2)', value: 2 },
        { label: '41–50 (1)', value: 1 },
        { label: '51–100 (0)', value: 0 },
        { label: '101–110 (1)', value: 1 },
        { label: '111–129 (2)', value: 2 },
        { label: '≥130 (3)', value: 3 },
      ]),
      selectInput('rr', 'Respiratory rate', [
        { label: '<9 (2)', value: 2 },
        { label: '9–14 (0)', value: 0 },
        { label: '15–20 (1)', value: 1 },
        { label: '21–29 (2)', value: 2 },
        { label: '≥30 (3)', value: 3 },
      ]),
      selectInput('temp', 'Temperature', [
        { label: '<35 (2)', value: 2 },
        { label: '35–38.4 (0)', value: 0 },
        { label: '≥38.5 (2)', value: 2 },
      ]),
      selectInput('avpu', 'AVPU', [
        { label: 'Alert (0)', value: 0 },
        { label: 'Voice (1)', value: 1 },
        { label: 'Pain (2)', value: 2 },
        { label: 'Unresponsive (3)', value: 3 },
      ]),
    ],
    calculate(values) {
      const score = num(values.sbp) + num(values.hr) + num(values.rr) + num(values.temp) + num(values.avpu);
      const r = riskFromThresholds(score, [
        { max: 2, level: 'low', label: 'Low', interpretation: 'Continue routine monitoring.' },
        { max: 4, level: 'moderate', label: 'Intermediate', interpretation: 'Increase frequency of observations; notify nurse in charge.' },
        { max: 20, level: 'high', label: 'High (≥5)', interpretation: 'Urgent medical review; consider higher level of care.' },
      ]);
      return { score, ...r };
    },
    evidence: {
      summary: 'MEWS aggregates physiologic parameters to trigger rapid response.',
      validation: 'Multiple institutional validations for predicting ICU transfer/cardiac arrest.',
      references: [{ title: 'Validation of a modified Early Warning Score', citation: 'Subbe CP et al. QJM. 2001', year: 2001, pmid: '11588210',
          doi: '10.1093/qjmed/94.10.521', }],
    },
    nextSteps: [{ condition: 'MEWS ≥5', actions: ['Rapid response / medical emergency team', 'ABC assessment'] }],
  },
  {
    id: 'curb65',
    name: 'CURB-65 Score',
    shortName: 'CURB-65',
    description: 'Severity assessment for community-acquired pneumonia.',
    category: 'pulmonary',
    tags: ['pneumonia', 'cap', 'curb'],
    whenToUse: 'Adults with community-acquired pneumonia for site-of-care decisions.',
    whyUse: 'Simple 5-variable score endorsed by BTS guidelines.',
    inputs: [
      yesNo('confusion', 'Confusion (new)', 1),
      yesNo('urea', 'Urea > 7 mmol/L (BUN > 19 mg/dL)', 1),
      yesNo('rr', 'Respiratory rate ≥ 30', 1),
      yesNo('bp', 'SBP < 90 or DBP ≤ 60', 1),
      yesNo('age', 'Age ≥ 65', 1),
    ],
    calculate(values) {
      const score = ['confusion', 'urea', 'rr', 'bp', 'age'].reduce((s, k) => s + (bool(values[k]) ? 1 : 0), 0);
      const mort = ['0.6%', '2.7%', '6.8%', '14%', '27.8%', '27.8%'];
      const r = riskFromThresholds(score, [
        { max: 1, level: 'low', label: 'Low severity (0–1)', interpretation: `Mortality ~${mort[score]}. Often suitable for outpatient treatment if social circumstances allow.` },
        { max: 2, level: 'moderate', label: 'Moderate (2)', interpretation: `Mortality ~${mort[score]}. Consider short-stay / inpatient care.` },
        { max: 5, level: 'high', label: 'High (3–5)', interpretation: `Mortality ~${mort[score]}. Hospitalize; consider ICU if ≥3 with organ failure.` },
      ]);
      return { score, ...r, details: [{ label: 'Approx. 30-day mortality', value: mort[score] }] };
    },
    evidence: {
      summary: 'CURB-65 from BTS CAP studies predicts mortality and guides disposition.',
      formula: 'Confusion + Urea + RR + BP + Age≥65 (1 each)',
      validation: 'Validated internationally; PSI is more granular alternative.',
      references: [{ title: 'Defining community acquired pneumonia severity on presentation to hospital', citation: 'Lim WS et al. Thorax. 2003', year: 2003, pmid: '12728155',
          doi: '10.1136/thorax.58.5.377', }],
    },
    nextSteps: [
      { condition: '0–1', actions: ['Oral antibiotics outpatient', 'Safety-net advice'] },
      { condition: '≥3', actions: ['Inpatient IV antibiotics', 'Assess for ICU (ventilatory failure, shock)'] },
    ],
  },
  {
    id: 'psi-port',
    name: 'PSI / PORT Score (Pneumonia)',
    shortName: 'PSI/PORT',
    description: 'Pneumonia Severity Index for CAP mortality and site-of-care.',
    category: 'pulmonary',
    tags: ['pneumonia', 'psi', 'port'],
    whenToUse: 'Adult CAP risk stratification when more detail than CURB-65 is desired.',
    whyUse: 'Highly validated; Classes I–II often outpatient candidates.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 18, max: 110, defaultValue: 65 }),
      selectInput('sex', 'Sex', [
        { label: 'Female (−10)', value: -10 },
        { label: 'Male (0)', value: 0 },
      ]),
      yesNo('nh', 'Nursing home resident', 10),
      yesNo('neoplasm', 'Neoplastic disease', 30),
      yesNo('liver', 'Liver disease', 20),
      yesNo('chf', 'CHF', 10),
      yesNo('cerebro', 'Cerebrovascular disease', 10),
      yesNo('renal', 'Renal disease', 10),
      yesNo('ams', 'Altered mental status', 20),
      yesNo('rr30', 'RR ≥ 30', 20),
      yesNo('sbp90', 'SBP < 90', 20),
      yesNo('temp35', 'Temp <35 or ≥40°C', 15),
      yesNo('hr125', 'Pulse ≥ 125', 10),
      yesNo('ph735', 'Arterial pH < 7.35', 30),
      yesNo('bun30', 'BUN ≥ 30 mg/dL', 20),
      yesNo('na130', 'Sodium < 130', 20),
      yesNo('glu250', 'Glucose ≥ 250', 10),
      yesNo('hct30', 'Hematocrit < 30%', 10),
      yesNo('pao260', 'PaO₂ < 60 or SpO₂ < 90%', 10),
      yesNo('pleural', 'Pleural effusion', 10),
    ],
    calculate(values) {
      let score = num(values.age) + num(values.sex);
      const pts: [string, number][] = [
        ['nh', 10], ['neoplasm', 30], ['liver', 20], ['chf', 10], ['cerebro', 10], ['renal', 10],
        ['ams', 20], ['rr30', 20], ['sbp90', 20], ['temp35', 15], ['hr125', 10],
        ['ph735', 30], ['bun30', 20], ['na130', 20], ['glu250', 10], ['hct30', 10], ['pao260', 10], ['pleural', 10],
      ];
      pts.forEach(([k, p]) => {
        if (bool(values[k])) score += p;
      });
      let cls = 'I–II';
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
      let mort = '<1%';
      if (score <= 70) {
        cls = score < 51 ? 'I–II' : 'II';
        mort = '0.1–0.6%';
        riskLevel = 'low';
      } else if (score <= 90) {
        cls = 'III';
        mort = '0.9–2.8%';
        riskLevel = 'moderate';
      } else if (score <= 130) {
        cls = 'IV';
        mort = '8.2–9.3%';
        riskLevel = 'high';
      } else {
        cls = 'V';
        mort = '27–29%';
        riskLevel = 'critical';
      }
      return {
        score,
        label: `PSI Class ${cls}`,
        interpretation: `Approx. mortality ${mort}. Classes I–II often outpatient; III observation; IV–V inpatient/ICU consideration.`,
        riskLevel,
        details: [{ label: 'Approx. mortality', value: mort }],
      };
    },
    evidence: {
      summary: 'PORT/PSI from Pneumonia Patient Outcomes Research Team predicts CAP mortality.',
      validation: 'One of the most validated pneumonia severity tools.',
      references: [{ title: 'A prediction rule to identify low-risk patients with community-acquired pneumonia', citation: 'Fine MJ et al. N Engl J Med. 1997', year: 1997, pmid: '8995086',
          doi: '10.1056/NEJM199701233360402', }],
    },
    nextSteps: [
      { condition: 'Class I–II', actions: ['Outpatient oral antibiotics if reliable'] },
      { condition: 'Class IV–V', actions: ['Admit', 'Consider ICU for respiratory failure/shock'] },
    ],
  },
  {
    id: 'apache2-simp',
    name: 'APACHE II (Simplified Educational)',
    shortName: 'APACHE II≈',
    description: 'Simplified educational estimate of ICU severity of illness.',
    category: 'critical-care',
    tags: ['icu', 'apache', 'severity'],
    whenToUse: 'Educational approximation of ICU mortality risk.',
    whyUse: 'Classic ICU severity score; full APACHE II needs 12 physiologic variables.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 0, max: 110, defaultValue: 60 }),
      // APACHE II neurologic points = 15 − GCS (not SOFA-style buckets)
      numberInput('gcs', 'GCS', { min: 3, max: 15, defaultValue: 15, helpText: 'Points = 15 − GCS' }),
      selectInput('map', 'MAP category', [
        { label: '70–109 (0)', value: 0 },
        { label: '50–69 or 110–129 (2)', value: 2 },
        { label: '130–159 (3)', value: 3 },
        { label: '≤49 or ≥160 (4)', value: 4 },
      ]),
      selectInput('hr', 'HR category', [
        { label: '70–109 (0)', value: 0 },
        { label: '55–69 or 110–139 (2)', value: 2 },
        { label: '40–54 or 140–179 (3)', value: 3 },
        { label: '≤39 or ≥180 (4)', value: 4 },
      ]),
      selectInput('rr', 'RR category', [
        { label: '12–24 (0)', value: 0 },
        { label: '10–11 or 25–34 (1)', value: 1 },
        { label: '6–9 or 35–49 (3)', value: 3 },
        { label: '≤5 or ≥50 (4)', value: 4 },
      ]),
      selectInput('na', 'Sodium', [
        { label: '130–149 (0)', value: 0 },
        { label: '150–154 (1)', value: 1 },
        { label: '120–129 or 155–159 (2)', value: 2 },
        { label: '111–119 or 160–179 (3)', value: 3 },
        { label: '≤110 or ≥180 (4)', value: 4 },
      ]),
      selectInput('k', 'Potassium', [
        { label: '3.5–5.4 (0)', value: 0 },
        { label: '3.0–3.4 or 5.5–5.9 (1)', value: 1 },
        { label: '2.5–2.9 (2)', value: 2 },
        { label: '<2.5 or ≥7 (4)', value: 4 },
        { label: '6.0–6.9 (3)', value: 3 },
      ]),
      selectInput('cr', 'Creatinine (acute)', [
        { label: '0.6–1.4 (0)', value: 0 },
        { label: '1.5–1.9 (2)', value: 2 },
        { label: '2.0–3.4 (3)', value: 3 },
        { label: '≥3.5 (4)', value: 4 },
        { label: '<0.6 (2)', value: 2 },
      ]),
      selectInput('hct', 'Hematocrit', [
        { label: '30–45.9 (0)', value: 0 },
        { label: '46–49.9 (1)', value: 1 },
        { label: '20–29.9 or ≥50 (2)', value: 2 },
        { label: '<20 (4)', value: 4 },
      ]),
      selectInput('wbc', 'WBC', [
        { label: '3–14.9 (0)', value: 0 },
        { label: '15–19.9 (1)', value: 1 },
        { label: '1–2.9 or 20–39.9 (2)', value: 2 },
        { label: '<1 or ≥40 (4)', value: 4 },
      ]),
      yesNo('chronic', 'Severe chronic organ insufficiency or immunocompromise', 0),
      selectInput('admitType', 'Admission type (chronic-health points only if chronic disease present)', [
        { label: 'No chronic disease / none applicable (0)', value: 0 },
        { label: 'Elective postoperative (+2 if chronic)', value: 2 },
        { label: 'Non-operative or emergency postoperative (+5 if chronic)', value: 5 },
      ]),
    ],
    calculate(values) {
      let agePts = 0;
      const age = num(values.age, 60);
      if (age >= 75) agePts = 6;
      else if (age >= 65) agePts = 5;
      else if (age >= 55) agePts = 3;
      else if (age >= 45) agePts = 2;
      const gcs = Math.min(15, Math.max(3, num(values.gcs, 15)));
      const gcsPts = 15 - gcs;
      // Chronic health: 0 if no chronic disease; else +2 elective postop or +5 non-op/emergency (not both)
      const chronicPts = bool(values.chronic) ? num(values.admitType, 5) : 0;
      const score =
        agePts +
        gcsPts +
        num(values.map) +
        num(values.hr) +
        num(values.rr) +
        num(values.na) +
        num(values.k) +
        num(values.cr) +
        num(values.hct) +
        num(values.wbc) +
        chronicPts;
      // Rough mortality bands
      const r = riskFromThresholds(score, [
        { max: 9, level: 'low', label: 'Lower severity', interpretation: 'Approximate lower ICU mortality band. Educational estimate only.' },
        { max: 19, level: 'moderate', label: 'Moderate severity', interpretation: 'Intermediate predicted mortality.' },
        { max: 29, level: 'high', label: 'High severity', interpretation: 'High predicted mortality; full APACHE recommended for research/benchmarking.' },
        { max: 71, level: 'critical', label: 'Very high severity', interpretation: 'Very high predicted mortality.' },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'GCS points', value: `${gcsPts} (15 − ${gcs})` },
          { label: 'Chronic health points', value: String(chronicPts) },
          { label: 'Note', value: 'Simplified — not full APACHE II (missing A-a gradient, pH, FiO₂, etc.)' },
        ],
      };
    },
    evidence: {
      summary: 'APACHE II (Knaus 1985): age + acute physiology (incl. GCS points = 15−GCS) + chronic health (0, or +2 elective / +5 non-op or emergency postop if severe chronic disease). This tool omits some APS variables.',
      validation: 'Extensively used for ICU case-mix adjustment; APACHE III/IV superseded for benchmarking.',
      references: [{ title: 'APACHE II: a severity of disease classification system', citation: 'Knaus WA et al. Crit Care Med. 1985', year: 1985, pmid: '3928249' }],
    },
    nextSteps: [{ condition: 'High score', actions: ['Ensure goals of care discussions', 'Aggressive organ support as appropriate'] }],
  },
  {
    id: 'rts',
    name: 'Revised Trauma Score (RTS)',
    shortName: 'RTS',
    description: 'Physiologic trauma severity using GCS, SBP, and RR.',
    category: 'emergency',
    tags: ['trauma', 'triage'],
    whenToUse: 'Trauma severity/prognosis (weighted RTS in TRISS); field triage often uses unweighted T-RTS.',
    whyUse: 'Component of TRISS; correlates with survival.',
    inputs: [
      selectInput('gcs', 'GCS coded', [
        { label: '13–15 (4)', value: 4 },
        { label: '9–12 (3)', value: 3 },
        { label: '6–8 (2)', value: 2 },
        { label: '4–5 (1)', value: 1 },
        { label: '3 (0)', value: 0 },
      ]),
      selectInput('sbp', 'SBP coded', [
        { label: '>89 (4)', value: 4 },
        { label: '76–89 (3)', value: 3 },
        { label: '50–75 (2)', value: 2 },
        { label: '1–49 (1)', value: 1 },
        { label: '0 (0)', value: 0 },
      ]),
      selectInput('rr', 'RR coded', [
        { label: '10–29 (4)', value: 4 },
        { label: '>29 (3)', value: 3 },
        { label: '6–9 (2)', value: 2 },
        { label: '1–5 (1)', value: 1 },
        { label: '0 (0)', value: 0 },
      ]),
    ],
    calculate(values) {
      const g = num(values.gcs);
      const s = num(values.sbp);
      const r = num(values.rr);
      const rts = round(0.9368 * g + 0.7326 * s + 0.2908 * r, 2);
      const riskLevel = rts < 4 ? 'critical' : rts < 6 ? 'high' : rts < 7 ? 'moderate' : 'low';
      return {
        score: rts,
        label: `RTS ${rts}`,
        interpretation: 'Higher RTS indicates better physiology. RTS <4 often associated with high mortality.',
        riskLevel: riskLevel as 'low' | 'moderate' | 'high' | 'critical',
        details: [{ label: 'Coded GCS/SBP/RR', value: `${g}/${s}/${r}` }],
      };
    },
    evidence: {
      summary: 'RTS weights coded GCS, SBP, and RR for trauma survival prediction.',
      formula: 'RTS = 0.9368·GCSc + 0.7326·SBPc + 0.2908·RRc',
      validation: 'Used with ISS in TRISS methodology.',
      references: [{ title: 'A revision of the Trauma Score', citation: 'Champion HR et al. J Trauma. 1989', year: 1989, pmid: '2657085',
          doi: '10.1097/00005373-198905000-00017', }],
    },
    nextSteps: [{ condition: 'Low RTS', actions: ['Trauma team activation', 'ABCs and hemorrhage control', 'Damage control resuscitation'] }],
  },
  {
    id: 'aa-gradient',
    name: 'A–a Oxygen Gradient',
    shortName: 'A–a Gradient',
    description: 'Alveolar–arterial oxygen gradient to evaluate hypoxemia.',
    category: 'pulmonary',
    tags: ['abg', 'hypoxemia', 'respiratory'],
    whenToUse: 'ABG interpretation for hypoxemia differential.',
    whyUse: 'Distinguishes V/Q mismatch, shunt, diffusion vs hypoventilation/low FiO₂.',
    inputs: [
      numberInput('fio2', 'FiO₂', { unit: '(0.21–1.0)', min: 0.21, max: 1, step: 0.01, defaultValue: 0.21 }),
      numberInput('paco2', 'PaCO₂', { unit: 'mmHg', min: 10, max: 100, defaultValue: 40 }),
      numberInput('pao2', 'PaO₂', { unit: 'mmHg', min: 20, max: 600, defaultValue: 90 }),
      numberInput('age', 'Age (for expected)', { unit: 'years', min: 0, max: 110, defaultValue: 40 }),
      numberInput('patm', 'Atmospheric pressure', { unit: 'mmHg', min: 500, max: 800, defaultValue: 760 }),
    ],
    calculate(values) {
      const fio2 = num(values.fio2, 0.21);
      const paco2 = num(values.paco2, 40);
      const pao2 = num(values.pao2, 90);
      const age = num(values.age, 40);
      const patm = num(values.patm, 760);
      const ph2o = 47;
      const pao2Alv = fio2 * (patm - ph2o) - paco2 / 0.8;
      const aa = round(pao2Alv - pao2, 1);
      const expected = round(age / 4 + 4, 1);
      const elevated = aa > expected + 5;
      return {
        score: aa,
        unit: 'mmHg',
        label: elevated ? 'Elevated A–a gradient' : 'Normal A–a gradient',
        interpretation: elevated
          ? 'Elevated gradient suggests V/Q mismatch, shunt, or diffusion limitation (PE, pneumonia, edema, fibrosis, etc.).'
          : 'Normal gradient; hypoxemia if present more consistent with hypoventilation or low inspired O₂.',
        riskLevel: elevated ? 'moderate' : 'normal',
        details: [
          { label: 'PAO₂ (alveolar)', value: `${round(pao2Alv, 1)} mmHg` },
          { label: 'Expected A–a (approx.)', value: `${expected} mmHg` },
        ],
      };
    },
    evidence: {
      summary: 'PAO₂ = FiO₂(Patm−47) − PaCO₂/R; A–a = PAO₂ − PaO₂. Expected rises with age.',
      formula: 'A–a = [FiO₂(P atm−47) − PaCO₂/0.8] − PaO₂',
      validation: 'Standard respiratory physiology teaching.',
      references: [{ title: 'West\'s Respiratory Physiology: The Essentials', citation: 'West JB, Luks AM. West\'s Respiratory Physiology (textbook chapters on gas exchange / A-a gradient)', year: 2016, url: 'https://www.wolterskluwer.com/en/solutions/ovid/wests-respiratory-physiology-the-essentials-3363' }],
    },
    nextSteps: [
      { condition: 'Elevated A–a + hypoxemia', actions: ['CXR/CT as indicated', 'Consider PE, pneumonia, edema, ILD', 'Supplemental O₂ / ventilatory support'] },
    ],
  },
  {
    id: 'pf-ratio',
    name: 'PaO₂/FiO₂ Ratio (P/F)',
    shortName: 'P/F Ratio',
    description: 'Oxygenation index used in ARDS severity classification.',
    category: 'critical-care',
    tags: ['ards', 'oxygenation', 'icu'],
    whenToUse: 'Hypoxemic respiratory failure / ARDS assessment.',
    whyUse: 'Berlin definition severity tiers based on P/F with PEEP ≥5.',
    inputs: [
      numberInput('pao2', 'PaO₂', { unit: 'mmHg', min: 20, max: 600, defaultValue: 80 }),
      numberInput('fio2', 'FiO₂', { unit: 'fraction', min: 0.21, max: 1, step: 0.01, defaultValue: 0.5 }),
    ],
    calculate(values) {
      const pao2 = num(values.pao2, 80);
      const fio2 = num(values.fio2, 0.5);
      const pf = round(pao2 / fio2, 0);
      const r = riskFromThresholds(pf, [
        { max: 100, level: 'critical', label: 'Severe ARDS range (≤100)', interpretation: 'If ARDS criteria met: severe. Consider prone positioning, NM blockade, ECMO evaluation.' },
        { max: 200, level: 'high', label: 'Moderate ARDS range (≤200)', interpretation: 'Moderate ARDS range if other criteria met.' },
        { max: 300, level: 'moderate', label: 'Mild ARDS range (≤300)', interpretation: 'Mild ARDS range if acute onset, bilateral opacities, not pure cardiogenic.' },
        { max: 600, level: 'low', label: 'Above ARDS threshold', interpretation: 'P/F >300; does not meet Berlin hypoxemia threshold for ARDS.' },
      ]);
      return { score: pf, unit: 'mmHg', ...r };
    },
    evidence: {
      summary: 'Berlin ARDS definition uses P/F ≤300 with PEEP≥5 cmH₂O plus radiographic and timing criteria.',
      validation: 'Standard ICU oxygenation metric.',
      references: [{ title: 'Acute Respiratory Distress Syndrome: The Berlin Definition', citation: 'ARDS Definition Task Force. JAMA. 2012', year: 2012, pmid: '22797452',
          doi: '10.1001/jama.2012.5669', }],
    },
    nextSteps: [
      { condition: 'P/F ≤300 with ARDS', actions: ['Lung-protective ventilation (6 mL/kg PBW)', 'Adequate PEEP', 'Treat underlying cause'] },
    ],
  },
];
