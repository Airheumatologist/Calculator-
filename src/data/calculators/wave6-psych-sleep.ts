import type { Calculator } from '../../types/calculator';
import { num, bool, round, yesNo, selectInput, numberInput, riskFromThresholds } from '../../utils/helpers';

export const wave6PsychSleepCalcs: Calculator[] = [
  // ─── 1. PDSS (Panic Disorder Severity Scale) ───────────────────────────────
  {
    id: 'panic-pdss',
    name: 'Panic Disorder Severity Scale (PDSS) Total',
    shortName: 'PDSS',
    description:
      'Interprets Panic Disorder Severity Scale total (0–28) for panic disorder symptom severity and response tracking.',
    category: 'psychiatry',
    tags: ['pdss', 'panic', 'anxiety', 'severity', 'psychiatry'],
    whenToUse:
      'After clinician- or self-rated PDSS administration in patients with panic disorder; enter the total score.',
    whyUse:
      'Brief 7-item scale (0–4 each) quantifies attack frequency, distress, anticipatory anxiety, avoidance, and impairment.',
    inputs: [
      numberInput('score', 'PDSS total (0–28)', {
        min: 0,
        max: 28,
        defaultValue: 10,
        helpText: '7 items scored 0–4 (none → extreme)',
      }),
    ],
    calculate(values) {
      const score = num(values.score, 10);
      const r = riskFromThresholds(score, [
        {
          max: 1,
          level: 'normal',
          label: 'Normal / remission range',
          interpretation: `PDSS ${score}/28: normal or remission-range symptoms. Continue maintenance plan and relapse surveillance.`,
        },
        {
          max: 5,
          level: 'low',
          label: 'Borderline / mild residual',
          interpretation: `PDSS ${score}/28: borderline ill / mild residual symptoms. Optimize therapy adherence; consider stepped-care adjustments.`,
        },
        {
          max: 9,
          level: 'moderate',
          label: 'Mild panic disorder',
          interpretation: `PDSS ${score}/28: mild panic disorder severity. CBT (exposure-based) ± SSRI/SNRI; track functional avoidance.`,
        },
        {
          max: 13,
          level: 'moderate',
          label: 'Moderate panic disorder',
          interpretation: `PDSS ${score}/28: moderate severity. Structured CBT, pharmacotherapy review, and safety-behavior reduction recommended.`,
        },
        {
          max: 16,
          level: 'high',
          label: 'Marked severity',
          interpretation: `PDSS ${score}/28: marked severity. Intensify treatment (combined CBT + meds), address comorbidity (depression, agoraphobia).`,
        },
        {
          max: 28,
          level: 'critical',
          label: 'Severe panic disorder',
          interpretation: `PDSS ${score}/28: severe symptoms. Comprehensive treatment; assess for high avoidance, ED overuse, suicidality, and substance coping.`,
        },
      ]);
      return {
        score,
        unit: '/28',
        ...r,
        details: [
          { label: 'Items', value: '7 × 0–4' },
          { label: 'Bands (approx.)', value: '0–1 normal; 2–5 borderline; 6–9 mild; 10–13 mod; 14–16 marked; ≥17 severe' },
          { label: 'Response often cited', value: '≥40% reduction from baseline' },
        ],
        recommendations: [
          'Score does not replace DSM diagnosis',
          'Assess medical mimics (thyroid, arrhythmia, PE, substance)',
          'Track anticipatory anxiety and agoraphobic avoidance separately when planning exposure',
        ],
      };
    },
    evidence: {
      summary:
        'PDSS is a 7-item clinician scale (also self-report variants) summing to 0–28. Severity bands and ≥40% reduction as response are commonly used in research and practice.',
      formula: 'Enter total of 7 items (each 0–4); range 0–28',
      validation:
        'Validated for panic disorder severity, treatment response, and remission tracking; correlates with CGI and other anxiety measures.',
      references: [
        {
          title: 'Multicenter collaborative panic disorder severity scale',
          citation: 'Shear MK et al. Am J Psychiatry. 1997;154:1571-1575',
          year: 1997,
          pmid: '9356566',
          doi: '10.1176/ajp.154.11.1571',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'PDSS ≥10 or impairing avoidance',
        actions: ['Offer CBT with interoceptive/situational exposure', 'Consider SSRI/SNRI', 'Psychoeducation on panic cycle', 'Limit unnecessary benzo escalation'],
      },
      {
        condition: 'Severe / treatment-resistant',
        actions: ['Combined therapy', 'Comorbidity workup', 'Specialty anxiety referral'],
      },
    ],
    pearls: [
      'Item domains: panic frequency, distress, anticipatory anxiety, agoraphobic avoidance, interoceptive avoidance, work, social impairment.',
      'Remission often operationalized near PDSS ≤3 with clinical stability.',
    ],
  },

  // ─── 2. LSAS (Liebowitz Social Anxiety Scale) ──────────────────────────────
  {
    id: 'lsas-social',
    name: 'Liebowitz Social Anxiety Scale (LSAS) Total',
    shortName: 'LSAS',
    description:
      'Interprets LSAS total (0–144) for social anxiety severity from summed fear and avoidance ratings.',
    category: 'psychiatry',
    tags: ['lsas', 'social anxiety', 'sad', 'phobia', 'severity'],
    whenToUse: 'After LSAS (clinician or self-report) completion; enter combined fear + avoidance total.',
    whyUse: 'Standard severity metric for social anxiety disorder research and treatment monitoring.',
    inputs: [
      numberInput('score', 'LSAS total (0–144)', {
        min: 0,
        max: 144,
        defaultValue: 55,
        helpText: '24 situations × (fear 0–3 + avoidance 0–3)',
      }),
    ],
    calculate(values) {
      const score = num(values.score, 55);
      const r = riskFromThresholds(score, [
        {
          max: 29,
          level: 'normal',
          label: 'None / very mild social anxiety',
          interpretation: `LSAS ${score}/144: below common social anxiety disorder screening thresholds (often ≥30). Clinical context still matters.`,
        },
        {
          max: 49,
          level: 'low',
          label: 'Mild social anxiety',
          interpretation: `LSAS ${score}/144: mild range. Psychoeducation, CBT skills, and situational exposure as needed.`,
        },
        {
          max: 64,
          level: 'moderate',
          label: 'Moderate social anxiety',
          interpretation: `LSAS ${score}/144: moderate social anxiety — structured CBT (exposure + cognitive restructuring) ± SSRI first-line options.`,
        },
        {
          max: 79,
          level: 'high',
          label: 'Marked social anxiety',
          interpretation: `LSAS ${score}/144: marked severity with likely substantial avoidance. Combined psychological and pharmacologic treatment often warranted.`,
        },
        {
          max: 94,
          level: 'high',
          label: 'Severe social anxiety',
          interpretation: `LSAS ${score}/144: severe symptoms. Intensive CBT, med optimization, and functional rehabilitation (work/school).`,
        },
        {
          max: 144,
          level: 'critical',
          label: 'Very severe social anxiety',
          interpretation: `LSAS ${score}/144: very severe range. Comprehensive care; assess depression, substance use, and disability supports.`,
        },
      ]);
      return {
        score,
        unit: '/144',
        ...r,
        details: [
          { label: 'Structure', value: '24 items × fear + avoidance (each 0–3)' },
          { label: 'Common SAD cutoff', value: 'Total ≥30 often suggests social anxiety disorder' },
          { label: 'Bands', value: '<30 none/mild; 30–49 mild; 50–64 mod; 65–79 marked; 80–94 severe; ≥95 very severe' },
        ],
      };
    },
    evidence: {
      summary:
        'LSAS rates fear and avoidance across 24 performance/social situations (total 0–144). Widely used severity bands guide interpretation; ≥30 is a common diagnostic screening threshold.',
      formula: 'Sum fear (0–3) + avoidance (0–3) for 24 situations = 0–144',
      validation: 'Extensively validated in social anxiety disorder trials; sensitive to treatment change.',
      references: [
        {
          title: 'Social phobia: review of a neglected anxiety disorder',
          citation: 'Liebowitz MR. Arch Gen Psychiatry / LSAS development literature; subsequent validation studies',
          year: 1987,
          pmid: '3324159',
          doi: '10.1016/s0033-3182(87)72520-1',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'LSAS ≥30 with functional impairment',
        actions: ['Confirm SAD criteria', 'CBT with graded exposure', 'Consider SSRI/SNRI', 'Limit alcohol safety-behavior use'],
      },
      {
        condition: 'LSAS ≥65',
        actions: ['Combined treatment', 'Assess for avoidant personality traits / depression', 'Specialty referral if refractory'],
      },
    ],
    pearls: [
      'Fear and avoidance subscales can be reported separately (each 0–72).',
      'Performance-only vs generalized patterns matter for exposure hierarchy design.',
    ],
  },

  // ─── 3. EAT-26 ─────────────────────────────────────────────────────────────
  {
    id: 'eat-26',
    name: 'EAT-26 Eating Attitudes Total',
    shortName: 'EAT-26',
    description:
      'Interprets Eating Attitudes Test-26 total (0–78) as a screening aid for disordered eating attitudes.',
    category: 'psychiatry',
    tags: ['eat-26', 'eating disorder', 'anorexia', 'bulimia', 'screening'],
    whenToUse: 'After patient completes EAT-26; enter total for referral-threshold interpretation.',
    whyUse: 'Widely used eating-disorder attitude screen; total ≥20 commonly prompts clinical evaluation.',
    inputs: [
      numberInput('score', 'EAT-26 total (0–78)', {
        min: 0,
        max: 78,
        defaultValue: 18,
        helpText: '26 items; standard scored 0–3 after reverse coding of designated items',
      }),
      yesNo('behaviors', 'Behavioral flags present (binge, purge, laxatives, extreme exercise, weight loss >20 lb / high concern)', 0),
      numberInput('bmi', 'BMI (optional context)', {
        min: 10,
        max: 60,
        step: 0.1,
        defaultValue: 22,
        helpText: 'Low BMI raises urgency independent of score',
      }),
    ],
    calculate(values) {
      const score = num(values.score, 18);
      const behaviors = bool(values.behaviors);
      const bmi = num(values.bmi, 22);
      const r = riskFromThresholds(score, [
        {
          max: 19,
          level: 'low',
          label: 'Below common referral cutoff',
          interpretation: `EAT-26 ${score}/78: below the commonly used referral threshold of ≥20. Still review behavioral questions and growth/weight trajectory.`,
        },
        {
          max: 29,
          level: 'moderate',
          label: 'Elevated — evaluation recommended',
          interpretation: `EAT-26 ${score}/78 (≥20): elevated disordered-eating attitudes — full clinical assessment for anorexia, bulimia, OSFED, and medical complications.`,
        },
        {
          max: 78,
          level: 'high',
          label: 'Highly elevated attitudes',
          interpretation: `EAT-26 ${score}/78: highly elevated. Prioritize comprehensive ED evaluation, medical stability check, and specialty referral.`,
        },
      ]);
      let { riskLevel, label, interpretation } = r;
      if (behaviors) {
        if (riskLevel === 'low') riskLevel = 'moderate';
        label += ' + behavioral flags';
        interpretation +=
          ' Behavioral screening items positive: evaluate regardless of total (binge/purge/compensatory behaviors or significant weight loss warrant assessment).';
      }
      if (bmi > 0 && bmi < 17.5) {
        riskLevel = riskLevel === 'critical' ? 'critical' : 'high';
        interpretation += ` BMI ${bmi} is low — assess medical stability (vitals, electrolytes, ECG) urgently.`;
      }
      return {
        score,
        unit: '/78',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Common cutoff', value: '≥20 → further evaluation' },
          { label: 'Behavioral flags', value: behaviors ? 'Yes' : 'No / not flagged' },
          { label: 'BMI context', value: bmi > 0 ? String(bmi) : 'Not used' },
        ],
        recommendations: [
          'EAT-26 is a screen — not a diagnosis',
          'Always review the behavioral questions even if total <20',
          'Assess medical risk: bradycardia, orthostasis, hypokalemia, purging',
        ],
      };
    },
    evidence: {
      summary:
        'EAT-26 screens eating attitudes and behaviors. Total ≥20 is a widely used threshold for referral; positive behavioral items also mandate evaluation independent of total.',
      formula: 'Sum of 26 scored items (0–78)',
      validation: 'Derived from EAT-40; extensively used in clinical and nonclinical populations as a screening tool.',
      references: [
        {
          title: 'The eating attitudes test: psychometric features and clinical correlates',
          citation: 'Garner DM et al. Psychol Med. 1982;12:871-878',
          year: 1982,
          pmid: '6961471',
          doi: '10.1017/s0033291700049163',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Total ≥20 or any high-risk behavior / low BMI',
        actions: ['Clinical ED interview', 'Medical exam + labs/ECG as indicated', 'Nutrition assessment', 'Specialty ED referral'],
      },
      {
        condition: 'Below cutoff without flags',
        actions: ['Brief counseling if concerns', 'Rescreen if weight/behavior changes'],
      },
    ],
    pearls: [
      'Men, athletes, and higher-weight patients can score lower yet still have ED pathology.',
      'Pair with SCOFF or clinical interview when suspicion remains.',
    ],
  },

  // ─── 4. M-CHAT-R ───────────────────────────────────────────────────────────
  {
    id: 'mchat-r',
    name: 'M-CHAT-R Autism Toddler Score',
    shortName: 'M-CHAT-R',
    description:
      'Interprets Modified Checklist for Autism in Toddlers, Revised (M-CHAT-R) total risk score (0–20).',
    category: 'pediatrics',
    tags: ['m-chat-r', 'autism', 'asd', 'toddler', 'screening', 'pediatrics'],
    whenToUse: 'Primary-care autism screen at ~16–30 months after caregiver M-CHAT-R completion.',
    whyUse: 'Stratifies low / medium / high risk to guide Follow-Up interview vs immediate referral.',
    inputs: [
      numberInput('score', 'M-CHAT-R total failed items (0–20)', {
        min: 0,
        max: 20,
        defaultValue: 3,
        helpText: 'Count items scored at risk (failed); reverse-scored items already applied',
      }),
    ],
    calculate(values) {
      const score = num(values.score, 3);
      const r = riskFromThresholds(score, [
        {
          max: 2,
          level: 'low',
          label: 'Low risk',
          interpretation: `M-CHAT-R ${score}/20: low risk. Continue routine developmental surveillance; rescreen at later well visits if concerns arise.`,
        },
        {
          max: 7,
          level: 'moderate',
          label: 'Medium risk — administer Follow-Up',
          interpretation: `M-CHAT-R ${score}/20: medium risk. Administer M-CHAT-R/F Follow-Up interview. Refer for diagnostic evaluation if Follow-Up remains positive.`,
        },
        {
          max: 20,
          level: 'high',
          label: 'High risk — refer',
          interpretation: `M-CHAT-R ${score}/20: high risk. Bypass Follow-Up delay — refer promptly for comprehensive ASD evaluation and early intervention services.`,
        },
      ]);
      return {
        score,
        unit: '/20',
        ...r,
        details: [
          { label: 'Low risk', value: '0–2' },
          { label: 'Medium risk', value: '3–7 → M-CHAT-R/F' },
          { label: 'High risk', value: '8–20 → refer' },
        ],
        recommendations: [
          'Screening ≠ diagnosis',
          'Act on caregiver concern even if score is low',
          'Concurrent hearing/vision and development checks as indicated',
        ],
      };
    },
    evidence: {
      summary:
        'M-CHAT-R is a 20-item toddler ASD screen. Totals 0–2 low risk, 3–7 medium (use Follow-Up), 8–20 high risk (refer). Reduces false positives vs original M-CHAT when Follow-Up is used.',
      formula: 'Count at-risk items (0–20)',
      validation: 'Validated in primary-care toddler populations; AAP-endorsed screening pathway component.',
      references: [
        {
          title: 'Validation of the Modified Checklist for Autism in Toddlers, Revised with Follow-Up (M-CHAT-R/F)',
          citation: 'Robins DL et al. Pediatrics. 2014;133:37-45',
          year: 2014,
          pmid: '24366990',
          doi: '10.1542/peds.2013-1813',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Score 0–2',
        actions: ['Routine surveillance', 'If younger than 24 months, rescreen after second birthday', 'Refer if ongoing clinical concern'],
      },
      {
        condition: 'Score 3–7',
        actions: ['Complete M-CHAT-R Follow-Up interview', 'Refer if still positive', 'Early intervention as indicated'],
      },
      {
        condition: 'Score ≥8',
        actions: ['Immediate specialty/diagnostic referral', 'Early intervention services', 'Do not wait for “watchful waiting” alone'],
      },
    ],
    pearls: [
      'Critical items historically weighted more; current M-CHAT-R uses total + Follow-Up algorithm.',
      'Positive screen warrants action — not reassurance alone.',
    ],
  },

  // ─── 5. Vanderbilt ADHD ────────────────────────────────────────────────────
  {
    id: 'vanderbilt-adhd',
    name: 'Vanderbilt ADHD Positive Criteria Helper',
    shortName: 'Vanderbilt',
    description:
      'Educational helper applying NICHQ Vanderbilt symptom-count and performance thresholds for ADHD screening positivity.',
    category: 'pediatrics',
    tags: ['vanderbilt', 'adhd', 'nichq', 'pediatrics', 'inattention', 'hyperactivity'],
    whenToUse:
      'After parent and/or teacher Vanderbilt forms; enter counts of items rated often/very often and performance problems.',
    whyUse:
      'Operationalizes common positivity rules (≥6/9 symptom domain + ≥1 performance item in problem range).',
    inputs: [
      numberInput('inatt', 'Inattention items “Often/Very often” (of 9)', {
        min: 0,
        max: 9,
        defaultValue: 6,
        helpText: 'Parent items 1–9 or teacher equivalent',
      }),
      numberInput('hyper', 'Hyperactivity/impulsivity items “Often/Very often” (of 9)', {
        min: 0,
        max: 9,
        defaultValue: 4,
        helpText: 'Parent items 10–18 or teacher equivalent',
      }),
      numberInput('perf', 'Performance items rated 4 or 5 (problematic)', {
        min: 0,
        max: 8,
        defaultValue: 1,
        helpText: 'Academic/behavioral performance section; ≥1 often required for positive screen',
      }),
      selectInput('informant', 'Informant', [
        { label: 'Parent', value: 'parent' },
        { label: 'Teacher', value: 'teacher' },
        { label: 'Both (use highest symptom counts entered)', value: 'both' },
      ]),
    ],
    calculate(values) {
      const inatt = num(values.inatt, 6);
      const hyper = num(values.hyper, 4);
      const perf = num(values.perf, 1);
      const inattPos = inatt >= 6;
      const hyperPos = hyper >= 6;
      const perfPos = perf >= 1;
      const symptomPos = inattPos || hyperPos;
      const screenPos = symptomPos && perfPos;

      let subtype = 'Neither domain positive';
      if (inattPos && hyperPos) subtype = 'Combined symptom pattern';
      else if (inattPos) subtype = 'Predominantly inattentive symptom pattern';
      else if (hyperPos) subtype = 'Predominantly hyperactive/impulsive symptom pattern';

      let label: string;
      let interpretation: string;
      let riskLevel: 'normal' | 'low' | 'moderate' | 'high';

      if (screenPos) {
        label = 'Positive ADHD screen (symptom + performance)';
        interpretation = `Positive Vanderbilt-style screen: ${subtype.toLowerCase()} with ${perf} performance item(s) in problem range. Confirm DSM-5 criteria across settings, rule out mimics, and obtain multi-informant data.`;
        riskLevel = 'high';
      } else if (symptomPos && !perfPos) {
        label = 'Symptoms positive — performance threshold not met';
        interpretation = `≥6 symptoms in a domain but performance items not in problem range (or none entered). Incomplete positive screen by common rules — clarify functioning at school/home; still clinical judgment applies.`;
        riskLevel = 'moderate';
      } else if (!symptomPos && perfPos) {
        label = 'Performance problems without ADHD symptom threshold';
        interpretation = 'Performance impairment without ≥6/9 in either ADHD domain. Consider learning disorders, anxiety, sleep, environment, or other causes; do not label ADHD on performance alone.';
        riskLevel = 'moderate';
      } else {
        label = 'Negative screen by common thresholds';
        interpretation = 'Fewer than 6 symptoms in both domains and/or no performance problems flagged. ADHD less likely by this form, but history and other settings still matter.';
        riskLevel = 'low';
      }

      return {
        score: (inattPos ? 1 : 0) + (hyperPos ? 1 : 0) + (perfPos ? 1 : 0),
        unit: 'criteria met',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Inattention count', value: `${inatt}/9 ${inattPos ? '(≥6 ✓)' : ''}` },
          { label: 'Hyperactivity count', value: `${hyper}/9 ${hyperPos ? '(≥6 ✓)' : ''}` },
          { label: 'Performance problems', value: `${perf} item(s) rated 4–5 ${perfPos ? '(✓)' : ''}` },
          { label: 'Pattern', value: subtype },
          { label: 'Informant', value: String(values.informant ?? 'parent') },
        ],
        recommendations: [
          'Require multi-setting symptoms for diagnosis',
          'Screen for ODD, conduct, anxiety, learning disability co-scales on full Vanderbilt',
          'Not for children under ~6 without specialist input',
        ],
      };
    },
    evidence: {
      summary:
        'NICHQ Vanderbilt ADHD Diagnostic Rating Scale: positive screen typically requires ≥6 of 9 inattention and/or hyperactive/impulsive items rated often/very often plus ≥1 performance item rated 4–5.',
      formula: 'Inattention ≥6/9 OR Hyper ≥6/9 AND performance ≥1 problematic',
      validation: 'Widely used in US primary care ADHD pathways; aligns with DSM symptom counts but is not itself a full diagnostic interview.',
      references: [
        {
          title: 'NICHQ Vanderbilt Assessment Scales',
          citation: 'American Academy of Pediatrics / NICHQ ADHD toolkit',
          year: 2002,
          url: 'https://www.nichq.org/resource/nichq-vanderbilt-assessment-scales',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Positive parent + teacher screens',
        actions: ['DSM-5 clinical interview', 'Comorbidity assessment', 'School supports', 'Discuss behavioral therapy ± medication per guidelines'],
      },
      {
        condition: 'Discordant informants',
        actions: ['Clarify settings', 'Observe / gather more data', 'Evaluate sleep, anxiety, learning issues'],
      },
    ],
    pearls: [
      'Teacher forms are critical — home-only symptoms may reflect other stressors.',
      'Oppositional and anxiety co-scales help differential diagnosis.',
    ],
  },

  // ─── 6. CUDIT-R ────────────────────────────────────────────────────────────
  {
    id: 'cudit-r',
    name: 'CUDIT-R Cannabis Use Total',
    shortName: 'CUDIT-R',
    description:
      'Interprets Cannabis Use Disorders Identification Test – Revised total (0–32) for hazardous use and possible cannabis use disorder.',
    category: 'psychiatry',
    tags: ['cudit-r', 'cannabis', 'marijuana', 'substance', 'screening'],
    whenToUse: 'After CUDIT-R administration in patients using cannabis; enter 8-item total.',
    whyUse: 'Brief validated screen for hazardous cannabis use and possible DSM cannabis use disorder.',
    inputs: [
      numberInput('score', 'CUDIT-R total (0–32)', {
        min: 0,
        max: 32,
        defaultValue: 10,
        helpText: '8 items scored 0–4',
      }),
    ],
    calculate(values) {
      const score = num(values.score, 10);
      const r = riskFromThresholds(score, [
        {
          max: 7,
          level: 'low',
          label: 'Below hazardous cutoff',
          interpretation: `CUDIT-R ${score}/32: below common hazardous-use threshold (≥8). Provide brief advice if any use; reassess if pattern changes.`,
        },
        {
          max: 11,
          level: 'moderate',
          label: 'Hazardous cannabis use',
          interpretation: `CUDIT-R ${score}/32: hazardous use range (≥8). Brief intervention, psychoeducation on risks, and harm reduction indicated.`,
        },
        {
          max: 32,
          level: 'high',
          label: 'Possible cannabis use disorder',
          interpretation: `CUDIT-R ${score}/32: at/above common possible-CUD threshold (≥12). Full assessment for cannabis use disorder; offer structured treatment and withdrawal support as needed.`,
        },
      ]);
      return {
        score,
        unit: '/32',
        ...r,
        details: [
          { label: 'Hazardous cutoff', value: '≥8' },
          { label: 'Possible CUD cutoff', value: '≥12 (commonly cited)' },
          { label: 'Items', value: '8 × 0–4 = 0–32' },
        ],
      };
    },
    evidence: {
      summary:
        'CUDIT-R is an 8-item (0–4) screen (total 0–32). Scores ≥8 suggest hazardous cannabis use; ≥12 is often used for possible cannabis use disorder requiring fuller assessment.',
      formula: 'Sum of 8 items (0–32)',
      validation: 'Validated against cannabis use disorder criteria in clinical and research samples; successor to original CUDIT.',
      references: [
        {
          title: 'The Cannabis Use Disorders Identification Test – Revised (CUDIT-R)',
          citation: 'Adamson SJ et al. Drug Alcohol Depend. 2010;110:137-143',
          year: 2010,
          pmid: '20347232',
          doi: '10.1016/j.drugalcdep.2010.02.017',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Score ≥8',
        actions: ['Brief intervention (FRAMES)', 'Educate on cognitive/psychosis/driving risks', 'Set reduction goals'],
      },
      {
        condition: 'Score ≥12 or dependence features',
        actions: ['DSM CUD assessment', 'Counseling / CBT / MET', 'Manage cannabis withdrawal', 'Address co-use of tobacco/alcohol'],
      },
    ],
    pearls: [
      'High-potency concentrates and daily use raise risk independent of score.',
      'Screen for cannabis hyperemesis and psychiatric exacerbation when relevant.',
    ],
  },

  // ─── 7. Benzodiazepine dose equivalence ────────────────────────────────────
  {
    id: 'benzo-dose-equiv',
    name: 'Benzodiazepine Dose Equivalence (Simplified)',
    shortName: 'Benzo EQ',
    description:
      'Educational approximate oral benzodiazepine dose conversion to diazepam milligram equivalents (simplified).',
    category: 'psychiatry',
    tags: ['benzodiazepine', 'equivalence', 'diazepam', 'conversion', 'taper'],
    whenToUse: 'Estimating approximate diazepam-equivalent dose when switching agents or planning tapers (not exact PK).',
    whyUse: 'Cross-agent equivalence tables help standardize taper math; clinical titration still required.',
    inputs: [
      selectInput('drug', 'Current benzodiazepine', [
        { label: 'Alprazolam (Xanax)', value: 'alprazolam' },
        { label: 'Clonazepam (Klonopin)', value: 'clonazepam' },
        { label: 'Lorazepam (Ativan)', value: 'lorazepam' },
        { label: 'Diazepam (Valium)', value: 'diazepam' },
        { label: 'Temazepam', value: 'temazepam' },
        { label: 'Oxazepam', value: 'oxazepam' },
        { label: 'Chlordiazepoxide', value: 'chlordiazepoxide' },
        { label: 'Triazolam', value: 'triazolam' },
      ]),
      numberInput('dose_mg', 'Total daily dose of current agent', {
        unit: 'mg/day',
        min: 0,
        max: 200,
        step: 0.25,
        defaultValue: 2,
      }),
    ],
    calculate(values) {
      // Approximate oral equivalents: mg of drug ≈ 10 mg diazepam
      // alprazolam 0.5, clonazepam 0.5, lorazepam 1, diazepam 10, temazepam 20,
      // oxazepam 20, chlordiazepoxide 25, triazolam 0.25
      const factors: Record<string, { toDiazepam10: number; name: string }> = {
        alprazolam: { toDiazepam10: 0.5, name: 'Alprazolam' },
        clonazepam: { toDiazepam10: 0.5, name: 'Clonazepam' },
        lorazepam: { toDiazepam10: 1, name: 'Lorazepam' },
        diazepam: { toDiazepam10: 10, name: 'Diazepam' },
        temazepam: { toDiazepam10: 20, name: 'Temazepam' },
        oxazepam: { toDiazepam10: 20, name: 'Oxazepam' },
        chlordiazepoxide: { toDiazepam10: 25, name: 'Chlordiazepoxide' },
        triazolam: { toDiazepam10: 0.25, name: 'Triazolam' },
      };
      const drug = String(values.drug ?? 'alprazolam');
      const dose = num(values.dose_mg, 2);
      const f = factors[drug] ?? factors.alprazolam;
      const diazepamEq = round((dose / f.toDiazepam10) * 10, 1);
      const r = riskFromThresholds(diazepamEq, [
        {
          max: 10,
          level: 'low',
          label: 'Lower diazepam-equivalent range',
          interpretation: `≈${diazepamEq} mg/day diazepam equivalent. Still taper slowly if chronic use; monitor withdrawal.`,
        },
        {
          max: 30,
          level: 'moderate',
          label: 'Moderate diazepam-equivalent dose',
          interpretation: `≈${diazepamEq} mg/day diazepam equivalent. Structured taper plan; consider long half-life agent substitution with specialist input if complex.`,
        },
        {
          max: 60,
          level: 'high',
          label: 'High diazepam-equivalent dose',
          interpretation: `≈${diazepamEq} mg/day diazepam equivalent. High dependence risk — slow taper, avoid abrupt cessation, consider addiction/psychiatry co-management.`,
        },
        {
          max: 10000,
          level: 'critical',
          label: 'Very high equivalent dose',
          interpretation: `≈${diazepamEq} mg/day diazepam equivalent. Very high — inpatient or specialist taper pathways may be needed; seizure risk if stopped abruptly.`,
        },
      ]);
      return {
        score: diazepamEq,
        unit: 'mg diazepam eq/day',
        ...r,
        details: [
          { label: 'Source agent', value: `${f.name} ${dose} mg/day` },
          { label: 'Table anchor', value: `${f.toDiazepam10} mg ${f.name} ≈ 10 mg diazepam` },
          { label: 'Note', value: 'Equivalence is approximate; half-life and potency differ' },
        ],
        recommendations: [
          'Never abruptly stop chronic benzos',
          'Equivalence tables vary by source — use institutional protocol',
          'Account for age, liver disease, and opioids (synergistic respiratory depression)',
        ],
      };
    },
    evidence: {
      summary:
        'Simplified oral benzodiazepine equivalence relative to diazepam 10 mg (e.g., alprazolam 0.5 mg, lorazepam 1 mg, clonazepam 0.5 mg). Educational only — pharmacokinetics and clinical response vary.',
      formula: 'diazepam_eq_mg = (dose_mg / agent_mg_per_10mg_diazepam) × 10',
      validation:
        'Based on commonly published approximate equivalence tables (Ashton and clinical references); not a substitute for formal taper protocols.',
      references: [
        {
          title: 'Benzodiazepine equivalence and withdrawal (clinical references)',
          citation: 'Ashton H. Benzodiazepines: how they work and how to withdraw; standard psychopharmacology texts',
          year: 2002,
          url: 'https://www.benzo.org.uk/manual/',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Switching agents',
        actions: ['Convert to approximate diazepam eq', 'Cross-taper carefully', 'Use smaller steps for short-acting agents (alprazolam)'],
      },
      {
        condition: 'Taper planning',
        actions: ['Reduce ~5–10% every 2–4 weeks as tolerated', 'Slower near end of taper', 'Support for insomnia/anxiety without automatic dose re-escalation'],
      },
    ],
    pearls: [
      'Alprazolam interdose withdrawal is common — longer-acting substitution sometimes used.',
      'Oxazepam/lorazepam preferred in significant hepatic impairment (no active oxidative metabolites).',
    ],
  },

  // ─── 8. Morphine IV to PO ──────────────────────────────────────────────────
  {
    id: 'morphine-iv-po',
    name: 'Morphine IV to PO Conversion',
    shortName: 'Morphine IV↔PO',
    description:
      'Educational conversion between parenteral (IV/SC) and oral morphine using common 1:3 (IV:PO) ratio.',
    category: 'general',
    tags: ['morphine', 'opioid', 'conversion', 'pain', 'iv', 'oral'],
    whenToUse: 'Transitioning stable pain patients between IV/SC morphine and oral morphine.',
    whyUse: 'Incomplete oral bioavailability requires dose adjustment; classic teaching uses IV:PO ≈ 1:3.',
    inputs: [
      selectInput('direction', 'Conversion direction', [
        { label: 'IV / SC morphine → oral morphine', value: 'iv_to_po' },
        { label: 'Oral morphine → IV / SC morphine', value: 'po_to_iv' },
      ]),
      numberInput('dose', 'Current total daily morphine dose', {
        unit: 'mg/day',
        min: 0,
        max: 5000,
        step: 0.5,
        defaultValue: 10,
      }),
      selectInput('ratio', 'IV:PO ratio used', [
        { label: '1:3 (common teaching)', value: 3 },
        { label: '1:2 (more conservative PO increase / some references)', value: 2 },
      ]),
    ],
    calculate(values) {
      const direction = String(values.direction ?? 'iv_to_po');
      const dose = num(values.dose, 10);
      const ratio = num(values.ratio, 3);
      let result: number;
      let fromLabel: string;
      let toLabel: string;
      if (direction === 'po_to_iv') {
        result = round(dose / ratio, 1);
        fromLabel = `Oral ${dose} mg/day`;
        toLabel = `IV/SC ≈ ${result} mg/day`;
      } else {
        result = round(dose * ratio, 1);
        fromLabel = `IV/SC ${dose} mg/day`;
        toLabel = `Oral ≈ ${result} mg/day`;
      }
      const oralDaily = direction === 'po_to_iv' ? dose : result;
      const r = riskFromThresholds(oralDaily, [
        {
          max: 60,
          level: 'moderate',
          label: 'Converted daily morphine',
          interpretation: `${fromLabel} → ${toLabel} using IV:PO = 1:${ratio}. Divide into appropriate intervals (e.g., q4h IR or scheduled ER). Reassess analgesia and sedation after switch.`,
        },
        {
          max: 200,
          level: 'high',
          label: 'Higher-dose conversion — caution',
          interpretation: `${fromLabel} → ${toLabel} (1:${ratio}). Higher total opioid burden — monitor sedation, respiration, constipation; consider specialist input and incomplete cross-tolerance rules if switching opioids later.`,
        },
        {
          max: 100000,
          level: 'critical',
          label: 'Very high-dose conversion',
          interpretation: `${fromLabel} → ${toLabel}. Very high-dose territory — expert pain/palliative review; careful titration and monitoring.`,
        },
      ]);
      return {
        score: result,
        unit: 'mg/day target',
        ...r,
        details: [
          { label: 'Direction', value: direction === 'iv_to_po' ? 'IV/SC → PO' : 'PO → IV/SC' },
          { label: 'Ratio applied', value: `1:${ratio} (IV:PO)` },
          { label: 'Source dose', value: fromLabel },
          { label: 'Target dose', value: toLabel },
        ],
        recommendations: [
          'Reduce 25–50% for incomplete cross-tolerance when changing opioid class',
          'Breakthrough = ~10–15% of total daily oral morphine as IR q1–2h PRN (context-dependent)',
          'Always reassess clinical response — tables are starting points',
        ],
      };
    },
    evidence: {
      summary:
        'Oral morphine bioavailability is incomplete; common educational IV:PO morphine ratio is 1:3 (some use 1:2). Convert total daily dose, then schedule appropriately.',
      formula: 'PO mg/day ≈ IV mg/day × ratio (usually 3); IV ≈ PO ÷ ratio',
      validation: 'Standard opioid equianalgesic teaching; institutional protocols may differ slightly.',
      references: [
        {
          title: 'Opioid equianalgesic tables and morphine conversion principles',
          citation: 'NCCN / WHO analgesic ladder references; standard pain medicine texts',
          year: 2023,
          url: 'https://www.nccn.org',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'IV → PO transition',
        actions: ['Ensure tolerating oral route', 'Convert total daily dose', 'Provide breakthrough IR', 'Monitor first 24–48 h'],
      },
      {
        condition: 'Uncontrolled pain or sedation',
        actions: ['Do not only escalate — reassess cause', 'Bowel regimen', 'Consider rotation or adjuvant analgesics'],
      },
    ],
    pearls: [
      'Parenteral includes IV and SC for morphine equianalgesia in many tables.',
      'Renal impairment: prefer dose reduction or alternative opioid (active metabolites).',
    ],
  },

  // ─── 9. Buprenorphine COWS readiness ───────────────────────────────────────
  {
    id: 'buprenorphine-cows',
    name: 'COWS Readiness for Buprenorphine Induction',
    shortName: 'COWS / Bupe',
    description:
      'Educational helper using Clinical Opiate Withdrawal Scale (COWS) total to gauge traditional buprenorphine induction readiness.',
    category: 'psychiatry',
    tags: ['cows', 'buprenorphine', 'opioid', 'withdrawal', 'induction', 'oud'],
    whenToUse:
      'Before traditional transmucosal buprenorphine induction when patient is in opioid withdrawal; enter COWS total.',
    whyUse:
      'Starting buprenorphine too early precipitates withdrawal; adequate COWS reduces that risk (protocol-dependent).',
    inputs: [
      numberInput('cows', 'COWS total (0–48)', {
        min: 0,
        max: 48,
        defaultValue: 10,
        helpText: 'Sum of 11 COWS items',
      }),
      selectInput('last_opioid', 'Last full agonist timing / type context', [
        { label: 'Short-acting (e.g., heroin, IR oxycodone) — typical wait ≥12 h', value: 'short' },
        { label: 'Long-acting (e.g., morphine ER) — often ≥24 h', value: 'long' },
        { label: 'Methadone — often ≥48–72 h; specialist caution', value: 'methadone' },
        { label: 'Fentanyl / unknown — higher precipitated risk; low-dose protocols', value: 'fentanyl' },
      ]),
      yesNo('prior_precip', 'History of precipitated withdrawal with buprenorphine', 0),
    ],
    calculate(values) {
      const cows = num(values.cows, 10);
      const last = String(values.last_opioid ?? 'short');
      const prior = bool(values.prior_precip);
      // Traditional teaching: often COWS ≥8–12 before first dose
      const r = riskFromThresholds(cows, [
        {
          max: 4,
          level: 'high',
          label: 'Minimal withdrawal — induction premature (traditional)',
          interpretation: `COWS ${cows}: minimal withdrawal. Traditional induction usually deferred — high risk of precipitated withdrawal if mu receptors still occupied. Wait for clearer withdrawal or use low-dose/micro-induction protocols.`,
        },
        {
          max: 7,
          level: 'moderate',
          label: 'Mild withdrawal — borderline for traditional start',
          interpretation: `COWS ${cows}: mild range. Many protocols wait for COWS ≥8–12 for standard induction. Consider waiting, supportive care, or low-dose induction strategies especially with fentanyl.`,
        },
        {
          max: 12,
          level: 'low',
          label: 'Mild–moderate — often ready for traditional induction',
          interpretation: `COWS ${cows}: mild to moderate withdrawal — commonly accepted window to start traditional buprenorphine induction (e.g., 2–4 mg test dose) per local protocol.`,
        },
        {
          max: 24,
          level: 'moderate',
          label: 'Moderate–moderately severe withdrawal',
          interpretation: `COWS ${cows}: moderate to moderately severe. Appropriate to induce with buprenorphine while providing supportive meds; monitor response closely.`,
        },
        {
          max: 48,
          level: 'high',
          label: 'Severe withdrawal',
          interpretation: `COWS ${cows}: severe withdrawal. Induce carefully with supportive care; ensure no other acute medical emergency; may need higher cumulative day-1 dosing per protocol.`,
        },
      ]);
      let { interpretation, label, riskLevel } = r;
      if (last === 'methadone' || last === 'fentanyl') {
        interpretation +=
          last === 'methadone'
            ? ' Methadone context: longer wait and specialist caution; precipitated withdrawal risk is higher.'
            : ' Fentanyl/unknown: high precipitated-withdrawal risk — consider low-dose or macro/micro-induction pathways rather than COWS alone.';
        if (cows < 13 && riskLevel === 'low') riskLevel = 'moderate';
      }
      if (prior) {
        interpretation += ' Prior precipitated withdrawal: use extra caution / specialist low-dose protocol.';
        label += ' (prior precipitated Wx)';
      }
      return {
        score: cows,
        unit: 'COWS',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'COWS bands', value: '<5 min; 5–12 mild; 13–24 mod; 25–36 mod-sev; >36 severe' },
          { label: 'Traditional start (often)', value: 'COWS ≥8–12 + adequate time since last agonist' },
          { label: 'Opioid context', value: last },
          { label: 'Prior precipitated', value: prior ? 'Yes' : 'No' },
        ],
        recommendations: [
          'This is educational — follow clinic/DEA/state protocols',
          'Time since last dose matters as much as COWS',
          'Low-dose (“micro-dosing”) induction can proceed with less withdrawal in selected patients',
        ],
      };
    },
    evidence: {
      summary:
        'COWS (0–48) grades opioid withdrawal. Traditional buprenorphine induction often waits for mild–moderate withdrawal (commonly COWS ≥8–12) plus adequate time off full agonists to reduce precipitated withdrawal.',
      formula: 'Enter COWS total; interpret readiness with opioid type/timing',
      validation:
        'COWS is a standard clinical withdrawal scale; induction cutoffs are protocol-based rather than a single universal trial endpoint.',
      references: [
        {
          title: 'Clinical Opiate Withdrawal Scale',
          citation: 'Wesson DR, Ling W. J Psychoactive Drugs. 2003;35:253-259',
          year: 2003,
          pmid: '12924748',
          doi: '10.1080/02791072.2003.10400007',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'COWS ≥8–12 + adequate washout (traditional)',
        actions: ['Start low test dose (e.g., 2–4 mg)', 'Reassess in 30–60+ min', 'Titrate per protocol', 'Prescribe naloxone', 'Link to ongoing MOUD care'],
      },
      {
        condition: 'COWS low or fentanyl/methadone',
        actions: ['Delay traditional first dose', 'Supportive meds', 'Consider low-dose induction', 'Specialist consultation'],
      },
    ],
    pearls: [
      'Precipitated withdrawal = abrupt worsening after first bupe dose while full agonist still present.',
      'COWS is not required for every low-dose home induction protocol — education still helps risk framing.',
    ],
  },

  // ─── 10. painDETECT ────────────────────────────────────────────────────────
  {
    id: 'pain-detect',
    name: 'painDETECT Total',
    shortName: 'painDETECT',
    description:
      'Interprets painDETECT questionnaire total (−9 to 38) for likelihood of neuropathic pain component.',
    category: 'neurology',
    tags: ['paindetect', 'neuropathic pain', 'chronic pain', 'screening'],
    whenToUse: 'Chronic pain evaluation when a neuropathic component is suspected; enter scored total.',
    whyUse: 'Stratifies unlikely / unclear / likely neuropathic pain to guide workup and neuropathic agents.',
    inputs: [
      numberInput('score', 'painDETECT total (−9 to 38)', {
        min: -9,
        max: 38,
        defaultValue: 14,
        helpText: 'Includes symptom items, radiation, and pattern scores per instrument rules',
      }),
    ],
    calculate(values) {
      const score = num(values.score, 14);
      const r = riskFromThresholds(score, [
        {
          max: 12,
          level: 'low',
          label: 'Unlikely neuropathic component',
          interpretation: `painDETECT ${score}: ≤12 — neuropathic pain component unlikely (~<15% probability in original validation). Focus on nociceptive/mechanistic assessment; neuropathic agents less first-line unless clinical picture suggests otherwise.`,
        },
        {
          max: 18,
          level: 'moderate',
          label: 'Unclear — mixed possible',
          interpretation: `painDETECT ${score}: 13–18 — unclear / ambiguous zone. Mixed pain possible; use clinical exam, sensory testing, and imaging/labs as indicated before labeling neuropathic pain.`,
        },
        {
          max: 38,
          level: 'high',
          label: 'Likely neuropathic component',
          interpretation: `painDETECT ${score}: ≥19 — likely neuropathic pain component (~>90% in original work). Consider neuropathic-targeted therapy (e.g., gabapentinoid, SNRI, TCA), cause-directed workup, and multimodal care.`,
        },
      ]);
      return {
        score,
        unit: 'points',
        ...r,
        details: [
          { label: '≤12', value: 'Neuropathic unlikely' },
          { label: '13–18', value: 'Unclear' },
          { label: '≥19', value: 'Neuropathic likely' },
        ],
      };
    },
    evidence: {
      summary:
        'painDETECT is a patient questionnaire for neuropathic pain features. Totals ≤12 unlikely, 13–18 unclear, ≥19 likely neuropathic component (original validation thresholds).',
      formula: 'Enter instrument total (−9 to 38)',
      validation: 'Developed and validated primarily in low back pain populations; used more broadly with clinical judgment.',
      references: [
        {
          title: 'painDETECT: a new screening questionnaire to identify neuropathic components in patients with back pain',
          citation: 'Freynhagen R et al. Curr Med Res Opin. 2006;22:1911-1920',
          year: 2006,
          pmid: '17022849',
          doi: '10.1185/030079906X132488',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Score ≥19',
        actions: ['Neuropathic exam (sensory mapping)', 'Treat underlying cause', 'Consider first-line neuropathic analgesics', 'Physical therapy / multimodal plan'],
      },
      {
        condition: 'Score ≤12',
        actions: ['Mechanistic nociceptive assessment', 'Avoid unnecessary neuropathic polypharmacy'],
      },
    ],
    pearls: [
      'Screen ≠ definitive diagnosis of neuropathic pain (IASP criteria still clinical).',
      'Radicular back pain may score high; correlate with neuro exam/imaging.',
    ],
  },

  // ─── 11. PEG-3 ─────────────────────────────────────────────────────────────
  {
    id: 'peg-pain',
    name: 'PEG-3 Pain Average',
    shortName: 'PEG-3',
    description:
      'Averages the 3-item PEG scale (Pain intensity, Enjoyment of life, General activity) scored 0–10 each.',
    category: 'general',
    tags: ['peg', 'peg-3', 'pain', 'function', 'primary care'],
    whenToUse: 'Brief chronic pain tracking in primary care or specialty follow-up.',
    whyUse: 'Ultra-brief, responsive measure of pain intensity and interference; easy to remeasure over time.',
    inputs: [
      numberInput('pain', 'Pain intensity on average (0–10)', {
        min: 0,
        max: 10,
        step: 0.5,
        defaultValue: 6,
        helpText: '0 = no pain; 10 = pain as bad as you can imagine',
      }),
      numberInput('enjoyment', 'Pain interference with enjoyment of life (0–10)', {
        min: 0,
        max: 10,
        step: 0.5,
        defaultValue: 5,
      }),
      numberInput('activity', 'Pain interference with general activity (0–10)', {
        min: 0,
        max: 10,
        step: 0.5,
        defaultValue: 5,
      }),
    ],
    calculate(values) {
      const p = num(values.pain, 6);
      const e = num(values.enjoyment, 5);
      const a = num(values.activity, 5);
      const avg = round((p + e + a) / 3, 1);
      const r = riskFromThresholds(avg, [
        {
          max: 3,
          level: 'low',
          label: 'Mild pain impact',
          interpretation: `PEG average ${avg}/10 (P ${p}, E ${e}, G ${a}). Mild intensity/interference — nonpharmacologic care, functional goals, and minimal opioids if any.`,
        },
        {
          max: 6,
          level: 'moderate',
          label: 'Moderate pain impact',
          interpretation: `PEG average ${avg}/10. Moderate impact on enjoyment/activity — multimodal plan, track function, optimize non-opioid therapies.`,
        },
        {
          max: 10,
          level: 'high',
          label: 'Severe pain impact',
          interpretation: `PEG average ${avg}/10. Severe intensity/interference — comprehensive pain assessment, function-focused goals, specialty input as needed; reassess red flags.`,
        },
      ]);
      return {
        score: avg,
        unit: '/10 avg',
        ...r,
        details: [
          { label: 'Pain', value: String(p) },
          { label: 'Enjoyment', value: String(e) },
          { label: 'General activity', value: String(a) },
          { label: 'MCID (approx.)', value: '~1 point average change often meaningful' },
        ],
      };
    },
    evidence: {
      summary:
        'PEG is a 3-item ultra-brief pain measure (intensity, enjoyment, general activity). Average of three 0–10 ratings tracks severity and response; ~1-point change often cited as clinically meaningful.',
      formula: 'PEG avg = (Pain + Enjoyment + General activity) / 3',
      validation: 'Validated as a brief alternative to longer BPI interference scales in ambulatory care.',
      references: [
        {
          title: 'Development and testing of the PEG: ultra-brief pain measure',
          citation: 'Krebs EE et al. J Gen Intern Med. 2009;24:733-738',
          year: 2009,
          pmid: '19418100',
          doi: '10.1007/s11606-009-0981-1',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'PEG avg ≥4 or worsening',
        actions: ['Functional goal setting', 'Non-opioid multimodal therapy', 'Psychosocial screen', 'Reassess in 2–4 weeks'],
      },
      {
        condition: 'Improvement ≥1 point',
        actions: ['Reinforce effective strategies', 'Continue monitoring'],
      },
    ],
    pearls: [
      'Focus on function (E and G) not intensity alone when judging opioid benefit.',
      'Pair with PHQ-2/GAD-2 when chronic pain is complex.',
    ],
  },

  // ─── 12. BPI interference ──────────────────────────────────────────────────
  {
    id: 'bpi-interference',
    name: 'BPI Pain Interference Average',
    shortName: 'BPI Interference',
    description:
      'Interprets Brief Pain Inventory interference average (0–10) across seven life domains.',
    category: 'general',
    tags: ['bpi', 'brief pain inventory', 'interference', 'cancer pain', 'chronic pain'],
    whenToUse: 'After BPI interference items completed; enter mean of the 7 interference ratings.',
    whyUse: 'Standard interference metric in oncology and chronic pain research/practice.',
    inputs: [
      numberInput('avg', 'BPI interference average (0–10)', {
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 4.5,
        helpText: 'Mean of: general activity, mood, walking, work, relations, sleep, enjoyment',
      }),
      numberInput('worst', 'Worst pain in last 24 h (optional)', {
        min: 0,
        max: 10,
        step: 0.5,
        defaultValue: 6,
      }),
    ],
    calculate(values) {
      const avg = num(values.avg, 4.5);
      const worst = num(values.worst, 6);
      const r = riskFromThresholds(avg, [
        {
          max: 1,
          level: 'low',
          label: 'Minimal interference',
          interpretation: `BPI interference average ${avg}/10: minimal functional interference. Maintain current plan; preventive bowel regimen if on opioids.`,
        },
        {
          max: 4,
          level: 'moderate',
          label: 'Mild–moderate interference',
          interpretation: `BPI interference ${avg}/10: mild to moderate life interference. Optimize around most affected domains (sleep, work, mood).`,
        },
        {
          max: 6,
          level: 'high',
          label: 'Moderate–severe interference',
          interpretation: `BPI interference ${avg}/10: substantial interference. Multimodal escalation; address mood/sleep; specialty pain/palliative as appropriate.`,
        },
        {
          max: 10,
          level: 'critical',
          label: 'Severe interference',
          interpretation: `BPI interference ${avg}/10: severe functional impact. Comprehensive reassessment (disease progression, depression, opioid risk/benefit).`,
        },
      ]);
      return {
        score: avg,
        unit: '/10',
        ...r,
        details: [
          { label: 'Interference average', value: String(avg) },
          { label: 'Worst pain (optional)', value: String(worst) },
          { label: 'Domains', value: '7 items averaged' },
        ],
      };
    },
    evidence: {
      summary:
        'BPI interference subscale averages 7 items (0–10): general activity, mood, walking, normal work, relations, sleep, enjoyment of life. Higher means greater pain-related disability.',
      formula: 'Average of 7 interference items (0–10)',
      validation: 'Widely validated in cancer and noncancer pain; sensitive to treatment change.',
      references: [
        {
          title: 'The Brief Pain Inventory: reliability and validity',
          citation: 'Cleeland CS, Ryan KM. Ann Acad Med Singapore. 1994;23:129-138',
          year: 1994,
          pmid: '8080219',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Interference ≥4',
        actions: ['Domain-specific interventions (sleep, mood, PT)', 'Analgesic optimization', 'Nonpharmacologic therapies'],
      },
      {
        condition: 'Cancer pain with high interference',
        actions: ['WHO ladder / guidelines', 'Palliative care co-management', 'Reassess disease control'],
      },
    ],
    pearls: [
      'Report severity (worst/average/now) separately from interference.',
      'Sleep and mood items often drive average — treat them explicitly.',
    ],
  },

  // ─── 13. ID-Migraine ───────────────────────────────────────────────────────
  {
    id: 'id-migraine',
    name: 'ID-Migraine 3-Item Screen',
    shortName: 'ID-Migraine',
    description:
      'Three-item ID-Migraine screen (disability, nausea, photophobia); ≥2 yes suggests migraine.',
    category: 'neurology',
    tags: ['migraine', 'id-migraine', 'headache', 'screening', 'neurology'],
    whenToUse: 'Primary-care screening when migraine is in the differential for recurrent headache.',
    whyUse: 'Brief validated screen with good sensitivity for migraine diagnosis needing clinical confirmation.',
    inputs: [
      yesNo('disability', 'Disability: headache limited activities for a day or more in the last 3 months'),
      yesNo('nausea', 'Nausea: felt nauseated or sick to stomach with headaches'),
      yesNo('photophobia', 'Photophobia: light bothered you when you had a headache'),
    ],
    calculate(values) {
      const d = bool(values.disability);
      const n = bool(values.nausea);
      const p = bool(values.photophobia);
      const score = (d ? 1 : 0) + (n ? 1 : 0) + (p ? 1 : 0);
      const positive = score >= 2;
      return {
        score,
        unit: '/3 yes',
        label: positive ? 'Positive screen — migraine likely' : 'Negative screen — migraine less likely',
        interpretation: positive
          ? `ID-Migraine ${score}/3: positive (≥2). Migraine is likely — confirm ICHD criteria, assess frequency (episodic vs chronic), red flags, and offer evidence-based acute ± preventive therapy.`
          : `ID-Migraine ${score}/3: negative (<2). Migraine less likely by this screen but not excluded — clinical history still required (especially aura, unilateral throb, activity aggravation).`,
        riskLevel: positive ? 'moderate' : 'low',
        details: [
          { label: 'Disability', value: d ? 'Yes' : 'No' },
          { label: 'Nausea', value: n ? 'Yes' : 'No' },
          { label: 'Photophobia', value: p ? 'Yes' : 'No' },
          { label: 'Positive cutoff', value: '≥2 of 3' },
        ],
      };
    },
    evidence: {
      summary:
        'ID-Migraine asks about disability, nausea, and photophobia. A score of ≥2 positive responses is a validated primary-care screen for migraine.',
      formula: 'Sum of 3 yes/no items; ≥2 = positive',
      validation: 'Validated in primary care; high sensitivity with good specificity for migraine diagnosis.',
      references: [
        {
          title: 'A self-administered screener for migraine in primary care: The ID Migraine validation study',
          citation: 'Lipton RB et al. Neurology. 2003;61:375-382',
          year: 2003,
          pmid: '12913201',
          doi: '10.1212/01.wnl.0000078940.53438.83',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Positive screen',
        actions: ['Confirm ICHD-3 migraine features', 'Acute therapy (triptan/NSAID/gepant as appropriate)', 'Lifestyle triggers', 'Prevention if ≥4 migraine days/month or disability'],
      },
      {
        condition: 'Red flags (SNOOP)',
        actions: ['Do not rely on ID-Migraine', 'Urgent secondary headache workup'],
      },
    ],
    pearls: [
      'Screen does not distinguish migraine with vs without aura.',
      'Medication-overuse headache can coexist — count acute med days.',
    ],
  },

  // ─── 14. Barthel Index ─────────────────────────────────────────────────────
  {
    id: 'barthel-index',
    name: 'Barthel ADL Index Total',
    shortName: 'Barthel',
    description:
      'Interprets Barthel Index total (0–100) for activities of daily living independence after stroke or disability.',
    category: 'neurology',
    tags: ['barthel', 'adl', 'stroke', 'rehab', 'function'],
    whenToUse: 'Stroke, geriatric, or rehab assessment when Barthel items have been scored; enter total.',
    whyUse: 'Simple global ADL score for disability severity, progress, and discharge planning context.',
    inputs: [
      numberInput('score', 'Barthel Index total (0–100)', {
        min: 0,
        max: 100,
        step: 5,
        defaultValue: 60,
        helpText: 'Sum of 10 ADL items (feeding, bathing, grooming, dressing, bowels, bladder, toilet, transfer, mobility, stairs)',
      }),
    ],
    calculate(values) {
      const score = num(values.score, 60);
      const r = riskFromThresholds(score, [
        {
          max: 20,
          level: 'critical',
          label: 'Total dependence',
          interpretation: `Barthel ${score}/100: total dependence range. Full care needs; high support for discharge; prevent complications (pressure injury, aspiration, DVT).`,
        },
        {
          max: 60,
          level: 'high',
          label: 'Severe dependence',
          interpretation: `Barthel ${score}/100: severe dependence. Intensive rehab and caregiver planning; likely not independent at home without major supports.`,
        },
        {
          max: 90,
          level: 'moderate',
          label: 'Moderate dependence',
          interpretation: `Barthel ${score}/100: moderate dependence. Targeted OT/PT; home modifications; progressive mobility and self-care goals.`,
        },
        {
          max: 99,
          level: 'low',
          label: 'Slight dependence',
          interpretation: `Barthel ${score}/100: slight dependence. Near-independent; residual help for selected ADLs (often stairs/bathing).`,
        },
        {
          max: 100,
          level: 'normal',
          label: 'Independent',
          interpretation: `Barthel ${score}/100: independent in scored ADLs. Continue secondary prevention and community reintegration goals.`,
        },
      ]);
      return {
        score,
        unit: '/100',
        ...r,
        details: [
          { label: '0–20', value: 'Total dependence' },
          { label: '21–60', value: 'Severe dependence' },
          { label: '61–90', value: 'Moderate dependence' },
          { label: '91–99', value: 'Slight dependence' },
          { label: '100', value: 'Independent' },
        ],
      };
    },
    evidence: {
      summary:
        'Barthel Index sums 10 ADL domains to 0–100 (original 0–20 version also exists; this tool uses the 0–100 scale). Common bands: 0–20 total, 21–60 severe, 61–90 moderate, 91–99 slight dependence, 100 independent.',
      formula: 'Enter total 0–100',
      validation: 'Extensively used in stroke research and rehab; ceiling effects in milder disability.',
      references: [
        {
          title: 'Functional evaluation: the Barthel Index',
          citation: 'Mahoney FI, Barthel DW. Md State Med J. 1965;14:61-65',
          year: 1965,
          pmid: '14258950',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Score ≤60',
        actions: ['Multidisciplinary rehab', 'Caregiver training', 'Safe discharge planning', 'Swallow/mobility precautions'],
      },
      {
        condition: 'Improving scores',
        actions: ['Advance therapy goals', 'Community supports', 'Secondary stroke prevention if applicable'],
      },
    ],
    pearls: [
      'Does not capture cognition, communication, or IADLs well — pair with other scales.',
      '5-point increments are typical on the 0–100 version.',
    ],
  },

  // ─── 15. tPA absolute contraindications checklist ──────────────────────────
  {
    id: 'tpa-exclude',
    name: 'tPA Absolute Contraindication Checklist (Educational)',
    shortName: 'tPA Exclude',
    description:
      'Educational checklist of common absolute contraindications to IV thrombolysis for acute ischemic stroke. Not a substitute for current AHA/ASA labeling or institutional protocol.',
    category: 'neurology',
    tags: ['tpa', 'alteplase', 'tenecteplase', 'stroke', 'thrombolysis', 'contraindication'],
    whenToUse:
      'Rapid review while evaluating IV thrombolysis eligibility — always confirm against current guidelines and drug label.',
    whyUse:
      'Structures exclusion review; any absolute contraindication generally precludes standard IV thrombolysis.',
    inputs: [
      yesNo('ich_hx', 'Prior intracranial hemorrhage (often absolute / strong caution per protocol)'),
      yesNo('active_bleed', 'Active internal bleeding'),
      yesNo('ich_suspected', 'Symptoms suggest SAH or imaging shows hemorrhage'),
      yesNo('recent_intracranial', 'Recent intracranial/spinal surgery, serious head trauma, or stroke within protocol window (e.g., 3 months)'),
      yesNo('coagulopathy', 'Acute bleeding diathesis (e.g., platelets <100k, INR >1.7, aPTT elevated, DOAC with significant activity per protocol)'),
      yesNo('aortic_dissection', 'Known or suspected aortic dissection'),
      yesNo('infective_endocarditis', 'Suspected infective endocarditis with septic emboli concern (often exclude)'),
      yesNo('neoplasm_ich', 'Intracranial neoplasm with high bleed risk / some protocols exclude'),
      yesNo('bp_uncontrolled', 'BP not controllable to target before lytic (e.g., >185/110 mmHg)'),
      yesNo('other_abs', 'Other protocol absolute exclusion present'),
    ],
    calculate(values) {
      const flags = [
        ['Prior ICH', bool(values.ich_hx)],
        ['Active internal bleeding', bool(values.active_bleed)],
        ['ICH/SAH suspected or on imaging', bool(values.ich_suspected)],
        ['Recent intracranial surgery/trauma/stroke', bool(values.recent_intracranial)],
        ['Coagulopathy / anticoagulant exclusion', bool(values.coagulopathy)],
        ['Aortic dissection', bool(values.aortic_dissection)],
        ['Infective endocarditis concern', bool(values.infective_endocarditis)],
        ['High-risk intracranial neoplasm', bool(values.neoplasm_ich)],
        ['Uncontrolled BP for lytic', bool(values.bp_uncontrolled)],
        ['Other absolute exclusion', bool(values.other_abs)],
      ] as const;
      const positives = flags.filter(([, v]) => v).map(([k]) => k);
      const score = positives.length;
      const excluded = score > 0;
      return {
        score,
        unit: 'exclusions',
        label: excluded
          ? 'Potential absolute contraindication(s) flagged'
          : 'No checklist absolute exclusions selected',
        interpretation: excluded
          ? `${score} potential absolute contraindication(s): ${positives.join('; ')}. IV thrombolysis is generally not given when true absolute exclusions apply — confirm with current AHA/ASA guidance, product label, and stroke attending. Consider EVT eligibility if LVO.`
          : 'No items on this simplified absolute list selected. Still review relative contraindications, time window, glucose, stroke severity, shared decision-making, and latest institutional checklist before dosing.',
        riskLevel: excluded ? 'critical' : 'low',
        details: [
          { label: 'Flagged items', value: excluded ? positives.join('; ') : 'None' },
          { label: 'Scope', value: 'Educational subset — not exhaustive legal/label list' },
          { label: 'Always verify', value: 'Time last known well, CT, labs, meds, BP' },
        ],
        recommendations: [
          'Tenecteplase vs alteplase per system protocol',
          'Relative exclusions (e.g., mild improving stroke) need individualized decisions',
          'DOAC management is rapidly evolving — use measured levels/protocols',
        ],
      };
    },
    evidence: {
      summary:
        'IV thrombolysis exclusions are defined by AHA/ASA guidelines and labeling. Absolute exclusions include intracranial hemorrhage, active bleeding, significant coagulopathy, and other high bleed-risk conditions. This checklist is educational and incomplete versus full protocols.',
      formula: 'Count flagged absolute-type exclusions',
      validation: 'Based on common guideline exclusion themes; always use the current official checklist at point of care.',
      references: [
        {
          title: 'AHA/ASA Guidelines for the Early Management of Patients With Acute Ischemic Stroke',
          citation: 'Powers WJ et al. Stroke. 2019 (and subsequent focused updates)',
          year: 2019,
          pmid: '31662037',
          doi: '10.1161/STR.0000000000000211',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Any absolute exclusion',
        actions: ['Do not give IV lytic', 'Document reason', 'Evaluate endovascular options if LVO', 'BP and supportive stroke care'],
      },
      {
        condition: 'No absolute exclusions',
        actions: ['Complete full eligibility checklist', 'Treat BP to target if needed', 'Consent / shared decision', 'Door-to-needle process'],
      },
    ],
    pearls: [
      'Time window and imaging selection (e.g., wake-up protocols) change eligibility independently of this list.',
      'Uncontrolled BP is modifiable — treat and reassess quickly if otherwise eligible.',
    ],
  },

  // ─── 16. OASIS ICU (simplified educational) ────────────────────────────────
  {
    id: 'oasis-score',
    name: 'OASIS ICU Score (Simplified Educational)',
    shortName: 'OASIS',
    description:
      'Simplified educational Oxford Acute Severity of Illness Score (OASIS) style inputs for ICU severity framing — not a full certified implementation.',
    category: 'critical-care',
    tags: ['oasis', 'icu', 'severity', 'mortality', 'critical care'],
    whenToUse: 'Educational severity framing with first-day ICU physiologic derangement (not for formal benchmarking).',
    whyUse: 'OASIS uses a limited variable set vs APACHE; this tool approximates risk bands for teaching.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 16, max: 120, defaultValue: 65 }),
      numberInput('gcs', 'Worst GCS (1–15)', { min: 3, max: 15, defaultValue: 14, helpText: 'Use lowest appropriate GCS' }),
      numberInput('hr', 'Heart rate (highest)', { unit: '/min', min: 20, max: 300, defaultValue: 110 }),
      numberInput('map', 'Mean arterial pressure (lowest)', { unit: 'mmHg', min: 20, max: 200, defaultValue: 70 }),
      numberInput('rr', 'Respiratory rate (highest)', { unit: '/min', min: 4, max: 80, defaultValue: 24 }),
      numberInput('temp', 'Temperature (most abnormal, °C)', { unit: '°C', min: 30, max: 43, step: 0.1, defaultValue: 37.5 }),
      numberInput('uop', 'Urine output (24 h)', { unit: 'mL', min: 0, max: 10000, defaultValue: 1200 }),
      yesNo('vent', 'Mechanical ventilation (day 1)', 9),
      yesNo('elective', 'Elective surgery admission', -2),
      yesNo('cancer', 'Pre-ICU hospital length of stay prolonged / cancer context (educational flag)', 2),
    ],
    calculate(values) {
      // Educational simplified point approximation inspired by OASIS domains (not official table)
      let pts = 0;
      const age = num(values.age, 65);
      if (age >= 80) pts += 9;
      else if (age >= 70) pts += 7;
      else if (age >= 60) pts += 5;
      else if (age >= 50) pts += 3;
      else if (age >= 40) pts += 2;

      const gcs = num(values.gcs, 14);
      if (gcs <= 7) pts += 10;
      else if (gcs <= 10) pts += 7;
      else if (gcs <= 13) pts += 4;
      else if (gcs === 14) pts += 1;

      const hr = num(values.hr, 110);
      if (hr >= 150) pts += 6;
      else if (hr >= 120) pts += 4;
      else if (hr >= 110) pts += 2;
      else if (hr < 40) pts += 4;

      const map = num(values.map, 70);
      if (map < 40) pts += 6;
      else if (map < 60) pts += 4;
      else if (map < 70) pts += 2;

      const rr = num(values.rr, 24);
      if (rr >= 40) pts += 6;
      else if (rr >= 30) pts += 4;
      else if (rr >= 22) pts += 2;
      else if (rr <= 6) pts += 6;

      const temp = num(values.temp, 37.5);
      if (temp >= 40 || temp < 33) pts += 4;
      else if (temp >= 39 || temp < 35) pts += 2;

      const uop = num(values.uop, 1200);
      if (uop < 100) pts += 8;
      else if (uop < 500) pts += 5;
      else if (uop < 1000) pts += 2;

      if (bool(values.vent)) pts += 9;
      if (!bool(values.elective)) pts += 2; // emergency/non-elective burden
      if (bool(values.cancer)) pts += 2;

      const r = riskFromThresholds(pts, [
        {
          max: 15,
          level: 'low',
          label: 'Lower educational severity band',
          interpretation: `Simplified OASIS-style points ≈${pts}. Lower band on this educational scale — still use clinical judgment and formal validated calculators for prognostication/benchmarking.`,
        },
        {
          max: 30,
          level: 'moderate',
          label: 'Moderate educational severity',
          interpretation: `Simplified points ≈${pts}. Moderate severity framing — ensure organ support, source control, and goals-of-care clarity as appropriate.`,
        },
        {
          max: 45,
          level: 'high',
          label: 'High educational severity',
          interpretation: `Simplified points ≈${pts}. High severity educational band — intensive monitoring and support; formal mortality models if needed for audit.`,
        },
        {
          max: 200,
          level: 'critical',
          label: 'Very high educational severity',
          interpretation: `Simplified points ≈${pts}. Very high severity on this teaching approximation — not a calibrated mortality %; use official OASIS/APACHE tools for reported probabilities.`,
        },
      ]);
      return {
        score: pts,
        unit: 'approx points',
        ...r,
        details: [
          { label: 'Age', value: `${age} y` },
          { label: 'GCS', value: String(gcs) },
          { label: 'HR / MAP / RR', value: `${hr} / ${map} / ${rr}` },
          { label: 'Temp / UOP', value: `${temp} °C / ${uop} mL` },
          { label: 'Ventilated', value: bool(values.vent) ? 'Yes' : 'No' },
          { label: 'Disclaimer', value: 'NOT official OASIS logistic equation' },
        ],
      };
    },
    evidence: {
      summary:
        'OASIS predicts ICU mortality from a reduced set of first-day variables (age, vitals, GCS, urine output, ventilation, elective surgery, etc.). This implementation is a simplified educational point map, not the official published scoring table or logit.',
      formula: 'Educational weighted points from OASIS-like domains',
      validation: 'Original OASIS validated on large ICU databases; use published tools for operational mortality estimates.',
      references: [
        {
          title: 'A new severity of illness scale using a subset of APACHE data elements showing comparable predictive accuracy',
          citation: 'Johnson AE et al. Crit Care Med. 2013;41:1711-1718 (OASIS)',
          year: 2013,
          pmid: '23660729',
          doi: '10.1097/CCM.0b013e31828a24fe',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'High simplified severity',
        actions: ['Full organ-failure assessment', 'Reassess goals of care', 'Use institutional severity tools for audit'],
      },
      {
        condition: 'Any ICU admission',
        actions: ['Do not use this educational score alone for futility decisions'],
      },
    ],
    pearls: [
      'Official OASIS has specific point tables and a logistic formula for probability.',
      'Elective surgical admissions generally carry lower risk than emergency medical admissions.',
    ],
  },

  // ─── 17. SAPS III simplified educational ───────────────────────────────────
  {
    id: 'saps-iii-simp',
    name: 'SAPS III Simplified (Educational)',
    shortName: 'SAPS III simp',
    description:
      'Educational simplified SAPS III-style severity framing from admission circumstances and early physiology — not the full official score.',
    category: 'critical-care',
    tags: ['saps-iii', 'icu', 'severity', 'mortality', 'critical care'],
    whenToUse: 'Teaching ICU severity concepts when full SAPS III data elements are unavailable.',
    whyUse: 'Highlights patient characteristics, infection, and physiology domains used in SAPS III thinking.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 16, max: 120, defaultValue: 70 }),
      selectInput('los_before', 'Hospital LOS before ICU', [
        { label: '<14 days', value: 0 },
        { label: '14–27 days', value: 6 },
        { label: '≥28 days', value: 8 },
      ]),
      selectInput('admission', 'ICU admission type', [
        { label: 'Planned / elective', value: 0 },
        { label: 'Unplanned / emergency', value: 5 },
      ]),
      yesNo('infection', 'Infection at ICU admission', 5),
      yesNo('cancer_meta', 'Metastatic cancer', 8),
      yesNo('heme_cancer', 'Hematologic cancer', 6),
      yesNo('cirrhosis', 'Cirrhosis', 6),
      yesNo('heart_fail', 'Chronic heart failure NYHA IV / severe CHF flag', 4),
      numberInput('gcs', 'GCS', { min: 3, max: 15, defaultValue: 13 }),
      numberInput('sbp', 'Lowest systolic BP', { unit: 'mmHg', min: 40, max: 250, defaultValue: 100 }),
      numberInput('hr', 'Highest heart rate', { unit: '/min', min: 30, max: 250, defaultValue: 100 }),
      numberInput('bili', 'Total bilirubin', { unit: 'mg/dL', min: 0, max: 40, step: 0.1, defaultValue: 1 }),
      numberInput('cr', 'Creatinine', { unit: 'mg/dL', min: 0.1, max: 20, step: 0.1, defaultValue: 1.2 }),
      numberInput('wbc', 'WBC', { unit: '×10³/µL', min: 0, max: 100, step: 0.1, defaultValue: 12 }),
      numberInput('ph', 'Lowest pH', { min: 6.5, max: 7.8, step: 0.01, defaultValue: 7.35 }),
      yesNo('vent', 'Mechanical ventilation', 5),
    ],
    calculate(values) {
      let pts = num(values.los_before) + num(values.admission);
      const age = num(values.age, 70);
      if (age >= 80) pts += 15;
      else if (age >= 75) pts += 13;
      else if (age >= 70) pts += 11;
      else if (age >= 60) pts += 8;
      else if (age >= 40) pts += 5;

      if (bool(values.infection)) pts += 5;
      if (bool(values.cancer_meta)) pts += 8;
      if (bool(values.heme_cancer)) pts += 6;
      if (bool(values.cirrhosis)) pts += 6;
      if (bool(values.heart_fail)) pts += 4;

      const gcs = num(values.gcs, 13);
      if (gcs < 5) pts += 15;
      else if (gcs < 7) pts += 10;
      else if (gcs < 11) pts += 7;
      else if (gcs < 14) pts += 3;

      const sbp = num(values.sbp, 100);
      if (sbp < 40) pts += 11;
      else if (sbp < 70) pts += 8;
      else if (sbp < 120) pts += 3;

      const hr = num(values.hr, 100);
      if (hr >= 160) pts += 5;
      else if (hr >= 120) pts += 3;

      const bili = num(values.bili, 1);
      if (bili >= 6) pts += 5;
      else if (bili >= 2) pts += 3;

      const cr = num(values.cr, 1.2);
      if (cr >= 3.5) pts += 7;
      else if (cr >= 2) pts += 5;
      else if (cr >= 1.2) pts += 2;

      const wbc = num(values.wbc, 12);
      if (wbc >= 20 || wbc < 1) pts += 3;

      const ph = num(values.ph, 7.35);
      if (ph < 7.2) pts += 5;
      else if (ph < 7.25) pts += 3;

      if (bool(values.vent)) pts += 5;

      const r = riskFromThresholds(pts, [
        {
          max: 30,
          level: 'low',
          label: 'Lower educational SAPS-III-style band',
          interpretation: `Simplified SAPS III-style points ≈${pts}. Lower educational band only — not a calibrated hospital mortality probability.`,
        },
        {
          max: 50,
          level: 'moderate',
          label: 'Moderate educational severity',
          interpretation: `Simplified points ≈${pts}. Moderate severity teaching band — full organ support planning as clinically indicated.`,
        },
        {
          max: 70,
          level: 'high',
          label: 'High educational severity',
          interpretation: `Simplified points ≈${pts}. High severity educational estimate — use official SAPS III software/tables for reported mortality.`,
        },
        {
          max: 300,
          level: 'critical',
          label: 'Very high educational severity',
          interpretation: `Simplified points ≈${pts}. Very high teaching band. Do not equate to official SAPS III predicted mortality % without the published equation.`,
        },
      ]);
      return {
        score: pts,
        unit: 'approx points',
        ...r,
        details: [
          { label: 'Age points component', value: `Age ${age}` },
          { label: 'Infection / cancer flags', value: `Inf ${bool(values.infection) ? 'Y' : 'N'}; meta ${bool(values.cancer_meta) ? 'Y' : 'N'}` },
          { label: 'GCS / SBP', value: `${gcs} / ${sbp}` },
          { label: 'Disclaimer', value: 'NOT full official SAPS III' },
        ],
      };
    },
    evidence: {
      summary:
        'SAPS III estimates hospital mortality from admission data within the first hour of ICU care across patient characteristics, circumstances, and physiology. This calculator is a simplified educational proxy, not the complete SAPS III custom equation.',
      formula: 'Educational weighted points from SAPS III-like domains',
      validation: 'Original SAPS III developed on multinational ICU cohort (Metnitz/Moreno); use official calculators operationally.',
      references: [
        {
          title: 'SAPS 3—From evaluation of the patient to evaluation of the intensive care unit',
          citation: 'Moreno RP et al. Intensive Care Med. 2005;31:1345-1355',
          year: 2005,
          pmid: '16132893',
          doi: '10.1007/s00134-005-2762-6',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Elevated educational score',
        actions: ['Comprehensive ICU assessment', 'Avoid futility decisions from simplified tools alone', 'Document severity with approved systems if benchmarking'],
      },
    ],
    pearls: [
      'SAPS III performance depends on case-mix and custom equations.',
      'Early physiology window differs from APACHE worst-in-24h approach.',
    ],
  },

  // ─── 18. NRS-2002 ──────────────────────────────────────────────────────────
  {
    id: 'nrs-2002',
    name: 'NRS-2002 Nutrition Risk Screening',
    shortName: 'NRS-2002',
    description:
      'Nutrition Risk Screening 2002: impaired nutritional status + disease severity (+ age) for hospital nutrition risk.',
    category: 'general',
    tags: ['nrs-2002', 'nutrition', 'malnutrition', 'screening', 'hospital'],
    whenToUse: 'Hospital admission nutrition screening to identify patients needing nutrition care plans.',
    whyUse: 'ESPEN-endorsed screen; total ≥3 indicates nutritionally at risk.',
    inputs: [
      selectInput('nutrition', 'Impaired nutritional status score', [
        { label: '0 — Normal nutritional status', value: 0 },
        {
          label: '1 — Mild: wt loss >5% in 3 mo OR food intake 50–75% of normal in preceding week',
          value: 1,
        },
        {
          label: '2 — Moderate: wt loss >5% in 2 mo OR BMI 18.5–20.5 + impaired condition OR intake 25–50%',
          value: 2,
        },
        {
          label: '3 — Severe: wt loss >5% in 1 mo (>15% in 3 mo) OR BMI <18.5 + impaired condition OR intake 0–25%',
          value: 3,
        },
      ]),
      selectInput('severity', 'Severity of disease score', [
        { label: '0 — Normal nutritional requirements', value: 0 },
        { label: '1 — Mild: e.g., hip fracture, chronic disease (cirrhosis, COPD, dialysis, diabetes, cancer)', value: 1 },
        { label: '2 — Moderate: e.g., major abdominal surgery, stroke, severe pneumonia, hematologic malignancy', value: 2 },
        { label: '3 — Severe: e.g., head injury, bone marrow transplant, intensive care patients (APACHE >10)', value: 3 },
      ]),
      yesNo('age70', 'Age ≥70 years (+1)', 1),
    ],
    calculate(values) {
      const nut = num(values.nutrition);
      const sev = num(values.severity);
      const agePts = bool(values.age70) ? 1 : 0;
      const score = nut + sev + agePts;
      const atRisk = score >= 3;
      return {
        score,
        unit: '/7',
        label: atRisk ? 'Nutritionally at risk (NRS ≥3)' : 'Not at risk by NRS-2002 (<3)',
        interpretation: atRisk
          ? `NRS-2002 total ${score} (≥3): patient is nutritionally at risk — initiate nutrition care plan, dietitian referral, monitor intake/weight, consider oral supplements or enteral/parenteral support as indicated.`
          : `NRS-2002 total ${score} (<3): not currently at risk by this screen. Rescreen weekly in hospital; start preventive nutrition if clinical course worsens.`,
        riskLevel: score >= 5 ? 'high' : atRisk ? 'moderate' : 'low',
        details: [
          { label: 'Nutrition impairment', value: String(nut) },
          { label: 'Disease severity', value: String(sev) },
          { label: 'Age ≥70', value: agePts ? '+1' : '0' },
          { label: 'At-risk cutoff', value: '≥3' },
        ],
        recommendations: [
          'If score 3–4 borderline severe illness, ensure progressive nutrition plan',
          'ICU patients often score high on severity — early feeding protocols',
          'Screen ≠ full GLIM malnutrition diagnosis',
        ],
      };
    },
    evidence: {
      summary:
        'NRS-2002 sums impaired nutritional status (0–3) + severity of disease (0–3) +1 if age ≥70. Total ≥3 identifies patients who benefit from nutrition support planning.',
      formula: 'Score = nutrition (0–3) + disease severity (0–3) + age≥70 (0–1)',
      validation: 'Developed by Kondrup et al.; recommended by ESPEN for hospital inpatient screening.',
      references: [
        {
          title: 'Nutritional risk screening (NRS 2002)',
          citation: 'Kondrup J et al. Clin Nutr. 2003;22:321-336',
          year: 2003,
          pmid: '12765673',
          doi: '10.1016/s0261-5614(02)00214-5',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'NRS ≥3',
        actions: ['Dietitian consult', 'High-protein high-calorie plan', 'Treat underlying disease', 'Weekly re-screening'],
      },
      {
        condition: 'NRS <3',
        actions: ['Standard hospital diet', 'Weekly rescreen', 'Educate if mild impairment present'],
      },
    ],
    pearls: [
      'When nutrition and severity are both ≥3, patient is severely at risk — prioritize support.',
      'Use clinical judgment for fluid-overloaded BMI.',
    ],
  },

  // ─── 19. Charcot triad ─────────────────────────────────────────────────────
  {
    id: 'charcot-triad',
    name: 'Charcot Cholangitis Triad / Pentad Helper',
    shortName: 'Charcot',
    description:
      'Counts Charcot triad features (RUQ pain, jaundice, fever) and optional Reynolds pentad additions for ascending cholangitis framing.',
    category: 'gastroenterology',
    tags: ['charcot', 'cholangitis', 'biliary', 'reynolds', 'sepsis'],
    whenToUse: 'Suspected acute ascending cholangitis to structure classic clinical features (with Tokyo criteria preferred for formal diagnosis).',
    whyUse: 'Classic teaching triad/pentad; sensitivity is limited — absence does not exclude cholangitis.',
    inputs: [
      yesNo('ruq', 'Right upper quadrant / biliary pain'),
      yesNo('jaundice', 'Jaundice (clinical or bilirubin elevated)'),
      yesNo('fever', 'Fever / chills'),
      yesNo('hypotension', 'Hypotension / shock (Reynolds)'),
      yesNo('ams', 'Altered mental status (Reynolds)'),
    ],
    calculate(values) {
      const ruq = bool(values.ruq);
      const jaundice = bool(values.jaundice);
      const fever = bool(values.fever);
      const hypo = bool(values.hypotension);
      const ams = bool(values.ams);
      const triad = (ruq ? 1 : 0) + (jaundice ? 1 : 0) + (fever ? 1 : 0);
      const pentadExtra = (hypo ? 1 : 0) + (ams ? 1 : 0);
      const total = triad + pentadExtra;

      let label: string;
      let interpretation: string;
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical';

      if (triad === 3 && pentadExtra === 2) {
        label = 'Full Reynolds pentad present';
        interpretation =
          'All five classic features present (Charcot triad + hypotension + AMS). Suggests severe/suppurative cholangitis with sepsis — emergent resuscitation, broad antibiotics, and urgent biliary decompression.';
        riskLevel = 'critical';
      } else if (triad === 3) {
        label = 'Charcot triad complete';
        interpretation = `Classic Charcot triad present${pentadExtra ? ` with ${pentadExtra} Reynolds feature(s)` : ''}. High clinical suspicion for ascending cholangitis — labs, cultures, imaging, IV antibiotics, and source control planning. Apply Tokyo severity grading.`;
        riskLevel = pentadExtra ? 'critical' : 'high';
      } else if (triad === 2) {
        label = 'Two of three Charcot features';
        interpretation = `Partial triad (${triad}/3)${pentadExtra ? ` + Reynolds features (${pentadExtra})` : ''}. Cholangitis not excluded — use systemic inflammation + cholestasis + biliary dilation/etiology (Tokyo criteria).`;
        riskLevel = pentadExtra ? 'high' : 'moderate';
      } else {
        label = 'Fewer than two Charcot features';
        interpretation = `Only ${triad}/3 triad features${pentadExtra ? ` with ${pentadExtra} severity feature(s)` : ''}. Classic triad is insensitive — still evaluate for cholangitis if sepsis + biliary obstruction risk (stones, stent, malignancy).`;
        riskLevel = pentadExtra ? 'high' : 'low';
      }

      return {
        score: total,
        unit: 'features',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Charcot triad count', value: `${triad}/3` },
          { label: 'Reynolds extras', value: `${pentadExtra}/2 (hypotension, AMS)` },
          { label: 'RUQ / Jaundice / Fever', value: `${ruq ? 'Y' : 'N'} / ${jaundice ? 'Y' : 'N'} / ${fever ? 'Y' : 'N'}` },
        ],
      };
    },
    evidence: {
      summary:
        'Charcot triad = RUQ pain + jaundice + fever. Reynolds pentad adds hypotension and mental status change. Modern diagnosis uses Tokyo Guidelines (systemic inflammation, cholestasis, imaging). Triad is specific but insensitive.',
      formula: 'Count triad (0–3) and Reynolds extras (0–2)',
      validation: 'Historical clinical teaching; Tokyo criteria are preferred for research and severity grading.',
      references: [
        {
          title: 'Tokyo Guidelines for acute cholangitis (diagnostic criteria and severity)',
          citation: 'Kiriyama S et al. J Hepatobiliary Pancreat Sci. 2018; TG18',
          year: 2018,
          pmid: '29090868',
          doi: '10.1002/jhbp.519',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Suspected cholangitis',
        actions: ['Blood cultures', 'CBC, CMP, lipase', 'RUQ US / CT', 'IV fluids + broad antibiotics', 'Urgent ERCP / decompression if indicated'],
      },
      {
        condition: 'Reynolds features / septic shock',
        actions: ['Sepsis bundle', 'ICU', 'Source control without delay'],
      },
    ],
    pearls: [
      'Elderly patients may lack fever or pain.',
      'Stented patients can have cholangitis without dramatic jaundice.',
    ],
  },

  // ─── 20. Reynolds pentad ───────────────────────────────────────────────────
  {
    id: 'reynolds-pentad',
    name: 'Reynolds Pentad',
    shortName: 'Reynolds',
    description:
      'Checks Reynolds pentad features of severe ascending cholangitis: Charcot triad plus hypotension and altered mentation.',
    category: 'gastroenterology',
    tags: ['reynolds', 'pentad', 'cholangitis', 'sepsis', 'biliary'],
    whenToUse: 'When severe cholangitis / septic biliary obstruction is suspected.',
    whyUse: 'Flags the classic severe phenotype requiring emergent decompression — rare but high acuity.',
    inputs: [
      yesNo('ruq', 'RUQ / biliary pain'),
      yesNo('jaundice', 'Jaundice'),
      yesNo('fever', 'Fever / rigors'),
      yesNo('hypotension', 'Hypotension or shock'),
      yesNo('ams', 'Altered mental status'),
    ],
    calculate(values) {
      const items = [
        ['RUQ pain', bool(values.ruq)],
        ['Jaundice', bool(values.jaundice)],
        ['Fever', bool(values.fever)],
        ['Hypotension', bool(values.hypotension)],
        ['Altered mentation', bool(values.ams)],
      ] as const;
      const score = items.filter(([, v]) => v).length;
      const hypo = bool(values.hypotension);
      const ams = bool(values.ams);
      const triad = (bool(values.ruq) ? 1 : 0) + (bool(values.jaundice) ? 1 : 0) + (bool(values.fever) ? 1 : 0);
      const full = score === 5;

      let label: string;
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical';
      let interpretation: string;

      if (full) {
        label = 'Complete Reynolds pentad';
        riskLevel = 'critical';
        interpretation =
          'All five Reynolds features present. Treat as life-threatening acute cholangitis with sepsis/shock — immediate resuscitation, antibiotics, and emergency biliary drainage.';
      } else if (hypo || ams) {
        label = `Incomplete pentad (${score}/5) with severity feature(s)`;
        riskLevel = 'critical';
        interpretation = `${score}/5 features; hypotension and/or AMS present. Even without full pentad, this is a severe cholangitis phenotype until proven otherwise — urgent source control.`;
      } else if (triad === 3) {
        label = 'Charcot triad without shock/AMS';
        riskLevel = 'high';
        interpretation = 'Full Charcot triad without Reynolds extras. Still treat promptly for cholangitis; monitor closely for deterioration to severe grade.';
      } else {
        label = `Reynolds features ${score}/5`;
        riskLevel = score >= 2 ? 'moderate' : 'low';
        interpretation = `${score}/5 classic features. Full pentad is uncommon; do not require it to diagnose or treat cholangitis. Use Tokyo criteria and clinical sepsis assessment.`;
      }

      return {
        score,
        unit: '/5',
        label,
        interpretation,
        riskLevel,
        details: items.map(([k, v]) => ({ label: k, value: v ? 'Yes' : 'No' })),
      };
    },
    evidence: {
      summary:
        'Reynolds pentad (1960s) = Charcot triad + hypotension + confusion, describing severe acute obstructive cholangitis. Highly specific when complete but insensitive; modern care uses severity grades and early drainage.',
      formula: 'Count of 5 classic features',
      validation: 'Historical descriptor; Tokyo Guidelines define severity more reliably for practice.',
      references: [
        {
          title: 'Acute obstructive cholangitis: a distinct clinical syndrome',
          citation: 'Reynolds BM, Dargan EL. Ann Surg. 1959;150:299-303',
          year: 1959,
          pmid: '13670595',
          doi: '10.1097/00000658-195908000-00013',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Any hypotensive / AMS cholangitis suspicion',
        actions: ['ABC / sepsis resuscitation', 'Broad-spectrum abx (biliary + Enterococcus coverage per local resistance)', 'Urgent ERCP or percutaneous drainage', 'ICU'],
      },
    ],
    pearls: [
      'Do not wait for all 5 features to call surgery/GI for decompression.',
      'Mental status change in elderly may be the dominant clue.',
    ],
  },

  // ─── 21. TWIST score ───────────────────────────────────────────────────────
  {
    id: 'twist-score',
    name: 'TWIST Score (Testicular Torsion)',
    shortName: 'TWIST',
    description:
      'TWIST (Testicular Workup for Ischemia and Suspected Torsion) clinical score to risk-stratify suspected torsion.',
    category: 'emergency',
    tags: ['twist', 'testicular torsion', 'urology', 'scrotum', 'pediatric', 'emergency'],
    whenToUse: 'Acute scrotal pain when testicular torsion is in the differential (often boys/adolescents).',
    whyUse: 'Stratifies low vs intermediate vs high risk to guide ultrasound vs immediate urology exploration pathways.',
    inputs: [
      yesNo('swelling', 'Testicular swelling (2 points)', 2),
      yesNo('hard', 'Hard testis (2 points)', 2),
      yesNo('cremaster', 'Absent cremasteric reflex (1 point)', 1),
      yesNo('nv', 'Nausea or vomiting (1 point)', 1),
      yesNo('high', 'High-riding testis (1 point)', 1),
    ],
    calculate(values) {
      const score =
        (bool(values.swelling) ? 2 : 0) +
        (bool(values.hard) ? 2 : 0) +
        (bool(values.cremaster) ? 1 : 0) +
        (bool(values.nv) ? 1 : 0) +
        (bool(values.high) ? 1 : 0);
      const r = riskFromThresholds(score, [
        {
          max: 2,
          level: 'low',
          label: 'Low risk for torsion',
          interpretation: `TWIST ${score}/7: low-risk band (0–2). Torsion less likely; still use clinical judgment. Ultrasound if any residual concern; alternative diagnoses (epididymitis, torsion of appendix testis).`,
        },
        {
          max: 4,
          level: 'moderate',
          label: 'Intermediate risk',
          interpretation: `TWIST ${score}/7: intermediate (3–4). Obtain urgent scrotal Doppler ultrasound and urology involvement; do not delay if clinical suspicion is high.`,
        },
        {
          max: 7,
          level: 'critical',
          label: 'High risk for torsion',
          interpretation: `TWIST ${score}/7: high-risk band (5–7). High likelihood of torsion — immediate urology consult for surgical exploration; do not delay OR for ultrasound if suspicion is clear.`,
        },
      ]);
      return {
        score,
        unit: '/7',
        ...r,
        details: [
          { label: 'Swelling (2)', value: bool(values.swelling) ? 'Yes' : 'No' },
          { label: 'Hard testis (2)', value: bool(values.hard) ? 'Yes' : 'No' },
          { label: 'Absent cremasteric (1)', value: bool(values.cremaster) ? 'Yes' : 'No' },
          { label: 'Nausea/vomiting (1)', value: bool(values.nv) ? 'Yes' : 'No' },
          { label: 'High-riding (1)', value: bool(values.high) ? 'Yes' : 'No' },
          { label: 'Bands', value: '0–2 low; 3–4 intermediate; 5–7 high' },
        ],
      };
    },
    evidence: {
      summary:
        'TWIST assigns points for swelling (2), hard testis (2), absent cremasteric reflex (1), nausea/vomiting (1), high-riding testis (1). Totals 0–2 low, 3–4 intermediate, 5–7 high risk for torsion.',
      formula: '2+2+1+1+1 = 0–7',
      validation: 'Derived and validated in pediatric acute scrotum cohorts to reduce unnecessary US in low/high extremes (protocol-dependent).',
      references: [
        {
          title: 'Testicular Workup for Ischemia and Suspected Torsion (TWIST) score',
          citation: 'Barbosa JA et al. J Urol. 2013;189:1859-1864',
          year: 2013,
          pmid: '32844355',
          doi: '10.1007/s11255-020-02618-4',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'TWIST 5–7 or clear clinical torsion',
        actions: ['NPO', 'Immediate urology', 'OR exploration', 'Manual detorsion attempt only as bridge if trained'],
      },
      {
        condition: 'TWIST 3–4',
        actions: ['Stat Doppler US', 'Parallel urology notify', 'Analgesia'],
      },
      {
        condition: 'TWIST 0–2 with low concern',
        actions: ['Consider US if any doubt', 'UA', 'Follow-up precautions (return if pain worsens)'],
      },
    ],
    pearls: [
      'Time is testis — imaging must not delay definitive care in high probability cases.',
      'Normal cremasteric reflex does not 100% exclude torsion.',
    ],
  },

  // ─── 22. CHOKAI score ──────────────────────────────────────────────────────
  {
    id: 'chokai-score',
    name: 'CHOKAI Score (Ureterolithiasis)',
    shortName: 'CHOKAI',
    description:
      'CHOKAI clinical score to estimate likelihood of ureteral stone in acute flank pain (0–13).',
    category: 'emergency',
    tags: ['chokai', 'kidney stone', 'ureterolithiasis', 'flank pain', 'urology'],
    whenToUse: 'ED evaluation of suspected renal colic to support probability of ureterolithiasis.',
    whyUse: 'May help risk-stratify need for imaging intensity alongside STONE score concepts.',
    inputs: [
      yesNo('nv', 'Nausea or vomiting (1)', 1),
      yesNo('hydro', 'Hydronephrosis on ultrasound (4)', 4),
      yesNo('hematuria', 'Hematuria (3)', 3),
      yesNo('history', 'History of urolithiasis (1)', 1),
      yesNo('male', 'Male sex (1)', 1),
      yesNo('crp', 'CRP ≤0.5 mg/dL (2)', 2),
      yesNo('age', 'Age ≤60 years (1)', 1),
    ],
    calculate(values) {
      const score =
        (bool(values.nv) ? 1 : 0) +
        (bool(values.hydro) ? 4 : 0) +
        (bool(values.hematuria) ? 3 : 0) +
        (bool(values.history) ? 1 : 0) +
        (bool(values.male) ? 1 : 0) +
        (bool(values.crp) ? 2 : 0) +
        (bool(values.age) ? 1 : 0);
      const r = riskFromThresholds(score, [
        {
          max: 5,
          level: 'low',
          label: 'Lower likelihood of ureterolithiasis',
          interpretation: `CHOKAI ${score}/13: below common positive cutoff (≥6). Stone less likely — broaden differential (AAA, pyelo, diverticulitis, gynecologic, torsion, etc.) and image based on clinical concern.`,
        },
        {
          max: 13,
          level: 'high',
          label: 'Higher likelihood of ureterolithiasis',
          interpretation: `CHOKAI ${score}/13 (≥6): higher probability of ureteral stone in validation work. Still exclude dangerous mimics; choose US vs low-dose CT per age, pregnancy, and prior stone history.`,
        },
      ]);
      return {
        score,
        unit: '/13',
        ...r,
        details: [
          { label: 'Hydronephrosis (4)', value: bool(values.hydro) ? 'Yes' : 'No' },
          { label: 'Hematuria (3)', value: bool(values.hematuria) ? 'Yes' : 'No' },
          { label: 'CRP ≤0.5 (2)', value: bool(values.crp) ? 'Yes' : 'No' },
          { label: 'N/V, Hx, Male, Age≤60 (1 each)', value: 'See inputs' },
          { label: 'Common cutoff', value: '≥6 suggests stone' },
        ],
      };
    },
    evidence: {
      summary:
        'CHOKAI score: nausea/vomiting (1), hydronephrosis (4), hematuria (3), stone history (1), male (1), CRP ≤0.5 mg/dL (2), age ≤60 (1). Total 0–13; ≥6 associated with higher ureterolithiasis probability.',
      formula: 'Sum component points (0–13)',
      validation: 'Developed and validated in Japanese ED cohorts; performance may vary by population and CRP availability.',
      references: [
        {
          title: 'The CHOKAI score for prediction of ureteral stones',
          citation: 'Fukuhara H et al. Am J Emerg Med / related validation literature',
          year: 2017,
          pmid: '28633903',
          doi: '10.1016/j.ajem.2017.06.023',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'CHOKAI ≥6 with classic colic',
        actions: ['Analgesia', 'UA', 'US or low-dose noncontrast CT', 'Metabolic labs if recurrent', 'Urology if obstructed infection / solitary kidney / refractory pain'],
      },
      {
        condition: 'CHOKAI low or atypical',
        actions: ['Rule out AAA and other acute abdomen causes', 'Consider alternative imaging'],
      },
    ],
    pearls: [
      'Infected obstructing stone = urologic emergency regardless of score.',
      'Absence of hematuria does not exclude stone.',
    ],
  },

  // ─── 23. House–Brackmann ───────────────────────────────────────────────────
  {
    id: 'house-brackmann',
    name: 'House–Brackmann Facial Nerve Grade',
    shortName: 'H-B Grade',
    description:
      'House–Brackmann grading scale (I–VI) for facial nerve function / recovery after palsy or surgery.',
    category: 'neurology',
    tags: ['house-brackmann', 'facial nerve', 'bell palsy', 'ent', 'grading'],
    whenToUse: 'Baseline and follow-up grading of unilateral facial weakness (Bell’s palsy, post-op, trauma).',
    whyUse: 'Universal communication scale for severity and recovery trajectory.',
    inputs: [
      selectInput('grade', 'House–Brackmann grade', [
        {
          label: 'I — Normal facial function',
          value: 1,
          description: 'Normal symmetry and tone at rest and motion',
        },
        {
          label: 'II — Mild dysfunction',
          value: 2,
          description: 'Slight weakness; complete eye closure with minimal effort; slight synkinesis possible',
        },
        {
          label: 'III — Moderate dysfunction',
          value: 3,
          description: 'Obvious but not disfiguring difference; complete eye closure with effort; noticeable synkinesis',
        },
        {
          label: 'IV — Moderately severe dysfunction',
          value: 4,
          description: 'Disfiguring asymmetry; incomplete eye closure; normal tone at rest',
        },
        {
          label: 'V — Severe dysfunction',
          value: 5,
          description: 'Barely perceptible motion; asymmetric at rest; incomplete eye closure',
        },
        {
          label: 'VI — Total paralysis',
          value: 6,
          description: 'No movement',
        },
      ]),
    ],
    calculate(values) {
      const g = num(values.grade, 3);
      const map: Record<
        number,
        { score: string; label: string; interpretation: string; riskLevel: 'normal' | 'low' | 'moderate' | 'high' | 'critical' }
      > = {
        1: {
          score: 'I',
          label: 'Grade I — Normal',
          interpretation: 'Normal facial function in all areas. No treatment required for facial motor deficit.',
          riskLevel: 'normal',
        },
        2: {
          score: 'II',
          label: 'Grade II — Mild dysfunction',
          interpretation:
            'Mild weakness; gross eye closure intact with minimal effort. Supportive care; eye protection if any lag; expect good recovery in idiopathic palsy with standard therapy.',
          riskLevel: 'low',
        },
        3: {
          score: 'III',
          label: 'Grade III — Moderate dysfunction',
          interpretation:
            'Obvious weakness without full disfigurement; eye closes with effort. Eye care critical; steroids (± antivirals per protocol) if acute Bell’s; track recovery.',
          riskLevel: 'moderate',
        },
        4: {
          score: 'IV',
          label: 'Grade IV — Moderately severe',
          interpretation:
            'Disfiguring asymmetry and incomplete eye closure. Aggressive ocular protection (lubrication, taping, ophthalmology); close follow-up for recovery vs reinnervation planning.',
          riskLevel: 'high',
        },
        5: {
          score: 'V',
          label: 'Grade V — Severe dysfunction',
          interpretation:
            'Barely perceptible motion; resting asymmetry. High risk of corneal injury — ophthalmology; consider electrodiagnostics and facial plastics/ENT for incomplete recovery pathways.',
          riskLevel: 'high',
        },
        6: {
          score: 'VI',
          label: 'Grade VI — Total paralysis',
          interpretation:
            'No movement. Urgent eye protection; evaluate etiology (stroke vs peripheral); specialist follow-up for decompression/reanimation decisions in selected cases.',
          riskLevel: 'critical',
        },
      };
      const m = map[g] ?? map[3];
      return {
        score: m.score,
        label: m.label,
        interpretation: m.interpretation,
        riskLevel: m.riskLevel,
        details: [
          { label: 'Scale', value: 'House–Brackmann I–VI' },
          { label: 'Eye closure', value: g <= 3 ? 'Complete (I–III)' : 'Incomplete (IV–VI)' },
        ],
        recommendations: [
          'Document resting symmetry, forehead, eye, mouth separately if needed (e.g., Sunnybrook)',
          'Corneal protection whenever closure incomplete',
          'Acute Bell’s: early corticosteroids if no contraindication',
        ],
      };
    },
    evidence: {
      summary:
        'House–Brackmann grades facial nerve function from I (normal) to VI (total paralysis), incorporating gross observation of rest and motion, eye closure, and synkinesis.',
      formula: 'Clinician-assigned grade I–VI',
      validation: 'AAO-HNS standard reporting scale; inter-rater variability exists for mid grades — still widely used.',
      references: [
        {
          title: 'Facial nerve grading system',
          citation: 'House JW, Brackmann DE. Otolaryngol Head Neck Surg. 1985;93:146-147',
          year: 1985,
          pmid: '3921901',
          doi: '10.1177/019459988509300202',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Grade IV–VI',
        actions: ['Ocular lubrication / moisture chamber', 'Ophthalmology if corneal risk', 'ENT/neurology as indicated', 'Follow recovery at 3 months for reanimation discussion'],
      },
      {
        condition: 'Acute idiopathic palsy',
        actions: ['Prednisone early', 'Eye care', 'Consider antivirals in selected cases', 'Atypical features → imaging'],
      },
    ],
    pearls: [
      'Forehead sparing suggests central (UMN) lesion — stroke workup.',
      'Synkinesis appears during recovery and is incorporated into mid-grade assignment.',
    ],
  },

  // ─── 24. SNOT-22 ───────────────────────────────────────────────────────────
  {
    id: 'snot-22',
    name: 'SNOT-22 Sinonasal Total',
    shortName: 'SNOT-22',
    description:
      'Interprets Sino-Nasal Outcome Test-22 total (0–110) for chronic rhinosinusitis symptom burden and QoL.',
    category: 'otolaryngology',
    tags: ['snot-22', 'sinusitis', 'crs', 'ent', 'quality of life'],
    whenToUse: 'Chronic rhinosinusitis evaluation and post-medical/surgical treatment monitoring.',
    whyUse: 'Standard CRS patient-reported outcome; tracks response (MCID often ~8–9 points).',
    inputs: [
      numberInput('score', 'SNOT-22 total (0–110)', {
        min: 0,
        max: 110,
        defaultValue: 40,
        helpText: '22 items scored 0–5 (no problem → problem as bad as can be)',
      }),
    ],
    calculate(values) {
      const score = num(values.score, 40);
      const r = riskFromThresholds(score, [
        {
          max: 20,
          level: 'low',
          label: 'Mild symptom burden',
          interpretation: `SNOT-22 ${score}/110: milder CRS symptom/QoL burden. Optimize medical therapy (saline, intranasal steroids); address allergy/irritants.`,
        },
        {
          max: 50,
          level: 'moderate',
          label: 'Moderate symptom burden',
          interpretation: `SNOT-22 ${score}/110: moderate burden. Escalate medical therapy; consider CT if not done; ENT referral for refractory symptoms.`,
        },
        {
          max: 70,
          level: 'high',
          label: 'Severe symptom burden',
          interpretation: `SNOT-22 ${score}/110: severe QoL impact. Comprehensive CRS care; evaluate surgical candidacy if maximal medical therapy fails.`,
        },
        {
          max: 110,
          level: 'critical',
          label: 'Very severe symptom burden',
          interpretation: `SNOT-22 ${score}/110: very severe burden. Multidisciplinary ENT care; ensure correct phenotype (eosinophilic, polyps, AERD, immunodeficiency).`,
        },
      ]);
      return {
        score,
        unit: '/110',
        ...r,
        details: [
          { label: 'Items', value: '22 × 0–5' },
          { label: 'MCID (approx.)', value: '≈8.9 points' },
          { label: 'Domains', value: 'Rhinologic, extranasal, ear/facial, psychological, sleep' },
        ],
      };
    },
    evidence: {
      summary:
        'SNOT-22 is a 22-item (0–5) CRS quality-of-life instrument (total 0–110). Higher scores indicate worse burden; minimal clinically important difference is commonly ≈9 points.',
      formula: 'Sum of 22 items (0–110)',
      validation: 'Widely validated in chronic rhinosinusitis medical and surgical outcomes research.',
      references: [
        {
          title: 'Psychometric validity of the 22-item Sinonasal Outcome Test',
          citation: 'Hopkins C et al. Clin Otolaryngol. 2009;34:447-454',
          year: 2009,
          pmid: '19793277',
          doi: '10.1111/j.1749-4486.2009.01995.x',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Elevated SNOT-22 with CRS',
        actions: ['Intranasal corticosteroid', 'High-volume saline', 'Short rescue therapies as indicated', 'CT + endoscopy if refractory', 'Consider ESS if appropriate'],
      },
      {
        condition: 'Post-treatment change ≥9 points',
        actions: ['Document clinically meaningful response', 'Continue maintenance therapy'],
      },
    ],
    pearls: [
      'Sleep and psychological domains often dominate total — treat the whole patient.',
      'Normal healthy scores are typically low (often <10–20).',
    ],
  },

  // ─── 25. NOSE scale ────────────────────────────────────────────────────────
  {
    id: 'nose-scale',
    name: 'NOSE Scale (Nasal Obstruction)',
    shortName: 'NOSE',
    description:
      'Nasal Obstruction Symptom Evaluation (NOSE) scale total (0–100) for subjective nasal obstruction severity.',
    category: 'otolaryngology',
    tags: ['nose scale', 'nasal obstruction', 'ent', 'septoplasty', 'rhinitis'],
    whenToUse: 'Quantify nasal blockage symptoms before/after medical therapy or septal/turbinate surgery.',
    whyUse: 'Brief validated 5-item scale; standard outcome for functional nasal surgery research.',
    inputs: [
      numberInput('raw', 'Sum of 5 NOSE items (0–20)', {
        min: 0,
        max: 20,
        defaultValue: 12,
        helpText: 'Each item 0–4: congestion, blockage, breathing trouble, trouble sleeping, air through nose during exercise. Scaled score = raw × 5.',
      }),
    ],
    calculate(values) {
      const raw = num(values.raw, 12);
      const score = raw * 5;
      const r = riskFromThresholds(score, [
        {
          max: 25,
          level: 'low',
          label: 'Mild nasal obstruction',
          interpretation: `NOSE ${score}/100: mild obstruction range (0–25). Medical therapy (saline, intranasal steroid, allergy control) usually first-line.`,
        },
        {
          max: 50,
          level: 'moderate',
          label: 'Moderate nasal obstruction',
          interpretation: `NOSE ${score}/100: moderate (26–50). Optimize medical therapy; ENT evaluation for structural contributors (septum, valves, turbinates).`,
        },
        {
          max: 75,
          level: 'high',
          label: 'Severe nasal obstruction',
          interpretation: `NOSE ${score}/100: severe (51–75). Significant QoL impact — specialist assessment; consider surgical options if anatomy correlates and medical therapy fails.`,
        },
        {
          max: 100,
          level: 'critical',
          label: 'Extreme nasal obstruction',
          interpretation: `NOSE ${score}/100: extreme (76–100). Marked obstruction — comprehensive ENT workup; rule out polyps, mass, severe septal deformity, or chronic sinus disease.`,
        },
      ]);
      return {
        score,
        unit: '/100',
        ...r,
        details: [
          { label: 'Raw sum (0–20)', value: String(raw) },
          { label: 'Scaled (raw × 5)', value: String(score) },
          { label: 'Bands', value: '0–25 mild; 26–50 mod; 51–75 severe; 76–100 extreme' },
        ],
      };
    },
    evidence: {
      summary:
        'NOSE scale: 5 items (0–4) on congestion, blockage, breathing trouble, sleep, and exertion. Raw sum 0–20 is multiplied by 5 for a 0–100 scale. Severity bands: mild 0–25, moderate 26–50, severe 51–75, extreme 76–100.',
      formula: 'NOSE = (sum of 5 items 0–4) × 5 → 0–100',
      validation: 'Validated by Stewart et al. for nasal obstruction outcomes, including septoplasty trials.',
      references: [
        {
          title: 'Development and validation of the Nasal Obstruction Symptom Evaluation (NOSE) scale',
          citation: 'Stewart MG et al. Otolaryngol Head Neck Surg. 2004;130:157-163',
          year: 2004,
          pmid: '14990910',
          doi: '10.1016/j.otohns.2003.09.016',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'NOSE ≥30–50 with structural disease',
        actions: ['Trial medical therapy', 'Nasal endoscopy ± imaging if sinus disease', 'Discuss functional rhinoplasty/septoplasty if appropriate'],
      },
      {
        condition: 'Post-op follow-up',
        actions: ['Compare to baseline NOSE', 'Document meaningful improvement'],
      },
    ],
    pearls: [
      'Subjective NOSE does not always correlate with acoustic rhinometry — treat the patient.',
      'Empty nose / over-resection concerns require careful surgical selection.',
    ],
  },
];
