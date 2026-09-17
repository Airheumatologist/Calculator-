import type { Calculator } from '../../types/calculator';
import { num, bool, round, yesNo, selectInput, numberInput, riskFromThresholds } from '../../utils/helpers';

export const extraCalcs: Calculator[] = [
  {
    id: 'duke-criteria',
    name: 'Modified Duke Criteria (2000 — legacy helper)',
    shortName: 'Duke 2000',
    description: 'Simplified Li 2000 modified Duke major/minor count. Does not implement the 2023 Duke-ISCVID criteria.',
    category: 'infectious-disease',
    tags: ['endocarditis', 'duke', 'infection', 'legacy'],
    status: 'legacy',
    supersededBy: 'duke-iscvid-2023',
    whenToUse: 'Historical comparison with the 2000 modified Duke clinical count. Use duke-iscvid-2023 for current classification.',
    whyUse: 'Preserves the Li 2000 definite/possible/rejected count. The 2023 Duke-ISCVID revision expanded typical organisms, imaging, molecular diagnostics, and surgical criteria.',
    inputs: [
      yesNo('bloodCx',
        'Major: Typical organism from 2 separate blood cultures (or equivalent major micro)',
        1,
        'Li 2000 major micro: viridans streptococci, S. gallolyticus/bovis, S. aureus, HACEK, or community-acquired enterococci without a primary focus from 2 separate cultures; OR persistently positive cultures of a microorganism consistent with IE (≥2 ≥12 h apart, or 3 / majority of ≥4 with first–last ≥1 h apart); OR single Coxiella burnetii culture or antiphase I IgG >1:800.', true),
      yesNo('echo',
        'Major: Evidence of endocardial involvement (echo/new regurg)',
        1,
        'Oscillating intracardiac mass on valve, supporting structure, or implanted material (in the path of a regurgitant jet); abscess; new partial dehiscence of a prosthetic valve; or new valvular regurgitation. A change in preexisting murmur is not sufficient.', true),
      yesNo('predisposing',
        'Minor: Predisposing heart condition or IVDU',
        0,
        'Prior IE, prosthetic valve, unrepaired cyanotic CHD, or significant native-valve disease; or injection-drug use.', true),
      yesNo('fever', 'Minor: Fever ≥38°C', 0, 'Temperature ≥38.0 °C.', true),
      yesNo('vascular',
        'Minor: Vascular phenomena (emboli, Janeway, etc.)',
        0,
        'Major arterial emboli, septic pulmonary infarcts, mycotic aneurysm, intracranial hemorrhage, conjunctival hemorrhages, or Janeway lesions.', false),
      yesNo('immuno',
        'Minor: Immunologic phenomena (Osler, Roth, GN, RF)',
        0,
        'Glomerulonephritis, Osler nodes, Roth spots, or rheumatoid factor (RF = rheumatoid factor, not rheumatic fever).', false),
      yesNo('microMinor',
        'Minor: Microbiologic evidence not meeting major',
        0,
        'Positive blood culture that does not meet major criteria, or serologic evidence of active infection with an organism consistent with IE. Do not count if major microbiology is already Yes.', false),
    ],
    calculate(values) {
      const major = (bool(values.bloodCx) ? 1 : 0) + (bool(values.echo) ? 1 : 0);
      const minor =
        (bool(values.predisposing) ? 1 : 0) +
        (bool(values.fever) ? 1 : 0) +
        (bool(values.vascular) ? 1 : 0) +
        (bool(values.immuno) ? 1 : 0) +
        (bool(values.microMinor) && !bool(values.bloodCx) ? 1 : 0);
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
      summary: 'Li 2000 modified Duke clinical criteria classify IE as definite, possible, or rejected. This helper does not implement Duke-ISCVID 2023 (expanded typical organisms, molecular diagnostics, cardiac CT / FDG-PET/CT, intraoperative surgical major criterion, and updated predisposing/vascular/immunologic definitions).',
      validation: 'Legacy 2000 clinical-count helper. Prefer duke-iscvid-2023 for current diagnostic classification.',
      references: [
        { title: 'Proposed modifications to the Duke criteria for IE', citation: 'Li JS et al. Clin Infect Dis. 2000', year: 2000, pmid: '10770721',
          doi: '10.1086/313753' },
        { title: 'The 2023 Duke-International Society for Cardiovascular Infectious Diseases Criteria for Infective Endocarditis', citation: 'Fowler VG et al. Clin Infect Dis. 2023;77:518-526', year: 2023, pmid: '37138445', doi: '10.1093/cid/ciad271' },
      ],
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
      yesNo('strep',
        'Evidence of preceding GAS infection (culture, rapid test, or rising ASO/anti-DNase B)',
        0,
        'Throat culture, rapid antigen, or rising ASO/anti-DNase B. Isolated Sydenham chorea or documented indolent carditis may be diagnosed without laboratory GAS evidence.', true),
      yesNo('carditis',
        'Major: Carditis',
        0,
        'Clinical valvulitis and/or subclinical echocardiographic carditis (2015 Jones). Do not also count prolonged PR as a minor if carditis is a major.', true),
      yesNo('indolentCarditis',
        'Documented indolent carditis (Jones exception)',
        0,
        'Late/indolent rheumatic carditis may be diagnosed without Jones majors/minors and without laboratory GAS evidence. Distinct from counting acute carditis as a major.', false),
      yesNo('arthritis',
        'Major: Arthritis (migratory polyarthritis)',
        0,
        'Low-risk populations: migratory polyarthritis only. Moderate/high-risk: monoarthritis or polyarthritis (or polyarthralgia as a minor — not both with arthritis). Do not count arthralgia as a minor if arthritis is major.', false),
      yesNo('chorea',
        'Major: Chorea',
        0,
        'Sydenham chorea: purposeless, involuntary movements; often delayed after GAS. May be the sole manifestation.', false),
      yesNo('erythema',
        'Major: Erythema marginatum',
        0,
        'Evanescent, non-pruritic, serpiginous/annular pink rash on the trunk and proximal limbs; spares the face.', false),
      yesNo('nodules',
        'Major: Subcutaneous nodules',
        0,
        'Firm, painless nodules over extensor surfaces or bony prominences (elbows, knees, wrists, occiput, spinous processes).', false),
      yesNo('arthralgia',
        'Minor: Arthralgia',
        0,
        'Joint pain without arthritis. Do not count if arthritis is already scored as a major.', false),
      yesNo('fever',
        'Minor: Fever',
        0,
        '≥38.5 °C in low-risk populations; ≥38.0 °C in moderate/high-risk populations (2015 AHA).', false),
      yesNo('elevatedAPR',
        'Minor: Elevated ESR/CRP',
        0,
        'Low-risk: ESR ≥60 mm/h or CRP ≥3.0 mg/dL. Moderate/high-risk: ESR ≥30 mm/h (CRP ≥3.0 mg/dL still used). Peak acute-phase reactant.', true),
      yesNo('prolongedPR',
        'Minor: Prolonged PR interval',
        0,
        'PR prolonged for age and rate (adults typically PR >200 ms / 0.20 s; use an age-adjusted table in children). Do not count if carditis is already a major.', false),
    ],
    calculate(values) {
      const carditis = bool(values.carditis);
      const arthritis = bool(values.arthritis);
      const chorea = bool(values.chorea);
      const indolentCarditis = bool(values.indolentCarditis);
      const strep = bool(values.strep);
      const jonesException = chorea || indolentCarditis;
      const major =
        (carditis ? 1 : 0) +
        (arthritis ? 1 : 0) +
        (chorea ? 1 : 0) +
        (bool(values.erythema) ? 1 : 0) +
        (bool(values.nodules) ? 1 : 0);
      const minor =
        (!arthritis && bool(values.arthralgia) ? 1 : 0) +
        (bool(values.fever) ? 1 : 0) +
        (bool(values.elevatedAPR) ? 1 : 0) +
        (!carditis && bool(values.prolongedPR) ? 1 : 0);
      const initialPattern = major >= 2 || (major >= 1 && minor >= 2);
      if (!strep && !jonesException) {
        return {
          score: `${major} maj / ${minor} min`,
          label: 'Insufficient (no strep evidence)',
          interpretation: 'Except for isolated Sydenham chorea or indolent carditis, evidence of preceding GAS is required.',
          riskLevel: 'info',
        };
      }
      if (jonesException && !initialPattern) {
        return {
          score: `${major} maj / ${minor} min`,
          label: 'Meets Jones exception (chorea / indolent carditis)',
          interpretation: chorea
            ? 'Isolated Sydenham chorea may be diagnosed as ARF without other Jones manifestations and without laboratory evidence of preceding GAS.'
            : 'Indolent carditis may be diagnosed as ARF/RHD without other Jones manifestations and without laboratory evidence of preceding GAS.',
          riskLevel: 'high',
        };
      }
      if (initialPattern) {
        return {
          score: `${major} maj / ${minor} min`,
          label: 'Meets Jones (initial ARF pattern)',
          interpretation: strep
            ? 'With GAS evidence: 2 major or 1 major + 2 minor supports initial ARF diagnosis. Arthralgia is not counted if arthritis is a major; prolonged PR is not counted if carditis is a major.'
            : 'Jones exception (chorea or indolent carditis): 2 major or 1 major + 2 minor supports ARF diagnosis without laboratory GAS evidence. Arthralgia is not counted if arthritis is a major; prolonged PR is not counted if carditis is a major.',
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
      summary:
        'Jones criteria (2015 AHA): initial ARF is 2 majors or 1 major + 2 minors plus evidence of preceding GAS. Arthralgia is a minor only if arthritis is not a major; prolonged PR is a minor only if carditis is not a major. Isolated Sydenham chorea and indolent carditis may be diagnosed without laboratory GAS evidence.',
      validation: 'AHA guidelines for ARF diagnosis.',
      references: [{ title: 'Revision of Jones Criteria for ARF', citation: 'Gewitz MH et al. Circulation. 2015', year: 2015, pmid: '25908771',
          doi: '10.1161/CIR.0000000000000205', }],
    },
    nextSteps: [
      { condition: 'Meets criteria', actions: ['Anti-inflammatory therapy', 'Antibiotic treatment/eradication', 'Secondary prophylaxis', 'Echo'] },
    ],
    pearls: [
      'Low-risk = ARF incidence <2/100,000 school-age children or RHD prevalence ≤1/1000; otherwise use moderate/high-risk joint and fever/ESR cutoffs.',
      'Recurrent ARF 3-minor pathway is not implemented here — initial ARF is 2 major or 1 major + 2 minor with GAS evidence, except isolated chorea or indolent carditis.',
    ],
  },
  {
    id: 'centor-feverpain',
    name: 'FeverPAIN Score',
    shortName: 'FeverPAIN (legacy)',
    description: 'UK NICE-aligned sore throat score for antibiotic stewardship.',
    category: 'infectious-disease',
    tags: ['pharyngitis', 'strep', 'feverpain'],
    status: 'superseded',
    supersededBy: 'feverpain-score',
    whenToUse: 'Acute sore throat antibiotic decision support.',
    whyUse: 'Predicts bacterial (strep) probability; guides delayed Rx strategies.',
    inputs: [
      yesNo('fever', 'Fever in past 24h', 1, 'Documented or patient-reported fever during the previous 24 hours (FeverPAIN has no specific °C cutoff).', true),
      yesNo('purulence', 'Purulence (pus on tonsils)', 1, 'Pus visible on the tonsils — not nasal discharge or post-nasal drip.', false),
      yesNo('attend3', 'Attend rapidly (illness ≤3 days)', 1, 'Symptom onset ≤3 days before this attendance.', false),
      yesNo('inflamed', 'Severely inflamed tonsils', 1, 'Marked tonsillar erythema and swelling, not mild pharyngeal injection / everyday sore-throat redness.', true),
      yesNo('noCough', 'No cough or coryza', 1, 'Score Yes only if both cough and coryza (runny/stuffy nose) are absent.', true),
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
      yesNo('pndOrthopnea',
        'Major: Paroxysmal nocturnal dyspnea (PND) or orthopnea',
        1,
        'McKee 1971 treats PND or orthopnea as one major — tick once if either is present (do not double-count).', true),
      yesNo('neckVein',
        'Major: Neck-vein distention',
        1,
        'Visible jugular venous distention. Separate from PND/orthopnea and from measured CVP >16 cm H2O.', false),
      yesNo('rales', 'Major: Rales', 1, 'Pulmonary rales/crackles (typically basal).', true),
      yesNo('cardiomegaly', 'Major: Cardiomegaly', 1, 'Radiographic cardiomegaly (CXR cardiothoracic ratio >0.5), not physical exam impression alone.', false),
      yesNo('edemaPulm', 'Major: Acute pulmonary edema', 1, 'Acute alveolar pulmonary edema (clinical ± radiographic).', false),
      yesNo('s3', 'Major: S3 gallop', 1, 'Audible third heart sound.', false),
      yesNo('cvp',
        'Major: Increased venous pressure (CVP >16 cm H2O)',
        1,
        'Measured central venous pressure >16 cm H2O at the right atrium. Distinct from visible neck-vein distention and from hepatojugular reflux.', false),
      yesNo('hjr',
        'Major: Hepatojugular reflux',
        1,
        'Sustained rise in JVP with abdominal/hepatic pressure. Distinct from resting neck-vein distention and from CVP >16 cm H2O.', false),
      yesNo('weightLoss', 'Major: Weight loss >4.5 kg in 5 days with treatment', 1, 'Weight loss >4.5 kg (10 lb) in 5 days in response to HF treatment (not unexplained cachexia).', false),
      yesNo('ankleEdema', 'Minor: Ankle edema', 0, 'Bilateral ankle edema. Count minors only if not explained by another disease.', true),
      yesNo('nightCough', 'Minor: Night cough', 0, 'Nocturnal cough attributed to HF, not another lung disease, and distinct from paroxysmal nocturnal dyspnea (already a major).', false),
      yesNo('doe', 'Minor: Dyspnea on exertion', 0, 'Dyspnea on ordinary exertion.', true),
      yesNo('hepato', 'Minor: Hepatomegaly', 0, 'Hepatomegaly attributed to congestion.', false),
      yesNo('pleural', 'Minor: Pleural effusion', 0, 'Pleural effusion (exam or imaging).', false),
      yesNo('hr120', 'Minor: Tachycardia >120', 0, 'Heart rate >120 bpm.', false),
      yesNo('vc', 'Minor: Decrease in vital capacity by 1/3', 0, 'Vital capacity decreased by one-third from the maximum recorded for that patient.', false),
    ],
    calculate(values) {
      const majorKeys = ['pndOrthopnea', 'neckVein', 'rales', 'cardiomegaly', 'edemaPulm', 's3', 'cvp', 'hjr', 'weightLoss'];
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
      summary:
        'Framingham (McKee 1971) clinical HF: 2 majors or 1 major + 2 minors. PND or orthopnea is a single major. Neck-vein distention, CVP >16 cm H2O, and hepatojugular reflux are separate majors. Minors count only if not explained by another disease.',
      validation: 'Used in epidemiologic studies; modern diagnosis also uses BNP/echo.',
      references: [{ title: 'The natural history of congestive heart failure: the Framingham study', citation: 'McKee PA et al. N Engl J Med. 1971', year: 1971, pmid: '5122894',
          doi: '10.1056/NEJM197112232852601', }],
    },
    nextSteps: [
      { condition: 'HF suspected/met', actions: ['BNP/NT-proBNP', 'Echo', 'GDMT if HFrEF', 'Volume management'] },
    ],
    pearls: [
      'Count minors only if not explained by another condition (pulmonary, renal, venous disease).',
      'McKee 1971: PND or orthopnea is one major; neck-vein distention, CVP >16 cm H2O, and hepatojugular reflux are separate majors.',
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
      selectInput('class',
        'Symptom class',
        [
          { label: 'I — No limitation of physical activity', value: 1, description: 'Ordinary physical activity does not cause undue fatigue, palpitations, or dyspnea.' },
          { label: 'II — Slight limitation; comfortable at rest', value: 2, description: 'Ordinary physical activity causes fatigue, palpitations, or dyspnea.' },
          { label: 'III — Marked limitation; comfortable at rest', value: 3, description: 'Less than ordinary activity causes fatigue, palpitations, or dyspnea.' },
          { label: 'IV — Symptoms at rest; any activity causes discomfort', value: 4, description: 'Unable to carry on any physical activity without discomfort. Symptoms of HF at rest; any activity increases discomfort.' },
        ], 2,
        'Classify by symptoms typical of the last 1–2 weeks in known HF (NYHA/AHA wording).'),
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
      references: [{
        title: 'Nomenclature and Criteria for Diagnosis of Diseases of the Heart and Great Vessels. 9th ed.',
        citation: 'The Criteria Committee of the New York Heart Association. Little, Brown & Co. 1994. p. 253-256',
        year: 1994,
        url: 'https://professional.heart.org/en/guidelines-and-statements/classification',
      }],
    },
    nextSteps: [
      { condition: 'Class III–IV', actions: ['Ensure GDMT', 'Evaluate for CRT/ICD if indicated', 'Advanced HF referral'] },
    ],
  },
  {
    id: 'pao2-fio2-age-expected',
    name: 'Expected PaO₂ (Age)',
    shortName: 'Expected PaO₂ (legacy)',
    status: 'superseded',
    supersededBy: 'expected-pao2',
    description: 'Rough expected arterial PaO₂ on room air by age.',
    category: 'pulmonary',
    tags: ['abg', 'oxygenation'],
    whenToUse: 'ABG interpretation on room air.',
    whyUse: 'PaO₂ normally declines with age.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 0, max: 110, exampleValue: 60, helpText: 'Expected room-air PaO₂ ≈ 100 − 0.3×age mmHg (sea level).' }),
      numberInput('pao2', 'Measured PaO₂', { unit: 'mmHg', min: 20, max: 120, exampleValue: 80, helpText: 'Room-air PaO₂ at sea level. Not for supplemental oxygen or altitude. Flagged below expected if measured is >5 mmHg under 100 − 0.3×age.' }),
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
      references: [{ title: 'The alveolar-arterial oxygen difference: its size and components in normal man', citation: 'Mellemgaard K. Acta Physiol Scand. 1966 (classic PaO₂–age regression; bedside 100 − 0.3×age is a rounded teaching form)', year: 1966, pmid: '5963295' }],
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
      numberInput('qt', 'QT interval', { unit: 'ms', min: 200, max: 800, exampleValue: 400, helpText: 'Measure from QRS onset to the end of the T wave (not U wave) in a lead with a clear T; use a representative RR.' }),
      numberInput('hr', 'Heart rate', { unit: 'bpm', min: 30, max: 220, exampleValue: 70, helpText: 'Use the same cycle as the measured QT (or the mean HR of that tracing).' }),
      selectInput('sex', 'Sex', [
        { label: 'Male', value: 'M' },
        { label: 'Female', value: 'F' },
      ], "M", 'AHA/ACCF/HRS adult prolonged-QTc cuts are sex-specific (>450 ms men, >460 ms women).'),
    ],
    calculate(values) {
      const qt = num(values.qt, 400);
      const hr = num(values.hr, 70);
      const female = values.sex === 'F';
      if (hr <= 0) {
        return {
          score: '—',
          unit: 'ms',
          label: 'Invalid heart rate',
          interpretation: 'Heart rate must be greater than 0 bpm to calculate QTc.',
          riskLevel: 'info',
          details: [{ label: 'Formula', value: 'QT / ∛RR' }],
        };
      }
      const rr = 60 / hr;
      const qtc = round(qt / Math.cbrt(rr), 0);
      const prolongedCut = female ? 460 : 450;
      const sexLabel = female ? 'women' : 'men';
      let riskLevel: 'normal' | 'moderate' | 'high' | 'critical' = 'normal';
      let label = 'Normal QTc';
      let interpretation = `Fridericia QTc ${qtc} ms within the AHA/ACCF/HRS adult range for ${sexLabel} (prolonged if >${prolongedCut} ms).`;
      if (qtc < 350) {
        riskLevel = 'moderate';
        label = 'Short QTc';
        interpretation = `QTc ${qtc} ms: short QTc (<350 ms). Consider short QT syndrome workup if persistent, or hypercalcemia/digitalis effect.`;
      } else if (qtc >= 500) {
        riskLevel = 'critical';
        label = 'Markedly prolonged';
        interpretation = `QTc ${qtc} ms: ≥500 ms — high TdP risk (sex-independent safety cutoff).`;
      } else if (qtc > prolongedCut) {
        riskLevel = 'high';
        label = 'Prolonged';
        interpretation = `QTc ${qtc} ms: prolonged for ${sexLabel} (AHA/ACCF/HRS >${prolongedCut} ms). Review meds/electrolytes.`;
      } else if (qtc >= 440) {
        riskLevel = 'moderate';
        label = 'Borderline';
        interpretation = `QTc ${qtc} ms: borderline for ${sexLabel} (440–${prolongedCut} ms; prolonged if >${prolongedCut} ms).`;
      }
      return {
        score: qtc,
        unit: 'ms',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Sex', value: female ? 'Female' : 'Male' },
          { label: 'Prolonged cutoff', value: `>${prolongedCut} ms (${sexLabel})` },
          { label: 'Formula', value: 'QT / ∛RR' },
        ],
      };
    },
    evidence: {
      summary: 'QTcF = QT / ∛RR. Adult prolonged QTc per AHA/ACCF/HRS ECG recommendations: >450 ms in men, >460 ms in women. ≥500 ms is a sex-independent high TdP-risk cut.',
      formula: 'QTcF = QT / ∛RR (RR in seconds). Prolonged: >450 ms men, >460 ms women (AHA/ACCF/HRS 2009).',
      validation: 'Fridericia preferred over Bazett at HR extremes; sex-specific adult cuts from AHA/ACCF/HRS ECG standardization, not a unisex 440/460/500 scheme.',
      references: [
        { title: 'The duration of systole in an electrocardiogram in normal humans and in patients with heart disease (1920)', citation: 'Fridericia LS. Acta Med Scand. 1920. English reprint: Ann Noninvasive Electrocardiol. 2003', year: 1920, pmid: '14516292',
          doi: '10.1046/j.1542-474x.2003.08413.x', },
        {
          title: 'AHA/ACCF/HRS recommendations for the standardization and interpretation of the electrocardiogram: part IV: the ST segment, T and U waves, and the QT interval',
          citation: 'Rautaharju PM et al. Circulation. 2009 (prolonged QTc >450 ms men, >460 ms women)',
          year: 2009,
          pmid: '19228821',
          doi: '10.1161/circulationaha.108.191096',
        },
      ],
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
      numberInput('na', 'Na', { unit: 'mEq/L', exampleValue: 140, min: 100, max: 180, helpText: 'K-inclusive AG = Na + K − (Cl + HCO₃). Normal is higher than the no-K method (~12–16 vs ~8–12).' }),
      numberInput('k', 'K', { unit: 'mEq/L', exampleValue: 4, min: 1, max: 10, step: 0.1, helpText: 'Serum potassium in mEq/L for the Na + K − (Cl + HCO₃) variant. Normal ranges run about 12–16 with K included, so compare it only with lab reports that use the same method.' }),
      numberInput('cl', 'Cl', { unit: 'mEq/L', exampleValue: 104, min: 70, max: 140, helpText: 'Serum chloride in mEq/L from the same chemistry panel as the sodium, potassium, and bicarbonate.' }),
      numberInput('hco3', 'HCO₃', { unit: 'mEq/L', exampleValue: 24, min: 1, max: 50, helpText: 'Serum bicarbonate (total CO₂) in mEq/L from the same panel; the potassium-inclusive gap normally runs higher than the standard Na − (Cl + HCO₃) gap.' }),
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
      references: [{ title: 'Clinical use of the anion gap', citation: 'Emmett M, Narins RG. Medicine (Baltimore). 1977', year: 1977, pmid: '401925' }],
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
      numberInput('heightIn', 'Height', { unit: 'inches', min: 55, max: 84, exampleValue: 67, helpText: 'Height in inches (e.g. 5′7″ = 67 in). Below 5 ft (60 in) the same per-inch increment is subtracted. ±10% frame-size adjustment is sometimes applied after the result.' }),
      selectInput('sex', 'Sex', [
        { label: 'Male', value: 'M' },
        { label: 'Female', value: 'F' },
      ], "M", 'Hamwi basis: male 48.0 kg + 2.7 kg per inch over 5 ft; female 45.5 kg + 2.3 kg per inch. Frame-size adjustments of ±10% are sometimes applied on top.'),
    ],
    calculate(values) {
      const h = num(values.heightIn, 67);
      const over = h - 60; // signed: subtract the same per-inch increment below 5 ft
      const ibw = values.sex === 'F' ? 100 + 5 * over : 106 + 6 * over;
      const shortNote =
        h < 60
          ? ` Height ${h} in is below 5 ft: subtracted ${round(60 - h, 1)} in × ${values.sex === 'F' ? '5' : '6'} lb (common Hamwi extension; ≈2.3 kg/inch).`
          : '';
      return {
        score: round(ibw, 0),
        unit: 'lb',
        label: 'Hamwi IBW',
        interpretation: `≈${round(ibw * 0.4536, 1)} kg. Frame size adjustments ±10% sometimes applied.${shortNote}`,
        riskLevel: 'info',
      };
    },
    evidence: {
      summary: 'Hamwi: Men 106 lb + 6 lb/inch over 5 ft; Women 100 + 5 lb/inch over 5 ft. Below 5 ft the same per-inch term is subtracted (men 6 lb, women 5 lb ≈ 2.3 kg per inch).',
      validation: 'Nutrition practice formula.',
      references: [
        {
          title: 'Therapy: changing dietary concepts (Hamwi ideal body weight)',
          citation: 'Hamwi GJ. In: Danowski TS, ed. Diabetes Mellitus: Diagnosis and Treatment. Vol 1. American Diabetes Association. 1964:73-78',
          year: 1964,
        },
        {
          title: 'The origin of the “ideal” body weight equations',
          citation: 'Pai MP, Paloucek FP. Ann Pharmacother. 2000',
          year: 2000,
          pmid: '10981254',
          doi: '10.1345/aph.19381',
        },
      ],
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
      numberInput('ca', 'Total Ca', { unit: 'mmol/L', min: 1, max: 4, step: 0.01, exampleValue: 2.0, helpText: 'Total (not ionized) calcium in mmol/L. US conventional mg/dL ÷ 4 ≈ mmol/L.' }),
      numberInput('alb', 'Albumin', { unit: 'g/L', min: 10, max: 50, exampleValue: 25, helpText: 'Albumin in g/L (g/dL × 10). Reference 40 g/L in the Payne-style correction.' }),
    ],
    calculate(values) {
      const ca = num(values.ca, 2);
      const alb = num(values.alb, 25);
      const corr = round(ca + 0.02 * (40 - alb), 2);
      const r = riskFromThresholds(corr, [
        { max: 2.19, level: 'moderate', label: 'Low', interpretation: 'Corrected Ca <2.20 mmol/L — below the typical adult 2.20–2.60 mmol/L interval.' },
        { max: 2.6, level: 'normal', label: 'Normal', interpretation: 'Within approximate adult range (2.20–2.60 mmol/L).' },
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
