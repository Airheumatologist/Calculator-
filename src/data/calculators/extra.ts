import type { Calculator } from '../../types/calculator';
import { num, bool, round, yesNo, selectInput, numberInput, riskFromThresholds } from '../../utils/helpers';

export const extraCalcs: Calculator[] = [
  {
    id: 'duke-criteria',
    name: 'Modified Duke Criteria (IE Helper)',
    shortName: 'Duke IE',
    description: 'Counts major/minor criteria for infective endocarditis probability.',
    category: 'infectious-disease',
    tags: ['endocarditis', 'duke', 'infection'],
    whenToUse: 'Suspected infective endocarditis classification.',
    whyUse: 'Standard diagnostic framework (definite / possible / rejected).',
    inputs: [
      yesNo('bloodCx', 'Major: Typical organism from 2 separate blood cultures (or equivalent major micro)'),
      yesNo('echo', 'Major: Evidence of endocardial involvement (echo/new regurg)'),
      yesNo('predisposing', 'Minor: Predisposing heart condition or IVDU', 0),
      yesNo('fever', 'Minor: Fever ≥38°C', 0),
      yesNo('vascular', 'Minor: Vascular phenomena (emboli, Janeway, etc.)', 0),
      yesNo('immuno', 'Minor: Immunologic phenomena (Osler, Roth, GN, RF)', 0),
      yesNo('microMinor', 'Minor: Microbiologic evidence not meeting major', 0),
    ],
    calculate(values) {
      const major = (bool(values.bloodCx) ? 1 : 0) + (bool(values.echo) ? 1 : 0);
      const minor =
        (bool(values.predisposing) ? 1 : 0) +
        (bool(values.fever) ? 1 : 0) +
        (bool(values.vascular) ? 1 : 0) +
        (bool(values.immuno) ? 1 : 0) +
        (bool(values.microMinor) ? 1 : 0);
      let label = 'Rejected';
      let interpretation = 'Does not meet possible/definite criteria by this simplified count.';
      let riskLevel: 'low' | 'moderate' | 'high' = 'low';
      if (major === 2 || (major === 1 && minor >= 3) || minor >= 5) {
        label = 'Definite IE';
        interpretation = 'Meets definite IE by clinical criteria pattern (2 major, or 1 major+3 minor, or 5 minor). Pathologic criteria also define definite.';
        riskLevel = 'high';
      } else if ((major === 1 && minor >= 1) || minor >= 3) {
        label = 'Possible IE';
        interpretation = 'Possible IE — continue workup; do not reject prematurely.';
        riskLevel = 'moderate';
      }
      return {
        score: `${major}M / ${minor}m`,
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Major criteria', value: String(major) },
          { label: 'Minor criteria', value: String(minor) },
        ],
      };
    },
    evidence: {
      summary: 'Modified Duke criteria classify IE as definite, possible, or rejected using major/minor clinical and pathologic features.',
      validation: 'Standard ID/cardiology diagnostic framework; ESC/AHA adaptations exist.',
      references: [{ title: 'Proposed modifications to the Duke criteria for IE', citation: 'Li JS et al. Clin Infect Dis. 2000', year: 2000, pmid: '10770721',
          doi: '10.1086/313753', }],
    },
    nextSteps: [
      { condition: 'Possible/Definite', actions: ['Multiple blood cultures before antibiotics if stable', 'Echo (TTE ± TEE)', 'ID + cardiology involvement'] },
    ],
  },
  {
    id: 'jones-criteria',
    name: 'Jones Criteria (Acute Rheumatic Fever)',
    shortName: 'Jones ARF',
    description: 'Evidence of preceding strep + major/minor manifestations for ARF.',
    category: 'rheumatology',
    tags: ['rheumatic fever', 'strep', 'jones'],
    whenToUse: 'Suspected acute rheumatic fever.',
    whyUse: 'WHO/AHA diagnostic framework.',
    inputs: [
      yesNo('strep', 'Evidence of preceding GAS infection (culture, rapid test, or rising ASO/anti-DNase B)', 0),
      yesNo('carditis', 'Major: Carditis', 0),
      yesNo('arthritis', 'Major: Arthritis (migratory polyarthritis)', 0),
      yesNo('chorea', 'Major: Chorea', 0),
      yesNo('erythema', 'Major: Erythema marginatum', 0),
      yesNo('nodules', 'Major: Subcutaneous nodules', 0),
      yesNo('arthralgia', 'Minor: Arthralgia', 0),
      yesNo('fever', 'Minor: Fever', 0),
      yesNo('elevatedAPR', 'Minor: Elevated ESR/CRP', 0),
      yesNo('prolongedPR', 'Minor: Prolonged PR interval', 0),
    ],
    calculate(values) {
      if (!bool(values.strep)) {
        return {
          score: 0,
          label: 'Insufficient (no strep evidence)',
          interpretation: 'Except for chorea/indolent carditis, evidence of preceding GAS is required.',
          riskLevel: 'info',
        };
      }
      const major =
        (bool(values.carditis) ? 1 : 0) +
        (bool(values.arthritis) ? 1 : 0) +
        (bool(values.chorea) ? 1 : 0) +
        (bool(values.erythema) ? 1 : 0) +
        (bool(values.nodules) ? 1 : 0);
      const minor =
        (bool(values.arthralgia) ? 1 : 0) +
        (bool(values.fever) ? 1 : 0) +
        (bool(values.elevatedAPR) ? 1 : 0) +
        (bool(values.prolongedPR) ? 1 : 0);
      const initial = major >= 2 || (major >= 1 && minor >= 2);
      if (initial) {
        return {
          score: `${major} maj / ${minor} min`,
          label: 'Meets Jones (initial ARF pattern)',
          interpretation: 'With GAS evidence: 2 major or 1 major + 2 minor supports initial ARF diagnosis.',
          riskLevel: 'high',
        };
      }
      return {
        score: `${major} maj / ${minor} min`,
        label: 'Does not meet initial ARF',
        interpretation: 'Criteria for initial ARF not met on this checklist; clinical judgment and recurrence criteria differ.',
        riskLevel: 'low',
      };
    },
    evidence: {
      summary: 'Jones criteria require GAS evidence plus major/minor manifestations; revised for moderate/high-risk populations.',
      validation: 'AHA guidelines for ARF diagnosis.',
      references: [{ title: 'Revision of Jones Criteria for ARF', citation: 'Gewitz MH et al. Circulation. 2015', year: 2015, pmid: '25908771',
          doi: '10.1161/CIR.0000000000000205', }],
    },
    nextSteps: [
      { condition: 'Meets criteria', actions: ['Anti-inflammatory therapy', 'Antibiotic treatment/eradication', 'Secondary prophylaxis', 'Echo'] },
    ],
  },
  {
    id: 'centor-feverpain',
    name: 'FeverPAIN Score',
    shortName: 'FeverPAIN',
    description: 'UK NICE-aligned sore throat score for antibiotic stewardship.',
    category: 'infectious-disease',
    tags: ['pharyngitis', 'strep', 'feverpain'],
    whenToUse: 'Acute sore throat antibiotic decision support.',
    whyUse: 'Predicts bacterial (strep) probability; guides delayed Rx strategies.',
    inputs: [
      yesNo('fever', 'Fever in past 24h', 1),
      yesNo('purulence', 'Purulence', 1),
      yesNo('attend3', 'Attend rapidly (illness ≤3 days)', 1),
      yesNo('inflamed', 'Severely inflamed tonsils', 1),
      yesNo('noCough', 'No cough or coryza', 1),
    ],
    calculate(values) {
      const score = ['fever', 'purulence', 'attend3', 'inflamed', 'noCough'].reduce((s, k) => s + (bool(values[k]) ? 1 : 0), 0);
      const r = riskFromThresholds(score, [
        { max: 1, level: 'low', label: 'Low (0–1)', interpretation: '13–18% strep; no antibiotic strategy usually.' },
        { max: 3, level: 'moderate', label: 'Intermediate (2–3)', interpretation: '~34–40% strep; consider delayed antibiotic script.' },
        { max: 5, level: 'high', label: 'High (4–5)', interpretation: '~62–65% strep; consider immediate antibiotic or test.' },
      ]);
      return { score, ...r };
    },
    evidence: {
      summary: 'FeverPAIN used in UK primary care trials for sore throat antibiotic use.',
      validation: 'NICE-referenced scoring system.',
      references: [{ title: 'Clinical score and rapid antigen detection test to guide antibiotic use for sore throats: randomised controlled trial of PRISM (primary care streptococcal management)', citation: 'Little P et al. BMJ. 2013', year: 2013, pmid: '24114306',
          doi: '10.1136/bmj.f5806', }],
    },
    nextSteps: [
      { condition: 'Low', actions: ['Symptomatic care'] },
      { condition: 'High', actions: ['Immediate Abx or RADT per local policy'] },
    ],
  },
  {
    id: 'framingham-hf',
    name: 'Framingham Heart Failure Criteria',
    shortName: 'Framingham HF',
    description: 'Major/minor criteria for clinical CHF diagnosis.',
    category: 'cardiology',
    tags: ['heart failure', 'framingham', 'chf'],
    whenToUse: 'Clinical diagnosis of heart failure (historical/epidemiologic criteria).',
    whyUse: 'Classic major/minor framework still taught clinically.',
    inputs: [
      yesNo('pnd', 'Major: PND'),
      yesNo('orthopnea', 'Major: Orthopnea (sometimes minor in variants) / neck vein distention'),
      yesNo('rales', 'Major: Rales'),
      yesNo('cardiomegaly', 'Major: Cardiomegaly'),
      yesNo('edemaPulm', 'Major: Acute pulmonary edema'),
      yesNo('s3', 'Major: S3 gallop'),
      yesNo('jvd', 'Major: Increased venous pressure / hepatojugular reflux'),
      yesNo('weightLoss', 'Major: Weight loss >4.5 kg in 5 days with treatment'),
      yesNo('ankleEdema', 'Minor: Ankle edema', 0),
      yesNo('nightCough', 'Minor: Night cough', 0),
      yesNo('doe', 'Minor: Dyspnea on exertion', 0),
      yesNo('hepato', 'Minor: Hepatomegaly', 0),
      yesNo('pleural', 'Minor: Pleural effusion', 0),
      yesNo('hr120', 'Minor: Tachycardia >120', 0),
      yesNo('vc', 'Minor: Decrease in vital capacity by 1/3', 0),
    ],
    calculate(values) {
      const majorKeys = ['pnd', 'orthopnea', 'rales', 'cardiomegaly', 'edemaPulm', 's3', 'jvd', 'weightLoss'];
      const minorKeys = ['ankleEdema', 'nightCough', 'doe', 'hepato', 'pleural', 'hr120', 'vc'];
      const major = majorKeys.reduce((s, k) => s + (bool(values[k]) ? 1 : 0), 0);
      const minor = minorKeys.reduce((s, k) => s + (bool(values[k]) ? 1 : 0), 0);
      const meets = major >= 2 || (major >= 1 && minor >= 2);
      return {
        score: `${major} maj / ${minor} min`,
        label: meets ? 'HF criteria met' : 'Criteria not met',
        interpretation: meets
          ? 'Meets Framingham clinical HF (2 major or 1 major + 2 minor). Confirm with natriuretic peptides/echo as available.'
          : 'Does not meet Framingham criteria on selected items.',
        riskLevel: meets ? 'high' : 'low',
      };
    },
    evidence: {
      summary: 'Framingham criteria diagnose HF using combinations of major and minor clinical features.',
      validation: 'Used in epidemiologic studies; modern diagnosis also uses BNP/echo.',
      references: [{ title: 'The natural history of congestive heart failure: the Framingham study', citation: 'McKee PA et al. N Engl J Med. 1971', year: 1971, pmid: '5122894',
          doi: '10.1056/NEJM197112232852601', }],
    },
    nextSteps: [
      { condition: 'HF suspected/met', actions: ['BNP/NT-proBNP', 'Echo', 'GDMT if HFrEF', 'Volume management'] },
    ],
  },
  {
    id: 'nyha',
    name: 'NYHA Functional Classification',
    shortName: 'NYHA',
    description: 'Heart failure functional class by symptom limitation.',
    category: 'cardiology',
    tags: ['heart failure', 'nyha', 'functional'],
    whenToUse: 'Classifying functional limitation in known HF.',
    whyUse: 'Guides therapy intensity and trial eligibility language.',
    inputs: [
      selectInput('class', 'Symptom class', [
        { label: 'I — No limitation of physical activity', value: 1 },
        { label: 'II — Slight limitation; comfortable at rest', value: 2 },
        { label: 'III — Marked limitation; comfortable at rest', value: 3 },
        { label: 'IV — Symptoms at rest; any activity causes discomfort', value: 4 },
      ]),
    ],
    calculate(values) {
      const c = num(values.class, 1);
      const map: Record<number, { label: string; interpretation: string; riskLevel: 'low' | 'moderate' | 'high' | 'critical' }> = {
        1: { label: 'NYHA I', interpretation: 'Asymptomatic with ordinary activity.', riskLevel: 'low' },
        2: { label: 'NYHA II', interpretation: 'Mild symptoms with ordinary activity.', riskLevel: 'moderate' },
        3: { label: 'NYHA III', interpretation: 'Marked limitation — optimize GDMT; consider advanced therapies evaluation.', riskLevel: 'high' },
        4: { label: 'NYHA IV', interpretation: 'Severe — rest symptoms; advanced HF therapies / palliative care discussions.', riskLevel: 'critical' },
      };
      const m = map[c];
      return { score: c, ...m };
    },
    evidence: {
      summary: 'NYHA classes I–IV describe functional capacity in heart failure.',
      validation: 'Universal HF communication standard; subjective but clinically useful.',
      references: [{ title: 'Nomenclature and criteria for diagnosis of diseases of the heart and great vessels (NYHA functional classification)', citation: 'Criteria Committee of the New York Heart Association (classic); modern use reviewed in HF guidelines', year: 1994, url: 'https://www.heart.org/en/health-topics/heart-failure/what-is-heart-failure/classes-of-heart-failure' }],
    },
    nextSteps: [
      { condition: 'Class III–IV', actions: ['Ensure GDMT', 'Evaluate for CRT/ICD if indicated', 'Advanced HF referral'] },
    ],
  },
  {
    id: 'pao2-fio2-age-expected',
    name: 'Expected PaO₂ (Age)',
    shortName: 'Expected PaO₂',
    description: 'Rough expected arterial PaO₂ on room air by age.',
    category: 'pulmonary',
    tags: ['abg', 'oxygenation'],
    whenToUse: 'ABG interpretation on room air.',
    whyUse: 'PaO₂ normally declines with age.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 0, max: 110, defaultValue: 60 }),
      numberInput('pao2', 'Measured PaO₂', { unit: 'mmHg', min: 20, max: 120, defaultValue: 80 }),
    ],
    calculate(values) {
      const age = num(values.age, 60);
      const measured = num(values.pao2, 80);
      const expected = round(100 - 0.3 * age, 0);
      const diff = measured - expected;
      return {
        score: expected,
        unit: 'mmHg',
        label: measured + 5 < expected ? 'Below expected' : 'Near/above expected',
        interpretation: `Expected room-air PaO₂ ≈ ${expected} mmHg. Measured ${measured} (Δ ${diff}). Use with A–a gradient for hypoxemia workup.`,
        riskLevel: measured + 5 < expected ? 'moderate' : 'normal',
      };
    },
    evidence: {
      summary: 'Rule of thumb: expected PaO₂ ≈ 100 − 0.3×age (room air, sea level).',
      validation: 'Teaching approximation; varies with FiO₂ and altitude.',
      references: [{ title: 'Disorders of acid-base balance', citation: 'Kellum JA. Crit Care Med. 2007', year: 2007, pmid: '17893626',
          doi: '10.1097/01.CCM.0000286399.21008.64', }],
    },
    nextSteps: [{ condition: 'Low PaO₂', actions: ['Calculate A–a gradient', 'Supplemental O₂', 'Diagnose cause'] }],
  },
  {
    id: 'qc-fridericia',
    name: 'Corrected QT (Fridericia)',
    shortName: 'QTc Fridericia',
    description: 'QTc using Fridericia formula (preferred at extreme HR).',
    category: 'cardiology',
    tags: ['ecg', 'qt', 'qtc'],
    whenToUse: 'QT correction when HR is very high or low.',
    whyUse: 'More accurate than Bazett at heart rate extremes.',
    inputs: [
      numberInput('qt', 'QT interval', { unit: 'ms', min: 200, max: 800, defaultValue: 400 }),
      numberInput('hr', 'Heart rate', { unit: 'bpm', min: 30, max: 220, defaultValue: 70 }),
    ],
    calculate(values) {
      const qt = num(values.qt, 400);
      const hr = num(values.hr, 70);
      const rr = 60 / hr;
      const qtc = round(qt / Math.cbrt(rr), 0);
      let riskLevel: 'normal' | 'moderate' | 'high' | 'critical' = 'normal';
      let label = 'Normal QTc';
      let interpretation = 'Fridericia QTc within typical range for many adults.';
      if (qtc >= 500) {
        riskLevel = 'critical';
        label = 'Markedly prolonged';
        interpretation = 'QTc ≥500 ms: high TdP risk.';
      } else if (qtc >= 460) {
        riskLevel = 'high';
        label = 'Prolonged';
        interpretation = 'Prolonged QTc — review meds/electrolytes.';
      } else if (qtc >= 440) {
        riskLevel = 'moderate';
        label = 'Borderline';
        interpretation = 'Borderline prolongation.';
      }
      return { score: qtc, unit: 'ms', label, interpretation, riskLevel };
    },
    evidence: {
      summary: 'QTcF = QT / ∛RR. Preferred over Bazett when HR extreme.',
      validation: 'Increasingly recommended in drug studies and clinical practice.',
      references: [{ title: 'Duration of systole in electrocardiogram', citation: 'Fridericia LS. Acta Med Scand. 1920', year: 1920, pmid: '14516292',
          doi: '10.1046/j.1542-474x.2003.08413.x', }],
    },
    nextSteps: [{ condition: 'QTc ≥500', actions: ['Telemetry', 'Stop QT drugs', 'Replete K/Mg'] }],
  },
  {
    id: 'serum-anion-gap-k',
    name: 'Anion Gap Including Potassium',
    shortName: 'AG + K',
    description: 'Some labs report AG as Na+K − (Cl+HCO₃).',
    category: 'nephrology',
    tags: ['anion gap', 'electrolytes'],
    whenToUse: 'When comparing to lab AG methods that include K.',
    whyUse: 'Avoid misinterpretation of method differences.',
    inputs: [
      numberInput('na', 'Na', { unit: 'mEq/L', defaultValue: 140, min: 100, max: 180 }),
      numberInput('k', 'K', { unit: 'mEq/L', defaultValue: 4, min: 1, max: 10, step: 0.1 }),
      numberInput('cl', 'Cl', { unit: 'mEq/L', defaultValue: 104, min: 70, max: 140 }),
      numberInput('hco3', 'HCO₃', { unit: 'mEq/L', defaultValue: 24, min: 1, max: 50 }),
    ],
    calculate(values) {
      const ag = round(num(values.na) + num(values.k) - num(values.cl) - num(values.hco3), 1);
      return {
        score: ag,
        unit: 'mEq/L',
        label: ag > 16 ? 'Elevated (K-inclusive method)' : 'Normal (K-inclusive method)',
        interpretation: 'Normal ranges higher when K included (~12–16). Prefer consistent method with local lab.',
        riskLevel: ag > 16 ? 'moderate' : 'normal',
      };
    },
    evidence: {
      summary: 'AG variants: without K (common US) vs with K (some regions/labs).',
      validation: 'Method awareness prevents false “high AG”.',
      references: [{ title: 'Anion gap and hypoalbuminemia (Figge correction context)', citation: 'Figge J et al. Crit Care Med. 1998', year: 1998, pmid: '9824071',
          doi: '10.1097/00003246-199811000-00019', }],
    },
    nextSteps: [{ condition: 'Elevated', actions: ['Evaluate HAGMA causes', 'Check albumin correction'] }],
  },
  {
    id: 'ibw-hamwi',
    name: 'Ideal Body Weight (Hamwi)',
    shortName: 'IBW Hamwi',
    description: 'Hamwi formula for ideal body weight.',
    category: 'general',
    tags: ['weight', 'nutrition'],
    whenToUse: 'Alternative IBW estimate for nutrition.',
    whyUse: 'Common dietetics formula.',
    inputs: [
      numberInput('heightIn', 'Height', { unit: 'inches', min: 55, max: 84, defaultValue: 67 }),
      selectInput('sex', 'Sex', [
        { label: 'Male', value: 'M' },
        { label: 'Female', value: 'F' },
      ]),
    ],
    calculate(values) {
      const h = num(values.heightIn, 67);
      const over = Math.max(0, h - 60);
      const ibw = values.sex === 'F' ? 100 + 5 * over : 106 + 6 * over;
      return {
        score: round(ibw, 0),
        unit: 'lb',
        label: 'Hamwi IBW',
        interpretation: `≈${round(ibw * 0.4536, 1)} kg. Frame size adjustments ±10% sometimes applied.`,
        riskLevel: 'info',
      };
    },
    evidence: {
      summary: 'Hamwi: Men 106 lb + 6 lb/inch >5 ft; Women 100 + 5 lb/inch >5 ft.',
      validation: 'Nutrition practice formula.',
      references: [{ title: 'Hamwi ideal body weight formula (historical pharmacy teaching)', citation: 'Hamwi GJ. 1964 (classic pharmacy teaching; modern IBW comparisons in nutrition literature)', year: 1964, pmid: '6869387',
          doi: '10.1053/j.jrn.2006.01.008', }],
    },
    nextSteps: [{ condition: 'Any', actions: ['Use with clinical nutrition assessment'] }],
  },
  {
    id: 'calcium-correction-si',
    name: 'Corrected Calcium (SI units)',
    shortName: 'Corr. Ca (SI)',
    description: 'Corrects calcium in mmol/L for albumin g/L.',
    category: 'nephrology',
    tags: ['calcium', 'si units'],
    whenToUse: 'Labs reporting SI units.',
    whyUse: 'Avoid unit confusion with US conventional formula.',
    inputs: [
      numberInput('ca', 'Total Ca', { unit: 'mmol/L', min: 1, max: 4, step: 0.01, defaultValue: 2.0 }),
      numberInput('alb', 'Albumin', { unit: 'g/L', min: 10, max: 50, defaultValue: 25 }),
    ],
    calculate(values) {
      const ca = num(values.ca, 2);
      const alb = num(values.alb, 25);
      const corr = round(ca + 0.02 * (40 - alb), 2);
      const r = riskFromThresholds(corr, [
        { max: 2.1, level: 'moderate', label: 'Low', interpretation: 'Below typical 2.2–2.6 mmol/L range.' },
        { max: 2.6, level: 'normal', label: 'Normal', interpretation: 'Within approximate normal range.' },
        { max: 5, level: 'high', label: 'High', interpretation: 'Elevated corrected calcium.' },
      ]);
      return { score: corr, unit: 'mmol/L', ...r };
    },
    evidence: {
      summary: 'Corrected Ca (mmol/L) ≈ measured + 0.02×(40 − albumin g/L).',
      validation: 'Common SI correction; ionized Ca preferred.',
      references: [{ title: 'Interpretation of serum calcium in patients with abnormal serum proteins', citation: 'Payne RB et al. Br Med J. 1973', year: 1973, pmid: '4758544',
          doi: '10.1136/bmj.4.5893.643', }],
    },
    nextSteps: [{ condition: 'Abnormal', actions: ['Confirm ionized calcium'] }],
  },
];
