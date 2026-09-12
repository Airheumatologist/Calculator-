import type { Calculator } from '../../types/calculator';
import { num, bool, yesNo, selectInput, numberInput, riskFromThresholds } from '../../utils/helpers';

export const wave3EmSurgeryCalcs: Calculator[] = [
  {
    id: 'rome-iv-ibs',
    name: 'Rome IV IBS Criteria Helper',
    shortName: 'Rome IV IBS',
    description:
      'Educational helper for Rome IV irritable bowel syndrome criteria: recurrent abdominal pain plus associated stool features.',
    category: 'gastroenterology',
    tags: ['ibs', 'rome iv', 'abdominal pain', 'functional'],
    whenToUse:
      'Adults with chronic recurrent abdominal pain when considering IBS after appropriate red-flag evaluation.',
    whyUse:
      'Structures the Rome IV definition (≥1 day/week pain for 3 months + ≥2 of 3 stool-related criteria; onset ≥6 months).',
    inputs: [
      yesNo('recurrentPain', 'Recurrent abdominal pain ≥1 day/week in the last 3 months', 0, 'Rome IV: on average ≥1 day per week during the last 3 months. Pain, not just bloating or discomfort (Rome III).'),
      yesNo('onset6mo', 'Symptom onset ≥6 months before diagnosis', 0, 'Criteria must have been fulfilled for the last 3 months with symptom onset at least 6 months before diagnosis.'),
      yesNo('relatedDefecation', 'Pain related to defecation', 1, 'Pain related to (not necessarily improved by) defecation — Rome IV dropped “improvement with defecation.” Need ≥2 of these 3 associated features.'),
      yesNo('changeFrequency', 'Associated with change in stool frequency', 1, 'Pain associated with a change in how often stools occur (more or less frequent). Need ≥2 of 3 associated features.'),
      yesNo('changeForm', 'Associated with change in stool form (appearance)', 1, 'Pain associated with a change in Bristol stool type (harder or looser). Need ≥2 of 3 associated features.'),
      selectInput('subtype', 'Predominant stool pattern (optional helper)', [
        { label: 'Not specified', value: 'na', description: 'Subtype not classified here' },
        { label: 'IBS-C (constipation predominant)', value: 'c', description: '>25% of stools Bristol 1–2 and <25% Bristol 6–7 (on days with abnormal stool)' },
        { label: 'IBS-D (diarrhea predominant)', value: 'd', description: '>25% of stools Bristol 6–7 and <25% Bristol 1–2' },
        { label: 'IBS-M (mixed)', value: 'm', description: '>25% Bristol 1–2 AND >25% Bristol 6–7' },
        { label: 'IBS-U (unclassified)', value: 'u', description: 'Meets IBS criteria but stool pattern does not fit C, D, or M' },
      ], undefined, 'Optional. Subtype by Bristol form on days with abnormal stool (Rome IV). Not required to meet IBS criteria.'),
    ],
    calculate(values) {
      const pain = bool(values.recurrentPain);
      const onset = bool(values.onset6mo);
      const criteria =
        (bool(values.relatedDefecation) ? 1 : 0) +
        (bool(values.changeFrequency) ? 1 : 0) +
        (bool(values.changeForm) ? 1 : 0);
      const subtype = String(values.subtype ?? 'na');
      const subtypeLabel: Record<string, string> = {
        na: 'Not specified',
        c: 'IBS-C',
        d: 'IBS-D',
        m: 'IBS-M',
        u: 'IBS-U',
      };

      if (!pain || !onset) {
        return {
          score: criteria,
          label: 'Rome IV IBS criteria not met',
          interpretation: !pain
            ? 'Recurrent abdominal pain threshold not met (≥1 day/week for 3 months required).'
            : 'Onset must be ≥6 months before diagnosis per Rome IV. Reassess timeline and differential.',
          riskLevel: 'info' as const,
          details: [
            { label: 'Associated criteria (0–3)', value: String(criteria) },
            { label: 'Subtype helper', value: subtypeLabel[subtype] ?? subtype },
          ],
        };
      }

      if (criteria >= 2) {
        return {
          score: criteria,
          label: 'Rome IV IBS criteria satisfied (educational)',
          interpretation: `Pain criteria + ${criteria}/3 associated features met with ≥6-month onset. Compatible with Rome IV IBS if organic disease appropriately excluded. Subtype: ${subtypeLabel[subtype] ?? subtype}.`,
          riskLevel: 'moderate' as const,
          details: [
            { label: 'Associated criteria', value: `${criteria} / 3` },
            { label: 'Subtype helper', value: subtypeLabel[subtype] ?? subtype },
          ],
          recommendations: [
            'Exclude red flags (bleeding, weight loss, anemia, nocturnal symptoms, family history of IBD/CRC)',
            'Limited workup per age and presentation',
            'Diet, fiber, antispasmodics, gut–brain therapies as indicated',
          ],
        };
      }

      return {
        score: criteria,
        label: 'Insufficient associated criteria',
        interpretation: `Pain present with adequate onset but only ${criteria}/3 associated features (need ≥2). Does not meet full Rome IV IBS definition — consider other functional or organic disorders.`,
        riskLevel: 'low' as const,
        details: [{ label: 'Associated criteria', value: `${criteria} / 3` }],
      };
    },
    evidence: {
      summary:
        'Rome IV IBS: recurrent abdominal pain on average ≥1 day/week in last 3 months, associated with ≥2 of: (1) related to defecation, (2) change in frequency, (3) change in form; criteria fulfilled for last 3 months with symptom onset ≥6 months prior.',
      formula: 'Pain + onset ≥6 mo + ≥2 of 3 stool-related criteria',
      validation:
        'Consensus diagnostic criteria (Rome Foundation); not a severity score — clinical judgment and selective testing remain essential.',
      references: [
        {
          title: 'Bowel Disorders',
          citation: 'Lacy BE et al. Gastroenterology. 2016;150:1393-1407',
          year: 2016,
          pmid: '27144627',
          doi: '10.1053/j.gastro.2016.02.031',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Criteria met',
        actions: [
          'Confirm no alarm features',
          'Subtype-directed therapy (fiber, osmotic laxatives, antidiarrheals, neuromodulators)',
          'Consider celiac serology / age-appropriate colonoscopy per guidelines',
        ],
      },
      {
        condition: 'Criteria not met',
        actions: ['Broader differential (IBD, bile acid diarrhea, SIBO, endometriosis, etc.)', 'Targeted workup'],
      },
    ],
    pearls: [
      'Rome IV dropped “improvement with defecation” wording in favor of “related to defecation.”',
      'Educational helper only — does not replace clinician diagnosis or red-flag screening.',
    ],
  },

  {
    id: 'bristol-stool',
    name: 'Bristol Stool Scale',
    shortName: 'Bristol',
    description: 'Classifies stool form types 1–7 to describe transit and guide IBS/constipation/diarrhea discussion.',
    category: 'gastroenterology',
    tags: ['stool', 'bristol', 'constipation', 'diarrhea', 'ibs'],
    whenToUse: 'Characterizing bowel habit in constipation, diarrhea, IBS subtyping, or patient education.',
    whyUse: 'Standard visual scale correlating form with colonic transit; improves history quality.',
    inputs: [
      selectInput('type', 'Bristol stool type', [
        { label: 'Type 1 — Separate hard lumps (nuts)', value: 1, description: 'Separate hard lumps, like nuts (hard to pass) — slow transit / constipation' },
        { label: 'Type 2 — Sausage-shaped, lumpy', value: 2, description: 'Sausage-shaped but lumpy — generally constipated form' },
        { label: 'Type 3 — Sausage with cracks on surface', value: 3, description: 'Like a sausage but with cracks on its surface — toward normal' },
        { label: 'Type 4 — Smooth, soft sausage or snake', value: 4, description: 'Like a sausage or snake, smooth and soft — often considered ideal' },
        { label: 'Type 5 — Soft blobs with clear edges', value: 5, description: 'Soft blobs with clear-cut edges (passed easily) — lacking fiber / looser' },
        { label: 'Type 6 — Fluffy pieces, ragged edges, mushy', value: 6, description: 'Fluffy pieces with ragged edges, a mushy stool — mild diarrhea' },
        { label: 'Type 7 — Watery, no solid pieces', value: 7, description: 'Watery, no solid pieces; entirely liquid' },
      ], undefined, 'Ask about the most common recent stool form, not a single outlier. Pair with Rome criteria for IBS-C/D/M subtyping.'),
    ],
    calculate(values) {
      const t = num(values.type, 4);
      const map: Record<number, { label: string; interpretation: string; riskLevel: 'low' | 'moderate' | 'info' }> = {
        1: {
          label: 'Type 1 — Slow transit / hard stool',
          interpretation: 'Separate hard lumps — often constipation / slow transit. Assess fiber, fluids, medications, outlet obstruction.',
          riskLevel: 'moderate',
        },
        2: {
          label: 'Type 2 — Constipated form',
          interpretation: 'Lumpy sausage — generally constipated. Common IBS-C form when paired with pain criteria.',
          riskLevel: 'moderate',
        },
        3: {
          label: 'Type 3 — Toward normal',
          interpretation: 'Sausage with surface cracks — acceptable / borderline normal for many patients.',
          riskLevel: 'low',
        },
        4: {
          label: 'Type 4 — Ideal form',
          interpretation: 'Smooth soft sausage — often considered ideal stool form and average transit.',
          riskLevel: 'low',
        },
        5: {
          label: 'Type 5 — Soft / lacking fiber',
          interpretation: 'Soft blobs — tending toward looser stool; may reflect low fiber or milder diarrhea tendency.',
          riskLevel: 'info',
        },
        6: {
          label: 'Type 6 — Mushy / diarrheal',
          interpretation: 'Fluffy ragged pieces — mild diarrhea category; assess infection, diet, IBS-D, bile acid diarrhea.',
          riskLevel: 'moderate',
        },
        7: {
          label: 'Type 7 — Watery diarrhea',
          interpretation: 'Entirely liquid — diarrhea. Evaluate acuity, dehydration, alarm features, and infectious causes.',
          riskLevel: 'moderate',
        },
      };
      const row = map[t] ?? map[4];
      return {
        score: t,
        unit: 'type',
        label: row.label,
        interpretation: row.interpretation,
        riskLevel: row.riskLevel,
        details: [
          { label: 'Constipation spectrum', value: 'Types 1–2' },
          { label: 'Normal-ish spectrum', value: 'Types 3–4 (sometimes 5)' },
          { label: 'Diarrhea spectrum', value: 'Types 6–7' },
        ],
      };
    },
    evidence: {
      summary:
        'Bristol Stool Form Scale types 1–7 from hard lumps to watery. Types 1–2 suggest slow transit; 3–4 normal; 6–7 rapid transit/diarrhea.',
      formula: 'Patient-reported or observed stool type 1–7',
      validation: 'Widely used in GI research and clinical care; validated against whole-gut transit in multiple studies.',
      references: [
        {
          title: 'Stool form scale as a useful guide to intestinal transit time',
          citation: 'Lewis SJ, Heaton KW. Scand J Gastroenterol. 1997;32:920-924',
          year: 1997,
          pmid: '9299672',
          doi: '10.3109/00365529709011203',
        },
      ],
    },
    nextSteps: [
      { condition: 'Types 1–2', actions: ['Constipation workup/lifestyle', 'Review opioids/anticholinergics', 'Consider IBS-C pathway if pain'] },
      { condition: 'Types 6–7', actions: ['Hydration assessment', 'Infectious vs chronic diarrhea pathway', 'IBS-D if pain criteria met'] },
      { condition: 'Types 3–5', actions: ['Correlate with symptoms', 'Use for IBS subtyping if applicable'] },
    ],
    pearls: ['Ask about most common recent stool form, not a single outlier episode.', 'Pair with Rome criteria for IBS subtyping (IBS-C/D/M).'],
  },

  {
    id: 'upper-gi-bleed-abc',
    name: 'ABC Score (Upper GI Bleed)',
    shortName: 'ABC UGIB',
    description:
      'Simplified ABC mortality risk score for acute upper GI bleeding (age, blood tests, comorbidity-focused educational version).',
    category: 'gastroenterology',
    tags: ['ugib', 'bleed', 'abc', 'mortality', 'gi'],
    whenToUse: 'Adults with acute upper GI bleeding for early mortality risk stratification alongside GBS/AIMS65/Rockall.',
    whyUse: 'Bedside ABC-style variables capture age, labs, mental status, and major comorbidity burden.',
    inputs: [
      selectInput('age', 'Age', [
        { label: '≤59 years (0)', value: 0 },
        { label: '60–74 years (1)', value: 1 },
        { label: '≥75 years (2)', value: 2 },
      ], undefined, 'Age at presentation with UGIB.'),
      selectInput('urea', 'Blood urea (BUN-related)', [
        { label: 'Urea <10 mmol/L (~BUN <28 mg/dL) (0)', value: 0 },
        { label: 'Urea 10–19.9 mmol/L (~BUN 28–56 mg/dL) (2)', value: 2 },
        { label: 'Urea ≥20 mmol/L (~BUN ≥56 mg/dL) (4)', value: 4 },
      ], 0, 'Urea in mmol/L. BUN (mg/dL) ≈ urea × 2.8. 10 mmol/L ≈ BUN 28 mg/dL; 20 mmol/L ≈ BUN 56.'),
      selectInput('albumin', 'Albumin', [
        { label: '≥40 g/L (≥4.0 g/dL) (0)', value: 0 },
        { label: '30–39.9 g/L (3.0–4.0 g/dL) (2)', value: 2 },
        { label: '<30 g/L (<3.0 g/dL) (5)', value: 5 },
      ], 0, '40 g/L = 4.0 g/dL; 30 g/L = 3.0 g/dL.'),
      selectInput('creatinine', 'Creatinine', [
        { label: '<100 µmol/L (~1.1 mg/dL) (0)', value: 0 },
        { label: '100–150 µmol/L (~1.1–1.7 mg/dL) (1)', value: 1 },
        { label: '>150 µmol/L (>~1.7 mg/dL) (2)', value: 2 },
      ], 0, '100 µmol/L ≈ 1.1 mg/dL; 150 µmol/L ≈ 1.7 mg/dL.'),
      yesNo('ams', 'Altered mental status', 2, 'Altered = GCS <14 or new disorientation/confusion at presentation (AIMS65-style UGIB operationalization).'),
      yesNo('cirrhosis', 'Cirrhosis', 2, 'Known cirrhosis or clear clinical/imaging evidence of cirrhosis (not isolated fatty liver).'),
      yesNo('malignancy', 'Disseminated malignancy', 4, 'Disseminated / metastatic cancer (not a fully resected local tumor in remission).'),
      selectInput('asa', 'ASA grade', [
        { label: 'ASA 1 (0)', value: 0, description: 'I — normal healthy patient' },
        { label: 'ASA 2 (1)', value: 1, description: 'II — mild systemic disease' },
        { label: 'ASA 3 (3)', value: 3, description: 'III — severe systemic disease with functional limitation' },
        { label: 'ASA ≥4 (5)', value: 5, description: 'IV–V — constant threat to life / moribund' },
      ], 0, 'I healthy; II mild systemic disease; III severe systemic disease with functional limitation; ≥4 constant threat to life / moribund.'),
    ],
    calculate(values) {
      const score =
        num(values.age) +
        num(values.urea) +
        num(values.albumin) +
        num(values.creatinine) +
        (bool(values.ams) ? 2 : 0) +
        (bool(values.cirrhosis) ? 2 : 0) +
        (bool(values.malignancy) ? 4 : 0) +
        num(values.asa);

      const r = riskFromThresholds(score, [
        {
          max: 3,
          level: 'low',
          label: 'Low ABC mortality risk',
          interpretation: `ABC score ${score}: lower predicted in-hospital mortality band. Still resuscitate and time endoscopy per clinical severity and GBS.`,
        },
        {
          max: 7,
          level: 'moderate',
          label: 'Intermediate ABC risk',
          interpretation: `ABC score ${score}: intermediate mortality risk — inpatient care, early endoscopy planning, correct coagulopathy/resuscitation.`,
        },
        {
          max: 100,
          level: 'high',
          label: 'High ABC mortality risk',
          interpretation: `ABC score ${score}: high mortality risk — aggressive resuscitation, urgent endoscopy, consider ICU-level monitoring.`,
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'Typical bands (educational)', value: '≤3 low · 4–7 intermediate · ≥8 high' },
          { label: 'Max theoretical', value: '22' },
        ],
      };
    },
    evidence: {
      summary:
        'ABC score for UGIB mortality uses age, urea, albumin, creatinine, altered mental status, cirrhosis, disseminated malignancy, and ASA class (Laursen et al.).',
      formula: 'Sum of weighted age + urea + albumin + Cr + AMS + cirrhosis + malignancy + ASA points',
      validation:
        'International multicenter derivation/validation for UGIB mortality; complementary to GBS (intervention) and AIMS65/Rockall.',
      references: [
        {
          title: 'ABC score: a new risk score that accurately predicts mortality in acute upper and lower gastrointestinal bleeding',
          citation: 'Laursen SB et al. Gut. 2021;70(4):707-716',
          year: 2021,
          pmid: '32723845',
          doi: '10.1136/gutjnl-2019-320002',
        },
      ],
    },
    nextSteps: [
      { condition: 'Low', actions: ['Resuscitate as needed', 'Risk-stratify with GBS for intervention need', 'Plan endoscopy timing'] },
      { condition: 'Intermediate–high', actions: ['Admit / HDU-ICU if unstable', 'Urgent endoscopy', 'Reverse anticoagulation per protocol', 'PPI ± vasoactive agents if variceal suspected'] },
    ],
    pearls: [
      'Pre-endoscopy Rockall already exists in this app — ABC is an alternate mortality tool.',
      'Urea in mmol/L: BUN (mg/dL) ≈ urea (mmol/L) × 2.8.',
    ],
  },

  {
    id: 'lower-gi-bleed-oakland',
    name: 'Oakland Score (Lower GI Bleed)',
    shortName: 'Oakland',
    description: 'Simplified Oakland score variables for outpatient vs inpatient management of acute lower GI bleeding.',
    category: 'gastroenterology',
    tags: ['lgib', 'bleed', 'oakland', 'colon'],
    whenToUse: 'Adults with acute lower GI bleeding being considered for safe discharge vs admission.',
    whyUse: 'Oakland ≤8 often used as a low-risk threshold for safe discharge pathways in validated cohorts.',
    inputs: [
      selectInput('age', 'Age', [
        { label: '<40 years (0)', value: 0 },
        { label: '40–69 years (1)', value: 1 },
        { label: '≥70 years (2)', value: 2 },
      ]),
      selectInput('sex', 'Sex', [
        { label: 'Female (0)', value: 0 },
        { label: 'Male (1)', value: 1 },
      ]),
      yesNo('priorAdmit', 'Previous LGIB admission', 1, 'Prior hospital admission for lower GI bleeding (not a prior outpatient bleed only).'),
      yesNo('dreBlood', 'Blood on digital rectal exam', 1, 'Fresh blood on DRE at this presentation (not a history of hematochezia alone).'),
      selectInput('hr', 'Heart rate', [
        { label: '<70 (0)', value: 0 },
        { label: '70–89 (1)', value: 1 },
        { label: '90–109 (2)', value: 2 },
        { label: '≥110 (3)', value: 3 },
      ]),
      selectInput('sbp', 'Systolic BP', [
        { label: '≥130 (0)', value: 0 },
        { label: '120–129 (1)', value: 1 },
        { label: '90–119 (2)', value: 2 },
        { label: '<90 (3)', value: 3 },
      ]),
      selectInput('hb', 'Hemoglobin (g/dL)', [
        { label: '≥16.0 (0)', value: 0 },
        { label: '13.0–15.9 (1)', value: 1 },
        { label: '11.0–12.9 (2)', value: 2 },
        { label: '9.0–10.9 (3)', value: 3 },
        { label: '<9.0 (4)', value: 4 },
      ]),
    ],
    calculate(values) {
      const score =
        num(values.age) +
        num(values.sex) +
        (bool(values.priorAdmit) ? 1 : 0) +
        (bool(values.dreBlood) ? 1 : 0) +
        num(values.hr) +
        num(values.sbp) +
        num(values.hb);

      if (score <= 8) {
        return {
          score,
          label: 'Low Oakland risk (≤8)',
          interpretation: `Oakland score ${score} ≤8: low risk of adverse outcomes in derivation/validation — candidate for outpatient management if clinically stable, reliable follow-up, and no competing concerns.`,
          riskLevel: 'low' as const,
          recommendations: ['Consider discharge with early follow-up', 'Safety-net for recurrent bleed/syncope', 'Hold/adjust anticoagulants per indication'],
        };
      }
      if (score <= 12) {
        return {
          score,
          label: 'Intermediate Oakland risk',
          interpretation: `Oakland score ${score}: not in classic low-risk discharge band — admit for monitoring, labs, and colonoscopy timing as indicated.`,
          riskLevel: 'moderate' as const,
        };
      }
      return {
        score,
        label: 'Higher Oakland risk',
        interpretation: `Oakland score ${score}: higher risk band — inpatient care, resuscitation, consider ICU if unstable, urgent GI/IR pathways for massive bleed.`,
        riskLevel: 'high' as const,
        recommendations: ['Resuscitate', 'Type & cross', 'Urgent GI consult', 'CT angio if active brisk bleed'],
      };
    },
    evidence: {
      summary:
        'Oakland score: age, sex, prior LGIB admission, DRE blood, HR, SBP, hemoglobin. Score ≤8 associated with safe discharge in external validation cohorts.',
      formula: 'Sum of age + sex + prior admit + DRE blood + HR + SBP + Hb points (0–18 range typical)',
      validation: 'Oakland et al. multicentre UK derivation/validation; thresholds may vary by local pathway.',
      references: [
        {
          title: 'Derivation and validation of a novel risk score for safe discharge after acute lower gastrointestinal bleeding',
          citation: 'Oakland K et al. Lancet Gastroenterol Hepatol. 2017;2(9):635-643',
          year: 2017,
          pmid: '28651935',
          doi: '10.1016/S2468-1253(17)30150-4',
        },
      ],
    },
    nextSteps: [
      { condition: '≤8 and stable', actions: ['Outpatient pathway if local protocol allows', 'CBC recheck plan', 'Anticoagulation review'] },
      { condition: '>8 or unstable', actions: ['Admit', 'Resuscitation', 'Colonoscopy / CT angio per severity'] },
    ],
    pearls: [
      'Simplified educational implementation — confirm points against your institutional Oakland worksheet.',
      'Massive hemorrhage or hemodynamic instability overrides any low score.',
    ],
  },

  {
    id: 'strangulation-sbo',
    name: 'SBO Strangulation Risk Features',
    shortName: 'SBO Strangulation',
    description: 'Counts clinical/lab features concerning for strangulated small-bowel obstruction.',
    category: 'emergency',
    tags: ['sbo', 'strangulation', 'obstruction', 'surgery'],
    whenToUse: 'Adhesive or other SBO when estimating risk of ischemia/strangulation needing urgent surgery.',
    whyUse: 'No single finding is definitive; accumulating systemic and peritoneal signs raise concern for strangulation.',
    inputs: [
      yesNo('continuousPain', 'Continuous (not intermittent) abdominal pain', 1, 'Pain that is constant rather than classic colicky/intermittent SBO pain — a concerning ischemia clue.'),
      yesNo('fever', 'Fever ≥38 °C', 1, 'Temperature ≥38.0 °C.'),
      yesNo('tachycardia', 'Tachycardia (HR >100)', 1, 'HR >100 /min.'),
      yesNo('peritonitis', 'Peritonitis / rebound / guarding', 1, 'Rebound tenderness, involuntary guarding, or rigid abdomen — surgical emergency until proven otherwise.'),
      yesNo('leukocytosis', 'Leukocytosis (WBC >12 × 10³/µL)', 1, 'Teaching cutoff WBC >12 × 10³/µL (pick one threshold; drop the 10–12k span).'),
      yesNo('lactate', 'Elevated lactate or base deficit', 1, 'Typically lactate >2 mmol/L or worsening base deficit; normal lactate does not exclude early ischemia.'),
      yesNo('sirs', 'SIRS / systemic toxicity', 1, 'Yes if ≥2 of: T <36 or >38 °C; HR >90; RR >20 or PaCO2 <32 mmHg; WBC <4 or >12 × 10³/µL or >10% bands.'),
      yesNo('ctIschemia', 'CT signs of ischemia (reduced wall enhancement, closed loop, pneumatosis, etc.)', 1, 'Yes if reduced wall enhancement, closed-loop morphology, pneumatosis, portal venous gas, or mesenteric edema/whirl — closed loop is a surgical emergency even if vitals are initially normal.'),
    ],
    calculate(values) {
      const keys = [
        'continuousPain',
        'fever',
        'tachycardia',
        'peritonitis',
        'leukocytosis',
        'lactate',
        'sirs',
        'ctIschemia',
      ] as const;
      const score = keys.reduce((s, k) => s + (bool(values[k]) ? 1 : 0), 0);
      const r = riskFromThresholds(score, [
        {
          max: 1,
          level: 'low',
          label: 'Few strangulation features',
          interpretation: `${score}/8 features. Lower clinical suspicion if exam soft and labs normal — trial of nonoperative management may be appropriate with serial exams.`,
        },
        {
          max: 3,
          level: 'moderate',
          label: 'Intermediate concern',
          interpretation: `${score}/8 features. Heightened concern — close observation, early surgical consult, low threshold for OR if not improving.`,
        },
        {
          max: 8,
          level: 'high',
          label: 'High concern for strangulation',
          interpretation: `${score}/8 features. High concern for ischemia/strangulation — urgent surgical exploration pathway unless clear alternative explanation.`,
          },
      ]);
      return {
        score,
        ...r,
        details: [{ label: 'Features positive', value: `${score} / 8` }],
        recommendations:
          score >= 4
            ? ['NPO, IV fluids', 'NG decompression', 'Urgent surgery consult', 'Broad-spectrum Abx if perforation/ischemia suspected']
            : ['Serial abdominal exams', 'Surgical co-management', 'Repeat lactate/CBC'],
      };
    },
    evidence: {
      summary:
        'Strangulation risk rises with continuous pain, fever, tachycardia, peritonitis, leukocytosis, lactate rise, SIRS, and CT ischemic signs. Clinical prediction remains imperfect.',
      formula: 'Count of concerning features (0–8)',
      validation:
        'Composite of classic surgical teaching and observational SBO ischemia literature; not a validated single score — use with CT and surgical judgment.',
      references: [
        {
          title: 'Predicting strangulated small bowel obstruction: an old problem revisited',
          citation: 'Jancelewicz T et al. J Gastrointest Surg. 2009;13(1):93-99',
          year: 2009,
          pmid: '18685902',
          doi: '10.1007/s11605-008-0610-z',
        },
      ],
    },
    nextSteps: [
      { condition: 'High concern / peritonitis / CT ischemia', actions: ['Emergent surgical exploration', 'Resuscitation', 'Antibiotics'] },
      { condition: 'Low–moderate without peritonitis', actions: ['Gastrografin challenge per protocol', 'Serial exams', 'Early OR if fails nonop trial'] },
    ],
    pearls: [
      'Closed-loop obstruction on CT is a surgical emergency even if vitals are initially normal.',
      'Normal lactate does not exclude early strangulation.',
    ],
  },

  {
    id: 'ctsi-balthazar',
    name: 'CTSI (Balthazar) Pancreatitis',
    shortName: 'CTSI',
    description: 'CT Severity Index for acute pancreatitis: Balthazar grade plus necrosis points.',
    category: 'gastroenterology',
    tags: ['pancreatitis', 'ctsi', 'balthazar', 'necrosis'],
    whenToUse: 'Contrast-enhanced CT in acute pancreatitis when grading morphologic severity.',
    whyUse: 'Combines pancreatic/peripancreatic inflammation grade with extent of necrosis; correlates with complications.',
    inputs: [
      selectInput('balthazar', 'Balthazar grade (inflammation)', [
        { label: 'A — Normal pancreas (0)', value: 0, description: 'Normal pancreas on CECT — no enlargement, no peripancreatic inflammation' },
        { label: 'B — Focal/diffuse enlargement (1)', value: 1, description: 'Focal or diffuse pancreatic enlargement, contour irregularity, or heterogeneous attenuation — no peripancreatic inflammation' },
        { label: 'C — Intrinsic abnormality + mild peripancreatic (2)', value: 2, description: 'Intrinsic pancreatic abnormalities plus hazy/streaky inflammatory change in peripancreatic fat (mild peripancreatic inflammation); no discrete fluid collection' },
        { label: 'D — Single fluid collection (3)', value: 3, description: 'Single ill-defined fluid collection (typically lesser sac or anterior pararenal space)' },
        { label: 'E — ≥2 collections and/or gas in pancreas/retroperitoneum (4)', value: 4, description: 'Two or more poorly defined fluid collections, or gas in/adjacent to the pancreas (infection or fistula possible)' },
      ], undefined, 'Contrast-enhanced CT. Balthazar A–E grades pancreatic/peripancreatic inflammation (0–4). Score CT typically ≥72 h after onset unless diagnosis is unclear or the patient is deteriorating.'),
      selectInput('necrosis', 'Pancreatic necrosis extent', [
        { label: 'None (0)', value: 0, description: 'No non-enhancing pancreatic parenchyma on CECT (homogeneous enhancement)' },
        { label: '<30% (2)', value: 2, description: 'Non-enhancement of <30% of the pancreatic parenchyma' },
        { label: '30–50% (4)', value: 4, description: 'Non-enhancement of 30–50% of the pancreatic parenchyma' },
        { label: '>50% (6)', value: 6, description: 'Non-enhancement of >50% of the pancreatic parenchyma' },
      ], undefined, 'Necrosis = lack of parenchymal enhancement on CECT (not just peripancreatic fluid). Unenhanced CT cannot grade necrosis. Points are 0/2/4/6, not 0–3.'),
    ],
    calculate(values) {
      const score = num(values.balthazar) + num(values.necrosis);
      const r = riskFromThresholds(score, [
        {
          max: 3,
          level: 'low',
          label: 'Mild CTSI (0–3)',
          interpretation: `CTSI ${score}: mild morphologic severity — lower rates of mortality/complications; supportive care usually sufficient if clinically mild.`,
        },
        {
          max: 6,
          level: 'moderate',
          label: 'Moderate CTSI (4–6)',
          interpretation: `CTSI ${score}: moderate morphologic severity — monitor for organ failure, infection of necrosis, nutrition support.`,
        },
        {
          max: 10,
          level: 'high',
          label: 'Severe CTSI (7–10)',
          interpretation: `CTSI ${score}: severe morphologic disease — high morbidity; ICU consideration, multidisciplinary pancreatitis care, watch for infected necrosis.`,
        },
      ]);
      return {
        score,
        unit: 'points',
        ...r,
        details: [
          { label: 'Balthazar component', value: String(num(values.balthazar)) },
          { label: 'Necrosis component', value: String(num(values.necrosis)) },
          { label: 'Range', value: '0–10' },
        ],
      };
    },
    evidence: {
      summary:
        'CTSI = Balthazar A–E (0–4) + necrosis (0/2/4/6). Mild 0–3, moderate 4–6, severe 7–10. Modified CTSI variants exist.',
      formula: 'CTSI = inflammation points (0–4) + necrosis points (0, 2, 4, or 6)',
      validation: 'Balthazar et al.; correlates with morbidity/mortality; clinical scores (BISAP, Marshall) add organ-failure context.',
      references: [
        {
          title: 'Acute pancreatitis: value of CT in establishing prognosis',
          citation: 'Balthazar EJ et al. Radiology. 1990;174:331-336',
          year: 1990,
          pmid: '2296641',
          doi: '10.1148/radiology.174.2.2296641',
        },
      ],
    },
    nextSteps: [
      { condition: 'CTSI 0–3', actions: ['Supportive care', 'Early oral feeding if tolerated', 'Etiology workup'] },
      { condition: 'CTSI ≥4', actions: ['Monitor organ failure (Marshall)', 'Nutrition plan', 'Avoid early necrosectomy; step-up if infected necrosis'] },
    ],
    pearls: [
      'CT optimally timed ≥72 h after onset for necrosis demarcation unless diagnosis unclear or deterioration.',
      'Morphologic severity ≠ physiologic severity — integrate with BISAP/Marshall/Atlanta.',
    ],
  },

  {
    id: 'marshall-organ',
    name: 'Modified Marshall Organ Failure (Pancreatitis)',
    shortName: 'Marshall',
    description: 'Modified Marshall score for organ failure in acute pancreatitis (respiratory, renal, cardiovascular).',
    category: 'gastroenterology',
    tags: ['pancreatitis', 'marshall', 'organ failure', 'atlanta'],
    whenToUse: 'Grading organ failure in acute pancreatitis per revised Atlanta classification.',
    whyUse:
      'Organ failure (score ≥2 in any system) marks non-mild disease; persistent ≥48 h defines severe pancreatitis (revised Atlanta) and drives ICU decisions.',
    inputs: [
      selectInput('resp', 'Respiratory (PaO₂/FiO₂)', [
        { label: '>400 (0)', value: 0 },
        { label: '301–400 (1)', value: 1 },
        { label: '201–300 (2)', value: 2 },
        { label: '101–200 (3)', value: 3 },
        { label: '≤100 (4)', value: 4 },
      ], 0, 'PaO2 mmHg / FiO2 (fraction 0.21–1.0). If no ABG, estimate FiO2: RA 0.21; NC 2 L ~0.27, 4 L ~0.30–0.36, 6 L ~0.40; NRB ~0.60–0.95 (Atlanta conversion table).'),
      selectInput('renal', 'Renal (serum creatinine mg/dL)', [
        { label: '≤1.4 (0)', value: 0 },
        { label: '1.5–1.8 (1)', value: 1 },
        { label: '1.9–3.5 (2)', value: 2 },
        { label: '3.6–4.9 (3)', value: 3 },
        { label: '≥5.0 (4)', value: 4 },
      ], 0, 'Use acute creatinine. Pre-existing CKD: score further rise from that patient’s baseline (Atlanta); do not assign ≥2 solely for a chronically elevated Cr.'),
      selectInput('cv', 'Cardiovascular (systolic BP)', [
        { label: '>90 mmHg without pressors (0)', value: 0 },
        { label: '<90, fluid responsive (1)', value: 1 },
        { label: '<90, not fluid responsive (2)', value: 2 },
        { label: '<90, pH <7.3 (3)', value: 3 },
        { label: '<90, pH <7.2 (4)', value: 4 },
      ], 0, 'Score off inotropes for 0; fluid-responsive = SBP recovers with volume.'),
    ],
    calculate(values) {
      const resp = num(values.resp);
      const renal = num(values.renal);
      const cv = num(values.cv);
      const total = resp + renal + cv;
      const systemsFailed = [resp, renal, cv].filter((x) => x >= 2).length;
      const anyFailure = systemsFailed > 0;

      if (!anyFailure) {
        return {
          score: total,
          label: 'No organ failure (all systems <2)',
          interpretation: `Modified Marshall total ${total}; no system ≥2. Organ failure absent — if local complications absent, may fit mild pancreatitis clinically.`,
          riskLevel: 'low' as const,
          details: [
            { label: 'Respiratory', value: String(resp) },
            { label: 'Renal', value: String(renal) },
            { label: 'Cardiovascular', value: String(cv) },
            { label: 'Systems with score ≥2', value: '0' },
          ],
        };
      }

      return {
        score: total,
        label: systemsFailed >= 2 ? 'Multiple organ failure' : 'Organ failure present',
        interpretation: `${systemsFailed} system(s) with Marshall ≥2 (R ${resp}, K ${renal}, CV ${cv}). Persistent organ failure >48 h defines severe pancreatitis (revised Atlanta).`,
        riskLevel: systemsFailed >= 2 || Math.max(resp, renal, cv) >= 3 ? ('critical' as const) : ('high' as const),
        details: [
          { label: 'Respiratory', value: String(resp) },
          { label: 'Renal', value: String(renal) },
          { label: 'Cardiovascular', value: String(cv) },
          { label: 'Systems failed (≥2)', value: String(systemsFailed) },
        ],
        recommendations: ['ICU/step-down consideration', 'Support oxygenation/BP/renal perfusion', 'Reassess at 48 h for persistent failure'],
      };
    },
    evidence: {
      summary:
        'Modified Marshall: respiratory PaO₂/FiO₂, creatinine, and SBP/pressor/pH tiers scored 0–4. Organ failure = score ≥2 in any organ. Persistent >48 h = severe pancreatitis.',
      formula: 'Per-organ 0–4; failure if any organ ≥2',
      validation: 'Embedded in revised Atlanta classification (2012) for AP severity.',
      references: [
        {
          title: 'Classification of acute pancreatitis—2012: revision of the Atlanta classification',
          citation: 'Banks PA et al. Gut. 2013;62:102-111',
          year: 2013,
          pmid: '23100216',
          doi: '10.1136/gutjnl-2012-302779',
        },
      ],
    },
    nextSteps: [
      { condition: 'No organ failure', actions: ['Ward care if otherwise well', 'Supportive therapy', 'Watch for evolution'] },
      { condition: 'Organ failure', actions: ['ICU-capable monitoring', 'Treat cause of failure', 'Document duration (≥48 h = severe)'] },
    ],
    pearls: [
      'Transient organ failure ≤48 h = moderately severe if local complications; persistent = severe.',
      'Off-pressor hypotensive pH tiers approximate original Marshall cardiovascular scoring used in AP.',
    ],
  },

  {
    id: 'manheim-peritonitis',
    name: 'Mannheim Peritonitis Index (Simplified)',
    shortName: 'MPI',
    description: 'Simplified Mannheim Peritonitis Index for mortality risk in secondary peritonitis.',
    category: 'emergency',
    tags: ['peritonitis', 'mannheim', 'mpi', 'surgery', 'sepsis'],
    whenToUse: 'Secondary peritonitis / intra-abdominal sepsis risk stratification perioperatively.',
    whyUse: 'Weighted clinical factors estimate mortality risk and support ICU triage decisions.',
    inputs: [
      yesNo('age50', 'Age >50 years', 5, 'Age >50 at the time of peritonitis.'),
      yesNo('female', 'Female sex', 5, 'Female sex (MPI weighted predictor).'),
      yesNo('organFailure', 'Organ failure', 7, 'MPI organ failure if any: kidney Cr >177 µmol/L (>2.0 mg/dL) or urea >16.7 mmol/L or oliguria <20 mL/h; lung PaO2 <50 mmHg or PaCO2 >50 mmHg; shock (hypo- or hyperdynamic, SBP <90 without inotropes); intestinal obstruction/paralysis ≥24 h or complete mechanical obstruction.'),
      yesNo('malignancy', 'Malignancy present', 4, 'Malignancy present at this operation (not remote treated cancer in remission).'),
      yesNo('duration24', 'Preoperative duration of peritonitis >24 h', 4, 'Time from onset of peritonitis to operation >24 hours.'),
      yesNo('nonColonic', 'Origin not colonic', 4, 'Source is not the colon (e.g. gastroduodenal, small bowel, appendix, biliary, other). Colonic origin scores 0 on this item.'),
      yesNo('diffuse', 'Diffuse generalized peritonitis', 6, 'Generalized = purulent/fecal contamination of >2 abdominal quadrants (not a single-quadrant abscess).'),
      selectInput('exudate', 'Exudate character', [
        { label: 'Clear (0)', value: 0, description: 'Clear / serous peritoneal fluid' },
        { label: 'Cloudy / purulent (6)', value: 6, description: 'Cloudy, turbid, or frankly purulent exudate' },
        { label: 'Fecal (12)', value: 12, description: 'Feculent contamination (stool in the peritoneum)' },
      ], undefined, 'Intraoperative or documented exudate character. Clear = serous; cloudy/purulent = pus; fecal = feculent.'),
    ],
    calculate(values) {
      const score =
        (bool(values.age50) ? 5 : 0) +
        (bool(values.female) ? 5 : 0) +
        (bool(values.organFailure) ? 7 : 0) +
        (bool(values.malignancy) ? 4 : 0) +
        (bool(values.duration24) ? 4 : 0) +
        (bool(values.nonColonic) ? 4 : 0) +
        (bool(values.diffuse) ? 6 : 0) +
        num(values.exudate);

      const r = riskFromThresholds(score, [
        {
          max: 20,
          level: 'moderate',
          label: 'Lower MPI band',
          interpretation: `MPI ${score}: lower mortality band in classic cutoffs (<21 often cited). Still needs source control and antibiotics.`,
        },
        {
          max: 29,
          level: 'high',
          label: 'Intermediate–high MPI',
          interpretation: `MPI ${score}: intermediate-high risk (classic 21–29 band) — aggressive source control, ICU consideration, organ support.`,
        },
        {
          max: 60,
          level: 'critical',
          label: 'Very high MPI (≥30)',
          interpretation: `MPI ${score}: very high predicted mortality band — maximal support, damage-control laparotomy principles as indicated.`,
        },
      ]);
      return {
        score,
        ...r,
        details: [{ label: 'Classic educational cutoffs', value: '<21 lower · 21–29 mid · ≥30 high mortality' }],
      };
    },
    evidence: {
      summary:
        'Mannheim Peritonitis Index weights age>50, female, organ failure, malignancy, duration >24h, non-colonic origin, diffuse peritonitis, and exudate type (clear/cloudy/fecal).',
      formula: 'Sum of weighted factors (0–47 typical maximum)',
      validation: 'Validated European surgical cohorts; cutoffs approximate mortality strata — local performance varies.',
      references: [
        {
          title: 'The Mannheim peritonitis index',
          citation: 'Linder MM et al. Chirurg. 1987; related validation studies',
          year: 1987, pmid: '3568820' },
      ],
    },
    nextSteps: [
      { condition: 'Any peritonitis', actions: ['Source control', 'Broad-spectrum antibiotics', 'Resuscitation (SSC)'] },
      { condition: 'MPI ≥21 or organ failure', actions: ['ICU care', 'Re-laparotomy on demand vs planned per strategy'] },
    ],
    pearls: ['Educational simplification — confirm organ-failure definition used locally.', 'Source control timing dominates prognosis more than the score alone.'],
  },

  {
    id: 'boey-score',
    name: 'Boey Score (Perforated Peptic Ulcer)',
    shortName: 'Boey',
    description: 'Three-factor Boey score predicting mortality after perforated peptic ulcer.',
    category: 'emergency',
    tags: ['ulcer', 'perforation', 'boey', 'ppu', 'surgery'],
    whenToUse: 'Patients with perforated peptic ulcer for perioperative mortality risk.',
    whyUse: 'Simple 0–3 score from medical illness, shock, and delayed presentation.',
    inputs: [
      yesNo('medicalIllness', 'Major concurrent medical illness', 1, 'Major medical illness in Boey series: severe cardiac, pulmonary, renal, or hepatic disease, or disseminated malignancy — not well-controlled mild comorbidity. Original shock was often SBP <100 mmHg; this form keeps on-screen shock as SBP <90.'),
      yesNo('shock', 'Preoperative shock (SBP <90 or poor perfusion)', 1, 'SBP <90 mmHg or clear poor perfusion (cool, mottled, lactate rise) before the operation. Original Boey series often used SBP <100 — this form keeps <90.'),
      yesNo('delay24', 'Presentation / perforation >24 hours', 1, 'Time from perforation (or symptom onset of perforation) to presentation/operation >24 hours.'),
    ],
    calculate(values) {
      const score =
        (bool(values.medicalIllness) ? 1 : 0) +
        (bool(values.shock) ? 1 : 0) +
        (bool(values.delay24) ? 1 : 0);
      const mort: Record<number, string> = {
        0: '~0–2%',
        1: '~10%',
        2: '~45%',
        3: '~80–100%',
      };
      const r = riskFromThresholds(score, [
        {
          max: 0,
          level: 'low',
          label: 'Boey 0 — low mortality',
          interpretation: `Boey 0 (approx mortality ${mort[0]}). Prompt source control usually excellent prognosis if no other factors.`,
        },
        {
          max: 1,
          level: 'moderate',
          label: 'Boey 1 — intermediate',
          interpretation: `Boey 1 (approx mortality ${mort[1]}). Optimize comorbidities; urgent operative or selected laparoscopic repair.`,
        },
        {
          max: 2,
          level: 'high',
          label: 'Boey 2 — high',
          interpretation: `Boey 2 (approx mortality ${mort[2]}). High risk — aggressive resuscitation, early OR, ICU postoperatively.`,
        },
        {
          max: 3,
          level: 'critical',
          label: 'Boey 3 — very high',
          interpretation: `Boey 3 (approx mortality ${mort[3]}). Extremely high risk; damage-control mindset, maximal perioperative support.`,
        },
      ]);
      return {
        score,
        ...r,
        details: [{ label: 'Approximate historical mortality', value: mort[score] ?? 'n/a' }],
      };
    },
    evidence: {
      summary:
        'Boey: (1) major medical illness, (2) preoperative shock, (3) presentation >24 h. Mortality rises sharply from 0→3 factors.',
      formula: 'Sum of 3 binary factors (0–3)',
      validation: 'Boey et al. classic series; modern mortality lower with better critical care but gradient persists.',
      references: [
        {
          title: 'Risk stratification in perforated duodenal ulcers: a prospective validation of predictive factors',
          citation: 'Boey J et al. Ann Surg. 1987;205:22-32',
          year: 1987,
          pmid: '3800459',
          doi: '10.1097/00000658-198701000-00005',
        },
      ],
    },
    nextSteps: [
      { condition: 'Any perforation', actions: ['Resuscitate', 'IV PPI', 'Broad-spectrum Abx', 'Urgent surgical repair / selected nonop in contained cases'] },
      { condition: 'Boey ≥2', actions: ['ICU booked', 'Senior surgeon involvement', 'Post-op organ support readiness'] },
    ],
    pearls: ['Mortality % are historical educational estimates — counsel with modern institutional data.', 'Shock before OR is the dominant modifiable risk via resuscitation.'],
  },

  {
    id: 'posum-simp',
    name: 'POSSUM Surgical Risk (Simplified Educational)',
    shortName: 'POSSUM simp',
    description: 'Simplified educational POSSUM-style physiologic risk tally — not the full logistic POSSUM equation.',
    category: 'surgery',
    tags: ['possum', 'surgical risk', 'perioperative', 'mortality'],
    whenToUse: 'Teaching / rough physiologic burden estimate before major surgery (not a validated full POSSUM calculator).',
    whyUse: 'Highlights key physiologic domains used in POSSUM without claiming precise mortality percentages.',
    inputs: [
      selectInput('age', 'Age band', [
        { label: '≤60 (1)', value: 1, description: 'Age ≤60 years' },
        { label: '61–70 (2)', value: 2, description: 'Age 61–70 years (educational simplification — full POSSUM uses 61–70 = 3)' },
        { label: '≥71 (4)', value: 4, description: 'Age ≥71 years' },
      ], undefined, 'Educational POSSUM-style bands. Full Copeland POSSUM ages 61–70 score 3, not 2 — do not quote this as official POSSUM.'),
      selectInput('cardiac', 'Cardiac status', [
        { label: 'No failure (1)', value: 1, description: 'No cardiac failure; no cardiac meds for failure/angina' },
        { label: 'Diuretic/digoxin/antianginal (2)', value: 2, description: 'On diuretic, digoxin, antianginal, or antihypertensive therapy (compensated)' },
        { label: 'Peripheral edema / warfarin (4)', value: 4, description: 'Peripheral edema, warfarin therapy, or borderline cardiomegaly' },
        { label: 'Raised JVP / cardiomegaly (8)', value: 8, description: 'Raised jugular venous pressure or cardiomegaly (overt failure)' },
      ], undefined, 'Copeland physiologic cardiac categories. Score current/compensated status, not remote history alone.'),
      selectInput('resp', 'Respiratory status', [
        { label: 'No dyspnea (1)', value: 1, description: 'No dyspnea on exertion; CXR not showing COPD/fibrosis/consolidation' },
        { label: 'Dyspnea on exertion / mild COPD (2)', value: 2, description: 'Dyspnea on exertion (e.g. hurrying or hills) or mild COPD on CXR' },
        { label: 'Limiting dyspnea / moderate COPD (4)', value: 4, description: 'Limiting dyspnea (one flight of stairs) or moderate COPD' },
        { label: 'Dyspnea at rest / fibrosis (8)', value: 8, description: 'Dyspnea at rest (often RR ≥30) or fibrosis/consolidation on CXR' },
      ], 1, 'Limiting dyspnea = one flight of stairs or moderate COPD; rest dyspnea also includes fibrosis/consolidation on CXR.'),
      selectInput('sbp', 'Systolic BP', [
        { label: '110–130 (1)', value: 1, description: 'SBP 110–130 mmHg' },
        { label: '100–109 or 131–170 (2)', value: 2, description: 'SBP 100–109 or 131–170 mmHg' },
        { label: '≥171 or 90–99 (4)', value: 4, description: 'SBP ≥171 or 90–99 mmHg' },
        { label: '≤89 (8)', value: 8, description: 'SBP ≤89 mmHg' },
      ], undefined, 'Use current preoperative SBP (mmHg).'),
      selectInput('hr', 'Heart rate', [
        { label: '50–80 (1)', value: 1, description: 'HR 50–80 /min' },
        { label: '40–49 or 81–100 (2)', value: 2, description: 'HR 40–49 or 81–100 /min' },
        { label: '101–120 (4)', value: 4, description: 'HR 101–120 /min' },
        { label: '≥121 or ≤39 (8)', value: 8, description: 'HR ≥121 or ≤39 /min' },
      ], undefined, 'Use current preoperative heart rate.'),
      selectInput('gcs', 'GCS', [
        { label: '15 (1)', value: 1, description: 'GCS 15' },
        { label: '12–14 (2)', value: 2, description: 'GCS 12–14' },
        { label: '9–11 (4)', value: 4, description: 'GCS 9–11' },
        { label: '≤8 (8)', value: 8, description: 'GCS ≤8' },
      ], undefined, 'Eye + verbal + motor (3–15). Intubated: score best motor and eye; do not invent a verbal of 5.'),
      selectInput('opMagnitude', 'Operation magnitude (surgical factor)', [
        { label: 'Minor (1)', value: 1, description: 'Hernia, varicose veins, minor perianal/scrotal' },
        { label: 'Moderate (2)', value: 2, description: 'Appendectomy, cholecystectomy, mastectomy, TURP' },
        { label: 'Major (4)', value: 4, description: 'Laparotomy, bowel resection, CBD exploration, major amputation, peripheral vascular' },
        { label: 'Major+ (8)', value: 8, description: 'Aortic, APR, Whipple, liver resection, esophagectomy' },
      ]),
      yesNo('emergency', 'Emergency surgery', 3, 'Yes if the operation is not elective (immediate or urgent). Educational weight only — not the full 6-variable POSSUM operative score.'),
    ],
    calculate(values) {
      const phys =
        num(values.age) +
        num(values.cardiac) +
        num(values.resp) +
        num(values.sbp) +
        num(values.hr) +
        num(values.gcs);
      const surg = num(values.opMagnitude) + (bool(values.emergency) ? 4 : 1);
      const total = phys + surg;
      const r = riskFromThresholds(total, [
        {
          max: 20,
          level: 'low',
          label: 'Lower simplified burden',
          interpretation: `Educational total ${total} (phys ${phys} + surg ${surg}). Lower domain burden — still use full POSSUM/P-POSSUM or ACS-NSQIP for informed consent numbers.`,
        },
        {
          max: 35,
          level: 'moderate',
          label: 'Moderate simplified burden',
          interpretation: `Educational total ${total}. Moderate physiologic/surgical load — optimize medical status; consider HDU postoperatively.`,
        },
        {
          max: 100,
          level: 'high',
          label: 'High simplified burden',
          interpretation: `Educational total ${total}. High risk profile — senior review, ICU planning, consider less invasive options if goals allow.`,
        },
      ]);
      return {
        score: total,
        ...r,
        details: [
          { label: 'Physiologic subtotal', value: String(phys) },
          { label: 'Surgical subtotal', value: String(surg) },
          { label: 'Note', value: 'Not full logistic POSSUM mortality' },
        ],
      };
    },
    evidence: {
      summary:
        'Full POSSUM uses 12 physiologic + 6 operative variables in a logistic equation (Copeland). This tool is a simplified educational point tally only.',
      formula: 'Simplified sum of selected POSSUM-like categories (not logistic output)',
      validation: 'Full POSSUM/P-POSSUM validated widely; this simplification is for teaching domain awareness only.',
      references: [
        {
          title: 'POSSUM: a scoring system for surgical audit',
          citation: 'Copeland GP et al. Br J Surg. 1991;78:355-360',
          year: 1991,
          pmid: '2021856',
          doi: '10.1002/bjs.1800780327',
        },
      ],
    },
    nextSteps: [
      { condition: 'Any major surgery', actions: ['Use institutional risk calculator for consent', 'Optimize anemia/cardiac/resp disease', 'Plan level of postop care'] },
      { condition: 'High simplified burden', actions: ['Anesthesia + surgical shared decision', 'ICU bed', 'Consider procedure modification'] },
    ],
    pearls: [
      'Do NOT quote this total as a mortality percentage.',
      'P-POSSUM adjusts over-prediction of death in low-risk patients.',
    ],
  },

  {
    id: 'acs-nsqip-simp',
    name: 'Surgical Risk Helper (ACS-NSQIP style educational)',
    shortName: 'NSQIP simp',
    description:
      'Educational approximate surgical risk helper using age, ASA, emergency case, and functional status — not the official ACS-NSQIP calculator.',
    category: 'surgery',
    tags: ['nsqip', 'surgical risk', 'asa', 'perioperative'],
    whenToUse: 'Quick teaching frame for relative perioperative risk before major surgery.',
    whyUse: 'Surfaces dominant predictors used in modern surgical risk models without claiming NSQIP accuracy.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 18, max: 100, defaultValue: 65, helpText: 'Educational age points: <65 = 0; 65–74 = 1; 75–84 = 2; ≥85 = 3 (applied in calculate; do not change this field’s meaning).' }),
      selectInput('asa', 'ASA class', [
        { label: 'I', value: 1, description: 'Healthy' },
        { label: 'II', value: 2, description: 'Mild systemic disease' },
        { label: 'III', value: 3, description: 'Severe systemic disease' },
        { label: 'IV', value: 4, description: 'Constant threat to life' },
        { label: 'V', value: 5, description: 'Moribund, not expected to survive without operation' },
      ], 1, 'I healthy; II mild systemic disease; III severe systemic disease; IV constant threat to life; V moribund, not expected to survive without operation.'),
      yesNo('emergency', 'Emergency case', 2, 'NSQIP emergency = operation required within a short interval because delay would threaten life or limb (not merely unscheduled add-on).'),
      selectInput('functional', 'Functional status', [
        { label: 'Independent', value: 0, description: 'No assistance from another person for any ADL (devices OK)' },
        { label: 'Partially dependent', value: 1, description: 'Some help with ADLs (bathing, dressing, feeding, toileting, transfer)' },
        { label: 'Totally dependent', value: 2, description: 'Total assistance for all ADLs' },
      ], 0, 'NSQIP: Independent = no assistance from another person for any ADL (devices OK); Partially dependent = some help with ADLs (bathing, dressing, feeding, toileting, transfer); Totally dependent = total assistance for all ADLs. Score the baseline before this illness.'),
      selectInput('procedure', 'Procedure intensity (approx)', [
        { label: 'Low (e.g., minor soft tissue)', value: 0, description: 'Hernia, I&D, minor soft tissue, cystoscopy, diagnostic laparoscopy without resection' },
        { label: 'Moderate (e.g., lap cholecystectomy)', value: 1, description: 'Laparoscopic cholecystectomy, appendectomy, TURP, hernia with mesh, breast lumpectomy' },
        { label: 'High (e.g., colectomy, major vascular)', value: 2, description: 'Colectomy, hysterectomy, major vascular reconstruction, THA/TKA, open cholecystectomy with CBD exploration' },
        { label: 'Very high (e.g., ruptured aneurysm, damage control)', value: 3, description: 'Ruptured AAA, damage-control laparotomy, esophagectomy, Whipple, liver resection, major trauma laparotomy' },
      ], undefined, 'Educational intensity only — not CPT-specific ACS-NSQIP. Pick the closest example; do not use this index for consent percentages.'),
    ],
    calculate(values) {
      const age = num(values.age, 65);
      let agePts = 0;
      if (age >= 85) agePts = 3;
      else if (age >= 75) agePts = 2;
      else if (age >= 65) agePts = 1;

      const score = agePts + num(values.asa) + (bool(values.emergency) ? 2 : 0) + num(values.functional) + num(values.procedure);

      const r = riskFromThresholds(score, [
        {
          max: 4,
          level: 'low',
          label: 'Lower relative risk band',
          interpretation: `Educational index ${score}. Lower relative perioperative risk — still individualize; use official ACS-NSQIP Surgical Risk Calculator for percentages.`,
        },
        {
          max: 8,
          level: 'moderate',
          label: 'Intermediate relative risk',
          interpretation: `Educational index ${score}. Intermediate burden — optimize modifiable risks; consider enhanced recovery and appropriate monitoring.`,
        },
        {
          max: 20,
          level: 'high',
          label: 'Higher relative risk band',
          interpretation: `Educational index ${score}. Higher predicted complication/mortality burden — shared decision-making, ICU planning, goals of care.`,
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'Age points', value: String(agePts) },
          { label: 'Disclaimer', value: 'Not ACS-NSQIP official output' },
        ],
      };
    },
    evidence: {
      summary:
        'ACS-NSQIP Surgical Risk Calculator uses CPT-specific models with many predictors. This helper only approximates relative risk from age, ASA, emergency, function, and procedure intensity.',
      formula: 'agePts + ASA + emergency(2) + functional + procedure intensity',
      validation: 'Educational only — official tool: riskcalculator.facs.org',
      references: [
        {
          title: 'Development and evaluation of the universal ACS NSQIP surgical risk calculator',
          citation: 'Bilimoria KY et al. J Am Coll Surg. 2013;217:833-842',
          year: 2013,
          pmid: '24055383',
          doi: '10.1016/j.jamcollsurg.2013.07.385',
        },
      ],
    },
    nextSteps: [
      { condition: 'Any elective major case', actions: ['Run official NSQIP calculator', 'Prehab/optimize anemia, smoking, glucose', 'Discuss code status'] },
      { condition: 'High band', actions: ['Geriatrics/anesthesia review', 'ICU availability', 'Consider less invasive alternatives'] },
    ],
    pearls: ['Never use this index for informed consent percentages.', 'Emergency and totally dependent status heavily drive real NSQIP risk.'],
  },

  {
    id: 'asa-physical',
    name: 'ASA Physical Status Classification',
    shortName: 'ASA PS',
    description: 'ASA Physical Status I–VI classification for pre-anesthesia comorbidity burden.',
    category: 'surgery',
    tags: ['asa', 'anesthesia', 'preop', 'physical status'],
    whenToUse: 'Preoperative assessment and anesthesia documentation of systemic disease severity.',
    whyUse: 'Universal language for comorbidity burden; correlates with perioperative risk (not a standalone risk calculator).',
    inputs: [
      selectInput('asa', 'ASA Physical Status', [
        { label: 'I — Normal healthy patient', value: 1, description: 'No organic, physiologic, or psychiatric disturbance' },
        { label: 'II — Mild systemic disease', value: 2, description: 'Current smoker, social alcohol, pregnancy, BMI 30–40, well-controlled DM/HTN, mild lung disease' },
        { label: 'III — Severe systemic disease', value: 3, description: 'Poorly controlled DM/HTN, COPD, BMI ≥40, alcohol dependence, pacemaker, reduced EF, ESRD on dialysis, MI/CVA/TIA/stents >3 months' },
        { label: 'IV — Severe systemic disease, constant threat to life', value: 4, description: 'Recent (<3 months) MI/CVA/TIA/stents, ongoing ischemia, severe valve/EF, sepsis, DIC, ARDS, or ESRD not on regular dialysis' },
        { label: 'V — Moribund, not expected to survive without operation', value: 5, description: 'Ruptured aneurysm, massive trauma, intracranial bleed with mass effect' },
        { label: 'VI — Declared brain-dead organ donor', value: 6, description: 'Declared brain-dead; organs being removed for donor purposes' },
      ]),
      yesNo('emergency', 'Emergency modifier (E)', 0, 'E = delay would significantly increase threat to life or body part.'),
    ],
    calculate(values) {
      const asa = num(values.asa, 1);
      const em = bool(values.emergency);
      const labels: Record<number, { label: string; interpretation: string; riskLevel: 'low' | 'moderate' | 'high' | 'critical' | 'info' }> = {
        1: {
          label: 'ASA I',
          interpretation: 'Normal healthy patient — no organic, physiologic, or psychiatric disturbance.',
          riskLevel: 'low',
        },
        2: {
          label: 'ASA II',
          interpretation: 'Mild systemic disease (e.g., well-controlled HTN/DM, mild obesity, pregnancy, current smoker).',
          riskLevel: 'low',
        },
        3: {
          label: 'ASA III',
          interpretation: 'Severe systemic disease with substantive functional limitations (e.g., poorly controlled DM/HTN, COPD, ESRD on dialysis, implanted pacemaker, history MI/CVA/TIA/stents >3 mo).',
          riskLevel: 'moderate',
        },
        4: {
          label: 'ASA IV',
          interpretation: 'Severe systemic disease that is a constant threat to life (e.g., recent MI/CVA/stents <3 mo, ongoing cardiac ischemia, severe valve dysfunction, sepsis, DIC, ARD or ESRD not on regular dialysis).',
          riskLevel: 'high',
        },
        5: {
          label: 'ASA V',
          interpretation: 'Moribund patient not expected to survive without the operation (e.g., ruptured aneurysm, massive trauma, intracranial bleed with mass effect).',
          riskLevel: 'critical',
        },
        6: {
          label: 'ASA VI',
          interpretation: 'Declared brain-dead patient whose organs are being removed for donor purposes.',
          riskLevel: 'info',
        },
      };
      const row = labels[asa] ?? labels[1];
      const suffix = em && asa < 6 ? 'E' : '';
      return {
        score: asa,
        label: `${row.label}${suffix ? 'E' : ''}`,
        interpretation: `${row.interpretation}${em && asa < 6 ? ' Emergency (E) modifier applied — delay would significantly increase threat to life or body part.' : ''}`,
        riskLevel: row.riskLevel,
        details: [{ label: 'Documented class', value: `ASA ${asa}${suffix}` }],
      };
    },
    evidence: {
      summary: 'ASA PS I–VI describes preoperative comorbidity. “E” denotes emergency. Not alone sufficient for mortality prediction.',
      formula: 'Clinician-assigned ASA I–VI ± E',
      validation: 'ASA House of Delegates definitions; inter-rater variability exists — use examples as anchors.',
      references: [
        {
          title: 'ASA Physical Status Classification System',
          citation: 'American Society of Anesthesiologists — official ASA PS definitions',
          year: 2014, url: 'https://www.asahq.org/standards-and-practice-parameters/statement-on-asa-physical-status-classification-system' },
      ],
    },
    nextSteps: [
      { condition: 'ASA I–II elective', actions: ['Standard preop pathway'] },
      { condition: 'ASA III–V', actions: ['Optimize comorbidities when time allows', 'Anesthesia senior review', 'Plan monitoring / level of care'] },
    ],
    pearls: ['ASA is not an airway exam — document Mallampati/LEMON separately.', 'Examples lists help reduce classification drift between raters.'],
  },

  {
    id: 'apfel-ponv',
    name: 'Apfel PONV Risk Score',
    shortName: 'Apfel',
    description: 'Simplified Apfel score predicting postoperative nausea and vomiting risk.',
    category: 'surgery',
    tags: ['ponv', 'apfel', 'anesthesia', 'nausea'],
    whenToUse: 'Adults before surgery to guide PONV prophylaxis intensity.',
    whyUse: 'Four binary predictors; risk rises ~20% per point — informs multimodal antiemetic prophylaxis.',
    inputs: [
      yesNo('female', 'Female sex', 1, 'Assigned female sex (Apfel predictor).'),
      yesNo('nonsmoker', 'Nonsmoker', 1, 'Current nonsmoker. Smoking is protective against PONV — smokers score 0 on this item.'),
      yesNo('history', 'History of PONV or motion sickness', 1, 'Prior postoperative nausea/vomiting OR motion sickness (either counts).'),
      yesNo('opioids', 'Postoperative opioids planned/used', 1, 'Postoperative opioids planned or already given (not just intraoperative fentanyl).'),
    ],
    calculate(values) {
      const score =
        (bool(values.female) ? 1 : 0) +
        (bool(values.nonsmoker) ? 1 : 0) +
        (bool(values.history) ? 1 : 0) +
        (bool(values.opioids) ? 1 : 0);
      const risks = [10, 20, 40, 60, 80];
      const pct = risks[score] ?? 80;
      const r = riskFromThresholds(score, [
        {
          max: 1,
          level: 'low',
          label: `Low–moderate PONV risk (~${pct}%)`,
          interpretation: `Apfel ${score}/4 ≈ ${pct}% PONV risk. Consider 1–2 prophylactic interventions (e.g., 5-HT3 antagonist ± dexamethasone).`,
        },
        {
          max: 2,
          level: 'moderate',
          label: `Moderate PONV risk (~${pct}%)`,
          interpretation: `Apfel ${score}/4 ≈ ${pct}% risk. Multimodal prophylaxis recommended (2 agents from different classes).`,
        },
        {
          max: 4,
          level: 'high',
          label: `High PONV risk (~${pct}%)`,
          interpretation: `Apfel ${score}/4 ≈ ${pct}% risk. Aggressive multimodal prophylaxis (≥2–3 agents), consider TIVA/propofol, minimize opioids, regional anesthesia when feasible.`,
        },
      ]);
      return {
        score,
        unit: 'points',
        ...r,
        details: [{ label: 'Approximate PONV incidence', value: `~${pct}%` }],
      };
    },
    evidence: {
      summary:
        'Apfel: female, nonsmoker, history of PONV/motion sickness, postoperative opioids. Risk ≈ 10/20/40/60/80% for scores 0–4.',
      formula: 'Sum of 4 binary risk factors',
      validation: 'Widely validated simplified score for adult PONV prophylaxis guidelines (SAMBA/consensus).',
      references: [
        {
          title: 'A simplified risk score for predicting postoperative nausea and vomiting',
          citation: 'Apfel CC et al. Anesthesiology. 1999;91:693-700',
          year: 1999,
          pmid: '10485781',
          doi: '10.1097/00000542-199909000-00022',
        },
      ],
    },
    nextSteps: [
      { condition: '0', actions: ['Optional single agent', 'Rescue antiemetic available'] },
      {
        condition: '≥1',
        actions: [
          '≥2 prophylactic classes (multimodal)',
          'Opioid-sparing strategy',
          'Consider propofol TIVA if high risk',
        ],
      },
    ],
    pearls: ['Nonsmoking increases PONV risk (smokers have lower rates).', 'Pediatric risk scores differ (Eberhart, etc.).'],
  },

  {
    id: 'aldrete-score',
    name: 'Aldrete Post-Anesthesia Recovery Score',
    shortName: 'Aldrete',
    description: 'Modified Aldrete score for PACU discharge readiness (activity, respiration, circulation, consciousness, O₂ sat).',
    category: 'surgery',
    tags: ['aldrete', 'pacu', 'recovery', 'anesthesia'],
    whenToUse: 'Post-anesthesia care unit readiness for discharge to ward or phase II.',
    whyUse: 'Standardized 0–10 recovery score; many units require ≥9 (with no zeros) before discharge.',
    inputs: [
      selectInput('activity', 'Activity (limb movement)', [
        { label: 'Moves 0 extremities (0)', value: 0, description: 'Unable to move any extremity voluntarily or on command' },
        { label: 'Moves 2 extremities (1)', value: 1, description: 'Moves two extremities (often residual neuraxial or nerve block)' },
        { label: 'Moves 4 extremities (2)', value: 2, description: 'Moves all four extremities voluntarily or on command' },
      ], undefined, 'On command or spontaneously. 2 = all four limbs; 1 = two limbs; 0 = none. Residual spinal/epidural block commonly scores 1 until receding.'),
      selectInput('respiration', 'Respiration', [
        { label: 'Apneic / ventilated (0)', value: 0, description: 'Apneic or still mechanically ventilated' },
        { label: 'Dyspnea or limited breathing (1)', value: 1, description: 'Dyspneic, shallow, or limited breathing; can maintain airway but cannot take a deep breath and cough freely' },
        { label: 'Able to breathe deeply and cough (2)', value: 2, description: 'Breathes deeply and coughs freely' },
      ], undefined, '2 = deep breath and cough; 1 = dyspneic, shallow, or obstructed but breathing; 0 = apnea or still ventilated.'),
      selectInput('circulation', 'Circulation (BP vs baseline)', [
        { label: 'BP ± ≥50% of preanesthetic level (0)', value: 0, description: 'Current SBP differs from preanesthetic SBP by ≥50%' },
        { label: 'BP ± 20–49% of preanesthetic level (1)', value: 1, description: 'Current SBP differs from preanesthetic SBP by 20–49%' },
        { label: 'BP ± <20% of preanesthetic level (2)', value: 2, description: 'Current SBP within 20% of preanesthetic (baseline) SBP' },
      ], undefined, 'Compare current SBP to the preanesthetic (baseline) SBP. ± <20% = 2; 20–49% = 1; ≥50% = 0. Direction (high or low) both count.'),
      selectInput('consciousness', 'Consciousness', [
        { label: 'Unresponsive (0)', value: 0, description: 'Not responding to voice (may still grimace to pain)' },
        { label: 'Arousable on calling (1)', value: 1, description: 'Opens eyes and/or responds to voice but is not fully awake or oriented' },
        { label: 'Fully awake (2)', value: 2, description: 'Fully awake, oriented, conversant' },
      ], undefined, '2 = fully awake (oriented, conversant). 1 = arousable on calling — opens eyes/responds to voice but not fully awake. 0 = unresponsive to voice.'),
      selectInput('o2', 'Oxygen saturation', [
        { label: 'SpO₂ <90% even with O₂ (0)', value: 0, description: 'SpO₂ remains <90% despite supplemental oxygen' },
        { label: 'Needs O₂ to maintain SpO₂ >90% (1)', value: 1, description: 'Requires supplemental O₂ to keep SpO₂ >90%' },
        { label: 'SpO₂ >92% on room air (2)', value: 2, description: 'Maintains SpO₂ >92% on room air' },
      ], undefined, 'Modified Aldrete uses SpO₂, not color. 2 = SpO₂ >92% on room air; 1 = needs O₂ to keep SpO₂ >90%; 0 = SpO₂ <90% even on O₂. Many units require total ≥9 with no domain of 0 before PACU discharge.'),
    ],
    calculate(values) {
      const score =
        num(values.activity) +
        num(values.respiration) +
        num(values.circulation) +
        num(values.consciousness) +
        num(values.o2);
      const hasZero =
        num(values.activity) === 0 ||
        num(values.respiration) === 0 ||
        num(values.circulation) === 0 ||
        num(values.consciousness) === 0 ||
        num(values.o2) === 0;

      if (score >= 9 && !hasZero) {
        return {
          score,
          label: 'Ready by Aldrete criteria (≥9, no zeros)',
          interpretation: `Aldrete ${score}/10 without category zeros — meets common PACU discharge threshold. Still confirm pain, nausea, surgical issues, and escort/home criteria.`,
          riskLevel: 'low' as const,
        };
      }
      if (score >= 8) {
        return {
          score,
          label: 'Borderline recovery',
          interpretation: `Aldrete ${score}/10${hasZero ? ' (has a zero domain)' : ''}. May need longer observation; many units require ≥9 and no category of 0.`,
          riskLevel: 'moderate' as const,
        };
      }
      return {
        score,
        label: 'Not ready for discharge',
        interpretation: `Aldrete ${score}/10 — continue PACU care; address respiration, hemodynamics, consciousness, or oxygenation deficits.`,
        riskLevel: 'high' as const,
        recommendations: ['Remain in PACU', 'Treat underlying cause', 'Re-score periodically'],
      };
    },
    evidence: {
      summary:
        'Aldrete: activity, respiration, circulation, consciousness, SpO₂ each 0–2 (total 0–10). Discharge commonly when ≥9.',
      formula: 'Sum of 5 domains × 0–2 points',
      validation: 'Classic PACU discharge score (Aldrete & Kroulik); modified versions replace color with SpO₂.',
      references: [
        {
          title: 'A postanesthetic recovery score',
          citation: 'Aldrete JA, Kroulik D. Anesth Analg. 1970;49:924-934',
          year: 1970,
          pmid: '5534693',
        },
      ],
    },
    nextSteps: [
      { condition: '≥9 and stable', actions: ['Discharge to ward/phase II per protocol', 'Document vitals and pain/PONV'] },
      { condition: '<9', actions: ['Continue monitoring', 'Airway/O₂ support', 'Notify anesthesia if deteriorating'] },
    ],
    pearls: ['Pain, bleeding, and surgical drains are separate discharge criteria.', 'PADSS used for ambulatory discharge beyond Aldrete.'],
  },

  {
    id: 'heaven-airway',
    name: 'HEAVEN Difficult Airway Criteria',
    shortName: 'HEAVEN',
    description: 'Counts HEAVEN criteria associated with difficult emergency airway management.',
    category: 'emergency',
    tags: ['airway', 'heaven', 'intubation', 'rsi', 'difficult airway'],
    whenToUse: 'Before emergency RSI / intubation to anticipate difficulty and prepare backups.',
    whyUse: 'Mnemonic captures hypoxemia, body habitus extremes, anatomic disruption, contaminants, exsanguination, and neck issues.',
    inputs: [
      yesNo('hypoxemia', 'H — Hypoxemia (SpO₂ ≤93% at time of attempt)', 1, 'SpO₂ ≤93% at the time of the intubation attempt (despite preoxygenation if already applied).'),
      yesNo('extremes', 'E — Extremes of size (pediatric, obese, acromegaly, etc.)', 1, 'HEAVEN: age ≤8 years or clinical obesity (some in-hospital series use BMI >35); acromegaly also counts.'),
      yesNo('anatomic', 'A — Anatomic challenge (trauma, mass, foreign body, angioedema)', 1, 'Trauma, tumor/mass, foreign body, angioedema, or other distortion of the airway anatomy.'),
      yesNo('vomit', 'V — Vomit / blood / fluid in airway', 1, 'Vomit, blood, or other fluid contaminating the airway at the time of attempt.'),
      yesNo('exsanguination', 'E — Exsanguination / anemia / shock affecting O₂ reserve', 1, 'Suspected acute blood loss or chronic anemia that could accelerate desaturation during RSI apnea (one in-hospital series used Hb <10 g/dL).'),
      yesNo('neck', 'N — Neck mobility limited or C-spine immobilization', 1, 'Limited cervical mobility or a C-collar / spinal precautions in place.'),
    ],
    calculate(values) {
      const keys = ['hypoxemia', 'extremes', 'anatomic', 'vomit', 'exsanguination', 'neck'] as const;
      const score = keys.reduce((s, k) => s + (bool(values[k]) ? 1 : 0), 0);
      if (score === 0) {
        return {
          score: 0,
          label: 'No HEAVEN criteria',
          interpretation: 'No listed HEAVEN predictors. Difficulty still possible — prepare standard failed-airway plan.',
          riskLevel: 'low' as const,
        };
      }
      if (score <= 2) {
        return {
          score,
          label: 'Some HEAVEN predictors',
          interpretation: `${score}/6 HEAVEN criteria. Elevated difficult-airway risk — optimize preoxygenation, video laryngoscopy, suction ×2, staged backups.`,
          riskLevel: 'moderate' as const,
          details: [{ label: 'HEAVEN positives', value: `${score} / 6` }],
        };
      }
      return {
        score,
        label: 'Multiple HEAVEN predictors',
        interpretation: `${score}/6 HEAVEN criteria. High anticipated difficulty/desaturation risk. Best operator, double setup, apneic oxygenation, surgical airway readiness.`,
        riskLevel: 'high' as const,
        details: [{ label: 'HEAVEN positives', value: `${score} / 6` }],
        recommendations: [
          'Difficult airway cart',
          'VL + bougie + SGA + cric kit',
          'Consider awake technique if feasible',
          'Resuscitate before RSI when possible (especially hypoxemia/exsanguination)',
        ],
      };
    },
    evidence: {
      summary:
        'HEAVEN: Hypoxemia, Extremes of size, Anatomic challenge, Vomit/blood/fluid, Exsanguination, Neck mobility. More positives → higher difficulty and peri-intubation arrest risk.',
      formula: 'Count of positive criteria (0–6)',
      validation: 'Derived/validated in air-medical and emergency airway literature (Davis et al. / related HEAVEN studies).',
      references: [
        {
          title: 'HEAVEN Criteria: Derivation of a New Difficult Airway Prediction Tool',
          citation: 'Davis DP, Olvera DJ. Air Med J. 2017;36(4):195-197',
          year: 2017,
          pmid: '28739243',
          doi: '10.1016/j.amj.2017.04.001',
        },
      ],
    },
    nextSteps: [
      { condition: '0–1', actions: ['Standard RSI prep with backup plan'] },
      { condition: '≥2', actions: ['Maximize preoxygenation', 'VL first-pass optimization', 'Help at bedside', 'Define fail points'] },
    ],
    pearls: ['Resuscitate before you intubate when shock/hypoxemia dominate.', 'HEAVEN complements LEMON/Mallampati rather than replacing them.'],
  },

  {
    id: 'cormack-lehane',
    name: 'Cormack–Lehane Grade',
    shortName: 'CL Grade',
    description: 'Cormack–Lehane laryngeal view grade at direct/video laryngoscopy (I–IV).',
    category: 'emergency',
    tags: ['airway', 'cormack', 'lehane', 'laryngoscopy', 'intubation'],
    whenToUse: 'Documenting glottic view during laryngoscopy and communicating difficulty.',
    whyUse: 'Universal grading of laryngeal exposure; higher grades predict harder intubation and need for adjuncts.',
    inputs: [
      selectInput('grade', 'Cormack–Lehane grade', [
        { label: 'Grade 1 — Full view of glottis', value: 1, description: 'Entire vocal cords / glottic opening visible (anterior and posterior commissures)' },
        { label: 'Grade 2a — Partial glottis (arytenoids + part of cords)', value: 2, description: 'Partial view of the glottis: arytenoids plus part of the vocal cords; anterior commissure not fully seen' },
        { label: 'Grade 2b — Arytenoids/posterior cords only', value: 3, description: 'Only arytenoids and/or the posterior-most vocal cords; no view of the anterior glottis (Cook modification)' },
        { label: 'Grade 3 — Only epiglottis visible', value: 4, description: 'Epiglottis visible but no part of the glottis or arytenoids (cannot see through the laryngeal inlet)' },
        { label: 'Grade 4 — Neither glottis nor epiglottis visible', value: 5, description: 'Neither glottis nor epiglottis seen (soft palate / posterior pharynx only)' },
      ], undefined, 'Score the best view with optimal positioning (sniffing or ramped) and external laryngeal manipulation (BURP/ELM) allowed. Document device (direct vs video laryngoscopy) — VL views are not always equivalent to classic DL grades. POGO (% of glottic opening) is a useful complement.'),
    ],
    calculate(values) {
      const g = num(values.grade, 1);
      // Map select values to display grades
      const displayMap: Record<number, { grade: string; label: string; interpretation: string; riskLevel: 'low' | 'moderate' | 'high' | 'critical' }> = {
        1: {
          grade: '1',
          label: 'CL Grade 1 — full glottis',
          interpretation: 'Entire vocal cords visible. Usually straightforward intubation; still confirm EtCO₂.',
          riskLevel: 'low',
        },
        2: {
          grade: '2a',
          label: 'CL Grade 2a — partial glottis',
          interpretation: 'Partial cord view. Often successful with optimal external laryngeal manipulation; bougie optional.',
          riskLevel: 'low',
        },
        3: {
          grade: '2b',
          label: 'CL Grade 2b — arytenoids only',
          interpretation: 'Only posterior structures seen. Higher difficulty — use bougie, optimize position/ELM, consider VL blade change.',
          riskLevel: 'moderate',
        },
        4: {
          grade: '3',
          label: 'CL Grade 3 — epiglottis only',
          interpretation: 'Epiglottis only (no glottic aperture). Difficult — bougie under epiglottis, hyperangulated VL, call for help, limit attempts.',
          riskLevel: 'high',
        },
        5: {
          grade: '4',
          label: 'CL Grade 4 — no epiglottis',
          interpretation: 'No laryngeal structures visible. Very difficult — change approach (VL/hyperangulated, adjuncts, awake if elective, prepare front-of-neck).',
          riskLevel: 'critical',
        },
      };
      const row = displayMap[g] ?? displayMap[1];
      return {
        score: row.grade,
        label: row.label,
        interpretation: row.interpretation,
        riskLevel: row.riskLevel,
        details: [{ label: 'Cormack–Lehane', value: row.grade }],
      };
    },
    evidence: {
      summary:
        'Cormack–Lehane grades 1–4 (with 2a/2b modification): extent of glottic visualization at laryngoscopy. Higher grade → greater intubation difficulty.',
      formula: 'Clinician-assigned grade 1, 2a, 2b, 3, or 4',
      validation: 'Standard airway documentation system since 1984; modified CL (Yentis/Cook) improves grade 2 granularity.',
      references: [
        {
          title: 'Difficult tracheal intubation in obstetrics',
          citation: 'Cormack RS, Lehane J. Anaesthesia. 1984;39:1105-1111',
          year: 1984,
          pmid: '6507827',
        },
      ],
    },
    nextSteps: [
      { condition: 'Grade 1–2a', actions: ['Proceed with intubation', 'Document view'] },
      { condition: 'Grade 2b–3', actions: ['Bougie', 'Optimize ELM/position', 'Early VL if not already'] },
      { condition: 'Grade 4', actions: ['Call for help', 'Change device/operator', 'Supraglottic rescue', 'Surgical airway readiness'] },
    ],
    pearls: ['POGO (% of glottic opening) is a useful complement to CL grade.', 'Video laryngoscopy views may not match classic DL grades exactly — document device used.'],
  },

  {
    id: 'macocha',
    name: 'MACOCHA Score (ICU Intubation Difficulty)',
    shortName: 'MACOCHA',
    description: 'MACOCHA score predicting difficult intubation in ICU patients.',
    category: 'critical-care',
    tags: ['airway', 'icu', 'macocha', 'intubation'],
    whenToUse: 'Before intubation of critically ill adults in ICU/ED-ICU settings.',
    whyUse: 'Identifies high-risk ICU intubations (score ≥3) to trigger experienced operators and preparation.',
    inputs: [
      yesNo('mallampati', 'Mallampati III or IV', 5, 'Modified Mallampati, mouth fully open, tongue out, no phonation. III = only soft palate + base of uvula; IV = hard palate only. ICU: estimate in a cooperative supine patient if sitting is impossible; if unassessable, do not guess III/IV.'),
      yesNo('osa', 'Obstructive sleep apnea', 2, 'Known OSA or high clinical suspicion (loud snoring, witnessed apneas, STOP-BANG high).'),
      yesNo('cervical', 'Reduced cervical spine mobility', 1, 'Limited neck extension/flexion (arthritis, ankylosis, collar, trauma).'),
      yesNo('mouth', 'Limited mouth opening <3 cm', 1, 'Inter-incisor distance <3 cm (about 2 fingerbreadths).'),
      yesNo('coma', 'Coma', 1, 'GCS ≤8 (De Jong).'),
      yesNo('hypoxemia', 'Severe hypoxemia', 1, 'SpO2 <80% (De Jong).'),
      yesNo('nonAnesth', 'Non-anesthesiologist operator', 1, 'Intubating operator is not an anesthesiologist (De Jong).'),
    ],
    calculate(values) {
      const score =
        (bool(values.mallampati) ? 5 : 0) +
        (bool(values.osa) ? 2 : 0) +
        (bool(values.cervical) ? 1 : 0) +
        (bool(values.mouth) ? 1 : 0) +
        (bool(values.coma) ? 1 : 0) +
        (bool(values.hypoxemia) ? 1 : 0) +
        (bool(values.nonAnesth) ? 1 : 0);

      if (score < 3) {
        return {
          score,
          label: 'Lower MACOCHA difficulty risk (<3)',
          interpretation: `MACOCHA ${score}/12: lower predicted difficult-intubation risk in ICU cohorts, but critically ill patients still desaturate quickly — full preparation required.`,
          riskLevel: 'low' as const,
        };
      }
      if (score <= 5) {
        return {
          score,
          label: 'Elevated MACOCHA risk (≥3)',
          interpretation: `MACOCHA ${score}/12: elevated difficult intubation risk. Most experienced available operator, VL, preoxygenation/apneic O₂, backup plan.`,
          riskLevel: 'moderate' as const,
        };
      }
      return {
        score,
        label: 'High MACOCHA difficulty risk',
        interpretation: `MACOCHA ${score}/12: high difficulty risk (Mallampati heavily weighted). Double setup, difficult airway equipment, consider awake approach if feasible, surgical airway readiness.`,
        riskLevel: 'high' as const,
        recommendations: ['Best airway operator', 'Video laryngoscopy', 'Fluid/vasopressors ready (peri-intubation collapse)', 'Define fail points'],
      };
    },
    evidence: {
      summary:
        'MACOCHA: Mallampati III–IV (5), OSA (2), reduced cervical mobility (1), mouth opening <3 cm (1), Coma (1), severe Hypoxemia (1), non-Anesthesiologist (1). Score ≥3 = difficult.',
      formula: 'Weighted sum 0–12',
      validation: 'De Jong et al. multicenter ICU cohort; external validations support threshold ≥3.',
      references: [
        {
          title: 'Early identification of patients at risk for difficult intubation in the intensive care unit: development and validation of the MACOCHA score',
          citation: 'De Jong A et al. Am J Respir Crit Care Med. 2013;187:832-839',
          year: 2013,
          pmid: '23348979',
          doi: '10.1164/rccm.201210-1851OC',
        },
      ],
    },
    nextSteps: [
      { condition: '<3', actions: ['Standard ICU intubation bundle still applies'] },
      { condition: '≥3', actions: ['Expert operator', 'Difficult airway cart', 'Maximize preoxygenation', 'Hemodynamic resuscitation first when possible'] },
    ],
    pearls: ['Mallampati may be hard to assess in ICU — estimate when possible or note unassessable.', 'Cardiovascular collapse is as deadly as hypoxemia during ICU RSI.'],
  },

  {
    id: 'catch-rule',
    name: 'CATCH Rule (Pediatric Head CT)',
    shortName: 'CATCH',
    description: 'Simplified CATCH rule helper for CT after pediatric minor head injury.',
    category: 'emergency',
    tags: ['catch', 'pediatric', 'head ct', 'trauma', 'pecarn'],
    whenToUse: 'Children with minor head injury (GCS 13–15) when deciding on CT — Canadian CATCH rule framework.',
    whyUse: 'High-sensitivity rule with high- and medium-risk features guiding imaging urgency.',
    inputs: [
      yesNo('gcsLow', 'GCS <15 at 2 hours after injury (high risk)', 1, 'CATCH inclusion: age <16, GCS 13–15, injury within 24 h with LOC/amnesia/disorientation/vomiting/irritability.'),
      yesNo('suspectedOpen', 'Suspected open or depressed skull fracture (high risk)', 1, 'Palpable skull depression, suspected open fracture, or penetrating injury.'),
      yesNo('worseningHa', 'History of worsening headache (high risk)', 1, 'Headache that is worsening after the injury (not a stable mild headache).'),
      yesNo('irritability', 'Irritability on examination (high risk)', 1, 'Persistent irritability on ED exam, not consolable; CATCH inclusion also used persistent irritability in children <2 years as a minor-head-injury entry criterion. Not a fussy toddler who calms with the parent.'),
      yesNo('boggy', 'Any sign of basal skull fracture (medium risk)', 1, 'Hemotympanum, raccoon eyes, CSF otorrhea/rhinorrhea, or Battle sign.'),
      yesNo('largeHematoma', 'Large boggy scalp hematoma (medium risk)', 1, 'CATCH does not use a cm cutoff; large/boggy hematoma of the scalp as judged on exam.'),
      yesNo('dangerousMech', 'Dangerous mechanism (MVC, fall ≥3 ft/5 stairs, fall from bike without helmet) (medium risk)', 1, 'MVC; fall from elevation ≥3 ft (≥0.91 m) or 5 stairs; or fall from a bicycle with no helmet.'),
    ],
    calculate(values) {
      const high =
        (bool(values.gcsLow) ? 1 : 0) +
        (bool(values.suspectedOpen) ? 1 : 0) +
        (bool(values.worseningHa) ? 1 : 0) +
        (bool(values.irritability) ? 1 : 0);
      const medium =
        (bool(values.boggy) ? 1 : 0) +
        (bool(values.largeHematoma) ? 1 : 0) +
        (bool(values.dangerousMech) ? 1 : 0);
      const score = high + medium;

      if (high > 0) {
        return {
          score,
          label: 'CATCH high-risk feature present — CT recommended',
          interpretation: `${high} high-risk and ${medium} medium-risk feature(s). High-risk CATCH positive — CT head recommended (neurosurgical injury risk elevated).`,
          riskLevel: 'high' as const,
          details: [
            { label: 'High-risk features', value: String(high) },
            { label: 'Medium-risk features', value: String(medium) },
          ],
          recommendations: ['Noncontrast head CT', 'NPO until cleared if OR possible', 'Neurosurgery if positive'],
        };
      }
      if (medium > 0) {
        return {
          score,
          label: 'CATCH medium-risk — CT strongly considered',
          interpretation: `No high-risk features; ${medium} medium-risk feature(s). CT often recommended; observation may be considered in select reliable settings per clinician judgment.`,
          riskLevel: 'moderate' as const,
          details: [
            { label: 'High-risk features', value: '0' },
            { label: 'Medium-risk features', value: String(medium) },
          ],
        };
      }
      return {
        score: 0,
        label: 'CATCH negative (simplified)',
        interpretation:
          'No listed high- or medium-risk CATCH features. Clinically important brain injury less likely — observation and discharge counseling may be appropriate if exam reassuring.',
        riskLevel: 'low' as const,
      };
    },
    evidence: {
      summary:
        'CATCH: high-risk (GCS<15 at 2h, suspected open/depressed fracture, worsening headache, irritability) and medium-risk (basal skull signs, large boggy hematoma, dangerous mechanism).',
      formula: 'Any high-risk → CT; medium-risk → CT usually recommended',
      validation: 'Osmond et al. Canadian multicentre derivation/validation; compare with PECARN for age-stratified pathways.',
      references: [
        {
          title: 'CATCH: a clinical decision rule for the use of CT in children with minor head injury',
          citation: 'Osmond MH et al. CMAJ. 2010;182:341-348',
          year: 2010,
          pmid: '20142371',
          doi: '10.1503/cmaj.091421',
        },
      ],
    },
    nextSteps: [
      { condition: 'High-risk positive', actions: ['Urgent head CT', 'Neurosurgery if ICH/fracture needing care'] },
      {
        condition: 'Medium-risk only',
        actions: [
          'CT head recommended (original CATCH)',
          'Observation only if local protocol / reliable shared decision',
          'Strict return precautions if observed',
        ],
      },
      { condition: 'Negative', actions: ['Observation period', 'Caregiver education', 'Return if vomiting/mental status change'] },
    ],
    pearls: [
      'Simplified educational helper — use full CATCH wording for borderline cases.',
      'PECARN is more commonly used in many US EDs; know your local pathway.',
    ],
  },

  {
    id: 'chalice-rule',
    name: 'CHALICE Rule (Pediatric Head Injury)',
    shortName: 'CHALICE',
    description: 'Simplified CHALICE criteria helper for CT after pediatric head injury.',
    category: 'emergency',
    tags: ['chalice', 'pediatric', 'head injury', 'ct', 'nice'],
    whenToUse: 'Children with head injury when applying CHALICE-style CT decision support (UK-derived).',
    whyUse: 'Lists history, examination, and mechanism features that historically triggered CT recommendation.',
    inputs: [
      yesNo('witnessedLoc', 'Witnessed loss of consciousness >5 min', 1, 'Witnessed LOC lasting more than 5 minutes.'),
      yesNo('amnesia', 'Amnesia >5 min (antegrade)', 1, 'Anterograde amnesia lasting more than 5 minutes after the injury.'),
      yesNo('drowsiness', 'Abnormal drowsiness', 1, 'Drowsiness in excess of that expected by the examining doctor (Dunning) — do not over-call ordinary post-injury sleepiness.'),
      yesNo('ge3Vomits', '≥3 vomits after head injury', 1, 'Three or more discrete episodes of vomiting after the injury.'),
      yesNo('suspicionNai', 'Suspicion of non-accidental injury', 1, 'Any safeguarding concern for non-accidental injury.'),
      yesNo('seizure', 'Seizure after head injury (no history of epilepsy)', 1, 'Post-traumatic seizure in a child without known epilepsy.'),
      yesNo('gcsLow', 'GCS <14 (or <15 if <1 year)', 1, 'GCS <14, or GCS <15 if age <1 year.'),
      yesNo('suspicionPenetrating', 'Suspicion of penetrating or depressed skull injury / tense fontanelle', 1, 'Suspected penetrating injury, depressed fracture, or a tense fontanelle in an infant.'),
      yesNo('basalSigns', 'Signs of basal skull fracture', 1, 'Blood or CSF from ear/nose, panda/raccoon eyes, Battle sign, hemotympanum, facial crepitus, or serious facial injury.'),
      yesNo('focalNeuro', 'Positive focal neurology', 1, 'Any motor, sensory, coordination, or reflex abnormality.'),
      yesNo('bruiseSwell', 'Bruise/swelling/laceration >5 cm if <1 year', 1, 'Only for infants <1 year: bruise, swelling, or laceration >5 cm on the head.'),
      yesNo('dangerousMech', 'Dangerous mechanism (high-speed RTC, fall >3 m, high-speed injury from projectile)', 1, 'High-speed RTC (>40 mph / >64 km/h) as pedestrian, cyclist, or occupant; fall >3 m; high-speed projectile/object.'),
    ],
    calculate(values) {
      const keys = [
        'witnessedLoc',
        'amnesia',
        'drowsiness',
        'ge3Vomits',
        'suspicionNai',
        'seizure',
        'gcsLow',
        'suspicionPenetrating',
        'basalSigns',
        'focalNeuro',
        'bruiseSwell',
        'dangerousMech',
      ] as const;
      const score = keys.reduce((s, k) => s + (bool(values[k]) ? 1 : 0), 0);

      if (score === 0) {
        return {
          score: 0,
          label: 'CHALICE negative (simplified)',
          interpretation:
            'No listed CHALICE features. CT not mandated by simplified rule — observe as appropriate and provide head-injury advice.',
          riskLevel: 'low' as const,
        };
      }
      return {
        score,
        label: 'CHALICE positive — CT recommended',
        interpretation: `${score} CHALICE feature(s) present. Classic CHALICE is positive if any criterion present — CT head recommended (high sensitivity design).`,
        riskLevel: score >= 3 ? ('high' as const) : ('moderate' as const),
        details: [{ label: 'Positive criteria count', value: `${score} / 12` }],
        recommendations: ['Noncontrast head CT', 'Involve pediatrics/neurosurgery as needed', 'Safeguarding review if NAI suspected'],
      };
    },
    evidence: {
      summary:
        'CHALICE (Children’s Head injury Algorithm for prediction of Important Clinical Events): any of multiple history/exam/mechanism predictors → CT. High sensitivity, lower specificity.',
      formula: 'Any positive criterion → CT recommended',
      validation: 'Dunning et al. UK multicentre study; informed NICE pathways (which have evolved — follow current NICE NG232).',
      references: [
        {
          title: 'Derivation of the children’s head injury algorithm for prediction of important clinical events (CHALICE)',
          citation: 'Dunning J et al. Arch Dis Child. 2006;91:885-891',
          year: 2006,
          pmid: '17056862',
          doi: '10.1136/adc.2005.083980',
        },
      ],
    },
    nextSteps: [
      { condition: 'Any positive', actions: ['CT per local/NICE pathway', 'Observation if CT delayed', 'Safeguarding if indicated'] },
      { condition: 'All negative', actions: ['Observe or discharge with advice', 'Safety-net for vomiting/LOC/behavior change'] },
    ],
    pearls: [
      'Simplified feature list — confirm against full CHALICE/NICE wording for infants.',
      'Many centers prefer PECARN; CHALICE is more CT-liberal.',
    ],
  },

  {
    id: 'dangerous-mechanism',
    name: 'Dangerous Trauma Mechanism Helper',
    shortName: 'Dangerous Mech',
    description: 'Categorizes trauma mechanisms often considered “dangerous” in decision rules and triage.',
    category: 'emergency',
    tags: ['trauma', 'mechanism', 'triage', 'mvc', 'fall'],
    whenToUse: 'Blunt trauma evaluation when mechanism informs imaging, trauma activation, or decision rules.',
    whyUse: 'Standardizes which mechanisms elevate concern for major injury across C-spine, head, chest, and general trauma pathways.',
    inputs: [
      selectInput('mechanism', 'Primary mechanism category', [
        { label: 'Ground-level fall / low-energy', value: 'low', description: 'Same-level fall or other low-energy blunt trauma' },
        { label: 'Fall from height ≥3 ft / 5 stairs / ≥1 m (peds) / ≥3 m (adult high)', value: 'fall', description: 'Decision-rule “dangerous fall”: ≥3 ft or 5 stairs (C-spine/CATCH); peds often ≥1 m; adult high-energy often ≥3 m / 10 ft' },
        { label: 'MVC — high speed / rollover / ejection / death in same vehicle', value: 'mvc_high', description: 'High-speed crash, rollover, ejection, or death of another occupant' },
        { label: 'MVC — low-speed fender-bender, ambulatory, belt-restrained', value: 'mvc_low', description: 'Low-speed, restrained, ambulatory occupant — still examine fully' },
        { label: 'Pedestrian or cyclist struck by motor vehicle', value: 'ped', description: 'Pedestrian or cyclist struck by a motor vehicle' },
        { label: 'Motorcycle / ATV crash', value: 'mcc', description: 'Motorcycle, scooter, or ATV crash' },
        { label: 'Axial load to head (diving)', value: 'axial', description: 'Axial load to the head (diving, spearing) — C-spine concern' },
        { label: 'Penetrating trauma to head/neck/torso', value: 'penetrating', description: 'GSW/stab/other penetrating injury to head, neck, or torso' },
        { label: 'Blast / high-energy industrial crush', value: 'blast', description: 'Blast or high-energy industrial crush' },
      ], undefined, 'Dangerous mechanisms appear across Canadian C-spine, CATCH/PECARN, and CDC field triage. Mechanism alone does not mandate imaging if a high-sensitivity rule is fully negative and the exam is reliable.'),
      yesNo('elderly', 'Age ≥65 years (mechanism more dangerous at same energy)', 1, 'Age ≥65 — lower-energy mechanisms still cause serious injury.'),
      yesNo('anticoag', 'Anticoagulated or bleeding diathesis', 1, 'Warfarin, DOAC, therapeutic heparin, or known bleeding diathesis — raises ICH risk even with low-energy mechanism.'),
    ],
    calculate(values) {
      const m = String(values.mechanism ?? 'low');
      const elderly = bool(values.elderly);
      const ac = bool(values.anticoag);

      const highEnergy = ['fall', 'mvc_high', 'ped', 'mcc', 'axial', 'penetrating', 'blast'].includes(m);

      if (m === 'penetrating' || m === 'blast') {
        return {
          score: 3,
          label: 'Highest-risk mechanism',
          interpretation: 'Penetrating or blast/crush mechanism — assume major injury until proven otherwise; full trauma evaluation.',
          riskLevel: 'critical' as const,
          recommendations: ['Trauma team activation per protocol', 'Primary survey ABCDEs', 'Selective imaging/OR'],
        };
      }

      if (highEnergy) {
        return {
          score: 2,
          label: 'Dangerous / high-energy mechanism',
          interpretation: `Mechanism classified as dangerous/high-energy${elderly ? ' (elderly — lower energy may still injure)' : ''}${ac ? '; anticoagulation raises ICH risk' : ''}. Heightened imaging and trauma workup thresholds.`,
          riskLevel: 'high' as const,
          details: [
            { label: 'Mechanism class', value: m },
            { label: 'Age ≥65', value: elderly ? 'Yes' : 'No' },
            { label: 'Anticoagulated', value: ac ? 'Yes' : 'No' },
          ],
        };
      }

      if (m === 'mvc_low' || m === 'low') {
        const bump = elderly || ac;
        return {
          score: bump ? 1 : 0,
          label: bump ? 'Low-energy but high-vulnerability patient' : 'Lower-energy mechanism',
          interpretation: bump
            ? 'Mechanism energy is lower, but age ≥65 and/or anticoagulation increase injury risk — do not dismiss; apply age-adjusted imaging rules.'
            : 'Lower-energy mechanism. Still examine fully; decision rules (NEXUS/CCR/PECARN etc.) may allow selective imaging.',
          riskLevel: bump ? ('moderate' as const) : ('low' as const),
        };
      }

      return {
        score: 1,
        label: 'Mechanism reviewed',
        interpretation: 'Mechanism recorded. Integrate with exam, vitals, and validated decision rules.',
        riskLevel: 'info' as const,
      };
    },
    evidence: {
      summary:
        'Dangerous mechanisms appear across Canadian C-spine, CATCH/PECARN, trauma triage (CDC field triage): high falls, high-speed MVC, ejection, pedestrian struck, axial load, penetrating injury.',
      formula: 'Categorical mechanism classification ± vulnerability modifiers',
      validation: 'Composite of trauma triage guidelines and clinical decision-rule definitions — educational synthesizer.',
      references: [
        {
          title: 'Guidelines for field triage of injured patients: recommendations of the National Expert Panel on Field Triage, 2011',
          citation: 'Sasser SM et al. MMWR Recomm Rep. 2012;61(RR-1):1-20',
          year: 2012,
          pmid: '22237112',
          url: 'https://www.cdc.gov/mmwr/preview/mmwrhtml/rr6101a1.htm',
        },
      ],
    },
    nextSteps: [
      { condition: 'High-energy / penetrating', actions: ['Trauma activation', 'Primary/secondary survey', 'Pan-scan as indicated'] },
      { condition: 'Low-energy + elderly/anticoagulated', actions: ['Low threshold for CT head/C-spine', 'Observation'] },
      { condition: 'Low-energy, young, normal exam', actions: ['Selective imaging via validated rules'] },
    ],
    pearls: [
      'Mechanism alone does not mandate imaging if a high-sensitivity rule is fully negative and exam reliable.',
      'Elderly patients fracture with “minor” falls — mechanism thresholds differ.',
    ],
  },

  {
    id: 'atls-class',
    name: 'ATLS Hemorrhagic Shock Class',
    shortName: 'ATLS Class',
    description: 'ATLS classification of hemorrhagic shock classes I–IV from vital-sign and mental-status patterns.',
    category: 'emergency',
    tags: ['atls', 'shock', 'hemorrhage', 'trauma', 'class'],
    whenToUse: 'Trauma or major hemorrhage to estimate blood-loss class and resuscitation intensity.',
    whyUse: 'Shared language for estimated % blood loss and expected vital-sign changes (educational — real patients vary).',
    inputs: [
      numberInput('hr', 'Heart rate', { unit: '/min', min: 30, max: 220, defaultValue: 100, helpText: 'ATLS teaching: Class I <100; II 100–120; III 120–140; IV >140. Athletes/beta-blockers/elderly may not tachycardize.' }),
      numberInput('sbp', 'Systolic BP', { unit: 'mmHg', min: 40, max: 250, defaultValue: 110, helpText: 'Class I–II usually maintain SBP; Class III often <90–100; Class IV profound hypotension. Pulse pressure may narrow before SBP falls.' }),
      numberInput('rr', 'Respiratory rate', { unit: '/min', min: 4, max: 60, defaultValue: 18, helpText: 'ATLS teaching: Class I 14–20; II 20–30; III 30–40; IV >35.' }),
      selectInput('mental', 'Mental status', [
        { label: 'Slightly anxious / normal', value: 'normal', description: 'ATLS Class I — slightly anxious or normal mentation' },
        { label: 'Mildly anxious', value: 'mild', description: 'ATLS Class II — mildly anxious' },
        { label: 'Anxious / confused', value: 'confused', description: 'ATLS Class III — anxious and confused' },
        { label: 'Confused / lethargic', value: 'lethargic', description: 'ATLS Class IV — confused and lethargic' },
      ], undefined, 'Classic ATLS teaching bands. Beta-blockers and elderly may not mount tachycardia — do not wait for HR if hypotensive.'),
      selectInput('urine', 'Urine output estimate', [
        { label: '>30 mL/h', value: 'normal', description: 'Class I — >30 mL/h' },
        { label: '20–30 mL/h', value: 'mild', description: 'Class II — 20–30 mL/h' },
        { label: '5–15 mL/h', value: 'low', description: 'Class III — 5–15 mL/h' },
        { label: 'Negligible', value: 'anuric', description: 'Class IV — negligible / anuric' },
      ], undefined, 'Hourly urine output when a catheter is in place; otherwise estimate. Pattern-match with HR/SBP/RR/mentation — treat the patient, not the class.'),
    ],
    calculate(values) {
      const hr = num(values.hr, 100);
      const sbp = num(values.sbp, 110);
      const rr = num(values.rr, 18);
      const mental = String(values.mental ?? 'normal');
      const urine = String(values.urine ?? 'normal');

      // Score severity signals toward highest class suggested
      let classNum = 1;
      if (hr > 100 || rr > 20 || mental === 'mild' || urine === 'mild') classNum = Math.max(classNum, 2);
      if (hr > 120 || sbp < 100 || rr > 30 || mental === 'confused' || urine === 'low') classNum = Math.max(classNum, 3);
      if (hr > 140 || sbp < 90 || rr > 35 || mental === 'lethargic' || urine === 'anuric') classNum = Math.max(classNum, 4);

      // Hypotension strongly upgrades
      if (sbp < 90) classNum = Math.max(classNum, 3);
      if (sbp < 70) classNum = 4;

      const table: Record<number, { label: string; blood: string; interpretation: string; riskLevel: 'low' | 'moderate' | 'high' | 'critical' }> = {
        1: {
          label: 'Class I hemorrhage',
          blood: '<15% (~<750 mL)',
          interpretation: 'Minimal vital-sign change. Crystalloid as needed; identify source; usually no blood products yet.',
          riskLevel: 'low',
        },
        2: {
          label: 'Class II hemorrhage',
          blood: '15–30% (~750–1500 mL)',
          interpretation: 'Tachycardia, narrowed pulse pressure, mild anxiety. Crystalloid ± early blood consideration; control hemorrhage.',
          riskLevel: 'moderate',
        },
        3: {
          label: 'Class III hemorrhage',
          blood: '30–40% (~1500–2000 mL)',
          interpretation: 'Marked tachycardia, hypotension, confused. Requires blood products / balanced resuscitation and definitive hemorrhage control.',
          riskLevel: 'high',
        },
        4: {
          label: 'Class IV hemorrhage',
          blood: '>40% (~>2000 mL)',
          interpretation: 'Life-threatening shock — profound tachycardia/hypotension, lethargy, anuria. Immediate blood products, MTP consideration, definitive control.',
          riskLevel: 'critical',
        },
      };
      const row = table[classNum];
      const mentalLabel: Record<string, string> = {
        normal: 'Slightly anxious / normal',
        mild: 'Mildly anxious',
        confused: 'Anxious / confused',
        lethargic: 'Confused / lethargic',
      };
      const urineLabel: Record<string, string> = {
        normal: '>30 mL/h',
        mild: '20–30 mL/h',
        low: '5–15 mL/h',
        anuric: 'Negligible',
      };
      return {
        score: classNum,
        label: row.label,
        interpretation: `${row.interpretation} Estimated blood loss ${row.blood}. ATLS classes are educational guides — treat the patient, not the class alone.`,
        riskLevel: row.riskLevel,
        details: [
          { label: 'Estimated blood volume loss', value: row.blood },
          { label: 'HR', value: String(hr) },
          { label: 'SBP', value: String(sbp) },
          { label: 'RR', value: String(rr) },
          { label: 'Mental status', value: mentalLabel[mental] ?? mental },
          { label: 'Urine output', value: urineLabel[urine] ?? urine },
        ],
        recommendations:
          classNum >= 3
            ? ['Activate massive transfusion pathway if ongoing loss', 'Permissive hypotension if appropriate', 'Source control / OR / IR']
            : ['Serial vitals', 'Control external bleeding', 'Type & screen'],
      };
    },
    evidence: {
      summary:
        'ATLS classes I–IV by estimated blood loss with expected HR, BP, RR, urine output, and mental status changes. Individual response varies (age, meds, athletes).',
      formula: 'Pattern match vitals/mental status/urine → Class I–IV',
      validation: 'ATLS teaching classification; not precise volumetric measurement.',
      references: [
        {
          title: 'Advanced Trauma Life Support (ATLS) hemorrhagic shock classification',
          citation: 'American College of Surgeons Committee on Trauma. ATLS Student Course Manual, 10th ed. 2018',
          year: 2018,
          url: 'https://www.facs.org/quality-programs/trauma/education/advanced-trauma-life-support/',
        },
      ],
    },
    nextSteps: [
      { condition: 'Class I–II', actions: ['Identify bleeding source', 'IV access', 'Monitor response to fluids'] },
      { condition: 'Class III–IV', actions: ['Blood products early', 'TXA if trauma timing allows', 'MTP / definitive hemorrhage control'] },
    ],
    pearls: [
      'Beta-blockers and elderly may not mount tachycardia.',
      'Class II may maintain SBP while pulse pressure narrows — look at HR and mentation.',
    ],
  },

  {
    id: 'massive-transfusion-abc',
    name: 'ABC Score (Massive Transfusion)',
    shortName: 'ABC MTP',
    description: 'Assessment of Blood Consumption (ABC) score predicting need for massive transfusion in trauma.',
    category: 'emergency',
    tags: ['mtp', 'transfusion', 'trauma', 'abc', 'hemorrhage'],
    whenToUse: 'Major trauma patients when deciding early activation of massive transfusion protocol.',
    whyUse: 'Four binary ED variables; score ≥2 predicts massive transfusion need with good balance of sensitivity/specificity.',
    inputs: [
      yesNo('penetrating', 'Penetrating mechanism', 1, 'Penetrating trauma (GSW/stab) as the injury mechanism.'),
      yesNo('sbp90', 'ED SBP ≤90 mmHg', 1, 'First ED systolic BP ≤90 mmHg.'),
      yesNo('hr120', 'ED HR ≥120 bpm', 1, 'First ED heart rate ≥120 /min.'),
      yesNo('fast', 'Positive FAST', 1, 'Any FAST window positive for free fluid (RUQ, LUQ, pelvis, or pericardium as used locally).'),
    ],
    calculate(values) {
      const score =
        (bool(values.penetrating) ? 1 : 0) +
        (bool(values.sbp90) ? 1 : 0) +
        (bool(values.hr120) ? 1 : 0) +
        (bool(values.fast) ? 1 : 0);

      if (score >= 2) {
        return {
          score,
          label: 'ABC ≥2 — massive transfusion likely',
          interpretation: `ABC score ${score}/4 (≥2). High likelihood of needing massive transfusion — activate MTP, balanced blood products, hemorrhage control.`,
          riskLevel: score >= 3 ? ('critical' as const) : ('high' as const),
          details: [{ label: 'ABC score', value: `${score} / 4` }],
          recommendations: [
            'Activate MTP',
            '1:1:1 or institution ratio products',
            'TXA if ≤3 h from injury',
            'Definitive hemorrhage control',
            'Correct hypocalcemia / hypothermia',
          ],
        };
      }
      if (score === 1) {
        return {
          score: 1,
          label: 'ABC 1 — intermediate',
          interpretation:
            'ABC score 1/4. Massive transfusion less likely than ≥2 but still possible — prepare blood, reassess frequently, use clinical judgment and base deficit/lactate.',
          riskLevel: 'moderate' as const,
        };
      }
      return {
        score: 0,
        label: 'ABC 0 — low MTP likelihood',
        interpretation:
          'ABC score 0/4. Low likelihood of massive transfusion in derivation cohorts; continue standard trauma care and reassess if deterioration.',
        riskLevel: 'low' as const,
      };
    },
    evidence: {
      summary:
        'ABC score: penetrating mechanism, SBP ≤90, HR ≥120, positive FAST — each 1 point. Score ≥2 predicts massive transfusion (≥10 U RBC/24 h or equivalent definitions).',
      formula: 'Sum of 4 binary predictors (0–4); threshold ≥2',
      validation: 'Nunez et al. / Cotton et al. trauma center validations; widely used MTP trigger adjunct.',
      references: [
        {
          title: 'Early prediction of massive transfusion in trauma: simple as ABC?',
          citation: 'Nunez TC et al. J Trauma. 2009;66:346-352',
          year: 2009,
          pmid: '19204506',
          doi: '10.1097/TA.0b013e3181961c35',
        },
      ],
    },
    nextSteps: [
      { condition: '≥2', actions: ['MTP activation', 'OR/IR for source control', 'Calcium, TXA, prevent hypothermia'] },
      { condition: '0–1', actions: ['Type & cross', 'Serial lactate/base deficit', 'Upgrade if clinical deterioration'] },
    ],
    pearls: [
      'Different from the UGIB ABC mortality score — same letters, different tool.',
      'FAST may be false-negative; do not withhold MTP if clinically bleeding massively.',
    ],
  },
];
