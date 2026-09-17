import type { Calculator } from '../../types/calculator';
import { num, bool, str, yesNo, selectInput, numberInput } from '../../utils/helpers';

/**
 * Wave 8 — gastroenterology, hepatobiliary surgery, and nephrology fill-ins.
 * Items, points, and cutoffs verified against the primary literature (see
 * each calculator's evidence block).
 */
export const wave8GiCalcs: Calculator[] = [
  // ─── 1. McMahon Score for Rhabdomyolysis ───────────────────────────────────
  {
    id: 'mcmahon-rhabdo',
    name: 'McMahon Score for Rhabdomyolysis',
    shortName: 'McMahon Rhabdo',
    description:
      'Admission risk score predicting the composite of renal replacement therapy (RRT) or in-hospital mortality in adults with rhabdomyolysis (CPK >5,000 U/L).',
    category: 'nephrology',
    tags: ['rhabdomyolysis', 'aki', 'cpk', 'rrt', 'mortality', 'mcmahon', 'kidney'],
    whenToUse:
      'Patients ≥18 years old admitted with rhabdomyolysis (CPK >5,000 U/L within 72 hours of admission). Do not use in pre-existing ESRD or when CPK elevation is due to myocardial infarction.',
    whyUse:
      'Identifies patients at greatest risk of needing RRT or dying (score ≥6 is the commonly used high-risk threshold) so renal-protective therapy and monitoring can be intensified early.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 18, max: 110, exampleValue: 65, helpText: 'Points by decade: ≤50 = 0; 51–70 = +1.5; 71–80 = +2.5; >80 = +3.' }),
      selectInput('sex', 'Sex', [
        { label: 'Male', value: 'M', points: 0 },
        { label: 'Female', value: 'F', points: 1 },
      ], 'F', 'Female sex adds 1 point in the McMahon model.'),
      numberInput('creat', 'Initial serum creatinine', { unit: 'mg/dL', unitKind: 'creatinine', min: 0.2, max: 20, step: 0.1, exampleValue: 1.5, helpText: 'First creatinine on admission: <1.4 mg/dL = 0; 1.4–2.2 = +1.5; >2.2 = +3 (124 and 195 µmol/L cutoffs).' }),
      numberInput('calcium', 'Initial serum calcium', { unit: 'mg/dL', min: 3, max: 20, step: 0.1, exampleValue: 8.4, helpText: 'Initial calcium <7.5 mg/dL (<1.88 mmol/L) adds 2 points — hypocalcemia reflects sequestered calcium in injured muscle.' }),
      numberInput('cpk', 'Initial CPK', { unit: 'U/L', min: 0, max: 300000, step: 100, exampleValue: 8500, helpText: 'Initial creatine phosphokinase >40,000 U/L adds 2 points. Serial levels are recommended because delayed CPK rise is common.' }),
      selectInput('etiology', 'Cause of rhabdomyolysis', [
        { label: 'Seizures, syncope, exercise, statins, or myositis', value: 'favorable', points: 0 },
        { label: 'Any other cause (trauma, compartment syndrome, sepsis, toxins, immobility, etc.)', value: 'other', points: 3 },
      ], 'favorable', 'The five lowest-risk etiologies score 0; all other causes add 3 points — they carried the highest RRT/death rates in the derivation cohort.'),
      numberInput('phosphate', 'Initial serum phosphate', { unit: 'mg/dL', unitKind: 'phosphate', min: 0.5, max: 20, step: 0.1, exampleValue: 4.2, helpText: 'Initial phosphate: <4.0 mg/dL = 0; 4.0–5.4 = +1.5; >5.4 = +3 (1.0 and 1.4 mmol/L cutoffs).' }),
      numberInput('bicarb', 'Initial bicarbonate', { unit: 'mEq/L', min: 3, max: 45, step: 1, exampleValue: 21, helpText: 'Initial bicarbonate <19 mEq/L adds 2 points (marker of metabolic acidosis / severity).' }),
    ],
    calculate(values) {
      const age = num(values.age, 65);
      const agePts = age <= 50 ? 0 : age <= 70 ? 1.5 : age <= 80 ? 2.5 : 3;
      const sexPts = str(values.sex, 'M') === 'F' ? 1 : 0;
      const cr = num(values.creat, 1.2);
      const crPts = cr < 1.4 ? 0 : cr <= 2.2 ? 1.5 : 3;
      const ca = num(values.calcium, 9);
      const caPts = ca < 7.5 ? 2 : 0;
      const cpk = num(values.cpk, 5000);
      const cpkPts = cpk > 40000 ? 2 : 0;
      const otherCause = str(values.etiology, 'favorable') === 'other';
      const etPts = otherCause ? 3 : 0;
      const phos = num(values.phosphate, 3.5);
      const phosPts = phos < 4.0 ? 0 : phos <= 5.4 ? 1.5 : 3;
      const hco3 = num(values.bicarb, 22);
      const hco3Pts = hco3 < 19 ? 2 : 0;
      const score = agePts + sexPts + crPts + caPts + cpkPts + etPts + phosPts + hco3Pts;

      let riskLevel: 'low' | 'moderate' | 'high' = 'low';
      let label = '';
      let interpretation = '';
      if (score < 5) {
        riskLevel = 'low';
        label = 'Low risk (score <5)';
        interpretation = `McMahon score ${score}: low risk — in the validation cohort only ~2.3% of patients scoring <5 required RRT or died in hospital.`;
      } else if (score <= 10) {
        riskLevel = 'moderate';
        label = 'Intermediate risk (5–10)';
        interpretation = `McMahon score ${score}: intermediate risk of RRT or in-hospital mortality (between ~2% at score <5 and ~61% at score >10). Score ≥6 is the published high-risk flag — consider renal-protective therapy irrespective of admission CPK.`;
      } else {
        riskLevel = 'high';
        label = 'High risk (>10)';
        interpretation = `McMahon score ${score}: high risk — ~61% of patients scoring >10 required RRT or died in the validation cohort. Escalate monitoring and renal-protective management.`;
      }
      return {
        score,
        unit: 'points',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Age', value: `${age} y (+${agePts})` },
          { label: 'Sex', value: `${str(values.sex, 'M') === 'F' ? 'Female' : 'Male'} (+${sexPts})` },
          { label: 'Initial creatinine', value: `${cr} mg/dL (+${crPts})` },
          { label: 'Initial calcium', value: `${ca} mg/dL (+${caPts})` },
          { label: 'Initial CPK', value: `${cpk} U/L (+${cpkPts})` },
          { label: 'Etiology', value: `${otherCause ? 'Other cause' : 'Seizure/syncope/exercise/statin/myositis'} (+${etPts})` },
          { label: 'Initial phosphate', value: `${phos} mg/dL (+${phosPts})` },
          { label: 'Initial bicarbonate', value: `${hco3} mEq/L (+${hco3Pts})` },
        ],
        recommendations: [
          'Fluid resuscitation targeting euvolemia and urine output ≥1–2 mL/kg/hr.',
          'Score ≥6: consider renal-protective therapy irrespective of admission CPK.',
          'Obtain serial CPK — delayed rise is common; CPK >1,000 U/L confirms clinical rhabdomyolysis.',
        ],
      };
    },
    evidence: {
      summary:
        'McMahon 2013 point score for the composite of RRT or in-hospital mortality in rhabdomyolysis: age (≤50/51–70/71–80/>80 → 0/1.5/2.5/3), female sex +1, initial creatinine (<1.4/1.4–2.2/>2.2 mg/dL → 0/1.5/3), calcium <7.5 +2, CPK >40,000 +2, etiology other than seizures/syncope/exercise/statins/myositis +3, phosphate (<4/4–5.4/>5.4 → 0/1.5/3), bicarbonate <19 +2.',
      formula:
        'Score = age band + sex + creatinine band + Ca<7.5 + CPK>40k + etiology + phosphate band + HCO₃<19 (range 0–19; observed 0–17.5)',
      validation:
        'Derived (n=1397, MGH) and validated (n=974, BWH) in 2371 patients with CPK >5,000 U/L; C-statistic 0.82/0.83. Score <5 → 2.3% RRT/death; >10 → 61.2%. Items and cutoffs match the primary paper.',
      references: [
        {
          title: 'A risk prediction score for kidney failure or mortality in rhabdomyolysis',
          citation: 'McMahon GM, Zeng X, Waikar SS. JAMA Intern Med. 2013;173(19):1821-1828',
          year: 2013,
          pmid: '24000014',
          doi: '10.1001/jamainternmed.2013.9774',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score ≥6 (high risk)', actions: ['Aggressive IV fluids to maintain urine output 1–2 mL/kg/hr', 'Serial CPK, creatinine, potassium, calcium, phosphate', 'Early nephrology involvement; watch for compartment syndrome and hyperkalemia'] },
      { condition: 'Score <5 (low risk)', actions: ['Standard hydration and monitoring', 'Address underlying etiology', 'Repeat labs until CPK trending down'] },
    ],
    pearls: [
      'Use INITIAL (admission) labs — the score was derived on first measured values, not peaks.',
      'Etiology is heavily weighted (+3): seizures, syncope, exercise, statins, and myositis are the only "favorable" causes.',
      'Do not apply to patients already on dialysis or with CPK elevation from MI.',
    ],
  },

  // ─── 2. Pancreatic Fistula Risk Score (FRS) ────────────────────────────────
  {
    id: 'pancreatic-fistula-frs',
    name: 'Pancreatic Fistula Risk Score (FRS)',
    shortName: 'Fistula Risk Score',
    description:
      'Callery/Pratt 10-point intraoperative score predicting clinically relevant postoperative pancreatic fistula (CR-POPF, ISGPF grade B/C) after pancreatoduodenectomy.',
    category: 'surgery',
    tags: ['pancreatic fistula', 'popf', 'whipple', 'pancreatoduodenectomy', 'frs', 'callery', 'pancreas'],
    whenToUse:
      'Intraoperatively during pancreatoduodenectomy (Whipple) once gland texture, duct diameter, pathology, and blood loss are known. Derived/validated for PD; use caution applying to distal pancreatectomy.',
    whyUse:
      'Stratifies CR-POPF risk into negligible/low/moderate/high zones to guide drain management, octreotide, stenting, feeding strategy, and surveillance.',
    inputs: [
      selectInput('texture', 'Gland texture (intraoperative palpation)', [
        { label: 'Firm', value: 'firm', points: 0 },
        { label: 'Soft', value: 'soft', points: 2 },
      ], 'soft', 'Surgeon palpation of the pancreatic remnant intraoperatively. Soft parenchyma is the single strongest fistula predictor.'),
      selectInput('pathology', 'Pathology', [
        { label: 'Pancreatic adenocarcinoma or pancreatitis', value: 'low', points: 0 },
        { label: 'Any other pathology (ampullary, duodenal, cystic, islet cell, metastatic, other)', value: 'high', points: 1 },
      ], 'high', 'Non-PDAC/non-pancreatitis pathology is associated with softer glands and higher fistula risk.'),
      selectInput('duct', 'Pancreatic duct diameter', [
        { label: '≥5 mm', value: 0, points: 0 },
        { label: '4 mm', value: 1, points: 1 },
        { label: '3 mm', value: 2, points: 2 },
        { label: '2 mm', value: 3, points: 3 },
        { label: '≤1 mm', value: 4, points: 4 },
      ], 2, 'Measured intraoperatively at the transection margin; risk rises steadily as the duct narrows below 5 mm.'),
      selectInput('ebl', 'Intraoperative blood loss', [
        { label: '≤400 mL', value: 0, points: 0 },
        { label: '401–700 mL', value: 1, points: 1 },
        { label: '701–1,000 mL', value: 2, points: 2 },
        { label: '>1,000 mL', value: 3, points: 3 },
      ], 0, 'Estimated intraoperative blood loss during the resection.'),
    ],
    calculate(values) {
      const score =
        (str(values.texture, 'firm') === 'soft' ? 2 : 0) +
        (str(values.pathology, 'low') === 'high' ? 1 : 0) +
        num(values.duct, 0) +
        num(values.ebl, 0);
      let riskLevel: 'low' | 'moderate' | 'high' = 'low';
      let label = '';
      let interpretation = '';
      if (score === 0) {
        riskLevel = 'low';
        label = 'Negligible risk zone (0 points)';
        interpretation = 'FRS 0: negligible risk — CR-POPF essentially never occurred in derivation (~0%; 2% in later external validation). Fistula-mitigation measures offer little incremental benefit.';
      } else if (score <= 2) {
        riskLevel = 'low';
        label = 'Low risk zone (1–2 points)';
        interpretation = `FRS ${score}: low risk zone — CR-POPF in ~6.6–13.6% across derivation and external validation cohorts.`;
      } else if (score <= 6) {
        riskLevel = 'moderate';
        label = 'Moderate risk zone (3–6 points)';
        interpretation = `FRS ${score}: moderate risk zone — CR-POPF in ~13–23% across validation cohorts. Standard drain/monitoring protocols apply.`;
      } else {
        riskLevel = 'high';
        label = 'High risk zone (7–10 points)';
        interpretation = `FRS ${score}: high risk zone — CR-POPF in ~29–43% across validation cohorts. Consider fistula-mitigation strategies (anastomotic stent, prophylactic octreotide, tissue sealant) and enhanced surveillance.`;
      }
      return {
        score,
        unit: 'points',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Gland texture', value: str(values.texture, 'firm') === 'soft' ? 'Soft (+2)' : 'Firm (0)' },
          { label: 'Pathology', value: str(values.pathology, 'low') === 'high' ? 'Other pathology (+1)' : 'PDAC or pancreatitis (0)' },
          { label: 'Duct diameter', value: `+${num(values.duct, 0)} pts` },
          { label: 'Blood loss', value: `+${num(values.ebl, 0)} pts` },
          { label: 'FRS risk zone', value: score === 0 ? 'Negligible' : score <= 2 ? 'Low' : score <= 6 ? 'Moderate' : 'High' },
        ],
        recommendations: [
          'High risk (7–10): consider anastomotic stents, prophylactic octreotide, tissue sealants, and drain-amylase surveillance.',
          'Negligible risk (0): early drain removal and simplified pathways are supported by FRS-guided studies.',
          'Use ISGPF definitions: grade B/C leaks are the clinically relevant outcome this score predicts.',
        ],
      };
    },
    evidence: {
      summary:
        'Callery/Pratt Fistula Risk Score: soft gland +2, non-PDAC/non-pancreatitis pathology +1, duct diameter ≥5/4/3/2/≤1 mm → 0/1/2/3/4, blood loss ≤400/401–700/701–1000/>1000 mL → 0/1/2/3. Zones: 0 negligible, 1–2 low, 3–6 moderate, 7–10 high.',
      formula: 'FRS (0–10) = texture (0/2) + pathology (0/1) + duct (0–4) + EBL (0–3)',
      validation:
        'Derived (n=233) and prospectively validated (n=212) by Callery et al. (J Am Coll Surg 2013); multi-institutional external validation (Miller 2014, n=594): CR-POPF 6.6% low / 12.9% moderate / 28.6% high, AUC 0.716; HPB 2017 validation (n=444): 2% / 13.6% / 23.1% / 42.9%, C-statistic 0.719.',
      references: [
        {
          title: 'A prospectively validated clinical risk score accurately predicts pancreatic fistula after pancreatoduodenectomy',
          citation: 'Callery MP, Pratt WB, Kent TS, Chaikof EL, Vollmer CM. J Am Coll Surg. 2013;216(1):1-14',
          year: 2013,
          pmid: '23122535',
          doi: '10.1016/j.jamcollsurg.2012.09.002',
        },
        {
          title: 'A multi-institutional external validation of the fistula risk score for pancreatoduodenectomy',
          citation: 'Miller BC, Christein JD, Behrman SW, et al. J Gastrointest Surg. 2014;18(1):172-179',
          year: 2014,
          pmid: '24002771',
          doi: '10.1007/s11605-013-2337-8',
        },
      ],
    },
    nextSteps: [
      { condition: 'FRS 7–10 (high)', actions: ['Fistula-mitigation bundle per institutional protocol', 'Drain fluid amylase on POD1–3', 'Delayed drain removal; low threshold for cross-sectional imaging if sepsis'] },
      { condition: 'FRS 0–2 (negligible/low)', actions: ['Early drain removal pathways appropriate', 'Standard enhanced-recovery care'] },
    ],
    pearls: [
      'All four inputs are INTRAOPERATIVE — the score cannot be computed preoperatively.',
      'Soft gland + small duct is the dominant risk combination.',
      'Derived specifically for pancreatoduodenectomy; alternative-FRS variants exist for distal pancreatectomy.',
    ],
  },

  // ─── 3. Truelove and Witts Severity Index ──────────────────────────────────
  {
    id: 'truelove-witts-uc',
    name: 'Truelove and Witts Severity Index for Ulcerative Colitis',
    shortName: 'Truelove-Witts',
    description:
      'Classic 1955 severity stratification of ulcerative colitis into mild, moderate, and severe based on stool frequency, blood, fever, pulse, hemoglobin, and ESR.',
    category: 'gastroenterology',
    tags: ['ulcerative colitis', 'asuc', 'truelove', 'witts', 'severity', 'ibd'],
    whenToUse:
      'Patients with confirmed ulcerative colitis when grading flare severity — acute severe UC (ASUC) triggers inpatient management and day-3 response assessment (e.g., Travis criteria).',
    whyUse:
      'Remains the guideline-endorsed definition of acute severe UC (≥6 bloody stools/day plus systemic toxicity) and determines admission, IV steroid, and rescue-therapy pathways.',
    inputs: [
      selectInput('stools', 'Bowel movements per day', [
        { label: '<4 per day', value: 'lt4' },
        { label: '4–5 per day', value: '4to5' },
        { label: '≥6 per day', value: 'gte6' },
      ], 'gte6', 'Severe disease requires ≥6 stools/day; mild disease is <4/day. Count total daily motions.'),
      selectInput('blood', 'Blood in stool', [
        { label: 'None or no more than small amounts', value: 'noneSmall' },
        { label: 'Between mild and severe', value: 'between' },
        { label: 'Visible blood', value: 'visible' },
      ], 'visible', 'Frankly bloody stools are the severe-tier descriptor; modern ASUC definitions require ≥6 BLOODY motions/day.'),
      yesNo('pyrexia', 'Pyrexia — temperature ≥37.8 °C (≥100 °F)', null, 'Fever is one of the four systemic criteria for severe disease.', true),
      yesNo('tachy', 'Pulse >90 bpm', null, 'Tachycardia >90 bpm is a systemic criterion for severe disease.', true),
      yesNo('anemia', 'Anemia — hemoglobin ≤10.5 g/dL (≤6.5 mmol/L)', null, 'Hemoglobin ≤10.5 g/dL is a systemic criterion for severe disease.', false),
      selectInput('esr', 'Erythrocyte sedimentation rate', [
        { label: '≤30 mm/hr', value: 'low' },
        { label: '>30 mm/hr', value: 'high' },
      ], 'high', 'ESR >30 mm/hr is the fourth systemic criterion for severe disease.'),
    ],
    calculate(values) {
      const stools = str(values.stools, 'lt4');
      const blood = str(values.blood, 'noneSmall');
      const systemic =
        (bool(values.pyrexia) ? 1 : 0) +
        (bool(values.tachy) ? 1 : 0) +
        (bool(values.anemia) ? 1 : 0) +
        (str(values.esr, 'low') === 'high' ? 1 : 0);
      const severe = stools === 'gte6' && blood === 'visible' && systemic >= 1;
      const mild = stools === 'lt4' && blood === 'noneSmall' && systemic === 0;

      if (severe) {
        return {
          score: 'Severe',
          label: 'Severe ulcerative colitis (ASUC)',
          interpretation: `Meets modified Truelove-Witts severe criteria: ≥6 bloody stools/day plus ${systemic} systemic feature(s) (fever ≥37.8 °C, pulse >90, Hb ≤10.5 g/dL, ESR >30). This is acute severe UC — admit for intensive medical therapy.`,
          riskLevel: 'high' as const,
          details: [
            { label: 'Stool frequency', value: '≥6/day' },
            { label: 'Blood in stool', value: 'Visible' },
            { label: 'Systemic features', value: `${systemic} of 4` },
          ],
          recommendations: [
            'Hospital admission; IV corticosteroids (e.g., hydrocortisone 100 mg q6h or equivalent).',
            'Exclude toxic megacolon and CMV; VTE prophylaxis; surgical consultation early.',
            'Assess response at day 3 (Oxford/Travis criteria); plan rescue therapy (infliximab or cyclosporine) if failing.',
          ],
          alerts: ['Acute severe UC — inpatient management and IBD specialist review required.'],
        };
      }
      if (mild) {
        return {
          score: 'Mild',
          label: 'Mild ulcerative colitis',
          interpretation: 'Meets Truelove-Witts mild criteria: <4 stools/day, little or no blood, afebrile, pulse ≤90, Hb >10.5 g/dL, ESR ≤30 mm/hr.',
          riskLevel: 'low' as const,
          details: [
            { label: 'Stool frequency', value: '<4/day' },
            { label: 'Systemic features', value: '0 of 4' },
          ],
          recommendations: [
            'Outpatient management appropriate; topical and/or oral 5-ASA per disease extent.',
            'Escalate only if symptoms progress or inflammatory markers rise.',
          ],
        };
      }
      return {
        score: 'Moderate',
        label: 'Moderate ulcerative colitis',
        interpretation: `Intermediate between mild and severe Truelove-Witts categories (stools ${stools === '4to5' ? '4–5' : stools === 'gte6' ? '≥6' : '<4'}/day, systemic features ${systemic}/4). Features of both mild and severe disease.`,
        riskLevel: 'moderate' as const,
        details: [
          { label: 'Stool frequency', value: stools === '4to5' ? '4–5/day' : stools === 'gte6' ? '≥6/day' : '<4/day' },
          { label: 'Blood in stool', value: blood === 'visible' ? 'Visible' : blood === 'between' ? 'Between mild and severe' : 'None/small' },
          { label: 'Systemic features', value: `${systemic} of 4` },
        ],
        recommendations: [
          'May require oral steroids and immunomodulators with close monitoring.',
          'Reassess frequently — progression to ≥6 bloody stools with systemic features = ASUC.',
        ],
      };
    },
    evidence: {
      summary:
        'Truelove & Witts 1955 index. Mild: <4 stools/day, no/small blood, no fever, no tachycardia, no anemia, ESR ≤30. Severe (modified/ECCO): ≥6 bloody stools/day plus ≥1 of T ≥37.8 °C, pulse >90, Hb ≤10.5 g/dL, ESR >30. Moderate: intermediate.',
      formula: 'Severe = ≥6 bloody stools/d AND ≥1 systemic sign; Mild = <4 stools/d AND no/small blood AND 0 systemic signs; else Moderate',
      validation:
        'Endorsed by ECCO/ACG guidelines as the working definition of ASUC. The 1955 original required the full severe constellation; the Oxford modification (used here and in trials) requires ≥6 bloody motions plus any one systemic sign — noted because implementations differ on whether visible blood is required.',
      references: [
        {
          title: 'Cortisone in ulcerative colitis; final report on a therapeutic trial',
          citation: 'Truelove SC, Witts LJ. Br Med J. 1955;2(4947):1041-1048',
          year: 1955,
          pmid: '13260656',
          doi: '10.1136/bmj.2.4947.1041',
        },
        {
          title: 'Predicting the need for colectomy in severe ulcerative colitis: a critical appraisal of clinical parameters and currently available biomarkers',
          citation: 'Travis S, Satsangi J, Lémann M. Gut. 2011;60(1):3-9',
          year: 2011,
          pmid: '21148578',
          doi: '10.1136/gut.2010.216895',
        },
      ],
    },
    nextSteps: [
      { condition: 'Severe (ASUC)', actions: ['Admit; IV steroids; daily exam + labs + abdominal imaging review', 'Day-3 Oxford criteria to predict steroid failure', 'Rescue therapy (infliximab/cyclosporine) or colectomy if failing'] },
      { condition: 'Mild–moderate', actions: ['Optimize 5-ASA/steroid therapy by extent', 'Check inflammatory markers and iron studies', 'Escalate to biologics if steroid-dependent or refractory'] },
    ],
    pearls: [
      'The classic index predates Crohn colitis — confirm the diagnosis is UC.',
      'A patient with ≥6 stools and systemic toxicity but minimal visible blood falls to "moderate" here; many clinicians still treat as ASUC — use judgment.',
      'Severe UC with colonic dilation or systemic deterioration = fulminant colitis/toxic megacolon — surgical emergency.',
    ],
  },

  // ─── 4. Travis Criteria (Oxford day-3 criteria) ────────────────────────────
  {
    id: 'travis-criteria',
    name: 'Travis Criteria (Oxford Day-3 Criteria for Acute Severe UC)',
    shortName: 'Travis Criteria',
    description:
      'Day-3 stool frequency and CRP rule predicting failure of intravenous corticosteroid therapy and ~85% colectomy risk in acute severe ulcerative colitis.',
    category: 'gastroenterology',
    tags: ['ulcerative colitis', 'asuc', 'travis', 'oxford', 'colectomy', 'crp', 'steroid failure'],
    whenToUse:
      'On day 3 of intensive inpatient therapy (IV corticosteroids) for acute severe ulcerative colitis, to predict likelihood of medical-therapy failure.',
    whyUse:
      'A simple bedside rule — stool frequency >8/day, or 3–8/day with CRP >45 mg/L — identifies ~85% of patients who will require colectomy that admission, prompting early rescue therapy or surgical planning.',
    inputs: [
      selectInput('stools', 'Number of stools on day 3 of treatment', [
        { label: '<3 stools/day', value: 'lt3' },
        { label: '3–8 stools/day', value: '3to8' },
        { label: '>8 stools/day', value: 'gt8' },
      ], '3to8', 'Stool frequency recorded on day 3 of IV corticosteroid therapy for ASUC.'),
      yesNo('crp45', 'CRP >45 mg/L (>428 nmol/L)', null, 'Day-3 C-reactive protein above 45 mg/L. Only applies when stool frequency is 3–8/day.', false),
    ],
    calculate(values) {
      const stools = str(values.stools, 'lt3');
      const crp = bool(values.crp45);
      const meets = stools === 'gt8' || (stools === '3to8' && crp);
      if (meets) {
        return {
          score: 'Criteria met',
          label: 'High colectomy risk (~85%)',
          interpretation:
            stools === 'gt8'
              ? 'Travis day-3 criteria positive: >8 stools/day on day 3 of IV steroids predicts ~85% risk of colectomy during this admission.'
              : 'Travis day-3 criteria positive: 3–8 stools/day with CRP >45 mg/L predicts ~85% risk of colectomy during this admission.',
          riskLevel: 'high' as const,
          details: [
            { label: 'Day-3 stools', value: stools === 'gt8' ? '>8/day' : '3–8/day' },
            { label: 'Day-3 CRP', value: crp ? '>45 mg/L' : '≤45 mg/L (or not elevated)' },
          ],
          recommendations: [
            'Discuss second-line rescue therapy: infliximab or cyclosporine (or upadacitinib per local protocol).',
            'Early colorectal surgical consultation; joint medical–surgical decision-making.',
            'Continue monitoring for toxic megacolon; daily labs and abdominal exam.',
          ],
          alerts: ['Predicted ~85% colectomy risk — escalate to IBD specialist and surgical review now.'],
        };
      }
      return {
        score: 'Criteria not met',
        label: 'Lower predicted colectomy risk',
        interpretation:
          stools === 'lt3'
            ? 'Travis day-3 criteria negative: <3 stools/day on day 3 suggests responding to IV corticosteroids.'
            : 'Travis day-3 criteria negative: 3–8 stools/day with CRP ≤45 mg/L does not flag the ~85% colectomy-risk group.',
        riskLevel: 'low' as const,
        details: [
          { label: 'Day-3 stools', value: stools === 'lt3' ? '<3/day' : '3–8/day' },
          { label: 'Day-3 CRP', value: crp ? '>45 mg/L' : '≤45 mg/L (or not elevated)' },
        ],
        recommendations: [
          'Continue IV corticosteroids and reassess daily; day-7 response defines complete vs incomplete response.',
          'Plan transition to oral therapy and maintenance regimen on discharge.',
        ],
      };
    },
    evidence: {
      summary:
        'Travis 1996 (Oxford): on day 3 of intensive treatment for severe UC, >8 stools/day OR 3–8 stools/day with CRP >45 mg/L predicted ~85% colectomy during that admission.',
      formula: 'Positive if day-3 stools >8/day, OR 3–8/day + CRP >45 mg/L',
      validation:
        'Derived prospectively in 51 episodes (49 patients) at John Radcliffe Hospital; stool frequency and CRP were the only day-1–5 variables distinguishing colectomy (p<0.00625). Still predicts steroid non-response in the post-biologic era (ECCO-JCC 2025, OR 4.70).',
      references: [
        {
          title: 'Predicting outcome in severe ulcerative colitis',
          citation: 'Travis SPL, Farrant JM, Ricketts C, et al. Gut. 1996;38(6):905-910',
          year: 1996,
          pmid: '8984031',
          doi: '10.1136/gut.38.6.905',
        },
      ],
    },
    nextSteps: [
      { condition: 'Criteria positive', actions: ['Rescue therapy decision (infliximab vs cyclosporine)', 'Surgical consult and stoma counseling', 'Daily review for megacolon/perforation'] },
      { condition: 'Criteria negative', actions: ['Continue steroids; reassess day 7', 'Incomplete responders still carry ~40% colectomy risk — monitor to discharge and beyond'] },
    ],
    pearls: [
      'Apply strictly on day 3 of IV corticosteroid therapy — earlier or later assessment is not the validated timepoint.',
      'Complete responders (≤3 stools, no visible blood at day 7) had only ~5% subsequent colectomy; incomplete responders ~40%.',
      'Do not delay surgical review waiting for CRP to fall in a clearly failing patient.',
    ],
  },

  // ─── 5. Montreal Classification of IBD ─────────────────────────────────────
  {
    id: 'montreal-ibd',
    name: 'Montreal Classification of Inflammatory Bowel Disease (IBD)',
    shortName: 'Montreal IBD',
    description:
      'Standardized phenotypic classification of Crohn disease (age A1–A3, location L1–L4, behavior B1–B3 + perianal modifier) and ulcerative colitis (extent E1–E3, severity S0–S3).',
    category: 'gastroenterology',
    tags: ['ibd', 'crohn', 'ulcerative colitis', 'montreal', 'classification', 'phenotype'],
    whenToUse:
      'At diagnosis and reassessment of IBD to record the standardized phenotype used in guidelines, trials, and multidisciplinary communication.',
    whyUse:
      'Produces the internationally accepted A/L/B/p (Crohn) and E/S (UC) codes that drive prognosis and treatment selection.',
    isQuestionnaire: true,
    questionnaire: {
      modeInputId: 'ibdType',
      activeInputIdsByMode: {
        cd: ['ageDx', 'location', 'upperGI', 'behavior', 'perianal'],
        uc: ['extent', 'severity'],
      },
    },
    inputs: [
      selectInput('ibdType', 'Type of IBD', [
        { label: 'Crohn disease', value: 'cd' },
        { label: 'Ulcerative colitis', value: 'uc' },
      ], 'cd', 'Select the disease to classify; the relevant Montreal dimensions appear. IBD-unclassified is not coded by Montreal.'),
      selectInput('ageDx', 'Age at diagnosis', [
        { label: 'A1 — ≤16 years', value: 'A1', description: 'Diagnosed at 16 years or younger' },
        { label: 'A2 — 17–40 years', value: 'A2', description: 'Diagnosed between 17 and 40 years' },
        { label: 'A3 — >40 years', value: 'A3', description: 'Diagnosed after age 40' },
      ], 'A2', 'Crohn disease: age at diagnosis. Early-onset disease associates with more extensive/complicated phenotypes.'),
      selectInput('location', 'Disease location', [
        { label: 'L1 — Ileal (terminal ileum)', value: 'L1' },
        { label: 'L2 — Colonic', value: 'L2' },
        { label: 'L3 — Ileocolonic', value: 'L3' },
      ], 'L3', 'Predominant anatomic distribution. Upper-GI involvement is recorded separately as the L4 modifier (next item), never alone.'),
      yesNo('upperGI', 'Upper GI involvement — L4 modifier', null, 'Proximal gastroduodenal/jejunal disease is appended as L4 to the L1–L3 code (e.g., L3+L4). L4 is a modifier, not a standalone location.', false),
      selectInput('behavior', 'Disease behavior', [
        { label: 'B1 — Non-stricturing, non-penetrating (inflammatory)', value: 'B1' },
        { label: 'B2 — Stricturing', value: 'B2' },
        { label: 'B3 — Penetrating (abscess/fistula)', value: 'B3' },
      ], 'B1', 'Most advanced behavior ever observed; behavior commonly progresses B1→B2→B3 over time.'),
      yesNo('perianal', 'Perianal disease — "p" modifier', null, 'Perianal fistula/abscess is appended as "p" (e.g., B2p). It modifies behavior but is not itself a B category.', false),
      selectInput('extent', 'UC extent (maximum ever observed)', [
        { label: 'E1 — Ulcerative proctitis (rectum only)', value: 'E1' },
        { label: 'E2 — Left-sided UC (distal to splenic flexure)', value: 'E2' },
        { label: 'E3 — Extensive UC (proximal to splenic flexure / pancolitis)', value: 'E3' },
      ], 'E2', 'Maximal macroscopic extent at any time — disease that extends updates the E code permanently.'),
      selectInput('severity', 'UC severity (current flare)', [
        { label: 'S0 — Clinical remission', value: 'S0' },
        { label: 'S1 — Mild', value: 'S1' },
        { label: 'S2 — Moderate', value: 'S2' },
        { label: 'S3 — Severe', value: 'S3' },
      ], 'S1', 'Clinical severity graded by Truelove-Witts–style features; rarely coded in practice but part of the Montreal schema.'),
    ],
    calculate(values) {
      const type = str(values.ibdType, 'cd');
      if (type === 'uc') {
        const e = str(values.extent, 'E2');
        const s = str(values.severity, 'S1');
        const eLabel: Record<string, string> = {
          E1: 'Ulcerative proctitis',
          E2: 'Left-sided UC',
          E3: 'Extensive UC / pancolitis',
        };
        const sLabel: Record<string, string> = {
          S0: 'clinical remission',
          S1: 'mild',
          S2: 'moderate',
          S3: 'severe',
        };
        return {
          score: `${e}${s}`,
          label: `Montreal UC: ${e}${s}`,
          interpretation: `Ulcerative colitis classified as ${e} (${eLabel[e] ?? e}) with ${s} severity (${sLabel[s] ?? s}). Extent reflects the maximum ever documented — it does not regress.`,
          riskLevel: 'info' as const,
          details: [
            { label: 'Extent', value: `${e} — ${eLabel[e] ?? e}` },
            { label: 'Severity', value: `${s} — ${sLabel[s] ?? s}` },
          ],
          recommendations: [
            'E1/E2 disease may be managed with topical + oral 5-ASA; E3 typically needs systemic therapy.',
            'S3 (severe) warrants Truelove-Witts confirmation and consideration of admission.',
          ],
        };
      }
      const a = str(values.ageDx, 'A2');
      const l = str(values.location, 'L3');
      const l4 = bool(values.upperGI);
      const b = str(values.behavior, 'B1');
      const p = bool(values.perianal);
      const code = `${a} ${l}${l4 ? '+L4' : ''} ${b}${p ? 'p' : ''}`;
      const bLabel: Record<string, string> = {
        B1: 'non-stricturing non-penetrating',
        B2: 'stricturing',
        B3: 'penetrating',
      };
      return {
        score: code,
        label: `Montreal CD: ${code}`,
        interpretation: `Crohn disease classified as ${a} (age at diagnosis), ${l}${l4 ? ' with upper-GI involvement (L4)' : ''}, ${b} (${bLabel[b] ?? b})${p ? ' with perianal disease modifier' : ''}.`,
        riskLevel: 'info' as const,
        details: [
          { label: 'Age at diagnosis', value: a },
          { label: 'Location', value: l4 ? `${l} + L4` : l },
          { label: 'Behavior', value: `${b}${p ? 'p' : ''}` },
          { label: 'Full code', value: code },
        ],
        recommendations: [
          'B2/B3 phenotypes warrant earlier biologic/immunomodulator therapy and surgical planning discussions.',
          'Perianal (p) disease typically needs MRI pelvis and combined medical–surgical management.',
          'Re-classify when behavior progresses or perianal disease develops.',
        ],
      };
    },
    evidence: {
      summary:
        'Montreal Working Party classification (2005). CD: A1 ≤16 y, A2 17–40 y, A3 >40 y; L1 ileal, L2 colonic, L3 ileocolonic, +L4 upper-GI modifier; B1 inflammatory, B2 stricturing, B3 penetrating, +p perianal modifier. UC: E1 proctitis, E2 left-sided, E3 extensive; S0–S3 severity.',
      formula: 'CD: A(1–3) L(1–3)(+L4) B(1–3)(+p); UC: E(1–3) S(0–3)',
      validation:
        'Consensus Working Party of the 2005 Montreal World Congress (Silverberg et al.; reviewed by Satsangi et al. Gut 2006). Interobserver agreement excellent for diagnosis and location, moderate for severity; pediatric practice often uses the Paris modification (A1a/A1b).',
      references: [
        {
          title: 'The Montreal classification of inflammatory bowel disease: controversies, consensus, and implications',
          citation: 'Satsangi J, Silverberg MS, Vermeire S, Colombel JF. Gut. 2006;55(6):749-753',
          year: 2006,
          pmid: '16698746',
          doi: '10.1136/gut.2005.082909',
        },
      ],
    },
    nextSteps: [
      { condition: 'CD B2/B3 or +p', actions: ['Early biologic therapy per guidelines', 'Cross-sectional imaging for structuring/penetrating complications', 'Surgical liaison for strictures/abscess/perianal disease'] },
      { condition: 'UC E3 or S3', actions: ['Systemic therapy (steroids/biologics) rather than topical-only regimens', 'Truelove-Witts/Travis assessment if severe flare'] },
    ],
    pearls: [
      'L4 (upper GI) and p (perianal) are MODIFIERS appended to location and behavior — never standalone codes.',
      'Behavior is the most advanced ever seen; a patient who progresses to stricturing keeps B2 permanently.',
      'The pediatric Paris classification splits A1 into A1a (<10 y) and A1b (10–<17 y) — Montreal remains the adult standard.',
    ],
  },

  // ─── 6. Manning Criteria for IBS ───────────────────────────────────────────
  {
    id: 'manning-ibs',
    name: 'Manning Criteria for Diagnosis of Irritable Bowel Syndrome (IBS)',
    shortName: 'Manning Criteria',
    description:
      'Six symptom criteria supporting a positive diagnosis of IBS — ≥3 present with no red flags suggests IBS in patients with chronic abdominal pain or altered bowel habit.',
    category: 'gastroenterology',
    tags: ['ibs', 'manning', 'functional', 'diagnosis', 'abdominal pain', 'red flags'],
    whenToUse:
      'Adults with chronic abdominal pain or altered bowel habit when building a positive (rather than purely exclusionary) case for IBS — especially where workup resources are limited.',
    whyUse:
      'The first validated symptom-based IBS instrument; ≥3 of 6 criteria raised diagnostic confidence for IBS over organic disease (sensitivity ~67%, specificity ~70% at ≥3).',
    status: 'legacy',
    supersededBy: 'rome-iv-ibs',
    inputs: [
      yesNo('painFreq', 'Onset of pain linked to more frequent bowel movements', 1, 'Abdominal pain onset associated with an increase in stool frequency.', true),
      yesNo('looserOnset', 'Looser stools associated with onset of pain', 1, 'Stools become looser/more watery when the pain starts.', true),
      yesNo('relieved', 'Pain relieved by passage of stool', 1, 'Defecation relieves (not just follows) the abdominal pain.', true),
      yesNo('bloating', 'Noticeable abdominal bloating/distension', 1, 'Visible or clearly sensed abdominal distension.', true),
      yesNo('incomplete', 'Sensation of incomplete evacuation >25% of the time', 1, 'Persistent feeling of incomplete emptying after defecation on more than a quarter of occasions.', false),
      yesNo('mucus', 'Diarrhea with mucus >25% of the time', 1, 'Mucus (white/clear slime) passed with loose stools on >25% of occasions.', false),
      yesNo('rfAge', 'RED FLAG — Age >50 years', null, 'New symptoms starting after age 50 warrant organic-disease exclusion (e.g., colorectal cancer).', false),
      yesNo('rfWeight', 'RED FLAG — Weight loss', null, 'Unintentional weight loss is an alarm feature.', false),
      yesNo('rfBlood', 'RED FLAG — Blood in stools', null, 'Rectal bleeding is an alarm feature requiring evaluation.', false),
      yesNo('rfAnemia', 'RED FLAG — Anemia', null, 'Documented anemia is an alarm feature.', false),
      yesNo('rfFever', 'RED FLAG — Fever', null, 'Fever is an alarm feature suggesting infection, IBD, or malignancy.', false),
    ],
    calculate(values) {
      const manning =
        (bool(values.painFreq) ? 1 : 0) +
        (bool(values.looserOnset) ? 1 : 0) +
        (bool(values.relieved) ? 1 : 0) +
        (bool(values.bloating) ? 1 : 0) +
        (bool(values.incomplete) ? 1 : 0) +
        (bool(values.mucus) ? 1 : 0);
      const redFlags =
        (bool(values.rfAge) ? 1 : 0) +
        (bool(values.rfWeight) ? 1 : 0) +
        (bool(values.rfBlood) ? 1 : 0) +
        (bool(values.rfAnemia) ? 1 : 0) +
        (bool(values.rfFever) ? 1 : 0);

      if (redFlags > 0) {
        return {
          score: manning,
          unit: 'criteria (of 6)',
          label: 'Red flag(s) present — IBS not likely',
          interpretation: `${redFlags} alarm feature(s) present (age >50, weight loss, rectal bleeding, anemia, fever). Manning criteria should not be used to diagnose IBS — investigate organic disease first, regardless of the ${manning}/6 symptom count.`,
          riskLevel: 'moderate' as const,
          details: [
            { label: 'Manning criteria met', value: `${manning} of 6` },
            { label: 'Red flags', value: `${redFlags} present` },
          ],
          recommendations: [
            'Age-appropriate colorectal evaluation (colonoscopy if bleeding/anemia/age >50).',
            'Celiac serology and inflammatory markers per presentation.',
            'Revisit functional diagnosis only after alarm features are explained.',
          ],
          alerts: ['Alarm feature present — exclude organic disease before diagnosing IBS.'],
        };
      }
      if (manning >= 3) {
        return {
          score: manning,
          unit: 'criteria (of 6)',
          label: 'Manning positive (≥3 criteria)',
          interpretation: `${manning}/6 Manning criteria with no red flags — supports a positive IBS diagnosis (original study: more criteria = higher likelihood of IBS over organic disease).`,
          riskLevel: 'low' as const,
          details: [
            { label: 'Manning criteria met', value: `${manning} of 6` },
            { label: 'Red flags', value: 'None' },
          ],
          recommendations: [
            'Confirm against current Rome IV criteria for formal diagnosis.',
            'Limited workup (celiac serology ± fecal calprotectin) per guidelines rather than exhaustive exclusion.',
            'Subtype-directed therapy (fiber, antispasmodics, gut–brain agents) if confirmed.',
          ],
        };
      }
      return {
        score: manning,
        unit: 'criteria (of 6)',
        label: 'Manning negative (<3 criteria)',
        interpretation: `Only ${manning}/6 Manning criteria — below the ≥3 threshold; IBS is less supported on symptom pattern alone. Consider alternative functional or organic diagnoses.`,
        riskLevel: 'info' as const,
        details: [
          { label: 'Manning criteria met', value: `${manning} of 6` },
          { label: 'Red flags', value: 'None' },
        ],
      };
    },
    evidence: {
      summary:
        'Manning 1978: six symptoms more common in IBS — pain with more frequent stools, looser stools at pain onset, pain relieved by defecation, distension, incomplete evacuation, mucus. ≥3 positive supports IBS; any red flag (age >50, weight loss, blood, anemia, fever) overrides.',
      formula: 'Positive if ≥3 of 6 symptoms AND no red flags',
      validation:
        'Original derivation in 109 clinic patients (32 IBS vs 33 organic); validation studies report ~67% sensitivity / ~70% specificity at ≥3 criteria. Now largely superseded by Rome IV criteria, which are the current diagnostic standard.',
      references: [
        {
          title: 'Towards positive diagnosis of the irritable bowel',
          citation: 'Manning AP, Thompson WG, Heaton KW, Morris AF. Br Med J. 1978;2(6138):653-654',
          year: 1978,
          pmid: '698649',
          doi: '10.1136/bmj.2.6138.653',
        },
      ],
    },
    nextSteps: [
      { condition: 'Manning ≥3, no red flags', actions: ['Apply Rome IV criteria for current-standard diagnosis', 'Rule out celiac disease per guidelines', 'Treat by subtype (IBS-C/D/M)'] },
      { condition: 'Any red flag', actions: ['Investigate organic disease first — colonoscopy, celiac serology, calprotectin as indicated'] },
    ],
    pearls: [
      'IBS remains a positive-symptom diagnosis with LIMITED exclusion workup — not pure diagnosis-of-exclusion.',
      'Nocturnal symptoms, onset after 50, weight loss, bleeding, anemia, and fever should always trigger organic workup.',
      'Manning performs better in patients with pain-predominant presentations.',
    ],
  },

  // ─── 7. Kruis Score for IBS ────────────────────────────────────────────────
  {
    id: 'kruis-ibs',
    name: 'Kruis Score for Diagnosis of Irritable Bowel Syndrome (IBS)',
    shortName: 'Kruis Score',
    description:
      'Weighted symptom-plus-red-flag score for IBS: positive points for functional symptoms, large negative points for organic-disease features; ≥44 suggests IBS.',
    category: 'gastroenterology',
    tags: ['ibs', 'kruis', 'functional', 'diagnosis', 'red flags', 'weighted score'],
    whenToUse:
      'Adults with chronic abdominal complaints where a structured history + basic exam + simple labs (ESR, CBC) are available to support or undermine an IBS diagnosis.',
    whyUse:
      'Combines positive symptom weights with heavy penalties for organic-disease markers; at ≥44 the score reached ~99% specificity for excluding organic disease in the derivation study.',
    status: 'legacy',
    supersededBy: 'rome-iv-ibs',
    inputs: [
      yesNo('symptoms', 'Symptoms of abdominal pain, flatulence, or bowel irregularity', 34, 'Any of: abdominal pain, flatulence/bloating, or irregular bowel habit — the core functional symptom cluster.', true),
      yesNo('duration', 'Symptom duration >2 years', 16, 'Chronicity >2 years favors a functional disorder.', false),
      yesNo('painChar', 'Pain described as burning, cutting, very strong, terrible, pressure-like, dull, boring, or "not so bad"', 23, 'Characteristic functional-pain descriptors from the Kruis questionnaire.', false),
      yesNo('alternating', 'Alternating constipation and diarrhea', 14, 'Alternating bowel habit pattern.', false),
      yesNo('organicFindings', 'Abnormal physical findings or history pathognomonic of other disease', -47, 'Physical-exam abnormality or history pointing to organic disease — the largest single penalty.', false),
      yesNo('esrHigh', 'ESR >10 mm/hr', -13, 'Elevated erythrocyte sedimentation rate suggests inflammation.', false),
      yesNo('wbcHigh', 'WBC >10,000/µL', -50, 'Leukocytosis suggests organic/infectious disease.', false),
      yesNo('anemia', 'Anemia — hemoglobin <12 g/dL (female) or <14 g/dL (male)', -98, 'Anemia is a near-disqualifying red flag (−98 points).', false),
      yesNo('bloodStool', 'History of blood in stool', -98, 'Reported rectal bleeding is a near-disqualifying red flag (−98 points).', false),
    ],
    calculate(values) {
      const score =
        (bool(values.symptoms) ? 34 : 0) +
        (bool(values.duration) ? 16 : 0) +
        (bool(values.painChar) ? 23 : 0) +
        (bool(values.alternating) ? 14 : 0) +
        (bool(values.organicFindings) ? -47 : 0) +
        (bool(values.esrHigh) ? -13 : 0) +
        (bool(values.wbcHigh) ? -50 : 0) +
        (bool(values.anemia) ? -98 : 0) +
        (bool(values.bloodStool) ? -98 : 0);
      const organicFlags =
        (bool(values.organicFindings) ? 1 : 0) +
        (bool(values.esrHigh) ? 1 : 0) +
        (bool(values.wbcHigh) ? 1 : 0) +
        (bool(values.anemia) ? 1 : 0) +
        (bool(values.bloodStool) ? 1 : 0);
      if (score >= 44) {
        return {
          score,
          unit: 'points',
          label: 'Kruis positive (≥44) — IBS likely',
          interpretation: `Kruis score ${score} ≥44: functional-symptom weights dominate with no disqualifying organic features — IBS is likely (derivation: ~99% specificity at this cutoff).`,
          riskLevel: 'low' as const,
          details: [
            { label: 'Score', value: `${score} (threshold ≥44)` },
            { label: 'Organic-disease flags', value: `${organicFlags}` },
          ],
          recommendations: [
            'Confirm with Rome IV criteria; treat by subtype.',
            'If new red flags emerge, re-investigate despite a positive score.',
          ],
        };
      }
      return {
        score,
        unit: 'points',
        label: 'Kruis <44 — IBS not supported',
        interpretation: `Kruis score ${score} below the 44 threshold.${organicFlags > 0 ? ` ${organicFlags} organic-disease flag(s) are dragging the score down — investigate before labeling functional disease.` : ' Functional-symptom weight is insufficient for a positive IBS call.'}`,
        riskLevel: organicFlags > 0 ? ('moderate' as const) : ('info' as const),
        details: [
          { label: 'Score', value: `${score} (threshold ≥44)` },
          { label: 'Organic-disease flags', value: `${organicFlags}` },
        ],
        recommendations: organicFlags > 0
          ? ['Work up red-flag findings (imaging, endoscopy, celiac serology, calprotectin as indicated).']
          : ['Consider alternative functional diagnoses or further evaluation if suspicion for IBS remains.'],
        ...(organicFlags > 0 ? { alerts: ['Organic-disease marker present — do not diagnose IBS until explained.'] } : {}),
      };
    },
    evidence: {
      summary:
        'Kruis 1984 weighted score: symptoms +34, duration >2 y +16, characteristic pain description +23, alternating constipation/diarrhea +14; penalties: pathognomonic findings −47, ESR >10 −13, WBC >10k −50, anemia −98, blood in stool −98. ≥44 → IBS.',
      formula: 'Sum of 9 weighted items; ≥44 = IBS likely',
      validation:
        'Derived via logistic regression in 479 outpatients (Gastroenterology 1984); at ≥44 specificity ~99% (sensitivity 64%). Later reviews note blood-in-stool penalties may over-exclude IBS; Rome IV is now the standard diagnostic framework.',
      references: [
        {
          title: 'A diagnostic score for the irritable bowel syndrome. Its value in the exclusion of organic disease',
          citation: 'Kruis W, Thieme C, Weinzierl M, Schüssler P, Holl J, Paulus W. Gastroenterology. 1984;87(1):1-7',
          year: 1984,
          pmid: '6724251',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score ≥44', actions: ['Rome IV confirmation', 'Subtype-based therapy', 'Safety-net for late alarm features'] },
      { condition: 'Score <44 or any organic flag', actions: ['Targeted organic-disease workup', 'Reassess after workup'] },
    ],
    pearls: [
      'The score needs a physical exam plus basic labs (ESR, CBC) — it is not a symptoms-only tool.',
      'A single anemia or bleeding flag (−98) almost guarantees a negative result by design.',
      'High specificity, modest sensitivity — a positive result is more informative than a negative one.',
    ],
  },

  // ─── 8. Rome II Diagnostic Criteria for IBS ────────────────────────────────
  {
    id: 'rome-ii-ibs',
    name: 'Rome II Diagnostic Criteria for Irritable Bowel Syndrome (IBS)',
    shortName: 'Rome II IBS',
    description:
      '1999 Rome II symptom criteria for IBS: ≥12 weeks of abdominal discomfort/pain in the preceding 12 months plus ≥2 of 3 defecation-related features.',
    category: 'gastroenterology',
    tags: ['ibs', 'rome ii', 'functional', 'diagnosis', 'criteria'],
    whenToUse:
      'Historical/reference use — when comparing older literature or cohorts defined under Rome II. For current diagnosis use Rome IV.',
    whyUse:
      'Documents the Rome II definition used in much of the 1999–2006 evidence base.',
    status: 'superseded',
    supersededBy: 'rome-iv-ibs',
    inputs: [
      yesNo('duration', '≥12 weeks of abdominal discomfort or pain in the preceding 12 months (need not be consecutive)', null, 'Gate criterion: cumulative ≥12 weeks of abdominal discomfort OR pain within the last 12 months, in the absence of structural/biochemical explanation.', true),
      yesNo('relieved', 'Relieved with defecation', 1, 'Discomfort/pain is relieved by defecation.', true),
      yesNo('freq', 'Onset associated with a change in stool frequency', 1, 'Symptom onset coincides with more or less frequent stools.', false),
      yesNo('form', 'Onset associated with a change in stool form (appearance)', 1, 'Symptom onset coincides with harder or looser stool form.', false),
    ],
    calculate(values) {
      const gate = bool(values.duration);
      const features =
        (bool(values.relieved) ? 1 : 0) +
        (bool(values.freq) ? 1 : 0) +
        (bool(values.form) ? 1 : 0);
      if (!gate) {
        return {
          score: features,
          unit: 'features (of 3)',
          label: 'Rome II duration criterion not met',
          interpretation: 'The ≥12-week cumulative duration requirement is not satisfied — Rome II IBS criteria cannot be met regardless of associated features.',
          riskLevel: 'info' as const,
          details: [{ label: 'Associated features', value: `${features} of 3` }],
        };
      }
      if (features >= 2) {
        return {
          score: features,
          unit: 'features (of 3)',
          label: 'Rome II IBS criteria satisfied',
          interpretation: `≥12 weeks of abdominal discomfort/pain in the past year plus ${features}/3 associated features — meets Rome II (1999) IBS criteria, provided organic disease is excluded. Superseded by Rome IV (2016).`,
          riskLevel: 'moderate' as const,
          details: [{ label: 'Associated features', value: `${features} of 3 (≥2 required)` }],
          recommendations: [
            'Rome II is superseded — re-apply Rome IV for a current-standard diagnosis (stricter frequency threshold: ≥1 day/week).',
            'Screen for alarm features before labeling IBS.',
          ],
        };
      }
      return {
        score: features,
        unit: 'features (of 3)',
        label: 'Rome II IBS criteria not met',
        interpretation: `Duration gate met but only ${features}/3 associated features (need ≥2). Does not satisfy Rome II.`,
        riskLevel: 'info' as const,
        details: [{ label: 'Associated features', value: `${features} of 3` }],
      };
    },
    evidence: {
      summary:
        'Rome II (Thompson et al., Gut 1999 suppl): IBS = ≥12 weeks (need not be consecutive) of abdominal discomfort or pain in the preceding 12 months with ≥2 of: relieved with defecation; onset with change in stool frequency; onset with change in stool form.',
      formula: 'Duration gate + ≥2 of 3 features',
      validation:
        'Consensus criteria of the Rome II committees; superseded by Rome III (2006) and Rome IV (2016). Retained for interpreting pre-2006 literature.',
      references: [
        {
          title: 'Functional bowel disorders and functional abdominal pain',
          citation: 'Thompson WG, Longstreth GF, Drossman DA, et al. Gut. 1999;45(Suppl 2):II43-II47',
          year: 1999,
          pmid: '10457044',
          doi: '10.1136/gut.45.2008.ii43',
        },
      ],
    },
    nextSteps: [
      { condition: 'Criteria met', actions: ['Re-apply Rome IV (current standard)', 'Red-flag screen; limited workup per guidelines'] },
      { condition: 'Criteria not met', actions: ['Consider other functional bowel disorders or organic causes'] },
    ],
    pearls: [
      'Rome II used a 12-weeks-in-12-months window without a weekly frequency threshold — broader than Rome III/IV.',
      'Discomfort OR pain qualified under Rome II; Rome IV requires pain specifically.',
      'Use for historical comparison only.',
    ],
  },

  // ─── 9. Rome III Diagnostic Criteria for IBS ───────────────────────────────
  {
    id: 'rome-iii-ibs',
    name: 'Rome III Diagnostic Criteria for Irritable Bowel Syndrome (IBS)',
    shortName: 'Rome III IBS',
    description:
      '2006 Rome III criteria for IBS: recurrent abdominal pain or discomfort ≥3 days/month in the last 3 months, onset ≥6 months prior, plus ≥2 of 3 associated features.',
    category: 'gastroenterology',
    tags: ['ibs', 'rome iii', 'functional', 'diagnosis', 'criteria'],
    whenToUse:
      'When applying or interpreting Rome III–defined IBS cohorts (2006–2016 literature). For current diagnosis use Rome IV.',
    whyUse:
      'Documents the Rome III definition — the dominant trial-era IBS criteria before Rome IV tightened frequency and required pain (not discomfort).',
    status: 'superseded',
    supersededBy: 'rome-iv-ibs',
    inputs: [
      yesNo('freq3mo', 'Recurrent abdominal pain or discomfort ≥3 days/month in the last 3 months', null, 'Gate criterion: pain or discomfort present on average at least 3 days per month over the last 3 months (12 weeks).', true),
      yesNo('onset6mo', 'Symptom onset ≥6 months before diagnosis', null, 'Criteria must be fulfilled for the last 3 months with symptom onset at least 6 months before diagnosis.', true),
      yesNo('relieved', 'Improvement with defecation', 1, 'Pain/discomfort improves with defecation.', true),
      yesNo('freq', 'Onset associated with a change in stool frequency', 1, 'Symptom onset coincides with altered stool frequency.', false),
      yesNo('form', 'Onset associated with a change in stool form (appearance)', 1, 'Symptom onset coincides with altered stool form.', false),
    ],
    calculate(values) {
      const gate = bool(values.freq3mo) && bool(values.onset6mo);
      const features =
        (bool(values.relieved) ? 1 : 0) +
        (bool(values.freq) ? 1 : 0) +
        (bool(values.form) ? 1 : 0);
      if (!gate) {
        return {
          score: features,
          unit: 'features (of 3)',
          label: 'Rome III frequency/onset criteria not met',
          interpretation: 'The ≥3 days/month-for-3-months frequency or ≥6-month-onset requirement is not satisfied — Rome III IBS criteria cannot be met.',
          riskLevel: 'info' as const,
          details: [{ label: 'Associated features', value: `${features} of 3` }],
        };
      }
      if (features >= 2) {
        return {
          score: features,
          unit: 'features (of 3)',
          label: 'Rome III IBS criteria satisfied',
          interpretation: `Recurrent abdominal pain/discomfort ≥3 days/month for 3 months (onset ≥6 months) plus ${features}/3 associated features — meets Rome III (2006) IBS criteria if organic disease is excluded. Superseded by Rome IV (2016).`,
          riskLevel: 'moderate' as const,
          details: [{ label: 'Associated features', value: `${features} of 3 (≥2 required)` }],
          recommendations: [
            'Rome III is superseded — re-apply Rome IV for current-standard diagnosis.',
            'Screen for alarm features before labeling IBS.',
          ],
        };
      }
      return {
        score: features,
        unit: 'features (of 3)',
        label: 'Rome III IBS criteria not met',
        interpretation: `Gates met but only ${features}/3 associated features (need ≥2). Does not satisfy Rome III.`,
        riskLevel: 'info' as const,
        details: [{ label: 'Associated features', value: `${features} of 3` }],
      };
    },
    evidence: {
      summary:
        'Rome III (Longstreth et al., Gastroenterology 2006): IBS = recurrent abdominal pain or discomfort ≥3 days/month in the last 3 months with onset ≥6 months prior, associated with ≥2 of: improvement with defecation; onset with change in frequency; onset with change in form.',
      formula: 'Frequency gate + onset gate + ≥2 of 3 features',
      validation:
        'Consensus criteria of the Rome III committee; superseded by Rome IV (2016), which raised frequency to ≥1 day/week and requires pain rather than discomfort.',
      references: [
        {
          title: 'Functional bowel disorders',
          citation: 'Longstreth GF, Thompson WG, Chey WD, Houghton LA, Mearin F, Spiller RC. Gastroenterology. 2006;130(5):1480-1491',
          year: 2006,
          pmid: '16678561',
          doi: '10.1053/j.gastro.2005.11.061',
        },
      ],
    },
    nextSteps: [
      { condition: 'Criteria met', actions: ['Re-apply Rome IV (current standard)', 'Red-flag screen; subtype assessment (IBS-C/D/M/U by stool form)'] },
      { condition: 'Criteria not met', actions: ['Consider other functional bowel disorders or organic causes'] },
    ],
    pearls: [
      'Rome III introduced the ≥3-days/month frequency threshold and the 6-month-onset requirement retained in Rome IV.',
      'Subtyping under Rome III is by stool consistency (Bristol scale), not symptom clusters.',
      'Use for historical/trial-comparison purposes only.',
    ],
  },

  // ─── 10. I-SEE (Index of Severity for Eosinophilic Esophagitis) ────────────
  {
    id: 'i-see-eoe',
    name: 'Index of Severity for Eosinophilic Esophagitis (I-SEE)',
    shortName: 'I-SEE',
    description:
      '2022 AGA-consensus EoE severity index across symptoms/complications, inflammatory, and fibrostenotic domains; scores 0–78 grade inactive/mild/moderate/severe disease.',
    category: 'gastroenterology',
    tags: ['eoe', 'eosinophilic esophagitis', 'i-see', 'severity', 'dellon', 'dysphagia'],
    whenToUse:
      'At EoE diagnosis and each subsequent visit, using symptom history plus the most recent endoscopy and pathology reports, to grade disease severity.',
    whyUse:
      'First consensus severity metric for EoE — standardizes severity beyond eosinophil counts and is being incorporated into treatment frameworks and trials.',
    inputs: [
      selectInput('symptoms', 'Symptom frequency', [
        { label: 'None', value: 0, points: 0 },
        { label: 'Weekly', value: 1, points: 1 },
        { label: 'Daily', value: 2, points: 2 },
        { label: 'Multiple times per day or disrupting social functioning', value: 4, points: 4 },
      ], 2, 'Dysphagia/EoE symptom frequency since the last assessment.'),
      selectInput('impaction', 'Food impaction', [
        { label: 'None', value: 0, points: 0 },
        { label: 'Impaction with ER visit or endoscopy (patient ≥18 years)', value: 2, points: 2 },
        { label: 'Impaction with ER visit or endoscopy (patient <18 years)', value: 4, points: 4 },
      ], 0, 'Food impaction requiring emergency department visit or endoscopic removal; scores higher in children.'),
      yesNo('hosp', 'Hospitalization due to EoE', 4, 'Hospital admission attributable to EoE (e.g., prolonged impaction, dehydration, nutrition).', false),
      yesNo('perforation', 'Esophageal perforation', 15, 'EoE-related esophageal perforation — automatically severe (15 points).', false),
      yesNo('malnutrition', 'Malnutrition — body mass <5th percentile or decreased growth trajectory', 15, 'Malnutrition/faltering growth attributable to EoE — automatically severe (15 points).', false),
      yesNo('inflamTx', 'Persistent inflammation requiring elemental formula, systemic corticosteroid, or immunomodulatory treatment', 15, 'Immunomodulators include biologics, azathioprine/6MP, or other immune-targeted therapy — automatically severe (15 points).', false),
      selectInput('inflamFindings', 'Edema, furrows, and/or exudates (endoscopy)', [
        { label: 'None', value: 0, points: 0 },
        { label: 'Localized', value: 1, points: 1 },
        { label: 'Diffuse', value: 2, points: 2 },
      ], 0, 'Inflammatory endoscopic features — score the worst affected region.'),
      selectInput('eos', 'Peak esophageal eosinophil count', [
        { label: '<15 eos/hpf', value: 0, points: 0 },
        { label: '15–60 eos/hpf', value: 1, points: 1 },
        { label: '>60 eos/hpf', value: 2, points: 2 },
      ], 1, 'Peak eosinophils per high-power field on biopsy; use the highest recorded count.'),
      selectInput('ringsStrictures', 'Rings / strictures (fibrostenosis)', [
        { label: 'None', value: 0, points: 0 },
        { label: 'Present, but endoscope passes easily', value: 1, points: 1 },
        { label: 'Present, but requires dilation or snug fit passing a standard endoscope', value: 2, points: 2, description: 'Seen with a 10–14 mm esophagus; diameter can be measured by balloon-sizing, dilation effect, or barium esophagram' },
        { label: 'Cannot pass standard endoscope; repeated dilations (adult ≥18 y); or any dilation (child <18 y)', value: 15, points: 15 },
      ], 0, 'Fibrostenotic features — the 15-point tier (very narrow esophagus or dilation need) is automatically severe.'),
      yesNo('histology', 'Basal zone hyperplasia or lamina propria fibrosis (or DEC/SEA if no lamina propria sampled)', 2, 'Histologic severity markers: BZH or LPF; if no lamina propria in the specimen, dyskeratotic epithelial cells or surface epithelial alteration count instead.', false),
    ],
    calculate(values) {
      const score =
        num(values.symptoms, 0) +
        num(values.impaction, 0) +
        (bool(values.hosp) ? 4 : 0) +
        (bool(values.perforation) ? 15 : 0) +
        (bool(values.malnutrition) ? 15 : 0) +
        (bool(values.inflamTx) ? 15 : 0) +
        num(values.inflamFindings, 0) +
        num(values.eos, 0) +
        num(values.ringsStrictures, 0) +
        (bool(values.histology) ? 2 : 0);
      let riskLevel: 'normal' | 'low' | 'moderate' | 'high' = 'normal';
      let label = '';
      let interpretation = '';
      if (score < 1) {
        riskLevel = 'normal';
        label = 'Inactive EoE';
        interpretation = 'I-SEE 0: no active features — consistent with inactive/controlled EoE at this assessment.';
      } else if (score <= 6) {
        riskLevel = 'low';
        label = 'Mild active EoE (1–6)';
        interpretation = `I-SEE ${score}: mild active EoE. Continue current anti-inflammatory therapy and monitor symptoms.`;
      } else if (score <= 14) {
        riskLevel = 'moderate';
        label = 'Moderate active EoE (7–14)';
        interpretation = `I-SEE ${score}: moderate active EoE. Reassess therapy adherence/efficacy, diet strategy, and endoscopic activity.`;
      } else {
        riskLevel = 'high';
        label = 'Severe EoE (≥15)';
        interpretation = `I-SEE ${score}: severe EoE — a single 15-point complication (perforation, malnutrition, refractory inflammation, advanced fibrostenosis) or accumulated features. Intensify management; consider dilation and nutritional support.`;
      }
      return {
        score,
        unit: 'points',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Symptoms & complications', value: `${num(values.symptoms, 0) + num(values.impaction, 0) + (bool(values.hosp) ? 4 : 0) + (bool(values.perforation) ? 15 : 0) + (bool(values.malnutrition) ? 15 : 0) + (bool(values.inflamTx) ? 15 : 0)} pts` },
          { label: 'Inflammatory features', value: `${num(values.inflamFindings, 0) + num(values.eos, 0)} pts` },
          { label: 'Fibrostenotic features', value: `${num(values.ringsStrictures, 0) + (bool(values.histology) ? 2 : 0)} pts` },
          { label: 'Severity band', value: score < 1 ? 'Inactive' : score <= 6 ? 'Mild' : score <= 14 ? 'Moderate' : 'Severe' },
        ],
        recommendations: [
          'Track I-SEE longitudinally at each visit — it is designed for serial use.',
          'Severe fibrostenotic disease: plan endoscopic dilation plus anti-inflammatory therapy.',
          'Address nutrition and growth, especially in children.',
        ],
      };
    },
    evidence: {
      summary:
        'I-SEE (Dellon et al., JACI 2022): three domains — symptoms & complications, inflammatory features, fibrostenotic features. Items 1–15 points; complications score cumulatively, other items take the highest applicable value. Bands: <1 inactive, 1–6 mild, 7–14 moderate, ≥15 severe.',
      formula: 'Sum of item points (0–78); <1 inactive / 1–6 mild / 7–14 moderate / ≥15 severe',
      validation:
        'Developed by international multidisciplinary consensus (AGA-sponsored). Early field testing shows correlation with treatment response; formal validation ongoing. Item weights match the published Table I.',
      references: [
        {
          title: 'A Clinical Severity Index for Eosinophilic Esophagitis: Development, Consensus, and Future Directions',
          citation: 'Dellon ES, Khoury P, Muir AB, et al. J Allergy Clin Immunol. 2022;150(1):33-47',
          year: 2022,
          pmid: '35606166',
          doi: '10.1016/j.jaci.2022.03.015',
        },
      ],
    },
    nextSteps: [
      { condition: 'Severe (≥15)', actions: ['Escalate anti-inflammatory therapy', 'Endoscopic dilation for fibrostenosis', 'Nutrition/growth assessment', 'Specialist multidisciplinary review'] },
      { condition: 'Mild–moderate', actions: ['Optimize PPI/topical steroid/biologic or elimination diet', 'Repeat I-SEE at next visit and after therapy changes'] },
    ],
    pearls: [
      'Complications accumulate (each is scored); other items take the single highest applicable value.',
      'Children score differently on impaction (4 vs 2) and dilation (any dilation = 15).',
      'The score intentionally blends symptoms, endoscopy, and histology — it is not an eosinophil-count surrogate.',
    ],
  },

  // ─── 11. EREFS (EoE Endoscopic Reference Score) ────────────────────────────
  {
    id: 'erefs-eoe',
    name: 'Eosinophilic Esophagitis Endoscopic Reference Score (EREFS)',
    shortName: 'EREFS',
    description:
      'Standardized grading of the five major endoscopic features of EoE — Edema, Rings, Exudates, Furrows, Strictures — producing a 0–8 activity score.',
    category: 'gastroenterology',
    tags: ['eoe', 'eosinophilic esophagitis', 'erefs', 'endoscopy', 'hirano'],
    whenToUse:
      'During every upper endoscopy in suspected or known EoE; score the esophageal segment with the worst (highest) findings to capture maximal disease burden.',
    whyUse:
      'Provides a common nomenclature and validated grading (good interobserver agreement) that has become the standard endoscopic endpoint in EoE trials.',
    inputs: [
      yesNo('edema', 'Edema — loss of vascular markings / pallor', 1, 'Decreased or absent vascularity with mucosal pallor/reduced transparency.', true),
      selectInput('rings', 'Rings (trachealization / feline esophagus)', [
        { label: 'None', value: 0, points: 0 },
        { label: 'Mild — subtle ridges', value: 1, points: 1 },
        { label: 'Moderate — distinct concentric rings', value: 2, points: 2 },
        { label: 'Severe — fixed rings, scope does not pass easily', value: 3, points: 3 },
      ], 0, 'Fixed concentric rings; grade the most severe region.'),
      selectInput('exudates', 'Exudates (white plaques/papules)', [
        { label: 'None', value: 0, points: 0 },
        { label: 'Mild — ≤10% of mucosal surface', value: 1, points: 1 },
        { label: 'Severe — >10% of mucosal surface', value: 2, points: 2 },
      ], 0, 'White exudate/plaques representing eosinophilic microabscesses; grade by surface-area involvement.'),
      yesNo('furrows', 'Furrows — vertical lines/creases', 1, 'Longitudinal furrows along the esophageal wall.', false),
      yesNo('stricture', 'Stricture — fixed narrowing (small-caliber scope or resistance)', 1, 'Luminal narrowing requiring a small-caliber endoscope or causing resistance to passage.', false),
    ],
    calculate(values) {
      const edema = bool(values.edema) ? 1 : 0;
      const rings = num(values.rings, 0);
      const exudates = num(values.exudates, 0);
      const furrows = bool(values.furrows) ? 1 : 0;
      const stricture = bool(values.stricture) ? 1 : 0;
      const score = edema + rings + exudates + furrows + stricture;
      const inflammatory = edema + exudates + furrows;
      const fibrostenotic = rings + stricture;
      let riskLevel: 'normal' | 'low' | 'moderate' | 'high' = 'normal';
      let label = '';
      let interpretation = '';
      if (score === 0) {
        riskLevel = 'normal';
        label = 'No endoscopic features (EREFS 0)';
        interpretation = 'EREFS 0: no edema, rings, exudates, furrows, or stricture seen — endoscopically inactive EoE at this exam (does not exclude histologic activity).';
      } else if (score <= 2) {
        riskLevel = 'low';
        label = 'Minimal endoscopic activity (1–2)';
        interpretation = `EREFS ${score}: minimal endoscopic activity. Post-treatment EREFS ≤2 has been associated with histologic and symptomatic response in recent analyses.`;
      } else if (score <= 4) {
        riskLevel = 'moderate';
        label = 'Moderate endoscopic activity (3–4)';
        interpretation = `EREFS ${score}: moderate endoscopic activity — correlate with symptoms and biopsy eosinophil counts.`;
      } else {
        riskLevel = 'high';
        label = 'Marked endoscopic activity (5–8)';
        interpretation = `EREFS ${score}: marked endoscopic activity with significant inflammatory and/or fibrostenotic burden.`;
      }
      return {
        score,
        unit: 'points (0–8)',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Inflammatory subscore (edema+exudates+furrows)', value: `${inflammatory} / 4` },
          { label: 'Fibrostenotic subscore (rings+stricture)', value: `${fibrostenotic} / 4` },
          { label: 'Edema / Furrows / Stricture', value: `${edema ? 'Present' : 'Absent'} / ${furrows ? 'Present' : 'Absent'} / ${stricture ? 'Present' : 'Absent'}` },
          { label: 'Rings / Exudates grade', value: `${rings} / ${exudates}` },
        ],
        recommendations: [
          'Report EREFS at every EoE endoscopy; score the worst-affected segment.',
          'Successful anti-inflammatory therapy should lower the inflammatory subscore (edema, exudates, furrows).',
          'Persistent rings/strictures despite remission may need endoscopic dilation.',
          'Repeat endoscopy ~6–12 weeks after therapy changes to confirm response.',
        ],
      };
    },
    evidence: {
      summary:
        'EREFS (Hirano et al., Gut 2013): Edema 0–1, Rings 0–3, Exudates 0–2, Furrows 0–1, Stricture 0–1; total 0–8. Crepe-paper mucosa is a recognized additional feature not counted in the score.',
      formula: 'EREFS = E(0–1) + R(0–3) + E(0–2) + F(0–1) + S(0–1)',
      validation:
        'Modified grading achieved good interobserver agreement (κ 0.40–0.54 major features) in 21-gastroenterologist video validation; standard endoscopic endpoint in EoE RCTs. Severity bands here are descriptive — the publication defines grades, not clinical cutoffs; post-treatment EREFS ≤2 correlates with response.',
      references: [
        {
          title: 'Endoscopic assessment of the oesophageal features of eosinophilic oesophagitis: validation of a novel classification and grading system',
          citation: 'Hirano I, Moy N, Heckman MG, Thomas CS, Gonsalves N, Achem SR. Gut. 2013;62(4):489-495',
          year: 2013,
          pmid: '22619364',
          doi: '10.1136/gutjnl-2011-301817',
        },
      ],
    },
    nextSteps: [
      { condition: 'EREFS >2 or rising on therapy', actions: ['Review adherence and therapy choice', 'Biopsy to assess histologic activity', 'Dilation if fixed strictures persist'] },
      { condition: 'EREFS 0–2 on treatment', actions: ['Continue current regimen', 'Surveillance endoscopy per local protocol'] },
    ],
    pearls: [
      'Score the worst (highest-grade) segment for the overall EREFS; segment-specific scores can be recorded for detail.',
      'Edema and furrows are graded dichotomously (absent/present) — granularity was collapsed in validation for reliability.',
      'Crepe-paper mucosa (fragile mucosa tearing on scope passage) is a characteristic minor feature not in the numeric score.',
    ],
  },

  // ─── 12. Edinburgh Gastric Ulcer Score (EGUS) ──────────────────────────────
  {
    id: 'egus-gastric-ulcer',
    name: 'Edinburgh Gastric Ulcer Score (EGUS)',
    shortName: 'EGUS',
    description:
      'Three-item score (age, ulcer size, location) stratifying malignancy risk in endoscopically diagnosed gastric ulcers to guide the need for repeat endoscopy.',
    category: 'gastroenterology',
    tags: ['gastric ulcer', 'egus', 'malignancy', 'endoscopy', 'follow-up', 'stomach'],
    whenToUse:
      'After an index OGD diagnoses a gastric ulcer, when deciding whether follow-up endoscopy is needed to confirm healing/exclude malignancy.',
    whyUse:
      'Low EGUS (<3) combined with benign appearance and ≥6 negative biopsies had NPV ~97–99% for malignancy — supporting safe omission of routine repeat OGD in selected patients.',
    inputs: [
      numberInput('age', 'Patient age', { unit: 'years', min: 18, max: 110, exampleValue: 72, helpText: 'Age bands: <68 = 0; 68–79 = +1; ≥80 = +2.' }),
      numberInput('size', 'Ulcer size', { unit: 'cm', min: 0.1, max: 15, step: 0.1, exampleValue: 1.8, helpText: 'Estimated maximum ulcer diameter at endoscopy: <1.25 cm = 0; 1.25–2.99 cm = +2; ≥3.00 cm = +3.' }),
      selectInput('location', 'Ulcer location', [
        { label: 'Antral', value: 'antral', points: 0 },
        { label: 'Non-antral (body, fundus, cardia, incisura, pyloric channel)', value: 'nonantral', points: 1 },
      ], 'antral', 'Non-antral location adds 1 point — proximal ulcers carried higher malignancy association in derivation.'),
    ],
    calculate(values) {
      const age = num(values.age, 70);
      const size = num(values.size, 1.5);
      const agePts = age < 68 ? 0 : age < 80 ? 1 : 2;
      const sizePts = size < 1.25 ? 0 : size < 3.0 ? 2 : 3;
      const locPts = str(values.location, 'antral') === 'nonantral' ? 1 : 0;
      const score = agePts + sizePts + locPts;
      if (score >= 3) {
        return {
          score,
          unit: 'points (0–6)',
          label: 'EGUS ≥3 — higher malignancy risk',
          interpretation: `EGUS ${score}: higher-risk ulcer (78–84% of malignant ulcers scored ≥3). Arrange repeat OGD in ~6–8 weeks (sooner if symptoms persist) to confirm healing and re-biopsy.`,
          riskLevel: 'high' as const,
          details: [
            { label: 'Age', value: `${age} y (+${agePts})` },
            { label: 'Ulcer size', value: `${size} cm (+${sizePts})` },
            { label: 'Location', value: `${str(values.location, 'antral') === 'nonantral' ? 'Non-antral' : 'Antral'} (+${locPts})` },
          ],
          recommendations: [
            'Repeat OGD in 6–8 weeks with systematic biopsies of the ulcer edge and base.',
            'Macroscopically suspicious ulcers need urgent workup regardless of score.',
            'Treat with PPI; test and eradicate H. pylori; review NSAID/antithrombotic use.',
          ],
        };
      }
      return {
        score,
        unit: 'points (0–6)',
        label: 'EGUS <3 — lower malignancy risk',
        interpretation: `EGUS ${score}: lower-risk ulcer. In derivation/validation, EGUS <3 with benign appearance and ≥6 negative biopsies carried NPV ~97–99% — routine repeat OGD may be avoided per the Edinburgh protocol.`,
        riskLevel: 'low' as const,
        details: [
          { label: 'Age', value: `${age} y (+${agePts})` },
          { label: 'Ulcer size', value: `${size} cm (+${sizePts})` },
          { label: 'Location', value: `${str(values.location, 'antral') === 'nonantral' ? 'Non-antral' : 'Antral'} (+${locPts})` },
        ],
        recommendations: [
          'Confirm ≥6 benign biopsies and benign macroscopic appearance before omitting follow-up OGD.',
          'PPI therapy + H. pylori eradication when indicated.',
          'Repeat endoscopy anyway if alarm symptoms persist or recur.',
        ],
      };
    },
    evidence: {
      summary:
        'EGUS (Grant/Brindle, EGAR Collaborative): age <68/68–79/≥80 → 0/1/2; ulcer size <1.25/1.25–2.99/≥3.00 cm → 0/2/3; non-antral location +1. Score ≥3 = higher risk → repeat OGD.',
      formula: 'EGUS (0–6) = age band + size band + location',
      validation:
        'Derived in 778 NHS Lothian gastric-ulcer patients (AUC 0.868; ≥3: 78% of malignant ulcers, NPV 97.4%) and externally validated (AUC 0.862, NPV 98.6%). A 2024 prospective protocol evaluation reported NPV 95.7% with no missed cancers. No cancers were found on follow-up of benign-appearing ulcers with negative biopsies.',
      references: [
        {
          title: 'Risk stratifying gastric ulcers: development and validation of a scoring system',
          citation: 'Brindle WM, Grant RK, Smith M, et al (EGAR Collaborative). Frontline Gastroenterol. 2022;13(2):111-118',
          year: 2022,
          pmid: '35295750',
          doi: '10.1136/flgastro-2020-101759',
        },
        {
          title: 'The Edinburgh Gastric Ulcer Score (EGUS): evaluation of a risk tool for gastric ulcer follow-up',
          citation: 'Grant RK, Brindle WM, et al. Frontline Gastroenterol',
          doi: '10.1136/flgastro-2024-102859',
        },
      ],
    },
    nextSteps: [
      { condition: 'EGUS ≥3', actions: ['Repeat OGD in 6–8 weeks with re-biopsy', 'Escalate to CT/EUS if suspicious features', 'Surgical/oncology referral if malignancy confirmed'] },
      { condition: 'EGUS <3', actions: ['Verify ≥6 benign biopsies + benign appearance', 'PPI ± H. pylori eradication', 'Return precautions for alarm symptoms'] },
    ],
    pearls: [
      'EGUS does not override macroscopic concern — a malignant-appearing ulcer always needs workup and follow-up.',
      'Positive histology mandates malignancy workup regardless of score.',
      'Ensure adequate biopsy sampling (≥6) before applying the low-risk pathway.',
    ],
  },

  // ─── 13. CholeS Score for Duration of Laparoscopic Cholecystectomy ─────────
  {
    id: 'choles-duration',
    name: 'CholeS Score for Duration of Laparoscopic Cholecystectomy',
    shortName: 'CholeS',
    description:
      'Ten-item preoperative score predicting the likelihood that an elective laparoscopic cholecystectomy will exceed 90 minutes, for theatre-list planning.',
    category: 'surgery',
    tags: ['cholecystectomy', 'choles', 'operative duration', 'laparoscopic', 'gallbladder', 'theatre planning'],
    whenToUse:
      'When booking elective laparoscopic cholecystectomy lists, to anticipate long (>90 min) operations and allocate list time appropriately.',
    whyUse:
      'Validated predictor of operative duration >90 min — the proportion of long operations rose ~eightfold (5.1%→41.8%) across score extremes; helps optimize theatre utilization.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 16, max: 110, exampleValue: 55, helpText: 'Age ≥40 adds 1.5 points.' }),
      selectInput('sex', 'Gender', [
        { label: 'Female', value: 'F', points: 0 },
        { label: 'Male', value: 'M', points: 1 },
      ], 'M', 'Male gender adds 1 point.'),
      selectInput('indication', 'Indication for cholecystectomy', [
        { label: 'Pancreatitis', value: 0, points: 0 },
        { label: 'Biliary colic, dyskinesia, or polyp', value: 0.5, points: 0.5 },
        { label: 'Common bile duct stone', value: 2, points: 2 },
        { label: 'Acalculous cholecystitis or cholecystitis', value: 2.5, points: 2.5 },
      ], 0.5, 'Admission indication — acalculous/cholecystitis presentations carry the most points.'),
      numberInput('bmi', 'BMI', { unit: 'kg/m²', min: 12, max: 70, step: 0.1, exampleValue: 29, helpText: 'BMI <25 = 0; 25–35 = +1; >35 = +2.' }),
      selectInput('cbd', 'Common bile duct diameter (pre-op imaging)', [
        { label: 'Normal', value: 'normal', points: 0 },
        { label: 'Dilated', value: 'dilated', points: 2 },
      ], 'normal', 'Dilated CBD on preoperative ultrasound adds 2 points.'),
      selectInput('wall', 'Gallbladder wall (pre-op imaging)', [
        { label: 'Normal', value: 'normal', points: 0 },
        { label: 'Thickened', value: 'thick', points: 1.5 },
      ], 'thick', 'Thickened gallbladder wall adds 1.5 points.'),
      yesNo('ct', 'Pre-operative CT performed', 1.5, 'A pre-op CT (usually reflecting complex presentation) adds 1.5 points.', false),
      yesNo('ioc', 'Intra-operative cholangiogram planned', 3, 'Planned IOC adds 3 points — the largest single item.', false),
      selectInput('prevAdm', 'Number of previous surgical admissions', [
        { label: '0', value: 0, points: 0 },
        { label: '1–2', value: 1, points: 1 },
        { label: '>2', value: 2.5, points: 2.5 },
      ], 0, 'Prior admissions with biliary/surgical episodes.'),
      selectInput('asa', 'ASA class', [
        { label: 'ASA 1', value: 0, points: 0 },
        { label: 'ASA 2', value: 1, points: 1 },
        { label: 'ASA >2', value: 2.5, points: 2.5 },
      ], 0, 'American Society of Anesthesiologists physical status class.'),
    ],
    calculate(values) {
      const age = num(values.age, 50);
      const bmi = num(values.bmi, 27);
      const agePts = age >= 40 ? 1.5 : 0;
      const sexPts = str(values.sex, 'F') === 'M' ? 1 : 0;
      const indPts = num(values.indication, 0);
      const bmiPts = bmi < 25 ? 0 : bmi <= 35 ? 1 : 2;
      const cbdPts = str(values.cbd, 'normal') === 'dilated' ? 2 : 0;
      const wallPts = str(values.wall, 'normal') === 'thick' ? 1.5 : 0;
      const ctPts = bool(values.ct) ? 1.5 : 0;
      const iocPts = bool(values.ioc) ? 3 : 0;
      const admPts = num(values.prevAdm, 0);
      const asaPts = num(values.asa, 0);
      const score = agePts + sexPts + indPts + bmiPts + cbdPts + wallPts + ctPts + iocPts + admPts + asaPts;
      let riskLevel: 'low' | 'moderate' | 'high' = 'low';
      let label = '';
      let interpretation = '';
      if (score <= 3) {
        riskLevel = 'low';
        label = 'Low risk of >90-min operation';
        interpretation = `CholeS ${score}: low-risk group — ~5% of operations in this band exceeded 90 minutes in the derivation/validation cohorts. Standard list allocation.`;
      } else if (score <= 8) {
        riskLevel = 'moderate';
        label = 'Intermediate risk of >90-min operation';
        interpretation = `CholeS ${score}: intermediate-risk group — risk of exceeding 90 minutes rises across this band toward ~42%. Consider extra list time or senior operator availability.`;
      } else {
        riskLevel = 'high';
        label = 'High risk of >90-min operation';
        interpretation = `CholeS ${score}: high-risk group — >40% of operations exceeded 90 minutes at score extremes. Book additional theatre time and anticipate technical difficulty/conversion risk.`;
      }
      return {
        score,
        unit: 'points',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Age ≥40', value: `+${agePts}` },
          { label: 'Male', value: `+${sexPts}` },
          { label: 'Indication', value: `+${indPts}` },
          { label: 'BMI', value: `${bmi} (+${bmiPts})` },
          { label: 'Dilated CBD', value: `+${cbdPts}` },
          { label: 'Thick GB wall', value: `+${wallPts}` },
          { label: 'Pre-op CT', value: `+${ctPts}` },
          { label: 'Planned IOC', value: `+${iocPts}` },
          { label: 'Prior surgical admissions', value: `+${admPts}` },
          { label: 'ASA', value: `+${asaPts}` },
        ],
        recommendations: [
          'Use the score when booking list slots — three low-risk cases may fit a standard half-day list; high-risk cases may warrant dedicated time.',
          'High scores: consider senior surgeon, anticipate longer case, discuss conversion risk.',
          'Validated for ELECTIVE cholecystectomy — emergency cases were excluded from derivation.',
        ],
      };
    },
    evidence: {
      summary:
        'CholeS score (Bharamgoudar/Sonsale/Hodson/Griffiths, WMRC 2018): age ≥40 +1.5, male +1, indication (pancreatitis 0 / colic-dyskinesia-polyp +0.5 / CBD stone +2 / acalculous-cholecystitis +2.5), BMI 25–35 +1 / >35 +2, dilated CBD +2, thick GB wall +1.5, pre-op CT +1.5, planned IOC +3, prior surgical admissions 1–2 +1 / >2 +2.5, ASA 2 +1 / >2 +2.5. Range 0–20.',
      formula: 'Sum of 10 items (0–20); predicts operative duration >90 min',
      validation:
        'Derived from the CholeS cohort (n=7227 elective LCs, 166 UK hospitals) and externally validated (n=2405, AUROC 0.708); operations >90 min rose from 5.1% to 41.8% across score extremes. Subsequent single-centre and Mexican external validations confirm correlation with operative time.',
      references: [
        {
          title: 'The development and validation of a scoring tool to predict the operative duration of elective laparoscopic cholecystectomy',
          citation: 'Bharamgoudar R, Sonsale A, Hodson J, Griffiths E; CholeS Study Group, West Midlands Research Collaborative. Surg Endosc. 2018;32(7):3149-3157',
          year: 2018,
          pmid: '29340820',
          doi: '10.1007/s00464-018-6030-6',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score >8', actions: ['Book extended slot', 'Senior/HPB-experienced operator', 'Consent discussion re: longer operation and conversion'] },
      { condition: 'Score ≤3', actions: ['Standard list booking', 'Day-case pathway appropriate'] },
    ],
    pearls: [
      'The score predicts duration, not complications — pair with a difficulty/conversion tool (e.g., CLOC) for full planning.',
      'Planned intraoperative cholangiogram (+3) is the single heaviest item.',
      'Derived on elective cases only; do not apply to emergency cholecystectomy.',
    ],
  },
];
