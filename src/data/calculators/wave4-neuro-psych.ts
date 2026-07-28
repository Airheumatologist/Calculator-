import type { Calculator } from '../../types/calculator';
import { num, bool, round, yesNo, selectInput, numberInput, riskFromThresholds } from '../../utils/helpers';

export const wave4NeuroPsychCalcs: Calculator[] = [
  {
    id: 'race-scale',
    name: 'RACE Scale (Prehospital LVO)',
    shortName: 'RACE',
    description:
      'Rapid Arterial oCclusion Evaluation scale for prehospital detection of large-vessel occlusion stroke (0–9).',
    category: 'neurology',
    tags: ['stroke', 'lvo', 'prehospital', 'race', 'ems'],
    whenToUse:
      'Suspected acute ischemic stroke in the field or ED triage when routing to endovascular-capable centers is considered.',
    whyUse:
      'Simple cortical + motor scale; RACE ≥5 suggests high likelihood of LVO and may support direct transport to thrombectomy centers.',
    inputs: [
      selectInput('face', 'Facial palsy', [
        { label: 'Absent (0)', value: 0 },
        { label: 'Mild (1)', value: 1 },
        { label: 'Moderate to severe (2)', value: 2 },
      ]),
      selectInput('arm', 'Arm motor function', [
        { label: 'Normal to mild (0)', value: 0 },
        { label: 'Moderate (1)', value: 1 },
        { label: 'Severe (2)', value: 2 },
      ]),
      selectInput('leg', 'Leg motor function', [
        { label: 'Normal to mild (0)', value: 0 },
        { label: 'Moderate (1)', value: 1 },
        { label: 'Severe (2)', value: 2 },
      ]),
      selectInput('gaze', 'Head / gaze deviation', [
        { label: 'Absent (0)', value: 0 },
        { label: 'Present (1)', value: 1 },
      ]),
      selectInput('side', 'Hemiparesis side (cortical testing branch)', [
        { label: 'Right hemiparesis → score aphasia', value: 'right' },
        { label: 'Left hemiparesis → score agnosia', value: 'left' },
        { label: 'No clear laterality / bilateral', value: 'na' },
      ]),
      selectInput('aphasia', 'Aphasia (right hemiparesis): close eyes + “make a fist”', [
        { label: 'Performs both (0)', value: 0 },
        { label: 'Performs one (1)', value: 1 },
        { label: 'Performs neither (2)', value: 2 },
      ], 0, 'Use when right-sided weakness (left hemisphere)'),
      selectInput('agnosia', 'Agnosia / neglect (left hemiparesis)', [
        { label: 'Recognizes arm and impairment (0)', value: 0 },
        { label: 'Does not recognize arm OR impairment (1)', value: 1 },
        { label: 'Does not recognize either (2)', value: 2 },
      ], 0, 'Use when left-sided weakness (right hemisphere)'),
    ],
    calculate(values) {
      const side = String(values.side ?? 'right');
      const cortical =
        side === 'left' ? num(values.agnosia) : side === 'right' ? num(values.aphasia) : Math.max(num(values.aphasia), num(values.agnosia));
      const score = num(values.face) + num(values.arm) + num(values.leg) + num(values.gaze) + cortical;
      const r = riskFromThresholds(score, [
        {
          max: 4,
          level: 'moderate',
          label: 'Lower LVO probability band',
          interpretation: `RACE ${score}/9: below common LVO routing cutoffs (often ≥5). Still treat as stroke — activate pathway; do not rule out LVO.`,
        },
        {
          max: 9,
          level: 'high',
          label: 'Higher LVO probability (cutoff met)',
          interpretation: `RACE ${score}/9 (≥5): higher likelihood of large-vessel occlusion — consider preferential transport to endovascular-capable center per regional protocol.`,
        },
      ]);
      return {
        score,
        unit: '/9',
        ...r,
        details: [
          { label: 'Motor + face + gaze', value: String(num(values.face) + num(values.arm) + num(values.leg) + num(values.gaze)) },
          { label: 'Cortical branch', value: `${cortical} (${side === 'left' ? 'agnosia' : side === 'right' ? 'aphasia' : 'max of both'})` },
          { label: 'Common LVO cutoff', value: '≥5' },
        ],
      };
    },
    evidence: {
      summary:
        'RACE (0–9): facial palsy 0–2, arm 0–2, leg 0–2, head/gaze deviation 0–1, plus aphasia (right hemiparesis) or agnosia (left hemiparesis) 0–2. Score ≥5 often used for LVO suspicion.',
      formula: 'Face + arm + leg + gaze + cortical item (0–9)',
      validation: 'Derived and validated in EMS stroke cohorts for large-artery occlusion detection; sensitivity/specificity trade-offs vs other LVO scales.',
      references: [
        {
          title: 'Design and validation of a prehospital stroke scale to predict LVO: RACE scale',
          citation: 'Pérez de la Ossa N et al. Stroke. 2014',
          year: 2014,
          pmid: '24335227',
          doi: '10.1161/STROKEAHA.113.003580',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Any suspected stroke',
        actions: ['Last-known-well time', 'Glucose check', 'Activate stroke system', 'Bypass considerations per EMS protocol'],
      },
      {
        condition: 'RACE ≥5',
        actions: ['Preferential routing to EVT-capable center if protocol allows', 'Early CTA/MRA planning on arrival'],
      },
    ],
    pearls: [
      'Score only one cortical branch based on hemiparesis side.',
      'RACE does not replace full NIHSS or vessel imaging.',
    ],
  },

  {
    id: 'laps-score',
    name: 'LAMS (Los Angeles Motor Scale)',
    shortName: 'LAMS',
    description: '3-item motor scale for prehospital LVO prediction (facial droop, arm drift, grip; 0–5).',
    category: 'neurology',
    tags: ['stroke', 'lvo', 'lams', 'prehospital', 'ems'],
    whenToUse: 'Rapid field or triage motor assessment when large-vessel occlusion is a concern.',
    whyUse: 'Very brief motor-only LVO screen; LAMS ≥4 commonly associated with higher LVO probability.',
    inputs: [
      selectInput('face', 'Facial droop', [
        { label: 'Absent (0)', value: 0 },
        { label: 'Present (1)', value: 1 },
      ]),
      selectInput('arm', 'Arm drift', [
        { label: 'Absent (0)', value: 0 },
        { label: 'Drifts down (1)', value: 1 },
        { label: 'Falls rapidly (2)', value: 2 },
      ]),
      selectInput('grip', 'Grip strength', [
        { label: 'Normal (0)', value: 0 },
        { label: 'Weak grip (1)', value: 1 },
        { label: 'No grip / no movement (2)', value: 2 },
      ]),
    ],
    calculate(values) {
      const score = num(values.face) + num(values.arm) + num(values.grip);
      const r = riskFromThresholds(score, [
        {
          max: 3,
          level: 'moderate',
          label: 'Lower LVO band',
          interpretation: `LAMS ${score}/5: below common LVO cutoffs (often ≥4). Continue stroke evaluation; LVO not excluded.`,
        },
        {
          max: 5,
          level: 'high',
          label: 'Higher LVO probability',
          interpretation: `LAMS ${score}/5 (≥4): higher probability of large-vessel occlusion — expedite CTA and thrombectomy-capable pathway.`,
        },
      ]);
      return {
        score,
        unit: '/5',
        ...r,
        details: [{ label: 'Common LVO cutoff', value: '≥4' }],
      };
    },
    evidence: {
      summary: 'LAMS = facial droop (0–1) + arm drift (0–2) + grip (0–2). Total 0–5; ≥4 often used for LVO suspicion.',
      formula: 'Face + arm + grip (0–5)',
      validation: 'Derived from LAPSS motor items; validated for LVO and outcome prediction in EMS/ED cohorts.',
      references: [
        {
          title: 'A brief prehospital stroke severity scale identifies ICH and LVO',
          citation: 'Nazliel B et al. Stroke. 2008; LAMS applications in LVO routing literature',
          year: 2008,
          pmid: '18556587',
          doi: '10.1161/STROKEAHA.107.508127',
        },
      ],
    },
    nextSteps: [
      { condition: 'LAMS ≥4', actions: ['Stroke alert', 'Consider EVT-capable destination', 'Rapid imaging on arrival'] },
      { condition: 'Any positive motor finding', actions: ['Do not delay thrombolysis pathway if eligible'] },
    ],
    pearls: ['Motor-only — misses pure aphasia/neglect LVO presentations.', 'Complement with RACE, C-STAT, or FAST-ED per system preference.'],
  },

  {
    id: 'c-stat',
    name: 'C-STAT (Cincinnati Stroke Triage Assessment Tool)',
    shortName: 'C-STAT',
    description: '3-item EMS scale for large-vessel occlusion: gaze, arm weakness, and consciousness questions/commands (0–4).',
    category: 'neurology',
    tags: ['stroke', 'lvo', 'c-stat', 'cincinnati', 'prehospital'],
    whenToUse: 'Prehospital or triage LVO screening with minimal items.',
    whyUse: 'Quick weighted scale; C-STAT ≥2 commonly used as LVO-positive screen.',
    inputs: [
      yesNo('gaze', 'Gaze preference / conjugate deviation present', 2),
      yesNo('arm', 'Arm weakness — cannot hold arm up against gravity for 10 s', 1),
      yesNo('loc', 'LOC: incorrect on ≥1 of 2 orientation questions OR fails ≥1 of 2 commands', 1),
    ],
    calculate(values) {
      const score = (bool(values.gaze) ? 2 : 0) + (bool(values.arm) ? 1 : 0) + (bool(values.loc) ? 1 : 0);
      const r = riskFromThresholds(score, [
        {
          max: 1,
          level: 'moderate',
          label: 'Screen negative / lower LVO band',
          interpretation: `C-STAT ${score}/4: below usual LVO cutoff (≥2). Still manage as possible stroke.`,
        },
        {
          max: 4,
          level: 'high',
          label: 'Screen positive for LVO concern',
          interpretation: `C-STAT ${score}/4 (≥2): positive screen for possible large-vessel occlusion — prioritize EVT-capable care per protocol.`,
        },
      ]);
      return {
        score,
        unit: '/4',
        ...r,
        details: [
          { label: 'Gaze (2 pts if yes)', value: bool(values.gaze) ? 'Yes' : 'No' },
          { label: 'Arm / LOC (1 each)', value: `Arm ${bool(values.arm) ? 1 : 0}, LOC ${bool(values.loc) ? 1 : 0}` },
        ],
      };
    },
    evidence: {
      summary:
        'C-STAT: gaze preference (2), arm weakness unable to hold against gravity (1), abnormal LOC by questions or commands (1). Total 0–4; ≥2 suggests LVO.',
      formula: 'Gaze×2 + arm + LOC (0–4)',
      validation: 'Derived from Cincinnati Prehospital Stroke Scale components; studied for LVO prediction and destination decisions.',
      references: [
        {
          title: 'Design and validation of a prehospital scale to predict LVO: C-STAT',
          citation: 'Katz BS et al. Stroke. 2015',
          year: 2015,
          pmid: '25899242',
          doi: '10.1161/STROKEAHA.115.008804',
        },
      ],
    },
    nextSteps: [
      { condition: 'C-STAT ≥2', actions: ['Consider mothership / EVT center routing', 'Early advanced imaging'] },
    ],
    pearls: ['Gaze carries double weight.', 'False negatives occur with mild LVO or posterior circulation stroke.'],
  },

  {
    id: 'fast-ed',
    name: 'FAST-ED Scale',
    shortName: 'FAST-ED',
    description: 'Field Assessment Stroke Triage for Emergency Destination — LVO prediction scale (0–9).',
    category: 'neurology',
    tags: ['stroke', 'lvo', 'fast-ed', 'prehospital', 'ems'],
    whenToUse: 'Prehospital triage when deciding transport destination for suspected large-vessel occlusion.',
    whyUse: 'Balances facial, arm, speech, eye deviation, and denial/neglect items linked to cortical LVO.',
    inputs: [
      selectInput('face', 'Facial palsy', [
        { label: 'Normal / absent (0)', value: 0 },
        { label: 'Mild (1)', value: 1 },
        { label: 'Moderate to severe (2)', value: 2 },
      ]),
      selectInput('arm', 'Arm weakness', [
        { label: 'No drift (0)', value: 0 },
        { label: 'Drift or some effort against gravity (1)', value: 1 },
        { label: 'No effort against gravity / no movement (2)', value: 2 },
      ]),
      selectInput('speech', 'Speech changes', [
        { label: 'Absent (0)', value: 0 },
        { label: 'Mild (1)', value: 1 },
        { label: 'Severe / mute / incomprehensible (2)', value: 2 },
      ]),
      selectInput('eye', 'Eye deviation', [
        { label: 'Absent (0)', value: 0 },
        { label: 'Partial (1)', value: 1 },
        { label: 'Forced deviation (2)', value: 2 },
      ]),
      selectInput('denial', 'Denial / neglect', [
        { label: 'Absent (0)', value: 0 },
        { label: 'Extinction to bilateral simultaneous stimulation only (1)', value: 1 },
        { label: 'Does not recognize own hand or orients only one side (2)', value: 2 },
      ]),
    ],
    calculate(values) {
      const score =
        num(values.face) + num(values.arm) + num(values.speech) + num(values.eye) + num(values.denial);
      const r = riskFromThresholds(score, [
        {
          max: 3,
          level: 'moderate',
          label: 'Lower LVO probability band',
          interpretation: `FAST-ED ${score}/9: below common LVO cutoffs (often ≥4). Continue standard stroke care.`,
        },
        {
          max: 9,
          level: 'high',
          label: 'Higher LVO probability',
          interpretation: `FAST-ED ${score}/9 (≥4): higher LVO likelihood — favor endovascular-capable destination and expedited CTA.`,
        },
      ]);
      return {
        score,
        unit: '/9',
        ...r,
        details: [{ label: 'Common LVO cutoff', value: '≥4 (some systems use ≥3 or ≥5)' }],
      };
    },
    evidence: {
      summary:
        'FAST-ED (0–9): Facial 0–2, Arm 0–2, Speech 0–2, Eye deviation 0–2, Denial/neglect 0–2. Score ≥4 frequently used to predict LVO.',
      formula: 'F+A+S+E+D (0–9)',
      validation: 'Validated against CTA-defined LVO; comparable performance to other EMS LVO scales.',
      references: [
        {
          title: 'Field Assessment Stroke Triage for Emergency Destination (FAST-ED)',
          citation: 'Lima FO et al. Stroke. 2016',
          year: 2016,
          pmid: '27834749',
          doi: '10.1161/STROKEAHA.116.015296',
        },
      ],
    },
    nextSteps: [
      { condition: 'FAST-ED ≥4', actions: ['Route to comprehensive stroke / EVT center per protocol', 'Document last known well'] },
    ],
    pearls: ['Includes cortical signs (eye, neglect) unlike pure motor scales.', 'Local cutoffs may differ — follow regional EMS policy.'],
  },

  {
    id: 'func-score',
    name: 'FUNC Score (ICH Functional Outcome)',
    shortName: 'FUNC',
    description:
      'Predicts likelihood of functional independence after intracerebral hemorrhage (score 0–11).',
    category: 'neurology',
    tags: ['ich', 'func', 'prognosis', 'hemorrhage', 'outcome'],
    whenToUse: 'Spontaneous ICH when discussing 90-day functional independence probability (not mortality alone).',
    whyUse: 'Complements ICH Score (mortality) with functional outcome estimates based on age, GCS, volume, location, and cognition.',
    inputs: [
      selectInput('age', 'Age', [
        { label: '<70 years (2)', value: 2 },
        { label: '70–79 years (1)', value: 1 },
        { label: '≥80 years (0)', value: 0 },
      ]),
      selectInput('gcs', 'GCS', [
        { label: 'GCS ≥9 (2)', value: 2 },
        { label: 'GCS ≤8 (0)', value: 0 },
      ]),
      selectInput('location', 'ICH location', [
        { label: 'Lobar (2)', value: 2 },
        { label: 'Deep (1)', value: 1 },
        { label: 'Infratentorial (0)', value: 0 },
      ]),
      selectInput('volume', 'ICH volume', [
        { label: '<30 mL (4)', value: 4 },
        { label: '30–60 mL (2)', value: 2 },
        { label: '>60 mL (0)', value: 0 },
      ], 4, 'ABC/2 or volumetric estimate'),
      selectInput('cognition', 'Pre-ICH cognitive impairment', [
        { label: 'No (1)', value: 1 },
        { label: 'Yes (0)', value: 0 },
      ]),
    ],
    calculate(values) {
      const score =
        num(values.age) + num(values.gcs) + num(values.location) + num(values.volume) + num(values.cognition);
      // Approximate published rates of functional independence (mRS 0–2) at 90 days
      let independence = '~0%';
      let level: 'critical' | 'high' | 'moderate' | 'low' = 'critical';
      let label = 'Very low chance of independence';
      if (score <= 4) {
        independence = '~0%';
        level = 'critical';
        label = 'FUNC 0–4 — ~0% independent';
      } else if (score <= 7) {
        independence = '~20–30%';
        level = 'high';
        label = 'FUNC 5–7 — low–intermediate independence';
      } else if (score === 8) {
        independence = '~45–50%';
        level = 'moderate';
        label = 'FUNC 8 — intermediate independence';
      } else if (score <= 10) {
        independence = '~70–80%';
        level = 'low';
        label = 'FUNC 9–10 — higher independence';
      } else {
        independence = '~90–95%';
        level = 'low';
        label = 'FUNC 11 — highest independence band';
      }
      return {
        score,
        unit: '/11',
        label,
        riskLevel: level,
        interpretation: `FUNC score ${score}/11: approximate chance of functional independence (often mRS 0–2) at 90 days about ${independence}. Population estimates only — do not use alone for care limitation.`,
        details: [
          { label: 'Approx. independence @ 90 d', value: independence },
          { label: 'Range', value: '0–11 (higher = better functional outlook)' },
        ],
        recommendations: [
          'Pair with ICH Score for mortality context',
          'Avoid early nihilism — trajectory and goals matter',
          'BP control, reverse coagulopathy, neurosurgical input as indicated',
        ],
      };
    },
    evidence: {
      summary:
        'FUNC: age (<70:2, 70–79:1, ≥80:0) + GCS (≥9:2, ≤8:0) + location (lobar 2, deep 1, infratentorial 0) + volume (<30:4, 30–60:2, >60:0) + no pre-ICH cognitive impairment (1). Higher score → higher chance of independence.',
      formula: 'Sum 0–11',
      validation: 'Rost et al. derivation for 90-day functional independence after ICH; external validations exist with band-level estimates.',
      references: [
        {
          title: 'Prediction of functional outcome in patients with primary ICH: the FUNC score',
          citation: 'Rost NS et al. Stroke. 2008',
          year: 2008,
          pmid: '18556582',
          doi: '10.1161/STROKEAHA.107.512202',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'All ICH',
        actions: ['Acute ICH pathway', 'Discuss prognosis with ranges, not certainties', 'Reassess over first 24–72 h'],
      },
    ],
    pearls: [
      'Higher FUNC = better functional prognosis (opposite direction from ICH Score mortality).',
      'Self-fulfilling prophecy bias can inflate mortality at high severity — use carefully.',
    ],
  },

  {
    id: 'spot-sign',
    name: 'CTA Spot Sign Helper (ICH Expansion)',
    shortName: 'Spot Sign',
    description:
      'Educational checklist for CTA spot sign and related hematoma expansion risk features in ICH.',
    category: 'neurology',
    tags: ['ich', 'spot sign', 'cta', 'expansion', 'hemorrhage'],
    whenToUse: 'Spontaneous ICH with CTA performed or planned when assessing risk of hematoma expansion.',
    whyUse: 'Structures recognition of spot sign and companion clinical risk factors linked to growth and poor outcome.',
    inputs: [
      yesNo('ctaDone', 'CTA available for review'),
      yesNo('spotSign', 'Spot sign present (≥1 focus of contrast within hematoma, discontinuous from vessels)'),
      yesNo('multipleSpots', 'Multiple spot signs or large/serpiginous spot'),
      yesNo('earlyPresentation', 'Presentation within 6 hours of onset'),
      yesNo('anticoag', 'Anticoagulation or coagulopathy'),
      yesNo('largeVolume', 'Baseline hematoma volume ≥30 mL'),
      yesNo('ivh', 'Intraventricular extension'),
      yesNo('bpUncontrolled', 'SBP still markedly elevated / hard to control'),
    ],
    calculate(values) {
      const cta = bool(values.ctaDone);
      const spot = bool(values.spotSign);
      const clinical =
        (bool(values.earlyPresentation) ? 1 : 0) +
        (bool(values.anticoag) ? 1 : 0) +
        (bool(values.largeVolume) ? 1 : 0) +
        (bool(values.ivh) ? 1 : 0) +
        (bool(values.bpUncontrolled) ? 1 : 0) +
        (bool(values.multipleSpots) ? 1 : 0);
      const score = (spot ? 2 : 0) + clinical;

      if (!cta) {
        return {
          score,
          label: 'CTA not available',
          riskLevel: 'info' as const,
          interpretation: `Clinical expansion-risk features: ${clinical}. Obtain CTA if expansion risk stratification or underlying vascular lesion evaluation is needed (and patient is a candidate). Spot sign cannot be scored without CTA.`,
          details: [{ label: 'Clinical risk tally', value: String(clinical) }],
        };
      }

      if (spot) {
        return {
          score,
          label: 'Spot sign positive — higher expansion risk',
          riskLevel: 'high' as const,
          interpretation: `CTA spot sign present. Associated with higher risk of hematoma expansion and worse outcomes. Additional risk features tally ${clinical}. Intensify BP control, reverse coagulopathy, serial neuro checks, and consider repeat imaging.`,
          details: [
            { label: 'Spot sign', value: bool(values.multipleSpots) ? 'Yes (multiple/complex)' : 'Yes' },
            { label: 'Companion risk features', value: String(clinical) },
          ],
          recommendations: [
            'Aggressive SBP targets per guidelines / local protocol',
            'Reverse anticoagulation promptly',
            'Early neurosurgical consultation if applicable',
            'Low threshold for repeat CT if decline',
          ],
        };
      }

      const r = riskFromThresholds(clinical, [
        {
          max: 1,
          level: 'moderate',
          label: 'Spot sign negative — lower radiographic risk',
          interpretation: `No spot sign. Expansion still possible, especially with other risk factors (tally ${clinical}). Continue standard ICH care.`,
        },
        {
          max: 6,
          level: 'high',
          label: 'Spot sign negative but high clinical risk',
          interpretation: `No spot sign, but ${clinical} companion expansion-risk features present. Maintain vigilance for growth.`,
        },
      ]);
      return {
        score: clinical,
        ...r,
        details: [{ label: 'Companion risk features', value: String(clinical) }],
      };
    },
    evidence: {
      summary:
        'CTA spot sign = extravasation of contrast within acute ICH, discontinuous from outside vessels; predicts hematoma expansion. Clinical factors (early presentation, coagulopathy, large volume) also raise expansion risk.',
      formula: 'Checklist helper — not a validated composite point score',
      validation: 'Spot sign validated in multiple ICH cohorts (e.g., PREDICT) for expansion prediction; treatment trials targeting spot sign have been mixed.',
      references: [
        {
          title: 'CT angiography spot sign predicts hematoma expansion in acute ICH (PREDICT)',
          citation: 'Demchuk AM et al. Lancet Neurol. 2012',
          year: 2012,
          pmid: '22497932',
          doi: '10.1016/j.cub.2012.02.035',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Spot sign positive or high risk',
        actions: ['BP control', 'Reverse coagulopathy', 'ICU monitoring', 'Neurosurgery input'],
      },
    ],
    pearls: [
      'Spot sign ≠ aneurysm; confirm morphology vs vascular lesion.',
      'Absence of spot sign does not eliminate expansion risk.',
    ],
  },

  {
    id: 'wfns-sah',
    name: 'WFNS SAH Grade',
    shortName: 'WFNS',
    description: 'World Federation of Neurosurgical Societies grade for aneurysmal SAH using GCS and motor deficit (I–V).',
    category: 'neurology',
    tags: ['sah', 'wfns', 'aneurysm', 'grade', 'gcs'],
    whenToUse: 'Confirmed or highly suspected aneurysmal SAH for standardized clinical severity grading.',
    whyUse: 'Widely used international grade linking GCS and focal motor deficit to outcome; complements Hunt-Hess and Fisher grades.',
    inputs: [
      numberInput('gcs', 'Glasgow Coma Scale total', { min: 3, max: 15, defaultValue: 15 }),
      yesNo('motorDeficit', 'Major focal motor deficit present (hemiparesis/hemiplegia)'),
    ],
    calculate(values) {
      const gcs = num(values.gcs, 15);
      const deficit = bool(values.motorDeficit);
      let grade = 1;
      if (gcs >= 3 && gcs <= 6) grade = 5;
      else if (gcs >= 7 && gcs <= 12) grade = 4;
      else if (gcs >= 13 && gcs <= 14 && deficit) grade = 3;
      else if (gcs >= 13 && gcs <= 14 && !deficit) grade = 2;
      else if (gcs === 15 && deficit) grade = 2; // uncommon; map to ≥II messaging
      else grade = 1; // GCS 15, no motor deficit

      const r = riskFromThresholds(grade, [
        {
          max: 1,
          level: 'low',
          label: 'WFNS I',
          interpretation: 'GCS 15 without motor deficit. Best clinical grade — still requires full SAH pathway and aneurysm securement planning.',
        },
        {
          max: 2,
          level: 'moderate',
          label: 'WFNS II',
          interpretation: 'GCS 13–14 without motor deficit (or GCS 15 with deficit mapped here). Intermediate severity — monitor for hydrocephalus and rebleeding.',
        },
        {
          max: 3,
          level: 'high',
          label: 'WFNS III',
          interpretation: 'GCS 13–14 with motor deficit. Higher morbidity; urgent aneurysm treatment and ICU care.',
        },
        {
          max: 4,
          level: 'critical',
          label: 'WFNS IV',
          interpretation: 'GCS 7–12 ± motor deficit. Severe SAH — airway, ICP/hydrocephalus, and aggressive neurocritical care.',
        },
        {
          max: 5,
          level: 'critical',
          label: 'WFNS V',
          interpretation: 'GCS 3–6. Very severe grade with high mortality; resuscitate, reverse herniation/hydrocephalus when feasible, discuss goals.',
        },
      ]);
      return {
        score: grade,
        unit: 'grade',
        ...r,
        details: [
          { label: 'GCS', value: String(gcs) },
          { label: 'Motor deficit', value: deficit ? 'Yes' : 'No' },
          {
            label: 'WFNS map',
            value: 'I:15 no deficit · II:13–14 no deficit · III:13–14 + deficit · IV:7–12 · V:3–6',
          },
        ],
      };
    },
    evidence: {
      summary:
        'WFNS grades SAH: I = GCS 15; II = GCS 13–14 no motor deficit; III = GCS 13–14 with motor deficit; IV = GCS 7–12; V = GCS 3–6.',
      formula: 'Map GCS + presence of major motor deficit → grade I–V',
      validation: 'International standard grading system for aSAH severity and outcome communication.',
      references: [
        {
          title: 'Report of World Federation of Neurological Surgeons Committee on a universal SAH grading scale',
          citation: 'Teasdale GM et al. J Neurosurg. 1988',
          year: 1988,
          pmid: '3236024',
          doi: '10.1136/jnnp.51.11.1457',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Any WFNS grade',
        actions: ['BP control', 'Nimodipine', 'Aneurysm imaging (CTA/DSA)', 'Secure aneurysm', 'Watch for DCI days 3–14'],
      },
      { condition: 'WFNS IV–V', actions: ['Airway protection', 'EVD if hydrocephalus', 'Goals-of-care discussion'] },
    ],
    pearls: [
      'Re-grade after EVD/resuscitation — hydrocephalus can lower GCS reversibly.',
      'Report Hunt-Hess and modified Fisher alongside WFNS.',
    ],
  },

  {
    id: 'vasospasm-risk',
    name: 'SAH Vasospasm / DCI Risk Window',
    shortName: 'DCI Window',
    description:
      'Helper for delayed cerebral ischemia (vasospasm) risk timing after aneurysmal SAH and modified Fisher context.',
    category: 'neurology',
    tags: ['sah', 'vasospasm', 'dci', 'fisher', 'icu'],
    whenToUse: 'Aneurysmal SAH care planning for monitoring intensity during the DCI-risk period.',
    whyUse: 'DCI risk is time-dependent (peaks ~days 7–10, window ~3–14) and higher with thick blood / high modified Fisher grades.',
    inputs: [
      numberInput('day', 'Days since SAH onset (bleed day = 0 or 1 per local convention)', {
        min: 0,
        max: 30,
        defaultValue: 5,
        helpText: 'Use hospital day or days from ictus consistently',
      }),
      selectInput('mFisher', 'Modified Fisher grade (if known)', [
        { label: 'Unknown / not entered', value: -1 },
        { label: 'mFisher 0', value: 0 },
        { label: 'mFisher 1 (thin SAH, no IVH)', value: 1 },
        { label: 'mFisher 2 (thin SAH + IVH)', value: 2 },
        { label: 'mFisher 3 (thick SAH, no IVH)', value: 3 },
        { label: 'mFisher 4 (thick SAH + IVH)', value: 4 },
      ]),
      yesNo('secured', 'Aneurysm secured (clipped/coiled)'),
      yesNo('nimodipine', 'Nimodipine ongoing'),
    ],
    calculate(values) {
      const day = num(values.day, 5);
      const mf = num(values.mFisher, -1);
      let timeBand = 'Outside classic high-risk window';
      let timeLevel: 'low' | 'moderate' | 'high' | 'critical' | 'info' = 'low';

      if (day < 3) {
        timeBand = 'Early phase (day <3) — rebleeding and hydrocephalus dominate; DCI less common but rising';
        timeLevel = 'moderate';
      } else if (day <= 14) {
        if (day >= 7 && day <= 10) {
          timeBand = 'Peak DCI/vasospasm window (≈ days 7–10)';
          timeLevel = 'critical';
        } else {
          timeBand = 'High-risk DCI window (≈ days 3–14)';
          timeLevel = 'high';
        }
      } else if (day <= 21) {
        timeBand = 'Late window — risk declining but DCI still possible';
        timeLevel = 'moderate';
      } else {
        timeBand = 'Beyond typical DCI window — new deficits need broad differential';
        timeLevel = 'low';
      }

      let fisherNote = 'Modified Fisher not provided';
      if (mf === 0) fisherNote = 'mFisher 0 — lowest radiographic DCI risk band';
      else if (mf === 1) fisherNote = 'mFisher 1 — intermediate DCI risk';
      else if (mf === 2) fisherNote = 'mFisher 2 — elevated vs thin SAH alone';
      else if (mf === 3) fisherNote = 'mFisher 3 — high DCI risk (thick SAH)';
      else if (mf === 4) fisherNote = 'mFisher 4 — highest mFisher DCI risk band';

      const level =
        mf >= 3 && (day >= 3 && day <= 14)
          ? 'critical'
          : timeLevel;

      return {
        score: day,
        unit: 'day',
        label: timeBand,
        riskLevel: level as 'low' | 'moderate' | 'high' | 'critical' | 'info',
        interpretation: `Ictus day ${day}: ${timeBand}. ${fisherNote}. Nimodipine ${bool(values.nimodipine) ? 'on' : 'NOT documented'} · aneurysm ${bool(values.secured) ? 'secured' : 'NOT secured — rebleed risk'}. Maintain euvolemia, neuro checks, and investigate new deficits (TCD/CTA/DSA as indicated).`,
        details: [
          { label: 'Time band', value: timeBand },
          { label: 'mFisher context', value: fisherNote },
          { label: 'Aneurysm secured', value: bool(values.secured) ? 'Yes' : 'No' },
          { label: 'Nimodipine', value: bool(values.nimodipine) ? 'Yes' : 'No' },
        ],
        recommendations: [
          'Nimodipine 60 mg q4h (or dose-adjusted) unless contraindicated',
          'Avoid hypovolemia / hypotension',
          'New focal deficit → rule out hydrocephalus, seizure, fever, then DCI pathway',
        ],
      };
    },
    evidence: {
      summary:
        'Delayed cerebral ischemia after aSAH typically occurs days 3–14 (peak ~7–10). Modified Fisher thick SAH ± IVH increases radiographic vasospasm/DCI risk. This helper combines timing with optional mFisher context.',
      formula: 'Day-from-ictus risk band ± mFisher grade context',
      validation: 'Timing and mFisher associations are well described in neurocritical care literature; not a single numeric DCI probability model.',
      references: [
        {
          title: 'Prediction of symptomatic vasospasm after SAH: the modified Fisher scale',
          citation: 'Frontera JA et al. Neurosurgery. 2006',
          year: 2006,
          pmid: '16823296',
          doi: '10.1227/01.neu.0000243277.86222.6c',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Days 3–14',
        actions: ['ICU/step-down neuro monitoring', 'Daily clinical exams', 'TCD if used locally', 'Low threshold for imaging on change'],
      },
    ],
    pearls: [
      'DCI is a clinical diagnosis; radiographic vasospasm can be asymptomatic.',
      'Secure aneurysm early — rebleeding risk is front-loaded.',
    ],
  },

  {
    id: 'tbi-severity',
    name: 'TBI Severity by GCS',
    shortName: 'TBI Severity',
    description: 'Classifies traumatic brain injury severity as mild, moderate, or severe using Glasgow Coma Scale.',
    category: 'neurology',
    tags: ['tbi', 'gcs', 'trauma', 'concussion', 'severity'],
    whenToUse: 'Initial TBI severity stratification after primary survey and GCS assessment.',
    whyUse: 'Universal mild (13–15) / moderate (9–12) / severe (≤8) bands drive imaging, airway, and disposition pathways.',
    inputs: [
      numberInput('gcs', 'Glasgow Coma Scale', { min: 3, max: 15, defaultValue: 15 }),
      yesNo('intubated', 'Intubated / chemically paralyzed (GCS limited)'),
      yesNo('postTraumaticAmnesia', 'Post-traumatic amnesia present'),
      yesNo('loc', 'Loss of consciousness reported'),
    ],
    calculate(values) {
      const gcs = num(values.gcs, 15);
      if (bool(values.intubated) && gcs > 8) {
        return {
          score: gcs,
          label: 'GCS confounded — treat severity clinically',
          riskLevel: 'info' as const,
          interpretation: `Recorded GCS ${gcs} but airway/sedation confounders present. Report GCS with T/P modifiers; severity may be worse than verbal score suggests. Use pupillary exam, motor response, and imaging.`,
          details: [{ label: 'Note', value: 'Intubated/paralyzed — incomplete GCS' }],
        };
      }
      const r = riskFromThresholds(gcs, [
        {
          max: 8,
          level: 'critical',
          label: 'Severe TBI (GCS 3–8)',
          interpretation: 'Severe TBI. Airway protection, prevent hypoxia/hypotension, urgent CT, ICP pathway, neurosurgery consult, reverse coagulopathy.',
        },
        {
          max: 12,
          level: 'high',
          label: 'Moderate TBI (GCS 9–12)',
          interpretation: 'Moderate TBI. Close monitoring, urgent CT if not done, admit (often step-down/ICU), serial neuro checks, neurosurgery involvement as indicated.',
        },
        {
          max: 15,
          level: 'moderate',
          label: 'Mild TBI (GCS 13–15)',
          interpretation: 'Mild TBI / concussion range by GCS. Imaging per decision rules (e.g., Canadian CT Head, PECARN). Observe for deterioration; counsel on concussion precautions.',
        },
      ]);
      // Mild still "moderate" riskLevel for clinical caution; map 15 with no red flags lower
      if (gcs >= 13 && !bool(values.loc) && !bool(values.postTraumaticAmnesia) && gcs === 15) {
        return {
          score: gcs,
          unit: 'GCS',
          label: 'Mild TBI range (GCS 15)',
          riskLevel: 'low' as const,
          interpretation:
            'GCS 15 — mild TBI category if head trauma criteria met. Apply imaging rules; brief LOC/PTA if present increase concern even with high GCS.',
          details: [
            { label: 'Severity band', value: 'Mild (GCS 13–15)' },
            { label: 'LOC', value: bool(values.loc) ? 'Yes' : 'No' },
            { label: 'PTA', value: bool(values.postTraumaticAmnesia) ? 'Yes' : 'No' },
          ],
        };
      }
      return {
        score: gcs,
        unit: 'GCS',
        ...r,
        details: [
          { label: 'Bands', value: 'Mild 13–15 · Moderate 9–12 · Severe ≤8' },
          { label: 'LOC', value: bool(values.loc) ? 'Yes' : 'No' },
          { label: 'PTA', value: bool(values.postTraumaticAmnesia) ? 'Yes' : 'No' },
        ],
      };
    },
    evidence: {
      summary:
        'TBI severity by GCS: mild 13–15, moderate 9–12, severe 3–8. Ancillary features (LOC, PTA duration, imaging) refine concussion vs complicated mild TBI.',
      formula: 'Map GCS → mild / moderate / severe',
      validation: 'Standard ATLS/neurotrauma classification used worldwide.',
      references: [
        {
          title: 'Assessment of coma and impaired consciousness: GCS',
          citation: 'Teasdale G, Jennett B. Lancet. 1974; TBI severity bands in trauma guidelines',
          year: 1974,
          pmid: '4136544',
          doi: '10.1016/s0140-6736(74)91639-0',
        },
      ],
    },
    nextSteps: [
      { condition: 'GCS ≤8', actions: ['Intubate if not already', 'Stat CT', 'Neurosurgery', 'Avoid hypotension/hypoxia'] },
      { condition: 'GCS 9–12', actions: ['Urgent CT', 'Admission with serial exams'] },
      { condition: 'GCS 13–15', actions: ['Decision-rule imaging', 'Observation / discharge counseling'] },
    ],
    pearls: [
      'GCS is confounded by drugs, seizure, intubation, and language barriers.',
      '“Mild” GCS can still hide surgical lesions — use decision rules and repeat exams.',
    ],
  },

  {
    id: 'scat5-symptom',
    name: 'SCAT Symptom Severity Score',
    shortName: 'SCAT Symptoms',
    description:
      'Enter SCAT5/SCAT6 symptom evaluation totals: number of symptoms (0–22) and severity score (0–132).',
    category: 'neurology',
    tags: ['concussion', 'scat5', 'scat6', 'sports', 'symptom'],
    whenToUse: 'Sideline or clinic concussion assessment after administering the SCAT symptom checklist.',
    whyUse: 'Quantifies symptom burden for baseline comparison, recovery tracking, and return-to-play decisions.',
    inputs: [
      numberInput('numSymptoms', 'Number of symptoms endorsed (0–22)', {
        min: 0,
        max: 22,
        defaultValue: 0,
        helpText: 'SCAT symptom evaluation lists 22 symptoms',
      }),
      numberInput('severity', 'Symptom severity sum (0–132)', {
        min: 0,
        max: 132,
        defaultValue: 0,
        helpText: 'Each of 22 symptoms rated 0–6',
      }),
    ],
    calculate(values) {
      const n = num(values.numSymptoms);
      const sev = num(values.severity);
      const r = riskFromThresholds(sev, [
        {
          max: 0,
          level: 'low',
          label: 'No symptom burden',
          interpretation: 'Severity 0 with no symptoms reported. Correlate with cognitive tests, balance, and clinical exam — asymptomatic does not always equal recovered.',
        },
        {
          max: 20,
          level: 'moderate',
          label: 'Mild symptom burden',
          interpretation: `Severity ${sev}/132 across ${n} symptoms — mild burden. Relative rest, graded activity, and serial SCAT symptom tracking.`,
        },
        {
          max: 50,
          level: 'high',
          label: 'Moderate symptom burden',
          interpretation: `Severity ${sev}/132 across ${n} symptoms — moderate burden. Structured concussion management; consider academic/work adjustments.`,
        },
        {
          max: 132,
          level: 'critical',
          label: 'High symptom burden',
          interpretation: `Severity ${sev}/132 across ${n} symptoms — high burden. Closer follow-up; red-flag screen (worsening headache, vomiting, focal neuro signs, prolonged LOC).`,
        },
      ]);
      return {
        score: sev,
        unit: '/132',
        ...r,
        details: [
          { label: 'Symptoms endorsed', value: `${n} / 22` },
          { label: 'Mean per endorsed (approx)', value: n > 0 ? String(round(sev / n, 1)) : '—' },
        ],
      };
    },
    evidence: {
      summary:
        'SCAT symptom evaluation: 22 symptoms each 0–6 (none → severe), yielding symptom count 0–22 and severity 0–132. Used in SCAT5/SCAT6 multimodal concussion tools.',
      formula: 'Enter clinician/athlete-administered totals',
      validation: 'Embedded in consensus sports concussion tools (Concussion in Sport Group); track change from baseline when available.',
      references: [
        {
          title: 'Sport concussion assessment tool (SCAT5 / SCAT6 consensus materials)',
          citation: 'Echemendia RJ et al. Br J Sports Med. 2017; SCAT6 updates 2023',
          year: 2017,
          pmid: '29098983',
          doi: '10.1136/bjsports-2016-097403',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Any concussion diagnosis',
        actions: [
          'Remove from play same day if concussion suspected',
          'Graduated return-to-learn then return-to-play',
          'Reassess if symptoms worsen',
        ],
      },
    ],
    pearls: [
      'Compare to individual baseline when available.',
      'Symptom scores are subjective — integrate with exam and cognitive testing.',
    ],
  },

  {
    id: 'concussion-return',
    name: 'Graduated Return-to-Play (Concussion)',
    shortName: 'RTP Stages',
    description: 'Six-stage graduated return-to-play framework after sport-related concussion (educational staging helper).',
    category: 'neurology',
    tags: ['concussion', 'return to play', 'rtp', 'sports', 'rehab'],
    whenToUse: 'Planning and documenting stepwise return to sport after concussion once return-to-learn is underway/stable.',
    whyUse: 'Standard consensus stages reduce premature full-contact return and symptom exacerbation.',
    inputs: [
      selectInput('stage', 'Current completed / proposed RTP stage', [
        { label: 'Stage 1 — Symptom-limited activity', value: 1 },
        { label: 'Stage 2 — Light aerobic exercise', value: 2 },
        { label: 'Stage 3 — Sport-specific exercise', value: 3 },
        { label: 'Stage 4 — Non-contact training drills', value: 4 },
        { label: 'Stage 5 — Full-contact practice', value: 5 },
        { label: 'Stage 6 — Return to sport / competition', value: 6 },
      ]),
      yesNo('symptomFreeRest', 'Asymptomatic at current stage (24 h minimum typically)'),
      yesNo('returnToLearn', 'Return-to-learn successful / school tolerance adequate'),
      yesNo('medicalClearance', 'Medical clearance documented for contact stages'),
    ],
    calculate(values) {
      const stage = num(values.stage, 1);
      const ok = bool(values.symptomFreeRest);
      const rtl = bool(values.returnToLearn);
      const clear = bool(values.medicalClearance);

      const stageDesc: Record<number, string> = {
        1: 'Daily activities that do not provoke symptoms; relative rest, limit screen/cognitive load as needed.',
        2: 'Walking or stationary cycling at slow–medium pace; no resistance training.',
        3: 'Running / skating drills; no head-impact activities.',
        4: 'Progression to more complex training; may start progressive resistance; still no contact.',
        5: 'Following medical clearance, participate in normal training activities including contact.',
        6: 'Normal game play if Stage 5 tolerated without return of symptoms.',
      };

      let riskLevel: 'low' | 'moderate' | 'high' | 'info' = 'info';
      let label = `Stage ${stage}`;
      let interpretation = `Currently at Stage ${stage}: ${stageDesc[stage]}. `;

      if (!rtl && stage >= 2) {
        riskLevel = 'moderate';
        interpretation += 'Return-to-learn not yet adequate — prioritize school/work tolerance before advancing sport intensity. ';
      }
      if (!ok) {
        riskLevel = 'high';
        label = `Stage ${stage} — do not advance`;
        interpretation += 'Symptoms present at this stage: remain at or step back to prior asymptomatic stage; allow ≥24 h and reassess.';
      } else if (stage >= 5 && !clear) {
        riskLevel = 'high';
        label = `Stage ${stage} — clearance missing`;
        interpretation += 'Contact stages require medical clearance. Do not proceed to full contact without documented clearance.';
      } else if (stage === 6 && ok && clear) {
        riskLevel = 'low';
        label = 'Stage 6 — competition if stable';
        interpretation += 'If Stage 5 was asymptomatic and clearance obtained, full return may be appropriate with ongoing monitoring.';
      } else {
        riskLevel = 'moderate';
        interpretation += 'If asymptomatic ≥24 h at this stage, may advance one stage. Each stage typically ≥24 h (longer if child/adolescent or high risk).';
      }

      return {
        score: stage,
        unit: 'stage',
        label,
        riskLevel,
        interpretation,
        details: [
          { label: 'Asymptomatic at stage', value: ok ? 'Yes' : 'No' },
          { label: 'Return-to-learn OK', value: rtl ? 'Yes' : 'No' },
          { label: 'Medical clearance', value: clear ? 'Yes' : 'No' },
          { label: 'Next stage', value: stage < 6 ? String(stage + 1) : 'Completed' },
        ],
      };
    },
    evidence: {
      summary:
        'Graduated RTP (Concussion in Sport Group): 6 stages from symptom-limited activity → light aerobic → sport-specific → non-contact training → full-contact practice (after clearance) → return to sport. Advance only if asymptomatic; typically ≥24 h per stage.',
      formula: 'Select stage + symptom/clearance gates',
      validation: 'Consensus framework (not a prognostic score); widely embedded in sports medicine protocols.',
      references: [
        {
          title: 'Consensus statement on concussion in sport',
          citation: 'McCrory P et al. Br J Sports Med. 2017; Patricios JS et al. 2023 updates',
          year: 2017,
          pmid: '28446457',
          doi: '10.1136/bjsports-2017-097699',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Symptoms return',
        actions: ['Drop to prior asymptomatic stage', 'Reassess for complicated recovery', 'Consider multidisciplinary clinic if prolonged'],
      },
    ],
    pearls: [
      'Same-day return to play is never appropriate if concussion is diagnosed/suspected.',
      'Children/adolescents often need longer progression.',
    ],
  },

  {
    id: '4at',
    name: '4AT Delirium Screen',
    shortName: '4AT',
    description: 'Rapid 4-item delirium detection tool (Alertness, AMT4, Attention, Acute change) scored 0–12.',
    category: 'neurology',
    tags: ['delirium', '4at', 'geriatrics', 'cam', 'icu'],
    whenToUse: 'Bedside screening for delirium in ED, wards, or older adults with acute illness.',
    whyUse: 'Brief, no special training beyond the tool; ≥4 suggests possible delirium requiring full assessment.',
    inputs: [
      selectInput('alertness', '1. Alertness', [
        { label: 'Normal / fully alert; mild sleepiness for <10 s after waking (0)', value: 0 },
        { label: 'Clearly abnormal (4)', value: 4 },
      ]),
      selectInput('amt4', '2. AMT4 (age, DOB, place, current year)', [
        { label: 'No mistakes (0)', value: 0 },
        { label: '1 mistake (1)', value: 1 },
        { label: '≥2 mistakes or untestable (2)', value: 2 },
      ]),
      selectInput('attention', '3. Attention — months of the year backwards', [
        { label: 'Achieves ≥7 months correctly (0)', value: 0 },
        { label: 'Starts but scores <7 months / refuses (1)', value: 1 },
        { label: 'Untestable — too unwell, drowsy, inattentive (2)', value: 2 },
      ]),
      selectInput('acute', '4. Acute change or fluctuating course', [
        { label: 'No (0)', value: 0 },
        { label: 'Yes (4)', value: 4 },
      ]),
    ],
    calculate(values) {
      const score = num(values.alertness) + num(values.amt4) + num(values.attention) + num(values.acute);
      const r = riskFromThresholds(score, [
        {
          max: 0,
          level: 'low',
          label: 'Delirium / significant CI unlikely',
          interpretation: '4AT 0: delirium or significant cognitive impairment unlikely on this screen — still recheck if clinical concern.',
        },
        {
          max: 3,
          level: 'moderate',
          label: 'Possible cognitive impairment',
          interpretation: `4AT ${score} (1–3): possible cognitive impairment — not specific for delirium. Review cognition, meds, infection, and trend.`,
        },
        {
          max: 12,
          level: 'high',
          label: 'Possible delirium ± cognitive impairment',
          interpretation: `4AT ${score} (≥4): possible delirium. Complete clinical assessment (CAM/DSM), search for precipitants, review high-risk meds, and ensure safety.`,
        },
      ]);
      return {
        score,
        unit: '/12',
        ...r,
        details: [{ label: 'Cutoff', value: '≥4 possible delirium; 1–3 possible CI; 0 unlikely' }],
      };
    },
    evidence: {
      summary:
        '4AT: Alertness (0/4), AMT4 (0–2), Attention months backwards (0–2), Acute change/fluctuation (0/4). Total 0–12. Score ≥4 suggests possible delirium.',
      formula: 'Sum of 4 items (0–12)',
      validation: 'Validated in multiple acute-care settings; recommended in several delirium pathways as a rapid screen.',
      references: [
        {
          title: '4AT assessment test for delirium',
          citation: 'Bellelli G et al. Age Ageing. 2014; www.the4at.com',
          year: 2014,
          pmid: '24799320',
          doi: '10.1007/s10753-014-9903-4',
        },
      ],
    },
    nextSteps: [
      {
        condition: '4AT ≥4',
        actions: [
          'Confirm with clinical diagnostic assessment',
          'Workup: infection, metabolic, hypoxia, urinary retention, meds',
          'Non-pharm delirium care; avoid benzos unless alcohol/benzo withdrawal',
        ],
      },
    ],
    pearls: [
      'Untestable items score points — severe drowsiness still flags risk.',
      'Does not replace CAM-ICU in ventilated ICU patients.',
    ],
  },

  {
    id: 'brief-confusion',
    name: 'bCAM Simplified (Brief Confusion Assessment)',
    shortName: 'bCAM',
    description:
      'Simplified Brief Confusion Assessment Method feature checklist for delirium (positive if Features 1+2 and 3 or 4).',
    category: 'neurology',
    tags: ['delirium', 'bcam', 'cam', 'confusion', 'ed'],
    whenToUse: 'ED or ward delirium assessment using bCAM/CAM feature logic after attention testing.',
    whyUse: 'Structured binary algorithm aligned with CAM: inattention + acute change plus either altered LOC or disorganized thinking.',
    inputs: [
      yesNo('f1', 'Feature 1 — Altered mental status OR fluctuating course'),
      yesNo('f2', 'Feature 2 — Inattention (e.g., months backwards / digit span errors)'),
      yesNo('f3', 'Feature 3 — Altered level of consciousness (RASS ≠ 0 or not alert)'),
      yesNo('f4', 'Feature 4 — Disorganized thinking (illogical answers / unclear flow)'),
    ],
    calculate(values) {
      const f1 = bool(values.f1);
      const f2 = bool(values.f2);
      const f3 = bool(values.f3);
      const f4 = bool(values.f4);
      const positive = f1 && f2 && (f3 || f4);
      const score = (f1 ? 1 : 0) + (f2 ? 1 : 0) + (f3 ? 1 : 0) + (f4 ? 1 : 0);

      if (positive) {
        return {
          score,
          label: 'bCAM positive — delirium likely',
          riskLevel: 'high' as const,
          interpretation:
            'Features 1 and 2 present with Feature 3 and/or 4 → bCAM/CAM-positive pattern. Treat as delirium until proven otherwise; identify and reverse precipitants.',
          details: [
            { label: 'F1 acute/fluctuating', value: f1 ? 'Yes' : 'No' },
            { label: 'F2 inattention', value: f2 ? 'Yes' : 'No' },
            { label: 'F3 altered LOC', value: f3 ? 'Yes' : 'No' },
            { label: 'F4 disorganized thinking', value: f4 ? 'Yes' : 'No' },
          ],
          recommendations: [
            'Medication review (anticholinergics, benzos, opioids)',
            'Infectious and metabolic workup',
            'Reorientation, sleep hygiene, early mobility',
          ],
        };
      }

      if (f1 && f2) {
        return {
          score,
          label: 'Incomplete pattern — not bCAM positive',
          riskLevel: 'moderate' as const,
          interpretation:
            'Acute change and inattention without altered LOC or disorganized thinking. Not algorithm-positive; still monitor closely and reassess.',
          details: [{ label: 'Features present', value: `${score} / 4` }],
        };
      }

      return {
        score,
        label: 'bCAM negative',
        riskLevel: 'low' as const,
        interpretation:
          'Does not meet bCAM positive algorithm (need F1+F2 and F3 or F4). Delirium not excluded if history incomplete — repeat assessments.',
        details: [{ label: 'Features present', value: `${score} / 4` }],
      };
    },
    evidence: {
      summary:
        'bCAM uses CAM diagnostic logic adapted for ED: Feature 1 (acute change/fluctuation), Feature 2 (inattention), Feature 3 (altered LOC), Feature 4 (disorganized thinking). Positive if 1+2 and (3 or 4).',
      formula: 'Positive = F1 AND F2 AND (F3 OR F4)',
      validation: 'Brief CAM validated in emergency department older adults for delirium detection.',
      references: [
        {
          title: 'Diagnosing delirium in older ED patients: validity of bCAM',
          citation: 'Han JH et al. Ann Emerg Med. 2013',
          year: 2013,
          pmid: '23916018',
          doi: '10.1016/j.annemergmed.2013.05.003',
        },
      ],
    },
    nextSteps: [
      { condition: 'Positive', actions: ['Diagnostic confirmation', 'Precipitant search', 'Safety / fall precautions'] },
      { condition: 'Negative but high concern', actions: ['Serial screening', 'Collateral history for fluctuation'] },
    ],
    pearls: [
      'Inattention is required — without it, algorithm is negative.',
      'Hyperactive and hypoactive delirium both count when features met.',
    ],
  },

  {
    id: 'ace-iii-total',
    name: 'ACE-III Total Score Interpreter',
    shortName: 'ACE-III',
    description: 'Addenbrooke’s Cognitive Examination-III total score interpreter (0–100).',
    category: 'neurology',
    tags: ['ace-iii', 'dementia', 'cognition', 'mci', 'screening'],
    whenToUse: 'When ACE-III has been administered and domain/total scores are available for interpretation.',
    whyUse: 'Broader than MMSE/MoCA alone; total cutoffs aid dementia vs MCI triage (education-dependent).',
    inputs: [
      numberInput('total', 'ACE-III total (0–100)', {
        min: 0,
        max: 100,
        defaultValue: 88,
        helpText: 'Attention 18 + Memory 26 + Fluency 14 + Language 26 + Visuospatial 16',
      }),
      numberInput('attention', 'Attention / Orientation (0–18, optional)', { min: 0, max: 18, defaultValue: 0 }),
      numberInput('memory', 'Memory (0–26, optional)', { min: 0, max: 26, defaultValue: 0 }),
      numberInput('fluency', 'Fluency (0–14, optional)', { min: 0, max: 14, defaultValue: 0 }),
      numberInput('language', 'Language (0–26, optional)', { min: 0, max: 26, defaultValue: 0 }),
      numberInput('visuospatial', 'Visuospatial (0–16, optional)', { min: 0, max: 16, defaultValue: 0 }),
    ],
    calculate(values) {
      const total = num(values.total, 88);
      const r = riskFromThresholds(total, [
        {
          max: 74,
          level: 'high',
          label: 'Below common dementia cutoffs',
          interpretation: `ACE-III ${total}/100: well below common screening cutoffs (often ≤82 or ≤88). High concern for significant cognitive impairment — full dementia workup.`,
        },
        {
          max: 82,
          level: 'high',
          label: '≤82 — common dementia screen positive',
          interpretation: `ACE-III ${total}/100: at/below widely cited cutoff ≤82 for dementia screening sensitivity. Pursue comprehensive assessment.`,
        },
        {
          max: 88,
          level: 'moderate',
          label: '83–88 — intermediate / alternate cutoff band',
          interpretation: `ACE-III ${total}/100: between common cutoffs (82 vs 88). May miss or catch early disease depending on education; correlate clinically and consider neuropsychology.`,
        },
        {
          max: 100,
          level: 'low',
          label: 'Above common cutoffs',
          interpretation: `ACE-III ${total}/100: above usual dementia screening cutoffs. Early/focal syndromes not excluded — interpret domains and function.`,
        },
      ]);
      return {
        score: total,
        unit: '/100',
        ...r,
        details: [
          { label: 'Common cutoffs', value: '≤82 (higher specificity) · ≤88 (higher sensitivity) — education matters' },
          {
            label: 'Domains entered',
            value: `A${num(values.attention)} M${num(values.memory)} F${num(values.fluency)} L${num(values.language)} V${num(values.visuospatial)}`,
          },
        ],
      };
    },
    evidence: {
      summary:
        'ACE-III totals 0–100 across five domains. Published dementia cutoffs often 82 and 88 (trade-off specificity/sensitivity); adjust for education and premorbid function.',
      formula: 'Enter total 0–100 (± optional domains)',
      validation: 'Successor to ACE-R; validated against dementia and differential profiles (AD vs FTD patterns in domains).',
      references: [
        {
          title: 'Validation of the Addenbrooke’s Cognitive Examination III',
          citation: 'Hsieh S et al. Dement Geriatr Cogn Disord. 2013',
          year: 2013,
          pmid: '23949210',
          doi: '10.1159/000351671',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Total ≤88 or clinical concern',
        actions: ['Labs (B12, TSH, etc.)', 'Imaging as indicated', 'Functional assessment', 'Specialty cognitive clinic'],
      },
    ],
    pearls: [
      'Domain pattern can suggest AD (memory) vs FTD (fluency/language) tendencies — not diagnostic alone.',
      'Use official ACE-III materials for administration.',
    ],
  },

  {
    id: 'iqcode',
    name: 'IQCODE (Informant Cognitive Decline)',
    shortName: 'IQCODE',
    description:
      'Informant Questionnaire on Cognitive Decline in the Elderly — enter average item score (1–5).',
    category: 'neurology',
    tags: ['iqcode', 'dementia', 'informant', 'screening', 'geriatrics'],
    whenToUse: 'When an informant rates change in cognition over ~10 years and average IQCODE is available.',
    whyUse: 'Useful when patient testing is limited; captures longitudinal decline better than a single cross-sectional screen.',
    inputs: [
      numberInput('average', 'IQCODE average score (1.0–5.0)', {
        min: 1,
        max: 5,
        step: 0.1,
        defaultValue: 3.0,
        helpText: 'Mean of items (short 16-item or full 26-item); 3 = no change',
      }),
      selectInput('form', 'Form used', [
        { label: 'Short IQCODE (16 items)', value: 'short' },
        { label: 'Full IQCODE (26 items)', value: 'full' },
        { label: 'Not specified', value: 'na' },
      ]),
    ],
    calculate(values) {
      const avg = num(values.average, 3);
      const r = riskFromThresholds(avg, [
        {
          max: 3.0,
          level: 'low',
          label: 'No informant-reported decline',
          interpretation: `IQCODE average ${avg}: at or below “no change” anchor (3.0). Significant decline less likely by informant report — still correlate with exam.`,
        },
        {
          max: 3.3,
          level: 'moderate',
          label: 'Borderline / mild change',
          interpretation: `IQCODE ${avg}: mild elevation. Below many dementia cutoffs (~3.3–3.4+) but may reflect early change — follow and test patient directly.`,
        },
        {
          max: 3.6,
          level: 'high',
          label: 'Screen positive range (common cutoffs)',
          interpretation: `IQCODE ${avg}: at/above common cutoffs (often ≥3.3 or ≥3.44) suggesting cognitive decline — pursue dementia evaluation.`,
        },
        {
          max: 5.0,
          level: 'critical',
          label: 'Marked informant-reported decline',
          interpretation: `IQCODE ${avg}: substantial reported decline across everyday cognitive tasks. High likelihood of major cognitive disorder — comprehensive workup and safety planning.`,
        },
      ]);
      return {
        score: round(avg, 2),
        unit: 'avg',
        ...r,
        details: [
          { label: 'Scale', value: '1 much improved · 3 no change · 5 much worse' },
          { label: 'Form', value: String(values.form ?? 'na') },
          { label: 'Common cutoffs', value: '≥3.3 to ≥3.44 (setting-dependent)' },
        ],
      };
    },
    evidence: {
      summary:
        'IQCODE: informant rates change over 10 years on everyday cognitive items (1–5). Average ≥~3.3–3.44 often used to screen for dementia; short 16-item form widely used.',
      formula: 'Mean of item scores (enter average)',
      validation: 'Extensively validated informant tool across cultures and care settings.',
      references: [
        {
          title: 'The Informant Questionnaire on Cognitive Decline in the Elderly (IQCODE)',
          citation: 'Jorm AF. Int Psychogeriatr. 2004; original work 1989–1994',
          year: 2004,
          pmid: '15559753',
          doi: '10.1017/s1041610204000390',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Average ≥3.3',
        actions: ['Cognitive testing (MoCA/ACE-III)', 'Labs/imaging as indicated', 'Driver/safety assessment', 'Caregiver support'],
      },
    ],
    pearls: [
      'Requires a reliable informant who knows the patient over years.',
      'Depression and sensory impairment can bias ratings.',
    ],
  },

  {
    id: 'ad8',
    name: 'AD8 Dementia Screening Interview',
    shortName: 'AD8',
    description: 'Eight-item informant (or patient) yes/no screen for cognitive change; score 0–8.',
    category: 'neurology',
    tags: ['ad8', 'dementia', 'screening', 'alzheimer', 'geriatrics'],
    whenToUse: 'Brief dementia screen in primary care, neurology, or geriatrics using informant-preferred AD8.',
    whyUse: 'Two or more “yes” responses suggest cognitive impairment warranting further evaluation.',
    inputs: [
      yesNo('q1', 'Problems with judgment (e.g., bad financial decisions, odd gifts)'),
      yesNo('q2', 'Reduced interest in hobbies/activities'),
      yesNo('q3', 'Repeats questions, stories, or statements'),
      yesNo('q4', 'Trouble learning how to use a tool, appliance, or gadget'),
      yesNo('q5', 'Forgets correct month or year'),
      yesNo('q6', 'Difficulty handling complicated financial affairs'),
      yesNo('q7', 'Difficulty remembering appointments'),
      yesNo('q8', 'Consistent problems with thinking and/or memory'),
    ],
    calculate(values) {
      const keys = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8'];
      const score = keys.reduce((s, k) => s + (bool(values[k]) ? 1 : 0), 0);
      const r = riskFromThresholds(score, [
        {
          max: 1,
          level: 'low',
          label: 'Screen negative',
          interpretation: `AD8 ${score}/8: below cutoff (≥2). Cognitive impairment less likely by this screen — reassess if function declining.`,
        },
        {
          max: 8,
          level: 'high',
          label: 'Screen positive',
          interpretation: `AD8 ${score}/8 (≥2): positive screen for cognitive impairment. Perform fuller cognitive testing and dementia workup as appropriate.`,
        },
      ]);
      return {
        score,
        unit: '/8',
        ...r,
        details: [{ label: 'Cutoff', value: '≥2 yes = positive' }],
      };
    },
    evidence: {
      summary:
        'AD8: 8 yes/no items about change in cognition/function. Score ≥2 indicates the need for further assessment. Informant version preferred; patient self-report less sensitive.',
      formula: 'Count of “yes” items (0–8)',
      validation: 'Developed at Washington University; validated against CDR and clinical dementia diagnosis.',
      references: [
        {
          title: 'The AD8: a brief informant interview to detect dementia',
          citation: 'Galvin JE et al. Neurology. 2005',
          year: 2005,
          pmid: '16116116',
          doi: '10.1212/01.wnl.0000172958.95282.2a',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'AD8 ≥2',
        actions: ['MoCA/MMSE/ACE-III', 'B12/TSH/metabolic panel', 'Med review', 'Consider imaging and specialty referral'],
      },
    ],
    pearls: [
      'Ask about change from prior level, not lifelong traits.',
      'Informant AD8 outperforms patient self-rating in many studies.',
    ],
  },

  {
    id: 'gds-15',
    name: 'Geriatric Depression Scale (GDS-15)',
    shortName: 'GDS-15',
    description: '15-item Geriatric Depression Scale total interpreter (0–15).',
    category: 'psychiatry',
    tags: ['gds', 'depression', 'geriatrics', 'screening'],
    whenToUse: 'Depression screening in older adults when GDS-15 total is available.',
    whyUse: 'Yes/no format well tolerated in elderly; validated cutoffs for mild to severe depression ranges.',
    inputs: [
      numberInput('score', 'GDS-15 total (0–15)', {
        min: 0,
        max: 15,
        defaultValue: 4,
        helpText: 'Sum of 15 yes/no items (scoring keys differ by item direction)',
      }),
    ],
    calculate(values) {
      const score = num(values.score, 4);
      const r = riskFromThresholds(score, [
        {
          max: 4,
          level: 'low',
          label: 'Normal range',
          interpretation: 'GDS-15 0–4: normal range — depression less likely; reassess if clinical concern or functional decline.',
        },
        {
          max: 8,
          level: 'moderate',
          label: 'Mild depression range',
          interpretation: 'GDS-15 5–8: suggestive of mild depression — clinical interview, supports, consider therapy and medical contributors.',
        },
        {
          max: 11,
          level: 'high',
          label: 'Moderate depression range',
          interpretation: 'GDS-15 9–11: moderate depression range — structured assessment, safety screen, treat contributing illness, consider pharmacotherapy/psychotherapy.',
        },
        {
          max: 15,
          level: 'critical',
          label: 'Severe depression range',
          interpretation: 'GDS-15 12–15: severe range — urgent comprehensive evaluation, suicide risk assessment, and treatment planning.',
        },
      ]);
      return {
        score,
        unit: '/15',
        ...r,
        details: [{ label: 'Bands', value: '0–4 normal · 5–8 mild · 9–11 moderate · 12–15 severe' }],
      };
    },
    evidence: {
      summary:
        'GDS-15 scores 0–15. Common bands: 0–4 normal, 5–8 mild, 9–11 moderate, 12–15 severe. Cutoff ≥5 often used for further evaluation.',
      formula: 'Enter total 0–15',
      validation: 'Short form of Yesavage GDS; widely validated in community and medical elderly populations.',
      references: [
        {
          title: 'Development and validation of a geriatric depression screening scale',
          citation: 'Yesavage JA et al. J Psychiatr Res. 1982–83; GDS-15 short form literature',
          year: 1982,
          pmid: '7183759',
          doi: '10.1016/0022-3956(82)90033-4',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Score ≥5',
        actions: ['Diagnostic interview for depression', 'PHQ-9 optional complement', 'Suicide risk screen', 'Review meds and medical illness'],
      },
    ],
    pearls: [
      'Less somatically loaded than some depression scales — helpful in medically ill elderly.',
      'Not a substitute for full diagnostic assessment.',
    ],
  },

  {
    id: 'cornell-dementia',
    name: 'Cornell Scale for Depression in Dementia',
    shortName: 'CSDD',
    description: 'Cornell Scale total interpreter for depression in patients with dementia (0–38).',
    category: 'psychiatry',
    tags: ['cornell', 'depression', 'dementia', 'csdd', 'geriatrics'],
    whenToUse: 'When depression is suspected in someone with cognitive impairment and CSDD has been rated.',
    whyUse: 'Uses caregiver + clinician observations; better suited than self-report PHQ when insight/memory is limited.',
    inputs: [
      numberInput('score', 'Cornell total (0–38)', {
        min: 0,
        max: 38,
        defaultValue: 6,
        helpText: '19 items rated 0–2 (absent / mild-intermittent / severe)',
      }),
    ],
    calculate(values) {
      const score = num(values.score, 6);
      const r = riskFromThresholds(score, [
        {
          max: 5,
          level: 'low',
          label: 'Below common depression cutoff',
          interpretation: 'CSDD ≤5: below many screening cutoffs for depression in dementia — monitor and revisit if symptoms evolve.',
        },
        {
          max: 7,
          level: 'moderate',
          label: 'Borderline / possible depression',
          interpretation: 'CSDD 6–7: around provisional cutoffs used in some studies — clinical judgment for treatment trial vs watchful waiting.',
        },
        {
          max: 11,
          level: 'high',
          label: 'Probable depression',
          interpretation: 'CSDD ≥8 (common cutoff): suggests significant depressive symptoms in dementia — evaluate safety, environment, pain, and treatment options.',
        },
        {
          max: 38,
          level: 'critical',
          label: 'High / severe symptom burden',
          interpretation: 'CSDD ≥12 often associated with major depression severity band — prioritize comprehensive psychogeriatric management and suicide/agitation risk.',
        },
      ]);
      return {
        score,
        unit: '/38',
        ...r,
        details: [{ label: 'Common cutoffs', value: '≥6–8 depression; ≥12 more severe / major' }],
      };
    },
    evidence: {
      summary:
        'Cornell Scale for Depression in Dementia: 19 items (0–2) totaling 0–38 based on caregiver interview and clinician signs. Cutoffs around ≥6–8 suggest depression; higher scores indicate greater severity.',
      formula: 'Enter total 0–38',
      validation: 'Standard instrument for depression comorbid with dementia in research and specialty clinics.',
      references: [
        {
          title: 'Cornell Scale for Depression in Dementia',
          citation: 'Alexopoulos GS et al. Biol Psychiatry. 1988',
          year: 1988,
          pmid: '3337862',
          doi: '10.1016/0006-3223(88)90038-8',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Score ≥8',
        actions: [
          'Rule out delirium, pain, constipation, meds',
          'Non-pharm interventions first-line when possible',
          'Consider antidepressant with dementia-appropriate cautions',
          'Caregiver support',
        ],
      },
    ],
    pearls: [
      'Rate based on the prior week; use both informant and brief patient interview.',
      'Overlaps with apathy — careful differential.',
    ],
  },

  {
    id: 'zarit-burden',
    name: 'Zarit Caregiver Burden (Short Total)',
    shortName: 'Zarit',
    description: 'Zarit Burden Interview total interpreter — enter 12-item short form (0–48) or classic 22-item (0–88).',
    category: 'psychiatry',
    tags: ['zarit', 'caregiver', 'burden', 'dementia', 'support'],
    whenToUse: 'Assessing caregiver strain in dementia or chronic neurologic illness after administering a Zarit form.',
    whyUse: 'Quantifies burden to trigger support services, respite, and depression screening of caregivers.',
    inputs: [
      selectInput('form', 'Form', [
        { label: 'ZBI-12 short (0–48)', value: 'z12' },
        { label: 'ZBI-22 (0–88)', value: 'z22' },
      ]),
      numberInput('score', 'Total score', {
        min: 0,
        max: 88,
        defaultValue: 10,
        helpText: 'Each item 0–4 (never → nearly always)',
      }),
    ],
    calculate(values) {
      const form = String(values.form ?? 'z12');
      const score = num(values.score, 10);

      if (form === 'z22') {
        const r = riskFromThresholds(score, [
          {
            max: 20,
            level: 'low',
            label: 'Little or no burden',
            interpretation: 'ZBI-22 0–20: little or no burden — offer education and preventive supports.',
          },
          {
            max: 40,
            level: 'moderate',
            label: 'Mild to moderate burden',
            interpretation: 'ZBI-22 21–40: mild–moderate burden — counseling, skills training, community resources.',
          },
          {
            max: 60,
            level: 'high',
            label: 'Moderate to severe burden',
            interpretation: 'ZBI-22 41–60: moderate–severe burden — respite, multicomponent caregiver interventions, screen caregiver depression.',
          },
          {
            max: 88,
            level: 'critical',
            label: 'Severe burden',
            interpretation: 'ZBI-22 61–88: severe burden — urgent support planning, safety for patient/caregiver, mental health referral.',
          },
        ]);
        return {
          score,
          unit: '/88',
          ...r,
          details: [{ label: 'Form', value: 'ZBI-22' }],
        };
      }

      // ZBI-12: ≥17 often high burden
      const r = riskFromThresholds(score, [
        {
          max: 9,
          level: 'low',
          label: 'Lower burden',
          interpretation: 'ZBI-12 in a lower range — continue routine caregiver education.',
        },
        {
          max: 16,
          level: 'moderate',
          label: 'Intermediate burden',
          interpretation: 'ZBI-12 intermediate — proactive supports and stress-reduction resources recommended.',
        },
        {
          max: 48,
          level: 'high',
          label: 'High burden (common cutoff ≥17)',
          interpretation: 'ZBI-12 ≥17 suggests high caregiver burden in many studies — arrange respite, social work, and caregiver mental health screen.',
        },
      ]);
      return {
        score,
        unit: '/48',
        ...r,
        details: [
          { label: 'Form', value: 'ZBI-12 short' },
          { label: 'Common high-burden cutoff', value: '≥17' },
        ],
      };
    },
    evidence: {
      summary:
        'Zarit Burden Interview items 0–4. ZBI-22 bands often 0–20 little/none, 21–40 mild–moderate, 41–60 moderate–severe, 61–88 severe. ZBI-12 short form commonly uses ≥17 for high burden.',
      formula: 'Enter total for selected form',
      validation: 'Gold-standard caregiver burden measure with multiple validated short forms.',
      references: [
        {
          title: 'Relatives of the impaired elderly: correlates of feelings of burden (Zarit)',
          citation: 'Zarit SH et al. Gerontologist. 1980; short-form validations later',
          year: 1980,
          pmid: '7203086',
          doi: '10.1093/geront/20.6.649',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'High burden',
        actions: [
          'Social work / caregiver support programs',
          'Respite and adult day services',
          'Screen caregiver for depression/anxiety',
          'Advance care planning discussion',
        ],
      },
    ],
    pearls: [
      'High burden predicts institutionalization and caregiver illness.',
      'Reassess after service changes or disease progression.',
    ],
  },

  {
    id: 'psqi',
    name: 'PSQI Global Score (Pittsburgh Sleep Quality)',
    shortName: 'PSQI',
    description: 'Pittsburgh Sleep Quality Index global score interpreter (0–21).',
    category: 'neurology',
    tags: ['psqi', 'sleep', 'insomnia', 'quality'],
    whenToUse: 'When PSQI has been scored and global sleep quality needs interpretation.',
    whyUse: 'Standard research/clinical metric of past-month sleep quality; global >5 indicates poor sleep.',
    inputs: [
      numberInput('global', 'PSQI global score (0–21)', {
        min: 0,
        max: 21,
        defaultValue: 5,
        helpText: 'Sum of 7 component scores (0–3 each)',
      }),
    ],
    calculate(values) {
      const score = num(values.global, 5);
      const r = riskFromThresholds(score, [
        {
          max: 5,
          level: 'low',
          label: 'Good sleep quality range',
          interpretation: 'PSQI ≤5: generally classified as good sleep quality. Address residual symptoms if patient still symptomatic.',
        },
        {
          max: 10,
          level: 'moderate',
          label: 'Poor sleep quality',
          interpretation: 'PSQI 6–10: poor sleep quality — evaluate hygiene, insomnia disorder, mood, OSA risk, and substances.',
        },
        {
          max: 21,
          level: 'high',
          label: 'Markedly poor sleep quality',
          interpretation: 'PSQI ≥11: markedly impaired sleep quality — comprehensive sleep evaluation; consider CBT-I referral and comorbidity workup.',
        },
      ]);
      return {
        score,
        unit: '/21',
        ...r,
        details: [
          { label: 'Components', value: 'Quality, latency, duration, efficiency, disturbance, meds, daytime dysfunction' },
          { label: 'Classic cutoff', value: '>5 = poor sleeper' },
        ],
      };
    },
    evidence: {
      summary:
        'PSQI global score sums 7 components (0–3 each) over the past month, range 0–21. Global score >5 distinguishes poor from good sleepers in original validation.',
      formula: 'Enter global 0–21',
      validation: 'Buysse et al. widely replicated; used across medical and psychiatric populations.',
      references: [
        {
          title: 'The Pittsburgh Sleep Quality Index: a new instrument for psychiatric practice and research',
          citation: 'Buysse DJ et al. Psychiatry Res. 1989',
          year: 1989,
          pmid: '2748771',
          doi: '10.1016/0165-1781(89)90047-4',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'PSQI >5',
        actions: [
          'Sleep diary / history',
          'Screen OSA (STOP-BANG) and restless legs',
          'CBT-I for chronic insomnia',
          'Review caffeine, alcohol, stimulating meds',
        ],
      },
    ],
    pearls: [
      'Global score alone loses component detail useful for targeting therapy.',
      'Not a substitute for polysomnography when OSA/PLMD suspected.',
    ],
  },

  {
    id: 'restless-irlssg',
    name: 'IRLS (Restless Legs Severity)',
    shortName: 'IRLS',
    description: 'International Restless Legs Syndrome Study Group rating scale total (0–40).',
    category: 'neurology',
    tags: ['rls', 'irls', 'restless legs', 'sleep', 'severity'],
    whenToUse: 'Quantify RLS symptom severity after clinical diagnosis of restless legs syndrome.',
    whyUse: 'Standard 10-item severity scale for baseline and treatment response.',
    inputs: [
      numberInput('score', 'IRLS total (0–40)', {
        min: 0,
        max: 40,
        defaultValue: 15,
        helpText: '10 items × 0–4',
      }),
    ],
    calculate(values) {
      const score = num(values.score, 15);
      const r = riskFromThresholds(score, [
        {
          max: 10,
          level: 'low',
          label: 'Mild',
          interpretation: 'IRLS 1–10 (or 0): mild severity — non-pharm measures, check ferritin, sleep hygiene.',
        },
        {
          max: 20,
          level: 'moderate',
          label: 'Moderate',
          interpretation: 'IRLS 11–20: moderate RLS — consider iron repletion if ferritin low; pharmacologic therapy if QOL impaired.',
        },
        {
          max: 30,
          level: 'high',
          label: 'Severe',
          interpretation: 'IRLS 21–30: severe — active treatment usually indicated; avoid exacerbating meds (many antihistamines, antipsychotics, antiemetics).',
        },
        {
          max: 40,
          level: 'critical',
          label: 'Very severe',
          interpretation: 'IRLS 31–40: very severe — specialty management, review augmentation if on dopaminergic therapy.',
        },
      ]);
      return {
        score,
        unit: '/40',
        ...r,
        details: [{ label: 'Bands', value: 'Mild 1–10 · Moderate 11–20 · Severe 21–30 · Very severe 31–40' }],
      };
    },
    evidence: {
      summary:
        'IRLS (IRLS-S): 10 questions scored 0–4 (total 0–40). Severity: mild 1–10, moderate 11–20, severe 21–30, very severe 31–40.',
      formula: 'Enter total 0–40',
      validation: 'IRLS Study Group validated scale for clinical trials and practice.',
      references: [
        {
          title: 'Validation of the International Restless Legs Syndrome Study Group rating scale',
          citation: 'Walters AS et al. Sleep Med. 2003',
          year: 2003,
          pmid: '14592344',
          doi: '10.1016/s1389-9457(03)00006-6',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Any clinically significant RLS',
        actions: [
          'Serum ferritin (often treat if <50–75 µg/L per guidelines/context)',
          'Reduce triggers (alcohol, antihistamines)',
          'Alpha-2-delta ligands or other agents per severity and comorbidities',
        ],
      },
    ],
    pearls: [
      'Diagnose RLS clinically (urge to move, rest, evening, relieved by movement) before scoring severity.',
      'Watch for augmentation on chronic dopaminergic therapy.',
    ],
  },

  {
    id: 'pc-ptsd',
    name: 'PC-PTSD-5 Screen',
    shortName: 'PC-PTSD-5',
    description: 'Primary Care PTSD Screen for DSM-5 — 5 yes/no items (0–5).',
    category: 'psychiatry',
    tags: ['ptsd', 'pc-ptsd', 'trauma', 'screening', 'primary care'],
    whenToUse: 'Primary care or general medical screening when lifetime traumatic event exposure is endorsed.',
    whyUse: 'Ultra-brief DSM-5 PTSD screen; ≥3 positive items suggests further PTSD assessment.',
    inputs: [
      yesNo('trauma', 'Lifetime trauma exposure criterion (// required before scoring symptoms)'),
      yesNo('q1', '1. Nightmares or unwanted thoughts of the event(s)'),
      yesNo('q2', '2. Tried hard not to think about it or avoided situations that remind you'),
      yesNo('q3', '3. Been constantly on guard, watchful, or easily startled'),
      yesNo('q4', '4. Felt numb or detached from people, activities, or surroundings'),
      yesNo('q5', '5. Felt guilty or unable to stop blaming yourself or others'),
    ],
    calculate(values) {
      const trauma = bool(values.trauma);
      const score =
        (bool(values.q1) ? 1 : 0) +
        (bool(values.q2) ? 1 : 0) +
        (bool(values.q3) ? 1 : 0) +
        (bool(values.q4) ? 1 : 0) +
        (bool(values.q5) ? 1 : 0);

      if (!trauma) {
        return {
          score: 0,
          label: 'No trauma exposure — screen not applicable',
          riskLevel: 'info' as const,
          interpretation:
            'PC-PTSD-5 symptom items are only scored after a positive trauma gate. If trauma history is unclear, take a careful trauma history first.',
          details: [{ label: 'Symptom items', value: 'Not scored' }],
        };
      }

      const r = riskFromThresholds(score, [
        {
          max: 2,
          level: 'low',
          label: 'Screen negative',
          interpretation: `PC-PTSD-5 ${score}/5: below common cutoff (≥3). PTSD less likely, but residual symptoms may still need support if impairing.`,
        },
        {
          max: 5,
          level: 'high',
          label: 'Screen positive',
          interpretation: `PC-PTSD-5 ${score}/5 (≥3): positive screen — perform diagnostic assessment (e.g., PCL-5, CAPS-5), safety evaluation, and consider trauma-focused care.`,
        },
      ]);
      return {
        score,
        unit: '/5',
        ...r,
        details: [{ label: 'Cutoff', value: '≥3 positive (with trauma exposure)' }],
      };
    },
    evidence: {
      summary:
        'PC-PTSD-5: after trauma exposure gate, 5 yes/no DSM-5 symptom items. Score ≥3 is the usual primary-care positive screen threshold.',
      formula: 'Count of yes answers among 5 items (0–5)',
      validation: 'National Center for PTSD primary care screen; validated against CAPS-5.',
      references: [
        {
          title: 'The Primary Care PTSD Screen for DSM-5 (PC-PTSD-5)',
          citation: 'Prins A et al. J Gen Intern Med. 2016; NCPTSD',
          year: 2016,
          pmid: '26861976',
          doi: '10.1007/s10103-016-1872-4',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Score ≥3',
        actions: [
          'PCL-5 or structured diagnostic interview',
          'Suicide and safety assessment',
          'Trauma-focused psychotherapy referral',
          'Screen substance use and depression',
        ],
      },
    ],
    pearls: [
      'Do not score symptoms without trauma exposure.',
      'Cutoff ≥4 increases specificity in some settings.',
    ],
  },

  {
    id: 'ciwa-b',
    name: 'CIWA-B (Benzodiazepine Withdrawal) Simplified',
    shortName: 'CIWA-B',
    description:
      'Simplified CIWA-B total entry for benzodiazepine withdrawal severity (educational bands; full scale is multi-item).',
    category: 'psychiatry',
    tags: ['ciwa-b', 'benzodiazepine', 'withdrawal', 'detox'],
    whenToUse: 'Monitoring benzodiazepine withdrawal severity when a CIWA-B (or local benzo-withdrawal) total is charted.',
    whyUse: 'Provides structured severity bands analogous to alcohol CIWA for taper/monitoring decisions — not a substitute for the full instrument item list.',
    inputs: [
      numberInput('score', 'CIWA-B total (0–80 typical full scale range)', {
        min: 0,
        max: 80,
        defaultValue: 10,
        helpText: 'Enter scored total from institutional CIWA-B form',
      }),
      yesNo('seizureHx', 'History of withdrawal seizures'),
      yesNo('highDose', 'High-dose or prolonged benzodiazepine use'),
      yesNo('concurrentAlcohol', 'Concurrent alcohol use disorder'),
    ],
    calculate(values) {
      const score = num(values.score, 10);
      const highRiskContext =
        bool(values.seizureHx) || bool(values.highDose) || bool(values.concurrentAlcohol);

      const r = riskFromThresholds(score, [
        {
          max: 20,
          level: 'low',
          label: 'Mild withdrawal range',
          interpretation: `CIWA-B total ${score}: mild range on common institutional bands. Supportive care and planned gradual taper; increase monitoring if high-risk context.`,
        },
        {
          max: 40,
          level: 'moderate',
          label: 'Moderate withdrawal',
          interpretation: `CIWA-B ${score}: moderate symptoms — slow taper, consider symptom-triggered or fixed-dose stabilization per protocol, vitals and fall precautions.`,
        },
        {
          max: 60,
          level: 'high',
          label: 'Severe withdrawal',
          interpretation: `CIWA-B ${score}: severe — medical monitoring, specialist input, do not abrupt-stop long-acting/high-dose benzos.`,
        },
        {
          max: 80,
          level: 'critical',
          label: 'Very severe withdrawal',
          interpretation: `CIWA-B ${score}: very severe — inpatient-level care; rule out other causes (alcohol withdrawal, medical illness, serotonin toxicity).`,
        },
      ]);

      return {
        score,
        ...r,
        riskLevel: highRiskContext && score > 20 ? (score > 40 ? 'critical' : 'high') : r.riskLevel,
        interpretation:
          r.interpretation +
          (highRiskContext
            ? ' High-risk context (seizures / high dose / alcohol) — lower threshold for admission and seizure precautions.'
            : ''),
        details: [
          { label: 'High-risk context', value: highRiskContext ? 'Yes' : 'No' },
          { label: 'Note', value: 'Bands are pragmatic; follow local CIWA-B protocol cutoffs' },
        ],
      };
    },
    evidence: {
      summary:
        'CIWA-B rates benzodiazepine withdrawal across multiple symptom domains (full instrument totals often up to ~80). This calculator interprets an entered total with educational severity bands and risk modifiers.',
      formula: 'Enter institutional CIWA-B total',
      validation:
        'CIWA-B described for benzo withdrawal monitoring; local protocols vary. Prefer validated full item administration over total-only estimation.',
      references: [
        {
          title: 'Assessment of benzodiazepine dependence and withdrawal (CIWA-B related literature)',
          citation: 'Busto UE et al. J Clin Psychopharmacol. 1989; institutional CIWA-B forms',
          year: 1989,
          pmid: '2574193',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Moderate–severe or high-risk context',
        actions: [
          'Do not abrupt discontinue',
          'Long-acting benzo stabilization / slow taper',
          'Seizure precautions as indicated',
          'Screen concurrent alcohol/opioid withdrawal',
        ],
      },
    ],
    pearls: [
      'Benzodiazepine withdrawal can be delayed and prolonged vs alcohol.',
      'Proportional taper over weeks–months often needed for chronic users.',
    ],
  },

  {
    id: 'ort',
    name: 'Opioid Risk Tool (ORT)',
    shortName: 'ORT',
    description: 'Opioid Risk Tool for future aberrant opioid use risk before chronic opioid therapy (sex-specific scoring).',
    category: 'psychiatry',
    tags: ['ort', 'opioid', 'risk', 'pain', 'substance'],
    whenToUse: 'Before initiating chronic opioid therapy for non-cancer pain to stratify misuse risk.',
    whyUse: 'Brief weighted checklist; low / moderate / high risk bands guide monitoring intensity (not a ban on treatment).',
    inputs: [
      selectInput('sex', 'Patient sex (scoring differs)', [
        { label: 'Female', value: 'f' },
        { label: 'Male', value: 'm' },
      ]),
      yesNo('fhAlcohol', 'Family history: alcohol abuse'),
      yesNo('fhIllegal', 'Family history: illegal drug abuse'),
      yesNo('fhRx', 'Family history: prescription drug abuse'),
      yesNo('phAlcohol', 'Personal history: alcohol abuse'),
      yesNo('phIllegal', 'Personal history: illegal drug abuse'),
      yesNo('phRx', 'Personal history: prescription drug abuse'),
      yesNo('age', 'Age 16–45 years'),
      yesNo('sexualAbuse', 'History of preadolescent sexual abuse'),
      yesNo('psychAdd', 'Psychiatric history: ADHD, OCD, bipolar, or schizophrenia'),
      yesNo('psychDep', 'Psychiatric history: depression'),
    ],
    calculate(values) {
      const female = String(values.sex ?? 'f') === 'f';
      let score = 0;
      // Family history
      if (bool(values.fhAlcohol)) score += female ? 1 : 3;
      if (bool(values.fhIllegal)) score += female ? 2 : 3;
      if (bool(values.fhRx)) score += female ? 4 : 4;
      // Personal history
      if (bool(values.phAlcohol)) score += female ? 3 : 3;
      if (bool(values.phIllegal)) score += female ? 4 : 4;
      if (bool(values.phRx)) score += female ? 5 : 5;
      // Age
      if (bool(values.age)) score += 1;
      // Preadolescent sexual abuse
      if (bool(values.sexualAbuse)) score += female ? 3 : 0;
      // Psychiatric disease
      if (bool(values.psychAdd)) score += 2;
      if (bool(values.psychDep)) score += 1;

      const r = riskFromThresholds(score, [
        {
          max: 3,
          level: 'low',
          label: 'Low risk',
          interpretation: `ORT ${score}: low risk band for future aberrant opioid use. Standard precautions still apply (PDMP, informed consent, urine drug testing as appropriate).`,
        },
        {
          max: 7,
          level: 'moderate',
          label: 'Moderate risk',
          interpretation: `ORT ${score}: moderate risk — enhanced monitoring, shorter prescriptions, clear functional goals, consider non-opioid alternatives.`,
        },
        {
          max: 24,
          level: 'high',
          label: 'High risk',
          interpretation: `ORT ${score}: high risk for aberrant behaviors. Prefer non-opioid strategies; if opioids unavoidable, specialist co-management, tight monitoring, and naloxone.`,
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'Sex weighting', value: female ? 'Female' : 'Male' },
          { label: 'Bands', value: 'Low 0–3 · Moderate 4–7 · High ≥8' },
        ],
        recommendations: [
          'Check PDMP',
          'Opioid treatment agreement when initiating chronic therapy',
          'Naloxone for higher-risk patients',
          'Avoid concurrent benzos when possible',
        ],
      };
    },
    evidence: {
      summary:
        'ORT assigns sex-specific points for family/personal substance history, age 16–45, preadolescent sexual abuse (female), and psychiatric disease. Low 0–3, moderate 4–7, high ≥8.',
      formula: 'Weighted sum (sex-specific)',
      validation: 'Webster & Webster clinical tool; subsequent studies show variable predictive performance — use as one part of risk assessment.',
      references: [
        {
          title: 'Predicting aberrant behaviors in opioid-treated patients: preliminary validation of the ORT',
          citation: 'Webster LR, Webster RM. Pain Med. 2005',
          year: 2005,
          pmid: '16336480',
          doi: '10.1111/j.1526-4637.2005.00072.x',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Moderate–high risk',
        actions: [
          'Maximize non-opioid multimodal care',
          'If prescribing: small quantities, frequent visits, UDS',
          'Addiction medicine / pain specialist referral as needed',
        ],
      },
    ],
    pearls: [
      'Self-report tool — underreporting possible.',
      'High ORT is not an absolute contraindication but demands safeguards.',
    ],
  },
];
