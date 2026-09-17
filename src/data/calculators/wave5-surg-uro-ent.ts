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
          description: 'Surgical, endoscopic, or radiologic intervention not under GA (e.g. IR drain under local/sedation)',
        },
        {
          label: 'IIIb — Intervention under general anesthesia',
          value: 4,
          description: 'Return to OR or major endoscopy/IR under general anesthesia',
        },
        {
          label: 'IVa — Single-organ dysfunction (ICU; includes dialysis)',
          value: 5,
          description: 'Life-threatening single-organ dysfunction requiring ICU (includes dialysis)',
        },
        {
          label: 'IVb — Multiorgan dysfunction',
          value: 6,
          description: 'Life-threatening multiorgan dysfunction requiring ICU',
        },
        {
          label: 'V — Death of the patient',
          value: 7,
          description: 'Postoperative death attributable to a complication, regardless of prior interventions',
        },
      ], undefined, 'Grade by the single most intensive therapy required. If several complications coexist, record the highest grade. Allowed grade I drugs: antiemetics, antipyretics, analgesics, diuretics, electrolytes.'),
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
    name: 'P-POSSUM Mortality',
    shortName: 'P-POSSUM',
    description:
      'Portsmouth-POSSUM logistic 30-day mortality from the full 12 physiologic and 6 operative Copeland variables.',
    category: 'surgery',
    tags: ['p-possum', 'possum', 'surgical risk', 'mortality', 'perioperative'],
    whenToUse:
      'Adults undergoing emergency or elective surgery when a P-POSSUM mortality estimate is useful for audit or shared decision-making.',
    whyUse:
      'P-POSSUM recalibrated POSSUM to reduce over-prediction of death in low-risk patients, using complete physiologic and operative scores.',
    inputs: [
      selectInput('age', 'Age', [
        { label: '≤60 (1)', value: 1, description: 'Age ≤60 years' },
        { label: '61–70 (2)', value: 2, description: 'Age 61–70 years' },
        { label: '≥71 (4)', value: 4, description: 'Age ≥71 years' },
      ], undefined, 'Chronologic age in years at the time of surgery.'),
      selectInput('cardiac', 'Cardiac signs', [
        { label: 'No failure (1)', value: 1, description: 'No cardiac failure and no diuretic / digoxin / antianginal / antihypertensive therapy' },
        { label: 'Diuretic / digoxin / antianginal (2)', value: 2, description: 'Diuretic, digoxin, antianginal, or antihypertensive therapy' },
        { label: 'Edema / warfarin (4)', value: 4, description: 'Peripheral edema, warfarin, or borderline cardiomegaly' },
        { label: 'Raised JVP (8)', value: 8, description: 'Raised JVP and/or cardiomegaly' },
      ], 1, 'POSSUM cardiac: 2 = diuretic/digoxin/antianginal/antihypertensive; 4 = peripheral edema, warfarin, or borderline cardiomegaly; 8 = raised JVP and/or cardiomegaly.'),
      selectInput('resp', 'Respiratory history', [
        { label: 'No dyspnea (1)', value: 1, description: 'No dyspnea on exertion' },
        { label: 'Dyspnea on exertion / mild COPD (2)', value: 2, description: 'Dyspnea on exertion or mild COPD' },
        { label: 'Limiting dyspnea / moderate COPD (4)', value: 4, description: 'Limiting dyspnea (one flight of stairs) or moderate COPD' },
        { label: 'Dyspnea at rest (8)', value: 8, description: 'Dyspnea at rest, fibrosis, or consolidation' },
      ], 1, 'POSSUM respiratory: 4 = limiting dyspnea (one flight of stairs) or moderate COPD; 8 = dyspnea at rest, fibrosis, or consolidation.'),
      selectInput('sbp', 'Systolic BP (mmHg)', [
        { label: '110–130 (1)', value: 1 },
        { label: '100–109 or 131–170 (2)', value: 2 },
        { label: '≥171 or 90–99 (4)', value: 4 },
        { label: '≤89 (8)', value: 8 },
      ], undefined, 'Systolic BP in mmHg. Both high and low values raise the score.'),
      selectInput('pulse', 'Pulse (bpm)', [
        { label: '50–80 (1)', value: 1 },
        { label: '40–49 or 81–100 (2)', value: 2 },
        { label: '101–120 (4)', value: 4 },
        { label: '≥121 or ≤39 (8)', value: 8 },
      ], undefined, 'Heart rate in beats per minute. Both tachycardia and severe bradycardia raise the score.'),
      selectInput('gcs', 'GCS', [
        { label: '15 (1)', value: 1, description: 'GCS 15 (E4 V5 M6) — alert, oriented, obeys' },
        { label: '12–14 (2)', value: 2, description: 'GCS 12–14' },
        { label: '9–11 (4)', value: 4, description: 'GCS 9–11' },
        { label: '≤8 (8)', value: 8, description: 'GCS ≤8 (coma range)' },
      ], undefined, 'Glasgow Coma Scale sum (eye + verbal + motor). Intubated: score best motor and eye; do not invent a verbal score — use the recorded GCS.'),
      selectInput('urea', 'Urea (mmol/L) band', [
        { label: '<7.5 (1)', value: 1, description: 'Urea <7.5 mmol/L (BUN ≈ <21 mg/dL)' },
        { label: '7.5–10 (2)', value: 2, description: 'Urea 7.5–10 mmol/L (BUN ≈ 21–28 mg/dL)' },
        { label: '10.1–15 (4)', value: 4, description: 'Urea 10.1–15 mmol/L (BUN ≈ 28–42 mg/dL)' },
        { label: '>15 (8)', value: 8, description: 'Urea >15 mmol/L (BUN ≈ >42 mg/dL)' },
      ], undefined, 'Enter SI urea in mmol/L. BUN mg/dL ≈ urea mmol/L × 2.8. 7.5 mmol/L ≈ 21 mg/dL BUN; 10 ≈ 28; 15 ≈ 42.'),
      selectInput('wbc', 'WBC (×10⁹/L)', [
        { label: '4–10 (1)', value: 1 },
        { label: '10.1–20 or 3.1–3.9 (2)', value: 2 },
        { label: '≥20.1 or ≤3 (4)', value: 4 },
      ], undefined, 'White cell count in ×10⁹/L: 4–10 scores 1, 10.1–20 or 3.1–3.9 scores 2, and ≥20.1 or ≤3 scores 4 points.'),
      selectInput('hb', 'Hemoglobin (g/dL)', [
        { label: '13–16 (1)', value: 1 },
        { label: '11.5–12.9 or 16.1–17 (2)', value: 2 },
        { label: '10–11.4 or 17.1–18 (4)', value: 4 },
        { label: '≤9.9 or ≥18.1 (8)', value: 8 },
      ], undefined, 'Hemoglobin in g/dL: 13–16 scores 1, 11.5–12.9 or 16.1–17 scores 2, 10–11.4 or 17.1–18 scores 4, and ≤9.9 or ≥18.1 scores 8 points.'),
      selectInput('sodium', 'Sodium (mmol/L)', [
        { label: '≥136 (1)', value: 1, description: 'Na ≥136 mmol/L' },
        { label: '131–135 (2)', value: 2, description: 'Na 131–135 mmol/L' },
        { label: '126–130 (4)', value: 4, description: 'Na 126–130 mmol/L' },
        { label: '≤125 (8)', value: 8, description: 'Na ≤125 mmol/L' },
      ], undefined, 'Copeland physiologic sodium (mmol/L).'),
      selectInput('potassium', 'Potassium (mmol/L)', [
        { label: '3.5–5.0 (1)', value: 1, description: 'K 3.5–5.0 mmol/L' },
        { label: '3.2–3.4 or 5.1–5.3 (2)', value: 2, description: 'K 3.2–3.4 or 5.1–5.3 mmol/L' },
        { label: '2.9–3.1 or 5.4–5.9 (4)', value: 4, description: 'K 2.9–3.1 or 5.4–5.9 mmol/L' },
        { label: '≤2.8 or ≥6.0 (8)', value: 8, description: 'K ≤2.8 or ≥6.0 mmol/L' },
      ], undefined, 'Copeland physiologic potassium (mmol/L).'),
      selectInput('ecg', 'ECG', [
        { label: 'Normal (1)', value: 1, description: 'Normal sinus rhythm; no ischaemic changes' },
        { label: 'AF rate 60–90 (4)', value: 4, description: 'Atrial fibrillation with ventricular rate 60–90 /min' },
        { label: 'Other abnormal rhythm / ectopics / Q waves / ST–T (8)', value: 8, description: 'Any other abnormal rhythm, ≥5 ventricular ectopics/min, Q waves, or ST/T-wave changes' },
      ], undefined, 'Copeland ECG: 1 = normal; 4 = AF 60–90; 8 = other abnormal rhythm, ≥5 ectopics/min, Q waves, or ST/T changes. No 2-point ECG band.'),
      selectInput('opMagnitude', 'Operation magnitude', [
        { label: 'Minor (1)', value: 1, description: 'Hernia, varicose veins, minor perianal/scrotal' },
        { label: 'Moderate (2)', value: 2, description: 'Appendectomy, cholecystectomy, mastectomy, TURP' },
        { label: 'Major (4)', value: 4, description: 'Laparotomy, bowel resection, CBD exploration, major amputation' },
        { label: 'Major+ (8)', value: 8, description: 'Aortic, APR, Whipple, liver resection, esophagectomy' },
      ], 1, 'Copeland POSSUM examples: Minor = hernia, varicose veins, minor perianal/scrotal; Moderate = appendectomy, cholecystectomy, mastectomy, TURP; Major = laparotomy, bowel resection, CBD exploration, major amputation; Major+ = aortic, APR, Whipple, liver resection, esophagectomy.'),
      selectInput('procedures', 'Number of procedures', [
        { label: '1 (1)', value: 1, description: 'Single procedure this sitting' },
        { label: '2 (2)', value: 2, description: 'Two procedures this sitting' },
        { label: '>2 (4)', value: 4, description: 'More than two procedures this sitting' },
      ], undefined, 'Count of procedures performed at this operation (not lifetime).'),
      selectInput('bloodLoss', 'Blood loss (mL)', [
        { label: '≤100 (1)', value: 1 },
        { label: '101–500 (2)', value: 2 },
        { label: '501–999 (4)', value: 4 },
        { label: '≥1000 (8)', value: 8 },
      ], undefined, 'Operative blood loss in mL: ≤100 scores 1, 101–500 scores 2, 501–999 scores 4, and ≥1000 scores 8 points. Estimate from the anesthetic record.'),
      selectInput('peritoneal', 'Peritoneal soiling', [
        { label: 'None (1)', value: 1, description: 'No peritoneal contamination' },
        { label: 'Minor (serous) (2)', value: 2, description: 'Serous fluid only; no pus or bowel content' },
        { label: 'Local pus (4)', value: 4, description: 'Localized collection of pus' },
        { label: 'Free bowel content / pus / blood (8)', value: 8, description: 'Free intraperitoneal bowel content, pus, or blood' },
      ], undefined, 'POSSUM peritoneal soiling: none = 1; serous fluid = 2; local pus = 4; free bowel content, pus, or blood = 8.'),
      selectInput('malignancy', 'Malignancy', [
        { label: 'None (1)', value: 1, description: 'No malignancy found or known' },
        { label: 'Primary only (2)', value: 2, description: 'Primary tumor only; no nodal or distant spread' },
        { label: 'Nodal mets (4)', value: 4, description: 'Regional nodal metastases; no distant mets' },
        { label: 'Distant mets (8)', value: 8, description: 'Distant (visceral or extra-regional) metastases' },
      ], undefined, 'Highest known extent of malignancy at this operation.'),
      selectInput('timing', 'Mode of surgery', [
        { label: 'Elective (1)', value: 1, description: 'Booked elective case' },
        { label: 'Emergency resuscitation ≥2 h possible (4)', value: 4, description: 'Emergency, but ≥2 h available for resuscitation before knife-to-skin' },
        { label: 'Emergency immediate (<2 h) (8)', value: 8, description: 'Immediate emergency; <2 h to theater' },
      ], undefined, 'Elective = booked. Emergency with ≥2 h to resuscitate = 4. Immediate (<2 h) = 8.'),
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
        num(values.hb) +
        num(values.sodium) +
        num(values.potassium) +
        num(values.ecg);
      const op =
        num(values.opMagnitude) +
        num(values.procedures) +
        num(values.bloodLoss) +
        num(values.peritoneal) +
        num(values.malignancy) +
        num(values.timing);
      const logit = -9.065 + 0.1692 * phys + 0.155 * op;
      const mort = round((1 / (1 + Math.exp(-logit))) * 100, 1);
      const r = riskFromThresholds(mort, [
        {
          max: 5,
          level: 'low',
          label: 'Lower predicted mortality',
          interpretation: `P-POSSUM predicted mortality ~${mort}% (PS ${phys}, OS ${op}). Still optimize comorbidities; institutional NELA/ACS-NSQIP may complement consent.`,
        },
        {
          max: 15,
          level: 'moderate',
          label: 'Moderate predicted mortality',
          interpretation: `P-POSSUM predicted mortality ~${mort}%. Senior review, level-2/3 postop care planning, shared decision-making.`,
        },
        {
          max: 100,
          level: 'high',
          label: 'High predicted mortality',
          interpretation: `P-POSSUM predicted mortality ~${mort}%. High-risk pathway: ICU, consider less invasive options, frank goals discussion.`,
        },
      ]);
      return {
        score: mort,
        unit: '%',
        ...r,
        details: [
          { label: 'Physiologic score (12 variables)', value: String(phys) },
          { label: 'Operative score (6 variables)', value: String(op) },
        ],
        recommendations: [
          'Use alongside NELA / ACS-NSQIP when available',
          'Document discussion of risk vs benefit',
        ],
      };
    },
    evidence: {
      summary:
        'P-POSSUM uses the complete Copeland 12-variable physiologic score (including Na, K, ECG) and 6-variable operative score: ln[R/(1−R)] = −9.065 + 0.1692·PS + 0.1550·OS.',
      formula: 'R = 1/(1+e^(−(−9.065 + 0.1692·PS + 0.155·OS))); PS min 12, OS min 6',
      validation:
        'P-POSSUM is widely used for surgical audit; individual consent should still incorporate clinical judgment and local outcomes.',
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
      'ECG has no 2-point band: normal = 1, AF 60–90 = 4, other abnormal rhythm/Q waves/ST–T = 8.',
    ],
  },

  {
    id: 'sort-score',
    name: 'SORT — Surgical Outcome Risk Tool (30-day mortality)',
    shortName: 'SORT',
    description:
      'Protopapa 2014 SORT logistic model for 30-day mortality after non-cardiac, non-neurologic surgery (NCEPOD).',
    category: 'surgery',
    tags: ['sort', 'surgical risk', 'mortality', 'asa', 'preoperative'],
    whenToUse:
      'Adults undergoing non-cardiac, non-neurologic surgery when a UK SORT 30-day mortality estimate is useful.',
    whyUse:
      'SORT was derived from NCEPOD data using six routinely available preoperative variables.',
    inputs: [
      selectInput('asa', 'ASA physical status', [
        { label: 'ASA I (0)', value: 1, description: 'Healthy patient — coefficient 0' },
        { label: 'ASA II (0)', value: 2, description: 'Mild systemic disease — coefficient 0 (same as ASA I)' },
        { label: 'ASA III (+1.411)', value: 3, description: 'Severe systemic disease' },
        { label: 'ASA IV (+2.388)', value: 4, description: 'Severe systemic disease that is a constant threat to life' },
        { label: 'ASA V (+4.081)', value: 5, description: 'Moribund; not expected to survive without the operation' },
      ], 1, 'Published SORT: ASA I–II = 0; ASA III = 1.411; ASA IV = 2.388; ASA V = 4.081. ASA II does not receive a coefficient.'),
      selectInput('urgency', 'Urgency', [
        { label: 'Elective (0)', value: 'elective', description: 'NCEPOD: booked, planned admission' },
        { label: 'Expedited (+1.236)', value: 'expedited', description: 'NCEPOD: days; not immediately life-threatening' },
        { label: 'Urgent (+1.657)', value: 'urgent', description: 'NCEPOD: hours; acute threat to life, limb, or organ' },
        { label: 'Immediate (+2.452)', value: 'immediate', description: 'NCEPOD: minutes; life/limb/organ-saving' },
      ], 'elective', 'NCEPOD time-to-theatre: Immediate = minutes; Urgent = hours; Expedited = days; Elective = booked.'),
      selectInput('severity', 'Surgical severity', [
        { label: 'Minor (0)', value: 'minor', description: 'e.g. EUA, abscess drainage, cast' },
        { label: 'Intermediate (0)', value: 'intermediate', description: 'e.g. inguinal hernia, varicose veins, tonsillectomy' },
        { label: 'Major (0)', value: 'major', description: 'e.g. many arthroplasties, thyroidectomy — not extra-major' },
        { label: 'Xmajor / complex (+0.381)', value: 'xmajor', description: 'Extra-major / complex (e.g. major colorectal resection, complex major intra-abdominal)' },
      ], 'minor', 'Only Xmajor/complex scores 0.381. Minor, intermediate, and major are 0 in the published SORT model.'),
      yesNo('highRiskSpecialty', 'High-risk specialty (GI, thoracic, vascular)', null,
        'SORT high-risk specialties: gastrointestinal, thoracic, or vascular surgery (coefficient 0.712). Not ortho, gyn, breast, ENT, or plastics.'),
      yesNo('cancer', 'Surgery for cancer', null,
        'The operation is being performed for a malignant diagnosis (coefficient 0.667).'),
      numberInput('age', 'Age', { unit: 'years', min: 16, max: 110, step: 1, exampleValue: 65, helpText: 'Categorical in SORT: <65 = 0; 65–79 = 0.777; ≥80 = 1.591 (not a per-year coefficient).' }),
    ],
    calculate(values) {
      const asa = num(values.asa, 1);
      const age = num(values.age, 65);
      const urgency = String(values.urgency ?? 'elective');
      const severity = String(values.severity ?? 'minor');
      // Protopapa Br J Surg 2014 Table 4 / BJA restatement
      let logit = -7.366;
      const asaCoef: Record<number, number> = { 1: 0, 2: 0, 3: 1.411, 4: 2.388, 5: 4.081 };
      logit += asaCoef[asa] ?? 0;
      const urgCoef: Record<string, number> = {
        elective: 0,
        expedited: 1.236,
        urgent: 1.657,
        immediate: 2.452,
      };
      logit += urgCoef[urgency] ?? 0;
      // Only Xmajor/complex scores; treat legacy "major" as 0 unless mapped to xmajor
      if (severity === 'xmajor' || severity === 'complex') logit += 0.381;
      if (bool(values.highRiskSpecialty)) logit += 0.712;
      if (bool(values.cancer)) logit += 0.667;
      if (age >= 80) logit += 1.591;
      else if (age >= 65) logit += 0.777;
      const mort = round((1 / (1 + Math.exp(-logit))) * 100, 2);
      const r = riskFromThresholds(mort, [
        {
          max: 1,
          level: 'low',
          label: 'Lower predicted 30-day mortality',
          interpretation: `SORT 30-day mortality ${mort}%. Routine perioperative pathway if otherwise well.`,
        },
        {
          max: 5,
          level: 'moderate',
          label: 'Moderate predicted mortality',
          interpretation: `SORT 30-day mortality ${mort}%. Consider enhanced monitoring, medical optimization, and shared decision-making.`,
        },
        {
          max: 100,
          level: 'high',
          label: 'Higher predicted mortality',
          interpretation: `SORT 30-day mortality ${mort}%. High-risk clinic / critical care outreach; reassess necessity and invasiveness of surgery.`,
        },
      ]);
      return {
        score: mort,
        unit: '%',
        ...r,
        details: [
          { label: 'SORT 30-day mortality', value: `${mort}%` },
          { label: 'ASA', value: String(asa) },
          { label: 'Urgency', value: urgency },
          { label: 'Severity', value: severity },
          { label: 'Age band', value: age >= 80 ? '≥80' : age >= 65 ? '65–79' : '<65' },
        ],
      };
    },
    evidence: {
      summary:
        'SORT (Protopapa 2014): ln(R/(1−R)) = −7.366 + 1.411·ASA3 + 2.388·ASA4 + 4.081·ASA5 + 1.236·expedited + 1.657·urgent + 2.452·immediate + 0.712·high-risk specialty + 0.381·Xmajor/complex + 0.667·cancer + 0.777·age 65–79 + 1.591·age ≥80. ASA I–II = 0. Age is categorical. Only extra-major/complex surgery scores 0.381.',
      formula:
        'ln(R/(1−R)) = −7.366 + ASA + urgency + 0.712·high-risk specialty + 0.381·Xmajor/complex + 0.667·cancer + age band; R = 30-day mortality',
      validation:
        'NCEPOD derivation/validation (AUC 0.91 in validation). Excludes cardiac and neurosurgery.',
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
      'ASA I and II both contribute 0; only Xmajor/complex (not intermediate or major) adds 0.381.',
      'Age is categorical (<65 / 65–79 / ≥80), not a per-year coefficient.',
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
      numberInput('age', 'Age', { unit: 'years', min: 16, max: 110, exampleValue: 70, helpText: 'Age in years at operation; older age is one of the strongest NELA mortality drivers and enters the official model continuously.' }),
      selectInput('asa', 'ASA', [
        { label: 'I–II', value: 1, description: 'ASA I healthy or II mild systemic disease' },
        { label: 'III', value: 2, description: 'ASA III severe systemic disease' },
        { label: 'IV–V', value: 3, description: 'ASA IV constant threat to life, or V moribund' },
      ], undefined, 'ASA physical status: I healthy; II mild systemic disease; III severe systemic disease; IV constant threat to life; V moribund.'),
      selectInput('pulse', 'Heart rate', [
        { label: '<100', value: 0, description: 'Heart rate <100 bpm' },
        { label: '100–120', value: 1, description: 'Heart rate 100–120 bpm' },
        { label: '>120', value: 2, description: 'Heart rate >120 bpm' },
      ], undefined, 'Heart rate in beats per minute at assessment for laparotomy.'),
      selectInput('sbp', 'Systolic BP', [
        { label: '≥100 mmHg', value: 0 },
        { label: '90–99', value: 1 },
        { label: '<90', value: 2 },
      ], undefined, 'Systolic BP on admission or at the time of the decision to operate: ≥100 mmHg, 90–99, or <90 — hypotension adds the most physiology points.'),
      selectInput('gcs', 'GCS', [
        { label: '15', value: 0, description: 'GCS 15 (E4 V5 M6) — alert, oriented, obeys' },
        { label: '12–14', value: 1, description: 'GCS 12–14' },
        { label: '<12', value: 2, description: 'GCS <12' },
      ], undefined, 'Glasgow Coma Scale sum (eye + verbal + motor).'),
      selectInput('urea', 'Urea', [
        { label: '<10 mmol/L', value: 0, description: 'Urea <10 mmol/L (BUN ≈ <28 mg/dL)' },
        { label: '10–20', value: 1, description: 'Urea 10–20 mmol/L (BUN ≈ 28–56 mg/dL)' },
        { label: '>20', value: 2, description: 'Urea >20 mmol/L (BUN ≈ >56 mg/dL)' },
      ], undefined, 'SI urea in mmol/L. BUN mg/dL ≈ urea mmol/L × 2.8.'),
      selectInput('wbc', 'WBC', [
        { label: '4–12 ×10⁹/L', value: 0 },
        { label: 'Abnormal mild (2–3.9 or 12.1–20)', value: 1 },
        { label: 'Markedly abnormal (<2 or >20)', value: 2 },
      ], undefined, 'WBC in ×10⁹/L as a NELA physiology marker: 4–12 normal, mild abnormality (2–3.9 or 12.1–20), or marked (<2 or >20).'),
      selectInput('soiling', 'Peritoneal soiling', [
        { label: 'None / serous', value: 0, description: 'No contamination, or serous fluid only' },
        { label: 'Local pus', value: 1, description: 'Localized collection of pus' },
        { label: 'Free bowel content / pus / blood', value: 2, description: 'Free intraperitoneal bowel content, pus, or blood' },
      ], undefined, 'Highest degree of peritoneal contamination found or expected.'),
      yesNo('malignancy', 'Malignancy present', 1,
        'Any malignancy relevant to this presentation (primary or metastatic).'),
      yesNo('immediate', 'Immediate surgery (<2 h)', 1,
        'Knife-to-skin required in <2 hours (NELA/NCEPOD immediate).'),
      yesNo('lactateHigh', 'Lactate ≥2 mmol/L (if known)', 1,
        'Arterial or venous lactate ≥2 mmol/L. Leave No if not measured.'),
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
          title: 'NELA risk calculator — official audit resources',
          citation: 'NELA Project Team. Royal College of Anaesthetists / RCS England',
          year: 2018,
          url: 'https://www.nela.org.uk/nela-risk-calculator-explainers',
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
    name: 'Gupta 2011 Periop Cardiac-Risk Checklist (Educational)',
    shortName: 'Gupta factors',
    description:
      'Educational checklist of Gupta 2011 MICA predictor domains (age, functional status, ASA, creatinine, procedure type). Does not compute a MICA percentage — official NSQIP MICA is procedure-specific.',
    category: 'cardiology',
    tags: ['gupta', 'mica', 'perioperative', 'mi', 'cardiac risk', 'nsqip', 'checklist'],
    whenToUse:
      'Preoperative review of Gupta 2011 cardiac-risk domains before noncardiac surgery. Not a substitute for the ACS-NSQIP MICA calculator.',
    whyUse:
      'Gupta MICA (Circulation 2011) predicts inpatient MI or cardiac arrest from NSQIP variables and often outperforms RCRI, but the published model uses procedure-specific intercepts that this checklist does not apply.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 18, max: 100, exampleValue: 65, helpText: 'Gupta uses continuous age in the official logistic; this checklist does not convert age into a MICA %.' }),
      selectInput('functional', 'Functional status', [
        { label: 'Independent', value: 0, description: 'No human help for any ADLs; devices (cane, walker) still count as independent' },
        { label: 'Partially dependent', value: 1, description: 'Some human help for ADLs in the 30 days before surgery' },
        { label: 'Totally dependent', value: 2, description: 'Total assistance for all ADLs' },
      ], 0, 'NSQIP 30 days pre-op: Independent = no human help for any ADLs (devices OK); Partially dependent = some human help for ADLs; Totally dependent = total assistance for all ADLs.'),
      selectInput('asa', 'ASA class', [
        { label: 'ASA I', value: 1, description: 'Healthy patient' },
        { label: 'ASA II', value: 2, description: 'Mild systemic disease' },
        { label: 'ASA III', value: 3, description: 'Severe systemic disease' },
        { label: 'ASA IV', value: 4, description: 'Severe systemic disease that is a constant threat to life' },
        { label: 'ASA V', value: 5, description: 'Moribund; not expected to survive without the operation' },
      ], undefined, 'ASA: I healthy; II mild systemic disease; III severe systemic disease; IV constant threat to life; V moribund.'),
      selectInput('creatinine', 'Creatinine', [
        { label: 'Normal (≤1.5 mg/dL)', value: 0, description: 'Serum creatinine ≤1.5 mg/dL (≈ ≤133 µmol/L)' },
        { label: 'Elevated (>1.5 mg/dL)', value: 1, description: 'Serum creatinine >1.5 mg/dL (≈ >133 µmol/L)' },
      ], undefined, 'Gupta MICA uses 1.5 mg/dL as the creatinine cut. 1.5 mg/dL ≈ 133 µmol/L.'),
      selectInput('procedure', 'Procedure type (Gupta domain)', [
        { label: 'Lower-risk examples (e.g., breast, endocrine, minor)', value: 'low' },
        { label: 'Intermediate examples (e.g., ortho, spine, gyn)', value: 'intermediate' },
        { label: 'Higher-risk examples (e.g., aortic, thoracic, major vascular)', value: 'high' },
        { label: 'Intraperitoneal / major abdominal', value: 'intraperitoneal' },
      ], undefined, 'Official Gupta MICA uses CPT/procedure-specific intercepts — these groups are educational reminders only, not intercepts.'),
    ],
    calculate(values) {
      const age = num(values.age, 65);
      const functional = num(values.functional);
      const asa = num(values.asa, 2);
      const creatElevated = num(values.creatinine) === 1;
      const procedure = String(values.procedure ?? 'low');
      const flags: string[] = [];
      if (functional === 1) flags.push('Partially dependent functional status');
      if (functional === 2) flags.push('Totally dependent functional status');
      if (asa >= 3) flags.push(`ASA ${asa}`);
      if (creatElevated) flags.push('Creatinine >1.5 mg/dL');
      if (procedure === 'high' || procedure === 'intraperitoneal') {
        flags.push(procedure === 'high' ? 'Higher-risk procedure group' : 'Intraperitoneal / major abdominal procedure group');
      }
      const n = flags.length;
      let riskLevel: 'info' | 'moderate' | 'high' = 'info';
      let label = 'Educational domain review — not a MICA %';
      let interpretation =
        'Checklist of Gupta 2011 predictor domains only. This tool does not output a myocardial infarction or cardiac arrest probability. Use the ACS-NSQIP surgical risk calculator / official Gupta MICA for a procedure-specific % if a numeric estimate is needed.';
      if (n >= 3) {
        riskLevel = 'high';
        label = 'Several higher-risk domains present — not a MICA %';
        interpretation =
          `${n} higher-risk domains flagged. This is not a Gupta/MICA percentage. Consider guideline-directed evaluation only if it would change management; use ACS-NSQIP MICA for a numeric estimate.`;
      } else if (n >= 1) {
        riskLevel = 'moderate';
        label = 'One or more higher-risk domains — not a MICA %';
        interpretation =
          `${n} higher-risk domain(s) flagged. This is not a Gupta/MICA percentage. Continue indicated cardioprotective meds; do not quote this screen as an event rate.`;
      }
      return {
        score: n === 0 ? 'No higher-risk domains flagged' : `${n} higher-risk domain(s)`,
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Age', value: `${age} years` },
          { label: 'Functional status', value: functional === 2 ? 'Totally dependent' : functional === 1 ? 'Partially dependent' : 'Independent' },
          { label: 'ASA', value: String(asa) },
          { label: 'Creatinine', value: creatElevated ? '>1.5 mg/dL' : '≤1.5 mg/dL' },
          { label: 'Procedure group', value: procedure },
          { label: 'Numeric MICA %', value: 'Not calculated — procedure-specific intercepts required' },
        ],
        recommendations: [
          'Do not quote a MICA percentage from this checklist',
          'Use ACS-NSQIP / official Gupta MICA for procedure-specific probability',
          'RCRI remains a complementary clinical score',
        ],
      };
    },
    evidence: {
      summary:
        'Gupta et al. (Circulation 2011) derived a NSQIP logistic model for perioperative MI or cardiac arrest using age, functional status, ASA class, creatinine, and procedure type. The published model is procedure-specific (CPT intercepts). This module is an educational checklist of those domains and does not apply unpublished or invented intercepts, so it does not report a MICA %.',
      formula: 'No numeric MICA probability. Official model: procedure-specific intercept + coefficients for age, functional status, ASA, and creatinine.',
      validation:
        'Original Gupta MICA C-statistic ~0.88; always prefer ACS-NSQIP / published procedure-specific calculator for clinical percentages.',
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
      { condition: 'All patients', actions: ['Do not quote a MICA % from this checklist', 'Continue indicated cardioprotective meds'] },
      { condition: 'Higher-risk domains present', actions: ['Use ACS-NSQIP MICA if a numeric estimate is needed', 'Review active cardiac conditions', 'Anesthesia planning'] },
    ],
    pearls: [
      'Official Gupta MICA is procedure-specific; a generic intercept cannot produce a valid %.',
      'MICA endpoint is inpatient MI or cardiac arrest — different from RCRI (which includes pulmonary edema, complete heart block, VF).',
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
      ], undefined, 'Age: 50 or younger scores 0, 51–80 scores 3, and over 80 scores 16 points — the largest single ARISCAT weight.'),
      selectInput('spo2', 'Preoperative SpO₂', [
        { label: '≥96% (0)', value: 0 },
        { label: '91–95% (8)', value: 8 },
        { label: '≤90% (24)', value: 24 },
      ], undefined, 'Preoperative SpO₂: 96% or higher scores 0, 91–95% scores 8, and 90% or lower scores 24 points. Use the room-air value.'),
      yesNo('respInfection', 'Respiratory infection in the last month', 17,
        'Upper or lower respiratory infection in the past month that required treatment (not an untreated lingering cough).'),
      yesNo('anemia', 'Preoperative anemia (Hb ≤10 g/dL)', 11, 'Preoperative hemoglobin 10 g/dL or lower scores 11 points; treatable anemia often warrants evaluation before elective surgery.'),
      selectInput('incision', 'Surgical incision', [
        { label: 'Peripheral (0)', value: 0, description: 'Extremity, breast, lower abdominal/pelvic (includes laparoscopic lower abdomen)' },
        { label: 'Upper abdominal (15)', value: 15, description: 'Incision above the umbilicus' },
        { label: 'Intrathoracic (24)', value: 24, description: 'Pleural cavity entered' },
      ], 0, 'Peripheral = extremity, breast, lower abdominal/pelvic (0); Upper abdominal = incision above the umbilicus (15); Intrathoracic = pleural cavity entered (24). Lower abdominal/pelvic/laparoscopic extremity cases score as peripheral.'),
      selectInput('duration', 'Duration of surgery', [
        { label: '<2 h (0)', value: 0 },
        { label: '2–3 h (16)', value: 16 },
        { label: '>3 h (23)', value: 23 },
      ], undefined, 'Surgical duration: under 2 hours scores 0, 2–3 hours scores 16, and over 3 hours scores 23 points.'),
      yesNo('emergency', 'Emergency procedure', 8,
        'Unscheduled / emergency operation (not a booked elective case).'),
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
      'Rogers Table 5 weighted-factor subset for venous thromboembolism risk after general / vascular / thoracic surgery.',
    category: 'hematology',
    tags: ['rogers', 'vte', 'dvt', 'pe', 'postoperative', 'prophylaxis'],
    whenToUse:
      'Estimating postop VTE risk after major general or vascular surgery (educational simplified item set).',
    whyUse:
      'Rogers model was developed from Patient Safety in Surgery Study / NSQIP data for 30-day VTE.',
    inputs: [
      selectInput('opType', 'Operation type risk', [
        { label: 'Hernia / lower-risk general (2)', value: 2, description: 'Hernia or lower-risk general operation' },
        { label: 'Respiratory / hemic (9)', value: 9, description: 'Respiratory or hemic/lymphatic operation' },
        { label: 'Thoracoabdominal aneurysm / major vascular (7)', value: 7, description: 'Thoracoabdominal aneurysm, embolectomy/thrombectomy, venous reconstruction, or endovascular repair' },
        { label: 'Mouth / palate (4)', value: 4, description: 'Mouth or palate operation' },
      ], 2, 'Rogers Table 5 operation points: respiratory/hemic 9; thoracoabdominal aneurysm or major vascular 7; mouth/palate 4; hernia/lower-risk general 2.'),
      selectInput('asaWork', 'ASA class', [
        { label: 'ASA 1 (0)', value: 0 },
        { label: 'ASA 2 (1)', value: 1 },
        { label: 'ASA 3–5 (2)', value: 2 },
      ], undefined, 'ASA physical status class: ASA 1 scores 0, ASA 2 scores 1, and ASA 3–5 scores 2 points.'),
      yesNo('female', 'Female sex', 1, 'Female sex adds 1 point in the Rogers VTE model.'),
      selectInput('workRvu', 'Work RVU band (complexity)', [
        { label: '<10 (0)', value: 0, description: 'Hernia / cholecystectomy often <10' },
        { label: '10–17 (2)', value: 2 },
        { label: '>17 (3)', value: 3, description: 'Colectomy often >17' },
      ], 0, 'CMS work RVU of the principal CPT (not total RVU); hernia/chole often <10, colectomy often >17.'),
      yesNo('disseminatedCancer', 'Disseminated cancer', 2,
        'Metastatic / disseminated solid cancer present at surgery (NSQIP definition).'),
      yesNo('chemo', 'Chemotherapy for malignancy within 30 days', 2,
        'Chemotherapy for cancer in the 30 days before surgery.'),
      yesNo('preopDyspnea', 'Dyspnea (moderate or at rest)', 1,
        'Dyspnea on moderate exertion (e.g. one flight of stairs) or at rest — not only with extreme effort.'),
      yesNo('ventilator', 'Ventilator dependent preop', 2,
        'Requiring mechanical ventilation at the time of surgery (not routine intraoperative intubation).'),
      yesNo('transfusion', '≥4 units packed RBCs in the 72 hours before or during operation', 2,
        'Rogers Table 5 transfusion factor: ≥4 units of packed red blood cells within 72 hours before or during the operation.'),
      yesNo('emergency', 'Emergency operation', 1,
        'Emergency rather than elective operation.'),
      selectInput('woundClass', 'Wound class', [
        { label: 'Clean (0)', value: 0 },
        { label: 'Clean-contaminated (1)', value: 1 },
      ], 0, 'Rogers Table 5 assigns 1 point for a clean-contaminated wound.'),
      selectInput('albumin', 'Albumin', [
        { label: '≥3.5 g/dL (0)', value: 0 },
        { label: '<3.5 g/dL (1)', value: 1 },
      ], undefined, 'Albumin below 3.5 g/dL adds 1 point; use the preoperative value.'),
      selectInput('bilirubin', 'Bilirubin', [
        { label: '≤1.0 mg/dL (0)', value: 0 },
        { label: '>1.0 mg/dL (1)', value: 1 },
      ], undefined, 'Bilirubin above 1.0 mg/dL adds 1 point; a mildly elevated value from benign causes still scores.'),
      selectInput('sodium', 'Sodium', [
        { label: '≤145 mEq/L (0)', value: 0 },
        { label: '>145 mEq/L (2)', value: 2 },
      ], undefined, 'Sodium above 145 mEq/L adds 2 points — the largest single Rogers item.'),
      selectInput('hct', 'Hematocrit', [
        { label: '>38% (0)', value: 0 },
        { label: '≤38% (1)', value: 1 },
      ], undefined, 'Hematocrit 38% or lower adds 1 point; both anemia and hemoconcentration are captured elsewhere in the full model.'),
    ],
    calculate(values) {
      const score =
        num(values.opType) +
        num(values.asaWork) +
        (bool(values.female) ? 1 : 0) +
        num(values.workRvu) +
        (bool(values.disseminatedCancer) ? 2 : 0) +
        (bool(values.chemo) ? 2 : 0) +
        (bool(values.preopDyspnea) ? 1 : 0) +
        (bool(values.ventilator) ? 2 : 0) +
        (bool(values.transfusion) ? 2 : 0) +
        (bool(values.emergency) ? 1 : 0) +
        num(values.woundClass) +
        num(values.albumin) +
        num(values.bilirubin) +
        num(values.sodium) +
        num(values.hct);
      const r = riskFromThresholds(score, [
        {
          max: 6,
          level: 'low',
          label: 'Lower Rogers-style VTE risk',
          interpretation: `Rogers points ${score} (low-risk band <7; historical VTE risk ~0.1–0.5%). Use institutional Caprini/Rogers protocol; early ambulation ± mechanical prophylaxis.`,
        },
        {
          max: 10,
          level: 'moderate',
          label: 'Moderate Rogers-style VTE risk',
          interpretation: `Points ${score}: intermediate band (7–10; historical VTE risk ~0.5–1.5%). Pharmacologic prophylaxis usually indicated if bleeding risk acceptable.`,
        },
        {
          max: 50,
          level: 'high',
          label: 'Higher Rogers-style VTE risk',
          interpretation: `Points ${score}: higher risk band (>10; historical VTE risk ~1.5%+). Dual prophylaxis and extended duration per specialty guidelines.`,
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'Typical bands', value: 'Low <7; medium 7–10; high >10' },
        ],
      };
    },
    evidence: {
      summary:
        'Rogers Table 5 assigns points for operation type, ASA class, female sex, work RVU, cancer, chemotherapy, sodium, transfusion, ventilator dependence, wound class, hematocrit, bilirubin, dyspnea, albumin, and emergency operation.',
      formula: 'Sum of Rogers Table 5 weighted factors represented in the inputs',
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
      'Cancer, transfusion, emergency status, and high-complexity procedures drive risk.',
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
        { label: 'ASA 1–2 (0 points)', value: 0, description: 'ASA I healthy or II mild systemic disease' },
        { label: 'ASA 3–5 (1 point)', value: 1, description: 'ASA III–V (severe systemic disease or worse)' },
      ], undefined, '1 point if ASA ≥3.'),
      selectInput('wound', 'Wound classification', [
        { label: 'Clean or clean-contaminated (0)', value: 0, description: 'CDC class I (clean) or II (clean-contaminated — controlled entry of respiratory/GI/GU)' },
        { label: 'Contaminated or dirty/infected (1)', value: 1, description: 'CDC class III (contaminated — spillage, fresh trauma, acute nonpurulent inflammation) or IV (dirty/infected)' },
      ], undefined, '1 point if wound class is contaminated or dirty (CDC III–IV). See CDC Surgical Wound Classification calculator for definitions.'),
      yesNo('longDuration', 'Operative duration > T hours (procedure-specific cutoff)', 1,
        'T is the 75th percentile duration for that procedure in NNIS/NHSN tables. Common historical T: appendectomy ~1 h, cholecystectomy ~2 h, colon ~3 h, gastric ~3 h, CABG ~5 h. Do not use a single T for all procedures — check current NHSN procedure-duration cut points.'),
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
          title: 'Surgical wound infection rates by wound class, operative procedure, and patient risk index',
          citation: 'Culver DH et al. Am J Med. 1991;91(3B):152S-157S',
          year: 1991,
          pmid: '1656747',
          doi: '10.1016/0002-9343(91)90361-z',
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
      ], undefined, 'Class I clean (no tract entered, no inflammation), II clean-contaminated (controlled entry of respiratory/alimentary/genital/urinary tract), III contaminated (acute non-purulent inflammation, gross spillage, or major break in technique), IV dirty/infected (existing infection, perforated viscus, or old traumatic wound).'),
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
        { label: 'No (0)', value: 0, description: 'Pain did not migrate to the right lower quadrant' },
        { label: 'Yes (2)', value: 2, description: 'Pain started periumbilical or epigastric and later moved to the RLQ' },
      ], undefined, 'Classic migration: periumbilical/epigastric onset later localizing to the right lower quadrant.'),
      selectInput('rlqPain', 'RLQ pain (patient-reported)', [
        { label: 'No (0)', value: 0, description: 'No patient-reported pain localized to the right lower quadrant' },
        { label: 'Yes (2)', value: 2, description: 'Patient-reported pain localized to the right lower quadrant' },
      ], 0, 'Sammalkorpi Table 2 scores patient-reported RLQ pain +2. Score this separately from objective RLQ tenderness.'),
      selectInput('rlqTenderness', 'RLQ tenderness on examination', [
        { label: 'None (0)', value: 0, description: 'No objective tenderness in the right lower quadrant' },
        { label: 'Present — men or women ≥50 years (+3)', value: 3, description: 'Objective RLQ tenderness in a man or woman aged ≥50 years' },
        { label: 'Present — women 16–49 years (+1)', value: 1, description: 'Objective RLQ tenderness in a woman aged 16–49 years' },
      ], 0, 'Sammalkorpi Table 2 scores objective RLQ tenderness +3 for men and women ≥50 years, or +1 for women aged 16–49 years. This is separate from RLQ pain.'),
      selectInput('guarding', 'Guarding / muscular defense', [
        { label: 'None (0)', value: 0, description: 'Soft abdomen; no voluntary or involuntary guarding' },
        { label: 'Mild (2)', value: 2, description: 'Voluntary guarding' },
        { label: 'Moderate–severe (4)', value: 4, description: 'Involuntary muscular defense / rigidity' },
      ], 0, 'Mild = voluntary guarding; moderate/severe = involuntary muscular defense/rigidity.'),
      selectInput('wbcBand', 'WBC (×10⁹/L)', [
        { label: '<7.2 (0)', value: 0 },
        { label: '≥7.2 and <10.9 (1)', value: 1 },
        { label: '≥10.9 and <14.0 (2)', value: 2 },
        { label: '≥14.0 (3)', value: 3 },
      ], undefined, 'WBC in ×10⁹/L: below 7.2 scores 0, 7.2–10.8 scores 1, 10.9–13.9 scores 2, and 14.0 or higher scores 3 points.'),
      selectInput('neutPct', 'Neutrophils %', [
        { label: '<62 (0)', value: 0 },
        { label: '≥62 and <75 (2)', value: 2 },
        { label: '≥75 and <83 (3)', value: 3 },
        { label: '≥83 (4)', value: 4 },
      ], undefined, 'Neutrophil percentage: below 62 scores 0, 62–74 scores 2, 75–82 scores 3, and 83 or higher scores 4 points.'),
      selectInput('symptomDuration', 'Symptom duration', [
        { label: '<24 hours', value: 'lt24', description: 'Onset to assessment <24 h — early CRP table (high CRP can score 5 or drop to 1)' },
        { label: '>24 hours', value: 'gt24', description: 'Onset to assessment >24 h — late CRP table (CRP ≥152 scores 1)' },
      ], undefined, 'Sammalkorpi AAS CRP points are duration-specific. At exactly 24 h, use the >24 h table.'),
      numberInput('crp', 'CRP', {
        unit: 'mg/L',
        min: 0,
        max: 500,
        step: 1,
        exampleValue: 0,
        helpText:
          'Official AAS (mg/L). <24 h: <4 = 0; ≥4 and <11 = 2; ≥11 and <25 = 3; ≥25 and <83 = 5; ≥83 = 1. >24 h: <12 = 0; ≥12 and <152 = 2; ≥152 = 1 (high-CRP point drop).',
      }),
    ],
    calculate(values) {
      const crp = num(values.crp);
      const gt24 = String(values.symptomDuration) === 'gt24';
      let crpPts = 0;
      if (gt24) {
        if (crp >= 152) crpPts = 1;
        else if (crp >= 12) crpPts = 2;
      } else if (crp >= 83) crpPts = 1;
      else if (crp >= 25) crpPts = 5;
      else if (crp >= 11) crpPts = 3;
      else if (crp >= 4) crpPts = 2;
      const score =
        num(values.painMigration) +
        num(values.rlqPain) +
        num(values.rlqTenderness) +
        num(values.guarding) +
        num(values.wbcBand) +
        num(values.neutPct) +
        crpPts;
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
          { label: 'RLQ pain points', value: String(num(values.rlqPain)) },
          { label: 'RLQ tenderness points', value: String(num(values.rlqTenderness)) },
          { label: 'Symptom duration', value: gt24 ? '>24 h' : '<24 h' },
          { label: 'CRP points', value: String(crpPts) },
        ],
      };
    },
    evidence: {
      summary:
        'Adult Appendicitis Score (Sammalkorpi et al.) combines migration, separate RLQ pain and sex/age-specific RLQ tenderness, guarding, WBC, neutrophils, duration-specific CRP (including the high-CRP point drop), and the published probability cutoffs.',
      formula:
        'Sum of clinical + laboratory points. CRP <24 h: <4=0, 4–<11=2, 11–<25=3, 25–<83=5, ≥83=1. CRP >24 h: <12=0, 12–<152=2, ≥152=1.',
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
      ], undefined, 'Male sex adds 2 points to the Lintula score; the instrument was derived in children but is also studied in adults.'),
      selectInput('intensity', 'Intensity of pain', [
        { label: 'Mild or moderate (0)', value: 0, description: 'Mild or moderate pain — Lintula scores 0' },
        { label: 'Severe (2)', value: 2, description: 'Severe abdominal pain — Lintula +2 only for severe' },
      ], 0, 'Original Lintula: severe = 2; mild or moderate = 0 (no numeric VAS cut).'),
      yesNo('relocation', 'Relocation of pain', 4,
        'Pain started periumbilical or epigastric and later migrated to the RLQ.'),
      yesNo('rlqPain', 'Pain in the right lower quadrant', 4,
        'Pain localized to the RLQ (McBurney). Distinct from migration/relocation.'),
      yesNo('vomiting', 'Vomiting', 2,
        'Vomiting (not nausea alone).'),
      yesNo('fever', 'Fever (temperature ≥37.5°C / 99.5°F)', 3, 'Temperature 37.5°C (99.5°F) or higher adds 3 points; a reported fever without measurement still counts in the original instrument.'),
      yesNo('guarding', 'Guarding', 4,
        'Involuntary abdominal-wall tension over the RLQ (not voluntary splinting alone).'),
      yesNo('rebound', 'Rebound tenderness', 7,
        'Pain on sudden release of RLQ palpation (Blumberg) — greater than the pain of compression.'),
      selectInput('bowelSounds', 'Bowel sounds', [
        { label: 'Normal (0)', value: 0, description: 'Normoactive bowel sounds' },
        { label: 'Absent / tinkling / high-pitched (4)', value: 4, description: 'Absent, tinkling, or high-pitched bowel sounds' },
      ], undefined, 'Auscultate in the RLQ/abdomen: normal vs absent/tinkling/high-pitched.'),
    ],
    calculate(values) {
      const score =
        num(values.sex) +
        num(values.intensity) +
        (bool(values.relocation) ? 4 : 0) +
        (bool(values.rlqPain) ? 4 : 0) +
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
        'Lintula score (0–32): male sex, pain intensity, relocation, RLQ pain, vomiting, fever ≥37.5°C, guarding, rebound, abnormal bowel sounds — no labs.',
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
      yesNo('rlqTenderness', 'RLQ tenderness (4 points)', 4,
        'Tenderness on palpation of the right lower quadrant.'),
      yesNo('rebound', 'Rebound tenderness (3 points)', 3,
        'Pain on sudden release of RLQ palpation, greater than the pain of compression.'),
      yesNo('wbc', 'WBC >12 ×10⁹/L (2 points)', 2, 'WBC above 12 ×10⁹/L scores 2 points. The full score also includes right-lower-quadrant tenderness, rebound, and ultrasound findings; ≥8 is usually the high-probability threshold.'),
      yesNo('usPositive', 'Ultrasound positive for appendicitis (6 points)', 6,
        'Noncompressible, dilated appendix (often ≥6–7 mm) with inflammatory signs on graded-compression US; operator-dependent.'),
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
    name: 'WSES / WISS Sepsis Severity Score (cIAI)',
    shortName: 'WSES',
    description:
      'WISS Table 5 WSES Sepsis Severity Score for complicated intra-abdominal infection (range 0–18).',
    category: 'critical-care',
    tags: ['wses', 'wiss', 'sepsis', 'intra-abdominal', 'peritonitis', 'surgery'],
    whenToUse:
      'Complicated intra-abdominal infection / peritonitis when estimating WSES sepsis severity and mortality band.',
    whyUse:
      'Integrates clinical condition, setting of acquisition, origin of IAI, delay to source control, age >70, and immunosuppression.',
    inputs: [
      selectInput('condition', 'Clinical condition at admission', [
        { label: 'Neither severe sepsis nor shock (0)', value: 0, description: 'Complicated IAI without sepsis-related organ dysfunction or shock' },
        { label: 'Severe sepsis (3)', value: 3, description: 'Acute organ dysfunction at admission (SSC 2012-style) without refractory shock' },
        { label: 'Septic shock (5)', value: 5, description: 'Acute circulatory failure with persistent hypotension; always requires vasopressors' },
      ], 0, 'WISS: severe sepsis = 3 or septic shock = 5 (pick one). Shock is hypotension refractory to fluids requiring vasopressors.'),
      yesNo('healthcare', 'Healthcare-associated infection', 2,
        'HCAI = healthcare-facility associated, not community-onset.'),
      selectInput('origin', 'Origin of the IAI', [
        { label: 'Other / not listed (0) — e.g. appendicitis, cholecystitis, gastroduodenal without listed peritonitis types', value: 'other' },
        { label: 'Colonic non-diverticular perforation peritonitis (2)', value: 'colonic' },
        { label: 'Small-bowel perforation peritonitis (3)', value: 'smallbowel' },
        { label: 'Diverticular diffuse peritonitis (2)', value: 'diverticular' },
        { label: 'Postoperative diffuse peritonitis (2)', value: 'postop' },
      ], 'other', 'Table 5 origin items only. Appendicitis and other unlisted sources score 0 for origin.'),
      yesNo('delay', 'Delay in source control >24 h', 3,
        'Preoperative duration of peritonitis (localized or diffuse) >24 hours.'),
      yesNo('age70', 'Age >70 years', 2, 'WISS Table 5: age >70 (not ≥70).'),
      yesNo('immunosuppression', 'Immunosuppression', 3,
        'Chronic glucocorticoids, immunosuppressants, chemotherapy, lymphatic disease, or virus (HIV). Malignancy is not a separate WISS item.'),
    ],
    calculate(values) {
      let score = num(values.condition);
      if (bool(values.healthcare)) score += 2;
      const origin = String(values.origin ?? 'other');
      const originPts: Record<string, number> = {
        other: 0,
        colonic: 2,
        smallbowel: 3,
        diverticular: 2,
        postop: 2,
      };
      score += originPts[origin] ?? 0;
      if (bool(values.delay)) score += 3;
      if (bool(values.age70)) score += 2;
      if (bool(values.immunosuppression)) score += 3;

      const r = riskFromThresholds(score, [
        {
          max: 3,
          level: 'low',
          label: 'WSES 0–3 (~0.63% mortality)',
          interpretation: `WSES ${score} (band 0–3). WISS observed mortality 0.63%. Still ensure timely antibiotics and source control.`,
        },
        {
          max: 6,
          level: 'moderate',
          label: 'WSES 4–6 (~6.3% mortality)',
          interpretation: `WSES ${score} (band 4–6). WISS observed mortality 6.3%. Aggressive resuscitation and early OR/IR source control; ICU consideration.`,
        },
        {
          max: 18,
          level: 'high',
          label: 'WSES ≥7 (~41.7% mortality)',
          interpretation: `WSES ${score} (band ≥7). WISS observed mortality 41.7% (≥9 ~55.5%). Immediate source control and organ support.`,
        },
      ]);
      return {
        score,
        unit: 'points',
        ...r,
        details: [
          { label: 'Range', value: '0–18 (WISS Table 5)' },
          { label: 'Mortality bands', value: '0–3: 0.63% · 4–6: 6.3% · ≥7: 41.7%' },
        ],
      };
    },
    evidence: {
      summary:
        'WSES Sepsis Severity Score (Sartelli WJES 2015, WISS Table 5), range 0–18: severe sepsis 3 or septic shock 5; healthcare-associated 2; origin of IAI (colonic non-diverticular perforation 2, small-bowel perforation 3, diverticular diffuse peritonitis 2, postoperative peritonitis 2); delay >24 h 3; age >70 2; immunosuppression 3. Malignancy and individual organ-failure flags are not separate Table 5 items. Observed mortality: 0–3 0.63%, 4–6 6.3%, ≥7 41.7%.',
      formula:
        'WSES = condition (0/3/5) + 2·HCAI + origin (0/2/3) + 3·delay>24 h + 2·age>70 + 3·immunosuppression',
      validation:
        'WISS multicenter validation (n=4533); ROC best cutoff >5.5 for death (sens 89.2%, spec 83.5%).',
      references: [
        {
          title: 'Global validation of the WSES Sepsis Severity Score for patients with complicated intra-abdominal infections: a prospective multicentre study (WISS Study)',
          citation: 'Sartelli M et al. World J Emerg Surg. 2015;10:61',
          year: 2015,
          pmid: '26677396',
          doi: '10.1186/s13017-015-0055-0',
        },
      ],
    },
    nextSteps: [
      { condition: 'Any complicated IAI', actions: ['Broad-spectrum abx', 'Source control timing', 'Cultures'] },
      { condition: 'High score', actions: ['ICU', 'Damage-control laparotomy if unstable', 'MDR coverage if risk factors'] },
    ],
    pearls: [
      'Origin of IAI is scored only for the four Table 5 sources; appendicitis scores 0 for origin.',
      'Malignancy and per-organ failure flags are not WISS Table 5 items (severe sepsis/shock already captures organ dysfunction).',
      'Age cut is >70, not ≥70.',
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
        { label: 'I — Pericolic abscess or phlegmon', value: 1, description: 'Perforation contained as pericolic abscess or phlegmon; no distant abscess or free peritonitis' },
        { label: 'II — Pelvic, intra-abdominal, or retroperitoneal abscess', value: 2, description: 'Distant (pelvic, intra-abdominal, or retroperitoneal) abscess; not generalized peritonitis' },
        { label: 'III — Generalized purulent peritonitis', value: 3, description: 'Free pus throughout the peritoneal cavity; no feces' },
        { label: 'IV — Generalized fecal peritonitis', value: 4, description: 'Free fecal contamination of the peritoneal cavity' },
      ], undefined, 'Original Hinchey is an operative/pathologic stage. Grade by extent of contamination: pericolic (I) vs distant abscess (II) vs purulent peritonitis (III) vs fecal peritonitis (IV).'),
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
        { label: '0 — Mild clinical diverticulitis (CT normal or mild wall thickening)', value: 0, description: 'Clinical diverticulitis with CT normal or only mild colonic-wall thickening; no pericolic fat stranding, abscess, or perforation' },
        { label: 'Ia — Confined pericolic inflammation / phlegmon', value: 1, description: 'CT pericolic fat stranding / phlegmon without a drainable abscess' },
        { label: 'Ib — Pericolic / mesocolic abscess', value: 2, description: 'Abscess confined to pericolic or mesocolic tissues (not pelvic/distant)' },
        { label: 'II — Pelvic, distant intra-abdominal, or retroperitoneal abscess', value: 3, description: 'Abscess outside the mesocolon (pelvic, distant peritoneal, or retroperitoneal)' },
        { label: 'III — Generalized purulent peritonitis', value: 4, description: 'Free pus in the peritoneal cavity; no feces. CT may show free fluid/air without fecal contamination' },
        { label: 'IV — Fecal peritonitis', value: 5, description: 'Free fecal contamination of the peritoneal cavity (usually from an unsealed perforation)' },
      ], undefined, 'CT-oriented Wasvary/Kaiser stages. 0 = clinical only ± mild wall thickening; Ia = phlegmon without abscess; Ib = pericolic/mesocolic abscess; II = distant abscess; III = purulent peritonitis; IV = fecal peritonitis.'),
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
        { label: '1 — Normal appearing gallbladder / no adhesions', value: 1, description: 'Normal-appearing gallbladder; no adhesions to the gallbladder' },
        { label: '2 — Minor adhesions at neck only', value: 2, description: 'Minor adhesions confined to the gallbladder neck; body/fund otherwise visible' },
        { label: '3 — Hyperemia, distention, adhesions to body, or hydrops', value: 3, description: 'Hyperemia, distention, hydrops, and/or adhesions involving the gallbladder body — but most of the gallbladder still visible after limited adhesiolysis' },
        { label: '4 — Adhesions obscuring majority of gallbladder OR grade 3 + abnormal liver anatomy', value: 4, description: 'Adhesions obscure most of the gallbladder, OR grade 3 findings plus abnormal liver anatomy (cirrhosis, left-sided GB, intrahepatic GB, or severe steatosis that distorts exposure)' },
        { label: '5 — Perforation, necrosis, or inability to visualize GB due to adhesions', value: 5, description: 'Perforation, gangrene/necrosis, or adhesions so dense the gallbladder cannot be visualized' },
      ], undefined, 'Intraoperative laparoscopic appearance at the start of dissection. Grade 4 = majority of GB obscured by adhesions, or grade 3 plus abnormal liver anatomy (cirrhosis, left-sided/intrahepatic GB). Grade 5 = perforation, necrosis, or GB not visible because of adhesions.'),
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
      ], undefined, 'AAST kidney grades: I contusion or non-expanding subcapsular hematoma, II cortical laceration <1 cm or non-expanding perirenal hematoma, III laceration >1 cm without collecting-system rupture, IV laceration through the collecting system or main vessel injury with contained hemorrhage, V shattered kidney or hilar avulsion.'),
      yesNo('hemodynamicUnstable', 'Hemodynamic instability attributable to renal injury', 0,
        'SBP <90 mmHg, need for ongoing transfusion, or other shock attributed to the kidney injury (not another source).'),
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
      ], undefined, 'AAST spleen grades: I subcapsular <10% or laceration <1 cm, II subcapsular 10–50% or laceration 1–3 cm, III subcapsular >50% or laceration >3 cm, IV segmental/hilar vessel injury with >25% devascularization, V shattered spleen or total devascularization.'),
      yesNo('contrastBlush', 'Active contrast extravasation / blush on CT', 0,
        'Arterial-phase contrast blush or active extravasation from the spleen.'),
      yesNo('unstable', 'Hemodynamically unstable', 0,
        'SBP <90 mmHg, need for ongoing transfusion, or other shock attributed to splenic bleeding.'),
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
      ], undefined, 'AAST liver grades: I subcapsular <10% or laceration <1 cm, II subcapsular 10–50% or laceration 1–3 cm, III subcapsular >50% or laceration >3 cm, IV parenchymal disruption of 25–75% of a lobe, V disruption >75% of a lobe or juxtahepatic venous injury.'),
      yesNo('unstable', 'Hemodynamically unstable', 0,
        'SBP <90 mmHg, need for ongoing transfusion, or other shock attributed to hepatic bleeding.'),
      yesNo('blush', 'Active extravasation on CT', 0,
        'Arterial-phase contrast blush or active extravasation from the liver.'),
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
      'Standard AUA/ICS tool (AUA Symptom Index plus QoL item) for BPH evaluation.',
    inputs: [
      selectInput('incomplete', 'Incomplete emptying (past month)', [
        { label: 'Not at all (0)', value: 0 },
        { label: 'Less than 1 in 5 (1)', value: 1 },
        { label: 'Less than half (2)', value: 2 },
        { label: 'About half (3)', value: 3 },
        { label: 'More than half (4)', value: 4 },
        { label: 'Almost always (5)', value: 5 },
      ], 0, 'Past month: how often a sensation of not emptying the bladder completely after finishing urination? (AUA-SI item; official instrument: Barry 1992 / AUA.)'),
      selectInput('frequency', 'Frequency (<2 h between voids)', [
        { label: 'Not at all (0)', value: 0 },
        { label: 'Less than 1 in 5 (1)', value: 1 },
        { label: 'Less than half (2)', value: 2 },
        { label: 'About half (3)', value: 3 },
        { label: 'More than half (4)', value: 4 },
        { label: 'Almost always (5)', value: 5 },
      ], 0, 'Past month: how often had to urinate again less than 2 hours after finishing urination? (AUA-SI item.)'),
      selectInput('intermittency', 'Intermittency', [
        { label: 'Not at all (0)', value: 0 },
        { label: 'Less than 1 in 5 (1)', value: 1 },
        { label: 'Less than half (2)', value: 2 },
        { label: 'About half (3)', value: 3 },
        { label: 'More than half (4)', value: 4 },
        { label: 'Almost always (5)', value: 5 },
      ], 0, 'Past month: how often stopped and started again several times when urinating? (AUA-SI item.)'),
      selectInput('urgency', 'Urgency', [
        { label: 'Not at all (0)', value: 0 },
        { label: 'Less than 1 in 5 (1)', value: 1 },
        { label: 'Less than half (2)', value: 2 },
        { label: 'About half (3)', value: 3 },
        { label: 'More than half (4)', value: 4 },
        { label: 'Almost always (5)', value: 5 },
      ], 0, 'Past month: how often found it difficult to postpone urination? (AUA-SI item.)'),
      selectInput('weakStream', 'Weak stream', [
        { label: 'Not at all (0)', value: 0 },
        { label: 'Less than 1 in 5 (1)', value: 1 },
        { label: 'Less than half (2)', value: 2 },
        { label: 'About half (3)', value: 3 },
        { label: 'More than half (4)', value: 4 },
        { label: 'Almost always (5)', value: 5 },
      ], 0, 'Past month: how often had a weak urinary stream? (AUA-SI item.)'),
      selectInput('straining', 'Straining', [
        { label: 'Not at all (0)', value: 0 },
        { label: 'Less than 1 in 5 (1)', value: 1 },
        { label: 'Less than half (2)', value: 2 },
        { label: 'About half (3)', value: 3 },
        { label: 'More than half (4)', value: 4 },
        { label: 'Almost always (5)', value: 5 },
      ], 0, 'Past month: how often had to push or strain to begin urination? (AUA-SI item.)'),
      selectInput('nocturia', 'Nocturia (times per night)', [
        { label: 'None (0)', value: 0, description: 'Did not get up at night to urinate' },
        { label: '1 time (1)', value: 1, description: 'Got up 1 time' },
        { label: '2 times (2)', value: 2, description: 'Got up 2 times' },
        { label: '3 times (3)', value: 3, description: 'Got up 3 times' },
        { label: '4 times (4)', value: 4, description: 'Got up 4 times' },
        { label: '5 or more (5)', value: 5, description: 'Got up 5 or more times' },
      ], 0, 'Past month: how many times typically got up to urinate from bedtime until morning? (AUA-SI item.)'),
      selectInput('qol', 'Quality of life if symptoms continue', [
        { label: 'Delighted (0)', value: 0 },
        { label: 'Pleased (1)', value: 1 },
        { label: 'Mostly satisfied (2)', value: 2 },
        { label: 'Mixed (3)', value: 3 },
        { label: 'Mostly dissatisfied (4)', value: 4 },
        { label: 'Unhappy (5)', value: 5 },
        { label: 'Terrible (6)', value: 6 },
      ], 0, 'If you were to spend the rest of your life with your urinary condition just the way it is now, how would you feel about that? (ICS/IPSS QoL; AUA-SI copyright — use official form if licensed.)'),
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
        exampleValue: 6,
        helpText: 'PSAD = PSA ÷ prostate volume. Values >0.15 ng/mL² often raise concern for significant cancer; ≤0.10 more reassuring (context-dependent).',
      }),
      numberInput('volume', 'Prostate volume', {
        unit: 'mL',
        min: 5,
        max: 300,
        step: 0.1,
        exampleValue: 40,
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
          title: 'Prostate specific antigen density: a means of distinguishing benign prostatic hypertrophy and prostate cancer',
          citation: 'Benson MC et al. J Urol. 1992;147:815-816',
          year: 1992,
          pmid: '1371554',
          doi: '10.1016/s0022-5347(17)37393-7',
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
        exampleValue: 1.2,
        helpText: 'Free PSA in ng/mL from the same assay as the total PSA; the ratio is free ÷ total × 100, and a lower percentage points toward prostate cancer in the 4–10 ng/mL total range.',
      }),
      numberInput('totalPsa', 'Total PSA', {
        unit: 'ng/mL',
        min: 0.1,
        max: 500,
        step: 0.01,
        exampleValue: 6,
        helpText: 'Best studied when total PSA is ~4–10 ng/mL; draw free and total on the same sample. % free <10% higher cancer probability; >25% more reassuring.',
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
      { condition: 'High % free', actions: ['Observe / repeat PSA', 'Treat BPH if symptomatic'] },
      { condition: 'Low % free', actions: ['mpMRI', 'Biopsy counseling'] },
    ],
    pearls: [
      'Draw free and total on the same sample; freeze/handle per lab protocol.',
      'Not a stand-alone cancer rule-out.',
    ],
  },

  {
    id: 'gleason-grade-group',
    // Explicit branch declaration: the pattern-entry branch and the direct
    // category branch require different fields, and the engine no longer
    // infers that from input ids or labels.
    isQuestionnaire: true,
    questionnaire: {
      modeInputId: 'entryMode',
      directModeValues: ['direct'],
      activeInputIdsByMode: {
        patterns: ['primaryPattern', 'secondaryPattern', 'tertiaryPattern'],
        direct: ['directGleason'],
      },
    },
    name: 'Gleason Grade Group (Prostate Cancer)',
    shortName: 'Grade Group',
    description:
      'Calculates ISUP/WHO Grade Groups (1–5) from primary and secondary Gleason architectural patterns for prostate cancer prognosis and risk stratification.',
    category: 'oncology',
    tags: ['gleason', 'grade group', 'prostate cancer', 'isup', 'pathology'],
    whenToUse:
      'Interpreting prostate biopsy or radical prostatectomy pathology reports in modern Grade Group terms.',
    whyUse:
      'ISUP Grade Groups improve risk stratification and clinical communication (e.g., Gleason 3+4=7 is Grade Group 2, whereas 4+3=7 is Grade Group 3).',
    inputs: [
      selectInput('entryMode', 'Input method', [
        { label: 'Primary + Secondary Gleason patterns (recommended)', value: 'patterns' },
        { label: 'Direct Gleason score / Grade Group category', value: 'direct' },
      ], 'patterns', 'Pattern mode derives the Grade Group from primary and secondary patterns; direct mode accepts a reported Gleason category. Use direct mode only when the pathology report already states the pattern pair.'),
      selectInput('primaryPattern', 'Primary (most predominant) architectural pattern', [
        { label: 'Pattern 3 — well-formed discrete individual glands', value: 3, points: 3 },
        { label: 'Pattern 4 — fused, ill-defined, or cribriform glands', value: 4, points: 4 },
        { label: 'Pattern 5 — solid sheets, cords, single cells, or comedonecrosis', value: 5, points: 5 },
      ], 3, 'Primary (most predominant) pattern: 3 well-formed discrete glands, 4 fused/ill-defined or cribriform glands, 5 solid sheets, cords, single cells, or comedonecrosis.'),
      selectInput('secondaryPattern', 'Secondary (second most predominant) pattern', [
        { label: 'Pattern 3 — well-formed discrete individual glands', value: 3, points: 3 },
        { label: 'Pattern 4 — fused, ill-defined, or cribriform glands', value: 4, points: 4 },
        { label: 'Pattern 5 — solid sheets, cords, single cells, or comedonecrosis', value: 5, points: 5 },
      ], 3, 'Second most predominant pattern using the same definitions; the primary/secondary order matters because 3+4 and 4+3 map to different Grade Groups.'),
      selectInput('tertiaryPattern', 'Tertiary pattern (if identified on biopsy or prostatectomy)', [
        { label: 'None / Not present', value: 0 },
        { label: 'Pattern 4 tertiary (minor component <5%)', value: 4 },
        { label: 'Pattern 5 tertiary (minor high-grade component <5%)', value: 5 },
      ], 0, 'Tertiary high-grade component under 5% (pattern 4 or 5). On biopsy, a tertiary pattern 5 upgrades the score; use \'none\' when the report does not mention one.'),
      selectInput('directGleason', 'Direct Gleason category', [
        { label: 'Grade Group 1: Gleason ≤6 (3+3)', value: '6' },
        { label: 'Grade Group 2: Gleason 3+4=7', value: '3+4' },
        { label: 'Grade Group 3: Gleason 4+3=7', value: '4+3' },
        { label: 'Grade Group 4: Gleason 8 (4+4, 3+5, 5+3)', value: '8' },
        { label: 'Grade Group 5: Gleason 9–10 (4+5, 5+4, 5+5)', value: '9' },
      ], '6', 'Use the Grade Group the report states: GG1 ≤6 (3+3), GG2 3+4=7, GG3 4+3=7, GG4 Gleason 8 (4+4, 3+5, 5+3), GG5 Gleason 9–10 (4+5, 5+4, 5+5).'),
    ],
    calculate(values) {
      const mode = String(values.entryMode ?? 'patterns');
      let group = 1;
      let gleasonStr = '3+3=6';
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
      let label = 'Grade Group 1';
      let interpretation = '';

      if (mode === 'patterns') {
        const p = num(values.primaryPattern, 3);
        const s = num(values.secondaryPattern, 3);
        const sum = p + s;
        gleasonStr = `${p}+${s}=${sum}`;

        if (p === 3 && s === 3) {
          group = 1;
          label = 'Grade Group 1';
          riskLevel = 'low';
          interpretation = 'Grade Group 1 (Gleason 3+3=6): most favorable histology. Typically eligible for active surveillance if low tumor volume, low PSA, and favorable life expectancy.';
        } else if (p === 3 && s === 4) {
          group = 2;
          label = 'Grade Group 2';
          riskLevel = 'moderate';
          interpretation = 'Grade Group 2 (Gleason 3+4=7): favorable intermediate-risk histology. Active surveillance vs definitive therapy (radical prostatectomy or RT) individualized based on cribriform morphology, PSA, and MRI.';
        } else if (p === 4 && s === 3) {
          group = 3;
          label = 'Grade Group 3';
          riskLevel = 'moderate';
          interpretation = 'Grade Group 3 (Gleason 4+3=7): unfavorable intermediate-risk histology. Definitive local therapy (radical prostatectomy or radiation + short-course ADT) standardly recommended.';
        } else if (sum === 8) {
          group = 4;
          label = 'Grade Group 4';
          riskLevel = 'high';
          interpretation = 'Grade Group 4 (Gleason 8: 4+4, 3+5, or 5+3): high-risk prostate cancer. Requires systemic staging (CT/bone scan or PSMA PET); multimodal therapy (RP with pelvic lymphadenectomy or RT + long-term ADT).';
        } else {
          group = 5;
          label = 'Grade Group 5';
          riskLevel = 'critical';
          interpretation = 'Grade Group 5 (Gleason 9–10: 4+5, 5+4, 5+5): highest risk histology with substantial risk of occult nodal or distant micrometastases. Intensive multimodal therapy indicated.';
        }
      } else {
        const g = String(values.directGleason ?? '6');
        const map: Record<
          string,
          { group: number; gleason: string; label: string; interpretation: string; riskLevel: 'low' | 'moderate' | 'high' | 'critical' }
        > = {
          '6': {
            group: 1,
            gleason: '≤6 (3+3)',
            label: 'Grade Group 1',
            interpretation: 'Grade Group 1 (Gleason ≤6): most favorable histology. Often eligible for active surveillance if clinical volume criteria met.',
            riskLevel: 'low',
          },
          '3+4': {
            group: 2,
            gleason: '3+4=7',
            label: 'Grade Group 2',
            interpretation: 'Grade Group 2 (3+4=7): favorable intermediate-risk histology. Decision between active surveillance and definitive treatment depends on percent pattern 4, PSA, and MRI.',
            riskLevel: 'moderate',
          },
          '4+3': {
            group: 3,
            gleason: '4+3=7',
            label: 'Grade Group 3',
            interpretation: 'Grade Group 3 (4+3=7): unfavorable intermediate-risk histology. Definitive therapy commonly recommended.',
            riskLevel: 'moderate',
          },
          '8': {
            group: 4,
            gleason: '8 (4+4, 3+5, 5+3)',
            label: 'Grade Group 4',
            interpretation: 'Grade Group 4 (Gleason 8): high-risk disease. Staging imaging and multimodal therapy evaluation indicated.',
            riskLevel: 'high',
          },
          '9': {
            group: 5,
            gleason: '9–10 (4+5, 5+4, 5+5)',
            label: 'Grade Group 5',
            interpretation: 'Grade Group 5 (Gleason 9–10): highest grade cancer. Comprehensive systemic staging (e.g. PSMA PET) and multimodal therapy.',
            riskLevel: 'critical',
          },
        };
        const m = map[g] ?? map['6'];
        group = m.group;
        gleasonStr = m.gleason;
        label = m.label;
        interpretation = m.interpretation;
        riskLevel = m.riskLevel;
      }

      const tert = num(values.tertiaryPattern, 0);
      if (tert === 5 && group < 4) {
        interpretation += ' [Alert: Presence of tertiary pattern 5 confers significantly higher risk of biochemical recurrence and adverse pathology, shifting clinical management toward more aggressive therapy.]';
      }

      const details = [
        { label: 'ISUP Grade Group', value: `Grade Group ${group} (of 5)` },
        { label: 'Gleason Architecture', value: gleasonStr },
        { label: 'Input Mode', value: mode === 'patterns' ? 'Primary + Secondary Patterns' : 'Direct Category' },
      ];

      if (tert > 0) {
        details.push({ label: 'Tertiary Pattern', value: `Pattern ${tert} identified` });
      }

      return {
        score: group,
        unit: 'Grade Group (1–5)',
        label,
        interpretation,
        riskLevel,
        details,
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
        { label: 'Single (0)', value: 0, description: 'One tumor' },
        { label: '2–7 (3 rec / 3 prog)', value: 3, description: '2–7 tumors (recurrence +3; progression +3)' },
        { label: '≥8 (6 rec / 3 prog)', value: 6, description: '≥8 tumors (recurrence +6; progression +3)' },
      ], undefined, 'Count of tumors at this TURBT (not lifetime).'),
      selectInput('diameter', 'Tumor diameter', [
        { label: '<3 cm (0)', value: 0, description: 'Largest tumor <3 cm' },
        { label: '≥3 cm (3)', value: 3, description: 'Largest tumor ≥3 cm' },
      ], undefined, 'Largest tumor diameter.'),
      selectInput('priorRecur', 'Prior recurrence rate', [
        { label: 'Primary (0)', value: 0, description: 'First diagnosis of NMIBC' },
        { label: '≤1 rec/year (2)', value: 2, description: 'Recurrent, with ≤1 recurrence per year' },
        { label: '>1 rec/year (4)', value: 4, description: 'Recurrent, with >1 recurrence per year' },
      ], undefined, 'Prior recurrence rate: primary tumor 0 points, one or fewer recurrences per year 2 points, more than one per year 4 points.'),
      selectInput('category', 'T category', [
        { label: 'Ta (0)', value: 0, description: 'Non-invasive papillary tumor confined to the epithelium' },
        { label: 'T1 (1 rec / 4 prog)', value: 1, description: 'Invades lamina propria (not muscularis propria). Recurrence +1; progression +4' },
      ], undefined, 'Pathologic T: Ta = epithelium only; T1 = lamina propria. Muscle-invasive (≥T2) is outside NMIBC tables.'),
      selectInput('cis', 'Concurrent CIS', [
        { label: 'No (0)', value: 0, description: 'No carcinoma in situ' },
        { label: 'Yes (1 rec / 6 prog)', value: 1, description: 'Concurrent carcinoma in situ (recurrence +1; progression +6)' },
      ], undefined, 'CIS anywhere in the bladder at this assessment.'),
      selectInput('grade', 'Grade (WHO 1973 style used in original)', [
        { label: 'G1 (0)', value: 0, description: 'PUNLMP / low-grade ≈ G1' },
        { label: 'G2 (1)', value: 1, description: 'Use G2 if still reported as WHO 1973 G2' },
        { label: 'G3 (2 rec / 5 prog)', value: 2, description: 'High-grade ≈ G3; if only “high grade” is reported, choose G3' },
      ], 0, 'Original EORTC tables used WHO 1973. Common map: PUNLMP/low-grade ≈ G1; G2 if still reported; high-grade ≈ G3. If only “high grade” is reported, choose G3.'),
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
      'Non-febrile ED patients with flank pain / suspected uncomplicated ureterolithiasis when estimating pre-CT stone probability.',
    whyUse:
      'May support selective imaging or ultrasound-first strategies when score is high and infection is absent.',
    inputs: [
      selectInput('sex', 'Sex', [
        { label: 'Female (0)', value: 0 },
        { label: 'Male (2)', value: 2 },
      ], undefined, 'Male sex adds 2 points to the STONE score.'),
      selectInput('timing', 'Timing (duration of pain to presentation)', [
        { label: '>24 hours (0)', value: 0 },
        { label: '6–24 hours (1)', value: 1 },
        { label: '<6 hours (3)', value: 3 },
      ], undefined, 'Duration of pain at presentation: over 24 hours 0, 6–24 hours 1, under 6 hours 3 points — the acute onset carries the most weight.'),
      selectInput('origin', 'Origin (race / ethnicity as in original US score)', [
        { label: 'Black / African American (0)', value: 0 },
        { label: 'Non-Black (3)', value: 3 },
      ], 3, 'Original derivation used race as a predictor; apply carefully and avoid inequitable care'),
      selectInput('nauseaPts', 'Nausea / vomiting', [
        { label: 'Neither (0)', value: 0 },
        { label: 'Nausea alone (1)', value: 1 },
        { label: 'Vomiting alone or both (2)', value: 2 },
      ], undefined, 'Nausea or vomiting: neither 0, nausea alone 1, vomiting alone or both 2 points.'),
      selectInput('hematuria', 'Hematuria on urine dipstick', [
        { label: 'Absent (0)', value: 0 },
        { label: 'Present (3)', value: 3 },
      ], 0, 'Any dipstick blood (including trace) counts as present in the original STONE score.'),
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
