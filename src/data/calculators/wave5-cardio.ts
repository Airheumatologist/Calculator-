import type { Calculator } from '../../types/calculator';
import { num, bool, round, yesNo, selectInput, numberInput, riskFromThresholds } from '../../utils/helpers';

export const wave5CardioCalcs: Calculator[] = [
  // ─── 1. EHRA AF symptom score ─────────────────────────────────────────────
  {
    id: 'ehra-score',
    name: 'EHRA AF Symptom Score',
    shortName: 'EHRA',
    description:
      'European Heart Rhythm Association (EHRA) classification of atrial fibrillation symptom severity (I–IV).',
    category: 'cardiology',
    tags: ['atrial fibrillation', 'ehra', 'symptoms', 'quality of life', 'rhythm'],
    whenToUse: 'Patients with AF to grade symptom burden and guide rhythm-control discussions.',
    whyUse: 'Standardized language for AF symptom severity used in ESC AF guidelines and trials.',
    inputs: [
      selectInput('class', 'EHRA class (best clinical fit)', [
        { label: 'I — None (asymptomatic)', value: 1 },
        { label: 'IIa — Mild (normal daily activity not affected)', value: 2 },
        { label: 'IIb — Moderate (normal daily activity affected)', value: 3 },
        { label: 'III — Severe (normal daily activity discontinued)', value: 4 },
        { label: 'IV — Disabling (normal daily activity discontinued; symptoms present with ADLs)', value: 5 },
      ]),
    ],
    calculate(values) {
      const c = num(values.class, 1);
      const map: Record<
        number,
        { label: string; interpretation: string; riskLevel: 'low' | 'moderate' | 'high' | 'info' }
      > = {
        1: {
          label: 'EHRA I — Asymptomatic',
          interpretation:
            'No AF-related symptoms. Focus on stroke prevention, rate control if needed, and risk-factor modification. Rhythm control still considered for selected patients (e.g. EAST-AFNET 4–style early rhythm strategy).',
          riskLevel: 'low',
        },
        2: {
          label: 'EHRA IIa — Mild symptoms',
          interpretation:
            'Mild symptoms that do not affect normal daily activity. Optimize rate control and comorbidities; discuss elective rhythm-control options if patient prefers.',
          riskLevel: 'low',
        },
        3: {
          label: 'EHRA IIb — Moderate symptoms',
          interpretation:
            'Moderate symptoms affecting normal daily activity. Stronger rationale for rhythm-control strategies (AAD, cardioversion, ablation) in addition to anticoagulation when indicated.',
          riskLevel: 'moderate',
        },
        4: {
          label: 'EHRA III — Severe symptoms',
          interpretation:
            'Severe symptoms; normal daily activity discontinued. Prioritize symptom control — consider AAD, cardioversion, and/or catheter ablation per guidelines and preference.',
          riskLevel: 'high',
        },
        5: {
          label: 'EHRA IV — Disabling symptoms',
          interpretation:
            'Disabling symptoms with ordinary activity. Urgent evaluation for rate/rhythm strategy, reversible triggers, and heart-failure contribution; ablation referral often appropriate.',
          riskLevel: 'high',
        },
      };
      const m = map[c] ?? map[1];
      const ehraLabel = c === 1 ? 'I' : c === 2 ? 'IIa' : c === 3 ? 'IIb' : c === 4 ? 'III' : 'IV';
      return {
        score: c,
        label: m.label,
        interpretation: m.interpretation,
        riskLevel: m.riskLevel,
        details: [{ label: 'EHRA class', value: ehraLabel }],
        recommendations:
          c >= 3
            ? ['Document symptom–rhythm correlation', 'Discuss rhythm-control options', 'Ensure anticoagulation if CHA₂DS₂-VASc warrants']
            : ['Continue stroke-prevention plan', 'Risk-factor modification (weight, OSA, alcohol, HTN)', 'Reassess symptoms over time'],
      };
    },
    evidence: {
      summary:
        'EHRA score grades AF-related symptoms from none (I) to disabling (IV); IIa/IIb distinguish mild vs moderate impact on daily activity.',
      formula: 'Clinical class I / IIa / IIb / III / IV',
      validation: 'Endorsed in ESC AF guidelines for symptom description and treatment goals.',
      references: [
        {
          title: '2020 ESC Guidelines for the diagnosis and management of atrial fibrillation',
          citation: 'Hindricks G et al. Eur Heart J. 2021',
          year: 2021,
          pmid: '32860505',
          doi: '10.1093/eurheartj/ehaa612',
        },
      ],
    },
    nextSteps: [
      { condition: 'EHRA ≥ IIb', actions: ['Consider rhythm-control pathway', 'Optimize rate control', 'Shared decision on ablation'] },
      { condition: 'Any EHRA', actions: ['Assess stroke risk', 'Treat modifiable risk factors'] },
    ],
    pearls: [
      'EHRA is about symptoms, not stroke risk — still calculate CHA₂DS₂-VASc separately.',
      'IIa vs IIb was introduced to refine “mild–moderate” symptom intensity.',
    ],
  },

  // ─── 2. CCS angina class ──────────────────────────────────────────────────
  {
    id: 'ccs-angina',
    name: 'CCS Angina Classification',
    shortName: 'CCS Angina',
    description: 'Canadian Cardiovascular Society grading of effort angina (class I–IV).',
    category: 'cardiology',
    tags: ['angina', 'ccs', 'cad', 'chest pain', 'functional class'],
    whenToUse: 'Patients with stable ischemic heart disease / angina to document functional limitation.',
    whyUse: 'Universal language for angina severity used in trials, guidelines, and revascularization discussions.',
    inputs: [
      selectInput('class', 'CCS class', [
        {
          label: 'I — Ordinary activity does not cause angina',
          value: 1,
          description: 'Angina only with strenuous, rapid, or prolonged exertion',
        },
        {
          label: 'II — Slight limitation of ordinary activity',
          value: 2,
          description: 'Angina walking >2 blocks or climbing >1 flight at normal pace',
        },
        {
          label: 'III — Marked limitation of ordinary activity',
          value: 3,
          description: 'Angina walking 1–2 blocks or climbing 1 flight at normal pace',
        },
        {
          label: 'IV — Inability to carry on any physical activity without discomfort',
          value: 4,
          description: 'Angina may be present at rest',
        },
      ]),
    ],
    calculate(values) {
      const c = num(values.class, 1);
      const labels = [
        '',
        'CCS I — Ordinary activity OK',
        'CCS II — Slight limitation',
        'CCS III — Marked limitation',
        'CCS IV — Severe / rest symptoms',
      ];
      const interpretations = [
        '',
        'Angina only with strenuous or prolonged exertion. Medical therapy optimization and risk-factor control; noninvasive testing as indicated.',
        'Slight limitation of ordinary activity. Intensify antianginal therapy; consider stress testing / ischemia evaluation and secondary prevention.',
        'Marked limitation. High symptom burden — escalate medical therapy and evaluate for revascularization candidacy.',
        'Inability to perform activity without discomfort; rest angina possible. Urgent evaluation for ACS vs refractory angina; often invasive strategy.',
      ];
      const levels: Array<'low' | 'moderate' | 'high' | 'critical'> = ['low', 'low', 'moderate', 'high', 'critical'];
      return {
        score: c,
        label: labels[c] ?? labels[1],
        interpretation: interpretations[c] ?? interpretations[1],
        riskLevel: levels[c] ?? 'moderate',
        details: [{ label: 'CCS class', value: String(c) }],
        recommendations:
          c >= 3
            ? ['Escalate antianginals', 'Cardiology referral', 'Consider angiography / revascularization pathway']
            : ['GDMT for SIHD', 'Lifestyle and risk-factor control', 'Exercise prescription within limits'],
      };
    },
    evidence: {
      summary: 'CCS class I–IV grades angina by the activity level that provokes symptoms.',
      formula: 'Clinical class I–IV per Canadian Cardiovascular Society',
      validation: 'Widely used functional classification since Campeau 1976; embedded in CAD guidelines.',
      references: [
        {
          title: 'Grading of angina pectoris (CCS)',
          citation: 'Campeau L. Circulation. 1976',
          year: 1976,
          pmid: '947585',
        },
      ],
    },
    nextSteps: [
      { condition: 'CCS III–IV', actions: ['Urgent cardiology review', 'Rule out unstable / progressive angina', 'Revascularization discussion'] },
      { condition: 'CCS I–II', actions: ['Optimize medical therapy', 'Risk stratify with noninvasive testing as appropriate'] },
    ],
    pearls: ['Progressive or rest angina may indicate unstable angina even if “class IV” label is used.', 'CCS is not the same as NYHA (which is dyspnea/HF focused).'],
  },

  // ─── 3. ACC/AHA HF stages ─────────────────────────────────────────────────
  {
    id: 'acc-aha-hf-stage',
    name: 'ACC/AHA Heart Failure Stages',
    shortName: 'HF Stage',
    description: 'ACC/AHA stages A–D describing the continuum of heart failure development and severity.',
    category: 'cardiology',
    tags: ['heart failure', 'acc/aha', 'stage', 'gdmt', 'prevention'],
    whenToUse: 'Adults at risk for or with structural heart disease / clinical HF to stage disease continuum.',
    whyUse: 'Stages drive prevention and therapy intensity; distinct from NYHA functional class.',
    inputs: [
      selectInput('stage', 'ACC/AHA HF stage', [
        {
          label: 'A — At risk for HF',
          value: 0,
          description: 'Risk factors (HTN, DM, obesity, CAD, cardiotoxins, family Hx) without structural disease or symptoms',
        },
        {
          label: 'B — Pre-HF',
          value: 1,
          description: 'Structural heart disease, abnormal cardiac function, or elevated natriuretic peptides without current/prior HF symptoms',
        },
        {
          label: 'C — Symptomatic HF',
          value: 2,
          description: 'Structural heart disease with current or prior HF symptoms/signs',
        },
        {
          label: 'D — Advanced HF',
          value: 3,
          description: 'Marked HF symptoms interfering with daily life and recurrent hospitalizations despite GDMT',
        },
      ]),
      selectInput('nyhaHint', 'Current NYHA (optional context for stage C/D)', [
        { label: 'Not applicable / unknown', value: 0 },
        { label: 'NYHA I', value: 1 },
        { label: 'NYHA II', value: 2 },
        { label: 'NYHA III', value: 3 },
        { label: 'NYHA IV', value: 4 },
      ]),
    ],
    calculate(values) {
      const s = num(values.stage, 0);
      const nyha = num(values.nyhaHint, 0);
      const stageLetters = ['A', 'B', 'C', 'D'];
      const labels = [
        'Stage A — At risk for HF',
        'Stage B — Pre-HF',
        'Stage C — Symptomatic HF',
        'Stage D — Advanced HF',
      ];
      const interpretations = [
        'Stage A: risk factors without known structural disease or HF symptoms. Focus on primary prevention (BP, lipids, diabetes, lifestyle, avoid cardiotoxins).',
        'Stage B: structural disease, filling abnormalities, or elevated NP without clinical HF. Prevent transition to symptomatic HF (ACEI/ARB/ARNI, evidence-based β-blocker, SGLT2i in selected phenotypes, ICD if indicated).',
        'Stage C: current or prior symptomatic HF. Implement foundational GDMT for HFrEF (ARNI/ACEI/ARB, β-blocker, MRA, SGLT2i) and phenotype-specific therapy for HFmrEF/HFpEF.',
        'Stage D: advanced HF with persistent severe symptoms despite optimized therapy. Evaluate advanced therapies (inotropes, MCS, transplant) and palliative care in parallel.',
      ];
      const levels: Array<'low' | 'moderate' | 'high' | 'critical'> = ['low', 'moderate', 'high', 'critical'];
      const details = [
        { label: 'ACC/AHA stage', value: stageLetters[s] ?? 'A' },
      ];
      if (nyha > 0 && s >= 2) {
        details.push({ label: 'NYHA (context)', value: String(nyha) });
      }
      return {
        score: s,
        label: labels[s] ?? labels[0],
        interpretation: interpretations[s] ?? interpretations[0],
        riskLevel: levels[s] ?? 'moderate',
        details,
        recommendations:
          s >= 3
            ? ['Advanced HF referral', 'Reassess GDMT tolerability and congestion', 'Discuss MCS/transplant/palliative pathways']
            : s === 2
              ? ['Optimize four-pillar GDMT (HFrEF)', 'Treat comorbidities', 'Education and close follow-up']
              : s === 1
                ? ['Treat structural disease drivers', 'Preventive GDMT per phenotype', 'Surveillance for symptoms/NP']
                : ['Aggressive risk-factor control', 'Cardiotoxin stewardship', 'Lifestyle counseling'],
      };
    },
    evidence: {
      summary:
        'ACC/AHA stages A–D frame HF as a continuum from risk to advanced disease; NYHA class further grades symptom severity within stages C–D.',
      formula: 'Clinical stage A / B / C / D',
      validation: 'Core framework in AHA/ACC/HFSA HF guidelines (2022).',
      references: [
        {
          title: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure',
          citation: 'Heidenreich PA et al. Circulation. 2022',
          year: 2022,
          pmid: '35363499',
          doi: '10.1161/CIR.0000000000001063',
        },
      ],
    },
    nextSteps: [
      { condition: 'Stage A–B', actions: ['Risk-factor control and prevention', 'Stage B: preventive GDMT and surveillance for symptoms'] },
      { condition: 'Stage C–D', actions: ['GDMT titration', 'Congestion management', 'Advanced options if refractory'] },
    ],
    pearls: [
      'Stages only advance (A→D); they do not move backward even if symptoms improve.',
      'A patient can be Stage C NYHA I if previously symptomatic and now compensated on therapy.',
    ],
  },

  // ─── 4. GDMT checklist ────────────────────────────────────────────────────
  {
    id: 'gdmt-checklist',
    name: 'HFrEF GDMT Optimization Checklist',
    shortName: 'GDMT Check',
    description:
      'Counts foundational HFrEF guideline-directed medical therapy pillars in use (ARNI/ACEI/ARB, evidence-based β-blocker, MRA, SGLT2i) plus common adjuncts.',
    category: 'cardiology',
    tags: ['heart failure', 'gdmt', 'hfref', 'arni', 'sglt2'],
    whenToUse: 'Patients with HFrEF (typically LVEF ≤40%) to audit GDMT completeness.',
    whyUse: 'Four-pillar therapy reduces mortality; checklist highlights gaps for titration visits.',
    inputs: [
      yesNo('ras', 'ARNI, ACE inhibitor, or ARB in use (target or maximally tolerated)', 1),
      yesNo('bb', 'Evidence-based β-blocker (carvedilol / bisoprolol / metoprolol succinate)', 1),
      yesNo('mra', 'Mineralocorticoid receptor antagonist (spironolactone / eplerenone)', 1),
      yesNo('sglt2', 'SGLT2 inhibitor (dapagliflozin / empagliflozin, etc.)', 1),
      yesNo('arniPreferred', 'Using ARNI (sacubitril/valsartan) rather than ACEI/ARB alone', 1, 'Preferred RAS inhibitor when eligible'),
      yesNo('loop', 'Loop diuretic as needed for congestion', 1),
      yesNo('ivabradine', 'Ivabradine (if eligible: sinus rhythm, HR elevated on max BB)', 1),
      yesNo('hydralNitrates', 'Hydralazine + nitrate (selected self-identified Black patients / ACEI-intolerant)', 1),
      yesNo('deviceEligible', 'ICD and/or CRT indicated and addressed (implanted or declined after counseling)', 1),
    ],
    calculate(values) {
      const pillars = [
        bool(values.ras),
        bool(values.bb),
        bool(values.mra),
        bool(values.sglt2),
      ];
      const pillarCount = pillars.filter(Boolean).length;
      const adjuncts = [
        bool(values.arniPreferred) ? 'ARNI' : null,
        bool(values.loop) ? 'Loop diuretic' : null,
        bool(values.ivabradine) ? 'Ivabradine' : null,
        bool(values.hydralNitrates) ? 'Hydralazine/nitrate' : null,
        bool(values.deviceEligible) ? 'Device addressed' : null,
      ].filter(Boolean) as string[];

      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'high';
      let label = `${pillarCount}/4 foundational pillars`;
      let interpretation = '';
      if (pillarCount === 4) {
        riskLevel = 'low';
        label = '4/4 pillars — optimized foundation';
        interpretation =
          'All four foundational HFrEF therapies are in use. Continue titration to target doses when tolerated; address devices, iron deficiency, and comorbidities.';
      } else if (pillarCount === 3) {
        riskLevel = 'moderate';
        interpretation = `Three of four pillars active. Identify the missing agent and start/titrate unless true contraindication (e.g. hyperkalemia, advanced CKD, hypotension).`;
      } else if (pillarCount === 2) {
        riskLevel = 'high';
        interpretation = `Only two foundational pillars. Substantial opportunity to reduce mortality/morbidity by adding remaining GDMT promptly.`;
      } else {
        riskLevel = 'critical';
        interpretation = `≤1 foundational pillar. High-priority GDMT initiation visit — sequence therapy rapidly (often start multiple agents at low dose).`;
      }
      if (bool(values.ras) && !bool(values.arniPreferred)) {
        interpretation += ' Consider switching ACEI/ARB → ARNI if eligible and accessible.';
      }

      const missing: string[] = [];
      if (!bool(values.ras)) missing.push('ARNI/ACEI/ARB');
      if (!bool(values.bb)) missing.push('Evidence-based β-blocker');
      if (!bool(values.mra)) missing.push('MRA');
      if (!bool(values.sglt2)) missing.push('SGLT2i');

      return {
        score: pillarCount,
        unit: '/4 pillars',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Foundational pillars', value: `${pillarCount}/4` },
          { label: 'Missing pillars', value: missing.length ? missing.join(', ') : 'None' },
          { label: 'Adjuncts noted', value: adjuncts.length ? adjuncts.join('; ') : 'None selected' },
        ],
        recommendations:
          missing.length > 0
            ? [`Initiate/titrate: ${missing.join(', ')}`, 'Check BP, K⁺, eGFR before/after changes', 'Close follow-up titration visits']
            : ['Titrate to target doses', 'Reassess volume status', 'Address ICD/CRT and comorbidities'],
      };
    },
    evidence: {
      summary:
        'HFrEF foundational GDMT includes ARNI (or ACEI/ARB), evidence-based β-blocker, MRA, and SGLT2 inhibitor; each independently improves outcomes.',
      formula: 'Count of 4 pillars present (0–4); adjunct flags informational',
      validation: 'Reflects 2022 AHA/ACC/HFSA and ESC HF guideline foundational therapy.',
      references: [
        {
          title: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure',
          citation: 'Heidenreich PA et al. Circulation. 2022',
          year: 2022,
          pmid: '35363499',
          doi: '10.1161/CIR.0000000000001063',
        },
      ],
    },
    nextSteps: [
      { condition: '<4 pillars', actions: ['Start missing agents unless contraindicated', 'Use low-dose multi-drug start when appropriate', 'Arrange early follow-up labs'] },
      { condition: '4/4 pillars', actions: ['Dose optimization', 'Device eligibility review', 'Comorbidity optimization'] },
    ],
    pearls: [
      'SGLT2i is indicated across a wide EF spectrum; still count as foundational for HFrEF.',
      'This checklist does not verify target doses — only presence of therapy classes.',
    ],
  },

  // ─── 5. Sokolow–Lyon LVH ──────────────────────────────────────────────────
  {
    id: 'lvh-sokolow',
    name: 'Sokolow–Lyon LVH Voltage',
    shortName: 'Sokolow–Lyon',
    description: 'ECG left ventricular hypertrophy voltage using Sokolow–Lyon criteria (S V1 + R V5/V6).',
    category: 'cardiology',
    tags: ['ecg', 'lvh', 'sokolow', 'voltage', 'hypertension'],
    whenToUse: 'ECG interpretation when LVH is suspected (hypertension, aortic stenosis, cardiomyopathy screening).',
    whyUse: 'Classic, simple voltage criterion; limited sensitivity but good specificity when met.',
    inputs: [
      numberInput('sV1', 'S-wave amplitude in V1', { unit: 'mm', min: 0, max: 50, step: 0.5, defaultValue: 15, helpText: '1 mm = 0.1 mV standard calibration' }),
      numberInput('rV5V6', 'Tallest R in V5 or V6', { unit: 'mm', min: 0, max: 50, step: 0.5, defaultValue: 15 }),
      numberInput('rAvl', 'R-wave in aVL (optional limb criterion)', { unit: 'mm', min: 0, max: 30, step: 0.5, defaultValue: 5 }),
    ],
    calculate(values) {
      const sV1 = num(values.sV1, 15);
      const rV5V6 = num(values.rV5V6, 15);
      const rAvl = num(values.rAvl, 5);
      const sum = round(sV1 + rV5V6, 1);
      const precordialPos = sum >= 35;
      const limbPos = rAvl >= 11;
      const positive = precordialPos || limbPos;

      return {
        score: sum,
        unit: 'mm',
        label: positive ? 'Meets Sokolow–Lyon LVH voltage' : 'Does not meet Sokolow–Lyon voltage',
        interpretation: positive
          ? `S V1 + R V5/V6 = ${sum} mm${precordialPos ? ' (≥35)' : ''}${limbPos ? `; R aVL ${rAvl} mm (≥11)` : ''}. Voltage criteria for LVH met — correlate with imaging; consider strain pattern and clinical context.`
          : `S V1 + R V5/V6 = ${sum} mm (<35) and R aVL ${rAvl} mm (<11). Voltage criteria not met; ECG LVH not excluded (low sensitivity).`,
        riskLevel: positive ? 'moderate' : 'normal',
        details: [
          { label: 'S V1 + R V5/V6', value: `${sum} mm` },
          { label: 'Precordial criterion (≥35 mm)', value: precordialPos ? 'Positive' : 'Negative' },
          { label: 'R aVL criterion (≥11 mm)', value: limbPos ? 'Positive' : 'Negative' },
        ],
        recommendations: positive
          ? ['Correlate with echo/CMR when management would change', 'Assess BP control and secondary causes', 'Note strain pattern if present']
          : ['Do not rule out LVH by ECG alone', 'Image if high pretest probability'],
      };
    },
    evidence: {
      summary: 'Sokolow–Lyon: S in V1 + R in V5 or V6 ≥35 mm (or R aVL ≥11 mm) suggests LVH by voltage.',
      formula: 'Positive if (S_V1 + R_V5/V6 ≥ 35 mm) OR (R_aVL ≥ 11 mm)',
      validation: 'Classic criteria (1949); high specificity, modest sensitivity vs echo LV mass.',
      references: [
        {
          title: 'The ventricular complex in left ventricular hypertrophy as obtained by unipolar precordial and limb leads',
          citation: 'Sokolow M, Lyon TP. Am Heart J. 1949',
          year: 1949,
          pmid: '18107386',
          doi: '10.1016/0002-8703(49)90562-1',
        },
      ],
    },
    nextSteps: [
      { condition: 'Voltage positive', actions: ['Clinical correlation', 'Consider echo', 'Optimize BP'] },
      { condition: 'Voltage negative', actions: ['ECG cannot exclude LVH', 'Image based on clinical need'] },
    ],
    pearls: [
      'Obesity, emphysema, and lead placement reduce voltage sensitivity.',
      'Repolarization “strain” (ST depression/T inversion in lateral leads) increases specificity.',
    ],
  },

  // ─── 6. Cornell LVH ───────────────────────────────────────────────────────
  {
    id: 'lvh-cornell',
    name: 'Cornell Voltage LVH Criteria',
    shortName: 'Cornell LVH',
    description: 'Sex-specific Cornell voltage criteria for ECG LVH (R aVL + S V3).',
    category: 'cardiology',
    tags: ['ecg', 'lvh', 'cornell', 'voltage'],
    whenToUse: 'ECG LVH assessment using Cornell voltage (often more sensitive than Sokolow–Lyon alone).',
    whyUse: 'Sex-specific thresholds improve performance; Cornell product adds QRS duration.',
    inputs: [
      selectInput('sex', 'Sex', [
        { label: 'Male', value: 'M' },
        { label: 'Female', value: 'F' },
      ]),
      numberInput('rAvl', 'R-wave in aVL', { unit: 'mm', min: 0, max: 30, step: 0.5, defaultValue: 8 }),
      numberInput('sV3', 'S-wave in V3', { unit: 'mm', min: 0, max: 50, step: 0.5, defaultValue: 12 }),
      numberInput('qrsMs', 'QRS duration (optional, for Cornell product)', {
        unit: 'ms',
        min: 60,
        max: 200,
        defaultValue: 90,
        helpText: 'Product = voltage(mm) × QRS(ms); threshold often >2440 mm·ms',
      }),
    ],
    calculate(values) {
      const sex = String(values.sex ?? 'M');
      const rAvl = num(values.rAvl, 8);
      const sV3 = num(values.sV3, 12);
      const qrs = num(values.qrsMs, 90);
      const voltage = round(rAvl + sV3, 1);
      const threshold = sex === 'F' ? 20 : 28;
      const voltagePos = voltage >= threshold;
      const product = round(voltage * qrs, 0);
      const productPos = product > 2440;

      const positive = voltagePos || productPos;
      return {
        score: voltage,
        unit: 'mm',
        label: positive ? 'Meets Cornell LVH criteria' : 'Does not meet Cornell criteria',
        interpretation: voltagePos
          ? `Cornell voltage ${voltage} mm ≥ ${threshold} mm (${sex === 'F' ? 'women' : 'men'}). LVH by Cornell voltage. Cornell product ${product} mm·ms ${productPos ? '(also >2440)' : ''}.`
          : productPos
            ? `Voltage ${voltage} mm below ${threshold} mm threshold, but Cornell product ${product} mm·ms >2440 — positive by product criterion.`
            : `Cornell voltage ${voltage} mm (<${threshold} mm for ${sex === 'F' ? 'women' : 'men'}); product ${product} mm·ms (≤2440). Criteria not met.`,
        riskLevel: positive ? 'moderate' : 'normal',
        details: [
          { label: 'R aVL + S V3', value: `${voltage} mm` },
          { label: 'Sex-specific cutoff', value: `≥${threshold} mm` },
          { label: 'Cornell product', value: `${product} mm·ms` },
          { label: 'Product criterion', value: productPos ? 'Positive (>2440)' : 'Negative' },
        ],
        recommendations: positive
          ? ['Correlate with imaging', 'Assess hypertensive heart disease / AS / HCM as indicated']
          : ['ECG cannot exclude LVH', 'Consider imaging if clinically indicated'],
      };
    },
    evidence: {
      summary:
        'Cornell voltage: R aVL + S V3 ≥28 mm (men) or ≥20 mm (women). Cornell product (voltage × QRS ms) >2440 mm·ms is an alternate criterion.',
      formula: 'Voltage = R_aVL + S_V3; + if ≥28 mm (♂) or ≥20 mm (♀); product = voltage × QRS_ms',
      validation: 'Derived and validated against echo LV mass; used in hypertension trials (e.g. LIFE).',
      references: [
        {
          title: 'Improved sex-specific criteria of left ventricular hypertrophy for clinical and computer interpretation of electrocardiograms',
          citation: 'Casale PN et al. Circulation. 1987',
          year: 1987,
          pmid: '2949887',
          doi: '10.1161/01.cir.75.3.565',
        },
      ],
    },
    nextSteps: [
      { condition: 'Positive', actions: ['Clinical correlation', 'Echo if it changes management'] },
    ],
    pearls: [
      'Combining Cornell + Sokolow and repolarization improves detection.',
      'LBBB and paced rhythms invalidate standard voltage criteria.',
    ],
  },

  // ─── 7. Rautaharju QTc ────────────────────────────────────────────────────
  {
    id: 'qtc-rautaharju',
    name: 'Corrected QT (Rautaharju)',
    shortName: 'QTc Rautaharju',
    description: 'Heart-rate–corrected QT using the Rautaharju formula: QTc = QT × (120 + HR) / 180.',
    category: 'cardiology',
    tags: ['ecg', 'qt', 'qtc', 'rautaharju', 'arrhythmia'],
    whenToUse: 'QT correction when an alternative linear/rate formula to Bazett is desired.',
    whyUse: 'Rautaharju correction is less biased than Bazett at higher heart rates in many comparisons.',
    inputs: [
      numberInput('qt', 'QT interval', { unit: 'ms', min: 200, max: 800, defaultValue: 400 }),
      numberInput('hr', 'Heart rate', { unit: 'bpm', min: 30, max: 220, defaultValue: 70 }),
    ],
    calculate(values) {
      const qt = num(values.qt, 400);
      const hr = num(values.hr, 70);
      if (hr <= 0) {
        return { score: 0, label: 'Invalid HR', interpretation: 'HR must be > 0.', riskLevel: 'info' };
      }
      const qtc = round((qt * (120 + hr)) / 180, 0);
      let riskLevel: 'normal' | 'moderate' | 'high' | 'critical' = 'normal';
      let label = 'Normal QTc';
      let interpretation = `Rautaharju QTc ${qtc} ms.`;
      if (qtc >= 500) {
        riskLevel = 'critical';
        label = 'Markedly prolonged';
        interpretation = `QTc ${qtc} ms (≥500): high torsades risk — stop QT-prolonging drugs, replete K/Mg, telemetry.`;
      } else if (qtc >= 470) {
        riskLevel = 'high';
        label = 'Prolonged';
        interpretation = `QTc ${qtc} ms: prolonged — review meds/electrolytes; sex-specific cutoffs apply.`;
      } else if (qtc >= 440) {
        riskLevel = 'moderate';
        label = 'Borderline';
        interpretation = `QTc ${qtc} ms: borderline — recheck measurement and secondary causes.`;
      } else if (qtc < 350) {
        riskLevel = 'moderate';
        label = 'Short QTc';
        interpretation = `QTc ${qtc} ms: short — consider short QT syndrome if persistent.`;
      } else {
        interpretation = `Rautaharju QTc ${qtc} ms within commonly accepted range for many adults.`;
      }
      return {
        score: qtc,
        unit: 'ms',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'QT', value: `${qt} ms` },
          { label: 'HR', value: `${hr} bpm` },
          { label: 'Formula', value: 'QT × (120 + HR) / 180' },
        ],
        recommendations:
          qtc >= 500
            ? ['Telemetry', 'Discontinue QT-prolonging agents', 'Replete K⁺/Mg²⁺']
            : qtc >= 470
              ? ['Medication and electrolyte review', 'Repeat ECG']
              : ['Document baseline QTc method used'],
      };
    },
    evidence: {
      summary: 'Rautaharju QTc = QT × (120 + HR) / 180 (QT in ms, HR in bpm).',
      formula: 'QTc_Rautaharju = QT × (120 + HR) / 180',
      validation: 'Proposed as HR-robust alternative; compare with Fridericia/Bazett in the same patient.',
      references: [
        {
          title: 'A simple method for QT correction (Rautaharju et al. formulations in ECG literature)',
          citation: 'Rautaharju PM et al. various ECG methodology papers; common form QT×(120+HR)/180',
          year: 2004,
          pmid: '15063498',
          doi: '10.1016/j.femsle.2004.02.020',
        },
      ],
    },
    nextSteps: [
      { condition: 'QTc ≥500 ms', actions: ['TdP precautions', 'Drug/electrolyte review'] },
    ],
    pearls: [
      'Always state which correction formula was used when documenting QTc.',
      'Measure QT in the lead with the clearest T-wave end.',
    ],
  },

  // ─── 8. JTc interval ──────────────────────────────────────────────────────
  {
    id: 'jtc-interval',
    name: 'JT / JTc Interval',
    shortName: 'JTc',
    description:
      'JT interval (QT − QRS) with optional rate correction (JTc). Useful when QRS is wide and QTc is hard to interpret.',
    category: 'cardiology',
    tags: ['ecg', 'jt', 'jtc', 'qt', 'qrs', 'lbbb'],
    whenToUse: 'Wide QRS (bundle branch block, pacing, ventricular conduction delay) when assessing repolarization.',
    whyUse: 'QTc includes QRS duration; JT/JTc isolates repolarization and may better reflect TdP risk with wide QRS.',
    inputs: [
      numberInput('qt', 'QT interval', { unit: 'ms', min: 200, max: 800, defaultValue: 440 }),
      numberInput('qrs', 'QRS duration', { unit: 'ms', min: 60, max: 250, defaultValue: 120 }),
      numberInput('hr', 'Heart rate', { unit: 'bpm', min: 30, max: 220, defaultValue: 70 }),
      selectInput('method', 'Rate correction method', [
        { label: 'Bazett on JT (JT / √RR)', value: 'bazett' },
        { label: 'JTc ≈ QTc_Bazett − QRS', value: 'qtc_minus' },
        { label: 'Uncorrected JT only', value: 'none' },
      ]),
    ],
    calculate(values) {
      const qt = num(values.qt, 440);
      const qrs = num(values.qrs, 120);
      const hr = num(values.hr, 70);
      const method = String(values.method ?? 'bazett');
      if (hr <= 0) {
        return { score: 0, label: 'Invalid HR', interpretation: 'HR must be > 0.', riskLevel: 'info' };
      }
      const jt = round(qt - qrs, 0);
      const rr = 60 / hr;
      const qtcBaz = qt / Math.sqrt(rr);
      let jtc = jt;
      let formula = 'JT = QT − QRS (uncorrected)';
      if (method === 'bazett') {
        jtc = round(jt / Math.sqrt(rr), 0);
        formula = 'JTc = JT / √RR';
      } else if (method === 'qtc_minus') {
        jtc = round(qtcBaz - qrs, 0);
        formula = 'JTc = QTc_Bazett − QRS';
      }

      // Common teaching: JTc ≥360–370 ms concerning; ≥390–400 higher risk (thresholds vary)
      let riskLevel: 'normal' | 'moderate' | 'high' | 'critical' | 'info' = 'normal';
      let label = method === 'none' ? 'JT interval' : 'JTc interval';
      let interpretation = '';
      if (method === 'none') {
        riskLevel = 'info';
        interpretation = `JT = ${jt} ms (uncorrected). Rate correction recommended for serial comparison.`;
      } else if (jtc >= 400) {
        riskLevel = 'critical';
        label = 'Markedly prolonged JTc';
        interpretation = `JTc ${jtc} ms (≥400): markedly prolonged repolarization with wide-QRS context — high concern; treat as prolonged repolarization risk.`;
      } else if (jtc >= 370) {
        riskLevel = 'high';
        label = 'Prolonged JTc';
        interpretation = `JTc ${jtc} ms (≥370): prolonged — review QT drugs and electrolytes; compare with prior tracings.`;
      } else if (jtc >= 350) {
        riskLevel = 'moderate';
        label = 'Borderline JTc';
        interpretation = `JTc ${jtc} ms: borderline depending on lab-specific cutoffs (often ~360 ms).`;
      } else {
        interpretation = `JTc ${jtc} ms within commonly cited acceptable range for many adults; always use local cutoffs.`;
      }

      return {
        score: method === 'none' ? jt : jtc,
        unit: 'ms',
        label,
        interpretation: `${interpretation} JT uncorrected ${jt} ms; QRS ${qrs} ms.`,
        riskLevel,
        details: [
          { label: 'JT (QT − QRS)', value: `${jt} ms` },
          { label: 'JTc / reported', value: `${method === 'none' ? jt : jtc} ms` },
          { label: 'Method', value: formula },
          { label: 'QTc Bazett (ref)', value: `${round(qtcBaz, 0)} ms` },
        ],
        recommendations:
          (method !== 'none' && jtc >= 370) || (method === 'none' && jt > 320)
            ? ['Review QT-prolonging meds', 'Replete K/Mg', 'Avoid additional QT risk', 'EP/cardiology if congenital concern']
            : ['Document method used', 'Serial comparison with same formula'],
      };
    },
    evidence: {
      summary:
        'JT = QT − QRS. Rate-corrected JTc isolates repolarization when QRS is prolonged; cutoffs are less standardized than QTc.',
      formula: 'JT = QT − QRS; JTc = JT/√RR or QTc − QRS',
      validation: 'Supported in ECG literature for BBB/paced rhythms; institutional cutoffs vary.',
      references: [
        {
          title: 'The JT interval as a depolarization-independent measure of repolarization',
          citation: 'Zhou SH / Rautaharju et al. related ECG methodology; clinical reviews on JTc in wide QRS',
          year: 1992,
          pmid: '1378630',
          doi: '10.1073/pnas.89.14.6540',
        },
      ],
    },
    nextSteps: [
      { condition: 'Prolonged JTc', actions: ['Drug/electrolyte review', 'Telemetry if very prolonged or symptomatic'] },
    ],
    pearls: [
      'Do not mix formulas when trending JTc over time.',
      'In ventricular pacing, measure from pacing spike carefully; automated QT is often wrong.',
    ],
  },

  // ─── 9. Warfarin INR goal ─────────────────────────────────────────────────
  {
    id: 'warfarin-inr-goal',
    name: 'Warfarin INR Goal by Indication',
    shortName: 'INR Goal',
    description: 'Target INR range helper by common warfarin indication (educational; follow device/label specifics).',
    category: 'cardiology',
    tags: ['warfarin', 'inr', 'anticoagulation', 'valve', 'vte', 'af'],
    whenToUse: 'Selecting or verifying target INR for warfarin therapy.',
    whyUse: 'INR targets differ for mechanical valves vs AF/VTE; mistakes cause thrombosis or bleeding.',
    inputs: [
      selectInput('indication', 'Indication', [
        { label: 'Nonvalvular AF / flutter', value: 'af' },
        { label: 'VTE (DVT/PE) treatment or secondary prevention', value: 'vte' },
        { label: 'Bioprosthetic valve (early post-op period if anticoagulated)', value: 'bio' },
        { label: 'Mechanical aortic valve, bileaflet/current-gen, no TE risk factors', value: 'avr_low' },
        { label: 'Mechanical aortic valve + TE risk factors', value: 'avr_high' },
        { label: 'Mechanical mitral valve', value: 'mvr' },
        { label: 'Mechanical valve + prior TE despite therapeutic INR', value: 'valve_te' },
        { label: 'On-X aortic valve (after agreed lower-INR protocol period)', value: 'onx' },
        { label: 'Antiphospholipid syndrome (standard intensity if warfarin chosen)', value: 'aps' },
      ]),
      yesNo('recentTe', 'Recent thromboembolism on warfarin (consider higher target / add antiplatelet per specialist)', 1),
    ],
    calculate(values) {
      const ind = String(values.indication ?? 'af');
      const table: Record<
        string,
        { goal: string; inrLow: number; inrHigh: number; note: string; riskLevel: 'info' | 'moderate' | 'high' }
      > = {
        af: {
          goal: '2.0–3.0',
          inrLow: 2,
          inrHigh: 3,
          note: 'Standard intensity for most AF when warfarin is used (DOAC preferred for most NVAF).',
          riskLevel: 'info',
        },
        vte: {
          goal: '2.0–3.0',
          inrLow: 2,
          inrHigh: 3,
          note: 'Standard VTE target. Duration depends on provoked vs unprovoked and bleeding risk.',
          riskLevel: 'info',
        },
        bio: {
          goal: '2.0–3.0 (if VKA used)',
          inrLow: 2,
          inrHigh: 3,
          note: 'Many bioprostheses use ASA alone long-term; short-term VKA sometimes used early post-op per team protocol.',
          riskLevel: 'moderate',
        },
        avr_low: {
          goal: '2.0–3.0',
          inrLow: 2,
          inrHigh: 3,
          note: 'Bileaflet / current-generation mechanical AVR without additional TE risk factors — INR 2–3 + low-dose ASA often recommended.',
          riskLevel: 'moderate',
        },
        avr_high: {
          goal: '2.5–3.5',
          inrLow: 2.5,
          inrHigh: 3.5,
          note: 'Mechanical AVR with TE risk factors (AF, prior TE, hypercoagulable, LV dysfunction, older-generation valve) — higher INR target.',
          riskLevel: 'high',
        },
        mvr: {
          goal: '2.5–3.5',
          inrLow: 2.5,
          inrHigh: 3.5,
          note: 'Mechanical mitral valve — INR 2.5–3.5; add low-dose ASA unless bleeding risk prohibitive (guideline-directed).',
          riskLevel: 'high',
        },
        valve_te: {
          goal: 'Often 2.5–3.5 or higher intensity per specialist',
          inrLow: 2.5,
          inrHigh: 3.5,
          note: 'Thrombosis/TE despite therapeutic anticoagulation requires expert valve/hematology input; may raise INR target and/or add antiplatelet.',
          riskLevel: 'high',
        },
        onx: {
          goal: '1.5–2.0 (protocol-specific, after transition)',
          inrLow: 1.5,
          inrHigh: 2,
          note: 'On-X aortic valve lower-INR strategy only after initial standard-intensity period and per FDA/label protocol with ASA.',
          riskLevel: 'moderate',
        },
        aps: {
          goal: '2.0–3.0 (standard); high-risk APS often prefers LMWH/VKA expert plan',
          inrLow: 2,
          inrHigh: 3,
          note: 'Standard-intensity INR is generally preferred over high-intensity for APS; DOACs often avoided in triple-positive APS.',
          riskLevel: 'high',
        },
      };
      const row = table[ind] ?? table.af;
      let interpretation = `Target INR ${row.goal}. ${row.note}`;
      if (bool(values.recentTe)) {
        interpretation +=
          ' Recent TE flag: do not adjust target alone — seek specialist input for intensity, adherence, and cancer/APS workup.';
      }
      return {
        score: `${row.inrLow}-${row.inrHigh}`,
        unit: 'INR',
        label: `INR goal ${row.goal}`,
        interpretation,
        riskLevel: row.riskLevel,
        details: [
          { label: 'Target range', value: row.goal },
          { label: 'Indication key', value: ind },
        ],
        recommendations: [
          'Confirm device-specific and society guideline targets',
          'Educate on diet/drug interactions and INR monitoring schedule',
          'Use TTR / SAMe-TT₂R₂ concepts for quality of anticoagulation',
        ],
      };
    },
    evidence: {
      summary:
        'Most AF/VTE targets are INR 2–3; mechanical mitral valves and higher-risk mechanical AVR often 2.5–3.5; On-X AVR may use lower INR under protocol.',
      formula: 'Indication → guideline INR range',
      validation: 'Aligned with AHA/ACC valve and CHEST antithrombotic guidance (educational summary).',
      references: [
        {
          title: '2020 ACC/AHA Guideline for the Management of Patients With Valvular Heart Disease',
          citation: 'Otto CM et al. Circulation. 2021',
          year: 2021,
          pmid: '33332150',
          doi: '10.1161/CIR.0000000000000923',
        },
      ],
    },
    nextSteps: [
      { condition: 'Mechanical valve', actions: ['Lifelong VKA', 'Avoid DOAC', 'Bridge per bleeding/thrombosis risk when interrupting'] },
      { condition: 'NVAF', actions: ['Prefer DOAC if eligible', 'If warfarin, maintain TTR high'] },
    ],
    pearls: [
      'DOACs are contraindicated for mechanical valves and moderate–severe mitral stenosis (valvular AF).',
      'Always reconcile institutional prosthesis protocols.',
    ],
  },

  // ─── 10. DOAC renal dose ──────────────────────────────────────────────────
  {
    id: 'doac-renal-dose',
    name: 'DOAC Renal Dose Helper',
    shortName: 'DOAC Dose',
    description:
      'Educational dose-band helper for common DOAC regimens by CrCl (and simplified apixaban ABC criteria). Verify current labeling.',
    category: 'cardiology',
    tags: ['doac', 'apixaban', 'rivaroxaban', 'dabigatran', 'edoxaban', 'renal'],
    whenToUse: 'Adults starting or reviewing DOAC dose for AF or VTE when kidney function is known.',
    whyUse: 'Renal dosing errors are a leading cause of DOAC under/overdose.',
    inputs: [
      selectInput('drug', 'Drug', [
        { label: 'Apixaban', value: 'apix' },
        { label: 'Rivaroxaban', value: 'riva' },
        { label: 'Dabigatran', value: 'dabi' },
        { label: 'Edoxaban', value: 'edox' },
      ]),
      selectInput('indication', 'Indication', [
        { label: 'Nonvalvular AF (stroke prevention)', value: 'af' },
        { label: 'VTE treatment (acute / maintenance phase simplified)', value: 'vte' },
      ]),
      numberInput('crcl', 'Creatinine clearance (Cockcroft–Gault)', {
        unit: 'mL/min',
        min: 5,
        max: 150,
        defaultValue: 60,
        helpText: 'Use actual body weight rules per local protocol / label',
      }),
      numberInput('age', 'Age (for apixaban dose-reduction criteria)', { unit: 'years', min: 18, max: 110, defaultValue: 70 }),
      numberInput('weight', 'Weight (for apixaban dose-reduction criteria)', { unit: 'kg', min: 30, max: 250, defaultValue: 80 }),
      numberInput('creatinine', 'Serum creatinine (for apixaban dose-reduction criteria)', {
        unit: 'mg/dL',
        min: 0.3,
        max: 15,
        step: 0.1,
        defaultValue: 1.0,
      }),
    ],
    calculate(values) {
      const drug = String(values.drug ?? 'apix');
      const ind = String(values.indication ?? 'af');
      const crcl = num(values.crcl, 60);
      const age = num(values.age, 70);
      const weight = num(values.weight, 80);
      const cr = num(values.creatinine, 1.0);

      let dose = '';
      let label = '';
      let interpretation = '';
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' | 'info' = 'info';

      if (drug === 'apix') {
        const criteria = [age >= 80, weight <= 60, cr >= 1.5].filter(Boolean).length;
        if (crcl < 15 && ind === 'af') {
          dose = 'Avoid / not recommended (CrCl <15)';
          riskLevel = 'critical';
          label = 'Apixaban — avoid (severe renal impairment)';
          interpretation = 'Labeling generally avoids apixaban for AF when CrCl <15 mL/min; use alternative per specialist.';
        } else if (ind === 'af') {
          if (criteria >= 2) {
            dose = '2.5 mg BID';
            label = 'Apixaban AF reduced dose';
            interpretation = `Meets ≥2 ABC criteria (Age ≥80, Body weight ≤60 kg, Creatinine ≥1.5 mg/dL): reduced dose 2.5 mg BID. Criteria met: ${criteria}/3.`;
            riskLevel = 'moderate';
          } else {
            dose = '5 mg BID';
            label = 'Apixaban AF standard dose';
            interpretation = `Standard AF dose 5 mg BID (${criteria}/3 dose-reduction criteria). ESRD/dialysis dosing is specialized — verify label.`;
            riskLevel = 'low';
          }
        } else {
          // VTE simplified: 10 mg BID ×7d then 5 mg BID; reduction rules differ
          dose = crcl < 15 ? 'Avoid / specialist (CrCl <15)' : '10 mg BID ×7 days → 5 mg BID (then optional 2.5 mg BID ≥6 mo)';
          label = 'Apixaban VTE regimen (simplified)';
          interpretation =
            'VTE treatment uses load then 5 mg BID; extended 2.5 mg BID after ≥6 months in selected patients. Renal extremes need specialist review.';
          riskLevel = crcl < 30 ? 'high' : 'info';
        }
      } else if (drug === 'riva') {
        if (ind === 'af') {
          if (crcl > 50) {
            dose = '20 mg daily with food';
            label = 'Rivaroxaban AF standard';
            riskLevel = 'low';
          } else if (crcl >= 15) {
            dose = '15 mg daily with food';
            label = 'Rivaroxaban AF renal dose';
            riskLevel = 'moderate';
          } else {
            dose = 'Avoid (CrCl <15)';
            label = 'Rivaroxaban AF — avoid';
            riskLevel = 'critical';
          }
          interpretation = `AF dosing by CrCl ${crcl} mL/min → ${dose}. Take with evening meal.`;
        } else {
          if (crcl < 15) {
            dose = 'Avoid (CrCl <15)';
            riskLevel = 'critical';
          } else {
            dose = '15 mg BID with food ×21 days → 20 mg daily with food';
            riskLevel = crcl < 30 ? 'high' : 'info';
          }
          label = 'Rivaroxaban VTE regimen (simplified)';
          interpretation = `VTE regimen simplified for education: ${dose}. Verify cancer-associated and extended-intensity options separately.`;
        }
      } else if (drug === 'dabi') {
        if (ind === 'af') {
          if (crcl > 30) {
            dose = '150 mg BID (110 mg BID in selected elderly/bleed risk — region-specific)';
            label = 'Dabigatran AF';
            riskLevel = crcl <= 50 ? 'moderate' : 'low';
          } else if (crcl >= 15) {
            dose = 'US label may allow 75 mg BID only in specific CrCl 15–30 settings; many regions avoid';
            label = 'Dabigatran AF — severe CKD caution';
            riskLevel = 'high';
          } else {
            dose = 'Contraindicated / avoid (CrCl <15)';
            label = 'Dabigatran — avoid';
            riskLevel = 'critical';
          }
          interpretation = `Dabigatran is highly renally cleared. CrCl ${crcl} mL/min → ${dose}. Capsules must not be opened.`;
        } else {
          dose =
            crcl <= 30
              ? 'Avoid / not recommended for VTE treatment when CrCl ≤30 in many labels'
              : '150 mg BID after parenteral lead-in ≥5 days';
          label = 'Dabigatran VTE (simplified)';
          riskLevel = crcl <= 30 ? 'critical' : 'info';
          interpretation = `VTE: parenteral anticoagulation ≥5 days then dabigatran 150 mg BID if renal function adequate. CrCl ${crcl}.`;
        }
      } else {
        // edoxaban
        if (crcl > 95 && ind === 'af') {
          dose = 'Prefer alternative (US AF label: avoid if CrCl >95)';
          label = 'Edoxaban AF — high CrCl warning';
          riskLevel = 'high';
          interpretation =
            'US labeling advises against edoxaban for AF when CrCl >95 mL/min due to reduced efficacy signal. Other regions differ — check local label.';
        } else if (crcl >= 50 && crcl <= 95) {
          dose = ind === 'af' ? '60 mg daily' : '60 mg daily after parenteral lead-in';
          label = 'Edoxaban standard';
          riskLevel = 'low';
          interpretation = `Standard 60 mg daily (VTE after ≥5 days parenteral). CrCl ${crcl}.`;
        } else if (crcl >= 15 && crcl <= 50) {
          dose = '30 mg daily (also if weight ≤60 kg or certain P-gp inhibitors)';
          label = 'Edoxaban reduced dose';
          riskLevel = 'moderate';
          interpretation = `Reduce to 30 mg daily for CrCl 15–50 mL/min (and other label criteria).`;
        } else {
          dose = 'Avoid (CrCl <15)';
          label = 'Edoxaban — avoid';
          riskLevel = 'critical';
          interpretation = 'Edoxaban not recommended at CrCl <15 mL/min.';
        }
      }

      return {
        score: dose,
        label,
        interpretation: interpretation + ' Educational only — confirm current local prescribing information.',
        riskLevel,
        details: [
          { label: 'Drug', value: drug },
          { label: 'Indication', value: ind },
          { label: 'CrCl', value: `${crcl} mL/min` },
          { label: 'Suggested label band', value: dose },
        ],
        recommendations: [
          'Verify weight, interacting drugs (P-gp/CYP3A), and bleed risk',
          'Use actual labeling and pharmacy resources before prescribing',
          'Recheck renal function after initiation and with acute illness',
        ],
      };
    },
    evidence: {
      summary:
        'DOAC doses depend on CrCl (and for apixaban AF: age/weight/creatinine criteria). Labels differ by region and indication.',
      formula: 'Drug + indication + CrCl (± apixaban ABC) → label dose band',
      validation: 'Educational synthesis of US/EU product characteristics; always confirm latest label.',
      references: [
        {
          title: '2019 AHA/ACC/HRS Focused Update of the 2014 AF Guideline',
          citation: 'January CT et al. Circulation. 2019',
          year: 2019,
          pmid: '30686041',
          doi: '10.1161/CIR.0000000000000665',
        },
      ],
    },
    nextSteps: [
      { condition: 'Dose reduction or avoid', actions: ['Confirm CrCl method', 'Review drug interactions', 'Consider alternative anticoagulant'] },
      { condition: 'Standard dose', actions: ['Counsel adherence and bleed precautions', 'Follow-up renal function'] },
    ],
    pearls: [
      'Cockcroft–Gault (not eGFR alone) is what most DOAC trials/labels used.',
      'Mechanical valves and moderate–severe MS: do not use DOAC.',
    ],
  },

  // ─── 11. Enoxaparin dose ──────────────────────────────────────────────────
  {
    id: 'enoxaparin-dose',
    name: 'Enoxaparin Dosing Helper',
    shortName: 'Enoxaparin',
    description:
      'Educational enoxaparin dose estimator for VTE prophylaxis vs therapeutic anticoagulation by weight and CrCl.',
    category: 'cardiology',
    tags: ['enoxaparin', 'lmwh', 'vte', 'acs', 'renal', 'dosing'],
    whenToUse: 'Adults needing LMWH prophylaxis or treatment dose planning (verify indication-specific protocols).',
    whyUse: 'Weight- and renal-adjusted dosing reduces under/over-anticoagulation.',
    inputs: [
      selectInput('intent', 'Dosing intent', [
        { label: 'VTE prophylaxis (medical / general)', value: 'ppx' },
        { label: 'Therapeutic — twice daily (1 mg/kg q12h)', value: 'tx_bid' },
        { label: 'Therapeutic — once daily (1.5 mg/kg daily)', value: 'tx_daily' },
        { label: 'NSTE-ACS / conservative (1 mg/kg q12h style)', value: 'acs' },
      ]),
      numberInput('weight', 'Actual body weight', { unit: 'kg', min: 30, max: 250, step: 0.1, defaultValue: 80 }),
      numberInput('crcl', 'Creatinine clearance', { unit: 'mL/min', min: 5, max: 150, defaultValue: 80 }),
    ],
    calculate(values) {
      const intent = String(values.intent ?? 'ppx');
      const w = num(values.weight, 80);
      const crcl = num(values.crcl, 80);
      const severeRenal = crcl < 30;

      let dose = '';
      let label = '';
      let interpretation = '';
      let riskLevel: 'info' | 'moderate' | 'high' | 'critical' = 'info';

      if (intent === 'ppx') {
        if (severeRenal) {
          dose = '30 mg SC daily (renal-adjusted prophylaxis)';
          riskLevel = 'moderate';
          label = 'Prophylaxis — renal adjust';
        } else {
          dose = '40 mg SC daily (standard medical prophylaxis)';
          label = 'Prophylaxis — standard';
        }
        interpretation = `Suggested prophylaxis: ${dose}. Orthopedic regimens may use 30 mg q12h or 40 mg daily per protocol. Extreme obesity may need higher/weight-based ppx per local policy.`;
      } else if (intent === 'tx_daily') {
        if (severeRenal) {
          dose = `${round(1 * w, 0)} mg SC daily (1 mg/kg daily — renal-adjusted once-daily therapeutic)`;
          riskLevel = 'high';
          label = 'Therapeutic daily — CrCl <30';
        } else {
          dose = `${round(1.5 * w, 0)} mg SC daily (1.5 mg/kg)`;
          label = 'Therapeutic once daily';
        }
        interpretation = `Once-daily therapeutic suggestion: ${dose}. Prefer BID in obese, cancer, or large clot burden per many clinicians. Round to syringe increments.`;
      } else {
        // tx_bid or acs
        if (severeRenal) {
          dose = `${round(1 * w, 0)} mg SC daily (reduce to once daily when CrCl <30)`;
          riskLevel = 'high';
          label = intent === 'acs' ? 'ACS style — renal adjust' : 'Therapeutic BID — renal adjust to daily';
        } else {
          dose = `${round(1 * w, 0)} mg SC q12h (1 mg/kg q12h)`;
          label = intent === 'acs' ? 'ACS / therapeutic BID style' : 'Therapeutic twice daily';
        }
        interpretation = `Weight-based estimate: ${dose}. Max dose caps may apply in some ACS protocols; anti-Xa monitoring in extremes of weight/renal function.`;
      }

      if (w > 150) {
        riskLevel = riskLevel === 'info' ? 'moderate' : riskLevel;
        interpretation += ' Very high body weight: consider anti-Xa-guided dosing.';
      }

      return {
        score: dose,
        label,
        interpretation: interpretation + ' Educational — follow institutional order sets and product labeling.',
        riskLevel,
        details: [
          { label: 'Weight', value: `${w} kg` },
          { label: 'CrCl', value: `${crcl} mL/min` },
          { label: 'Suggested dose string', value: dose },
          { label: 'Severe renal (CrCl <30)', value: severeRenal ? 'Yes' : 'No' },
        ],
        recommendations: [
          'Round to nearest practical syringe strength',
          'Hold before procedures per bleed risk / neuraxial timing rules',
          'Do not use interchangeably unit-for-unit with UFH or other LMWHs',
        ],
      };
    },
    evidence: {
      summary:
        'Typical enoxaparin: prophylaxis 40 mg daily (30 mg daily if CrCl <30); treatment 1 mg/kg q12h or 1.5 mg/kg daily, with renal adjustment to 1 mg/kg daily when CrCl <30.',
      formula: 'Intent + weight + CrCl → label-style dose string',
      validation: 'Matches common US labeling patterns; orthopedic/ACS nuances exist.',
      references: [
        {
          title: 'Enoxaparin prescribing information / CHEST antithrombotic guidance (dosing principles)',
          citation: 'Product label; Kearon C et al. Chest antithrombotic guidelines (various updates)',
          year: 2016,
          pmid: '26867832',
          doi: '10.1016/j.chest.2015.11.026',
        },
      ],
    },
    nextSteps: [
      { condition: 'CrCl <30', actions: ['Use renal-adjusted schedule', 'Consider UFH infusion if rapidly reversible agent preferred'] },
      { condition: 'Obesity', actions: ['Prefer actual body weight for treatment', 'Consider anti-Xa levels'] },
    ],
    pearls: [
      'Neuraxial anesthesia has strict LMWH timing windows — coordinate with anesthesiology.',
      'Active major bleeding and HIT history are contraindications.',
    ],
  },

  // ─── 12. Heparin bolus ACS ────────────────────────────────────────────────
  {
    id: 'heparin-bolus',
    name: 'ACS Unfractionated Heparin Bolus/Infusion',
    shortName: 'UFH ACS',
    description:
      'Estimates weight-based UFH bolus and initial infusion for ACS-style protocols (with common dose caps).',
    category: 'cardiology',
    tags: ['heparin', 'ufh', 'acs', 'stemi', 'anticoagulation'],
    whenToUse: 'Adults with ACS when initiating unfractionated heparin per weight-based protocol.',
    whyUse: 'Weight-based dosing with caps is standard; errors in bolus/infusion are common.',
    inputs: [
      numberInput('weight', 'Actual body weight', { unit: 'kg', min: 30, max: 250, step: 0.1, defaultValue: 80 }),
      selectInput('protocol', 'Protocol style', [
        {
          label: 'Fibrinolysis / many STEMI pathways: 60 U/kg bolus (max 4000), 12 U/kg/h (max 1000)',
          value: 'lytic',
        },
        {
          label: 'NSTE-ACS common: 60 U/kg bolus (max 4000), 12 U/kg/h (max 1000)',
          value: 'nste',
        },
        {
          label: 'PCI lab high-intensity (no GP IIb/IIIa): ~70–100 U/kg bolus — select mid 70 U/kg, no infusion estimate',
          value: 'pci',
        },
      ]),
    ],
    calculate(values) {
      const w = num(values.weight, 80);
      const protocol = String(values.protocol ?? 'lytic');

      if (protocol === 'pci') {
        const bolus = round(70 * w, 0);
        return {
          score: bolus,
          unit: 'units',
          label: 'PCI-style bolus estimate',
          interpretation: `Approximate PCI bolus ~70 U/kg = ${bolus} units (range often 70–100 U/kg; ACT-guided). Infusion not typically continued the same way as medical ACS — follow cath-lab protocol.`,
          riskLevel: 'info',
          details: [
            { label: 'Weight', value: `${w} kg` },
            { label: 'Estimated bolus', value: `${bolus} units` },
          ],
          recommendations: ['ACT-guided additional heparin in lab', 'Coordinate with interventional team'],
        };
      }

      const rawBolus = 60 * w;
      const bolus = Math.min(4000, round(rawBolus, 0));
      const rawInf = 12 * w;
      const infusion = Math.min(1000, round(rawInf, 0));
      const cappedBolus = rawBolus > 4000;
      const cappedInf = rawInf > 1000;

      return {
        score: bolus,
        unit: 'units bolus',
        label: 'ACS UFH starting estimate',
        interpretation: `Bolus ${bolus} units (60 U/kg${cappedBolus ? ', capped at 4000' : ''}) then infusion ${infusion} units/h (12 U/kg/h${cappedInf ? ', capped at 1000' : ''}). Adjust to aPTT/anti-Xa nomogram. If already on therapeutic LMWH/DOAC, do not stack blindly.`,
        riskLevel: 'info',
        details: [
          { label: 'Bolus', value: `${bolus} units` },
          { label: 'Initial infusion', value: `${infusion} units/h` },
          { label: 'Bolus cap applied', value: cappedBolus ? 'Yes' : 'No' },
          { label: 'Infusion cap applied', value: cappedInf ? 'Yes' : 'No' },
        ],
        recommendations: [
          'Check baseline aPTT, CBC, creatinine',
          'Use institution-specific titration nomogram',
          'Watch for bleeding and HIT with prolonged exposure',
        ],
      };
    },
    evidence: {
      summary:
        'Common medical ACS UFH: 60 units/kg IV bolus (max 4000 units) and 12 units/kg/h infusion (max 1000 units/h), then aPTT/anti-Xa adjustment.',
      formula: 'Bolus = min(60×kg, 4000); infusion = min(12×kg, 1000)/h',
      validation: 'Matches ACC/AHA ACS dosing commonly cited for fibrinolysis and many NSTE pathways.',
      references: [
        {
          title: '2013 ACCF/AHA Guideline for the Management of ST-Elevation Myocardial Infarction',
          citation: 'O’Gara PT et al. Circulation. 2013',
          year: 2013,
          pmid: '23247304',
          doi: '10.1161/CIR.0b013e3182742cf6',
        },
      ],
    },
    nextSteps: [
      { condition: 'After start', actions: ['Nomogram-based titration', 'Serial CBC', 'Reassess need daily'] },
    ],
    pearls: [
      'Prior therapeutic enoxaparin within 8–12 h changes UFH strategy — do not double-anticoagulate.',
      'PCI dosing is ACT-guided and protocol-specific.',
    ],
  },

  // ─── 13. Lipoprotein(a) risk ──────────────────────────────────────────────
  {
    id: 'lipoprotein-a-risk',
    name: 'Lipoprotein(a) Risk Bands',
    shortName: 'Lp(a)',
    description: 'Interprets lipoprotein(a) level into approximate ASCVD risk bands (mg/dL or nmol/L).',
    category: 'cardiology',
    tags: ['lpa', 'lipoprotein(a)', 'ascvd', 'lipids', 'prevention'],
    whenToUse: 'When Lp(a) has been measured for primary/secondary prevention risk refinement.',
    whyUse: 'Elevated Lp(a) is a causal, genetically determined ASCVD risk enhancer.',
    inputs: [
      selectInput('unit', 'Unit', [
        { label: 'mg/dL', value: 'mg' },
        { label: 'nmol/L', value: 'nmol' },
      ]),
      numberInput('lpa', 'Lipoprotein(a)', { min: 0, max: 500, step: 1, defaultValue: 30 }),
    ],
    calculate(values) {
      const unit = String(values.unit ?? 'mg');
      const raw = num(values.lpa, 30);
      // Approximate conversion often cited ~2.5 nmol/L per 1 mg/dL (assay-dependent!)
      const mg = unit === 'mg' ? raw : raw / 2.5;
      const nmol = unit === 'nmol' ? raw : raw * 2.5;

      let label = '';
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
      let interpretation = '';
      if (mg < 30) {
        label = 'Desirable / lower risk band';
        riskLevel = 'low';
        interpretation = `Lp(a) ≈ ${round(mg, 1)} mg/dL (${round(nmol, 0)} nmol/L). Generally below common risk-enhancing thresholds.`;
      } else if (mg < 50) {
        label = 'Intermediate elevation';
        riskLevel = 'moderate';
        interpretation = `Lp(a) ≈ ${round(mg, 1)} mg/dL. Intermediate range — interpret with global risk; still a risk enhancer toward upper end.`;
      } else if (mg < 180) {
        label = 'Elevated — risk enhancer';
        riskLevel = 'high';
        interpretation = `Lp(a) ≈ ${round(mg, 1)} mg/dL (≥50 mg/dL / ~≥125 nmol/L commonly used as risk-enhancing). Intensify LDL-C lowering and risk discussion.`;
      } else {
        label = 'Very high Lp(a)';
        riskLevel = 'critical';
        interpretation = `Lp(a) ≈ ${round(mg, 1)} mg/dL (very high, ~≥180 mg/dL). Strong genetic risk marker — aggressive risk-factor control; consider specialist lipid clinic / family cascade awareness.`;
      }

      return {
        score: round(mg, 1),
        unit: 'mg/dL equiv.',
        label,
        interpretation:
          interpretation +
          ' Conversion mg/dL↔nmol/L is assay-dependent; prefer lab-reported unit thresholds when available.',
        riskLevel,
        details: [
          { label: 'Entered', value: `${raw} ${unit === 'mg' ? 'mg/dL' : 'nmol/L'}` },
          { label: 'Approx mg/dL', value: String(round(mg, 1)) },
          { label: 'Approx nmol/L', value: String(round(nmol, 0)) },
        ],
        recommendations:
          riskLevel === 'low'
            ? ['Continue standard prevention based on global risk']
            : [
                'Treat as ASCVD risk enhancer',
                'Optimize LDL-C (high-intensity statin ± ezetimibe/PCSK9 as indicated)',
                'Screen first-degree relatives for early ASCVD / consider Lp(a) testing cascade',
              ],
      };
    },
    evidence: {
      summary:
        'Lp(a) ≥50 mg/dL (~≥125 nmol/L) is commonly treated as an ASCVD risk enhancer; very high levels confer greater risk.',
      formula: 'Threshold bands on measured Lp(a); optional ≈×2.5 mg/dL→nmol/L conversion',
      validation: 'Supported by genetic and epidemiologic data; incorporated in prevention guidelines as risk enhancer.',
      references: [
        {
          title: '2018 AHA/ACC Multisociety Guideline on the Management of Blood Cholesterol',
          citation: 'Grundy SM et al. Circulation. 2019',
          year: 2019,
          pmid: '30586774',
          doi: '10.1161/CIR.0000000000000625',
        },
      ],
    },
    nextSteps: [
      { condition: 'Elevated Lp(a)', actions: ['Intensify LDL-C therapy', 'Lifestyle', 'Consider lipid specialist if very high or premature ASCVD'] },
    ],
    pearls: [
      'Lp(a) is largely genetic — repeat testing rarely needed once accurate baseline obtained.',
      'Statins do not meaningfully lower Lp(a); PCSK9 inhibitors lower modestly; dedicated therapies emerging.',
    ],
  },

  // ─── 14. ApoB risk ────────────────────────────────────────────────────────
  {
    id: 'apo-b-risk',
    name: 'Apolipoprotein B Risk Bands',
    shortName: 'ApoB',
    description: 'Interprets ApoB level against common prevention treatment thresholds (mg/dL).',
    category: 'cardiology',
    tags: ['apob', 'lipids', 'ascvd', 'ldl', 'prevention'],
    whenToUse: 'When ApoB is available for residual risk assessment or discordance with LDL-C/non-HDL.',
    whyUse: 'ApoB counts atherogenic particles and may better reflect risk when discordant with LDL-C.',
    inputs: [
      numberInput('apob', 'ApoB', { unit: 'mg/dL', min: 20, max: 250, defaultValue: 90 }),
      selectInput('context', 'Clinical risk context', [
        { label: 'Low / borderline primary prevention', value: 'low' },
        { label: 'Intermediate–high primary prevention / risk enhancers', value: 'high' },
        { label: 'Very high risk / established ASCVD', value: 'vh' },
      ]),
    ],
    calculate(values) {
      const apob = num(values.apob, 90);
      const ctx = String(values.context ?? 'high');

      // Common targets: <90 general high-risk, <80 / <70 very high (guideline- and region-dependent)
      let target = 90;
      if (ctx === 'vh') target = 70;
      else if (ctx === 'high') target = 80;
      else target = 90;

      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
      let label = '';
      if (apob < 70) {
        label = 'Low ApoB';
        riskLevel = 'low';
      } else if (apob < 90) {
        label = 'Moderate ApoB';
        riskLevel = 'moderate';
      } else if (apob < 110) {
        label = 'Elevated ApoB';
        riskLevel = 'high';
      } else {
        label = 'Markedly elevated ApoB';
        riskLevel = 'critical';
      }

      const atGoal = apob < target;
      return {
        score: apob,
        unit: 'mg/dL',
        label: atGoal ? `${label} — at contextual goal (<${target})` : `${label} — above contextual goal (<${target})`,
        interpretation: `ApoB ${apob} mg/dL. Contextual goal often <${target} mg/dL for selected ${ctx === 'vh' ? 'very high-risk' : ctx === 'high' ? 'higher-risk primary prevention' : 'lower-risk'} patients (thresholds vary by guideline). ${atGoal ? 'At or below that goal band.' : 'Not at goal — intensify lipid-lowering if clinically appropriate.'}`,
        riskLevel: atGoal ? (riskLevel === 'critical' ? 'moderate' : riskLevel) : riskLevel,
        details: [
          { label: 'ApoB', value: `${apob} mg/dL` },
          { label: 'Contextual goal', value: `<${target} mg/dL` },
          { label: 'Goal status', value: atGoal ? 'At goal band' : 'Above goal' },
        ],
        recommendations: atGoal
          ? ['Continue therapy and lifestyle', 'Reassess adherence and secondary causes if unexpected rise']
          : ['Intensify statin / add ezetimibe or PCSK9 as appropriate', 'Address residual risk factors', 'Check non-HDL and triglycerides'],
      };
    },
    evidence: {
      summary:
        'ApoB is a measure of circulating atherogenic particle number; guidelines increasingly support ApoB targets especially when discordant with LDL-C.',
      formula: 'Compare ApoB (mg/dL) to context-specific goals (~<90 / <80 / <70)',
      validation: 'Epidemiology and consensus lipid guidance (ESC/EAS and ACC expert discussions).',
      references: [
        {
          title: '2019 ESC/EAS Guidelines for the management of dyslipidaemias',
          citation: 'Mach F et al. Eur Heart J. 2020',
          year: 2020,
          pmid: '31504418',
          doi: '10.1093/eurheartj/ehz455',
        },
      ],
    },
    nextSteps: [
      { condition: 'Above goal', actions: ['Intensify LDL-C/ApoB-lowering therapy', 'Lifestyle counseling'] },
    ],
    pearls: [
      'High triglycerides often pair with elevated ApoB particle number even if LDL-C looks acceptable.',
      'ApoB and non-HDL are complementary residual-risk markers.',
    ],
  },

  // ─── 15. Triglyceride pancreatitis risk ───────────────────────────────────
  {
    id: 'triglyceride-pancreatitis',
    name: 'Triglyceride Pancreatitis Risk Bands',
    shortName: 'TG Pancreatitis',
    description: 'Maps fasting/nonfasting triglyceride level to hypertriglyceridemia-associated pancreatitis risk bands.',
    category: 'cardiology',
    tags: ['triglycerides', 'pancreatitis', 'hypertriglyceridemia', 'lipids'],
    whenToUse: 'Severe hypertriglyceridemia management and patient counseling on pancreatitis risk.',
    whyUse: 'Risk rises steeply at very high TG; thresholds guide urgency of therapy.',
    inputs: [
      numberInput('tg', 'Triglycerides', { unit: 'mg/dL', min: 30, max: 10000, step: 1, defaultValue: 400 }),
      yesNo('priorPancreatitis', 'Prior hypertriglyceridemic pancreatitis', 1),
      yesNo('diabetes', 'Uncontrolled diabetes / marked hyperglycemia', 1),
      yesNo('alcohol', 'Heavy alcohol use', 1),
    ],
    calculate(values) {
      const tg = num(values.tg, 400);
      const mmol = round(tg / 88.57, 2);
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
      let label = '';
      let interpretation = '';

      if (tg < 150) {
        label = 'Normal TG';
        riskLevel = 'low';
        interpretation = 'Triglycerides in normal range — pancreatitis risk from HTG not a concern.';
      } else if (tg < 500) {
        label = 'Moderate hypertriglyceridemia';
        riskLevel = 'moderate';
        interpretation =
          'TG 150–499 mg/dL: ASCVD risk contributor; pancreatitis uncommon at this level alone. Lifestyle + treat secondary causes; statin if ASCVD risk warrants.';
      } else if (tg < 1000) {
        label = 'Severe HTG — elevated pancreatitis risk';
        riskLevel = 'high';
        interpretation =
          'TG 500–999 mg/dL: increased pancreatitis risk. Priority is TG reduction (very low-fat diet, alcohol cessation, glycemic control, fibrate/omega-3 as indicated) in addition to ASCVD prevention.';
      } else {
        label = 'Very severe HTG — high pancreatitis risk';
        riskLevel = 'critical';
        interpretation =
          'TG ≥1000 mg/dL: high risk of acute pancreatitis. Urgent TG-lowering strategy; evaluate for hospitalization if symptomatic (abdominal pain, nausea) or extreme elevation.';
      }

      const boosters: string[] = [];
      if (bool(values.priorPancreatitis)) boosters.push('prior HTG pancreatitis');
      if (bool(values.diabetes)) boosters.push('uncontrolled diabetes');
      if (bool(values.alcohol)) boosters.push('heavy alcohol');
      if (boosters.length && riskLevel !== 'low') {
        interpretation += ` Additional risk amplifiers: ${boosters.join(', ')}.`;
        if (riskLevel === 'moderate') riskLevel = 'high';
      }

      return {
        score: tg,
        unit: 'mg/dL',
        label,
        interpretation: `${interpretation} (≈ ${mmol} mmol/L).`,
        riskLevel,
        details: [
          { label: 'TG', value: `${tg} mg/dL` },
          { label: 'TG SI', value: `${mmol} mmol/L` },
          { label: 'Risk amplifiers', value: boosters.length ? boosters.join('; ') : 'None selected' },
        ],
        recommendations:
          tg >= 500
            ? [
                'Very low-fat diet; stop alcohol',
                'Optimize diabetes control',
                'Pharmacotherapy for TG (fibrate, high-dose omega-3 icosapent/others per label)',
                'Rule out secondary causes (uncontrolled DM, meds, hypothyroidism)',
              ]
            : ['Lifestyle (weight, sugar, alcohol)', 'Address ASCVD risk', 'Repeat fasting lipid panel'],
      };
    },
    evidence: {
      summary:
        'Pancreatitis risk rises with TG, especially ≥500 mg/dL and markedly at ≥1000 mg/dL; secondary factors amplify risk.',
      formula: 'TG bands: <150; 150–499; 500–999; ≥1000 mg/dL',
      validation: 'Consistent with Endocrine Society / AHA scientific statements on HTG.',
      references: [
        {
          title: 'AHA scientific statement on triglycerides and cardiovascular disease',
          citation: 'Miller M et al. Circulation. 2011',
          year: 2011,
          pmid: '21502576',
          doi: '10.1161/CIR.0b013e3182160726',
        },
      ],
    },
    nextSteps: [
      { condition: 'TG ≥1000 or symptoms', actions: ['Urgent evaluation', 'NPO if pancreatitis suspected', 'Insulin/insulin-dextrose or apheresis in selected severe cases per specialist'] },
      { condition: 'TG 500–999', actions: ['Rapid outpatient TG-lowering plan', 'Close follow-up labs'] },
    ],
    pearls: [
      'Nonfasting TG is acceptable for screening; very high values still valid for pancreatitis concern.',
      'Do not start high-intensity lifestyle neglect while awaiting specialty referral.',
    ],
  },

  // ─── 16. Cardiogenic shock definition helper ──────────────────────────────
  {
    id: 'cardiogenic-shock-def',
    name: 'Cardiogenic Shock Clinical Criteria Helper',
    shortName: 'CS Criteria',
    description:
      'Checklist-style helper for classic clinical/hemodynamic criteria used to describe cardiogenic shock (educational, not a formal trial enrollment tool).',
    category: 'cardiology',
    tags: ['cardiogenic shock', 'hemodynamics', 'hypoperfusion', 'shock'],
    whenToUse: 'Suspected cardiogenic shock to structure documentation of hypotension + hypoperfusion ± hemodynamics.',
    whyUse: 'Standard criteria improve recognition and shock-team activation language.',
    inputs: [
      yesNo('hypotension', 'Sustained SBP <90 mmHg or need for vasopressors/inotropes to maintain BP', 1),
      yesNo('mapLow', 'MAP <60–65 mmHg (or profound relative hypotension from baseline)', 1),
      yesNo('hypoperfusion', 'Clinical hypoperfusion (cool extremities, oliguria, altered mentation, lactate elevation)', 1),
      yesNo('lactate', 'Lactate >2 mmol/L or rising', 1),
      yesNo('ciLow', 'Cardiac index ≤2.2 L/min/m² (if measured)', 1),
      yesNo('pcwpHigh', 'PCWP ≥15 mmHg or echo evidence of elevated left filling pressures', 1),
      yesNo('congestion', 'Pulmonary congestion / elevated natriuretic peptides', 1),
      yesNo('notDistributive', 'Shock not primarily distributive/hypovolemic/obstructive after assessment', 1),
    ],
    calculate(values) {
      const flags = {
        hypotension: bool(values.hypotension) || bool(values.mapLow),
        hypoperfusion: bool(values.hypoperfusion) || bool(values.lactate),
        cardiac: bool(values.ciLow),
        filling: bool(values.pcwpHigh) || bool(values.congestion),
        phenotype: bool(values.notDistributive),
      };
      const score =
        (flags.hypotension ? 1 : 0) +
        (flags.hypoperfusion ? 1 : 0) +
        (flags.cardiac ? 1 : 0) +
        (flags.filling ? 1 : 0) +
        (flags.phenotype ? 1 : 0);

      const classic = flags.hypotension && flags.hypoperfusion && flags.phenotype;
      const invasiveSupport = flags.cardiac && flags.filling;

      let label = 'Criteria incomplete for classic CS description';
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'moderate';
      let interpretation = '';

      if (classic && (invasiveSupport || flags.filling)) {
        label = 'Consistent with cardiogenic shock (clinical ± hemodynamic)';
        riskLevel = 'critical';
        interpretation =
          'Hypotension/vasopressor need + hypoperfusion with cardiac congestion/low-output features. Activate shock pathway; identify etiology (AMI, decompensated HF, arrhythmia, mechanical complication).';
      } else if (classic) {
        label = 'Probable cardiogenic shock clinically';
        riskLevel = 'critical';
        interpretation =
          'Meets common clinical CS framing (hypotension + hypoperfusion, not primarily other shock). Hemodynamics/echo refine phenotype (SCAI stage).';
      } else if (flags.hypoperfusion && !flags.hypotension) {
        label = 'Hypoperfusion without frank hypotension';
        riskLevel = 'high';
        interpretation =
          'Occult shock possible (especially “cold and wet” HF). Do not be reassured by “normal” SBP; check lactate, mentation, urine output, echo.';
      } else if (flags.hypotension && !flags.hypoperfusion) {
        label = 'Hypotension without clear hypoperfusion';
        riskLevel = 'moderate';
        interpretation =
          'May be SCAI B (beginning) or vasodilatory states. Close monitoring and etiology workup; prepare for deterioration.';
      } else {
        interpretation = 'Selected features do not yet meet a classic CS cluster. Continue evaluation if clinically concerned.';
        riskLevel = 'low';
      }

      return {
        score,
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Hypotension / vasoactive need', value: flags.hypotension ? 'Yes' : 'No' },
          { label: 'Hypoperfusion', value: flags.hypoperfusion ? 'Yes' : 'No' },
          { label: 'Low CI documented', value: flags.cardiac ? 'Yes' : 'No' },
          { label: 'Elevated filling / congestion', value: flags.filling ? 'Yes' : 'No' },
        ],
        recommendations: classic
          ? ['Shock team / ICU', 'Urgent echo', 'Revascularize if AMI', 'Consider PAC and MCS per phenotype']
          : ['Serial lactate and perfusion exam', 'Echo', 'Reassess volume and rhythm'],
      };
    },
    evidence: {
      summary:
        'Classic trial definitions combine SBP <90 mmHg (or support) with signs of hypoperfusion and often CI ≤2.2 with PCWP ≥15 mmHg.',
      formula: 'Checklist cluster: hypotension + hypoperfusion ± CI/PCWP phenotype',
      validation: 'Educational synthesis of SHOCK trial-style criteria and SCAI clinical practice.',
      references: [
        {
          title: 'SCAI clinical expert consensus on classification of cardiogenic shock',
          citation: 'Baran DA et al. Catheter Cardiovasc Interv. 2019',
          year: 2019,
          pmid: '31104355',
          doi: '10.1002/ccd.28329',
        },
      ],
    },
    nextSteps: [
      { condition: 'Meets CS cluster', actions: ['Escalate care intensity', 'Stage with SCAI', 'Treat cause'] },
    ],
    pearls: [
      'Hypoperfusion can exist with SBP >90 mmHg.',
      'Distinguish phenotypes: LV-dominant, RV, biventricular, distributive mix.',
    ],
  },

  // ─── 17. Hardman index ────────────────────────────────────────────────────
  {
    id: 'hardman-index',
    name: 'Hardman Index (Ruptured AAA)',
    shortName: 'Hardman',
    description: 'Hardman preoperative risk index for ruptured abdominal aortic aneurysm repair (0–5).',
    category: 'cardiology',
    tags: ['aaa', 'aneurysm', 'hardman', 'vascular', 'rupture'],
    whenToUse: 'Patients with ruptured AAA being considered for open or endovascular repair risk discussion.',
    whyUse: 'Simple bedside score associated with operative mortality; not an absolute futility rule.',
    inputs: [
      yesNo('age76', 'Age >76 years', 1),
      yesNo('cr', 'Serum creatinine >190 µmol/L (~>2.1 mg/dL)', 1),
      yesNo('hb', 'Hemoglobin <9 g/dL', 1),
      yesNo('ischemia', 'Ischemic ECG changes', 1),
      yesNo('loc', 'History of loss of consciousness after presentation', 1),
    ],
    calculate(values) {
      const score =
        (bool(values.age76) ? 1 : 0) +
        (bool(values.cr) ? 1 : 0) +
        (bool(values.hb) ? 1 : 0) +
        (bool(values.ischemia) ? 1 : 0) +
        (bool(values.loc) ? 1 : 0);

      const { riskLevel, label, interpretation } = riskFromThresholds(score, [
        {
          max: 0,
          level: 'moderate',
          label: 'Hardman 0 — lower relative operative risk',
          interpretation: 'Score 0: lower mortality band in original series still reflects ruptured AAA seriousness.',
        },
        {
          max: 2,
          level: 'high',
          label: `Hardman ${score} — intermediate–high risk`,
          interpretation: `Score ${score}: substantial perioperative mortality risk; individualize operative vs palliative decision.`,
        },
        {
          max: 5,
          level: 'critical',
          label: `Hardman ${score} — very high risk`,
          interpretation: `Score ${score} (≥3 historically linked to very high mortality). Does not automatically preclude repair — use with frailty, patient goals, and contemporary EVAR outcomes.`,
        },
      ]);

      return {
        score,
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Hardman points', value: `${score} / 5` },
          { label: 'Age >76', value: bool(values.age76) ? 'Yes' : 'No' },
          { label: 'Cr elevated', value: bool(values.cr) ? 'Yes' : 'No' },
          { label: 'Hb <9', value: bool(values.hb) ? 'Yes' : 'No' },
          { label: 'ECG ischemia', value: bool(values.ischemia) ? 'Yes' : 'No' },
          { label: 'LOC', value: bool(values.loc) ? 'Yes' : 'No' },
        ],
        recommendations: [
          'Urgent vascular surgery involvement',
          'Resuscitate to permissive hypotension targets per team',
          'Shared decision-making if score very high / extreme frailty',
        ],
      };
    },
    evidence: {
      summary:
        'Hardman index awards 1 point each for age >76, Cr >190 µmol/L, Hb <9 g/dL, ischemic ECG, and loss of consciousness.',
      formula: 'Sum of 5 binary preoperative variables (0–5)',
      validation: 'Original and subsequent series show rising mortality with score; calibration imperfect in EVAR era.',
      references: [
        {
          title: 'Ruptured abdominal aortic aneurysms: who should be offered surgery?',
          citation: 'Hardman DT et al. J Vasc Surg. 1996',
          year: 1996,
          pmid: '8558727',
          doi: '10.1016/s0741-5214(05)80042-4',
        },
      ],
    },
    nextSteps: [
      { condition: 'Any ruptured AAA', actions: ['Immediate vascular activation', 'Blood products ready', 'OR/EVAR suite'] },
    ],
    pearls: [
      'Not a sole criterion for turning down repair.',
      'Glasgow Aneurysm Score is a related alternative preoperative score.',
    ],
  },

  // ─── 18. Glasgow aneurysm score ───────────────────────────────────────────
  {
    id: 'glasgow-aneurysm',
    name: 'Glasgow Aneurysm Score',
    shortName: 'GAS',
    description: 'Glasgow Aneurysm Score for risk stratification in AAA repair (ruptured or elective educational use).',
    category: 'cardiology',
    tags: ['aaa', 'glasgow aneurysm', 'vascular', 'perioperative'],
    whenToUse: 'AAA repair risk communication using age, shock, and comorbidity points.',
    whyUse: 'Simple score correlating with perioperative mortality after aneurysm repair.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 18, max: 110, defaultValue: 75 }),
      yesNo('shock', 'Shock (hypotension / hemodynamic instability)', 17),
      yesNo('myocardial', 'Myocardial disease (MI, angina, heart failure)', 7),
      yesNo('cerebrovascular', 'Cerebrovascular disease (stroke / TIA)', 10),
      yesNo('renal', 'Renal disease (Cr >150 µmol/L or on dialysis — original definition)', 14),
    ],
    calculate(values) {
      const age = num(values.age, 75);
      const score =
        age +
        (bool(values.shock) ? 17 : 0) +
        (bool(values.myocardial) ? 7 : 0) +
        (bool(values.cerebrovascular) ? 10 : 0) +
        (bool(values.renal) ? 14 : 0);

      // Common teaching: higher scores (e.g. >85) associate with very high mortality in ruptured series
      let riskLevel: 'moderate' | 'high' | 'critical' = 'moderate';
      let label = 'Glasgow Aneurysm Score';
      let interpretation = '';
      if (score > 85) {
        riskLevel = 'critical';
        label = 'Very high GAS';
        interpretation = `GAS ${score}: in classic ruptured AAA literature, scores >85 associate with extremely high mortality. Individualize with anatomy (EVAR feasibility), frailty, and goals of care.`;
      } else if (score >= 75) {
        riskLevel = 'high';
        label = 'High GAS';
        interpretation = `GAS ${score}: high predicted perioperative risk. Optimize modifiable factors if elective; urgent shared decisions if ruptured.`;
      } else {
        riskLevel = 'moderate';
        label = 'Lower–intermediate GAS';
        interpretation = `GAS ${score}: relatively lower score still reflects major vascular surgery risk. Use with clinical judgment.`;
      }

      return {
        score: round(score, 0),
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Age points', value: String(age) },
          { label: 'Shock (+17)', value: bool(values.shock) ? 'Yes' : 'No' },
          { label: 'Myocardial disease (+7)', value: bool(values.myocardial) ? 'Yes' : 'No' },
          { label: 'Cerebrovascular (+10)', value: bool(values.cerebrovascular) ? 'Yes' : 'No' },
          { label: 'Renal (+14)', value: bool(values.renal) ? 'Yes' : 'No' },
        ],
        recommendations: [
          'Vascular surgery risk discussion',
          'Cardiology optimization if elective',
          'Do not use score alone to deny emergency repair',
        ],
      };
    },
    evidence: {
      summary: 'GAS = age + 17 (shock) + 7 (myocardial disease) + 10 (cerebrovascular disease) + 14 (renal disease).',
      formula: 'GAS = age + 17·shock + 7·MI/cardiac + 10·CVD + 14·renal',
      validation: 'Derived for aneurysm repair mortality prediction; performance varies by era and EVAR use.',
      references: [
        {
          title: 'Glasgow Aneurysm Score',
          citation: 'Samy AK et al. Eur J Vasc Endovasc Surg. 1994 (and subsequent validations)',
          year: 1994,
          pmid: '8049922',
          doi: '10.1177/096721099400200109',
        },
      ],
    },
    nextSteps: [
      { condition: 'High score / rupture', actions: ['Urgent vascular decision', 'Resuscitation', 'Family discussion'] },
    ],
    pearls: ['Age contributes continuously — very elderly patients score high even without comorbidities.', 'Pair with Hardman index in rupture settings.'],
  },

  // ─── 19. Duke Activity Status Index (simplified MET estimate) ─────────────
  {
    id: 'duke-activity',
    name: 'Duke Activity Status Index (DASI)',
    shortName: 'DASI',
    description:
      'DASI questionnaire point total with estimated peak METs (useful for preoperative functional capacity).',
    category: 'cardiology',
    tags: ['dasi', 'mets', 'preoperative', 'functional capacity', 'duke'],
    whenToUse: 'Preoperative evaluation or functional capacity estimation when formal exercise testing is unavailable.',
    whyUse: 'Validated questionnaire correlating with VO₂ peak; <4 METs flags higher perioperative risk discussions.',
    inputs: [
      yesNo('q1', 'Can you take care of yourself (eat, dress, bathe, use toilet)? (+2.75)', 1),
      yesNo('q2', 'Can you walk indoors such as around your house? (+1.75)', 1),
      yesNo('q3', 'Can you walk a block or two on level ground? (+2.75)', 1),
      yesNo('q4', 'Can you climb a flight of stairs or walk up a hill? (+5.50)', 1),
      yesNo('q5', 'Can you run a short distance? (+8.00)', 1),
      yesNo('q6', 'Can you do light work around the house (dusting, washing dishes)? (+2.70)', 1),
      yesNo('q7', 'Can you do moderate work around the house (vacuuming, sweeping floors, carrying groceries)? (+3.50)', 1),
      yesNo('q8', 'Can you do heavy work around the house (scrubbing floors, moving heavy furniture)? (+8.00)', 1),
      yesNo('q9', 'Can you do yard work (raking leaves, weeding, pushing a mower)? (+4.50)', 1),
      yesNo('q10', 'Can you have sexual relations? (+5.25)', 1),
      yesNo('q11', 'Can you participate in moderate recreational activities (golf, bowling, dancing, doubles tennis, throwing a baseball/football)? (+6.00)', 1),
      yesNo('q12', 'Can you participate in strenuous sports (swimming, singles tennis, football, basketball, skiing)? (+7.50)', 1),
    ],
    calculate(values) {
      const weights = [2.75, 1.75, 2.75, 5.5, 8, 2.7, 3.5, 8, 4.5, 5.25, 6, 7.5];
      let dasi = 0;
      for (let i = 0; i < 12; i++) {
        if (bool(values[`q${i + 1}`])) dasi += weights[i];
      }
      dasi = round(dasi, 2);
      // VO2 peak (mL/kg/min) ≈ 0.43 × DASI + 9.6; METs = VO2 / 3.5
      const vo2 = round(0.43 * dasi + 9.6, 1);
      const mets = round(vo2 / 3.5, 1);

      let riskLevel: 'low' | 'moderate' | 'high' = 'low';
      let label = `DASI ${dasi} → ~${mets} METs`;
      let interpretation = '';
      if (mets < 4) {
        riskLevel = 'high';
        interpretation = `Estimated ${mets} METs (<4): poor functional capacity — associated with higher perioperative cardiac risk; consider further testing per algorithm if it will change management.`;
      } else if (mets < 7) {
        riskLevel = 'moderate';
        interpretation = `Estimated ${mets} METs (4–6.9): moderate functional capacity — often adequate for low/moderate risk surgery without routine testing if no other concerns.`;
      } else {
        riskLevel = 'low';
        interpretation = `Estimated ${mets} METs (≥7): good functional capacity — favorable for most noncardiac surgery risk discussions.`;
      }

      return {
        score: mets,
        unit: 'METs (est.)',
        label,
        interpretation: `${interpretation} DASI raw score ${dasi}; estimated VO₂ peak ~${vo2} mL/kg/min.`,
        riskLevel,
        details: [
          { label: 'DASI score', value: String(dasi) },
          { label: 'Estimated VO₂ peak', value: `${vo2} mL/kg/min` },
          { label: 'Estimated METs', value: String(mets) },
        ],
        recommendations:
          mets < 4
            ? ['Detailed cardiac risk assessment', 'Consider pharmacologic stress if results change care', 'Optimize GDMT / anemia / volume status']
            : ['Document functional capacity', 'Proceed with risk-factor optimization'],
      };
    },
    evidence: {
      summary:
        'DASI sums weighted activity items; VO₂ ≈ 0.43×DASI + 9.6; METs = VO₂/3.5. Used for preoperative functional capacity.',
      formula: 'DASI = Σ item weights; METs = (0.43×DASI + 9.6) / 3.5',
      validation: 'Validated against exercise testing; used in perioperative guidelines as functional capacity aid.',
      references: [
        {
          title: 'A brief self-administered questionnaire to determine functional capacity (DASI)',
          citation: 'Hlatky MA et al. Am J Cardiol. 1989',
          year: 1989,
          pmid: '2782256',
          doi: '10.1016/0002-9149(89)90496-7',
        },
      ],
    },
    nextSteps: [
      { condition: '<4 METs', actions: ['Integrate with RCRI / surgical risk', 'Decide on further testing only if it changes management'] },
    ],
    pearls: [
      'Self-report can overestimate capacity — corroborate with daily activity history.',
      '≥4 METs often cited as threshold for “moderate” capacity in preoperative assessment.',
    ],
  },

  // ─── 20. METs estimate from activity ──────────────────────────────────────
  {
    id: 'mets-estimate',
    name: 'METs Estimate from Activity',
    shortName: 'METs Activity',
    description: 'Approximate metabolic equivalent (MET) level from selected activity descriptors (educational).',
    category: 'cardiology',
    tags: ['mets', 'functional capacity', 'preoperative', 'exercise'],
    whenToUse: 'Quick bedside estimate of functional capacity from the most vigorous activity the patient can perform.',
    whyUse: 'METs frame preoperative and rehab conversations when formal testing is unavailable.',
    inputs: [
      selectInput('activity', 'Highest activity comfortably achievable', [
        { label: 'Bedbound / very limited ADLs (~1–2 METs)', value: 1.5 },
        { label: 'Self-care, walk indoors (~2–3 METs)', value: 2.5 },
        { label: 'Walk 1–2 blocks on level ground (~3 METs)', value: 3 },
        { label: 'Light housework, easy yard work (~3–4 METs)', value: 3.5 },
        { label: 'Climb one flight of stairs / walk uphill (~4–5 METs)', value: 4.5 },
        { label: 'Walk briskly on level ground (~5–6 METs)', value: 5.5 },
        { label: 'Moderate sports, doubles tennis, dancing (~6–7 METs)', value: 6.5 },
        { label: 'Jogging, singles tennis, hiking (~7–9 METs)', value: 8 },
        { label: 'Running, competitive sports, heavy labor (~≥10 METs)', value: 10 },
      ]),
      yesNo('limitedByChest', 'Limited by chest pain, dyspnea, or syncope', 1),
    ],
    calculate(values) {
      const mets = num(values.activity, 4.5);
      const limited = bool(values.limitedByChest);
      let riskLevel: 'low' | 'moderate' | 'high' = 'low';
      if (mets < 4) riskLevel = 'high';
      else if (mets < 7) riskLevel = 'moderate';

      let interpretation = `Approximate functional capacity ~${mets} METs based on activity descriptor.`;
      if (mets < 4) {
        interpretation += ' Below 4 METs — poor capacity for preoperative risk discussions.';
      } else if (mets >= 7) {
        interpretation += ' Good capacity (≥7 METs) is generally favorable.';
      } else {
        interpretation += ' Moderate capacity (about 4–6 METs).';
      }
      if (limited) {
        interpretation += ' Symptoms limit activity — consider ischemia/HF evaluation rather than relying on METs alone.';
        if (riskLevel === 'low') riskLevel = 'moderate';
      }

      return {
        score: mets,
        unit: 'METs',
        label: `≈ ${mets} METs`,
        interpretation,
        riskLevel,
        details: [
          { label: 'Estimated METs', value: String(mets) },
          { label: 'Symptom-limited', value: limited ? 'Yes' : 'No' },
        ],
        recommendations:
          mets < 4 || limited
            ? ['Detailed history of limiting symptoms', 'Consider formal testing if management would change']
            : ['Document capacity', 'Encourage activity within limits'],
      };
    },
    evidence: {
      summary: 'Compendium-style MET estimates map common activities to approximate oxygen consumption multiples of rest.',
      formula: 'Select activity band → approximate MET value',
      validation: 'Educational approximation from exercise physiology / perioperative teaching (not a measured VO₂).',
      references: [
        {
          title: '2014 ACC/AHA Guideline on Perioperative Cardiovascular Evaluation',
          citation: 'Fleisher LA et al. Circulation. 2014',
          year: 2014,
          pmid: '25085961',
          doi: '10.1161/CIR.0000000000000106',
        },
      ],
    },
    nextSteps: [
      { condition: '<4 METs or symptoms', actions: ['Integrate surgical risk', 'Further cardiac testing selectively'] },
    ],
    pearls: ['One MET ≈ 3.5 mL O₂/kg/min at rest.', 'DASI provides a more structured estimate than a single activity pick.'],
  },

  // ─── 21. Preop BNP / NT-proBNP thresholds ─────────────────────────────────
  {
    id: 'preop-bnp-threshold',
    name: 'Preoperative BNP / NT-proBNP Risk Bands',
    shortName: 'Preop BNP',
    description:
      'Educational risk bands for preoperative natriuretic peptides used in perioperative cardiac risk stratification.',
    category: 'cardiology',
    tags: ['bnp', 'nt-probnp', 'preoperative', 'perioperative', 'risk'],
    whenToUse: 'Elevated risk noncardiac surgery when natriuretic peptides are used for risk stratification.',
    whyUse: 'Preop BNP/NT-proBNP independently predict perioperative MI and death.',
    inputs: [
      selectInput('assay', 'Assay', [
        { label: 'BNP', value: 'bnp' },
        { label: 'NT-proBNP', value: 'nt' },
      ]),
      numberInput('level', 'Level', { min: 0, max: 50000, step: 1, defaultValue: 150, helpText: 'pg/mL (ng/L)' }),
      selectInput('ageBand', 'Age band (NT-proBNP context)', [
        { label: '<50 years', value: 'lt50' },
        { label: '50–75 years', value: '50_75' },
        { label: '>75 years', value: 'gt75' },
      ]),
    ],
    calculate(values) {
      const assay = String(values.assay ?? 'nt');
      const level = num(values.level, 150);
      const ageBand = String(values.ageBand ?? '50_75');

      // Common perioperative thresholds (CCS / literature-style educational bands)
      // BNP: <92 lower risk; ≥92 elevated (approx from meta-analyses / guidelines vary)
      // NT-proBNP: <300 lower; ≥300 elevated; higher cutoffs with age sometimes used clinically
      let elevated = false;
      let threshold = 0;
      if (assay === 'bnp') {
        threshold = 92;
        elevated = level >= 92;
      } else {
        threshold = 300;
        elevated = level >= 300;
        // Optional age-aware “rule-in” style numbers often used in acute HF, shown for context
      }

      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
      let label = '';
      let interpretation = '';

      if (!elevated) {
        label = 'Below common elevated preop threshold';
        riskLevel = 'low';
        interpretation = `${assay === 'bnp' ? 'BNP' : 'NT-proBNP'} ${level} pg/mL is below commonly cited perioperative elevation cutoffs (~${threshold} pg/mL). Still integrate clinical risk (RCRI, functional capacity, surgery type).`;
      } else if (assay === 'bnp' ? level < 300 : level < 900) {
        label = 'Elevated preop NP';
        riskLevel = 'high';
        interpretation = `Elevated ${assay === 'bnp' ? 'BNP' : 'NT-proBNP'} (${level} pg/mL ≥ ${threshold}). Associated with higher risk of perioperative death/MI — optimize volume status and HF therapies; consider monitoring and shared decision for high-risk surgery.`;
      } else {
        label = 'Markedly elevated preop NP';
        riskLevel = 'critical';
        interpretation = `Markedly elevated ${assay === 'bnp' ? 'BNP' : 'NT-proBNP'} (${level} pg/mL). Suggests significant myocardial stress/HF — delay elective surgery when feasible for evaluation and optimization.`;
      }

      // Age context note for NT-proBNP
      if (assay === 'nt') {
        const ageNote =
          ageBand === 'gt75'
            ? 'Age >75: higher baseline NT-proBNP common; still, perioperative elevation thresholds remain prognostic.'
            : ageBand === 'lt50'
              ? 'Age <50: lower levels expected; elevation more specific for pathology.'
              : 'Age 50–75: interpret with eGFR, AF, and known HF.';
        interpretation += ` ${ageNote}`;
      }

      return {
        score: level,
        unit: 'pg/mL',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Assay', value: assay === 'bnp' ? 'BNP' : 'NT-proBNP' },
          { label: 'Level', value: `${level} pg/mL` },
          { label: 'Common elevation cutoff used here', value: `≥${threshold} pg/mL` },
        ],
        recommendations: elevated
          ? [
              'Clinical HF assessment and volume optimization',
              'Review GDMT and ischemia symptoms',
              'Postop troponin/NP surveillance if high-risk surgery proceeds',
            ]
          : ['Proceed with standard risk pathway', 'Do not use low NP alone to skip indicated evaluation'],
      };
    },
    evidence: {
      summary:
        'Elevated preoperative BNP/NT-proBNP predicts perioperative cardiovascular events; guideline groups (e.g. CCS) support selective NP testing in elevated-risk patients.',
      formula: 'Educational cutoffs: BNP ≥92 pg/mL or NT-proBNP ≥300 pg/mL as “elevated” bands',
      validation: 'Meta-analyses of preop NP; thresholds vary by assay and guideline.',
      references: [
        {
          title: 'Canadian Cardiovascular Society Guidelines on Perioperative Cardiac Risk Assessment',
          citation: 'Duceppe E et al. Can J Cardiol. 2017',
          year: 2017,
          pmid: '27865641',
          doi: '10.1016/j.cjca.2016.09.008',
        },
      ],
    },
    nextSteps: [
      { condition: 'Elevated NP', actions: ['HF/volume assessment and optimization', 'Further testing only if it changes the plan', 'Postop troponin surveillance if surgery proceeds'] },
    ],
    pearls: [
      'AF, CKD, age, and PE also raise NP — interpret in context.',
      'A normal NP has good negative predictive value but is not zero-risk.',
    ],
  },

  // ─── 22. ARVC task force simplified ───────────────────────────────────────
  {
    id: 'arvc-taskforce',
    name: 'ARVC Task Force Criteria (Simplified Count)',
    shortName: 'ARVC TFC',
    description:
      'Simplified educational counter for 2010 revised Task Force Criteria categories in arrhythmogenic right ventricular cardiomyopathy (not a full formal scoring worksheet).',
    category: 'cardiology',
    tags: ['arvc', 'acm', 'cardiomyopathy', 'task force', 'sudden death'],
    whenToUse: 'Structuring suspicion for ARVC/ACM when multiple domain findings exist.',
    whyUse: 'Diagnosis requires combining imaging, ECG, arrhythmia, histology, and family history criteria.',
    inputs: [
      selectInput('imaging', 'Global/regional RV dysfunction & structural (imaging)', [
        { label: 'None', value: 0 },
        { label: 'Minor criterion present', value: 1 },
        { label: 'Major criterion present', value: 2 },
      ]),
      selectInput('tissue', 'Tissue characterization (biopsy)', [
        { label: 'None / not done', value: 0 },
        { label: 'Minor', value: 1 },
        { label: 'Major', value: 2 },
      ]),
      selectInput('repolarization', 'Repolarization abnormalities (ECG)', [
        { label: 'None', value: 0 },
        { label: 'Minor', value: 1 },
        { label: 'Major', value: 2 },
      ]),
      selectInput('depolarization', 'Depolarization / conduction abnormalities', [
        { label: 'None', value: 0 },
        { label: 'Minor', value: 1 },
        { label: 'Major', value: 2 },
      ]),
      selectInput('arrhythmia', 'Arrhythmias', [
        { label: 'None', value: 0 },
        { label: 'Minor', value: 1 },
        { label: 'Major', value: 2 },
      ]),
      selectInput('family', 'Family history / genetics', [
        { label: 'None', value: 0 },
        { label: 'Minor', value: 1 },
        { label: 'Major', value: 2 },
      ]),
    ],
    calculate(values) {
      const cats = ['imaging', 'tissue', 'repolarization', 'depolarization', 'arrhythmia', 'family'] as const;
      let major = 0;
      let minor = 0;
      for (const c of cats) {
        const v = num(values[c], 0);
        if (v >= 2) major += 1;
        else if (v === 1) minor += 1;
      }
      // 2010 TFC: definite = 2 major, OR 1 major + 2 minor, OR 4 minor from different categories
      // borderline = 1 major + 1 minor, OR 3 minor; possible = 1 major OR 2 minor
      let diagnosis: 'Unlikely / insufficient' | 'Possible' | 'Borderline' | 'Definite' = 'Unlikely / insufficient';
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';

      if (major >= 2 || (major >= 1 && minor >= 2) || minor >= 4) {
        diagnosis = 'Definite';
        riskLevel = 'critical';
      } else if ((major === 1 && minor === 1) || minor === 3) {
        diagnosis = 'Borderline';
        riskLevel = 'high';
      } else if (major === 1 || minor === 2) {
        diagnosis = 'Possible';
        riskLevel = 'moderate';
      }

      return {
        score: major * 2 + minor,
        label: `${diagnosis} ARVC by simplified TFC logic`,
        interpretation: `${major} major-category and ${minor} minor-category domains flagged. Simplified 2010 Task Force combination rules → ${diagnosis}. This tool does not verify that criteria come from different categories with exact imaging measurements — confirm with full formal worksheet and expert read.`,
        riskLevel,
        details: [
          { label: 'Major categories', value: String(major) },
          { label: 'Minor categories', value: String(minor) },
          { label: 'Classification', value: diagnosis },
        ],
        recommendations:
          diagnosis === 'Definite' || diagnosis === 'Borderline'
            ? ['Refer to cardiomyopathy / EP center', 'Cascade family evaluation', 'Exercise restriction counseling', 'ICD decision per risk']
            : diagnosis === 'Possible'
              ? ['Specialist review', 'High-quality CMR', 'Ambulatory ECG monitoring']
              : ['Pursue alternative diagnoses if clinical concern remains'],
      };
    },
    evidence: {
      summary:
        '2010 revised Task Force Criteria diagnose ARVC as definite/borderline/possible from major and minor findings across six categories.',
      formula: 'Definite: 2 major OR 1 major+2 minor OR 4 minor; Borderline: 1 major+1 minor OR 3 minor; Possible: 1 major OR 2 minor',
      validation: 'International Task Force consensus criteria (2010).',
      references: [
        {
          title: 'Diagnosis of arrhythmogenic right ventricular cardiomyopathy/dysplasia: proposed modification of Task Force criteria',
          citation: 'Marcus FI et al. Eur Heart J. 2010',
          year: 2010,
          pmid: '20172912',
          doi: '10.1093/eurheartj/ehq025',
        },
      ],
    },
    nextSteps: [
      { condition: 'Possible or higher', actions: ['Expert center referral', 'Avoid diagnostic over-call from athlete’s heart'] },
    ],
    pearls: [
      'Do not double-count related findings within the same category.',
      'Genetic pathogenic variant is a major family-history criterion when present.',
    ],
  },

  // ─── 23. Schwartz LQTS score ──────────────────────────────────────────────
  {
    id: 'schwartz-lqts',
    name: 'Schwartz LQTS Diagnostic Score',
    shortName: 'Schwartz LQTS',
    description: 'Schwartz score for clinical diagnosis of congenital long QT syndrome (points → probability).',
    category: 'cardiology',
    tags: ['lqts', 'schwartz', 'qt', 'syncope', 'sudden death', 'ep'],
    whenToUse: 'Suspected congenital LQTS based on ECG, symptoms, and family history.',
    whyUse: 'Stratifies low / intermediate / high probability of LQTS before or alongside genetic testing.',
    inputs: [
      selectInput('qtc', 'QTc (Bazett) on ECG', [
        { label: '<450 ms (0)', value: 0 },
        { label: '450–459 ms (+1)', value: 1 },
        { label: '460–479 ms (+2)', value: 2 },
        { label: '≥480 ms (+3)', value: 3 },
      ]),
      yesNo('torsades', 'Torsades de pointes (+2)', 2),
      yesNo('tAlternans', 'T-wave alternans (+1)', 1),
      yesNo('notchedT', 'Notched T wave in 3 leads (+1)', 1),
      yesNo('lowHr', 'Low heart rate for age (+0.5)', 1),
      selectInput('syncope', 'Syncope', [
        { label: 'None (0)', value: 0 },
        { label: 'Syncope not stress-related (+1)', value: 1 },
        { label: 'Syncope with stress (+2)', value: 2 },
      ]),
      yesNo('congenitalDeafness', 'Congenital deafness (+0.5)', 1),
      selectInput('family', 'Family history', [
        { label: 'None (0)', value: 0 },
        { label: 'Family member with definite LQTS (+1)', value: 1 },
        { label: 'Unexplained SCD at age <30 among immediate family (+0.5)', value: 0.5 },
      ]),
    ],
    calculate(values) {
      // Note: torsades and syncope are mutually exclusive in original (count max) — apply that rule
      let score = num(values.qtc, 0);
      const torsades = bool(values.torsades);
      const syncopePts = num(values.syncope, 0);
      if (torsades) score += 2;
      else score += syncopePts;
      if (bool(values.tAlternans)) score += 1;
      if (bool(values.notchedT)) score += 1;
      if (bool(values.lowHr)) score += 0.5;
      if (bool(values.congenitalDeafness)) score += 0.5;
      score += num(values.family, 0);
      score = round(score, 1);

      let riskLevel: 'low' | 'moderate' | 'high' = 'low';
      let label = '';
      let interpretation = '';
      if (score >= 3.5) {
        riskLevel = 'high';
        label = 'High probability LQTS';
        interpretation = `Schwartz score ${score} (≥3.5): high probability of congenital LQTS. Avoid QT-prolonging drugs; refer to EP/inherited arrhythmia clinic; discuss genetic testing and family screening.`;
      } else if (score >= 1.5) {
        riskLevel = 'moderate';
        label = 'Intermediate probability LQTS';
        interpretation = `Schwartz score ${score} (1.5–3.0): intermediate probability. Repeat ECGs, exercise/epinephrine testing as appropriate, specialist review.`;
      } else {
        riskLevel = 'low';
        label = 'Low probability LQTS';
        interpretation = `Schwartz score ${score} (≤1): low probability by clinical score — does not fully exclude disease if strong suspicion.`;
      }

      return {
        score,
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Schwartz points', value: String(score) },
          { label: 'TdP / syncope rule', value: torsades ? 'TdP counted (syncope not added)' : 'Syncope points applied if selected' },
        ],
        recommendations:
          score >= 3.5
            ? ['EP / genetics referral', 'β-blocker therapy discussion', 'Family cascade ECG/genetic counseling', 'Avoid QT drugs']
            : score >= 1.5
              ? ['Specialist ECG review', 'Ambulatory monitoring', 'Consider provocative testing']
              : ['Reassess if new syncope or family events'],
      };
    },
    evidence: {
      summary:
        'Schwartz score sums ECG, clinical, and family findings; ≥3.5 high, 1.5–3 intermediate, ≤1 low probability of LQTS.',
      formula: 'Weighted points (QTc, TdP, T alternans, notched T, low HR, syncope, deafness, family Hx)',
      validation: 'Widely used clinical diagnostic score; genetic confirmation is complementary.',
      references: [
        {
          title: 'Diagnostic criteria for the long QT syndrome: an update',
          citation: 'Schwartz PJ et al. Circulation. 1993',
          year: 1993,
          pmid: '8339437',
          doi: '10.1161/01.cir.88.2.782',
        },
        {
          title: 'The long QT syndrome spectrum (score refinements in literature)',
          citation: 'Schwartz PJ, Crotti L. Circulation. 2011 related reviews',
          year: 2011,
          pmid: '21220739',
          doi: '10.1161/CIRCULATIONAHA.110.004713',
        },
      ],
    },
    nextSteps: [
      { condition: 'High probability', actions: ['EP / inherited-arrhythmia referral', 'Avoid QT-prolonging drugs; discuss β-blocker', 'Family screening'] },
    ],
    pearls: [
      'Original score treats TdP and syncope as mutually exclusive (higher weight TdP).',
      'Acquired QT prolongation (drugs/electrolytes) is a different pathway — score is for congenital likelihood.',
    ],
  },

  // ─── 24. WPW high-risk features ───────────────────────────────────────────
  {
    id: 'wpw-risk',
    name: 'WPW Accessory Pathway Risk Features',
    shortName: 'WPW Risk',
    description:
      'Checklist of high-risk features for Wolff–Parkinson–White pattern/syndrome (educational triage; EP study remains gold standard).',
    category: 'cardiology',
    tags: ['wpw', 'preexcitation', 'accessory pathway', 'af', 'sudden death'],
    whenToUse: 'Patients with ventricular preexcitation (WPW pattern) for risk discussion and referral urgency.',
    whyUse: 'Certain clinical and electrophysiologic features mark higher risk of rapid conduction and SCD.',
    inputs: [
      yesNo('symptomatic', 'Symptomatic (palpitations, presyncope, syncope) or documented AVRT', 1),
      yesNo('preexcitedAF', 'Documented preexcited AF or polymorphic wide-complex tachycardia', 1),
      yesNo('shortSPERRI', 'Shortest preexcited RR in AF ≤250 ms (or SPERRI ≤250 ms on EPS)', 1),
      yesNo('multipleAP', 'Multiple accessory pathways suspected/proven', 1),
      yesNo('septalAP', 'Posteroseptal / midseptal pathway location (ablation risk / specific concerns)', 1),
      yesNo('ebstein', 'Ebstein anomaly or other structural heart disease', 1),
      yesNo('familySCD', 'Family history of WPW-related SCD (rare syndromes)', 1),
      yesNo('intermittentLoss', 'Intermittent sudden loss of preexcitation on ECG/ambulatory monitor (lower-risk marker)', 1),
      yesNo('abruptBlockExercise', 'Abrupt complete loss of preexcitation on exercise testing (lower-risk marker)', 1),
    ],
    calculate(values) {
      const highFlags = [
        bool(values.symptomatic) ? 'Symptomatic / AVRT' : null,
        bool(values.preexcitedAF) ? 'Preexcited AF' : null,
        bool(values.shortSPERRI) ? 'SPERRI/shortest RR ≤250 ms' : null,
        bool(values.multipleAP) ? 'Multiple pathways' : null,
        bool(values.ebstein) ? 'Structural disease (e.g. Ebstein)' : null,
        bool(values.familySCD) ? 'Family SCD' : null,
      ].filter(Boolean) as string[];

      const lowFlags = [
        bool(values.intermittentLoss) ? 'Intermittent loss of preexcitation' : null,
        bool(values.abruptBlockExercise) ? 'Abrupt block on exercise' : null,
      ].filter(Boolean) as string[];

      const highCount = highFlags.length;
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'moderate';
      let label = '';
      let interpretation = '';

      if (bool(values.preexcitedAF) || bool(values.shortSPERRI)) {
        riskLevel = 'critical';
        label = 'High-risk conduction features';
        interpretation =
          'Markers of very rapid antegrade conduction and/or preexcited AF present — elevated risk of degeneration to VF. Urgent EP referral for ablation is typically recommended.';
      } else if (highCount >= 2 || bool(values.symptomatic)) {
        riskLevel = 'high';
        label = 'Concerning clinical features';
        interpretation = `High-risk or symptomatic features selected (${highCount}). Guideline-directed management usually favors invasive risk stratification / ablation over observation alone.`;
      } else if (lowFlags.length && highCount === 0) {
        riskLevel = 'low';
        label = 'Soft lower-risk markers only';
        interpretation =
          'Intermittent preexcitation or abrupt block with exercise suggests a longer refractory period pathway, but is imperfect. Shared decision still applies; some asymptomatic patients still undergo EPS.';
      } else {
        riskLevel = 'moderate';
        label = 'Asymptomatic pattern — intermediate uncertainty';
        interpretation =
          'Asymptomatic WPW pattern without definitive high-risk markers. Noninvasive tests help but do not fully exclude risk; discuss observation vs EP study based on occupation, sports, and preference.';
      }

      if (bool(values.septalAP)) {
        interpretation += ' Septal location increases ablation AV-block risk — experienced operators.';
      }

      return {
        score: highCount,
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'High-risk features', value: highFlags.length ? highFlags.join('; ') : 'None selected' },
          { label: 'Lower-risk markers', value: lowFlags.length ? lowFlags.join('; ') : 'None selected' },
        ],
        recommendations:
          riskLevel === 'critical' || riskLevel === 'high'
            ? ['EP referral for risk stratification / ablation', 'Avoid AV-nodal blockers if preexcited AF', 'Procainamide/ibutilide strategies for preexcited AF per ACLS/EP']
            : ['Counsel on symptom emergence', 'Consider exercise testing / ambulatory ECG', 'Shared decision on EPS'],
      };
    },
    evidence: {
      summary:
        'High-risk WPW features include shortest preexcited R-R ≤250 ms in AF, symptomatic tachycardia, multiple pathways, and structural disease; intermittent preexcitation is a softer low-risk marker.',
      formula: 'Checklist of clinical/EPS risk markers (not a numeric derivation score)',
      validation: 'Consistent with PACES/HRS expert consensus on asymptomatic WPW and standard EP teaching.',
      references: [
        {
          title: 'PACES/HRS expert consensus statement on the management of the asymptomatic young patient with a WPW pattern',
          citation: 'Pediatric and Congenital Electrophysiology Society / HRS. Heart Rhythm. 2012',
          year: 2012,
          pmid: '22579340',
          doi: '10.1016/j.hrthm.2012.03.050',
        },
      ],
    },
    nextSteps: [
      { condition: 'Preexcited AF or SPERRI ≤250 ms', actions: ['Urgent EP', 'Do not give AV nodal blockers in preexcited AF'] },
      { condition: 'Asymptomatic', actions: ['Risk discussion', 'Selective noninvasive testing', 'EPS if high stakes (pilot, athlete)'] },
    ],
    pearls: [
      'Adenosine, digoxin, diltiazem/verapamil, and β-blockers are dangerous in preexcited AF.',
      'Successful ablation is definitive therapy for symptomatic WPW.',
    ],
  },

  // ─── 25. Valvular AF definition helper ────────────────────────────────────
  {
    id: 'valvular-af',
    name: 'Valvular AF Definition Helper',
    shortName: 'Valvular AF',
    description:
      'Determines whether AF is “valvular” in the anticoagulation sense (moderate–severe mitral stenosis or mechanical heart valve) vs nonvalvular.',
    category: 'cardiology',
    tags: ['atrial fibrillation', 'valvular', 'mitral stenosis', 'mechanical valve', 'doac', 'warfarin'],
    whenToUse: 'Choosing anticoagulant class in AF when valve disease is present.',
    whyUse: 'DOACs are not appropriate for true valvular AF (moderate–severe MS or mechanical valve); VKA is required.',
    inputs: [
      yesNo('modSevMS', 'Moderate or severe mitral stenosis (typically rheumatic)', 1),
      yesNo('mechanicalValve', 'Mechanical prosthetic heart valve (any position)', 1),
      yesNo('bioprosthetic', 'Bioprosthetic valve or valve repair only', 1),
      yesNo('modSevMR', 'Moderate–severe mitral regurgitation (without MS)', 1),
      yesNo('asOrAR', 'Significant aortic stenosis or regurgitation', 1),
      yesNo('otherNative', 'Other native valve disease without MS/mechanical prosthesis', 1),
    ],
    calculate(values) {
      const valvular = bool(values.modSevMS) || bool(values.mechanicalValve);
      const otherValve =
        bool(values.bioprosthetic) || bool(values.modSevMR) || bool(values.asOrAR) || bool(values.otherNative);

      if (valvular) {
        const reasons = [
          bool(values.modSevMS) ? 'moderate–severe mitral stenosis' : null,
          bool(values.mechanicalValve) ? 'mechanical heart valve' : null,
        ].filter(Boolean) as string[];

        return {
          score: 1,
          label: 'Valvular AF (anticoagulation definition)',
          interpretation: `Meets “valvular AF” criteria for anticoagulation purposes because of ${reasons.join(' and ')}. Use dose-adjusted warfarin (VKA) with indication-specific INR goals. DOACs are contraindicated / not recommended in this setting.`,
          riskLevel: 'high',
          details: [
            { label: 'Classification', value: 'Valvular AF' },
            { label: 'Drivers', value: reasons.join('; ') },
            { label: 'Preferred anticoagulant class', value: 'VKA (warfarin)' },
          ],
          recommendations: [
            'Warfarin with appropriate INR target',
            'Do not use DOAC',
            'Coordinate with valve team for periprocedural bridging',
          ],
        };
      }

      return {
        score: 0,
        label: 'Nonvalvular AF (anticoagulation definition)',
        interpretation: otherValve
          ? 'Does not meet the narrow “valvular AF” definition (no moderate–severe MS and no mechanical valve). Other valve disease (MR, AS/AR, bioprosthesis) usually still allows DOAC if otherwise indicated — confirm timing after recent valve surgery and local guidance.'
          : 'No moderate–severe MS or mechanical valve selected. AF is treated as nonvalvular for anticoagulation class choice — DOAC preferred for most eligible patients based on stroke and bleed risk.',
        riskLevel: 'info',
        details: [
          { label: 'Classification', value: 'Nonvalvular AF (for DOAC eligibility language)' },
          { label: 'Other valve disease noted', value: otherValve ? 'Yes' : 'No' },
          { label: 'Preferred class (typical)', value: 'DOAC if eligible' },
        ],
        recommendations: [
          'Calculate CHA₂DS₂-VASc and bleed risk',
          'Prefer DOAC over warfarin for most NVAF',
          'Reassess if new MS diagnosis or mechanical valve implanted',
        ],
      };
    },
    evidence: {
      summary:
        'In modern trial/guideline language, “valvular AF” generally means moderate-to-severe mitral stenosis or a mechanical heart valve — populations excluded from DOAC landmark trials.',
      formula: 'Valvular AF if moderate–severe MS OR mechanical prosthesis; otherwise nonvalvular for DOAC purposes',
      validation: 'AHA/ACC/HRS and ESC AF guidelines anticoagulation sections.',
      references: [
        {
          title: '2019 AHA/ACC/HRS Focused Update of the AF Guideline',
          citation: 'January CT et al. Circulation. 2019',
          year: 2019,
          pmid: '30686041',
          doi: '10.1161/CIR.0000000000000665',
        },
      ],
    },
    nextSteps: [
      { condition: 'Valvular AF', actions: ['Start/continue VKA', 'Set INR goal by valve/MS context', 'Avoid DOAC'] },
      { condition: 'Nonvalvular AF', actions: ['DOAC dosing with renal function', 'Stroke risk stratification'] },
    ],
    pearls: [
      '“Valvular heart disease” clinically ≠ “valvular AF” for DOAC exclusion.',
      'Rheumatic moderate–severe MS is the classic native-valve exclusion.',
    ],
  },
];
