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
      selectInput('q1', '1. When you have headaches, how often is the pain severe?', hit6Opts),
      selectInput('q2', '2. How often do headaches limit your usual daily activities?', hit6Opts),
      selectInput('q3', '3. When you have a headache, how often do you wish you could lie down?', hit6Opts),
      selectInput('q4', '4. In the past 4 weeks, how often have you felt too tired to do work/daily activities because of headaches?', hit6Opts),
      selectInput('q5', '5. In the past 4 weeks, how often have you felt fed up or irritated because of headaches?', hit6Opts),
      selectInput('q6', '6. In the past 4 weeks, how often did headaches limit your ability to concentrate on work/daily activities?', hit6Opts),
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
      numberInput('q1', '1. Days missed work/school due to headache (3 mo)', {
        min: 0,
        max: 90,
        defaultValue: 0,
        helpText: 'Full days of missed work or school',
      }),
      numberInput('q2', '2. Days productivity ≤50% at work/school (exclude Q1 days)', {
        min: 0,
        max: 90,
        defaultValue: 0,
      }),
      numberInput('q3', '3. Days no household work due to headache', { min: 0, max: 90, defaultValue: 0 }),
      numberInput('q4', '4. Days household productivity ≤50% (exclude Q3 days)', {
        min: 0,
        max: 90,
        defaultValue: 0,
      }),
      numberInput('q5', '5. Days missed family/social/leisure activities', { min: 0, max: 90, defaultValue: 0 }),
      numberInput('freq', 'A. Headache days in past 3 months (optional)', {
        min: 0,
        max: 90,
        defaultValue: 0,
        helpText: 'Not part of MIDAS sum; for context',
        required: false,
      }),
      numberInput('pain', 'B. Average pain intensity 0–10 (optional)', {
        min: 0,
        max: 10,
        step: 1,
        defaultValue: 0,
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
          citation: 'Stewart WF et al. Cephalalgia. 1999; Lipton RB et al. Neurology. 2001',
          year: 1999, pmid: '11294956',
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
        { label: '<5 attacks', value: 0 },
        { label: '≥5 attacks', value: 1 },
      ]),
      selectInput('duration', 'B. Untreated/unsuccessfully treated duration 4–72 h', [
        { label: 'No', value: 0 },
        { label: 'Yes', value: 1 },
      ]),
      yesNo('unilateral', 'C1. Unilateral location', 0),
      yesNo('pulsating', 'C2. Pulsating quality', 0),
      yesNo('moderateSevere', 'C3. Moderate or severe pain intensity', 0),
      yesNo('aggravation', 'C4. Aggravation by / causing avoidance of routine physical activity', 0),
      yesNo('nausea', 'D1. Nausea and/or vomiting'),
      yesNo('photoPhono', 'D2. Photophobia and phonophobia'),
      yesNo('notBetter', 'E. Not better accounted for by another ICHD-3 diagnosis'),
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
      ]),
      numberInput('duration', 'Continuous / recurrent seizure duration', {
        unit: 'min',
        min: 0,
        max: 300,
        step: 1,
        defaultValue: 5,
        helpText: 'Time of ongoing seizure activity or incomplete recovery between seizures',
      }),
      yesNo('recurrent', 'Seizures recur without recovery between (operational SE if past t1)', 0),
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

      const pastT1 = duration >= t1 || bool(values.recurrent);
      const pastT2 = type === 'absence' ? duration >= 30 : duration >= t2;

      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
      let label = 'Below t1 — treat aggressively if ongoing';
      let interpretation = `Duration ${duration} min for ${typeLabel}. Operational t1=${t1} min (SE diagnosis / time when treatment should usually be started). t2=${
        type === 'absence' ? 'less well defined' : `${t2} min`
      } (long-term consequence risk rises).`;

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
        defaultValue: 10,
      }),
      yesNo('toxicSx', 'Clinical toxicity symptoms present', 0),
      yesNo('breakthrough', 'Breakthrough seizures / inadequate control', 0),
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
        defaultValue: 10,
      }),
      numberInput('alb', 'Serum albumin', {
        unit: 'g/dL',
        min: 1,
        max: 5.5,
        step: 0.1,
        defaultValue: 2.5,
      }),
      yesNo('esrd', 'ESRD / CrCl <20 mL/min (use 0.1 binding factor variant)', 0),
      yesNo('toxicSx', 'Clinical phenytoin toxicity symptoms', 0),
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
          title: 'The clinical pharmacokinetics of phenytoin',
          citation: 'Martin E, Tozer TN et al. J Pharmacokinet Biopharm. 1977',
          year: 1977, pmid: '599408',
          doi: '10.1007/BF01059685', },
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
        defaultValue: 20,
        helpText: 'Official MDS-UPDRS Part III maximum is 132',
      }),
      selectInput('state', 'Motor state when scored', [
        { label: 'ON medication', value: 'on' },
        { label: 'OFF medication', value: 'off' },
        { label: 'Not specified', value: 'na' },
      ]),
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
        { label: '0 — No signs of disease', value: 0 },
        { label: '1 — Unilateral involvement only', value: 1 },
        { label: '1.5 — Unilateral and axial involvement (modified)', value: 1.5 },
        { label: '2 — Bilateral without balance impairment', value: 2 },
        { label: '2.5 — Mild bilateral; recovery on pull test (modified)', value: 2.5 },
        { label: '3 — Bilateral; postural instability; physically independent', value: 3 },
        { label: '4 — Severe disability; still able to walk/stand unassisted', value: 4 },
        { label: '5 — Wheelchair bound or bedridden unless aided', value: 5 },
      ]),
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
    pearls: ['Pull test defines postural instability for stage 3.', 'Stage does not capture non-motor burden.'],
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
        { label: '0 — Normal neurologic exam', value: 0 },
        { label: '1.0 — No disability; minimal signs in one FS', value: 1 },
        { label: '1.5 — No disability; minimal signs in >1 FS', value: 1.5 },
        { label: '2.0 — Minimal disability in one FS', value: 2 },
        { label: '2.5 — Mild disability in one FS or minimal in two', value: 2.5 },
        { label: '3.0 — Moderate disability; fully ambulatory', value: 3 },
        { label: '3.5 — Moderate disability in several FS; fully ambulatory', value: 3.5 },
        { label: '4.0 — Ambulatory without aid ≥500 m; significant disability', value: 4 },
        { label: '4.5 — Ambulatory without aid ≥300 m; some limitation of activity', value: 4.5 },
        { label: '5.0 — Ambulatory without aid ≥200 m; disability impairs daily activity', value: 5 },
        { label: '5.5 — Ambulatory without aid ≥100 m', value: 5.5 },
        { label: '6.0 — Unilateral assistance required to walk 100 m', value: 6 },
        { label: '6.5 — Constant bilateral assistance to walk 20 m', value: 6.5 },
        { label: '7.0 — Unable to walk >5 m even with aid; wheelchair', value: 7 },
        { label: '7.5 — Unable to take more than a few steps; wheel self', value: 7.5 },
        { label: '8.0 — Restricted to bed/chair; retains self-care functions', value: 8 },
        { label: '8.5 — Restricted to bed much of day; some self-care', value: 8.5 },
        { label: '9.0 — Helpless bed patient; can communicate/eat', value: 9 },
        { label: '9.5 — Unable to communicate or eat/swallow', value: 9.5 },
        { label: '10 — Death due to MS', value: 10 },
      ]),
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
      yesNo('q1', '1. Pain has burning quality?', 1),
      yesNo('q2', '2. Painful cold sensation?', 1),
      yesNo('q3', '3. Electric shocks?', 1),
      yesNo('q4', '4. Tingling?', 1),
      yesNo('q5', '5. Pins and needles?', 1),
      yesNo('q6', '6. Numbness?', 1),
      yesNo('q7', '7. Itching?', 1),
      yesNo('q8', '8. Hypoesthesia to touch in pain area?', 1),
      yesNo('q9', '9. Hypoesthesia to pinprick in pain area?', 1),
      yesNo('q10', '10. Brushing elicits or increases pain (allodynia)?', 1),
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
          title: 'Development and validation of the Neuropathic Pain Symptom Inventory and DN4',
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
    name: 'SLUMS Cognitive Score',
    shortName: 'SLUMS',
    description: 'Saint Louis University Mental Status exam total interpreter (0–30) with education-adjusted bands.',
    category: 'neurology',
    tags: ['cognition', 'dementia', 'slums', 'mci'],
    whenToUse: 'Interpret an already-administered SLUMS total for MCI vs dementia ranges.',
    whyUse: 'Free, sensitive cognitive screen with education-specific cutoffs used widely in VA/geriatrics.',
    inputs: [
      numberInput('score', 'SLUMS total score', { min: 0, max: 30, defaultValue: 27 }),
      selectInput('education', 'Education', [
        { label: 'High school graduate or higher', value: 'hs' },
        { label: 'Less than high school', value: 'less' },
      ]),
    ],
    calculate(values) {
      const score = num(values.score, 27);
      const hs = String(values.education || 'hs') === 'hs';
      // HS+: normal 27–30, MNCD 21–26, dementia 1–20
      // <HS: normal 25–30, MNCD 20–24, dementia 1–19
      let label: string;
      let riskLevel: 'normal' | 'moderate' | 'high';
      let interpretation: string;
      if (hs) {
        if (score >= 27) {
          label = 'Normal (HS+)';
          riskLevel = 'normal';
          interpretation = 'SLUMS 27–30 with ≥HS education: normal range on this screen.';
        } else if (score >= 21) {
          label = 'MNCD / MCI range (HS+)';
          riskLevel = 'moderate';
          interpretation = 'SLUMS 21–26 (≥HS): mild neurocognitive disorder range — further evaluation for MCI.';
        } else {
          label = 'Dementia range (HS+)';
          riskLevel = 'high';
          interpretation = 'SLUMS 1–20 (≥HS): dementia range — comprehensive workup and safety assessment.';
        }
      } else if (score >= 25) {
        label = 'Normal (<HS)';
        riskLevel = 'normal';
        interpretation = 'SLUMS 25–30 with <HS education: normal range on this screen.';
      } else if (score >= 20) {
        label = 'MNCD / MCI range (<HS)';
        riskLevel = 'moderate';
        interpretation = 'SLUMS 20–24 (<HS): mild neurocognitive disorder range.';
      } else {
        label = 'Dementia range (<HS)';
        riskLevel = 'high';
        interpretation = 'SLUMS ≤19 (<HS): dementia range — full evaluation.';
      }
      return {
        score,
        label,
        interpretation,
        riskLevel,
        details: [
          {
            label: 'Education cutoffs used',
            value: hs
              ? 'HS+: normal 27–30; MNCD 21–26; dementia ≤20'
              : '<HS: normal 25–30; MNCD 20–24; dementia ≤19',
          },
        ],
      };
    },
    evidence: {
      summary:
        'SLUMS scores 0–30. Education-adjusted: ≥HS education normal 27–30, MNCD 21–26, dementia ≤20; <HS normal 25–30, MNCD 20–24, dementia ≤19.',
      formula: 'Enter total 0–30; apply education band',
      validation: 'Developed/validated at SLU; sensitive for MCI compared with MMSE in some cohorts.',
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
        condition: 'MNCD or dementia range',
        actions: [
          'History from informant (ADL/IADL)',
          'Labs: B12, TSH, metabolic panel',
          'Imaging as indicated',
          'Medication review; depression screen',
        ],
      },
    ],
    pearls: ['Always adjust interpretation for education.', 'Not a substitute for neuropsychological testing.'],
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
        { label: '5 — Perfect clock (circle, numbers, hands correct)', value: 5 },
        { label: '4 — Minor visuospatial errors', value: 4 },
        { label: '3 — Inaccurate representation of time / moderate errors', value: 3 },
        { label: '2 — Moderate visuospatial disorganization of numbers', value: 2 },
        { label: '1 — Severe disorganization; numbers missing/wrong', value: 1 },
        { label: '0 — No reasonable representation of a clock', value: 0 },
      ], 5, 'Shulman-style 0–5 scoring example; other scales (0–10, Watson) exist'),
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
    pearls: ['Specify time setting used (e.g., 11:10) for hand placement scoring.', 'Education and motor impairment affect performance.'],
  },
  {
    id: 'madrs',
    name: 'MADRS Depression Score',
    shortName: 'MADRS',
    description: 'Montgomery–Åsberg Depression Rating Scale total interpreter (0–60).',
    category: 'psychiatry',
    tags: ['depression', 'madrs', 'severity', 'rating scale'],
    whenToUse: 'Clinician-rated depression severity monitoring (enter total after MADRS administration).',
    whyUse: 'Sensitive to change in antidepressant trials; standard severity bands for treatment response.',
    inputs: [
      numberInput('score', 'MADRS total (0–60)', {
        min: 0,
        max: 60,
        defaultValue: 20,
        helpText: '10 items scored 0–6 each',
      }),
    ],
    calculate(values) {
      const score = num(values.score, 20);
      const r = riskFromThresholds(score, [
        {
          max: 6,
          level: 'normal',
          label: 'Recovered / absent symptoms',
          interpretation: 'MADRS 0–6: symptoms absent or recovered range in many studies.',
        },
        {
          max: 19,
          level: 'low',
          label: 'Mild depression',
          interpretation: 'MADRS 7–19: mild depressive symptoms — psychotherapy ± meds based on function and history.',
        },
        {
          max: 34,
          level: 'moderate',
          label: 'Moderate depression',
          interpretation: 'MADRS 20–34: moderate depression — active treatment indicated; monitor response.',
        },
        {
          max: 60,
          level: 'high',
          label: 'Severe depression',
          interpretation: 'MADRS ≥35: severe depression — intensive treatment; assess psychosis, suicidality, need for higher level of care.',
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'Common bands', value: '0–6 recovered; 7–19 mild; 20–34 moderate; ≥35 severe' },
          { label: 'Response / remission (trials)', value: 'Often ≥50% reduction = response; ≤10 (sometimes ≤6) = remission' },
        ],
      };
    },
    evidence: {
      summary:
        'MADRS: 10 clinician-rated items (0–6), total 0–60. Common severity: 0–6 recovered, 7–19 mild, 20–34 moderate, ≥35 severe (bands vary slightly by study).',
      formula: 'Enter total 0–60',
      validation: 'Widely used in antidepressant RCTs; good sensitivity to change.',
      references: [
        {
          title: 'A new depression scale designed to be sensitive to change (MADRS)',
          citation: 'Montgomery SA, Åsberg M. Br J Psychiatry. 1979',
          year: 1979, pmid: '444788',
          doi: '10.1192/bjp.134.4.382', },
      ],
    },
    nextSteps: [
      {
        condition: 'Moderate–severe',
        actions: ['Safety/suicide assessment', 'Antidepressant and/or evidence-based psychotherapy', 'Follow serial MADRS'],
      },
    ],
    pearls: ['Not a diagnostic interview by itself.', 'Apparent sadness and reported sadness are separate items.'],
  },
  {
    id: 'ham-d',
    name: 'HAM-D Depression Score',
    shortName: 'HAM-D',
    description: 'Hamilton Depression Rating Scale total interpreter (typically 17-item, enter total).',
    category: 'psychiatry',
    tags: ['depression', 'hamilton', 'ham-d', 'hdrs'],
    whenToUse: 'Interpret clinician-administered HAM-D/HDRS total for severity monitoring.',
    whyUse: 'Classic depression severity scale in research and specialty care.',
    inputs: [
      numberInput('score', 'HAM-D total', {
        min: 0,
        max: 52,
        defaultValue: 12,
        helpText: 'Usually 17-item total (range varies by version)',
      }),
      selectInput('version', 'Version (for context)', [
        { label: '17-item (most common)', value: '17' },
        { label: '21-item', value: '21' },
        { label: 'Other / unspecified', value: 'other' },
      ]),
    ],
    calculate(values) {
      const score = num(values.score, 12);
      const r = riskFromThresholds(score, [
        {
          max: 7,
          level: 'normal',
          label: 'Normal / remission range',
          interpretation: 'HAM-D ≤7: normal or remission range on 17-item scale for many protocols.',
        },
        {
          max: 13,
          level: 'low',
          label: 'Mild depression',
          interpretation: 'HAM-D 8–13: mild depressive symptoms.',
        },
        {
          max: 18,
          level: 'moderate',
          label: 'Moderate depression',
          interpretation: 'HAM-D 14–18: moderate depression — treatment indicated.',
        },
        {
          max: 22,
          level: 'high',
          label: 'Severe depression',
          interpretation: 'HAM-D 19–22: severe depression — active multimodal treatment; safety assessment.',
        },
        {
          max: 52,
          level: 'critical',
          label: 'Very severe depression',
          interpretation: 'HAM-D ≥23: very severe — consider higher level of care, psychosis screen, suicide risk.',
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'Version noted', value: String(values.version || '17') },
          { label: '17-item bands (common)', value: '≤7 normal; 8–13 mild; 14–18 moderate; 19–22 severe; ≥23 very severe' },
        ],
      };
    },
    evidence: {
      summary:
        'Hamilton Depression Rating Scale (HDRS/HAM-D). Common 17-item severity: ≤7 normal, 8–13 mild, 14–18 moderate, 19–22 severe, ≥23 very severe (APA/handbook conventions vary slightly).',
      formula: 'Enter administered total',
      validation: 'Historic gold-standard clinician depression scale; MADRS often preferred for sensitivity to change.',
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
    pearls: ['Heavy somatic item loading — interpret cautiously in medical illness.', 'Specify which HAM-D version was used.'],
  },
  {
    id: 'ham-a',
    name: 'HAM-A Anxiety Score',
    shortName: 'HAM-A',
    description: 'Hamilton Anxiety Rating Scale total interpreter (0–56).',
    category: 'psychiatry',
    tags: ['anxiety', 'hamilton', 'ham-a', 'severity'],
    whenToUse: 'Clinician-rated anxiety severity after HAM-A administration.',
    whyUse: 'Classic anxiety severity scale for monitoring treatment response.',
    inputs: [
      numberInput('score', 'HAM-A total (0–56)', {
        min: 0,
        max: 56,
        defaultValue: 18,
        helpText: '14 items scored 0–4',
      }),
    ],
    calculate(values) {
      const score = num(values.score, 18);
      const r = riskFromThresholds(score, [
        {
          max: 17,
          level: 'low',
          label: 'Mild anxiety',
          interpretation: 'HAM-A ≤17: mild anxiety severity range.',
        },
        {
          max: 24,
          level: 'moderate',
          label: 'Mild to moderate anxiety',
          interpretation: 'HAM-A 18–24: mild to moderate anxiety — consider therapy ± medication.',
        },
        {
          max: 30,
          level: 'high',
          label: 'Moderate to severe anxiety',
          interpretation: 'HAM-A 25–30: moderate to severe anxiety — active treatment recommended.',
        },
        {
          max: 56,
          level: 'critical',
          label: 'Severe anxiety',
          interpretation: 'HAM-A >30: severe anxiety — intensive management; rule out medical contributors.',
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'Common bands', value: '≤17 mild; 18–24 mild–moderate; 25–30 moderate–severe; >30 severe' },
        ],
      };
    },
    evidence: {
      summary:
        'HAM-A: 14 items (0–4), total 0–56. Common cutoffs: ≤17 mild, 18–24 mild–moderate, 25–30 moderate–severe, >30 severe.',
      formula: 'Enter total 0–56',
      validation: 'Longstanding clinician anxiety scale used in anxiolytic trials.',
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
    pearls: ['Somatic items may elevate scores in medical disease.', 'GAD-7 is a practical patient-report alternative for screening.'],
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
        defaultValue: 16,
        helpText: '21 items scored 0–3',
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
        defaultValue: 18,
        helpText: '21 items scored 0–3',
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
          title: 'Beck Depression Inventory–II Manual',
          citation: 'Beck AT, Steer RA, Brown GK. BDI-II Manual. Psychological Corporation. 1996',
          year: 1996, url: 'https://www.pearsonassessments.com/store/usassessments/en/Store/Professional-Assessments/Personality-%26-Biopsychosocial/Beck-Depression-Inventory-II/p/100000159.html' },
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
    name: 'Young Mania Rating Scale (YMRS)',
    shortName: 'YMRS',
    description: 'Young Mania Rating Scale total interpreter (0–60) for manic symptom severity.',
    category: 'psychiatry',
    tags: ['mania', 'bipolar', 'ymrs', 'rating scale'],
    whenToUse: 'Clinician-rated mania severity after YMRS administration (enter total).',
    whyUse: 'Standard mania severity outcome in bipolar research and inpatient monitoring.',
    inputs: [
      numberInput('score', 'YMRS total (0–60)', {
        min: 0,
        max: 60,
        defaultValue: 12,
        helpText: '11 items; some double-weighted (0–8)',
      }),
    ],
    calculate(values) {
      const score = num(values.score, 12);
      const r = riskFromThresholds(score, [
        {
          max: 12,
          level: 'low',
          label: 'Euthymia / minimal mania',
          interpretation: 'YMRS ≤12: often used as remission / minimal manic symptoms range in trials (cutoffs vary; ≤7–12 common).',
        },
        {
          max: 19,
          level: 'moderate',
          label: 'Mild mania / hypomania range',
          interpretation: 'YMRS 13–19: mild manic symptoms / hypomania range — close follow-up, optimize mood stabilizer.',
        },
        {
          max: 25,
          level: 'high',
          label: 'Moderate mania',
          interpretation: 'YMRS 20–25: moderate mania — active treatment; assess insight, sleep, and risk behaviors.',
        },
        {
          max: 60,
          level: 'critical',
          label: 'Severe mania',
          interpretation: 'YMRS ≥26: severe mania — consider hospitalization, safety, antimanic regimen, rule out mixed features/psychosis.',
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'Pragmatic bands', value: '≤12 minimal/remission; 13–19 mild; 20–25 moderate; ≥26 severe' },
          { label: 'Response (trials)', value: 'Often ≥50% reduction from baseline' },
        ],
      };
    },
    evidence: {
      summary:
        'YMRS: 11 clinician items (some scored 0–8), total 0–60. Severity bands vary; ≤12 often remission, higher scores indicate increasing mania severity.',
      formula: 'Enter total 0–60',
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
        actions: [
          'Mood stabilizer / antimanic optimization',
          'Sleep restoration',
          'Substance and medical workup',
          'Safety and hospitalization threshold assessment',
        ],
      },
    ],
    pearls: ['Irritability and disruptive-aggressive items are double-weighted.', 'Not a diagnostic tool for bipolar disorder alone.'],
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
        defaultValue: 75,
        helpText: '30 items × 1–7; minimum total 30',
      }),
      numberInput('positive', 'Positive subscale (optional, 7–49)', {
        min: 7,
        max: 49,
        defaultValue: 7,
        required: false,
      }),
      numberInput('negative', 'Negative subscale (optional, 7–49)', {
        min: 7,
        max: 49,
        defaultValue: 7,
        required: false,
      }),
      numberInput('general', 'General psychopathology (optional, 16–112)', {
        min: 16,
        max: 112,
        defaultValue: 16,
        required: false,
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
          citation: 'Kay SR et al. Schizophr Bull. 1987; Leucht S et al. linking analyses',
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
      ]),
      selectInput('q2', '2. How many standard drinks on a typical drinking day?', [
        { label: '1–2 (0)', value: 0 },
        { label: '3–4 (1)', value: 1 },
        { label: '5–6 (2)', value: 2 },
        { label: '7–9 (3)', value: 3 },
        { label: '10 or more (4)', value: 4 },
      ]),
      selectInput('q3', '3. How often ≥6 drinks on one occasion?', auditFreq),
      selectInput('q4', '4. How often unable to stop drinking once started (past year)?', auditFreq),
      selectInput('q5', '5. How often failed to do what was normally expected because of drinking?', auditFreq),
      selectInput('q6', '6. How often needed a first drink in the morning?', auditFreq),
      selectInput('q7', '7. How often guilt or remorse after drinking?', auditFreq),
      selectInput('q8', '8. How often unable to remember night before because of drinking?', auditFreq),
      selectInput('q9', '9. Injured you or someone else because of drinking?', [
        { label: 'No (0)', value: 0 },
        { label: 'Yes, but not in the last year (2)', value: 2 },
        { label: 'Yes, during the last year (4)', value: 4 },
      ]),
      selectInput('q10', '10. Relative/friend/doctor concerned or suggested cut down?', [
        { label: 'No (0)', value: 0 },
        { label: 'Yes, but not in the last year (2)', value: 2 },
        { label: 'Yes, during the last year (4)', value: 4 },
      ]),
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
          title: 'The Alcohol Use Disorders Identification Test: Guidelines for Use in Primary Care',
          citation: 'Babor TF et al. WHO. 2001 (2nd ed.)',
          year: 2001, url: 'https://www.who.int/publications/i/item/WHO-MSD-MSB-01.6a' },
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
      yesNo('q1', '1. Have you used drugs other than those required for medical reasons?', 1),
      yesNo('q2', '2. Do you abuse more than one drug at a time?', 1),
      yesNo('q3', '3. Not always able to stop using drugs when you want to? (original reverse item)', 1),
      yesNo('q4', '4. Have you had blackouts or flashbacks as a result of drug use?', 1),
      yesNo('q5', '5. Do you ever feel bad or guilty about your drug use?', 1),
      yesNo('q6', '6. Does your spouse (or parents) ever complain about your involvement with drugs?', 1),
      yesNo('q7', '7. Have you neglected your family because of your use of drugs?', 1),
      yesNo('q8', '8. Have you engaged in illegal activities in order to obtain drugs?', 1),
      yesNo('q9', '9. Have you ever experienced withdrawal symptoms when you stopped taking drugs?', 1),
      yesNo('q10', '10. Have you had medical problems as a result of your drug use?', 1),
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
      yesNo('c', 'Cut down: felt you should cut down on drinking or drug use?', 1),
      yesNo('a', 'Annoyed: people annoyed you by criticizing your drinking or drug use?', 1),
      yesNo('g', 'Guilty: felt bad or guilty about drinking or drug use?', 1),
      yesNo('e', 'Eye-opener: used drink or drug first thing in the morning to steady nerves or get rid of hangover?', 1),
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
      selectInput('q1', '1. Trouble wrapping up final details of a project once challenging parts done', [
        { label: 'Never (0)', value: 0 },
        { label: 'Rarely (1)', value: 1 },
        { label: 'Sometimes (2)', value: 2 },
        { label: 'Often (3)', value: 3 },
        { label: 'Very often (4)', value: 4 },
      ]),
      selectInput('q2', '2. Difficulty getting things in order when a task requires organization', [
        { label: 'Never (0)', value: 0 },
        { label: 'Rarely (1)', value: 1 },
        { label: 'Sometimes (2)', value: 2 },
        { label: 'Often (3)', value: 3 },
        { label: 'Very often (4)', value: 4 },
      ]),
      selectInput('q3', '3. Problems remembering appointments or obligations', [
        { label: 'Never (0)', value: 0 },
        { label: 'Rarely (1)', value: 1 },
        { label: 'Sometimes (2)', value: 2 },
        { label: 'Often (3)', value: 3 },
        { label: 'Very often (4)', value: 4 },
      ]),
      selectInput('q4', '4. Avoid or delay starting tasks requiring a lot of thought', [
        { label: 'Never (0)', value: 0 },
        { label: 'Rarely (1)', value: 1 },
        { label: 'Sometimes (2)', value: 2 },
        { label: 'Often (3)', value: 3 },
        { label: 'Very often (4)', value: 4 },
      ]),
      selectInput('q5', '5. Fidget or squirm with hands/feet when sitting long', [
        { label: 'Never (0)', value: 0 },
        { label: 'Rarely (1)', value: 1 },
        { label: 'Sometimes (2)', value: 2 },
        { label: 'Often (3)', value: 3 },
        { label: 'Very often (4)', value: 4 },
      ]),
      selectInput('q6', '6. Feel overly active and compelled to do things, like driven by a motor', [
        { label: 'Never (0)', value: 0 },
        { label: 'Rarely (1)', value: 1 },
        { label: 'Sometimes (2)', value: 2 },
        { label: 'Often (3)', value: 3 },
        { label: 'Very often (4)', value: 4 },
      ]),
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
          year: 2005, pmid: '15841682' },
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
    name: 'Insomnia Severity Index (ISI)',
    shortName: 'ISI',
    description: 'Insomnia Severity Index total interpreter (0–28) for insomnia symptom severity.',
    category: 'psychiatry',
    tags: ['insomnia', 'sleep', 'isi', 'screening'],
    whenToUse: 'Quantify insomnia severity and treatment response (enter total after ISI).',
    whyUse: 'Brief validated insomnia severity scale used in clinic and CBT-I research.',
    inputs: [
      numberInput('score', 'ISI total (0–28)', {
        min: 0,
        max: 28,
        defaultValue: 12,
        helpText: '7 items scored 0–4',
      }),
    ],
    calculate(values) {
      const score = num(values.score, 12);
      const r = riskFromThresholds(score, [
        {
          max: 7,
          level: 'normal',
          label: 'No clinically significant insomnia',
          interpretation: 'ISI 0–7: no clinically significant insomnia.',
        },
        {
          max: 14,
          level: 'low',
          label: 'Subthreshold insomnia',
          interpretation: 'ISI 8–14: subthreshold insomnia — sleep hygiene and monitor; CBT-I if persistent bother.',
        },
        {
          max: 21,
          level: 'moderate',
          label: 'Moderate clinical insomnia',
          interpretation: 'ISI 15–21: moderate clinical insomnia — CBT-I first-line; evaluate contributing meds/conditions.',
        },
        {
          max: 28,
          level: 'high',
          label: 'Severe clinical insomnia',
          interpretation: 'ISI 22–28: severe clinical insomnia — structured treatment; screen mood, substances, OSA, RLS.',
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'Bands', value: '0–7 none; 8–14 subthreshold; 15–21 moderate; 22–28 severe' },
        ],
      };
    },
    evidence: {
      summary:
        'ISI: 7 items (0–4), total 0–28. Bands: 0–7 no clinically significant insomnia, 8–14 subthreshold, 15–21 moderate, 22–28 severe.',
      formula: 'Enter total 0–28',
      validation: 'Validated insomnia severity measure (Morin et al.); sensitive to treatment change.',
      references: [
        {
          title: 'The Insomnia Severity Index: psychometric indicators and detection of insomnia cases',
          citation: 'Bastien CH, Vallières A, Morin CM. Sleep Med. 2001; Morin et al. Sleep. 2011',
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
    name: 'PCL-5 PTSD Checklist',
    shortName: 'PCL-5',
    description: 'PTSD Checklist for DSM-5 total score interpreter (0–80).',
    category: 'psychiatry',
    tags: ['ptsd', 'trauma', 'pcl-5', 'screening'],
    whenToUse: 'Interpret PCL-5 total after patient completes the 20-item DSM-5 PTSD checklist.',
    whyUse: 'Standard DSM-5-aligned PTSD severity and screening measure for monitoring and provisional detection.',
    inputs: [
      numberInput('score', 'PCL-5 total (0–80)', {
        min: 0,
        max: 80,
        defaultValue: 30,
        helpText: '20 items scored 0–4 (Not at all → Extremely)',
      }),
    ],
    calculate(values) {
      const score = num(values.score, 30);
      // Common provisional PTSD cutoffs ~31–33; severity bands pragmatic
      const r = riskFromThresholds(score, [
        {
          max: 20,
          level: 'low',
          label: 'Lower symptom range',
          interpretation: 'PCL-5 in a lower range — provisional PTSD less likely, but clinical interview still needed if trauma-related impairment is present.',
        },
        {
          max: 30,
          level: 'moderate',
          label: 'Subthreshold / intermediate',
          interpretation: 'Intermediate symptoms — may not meet common provisional cutoffs (~31–33) but can still warrant trauma-focused assessment.',
        },
        {
          max: 49,
          level: 'high',
          label: 'Above common provisional cutoff',
          interpretation: 'PCL-5 ≥31 (using common 31–33 cutoffs): provisional PTSD screen positive — diagnostic interview (e.g., CAPS-5) and safety assessment.',
        },
        {
          max: 80,
          level: 'critical',
          label: 'High / severe PTSD symptom burden',
          interpretation: 'High PCL-5 total — substantial PTSD symptom burden; prioritize trauma-focused therapy access, comorbidity, and risk (suicide, substance use).',
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'Common provisional cutoff', value: '≥31 to ≥33 (setting-dependent)' },
          { label: 'Range', value: '0–80 (20 items × 0–4)' },
          { label: 'DSM-5 clusters', value: 'B intrusion, C avoidance, D cognition/mood, E arousal' },
        ],
      };
    },
    evidence: {
      summary:
        'PCL-5: 20 DSM-5 PTSD symptoms rated 0–4 (total 0–80). Provisional PTSD often suggested at totals ≥31–33; alternative scoring requires ≥1 B, ≥1 C, ≥2 D, ≥2 E items rated ≥2 plus impairment.',
      formula: 'Enter total 0–80',
      validation: 'National Center for PTSD recommended measure; strong psychometrics vs CAPS-5.',
      references: [
        {
          title: 'Psychometric properties of the PTSD Checklist for DSM-5 (PCL-5)',
          citation: 'Blevins CA et al. J Trauma Stress. 2015; NCPTSD PCL-5 materials',
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
      'Cutoff varies by population; 31–33 common for provisional diagnosis.',
      'Cluster-based item rules improve diagnostic approximation vs total alone.',
    ],
  },
];
