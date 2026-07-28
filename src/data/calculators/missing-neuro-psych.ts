import type { Calculator } from '../../types/calculator';
import { num, bool, yesNo, selectInput, numberInput, riskFromThresholds } from '../../utils/helpers';

export const missingNeuroPsychCalcs: Calculator[] = [
  {
    id: 'hunt-hess',
    name: 'Hunt and Hess Grade (SAH)',
    shortName: 'Hunt-Hess',
    description: 'Clinical severity grade for aneurysmal subarachnoid hemorrhage (I–V).',
    category: 'neurology',
    tags: ['sah', 'aneurysm', 'neuro', 'grade'],
    whenToUse: 'Patients with confirmed subarachnoid hemorrhage for clinical severity grading.',
    whyUse: 'Classic bedside grade linked to surgical risk and outcomes; complements Fisher/modified Fisher imaging grades.',
    inputs: [
      selectInput('grade', 'Hunt and Hess clinical grade', [
        {
          label: 'I — Asymptomatic / mild headache / slight nuchal rigidity',
          value: 1,
          description: 'Minimal symptoms',
        },
        {
          label: 'II — Moderate–severe headache, nuchal rigidity, ± cranial nerve palsy only',
          value: 2,
        },
        {
          label: 'III — Drowsiness, confusion, or mild focal deficit',
          value: 3,
        },
        {
          label: 'IV — Stupor, moderate–severe hemiparesis, early decerebrate rigidity possible',
          value: 4,
        },
        {
          label: 'V — Deep coma, decerebrate posturing, moribund appearance',
          value: 5,
        },
      ]),
    ],
    calculate(values) {
      const grade = num(values.grade, 1);
      const r = riskFromThresholds(grade, [
        {
          max: 1,
          level: 'low',
          label: 'Grade I',
          interpretation:
            'Minimal clinical severity. Historically best surgical risk among SAH grades. Still requires SAH pathway, BP control, and aneurysm securement planning.',
        },
        {
          max: 2,
          level: 'moderate',
          label: 'Grade II',
          interpretation:
            'Moderate clinical severity without major focal deficit (CN palsy allowed). Standard SAH ICU care and early aneurysm treatment as indicated.',
        },
        {
          max: 3,
          level: 'high',
          label: 'Grade III',
          interpretation:
            'Impaired alertness or mild focal deficit. Higher morbidity; close neuro monitoring for hydrocephalus, rebleeding, and delayed cerebral ischemia.',
        },
        {
          max: 4,
          level: 'critical',
          label: 'Grade IV',
          interpretation:
            'Stupor / major deficit. High risk of poor outcome; airway protection, ICP/hydrocephalus management, and multidisciplinary neurocritical care.',
        },
        {
          max: 5,
          level: 'critical',
          label: 'Grade V',
          interpretation:
            'Deep coma / moribund. Very high mortality. Resuscitation, reversible causes (e.g., hydrocephalus), and goals-of-care discussion alongside treatment candidacy.',
        },
      ]);
      return {
        score: grade,
        unit: 'grade',
        ...r,
        details: [{ label: 'Scale', value: 'Hunt and Hess I–V' }],
      };
    },
    evidence: {
      summary:
        'Hunt and Hess grades SAH by clinical exam from asymptomatic (I) to deep coma (V). Higher grades associate with worse outcomes and historically higher operative risk.',
      formula: 'Select clinical grade I–V based on headache, meningismus, consciousness, and motor findings.',
      validation: 'Longstanding neurosurgical grading system; used with imaging grades (Fisher/modified Fisher) and WFNS.',
      references: [
        {
          title: 'Surgical risk as related to time of intervention in the repair of intracranial aneurysms',
          citation: 'Hunt WE, Hess RM. J Neurosurg. 1968',
          year: 1968, pmid: '5635959',
          doi: '10.3171/jns.1968.28.1.0014', },
      ],
    },
    nextSteps: [
      {
        condition: 'Any SAH grade',
        actions: [
          'ABCs / neuro ICU monitoring',
          'CTA/DSA for aneurysm detection and securement planning',
          'BP control, reverse anticoagulation, nimodipine per guidelines',
          'Treat clinical seizures; avoid routine ASM prophylaxis except selected high-risk features',
        ],
      },
      {
        condition: 'Grade IV–V',
        actions: ['Airway protection', 'Evaluate for hydrocephalus / EVD', 'Discuss prognosis and treatment goals'],
      },
    ],
    pearls: [
      'Serious systemic disease may bump grade up one level in original descriptions.',
      'WFNS uses GCS + motor deficit; report both when communicating.',
    ],
  },
  {
    id: 'fisher-grade',
    name: 'Modified Fisher CT Grade (SAH)',
    shortName: 'mFisher',
    description: 'Modified Fisher scale for SAH blood burden and IVH on CT (0–4); predicts vasospasm risk better than classic Fisher.',
    category: 'neurology',
    tags: ['sah', 'fisher', 'ct', 'vasospasm'],
    whenToUse: 'CT assessment of aneurysmal SAH to estimate delayed cerebral ischemia / vasospasm risk.',
    whyUse: 'Modified Fisher accounts for thick cisternal blood and IVH combinations that drive vasospasm risk.',
    inputs: [
      selectInput('sah', 'Cisternal / fissure SAH on CT', [
        { label: 'No SAH', value: 0 },
        { label: 'Thin SAH (focal or diffuse, <1 mm layers)', value: 1 },
        { label: 'Thick SAH (completely filling ≥1 cistern/fissure or ≥1 mm layers)', value: 2 },
      ]),
      yesNo('ivh', 'Intraventricular hemorrhage present'),
    ],
    calculate(values) {
      const sah = num(values.sah, 0);
      const ivh = bool(values.ivh);
      let grade = 0;
      if (sah === 0 && !ivh) grade = 0;
      else if (sah === 0 && ivh) grade = 2; // pure IVH often mapped as mFisher 2
      else if (sah === 1 && !ivh) grade = 1;
      else if (sah === 1 && ivh) grade = 2;
      else if (sah === 2 && !ivh) grade = 3;
      else grade = 4;

      const r = riskFromThresholds(grade, [
        {
          max: 0,
          level: 'low',
          label: 'Modified Fisher 0',
          interpretation: 'No SAH or IVH. Lowest radiographic blood burden; clinical SAH pathway still if diagnosis confirmed by other means.',
        },
        {
          max: 1,
          level: 'moderate',
          label: 'Modified Fisher 1',
          interpretation: 'Thin SAH without IVH. Intermediate vasospasm risk relative to thick blood grades.',
        },
        {
          max: 2,
          level: 'moderate',
          label: 'Modified Fisher 2',
          interpretation: 'Thin SAH with IVH (or IVH-dominant pattern). Elevated DCI/vasospasm risk vs grade 1.',
        },
        {
          max: 3,
          level: 'high',
          label: 'Modified Fisher 3',
          interpretation: 'Thick SAH without IVH. High risk of delayed cerebral ischemia — intensive monitoring.',
        },
        {
          max: 4,
          level: 'critical',
          label: 'Modified Fisher 4',
          interpretation: 'Thick SAH with IVH. Highest modified Fisher vasospasm/DCI risk category.',
        },
      ]);

      return {
        score: grade,
        unit: 'grade',
        ...r,
        details: [
          { label: 'SAH burden', value: sah === 0 ? 'None' : sah === 1 ? 'Thin' : 'Thick' },
          { label: 'IVH', value: ivh ? 'Yes' : 'No' },
          { label: 'Classic Fisher note', value: 'Classic Fisher 1–4 differs (grade 3 = thick cisternal clot highest vasospasm in original).' },
        ],
      };
    },
    evidence: {
      summary:
        'Modified Fisher: 0 none; 1 thin SAH no IVH; 2 thin SAH + IVH; 3 thick SAH no IVH; 4 thick SAH + IVH. Designed to improve vasospasm prediction over original Fisher grades.',
      formula: 'Thick SAH = completely filling ≥1 cistern or fissure; combine with presence/absence of IVH.',
      validation: 'Associated with delayed cerebral ischemia risk in aSAH cohorts; used widely in neurocritical care.',
      references: [
        {
          title: 'Prediction of symptomatic vasospasm after SAH: the modified Fisher scale',
          citation: 'Frontera JA et al. Neurosurgery. 2006',
          year: 2006, pmid: '16823296',
          doi: '10.1227/01.neu.0000243277.86222.6c', },
        {
          title: 'Relation of cerebral vasospasm to SAH visualized by CT scanning',
          citation: 'Fisher CM et al. Neurosurgery. 1980',
          year: 1980, pmid: '7354892',
          doi: '10.1227/00006123-198001000-00001', },
      ],
    },
    nextSteps: [
      {
        condition: 'All aSAH',
        actions: [
          'Nimodipine (all aSAH unless contraindicated)',
          'Euvolemia; avoid prophylactic hypervolemia',
        ],
      },
      {
        condition: 'Grade ≥3 (thick SAH)',
        actions: [
          'Neuro ICU monitoring for DCI (days 3–14 typical peak)',
          'Low threshold for TCD / perfusion imaging if exam changes',
        ],
      },
    ],
    pearls: [
      'Original Fisher grade 3 (localized clot / layer >1 mm) had the highest vasospasm rate; grade 4 was ICH/IVH with diffuse or no SAH.',
      'Report clinical grade (Hunt-Hess/WFNS) and imaging grade together.',
    ],
  },
  {
    id: 'ich-score',
    name: 'ICH Score',
    shortName: 'ICH Score',
    description: 'Intracerebral hemorrhage 30-day mortality risk score (GCS, volume, IVH, location, age).',
    category: 'neurology',
    tags: ['ich', 'hemorrhage', 'stroke', 'prognosis'],
    whenToUse: 'Spontaneous intracerebral hemorrhage prognosis discussions and risk stratification.',
    whyUse: 'Simple, validated 0–6 score correlating with 30-day mortality.',
    inputs: [
      selectInput('gcs', 'Glasgow Coma Scale', [
        { label: 'GCS 13–15 (0)', value: 0 },
        { label: 'GCS 5–12 (1)', value: 1 },
        { label: 'GCS 3–4 (2)', value: 2 },
      ]),
      selectInput('volume', 'ICH volume', [
        { label: '<30 mL (0)', value: 0 },
        { label: '≥30 mL (1)', value: 1 },
      ], 0, 'ABC/2 method commonly used on CT'),
      yesNo('ivh', 'Intraventricular hemorrhage present', 1),
      yesNo('infra', 'Infratentorial origin', 1),
      yesNo('age80', 'Age ≥80 years', 1),
    ],
    calculate(values) {
      const score =
        num(values.gcs) +
        num(values.volume) +
        (bool(values.ivh) ? 1 : 0) +
        (bool(values.infra) ? 1 : 0) +
        (bool(values.age80) ? 1 : 0);

      // Approximate published 30-day mortality bands (Hemphill et al.)
      const mortalityApprox: Record<number, string> = {
        0: '~0%',
        1: '~13%',
        2: '~26%',
        3: '~72%',
        4: '~97%',
        5: '~100%',
        6: '~100%',
      };

      const r = riskFromThresholds(score, [
        {
          max: 1,
          level: 'low',
          label: 'Lower mortality band',
          interpretation: `ICH score ${score}: approximate 30-day mortality ${mortalityApprox[score] ?? 'low'}. Individual outcomes vary; use for communication, not withdrawal-of-care alone.`,
        },
        {
          max: 2,
          level: 'moderate',
          label: 'Intermediate',
          interpretation: `ICH score ${score}: approximate 30-day mortality ${mortalityApprox[score]}. Aggressive supportive care often still appropriate.`,
        },
        {
          max: 3,
          level: 'high',
          label: 'High',
          interpretation: `ICH score ${score}: approximate 30-day mortality ${mortalityApprox[score]}. High risk — ICU care, BP control, reverse coagulopathy.`,
        },
        {
          max: 6,
          level: 'critical',
          label: 'Very high',
          interpretation: `ICH score ${score}: approximate 30-day mortality ${mortalityApprox[score] ?? '~100%'}. Grave prognosis statistically; avoid self-fulfilling prophecy — integrate exam trajectory and family goals.`,
        },
      ]);

      return {
        score,
        ...r,
        details: [
          { label: 'Components', value: 'GCS + volume≥30 + IVH + infratentorial + age≥80' },
          { label: 'Approx. 30-day mortality', value: mortalityApprox[score] ?? '—' },
          { label: 'Range', value: '0–6' },
        ],
      };
    },
    evidence: {
      summary:
        'ICH Score = GCS points (13–15:0, 5–12:1, 3–4:2) + ICH volume ≥30 mL (1) + IVH (1) + infratentorial (1) + age ≥80 (1).',
      formula: 'Sum 0–6 as above',
      validation: 'Hemphill et al. derivation/validation for 30-day mortality after ICH.',
      references: [
        {
          title: 'The ICH Score: a simple, reliable grading scale for ICH',
          citation: 'Hemphill JC et al. Stroke. 2001',
          year: 2001,
          pmid: '11283388',
          doi: '10.1161/01.str.32.4.891',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'All ICH',
        actions: [
          'Airway/BP management per guidelines',
          'Reverse anticoagulation',
          'Neurosurgery consult (posterior fossa, hydrocephalus, selected supratentorial)',
          'Avoid early nihilism based on score alone',
        ],
      },
    ],
    pearls: [
      'Volume ≈ ABC/2 on axial CT (cm).',
      'FUNC score estimates functional independence; complements ICH score mortality estimate.',
    ],
  },
  {
    id: 'mrs',
    name: 'Modified Rankin Scale (mRS)',
    shortName: 'mRS',
    description: 'Global disability scale after stroke (0–6), standard trial outcome measure.',
    category: 'neurology',
    tags: ['stroke', 'disability', 'outcome', 'rankin'],
    whenToUse: 'Baseline and follow-up functional status after stroke or neurologic injury.',
    whyUse: 'Universal ordinal disability scale for prognosis discussions and research endpoints (often mRS 0–2 = good outcome).',
    inputs: [
      selectInput('mrs', 'Modified Rankin grade', [
        { label: '0 — No symptoms', value: 0 },
        { label: '1 — No significant disability; able to carry out all usual activities despite symptoms', value: 1 },
        { label: '2 — Slight disability; unable to carry out all previous activities but independent in affairs', value: 2 },
        { label: '3 — Moderate disability; requires some help but walks unassisted', value: 3 },
        { label: '4 — Moderately severe; unable to walk/attend bodily needs without assistance', value: 4 },
        { label: '5 — Severe disability; bedridden, incontinent, constant nursing care', value: 5 },
        { label: '6 — Dead', value: 6 },
      ]),
    ],
    calculate(values) {
      const score = num(values.mrs, 0);
      const r = riskFromThresholds(score, [
        {
          max: 0,
          level: 'normal',
          label: 'No symptoms',
          interpretation: 'mRS 0: no residual symptoms.',
        },
        {
          max: 2,
          level: 'low',
          label: 'Independent (mRS 0–2)',
          interpretation: 'Functional independence range commonly defined as “good outcome” in stroke trials (mRS ≤2).',
        },
        {
          max: 3,
          level: 'moderate',
          label: 'Moderate disability',
          interpretation: 'mRS 3: needs help with some activities but ambulates without assistance from another person.',
        },
        {
          max: 5,
          level: 'high',
          label: 'Dependent (mRS 4–5)',
          interpretation: 'Significant dependence for walking and/or daily care. Rehab and support services critical.',
        },
        {
          max: 6,
          level: 'critical',
          label: 'Death',
          interpretation: 'mRS 6: death.',
        },
      ]);
      return {
        score,
        ...r,
        details: [{ label: 'Common dichotomies', value: '0–1 excellent; 0–2 good/independent; 3–6 dependent or dead' }],
      };
    },
    evidence: {
      summary: 'mRS is a 7-level (0–6) global disability scale widely used as primary outcome in stroke RCTs.',
      validation: 'Structured interviews improve reliability; central adjudication common in trials.',
      references: [
        {
          title: 'Improving the assessment of outcomes in stroke: use of a structured interview for mRS',
          citation: 'Wilson JTL et al. Stroke. 2002; Rankin J. 1957 original',
          year: 2002, pmid: '12215594',
          doi: '10.1161/01.str.0000027437.22450.bd', },
      ],
    },
    nextSteps: [
      {
        condition: 'mRS ≥3',
        actions: ['PT/OT/SLT as indicated', 'Secondary stroke prevention', 'Caregiver support and disposition planning'],
      },
    ],
  },
  {
    id: 'four-score',
    name: 'FOUR Score (Full Outline of UnResponsiveness)',
    shortName: 'FOUR',
    description: 'Coma scale with eye, motor, brainstem, and respiration subscales (0–16); useful when intubated.',
    category: 'critical-care',
    tags: ['coma', 'neuro', 'icu', 'gcs alternative'],
    whenToUse: 'Altered consciousness in ICU/neurocritical care, especially intubated patients (no verbal component needed).',
    whyUse: 'Captures brainstem reflexes and respiratory pattern missing from GCS; total 0–16.',
    inputs: [
      selectInput('eye', 'Eye response (E)', [
        { label: '4 — Eyelids open or opened, tracking or blinking to command', value: 4 },
        { label: '3 — Eyelids open but not tracking', value: 3 },
        { label: '2 — Eyelids closed but open to loud voice', value: 2 },
        { label: '1 — Eyelids closed but open to pain', value: 1 },
        { label: '0 — Eyelids remain closed with pain', value: 0 },
      ]),
      selectInput('motor', 'Motor response (M)', [
        { label: '4 — Thumbs-up, fist, or peace sign to command', value: 4 },
        { label: '3 — Localizing to pain', value: 3 },
        { label: '2 — Flexion response to pain', value: 2 },
        { label: '1 — Extension response to pain', value: 1 },
        { label: '0 — No response to pain or generalized myoclonus status', value: 0 },
      ]),
      selectInput('brainstem', 'Brainstem reflexes (B)', [
        { label: '4 — Pupil and corneal reflexes present', value: 4 },
        { label: '3 — One pupil wide and fixed', value: 3 },
        { label: '2 — Pupil OR corneal reflex absent', value: 2 },
        { label: '1 — Pupil AND corneal reflexes absent', value: 1 },
        { label: '0 — Absent pupil, corneal, and cough reflex', value: 0 },
      ]),
      selectInput('respiration', 'Respiration (R)', [
        { label: '4 — Not intubated, regular breathing', value: 4 },
        { label: '3 — Not intubated, Cheyne–Stokes', value: 3 },
        { label: '2 — Not intubated, irregular breathing', value: 2 },
        { label: '1 — Breathes above ventilator rate', value: 1 },
        { label: '0 — Breathes at ventilator rate or apnea', value: 0 },
      ]),
    ],
    calculate(values) {
      const e = num(values.eye, 4);
      const m = num(values.motor, 4);
      const b = num(values.brainstem, 4);
      const r = num(values.respiration, 4);
      const score = e + m + b + r;
      const risk = riskFromThresholds(score, [
        {
          max: 3,
          level: 'critical',
          label: 'Very low FOUR',
          interpretation: 'Profound unresponsiveness with likely severe brainstem dysfunction. Urgent airway/ICP assessment; consider prognosis tools serially.',
        },
        {
          max: 7,
          level: 'critical',
          label: 'Severe impairment',
          interpretation: 'Severe impairment of consciousness. Close ICU monitoring; lower totals associate with higher mortality in validation cohorts.',
        },
        {
          max: 11,
          level: 'high',
          label: 'Moderate–severe',
          interpretation: 'Significant impairment. Serial FOUR scores can track recovery better than a single value.',
        },
        {
          max: 14,
          level: 'moderate',
          label: 'Mild–moderate impairment',
          interpretation: 'Partial impairment of consciousness or brainstem/respiratory control.',
        },
        {
          max: 16,
          level: 'low',
          label: 'Near normal / normal',
          interpretation: 'Higher FOUR scores indicate better responsiveness; 16 is fully tracked, following commands, intact brainstem, regular breathing.',
        },
      ]);
      return {
        score,
        ...risk,
        details: [
          { label: 'E / M / B / R', value: `${e} / ${m} / ${b} / ${r}` },
          { label: 'Range', value: '0–16' },
        ],
      };
    },
    evidence: {
      summary: 'FOUR score sums Eye + Motor + Brainstem + Respiration (each 0–4). Validated alternative/complement to GCS in neuro ICU.',
      formula: 'E(0–4)+M(0–4)+B(0–4)+R(0–4)',
      validation: 'Good interrater reliability; predictive of outcome in coma cohorts; usable in intubated patients.',
      references: [
        {
          title: 'Validation of a new coma scale: the FOUR score',
          citation: 'Wijdicks EFM et al. Ann Neurol. 2005',
          year: 2005, pmid: '16178024',
          doi: '10.1002/ana.20611', },
      ],
    },
    nextSteps: [
      {
        condition: 'Low or falling FOUR',
        actions: ['Airway protection', 'Urgent imaging / treat reversible causes', 'Neurosurgery/neurocritical care involvement'],
      },
    ],
    pearls: ['Always report subscale values, not only the total.', 'Cough reflex tested with tracheal suction in intubated patients.'],
  },
  {
    id: 'phq2',
    name: 'PHQ-2 Depression Screen',
    shortName: 'PHQ-2',
    description: 'Two-item depression screen (anhedonia and depressed mood) over the past 2 weeks.',
    category: 'psychiatry',
    tags: ['depression', 'screening', 'phq', 'primary care'],
    whenToUse: 'Ultra-brief depression screening in primary care, ED, and specialty clinics.',
    whyUse: 'High sensitivity gateway screen; positives should proceed to PHQ-9 or clinical interview.',
    inputs: [
      selectInput('q1', '1. Little interest or pleasure in doing things', [
        { label: 'Not at all (0)', value: 0 },
        { label: 'Several days (1)', value: 1 },
        { label: 'More than half the days (2)', value: 2 },
        { label: 'Nearly every day (3)', value: 3 },
      ]),
      selectInput('q2', '2. Feeling down, depressed, or hopeless', [
        { label: 'Not at all (0)', value: 0 },
        { label: 'Several days (1)', value: 1 },
        { label: 'More than half the days (2)', value: 2 },
        { label: 'Nearly every day (3)', value: 3 },
      ]),
    ],
    calculate(values) {
      const score = num(values.q1) + num(values.q2);
      if (score >= 3) {
        return {
          score,
          label: 'Positive screen (≥3)',
          interpretation:
            'PHQ-2 ≥3 suggests possible depressive disorder. Administer PHQ-9 and/or diagnostic interview; assess suicide risk.',
          riskLevel: 'high',
          recommendations: ['Complete PHQ-9', 'Assess safety / suicidal ideation', 'Consider referral or treatment initiation'],
        };
      }
      return {
        score,
        label: 'Negative screen (<3)',
        interpretation:
          'PHQ-2 <3: lower likelihood of major depression on screening, but not exclusionary if clinical concern is high.',
        riskLevel: 'low',
        details: [{ label: 'Range', value: '0–6; cutoff ≥3 commonly used' }],
      };
    },
    evidence: {
      summary: 'PHQ-2 sums first two PHQ-9 items (0–6). Cutoff ≥3 is a common positive screen threshold.',
      formula: 'Q1 + Q2 (each 0–3)',
      validation: 'Good sensitivity as a first-line screen in primary care; confirm with PHQ-9.',
      references: [
        {
          title: 'The Patient Health Questionnaire-2: validity of a two-item depression screener',
          citation: 'Kroenke K et al. Med Care. 2003',
          year: 2003, pmid: '14583691',
          doi: '10.1097/01.MLR.0000093487.78664.3C', },
      ],
    },
    nextSteps: [
      { condition: 'Score ≥3', actions: ['PHQ-9', 'Clinical assessment for MDD', 'Safety evaluation'] },
      { condition: 'Score <3 with concern', actions: ['Do not rely on screen alone', 'Full evaluation if indicated'] },
    ],
  },
  {
    id: 'audit-c',
    name: 'AUDIT-C Alcohol Screen',
    shortName: 'AUDIT-C',
    description: 'Three-item alcohol consumption screen derived from full AUDIT (score 0–12).',
    category: 'psychiatry',
    tags: ['alcohol', 'screening', 'substance', 'audit'],
    whenToUse: 'Brief alcohol misuse screening in primary care, trauma, and preoperative settings.',
    whyUse: 'Faster than full AUDIT with good sensitivity for hazardous drinking.',
    inputs: [
      selectInput('q1', '1. How often do you have a drink containing alcohol?', [
        { label: 'Never (0)', value: 0 },
        { label: 'Monthly or less (1)', value: 1 },
        { label: '2–4 times a month (2)', value: 2 },
        { label: '2–3 times a week (3)', value: 3 },
        { label: '4 or more times a week (4)', value: 4 },
      ]),
      selectInput('q2', '2. How many standard drinks do you have on a typical drinking day?', [
        { label: '1–2 (0)', value: 0 },
        { label: '3–4 (1)', value: 1 },
        { label: '5–6 (2)', value: 2 },
        { label: '7–9 (3)', value: 3 },
        { label: '10 or more (4)', value: 4 },
      ]),
      selectInput('q3', '3. How often do you have 6 or more drinks on one occasion?', [
        { label: 'Never (0)', value: 0 },
        { label: 'Less than monthly (1)', value: 1 },
        { label: 'Monthly (2)', value: 2 },
        { label: 'Weekly (3)', value: 3 },
        { label: 'Daily or almost daily (4)', value: 4 },
      ]),
      selectInput('sex', 'Sex (for common cutoffs)', [
        { label: 'Male / assigned male', value: 'male' },
        { label: 'Female / assigned female', value: 'female' },
      ]),
    ],
    calculate(values) {
      const score = num(values.q1) + num(values.q2) + num(values.q3);
      const female = String(values.sex) === 'female';
      const positive = female ? score >= 3 : score >= 4;
      const risk = riskFromThresholds(score, [
        {
          max: 2,
          level: 'low',
          label: 'Lower consumption band',
          interpretation: 'Lower reported consumption. Still counsel on limits if clinically relevant.',
        },
        {
          max: 5,
          level: 'moderate',
          label: 'At-risk / hazardous range possible',
          interpretation: 'Scores in this range often meet sex-specific positive screens — brief intervention indicated.',
        },
        {
          max: 7,
          level: 'high',
          label: 'Hazardous / harmful likely',
          interpretation: 'Higher likelihood of hazardous drinking or alcohol use disorder — full AUDIT and clinical assessment.',
        },
        {
          max: 12,
          level: 'critical',
          label: 'Very high consumption screen',
          interpretation: 'Very high AUDIT-C — assess dependence, withdrawal risk, and offer treatment referral.',
        },
      ]);

      return {
        score,
        label: positive ? `${risk.label} — Positive screen` : `${risk.label} — Negative screen`,
        interpretation: positive
          ? `Positive by common cutoff (${female ? '≥3 women' : '≥4 men'}). ${risk.interpretation}`
          : `Below common cutoff (${female ? '≥3 women' : '≥4 men'}). ${risk.interpretation}`,
        riskLevel: positive ? (score >= 8 ? 'critical' : score >= 6 ? 'high' : 'moderate') : 'low',
        details: [
          { label: 'Sex-specific cutoff used', value: female ? '≥3 (female)' : '≥4 (male)' },
          { label: 'Range', value: '0–12' },
        ],
        recommendations: positive
          ? ['Brief intervention (SBIRT)', 'Consider full AUDIT', 'Assess withdrawal risk if stopping']
          : ['Standard preventive counseling as appropriate'],
      };
    },
    evidence: {
      summary:
        'AUDIT-C = frequency + typical quantity + binge frequency (each 0–4). Common positive cutoffs: ≥4 men, ≥3 women (thresholds vary by setting).',
      formula: 'Sum of 3 items (0–12)',
      validation: 'Validated brief screen for heavy drinking and AUD across VA and primary care populations.',
      references: [
        {
          title: 'AUDIT-C as a brief screen for alcohol misuse in primary care',
          citation: 'Bush K et al. Arch Intern Med. 1998; Bradley KA et al. various',
          year: 1998, pmid: '9738608',
          doi: '10.1001/archinte.158.16.1789', },
      ],
    },
    nextSteps: [
      {
        condition: 'Positive AUDIT-C',
        actions: ['Brief counseling', 'Full substance history', 'Labs (LFTs, CBC) if indicated', 'Referral to treatment when appropriate'],
      },
    ],
  },
  {
    id: 'cows',
    name: 'COWS (Clinical Opiate Withdrawal Scale)',
    shortName: 'COWS',
    description: 'Clinician-rated opioid withdrawal severity across 11 domains (total typically 0–48).',
    category: 'psychiatry',
    tags: ['opioid', 'withdrawal', 'cows', 'substance'],
    whenToUse: 'Monitoring opioid withdrawal and guiding initiation of buprenorphine / supportive care.',
    whyUse: 'Standard bedside severity score for symptom-triggered opioid withdrawal management.',
    inputs: [
      selectInput('pulse', 'Resting pulse rate (bpm)', [
        { label: '≤80 (0)', value: 0 },
        { label: '81–100 (1)', value: 1 },
        { label: '101–120 (2)', value: 2 },
        { label: '>120 (4)', value: 4 },
      ]),
      selectInput('sweating', 'Sweating (unrelated to room temp)', [
        { label: 'No report of chills or flushing (0)', value: 0 },
        { label: 'Subjective chills or flushing (1)', value: 1 },
        { label: 'Flushed or observable moistness face (2)', value: 2 },
        { label: 'Beads of sweat on brow or face (3)', value: 3 },
        { label: 'Sweat streaming off face (4)', value: 4 },
      ]),
      selectInput('restlessness', 'Restlessness', [
        { label: 'Able to sit still (0)', value: 0 },
        { label: 'Reports difficulty sitting still, but is able to (1)', value: 1 },
        { label: 'Frequent shifting or extraneous movements of legs/arms (3)', value: 3 },
        { label: 'Unable to sit still for more than a few seconds (5)', value: 5 },
      ]),
      selectInput('pupils', 'Pupil size', [
        { label: 'Pinned or normal for room light (0)', value: 0 },
        { label: 'Possibly larger than normal for room light (1)', value: 1 },
        { label: 'Moderately dilated (2)', value: 2 },
        { label: 'So dilated that only rim of iris is visible (5)', value: 5 },
      ]),
      selectInput('aches', 'Bone or joint aches', [
        { label: 'Not present (0)', value: 0 },
        { label: 'Mild diffuse discomfort (1)', value: 1 },
        { label: 'Patient reports severe diffuse aching of joints/muscles (2)', value: 2 },
        { label: 'Patient is rubbing joints/muscles and is unable to sit still because of discomfort (4)', value: 4 },
      ]),
      selectInput('rhinorrhea', 'Runny nose or tearing (not from cold/allergy)', [
        { label: 'Not present (0)', value: 0 },
        { label: 'Nasal stuffiness or unusually moist eyes (1)', value: 1 },
        { label: 'Nose running or tearing (2)', value: 2 },
        { label: 'Nose constantly running or tears streaming down cheeks (4)', value: 4 },
      ]),
      selectInput('gi', 'GI upset', [
        { label: 'No GI symptoms (0)', value: 0 },
        { label: 'Stomach cramps (1)', value: 1 },
        { label: 'Nausea or loose stool (2)', value: 2 },
        { label: 'Vomiting or diarrhea (3)', value: 3 },
        { label: 'Multiple episodes of diarrhea or vomiting (5)', value: 5 },
      ]),
      selectInput('tremor', 'Tremor (observe outstretched hands)', [
        { label: 'No tremor (0)', value: 0 },
        { label: 'Tremor can be felt, but not observed (1)', value: 1 },
        { label: 'Slight tremor observable (2)', value: 2 },
        { label: 'Gross tremor or muscle twitching (4)', value: 4 },
      ]),
      selectInput('yawning', 'Yawning', [
        { label: 'No yawning (0)', value: 0 },
        { label: 'Yawning once or twice during assessment (1)', value: 1 },
        { label: 'Yawning three or more times during assessment (2)', value: 2 },
        { label: 'Yawning several times/minute (4)', value: 4 },
      ]),
      selectInput('anxiety', 'Anxiety or irritability', [
        { label: 'None (0)', value: 0 },
        { label: 'Patient reports increasing irritability or anxiousness (1)', value: 1 },
        { label: 'Patient obviously irritable/anxious (2)', value: 2 },
        { label: 'Patient so irritable/anxious that participation in assessment is difficult (4)', value: 4 },
      ]),
      selectInput('gooseflesh', 'Gooseflesh skin', [
        { label: 'Skin is smooth (0)', value: 0 },
        { label: 'Piloerection of skin can be felt or hairs standing up on arms (3)', value: 3 },
        { label: 'Prominent piloerection (5)', value: 5 },
      ]),
    ],
    calculate(values) {
      const keys = [
        'pulse',
        'sweating',
        'restlessness',
        'pupils',
        'aches',
        'rhinorrhea',
        'gi',
        'tremor',
        'yawning',
        'anxiety',
        'gooseflesh',
      ];
      const score = keys.reduce((s, k) => s + num(values[k]), 0);
      const r = riskFromThresholds(score, [
        {
          max: 4,
          level: 'low',
          label: 'None–minimal withdrawal',
          interpretation: 'COWS 0–4: none to minimal withdrawal symptoms.',
        },
        {
          max: 12,
          level: 'moderate',
          label: 'Mild',
          interpretation: 'COWS 5–12: mild withdrawal. Supportive care; many protocols start buprenorphine around COWS ≥8–12.',
        },
        {
          max: 24,
          level: 'high',
          label: 'Moderate',
          interpretation: 'COWS 13–24: moderate withdrawal — typically appropriate range for buprenorphine induction if otherwise eligible.',
        },
        {
          max: 36,
          level: 'critical',
          label: 'Moderately severe',
          interpretation: 'COWS 25–36: moderately severe withdrawal — active treatment and monitoring.',
        },
        {
          max: 48,
          level: 'critical',
          label: 'Severe withdrawal',
          interpretation: 'COWS >36: severe withdrawal — urgent symptom control and supportive care.',
        },
      ]);
      return {
        score,
        ...r,
        details: [{ label: 'Range', value: '0–48 (11 domains)' }],
      };
    },
    evidence: {
      summary:
        'COWS rates resting pulse, sweating, restlessness, pupil size, aches, rhinorrhea/lacrimation, GI upset, tremor, yawning, anxiety/irritability, and gooseflesh.',
      formula: 'Sum of domain scores (points not uniform across items)',
      validation: 'Widely used in opioid withdrawal and buprenorphine induction pathways.',
      references: [
        {
          title: 'Clinical Opiate Withdrawal Scale',
          citation: 'Wesson DR, Ling W. J Psychoactive Drugs. 2003',
          year: 2003, pmid: '12924748',
          doi: '10.1080/02791072.2003.10400007', },
      ],
    },
    nextSteps: [
      {
        condition: 'Mild–moderate COWS',
        actions: [
          'Supportive meds (antiemetics, clonidine if appropriate, hydration)',
          'Consider buprenorphine when COWS threshold met and last full agonist timing appropriate',
          'Offer overdose education / naloxone',
        ],
      },
      {
        condition: 'Severe COWS',
        actions: ['Escalate monitoring', 'Treat complications', 'Addiction medicine / psychiatry involvement'],
      },
    ],
    pearls: [
      'Do not confuse with CIWA (alcohol).',
      'Precipitated withdrawal risk if buprenorphine given too soon after full agonist — follow local induction protocol.',
    ],
  },
  {
    id: 'sad-persons',
    name: 'SAD PERSONS Suicide Risk Scale',
    shortName: 'SAD PERSONS',
    description: 'Original 10-item demographic/clinical suicide risk checklist (0–10).',
    category: 'psychiatry',
    tags: ['suicide', 'risk', 'screening', 'psych'],
    whenToUse: 'Structured reminder of suicide risk factors during psych evaluation (not a standalone disposition tool).',
    whyUse: 'Mnemonic covering classic risk factors; educational aid — clinical judgment always required.',
    inputs: [
      yesNo('sex', 'Sex: male', 1),
      yesNo('age', 'Age <19 or >45 years', 1),
      yesNo('depression', 'Depression or hopelessness', 1),
      yesNo('previous', 'Previous suicide attempt or psychiatric care', 1),
      yesNo('ethanol', 'Excessive ethanol or drug use', 1),
      yesNo('rational', 'Rational thinking loss (psychosis, organic brain syndrome)', 1),
      yesNo('social', 'Social supports lacking', 1),
      yesNo('organized', 'Organized plan for suicide', 1),
      yesNo('spouse', 'No spouse (single, divorced, widowed, separated)', 1),
      yesNo('sickness', 'Sickness (chronic/debilitating illness)', 1),
    ],
    calculate(values) {
      const keys = ['sex', 'age', 'depression', 'previous', 'ethanol', 'rational', 'social', 'organized', 'spouse', 'sickness'];
      const score = keys.reduce((s, k) => s + (bool(values[k]) ? 1 : 0), 0);
      const r = riskFromThresholds(score, [
        {
          max: 4,
          level: 'low',
          label: 'Low (0–4)',
          interpretation:
            'Original banding: lower risk category. Still complete a full clinical suicide assessment if any concerning features (ideation, plan, intent, behavior).',
        },
        {
          max: 6,
          level: 'moderate',
          label: 'Moderate (5–6)',
          interpretation:
            'Original banding: intermediate risk — close follow-up; consider psychiatric consultation and safety planning.',
        },
        {
          max: 10,
          level: 'high',
          label: 'High (7–10)',
          interpretation:
            'Original banding: high risk — urgent psychiatric evaluation; consider protective environment / hospitalization criteria.',
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'Mnemonic', value: 'Sex, Age, Depression, Previous, Ethanol, Rational loss, Social supports, Organized plan, No spouse, Sickness' },
        ],
        recommendations: [
          'SAD PERSONS is not sufficient alone for discharge decisions',
          'Assess ideation, intent, plan, access to means, protective factors',
        ],
      };
    },
    evidence: {
      summary:
        'Original SAD PERSONS assigns 1 point each to 10 risk factors (total 0–10). Modified versions add weighted items; predictive performance is limited.',
      formula: 'Sum of 10 binary items',
      validation:
        'Useful mnemonic but limited prospective predictive validity; do not replace comprehensive risk assessment (e.g., C-SSRS).',
      references: [
        {
          title: 'The SAD PERSONS scale for suicide risk',
          citation: 'Patterson WM et al. Psychosomatics. 1983',
          year: 1983, pmid: '6867245',
          doi: '10.1016/S0033-3182(83)73213-5', },
      ],
    },
    nextSteps: [
      {
        condition: 'Any active ideation/plan/intent',
        actions: [
          'Immediate safety assessment',
          'Remove access to means',
          'Urgent psychiatry involvement',
          'Do not discharge based on low checklist score alone',
        ],
      },
      {
        condition: 'Score ≥5',
        actions: ['Safety plan', 'Close follow-up', 'Collateral history', 'Consider higher level of care'],
      },
    ],
    pearls: [
      'A “low” score never rules out imminent risk.',
      'Modified SAD PERSONS weights some items differently (not used here).',
    ],
  },
  {
    id: 'mini-cog',
    name: 'Mini-Cog',
    shortName: 'Mini-Cog',
    description: 'Brief cognitive screen: 3-word recall + clock draw (total 0–5).',
    category: 'neurology',
    tags: ['dementia', 'cognition', 'screening', 'mini-cog'],
    whenToUse: 'Rapid cognitive screening in primary care and geriatric assessment.',
    whyUse: 'Quick, relatively education-insensitive screen for cognitive impairment.',
    inputs: [
      selectInput('recall', '3-word recall (words recalled spontaneously)', [
        { label: '0 words (0)', value: 0 },
        { label: '1 word (1)', value: 1 },
        { label: '2 words (2)', value: 2 },
        { label: '3 words (3)', value: 3 },
      ]),
      selectInput('clock', 'Clock draw (CDT)', [
        { label: 'Abnormal clock (0)', value: 0, description: 'Wrong time, missing numbers, poor spacing, etc.' },
        { label: 'Normal clock (2)', value: 2, description: 'All numbers present in correct order/position; hands show stated time' },
      ]),
    ],
    calculate(values) {
      const recall = num(values.recall, 0);
      const clock = num(values.clock, 0);
      const score = recall + clock;
      // Positive screen for impairment if score 0–2
      if (score <= 2) {
        return {
          score,
          label: 'Positive screen (possible impairment)',
          interpretation:
            'Mini-Cog 0–2 suggests possible cognitive impairment. Proceed to fuller assessment (MoCA/MMSE, history, labs). Not a dementia diagnosis.',
          riskLevel: 'high',
          details: [
            { label: 'Recall', value: `${recall}/3` },
            { label: 'Clock', value: clock === 2 ? 'Normal (2)' : 'Abnormal (0)' },
          ],
        };
      }
      return {
        score,
        label: 'Negative screen',
        interpretation:
          'Mini-Cog 3–5: lower likelihood of impairment on this screen. Does not exclude mild cognitive impairment or early dementia if clinical concern remains.',
        riskLevel: 'low',
        details: [
          { label: 'Recall', value: `${recall}/3` },
          { label: 'Clock', value: clock === 2 ? 'Normal (2)' : 'Abnormal (0)' },
        ],
      };
    },
    evidence: {
      summary: 'Mini-Cog = number of words recalled (0–3) + clock draw (0 or 2). Total ≤2 is a common positive screen cutoff.',
      formula: 'Recall (0–3) + CDT (0 or 2) = 0–5',
      validation: 'Validated brief dementia screen; performance varies by population and cutoff.',
      references: [
        {
          title: 'The Mini-Cog as a screen for dementia: validation in a population-based sample',
          citation: 'Borson S et al. J Am Geriatr Soc. 2003',
          year: 2003, pmid: '14511167',
          doi: '10.1046/j.1532-5415.2003.51465.x', },
      ],
    },
    nextSteps: [
      {
        condition: 'Score ≤2',
        actions: ['Detailed cognitive testing', 'Functional history / informant interview', 'B12, TSH, depression screen', 'Imaging as indicated'],
      },
    ],
    pearls: [
      'Word lists often: apple, watch, penny (or similar validated lists).',
      'Clock: ask patient to draw clock showing a specific time (e.g., 11:10).',
    ],
  },
  {
    id: 'cam-icu',
    name: 'CAM-ICU Delirium Screen',
    shortName: 'CAM-ICU',
    description: 'Confusion Assessment Method for the ICU — feature checklist for delirium (simplified flow).',
    category: 'critical-care',
    tags: ['delirium', 'icu', 'cam', 'altered mental status'],
    whenToUse: 'Ventilated or non-ventilated ICU patients for bedside delirium screening.',
    whyUse: 'Validated ICU delirium tool; positives associate with longer stays and worse outcomes.',
    inputs: [
      yesNo(
        'feature1',
        'Feature 1: Acute change from mental status baseline OR fluctuating course (past 24h)',
        1,
        'Required for CAM-ICU positive'
      ),
      yesNo(
        'feature2',
        'Feature 2: Inattention (e.g., ASE letters: >2 errors on SAVEAHAART, or ASE pictures abnormal)',
        1,
        'Required for CAM-ICU positive'
      ),
      yesNo(
        'feature3',
        'Feature 3: Altered level of consciousness (current RASS ≠ 0, or other than alert/calm)',
        1
      ),
      yesNo(
        'feature4',
        'Feature 4: Disorganized thinking (yes/no questions + command; >1 error)',
        1
      ),
    ],
    calculate(values) {
      const f1 = bool(values.feature1);
      const f2 = bool(values.feature2);
      const f3 = bool(values.feature3);
      const f4 = bool(values.feature4);
      const positive = f1 && f2 && (f3 || f4);

      if (!f1 && !f2 && !f3 && !f4) {
        return {
          score: 'CAM−',
          label: 'CAM-ICU negative',
          interpretation: 'No CAM-ICU features selected. Repeat screening at least each shift or with mental status change.',
          riskLevel: 'low',
          details: [{ label: 'Algorithm', value: 'Feature 1 + 2 + (3 or 4) = delirium' }],
        };
      }

      if (positive) {
        return {
          score: 'CAM+',
          label: 'CAM-ICU positive (delirium present)',
          interpretation:
            'Features meet CAM-ICU criteria for delirium. Identify and treat causes; minimize deliriogenic meds; reorient and mobilize.',
          riskLevel: 'high',
          details: [
            { label: 'Feature 1 (acute/fluctuating)', value: f1 ? 'Yes' : 'No' },
            { label: 'Feature 2 (inattention)', value: f2 ? 'Yes' : 'No' },
            { label: 'Feature 3 (altered LOC)', value: f3 ? 'Yes' : 'No' },
            { label: 'Feature 4 (disorganized thinking)', value: f4 ? 'Yes' : 'No' },
          ],
          recommendations: [
            'Review meds (benzos, anticholinergics)',
            'Treat pain, hypoxia, infection, metabolic derangements',
            'Sleep hygiene, glasses/hearing aids, early mobility',
          ],
        };
      }

      return {
        score: 'CAM−',
        label: 'CAM-ICU negative',
        interpretation:
          'Does not meet full CAM-ICU criteria (needs Feature 1 AND 2 AND [3 OR 4]). Continue prevention bundle and serial screens — features may evolve.',
        riskLevel: f1 || f2 ? 'moderate' : 'low',
        details: [
          { label: 'Feature 1 (acute/fluctuating)', value: f1 ? 'Yes' : 'No' },
          { label: 'Feature 2 (inattention)', value: f2 ? 'Yes' : 'No' },
          { label: 'Feature 3 (altered LOC)', value: f3 ? 'Yes' : 'No' },
          { label: 'Feature 4 (disorganized thinking)', value: f4 ? 'Yes' : 'No' },
        ],
      };
    },
    evidence: {
      summary:
        'CAM-ICU is positive when Feature 1 (acute/fluctuating) + Feature 2 (inattention) + Feature 3 (RASS ≠ 0) OR Feature 4 (disorganized thinking).',
      formula: '1 AND 2 AND (3 OR 4)',
      validation: 'High sensitivity/specificity vs psychiatric standard in ICU validation studies when trained raters used.',
      references: [
        {
          title: 'Delirium in mechanically ventilated patients: validity of CAM-ICU',
          citation: 'Ely EW et al. JAMA. 2001',
          year: 2001, pmid: '11730446',
          doi: '10.1001/jama.286.21.2703', },
      ],
    },
    nextSteps: [
      {
        condition: 'CAM-ICU positive',
        actions: [
          'Search for precipitating causes',
          'PADIS bundle (pain, agitation, delirium)',
          'Avoid routine antipsychotics for hypoactive delirium without distress',
          'Family engagement and reorientation',
        ],
      },
    ],
    pearls: [
      'If RASS −4 or −5, patient is unarousable — CAM-ICU often scored “unable to assess.”',
      'Hyperactive and hypoactive delirium both count when features met.',
    ],
  },
  {
    id: 'rass',
    name: 'Richmond Agitation-Sedation Scale (RASS)',
    shortName: 'RASS',
    description: 'Sedation–agitation scale from −5 (unarousable) to +4 (combative).',
    category: 'critical-care',
    tags: ['sedation', 'icu', 'agitation', 'rass'],
    whenToUse: 'ICU titration of sedation and assessment of agitation; input to CAM-ICU.',
    whyUse: 'Standard, reproducible target for light sedation strategies (often 0 to −2).',
    inputs: [
      selectInput('rass', 'RASS level', [
        { label: '+4 Combative — overtly combative/violent; immediate danger to staff', value: 4 },
        { label: '+3 Very agitated — pulls/removes tubes; aggressive', value: 3 },
        { label: '+2 Agitated — frequent non-purposeful movement; patient–ventilator dyssynchrony', value: 2 },
        { label: '+1 Restless — anxious but movements not aggressive/vigorous', value: 1 },
        { label: '0 Alert and calm', value: 0 },
        { label: '−1 Drowsy — not fully alert, sustained awakening to voice (≥10 s eye contact)', value: -1 },
        { label: '−2 Light sedation — briefly awakens to voice (<10 s eye contact)', value: -2 },
        { label: '−3 Moderate sedation — movement or eye opening to voice but no eye contact', value: -3 },
        { label: '−4 Deep sedation — no response to voice; movement/eye opening to physical stimulation', value: -4 },
        { label: '−5 Unarousable — no response to voice or physical stimulation', value: -5 },
      ]),
    ],
    calculate(values) {
      const score = num(values.rass, 0);
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' | 'normal' = 'normal';
      let label = 'Alert and calm';
      let interpretation = 'RASS 0: target for many awake ICU patients.';

      if (score >= 3) {
        riskLevel = 'critical';
        label = 'Severe agitation';
        interpretation =
          'RASS +3 to +4: dangerous agitation. Ensure safety, treat pain/delirium/withdrawal, consider sedation per protocol.';
      } else if (score >= 1) {
        riskLevel = 'high';
        label = 'Restless / agitated';
        interpretation = 'RASS +1 to +2: restlessness or agitation — assess pain, ventilator synchrony, delirium, and environment.';
      } else if (score === 0) {
        riskLevel = 'normal';
        label = 'Alert and calm';
        interpretation = 'RASS 0: alert and calm.';
      } else if (score >= -2) {
        riskLevel = 'low';
        label = 'Light sedation / drowsy';
        interpretation = 'RASS −1 to −2: commonly acceptable light sedation targets when sedation is required.';
      } else if (score === -3) {
        riskLevel = 'moderate';
        label = 'Moderate sedation';
        interpretation = 'RASS −3: deeper than many light-sedation goals — reassess indication and titrate if appropriate.';
      } else {
        riskLevel = 'high';
        label = 'Deep sedation / unarousable';
        interpretation =
          'RASS −4 to −5: deep sedation or unarousable. CAM-ICU often not assessable at −4/−5. Minimize deep sedation when possible.';
      }

      return {
        score,
        label,
        interpretation,
        riskLevel,
        details: [{ label: 'Scale', value: '−5 (unarousable) to +4 (combative)' }],
      };
    },
    evidence: {
      summary: 'RASS is a 10-point sedation-agitation scale (−5 to +4) validated for ICU reliability and sedation titration.',
      validation: 'Excellent interrater reliability; cornerstone of modern ICU sedation protocols and CAM-ICU.',
      references: [
        {
          title: 'The Richmond Agitation-Sedation Scale: validity and reliability in adult ICU patients',
          citation: 'Sessler CN et al. Am J Respir Crit Care Med. 2002',
          year: 2002, pmid: '12421743',
          doi: '10.1164/rccm.2107138', },
      ],
    },
    nextSteps: [
      {
        condition: 'RASS above target (agitated)',
        actions: ['Treat pain first', 'Nonpharmacologic measures', 'Reassess ventilator / withdrawal / delirium', 'Sedation only as needed'],
      },
      {
        condition: 'RASS below target (oversedated)',
        actions: ['Hold/reduce sedatives', 'SAT/SBT readiness', 'Reassess for encephalopathy causes'],
      },
    ],
  },
  {
    id: 'aspects',
    name: 'ASPECTS (Early Ischemic Change)',
    shortName: 'ASPECTS',
    description: 'Alberta Stroke Program Early CT Score for MCA territory early ischemia (10 − regions involved).',
    category: 'neurology',
    tags: ['stroke', 'aspects', 'ct', 'mca'],
    whenToUse: 'Noncontrast CT (or DWI-ASPECTS) in anterior circulation LVO / thrombolysis-thrombectomy pathways.',
    whyUse: 'Quantifies early ischemic change; lower scores suggest larger established infarct core.',
    inputs: [
      selectInput('mode', 'Entry mode', [
        { label: 'Enter ASPECTS total directly', value: 'direct' },
        { label: 'Count regions with early ischemic change (10 − count)', value: 'regions' },
      ]),
      numberInput('score', 'ASPECTS total (if direct entry)', {
        min: 0,
        max: 10,
        defaultValue: 10,
        helpText: '10 = no early change in MCA territory regions',
      }),
      numberInput('regionsLost', 'Number of ASPECTS regions involved (if counting)', {
        min: 0,
        max: 10,
        defaultValue: 0,
        helpText: 'C, L, IC, I, M1–M6 (10 regions). Score = 10 − regions',
      }),
    ],
    calculate(values) {
      const mode = String(values.mode ?? 'direct');
      let score: number;
      let regions: number;
      if (mode === 'regions') {
        regions = Math.max(0, Math.min(10, num(values.regionsLost, 0)));
        score = 10 - regions;
      } else {
        score = Math.max(0, Math.min(10, num(values.score, 10)));
        regions = 10 - score;
      }

      const r = riskFromThresholds(score, [
        {
          max: 4,
          level: 'critical',
          label: 'Very low ASPECTS (0–4)',
          interpretation:
            'Extensive early ischemic change. Often large core — thrombectomy benefit less certain in some trials/thresholds; individualize with perfusion/clinical factors.',
        },
        {
          max: 6,
          level: 'high',
          label: 'Low ASPECTS (5–6)',
          interpretation:
            'Substantial early change. Selection for reperfusion is nuanced — use full clinical picture, LVO status, and advanced imaging when available.',
        },
        {
          max: 9,
          level: 'moderate',
          label: 'Intermediate–high ASPECTS (7–9)',
          interpretation:
            'Limited early ischemic change. Often favorable imaging profile for reperfusion candidacy if otherwise eligible.',
        },
        {
          max: 10,
          level: 'low',
          label: 'ASPECTS 10',
          interpretation: 'No early MCA-territory ischemic change on this score — still treat by clinical/time/LVO criteria.',
        },
      ]);

      return {
        score,
        ...r,
        details: [
          { label: 'Regions involved', value: String(regions) },
          { label: 'MCA ASPECTS regions', value: 'Caudate, lentiform, internal capsule, insula, M1–M6' },
          { label: 'Range', value: '0–10 (higher = less early change)' },
        ],
      };
    },
    evidence: {
      summary:
        'ASPECTS divides MCA territory into 10 regions; 1 point subtracted per region with early ischemic change. Score 10 = normal.',
      formula: 'ASPECTS = 10 − (number of involved regions)',
      validation: 'Used in stroke trials and thrombectomy selection; interrater variability exists — training recommended.',
      references: [
        {
          title: 'Use of ASPECTS for hyperacute stroke',
          citation: 'Barber PA et al. Lancet. 2000',
          year: 2000, pmid: '10905241',
          doi: '10.1016/s0140-6736(00)02237-6', },
      ],
    },
    nextSteps: [
      {
        condition: 'Acute LVO pathway',
        actions: [
          'Do not delay CTA/CTP or transfer for ASPECTS calculation alone',
          'Correlate with NIHSS and last known well',
          'Multidisciplinary reperfusion decision',
        ],
      },
    ],
    pearls: [
      'pc-ASPECTS is a different scale for posterior circulation.',
      'Early changes: hypoattenuation, loss of gray–white differentiation, focal swelling.',
    ],
  },
  {
    id: 'abcd3i',
    name: 'ABCD3-I Score (TIA)',
    shortName: 'ABCD3-I',
    description: 'TIA stroke-risk score extending ABCD² with dual TIA and imaging (stenosis + DWI).',
    category: 'neurology',
    tags: ['tia', 'stroke', 'abcd', 'secondary prevention'],
    whenToUse: 'Risk stratification after TIA when imaging and short-term recurrence history are available.',
    whyUse: 'Improves prediction of early stroke after TIA beyond ABCD² alone.',
    inputs: [
      yesNo('age', 'Age ≥60', 1),
      yesNo('bp', 'BP ≥140/90 at presentation', 1),
      selectInput('clinical', 'Clinical features', [
        { label: 'Other symptoms (0)', value: 0 },
        { label: 'Speech disturbance without weakness (1)', value: 1 },
        { label: 'Unilateral weakness (2)', value: 2 },
      ]),
      selectInput('duration', 'Duration of symptoms', [
        { label: '<10 min (0)', value: 0 },
        { label: '10–59 min (1)', value: 1 },
        { label: '≥60 min (2)', value: 2 },
      ]),
      yesNo('dm', 'Diabetes mellitus', 1),
      yesNo('dualTia', 'Dual TIA: ≥2 TIAs in past 7 days (including index)', 2),
      yesNo('stenosis', 'Ipsilateral ≥50% carotid (or intracranial) stenosis', 2),
      yesNo('dwi', 'Acute DWI lesion attributable to symptoms', 2),
    ],
    calculate(values) {
      const abcd2 =
        (bool(values.age) ? 1 : 0) +
        (bool(values.bp) ? 1 : 0) +
        num(values.clinical) +
        num(values.duration) +
        (bool(values.dm) ? 1 : 0);
      const dual = bool(values.dualTia) ? 2 : 0;
      const sten = bool(values.stenosis) ? 2 : 0;
      const dwi = bool(values.dwi) ? 2 : 0;
      const score = abcd2 + dual + sten + dwi;

      const r = riskFromThresholds(score, [
        {
          max: 3,
          level: 'low',
          label: 'Lower ABCD3-I (0–3)',
          interpretation:
            'Lower end of ABCD3-I spectrum historically. Still needs prompt secondary prevention workup — modern care is urgent for nearly all TIA.',
        },
        {
          max: 7,
          level: 'moderate',
          label: 'Intermediate (4–7)',
          interpretation: 'Intermediate predicted early stroke risk. Expedited evaluation and secondary prevention.',
        },
        {
          max: 13,
          level: 'high',
          label: 'High (8–13)',
          interpretation:
            'High ABCD3-I — elevated short-term stroke risk, especially with dual TIA and positive imaging. Consider admission and rapid vascular management.',
        },
      ]);

      return {
        score,
        ...r,
        details: [
          { label: 'ABCD² component', value: String(abcd2) },
          { label: 'Dual TIA', value: dual ? '2' : '0' },
          { label: 'Stenosis ≥50%', value: sten ? '2' : '0' },
          { label: 'DWI lesion', value: dwi ? '2' : '0' },
          { label: 'Range', value: '0–13' },
        ],
      };
    },
    evidence: {
      summary:
        'ABCD3-I = ABCD² (0–7) + dual TIA within 7 days (2) + ipsilateral stenosis ≥50% (2) + acute DWI lesion (2); total 0–13.',
      formula: 'ABCD² + dual TIA (2) + stenosis (2) + DWI (2)',
      validation: 'Improves prediction of early stroke after TIA vs ABCD² in multicenter cohorts.',
      references: [
        {
          title: 'ABCD3 and ABCD3-I scores to detect stroke risk after TIA',
          citation: 'Merwick Á et al. Lancet Neurol. 2010',
          year: 2010, pmid: '20934388',
          doi: '10.1016/S1474-4422(10)70240-4', },
        {
          title: 'ABCD² validation',
          citation: 'Johnston SC et al. Lancet. 2007',
          year: 2007, pmid: '17258668',
          doi: '10.1016/S0140-6736(07)60150-0', },
      ],
    },
    nextSteps: [
      {
        condition: 'All TIA / ABCD3-I elevated',
        actions: [
          'Urgent brain and vascular imaging if not done',
          'ECG / AF monitoring',
          'Antiplatelet (or anticoagulation if AF)',
          'Statin, BP control, lifestyle',
          'Carotid revascularization evaluation if appropriate stenosis',
        ],
      },
    ],
  },
  {
    id: 'cssrs-screen',
    name: 'C-SSRS Screener (Simplified)',
    shortName: 'C-SSRS',
    description: 'Simplified Columbia-Suicide Severity Rating Scale screener pathway to risk tier (educational).',
    category: 'psychiatry',
    tags: ['suicide', 'cssrs', 'screening', 'safety'],
    whenToUse: 'Structured suicide ideation/behavior screening in clinical settings.',
    whyUse: 'Widely adopted severity ladder from wish to die through intent/plan and recent behavior.',
    inputs: [
      yesNo('wishDead', '1. Wish to be dead (passive ideation)'),
      yesNo('siNonSpecific', '2. Non-specific active suicidal thoughts'),
      yesNo('siMethod', '3. Active suicidal ideation with any method (no plan/intent)'),
      yesNo('siIntent', '4. Active suicidal ideation with some intent to act (no specific plan)'),
      yesNo('siPlanIntent', '5. Active suicidal ideation with specific plan and intent'),
      yesNo('behavior', 'Suicidal behavior (actual/aborted/interrupted attempt or preparatory acts) in past 3 months'),
    ],
    calculate(values) {
      const wish = bool(values.wishDead);
      const nonSpec = bool(values.siNonSpecific);
      const method = bool(values.siMethod);
      const intent = bool(values.siIntent);
      const planIntent = bool(values.siPlanIntent);
      const behavior = bool(values.behavior);

      // Severity ladder 0–5 for ideation; behavior flags high risk independently
      let ideationLevel = 0;
      if (planIntent) ideationLevel = 5;
      else if (intent) ideationLevel = 4;
      else if (method) ideationLevel = 3;
      else if (nonSpec) ideationLevel = 2;
      else if (wish) ideationLevel = 1;

      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
      let label = 'No ideation endorsed';
      let interpretation =
        'No C-SSRS screener items endorsed. Continue routine clinical vigilance; screens can be false-negative if rapport is limited.';

      if (behavior || ideationLevel >= 4) {
        riskLevel = 'critical';
        label = behavior ? 'High risk — recent suicidal behavior' : 'High risk — ideation with intent (± plan)';
        interpretation = behavior
          ? 'Recent suicidal behavior endorsed. Treat as high acute risk until comprehensive assessment says otherwise — safe environment, urgent psychiatry, means restriction.'
          : 'Ideation with intent to act (and/or plan). High-risk tier on simplified C-SSRS pathways — urgent comprehensive assessment and safety measures.';
      } else if (ideationLevel === 3) {
        riskLevel = 'high';
        label = 'Moderate–high — method without intent';
        interpretation =
          'Active ideation with method but without intent/plan. Elevated concern — full risk assessment, safety planning, close follow-up or higher care as indicated.';
      } else if (ideationLevel >= 1) {
        riskLevel = 'moderate';
        label = ideationLevel === 1 ? 'Low–moderate — passive wish to die' : 'Moderate — nonspecific active ideation';
        interpretation =
          'Passive or nonspecific active ideation. Still requires clinical assessment of stressors, protective factors, and safety planning; escalate if other red flags present.';
      }

      const scoreLabel = behavior ? `${ideationLevel}+B` : String(ideationLevel);

      return {
        score: scoreLabel,
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Ideation severity (0–5)', value: String(ideationLevel) },
          { label: 'Recent suicidal behavior', value: behavior ? 'Yes' : 'No' },
          {
            label: 'Ladder',
            value: '1 wish to die → 2 nonspecific SI → 3 method → 4 intent → 5 plan+intent',
          },
        ],
        recommendations:
          riskLevel === 'critical' || riskLevel === 'high'
            ? [
                'Do not leave patient alone if imminent risk',
                'Urgent psychiatric evaluation',
                'Means restriction',
                'Document risk/benefit of disposition',
              ]
            : ['Safety plan if any ideation', 'Follow-up arranged', 'Provide crisis resources'],
      };
    },
    evidence: {
      summary:
        'C-SSRS maps suicidal ideation severity (wish to die through plan/intent) and suicidal behaviors. This is a simplified educational pathway, not a full licensed interview script.',
      validation: 'C-SSRS is widely used in clinical trials and health systems; local protocols define exact triage cutoffs.',
      references: [
        {
          title: 'The Columbia-Suicide Severity Rating Scale: initial validity and internal consistency findings',
          citation: 'Posner K et al. Am J Psychiatry. 2011',
          year: 2011, pmid: '22193671',
          doi: '10.1176/appi.ajp.2011.10111704', },
      ],
    },
    nextSteps: [
      {
        condition: 'Intent, plan, or recent behavior',
        actions: [
          'Immediate safety measures',
          'Urgent psychiatry / ED pathway',
          'Consider involuntary hold criteria per jurisdiction',
          'Involve supports/collateral when safe',
        ],
      },
      {
        condition: 'Passive or nonspecific ideation',
        actions: ['Collaborative safety plan', 'Outpatient follow-up', 'Treat underlying depression/substance use'],
      },
    ],
    pearls: [
      'Asking about suicide does not implant the idea — it is standard of care.',
      'This simplified tool does not replace a full clinical interview or licensed C-SSRS materials.',
    ],
  },
  {
    id: 'mdq',
    name: 'MDQ (Mood Disorder Questionnaire)',
    shortName: 'MDQ',
    description: 'Bipolar spectrum screen: symptom cluster count, same-period clustering, and functional impairment.',
    category: 'psychiatry',
    tags: ['bipolar', 'screening', 'mood', 'mdq'],
    whenToUse: 'Screening for bipolar spectrum disorder in primary care and mental health settings.',
    whyUse: 'Brief self-report screen; positives need diagnostic interview (not diagnostic alone).',
    inputs: [
      ...[
        'Felt so good/hyper that others thought you were not your normal self or you got into trouble',
        'Irritable such that you shouted at people or started fights/arguments',
        'Much more self-confident than usual',
        'Got much less sleep than usual and found you did not really miss it',
        'Much more talkative or spoke faster than usual',
        'Thoughts raced through your head or you could not slow your mind',
        'So easily distracted by things around you that you had trouble concentrating or staying on track',
        'Much more energy than usual',
        'Much more active or did many more things than usual',
        'Much more social or outgoing than usual (e.g., telephoned friends in the middle of the night)',
        'Much more interested in sex than usual',
        'Did things that were unusual for you or that others might have thought were excessive, foolish, or risky',
        'Spending money got you or your family into trouble',
      ].map((label, i) => yesNo(`s${i + 1}`, `${i + 1}. ${label}`)),
      yesNo('samePeriod', 'Several of the above ever happened during the same period of time?'),
      selectInput('impairment', 'How much of a problem did any of this cause?', [
        { label: 'No problem', value: 0 },
        { label: 'Minor problem', value: 1 },
        { label: 'Moderate problem', value: 2 },
        { label: 'Serious problem', value: 3 },
      ]),
    ],
    calculate(values) {
      let symptomCount = 0;
      for (let i = 1; i <= 13; i++) {
        if (bool(values[`s${i}`])) symptomCount += 1;
      }
      const samePeriod = bool(values.samePeriod);
      const impairment = num(values.impairment, 0);
      const positive = symptomCount >= 7 && samePeriod && impairment >= 2;

      if (positive) {
        return {
          score: symptomCount,
          label: 'Positive MDQ screen',
          interpretation: `Positive bipolar screen: ${symptomCount}/13 symptoms, same-period clustering, and moderate–serious impairment. Not diagnostic — perform structured clinical assessment for bipolar I/II and differential (trauma, substances, ADHD, borderline PD).`,
          riskLevel: 'high',
          details: [
            { label: 'Symptom count', value: `${symptomCount}/13` },
            { label: 'Same period', value: samePeriod ? 'Yes' : 'No' },
            {
              label: 'Impairment',
              value: impairment >= 3 ? 'Serious' : impairment === 2 ? 'Moderate' : impairment === 1 ? 'Minor' : 'None',
            },
          ],
          recommendations: [
            'Full mood disorder evaluation',
            'Screen for mania/hypomania carefully before antidepressant monotherapy',
            'Assess safety, substances, and medical contributors',
          ],
        };
      }

      const nearMiss =
        symptomCount >= 7
          ? !samePeriod
            ? 'Symptom count high but same-period criterion not met.'
            : impairment < 2
              ? 'Symptom count high but impairment below moderate threshold.'
              : ''
          : 'Fewer than 7 symptoms endorsed.';

      return {
        score: symptomCount,
        label: 'Negative MDQ screen',
        interpretation: `Does not meet standard MDQ positive criteria (need ≥7 symptoms + same period + moderate/serious problem). ${nearMiss} Clinical concern can still warrant evaluation.`,
        riskLevel: symptomCount >= 7 ? 'moderate' : 'low',
        details: [
          { label: 'Symptom count', value: `${symptomCount}/13` },
          { label: 'Same period', value: samePeriod ? 'Yes' : 'No' },
          {
            label: 'Impairment',
            value: impairment >= 3 ? 'Serious' : impairment === 2 ? 'Moderate' : impairment === 1 ? 'Minor' : 'None',
          },
          { label: 'Positive rule', value: '≥7 symptoms AND same period AND moderate/serious problem' },
        ],
      };
    },
    evidence: {
      summary:
        'Standard MDQ positive screen: ≥7 of 13 manic/hypomanic symptoms, co-occurrence in the same period, and moderate or serious functional impairment.',
      formula: 'Count yes symptoms (0–13); require same-period = yes; impairment ≥ moderate',
      validation: 'Reasonable specificity in some outpatient samples; sensitivity lower in general population — clinical judgment required.',
      references: [
        {
          title: 'Development and validation of a screening instrument for bipolar spectrum disorder: the MDQ',
          citation: 'Hirschfeld RMA et al. Am J Psychiatry. 2000',
          year: 2000, pmid: '11058490',
          doi: '10.1176/appi.ajp.157.11.1873', },
      ],
    },
    nextSteps: [
      {
        condition: 'Positive screen',
        actions: [
          'Diagnostic interview for bipolar disorder',
          'Collateral history when available',
          'Avoid unopposed antidepressant if bipolar likely',
          'Discuss mood stabilizer / atypical antipsychotic options with specialist as appropriate',
        ],
      },
    ],
    pearls: [
      'False positives occur with PTSD, substance use, and cluster B traits.',
      'Family history of bipolar disorder increases post-test probability.',
    ],
  },
];
