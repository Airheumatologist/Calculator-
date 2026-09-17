import type { Calculator } from '../../types/calculator';
import { num, bool, str, round, yesNo, selectInput, numberInput } from '../../utils/helpers';

/** TASH-Score → estimated probability of massive transfusion (Yücel 2006 observed-frequency table). */
function tashProbability(score: number): number {
  const table: Record<number, number> = {
    9: 6, 10: 8, 11: 11, 12: 14, 13: 18, 14: 23, 15: 29, 16: 35, 17: 43,
    18: 50, 19: 57, 20: 65, 21: 71, 22: 77, 23: 82, 24: 85,
  };
  if (score <= 8) return 5; // published as "<5%"
  if (score >= 25) return 85; // published as ">85%"
  return table[score] ?? 85;
}

/**
 * Hankinson 1999 (NHANES III) predicted peak expiratory flow coefficients.
 * PEF (L/s) = b0 + b1*age + b2*age² + b3*heightCm², keyed by sex, ethnicity, and age stratum.
 */
const HANKINSON_PEF: Record<string, { b0: number; b1: number; b2: number; b3: number }> = {
  'white-male-y': { b0: -0.5962, b1: -0.12357, b2: 0.013135, b3: 0.00024962 },
  'white-male-a': { b0: 1.0523, b1: 0.08272, b2: -0.001301, b3: 0.00024962 },
  'white-female-y': { b0: -3.6181, b1: 0.60644, b2: -0.016846, b3: 0.00018623 },
  'white-female-a': { b0: 0.9267, b1: 0.06929, b2: -0.001031, b3: 0.00018623 },
  'black-male-y': { b0: -0.2684, b1: -0.28016, b2: 0.018202, b3: 0.00027333 },
  'black-male-a': { b0: 2.2257, b1: -0.04082, b2: 0, b3: 0.00027333 },
  'black-female-y': { b0: -1.2398, b1: 0.16375, b2: 0, b3: 0.00019746 },
  'black-female-a': { b0: 1.3597, b1: 0.03458, b2: -0.000847, b3: 0.00019746 },
  'mexican-male-y': { b0: -0.9537, b1: -0.19602, b2: 0.014497, b3: 0.00030243 },
  'mexican-male-a': { b0: 0.087, b1: 0.0658, b2: -0.001195, b3: 0.00030243 },
  'mexican-female-y': { b0: -3.2549, b1: 0.47495, b2: -0.013193, b3: 0.00022203 },
  'mexican-female-a': { b0: 0.2401, b1: 0.06174, b2: -0.001023, b3: 0.00022203 },
};

function hankinsonPefLmin(age: number, heightCm: number, sex: string, race: string): number {
  const stratum = age < 20 ? 'y' : 'a';
  const c = HANKINSON_PEF[`${race}-${sex}-${stratum}`];
  const ls = c.b0 + c.b1 * age + c.b2 * age * age + c.b3 * heightCm * heightCm;
  return ls * 60;
}

/** Wave 8 — trauma, orthopedic, ICU severity/pain, and pulmonary calculators. */
export const wave8TraumaOrthoCalcs: Calculator[] = [
  // ─── 1. mBIG ───────────────────────────────────────────────────────────────
  {
    id: 'mbig',
    name: 'Modified Brain Injury Guideline (mBIG)',
    shortName: 'mBIG',
    description:
      'Modified Brain Injury Guideline risk-stratifies mild TBI patients (GCS 13–15) with intracranial hemorrhage into mBIG 1, 2, or 3 to guide observation, admission, and repeat imaging.',
    category: 'emergency',
    tags: ['mbig', 'big', 'tbi', 'head injury', 'intracranial hemorrhage', 'brain injury', 'trauma'],
    whenToUse:
      'Adults with mild traumatic brain injury (GCS 13–15), an intracranial hemorrhage on CT, and no focal neurologic deficit or pupillary abnormality.',
    whyUse:
      'Separates mild TBI patients who can be safely observed (mBIG 1) or admitted to the floor (mBIG 2) from those needing standard neurosurgical management (mBIG 3), reducing unnecessary repeat CTs and ICU utilization.',
    inputs: [
      yesNo('eligible', 'Meets mBIG entry criteria (GCS 13–15, ICH on CT, no focal deficit or pupillary abnormality)', null, 'mBIG was derived for mild TBI with intracranial hemorrhage. Patients outside these criteria need standard neurosurgical triage rather than mBIG stratification.', true),
      yesNo('anticoag', 'Anticoagulation or antiplatelet medication', null, 'High-risk (mBIG 3) criterion.', false),
      yesNo('edh', 'Epidural hematoma', null, 'High-risk (mBIG 3) criterion.', false),
      yesNo('ivh', 'Intraventricular hemorrhage', null, 'High-risk (mBIG 3) criterion.', false),
      yesNo('displacedFx', 'Displaced skull fracture', null, 'High-risk (mBIG 3) criterion.', false),
      yesNo('sdh8', 'Subdural hematoma ≥8 mm', null, 'High-risk (mBIG 3) criterion.', false),
      yesNo('iph8', 'Intraparenchymal hemorrhage ≥8 mm or multiple IPH', null, 'High-risk (mBIG 3) criterion.', false),
      yesNo('sahHigh', 'Bihemispheric SAH or SAH >3 mm', null, 'High-risk (mBIG 3) criterion.', false),
      yesNo('nondisplacedFx', 'Nondisplaced skull fracture', null, 'Intermediate (mBIG 2) criterion.', false),
      yesNo('sdh4to8', 'Subdural hematoma >4 to <8 mm', null, 'Intermediate (mBIG 2) criterion.', false),
      yesNo('iph4to8', 'Intraparenchymal hemorrhage >4 to <8 mm', null, 'Intermediate (mBIG 2) criterion.', false),
      yesNo('sahMod', 'SAH in one hemisphere involving >3 sulci and 1–3 mm', null, 'Intermediate (mBIG 2) criterion.', false),
      yesNo('etoh', 'Blood alcohol level >80 mg/dL', null, 'Intermediate (mBIG 2) criterion.', false),
    ],
    calculate(values) {
      if (!bool(values.eligible)) {
        return {
          score: '—',
          label: 'Entry criteria not met',
          interpretation:
            'mBIG applies only to mild TBI (GCS 13–15) with intracranial hemorrhage and no focal neurologic deficit or pupillary abnormality. Manage per standard neurosurgical triage.',
          riskLevel: 'info',
          details: [{ label: 'Entry criteria', value: 'Not met' }],
          alerts: ['Patient does not meet mBIG entry criteria — do not apply mBIG tiers.'],
        };
      }
      const high = ['anticoag', 'edh', 'ivh', 'displacedFx', 'sdh8', 'iph8', 'sahHigh'].filter((k) => bool(values[k]));
      const mid = ['nondisplacedFx', 'sdh4to8', 'iph4to8', 'sahMod', 'etoh'].filter((k) => bool(values[k]));
      const tier = high.length > 0 ? 3 : mid.length > 0 ? 2 : 1;
      const label = `mBIG ${tier}`;
      const interpretation =
        tier === 3
          ? 'High-risk mBIG 3 — manage per standard institutional TBI protocol (typically neurosurgical consultation, admission, and repeat CT per local practice).'
          : tier === 2
            ? 'Intermediate mBIG 2 — general floor admission for 24–48 hours with serial neurologic checks; routine repeat CT and neurosurgery consult are not mandatory.'
            : 'Low-risk mBIG 1 — 6-hour ED observation with serial neurologic checks; no routine admission, repeat CT, or neurosurgical consult. Discharge if GCS 15 and otherwise well.';
      return {
        score: label,
        label,
        interpretation,
        riskLevel: tier === 3 ? 'high' : tier === 2 ? 'moderate' : 'low',
        details: [
          { label: 'High-risk criteria present', value: high.length ? `${high.length}` : 'None' },
          { label: 'Intermediate criteria present', value: mid.length ? `${mid.length}` : 'None' },
        ],
        recommendations:
          tier === 3
            ? ['Neurosurgical consultation', 'Admission with frequent neurologic checks', 'Repeat CT per institutional protocol', 'Reverse anticoagulation as indicated']
            : tier === 2
              ? ['Admit to general floor 24–48 h', 'Serial neurologic checks', 'Repeat CT only if clinical deterioration or per local protocol']
              : ['Observe in ED ~6 h with neurologic checks', 'Discharge if GCS 15, symptoms controlled, and safe disposition', 'Provide head-injury return precautions'],
        alerts: tier === 3 ? ['High-risk mBIG 3 — do not use this tool to defer neurosurgical evaluation.'] : undefined,
      };
    },
    evidence: {
      summary:
        'The modified Brain Injury Guideline (mBIG), proposed by Khan et al. in a multicenter assessment of the original BIG criteria, stratifies mild TBI with intracranial hemorrhage into three tiers by hemorrhage pattern, skull fracture, intoxication, and antithrombotic use.',
      formula:
        'Any high-risk criterion (anticoagulant/antiplatelet, EDH, IVH, displaced skull fracture, SDH ≥8 mm, IPH ≥8 mm or multiple, bihemispheric or >3 mm SAH) → mBIG 3. Else any intermediate criterion (nondisplaced skull fracture, SDH or IPH >4–<8 mm, single-hemisphere SAH >3 sulci at 1–3 mm, blood alcohol >80 mg/dL) → mBIG 2. Else mBIG 1.',
      validation:
        'Khan et al. derived the modification in a multicenter cohort and reported that mBIG 1 patients could be managed without repeat imaging or neurosurgical consultation. Prospective validation remains limited; local neurosurgical protocols take precedence.',
      references: [
        {
          title: 'Multicenter assessment of the Brain Injury Guidelines and a proposal of guideline modifications',
          citation: 'Khan AD et al. Trauma Surg Acute Care Open. 2020',
          year: 2020,
          pmid: '32537518',
          doi: '10.1136/tsaco-2020-000483',
        },
      ],
    },
    nextSteps: [
      { condition: 'mBIG 1', actions: ['6-hour ED observation', 'Serial neurologic checks', 'Discharge if GCS 15 with return precautions'] },
      { condition: 'mBIG 2', actions: ['Floor admission 24–48 h', 'Serial neurologic checks', 'No routine repeat CT or neurosurgery consult required'] },
      { condition: 'mBIG 3', actions: ['Standard TBI admission', 'Neurosurgical consultation', 'Repeat imaging per protocol', 'Reverse anticoagulation if applicable'] },
    ],
    pearls: [
      'Applies only to mild TBI (GCS 13–15) with intracranial hemorrhage and no focal neurologic deficit or pupillary abnormality.',
      'mBIG is a triage guideline, not a substitute for clinical judgment — any deterioration overrides the tier.',
      'Antithrombotic use alone places a patient in the high-risk mBIG 3 tier.',
    ],
  },

  // ─── 2. Modified Denver Criteria for BCVI ──────────────────────────────────
  {
    id: 'modified-denver-bcvi',
    name: 'Modified Denver Criteria for Blunt Cerebrovascular Injury (BCVI)',
    shortName: 'Modified Denver Criteria',
    description:
      'Modified Denver screening criteria for blunt cerebrovascular injury — any positive criterion supports CT angiography of the neck in blunt trauma patients.',
    category: 'emergency',
    tags: ['denver', 'bcvi', 'carotid', 'vertebral', 'cta', 'stroke', 'trauma', 'screening'],
    whenToUse:
      'Blunt trauma patients being evaluated for occult carotid or vertebral artery injury, particularly with high-energy mechanisms or the listed injury patterns.',
    whyUse:
      'BCVI is frequently asymptomatic on presentation but carries a significant risk of delayed ischemic stroke. Expanded Denver criteria increase detection; CTA screening allows early antithrombotic therapy.',
    inputs: [
      yesNo('lefort', 'Le Fort II or III fracture', null, 'Midface fracture indicating high-energy facial trauma — a modified Denver screening criterion.', false),
      yesNo('basilar', 'Basilar skull fracture with carotid canal involvement', null, 'Basilar skull fractures extending into the carotid canal place the internal carotid artery at risk.', false),
      yesNo('dai', 'Diffuse axonal injury with GCS <6', null, 'Severe deceleration/shear injury is associated with BCVI.', false),
      yesNo('cspine', 'Cervical spine fracture (subluxation, extension into the transverse foramen, or C1–C3 body fracture)', null, 'Fracture patterns adjacent to the vertebral artery are classic BCVI screening criteria.', false),
      yesNo('hanging', 'Near-hanging with anoxic brain injury', null, 'Strangulation/near-hanging mechanisms with anoxic injury warrant vascular screening.', false),
    ],
    calculate(values) {
      const met = ['lefort', 'basilar', 'dai', 'cspine', 'hanging'].filter((k) => bool(values[k]));
      const positive = met.length > 0;
      return {
        score: positive ? 'Screen positive' : 'Screen negative',
        label: positive ? 'Denver criterion met — CTA indicated' : 'No modified Denver criteria met',
        interpretation: positive
          ? `${met.length} modified Denver criterion/criteria present. CTA of the head and neck is recommended to screen for blunt cerebrovascular injury.`
          : 'No modified Denver screening criteria are present. Clinical judgment still applies — high-energy mechanisms or focal findings may still warrant CTA.',
        riskLevel: positive ? 'high' : 'normal',
        details: met.length
          ? met.map((k) => ({
              label: 'Criterion',
              value:
                {
                  lefort: 'Le Fort II/III fracture',
                  basilar: 'Basilar skull fracture with carotid canal involvement',
                  dai: 'Diffuse axonal injury with GCS <6',
                  cspine: 'Cervical spine fracture pattern',
                  hanging: 'Near-hanging with anoxic brain injury',
                }[k] ?? k,
            }))
          : [{ label: 'Criteria', value: 'None met' }],
        recommendations: positive
          ? ['CTA head and neck', 'If BCVI found: antithrombotic therapy per protocol', 'Trauma/vascular consultation']
          : ['Continue standard trauma evaluation', 'Consider liberalized screening for high-energy mechanisms even without criteria'],
        alerts: positive ? ['Positive BCVI screen — do not delay CTA; missed BCVI can cause delayed stroke.'] : undefined,
      };
    },
    evidence: {
      summary:
        'Expanded/modified Denver criteria add injury patterns such as Le Fort fractures, basilar skull fractures with carotid canal involvement, DAI with low GCS, cervical spine fracture patterns, and near-hanging to improve detection of blunt cerebrovascular injury.',
      formula: 'Any single positive criterion constitutes a positive screen and prompts CT angiography of the neck.',
      validation:
        'Geddes et al. showed that expanding screening criteria substantially increased BCVI detection. Screening continues to evolve — many centers now use liberalized criteria or universal CTA for high-energy mechanisms, and the original Denver criteria alone miss a meaningful fraction of injuries.',
      references: [
        {
          title: 'Expanded screening criteria for blunt cerebrovascular injury: a bigger impact than anticipated',
          citation: 'Geddes AE et al. Am J Surg. 2016',
          year: 2016,
          pmid: '27751528',
          doi: '10.1016/j.amjsurg.2016.09.016',
        },
      ],
    },
    nextSteps: [
      { condition: 'Any criterion positive', actions: ['CTA head/neck', 'Antithrombotic therapy if BCVI confirmed', 'Trauma/vascular/neurosurgery consultation'] },
      { condition: 'No criteria but high-energy mechanism', actions: ['Consider liberalized screening per local protocol', 'Clinical reassessment'] },
    ],
    pearls: [
      'BCVI may be clinically silent for hours to days before stroke occurs — screening aims to catch it in the latent window.',
      'Denver criteria have low sensitivity when applied strictly; expanded and liberalized criteria catch more injuries.',
      'Digital subtraction angiography remains the reference standard, but CTA is the accepted screening modality.',
    ],
  },

  // ─── 3. CHIP Rule ──────────────────────────────────────────────────────────
  {
    id: 'chip-rule',
    name: 'CHIP (CT in Head Injury Patients) Prediction Rule',
    shortName: 'CHIP Rule',
    description:
      'Original Smits 2007 CHIP rule for minor head injury: a head CT is required if ≥1 major criterion OR ≥2 minor criteria are present.',
    category: 'emergency',
    tags: ['chip', 'minor head injury', 'head ct', 'tbi', 'decision rule', 'trauma'],
    whenToUse:
      'Patients ≥16 years old presenting within 24 hours of blunt head trauma with GCS 13–15, to decide whether a head CT is warranted.',
    whyUse:
      'CHIP was developed for patients both with and without loss of consciousness or post-traumatic amnesia and can substantially reduce CT utilization while maintaining high sensitivity for intracranial findings.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 16, max: 110, exampleValue: 55, helpText: 'Age ≥60 is a major criterion; age 40–60 is a minor criterion.' }),
      yesNo('pedCycle', 'Pedestrian or cyclist struck by vehicle (major)', null, 'Major criterion.', false),
      yesNo('ejected', 'Ejected from vehicle (major)', null, 'Major criterion.', false),
      yesNo('vomiting', 'Vomiting (major)', null, 'Major criterion.', false),
      yesNo('pta4', 'Post-traumatic amnesia ≥4 hours (major)', null, 'Major criterion.', false),
      yesNo('skullFx', 'Clinical signs of skull fracture (major)', null, 'Any injury suggesting skull fracture — palpable discontinuity, CSF leak, raccoon eyes, or bleeding from the ear.', false),
      yesNo('gcs15', 'GCS <15 (major)', null, 'Major criterion.', false),
      yesNo('gcsDrop2', 'GCS deterioration ≥2 points 1 hour after presentation (major)', null, 'Major criterion.', false),
      yesNo('anticoag', 'Anticoagulant therapy (major)', null, 'Major criterion.', false),
      yesNo('seizure', 'Post-traumatic seizure (major)', null, 'Major criterion.', false),
      yesNo('fall', 'Fall from any elevation (minor)', null, 'Minor criterion.', false),
      yesNo('anterograde', 'Persistent anterograde amnesia (minor)', null, 'Any deficit of short-term memory — minor criterion.', false),
      yesNo('pta2to4', 'Post-traumatic amnesia 2 to <4 hours (minor)', null, 'Minor criterion.', false),
      yesNo('contusion', 'Skull contusion (minor)', null, 'Minor criterion.', false),
      yesNo('neuroDeficit', 'Neurologic deficit (minor)', null, 'Minor criterion.', false),
      yesNo('loc', 'Loss of consciousness (minor)', null, 'Minor criterion.', false),
      yesNo('gcsDrop1', 'GCS deterioration of 1 point 1 hour after presentation (minor)', null, 'Minor criterion.', false),
    ],
    calculate(values) {
      const age = num(values.age, 40);
      const majorKeys = ['pedCycle', 'ejected', 'vomiting', 'pta4', 'skullFx', 'gcs15', 'gcsDrop2', 'anticoag', 'seizure'];
      const minorKeys = ['fall', 'anterograde', 'pta2to4', 'contusion', 'neuroDeficit', 'loc', 'gcsDrop1'];
      const major = majorKeys.filter((k) => bool(values[k])).length + (age >= 60 ? 1 : 0);
      const minor = minorKeys.filter((k) => bool(values[k])).length + (age >= 40 && age < 60 ? 1 : 0);
      const ct = major >= 1 || minor >= 2;
      return {
        score: ct ? 'CT indicated' : 'CT not indicated',
        label: ct ? 'Head CT required' : 'Head CT not required by CHIP',
        interpretation: ct
          ? `≥1 major (${major}) or ≥2 minor (${minor}) criteria present — obtain a noncontrast head CT.`
          : `No major criteria and fewer than 2 minor criteria (${minor} minor) — CT not required by the CHIP rule; observe clinically.`,
        riskLevel: ct ? 'high' : 'low',
        details: [
          { label: 'Major criteria', value: `${major}` },
          { label: 'Minor criteria', value: `${minor}` },
        ],
        recommendations: ct
          ? ['Noncontrast head CT', 'Observation per local head-injury protocol']
          : ['Clinical observation with return precautions', 'Reassess if symptoms evolve'],
      };
    },
    evidence: {
      summary:
        'The CHIP prediction rule was derived by Smits et al. (2007) in a multicenter prospective cohort of minor head injury patients. The simple rule requires CT for ≥1 major or ≥2 minor criteria.',
      formula: 'CT indicated if ≥1 major criterion OR ≥2 minor criteria. Age ≥60 = major; age 40–60 = minor.',
      validation:
        'External validation (e.g., the 2018 BMJ multicenter cohort) found high sensitivity for neurosurgical lesions. This implements the original 2007 rule; a 2022 CHIP update reported improved sensitivity without increased CT rates. The Canadian CT Head Rule remains the most widely validated alternative.',
      references: [
        {
          title: 'Predicting intracranial traumatic findings on computed tomography in patients with minor head injury: the CHIP prediction rule',
          citation: 'Smits M et al. Ann Intern Med. 2007',
          year: 2007,
          pmid: '17371884',
          doi: '10.7326/0003-4819-146-6-200703200-00004',
        },
      ],
    },
    nextSteps: [
      { condition: 'CT indicated', actions: ['Obtain noncontrast head CT', 'Observe per head-injury protocol', 'Reassess anticoagulated patients carefully'] },
      { condition: 'CT not indicated', actions: ['Observation', 'Discharge with head-injury instructions if clinically well'] },
    ],
    pearls: [
      'Applies to patients ≥16 with GCS 13–15 within 24 h of blunt head trauma.',
      'Clinical signs of skull fracture include raccoon eyes, CSF leak, ear bleeding, or palpable discontinuity.',
      'This is the original Smits simple rule — a 2022 updated CHIP version exists with different weighting.',
    ],
  },

  // ─── 4. Revised Tokuhashi ──────────────────────────────────────────────────
  {
    id: 'revised-tokuhashi',
    name: 'Revised Tokuhashi Scoring System',
    shortName: 'Revised Tokuhashi',
    description:
      'Predicts life expectancy in patients with spinal metastases using general condition, metastatic burden, primary tumor type, and neurologic status to guide operative versus palliative management.',
    category: 'oncology',
    tags: ['tokuhashi', 'spinal metastases', 'spine tumor', 'prognosis', 'oncology', 'spine surgery'],
    whenToUse:
      'Patients with metastatic spinal disease being considered for surgical excision versus palliative or conservative treatment.',
    whyUse:
      'Estimated survival drives the surgical strategy: poor prognosis favors palliative approaches, intermediate favors palliative/marginal excision, and favorable prognosis supports en bloc excision.',
    inputs: [
      selectInput('kps', 'Karnofsky Performance Status', [
        { label: '80–100%', value: 2, points: 2 },
        { label: '50–70%', value: 1, points: 1 },
        { label: '10–40%', value: 0, points: 0 },
      ], 1, 'General condition as measured by Karnofsky Performance Status.'),
      selectInput('extraspinal', 'Number of extraspinal bone metastases', [
        { label: '0', value: 2, points: 2 },
        { label: '1–2', value: 1, points: 1 },
        { label: '≥3', value: 0, points: 0 },
      ], 1, 'Foci of bone metastasis outside the spine.'),
      selectInput('vertebral', 'Number of metastases in vertebral bodies', [
        { label: '1', value: 2, points: 2 },
        { label: '2', value: 1, points: 1 },
        { label: '≥3', value: 0, points: 0 },
      ], 1, 'Count of involved vertebral bodies.'),
      selectInput('organ', 'Major organ metastases', [
        { label: 'None', value: 2, points: 2 },
        { label: 'Present but removable', value: 1, points: 1 },
        { label: 'Present, unremovable', value: 0, points: 0 },
      ], 1, 'Metastases to lung, liver, kidney, or brain; "removable" implies surgically treatable.'),
      selectInput('primary', 'Primary cancer site', [
        { label: 'Thyroid, prostate, breast, or carcinoid', value: 5, points: 5 },
        { label: 'Rectum', value: 4, points: 4 },
        { label: 'Kidney or uterus', value: 3, points: 3 },
        { label: 'Other / not listed', value: 2, points: 2 },
        { label: 'Liver, gallbladder, or unidentified', value: 1, points: 1 },
        { label: 'Lung, osteosarcoma, stomach, bladder, esophagus, or pancreas', value: 0, points: 0 },
      ], 5, 'Primary tumor histology — the most heavily weighted factor.'),
      selectInput('frankel', 'Frankel neurologic grade', [
        { label: 'E (normal)', value: 2, points: 2 },
        { label: 'C or D', value: 1, points: 1 },
        { label: 'A or B', value: 0, points: 0 },
      ], 2, 'Frankel grade of spinal cord function: A–B = complete/severe deficit, C–D = partial, E = normal.'),
    ],
    calculate(values) {
      const score =
        num(values.kps) + num(values.extraspinal) + num(values.vertebral) + num(values.organ) + num(values.primary) + num(values.frankel);
      let label: string;
      let interpretation: string;
      let riskLevel: 'low' | 'moderate' | 'high';
      if (score <= 8) {
        label = 'Predicted survival <6 months';
        interpretation = 'Score 0–8: mean survival <6 months. Palliative/conservative management is generally favored.';
        riskLevel = 'high';
      } else if (score <= 11) {
        label = 'Predicted survival ≥6 months';
        interpretation = 'Score 9–11: mean survival ≥6 months. Palliative or marginal (intralesional) excision may be considered.';
        riskLevel = 'moderate';
      } else {
        label = 'Predicted survival ≥12 months';
        interpretation = 'Score 12–15: mean survival ≥12 months. Excisional (en bloc) surgery may be appropriate.';
        riskLevel = 'low';
      }
      return {
        score,
        label,
        interpretation,
        riskLevel,
        details: [{ label: 'Total score', value: `${score} / 15` }],
        recommendations:
          score <= 8
            ? ['Palliative care planning', 'Radiation and symptom control', 'Minimally invasive stabilization only if needed for pain/stability']
            : score <= 11
              ? ['Multidisciplinary tumor board', 'Consider palliative/marginal excision or separation surgery', 'Radiation oncology evaluation']
              : ['Surgical oncology evaluation', 'Consider en bloc or aggressive resection', 'Multidisciplinary tumor board'],
      };
    },
    evidence: {
      summary:
        'Tokuhashi et al. revised their original scoring system in 2005 using six parameters (general condition, extraspinal bone metastases, vertebral metastases, major organ metastases, primary tumor site, and neurologic status) to predict survival in spinal metastasis.',
      formula: 'Sum of six graded parameters (0–15). 0–8 → <6 months; 9–11 → ≥6 months; 12–15 → ≥12 months predicted survival.',
      validation:
        'Validated in multiple cohorts; more accurate for good-prognosis tumors than for poor-prognosis primaries. Subsequent systems (e.g., New England Spinal Metastasis Score) have attempted to improve calibration in modern treatment eras.',
      references: [
        {
          title: 'A revised scoring system for preoperative evaluation of metastatic spine tumor prognosis',
          citation: 'Tokuhashi Y et al. Spine (Phila Pa 1976). 2005',
          year: 2005,
          pmid: '16205345',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score 0–8', actions: ['Palliative care', 'Radiation', 'Pain and symptom management'] },
      { condition: 'Score 9–11', actions: ['Tumor board review', 'Consider marginal excision or stabilization'] },
      { condition: 'Score 12–15', actions: ['Surgical evaluation for excision', 'Staging workup'] },
    ],
    pearls: [
      'Primary tumor type dominates the score — indolent primaries (thyroid, prostate, breast, carcinoid) score highest.',
      'Combine with SINS when the question is mechanical stability rather than survival.',
      'Modern systemic therapy may lengthen survival beyond what the 2005 derivation cohort predicted.',
    ],
  },

  // ─── 5. SINS ───────────────────────────────────────────────────────────────
  {
    id: 'sins',
    name: 'Spinal Instability Neoplastic Score (SINS)',
    shortName: 'SINS',
    description:
      'Assesses spinal instability in neoplastic disease across six domains — location, mechanical pain, bone lesion quality, alignment, vertebral collapse, and posterolateral involvement.',
    category: 'oncology',
    tags: ['sins', 'spinal instability', 'neoplasm', 'spine metastasis', 'spine surgery'],
    whenToUse:
      'Patients with known or suspected spinal tumors/metastases, to grade mechanical instability and decide whether surgical consultation is warranted.',
    whyUse:
      'SINS standardizes instability assessment across providers; scores ≥7 identify potentially unstable lesions that benefit from surgical consultation.',
    inputs: [
      selectInput('location', 'Tumor location in spine', [
        { label: 'Rigid (S2–S5)', value: 0, points: 0 },
        { label: 'Semirigid (T3–T10)', value: 1, points: 1 },
        { label: 'Mobile (C3–C6, L2–L4)', value: 2, points: 2 },
        { label: 'Junctional (occiput–C2, C7–T2, T11–L1, L5–S1)', value: 3, points: 3 },
      ], 1, 'Junctional segments carry the highest instability risk.'),
      selectInput('pain', 'Mechanical (load-related) pain', [
        { label: 'None', value: 0, points: 0 },
        { label: 'Pain present but not clearly mechanical / occasional', value: 1, points: 1 },
        { label: 'Mechanical pain (worse with load/activity, relieved by rest)', value: 3, points: 3 },
      ], 0, 'Pain that worsens with loading or activity and improves with rest suggests structural instability.'),
      selectInput('lesion', 'Bone lesion quality', [
        { label: 'Blastic (sclerotic)', value: 0, points: 0 },
        { label: 'Mixed blastic/lytic', value: 1, points: 1 },
        { label: 'Lytic', value: 2, points: 2 },
      ], 1, 'Lytic lesions weaken bone more than blastic lesions.'),
      selectInput('alignment', 'Spinal alignment', [
        { label: 'Normal', value: 0, points: 0 },
        { label: 'Deformity (kyphosis/scoliosis)', value: 2, points: 2 },
        { label: 'Subluxation or translation', value: 4, points: 4 },
      ], 0, 'Subluxation or translation indicates gross instability.'),
      selectInput('collapse', 'Vertebral body collapse', [
        { label: 'No collapse with <50% body involvement', value: 0, points: 0 },
        { label: '>50% body involvement without collapse', value: 1, points: 1 },
        { label: '<50% collapse', value: 2, points: 2 },
        { label: '>50% collapse', value: 3, points: 3 },
      ], 0, 'Degree of vertebral body height loss.'),
      selectInput('posterolateral', 'Posterolateral element involvement', [
        { label: 'None', value: 0, points: 0 },
        { label: 'Unilateral', value: 1, points: 1 },
        { label: 'Bilateral', value: 3, points: 3 },
      ], 0, 'Facet, pedicle, or costovertebral involvement.'),
    ],
    calculate(values) {
      const score =
        num(values.location) + num(values.pain) + num(values.lesion) + num(values.alignment) + num(values.collapse) + num(values.posterolateral);
      let label: string;
      let interpretation: string;
      let riskLevel: 'low' | 'moderate' | 'high';
      if (score <= 6) {
        label = 'Stable';
        interpretation = 'SINS 0–6: stable — surgical stabilization generally not required on instability grounds.';
        riskLevel = 'low';
      } else if (score <= 12) {
        label = 'Potentially unstable';
        interpretation = 'SINS 7–12: potentially unstable — surgical consultation is recommended.';
        riskLevel = 'moderate';
      } else {
        label = 'Unstable';
        interpretation = 'SINS 13–18: unstable — urgent surgical consultation recommended.';
        riskLevel = 'high';
      }
      return {
        score,
        label,
        interpretation,
        riskLevel,
        details: [{ label: 'Total SINS', value: `${score} / 18` }],
        recommendations:
          score <= 6
            ? ['Oncologic and radiation evaluation as indicated', 'Routine follow-up imaging']
            : ['Surgical consultation', 'Consider bracing and activity modification meanwhile', 'MRI/CT review with spine team'],
        alerts: score >= 13 ? ['SINS ≥13 — gross spinal instability; involve spine surgery promptly.'] : undefined,
      };
    },
    evidence: {
      summary:
        'SINS was developed by the Spine Oncology Study Group (Fisher et al., 2010) through systematic review and expert consensus to standardize the assessment of spinal instability in neoplastic disease.',
      formula: 'Sum of six domains (location 0–3, mechanical pain 0–3, lesion 0–2, alignment 0–4, collapse 0–3, posterolateral 0–3). 0–6 stable, 7–12 potentially unstable, 13–18 unstable.',
      validation:
        'Demonstrated good-to-excellent inter- and intra-observer reliability and sensitivity for surgical instability in validation studies; it measures mechanical instability, not survival — pair with a prognostic score such as revised Tokuhashi.',
      references: [
        {
          title: 'A novel classification system for spinal instability in neoplastic disease: an evidence-based approach and expert consensus from the Spine Oncology Study Group',
          citation: 'Fisher CG et al. Spine (Phila Pa 1976). 2010',
          year: 2010,
          pmid: '20562730',
        },
      ],
    },
    nextSteps: [
      { condition: 'SINS ≥7', actions: ['Surgical consultation', 'Assess mechanical pain', 'Advanced imaging review'] },
      { condition: 'SINS 13–18', actions: ['Urgent spine surgery referral', 'Protect spine / log-roll precautions as appropriate'] },
    ],
    pearls: [
      'Mechanical pain — pain that worsens with movement or axial load — is a key marker of instability.',
      'SINS addresses stability only; oncologic prognosis requires a separate tool.',
      'A patient can have a low SINS yet still need surgery for cord compression or intractable pain.',
    ],
  },

  // ─── 6. FAST Exam ──────────────────────────────────────────────────────────
  {
    id: 'fast-exam',
    name: 'Focused Assessment with Sonography for Trauma (FAST) Exam',
    shortName: 'FAST',
    description:
      'Four-view focused ultrasound survey (pericardial, perihepatic/RUQ, perisplenic/LUQ, pelvic) for free fluid in trauma patients.',
    category: 'emergency',
    tags: ['fast', 'efast', 'ultrasound', 'trauma', 'hemoperitoneum', 'pericardial effusion'],
    whenToUse:
      'During the primary survey of blunt or penetrating truncal trauma to rapidly detect pericardial or intraperitoneal free fluid, especially in hemodynamically unstable patients.',
    whyUse:
      'FAST is rapid, noninvasive, repeatable, and can triage unstable patients toward laparotomy or thoracotomy; in stable patients a positive study prompts further workup (usually CT).',
    inputs: [
      selectInput('pericardial', 'Pericardial (subxiphoid) view — free fluid', [
        { label: 'Absent', value: 'absent' },
        { label: 'Present', value: 'present' },
        { label: 'Equivocal / not obtained', value: 'equivocal' },
      ], 'absent', 'Fluid in the pericardial sac — a positive finding may indicate hemopericardium.'),
      selectInput('ruq', 'Right upper quadrant (Morison’s pouch) — free fluid', [
        { label: 'Absent', value: 'absent' },
        { label: 'Present', value: 'present' },
        { label: 'Equivocal / not obtained', value: 'equivocal' },
      ], 'absent', 'Hepatorenal recess — the most sensitive single view for intraperitoneal fluid.'),
      selectInput('luq', 'Left upper quadrant (splenorenal) — free fluid', [
        { label: 'Absent', value: 'absent' },
        { label: 'Present', value: 'present' },
        { label: 'Equivocal / not obtained', value: 'equivocal' },
      ], 'absent', 'Splenorenal recess and subphrenic space.'),
      selectInput('pelvis', 'Suprapubic / pelvic view — free fluid', [
        { label: 'Absent', value: 'absent' },
        { label: 'Present', value: 'present' },
        { label: 'Equivocal / not obtained', value: 'equivocal' },
      ], 'absent', 'Pouch of Douglas / retrovesical space — best assessed with a full bladder or transverse/ sagittal sweeps.'),
    ],
    calculate(values) {
      const views = [values.pericardial, values.ruq, values.luq, values.pelvis].map((v) => str(v, 'absent'));
      const positive = views.includes('present');
      const equivocal = !positive && views.includes('equivocal');
      const label = positive ? 'Positive FAST' : equivocal ? 'Equivocal FAST' : 'Negative FAST';
      const interpretation = positive
        ? 'Free fluid identified in at least one view. In an unstable patient this supports emergent operative/interventional control of hemorrhage; in a stable patient proceed to CT for characterization.'
        : equivocal
          ? 'No definite free fluid, but at least one view was equivocal or unobtainable. Repeat the exam, obtain alternative imaging, and interpret in clinical context.'
          : 'No free fluid seen in any view. A negative FAST does NOT exclude significant injury — retroperitoneal hemorrhage, bowel, diaphragm, and contained solid-organ injuries can be missed.';
      return {
        score: label,
        label,
        interpretation,
        riskLevel: positive ? 'high' : equivocal ? 'moderate' : 'normal',
        details: [
          { label: 'Pericardial', value: str(values.pericardial) },
          { label: 'RUQ (Morison’s)', value: str(values.ruq) },
          { label: 'LUQ (splenorenal)', value: str(values.luq) },
          { label: 'Pelvis', value: str(values.pelvis) },
        ],
        recommendations: positive
          ? ['Correlate with hemodynamics', 'Unstable + positive → OR/intervention', 'Stable + positive → CT abdomen/pelvis']
          : equivocal
            ? ['Repeat FAST after resuscitation', 'Consider CT or DPL-equivalent evaluation', 'Serial abdominal exams']
            : ['Continue standard trauma workup', 'Serial exams/repeat FAST if suspicion persists', 'CT if mechanism or exam warrants'],
        alerts: positive ? ['Positive FAST — assess hemodynamics immediately; do not delay hemorrhage control in unstable patients.'] : undefined,
      };
    },
    evidence: {
      summary:
        'FAST, formalized by Rozycki and colleagues in the 1990s, rapidly surveys four dependent regions for free fluid and became a standard adjunct to the ATLS primary survey.',
      formula: 'Four views: pericardial, perihepatic (RUQ), perisplenic (LUQ), pelvic. Any view with free fluid = positive exam.',
      validation:
        'Rozycki et al. (1998, 1,540 patients) showed surgeon-performed FAST is highly accurate for hemoperitoneum and pericardial fluid. Later studies (e.g., PROMMTT in hypotensive patients) found sensitivity for therapeutic laparotomy as low as ~62%, so a negative FAST must not rule out injury in high-suspicion cases.',
      references: [
        {
          title: 'Surgeon-performed ultrasound for the assessment of truncal injuries: lessons learned from 1540 patients',
          citation: 'Rozycki GS et al. Ann Surg. 1998',
          year: 1998,
          pmid: '9790345',
          doi: '10.1097/00000658-199810000-00012',
        },
      ],
    },
    nextSteps: [
      { condition: 'Positive + unstable', actions: ['Emergent laparotomy/intervention', 'Activate massive transfusion as needed'] },
      { condition: 'Positive + stable', actions: ['CT abdomen/pelvis', 'Trauma team consultation'] },
      { condition: 'Negative/equivocal + suspicion', actions: ['Repeat FAST', 'CT imaging', 'Serial exams'] },
    ],
    pearls: [
      'The RUQ (Morison’s pouch) view is the single most sensitive view for intraperitoneal free fluid.',
      'FAST detects free fluid, not organ injury — it does not see the retroperitoneum well.',
      'eFAST adds thoracic views for pneumothorax and hemothorax.',
    ],
  },

  // ─── 7. Fleischner 2017 ────────────────────────────────────────────────────
  {
    id: 'fleischner-2017',
    name: 'Fleischner Society Guidelines for Incidental Pulmonary Nodules (2017)',
    shortName: 'Fleischner 2017',
    description:
      '2017 Fleischner Society follow-up recommendations for incidental pulmonary nodules on CT, by nodule type, size, number, and malignancy risk.',
    category: 'pulmonary',
    tags: ['fleischner', 'pulmonary nodule', 'lung nodule', 'incidental', 'ct follow-up', 'ground glass'],
    whenToUse:
      'Adults ≥35 years with incidentally detected pulmonary nodules on CT — not for lung cancer screening, immunocompromised patients, or known cancer staging.',
    whyUse:
      'Standardizes nodule follow-up intervals, reducing over- and under-imaging of incidental findings.',
    inputs: [
      selectInput('noduleType', 'Nodule type', [
        { label: 'Solid', value: 'solid' },
        { label: 'Subsolid (ground-glass or part-solid)', value: 'subsolid' },
      ], 'solid', 'Subsolid nodules follow a separate, longer surveillance schedule.'),
      selectInput('number', 'Nodule number', [
        { label: 'Single', value: 'single' },
        { label: 'Multiple', value: 'multiple' },
      ], 'single', 'For multiple solid nodules, guidance is based on the most suspicious nodule.'),
      numberInput('sizeMm', 'Nodule size (long-axis diameter)', { unit: 'mm', min: 1, max: 50, step: 0.5, exampleValue: 7, helpText: 'Average of long- and short-axis diameters is preferred per Fleischner; enter the largest dimension if only one is reported.' }),
      selectInput('risk', 'Clinical risk for lung cancer', [
        { label: 'Low risk', value: 'low' },
        { label: 'High risk', value: 'high' },
      ], 'low', 'Applies to solid nodules: high risk = smoking history and other risk factors; for subsolid nodules the same schedule is used regardless of risk.'),
      selectInput('subsolidType', 'Subsolid subtype (only if subsolid)', [
        { label: 'Pure ground-glass', value: 'ggn' },
        { label: 'Part-solid', value: 'partsolid' },
      ], 'ggn', 'Used only when nodule type is subsolid.', false),
      numberInput('solidComponentMm', 'Solid component size (only if part-solid)', { unit: 'mm', min: 0, max: 50, step: 0.5, exampleValue: 4, helpText: 'For part-solid nodules ≥6 mm, the solid component size determines whether annual CT or more aggressive workup applies.', required: false }),
    ],
    calculate(values) {
      const type = str(values.noduleType, 'solid');
      const number = str(values.number, 'single');
      const size = num(values.sizeMm, 6);
      const highRisk = str(values.risk, 'low') === 'high';
      let label: string;
      let rec: string;
      if (type === 'solid') {
        if (size < 6) {
          label = 'No routine follow-up';
          rec = number === 'single'
            ? highRisk
              ? 'Single solid <6 mm, high risk: optional CT at 12 months.'
              : 'Single solid <6 mm, low risk: no routine follow-up.'
            : highRisk
              ? 'Multiple solid <6 mm, high risk: optional CT at 12 months.'
              : 'Multiple solid <6 mm, low risk: no routine follow-up.';
        } else if (size <= 8) {
          if (number === 'single') {
            label = 'CT at 6–12 months';
            rec = highRisk
              ? 'Single solid 6–8 mm, high risk: CT at 6–12 months, then CT at 18–24 months.'
              : 'Single solid 6–8 mm, low risk: CT at 6–12 months, then consider CT at 18–24 months.';
          } else {
            label = 'CT at 3–6 months';
            rec = highRisk
              ? 'Multiple solid 6–8 mm, high risk: CT at 3–6 months, then at 18–24 months.'
              : 'Multiple solid 6–8 mm, low risk: CT at 3–6 months, then consider CT at 18–24 months.';
          }
        } else {
          label = number === 'single' ? 'CT at 3 months / PET/CT / tissue' : 'CT at 3–6 months';
          rec = number === 'single'
            ? 'Single solid >8 mm: consider CT at 3 months, PET/CT, or tissue sampling (same for low and high risk).'
            : 'Multiple solid >8 mm: CT at 3–6 months, then consider CT at 18–24 months.';
        }
      } else {
        const sub = str(values.subsolidType, 'ggn');
        if (number === 'multiple') {
          if (size < 6) {
            label = 'CT at 3–6 months';
            rec = 'Multiple subsolid <6 mm: CT at 3–6 months; if stable, consider CT at 2 and 4 years (atypical adenomatous hyperplasia/adenocarcinoma in situ consideration).';
          } else {
            label = 'CT at 3–6 months';
            rec = 'Multiple subsolid ≥6 mm: CT at 3–6 months; subsequent management is based on the most suspicious nodule.';
          }
        } else if (sub === 'ggn') {
          if (size < 6) {
            label = 'No routine follow-up';
            rec = 'Single pure ground-glass <6 mm: no routine follow-up.';
          } else {
            label = 'CT at 6–12 months, then q2y ×5 y';
            rec = 'Single pure ground-glass ≥6 mm: CT at 6–12 months to confirm persistence, then CT every 2 years until 5 years.';
          }
        } else {
          if (size < 6) {
            label = 'No routine follow-up';
            rec = 'Single part-solid <6 mm: no routine follow-up.';
          } else {
            const solidComp = num(values.solidComponentMm, -1);
            label = 'CT at 3–6 months';
            rec =
              solidComp >= 6
                ? 'Single part-solid ≥6 mm: CT at 3–6 months to confirm persistence; a solid component ≥6 mm is suspicious — consider PET/CT or biopsy.'
                : 'Single part-solid ≥6 mm: CT at 3–6 months to confirm persistence; if unchanged with solid component <6 mm, annual CT for 5 years.';
          }
        }
      }
      const aggressive = type === 'solid' && size > 8;
      return {
        score: label,
        label,
        interpretation: rec,
        riskLevel: aggressive ? 'high' : label === 'No routine follow-up' ? 'normal' : 'moderate',
        details: [
          { label: 'Type', value: type === 'solid' ? 'Solid' : 'Subsolid' },
          { label: 'Number', value: number === 'single' ? 'Single' : 'Multiple' },
          { label: 'Size', value: `${size} mm` },
          { label: 'Risk', value: highRisk ? 'High' : 'Low' },
        ],
        recommendations: [rec, 'Use thin-section (≤1.5 mm) CT for follow-up measurements.'],
      };
    },
    evidence: {
      summary:
        'The 2017 Fleischner Society guidelines (MacMahon et al.) provide evidence-informed CT surveillance schedules for incidental pulmonary nodules, stratified by solid versus subsolid morphology, size, number, and clinical risk.',
      formula:
        'Solid: single/multiple × size (<6, 6–8, >8 mm) × risk. Subsolid: single GGN, single part-solid, or multiple × size (<6, ≥6 mm). Schedules as implemented in the result text.',
      validation:
        'Guideline consensus based on observational data; applies to incidental findings in patients ≥35 years — not lung cancer screening (use Lung-RADS there), immunocompromised patients, or known malignancy. Follow-up imaging should use thin-section CT.',
      references: [
        {
          title: 'Guidelines for management of incidental pulmonary nodules detected on CT images: from the Fleischner Society 2017',
          citation: 'MacMahon H et al. Radiology. 2017',
          year: 2017,
          pmid: '28240562',
        },
      ],
    },
    nextSteps: [
      { condition: 'Recommendation issued', actions: ['Schedule thin-section chest CT at the stated interval', 'Compare with prior imaging if available'] },
      { condition: 'Solid >8 mm or part-solid with solid component ≥6 mm', actions: ['PET/CT or tissue sampling', 'Pulmonary/thoracic referral'] },
    ],
    pearls: [
      'Measure nodules as the mean of long- and short-axis diameters on the same image.',
      'Subsolid nodules need longer surveillance (up to 5 years) because adenocarcinoma spectrum lesions grow slowly.',
      'Do not apply Fleischner to lung-cancer screening CTs — use Lung-RADS.',
    ],
  },

  // ─── 8. Mayo SPN Malignancy Risk ───────────────────────────────────────────
  {
    id: 'mayo-spn',
    name: 'Solitary Pulmonary Nodule Malignancy Risk (Mayo Clinic Model)',
    shortName: 'Mayo SPN',
    description:
      'Mayo Clinic logistic model estimating the probability of malignancy in a solitary pulmonary nodule from age, smoking, extrathoracic cancer history, diameter, spiculation, and upper-lobe location.',
    category: 'pulmonary',
    tags: ['mayo', 'spn', 'solitary pulmonary nodule', 'malignancy', 'lung cancer', 'risk model'],
    whenToUse:
      'Patients with a solitary pulmonary nodule (typically 4–30 mm) when estimating pretest probability of malignancy to guide surveillance versus biopsy/PET decisions.',
    whyUse:
      'Quantifies malignancy probability, complementing gestalt and guideline-based surveillance; validated across multiple cohorts.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 18, max: 110, exampleValue: 62, helpText: 'Patient age in years.' }),
      yesNo('smoking', 'Current or former smoker', null, 'Ever-smoked status per the Swensen model.', false),
      yesNo('cancer', 'History of extrathoracic malignancy >5 years ago', null, 'Remote (>5 years) extrathoracic cancer history.', false),
      numberInput('diameter', 'Nodule diameter', { unit: 'mm', min: 1, max: 50, step: 0.5, exampleValue: 12, helpText: 'Nodule diameter in millimeters.' }),
      yesNo('spiculation', 'Spiculated margin', null, 'Spiculation on CT substantially raises malignancy probability.', false),
      yesNo('upperLobe', 'Upper lobe location', null, 'Upper-lobe nodules carry higher malignancy risk.', false),
    ],
    calculate(values) {
      const x =
        -6.8272 +
        0.0391 * num(values.age, 60) +
        0.7917 * (bool(values.smoking) ? 1 : 0) +
        1.3388 * (bool(values.cancer) ? 1 : 0) +
        0.1274 * num(values.diameter, 10) +
        1.0407 * (bool(values.spiculation) ? 1 : 0) +
        0.7838 * (bool(values.upperLobe) ? 1 : 0);
      const p = 1 / (1 + Math.exp(-x));
      const pct = round(p * 100, 1);
      let riskLevel: 'low' | 'moderate' | 'high';
      let label: string;
      if (pct < 5) {
        riskLevel = 'low';
        label = 'Low malignancy risk';
      } else if (pct < 65) {
        riskLevel = 'moderate';
        label = 'Intermediate malignancy risk';
      } else {
        riskLevel = 'high';
        label = 'High malignancy risk';
      }
      return {
        score: pct,
        unit: '%',
        label,
        interpretation: `Estimated ${pct}% probability of malignancy (Mayo Clinic model). ${
          pct < 5
            ? 'CT surveillance per Fleischner is usually appropriate.'
            : pct < 65
              ? 'Intermediate probability — PET/CT, short-interval CT, or biopsy often appropriate depending on size and growth.'
              : 'High probability — tissue diagnosis or definitive management typically warranted.'
        }`,
        riskLevel,
        details: [
          { label: 'Logit (x)', value: `${round(x, 3)}` },
          { label: 'Malignancy probability', value: `${pct}%` },
        ],
        recommendations:
          pct < 5
            ? ['Fleischner-consistent CT surveillance', 'Reassess if nodule grows']
            : pct < 65
              ? ['Consider FDG-PET', 'Short-interval CT or biopsy per size/growth', 'Pulmonary consultation']
              : ['Pulmonary/thoracic referral', 'Tissue diagnosis or staging workup'],
      };
    },
    evidence: {
      summary:
        'Swensen et al. (Mayo Clinic, 1997) developed a logistic model for SPN malignancy probability using three clinical (age, smoking, prior extrathoracic cancer) and three radiologic (diameter, spiculation, upper-lobe location) predictors.',
      formula:
        'x = −6.8272 + 0.0391·age + 0.7917·smoking + 1.3388·extrathoracic CA + 0.1274·diameter(mm) + 1.0407·spiculation + 0.7838·upper lobe; P = 1/(1+e^−x).',
      validation:
        'Validated in multiple cohorts. Herder et al. (2005) extended the model by adding FDG-PET avidity; FDG-PET findings should be incorporated via the Herder model when available — this calculator implements the base Mayo model only.',
      references: [
        {
          title: 'The probability of malignancy in solitary pulmonary nodules. Application to small radiologically indeterminate nodules',
          citation: 'Swensen SJ et al. Arch Intern Med. 1997',
          year: 1997,
          pmid: '9129544',
        },
        {
          title: 'Clinical prediction model to characterize pulmonary nodules: validation and added value of 18F-fluorodeoxyglucose positron emission tomography',
          citation: 'Herder GJ et al. Chest. 2005',
          year: 2005,
          pmid: '16236914',
          doi: '10.1378/chest.128.4.2490',
        },
      ],
    },
    nextSteps: [
      { condition: 'Low (<5%)', actions: ['CT surveillance per Fleischner'] },
      { condition: 'Intermediate (5–65%)', actions: ['FDG-PET', 'Consider biopsy if PET-avid or growing', 'Pulmonary referral'] },
      { condition: 'High (>65%)', actions: ['Tissue diagnosis', 'Staging', 'Thoracic oncology referral'] },
    ],
    pearls: [
      'The 5%/65% banding mirrors the ACCP-style low/intermediate/high stratification; local thresholds vary.',
      'Spiculation and upper-lobe location are the strongest radiologic predictors.',
      'For PET results, use the Herder extension rather than multiplying risks informally.',
    ],
  },

  // ─── 9. TASH ───────────────────────────────────────────────────────────────
  {
    id: 'tash',
    name: 'TASH Score (Trauma-Associated Severe Hemorrhage)',
    shortName: 'TASH',
    description:
      'Predicts the probability of massive transfusion (≥10 units pRBC) after multiple trauma from physiologic, laboratory, and injury variables.',
    category: 'emergency',
    tags: ['tash', 'massive transfusion', 'hemorrhage', 'trauma', 'transfusion', 'mtp'],
    whenToUse:
      'Early in the ED evaluation of severely injured patients to anticipate massive transfusion need and guide blood-bank activation.',
    whyUse:
      'Early prediction of massive transfusion allows proactive massive transfusion protocol activation, hemorrhage control planning, and coagulopathy management.',
    inputs: [
      selectInput('sex', 'Sex', [
        { label: 'Female', value: 'F', points: 0 },
        { label: 'Male', value: 'M', points: 1 },
      ], 'M', 'Male sex adds 1 point.'),
      numberInput('hgb', 'Hemoglobin', { unit: 'g/dL', min: 2, max: 20, step: 0.1, exampleValue: 9.5, helpText: '<7=8, <9=6, <10=4, <11=3, <12=2 points.' }),
      numberInput('be', 'Base excess', { unit: 'mmol/L', min: -30, max: 10, step: 0.1, exampleValue: -4, helpText: '<−10=4, <−6=3, <−2=1 point; more negative = higher score.' }),
      numberInput('sbp', 'Systolic blood pressure', { unit: 'mmHg', min: 40, max: 250, exampleValue: 105, helpText: '<100=4, <120=1 point.' }),
      numberInput('hr', 'Heart rate', { unit: 'bpm', min: 30, max: 220, exampleValue: 110, helpText: '>120 adds 2 points.' }),
      yesNo('fast', 'Positive FAST (intra-abdominal fluid)', 3, 'Positive focused abdominal sonography adds 3 points.', false),
      yesNo('pelvis', 'Clinically unstable pelvic fracture', 6, 'Unstable pelvic ring injury adds 6 points.', false),
      yesNo('femur', 'Open or dislocated femur fracture', 3, 'Open/dislocated femoral shaft fracture adds 3 points.', false),
    ],
    calculate(values) {
      const hgb = num(values.hgb, 12);
      const be = num(values.be, 0);
      const sbp = num(values.sbp, 130);
      const hr = num(values.hr, 90);
      const hgbPts = hgb < 7 ? 8 : hgb < 9 ? 6 : hgb < 10 ? 4 : hgb < 11 ? 3 : hgb < 12 ? 2 : 0;
      const bePts = be < -10 ? 4 : be < -6 ? 3 : be < -2 ? 1 : 0;
      const sbpPts = sbp < 100 ? 4 : sbp < 120 ? 1 : 0;
      const score =
        (str(values.sex, 'F') === 'M' ? 1 : 0) +
        hgbPts +
        bePts +
        sbpPts +
        (hr > 120 ? 2 : 0) +
        (bool(values.fast) ? 3 : 0) +
        (bool(values.pelvis) ? 6 : 0) +
        (bool(values.femur) ? 3 : 0);
      const prob = tashProbability(score);
      const high = score >= 16;
      return {
        score,
        label: high ? 'High massive transfusion risk' : score >= 9 ? 'Elevated massive transfusion risk' : 'Low massive transfusion risk',
        interpretation: `TASH ${score} → estimated massive transfusion probability ≈${prob}%${score <= 8 ? ' or less' : score >= 25 ? ' or greater' : ''}. ${
          high ? 'Scores ≥16 are conventionally considered high risk (>50% range in the derivation function).' : ''
        }`,
        riskLevel: high ? 'high' : score >= 9 ? 'moderate' : 'low',
        details: [
          { label: 'TASH score', value: `${score} / 31` },
          { label: 'Estimated MT probability', value: `~${prob}%` },
          { label: 'Hemoglobin points', value: `${hgbPts}` },
          { label: 'Base excess points', value: `${bePts}` },
          { label: 'SBP points', value: `${sbpPts}` },
        ],
        recommendations: high
          ? ['Activate massive transfusion protocol', 'Hemorrhage control (OR/IR/pelvic stabilization)', 'TXA within 3 h if indicated', 'Correct coagulopathy and hypothermia']
          : ['Continue hemorrhage assessment', 'Repeat labs', 'Type & cross / blood bank readiness'],
        alerts: high ? ['TASH ≥16 — anticipate massive transfusion; activate MTP per protocol.'] : undefined,
      };
    },
    evidence: {
      summary:
        'Yücel et al. (2006) derived TASH from ~17,200 Trauma Registry DGU patients; seven weighted variables predict massive transfusion (≥10 units pRBC).',
      formula:
        'Sex (male +1); Hgb (<7→8, <9→6, <10→4, <11→3, <12→2); BE (<−10→4, <−6→3, <−2→1); SBP (<100→4, <120→1); HR>120→2; FAST+→3; unstable pelvis→6; open/dislocated femur→3. Score 0–31.',
      validation:
        'Revalidated on the 2004–2007 TR-DGU cohort (Maegele et al., AUC up to ~0.90) with a modified probability function. Scores ≥16 are conventionally treated as high risk; the tabulated probabilities reflect derivation-cohort observed frequencies and may overstate risk in modern hemostatic-resuscitation eras.',
      references: [
        {
          title: 'Trauma Associated Severe Hemorrhage (TASH)-Score: probability of mass transfusion as surrogate for life threatening hemorrhage after multiple trauma',
          citation: 'Yücel N et al. J Trauma. 2006',
          year: 2006,
          pmid: '16766965',
          doi: '10.1097/01.ta.0000220386.84012.bf',
        },
        {
          title: 'Revalidation and update of the TASH-Score: a scoring system to predict the probability for massive transfusion as a surrogate for life-threatening haemorrhage after severe injury',
          citation: 'Maegele M et al. Vox Sang. 2011',
          year: 2011,
          pmid: '20735809',
          doi: '10.1111/j.1423-0410.2010.01387.x',
        },
      ],
    },
    nextSteps: [
      { condition: 'TASH ≥16', actions: ['Activate MTP', 'Urgent hemorrhage control', 'TXA, warm patient, correct coagulopathy'] },
      { condition: 'TASH 9–15', actions: ['Prepare blood products', 'Repeat assessment and labs'] },
      { condition: 'TASH ≤8', actions: ['Standard trauma workup', 'Monitor for evolving hemorrhage'] },
    ],
    pearls: [
      'Base excess and hemoglobin are often the first objective markers of occult shock.',
      'TASH performs best as a rule-in tool — a low score does not exclude significant bleeding.',
      'Point-of-care values (gas-analyzer hemoglobin, base excess) enable calculation within minutes of arrival.',
    ],
  },

  // ─── 10. RAPID ─────────────────────────────────────────────────────────────
  {
    id: 'rapid-score',
    name: 'RAPID Score for Acetabular Chondrolabral Disruption',
    shortName: 'RAPID',
    description:
      'Rapidly Assessed Predictor of Intraoperative Damage — in-clinic predictor of high-grade acetabular chondrolabral damage before hip arthroscopy.',
    category: 'orthopedics',
    tags: ['rapid', 'hip arthroscopy', 'fai', 'tonnis', 'cam', 'chondrolabral', 'hip'],
    whenToUse:
      'Patients being evaluated for hip arthroscopy for femoroacetabular impingement, to estimate the likelihood of high-grade acetabular chondrolabral damage.',
    whyUse:
      'Preoperative risk stratification for intra-articular damage helps counsel patients and set expectations about repair versus debridement and outcomes.',
    inputs: [
      selectInput('sex', 'Sex', [
        { label: 'Female', value: 'F', points: 0 },
        { label: 'Male', value: 'M', points: 1 },
      ], 'M', 'Male sex adds 1 point.'),
      selectInput('tonnis', 'Tönnis grade of osteoarthritis', [
        { label: 'Tönnis 0', value: 0, points: 0 },
        { label: 'Tönnis 1', value: 2, points: 2 },
        { label: 'Tönnis 2', value: 3, points: 3 },
      ], 0, 'Tönnis grade 3 is an absolute contraindication to hip arthroscopy and is not scored.'),
      yesNo('cam', 'Cam morphology (alpha angle >55°)', 1, 'Cam-type FAI adds 1 point.', false),
    ],
    calculate(values) {
      const score = (str(values.sex, 'F') === 'M' ? 1 : 0) + num(values.tonnis) + (bool(values.cam) ? 1 : 0);
      let label: string;
      let interpretation: string;
      let riskLevel: 'low' | 'moderate' | 'high';
      if (score <= 1) {
        label = 'Lower risk of high-grade damage';
        interpretation = 'RAPID 0–1: lower predicted risk of high-grade acetabular chondrolabral damage (~10–20% in the derivation cohort).';
        riskLevel = 'low';
      } else if (score <= 3) {
        label = 'Intermediate risk of high-grade damage';
        interpretation = 'RAPID 2–3: intermediate predicted risk of high-grade acetabular chondrolabral damage.';
        riskLevel = 'moderate';
      } else {
        label = 'High risk of high-grade damage';
        interpretation = 'RAPID 4–5: high predicted risk — approaching ~88% at score 5 in the derivation cohort.';
        riskLevel = 'high';
      }
      return {
        score,
        label,
        interpretation,
        riskLevel,
        details: [{ label: 'RAPID score', value: `${score} / 5` }],
        recommendations:
          score >= 4
            ? ['Counsel about likely significant intra-articular damage', 'Discuss repair feasibility and prognosis', 'Consider cartilage-preserving strategies']
            : ['Proceed with standard arthroscopy planning', 'Counsel on expected findings'],
      };
    },
    evidence: {
      summary:
        'Hevesi et al. developed the RAPID score (sex, Tönnis grade, cam morphology) as a quick in-clinic predictor of intraoperative high-grade acetabular chondrolabral damage in FAI patients.',
      formula: 'Male sex +1; Tönnis 1 +2, Tönnis 2 +3 (Tönnis 3 contraindicates arthroscopy); cam morphology (alpha >55°) +1. Total 0–5.',
      validation:
        'Derivation cohort AUC ≈0.76; predicted risk of high-grade damage ranged from ~10.5% at score 0 to ~88% at score 5. External validation remains limited.',
      references: [
        {
          title: 'The Rapidly Assessed Predictor of Intraoperative Damage (RAPID) Score: an in-clinic predictor of acetabular chondrolabral disruption',
          citation: 'Hevesi M et al. Orthop J Sports Med. 2018',
          year: 2018,
          pmid: '30302348',
          doi: '10.1177/2325967118799068',
        },
      ],
    },
    nextSteps: [
      { condition: 'RAPID 4–5', actions: ['Expect high-grade chondrolabral damage', 'Counsel on repair vs debridement and prognosis'] },
      { condition: 'RAPID 0–3', actions: ['Standard arthroscopy planning'] },
    ],
    pearls: [
      'Tönnis 3 is an absolute contraindication to hip arthroscopy — it is deliberately not an option in the score.',
      'A positive cam morphology is defined by alpha angle >55° on imaging.',
      'RAPID estimates damage severity, not postoperative outcome directly.',
    ],
  },

  // ─── 11. RIP Score ─────────────────────────────────────────────────────────
  {
    id: 'rip-score',
    name: 'Recurrent Instability of the Patella (RIP) Score',
    shortName: 'RIP',
    description:
      'Predicts 10-year recurrent patellar instability risk after first-time patellar dislocation using age, skeletal maturity, trochlear dysplasia, and TT-TG/PL ratio.',
    category: 'orthopedics',
    tags: ['rip', 'patella', 'instability', 'dislocation', 'tt-tg', 'trochlear dysplasia', 'mpfl'],
    whenToUse:
      'Patients presenting with first-time lateral patellar dislocation, to estimate long-term recurrent instability risk and inform operative versus nonoperative discussion.',
    whyUse:
      'Stratifies recurrence risk to support shared decision-making about early MPFL reconstruction versus conservative management.',
    inputs: [
      yesNo('age25', 'Age <25 years at first dislocation', 2, 'Younger age carries the highest recurrence weight (+2).', false),
      yesNo('skeletal', 'Skeletal immaturity (open distal femoral and proximal tibial physes)', 1, 'Open physes add 1 point.', false),
      yesNo('dysplasia', 'Dejour grade A–D trochlear dysplasia', 1, 'Any grade of trochlear dysplasia adds 1 point.', false),
      yesNo('tttgpl', 'TT-TG/PL ratio ≥0.5', 1, 'Tibial tubercle–trochlear groove distance divided by patellar length ≥0.5 adds 1 point.', false),
    ],
    calculate(values) {
      const score = (bool(values.age25) ? 2 : 0) + (bool(values.skeletal) ? 1 : 0) + (bool(values.dysplasia) ? 1 : 0) + (bool(values.tttgpl) ? 1 : 0);
      let label: string;
      let interpretation: string;
      let riskLevel: 'low' | 'moderate' | 'high';
      if (score <= 1) {
        label = 'Low recurrence risk';
        interpretation = 'RIP 0–1: 0% reported 10-year recurrent instability in the derivation cohort.';
        riskLevel = 'low';
      } else if (score <= 3) {
        label = 'Intermediate recurrence risk';
        interpretation = 'RIP 2–3: ~30.6% reported 10-year recurrent instability.';
        riskLevel = 'moderate';
      } else {
        label = 'High recurrence risk';
        interpretation = 'RIP 4–5: ~79.2% reported 10-year recurrent instability.';
        riskLevel = 'high';
      }
      return {
        score,
        label,
        interpretation,
        riskLevel,
        details: [{ label: 'RIP score', value: `${score} / 5` }],
        recommendations:
          score >= 4
            ? ['Discuss early surgical stabilization (e.g., MPFL reconstruction)', 'Sports-medicine/orthopedic referral']
            : score >= 2
              ? ['Orthopedic follow-up', 'Quadriceps/VMO rehabilitation', 'Shared decision-making on operative vs nonoperative care']
              : ['Nonoperative management', 'Physical therapy', 'Return-to-activity guidance'],
      };
    },
    evidence: {
      summary:
        'Hevesi et al. (2019) derived the RIP score from a long-term cohort of first-time patellar dislocations; four weighted factors predict 10-year recurrent instability.',
      formula: 'Age <25 y (+2) + skeletal immaturity (+1) + Dejour A–D trochlear dysplasia (+1) + TT-TG/PL ≥0.5 (+1) = 0–5.',
      validation:
        'Derivation cohort 10-year recurrence: 0% (score 0–1), 30.6% (2–3), 79.2% (4–5). Single-center derivation; external validation is limited and the score aids — not dictates — surgical decisions.',
      references: [
        {
          title: 'The Recurrent Instability of the Patella Score: a statistically based model for prediction of long-term recurrence risk after first-time patellar dislocation',
          citation: 'Hevesi M et al. Arthroscopy. 2019',
          year: 2019,
          pmid: '30612768',
          doi: '10.1016/j.arthro.2018.09.017',
        },
      ],
    },
    nextSteps: [
      { condition: 'RIP 4–5', actions: ['Orthopedic referral', 'Discuss MPFL reconstruction'] },
      { condition: 'RIP 2–3', actions: ['Physical therapy', 'Activity modification', 'Reassess instability'] },
      { condition: 'RIP 0–1', actions: ['Conservative management'] },
    ],
    pearls: [
      'TT-TG/PL ≥0.5 approximates pathologic lateralization without requiring CT-based TT-TG thresholds.',
      'Skeletally immature patients have high recurrence risk largely independent of other factors.',
      'Use to counsel — not to mandate — early stabilization.',
    ],
  },

  // ─── 12. STUMBL / Battle Score ─────────────────────────────────────────────
  {
    id: 'stumbl',
    name: 'STUMBL / Battle Score for Blunt Chest Wall Trauma',
    shortName: 'STUMBL',
    description:
      'Battle score estimating the risk of complications after blunt chest wall trauma from age, rib fracture count, chronic lung disease, anticoagulation, and oxygen saturation.',
    category: 'emergency',
    tags: ['stumbl', 'battle score', 'rib fractures', 'chest wall trauma', 'blunt trauma'],
    whenToUse:
      'Adults with blunt chest wall trauma and rib fractures, to estimate the probability of a complicated hospital course and guide level-of-care decisions.',
    whyUse:
      'Higher scores identify patients who benefit from closer monitoring, aggressive analgesia, and respiratory support to prevent pneumonia, respiratory failure, and ICU admission.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 16, max: 110, exampleValue: 70, helpText: 'Scores 1 point per decade of age (age ÷ 10, rounded down).' }),
      numberInput('ribFx', 'Number of rib fractures', { unit: 'fractures', min: 0, max: 24, exampleValue: 3, helpText: '3 points per rib fracture.' }),
      yesNo('cld', 'Pre-injury chronic lung disease', 5, 'Adds 5 points.', false),
      yesNo('anticoag', 'Pre-injury anticoagulant use', 4, 'Adds 4 points.', false),
      selectInput('spo2', 'Oxygen saturation on room air', [
        { label: '≥95%', value: 0, points: 0 },
        { label: '90–94%', value: 2, points: 2 },
        { label: '85–89%', value: 4, points: 4 },
        { label: '80–84%', value: 6, points: 6 },
      ], 0, 'Use the lowest reliable room-air saturation.'),
    ],
    calculate(values) {
      const age = num(values.age, 40);
      const score =
        Math.floor(age / 10) +
        Math.round(num(values.ribFx, 0)) * 3 +
        (bool(values.cld) ? 5 : 0) +
        (bool(values.anticoag) ? 4 : 0) +
        num(values.spo2);
      let label: string;
      let interp: string;
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical';
      if (score <= 10) {
        label = 'Low complication risk';
        interp = '~13% ± 6% risk of complications.';
        riskLevel = 'low';
      } else if (score <= 15) {
        label = 'Elevated complication risk';
        interp = '~29% ± 8% risk of complications.';
        riskLevel = 'moderate';
      } else if (score <= 20) {
        label = 'High complication risk';
        interp = '~52% ± 8% risk of complications.';
        riskLevel = 'high';
      } else if (score <= 25) {
        label = 'Very high complication risk';
        interp = '~70% ± 6% risk of complications.';
        riskLevel = 'high';
      } else if (score <= 30) {
        label = 'Very high complication risk';
        interp = '~80% ± 6% risk of complications.';
        riskLevel = 'critical';
      } else {
        label = 'Extreme complication risk';
        interp = '~88% ± 7% risk of complications.';
        riskLevel = 'critical';
      }
      return {
        score,
        label,
        interpretation: `STUMBL ${score}: ${interp} Complications include pneumonia, respiratory failure, and ICU admission.`,
        riskLevel,
        details: [
          { label: 'Age points', value: `${Math.floor(age / 10)}` },
          { label: 'Fracture points', value: `${Math.round(num(values.ribFx, 0)) * 3}` },
        ],
        recommendations:
          score > 15
            ? ['Admit for close monitoring', 'Early regional/neuraxial analgesia', 'Aggressive pulmonary hygiene', 'Low threshold for ICU']
            : score > 10
              ? ['Consider step-up monitoring', 'Multimodal analgesia', 'Incentive spirometry']
              : ['Standard ward care appropriate', 'Analgesia and pulmonary toilet'],
      };
    },
    evidence: {
      summary:
        'Battle et al. (2014) developed and externally validated this prognostic model for complications after blunt chest wall trauma in the UK STUMBL cohorts.',
      formula:
        'floor(age/10) + 3×(rib fractures) + 5×(chronic lung disease) + 4×(anticoagulants) + SpO₂ points (≥95→0, 90–94→2, 85–89→4, 80–84→6).',
      validation:
        'Derivation and external validation showed good discrimination for complicated courses; subsequent scores (e.g., RIBS) reported better performance in higher-acuity inpatient cohorts.',
      references: [
        {
          title: 'Predicting outcomes after blunt chest wall trauma: development and external validation of a new prognostic model',
          citation: 'Battle CE et al. Crit Care. 2014',
          year: 2014,
          pmid: '24887537',
          doi: '10.1186/cc13873',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score >15', actions: ['Close monitoring', 'Regional analgesia', 'Respiratory therapy', 'Consider ICU'] },
      { condition: 'Score ≤15', actions: ['Ward admission', 'Analgesia', 'Pulmonary hygiene'] },
    ],
    pearls: [
      'Age is the dominant modifiable-looking risk — each decade adds a point.',
      'Score guides monitoring intensity, not admission per se.',
      'Trajectories matter: worsening oxygenation or spirometry volumes should override a reassuring score.',
    ],
  },

  // ─── 13. RIBS ──────────────────────────────────────────────────────────────
  {
    id: 'ribs',
    name: 'Revised Intensity Battle Score (RIBS)',
    shortName: 'RIBS',
    description:
      'Predicts poor outcomes (complications, unplanned ICU/intubation, prolonged ventilation, pneumonia, mortality) in adult trauma patients with rib fractures.',
    category: 'emergency',
    tags: ['ribs', 'rib fractures', 'battle score', 'chest trauma', 'icu triage', 'trauma'],
    whenToUse:
      'Adults ≥18 years admitted with at least one traumatic rib fracture, to estimate the likelihood of a complicated inpatient course.',
    whyUse:
      'Outperformed the original STUMBL/Battle score in the derivation cohort (AUROC 0.858 vs 0.649); a cutoff of 12 was suggested for ICU triage.',
    inputs: [
      numberInput('ribs', 'Ribs fractured (count by rib level)', { unit: 'ribs', min: 1, max: 24, exampleValue: 4, helpText: 'Count each fractured rib once by level — 6 fractures across 3 ribs = 3, not 6.' }),
      yesNo('contusion', 'Pulmonary contusions', null, 'Coefficient 1.525.', false),
      yesNo('copd', 'COPD', null, 'Coefficient 2.83.', false),
      yesNo('chestTube', 'Chest tube placed, present, or anticipated', null, 'Coefficient 4.08.', false),
      yesNo('gcs15', 'GCS <15', null, 'Coefficient 8.137 — the dominant term.', false),
    ],
    calculate(values) {
      const raw =
        2.275 * num(values.ribs, 1) +
        1.525 * (bool(values.contusion) ? 1 : 0) +
        2.83 * (bool(values.copd) ? 1 : 0) +
        4.08 * (bool(values.chestTube) ? 1 : 0) +
        8.137 * (bool(values.gcs15) ? 1 : 0);
      const score = Math.round(raw);
      const p = (a: number, b: number) => {
        const logit = a * score + b;
        return round((Math.exp(logit) / (1 + Math.exp(logit))) * 100, 1);
      };
      const anyComp = p(0.1879, -2.8823);
      const icu = p(0.0717, -3.1618);
      const vent = p(0.2056, -4.3737);
      const pna = p(0.1549, -3.7889);
      const mort = p(0.1745, -3.9039);
      const high = score >= 12;
      return {
        score,
        label: high ? 'High risk — ICU triage threshold met' : score >= 6 ? 'Moderate risk' : 'Lower risk',
        interpretation: `RIBS ${score}. Estimated risks: any complication ~${anyComp}%, unplanned ICU/intubation ~${icu}%, >7 days ventilation or tracheostomy ~${vent}%, pneumonia/VAP ~${pna}%, mortality ~${mort}%.`,
        riskLevel: high ? 'high' : score >= 6 ? 'moderate' : 'low',
        details: [
          { label: 'Any complication', value: `~${anyComp}%` },
          { label: 'Unplanned ICU/intubation', value: `~${icu}%` },
          { label: '>7 days ventilated / tracheostomy', value: `~${vent}%` },
          { label: 'Pneumonia / VAP', value: `~${pna}%` },
          { label: 'Mortality', value: `~${mort}%` },
        ],
        recommendations: high
          ? ['ICU/step-down triage per Buchholz cutoff (≥12)', 'Early regional/neuraxial analgesia', 'Aggressive pulmonary care and mobilization', 'Low threshold for escalation/surgical consultation']
          : ['Standard analgesia and pulmonary hygiene', 'Medical/surgical ward admission may be appropriate'],
        alerts: high ? ['RIBS ≥12 — suggested cutoff for ICU-level triage.'] : undefined,
      };
    },
    evidence: {
      summary:
        'Buchholz et al. (2023) revised the Battle score using logistic-regression coefficients over rib fracture count, pulmonary contusion, COPD, chest tube, and GCS <15.',
      formula:
        'RIBS = round(2.275×ribs + 1.525×contusion + 2.83×COPD + 4.08×chest tube + 8.137×[GCS<15]). Outcome risk = e^logit/(1+e^logit) with logit = a×RIBS + b (a,b per outcome).',
      validation:
        'Single-center retrospective derivation with a subsequent external validation study; prospective impact data are limited. Notably, age was not predictive in the development cohort — unlike the original Battle score.',
      references: [
        {
          title: 'Revised Intensity Battle Score (RIBS): development of a clinical score for predicting poor outcomes after rib fractures',
          citation: 'Buchholz CJ et al. Am Surg. 2023',
          year: 2023,
          pmid: '36120831',
          doi: '10.1177/00031348221123087',
        },
        {
          title: 'External validation of novel Revised Intensity Battle Score and comparison of static rib fracture scores',
          citation: 'J Trauma Acute Care Surg. 2024',
          year: 2024,
          pmid: '37966462',
        },
      ],
    },
    nextSteps: [
      { condition: 'RIBS ≥12', actions: ['ICU/step-down triage', 'Regional analgesia', 'Aggressive pulmonary care'] },
      { condition: 'RIBS <12', actions: ['Ward-level care may be appropriate', 'Standard analgesia and pulmonary hygiene'] },
    ],
    pearls: [
      'Count ribs by level, not total fractures — six fractures across three ribs scores 3 ribs.',
      'GCS <15 dominates the score; sedation and intoxication can confound it — interpret in context.',
      'Not dynamic — clinical deterioration overrides a low initial score.',
    ],
  },

  // ─── 14. RibScore ──────────────────────────────────────────────────────────
  {
    id: 'ribscore',
    name: 'RibScore',
    shortName: 'RibScore',
    description:
      'CT-based radiographic score for rib fracture burden predicting pneumonia, respiratory failure, and tracheostomy after blunt chest trauma.',
    category: 'emergency',
    tags: ['ribscore', 'rib fractures', 'ct', 'pneumonia', 'respiratory failure', 'tracheostomy', 'trauma'],
    whenToUse:
      'Blunt trauma patients with rib fractures visible on chest CT, to grade radiographic fracture burden and anticipate pulmonary complications.',
    whyUse:
      'Each RibScore component was associated with pneumonia, respiratory failure, and tracheostomy; higher scores correlate linearly with pulmonary morbidity.',
    inputs: [
      yesNo('sixPlus', '≥6 rib fractures', 1, 'Six or more total rib fractures.', false),
      yesNo('bilateral', 'Bilateral rib fractures', 1, 'Fractures present on both sides.', false),
      yesNo('flail', 'Flail chest', 1, '≥3 consecutive ribs fractured in ≥2 places.', false),
      yesNo('displaced', '≥3 severely (bicortically) displaced fractures', 1, 'Three or more bicortically displaced fractures.', false),
      yesNo('firstRib', 'First rib fracture', 1, 'Fracture of the first rib.', false),
      yesNo('allAreas', 'Fractures in all three anatomic areas (anterior, lateral, posterior)', 1, 'At least one fracture in each of the anterior, lateral, and posterior zones.', false),
    ],
    calculate(values) {
      const keys = ['sixPlus', 'bilateral', 'flail', 'displaced', 'firstRib', 'allAreas'];
      const score = keys.reduce((s, k) => s + (bool(values[k]) ? 1 : 0), 0);
      const riskLevel = score >= 4 ? 'high' : score >= 2 ? 'moderate' : 'low';
      return {
        score,
        label: score >= 4 ? 'High rib fracture burden' : score >= 2 ? 'Moderate rib fracture burden' : 'Low rib fracture burden',
        interpretation: `RibScore ${score} of 6. The score is linearly associated with pneumonia, respiratory failure, and tracheostomy — higher burden warrants closer respiratory surveillance.`,
        riskLevel,
        details: [{ label: 'RibScore', value: `${score} / 6` }],
        recommendations:
          score >= 4
            ? ['Close respiratory monitoring', 'Early multimodal/regional analgesia', 'Pulmonary hygiene', 'Low threshold for ICU and surgical stabilization discussion']
            : score >= 2
              ? ['Analgesia and pulmonary toilet', 'Monitor for evolving respiratory compromise']
              : ['Standard care with analgesia and pulmonary hygiene'],
      };
    },
    evidence: {
      summary:
        'Chapman et al. (2016) developed the RibScore from six CT-derived anatomic variables, each worth 1 point, in 385 blunt trauma patients.',
      formula:
        '1 point each for: ≥6 rib fractures, bilateral fractures, flail chest, ≥3 severely (bicortically) displaced fractures, first rib fracture, and fractures in all three anatomic areas. Range 0–6.',
      validation:
        'Each component was univariately associated with pneumonia, respiratory failure, and tracheostomy, and the score was linearly associated with pulmonary outcomes in the derivation sample; multicenter prospective validation is limited.',
      references: [
        {
          title: 'RibScore: a novel radiographic score based on fracture pattern that predicts pneumonia, respiratory failure, and tracheostomy',
          citation: 'Chapman BC et al. J Trauma Acute Care Surg. 2016',
          year: 2016,
          pmid: '26683395',
          doi: '10.1097/TA.0000000000000867',
        },
      ],
    },
    nextSteps: [
      { condition: 'RibScore ≥4', actions: ['Intensified respiratory monitoring', 'Regional analgesia', 'Consider surgical stabilization consult'] },
      { condition: 'RibScore <4', actions: ['Standard analgesia', 'Pulmonary hygiene', 'Observation'] },
    ],
    pearls: [
      'Requires CT chest — it is a radiographic score, not a clinical exam score.',
      'A first-rib fracture is a marker of high-energy transfer, not just an extra fracture.',
      'Purely anatomic — combine with physiologic assessment (e.g., RIBS, STUMBL) for disposition.',
    ],
  },

  // ─── 15. SETscore ──────────────────────────────────────────────────────────
  {
    id: 'setscore',
    name: 'SETscore (Stroke-Related Early Tracheostomy Score)',
    shortName: 'SETscore',
    description:
      'Predicts the need for tracheostomy in ventilated neurocritical care patients with severe stroke.',
    category: 'critical-care',
    tags: ['setscore', 'tracheostomy', 'stroke', 'nicu', 'ventilation', 'neurocritical care'],
    whenToUse:
      'Within the first 24 hours in mechanically ventilated patients with severe cerebrovascular disease (ischemic stroke, ICH, SAH) on a neuro ICU.',
    whyUse:
      'Early identification of likely tracheostomy need may support timely primary tracheostomy and avoid failed extubation attempts.',
    inputs: [
      yesNo('dysphagia', 'Dysphagia', 4, 'Neurologic function item.', false),
      yesNo('aspiration', 'Observed aspiration', 3, 'Neurologic function item.', false),
      yesNo('gcs10', 'GCS on admission <10', 3, 'Neurologic function item.', false),
      yesNo('brainstem', 'Brainstem lesion', 4, 'Neurological lesion item.', false),
      yesNo('cerebellar', 'Space-occupying cerebellar lesion', 3, 'Neurological lesion item.', false),
      yesNo('mca', 'Ischemic infarct >2/3 of MCA territory', 4, 'Neurological lesion item.', false),
      yesNo('ich', 'ICH volume >25 mL', 4, 'Neurological lesion item.', false),
      yesNo('diffuse', 'Diffuse lesion', 3, 'Neurological lesion item.', false),
      yesNo('hydrocephalus', 'Hydrocephalus', 4, 'Neurological lesion item.', false),
      yesNo('neurosurg', '(Neuro)surgical intervention', 2, 'General organ function/procedure item.', false),
      yesNo('respDisease', 'Additional respiratory disease', 3, 'General organ function/procedure item.', false),
      yesNo('pf150', 'PaO₂/FiO₂ <150', 2, 'General organ function/procedure item.', false),
      yesNo('apache', 'Acute physiology score (APACHE II) >20', 4, 'General organ function/procedure item.', false),
      yesNo('lis', 'Lung injury score >1', 2, 'General organ function/procedure item.', false),
      yesNo('sepsis', 'Sepsis', 3, 'General organ function/procedure item.', false),
    ],
    calculate(values) {
      const map: [string, number][] = [
        ['dysphagia', 4], ['aspiration', 3], ['gcs10', 3], ['brainstem', 4], ['cerebellar', 3],
        ['mca', 4], ['ich', 4], ['diffuse', 3], ['hydrocephalus', 4], ['neurosurg', 2],
        ['respDisease', 3], ['pf150', 2], ['apache', 4], ['lis', 2], ['sepsis', 3],
      ];
      const score = map.reduce((s, [k, pts]) => s + (bool(values[k]) ? pts : 0), 0);
      const high = score >= 8;
      return {
        score,
        label: high ? 'Likely tracheostomy need' : 'Lower tracheostomy likelihood',
        interpretation: high
          ? `SETscore ${score} ≥8: predicts prolonged NICU stay, prolonged ventilation, and tracheostomy need (sensitivity ~64%, specificity ~86% in derivation).`
          : `SETscore ${score} <8: lower predicted likelihood of tracheostomy.`,
        riskLevel: high ? 'high' : 'low',
        details: [{ label: 'SETscore', value: `${score}` }],
        recommendations: high
          ? ['Discuss early/primary tracheostomy with neurocritical care team', 'Avoid premature extubation attempts']
          : ['Standard weaning and extubation assessment', 'Reassess as neurologic status evolves'],
      };
    },
    evidence: {
      summary:
        'Schönenberger et al. (2016) prospectively evaluated the SETscore in 75 ventilated stroke patients; a cutoff of 8 best predicted prolonged NICU stay, ventilation time, and tracheostomy need.',
      formula: 'Sum of 15 weighted items across neurological function, neurological lesion, and general organ function/procedure domains.',
      validation:
        'Monocentric prospective derivation; an external validation (Alsherbini et al., 2019) found a SETscore >10 had 81% sensitivity and 57% specificity for tracheostomy need (AUC 0.74), improved by adding BMI, race, ICH, and sputum culture.',
      references: [
        {
          title: 'The SETscore to predict tracheostomy need in cerebrovascular neurocritical care patients',
          citation: 'Schönenberger S et al. Neurocrit Care. 2016',
          year: 2016,
          pmid: '26842719',
          doi: '10.1007/s12028-015-0235-5',
        },
        {
          title: 'Predictors for tracheostomy with external validation of the stroke-related early tracheostomy score (SETscore)',
          citation: 'Alsherbini K et al. Neurocrit Care. 2019',
          year: 2019,
          pmid: '30167898',
          doi: '10.1007/s12028-018-0596-7',
        },
      ],
    },
    nextSteps: [
      { condition: 'SETscore ≥8', actions: ['Consider early tracheostomy planning', 'Multidisciplinary discussion'] },
      { condition: 'SETscore <8', actions: ['Standard ventilator weaning', 'Serial neurologic assessment'] },
    ],
    pearls: [
      'Apply within the first 24 h of NICU admission in ventilated stroke patients.',
      'External validation suggested a higher cutoff (>10) for better rule-in performance.',
      'The score supports — but does not replace — clinical judgment on airway timing.',
    ],
  },

  // ─── 16. FACE-DROPS ────────────────────────────────────────────────────────
  {
    id: 'face-drops',
    name: 'FACE DROPS (Lyme vs Bell Palsy Risk Assessment)',
    shortName: 'FACE DROPS',
    description:
      'Clinical risk tool differentiating acute Lyme disease–associated facial palsy from Bell palsy using seven historical and examination features.',
    category: 'neurology',
    tags: ['face drops', 'lyme', 'bell palsy', 'facial palsy', 'cranial nerve', 'doxycycline'],
    whenToUse:
      'Patients presenting with acute facial nerve palsy — particularly in Lyme-endemic regions — when deciding whether to start empiric Lyme antibiotics pending serology.',
    whyUse:
      'Lyme-associated facial palsy needs antibiotics while Bell palsy is treated with corticosteroids; early differentiation can guide therapy while confirmatory testing is pending.',
    inputs: [
      yesNo('fever', 'Fever', 8, 'F — +8 points.', false),
      yesNo('aches', 'Aches (arthralgia/myalgia)', 6, 'A — +6 points.', false),
      yesNo('cephalalgia', 'Cephalalgia (headache)', 3, 'C — +3 points.', false),
      yesNo('exhaustion', 'Exhaustion (unusual fatigue)', 4, 'E — +4 points.', false),
      yesNo('dermatomal', 'Dermatomal or radicular signs (myelitis or radiculitis)', 4, 'D — +4 points per the published tool.', false),
      yesNo('otalgia', 'Otalgia or postauricular pain', -1, 'R/O — −1 point (favors Bell palsy).', false),
      yesNo('stiffNeck', 'Stiff neck (nuchal rigidity)', 3, 'S — +3 points.', false),
    ],
    calculate(values) {
      const score =
        (bool(values.fever) ? 8 : 0) +
        (bool(values.aches) ? 6 : 0) +
        (bool(values.cephalalgia) ? 3 : 0) +
        (bool(values.exhaustion) ? 4 : 0) +
        (bool(values.dermatomal) ? 4 : 0) +
        (bool(values.otalgia) ? -1 : 0) +
        (bool(values.stiffNeck) ? 3 : 0);
      let label: string;
      let interpretation: string;
      let riskLevel: 'low' | 'moderate' | 'high';
      if (score <= 4) {
        label = 'Predicts Bell palsy';
        interpretation = `FACE DROPS ${score} ≤4 predicts Bell palsy with ≥93.5% accuracy in the derivation cohort.`;
        riskLevel = 'low';
      } else if (score >= 7) {
        label = 'Predicts Lyme-associated facial palsy';
        interpretation = `FACE DROPS ${score} ≥7 predicts Lyme disease–associated facial palsy with ≥96.0% accuracy in the derivation cohort.`;
        riskLevel = 'high';
      } else {
        label = 'Indeterminate';
        interpretation = `FACE DROPS ${score} (5–6) is indeterminate — test for Lyme and individualize empiric therapy.`;
        riskLevel = 'moderate';
      }
      return {
        score,
        label,
        interpretation,
        riskLevel,
        details: [{ label: 'FACE DROPS score', value: `${score}` }],
        recommendations:
          score >= 7
            ? ['Send Lyme serology', 'Consider empiric doxycycline pending results per local guidance', 'Evaluate for other Lyme manifestations (meningitis, radiculitis, carditis)']
            : score <= 4
              ? ['Standard Bell palsy management (early corticosteroids, eye protection)', 'Lyme testing if epidemiologically plausible']
              : ['Lyme serology', 'Shared decision-making on empiric antibiotics vs steroids', 'Close follow-up'],
      };
    },
    evidence: {
      summary:
        'McEntire et al. (2025) derived and internally validated FACE DROPS from 285 patients (76 Lyme-associated facial palsy, 209 Bell palsy) at a specialized facial nerve center.',
      formula:
        'Fever +8, aches +6, cephalalgia +3, exhaustion +4, dermatomal/radicular +4, otalgia/postauricular pain −1, stiff neck +3. ≤4 → Bell palsy; ≥7 → Lyme facial palsy; 5–6 indeterminate.',
      validation:
        'Internally validated only; the published dermatomal/radicular item carries +4 points, which is used here. External validation and endemicity-specific performance are pending.',
      references: [
        {
          title: 'FACE DROPS: a clinical risk assessment tool for differentiation of acute Lyme disease–associated facial palsy from Bell palsy',
          citation: 'McEntire CRS et al. Neurol Clin Pract. 2025',
          year: 2025,
          pmid: '40290705',
          doi: '10.1212/CPJ.0000000000200476',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score ≥7', actions: ['Lyme serology', 'Empiric doxycycline per local guidance', 'Screen for other Lyme manifestations'] },
      { condition: 'Score ≤4', actions: ['Corticosteroids for Bell palsy', 'Eye protection', 'Test if endemic exposure plausible'] },
      { condition: 'Score 5–6', actions: ['Lyme serology', 'Individualize empiric therapy'] },
    ],
    pearls: [
      'Bilateral facial palsy, systemic symptoms, or radicular pain should push strongly toward Lyme evaluation regardless of score.',
      'Otalgia/postauricular pain is the only negative predictor — it favors Bell palsy.',
      'Erythema migrans, if present, is diagnostic and supersedes the score.',
    ],
  },

  // ─── 17. Nottingham Hip Fracture Score ─────────────────────────────────────
  {
    id: 'nhfs',
    name: 'Nottingham Hip Fracture Score (NHFS)',
    shortName: 'NHFS',
    description:
      'Predicts 30-day mortality after hip fracture surgery using the 2012 recalibrated equation over seven preoperative variables.',
    category: 'orthopedics',
    tags: ['nhfs', 'hip fracture', 'mortality', 'perioperative', 'geriatric', 'orthopedic'],
    whenToUse:
      'On admission for older adults with acute hip fracture being considered for operative repair, to estimate 30-day mortality risk.',
    whyUse:
      'Provides an objective mortality estimate for shared decision-making, timing of surgery, and perioperative level-of-care planning.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 40, max: 110, exampleValue: 82, helpText: '<66=0, 66–85=3, ≥86=4 points.' }),
      selectInput('sex', 'Sex', [
        { label: 'Female', value: 'F', points: 0 },
        { label: 'Male', value: 'M', points: 1 },
      ], 'F', 'Male sex adds 1 point.'),
      yesNo('hgbLow', 'Admission hemoglobin ≤10 g/dL', 1, 'Anemia at admission adds 1 point.', false),
      yesNo('mmts', 'Mini-Mental Test Score ≤6 (of 10)', 1, 'MMTS is equivalent to the Abbreviated Mental Test (AMT-10); ≤6 adds 1 point.', false),
      yesNo('institution', 'Lives in an institution (e.g., nursing home)', 1, 'Institutional residence is a frailty proxy — adds 1 point.', false),
      yesNo('comorbid', '≥2 comorbidities', 1, 'Cardiovascular, cerebrovascular, respiratory, or renal comorbidities; ≥2 adds 1 point.', false),
      yesNo('malignancy', 'Active malignancy', 1, 'Adds 1 point.', false),
    ],
    calculate(values) {
      const age = num(values.age, 75);
      const score =
        (age < 66 ? 0 : age <= 85 ? 3 : 4) +
        (str(values.sex, 'F') === 'M' ? 1 : 0) +
        (bool(values.hgbLow) ? 1 : 0) +
        (bool(values.mmts) ? 1 : 0) +
        (bool(values.institution) ? 1 : 0) +
        (bool(values.comorbid) ? 1 : 0) +
        (bool(values.malignancy) ? 1 : 0);
      const mortality = round(100 / (1 + Math.exp(5.012 - 0.481 * score)), 1);
      const riskLevel = mortality >= 20 ? 'high' : mortality >= 10 ? 'moderate' : 'low';
      return {
        score,
        label: `Predicted 30-day mortality ~${mortality}%`,
        interpretation: `NHFS ${score} → predicted 30-day mortality ≈${mortality}% using the 2012 recalibrated equation.`,
        riskLevel,
        details: [
          { label: 'NHFS score', value: `${score} / 10` },
          { label: 'Predicted 30-day mortality', value: `~${mortality}%` },
        ],
        recommendations:
          score >= 7
            ? ['Discuss goals of care with patient/family', 'Optimize comorbidities before surgery where feasible', 'Consider orthogeriatric co-management', 'Higher perioperative monitoring level']
            : ['Standard hip fracture pathway', 'Early surgery per local guidance', 'Orthogeriatric review'],
      };
    },
    evidence: {
      summary:
        'Maxwell et al. (2008) developed the NHFS in 2,492 UK hip fracture patients; Moppett et al. (2012) recalibrated the mortality equation after finding the original overestimated risk in higher groups.',
      formula:
        'NHFS = age (<66→0, 66–85→3, ≥86→4) + male(1) + Hgb≤10(1) + MMTS≤6(1) + institution(1) + ≥2 comorbidities(1) + malignancy(1). 30-day mortality% = 100/(1+e^(5.012−0.481×NHFS)).',
      validation:
        'Original AUROC ~0.72; the 2012 equation improved calibration across three UK centers. Validated for 1-year mortality as well (Wiles et al.). Does not itself determine operability.',
      references: [
        {
          title: 'Development and validation of a preoperative scoring system to predict 30 day mortality in patients undergoing hip fracture surgery',
          citation: 'Maxwell MJ et al. Br J Anaesth. 2008',
          year: 2008,
          pmid: '18723517',
          doi: '10.1093/bja/aen236',
        },
        {
          title: 'Nottingham Hip Fracture Score: longitudinal and multi-centre assessment',
          citation: 'Moppett IK et al. Br J Anaesth. 2012',
          year: 2012,
          pmid: '22728204',
        },
        {
          title: 'Nottingham Hip Fracture Score as a predictor of one year mortality in patients undergoing surgical repair of fractured neck of femur',
          citation: 'Wiles MD et al. Br J Anaesth. 2011',
          year: 2011,
          pmid: '21278153',
          doi: '10.1093/bja/aeq405',
        },
      ],
    },
    nextSteps: [
      { condition: 'High predicted mortality', actions: ['Goals-of-care discussion', 'Orthogeriatric co-management', 'Perioperative optimization'] },
      { condition: 'Any score', actions: ['Early surgery per pathway', 'Analgesia and VTE prophylaxis', 'Early mobilization'] },
    ],
    pearls: [
      'Uses the 2012 recalibrated equation — the widely validated version cited in anaesthesia guidelines.',
      'A risk estimate, not an operability test — combine with clinical assessment and patient goals.',
      'Institutional residence captures frailty not otherwise coded in the score.',
    ],
  },

  // ─── 18. mSOFA ─────────────────────────────────────────────────────────────
  {
    id: 'msofa',
    name: 'Modified Sequential Organ Failure Assessment (mSOFA)',
    shortName: 'mSOFA',
    description:
      'Grissom-modified SOFA predicting ICU mortality using SpO₂/FiO₂, clinical jaundice, hypotension/vasopressors, GCS, and creatinine — fewer labs than full SOFA.',
    category: 'critical-care',
    tags: ['msofa', 'sofa', 'organ failure', 'icu', 'mortality', 'sepsis', 'triage'],
    whenToUse:
      'Critically ill or ED patients when a quick organ-dysfunction severity estimate is needed without full laboratory panels (originally designed for mass-critical-care triage).',
    whyUse:
      'Approximates SOFA mortality prediction while relying mostly on bedside/clinical data — useful when lab turnaround or resource constraints limit full SOFA.',
    inputs: [
      numberInput('spo2fio2', 'SpO₂/FiO₂ ratio', { min: 40, max: 500, step: 1, exampleValue: 350, helpText: '>400=0, >315–400=1, >235–315=2, >150–235=3, ≤150=4. Estimate FiO₂ from delivery device if needed.' }),
      yesNo('jaundice', 'Scleral icterus or jaundice present', 3, 'Replaces bilirubin in the modified score (+3 if present).', false),
      selectInput('cvs', 'Cardiovascular (MAP or vasopressor dose, mcg/kg/min)', [
        { label: 'No hypotension', value: 0, points: 0 },
        { label: 'MAP <70 mmHg', value: 1, points: 1 },
        { label: 'Dopamine ≤5 or dobutamine (any dose)', value: 2, points: 2 },
        { label: 'Dopamine >5, epinephrine ≤0.1, or norepinephrine ≤0.1', value: 3, points: 3 },
        { label: 'Dopamine >15, epinephrine >0.1, or norepinephrine >0.1', value: 4, points: 4 },
      ], 0, 'Use the highest applicable category.'),
      numberInput('gcs', 'Glasgow Coma Scale (best in 24 h)', { min: 3, max: 15, exampleValue: 14, helpText: '15=0, 13–14=1, 10–12=2, 6–9=3, <6=4 points.' }),
      numberInput('creatinine', 'Creatinine', { unit: 'mg/dL', min: 0.2, max: 15, step: 0.1, exampleValue: 1.0, helpText: '<1.2=0, 1.2–1.9=1, 2.0–3.4=2, 3.5–4.9=3, ≥5.0=4 points.' }),
    ],
    calculate(values) {
      const sf = num(values.spo2fio2, 450);
      const respPts = sf > 400 ? 0 : sf > 315 ? 1 : sf > 235 ? 2 : sf > 150 ? 3 : 4;
      const gcs = num(values.gcs, 15);
      const gcsPts = gcs === 15 ? 0 : gcs >= 13 ? 1 : gcs >= 10 ? 2 : gcs >= 6 ? 3 : 4;
      const cr = num(values.creatinine, 1);
      const crPts = cr < 1.2 ? 0 : cr < 2.0 ? 1 : cr < 3.5 ? 2 : cr < 5.0 ? 3 : 4;
      const score = respPts + (bool(values.jaundice) ? 3 : 0) + num(values.cvs) + gcsPts + crPts;
      const riskLevel = score >= 10 ? 'high' : score >= 5 ? 'moderate' : 'low';
      return {
        score,
        label: score >= 10 ? 'High organ dysfunction burden' : score >= 5 ? 'Moderate organ dysfunction' : 'Low organ dysfunction',
        interpretation: `mSOFA ${score} of 19. Higher scores correlate with increasing ICU mortality; the score was designed to approximate full SOFA with mostly clinical data.`,
        riskLevel,
        details: [
          { label: 'Respiratory (SpO₂/FiO₂)', value: `${respPts}` },
          { label: 'Liver (jaundice)', value: bool(values.jaundice) ? '3' : '0' },
          { label: 'Cardiovascular', value: `${num(values.cvs)}` },
          { label: 'CNS (GCS)', value: `${gcsPts}` },
          { label: 'Renal (creatinine)', value: `${crPts}` },
        ],
        recommendations:
          score >= 10
            ? ['Escalated level of care', 'Reassess resuscitation status', 'Goals-of-care discussion as appropriate']
            : ['Continue standard management', 'Serial reassessment'],
      };
    },
    evidence: {
      summary:
        'Grissom et al. (2010) modified SOFA for critical-care triage by substituting SpO₂/FiO₂ for PaO₂/FiO₂ and clinical jaundice for bilirubin, keeping cardiovascular, CNS, and renal domains.',
      formula:
        'Respiratory SpO₂/FiO₂ (0–4) + jaundice (0/3) + hypotension/vasopressors (0–4) + GCS (0–4) + creatinine (0–4) = 0–19.',
      validation:
        'Derived during the 2009 H1N1 era for triage when labs are constrained; externally validated but far less studied than SOFA — use full SOFA when laboratory data are available.',
      references: [
        {
          title: 'A modified sequential organ failure assessment score for critical care triage',
          citation: 'Grissom CK et al. Disaster Med Public Health Prep. 2010',
          year: 2010,
          pmid: '21149228',
        },
      ],
    },
    nextSteps: [
      { condition: 'mSOFA ≥10', actions: ['ICU-level care', 'Reassess resuscitation', 'Consider goals of care'] },
      { condition: 'mSOFA <10', actions: ['Continue current management', 'Serial reassessment'] },
    ],
    pearls: [
      'Estimate FiO₂ from oxygen delivery: ~4% above room air per L/min of nasal cannula; ~70–90% for non-rebreather.',
      'Jaundice substitutes for bilirubin — an intentionally coarse replacement for austere settings.',
      'Prefer the full SOFA score when complete labs are available.',
    ],
  },

  // ─── 19. BPS ───────────────────────────────────────────────────────────────
  {
    id: 'bps',
    name: 'Behavioral Pain Scale (BPS) for Intubated Patients',
    shortName: 'BPS',
    description:
      'Quantifies pain in intubated, nonverbal critically ill patients across facial expression, upper-limb movement, and ventilator compliance (3–12).',
    category: 'critical-care',
    tags: ['bps', 'pain', 'intubated', 'icu', 'behavioral pain', 'analgesia'],
    isQuestionnaire: true,
    whenToUse:
      'Sedated or nonverbal intubated ICU patients when self-report of pain is impossible — at rest and during potentially painful procedures.',
    whyUse:
      'Provides an objective, reproducible pain estimate to titrate analgesia; scores >5 are generally considered unacceptable pain requiring intervention.',
    inputs: [
      selectInput('face', 'Facial expression', [
        { label: 'Relaxed', value: 1, points: 1 },
        { label: 'Partially tightened (e.g., brow lowering)', value: 2, points: 2 },
        { label: 'Fully tightened (e.g., eyelid closing)', value: 3, points: 3 },
        { label: 'Grimacing', value: 4, points: 4 },
      ], 1, 'Observe the face at rest and during stimulation.'),
      selectInput('limbs', 'Upper limb movements', [
        { label: 'No movement', value: 1, points: 1 },
        { label: 'Partially bent', value: 2, points: 2 },
        { label: 'Fully bent with finger flexion', value: 3, points: 3 },
        { label: 'Permanently retracted', value: 4, points: 4 },
      ], 1, 'Observe upper extremity posture and movement.'),
      selectInput('ventilator', 'Compliance with mechanical ventilation', [
        { label: 'Tolerating movement', value: 1, points: 1 },
        { label: 'Coughing but tolerating ventilation most of the time', value: 2, points: 2 },
        { label: 'Fighting ventilator', value: 3, points: 3 },
        { label: 'Unable to control ventilation', value: 4, points: 4 },
      ], 1, 'Ventilator synchrony and tolerance.'),
    ],
    calculate(values) {
      const score = num(values.face, 1) + num(values.limbs, 1) + num(values.ventilator, 1);
      let label: string;
      let interpretation: string;
      let riskLevel: 'normal' | 'low' | 'moderate' | 'high';
      if (score <= 3) {
        label = 'No significant pain';
        interpretation = 'BPS 3 (minimum) — no significant pain behaviors.';
        riskLevel = 'normal';
      } else if (score <= 5) {
        label = 'Mild / acceptable pain';
        interpretation = 'BPS 4–5 — mild pain behaviors; continue current analgesia and reassess.';
        riskLevel = 'low';
      } else if (score <= 8) {
        label = 'Unacceptable pain';
        interpretation = 'BPS >5 suggests unacceptable pain — consider additional or alternative analgesia/sedation.';
        riskLevel = 'moderate';
      } else {
        label = 'Severe pain behaviors';
        interpretation = 'BPS 9–12 — strong pain behaviors; reassess analgesic regimen urgently and exclude agitation/delirium mimics.';
        riskLevel = 'high';
      }
      return {
        score,
        label,
        interpretation,
        riskLevel,
        details: [{ label: 'BPS total', value: `${score} / 12` }],
        recommendations:
          score > 5
            ? ['Reassess analgesia and sedation', 'Treat pain before deepening sedation', 'Serial reassessment after intervention']
            : ['Continue current regimen', 'Reassess regularly and around procedures'],
      };
    },
    evidence: {
      summary:
        'Payen et al. (2001) developed the BPS for sedated critically ill patients; it scores facial expression, upper-limb movement, and ventilator compliance from 1–4 each.',
      formula: 'Facial expression (1–4) + upper limbs (1–4) + ventilator compliance (1–4) = 3–12; >5 suggests unacceptable pain.',
      validation:
        'Validated against behavioral responses to painful procedures in sedated ICU patients; subsequent studies support good inter-rater reliability. It cannot distinguish pain from agitation or withdrawal — interpret in context.',
      references: [
        {
          title: 'Assessing pain in critically ill sedated patients by using a behavioral pain scale',
          citation: 'Payen JF et al. Crit Care Med. 2001',
          year: 2001,
          pmid: '11801819',
        },
      ],
    },
    nextSteps: [
      { condition: 'BPS >5', actions: ['Titrate analgesia', 'Reassess sedation adequacy', 'Re-score after intervention'] },
      { condition: 'BPS ≤5', actions: ['Continue analgesia', 'Scheduled reassessment'] },
    ],
    pearls: [
      'Score during rest and during procedures — a rise with stimulation strengthens the pain interpretation.',
      'Neuromuscular blockade invalidates the motor domains.',
      'BPS cannot separate pain from agitation, delirium, or withdrawal — screen for confounders.',
    ],
  },

  // ─── 20. CPOT ──────────────────────────────────────────────────────────────
  {
    id: 'cpot',
    name: 'Critical Care Pain Observation Tool (CPOT)',
    shortName: 'CPOT',
    description:
      'Rates pain in critically ill patients who cannot self-report using facial expression, body movements, muscle tension, and ventilator compliance or vocalization (0–8).',
    category: 'critical-care',
    tags: ['cpot', 'pain', 'icu', 'critical care', 'nonverbal', 'analgesia'],
    isQuestionnaire: true,
    whenToUse:
      'Critically ill adults unable to communicate pain verbally — both intubated and extubated patients.',
    whyUse:
      'CPOT has strong inter-rater reliability and validity for detecting pain behaviors; scores >2 indicate unacceptable pain warranting analgesic reassessment.',
    inputs: [
      yesNo('intubated', 'Patient is intubated', null, 'Determines whether the fourth domain is ventilator compliance (intubated) or vocalization (extubated).', true),
      selectInput('face', 'Facial expression', [
        { label: 'Relaxed, neutral', value: 0, points: 0 },
        { label: 'Tense', value: 1, points: 1 },
        { label: 'Grimacing', value: 2, points: 2 },
      ], 0, 'Observe brow, eyes, nasolabial folds.'),
      selectInput('body', 'Body movements', [
        { label: 'Absence of movements / normal position', value: 0, points: 0 },
        { label: 'Protection (slow cautious movements, guarding)', value: 1, points: 1 },
        { label: 'Restlessness / agitation', value: 2, points: 2 },
      ], 0, 'Spontaneous and stimulation-provoked movement.'),
      selectInput('muscle', 'Muscle tension', [
        { label: 'Relaxed', value: 0, points: 0 },
        { label: 'Tense, rigid', value: 1, points: 1 },
        { label: 'Very tense or rigid', value: 2, points: 2 },
      ], 0, 'Assess by passive flexion/extension of the arm.'),
      selectInput('ventilator', 'Compliance with ventilator (answer only if intubated)', [
        { label: 'Tolerating ventilator or movement', value: 0, points: 0 },
        { label: 'Coughing but tolerating', value: 1, points: 1 },
        { label: 'Fighting ventilator', value: 2, points: 2 },
      ], 0, 'Only scored when the patient is intubated.', false),
      selectInput('vocalization', 'Vocalization (answer only if extubated)', [
        { label: 'Talking in normal tone or no sound', value: 0, points: 0 },
        { label: 'Sighing, moaning', value: 1, points: 1 },
        { label: 'Crying out, sobbing', value: 2, points: 2 },
      ], 0, 'Only scored when the patient is extubated.', false),
    ],
    calculate(values) {
      const fourth = bool(values.intubated) ? num(values.ventilator, 0) : num(values.vocalization, 0);
      const score = num(values.face) + num(values.body) + num(values.muscle) + fourth;
      const painful = score > 2;
      return {
        score,
        label: painful ? 'Unacceptable pain level' : 'Minimal to no pain',
        interpretation: painful
          ? `CPOT ${score} >2 — unacceptable level of pain; consider further or alternative analgesia and sedation.`
          : `CPOT ${score} ≤2 — likely minimal to no pain; continue scheduled reassessment.`,
        riskLevel: painful ? (score >= 5 ? 'high' : 'moderate') : 'normal',
        details: [
          { label: 'Facial expression', value: `${num(values.face)}` },
          { label: 'Body movements', value: `${num(values.body)}` },
          { label: 'Muscle tension', value: `${num(values.muscle)}` },
          { label: bool(values.intubated) ? 'Ventilator compliance' : 'Vocalization', value: `${fourth}` },
        ],
        recommendations: painful
          ? ['Reassess analgesia/sedation', 'Treat pain first; avoid masking with sedation alone', 'Re-score after intervention']
          : ['Continue current analgesia', 'Regular re-evaluation, especially around procedures'],
      };
    },
    evidence: {
      summary:
        'Gélinas et al. (2006) validated the CPOT in adult critically ill patients; it grades four behavioral domains 0–2 each and works for both intubated and extubated patients.',
      formula:
        'Facial expression + body movements + muscle tension + (ventilator compliance if intubated, or vocalization if extubated) = 0–8; >2 = unacceptable pain.',
      validation:
        'Demonstrated good inter-rater reliability, criterion validity against self-report, and discriminant validity across painful versus non-painful procedures in multiple ICU cohorts.',
      references: [
        {
          title: 'Validation of the critical-care pain observation tool in adult patients',
          citation: 'Gélinas C et al. Am J Crit Care. 2006',
          year: 2006,
          pmid: '16823021',
        },
      ],
    },
    nextSteps: [
      { condition: 'CPOT >2', actions: ['Escalate/adjust analgesia', 'Reassess sedation', 'Re-score after intervention'] },
      { condition: 'CPOT ≤2', actions: ['Continue current regimen', 'Scheduled reassessment'] },
    ],
    pearls: [
      'Use the vocalization domain — not ventilator compliance — for extubated patients.',
      'Observe at rest and during a stimulus (e.g., repositioning) for the most informative score.',
      'Paralysis and deep sedation blunt behavioral responses — interpret cautiously.',
    ],
  },

  // ─── 21. NVPS ──────────────────────────────────────────────────────────────
  {
    id: 'nvps',
    name: 'Nonverbal Pain Scale (NVPS)',
    shortName: 'NVPS',
    description:
      'Quantifies pain in nonverbal adults (intubated, dementia, neurologic impairment) across five behavioral/physiologic domains (0–10).',
    category: 'critical-care',
    tags: ['nvps', 'pain', 'nonverbal', 'icu', 'dementia', 'behavioral pain'],
    isQuestionnaire: true,
    whenToUse:
      'Adults unable to verbalize pain — intubated, sedated, demented, or neurologically impaired patients.',
    whyUse:
      'Combines behavioral and physiologic indicators to estimate pain intensity where self-report is impossible; guides analgesic titration.',
    inputs: [
      selectInput('face', 'Face', [
        { label: 'No particular expression or smile', value: 0, points: 0 },
        { label: 'Occasional grimace, tearing, frowning, wrinkled forehead', value: 1, points: 1 },
        { label: 'Frequent grimace, tearing, frowning, wrinkled forehead', value: 2, points: 2 },
      ], 0, 'Facial expression frequency and intensity.'),
      selectInput('activity', 'Activity / movement', [
        { label: 'Lying quietly, normal position', value: 0, points: 0 },
        { label: 'Seeking attention through movement or slow cautious movement', value: 1, points: 1 },
        { label: 'Restless, excessive activity, or withdrawal reflexes', value: 2, points: 2 },
      ], 0, 'General motor activity.'),
      selectInput('guarding', 'Guarding', [
        { label: 'Lying quietly, no positioning of hands over painful areas', value: 0, points: 0 },
        { label: 'Splinting areas of the body, tense', value: 1, points: 1 },
        { label: 'Rigid, stiff', value: 2, points: 2 },
      ], 0, 'Protective posturing and muscle tension.'),
      selectInput('physiology', 'Physiologic signs (VS change from baseline)', [
        { label: 'Stable vital signs', value: 0, points: 0 },
        { label: 'SBP change >20 mmHg or HR change >20 bpm', value: 1, points: 1 },
        { label: 'SBP change >30 mmHg or HR change >25 bpm', value: 2, points: 2 },
      ], 0, 'Change in blood pressure or heart rate from baseline.'),
      selectInput('respiratory', 'Respiratory', [
        { label: 'Baseline RR/SpO₂; synchronous with ventilator', value: 0, points: 0 },
        { label: 'RR >10 above baseline, 5% SpO₂ decrease, or mild ventilator asynchrony', value: 1, points: 1 },
        { label: 'RR >20 above baseline, 10% SpO₂ decrease, or severe ventilator asynchrony', value: 2, points: 2 },
      ], 0, 'Respiratory rate, saturation, or ventilator synchrony.'),
    ],
    calculate(values) {
      const score = num(values.face) + num(values.activity) + num(values.guarding) + num(values.physiology) + num(values.respiratory);
      let label: string;
      let interpretation: string;
      let riskLevel: 'normal' | 'moderate' | 'high';
      if (score <= 2) {
        label = 'No significant pain';
        interpretation = 'NVPS ≤2 — no significant pain indicators.';
        riskLevel = 'normal';
      } else if (score <= 6) {
        label = 'Moderate pain';
        interpretation = 'NVPS 3–6 — moderate pain; consider analgesia (scores ≥3 may indicate need for intervention).';
        riskLevel = 'moderate';
      } else {
        label = 'Severe pain';
        interpretation = 'NVPS ≥7 — severe pain; analgesic intervention indicated with reassessment.';
        riskLevel = 'high';
      }
      return {
        score,
        label,
        interpretation,
        riskLevel,
        details: [{ label: 'NVPS total', value: `${score} / 10` }],
        recommendations:
          score >= 3
            ? ['Administer/titrate analgesia per protocol', 'Reassess after intervention', 'Evaluate physiologic confounders (hypovolemia, hypoxia, agitation)']
            : ['Continue monitoring', 'Scheduled reassessment'],
      };
    },
    evidence: {
      summary:
        'Odhner et al. (2003) developed the NVPS for nonverbal critically ill adults, scoring face, activity, guarding, physiologic signs, and respiratory response 0–2 each.',
      formula: 'Face (0–2) + activity (0–2) + guarding (0–2) + physiology (0–2) + respiratory (0–2) = 0–10. ≤2 none, 3–6 moderate, ≥7 severe.',
      validation:
        'Originally developed in a burn/trauma ICU cohort with acceptable reliability; physiologic domains are nonspecific — fever, hypoxia, and hemodynamic instability can elevate the score without pain.',
      references: [
        {
          title: 'Assessing pain control in nonverbal critically ill adults',
          citation: 'Odhner M et al. Dimens Crit Care Nurs. 2003',
          year: 2003,
          pmid: '14639117',
        },
      ],
    },
    nextSteps: [
      { condition: 'NVPS ≥3', actions: ['Analgesia per protocol', 'Reassess after intervention'] },
      { condition: 'NVPS ≥7', actions: ['Escalate analgesia', 'Exclude confounding instability'] },
    ],
    pearls: [
      'Physiologic signs alone are weak pain markers — weight behavioral domains more heavily.',
      'Baseline changes in vitals and respiration should be compared to the patient’s own baseline, not population norms.',
      'Re-score after analgesic interventions to document response.',
    ],
  },

  // ─── 22. BOPS ──────────────────────────────────────────────────────────────
  {
    id: 'bops',
    name: 'Behavioral Observational Pain Scale (BOPS)',
    shortName: 'BOPS',
    description:
      'Postoperative pain scale for children ~1–7 years old scoring facial expression, verbalization, and body position (0–6).',
    category: 'pediatrics',
    tags: ['bops', 'pediatric', 'pain', 'postoperative', 'behavioral', 'children'],
    isQuestionnaire: true,
    whenToUse:
      'Postoperative children approximately 1–7 years old who cannot reliably self-report pain.',
    whyUse:
      'A simple three-domain observational score; reassessment every ~3 hours with analgesia considered at scores ≥3.',
    inputs: [
      selectInput('face', 'Facial expression', [
        { label: 'Neutral / positive / composed / calm', value: 0, points: 0 },
        { label: 'Negative / concerned', value: 1, points: 1 },
        { label: 'Grimace / distorted face', value: 2, points: 2 },
      ], 0, 'Observe the child’s facial expression.'),
      selectInput('verbal', 'Verbalization', [
        { label: 'Normal conversation / laughing / crowing', value: 0, points: 0 },
        { label: 'Quiet / sobbing / complaining not due to pain', value: 1, points: 1 },
        { label: 'Crying / screaming / complaining of pain', value: 2, points: 2 },
      ], 0, 'Vocalizations and verbal complaints.'),
      selectInput('body', 'Body position', [
        { label: 'Inactive, relaxed, or sitting/walking normally', value: 0, points: 0 },
        { label: 'Restless, shifting, or touching wound', value: 1, points: 1 },
        { label: 'Rigid or drawn up', value: 2, points: 2 },
      ], 0, 'Posture and guarding behaviors.'),
    ],
    calculate(values) {
      const score = num(values.face) + num(values.verbal) + num(values.body);
      const painful = score >= 3;
      return {
        score,
        label: painful ? 'Pain likely — consider analgesia' : 'Minimal to no pain',
        interpretation: painful
          ? `BOPS ${score} ≥3 — consider analgesic intervention and reassess.`
          : `BOPS ${score} — minimal pain behaviors; continue scheduled ~3-hourly reassessment.`,
        riskLevel: painful ? 'moderate' : 'normal',
        details: [{ label: 'BOPS total', value: `${score} / 6` }],
        recommendations: painful
          ? ['Administer age-appropriate analgesia', 'Reassess after intervention', 'Address anxiety and comfort needs']
          : ['Continue comfort measures', 'Reassess ~every 3 hours'],
      };
    },
    evidence: {
      summary:
        'Hesselgard et al. (2007) validated the BOPS for postoperative pain in children aged 1–7 years using facial expression, verbalization, and body position.',
      formula: 'Facial expression (0–2) + verbalization (0–2) + body position (0–2) = 0–6; ≥3 suggests analgesia is warranted.',
      validation:
        'Demonstrated validity and reliability in a pediatric postoperative cohort; behavior can be confounded by hunger, anxiety, and separation distress.',
      references: [
        {
          title: 'Validity and reliability of the Behavioural Observational Pain Scale for postoperative pain measurement in children 1-7 years of age',
          citation: 'Hesselgard K et al. Pediatr Crit Care Med. 2007',
          year: 2007,
          pmid: '17273124',
        },
      ],
    },
    nextSteps: [
      { condition: 'BOPS ≥3', actions: ['Analgesia', 'Comfort measures', 'Reassess'] },
      { condition: 'BOPS <3', actions: ['Routine reassessment ~q3h'] },
    ],
    pearls: [
      'Designed for children ~1–7 years postoperatively.',
      'Observe during activity, not only at rest.',
      'Distinguish pain behaviors from fear and hunger where possible.',
    ],
  },

  // ─── 23. CHEOPS ────────────────────────────────────────────────────────────
  {
    id: 'cheops',
    name: "Children's Hospital of Eastern Ontario Pain Scale (CHEOPS)",
    shortName: 'CHEOPS',
    description:
      'Behavioral scale for rating postoperative pain in children across six domains — cry, face, verbal, torso, touch, and legs (4–13).',
    category: 'pediatrics',
    tags: ['cheops', 'pediatric', 'pain', 'postoperative', 'behavioral', 'children'],
    isQuestionnaire: true,
    whenToUse:
      'Postoperative pediatric patients (approximately 1–5 years, extended in practice to older children) who cannot reliably self-report pain.',
    whyUse:
      'One of the earliest validated pediatric behavioral pain scales; scores ≥5 suggest significant pain warranting analgesia.',
    inputs: [
      selectInput('cry', 'Cry', [
        { label: 'No cry', value: 1, points: 1 },
        { label: 'Moaning', value: 2, points: 2 },
        { label: 'Crying', value: 2, points: 2 },
        { label: 'Screaming', value: 3, points: 3 },
      ], 1, 'Presence and character of crying.'),
      selectInput('face', 'Face', [
        { label: 'Smiling', value: 0, points: 0 },
        { label: 'Composed', value: 1, points: 1 },
        { label: 'Grimace', value: 2, points: 2 },
      ], 1, 'Facial expression.'),
      selectInput('verbal', 'Verbal', [
        { label: 'Positive statement', value: 0, points: 0 },
        { label: 'Not talking / complaining unrelated to pain', value: 1, points: 1 },
        { label: 'Pain complaint (with or without other complaints)', value: 2, points: 2 },
      ], 1, 'Verbal statements about pain.'),
      selectInput('torso', 'Torso', [
        { label: 'Neutral', value: 1, points: 1 },
        { label: 'Shifting, tense, shivering, upright, or restrained', value: 2, points: 2 },
      ], 1, 'Trunk posture and movement.'),
      selectInput('touch', 'Touch / wound', [
        { label: 'Not touching wound or area', value: 1, points: 1 },
        { label: 'Reaching, touching, grabbing, or restrained', value: 2, points: 2 },
      ], 1, 'Attempts to touch or guard the painful site.'),
      selectInput('legs', 'Legs', [
        { label: 'Neutral', value: 1, points: 1 },
        { label: 'Squirming/kicking, drawn up/tensed, standing/kneeling, or restrained', value: 2, points: 2 },
      ], 1, 'Leg position and movement.'),
    ],
    calculate(values) {
      const score = num(values.cry, 1) + num(values.face, 0) + num(values.verbal, 0) + num(values.torso, 1) + num(values.touch, 1) + num(values.legs, 1);
      const painful = score >= 5;
      return {
        score,
        label: painful ? 'Significant pain — consider analgesia' : 'Minimal to no pain',
        interpretation: painful
          ? `CHEOPS ${score} ≥5 — consistent with significant postoperative pain; analgesia is generally indicated.`
          : `CHEOPS ${score} (minimum 4) — minimal pain behaviors; continue scheduled reassessment.`,
        riskLevel: painful ? 'moderate' : 'normal',
        details: [{ label: 'CHEOPS total', value: `${score} / 13` }],
        recommendations: painful
          ? ['Administer age-appropriate analgesia', 'Comfort measures and caregiver presence', 'Reassess after intervention']
          : ['Continue routine observation', 'Reassess per postoperative protocol'],
      };
    },
    evidence: {
      summary:
        'McGrath et al. introduced CHEOPS in 1985 as a six-domain behavioral scale for postoperative pain in young children; it has since been cross-validated in multiple pediatric studies.',
      formula:
        'Cry (1–3) + face (0–2) + verbal (0–2) + torso (1–2) + touch (1–2) + legs (1–2) = 4–13; ≥5 suggests significant pain.',
      validation:
        'Good inter-rater reliability and correlation with self-report in validation studies; influenced by temperament and non-pain distress, so interpret alongside context.',
      references: [
        {
          title: 'CHEOPS: a behavioral scale for rating postoperative pain in children',
          citation: 'McGrath PJ et al. In: Advances in Pain Research and Therapy, Vol 9. Raven Press, 1985',
          year: 1985,
        },
      ],
    },
    nextSteps: [
      { condition: 'CHEOPS ≥5', actions: ['Analgesia', 'Comfort measures', 'Reassess'] },
      { condition: 'CHEOPS 4', actions: ['Routine monitoring'] },
    ],
    pearls: [
      'The minimum score is 4 — a score of 4 reflects no pain behaviors.',
      'Screaming, pain complaints, and guarding drive the score up quickly.',
      'Use for postoperative observation, not chronic pain assessment.',
    ],
  },

  // ─── 24. Estimated Expected Peak Expiratory Flow ───────────────────────────
  {
    id: 'peak-flow-predicted',
    name: 'Estimated Expected Peak Expiratory Flow (Peak Flow)',
    shortName: 'Expected PEF',
    description:
      'Estimates expected peak expiratory flow from age, height, sex, and ethnicity using Hankinson (NHANES III) equations where available and Knudson/pediatric equations otherwise.',
    category: 'pulmonary',
    tags: ['peak flow', 'pefr', 'asthma', 'spirometry', 'nhanes', 'pulmonary'],
    whenToUse:
      'Patients 5–80 years old with asthma or obstructive symptoms when a personal-best peak flow is unknown and an expected value is needed to grade exacerbation severity.',
    whyUse:
      'Comparing measured PEFR to predicted quantifies airflow obstruction — >80% predicted is mild, 50–80% moderate, <50% severe in most exacerbation frameworks.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 5, max: 80, exampleValue: 35, helpText: 'Equations are validated for ages 5–80.' }),
      numberInput('heightCm', 'Height', { unit: 'cm', min: 100, max: 220, exampleValue: 170, helpText: 'Standing height in centimeters.' }),
      selectInput('sex', 'Sex', [
        { label: 'Female', value: 'female' },
        { label: 'Male', value: 'male' },
      ], 'male', 'Reference equations are sex-specific.'),
      selectInput('race', 'Race / ethnicity', [
        { label: 'Caucasian / White', value: 'white' },
        { label: 'African American / Black', value: 'black' },
        { label: 'Mexican American / Hispanic', value: 'mexican' },
        { label: 'Other', value: 'other' },
      ], 'white', 'Hankinson (NHANES III) covers White, Black, and Mexican-American groups ages 8–80; “Other” uses pediatric (5–17) or Knudson adult (18–80) equations.'),
      numberInput('actualPef', 'Measured peak flow (optional)', { unit: 'L/min', min: 30, max: 900, exampleValue: 420, helpText: 'If entered, percent-predicted and the green/yellow/red zone are reported.', required: false }),
    ],
    calculate(values) {
      const age = num(values.age, 35);
      const h = num(values.heightCm, 170);
      const sex = str(values.sex, 'male');
      const race = str(values.race, 'white');
      let predicted: number;
      let method = '';
      const pediatric = () => {
        method = 'Pediatric equation [(ht−100)×5+100]';
        return (h - 100) * 5 + 100;
      };
      if (age <= 7) {
        predicted = pediatric();
      } else if (race !== 'other' && age >= 8 && age <= 80) {
        method = 'Hankinson 1999 (NHANES III)';
        predicted = hankinsonPefLmin(age, h, sex, race);
      } else if (age <= 17) {
        predicted = pediatric();
      } else {
        method = 'Knudson 1983 (adult, other ethnicity)';
        const hm = h / 100;
        predicted = sex === 'male' ? (hm * 5.48 + 1.58 - age * 0.041) * 60 : (hm * 3.72 + 2.24 - age * 0.03) * 60;
      }
      predicted = Math.max(0, round(predicted, 0));
      const actual = values.actualPef === null || values.actualPef === undefined || values.actualPef === '' ? null : num(values.actualPef);
      const pct = actual ? round((actual / predicted) * 100, 1) : null;
      const zone = pct === null ? null : pct > 80 ? 'green' : pct >= 50 ? 'yellow' : 'red';
      return {
        score: predicted,
        unit: 'L/min',
        label: `Expected PEF ${predicted} L/min${zone ? ` — ${zone.toUpperCase()} zone` : ''}`,
        interpretation:
          pct === null
            ? `Predicted peak expiratory flow ≈${predicted} L/min (${method}). Enter the measured peak flow to compute percent-predicted and severity zone.`
            : `Measured ${actual} L/min = ${pct}% of predicted (${method}). ${zone === 'green' ? '>80%: mild / green zone.' : zone === 'yellow' ? '50–80%: moderate / yellow zone — caution.' : '<50%: severe / red zone.'}`,
        riskLevel: zone === 'red' ? 'high' : zone === 'yellow' ? 'moderate' : 'normal',
        details: [
          { label: 'Predicted PEF', value: `${predicted} L/min` },
          { label: 'Method', value: method ?? '' },
          ...(pct !== null ? [{ label: '% predicted', value: `${pct}%` }] : []),
        ],
        recommendations:
          zone === 'red'
            ? ['Severe obstruction — escalate bronchodilator therapy per asthma action plan', 'Consider urgent evaluation/systemic steroids']
            : zone === 'yellow'
              ? ['Moderate obstruction — follow asthma action plan', 'Monitor response to bronchodilator']
              : ['Compare to personal best when available', 'Trend serial measurements'],
      };
    },
    evidence: {
      summary:
        'Predicted PEF uses Hankinson 1999 NHANES III regression equations for ages 8–80 in White, African-American, and Mexican-American groups; a standard pediatric height equation for ages 5–7 (and 8–17 other ethnicities); and Knudson 1983 adult equations for other ethnicities ages 18–80.',
      formula:
        'NHANES III: PEF(L/s) = b0 + b1·age + b2·age² + b3·ht² (sex/ethnicity/age-stratum coefficients). Pediatric: (ht−100)×5+100 L/min. Knudson male: (5.48·ht[m]+1.58−0.041·age)×60; female: (3.72·ht[m]+2.24−0.03·age)×60.',
      validation:
        'NHANES III equations were derived from 7,429 asymptomatic lifelong nonsmokers. Predicted values vary by population — personal best supersedes predicted values when known; ethnicity categories are a recognized limitation of the reference data.',
      references: [
        {
          title: 'Spirometric reference values from a sample of the general U.S. population',
          citation: 'Hankinson JL et al. Am J Respir Crit Care Med. 1999',
          year: 1999,
          pmid: '9872837',
          doi: '10.1164/ajrccm.159.1.9712108',
        },
        {
          title: 'Changes in the normal maximal expiratory flow-volume curve with growth and aging',
          citation: 'Knudson RJ et al. Am Rev Respir Dis. 1983',
          year: 1983,
          pmid: '6859656',
        },
      ],
    },
    nextSteps: [
      { condition: '<50% predicted', actions: ['Escalate therapy', 'Urgent assessment', 'Consider systemic steroids'] },
      { condition: '50–80% predicted', actions: ['Asthma action plan', 'Serial PEF monitoring'] },
      { condition: '>80% predicted', actions: ['Continue management', 'Establish personal best'] },
    ],
    pearls: [
      'Personal best is preferred over predicted values once established (best of 3 maximal efforts).',
      'PEF technique matters — inadequate effort underestimates measured flow and overstates severity.',
      'Zones (>80%, 50–80%, <50%) come from exacerbation-severity frameworks, not the reference equations themselves.',
    ],
  },
];
