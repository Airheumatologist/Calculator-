import type { Calculator } from '../../types/calculator';
import { num, bool, round, yesNo, selectInput, numberInput, riskFromThresholds } from '../../utils/helpers';

const odiBand = (pct: number) =>
  riskFromThresholds(pct, [
    {
      max: 20,
      level: 'low',
      label: 'Minimal disability (0–20%)',
      interpretation: `ODI ${pct}%: minimal disability — patient can cope with most ADLs; conservative care and activity advice usually suffice.`,
    },
    {
      max: 40,
      level: 'moderate',
      label: 'Moderate disability (21–40%)',
      interpretation: `ODI ${pct}%: moderate disability — pain/limitations with lifting, sitting, standing; structured rehab and multimodal care.`,
    },
    {
      max: 60,
      level: 'high',
      label: 'Severe disability (41–60%)',
      interpretation: `ODI ${pct}%: severe disability — ADLs significantly affected; comprehensive spine care and psychosocial factors matter.`,
    },
    {
      max: 80,
      level: 'high',
      label: 'Crippled (61–80%)',
      interpretation: `ODI ${pct}%: “crippled” band — back pain impinges on all aspects of life; intensive multidisciplinary management.`,
    },
    {
      max: 100,
      level: 'critical',
      label: 'Bed-bound / exaggerating (81–100%)',
      interpretation: `ODI ${pct}%: bed-bound or maximal symptom reporting band — urgent functional needs assessment; consider red flags and secondary gain/context carefully.`,
    },
  ]);

export const wave6ScoresResidualCalcs: Calculator[] = [
  // ─── 1. Oswestry Disability Index ──────────────────────────────────────────
  {
    id: 'oswestry',
    name: 'Oswestry Disability Index',
    shortName: 'ODI',
    description: 'Scores and interprets the Oswestry Disability Index (ODI) across 10 functional sections for low back pain–related disability.',
    category: 'orthopedics',
    tags: ['oswestry', 'odi', 'low back pain', 'disability', 'spine'],
    whenToUse: 'When evaluating functional impairment and disability in patients with acute or chronic low back pain.',
    whyUse: 'Most widely used condition-specific disability measure for low back pain outcomes and research.',
    inputs: [
      selectInput('pain', 'Section 1: Pain Intensity', [
        { label: 'I have no pain at the moment', value: 0, points: 0 },
        { label: 'The pain is very mild at the moment', value: 1, points: 1 },
        { label: 'The pain is moderate at the moment', value: 2, points: 2 },
        { label: 'The pain is fairly severe at the moment', value: 3, points: 3 },
        { label: 'The pain is very severe at the moment', value: 4, points: 4 },
        { label: 'The pain is the worst imaginable at the moment', value: 5, points: 5 },
      ], 0),
      selectInput('personalCare', 'Section 2: Personal Care (washing, dressing, etc.)', [
        { label: 'I can look after myself normally without causing extra pain', value: 0, points: 0 },
        { label: 'I can look after myself normally but it is very painful', value: 1, points: 1 },
        { label: 'It is painful to look after myself and I am slow and careful', value: 2, points: 2 },
        { label: 'I need some help but manage most of my personal care', value: 3, points: 3 },
        { label: 'I need help every day in most aspects of self-care', value: 4, points: 4 },
        { label: 'I do not get dressed, I wash with difficulty and stay in bed', value: 5, points: 5 },
      ], 0),
      selectInput('lifting', 'Section 3: Lifting', [
        { label: 'I can lift heavy weights without extra pain', value: 0, points: 0 },
        { label: 'I can lift heavy weights but it gives extra pain', value: 1, points: 1 },
        { label: 'Pain prevents me from lifting heavy weights off the floor, but I can manage if they are conveniently placed, e.g. on a table', value: 2, points: 2 },
        { label: 'Pain prevents me from lifting heavy weights, but I can manage light to medium weights if they are conveniently positioned', value: 3, points: 3 },
        { label: 'I can only lift very light weights', value: 4, points: 4 },
        { label: 'I cannot lift or carry anything at all', value: 5, points: 5 },
      ], 0),
      selectInput('walking', 'Section 4: Walking', [
        { label: 'Pain does not prevent me walking any distance', value: 0, points: 0 },
        { label: 'Pain prevents me from walking more than 1 mile', value: 1, points: 1 },
        { label: 'Pain prevents me from walking more than 1/2 mile', value: 2, points: 2 },
        { label: 'Pain prevents me from walking more than 100 yards', value: 3, points: 3 },
        { label: 'I can only walk using a stick or crutches', value: 4, points: 4 },
        { label: 'I am in bed most of the time and have to crawl to the toilet', value: 5, points: 5 },
      ], 0),
      selectInput('sitting', 'Section 5: Sitting', [
        { label: 'I can sit in any chair as long as I like', value: 0, points: 0 },
        { label: 'I can only sit in my favorite chair as long as I like', value: 1, points: 1 },
        { label: 'Pain prevents me from sitting more than 1 hour', value: 2, points: 2 },
        { label: 'Pain prevents me from sitting more than 30 minutes', value: 3, points: 3 },
        { label: 'Pain prevents me from sitting more than 10 minutes', value: 4, points: 4 },
        { label: 'Pain prevents me from sitting at all', value: 5, points: 5 },
      ], 0),
      selectInput('standing', 'Section 6: Standing', [
        { label: 'I can stand as long as I want without extra pain', value: 0, points: 0 },
        { label: 'I can stand as long as I want but it gives me extra pain', value: 1, points: 1 },
        { label: 'Pain prevents me from standing for more than 1 hour', value: 2, points: 2 },
        { label: 'Pain prevents me from standing for more than 30 minutes', value: 3, points: 3 },
        { label: 'Pain prevents me from standing for more than 10 minutes', value: 4, points: 4 },
        { label: 'Pain prevents me from standing at all', value: 5, points: 5 },
      ], 0),
      selectInput('sleeping', 'Section 7: Sleeping', [
        { label: 'My sleep is never disturbed by pain', value: 0, points: 0 },
        { label: 'My sleep is occasionally disturbed by pain', value: 1, points: 1 },
        { label: 'Because of pain I have less than 6 hours sleep', value: 2, points: 2 },
        { label: 'Because of pain I have less than 4 hours sleep', value: 3, points: 3 },
        { label: 'Because of pain I have less than 2 hours sleep', value: 4, points: 4 },
        { label: 'Pain prevents me from sleeping at all', value: 5, points: 5 },
      ], 0),
      selectInput('sexLife', 'Section 8: Sex Life (if applicable)', [
        { label: 'My sex life is normal and gives me no extra pain', value: 0, points: 0 },
        { label: 'My sex life is normal but causes some extra pain', value: 1, points: 1 },
        { label: 'My sex life is nearly normal but is very painful', value: 2, points: 2 },
        { label: 'My sex life is severely restricted by pain', value: 3, points: 3 },
        { label: 'My sex life is nearly absent because of pain', value: 4, points: 4 },
        { label: 'Pain prevents any sex life at all', value: 5, points: 5 },
        { label: 'Not applicable / omit (not answered)', value: -1 },
      ], 0, 'If omitted or not applicable, the section is excluded from both numerator and denominator per Fairbank scoring rules.'),
      selectInput('socialLife', 'Section 9: Social Life', [
        { label: 'My social life is normal and gives me no extra pain', value: 0, points: 0 },
        { label: 'My social life is normal but increases the degree of pain', value: 1, points: 1 },
        { label: 'Pain has no significant effect on my social life apart from limiting my more energetic interests, e.g. sport', value: 2, points: 2 },
        { label: 'Pain has restricted my social life and I do not go out as often', value: 3, points: 3 },
        { label: 'Pain has restricted my social life to my home', value: 4, points: 4 },
        { label: 'I have no social life because of pain', value: 5, points: 5 },
      ], 0),
      selectInput('travelling', 'Section 10: Travelling', [
        { label: 'I can travel anywhere without pain', value: 0, points: 0 },
        { label: 'I can travel anywhere but it gives me extra pain', value: 1, points: 1 },
        { label: 'Pain is bad but I manage journeys over 2 hours', value: 2, points: 2 },
        { label: 'Pain restricts me to journeys of less than 1 hour', value: 3, points: 3 },
        { label: 'Pain restricts me to short necessary journeys under 30 minutes', value: 4, points: 4 },
        { label: 'Pain prevents me from travelling except to receive treatment', value: 5, points: 5 },
      ], 0),
    ],
    calculate(values) {
      const items = [
        values.pain,
        values.personalCare,
        values.lifting,
        values.walking,
        values.sitting,
        values.standing,
        values.sleeping,
        values.sexLife,
        values.socialLife,
        values.travelling,
      ];

      let rawScore = 0;
      let answeredCount = 0;

      for (const item of items) {
        const val = num(item, 0);
        if (val >= 0) {
          rawScore += val;
          answeredCount++;
        }
      }

      const maxPossible = 5 * answeredCount;
      const pct = answeredCount > 0 ? round((rawScore / maxPossible) * 100, 1) : 0;
      const r = odiBand(pct);

      return {
        score: pct,
        unit: '%',
        ...r,
        details: [
          { label: 'Raw score', value: `${rawScore} / ${maxPossible}` },
          { label: 'Answered sections', value: `${answeredCount} / 10` },
          { label: 'Disability percentage', value: `${pct}%` },
          { label: 'Range', value: '0% (no disability) – 100% (maximal)' },
          { label: 'MCID (approx)', value: '~10 percentage points often cited' },
        ],
      };
    },
    evidence: {
      summary:
        'ODI scores 10 activity sections 0–5; percent disability = (raw / max possible for answered items) × 100. Fairbank bands: 0–20 minimal, 21–40 moderate, 41–60 severe, 61–80 crippled, 81–100 bed-bound/exaggerating.',
      formula: 'ODI % = (Σ section scores / (5 × n answered)) × 100',
      validation: 'Fairbank & Pynsent; extensively validated LBP outcome instrument.',
      references: [
        {
          title: 'The Oswestry Disability Index',
          citation: 'Fairbank JC, Pynsent PB. Spine. 2000',
          year: 2000,
          pmid: '11074683',
          doi: '10.1097/00007632-200011150-00017',
        },
      ],
    },
    nextSteps: [
      { condition: 'ODI >40%', actions: ['Multimodal spine program', 'Screen yellow flags', 'Imaging only if red flags / persistent'] },
      { condition: 'Serial use', actions: ['Track change ≥ MCID', 'Pair with pain VAS and work status'] },
    ],
    pearls: [
      'Version 2.0 is common in research; section wording varies slightly by edition.',
      'High scores without objective findings warrant careful psychosocial review — not automatic dismissal.',
    ],
  },

  // ─── 2. Neck Disability Index ──────────────────────────────────────────────
  {
    id: 'ndi-neck',
    name: 'Neck Disability Index',
    shortName: 'NDI',
    description: 'Scores and interprets the Neck Disability Index (NDI) percentage (0–100%) across 10 functional sections for neck pain–related disability.',
    category: 'orthopedics',
    tags: ['ndi', 'neck', 'cervical', 'disability', 'spine'],
    whenToUse: 'When evaluating functional impairment and disability in patients with neck pain, whiplash, or cervical radiculopathy.',
    whyUse: 'Standard neck-specific disability PRO; validated counterpart to the Oswestry Low Back Pain Disability Index.',
    inputs: [
      selectInput('entryMode', 'Entry Mode', [
        { label: 'Complete 10-section questionnaire (recommended)', value: 'survey' },
        { label: 'Direct score override / precomputed %', value: 'direct' },
      ], 'survey'),
      selectInput('pain', 'Section 1: Pain Intensity', [
        { label: 'I have no pain at the moment', value: 0, points: 0 },
        { label: 'The pain is very mild at the moment', value: 1, points: 1 },
        { label: 'The pain is moderate at the moment', value: 2, points: 2 },
        { label: 'The pain is fairly severe at the moment', value: 3, points: 3 },
        { label: 'The pain is very severe at the moment', value: 4, points: 4 },
        { label: 'The pain is the worst imaginable at the moment', value: 5, points: 5 },
      ], 0),
      selectInput('personalCare', 'Section 2: Personal Care (washing, dressing, etc.)', [
        { label: 'I can look after myself normally without causing extra pain', value: 0, points: 0 },
        { label: 'I can look after myself normally but it causes extra pain', value: 1, points: 1 },
        { label: 'It is painful to look after myself and I am slow and careful', value: 2, points: 2 },
        { label: 'I need some help but manage most of my personal care', value: 3, points: 3 },
        { label: 'I need help every day in most aspects of self care', value: 4, points: 4 },
        { label: 'I do not get dressed, I wash with difficulty and stay in bed', value: 5, points: 5 },
      ], 0),
      selectInput('lifting', 'Section 3: Lifting', [
        { label: 'I can lift heavy weights without extra pain', value: 0, points: 0 },
        { label: 'I can lift heavy weights but it gives extra pain', value: 1, points: 1 },
        { label: 'Pain prevents me from lifting heavy weights off the floor, but I can manage if they are conveniently positioned (e.g. on a table)', value: 2, points: 2 },
        { label: 'Pain prevents me from lifting heavy weights, but I can manage light to medium weights if they are conveniently positioned', value: 3, points: 3 },
        { label: 'I can only lift very light weights', value: 4, points: 4 },
        { label: 'I cannot lift or carry anything at all', value: 5, points: 5 },
      ], 0),
      selectInput('reading', 'Section 4: Reading', [
        { label: 'I can read as much as I want with no pain in my neck', value: 0, points: 0 },
        { label: 'I can read as much as I want with slight pain in my neck', value: 1, points: 1 },
        { label: 'I can read as much as I want with moderate pain in my neck', value: 2, points: 2 },
        { label: 'I cannot read as much as I want because of moderate pain in my neck', value: 3, points: 3 },
        { label: 'I can hardly read at all because of severe pain in my neck', value: 4, points: 4 },
        { label: 'I cannot read at all', value: 5, points: 5 },
      ], 0),
      selectInput('headaches', 'Section 5: Headaches', [
        { label: 'I have no headaches at all', value: 0, points: 0 },
        { label: 'I have slight headaches which come infrequently', value: 1, points: 1 },
        { label: 'I have moderate headaches which come infrequently', value: 2, points: 2 },
        { label: 'I have moderate headaches which come frequently', value: 3, points: 3 },
        { label: 'I have severe headaches which come frequently', value: 4, points: 4 },
        { label: 'I have headaches almost all the time', value: 5, points: 5 },
      ], 0),
      selectInput('concentration', 'Section 6: Concentration', [
        { label: 'I can concentrate fully when I want to with no difficulty', value: 0, points: 0 },
        { label: 'I can concentrate fully when I want to with slight difficulty', value: 1, points: 1 },
        { label: 'I have a fair degree of difficulty in concentrating when I want to', value: 2, points: 2 },
        { label: 'I have a lot of difficulty in concentrating when I want to', value: 3, points: 3 },
        { label: 'I have a great deal of difficulty in concentrating when I want to', value: 4, points: 4 },
        { label: 'I cannot concentrate at all', value: 5, points: 5 },
      ], 0),
      selectInput('work', 'Section 7: Work', [
        { label: 'I can do as much work as I want to', value: 0, points: 0 },
        { label: 'I can only do my usual work, but no more', value: 1, points: 1 },
        { label: 'I can do most of my usual work, but no more', value: 2, points: 2 },
        { label: 'I cannot do my usual work', value: 3, points: 3 },
        { label: 'I can hardly do any work at all', value: 4, points: 4 },
        { label: 'I cannot do any work at all', value: 5, points: 5 },
      ], 0),
      selectInput('driving', 'Section 8: Driving', [
        { label: 'I can drive my car without any neck pain', value: 0, points: 0 },
        { label: 'I can drive my car as long as I want with slight pain in my neck', value: 1, points: 1 },
        { label: 'I can drive my car as long as I want with moderate pain in my neck', value: 2, points: 2 },
        { label: 'I cannot drive my car as long as I want because of moderate pain in my neck', value: 3, points: 3 },
        { label: 'I can hardly drive at all because of severe pain in my neck', value: 4, points: 4 },
        { label: 'I cannot drive my car at all', value: 5, points: 5 },
        { label: 'Not applicable / omit (does not drive)', value: -1 },
      ], 0, 'If omitted or not applicable, excluded from numerator and denominator per Fairbank/Vernon rules.'),
      selectInput('sleeping', 'Section 9: Sleeping', [
        { label: 'I have no trouble sleeping', value: 0, points: 0 },
        { label: 'My sleep is slightly disturbed (less than 1 hr sleepless)', value: 1, points: 1 },
        { label: 'My sleep is mildly disturbed (1–2 hrs sleepless)', value: 2, points: 2 },
        { label: 'My sleep is moderately disturbed (2–3 hrs sleepless)', value: 3, points: 3 },
        { label: 'My sleep is greatly disturbed (3–5 hrs sleepless)', value: 4, points: 4 },
        { label: 'My sleep is completely disturbed (5–7 hrs sleepless)', value: 5, points: 5 },
      ], 0),
      selectInput('recreation', 'Section 10: Recreation', [
        { label: 'I am able to engage in all my recreation activities with no neck pain at all', value: 0, points: 0 },
        { label: 'I am able to engage in all my recreation activities with some neck pain', value: 1, points: 1 },
        { label: 'I am able to engage in most, but not all of my usual recreation activities because of neck pain', value: 2, points: 2 },
        { label: 'I am able to engage in a few of my usual recreation activities because of neck pain', value: 3, points: 3 },
        { label: 'I can hardly do any recreation activities because of neck pain', value: 4, points: 4 },
        { label: 'I cannot do any recreation activities at all', value: 5, points: 5 },
      ], 0),
      numberInput('pct', 'Direct NDI disability % (override)', {
        min: 0,
        max: 100,
        step: 1,
        defaultValue: 28,
        helpText: 'Used only if entry mode is set to Direct Score Override (0–100%).',
      }),
    ],
    calculate(values) {
      const mode = String(values.entryMode ?? 'survey');
      let pct: number;
      let rawScore = 0;
      let answeredCount = 0;

      if (mode === 'direct' || (values.pct !== undefined && values.entryMode === undefined && values.pain === undefined)) {
        pct = round(clamp01_100(num(values.pct, 0)), 1);
      } else {
        const items = [
          values.pain,
          values.personalCare,
          values.lifting,
          values.reading,
          values.headaches,
          values.concentration,
          values.work,
          values.driving,
          values.sleeping,
          values.recreation,
        ];
        for (const item of items) {
          const val = num(item, 0);
          if (val >= 0) {
            rawScore += val;
            answeredCount++;
          }
        }
        const maxPossible = 5 * answeredCount;
        pct = answeredCount > 0 ? round((rawScore / maxPossible) * 100, 1) : 0;
      }

      const r = riskFromThresholds(pct, [
        {
          max: 8,
          level: 'low',
          label: 'No / minimal disability (0–8%)',
          interpretation: `NDI ${pct}%: minimal neck disability band (Vernon educational cut often ≤4/50 raw ≈ 8%).`,
        },
        {
          max: 28,
          level: 'low',
          label: 'Mild disability (10–28%)',
          interpretation: `NDI ${pct}%: mild disability — usually manages ADLs with some limitation; conservative care.`,
        },
        {
          max: 48,
          level: 'moderate',
          label: 'Moderate disability (30–48%)',
          interpretation: `NDI ${pct}%: moderate disability — pain interferes with work/recreation; structured PT and activity modification.`,
        },
        {
          max: 68,
          level: 'high',
          label: 'Severe disability (50–68%)',
          interpretation: `NDI ${pct}%: severe disability — substantial ADL impact; multidisciplinary cervical care.`,
        },
        {
          max: 100,
          level: 'critical',
          label: 'Complete disability (≥70%)',
          interpretation: `NDI ${pct}%: complete/near-complete disability band — intensive support; reassess neurologic status and red flags.`,
        },
      ]);
      const details: { label: string; value: string }[] = [
        { label: 'Disability percentage', value: `${pct}%` },
        { label: 'MCID (approx)', value: '~5–10 raw points / ~10–20% depending on population' },
      ];
      if (answeredCount > 0) {
        details.unshift(
          { label: 'Raw score', value: `${rawScore} / ${5 * answeredCount}` },
          { label: 'Answered sections', value: `${answeredCount} / 10` },
        );
      } else {
        details.unshift({ label: 'Raw equivalent (if 10 answered)', value: `${round(pct / 2, 1)} / 50` });
      }

      return {
        score: pct,
        unit: '%',
        ...r,
        details,
      };
    },
    evidence: {
      summary:
        'NDI: 10 sections scored 0–5 (raw 0–50) or expressed as % disability. Higher = worse function. Common mild/moderate/severe bands parallel ODI-style education cuts.',
      formula: 'NDI % = (Σ / (5 × n answered)) × 100',
      validation: 'Vernon & Mior 1991; widely validated for neck pain and whiplash.',
      references: [
        {
          title: 'The Neck Disability Index: a study of reliability and validity',
          citation: 'Vernon H, Mior S. J Manipulative Physiol Ther. 1991',
          year: 1991,
          pmid: '1834753',
        },
      ],
    },
    nextSteps: [
      { condition: 'NDI ≥30%', actions: ['Cervical PT', 'Ergonomics / work review', 'Neuro exam if radicular'] },
    ],
    pearls: ['Some papers report raw /50; convert carefully when comparing literature.', 'Driving and reading sections are highly sensitive to cervical pain.'],
  },

  // ─── 3. DASH upper limb ────────────────────────────────────────────────────
  {
    id: 'dash-upper-limb',
    name: 'DASH Score (Upper Extremity)',
    shortName: 'DASH',
    description: 'Scores and interprets Disabilities of the Arm, Shoulder and Hand (DASH) 30-item disability/symptom score (0–100; higher = worse).',
    category: 'orthopedics',
    tags: ['dash', 'upper extremity', 'shoulder', 'hand', 'disability'],
    whenToUse: 'When evaluating disability and symptoms in patients with any musculoskeletal condition of the arm, shoulder, or hand.',
    whyUse: 'Gold-standard region-specific PRO for upper-limb function across diagnoses.',
    inputs: [
      selectInput('entryMode', 'Entry Mode', [
        { label: 'Interactive 30-item survey (recommended)', value: 'survey' },
        { label: 'Direct score override (0–100)', value: 'direct' },
      ], 'survey'),
      selectInput('dash_q1', '1. Open a tight or new jar', [
        { label: '1 - No difficulty', value: 1 },
        { label: '2 - Mild difficulty', value: 2 },
        { label: '3 - Moderate difficulty', value: 3 },
        { label: '4 - Severe difficulty', value: 4 },
        { label: '5 - Unable', value: 5 },
      ], 1),
      selectInput('dash_q2', '2. Write', [
        { label: '1 - No difficulty', value: 1 },
        { label: '2 - Mild difficulty', value: 2 },
        { label: '3 - Moderate difficulty', value: 3 },
        { label: '4 - Severe difficulty', value: 4 },
        { label: '5 - Unable', value: 5 },
      ], 1),
      selectInput('dash_q3', '3. Turn a key', [
        { label: '1 - No difficulty', value: 1 },
        { label: '2 - Mild difficulty', value: 2 },
        { label: '3 - Moderate difficulty', value: 3 },
        { label: '4 - Severe difficulty', value: 4 },
        { label: '5 - Unable', value: 5 },
      ], 1),
      selectInput('dash_q4', '4. Prepare a meal', [
        { label: '1 - No difficulty', value: 1 },
        { label: '2 - Mild difficulty', value: 2 },
        { label: '3 - Moderate difficulty', value: 3 },
        { label: '4 - Severe difficulty', value: 4 },
        { label: '5 - Unable', value: 5 },
      ], 1),
      selectInput('dash_q5', '5. Push open a heavy door', [
        { label: '1 - No difficulty', value: 1 },
        { label: '2 - Mild difficulty', value: 2 },
        { label: '3 - Moderate difficulty', value: 3 },
        { label: '4 - Severe difficulty', value: 4 },
        { label: '5 - Unable', value: 5 },
      ], 1),
      selectInput('dash_q6', '6. Place an object on a shelf above your head', [
        { label: '1 - No difficulty', value: 1 },
        { label: '2 - Mild difficulty', value: 2 },
        { label: '3 - Moderate difficulty', value: 3 },
        { label: '4 - Severe difficulty', value: 4 },
        { label: '5 - Unable', value: 5 },
      ], 1),
      selectInput('dash_q7', '7. Do heavy household chores (e.g. wash walls, wash floors)', [
        { label: '1 - No difficulty', value: 1 },
        { label: '2 - Mild difficulty', value: 2 },
        { label: '3 - Moderate difficulty', value: 3 },
        { label: '4 - Severe difficulty', value: 4 },
        { label: '5 - Unable', value: 5 },
      ], 1),
      selectInput('dash_q8', '8. Garden or do yard work', [
        { label: '1 - No difficulty', value: 1 },
        { label: '2 - Mild difficulty', value: 2 },
        { label: '3 - Moderate difficulty', value: 3 },
        { label: '4 - Severe difficulty', value: 4 },
        { label: '5 - Unable', value: 5 },
      ], 1),
      selectInput('dash_q9', '9. Make a bed', [
        { label: '1 - No difficulty', value: 1 },
        { label: '2 - Mild difficulty', value: 2 },
        { label: '3 - Moderate difficulty', value: 3 },
        { label: '4 - Severe difficulty', value: 4 },
        { label: '5 - Unable', value: 5 },
      ], 1),
      selectInput('dash_q10', '10. Carry a shopping bag or briefcase', [
        { label: '1 - No difficulty', value: 1 },
        { label: '2 - Mild difficulty', value: 2 },
        { label: '3 - Moderate difficulty', value: 3 },
        { label: '4 - Severe difficulty', value: 4 },
        { label: '5 - Unable', value: 5 },
      ], 1),
      selectInput('dash_q11', '11. Carry a heavy object (over 10 lbs / 5 kg)', [
        { label: '1 - No difficulty', value: 1 },
        { label: '2 - Mild difficulty', value: 2 },
        { label: '3 - Moderate difficulty', value: 3 },
        { label: '4 - Severe difficulty', value: 4 },
        { label: '5 - Unable', value: 5 },
      ], 1),
      selectInput('dash_q12', '12. Change a lightbulb overhead', [
        { label: '1 - No difficulty', value: 1 },
        { label: '2 - Mild difficulty', value: 2 },
        { label: '3 - Moderate difficulty', value: 3 },
        { label: '4 - Severe difficulty', value: 4 },
        { label: '5 - Unable', value: 5 },
      ], 1),
      selectInput('dash_q13', '13. Wash or blow dry your hair', [
        { label: '1 - No difficulty', value: 1 },
        { label: '2 - Mild difficulty', value: 2 },
        { label: '3 - Moderate difficulty', value: 3 },
        { label: '4 - Severe difficulty', value: 4 },
        { label: '5 - Unable', value: 5 },
      ], 1),
      selectInput('dash_q14', '14. Wash your back', [
        { label: '1 - No difficulty', value: 1 },
        { label: '2 - Mild difficulty', value: 2 },
        { label: '3 - Moderate difficulty', value: 3 },
        { label: '4 - Severe difficulty', value: 4 },
        { label: '5 - Unable', value: 5 },
      ], 1),
      selectInput('dash_q15', '15. Put on a pullover sweater', [
        { label: '1 - No difficulty', value: 1 },
        { label: '2 - Mild difficulty', value: 2 },
        { label: '3 - Moderate difficulty', value: 3 },
        { label: '4 - Severe difficulty', value: 4 },
        { label: '5 - Unable', value: 5 },
      ], 1),
      selectInput('dash_q16', '16. Use a knife to cut food', [
        { label: '1 - No difficulty', value: 1 },
        { label: '2 - Mild difficulty', value: 2 },
        { label: '3 - Moderate difficulty', value: 3 },
        { label: '4 - Severe difficulty', value: 4 },
        { label: '5 - Unable', value: 5 },
      ], 1),
      selectInput('dash_q17', '17. Recreational activities requiring little effort (e.g. cards, knitting)', [
        { label: '1 - No difficulty', value: 1 },
        { label: '2 - Mild difficulty', value: 2 },
        { label: '3 - Moderate difficulty', value: 3 },
        { label: '4 - Severe difficulty', value: 4 },
        { label: '5 - Unable', value: 5 },
      ], 1),
      selectInput('dash_q18', '18. Recreational activities with force or impact through arm (e.g. tennis, golf, hammer)', [
        { label: '1 - No difficulty', value: 1 },
        { label: '2 - Mild difficulty', value: 2 },
        { label: '3 - Moderate difficulty', value: 3 },
        { label: '4 - Severe difficulty', value: 4 },
        { label: '5 - Unable', value: 5 },
      ], 1),
      selectInput('dash_q19', '19. Recreational activities with free arm movement (e.g. swimming, frisbee)', [
        { label: '1 - No difficulty', value: 1 },
        { label: '2 - Mild difficulty', value: 2 },
        { label: '3 - Moderate difficulty', value: 3 },
        { label: '4 - Severe difficulty', value: 4 },
        { label: '5 - Unable', value: 5 },
      ], 1),
      selectInput('dash_q20', '20. Manage transportation needs (getting from one place to another)', [
        { label: '1 - No difficulty', value: 1 },
        { label: '2 - Mild difficulty', value: 2 },
        { label: '3 - Moderate difficulty', value: 3 },
        { label: '4 - Severe difficulty', value: 4 },
        { label: '5 - Unable', value: 5 },
      ], 1),
      selectInput('dash_q21', '21. Sexual activities', [
        { label: '1 - No difficulty', value: 1 },
        { label: '2 - Mild difficulty', value: 2 },
        { label: '3 - Moderate difficulty', value: 3 },
        { label: '4 - Severe difficulty', value: 4 },
        { label: '5 - Unable', value: 5 },
      ], 1),
      selectInput('dash_q22', '22. Extent arm/shoulder/hand interfered with normal social activities with family/friends', [
        { label: '1 - Not at all', value: 1 },
        { label: '2 - Slightly', value: 2 },
        { label: '3 - Moderately', value: 3 },
        { label: '4 - Quite a bit', value: 4 },
        { label: '5 - Extremely', value: 5 },
      ], 1),
      selectInput('dash_q23', '23. Limited in your work or other regular daily activities', [
        { label: '1 - Not limited at all', value: 1 },
        { label: '2 - Slightly limited', value: 2 },
        { label: '3 - Moderately limited', value: 3 },
        { label: '4 - Very limited', value: 4 },
        { label: '5 - Unable', value: 5 },
      ], 1),
      selectInput('dash_q24', '24. Arm, shoulder or hand pain', [
        { label: '1 - None', value: 1 },
        { label: '2 - Mild', value: 2 },
        { label: '3 - Moderate', value: 3 },
        { label: '4 - Severe', value: 4 },
        { label: '5 - Extreme', value: 5 },
      ], 1),
      selectInput('dash_q25', '25. Arm, shoulder or hand pain when doing specific activity', [
        { label: '1 - None', value: 1 },
        { label: '2 - Mild', value: 2 },
        { label: '3 - Moderate', value: 3 },
        { label: '4 - Severe', value: 4 },
        { label: '5 - Extreme', value: 5 },
      ], 1),
      selectInput('dash_q26', '26. Tingling (pins and needles) in your arm, shoulder or hand', [
        { label: '1 - None', value: 1 },
        { label: '2 - Mild', value: 2 },
        { label: '3 - Moderate', value: 3 },
        { label: '4 - Severe', value: 4 },
        { label: '5 - Extreme', value: 5 },
      ], 1),
      selectInput('dash_q27', '27. Weakness in your arm, shoulder or hand', [
        { label: '1 - None', value: 1 },
        { label: '2 - Mild', value: 2 },
        { label: '3 - Moderate', value: 3 },
        { label: '4 - Severe', value: 4 },
        { label: '5 - Extreme', value: 5 },
      ], 1),
      selectInput('dash_q28', '28. Stiffness in your arm, shoulder or hand', [
        { label: '1 - None', value: 1 },
        { label: '2 - Mild', value: 2 },
        { label: '3 - Moderate', value: 3 },
        { label: '4 - Severe', value: 4 },
        { label: '5 - Extreme', value: 5 },
      ], 1),
      selectInput('dash_q29', '29. Difficulty sleeping because of pain in arm, shoulder or hand', [
        { label: '1 - No difficulty', value: 1 },
        { label: '2 - Mild difficulty', value: 2 },
        { label: '3 - Moderate difficulty', value: 3 },
        { label: '4 - Severe difficulty', value: 4 },
        { label: '5 - So much difficulty that I cannot sleep', value: 5 },
      ], 1),
      selectInput('dash_q30', '30. Feel less capable, less confident or less useful because of arm/shoulder/hand', [
        { label: '1 - Strongly disagree', value: 1 },
        { label: '2 - Disagree', value: 2 },
        { label: '3 - Neither agree nor disagree', value: 3 },
        { label: '4 - Agree', value: 4 },
        { label: '5 - Strongly agree', value: 5 },
      ], 1),
      numberInput('total', 'Direct DASH score override (0–100)', {
        min: 0,
        max: 100,
        step: 0.1,
        defaultValue: 35,
        helpText: 'Used if Direct Score Override mode is active. DASH = ((sum of n responses / n) − 1) × 25.',
      }),
    ],
    calculate(values) {
      const mode = String(values.entryMode ?? 'survey');
      let score: number;
      let answeredCount = 0;
      let rawSum = 0;

      if (mode === 'direct' || (values.total !== undefined && values.entryMode === undefined && values.dash_q1 === undefined)) {
        score = round(clamp01_100(num(values.total, 0)), 1);
      } else {
        const qKeys = [
          'dash_q1', 'dash_q2', 'dash_q3', 'dash_q4', 'dash_q5',
          'dash_q6', 'dash_q7', 'dash_q8', 'dash_q9', 'dash_q10',
          'dash_q11', 'dash_q12', 'dash_q13', 'dash_q14', 'dash_q15',
          'dash_q16', 'dash_q17', 'dash_q18', 'dash_q19', 'dash_q20',
          'dash_q21', 'dash_q22', 'dash_q23', 'dash_q24', 'dash_q25',
          'dash_q26', 'dash_q27', 'dash_q28', 'dash_q29', 'dash_q30',
        ];
        for (const k of qKeys) {
          const v = num(values[k], 0);
          if (v >= 1 && v <= 5) {
            rawSum += v;
            answeredCount++;
          }
        }
        if (answeredCount >= 27) {
          score = round(((rawSum / answeredCount) - 1) * 25, 1);
        } else {
          score = round(clamp01_100(num(values.total, 0)), 1);
        }
      }

      const r = riskFromThresholds(score, [
        {
          max: 15,
          level: 'low',
          label: 'Minimal disability (≤15)',
          interpretation: `DASH ${score}: minimal upper-limb disability relative to population norms (mean often ~10).`,
        },
        {
          max: 40,
          level: 'moderate',
          label: 'Mild–moderate disability (16–40)',
          interpretation: `DASH ${score}: mild to moderate limitation — typical of many treated shoulder/hand conditions in rehab.`,
        },
        {
          max: 60,
          level: 'high',
          label: 'Moderate–severe (41–60)',
          interpretation: `DASH ${score}: substantial upper-extremity disability; optimize therapy, workplace mods, and treat source pathology.`,
        },
        {
          max: 100,
          level: 'critical',
          label: 'Severe disability (>60)',
          interpretation: `DASH ${score}: severe disability — multidisciplinary care; reassess diagnosis, nerve, and psychosocial factors.`,
        },
      ]);
      const details: { label: string; value: string }[] = [
        { label: 'Direction', value: 'Higher = more disability (0–100 scale)' },
        { label: 'Optional modules', value: 'Work / sport-music scored separately (not in this total)' },
      ];
      if (answeredCount > 0) {
        details.unshift(
          { label: 'Answered items', value: `${answeredCount} / 30 (min 27 required)` },
          { label: 'Raw item mean', value: `${round(rawSum / answeredCount, 2)} / 5.0` },
        );
      }
      return {
        score,
        unit: '0–100',
        ...r,
        details,
      };
    },
    evidence: {
      summary:
        'DASH 30-item disability/symptom score scaled 0–100 (higher worse). Formula ((mean item) − 1) × 25. Optional work and sport modules separate.',
      formula: 'DASH = ((Σ items / n) − 1) × 25',
      validation: 'Institute for Work & Health / AAOS; extensively validated across UE diagnoses.',
      references: [
        {
          title: 'Development of an upper extremity outcome measure: the DASH',
          citation: 'Hudak PL et al. Am J Ind Med. 1996',
          year: 1996,
          pmid: '8773720',
          doi: '10.1002/(SICI)1097-0274(199606)29:6<602::AID-AJIM4>3.0.CO;2-L',
        },
      ],
    },
    nextSteps: [
      { condition: 'Elevated DASH', actions: ['Hand/OT or PT', 'Activity modification', 'Ortho review if structural lesion'] },
    ],
    pearls: [
      'Not the DASH VTE recurrence score (separate tool).',
      'MCID often ~10 points; population norms vary by age.',
    ],
  },

  // ─── 4. QuickDASH ──────────────────────────────────────────────────────────
  {
    id: 'quickdash',
    name: 'QuickDASH',
    shortName: 'QuickDASH',
    description: 'Scores and interprets the 11-item QuickDASH disability/symptom score (0–100; higher = worse).',
    category: 'orthopedics',
    tags: ['quickdash', 'dash', 'upper extremity', 'hand', 'shoulder'],
    whenToUse: 'Brief upper-extremity PRO when full DASH is too long; same 0–100 metric family.',
    whyUse: '11-item short form correlates highly with full DASH and is practical in clinic.',
    inputs: [
      selectInput('entryMode', 'Entry Mode', [
        { label: 'Interactive 11-item questionnaire (recommended)', value: 'survey' },
        { label: 'Direct score override (0–100)', value: 'direct' },
      ], 'survey'),
      selectInput('qdash_q1', '1. Open a tight or new jar', [
        { label: '1 - No difficulty', value: 1 },
        { label: '2 - Mild difficulty', value: 2 },
        { label: '3 - Moderate difficulty', value: 3 },
        { label: '4 - Severe difficulty', value: 4 },
        { label: '5 - Unable', value: 5 },
      ], 1),
      selectInput('qdash_q2', '2. Do heavy household chores (e.g. wash walls, floors)', [
        { label: '1 - No difficulty', value: 1 },
        { label: '2 - Mild difficulty', value: 2 },
        { label: '3 - Moderate difficulty', value: 3 },
        { label: '4 - Severe difficulty', value: 4 },
        { label: '5 - Unable', value: 5 },
      ], 1),
      selectInput('qdash_q3', '3. Carry a shopping bag or briefcase', [
        { label: '1 - No difficulty', value: 1 },
        { label: '2 - Mild difficulty', value: 2 },
        { label: '3 - Moderate difficulty', value: 3 },
        { label: '4 - Severe difficulty', value: 4 },
        { label: '5 - Unable', value: 5 },
      ], 1),
      selectInput('qdash_q4', '4. Wash your back', [
        { label: '1 - No difficulty', value: 1 },
        { label: '2 - Mild difficulty', value: 2 },
        { label: '3 - Moderate difficulty', value: 3 },
        { label: '4 - Severe difficulty', value: 4 },
        { label: '5 - Unable', value: 5 },
      ], 1),
      selectInput('qdash_q5', '5. Use a knife to cut food', [
        { label: '1 - No difficulty', value: 1 },
        { label: '2 - Mild difficulty', value: 2 },
        { label: '3 - Moderate difficulty', value: 3 },
        { label: '4 - Severe difficulty', value: 4 },
        { label: '5 - Unable', value: 5 },
      ], 1),
      selectInput('qdash_q6', '6. Heavy recreational activities with force or impact through arm (e.g. hammering, tennis)', [
        { label: '1 - No difficulty', value: 1 },
        { label: '2 - Mild difficulty', value: 2 },
        { label: '3 - Moderate difficulty', value: 3 },
        { label: '4 - Severe difficulty', value: 4 },
        { label: '5 - Unable', value: 5 },
      ], 1),
      selectInput('qdash_q7', '7. Interference with normal social activities with family, friends, neighbors or groups', [
        { label: '1 - Not at all', value: 1 },
        { label: '2 - Slightly', value: 2 },
        { label: '3 - Moderately', value: 3 },
        { label: '4 - Quite a bit', value: 4 },
        { label: '5 - Extremely', value: 5 },
      ], 1),
      selectInput('qdash_q8', '8. Limited in your work or other regular daily activities', [
        { label: '1 - Not limited at all', value: 1 },
        { label: '2 - Slightly limited', value: 2 },
        { label: '3 - Moderately limited', value: 3 },
        { label: '4 - Very limited', value: 4 },
        { label: '5 - Unable', value: 5 },
      ], 1),
      selectInput('qdash_q9', '9. Arm, shoulder or hand pain', [
        { label: '1 - None', value: 1 },
        { label: '2 - Mild', value: 2 },
        { label: '3 - Moderate', value: 3 },
        { label: '4 - Severe', value: 4 },
        { label: '5 - Extreme', value: 5 },
      ], 1),
      selectInput('qdash_q10', '10. Tingling (pins and needles) in your arm, shoulder or hand', [
        { label: '1 - None', value: 1 },
        { label: '2 - Mild', value: 2 },
        { label: '3 - Moderate', value: 3 },
        { label: '4 - Severe', value: 4 },
        { label: '5 - Extreme', value: 5 },
      ], 1),
      selectInput('qdash_q11', '11. Difficulty sleeping because of pain in arm, shoulder or hand', [
        { label: '1 - No difficulty', value: 1 },
        { label: '2 - Mild difficulty', value: 2 },
        { label: '3 - Moderate difficulty', value: 3 },
        { label: '4 - Severe difficulty', value: 4 },
        { label: '5 - So much difficulty that I cannot sleep', value: 5 },
      ], 1),
      numberInput('total', 'Direct QuickDASH score override', {
        min: 0,
        max: 100,
        step: 0.1,
        defaultValue: 32,
        helpText: 'Used if Direct Score Override mode is active. QuickDASH = ((sum of n / n) − 1) × 25.',
      }),
    ],
    calculate(values) {
      const mode = String(values.entryMode ?? 'survey');
      let score: number;
      let answeredCount = 0;
      let rawSum = 0;

      if (mode === 'direct' || (values.total !== undefined && values.entryMode === undefined && values.qdash_q1 === undefined)) {
        score = round(clamp01_100(num(values.total, 0)), 1);
      } else {
        const qKeys = [
          'qdash_q1', 'qdash_q2', 'qdash_q3', 'qdash_q4', 'qdash_q5',
          'qdash_q6', 'qdash_q7', 'qdash_q8', 'qdash_q9', 'qdash_q10',
          'qdash_q11',
        ];
        for (const k of qKeys) {
          const v = num(values[k], 0);
          if (v >= 1 && v <= 5) {
            rawSum += v;
            answeredCount++;
          }
        }
        if (answeredCount >= 10) {
          score = round(((rawSum / answeredCount) - 1) * 25, 1);
        } else {
          score = round(clamp01_100(num(values.total, 0)), 1);
        }
      }

      const r = riskFromThresholds(score, [
        {
          max: 15,
          level: 'low',
          label: 'Minimal disability (≤15)',
          interpretation: `QuickDASH ${score}: minimal disability band vs general population norms.`,
        },
        {
          max: 40,
          level: 'moderate',
          label: 'Mild–moderate (16–40)',
          interpretation: `QuickDASH ${score}: mild–moderate UE disability — common rehab range.`,
        },
        {
          max: 60,
          level: 'high',
          label: 'Moderate–severe (41–60)',
          interpretation: `QuickDASH ${score}: substantial limitation; intensify therapy and address pathology.`,
        },
        {
          max: 100,
          level: 'critical',
          label: 'Severe (>60)',
          interpretation: `QuickDASH ${score}: severe UE disability.`,
        },
      ]);
      const details: { label: string; value: string }[] = [
        { label: 'Direction', value: 'Higher = more disability (0–100 scale)' },
      ];
      if (answeredCount > 0) {
        details.unshift(
          { label: 'Answered items', value: `${answeredCount} / 11 (min 10 required)` },
          { label: 'Raw item mean', value: `${round(rawSum / answeredCount, 2)} / 5.0` },
        );
      }
      return {
        score,
        unit: '0–100',
        ...r,
        details,
      };
    },
    evidence: {
      summary: 'QuickDASH: 11 items scored like DASH to 0–100 (higher = worse disability). Strong correlation with full DASH.',
      formula: 'QuickDASH = ((mean of answered items) − 1) × 25',
      validation: 'Beaton et al.; widely adopted short form of DASH.',
      references: [
        {
          title: 'Development of the QuickDASH: comparison of three item-reduction approaches',
          citation: 'Beaton DE et al. J Bone Joint Surg Am. 2005',
          year: 2005,
          pmid: '15866967',
          doi: '10.2106/JBJS.D.02060',
        },
      ],
    },
    nextSteps: [
      { condition: 'QuickDASH >40', actions: ['UE-focused rehab', 'Ergonomic assessment', 'Specialist referral if progressive neuro deficit'] },
    ],
    pearls: ['Work and sport modules are optional and scored separately.', 'MCID often ~8–16 points depending on condition.'],
  },

  // ─── 5. WOMAC ──────────────────────────────────────────────────────────────
  {
    id: 'womac',
    name: 'WOMAC Osteoarthritis Index (Total)',
    shortName: 'WOMAC',
    description: 'Scores and interprets the Western Ontario and McMaster Universities Osteoarthritis Index (WOMAC) across Pain (5), Stiffness (2), and Function (17) subscales (Likert 0–96).',
    category: 'orthopedics',
    tags: ['womac', 'osteoarthritis', 'knee', 'hip', 'function'],
    whenToUse: 'When evaluating hip or knee osteoarthritis symptoms and physical disability.',
    whyUse: 'Core PRO for hip and knee osteoarthritis trials and clinic outcomes endorsed by OMERACT.',
    inputs: [
      selectInput('entryMode', 'Entry Mode', [
        { label: 'Interactive 24-item questionnaire (recommended)', value: 'survey' },
        { label: 'Direct score override (0–96)', value: 'direct' },
      ], 'survey'),
      // Pain (5 items)
      selectInput('w_p1', 'Pain: Walking on flat surface', [
        { label: '0 - None', value: 0 },
        { label: '1 - Mild', value: 1 },
        { label: '2 - Moderate', value: 2 },
        { label: '3 - Severe', value: 3 },
        { label: '4 - Extreme', value: 4 },
      ], 1),
      selectInput('w_p2', 'Pain: Going up or down stairs', [
        { label: '0 - None', value: 0 },
        { label: '1 - Mild', value: 1 },
        { label: '2 - Moderate', value: 2 },
        { label: '3 - Severe', value: 3 },
        { label: '4 - Extreme', value: 4 },
      ], 2),
      selectInput('w_p3', 'Pain: At night while in bed', [
        { label: '0 - None', value: 0 },
        { label: '1 - Mild', value: 1 },
        { label: '2 - Moderate', value: 2 },
        { label: '3 - Severe', value: 3 },
        { label: '4 - Extreme', value: 4 },
      ], 1),
      selectInput('w_p4', 'Pain: Sitting or lying down', [
        { label: '0 - None', value: 0 },
        { label: '1 - Mild', value: 1 },
        { label: '2 - Moderate', value: 2 },
        { label: '3 - Severe', value: 3 },
        { label: '4 - Extreme', value: 4 },
      ], 1),
      selectInput('w_p5', 'Pain: Standing upright', [
        { label: '0 - None', value: 0 },
        { label: '1 - Mild', value: 1 },
        { label: '2 - Moderate', value: 2 },
        { label: '3 - Severe', value: 3 },
        { label: '4 - Extreme', value: 4 },
      ], 2),
      // Stiffness (2 items)
      selectInput('w_s1', 'Stiffness: How severe is stiffness after first awakening in the morning?', [
        { label: '0 - None', value: 0 },
        { label: '1 - Mild', value: 1 },
        { label: '2 - Moderate', value: 2 },
        { label: '3 - Severe', value: 3 },
        { label: '4 - Extreme', value: 4 },
      ], 1),
      selectInput('w_s2', 'Stiffness: How severe is stiffness after sitting, lying or resting later in the day?', [
        { label: '0 - None', value: 0 },
        { label: '1 - Mild', value: 1 },
        { label: '2 - Moderate', value: 2 },
        { label: '3 - Severe', value: 3 },
        { label: '4 - Extreme', value: 4 },
      ], 1),
      // Function (17 items)
      selectInput('w_f1', 'Function: Descending stairs', [
        { label: '0 - None', value: 0 },
        { label: '1 - Mild', value: 1 },
        { label: '2 - Moderate', value: 2 },
        { label: '3 - Severe', value: 3 },
        { label: '4 - Extreme', value: 4 },
      ], 2),
      selectInput('w_f2', 'Function: Ascending stairs', [
        { label: '0 - None', value: 0 },
        { label: '1 - Mild', value: 1 },
        { label: '2 - Moderate', value: 2 },
        { label: '3 - Severe', value: 3 },
        { label: '4 - Extreme', value: 4 },
      ], 2),
      selectInput('w_f3', 'Function: Rising from sitting', [
        { label: '0 - None', value: 0 },
        { label: '1 - Mild', value: 1 },
        { label: '2 - Moderate', value: 2 },
        { label: '3 - Severe', value: 3 },
        { label: '4 - Extreme', value: 4 },
      ], 2),
      selectInput('w_f4', 'Function: Standing', [
        { label: '0 - None', value: 0 },
        { label: '1 - Mild', value: 1 },
        { label: '2 - Moderate', value: 2 },
        { label: '3 - Severe', value: 3 },
        { label: '4 - Extreme', value: 4 },
      ], 1),
      selectInput('w_f5', 'Function: Bending to floor / pick up an object', [
        { label: '0 - None', value: 0 },
        { label: '1 - Mild', value: 1 },
        { label: '2 - Moderate', value: 2 },
        { label: '3 - Severe', value: 3 },
        { label: '4 - Extreme', value: 4 },
      ], 2),
      selectInput('w_f6', 'Function: Walking on flat ground', [
        { label: '0 - None', value: 0 },
        { label: '1 - Mild', value: 1 },
        { label: '2 - Moderate', value: 2 },
        { label: '3 - Severe', value: 3 },
        { label: '4 - Extreme', value: 4 },
      ], 1),
      selectInput('w_f7', 'Function: Getting in or out of a car', [
        { label: '0 - None', value: 0 },
        { label: '1 - Mild', value: 1 },
        { label: '2 - Moderate', value: 2 },
        { label: '3 - Severe', value: 3 },
        { label: '4 - Extreme', value: 4 },
      ], 2),
      selectInput('w_f8', 'Function: Going shopping', [
        { label: '0 - None', value: 0 },
        { label: '1 - Mild', value: 1 },
        { label: '2 - Moderate', value: 2 },
        { label: '3 - Severe', value: 3 },
        { label: '4 - Extreme', value: 4 },
      ], 2),
      selectInput('w_f9', 'Function: Putting on socks / stockings', [
        { label: '0 - None', value: 0 },
        { label: '1 - Mild', value: 1 },
        { label: '2 - Moderate', value: 2 },
        { label: '3 - Severe', value: 3 },
        { label: '4 - Extreme', value: 4 },
      ], 1),
      selectInput('w_f10', 'Function: Rising from bed', [
        { label: '0 - None', value: 0 },
        { label: '1 - Mild', value: 1 },
        { label: '2 - Moderate', value: 2 },
        { label: '3 - Severe', value: 3 },
        { label: '4 - Extreme', value: 4 },
      ], 1),
      selectInput('w_f11', 'Function: Taking off socks / stockings', [
        { label: '0 - None', value: 0 },
        { label: '1 - Mild', value: 1 },
        { label: '2 - Moderate', value: 2 },
        { label: '3 - Severe', value: 3 },
        { label: '4 - Extreme', value: 4 },
      ], 1),
      selectInput('w_f12', 'Function: Lying in bed', [
        { label: '0 - None', value: 0 },
        { label: '1 - Mild', value: 1 },
        { label: '2 - Moderate', value: 2 },
        { label: '3 - Severe', value: 3 },
        { label: '4 - Extreme', value: 4 },
      ], 1),
      selectInput('w_f13', 'Function: Getting in or out of bath', [
        { label: '0 - None', value: 0 },
        { label: '1 - Mild', value: 1 },
        { label: '2 - Moderate', value: 2 },
        { label: '3 - Severe', value: 3 },
        { label: '4 - Extreme', value: 4 },
      ], 2),
      selectInput('w_f14', 'Function: Sitting', [
        { label: '0 - None', value: 0 },
        { label: '1 - Mild', value: 1 },
        { label: '2 - Moderate', value: 2 },
        { label: '3 - Severe', value: 3 },
        { label: '4 - Extreme', value: 4 },
      ], 1),
      selectInput('w_f15', 'Function: Getting on or off toilet', [
        { label: '0 - None', value: 0 },
        { label: '1 - Mild', value: 1 },
        { label: '2 - Moderate', value: 2 },
        { label: '3 - Severe', value: 3 },
        { label: '4 - Extreme', value: 4 },
      ], 1),
      selectInput('w_f16', 'Function: Heavy domestic duties (e.g. moving heavy boxes, scrub floors)', [
        { label: '0 - None', value: 0 },
        { label: '1 - Mild', value: 1 },
        { label: '2 - Moderate', value: 2 },
        { label: '3 - Severe', value: 3 },
        { label: '4 - Extreme', value: 4 },
      ], 3),
      selectInput('w_f17', 'Function: Light domestic duties (e.g. cooking, dusting)', [
        { label: '0 - None', value: 0 },
        { label: '1 - Mild', value: 1 },
        { label: '2 - Moderate', value: 2 },
        { label: '3 - Severe', value: 3 },
        { label: '4 - Extreme', value: 4 },
      ], 1),
      numberInput('total', 'WOMAC total (0–96 Likert override)', {
        min: 0,
        max: 96,
        step: 1,
        defaultValue: 40,
        helpText: 'Used if Direct score override mode is chosen.',
      }),
      numberInput('pain', 'Pain subscale override (optional, 0–20)', {
        min: 0,
        max: 20,
        step: 1,
        defaultValue: 8,
        required: false,
      }),
      numberInput('function', 'Function subscale override (optional, 0–68)', {
        min: 0,
        max: 68,
        step: 1,
        defaultValue: 28,
        required: false,
      }),
    ],
    calculate(values) {
      const mode = String(values.entryMode ?? 'survey');
      let score: number;
      let painScore = 0;
      let stiffScore = 0;
      let funcScore = 0;

      if (mode === 'direct' || (values.total !== undefined && values.entryMode === undefined && values.w_p1 === undefined)) {
        score = round(Math.min(96, Math.max(0, num(values.total, 0))), 0);
        painScore = num(values.pain, NaN);
        funcScore = num(values.function, NaN);
      } else {
        painScore = num(values.w_p1, 0) + num(values.w_p2, 0) + num(values.w_p3, 0) + num(values.w_p4, 0) + num(values.w_p5, 0);
        stiffScore = num(values.w_s1, 0) + num(values.w_s2, 0);
        funcScore =
          num(values.w_f1, 0) + num(values.w_f2, 0) + num(values.w_f3, 0) + num(values.w_f4, 0) +
          num(values.w_f5, 0) + num(values.w_f6, 0) + num(values.w_f7, 0) + num(values.w_f8, 0) +
          num(values.w_f9, 0) + num(values.w_f10, 0) + num(values.w_f11, 0) + num(values.w_f12, 0) +
          num(values.w_f13, 0) + num(values.w_f14, 0) + num(values.w_f15, 0) + num(values.w_f16, 0) +
          num(values.w_f17, 0);
        score = painScore + stiffScore + funcScore;
      }

      const r = riskFromThresholds(score, [
        {
          max: 24,
          level: 'low',
          label: 'Mild symptoms (≤24)',
          interpretation: `WOMAC total ${score}/96: milder OA symptom/function burden. Continue exercise, weight management, PRN analgesia.`,
        },
        {
          max: 48,
          level: 'moderate',
          label: 'Moderate (25–48)',
          interpretation: `WOMAC total ${score}/96: moderate burden — structured PT, optimize non-op OA care, consider injection pathways.`,
        },
        {
          max: 72,
          level: 'high',
          label: 'Moderately severe (49–72)',
          interpretation: `WOMAC total ${score}/96: high symptom load — escalate multimodal care; discuss arthroplasty candidacy if end-stage joints.`,
        },
        {
          max: 96,
          level: 'critical',
          label: 'Severe (>72)',
          interpretation: `WOMAC total ${score}/96: severe OA disability — multidisciplinary support and surgical evaluation when appropriate.`,
        },
      ]);
      const details: { label: string; value: string }[] = [
        { label: 'Direction', value: 'Higher = worse' },
        { label: 'Total Score', value: `${score} / 96 (${round((score / 96) * 100, 1)}%)` },
      ];
      if (Number.isFinite(painScore)) details.push({ label: 'Pain subscale', value: `${painScore} / 20` });
      if (stiffScore > 0 || mode === 'survey') details.push({ label: 'Stiffness subscale', value: `${stiffScore} / 8` });
      if (Number.isFinite(funcScore)) details.push({ label: 'Function subscale', value: `${funcScore} / 68` });
      return { score, unit: '/96', ...r, details };
    },
    evidence: {
      summary:
        'WOMAC Likert total = pain (5) + stiffness (2) + physical function (17), each item 0–4 → total 0–96. Higher scores = worse pain/stiffness/function. VAS versions scale differently.',
      formula: 'Total = pain + stiffness + function (Likert 0–96)',
      validation: 'Bellamy et al.; OMERACT-endorsed hip/knee OA outcome.',
      references: [
        {
          title: 'Validation study of WOMAC',
          citation: 'Bellamy N et al. J Rheumatol. 1988',
          year: 1988,
          pmid: '3068365',
        },
      ],
    },
    nextSteps: [
      { condition: 'Moderate–severe WOMAC', actions: ['Land-based exercise / PT', 'Weight loss if BMI high', 'Ortho review for TKA/THA if refractory'] },
    ],
    pearls: ['Always state Likert vs VAS and whether normalized to 0–100.', 'Function subscale drives most of the total score range.'],
  },

  // ─── 6. IKDC ───────────────────────────────────────────────────────────────
  {
    id: 'ikdc',
    name: 'IKDC Subjective Knee Form (Total)',
    shortName: 'IKDC',
    description: 'Scores and interprets the International Knee Documentation Committee (IKDC) Subjective Knee Evaluation Form (transformed 0–100; higher = better).',
    category: 'orthopedics',
    tags: ['ikdc', 'knee', 'acl', 'sports', 'ortho'],
    whenToUse: 'When evaluating knee symptoms, sports function, and daily activities after knee ligament, meniscus, or cartilage injury.',
    whyUse: 'Standard sports-knee PRO spanning symptoms, sports activity, and function endorsed by AOSSM.',
    inputs: [
      selectInput('entryMode', 'Entry Mode', [
        { label: 'Interactive questionnaire (recommended)', value: 'survey' },
        { label: 'Direct transformed score override (0–100)', value: 'direct' },
      ], 'survey'),
      selectInput('ikdc_q1', '1. Highest level of activity without significant knee pain', [
        { label: '4 - Very strenuous activities like jumping or pivoting as in basketball or soccer', value: 4 },
        { label: '3 - Strenuous activities like heavy physical work, skiing or tennis', value: 3 },
        { label: '2 - Moderate activities like moderate physical work, running or jogging', value: 2 },
        { label: '1 - Light activities like walking, housework or yard work', value: 1 },
        { label: '0 - Unable to perform any of the above activities due to knee pain', value: 0 },
      ], 3),
      selectInput('ikdc_q2', '2. Frequency of knee pain (past 4 weeks)', [
        { label: '10 - Never', value: 10 },
        { label: '8 - Rarely', value: 8 },
        { label: '6 - Sometimes', value: 6 },
        { label: '4 - Frequently', value: 4 },
        { label: '2 - Very frequently', value: 2 },
        { label: '0 - Constantly', value: 0 },
      ], 8),
      selectInput('ikdc_q3', '3. Severity of knee pain (past 4 weeks)', [
        { label: '10 - No pain', value: 10 },
        { label: '8 - Mild pain', value: 8 },
        { label: '6 - Moderate pain', value: 6 },
        { label: '4 - Fairly severe pain', value: 4 },
        { label: '2 - Very severe pain', value: 2 },
        { label: '0 - Worst pain imaginable', value: 0 },
      ], 8),
      selectInput('ikdc_q4', '4. Stiffness / difficulty moving knee', [
        { label: '4 - Not at all stiff', value: 4 },
        { label: '3 - Mildly stiff', value: 3 },
        { label: '2 - Moderately stiff', value: 2 },
        { label: '1 - Very stiff', value: 1 },
        { label: '0 - Extremely stiff', value: 0 },
      ], 3),
      selectInput('ikdc_q5', '5. Swelling in your knee', [
        { label: '4 - Never', value: 4 },
        { label: '3 - Rarely', value: 3 },
        { label: '2 - Sometimes', value: 2 },
        { label: '1 - Frequently', value: 1 },
        { label: '0 - Constantly', value: 0 },
      ], 3),
      selectInput('ikdc_q6', '6. Does your knee lock or catch?', [
        { label: '1 - No', value: 1 },
        { label: '0 - Yes', value: 0 },
      ], 1),
      selectInput('ikdc_q7', '7. Does your knee give way or feel unstable?', [
        { label: '4 - Never gives way', value: 4 },
        { label: '3 - Rarely gives way', value: 3 },
        { label: '2 - Sometimes gives way', value: 2 },
        { label: '1 - Frequently gives way', value: 1 },
        { label: '0 - Constantly gives way', value: 0 },
      ], 3),
      selectInput('ikdc_q8', '8. Highest level of activity without significant swelling', [
        { label: '4 - Very strenuous activities (jumping/pivoting)', value: 4 },
        { label: '3 - Strenuous activities (heavy work, skiing, tennis)', value: 3 },
        { label: '2 - Moderate activities (jogging, moderate work)', value: 2 },
        { label: '1 - Light activities (walking, housework)', value: 1 },
        { label: '0 - Unable due to swelling', value: 0 },
      ], 3),
      selectInput('ikdc_q9', '9. Highest level of activity without knee giving way', [
        { label: '4 - Very strenuous activities (jumping/pivoting)', value: 4 },
        { label: '3 - Strenuous activities (heavy work, skiing, tennis)', value: 3 },
        { label: '2 - Moderate activities (jogging, moderate work)', value: 2 },
        { label: '1 - Light activities (walking, housework)', value: 1 },
        { label: '0 - Unable due to instability', value: 0 },
      ], 3),
      selectInput('ikdc_q10a', '10a. Go up stairs', [
        { label: '4 - Not difficult at all', value: 4 },
        { label: '3 - Minimally difficult', value: 3 },
        { label: '2 - Moderately difficult', value: 2 },
        { label: '1 - Extremely difficult', value: 1 },
        { label: '0 - Unable to do', value: 0 },
      ], 3),
      selectInput('ikdc_q10b', '10b. Go down stairs', [
        { label: '4 - Not difficult at all', value: 4 },
        { label: '3 - Minimally difficult', value: 3 },
        { label: '2 - Moderately difficult', value: 2 },
        { label: '1 - Extremely difficult', value: 1 },
        { label: '0 - Unable to do', value: 0 },
      ], 3),
      selectInput('ikdc_q10c', '10c. Kneel on front of your knee', [
        { label: '4 - Not difficult at all', value: 4 },
        { label: '3 - Minimally difficult', value: 3 },
        { label: '2 - Moderately difficult', value: 2 },
        { label: '1 - Extremely difficult', value: 1 },
        { label: '0 - Unable to do', value: 0 },
      ], 2),
      selectInput('ikdc_q10d', '10d. Squat', [
        { label: '4 - Not difficult at all', value: 4 },
        { label: '3 - Minimally difficult', value: 3 },
        { label: '2 - Moderately difficult', value: 2 },
        { label: '1 - Extremely difficult', value: 1 },
        { label: '0 - Unable to do', value: 0 },
      ], 2),
      selectInput('ikdc_q10e', '10e. Sit with knee bent', [
        { label: '4 - Not difficult at all', value: 4 },
        { label: '3 - Minimally difficult', value: 3 },
        { label: '2 - Moderately difficult', value: 2 },
        { label: '1 - Extremely difficult', value: 1 },
        { label: '0 - Unable to do', value: 0 },
      ], 3),
      selectInput('ikdc_q10f', '10f. Rise from a chair', [
        { label: '4 - Not difficult at all', value: 4 },
        { label: '3 - Minimally difficult', value: 3 },
        { label: '2 - Moderately difficult', value: 2 },
        { label: '1 - Extremely difficult', value: 1 },
        { label: '0 - Unable to do', value: 0 },
      ], 3),
      selectInput('ikdc_q10g', '10g. Run straight ahead', [
        { label: '4 - Not difficult at all', value: 4 },
        { label: '3 - Minimally difficult', value: 3 },
        { label: '2 - Moderately difficult', value: 2 },
        { label: '1 - Extremely difficult', value: 1 },
        { label: '0 - Unable to do', value: 0 },
      ], 2),
      selectInput('ikdc_q10h', '10h. Jump and land on your involved leg', [
        { label: '4 - Not difficult at all', value: 4 },
        { label: '3 - Minimally difficult', value: 3 },
        { label: '2 - Moderately difficult', value: 2 },
        { label: '1 - Extremely difficult', value: 1 },
        { label: '0 - Unable to do', value: 0 },
      ], 2),
      selectInput('ikdc_q10i', '10i. Stop and start quickly', [
        { label: '4 - Not difficult at all', value: 4 },
        { label: '3 - Minimally difficult', value: 3 },
        { label: '2 - Moderately difficult', value: 2 },
        { label: '1 - Extremely difficult', value: 1 },
        { label: '0 - Unable to do', value: 0 },
      ], 2),
      numberInput('total', 'IKDC subjective total override (0–100)', {
        min: 0,
        max: 100,
        step: 0.1,
        defaultValue: 65,
        helpText: 'Transformed score 0–100; higher = better function',
      }),
    ],
    calculate(values) {
      const mode = String(values.entryMode ?? 'survey');
      let score: number;
      let rawScore = 0;
      const maxPossible = 81; // Sum of maxes: 4 + 10 + 10 + 4 + 4 + 1 + 4 + 4 + 4 + (9 * 4) = 45 + 36 = 81

      if (mode === 'direct' || (values.total !== undefined && values.entryMode === undefined && values.ikdc_q1 === undefined)) {
        score = round(clamp01_100(num(values.total, 0)), 1);
      } else {
        const keys = [
          'ikdc_q1', 'ikdc_q2', 'ikdc_q3', 'ikdc_q4', 'ikdc_q5', 'ikdc_q6', 'ikdc_q7',
          'ikdc_q8', 'ikdc_q9', 'ikdc_q10a', 'ikdc_q10b', 'ikdc_q10c', 'ikdc_q10d',
          'ikdc_q10e', 'ikdc_q10f', 'ikdc_q10g', 'ikdc_q10h', 'ikdc_q10i',
        ];
        for (const k of keys) {
          rawScore += num(values[k], 0);
        }
        score = round((rawScore / maxPossible) * 100, 1);
      }

      // Higher is better — invert risk banding
      let riskLevel: 'normal' | 'low' | 'moderate' | 'high' | 'critical' = 'normal';
      let label = '';
      let interpretation = '';
      if (score >= 90) {
        riskLevel = 'normal';
        label = 'Excellent (≥90)';
        interpretation = `IKDC ${score}: excellent subjective knee function — near normal for many active adults.`;
      } else if (score >= 80) {
        riskLevel = 'low';
        label = 'Good (80–89)';
        interpretation = `IKDC ${score}: good function with mild residual symptoms possible.`;
      } else if (score >= 60) {
        riskLevel = 'moderate';
        label = 'Fair (60–79)';
        interpretation = `IKDC ${score}: fair — meaningful limitation for sport/work; continue rehab and address instability/pain drivers.`;
      } else if (score >= 40) {
        riskLevel = 'high';
        label = 'Poor–fair (40–59)';
        interpretation = `IKDC ${score}: substantial knee-related disability; reassess mechanical symptoms and graft/meniscus status if post-op.`;
      } else {
        riskLevel = 'critical';
        label = 'Poor (<40)';
        interpretation = `IKDC ${score}: poor subjective knee status — comprehensive ortho/rehab review.`;
      }
      const details: { label: string; value: string }[] = [
        { label: 'Direction', value: 'Higher = better (0–100 scale)' },
        { label: 'MCID (approx)', value: '~6–16 points (population-dependent)' },
      ];
      if (mode === 'survey' || rawScore > 0) {
        details.unshift({ label: 'Raw score', value: `${rawScore} / ${maxPossible}` });
      }
      return {
        score,
        unit: '/100',
        label,
        interpretation,
        riskLevel,
        details,
      };
    },
    evidence: {
      summary:
        'IKDC Subjective Knee Form transformed to 0–100 (100 = no limitation). Covers symptoms, sports, and daily function; cornerstone ACL/sports knee outcome.',
      formula: 'Transformed IKDC = (Raw Score / Maximum Possible Raw Score) × 100',
      validation: 'Irrgang et al.; widely validated; age/sex normative data available.',
      references: [
        {
          title: 'Development and validation of the IKDC Subjective Knee Form',
          citation: 'Irrgang JJ et al. Am J Sports Med. 2001',
          year: 2001,
          pmid: '11573919',
          doi: '10.1177/03635465010290051301',
        },
      ],
    },
    nextSteps: [
      { condition: 'IKDC <80 post-ACL', actions: ['Progress sport-specific rehab', 'Quadriceps strength testing', 'Return-to-sport battery'] },
    ],
    pearls: ['Compare to age- and sex-matched norms, not only absolute cutoffs.', 'Objective IKDC exam grade is separate from this subjective form.'],
  },

  // ─── 7. EASI eczema ────────────────────────────────────────────────────────
  {
    id: 'easi-eczema',
    name: 'EASI (Eczema Area and Severity Index)',
    shortName: 'EASI',
    description: 'Scores and interprets the Eczema Area and Severity Index (EASI) (0–72) across 4 body regions combining area and 4 clinical signs.',
    category: 'dermatology',
    tags: ['easi', 'eczema', 'atopic dermatitis', 'dermatology', 'severity'],
    whenToUse: 'When evaluating atopic dermatitis severity in clinic or clinical trials.',
    whyUse: 'Core clinician-reported AD severity endpoint in modern dermatology trials and guidelines.',
    inputs: [
      selectInput('entryMode', 'Entry Mode', [
        { label: 'Interactive regional assessment (recommended)', value: 'survey' },
        { label: 'Direct score override (0–72)', value: 'direct' },
      ], 'survey'),
      // Head and neck (0.1)
      selectInput('head_area', 'Head & Neck: Area involvement score', [
        { label: '0 - 0% (no eruption)', value: 0 },
        { label: '1 - 1%–9%', value: 1 },
        { label: '2 - 10%–29%', value: 2 },
        { label: '3 - 30%–49%', value: 3 },
        { label: '4 - 50%–69%', value: 4 },
        { label: '5 - 70%–89%', value: 5 },
        { label: '6 - 90%–100%', value: 6 },
      ], 2),
      selectInput('head_erythema', 'Head & Neck: Erythema (redness)', [
        { label: '0 - None', value: 0 },
        { label: '1 - Mild', value: 1 },
        { label: '2 - Moderate', value: 2 },
        { label: '3 - Severe', value: 3 },
      ], 1),
      selectInput('head_induration', 'Head & Neck: Induration / Papulation (thickness/swelling)', [
        { label: '0 - None', value: 0 },
        { label: '1 - Mild', value: 1 },
        { label: '2 - Moderate', value: 2 },
        { label: '3 - Severe', value: 3 },
      ], 1),
      selectInput('head_excoriation', 'Head & Neck: Excoriation (scratch marks)', [
        { label: '0 - None', value: 0 },
        { label: '1 - Mild', value: 1 },
        { label: '2 - Moderate', value: 2 },
        { label: '3 - Severe', value: 3 },
      ], 1),
      selectInput('head_lichenification', 'Head & Neck: Lichenification (skin thickening/lining)', [
        { label: '0 - None', value: 0 },
        { label: '1 - Mild', value: 1 },
        { label: '2 - Moderate', value: 2 },
        { label: '3 - Severe', value: 3 },
      ], 0),
      // Upper limbs (0.2)
      selectInput('ul_area', 'Upper Limbs: Area involvement score', [
        { label: '0 - 0% (no eruption)', value: 0 },
        { label: '1 - 1%–9%', value: 1 },
        { label: '2 - 10%–29%', value: 2 },
        { label: '3 - 30%–49%', value: 3 },
        { label: '4 - 50%–69%', value: 4 },
        { label: '5 - 70%–89%', value: 5 },
        { label: '6 - 90%–100%', value: 6 },
      ], 2),
      selectInput('ul_erythema', 'Upper Limbs: Erythema', [
        { label: '0 - None', value: 0 },
        { label: '1 - Mild', value: 1 },
        { label: '2 - Moderate', value: 2 },
        { label: '3 - Severe', value: 3 },
      ], 1),
      selectInput('ul_induration', 'Upper Limbs: Induration / Papulation', [
        { label: '0 - None', value: 0 },
        { label: '1 - Mild', value: 1 },
        { label: '2 - Moderate', value: 2 },
        { label: '3 - Severe', value: 3 },
      ], 1),
      selectInput('ul_excoriation', 'Upper Limbs: Excoriation', [
        { label: '0 - None', value: 0 },
        { label: '1 - Mild', value: 1 },
        { label: '2 - Moderate', value: 2 },
        { label: '3 - Severe', value: 3 },
      ], 1),
      selectInput('ul_lichenification', 'Upper Limbs: Lichenification', [
        { label: '0 - None', value: 0 },
        { label: '1 - Mild', value: 1 },
        { label: '2 - Moderate', value: 2 },
        { label: '3 - Severe', value: 3 },
      ], 1),
      // Trunk (0.3)
      selectInput('trunk_area', 'Trunk: Area involvement score', [
        { label: '0 - 0% (no eruption)', value: 0 },
        { label: '1 - 1%–9%', value: 1 },
        { label: '2 - 10%–29%', value: 2 },
        { label: '3 - 30%–49%', value: 3 },
        { label: '4 - 50%–69%', value: 4 },
        { label: '5 - 70%–89%', value: 5 },
        { label: '6 - 90%–100%', value: 6 },
      ], 2),
      selectInput('trunk_erythema', 'Trunk: Erythema', [
        { label: '0 - None', value: 0 },
        { label: '1 - Mild', value: 1 },
        { label: '2 - Moderate', value: 2 },
        { label: '3 - Severe', value: 3 },
      ], 1),
      selectInput('trunk_induration', 'Trunk: Induration / Papulation', [
        { label: '0 - None', value: 0 },
        { label: '1 - Mild', value: 1 },
        { label: '2 - Moderate', value: 2 },
        { label: '3 - Severe', value: 3 },
      ], 1),
      selectInput('trunk_excoriation', 'Trunk: Excoriation', [
        { label: '0 - None', value: 0 },
        { label: '1 - Mild', value: 1 },
        { label: '2 - Moderate', value: 2 },
        { label: '3 - Severe', value: 3 },
      ], 1),
      selectInput('trunk_lichenification', 'Trunk: Lichenification', [
        { label: '0 - None', value: 0 },
        { label: '1 - Mild', value: 1 },
        { label: '2 - Moderate', value: 2 },
        { label: '3 - Severe', value: 3 },
      ], 0),
      // Lower limbs (0.4)
      selectInput('ll_area', 'Lower Limbs: Area involvement score', [
        { label: '0 - 0% (no eruption)', value: 0 },
        { label: '1 - 1%–9%', value: 1 },
        { label: '2 - 10%–29%', value: 2 },
        { label: '3 - 30%–49%', value: 3 },
        { label: '4 - 50%–69%', value: 4 },
        { label: '5 - 70%–89%', value: 5 },
        { label: '6 - 90%–100%', value: 6 },
      ], 2),
      selectInput('ll_erythema', 'Lower Limbs: Erythema', [
        { label: '0 - None', value: 0 },
        { label: '1 - Mild', value: 1 },
        { label: '2 - Moderate', value: 2 },
        { label: '3 - Severe', value: 3 },
      ], 1),
      selectInput('ll_induration', 'Lower Limbs: Induration / Papulation', [
        { label: '0 - None', value: 0 },
        { label: '1 - Mild', value: 1 },
        { label: '2 - Moderate', value: 2 },
        { label: '3 - Severe', value: 3 },
      ], 1),
      selectInput('ll_excoriation', 'Lower Limbs: Excoriation', [
        { label: '0 - None', value: 0 },
        { label: '1 - Mild', value: 1 },
        { label: '2 - Moderate', value: 2 },
        { label: '3 - Severe', value: 3 },
      ], 1),
      selectInput('ll_lichenification', 'Lower Limbs: Lichenification', [
        { label: '0 - None', value: 0 },
        { label: '1 - Mild', value: 1 },
        { label: '2 - Moderate', value: 2 },
        { label: '3 - Severe', value: 3 },
      ], 1),
      numberInput('total', 'Direct EASI total override (0–72)', {
        min: 0,
        max: 72,
        step: 0.1,
        defaultValue: 16,
        helpText: 'Used if Direct score override mode is chosen.',
      }),
    ],
    calculate(values) {
      const mode = String(values.entryMode ?? 'survey');
      let score: number;
      let headSub = 0;
      let ulSub = 0;
      let trunkSub = 0;
      let llSub = 0;

      if (mode === 'direct' || (values.total !== undefined && values.entryMode === undefined && values.head_area === undefined)) {
        score = round(Math.min(72, Math.max(0, num(values.total, 0))), 1);
      } else {
        const hSigns = num(values.head_erythema, 0) + num(values.head_induration, 0) + num(values.head_excoriation, 0) + num(values.head_lichenification, 0);
        headSub = 0.1 * num(values.head_area, 0) * hSigns;

        const ulSigns = num(values.ul_erythema, 0) + num(values.ul_induration, 0) + num(values.ul_excoriation, 0) + num(values.ul_lichenification, 0);
        ulSub = 0.2 * num(values.ul_area, 0) * ulSigns;

        const trSigns = num(values.trunk_erythema, 0) + num(values.trunk_induration, 0) + num(values.trunk_excoriation, 0) + num(values.trunk_lichenification, 0);
        trunkSub = 0.3 * num(values.trunk_area, 0) * trSigns;

        const llSigns = num(values.ll_erythema, 0) + num(values.ll_induration, 0) + num(values.ll_excoriation, 0) + num(values.ll_lichenification, 0);
        llSub = 0.4 * num(values.ll_area, 0) * llSigns;

        score = round(Math.min(72, Math.max(0, headSub + ulSub + trunkSub + llSub)), 1);
      }

      const r = riskFromThresholds(score, [
        {
          max: 1,
          level: 'normal',
          label: 'Clear (0–1)',
          interpretation: `EASI ${score}: clear / almost clear range — maintain proactive skincare and trigger control.`,
        },
        {
          max: 7,
          level: 'low',
          label: 'Mild (1.1–7)',
          interpretation: `EASI ${score}: mild AD — optimize emollients, anti-inflammatories as needed; education on flares.`,
        },
        {
          max: 21,
          level: 'moderate',
          label: 'Moderate (7.1–21)',
          interpretation: `EASI ${score}: moderate AD — consider phototherapy or systemic/advanced therapy pathways if QoL impacted.`,
        },
        {
          max: 50,
          level: 'high',
          label: 'Severe (21.1–50)',
          interpretation: `EASI ${score}: severe AD — dermatology specialty care; systemic/biologic candidacy common.`,
        },
        {
          max: 72,
          level: 'critical',
          label: 'Very severe (>50)',
          interpretation: `EASI ${score}: very severe AD — urgent specialty management; infection and erythroderma precautions.`,
        },
      ]);
      const details: { label: string; value: string }[] = [
        { label: 'EASI-50 / EASI-75', value: '≥50% / ≥75% improvement from baseline (trial endpoints)' },
        { label: 'Regions', value: 'Head/neck (0.1), Upper limbs (0.2), Trunk (0.3), Lower limbs (0.4)' },
      ];
      if (mode === 'survey' || headSub > 0 || ulSub > 0 || trunkSub > 0 || llSub > 0) {
        details.push(
          { label: 'Head & Neck score', value: `${round(headSub, 1)}` },
          { label: 'Upper Limbs score', value: `${round(ulSub, 1)}` },
          { label: 'Trunk score', value: `${round(trunkSub, 1)}` },
          { label: 'Lower Limbs score', value: `${round(llSub, 1)}` },
        );
      }
      return {
        score,
        unit: '0–72',
        ...r,
        details,
      };
    },
    evidence: {
      summary:
        'EASI combines erythema, edema/papulation, excoriation, and lichenification with body-region area scores (total 0–72). Severity bands (clear/mild/moderate/severe/very severe) are widely used educationally (e.g., Leshem et al.).',
      formula: 'EASI = 0.1(H) + 0.2(UL) + 0.3(T) + 0.4(LL), where each region = Area × (E + I + Ex + L)',
      validation: 'Validated clinician AD score; primary endpoint family in AD RCTs.',
      references: [
        {
          title: 'The eczema area and severity index (EASI): assessment of reliability in atopic dermatitis',
          citation: 'Hanifin JM et al. Exp Dermatol. 2001;10:11-18',
          year: 2001,
          pmid: '11168575',
          doi: '10.1034/j.1600-0625.2001.100102.x',
        },
      ],
    },
    nextSteps: [
      { condition: 'EASI >7 with impact', actions: ['Dermatology referral', 'Infection screen if crusting/fever', 'Shared decision on advanced therapies'] },
    ],
    pearls: ['Pair with POEM or DLQI for patient-reported burden.', 'BSA and IGA are complementary, not identical to EASI.'],
  },

  // ─── 8. SCORAD eczema ──────────────────────────────────────────────────────
  {
    id: 'scorad-eczema',
    name: 'SCORAD (Atopic Dermatitis)',
    shortName: 'SCORAD',
    description: 'Scores and interprets the SCORing Atopic Dermatitis (SCORAD) index (0–103) across Extent (A), Intensity (B), and Subjective symptoms (C).',
    category: 'dermatology',
    tags: ['scorad', 'eczema', 'atopic dermatitis', 'dermatology'],
    whenToUse: 'When evaluating atopic dermatitis severity including clinical extent, intensity, and subjective pruritus/sleep loss.',
    whyUse: 'Classic European composite AD severity score combining objective signs and patient symptoms.',
    inputs: [
      selectInput('entryMode', 'Entry Mode', [
        { label: 'Interactive components assessment (recommended)', value: 'survey' },
        { label: 'Direct SCORAD total override (0–103)', value: 'direct' },
      ], 'survey'),
      numberInput('extent_a', 'Part A: Extent (Body Surface Area % affected)', {
        min: 0,
        max: 100,
        step: 1,
        defaultValue: 25,
        unit: '%',
        helpText: 'Estimated using the rule of nines (0–100%).',
      }),
      selectInput('int_erythema', 'Part B: Erythema (redness)', [
        { label: '0 - None', value: 0 },
        { label: '1 - Mild', value: 1 },
        { label: '2 - Moderate', value: 2 },
        { label: '3 - Severe', value: 3 },
      ], 1),
      selectInput('int_edema', 'Part B: Edema / Papulation (swelling)', [
        { label: '0 - None', value: 0 },
        { label: '1 - Mild', value: 1 },
        { label: '2 - Moderate', value: 2 },
        { label: '3 - Severe', value: 3 },
      ], 1),
      selectInput('int_oozing', 'Part B: Oozing / Crusting', [
        { label: '0 - None', value: 0 },
        { label: '1 - Mild', value: 1 },
        { label: '2 - Moderate', value: 2 },
        { label: '3 - Severe', value: 3 },
      ], 1),
      selectInput('int_excoriation', 'Part B: Excoriation (scratch marks)', [
        { label: '0 - None', value: 0 },
        { label: '1 - Mild', value: 1 },
        { label: '2 - Moderate', value: 2 },
        { label: '3 - Severe', value: 3 },
      ], 1),
      selectInput('int_lichenification', 'Part B: Lichenification (skin thickening)', [
        { label: '0 - None', value: 0 },
        { label: '1 - Mild', value: 1 },
        { label: '2 - Moderate', value: 2 },
        { label: '3 - Severe', value: 3 },
      ], 1),
      selectInput('int_dryness', 'Part B: Dryness / Xerosis (non-lesional skin)', [
        { label: '0 - None', value: 0 },
        { label: '1 - Mild', value: 1 },
        { label: '2 - Moderate', value: 2 },
        { label: '3 - Severe', value: 3 },
      ], 1),
      numberInput('subj_pruritus', 'Part C: Pruritus VAS (0–10)', {
        min: 0,
        max: 10,
        step: 0.5,
        defaultValue: 5,
        helpText: 'Visual analog scale average of last 3 days (0 = no itch, 10 = worst imaginable).',
      }),
      numberInput('subj_sleep', 'Part C: Sleep loss VAS (0–10)', {
        min: 0,
        max: 10,
        step: 0.5,
        defaultValue: 3,
        helpText: 'Visual analog scale average of last 3 nights (0 = no sleep loss, 10 = complete sleeplessness).',
      }),
      numberInput('total', 'Direct SCORAD total override (0–103)', {
        min: 0,
        max: 103,
        step: 0.1,
        defaultValue: 35,
        helpText: 'Used if Direct score override mode is selected.',
      }),
    ],
    calculate(values) {
      const mode = String(values.entryMode ?? 'survey');
      let score: number;
      let partA = 0;
      let partB = 0;
      let partC = 0;
      let objScorad = 0;

      if (mode === 'direct' || (values.total !== undefined && values.entryMode === undefined && values.extent_a === undefined)) {
        score = round(Math.min(103, Math.max(0, num(values.total, 0))), 1);
      } else {
        partA = Math.min(100, Math.max(0, num(values.extent_a, 0)));
        partB =
          num(values.int_erythema, 0) +
          num(values.int_edema, 0) +
          num(values.int_oozing, 0) +
          num(values.int_excoriation, 0) +
          num(values.int_lichenification, 0) +
          num(values.int_dryness, 0);
        partC =
          Math.min(10, Math.max(0, num(values.subj_pruritus, 0))) +
          Math.min(10, Math.max(0, num(values.subj_sleep, 0)));

        objScorad = round(partA / 5 + (7 * partB) / 2, 1);
        score = round(Math.min(103, Math.max(0, objScorad + partC)), 1);
      }

      const r = riskFromThresholds(score, [
        {
          max: 25,
          level: 'low',
          label: 'Mild (<25)',
          interpretation: `SCORAD ${score}: mild AD band — topical regimen optimization and education.`,
        },
        {
          max: 50,
          level: 'moderate',
          label: 'Moderate (25–50)',
          interpretation: `SCORAD ${score}: moderate AD — consider specialty care if refractory; address itch/sleep components.`,
        },
        {
          max: 103,
          level: 'high',
          label: 'Severe (>50)',
          interpretation: `SCORAD ${score}: severe AD — specialty management; evaluate systemic/advanced options and complications.`,
        },
      ]);
      const details: { label: string; value: string }[] = [
        { label: 'Components', value: 'A extent (BSA), B intensity (6 signs), C pruritus + sleep (VAS)' },
      ];
      if (mode === 'survey' || partA > 0 || partB > 0 || partC > 0) {
        details.unshift(
          { label: 'Part A (Extent / BSA)', value: `${partA}%` },
          { label: 'Part B (Intensity sum)', value: `${partB} / 18` },
          { label: 'Part C (Subjective symptoms)', value: `${partC} / 20` },
          { label: 'Objective SCORAD (A/5 + 7B/2)', value: `${objScorad} / 83` },
        );
      } else {
        details.push({ label: 'Objective SCORAD', value: 'Excludes subjective C (max 83)' });
      }

      return {
        score,
        unit: '0–103',
        ...r,
        details,
      };
    },
    evidence: {
      summary:
        'SCORAD = A/5 + 7B/2 + C where A = extent (0–100), B = intensity sum (0–18), C = pruritus + sleep loss (0–20). Mild <25, moderate 25–50, severe >50 commonly cited.',
      formula: 'SCORAD = A/5 + 7B/2 + C',
      validation: 'European Task Force on Atopic Dermatitis; longstanding clinical/research tool.',
      references: [
        {
          title: 'Severity scoring of atopic dermatitis: the SCORAD index',
          citation: 'Consensus Report of the European Task Force on Atopic Dermatitis. Dermatology. 1993',
          year: 1993,
          pmid: '8435513',
          doi: '10.1159/000247298',
        },
      ],
    },
    nextSteps: [
      { condition: 'SCORAD >50', actions: ['Dermatology', 'Rule out superinfection', 'Consider phototherapy/systemics'] },
    ],
    pearls: ['Objective SCORAD drops subjective symptoms — know which version trials used.', 'Itch/sleep can inflate SCORAD relative to pure lesion scores.'],
  },

  // ─── 9. IOP glaucoma bands ─────────────────────────────────────────────────
  {
    id: 'iop-glaucoma',
    name: 'IOP Interpretation Bands',
    shortName: 'IOP',
    description: 'Educational intraocular pressure bands for glaucoma risk context (not a diagnosis tool).',
    category: 'ophthalmology',
    tags: ['iop', 'glaucoma', 'ophthalmology', 'eye pressure', 'tonometry'],
    whenToUse: 'Quick interpretation of measured IOP in mmHg alongside optic nerve and field assessment.',
    whyUse: 'IOP is a major modifiable glaucoma risk factor; absolute cutoffs never replace full exam.',
    inputs: [
      numberInput('iop', 'Intraocular pressure', {
        unit: 'mmHg',
        min: 1,
        max: 80,
        step: 0.5,
        defaultValue: 18,
        helpText: 'Goldmann applanation is the usual reference; note device (iCare, NCT, Tono-Pen) and CCT. Measure sitting, undilated when possible. Do not diagnose glaucoma from IOP alone.',
      }),
      selectInput('context', 'Clinical context', [
        { label: 'Screening / no known glaucoma', value: 'screen', description: 'No established glaucoma or OHT — interpret vs population ~10–21 mmHg and optic-nerve/field exam' },
        { label: 'Known glaucoma / ocular hypertension', value: 'glaucoma', description: 'Compare to the patient’s individualized target IOP, not a universal 21 mmHg cut' },
        { label: 'Post-op / acute symptoms', value: 'acute', description: 'Pain, halos, nausea, mid-dilated pupil, or recent intraocular surgery — emergency pathway if IOP is high' },
      ], undefined, 'Absolute IOP never replaces disc, RNFL, fields, and angles. Acute symptoms with high IOP = emergency ophthalmology.'),
    ],
    calculate(values) {
      const iop = round(num(values.iop, 18), 1);
      const ctx = String(values.context ?? 'screen');
      let r: { riskLevel: 'normal' | 'low' | 'moderate' | 'high' | 'critical'; label: string; interpretation: string };
      if (iop < 6) {
        r = {
          riskLevel: 'high',
          label: 'Hypotony range (<6 mmHg)',
          interpretation: `IOP ${iop} mmHg: hypotony range — risk of maculopathy/choroidal issues; urgent ophthalmology if post-op or symptomatic.`,
        };
      } else if (iop <= 21) {
        r = {
          riskLevel: 'normal',
          label: 'Statistically normal band (≤21 mmHg)',
          interpretation: `IOP ${iop} mmHg: within common “normal” population range (≈10–21). Does not exclude glaucoma (normal-tension) or confirm safety — optic nerve/fields decide.`,
        };
      } else if (iop <= 24) {
        r = {
          riskLevel: 'moderate',
          label: 'Borderline elevated (22–24)',
          interpretation: `IOP ${iop} mmHg: mildly elevated vs classic 21 cut — correlate CCT, disc, RNFL/fields; ocular hypertension workup if new.`,
        };
      } else if (iop <= 30) {
        r = {
          riskLevel: 'high',
          label: 'Elevated (25–30)',
          interpretation: `IOP ${iop} mmHg: elevated — ophthalmology evaluation for glaucoma/OHT; treat per target IOP if known disease.`,
        };
      } else if (iop <= 40) {
        r = {
          riskLevel: 'critical',
          label: 'Markedly elevated (31–40)',
          interpretation: `IOP ${iop} mmHg: markedly high — prompt ophthalmology; assess for acute angle closure symptoms (pain, halos, nausea, mid-dilated pupil).`,
        };
      } else {
        r = {
          riskLevel: 'critical',
          label: 'Dangerously high (>40)',
          interpretation: `IOP ${iop} mmHg: extreme elevation — emergency ophthalmology pathway; acute angle-closure or other acute glaucoma crisis until proven otherwise.`,
        };
      }
      if (ctx === 'acute' && iop >= 30) {
        r = {
          ...r,
          riskLevel: 'critical',
          interpretation: `${r.interpretation} Acute-care context: prioritize vision-threatening causes and urgent pressure lowering per ophthalmology.`,
        };
      }
      return {
        score: iop,
        unit: 'mmHg',
        ...r,
        details: [
          { label: 'Typical reference', value: '~10–21 mmHg (method/CCT dependent)' },
          { label: 'Context', value: ctx },
        ],
        recommendations: [
          'Target IOP is individualized — not a universal number.',
          'Goldmann applanation remains a clinical reference standard; note device used.',
        ],
      };
    },
    evidence: {
      summary:
        'Population IOP often ≈10–21 mmHg; glaucoma risk rises with IOP but normal-tension glaucoma exists. Acute very high IOP with symptoms is an emergency. CCT and measurement method affect readings.',
      formula: 'Measured IOP (mmHg) with educational bands',
      validation: 'Educational bands only — diagnosis requires disc, RNFL, fields, angles, and risk factors.',
      references: [
        {
          title: 'Primary Open-Angle Glaucoma Preferred Practice Pattern',
          citation: 'Gedde SJ et al. Ophthalmology. 2021;128:P71-P150 (AAO PPP)',
          year: 2021,
          pmid: '34933745',
          doi: '10.1016/j.ophtha.2020.10.022',
          url: 'https://www.aao.org/education/preferred-practice-pattern/primary-open-angle-glaucoma-ppp',
        },
      ],
    },
    nextSteps: [
      { condition: 'IOP >21 new', actions: ['Ophthalmology referral', 'Document disc/cup', 'Avoid relying on IOP alone'] },
      { condition: 'IOP >40 or acute symptoms', actions: ['Emergency eye care', 'Check for angle closure', 'Do not dilate if angle closure suspected'] },
    ],
    pearls: [
      'Steroid response can raise IOP days–weeks after topical/systemic steroids.',
      'Central corneal thickness: thin CCT underestimates true IOP risk.',
    ],
  },

  // ─── 10. Snellen to LogMAR ─────────────────────────────────────────────────
  {
    id: 'snellen-logmar',
    name: 'Snellen to LogMAR',
    shortName: 'LogMAR',
    description: 'Converts Snellen acuity fraction (or decimal) to LogMAR for research-style vision scoring.',
    category: 'ophthalmology',
    tags: ['snellen', 'logmar', 'visual acuity', 'ophthalmology', 'optometry'],
    whenToUse: 'When reporting or comparing visual acuity on a logarithmic scale (trials, low vision, research).',
    whyUse: 'LogMAR is linear for change analysis; Snellen steps are unequal.',
    inputs: [
      selectInput(
        'mode',
        'Input type',
        [
          { label: 'Snellen fraction (e.g., 20/40)', value: 'fraction' },
          { label: 'Decimal acuity (e.g., 0.5)', value: 'decimal' },
        ],
        'fraction'
      ),
      numberInput('dist', 'Snellen numerator (test distance)', {
        min: 1,
        max: 20,
        defaultValue: 20,
        helpText: 'Feet: usually 20; meters: often 6',
      }),
      numberInput('line', 'Snellen denominator (letter size line)', {
        min: 6,
        max: 400,
        defaultValue: 40,
        helpText: 'e.g., 40 for 20/40; 6 for 6/6 metric',
      }),
      numberInput('decimal', 'Decimal acuity (if selected)', {
        min: 0.01,
        max: 2,
        step: 0.01,
        defaultValue: 0.5,
        helpText: 'Decimal = numerator/denominator (20/40 → 0.5)',
      }),
    ],
    calculate(values) {
      const mode = String(values.mode ?? 'fraction');
      let decimal = num(values.decimal, 0.5);
      if (mode === 'fraction') {
        const dist = num(values.dist, 20);
        const line = num(values.line, 40);
        if (line <= 0 || dist <= 0) {
          return {
            score: '—',
            label: 'Invalid Snellen',
            interpretation: 'Distance and line size must be positive.',
            riskLevel: 'info',
          };
        }
        decimal = dist / line;
      }
      if (decimal <= 0) {
        return {
          score: '—',
          label: 'Invalid acuity',
          interpretation: 'Decimal acuity must be > 0.',
          riskLevel: 'info',
        };
      }
      const logmar = round(-Math.log10(decimal), 2);
      let label = 'Intermediate acuity';
      let riskLevel: 'normal' | 'low' | 'moderate' | 'high' | 'critical' = 'moderate';
      if (logmar <= 0) {
        label = 'Normal / better than 20/20 (LogMAR ≤0)';
        riskLevel = 'normal';
      } else if (logmar <= 0.3) {
        // 20/40
        label = 'Near-normal to mild reduction (≤0.3)';
        riskLevel = 'low';
      } else if (logmar <= 0.5) {
        label = 'Moderate reduction (≈20/63)';
        riskLevel = 'moderate';
      } else if (logmar <= 1.0) {
        label = 'Severe reduction (to ≈20/200)';
        riskLevel = 'high';
      } else {
        label = 'Profound / near-blindness range (>1.0)';
        riskLevel = 'critical';
      }
      const snellenApprox = decimal >= 1 ? `≈ ${round(20, 0)}/${round(20 / decimal, 0)}` : `≈ 20/${round(20 / decimal, 0)}`;
      return {
        score: logmar,
        unit: 'LogMAR',
        label,
        interpretation: `LogMAR ${logmar} (decimal ${round(decimal, 3)}; Snellen-ish ${snellenApprox}). Input mode: ${mode === 'fraction' ? 'Snellen fraction' : 'decimal acuity'}. Lower LogMAR = better acuity. Each 0.1 LogMAR ≈ one ETDRS line.`,
        riskLevel,
        details: [
          { label: 'Input mode', value: mode === 'fraction' ? 'Snellen fraction' : 'Decimal acuity' },
          { label: 'Decimal acuity', value: String(round(decimal, 3)) },
          { label: '0.0 LogMAR', value: '20/20 (1.0 decimal)' },
          { label: '1.0 LogMAR', value: '20/200 (0.1 decimal)' },
        ],
      };
    },
    evidence: {
      summary: 'LogMAR = −log₁₀(decimal acuity). Decimal = Snellen numerator/denominator. 0.0 = 20/20; positive LogMAR = worse than 20/20.',
      formula: 'LogMAR = −log10(distance / letter_size) = −log10(decimal)',
      validation: 'Standard conversion used in vision science and ETDRS chart scoring.',
      references: [
        {
          title: 'New design principles for visual acuity letter charts',
          citation: 'Bailey IL, Lovie JE. Am J Optom Physiol Opt. 1976',
          year: 1976,
          pmid: '998716',
          doi: '10.1097/00006324-197611000-00006',
        },
      ],
    },
    nextSteps: [
      { condition: 'LogMAR ≥0.5 in better eye', actions: ['Low-vision / ophtho assessment', 'Driving standards review by jurisdiction'] },
    ],
    pearls: [
      'Counting fingers / hand motion / LP need special LogMAR assignments — not simple fractions.',
      'Always specify correction (sc/cc) and eye tested.',
    ],
  },

  // ─── 11. VHI-10 ────────────────────────────────────────────────────────────
  {
    id: 'vhi-10',
    name: 'Voice Handicap Index-10',
    shortName: 'VHI-10',
    description: 'Scores and interprets the Voice Handicap Index-10 (0–40) across 10 functional, physical, and emotional voice-related items.',
    category: 'otolaryngology',
    tags: ['vhi-10', 'voice', 'dysphonia', 'ent', 'laryngology'],
    whenToUse: 'When evaluating patient-perceived voice handicap for dysphonia, vocal cord pathology, or post-laryngeal treatment follow-up.',
    whyUse: 'Brief, validated voice-related quality-of-life measure widely used in ENT and speech therapy clinics.',
    inputs: [
      selectInput('entryMode', 'Entry Mode', [
        { label: 'Interactive 10-item survey (recommended)', value: 'survey' },
        { label: 'Direct score override (0–40)', value: 'direct' },
      ], 'survey'),
      selectInput('vhi_q1', '1. My voice makes it difficult for people to hear me', [
        { label: '0 - Never', value: 0 },
        { label: '1 - Almost never', value: 1 },
        { label: '2 - Sometimes', value: 2 },
        { label: '3 - Almost always', value: 3 },
        { label: '4 - Always', value: 4 },
      ], 1),
      selectInput('vhi_q2', '2. People have difficulty understanding me in a noisy room', [
        { label: '0 - Never', value: 0 },
        { label: '1 - Almost never', value: 1 },
        { label: '2 - Sometimes', value: 2 },
        { label: '3 - Almost always', value: 3 },
        { label: '4 - Always', value: 4 },
      ], 2),
      selectInput('vhi_q3', '3. My voice difficulties restrict my personal and social life', [
        { label: '0 - Never', value: 0 },
        { label: '1 - Almost never', value: 1 },
        { label: '2 - Sometimes', value: 2 },
        { label: '3 - Almost always', value: 3 },
        { label: '4 - Always', value: 4 },
      ], 1),
      selectInput('vhi_q4', '4. I feel left out of conversations because of my voice', [
        { label: '0 - Never', value: 0 },
        { label: '1 - Almost never', value: 1 },
        { label: '2 - Sometimes', value: 2 },
        { label: '3 - Almost always', value: 3 },
        { label: '4 - Always', value: 4 },
      ], 1),
      selectInput('vhi_q5', '5. My voice problem causes me to lose income', [
        { label: '0 - Never', value: 0 },
        { label: '1 - Almost never', value: 1 },
        { label: '2 - Sometimes', value: 2 },
        { label: '3 - Almost always', value: 3 },
        { label: '4 - Always', value: 4 },
      ], 0),
      selectInput('vhi_q6', '6. I feel as though I have to strain to produce voice', [
        { label: '0 - Never', value: 0 },
        { label: '1 - Almost never', value: 1 },
        { label: '2 - Sometimes', value: 2 },
        { label: '3 - Almost always', value: 3 },
        { label: '4 - Always', value: 4 },
      ], 2),
      selectInput('vhi_q7', '7. The clarity of my voice is unpredictable', [
        { label: '0 - Never', value: 0 },
        { label: '1 - Almost never', value: 1 },
        { label: '2 - Sometimes', value: 2 },
        { label: '3 - Almost always', value: 3 },
        { label: '4 - Always', value: 4 },
      ], 2),
      selectInput('vhi_q8', '8. My voice problem upsets me', [
        { label: '0 - Never', value: 0 },
        { label: '1 - Almost never', value: 1 },
        { label: '2 - Sometimes', value: 2 },
        { label: '3 - Almost always', value: 3 },
        { label: '4 - Always', value: 4 },
      ], 1),
      selectInput('vhi_q9', '9. My voice makes me feel handicapped', [
        { label: '0 - Never', value: 0 },
        { label: '1 - Almost never', value: 1 },
        { label: '2 - Sometimes', value: 2 },
        { label: '3 - Almost always', value: 3 },
        { label: '4 - Always', value: 4 },
      ], 1),
      selectInput('vhi_q10', '10. People ask, "What is wrong with your voice?"', [
        { label: '0 - Never', value: 0 },
        { label: '1 - Almost never', value: 1 },
        { label: '2 - Sometimes', value: 2 },
        { label: '3 - Almost always', value: 3 },
        { label: '4 - Always', value: 4 },
      ], 1),
      numberInput('total', 'Direct VHI-10 total override (0–40)', {
        min: 0,
        max: 40,
        step: 1,
        defaultValue: 12,
        helpText: 'Used if Direct score override mode is selected.',
      }),
    ],
    calculate(values) {
      const mode = String(values.entryMode ?? 'survey');
      let score: number;

      if (mode === 'direct' || (values.total !== undefined && values.entryMode === undefined && values.vhi_q1 === undefined)) {
        score = Math.round(Math.min(40, Math.max(0, num(values.total, 0))));
      } else {
        score =
          num(values.vhi_q1, 0) +
          num(values.vhi_q2, 0) +
          num(values.vhi_q3, 0) +
          num(values.vhi_q4, 0) +
          num(values.vhi_q5, 0) +
          num(values.vhi_q6, 0) +
          num(values.vhi_q7, 0) +
          num(values.vhi_q8, 0) +
          num(values.vhi_q9, 0) +
          num(values.vhi_q10, 0);
      }

      // Normative mean ~2–3; >11 often abnormal (Arffa et al.)
      const r = riskFromThresholds(score, [
        {
          max: 10,
          level: 'low',
          label: 'Within / near normative (≤10)',
          interpretation: `VHI-10 ${score}/40: at or near many normative thresholds (cutoff often ≥11 abnormal). Still interpret with patient goals (professional voice users may care at lower scores).`,
        },
        {
          max: 20,
          level: 'moderate',
          label: 'Mild–moderate handicap (11–20)',
          interpretation: `VHI-10 ${score}/40: elevated voice handicap — laryngology/speech-language pathology evaluation as indicated.`,
        },
        {
          max: 30,
          level: 'high',
          label: 'Moderate–severe (21–30)',
          interpretation: `VHI-10 ${score}/40: substantial voice-related handicap — structured voice therapy and ENT workup.`,
        },
        {
          max: 40,
          level: 'critical',
          label: 'Severe (31–40)',
          interpretation: `VHI-10 ${score}/40: severe perceived handicap — multidisciplinary voice care.`,
        },
      ]);
      return {
        score,
        unit: '/40',
        ...r,
        details: [
          { label: 'Item scale', value: '0 never – 4 always (10 items)' },
          { label: 'Common abnormal cutoff', value: '≥11 (population-dependent)' },
          { label: 'MCID (approx)', value: '≥4 to 6 points' },
        ],
      };
    },
    evidence: {
      summary:
        'VHI-10 sums 10 voice handicap items (0–4 each; total 0–40). Higher = greater perceived handicap. Normative studies often flag ≥11 as abnormal.',
      formula: 'Total = sum of 10 items (0–40)',
      validation: 'Rosen et al. short form of original VHI; widely used in laryngology.',
      references: [
        {
          title: 'Development and validation of the Voice Handicap Index-10',
          citation: 'Rosen CA et al. Laryngoscope. 2004',
          year: 2004,
          pmid: '15475780',
          doi: '10.1097/00005537-200409000-00009',
        },
      ],
    },
    nextSteps: [
      { condition: 'VHI-10 ≥11', actions: ['Laryngoscopy if persistent dysphonia >2–4 wk', 'Voice therapy referral', 'Review reflux/irritants/voice use'] },
    ],
    pearls: ['Professional voice users may need intervention below population cutoffs.', 'VHI-10 is patient-reported — not a substitute for stroboscopy.'],
  },

  // ─── 12. Pure-tone average ─────────────────────────────────────────────────
  {
    id: 'pure-tone-average',
    name: 'Pure-Tone Average (PTA)',
    shortName: 'PTA',
    description: 'Calculates pure-tone average from audiometric thresholds and maps hearing-loss severity.',
    category: 'otolaryngology',
    tags: ['pta', 'audiology', 'hearing', 'pure tone', 'ent'],
    whenToUse: 'From air-conduction thresholds to summarize hearing level (commonly 0.5, 1, 2 kHz ± 4 kHz).',
    whyUse: 'Standard single-number summary for hearing loss degree and disability discussions.',
    inputs: [
      selectInput('method', 'PTA method', [
          { label: '3-frequency (0.5, 1, 2 kHz)', value: '3', description: 'Classic PTA: average of 500, 1000, and 2000 Hz air-conduction thresholds (speech-frequency)' },
          { label: '4-frequency (0.5, 1, 2, 4 kHz)', value: '4', description: 'Includes 4000 Hz (high-frequency / noise-notch relevant). Used by some disability and WHO summaries' },
        ],
        '3',
        'Air-conduction dB HL from the audiogram. 3-frequency is the traditional speech PTA; 4-frequency includes 4 kHz.',
      ),
      numberInput('f500', '500 Hz threshold', { unit: 'dB HL', min: -10, max: 120, step: 5, defaultValue: 20, helpText: 'Air-conduction threshold in dB HL from the audiogram (not bone conduction).' }),
      numberInput('f1000', '1000 Hz threshold', { unit: 'dB HL', min: -10, max: 120, step: 5, defaultValue: 25 }),
      numberInput('f2000', '2000 Hz threshold', { unit: 'dB HL', min: -10, max: 120, step: 5, defaultValue: 30 }),
      numberInput('f4000', '4000 Hz threshold', {
        unit: 'dB HL',
        min: -10,
        max: 120,
        step: 5,
        defaultValue: 35,
        helpText: 'Used only for 4-frequency PTA',
      }),
    ],
    calculate(values) {
      const method = String(values.method ?? '3');
      const a = num(values.f500, 20);
      const b = num(values.f1000, 25);
      const c = num(values.f2000, 30);
      const d = num(values.f4000, 35);
      const pta = method === '4' ? round((a + b + c + d) / 4, 1) : round((a + b + c) / 3, 1);
      const r = riskFromThresholds(pta, [
        {
          max: 25,
          level: 'normal',
          label: 'Normal (≤25 dB HL)',
          interpretation: `PTA ${pta} dB HL: normal hearing range by common WHO/clinical adult bands (pediatric norms stricter).`,
        },
        {
          max: 40,
          level: 'low',
          label: 'Mild (26–40)',
          interpretation: `PTA ${pta} dB HL: mild hearing loss — difficulty with soft speech/noise; consider amplification counseling.`,
        },
        {
          max: 55,
          level: 'moderate',
          label: 'Moderate (41–55)',
          interpretation: `PTA ${pta} dB HL: moderate loss — conversational speech often difficult without hearing aids.`,
        },
        {
          max: 70,
          level: 'high',
          label: 'Moderately severe (56–70)',
          interpretation: `PTA ${pta} dB HL: moderately severe — amplification strongly indicated; communication strategies.`,
        },
        {
          max: 90,
          level: 'critical',
          label: 'Severe (71–90)',
          interpretation: `PTA ${pta} dB HL: severe loss — hearing aids/CI evaluation pathways; safety and accessibility planning.`,
        },
        {
          max: 200,
          level: 'critical',
          label: 'Profound (>90)',
          interpretation: `PTA ${pta} dB HL: profound loss — cochlear implant candidacy evaluation often appropriate.`,
        },
      ]);
      return {
        score: pta,
        unit: 'dB HL',
        ...r,
        details: [
          { label: 'Method', value: method === '4' ? '4-frequency (0.5–4 kHz)' : '3-frequency (0.5–2 kHz)' },
          { label: 'Thresholds', value: method === '4' ? `${a}, ${b}, ${c}, ${d} dB` : `${a}, ${b}, ${c} dB` },
        ],
      };
    },
    evidence: {
      summary:
        'PTA averages pure-tone air-conduction thresholds at specified frequencies. Common adult degree bands: ≤25 normal, 26–40 mild, 41–55 moderate, 56–70 moderately severe, 71–90 severe, >90 profound (definitions vary slightly by organization).',
      formula: 'PTA₃ = (0.5+1+2 kHz)/3; PTA₄ = (0.5+1+2+4 kHz)/4',
      validation: 'Clark/ASHA adult degree bands (this implementation). WHO grades differ (no separate moderately-severe band).',
      references: [
        {
          title: 'Uses and abuses of hearing loss classification',
          citation: 'Clark JG. ASHA. 1981;23:493-500 (mild 26–40, moderate 41–55, moderately severe 56–70, severe 71–90, profound ≥91 dB HL)',
          year: 1981,
          pmid: '7052898',
        },
      ],
    },
    nextSteps: [
      { condition: 'PTA >25 dB', actions: ['Full audiology workup if not done', 'Hearing aid trial counseling', 'MRI if asymmetric SNHL per guidelines'] },
    ],
    pearls: [
      'Asymmetry and word-recognition scores matter as much as PTA.',
      'Bone conduction needed to separate conductive vs sensorineural loss.',
    ],
  },

  // ─── 13. Berlin Questionnaire ──────────────────────────────────────────────
  {
    id: 'berlin-sleep',
    name: 'Berlin Questionnaire (Sleep Apnea Screen)',
    shortName: 'Berlin',
    description: 'Berlin Questionnaire OSA risk: Category 1 (snoring), Category 2 (sleepiness), Category 3 (HTN/BMI).',
    category: 'pulmonary',
    tags: ['berlin', 'osa', 'sleep apnea', 'screening', 'sleep'],
    whenToUse: 'Primary care or preoperative OSA risk screening when STOP-BANG is not used.',
    whyUse: 'Validated three-category questionnaire classifying high vs low OSA risk.',
    inputs: [
      // Category 1 — snoring (positive if ≥2 points)
      selectInput('snore', 'Do you snore?', [
        { label: 'No (0)', value: 'no' },
        { label: 'Yes (1)', value: 'yes' },
        { label: 'Do not know (0)', value: 'unknown' },
      ], undefined, 'Category 1 (snoring/apneas) is positive if ≥2 points from the next five items (snore, loudness, frequency, bothered others, quit breathing).'),
      selectInput('snoreLoud', 'Snoring loudness', [
        { label: 'N/A or slightly louder than breathing (0)', value: 'slightly' },
        { label: 'As loud as talking (0)', value: 'talking' },
        { label: 'Louder than talking (1)', value: 'louder-than-talking' },
        { label: 'Very loud — heard in adjacent rooms (1)', value: 'adjacent-room' },
      ]),
      selectInput('snoreFreq', 'Snoring frequency', [
        { label: 'Never / nearly never (0)', value: 'never' },
        { label: '1–2 times/month (0)', value: 'monthly-1-2' },
        { label: '1–2 times/week (0)', value: 'weekly-1-2' },
        { label: '3–4 times/week (1)', value: 'weekly-3-4' },
        { label: 'Nearly every day (1)', value: 'daily' },
      ]),
      selectInput('bothers', 'Has snoring bothered others?', [
        { label: 'No (0)', value: 0 },
        { label: 'Yes (1)', value: 1 },
      ]),
      selectInput('quitBreath', 'Anyone noticed you quit breathing in sleep?', [
        { label: 'Never / nearly never (0)', value: 'never' },
        { label: '1–2×/month (0)', value: 'monthly-1-2' },
        { label: '1–2×/week (0)', value: 'weekly-1-2' },
        { label: '3–4×/week (1)', value: 'weekly-3-4' },
        { label: 'Nearly every day (1)', value: 'daily' },
      ]),
      // Category 2 — sleepiness
      selectInput('tiredWake', 'Tired/fatigued after sleep?', [
        { label: 'Never / nearly never (0)', value: 'never' },
        { label: '1–2×/month (0)', value: 'monthly-1-2' },
        { label: '1–2×/week (0)', value: 'weekly-1-2' },
        { label: '3–4×/week (1)', value: 'weekly-3-4' },
        { label: 'Nearly every day (1)', value: 'daily' },
      ], undefined, 'Category 2 (daytime sleepiness) is positive if ≥2 points from the next three items (tired after sleep, tired during wake, fallen asleep driving).'),
      selectInput('tiredDay', 'Tired/fatigued during wake time?', [
        { label: 'Never / nearly never (0)', value: 'never' },
        { label: '1–2×/month (0)', value: 'monthly-1-2' },
        { label: '1–2×/week (0)', value: 'weekly-1-2' },
        { label: '3–4×/week (1)', value: 'weekly-3-4' },
        { label: 'Nearly every day (1)', value: 'daily' },
      ]),
      selectInput('nodrive', 'Fallen asleep while driving?', [
        { label: 'Never (0)', value: 0 },
        { label: 'Yes, any frequency (1)', value: 1 },
      ], undefined, 'Any drowsy-driving episode counts as 1 Category 2 point (not only recent or frequent events).'),
      // Category 3
      yesNo('htn', 'High blood pressure (diagnosed/treated)', 1, 'Diagnosed or treated hypertension. Category 3 is positive if HTN or BMI >30 kg/m² (either one is enough).'),
      numberInput('bmi', 'BMI', { unit: 'kg/m²', min: 12, max: 80, step: 0.1, defaultValue: 32, helpText: 'Category 3 is positive if BMI >30 kg/m² or diagnosed/treated hypertension.' }),
    ],
    calculate(values) {
      const snorePoints: Record<string, number> = { no: 0, yes: 1, unknown: 0 };
      const loudPoints: Record<string, number> = {
        slightly: 0,
        talking: 0,
        'louder-than-talking': 1,
        'adjacent-room': 1,
      };
      const frequencyPoints: Record<string, number> = {
        never: 0,
        'monthly-1-2': 0,
        'weekly-1-2': 0,
        'weekly-3-4': 1,
        daily: 1,
      };
      const points = (value: number | string | boolean | null, mapping: Record<string, number>) =>
        mapping[String(value)] ?? num(value);
      const cat1 =
        points(values.snore, snorePoints) +
        points(values.snoreLoud, loudPoints) +
        points(values.snoreFreq, frequencyPoints) +
        num(values.bothers) +
        points(values.quitBreath, frequencyPoints);
      const cat2 = points(values.tiredWake, frequencyPoints) + points(values.tiredDay, frequencyPoints) + num(values.nodrive);
      const bmi = num(values.bmi, 32);
      const cat3pts = (bool(values.htn) ? 1 : 0) + (bmi > 30 ? 1 : 0);
      const cat1Pos = cat1 >= 2;
      const cat2Pos = cat2 >= 2;
      const cat3Pos = cat3pts >= 1;
      const positiveCats = [cat1Pos, cat2Pos, cat3Pos].filter(Boolean).length;
      const highRisk = positiveCats >= 2;
      return {
        score: positiveCats,
        unit: 'positive categories',
        label: highRisk ? 'High OSA risk' : 'Low OSA risk',
        interpretation: highRisk
          ? `Berlin HIGH risk (${positiveCats}/3 categories positive: snoring ${cat1Pos ? '+' : '−'}, sleepiness ${cat2Pos ? '+' : '−'}, HTN/BMI ${cat3Pos ? '+' : '−'}). Consider sleep testing and periop precautions.`
          : `Berlin LOW risk (${positiveCats}/3 categories positive). OSA not excluded — reassess if symptoms progress or high pretest probability.`,
        riskLevel: highRisk ? 'high' : 'low',
        details: [
          { label: 'Category 1 points (snoring)', value: `${cat1} (positive if ≥2)` },
          { label: 'Category 2 points (sleepiness)', value: `${cat2} (positive if ≥2)` },
          { label: 'Category 3 (HTN or BMI >30)', value: cat3Pos ? 'Positive' : 'Negative' },
          { label: 'Hypertension', value: bool(values.htn) ? 'Yes' : 'No' },
          { label: 'BMI >30', value: bmi > 30 ? 'Yes' : 'No' },
          { label: 'BMI', value: `${bmi} kg/m²` },
        ],
      };
    },
    evidence: {
      summary:
        'Berlin Questionnaire: Category 1 (snoring/apnea items) positive if ≥2 points; Category 2 (fatigue/drowsy driving) positive if ≥2; Category 3 positive if HTN or BMI >30. High risk if ≥2 categories positive.',
      formula: 'High risk if ≥2 of 3 categories positive',
      validation: 'Netzer et al. 1999; common primary-care OSA screen (STOP-BANG often preferred perioperatively).',
      references: [
        {
          title: 'Using the Berlin Questionnaire to identify patients at risk for the sleep apnea syndrome',
          citation: 'Netzer NC et al. Ann Intern Med. 1999',
          year: 1999,
          pmid: '10507956',
          doi: '10.7326/0003-4819-131-7-199910050-00002',
        },
      ],
    },
    nextSteps: [
      { condition: 'High risk', actions: ['Home sleep apnea test or PSG', 'Counsel drowsy driving', 'Periop OSA precautions if surgery planned'] },
    ],
    pearls: ['Scoring variants exist — this follows the classic Netzer category approach.', 'High sensitivity, modest specificity in some populations.'],
  },

  // ─── 14. CAT COPD ──────────────────────────────────────────────────────────
  {
    id: 'cat-copd',
    name: 'COPD Assessment Test (CAT)',
    shortName: 'CAT',
    description: 'Scores and interprets the COPD Assessment Test (0–40) across 8 clinical domains to quantify symptom burden and guide GOLD staging.',
    category: 'pulmonary',
    tags: ['cat', 'copd', 'symptoms', 'gold', 'quality of life'],
    whenToUse: 'Routine COPD visits to quantify symptoms and guide GOLD ABE grouping and treatment escalation.',
    whyUse: '8-item validated symptom score preferred in GOLD guidelines for impact assessment (with mMRC).',
    inputs: [
      selectInput('entryMode', 'Entry Mode', [
        { label: 'Interactive 8-item assessment (recommended)', value: 'survey' },
        { label: 'Direct CAT score override (0–40)', value: 'direct' },
      ], 'survey'),
      selectInput('cat_cough', '1. Cough', [
        { label: '0 - I never cough', value: 0 },
        { label: '1 - Rare cough', value: 1 },
        { label: '2 - Occasional cough', value: 2 },
        { label: '3 - Frequent cough', value: 3 },
        { label: '4 - Very frequent cough', value: 4 },
        { label: '5 - I cough all the time', value: 5 },
      ], 2),
      selectInput('cat_phlegm', '2. Phlegm (mucus) in the chest', [
        { label: '0 - My chest is completely clear of phlegm', value: 0 },
        { label: '1 - Rare phlegm', value: 1 },
        { label: '2 - Moderate phlegm', value: 2 },
        { label: '3 - Substantial phlegm', value: 3 },
        { label: '4 - Very heavy phlegm', value: 4 },
        { label: '5 - My chest is completely full of phlegm', value: 5 },
      ], 2),
      selectInput('cat_tightness', '3. Chest tightness', [
        { label: '0 - My chest does not feel tight at all', value: 0 },
        { label: '1 - Slight tightness occasionally', value: 1 },
        { label: '2 - Mild tightness', value: 2 },
        { label: '3 - Moderate tightness', value: 3 },
        { label: '4 - Severe tightness', value: 4 },
        { label: '5 - My chest feels very tight', value: 5 },
      ], 1),
      selectInput('cat_breathlessness', '4. Breathlessness walking up a hill or one flight of stairs', [
        { label: '0 - Not breathless at all', value: 0 },
        { label: '1 - Slightly breathless', value: 1 },
        { label: '2 - Moderately breathless', value: 2 },
        { label: '3 - Quite breathless', value: 3 },
        { label: '4 - Very breathless', value: 4 },
        { label: '5 - Completely breathless / unable to walk up stairs', value: 5 },
      ], 3),
      selectInput('cat_activities', '5. Activity limitation at home', [
        { label: '0 - I am not limited doing any activities at home', value: 0 },
        { label: '1 - Very slightly limited', value: 1 },
        { label: '2 - Moderately limited', value: 2 },
        { label: '3 - Substantially limited', value: 3 },
        { label: '4 - Very limited', value: 4 },
        { label: '5 - I am totally limited doing any activities at home', value: 5 },
      ], 2),
      selectInput('cat_confidence', '6. Confidence leaving home despite lung condition', [
        { label: '0 - I am completely confident leaving my home', value: 0 },
        { label: '1 - Mostly confident', value: 1 },
        { label: '2 - Moderately confident', value: 2 },
        { label: '3 - Somewhat anxious / lacking confidence', value: 3 },
        { label: '4 - Very unconfident', value: 4 },
        { label: '5 - I am not at all confident leaving my home', value: 5 },
      ], 2),
      selectInput('cat_sleep', '7. Sleep quality', [
        { label: '0 - I sleep soundly', value: 0 },
        { label: '1 - Minor sleep disturbance', value: 1 },
        { label: '2 - Moderate sleep interruption', value: 2 },
        { label: '3 - Frequently awake due to chest', value: 3 },
        { label: '4 - Very poor sleep', value: 4 },
        { label: '5 - I do not sleep soundly at all because of my lung condition', value: 5 },
      ], 2),
      selectInput('cat_energy', '8. Energy level', [
        { label: '0 - I have lots of energy', value: 0 },
        { label: '1 - Good energy most days', value: 1 },
        { label: '2 - Moderate energy', value: 2 },
        { label: '3 - Low energy', value: 3 },
        { label: '4 - Very low energy', value: 4 },
        { label: '5 - I have no energy at all', value: 5 },
      ], 2),
      numberInput('total', 'Direct CAT total override (0–40)', {
        min: 0,
        max: 40,
        step: 1,
        defaultValue: 15,
        helpText: 'Used if Direct score override mode is selected.',
      }),
    ],
    calculate(values) {
      const mode = String(values.entryMode ?? 'survey');
      let score: number;

      if (mode === 'direct' || (values.total !== undefined && values.entryMode === undefined && values.cat_cough === undefined)) {
        score = Math.round(Math.min(40, Math.max(0, num(values.total, 0))));
      } else {
        score =
          num(values.cat_cough, 0) +
          num(values.cat_phlegm, 0) +
          num(values.cat_tightness, 0) +
          num(values.cat_breathlessness, 0) +
          num(values.cat_activities, 0) +
          num(values.cat_confidence, 0) +
          num(values.cat_sleep, 0) +
          num(values.cat_energy, 0);
      }

      const r = riskFromThresholds(score, [
        {
          max: 9,
          level: 'low',
          label: 'Low impact (0–9)',
          interpretation: `CAT ${score}: low symptom impact. Still treat airflow obstruction risks (smoking, vaccines, inhaler technique).`,
        },
        {
          max: 20,
          level: 'moderate',
          label: 'Medium impact (10–20)',
          interpretation: `CAT ${score}: medium impact — common GOLD “more symptoms” threshold is ≥10. Optimize dual bronchodilation / dual therapy as indicated.`,
        },
        {
          max: 30,
          level: 'high',
          label: 'High impact (21–30)',
          interpretation: `CAT ${score}: high impact — comprehensive COPD care, pulm rehab, comorbidity review.`,
        },
        {
          max: 40,
          level: 'critical',
          label: 'Very high impact (31–40)',
          interpretation: `CAT ${score}: very high impact — specialty care, exacerbation prevention, advance care planning if end-stage.`,
        },
      ]);
      return {
        score,
        unit: '/40',
        ...r,
        details: [
          { label: 'GOLD symptom threshold', value: score >= 10 ? '≥10 (High symptom burden / GOLD Group B/E candidate)' : '<10 (Low symptom burden)' },
          { label: 'MCID (approx)', value: '2 points' },
        ],
      };
    },
    evidence: {
      summary:
        'CAT: 8 items (cough, phlegm, chest tightness, breathlessness, activities, confidence leaving home, sleep, energy) scored 0–5 (total 0–40). GOLD uses CAT ≥10 as “more symptoms.”',
      formula: 'Total = sum of 8 items (0–40)',
      validation: 'Jones et al.; embedded in GOLD strategy documents.',
      references: [
        {
          title: 'Development and first validation of the COPD Assessment Test',
          citation: 'Jones PW et al. Eur Respir J. 2009',
          year: 2009,
          pmid: '19720809',
          doi: '10.1183/09031936.00102509',
        },
      ],
    },
    nextSteps: [
      { condition: 'CAT ≥10', actions: ['Review inhaler regimen (LABA/LAMA ± ICS)', 'Pulmonary rehab referral', 'Exacerbation action plan'] },
    ],
    pearls: ['CAT measures impact, not FEV1 — both needed for full GOLD assessment.', 'Pair with exacerbation history for ABE group.'],
  },

  // ─── 15. ADO index ─────────────────────────────────────────────────────────
  {
    id: 'ado-index',
    name: 'ADO Index (COPD Prognosis)',
    shortName: 'ADO',
    description: 'Age, Dyspnea, airflow Obstruction index for COPD mortality risk (0–14 updated scale).',
    category: 'pulmonary',
    tags: ['ado', 'copd', 'prognosis', 'mortality', 'fev1'],
    whenToUse: 'COPD prognostication when 6-minute walk (for BODE) is unavailable.',
    whyUse: 'Simpler than BODE; age + mMRC + FEV1% predicts mortality without exercise test.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 40, max: 100, defaultValue: 68, helpText: 'Updated ADO age points: <50 = 0; 50–59 = 1; 60–69 = 2; 70–79 = 3; 80–89 = 4; ≥90 = 5.' }),
      selectInput('mmrc', 'mMRC dyspnea grade', [
        { label: '0 — Dyspnea only with strenuous exercise (0 pts)', value: 0, description: '“I only get breathless with strenuous exercise.” No dyspnea walking on the level or up a slight hill.' },
        { label: '1 — Dyspnea when hurrying / walking up slight hill (1)', value: 1, description: '“I get short of breath when hurrying on the level or walking up a slight hill.” Can keep up with peers on the level at own pace.' },
        { label: '2 — Walks slower than peers / stops on level (2)', value: 2, description: '“I walk slower than people of the same age on the level because of breathlessness, or I have to stop for breath when walking at my own pace on the level.”' },
        { label: '3 — Stops after ~100 m or few minutes (3)', value: 3, description: '“I stop for breath after walking about 100 metres or after a few minutes on the level.” Still leaves the house.' },
        { label: '4 — Too dyspneic to leave house / dress (mMRC 4 → 3 ADO pts)', value: 4, description: '“I am too breathless to leave the house or I am breathless when dressing or undressing.” Updated ADO still credits only 3 dyspnea points.' },
      ], undefined, 'Ask which published mMRC statement best fits usual breathlessness (not only today’s exacerbation). Updated ADO dyspnea points equal mMRC 0–3; mMRC 4 is capped at 3 ADO points. Use the descriptors — not titles alone — to separate 1 vs 2 vs 3 vs 4.'),
      numberInput('fev1', 'FEV1 % predicted', {
        unit: '%',
        min: 10,
        max: 120,
        defaultValue: 45,
        helpText: 'Post-bronchodilator FEV1 % predicted. Updated ADO obstruction points: ≥81% = 0; 65–80 = 1; 50–64 = 2; 36–49 = 3; 21–35 = 4; 6–20 = 5; ≤5 = 6.',
      }),
    ],
    calculate(values) {
      const age = num(values.age, 68);
      const mmrc = num(values.mmrc, 2);
      const fev1 = num(values.fev1, 45);
      // Updated ADO (Puhan 2012): age points 0–5, dyspnea 0–3 (mMRC mapped), obstruction 0–6
      let agePts = 0;
      if (age < 50) agePts = 0;
      else if (age < 60) agePts = 1;
      else if (age < 70) agePts = 2;
      else if (age < 80) agePts = 3;
      else if (age < 90) agePts = 4;
      else agePts = 5;

      // Dyspnea points on updated ADO use mMRC 0–3 scale (mMRC 4 maps to 3)
      const dyspPts = Math.min(3, mmrc);

      // Updated ADO obstruction scoring (0–6)
      let obsPts = 0;
      if (fev1 >= 81) obsPts = 0;
      else if (fev1 >= 65) obsPts = 1;
      else if (fev1 >= 50) obsPts = 2;
      else if (fev1 >= 36) obsPts = 3;
      else if (fev1 >= 21) obsPts = 4;
      else if (fev1 >= 6) obsPts = 5;
      else obsPts = 6;

      const score = agePts + dyspPts + obsPts;
      const r = riskFromThresholds(score, [
        {
          max: 3,
          level: 'low',
          label: 'Lower risk band (0–3)',
          interpretation: `ADO ${score}/14: lower relative mortality risk among COPD cohorts — continue guideline therapy and risk-factor control.`,
        },
        {
          max: 6,
          level: 'moderate',
          label: 'Intermediate (4–6)',
          interpretation: `ADO ${score}/14: intermediate prognostic band — optimize treatment, rehab, and comorbidity management.`,
        },
        {
          max: 9,
          level: 'high',
          label: 'Higher (7–9)',
          interpretation: `ADO ${score}/14: higher mortality risk — specialty COPD care, exacerbation prevention, advance care planning discussions.`,
        },
        {
          max: 14,
          level: 'critical',
          label: 'Highest (10–14)',
          interpretation: `ADO ${score}/14: highest band — palliative-supportive needs assessment; consider transplant referral if age/comorbidities allow.`,
        },
      ]);
      return {
        score,
        unit: '/14',
        ...r,
        details: [
          { label: 'Age points', value: String(agePts) },
          { label: 'Dyspnea points', value: String(dyspPts) },
          { label: 'Obstruction points', value: String(obsPts) },
          { label: 'FEV1 %', value: `${fev1}%` },
        ],
      };
    },
    evidence: {
      summary:
        'Updated ADO index (0–14): points for age (0–5), dyspnea (0–3), and FEV1% obstruction (0–6). Predicts COPD mortality without 6-minute walk distance required by BODE.',
      formula: 'ADO = age points + dyspnea points + FEV1 points',
      validation: 'Puhan et al. updated ADO; validated against BODE for mortality prediction.',
      references: [
        {
          title: 'Large-scale international validation of the ADO index in subjects with COPD: an individual subject data analysis of 10 cohorts',
          citation: 'Puhan MA et al. BMJ Open. 2012;2:e002152 (updated ADO 0–14)',
          year: 2012,
          pmid: '23242246',
          doi: '10.1136/bmjopen-2012-002152',
        },
      ],
    },
    nextSteps: [
      { condition: 'ADO ≥7', actions: ['Pulmonary specialty follow-up', 'Pulm rehab', 'Goals-of-care / exacerbation plan'] },
    ],
    pearls: ['Original ADO used different point maps — this follows the expanded/updated 0–14 version.', 'Not a substitute for individual clinical judgment or transplant listing criteria.'],
  },

  // ─── 16. GOLD stage ────────────────────────────────────────────────────────
  {
    id: 'gold-stage',
    name: 'GOLD Airflow Obstruction Stage',
    shortName: 'GOLD Stage',
    description: 'GOLD spirometric grade (1–4) from post-bronchodilator FEV1 % predicted in COPD.',
    category: 'pulmonary',
    tags: ['gold', 'copd', 'fev1', 'spirometry', 'staging'],
    whenToUse: 'After COPD is diagnosed (FEV1/FVC <0.7 post-BD) to grade obstruction severity.',
    whyUse: 'Universal spirometric severity language in GOLD reports (separate from ABE symptom/exacerbation groups).',
    inputs: [
      numberInput('fev1', 'Post-bronchodilator FEV1 % predicted', {
        unit: '%',
        min: 5,
        max: 120,
        step: 1,
        defaultValue: 55,
        helpText: 'GOLD spirometric grade (after FEV1/FVC <0.7 post-BD): 1 mild ≥80%; 2 moderate 50–79%; 3 severe 30–49%; 4 very severe <30%.',
      }),
      selectInput('ratioOk', 'FEV1/FVC < 0.7 (post-BD) confirmed?', [
        { label: 'Yes — COPD obstruction present', value: 'yes', description: 'Post-bronchodilator FEV1/FVC <0.70 (or below LLN if that is your lab’s COPD definition) — GOLD grades apply' },
        { label: 'No / unknown — interpret grade cautiously', value: 'no', description: 'Without confirmed airflow limitation the FEV1 % band is not a GOLD COPD grade' },
      ], undefined, 'GOLD 1–4 grades apply only after COPD is diagnosed (persistent airflow limitation). They are not the ABE symptom/exacerbation group.'),
    ],
    calculate(values) {
      const fev1 = num(values.fev1, 55);
      const ratioOk = String(values.ratioOk ?? 'yes') === 'yes';
      let grade = 1;
      let label = '';
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
      if (fev1 >= 80) {
        grade = 1;
        label = 'GOLD 1 — Mild';
        riskLevel = 'low';
      } else if (fev1 >= 50) {
        grade = 2;
        label = 'GOLD 2 — Moderate';
        riskLevel = 'moderate';
      } else if (fev1 >= 30) {
        grade = 3;
        label = 'GOLD 3 — Severe';
        riskLevel = 'high';
      } else {
        grade = 4;
        label = 'GOLD 4 — Very severe';
        riskLevel = 'critical';
      }
      const caveat = ratioOk
        ? ''
        : ' Note: GOLD grades apply after confirming persistent airflow limitation (FEV1/FVC <0.7).';
      return {
        score: grade,
        unit: 'GOLD grade',
        label,
        interpretation: `FEV1 ${fev1}% predicted → ${label} (GOLD 1 ≥80%, 2 50–79%, 3 30–49%, 4 <30%). Spirometric grade alone does not determine treatment group — use symptoms (CAT/mMRC) and exacerbation history (ABE).${caveat}`,
        riskLevel,
        details: [
          { label: 'FEV1 % predicted', value: `${fev1}%` },
          { label: 'Ratio confirmed', value: ratioOk ? 'Yes' : 'No/unknown' },
        ],
      };
    },
    evidence: {
      summary:
        'GOLD airflow limitation grades (post-BD FEV1 % predicted): 1 mild ≥80%, 2 moderate 50–79%, 3 severe 30–49%, 4 very severe <30%, after FEV1/FVC <0.7.',
      formula: 'Grade from FEV1 % predicted thresholds',
      validation: 'Global Initiative for Chronic Obstructive Lung Disease strategy documents.',
      references: [
        {
          title: 'Global Strategy for the Diagnosis, Management, and Prevention of COPD: 2026 Report',
          citation: 'Global Initiative for Chronic Obstructive Lung Disease (GOLD). 2026 Report',
          year: 2026,
          url: 'https://goldcopd.org/2026-gold-report-and-pocket-guide/',
        },
      ],
    },
    nextSteps: [
      { condition: 'GOLD 3–4', actions: ['Specialty COPD care', 'Check O2 criteria', 'Pulm rehab', 'Exacerbation prevention'] },
      { condition: 'Any grade', actions: ['Assign ABE group with CAT/mMRC + exacerbations', 'Smoking cessation', 'Vaccinations'] },
    ],
    pearls: ['Do not confuse spirometric grade with former A–D or current A/B/E groups.', 'Pre- vs post-bronchodilator values must be labeled.'],
  },

  // ─── 17. ACT asthma ────────────────────────────────────────────────────────
  {
    id: 'act-asthma',
    name: 'Asthma Control Test (ACT)',
    shortName: 'ACT',
    description: 'Scores and interprets the Asthma Control Test (ACT) total (5–25) across 5 validated items for symptom control over the past 4 weeks.',
    category: 'pulmonary',
    tags: ['act', 'asthma', 'control', 'gina'],
    whenToUse: 'Routine asthma clinic visits to assess symptom control and guide step-up / step-down therapy decisions.',
    whyUse: '5-item validated patient questionnaire; cutoff ≤19 identifies uncontrolled asthma with high sensitivity.',
    inputs: [
      selectInput('entryMode', 'Entry Mode', [
        { label: 'Interactive 5-item questionnaire (recommended)', value: 'survey' },
        { label: 'Direct ACT score override (5–25)', value: 'direct' },
      ], 'survey'),
      selectInput('act_q1', '1. In past 4 weeks, how much did asthma keep you from getting work, school, or home tasks done?', [
        { label: '1 - All of the time', value: 1 },
        { label: '2 - Most of the time', value: 2 },
        { label: '3 - Some of the time', value: 3 },
        { label: '4 - A little of the time', value: 4 },
        { label: '5 - None of the time', value: 5 },
      ], 4),
      selectInput('act_q2', '2. During the past 4 weeks, how often have you had shortness of breath?', [
        { label: '1 - More than once a day', value: 1 },
        { label: '2 - Once a day', value: 2 },
        { label: '3 - 3 to 6 times a week', value: 3 },
        { label: '4 - Once or twice a week', value: 4 },
        { label: '5 - Not at all', value: 5 },
      ], 4),
      selectInput('act_q3', '3. During the past 4 weeks, how often did your asthma symptoms wake you up at night or earlier than usual?', [
        { label: '1 - 4 or more nights a week', value: 1 },
        { label: '2 - 2 to 3 nights a week', value: 2 },
        { label: '3 - Once a week', value: 3 },
        { label: '4 - Once or twice', value: 4 },
        { label: '5 - Not at all', value: 5 },
      ], 4),
      selectInput('act_q4', '4. During the past 4 weeks, how often have you used your rescue inhaler or nebulizer medication (such as albuterol)?', [
        { label: '1 - 3 or more times a day', value: 1 },
        { label: '2 - 1 to 2 times a day', value: 2 },
        { label: '3 - 2 or 3 times a week', value: 3 },
        { label: '4 - Once a week or less', value: 4 },
        { label: '5 - Not at all', value: 5 },
      ], 4),
      selectInput('act_q5', '5. How would you rate your asthma control during the past 4 weeks?', [
        { label: '1 - Not controlled at all', value: 1 },
        { label: '2 - Poorly controlled', value: 2 },
        { label: '3 - Somewhat controlled', value: 3 },
        { label: '4 - Well controlled', value: 4 },
        { label: '5 - Completely controlled', value: 5 },
      ], 4),
      numberInput('total', 'Direct ACT total override (5–25)', {
        min: 5,
        max: 25,
        step: 1,
        defaultValue: 18,
        helpText: 'Used if Direct score override mode is chosen.',
      }),
    ],
    calculate(values) {
      const mode = String(values.entryMode ?? 'survey');
      let score: number;

      if (mode === 'direct' || (values.total !== undefined && values.entryMode === undefined && values.act_q1 === undefined)) {
        score = Math.round(Math.min(25, Math.max(5, num(values.total, 18))));
      } else {
        score =
          num(values.act_q1, 4) +
          num(values.act_q2, 4) +
          num(values.act_q3, 4) +
          num(values.act_q4, 4) +
          num(values.act_q5, 4);
      }

      let riskLevel: 'normal' | 'low' | 'moderate' | 'high' = 'normal';
      let label = '';
      let interpretation = '';
      if (score >= 25) {
        riskLevel = 'normal';
        label = 'Total control (25)';
        interpretation = `ACT ${score}/25: totally controlled asthma over past 4 weeks — maintain therapy and written action plan.`;
      } else if (score >= 20) {
        riskLevel = 'low';
        label = 'Well controlled (20–24)';
        interpretation = `ACT ${score}/25: well controlled — continue current regimen; address any residual triggers.`;
      } else if (score >= 16) {
        riskLevel = 'moderate';
        label = 'Not well controlled (16–19)';
        interpretation = `ACT ${score}/25: not well controlled (classic cut ≤19). Review adherence, technique, comorbidities; step-up per GINA/NAEPP.`;
      } else {
        riskLevel = 'high';
        label = 'Very poorly controlled (≤15)';
        interpretation = `ACT ${score}/25: very poorly controlled — prompt step-up, exacerbation risk counseling, specialty referral if refractory.`;
      }
      return {
        score,
        unit: '/25',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Uncontrolled cutoff', value: '≤19 (requires therapy review / step-up)' },
          { label: 'Well controlled target', value: '20–25' },
          { label: 'MCID (approx)', value: '3 points' },
        ],
      };
    },
    evidence: {
      summary:
        'ACT: 5 questions (activity, frequency of symptoms, night symptoms, rescue use, self-rated control) each 1–5 (total 5–25). ≤19 suggests uncontrolled asthma; 20–24 well controlled; 25 total control.',
      formula: 'Total = sum of 5 items (5–25)',
      validation: 'Nathan et al.; widely validated and guideline-endorsed.',
      references: [
        {
          title: 'Development of the asthma control test',
          citation: 'Nathan RA et al. J Allergy Clin Immunol. 2004',
          year: 2004,
          pmid: '14713908',
          doi: '10.1016/j.jaci.2003.09.008',
        },
      ],
    },
    nextSteps: [
      { condition: 'ACT ≤19', actions: ['Inhaler technique / adherence', 'Step-up controller therapy', 'Check rhinitis, GERD, smoking, occupation'] },
    ],
    pearls: ['Childhood cACT uses different scoring.', 'ACT is control, not severity or future risk alone — still count exacerbations.'],
  },

  // ─── 18. ACQ asthma ────────────────────────────────────────────────────────
  {
    id: 'acq-asthma',
    name: 'Asthma Control Questionnaire (ACQ)',
    shortName: 'ACQ',
    description: 'Scores and interprets the Asthma Control Questionnaire (ACQ) mean score (0–6; higher = worse control) with ACQ-5, ACQ-6, or ACQ-7 item sets.',
    category: 'pulmonary',
    tags: ['acq', 'asthma', 'control', 'juniper'],
    whenToUse: 'When evaluating asthma control continuously in research, specialty asthma clinics, or biologic monitoring.',
    whyUse: 'Juniper ACQ is a standard continuous control metric in asthma clinical trials with well-established cutoffs.',
    inputs: [
      selectInput('entryMode', 'Entry Mode', [
        { label: 'Interactive item-by-item questionnaire (recommended)', value: 'survey' },
        { label: 'Direct precalculated ACQ mean override (0–6)', value: 'direct' },
      ], 'survey'),
      selectInput('version', 'ACQ Version', [
        { label: 'ACQ-5 (5 symptom items only; clinic/patient survey)', value: '5', description: '5 symptom items (night waking, morning symptoms, limitation, shortness of breath, wheeze). Mean of 5.' },
        { label: 'ACQ-6 (+ rescue bronchodilator use)', value: '6', description: 'ACQ-5 plus daily rescue short-acting bronchodilator use. Mean of 6.' },
        { label: 'ACQ-7 (+ FEV1 % predicted from spirometry)', value: '7', description: 'ACQ-6 plus pre-bronchodilator FEV1 % predicted. Mean of 7. Requires clinic spirometry.' },
      ], '5'),
      // Items 1-5 (Symptoms)
      selectInput('acq_q1', '1. On average, during the past week, how often were you woken by your asthma during the night?', [
        { label: '0 - Never', value: 0 },
        { label: '1 - Hardly ever', value: 1 },
        { label: '2 - A few times', value: 2 },
        { label: '3 - Several times', value: 3 },
        { label: '4 - Many times', value: 4 },
        { label: '5 - A great many times', value: 5 },
        { label: '6 - Unable to sleep because of asthma', value: 6 },
      ], 1),
      selectInput('acq_q2', '2. On average, during the past week, how bad were your asthma symptoms when you woke up in the morning?', [
        { label: '0 - No symptoms', value: 0 },
        { label: '1 - Very mild symptoms', value: 1 },
        { label: '2 - Mild symptoms', value: 2 },
        { label: '3 - Moderate symptoms', value: 3 },
        { label: '4 - Quite severe symptoms', value: 4 },
        { label: '5 - Severe symptoms', value: 5 },
        { label: '6 - Very severe symptoms', value: 6 },
      ], 1),
      selectInput('acq_q3', '3. In general, during the past week, how limited were you in your daily activities because of your asthma?', [
        { label: '0 - Not limited at all', value: 0 },
        { label: '1 - Very slightly limited', value: 1 },
        { label: '2 - Slightly limited', value: 2 },
        { label: '3 - Moderately limited', value: 3 },
        { label: '4 - Very limited', value: 4 },
        { label: '5 - Extremely limited', value: 5 },
        { label: '6 - Totally limited', value: 6 },
      ], 1),
      selectInput('acq_q4', '4. In general, during the past week, how much shortness of breath did you experience because of your asthma?', [
        { label: '0 - None', value: 0 },
        { label: '1 - A very little', value: 1 },
        { label: '2 - A little', value: 2 },
        { label: '3 - A moderate amount', value: 3 },
        { label: '4 - Quite a lot', value: 4 },
        { label: '5 - A great deal', value: 5 },
        { label: '6 - A very great deal', value: 6 },
      ], 1),
      selectInput('acq_q5', '5. In general, during the past week, how much of the time did you wheeze?', [
        { label: '0 - Not at all', value: 0 },
        { label: '1 - Hardly any of the time', value: 1 },
        { label: '2 - A little of the time', value: 2 },
        { label: '3 - A moderate amount of the time', value: 3 },
        { label: '4 - A lot of the time', value: 4 },
        { label: '5 - Most of the time', value: 5 },
        { label: '6 - All the time', value: 6 },
      ], 1),
      // Item 6 (Rescue puffs - for ACQ-6 and 7)
      selectInput('acq_q6', '6. On average, during the past week, how many puffs of short-acting bronchodilator (e.g. albuterol) have you used each day?', [
        { label: '0 - None', value: 0 },
        { label: '1 - 1–2 puffs most days', value: 1 },
        { label: '2 - 3–4 puffs most days', value: 2 },
        { label: '3 - 5–8 puffs most days', value: 3 },
        { label: '4 - 9–12 puffs most days', value: 4 },
        { label: '5 - 13–16 puffs most days', value: 5 },
        { label: '6 - More than 16 puffs most days', value: 6 },
      ], 1, 'Used in ACQ-6 and ACQ-7.'),
      // Item 7 (FEV1 - for ACQ-7)
      selectInput('acq_q7', '7. Pre-bronchodilator FEV1 % predicted (clinic spirometry)', [
        { label: '0 - >95% predicted', value: 0 },
        { label: '1 - 90%–95% predicted', value: 1 },
        { label: '2 - 80%–89% predicted', value: 2 },
        { label: '3 - 70%–79% predicted', value: 3 },
        { label: '4 - 60%–69% predicted', value: 4 },
        { label: '5 - 50%–59% predicted', value: 5 },
        { label: '6 - <50% predicted', value: 6 },
      ], 2, 'Used in ACQ-7 only.'),
      numberInput('total', 'Direct ACQ mean score override (0–6)', {
        min: 0,
        max: 6,
        step: 0.01,
        defaultValue: 1.2,
        helpText: 'Used if Direct score override mode is selected. Mean of items (0 = totally controlled, 6 = severely uncontrolled).',
      }),
    ],
    calculate(values) {
      const mode = String(values.entryMode ?? 'survey');
      const version = String(values.version ?? '5');
      let score: number;

      if (mode === 'direct' || (values.total !== undefined && values.entryMode === undefined && values.acq_q1 === undefined)) {
        score = round(Math.min(6, Math.max(0, num(values.total, 0))), 2);
      } else {
        const q1 = num(values.acq_q1, 0);
        const q2 = num(values.acq_q2, 0);
        const q3 = num(values.acq_q3, 0);
        const q4 = num(values.acq_q4, 0);
        const q5 = num(values.acq_q5, 0);
        const q6 = num(values.acq_q6, 0);
        const q7 = num(values.acq_q7, 0);

        if (version === '7') {
          score = round((q1 + q2 + q3 + q4 + q5 + q6 + q7) / 7, 2);
        } else if (version === '6') {
          score = round((q1 + q2 + q3 + q4 + q5 + q6) / 6, 2);
        } else {
          score = round((q1 + q2 + q3 + q4 + q5) / 5, 2);
        }
      }

      // Common cuts: ≤0.75 well controlled; ≥1.5 not well controlled
      let riskLevel: 'normal' | 'low' | 'moderate' | 'high' = 'normal';
      let label = '';
      let interpretation = '';
      if (score <= 0.75) {
        riskLevel = 'normal';
        label = 'Well controlled (≤0.75)';
        interpretation = `ACQ ${score}: well-controlled range (Juniper). Maintain therapy; document version ACQ-${version}.`;
      } else if (score < 1.5) {
        riskLevel = 'moderate';
        label = 'Indeterminate / partial (0.76–1.49)';
        interpretation = `ACQ ${score}: gray zone between well and not well controlled — clinical judgment, trends, and exacerbations guide steps.`;
      } else if (score < 3) {
        riskLevel = 'high';
        label = 'Not well controlled (≥1.5)';
        interpretation = `ACQ ${score}: not well controlled — step-up assessment, adherence/technique, comorbidity review.`;
      } else {
        riskLevel = 'high';
        label = 'Poorly controlled (≥3)';
        interpretation = `ACQ ${score}: poorly controlled asthma — escalate care and risk reduction urgently.`;
      }
      return {
        score,
        unit: 'mean 0–6',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Version', value: `ACQ-${version}` },
          { label: 'MCID', value: '0.5 points' },
          { label: 'Well / not well cuts', value: '≤0.75 (controlled) / ≥1.5 (uncontrolled)' },
        ],
      };
    },
    evidence: {
      summary:
        'ACQ mean score 0–6 (higher worse). Common interpretive cuts: ≤0.75 well controlled, ≥1.5 not well controlled; MCID 0.5. ACQ-5/6/7 variants differ by rescue use and FEV1 item.',
      formula: 'ACQ Mean = Sum of items / Number of items (5, 6, or 7)',
      validation: 'Juniper et al.; standard asthma trial endpoint.',
      references: [
        {
          title: 'Development and validation of a questionnaire to measure asthma control',
          citation: 'Juniper EF et al. Eur Respir J. 1999',
          year: 1999,
          pmid: '10573240',
          doi: '10.1034/j.1399-3003.1999.14d29.x',
        },
      ],
    },
    nextSteps: [
      { condition: 'ACQ ≥1.5', actions: ['Step-up per GINA', 'Specialist if high-dose ICS/LABA failing', 'Biologic pathway if severe eosinophilic/allergic'] },
    ],
    pearls: ['Do not mix raw sum with mean score.', 'ACQ-7 includes FEV1 — clinic spirometry required.'],
  },

  // ─── 19. GINA symptom control ──────────────────────────────────────────────
  {
    id: 'gina-control',
    name: 'GINA Symptom Control (Checklist)',
    shortName: 'GINA Control',
    description: 'GINA adult asthma symptom control categories from 4 past-4-week questions.',
    category: 'pulmonary',
    tags: ['gina', 'asthma', 'control', 'symptoms'],
    whenToUse: 'Quick guideline-style control classification at asthma visits (with exacerbation risk assessment).',
    whyUse: 'GINA’s standard well / partly / uncontrolled framework used worldwide.',
    inputs: [
      yesNo('daySx', 'In the past 4 weeks: daytime asthma symptoms more than twice/week?', 1, 'GINA box: daytime symptoms >2 days in the past week, averaged over 4 weeks. “More than twice/week” is the cutoff (twice/week exactly is well controlled).'),
      yesNo('night', 'In the past 4 weeks: any night waking due to asthma?', 1, 'Any nocturnal awakening due to asthma in the past 4 weeks (even once).'),
      yesNo('reliever', 'In the past 4 weeks: SABA reliever needed more than twice/week?', 1, 'Count SABA used for symptoms, not doses taken only before exercise. Do not count ICS-formoterol used as MART/AIR reliever (GINA footnote).'),
      yesNo('activity', 'In the past 4 weeks: any activity limitation due to asthma?', 1, 'Any limitation of work, school, sport, or daily activity attributed to asthma in the past 4 weeks.'),
    ],
    calculate(values) {
      const keys = ['daySx', 'night', 'reliever', 'activity'] as const;
      const score = keys.reduce((s, k) => s + (bool(values[k]) ? 1 : 0), 0);
      let label = '';
      let riskLevel: 'normal' | 'moderate' | 'high' = 'normal';
      let interpretation = '';
      if (score === 0) {
        label = 'Well controlled';
        riskLevel = 'normal';
        interpretation =
          'GINA well controlled: none of the 4 symptom boxes in past 4 weeks. Still assess future risk (exacerbations, FEV1, inhaler technique, comorbidities, exposures).';
      } else if (score <= 2) {
        label = 'Partly controlled';
        riskLevel = 'moderate';
        interpretation = `GINA partly controlled: ${score}/4 symptom criteria present in past 4 weeks. Review controllers, adherence, and triggers; consider step-up.`;
      } else {
        label = 'Uncontrolled';
        riskLevel = 'high';
        interpretation = `GINA uncontrolled: ${score}/4 symptom criteria present. Step-up therapy and address risk factors; short-course OCS only if exacerbation criteria met.`;
      }
      return {
        score,
        unit: '/4 criteria',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Well', value: '0 criteria' },
          { label: 'Partly', value: '1–2 criteria' },
          { label: 'Uncontrolled', value: '3–4 criteria' },
        ],
      };
    },
    evidence: {
      summary:
        'GINA symptom control (past 4 weeks): daytime symptoms >2×/week; night waking; reliever >2×/week; activity limitation. 0 = well, 1–2 = partly, 3–4 = uncontrolled. Separate from exacerbation risk assessment.',
      formula: 'Count of 4 yes/no control questions',
      validation: 'Global Initiative for Asthma strategy (annual updates).',
      references: [
        {
          title: 'Global Strategy for Asthma Management and Prevention (2026 update)',
          citation: 'Global Initiative for Asthma (GINA). 2026 Strategy Report',
          year: 2026,
          url: 'https://ginasthma.org/2026-gina-strategy-report/',
        },
      ],
    },
    nextSteps: [
      { condition: 'Partly or uncontrolled', actions: ['Confirm diagnosis / phenotype', 'ICS-containing controller optimization', 'Written action plan'] },
      { condition: 'Any visit', actions: ['Assess exacerbation risk', 'Inhaler technique', 'Smoking / allergen exposures'] },
    ],
    pearls: [
      'Patients on MART: reliever counts as ICS-formoterol use — follow GINA wording carefully.',
      'One severe exacerbation may still imply higher future risk even if currently “well controlled.”',
    ],
  },

  // ─── 20. Elixhauser simplified ─────────────────────────────────────────────
  {
    id: 'elixhauser-simp',
    name: 'Elixhauser Comorbidity Count (Simplified)',
    shortName: 'Elixhauser',
    description: 'Simplified count of Elixhauser comorbidity categories present (0–31 educational tool).',
    category: 'geriatrics',
    tags: ['elixhauser', 'comorbidity', 'risk adjustment', 'charlson'],
    whenToUse: 'Quick comorbidity burden tally when full weighted Elixhauser/van Walraven scores are not computed.',
    whyUse: 'Elixhauser categories improve mortality risk adjustment vs demographics alone; count is a simple proxy.',
    inputs: [
      yesNo('chf', 'Congestive heart failure', 1, 'ICD/clinical CHF (systolic or diastolic), not isolated asymptomatic reduced EF unless coded as HF.'),
      yesNo('arrhythmia', 'Cardiac arrhythmias', 1, 'Atrial fibrillation/flutter, heart block, or other coded arrhythmia — not sinus tachycardia alone.'),
      yesNo('valve', 'Valvular disease', 1),
      yesNo('pulmCirc', 'Pulmonary circulation disorders', 1, 'Pulmonary embolism, pulmonary hypertension, or other pulmonary circulatory disease — not ordinary COPD.'),
      yesNo('pvd', 'Peripheral vascular disease', 1),
      yesNo('htn', 'Hypertension (uncomplicated or complicated)', 1),
      yesNo('paralysis', 'Paralysis', 1, 'Hemiplegia, paraplegia, or other paralysis (not isolated facial palsy).'),
      yesNo('neuro', 'Other neurological disorders', 1, 'Parkinson disease, MS, epilepsy, neurodegenerative disease, etc. — exclude the paralysis category above.'),
      yesNo('cpd', 'Chronic pulmonary disease', 1),
      yesNo('dm', 'Diabetes (uncomplicated or complicated)', 1),
      yesNo('hypothyroid', 'Hypothyroidism', 1),
      yesNo('renal', 'Renal failure', 1, 'Chronic renal failure / CKD with renal insufficiency — not isolated mild Cr bump.'),
      yesNo('liver', 'Liver disease', 1),
      yesNo('ulcer', 'Peptic ulcer disease excluding bleeding', 1),
      yesNo('aids', 'AIDS/HIV', 1),
      yesNo('lymphoma', 'Lymphoma', 1),
      yesNo('cancerMet', 'Metastatic cancer', 1),
      yesNo('cancerSolid', 'Solid tumor without metastasis', 1),
      yesNo('rheum', 'Rheumatoid arthritis / collagen vascular', 1),
      yesNo('coag', 'Coagulopathy', 1, 'Coagulation defect or significant thrombocytopenia as coded — not therapeutic anticoagulation alone.'),
      yesNo('obesity', 'Obesity', 1, 'Present if clinically/ICD obese; adult BMI ≥30 kg/m² is the usual equivalent.'),
      yesNo('weightLoss', 'Weight loss', 1, 'Coded/clinical malnutrition or abnormal weight loss, not voluntary diet.'),
      yesNo('electrolyte', 'Fluid and electrolyte disorders', 1, 'Hyponatremia, hypernatremia, acidosis, or other coded fluid/electrolyte disorder.'),
      yesNo('anemia', 'Deficiency / blood loss anemia', 1),
      yesNo('alcohol', 'Alcohol abuse', 1),
      yesNo('drugs', 'Drug abuse', 1),
      yesNo('psychoses', 'Psychoses', 1),
      yesNo('depression', 'Depression', 1),
    ],
    calculate(values) {
      const keys = [
        'chf',
        'arrhythmia',
        'valve',
        'pulmCirc',
        'pvd',
        'htn',
        'paralysis',
        'neuro',
        'cpd',
        'dm',
        'hypothyroid',
        'renal',
        'liver',
        'ulcer',
        'aids',
        'lymphoma',
        'cancerMet',
        'cancerSolid',
        'rheum',
        'coag',
        'obesity',
        'weightLoss',
        'electrolyte',
        'anemia',
        'alcohol',
        'drugs',
        'psychoses',
        'depression',
      ] as const;
      const score = keys.reduce((s, k) => s + (bool(values[k]) ? 1 : 0), 0);
      const r = riskFromThresholds(score, [
        {
          max: 0,
          level: 'low',
          label: 'No listed comorbidities (0)',
          interpretation: 'No selected Elixhauser categories. Administrative risk adjustment may still use age/sex/admission type.',
        },
        {
          max: 2,
          level: 'low',
          label: 'Low count (1–2)',
          interpretation: `Elixhauser count ${score}: low comorbidity tally — still code carefully for billing/risk models.`,
        },
        {
          max: 4,
          level: 'moderate',
          label: 'Moderate count (3–4)',
          interpretation: `Elixhauser count ${score}: moderate burden — multimorbidity care coordination recommended.`,
        },
        {
          max: 7,
          level: 'high',
          label: 'High count (5–7)',
          interpretation: `Elixhauser count ${score}: high comorbidity load — polypharmacy, care fragmentation, and readmission risks rise.`,
        },
        {
          max: 40,
          level: 'critical',
          label: 'Very high count (≥8)',
          interpretation: `Elixhauser count ${score}: very high burden — intensive care management; weighted scores (van Walraven) better for mortality prediction.`,
        },
      ]);
      return {
        score,
        unit: 'categories',
        ...r,
        details: [
          { label: 'Categories in this simplified list', value: String(keys.length) },
          { label: 'Note', value: 'Unweighted count — not van Walraven weighted Elixhauser' },
        ],
      };
    },
    evidence: {
      summary:
        'Elixhauser comorbidity system flags ~30 administrative diagnosis groups associated with hospital mortality/LOS/cost. This tool returns an unweighted present/absent count as a simplified burden proxy (not the weighted van Walraven index).',
      formula: 'Count of selected comorbidity categories',
      validation: 'Elixhauser et al. 1998; subsequent ICD-9/ICD-10 mappings and weighted variants.',
      references: [
        {
          title: 'Comorbidity measures for use with administrative data',
          citation: 'Elixhauser A et al. Med Care. 1998',
          year: 1998,
          pmid: '9431328',
          doi: '10.1097/00005650-199801000-00004',
        },
      ],
    },
    nextSteps: [
      { condition: 'Count ≥5', actions: ['Medication reconciliation', 'Multimorbidity care plan', 'Consider formal weighted risk score if research/QI'] },
    ],
    pearls: [
      'Some Elixhauser versions split HTN/DM complicated vs not — collapsed here for simplicity.',
      'Charlson and Elixhauser overlap but are not interchangeable.',
    ],
  },

  // ─── 21. Clinical Frailty Scale ────────────────────────────────────────────
  {
    id: 'frailty-clinical',
    name: 'Clinical Frailty Scale (CFS)',
    shortName: 'CFS',
    description: 'Rockwood Clinical Frailty Scale (1–9) for frailty and vulnerability assessment.',
    category: 'geriatrics',
    tags: ['frailty', 'cfs', 'rockwood', 'geriatrics', 'elderly'],
    whenToUse: 'Older adults in acute care, ICU triage context, or outpatient geriatrics for baseline fitness.',
    whyUse: 'Simple pictorial/ordinal scale predicting outcomes better than age alone.',
    inputs: [
      selectInput('cfs', 'Clinical Frailty Scale', [
        { label: '1 — Very fit', value: 1, description: 'Robust; exercises regularly; energetic and active' },
        { label: '2 — Fit / well', value: 2, description: 'Fit; no active disease symptoms; seasonal or occasional activity' },
        { label: '3 — Managing well', value: 3, description: 'Medical problems well controlled; walks only — not regularly active beyond walking' },
        { label: '4 — Living with very mild frailty / vulnerable', value: 4, description: 'Slowed up; symptoms limit activities but not dependent on others for daily help' },
        { label: '5 — Living with mild frailty', value: 5, description: 'Needs help with high-order IADLs (finances, transportation, heavy housework, medications)' },
        { label: '6 — Living with moderate frailty', value: 6, description: 'Needs help with all outside activities and housekeeping; often problems with stairs and bathing' },
        { label: '7 — Living with severe frailty', value: 7, description: 'Completely dependent for personal care but clinically stable (not at high risk of dying within ~6 months)' },
        { label: '8 — Living with very severe frailty', value: 8, description: 'Completely dependent, approaching end of life; typically could not recover from even a minor illness' },
        { label: '9 — Terminally ill', value: 9, description: 'Life expectancy <6 months who are not otherwise living with severe frailty (the 2-week baseline rule does not apply)' },
      ], undefined, 'Score usual function ~2 weeks before this acute illness. CFS 9 is the exception (terminally ill, not otherwise severely frail). Use the descriptors below, not titles alone, to separate 5 vs 6 vs 7 vs 8 vs 9.'),
    ],
    calculate(values) {
      const score = num(values.cfs, 3);
      const map: Record<
        number,
        { label: string; interpretation: string; riskLevel: 'low' | 'moderate' | 'high' | 'critical' | 'info' }
      > = {
        1: {
          label: 'CFS 1 — Very fit',
          interpretation: 'Robust, active, energetic; exercise regularly. Excellent physiologic reserve.',
          riskLevel: 'low',
        },
        2: {
          label: 'CFS 2 — Fit',
          interpretation: 'No active disease symptoms; exercises/active occasionally. Good reserve.',
          riskLevel: 'low',
        },
        3: {
          label: 'CFS 3 — Managing well',
          interpretation: 'Medical problems well controlled; not regularly active beyond walking. Not frail.',
          riskLevel: 'low',
        },
        4: {
          label: 'CFS 4 — Very mild frailty / vulnerable',
          interpretation: 'Not dependent but symptoms limit activities; “slowed up.” Pre-frail/vulnerable — optimize prevention.',
          riskLevel: 'moderate',
        },
        5: {
          label: 'CFS 5 — Mild frailty',
          interpretation: 'More evident slowing; needs help with high-order IADLs (finances, transportation, heavy housework).',
          riskLevel: 'moderate',
        },
        6: {
          label: 'CFS 6 — Moderate frailty',
          interpretation: 'Needs help with all outside activities and keeping house; often problems with stairs and bathing.',
          riskLevel: 'high',
        },
        7: {
          label: 'CFS 7 — Severe frailty',
          interpretation: 'Completely dependent for personal care (from whatever cause). Stable and not at high risk of dying within ~6 months.',
          riskLevel: 'high',
        },
        8: {
          label: 'CFS 8 — Very severe frailty',
          interpretation: 'Completely dependent, approaching end of life; typically could not recover from even minor illness.',
          riskLevel: 'critical',
        },
        9: {
          label: 'CFS 9 — Terminally ill',
          interpretation: 'Approaching end of life; life expectancy <6 months, who are not otherwise living with severe frailty.',
          riskLevel: 'critical',
        },
      };
      const r = map[score] ?? map[3];
      return {
        score,
        unit: 'CFS',
        ...r,
        details: [{ label: 'Common research cut', value: 'CFS ≥5 often = frail' }],
      };
    },
    evidence: {
      summary:
        'Rockwood Clinical Frailty Scale 1–9 rates fitness to terminal illness using function and comorbidity. CFS ≥5 commonly denotes frailty in research; predicts mortality, institutionalization, and length of stay.',
      formula: 'Ordinal judgment 1–9 using CFS descriptors',
      validation: 'Rockwood et al.; widely validated including COVID-era ICU literature.',
      references: [
        {
          title: 'A global clinical measure of fitness and frailty in elderly people',
          citation: 'Rockwood K et al. CMAJ. 2005',
          year: 2005,
          pmid: '16129869',
          doi: '10.1503/cmaj.050051',
        },
      ],
    },
    nextSteps: [
      { condition: 'CFS ≥5', actions: ['Comprehensive geriatric assessment', 'Fall/med review', 'Goals-of-care discussion'] },
      { condition: 'CFS ≥7', actions: ['Palliative needs screen', 'Caregiver support', 'Avoid non-beneficial intensive interventions when discordant with goals'] },
    ],
    pearls: [
      'Score baseline (2 weeks pre-illness), not acute delirium-only state when possible.',
      'CFS is judgment-based — use official pictographs/descriptors for training.',
    ],
  },

  // ─── 22. Fried frailty phenotype ───────────────────────────────────────────
  {
    id: 'fried-frailty',
    name: 'Fried Frailty Phenotype',
    shortName: 'Fried',
    description: 'Fried frailty phenotype count (0–5 criteria): weight loss, exhaustion, weakness, slowness, low activity.',
    category: 'geriatrics',
    tags: ['fried', 'frailty', 'phenotype', 'geriatrics', 'sarcopenia'],
    whenToUse: 'Research or clinic frailty phenotyping when grip strength/gait speed data are available.',
    whyUse: 'Classic biologic frailty phenotype predictive of falls, disability, hospitalization, and death.',
    inputs: [
      yesNo('weightLoss', 'Unintentional weight loss (≥10 lb / ≥4.5 kg in past year)', 1),
      yesNo('exhaustion', 'Exhaustion (CES-D effort/get-going items positive)', 1, 'CES-D: “everything I did was an effort” and “I could not get going.” Positive if either is a moderate amount of the time (3–4 days) or most of the time in the last week.'),
      yesNo('weakness', 'Weakness (low grip strength for sex/BMI)', 1, 'Jamar dynamometer, lowest 20% (Fried 2001). Men: ≤29 kg if BMI ≤24; ≤30 kg if BMI 24.1–26; ≤30 kg if BMI 26.1–28; ≤32 kg if BMI >28. Women: ≤17 kg if BMI ≤23; ≤17.3 kg if BMI 23.1–26; ≤18 kg if BMI 26.1–29; ≤21 kg if BMI >29.'),
      yesNo('slowness', 'Slowness (slow walk time over 15 ft for sex/height)', 1, 'Timed 15-ft (4.57 m) usual-pace walk. Men ≤173 cm: ≥7 s (taller ≥6 s). Women ≤159 cm: ≥7 s (taller ≥6 s).'),
      yesNo('lowActivity', 'Low physical activity (kcal/week below sex cutoffs)', 1, 'Minnesota LTPA: <383 kcal/week in men, <270 kcal/week in women.'),
    ],
    calculate(values) {
      const keys = ['weightLoss', 'exhaustion', 'weakness', 'slowness', 'lowActivity'] as const;
      const score = keys.reduce((s, k) => s + (bool(values[k]) ? 1 : 0), 0);
      let label = '';
      let riskLevel: 'normal' | 'moderate' | 'high' = 'normal';
      let interpretation = '';
      if (score === 0) {
        label = 'Robust (0 criteria)';
        riskLevel = 'normal';
        interpretation = 'No Fried criteria — robust phenotype. Maintain activity, protein intake, and preventive care.';
      } else if (score <= 2) {
        label = 'Pre-frail (1–2)';
        riskLevel = 'moderate';
        interpretation = `Fried count ${score}/5: pre-frail — highest yield window for exercise, nutrition, and comorbidity optimization.`;
      } else {
        label = 'Frail (3–5)';
        riskLevel = 'high';
        interpretation = `Fried count ${score}/5: frail phenotype — multimodal intervention (resistance exercise, nutrition, med review, social support).`;
      }
      return {
        score,
        unit: '/5 criteria',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Robust', value: '0' },
          { label: 'Pre-frail', value: '1–2' },
          { label: 'Frail', value: '≥3' },
        ],
      };
    },
    evidence: {
      summary:
        'Fried phenotype: ≥3 of 5 criteria (weight loss, exhaustion, weakness, slowness, low activity) = frail; 1–2 = intermediate/pre-frail; 0 = robust. Cut points for grip/gait/activity are sex- (and BMI/height)-specific in the original CHS paper.',
      formula: 'Count of positive criteria (0–5)',
      validation: 'Fried LP et al. Cardiovascular Health Study; extensively replicated.',
      references: [
        {
          title: 'Frailty in older adults: evidence for a phenotype',
          citation: 'Fried LP et al. J Gerontol A Biol Sci Med Sci. 2001',
          year: 2001,
          pmid: '11253156',
          doi: '10.1093/gerona/56.3.m146',
        },
      ],
    },
    nextSteps: [
      { condition: 'Pre-frail or frail', actions: ['Resistance + balance exercise', 'Nutrition / protein review', 'Fall risk assessment', 'Deprescribing pass'] },
    ],
    pearls: [
      'This tool assumes criteria already classified positive/negative with proper cutoffs.',
      'Frailty index (deficit accumulation) is a different construct from phenotype.',
    ],
  },

  // ─── 23. Morse Fall Scale ──────────────────────────────────────────────────
  {
    id: 'morse-fall',
    name: 'Morse Fall Scale',
    shortName: 'Morse',
    description: 'Morse Fall Scale (0–125) for inpatient fall risk stratification.',
    category: 'geriatrics',
    tags: ['morse', 'fall', 'nursing', 'inpatient', 'safety'],
    whenToUse: 'Hospital nursing admission and reassessment for fall precautions.',
    whyUse: 'Widely implemented inpatient fall risk tool with actionable cut bands.',
    inputs: [
      selectInput('history', 'History of falling (immediate or within 3 months)', [
        { label: 'No (0)', value: 0, description: 'No fall during this admission and none in the preceding 3 months' },
        { label: 'Yes (25)', value: 25, description: 'Any fall during this hospitalization or in the last 3 months (including the fall that led to admission)' },
      ], undefined, '“Immediate” means a fall this admission; also count any fall in the prior 3 months.'),
      selectInput('secondary', 'Secondary diagnosis (≥2 medical diagnoses)', [
        { label: 'No (0)', value: 0, description: 'Only one medical diagnosis on the problem list' },
        { label: 'Yes (15)', value: 15, description: 'More than one medical diagnosis (comorbidity present)' },
      ]),
      selectInput('ambulatory', 'Ambulatory aid', [
        { label: 'None / bed rest / nurse assist (0)', value: 0, description: 'Walks without a device, is on bed rest, or walks only with nurse assistance (nurse is not scored as an “aid”)' },
        { label: 'Crutches / cane / walker (15)', value: 15, description: 'Uses crutches, a cane, or a walker as a prescribed walking aid' },
        { label: 'Furniture / walls for support (30)', value: 30, description: 'Clutches furniture, walls, or other people for support rather than a prescribed aid — higher-risk gait' },
      ], undefined, 'Score the aid actually used when walking. Furniture-walking is 30, not 15.'),
      selectInput('iv', 'IV / heparin lock', [
        { label: 'No (0)', value: 0, description: 'No intravenous therapy or saline/heparin lock' },
        { label: 'Yes (20)', value: 20, description: 'Any IV infusion or heparin/saline lock currently in place' },
      ]),
      selectInput('gait', 'Gait / transferring', [
        { label: 'Normal / bedrest / immobile (0)', value: 0, description: 'Head erect, arms swinging, stride without hesitation; or bedrest/immobile' },
        { label: 'Weak (10)', value: 10, description: 'Stooped but lifts head without losing balance; short steps; may shuffle' },
        { label: 'Impaired (20)', value: 20, description: 'Difficulty rising from chair (pushes/bounces); head down watching the ground; shuffles; grasps furniture/person/aid and cannot walk without support' },
      ], undefined, 'Observe transfer and gait. Wheelchair: score the gait used when transferring.'),
      selectInput('mental', 'Mental status', [
        { label: 'Oriented to own ability (0)', value: 0, description: 'Patient correctly assesses ability to walk/transfer' },
        { label: 'Overestimates / forgets limits (15)', value: 15, description: 'Claims independence but needs assistance, or forgets limitations' },
      ], undefined, 'Ask: “Are you able to go to the bathroom alone or do you need help?” If they claim independence but need assistance, score overestimates/forgets limits. This is not person/place/time orientation.'),
    ],
    calculate(values) {
      const score =
        num(values.history) +
        num(values.secondary) +
        num(values.ambulatory) +
        num(values.iv) +
        num(values.gait) +
        num(values.mental);
      const r = riskFromThresholds(score, [
        {
          max: 24,
          level: 'low',
          label: 'Low risk (0–24)',
          interpretation: `Morse ${score}: low fall risk — standard safety measures; reassess on status change.`,
        },
        {
          max: 44,
          level: 'moderate',
          label: 'Moderate risk (25–44)',
          interpretation: `Morse ${score}: moderate risk — implement standard fall precautions and toileting schedule.`,
        },
        {
          max: 200,
          level: 'high',
          label: 'High risk (≥45)',
          interpretation: `Morse ${score}: high risk — high-intensity precautions (bed alarm, close observation, non-slip footwear, med review).`,
        },
      ]);
      return {
        score,
        unit: 'points',
        ...r,
        details: [{ label: 'Range', value: '0–125' }],
      };
    },
    evidence: {
      summary:
        'Morse Fall Scale items: fall history (0/25), secondary diagnosis (0/15), ambulatory aid (0/15/30), IV therapy (0/20), gait (0/10/20), mental status (0/15). Common cuts: low <25, moderate 25–44, high ≥45 (some hospitals use ≥50).',
      formula: 'Sum of 6 item scores (0–125)',
      validation: 'Morse JM; widely used nursing fall risk scale with variable predictive performance across wards.',
      references: [
        {
          title: 'A prospective study to identify the fall-prone patient',
          citation: 'Morse JM, Black C, Oberle K, Donahue P. Soc Sci Med. 1989;28:81-86',
          year: 1989,
          pmid: '2928815',
          doi: '10.1016/0277-9536(89)90309-2',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score ≥25', actions: ['Fall precautions bundle', 'Toileting q2h when appropriate', 'Review psychoactive meds'] },
      { condition: 'Score ≥45', actions: ['High-risk protocol', 'Consider sitter/video monitor', 'PT mobility assessment'] },
    ],
    pearls: ['Local cutoffs may differ — follow hospital policy.', 'No scale replaces clinical judgment after sedation or overnight deterioration.'],
  },

  // ─── 24. Hendrich II Fall Risk ─────────────────────────────────────────────
  {
    id: 'hendrich-fall',
    name: 'Hendrich II Fall Risk Model',
    shortName: 'Hendrich II',
    description: 'Hendrich II Fall Risk Model (0–16) for acute-care fall risk.',
    category: 'geriatrics',
    tags: ['hendrich', 'fall', 'nursing', 'inpatient', 'safety'],
    whenToUse: 'Inpatient fall risk screening using Hendrich II (alternative to Morse).',
    whyUse: 'Brief model including confusion, depression, elimination, dizziness, sex, antiepileptics, benzos, and get-up-and-go.',
    inputs: [
      yesNo('confusion', 'Confusion / disorientation / impulsivity', 4, 'Observed at this assessment: confusion, disorientation, or impulsivity (not remote resolved delirium).'),
      yesNo('depression', 'Symptomatic depression', 2, 'Current symptomatic depression. Do not score if in therapeutic control.'),
      yesNo('elimination', 'Altered elimination', 1, 'Incontinence, nocturia, frequency, urgency/stress incontinence, diarrhea or cathartics, or toileting self-care deficit. Foley counts only if those symptoms occur while in place.'),
      yesNo('dizziness', 'Dizziness / vertigo', 1, 'Current dizziness, vertigo, or lightheadedness affecting mobility.'),
      yesNo('male', 'Male sex', 1),
      yesNo('antiepileptic', 'Any prescribed antiepileptic', 2, 'Any scheduled antiepileptic, including non-seizure indications (e.g. gabapentin, valproate for mood/pain).'),
      yesNo('benzo', 'Any prescribed benzodiazepine', 1, 'Any benzodiazepine on the MAR (scheduled or PRN that is being used).'),
      selectInput('getup', 'Get-up-and-go test', [
        { label: 'Able to rise in a single movement (0)', value: 0, description: 'Rises from the chair in one smooth movement without using arms' },
        { label: 'Pushes up, successful in one attempt (1)', value: 1, description: 'Uses arms to push up from the chair or bed but stands on the first try' },
        { label: 'Multiple attempts but successful (3)', value: 3, description: 'Needs more than one attempt (rocks, repositions) but eventually stands without a helper' },
        { label: 'Unable to rise without assistance (4)', value: 4, description: 'Cannot stand without a person assisting — do not coach through a failed attempt' },
      ], undefined, 'Not timed TUG. Sit in a chair (preferred) or on the side of the bed, palms on thighs, stand without assistance. Score how they rise.'),
    ],
    calculate(values) {
      const score =
        (bool(values.confusion) ? 4 : 0) +
        (bool(values.depression) ? 2 : 0) +
        (bool(values.elimination) ? 1 : 0) +
        (bool(values.dizziness) ? 1 : 0) +
        (bool(values.male) ? 1 : 0) +
        (bool(values.antiepileptic) ? 2 : 0) +
        (bool(values.benzo) ? 1 : 0) +
        num(values.getup, 0);
      const high = score >= 5;
      return {
        score,
        unit: 'points',
        label: high ? 'High fall risk (≥5)' : 'Low fall risk (<5)',
        interpretation: high
          ? `Hendrich II score ${score}: HIGH risk (cutoff ≥5). Implement fall-prevention interventions and address modifiable factors (meds, elimination, mobility).`
          : `Hendrich II score ${score}: low risk band (<5). Reassess after clinical change, new sedatives, or nocturnal toileting issues.`,
        riskLevel: high ? 'high' : 'low',
        details: [
          { label: 'Maximum', value: '16' },
          { label: 'High-risk cutoff', value: '≥5' },
        ],
      };
    },
    evidence: {
      summary:
        'Hendrich II: confusion (4), depression (2), altered elimination (1), dizziness (1), male (1), antiepileptics (2), benzodiazepines (1), get-up-and-go (0–4). Score ≥5 = high risk.',
      formula: 'Sum of weighted items (0–16)',
      validation: 'Hendrich et al.; used in many acute-care nursing protocols.',
      references: [
        {
          title: 'Validation of the Hendrich II Fall Risk Model',
          citation: 'Hendrich AL et al. Appl Nurs Res. 2003',
          year: 2003,
          pmid: '12624858',
          doi: '10.1053/apnr.2003.YAPNR2',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score ≥5', actions: ['Fall precautions', 'Benzodiazepine deprescribing review', 'PT / toileting plan'] },
    ],
    pearls: ['Antiepileptic points apply even if used for non-seizure indications.', 'Get-up-and-go observation is critical — do not skip if patient “looks fine” in bed.'],
  },

  // ─── 25. MNA-SF ────────────────────────────────────────────────────────────
  {
    id: 'mna-sf',
    name: 'Mini Nutritional Assessment – Short Form',
    shortName: 'MNA-SF',
    description: 'Scores and interprets the Mini Nutritional Assessment – Short Form (MNA-SF) (0–14) across 6 geriatric screening items.',
    category: 'geriatrics',
    tags: ['mna', 'mna-sf', 'nutrition', 'malnutrition', 'geriatrics'],
    whenToUse: 'Geriatric nutrition screening in outpatient clinics, acute hospital admission, or long-term care settings.',
    whyUse: 'Validated 6-item short form; rapidly identifies older adults malnourished or at risk of malnutrition.',
    inputs: [
      selectInput('entryMode', 'Entry Mode', [
        { label: 'Interactive 6-item screening (recommended)', value: 'survey' },
        { label: 'Direct MNA-SF score override (0–14)', value: 'direct' },
      ], 'survey'),
      selectInput('mna_a', 'A. Has food intake declined over the past 3 months due to loss of appetite, digestive problems, or chewing/swallowing difficulties?', [
        { label: '0 - Severe decrease in food intake', value: 0 },
        { label: '1 - Moderate decrease in food intake', value: 1 },
        { label: '2 - No decrease in food intake', value: 2 },
      ], 2),
      selectInput('mna_b', 'B. Involuntary weight loss during the last 3 months', [
        { label: '0 - Weight loss greater than 3 kg (6.6 lbs)', value: 0 },
        { label: '1 - Does not know', value: 1 },
        { label: '2 - Weight loss between 1 and 3 kg (2.2 and 6.6 lbs)', value: 2 },
        { label: '3 - No weight loss', value: 3 },
      ], 3),
      selectInput('mna_c', 'C. Mobility', [
        { label: '0 - Bed or chair bound', value: 0 },
        { label: '1 - Able to get out of bed/chair but does not go out', value: 1 },
        { label: '2 - Goes out', value: 2 },
      ], 2),
      selectInput('mna_d', 'D. Has suffered psychological stress or acute disease in the past 3 months?', [
        { label: '0 - Yes', value: 0 },
        { label: '2 - No', value: 2 },
      ], 2),
      selectInput('mna_e', 'E. Neuropsychological problems', [
        { label: '0 - Severe dementia or depression', value: 0 },
        { label: '1 - Mild dementia', value: 1 },
        { label: '2 - No psychological problems', value: 2 },
      ], 2),
      selectInput('mna_f', 'F. Body Mass Index (BMI) or Calf Circumference (CC)', [
        { label: '0 - BMI < 19 kg/m² (or CC < 31 cm)', value: 0 },
        { label: '1 - BMI 19 to < 21 kg/m²', value: 1 },
        { label: '2 - BMI 21 to < 23 kg/m²', value: 2 },
        { label: '3 - BMI ≥ 23 kg/m² (or CC ≥ 31 cm)', value: 3 },
      ], 3, 'If BMI is not available, measure calf circumference (CC in cm): 0 if < 31 cm, 3 if ≥ 31 cm.'),
      numberInput('total', 'Direct MNA-SF total override (0–14)', {
        min: 0,
        max: 14,
        step: 1,
        defaultValue: 10,
        helpText: 'Used if Direct score override mode is selected.',
      }),
    ],
    calculate(values) {
      const mode = String(values.entryMode ?? 'survey');
      let score: number;

      if (mode === 'direct' || (values.total !== undefined && values.entryMode === undefined && values.mna_a === undefined)) {
        score = Math.round(Math.min(14, Math.max(0, num(values.total, 10))));
      } else {
        score =
          num(values.mna_a, 2) +
          num(values.mna_b, 3) +
          num(values.mna_c, 2) +
          num(values.mna_d, 2) +
          num(values.mna_e, 2) +
          num(values.mna_f, 3);
      }

      const r = riskFromThresholds(score, [
        {
          max: 7,
          level: 'high',
          label: 'Malnourished (0–7)',
          interpretation: `MNA-SF ${score}/14: malnourished range — nutrition intervention, dietitian referral, evaluate reversible causes.`,
        },
        {
          max: 11,
          level: 'moderate',
          label: 'At risk of malnutrition (8–11)',
          interpretation: `MNA-SF ${score}/14: at risk — monitor intake/weight, consider full MNA, address social and medical drivers.`,
        },
        {
          max: 14,
          level: 'normal',
          label: 'Normal nutritional status (12–14)',
          interpretation: `MNA-SF ${score}/14: normal nutritional status on screen — rescreen with clinical change or routinely in high-risk settings.`,
        },
      ]);
      return {
        score,
        unit: '/14',
        ...r,
        details: [
          { label: 'Items completed', value: '6 items (max 14 points)' },
          { label: 'Thresholds', value: '12–14 Normal, 8–11 At risk, 0–7 Malnourished' },
          { label: 'BMI alternative', value: 'Calf circumference (CC < 31 cm = 0, ≥ 31 cm = 3)' },
        ],
      };
    },
    evidence: {
      summary:
        'MNA-SF scores 0–14: 12–14 normal, 8–11 at risk, 0–7 malnourished. Six items cover intake, weight loss, mobility, acute stress, neuropsych status, and BMI (or calf circumference).',
      formula: 'MNA-SF = A + B + C + D + E + F (0–14)',
      validation: 'Nested in full MNA; validated in community and hospital elderly populations.',
      references: [
        {
          title: 'Screening for undernutrition in geriatric practice: developing the short-form mini-nutritional assessment (MNA-SF)',
          citation: 'Rubenstein LZ et al. J Gerontol A Biol Sci Med Sci. 2001;56:M366-M372',
          year: 2001,
          pmid: '11382797',
          doi: '10.1093/gerona/56.6.m366',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score ≤11', actions: ['Dietitian referral', 'Food intake record', 'Check dentition, swallow, depression, meds'] },
      { condition: 'Score ≤7', actions: ['High-calorie/protein plan', 'Rule out disease-related malnutrition', 'Consider supplements'] },
    ],
    pearls: [
      'Acute illness can lower scores via the stress item even before weight loss accumulates.',
      'Pair with GLIM criteria for formal malnutrition diagnosis when appropriate.',
    ],
  },
];

/** Clamp a score-like value to 0–100. */
function clamp01_100(n: number): number {
  return Math.min(100, Math.max(0, n));
}
