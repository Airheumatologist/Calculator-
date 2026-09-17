import type { Calculator } from '../../types/calculator';
import { num, bool, str, round, yesNo, selectInput, numberInput, riskFromThresholds } from '../../utils/helpers';

/** Shared 0–4 "Never → Very often" frequency options (COMM-style). */
const FREQ_04 = [
  { label: 'Never', value: 0, points: 0 },
  { label: 'Seldom', value: 1, points: 1 },
  { label: 'Sometimes', value: 2, points: 2 },
  { label: 'Often', value: 3, points: 3 },
  { label: 'Very often', value: 4, points: 4 },
];

/** Shared 0–4 "days in the past 30 days" band options (BAM-style). */
const DAYS_30 = [
  { label: '0', value: 0, points: 0 },
  { label: '1–3', value: 1, points: 1 },
  { label: '4–8', value: 2, points: 2 },
  { label: '9–15', value: 3, points: 3 },
  { label: '16–30', value: 4, points: 4 },
];

/** Shared 0–4 "Not at all → Extremely" intensity options (BAM-style). */
const EXTENT_04 = [
  { label: 'Not at all', value: 0, points: 0 },
  { label: 'Slightly', value: 1, points: 1 },
  { label: 'Moderately', value: 2, points: 2 },
  { label: 'Considerably', value: 3, points: 3 },
  { label: 'Extremely', value: 4, points: 4 },
];

/** AIMS/BFCRS-style 0–4 severity anchors (None / Minimal / Mild / Moderate / Severe). */
const SEVERITY_04 = [
  { label: 'None', value: 0, points: 0 },
  { label: 'Minimal, may be extreme normal', value: 1, points: 1 },
  { label: 'Mild', value: 2, points: 2 },
  { label: 'Moderate', value: 3, points: 3 },
  { label: 'Severe', value: 4, points: 4 },
];

/** Select where "No" is the endorsed (scored) answer — for reverse-keyed items. */
const yesNoReversed = (id: string, label: string, helpText: string, exampleValue?: string) =>
  selectInput(
    id,
    label,
    [
      { label: 'Yes', value: 'yes', points: 0 },
      { label: 'No', value: 'no', points: 1 },
    ],
    exampleValue,
    helpText
  );

/** Wave 8 — psychiatry, screening, addiction, and DSM-5 criteria instruments. */
export const wave8PsychCalcs: Calculator[] = [
  // ─── 1. Edinburgh Postnatal Depression Scale (EPDS) ─────────────────────────
  {
    id: 'epds',
    name: 'Edinburgh Postnatal Depression Scale (EPDS)',
    shortName: 'EPDS',
    description:
      'Cox 10-item self-report screen for postnatal depression. Each item scored 0–3 over the past 7 days; ≥10 is a positive screen in most protocols.',
    category: 'obstetrics',
    tags: ['epds', 'postnatal', 'postpartum', 'depression', 'screening', 'cox', 'perinatal'],
    whenToUse:
      'Screening women during pregnancy and in the postnatal period for possible depression. Recommended at the first prenatal contact and postpartum visits by ACOG/USPSTF-style programs.',
    whyUse:
      'Most widely validated perinatal depression screen; detects both depressive and anxiety symptoms and includes a self-harm item that mandates immediate assessment when endorsed.',
    isQuestionnaire: true,
    inputs: [
      selectInput('q1', '1. I have been able to laugh and see the funny side of things', [
        { label: 'As much as I always could', value: 0, points: 0 },
        { label: 'Not quite so much now', value: 1, points: 1 },
        { label: 'Definitely not so much now', value: 2, points: 2 },
        { label: 'Not at all', value: 3, points: 3 },
      ], 0, 'In the past 7 days.'),
      selectInput('q2', '2. I have looked forward with enjoyment to things', [
        { label: 'As much as I ever did', value: 0, points: 0 },
        { label: 'Rather less than I used to', value: 1, points: 1 },
        { label: 'Definitely less than I used to', value: 2, points: 2 },
        { label: 'Hardly at all', value: 3, points: 3 },
      ], 0, 'In the past 7 days.'),
      selectInput('q3', '3. I have blamed myself unnecessarily when things went wrong', [
        { label: 'No, never', value: 0, points: 0 },
        { label: 'Not very often', value: 1, points: 1 },
        { label: 'Yes, some of the time', value: 2, points: 2 },
        { label: 'Yes, most of the time', value: 3, points: 3 },
      ], 1, 'In the past 7 days.'),
      selectInput('q4', '4. I have been anxious or worried for no good reason', [
        { label: 'No, not at all', value: 0, points: 0 },
        { label: 'Hardly ever', value: 1, points: 1 },
        { label: 'Yes, sometimes', value: 2, points: 2 },
        { label: 'Yes, very often', value: 3, points: 3 },
      ], 0, 'In the past 7 days.'),
      selectInput('q5', '5. I have felt scared or panicky for no very good reason', [
        { label: 'No, not at all', value: 0, points: 0 },
        { label: 'No, not much', value: 1, points: 1 },
        { label: 'Yes, sometimes', value: 2, points: 2 },
        { label: 'Yes, quite a lot', value: 3, points: 3 },
      ], 0, 'In the past 7 days.'),
      selectInput('q6', '6. Things have been getting on top of me', [
        { label: 'No, I have been coping as well as ever', value: 0, points: 0 },
        { label: 'No, most of the time I have coped quite well', value: 1, points: 1 },
        { label: "Yes, sometimes I haven't been coping as well as usual", value: 2, points: 2 },
        { label: "Yes, most of the time I haven't been able to cope at all", value: 3, points: 3 },
      ], 1, 'In the past 7 days.'),
      selectInput('q7', '7. I have been so unhappy that I have had difficulty sleeping', [
        { label: 'No, not at all', value: 0, points: 0 },
        { label: 'Not very often', value: 1, points: 1 },
        { label: 'Yes, sometimes', value: 2, points: 2 },
        { label: 'Yes, most of the time', value: 3, points: 3 },
      ], 0, 'In the past 7 days.'),
      selectInput('q8', '8. I have felt sad or miserable', [
        { label: 'No, not at all', value: 0, points: 0 },
        { label: 'Not very often', value: 1, points: 1 },
        { label: 'Yes, quite often', value: 2, points: 2 },
        { label: 'Yes, most of the time', value: 3, points: 3 },
      ], 0, 'In the past 7 days.'),
      selectInput('q9', '9. I have been so unhappy that I have been crying', [
        { label: 'No, never', value: 0, points: 0 },
        { label: 'Only occasionally', value: 1, points: 1 },
        { label: 'Yes, quite often', value: 2, points: 2 },
        { label: 'Yes, most of the time', value: 3, points: 3 },
      ], 0, 'In the past 7 days.'),
      selectInput('q10', '10. The thought of harming myself has occurred to me', [
        { label: 'Never', value: 0, points: 0 },
        { label: 'Hardly ever', value: 1, points: 1 },
        { label: 'Sometimes', value: 2, points: 2 },
        { label: 'Yes, quite often', value: 3, points: 3 },
      ], 0, 'In the past 7 days. Any response other than "Never" requires an immediate clinical safety assessment.'),
    ],
    calculate(values) {
      let score = 0;
      for (let i = 1; i <= 10; i++) score += num(values[`q${i}`]);
      const selfHarm = num(values.q10) > 0;
      const r = riskFromThresholds(score, [
        {
          max: 9,
          level: 'low',
          label: 'Negative screen (<10)',
          interpretation: `EPDS ${score}/30. Below the usual ≥10 positive-screen cutoff — depression unlikely, but clinical judgment prevails; rescreen if symptoms emerge.`,
        },
        {
          max: 12,
          level: 'moderate',
          label: 'Positive screen (10–12)',
          interpretation: `EPDS ${score}/30. Positive screen at the standard ≥10 cutoff — refer for a clinical interview to confirm postnatal depression and assess severity.`,
        },
        {
          max: 30,
          level: 'high',
          label: 'Probable depression (≥13)',
          interpretation: `EPDS ${score}/30. Above the ≥13 band associated with probable depressive illness in validation studies — prompt mental-health referral is indicated.`,
        },
      ]);
      return {
        score,
        unit: 'points (0–30)',
        ...r,
        details: [
          { label: 'Standard cutoff', value: '≥10 = positive screen (varies by institution)' },
          { label: 'Item 10 (self-harm)', value: selfHarm ? 'Endorsed — safety assessment required' : 'Not endorsed' },
        ],
        recommendations: selfHarm
          ? [
              'Item 10 endorsed: perform an immediate suicide risk assessment and safety plan; do not leave the patient unattended if risk is acute.',
              'Urgent psychiatric/perinatal mental health referral.',
              'US: call or text 988 (Suicide & Crisis Lifeline) for acute support.',
            ]
          : score >= 10
            ? [
                'Refer for diagnostic assessment of postnatal depression (clinical interview ± PHQ-9).',
                'Discuss treatment options: psychotherapy first-line for mild–moderate; consider SSRI and severity for moderate–severe.',
              ]
            : ['Routine rescreening at subsequent perinatal contacts.', 'Educate on warning signs of postpartum depression/psychosis.'],
        alerts: selfHarm
          ? ['EPDS item 10 positive: thoughts of self-harm endorsed. Complete a direct suicide risk assessment now — postpartum patients warrant urgent evaluation. 988 Suicide & Crisis Lifeline (US).']
          : undefined,
      };
    },
    evidence: {
      summary:
        '10 self-report items rated 0–3 for the past 7 days (total 0–30). The conventional positive-screen cutoff is ≥10; ≥13 approaches the band for probable major depression in validation work. Item 10 screens self-harm ideation.',
      formula: 'Sum of 10 items (each 0–3), range 0–30',
      validation:
        'Cox, Holden & Sagovsky (1987) validated against RDC depression diagnoses (sensitivity 86%, specificity 78% at the published cutoff in the original sample). Cutoffs vary across translations and studies (9–13); a cutoff of ≥10 is commonly used.',
      references: [
        {
          title: 'Detection of postnatal depression. Development of the 10-item Edinburgh Postnatal Depression Scale',
          citation: 'Cox JL, Holden JM, Sagovsky R. Br J Psychiatry. 1987;150:782-786',
          year: 1987,
          pmid: '3651732',
          doi: '10.1192/bjp.150.6.782',
        },
      ],
    },
    nextSteps: [
      { condition: 'EPDS ≥10', actions: ['Diagnostic interview for MDD', 'Assess functioning and support', 'Discuss psychotherapy ± pharmacotherapy'] },
      { condition: 'Item 10 >0', actions: ['Immediate suicide risk assessment', 'Safety plan', 'Urgent psychiatric referral if active ideation/plan'] },
    ],
    pearls: [
      'EPDS screens for depression AND anxiety (items 4–6) — an "anxiety subscale" is sometimes reported.',
      'Any endorsement of item 10 requires direct assessment regardless of total score.',
      'Postpartum psychosis is a psychiatric emergency and is NOT captured by the EPDS.',
    ],
  },

  // ─── 2. ED-SAFE Patient Safety Screener 3 (PSS-3) ───────────────────────────
  {
    id: 'pss-3',
    name: 'ED-SAFE Patient Safety Screener 3 (PSS-3)',
    shortName: 'PSS-3',
    description:
      'Boudreaux 3-item universal ED suicide screen: depression (2 wk), active suicidal ideation (2 wk), lifetime suicide attempt. Acute positive = recent ideation or attempt within 6 months.',
    category: 'psychiatry',
    tags: ['pss-3', 'suicide', 'screening', 'emergency', 'ed-safe', 'boudreaux', 'crisis'],
    whenToUse:
      'Universal screening of ED patients — including those presenting with non-psychiatric complaints — for suicide risk. Also usable in urgent care and primary care.',
    whyUse:
      'Brief 3-item screen validated against the Beck Scale for Suicide Ideation; in ED-SAFE it nearly doubled detection of suicide risk when applied universally.',
    isQuestionnaire: true,
    inputs: [
      selectInput('q1', 'Over the past two weeks, have you felt down, depressed, or hopeless?', [
        { label: 'No', value: 'no' },
        { label: 'Yes', value: 'yes' },
        { label: 'Refused to answer', value: 'refused' },
      ], 'no', 'PSS-3 item 1 — depressive symptoms. Not counted in the formal screen-positive rule but flags need for depression evaluation.'),
      selectInput('q2', 'Over the past two weeks, have you had thoughts of killing yourself?', [
        { label: 'No', value: 'no' },
        { label: 'Yes', value: 'yes' },
        { label: 'Refused to answer', value: 'refused' },
      ], 'no', 'PSS-3 item 2 — active suicidal ideation in the past 2 weeks. Any "yes" makes the screen acutely positive.'),
      selectInput('q3', 'In your lifetime, have you ever attempted to kill yourself?', [
        { label: 'No', value: 'no' },
        { label: 'Yes', value: 'yes' },
        { label: 'Refused to answer', value: 'refused' },
      ], 'no', 'PSS-3 item 3 — lifetime suicide attempt. If yes, establish timing of the most recent attempt.'),
      selectInput(
        'attemptTiming',
        'If a lifetime attempt was endorsed: when was the most recent attempt?',
        [
          { label: 'Within the past 6 months', value: 'within6m' },
          { label: 'More than 6 months ago', value: 'gt6m' },
        ],
        undefined,
        'Asked only when item 3 is "yes". The ED-SAFE rule counts attempts within 6 months as acutely positive; left blank it is treated conservatively as recent.',
        false
      ),
    ],
    calculate(values) {
      const q1 = str(values.q1, 'no');
      const q2 = str(values.q2, 'no');
      const q3 = str(values.q3, 'no');
      const timing = str(values.attemptTiming, '');
      const refused = [q1, q2, q3].some((v) => v === 'refused');
      const ideation = q2 === 'yes';
      const attempt = q3 === 'yes';
      // ED-SAFE definition: ideation in past 2 wk OR attempt within past 6 months.
      // Blank timing with a positive attempt is treated conservatively as recent.
      const recentAttempt = attempt && timing !== 'gt6m';
      const remoteAttempt = attempt && timing === 'gt6m';
      const acutePositive = ideation || recentAttempt;

      let riskLevel: 'low' | 'moderate' | 'high' = 'low';
      let label = 'Negative screen';
      let interpretation = '';
      if (acutePositive) {
        riskLevel = 'high';
        label = 'Acute positive screen';
        interpretation =
          'PSS-3 positive: active suicidal ideation in the past 2 weeks or a suicide attempt within the past 6 months. Proceed to a structured suicide risk assessment (e.g., C-SSRS full/Triage version) and safety planning before disposition.';
      } else if (remoteAttempt) {
        riskLevel = 'moderate';
        label = 'Nonacute positive — remote attempt';
        interpretation =
          'Lifetime suicide attempt >6 months ago without current ideation — not an ED-SAFE acute positive, but a major long-term risk factor. Screen for depression, document, and provide crisis resources.';
      } else if (q1 === 'yes') {
        riskLevel = 'moderate';
        label = 'Nonacute positive — depressive symptoms';
        interpretation =
          'Depressive symptoms endorsed without ideation or recent attempt. The depression item does not make the PSS-3 acutely positive, but depression assessment (e.g., PHQ-9) and follow-up are indicated.';
      } else {
        interpretation = 'No depression, recent ideation, or lifetime attempt endorsed — negative suicide screen. A negative screen does not eliminate risk; clinical judgment prevails.';
      }
      if (refused) {
        interpretation += ' Note: the patient refused at least one item — the screen may be incomplete; consider re-approaching or collateral information.';
      }
      const alert = acutePositive
        ? 'Acute positive suicide screen: do not discharge without a clinician suicide risk assessment and safety plan. If the patient is in crisis now, call/text 988 (US Suicide & Crisis Lifeline), use local crisis services, or arrange emergency psychiatric evaluation.'
        : ideation || remoteAttempt
          ? 'Suicide attempt history or ideation endorsed — provide crisis resources (US: 988 Suicide & Crisis Lifeline) and document a safety plan.'
          : undefined;
      return {
        score: acutePositive ? 'Acute positive' : remoteAttempt ? 'Nonacute (remote attempt)' : q1 === 'yes' ? 'Nonacute (depression)' : 'Negative',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Depressed/hopeless (2 wk)', value: q1 },
          { label: 'Thoughts of suicide (2 wk)', value: q2 },
          { label: 'Lifetime suicide attempt', value: attempt ? `yes${timing ? ` (${timing === 'gt6m' ? '>6 months ago' : 'within 6 months'})` : ''}` : q3 },
          { label: 'ED-SAFE rule', value: 'Positive = ideation ≤2 wk OR attempt ≤6 mo' },
        ],
        recommendations: acutePositive
          ? [
              'Complete structured suicide assessment (C-SSRS) and document risk level.',
              'Create a written safety plan; counsel on means restriction (firearms, medications).',
              'Consider mental health consultation before discharge; follow-up within 1 week.',
            ]
          : [
              'Provide crisis-line resources to all patients with any endorsed item.',
              'Repeat universal screening at subsequent ED visits.',
            ],
        alerts: alert ? [alert] : undefined,
      };
    },
    evidence: {
      summary:
        'PSS-3 asks: (1) depression in past 2 weeks, (2) thoughts of suicide in past 2 weeks, (3) lifetime suicide attempt (with timing). ED-SAFE defines an acute positive screen as active ideation in the past 2 weeks OR an attempt within the past 6 months; the depression item informs care but is not part of the positivity rule.',
      validation:
        'PSS-3 agreed almost perfectly with the Beck Scale for Suicide Ideation for overall positive screens (κ≈0.94–0.95; Boudreaux et al. 2015). Universal PSS-3 screening in ED-SAFE nearly doubled detection of suicide risk (2.9%→5.7%).',
      references: [
        {
          title: 'Improving Suicide Risk Screening and Detection in the Emergency Department',
          citation: 'Boudreaux ED, Camargo CA, Arias SA, et al. Am J Prev Med. 2016;50(1):34-42',
          year: 2016,
          doi: '10.1016/j.amepre.2015.09.029',
        },
        {
          title: 'The Patient Safety Screener: Validation of a Brief Suicide Risk Screener for Emergency Department Settings',
          citation: 'Boudreaux ED, Jaques ML, Brady KM, Matson A, Allen MH. Arch Suicide Res. 2015;19(4):529-545',
          year: 2015,
          doi: '10.1080/13811118.2015.1034604',
        },
      ],
    },
    nextSteps: [
      { condition: 'Acute positive', actions: ['C-SSRS assessment', 'Safety plan + means counseling', 'Psychiatry/mental health consult', 'Close outpatient follow-up'] },
      { condition: 'Nonacute positive', actions: ['Depression screen (PHQ-9)', 'Crisis resources + safety plan', 'Behavioral health referral'] },
    ],
    pearls: [
      'The PSS-3 is designed for UNIVERSAL ED screening, not only psychiatric chief complaints.',
      'The depression item alone does not make the screen acutely positive — ideation ≤2 weeks or attempt ≤6 months does.',
      'A negative screen never rules out suicide; ask about access to lethal means when any item is positive.',
    ],
  },

  // ─── 3. Adverse Childhood Experiences (ACE) Score ───────────────────────────
  {
    id: 'ace-childhood',
    name: 'Adverse Childhood Experiences (ACE) Score',
    shortName: 'ACE Score',
    description:
      'Felitti/CDC–Kaiser 10-item yes/no tally of abuse, neglect, and household dysfunction before age 18. Score 0–10; ≥4 is associated with markedly increased adult health risks.',
    category: 'psychiatry',
    tags: ['ace', 'childhood', 'trauma', 'adversity', 'felitti', 'abuse', 'neglect', 'screening'],
    whenToUse:
      'Screening adults (and documenting exposure in minors) for cumulative childhood adversity as part of trauma-informed care, risk assessment, or psychiatric evaluation.',
    whyUse:
      'The ACE score shows a graded dose–response with leading causes of adult morbidity and mortality; ≥4 categories confers 4- to 12-fold increased risk for alcoholism, drug abuse, depression, and suicide attempt.',
    isQuestionnaire: true,
    inputs: [
      yesNo('abuseEmotional', 'Emotional abuse — a parent or other adult in the household often/very often swore at you, insulted you, put you down, or humiliated you, OR acted in a way that made you afraid you might be physically hurt', 1, 'During your first 18 years of life.', true),
      yesNo('abusePhysical', 'Physical abuse — a parent or other adult in the household often/very often pushed, grabbed, slapped, or threw something at you, OR ever hit you so hard that you had marks or were injured', 1, 'During your first 18 years of life.', false),
      yesNo('abuseSexual', 'Sexual abuse — an adult or person at least 5 years older ever touched/fondled you sexually, had you touch their body sexually, OR attempted or had oral, anal, or vaginal intercourse with you', 1, 'During your first 18 years of life.', false),
      yesNo('neglectEmotional', 'Emotional neglect — you often/very often felt that no one in your family loved you or thought you were important or special, OR that your family did not look out for, feel close to, or support each other', 1, 'During your first 18 years of life.', false),
      yesNo('neglectPhysical', 'Physical neglect — you often/very often felt you did not have enough to eat, had to wear dirty clothes, had no one to protect you, OR your parents were too drunk or high to care for you or take you to the doctor', 1, 'During your first 18 years of life.', false),
      yesNo('parentSeparated', 'Parental separation or divorce — your parents were ever separated or divorced', 1, 'During your first 18 years of life.', false),
      yesNo('motherViolence', 'Mother treated violently — your mother or stepmother was often/very often pushed, grabbed, slapped, or had things thrown at her; sometimes/often/very often kicked, bitten, hit with a fist or hard object; or ever repeatedly hit or threatened with a gun or knife', 1, 'During your first 18 years of life.', false),
      yesNo('householdSubstance', 'Household substance abuse — you lived with anyone who was a problem drinker or alcoholic or who used street drugs', 1, 'During your first 18 years of life.', true),
      yesNo('householdMental', 'Household mental illness/suicide — a household member was depressed or mentally ill, or a household member attempted suicide', 1, 'During your first 18 years of life.', false),
      yesNo('householdPrison', 'Incarcerated household member — a household member went to prison', 1, 'During your first 18 years of life.', false),
    ],
    calculate(values) {
      const ids = [
        'abuseEmotional', 'abusePhysical', 'abuseSexual', 'neglectEmotional', 'neglectPhysical',
        'parentSeparated', 'motherViolence', 'householdSubstance', 'householdMental', 'householdPrison',
      ];
      const score = ids.reduce((s, id) => s + (bool(values[id]) ? 1 : 0), 0);
      const r = riskFromThresholds(score, [
        {
          max: 0,
          level: 'low',
          label: 'ACE score 0',
          interpretation: 'No reported adverse childhood experience categories. Resilience is still shaped by other factors not captured by the 10 items.',
        },
        {
          max: 3,
          level: 'moderate',
          label: 'ACE score 1–3 — intermediate',
          interpretation: `ACE score ${score}/10. The ACE Study showed a graded (dose–response) rise in adult health risks starting with the first category; offer trauma-informed care and assess for related sequelae.`,
        },
        {
          max: 10,
          level: 'high',
          label: 'ACE score ≥4 — high cumulative adversity',
          interpretation: `ACE score ${score}/10. Four or more categories is the threshold at which Felitti et al. found 4- to 12-fold increases in alcoholism, drug abuse, depression, and suicide attempt, and increased risk of ischemic heart disease, cancer, and chronic lung disease.`,
        },
      ]);
      return {
        score,
        unit: 'categories (0–10)',
        ...r,
        details: [
          { label: 'Categories endorsed', value: `${score} of 10` },
          { label: 'Key threshold', value: '≥4 → 4–12× risk for depression, substance use, suicide attempt (Felitti 1998)' },
        ],
        recommendations:
          score >= 4
            ? [
                'Trauma-informed assessment for PTSD, depression, substance use, and chronic disease risk.',
                'Offer mental health support/counseling and resilience-building resources.',
                'If the patient is a minor with current safety concerns, contact child protective services — mandatory reporting applies.',
              ]
            : [
                'Screen for trauma-related symptoms if clinically suspected regardless of score.',
                'If evaluating a minor and there is concern for abuse or neglect, contact child protective services (legal obligation in most jurisdictions).',
              ],
      };
    },
    evidence: {
      summary:
        'The ACE score counts 10 categories of childhood adversity before age 18 (3 abuse, 2 neglect, 5 household dysfunction). Each endorsed category = 1 point; total 0–10.',
      formula: 'Sum of 10 yes/no items',
      validation:
        'Felitti et al. (CDC–Kaiser ACE Study, n=9,508): graded dose–response with adult disease and health-risk behaviors; ≥4 ACEs → 4–12× risk of alcoholism, drug abuse, depression, and suicide attempt.',
      references: [
        {
          title: 'Relationship of childhood abuse and household dysfunction to many of the leading causes of death in adults. The Adverse Childhood Experiences (ACE) Study',
          citation: 'Felitti VJ, Anda RF, Nordenberg D, et al. Am J Prev Med. 1998;14(4):245-258',
          year: 1998,
          pmid: '9635069',
          doi: '10.1016/s0749-3797(98)00017-8',
        },
      ],
    },
    nextSteps: [
      { condition: 'ACE ≥4', actions: ['Trauma-informed care assessment', 'Screen for PTSD, depression, substance use', 'Counseling/referral and resilience resources'] },
      { condition: 'Minor with suspected ongoing abuse/neglect', actions: ['Contact child protective services (mandatory reporting)', 'Ensure immediate safety'] },
    ],
    pearls: [
      'The ACE score counts categories of adversity — frequency/severity within a category is not scored.',
      'A high ACE score raises risk but does not determine outcome; protective factors and resilience matter.',
      'For minors, disclosure may trigger mandatory reporting — know local requirements before screening.',
    ],
  },

  // ─── 4. CRAFFT Questionnaire ────────────────────────────────────────────────
  {
    id: 'crafft',
    name: 'CRAFFT Questionnaire (CRAFFT 2.1)',
    shortName: 'CRAFFT',
    description:
      'Knight 6-item adolescent substance-use screen (Car, Relax, Alone, Forget, Friends, Trouble) plus Part A past-12-month use questions. Score ≥2 = high risk, needs further assessment.',
    category: 'pediatrics',
    tags: ['crafft', 'adolescent', 'substance use', 'alcohol', 'drug', 'screening', 'knight'],
    whenToUse:
      'Screening adolescents and young adults (validated ~ages 14–21) for alcohol and other drug use risk during routine medical visits.',
    whyUse:
      'Recommended by the American Academy of Pediatrics for adolescent screening; a CRAFFT score ≥2 predicts problem use, abuse, or dependence and indicates need for brief intervention/assessment.',
    isQuestionnaire: true,
    inputs: [
      selectInput('daysAlcohol', 'Part A — Days used alcohol (past 12 months)', [
        { label: '0 days', value: 0 },
        { label: '≥1 day', value: 1 },
      ], 0, 'During the past 12 months, on how many days did you drink more than a few sips of beer, wine, or any drink containing alcohol?'),
      selectInput('daysMarijuana', 'Part A — Days used marijuana (past 12 months)', [
        { label: '0 days', value: 0 },
        { label: '≥1 day', value: 1 },
      ], 0, 'During the past 12 months, on how many days did you use any marijuana (cannabis, weed, oil, wax, or hash — smoking, vaping, dabbing, or edibles) or "synthetic marijuana" (K2, Spice)?'),
      selectInput('daysOther', 'Part A — Days used anything else to get high (past 12 months)', [
        { label: '0 days', value: 0 },
        { label: '≥1 day', value: 1 },
      ], 0, 'During the past 12 months, on how many days did you use anything else to get high (other illegal drugs, pills, prescription or over-the-counter medications, and things that you sniff, huff, vape, or inject)?'),
      yesNo('car', 'CAR — ridden in a car driven by someone (including yourself) who was "high" or had been using alcohol or drugs?', 1, 'Part B item. The CAR question is asked even when no substance use is reported — riding with an impaired driver is itself a major risk.', true),
      yesNo('relax', 'RELAX — ever use alcohol or drugs to relax, feel better about yourself, or fit in?', 1, 'Part B item.', false),
      yesNo('alone', 'ALONE — ever use alcohol or drugs while you are by yourself, or alone?', 1, 'Part B item. Solitary use is a red-flag behavior.', false),
      yesNo('forget', 'FORGET — ever forget things you did while using alcohol or drugs?', 1, 'Part B item. Blackouts are a red-flag behavior.', false),
      yesNo('friends', 'FAMILY or FRIENDS — do they ever tell you that you should cut down on your drinking or drug use?', 1, 'Part B item.', false),
      yesNo('trouble', 'TROUBLE — ever gotten into trouble while you were using alcohol or drugs?', 1, 'Part B item.', false),
    ],
    calculate(values) {
      const partA = num(values.daysAlcohol) + num(values.daysMarijuana) + num(values.daysOther);
      const score =
        (bool(values.car) ? 1 : 0) +
        (bool(values.relax) ? 1 : 0) +
        (bool(values.alone) ? 1 : 0) +
        (bool(values.forget) ? 1 : 0) +
        (bool(values.friends) ? 1 : 0) +
        (bool(values.trouble) ? 1 : 0);
      const carPositive = bool(values.car);
      const r = riskFromThresholds(score, [
        {
          max: 1,
          level: 'low',
          label: 'Low risk (0–1)',
          interpretation: `CRAFFT ${score}/6 — below the ≥2 cutoff for further assessment.${partA === 0 ? ' No past-12-month use reported.' : ''}${carPositive ? ' Note: CAR item endorsed — riding with an impaired driver warrants specific counseling regardless of score.' : ''}`,
        },
        {
          max: 6,
          level: 'high',
          label: 'High risk (≥2) — needs assessment',
          interpretation: `CRAFFT ${score}/6 ≥2 — high-risk use; further evaluation for a substance use disorder is indicated (brief intervention/motivational interviewing; refer for assessment).`,
        },
      ]);
      return {
        score,
        unit: 'points (0–6)',
        ...r,
        details: [
          { label: 'Part A — any past-12-month use', value: partA > 0 ? 'Yes' : 'No' },
          { label: 'CAR item', value: carPositive ? 'Endorsed (impaired-driver exposure)' : 'Not endorsed' },
        ],
        recommendations:
          score >= 2
            ? [
                'Proceed to a full substance use assessment (DSM-5 SUD criteria) — CRAFFT is a screen, not a diagnosis.',
                'Brief intervention/motivational interviewing at this visit.',
                'Alone use or forgetting episodes are red-flag behaviors — consider treatment referral.',
              ]
            : [
                'Affirm non-use and provide anticipatory guidance.',
                carPositive ? 'Counsel specifically on not riding with impaired drivers and not driving impaired.' : 'Reinforce safe choices; rescreen annually.',
              ],
      };
    },
    evidence: {
      summary:
        'CRAFFT 2.1: Part A documents past-12-month days of alcohol, marijuana, and other drug use; Part B scores six yes/no items (CAR, RELAX, ALONE, FORGET, FRIENDS/FAMILY, TROUBLE). Score ≥2 is the validated cutoff indicating need for further assessment.',
      formula: 'Sum of 6 Part B items (0–6)',
      validation:
        'Knight et al. (2002): ≥2 optimal for "any problem" (sens 0.76, spec 0.94) and dependence (sens 0.92). Mitchell et al. (2014) re-validated ≥2 against DSM-5 criteria (AUC 0.93–0.97).',
      references: [
        {
          title: 'Validity of the CRAFFT Substance Abuse Screening Test Among Adolescent Clinic Patients',
          citation: 'Knight JR, Sherritt L, Shrier LA, Harris SK, Chang G. Arch Pediatr Adolesc Med. 2002;156(6):607-614',
          year: 2002,
          pmid: '12038895',
          doi: '10.1001/archpedi.156.6.607',
        },
        {
          title: 'A new brief screen for adolescent substance abuse',
          citation: 'Knight JR, Shrier LA, Bravender TD, Farrell M, Vander Bilt J, Shaffer HJ. Arch Pediatr Adolesc Med. 1999;153(6):591-596',
          year: 1999,
          pmid: '10357299',
          doi: '10.1001/archpedi.153.6.591',
        },
      ],
    },
    nextSteps: [
      { condition: 'CRAFFT ≥2', actions: ['Full SUD assessment', 'Brief intervention / motivational interviewing', 'Treatment referral if disorder confirmed'] },
      { condition: 'CAR item endorsed', actions: ['Counsel on impaired driving/riding risk specifically', 'Include in safety planning'] },
    ],
    pearls: [
      'Ask the CAR question even when Part A shows no use — riding with an impaired driver is itself dangerous.',
      'Alone use and blackouts (FORGET) are red flags meriting specialist referral.',
      'Validated ~ages 14–21; not validated in adults.',
    ],
  },

  // ─── 5. HARK ────────────────────────────────────────────────────────────────
  {
    id: 'hark',
    name: 'Humiliation, Afraid, Rape, Kick (HARK)',
    shortName: 'HARK',
    description:
      'Sohal 4-item intimate partner violence screen for women in primary care. Each "yes" = 1 point; any yes (score ≥1) is a positive screen.',
    category: 'psychiatry',
    tags: ['hark', 'ipv', 'domestic violence', 'intimate partner', 'abuse', 'screening', 'sohal'],
    whenToUse:
      'Screening women in primary care for intimate partner violence within the last year, particularly when IPV is suspected or during routine screening.',
    whyUse:
      'Four short questions derived from the Abuse Assessment Screen; a single "yes" identifies most women experiencing IPV (sensitivity ~81%, specificity ~95% vs the Composite Abuse Scale).',
    isQuestionnaire: true,
    inputs: [
      yesNo('humiliation', 'Humiliation — humiliated or emotionally abused in other ways by your partner or ex-partner?', 1, 'Within the last year.', true),
      yesNo('afraid', 'Afraid — been afraid of your partner or ex-partner?', 1, 'Within the last year.', false),
      yesNo('rape', 'Rape — been raped or forced to have any kind of sexual activity by your partner or ex-partner?', 1, 'Within the last year.', false),
      yesNo('kick', 'Kick — been kicked, hit, slapped, or otherwise physically hurt by your partner or ex-partner?', 1, 'Within the last year.', false),
    ],
    calculate(values) {
      const score =
        (bool(values.humiliation) ? 1 : 0) +
        (bool(values.afraid) ? 1 : 0) +
        (bool(values.rape) ? 1 : 0) +
        (bool(values.kick) ? 1 : 0);
      const positive = score >= 1;
      return {
        score,
        unit: 'points (0–4)',
        label: positive ? 'Positive IPV screen (≥1)' : 'Negative screen',
        interpretation: positive
          ? `HARK ${score}/4 ≥1 — positive intimate partner violence screen. Validate the disclosure, assess immediate safety and lethality (weapons, threats to kill, children), and offer resources/referrals.`
          : 'HARK 0/4 — negative screen. IPV is underreported; maintain a low threshold for rescreening and offer resources routinely.',
        riskLevel: positive ? 'high' : 'low',
        details: [{ label: 'Rule', value: 'Any "yes" = positive (each item = 1 point)' }],
        recommendations: positive
          ? [
              'Respond with empathy; document carefully (medico-legal).',
              'Assess immediate safety of patient and dependents; create a safety plan.',
              'Offer National Domestic Violence Hotline (US: 1-800-799-7233 / text START to 88788) and local shelter/advocacy referrals.',
              'Know local mandatory reporting requirements, especially with children or vulnerable adults.',
            ]
          : ['Rescreen periodically — disclosure increases with trust.', 'Provide IPV resource information as routine care.'],
      };
    },
    evidence: {
      summary:
        'HARK = 4 yes/no items (Humiliation, Afraid, Rape, Kick) covering emotional, fear, sexual, and physical IPV within the last year. Any "yes" (score ≥1) is a positive screen.',
      formula: 'Sum of 4 items (0–4); positive if ≥1',
      validation:
        'Sohal, Eldridge & Feder (2007, n=232, London general practice): HARK ≥1 had 81% sensitivity and 95% specificity vs the 30-item Composite Abuse Scale.',
      references: [
        {
          title: 'The sensitivity and specificity of four questions (HARK) to identify intimate partner violence: a diagnostic accuracy study in general practice',
          citation: 'Sohal H, Eldridge S, Feder G. BMC Fam Pract. 2007;8:49',
          year: 2007,
          doi: '10.1186/1471-2296-8-49',
        },
      ],
    },
    nextSteps: [
      { condition: 'HARK ≥1', actions: ['Validate and document', 'Safety/lethality assessment', 'Safety plan', 'DV hotline/advocacy referral', 'Follow-up scheduled'] },
    ],
    pearls: [
      'Ask in private — never with the partner or accompanying adults present.',
      'The Afraid item captures coercive control even without physical violence.',
      'Know mandatory reporting rules; adult competent victims usually cannot be reported without consent (varies by jurisdiction).',
    ],
  },

  // ─── 6. Woman Abuse Screening Tool (WAST) ───────────────────────────────────
  {
    id: 'wast',
    name: 'Woman Abuse Screening Tool (WAST)',
    shortName: 'WAST',
    description:
      'Brown 8-item IPV screen (each item 1–3; total 8–24, ≥13 positive). First 2 items form the WAST-Short (2–6, ≥4 positive) used as the entry screen.',
    category: 'psychiatry',
    tags: ['wast', 'ipv', 'domestic violence', 'intimate partner', 'abuse', 'screening', 'brown'],
    whenToUse:
      'Screening women in healthcare settings for intimate partner violence. The 2-item WAST-Short is the initial screen; the remaining items deepen assessment when positive.',
    whyUse:
      'The WAST-Short is unobtrusive and well tolerated; the full 8-item WAST quantifies severity and breadth of abuse to guide documentation and referral.',
    isQuestionnaire: true,
    inputs: [
      selectInput('q1', '1. In general, how would you describe your relationship?', [
        { label: 'No tension', value: 1, points: 1 },
        { label: 'Some tension', value: 2, points: 2 },
        { label: 'A lot of tension', value: 3, points: 3 },
      ], 1, 'WAST-Short item 1.'),
      selectInput('q2', '2. Do you and your partner work out arguments with:', [
        { label: 'No difficulty', value: 1, points: 1 },
        { label: 'Some difficulty', value: 2, points: 2 },
        { label: 'Great difficulty', value: 3, points: 3 },
      ], 1, 'WAST-Short item 2.'),
      selectInput('q3', '3. Do arguments ever result in you feeling down or bad about yourself?', [
        { label: 'Never', value: 1, points: 1 },
        { label: 'Sometimes', value: 2, points: 2 },
        { label: 'Often', value: 3, points: 3 },
      ], 1, 'Full WAST item.'),
      selectInput('q4', '4. Do arguments ever result in hitting, kicking or pushing?', [
        { label: 'Never', value: 1, points: 1 },
        { label: 'Sometimes', value: 2, points: 2 },
        { label: 'Often', value: 3, points: 3 },
      ], 1, 'Full WAST item — physical escalation.'),
      selectInput('q5', '5. Do you ever feel frightened by what your partner says or does?', [
        { label: 'Never', value: 1, points: 1 },
        { label: 'Sometimes', value: 2, points: 2 },
        { label: 'Often', value: 3, points: 3 },
      ], 1, 'Full WAST item.'),
      selectInput('q6', '6. Has your partner ever abused you physically?', [
        { label: 'Never', value: 1, points: 1 },
        { label: 'Sometimes', value: 2, points: 2 },
        { label: 'Often', value: 3, points: 3 },
      ], 1, 'Full WAST item.'),
      selectInput('q7', '7. Has your partner ever abused you emotionally?', [
        { label: 'Never', value: 1, points: 1 },
        { label: 'Sometimes', value: 2, points: 2 },
        { label: 'Often', value: 3, points: 3 },
      ], 1, 'Full WAST item.'),
      selectInput('q8', '8. Has your partner ever abused you sexually?', [
        { label: 'Never', value: 1, points: 1 },
        { label: 'Sometimes', value: 2, points: 2 },
        { label: 'Often', value: 3, points: 3 },
      ], 1, 'Full WAST item — sexual coercion.'),
    ],
    calculate(values) {
      const q1 = num(values.q1, 1);
      const q2 = num(values.q2, 1);
      const shortScore = q1 + q2;
      const shortPositive = shortScore >= 4;
      let total = shortScore;
      for (let i = 3; i <= 8; i++) total += num(values[`q${i}`], 1);
      const fullPositive = total >= 13;
      const r = riskFromThresholds(total, [
        {
          max: 12,
          level: shortPositive ? 'moderate' : 'low',
          label: shortPositive ? 'WAST-Short positive, full WAST <13' : 'Negative screen (<13)',
          interpretation: shortPositive
            ? `WAST total ${total}/24 (<13) but WAST-Short ${shortScore}/6 ≥4 — the brief screen is positive; ask the remaining items in context and proceed as for a positive screen if the relationship picture fits.`
            : `WAST total ${total}/24 and WAST-Short ${shortScore}/6 — below published cutoffs; negative screen.`,
        },
        {
          max: 24,
          level: 'high',
          label: 'Positive WAST (≥13)',
          interpretation: `WAST total ${total}/24 ≥13 — positive screen for woman abuse. Assess safety/lethality, validate, document, and refer to IPV resources and advocacy.`,
        },
      ]);
      return {
        score: total,
        unit: 'points (8–24)',
        ...r,
        details: [
          { label: 'WAST-Short (items 1–2)', value: `${shortScore}/6 — ${shortPositive ? 'positive (≥4)' : 'negative'}` },
          { label: 'Full WAST cutoff', value: '≥13 of 24 (Brown et al.)' },
        ],
        recommendations:
          fullPositive || shortPositive
            ? [
                'Acknowledge disclosure with empathy and assess immediate safety/lethality.',
                'Offer National Domestic Violence Hotline (US: 1-800-799-7233) and local advocacy/shelter referrals.',
                'Document findings precisely; consider a safety plan and follow-up visit.',
              ]
            : ['Rescreen at future visits — disclosure often follows established trust.', 'Offer IPV resources routinely.'],
      };
    },
    evidence: {
      summary:
        'WAST-8: 8 items each scored 1–3 (total 8–24); ≥13 indicates probable abuse. Items 1–2 alone form the WAST-Short (2–6), positive at ≥4.',
      formula: 'Sum of 8 items (8–24); WAST-Short = items 1+2 (2–6)',
      validation:
        'Brown, Lent, Schmidt & Sas: WAST α=0.95, correlated r=0.96 with the Abuse Risk Inventory; WAST-Short classified 91.7% of abused and 100% of non-abused women in the derivation sample. The ≥13 full-scale cutoff was externally examined in an Indonesian validation study.',
      references: [
        {
          title: 'Development of the Woman Abuse Screening Tool for use in family practice',
          citation: 'Brown JB, Lent B, Brett PJ, Sas G, Pederson LL. Fam Med. 1996;28(6):422-428',
          year: 1996,
          pmid: '8791071',
        },
        {
          title: 'Testing the Woman Abuse Screening Tool to Identify Intimate Partner Violence in Indonesia',
          citation: 'Syarif MH et al. J Interpers Violence. 2015;30(8):1424-1437',
          year: 2015,
          doi: '10.1177/0886260514539844',
        },
      ],
    },
    nextSteps: [
      { condition: 'WAST-Short ≥4 or WAST ≥13', actions: ['Safety assessment', 'Validate and document', 'Safety plan', 'DV resources/advocacy referral', 'Follow-up'] },
    ],
    pearls: [
      'The WAST-Short (items 1–2) is the published entry screen — a "no tension / no difficulty" pair is reassuring.',
      'Ask privately and without the partner present.',
      'A negative screen does not exclude IPV; rescreen periodically.',
    ],
  },

  // ─── 7. Ongoing Violence Assessment Tool (OVAT) ─────────────────────────────
  {
    id: 'ovat',
    name: 'Ongoing Violence Assessment Tool (OVAT)',
    shortName: 'OVAT',
    description:
      'Weiss/Ernst 4-question ED screen for ongoing (past-month) intimate partner violence. True on a severe item or "occasionally+" disrespect = positive.',
    category: 'psychiatry',
    tags: ['ovat', 'ipv', 'domestic violence', 'emergency', 'intimate partner', 'weiss', 'ernst'],
    whenToUse:
      'Screening ED patients (women and men) for ongoing intimate partner violence within the past month.',
    whyUse:
      'Validated against the Index of Spouse Abuse in an ED population (sensitivity 86%, specificity 83%); detects ongoing rather than lifetime IPV with only four questions.',
    isQuestionnaire: true,
    inputs: [
      yesNo('weapon', 'Within the past month, has your partner threatened you with a weapon?', 1, 'Severe-item question — "yes" makes the screen positive.', false),
      yesNo('beaten', 'Within the past month, has your partner beaten you so badly that you had to seek medical care?', 1, 'Severe-item question — "yes" makes the screen positive.', true),
      yesNo('kill', 'Within the past month, has your partner acted like they would like to kill you?', 1, 'Severe-item question — "yes" makes the screen positive and is a lethality red flag.', false),
      selectInput('respect', 'Within the past month, has your partner had no respect for your feelings?', [
        { label: 'Never', value: 1, points: 0 },
        { label: 'Rarely', value: 2, points: 0 },
        { label: 'Occasionally', value: 3, points: 1 },
        { label: 'Frequently', value: 4, points: 1 },
        { label: 'Very frequently', value: 5, points: 1 },
      ], 1, 'Frequency item — "Occasionally" or more makes the screen positive.'),
    ],
    calculate(values) {
      const weapon = bool(values.weapon);
      const beaten = bool(values.beaten);
      const kill = bool(values.kill);
      const respect = num(values.respect, 1);
      const respectPositive = respect >= 3;
      const positive = weapon || beaten || kill || respectPositive;
      const severeCount = (weapon ? 1 : 0) + (beaten ? 1 : 0) + (kill ? 1 : 0);
      return {
        score: positive ? 'Positive' : 'Negative',
        label: positive ? 'Positive ongoing-IPV screen' : 'Negative screen',
        interpretation: positive
          ? `OVAT positive — ongoing (past-month) intimate partner violence indicated.${severeCount > 0 ? ` ${severeCount} severe/lethality item(s) endorsed — assess imminent danger, weapon access, and dependents now.` : ''} Validate, ensure safety, and provide IPV resources before discharge.`
          : 'OVAT negative — no past-month IPV indicators endorsed. Continue vigilance; IPV disclosure often requires repeated, private inquiry.',
        riskLevel: severeCount > 0 ? 'critical' : positive ? 'high' : 'low',
        details: [
          { label: 'Weapon threat', value: weapon ? 'Yes' : 'No' },
          { label: 'Beaten → medical care', value: beaten ? 'Yes' : 'No' },
          { label: 'Acted like would kill', value: kill ? 'Yes — lethality red flag' : 'No' },
          { label: 'No respect for feelings', value: ['Never', 'Rarely', 'Occasionally', 'Frequently', 'Very frequently'][Math.min(4, Math.max(0, respect - 1))] },
          { label: 'Rule', value: 'True on items 1–3 OR respect ≥ "Occasionally" = positive' },
        ],
        recommendations: positive
          ? [
              'Assess imminent danger (lethality questions, weapon access, children in home).',
              'Separate the patient from the partner; provide private phone and security as needed.',
              'Create a personalized safety plan; refer to shelters, hotlines, counseling.',
              'Consider emergency shelter or law enforcement assistance if lethality risk is high.',
              'Address medical sequelae: wound care, STI testing, emergency contraception, mental health.',
              'Know state-specific mandatory reporting laws.',
            ]
          : ['Reassure confidentiality.', 'Offer IPV resources routinely; schedule discreet follow-up if concern persists.'],
      };
    },
    evidence: {
      summary:
        'OVAT asks about the past month: weapon threat, beating requiring medical care, acting like wanting to kill (true/false), and partner disrespect (never→very frequently). Positive = any "true" on the three severe items or disrespect of "occasionally" or more.',
      validation:
        'Ernst et al. (2004): validated against the Index of Spouse Abuse in 306 ED patients — sensitivity 86%, specificity 83%, NPV 96%, accuracy 84%.',
      references: [
        {
          title: 'Detecting ongoing intimate partner violence in the emergency department using a simple 4-question screen: the OVAT',
          citation: 'Ernst AA, Weiss SJ, Cham E, Hall L, Nick TG. Violence Vict. 2004;19(3):375-384',
          year: 2004,
          pmid: '15631287',
          doi: '10.1891/vivi.19.3.375.65769',
        },
        {
          title: 'Development of a screen for ongoing intimate partner violence',
          citation: 'Weiss SJ, Ernst AA, Cham E, Nick TG. Violence Vict. 2003;18(2):131-141',
          year: 2003,
          pmid: '12816400',
          doi: '10.1891/vivi.2003.18.2.131',
        },
      ],
    },
    nextSteps: [
      { condition: 'Positive OVAT', actions: ['Immediate safety/lethality assessment', 'Safety plan', 'Shelter/hotline/counseling referrals', 'Document medico-legally'] },
      { condition: '"Would like to kill you" or weapon threat endorsed', actions: ['Lethality evaluation now', 'Consider emergency shelter and law enforcement involvement'] },
    ],
    pearls: [
      'The "acted like they would like to kill you" item is a lethality red flag — escalate immediately.',
      'OVAT targets the past month — designed to detect ONGOING IPV, unlike lifetime screens.',
      'Universal ED screening detects cases missed by complaint-triggered inquiry.',
    ],
  },

  // ─── 8. Behavioral Activity Rating Scale (BARS) ─────────────────────────────
  {
    id: 'bars',
    name: 'Behavioral Activity Rating Scale (BARS)',
    shortName: 'BARS',
    description:
      'Swift single-item 7-point rating of behavioral activity in agitated patients — from "difficult to rouse" (1) through normal (4) to "violent, requires restraint" (7).',
    category: 'psychiatry',
    tags: ['bars', 'agitation', 'violence', 'sedation', 'rapid tranquilization', 'swift'],
    whenToUse:
      'Rapid bedside rating of agitation (or oversedation) in emergency and psychiatric settings, and serial re-assessment after behavioral or pharmacologic intervention.',
    whyUse:
      'A single observation yields a reliable 7-point activity rating (weighted κ≈0.90) that correlates with PANSS-EC and CGI-S — useful for titrating agitation management and monitoring response.',
    inputs: [
      selectInput('bars', 'Behavioral Activity Rating Scale', [
        { label: '1 — Difficult or unable to rouse', value: 1, points: 1 },
        { label: '2 — Asleep but responds to verbal or physical contact', value: 2, points: 2 },
        { label: '3 — Drowsy, appears sedated', value: 3, points: 3 },
        { label: '4 — Quiet and awake (normal level of activity)', value: 4, points: 4 },
        { label: '5 — Signs of overt (physical or verbal) activity, calms down with instruction', value: 5, points: 5 },
        { label: '6 — Extremely or continuously active, not requiring restraint', value: 6, points: 6 },
        { label: '7 — Violent, requires restraint', value: 7, points: 7 },
      ], 4, 'Rate the single category best describing the patient right now. BARS may be re-rated after interventions.'),
    ],
    calculate(values) {
      const score = num(values.bars, 4);
      const r = riskFromThresholds(score, [
        {
          max: 3,
          level: 'moderate',
          label: 'Sedated range (1–3)',
          interpretation: `BARS ${score}/7 — sedation spectrum. Broaden the differential to medical causes of sedation; monitor airway, breathing, and vitals. BARS 1 requires close monitoring regardless of etiology.`,
        },
        {
          max: 4,
          level: 'low',
          label: 'Normal activity (4)',
          interpretation: 'BARS 4/7 — quiet and awake; normal behavioral activity. No agitation intervention needed; re-rate if status changes.',
        },
        {
          max: 6,
          level: 'moderate',
          label: 'Agitated (5–6)',
          interpretation: `BARS ${score}/7 — overt or continuous activity. Attempt verbal de-escalation and environmental measures first; consider medication per agitation protocol if de-escalation fails.`,
        },
        {
          max: 7,
          level: 'critical',
          label: 'Violent — restraint likely needed (7)',
          interpretation: 'BARS 7/7 — violent, requires restraint. Physical restraint and/or pharmacologic intervention likely necessary; also evaluate medical contributors to agitation.',
        },
      ]);
      return {
        score,
        unit: '/7',
        ...r,
        details: [
          { label: 'Anchor', value: ['', 'Difficult/unable to rouse', 'Asleep, responds to contact', 'Drowsy, sedated', 'Quiet and awake (normal)', 'Overt activity, calms with instruction', 'Extremely/continuously active', 'Violent, requires restraint'][score] ?? '—' },
        ],
        recommendations:
          score >= 5 && score <= 6
            ? ['Verbal de-escalation first', 'Reduce stimulation, offer oral medication before IM/restraints when safe', 'Re-rate BARS after intervention']
            : score === 7
              ? ['Ensure staff/patient safety', 'Restraint and/or rapid tranquilization per protocol', 'Medical workup for contributors', 'Re-rate BARS serially']
              : score <= 3
                ? ['Evaluate medical causes of sedation (hypoxia, hypoglycemia, toxidrome, CNS)', 'Monitor airway and vitals']
                : ['No intervention needed; document and monitor'],
      };
    },
    evidence: {
      summary:
        'BARS is a single-item 7-category scale: 1 difficult/unable to rouse, 2 asleep but responds, 3 drowsy/sedated, 4 quiet and awake (normal), 5 overt activity calming with instruction, 6 extremely/continuously active, 7 violent requiring restraint.',
      formula: 'Single-item rating 1–7',
      validation:
        'Swift et al. (2002): validated in agitated psychosis trials — weighted κ≈0.90 inter-rater reliability; correlated with PANSS-EC (r≈0.88) and CGI-S (r≈0.83); sensitive to change with IM ziprasidone.',
      references: [
        {
          title: 'Validation of the behavioural activity rating scale (BARS): a novel measure of activity in agitated patients',
          citation: 'Swift RH, Harrigan EP, Cappelleri JC, Kramer D, Chandler LP. J Psychiatr Res. 2002;36(2):87-95',
          year: 2002,
          pmid: '11777497',
          doi: '10.1016/s0022-3956(01)00052-8',
        },
      ],
    },
    nextSteps: [
      { condition: 'BARS 5–6', actions: ['Verbal de-escalation', 'Environmental measures', 'Oral medication if needed', 'Serial re-rating'] },
      { condition: 'BARS 7', actions: ['Safety measures/restraint', 'Rapid tranquilization per protocol', 'Medical workup'] },
      { condition: 'BARS 1–3', actions: ['Medical evaluation for sedation cause', 'Airway/vitals monitoring'] },
    ],
    pearls: [
      'BARS is deliberately unidirectional — it captures sedation AND agitation on one continuum.',
      'Any trained team member can rate it; re-rate after every intervention.',
      'Always consider medical causes at both ends of the scale.',
    ],
  },

  // ─── 9. Bush-Francis Catatonia Rating Scale (14-item screen) ────────────────
  {
    id: 'bush-francis',
    name: 'Bush-Francis Catatonia Rating Scale — Screening (BFCRS)',
    shortName: 'BFCRS screen',
    description:
      'Bush-Francis 14-item catatonia screening instrument (items 1–14 of the 23-item scale, each 0–3). ≥2 positive items = positive screen; complete the full scale and treat accordingly.',
    category: 'psychiatry',
    tags: ['catatonia', 'bush-francis', 'bfcrs', 'stupor', 'waxy flexibility', 'negativism', 'lorazepam'],
    whenToUse:
      'Screening for catatonia in psychiatric, neurologic, and medical patients — e.g., unexplained stupor, mutism, posturing, or marked psychomotor changes. Positive screen should prompt the full 23-item examination.',
    whyUse:
      'The 14-item screen operationalizes the catatonic signs with the highest inter-rater agreement; ≥2 items present defines a positive screen in the original Bush et al. workup.',
    isQuestionnaire: true,
    inputs: [
      selectInput('excitement', '1. Excitement', [
        { label: 'Absent', value: 0, points: 0 },
        { label: 'Excessive motion; intermittent', value: 1, points: 1 },
        { label: 'Constant motion; hyperkinetic without rest periods', value: 2, points: 2 },
        { label: 'Full-blown catatonic excitement; endless frenzied motor activity', value: 3, points: 3 },
      ], 0, 'Extreme hyperactivity, constant motor unrest that appears non-purposeful; not attributed to akathisia or goal-directed agitation.'),
      selectInput('immobility', '2. Immobility/stupor', [
        { label: 'Absent', value: 0, points: 0 },
        { label: 'Sits abnormally still; may interact briefly', value: 1, points: 1 },
        { label: 'Virtually no interaction with external world', value: 2, points: 2 },
        { label: 'Stuporous; non-reactive to painful stimuli', value: 3, points: 3 },
      ], 0, 'Extreme hypoactivity, immobile, minimally responsive to stimuli.'),
      selectInput('mutism', '3. Mutism', [
        { label: 'Absent', value: 0, points: 0 },
        { label: 'Verbally unresponsive to majority of questions; incomprehensible whisper', value: 1, points: 1 },
        { label: 'Speaks <20 words per 5 min', value: 2, points: 2 },
        { label: 'No speech', value: 3, points: 3 },
      ], 0, 'Verbally unresponsive or minimally responsive.'),
      selectInput('staring', '4. Staring', [
        { label: 'Absent', value: 0, points: 0 },
        { label: 'Poor eye contact; repeatedly gazes <20 sec between shifts of attention; decreased blinking', value: 1, points: 1 },
        { label: 'Gaze held longer than 20 sec; occasionally shifts attention', value: 2, points: 2 },
        { label: 'Fixed gaze; non-reactive', value: 3, points: 3 },
      ], 0, 'Fixed gaze; little or no visual scanning of environment; decreased blinking.'),
      selectInput('posturing', '5. Posturing/catalepsy', [
        { label: 'Absent', value: 0, points: 0 },
        { label: '<1 min', value: 1, points: 1 },
        { label: '>1 min to <15 min', value: 2, points: 2 },
        { label: 'Bizarre posture, or mundane >15 min', value: 3, points: 3 },
      ], 0, 'Spontaneous maintenance of posture(s), including mundane (e.g., sitting or standing for long periods without reacting).'),
      selectInput('grimacing', '6. Grimacing', [
        { label: 'Absent', value: 0, points: 0 },
        { label: '<10 sec', value: 1, points: 1 },
        { label: '<1 min', value: 2, points: 2 },
        { label: 'Bizarre expression(s) or maintained >1 min', value: 3, points: 3 },
      ], 0, 'Maintenance of odd facial expressions.'),
      selectInput('echo', '7. Echopraxia/echolalia', [
        { label: 'Absent', value: 0, points: 0 },
        { label: 'Occasional', value: 1, points: 1 },
        { label: 'Frequent', value: 2, points: 2 },
        { label: 'Constant', value: 3, points: 3 },
      ], 0, 'Mimicking of examiner\u2019s movements/speech.'),
      selectInput('stereotypy', '8. Stereotypy', [
        { label: 'Absent', value: 0, points: 0 },
        { label: 'Occasional', value: 1, points: 1 },
        { label: 'Frequent', value: 2, points: 2 },
        { label: 'Constant', value: 3, points: 3 },
      ], 0, 'Repetitive, non-goal-directed motor activity (e.g., finger-play, repeatedly touching, patting, or rubbing self); abnormality not inherent in act but in its frequency.'),
      selectInput('mannerisms', '9. Mannerisms', [
        { label: 'Absent', value: 0, points: 0 },
        { label: 'Occasional', value: 1, points: 1 },
        { label: 'Frequent', value: 2, points: 2 },
        { label: 'Constant', value: 3, points: 3 },
      ], 0, 'Odd, purposeful movements (hopping or walking tiptoe, saluting passers-by, or exaggerated caricatures of mundane movements); abnormality inherent in act itself.'),
      selectInput('verbigeration', '10. Verbigeration', [
        { label: 'Absent', value: 0, points: 0 },
        { label: 'Occasional', value: 1, points: 1 },
        { label: 'Frequent; difficult to interrupt', value: 2, points: 2 },
        { label: 'Constant', value: 3, points: 3 },
      ], 0, 'Repetition of phrases or sentences (like a scratched record).'),
      selectInput('rigidity', '11. Rigidity', [
        { label: 'Absent', value: 0, points: 0 },
        { label: 'Mild resistance', value: 1, points: 1 },
        { label: 'Moderate', value: 2, points: 2 },
        { label: 'Severe; cannot be repostured', value: 3, points: 3 },
      ], 0, 'Maintenance of a rigid position despite efforts to be moved; exclude if cog-wheeling or tremor present.'),
      selectInput('negativism', '12. Negativism', [
        { label: 'Absent', value: 0, points: 0 },
        { label: 'Mild resistance and/or occasionally contrary', value: 1, points: 1 },
        { label: 'Moderate resistance and/or frequently contrary', value: 2, points: 2 },
        { label: 'Severe resistance and/or continually contrary', value: 3, points: 3 },
      ], 0, 'Apparently motiveless resistance to instructions or attempts to move/examine patient; contrary behavior (does exact opposite of instruction).'),
      selectInput('waxy', '13. Waxy flexibility', [
        { label: 'Absent', value: 0, points: 0 },
        { label: 'Present', value: 3, points: 3 },
      ], 0, 'During reposturing of patient, patient offers initial resistance before allowing themselves to be repositioned, similar to that of a bending candle.'),
      selectInput('withdrawal', '14. Withdrawal', [
        { label: 'Absent', value: 0, points: 0 },
        { label: 'Minimal PO intake/interaction for <1 day', value: 1, points: 1 },
        { label: 'Minimal PO intake/interaction for >1 day', value: 2, points: 2 },
        { label: 'No PO intake/interaction for ≥1 day', value: 3, points: 3 },
      ], 0, 'Refusal to eat, drink, and/or make eye contact.'),
    ],
    calculate(values) {
      const ids = [
        'excitement', 'immobility', 'mutism', 'staring', 'posturing', 'grimacing', 'echo',
        'stereotypy', 'mannerisms', 'verbigeration', 'rigidity', 'negativism', 'waxy', 'withdrawal',
      ];
      let screenScore = 0;
      let positiveItems = 0;
      for (const id of ids) {
        const v = num(values[id]);
        screenScore += v;
        if (v > 0) positiveItems++;
      }
      const screenPositive = positiveItems >= 2;
      const refusingIntake = num(values.withdrawal) >= 2;
      return {
        score: positiveItems,
        unit: `positive items (screening score ${screenScore}/42)`,
        label: screenPositive ? 'Positive catatonia screen (≥2 items)' : 'Negative catatonia screen',
        interpretation: screenPositive
          ? `BFCRS screen positive: ${positiveItems} of 14 items present (item scores total ${screenScore}). Catatonia is likely — complete the full 23-item Bush-Francis examination, exclude mimics (NMS, locked-in states, severe extrapyramidal disease), and consider a lorazepam challenge under monitoring.`
          : `BFCRS screen negative: ${positiveItems} of 14 items present (<2 required). Catatonia unlikely on this screen; reassess if the picture changes.`,
        riskLevel: screenPositive ? 'high' : 'low',
        details: [
          { label: 'Items positive (any score >0)', value: `${positiveItems}/14` },
          { label: 'Screening item score total', value: `${screenScore}/42` },
          { label: 'Screening rule', value: '≥2 of the first 14 items present = positive (Bush et al.)' },
        ],
        recommendations: screenPositive
          ? [
              'Complete the full 23-item BFCRS and a standardized catatonia examination.',
              'First-line treatment is a lorazepam trial (1–2 mg PO/IM/IV; monitor response over ~3 h; repeat once if no response and no adverse effects). ≥50% BFCRS reduction indicates response.',
              'Monitor for respiratory depression, sedation, and worsening consciousness during benzodiazepine challenge.',
              'Work up and treat the underlying cause (mood disorder, psychosis, medical/neurologic disease, NMS, malignant catatonia — check autonomic signs).',
            ]
          : ['Re-screen if the clinical picture evolves.', 'If index of suspicion stays high, complete the full 23-item scale anyway.'],
        alerts: refusingIntake
          ? ['Withdrawal item ≥2: no/minimal PO intake for ≥1 day — monitor hydration, nutrition, and DVT risk; malignant catatonia requires urgent treatment.']
          : undefined,
      };
    },
    evidence: {
      summary:
        'The Bush-Francis screening instrument comprises items 1–14 of the 23-item BFCRS, each rated 0–3 (waxy flexibility 0/3). ≥2 items present = positive screen, which should trigger the full standardized examination.',
      formula: 'Positive items = count of items 1–14 scored >0; screening score = sum (0–42)',
      validation:
        'Bush et al. (1996): the 14-item screen showed inter-rater reliability 0.95 (total) and 92.7% mean item agreement; ≥2 positive items defined catatonia cases in the original study (7% of consecutive psychiatric inpatients).',
      references: [
        {
          title: 'Catatonia. I. Rating scale and standardized examination',
          citation: 'Bush G, Fink M, Petrides G, Dowling F, Francis A. Acta Psychiatr Scand. 1996;93(2):129-136',
          year: 1996,
          pmid: '8686483',
          doi: '10.1111/j.1600-0447.1996.tb09814.x',
        },
      ],
    },
    nextSteps: [
      { condition: 'Screen positive (≥2 items)', actions: ['Complete full 23-item BFCRS', 'Lorazepam challenge test under monitoring', 'Investigate underlying cause', 'Supportive care (fluids, nutrition, DVT prophylaxis)'] },
      { condition: 'Refractory or malignant features', actions: ['Urgent psychiatry consultation', 'ECT is definitive for lorazepam-refractory or malignant catatonia'] },
    ],
    pearls: [
      'Waxy flexibility is scored 0 or 3 only — it is an all-or-none sign.',
      'Screen positive ≠ treated: confirm with the full examination and a lorazepam challenge.',
      'Autonomic instability with catatonic signs suggests malignant catatonia — a psychiatric emergency overlapping with NMS.',
    ],
  },

  // ─── 10. Abnormal Involuntary Movement Scale (AIMS) ─────────────────────────
  {
    id: 'aims',
    name: 'Abnormal Involuntary Movement Scale (AIMS)',
    shortName: 'AIMS',
    description:
      'NIMH 12-item clinician rating of tardive dyskinesia: items 1–7 rate body-region severity 0–4 (total 0–28); items 8–10 rate global severity, incapacitation, and awareness; dental items contextualize orofacial findings.',
    category: 'psychiatry',
    tags: ['aims', 'tardive dyskinesia', 'td', 'antipsychotic', 'movement disorder', 'extrapyramidal', 'nimh'],
    whenToUse:
      'Baseline and periodic (at least annual; every 3–6 months in high-risk patients) TD monitoring in anyone on chronic antipsychotics or other dopamine-blocking agents.',
    whyUse:
      'Standardized examination and documentation of TD severity; underpins Schooler–Kane research criteria and tracks response to dose changes or VMAT2 inhibitors.',
    isQuestionnaire: true,
    inputs: [
      selectInput('q1', '1. Muscles of facial expression', SEVERITY_04, 0, 'Forehead, eyebrows, periorbital area, cheeks — frowning, blinking, smiling, grimacing. Rate the highest severity observed; rate activation-elicited movements one grade lower than spontaneous ones.'),
      selectInput('q2', '2. Lips and perioral area', SEVERITY_04, 0, 'Puckering, pouting, smacking.'),
      selectInput('q3', '3. Jaw', SEVERITY_04, 0, 'Biting, clenching, chewing, mouth opening, lateral movement.'),
      selectInput('q4', '4. Tongue', SEVERITY_04, 0, 'Rate only INCREASES in movement in and out of the mouth — NOT inability to sustain movement. Darting in and out of mouth.'),
      selectInput('q5', '5. Upper extremity (arms, wrists, hands, fingers)', SEVERITY_04, 0, 'Choreic movements (rapid, purposeless, irregular, spontaneous) and athetoid movements (slow, irregular, complex, serpentine). DO NOT include tremor (repetitive, regular, rhythmic).'),
      selectInput('q6', '6. Lower extremity (legs, knees, ankles, toes)', SEVERITY_04, 0, 'Lateral knee movement, foot tapping, heel dropping, foot squirming, inversion/eversion of foot.'),
      selectInput('q7', '7. Neck, shoulders, hips', SEVERITY_04, 0, 'Rocking, twisting, squirming, pelvic gyrations.'),
      selectInput('q8', '8. Severity of abnormal movements overall', SEVERITY_04, 0, 'Global judgement of overall severity.'),
      selectInput('q9', '9. Incapacitation due to abnormal movements', SEVERITY_04, 0, 'How much the movements incapacitate the patient functionally.'),
      selectInput('q10', "10. Patient's awareness of abnormal movements", [
        { label: 'No awareness', value: 0, points: 0 },
        { label: 'Aware, no distress', value: 1, points: 1 },
        { label: 'Aware, mild distress', value: 2, points: 2 },
        { label: 'Aware, moderate distress', value: 3, points: 3 },
        { label: 'Aware, severe distress', value: 4, points: 4 },
      ], 0, 'Patient awareness and associated distress.'),
      yesNo('dental', 'Current problems with teeth and/or dentures?', null, 'Dental status can mimic or confound orofacial dyskinesia — note for interpretation.', false),
      yesNo('dentures', 'Are dentures usually worn?', null, 'Contextual item for oral movement interpretation.', false),
      yesNo('edentia', 'Edentia?', null, 'Missing teeth alter orofacial movement appearance.', false),
      yesNo('sleep', 'Do movements disappear in sleep?', null, 'TD movements typically disappear during sleep.', true),
      yesNo('exposure3mo', 'Cumulative neuroleptic (dopamine-blocker) exposure ≥3 months?', null, 'Required for Schooler–Kane probable-TD research criteria (also documented for withdrawal-emergent TD).', true),
    ],
    calculate(values) {
      let total = 0;
      let countGe2 = 0;
      let anyGe3 = 0;
      let maxItem = 0;
      for (let i = 1; i <= 7; i++) {
        const v = num(values[`q${i}`]);
        total += v;
        if (v >= 2) countGe2++;
        if (v >= 3) anyGe3++;
        if (v > maxItem) maxItem = v;
      }
      const movementCriteria = anyGe3 >= 1 || countGe2 >= 2;
      const probableTD = movementCriteria && bool(values.exposure3mo);
      const r = riskFromThresholds(total, [
        {
          max: 0,
          level: 'low',
          label: 'No abnormal movements (0)',
          interpretation: 'AIMS items 1–7 total 0 — no abnormal movements observed. Continue routine periodic monitoring while on dopamine blockers.',
        },
        {
          max: 28,
          level: movementCriteria ? 'high' : 'low',
          label: movementCriteria
            ? probableTD
              ? 'Movements meet Schooler–Kane severity criteria'
              : 'Movements meet severity criteria (exposure <3 mo or unconfirmed)'
            : 'Subthreshold movements',
          interpretation: movementCriteria
            ? `AIMS ${total}/28 (max item ${maxItem}). At least ${anyGe3 > 0 ? '1 body area ≥3 (moderate)' : `${countGe2} body areas ≥2 (mild)`}${probableTD ? ' with ≥3 months cumulative dopamine-blocker exposure — meets Schooler–Kane criteria for probable tardive dyskinesia' : ' — but documented ≥3-month neuroleptic exposure is required for the probable-TD research diagnosis'}.`
            : `AIMS ${total}/28 — abnormal movements present but below Schooler–Kane severity thresholds (needs ≥1 area ≥3 or ≥2 areas ≥2). Document and re-rate on schedule.`,
        },
      ]);
      return {
        score: total,
        unit: 'points (0–28)',
        ...r,
        details: [
          { label: 'Items 1–7 total', value: `${total}/28` },
          { label: 'Body areas ≥2', value: `${countGe2}` },
          { label: 'Body areas ≥3', value: `${anyGe3}` },
          { label: 'Global severity (item 8)', value: `${num(values.q8)}/4` },
          { label: 'Incapacitation (item 9)', value: `${num(values.q9)}/4` },
          { label: 'Awareness (item 10)', value: `${num(values.q10)}/4` },
          { label: 'Schooler–Kane probable TD', value: probableTD ? 'Criteria met' : 'Not met' },
        ],
        recommendations: movementCriteria
          ? [
              'Re-evaluate the need for and dose of the dopamine blocker; consider switch to lower-TD-risk agent.',
              'Discuss VMAT2 inhibitors (valbenazine, deutetrabenazine) for moderate–severe or functionally impairing TD.',
              'Continue regular AIMS monitoring to track course.',
            ]
          : ['Continue scheduled AIMS monitoring.', 'Educate patient/family on early TD signs.'],
      };
    },
    evidence: {
      summary:
        'AIMS rates 7 body regions 0–4 (total 0–28) plus global severity, incapacitation, and awareness items. Schooler–Kane research criteria for probable TD: moderate (≥3) movements in ≥1 body area OR mild (≥2) in ≥2 areas, with ≥3 months cumulative neuroleptic exposure.',
      formula: 'Sum of items 1–7 (0–28); items 8–10 and dental items reported separately',
      validation:
        'Standardized NIMH/ECDEU instrument (1976). The APA notes no single total-score threshold mandates intervention — interpretation pairs item distribution with functional impact; this calculator additionally reports the Schooler–Kane criteria status.',
      references: [
        {
          title: 'Abnormal Involuntary Movement Scale (AIMS), in ECDEU Assessment Manual for Psychopharmacology, Revised',
          citation: 'Guy W (ed). US Dept of Health, Education, and Welfare/NIMH. 1976:534-537',
          year: 1976,
        },
        {
          title: 'Research diagnoses for tardive dyskinesia',
          citation: 'Schooler NR, Kane JM. Arch Gen Psychiatry. 1982;39(4):486-487',
          year: 1982,
        },
      ],
    },
    nextSteps: [
      { condition: 'Schooler–Kane criteria met', actions: ['Reassess antipsychotic necessity/dose/agent', 'Consider VMAT2 inhibitor', 'Serial AIMS monitoring', 'Neurology/psychiatry referral for complex cases'] },
      { condition: 'Subthreshold movements', actions: ['Document', 'Re-rate at next scheduled interval', 'Reinforce adherence to monitoring schedule'] },
    ],
    pearls: [
      'Rate the highest severity observed; activation-elicited movements score one grade below spontaneous ones.',
      'Tongue item counts only increases of movement — not failure to sustain protrusion.',
      'Do not include rhythmic tremor (that suggests drug-induced parkinsonism, not TD).',
      'Movements that disappear in sleep are consistent with TD.',
    ],
  },

  // ─── 11. Current Opioid Misuse Measure (COMM) ───────────────────────────────
  {
    id: 'comm',
    name: 'Current Opioid Misuse Measure (COMM)',
    shortName: 'COMM',
    description:
      'Butler 17-item self-report of aberrant medication-related behavior in patients already on long-term opioid therapy. Each item 0–4; ≥9 suggests possible misuse.',
    category: 'psychiatry',
    tags: ['comm', 'opioid', 'misuse', 'chronic pain', 'aberrant', 'butler', 'monitoring'],
    whenToUse:
      'Periodic monitoring of patients already prescribed long-term opioid therapy for chronic pain — identifies aberrant medication-related behaviors prompting closer review.',
    whyUse:
      'Detects current (past-30-day) misuse behaviors — complementary to urine drug testing and prescription-monitoring review rather than a predictive risk score.',
    isQuestionnaire: true,
    inputs: [
      selectInput('q1', '1. How often have you had trouble with thinking clearly or had memory problems?', FREQ_04, 0, 'In the past 30 days.'),
      selectInput('q2', '2. How often do people complain that you are not completing necessary tasks?', FREQ_04, 0, 'In the past 30 days — doing things that need to be done (class, work, appointments).'),
      selectInput('q3', '3. How often have you had to go to someone other than your prescribing physician to get sufficient pain relief from your medications?', FREQ_04, 0, 'In the past 30 days — e.g., another doctor, the Emergency Room.'),
      selectInput('q4', '4. How often have you taken your medications differently from how they are prescribed?', FREQ_04, 0, 'In the past 30 days.'),
      selectInput('q5', '5. How often have you seriously thought about hurting yourself?', FREQ_04, 0, 'In the past 30 days — any endorsement prompts direct safety assessment.'),
      selectInput('q6', '6. How much of your time was spent thinking about opioid medications?', FREQ_04, 0, 'In the past 30 days — having enough, taking them, dosing schedule, etc.'),
      selectInput('q7', '7. How often have you been in an argument?', FREQ_04, 0, 'In the past 30 days.'),
      selectInput('q8', '8. How often have you had trouble controlling your anger?', FREQ_04, 0, 'In the past 30 days — e.g., road rage, screaming.'),
      selectInput('q9', '9. How often have you needed to take pain medications belonging to someone else?', FREQ_04, 0, 'In the past 30 days.'),
      selectInput('q10', '10. How often have you been worried about how you\u2019re handling your medications?', FREQ_04, 0, 'In the past 30 days.'),
      selectInput('q11', '11. How often have others been worried about how you\u2019re handling your medications?', FREQ_04, 0, 'In the past 30 days.'),
      selectInput('q12', '12. How often have you had to make an emergency phone call or show up at the clinic without an appointment?', FREQ_04, 0, 'In the past 30 days.'),
      selectInput('q13', '13. How often have you gotten angry with people?', FREQ_04, 0, 'In the past 30 days.'),
      selectInput('q14', '14. How often have you had to take more of your medication than prescribed?', FREQ_04, 0, 'In the past 30 days.'),
      selectInput('q15', '15. How often have you borrowed pain medication from someone else?', FREQ_04, 0, 'In the past 30 days.'),
      selectInput('q16', '16. How often have you used your pain medicine for symptoms other than for pain?', FREQ_04, 0, 'In the past 30 days — e.g., to help you sleep, improve mood, or relieve stress.'),
      selectInput('q17', '17. How often have you had to visit the Emergency Room?', FREQ_04, 0, 'In the past 30 days.'),
    ],
    calculate(values) {
      let score = 0;
      for (let i = 1; i <= 17; i++) score += num(values[`q${i}`]);
      const selfHarm = num(values.q5) > 0;
      const r = riskFromThresholds(score, [
        {
          max: 8,
          level: 'low',
          label: 'Below cutoff (<9)',
          interpretation: `COMM ${score}/68 — below the ≥9 cutoff suggesting aberrant medication-related behavior. Continue standard monitoring per the opioid agreement.`,
        },
        {
          max: 68,
          level: 'high',
          label: 'Positive screen (≥9)',
          interpretation: `COMM ${score}/68 ≥9 — suggests possible aberrant medication-related behavior. Review prescription drug monitoring data, urine drug testing, and the treatment plan; evaluate for opioid tapering or alternative strategies and behavioral health support.`,
        },
      ]);
      return {
        score,
        unit: 'points (0–68)',
        ...r,
        details: [
          { label: 'Cutoff', value: '≥9 suggests aberrant medication-related behavior (Butler et al.)' },
          { label: 'Item 5 (self-harm thoughts)', value: selfHarm ? 'Endorsed — direct assessment required' : 'Not endorsed' },
        ],
        recommendations:
          score >= 9
            ? [
                'Corroborate with urine drug screen and PDMP review before acting on the score.',
                'Evaluate need for opioid taper or alternative pain management.',
                'Provide/refer for behavioral health support, including addiction treatment if appropriate.',
                'If opioids continue, increase monitoring frequency (visits, UDT, pill counts).',
              ]
            : ['Continue regular monitoring per standard care.', 'Reinforce adherence and opioid-safety education.'],
        alerts: selfHarm
          ? ['COMM item 5 endorsed: patient has seriously thought about hurting themselves in the past 30 days. Perform a direct suicide risk assessment now; US crisis line: call or text 988.']
          : undefined,
      };
    },
    evidence: {
      summary:
        'COMM asks 17 past-30-day items each scored 0–4 (Never/Seldom/Sometimes/Often/Very often), total 0–68. A score ≥9 suggests aberrant medication-related behavior.',
      formula: 'Sum of 17 items (0–68); positive if ≥9',
      validation:
        'Butler et al. (2007): 17 items selected from a 40-item alpha version; excellent internal consistency and 1-week test–retest reliability; ROC-derived cutoff ≈9 balanced sensitivity/specificity vs the PDUQ interview and toxicology.',
      references: [
        {
          title: 'Development and validation of the Current Opioid Misuse Measure',
          citation: 'Butler SF, Budman SH, Fernandez KC, et al. Pain. 2007;130(1-2):144-156',
          year: 2007,
          pmid: '17493754',
          doi: '10.1016/j.pain.2007.01.014',
        },
      ],
    },
    nextSteps: [
      { condition: 'COMM ≥9', actions: ['UDT + PDMP review', 'Assess for OUD (DSM-5)', 'Consider taper/alternative therapy', 'Behavioral health referral', 'Intensify monitoring'] },
      { condition: 'Item 5 >0', actions: ['Immediate suicide risk assessment', 'Safety plan', 'Crisis resources (988 in US)'] },
    ],
    pearls: [
      'COMM measures CURRENT behavior (30-day window) — it monitors, it does not predict future misuse.',
      'Interpret alongside urine toxicology and PDMP data; self-report alone is not confirmatory.',
      'Item 5 is a safety flag independent of the total score.',
    ],
  },

  // ─── 12. DIRE Score ─────────────────────────────────────────────────────────
  {
    id: 'dire',
    name: 'DIRE Score (Diagnosis, Intractability, Risk, Efficacy)',
    shortName: 'DIRE',
    description:
      'Belgrade clinician rating predicting compliance and analgesic efficacy of long-term opioid therapy for chronic noncancer pain. Seven items scored 1–3 (total 7–21); higher = better candidate.',
    category: 'psychiatry',
    tags: ['dire', 'opioid', 'chronic pain', 'compliance', 'belgrade', 'risk'],
    whenToUse:
      'Assessing suitability for initiating or maintaining long-term opioid therapy in chronic noncancer pain — helps document balanced consideration of diagnosis, intractability, psychosocial risk, and efficacy.',
    whyUse:
      'Structured way to weigh both the analgesic rationale (diagnosis, intractability, efficacy) and misuse risk (psychological, chemical health, reliability, social support) before committing to maintenance opioids.',
    isQuestionnaire: true,
    inputs: [
      selectInput('diagnosis', 'Diagnosis', [
        { label: 'Benign chronic condition, minimal objective findings, or no definite diagnosis', value: 1, points: 1 },
        { label: 'Slowly progressive condition concordant with moderate pain, or fixed condition with moderate objective findings', value: 2, points: 2 },
        { label: 'Advanced condition concordant with severe pain with objective findings', value: 3, points: 3 },
      ], 2, 'Confidence that an objective diagnosis explains the pain complaint.'),
      selectInput('intractability', 'Intractability', [
        { label: 'Few therapies tried; patient takes a passive role in pain management', value: 1, points: 1 },
        { label: 'Most customary treatments tried but patient not fully engaged, or barriers prevent engagement (insurance, transportation, medical illness)', value: 2, points: 2 },
        { label: 'Patient fully engaged in a spectrum of appropriate treatments but with inadequate response', value: 3, points: 3 },
      ], 2, 'Whether reasonable non-opioid options have been exhausted with an engaged patient.'),
      selectInput('psych', 'Psychological risk', [
        { label: 'Serious personality dysfunction or mental illness interfering with care', value: 1, points: 1 },
        { label: 'Personality or mental health interferes moderately', value: 2, points: 2 },
        { label: 'Good communication with clinic; no significant personality dysfunction or mental illness', value: 3, points: 3 },
      ], 2, 'Risk domain — psychological health.'),
      selectInput('chemical', 'Chemical health risk', [
        { label: 'Active or very recent use of illicit drugs, excessive alcohol, or prescription drug abuse', value: 1, points: 1 },
        { label: 'Chemical coper (uses medications to cope with stress) or history of chemical dependence in remission', value: 2, points: 2 },
        { label: 'No chemical dependence history; not drug-focused or chemically reliant', value: 3, points: 3 },
      ], 2, 'Risk domain — substance use history and chemical coping.'),
      selectInput('reliability', 'Reliability risk', [
        { label: 'History of numerous problems (medication misuse, missed appointments, rarely follows through)', value: 1, points: 1 },
        { label: 'Occasional difficulties with compliance but generally reliable', value: 2, points: 2 },
        { label: 'Highly reliable patient with meds, appointments, and treatment', value: 3, points: 3 },
      ], 2, 'Risk domain — adherence history.'),
      selectInput('social', 'Social support risk', [
        { label: 'Life in chaos; little family support, few close relationships, loss of most normal life roles', value: 1, points: 1 },
        { label: 'Reduction in some relationships and life roles', value: 2, points: 2 },
        { label: 'Supportive family/close relationships; involved in work or school and no social isolation', value: 3, points: 3 },
      ], 2, 'Risk domain — social support and role function.'),
      selectInput('efficacy', 'Efficacy', [
        { label: 'Poor function or minimal pain relief despite moderate to high doses', value: 1, points: 1 },
        { label: 'Moderate benefit with improved function in a number of ways (or insufficient information — opioid not tried, or very low doses/trial too short)', value: 2, points: 2 },
        { label: 'Good improvement in pain/function and quality of life with stable doses over time', value: 3, points: 3 },
      ], 2, 'Observed or expected analgesic efficacy and functional benefit.'),
    ],
    calculate(values) {
      const score =
        num(values.diagnosis, 2) +
        num(values.intractability, 2) +
        num(values.psych, 2) +
        num(values.chemical, 2) +
        num(values.reliability, 2) +
        num(values.social, 2) +
        num(values.efficacy, 2);
      const r = riskFromThresholds(score, [
        {
          max: 13,
          level: 'high',
          label: 'Poor candidate (7–13)',
          interpretation: `DIRE ${score}/21 — low score predicts poorer compliance and efficacy with long-term opioid therapy. Escalating opioids is unlikely to help; prioritize non-opioid multimodal pain management and address modifiable risk domains.`,
        },
        {
          max: 21,
          level: 'low',
          label: 'Reasonable candidate (14–21)',
          interpretation: `DIRE ${score}/21 — score ≥14 predicts better compliance and efficacy. If opioids are used, apply standard safeguards (agreement, PDMP, UDT, lowest effective dose, functional goals) and re-evaluate periodically.`,
        },
      ]);
      return {
        score,
        unit: 'points (7–21)',
        ...r,
        details: [
          { label: 'D', value: `${num(values.diagnosis)}` },
          { label: 'I', value: `${num(values.intractability)}` },
          { label: 'R (psych/chemical/reliability/social)', value: `${num(values.psych)} + ${num(values.chemical)} + ${num(values.reliability)} + ${num(values.social)}` },
          { label: 'E', value: `${num(values.efficacy)}` },
          { label: 'Threshold', value: '≥14 = favorable for long-term opioid therapy' },
        ],
        recommendations:
          score >= 14
            ? ['If opioids are prescribed: treatment agreement, PDMP check, baseline and periodic UDT, functional goals, lowest effective dose.', 'Re-evaluate periodically — risk status changes.']
            : [
                'Optimize non-opioid multimodal therapy (interventional, physical, behavioral).',
                'Address modifiable risk domains (psych, chemical health, reliability, social support) before reconsidering opioids.',
                'Evidence for long-term opioids in chronic noncancer pain is limited — apply best evidence plus clinical judgment.',
              ],
      };
    },
    evidence: {
      summary:
        'DIRE scores seven clinician-rated items 1–3 each: Diagnosis, Intractability, Risk (psychological health, chemical health, reliability, social support), and Efficacy. Total 7–21; higher scores predict better compliance and efficacy.',
      formula: 'Sum of 7 items (7–21)',
      validation:
        'Belgrade et al. (2006, n=61 vignettes): sensitivity/specificity for predicting compliance 94%/87%, efficacy 81%/76%, disposition 86%/73%; inter- and intra-rater ICC ≈0.94–0.95. A score ≥14 is the commonly applied favorable band.',
      references: [
        {
          title: 'The DIRE Score: predicting outcomes of opioid prescribing for chronic pain',
          citation: 'Belgrade MJ, Schamber CD, Lindgren BR. J Pain. 2006;7(9):671-681',
          year: 2006,
          pmid: '16942953',
          doi: '10.1016/j.jpain.2006.03.001',
        },
      ],
    },
    nextSteps: [
      { condition: 'DIRE ≥14', actions: ['Standard opioid safeguards (agreement, PDMP, UDT)', 'Set functional goals', 'Periodic re-evaluation'] },
      { condition: 'DIRE 7–13', actions: ['Non-opioid multimodal management', 'Address modifiable risk domains', 'Reassess after risk optimization'] },
    ],
    pearls: [
      'DIRE is a clinician rating — it structures judgment, it does not replace it.',
      'Four of seven items are psychosocial risk domains; a strong pain diagnosis cannot compensate for high risk.',
      'Unlike ORT (predicts future aberrancy), DIRE weighs indication AND risk together.',
    ],
  },

  // ─── 13. Brief Addiction Monitor (BAM) ──────────────────────────────────────
  {
    id: 'bam',
    name: 'Brief Addiction Monitor (BAM)',
    shortName: 'BAM',
    description:
      'Cacciola 17-item multidimensional recovery monitor for substance use disorders. Yields Use (0–12), Risk (0–24), and Protective (0–24) subscale scores plus a standalone progress item.',
    category: 'psychiatry',
    tags: ['bam', 'addiction', 'substance use', 'recovery', 'monitoring', 'cacciola', 'measurement-based care'],
    whenToUse:
      'Measurement-based monitoring of patients in (or entering) substance use disorder treatment — repeated administration tracks risk factors, protective factors, and substance use over time.',
    whyUse:
      'Short multidomain monitor that yields actionable subscales (Use, Risk, Protective) and item-level targets; designed for serial administration rather than case-finding.',
    isQuestionnaire: true,
    inputs: [
      selectInput('q1', '1. In the past 30 days, how would you say your physical health has been?', [
        { label: 'Excellent', value: 0, points: 0 },
        { label: 'Very good', value: 1, points: 1 },
        { label: 'Good', value: 2, points: 2 },
        { label: 'Fair', value: 3, points: 3 },
        { label: 'Poor', value: 4, points: 4 },
      ], 2, 'Risk subscale item.'),
      selectInput('q2', '2. In the past 30 days, how many nights did you have trouble falling asleep or staying asleep?', DAYS_30, 1, 'Risk subscale item.'),
      selectInput('q3', '3. In the past 30 days, how many days have you felt depressed, anxious, angry, or very upset throughout most of the day?', DAYS_30, 1, 'Risk subscale item.'),
      selectInput('q4', '4. In the past 30 days, how many days did you drink ANY alcohol?', DAYS_30, 0, 'Use subscale item. If 0, item 5 is scored 0.'),
      selectInput('q5', '5. In the past 30 days, how many days did you have at least 5 drinks (if you are a man) or at least 4 drinks (if you are a woman)?', DAYS_30, 0, 'Use subscale item — heavy drinking days. Answer 0 if no alcohol was used.'),
      selectInput('q6', '6. In the past 30 days, how many days did you use any illegal/street drugs or abuse any prescription medications?', DAYS_30, 0, 'Use subscale item.'),
      selectInput('q8', '8. In the past 30 days, how much were you bothered by cravings or urges to drink alcohol or use drugs?', EXTENT_04, 0, 'Risk subscale item.'),
      selectInput('q9', '9. How confident are you in your ability to be completely abstinent (clean) from alcohol and drugs in the next 30 days?', EXTENT_04, 2, 'Protective subscale item — higher = more protection.'),
      selectInput('q10', '10. In the past 30 days, how many days did you attend self-help meetings like AA or NA to support your recovery?', DAYS_30, 0, 'Protective subscale item.'),
      selectInput('q11', '11. In the past 30 days, how many days were you in any situations or with any people that might put you at an increased risk for using alcohol or drugs?', DAYS_30, 0, 'Risk subscale item — risky "people, places, or things".'),
      selectInput('q12', '12. Does your religion or spirituality help support your recovery?', EXTENT_04, 0, 'Protective subscale item.'),
      selectInput('q13', '13. In the past 30 days, how many days did you spend much of the time at work, school, or doing volunteer work?', DAYS_30, 0, 'Protective subscale item.'),
      selectInput('q14', '14. Do you have enough income (from legal sources) to pay for necessities such as housing, transportation, food, and clothing for yourself and your dependents?', [
        { label: 'No', value: 0, points: 0 },
        { label: 'Yes', value: 4, points: 4 },
      ], 0, 'Protective subscale item — Yes scores 4 (more protection).'),
      selectInput('q15', '15. In the past 30 days, how much have you been bothered by arguments or had problems getting along with any family members or friends?', EXTENT_04, 0, 'Risk subscale item.'),
      selectInput('q16', '16. In the past 30 days, how many days were you in contact or spent time with any family members or friends who are supportive of your recovery?', DAYS_30, 1, 'Protective subscale item.'),
      selectInput('q17', '17. How satisfied are you with your progress toward achieving your recovery goals?', EXTENT_04, 2, 'Standalone progress item — not part of the three subscales.'),
    ],
    calculate(values) {
      const n = (id: string) => num(values[id]);
      const use = n('q4') + n('q5') + n('q6');
      const risk = n('q1') + n('q2') + n('q3') + n('q8') + n('q11') + n('q15');
      const protective = n('q9') + n('q10') + n('q12') + n('q13') + n('q14') + n('q16');
      const progress = n('q17');
      const flags: string[] = [];
      if (use >= 1) flags.push('Any use (Use ≥1)');
      if (risk >= 12) flags.push('Elevated risk factors (Risk ≥12)');
      if (protective <= 12) flags.push('Weak protective factors (Protective ≤12)');
      const flagCount = flags.length;
      const riskLevel = flagCount >= 3 ? 'high' : flagCount >= 1 ? 'moderate' : 'low';
      return {
        score: `U${use} / R${risk} / P${protective}`,
        label: flagCount === 0 ? 'No flags this administration' : `${flagCount} subscale flag(s)`,
        interpretation:
          flagCount === 0
            ? `BAM Use ${use}/12, Risk ${risk}/24, Protective ${protective}/24 — no subscale flags. Compare with prior administrations; examine individual items for treatment targets.`
            : `BAM Use ${use}/12, Risk ${risk}/24, Protective ${protective}/24 — flags: ${flags.join('; ')}. Per the published clinical guidelines these call for closer examination and targeted care-plan adjustment.`,
        riskLevel,
        details: [
          { label: 'Use subscale (items 4,5,6)', value: `${use}/12` },
          { label: 'Risk subscale (items 1,2,3,8,11,15)', value: `${risk}/24` },
          { label: 'Protective subscale (items 9,10,12,13,14,16)', value: `${protective}/24` },
          { label: 'Recovery-progress item (17)', value: `${progress}/4` },
          { label: 'Guideline flags', value: flags.length ? flags.join('; ') : 'None' },
        ],
        recommendations:
          flagCount > 0
            ? [
                'Review item-level responses to target the flagged domains.',
                'For Use flag: consider pharmacotherapy (e.g., naltrexone for alcohol), motivational interviewing, or higher level of care.',
                'For Risk flag: address health, sleep, mood, craving (e.g., medication for cravings), risky situations, and family/social conflict; CBT/relapse-prevention skills.',
                'For Protective flag: build sober support networks, 12-step facilitation, self-help attendance, work/case-management assistance.',
                'Compare with previous BAM scores — change over time is the key output.',
              ]
            : ['Continue measurement-based monitoring; compare serial scores for step-up/step-down decisions.'],
      };
    },
    evidence: {
      summary:
        'BAM is a 17-item monitor scored as three subscales: Use = items 4+5+6 (0–12); Risk = items 1,2,3,8,11,15 (0–24); Protective = items 9,10,12,13,14,16 (0–24). Item 7 (drug-type elaboration) is unscored; item 17 is a standalone progress rating. Clinical guidelines flag Use ≥1, Risk ≥12, Protective ≤12.',
      formula: 'Three subscale sums; item 17 standalone',
      validation:
        'Cacciola et al. (2013, n=175 VA outpatients): exploratory factor analysis yielded Recovery Protection, Physical & Psychological Problems, and Substance Use & Risk factors — all sensitive to change with good test–retest reliability; subscale scoring per the instrument\u2019s clinical guidelines (CASAT/VA).',
      references: [
        {
          title: 'Development and initial evaluation of the Brief Addiction Monitor (BAM)',
          citation: 'Cacciola JS, Alterman AI, DePhilippis D, et al. J Subst Abuse Treat. 2013;44(3):256-263',
          year: 2013,
          pmid: '22898042',
          doi: '10.1016/j.jsat.2012.07.013',
        },
      ],
    },
    nextSteps: [
      { condition: 'Use ≥1', actions: ['Examine circumstances of use', 'Consider pharmacotherapy/MI', 'Review level of care'] },
      { condition: 'Risk ≥12', actions: ['Target flagged items (health, sleep, mood, cravings, risky situations, social conflict)', 'CBT/relapse prevention', 'Medical or mental health referral'] },
      { condition: 'Protective ≤12', actions: ['Build sober supports and self-help involvement', 'Case management for work/income/stability'] },
    ],
    pearls: [
      'BAM is a progress monitor, NOT a screening tool for case-finding.',
      'Item-level responses often matter more than subscale totals — treat the flagged domains.',
      'Serial comparison is the point: sizeable per-scale changes indicate progress or deterioration.',
    ],
  },

  // ─── 14. SCOFF Questionnaire ────────────────────────────────────────────────
  {
    id: 'scoff',
    name: 'Sick, Control, One, Fat, Food (SCOFF) Questionnaire',
    shortName: 'SCOFF',
    description:
      'Morgan 5-item yes/no screen for anorexia nervosa and bulimia nervosa. Each "yes" = 1 point; ≥2 indicates likely eating disorder needing full assessment.',
    category: 'psychiatry',
    tags: ['scoff', 'eating disorder', 'anorexia', 'bulimia', 'screening', 'morgan'],
    whenToUse:
      'Screening for eating disorders in primary care or any setting where anorexia or bulimia is suspected (unexplained weight loss, amenorrhea, electrolyte derangements, food preoccupation).',
    whyUse:
      'Five memorable questions that raise the suspicion of an eating disorder; in the original study ≥2 gave 100% sensitivity for anorexia and bulimia combined.',
    isQuestionnaire: true,
    inputs: [
      yesNo('sick', 'S — Do you make yourself Sick because you feel uncomfortably full?', 1, 'Self-induced vomiting after feeling uncomfortably full.', false),
      yesNo('control', 'C — Do you worry you have lost Control over how much you eat?', 1, 'Loss of control over eating.', true),
      yesNo('one', 'O — Have you recently lost more than One stone (14 lb / 6.35 kg) in a 3-month period?', 1, 'Recent marked weight loss.', false),
      yesNo('fat', 'F — Do you believe yourself to be Fat when others say you are too thin?', 1, 'Body-image distortion.', false),
      yesNo('food', 'F — Would you say that Food dominates your life?', 1, 'Preoccupation with food.', false),
    ],
    calculate(values) {
      const score =
        (bool(values.sick) ? 1 : 0) +
        (bool(values.control) ? 1 : 0) +
        (bool(values.one) ? 1 : 0) +
        (bool(values.fat) ? 1 : 0) +
        (bool(values.food) ? 1 : 0);
      const positive = score >= 2;
      return {
        score,
        unit: 'points (0–5)',
        label: positive ? 'Positive screen (≥2)' : 'Negative screen',
        interpretation: positive
          ? `SCOFF ${score}/5 ≥2 — raises suspicion of anorexia nervosa or bulimia nervosa. Proceed to a diagnostic eating-disorder assessment (history, weight/vitals, electrolytes, ECG as indicated).`
          : `SCOFF ${score}/5 — below the ≥2 threshold. A negative screen does not fully exclude an eating disorder; reassess if clinical suspicion persists.`,
        riskLevel: positive ? 'high' : 'low',
        details: [{ label: 'Cutoff', value: '≥2 = positive screen (Morgan et al.)' }],
        recommendations: positive
          ? [
              'Full eating-disorder assessment: weight/BMI trajectory, vitals, electrolytes, ECG.',
              'Refer to eating-disorder specialist/behavioral health.',
              'Ask specifically about bingeing, purging, restriction, laxative/diuretic use, and compulsive exercise.',
            ]
          : ['Rescreen if suspicion persists or weight/behavior changes.', 'Provide psychoeducation about disordered eating.'],
      };
    },
    evidence: {
      summary:
        'SCOFF = 5 yes/no questions (Sick, Control, One stone, Fat, Food). Score ≥2 indicates likely anorexia or bulimia warranting diagnostic assessment.',
      formula: 'Sum of 5 items (0–5); positive if ≥2',
      validation:
        'Morgan, Reid & Lacey (1999): at the ≥2 cutoff, SCOFF detected anorexia and bulimia with 100% sensitivity and 87.5% specificity in the original clinical sample; subsequent primary-care studies show lower sensitivity (the screen is best used as a first-line flag, not a rule-out).',
      references: [
        {
          title: 'The SCOFF questionnaire: assessment of a new screening tool for eating disorders',
          citation: 'Morgan JF, Reid F, Lacey JH. BMJ. 1999;319(7223):1467-1468',
          year: 1999,
          pmid: '10582927',
          doi: '10.1136/bmj.319.7223.1467',
        },
      ],
    },
    nextSteps: [
      { condition: 'SCOFF ≥2', actions: ['Full eating-disorder assessment', 'Medical workup (electrolytes, ECG, vitals)', 'Specialist referral'] },
    ],
    pearls: [
      'The mnemonic is the point — the five questions take under a minute.',
      'A single yes does not make the screen positive; ≥2 does.',
      'Eating disorders carry the highest mortality of psychiatric illnesses — screen high-risk presentations deliberately.',
    ],
  },

  // ─── 15. Short Michigan Alcoholism Screening Test (SMAST) ───────────────────
  {
    id: 'smast',
    name: 'Short Michigan Alcoholism Screening Test (SMAST)',
    shortName: 'SMAST',
    description:
      'Selzer 13-item yes/no alcoholism screen — unit scoring, each endorsed item = 1 point (three items are reverse-keyed). ≥3 suggests a borderline problem; ≥4 needs full assessment.',
    category: 'psychiatry',
    tags: ['smast', 'mast', 'alcohol', 'alcoholism', 'screening', 'selzer'],
    whenToUse:
      'Screening non-geriatric adults for alcohol-use problems in primary care, mental health, or hospital settings. (Use SMAST-G for geriatric patients.)',
    whyUse:
      'A reliable self-administered 13-item alcoholism screen derived from the MAST, with fewer false-positives than the full MAST.',
    isQuestionnaire: true,
    inputs: [
      yesNoReversed('q1', '1. Do you feel you are a normal drinker?', 'Keyed "No" — feeling one drinks more than most is scored +1.', 'yes'),
      yesNo('q2', '2. Does your spouse, a parent, or other near relative ever worry or complain about your drinking?', 1, 'Endorsement of collateral concern.', false),
      yesNo('q3', '3. Do you ever feel guilty about your drinking?', 1, 'Guilt or remorse related to drinking.', false),
      yesNoReversed('q4', '4. Do friends or relatives think you are a normal drinker?', 'Keyed "No" — others noticing a problem is scored +1.', 'yes'),
      yesNoReversed('q5', '5. Are you able to stop drinking when you want to?', 'Keyed "No" — loss of control is scored +1.', 'yes'),
      yesNo('q6', '6. Have you ever attended a meeting of Alcoholics Anonymous (AA)?', 1, 'Past help-seeking for drinking.', false),
      yesNo('q7', '7. Has drinking ever created problems between you and your spouse, a parent, or other near relative?', 1, 'Relationship conflict caused by drinking.', false),
      yesNo('q8', '8. Have you ever gotten into trouble at work because of drinking?', 1, 'Occupational consequences of drinking.', false),
      yesNo('q9', '9. Have you ever neglected your obligations, your family, or your work for two or more days in a row because you were drinking?', 1, 'Sustained functional neglect due to drinking.', false),
      yesNo('q10', '10. Have you ever gone to anyone for help about your drinking?', 1, 'Any prior help-seeking for drinking.', false),
      yesNo('q11', '11. Have you ever been in a hospital because of drinking?', 1, 'Hospitalization for drinking or its complications.', false),
      yesNo('q12', '12. Have you ever been arrested for driving while intoxicated?', 1, 'Even if only for a few hours.', false),
      yesNo('q13', '13. Have you ever been arrested for other drunken behavior?', 1, 'Even if only for a few hours.', false),
    ],
    calculate(values) {
      const reversed = (v: number | string | boolean | null | undefined) => (str(v) === 'no' ? 1 : 0);
      const score =
        reversed(values.q1) +
        (bool(values.q2) ? 1 : 0) +
        (bool(values.q3) ? 1 : 0) +
        reversed(values.q4) +
        reversed(values.q5) +
        (bool(values.q6) ? 1 : 0) +
        (bool(values.q7) ? 1 : 0) +
        (bool(values.q8) ? 1 : 0) +
        (bool(values.q9) ? 1 : 0) +
        (bool(values.q10) ? 1 : 0) +
        (bool(values.q11) ? 1 : 0) +
        (bool(values.q12) ? 1 : 0) +
        (bool(values.q13) ? 1 : 0);
      const r = riskFromThresholds(score, [
        {
          max: 2,
          level: 'low',
          label: 'No problem indicated (0–2)',
          interpretation: `SMAST ${score}/13 — no alcohol problem reported per the published interpretation bands; no further action needed at this time.`,
        },
        {
          max: 3,
          level: 'moderate',
          label: 'Borderline (3)',
          interpretation: 'SMAST 3/13 — borderline alcohol problem reported; further investigation is required.',
        },
        {
          max: 13,
          level: 'high',
          label: 'Suggests alcoholism (≥4)',
          interpretation: `SMAST ${score}/13 ≥4 — potential alcohol problem; a full assessment (e.g., DSM-5 AUD criteria, AUDIT) is needed.`,
        },
      ]);
      return {
        score,
        unit: 'points (0–13)',
        ...r,
        details: [{ label: 'Keying', value: 'Items 1, 4, 5 are scored on a "No" answer; all others on "Yes"' }],
        recommendations:
          score >= 3
            ? [
                'Confirm with a structured assessment (DSM-5 AUD criteria, AUDIT).',
                'Screen for other substance use (e.g., DAST-10) — recommended alongside SMAST unless alcohol-only use is clear.',
                'If heavy use is confirmed, assess withdrawal risk before advising abrupt cessation.',
              ]
            : ['Routine preventive guidance; rescreen periodically.', 'Screen for other drug use if clinically indicated.'],
      };
    },
    evidence: {
      summary:
        'SMAST is the 13-item self-administered short form of the MAST with unit scoring — each endorsed item = 1 point (items 1, 4, 5 are reverse-keyed "No" answers). Bands: 0–2 no problem, 3 borderline, ≥4 suggests alcoholism (some sources use ≥3 as the positive cutoff).',
      formula: 'Sum of 13 items (0–13)',
      validation:
        'Selzer, Vinokur & van Rooijen (1975): the SMAST can be reliably self-administered and produces fewer false-positives than the full MAST. The original publication uses unit scoring (as implemented here); the weighted 5/2/1-point convention belongs to the MAST/BMAST, not the SMAST.',
      references: [
        {
          title: 'A self-administered Short Michigan Alcoholism Screening Test (SMAST)',
          citation: 'Selzer ML, Vinokur A, van Rooijen L. J Stud Alcohol. 1975;36(1):117-126',
          year: 1975,
          doi: '10.15288/jsa.1975.36.117',
        },
      ],
    },
    nextSteps: [
      { condition: 'SMAST ≥4', actions: ['DSM-5 AUD assessment', 'AUDIT confirmation', 'Assess withdrawal risk', 'Brief intervention/treatment referral'] },
      { condition: 'SMAST 3', actions: ['Further investigation — quantity/frequency and consequences', 'Repeat screening'] },
    ],
    pearls: [
      'Items 1, 4, and 5 are reverse-keyed — a "No" scores the point.',
      'Not validated in geriatric populations — use SMAST-G there.',
      'Pair with a drug-use screen (DAST-10) unless alcohol-only use is clear.',
    ],
  },

  // ─── 16. Benzodiazepine Conversion Calculator ───────────────────────────────
  {
    id: 'benzo-conversion',
    name: 'Benzodiazepine Conversion Calculator',
    shortName: 'Benzo conversion',
    description:
      'Approximate oral equipotent conversion between benzodiazepines via diazepam-milligram equivalents. Equivalence is a range based on expert opinion — not exact pharmacokinetics.',
    category: 'psychiatry',
    tags: ['benzodiazepine', 'conversion', 'equivalence', 'diazepam', 'taper', 'switch'],
    whenToUse:
      'Estimating equipotent doses when switching between oral benzodiazepines or planning a taper in a patient already taking benzodiazepines.',
    whyUse:
      'Approximate equivalency anchors help translate between agents; long half-life substitutions smooth interdose withdrawal. Conversions are ranges, not exact, and clinical titration is always required.',
    inputs: [
      selectInput('fromDrug', 'Converting from', [
        { label: 'ALPRAZolam (Xanax)', value: 'alprazolam' },
        { label: 'ChlordiazePOXIDE (Librium)', value: 'chlordiazepoxide' },
        { label: 'DiazePAM (Valium)', value: 'diazepam' },
        { label: 'ClonazePAM (KlonoPIN)', value: 'clonazepam' },
        { label: 'LORazepam (Ativan)', value: 'lorazepam' },
        { label: 'Oxazepam (Serax)', value: 'oxazepam' },
        { label: 'Temazepam (Restoril)', value: 'temazepam' },
        { label: 'Triazolam (Halcion)', value: 'triazolam' },
      ], 'lorazepam', 'Current benzodiazepine. Equipotent anchors approximate the published conversion tables (e.g., ~1 mg lorazepam ≈ 10 mg diazepam).'),
      numberInput('dose', 'Total daily dose of the FROM agent', {
        unit: 'mg/day',
        min: 0,
        max: 500,
        step: 0.125,
        exampleValue: 2,
        helpText: 'Total daily oral dose (scheduled plus 24-hour PRN use) of the "from" agent.',
      }),
      selectInput('toDrug', 'Converting to', [
        { label: 'ALPRAZolam (Xanax)', value: 'alprazolam' },
        { label: 'ChlordiazePOXIDE (Librium)', value: 'chlordiazepoxide' },
        { label: 'DiazePAM (Valium)', value: 'diazepam' },
        { label: 'ClonazePAM (KlonoPIN)', value: 'clonazepam' },
        { label: 'LORazepam (Ativan)', value: 'lorazepam' },
        { label: 'Oxazepam (Serax)', value: 'oxazepam' },
        { label: 'Temazepam (Restoril)', value: 'temazepam' },
        { label: 'Triazolam (Halcion)', value: 'triazolam' },
      ], 'diazepam', 'Target benzodiazepine. For tapers, long half-life agents (diazepam, clonazepam, chlordiazepoxide) are commonly chosen.'),
    ],
    calculate(values) {
      // mg of each agent approximately equivalent to diazepam 10 mg (Ashton-style table)
      const factors: Record<string, { perDiazepam10: number; name: string }> = {
        alprazolam: { perDiazepam10: 0.5, name: 'ALPRAZolam' },
        chlordiazepoxide: { perDiazepam10: 25, name: 'ChlordiazePOXIDE' },
        diazepam: { perDiazepam10: 10, name: 'DiazePAM' },
        clonazepam: { perDiazepam10: 0.5, name: 'ClonazePAM' },
        lorazepam: { perDiazepam10: 1, name: 'LORazepam' },
        oxazepam: { perDiazepam10: 20, name: 'Oxazepam' },
        temazepam: { perDiazepam10: 20, name: 'Temazepam' },
        triazolam: { perDiazepam10: 0.25, name: 'Triazolam' },
      };
      const from = factors[str(values.fromDrug, 'lorazepam')] ?? factors.lorazepam;
      const to = factors[str(values.toDrug, 'diazepam')] ?? factors.diazepam;
      const dose = num(values.dose, 0);
      const diazepamEq = round((dose / from.perDiazepam10) * 10, 1);
      const toDose = round((diazepamEq / 10) * to.perDiazepam10, 2);
      const r = riskFromThresholds(diazepamEq, [
        {
          max: 10,
          level: 'low',
          label: 'Lower equivalent dose',
          interpretation: `${dose} mg/day ${from.name} ≈ ${diazepamEq} mg/day diazepam equivalent ≈ ${toDose} mg/day ${to.name}. Equipotency is approximate — start lower and titrate to effect.`,
        },
        {
          max: 30,
          level: 'moderate',
          label: 'Moderate equivalent dose',
          interpretation: `${dose} mg/day ${from.name} ≈ ${diazepamEq} mg/day diazepam equivalent ≈ ${toDose} mg/day ${to.name}. Moderate exposure — plan a structured switch/taper.`,
        },
        {
          max: 60,
          level: 'high',
          label: 'High equivalent dose',
          interpretation: `${dose} mg/day ${from.name} ≈ ${diazepamEq} mg/day diazepam equivalent ≈ ${toDose} mg/day ${to.name}. High exposure — slow taper; avoid abrupt discontinuation (seizure/withdrawal risk); consider specialist co-management.`,
        },
        {
          max: 100000,
          level: 'critical',
          label: 'Very high equivalent dose',
          interpretation: `${dose} mg/day ${from.name} ≈ ${diazepamEq} mg/day diazepam equivalent ≈ ${toDose} mg/day ${to.name}. Very high exposure — inpatient or specialist taper pathways may be needed; abrupt cessation risks seizures.`,
        },
      ]);
      return {
        score: toDose,
        unit: `mg/day ${to.name}`,
        ...r,
        details: [
          { label: 'Diazepam equivalent', value: `≈${diazepamEq} mg/day` },
          { label: 'Anchor', value: `${from.perDiazepam10} mg ${from.name} ≈ 10 mg diazepam ≈ ${to.perDiazepam10} mg ${to.name}` },
          { label: 'Caution', value: 'Reported as ranges in the literature — expert-opinion conversions, not exact PK' },
        ],
        recommendations: [
          'Do NOT use to set an initial dose in a benzodiazepine-naïve patient.',
          'Never abruptly stop chronic benzodiazepines — withdrawal can cause severe agitation and seizures.',
          'Equivalence tables vary between sources — follow institutional protocol and titrate clinically.',
          'Account for age, hepatic impairment, and opioid co-administration (synergistic respiratory depression).',
        ],
      };
    },
    evidence: {
      summary:
        'Approximate oral equipotent anchors relative to diazepam 10 mg (alprazolam 0.5, chlordiazepoxide 25, clonazepam 0.5, lorazepam 1, oxazepam 20, temazepam 20, triazolam 0.25 mg). Conversion: diazepam-equivalent = dose ÷ anchor × 10; target dose = diazepam-equivalent ÷ 10 × target anchor.',
      formula: 'diazepam-eq = dose × 10 ÷ fromAnchor; target = diazepam-eq ÷ 10 × toAnchor',
      validation:
        'Equipotent doses are reported as ranges in the psychiatric literature (Ashton manual; expert opinion) because of limited formal conversion studies — the table uses widely cited point estimates; clinical titration is mandatory.',
      references: [
        {
          title: 'Benzodiazepine equivalence table (Benzodiazepines: How They Work and How to Withdraw — "The Ashton Manual")',
          citation: 'Ashton CH. 2002 (revised)',
          year: 2002,
          url: 'https://www.benzo.org.uk/manual/',
        },
      ],
    },
    nextSteps: [
      { condition: 'Switching agents', actions: ['Start at the lower end of the equipotent range', 'Titrate to effect', 'Monitor sedation and withdrawal'] },
      { condition: 'Planning a taper', actions: ['Prefer long half-life agent', 'Reduce ~5–25% every 1–4 weeks per patient tolerance', 'Adjunctive behavioral support'] },
    ],
    pearls: [
      'Equivalence is approximate — inter-individual variation is large.',
      'Long half-life agents (diazepam, clonazepam) smooth withdrawal better than short half-life ones (alprazolam, triazolam, lorazepam).',
      'Not for benzo-naïve dosing or IV/parenteral conversions.',
    ],
  },

  // ─── 17. Modified Minnesota Detoxification Scale (mMINDS) ───────────────────
  {
    id: 'mminds',
    name: 'Modified Minnesota Detoxification Scale (mMINDS)',
    shortName: 'mMINDS',
    description:
      'DeCarolis 9-item objective alcohol-withdrawal severity scale (pulse, diastolic BP, tremor, sweat, hallucinations, agitation/RASS, orientation, delusions, seizures) — total 0–46.',
    category: 'psychiatry',
    tags: ['mminds', 'minds', 'alcohol withdrawal', 'detoxification', 'icu', 'symptom-triggered', 'decarolis'],
    whenToUse:
      'Objective severity scoring of alcohol withdrawal — particularly in ICU or medical patients who cannot answer the subjective CIWA-Ar questions — to drive symptom-triggered benzodiazepine protocols.',
    whyUse:
      'All items are objective signs (no patient-report items), making it usable in sedated or uncommunicative patients; correlates strongly with CIWA-Ar.',
    isQuestionnaire: true,
    inputs: [
      selectInput('pulse', 'Pulse, beats/min', [
        { label: '<90', value: 0, points: 0 },
        { label: '90–110', value: 1, points: 1 },
        { label: '>110', value: 2, points: 2 },
      ], 0, 'Highest sustained rate at assessment.'),
      selectInput('dbp', 'Diastolic blood pressure, mmHg', [
        { label: '<90', value: 0, points: 0 },
        { label: '90–110', value: 1, points: 1 },
        { label: '>110', value: 2, points: 2 },
      ], 0, 'Diastolic pressure at assessment.'),
      selectInput('tremor', 'Tremor', [
        { label: 'Absent', value: 0, points: 0 },
        { label: 'Slightly visible or can be felt fingertip to fingertip', value: 2, points: 2 },
        { label: 'Moderate — noticeably visible with arms extended', value: 4, points: 4 },
        { label: 'Severe — noticeable even with arms not extended', value: 6, points: 6 },
      ], 0, 'Assess with arms extended and fingers spread. Score 0 if not assessable due to oversedation/ventilation.'),
      selectInput('sweat', 'Sweat', [
        { label: 'Absent', value: 0, points: 0 },
        { label: 'Barely; moist palms', value: 2, points: 2 },
        { label: 'Beads visible', value: 4, points: 4 },
        { label: 'Drenching', value: 6, points: 6 },
      ], 0, 'Visible diaphoresis.'),
      selectInput('hallucinations', 'Hallucinations', [
        { label: 'Absent', value: 0, points: 0 },
        { label: 'Mild — mostly lucid, sporadic/rare hallucinations', value: 1, points: 1 },
        { label: 'Moderate/intermittent — hallucinating at times (on waking or between care) with lucid intervals; able to be reoriented', value: 2, points: 2 },
        { label: 'Severe — continuous while awake', value: 3, points: 3 },
      ], 0, 'Tactile (crawling sensations), auditory (voices), or visual (patterns/lights/beings/objects). Score 0 if not assessable.'),
      selectInput('agitation', 'Agitation (RASS)', [
        { label: 'Normal activity or sedated (RASS ≤0)', value: 0, points: 0 },
        { label: 'Somewhat > normal (RASS +1)', value: 3, points: 3 },
        { label: 'Moderately fidgety, restless (RASS +2)', value: 6, points: 6 },
        { label: 'Pacing, thrashing (RASS ≥+3)', value: 9, points: 9 },
      ], 0, 'Assess using the Richmond Agitation-Sedation Scale.'),
      selectInput('orientation', 'Orientation', [
        { label: "Oriented ×3 (person/place/time) — or at patient's baseline, or too sedated to assess", value: 0, points: 0 },
        { label: 'Oriented ×2', value: 2, points: 2 },
        { label: 'Oriented ×1', value: 4, points: 4 },
        { label: 'Disoriented', value: 6, points: 6 },
      ], 0, 'Score 0 if not assessable due to oversedation/ventilation.'),
      selectInput('delusions', 'Delusions', [
        { label: 'Absent or unable to assess', value: 0, points: 0 },
        { label: 'Present', value: 6, points: 6 },
      ], 0, 'Unfounded ideas such as suspicions or paranoid thoughts (e.g., believing things have been stolen or being persecuted).'),
      selectInput('seizures', 'Seizures', [
        { label: 'Not actively seizing', value: 0, points: 0 },
        { label: 'Actively seizing', value: 6, points: 6 },
      ], 0, 'Active seizure at the time of assessment.'),
    ],
    calculate(values) {
      const score =
        num(values.pulse) + num(values.dbp) + num(values.tremor) + num(values.sweat) +
        num(values.hallucinations) + num(values.agitation) + num(values.orientation) +
        num(values.delusions) + num(values.seizures);
      const r = riskFromThresholds(score, [
        {
          max: 14,
          level: 'low',
          label: 'Mild withdrawal (<15)',
          interpretation: `mMINDS ${score}/46 — mild band. Follow the institution's symptom-triggered protocol frequency; continue scheduled assessments.`,
        },
        {
          max: 19,
          level: 'moderate',
          label: 'Moderate withdrawal (15–19)',
          interpretation: `mMINDS ${score}/46 — moderate band; more frequent reassessment and PRN benzodiazepine per protocol.`,
        },
        {
          max: 46,
          level: 'high',
          label: 'Severe withdrawal (≥20)',
          interpretation: `mMINDS ${score}/46 — severe band; intensive monitoring and escalation per protocol (bolus dosing ± infusion); reassess for alternative causes of agitation if refractory.`,
        },
      ]);
      return {
        score,
        unit: 'points (0–46)',
        ...r,
        details: [
          { label: 'Protocol bands', value: '<15 mild / 15–19 moderate / ≥20 severe' },
          { label: 'Active seizure', value: num(values.seizures) > 0 ? 'YES — treat immediately' : 'No' },
        ],
        recommendations: [
          'Give thiamine before glucose and correct electrolytes while treating withdrawal.',
          'Exclude other causes of agitation (trauma, metabolic derangement, infection).',
          'If scores stay high despite appropriate therapy, reassess for alternate diagnoses.',
          'Supportive care: IV fluids, nutrition, close vitals monitoring; involve addiction medicine/social work after stabilization.',
        ],
        alerts:
          num(values.seizures) > 0
            ? ['Active seizure scored — treat immediately per seizure/withdrawal protocol; withdrawal seizures are typically self-limited generalized tonic-clonic events but require urgent benzodiazepine treatment and evaluation.']
            : undefined,
      };
    },
    evidence: {
      summary:
        'mMINDS scores 9 objective items — pulse (0–2), diastolic BP (0–2), tremor (0–6), sweat (0–6), hallucinations (0–3), agitation per RASS (0–9), orientation (0–6), delusions (0/6), seizures (0/6) — total 0–46. Items not assessable due to oversedation or ventilation score 0.',
      formula: 'Sum of 9 items (0–46); bands <15 / 15–19 / ≥20',
      validation:
        'Modified from the Minnesota Detoxification Scale used in DeCarolis et al.\u2019s symptom-driven lorazepam ICU protocol. mMINDS correlates strongly with CIWA-Ar (Pearson 0.82 overall; 0.87 for CIWA-Ar ≤10 — Heidinger et al. 2018).',
      references: [
        {
          title: 'Symptom-driven lorazepam protocol for treatment of severe alcohol withdrawal delirium in the intensive care unit',
          citation: 'DeCarolis DD, Rice KL, Ho L, Willenbring ML, Cassaro S. Pharmacotherapy. 2007;27(4):510-518',
          year: 2007,
          doi: '10.1592/phco.27.4.510',
        },
        {
          title: 'Correlation Between mMINDS and CIWA-Ar Scoring Tools in Patients With Alcohol Withdrawal Syndrome',
          citation: 'Heidinger BH, et al. Am J Crit Care. 2018;27(4):301-306',
          year: 2018,
          doi: '10.4037/ajcc2018547',
        },
      ],
    },
    nextSteps: [
      { condition: 'mMINDS ≥15', actions: ['Symptom-triggered benzodiazepine per institutional protocol', 'Frequent re-scoring', 'Thiamine + electrolytes'] },
      { condition: 'mMINDS ≥20 or refractory', actions: ['Escalation pathway (bolus ± infusion, phenobarbital/dexmedetomidine per protocol)', 'Evaluate alternative agitation causes', 'ICU-level monitoring'] },
    ],
    pearls: [
      'All items are objective — designed for patients who cannot answer CIWA-Ar questions (intubated, sedated).',
      'Un-assessable items score 0 — do not guess.',
      'Protocols and thresholds vary by institution; use the local order set.',
    ],
  },

  // ─── 18. Coronavirus Anxiety Scale (CAS) ────────────────────────────────────
  {
    id: 'cas-covid',
    name: 'Coronavirus Anxiety Scale (CAS)',
    shortName: 'CAS',
    description:
      'Lee 5-item somatic anxiety screen for dysfunctional coronavirus-related anxiety (each 0–4; total 0–20). ≥9 indicates probable dysfunctional COVID-19 anxiety.',
    category: 'psychiatry',
    tags: ['cas', 'coronavirus', 'covid-19', 'anxiety', 'somatic', 'lee', 'pandemic'],
    status: 'legacy',
    whenToUse:
      'Screening for dysfunctional anxiety specifically associated with the coronavirus/COVID-19 crisis — primarily a pandemic-era research and screening tool.',
    whyUse:
      'A very brief somatic-anxiety screener validated during the COVID-19 pandemic; ≥9 discriminated dysfunctional anxiety with ~90% sensitivity and ~85% specificity in the derivation study.',
    isQuestionnaire: true,
    inputs: [
      selectInput('q1', '1. I felt dizzy, lightheaded, or faint when I read or listened to news about the coronavirus', [
        { label: 'Not at all', value: 0, points: 0 },
        { label: 'Rare, less than a day or two', value: 1, points: 1 },
        { label: 'Several days', value: 2, points: 2 },
        { label: 'More than 7 days', value: 3, points: 3 },
        { label: 'Nearly every day over the last 2 weeks', value: 4, points: 4 },
      ], 0, 'Over the past 2 weeks.'),
      selectInput('q2', '2. I had trouble falling or staying asleep because I was thinking about the coronavirus', [
        { label: 'Not at all', value: 0, points: 0 },
        { label: 'Rare, less than a day or two', value: 1, points: 1 },
        { label: 'Several days', value: 2, points: 2 },
        { label: 'More than 7 days', value: 3, points: 3 },
        { label: 'Nearly every day over the last 2 weeks', value: 4, points: 4 },
      ], 0, 'Over the past 2 weeks.'),
      selectInput('q3', '3. I felt paralyzed or frozen when I thought about or was exposed to information about the coronavirus', [
        { label: 'Not at all', value: 0, points: 0 },
        { label: 'Rare, less than a day or two', value: 1, points: 1 },
        { label: 'Several days', value: 2, points: 2 },
        { label: 'More than 7 days', value: 3, points: 3 },
        { label: 'Nearly every day over the last 2 weeks', value: 4, points: 4 },
      ], 0, 'Over the past 2 weeks.'),
      selectInput('q4', '4. I lost interest in eating when I thought about or was exposed to information about the coronavirus', [
        { label: 'Not at all', value: 0, points: 0 },
        { label: 'Rare, less than a day or two', value: 1, points: 1 },
        { label: 'Several days', value: 2, points: 2 },
        { label: 'More than 7 days', value: 3, points: 3 },
        { label: 'Nearly every day over the last 2 weeks', value: 4, points: 4 },
      ], 0, 'Over the past 2 weeks.'),
      selectInput('q5', '5. I felt nauseous or had stomach problems when I thought about or was exposed to information about the coronavirus', [
        { label: 'Not at all', value: 0, points: 0 },
        { label: 'Rare, less than a day or two', value: 1, points: 1 },
        { label: 'Several days', value: 2, points: 2 },
        { label: 'More than 7 days', value: 3, points: 3 },
        { label: 'Nearly every day over the last 2 weeks', value: 4, points: 4 },
      ], 0, 'Over the past 2 weeks.'),
    ],
    calculate(values) {
      let score = 0;
      for (let i = 1; i <= 5; i++) score += num(values[`q${i}`]);
      const positive = score >= 9;
      return {
        score,
        unit: 'points (0–20)',
        label: positive ? 'Dysfunctional coronavirus anxiety likely (≥9)' : 'Below cutoff (<9)',
        interpretation: positive
          ? `CAS ${score}/20 ≥9 — probable dysfunctional coronavirus-related anxiety. Offer psychoeducation, coping/stress-management strategies, and consider mental health referral; evaluate functional impairment and suicide risk as clinically indicated.`
          : `CAS ${score}/20 — below the ≥9 cutoff for dysfunctional coronavirus anxiety.`,
        riskLevel: positive ? 'high' : 'low',
        details: [{ label: 'Cutoff', value: '≥9 = probable dysfunctional COVID-19 anxiety (Lee 2020)' }],
        recommendations: positive
          ? ['Assess functional impairment and coping behaviors.', 'Mental health referral if impairment is significant.', 'Stress-management education and reliable information sources.']
          : ['Supportive care; rescreen if anxiety escalates.'],
      };
    },
    evidence: {
      summary:
        'CAS rates 5 somatic anxiety symptoms 0–4 for frequency over the past 2 weeks (total 0–20). Optimized cut score ≥9 identifies probable dysfunctional coronavirus-related anxiety.',
      formula: 'Sum of 5 items (0–20); positive if ≥9',
      validation:
        'Lee (2020, n=775): unidimensional scale; ≥9 gave 90% sensitivity and 85% specificity for dysfunctional anxiety in derivation; a replication (Lee et al., 398 MTurk adults) found the ≥9 cut score most effective (76% sens, 90% spec). Marked as a legacy/COVID-era instrument.',
      references: [
        {
          title: 'Coronavirus Anxiety Scale: A brief mental health screener for COVID-19 related anxiety',
          citation: 'Lee SA. Death Stud. 2020;44(7):393-401',
          year: 2020,
          pmid: '32299304',
          doi: '10.1080/07481187.2020.1748481',
        },
        {
          title: 'Clinically significant fear and anxiety of COVID-19: A psychometric examination of the Coronavirus Anxiety Scale',
          citation: 'Lee SA, Mathis AA, Jobe MC, Pappalardo EA. Death Stud. 2020',
          year: 2020,
          pmid: '32460185',
        },
      ],
    },
    nextSteps: [
      { condition: 'CAS ≥9', actions: ['Assess impairment and coping', 'Mental health referral', 'Stress-management education'] },
    ],
    pearls: [
      'The CAS measures somatic anxiety responses to coronavirus information — it is not a general anxiety screen (use GAD-7 for that).',
      'Pandemic-era instrument retained for reference and research use.',
    ],
  },

  // ─── 19. DSM-5 Criteria for Major Depressive Disorder ───────────────────────
  {
    id: 'dsm5-mdd',
    name: 'DSM-5 Criteria for Major Depressive Disorder',
    shortName: 'DSM-5 MDD',
    description:
      'DSM-5 criteria checklist for a major depressive episode: ≥5 of 9 symptoms in the same 2 weeks (must include depressed mood or anhedonia) plus all 4 additional criteria.',
    category: 'psychiatry',
    tags: ['dsm-5', 'major depressive disorder', 'mdd', 'depression', 'diagnostic criteria', 'apa'],
    whenToUse:
      'Structuring a diagnostic assessment when major depressive disorder is suspected — documents which DSM-5 criteria are and are not satisfied.',
    whyUse:
      'Checklists prevent missed criterion elements (count, duration, distress/impairment, exclusions) that a gestalt assessment can overlook.',
    isQuestionnaire: true,
    inputs: [
      yesNo('depressed', 'Depressed mood — most of the day, nearly every day; subjective or observed by others (in children/adolescents can be irritable mood)', null, 'Depressive symptom — must count toward the ≥5-symptom threshold and satisfies the required core-symptom condition.', true),
      yesNo('anhedonia', 'Loss of interest/pleasure — markedly diminished interest or pleasure in all or almost all activities most of the day, nearly every day', null, 'Depressive symptom — satisfies the required core-symptom condition.', false),
      yesNo('weight', 'Weight loss or gain — significant weight change without dieting (>5% body weight in a month), or decrease/increase in appetite nearly every day', null, 'In children, may be failure to gain expected weight.', false),
      yesNo('sleep', 'Insomnia or hypersomnia — nearly every day', null, 'Sleep disturbance of either polarity.', false),
      yesNo('psychomotor', 'Psychomotor agitation or retardation — nearly every day and observable by others (not merely subjective restlessness or slowing)', null, 'Must be observable by others, not merely subjective.', false),
      yesNo('fatigue', 'Fatigue or loss of energy — nearly every day', null, 'Low energy or easy fatigability.', false),
      yesNo('worthless', 'Worthlessness or excessive/inappropriate guilt — nearly every day; guilt may be delusional (not merely self-reproach or guilt about being sick)', null, 'Persistent negative self-evaluation or inappropriate guilt.', false),
      yesNo('concentration', 'Diminished concentration or indecisiveness — nearly every day; subjective or observed', null, 'Reduced ability to think, concentrate, or decide.', false),
      yesNo('death', 'Thoughts of death/suicide — recurrent thoughts of death (not just fear of dying), recurrent suicidal ideation without plan, or a suicide attempt/specific plan', null, 'Any endorsement requires direct safety assessment.', false),
      yesNo('distress', 'Symptoms cause clinically significant distress or impairment in social, occupational, or other important areas of functioning', null, 'Required criterion B.', true),
      yesNo('notSubstance', 'Episode is NOT attributable to the physiological effects of a substance or another medical condition', null, 'Required criterion C.', true),
      yesNo('notPsychotic', 'Episode is NOT better explained by schizoaffective disorder, schizophrenia, schizophreniform disorder, delusional disorder, or other schizophrenia-spectrum/psychotic disorders', null, 'Required criterion D.', true),
      yesNo('noManic', 'There has NEVER been a manic or hypomanic episode', null, 'Required criterion E — exclusion does not apply if all manic-like/hypomanic-like episodes were substance-induced or attributable to another medical condition.', true),
    ],
    calculate(values) {
      const symptomIds = ['depressed', 'anhedonia', 'weight', 'sleep', 'psychomotor', 'fatigue', 'worthless', 'concentration', 'death'];
      const count = symptomIds.reduce((s, id) => s + (bool(values[id]) ? 1 : 0), 0);
      const corePresent = bool(values.depressed) || bool(values.anhedonia);
      const criteriaA = count >= 5 && corePresent;
      const allRequired =
        bool(values.distress) && bool(values.notSubstance) && bool(values.notPsychotic) && bool(values.noManic);
      const met = criteriaA && allRequired;
      const suicidal = bool(values.death);
      const missing: string[] = [];
      if (count < 5) missing.push(`only ${count}/9 symptoms (need ≥5)`);
      else if (!corePresent) missing.push('neither depressed mood nor anhedonia endorsed');
      if (!bool(values.distress)) missing.push('distress/impairment criterion');
      if (!bool(values.notSubstance)) missing.push('substance/medical exclusion');
      if (!bool(values.notPsychotic)) missing.push('psychotic-disorder exclusion');
      if (!bool(values.noManic)) missing.push('prior manic/hypomanic episode reported — consider bipolar disorder');
      return {
        score: met ? 'Criteria met' : 'Criteria not met',
        label: met ? 'Meets DSM-5 criteria for a major depressive episode' : 'Does not meet DSM-5 criteria',
        interpretation: met
          ? `${count}/9 depressive symptoms including a core symptom, for ≥2 weeks, with distress/impairment and exclusions satisfied — consistent with Major Depressive Disorder. Confirm with full clinical evaluation; assess severity and suicide risk.`
          : `DSM-5 MDD criteria not met — unmet element(s): ${missing.join('; ')}.`,
        riskLevel: met ? 'high' : 'low',
        details: [
          { label: 'Symptoms endorsed (2-wk period)', value: `${count}/9` },
          { label: 'Core symptom (mood or anhedonia)', value: corePresent ? 'Present' : 'Absent' },
          { label: 'Distress/impairment', value: bool(values.distress) ? 'Yes' : 'No' },
          { label: 'Exclusions satisfied', value: bool(values.notSubstance) && bool(values.notPsychotic) && bool(values.noManic) ? 'Yes' : 'No' },
        ],
        recommendations: met
          ? [
              'Create a treatment plan: psychotherapy and/or pharmacotherapy guided by severity.',
              'Assess suicide risk and develop a safety plan.',
              'Screen for bipolarity before antidepressant monotherapy.',
            ]
          : ['If subsyndromal symptoms persist, monitor and reassess.', 'Consider alternative explanations (adjustment disorder, medical/substance causes, bipolar illness).'],
        alerts: suicidal
          ? ['Suicidal ideation/death criterion endorsed — perform a direct suicide risk assessment now and create a safety plan. US crisis line: call or text 988.']
          : undefined,
      };
    },
    evidence: {
      summary:
        'DSM-5 major depressive episode: ≥5 of 9 symptoms during the same 2-week period (must include depressed mood or anhedonia), causing clinically significant distress/impairment, not attributable to substance/medical causes or better explained by psychotic disorders, and no lifetime manic or hypomanic episode.',
      validation:
        'Criteria as published in the DSM-5 (APA, 2013). A criteria checklist documents diagnosis; it does not replace a clinical interview.',
      references: [
        {
          title: 'Diagnostic and Statistical Manual of Mental Disorders, Fifth Edition (DSM-5) — Major Depressive Disorder',
          citation: 'American Psychiatric Association. 2013',
          year: 2013,
          doi: '10.1176/appi.books.9780890425596',
        },
      ],
    },
    nextSteps: [
      { condition: 'Criteria met', actions: ['Severity rating (PHQ-9/HAM-D)', 'Suicide risk assessment', 'Treatment plan (psychotherapy ± pharmacotherapy)', 'Screen for bipolarity'] },
      { condition: 'Death/suicide item endorsed', actions: ['Immediate safety assessment', 'Safety plan', 'Crisis resources (988 US)'] },
    ],
    pearls: [
      'The 9 symptoms must co-occur within the SAME 2-week window and represent a change from prior functioning.',
      'Count symptoms clearly attributable to another medical condition separately — they may not qualify.',
      'A lifetime manic/hypomanic episode rules out MDD — evaluate for bipolar disorder instead.',
    ],
  },

  // ─── 20. DSM-5 Criteria for Bipolar Disorder ────────────────────────────────
  {
    id: 'dsm5-bipolar',
    name: 'DSM-5 Criteria for Bipolar Disorder',
    shortName: 'DSM-5 BD',
    description:
      'DSM-5 episode checklists for bipolar disorder: manic episode (Bipolar I), hypomanic + major depressive episodes (Bipolar II), with all required duration, severity, and exclusion criteria.',
    category: 'psychiatry',
    tags: ['dsm-5', 'bipolar', 'mania', 'hypomania', 'depression', 'diagnostic criteria', 'apa'],
    whenToUse:
      'Structuring a diagnostic assessment for bipolar spectrum illness — documents manic, hypomanic, and major depressive episode criteria element by element.',
    whyUse:
      'Bipolar illness is frequently missed when only depression is assessed; explicit episode checklists capture the duration, severity, and exclusion criteria required for each episode type.',
    isQuestionnaire: true,
    inputs: [
      // — Manic episode —
      yesNo('mGrandiosity', 'MANIC sx: Inflated self-esteem or grandiosity', null, 'Manic/hypomanic symptom item (B list).', false),
      yesNo('mSleep', 'MANIC sx: Decreased need for sleep (e.g., feels rested after only 3 hours)', null, 'Reduced NEED for sleep — not just insomnia.', true),
      yesNo('mTalk', 'MANIC sx: More talkative than usual, or pressure to keep talking', null, 'Pressured or increased speech.', false),
      yesNo('mFlight', 'MANIC sx: Flight of ideas or subjectively racing thoughts', null, 'Racing thoughts or rapidly shifting ideas.', false),
      yesNo('mDistract', 'MANIC sx: Distractibility (attention too easily drawn to unimportant/irrelevant stimuli), reported or observed', null, 'Self-reported or observed distractibility.', false),
      yesNo('mGoal', 'MANIC sx: Increase in goal-directed activity (social, work/school, sexual) or psychomotor agitation', null, 'Purposeful overactivity or non-goal-directed agitation.', false),
      yesNo('mRisky', 'MANIC sx: Excessive involvement in activities with high potential for painful consequences (spending sprees, sexual indiscretions, foolish investments)', null, 'High-risk pleasurable or impulsive activity.', false),
      yesNo('mIrritableOnly', 'MANIC: the mood disturbance is ONLY irritable (not elevated/expansive)', null, 'If mood is only irritable, ≥4 (not ≥3) symptoms are required.', false),
      yesNo('mDuration', 'MANIC required: distinct period ≥1 week of abnormally and persistently elevated, expansive, or irritable mood AND increased activity/energy, most of the day nearly every day (or any duration if hospitalization needed)', null, 'Required criterion A.', false),
      yesNo('mSeverity', 'MANIC required: mood disturbance severe enough to cause marked impairment in social/occupational functioning, or hospitalization needed to prevent harm, or psychotic features present', null, 'Required criterion C.', false),
      yesNo('mNotSubstance', 'MANIC required: episode NOT attributable to a substance (drug of abuse, medication, other treatment) or another medical condition', null, 'Required criterion D.', false),
      // — Hypomanic episode —
      yesNo('hGrandiosity', 'HYPOMANIC sx: Inflated self-esteem or grandiosity', null, 'Same symptom list as mania; hypomanic version is observable but not severe.', false),
      yesNo('hSleep', 'HYPOMANIC sx: Decreased need for sleep', null, 'Feels rested on markedly less sleep.', false),
      yesNo('hTalk', 'HYPOMANIC sx: More talkative than usual, or pressure to keep talking', null, 'Pressured or increased speech.', false),
      yesNo('hFlight', 'HYPOMANIC sx: Flight of ideas or racing thoughts', null, 'Racing thoughts or rapidly shifting ideas.', false),
      yesNo('hDistract', 'HYPOMANIC sx: Distractibility', null, 'Attention easily pulled to irrelevant stimuli.', false),
      yesNo('hGoal', 'HYPOMANIC sx: Increased goal-directed activity or psychomotor agitation', null, 'Increased purposeful activity or agitation.', false),
      yesNo('hRisky', 'HYPOMANIC sx: Excessive involvement in high-risk activities', null, 'Activities with high potential for painful consequences.', false),
      yesNo('hIrritableOnly', 'HYPOMANIC: the mood disturbance is ONLY irritable', null, 'If only irritable, ≥4 symptoms required.', false),
      yesNo('hDuration', 'HYPOMANIC required: ≥4 consecutive days of elevated, expansive, or irritable mood AND increased activity/energy, most of the day nearly every day', null, 'Required criterion A.', false),
      yesNo('hChange', 'HYPOMANIC required: unequivocal change in functioning uncharacteristic of the person when not symptomatic', null, 'Required criterion C.', false),
      yesNo('hObservable', 'HYPOMANIC required: mood disturbance and change in functioning are observable by others', null, 'Required criterion D.', false),
      yesNo('hNotSevere', 'HYPOMANIC required: episode NOT severe enough to cause marked impairment or necessitate hospitalization, and NO psychotic features (if either, the episode is manic)', null, 'Required criterion E.', false),
      yesNo('hNotSubstance', 'HYPOMANIC required: episode NOT attributable to a substance or another medical condition', null, 'Required criterion F.', false),
      // — Major depressive episode —
      yesNo('dDepressed', 'DEPRESSIVE sx: Depressed mood most of the day, nearly every day', null, 'Core symptom.', false),
      yesNo('dAnhedonia', 'DEPRESSIVE sx: Markedly diminished interest/pleasure in almost all activities', null, 'Core symptom.', false),
      yesNo('dWeight', 'DEPRESSIVE sx: Significant weight loss/gain or appetite change nearly every day', null, '>5% body weight in a month or daily appetite change.', false),
      yesNo('dSleep', 'DEPRESSIVE sx: Insomnia or hypersomnia nearly every day', null, 'Sleep disturbance of either polarity.', false),
      yesNo('dPsychomotor', 'DEPRESSIVE sx: Psychomotor agitation or retardation nearly every day (observable)', null, 'Must be observable by others.', false),
      yesNo('dFatigue', 'DEPRESSIVE sx: Fatigue or loss of energy nearly every day', null, 'Low energy or easy fatigability.', false),
      yesNo('dWorthless', 'DEPRESSIVE sx: Worthlessness or excessive/inappropriate guilt nearly every day', null, 'Negative self-evaluation or inappropriate guilt.', false),
      yesNo('dConcentration', 'DEPRESSIVE sx: Diminished concentration or indecisiveness nearly every day', null, 'Reduced ability to think or decide.', false),
      yesNo('dDeath', 'DEPRESSIVE sx: Recurrent thoughts of death, suicidal ideation, or suicide attempt/plan', null, 'Any endorsement requires direct safety assessment.', false),
      yesNo('dDistress', 'DEPRESSIVE required: symptoms cause clinically significant distress or impairment', null, 'Required criterion — functional impact.', false),
      yesNo('dNotSubstance', 'DEPRESSIVE required: episode NOT attributable to physiological effects of a substance or another medical condition', null, 'Required exclusion criterion.', false),
      // — Global exclusion —
      yesNo('notPsychotic', 'Episodes are NOT better explained by schizoaffective disorder, schizophrenia, schizophreniform disorder, delusional disorder, or other schizophrenia-spectrum/psychotic disorders', null, 'Global exclusion applying to all episode types.', false),
    ],
    calculate(values) {
      const manicSxIds = ['mGrandiosity', 'mSleep', 'mTalk', 'mFlight', 'mDistract', 'mGoal', 'mRisky'];
      const hypoSxIds = ['hGrandiosity', 'hSleep', 'hTalk', 'hFlight', 'hDistract', 'hGoal', 'hRisky'];
      const depSxIds = ['dDepressed', 'dAnhedonia', 'dWeight', 'dSleep', 'dPsychomotor', 'dFatigue', 'dWorthless', 'dConcentration', 'dDeath'];
      const manicSx = manicSxIds.reduce((s, id) => s + (bool(values[id]) ? 1 : 0), 0);
      const hypoSx = hypoSxIds.reduce((s, id) => s + (bool(values[id]) ? 1 : 0), 0);
      const depSx = depSxIds.reduce((s, id) => s + (bool(values[id]) ? 1 : 0), 0);
      const manicThreshold = bool(values.mIrritableOnly) ? 4 : 3;
      const hypoThreshold = bool(values.hIrritableOnly) ? 4 : 3;
      const manicEpisode =
        manicSx >= manicThreshold &&
        bool(values.mDuration) &&
        bool(values.mSeverity) &&
        bool(values.mNotSubstance) &&
        bool(values.notPsychotic);
      const hypoEpisode =
        hypoSx >= hypoThreshold &&
        bool(values.hDuration) &&
        bool(values.hChange) &&
        bool(values.hObservable) &&
        bool(values.hNotSevere) &&
        bool(values.hNotSubstance) &&
        bool(values.notPsychotic);
      const depEpisode =
        depSx >= 5 &&
        (bool(values.dDepressed) || bool(values.dAnhedonia)) &&
        bool(values.dDistress) &&
        bool(values.dNotSubstance) &&
        bool(values.notPsychotic);
      const suicidal = bool(values.dDeath);

      let label = 'No episode criteria met';
      let interpretation = '';
      let riskLevel: 'low' | 'moderate' | 'high' = 'low';
      if (manicEpisode) {
        label = 'Meets criteria for a MANIC episode → Bipolar I';
        interpretation =
          'DSM-5 manic episode criteria satisfied — a lifetime manic episode defines Bipolar I disorder (a depressive episode is not required). Confirm with full evaluation; assess severity, psychosis, and safety.';
        riskLevel = 'high';
      } else if (hypoEpisode && depEpisode) {
        label = 'Hypomanic + major depressive episodes → consistent with Bipolar II';
        interpretation =
          'DSM-5 hypomanic episode AND major depressive episode criteria satisfied without a manic episode — consistent with Bipolar II disorder. Verify no lifetime manic episode before finalizing.';
        riskLevel = 'high';
      } else if (hypoEpisode) {
        label = 'Hypomanic episode criteria met (depressive episode not documented)';
        interpretation =
          'Hypomanic criteria met; Bipolar II also requires a lifetime major depressive episode — assess depressive history carefully.';
        riskLevel = 'moderate';
      } else if (depEpisode) {
        label = 'Major depressive episode met; no bipolar episode criteria';
        interpretation =
          'MDE criteria satisfied without manic/hypomanic criteria — consistent with unipolar depression if no lifetime hypomania/mania emerges on history.';
        riskLevel = 'moderate';
      } else {
        interpretation = `Episode criteria not met (manic ${manicSx}/7 sx, hypomanic ${hypoSx}/7 sx, depressive ${depSx}/9 sx, plus required duration/severity/exclusion items). Consider other bipolar-spectrum explanations (substance/medical, cyclothymic disorder, unspecified bipolar) or non-bipolar diagnoses.`;
      }
      return {
        score: manicEpisode ? 'Manic episode' : hypoEpisode && depEpisode ? 'Bipolar II pattern' : hypoEpisode ? 'Hypomanic episode' : depEpisode ? 'Depressive episode' : 'None met',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Manic symptoms', value: `${manicSx}/7 (need ≥${manicThreshold})${manicEpisode ? ' — episode met' : ''}` },
          { label: 'Hypomanic symptoms', value: `${hypoSx}/7 (need ≥${hypoThreshold})${hypoEpisode ? ' — episode met' : ''}` },
          { label: 'Depressive symptoms', value: `${depSx}/9${depEpisode ? ' — episode met' : ''}` },
          { label: 'Psychotic-disorder exclusion', value: bool(values.notPsychotic) ? 'Satisfied' : 'Not satisfied' },
        ],
        recommendations:
          manicEpisode || (hypoEpisode && depEpisode)
            ? [
                'Confirm diagnosis with psychiatric evaluation.',
                'Start mood stabilizer/second-generation antipsychotic per guidelines; avoid unopposed antidepressants.',
                'Assess suicide risk; educate patient/family on relapse signs and adherence.',
              ]
            : depEpisode
              ? ['Treat per unipolar MDD pathway after bipolarity is excluded.', 'Reassess periodically for emergent (hypo)mania.']
              : ['Explore alternative diagnoses.', 'Reassess if episodes emerge.'],
        alerts: suicidal
          ? ['Suicidal ideation/death criterion endorsed — perform a direct suicide risk assessment now and create a safety plan. US crisis line: call or text 988.']
          : undefined,
      };
    },
    evidence: {
      summary:
        'DSM-5 bipolar criteria: Manic episode = ≥3 B-symptoms (≥4 if mood only irritable) during ≥1 week (or any duration if hospitalized) with marked impairment/hospitalization/psychosis and exclusions. Hypomanic = ≥3 (≥4 if irritable) symptoms during ≥4 consecutive days with observable unequivocal change, not severe enough for marked impairment/hospitalization, and exclusions. Major depressive episode = ≥5 of 9 symptoms (incl. core) with distress/impairment and exclusions. Bipolar I = lifetime manic episode; Bipolar II = hypomanic + MDE, never manic.',
      validation:
        'Criteria per DSM-5 (APA, 2013); checklists document element-level fulfillment and do not replace the clinical interview.',
      references: [
        {
          title: 'Diagnostic and Statistical Manual of Mental Disorders, Fifth Edition (DSM-5) — Bipolar and Related Disorders',
          citation: 'American Psychiatric Association. 2013',
          year: 2013,
          doi: '10.1176/appi.books.9780890425596',
        },
      ],
    },
    nextSteps: [
      { condition: 'Manic episode met', actions: ['Bipolar I evaluation', 'Mood stabilizer/SGA pharmacotherapy', 'Safety assessment', 'Psychiatric referral'] },
      { condition: 'Hypomanic + depressive episodes met', actions: ['Bipolar II evaluation', 'Confirm no lifetime mania', 'Guideline-concordant treatment'] },
      { condition: 'Only MDE met', actions: ['Unipolar depression workup', 'Screen carefully for past hypomania before antidepressants'] },
    ],
    pearls: [
      'Bipolar I requires only a lifetime MANIC episode — depression is not required.',
      'If mood is ONLY irritable, 4 of the 7 B-symptoms (not 3) are needed for mania/hypomania.',
      'Psychotic features or hospitalization automatically make an episode manic, not hypomanic.',
      'Screening tools (MDQ) can support — but never establish — a bipolar diagnosis.',
    ],
  },

  // ─── 21. DSM-5 Criteria for PTSD ────────────────────────────────────────────
  {
    id: 'dsm5-ptsd',
    name: 'DSM-5 Criteria for Posttraumatic Stress Disorder',
    shortName: 'DSM-5 PTSD',
    description:
      'DSM-5 PTSD criteria checklist: qualifying trauma exposure plus ≥1 intrusion, ≥1 avoidance, ≥2 negative cognition/mood, and ≥2 arousal/reactivity symptoms, duration >1 month, with distress/impairment and exclusions.',
    category: 'psychiatry',
    tags: ['dsm-5', 'ptsd', 'trauma', 'posttraumatic', 'diagnostic criteria', 'apa'],
    whenToUse:
      'Structuring a diagnostic evaluation for PTSD after a qualifying trauma exposure — documents each DSM-5 symptom cluster and the required thresholds.',
    whyUse:
      'PTSD requires specific cluster thresholds; a checklist ensures exposure, intrusion, avoidance, mood/cognition, arousal, duration, and exclusion elements are each verified.',
    isQuestionnaire: true,
    inputs: [
      yesNo('expDirect', 'EXPOSURE: directly experienced the traumatic event (actual or threatened death, serious injury, or sexual violence)', null, 'Criterion A — at least one exposure route required.', true),
      yesNo('expWitness', 'EXPOSURE: witnessed the event in person as it occurred to others', null, 'In-person witnessing qualifies.', false),
      yesNo('expLearned', 'EXPOSURE: learned the event occurred to a close family member or friend (if actual/threatened death, the event must have been violent or accidental)', null, 'Applies only to close family/friends; natural death does not qualify.', false),
      yesNo('expRepeated', 'EXPOSURE: repeated or extreme exposure to aversive details of the event (e.g., first responders collecting remains, police exposed to child-abuse details); NOT media exposure unless work-related', null, 'Occupational repeated exposure; media exposure excluded unless work-related.', false),
      yesNo('intMem', 'INTRUSION: recurrent, involuntary, intrusive distressing memories of the event (in children, repetitive play expressing themes)', null, 'Criterion B — ≥1 required.', false),
      yesNo('intDream', 'INTRUSION: recurrent distressing dreams related to the event', null, 'Trauma-related nightmares (children may have unrecognizable content).', false),
      yesNo('intFlash', 'INTRUSION: dissociative reactions/flashbacks in which the event feels recurring (in children, trauma-specific reenactment in play)', null, 'May range from brief episodes to complete loss of present awareness.', false),
      yesNo('intDistress', 'INTRUSION: intense/prolonged psychological distress at cues symbolizing or resembling the event', null, 'Triggered emotional distress at internal or external reminders.', false),
      yesNo('intPhysio', 'INTRUSION: marked physiological reactions to cues symbolizing or resembling the event', null, 'Somatic reactivity to reminders (e.g., tachycardia, sweating).', false),
      yesNo('avInternal', 'AVOIDANCE: avoidance of/efforts to avoid distressing memories, thoughts, or feelings about the event', null, 'Criterion C — ≥1 required.', false),
      yesNo('avExternal', 'AVOIDANCE: avoidance of/efforts to avoid external reminders (people, places, conversations, activities, objects, situations)', null, 'Avoidance of external trauma cues.', false),
      yesNo('cmAmnesia', 'COGNITION/MOOD: inability to remember an important aspect of the event (dissociative amnesia, not head injury/substances)', null, 'Criterion D — ≥2 required.', false),
      yesNo('cmBeliefs', 'COGNITION/MOOD: persistent exaggerated negative beliefs about self, others, or the world ("I am bad," "no one can be trusted")', null, 'Distorted global negative beliefs.', false),
      yesNo('cmBlame', 'COGNITION/MOOD: persistent distorted cognitions about the cause/consequences leading to self- or other-blame', null, 'Distorted attribution of cause or blame.', false),
      yesNo('cmNegative', 'COGNITION/MOOD: persistent negative emotional state (fear, horror, anger, guilt, shame)', null, 'Sustained negative affect since the event.', false),
      yesNo('cmInterest', 'COGNITION/MOOD: markedly diminished interest or participation in significant activities', null, 'Post-traumatic anhedonia/withdrawal from activities.', false),
      yesNo('cmDetachment', 'COGNITION/MOOD: feelings of detachment or estrangement from others', null, 'Emotional numbing toward people.', false),
      yesNo('cmPositive', 'COGNITION/MOOD: persistent inability to experience positive emotions (happiness, satisfaction, loving feelings)', null, 'Positive-affect deficit since the event.', false),
      yesNo('arIrritable', 'AROUSAL: irritable behavior and angry outbursts (little/no provocation) — verbal or physical aggression', null, 'Criterion E — ≥2 required.', false),
      yesNo('arReckless', 'AROUSAL: reckless or self-destructive behavior', null, 'New risk-taking or self-harming behavior.', false),
      yesNo('arHypervig', 'AROUSAL: hypervigilance', null, 'Excessive threat-scanning or guardedness.', false),
      yesNo('arStartle', 'AROUSAL: exaggerated startle response', null, 'Disproportionate startle to stimuli.', false),
      yesNo('arConcentration', 'AROUSAL: problems with concentration', null, 'Difficulty focusing attributable to hyperarousal.', false),
      yesNo('arSleep', 'AROUSAL: sleep disturbance (difficulty falling/staying asleep, restless sleep)', null, 'Sleep onset/maintenance problems.', false),
      yesNo('duration', 'REQUIRED: duration of the disturbance is more than 1 month', null, 'Criterion F.', false),
      yesNo('distress', 'REQUIRED: clinically significant distress or impairment in social, occupational, or other important functioning', null, 'Criterion G.', false),
      yesNo('notSubstance', 'REQUIRED: disturbance NOT attributable to physiological effects of a substance (medication, alcohol) or another medical condition', null, 'Criterion H.', false),
    ],
    calculate(values) {
      const exposure =
        bool(values.expDirect) || bool(values.expWitness) || bool(values.expLearned) || bool(values.expRepeated);
      const intrusion =
        (bool(values.intMem) ? 1 : 0) + (bool(values.intDream) ? 1 : 0) + (bool(values.intFlash) ? 1 : 0) +
        (bool(values.intDistress) ? 1 : 0) + (bool(values.intPhysio) ? 1 : 0);
      const avoidance = (bool(values.avInternal) ? 1 : 0) + (bool(values.avExternal) ? 1 : 0);
      const cogMood =
        (bool(values.cmAmnesia) ? 1 : 0) + (bool(values.cmBeliefs) ? 1 : 0) + (bool(values.cmBlame) ? 1 : 0) +
        (bool(values.cmNegative) ? 1 : 0) + (bool(values.cmInterest) ? 1 : 0) + (bool(values.cmDetachment) ? 1 : 0) +
        (bool(values.cmPositive) ? 1 : 0);
      const arousal =
        (bool(values.arIrritable) ? 1 : 0) + (bool(values.arReckless) ? 1 : 0) + (bool(values.arHypervig) ? 1 : 0) +
        (bool(values.arStartle) ? 1 : 0) + (bool(values.arConcentration) ? 1 : 0) + (bool(values.arSleep) ? 1 : 0);
      const required =
        bool(values.duration) && bool(values.distress) && bool(values.notSubstance);
      const met = exposure && intrusion >= 1 && avoidance >= 1 && cogMood >= 2 && arousal >= 2 && required;
      const missing: string[] = [];
      if (!exposure) missing.push('no qualifying exposure route');
      if (intrusion < 1) missing.push('intrusion (0/5, need ≥1)');
      if (avoidance < 1) missing.push('avoidance (0/2, need ≥1)');
      if (cogMood < 2) missing.push(`negative cognitions/mood (${cogMood}/7, need ≥2)`);
      if (arousal < 2) missing.push(`arousal/reactivity (${arousal}/6, need ≥2)`);
      if (!bool(values.duration)) missing.push('duration >1 month');
      if (!bool(values.distress)) missing.push('distress/impairment');
      if (!bool(values.notSubstance)) missing.push('substance/medical exclusion');
      return {
        score: met ? 'Criteria met' : 'Criteria not met',
        label: met ? 'Meets DSM-5 criteria for PTSD' : 'Does not meet DSM-5 criteria',
        interpretation: met
          ? 'All DSM-5 PTSD clusters satisfied: qualifying exposure, ≥1 intrusion, ≥1 avoidance, ≥2 cognition/mood, ≥2 arousal/reactivity symptoms, >1 month duration, distress/impairment, and exclusions. Confirm with a clinical evaluation and assess suicide risk and comorbidity.'
          : `PTSD criteria not met — unmet element(s): ${missing.join('; ')}.`,
        riskLevel: met ? 'high' : 'low',
        details: [
          { label: 'A. Exposure', value: exposure ? 'Qualifying exposure' : 'None endorsed' },
          { label: 'B. Intrusion', value: `${intrusion}/5 (need ≥1)` },
          { label: 'C. Avoidance', value: `${avoidance}/2 (need ≥1)` },
          { label: 'D. Cognition/mood', value: `${cogMood}/7 (need ≥2)` },
          { label: 'E. Arousal/reactivity', value: `${arousal}/6 (need ≥2)` },
          { label: 'F–H. Duration/distress/exclusion', value: required ? 'All satisfied' : 'Not all satisfied' },
        ],
        recommendations: met
          ? [
              'Trauma-focused psychotherapy is first-line (trauma-focused CBT, EMDR, prolonged exposure); SSRIs as indicated.',
              'Assess suicide risk and comorbid substance use, depression, and dissociation.',
              'Patient education and safety planning.',
            ]
          : ['If the picture is partial or recent (<1 month), consider acute stress disorder or adjustment disorder.', 'Reassess if symptoms persist or worsen.'],
      };
    },
    evidence: {
      summary:
        'DSM-5 PTSD: Criterion A qualifying exposure (≥1 of 4 routes); B ≥1 of 5 intrusion symptoms; C ≥1 of 2 avoidance symptoms; D ≥2 of 7 negative cognition/mood alterations; E ≥2 of 6 arousal/reactivity alterations; F duration >1 month; G distress/impairment; H exclusion of substance/medical causes.',
      validation:
        'Criteria per DSM-5 (APA, 2013). This checklist documents criterion fulfillment — it is not a validated screening instrument (use PC-PTSD-5 or PCL-5 for screening/severity).',
      references: [
        {
          title: 'Diagnostic and Statistical Manual of Mental Disorders, Fifth Edition (DSM-5) — Posttraumatic Stress Disorder',
          citation: 'American Psychiatric Association. 2013',
          year: 2013,
          doi: '10.1176/appi.books.9780890425596',
        },
      ],
    },
    nextSteps: [
      { condition: 'Criteria met', actions: ['Trauma-focused psychotherapy referral', 'SSRI consideration', 'Suicide risk assessment', 'Comorbidity evaluation'] },
      { condition: 'Duration <1 month with symptoms', actions: ['Consider acute stress disorder', 'Monitor and reassess'] },
    ],
    pearls: [
      'These are the criteria for individuals >6 years old — DSM-5 has a separate preschool (≤6 y) subtype.',
      'Indirect exposure through electronic media counts only when work-related.',
      'If symptoms began <1 month ago, think acute stress disorder rather than PTSD.',
    ],
  },

  // ─── 22. DSM-5 Criteria for Binge Eating Disorder ───────────────────────────
  {
    id: 'dsm5-bed',
    name: 'DSM-5 Criteria for Binge Eating Disorder',
    shortName: 'DSM-5 BED',
    description:
      'DSM-5 BED checklist: recurrent binges (large amount + loss of control), ≥3 of 5 associated features, marked distress, ≥1×/week for 3 months, and no compensatory behavior/exclusive anorexia-bulimia course — with severity specifier.',
    category: 'psychiatry',
    tags: ['dsm-5', 'binge eating', 'bed', 'eating disorder', 'diagnostic criteria', 'apa'],
    whenToUse:
      'Structuring a diagnostic evaluation when binge eating disorder is suspected — verifies each DSM-5 criterion and grades severity by weekly episode frequency.',
    whyUse:
      'BED is the most common eating disorder and is underdiagnosed; criterion-level documentation distinguishes it from bulimia nervosa (no compensatory behaviors) and guides severity-based care.',
    isQuestionnaire: true,
    inputs: [
      yesNo('largeAmount', 'Binge episodes involve eating, within a discrete period (e.g., any 2-hour window), an amount definitely larger than most people would eat under similar circumstances', null, 'Criterion A1 — required.', true),
      yesNo('lossOfControl', 'Binge episodes involve a sense of LACK OF CONTROL over eating (cannot stop or control what/how much)', null, 'Criterion A2 — required.', true),
      yesNo('rapid', 'Feature: eating much more rapidly than normal', null, 'Criterion B — ≥3 of 5 features required.', false),
      yesNo('full', 'Feature: eating until feeling uncomfortably full', null, 'Eating past comfortable satiety.', false),
      yesNo('notHungry', 'Feature: eating large amounts when not physically hungry', null, 'Eating without hunger cues.', false),
      yesNo('alone', 'Feature: eating alone because of embarrassment about how much is eaten', null, 'Secretive eating from shame.', false),
      yesNo('disgust', 'Feature: feeling disgusted with oneself, depressed, or very guilty afterward', null, 'Post-binge negative affect.', false),
      yesNo('distress', 'Marked distress regarding binge eating is present', null, 'Criterion C — required.', true),
      yesNo('frequency', 'Binge eating occurs, on average, at least once a week for 3 months', null, 'Criterion D — required.', true),
      yesNo('noCompensatory', 'Binge eating is NOT associated with recurrent inappropriate compensatory behavior (as in bulimia nervosa) and does NOT occur exclusively during bulimia nervosa or anorexia nervosa', null, 'Criterion E — required.', true),
      selectInput('severity', 'Binge eating episodes per week (severity specifier)', [
        { label: '1–3 (Mild)', value: 'mild' },
        { label: '4–7 (Moderate)', value: 'moderate' },
        { label: '8–13 (Severe)', value: 'severe' },
        { label: '≥14 (Extreme)', value: 'extreme' },
      ], 'mild', 'DSM-5 severity grading by weekly binge frequency.', true),
    ],
    calculate(values) {
      const bingeDefinition = bool(values.largeAmount) && bool(values.lossOfControl);
      const features =
        (bool(values.rapid) ? 1 : 0) + (bool(values.full) ? 1 : 0) + (bool(values.notHungry) ? 1 : 0) +
        (bool(values.alone) ? 1 : 0) + (bool(values.disgust) ? 1 : 0);
      const required =
        bool(values.distress) && bool(values.frequency) && bool(values.noCompensatory);
      const met = bingeDefinition && features >= 3 && required;
      const sevMap: Record<string, string> = { mild: 'Mild (1–3/wk)', moderate: 'Moderate (4–7/wk)', severe: 'Severe (8–13/wk)', extreme: 'Extreme (≥14/wk)' };
      const sev = sevMap[str(values.severity, 'mild')] ?? 'Mild (1–3/wk)';
      const missing: string[] = [];
      if (!bool(values.largeAmount)) missing.push('large-amount element');
      if (!bool(values.lossOfControl)) missing.push('loss-of-control element');
      if (features < 3) missing.push(`associated features (${features}/5, need ≥3)`);
      if (!bool(values.distress)) missing.push('marked distress');
      if (!bool(values.frequency)) missing.push('≥1×/week × 3 months');
      if (!bool(values.noCompensatory)) missing.push('compensatory-behavior/diagnostic exclusion');
      return {
        score: met ? `Criteria met — ${sev}` : 'Criteria not met',
        label: met ? `Meets DSM-5 criteria for BED — ${sev}` : 'Does not meet DSM-5 criteria',
        interpretation: met
          ? `DSM-5 binge eating disorder criteria satisfied at ${sev} severity. Confirm with clinical evaluation; screen for weight, metabolic, and psychological comorbidity and other eating disorders.`
          : `BED criteria not met — unmet element(s): ${missing.join('; ')}.`,
        riskLevel: met ? (str(values.severity) === 'severe' || str(values.severity) === 'extreme' ? 'high' : 'moderate') : 'low',
        details: [
          { label: 'Binge definition (A1+A2)', value: bingeDefinition ? 'Both elements present' : 'Incomplete' },
          { label: 'Associated features', value: `${features}/5 (need ≥3)` },
          { label: 'Distress / frequency / exclusions', value: required ? 'All satisfied' : 'Not all satisfied' },
          { label: 'Severity', value: sev },
        ],
        recommendations: met
          ? [
              'Treat with appropriate psychosocial and pharmacologic interventions — CBT is first-line; lisdexamfetamine is FDA-approved for moderate–severe BED.',
              'Screen for depression, anxiety, trauma, and metabolic comorbidity.',
              'Nutritional counseling and regular follow-up.',
            ]
          : ['If binge-type eating is subthreshold, monitor and reassess.', 'Evaluate for other eating disorders (bulimia, anorexia binge-purge type, OSFED).'],
      };
    },
    evidence: {
      summary:
        'DSM-5 BED: recurrent binge episodes defined by (1) objectively large amount in a discrete period AND (2) loss of control; ≥3 of 5 associated features (rapid eating, uncomfortably full, eating when not hungry, eating alone from embarrassment, disgust/depression/guilt after); marked distress; ≥1×/week for 3 months; no compensatory behaviors and not exclusively during bulimia/anorexia. Severity: mild 1–3, moderate 4–7, severe 8–13, extreme ≥14 episodes/week.',
      validation:
        'Criteria per DSM-5 (APA, 2013). Checklist documents diagnosis; severity is graded by weekly binge frequency.',
      references: [
        {
          title: 'Diagnostic and Statistical Manual of Mental Disorders, Fifth Edition (DSM-5) — Binge Eating Disorder',
          citation: 'American Psychiatric Association. 2013',
          year: 2013,
          doi: '10.1176/appi.books.9780890425596',
        },
      ],
    },
    nextSteps: [
      { condition: 'Criteria met', actions: ['CBT-based treatment', 'Consider lisdexamfetamine for moderate–severe', 'Metabolic/psychiatric comorbidity screen', 'Nutrition referral'] },
      { condition: 'Compensatory behaviors present', actions: ['Evaluate for bulimia nervosa instead'] },
    ],
    pearls: [
      'BED has NO compensatory purging/exercise — that points to bulimia nervosa.',
      'Both elements of the binge definition are required: objectively large amount AND loss of control.',
      'Severity is set by binge frequency per week (1–3 / 4–7 / 8–13 / ≥14).',
    ],
  },
];
