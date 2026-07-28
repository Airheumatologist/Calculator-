import type { Calculator } from '../../types/calculator';
import { num, bool, round, yesNo, selectInput, numberInput, riskFromThresholds } from '../../utils/helpers';

export const wave5SurgUroEntCalcs: Calculator[] = [
  {
    id: 'clavien-dindo',
    name: 'Clavien–Dindo Complication Grade',
    shortName: 'Clavien–Dindo',
    description:
      'Grades postoperative surgical complications by the intensity of therapy required (I–V).',
    category: 'surgery',
    tags: ['surgery', 'complication', 'clavien-dindo', 'audit', 'quality'],
    whenToUse:
      'Documenting or auditing postoperative morbidity after any surgical procedure.',
    whyUse:
      'Standardized, therapy-based grading improves communication and research comparability.',
    inputs: [
      selectInput('grade', 'Highest complication grade (therapy required)', [
        {
          label: 'I — Deviation; bedside care / allowed drugs only',
          value: 1,
          description: 'Antiemetics, antipyretics, analgesics, diuretics, electrolytes; wound opened at bedside',
        },
        {
          label: 'II — Pharmacologic treatment beyond grade I drugs',
          value: 2,
          description: 'Includes blood transfusion and total parenteral nutrition',
        },
        {
          label: 'IIIa — Intervention not under general anesthesia',
          value: 3,
        },
        {
          label: 'IIIb — Intervention under general anesthesia',
          value: 4,
        },
        {
          label: 'IVa — Single-organ dysfunction (ICU; includes dialysis)',
          value: 5,
        },
        {
          label: 'IVb — Multiorgan dysfunction',
          value: 6,
        },
        {
          label: 'V — Death of the patient',
          value: 7,
        },
      ]),
    ],
    calculate(values) {
      const g = num(values.grade, 1);
      const map: Record<
        number,
        { score: string; label: string; interpretation: string; riskLevel: 'low' | 'moderate' | 'high' | 'critical' }
      > = {
        1: {
          score: 'I',
          label: 'Grade I',
          interpretation:
            'Any deviation from normal postoperative course without need for pharmacologic treatment beyond allowed symptomatic drugs, or bedside wound management. Document and treat supportively.',
          riskLevel: 'low',
        },
        2: {
          score: 'II',
          label: 'Grade II',
          interpretation:
            'Requires pharmacologic treatment with drugs other than those allowed for grade I (e.g., antibiotics, antiarrhythmics), blood transfusion, or TPN. Escalate monitoring as indicated.',
          riskLevel: 'moderate',
        },
        3: {
          score: 'IIIa',
          label: 'Grade IIIa',
          interpretation:
            'Surgical, endoscopic, or radiologic intervention not under general anesthesia (e.g., bedside drainage, IR drain under local/sedation). Coordinate procedural care promptly.',
          riskLevel: 'high',
        },
        4: {
          score: 'IIIb',
          label: 'Grade IIIb',
          interpretation:
            'Intervention under general anesthesia (return to OR, major endoscopic/IR under GA). Senior surgical review and theater prioritization.',
          riskLevel: 'high',
        },
        5: {
          score: 'IVa',
          label: 'Grade IVa',
          interpretation:
            'Life-threatening single-organ dysfunction requiring ICU management (including dialysis). Critical care + primary team co-management.',
          riskLevel: 'critical',
        },
        6: {
          score: 'IVb',
          label: 'Grade IVb',
          interpretation:
            'Life-threatening multiorgan dysfunction. Full ICU support; goals-of-care discussion as appropriate.',
          riskLevel: 'critical',
        },
        7: {
          score: 'V',
          label: 'Grade V',
          interpretation:
            'Death of a patient. Morbidity & mortality review; support for family and team.',
          riskLevel: 'critical',
        },
      };
      const m = map[g] ?? map[1];
      return {
        score: m.score,
        label: m.label,
        interpretation: m.interpretation,
        riskLevel: m.riskLevel,
        details: [
          { label: 'System', value: 'Clavien–Dindo (2004 revision)' },
          { label: 'Principle', value: 'Grade by most intensive therapy needed' },
        ],
        recommendations: [
          'Record the single highest grade when multiple complications coexist',
          'Specify organ system and exact intervention for IIIa/IIIb/IV',
          'Use for audit; pair with procedure-specific outcome measures',
        ],
      };
    },
    evidence: {
      summary:
        'Clavien–Dindo grades complications I–V by therapy intensity rather than anatomic description, improving inter-rater reliability for surgical audit.',
      formula: 'I → II → IIIa → IIIb → IVa → IVb → V (death)',
      validation:
        'Widely adopted across surgical specialties; 2004 revision is the standard reference framework.',
      references: [
        {
          title: 'Classification of surgical complications: a new proposal with evaluation in a cohort of 6336 patients and results of a survey',
          citation: 'Dindo D, Demartines N, Clavien PA. Ann Surg. 2004;240:205-213',
          year: 2004,
          pmid: '15273542',
          doi: '10.1097/01.sla.0000133083.54934.ae',
        },
      ],
    },
    nextSteps: [
      { condition: 'Grade I–II', actions: ['Supportive/pharmacologic care', 'Document in discharge summary'] },
      { condition: 'Grade III+', actions: ['Urgent procedural planning', 'Escalate senior review', 'Consider ICU for IV'] },
    ],
    pearls: [
      'Allowed grade I drugs: antiemetics, antipyretics, analgesics, diuretics, electrolytes.',
      'Blood transfusion and TPN count as grade II.',
      'If the patient dies, the grade is V regardless of prior interventions.',
    ],
  },

  {
    id: 'p-possum',
    name: 'P-POSSUM Mortality (Simplified Educational)',
    shortName: 'P-POSSUM',
    description:
      'Educational simplified P-POSSUM-style physiologic and operative burden with approximate logistic mortality — not a full 18-variable calculator.',
    category: 'surgery',
    tags: ['p-possum', 'possum', 'surgical risk', 'mortality', 'perioperative'],
    whenToUse:
      'Teaching / rough discussion of emergency or major elective surgical risk when full P-POSSUM software is unavailable.',
    whyUse:
      'P-POSSUM recalibrated POSSUM to reduce over-prediction of death in low-risk patients; this helper surfaces key domains only.',
    inputs: [
      selectInput('age', 'Age', [
        { label: '≤60 (1)', value: 1 },
        { label: '61–70 (2)', value: 2 },
        { label: '≥71 (4)', value: 4 },
      ]),
      selectInput('cardiac', 'Cardiac signs', [
        { label: 'No failure (1)', value: 1 },
        { label: 'Diuretic / digoxin / antianginal (2)', value: 2 },
        { label: 'Edema / warfarin (4)', value: 4 },
        { label: 'Raised JVP (8)', value: 8 },
      ]),
      selectInput('resp', 'Respiratory history', [
        { label: 'No dyspnea (1)', value: 1 },
        { label: 'Dyspnea on exertion / mild COPD (2)', value: 2 },
        { label: 'Limiting dyspnea / moderate COPD (4)', value: 4 },
        { label: 'Dyspnea at rest (8)', value: 8 },
      ]),
      selectInput('sbp', 'Systolic BP (mmHg)', [
        { label: '110–130 (1)', value: 1 },
        { label: '100–109 or 131–170 (2)', value: 2 },
        { label: '≥171 or 90–99 (4)', value: 4 },
        { label: '≤89 (8)', value: 8 },
      ]),
      selectInput('pulse', 'Pulse (bpm)', [
        { label: '50–80 (1)', value: 1 },
        { label: '40–49 or 81–100 (2)', value: 2 },
        { label: '101–120 (4)', value: 4 },
        { label: '≥121 or ≤39 (8)', value: 8 },
      ]),
      selectInput('gcs', 'GCS', [
        { label: '15 (1)', value: 1 },
        { label: '12–14 (2)', value: 2 },
        { label: '9–11 (4)', value: 4 },
        { label: '≤8 (8)', value: 8 },
      ]),
      selectInput('urea', 'Urea (mmol/L) band', [
        { label: '<7.5 (1)', value: 1 },
        { label: '7.5–10 (2)', value: 2 },
        { label: '10.1–15 (4)', value: 4 },
        { label: '>15 (8)', value: 8 },
      ]),
      selectInput('wbc', 'WBC (×10⁹/L)', [
        { label: '4–10 (1)', value: 1 },
        { label: '10.1–20 or 3.1–3.9 (2)', value: 2 },
        { label: '≥20.1 or ≤3 (4)', value: 4 },
      ]),
      selectInput('hb', 'Hemoglobin (g/dL)', [
        { label: '13–16 (1)', value: 1 },
        { label: '11.5–12.9 or 16.1–17 (2)', value: 2 },
        { label: '10–11.4 or 17.1–18 (4)', value: 4 },
        { label: '≤9.9 or ≥18.1 (8)', value: 8 },
      ]),
      selectInput('opMagnitude', 'Operation magnitude', [
        { label: 'Minor (1)', value: 1 },
        { label: 'Moderate (2)', value: 2 },
        { label: 'Major (4)', value: 4 },
        { label: 'Major+ (8)', value: 8 },
      ]),
      selectInput('procedures', 'Number of procedures', [
        { label: '1 (1)', value: 1 },
        { label: '2 (2)', value: 2 },
        { label: '>2 (4)', value: 4 },
      ]),
      selectInput('bloodLoss', 'Blood loss (mL)', [
        { label: '≤100 (1)', value: 1 },
        { label: '101–500 (2)', value: 2 },
        { label: '501–999 (4)', value: 4 },
        { label: '≥1000 (8)', value: 8 },
      ]),
      selectInput('peritoneal', 'Peritoneal soiling', [
        { label: 'None (1)', value: 1 },
        { label: 'Minor (serous) (2)', value: 2 },
        { label: 'Local pus (4)', value: 4 },
        { label: 'Free bowel content / pus / blood (8)', value: 8 },
      ]),
      selectInput('malignancy', 'Malignancy', [
        { label: 'None (1)', value: 1 },
        { label: 'Primary only (2)', value: 2 },
        { label: 'Nodal mets (4)', value: 4 },
        { label: 'Distant mets (8)', value: 8 },
      ]),
      selectInput('timing', 'Mode of surgery', [
        { label: 'Elective (1)', value: 1 },
        { label: 'Emergency resuscitation ≥2 h possible (4)', value: 4 },
        { label: 'Emergency immediate (<2 h) (8)', value: 8 },
      ]),
    ],
    calculate(values) {
      const phys =
        num(values.age) +
        num(values.cardiac) +
        num(values.resp) +
        num(values.sbp) +
        num(values.pulse) +
        num(values.gcs) +
        num(values.urea) +
        num(values.wbc) +
        num(values.hb);
      const op =
        num(values.opMagnitude) +
        num(values.procedures) +
        num(values.bloodLoss) +
        num(values.peritoneal) +
        num(values.malignancy) +
        num(values.timing);
      // Approximate P-POSSUM logit using published coefficients on partial scores (educational)
      const logit = -9.065 + 0.1692 * phys + 0.155 * op;
      const mort = round((1 / (1 + Math.exp(-logit))) * 100, 1);
      const r = riskFromThresholds(mort, [
        {
          max: 5,
          level: 'low',
          label: 'Lower approximate predicted mortality',
          interpretation: `Educational approx mortality ~${mort}% (phys ${phys}, op ${op}). Still optimize comorbidities; full institutional calculator preferred for consent.`,
        },
        {
          max: 15,
          level: 'moderate',
          label: 'Moderate approximate predicted mortality',
          interpretation: `Educational approx mortality ~${mort}%. Senior review, level-2/3 postop care planning, shared decision-making.`,
        },
        {
          max: 100,
          level: 'high',
          label: 'High approximate predicted mortality',
          interpretation: `Educational approx mortality ~${mort}%. High-risk pathway: ICU, consider less invasive options, frank goals discussion.`,
        },
      ]);
      return {
        score: mort,
        unit: '%',
        ...r,
        details: [
          { label: 'Physiologic score (partial)', value: String(phys) },
          { label: 'Operative score (partial)', value: String(op) },
          { label: 'Note', value: 'Missing full 12 phys + Na/K/ECG variables — approximate only' },
        ],
        recommendations: [
          'Do not quote as official P-POSSUM output',
          'Use NELA / ACS-NSQIP / full P-POSSUM tools when available',
          'Document discussion of risk vs benefit',
        ],
      };
    },
    evidence: {
      summary:
        'P-POSSUM uses logistic regression on physiologic and operative scores: ln[R/(1−R)] = −9.065 + 0.1692·PS + 0.1550·OS. This app uses a reduced variable set for education.',
      formula: 'R = 1/(1+e^(−(−9.065 + 0.1692·PS + 0.155·OS))) on partial scores',
      validation:
        'Full P-POSSUM is widely validated; this incomplete implementation is for teaching only and may mis-estimate risk.',
      references: [
        {
          title: 'An evaluation of the POSSUM surgical scoring system',
          citation: 'Whiteley MS et al. Br J Surg. 1996;83:812-815',
          year: 1996,
          pmid: '8696749',
          doi: '10.1002/bjs.1800830628',
        },
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
      { condition: 'Any major case', actions: ['Institutional risk tool for consent', 'Optimize physiology pre-op when time allows'] },
      { condition: 'High approximate risk', actions: ['ICU booked', 'Consultant-delivered care', 'Consider non-operative pathway'] },
    ],
    pearls: [
      'Original POSSUM over-predicted death at low risk; P-POSSUM recalibrated the equation.',
      'Missing labs (Na, K, ECG) mean this app under-specifies the true PS.',
    ],
  },

  {
    id: 'sort-score',
    name: 'SORT — Surgical Outcome Risk Tool (Simplified)',
    shortName: 'SORT',
    description:
      'Simplified SORT-style preoperative mortality risk using ASA, urgency, specialty high-risk flag, severity, cancer, and age.',
    category: 'surgery',
    tags: ['sort', 'surgical risk', 'mortality', 'asa', 'preoperative'],
    whenToUse:
      'Adults undergoing non-cardiac, non-neurologic surgery when a quick UK-style mortality estimate is useful (educational simplification).',
    whyUse:
      'SORT was derived from NCEPOD data for 30-day mortality with few routinely available variables.',
    inputs: [
      selectInput('asa', 'ASA physical status', [
        { label: 'ASA 1', value: 1 },
        { label: 'ASA 2', value: 2 },
        { label: 'ASA 3', value: 3 },
        { label: 'ASA 4', value: 4 },
        { label: 'ASA 5', value: 5 },
      ]),
      selectInput('urgency', 'Urgency', [
        { label: 'Elective', value: 'elective' },
        { label: 'Expedited', value: 'expedited' },
        { label: 'Urgent', value: 'urgent' },
        { label: 'Immediate', value: 'immediate' },
      ]),
      selectInput('severity', 'Surgical severity', [
        { label: 'Minor', value: 'minor' },
        { label: 'Intermediate', value: 'intermediate' },
        { label: 'Major / complex', value: 'major' },
      ]),
      yesNo('highRiskSpecialty', 'High-risk specialty (GI, thoracic, vascular)', 1),
      yesNo('cancer', 'Surgery for cancer', 1),
      numberInput('age', 'Age', { unit: 'years', min: 16, max: 110, step: 1, defaultValue: 65 }),
    ],
    calculate(values) {
      // Coefficients approximated from published SORT logistic model (Protopapa 2014) — educational
      const asa = num(values.asa, 2);
      const age = num(values.age, 65);
      const urgency = String(values.urgency ?? 'elective');
      const severity = String(values.severity ?? 'intermediate');
      let logit = -7.366;
      // ASA (ref ASA 1)
      const asaCoef: Record<number, number> = { 1: 0, 2: 0.905, 3: 1.989, 4: 3.048, 5: 3.048 };
      logit += asaCoef[asa] ?? 0.905;
      // Urgency (ref elective)
      const urgCoef: Record<string, number> = {
        elective: 0,
        expedited: 1.236,
        urgent: 1.658,
        immediate: 2.452,
      };
      logit += urgCoef[urgency] ?? 0;
      // Severity (ref minor)
      const sevCoef: Record<string, number> = { minor: 0, intermediate: 1.411, major: 2.262 };
      logit += sevCoef[severity] ?? 1.411;
      if (bool(values.highRiskSpecialty)) logit += 0.903;
      if (bool(values.cancer)) logit += 0.667;
      // Age continuous ~ per year above baseline effect; published uses age as continuous
      logit += 0.0365 * age;
      const mort = round((1 / (1 + Math.exp(-logit))) * 100, 2);
      const r = riskFromThresholds(mort, [
        {
          max: 1,
          level: 'low',
          label: 'Lower predicted 30-day mortality',
          interpretation: `Simplified SORT-style estimate ~${mort}% 30-day mortality. Routine perioperative pathway if otherwise well.`,
        },
        {
          max: 5,
          level: 'moderate',
          label: 'Moderate predicted mortality',
          interpretation: `Simplified estimate ~${mort}%. Consider enhanced monitoring, medical optimization, and shared decision-making.`,
        },
        {
          max: 100,
          level: 'high',
          label: 'Higher predicted mortality',
          interpretation: `Simplified estimate ~${mort}%. High-risk clinic / critical care outreach; reassess necessity and invasiveness of surgery.`,
        },
      ]);
      return {
        score: mort,
        unit: '%',
        ...r,
        details: [
          { label: 'ASA', value: String(asa) },
          { label: 'Urgency', value: urgency },
          { label: 'Severity', value: severity },
          { label: 'Note', value: 'Educational approximation of SORT coefficients' },
        ],
      };
    },
    evidence: {
      summary:
        'SORT predicts 30-day mortality from ASA, urgency, specialty, severity, cancer, and age using NCEPOD-derived logistic regression.',
      formula: 'Logistic model on 6 preoperative variables (app uses published coefficient approximations)',
      validation:
        'Validated in UK cohorts; always prefer the official SORT online calculator for clinical decisions.',
      references: [
        {
          title: 'Development and validation of the Surgical Outcome Risk Tool (SORT)',
          citation: 'Protopapa KL et al. Br J Surg. 2014;101:1774-1783',
          year: 2014,
          pmid: '25388883',
          doi: '10.1002/bjs.9638',
        },
      ],
    },
    nextSteps: [
      { condition: 'Estimate <1%', actions: ['Standard pathway', 'Document discussion'] },
      { condition: 'Estimate ≥5%', actions: ['Senior MDT review', 'Critical care planning', 'Optimize reversible risks'] },
    ],
    pearls: [
      'Excludes cardiac and neurosurgery in original derivation.',
      'Urgency definitions follow NCEPOD (immediate / urgent / expedited / elective).',
    ],
  },

  {
    id: 'nela-risk',
    name: 'NELA Emergency Laparotomy Risk (Simplified Educational)',
    shortName: 'NELA simp',
    description:
      'Educational helper summarizing key NELA-style risk domains for emergency laparotomy mortality — not the official NELA calculator.',
    category: 'surgery',
    tags: ['nela', 'emergency laparotomy', 'surgical risk', 'mortality'],
    whenToUse:
      'Adults considered for emergency laparotomy when discussing magnitude of risk (use official NELA tool for reported %).',
    whyUse:
      'NELA audit drivers (physiology, ASA, peritoneal soiling, malignancy, urgency) strongly associate with death after emergency laparotomy.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 16, max: 110, defaultValue: 70 }),
      selectInput('asa', 'ASA', [
        { label: 'I–II', value: 1 },
        { label: 'III', value: 2 },
        { label: 'IV–V', value: 3 },
      ]),
      selectInput('pulse', 'Heart rate', [
        { label: '<100', value: 0 },
        { label: '100–120', value: 1 },
        { label: '>120', value: 2 },
      ]),
      selectInput('sbp', 'Systolic BP', [
        { label: '≥100 mmHg', value: 0 },
        { label: '90–99', value: 1 },
        { label: '<90', value: 2 },
      ]),
      selectInput('gcs', 'GCS', [
        { label: '15', value: 0 },
        { label: '12–14', value: 1 },
        { label: '<12', value: 2 },
      ]),
      selectInput('urea', 'Urea', [
        { label: '<10 mmol/L', value: 0 },
        { label: '10–20', value: 1 },
        { label: '>20', value: 2 },
      ]),
      selectInput('wbc', 'WBC', [
        { label: '4–12 ×10⁹/L', value: 0 },
        { label: 'Abnormal mild', value: 1 },
        { label: 'Markedly abnormal (<2 or >20)', value: 2 },
      ]),
      selectInput('soiling', 'Peritoneal soiling', [
        { label: 'None / serous', value: 0 },
        { label: 'Local pus', value: 1 },
        { label: 'Free bowel content / pus / blood', value: 2 },
      ]),
      yesNo('malignancy', 'Malignancy present', 1),
      yesNo('immediate', 'Immediate surgery (<2 h)', 1),
      yesNo('lactateHigh', 'Lactate ≥2 mmol/L (if known)', 1),
    ],
    calculate(values) {
      let score =
        num(values.asa) +
        num(values.pulse) +
        num(values.sbp) +
        num(values.gcs) +
        num(values.urea) +
        num(values.wbc) +
        num(values.soiling);
      if (bool(values.malignancy)) score += 1;
      if (bool(values.immediate)) score += 1;
      if (bool(values.lactateHigh)) score += 1;
      const age = num(values.age, 70);
      if (age >= 80) score += 2;
      else if (age >= 70) score += 1;

      const r = riskFromThresholds(score, [
        {
          max: 4,
          level: 'low',
          label: 'Lower simplified NELA-style burden',
          interpretation: `Educational domain score ${score}. Lower apparent burden — still run official NELA calculator; ensure consultant delivery and sepsis care bundle.`,
        },
        {
          max: 9,
          level: 'moderate',
          label: 'Moderate simplified burden',
          interpretation: `Educational score ${score}. Intermediate risk — early antibiotics, source control timing, planned critical care.`,
        },
        {
          max: 30,
          level: 'high',
          label: 'High simplified burden',
          interpretation: `Educational score ${score}. High-risk emergency laparotomy profile — ICU, senior surgeons/anesthesia, consider ceiling of care.`,
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'Age', value: `${age} years` },
          { label: 'Official tool', value: 'Use data.nela.org.uk risk calculator for %' },
        ],
      };
    },
    evidence: {
      summary:
        'NELA (National Emergency Laparotomy Audit) risk models incorporate age, ASA, physiology, and operative findings to predict death after emergency bowel surgery.',
      formula: 'Educational weighted domain tally (not official NELA equation)',
      validation:
        'Official NELA models are validated on UK audit data; this simplification is for bedside teaching only.',
      references: [
        {
          title: 'National Emergency Laparotomy Audit (NELA) — risk prediction resources',
          citation: 'NELA Project Team / RCoA & RCS England',
          year: 2020,
          url: 'https://www.nela.org.uk/',
        },
        {
          title: 'Development and internal validation of a novel risk adjustment model for adult patients undergoing emergency laparotomy surgery: the National Emergency Laparotomy Audit risk model',
          citation: 'Eugene N et al. Br J Anaesth. 2018;121:739-748',
          year: 2018,
          pmid: '30236236',
          doi: '10.1016/j.bja.2018.06.026',
        },
      ],
    },
    nextSteps: [
      { condition: 'All candidates', actions: ['Official NELA risk % for consent', 'Sepsis Six if infected', 'Consultant surgeon + anesthetist'] },
      { condition: 'High burden', actions: ['Level 3 care planned', 'Goals of care', 'Minimize delay to source control'] },
    ],
    pearls: [
      'NELA standards emphasize consultant presence and postoperative critical care for high-risk cases.',
      'Do not report this score as a mortality percentage.',
    ],
  },

  {
    id: 'gupta-mica',
    name: 'Gupta MICA Perioperative Risk (Simplified)',
    shortName: 'Gupta MICA',
    description:
      'Simplified Gupta myocardial infarction or cardiac arrest (MICA) perioperative risk using key NSQIP-derived predictors.',
    category: 'cardiology',
    tags: ['gupta', 'mica', 'perioperative', 'mi', 'cardiac risk', 'nsqip'],
    whenToUse:
      'Preoperative cardiac risk stratification for noncardiac surgery (educational simplification of Gupta MICA).',
    whyUse:
      'Gupta MICA predicts inpatient MI or cardiac arrest from routinely available variables and often outperforms RCRI for discrimination.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 18, max: 100, defaultValue: 65 }),
      selectInput('functional', 'Functional status', [
        { label: 'Independent', value: 0 },
        { label: 'Partially dependent', value: 1 },
        { label: 'Totally dependent', value: 2 },
      ]),
      selectInput('asa', 'ASA class', [
        { label: 'ASA I', value: 1 },
        { label: 'ASA II', value: 2 },
        { label: 'ASA III', value: 3 },
        { label: 'ASA IV', value: 4 },
        { label: 'ASA V', value: 5 },
      ]),
      selectInput('creatinine', 'Creatinine', [
        { label: 'Normal (≤1.5 mg/dL)', value: 0 },
        { label: 'Elevated (>1.5 mg/dL)', value: 1 },
      ]),
      selectInput('procedure', 'Procedure type risk group', [
        { label: 'Low (e.g., breast, endocrine, minor)', value: 0 },
        { label: 'Intermediate (e.g., ortho, spine, gyn)', value: 1 },
        { label: 'High (e.g., aortic, thoracic, major vascular)', value: 2 },
        { label: 'Intraperitoneal / major abdominal', value: 2 },
      ]),
    ],
    calculate(values) {
      // Educational logistic approximation inspired by Gupta 2011 predictors
      const age = num(values.age, 65);
      let logit = -5.25 + 0.02 * age;
      logit += num(values.functional) * 0.65;
      const asa = num(values.asa, 2);
      logit += (asa - 1) * 0.75;
      if (num(values.creatinine) === 1) logit += 0.61;
      logit += num(values.procedure) * 0.7;
      const risk = round((1 / (1 + Math.exp(-logit))) * 100, 2);
      const r = riskFromThresholds(risk, [
        {
          max: 0.5,
          level: 'low',
          label: 'Lower MICA risk',
          interpretation: `Simplified estimated inpatient MI/arrest risk ~${risk}%. Generally low cardiac event risk — routine care unless other concerns.`,
        },
        {
          max: 1.5,
          level: 'moderate',
          label: 'Intermediate MICA risk',
          interpretation: `Simplified estimate ~${risk}%. Consider guideline-directed testing only if it would change management; optimize meds (β-blocker continuation, statin).`,
        },
        {
          max: 100,
          level: 'high',
          label: 'Higher MICA risk',
          interpretation: `Simplified estimate ~${risk}%. Elevated predicted MI/arrest — cardiology input if results change plan; ICU telemetry; delay elective surgery if unstable syndromes.`,
        },
      ]);
      return {
        score: risk,
        unit: '%',
        ...r,
        details: [
          { label: 'Model', value: 'Educational approximation — use ACS-NSQIP MICA for precise %' },
          { label: 'Endpoint', value: 'Inpatient MI or cardiac arrest' },
        ],
      };
    },
    evidence: {
      summary:
        'Gupta et al. derived a NSQIP-based model for perioperative MI or cardiac arrest using age, functional status, ASA, creatinine, and procedure type.',
      formula: 'Logistic MICA model (app uses simplified coefficients for education)',
      validation:
        'Original model C-statistic ~0.88 in derivation; always prefer online ACS surgical risk calculator for clinical use.',
      references: [
        {
          title: 'Development and validation of a risk calculator for prediction of cardiac risk after surgery',
          citation: 'Gupta PK et al. Circulation. 2011;124:381-387',
          year: 2011,
          pmid: '21730309',
          doi: '10.1161/CIRCULATIONAHA.110.015701',
        },
      ],
    },
    nextSteps: [
      { condition: 'Low risk', actions: ['Proceed if otherwise indicated', 'Continue indicated cardioprotective meds'] },
      { condition: 'Higher risk', actions: ['Review active cardiac conditions', 'Anesthesia planning', 'Postop monitoring intensity'] },
    ],
    pearls: [
      'MICA endpoint differs from RCRI (which includes pulmonary edema, complete heart block, VF).',
      'Procedure category is a major driver of risk.',
    ],
  },

  {
    id: 'ariscat',
    name: 'ARISCAT Postoperative Pulmonary Risk',
    shortName: 'ARISCAT',
    description:
      'Predicts risk of postoperative pulmonary complications using seven preoperative/intraoperative factors.',
    category: 'pulmonary',
    tags: ['ariscat', 'pulmonary', 'postoperative', 'ppc', 'respiratory'],
    whenToUse:
      'Adults undergoing non-obstetric surgery when estimating risk of postoperative pulmonary complications.',
    whyUse:
      'Simple point score stratifies low / intermediate / high PPC risk to guide prehabilitation and monitoring.',
    inputs: [
      selectInput('age', 'Age', [
        { label: '≤50 (0)', value: 0 },
        { label: '51–80 (3)', value: 3 },
        { label: '>80 (16)', value: 16 },
      ]),
      selectInput('spo2', 'Preoperative SpO₂', [
        { label: '≥96% (0)', value: 0 },
        { label: '91–95% (8)', value: 8 },
        { label: '≤90% (24)', value: 24 },
      ]),
      yesNo('respInfection', 'Respiratory infection in the last month', 17),
      yesNo('anemia', 'Preoperative anemia (Hb ≤10 g/dL)', 11),
      selectInput('incision', 'Surgical incision', [
        { label: 'Peripheral (0)', value: 0 },
        { label: 'Upper abdominal (15)', value: 15 },
        { label: 'Intrathoracic (24)', value: 24 },
      ]),
      selectInput('duration', 'Duration of surgery', [
        { label: '<2 h (0)', value: 0 },
        { label: '2–3 h (16)', value: 16 },
        { label: '>3 h (23)', value: 23 },
      ]),
      yesNo('emergency', 'Emergency procedure', 8),
    ],
    calculate(values) {
      const score =
        num(values.age) +
        num(values.spo2) +
        (bool(values.respInfection) ? 17 : 0) +
        (bool(values.anemia) ? 11 : 0) +
        num(values.incision) +
        num(values.duration) +
        (bool(values.emergency) ? 8 : 0);
      const r = riskFromThresholds(score, [
        {
          max: 25,
          level: 'low',
          label: 'Low PPC risk (~1.6%)',
          interpretation: `ARISCAT ${score}: low risk of postoperative pulmonary complications in derivation (~1.6%). Routine respiratory care and early mobilization.`,
        },
        {
          max: 44,
          level: 'moderate',
          label: 'Intermediate PPC risk (~13%)',
          interpretation: `ARISCAT ${score}: intermediate risk (~13.3%). Incentive spirometry, physiotherapy, consider regional anesthesia strategies, avoid residual paralysis.`,
        },
        {
          max: 200,
          level: 'high',
          label: 'High PPC risk (~42%)',
          interpretation: `ARISCAT ${score}: high risk (~42.1%). Optimize infection/anemia if time, lung-protective ventilation, HDU/ICU consideration, aggressive postop pulmonary toilet.`,
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'Low', value: '<26 points' },
          { label: 'Intermediate', value: '26–44' },
          { label: 'High', value: '≥45' },
        ],
      };
    },
    evidence: {
      summary:
        'ARISCAT (Canet et al.): age, SpO₂, recent respiratory infection, anemia ≤10 g/dL, incision site, surgery duration, emergency — predicts PPC (respiratory failure, infection, effusion, atelectasis, pneumothorax, bronchospasm, aspiration).',
      formula: 'Sum points; low <26, intermediate 26–44, high ≥45',
      validation: 'Derived/validated in European multicenter cohort (PERISCOPE-related work); widely used clinically.',
      references: [
        {
          title: 'Prediction of postoperative pulmonary complications in a population-based surgical cohort',
          citation: 'Canet J et al. Anesthesiology. 2010;113:1338-1350',
          year: 2010,
          pmid: '21045639',
          doi: '10.1097/ALN.0b013e3181fc6e0a',
        },
      ],
    },
    nextSteps: [
      { condition: 'Low', actions: ['Standard ERAS pulmonary care'] },
      {
        condition: 'Intermediate–high',
        actions: [
          'Preop optimization of infection/COPD/anemia when feasible',
          'Lung-protective ventilation',
          'Early physio / CPAP if indicated',
        ],
      },
    ],
    pearls: [
      'PPC definition is composite — not only reintubation.',
      'Upper abdominal and thoracic incisions carry large point weights.',
    ],
  },

  {
    id: 'rogers-score',
    name: 'Rogers Postoperative VTE Risk Score',
    shortName: 'Rogers VTE',
    description:
      'Simplified Rogers score for venous thromboembolism risk after general / vascular / thoracic surgery.',
    category: 'hematology',
    tags: ['rogers', 'vte', 'dvt', 'pe', 'postoperative', 'prophylaxis'],
    whenToUse:
      'Estimating postop VTE risk after major general, vascular, or thoracic surgery (educational simplified item set).',
    whyUse:
      'Rogers model was developed from Patient Safety in Surgery Study / NSQIP data for 30-day VTE.',
    inputs: [
      selectInput('opType', 'Operation type risk', [
        { label: 'Lower risk general (e.g., hernia) (0)', value: 0 },
        { label: 'Respiratory / hemic (2–3 approx) (3)', value: 3 },
        { label: 'Thoracoabdominal aneurysm / major vascular (4)', value: 4 },
        { label: 'Mouth/palate or endocrine higher band (2)', value: 2 },
      ]),
      selectInput('asaWork', 'ASA class', [
        { label: 'ASA 1 (0)', value: 0 },
        { label: 'ASA 2 (1)', value: 1 },
        { label: 'ASA 3 (2)', value: 2 },
        { label: 'ASA 4–5 (3)', value: 3 },
      ]),
      yesNo('female', 'Female sex', 1),
      selectInput('workRvu', 'Work RVU band (complexity)', [
        { label: '<10 (0)', value: 0 },
        { label: '10–17 (1)', value: 1 },
        { label: '>17 (2)', value: 2 },
      ]),
      yesNo('disseminatedCancer', 'Disseminated cancer', 2),
      yesNo('chemo', 'Chemotherapy for malignancy within 30 days', 2),
      yesNo('preopSepsis', 'Preoperative sepsis / SIRS / septic shock', 2),
      yesNo('preopDyspnea', 'Dyspnea (moderate or at rest)', 1),
      yesNo('ventilator', 'Ventilator dependent preop', 2),
      yesNo('maleGenital', 'Male genital system procedure', 2),
      selectInput('albumin', 'Albumin', [
        { label: '≥3.5 g/dL (0)', value: 0 },
        { label: '<3.5 g/dL (1)', value: 1 },
      ]),
      selectInput('bilirubin', 'Bilirubin', [
        { label: '≤1.0 mg/dL (0)', value: 0 },
        { label: '>1.0 mg/dL (1)', value: 1 },
      ]),
      selectInput('sodium', 'Sodium', [
        { label: '>135 mEq/L (0)', value: 0 },
        { label: '≤135 mEq/L (1)', value: 1 },
      ]),
      selectInput('hct', 'Hematocrit', [
        { label: '>38% (0)', value: 0 },
        { label: '≤38% (1)', value: 1 },
      ]),
    ],
    calculate(values) {
      const score =
        num(values.opType) +
        num(values.asaWork) +
        (bool(values.female) ? 1 : 0) +
        num(values.workRvu) +
        (bool(values.disseminatedCancer) ? 2 : 0) +
        (bool(values.chemo) ? 2 : 0) +
        (bool(values.preopSepsis) ? 2 : 0) +
        (bool(values.preopDyspnea) ? 1 : 0) +
        (bool(values.ventilator) ? 2 : 0) +
        (bool(values.maleGenital) ? 2 : 0) +
        num(values.albumin) +
        num(values.bilirubin) +
        num(values.sodium) +
        num(values.hct);
      const r = riskFromThresholds(score, [
        {
          max: 6,
          level: 'low',
          label: 'Lower Rogers-style VTE risk',
          interpretation: `Simplified Rogers points ${score} (original low-risk band often ≤7 with ~0.1–0.5% VTE). Use institutional Caprini/Rogers protocol; early ambulation ± mechanical prophylaxis.`,
        },
        {
          max: 10,
          level: 'moderate',
          label: 'Moderate Rogers-style VTE risk',
          interpretation: `Points ${score}: intermediate band in original work (~1% VTE range). Pharmacologic prophylaxis usually indicated if bleeding risk acceptable.`,
        },
        {
          max: 50,
          level: 'high',
          label: 'Higher Rogers-style VTE risk',
          interpretation: `Points ${score}: higher risk band (original high often ≥11 with ~1.5%+ VTE). Dual prophylaxis and extended duration per specialty guidelines.`,
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'Note', value: 'Simplified subset of full Rogers variables' },
          { label: 'Typical bands', value: 'Low ≤7; medium 8–10; high ≥11 (full score)' },
        ],
      };
    },
    evidence: {
      summary:
        'Rogers et al. developed a VTE risk score after general/vascular/thoracic surgery using procedure type, ASA, labs, cancer, sepsis, and other NSQIP variables.',
      formula: 'Sum of weighted factors (this app uses a reduced educational item set)',
      validation:
        'Derived from >180,000 patients in PSS/NSQIP; prefer full score or Caprini per local policy.',
      references: [
        {
          title: 'Multivariable predictors of postoperative venous thromboembolic events after general and vascular surgery: results from the patient safety in surgery study',
          citation: 'Rogers SO Jr et al. J Am Coll Surg. 2007;204:1211-1221',
          year: 2007,
          pmid: '17544079',
          doi: '10.1016/j.jamcollsurg.2007.02.072',
        },
      ],
    },
    nextSteps: [
      { condition: 'Low', actions: ['Early ambulation', 'Mechanical prophylaxis as indicated'] },
      { condition: 'Moderate–high', actions: ['LMWH/UFH unless contraindicated', 'Mechanical + pharmacologic', 'Reassess bleed risk'] },
    ],
    pearls: [
      'Complementary to Caprini; different variable sets.',
      'Cancer, sepsis, and high-complexity procedures drive risk.',
    ],
  },

  {
    id: 'nnis-ssi',
    name: 'NNIS Surgical Site Infection Risk Index',
    shortName: 'NNIS SSI',
    description:
      'CDC NNIS risk index (0–3) for surgical site infection using ASA, wound class, and operative duration.',
    category: 'infectious-disease',
    tags: ['nnis', 'ssi', 'wound infection', 'surgery', 'infection control'],
    whenToUse:
      'Risk-stratifying SSI probability for surveillance comparisons or patient counseling after surgery.',
    whyUse:
      'Classic simple index used historically by NNIS/NHSN; still useful educationally alongside procedure-specific rates.',
    inputs: [
      selectInput('asa', 'ASA physical status', [
        { label: 'ASA 1–2 (0 points)', value: 0 },
        { label: 'ASA 3–5 (1 point)', value: 1 },
      ]),
      selectInput('wound', 'Wound classification', [
        { label: 'Clean or clean-contaminated (0)', value: 0 },
        { label: 'Contaminated or dirty/infected (1)', value: 1 },
      ]),
      yesNo('longDuration', 'Operative duration > T hours (procedure-specific cutoff)', 1,
        'T is the 75th percentile duration for that procedure in NNIS tables (often ~2–3 h)'),
    ],
    calculate(values) {
      const score = num(values.asa) + num(values.wound) + (bool(values.longDuration) ? 1 : 0);
      const approx: Record<number, string> = {
        0: '~1–2%',
        1: '~3–4%',
        2: '~6–8%',
        3: '~10–15%+',
      };
      const r = riskFromThresholds(score, [
        {
          max: 0,
          level: 'low',
          label: 'NNIS 0 — lowest SSI band',
          interpretation: `Risk index 0. Historical SSI rates often around ${approx[0]} overall (varies widely by procedure). Standard antibiotic prophylaxis timing and skin prep.`,
        },
        {
          max: 1,
          level: 'moderate',
          label: 'NNIS 1',
          interpretation: `Risk index 1. Intermediate SSI risk (often ~${approx[1]} aggregate). Optimize glucose, normothermia, and timely prophylaxis.`,
        },
        {
          max: 2,
          level: 'high',
          label: 'NNIS 2',
          interpretation: `Risk index 2. Higher SSI risk (often ~${approx[2]}). Reinforce bundle compliance; consider extended precautions per specialty.`,
        },
        {
          max: 3,
          level: 'high',
          label: 'NNIS 3 — highest band',
          interpretation: `Risk index 3. Highest classic NNIS band (often ~${approx[3]}). Dirty wounds need source control; culture-directed therapy if infected.`,
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'Components', value: 'ASA≥3 + contaminated/dirty + duration > T' },
          { label: 'Range', value: '0–3' },
        ],
      };
    },
    evidence: {
      summary:
        'NNIS risk index assigns 1 point each for ASA ≥3, contaminated or dirty wound, and operative time > procedure-specific T (75th percentile).',
      formula: 'Points 0–3 = sum of three binary risk factors',
      validation:
        'Long used by CDC NNIS; modern NHSN uses more procedure-specific models — interpret rates in local context.',
      references: [
        {
          title: 'National Nosocomial Infections Surveillance (NNIS) System Report',
          citation: 'CDC NNIS. Am J Infect Control (various years); Culver DH et al. Am J Med. 1991',
          year: 1991,
          pmid: '1928194',
          doi: '10.1016/0002-9343(91)90345-x',
        },
      ],
    },
    nextSteps: [
      { condition: 'Any surgery', actions: ['Antibiotic prophylaxis within 60 min of incision', 'Skin antisepsis', 'Glycemic and temperature control'] },
      { condition: 'Index 2–3', actions: ['Heightened wound surveillance', 'Patient education on SSI signs'] },
    ],
    pearls: [
      'T-time is procedure-specific — e.g., often 2 h for cholecystectomy historically.',
      'Laparoscopic approaches and modern bundles have lowered absolute rates since original NNIS reports.',
    ],
  },

  {
    id: 'wound-class',
    name: 'CDC Surgical Wound Classification',
    shortName: 'Wound class',
    description:
      'Classifies operative wounds as clean (I), clean-contaminated (II), contaminated (III), or dirty/infected (IV).',
    category: 'infectious-disease',
    tags: ['wound class', 'cdc', 'ssi', 'surgery', 'infection'],
    whenToUse:
      'Intraoperative documentation of wound contamination class for SSI risk and antibiotic decisions.',
    whyUse:
      'Standard CDC/NHSN categories underpin SSI surveillance and prophylaxis duration norms.',
    inputs: [
      selectInput('woundClass', 'Wound classification', [
        {
          label: 'I — Clean',
          value: 1,
          description: 'Uninfected; no inflammation; respiratory/GI/GU not entered',
        },
        {
          label: 'II — Clean-contaminated',
          value: 2,
          description: 'Respiratory, GI, genital, or urinary tract entered under controlled conditions',
        },
        {
          label: 'III — Contaminated',
          value: 3,
          description: 'Open fresh accidental wounds; major break in sterile technique; gross spillage from GI; acute nonpurulent inflammation',
        },
        {
          label: 'IV — Dirty / infected',
          value: 4,
          description: 'Old traumatic wounds with retained devitalized tissue; existing clinical infection or perforated viscera',
        },
      ]),
    ],
    calculate(values) {
      const c = num(values.woundClass, 1);
      const map: Record<
        number,
        { roman: string; label: string; interpretation: string; riskLevel: 'low' | 'moderate' | 'high' | 'critical' }
      > = {
        1: {
          roman: 'I',
          label: 'Clean (Class I)',
          interpretation:
            'Uninfected operative wound without inflammation; respiratory, alimentary, genital, or urinary tracts not entered. Typical SSI risk lowest. Prophylaxis often single preop dose for many procedures.',
          riskLevel: 'low',
        },
        2: {
          roman: 'II',
          label: 'Clean-contaminated (Class II)',
          interpretation:
            'Respiratory, alimentary, genital, or urinary tract entered under controlled conditions without unusual contamination. Routine prophylaxis indicated for most such cases.',
          riskLevel: 'moderate',
        },
        3: {
          roman: 'III',
          label: 'Contaminated (Class III)',
          interpretation:
            'Open fresh accidental wounds; operations with major sterile technique breaks or gross GI spillage; incisions through acute nonpurulent inflammation. Higher SSI risk — ensure appropriate antibiotics and irrigation.',
          riskLevel: 'high',
        },
        4: {
          roman: 'IV',
          label: 'Dirty / infected (Class IV)',
          interpretation:
            'Old traumatic wounds with devitalized tissue, or existing clinical infection, or perforated viscera. Organisms present before surgery — treat as therapeutic antibiotics + source control, not mere prophylaxis.',
          riskLevel: 'critical',
        },
      };
      const m = map[c] ?? map[1];
      return {
        score: m.roman,
        label: m.label,
        interpretation: m.interpretation,
        riskLevel: m.riskLevel,
        details: [{ label: 'System', value: 'CDC / NHSN surgical wound classification' }],
      };
    },
    evidence: {
      summary:
        'CDC surgical wound classes I–IV categorize expected contamination and correlate with SSI rates used in surveillance.',
      formula: 'I clean; II clean-contaminated; III contaminated; IV dirty/infected',
      validation: 'Foundational infection-control taxonomy; SSI rates vary by procedure within each class.',
      references: [
        {
          title: 'Guideline for prevention of surgical site infection, 1999',
          citation: 'Mangram AJ et al. Infect Control Hosp Epidemiol. 1999;20:250-278',
          year: 1999,
          pmid: '10219875',
          doi: '10.1086/501620',
        },
      ],
    },
    nextSteps: [
      { condition: 'Class I–II', actions: ['Timely prophylactic antibiotics', 'Stop prophylaxis within 24 h for most procedures'] },
      { condition: 'Class III–IV', actions: ['Therapeutic antibiotics as indicated', 'Source control', 'Wound management plan'] },
    ],
    pearls: [
      'Classification is assigned at end of operation based on what actually occurred (e.g., unexpected spillage upgrades class).',
      'Do not confuse with NNIS risk index (which uses class as one of three factors).',
    ],
  },

  {
    id: 'aap-score',
    name: 'Adult Appendicitis Score (AAS)',
    shortName: 'AAS',
    description:
      'Adult Appendicitis Score for probability of acute appendicitis using symptoms, signs, and labs.',
    category: 'emergency',
    tags: ['appendicitis', 'aas', 'adult appendicitis score', 'abdominal pain'],
    whenToUse:
      'Adults with suspected appendicitis to stratify low vs intermediate vs high probability.',
    whyUse:
      'AAS incorporates graded pain, guarding, and lab cut-points; useful for selective imaging pathways.',
    inputs: [
      selectInput('painMigration', 'Pain migration to RLQ', [
        { label: 'No (0)', value: 0 },
        { label: 'Yes (2)', value: 2 },
      ]),
      selectInput('rlqPain', 'RLQ pain / tenderness intensity', [
        { label: 'Mild (2)', value: 2 },
        { label: 'Moderate / severe (3)', value: 3 },
      ]),
      selectInput('guarding', 'Guarding / muscular defense', [
        { label: 'None (0)', value: 0 },
        { label: 'Mild (2)', value: 2 },
        { label: 'Moderate–severe (4)', value: 4 },
      ]),
      selectInput('wbcBand', 'WBC (×10⁹/L)', [
        { label: '<7.2 (0)', value: 0 },
        { label: '7.2–10.9 (1)', value: 1 },
        { label: '11.0–14.9 (2)', value: 2 },
        { label: '≥15.0 (3)', value: 3 },
      ]),
      selectInput('neutPct', 'Neutrophils %', [
        { label: '<62 (0)', value: 0 },
        { label: '62–74.9 (1)', value: 1 },
        { label: '75–83.9 (2)', value: 2 },
        { label: '≥84 (3)', value: 3 },
      ]),
      selectInput('crp', 'CRP (mg/L) by symptom duration', [
        { label: 'CRP low for duration (0)', value: 0 },
        { label: 'Intermediate CRP band (1–2)', value: 2 },
        { label: 'High CRP for duration (3–4)', value: 4 },
      ], 0, 'AAS uses duration-specific CRP cutoffs; pick closest band'),
      selectInput('sexAge', 'Sex / age adjustment', [
        { label: 'Male or age ≥40 (0 extra)', value: 0 },
        { label: 'Female age <40 (−3 if applying full AAS discount)', value: -3 },
      ], 0, 'Young women receive negative points in full AAS to reduce false positives'),
    ],
    calculate(values) {
      const score =
        num(values.painMigration) +
        num(values.rlqPain) +
        num(values.guarding) +
        num(values.wbcBand) +
        num(values.neutPct) +
        num(values.crp) +
        num(values.sexAge);
      const r = riskFromThresholds(score, [
        {
          max: 10,
          level: 'low',
          label: 'Low probability (AAS ≤10)',
          interpretation: `AAS ${score}: low probability of appendicitis in published pathways — observe, consider alternative diagnoses, selective imaging.`,
        },
        {
          max: 15,
          level: 'moderate',
          label: 'Intermediate probability (11–15)',
          interpretation: `AAS ${score}: intermediate — imaging (US/CT/MRI) recommended in most protocols before appendectomy.`,
        },
        {
          max: 40,
          level: 'high',
          label: 'High probability (≥16)',
          interpretation: `AAS ${score}: high probability — surgical consultation; imaging still common depending on resource setting and pregnancy status.`,
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'Typical cutoffs', value: '≤10 low; 11–15 intermediate; ≥16 high' },
          { label: 'Note', value: 'CRP bands simplified — verify duration-specific tables' },
        ],
      };
    },
    evidence: {
      summary:
        'Adult Appendicitis Score (Sammalkorpi et al.) combines migration, RLQ pain, guarding, WBC, neutrophils, CRP (duration-adjusted), with lower points for young women.',
      formula: 'Sum of clinical + laboratory points (approx range can be negative to ~20+)',
      validation:
        'Validated in Finnish cohorts; cutoffs ≤10 / 11–15 / ≥16 used in imaging triage studies.',
      references: [
        {
          title: 'A new adult appendicitis score improves diagnostic accuracy of acute appendicitis',
          citation: 'Sammalkorpi HE et al. BMC Gastroenterol. 2014;14:114',
          year: 2014,
          pmid: '24970111',
          doi: '10.1186/1471-230X-14-114',
        },
      ],
    },
    nextSteps: [
      { condition: 'Low', actions: ['Serial exam', 'Safety-net return precautions', 'Gyn workup if applicable'] },
      { condition: 'Intermediate–high', actions: ['Imaging per local pathway', 'NPO / IV fluids', 'Surgery consult'] },
    ],
    pearls: [
      'CRP interpretation depends on hours of symptoms — very early CRP may still be low.',
      'Not a substitute for clinical judgment in pregnancy or extremes of age.',
    ],
  },

  {
    id: 'lintula-score',
    name: 'Lintula Appendicitis Score',
    shortName: 'Lintula',
    description:
      'Clinical score for acute appendicitis (originally pediatric; also studied in adults) based on history and exam without labs.',
    category: 'emergency',
    tags: ['appendicitis', 'lintula', 'pediatric', 'abdominal pain'],
    whenToUse:
      'Suspected appendicitis when a rapid clinical (lab-free) score is desired, especially in children.',
    whyUse:
      'No laboratory values required; useful for prehospital or early triage stratification.',
    inputs: [
      selectInput('sex', 'Sex', [
        { label: 'Female (0)', value: 0 },
        { label: 'Male (2)', value: 2 },
      ]),
      selectInput('intensity', 'Intensity of pain', [
        { label: 'Mild (0)', value: 0 },
        { label: 'Moderate / severe (2)', value: 2 },
      ]),
      yesNo('relocation', 'Relocation of pain', 4),
      yesNo('vomiting', 'Vomiting', 2),
      yesNo('fever', 'Fever (temperature ≥37.5°C / 99.5°F)', 3),
      yesNo('guarding', 'Guarding', 4),
      yesNo('rebound', 'Rebound tenderness', 7),
      selectInput('bowelSounds', 'Bowel sounds', [
        { label: 'Normal (0)', value: 0 },
        { label: 'Absent / tinkling / high-pitched (2)', value: 2 },
      ]),
    ],
    calculate(values) {
      const score =
        num(values.sex) +
        num(values.intensity) +
        (bool(values.relocation) ? 4 : 0) +
        (bool(values.vomiting) ? 2 : 0) +
        (bool(values.fever) ? 3 : 0) +
        (bool(values.guarding) ? 4 : 0) +
        (bool(values.rebound) ? 7 : 0) +
        num(values.bowelSounds);
      const r = riskFromThresholds(score, [
        {
          max: 15,
          level: 'low',
          label: 'Low probability (≤15)',
          interpretation: `Lintula ${score}: low likelihood of appendicitis in original pediatric cutoffs — observe, consider other diagnoses, selective imaging.`,
        },
        {
          max: 20,
          level: 'moderate',
          label: 'Indeterminate (16–20)',
          interpretation: `Lintula ${score}: intermediate — further observation and/or imaging advised.`,
        },
        {
          max: 50,
          level: 'high',
          label: 'High probability (≥21)',
          interpretation: `Lintula ${score}: high probability of appendicitis — surgical evaluation; imaging per practice setting.`,
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'Max theoretical', value: '32' },
          { label: 'Common cutoffs', value: '≤15 low; ≥21 high' },
        ],
      };
    },
    evidence: {
      summary:
        'Lintula score (0–32): male sex, pain intensity, relocation, vomiting, fever ≥37.5°C, guarding, rebound, abnormal bowel sounds — no labs.',
      formula: 'Sum of weighted clinical items',
      validation:
        'Derived in children; subsequent adult evaluations show variable performance — combine with labs/imaging as needed.',
      references: [
        {
          title: 'Diagnostic score in appendicitis: validation of a diagnostic score (Lintula) for children',
          citation: 'Lintula H et al. Langenbecks Arch Surg. 2005 / related Lintula score publications',
          year: 2005,
          pmid: '15723233',
          doi: '10.1007/s00423-005-0545-8',
        },
      ],
    },
    nextSteps: [
      { condition: 'Low', actions: ['Oral challenge', 'Reassessment', 'Safety net'] },
      { condition: 'High', actions: ['Surgery consult', 'Imaging if diagnosis uncertain', 'NPO'] },
    ],
    pearls: [
      'Rebound carries the largest weight (+7).',
      'Lab-free design is both a strength (speed) and weakness (misses CRP/WBC signal).',
    ],
  },

  {
    id: 'tzanakis',
    name: 'Tzanakis Appendicitis Score',
    shortName: 'Tzanakis',
    description:
      'Four-item appendicitis score combining exam, WBC, and ultrasound (0–15).',
    category: 'emergency',
    tags: ['appendicitis', 'tzanakis', 'ultrasound', 'abdominal pain'],
    whenToUse:
      'Suspected acute appendicitis when ultrasound is available to include in the score.',
    whyUse:
      'Simple and ultrasound-inclusive; score ≥8 often used as high probability threshold.',
    inputs: [
      yesNo('rlqTenderness', 'RLQ tenderness (4 points)', 4),
      yesNo('rebound', 'Rebound tenderness (3 points)', 3),
      yesNo('wbc', 'WBC >12 ×10⁹/L (2 points)', 2),
      yesNo('usPositive', 'Ultrasound positive for appendicitis (6 points)', 6),
    ],
    calculate(values) {
      const score =
        (bool(values.rlqTenderness) ? 4 : 0) +
        (bool(values.rebound) ? 3 : 0) +
        (bool(values.wbc) ? 2 : 0) +
        (bool(values.usPositive) ? 6 : 0);
      const r = riskFromThresholds(score, [
        {
          max: 7,
          level: 'low',
          label: 'Lower probability (<8)',
          interpretation: `Tzanakis ${score}/15: below common surgical threshold of 8 — consider observation or CT if suspicion persists (US may be false-negative).`,
        },
        {
          max: 15,
          level: 'high',
          label: 'High probability (≥8)',
          interpretation: `Tzanakis ${score}/15: high probability of appendicitis — surgical consultation; many protocols proceed toward appendectomy ± confirmatory CT based on setting.`,
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'Items', value: 'RLQ +4, rebound +3, WBC>12 +2, US+ +6' },
          { label: 'Cutoff', value: '≥8 suggests appendicitis' },
        ],
      };
    },
    evidence: {
      summary:
        'Tzanakis scoring system: RLQ tenderness (4), rebound (3), WBC >12,000 (2), positive US (6); total 0–15; ≥8 predicts appendicitis.',
      formula: 'Sum 0–15; positive if ≥8',
      validation:
        'Original Greek cohort reported high accuracy; performance depends heavily on US quality and operator.',
      references: [
        {
          title: 'A new approach to accurate diagnosis of acute appendicitis',
          citation: 'Tzanakis NE et al. World J Surg. 2005;29:1151-1156',
          year: 2005,
          pmid: '16088420',
          doi: '10.1007/s00268-005-7853-6',
        },
      ],
    },
    nextSteps: [
      { condition: '<8', actions: ['Serial exams', 'CT if ongoing concern', 'Gyn/GU differential'] },
      { condition: '≥8', actions: ['Surgical consult', 'Perioperative preparation'] },
    ],
    pearls: [
      'Ultrasound contributes 6 of 15 points — negative US does not exclude appendicitis.',
      'Less studied than Alvarado/AIR in multiethnic populations.',
    ],
  },

  {
    id: 'wses',
    name: 'WSES Sepsis Severity Score (Surgical)',
    shortName: 'WSES',
    description:
      'World Society of Emergency Surgery sepsis severity score for patients with complicated intra-abdominal infections.',
    category: 'critical-care',
    tags: ['wses', 'sepsis', 'intra-abdominal', 'peritonitis', 'surgery'],
    whenToUse:
      'Complicated intra-abdominal infection / peritonitis when estimating severity and mortality risk.',
    whyUse:
      'Integrates clinical condition, setting of acquisition, organ failures, and delays to source control.',
    inputs: [
      selectInput('condition', 'Clinical condition at admission', [
        { label: 'Severe sepsis (3) — sepsis-related organ dysfunction / hypo perfusion', value: 3 },
        { label: 'Septic shock (5) — sepsis with hypotension refractory to fluids', value: 5 },
        { label: 'Neither severe sepsis nor shock (0)', value: 0 },
      ]),
      yesNo('healthcare', 'Healthcare-associated infection', 2),
      yesNo('delay', 'Delay in source control >24 h (if peritonitis)', 3),
      yesNo('age70', 'Age ≥70 years', 2),
      yesNo('cancer', 'Malignancy', 3),
      yesNo('immunosuppression', 'Immunosuppression', 3),
      yesNo('acuteRenal', 'Acute renal failure', 3),
      yesNo('ards', 'Acute respiratory failure / ARDS', 3),
      yesNo('cardiovasc', 'Cardiovascular failure', 3),
      yesNo('hepatic', 'Hepatic failure', 3),
      yesNo('neuro', 'Neurologic failure / coma', 3),
      yesNo('coag', 'Coagulopathy', 3),
    ],
    calculate(values) {
      let score = num(values.condition);
      if (bool(values.healthcare)) score += 2;
      if (bool(values.delay)) score += 3;
      if (bool(values.age70)) score += 2;
      if (bool(values.cancer)) score += 3;
      if (bool(values.immunosuppression)) score += 3;
      if (bool(values.acuteRenal)) score += 3;
      if (bool(values.ards)) score += 3;
      if (bool(values.cardiovasc)) score += 3;
      if (bool(values.hepatic)) score += 3;
      if (bool(values.neuro)) score += 3;
      if (bool(values.coag)) score += 3;

      const r = riskFromThresholds(score, [
        {
          max: 3,
          level: 'low',
          label: 'Lower WSES severity',
          interpretation: `WSES-style points ${score}. Lower mortality band in original data — still ensure timely antibiotics and source control.`,
        },
        {
          max: 6,
          level: 'moderate',
          label: 'Moderate severity',
          interpretation: `Score ${score}: intermediate severity — aggressive resuscitation, early OR/IR source control, ICU consideration.`,
        },
        {
          max: 50,
          level: 'high',
          label: 'High / very high severity',
          interpretation: `Score ${score}: high severity complicated IAI — mortality rises steeply with points (original high scores >>30% mortality). Immediate source control and organ support.`,
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'Focus', value: 'Complicated intra-abdominal infection' },
          { label: 'Note', value: 'Simplified item wording — confirm full WSES table for research' },
        ],
      };
    },
    evidence: {
      summary:
        'WSES Sepsis Severity Score for complicated intra-abdominal infections weights severe sepsis/shock, healthcare association, delay >24 h, age, cancer, immunosuppression, and organ failures.',
      formula: 'Sum of weighted clinical factors (0 to high 20+)',
      validation:
        'Derived from WISS study / WSES multicenter data; higher scores associate with increased mortality.',
      references: [
        {
          title: 'Physiological parameters for Prognosis in Abdominal Sepsis (WISS) study / WSES sepsis severity score',
          citation: 'Sartelli M et al. World J Emerg Surg. 2015;10:22',
          year: 2015,
          pmid: '26015853',
          doi: '10.4240/wjgs.v7.i5.78',
        },
      ],
    },
    nextSteps: [
      { condition: 'Any complicated IAI', actions: ['Broad-spectrum abx', 'Source control timing', 'Cultures'] },
      { condition: 'High score', actions: ['ICU', 'Damage-control laparotomy if unstable', 'MDR coverage if risk factors'] },
    ],
    pearls: [
      'Source control delay >24 h is heavily weighted.',
      'Complements Mannheim Peritonitis Index and SOFA — different purposes.',
    ],
  },

  {
    id: 'hinchey',
    name: 'Hinchey Classification (Diverticulitis)',
    shortName: 'Hinchey',
    description:
      'Classic intraoperative/pathologic stages of perforated diverticular disease (I–IV).',
    category: 'gastroenterology',
    tags: ['hinchey', 'diverticulitis', 'perforation', 'colorectal', 'surgery'],
    whenToUse:
      'Staging acute diverticulitis with perforation/abscess for operative planning and communication.',
    whyUse:
      'Universally understood stages linking extent of peritoneal contamination to management.',
    inputs: [
      selectInput('stage', 'Hinchey stage', [
        { label: 'I — Pericolic abscess or phlegmon', value: 1 },
        { label: 'II — Pelvic, intra-abdominal, or retroperitoneal abscess', value: 2 },
        { label: 'III — Generalized purulent peritonitis', value: 3 },
        { label: 'IV — Generalized fecal peritonitis', value: 4 },
      ]),
    ],
    calculate(values) {
      const s = num(values.stage, 1);
      const map: Record<
        number,
        { label: string; interpretation: string; riskLevel: 'moderate' | 'high' | 'critical' }
      > = {
        1: {
          label: 'Hinchey I',
          interpretation:
            'Pericolic abscess or phlegmon. Often managed with antibiotics ± percutaneous drainage if larger abscess; surgery if fails medical therapy.',
          riskLevel: 'moderate',
        },
        2: {
          label: 'Hinchey II',
          interpretation:
            'Distant abscess (pelvic/retroperitoneal/abdominal). Antibiotics + IR drainage when feasible; operative intervention if inaccessible or clinical failure.',
          riskLevel: 'high',
        },
        3: {
          label: 'Hinchey III',
          interpretation:
            'Generalized purulent peritonitis. Typically urgent laparoscopy/laparotomy with lavage ± resection (Hartmann vs anastomosis individualized).',
          riskLevel: 'critical',
        },
        4: {
          label: 'Hinchey IV',
          interpretation:
            'Generalized fecal peritonitis. Emergency resection with diversion usually required; high morbidity/mortality — ICU care.',
          riskLevel: 'critical',
        },
      };
      const m = map[s] ?? map[1];
      return {
        score: s,
        label: m.label,
        interpretation: m.interpretation,
        riskLevel: m.riskLevel,
        details: [{ label: 'System', value: 'Original Hinchey (1978)' }],
        recommendations: [
          'CT often used preoperatively with modified Hinchey / WSES imaging stages',
          'Resuscitate and give antibiotics early for III–IV',
        ],
      };
    },
    evidence: {
      summary:
        'Hinchey classified perforated diverticulitis into pericolic abscess (I), distant abscess (II), purulent peritonitis (III), and fecal peritonitis (IV).',
      formula: 'Stage I–IV by extent of contamination',
      validation: 'Surgical classic; CT-based modified systems refine preoperative staging.',
      references: [
        {
          title: 'Treatment of perforated diverticular disease of the colon',
          citation: 'Hinchey EJ et al. Adv Surg. 1978;12:85-109',
          year: 1978,
          pmid: '735943',
        },
      ],
    },
    nextSteps: [
      { condition: 'I–II', actions: ['IV abx', 'IR drain if indicated', 'Elective resection discussion later'] },
      { condition: 'III–IV', actions: ['Emergency surgery', 'ICU', 'Source control + diversion as needed'] },
    ],
    pearls: [
      'Original Hinchey is operative; CT “Hinchey” is an approximation.',
      'See modified Hinchey for 0 / Ia / Ib granularity.',
    ],
  },

  {
    id: 'modified-hinchey',
    name: 'Modified Hinchey Classification',
    shortName: 'Mod Hinchey',
    description:
      'CT-oriented modified Hinchey stages (0, Ia, Ib, II, III, IV) for acute diverticulitis.',
    category: 'gastroenterology',
    tags: ['modified hinchey', 'diverticulitis', 'ct', 'colorectal'],
    whenToUse:
      'CT staging of acute diverticulitis to guide outpatient vs inpatient vs interventional care.',
    whyUse:
      'Adds stage 0 and splits pericolic disease (Ia phlegmon vs Ib abscess) for modern nonoperative pathways.',
    inputs: [
      selectInput('stage', 'Modified Hinchey stage', [
        { label: '0 — Mild clinical diverticulitis (CT normal or mild wall thickening)', value: 0 },
        { label: 'Ia — Confined pericolic inflammation / phlegmon', value: 1 },
        { label: 'Ib — Pericolic / mesocolic abscess', value: 2 },
        { label: 'II — Pelvic, distant intra-abdominal, or retroperitoneal abscess', value: 3 },
        { label: 'III — Generalized purulent peritonitis', value: 4 },
        { label: 'IV — Fecal peritonitis', value: 5 },
      ]),
    ],
    calculate(values) {
      const s = num(values.stage, 1);
      const map: Record<
        number,
        { code: string; label: string; interpretation: string; riskLevel: 'low' | 'moderate' | 'high' | 'critical' }
      > = {
        0: {
          code: '0',
          label: 'Modified Hinchey 0',
          interpretation:
            'Clinically mild diverticulitis with minimal or no CT findings. Often outpatient oral antibiotics or observation per guidelines in select immunocompetent patients.',
          riskLevel: 'low',
        },
        1: {
          code: 'Ia',
          label: 'Modified Hinchey Ia',
          interpretation:
            'Pericolic phlegmon without drainable abscess. Medical management (abx, diet advancement); most recover without intervention.',
          riskLevel: 'moderate',
        },
        2: {
          code: 'Ib',
          label: 'Modified Hinchey Ib',
          interpretation:
            'Pericolic/mesocolic abscess. Small abscesses may respond to antibiotics alone; larger collections often need percutaneous drainage.',
          riskLevel: 'moderate',
        },
        3: {
          code: 'II',
          label: 'Modified Hinchey II',
          interpretation:
            'Distant abscess. Antibiotics + drainage when accessible; surgery if fails or unstable.',
          riskLevel: 'high',
        },
        4: {
          code: 'III',
          label: 'Modified Hinchey III',
          interpretation:
            'Purulent peritonitis — operative management (laparoscopic lavage in select vs resection).',
          riskLevel: 'critical',
        },
        5: {
          code: 'IV',
          label: 'Modified Hinchey IV',
          interpretation:
            'Fecal peritonitis — emergency resection with diversion; high acuity care.',
          riskLevel: 'critical',
        },
      };
      const m = map[s] ?? map[1];
      return {
        score: m.code,
        label: m.label,
        interpretation: m.interpretation,
        riskLevel: m.riskLevel,
        details: [{ label: 'System', value: 'Wasvary / Kaiser modified Hinchey (CT-oriented)' }],
      };
    },
    evidence: {
      summary:
        'Modified Hinchey (Wasvary/Kaiser) expands classic stages with 0 and Ia/Ib to match CT findings and nonoperative management.',
      formula: '0 / Ia / Ib / II / III / IV',
      validation: 'Widely used in guidelines and research for diverticulitis severity.',
      references: [
        {
          title: 'Same hospitalization resection for acute diverticulitis',
          citation: 'Wasvary H et al. Am Surg. 1999;65:632-635',
          year: 1999,
          pmid: '10399971',
        },
        {
          title: 'The management of complicated diverticulitis and the role of computed tomography',
          citation: 'Kaiser AM et al. Am J Gastroenterol. 2005;100:910-917',
          year: 2005,
          pmid: '15784040',
          doi: '10.1111/j.1572-0241.2005.41154.x',
        },
      ],
    },
    nextSteps: [
      { condition: '0–Ia', actions: ['Medical therapy', 'Outpatient if stable and reliable'] },
      { condition: 'Ib–II', actions: ['Admit', 'IR drainage evaluation', 'Surgery if fails'] },
      { condition: 'III–IV', actions: ['Emergency surgical source control', 'ICU'] },
    ],
    pearls: [
      'Abscess size thresholds for drainage vary (~3–5 cm commonly discussed).',
      'Immunocompromised patients may need earlier operative intervention.',
    ],
  },

  {
    id: 'parkland-grading',
    name: 'Parkland Grading Scale (Cholecystitis)',
    shortName: 'Parkland grade',
    description:
      'Intraoperative laparoscopic grading of acute cholecystitis severity (grades 1–5).',
    category: 'gastroenterology',
    tags: ['parkland', 'cholecystitis', 'laparoscopic', 'gallbladder', 'surgery'],
    whenToUse:
      'During laparoscopic cholecystectomy to grade inflammatory severity and anticipate difficulty.',
    whyUse:
      'Predicts conversion, complications, and operative time better than purely clinical labels.',
    inputs: [
      selectInput('grade', 'Parkland grade', [
        { label: '1 — Normal appearing gallbladder / no adhesions', value: 1 },
        { label: '2 — Minor adhesions at neck only', value: 2 },
        { label: '3 — Hyperemia, distention, adhesions to body, or hydrops', value: 3 },
        { label: '4 — Adhesions obscuring majority of gallbladder OR grade 3 + abnormal liver anatomy', value: 4 },
        { label: '5 — Perforation, necrosis, or inability to visualize GB due to adhesions', value: 5 },
      ]),
    ],
    calculate(values) {
      const g = num(values.grade, 1);
      const map: Record<
        number,
        { label: string; interpretation: string; riskLevel: 'low' | 'moderate' | 'high' | 'critical' }
      > = {
        1: {
          label: 'Parkland grade 1',
          interpretation:
            'Normal-appearing gallbladder without adhesions. Straightforward cholecystectomy expected; low conversion risk.',
          riskLevel: 'low',
        },
        2: {
          label: 'Parkland grade 2',
          interpretation:
            'Minor adhesions at neck. Generally still low–moderate difficulty; careful Calot triangle dissection.',
          riskLevel: 'low',
        },
        3: {
          label: 'Parkland grade 3',
          interpretation:
            'Hyperemia, distention, adhesions involving body, and/or hydrops. Increased difficulty — consider early senior help, cholangiography, subtotal options if needed.',
          riskLevel: 'moderate',
        },
        4: {
          label: 'Parkland grade 4',
          interpretation:
            'Extensive adhesions obscuring most of gallbladder, or grade 3 plus abnormal liver anatomy (e.g., cirrhosis, left-sided GB). High difficulty — low threshold for bailout procedures.',
          riskLevel: 'high',
        },
        5: {
          label: 'Parkland grade 5',
          interpretation:
            'Perforation, necrosis, or inability to visualize gallbladder from adhesions. Highest complication/conversion risk — prioritize safety (subtotal, convert, abort to drain).',
          riskLevel: 'critical',
        },
      };
      const m = map[g] ?? map[1];
      return {
        score: g,
        label: m.label,
        interpretation: m.interpretation,
        riskLevel: m.riskLevel,
        details: [{ label: 'Scale', value: 'Parkland laparoscopic grading 1–5' }],
      };
    },
    evidence: {
      summary:
        'Parkland grading scale for acute cholecystitis grades intraoperative findings 1–5 correlating with operative difficulty and outcomes.',
      formula: 'Grade 1 (normal) through 5 (necrosis/perforation/inability to visualize)',
      validation:
        'Developed at Parkland Memorial Hospital; associated with longer OR time, conversion, and complications as grade rises.',
      references: [
        {
          title: 'A laparoscopic grading scale for severity of acute cholecystitis',
          citation: 'Madni TD et al. Am J Surg. 2018;215:625-630',
          year: 2018,
          pmid: '28619262',
          doi: '10.1016/j.amjsurg.2017.05.017',
        },
      ],
    },
    nextSteps: [
      { condition: 'Grade 1–2', actions: ['Standard laparoscopic cholecystectomy'] },
      {
        condition: 'Grade 3–5',
        actions: [
          'Critical view of safety meticulously',
          'Consider IOC / near-infrared cholangiography',
          'Bailout subtotal cholecystectomy if anatomy unclear',
        ],
      },
    ],
    pearls: [
      'Not the same as Tokyo Guidelines clinical severity grades.',
      'Document grade in operative note for quality review.',
    ],
  },

  {
    id: 'renal-trauma-aast',
    name: 'AAST Kidney Injury Scale',
    shortName: 'AAST kidney',
    description:
      'AAST Organ Injury Scale for traumatic renal injury grades I–V (imaging/operative).',
    category: 'emergency',
    tags: ['aast', 'renal trauma', 'kidney', 'trauma', 'urology'],
    whenToUse:
      'Staging blunt or penetrating kidney injury on CT or at laparotomy.',
    whyUse:
      'Standard trauma language guiding nonoperative vs interventional vs operative management.',
    inputs: [
      selectInput('grade', 'AAST kidney grade', [
        {
          label: 'I — Contusion or non-expanding subcapsular hematoma; no laceration',
          value: 1,
        },
        {
          label: 'II — Non-expanding perirenal hematoma OR cortical laceration <1 cm (no urinary extravasation)',
          value: 2,
        },
        {
          label: 'III — Cortical laceration >1 cm without collecting system rupture',
          value: 3,
        },
        {
          label: 'IV — Laceration through cortex/medulla/collecting system OR main vessel injury with contained hemorrhage',
          value: 4,
        },
        {
          label: 'V — Shattered kidney OR avulsion of hilum / devascularized kidney',
          value: 5,
        },
      ]),
      yesNo('hemodynamicUnstable', 'Hemodynamic instability attributable to renal injury', 1),
    ],
    calculate(values) {
      const g = num(values.grade, 1);
      const unstable = bool(values.hemodynamicUnstable);
      const labels: Record<number, string> = {
        1: 'AAST grade I',
        2: 'AAST grade II',
        3: 'AAST grade III',
        4: 'AAST grade IV',
        5: 'AAST grade V',
      };
      let interpretation = '';
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
      if (g <= 2) {
        interpretation = `${labels[g]}: low-grade renal injury. Usually nonoperative management, observation, bed rest, serial exams/Hb if isolated.`;
        riskLevel = 'low';
      } else if (g === 3) {
        interpretation = `${labels[g]}: intermediate laceration without collecting system injury. Most stable patients managed nonoperatively; angioembolization if ongoing arterial bleeding.`;
        riskLevel = 'moderate';
      } else if (g === 4) {
        interpretation = `${labels[g]}: deep laceration ± collecting system or segmental vessel injury. Stable patients often nonop ± stent for urinoma / angio for bleed; surgery if unstable.`;
        riskLevel = 'high';
      } else {
        interpretation = `${labels[g]}: shattered or devascularized kidney. High likelihood of intervention; nephrectomy if life-threatening hemorrhage.`;
        riskLevel = 'critical';
      }
      if (unstable) {
        interpretation += ' Hemodynamic instability — prioritize resuscitation and operative/angio hemorrhage control over grade alone.';
        riskLevel = 'critical';
      }
      return {
        score: g,
        label: labels[g] ?? `Grade ${g}`,
        interpretation,
        riskLevel,
        details: [
          { label: 'Scale', value: 'AAST OIS kidney (2018 updates refine vascular/collecting details)' },
          { label: 'Unstable', value: unstable ? 'Yes' : 'No' },
        ],
      };
    },
    evidence: {
      summary:
        'AAST kidney injury scale grades contusion/hematoma through shattered/devascularized kidney; guides NOM vs IR vs OR.',
      formula: 'Grades I–V by hematoma, laceration depth, collecting system, and vascular injury',
      validation: 'Standard ACS trauma terminology; 2018 revision refined CT criteria.',
      references: [
        {
          title: 'Organ injury scaling: spleen, liver, and kidney',
          citation: 'Moore EE et al. J Trauma. 1989;29:1664-1666 (with subsequent AAST revisions)',
          year: 1989,
          pmid: '2593197',
        },
        {
          title: 'Kidney and urotrauma: WSES-AAST guidelines',
          citation: 'Coccolini F et al. World J Emerg Surg. 2019',
          year: 2019,
          pmid: '31827593',
          doi: '10.1186/s13017-019-0274-x',
        },
      ],
    },
    nextSteps: [
      { condition: 'Grade I–III stable', actions: ['Observation', 'Serial CBC', 'Activity restriction'] },
      { condition: 'Grade IV–V or unstable', actions: ['Trauma/urology consult', 'Angio vs OR', 'Stent if urinoma'] },
    ],
    pearls: [
      'Urinary extravasation alone does not mandate surgery in stable patients.',
      'Absolute indications for exploration: life-threatening bleed, expanding hematoma, renal pedicle avulsion.',
    ],
  },

  {
    id: 'splenic-trauma-aast',
    name: 'AAST Spleen Injury Scale',
    shortName: 'AAST spleen',
    description:
      'AAST Organ Injury Scale for traumatic splenic injury grades I–V.',
    category: 'emergency',
    tags: ['aast', 'spleen', 'trauma', 'splenic injury'],
    whenToUse:
      'Staging blunt or penetrating splenic injury on CT or operatively.',
    whyUse:
      'Guides nonoperative management, angioembolization, and splenectomy decisions.',
    inputs: [
      selectInput('grade', 'AAST spleen grade', [
        {
          label: 'I — Subcapsular hematoma <10% surface OR laceration <1 cm depth',
          value: 1,
        },
        {
          label: 'II — Subcapsular 10–50% OR intraparenchymal <5 cm OR laceration 1–3 cm',
          value: 2,
        },
        {
          label: 'III — Subcapsular >50% / ruptured expanding OR intraparenchymal ≥5 cm OR laceration >3 cm',
          value: 3,
        },
        {
          label: 'IV — Laceration involving segmental or hilar vessels with major devascularization (>25%)',
          value: 4,
        },
        {
          label: 'V — Shattered spleen OR hilar vascular injury with total devascularization',
          value: 5,
        },
      ]),
      yesNo('contrastBlush', 'Active contrast extravasation / blush on CT', 1),
      yesNo('unstable', 'Hemodynamically unstable', 1),
    ],
    calculate(values) {
      const g = num(values.grade, 1);
      const blush = bool(values.contrastBlush);
      const unstable = bool(values.unstable);
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' =
        g <= 2 ? 'low' : g === 3 ? 'moderate' : g === 4 ? 'high' : 'critical';
      let interpretation = `AAST spleen grade ${g}. `;
      if (unstable) {
        interpretation +=
          'Unstable patient — resuscitate and proceed to operative splenectomy/splenorrhaphy rather than NOM. ';
        riskLevel = 'critical';
      } else if (g <= 2 && !blush) {
        interpretation +=
          'Low-grade injury without blush: nonoperative management success is high with observation and activity limits.';
      } else if (g === 3 || blush) {
        interpretation +=
          'Intermediate risk or vascular blush: consider angioembolization in stable patients at capable centers; close monitoring.';
        if (riskLevel === 'low') riskLevel = 'moderate';
      } else {
        interpretation +=
          'High-grade injury: NOM may still be attempted if stable in experienced centers, but failure risk higher; low threshold for angio or OR.';
      }
      return {
        score: g,
        label: `AAST grade ${g}`,
        interpretation,
        riskLevel,
        details: [
          { label: 'Contrast blush', value: blush ? 'Yes' : 'No' },
          { label: 'Unstable', value: unstable ? 'Yes' : 'No' },
        ],
      };
    },
    evidence: {
      summary:
        'AAST spleen OIS grades hematomas and lacerations I–V; management increasingly NOM ± angioembolization for stable higher-grade injuries.',
      formula: 'Grades I–V by hematoma size, laceration depth, and vascular/devascularization pattern',
      validation: 'Universal trauma standard; 2018 revision incorporates CT vascular injury descriptors.',
      references: [
        {
          title: 'Organ injury scaling: spleen, liver, and kidney',
          citation: 'Moore EE et al. J Trauma. 1989;29:1664-1666',
          year: 1989,
          pmid: '2593197',
        },
        {
          title: 'Splenic trauma: WSES classification and guidelines',
          citation: 'Coccolini F et al. World J Emerg Surg. 2017',
          year: 2017,
          pmid: '28828034',
          doi: '10.1186/s13017-017-0151-4',
        },
      ],
    },
    nextSteps: [
      { condition: 'Stable low grade', actions: ['Serial exams/Hb', 'Bed rest protocol', 'Vaccinate if later splenectomy'] },
      { condition: 'Blush or high grade stable', actions: ['IR embolization evaluation', 'ICU observation'] },
      { condition: 'Unstable', actions: ['OR for splenectomy', 'Massive transfusion as needed'] },
    ],
    pearls: [
      'Hemodynamics trump grade.',
      'Post-splenectomy vaccines: pneumococcus, meningococcus, Hib (± influenza).',
    ],
  },

  {
    id: 'liver-trauma-aast',
    name: 'AAST Liver Injury Scale',
    shortName: 'AAST liver',
    description:
      'AAST Organ Injury Scale for traumatic hepatic injury grades I–V (VI avulsion rarely used).',
    category: 'emergency',
    tags: ['aast', 'liver', 'hepatic trauma', 'trauma'],
    whenToUse:
      'Staging blunt or penetrating liver injury on CT or at laparotomy.',
    whyUse:
      'Standard grading for NOM candidacy, angioembolization, and damage-control surgery.',
    inputs: [
      selectInput('grade', 'AAST liver grade', [
        {
          label: 'I — Subcapsular hematoma <10% OR laceration <1 cm depth',
          value: 1,
        },
        {
          label: 'II — Subcapsular 10–50% OR intraparenchymal <10 cm OR laceration 1–3 cm',
          value: 2,
        },
        {
          label: 'III — Subcapsular >50%/ruptured OR intraparenchymal >10 cm OR laceration >3 cm',
          value: 3,
        },
        {
          label: 'IV — Parenchymal disruption 25–75% of a lobe OR 1–3 Couinaud segments',
          value: 4,
        },
        {
          label: 'V — Disruption >75% of lobe OR >3 segments OR juxtahepatic venous injury',
          value: 5,
        },
      ]),
      yesNo('unstable', 'Hemodynamically unstable', 1),
      yesNo('blush', 'Active extravasation on CT', 1),
    ],
    calculate(values) {
      const g = num(values.grade, 1);
      const unstable = bool(values.unstable);
      const blush = bool(values.blush);
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' =
        g <= 2 ? 'low' : g === 3 ? 'moderate' : g === 4 ? 'high' : 'critical';
      let interpretation = `AAST liver grade ${g}. `;
      if (unstable) {
        interpretation +=
          'Unstable: operative hemorrhage control / damage control (packing, Pringle, resection as needed). Grade alone does not mandate surgery if stable. ';
        riskLevel = 'critical';
      } else if (g <= 3 && !blush) {
        interpretation +=
          'Most stable grade I–III injuries succeed with nonoperative management and monitoring.';
      } else if (blush || g >= 4) {
        interpretation +=
          'High-grade and/or blush: angioembolization for stable arterial bleeding; watch for bile leak, abscess, delayed bleed.';
        if (g >= 4) riskLevel = 'high';
        if (g === 5) riskLevel = 'critical';
      }
      return {
        score: g,
        label: `AAST grade ${g}`,
        interpretation,
        riskLevel,
        details: [
          { label: 'Blush', value: blush ? 'Yes' : 'No' },
          { label: 'Unstable', value: unstable ? 'Yes' : 'No' },
        ],
      };
    },
    evidence: {
      summary:
        'AAST liver OIS grades hematomas/lacerations and lobar disruption; NOM is standard for stable patients including many high-grade injuries.',
      formula: 'Grades I–V (VI hepatic avulsion historical)',
      validation: 'Core trauma lexicon; pair with WSES liver trauma guidelines for management algorithms.',
      references: [
        {
          title: 'Organ injury scaling: spleen, liver, and kidney',
          citation: 'Moore EE et al. J Trauma. 1989;29:1664-1666',
          year: 1989,
          pmid: '2593197',
        },
        {
          title: 'Liver trauma: WSES 2020 guidelines',
          citation: 'Coccolini F et al. World J Emerg Surg. 2020',
          year: 2020,
          pmid: '32228707',
          doi: '10.1186/s13017-020-00302-7',
        },
      ],
    },
    nextSteps: [
      { condition: 'Stable low–mid grade', actions: ['ICU or step-down observation', 'Serial Hb', 'Activity limits'] },
      { condition: 'Blush stable', actions: ['IR embolization'] },
      { condition: 'Unstable', actions: ['Damage-control laparotomy', 'Massive transfusion protocol'] },
    ],
    pearls: [
      'Venous juxtahepatic injuries (grade V) are highly lethal.',
      'Late complications: biloma, hemobilia, abscess.',
    ],
  },

  {
    id: 'ipss-prostate',
    name: 'IPSS — International Prostate Symptom Score',
    shortName: 'IPSS',
    description:
      'Seven-item lower urinary tract symptom score (0–35) plus optional quality-of-life item for BPH/LUTS.',
    category: 'urology',
    tags: ['ipss', 'bph', 'luts', 'prostate', 'urology'],
    whenToUse:
      'Men with lower urinary tract symptoms to quantify severity and track treatment response.',
    whyUse:
      'Standard AUA/ICS tool (identical to AUA Symptom Index) for BPH evaluation.',
    inputs: [
      selectInput('incomplete', 'Incomplete emptying (past month)', [
        { label: 'Not at all (0)', value: 0 },
        { label: 'Less than 1 in 5 (1)', value: 1 },
        { label: 'Less than half (2)', value: 2 },
        { label: 'About half (3)', value: 3 },
        { label: 'More than half (4)', value: 4 },
        { label: 'Almost always (5)', value: 5 },
      ]),
      selectInput('frequency', 'Frequency (<2 h between voids)', [
        { label: 'Not at all (0)', value: 0 },
        { label: 'Less than 1 in 5 (1)', value: 1 },
        { label: 'Less than half (2)', value: 2 },
        { label: 'About half (3)', value: 3 },
        { label: 'More than half (4)', value: 4 },
        { label: 'Almost always (5)', value: 5 },
      ]),
      selectInput('intermittency', 'Intermittency', [
        { label: 'Not at all (0)', value: 0 },
        { label: 'Less than 1 in 5 (1)', value: 1 },
        { label: 'Less than half (2)', value: 2 },
        { label: 'About half (3)', value: 3 },
        { label: 'More than half (4)', value: 4 },
        { label: 'Almost always (5)', value: 5 },
      ]),
      selectInput('urgency', 'Urgency', [
        { label: 'Not at all (0)', value: 0 },
        { label: 'Less than 1 in 5 (1)', value: 1 },
        { label: 'Less than half (2)', value: 2 },
        { label: 'About half (3)', value: 3 },
        { label: 'More than half (4)', value: 4 },
        { label: 'Almost always (5)', value: 5 },
      ]),
      selectInput('weakStream', 'Weak stream', [
        { label: 'Not at all (0)', value: 0 },
        { label: 'Less than 1 in 5 (1)', value: 1 },
        { label: 'Less than half (2)', value: 2 },
        { label: 'About half (3)', value: 3 },
        { label: 'More than half (4)', value: 4 },
        { label: 'Almost always (5)', value: 5 },
      ]),
      selectInput('straining', 'Straining', [
        { label: 'Not at all (0)', value: 0 },
        { label: 'Less than 1 in 5 (1)', value: 1 },
        { label: 'Less than half (2)', value: 2 },
        { label: 'About half (3)', value: 3 },
        { label: 'More than half (4)', value: 4 },
        { label: 'Almost always (5)', value: 5 },
      ]),
      selectInput('nocturia', 'Nocturia (times per night)', [
        { label: 'None (0)', value: 0 },
        { label: '1 time (1)', value: 1 },
        { label: '2 times (2)', value: 2 },
        { label: '3 times (3)', value: 3 },
        { label: '4 times (4)', value: 4 },
        { label: '5 or more (5)', value: 5 },
      ]),
      selectInput('qol', 'Quality of life if symptoms continue', [
        { label: 'Delighted (0)', value: 0 },
        { label: 'Pleased (1)', value: 1 },
        { label: 'Mostly satisfied (2)', value: 2 },
        { label: 'Mixed (3)', value: 3 },
        { label: 'Mostly dissatisfied (4)', value: 4 },
        { label: 'Unhappy (5)', value: 5 },
        { label: 'Terrible (6)', value: 6 },
      ]),
    ],
    calculate(values) {
      const score =
        num(values.incomplete) +
        num(values.frequency) +
        num(values.intermittency) +
        num(values.urgency) +
        num(values.weakStream) +
        num(values.straining) +
        num(values.nocturia);
      const qol = num(values.qol);
      const r = riskFromThresholds(score, [
        {
          max: 7,
          level: 'low',
          label: 'Mild symptoms (0–7)',
          interpretation: `IPSS ${score}: mild LUTS. Watchful waiting, lifestyle (fluid timing, caffeine), address meds that worsen symptoms. QoL item: ${qol}/6.`,
        },
        {
          max: 19,
          level: 'moderate',
          label: 'Moderate symptoms (8–19)',
          interpretation: `IPSS ${score}: moderate LUTS. Consider α-blocker ± 5-ARI if prostate enlarged; evaluate for infection, hematuria, retention. QoL: ${qol}/6.`,
        },
        {
          max: 35,
          level: 'high',
          label: 'Severe symptoms (20–35)',
          interpretation: `IPSS ${score}: severe LUTS. Urology referral; discuss medical combination therapy or procedures (TURP, laser, minimally invasive). QoL: ${qol}/6.`,
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'Symptom total', value: `${score} / 35` },
          { label: 'QoL score', value: `${qol} / 6` },
        ],
      };
    },
    evidence: {
      summary:
        'IPSS/AUA-SI: 7 symptoms each scored 0–5 (max 35); mild 0–7, moderate 8–19, severe 20–35; plus QoL 0–6.',
      formula: 'Sum of 7 items (0–35) + optional QoL (0–6)',
      validation: 'Global standard for BPH/LUTS research and clinical practice.',
      references: [
        {
          title: 'The American Urological Association symptom index for benign prostatic hyperplasia',
          citation: 'Barry MJ et al. J Urol. 1992;148:1549-1557',
          year: 1992,
          pmid: '1279218',
          doi: '10.1016/s0022-5347(17)36966-5',
        },
      ],
    },
    nextSteps: [
      { condition: 'Mild', actions: ['Lifestyle', 'Reassess annually or if worsening'] },
      { condition: 'Moderate–severe', actions: ['UA ± PSA per shared decision', 'Medical therapy', 'Urology if refractory or red flags'] },
    ],
    pearls: [
      'IPSS does not diagnose obstruction — flow rate and PVR add objective data.',
      'Red flags: retention, infection, stones, renal insufficiency, hematuria, suspicion of cancer.',
    ],
  },

  {
    id: 'psa-density',
    name: 'PSA Density',
    shortName: 'PSAD',
    description:
      'Prostate-specific antigen density = serum PSA divided by prostate volume (ng/mL per mL).',
    category: 'oncology',
    tags: ['psa', 'psad', 'prostate', 'cancer', 'urology'],
    whenToUse:
      'Interpreting elevated PSA when prostate volume is known (TRUS, MRI, or pathology).',
    whyUse:
      'Higher PSAD increases likelihood of clinically significant prostate cancer vs BPH-related PSA rise.',
    inputs: [
      numberInput('psa', 'Total PSA', {
        unit: 'ng/mL',
        min: 0,
        max: 500,
        step: 0.01,
        defaultValue: 6,
      }),
      numberInput('volume', 'Prostate volume', {
        unit: 'mL',
        min: 5,
        max: 300,
        step: 0.1,
        defaultValue: 40,
        helpText: 'From TRUS/MRI ellipsoid formula or measured volume',
      }),
    ],
    calculate(values) {
      const psa = num(values.psa);
      const vol = num(values.volume);
      if (vol <= 0) {
        return {
          score: '—',
          label: 'Invalid volume',
          interpretation: 'Prostate volume must be >0 mL.',
          riskLevel: 'info',
        };
      }
      const psad = round(psa / vol, 3);
      const r = riskFromThresholds(psad, [
        {
          max: 0.1,
          level: 'low',
          label: 'Lower PSAD (≤0.10)',
          interpretation: `PSAD ${psad} ng/mL². Values ≤0.10–0.15 often considered more reassuring for BPH-related PSA elevation — integrate with age, DRE, MRI PI-RADS, and PSA kinetics.`,
        },
        {
          max: 0.15,
          level: 'moderate',
          label: 'Intermediate PSAD (0.11–0.15)',
          interpretation: `PSAD ${psad}. Borderline band — shared decision on MRI/biopsy depending on PSA, exam, and risk factors.`,
        },
        {
          max: 100,
          level: 'high',
          label: 'Higher PSAD (>0.15)',
          interpretation: `PSAD ${psad}. Above common 0.15 threshold associated with higher odds of clinically significant cancer — MRI and/or biopsy discussion favored.`,
        },
      ]);
      return {
        score: psad,
        unit: 'ng/mL²',
        ...r,
        details: [
          { label: 'PSA', value: `${psa} ng/mL` },
          { label: 'Volume', value: `${vol} mL` },
          { label: 'Common cutoffs', value: '0.10 and 0.15 ng/mL²' },
        ],
      };
    },
    evidence: {
      summary:
        'PSA density = total PSA / prostate volume. Thresholds near 0.15 ng/mL² are frequently used to refine biopsy decisions.',
      formula: 'PSAD = PSA (ng/mL) ÷ volume (mL)',
      validation:
        'Supported across biopsy and MRI-era cohorts; volume measurement method affects precision.',
      references: [
        {
          title: 'PSA density of the transition zone in BPH and prostate cancer',
          citation: 'Benson MC et al. J Urol. 1992 / subsequent PSAD literature',
          year: 1992,
          pmid: '1373725',
        },
      ],
    },
    nextSteps: [
      { condition: 'Low PSAD', actions: ['Observe PSA trend', 'Treat BPH if symptomatic'] },
      { condition: 'High PSAD', actions: ['mpMRI if not done', 'Urology for biopsy shared decision'] },
    ],
    pearls: [
      '5α-reductase inhibitors roughly halve PSA — adjust interpretation.',
      'MRI prostate volume is preferred when available.',
    ],
  },

  {
    id: 'free-psa-ratio',
    name: 'Free/Total PSA Ratio',
    shortName: 'Free PSA %',
    description:
      'Percent free PSA = (free PSA / total PSA) × 100 to refine cancer risk in the gray-zone total PSA range.',
    category: 'oncology',
    tags: ['free psa', 'psa ratio', 'prostate cancer', 'urology'],
    whenToUse:
      'Men with total PSA roughly 4–10 ng/mL (or age-adjusted gray zone) and normal DRE when deciding on further testing.',
    whyUse:
      'Lower % free PSA associates with higher prostate cancer probability; higher % favors BPH.',
    inputs: [
      numberInput('freePsa', 'Free PSA', {
        unit: 'ng/mL',
        min: 0,
        max: 100,
        step: 0.01,
        defaultValue: 1.2,
      }),
      numberInput('totalPsa', 'Total PSA', {
        unit: 'ng/mL',
        min: 0.1,
        max: 500,
        step: 0.01,
        defaultValue: 6,
      }),
    ],
    calculate(values) {
      const free = num(values.freePsa);
      const total = num(values.totalPsa);
      if (total <= 0) {
        return {
          score: '—',
          label: 'Invalid total PSA',
          interpretation: 'Total PSA must be >0.',
          riskLevel: 'info',
        };
      }
      const pct = round((free / total) * 100, 1);
      let riskLevel: 'low' | 'moderate' | 'high' | 'info' = 'moderate';
      let label = '';
      let interpretation = '';
      if (pct > 25) {
        riskLevel = 'low';
        label = 'Higher % free PSA (>25%)';
        interpretation = `% free PSA ${pct}%: relatively lower cancer probability in classic gray-zone studies — still individualize with age, density, MRI, and kinetics.`;
      } else if (pct >= 10) {
        riskLevel = 'moderate';
        label = 'Intermediate % free PSA (10–25%)';
        interpretation = `% free PSA ${pct}%: intermediate risk band — consider mpMRI and shared decision on biopsy.`;
      } else {
        riskLevel = 'high';
        label = 'Low % free PSA (<10%)';
        interpretation = `% free PSA ${pct}%: higher probability of prostate cancer in referral populations — urology evaluation and biopsy/MRI pathway favored.`;
      }
      return {
        score: pct,
        unit: '%',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Free PSA', value: `${free} ng/mL` },
          { label: 'Total PSA', value: `${total} ng/mL` },
          { label: 'Best studied range', value: 'Total PSA ~4–10 ng/mL' },
        ],
      };
    },
    evidence: {
      summary:
        'Percent free PSA helps discriminate cancer from BPH when total PSA is moderately elevated; cancer tends to lower % free PSA.',
      formula: '% free PSA = (free ÷ total) × 100',
      validation:
        'Catalona et al. and others established cutoffs (~10% / 25%); assay methods must be consistent.',
      references: [
        {
          title: 'Use of the percentage of free prostate-specific antigen to enhance differentiation of prostate cancer from benign prostatic disease',
          citation: 'Catalona WJ et al. JAMA. 1998;279:1542-1547',
          year: 1998,
          pmid: '9605898',
          doi: '10.1001/jama.279.19.1542',
        },
      ],
    },
    nextSteps: [
      { condition: 'High % free', actions: ['Observe / repeat PSA', 'Treat BPH'] },
      { condition: 'Low % free', actions: ['mpMRI', 'Biopsy counseling'] },
    ],
    pearls: [
      'Draw free and total on the same sample; freeze/handle per lab protocol.',
      'Not a stand-alone cancer rule-out.',
    ],
  },

  {
    id: 'gleason-grade-group',
    name: 'Gleason Grade Group',
    shortName: 'Grade Group',
    description:
      'ISUP/WHO Grade Groups 1–5 mapped from Gleason scores for prostate cancer prognosis.',
    category: 'oncology',
    tags: ['gleason', 'grade group', 'prostate cancer', 'isup', 'pathology'],
    whenToUse:
      'Interpreting prostate biopsy or prostatectomy Gleason scores in modern Grade Group terms.',
    whyUse:
      'Grade Groups improve communication (e.g., 3+4=7 vs 4+3=7 are different groups).',
    inputs: [
      selectInput('gleason', 'Gleason score (primary + secondary)', [
        { label: '≤6 (3+3 or less)', value: '6' },
        { label: '3+4=7', value: '3+4' },
        { label: '4+3=7', value: '4+3' },
        { label: '8 (4+4, 3+5, 5+3)', value: '8' },
        { label: '9–10 (4+5, 5+4, 5+5)', value: '9' },
      ]),
    ],
    calculate(values) {
      const g = String(values.gleason ?? '6');
      const map: Record<
        string,
        { group: number; gleason: string; label: string; interpretation: string; riskLevel: 'low' | 'moderate' | 'high' | 'critical' }
      > = {
        '6': {
          group: 1,
          gleason: '≤6',
          label: 'Grade Group 1',
          interpretation:
            'Grade Group 1 (Gleason ≤6): most favorable histology. Often eligible for active surveillance if other criteria met (volume, PSA, MRI, life expectancy).',
          riskLevel: 'low',
        },
        '3+4': {
          group: 2,
          gleason: '3+4=7',
          label: 'Grade Group 2',
          interpretation:
            'Grade Group 2 (3+4=7): favorable intermediate risk histology in many systems. Treatment vs surveillance individualized by volume of pattern 4, PSA, and MRI.',
          riskLevel: 'moderate',
        },
        '4+3': {
          group: 3,
          gleason: '4+3=7',
          label: 'Grade Group 3',
          interpretation:
            'Grade Group 3 (4+3=7): unfavorable intermediate risk histology — definitive therapy commonly recommended (surgery or radiation ± ADT per risk).',
          riskLevel: 'moderate',
        },
        '8': {
          group: 4,
          gleason: '8',
          label: 'Grade Group 4',
          interpretation:
            'Grade Group 4 (Gleason 8): high-risk disease — staging imaging as indicated; multimodal therapy discussion (RP, RT+ADT, systemic options).',
          riskLevel: 'high',
        },
        '9': {
          group: 5,
          gleason: '9–10',
          label: 'Grade Group 5',
          interpretation:
            'Grade Group 5 (Gleason 9–10): highest grade — thorough staging; combination local + systemic therapy per guidelines and goals of care.',
          riskLevel: 'critical',
        },
      };
      const m = map[g] ?? map['6'];
      return {
        score: m.group,
        label: m.label,
        interpretation: m.interpretation,
        riskLevel: m.riskLevel,
        details: [
          { label: 'Gleason', value: m.gleason },
          { label: 'Grade Group', value: String(m.group) },
        ],
      };
    },
    evidence: {
      summary:
        'ISUP 2014 / WHO Grade Groups: 1 (≤6), 2 (3+4), 3 (4+3), 4 (8), 5 (9–10) with distinct prognosis.',
      formula: 'Map Gleason pattern sum to Grade Group 1–5',
      validation:
        'Validated against prostate cancer death and metastasis; preferred reporting standard.',
      references: [
        {
          title: 'A contemporary prostate cancer grading system: a validated alternative to the Gleason score',
          citation: 'Epstein JI et al. Eur Urol. 2016;69:428-435',
          year: 2016,
          pmid: '26166626',
          doi: '10.1016/j.eururo.2015.06.046',
        },
      ],
    },
    nextSteps: [
      { condition: 'Group 1', actions: ['Active surveillance criteria review', 'Confirm with MRI/path second opinion if discordant'] },
      { condition: 'Group 2–3', actions: ['Risk-group staging', 'Shared decision RP vs RT'] },
      { condition: 'Group 4–5', actions: ['Bone/CT or PSMA PET per guideline', 'Multidisciplinary clinic'] },
    ],
    pearls: [
      'Always report both Gleason and Grade Group.',
      'Tertiary patterns and cribriform architecture refine risk beyond simple scores.',
    ],
  },

  {
    id: 'bladder-cancer-eortc',
    name: 'EORTC NMIBC Risk Points (Simplified)',
    shortName: 'EORTC NMIBC',
    description:
      'Educational simplified EORTC points for recurrence and progression risk after TURBT for non–muscle-invasive bladder cancer.',
    category: 'oncology',
    tags: ['eortc', 'bladder cancer', 'nmibc', 'turbt', 'urology'],
    whenToUse:
      'After TURBT for Ta/T1/CIS NMIBC when counseling on recurrence/progression risk and adjuvant therapy intensity.',
    whyUse:
      'EORTC risk tables remain foundational for NMIBC stratification (alongside EAU risk groups and CUETO).',
    inputs: [
      selectInput('number', 'Number of tumors', [
        { label: 'Single (0)', value: 0 },
        { label: '2–7 (3 rec / 3 prog)', value: 3 },
        { label: '≥8 (6 rec / 3 prog)', value: 6 },
      ]),
      selectInput('diameter', 'Tumor diameter', [
        { label: '<3 cm (0)', value: 0 },
        { label: '≥3 cm (3)', value: 3 },
      ]),
      selectInput('priorRecur', 'Prior recurrence rate', [
        { label: 'Primary (0)', value: 0 },
        { label: '≤1 rec/year (2)', value: 2 },
        { label: '>1 rec/year (4)', value: 4 },
      ]),
      selectInput('category', 'T category', [
        { label: 'Ta (0)', value: 0 },
        { label: 'T1 (1 rec / 4 prog)', value: 1 },
      ]),
      selectInput('cis', 'Concurrent CIS', [
        { label: 'No (0)', value: 0 },
        { label: 'Yes (1 rec / 6 prog)', value: 1 },
      ]),
      selectInput('grade', 'Grade (WHO 1973 style used in original)', [
        { label: 'G1 (0)', value: 0 },
        { label: 'G2 (1)', value: 1 },
        { label: 'G3 (2 rec / 5 prog)', value: 2 },
      ]),
    ],
    calculate(values) {
      // Recurrence points (classic EORTC)
      let rec =
        num(values.number) +
        num(values.diameter) +
        num(values.priorRecur) +
        num(values.category) +
        num(values.cis) +
        num(values.grade);
      // Progression uses different weights for some items
      const number = num(values.number);
      const numberProg = number >= 6 ? 3 : number >= 3 ? 3 : 0;
      const catProg = num(values.category) === 1 ? 4 : 0;
      const cisProg = num(values.cis) === 1 ? 6 : 0;
      const gradeProg = num(values.grade) === 2 ? 5 : num(values.grade) === 1 ? 0 : 0;
      // G2 progression points = 0 in original? Actually G2 = 0 for progression? Wait - G1=0, G2=0, G3=5 for progression. Recurrence: G1=0,G2=1,G3=2
      const prog =
        numberProg +
        num(values.diameter) +
        // prior recurrence progression: primary 0, ≤1/yr 2, >1/yr 2
        (num(values.priorRecur) === 0 ? 0 : 2) +
        catProg +
        cisProg +
        gradeProg;

      // Fix recurrence: for number ≥8, value was 6 which is correct for rec; for 2-7 value 3 correct
      // T1 recurrence is +1, CIS +1 - using category and cis as 0/1 works for recurrence
      // But we used same number field for both - when number is 6 (meaning ≥8), prog should be 3 not 6
      // Recalculate rec properly:
      const numTumors = num(values.number);
      const recNumber = numTumors; // 0, 3, or 6
      rec =
        recNumber +
        num(values.diameter) +
        num(values.priorRecur) +
        num(values.category) +
        num(values.cis) +
        num(values.grade);

      const recRisk = riskFromThresholds(rec, [
        {
          max: 0,
          level: 'low',
          label: 'Lowest recurrence points',
          interpretation: `Recurrence score ${rec}: lowest EORTC recurrence band (~15% at 1 y in original tables).`,
        },
        {
          max: 4,
          level: 'low',
          label: 'Low–intermediate recurrence points',
          interpretation: `Recurrence score ${rec}: low–intermediate recurrence risk band.`,
        },
        {
          max: 9,
          level: 'moderate',
          label: 'Intermediate recurrence points',
          interpretation: `Recurrence score ${rec}: intermediate recurrence risk — consider adjuvant intravesical therapy.`,
        },
        {
          max: 17,
          level: 'high',
          label: 'High recurrence points',
          interpretation: `Recurrence score ${rec}: high recurrence risk — adjuvant intravesical chemo/BCG per guidelines.`,
        },
      ]);
      const progBand =
        prog === 0
          ? 'lowest progression (~0.2–1% at 1 y original)'
          : prog <= 6
            ? 'intermediate progression risk'
            : prog <= 13
              ? 'high progression risk'
              : 'highest progression risk';

      return {
        score: rec,
        label: recRisk.label,
        interpretation: `${recRisk.interpretation} Progression points ${prog} (${progBand}). Use full EORTC tables / EAU risk groups for treatment selection.`,
        riskLevel: prog >= 7 ? 'high' : recRisk.riskLevel,
        details: [
          { label: 'Recurrence points', value: String(rec) },
          { label: 'Progression points', value: String(prog) },
          { label: 'Recurrence bands', value: '0 / 1–4 / 5–9 / 10–17' },
          { label: 'Progression bands', value: '0 / 2–6 / 7–13 / 14–23' },
        ],
        recommendations: [
          'Single immediate postop intravesical chemotherapy when indicated',
          'BCG induction/maintenance for intermediate–high risk',
          'Re-resection for T1 / high-grade incomplete resection',
        ],
      };
    },
    evidence: {
      summary:
        'EORTC GU group scoring for NMIBC recurrence and progression based on number, size, prior recurrence, T stage, CIS, and grade.',
      formula: 'Separate weighted sums for recurrence (0–17) and progression (0–23)',
      validation:
        'Sylvester et al. tables widely used; modern EAU risk groups and WHO 2004/2016 grading refine practice.',
      references: [
        {
          title: 'Predicting recurrence and progression in individual patients with stage Ta T1 bladder cancer using EORTC risk tables',
          citation: 'Sylvester RJ et al. Eur Urol. 2006;49:466-477',
          year: 2006,
          pmid: '16442208',
          doi: '10.1016/j.eururo.2005.12.031',
        },
      ],
    },
    nextSteps: [
      { condition: 'Low risk', actions: ['Surveillance cystoscopy schedule', 'Single instillation if eligible'] },
      { condition: 'Intermediate–high', actions: ['Intravesical BCG or chemo', 'Restaging TURBT if indicated'] },
    ],
    pearls: [
      'Original tables used 1973 WHO grade; map high-grade carefully.',
      'CUETO score better calibrated after BCG; EORTC after chemo-era data.',
    ],
  },

  {
    id: 'stone-score',
    name: 'STONE Score (Ureteral Stone)',
    shortName: 'STONE',
    description:
      'Clinical score predicting likelihood of ureteral stone on CT in patients with suspected renal colic.',
    category: 'urology',
    tags: ['stone', 'ureteral', 'renal colic', 'flank pain', 'urology'],
    whenToUse:
      'ED patients with flank pain / suspected ureterolithiasis when estimating pre-CT stone probability.',
    whyUse:
      'May support selective imaging or ultrasound-first strategies when score is high and infection is absent.',
    inputs: [
      selectInput('sex', 'Sex', [
        { label: 'Female (0)', value: 0 },
        { label: 'Male (2)', value: 2 },
      ]),
      selectInput('timing', 'Timing (duration of pain to presentation)', [
        { label: '>24 hours (0)', value: 0 },
        { label: '6–24 hours (1)', value: 1 },
        { label: '<6 hours (3)', value: 3 },
      ]),
      selectInput('origin', 'Origin (race / ethnicity as in original US score)', [
        { label: 'Black / African American (0)', value: 0 },
        { label: 'Non-Black (3)', value: 3 },
      ], 3, 'Original derivation used race as a predictor; apply carefully and avoid inequitable care'),
      selectInput('nauseaPts', 'Nausea / vomiting', [
        { label: 'Neither (0)', value: 0 },
        { label: 'Nausea alone (1)', value: 1 },
        { label: 'Vomiting alone or both (2)', value: 2 },
      ]),
      selectInput('hematuria', 'Hematuria on urine dipstick', [
        { label: 'Absent (0)', value: 0 },
        { label: 'Present (3)', value: 3 },
      ]),
    ],
    calculate(values) {
      const score =
        num(values.sex) +
        num(values.timing) +
        num(values.origin) +
        num(values.nauseaPts) +
        num(values.hematuria);
      const r = riskFromThresholds(score, [
        {
          max: 5,
          level: 'low',
          label: 'Low probability (0–5)',
          interpretation: `STONE ${score}: low likelihood of ureteral stone in derivation (~10%). Consider alternate diagnoses (AAA, pyelo, appendicitis, gyn) and lower threshold for broader imaging.`,
        },
        {
          max: 9,
          level: 'moderate',
          label: 'Moderate probability (6–9)',
          interpretation: `STONE ${score}: moderate probability (~50% range). Shared decision on CT vs US; rule out infection/complicated stone.`,
        },
        {
          max: 13,
          level: 'high',
          label: 'High probability (10–13)',
          interpretation: `STONE ${score}: high probability of stone (~80%+ in original). If no fever/infection signs and pain controlled, US or delayed CT strategies may be reasonable per local protocol.`,
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'Components', value: 'Sex, Timing, Origin, Nausea, Erythrocytes' },
          { label: 'Range', value: '0–13' },
        ],
      };
    },
    evidence: {
      summary:
        'STONE score (Moore et al.): Sex (male +2), Timing of pain, Origin (non-Black +3), Nausea/vomiting, Erythrocytes (hematuria +3); low 0–5, moderate 6–9, high 10–13.',
      formula: 'Sum 0–13',
      validation:
        'Derived/validated in US ED cohorts; external performance mixed — never ignore AAA, infection, or pregnancy-specific pathways.',
      references: [
        {
          title: 'Derivation and validation of a clinical prediction rule for uncomplicated ureteral stone—the STONE score',
          citation: 'Moore CL et al. BMJ. 2014;348:g2191',
          year: 2014,
          pmid: '24671981',
          doi: '10.1136/bmj.g2191',
        },
      ],
    },
    nextSteps: [
      { condition: 'Any suspected stone', actions: ['UA / culture if infection', 'Analgesia', 'Pregnancy test in women'] },
      { condition: 'Fever / solitary kidney / anuria', actions: ['Urgent urology', 'Decompression if obstructed infected stone'] },
    ],
    pearls: [
      'Score does not apply well if infection or atypical features dominate.',
      'Race coefficient is controversial — do not let it reduce care quality.',
    ],
  },
];
