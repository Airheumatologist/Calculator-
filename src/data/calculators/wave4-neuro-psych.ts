import type { Calculator } from '../../types/calculator';
import { num, bool, str, round, yesNo, selectInput, numberInput, riskFromThresholds, isMissingValue } from '../../utils/helpers';

function gdsReverse(id: string, n: number, question: string) {
  return selectInput(
    id,
    `${n}. ${question}`,
    [
      { label: 'Yes', value: 'yes', points: 0 },
      { label: 'No', value: 'no', points: 1 },
    ],
    'yes',
    'How have you felt over the past week? This item is reverse-scored: “No” = 1 point.',
  );
}
function gdsForward(id: string, n: number, question: string) {
  return selectInput(
    id,
    `${n}. ${question}`,
    [
      { label: 'No', value: 'no', points: 0 },
      { label: 'Yes', value: 'yes', points: 1 },
    ],
    'no',
    'How have you felt over the past week? “Yes” = 1 point.',
  );
}
function gdsPoints(v: string | number | boolean | null | undefined, reverse: boolean): number {
  const s = str(v, reverse ? 'yes' : 'no');
  return reverse ? (s === 'no' ? 1 : 0) : s === 'yes' ? 1 : 0;
}

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
      selectInput(
        'face',
        'Facial palsy',
        [
          { label: 'Absent (0)', value: 0, description: 'Smile / show teeth is symmetrical' },
          { label: 'Mild (1)', value: 1, description: 'Slightly asymmetrical smile or show-teeth' },
          { label: 'Moderate to severe (2)', value: 2, description: 'Completely asymmetrical (one side does not move)' },
        ],
        0,
        'Ask the patient to show teeth or smile. Score the weaker side.',
      ),
      selectInput(
        'arm',
        'Arm motor function',
        [
          { label: 'Normal to mild (0)', value: 0, description: 'Weaker arm upholds 90° sitting or 45° supine for >10 s' },
          { label: 'Moderate (1)', value: 1, description: 'Arm is raised but drops before 10 s' },
          { label: 'Severe (2)', value: 2, description: 'Cannot raise the arm, or it drops immediately' },
        ],
        0,
        'Extend the weaker arm, palms up, 90° sitting or 45° supine. Time the hold: >10 s = 0; <10 s = 1; cannot raise / drops immediately = 2.',
      ),
      selectInput(
        'leg',
        'Leg motor function',
        [
          { label: 'Normal to mild (0)', value: 0, description: 'Weaker leg upholds 30° supine for >5 s' },
          { label: 'Moderate (1)', value: 1, description: 'Leg is raised but drops before 5 s' },
          { label: 'Severe (2)', value: 2, description: 'Cannot raise the leg, or it drops immediately' },
        ],
        0,
        'Supine, raise the weaker leg to 30°. Time the hold: >5 s = 0; <5 s = 1; cannot raise = 2.',
      ),
      selectInput(
        'gaze',
        'Head / gaze deviation',
        [
          { label: 'Absent (0)', value: 0, description: 'Can shift gaze past midline both ways' },
          { label: 'Present (1)', value: 1, description: 'Forced to one side, or cannot shift gaze past midline when asked to look the other way' },
        ],
        0,
        'If gaze is forced to one side, ask the patient to look the other way. Present = cannot shift past midline.',
      ),
      selectInput('side', 'Hemiparesis side (cortical testing branch)', [
        { label: 'Right hemiparesis → score aphasia', value: 'right' },
        { label: 'Left hemiparesis → score agnosia', value: 'left' },
        { label: 'No clear laterality / bilateral', value: 'na' },
      ], 'right', 'Only one cortical branch counts. Right hemiparesis → aphasia; left → agnosia. Bilateral/unclear uses the higher of the two.'),
      selectInput(
        'aphasia',
        'Aphasia (right hemiparesis): close eyes + “make a fist”',
        [
          { label: 'Performs both (0)', value: 0, description: 'Closes eyes AND makes a fist (or opens/closes the hand)' },
          { label: 'Performs one (1)', value: 1, description: 'Performs only one of the two commands' },
          { label: 'Performs neither (2)', value: 2, description: 'Performs neither command' },
        ],
        0,
        'Use when right-sided weakness (left hemisphere). Commands: (1) close your eyes; (2) make a fist / open and close your hand.',
      ),
      selectInput(
        'agnosia',
        'Agnosia / neglect (left hemiparesis)',
        [
          { label: 'Recognizes arm and impairment (0)', value: 0, description: 'Knows whose arm it is AND knows it is weak' },
          { label: 'Does not recognize arm OR impairment (1)', value: 1, description: 'Asomatognosia or anosognosia (one of the two)' },
          { label: 'Does not recognize either (2)', value: 2, description: 'Both asomatognosia and anosognosia' },
        ],
        0,
        'Use when left-sided weakness (right hemisphere). Show the paretic arm: “Whose arm is this?” then “Can you move your arm?”',
      ),
    ],
    calculate(values) {
      const side = String(values.side ?? 'right');
      const aphasia = num(values.aphasia);
      const agnosia = num(values.agnosia);
      const cortical =
        side === 'left' ? agnosia : side === 'right' ? aphasia : Math.max(aphasia, agnosia);
      const motorFaceGaze = num(values.face) + num(values.arm) + num(values.leg) + num(values.gaze);
      const score = motorFaceGaze + cortical;
      const sideLabel =
        side === 'left' ? 'Left hemiparesis (score agnosia)' : side === 'right' ? 'Right hemiparesis (score aphasia)' : 'No clear laterality / bilateral';
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
          { label: 'Hemiparesis side / cortical branch', value: sideLabel },
          { label: 'Motor + face + gaze', value: String(motorFaceGaze) },
          { label: 'Aphasia score (right hemiparesis branch)', value: String(aphasia) },
          { label: 'Agnosia / neglect score (left hemiparesis branch)', value: String(agnosia) },
          {
            label: 'Cortical points applied',
            value: `${cortical} (${side === 'left' ? 'agnosia' : side === 'right' ? 'aphasia' : 'max of both'})`,
          },
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
          title: 'Design and validation of a prehospital stroke scale to predict large arterial occlusion: the rapid arterial occlusion evaluation scale',
          citation: 'Pérez de la Ossa N et al. Stroke. 2014',
          year: 2014,
          pmid: '24281224',
          doi: '10.1161/STROKEAHA.113.003071',
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
      'Arm hold is >10 s at 90° sitting or 45° supine; leg hold is >5 s at 30° supine.',
      'Agnosia prompts: “Whose arm is this?” then “Can you move your arm?”',
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
      selectInput(
        'face',
        'Facial droop',
        [
          { label: 'Absent (0)', value: 0, description: 'Smile / show teeth symmetrical' },
          { label: 'Present (1)', value: 1, description: 'Partial or complete unilateral droop' },
        ],
        0,
        'Ask the patient to smile and show teeth. Present = partial or complete unilateral droop.',
      ),
      selectInput(
        'arm',
        'Arm drift',
        [
          { label: 'Absent (0)', value: 0, description: 'No drift over 10 s' },
          { label: 'Drifts down (1)', value: 1, description: 'Drifts down but does not hit the bed in 10 s' },
          { label: 'Falls rapidly (2)', value: 2, description: 'Falls rapidly or cannot be lifted against gravity' },
        ],
        0,
        'Eyes closed, both arms out palms up for 10 s. Score the weaker arm.',
      ),
      selectInput(
        'grip',
        'Grip strength',
        [
          { label: 'Normal (0)', value: 0, description: 'Equal strong handshake' },
          { label: 'Weak grip (1)', value: 1, description: 'Weak but some grip' },
          { label: 'No grip / no movement (2)', value: 2, description: 'No grip or no movement' },
        ],
        0,
        'Handshake grip, compare sides. 0 equal strong; 1 weak but some grip; 2 no grip / no movement.',
      ),
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
          title: 'A brief prehospital stroke severity scale identifies ischemic stroke patients harboring persisting large arterial occlusions',
          citation: 'Nazliel B et al. Stroke. 2008',
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
      yesNo(
        'gaze',
        'Gaze preference / conjugate deviation present',
        2,
        'Present if conjugate deviation, or the patient cannot shift gaze past midline.',
      ),
      yesNo(
        'arm',
        'Arm weakness — cannot hold arm up against gravity for 10 s',
        1,
        'Ask the patient to hold both arms up (or the weaker arm) against gravity for 10 seconds.',
      ),
      yesNo(
        'loc',
        'LOC: incorrect on ≥1 of 2 orientation questions OR fails ≥1 of 2 commands',
        1,
        'Questions: “What is your age?” and “What month is it?” Commands: “Close your eyes.” then “Make a fist” / open and close your hand. Score Yes if ≥1 question is wrong OR ≥1 command is failed (this tool’s coded rule — do not switch to AND).',
      ),
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
          title: 'Design and validation of a prehospital scale to predict stroke severity: Cincinnati Prehospital Stroke Severity Scale',
          citation: 'Katz BS et al. Stroke. 2015 (CPSSS; later called C-STAT)',
          year: 2015,
          pmid: '25899242',
          doi: '10.1161/STROKEAHA.115.008804',
        },
      ],
    },
    nextSteps: [
      { condition: 'C-STAT ≥2', actions: ['Consider mothership / EVT center routing', 'Early advanced imaging'] },
    ],
    pearls: [
      'Gaze carries double weight (2 points).',
      'LOC questions are age and month; commands are close eyes and make a fist. This tool scores Yes if ≥1 question is wrong OR ≥1 command fails (not AND).',
      'False negatives occur with mild LVO or posterior circulation stroke.',
    ],
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
      selectInput(
        'face',
        'Facial palsy',
        [
          { label: 'Normal or minor paralysis (0)', value: 0, description: 'Symmetrical smile or minor flattening of nasolabial fold' },
          { label: 'Partial or complete paralysis (1)', value: 1, description: 'Obvious asymmetry; partial or total paralysis of lower face' },
        ],
        0,
        'Ask patient to show teeth or smile (Lima 2016: 0 = normal/minor, 1 = partial/complete).',
      ),
      selectInput(
        'arm',
        'Arm weakness',
        [
          { label: 'No drift (0)', value: 0, description: 'Holds 90° sitting or 45° supine for 10 s' },
          { label: 'Drift or some effort against gravity (1)', value: 1, description: 'Drifts before 10 s, or some effort against gravity' },
          { label: 'No effort against gravity / no movement (2)', value: 2, description: 'Limb falls with no antigravity effort, or no movement' },
        ],
        0,
        'Eyes closed, arms out palms up 10 s. Score the weaker arm.',
      ),
      selectInput(
        'speech',
        'Speech changes',
        [
          { label: 'Absent (0)', value: 0, description: 'Normal speech' },
          { label: 'Mild (1)', value: 1, description: 'Mild–moderate aphasia or dysarthria but some meaningful speech' },
          { label: 'Severe / mute / incomprehensible (2)', value: 2, description: 'Mute, global aphasia, or incomprehensible speech' },
        ],
        0,
        'Name 3 objects and follow a 1-step command, or repeat a sentence.',
      ),
      selectInput(
        'eye',
        'Eye deviation',
        [
          { label: 'Absent (0)', value: 0, description: 'Follows finger full left–right' },
          { label: 'Partial (1)', value: 1, description: 'Gaze preference; cannot cross midline but not locked' },
          { label: 'Forced deviation (2)', value: 2, description: 'Forced/locked deviation, cannot overcome' },
        ],
        0,
        'Follow finger full left–right. Partial = cannot cross midline; forced = locked, cannot overcome.',
      ),
      selectInput(
        'denial',
        'Denial / neglect',
        [
          { label: 'Absent (0)', value: 0, description: 'No extinction or anosognosia' },
          { label: 'Extinction to bilateral simultaneous stimulation only (1)', value: 1, description: 'Visual or tactile extinction on BSS only' },
          { label: 'Does not recognize own hand or orients only one side (2)', value: 2, description: 'Does not recognize own hand or orients to only one side of space' },
        ],
        0,
        'Visual or tactile bilateral simultaneous stimulation, then “Whose arm is this?”',
      ),
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
        'FAST-ED (0–9): Facial 0–1, Arm 0–2, Speech 0–2, Eye deviation 0–2, Denial/neglect 0–2. Score ≥4 frequently used to predict LVO.',
      formula: 'F+A+S+E+D (0–9)',
      validation: 'Validated against CTA-defined LVO; comparable performance to other EMS LVO scales.',
      references: [
        {
          title: 'Field Assessment Stroke Triage for Emergency Destination: A Simple and Accurate Prehospital Scale to Detect Large Vessel Occlusion Strokes',
          citation: 'Lima FO et al. Stroke. 2016',
          year: 2016,
          pmid: '27364531',
          doi: '10.1161/STROKEAHA.116.013301',
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
        { label: 'GCS ≥9 (2)', value: 2, description: 'Best eye + verbal + motor total ≥9' },
        { label: 'GCS ≤8 (0)', value: 0, description: 'Best eye + verbal + motor total ≤8' },
      ], 2, 'Eye (1–4) + verbal (1–5) + motor (1–6). Score best responses after resuscitation.'),
      selectInput(
        'location',
        'ICH location',
        [
          { label: 'Lobar (2)', value: 2, description: 'Cortex / lobar white matter (not deep nuclei or cerebellum/brainstem)' },
          { label: 'Deep (1)', value: 1, description: 'Basal ganglia, thalamus, or internal capsule' },
          { label: 'Infratentorial (0)', value: 0, description: 'Brainstem or cerebellum' },
        ],
      ),
      selectInput('volume', 'ICH volume', [
        { label: '<30 mL (4)', value: 4 },
        { label: '30–60 mL (2)', value: 2 },
        { label: '>60 mL (0)', value: 0 },
      ], 4, 'ABC/2 or volumetric estimate'),
      selectInput('cognition', 'Pre-ICH cognitive impairment', [
        { label: 'No (1)', value: 1, description: 'No dementia or cognitive impairment before this ICH' },
        { label: 'Yes (0)', value: 0, description: 'Documented dementia or cognitive impairment antedating this bleed (not acute confusion from the ICH)' },
      ], 1, 'Score premorbid cognition only — not encephalopathy caused by the hemorrhage.'),
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
      yesNo('ctaDone', 'CTA available for review', 0),
      yesNo(
        'spotSign',
        'Spot sign present (≥1 focus of contrast within hematoma, discontinuous from vessels)',
        2,
        'Arterial-phase CTA: ≥1 focus of contrast pooling in the hematoma, discontinuous from vessels, attenuation ≥120 HU (or ≥2× hematoma), any size/morphology; exclude calcium on NCCT.',
      ),
      yesNo('multipleSpots', 'Multiple spot signs or large/serpiginous spot'),
      yesNo('earlyPresentation', 'Presentation within 6 hours of onset'),
      yesNo(
        'anticoag',
        'Anticoagulation or coagulopathy',
        1,
        'Warfarin / DOAC / heparin, or INR >1.4 or platelets <100 ×10⁹/L (local reversal thresholds supersede).',
      ),
      yesNo('largeVolume', 'Baseline hematoma volume ≥30 mL', 1, 'ABC/2 or volumetric estimate ≥30 mL.'),
      yesNo('ivh', 'Intraventricular extension', 1, 'Any blood in the ventricular system on CT.'),
      yesNo(
        'bpUncontrolled',
        'SBP still markedly elevated / hard to control',
        1,
        'e.g. SBP still ≥150–180 mmHg, or not at local ICH target (often SBP <140).',
      ),
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
          score: '—',
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
          pmid: '22405630',
          doi: '10.1016/S1474-4422(12)70038-8',
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
    whenToUse: 'Confirmed aneurysmal SAH for standardized clinical severity grading.',
    whyUse: 'Widely used international grade linking GCS and focal motor deficit to outcome; complements Hunt-Hess and Fisher grades.',
    inputs: [
      numberInput('gcs', 'Glasgow Coma Scale total', {
        min: 3,
        max: 15,
        defaultValue: 15,
        helpText: 'Best eye + verbal + motor (3–15). Re-grade after resuscitation/EVD — hydrocephalus can lower GCS reversibly.',
      }),
      yesNo('motorDeficit', 'Major focal motor deficit present (hemiparesis/hemiplegia)', 0, 'Limb hemiparesis or hemiplegia. Isolated cranial-nerve palsy (e.g. III, VI, VII) does not count as a major focal motor deficit for WFNS.'),
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
          title: 'A universal subarachnoid hemorrhage scale: report of a committee of the World Federation of Neurosurgical Societies',
          citation: 'Teasdale GM et al. J Neurol Neurosurg Psychiatry. 1988',
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
      selectInput(
        'mFisher',
        'Modified Fisher grade (if known)',
        [
          { label: 'Unknown / not entered', value: -1 },
          { label: 'mFisher 0', value: 0, description: 'No SAH or IVH' },
          { label: 'mFisher 1 (thin SAH, no IVH)', value: 1, description: 'Thin SAH (all blood <1 mm); no IVH' },
          { label: 'mFisher 2 (thin SAH + IVH)', value: 2, description: 'Thin SAH + any intraventricular blood' },
          {
            label: 'mFisher 3 (thick SAH, no IVH)',
            value: 3,
            description: 'Thick SAH (cisternal blood completely filling ≥1 cistern or vertical layer ≥1 mm); no IVH',
          },
          { label: 'mFisher 4 (thick SAH + IVH)', value: 4, description: 'Thick SAH + any IVH' },
        ],
        -1,
        'Thick = cisternal blood completely filling ≥1 cistern or vertical layer ≥1 mm; thin = all blood <1 mm. IVH = any intraventricular blood.',
      ),
      yesNo('secured', 'Aneurysm secured (clipped/coiled)', 0),
      yesNo('nimodipine', 'Nimodipine ongoing', 0),
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
      numberInput('gcs', 'Glasgow Coma Scale', {
        min: 3,
        max: 15,
        defaultValue: 15,
        helpText: 'Eye (1–4) + verbal (1–5) + motor (1–6). Use T/P modifiers if intubated/paralyzed; score best responses.',
      }),
      yesNo('intubated', 'Intubated / chemically paralyzed (GCS limited)', 0, 'Cannot score a full verbal GCS — report T/P modifiers; this tool flags GCS as confounded if still >8.'),
      yesNo('postTraumaticAmnesia', 'Post-traumatic amnesia present', 0, 'Inability to form new memories after the injury. PTA >24 h suggests more than mild TBI.'),
      yesNo('loc', 'Loss of consciousness reported', 0, 'Any witnessed or reported LOC after the injury. Duration >30 min suggests more than mild TBI.'),
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
      'SCAT5/SCAT6 concussion symptom checklist: 22 symptoms rated 0–6 (none to severe), auto-summing symptom count (0–22) and severity score (0–132), or direct total.',
    category: 'neurology',
    tags: ['concussion', 'scat5', 'scat6', 'sports', 'symptom'],
    whenToUse: 'Sideline or acute/post-acute concussion assessment; athlete/patient completes 22 symptom items or enter totals.',
    whyUse: 'Quantifies symptom burden for baseline comparison, return-to-play monitoring, and serial recovery tracking.',
    inputs: [
      selectInput('entryMode', 'Entry mode', [
        { label: 'Complete 22-item symptom checklist', value: 'survey' },
        { label: 'Direct totals override', value: 'direct' },
      ]),
      numberInput('numSymptoms', 'Number of symptoms endorsed (0–22, direct mode)', {
        min: 0,
        max: 22,
        defaultValue: 0,
        helpText: 'Used only if direct override is selected.',
      }),
      numberInput('severity', 'Symptom severity sum (0–132, direct mode)', {
        min: 0,
        max: 132,
        defaultValue: 0,
        helpText: 'Used only if direct override is selected.',
      }),
      selectInput('headache', 'Headache', [
        { label: '0 — None', value: 0 },
        { label: '1 — Very mild', value: 1 },
        { label: '2 — Mild', value: 2 },
        { label: '3 — Moderate', value: 3 },
        { label: '4 — Moderate-severe', value: 4 },
        { label: '5 — Severe', value: 5 },
        { label: '6 — Very severe', value: 6 },
      ]),
      selectInput('pressure_head', 'Pressure in head', [
        { label: '0 — None', value: 0 },
        { label: '1 — Very mild', value: 1 },
        { label: '2 — Mild', value: 2 },
        { label: '3 — Moderate', value: 3 },
        { label: '4 — Moderate-severe', value: 4 },
        { label: '5 — Severe', value: 5 },
        { label: '6 — Very severe', value: 6 },
      ]),
      selectInput('neck_pain', 'Neck pain', [
        { label: '0 — None', value: 0 },
        { label: '1 — Very mild', value: 1 },
        { label: '2 — Mild', value: 2 },
        { label: '3 — Moderate', value: 3 },
        { label: '4 — Moderate-severe', value: 4 },
        { label: '5 — Severe', value: 5 },
        { label: '6 — Very severe', value: 6 },
      ]),
      selectInput('nausea_vomiting', 'Nausea or vomiting', [
        { label: '0 — None', value: 0 },
        { label: '1 — Very mild', value: 1 },
        { label: '2 — Mild', value: 2 },
        { label: '3 — Moderate', value: 3 },
        { label: '4 — Moderate-severe', value: 4 },
        { label: '5 — Severe', value: 5 },
        { label: '6 — Very severe', value: 6 },
      ]),
      selectInput('dizziness', 'Dizziness', [
        { label: '0 — None', value: 0 },
        { label: '1 — Very mild', value: 1 },
        { label: '2 — Mild', value: 2 },
        { label: '3 — Moderate', value: 3 },
        { label: '4 — Moderate-severe', value: 4 },
        { label: '5 — Severe', value: 5 },
        { label: '6 — Very severe', value: 6 },
      ]),
      selectInput('blurred_vision', 'Blurred vision', [
        { label: '0 — None', value: 0 },
        { label: '1 — Very mild', value: 1 },
        { label: '2 — Mild', value: 2 },
        { label: '3 — Moderate', value: 3 },
        { label: '4 — Moderate-severe', value: 4 },
        { label: '5 — Severe', value: 5 },
        { label: '6 — Very severe', value: 6 },
      ]),
      selectInput('balance_problems', 'Balance problems', [
        { label: '0 — None', value: 0 },
        { label: '1 — Very mild', value: 1 },
        { label: '2 — Mild', value: 2 },
        { label: '3 — Moderate', value: 3 },
        { label: '4 — Moderate-severe', value: 4 },
        { label: '5 — Severe', value: 5 },
        { label: '6 — Very severe', value: 6 },
      ]),
      selectInput('sensitivity_light', 'Sensitivity to light', [
        { label: '0 — None', value: 0 },
        { label: '1 — Very mild', value: 1 },
        { label: '2 — Mild', value: 2 },
        { label: '3 — Moderate', value: 3 },
        { label: '4 — Moderate-severe', value: 4 },
        { label: '5 — Severe', value: 5 },
        { label: '6 — Very severe', value: 6 },
      ]),
      selectInput('sensitivity_noise', 'Sensitivity to noise', [
        { label: '0 — None', value: 0 },
        { label: '1 — Very mild', value: 1 },
        { label: '2 — Mild', value: 2 },
        { label: '3 — Moderate', value: 3 },
        { label: '4 — Moderate-severe', value: 4 },
        { label: '5 — Severe', value: 5 },
        { label: '6 — Very severe', value: 6 },
      ]),
      selectInput('feeling_slowed', 'Feeling slowed down', [
        { label: '0 — None', value: 0 },
        { label: '1 — Very mild', value: 1 },
        { label: '2 — Mild', value: 2 },
        { label: '3 — Moderate', value: 3 },
        { label: '4 — Moderate-severe', value: 4 },
        { label: '5 — Severe', value: 5 },
        { label: '6 — Very severe', value: 6 },
      ]),
      selectInput('feeling_fog', 'Feeling like in a fog', [
        { label: '0 — None', value: 0 },
        { label: '1 — Very mild', value: 1 },
        { label: '2 — Mild', value: 2 },
        { label: '3 — Moderate', value: 3 },
        { label: '4 — Moderate-severe', value: 4 },
        { label: '5 — Severe', value: 5 },
        { label: '6 — Very severe', value: 6 },
      ]),
      selectInput('dont_feel_right', 'Don\'t feel right', [
        { label: '0 — None', value: 0 },
        { label: '1 — Very mild', value: 1 },
        { label: '2 — Mild', value: 2 },
        { label: '3 — Moderate', value: 3 },
        { label: '4 — Moderate-severe', value: 4 },
        { label: '5 — Severe', value: 5 },
        { label: '6 — Very severe', value: 6 },
      ]),
      selectInput('diff_concentrating', 'Difficulty concentrating', [
        { label: '0 — None', value: 0 },
        { label: '1 — Very mild', value: 1 },
        { label: '2 — Mild', value: 2 },
        { label: '3 — Moderate', value: 3 },
        { label: '4 — Moderate-severe', value: 4 },
        { label: '5 — Severe', value: 5 },
        { label: '6 — Very severe', value: 6 },
      ]),
      selectInput('diff_remembering', 'Difficulty remembering', [
        { label: '0 — None', value: 0 },
        { label: '1 — Very mild', value: 1 },
        { label: '2 — Mild', value: 2 },
        { label: '3 — Moderate', value: 3 },
        { label: '4 — Moderate-severe', value: 4 },
        { label: '5 — Severe', value: 5 },
        { label: '6 — Very severe', value: 6 },
      ]),
      selectInput('fatigue_low_energy', 'Fatigue or low energy', [
        { label: '0 — None', value: 0 },
        { label: '1 — Very mild', value: 1 },
        { label: '2 — Mild', value: 2 },
        { label: '3 — Moderate', value: 3 },
        { label: '4 — Moderate-severe', value: 4 },
        { label: '5 — Severe', value: 5 },
        { label: '6 — Very severe', value: 6 },
      ]),
      selectInput('confusion', 'Confusion', [
        { label: '0 — None', value: 0 },
        { label: '1 — Very mild', value: 1 },
        { label: '2 — Mild', value: 2 },
        { label: '3 — Moderate', value: 3 },
        { label: '4 — Moderate-severe', value: 4 },
        { label: '5 — Severe', value: 5 },
        { label: '6 — Very severe', value: 6 },
      ]),
      selectInput('drowsiness', 'Drowsiness', [
        { label: '0 — None', value: 0 },
        { label: '1 — Very mild', value: 1 },
        { label: '2 — Mild', value: 2 },
        { label: '3 — Moderate', value: 3 },
        { label: '4 — Moderate-severe', value: 4 },
        { label: '5 — Severe', value: 5 },
        { label: '6 — Very severe', value: 6 },
      ]),
      selectInput('more_emotional', 'More emotional', [
        { label: '0 — None', value: 0 },
        { label: '1 — Very mild', value: 1 },
        { label: '2 — Mild', value: 2 },
        { label: '3 — Moderate', value: 3 },
        { label: '4 — Moderate-severe', value: 4 },
        { label: '5 — Severe', value: 5 },
        { label: '6 — Very severe', value: 6 },
      ]),
      selectInput('irritability', 'Irritability', [
        { label: '0 — None', value: 0 },
        { label: '1 — Very mild', value: 1 },
        { label: '2 — Mild', value: 2 },
        { label: '3 — Moderate', value: 3 },
        { label: '4 — Moderate-severe', value: 4 },
        { label: '5 — Severe', value: 5 },
        { label: '6 — Very severe', value: 6 },
      ]),
      selectInput('sadness', 'Sadness', [
        { label: '0 — None', value: 0 },
        { label: '1 — Very mild', value: 1 },
        { label: '2 — Mild', value: 2 },
        { label: '3 — Moderate', value: 3 },
        { label: '4 — Moderate-severe', value: 4 },
        { label: '5 — Severe', value: 5 },
        { label: '6 — Very severe', value: 6 },
      ]),
      selectInput('nervous_anxious', 'Nervous or anxious', [
        { label: '0 — None', value: 0 },
        { label: '1 — Very mild', value: 1 },
        { label: '2 — Mild', value: 2 },
        { label: '3 — Moderate', value: 3 },
        { label: '4 — Moderate-severe', value: 4 },
        { label: '5 — Severe', value: 5 },
        { label: '6 — Very severe', value: 6 },
      ]),
      selectInput('trouble_falling_asleep', 'Trouble falling asleep', [
        { label: '0 — None', value: 0 },
        { label: '1 — Very mild', value: 1 },
        { label: '2 — Mild', value: 2 },
        { label: '3 — Moderate', value: 3 },
        { label: '4 — Moderate-severe', value: 4 },
        { label: '5 — Severe', value: 5 },
        { label: '6 — Very severe', value: 6 },
      ]),
    ],
    calculate(values) {
      const mode = String(values.entryMode ?? 'survey');
      let n = 0;
      let sev = 0;

      if (mode === 'direct' || (values.severity !== undefined && values.entryMode === undefined && values.headache === undefined)) {
        n = num(values.numSymptoms, 0);
        sev = num(values.severity, 0);
      } else {
        const symptomKeys = [
          'headache', 'pressure_head', 'neck_pain', 'nausea_vomiting', 'dizziness', 'blurred_vision',
          'balance_problems', 'sensitivity_light', 'sensitivity_noise', 'feeling_slowed', 'feeling_fog',
          'dont_feel_right', 'diff_concentrating', 'diff_remembering', 'fatigue_low_energy', 'confusion',
          'drowsiness', 'more_emotional', 'irritability', 'sadness', 'nervous_anxious', 'trouble_falling_asleep'
        ];
        for (const key of symptomKeys) {
          const val = num(values[key], 0);
          sev += val;
          if (val > 0) n += 1;
        }
      }

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
          interpretation: `Severity ${sev}/132 across ${n} symptoms — mild burden. Relative rest (24–48h), graded return to learn/play, and serial SCAT symptom tracking.`,
        },
        {
          max: 50,
          level: 'high',
          label: 'Moderate symptom burden',
          interpretation: `Severity ${sev}/132 across ${n} symptoms — moderate burden. Multidisciplinary concussion management; academic/work modifications recommended.`,
        },
        {
          max: 132,
          level: 'critical',
          label: 'High symptom burden',
          interpretation: `Severity ${sev}/132 across ${n} symptoms — high burden. Close medical surveillance; red-flag screen (worsening headache, persistent vomiting, focal neurological signs, seizures, neck pain).`,
        },
      ]);
      return {
        score: sev,
        unit: '/132',
        ...r,
        details: [
          { label: 'Symptoms endorsed', value: `${n} / 22` },
          { label: 'Severity total', value: `${sev} / 132` },
          { label: 'Mean per endorsed', value: n > 0 ? String(round(sev / n, 1)) : '—' },
          { label: 'Entry mode', value: mode === 'survey' ? '22-item checklist' : 'Direct override' },
        ],
      };
    },
    evidence: {
      summary:
        'SCAT5 / SCAT6 symptom evaluation: 22 symptoms each rated 0–6 (none → severe), yielding symptom count (0–22) and symptom severity score (0–132). Embedded in international consensus Concussion in Sport Group guidelines.',
      formula: 'Sum of 22 items (each 0–6) = Severity (0–132); Count of items > 0 = Symptoms endorsed (0–22)',
      validation: 'Embedded in consensus sports concussion tools (Concussion in Sport Group); track change from baseline when available.',
      references: [
        {
          title: 'The Sport Concussion Assessment Tool 5th Edition (SCAT5): Background and rationale',
          citation: 'Echemendia RJ et al. Br J Sports Med. 2017',
          year: 2017,
          pmid: '28446453',
          doi: '10.1136/bjsports-2017-097506',
        },
        {
          title: 'Sport concussion assessment tool 6 (SCAT6)',
          citation: 'Echemendia RJ et al. Br J Sports Med. 2023',
          year: 2023,
          pmid: '37316287',
          doi: '10.1136/bjsports-2023-107036',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Red flag symptoms (focal neuro deficit, worsening headache, repeated emesis, seizures)',
        actions: ['Immediate emergency neuroimaging / emergency department evaluation'],
      },
      {
        condition: 'Symptom severity > 0',
        actions: [
          'Initial relative rest 24–48 hours, then sub-symptom threshold aerobic exercise',
          'Graduated Return-to-Learn followed by Graduated Return-to-Sport protocol',
          'Avoid same-day return to contact sports',
        ],
      },
    ],
    pearls: [
      'Asymptomatic does not alone clear an athlete; cognitive and postural testing must normalize.',
      'Baseline SCAT scores (preseason) significantly aid individual comparison.',
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
      selectInput(
        'stage',
        'Current completed / proposed RTP stage',
        [
          {
            label: 'Stage 1 — Symptom-limited activity',
            value: 1,
            description: 'Daily activities that do not provoke symptoms; relative rest',
          },
          {
            label: 'Stage 2 — Light aerobic exercise',
            value: 2,
            description: 'Walking or stationary bike; no resistance training',
          },
          {
            label: 'Stage 3 — Sport-specific exercise',
            value: 3,
            description: 'Running/skating drills; no head-impact activities',
          },
          {
            label: 'Stage 4 — Non-contact training drills',
            value: 4,
            description: 'Complex training ± progressive resistance; still no contact',
          },
          {
            label: 'Stage 5 — Full-contact practice',
            value: 5,
            description: 'Normal training including contact after medical clearance',
          },
          {
            label: 'Stage 6 — Return to sport / competition',
            value: 6,
            description: 'Competition if stage 5 was asymptomatic',
          },
        ],
      ),
      yesNo('symptomFreeRest', 'Asymptomatic at current stage (24 h minimum typically)', 0, 'No return of concussion symptoms at this stage for at least 24 h (longer in children/adolescents).'),
      yesNo('returnToLearn', 'Return-to-learn successful / school tolerance adequate', 0, 'Usual school/work cognitive load tolerated without significant symptom provocation.'),
      yesNo('medicalClearance', 'Medical clearance documented for contact stages', 0),
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
          title: 'Consensus statement on concussion in sport-the 5th international conference on concussion in sport held in Berlin, October 2016',
          citation: 'McCrory P et al. Br J Sports Med. 2017',
          year: 2017,
          pmid: '28446457',
          doi: '10.1136/bjsports-2017-097699',
        },
        {
          title: 'Consensus statement on concussion in sport: the 6th International Conference on Concussion in Sport-Amsterdam, October 2022',
          citation: 'Patricios JS et al. Br J Sports Med. 2023',
          year: 2023,
          pmid: '37316210',
          doi: '10.1136/bjsports-2023-106898',
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
      selectInput(
        'alertness',
        '1. Alertness',
        [
          {
            label: 'Normal / fully alert; mild sleepiness for <10 s after waking (0)',
            value: 0,
            description: 'Fully alert, or sleepy <10 s after waking then normal',
          },
          {
            label: 'Clearly abnormal (4)',
            value: 4,
            description: 'Drowsy, hypervigilant, restless, agitated, or combative — even if fluctuating',
          },
        ],
        0,
        'Observe. 0 = fully alert or sleepy <10 s after waking then normal. 4 = drowsy, hypervigilant, restless, agitated, or combative even if fluctuating.',
      ),
      selectInput(
        'amt4',
        '2. AMT4 (age, DOB, place, current year)',
        [
          { label: 'No mistakes (0)', value: 0 },
          { label: '1 mistake (1)', value: 1 },
          { label: '≥2 mistakes or untestable (2)', value: 2 },
        ],
        0,
        'Ask age, date of birth, place (name of hospital or building), and current year. Count mistakes; untestable scores 2.',
      ),
      selectInput(
        'attention',
        '3. Attention — months of the year backwards',
        [
          { label: 'Achieves ≥7 months correctly (0)', value: 0 },
          { label: 'Starts but scores <7 months / refuses (1)', value: 1 },
          { label: 'Untestable — too unwell, drowsy, inattentive (2)', value: 2 },
        ],
        0,
        'Say: “Please tell me the months of the year backwards, starting at December.” One prompt allowed. 0 = ≥7 months; 1 = starts but <7 or refuses; 2 = untestable.',
      ),
      selectInput(
        'acute',
        '4. Acute change or fluctuating course',
        [
          { label: 'No (0)', value: 0, description: 'No significant change or fluctuation' },
          {
            label: 'Yes (4)',
            value: 4,
            description:
              'Significant change or fluctuation in alertness, cognition, or other mental function over the last 2 weeks and still evident in the last 24 h',
          },
        ],
        0,
        'Yes if significant change or fluctuation in alertness, cognition, or other mental function (e.g. paranoia, hallucinations) arising over the last 2 weeks and still evident in the last 24 h (informant/staff/notes). Without this window, chronic dementia can score 4.',
      ),
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
          pmid: '24590568',
          doi: '10.1093/ageing/afu021',
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
      yesNo(
        'f1',
        'Feature 1 — Altered mental status OR fluctuating course',
        1,
        'Acute change from baseline mental status, or fluctuating course over the past 24 hours (nurse, family, or chart).',
      ),
      yesNo(
        'f2',
        'Feature 2 — Inattention (e.g., months backwards / digit span errors)',
        1,
        'Say: “Name the months backwards from December to July.” Inattention = any error, a pause >15 s or perseveration, or cannot start.',
      ),
      yesNo(
        'f3',
        'Feature 3 — Altered level of consciousness (RASS ≠ 0 or not alert)',
        1,
        'Any RASS other than 0 (not alert and calm). If unarousable (RASS −4/−5), do not diagnose delirium this round — reassess when arousable.',
      ),
      yesNo(
        'f4',
        'Feature 4 — Disorganized thinking (illogical answers / unclear flow)',
        1,
        'Set A yes/no: Will a stone float on water? Are there fish in the sea? Does 1 lb weigh more than 2 lb? Can you use a hammer to pound a nail? Then: “Hold up this many fingers” (show 2); “Now the same with the other hand” (do not demonstrate). Disorganized = ≥2 errors.',
      ),
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
      'Inattention is required — without it, algorithm is negative (need F1 + F2 and F3 or F4).',
      'F2: months backwards December to July. F4: four yes/no questions plus a two-step finger command (≥2 errors).',
      'Hyperactive and hypoactive delirium both count when features met. Unarousable (RASS −4/−5): do not diagnose this round.',
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
    whyUse: 'Broader than MMSE/MoCA alone; total cutoffs (often 82/88) aid dementia screening (education-dependent).',
    inputs: [
      numberInput('total', 'ACE-III total (0–100)', {
        min: 0,
        max: 100,
        defaultValue: 88,
        helpText: 'Attention 18 + Memory 26 + Fluency 14 + Language 26 + Visuospatial 16. Enter the total from the official ACE-III form; do not administer items from this screen.',
      }),
      numberInput('attention', 'Attention / Orientation (0–18, optional)', { min: 0, max: 18, defaultValue: 0, required: false, helpText: 'Leave blank if this domain was not scored (blank is not a 0).' }),
      numberInput('memory', 'Memory (0–26, optional)', { min: 0, max: 26, defaultValue: 0, required: false, helpText: 'Leave blank if this domain was not scored (blank is not a 0).' }),
      numberInput('fluency', 'Fluency (0–14, optional)', { min: 0, max: 14, defaultValue: 0, required: false, helpText: 'Leave blank if this domain was not scored (blank is not a 0).' }),
      numberInput('language', 'Language (0–26, optional)', { min: 0, max: 26, defaultValue: 0, required: false, helpText: 'Leave blank if this domain was not scored (blank is not a 0).' }),
      numberInput('visuospatial', 'Visuospatial (0–16, optional)', { min: 0, max: 16, defaultValue: 0, required: false, helpText: 'Leave blank if this domain was not scored (blank is not a 0).' }),
    ],
    calculate(values) {
      const total = num(values.total, 88);
      // A blank optional domain is not a 0 score (0 is a real result); mark it unentered.
      const domainOrDash = (raw: number | string | boolean | null | undefined) =>
        isMissingValue(raw, true) ? '—' : String(num(raw));
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
            value: `A${domainOrDash(values.attention)} M${domainOrDash(values.memory)} F${domainOrDash(values.fluency)} L${domainOrDash(values.language)} V${domainOrDash(values.visuospatial)}`,
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
    name: 'IQCODE (Informant Questionnaire on Cognitive Decline)',
    shortName: 'IQCODE',
    description:
      'Informant Questionnaire on Cognitive Decline in the Elderly (Short 16-item Form, 1–5 scale, average 1.0–5.0), with direct average override.',
    category: 'neurology',
    tags: ['iqcode', 'dementia', 'informant', 'screening', 'geriatrics'],
    whenToUse: 'When an informant/caregiver rates change in cognitive performance over the past 10 years.',
    whyUse: 'Unaffected by premorbid education/language barriers; highly sensitive for detecting progressive cognitive decline.',
    inputs: [
      selectInput('entryMode', 'Entry mode', [
        { label: 'Complete 16-item Short IQCODE questionnaire', value: 'survey' },
        { label: 'Direct average score override', value: 'direct' },
      ]),
      numberInput('average', 'IQCODE average score (1.0–5.0, direct mode)', {
        min: 1,
        max: 5,
        step: 0.01,
        defaultValue: 3.0,
        helpText: 'Used only if direct override is selected. Mean of items: 1 much improved, 3 no change, 5 much worse.',
      }),
      selectInput('form', 'Form used (if direct override)', [
        { label: 'Short IQCODE (16 items)', value: 'short' },
        { label: 'Full IQCODE (26 items)', value: 'full' },
        { label: 'Not specified', value: 'na' },
      ]),
      selectInput('iq1', '1. Recognizing faces of family and friends', [
        { label: '1 — Much improved', value: 1 },
        { label: '2 — A bit improved', value: 2 },
        { label: '3 — Not much change', value: 3 },
        { label: '4 — A bit worse', value: 4 },
        { label: '5 — Much worse', value: 5 },
      ], 2),
      selectInput('iq2', '2. Remembering names of family and friends', [
        { label: '1 — Much improved', value: 1 },
        { label: '2 — A bit improved', value: 2 },
        { label: '3 — Not much change', value: 3 },
        { label: '4 — A bit worse', value: 4 },
        { label: '5 — Much worse', value: 5 },
      ], 2),
      selectInput('iq3', '3. Remembering things about family and friends (e.g. occupations, birthdays)', [
        { label: '1 — Much improved', value: 1 },
        { label: '2 — A bit improved', value: 2 },
        { label: '3 — Not much change', value: 3 },
        { label: '4 — A bit worse', value: 4 },
        { label: '5 — Much worse', value: 5 },
      ], 2),
      selectInput('iq4', '4. Remembering things that have happened recently', [
        { label: '1 — Much improved', value: 1 },
        { label: '2 — A bit improved', value: 2 },
        { label: '3 — Not much change', value: 3 },
        { label: '4 — A bit worse', value: 4 },
        { label: '5 — Much worse', value: 5 },
      ], 2),
      selectInput('iq5', '5. Recalling conversations a few days later', [
        { label: '1 — Much improved', value: 1 },
        { label: '2 — A bit improved', value: 2 },
        { label: '3 — Not much change', value: 3 },
        { label: '4 — A bit worse', value: 4 },
        { label: '5 — Much worse', value: 5 },
      ], 2),
      selectInput('iq6', '6. Forgetting what he/she wanted to say in the middle of a conversation', [
        { label: '1 — Much improved', value: 1 },
        { label: '2 — A bit improved', value: 2 },
        { label: '3 — Not much change', value: 3 },
        { label: '4 — A bit worse', value: 4 },
        { label: '5 — Much worse', value: 5 },
      ], 2),
      selectInput('iq7', '7. Remembering his/her address and telephone number', [
        { label: '1 — Much improved', value: 1 },
        { label: '2 — A bit improved', value: 2 },
        { label: '3 — Not much change', value: 3 },
        { label: '4 — A bit worse', value: 4 },
        { label: '5 — Much worse', value: 5 },
      ], 2),
      selectInput('iq8', '8. Remembering what day and month it is', [
        { label: '1 — Much improved', value: 1 },
        { label: '2 — A bit improved', value: 2 },
        { label: '3 — Not much change', value: 3 },
        { label: '4 — A bit worse', value: 4 },
        { label: '5 — Much worse', value: 5 },
      ], 2),
      selectInput('iq9', '9. Remembering where things are usually kept', [
        { label: '1 — Much improved', value: 1 },
        { label: '2 — A bit improved', value: 2 },
        { label: '3 — Not much change', value: 3 },
        { label: '4 — A bit worse', value: 4 },
        { label: '5 — Much worse', value: 5 },
      ], 2),
      selectInput('iq10', '10. Knowing where to find things that have been put in an unusual place', [
        { label: '1 — Much improved', value: 1 },
        { label: '2 — A bit improved', value: 2 },
        { label: '3 — Not much change', value: 3 },
        { label: '4 — A bit worse', value: 4 },
        { label: '5 — Much worse', value: 5 },
      ], 2),
      selectInput('iq11', '11. Knowing how to work familiar gadgets and appliances (e.g. TV, stove)', [
        { label: '1 — Much improved', value: 1 },
        { label: '2 — A bit improved', value: 2 },
        { label: '3 — Not much change', value: 3 },
        { label: '4 — A bit worse', value: 4 },
        { label: '5 — Much worse', value: 5 },
      ], 2),
      selectInput('iq12', '12. Learning to use a new gadget or appliance around the house', [
        { label: '1 — Much improved', value: 1 },
        { label: '2 — A bit improved', value: 2 },
        { label: '3 — Not much change', value: 3 },
        { label: '4 — A bit worse', value: 4 },
        { label: '5 — Much worse', value: 5 },
      ], 2),
      selectInput('iq13', '13. Learning new things in general', [
        { label: '1 — Much improved', value: 1 },
        { label: '2 — A bit improved', value: 2 },
        { label: '3 — Not much change', value: 3 },
        { label: '4 — A bit worse', value: 4 },
        { label: '5 — Much worse', value: 5 },
      ], 2),
      selectInput('iq14', '14. Following a story in a book or on television', [
        { label: '1 — Much improved', value: 1 },
        { label: '2 — A bit improved', value: 2 },
        { label: '3 — Not much change', value: 3 },
        { label: '4 — A bit worse', value: 4 },
        { label: '5 — Much worse', value: 5 },
      ], 2),
      selectInput('iq15', '15. Making decisions on everyday matters (e.g. what to wear, meals)', [
        { label: '1 — Much improved', value: 1 },
        { label: '2 — A bit improved', value: 2 },
        { label: '3 — Not much change', value: 3 },
        { label: '4 — A bit worse', value: 4 },
        { label: '5 — Much worse', value: 5 },
      ], 2),
      selectInput('iq16', '16. Handling financial matters (e.g. banking, shopping change)', [
        { label: '1 — Much improved', value: 1 },
        { label: '2 — A bit improved', value: 2 },
        { label: '3 — Not much change', value: 3 },
        { label: '4 — A bit worse', value: 4 },
        { label: '5 — Much worse', value: 5 },
      ], 2),
    ],
    calculate(values) {
      const mode = String(values.entryMode ?? 'survey');
      let avg = 3.0;

      if (mode === 'direct' || (values.average !== undefined && values.entryMode === undefined && values.iq1 === undefined)) {
        avg = num(values.average, 3.0);
      } else {
        let total = 0;
        for (let i = 1; i <= 16; i++) {
          total += num(values[`iq${i}`], 3);
        }
        avg = round(total / 16, 2);
      }

      const r = riskFromThresholds(avg, [
        {
          max: 3.0,
          level: 'low',
          label: 'No informant-reported decline',
          interpretation: `IQCODE average ${avg}: at or below “no change” anchor (3.0). Significant progressive decline unlikely by informant report.`,
        },
        {
          max: 3.3,
          level: 'moderate',
          label: 'Borderline / mild change',
          interpretation: `IQCODE average ${avg}: mild elevation below common dementia thresholds (~3.3–3.4) — correlate with direct cognitive evaluation (e.g. SLUMS/MoCA).`,
        },
        {
          max: 3.6,
          level: 'high',
          label: 'Screen-positive for cognitive decline',
          interpretation: `IQCODE average ${avg}: exceeds validated cutoffs (≥3.3 to 3.44) indicating clinically meaningful cognitive decline. Diagnostic evaluation for MCI / early dementia indicated.`,
        },
        {
          max: 5.0,
          level: 'critical',
          label: 'Substantial cognitive decline',
          interpretation: `IQCODE average ${avg}: substantial decline across multiple functional domains. High likelihood of moderate–severe dementia; safety, medication oversight, and caregiver support required.`,
        },
      ]);
      return {
        score: avg,
        unit: 'avg (1–5)',
        ...r,
        details: [
          { label: 'Mean score', value: `${avg} / 5.0` },
          { label: 'Scale anchor', value: '1=Much improved · 3=No change · 5=Much worse' },
          { label: 'Cutoff benchmark', value: '≥3.31–3.44 screens positive for dementia' },
          { label: 'Entry mode', value: mode === 'survey' ? '16-item Short Form' : `Direct override (${String(values.form ?? 'short')})` },
        ],
      };
    },
    evidence: {
      summary:
        'Informant Questionnaire on Cognitive Decline in the Elderly (IQCODE): assesses cognitive and functional changes over ~10 years rated by a close relative/informant on a 1–5 scale. Mean ≥3.31–3.44 provides high sensitivity/specificity for dementia.',
      formula: 'Sum of 16 items / 16 (or enter mean directly)',
      validation: 'Jorm AF. Validated across diverse international cohorts, independent of premorbid education or language fluency.',
      references: [
        {
          title: 'The Informant Questionnaire on Cognitive Decline in the Elderly (IQCODE): socio-demographic correlates, reliability, validity and some norms',
          citation: 'Jorm AF, Jacomb PA. Psychol Med. 1989',
          year: 1989,
          pmid: '2594878',
          doi: '10.1017/s0033291700005742',
        },
        {
          title: 'The Short Form of the Informant Questionnaire on Cognitive Decline in the Elderly (Short IQCODE): development and cross-validation',
          citation: 'Jorm AF. Psychol Med. 1994',
          year: 1994,
          pmid: '8008892',
          doi: '10.1017/s0033291700027379',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'IQCODE average ≥3.38',
        actions: [
          'Direct cognitive testing (SLUMS, MoCA, or neuropsychological battery)',
          'Assess IADLs and driver safety',
          'Laboratory workup for reversible causes (TSH, B12, CMP, RPR if indicated)',
          'Structural brain imaging (MRI or non-contrast CT)',
        ],
      },
    ],
    pearls: [
      'Requires an informant who has known the patient well for 5–10 years.',
      'Unlike direct patient tests, IQCODE is relatively unaffected by education level or pre-existing intelligence.',
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
      yesNo(
        'q1',
        'Problems with judgment (e.g., bad financial decisions, odd gifts)',
        1,
        'Has there been a CHANGE in the last several years caused by thinking/memory problems? Yes = change; No = no change. Prefer an informant.',
      ),
      yesNo(
        'q2',
        'Reduced interest in hobbies/activities',
        1,
        'Has there been a CHANGE in the last several years caused by thinking/memory problems? Yes = change; No = no change. Prefer an informant.',
      ),
      yesNo(
        'q3',
        'Repeats questions, stories, or statements',
        1,
        'Has there been a CHANGE in the last several years caused by thinking/memory problems? Yes = change; No = no change. Prefer an informant.',
      ),
      yesNo(
        'q4',
        'Trouble learning how to use a tool, appliance, or gadget (e.g. TV remote, microwave)',
        1,
        'Has there been a CHANGE in the last several years caused by thinking/memory problems? Yes = change; No = no change. Prefer an informant.',
      ),
      yesNo(
        'q5',
        'Forgets correct month or year',
        1,
        'Has there been a CHANGE in the last several years caused by thinking/memory problems? Yes = change; No = no change. Prefer an informant.',
      ),
      yesNo(
        'q6',
        'Difficulty handling complicated financial affairs (bills, taxes, checkbook)',
        1,
        'Has there been a CHANGE in the last several years caused by thinking/memory problems? Yes = change; No = no change. Prefer an informant.',
      ),
      yesNo(
        'q7',
        'Difficulty remembering appointments',
        1,
        'Has there been a CHANGE in the last several years caused by thinking/memory problems? Yes = change; No = no change. Prefer an informant.',
      ),
      yesNo(
        'q8',
        'Consistent problems with thinking and/or memory',
        1,
        'Has there been a CHANGE in the last several years caused by thinking/memory problems? Yes = change; No = no change. Prefer an informant.',
      ),
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
    name: 'Geriatric Depression Scale-15 (GDS-15)',
    shortName: 'GDS-15',
    description:
      '15-item Yesavage short-form depression screen for older adults. Five items are reverse-scored (No = 1). Score 0–15.',
    category: 'geriatrics',
    tags: ['gds', 'depression', 'geriatrics', 'screening', 'yesavage'],
    whenToUse: 'Screening for depressive symptoms in adults typically ≥60 years, including those with mild cognitive impairment.',
    whyUse: 'Brief yes/no format avoids somatic items that confound depression screening in medically ill older adults. Score ≥5 warrants further evaluation.',
    inputs: [
      gdsReverse('gds1', 1, 'Are you basically satisfied with your life?'),
      gdsForward('gds2', 2, 'Have you dropped many of your activities and interests?'),
      gdsForward('gds3', 3, 'Do you feel that your life is empty?'),
      gdsForward('gds4', 4, 'Do you often get bored?'),
      gdsReverse('gds5', 5, 'Are you in good spirits most of the time?'),
      gdsForward('gds6', 6, 'Are you afraid that something bad is going to happen to you?'),
      gdsReverse('gds7', 7, 'Do you feel happy most of the time?'),
      gdsForward('gds8', 8, 'Do you often feel helpless?'),
      gdsForward('gds9', 9, 'Do you prefer to stay at home rather than going out and doing new things?'),
      gdsForward('gds10', 10, 'Do you feel you have more problems with memory than most?'),
      gdsReverse('gds11', 11, 'Do you think it is wonderful to be alive now?'),
      gdsForward('gds12', 12, 'Do you feel pretty worthless the way you are now?'),
      gdsReverse('gds13', 13, 'Do you feel full of energy?'),
      gdsForward('gds14', 14, 'Do you feel that your situation is hopeless?'),
      gdsForward('gds15', 15, 'Do you think that most people are better off than you are?'),
    ],
    calculate(values) {
      const score =
        gdsPoints(values.gds1, true) +
        gdsPoints(values.gds2, false) +
        gdsPoints(values.gds3, false) +
        gdsPoints(values.gds4, false) +
        gdsPoints(values.gds5, true) +
        gdsPoints(values.gds6, false) +
        gdsPoints(values.gds7, true) +
        gdsPoints(values.gds8, false) +
        gdsPoints(values.gds9, false) +
        gdsPoints(values.gds10, false) +
        gdsPoints(values.gds11, true) +
        gdsPoints(values.gds12, false) +
        gdsPoints(values.gds13, true) +
        gdsPoints(values.gds14, false) +
        gdsPoints(values.gds15, false);
      const r = riskFromThresholds(score, [
        {
          max: 4,
          level: 'normal',
          label: 'Normal range (0–4)',
          interpretation: `GDS-15 score ${score}/15: below the usual screening cutoff. Not indicative of depression on this screen — recheck if clinical concern persists.`,
        },
        {
          max: 9,
          level: 'moderate',
          label: 'Mild depression screen (5–9)',
          interpretation: `GDS-15 score ${score}/15: suggests mild depressive symptoms. Complete a diagnostic interview, review medical contributors, and consider treatment or geriatrics/psychiatry referral.`,
        },
        {
          max: 15,
          level: 'high',
          label: 'Moderate–severe screen (10–15)',
          interpretation: `GDS-15 score ${score}/15: suggests moderate to severe depressive symptoms. Prompt diagnostic evaluation, safety assessment, and treatment planning.`,
        },
      ]);
      return {
        score,
        unit: '/15',
        ...r,
        details: [
          { label: 'Reverse-scored items (No = 1)', value: '1, 5, 7, 11, 13' },
          { label: 'Cutoff', value: '≥5 possible depression; 10–15 moderate/severe screen' },
        ],
        recommendations: [
          'GDS-15 is a screen, not a diagnosis',
          'Assess suicide risk if score is elevated or the patient expresses hopelessness',
        ],
      };
    },
    evidence: {
      summary:
        'GDS-15 (Sheikh & Yesavage 1986) scores 1 point per depressive response. Reverse-scored items 1, 5, 7, 11, and 13 score 1 for No; remaining items score 1 for Yes. Conventional bands: 0–4 normal, 5–9 mild, 10–15 moderate/severe.',
      formula: 'Sum of 15 items (0 or 1); reverse items 1, 5, 7, 11, 13',
      validation: 'Widely validated in community, clinic, and long-term care samples; usable with mild cognitive impairment.',
      references: [
        {
          title: 'Geriatric Depression Scale (GDS): recent evidence and development of a shorter version',
          citation: 'Sheikh JI, Yesavage JA. Clin Gerontol. 1986',
          year: 1986,
          doi: '10.1300/J018v05n01_09',
        },
        {
          title: 'Short versions of the geriatric depression scale: a study of their validity for the diagnosis of a major depressive episode according to ICD-10 and DSM-IV',
          citation: 'Almeida OP, Almeida SA. Int J Geriatr Psychiatry. 1999',
          year: 1999,
          pmid: '10521885',
          doi: '10.1002/(sici)1099-1166(199910)14:10<858::aid-gps35>3.0.co;2-8',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score 0–4', actions: ['Routine monitoring', 'Re-screen if function, sleep, or affect change'] },
      { condition: 'Score ≥5', actions: ['Diagnostic interview', 'Review meds/medical illness', 'Consider SSRI/psychotherapy per geriatrics guidance', 'Safety screen'] },
      { condition: 'Score ≥10 or suicidal ideation', actions: ['Urgent mental-health evaluation', 'Do not leave at-risk patients unsupervised'] },
    ],
    pearls: [
      'Items 1, 5, 7, 11, and 13 are reverse-scored (No is the depressive answer).',
      'Does not replace a clinical diagnosis; somatic-light items help in medically ill elders.',
    ],
  },
  {
    id: 'cornell-dementia',
    name: 'Cornell Scale for Depression in Dementia (CSDD)',
    shortName: 'CSDD',
    description: 'Cornell Scale for Depression in Dementia: 19 clinician/caregiver-rated items across 5 domains (0–38), or direct total score.',
    category: 'psychiatry',
    tags: ['cornell', 'depression', 'dementia', 'csdd', 'geriatrics'],
    whenToUse: 'When assessing depressive symptoms in patients with cognitive impairment or dementia.',
    whyUse: 'Relies on caregiver informant interview and clinical observation; robust when patient insight or recall is impaired.',
    inputs: [
      selectInput('entryMode', 'Entry mode', [
        { label: 'Complete 19-item clinician rating', value: 'survey' },
        { label: 'Direct score override', value: 'direct' },
      ]),
      numberInput('score', 'Cornell total score (0–38, direct mode)', {
        min: 0,
        max: 38,
        defaultValue: 6,
        helpText: 'Used only if direct override is selected.',
      }),
      selectInput('csdd_anxiety', '1. Anxiety (anxious expression, rumination, worrying)', [
        { label: '0 — Absent', value: 0 },
        { label: '1 — Mild or intermittent', value: 1 },
        { label: '2 — Severe', value: 2 },
      ]),
      selectInput('csdd_sadness', '2. Sadness (sad expression, sad voice, tearfulness)', [
        { label: '0 — Absent', value: 0 },
        { label: '1 — Mild or intermittent', value: 1 },
        { label: '2 — Severe', value: 2 },
      ]),
      selectInput('csdd_reactivity', '3. Lack of reactivity to pleasant events', [
        { label: '0 — Absent', value: 0 },
        { label: '1 — Mild or intermittent', value: 1 },
        { label: '2 — Severe', value: 2 },
      ]),
      selectInput('csdd_irritability', '4. Irritability (short-tempered, easily annoyed)', [
        { label: '0 — Absent', value: 0 },
        { label: '1 — Mild or intermittent', value: 1 },
        { label: '2 — Severe', value: 2 },
      ]),
      selectInput('csdd_agitation', '5. Agitation (restlessness, hand-wringing, pacing)', [
        { label: '0 — Absent', value: 0 },
        { label: '1 — Mild or intermittent', value: 1 },
        { label: '2 — Severe', value: 2 },
      ]),
      selectInput('csdd_retardation', '6. Retardation (slow movement, slow speech, slow reactions)', [
        { label: '0 — Absent', value: 0 },
        { label: '1 — Mild or intermittent', value: 1 },
        { label: '2 — Severe', value: 2 },
      ]),
      selectInput('csdd_somatic', '7. Multiple physical complaints (score 0 if GI only)', [
        { label: '0 — Absent', value: 0 },
        { label: '1 — Mild or intermittent', value: 1 },
        { label: '2 — Severe', value: 2 },
      ]),
      selectInput('csdd_loss_interest', '8. Loss of interest (less involved in usual activities)', [
        { label: '0 — Absent', value: 0 },
        { label: '1 — Mild or intermittent', value: 1 },
        { label: '2 — Severe', value: 2 },
      ]),
      selectInput('csdd_appetite', '9. Appetite loss (eating less than usual)', [
        { label: '0 — Absent', value: 0 },
        { label: '1 — Mild or intermittent', value: 1 },
        { label: '2 — Severe', value: 2 },
      ]),
      selectInput('csdd_weight', '10. Weight loss (severe = >5 lbs in past month)', [
        { label: '0 — Absent', value: 0 },
        { label: '1 — Mild or intermittent', value: 1 },
        { label: '2 — Severe', value: 2 },
      ]),
      selectInput('csdd_energy', '11. Lack of energy (fatigues easily, unable to sustain activity)', [
        { label: '0 — Absent', value: 0 },
        { label: '1 — Mild or intermittent', value: 1 },
        { label: '2 — Severe', value: 2 },
      ]),
      selectInput('csdd_diurnal', '12. Diurnal variation of mood (symptoms worse in morning)', [
        { label: '0 — Absent', value: 0 },
        { label: '1 — Mild or intermittent', value: 1 },
        { label: '2 — Severe', value: 2 },
      ]),
      selectInput('csdd_initial_insomnia', '13. Difficulty falling asleep (later than usual)', [
        { label: '0 — Absent', value: 0 },
        { label: '1 — Mild or intermittent', value: 1 },
        { label: '2 — Severe', value: 2 },
      ]),
      selectInput('csdd_middle_insomnia', '14. Multiple nocturnal awakenings', [
        { label: '0 — Absent', value: 0 },
        { label: '1 — Mild or intermittent', value: 1 },
        { label: '2 — Severe', value: 2 },
      ]),
      selectInput('csdd_early_awakening', '15. Early morning awakening (earlier than usual)', [
        { label: '0 — Absent', value: 0 },
        { label: '1 — Mild or intermittent', value: 1 },
        { label: '2 — Severe', value: 2 },
      ]),
      selectInput('csdd_suicide', '16. Suicide (feels life not worth living, wishes to die, gestures)', [
        { label: '0 — Absent', value: 0 },
        { label: '1 — Mild or intermittent', value: 1 },
        { label: '2 — Severe', value: 2 },
      ]),
      selectInput('csdd_self_esteem', '17. Poor self-esteem (self-blame, self-depreciation, guilt)', [
        { label: '0 — Absent', value: 0 },
        { label: '1 — Mild or intermittent', value: 1 },
        { label: '2 — Severe', value: 2 },
      ]),
      selectInput('csdd_pessimism', '18. Pessimism (anticipation of the worst)', [
        { label: '0 — Absent', value: 0 },
        { label: '1 — Mild or intermittent', value: 1 },
        { label: '2 — Severe', value: 2 },
      ]),
      selectInput('csdd_delusions', '19. Mood-congruent delusions (poverty, illness, guilt)', [
        { label: '0 — Absent', value: 0 },
        { label: '1 — Mild or intermittent', value: 1 },
        { label: '2 — Severe', value: 2 },
      ]),
    ],
    calculate(values) {
      const mode = String(values.entryMode ?? 'survey');
      let score = 0;
      let suicideItem = 0;

      if (mode === 'direct' || (values.score !== undefined && values.entryMode === undefined && values.csdd_anxiety === undefined)) {
        score = num(values.score, 6);
      } else {
        const items = [
          'csdd_anxiety', 'csdd_sadness', 'csdd_reactivity', 'csdd_irritability',
          'csdd_agitation', 'csdd_retardation', 'csdd_somatic', 'csdd_loss_interest',
          'csdd_appetite', 'csdd_weight', 'csdd_energy', 'csdd_diurnal',
          'csdd_initial_insomnia', 'csdd_middle_insomnia', 'csdd_early_awakening',
          'csdd_suicide', 'csdd_self_esteem', 'csdd_pessimism', 'csdd_delusions'
        ];
        for (const item of items) {
          score += num(values[item], 0);
        }
        suicideItem = num(values.csdd_suicide, 0);
      }

      const r = riskFromThresholds(score, [
        {
          max: 5,
          level: 'low',
          label: 'Below depression threshold',
          interpretation: 'CSDD ≤5: no significant depressive symptoms detected. Monitor longitudinally and re-screen if behavioral changes emerge.',
        },
        {
          max: 7,
          level: 'moderate',
          label: 'Possible / borderline depression',
          interpretation: 'CSDD 6–7: borderline depressive symptoms. Clinical evaluation, environmental optimization, and close interval follow-up recommended.',
        },
        {
          max: 11,
          level: 'high',
          label: 'Probable depression',
          interpretation: 'CSDD 8–11: probable major depressive episode in dementia. Multidisciplinary intervention, environmental/social activation, and consideration of antidepressant therapy.',
        },
        {
          max: 38,
          level: 'critical',
          label: 'Definite / severe depression',
          interpretation: 'CSDD ≥12: definite major depression. Active pharmacotherapy, safety assessment, behavioral management, and caregiver support required.',
        },
      ]);

      const details = [
        { label: 'Total score', value: `${score} / 38` },
        { label: 'Depression cutoff', value: 'Score ≥8 = Probable depression; ≥12 = Definite depression' },
        { label: 'Entry mode', value: mode === 'survey' ? '19-item rating' : 'Direct override' },
      ];

      if (mode === 'survey' && suicideItem > 0) {
        details.push({
          label: 'Suicide flag (Item 16)',
          value: suicideItem === 2 ? 'SEVERE (Gestures/attempts/active)' : 'MILD (Life not worth living)',
        });
      }

      return {
        score,
        unit: '/38',
        ...r,
        details,
        alerts: (mode === 'survey' && suicideItem > 0) ? [
          'Suicidal ideation or gesture endorsed on CSDD item 16. Immediate clinical safety assessment required.'
        ] : undefined,
      };
    },
    evidence: {
      summary:
        'Cornell Scale for Depression in Dementia (CSDD): 19 items across 5 domains (mood-related signs, behavioral disturbance, physical signs, cyclic functions, ideational disturbance). Score ≥8 suggests probable depression; ≥12 indicates definite major depression.',
      formula: 'Sum of 19 items (each 0–2, total 0–38)',
      validation: 'Alexopoulos GS et al. Validated against DSM criteria in dementia patients, displaying high inter-rater reliability (0.67–0.98) and sensitivity.',
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
        condition: 'CSDD ≥8',
        actions: [
          'Rule out underlying medical triggers, infection, or pain exacerbating mood',
          'Optimize environmental structure, daytime engagement, and pleasant events',
          'Consider evidence-based pharmacotherapy (e.g. SSRI) while monitoring side effects',
          'Screen caregiver stress and provide respite resources',
        ],
      },
    ],
    pearls: [
      'Scored based on semi-structured interviews with both caregiver and patient, combined with clinician observation.',
      'Somatic items can sometimes overlap with medical co-morbidities; emphasize psychological/mood symptoms.',
    ],
  },
  {
    id: 'zarit-burden',
    name: 'Zarit Burden Interview (Caregiver Strain)',
    shortName: 'ZBI',
    description: 'Zarit Burden Interview (ZBI-12 Short Form, 0–48; or classic ZBI-22 direct total, 0–88) for caregiver burden assessment.',
    category: 'psychiatry',
    tags: ['zarit', 'caregiver', 'burden', 'dementia', 'support'],
    whenToUse: 'Assessing caregiver strain, burnout, and depression risk in caregivers of patients with dementia or chronic illness.',
    whyUse: 'Validates caregiver distress, identifies high-burden thresholds (ZBI-12 ≥17), and triggers respite, counseling, and social support.',
    inputs: [
      selectInput('entryMode', 'Entry mode', [
        { label: 'Complete 12-item ZBI Short Form questionnaire', value: 'survey' },
        { label: 'Direct total score override', value: 'direct' },
      ]),
      selectInput('form', 'Form (if direct override)', [
        { label: 'ZBI-12 short (0–48)', value: 'z12' },
        { label: 'ZBI-22 classic (0–88)', value: 'z22' },
      ]),
      numberInput('score', 'Total score (direct mode)', {
        min: 0,
        max: 88,
        defaultValue: 12,
        helpText: 'Used only if direct override is selected.',
      }),
      selectInput('z1', '1. Do you feel that because of the time you spend with your relative that you don’t have enough time for yourself?', [
        { label: '0 — Never', value: 0 },
        { label: '1 — Rarely', value: 1 },
        { label: '2 — Sometimes', value: 2 },
        { label: '3 — Quite frequently', value: 3 },
        { label: '4 — Nearly always', value: 4 },
      ], 1),
      selectInput('z2', '2. Do you feel stressed between caring for your relative and trying to meet other responsibilities for your family or work?', [
        { label: '0 — Never', value: 0 },
        { label: '1 — Rarely', value: 1 },
        { label: '2 — Sometimes', value: 2 },
        { label: '3 — Quite frequently', value: 3 },
        { label: '4 — Nearly always', value: 4 },
      ], 1),
      selectInput('z3', '3. Do you feel angry when you are around your relative?', [
        { label: '0 — Never', value: 0 },
        { label: '1 — Rarely', value: 1 },
        { label: '2 — Sometimes', value: 2 },
        { label: '3 — Quite frequently', value: 3 },
        { label: '4 — Nearly always', value: 4 },
      ], 1),
      selectInput('z4', '4. Do you feel that your relative currently affects your relationship with other family members or friends in a negative way?', [
        { label: '0 — Never', value: 0 },
        { label: '1 — Rarely', value: 1 },
        { label: '2 — Sometimes', value: 2 },
        { label: '3 — Quite frequently', value: 3 },
        { label: '4 — Nearly always', value: 4 },
      ], 1),
      selectInput('z5', '5. Do you feel strained when you are around your relative?', [
        { label: '0 — Never', value: 0 },
        { label: '1 — Rarely', value: 1 },
        { label: '2 — Sometimes', value: 2 },
        { label: '3 — Quite frequently', value: 3 },
        { label: '4 — Nearly always', value: 4 },
      ], 1),
      selectInput('z6', '6. Do you feel that your health has suffered because of your involvement with your relative?', [
        { label: '0 — Never', value: 0 },
        { label: '1 — Rarely', value: 1 },
        { label: '2 — Sometimes', value: 2 },
        { label: '3 — Quite frequently', value: 3 },
        { label: '4 — Nearly always', value: 4 },
      ], 1),
      selectInput('z7', '7. Do you feel that you don’t have as much privacy as you would like because of your relative?', [
        { label: '0 — Never', value: 0 },
        { label: '1 — Rarely', value: 1 },
        { label: '2 — Sometimes', value: 2 },
        { label: '3 — Quite frequently', value: 3 },
        { label: '4 — Nearly always', value: 4 },
      ], 1),
      selectInput('z8', '8. Do you feel that your social life has suffered because you are caring for your relative?', [
        { label: '0 — Never', value: 0 },
        { label: '1 — Rarely', value: 1 },
        { label: '2 — Sometimes', value: 2 },
        { label: '3 — Quite frequently', value: 3 },
        { label: '4 — Nearly always', value: 4 },
      ], 1),
      selectInput('z9', '9. Do you feel you have lost control of your life since your relative’s illness?', [
        { label: '0 — Never', value: 0 },
        { label: '1 — Rarely', value: 1 },
        { label: '2 — Sometimes', value: 2 },
        { label: '3 — Quite frequently', value: 3 },
        { label: '4 — Nearly always', value: 4 },
      ], 1),
      selectInput('z10', '10. Do you feel uncertain about what to do about your relative?', [
        { label: '0 — Never', value: 0 },
        { label: '1 — Rarely', value: 1 },
        { label: '2 — Sometimes', value: 2 },
        { label: '3 — Quite frequently', value: 3 },
        { label: '4 — Nearly always', value: 4 },
      ], 1),
      selectInput('z11', '11. Do you feel you should be doing more for your relative?', [
        { label: '0 — Never', value: 0 },
        { label: '1 — Rarely', value: 1 },
        { label: '2 — Sometimes', value: 2 },
        { label: '3 — Quite frequently', value: 3 },
        { label: '4 — Nearly always', value: 4 },
      ], 1),
      selectInput('z12', '12. Do you feel you could do a better job in caring for your relative?', [
        { label: '0 — Never', value: 0 },
        { label: '1 — Rarely', value: 1 },
        { label: '2 — Sometimes', value: 2 },
        { label: '3 — Quite frequently', value: 3 },
        { label: '4 — Nearly always', value: 4 },
      ], 1),
    ],
    calculate(values) {
      const mode = String(values.entryMode ?? 'survey');
      const form = String(values.form ?? 'z12');
      let score = 0;

      if (mode === 'direct' || (values.score !== undefined && values.entryMode === undefined && values.z1 === undefined)) {
        score = num(values.score, 12);
      } else {
        for (let i = 1; i <= 12; i++) {
          score += num(values[`z${i}`], 1);
        }
      }

      if (mode === 'direct' && form === 'z22') {
        const r = riskFromThresholds(score, [
          {
            max: 20,
            level: 'low',
            label: 'Little or no burden',
            interpretation: 'ZBI-22 0–20: little or no burden — offer anticipatory education and community resource directory.',
          },
          {
            max: 40,
            level: 'moderate',
            label: 'Mild to moderate burden',
            interpretation: 'ZBI-22 21–40: mild–moderate burden — stress management, caregiver skill-building, and peer support groups.',
          },
          {
            max: 60,
            level: 'high',
            label: 'Moderate to severe burden',
            interpretation: 'ZBI-22 41–60: moderate–severe burden — arrange formal respite services, social work consultation, and screen caregiver for depression.',
          },
          {
            max: 88,
            level: 'critical',
            label: 'Severe burden',
            interpretation: 'ZBI-22 61–88: severe caregiver burden — urgent multidisciplinary support plan, safety evaluation, and consideration of adult day care or residential care.',
          },
        ]);
        return {
          score,
          unit: '/88',
          ...r,
          details: [
            { label: 'Form', value: 'ZBI-22 Classic' },
            { label: 'Total score', value: `${score} / 88` },
            { label: 'Entry mode', value: 'Direct override' },
          ],
        };
      }

      // ZBI-12 Short Form
      const r = riskFromThresholds(score, [
        {
          max: 9,
          level: 'low',
          label: 'Low burden',
          interpretation: 'ZBI-12 0–9: low caregiver burden. Routine follow-up and anticipatory guidance.',
        },
        {
          max: 16,
          level: 'moderate',
          label: 'Moderate burden',
          interpretation: 'ZBI-12 10–16: moderate burden — proactive caregiver support, coping strategies, and local Alzheimer/dementia resources.',
        },
        {
          max: 48,
          level: 'high',
          label: 'High burden (≥17)',
          interpretation: 'ZBI-12 ≥17: high caregiver burden. Significantly elevated risk for caregiver burnout and clinical depression — mobilize formal respite, family conference, and clinical evaluation.',
        },
      ]);
      return {
        score,
        unit: '/48',
        ...r,
        details: [
          { label: 'Form', value: 'ZBI-12 Short Form' },
          { label: 'Total score', value: `${score} / 48` },
          { label: 'High burden threshold', value: 'Score ≥17 indicates high burden' },
          { label: 'Entry mode', value: mode === 'survey' ? '12-item questionnaire' : 'Direct override' },
        ],
      };
    },
    evidence: {
      summary:
        'Zarit Burden Interview (ZBI): evaluates caregiver strain across emotional, physical, social, and financial domains. The 12-item short form (ZBI-12) strongly correlates with the full 22-item version (r = 0.92–0.97), with scores ≥17 identifying high caregiver burden.',
      formula: 'Sum of 12 items (each 0–4, total 0–48) or full 22-item score (0–88)',
      validation: 'Bédard M et al. Validated the 12-item short version with exceptional internal consistency (Cronbach alpha 0.88) and predictive validity.',
      references: [
        {
          title: 'The Zarit Burden Interview: a new short version and screening version',
          citation: 'Bédard M et al. Gerontologist. 2001',
          year: 2001,
          pmid: '11565618',
          doi: '10.1093/geront/41.5.652',
        },
        {
          title: 'Relatives of the impaired elderly: correlates of feelings of burden',
          citation: 'Zarit SH et al. Gerontologist. 1980',
          year: 1980,
          pmid: '7203086',
          doi: '10.1093/geront/20.6.649',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'ZBI-12 ≥17 or ZBI-22 ≥41',
        actions: [
          'Social work / caregiver support program referral',
          'In-home respite, adult day services, or companion care',
          'Screen caregiver for clinical depression (PHQ-9) and anxiety (GAD-7)',
          'Advance care planning and future care trajectory counseling',
        ],
      },
    ],
    pearls: [
      'High caregiver burden is an independent predictor of premature nursing home placement.',
      'Caregiver depression often remits when structured respite and support services are implemented.',
    ],
  },
  {
    id: 'psqi',
    name: 'Pittsburgh Sleep Quality Index (PSQI)',
    shortName: 'PSQI',
    description: 'Pittsburgh Sleep Quality Index: 7 component scores (0–3 each, global 0–21) evaluating past-month sleep quality, or direct global score.',
    category: 'neurology',
    tags: ['psqi', 'sleep', 'insomnia', 'quality'],
    whenToUse: 'Comprehensive past-month sleep quality assessment in clinical sleep, psychiatric, or general medical encounters.',
    whyUse: 'Standard validated metric of sleep quality; global score >5 reliably distinguishes poor from good sleepers (89.6% sensitivity, 86.5% specificity).',
    inputs: [
      selectInput('entryMode', 'Entry mode', [
        { label: '7 Component Scores selector', value: 'survey' },
        { label: 'Direct global score override', value: 'direct' },
      ]),
      numberInput('global', 'PSQI global score (0–21, direct mode)', {
        min: 0,
        max: 21,
        defaultValue: 5,
        helpText: 'Used only if direct override is selected.',
      }),
      selectInput('comp1_quality', 'Component 1: Subjective sleep quality', [
        { label: '0 — Very good', value: 0 },
        { label: '1 — Fairly good', value: 1 },
        { label: '2 — Fairly bad', value: 2 },
        { label: '3 — Very bad', value: 3 }
      ]),
      selectInput('comp2_latency', 'Component 2: Sleep latency', [
        { label: '0 — Latency ≤15 min & ≤1 disturbance/week', value: 0 },
        { label: '1 — Latency 16–30 min or 1–2 disturbances/week', value: 1 },
        { label: '2 — Latency 31–60 min or 1–2 disturbances/week', value: 2 },
        { label: '3 — Latency >60 min or ≥3 disturbances/week', value: 3 }
      ]),
      selectInput('comp3_duration', 'Component 3: Sleep duration', [
        { label: '0 — >7 hours sleep per night', value: 0 },
        { label: '1 — 6–7 hours sleep per night', value: 1 },
        { label: '2 — 5–6 hours sleep per night', value: 2 },
        { label: '3 — <5 hours sleep per night', value: 3 }
      ]),
      selectInput('comp4_efficiency', 'Component 4: Habitual sleep efficiency', [
        { label: '0 — ≥85% sleep efficiency (hours slept / hours in bed)', value: 0 },
        { label: '1 — 75–84% sleep efficiency', value: 1 },
        { label: '2 — 65–74% sleep efficiency', value: 2 },
        { label: '3 — <65% sleep efficiency', value: 3 }
      ]),
      selectInput('comp5_disturbances', 'Component 5: Sleep disturbances', [
        { label: '0 — No sleep disturbances (wake up, bathroom, cough, snore, cold, hot)', value: 0 },
        { label: '1 — Mild disturbances (score 1–9 sum)', value: 1 },
        { label: '2 — Moderate disturbances (score 10–18 sum)', value: 2 },
        { label: '3 — Severe disturbances (score 19–27 sum)', value: 3 }
      ]),
      selectInput('comp6_medication', 'Component 6: Use of sleep medications', [
        { label: '0 — Not during the past month', value: 0 },
        { label: '1 — Less than once a week', value: 1 },
        { label: '2 — Once or twice a week', value: 2 },
        { label: '3 — Three or more times a week', value: 3 }
      ]),
      selectInput('comp7_dysfunction', 'Component 7: Daytime dysfunction', [
        { label: '0 — No problem staying awake / enthusiasm', value: 0 },
        { label: '1 — Mild problem staying awake / enthusiasm', value: 1 },
        { label: '2 — Moderate problem staying awake / enthusiasm', value: 2 },
        { label: '3 — Severe problem staying awake / enthusiasm', value: 3 }
      ]),
    ],
    calculate(values) {
      const mode = String(values.entryMode ?? 'survey');
      let score = 0;
      let c1 = 0, c2 = 0, c3 = 0, c4 = 0, c5 = 0, c6 = 0, c7 = 0;

      if (mode === 'direct' || (values.global !== undefined && values.entryMode === undefined && values.comp1_quality === undefined)) {
        score = num(values.global, 5);
      } else {
        c1 = num(values.comp1_quality, 0);
        c2 = num(values.comp2_latency, 1);
        c3 = num(values.comp3_duration, 1);
        c4 = num(values.comp4_efficiency, 0);
        c5 = num(values.comp5_disturbances, 1);
        c6 = num(values.comp6_medication, 0);
        c7 = num(values.comp7_dysfunction, 1);
        score = c1 + c2 + c3 + c4 + c5 + c6 + c7;
      }

      const r = riskFromThresholds(score, [
        {
          max: 5,
          level: 'low',
          label: 'Good sleep quality range (≤5)',
          interpretation: 'PSQI ≤5: indicates good overall sleep quality. Continue sleep hygiene best practices.',
        },
        {
          max: 10,
          level: 'moderate',
          label: 'Poor sleep quality (>5)',
          interpretation: 'PSQI 6–10: poor sleep quality. Screen for insomnia disorder, circadian disruption, restless legs, and obstructive sleep apnea.',
        },
        {
          max: 21,
          level: 'high',
          label: 'Markedly impaired sleep quality (≥11)',
          interpretation: 'PSQI ≥11: severe sleep disruption. First-line cognitive behavioral therapy for insomnia (CBT-I), formal sleep medicine referral, and review of contributing medical/psychiatric factors.',
        },
      ]);

      const details = [
        { label: 'Global score', value: `${score} / 21` },
        { label: 'Diagnostic cutoff', value: '>5 = Poor sleep quality (sensitivity 89.6%, specificity 86.5%)' },
        { label: 'Entry mode', value: mode === 'survey' ? '7 Component scores' : 'Direct override' },
      ];

      if (mode === 'survey') {
        details.push({ label: 'C1: Quality / C2: Latency', value: `${c1} / ${c2}` });
        details.push({ label: 'C3: Duration / C4: Efficiency', value: `${c3} / ${c4}` });
        details.push({ label: 'C5: Disturbance / C6: Meds / C7: Daytime', value: `${c5} / ${c6} / ${c7}` });
      }

      return {
        score,
        unit: '/21',
        ...r,
        details,
      };
    },
    evidence: {
      summary:
        'Pittsburgh Sleep Quality Index (PSQI): 19 self-rated questions generate 7 component scores (subjective sleep quality, sleep latency, sleep duration, habitual sleep efficiency, sleep disturbances, use of sleep medication, daytime dysfunction), each rated 0–3. The global score ranges 0–21, with >5 distinguishing poor from good sleepers.',
      formula: 'Sum of 7 component scores (each 0–3, global 0–21)',
      validation: 'Buysse DJ et al. Gold standard sleep quality instrument across clinical and research settings.',
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
          'Sleep diary tracking bedtime, waketime, and nighttime awakenings for 2 weeks',
          'Screen OSA with STOP-BANG and assess for restless legs symptoms',
          'Cognitive Behavioral Therapy for Insomnia (CBT-I) as initial first-line therapy',
          'Review alcohol, caffeine, nicotine, and stimulating prescription medications',
        ],
      },
    ],
    pearls: [
      'Component breakdown directs specific therapy (e.g. high C2/C4 suggests insomnia stimulus control; high C5 suggests OSA/GERD/nocturia).',
      'Does not replace objective polysomnography when sleep apnea, narcolepsy, or parasomnias are suspected.',
    ],
  },
  {
    id: 'restless-irlssg',
    name: 'IRLSSG Restless Legs Severity Scale (IRLS)',
    shortName: 'IRLS',
    description: 'International Restless Legs Syndrome Study Group rating scale: 10 items (0–4 each, total 0–40), or direct total score.',
    category: 'neurology',
    tags: ['rls', 'irls', 'restless legs', 'sleep', 'severity'],
    whenToUse: 'Quantifying symptom severity and monitoring treatment response after clinical confirmation of RLS diagnosis.',
    whyUse: 'Gold-standard 10-item outcome measure used in clinical practice and pharmaceutical trials with validated severity bands.',
    inputs: [
      selectInput('entryMode', 'Entry mode', [
        { label: 'Complete 10-item IRLSSG questionnaire', value: 'survey' },
        { label: 'Direct total score override', value: 'direct' },
      ]),
      numberInput('score', 'IRLS total (0–40, direct mode)', {
        min: 0,
        max: 40,
        defaultValue: 15,
        helpText: 'Used only if direct override is selected.',
      }),
      selectInput('irls1', '1. Overall discomfort in legs/arms due to RLS', [
        { label: '0 — None / Never', value: 0 },
        { label: '1 — Mild / 1 day/wk / <1 hr', value: 1 },
        { label: '2 — Moderate / 2–3 days/wk / 1–3 hrs', value: 2 },
        { label: '3 — Severe / 4–5 days/wk / 3–8 hrs', value: 3 },
        { label: '4 — Very severe / 6–7 days/wk / ≥8 hrs', value: 4 },
      ], 1),
      selectInput('irls2', '2. Need to move arms/legs because of RLS', [
        { label: '0 — None / Never', value: 0 },
        { label: '1 — Mild / 1 day/wk / <1 hr', value: 1 },
        { label: '2 — Moderate / 2–3 days/wk / 1–3 hrs', value: 2 },
        { label: '3 — Severe / 4–5 days/wk / 3–8 hrs', value: 3 },
        { label: '4 — Very severe / 6–7 days/wk / ≥8 hrs', value: 4 },
      ], 1),
      selectInput('irls3', '3. Relief of arm/leg discomfort from moving around', [
        { label: '0 — None / Never', value: 0 },
        { label: '1 — Mild / 1 day/wk / <1 hr', value: 1 },
        { label: '2 — Moderate / 2–3 days/wk / 1–3 hrs', value: 2 },
        { label: '3 — Severe / 4–5 days/wk / 3–8 hrs', value: 3 },
        { label: '4 — Very severe / 6–7 days/wk / ≥8 hrs', value: 4 },
      ], 1),
      selectInput('irls4', '4. Sleep disturbance due to RLS symptoms', [
        { label: '0 — None / Never', value: 0 },
        { label: '1 — Mild / 1 day/wk / <1 hr', value: 1 },
        { label: '2 — Moderate / 2–3 days/wk / 1–3 hrs', value: 2 },
        { label: '3 — Severe / 4–5 days/wk / 3–8 hrs', value: 3 },
        { label: '4 — Very severe / 6–7 days/wk / ≥8 hrs', value: 4 },
      ], 1),
      selectInput('irls5', '5. Daytime tiredness or sleepiness due to RLS', [
        { label: '0 — None / Never', value: 0 },
        { label: '1 — Mild / 1 day/wk / <1 hr', value: 1 },
        { label: '2 — Moderate / 2–3 days/wk / 1–3 hrs', value: 2 },
        { label: '3 — Severe / 4–5 days/wk / 3–8 hrs', value: 3 },
        { label: '4 — Very severe / 6–7 days/wk / ≥8 hrs', value: 4 },
      ], 1),
      selectInput('irls6', '6. Overall severity of RLS over the past week', [
        { label: '0 — None / Never', value: 0 },
        { label: '1 — Mild / 1 day/wk / <1 hr', value: 1 },
        { label: '2 — Moderate / 2–3 days/wk / 1–3 hrs', value: 2 },
        { label: '3 — Severe / 4–5 days/wk / 3–8 hrs', value: 3 },
        { label: '4 — Very severe / 6–7 days/wk / ≥8 hrs', value: 4 },
      ], 1),
      selectInput('irls7', '7. How often did RLS symptoms occur?', [
        { label: '0 — None / Never', value: 0 },
        { label: '1 — Mild / 1 day/wk / <1 hr', value: 1 },
        { label: '2 — Moderate / 2–3 days/wk / 1–3 hrs', value: 2 },
        { label: '3 — Severe / 4–5 days/wk / 3–8 hrs', value: 3 },
        { label: '4 — Very severe / 6–7 days/wk / ≥8 hrs', value: 4 },
      ], 1),
      selectInput('irls8', '8. Average duration of RLS symptoms on typical day', [
        { label: '0 — None / Never', value: 0 },
        { label: '1 — Mild / 1 day/wk / <1 hr', value: 1 },
        { label: '2 — Moderate / 2–3 days/wk / 1–3 hrs', value: 2 },
        { label: '3 — Severe / 4–5 days/wk / 3–8 hrs', value: 3 },
        { label: '4 — Very severe / 6–7 days/wk / ≥8 hrs', value: 4 },
      ], 1),
      selectInput('irls9', '9. Impact on daily activities (family, work, social)', [
        { label: '0 — None / Never', value: 0 },
        { label: '1 — Mild / 1 day/wk / <1 hr', value: 1 },
        { label: '2 — Moderate / 2–3 days/wk / 1–3 hrs', value: 2 },
        { label: '3 — Severe / 4–5 days/wk / 3–8 hrs', value: 3 },
        { label: '4 — Very severe / 6–7 days/wk / ≥8 hrs', value: 4 },
      ], 1),
      selectInput('irls10', '10. Mood disturbance from RLS (depressed, irritable, anxious)', [
        { label: '0 — None / Never', value: 0 },
        { label: '1 — Mild / 1 day/wk / <1 hr', value: 1 },
        { label: '2 — Moderate / 2–3 days/wk / 1–3 hrs', value: 2 },
        { label: '3 — Severe / 4–5 days/wk / 3–8 hrs', value: 3 },
        { label: '4 — Very severe / 6–7 days/wk / ≥8 hrs', value: 4 },
      ], 1),
    ],
    calculate(values) {
      const mode = String(values.entryMode ?? 'survey');
      let score = 0;

      if (mode === 'direct' || (values.score !== undefined && values.entryMode === undefined && values.irls1 === undefined)) {
        score = num(values.score, 15);
      } else {
        for (let i = 1; i <= 10; i++) {
          score += num(values[`irls${i}`], 1);
        }
      }

      const r = riskFromThresholds(score, [
        {
          max: 0,
          level: 'normal',
          label: 'No symptoms (0)',
          interpretation: 'IRLS 0: no restless legs symptoms endorsed in past week.',
        },
        {
          max: 10,
          level: 'low',
          label: 'Mild RLS (1–10)',
          interpretation: 'IRLS 1–10: mild severity. Check serum ferritin and transferrin saturation; lifestyle interventions and sleep hygiene.',
        },
        {
          max: 20,
          level: 'moderate',
          label: 'Moderate RLS (11–20)',
          interpretation: 'IRLS 11–20: moderate severity. Iron replacement if ferritin <75 ng/mL (or transferrin sat <20%); consider first-line pharmacotherapy (alpha-2-delta ligands: gabapentin / pregabalin) if quality of life impaired.',
        },
        {
          max: 30,
          level: 'high',
          label: 'Severe RLS (21–30)',
          interpretation: 'IRLS 21–30: severe RLS. Active pharmacotherapy indicated; avoid dopamine receptor antagonists, sedating antihistamines, and serotonergic agents that worsen RLS.',
        },
        {
          max: 40,
          level: 'critical',
          label: 'Very severe RLS (31–40)',
          interpretation: 'IRLS 31–40: very severe RLS. Sleep medicine or neurology consultation; evaluate for dopamine agonist augmentation if treated with pramipexole/ropinirole; IV iron formulation consideration.',
        },
      ]);
      return {
        score,
        unit: '/40',
        ...r,
        details: [
          { label: 'Total score', value: `${score} / 40` },
          { label: 'Severity bands', value: '1–10 Mild · 11–20 Mod · 21–30 Severe · 31–40 Very severe' },
          { label: 'Entry mode', value: mode === 'survey' ? '10-item questionnaire' : 'Direct override' },
        ],
      };
    },
    evidence: {
      summary:
        'International Restless Legs Scale (IRLS): 10 questions scored 0–4 assessing RLS discomfort, motor need to move, relief with movement, sleep disturbance, daytime impact, and frequency/severity over the past week (total 0–40).',
      formula: 'Sum of 10 items (each 0–4, total 0–40)',
      validation: 'Walters AS et al. Developed and validated by the International Restless Legs Syndrome Study Group (IRLSSG) with high test-retest reliability and sensitivity to therapeutic change.',
      references: [
        {
          title: 'Validation of the International Restless Legs Syndrome Study Group rating scale for restless legs syndrome',
          citation: 'Walters AS et al. Sleep Med. 2003',
          year: 2003,
          pmid: '14592342',
          doi: '10.1016/s1389-9457(02)00258-7',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'IRLS ≥11',
        actions: [
          'Check morning fasting serum ferritin and transferrin saturation (target ferritin >75 µg/L)',
          'First-line pharmacotherapy: alpha-2-delta ligands (gabapentin, pregabalin, or gabapentin enacarbil) preferred over dopamine agonists due to augmentation risk',
          'Eliminate exacerbating agents (first-generation antihistamines, metoclopramide, SSRIs/SNRIs if feasible)',
          'Evaluate for secondary RLS causes (end-stage renal disease, peripheral neuropathy, pregnancy)',
        ],
      },
    ],
    pearls: [
      'Current AASM/IRLSSG guidelines recommend alpha-2-delta ligands as first-line over dopamine agonists because of high long-term augmentation rates with dopamine agonists.',
      'Oral iron should be given on an empty stomach or with vitamin C; IV iron considered for severe refractory cases or poor GI absorption.',
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
      yesNo(
        'trauma',
        'Lifetime trauma exposure criterion (required before scoring symptoms)',
        null,
        'NCPTSD gate — Sometimes things happen that are unusually frightening, horrible, or traumatic (serious accident/fire, physical or sexual assault, disaster, war, seeing someone killed/seriously injured, or a loved one dying by homicide/suicide). Have you ever experienced this kind of event?',
      ),
      yesNo('q1', '1. In the past month: nightmares or unwanted thoughts of the event(s)', 1),
      yesNo('q2', '2. In the past month: tried hard not to think about it or avoided situations that remind you', 1),
      yesNo('q3', '3. In the past month: been constantly on guard, watchful, or easily startled', 1),
      yesNo('q4', '4. In the past month: felt numb or detached from people, activities, or surroundings', 1),
      yesNo(
        'q5',
        '5. In the past month: felt guilty or unable to stop blaming yourself or others for the event(s) or problems they caused',
        1,
      ),
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
          pmid: '27170304',
          doi: '10.1007/s11606-016-3703-5',
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
        helpText: 'Enter the scored total from the official/institutional CIWA-B form (typically ~20 items, 0–80). Do not score items from this screen.',
      }),
      yesNo('seizureHx', 'History of withdrawal seizures', 0),
      yesNo('highDose', 'High-dose or prolonged benzodiazepine use', 0, 'High-dose often >40 mg diazepam-equivalent per day, or daily use for weeks–months (local protocol).'),
      yesNo('concurrentAlcohol', 'Concurrent alcohol use disorder', 0),
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
          title: 'A clinical scale to assess benzodiazepine withdrawal',
          citation: 'Busto UE, Sykora K, Sellers EM. J Clin Psychopharmacol. 1989',
          year: 1989,
          pmid: '2574193',
          doi: '10.1097/00004714-198912000-00005',
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
      selectInput(
        'sex',
        'Patient sex (scoring differs)',
        [
          { label: 'Female', value: 'f' },
          { label: 'Male', value: 'm' },
        ],
        'f',
        'ORT is sex-specific. Family-history alcohol, illegal-drug, and preadolescent sexual-abuse weights differ by sex — see each item. Do not trust a generic +N chip on those items.',
      ),
      yesNo('fhAlcohol', 'Family history: alcohol abuse (+1 F / +3 M)', null, 'Webster ORT: +1 if female, +3 if male.'),
      yesNo('fhIllegal', 'Family history: illegal drug abuse (+2 F / +3 M)', null, 'Webster ORT: +2 if female, +3 if male.'),
      yesNo('fhRx', 'Family history: prescription drug abuse', 4, '+4 points regardless of sex.'),
      yesNo('phAlcohol', 'Personal history: alcohol abuse', 3, '+3 points regardless of sex.'),
      yesNo('phIllegal', 'Personal history: illegal drug abuse', 4, '+4 points regardless of sex.'),
      yesNo('phRx', 'Personal history: prescription drug abuse', 5, '+5 points regardless of sex.'),
      yesNo('age', 'Age 16–45 years', 1, '+1 if current age is 16–45 years.'),
      yesNo(
        'sexualAbuse',
        'History of preadolescent sexual abuse (+3 F / +0 M)',
        null,
        'Webster ORT: +3 if female, +0 if male (still record the history).',
      ),
      yesNo(
        'psychAdd',
        'Psychiatric history: ADHD, OCD, bipolar, or schizophrenia',
        2,
        '+2 if any of ADHD, OCD, bipolar disorder, or schizophrenia.',
      ),
      yesNo('psychDep', 'Psychiatric history: depression', 1, '+1 if depression history.'),
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
