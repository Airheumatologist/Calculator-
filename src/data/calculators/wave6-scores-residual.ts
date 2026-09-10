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
    description: 'Interprets Oswestry Disability Index percentage (0–100%) for low back pain–related disability.',
    category: 'orthopedics',
    tags: ['oswestry', 'odi', 'low back pain', 'disability', 'spine'],
    whenToUse: 'When ODI questionnaire (10 sections × 0–5) has been scored and percent disability is available.',
    whyUse: 'Most widely used condition-specific disability measure for low back pain outcomes and research.',
    inputs: [
      numberInput('pct', 'ODI disability %', {
        min: 0,
        max: 100,
        step: 1,
        defaultValue: 30,
        helpText: 'ODI % = (sum of scored sections / (5 × n scored)) × 100. Omit unanswered sections from denominator.',
      }),
    ],
    calculate(values) {
      const pct = round(clamp01_100(num(values.pct, 0)), 0);
      const r = odiBand(pct);
      return {
        score: pct,
        unit: '%',
        ...r,
        details: [
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
    description: 'Interprets Neck Disability Index percentage (0–100%) for neck pain–related disability.',
    category: 'orthopedics',
    tags: ['ndi', 'neck', 'cervical', 'disability', 'spine'],
    whenToUse: 'When NDI (10 sections) has been administered for neck pain, whiplash, or cervical radiculopathy follow-up.',
    whyUse: 'Standard neck-specific disability PRO; mirrors Oswestry structure.',
    inputs: [
      numberInput('pct', 'NDI disability %', {
        min: 0,
        max: 100,
        step: 1,
        defaultValue: 28,
        helpText: 'NDI % = (sum / (5 × n answered)) × 100; raw total 0–50 is sometimes reported instead',
      }),
    ],
    calculate(values) {
      const pct = round(clamp01_100(num(values.pct, 0)), 0);
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
      return {
        score: pct,
        unit: '%',
        ...r,
        details: [
          { label: 'Raw equivalent (if 10 answered)', value: `${round(pct / 2, 1)} / 50` },
          { label: 'MCID (approx)', value: '~5–10 raw points / ~10–20% depending on population' },
        ],
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
    description: 'Interprets Disabilities of the Arm, Shoulder and Hand (DASH) total (0–100; higher = worse).',
    category: 'orthopedics',
    tags: ['dash', 'upper extremity', 'shoulder', 'hand', 'disability'],
    whenToUse: 'When the 30-item DASH disability/symptom score has been computed for arm/shoulder/hand conditions.',
    whyUse: 'Gold-standard region-specific PRO for upper-limb function across diagnoses.',
    inputs: [
      numberInput('total', 'DASH disability/symptom score', {
        min: 0,
        max: 100,
        step: 0.1,
        defaultValue: 35,
        helpText: 'DASH = ((sum of n responses / n) − 1) × 25; need ≥27 of 30 items',
      }),
    ],
    calculate(values) {
      const score = round(clamp01_100(num(values.total, 0)), 1);
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
      return {
        score,
        unit: '0–100',
        ...r,
        details: [
          { label: 'Direction', value: 'Higher = more disability' },
          { label: 'Optional modules', value: 'Work / sport-music scored separately (not in this total)' },
        ],
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
    description: 'Interprets QuickDASH disability/symptom score (0–100; higher = worse) from 11 items.',
    category: 'orthopedics',
    tags: ['quickdash', 'dash', 'upper extremity', 'hand', 'shoulder'],
    whenToUse: 'Brief upper-extremity PRO when full DASH is too long; same 0–100 metric family.',
    whyUse: '11-item short form correlates highly with full DASH and is practical in clinic.',
    inputs: [
      numberInput('total', 'QuickDASH score', {
        min: 0,
        max: 100,
        step: 0.1,
        defaultValue: 32,
        helpText: 'QuickDASH = ((sum of n / n) − 1) × 25; need ≥10 of 11 items',
      }),
    ],
    calculate(values) {
      const score = round(clamp01_100(num(values.total, 0)), 1);
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
      return {
        score,
        unit: '0–100',
        ...r,
        details: [{ label: 'Items', value: '11 disability/symptom (+ optional work/sport modules)' }],
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
    description: 'Interprets Western Ontario and McMaster Universities Osteoarthritis Index total (classic Likert 0–96).',
    category: 'orthopedics',
    tags: ['womac', 'osteoarthritis', 'knee', 'hip', 'function'],
    whenToUse: 'When WOMAC pain + stiffness + function subscales have been summed for hip/knee OA.',
    whyUse: 'Core PRO for hip and knee osteoarthritis trials and clinic outcomes.',
    inputs: [
      numberInput('total', 'WOMAC total (0–96 Likert)', {
        min: 0,
        max: 96,
        step: 1,
        defaultValue: 40,
        helpText: 'Pain 0–20 + stiffness 0–8 + function 0–68 (5-point Likert). VAS/normalized 0–100 versions differ — convert first.',
      }),
      numberInput('pain', 'Pain subscale (optional)', {
        min: 0,
        max: 20,
        step: 1,
        defaultValue: 8,
        helpText: '5 items × 0–4',
        required: false,
      }),
      numberInput('function', 'Function subscale (optional)', {
        min: 0,
        max: 68,
        step: 1,
        defaultValue: 28,
        helpText: '17 items × 0–4',
        required: false,
      }),
    ],
    calculate(values) {
      const score = round(Math.min(96, Math.max(0, num(values.total, 0))), 0);
      const pain = num(values.pain, NaN);
      const func = num(values.function, NaN);
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
        { label: 'Subscales', value: 'Pain 0–20, stiffness 0–8, function 0–68' },
      ];
      if (Number.isFinite(pain)) details.push({ label: 'Pain entered', value: `${pain}/20` });
      if (Number.isFinite(func)) details.push({ label: 'Function entered', value: `${func}/68` });
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
    description: 'Interprets International Knee Documentation Committee subjective score (0–100; higher = better).',
    category: 'orthopedics',
    tags: ['ikdc', 'knee', 'acl', 'sports', 'ortho'],
    whenToUse: 'When IKDC subjective form has been scored after knee injury, ACL reconstruction, or cartilage treatment.',
    whyUse: 'Standard sports-knee PRO spanning symptoms, sports activity, and function.',
    inputs: [
      numberInput('total', 'IKDC subjective total', {
        min: 0,
        max: 100,
        step: 0.1,
        defaultValue: 65,
        helpText: 'Transformed score 0–100; higher = better function',
      }),
    ],
    calculate(values) {
      const score = round(clamp01_100(num(values.total, 0)), 1);
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
      return {
        score,
        unit: '/100',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Direction', value: 'Higher = better' },
          { label: 'MCID (approx)', value: '~6–16 points (population-dependent)' },
        ],
      };
    },
    evidence: {
      summary:
        'IKDC Subjective Knee Form transformed to 0–100 (100 = no limitation). Covers symptoms, sports, and daily function; cornerstone ACL/sports knee outcome.',
      formula: 'User-entered transformed IKDC (0–100)',
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
    description: 'Interprets EASI total (0–72) for atopic dermatitis severity.',
    category: 'dermatology',
    tags: ['easi', 'eczema', 'atopic dermatitis', 'dermatology', 'severity'],
    whenToUse: 'When regional EASI components have been scored for AD trials or treat-to-target clinic care.',
    whyUse: 'Core clinician-reported AD severity endpoint in modern dermatology trials and guidelines.',
    inputs: [
      numberInput('total', 'EASI total', {
        min: 0,
        max: 72,
        step: 0.1,
        defaultValue: 16,
        helpText: 'Sum of region scores: head/neck, trunk, upper limbs, lower limbs (0–72)',
      }),
    ],
    calculate(values) {
      const score = round(Math.min(72, Math.max(0, num(values.total, 0))), 1);
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
      return {
        score,
        unit: '0–72',
        ...r,
        details: [
          { label: 'EASI-50 / EASI-75', value: '≥50% / ≥75% improvement from baseline (trial endpoints)' },
          { label: 'Regions', value: 'Head/neck, trunk, UE, LE with area × severity weights' },
        ],
      };
    },
    evidence: {
      summary:
        'EASI combines erythema, edema/papulation, excoriation, and lichenification with body-region area scores (total 0–72). Severity bands (clear/mild/moderate/severe/very severe) are widely used educationally (e.g., Leshem et al.).',
      formula: 'User-entered EASI total 0–72',
      validation: 'Validated clinician AD score; primary endpoint family in AD RCTs.',
      references: [
        {
          title: 'What is the EASI?',
          citation: 'Hanifin JM et al. Exp Dermatol. 2001 / severity banding literature',
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
    description: 'Interprets SCORAD total (0–103) for atopic dermatitis severity.',
    category: 'dermatology',
    tags: ['scorad', 'eczema', 'atopic dermatitis', 'dermatology'],
    whenToUse: 'When SCORAD (extent A, intensity B, subjective C) has been calculated.',
    whyUse: 'Classic European composite AD severity score including itch and sleep.',
    inputs: [
      numberInput('total', 'SCORAD total', {
        min: 0,
        max: 103,
        step: 0.1,
        defaultValue: 35,
        helpText: 'SCORAD = A/5 + 7B/2 + C (max 103)',
      }),
    ],
    calculate(values) {
      const score = round(Math.min(103, Math.max(0, num(values.total, 0))), 1);
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
      return {
        score,
        unit: '0–103',
        ...r,
        details: [
          { label: 'Components', value: 'A extent (BSA), B intensity (6 signs), C pruritus + sleep (VAS)' },
          { label: 'Objective SCORAD', value: 'Excludes subjective C (max 83)' },
        ],
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
      }),
      selectInput('context', 'Clinical context', [
        { label: 'Screening / no known glaucoma', value: 'screen' },
        { label: 'Known glaucoma / ocular hypertension', value: 'glaucoma' },
        { label: 'Post-op / acute symptoms', value: 'acute' },
      ]),
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
          citation: 'AAO PPP / glaucoma society guidance',
          year: 2020,
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
        min: 10,
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
    description: 'Interprets Voice Handicap Index-10 total (0–40) for patient-perceived voice handicap.',
    category: 'otolaryngology',
    tags: ['vhi-10', 'voice', 'dysphonia', 'ent', 'laryngology'],
    whenToUse: 'When VHI-10 questionnaire has been completed for dysphonia or post-laryngeal treatment follow-up.',
    whyUse: 'Brief, validated voice-related quality-of-life / handicap measure used in ENT clinics.',
    inputs: [
      numberInput('total', 'VHI-10 total', {
        min: 0,
        max: 40,
        step: 1,
        defaultValue: 12,
        helpText: 'Sum of 10 items scored 0–4 (0=never, 4=always)',
      }),
    ],
    calculate(values) {
      const score = Math.round(Math.min(40, Math.max(0, num(values.total, 0))));
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
          { label: 'Item scale', value: '0 never – 4 always' },
          { label: 'Common abnormal cutoff', value: '≥11 (population-dependent)' },
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
          title: 'Validation of the Voice Handicap Index-10',
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
      selectInput(
        'method',
        'PTA method',
        [
          { label: '3-frequency (0.5, 1, 2 kHz)', value: '3' },
          { label: '4-frequency (0.5, 1, 2, 4 kHz)', value: '4' },
        ],
        '3'
      ),
      numberInput('f500', '500 Hz threshold', { unit: 'dB HL', min: -10, max: 120, step: 5, defaultValue: 20 }),
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
      validation: 'Standard audiometric summary; WHO and ASHA degree scales are closely related educational bands.',
      references: [
        {
          title: 'Grades of hearing impairment',
          citation: 'WHO / audiology society degree of hearing loss classifications',
          year: 2021,
          url: 'https://www.who.int/news-room/fact-sheets/detail/deafness-and-hearing-loss',
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
        { label: 'No (0)', value: 0 },
        { label: 'Yes (1)', value: 1 },
        { label: 'Do not know (0)', value: 0 },
      ]),
      selectInput('snoreLoud', 'Snoring loudness', [
        { label: 'N/A or slightly louder than breathing (0)', value: 0 },
        { label: 'As loud as talking (0)', value: 0 },
        { label: 'Louder than talking (1)', value: 1 },
        { label: 'Very loud — heard in adjacent rooms (1)', value: 1 },
      ]),
      selectInput('snoreFreq', 'Snoring frequency', [
        { label: 'Never / nearly never (0)', value: 0 },
        { label: '1–2 times/month (0)', value: 0 },
        { label: '1–2 times/week (0)', value: 0 },
        { label: '3–4 times/week (1)', value: 1 },
        { label: 'Nearly every day (1)', value: 1 },
      ]),
      selectInput('bothers', 'Has snoring bothered others?', [
        { label: 'No (0)', value: 0 },
        { label: 'Yes (1)', value: 1 },
      ]),
      selectInput('quitBreath', 'Anyone noticed you quit breathing in sleep?', [
        { label: 'Never / nearly never (0)', value: 0 },
        { label: '1–2×/month (0)', value: 0 },
        { label: '1–2×/week (0)', value: 0 },
        { label: '3–4×/week (1)', value: 1 },
        { label: 'Nearly every day (1)', value: 1 },
      ]),
      // Category 2 — sleepiness
      selectInput('tiredWake', 'Tired/fatigued after sleep?', [
        { label: 'Never / nearly never (0)', value: 0 },
        { label: '1–2×/month (0)', value: 0 },
        { label: '1–2×/week (0)', value: 0 },
        { label: '3–4×/week (1)', value: 1 },
        { label: 'Nearly every day (1)', value: 1 },
      ]),
      selectInput('tiredDay', 'Tired/fatigued during wake time?', [
        { label: 'Never / nearly never (0)', value: 0 },
        { label: '1–2×/month (0)', value: 0 },
        { label: '1–2×/week (0)', value: 0 },
        { label: '3–4×/week (1)', value: 1 },
        { label: 'Nearly every day (1)', value: 1 },
      ]),
      selectInput('nodrive', 'Fallen asleep while driving?', [
        { label: 'Never (0)', value: 0 },
        { label: 'Yes, any frequency (1)', value: 1 },
      ]),
      // Category 3
      yesNo('htn', 'High blood pressure (diagnosed/treated)', 1),
      numberInput('bmi', 'BMI', { unit: 'kg/m²', min: 12, max: 80, step: 0.1, defaultValue: 32 }),
    ],
    calculate(values) {
      const cat1 =
        num(values.snore) +
        num(values.snoreLoud) +
        num(values.snoreFreq) +
        num(values.bothers) +
        num(values.quitBreath);
      const cat2 = num(values.tiredWake) + num(values.tiredDay) + num(values.nodrive);
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
    description: 'Interprets COPD Assessment Test total (0–40) for symptom burden.',
    category: 'pulmonary',
    tags: ['cat', 'copd', 'symptoms', 'gold', 'quality of life'],
    whenToUse: 'Routine COPD visits to quantify symptoms and guide GOLD ABE grouping / treatment intensity.',
    whyUse: '8-item validated symptom score preferred in GOLD for impact assessment (with mMRC).',
    inputs: [
      numberInput('total', 'CAT total', {
        min: 0,
        max: 40,
        step: 1,
        defaultValue: 15,
        helpText: 'Sum of 8 items scored 0–5 each',
      }),
    ],
    calculate(values) {
      const score = Math.round(Math.min(40, Math.max(0, num(values.total, 0))));
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
          { label: 'GOLD more symptoms', value: 'CAT ≥10 (or mMRC ≥2)' },
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
      numberInput('age', 'Age', { unit: 'years', min: 40, max: 100, defaultValue: 68 }),
      selectInput('mmrc', 'mMRC dyspnea grade', [
        { label: '0 — Dyspnea only with strenuous exercise (0 pts)', value: 0 },
        { label: '1 — Dyspnea when hurrying / walking up slight hill (1)', value: 1 },
        { label: '2 — Walks slower than peers / stops on level (2)', value: 2 },
        { label: '3 — Stops after ~100 m or few minutes (3)', value: 3 },
        { label: '4 — Too dyspneic to leave house / dress (4)', value: 4 },
      ]),
      numberInput('fev1', 'FEV1 % predicted', {
        unit: '%',
        min: 10,
        max: 120,
        defaultValue: 45,
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
          title: 'Expansion of the prognostic assessment of patients with chronic obstructive pulmonary disease: the updated ADO index',
          citation: 'Puhan MA et al. Lancet. 2009 / Eur Respir J updates',
          year: 2009,
          pmid: '19716962',
          doi: '10.1016/S0140-6736(09)61301-5',
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
      }),
      selectInput('ratioOk', 'FEV1/FVC < 0.7 (post-BD) confirmed?', [
        { label: 'Yes — COPD obstruction present', value: 'yes' },
        { label: 'No / unknown — interpret grade cautiously', value: 'no' },
      ]),
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
          title: 'Global Strategy for Prevention, Diagnosis and Management of COPD',
          citation: 'GOLD Report',
          year: 2024,
          url: 'https://goldcopd.org/',
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
    description: 'Interprets Asthma Control Test total (5–25) for symptom control over 4 weeks.',
    category: 'pulmonary',
    tags: ['act', 'asthma', 'control', 'gina'],
    whenToUse: 'Clinic visits to assess asthma control and step therapy decisions.',
    whyUse: '5-item validated patient questionnaire; cutoff ≤19 identifies uncontrolled asthma.',
    inputs: [
      numberInput('total', 'ACT total', {
        min: 5,
        max: 25,
        step: 1,
        defaultValue: 18,
        helpText: 'Sum of 5 items (each 1–5); 25 = complete control',
      }),
    ],
    calculate(values) {
      const score = Math.round(Math.min(25, Math.max(5, num(values.total, 18))));
      let riskLevel: 'normal' | 'low' | 'moderate' | 'high' = 'normal';
      let label = '';
      let interpretation = '';
      if (score >= 25) {
        riskLevel = 'normal';
        label = 'Total control (25)';
        interpretation = `ACT ${score}: totally controlled asthma over past 4 weeks — maintain therapy and written action plan.`;
      } else if (score >= 20) {
        riskLevel = 'low';
        label = 'Well controlled (20–24)';
        interpretation = `ACT ${score}: well controlled — continue current regimen; address any residual triggers.`;
      } else if (score >= 16) {
        riskLevel = 'moderate';
        label = 'Not well controlled (16–19)';
        interpretation = `ACT ${score}: not well controlled (classic cut ≤19). Review adherence, technique, comorbidities; step-up per GINA/NAEPP.`;
      } else {
        riskLevel = 'high';
        label = 'Very poorly controlled (≤15)';
        interpretation = `ACT ${score}: very poorly controlled — prompt step-up, exacerbation risk counseling, specialty referral if refractory.`;
      }
      return {
        score,
        unit: '/25',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Uncontrolled cutoff', value: '≤19' },
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
    description: 'Interprets Asthma Control Questionnaire mean score (0–6; higher = worse control).',
    category: 'pulmonary',
    tags: ['acq', 'asthma', 'control', 'juniper'],
    whenToUse: 'When ACQ-5, ACQ-6, or ACQ-7 mean has been calculated for research or specialty clinic.',
    whyUse: 'Juniper ACQ is a standard continuous control metric in asthma trials.',
    inputs: [
      numberInput('total', 'ACQ mean score', {
        min: 0,
        max: 6,
        step: 0.01,
        defaultValue: 1.2,
        helpText: 'Mean of items (0 = totally controlled, 6 = severely uncontrolled). ACQ-5/6/7 means are interpreted similarly.',
      }),
      selectInput('version', 'Version (informational)', [
        { label: 'ACQ-5 (symptoms only)', value: '5' },
        { label: 'ACQ-6 (+ rescue bronchodilator)', value: '6' },
        { label: 'ACQ-7 (+ FEV1 %)', value: '7' },
      ]),
    ],
    calculate(values) {
      const score = round(Math.min(6, Math.max(0, num(values.total, 0))), 2);
      const version = String(values.version ?? '5');
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
          { label: 'Well / not well cuts', value: '≤0.75 / ≥1.5' },
        ],
      };
    },
    evidence: {
      summary:
        'ACQ mean score 0–6 (higher worse). Common interpretive cuts: ≤0.75 well controlled, ≥1.5 not well controlled; MCID 0.5. ACQ-5/6/7 variants differ by rescue use and FEV1 item.',
      formula: 'User-entered ACQ mean (0–6)',
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
      yesNo('daySx', 'Daytime asthma symptoms more than twice/week?', 1),
      yesNo('night', 'Any night waking due to asthma?', 1),
      yesNo('reliever', 'SABA reliever needed more than twice/week?', 1),
      yesNo('activity', 'Any activity limitation due to asthma?', 1),
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
          title: 'Global Strategy for Asthma Management and Prevention',
          citation: 'GINA Report',
          year: 2024,
          url: 'https://ginasthma.org/',
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
      yesNo('chf', 'Congestive heart failure', 1),
      yesNo('arrhythmia', 'Cardiac arrhythmias', 1),
      yesNo('valve', 'Valvular disease', 1),
      yesNo('pulmCirc', 'Pulmonary circulation disorders', 1),
      yesNo('pvd', 'Peripheral vascular disease', 1),
      yesNo('htn', 'Hypertension (uncomplicated or complicated)', 1),
      yesNo('paralysis', 'Paralysis', 1),
      yesNo('neuro', 'Other neurological disorders', 1),
      yesNo('cpd', 'Chronic pulmonary disease', 1),
      yesNo('dm', 'Diabetes (uncomplicated or complicated)', 1),
      yesNo('hypothyroid', 'Hypothyroidism', 1),
      yesNo('renal', 'Renal failure', 1),
      yesNo('liver', 'Liver disease', 1),
      yesNo('ulcer', 'Peptic ulcer disease excluding bleeding', 1),
      yesNo('aids', 'AIDS/HIV', 1),
      yesNo('lymphoma', 'Lymphoma', 1),
      yesNo('cancerMet', 'Metastatic cancer', 1),
      yesNo('cancerSolid', 'Solid tumor without metastasis', 1),
      yesNo('rheum', 'Rheumatoid arthritis / collagen vascular', 1),
      yesNo('coag', 'Coagulopathy', 1),
      yesNo('obesity', 'Obesity', 1),
      yesNo('weightLoss', 'Weight loss', 1),
      yesNo('electrolyte', 'Fluid and electrolyte disorders', 1),
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
        { label: '1 — Very fit', value: 1 },
        { label: '2 — Fit / well', value: 2 },
        { label: '3 — Managing well', value: 3 },
        { label: '4 — Living with very mild frailty / vulnerable', value: 4 },
        { label: '5 — Living with mild frailty', value: 5 },
        { label: '6 — Living with moderate frailty', value: 6 },
        { label: '7 — Living with severe frailty', value: 7 },
        { label: '8 — Living with very severe frailty', value: 8 },
        { label: '9 — Terminally ill', value: 9 },
      ]),
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
      yesNo('exhaustion', 'Exhaustion (CES-D effort/get-going items positive)', 1),
      yesNo('weakness', 'Weakness (low grip strength for sex/BMI)', 1),
      yesNo('slowness', 'Slowness (slow walk time over 15 ft for sex/height)', 1),
      yesNo('lowActivity', 'Low physical activity (kcal/week below sex cutoffs)', 1),
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
        { label: 'No (0)', value: 0 },
        { label: 'Yes (25)', value: 25 },
      ]),
      selectInput('secondary', 'Secondary diagnosis (≥2 medical diagnoses)', [
        { label: 'No (0)', value: 0 },
        { label: 'Yes (15)', value: 15 },
      ]),
      selectInput('ambulatory', 'Ambulatory aid', [
        { label: 'None / bed rest / nurse assist (0)', value: 0 },
        { label: 'Crutches / cane / walker (15)', value: 15 },
        { label: 'Furniture / walls for support (30)', value: 30 },
      ]),
      selectInput('iv', 'IV / heparin lock', [
        { label: 'No (0)', value: 0 },
        { label: 'Yes (20)', value: 20 },
      ]),
      selectInput('gait', 'Gait / transferring', [
        { label: 'Normal / bedrest / immobile (0)', value: 0 },
        { label: 'Weak (10)', value: 10 },
        { label: 'Impaired (20)', value: 20 },
      ]),
      selectInput('mental', 'Mental status', [
        { label: 'Oriented to own ability (0)', value: 0 },
        { label: 'Overestimates / forgets limits (15)', value: 15 },
      ]),
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
      yesNo('confusion', 'Confusion / disorientation / impulsivity', 4),
      yesNo('depression', 'Symptomatic depression', 2),
      yesNo('elimination', 'Altered elimination', 1),
      yesNo('dizziness', 'Dizziness / vertigo', 1),
      yesNo('male', 'Male sex', 1),
      yesNo('antiepileptic', 'Any prescribed antiepileptic', 2),
      yesNo('benzo', 'Any prescribed benzodiazepine', 1),
      selectInput('getup', 'Get-up-and-go test', [
        { label: 'Able to rise in a single movement (0)', value: 0 },
        { label: 'Pushes up, successful in one attempt (1)', value: 1 },
        { label: 'Multiple attempts but successful (3)', value: 3 },
        { label: 'Unable to rise without assistance (4)', value: 4 },
      ]),
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
    description: 'Interprets MNA-SF total (0–14) for malnutrition risk in older adults.',
    category: 'geriatrics',
    tags: ['mna', 'mna-sf', 'nutrition', 'malnutrition', 'geriatrics'],
    whenToUse: 'Geriatric nutrition screening in clinic, hospital, or long-term care.',
    whyUse: 'Validated 6-item short form; identifies malnutrition risk quickly for full MNA or dietitian referral.',
    inputs: [
      numberInput('total', 'MNA-SF total', {
        min: 0,
        max: 14,
        step: 1,
        defaultValue: 10,
        helpText: 'Sum of 6 items (appetite, weight loss, mobility, stress/acute disease, neuropsychological, BMI or calf circumference)',
      }),
    ],
    calculate(values) {
      const score = Math.round(Math.min(14, Math.max(0, num(values.total, 10))));
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
          { label: 'Items', value: '6 (max 14 points)' },
          { label: 'BMI alternative', value: 'Calf circumference if BMI unavailable' },
        ],
      };
    },
    evidence: {
      summary:
        'MNA-SF scores 0–14: 12–14 normal, 8–11 at risk, 0–7 malnourished. Six items cover intake, weight loss, mobility, acute stress, neuropsych status, and BMI (or calf circumference).',
      formula: 'User-entered MNA-SF total (0–14)',
      validation: 'Nested in full MNA; validated in community and hospital elderly populations.',
      references: [
        {
          title: 'Overview of the MNA – Its history and challenges',
          citation: 'Vellas B et al. / Rubenstein LZ et al. J Nutr Health Aging. MNA-SF validation',
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
