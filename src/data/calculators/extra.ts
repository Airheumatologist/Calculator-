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
      yesNo(
        'bloodCx',
        'Major: Typical organism from 2 separate blood cultures (or equivalent major micro)',
        1,
        'Li 2000 major micro: viridans streptococci, S. gallolyticus/bovis, S. aureus, HACEK, or community-acquired enterococci without a primary focus from 2 separate cultures; OR persistently positive cultures of a microorganism consistent with IE (≥2 ≥12 h apart, or 3 / majority of ≥4 with first–last ≥1 h apart); OR single Coxiella burnetii culture or antiphase I IgG >1:800.',
      ),
      yesNo(
        'echo',
        'Major: Evidence of endocardial involvement (echo/new regurg)',
        1,
        'Oscillating intracardiac mass on valve, supporting structure, or implanted material (in the path of a regurgitant jet); abscess; new partial dehiscence of a prosthetic valve; or new valvular regurgitation. A change in preexisting murmur is not sufficient.',
      ),
      yesNo(
        'predisposing',
        'Minor: Predisposing heart condition or IVDU',
        0,
        'Prior IE, prosthetic valve, unrepaired cyanotic CHD, or significant native-valve disease; or injection-drug use.',
      ),
      yesNo('fever', 'Minor: Fever ≥38°C', 0, 'Temperature ≥38.0 °C.'),
      yesNo(
        'vascular',
        'Minor: Vascular phenomena (emboli, Janeway, etc.)',
        0,
        'Major arterial emboli, septic pulmonary infarcts, mycotic aneurysm, intracranial hemorrhage, conjunctival hemorrhages, or Janeway lesions.',
      ),
      yesNo(
        'immuno',
        'Minor: Immunologic phenomena (Osler, Roth, GN, RF)',
        0,
        'Glomerulonephritis, Osler nodes, Roth spots, or rheumatoid factor (RF = rheumatoid factor, not rheumatic fever).',
      ),
      yesNo(
        'microMinor',
        'Minor: Microbiologic evidence not meeting major',
        0,
        'Positive blood culture that does not meet major criteria, or serologic evidence of active infection with an organism consistent with IE. Do not count if major microbiology is already Yes.',
      ),
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
    pearls: [
      'Clinical modified Duke (Li 2000) only — not the 2023 Duke-ISCVID tool (`duke-iscvid-2023`).',
      'Pathologic criteria (microorganisms or active endocarditis on vegetation/explanted valve/embolus) independently define definite IE and are not a checkbox here.',
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
      yesNo(
        'strep',
        'Evidence of preceding GAS infection (culture, rapid test, or rising ASO/anti-DNase B)',
        0,
        'Throat culture, rapid antigen, or rising ASO/anti-DNase B. Isolated Sydenham chorea or indolent carditis may not need GAS evidence clinically — this helper still gates on strep (do not override).',
      ),
      yesNo(
        'carditis',
        'Major: Carditis',
        0,
        'Clinical valvulitis and/or subclinical echocardiographic carditis (2015 Jones). Do not also count prolonged PR as a minor if carditis is a major.',
      ),
      yesNo(
        'arthritis',
        'Major: Arthritis (migratory polyarthritis)',
        0,
        'Low-risk populations: migratory polyarthritis only. Moderate/high-risk: monoarthritis or polyarthritis (or polyarthralgia as a minor — not both with arthritis). Do not count arthralgia as a minor if arthritis is major.',
      ),
      yesNo(
        'chorea',
        'Major: Chorea',
        0,
        'Sydenham chorea: purposeless, involuntary movements; often delayed after GAS. May be the sole manifestation.',
      ),
      yesNo(
        'erythema',
        'Major: Erythema marginatum',
        0,
        'Evanescent, non-pruritic, serpiginous/annular pink rash on the trunk and proximal limbs; spares the face.',
      ),
      yesNo(
        'nodules',
        'Major: Subcutaneous nodules',
        0,
        'Firm, painless nodules over extensor surfaces or bony prominences (elbows, knees, wrists, occiput, spinous processes).',
      ),
      yesNo(
        'arthralgia',
        'Minor: Arthralgia',
        0,
        'Joint pain without arthritis. Do not count if arthritis is already scored as a major.',
      ),
      yesNo(
        'fever',
        'Minor: Fever',
        0,
        '≥38.5 °C in low-risk populations; ≥38.0 °C in moderate/high-risk populations (2015 AHA).',
      ),
      yesNo(
        'elevatedAPR',
        'Minor: Elevated ESR/CRP',
        0,
        'Low-risk: ESR ≥60 mm/h or CRP ≥3.0 mg/dL. Moderate/high-risk: ESR ≥30 mm/h (CRP ≥3.0 mg/dL still used). Peak acute-phase reactant.',
      ),
      yesNo(
        'prolongedPR',
        'Minor: Prolonged PR interval',
        0,
        'PR prolonged for age and rate (adults typically PR >200 ms / 0.20 s; use an age-adjusted table in children). Do not count if carditis is already a major.',
      ),
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
    pearls: [
      'Low-risk = ARF incidence <2/100,000 school-age children or RHD prevalence ≤1/1000; otherwise use moderate/high-risk joint and fever/ESR cutoffs.',
      'Recurrent ARF 3-minor pathway is not implemented here — initial ARF is 2 major or 1 major + 2 minor with GAS evidence.',
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
      yesNo('fever', 'Fever in past 24h', 1, 'Documented or patient-reported fever during the previous 24 hours (FeverPAIN has no specific °C cutoff).'),
      yesNo('purulence', 'Purulence (pus on tonsils)', 1, 'Pus visible on the tonsils — not nasal discharge or post-nasal drip.'),
      yesNo('attend3', 'Attend rapidly (illness ≤3 days)', 1, 'Symptom onset ≤3 days before this attendance.'),
      yesNo('inflamed', 'Severely inflamed tonsils', 1, 'Marked tonsillar erythema and swelling, not mild pharyngeal injection / everyday sore-throat redness.'),
      yesNo('noCough', 'No cough or coryza', 1, 'Score Yes only if both cough and coryza (runny/stuffy nose) are absent.'),
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
      yesNo('pnd', 'Major: Paroxysmal nocturnal dyspnea (PND)', 1, 'Sudden night-time awakening with orthopnea / need to sit upright to breathe.'),
      yesNo('orthopnea', 'Major: Orthopnea OR neck-vein distention', 1, 'Tick once if either finding is present. This helper fuses two McKee majors; do not retick the JVD item solely for visible neck veins already counted here.'),
      yesNo('rales', 'Major: Rales', 1, 'Pulmonary rales/crackles (typically basal).'),
      yesNo('cardiomegaly', 'Major: Cardiomegaly', 1, 'Radiographic cardiomegaly (CXR cardiothoracic ratio >0.5), not physical exam impression alone.'),
      yesNo('edemaPulm', 'Major: Acute pulmonary edema', 1, 'Acute alveolar pulmonary edema (clinical ± radiographic).'),
      yesNo('s3', 'Major: S3 gallop', 1, 'Audible third heart sound.'),
      yesNo('jvd', 'Major: Increased venous pressure (>16 cm H2O) OR hepatojugular reflux', 1, 'Tick once if either CVP >16 cm H2O or a positive hepatojugular reflux is present.'),
      yesNo('weightLoss', 'Major: Weight loss >4.5 kg in 5 days with treatment', 1, 'Weight loss >4.5 kg (10 lb) in 5 days in response to HF treatment (not unexplained cachexia).'),
      yesNo('ankleEdema', 'Minor: Ankle edema', 0, 'Bilateral ankle edema. Count minors only if not explained by another disease.'),
      yesNo('nightCough', 'Minor: Night cough', 0, 'Nocturnal cough attributed to HF, not another lung disease, and distinct from paroxysmal nocturnal dyspnea (already a major).'),
      yesNo('doe', 'Minor: Dyspnea on exertion', 0, 'Dyspnea on ordinary exertion.'),
      yesNo('hepato', 'Minor: Hepatomegaly', 0, 'Hepatomegaly attributed to congestion.'),
      yesNo('pleural', 'Minor: Pleural effusion', 0, 'Pleural effusion (exam or imaging).'),
      yesNo('hr120', 'Minor: Tachycardia >120', 0, 'Heart rate >120 bpm.'),
      yesNo('vc', 'Minor: Decrease in vital capacity by 1/3', 0, 'Vital capacity decreased by one-third from the maximum recorded for that patient.'),
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
    pearls: [
      'Count minors only if not explained by another condition (pulmonary, renal, venous disease).',
      'Official McKee grouping treats PND or orthopnea as one major and neck-vein distention, CVP >16 cm H2O, and HJR as separate majors — this helper fuses some of those boxes; do not retune calculate() from the labels.',
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
      selectInput(
        'class',
        'Symptom class',
        [
          { label: 'I — No limitation of physical activity', value: 1, description: 'Ordinary physical activity does not cause undue fatigue, palpitations, or dyspnea.' },
          { label: 'II — Slight limitation; comfortable at rest', value: 2, description: 'Ordinary physical activity causes fatigue, palpitations, or dyspnea.' },
          { label: 'III — Marked limitation; comfortable at rest', value: 3, description: 'Less than ordinary activity causes fatigue, palpitations, or dyspnea.' },
          { label: 'IV — Symptoms at rest; any activity causes discomfort', value: 4, description: 'Unable to carry on any physical activity without discomfort. Symptoms of HF at rest; any activity increases discomfort.' },
        ],
        undefined,
        'Classify by symptoms typical of the last 1–2 weeks in known HF (NYHA/AHA wording).',
      ),
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
      numberInput('age', 'Age', { unit: 'years', min: 0, max: 110, defaultValue: 60, helpText: 'Expected room-air PaO₂ ≈ 100 − 0.3×age mmHg (sea level).' }),
      numberInput('pao2', 'Measured PaO₂', { unit: 'mmHg', min: 20, max: 120, defaultValue: 80, helpText: 'Room-air PaO₂ at sea level. Not for supplemental oxygen or altitude. Flagged below expected if measured is >5 mmHg under 100 − 0.3×age.' }),
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
      numberInput('qt', 'QT interval', { unit: 'ms', min: 200, max: 800, defaultValue: 400, helpText: 'Measure from QRS onset to the end of the T wave (not U wave) in a lead with a clear T; use a representative RR.' }),
      numberInput('hr', 'Heart rate', { unit: 'bpm', min: 30, max: 220, defaultValue: 70, helpText: 'Use the same cycle as the measured QT (or the mean HR of that tracing).' }),
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
      numberInput('na', 'Na', { unit: 'mEq/L', defaultValue: 140, min: 100, max: 180, helpText: 'K-inclusive AG = Na + K − (Cl + HCO₃). Normal is higher than the no-K method (~12–16 vs ~8–12).' }),
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
      numberInput('heightIn', 'Height', { unit: 'inches', min: 55, max: 84, defaultValue: 67, helpText: 'Height in inches (e.g. 5′7″ = 67 in). Formula is for adults; ±10% frame-size adjustment is sometimes applied after the result.' }),
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
      numberInput('ca', 'Total Ca', { unit: 'mmol/L', min: 1, max: 4, step: 0.01, defaultValue: 2.0, helpText: 'Total (not ionized) calcium in mmol/L. US conventional mg/dL ÷ 4 ≈ mmol/L.' }),
      numberInput('alb', 'Albumin', { unit: 'g/L', min: 10, max: 50, defaultValue: 25, helpText: 'Albumin in g/L (g/dL × 10). Reference 40 g/L in the Payne-style correction.' }),
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
