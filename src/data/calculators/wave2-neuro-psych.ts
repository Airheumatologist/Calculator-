import type { Calculator } from '../../types/calculator';
import { num, bool, round, yesNo, selectInput, numberInput, riskFromThresholds, isMissingValue } from '../../utils/helpers';

const hit6Opts = [
  { label: 'Never (6)', value: 6 },
  { label: 'Rarely (8)', value: 8 },
  { label: 'Sometimes (10)', value: 10 },
  { label: 'Very often (11)', value: 11 },
  { label: 'Always (13)', value: 13 },
];

const auditFreq = [
  { label: 'Never (0)', value: 0 },
  { label: 'Less than monthly (1)', value: 1 },
  { label: 'Monthly (2)', value: 2 },
  { label: 'Weekly (3)', value: 3 },
  { label: 'Daily or almost daily (4)', value: 4 },
];

export const wave2NeuroPsychCalcs: Calculator[] = [
  {
    id: 'hit-6',
    name: 'HIT-6 Headache Impact Test',
    shortName: 'HIT-6',
    description: 'Six-item Headache Impact Test measuring headache-related disability (score 36–78).',
    category: 'neurology',
    tags: ['headache', 'migraine', 'disability', 'hit-6'],
    whenToUse: 'Quantify functional impact of headache/migraine in clinic or research follow-up.',
    whyUse: 'Brief, validated patient-reported impact score that tracks treatment response.',
    inputs: [
      selectInput('q1', '1. When you have headaches, how often is the pain severe?', hit6Opts, 6, 'Items 1–3 are about headaches in general (not a single attack); items 4–6 are the past 4 weeks. HIT-6™ is QualityMetric/GSK copyrighted — use the official form for administration; Likert values 6/8/10/11/13.'),
      selectInput('q2', '2. How often do headaches limit your ability to do usual daily activities including household work, work, school, or social activities?', hit6Opts, 6, 'Headaches in general (same window as Q1–3). Usual daily activities = household work, work, school, or social activities.'),
      selectInput('q3', '3. When you have a headache, how often do you wish you could lie down?', hit6Opts, 6, 'Headaches in general (same window as Q1–3).'),
      selectInput('q4', '4. In the past 4 weeks, how often have you felt too tired to do work/daily activities because of headaches?', hit6Opts, 6, 'Past 4 weeks only (Q4–6).'),
      selectInput('q5', '5. In the past 4 weeks, how often have you felt fed up or irritated because of headaches?', hit6Opts, 6, 'Past 4 weeks only (Q4–6).'),
      selectInput('q6', '6. In the past 4 weeks, how often did headaches limit your ability to concentrate on work/daily activities?', hit6Opts, 6, 'Past 4 weeks only (Q4–6).'),
    ],
    calculate(values) {
      const score =
        num(values.q1, 6) +
        num(values.q2, 6) +
        num(values.q3, 6) +
        num(values.q4, 6) +
        num(values.q5, 6) +
        num(values.q6, 6);
      const r = riskFromThresholds(score, [
        {
          max: 49,
          level: 'low',
          label: 'Little to no impact',
          interpretation: 'HIT-6 ≤49: little to no headache-related impact on functioning.',
        },
        {
          max: 55,
          level: 'moderate',
          label: 'Some impact',
          interpretation: 'HIT-6 50–55: some impact — optimize acute therapy and lifestyle triggers.',
        },
        {
          max: 59,
          level: 'high',
          label: 'Substantial impact',
          interpretation: 'HIT-6 56–59: substantial impact — consider preventive therapy and headache specialty input.',
        },
        {
          max: 78,
          level: 'critical',
          label: 'Severe impact',
          interpretation: 'HIT-6 ≥60: severe impact — aggressive multimodal management; rule out secondary headache red flags.',
        },
      ]);
      return {
        score,
        ...r,
        details: [{ label: 'Range', value: '36–78 (each item 6/8/10/11/13)' }],
      };
    },
    evidence: {
      summary:
        'HIT-6 sums 6 Likert items scored 6, 8, 10, 11, or 13. Bands: ≤49 little/no, 50–55 some, 56–59 substantial, ≥60 severe impact.',
      formula: 'Sum of 6 items (36–78)',
      validation: 'Validated patient-reported headache impact measure used in migraine trials and clinical practice.',
      references: [
        {
          title: 'A six-item short-form survey for measuring headache impact: the HIT-6',
          citation: 'Kosinski M et al. Qual Life Res. 2003',
          year: 2003, pmid: '14651415',
          doi: '10.1023/a:1026119331193', },
      ],
    },
    nextSteps: [
      {
        condition: 'HIT-6 ≥56',
        actions: [
          'Review acute and preventive regimens',
          'Headache diary / trigger assessment',
          'Consider neurology or headache clinic referral',
          'Screen for medication-overuse headache',
        ],
      },
      {
        condition: 'Any score with red flags',
        actions: ['Neuroimaging / urgent workup if secondary headache suspected'],
      },
    ],
    pearls: ['Score change of ~2.5–6 points may be clinically meaningful depending on context.', 'Complement with MIDAS for disability days.'],
  },
  {
    id: 'midas',
    name: 'MIDAS Migraine Disability Assessment',
    shortName: 'MIDAS',
    description: 'Five-item score of migraine-related missed and impaired days over 3 months (Grade I–IV).',
    category: 'neurology',
    tags: ['migraine', 'disability', 'midas', 'headache'],
    whenToUse: 'Baseline and follow-up disability from migraine over the prior 3 months.',
    whyUse: 'Simple day-count disability grade used in guidelines and trials to stratify care intensity.',
    inputs: [
      numberInput('q1', '1. On how many days in the last 3 months did you miss work or school because of headaches?', {
        min: 0,
        max: 90,
        exampleValue: 0,
        helpText: 'Full days of missed work or school in the last 3 months',
      }),
      numberInput('q2', '2. Days in the last 3 months productivity at work/school reduced by half or more (do not count Q1 missed days)', {
        min: 0,
        max: 90,
        exampleValue: 0,
        helpText: 'Last 3 months. Exclude days already counted in Q1.',
      }),
      numberInput('q3', '3. Days in the last 3 months you did not do household work (housework, repairs, shopping, caring for children/relatives)', {
        min: 0,
        max: 90,
        exampleValue: 0,
        helpText: 'Last 3 months. Household work includes housework, home repairs, shopping, and caring for children or relatives.',
      }),
      numberInput('q4', '4. Days in the last 3 months household productivity reduced by half or more (do not count Q3 days)', {
        min: 0,
        max: 90,
        exampleValue: 0,
        helpText: 'Last 3 months. Exclude days already counted in Q3.',
      }),
      numberInput('q5', '5. Days in the last 3 months missed family, social, or leisure activities because of headaches', {
        min: 0,
        max: 90,
        exampleValue: 0,
        helpText: 'Last 3 months.',
      }),
      numberInput('freq', 'A. Headache days in past 3 months (optional)', {
        min: 0,
        max: 90,
        exampleValue: 0,
        helpText: 'Not part of MIDAS sum; for context',
        required: false,
      }),
      numberInput('pain', 'B. Average pain intensity 0–10 (optional)', {
        min: 0,
        max: 10,
        step: 1,
        exampleValue: 0,
        helpText: '0 = no pain, 10 = worst possible. Item B is not in the MIDAS sum.',
        required: false,
      }),
    ],
    calculate(values) {
      const score =
        num(values.q1) + num(values.q2) + num(values.q3) + num(values.q4) + num(values.q5);
      const r = riskFromThresholds(score, [
        {
          max: 5,
          level: 'low',
          label: 'Grade I — Little or no disability',
          interpretation: 'MIDAS 0–5 (Grade I): little or no disability. Optimize acute treatment; lifestyle counseling.',
        },
        {
          max: 10,
          level: 'moderate',
          label: 'Grade II — Mild disability',
          interpretation: 'MIDAS 6–10 (Grade II): mild disability. Ensure effective acute plan; consider prevention if frequent.',
        },
        {
          max: 20,
          level: 'high',
          label: 'Grade III — Moderate disability',
          interpretation: 'MIDAS 11–20 (Grade III): moderate disability — preventive therapy usually indicated.',
        },
        {
          max: 270,
          level: 'critical',
          label: 'Grade IV — Severe disability',
          interpretation: 'MIDAS ≥21 (Grade IV): severe disability — multimodal prevention, specialty care, check medication overuse.',
        },
      ]);
      return {
        score,
        unit: 'days',
        ...r,
        details: [
          { label: 'Grade bands', value: 'I 0–5 · II 6–10 · III 11–20 · IV ≥21' },
          { label: 'Headache days (A)', value: isMissingValue(values.freq, true) ? 'Not entered' : String(num(values.freq)) },
          { label: 'Avg pain (B)', value: isMissingValue(values.pain, true) ? 'Not entered' : String(num(values.pain)) },
        ],
      };
    },
    evidence: {
      summary:
        'MIDAS = sum of 5 disability-day items over 3 months. Grades: I (0–5), II (6–10), III (11–20), IV (≥21). Items A/B are descriptive only.',
      formula: 'Q1+Q2+Q3+Q4+Q5 (days)',
      validation: 'Validated migraine disability instrument correlating with physician judgment and treatment need.',
      references: [
        {
          title: 'Development and testing of the Migraine Disability Assessment (MIDAS) Questionnaire',
          citation: 'Stewart WF et al. Neurology. 2001',
          year: 2001, pmid: '11294956',
          doi: '10.1212/wnl.56.suppl_1.s20', },
      ],
    },
    nextSteps: [
      {
        condition: 'Grade III–IV',
        actions: [
          'Start or escalate preventive therapy',
          'Acute treatment optimization (early, adequate dose)',
          'Limit acute med days (analgesics/triptans/opioids) to avoid MOH',
          'Consider CGRP pathway agents / specialty clinic',
        ],
      },
    ],
    pearls: ['Do not double-count full-miss days in productivity items.', 'Reassess every 3 months on therapy.'],
  },
  {
    id: 'ichd-migraine',
    name: 'ICHD Migraine Without Aura Helper',
    shortName: 'ICHD Migraine',
    description: 'Checklist helper for ICHD-3 migraine without aura diagnostic criteria (not a substitute for clinical judgment).',
    category: 'neurology',
    tags: ['migraine', 'ichd', 'diagnosis', 'headache'],
    whenToUse: 'Structured review of migraine without aura criteria during headache evaluation.',
    whyUse: 'Makes ICHD-3 criterion A–E explicit so documentation and diagnosis are consistent.',
    inputs: [
      selectInput('attacks', 'A. Number of lifetime attacks (≥5 required)', [
        { label: '<5 attacks', value: 0, description: 'Fewer than 5 lifetime attacks that would meet B–D features' },
        { label: '≥5 attacks', value: 1, description: 'At least 5 lifetime attacks with migraine features (not just this month)' },
      ], undefined, 'Count lifetime attacks that would meet duration and associated-feature criteria, not only recent headaches. ≥5 required for migraine without aura (ICHD-3 1.1).'),
      selectInput('duration', 'B. Untreated/unsuccessfully treated duration 4–72 h', [
        { label: 'No', value: 0, description: 'Attacks last <4 h or >72 h when untreated' },
        { label: 'Yes', value: 1, description: 'Typical untreated/unsuccessfully treated attack lasts 4–72 hours' },
      ], undefined, 'Duration if untreated or unsuccessfully treated. Sleep that aborts an attack still counts. In children, 2–72 h is allowed on ICHD-3; this helper uses the adult 4–72 h band.'),
      yesNo('unilateral', 'C1. Unilateral location', 0, 'Criterion C is met if ≥2 of these 4 features (C1–C4) are Yes — not every C feature is required. Unilateral = one side of the head during the attack (may switch sides between attacks).'),
      yesNo('pulsating', 'C2. Pulsating quality', 0, 'Throbbing / pounding quality (not pressing, tightening, or stabbing). Criterion C needs ≥2 of C1–C4.'),
      yesNo('moderateSevere', 'C3. Moderate or severe pain intensity', 0, 'Inhibits or prohibits daily activities (not mild/ignorable). Often ≥5/10. Criterion C needs ≥2 of C1–C4.'),
      yesNo('aggravation', 'C4. Aggravation by / causing avoidance of routine physical activity', 0, 'Routine physical activity = walking or climbing stairs, or avoidance of that activity because of the headache.'),
      yesNo('nausea', 'D1. Nausea and/or vomiting', 1, 'Criterion D is met if nausea/vomiting OR (photophobia AND phonophobia).'),
      yesNo('photoPhono', 'D2. Photophobia and phonophobia', 1, 'Requires BOTH photophobia AND phonophobia during the headache (not either alone).'),
      yesNo('notBetter', 'E. Not better accounted for by another ICHD-3 diagnosis', 1, 'No better explanation (tension-type, TAC, medication-overuse, or secondary headache from exam/imaging).'),
    ],
    calculate(values) {
      const a = num(values.attacks) === 1;
      const b = num(values.duration) === 1;
      const cCount =
        (bool(values.unilateral) ? 1 : 0) +
        (bool(values.pulsating) ? 1 : 0) +
        (bool(values.moderateSevere) ? 1 : 0) +
        (bool(values.aggravation) ? 1 : 0);
      const dCount = (bool(values.nausea) ? 1 : 0) + (bool(values.photoPhono) ? 1 : 0);
      const e = bool(values.notBetter);
      const cMet = cCount >= 2;
      const dMet = dCount >= 1;
      const criteriaMet = a && b && cMet && dMet && e;
      const score = (a ? 1 : 0) + (b ? 1 : 0) + (cMet ? 1 : 0) + (dMet ? 1 : 0) + (e ? 1 : 0);

      return {
        score,
        unit: 'criteria A–E',
        label: criteriaMet ? 'Criteria consistent with migraine without aura' : 'Criteria incomplete',
        interpretation: criteriaMet
          ? 'All ICHD-3 migraine without aura criteria (A–E) checked as met on this helper. Confirm clinically; exclude secondary headache.'
          : `Met ${score}/5 criterion groups (A attack count, B duration, C≥2 of 4 pain features, D≥1 associated symptom, E not other diagnosis). Missing: ${[
              !a ? 'A (≥5 attacks)' : null,
              !b ? 'B (4–72 h)' : null,
              !cMet ? `C (need ≥2 features; have ${cCount})` : null,
              !dMet ? 'D (nausea/vomiting or photo+phonophobia)' : null,
              !e ? 'E (not better accounted for by other diagnosis)' : null,
            ]
              .filter(Boolean)
              .join('; ')}.`,
        riskLevel: criteriaMet ? 'moderate' : 'info',
        details: [
          { label: 'C features positive', value: `${cCount}/4 (need ≥2)` },
          { label: 'D features positive', value: `${dCount}/2 (need ≥1)` },
          { label: 'Note', value: 'Migraine with aura has separate aura criteria (A–C).' },
        ],
      };
    },
    evidence: {
      summary:
        'ICHD-3 migraine without aura: ≥5 attacks; 4–72 h; ≥2 of unilateral/pulsating/moderate–severe/aggravated by activity; ≥1 of nausea/vomiting or photo+phonophobia; not better accounted for by another diagnosis.',
      formula: 'Checklist A–E (C needs ≥2/4; D needs ≥1/2)',
      validation: 'International Classification of Headache Disorders 3rd edition operational criteria.',
      references: [
        {
          title: 'The International Classification of Headache Disorders, 3rd edition',
          citation: 'Headache Classification Committee of the IHS. Cephalalgia. 2018',
          year: 2018, pmid: '29368949', doi: '10.1177/0333102417738202' },
      ],
    },
    nextSteps: [
      {
        condition: 'Criteria met',
        actions: [
          'Counsel diagnosis and trigger management',
          'Acute treatment plan',
          'Offer prevention if ≥4 headache days/month or significant disability',
          'Still exclude red flags for secondary headache',
        ],
      },
      {
        condition: 'Criteria incomplete',
        actions: [
          'Consider probable migraine, TTH, TAC, or secondary headache',
          'Headache diary to clarify features',
        ],
      },
    ],
    pearls: [
      'Probable migraine = missing one criterion only.',
      'Chronic migraine: headache ≥15 days/month with migraine features on ≥8 days for >3 months.',
    ],
  },
  {
    id: 'status-epilepticus',
    name: 'Status Epilepticus Time Thresholds',
    shortName: 'SE Thresholds',
    description: 'Operational ILAE status epilepticus t1 (when SE is diagnosed) and t2 (risk of long-term consequences) by seizure type.',
    category: 'neurology',
    tags: ['seizure', 'status epilepticus', 'epilepsy', 'ilae'],
    whenToUse: 'Suspected prolonged seizure to apply operational SE time points and urgency of treatment.',
    whyUse: 'ILAE 2015 operational definition uses seizure-type-specific t1/t2 thresholds for early treatment and injury risk.',
    inputs: [
      selectInput('type', 'Seizure type', [
        {
          label: 'Tonic–clonic (convulsive)',
          value: 'tc',
          description: 't1 = 5 min; t2 = 30 min',
        },
        {
          label: 'Focal with impaired awareness',
          value: 'focal',
          description: 't1 = 10 min; t2 = 60 min',
        },
        {
          label: 'Absence (typical)',
          value: 'absence',
          description: 't1 = 10–15 min; t2 > unknown / prolonged',
        },
      ], undefined, 'ILAE 2015 operational times. t1 = when treatment should usually be started (SE diagnosed). t2 = when risk of long-term consequences rises.'),
      numberInput('duration', 'Continuous / recurrent seizure duration', {
        unit: 'min',
        min: 0,
        max: 300,
        step: 1,
        exampleValue: 5,
        helpText: 'Time of ongoing seizure activity or incomplete recovery between seizures',
      }),
      yesNo('recurrent', 'Seizures recur without recovery between', null, 'Yes if seizures repeat without recovery of consciousness between them. Use the total ongoing/cluster duration below; recurrence alone does not bypass the seizure-type-specific t1 threshold.'),
    ],
    calculate(values) {
      const type = String(values.type || 'tc');
      const duration = num(values.duration, 5);
      let t1 = 5;
      let t2 = 30;
      let typeLabel = 'Tonic–clonic';
      if (type === 'focal') {
        t1 = 10;
        t2 = 60;
        typeLabel = 'Focal with impaired awareness';
      } else if (type === 'absence') {
        t1 = 10;
        t2 = 999;
        typeLabel = 'Absence';
      }

      const recurrent = bool(values.recurrent);
      const pastT1 = duration >= t1;
      const pastT2 = type !== 'absence' && duration >= t2;

      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
      let label = 'Below t1 — treat aggressively if ongoing';
      let interpretation = `Duration ${duration} min for ${typeLabel}. Operational t1=${t1} min (SE diagnosis / time when treatment should usually be started). t2=${
        type === 'absence' ? 'less well defined' : `${t2} min`
      } (long-term consequence risk rises).${recurrent ? ' Recurrent activity without recovery is noted, but this tool compares the total cluster duration with t1; recurrence alone does not bypass t1.' : ''}`;

      if (pastT2) {
        riskLevel = 'critical';
        label = 'Past t2 — high risk of long-term injury';
        interpretation = `Duration ${duration} min exceeds t2 for ${typeLabel}. High risk of neuronal injury / prolonged refractoriness — escalate SE protocol (benzo → second-line ASM → anesthetic if refractory), airway, glucose, EEG if nonconvulsive concern.`;
      } else if (pastT1) {
        riskLevel = 'high';
        label = 'Past t1 — operational status epilepticus';
        interpretation = `Duration ${duration} min meets operational SE (≥ t1 ${t1} min) for ${typeLabel}. Immediate benzodiazepine and SE pathway; prepare second-line ASM. t2 not yet reached (${
          type === 'absence' ? 't2 poorly defined' : `${t2} min`
        }).`;
      } else if (duration >= t1 * 0.6) {
        riskLevel = 'moderate';
        label = 'Approaching t1';
        interpretation = `Approaching operational SE threshold (t1 ${t1} min). Prepare benzo dose and protect airway; treat ongoing seizure without waiting if clinically indicated.`;
      }

      return {
        score: duration,
        unit: 'min',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Seizure type', value: typeLabel },
          { label: 't1 (operational SE)', value: `${t1} min` },
          {
            label: 't2 (long-term risk)',
            value: type === 'absence' ? 'Not well established' : `${t2} min`,
          },
          { label: 'Past t1 / t2', value: `${pastT1 ? 'Yes' : 'No'} / ${pastT2 ? 'Yes' : 'No'}` },
        ],
        recommendations: pastT1
          ? ['Benzodiazepine now', 'Check glucose / electrolytes', 'Second-line ASM ready', 'EEG if subtle / NCSE concern']
          : ['Prepare treatment if seizure continues'],
      };
    },
    evidence: {
      summary:
        'ILAE operational SE: t1 = time treatment should be started (TC 5 min; focal impaired awareness 10 min; absence ~10–15 min). t2 = time risk of long-term consequences rises (TC 30 min; focal 60 min).',
      formula: 'Compare seizure duration to type-specific t1 and t2',
      validation: 'ILAE Task Force operational definition (2015) widely adopted in SE guidelines.',
      references: [
        {
          title: 'A definition and classification of status epilepticus – Report of the ILAE Task Force',
          citation: 'Trinka E et al. Epilepsia. 2015',
          year: 2015, pmid: '26336950',
          doi: '10.1111/epi.13121', },
      ],
    },
    nextSteps: [
      {
        condition: 'Past t1 (SE)',
        actions: [
          'ABCs / O2 / IV access',
          'Lorazepam/midazolam/diazepam per protocol',
          'Urgent labs (glucose, Na, AED levels)',
          'Second-line: levetiracetam, valproate, fosphenytoin, etc.',
          'Continuous EEG if not waking',
        ],
      },
      {
        condition: 'Refractory SE (past second-line)',
        actions: ['ICU, midazolam/propofol/pentobarbital infusion protocols', 'Treat etiology'],
      },
    ],
    pearls: [
      'Do not wait for 5 minutes if seizure is clearly prolonged and resources ready — treat early.',
      'Nonconvulsive SE requires EEG; clinical exam alone underdetects.',
    ],
  },
  {
    id: 'aed-level',
    name: 'AED Therapeutic Level Interpreter',
    shortName: 'AED Level',
    description: 'Interprets common antiseizure medication total serum levels against usual reference ranges.',
    category: 'neurology',
    tags: ['aed', 'epilepsy', 'drug level', 'phenytoin', 'valproate'],
    whenToUse: 'When an AED serum level is available and clinical correlation (efficacy/toxicity) is needed.',
    whyUse: 'Quick reference ranges for common ASMs; emphasizes treat-the-patient, not only the number.',
    inputs: [
      selectInput('drug', 'Antiseizure medication', [
        { label: 'Phenytoin (total)', value: 'pht' },
        { label: 'Free phenytoin', value: 'pht_free' },
        { label: 'Carbamazepine', value: 'cbz' },
        { label: 'Valproic acid (total)', value: 'vpa' },
        { label: 'Phenobarbital', value: 'pb' },
        { label: 'Levetiracetam', value: 'lev' },
        { label: 'Lamotrigine', value: 'ltg' },
        { label: 'Oxcarbazepine (MHD)', value: 'oxc' },
      ]),
      numberInput('level', 'Measured level', {
        unit: 'µg/mL (or mg/L)',
        min: 0,
        max: 200,
        step: 0.1,
        exampleValue: 10,
        helpText: 'Prefer a trough at steady state (just before next dose). µg/mL = mg/L. Lab-specific ranges vary — treat the patient, not the number.',
      }),
      yesNo('toxicSx', 'Clinical toxicity symptoms present', 0, 'Nystagmus, ataxia, diplopia, sedation, tremor, or encephalopathy attributable to the ASM — treat clinically even if the level is “therapeutic.”'),
      yesNo('breakthrough', 'Breakthrough seizures / inadequate control', 0, 'Seizures despite usual adherence, or clearly inadequate control for this patient’s prior baseline.'),
    ],
    calculate(values) {
      const drug = String(values.drug || 'pht');
      const level = num(values.level, 10);
      const ranges: Record<string, { name: string; low: number; high: number; unit: string }> = {
        pht: { name: 'Phenytoin (total)', low: 10, high: 20, unit: 'µg/mL' },
        pht_free: { name: 'Free phenytoin', low: 1, high: 2, unit: 'µg/mL' },
        cbz: { name: 'Carbamazepine', low: 4, high: 12, unit: 'µg/mL' },
        vpa: { name: 'Valproic acid', low: 50, high: 100, unit: 'µg/mL' },
        pb: { name: 'Phenobarbital', low: 15, high: 40, unit: 'µg/mL' },
        lev: { name: 'Levetiracetam', low: 12, high: 46, unit: 'µg/mL' },
        ltg: { name: 'Lamotrigine', low: 3, high: 14, unit: 'µg/mL' },
        oxc: { name: 'Oxcarbazepine (MHD)', low: 10, high: 35, unit: 'µg/mL' },
      };
      const r = ranges[drug] ?? ranges.pht;
      const toxicSx = bool(values.toxicSx);
      const breakthrough = bool(values.breakthrough);

      let band: 'low' | 'moderate' | 'normal' | 'high' | 'critical' = 'normal';
      let label = 'Within usual reference range';
      if (level < r.low) {
        band = 'moderate';
        label = 'Below usual range';
      } else if (level > r.high * 1.5) {
        band = 'critical';
        label = 'Markedly above usual range';
      } else if (level > r.high) {
        band = 'high';
        label = 'Above usual range';
      }

      let interpretation = `${r.name}: ${level} ${r.unit} (usual ${r.low}–${r.high}). ${label}.`;
      if (toxicSx) {
        interpretation += ' Toxicity symptoms present — reduce dose / hold and support regardless of “therapeutic” label when clinical toxicity is clear.';
        if (band === 'normal' || band === 'moderate') band = 'high';
      }
      if (breakthrough && level < r.low) {
        interpretation += ' Breakthrough seizures with low level — assess adherence, interactions, absorption; consider dose increase.';
      } else if (breakthrough && level >= r.low) {
        interpretation += ' Breakthrough despite level in/above range — optimize regimen, consider add-on or alternative ASM, not level chase alone.';
      }
      if (!toxicSx && !breakthrough && band === 'normal') {
        interpretation += ' Correlate with seizure control; individual therapeutic ranges vary.';
      }

      return {
        score: level,
        unit: r.unit,
        label: `${r.name}: ${label}`,
        interpretation,
        riskLevel: band,
        details: [
          { label: 'Usual range', value: `${r.low}–${r.high} ${r.unit}` },
          { label: 'Toxicity symptoms', value: toxicSx ? 'Yes' : 'No' },
          { label: 'Breakthrough seizures', value: breakthrough ? 'Yes' : 'No' },
        ],
      };
    },
    evidence: {
      summary:
        'Common total level ranges (µg/mL): PHT 10–20 (free 1–2), CBZ 4–12, VPA 50–100, PB 15–40, LEV ~12–46, LTG ~3–14, OXC-MHD ~10–35. Lab ranges vary; free levels preferred for highly bound drugs when available.',
      formula: 'Compare measured level to drug-specific reference interval',
      validation: 'Clinical pharmacology reference ranges; individual effective concentrations differ.',
      references: [
        {
          title: 'Antiepileptic drugs—best practice guidelines for therapeutic drug monitoring',
          citation: 'Patsalos PN et al. Epilepsia. 2008; ILAE TDM updates',
          year: 2008, pmid: '18397299',
          doi: '10.1111/j.1528-1167.2008.01561.x', },
      ],
    },
    nextSteps: [
      {
        condition: 'Low level + seizures',
        actions: ['Adherence review', 'Interaction check (inducers/inhibitors)', 'Dose adjust / redraw trough'],
      },
      {
        condition: 'High level or toxicity',
        actions: ['Hold or reduce dose', 'Supportive care', 'Free phenytoin if hypoalbuminemia', 'Consider dialysis only in extreme cases per toxicology'],
      },
    ],
    pearls: [
      'Draw trough levels at steady state when possible.',
      'Valproate free fraction rises with hypoalbuminemia and high total levels (nonlinear binding).',
    ],
  },
  {
    id: 'free-phenytoin',
    name: 'Estimated Free Phenytoin',
    shortName: 'Free PHT Est.',
    description: 'Estimates free phenytoin from total level and albumin (Sheiner–Tozer–based); therapeutic free ~1–2 µg/mL.',
    category: 'neurology',
    tags: ['phenytoin', 'free level', 'epilepsy', 'albumin'],
    whenToUse: 'Total phenytoin available with abnormal albumin (or ESRD) when free assay is delayed/unavailable.',
    whyUse: 'Free phenytoin drives effect/toxicity; estimation approximates free concentration from total + albumin.',
    inputs: [
      numberInput('total', 'Total phenytoin', {
        unit: 'µg/mL',
        min: 0,
        max: 50,
        step: 0.1,
        exampleValue: 10,
        helpText: 'Measured total (bound + free) phenytoin in µg/mL (= mg/L). Prefer trough.',
      }),
      numberInput('alb', 'Serum albumin', {
        unit: 'g/dL',
        min: 1,
        max: 5.5,
        step: 0.1,
        exampleValue: 2.5,
        helpText: 'g/dL (3.5 g/dL = 35 g/L). Correction is most useful when albumin is low.',
      }),
      yesNo('esrd', 'ESRD / CrCl <20 mL/min (use 0.1 binding factor variant)', 0, 'Yes if ESRD or CrCl <20 mL/min — uses binding factor 0.1 instead of 0.2. Measured free assay is still preferred.'),
      yesNo('toxicSx', 'Clinical phenytoin toxicity symptoms', 0, 'Nystagmus, ataxia, diplopia, slurred speech, or encephalopathy — treat clinically; confirm with a measured free level when possible.'),
    ],
    calculate(values) {
      const total = num(values.total, 10);
      const alb = num(values.alb, 2.5);
      // Common Sheiner-Tozer corrected total, then free ≈ 10% of corrected
      // ESRD often uses 0.1 × albumin instead of 0.2 × albumin
      const binding = bool(values.esrd) ? 0.1 : 0.2;
      const correctedTotal = total / (binding * alb + 0.1);
      const freeEst = round(correctedTotal * 0.1, 2);
      const corrRounded = round(correctedTotal, 1);
      const toxicSx = bool(values.toxicSx);

      const r = riskFromThresholds(freeEst, [
        {
          max: 0.99,
          level: 'moderate',
          label: 'Below usual free range',
          interpretation: `Estimated free phenytoin ${freeEst} µg/mL (usual ~1–2). May be subtherapeutic — correlate with seizures.`,
        },
        {
          max: 2,
          level: 'normal',
          label: 'Usual free therapeutic range',
          interpretation: `Estimated free phenytoin ${freeEst} µg/mL approximately within 1–2 µg/mL. Individualize to control and side effects.`,
        },
        {
          max: 3,
          level: 'high',
          label: 'Above usual free range',
          interpretation: `Estimated free ${freeEst} µg/mL above typical 1–2 range — toxicity risk (nystagmus, ataxia, encephalopathy).`,
        },
        {
          max: 50,
          level: 'critical',
          label: 'Markedly elevated free estimate',
          interpretation: `Estimated free ${freeEst} µg/mL markedly high — hold phenytoin, supportive care, confirm with free assay.`,
        },
      ]);

      let interpretation = r.interpretation;
      if (toxicSx) {
        interpretation += ' Clinical toxicity reported — treat clinically; do not rely on estimate alone.';
      }
      interpretation += ` Corrected total ≈ ${corrRounded} µg/mL using factor ${binding}.`;

      return {
        score: freeEst,
        unit: 'µg/mL',
        label: r.label,
        interpretation,
        riskLevel: toxicSx && freeEst >= 1 ? (freeEst > 2 ? 'critical' : 'high') : r.riskLevel,
        details: [
          { label: 'Estimated free', value: `${freeEst} µg/mL` },
          { label: 'Corrected total', value: `${corrRounded} µg/mL` },
          { label: 'Albumin / factor', value: `${alb} g/dL · ${binding}` },
          { label: 'Usual free range', value: '1–2 µg/mL' },
        ],
      };
    },
    evidence: {
      summary:
        'Sheiner–Tozer corrected total = measured total / [(0.2 × albumin) + 0.1] (0.1 × albumin often used in severe renal failure). Estimated free ≈ 0.1 × corrected total. Preferred: measured free phenytoin.',
      formula: 'Free_est = 0.1 × Total / ((f × albumin) + 0.1); f=0.2 (or 0.1 if ESRD)',
      validation: 'Widely used clinical approximation with known error vs measured free levels; assay preferred in critical decisions.',
      references: [
        {
          title: 'A comprehensive review on the predictive performance of the Sheiner-Tozer and derivative equations for the correction of phenytoin concentrations',
          citation: 'Kiang TKL et al. Ann Pharmacother. 2016; original correction: Sheiner LB, Tozer TN. In Melmon & Morelli, Clinical Pharmacology. 1978',
          year: 2016, pmid: '26825643',
          doi: '10.1177/1060028016628166', },
      ],
    },
    nextSteps: [
      {
        condition: 'Free estimate >2 or toxicity',
        actions: ['Hold/reduce phenytoin', 'Order measured free level', 'Supportive care / airway if severe'],
      },
      {
        condition: 'Free estimate <1 with seizures',
        actions: ['Assess adherence and interactions', 'Dose adjustment with monitoring'],
      },
    ],
    pearls: [
      'Highly protein-bound; hypoalbuminemia, uremia, valproate co-therapy alter free fraction.',
      'Corrected-phenytoin calculator estimates normalized total; this tool focuses on free estimate.',
    ],
  },
  {
    id: 'updrs-simp',
    name: 'UPDRS Motor (Simplified Bands)',
    shortName: 'UPDRS-simp',
    description: 'Simplified interpretation of MDS-UPDRS Part III motor examination total (enter score; banded severity).',
    category: 'neurology',
    tags: ['parkinson', 'updrs', 'motor', 'movement'],
    whenToUse: 'After MDS-UPDRS Part III motor exam to communicate severity bands (not a full UPDRS form).',
    whyUse: 'Part III is the core motor severity metric in PD care and trials; bands aid counseling and treatment intensity.',
    inputs: [
      numberInput('part3', 'MDS-UPDRS Part III motor total', {
        min: 0,
        max: 132,
        exampleValue: 20,
        helpText: 'Score from the official MDS-UPDRS Part III motor exam (copyrighted training form) and enter the already-administered total. Official maximum is 132.',
      }),
      selectInput('state', 'Motor state when scored', [
        { label: 'ON medication', value: 'on', description: 'Beneficial effect of current dopaminergic dose is present' },
        { label: 'OFF medication', value: 'off', description: 'No (or minimal) beneficial medication effect — typically before next dose or after overnight hold' },
        { label: 'Not specified', value: 'na', description: 'State not documented' },
      ], undefined, 'Always document ON vs OFF. ON = beneficial effect of current dose present; OFF = wearing-off / before next dose / overnight hold. Do not mix ON and OFF items in one total.'),
    ],
    calculate(values) {
      const score = num(values.part3, 20);
      const state = String(values.state || 'na');
      const r = riskFromThresholds(score, [
        {
          max: 32,
          level: 'low',
          label: 'Milder motor burden',
          interpretation: 'Part III in a milder range often seen in early/optimized PD — still individualize therapy and fall risk.',
        },
        {
          max: 58,
          level: 'moderate',
          label: 'Moderate motor burden',
          interpretation: 'Moderate motor severity band — optimize dopaminergic therapy, PT, and non-motor review.',
        },
        {
          max: 132,
          level: 'high',
          label: 'Marked / severe motor burden',
          interpretation: 'Higher Part III totals suggest marked motor impairment — advanced therapy evaluation (e.g., DBS, infusion) may be considered if OFF/fluctuations dominate.',
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'State', value: state === 'on' ? 'ON' : state === 'off' ? 'OFF' : 'Not specified' },
          { label: 'Note', value: 'Bands are pragmatic aids; MDS-UPDRS has official clinimetric properties — not diagnostic cutoffs.' },
          { label: 'Range', value: '0–132 (Part III)' },
        ],
      };
    },
    evidence: {
      summary:
        'MDS-UPDRS Part III rates motor signs (0–132). This tool bands an already-scored total for communication; it does not replace formal MDS-UPDRS administration training.',
      formula: 'Enter Part III sum; interpret mild / moderate / marked bands',
      validation: 'MDS-UPDRS is the standard PD severity scale (Goetz et al.); simplified bands here are clinical convenience only.',
      references: [
        {
          title: 'Movement Disorder Society-sponsored revision of the UPDRS (MDS-UPDRS)',
          citation: 'Goetz CG et al. Mov Disord. 2008',
          year: 2008, pmid: '19025984',
          doi: '10.1002/mds.22340', },
      ],
    },
    nextSteps: [
      {
        condition: 'Moderate–high motor scores',
        actions: [
          'Medication timing / dose optimization',
          'PT/OT/speech as needed',
          'Screen non-motor symptoms and cognition',
          'Consider advanced therapies if fluctuations/dyskinesia disabling',
        ],
      },
    ],
    pearls: ['Always document ON vs OFF when reporting Part III.', 'Hoehn–Yahr stages global disability; UPDRS captures exam detail.'],
  },
  {
    id: 'hoehn-yahr',
    name: 'Hoehn and Yahr Stage',
    shortName: 'Hoehn-Yahr',
    description: 'Classic Parkinson disease staging (0–5), including modified half-stages when used.',
    category: 'neurology',
    tags: ['parkinson', 'hoehn yahr', 'staging', 'movement'],
    whenToUse: 'Global PD staging for communication, research strata, and rough disability overview.',
    whyUse: 'Universal PD stage language; complements UPDRS for functional distribution of disease.',
    inputs: [
      selectInput('stage', 'Hoehn and Yahr stage', [
        { label: '0 — No signs of disease', value: 0, description: 'No parkinsonism' },
        { label: '1 — Unilateral involvement only', value: 1, description: 'Signs on one side only; no axial (neck/trunk) involvement' },
        { label: '1.5 — Unilateral and axial involvement (modified)', value: 1.5, description: 'Unilateral plus axial (neck/trunk) involvement' },
        { label: '2 — Bilateral without balance impairment', value: 2, description: 'Bilateral signs; recovers on pull test in 0–2 steps' },
        { label: '2.5 — Mild bilateral; recovery on pull test (modified)', value: 2.5, description: 'Bilateral; ≥3 steps on pull test but recovers unassisted' },
        { label: '3 — Bilateral; postural instability; physically independent', value: 3, description: 'Would fall on pull test if not caught; still physically independent' },
        { label: '4 — Severe disability; still able to walk/stand unassisted', value: 4, description: 'Severe disability but can walk or stand without assistance' },
        { label: '5 — Wheelchair bound or bedridden unless aided', value: 5, description: 'Wheelchair or bedridden unless aided' },
      ], 0, 'Pull test (retropulsion): patient stands, feet comfortably apart, eyes open. Warn that you will pull the shoulders backward and they may take steps. Stand behind, ready to catch. After a gentle demonstration pull, deliver one brisk pull. 0–2 steps = recovers (stage ≤2 if otherwise bilateral); ≥3 steps but recovers unassisted = modified 2.5; would fall if not caught = stage 3. Stage 1.5 = unilateral plus axial (neck/trunk) involvement.'),
    ],
    calculate(values) {
      const stage = num(values.stage, 0);
      const r = riskFromThresholds(stage, [
        {
          max: 0,
          level: 'normal',
          label: 'Stage 0',
          interpretation: 'No clinical parkinsonism on this staging.',
        },
        {
          max: 1.5,
          level: 'low',
          label: 'Early unilateral (1–1.5)',
          interpretation: 'Early PD stage — unilateral (± axial). Initiate/optimize symptomatic therapy; exercise counseling.',
        },
        {
          max: 2.5,
          level: 'moderate',
          label: 'Bilateral, balance relatively preserved (2–2.5)',
          interpretation: 'Bilateral disease without major postural instability (or recovery on pull test at 2.5). Focus on motor optimization and fall prevention.',
        },
        {
          max: 3,
          level: 'high',
          label: 'Stage 3 — Postural instability',
          interpretation: 'Postural instability with preserved independence — high fall risk; PT, home safety, med review.',
        },
        {
          max: 4,
          level: 'high',
          label: 'Stage 4 — Severe but ambulatory',
          interpretation: 'Severe disability but can walk/stand without assistance — advanced care planning, caregiver support, advanced therapies discussion.',
        },
        {
          max: 5,
          level: 'critical',
          label: 'Stage 5 — Wheelchair / bedridden',
          interpretation: 'End-stage motor disability without aid — multidisciplinary palliative and supportive care.',
        },
      ]);
      return {
        score: stage,
        unit: 'stage',
        ...r,
        details: [{ label: 'Scale', value: 'Original H&Y 1–5; modified adds 1.5 and 2.5' }],
      };
    },
    evidence: {
      summary:
        'Hoehn & Yahr stages PD from unilateral (1) to bedridden (5). Modified H&Y adds 1.5 and 2.5. Staging is ordinal and less granular than MDS-UPDRS.',
      formula: 'Select clinical stage 0–5',
      validation: 'Historic PD staging system; still used for broad functional strata.',
      references: [
        {
          title: 'Parkinsonism: onset, progression, and mortality',
          citation: 'Hoehn MM, Yahr MD. Neurology. 1967; modified H&Y later adopted in trials',
          year: 1967, pmid: '6067254',
          doi: '10.1212/wnl.17.5.427', },
      ],
    },
    nextSteps: [
      {
        condition: 'Stage ≥3',
        actions: ['Fall risk program', 'Bone health', 'Medication timing review', 'Consider advanced therapies if motor complications'],
      },
    ],
    pearls: [
      'Pull test: warn, demonstration pull, then one brisk pull from behind; ready to catch. 0–2 steps recovers (≤2); ≥3 steps but unassisted = 2.5; would fall if not caught = 3.',
      'Stage does not capture non-motor burden.',
    ],
  },
  {
    id: 'edss-simp',
    name: 'EDSS (Simplified Select)',
    shortName: 'EDSS-simp',
    description: 'Expanded Disability Status Scale simplified selector for multiple sclerosis disability (0–10).',
    category: 'neurology',
    tags: ['ms', 'edss', 'multiple sclerosis', 'disability'],
    whenToUse: 'Document approximate EDSS band when full neurostatus scoring is already known or roughly staged.',
    whyUse: 'EDSS is the standard MS disability metric for care and trials; simplified entry aids quick interpretation.',
    inputs: [
      selectInput('edss', 'EDSS step', [
        { label: '0 — Normal neurologic exam', value: 0, description: 'All Functional Systems (FS) grade 0 (cerebral grade 1 acceptable)' },
        { label: '1.0 — No disability; minimal signs in one FS', value: 1, description: 'One FS grade 1 (e.g. Babinski, reduced vibration); no disability. FS: pyramidal, cerebellar, brainstem, sensory, bowel/bladder, visual, cerebral' },
        { label: '1.5 — No disability; minimal signs in >1 FS', value: 1.5, description: 'More than one FS grade 1; still no disability' },
        { label: '2.0 — Minimal disability in one FS', value: 2, description: 'One FS grade 2 (others 0 or 1). Grade 2 = minimal disability in that system (e.g. slight limp, mild ataxia, mild sensory loss)' },
        { label: '2.5 — Mild disability in one FS or minimal in two', value: 2.5, description: 'Two FS grade 2 (others 0 or 1), or one FS grade 2 plus one FS grade 1 with mild disability. Fully ambulatory' },
        { label: '3.0 — Moderate disability; fully ambulatory', value: 3, description: 'One FS grade 3 (others 0 or 1) OR three or four FS grade 2. Fully ambulatory. Grade 3 = moderate disability in that FS (e.g. monoparesis, moderate ataxia)' },
        { label: '3.5 — Moderate disability in several FS; fully ambulatory', value: 3.5, description: 'One FS grade 3 plus 1–2 FS grade 2; OR two FS grade 3; OR five FS grade 2. Fully ambulatory without aid' },
        { label: '4.0 — Ambulatory without aid ≥500 m; significant disability', value: 4, description: 'Walks ≥500 m without aid or rest. Up and about ~12 h/day; self-sufficient. Often one FS grade 4 or combinations exceeding 3.5' },
        { label: '4.5 — Ambulatory without aid ≥300 m; some limitation of activity', value: 4.5, description: 'Walks ≥300 m without aid or rest. Full day possible with some activity limitation or minimal assistance' },
        { label: '5.0 — Ambulatory without aid ≥200 m; disability impairs daily activity', value: 5, description: 'Walks ≥200 m without aid or rest. Disability impairs a full work day without special provisions' },
        { label: '5.5 — Ambulatory without aid ≥100 m', value: 5.5, description: 'Walks ≥100 m without aid or rest. Disability precludes full daily activities' },
        { label: '6.0 — Unilateral assistance required to walk 100 m', value: 6, description: 'Intermittent or constant unilateral aid (cane, crutch, or brace) to walk about 100 m, with or without rest' },
        { label: '6.5 — Constant bilateral assistance to walk 20 m', value: 6.5, description: 'Constant bilateral canes, crutches, or braces to walk about 20 m without resting' },
        { label: '7.0 — Unable to walk >5 m even with aid; wheelchair', value: 7, description: 'Cannot walk beyond ~5 m even with aid. Wheels self in standard wheelchair and transfers alone; up in chair ~12 h/day' },
        { label: '7.5 — Unable to take more than a few steps; wheel self', value: 7.5, description: 'Few steps only. May need aid in transfer; cannot wheel a standard chair a full day (may need motorized chair)' },
        { label: '8.0 — Restricted to bed/chair; retains self-care functions', value: 8, description: 'Essentially restricted to bed, chair, or wheeled about. Out of bed much of the day; generally effective use of arms; many self-care functions' },
        { label: '8.5 — Restricted to bed much of day; some self-care', value: 8.5, description: 'Essentially bedridden much of the day; some effective arm use; some self-care retained' },
        { label: '9.0 — Helpless bed patient; can communicate/eat', value: 9, description: 'Helpless bed patient who can still communicate and eat' },
        { label: '9.5 — Unable to communicate or eat/swallow', value: 9.5, description: 'Totally helpless bed patient; cannot communicate effectively or eat/swallow' },
        { label: '10 — Death due to MS', value: 10, description: 'Death due to MS' },
      ], undefined, 'Steps 0–3.5 require Kurtzke/Neurostatus Functional Systems (pyramidal, cerebellar, brainstem, sensory, bowel/bladder, visual, cerebral) — not a gestalt mild/moderate word. FS grade 1 = signs only; 2 = minimal disability; 3 = moderate; 4 = relatively severe in that system. Steps ≥4 are gait-distance ± aid as labeled (500 / 300 / 200 / 100 m; 6.0 unilateral aid 100 m; 6.5 bilateral aid 20 m; ≥7 wheelchair). This selector is for an already-known EDSS or rough ambulation stage — not a substitute for Neurostatus training.'),
    ],
    calculate(values) {
      const score = num(values.edss, 0);
      const r = riskFromThresholds(score, [
        {
          max: 2.5,
          level: 'low',
          label: 'Minimal–mild disability',
          interpretation: 'EDSS ≤2.5: minimal to mild impairment; fully ambulatory. DMT and monitoring per MS phenotype.',
        },
        {
          max: 3.5,
          level: 'moderate',
          label: 'Moderate disability, fully ambulatory',
          interpretation: 'EDSS 3.0–3.5: moderate disability but fully ambulatory — rehab and optimized DMT important.',
        },
        {
          max: 5.5,
          level: 'high',
          label: 'Ambulatory limitation without constant aid',
          interpretation: 'EDSS 4.0–5.5: walking distance limited without requiring constant unilateral aid at 6.0 — fall risk, vocational impact.',
        },
        {
          max: 6.5,
          level: 'high',
          label: 'Requires walking assistance',
          interpretation: 'EDSS 6.0–6.5: unilateral or bilateral assistance for ambulation — mobility aids, home mods, caregiver planning.',
        },
        {
          max: 10,
          level: 'critical',
          label: 'Wheelchair / bed / death range',
          interpretation: 'EDSS ≥7: non-ambulatory spectrum — comprehensive supportive and palliative care as appropriate.',
        },
      ]);
      return {
        score,
        unit: 'EDSS',
        ...r,
        details: [
          { label: 'Key anchors', value: '≤3.5 fully ambulatory; 6 cane; 6.5 bilateral support; ≥7 wheelchair' },
        ],
      };
    },
    evidence: {
      summary:
        'EDSS (Kurtzke) is an ordinal 0–10 MS disability scale based on functional systems and ambulation. This simplified selector is for interpretation, not a substitute for formal Neurostatus EDSS training.',
      formula: 'Select EDSS step 0–10',
      validation: 'Standard MS disability outcome; ambulation dominates scores ≥4.',
      references: [
        {
          title: 'Rating neurologic impairment in multiple sclerosis: an expanded disability status scale (EDSS)',
          citation: 'Kurtzke JF. Neurology. 1983',
          year: 1983, pmid: '6685237',
          doi: '10.1212/wnl.33.11.1444', },
      ],
    },
    nextSteps: [
      {
        condition: 'EDSS rising or ≥4',
        actions: [
          'Confirm progression vs relapse',
          'MRI / DMT escalation discussion',
          'PT/OT/mobility aids',
          'Symptomatic Rx (spasticity, pain, bladder)',
        ],
      },
    ],
    pearls: ['Scores ≥4 are heavily gait-driven.', 'Use FS scores for formal EDSS calculation when precision needed.'],
  },
  {
    id: 'dn4',
    name: 'DN4 Neuropathic Pain Score',
    shortName: 'DN4',
    description: 'Douleur Neuropathique 4 questions — interview + exam items (0–10); ≥4 suggests neuropathic pain.',
    category: 'neurology',
    tags: ['pain', 'neuropathic', 'dn4', 'sensory'],
    whenToUse: 'Differentiate neuropathic from non-neuropathic pain in clinic.',
    whyUse: 'Brief validated screen combining symptoms and sensory signs; cutoff ≥4.',
    inputs: [
      yesNo('q1', '1. Pain has burning quality?', 1, 'Interview (items 1–7): patient-reported quality of the pain. Yes if burning is a feature of the pain.'),
      yesNo('q2', '2. Painful cold sensation?', 1, 'Interview: painful cold (like contact with a cold object) in the painful area.'),
      yesNo('q3', '3. Electric shocks?', 1, 'Interview: electric-shock / shooting quality.'),
      yesNo('q4', '4. In the same area as the pain: tingling?', 1, 'Interview: tingling (fourmillements) in the same area as the pain.'),
      yesNo('q5', '5. In the same area as the pain: pins and needles?', 1, 'Interview: pins-and-needles (paresthesias) in the same area as the pain.'),
      yesNo('q6', '6. In the same area as the pain: numbness?', 1, 'Interview: numbness in the same area as the pain.'),
      yesNo('q7', '7. In the same area as the pain: itching?', 1, 'Interview: itching in the same area as the pain.'),
      yesNo('q8', '8. Hypoesthesia to touch in pain area?', 1, 'Exam: light touch with cotton or a soft brush on the painful area vs a contralateral/control area; Yes = decreased sensation.'),
      yesNo('q9', '9. Hypoesthesia to pinprick in pain area?', 1, 'Exam: pinprick (or von Frey) vs control area; Yes = decreased prick sensation.'),
      yesNo('q10', '10. Brushing elicits or increases pain (allodynia)?', 1, 'Exam: light moving brush or fingertip — not pressure — over the painful area; Yes if that causes or increases pain. Pressing the skin can false-positive this item.'),
    ],
    calculate(values) {
      const keys = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10'];
      const score = keys.reduce((s, k) => s + (bool(values[k]) ? 1 : 0), 0);
      const interview = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7'].reduce(
        (s, k) => s + (bool(values[k]) ? 1 : 0),
        0
      );
      const exam = ['q8', 'q9', 'q10'].reduce((s, k) => s + (bool(values[k]) ? 1 : 0), 0);
      if (score >= 4) {
        return {
          score,
          label: 'Suggests neuropathic pain (≥4)',
          interpretation:
            'DN4 ≥4: neuropathic pain likely. Consider cause-directed workup and first-line neuropathic agents (e.g., gabapentinoids, SNRIs, TCAs) per context.',
          riskLevel: 'high',
          details: [
            { label: 'Interview items (1–7)', value: String(interview) },
            { label: 'Exam items (8–10)', value: String(exam) },
            { label: 'Cutoff', value: '≥4 / 10' },
          ],
        };
      }
      return {
        score,
        label: 'Less suggestive of neuropathic pain (<4)',
        interpretation:
          'DN4 <4: neuropathic mechanism less likely by this screen — still correlate clinically; mixed pain is common.',
        riskLevel: 'low',
        details: [
          { label: 'Interview items (1–7)', value: String(interview) },
          { label: 'Exam items (8–10)', value: String(exam) },
        ],
      };
    },
    evidence: {
      summary:
        'DN4: 7 sensory descriptors + 3 exam signs (yes=1). Total ≥4 suggests neuropathic pain with good sensitivity/specificity in derivation studies.',
      formula: 'Sum of 10 yes/no items (0–10)',
      validation: 'Validated in multiple languages/settings for neuropathic pain identification.',
      references: [
        {
          title: 'Comparison of pain syndromes associated with nervous or somatic lesions and development of a new neuropathic pain diagnostic questionnaire (DN4)',
          citation: 'Bouhassira D et al. Pain. 2005',
          year: 2005, pmid: '15733628',
          doi: '10.1016/j.pain.2004.12.010', },
      ],
    },
    nextSteps: [
      {
        condition: 'DN4 ≥4',
        actions: [
          'Identify etiology (diabetes, radiculopathy, postherpetic, etc.)',
          'Neuropathic pain pharmacotherapy ladder',
          'Avoid relying solely on opioids for neuropathic pain',
        ],
      },
    ],
    pearls: ['Interview-only DN4 (7 items) cutoff ≥3 is sometimes used when exam unavailable.', 'Exam items improve specificity.'],
  },
  {
    id: 'slums',
    isQuestionnaire: true,
    questionnaire: {
      modeInputId: 'entryMode',
      directModeValues: ['direct'],
      directInputIds: ['score'],
    },
    name: 'SLUMS Cognitive Examination',
    shortName: 'SLUMS',
    description: 'Saint Louis University Mental Status (SLUMS) 11-item cognitive exam (0–30) with education-adjusted cutoffs.',
    category: 'neurology',
    tags: ['cognition', 'dementia', 'slums', 'mci'],
    whenToUse: 'Cognitive screening for Mild Cognitive Impairment (MCI) or dementia in older adults; 11 items or direct total.',
    whyUse: 'Public-domain, highly sensitive MMSE alternative with education-stratified cutoffs (≥HS vs <HS).',
    inputs: [
      selectInput('entryMode', 'Entry mode', [
        { label: 'Interactive 11-item examination', value: 'survey' },
        { label: 'Direct score override', value: 'direct' },
      ], 'survey'),
      selectInput('education', 'Education level', [
        { label: 'High school graduate or higher (≥HS)', value: 'hs' },
        { label: 'Less than high school (<HS)', value: 'less' },
      ], 'hs'),
      selectInput('q1_day', '1. What day of the week is it?', [
        { label: '0 — Incorrect', value: 0 },
        { label: '1 — Correct', value: 1 },
      ], 1),
      selectInput('q2_year', '2. What is the year?', [
        { label: '0 — Incorrect', value: 0 },
        { label: '1 — Correct', value: 1 },
      ], 1),
      selectInput('q3_state', '3. What state are we in?', [
        { label: '0 — Incorrect', value: 0 },
        { label: '1 — Correct', value: 1 },
      ], 1),
      selectInput('q4_attention', '4. Attention ($100 minus $3 five times)', [
        { label: '0 — 0 or 1 subtraction correct', value: 0 },
        { label: '1 — 2 or 3 subtractions correct', value: 1 },
        { label: '2 — 4 subtractions correct', value: 2 },
        { label: '3 — All 5 correct (97, 94, 91, 88, 85)', value: 3 },
      ], 3),
      selectInput('q5_fluency', '5. Animal naming fluency in 1 minute', [
        { label: '0 — 0 to 4 animals', value: 0 },
        { label: '1 — 5 to 9 animals', value: 1 },
        { label: '2 — 10 to 14 animals', value: 2 },
        { label: '3 — 15 or more animals', value: 3 },
      ], 3),
      selectInput('q6_recall', '6. Delayed recall of 5 objects (Apple, Pen, Tie, House, Car)', [
        { label: '0 — None recalled', value: 0 },
        { label: '1 — 1 object recalled', value: 1 },
        { label: '2 — 2 objects recalled', value: 2 },
        { label: '3 — 3 objects recalled', value: 3 },
        { label: '4 — 4 objects recalled', value: 4 },
        { label: '5 — All 5 objects recalled', value: 5 },
      ], 4),
      selectInput('q7_backward', '7. Number sequence backward (e.g. 642 -> 246; 8537 -> 7358)', [
        { label: '0 — Neither correct', value: 0 },
        { label: '1 — One sequence correct', value: 1 },
        { label: '2 — Both sequences correct', value: 2 },
      ], 2),
      selectInput('q8_clock', '9. Clock drawing (set time to ten to eleven: 10:50)', [
        { label: '0 — Clock incorrect', value: '0' },
        { label: '2 — Hour numbers placed correctly only', value: 'hours_only' },
        { label: '2b — Hands placed correctly only (2 pts)', value: 'hands_only' },
        { label: '4 — Hour numbers AND hands placed correctly (4 pts)', value: 'both_correct' },
      ], 'both_correct'),
      selectInput('q9_shapes', '10a. Place an X in the triangle', [
        { label: '0 — Triangle not selected', value: 0 },
        { label: '1 — X placed in the triangle', value: 1 },
      ], 1),
      selectInput('q10_figures', '10b. Which of the above figures is largest? (the square)', [
        { label: '0 — Incorrect', value: 0 },
        { label: '1 — Square identified as largest', value: 1 },
      ], 1),
      selectInput('q11_story', '11. Story recall (Jill, a successful stockbroker... 4 questions, 2 points each)', [
        { label: '0 — 0 questions correct', value: 0 },
        { label: '2 — 1 question correct', value: 2 },
        { label: '4 — 2 questions correct', value: 4 },
        { label: '6 — 3 questions correct', value: 6 },
        { label: '8 — All 4 questions correct (name Jill, stockbroker, returned when children were teenagers, Illinois)', value: 8 },
      ], 8),
      numberInput('score', 'Direct SLUMS total score override (0–30)', {
        min: 0,
        max: 30,
        exampleValue: 27,
        helpText: 'Enter official SLUMS total (0–30).',
      }),
    ],
    calculate(values) {
      const mode = String(values.entryMode ?? 'survey');
      let score: number;

      if (mode === 'direct' || (values.score !== undefined && values.entryMode === undefined && values.q1_day === undefined)) {
        score = Math.max(0, Math.min(30, num(values.score, 27)));
      } else {
        const clockPoints: Record<string, number> = {
          '0': 0,
          hours_only: 2,
          hands_only: 2,
          both_correct: 4,
          // Preserve compatibility with pre-MED-04 numeric API values.
          '2': 2,
          '4': 4,
        };
        score =
          num(values.q1_day, 1) +
          num(values.q2_year, 1) +
          num(values.q3_state, 1) +
          num(values.q4_attention, 3) +
          num(values.q5_fluency, 3) +
          num(values.q6_recall, 4) +
          num(values.q7_backward, 2) +
          (clockPoints[String(values.q8_clock ?? 'both_correct')] ?? 4) +
          num(values.q9_shapes, 1) +
          num(values.q10_figures, 1) +
          num(values.q11_story, 4);
      }

      const hs = String(values.education || 'hs') === 'hs';
      let label: string;
      let riskLevel: 'normal' | 'moderate' | 'high';
      let interpretation: string;

      if (hs) {
        if (score >= 27) {
          label = 'Normal (HS+)';
          riskLevel = 'normal';
          interpretation = `SLUMS ${score}/30 with ≥HS education: normal cognitive performance range.`;
        } else if (score >= 21) {
          label = 'MCI / MNCD range (HS+)';
          riskLevel = 'moderate';
          interpretation = `SLUMS ${score}/30 (≥HS): mild neurocognitive disorder (MCI) range — comprehensive diagnostic evaluation recommended.`;
        } else {
          label = 'Dementia range (HS+)';
          riskLevel = 'high';
          interpretation = `SLUMS ${score}/30 (≥HS): dementia range — formal workup, reversible causes (B12, TSH, MRI), and safety review.`;
        }
      } else if (score >= 25) {
        label = 'Normal (<HS)';
        riskLevel = 'normal';
        interpretation = `SLUMS ${score}/30 with <HS education: normal cognitive performance range.`;
      } else if (score >= 20) {
        label = 'MCI / MNCD range (<HS)';
        riskLevel = 'moderate';
        interpretation = `SLUMS ${score}/30 (<HS): mild neurocognitive disorder (MCI) range.`;
      } else {
        label = 'Dementia range (<HS)';
        riskLevel = 'high';
        interpretation = `SLUMS ${score}/30 (<HS): dementia range — comprehensive cognitive workup.`;
      }

      return {
        score,
        unit: '/30',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Entry mode', value: mode === 'direct' ? 'Direct override' : '11-item interactive exam' },
          {
            label: 'Education cutoffs used',
            value: hs
              ? 'HS+: normal 27–30; MCI 21–26; dementia ≤20'
              : '<HS: normal 25–30; MCI 20–24; dementia ≤19',
          },
        ],
      };
    },
    evidence: {
      summary:
        'SLUMS scores 0–30. Education-adjusted: ≥HS education normal 27–30, MNCD 21–26, dementia ≤20; <HS normal 25–30, MNCD 20–24, dementia ≤19.',
      formula: 'Sum of 11 items (0–30); apply education band',
      validation: 'Developed/validated at Saint Louis University / VA; public domain MMSE replacement.',
      references: [
        {
          title: 'The Saint Louis University Mental Status (SLUMS) Examination',
          citation: 'Tariq SH et al. Am J Geriatr Psychiatry. 2006',
          year: 2006, pmid: '17068312',
          doi: '10.1097/01.JGP.0000221510.33817.86', },
      ],
    },
    nextSteps: [
      {
        condition: 'MCI or dementia range',
        actions: [
          'History from informant (ADL/IADL)',
          'Labs: B12, TSH, metabolic panel',
          'Neuroimaging (brain MRI without contrast)',
          'Medication review; depression screen',
        ],
      },
    ],
    pearls: [
      'Always adjust interpretation for education (HS+ vs <HS).',
      'SLUMS is public domain and free for clinical use without licensing fees.',
      'Clock command on SLUMS is ten to eleven (10:50). Animal naming is 1 minute.',
    ],
  },
  {
    id: 'clock-draw',
    name: 'Clock Drawing Score (0–5)',
    shortName: 'Clock Draw',
    description: 'Clock drawing test score entry (common 0–5 Shulman-type scale) with cognitive impairment bands.',
    category: 'neurology',
    tags: ['cognition', 'clock', 'dementia', 'screening'],
    whenToUse: 'Quick visuospatial/executive cognitive screen interpretation after clock drawing.',
    whyUse: 'Fast bedside screen sensitive to dementia and executive dysfunction; pairs with other screens.',
    inputs: [
      selectInput('score', 'Clock drawing score (0–5)', [
        { label: '5 — Perfect clock (circle, numbers, hands correct)', value: 5, description: 'Circle, numbers, and hands at 11:10 with a longer minute hand' },
        { label: '4 — Minor visuospatial errors', value: 4, description: '11:10 is correct, with only minor spacing errors' },
        { label: '3 — Inaccurate representation of time / moderate errors', value: 3, description: 'Number layout is preserved, but 11:10 is wrong' },
        { label: '2 — Moderate visuospatial disorganization of numbers', value: 2, description: 'Numbers crowded, missing, or reversed so that 11:10 cannot be shown' },
        { label: '1 — Severe disorganization; numbers missing/wrong', value: 1, description: 'Numbers are not in a recognizable sequence' },
        { label: '0 — No reasonable representation of a clock', value: 0, description: 'No reasonable clock' },
      ], 5, 'Give a blank page (or a pre-drawn circle). Say: “Draw a clock. Put in all the numbers. Set the hands to 10 minutes past 11 (11:10).” Shulman 0–5 scoring. Other scales (0–10, Watson) exist — do not mix them.'),
    ],
    calculate(values) {
      const score = num(values.score, 5);
      const r = riskFromThresholds(score, [
        {
          max: 1,
          level: 'high',
          label: 'Severely abnormal',
          interpretation: 'Clock score 0–1: severely abnormal — high concern for cognitive impairment; full workup.',
        },
        {
          max: 3,
          level: 'moderate',
          label: 'Abnormal / impaired range',
          interpretation: 'Clock score 2–3: abnormal — suggests cognitive impairment; correlate with MoCA/SLUMS/MMSE and function.',
        },
        {
          max: 4,
          level: 'low',
          label: 'Borderline / minor errors',
          interpretation: 'Clock score 4: minor errors — may be normal aging or early impairment; use full screen if concerned.',
        },
        {
          max: 5,
          level: 'normal',
          label: 'Normal',
          interpretation: 'Clock score 5: normal drawing — does not exclude MCI; combine with other cognitive tests.',
        },
      ]);
      return {
        score,
        ...r,
        details: [{ label: 'Common cutoff', value: '≤3 often treated as abnormal on 0–5 scales' }],
      };
    },
    evidence: {
      summary:
        'Clock drawing tests executive and visuospatial function. Multiple scoring systems exist (Shulman 0–5, Mendez, Watson). Lower scores associate with dementia; normal clock does not exclude MCI.',
      formula: 'Select 0–5 score per chosen scoring rubric',
      validation: 'Widely studied bedside cognitive screen component (including Mini-Cog).',
      references: [
        {
          title: 'Clock-drawing: is it the ideal cognitive screening test?',
          citation: 'Shulman KI. Int J Geriatr Psychiatry. 2000',
          year: 2000, pmid: '10861923',
          doi: '10.1002/1099-1166(200006)15:6<548::aid-gps242>3.0.co;2-u', },
      ],
    },
    nextSteps: [
      {
        condition: 'Score ≤3',
        actions: ['Full cognitive screening (MoCA/SLUMS)', 'Functional history', 'Reversible cause labs'],
      },
    ],
    pearls: [
      'Command: “Draw a clock. Put in all the numbers. Set the hands to 10 minutes past 11 (11:10).”',
      'Score 3 is wrong 11:10 with preserved layout — not generic “moderate errors.” Education and motor impairment affect performance.',
    ],
  },
  {
    id: 'madrs',
    isQuestionnaire: true,
    questionnaire: {
      modeInputId: 'entryMode',
      directModeValues: ['direct'],
      directInputIds: ['score'],
    },
    name: 'MADRS Depression Score',
    shortName: 'MADRS',
    description: 'Montgomery–Åsberg Depression Rating Scale 10-item clinician rating (0–60).',
    category: 'psychiatry',
    tags: ['depression', 'madrs', 'severity', 'rating scale'],
    whenToUse: 'Clinician-rated depression severity monitoring and response tracking; 10 items or direct total.',
    whyUse: 'Sensitive to change in antidepressant trials; gold standard for treatment response.',
    inputs: [
      selectInput('entryMode', 'Entry mode', [
        { label: 'Interactive 10-item clinician rating', value: 'survey' },
        { label: 'Direct score override', value: 'direct' },
      ], 'survey'),
      selectInput('madrs1', '1. Apparent sadness (observed despondency and gloom)', [
        { label: '0 — No sadness', value: 0 },
        { label: '1 — Occasional sadness', value: 1 },
        { label: '2 — Looks dispirited but does brighten up without difficulty', value: 2 },
        { label: '3 — Sadness between mild and moderate', value: 3 },
        { label: '4 — Appears sad and unhappy most of the time', value: 4 },
        { label: '5 — Extreme persistent gloom', value: 5 },
        { label: '6 — Looks miserable all the time; extremely despondent', value: 6 },
      ], 2),
      selectInput('madrs2', '2. Reported sadness (verbalized depressed mood/hopelessness)', [
        { label: '0 — Occasional sadness in keeping with circumstances', value: 0 },
        { label: '1 — Slight sadness', value: 1 },
        { label: '2 — Sad or low, but brightens up without difficulty', value: 2 },
        { label: '3 — Moderately low', value: 3 },
        { label: '4 — Pervasive feelings of sadness or gloominess', value: 4 },
        { label: '5 — Intense pervasive despondency', value: 5 },
        { label: '6 — Continuous and unvarying sadness, despair, or despondency', value: 6 },
      ], 2),
      selectInput('madrs3', '3. Inner tension (edginess, inner panic, ill-defined dread)', [
        { label: '0 — Placid; only fleeting inner tension', value: 0 },
        { label: '1 — Slight inner restlessness', value: 1 },
        { label: '2 — Occasional feelings of edginess and ill-defined discomfort', value: 2 },
        { label: '3 — Noticeable tension', value: 3 },
        { label: '4 — Continuous feelings of inner tension or intermittent panic', value: 4 },
        { label: '5 — Severe unrelenting panic/tension', value: 5 },
        { label: '6 — Unrelenting dread or agony; overwhelming panic', value: 6 },
      ], 2),
      selectInput('madrs4', '4. Reduced sleep (shortened duration or depth of sleep)', [
        { label: '0 — Sleeps as usual', value: 0 },
        { label: '1 — Slight difficulty sleeping', value: 1 },
        { label: '2 — Slight reduction in sleep (e.g. <1 hour lost)', value: 2 },
        { label: '3 — Moderate reduction', value: 3 },
        { label: '4 — Sleep reduced or broken by at least 2 hours', value: 4 },
        { label: '5 — Marked insomnia', value: 5 },
        { label: '6 — Less than 2 or 3 hours of sleep', value: 6 },
      ], 2),
      selectInput('madrs5', '5. Reduced appetite (loss of desire for food)', [
        { label: '0 — Normal or increased appetite', value: 0 },
        { label: '1 — Slightly reduced', value: 1 },
        { label: '2 — Slightly reduced appetite; food tastes bland', value: 2 },
        { label: '3 — Noticeable loss of appetite', value: 3 },
        { label: '4 — No appetite; food is tasteless; must force self to eat', value: 4 },
        { label: '5 — Profound anorexia', value: 5 },
        { label: '6 — Needs persuasion or persuasion to eat; profound anorexia', value: 6 },
      ], 1),
      selectInput('madrs6', '6. Concentration difficulties (trouble collecting thoughts)', [
        { label: '0 — No difficulties in concentrating', value: 0 },
        { label: '1 — Slight difficulty', value: 1 },
        { label: '2 — Occasional difficulties in collecting thoughts', value: 2 },
        { label: '3 — Noticeable difficulty reading or conversing', value: 3 },
        { label: '4 — Difficulties concentrating and sustaining attention', value: 4 },
        { label: '5 — Severe cognitive slowing', value: 5 },
        { label: '6 — Unable to read or converse without great difficulty', value: 6 },
      ], 2),
      selectInput('madrs7', '7. Lassitude (difficulty getting started / slowness initiating)', [
        { label: '0 — Hardly any difficulty starting activities', value: 0 },
        { label: '1 — Slight hesitation', value: 1 },
        { label: '2 — Difficulties in starting activities', value: 2 },
        { label: '3 — Substantial inertia', value: 3 },
        { label: '4 — Difficulties in starting simple routine activities (slow)', value: 4 },
        { label: '5 — Marked motor and mental inertia', value: 5 },
        { label: '6 — Complete lassitude; unable to do anything without help', value: 6 },
      ], 2),
      selectInput('madrs8', '8. Inability to feel (loss of interest, emotional blunting)', [
        { label: '0 — Normal interest in surroundings and people', value: 0 },
        { label: '1 — Slight reduction in emotional reactivity', value: 1 },
        { label: '2 — Reduced ability to enjoy usual interests', value: 2 },
        { label: '3 — Noticeable emotional detachment', value: 3 },
        { label: '4 — Loss of interest in surroundings; loss of feelings for friends/relatives', value: 4 },
        { label: '5 — Profound numbness', value: 5 },
        { label: '6 — Total emotional paralysis; unable to feel anger, grief, or pleasure', value: 6 },
      ], 2),
      selectInput('madrs9', '9. Pessimistic thoughts (guilt, inferiority, remorse, ruin)', [
        { label: '0 — No pessimistic thoughts', value: 0 },
        { label: '1 — Fleeting self-doubt', value: 1 },
        { label: '2 — Fluctuating ideas of failure, self-reproach, or inferiority', value: 2 },
        { label: '3 — Recurrent self-blame', value: 3 },
        { label: '4 — Persistent self-accusations or definite realistic pessimism', value: 4 },
        { label: '5 — Near-delusional guilt', value: 5 },
        { label: '6 — Delusions of ruin, remorse, or unpardonable sin', value: 6 },
      ], 1),
      selectInput('madrs10', '10. Suicidal thoughts (feeling life is not worth living, plans)', [
        { label: '0 — Enjoys life or takes it as it comes', value: 0 },
        { label: '1 — Between the 0 and 2 anchors (mild weariness of life / fleeting thoughts)', value: 1 },
        { label: '2 — Weary of life; only fleeting suicidal thoughts', value: 2 },
        { label: '3 — Between the 2 and 4 anchors (more frequent thoughts, without a specific plan or intent)', value: 3 },
        { label: '4 — Probably better off dead; suicidal thoughts are common and suicide is considered a possible solution, without a specific plan or intent', value: 4 },
        { label: '5 — Between the 4 and 6 anchors (approaching explicit planning or active preparation)', value: 5 },
        { label: '6 — Explicit plans for suicide when opportunity arises; active preparations', value: 6 },
      ], 1),
      numberInput('score', 'Direct MADRS total override (0–60)', {
        min: 0,
        max: 60,
        exampleValue: 20,
        helpText: 'Enter official MADRS 10-item total (0–60).',
      }),
    ],
    calculate(values) {
      const mode = String(values.entryMode ?? 'survey');
      let score: number;

      if (mode === 'direct' || (values.score !== undefined && values.entryMode === undefined && values.madrs1 === undefined)) {
        score = Math.max(0, Math.min(60, num(values.score, 20)));
      } else {
        score =
          num(values.madrs1, 2) +
          num(values.madrs2, 2) +
          num(values.madrs3, 2) +
          num(values.madrs4, 2) +
          num(values.madrs5, 1) +
          num(values.madrs6, 2) +
          num(values.madrs7, 2) +
          num(values.madrs8, 2) +
          num(values.madrs9, 1) +
          num(values.madrs10, 1);
      }

      const r = riskFromThresholds(score, [
        {
          max: 6,
          level: 'normal',
          label: 'Recovered / absent symptoms',
          interpretation: `MADRS ${score}/60: symptoms absent or recovered range in clinical trials.`,
        },
        {
          max: 19,
          level: 'low',
          label: 'Mild depression',
          interpretation: `MADRS ${score}/60: mild depressive symptoms — psychotherapy ± pharmacotherapy based on history.`,
        },
        {
          max: 34,
          level: 'moderate',
          label: 'Moderate depression',
          interpretation: `MADRS ${score}/60: moderate depression — active treatment indicated; monitor longitudinal response.`,
        },
        {
          max: 60,
          level: 'high',
          label: 'Severe depression',
          interpretation: `MADRS ${score}/60: severe depression — intensive treatment; urgent safety/suicide assessment; consider higher level of care.`,
        },
      ]);

      // Item 10 has its own safety meaning and is unavailable when only a
      // direct total is entered. Do not carry a hidden/stale survey answer
      // into the direct-total branch or infer suicidality from the total.
      const suicideItem = mode === 'survey' ? num(values.madrs10, 0) : undefined;
      const suicideItemEndorsed = suicideItem !== undefined && suicideItem > 0;
      // Four is the first MADRS item-10 anchor describing common suicidal
      // thoughts / suicide as a possible solution. This is an urgent safety
      // flag, not a diagnosis of intent or imminent risk.
      const suicideItemUrgent = suicideItem !== undefined && suicideItem >= 4;
      let { riskLevel, label, interpretation } = r;
      if (suicideItemUrgent) {
        riskLevel = 'critical';
        label += ' (Urgent suicide safety flag)';
        interpretation += ' URGENT SAFETY ALERT: MADRS item 10 is rated ≥4 (common suicidal thoughts / suicide considered a possible solution; the anchor itself does not establish plan or intent). Perform an immediate direct suicide risk assessment; if current intent, plan, access to lethal means, inability to stay safe, or other imminent-risk features are present, initiate emergency psychiatric evaluation and safety measures.';
      } else if (suicideItemEndorsed) {
        interpretation += ` SAFETY ALERT: MADRS item 10 is endorsed (${suicideItem}/6). Perform an immediate direct suicide risk assessment; do not use the MADRS total alone to rule out suicide risk.`;
      }

      return {
        score,
        unit: '/60',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Entry mode', value: mode === 'direct' ? 'Direct override' : '10-item clinician rating' },
          { label: 'Common bands', value: '0–6 recovered; 7–19 mild; 20–34 moderate; ≥35 severe' },
          { label: 'Response / remission (trials)', value: 'Often ≥50% reduction = response; ≤10 (or ≤6) = remission' },
          { label: 'Item 10 (suicidal thoughts)', value: mode === 'survey' ? `${suicideItem}/6` : 'Unavailable from direct total — assess directly' },
        ],
        recommendations: suicideItemEndorsed ? [
          suicideItemUrgent
            ? 'Immediately perform a direct suicide risk assessment (current ideation, intent, plan, access to lethal means, past behavior, and protective factors); escalate to emergency psychiatric care and safety precautions if imminent risk, intent/plan, or inability to maintain safety is present.'
            : 'Perform a direct suicide risk assessment now (current ideation, intent, plan, access to lethal means, past behavior, and protective factors); escalate urgently if imminent risk is identified.',
          'MADRS is a depression-severity scale, not a standalone suicide-risk assessment; do not infer safety from the total score.',
        ] : undefined,
        alerts: suicideItemEndorsed ? [
          suicideItemUrgent
            ? `URGENT SAFETY ALERT: MADRS item 10 rated ${suicideItem}/6 (≥4 anchor: common suicidal thoughts / possible solution, without a specific plan or intent at the anchor). Immediate direct suicide risk assessment is required; assess intent, plan, access to lethal means, past behavior, and protective factors, and escalate to emergency psychiatric care if imminent risk or inability to stay safe is present. MADRS is not a standalone suicide-risk tool.`
            : `SAFETY ALERT: MADRS item 10 endorsed at ${suicideItem}/6. Perform an immediate direct suicide risk assessment (ideation, intent, plan, access to lethal means, past behavior, and protective factors); do not use the total MADRS score to rule out risk.`,
        ] : undefined,
      };
    },
    evidence: {
      summary:
        'MADRS: 10 clinician-rated items (0–6), total 0–60. Common severity: 0–6 recovered, 7–19 mild, 20–34 moderate, ≥35 severe. Highly sensitive to antidepressant change.',
      formula: 'Sum of 10 items (0–6 each) = 0–60',
      validation: 'Widely used in antidepressant RCTs; good sensitivity to change.',
      references: [
        {
          title: 'A new depression scale designed to be sensitive to change (MADRS)',
          citation: 'Montgomery SA, Åsberg M. Br J Psychiatry. 1979',
          year: 1979, pmid: '444788',
          doi: '10.1192/bjp.134.4.382', },
        {
          title: 'Ligature and/or Suicide Risk Reduction: Use of an Evidence-based Process to Assess Risk',
          citation: 'The Joint Commission. Standards FAQ (updated 2026)',
          year: 2026,
          url: 'https://www.jointcommission.org/en-us/knowledge-library/support-center/standards-interpretation/standards-faqs/000001234',
        },
        {
          title: 'Adult Outpatient Brief Suicide Safety Assessment Guide',
          citation: 'National Institute of Mental Health (NIMH), ASQ Toolkit',
          url: 'https://www.nimh.nih.gov/research/research-conducted-at-nimh/asq-toolkit-materials/adult-outpatient/adult-outpatient-brief-suicide-safety-assessment-guide',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Moderate–severe',
        actions: ['Safety/suicide assessment', 'Antidepressant and/or evidence-based psychotherapy', 'Follow serial MADRS'],
      },
      {
        condition: 'MADRS Item 10 ≥1 (any suicidal-thoughts endorsement)',
        actions: ['Immediate direct suicide risk assessment (ideation, intent, plan, means, past behavior, protective factors)', 'Do not use the total MADRS score alone to rule out risk'],
      },
      {
        condition: 'MADRS Item 10 ≥4 (common suicidal thoughts / possible solution anchor)',
        actions: ['Urgent same-day safety evaluation', 'Escalate to emergency psychiatric care and safety precautions if current intent/plan, access to lethal means, or inability to stay safe is present'],
      },
    ],
    pearls: [
      'Apparent sadness and reported sadness are distinct items.',
      'MADRS item 10 uses anchors at 0, 2, 4, and 6; intermediate scores (1, 3, 5) represent ratings between anchors.',
      'Any item-10 endorsement requires direct suicide-risk assessment; item 10 ≥4 is an urgent safety flag, but MADRS alone does not establish intent or imminent risk.',
    ],
  },

  {
    id: 'ham-d',
    isQuestionnaire: true,
    questionnaire: {
      modeInputId: 'entryMode',
      directModeValues: ['direct'],
      directInputIds: ['score'],
    },
    name: 'HAM-D Depression Score',
    shortName: 'HAM-D',
    description: 'Hamilton Depression Rating Scale (HAM-D 17) 17-item clinician interview and total (0–52).',
    category: 'psychiatry',
    tags: ['depression', 'hamilton', 'ham-d', 'hdrs'],
    whenToUse: 'Clinician-administered depression severity and treatment response monitoring; 17 items or direct score.',
    whyUse: 'Classic gold standard depression rating scale in psychiatry research and clinical trials.',
    inputs: [
      selectInput('entryMode', 'Entry mode', [
        { label: 'Interactive 17-item rating (HAM-D 17)', value: 'survey' },
        { label: 'Direct score override', value: 'direct' },
      ], 'survey'),
      selectInput('hamd1', '1. Depressed mood (sadness, hopelessness, helplessness, worthless)', [
        { label: '0 — Absent', value: 0 },
        { label: '1 — Indicated only on questioning', value: 1 },
        { label: '2 — Spontaneously reported verbally', value: 2 },
        { label: '3 — Communicated non-verbally (facial expression, posture, weeping)', value: 3 },
        { label: '4 — Patient reports virtually only these feeling states in speech and behavior', value: 4 },
      ], 2),
      selectInput('hamd2', '2. Feelings of guilt', [
        { label: '0 — Absent', value: 0 },
        { label: '1 — Self-reproach, feels he/she has let people down', value: 1 },
        { label: '2 — Ideas of guilt or rumination over past errors or sinful deeds', value: 2 },
        { label: '3 — Present illness is a punishment; delusions of guilt', value: 3 },
        { label: '4 — Hears accusatory or denunciatory voices and/or experiences visual hallucinations of guilt', value: 4 },
      ], 1),
      selectInput('hamd3', '3. Suicide', [
        { label: '0 — Absent', value: 0 },
        { label: '1 — Feels life is not worth living', value: 1 },
        { label: '2 — Wishes he/she were dead or any thoughts of possible death to self', value: 2 },
        { label: '3 — Suicidal ideas or gesture', value: 3 },
        { label: '4 — Attempts at suicide (any serious attempt rates 4)', value: 4 },
      ], 0, 'Any score above 0 requires an independent suicide risk assessment; do not rely on the total score alone.'),
      selectInput('hamd4', '4. Insomnia early (difficulty falling asleep)', [
        { label: '0 — No difficulty falling asleep', value: 0 },
        { label: '1 — Complains of occasional difficulty (more than 30 minutes)', value: 1 },
        { label: '2 — Nightly difficulty falling asleep', value: 2 },
      ], 1),
      selectInput('hamd5', '5. Insomnia middle (waking during the night)', [
        { label: '0 — No difficulty', value: 0 },
        { label: '1 — Complains of being restless and disturbed during the night', value: 1 },
        { label: '2 — Waking during the night; any getting out of bed rates 2 (except to void)', value: 2 },
      ], 1),
      selectInput('hamd6', '6. Insomnia late (waking in early morning)', [
        { label: '0 — No difficulty', value: 0 },
        { label: '1 — Waking in early hours of morning but goes back to sleep', value: 1 },
        { label: '2 — Unable to fall asleep again if he/she gets out of bed', value: 2 },
      ], 1),
      selectInput('hamd7', '7. Work and activities', [
        { label: '0 — No difficulty', value: 0 },
        { label: '1 — Thoughts and feelings of incapacity, fatigue or weakness related to activities', value: 1 },
        { label: '2 — Loss of interest in activity, hobbies, or work (directly or indirectly)', value: 2 },
        { label: '3 — Decrease in actual time spent in activities or decrease in productivity', value: 3 },
        { label: '4 — Stopped working because of present illness', value: 4 },
      ], 2),
      selectInput('hamd8', '8. Retardation (slowness of thought and speech; impaired concentration; motor activity)', [
        { label: '0 — Normal speech and thought', value: 0 },
        { label: '1 — Slight slowness at interview', value: 1 },
        { label: '2 — Obvious slowness at interview', value: 2 },
        { label: '3 — Interview difficult', value: 3 },
        { label: '4 — Complete stupor', value: 4 },
      ], 1),
      selectInput('hamd9', '9. Agitation', [
        { label: '0 — None', value: 0 },
        { label: '1 — Fidgetiness', value: 1 },
        { label: '2 — Playing with hands, hair, etc.', value: 2 },
        { label: '3 — Moving about, can not sit still', value: 3 },
        { label: '4 — Hand-wringing, nail-biting, hair-pulling, biting of lips', value: 4 },
      ], 1),
      selectInput('hamd10', '10. Anxiety (psychic)', [
        { label: '0 — No difficulty', value: 0 },
        { label: '1 — Subjective tension and irritability', value: 1 },
        { label: '2 — Worrying about minor matters', value: 2 },
        { label: '3 — Apprehensive attitude apparent in face or speech', value: 3 },
        { label: '4 — Fears expressed without questioning', value: 4 },
      ], 2),
      selectInput('hamd11', '11. Anxiety (somatic)', [
        { label: '0 — Absent', value: 0 },
        { label: '1 — Mild (GI, CV, respiratory, urinary, sweating)', value: 1 },
        { label: '2 — Moderate', value: 2 },
        { label: '3 — Severe', value: 3 },
        { label: '4 — Incapacitating', value: 4 },
      ], 1),
      selectInput('hamd12', '12. Somatic symptoms (gastrointestinal)', [
        { label: '0 — None', value: 0 },
        { label: '1 — Loss of appetite but eating without staff urging; heavy feeling in abdomen', value: 1 },
        { label: '2 — Difficulty eating without urging; requests or requires laxatives or medication for bowels', value: 2 },
      ], 1),
      selectInput('hamd13', '13. Somatic symptoms (general)', [
        { label: '0 — None', value: 0 },
        { label: '1 — Heaviness in limbs, back or head; backaches, headache, muscle aches; loss of energy', value: 1 },
        { label: '2 — Any clear-cut symptom rates 2', value: 2 },
      ], 1),
      selectInput('hamd14', '14. Genital symptoms (loss of libido, menstrual disturbances)', [
        { label: '0 — Absent', value: 0 },
        { label: '1 — Mild', value: 1 },
        { label: '2 — Severe', value: 2 },
      ], 1),
      selectInput('hamd15', '15. Hypochondriasis', [
        { label: '0 — Not present', value: 0 },
        { label: '1 — Self-absorption (bodily)', value: 1 },
        { label: '2 — Preoccupation with health', value: 2 },
        { label: '3 — Frequent complaints, requests for help, etc.', value: 3 },
        { label: '4 — Hypochondriacal delusions', value: 4 },
      ], 0),
      selectInput('hamd16', '16. Loss of weight', [
        { label: '0 — No weight loss', value: 0 },
        { label: '1 — Probable weight loss associated with present illness (or >1 lb/wk)', value: 1 },
        { label: '2 — Definite weight loss (or >2 lb/wk)', value: 2 },
      ], 0),
      selectInput('hamd17', '17. Insight', [
        { label: '0 — Acknowledges being depressed and ill', value: 0 },
        { label: '1 — Acknowledges illness but attributes cause to bad food, climate, overwork, virus, etc.', value: 1 },
        { label: '2 — Denies being ill at all', value: 2 },
      ], 0),
      numberInput('score', 'Direct HAM-D total override (0–52)', {
        min: 0,
        max: 52,
        exampleValue: 12,
        helpText: 'Enter official 17-item HDRS total (0–52).',
      }),
    ],
    calculate(values) {
      const mode = String(values.entryMode ?? 'survey');
      let score: number;

      if (mode === 'direct' || (values.score !== undefined && values.entryMode === undefined && values.hamd1 === undefined)) {
        score = Math.max(0, Math.min(52, num(values.score, 12)));
      } else {
        score =
          num(values.hamd1, 2) +
          num(values.hamd2, 1) +
          num(values.hamd3, 0) +
          num(values.hamd4, 1) +
          num(values.hamd5, 1) +
          num(values.hamd6, 1) +
          num(values.hamd7, 2) +
          num(values.hamd8, 1) +
          num(values.hamd9, 1) +
          num(values.hamd10, 2) +
          num(values.hamd11, 1) +
          num(values.hamd12, 1) +
          num(values.hamd13, 1) +
          num(values.hamd14, 1) +
          num(values.hamd15, 0) +
          num(values.hamd16, 0) +
          num(values.hamd17, 0);
      }

      const suicideItem = mode === 'survey' ? num(values.hamd3, 0) : undefined;
      const suicideAlert = suicideItem !== undefined && suicideItem > 0
        ? [
            `HAM-D item 3 (suicide) is positive at ${suicideItem}/4. Perform an independent, immediate suicide risk assessment; the HAM-D total must not be used to rule out acute risk.`,
          ]
        : undefined;

      const r = riskFromThresholds(score, [
        {
          max: 7,
          level: 'normal',
          label: 'Normal / remission range',
          interpretation: `HAM-D ${score}/52: normal or remission range on 17-item scale.`,
        },
        {
          max: 13,
          level: 'low',
          label: 'Mild depression',
          interpretation: `HAM-D ${score}/52: mild depressive symptoms.`,
        },
        {
          max: 18,
          level: 'moderate',
          label: 'Moderate depression',
          interpretation: `HAM-D ${score}/52: moderate depression — active treatment indicated.`,
        },
        {
          max: 22,
          level: 'high',
          label: 'Severe depression',
          interpretation: `HAM-D ${score}/52: severe depression — active multimodal treatment; safety assessment.`,
        },
        {
          max: 52,
          level: 'critical',
          label: 'Very severe depression',
          interpretation: `HAM-D ${score}/52: very severe — consider higher level of care, psychosis screen, suicide risk.`,
        },
      ]);
      return {
        score,
        unit: '/52',
        ...r,
        details: [
          { label: 'Entry mode', value: mode === 'direct' ? 'Direct override' : '17-item rating' },
          { label: '17-item bands', value: '≤7 normal; 8–13 mild; 14–18 moderate; 19–22 severe; ≥23 very severe' },
          { label: 'HAM-D item 3 (suicide)', value: mode === 'survey' ? `${suicideItem}/4` : 'Unavailable from direct total' },
        ],
        alerts: suicideAlert,
      };
    },
    evidence: {
      summary:
        'Hamilton Depression Rating Scale (HAM-D 17): 17 clinician items (9 items 0–4 and 8 items 0–2). Total 0–52. Published in 1960; public domain.',
      formula: 'Sum of 17 items (0–52)',
      validation: 'Historic gold-standard clinician depression scale; public domain.',
      references: [
        {
          title: 'A rating scale for depression',
          citation: 'Hamilton M. J Neurol Neurosurg Psychiatry. 1960',
          year: 1960, pmid: '14399272',
          doi: '10.1136/jnnp.23.1.56', },
      ],
    },
    nextSteps: [
      {
        condition: 'Score ≥14',
        actions: ['Diagnostic confirmation', 'Treatment initiation/escalation', 'Safety planning'],
      },
    ],
    pearls: ['Heavy somatic item loading — interpret cautiously in physical illness.', 'Public domain scale.'],
  },

  {
    id: 'ham-a',
    isQuestionnaire: true,
    questionnaire: {
      modeInputId: 'entryMode',
      directModeValues: ['direct'],
      directInputIds: ['score'],
    },
    name: 'HAM-A Anxiety Score',
    shortName: 'HAM-A',
    description: 'Hamilton Anxiety Rating Scale (HAM-A) 14-item clinician interview and total (0–56).',
    category: 'psychiatry',
    tags: ['anxiety', 'hamilton', 'ham-a', 'severity'],
    whenToUse: 'Clinician-rated anxiety severity after HAM-A administration; 14 items or direct total.',
    whyUse: 'Classic gold standard anxiety severity scale for monitoring psychic and somatic anxiety.',
    inputs: [
      selectInput('entryMode', 'Entry mode', [
        { label: 'Interactive 14-item clinician interview', value: 'survey' },
        { label: 'Direct score override', value: 'direct' },
      ], 'survey'),
      ...[
        '1. Anxious mood (worries, anticipation of the worst, fearful anticipation, irritability)',
        '2. Tension (feelings of tension, fatigability, startle response, moved to tears easily, trembling)',
        '3. Fears (of dark, strangers, being left alone, animals, traffic, crowds)',
        '4. Insomnia (difficulty falling asleep, broken sleep, unrefreshing sleep, fatigue on waking)',
        '5. Intellectual / cognitive (difficulty in concentration, poor memory)',
        '6. Depressed mood (loss of interest, lack of pleasure in hobbies, depression, early waking)',
        '7. Somatic: muscular (pains and aches, twitching, stiffness, myoclonic jerks, teeth grinding)',
        '8. Somatic: sensory (tinnitus, blurring of vision, hot and cold flushes, weakness, prickling)',
        '9. Cardiovascular symptoms (tachycardia, palpitations, pain in chest, throbbing of vessels)',
        '10. Respiratory symptoms (pressure or constriction in chest, choking feelings, sighing, dyspnea)',
        '11. Gastrointestinal symptoms (dysphagia, wind, dyspepsia, abdominal pain, nausea, vomiting, loose bowels)',
        '12. Genitourinary symptoms (frequency, urgency, amenorrhea, menorrhagia, loss of libido, premature ejaculation)',
        '13. Autonomic symptoms (dry mouth, flushing, pallor, sweating, giddiness, tension headache)',
        '14. Behavior at interview (fidgeting, restlessness, tremor of hands, furrowed brow, strained face, sighing)',
      ].map((title, i) =>
        selectInput(`hama_${i + 1}`, title, [
          { label: '0 — Not present', value: 0 },
          { label: '1 — Mild', value: 1 },
          { label: '2 — Moderate', value: 2 },
          { label: '3 — Severe', value: 3 },
          { label: '4 — Very severe (incapacitating)', value: 4 },
        ], i < 6 ? 2 : 1),
      ),
      numberInput('score', 'Direct HAM-A total override (0–56)', {
        min: 0,
        max: 56,
        exampleValue: 18,
        helpText: 'Enter official HAM-A 14-item total (0–56).',
      }),
    ],
    calculate(values) {
      const mode = String(values.entryMode ?? 'survey');
      let psychic: number | undefined;
      let somatic: number | undefined;
      let score: number;

      if (mode === 'direct' || (values.score !== undefined && values.entryMode === undefined && values.hama_1 === undefined)) {
        score = Math.max(0, Math.min(56, num(values.score, 18)));
      } else {
        psychic = 0;
        somatic = 0;
        for (let i = 1; i <= 6; i++) {
          psychic += num(values[`hama_${i}`], 2);
        }
        psychic += num(values.hama_14, 1);
        for (let i = 7; i <= 13; i++) {
          somatic += num(values[`hama_${i}`], 1);
        }
        score = psychic + somatic;
      }

      const r = riskFromThresholds(score, [
        {
          max: 17,
          level: 'low',
          label: 'Mild anxiety',
          interpretation: `HAM-A ${score}/56: mild anxiety severity range.`,
        },
        {
          max: 24,
          level: 'moderate',
          label: 'Mild to moderate anxiety',
          interpretation: `HAM-A ${score}/56: mild to moderate anxiety — consider CBT ± pharmacotherapy.`,
        },
        {
          max: 30,
          level: 'high',
          label: 'Moderate to severe anxiety',
          interpretation: `HAM-A ${score}/56: moderate to severe anxiety — active treatment recommended.`,
        },
        {
          max: 56,
          level: 'critical',
          label: 'Severe anxiety',
          interpretation: `HAM-A ${score}/56: severe anxiety — intensive management; rule out secondary medical contributors.`,
        },
      ]);
      return {
        score,
        unit: '/56',
        ...r,
        details: [
          { label: 'Entry mode', value: mode === 'direct' ? 'Direct override' : '14-item clinician interview' },
          { label: 'Psychic anxiety subscore (items 1–6, 14)', value: psychic !== undefined ? `${psychic}/28` : 'Unavailable from direct total' },
          { label: 'Somatic anxiety subscore (items 7–13)', value: somatic !== undefined ? `${somatic}/28` : 'Unavailable from direct total' },
          { label: 'Common bands', value: '≤17 mild; 18–24 mild–moderate; 25–30 moderate–severe; >30 severe' },
        ],
      };
    },
    evidence: {
      summary:
        'HAM-A: 14 items (0–4), total 0–56. Psychic subscale = items 1–6, 14 (0–28). Somatic subscale = items 7–13 (0–28). Published in 1959; public domain.',
      formula: 'Sum of 14 items (0–4 each) = 0–56',
      validation: 'Longstanding clinician anxiety scale used across psychiatric research.',
      references: [
        {
          title: 'The assessment of anxiety states by rating',
          citation: 'Hamilton M. Br J Med Psychol. 1959',
          year: 1959, pmid: '13638508',
          doi: '10.1111/j.2044-8341.1959.tb00467.x', },
      ],
    },
    nextSteps: [
      {
        condition: 'Score ≥18',
        actions: ['CBT / SSRI-SNRI as appropriate', 'Assess for panic, GAD, PTSD, substance use', 'Limit chronic benzo when possible'],
      },
    ],
    pearls: [
      'Items 1–6 and 14 measure psychic anxiety; items 7–13 measure somatic anxiety.',
      'Public domain instrument with no licensing restrictions.',
    ],
  },

  {
    id: 'bai',
    name: 'Beck Anxiety Inventory (BAI)',
    shortName: 'BAI',
    description: 'Beck Anxiety Inventory total score interpreter (0–63).',
    category: 'psychiatry',
    tags: ['anxiety', 'beck', 'bai', 'self-report'],
    whenToUse: 'Interpret patient-completed BAI total for anxiety symptom severity.',
    whyUse: 'Common self-report anxiety severity measure emphasizing somatic symptoms.',
    inputs: [
      numberInput('score', 'BAI total (0–63)', {
        min: 0,
        max: 63,
        exampleValue: 16,
        helpText: '21 items scored 0–3 over the past week including today. Copyrighted instrument — score from the official BAI form and enter the total only here.',
      }),
    ],
    calculate(values) {
      const score = num(values.score, 16);
      const r = riskFromThresholds(score, [
        {
          max: 7,
          level: 'low',
          label: 'Minimal anxiety',
          interpretation: 'BAI 0–7: minimal anxiety symptoms.',
        },
        {
          max: 15,
          level: 'low',
          label: 'Mild anxiety',
          interpretation: 'BAI 8–15: mild anxiety — monitor and supportive interventions.',
        },
        {
          max: 25,
          level: 'moderate',
          label: 'Moderate anxiety',
          interpretation: 'BAI 16–25: moderate anxiety — clinical evaluation and treatment consideration.',
        },
        {
          max: 63,
          level: 'high',
          label: 'Severe anxiety',
          interpretation: 'BAI 26–63: severe anxiety — active treatment; assess panic and functional impairment.',
        },
      ]);
      return {
        score,
        ...r,
        details: [{ label: 'Bands', value: '0–7 minimal; 8–15 mild; 16–25 moderate; 26–63 severe' }],
      };
    },
    evidence: {
      summary: 'BAI: 21 self-report items (0–3), total 0–63. Bands: 0–7 minimal, 8–15 mild, 16–25 moderate, 26–63 severe.',
      formula: 'Enter total 0–63',
      validation: 'Widely used self-report anxiety inventory (Beck et al.).',
      references: [
        {
          title: 'An inventory for measuring clinical anxiety: psychometric properties (BAI)',
          citation: 'Beck AT et al. J Consult Clin Psychol. 1988',
          year: 1988, pmid: '3204199',
          doi: '10.1037//0022-006x.56.6.893', },
      ],
    },
    nextSteps: [
      {
        condition: 'Score ≥16',
        actions: ['Clinical diagnostic assessment', 'Evidence-based psychotherapy and/or meds', 'Medical rule-outs for somatic anxiety'],
      },
    ],
    pearls: ['Somatic emphasis can overlap medical illness and panic disorder.', 'Copyrighted instrument — enter total only here.'],
  },
  {
    id: 'bdi-ii',
    name: 'Beck Depression Inventory-II',
    shortName: 'BDI-II',
    description: 'Beck Depression Inventory-II total score interpreter (0–63).',
    category: 'psychiatry',
    tags: ['depression', 'beck', 'bdi', 'self-report'],
    whenToUse: 'Interpret patient-completed BDI-II for depressive symptom severity.',
    whyUse: 'Standard self-report depression severity scale aligned with DSM symptom constructs.',
    inputs: [
      numberInput('score', 'BDI-II total (0–63)', {
        min: 0,
        max: 63,
        exampleValue: 18,
        helpText: '21 items scored 0–3 over the past 2 weeks including today. Copyrighted — use the licensed BDI-II form for item administration; enter the already-scored total. Item 9 (suicidal thoughts) warrants direct clinical follow-up if elevated.',
      }),
    ],
    calculate(values) {
      const score = num(values.score, 18);
      const r = riskFromThresholds(score, [
        {
          max: 13,
          level: 'low',
          label: 'Minimal depression',
          interpretation: 'BDI-II 0–13: minimal depression symptoms.',
        },
        {
          max: 19,
          level: 'moderate',
          label: 'Mild depression',
          interpretation: 'BDI-II 14–19: mild depression — clinical correlation and follow-up.',
        },
        {
          max: 28,
          level: 'high',
          label: 'Moderate depression',
          interpretation: 'BDI-II 20–28: moderate depression — active treatment usually indicated.',
        },
        {
          max: 63,
          level: 'critical',
          label: 'Severe depression',
          interpretation: 'BDI-II 29–63: severe depression — intensive treatment and suicide risk assessment (items 2 and 9).',
        },
      ]);
      return {
        score,
        ...r,
        details: [{ label: 'Bands', value: '0–13 minimal; 14–19 mild; 20–28 moderate; 29–63 severe' }],
        recommendations: ['Review suicidal ideation items if elevated', 'Do not use score alone for diagnosis'],
      };
    },
    evidence: {
      summary:
        'BDI-II: 21 items (0–3), total 0–63. Manual cutoffs: 0–13 minimal, 14–19 mild, 20–28 moderate, 29–63 severe.',
      formula: 'Enter total 0–63',
      validation: 'Extensively validated self-report depression measure.',
      references: [
        {
          title: 'Comparison of Beck Depression Inventories-IA and -II in psychiatric outpatients',
          citation: 'Beck AT, Steer RA, Ball R, Ranieri WF. J Pers Assess. 1996; BDI-II Manual: Beck AT, Steer RA, Brown GK. Psychological Corporation. 1996',
          year: 1996,
          pmid: '8991972',
          doi: '10.1207/s15327752jpa6703_13', },
      ],
    },
    nextSteps: [
      {
        condition: 'Score ≥20',
        actions: ['Diagnostic interview for MDD', 'Safety assessment', 'Therapy ± antidepressant'],
      },
    ],
    pearls: ['Copyrighted — use licensed forms for item administration.', 'Item 9 (suicidal thoughts) warrants direct clinical follow-up if elevated.'],
  },
  {
    id: 'ymrs',
    isQuestionnaire: true,
    questionnaire: {
      modeInputId: 'entryMode',
      directModeValues: ['direct'],
      directInputIds: ['score'],
    },
    name: 'Young Mania Rating Scale (YMRS)',
    shortName: 'YMRS',
    description: 'Young Mania Rating Scale 11-item clinician interview (0–60) for manic symptom severity.',
    category: 'psychiatry',
    tags: ['mania', 'bipolar', 'ymrs', 'rating scale'],
    whenToUse: 'Clinician-rated mania severity after YMRS administration; 11 items or direct score.',
    whyUse: 'Standard mania severity outcome in bipolar research and clinical practice (items 5, 6, 8, 9 double-weighted).',
    inputs: [
      selectInput('entryMode', 'Entry mode', [
        { label: 'Interactive 11-item clinician interview', value: 'survey' },
        { label: 'Direct score override', value: 'direct' },
      ], 'survey'),
      selectInput('ymrs1', '1. Elevated mood', [
        { label: '0 — Absent', value: 0 },
        { label: '1 — Mildly or possibly increased on questioning', value: 1 },
        { label: '2 — Definite subjective elevation; optimistic, self-confident; cheerful', value: 2 },
        { label: '3 — Elevated, inappropriate to content; humorous', value: 3 },
        { label: '4 — Euphoric; inappropriate laughter; singing', value: 4 },
      ], 1),
      selectInput('ymrs2', '2. Increased motor activity-energy', [
        { label: '0 — Absent', value: 0 },
        { label: '1 — Subjectively increased', value: 1 },
        { label: '2 — Animated; gestures increased', value: 2 },
        { label: '3 — Excessive energy; hyperactive at times; restless (can be calmed)', value: 3 },
        { label: '4 — Motor excitement; continuous hyperactivity (cannot be calmed)', value: 4 },
      ], 1),
      selectInput('ymrs3', '3. Sexual interest', [
        { label: '0 — Normal; not increased', value: 0 },
        { label: '1 — Mildly or possibly increased', value: 1 },
        { label: '2 — Definite subjective increase on questioning', value: 2 },
        { label: '3 — Spontaneous sexual content; elaborates on sexual matters; hypersexual by report', value: 3 },
        { label: '4 — Overt sexual acts (toward patients, staff, or interviewer)', value: 4 },
      ], 1),
      selectInput('ymrs4', '4. Sleep', [
        { label: '0 — Reports no decrease in sleep', value: 0 },
        { label: '1 — Sleeping less than normal amount by up to one hour', value: 1 },
        { label: '2 — Sleeping less than normal by more than one hour', value: 2 },
        { label: '3 — Reports decreased need for sleep', value: 3 },
        { label: '4 — Denies need for sleep', value: 4 },
      ], 1),
      selectInput('ymrs5', '5. Irritability (double weighted)', [
        { label: '0 — Absent', value: 0 },
        { label: '2 — Subjectively increased', value: 2 },
        { label: '4 — Irritable at times during interview; recent episodes of anger/annoyance', value: 4 },
        { label: '6 — Frequently irritable during interview; short, curt throughout', value: 6 },
        { label: '8 — Hostile, uncooperative; interview impossible', value: 8 },
      ], 2),
      selectInput('ymrs6', '6. Speech: rate and amount (double weighted)', [
        { label: '0 — No increase', value: 0 },
        { label: '2 — Feels talkative', value: 2 },
        { label: '4 — Increased rate or amount at times, verbose at times', value: 4 },
        { label: '6 — Push; consistently increased rate and amount; difficult to interrupt', value: 6 },
        { label: '8 — Pressured; uninterruptible, continuous speech', value: 8 },
      ], 2),
      selectInput('ymrs7', '7. Language-thought disorder', [
        { label: '0 — Absent', value: 0 },
        { label: '1 — Circumstantiality; mild distractibility; quick thoughts', value: 1 },
        { label: '2 — Distractible; loses goal of thought; changes topics frequently; racing thoughts', value: 2 },
        { label: '3 — Flight of ideas; tangentiability; difficult to follow; rhyming/echolalia', value: 3 },
        { label: '4 — Incoherent; communication impossible', value: 4 },
      ], 1),
      selectInput('ymrs8', '8. Content (double weighted)', [
        { label: '0 — Normal', value: 0 },
        { label: '2 — Questionable plans, new interests', value: 2 },
        { label: '4 — Special projects; hyper-religious', value: 4 },
        { label: '6 — Grandiose or paranoid ideas; ideas of reference', value: 6 },
        { label: '8 — Delusions; hallucinations', value: 8 },
      ], 2),
      selectInput('ymrs9', '9. Disruptive-aggressive behavior (double weighted)', [
        { label: '0 — Normal, cooperative', value: 0 },
        { label: '2 — Sarcastic; loud at times, guarded', value: 2 },
        { label: '4 — Demanding; treats interviewer curtly; shouts at times', value: 4 },
        { label: '6 — Threatens interviewer; shouting; interview difficult', value: 6 },
        { label: '8 — Assaultive; destructive; interview impossible', value: 8 },
      ], 0),
      selectInput('ymrs10', '10. Appearance', [
        { label: '0 — Appropriate dress and grooming', value: 0 },
        { label: '1 — Slightly untidy or disheveled', value: 1 },
        { label: '2 — Poorly groomed; moderately disheveled; overdressed', value: 2 },
        { label: '3 — Disheveled; partly undressed; bizarre garish makeup', value: 3 },
        { label: '4 — Completely unkempt; decorated; bizarre clothing', value: 4 },
      ], 0),
      selectInput('ymrs11', '11. Insight', [
        { label: '0 — Present; admits illness; agrees with need for treatment', value: 0 },
        { label: '1 — Admits illness but denies need for medication', value: 1 },
        { label: '2 — Admits behavior change, but denies illness', value: 2 },
        { label: '3 — Admits possible behavior change, denies illness completely', value: 3 },
        { label: '4 — Denies any behavior change or illness', value: 4 },
      ], 1),
      numberInput('score', 'Direct YMRS total override (0–60)', {
        min: 0,
        max: 60,
        exampleValue: 12,
        helpText: 'Enter official YMRS 11-item total (0–60). Items 5, 6, 8, 9 are double-weighted (0, 2, 4, 6, 8).',
      }),
    ],
    calculate(values) {
      const mode = String(values.entryMode ?? 'survey');
      let score: number;

      if (mode === 'direct' || (values.score !== undefined && values.entryMode === undefined && values.ymrs1 === undefined)) {
        score = Math.max(0, Math.min(60, num(values.score, 12)));
      } else {
        score =
          num(values.ymrs1, 1) +
          num(values.ymrs2, 1) +
          num(values.ymrs3, 1) +
          num(values.ymrs4, 1) +
          num(values.ymrs5, 2) +
          num(values.ymrs6, 2) +
          num(values.ymrs7, 1) +
          num(values.ymrs8, 2) +
          num(values.ymrs9, 0) +
          num(values.ymrs10, 0) +
          num(values.ymrs11, 1);
      }

      const r = riskFromThresholds(score, [
        {
          max: 12,
          level: 'low',
          label: 'Euthymia / minimal mania',
          interpretation: `YMRS ${score}/60: euthymia or minimal mania symptoms (often remission in trials).`,
        },
        {
          max: 19,
          level: 'moderate',
          label: 'Mild mania / hypomania range',
          interpretation: `YMRS ${score}/60: mild manic symptoms / hypomania range — optimize mood stabilization; monitor sleep.`,
        },
        {
          max: 25,
          level: 'high',
          label: 'Moderate mania',
          interpretation: `YMRS ${score}/60: moderate mania — active antimanic treatment indicated; assess insight and safety.`,
        },
        {
          max: 60,
          level: 'critical',
          label: 'Severe mania',
          interpretation: `YMRS ${score}/60: severe mania — acute stabilization; consider inpatient hospitalization and antipsychotic/mood stabilizer escalation.`,
        },
      ]);
      return {
        score,
        unit: '/60',
        ...r,
        details: [
          { label: 'Entry mode', value: mode === 'direct' ? 'Direct override' : '11-item clinician rating' },
          { label: 'Double-weighted items', value: 'Irritability (5), Speech (6), Content (8), Aggression (9)' },
          { label: 'Pragmatic bands', value: '≤12 minimal/remission; 13–19 mild; 20–25 moderate; ≥26 severe' },
        ],
      };
    },
    evidence: {
      summary:
        'YMRS: 11 clinician items (items 5, 6, 8, 9 scored 0, 2, 4, 6, 8; others 0–4), total 0–60. Open clinical scale published in 1978.',
      formula: 'Sum of 11 items (4 double-weighted) = 0–60',
      validation: 'Standard mania rating scale (Young et al.) used across bipolar trials.',
      references: [
        {
          title: 'A rating scale for mania: reliability, validity and sensitivity (YMRS)',
          citation: 'Young RC et al. Br J Psychiatry. 1978',
          year: 1978, pmid: '728692',
          doi: '10.1192/bjp.133.5.429', },
      ],
    },
    nextSteps: [
      {
        condition: 'YMRS ≥13',
        actions: ['Mood stabilizer review / titration', 'Atypical antipsychotic as indicated', 'Sleep restoration', 'Safety and impulse control review'],
      },
    ],
    pearls: [
      'Four items are double-weighted (0, 2, 4, 6, 8): irritability, speech rate/amount, thought content, and disruptive behavior.',
      'Can be completed based on clinical interview and 48-hour observation.',
    ],
  },

  {
    id: 'panss-simp',
    name: 'PANSS Total (Simplified Bands)',
    shortName: 'PANSS-simp',
    description: 'Simplified interpretation of Positive and Negative Syndrome Scale total (30–210).',
    category: 'psychiatry',
    tags: ['psychosis', 'schizophrenia', 'panss', 'severity'],
    whenToUse: 'After full PANSS administration, interpret total score severity bands.',
    whyUse: 'PANSS total is a common global psychosis severity metric in research and specialty care.',
    inputs: [
      numberInput('total', 'PANSS total score', {
        min: 30,
        max: 210,
        exampleValue: 75,
        helpText: '30 items × 1–7; minimum total 30. Score from the official PANSS form (Kay); this tool interprets an already-administered total.',
      }),
      numberInput('positive', 'Positive subscale (optional, 7–49)', {
        min: 7,
        max: 49,
        exampleValue: 7,
        required: false,
        helpText: 'Optional display only (not added into the total here). Official P1–P7, each 1–7. Leave blank if not scored separately.',
      }),
      numberInput('negative', 'Negative subscale (optional, 7–49)', {
        min: 7,
        max: 49,
        exampleValue: 7,
        required: false,
        helpText: 'Optional display only. Official N1–N7, each 1–7.',
      }),
      numberInput('general', 'General psychopathology (optional, 16–112)', {
        min: 16,
        max: 112,
        exampleValue: 16,
        required: false,
        helpText: 'Optional display only. Official G1–G16, each 1–7.',
      }),
    ],
    calculate(values) {
      const score = num(values.total, 75);
      // A blank optional subscale is not a 0 score; mark it unentered.
      const subscaleOrDash = (raw: number | string | boolean | null | undefined) =>
        isMissingValue(raw, true) ? '—' : String(num(raw));
      const r = riskFromThresholds(score, [
        {
          max: 58,
          level: 'low',
          label: 'Mildly ill range',
          interpretation: 'PANSS total in a milder range (approx. CGI mild). Continue maintenance and psychosocial supports.',
        },
        {
          max: 75,
          level: 'moderate',
          label: 'Moderately ill range',
          interpretation: 'Moderate overall symptom burden — optimize antipsychotic, adherence, and psychosocial treatment.',
        },
        {
          max: 95,
          level: 'high',
          label: 'Markedly ill range',
          interpretation: 'Marked symptom burden — review diagnosis, substance use, dose/agent, and need for higher intensity care.',
        },
        {
          max: 210,
          level: 'critical',
          label: 'Severely / extremely ill range',
          interpretation: 'Severe PANSS total — safety assessment, consider hospitalization, treatment-resistant pathway if appropriate.',
        },
      ]);
      return {
        score,
        ...r,
        details: [
          {
            label: 'Positive / Negative / General',
            value: `${subscaleOrDash(values.positive)} / ${subscaleOrDash(values.negative)} / ${subscaleOrDash(values.general)}`,
          },
          {
            label: 'Note',
            value: 'Bands approximate published CGI-linked PANSS anchors (e.g., Leucht et al.); not rigid cutoffs.',
          },
        ],
      };
    },
    evidence: {
      summary:
        'PANSS: 30 items scored 1–7 (total 30–210). Subscales: positive 7, negative 7, general 16. Total bands here approximate severity anchors linked to CGI in the literature.',
      formula: 'Enter total (and optional subscales)',
      validation: 'Gold-standard psychosis rating scale (Kay et al.); equipercentile linking studies map totals to CGI severity.',
      references: [
        {
          title: 'The Positive and Negative Syndrome Scale (PANSS) for schizophrenia',
          citation: 'Kay SR et al. Schizophr Bull. 1987',
          year: 1987, pmid: '3616518',
          doi: '10.1093/schbul/13.2.261', },
      ],
    },
    nextSteps: [
      {
        condition: 'Moderate–severe totals',
        actions: [
          'Adherence and plasma level if available',
          'Substance use assessment',
          'Clozapine pathway if treatment-resistant',
          'Psychosocial interventions / ACT as needed',
        ],
      },
    ],
    pearls: ['Minimum score is 30 (not 0).', 'Report subscales, not only total, for clinical nuance.'],
  },
  {
    id: 'audit-full',
    name: 'AUDIT (Full 10-Item)',
    shortName: 'AUDIT',
    description: 'Alcohol Use Disorders Identification Test — full 10-item WHO screen (score 0–40).',
    category: 'psychiatry',
    tags: ['alcohol', 'audit', 'substance', 'screening'],
    whenToUse: 'Comprehensive alcohol misuse screening when AUDIT-C is positive or full risk stratification needed.',
    whyUse: 'WHO standard screen for hazardous, harmful, and dependent drinking patterns.',
    inputs: [
      selectInput('q1', '1. How often do you have a drink containing alcohol?', [
        { label: 'Never (0)', value: 0 },
        { label: 'Monthly or less (1)', value: 1 },
        { label: '2–4 times a month (2)', value: 2 },
        { label: '2–3 times a week (3)', value: 3 },
        { label: '4 or more times a week (4)', value: 4 },
      ], undefined, 'Past 12 months (WHO AUDIT). If Never, Q2–Q3 are typically 0; Q9–Q10 may still score if there is a lifetime injury/concern.'),
      selectInput('q2', '2. How many standard drinks on a typical drinking day?', [
        { label: '1–2 (0)', value: 0 },
        { label: '3–4 (1)', value: 1 },
        { label: '5–6 (2)', value: 2 },
        { label: '7–9 (3)', value: 3 },
        { label: '10 or more (4)', value: 4 },
      ], 0, 'Agree a standard drink first. WHO ≈ 10 g ethanol; US common teaching ≈ 14 g (12 oz beer, 5 oz wine, 1.5 oz spirits).'),
      selectInput('q3', '3. How often ≥6 drinks on one occasion?', auditFreq, 0, 'Same standard-drink definition as Q2. WHO AUDIT Q3 is ≥6 drinks on one occasion. Past 12 months.'),
      selectInput('q4', '4. How often unable to stop drinking once started (past year)?', auditFreq, undefined, 'Past 12 months.'),
      selectInput('q5', '5. How often failed to do what was normally expected because of drinking (past year)?', auditFreq, undefined, 'Past 12 months.'),
      selectInput('q6', '6. How often needed a first drink in the morning (past year)?', auditFreq, undefined, 'Past 12 months. Eye-opener / relief of withdrawal.'),
      selectInput('q7', '7. How often guilt or remorse after drinking (past year)?', auditFreq, undefined, 'Past 12 months.'),
      selectInput('q8', '8. How often unable to remember night before because of drinking (past year)?', auditFreq, undefined, 'Past 12 months. Blackouts.'),
      selectInput('q9', '9. Injured you or someone else because of drinking?', [
        { label: 'No (0)', value: 0 },
        { label: 'Yes, but not in the last year (2)', value: 2 },
        { label: 'Yes, during the last year (4)', value: 4 },
      ], undefined, 'Lifetime injury from drinking, with extra weight if in the last 12 months. Scoring is 0/2/4 (not 0–4).'),
      selectInput('q10', '10. Relative/friend/doctor concerned or suggested cut down?', [
        { label: 'No (0)', value: 0 },
        { label: 'Yes, but not in the last year (2)', value: 2 },
        { label: 'Yes, during the last year (4)', value: 4 },
      ], undefined, 'Lifetime concern from others, with extra weight if in the last 12 months. Scoring is 0/2/4.'),
    ],
    calculate(values) {
      let score = 0;
      for (let i = 1; i <= 10; i++) score += num(values[`q${i}`]);
      const r = riskFromThresholds(score, [
        {
          max: 7,
          level: 'low',
          label: 'Zone I — Low risk',
          interpretation: 'AUDIT 0–7: low-risk alcohol use (or abstinence). Alcohol education as appropriate.',
        },
        {
          max: 15,
          level: 'moderate',
          label: 'Zone II — Hazardous',
          interpretation: 'AUDIT 8–15: hazardous use — simple advice / brief intervention (SBIRT).',
        },
        {
          max: 19,
          level: 'high',
          label: 'Zone III — Harmful',
          interpretation: 'AUDIT 16–19: harmful use — brief intervention plus additional counseling and monitoring.',
        },
        {
          max: 40,
          level: 'critical',
          label: 'Zone IV — Possible dependence',
          interpretation: 'AUDIT ≥20: possible alcohol dependence — diagnostic assessment, withdrawal planning, referral to treatment.',
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'Zones', value: '0–7 low; 8–15 hazardous; 16–19 harmful; ≥20 possible dependence' },
          { label: 'Range', value: '0–40' },
        ],
        recommendations:
          score >= 20
            ? ['Assess withdrawal risk (CIWA)', 'Offer treatment referral', 'Thiamine if heavy use']
            : score >= 8
              ? ['Brief intervention', 'Set drinking limits', 'Follow-up']
              : ['Reinforce low-risk limits'],
      };
    },
    evidence: {
      summary:
        'Full AUDIT: 10 items, score 0–40. WHO zones: 0–7 low risk, 8–15 hazardous, 16–19 harmful, ≥20 possible dependence. Cutoff ≥8 commonly flags hazardous drinking (sex/culture adjustments exist).',
      formula: 'Sum Q1–Q10',
      validation: 'WHO-validated cross-national alcohol screen; foundation for AUDIT-C.',
      references: [
        {
          title: 'Development of the Alcohol Use Disorders Identification Test (AUDIT): WHO Collaborative Project on Early Detection of Persons with Harmful Alcohol Consumption-II',
          citation: 'Saunders JB et al. Addiction. 1993',
          year: 1993,
          pmid: '8329970',
          doi: '10.1111/j.1360-0443.1993.tb02093.x',
        },
        {
          title: 'The Alcohol Use Disorders Identification Test: Guidelines for Use in Primary Care (2nd ed.)',
          citation: 'Babor TF, Higgins-Biddle JC, Saunders JB, Monteiro MG. WHO. 2001',
          year: 2001,
          url: 'https://iris.who.int/handle/10665/67205',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Score ≥8',
        actions: ['Brief intervention (SBIRT)', 'Full substance history', 'LFTs/CBC if indicated'],
      },
      {
        condition: 'Score ≥20',
        actions: ['Evaluate for AUD / dependence', 'Withdrawal risk & CIWA pathway', 'Specialty addiction referral'],
      },
    ],
    pearls: ['Standard drink definitions vary by country — clarify with patient.', 'Q9–Q10 use 0/2/4 scoring.'],
  },
  {
    id: 'dast-10',
    name: 'DAST-10 Drug Abuse Screening',
    shortName: 'DAST-10',
    description: 'Drug Abuse Screening Test 10-item yes/no screen for drug-related problems (0–10), excluding alcohol.',
    category: 'psychiatry',
    tags: ['drugs', 'substance', 'dast', 'screening'],
    whenToUse: 'Screen for problems related to drug use (not alcohol) in primary care, ED, and behavioral health.',
    whyUse: 'Brief validated severity screen guiding brief intervention vs specialty referral.',
    inputs: [
      yesNo('q1', '1. Have you used drugs other than those required for medical reasons?', 1, 'Past 12 months. Do not count alcohol (use AUDIT). Include nonmedical use of prescription drugs.'),
      yesNo('q2', '2. Do you abuse more than one drug at a time?', 1, 'Past 12 months. Alcohol excluded.'),
      yesNo('q3', '3. Not always able to stop using drugs when you want to? (original reverse item)', 1, 'Past 12 months. Yes = cannot always stop when they want to (original reverse-scored item; already oriented so Yes = 1).'),
      yesNo('q4', '4. Have you had blackouts or flashbacks as a result of drug use?', 1, 'Past 12 months.'),
      yesNo('q5', '5. Do you ever feel bad or guilty about your drug use?', 1, 'Past 12 months.'),
      yesNo('q6', '6. Does your spouse (or parents) ever complain about your involvement with drugs?', 1, 'Past 12 months.'),
      yesNo('q7', '7. Have you neglected your family because of your use of drugs?', 1, 'Past 12 months.'),
      yesNo('q8', '8. Have you engaged in illegal activities in order to obtain drugs?', 1, 'Past 12 months.'),
      yesNo('q9', '9. Have you ever experienced withdrawal symptoms when you stopped taking drugs?', 1, 'Past 12 months (or ever, as worded).'),
      yesNo('q10', '10. Have you had medical problems as a result of your drug use?', 1, 'Past 12 months. e.g. memory loss, hepatitis, jaundice, convulsions, bleeding, or other drug-related medical problems.'),
    ],
    calculate(values) {
      // Item 3 framed as problem endorsement (not always able to stop) so Yes = 1 matches reverse-scored original.
      const score = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].reduce(
        (s, i) => s + (bool(values[`q${i}`]) ? 1 : 0),
        0
      );
      const r = riskFromThresholds(score, [
        {
          max: 0,
          level: 'low',
          label: 'None reported',
          interpretation: 'DAST-10 = 0: no drug problems reported on screen.',
        },
        {
          max: 2,
          level: 'low',
          label: 'Low level',
          interpretation: 'DAST-10 1–2: low level — monitor and brief counseling.',
        },
        {
          max: 5,
          level: 'moderate',
          label: 'Moderate level',
          interpretation: 'DAST-10 3–5: moderate — further investigation and brief intervention.',
        },
        {
          max: 8,
          level: 'high',
          label: 'Substantial level',
          interpretation: 'DAST-10 6–8: substantial — intensive assessment and treatment planning.',
        },
        {
          max: 10,
          level: 'critical',
          label: 'Severe level',
          interpretation: 'DAST-10 9–10: severe — specialty substance use treatment recommended.',
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'Degree of problems', value: '0 none; 1–2 low; 3–5 moderate; 6–8 substantial; 9–10 severe' },
          {
            label: 'Item 3 note',
            value: 'Score 1 if patient is NOT always able to stop when wanting to (problem endorsement).',
          },
        ],
      };
    },
    evidence: {
      summary:
        'DAST-10: 10 yes/no items about drug use consequences (alcohol excluded). Score 0–10 with problem-degree bands: 0 none, 1–2 low, 3–5 moderate, 6–8 substantial, 9–10 severe. Item 3 reverse-scored in original forms.',
      formula: 'Sum of 10 items (0–10)',
      validation: 'Short form of DAST validated for drug use problem screening.',
      references: [
        {
          title: 'The Drug Abuse Screening Test',
          citation: 'Skinner HA. Addict Behav. 1982; Yudko E et al. reviews of DAST-10',
          year: 1982, pmid: '7183189',
          doi: '10.1016/0306-4603(82)90005-3', },
      ],
    },
    nextSteps: [
      {
        condition: 'Score ≥3',
        actions: ['Detailed substance history', 'SBIRT / motivational interviewing', 'Referral as severity increases', 'Infectious disease screening when indicated'],
      },
    ],
    pearls: [
      'Does not screen alcohol — use AUDIT/CAGE separately.',
      'Clarify prescribed controlled substances vs nonmedical use when counseling.',
    ],
  },
  {
    id: 'cage-aid',
    name: 'CAGE-AID Questionnaire',
    shortName: 'CAGE-AID',
    description: 'CAGE Adapted to Include Drugs — four-item screen for alcohol and/or drug problems.',
    category: 'psychiatry',
    tags: ['alcohol', 'drugs', 'cage', 'substance', 'screening'],
    whenToUse: 'Ultra-brief combined alcohol and drug problem screening in primary care and ED.',
    whyUse: 'Extends classic CAGE to substances other than alcohol with the same four stems.',
    inputs: [
      yesNo('c', 'Have you ever felt you should cut down on your drinking or drug use?', 1, 'Lifetime (ever). Includes alcohol and/or drugs. CAGE-AID is not limited to the past year.'),
      yesNo('a', 'Have people ever annoyed you by criticizing your drinking or drug use?', 1, 'Lifetime. Alcohol and/or drugs.'),
      yesNo('g', 'Have you ever felt bad or guilty about your drinking or drug use?', 1, 'Lifetime. Alcohol and/or drugs.'),
      yesNo('e', 'Have you ever used a drink or drug first thing in the morning to steady your nerves or get rid of a hangover?', 1, 'Lifetime eye-opener. Alcohol and/or drugs.'),
    ],
    calculate(values) {
      const score = ['c', 'a', 'g', 'e'].reduce((s, k) => s + (bool(values[k]) ? 1 : 0), 0);
      // CAGE-AID often uses ≥1 as positive (more sensitive) or ≥2 (more specific)
      if (score >= 2) {
        return {
          score,
          label: 'Positive screen (≥2)',
          interpretation:
            'CAGE-AID ≥2: positive for possible alcohol/drug problems — full substance assessment (AUDIT, DAST), counseling, and treatment offer.',
          riskLevel: 'high',
          details: [{ label: 'Alternate cutoff', value: '≥1 increases sensitivity; ≥2 increases specificity' }],
        };
      }
      if (score === 1) {
        return {
          score,
          label: 'Borderline (1) — sensitive cutoff positive',
          interpretation:
            'Single yes: positive if using sensitive ≥1 cutoff; may be false positive. Clarify substance type and proceed to AUDIT/DAST if concern remains.',
          riskLevel: 'moderate',
        };
      }
      return {
        score,
        label: 'Negative screen',
        interpretation: 'CAGE-AID 0: negative screen — not exclusionary if high clinical suspicion.',
        riskLevel: 'low',
      };
    },
    evidence: {
      summary:
        'CAGE-AID adapts CAGE items to drinking or drug use. Cutoffs of ≥1 (higher sensitivity) or ≥2 (higher specificity) are both used in primary care literature.',
      formula: 'Sum of 4 yes/no items (0–4)',
      validation: 'Adapted CAGE for combined alcohol/drug screening in ambulatory settings.',
      references: [
        {
          title: 'Conjoint screening questionnaires for alcohol and other drug abuse: criterion validity in a primary care practice',
          citation: 'Brown RL, Rounds LA. Wisconsin Med J. 1995; Ewing JA CAGE 1984',
          year: 1995, pmid: '7778330' },
      ],
    },
    nextSteps: [
      {
        condition: 'Score ≥1',
        actions: ['Detailed alcohol and drug history', 'AUDIT and/or DAST-10', 'Brief intervention', 'Referral to treatment when indicated'],
      },
    ],
    pearls: ['Ask about each substance class after a positive screen.', 'Less sensitive for low-level hazardous drinking than AUDIT.'],
  },
  {
    id: 'asrs-adhd',
    name: 'ASRS-v1.1 Adult ADHD Screen (Part A)',
    shortName: 'ASRS Part A',
    description: 'WHO Adult ADHD Self-Report Scale screener Part A (6 items) with shaded-box positive rules.',
    category: 'psychiatry',
    tags: ['adhd', 'asrs', 'attention', 'screening'],
    whenToUse: 'Adult ADHD screening in primary care or psychiatry intake.',
    whyUse: 'WHO/Harvard ASRS Part A is a validated 6-item screen; ≥4 shaded responses = positive.',
    inputs: [
      selectInput('q1', '1. How often do you have trouble wrapping up the final details of a project, once the challenging parts have been done?', [
        { label: 'Never (0)', value: 0, description: 'Not shaded for Q1–3' },
        { label: 'Rarely (1)', value: 1, description: 'Not shaded for Q1–3' },
        { label: 'Sometimes (2)', value: 2, description: 'Not shaded for Q1–3 (Q1–3 screen-positive only at Often/Very often)' },
        { label: 'Often (3)', value: 3, description: 'Shaded / screen-positive for Q1–3' },
        { label: 'Very often (4)', value: 4, description: 'Shaded / screen-positive for Q1–3' },
      ], 0, 'Rate the past 6 months. Official ASRS-v1.1 Part A. Q1–3 are screen-positive only at Often or Very often.'),
      selectInput('q2', '2. How often do you have difficulty getting things in order when you have to do a task that requires organization?', [
        { label: 'Never (0)', value: 0, description: 'Not shaded for Q1–3' },
        { label: 'Rarely (1)', value: 1, description: 'Not shaded for Q1–3' },
        { label: 'Sometimes (2)', value: 2, description: 'Not shaded for Q1–3' },
        { label: 'Often (3)', value: 3, description: 'Shaded / screen-positive for Q1–3' },
        { label: 'Very often (4)', value: 4, description: 'Shaded / screen-positive for Q1–3' },
      ], 0, 'Past 6 months. Q1–3 shaded at Often / Very often.'),
      selectInput('q3', '3. How often do you have problems remembering appointments or obligations?', [
        { label: 'Never (0)', value: 0, description: 'Not shaded for Q1–3' },
        { label: 'Rarely (1)', value: 1, description: 'Not shaded for Q1–3' },
        { label: 'Sometimes (2)', value: 2, description: 'Not shaded for Q1–3' },
        { label: 'Often (3)', value: 3, description: 'Shaded / screen-positive for Q1–3' },
        { label: 'Very often (4)', value: 4, description: 'Shaded / screen-positive for Q1–3' },
      ], 0, 'Past 6 months. Q1–3 shaded at Often / Very often.'),
      selectInput('q4', '4. When you have a task that requires a lot of thought, how often do you avoid or delay getting started?', [
        { label: 'Never (0)', value: 0, description: 'Not shaded for Q4–6' },
        { label: 'Rarely (1)', value: 1, description: 'Not shaded for Q4–6' },
        { label: 'Sometimes (2)', value: 2, description: 'Shaded / screen-positive for Q4–6' },
        { label: 'Often (3)', value: 3, description: 'Shaded / screen-positive for Q4–6' },
        { label: 'Very often (4)', value: 4, description: 'Shaded / screen-positive for Q4–6' },
      ], 0, 'Past 6 months. Q4–6 are screen-positive at Sometimes, Often, or Very often.'),
      selectInput('q5', '5. How often do you fidget or squirm with your hands or feet when you have to sit down for a long time?', [
        { label: 'Never (0)', value: 0, description: 'Not shaded for Q4–6' },
        { label: 'Rarely (1)', value: 1, description: 'Not shaded for Q4–6' },
        { label: 'Sometimes (2)', value: 2, description: 'Shaded / screen-positive for Q4–6' },
        { label: 'Often (3)', value: 3, description: 'Shaded / screen-positive for Q4–6' },
        { label: 'Very often (4)', value: 4, description: 'Shaded / screen-positive for Q4–6' },
      ], 0, 'Past 6 months. Q4–6 shaded at Sometimes / Often / Very often.'),
      selectInput('q6', '6. How often do you feel overly active and compelled to do things, like you were driven by a motor?', [
        { label: 'Never (0)', value: 0, description: 'Not shaded for Q4–6' },
        { label: 'Rarely (1)', value: 1, description: 'Not shaded for Q4–6' },
        { label: 'Sometimes (2)', value: 2, description: 'Shaded / screen-positive for Q4–6' },
        { label: 'Often (3)', value: 3, description: 'Shaded / screen-positive for Q4–6' },
        { label: 'Very often (4)', value: 4, description: 'Shaded / screen-positive for Q4–6' },
      ], 0, 'Past 6 months. Q4–6 shaded at Sometimes / Often / Very often. Positive screen = ≥4 shaded items (not raw sum).'),
    ],
    calculate(values) {
      const raw =
        num(values.q1) +
        num(values.q2) +
        num(values.q3) +
        num(values.q4) +
        num(values.q5) +
        num(values.q6);
      // Part A shaded boxes: items 1–3 positive if Often/Very often (3–4);
      // items 4–6 positive if Sometimes/Often/Very often (2–4)
      const shaded =
        (num(values.q1) >= 3 ? 1 : 0) +
        (num(values.q2) >= 3 ? 1 : 0) +
        (num(values.q3) >= 3 ? 1 : 0) +
        (num(values.q4) >= 2 ? 1 : 0) +
        (num(values.q5) >= 2 ? 1 : 0) +
        (num(values.q6) >= 2 ? 1 : 0);
      const positive = shaded >= 4;
      return {
        score: shaded,
        unit: 'shaded items',
        label: positive ? 'Positive screen (≥4 shaded)' : 'Negative screen (<4 shaded)',
        interpretation: positive
          ? `ASRS Part A positive (${shaded}/6 shaded responses; raw sum ${raw}/24). Further diagnostic evaluation for adult ADHD indicated — childhood history, differential (anxiety, sleep, substance, mood), and functional impairment.`
          : `ASRS Part A negative (${shaded}/6 shaded; raw sum ${raw}/24). ADHD not excluded if high clinical suspicion — consider full ASRS symptom checklist and clinical interview.`,
        riskLevel: positive ? 'high' : 'low',
        details: [
          { label: 'Shaded positives', value: `${shaded}/6 (cutoff ≥4)` },
          { label: 'Raw sum (0–24)', value: String(raw) },
          {
            label: 'Shading rule',
            value: 'Q1–3: Often/Very often; Q4–6: Sometimes/Often/Very often',
          },
        ],
      };
    },
    evidence: {
      summary:
        'ASRS-v1.1 Screener Part A: 6 items. Positive if ≥4 responses fall in the shaded frequency boxes (items 1–3: often/very often; items 4–6: sometimes or more).',
      formula: 'Count shaded responses (0–6); raw sum optional',
      validation: 'Developed with WHO; validated for adult ADHD screening in community and clinical samples.',
      references: [
        {
          title: 'The World Health Organization Adult ADHD Self-Report Scale (ASRS): a short screening scale for use in the general population',
          citation: 'Kessler RC et al. Psychol Med. 2005',
          year: 2005, pmid: '15841682',
          doi: '10.1017/s0033291704002892', },
      ],
    },
    nextSteps: [
      {
        condition: 'Positive screen',
        actions: [
          'Full clinical ADHD evaluation',
          'Screen mimics (sleep apnea, anxiety, depression, SUD)',
          'Collateral / childhood symptom history',
          'Consider Part B symptom inventory',
        ],
      },
    ],
    pearls: ['Screen ≠ diagnosis.', 'Stimulant decisions require full assessment and misuse risk evaluation.'],
  },
  {
    id: 'isi-insomnia',
    isQuestionnaire: true,
    questionnaire: {
      modeInputId: 'entryMode',
      directModeValues: ['direct'],
      directInputIds: ['score'],
    },
    name: 'Insomnia Severity Index (ISI)',
    shortName: 'ISI',
    description: 'Insomnia Severity Index (ISI) 7-item questionnaire and total (0–28) for insomnia severity.',
    category: 'psychiatry',
    tags: ['insomnia', 'sleep', 'isi', 'screening'],
    whenToUse: 'Quantify insomnia symptom severity and monitor treatment response; 7 items or direct score.',
    whyUse: 'Brief validated insomnia severity scale used in clinic and CBT-I research.',
    inputs: [
      selectInput('entryMode', 'Entry mode', [
        { label: 'Interactive 7-item questionnaire', value: 'survey' },
        { label: 'Direct score override', value: 'direct' },
      ], 'survey'),
      selectInput('isi1', '1. Difficulty falling asleep', [
        { label: '0 — None', value: 0 },
        { label: '1 — Mild', value: 1 },
        { label: '2 — Moderate', value: 2 },
        { label: '3 — Severe', value: 3 },
        { label: '4 — Very severe', value: 4 },
      ], 2),
      selectInput('isi2', '2. Difficulty staying asleep', [
        { label: '0 — None', value: 0 },
        { label: '1 — Mild', value: 1 },
        { label: '2 — Moderate', value: 2 },
        { label: '3 — Severe', value: 3 },
        { label: '4 — Very severe', value: 4 },
      ], 2),
      selectInput('isi3', '3. Problems waking up too early', [
        { label: '0 — None', value: 0 },
        { label: '1 — Mild', value: 1 },
        { label: '2 — Moderate', value: 2 },
        { label: '3 — Severe', value: 3 },
        { label: '4 — Very severe', value: 4 },
      ], 2),
      selectInput('isi4', '4. Satisfaction with current sleep pattern', [
        { label: '0 — Very satisfied', value: 0 },
        { label: '1 — Satisfied', value: 1 },
        { label: '2 — Moderately satisfied', value: 2 },
        { label: '3 — Dissatisfied', value: 3 },
        { label: '4 — Very dissatisfied', value: 4 },
      ], 2),
      selectInput('isi5', '5. Noticeability of sleep problem to others in terms of impairing quality of life', [
        { label: '0 — Not at all noticeable', value: 0 },
        { label: '1 — Barely noticeable', value: 1 },
        { label: '2 — Somewhat noticeable', value: 2 },
        { label: '3 — Much noticeable', value: 3 },
        { label: '4 — Very much noticeable', value: 4 },
      ], 1),
      selectInput('isi6', '6. Worried / distressed about current sleep problems', [
        { label: '0 — Not at all', value: 0 },
        { label: '1 — A little', value: 1 },
        { label: '2 — Somewhat', value: 2 },
        { label: '3 — Much', value: 3 },
        { label: '4 — Very much', value: 4 },
      ], 2),
      selectInput('isi7', '7. Interference with daily functioning (e.g. daytime fatigue, ability to function at work/chores)', [
        { label: '0 — Not at all', value: 0 },
        { label: '1 — A little', value: 1 },
        { label: '2 — Somewhat', value: 2 },
        { label: '3 — Much', value: 3 },
        { label: '4 — Very much', value: 4 },
      ], 1),
      numberInput('score', 'Direct ISI total override (0–28)', {
        min: 0,
        max: 28,
        exampleValue: 12,
        helpText: 'Enter official ISI total (0–28).',
      }),
    ],
    calculate(values) {
      const mode = String(values.entryMode ?? 'survey');
      let score: number;

      if (mode === 'direct' || (values.score !== undefined && values.entryMode === undefined && values.isi1 === undefined)) {
        score = Math.max(0, Math.min(28, num(values.score, 12)));
      } else {
        score =
          num(values.isi1, 2) +
          num(values.isi2, 2) +
          num(values.isi3, 2) +
          num(values.isi4, 2) +
          num(values.isi5, 1) +
          num(values.isi6, 2) +
          num(values.isi7, 1);
      }

      const r = riskFromThresholds(score, [
        {
          max: 7,
          level: 'normal',
          label: 'No clinically significant insomnia',
          interpretation: `ISI ${score}/28: no clinically significant insomnia.`,
        },
        {
          max: 14,
          level: 'low',
          label: 'Subthreshold insomnia',
          interpretation: `ISI ${score}/28: subthreshold insomnia — sleep hygiene and monitor; consider CBT-I if persistent bother.`,
        },
        {
          max: 21,
          level: 'moderate',
          label: 'Moderate clinical insomnia',
          interpretation: `ISI ${score}/28: moderate clinical insomnia — CBT-I first-line; evaluate contributing meds/conditions.`,
        },
        {
          max: 28,
          level: 'high',
          label: 'Severe clinical insomnia',
          interpretation: `ISI ${score}/28: severe clinical insomnia — structured treatment; screen mood, substances, OSA, RLS.`,
        },
      ]);
      return {
        score,
        unit: '/28',
        ...r,
        details: [
          { label: 'Entry mode', value: mode === 'direct' ? 'Direct override' : '7-item questionnaire' },
          { label: 'Bands', value: '0–7 none; 8–14 subthreshold; 15–21 moderate; 22–28 severe' },
        ],
      };
    },
    evidence: {
      summary:
        'ISI: 7 items (0–4), total 0–28. Bands: 0–7 no clinically significant insomnia, 8–14 subthreshold, 15–21 moderate, 22–28 severe.',
      formula: 'Sum of 7 items (0–4 each) = 0–28',
      validation: 'Validated insomnia severity measure (Morin et al.); sensitive to treatment change.',
      references: [
        {
          title: 'Validation of the Insomnia Severity Index as an outcome measure for insomnia research',
          citation: 'Bastien CH, Vallières A, Morin CM. Sleep Med. 2001',
          year: 2001, pmid: '11438246',
          doi: '10.1016/s1389-9457(00)00065-4', },
      ],
    },
    nextSteps: [
      {
        condition: 'ISI ≥15',
        actions: [
          'CBT-I referral / digital CBT-I',
          'Sleep schedule assessment',
          'Screen OSA (STOP-BANG), restless legs, mood/anxiety, substances',
          'Cautious, short-term hypnotics only when appropriate',
        ],
      },
    ],
    pearls: ['CBT-I is first-line for chronic insomnia.', 'Epworth measures sleepiness, not insomnia severity.'],
  },

  {
    id: 'pcl5',
    isQuestionnaire: true,
    questionnaire: {
      modeInputId: 'entryMode',
      directModeValues: ['direct'],
      directInputIds: ['score'],
    },
    name: 'PCL-5 PTSD Checklist for DSM-5',
    shortName: 'PCL-5',
    description: 'PTSD Checklist for DSM-5 (PCL-5) 20-item survey, total severity score (0–80), and DSM-5 cluster algorithm.',
    category: 'psychiatry',
    tags: ['ptsd', 'trauma', 'pcl-5', 'screening'],
    whenToUse: 'PTSD screening, provisional diagnosis, and symptom severity monitoring; 20 items or direct total.',
    whyUse: 'Gold standard public domain PTSD checklist from National Center for PTSD (VA). Aligns with DSM-5 criteria B–E.',
    inputs: [
      selectInput('entryMode', 'Entry mode', [
        { label: 'Interactive 20-item questionnaire', value: 'survey' },
        { label: 'Direct score override', value: 'direct' },
      ], 'survey'),
      selectInput('pcl_1', '1. Repeated, disturbing, and unwanted memories of the stressful experience', [
        { label: '0 — Not at all', value: 0 },
        { label: '1 — A little bit', value: 1 },
        { label: '2 — Moderately (symptom endorsed)', value: 2 },
        { label: '3 — Quite a bit (symptom endorsed)', value: 3 },
        { label: '4 — Extremely (symptom endorsed)', value: 4 },
      ], 2),
      selectInput('pcl_2', '2. Repeated, disturbing dreams of the stressful experience', [
        { label: '0 — Not at all', value: 0 },
        { label: '1 — A little bit', value: 1 },
        { label: '2 — Moderately (symptom endorsed)', value: 2 },
        { label: '3 — Quite a bit (symptom endorsed)', value: 3 },
        { label: '4 — Extremely (symptom endorsed)', value: 4 },
      ], 2),
      selectInput('pcl_3', '3. Suddenly feeling or acting as if the stressful experience were actually happening again', [
        { label: '0 — Not at all', value: 0 },
        { label: '1 — A little bit', value: 1 },
        { label: '2 — Moderately (symptom endorsed)', value: 2 },
        { label: '3 — Quite a bit (symptom endorsed)', value: 3 },
        { label: '4 — Extremely (symptom endorsed)', value: 4 },
      ], 2),
      selectInput('pcl_4', '4. Feeling very upset when something reminded you of the stressful experience', [
        { label: '0 — Not at all', value: 0 },
        { label: '1 — A little bit', value: 1 },
        { label: '2 — Moderately (symptom endorsed)', value: 2 },
        { label: '3 — Quite a bit (symptom endorsed)', value: 3 },
        { label: '4 — Extremely (symptom endorsed)', value: 4 },
      ], 2),
      selectInput('pcl_5', '5. Having strong physical reactions when something reminded you of the stressful experience (e.g., heart pounding, trouble breathing)', [
        { label: '0 — Not at all', value: 0 },
        { label: '1 — A little bit', value: 1 },
        { label: '2 — Moderately (symptom endorsed)', value: 2 },
        { label: '3 — Quite a bit (symptom endorsed)', value: 3 },
        { label: '4 — Extremely (symptom endorsed)', value: 4 },
      ], 2),
      selectInput('pcl_6', '6. Avoiding memories, thoughts, or feelings related to the stressful experience', [
        { label: '0 — Not at all', value: 0 },
        { label: '1 — A little bit', value: 1 },
        { label: '2 — Moderately (symptom endorsed)', value: 2 },
        { label: '3 — Quite a bit (symptom endorsed)', value: 3 },
        { label: '4 — Extremely (symptom endorsed)', value: 4 },
      ], 2),
      selectInput('pcl_7', '7. Avoiding external reminders (e.g. people, places, conversations, activities, objects, or situations)', [
        { label: '0 — Not at all', value: 0 },
        { label: '1 — A little bit', value: 1 },
        { label: '2 — Moderately (symptom endorsed)', value: 2 },
        { label: '3 — Quite a bit (symptom endorsed)', value: 3 },
        { label: '4 — Extremely (symptom endorsed)', value: 4 },
      ], 2),
      selectInput('pcl_8', '8. Trouble remembering important parts of the stressful experience', [
        { label: '0 — Not at all', value: 0 },
        { label: '1 — A little bit', value: 1 },
        { label: '2 — Moderately (symptom endorsed)', value: 2 },
        { label: '3 — Quite a bit (symptom endorsed)', value: 3 },
        { label: '4 — Extremely (symptom endorsed)', value: 4 },
      ], 2),
      selectInput('pcl_9', '9. Having strong negative beliefs about yourself, other people, or the world', [
        { label: '0 — Not at all', value: 0 },
        { label: '1 — A little bit', value: 1 },
        { label: '2 — Moderately (symptom endorsed)', value: 2 },
        { label: '3 — Quite a bit (symptom endorsed)', value: 3 },
        { label: '4 — Extremely (symptom endorsed)', value: 4 },
      ], 1),
      selectInput('pcl_10', '10. Blaming yourself or someone else for the stressful experience or what happened after it', [
        { label: '0 — Not at all', value: 0 },
        { label: '1 — A little bit', value: 1 },
        { label: '2 — Moderately (symptom endorsed)', value: 2 },
        { label: '3 — Quite a bit (symptom endorsed)', value: 3 },
        { label: '4 — Extremely (symptom endorsed)', value: 4 },
      ], 1),
      selectInput('pcl_11', '11. Having strong negative feelings such as fear, horror, anger, guilt, or shame', [
        { label: '0 — Not at all', value: 0 },
        { label: '1 — A little bit', value: 1 },
        { label: '2 — Moderately (symptom endorsed)', value: 2 },
        { label: '3 — Quite a bit (symptom endorsed)', value: 3 },
        { label: '4 — Extremely (symptom endorsed)', value: 4 },
      ], 1),
      selectInput('pcl_12', '12. Loss of interest in activities that you used to enjoy', [
        { label: '0 — Not at all', value: 0 },
        { label: '1 — A little bit', value: 1 },
        { label: '2 — Moderately (symptom endorsed)', value: 2 },
        { label: '3 — Quite a bit (symptom endorsed)', value: 3 },
        { label: '4 — Extremely (symptom endorsed)', value: 4 },
      ], 1),
      selectInput('pcl_13', '13. Feeling distant or cut off from other people', [
        { label: '0 — Not at all', value: 0 },
        { label: '1 — A little bit', value: 1 },
        { label: '2 — Moderately (symptom endorsed)', value: 2 },
        { label: '3 — Quite a bit (symptom endorsed)', value: 3 },
        { label: '4 — Extremely (symptom endorsed)', value: 4 },
      ], 1),
      selectInput('pcl_14', '14. Trouble experiencing positive feelings (e.g. being unable to feel happiness or love)', [
        { label: '0 — Not at all', value: 0 },
        { label: '1 — A little bit', value: 1 },
        { label: '2 — Moderately (symptom endorsed)', value: 2 },
        { label: '3 — Quite a bit (symptom endorsed)', value: 3 },
        { label: '4 — Extremely (symptom endorsed)', value: 4 },
      ], 1),
      selectInput('pcl_15', '15. Irritable behavior, angry outbursts, or acting aggressively', [
        { label: '0 — Not at all', value: 0 },
        { label: '1 — A little bit', value: 1 },
        { label: '2 — Moderately (symptom endorsed)', value: 2 },
        { label: '3 — Quite a bit (symptom endorsed)', value: 3 },
        { label: '4 — Extremely (symptom endorsed)', value: 4 },
      ], 1),
      selectInput('pcl_16', '16. Taking too many risks or doing things that could cause you harm', [
        { label: '0 — Not at all', value: 0 },
        { label: '1 — A little bit', value: 1 },
        { label: '2 — Moderately (symptom endorsed)', value: 2 },
        { label: '3 — Quite a bit (symptom endorsed)', value: 3 },
        { label: '4 — Extremely (symptom endorsed)', value: 4 },
      ], 1),
      selectInput('pcl_17', '17. Being “superalert” or watchful or on guard', [
        { label: '0 — Not at all', value: 0 },
        { label: '1 — A little bit', value: 1 },
        { label: '2 — Moderately (symptom endorsed)', value: 2 },
        { label: '3 — Quite a bit (symptom endorsed)', value: 3 },
        { label: '4 — Extremely (symptom endorsed)', value: 4 },
      ], 1),
      selectInput('pcl_18', '18. Feeling jumpy or easily startled', [
        { label: '0 — Not at all', value: 0 },
        { label: '1 — A little bit', value: 1 },
        { label: '2 — Moderately (symptom endorsed)', value: 2 },
        { label: '3 — Quite a bit (symptom endorsed)', value: 3 },
        { label: '4 — Extremely (symptom endorsed)', value: 4 },
      ], 1),
      selectInput('pcl_19', '19. Having difficulty concentrating', [
        { label: '0 — Not at all', value: 0 },
        { label: '1 — A little bit', value: 1 },
        { label: '2 — Moderately (symptom endorsed)', value: 2 },
        { label: '3 — Quite a bit (symptom endorsed)', value: 3 },
        { label: '4 — Extremely (symptom endorsed)', value: 4 },
      ], 1),
      selectInput('pcl_20', '20. Trouble falling or staying asleep', [
        { label: '0 — Not at all', value: 0 },
        { label: '1 — A little bit', value: 1 },
        { label: '2 — Moderately (symptom endorsed)', value: 2 },
        { label: '3 — Quite a bit (symptom endorsed)', value: 3 },
        { label: '4 — Extremely (symptom endorsed)', value: 4 },
      ], 1),
      numberInput('score', 'Direct PCL-5 total override (0–80)', {
        min: 0,
        max: 80,
        exampleValue: 30,
        helpText: 'Enter official PCL-5 total (0–80).',
      }),
    ],
    calculate(values) {
      const mode = String(values.entryMode ?? 'survey');
      let score: number;
      let clusterB = 0; // intrusion: items 1–5
      let clusterC = 0; // avoidance: items 6–7
      let clusterD = 0; // negative cognitions: items 8–14
      let clusterE = 0; // arousal: items 15–20

      if (mode === 'direct' || (values.score !== undefined && values.entryMode === undefined && values.pcl_1 === undefined)) {
        score = Math.max(0, Math.min(80, num(values.score, 30)));
      } else {
        score = 0;
        for (let i = 1; i <= 20; i++) {
          const val = num(values[`pcl_${i}`], 1);
          score += val;
          if (val >= 2) {
            if (i <= 5) clusterB += 1;
            else if (i <= 7) clusterC += 1;
            else if (i <= 14) clusterD += 1;
            else clusterE += 1;
          }
        }
      }

      const meetsAlgorithm = clusterB >= 1 && clusterC >= 1 && clusterD >= 2 && clusterE >= 2;

      const r = riskFromThresholds(score, [
        {
          max: 20,
          level: 'low',
          label: 'Lower symptom range',
          interpretation: `PCL-5 ${score}/80: in lower range — provisional PTSD less likely. Clinical interview still needed if trauma-related impairment exists.`,
        },
        {
          max: 30,
          level: 'moderate',
          label: 'Subthreshold / intermediate',
          interpretation: `PCL-5 ${score}/80: intermediate symptoms — subthreshold to common provisional cutoffs (~31–33); trauma-focused assessment may still be indicated.`,
        },
        {
          max: 49,
          level: 'high',
          label: 'Above common provisional cutoff',
          interpretation: `PCL-5 ${score}/80: exceeds provisional PTSD cutoff (≥31–33) — structured diagnostic interview (e.g. CAPS-5) and safety evaluation recommended.`,
        },
        {
          max: 80,
          level: 'critical',
          label: 'Severe PTSD symptom burden',
          interpretation: `PCL-5 ${score}/80: marked/severe PTSD symptom burden — prioritize access to trauma-focused psychotherapy (PE, CPT, EMDR), comorbidity, and safety.`,
        },
      ]);

      return {
        score,
        unit: '/80',
        ...r,
        details: [
          { label: 'Entry mode', value: mode === 'direct' ? 'Direct override' : '20-item DSM-5 questionnaire' },
          { label: 'Provisional cutoff (total)', value: score >= 31 ? '≥31 (Met ✓)' : '<31 (Not met)' },
          { label: 'DSM-5 Cluster criteria', value: mode === 'survey' ? (meetsAlgorithm ? 'Criteria met (≥1 B, ≥1 C, ≥2 D, ≥2 E ✓)' : 'Incomplete') : 'Available via survey mode' },
          { label: 'Intrusions (Cluster B, ≥1 req)', value: mode === 'survey' ? `${clusterB}/5` : 'N/A' },
          { label: 'Avoidance (Cluster C, ≥1 req)', value: mode === 'survey' ? `${clusterC}/2` : 'N/A' },
          { label: 'Negative mood (Cluster D, ≥2 req)', value: mode === 'survey' ? `${clusterD}/7` : 'N/A' },
          { label: 'Arousal (Cluster E, ≥2 req)', value: mode === 'survey' ? `${clusterE}/6` : 'N/A' },
        ],
      };
    },
    evidence: {
      summary:
        'PCL-5: 20 DSM-5 PTSD symptoms rated 0–4 (total 0–80). Public domain instrument developed by the National Center for PTSD (US VA). Cutoff 31–33 indicates provisional PTSD; cluster algorithm: ≥1 B, ≥1 C, ≥2 D, ≥2 E items rated ≥2.',
      formula: 'Sum of 20 items (0–4 each) = 0–80',
      validation: 'National Center for PTSD recommended measure; strong psychometrics vs CAPS-5.',
      references: [
        {
          title: 'The Posttraumatic Stress Disorder Checklist for DSM-5 (PCL-5): Development and Initial Psychometric Evaluation',
          citation: 'Blevins CA et al. J Trauma Stress. 2015',
          year: 2015, pmid: '26606250',
          doi: '10.1002/jts.22059', },
      ],
    },
    nextSteps: [
      {
        condition: 'Score ≥31 or clinical concern',
        actions: [
          'Structured diagnostic assessment for PTSD',
          'Suicide and safety evaluation',
          'Trauma-focused psychotherapy (PE, CPT, EMDR per guidelines)',
          'Screen depression, substance use, TBI history',
        ],
      },
    ],
    pearls: [
      'PCL-5 is in the public domain with zero copyright restrictions.',
      'A symptom is clinically endorsed if rated ≥2 (Moderately).',
    ],
  },
];
