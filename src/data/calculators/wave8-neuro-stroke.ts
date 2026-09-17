import type { Calculator } from '../../types/calculator';
import { num, bool, str, round, yesNo, selectInput, numberInput } from '../../utils/helpers';

/** IMPACT logistic coefficient tables (tbi-impact.org model-fit document, Steyerberg 2008). */
const IMPACT_MOTOR: Record<string, [number, number][]> = {
  // [core, extended, lab] each = [mortality β, unfavorable β]; reference = localizes/obeys
  none: [
    [1.447, 1.393],
    [1.205, 1.218],
    [0.965, 1.105],
  ],
  extension: [
    [1.397, 2.078],
    [1.207, 1.852],
    [1.109, 1.801],
  ],
  abnormalFlexion: [
    [0.797, 1.266],
    [0.746, 1.185],
    [0.778, 1.186],
  ],
  normalFlexion: [
    [0.39, 0.632],
    [0.313, 0.575],
    [0.31, 0.548],
  ],
  localizesObeys: [
    [0, 0],
    [0, 0],
    [0, 0],
  ],
  untestable: [
    [0.522, 0.885],
    [0.425, 0.837],
    [0.462, 0.059],
  ],
};

const IMPACT_PUPILS: Record<string, [number, number][]> = {
  both: [
    [0, 0],
    [0, 0],
    [0, 0],
  ],
  one: [
    [0.514, 0.592],
    [0.334, 0.442],
    [0.09, 0.201],
  ],
  none: [
    [1.239, 1.216],
    [0.97, 1.003],
    [0.533, 0.712],
  ],
};

const IMPACT_MARSHALL: Record<string, [number, number][]> = {
  // Marshall CT II is the reference category
  I: [
    [0, 0],
    [-0.298, -0.53],
    [-0.15, -0.567],
  ],
  II: [
    [0, 0],
    [0, 0],
    [0, 0],
  ],
  III_IV: [
    [0, 0],
    [0.774, 0.543],
    [0.715, 0.508],
  ],
  V_VI: [
    [0, 0],
    [0.651, 0.497],
    [0.807, 0.571],
  ],
};

const IMPACT_MODEL = {
  intercept: [-3.109, -2.644, -3.787, -3.023, -3.184, -2.47] as const,
  age: [0.034, 0.038, 0.032, 0.033, 0.02, 0.029] as const,
  tsah: [0.606, 0.567, 0.74, 0.666] as const,
  edh: [-0.379, -0.572, -0.51, -0.687] as const,
  hypoxia: [0.237, 0.316, 0.36, 0.396] as const,
  hypotension: [0.667, 0.614, 0.366, 0.44] as const,
  glucose: [0.097, 0.085] as const,
  hb: [-0.086, -0.092] as const,
};

/** Published PHASES score → absolute 5-year rupture risk (Greving 2014 risk chart). */
function phasesRisk(score: number): number {
  if (score <= 2) return 0.4;
  if (score === 3) return 0.7;
  if (score === 4) return 0.9;
  if (score === 5) return 1.3;
  if (score === 6) return 1.7;
  if (score === 7) return 2.4;
  if (score === 8) return 3.2;
  if (score === 9) return 4.3;
  if (score === 10) return 5.3;
  if (score === 11) return 7.2;
  return 17.8; // ≥12 points: 17.8% (95% CI 15.2–20.7)
}

/** Wave 8: stroke, neurovascular, and neuroprognosis calculators. */
export const wave8NeuroStrokeCalcs: Calculator[] = [
  // ─── 1. ESUS Criteria ─────────────────────────────────────────────────────
  {
    id: 'esus-criteria',
    name: 'Embolic Stroke of Undetermined Source (ESUS) Criteria',
    shortName: 'ESUS',
    description:
      'Determines whether an ischemic stroke meets the 2014 Cryptogenic Stroke/ESUS International Working Group definition of embolic stroke of undetermined source.',
    category: 'neurology',
    tags: ['esus', 'stroke', 'cryptogenic', 'embolic', 'afib', 'secondary prevention'],
    whenToUse:
      'After a completed stroke workup (brain imaging, vessel imaging, cardiac rhythm monitoring, and echocardiography) in a patient with ischemic — not hemorrhagic — stroke whose mechanism remains unclear.',
    whyUse:
      'ESUS defines a therapeutically relevant subgroup of cryptogenic stroke presumed thromboembolic. The label drives decisions about extended cardiac monitoring, occult-malignancy workup, PFO evaluation, and whether anticoagulation (vs antiplatelet) should be considered or trialed.',
    inputs: [
      yesNo(
        'nonLacunar',
        'Stroke is non-lacunar on CT or MRI',
        null,
        'Lacunar = subcortical infarct ≤1.5 cm (≤2.0 cm on MRI diffusion-weighted images) in largest dimension AND in the distribution of small penetrating cerebral arteries of the hemispheres or pons. ESUS requires a NON-lacunar infarct.',
        true
      ),
      yesNo(
        'noStenosis',
        'No atherosclerosis causing ≥50% stenosis in arteries supplying the infarct',
        null,
        'Extracranial or intracranial atherosclerosis producing ≥50% luminal stenosis of an artery supplying the ischemic territory excludes ESUS. Vessel imaging (duplex, CTA, MRA, or angiography) is required.',
        true
      ),
      yesNo(
        'noCardioembolic',
        'No major-risk cardioembolic source',
        null,
        'Major-risk sources: permanent or paroxysmal atrial fibrillation, sustained atrial flutter, intracardiac thrombus, prosthetic cardiac valve, atrial myxoma or other cardiac tumor, mitral stenosis, myocardial infarction within 4 weeks, LV ejection fraction <30%, valvular vegetations, or infective endocarditis.',
        false
      ),
      yesNo(
        'noOtherCause',
        'No other specific cause of stroke identified',
        null,
        'E.g., cervicocephalic artery dissection, arteritis/vasculitis, migraine-related infarct or vasospasm, drug abuse–related stroke, or a monogenic/other determined etiology.',
        true
      ),
    ],
    calculate(values) {
      const criteria = [
        { id: 'nonLacunar', label: 'Non-lacunar infarct', met: bool(values.nonLacunar) },
        { id: 'noStenosis', label: 'No ≥50% causal stenosis', met: bool(values.noStenosis) },
        { id: 'noCardioembolic', label: 'No major-risk cardioembolic source', met: bool(values.noCardioembolic) },
        { id: 'noOtherCause', label: 'No other specific cause', met: bool(values.noOtherCause) },
      ];
      const met = criteria.filter((c) => c.met).length;
      const meets = met === 4;
      const failed = criteria.filter((c) => !c.met).map((c) => c.label);
      return {
        score: meets ? 'Meets' : 'Does not meet',
        unit: 'ESUS criteria',
        label: meets ? 'Meets ESUS criteria' : 'Does not meet ESUS criteria',
        interpretation: meets
          ? 'All 4 ESUS criteria satisfied: non-lacunar brain infarct without proximal ≥50% arterial stenosis, without a major-risk cardioembolic source, and without another determined cause. Embolism is the likely mechanism from an undetermined source (occult paroxysmal AF, minor-risk cardiac sources, non-stenosing plaque, paradoxical embolism, occult malignancy).'
          : `${met}/4 criteria met. Fails: ${failed.join('; ')}. The stroke is not ESUS — classify by the identified mechanism (e.g., lacunar/small-vessel, large-artery atherosclerosis, cardioembolic, or other determined cause) and treat accordingly.`,
        riskLevel: meets ? 'info' : 'normal',
        details: criteria.map((c) => ({ label: c.label, value: c.met ? 'Present' : 'Absent' })),
        recommendations: meets
          ? [
              'Consider prolonged cardiac rhythm monitoring (e.g., implantable loop recorder or ≥2-week monitor) for occult paroxysmal AF',
              'Consider TEE, cardiac MRI, transcranial Doppler emboli monitoring, and occult-malignancy or vasculitis workup as clinically indicated',
              'Antiplatelet therapy remains standard secondary prevention; randomized trials (NAVIGATE-ESUS, RE-SPECT ESUS) showed no benefit of empiric DOAC over aspirin in unselected ESUS',
              'In patients ≤60 y with a PFO, evaluate for possible PFO-attributable stroke (RoPE score) and discuss closure',
            ]
          : [
              'Treat the identified stroke mechanism per guideline (antiplatelet ± statin for atherosclerosis/lacunar, anticoagulation for AF, revascularization for symptomatic stenosis)',
              'If workup was incomplete, finish brain + vessel imaging, cardiac rhythm monitoring, and echocardiography before labeling the stroke cryptogenic',
            ],
      };
    },
    evidence: {
      summary:
        'ESUS (Hart et al., Cryptogenic Stroke/ESUS International Working Group, Lancet Neurol 2014) requires ALL of: (1) non-lacunar ischemic stroke on CT/MRI — lacunar defined as subcortical infarct ≤1.5 cm (≤2.0 cm on DWI) in a penetrating artery distribution; (2) absence of extra- or intracranial atherosclerosis causing ≥50% stenosis of arteries supplying the ischemic area; (3) no major-risk cardioembolic source; (4) no other specific cause.',
      formula: 'All four criteria must be present; the construct describes mechanism, not a numeric score.',
      validation:
        'Criteria verified against the primary Lancet Neurology 2014 publication and the 2017 Stroke systematic review. ESUS was conceived to select patients for anticoagulation trials; NAVIGATE-ESUS and RE-SPECT ESUS later showed no benefit of empiric anticoagulation vs aspirin in unselected ESUS, so the construct now mainly guides etiologic workup.',
      references: [
        {
          title: 'Embolic strokes of undetermined source: the case for a new clinical construct',
          citation: 'Hart RG, Diener HC, Coutts SB, et al.; Cryptogenic Stroke/ESUS International Working Group. Lancet Neurol. 2014;13(4):429-438',
          year: 2014,
          pmid: '24646875',
          doi: '10.1016/S1474-4422(13)70310-7',
        },
        {
          title: 'Embolic Stroke of Undetermined Source: A Systematic Review and Clinical Update',
          citation: 'Hart RG, Catanese L, Perera KS, Ntaios G, Connolly SJ. Stroke. 2017;48(4):867-872',
          year: 2017,
          pmid: '28265016',
          doi: '10.1161/STROKEAHA.116.016414',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Meets ESUS criteria',
        actions: [
          'Extended cardiac rhythm monitoring for occult AF',
          'Age-appropriate occult malignancy and hypercoagulable evaluation',
          'Antiplatelet secondary prevention; PFO workup if ≤60 y',
        ],
      },
      {
        condition: 'Major-risk cardioembolic source found',
        actions: ['Anticoagulate for AF/flutter or mechanical valve per guideline', 'Manage the specific cardiac lesion'],
      },
      {
        condition: '≥50% ipsilateral stenosis or lacunar infarct',
        actions: ['Large-artery or small-vessel pathway: antiplatelet, statin, BP/diabetes control; carotid revascularization if symptomatic severe stenosis'],
      },
    ],
    pearls: [
      'ESUS is not synonymous with cryptogenic stroke: it excludes strokes with multiple candidate causes and those with incomplete workups.',
      'Roughly 1 in 6–7 ischemic strokes meets ESUS criteria; recurrent stroke risk is ~4–5% per year despite antiplatelets.',
      'Do not apply to hemorrhagic stroke or to patients whose only deficit is a resolved TIA without infarction.',
      'The 2024 ESC consensus proposes updated ESUS criteria and a structured diagnostic algorithm — check local adoption.',
    ],
  },

  // ─── 2. RoPE Score ────────────────────────────────────────────────────────
  {
    id: 'rope-score',
    name: 'Risk of Paradoxical Embolism (RoPE) Score',
    shortName: 'RoPE',
    description:
      'Estimates the probability that a patent foramen ovale discovered after cryptogenic stroke is pathogenic rather than incidental.',
    category: 'neurology',
    tags: ['rope', 'pfo', 'cryptogenic stroke', 'paradoxical embolism', 'pfo closure'],
    whenToUse:
      'A patient with cryptogenic ischemic stroke found to have a PFO, with no other compelling cause identified — used to estimate whether the PFO is stroke-related.',
    whyUse:
      'PFOs are present in ~25% of the population, so many are incidental. The RoPE score stratifies the PFO-attributable fraction (~0% to ~90%) and correlates inversely with 2-year recurrence, helping select candidates for PFO closure and mechanism-specific therapy.',
    inputs: [
      selectInput(
        'htn',
        'History of hypertension',
        [
          { label: 'No', value: 'no', points: 1 },
          { label: 'Yes', value: 'yes', points: 0 },
        ],
        'no',
        'Absence of hypertension scores +1; its presence makes a PFO-related mechanism less likely.'
      ),
      selectInput(
        'diabetes',
        'History of diabetes mellitus',
        [
          { label: 'No', value: 'no', points: 1 },
          { label: 'Yes', value: 'yes', points: 0 },
        ],
        'no',
        'Absence of diabetes scores +1.'
      ),
      selectInput(
        'priorStroke',
        'Prior stroke or TIA',
        [
          { label: 'No', value: 'no', points: 1 },
          { label: 'Yes', value: 'yes', points: 0 },
        ],
        'no',
        'Absence of prior cerebral ischemia scores +1; prior events suggest an alternative recurrent mechanism.'
      ),
      selectInput(
        'smoker',
        'Smoker (current or prior)',
        [
          { label: 'No', value: 'no', points: 1 },
          { label: 'Yes', value: 'yes', points: 0 },
        ],
        'no',
        'Non-smokers score +1.'
      ),
      selectInput(
        'cortical',
        'Cortical infarct on imaging',
        [
          { label: 'No', value: 'no', points: 0 },
          { label: 'Yes', value: 'yes', points: 1 },
        ],
        'yes',
        'A superficial/cortical infarct pattern on CT or MRI scores +1 — the radiographic signature of embolism.'
      ),
      numberInput('age', 'Age', {
        unit: 'years',
        min: 18,
        max: 110,
        exampleValue: 45,
        helpText: 'Age points: 18–29 = +5, 30–39 = +4, 40–49 = +3, 50–59 = +2, 60–69 = +1, ≥70 = 0.',
      }),
    ],
    calculate(values) {
      const age = num(values.age, 45);
      const agePts = age < 30 ? 5 : age < 40 ? 4 : age < 50 ? 3 : age < 60 ? 2 : age < 70 ? 1 : 0;
      const score =
        (str(values.htn, 'yes') === 'no' ? 1 : 0) +
        (str(values.diabetes, 'yes') === 'no' ? 1 : 0) +
        (str(values.priorStroke, 'yes') === 'no' ? 1 : 0) +
        (str(values.smoker, 'yes') === 'no' ? 1 : 0) +
        (str(values.cortical, 'no') === 'yes' ? 1 : 0) +
        agePts;
      let riskLevel: 'low' | 'moderate' | 'high' = 'low';
      let label = '';
      let interpretation = '';
      let fraction = '';
      if (score >= 9) {
        riskLevel = 'high';
        label = 'PFO very likely stroke-related (9–10)';
        fraction = '~90% PFO-attributable fraction; PFO prevalence 73% in this stratum';
        interpretation =
          'Younger patient with a cortical infarct and few vascular risk factors — the discovered PFO is likely pathogenic (~90% attributable fraction). Strongest expected benefit from PFO closure evaluation.';
      } else if (score >= 7) {
        riskLevel = 'moderate';
        label = 'PFO likely stroke-related (7–8)';
        fraction = 'roughly 50–80% PFO-attributable fraction';
        interpretation =
          'PFO is more likely than not to be causally related to the index stroke. Closure benefit demonstrated in trials was concentrated in higher-RoPE patients — cardiology/neurology review is appropriate.';
      } else if (score >= 4) {
        riskLevel = 'moderate';
        label = 'PFO possibly stroke-related (4–6)';
        fraction = 'roughly 30–50% PFO-attributable fraction';
        interpretation =
          'Intermediate likelihood that the PFO is pathogenic. Weigh high-risk PFO anatomy (large shunt, atrial septal aneurysm — the PASCAL classification) and alternate mechanisms before deciding on closure.';
      } else {
        riskLevel = 'low';
        label = 'PFO likely incidental (0–3)';
        fraction = 'approximately 0% PFO-attributable fraction; PFO prevalence 23% — same as general population';
        interpretation =
          'The PFO is most likely an incidental finding; look harder for another stroke mechanism (occult AF, non-stenosing plaque, hypercoagulability). PFO closure is unlikely to help.';
      }
      return {
        score,
        unit: 'points (0–10)',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Age points', value: `${agePts} (age ${age})` },
          { label: 'PFO-attributable fraction', value: fraction },
          { label: '2-yr stroke/TIA recurrence (derivation)', value: score <= 3 ? '~20%' : score >= 9 ? '~2%' : 'intermediate, decreasing with score' },
        ],
        recommendations: [
          'Rule out other mechanisms (hypercoagulable state, occult AF with extended monitoring, aortic arch/plaque embolism) before attributing stroke to the PFO',
          'Higher RoPE + high-risk PFO anatomy (large shunt, ASA) = PASCAL "probable" — strongest closure candidates in pooled RCT analyses',
          'Antiplatelet vs anticoagulant therapy should follow the presumed mechanism, not the mere presence of a PFO',
        ],
      };
    },
    evidence: {
      summary:
        'RoPE (Kent et al., Neurology 2013) scores: no hypertension +1, no diabetes +1, no prior stroke/TIA +1, non-smoker +1, cortical infarct +1, plus age 18–29 +5 / 30–39 +4 / 40–49 +3 / 50–59 +2 / 60–69 +1 / ≥70 0 (total 0–10). Higher scores mean the PFO is more likely causal: PFO prevalence in cryptogenic stroke rises from 23% (score 0–3) to 73% (9–10), and estimated attributable fraction from ~0% to ~90%; 2-year recurrence falls from ~20% to ~2%.',
      formula: 'Score = age points + 1 each for absent HTN, absent DM, absent prior stroke/TIA, non-smoking, and cortical infarct.',
      validation:
        'Derived from 12 component databases of cryptogenic stroke with PFO. Verified against the Neurology 2013 paper and the SCOPE/PASCAL summary. Pooled PFO-closure trial analysis (Kent, JAMA 2021) confirmed greater closure benefit in high-RoPE patients.',
      references: [
        {
          title: 'An index to identify stroke-related vs incidental patent foramen ovale in cryptogenic stroke',
          citation: 'Kent DM, Ruthazer R, Weimar C, et al. Neurology. 2013;81(7):619-625',
          year: 2013,
          pmid: '23864310',
          doi: '10.1212/WNL.0b013e3182a08d59',
        },
        {
          title: 'Heterogeneity of Treatment Effects in an Analysis of Pooled Individual Patient Data From Randomized Trials of Device Closure of Patent Foramen Ovale After Stroke',
          citation: 'Kent DM, Saver JL, Kasner SE, et al. JAMA. 2021;326(22):2277-2286',
          year: 2021,
          pmid: '34905030',
          doi: '10.1001/jama.2021.20956',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'RoPE ≥7, age ≤60, suitable anatomy',
        actions: ['Neurology + cardiology review for PFO closure', 'Define shunt size and atrial septal aneurysm (PASCAL high-risk features)'],
      },
      {
        condition: 'RoPE 4–6',
        actions: ['Extended rhythm monitoring for occult AF', 'Consider PASCAL classification to refine candidacy', 'Antiplatelet therapy'],
      },
      {
        condition: 'RoPE 0–3',
        actions: ['Search for alternate mechanism before attributing stroke to PFO', 'Standard cryptogenic-stroke secondary prevention'],
      },
    ],
    pearls: [
      'RoPE estimates mechanism, not prognosis alone — paradoxically, higher scores predict LOWER recurrence (competing causes carry the recurrence risk).',
      'Apply only after a genuinely negative workup; a missed diagnosis of AF or plaque invalidates the "cryptogenic" premise.',
      'High-risk PFO features (atrial septal aneurysm, large shunt) matter independently — combine RoPE with PASCAL for closure decisions.',
    ],
  },

  // ─── 3. RCVS2 Score ───────────────────────────────────────────────────────
  {
    id: 'rcvs2-score',
    name: 'RCVS₂ Score for Reversible Cerebral Vasoconstriction Syndrome',
    shortName: 'RCVS₂',
    description:
      'Distinguishes reversible cerebral vasoconstriction syndrome (RCVS) from other intracranial arteriopathies at admission.',
    category: 'neurology',
    tags: ['rcvs', 'vasoconstriction', 'thunderclap headache', 'arteriopathy', 'pacns', 'sah'],
    whenToUse:
      'Adults aged 18–55 with a FIRST presentation of abnormal intracranial vascular imaging (new arteriopathy), to separate RCVS from mimics such as primary angiitis of the CNS (PACNS), atherosclerosis, or dissection. Not validated outside this age range.',
    whyUse:
      'Misdiagnosing RCVS as CNS vasculitis exposes patients to harmful steroids and immunosuppression; misdiagnosing PACNS as RCVS delays needed immunotherapy. The score correctly classifies most patients at admission using bedside and imaging features.',
    inputs: [
      yesNo(
        'thunderclap',
        'Recurrent or single thunderclap headache',
        5,
        'Sudden-onset headache reaching maximal intensity within ~1 minute. Recurrent thunderclap headache is the hallmark of RCVS; even a single episode scores +5.',
        true
      ),
      selectInput(
        'carotid',
        'Intracranial internal carotid artery involvement',
        [
          { label: 'Not affected', value: 'no', points: 0 },
          { label: 'Affected', value: 'yes', points: -2 },
        ],
        'no',
        'Narrowing/irregularity involving the intracranial ICA argues AGAINST RCVS (−2) and toward other arteriopathies.'
      ),
      yesNo(
        'trigger',
        'Vasoconstrictive trigger identified',
        3,
        'Vasoactive drugs (triptans, SSRIs, sympathomimetics, decongestants, cannabis, cocaine, amphetamines), postpartum state, catecholamine-secreting tumors, or recent immunosuppression/blood products.',
        true
      ),
      selectInput(
        'sex',
        'Sex',
        [
          { label: 'Male', value: 'M', points: 0 },
          { label: 'Female', value: 'F', points: 1 },
        ],
        'F',
        'Female sex adds +1; RCVS is substantially more common in women.'
      ),
      yesNo(
        'sah',
        'Subarachnoid hemorrhage present on imaging',
        1,
        'Typically small convexity (convexal/sulcal) SAH over the hemispheric surface — a characteristic RCVS imaging feature.',
        false
      ),
    ],
    calculate(values) {
      const score =
        (bool(values.thunderclap) ? 5 : 0) +
        (str(values.carotid, 'no') === 'yes' ? -2 : 0) +
        (bool(values.trigger) ? 3 : 0) +
        (str(values.sex, 'M') === 'F' ? 1 : 0) +
        (bool(values.sah) ? 1 : 0);
      let riskLevel: 'low' | 'moderate' | 'high' = 'low';
      let label = '';
      let interpretation = '';
      if (score >= 5) {
        riskLevel = 'high';
        label = 'RCVS highly likely (≥5)';
        interpretation = `RCVS₂ score ${score}: 90% sensitive and 99% specific for RCVS in derivation/validation. Manage as RCVS — remove triggers, avoid steroids and vasoconstrictors (e.g., triptans); calcium-channel blockers commonly used.`;
      } else if (score <= 2) {
        riskLevel = 'low';
        label = 'RCVS highly unlikely (≤2)';
        interpretation = `RCVS₂ score ${score}: effectively excludes RCVS (100% specificity for exclusion, 85% sensitivity). Work up alternative arteriopathies — PACNS, intracranial atherosclerosis, dissection, moyamoya, infectious vasculopathy.`;
      } else {
        riskLevel = 'moderate';
        label = 'Equivocal (3–4)';
        interpretation = `RCVS₂ score ${score}: indeterminate. Apply the authors' bedside approach — recurrent thunderclap headache, a trigger with normal brain parenchymal imaging, or convexity SAH each independently support RCVS; consider serial vascular imaging to document reversibility.`;
      }
      return {
        score,
        unit: 'points (−2 to +10)',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Thunderclap headache', value: bool(values.thunderclap) ? '+5' : '0' },
          { label: 'Intracranial ICA involvement', value: str(values.carotid, 'no') === 'yes' ? '−2' : '0' },
          { label: 'Vasoconstrictive trigger', value: bool(values.trigger) ? '+3' : '0' },
          { label: 'Female sex', value: str(values.sex, 'M') === 'F' ? '+1' : '0' },
          { label: 'Convexity SAH', value: bool(values.sah) ? '+1' : '0' },
        ],
        recommendations: [
          'If RCVS likely: stop/remove vasoconstrictive exposures; avoid glucocorticoids (associated with worse outcomes) and triptans',
          'If non-RCVS arteriopathy suspected: escalate workup (vessel-wall MRI, CSF analysis, rheumatologic/infectious panel, biopsy in select cases)',
          'Equivocal score: repeat vascular imaging in weeks to document reversibility, the defining RCVS feature',
        ],
      };
    },
    evidence: {
      summary:
        'RCVS₂ (Rocha, Topcuoglu, Silva, Singhal; Neurology 2019): recurrent/single thunderclap headache +5, intracranial carotid artery involvement −2, vasoconstrictive trigger +3, female sex +1, subarachnoid hemorrhage +1 (range −2 to +10). ≥5 = RCVS likely (90% sens, 99% spec); ≤2 = RCVS excluded (85% sens, 100% spec); 3–4 equivocal.',
      formula: 'Score = 5(TCH) − 2(ICA) + 3(trigger) + 1(female) + 1(SAH).',
      validation:
        'Derived in 30 RCVS vs 80 non-RCVS arteriopathy patients (c-statistic 0.989) and validated against PACNS. Retrospective, single-center derivation; RCVS cases were aged 18–55, and the score should not be extrapolated outside that range or to chronic arteriopathies.',
      references: [
        {
          title: 'RCVS₂ score and diagnostic approach for reversible cerebral vasoconstriction syndrome',
          citation: 'Rocha EA, Topcuoglu MA, Silva GS, Singhal AB. Neurology. 2019;92(7):e639-e647',
          year: 2019,
          pmid: '30635475',
          doi: '10.1212/WNL.0000000000006917',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Score ≥5',
        actions: ['Treat as RCVS: remove triggers, avoid steroids/triptans, manage thunderclap headache', 'Confirm reversibility on follow-up vascular imaging'],
      },
      {
        condition: 'Score 3–4',
        actions: ['Apply bedside criteria (recurrent TCH, trigger + normal parenchyma, convexity SAH)', 'Serial CTA/MRA; CSF and vessel-wall imaging if suspicion persists'],
      },
      {
        condition: 'Score ≤2',
        actions: ['Pursue alternative arteriopathy workup (PACNS, atherosclerosis, dissection, infection)', 'Do not label as RCVS without later evidence of reversibility'],
      },
    ],
    pearls: [
      'Recurrent thunderclap headache alone is nearly pathognomonic for RCVS — ask specifically about sudden, explosive headaches.',
      'Glucocorticoids worsen RCVS outcomes; the score exists largely to prevent inappropriate PACNS treatment.',
      'Document reversibility of vasoconstriction (~12 weeks) to confirm the diagnosis retrospectively.',
      'Under-reported triggers (decongestants, cannabis, energy drinks, postpartum) are common false-negative sources.',
    ],
  },

  // ─── 4. ROSIER Scale ──────────────────────────────────────────────────────
  {
    id: 'rosier-scale',
    name: 'Recognition of Stroke in the Emergency Room (ROSIER) Scale',
    shortName: 'ROSIER',
    description:
      'Differentiates acute stroke from stroke mimics in the emergency department using history and bedside neurological signs.',
    category: 'neurology',
    tags: ['rosier', 'stroke', 'stroke mimic', 'emergency', 'seizure', 'syncope'],
    whenToUse:
      'ED assessment of a patient with suspected acute stroke (after excluding hypoglycemia) to distinguish true stroke/TIA from mimics such as seizure, syncope, sepsis, or migraine.',
    whyUse:
      'ER physicians must rapidly decide who needs emergent stroke workup. ROSIER provides a simple, validated −2 to +5 screen that improves detection of anterior-circulation stroke and reduces inappropriate stroke-team activations.',
    inputs: [
      yesNo(
        'loc',
        'Loss of consciousness or syncope',
        -1,
        'Associated loss of consciousness or syncope scores −1, favoring a mimic. Check and treat hypoglycemia FIRST — the scale is applied only after glucose is normal.',
        false
      ),
      yesNo(
        'seizure',
        'Seizure activity',
        -1,
        'Convulsive activity at onset scores −1, favoring a mimic (e.g., postictal Todd paresis).',
        false
      ),
      yesNo(
        'face',
        'Asymmetric facial weakness',
        1,
        'New, acute-onset (or on awakening from sleep) asymmetric facial weakness scores +1.',
        true
      ),
      yesNo(
        'arm',
        'Asymmetric arm weakness',
        1,
        'New, acute-onset asymmetric arm weakness scores +1.',
        true
      ),
      yesNo(
        'leg',
        'Asymmetric leg weakness',
        1,
        'New, acute-onset asymmetric leg weakness scores +1.',
        false
      ),
      yesNo(
        'speech',
        'Speech disturbance',
        1,
        'New dysarthria or dysphasia scores +1.',
        true
      ),
      yesNo(
        'visual',
        'Visual field defect',
        1,
        'New visual field defect (e.g., homonymous hemianopia) scores +1.',
        false
      ),
    ],
    calculate(values) {
      const score =
        (bool(values.loc) ? -1 : 0) +
        (bool(values.seizure) ? -1 : 0) +
        (bool(values.face) ? 1 : 0) +
        (bool(values.arm) ? 1 : 0) +
        (bool(values.leg) ? 1 : 0) +
        (bool(values.speech) ? 1 : 0) +
        (bool(values.visual) ? 1 : 0);
      const likely = score > 0;
      return {
        score,
        unit: 'points (−2 to +5)',
        label: likely ? 'Stroke likely (>0)' : 'Stroke unlikely (≤0)',
        interpretation: likely
          ? `ROSIER ${score}: consistent with acute stroke (derivation sensitivity ~92–93%, specificity ~83–86% at cut-off >0). Activate the stroke pathway — emergent neuroimaging and reperfusion assessment.`
          : `ROSIER ${score}: stroke unlikely but NOT excluded (sensitivity is not 100%). If clinical suspicion persists — especially posterior-circulation symptoms (vertigo, diplopia, ataxia), which the scale detects poorly — continue stroke evaluation or obtain neurology input.`,
        riskLevel: likely ? 'high' : 'low',
        details: [
          { label: 'Mimic items (LOC/syncope, seizure)', value: `${(bool(values.loc) ? -1 : 0) + (bool(values.seizure) ? -1 : 0)}` },
          { label: 'Deficit items (face/arm/leg/speech/visual)', value: `${(bool(values.face) ? 1 : 0) + (bool(values.arm) ? 1 : 0) + (bool(values.leg) ? 1 : 0) + (bool(values.speech) ? 1 : 0) + (bool(values.visual) ? 1 : 0)}` },
          { label: 'Cut-off', value: '>0 suggests stroke' },
        ],
        recommendations: likely
          ? [
              'STAT non-contrast head CT and CT angiography',
              'Stroke team/neurology activation; establish last-known-well time',
              'Assess thrombolysis and thrombectomy eligibility urgently',
            ]
          : [
              'Exclude/treat mimics: hypoglycemia, postictal state, migraine, sepsis, functional deficit',
              'If posterior-circulation signs predominate, do not be reassured — ROSIER under-detects them',
              'Reassess serially; evolving deficits can change the score',
            ],
      };
    },
    evidence: {
      summary:
        'ROSIER (Nor et al., Lancet Neurol 2005): loss of consciousness/syncope −1, seizure activity −1, and +1 each for new asymmetric facial, arm, or leg weakness, speech disturbance, or visual field defect (range −2 to +5). Total >0 suggests stroke.',
      formula: 'Score = −1(LOC/syncope) −1(seizure) +1 each(face, arm, leg, speech, visual field).',
      validation:
        'Developed in 343 suspected-stroke ER referrals and prospectively validated over 9 months: sensitivity ~92–93%, specificity ~83–86%, PPV ~88–90%, NPV ~91% at cut-off >0. Independent validations confirm good performance for anterior-circulation stroke but lower sensitivity for posterior strokes and in hyperacute settings.',
      references: [
        {
          title: 'The Recognition of Stroke in the Emergency Room (ROSIER) scale: development and validation of a stroke recognition instrument',
          citation: 'Nor AM, Davis J, Sen B, et al. Lancet Neurol. 2005;4(11):727-734',
          year: 2005,
          pmid: '16239179',
          doi: '10.1016/S1474-4422(05)70201-5',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'ROSIER >0',
        actions: ['Activate stroke pathway', 'Emergent CT/CTA', 'Determine tPA/thrombectomy eligibility'],
      },
      {
        condition: 'ROSIER ≤0 but suspicion persists',
        actions: ['Neurology consult', 'MRI if available for posterior/small infarcts', 'Work up mimic diagnoses'],
      },
    ],
    pearls: [
      'Always check fingerstick glucose before scoring — hypoglycemia is the most common correctable stroke mimic.',
      'Deficit items must be NEW with acute onset (including wake-up strokes); old findings do not score.',
      'ROSIER performs best for anterior-circulation stroke; isolated vertigo, diplopia, or ataxia may score 0 despite true stroke.',
      'A screening tool only — it does not replace imaging or clinical judgment.',
    ],
  },

  // ─── 5. CP-SSS ────────────────────────────────────────────────────────────
  {
    id: 'cp-sss',
    name: 'Cincinnati Prehospital Stroke Severity Scale (CP-SSS)',
    shortName: 'CP-SSS',
    description:
      'Predicts severe stroke (NIHSS ≥15) and large-vessel occlusion from four bedside items derived from the NIHSS.',
    category: 'neurology',
    tags: ['cpsss', 'cp-sss', 'lvo', 'stroke severity', 'prehospital', 'ems', 'thrombectomy'],
    whenToUse:
      'Field or ED triage of a patient with stroke symptoms to flag probable severe stroke / large-vessel occlusion and guide transport to a thrombectomy-capable center.',
    whyUse:
      'LVO strokes benefit from direct routing to endovascular-capable centers. CP-SSS uses only gaze, two level-of-consciousness checks, and arm strength — objective items EMS can perform quickly.',
    inputs: [
      selectInput(
        'gaze',
        'Conjugate gaze deviation',
        [
          { label: 'No', value: 'no', points: 0 },
          { label: 'Yes', value: 'yes', points: 2 },
        ],
        'no',
        'Forced conjugate gaze deviation to one side (NIHSS gaze item ≥1) scores +2 — a cortical sign strongly associated with LVO.',
        true
      ),
      selectInput(
        'locQuestions',
        'Ask patient age and current month',
        [
          { label: 'Both correct', value: 'both', points: 0 },
          { label: 'One correct', value: 'one' },
          { label: 'Neither correct', value: 'neither' },
        ],
        'both',
        'Level-of-consciousness questions: any wrong answer (one or both) counts toward a single abnormal-LOC point together with the commands item.'
      ),
      selectInput(
        'locCommands',
        'Ask patient to close eyes and open/close hand',
        [
          { label: 'Follows both commands', value: 'both', points: 0 },
          { label: 'Follows one command', value: 'one' },
          { label: 'Follows neither command', value: 'neither' },
        ],
        'both',
        'Level-of-consciousness commands: failing one or both commands counts toward the same single abnormal-LOC point (LOC questions + commands contribute 1 point total).'
      ),
      selectInput(
        'arm',
        'Hold arm up for 10 seconds',
        [
          { label: 'Can do', value: 'can', points: 0 },
          { label: 'Cannot do', value: 'cannot', points: 1 },
        ],
        'can',
        'Arm weakness: inability to hold either arm up for 10 seconds (NIHSS motor arm ≥2) scores +1.'
      ),
    ],
    calculate(values) {
      const gazePts = str(values.gaze, 'no') === 'yes' ? 2 : 0;
      const locAbnormal =
        str(values.locQuestions, 'both') !== 'both' || str(values.locCommands, 'both') !== 'both';
      const locPts = locAbnormal ? 1 : 0;
      const armPts = str(values.arm, 'can') === 'cannot' ? 1 : 0;
      const score = gazePts + locPts + armPts;
      const severe = score >= 2;
      return {
        score,
        unit: 'points (0–4)',
        label: severe ? 'Severe stroke / LVO likely (≥2)' : 'Lower likelihood of LVO (<2)',
        interpretation: severe
          ? `CP-SSS ${score}: predicts NIHSS ≥15 (~90% sensitive, ~50–73% specific) and large-vessel occlusion (~83% sensitive). Transport/route to a thrombectomy-capable stroke center when feasible and activate the stroke team early.`
          : `CP-SSS ${score}: below the ≥2 threshold associated with severe stroke and LVO. Does not exclude stroke or smaller occlusions — continue standard stroke evaluation and imaging.`,
        riskLevel: severe ? 'high' : 'low',
        details: [
          { label: 'Gaze deviation', value: `+${gazePts}` },
          { label: 'Abnormal LOC questions/commands', value: `+${locPts}` },
          { label: 'Arm weakness', value: `+${armPts}` },
          { label: 'Cut-off', value: '≥2 predicts NIHSS ≥15 and LVO' },
        ],
        recommendations: severe
          ? [
              'Preferential transport to an endovascular-capable center where systems support it',
              'STAT non-contrast CT + CT angiography on arrival',
              'Early stroke-team notification (prehospital alert)',
            ]
          : [
              'Standard stroke protocol — do not bypass closer appropriate facilities solely on this score',
              'Reassess en route/on arrival; deficits can evolve',
            ],
      };
    },
    evidence: {
      summary:
        'CP-SSS (Katz et al., Stroke 2015): conjugate gaze deviation +2, abnormal level-of-consciousness questions and/or commands +1 (combined), arm weakness (cannot hold arm up 10 s) +1 (range 0–4). Score ≥2 predicts NIHSS ≥15 (derivation: 89% sens/73% spec; validation AUC 0.83: 92% sens/51% spec) and LVO (83% sens/40% spec).',
      formula: 'Score = 2(gaze) + 1(any abnormal LOC question or command) + 1(arm weakness).',
      validation:
        'Derived on NINDS t-PA trial data and validated on IMS III; external validation in 664 AIS patients (Kummer et al.) showed AUC 0.85 for LVO and 0.94 for NIHSS ≥15 at the ≥2 cut-point. Modest specificity for LVO is a known limitation of all prehospital LVO scales.',
      references: [
        {
          title: 'Design and Validation of a Prehospital Scale to Predict Stroke Severity: Cincinnati Prehospital Stroke Severity Scale',
          citation: 'Katz BS, McMullan JT, Sucharew H, Adeoye O, Broderick JP. Stroke. 2015;46(6):1508-1512',
          year: 2015,
          pmid: '25899242',
          doi: '10.1161/STROKEAHA.115.008804',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'CP-SSS ≥2',
        actions: ['Route to comprehensive/thrombectomy-capable stroke center', 'Prehospital notification for stroke-team activation', 'CT/CTA on arrival'],
      },
      {
        condition: 'CP-SSS <2 with ongoing suspicion',
        actions: ['Standard stroke pathway and imaging', 'Serial re-examination'],
      },
    ],
    pearls: [
      'Gaze deviation is the single most predictive item — check for forced eye deviation toward the lesion.',
      'The LOC items contribute only 1 point combined: any error on age/month questions OR failed close-eyes/open-close-hand commands.',
      'Distinct from the original 3-item Cincinnati Prehospital Stroke Scale (face, arm, speech); CP-SSS adds cortical signs for LVO detection.',
    ],
  },

  // ─── 6. mSOAR ─────────────────────────────────────────────────────────────
  {
    id: 'msoar-score',
    name: 'Modified SOAR Score for Stroke (mSOAR)',
    shortName: 'mSOAR',
    description:
      'Predicts early (in-hospital/90-day) mortality after acute stroke from subtype, OCSP classification, age, prestroke disability, and NIHSS.',
    category: 'neurology',
    tags: ['msoar', 'soar', 'stroke', 'mortality', 'prognosis', 'ocsp', 'nihss'],
    whenToUse:
      'On admission for acute ischemic stroke or intracerebral hemorrhage, to estimate early mortality risk for prognostic discussions. Do NOT use for TIA, subarachnoid hemorrhage, or subdural hemorrhage.',
    whyUse:
      'Simple, routinely collected admission variables give a calibrated short-term mortality estimate (range ~3–42%), outperforming the original SOAR by adding stroke severity (NIHSS). Supports goals-of-care discussions and case-mix adjustment.',
    inputs: [
      selectInput(
        'strokeType',
        'Stroke type',
        [
          { label: 'Infarct (ischemic)', value: 'infarct', points: 0 },
          { label: 'Hemorrhage (intracerebral)', value: 'hemorrhage', points: 1 },
        ],
        'infarct',
        'Intracerebral hemorrhage scores +1. SAH and subdural hemorrhage are outside the model.'
      ),
      selectInput(
        'ocsp',
        'Oxfordshire Community Stroke Project (OCSP) class',
        [
          { label: 'LACS or PACS (lacunar / partial anterior circulation)', value: 'lacs_pacs', points: 0 },
          { label: 'POCS (posterior circulation)', value: 'pocs', points: 1 },
          { label: 'TACS (total anterior circulation)', value: 'tacs', points: 2 },
        ],
        'lacs_pacs',
        'Clinical syndrome classification: TACS (hemiparesis + hemianopia + higher cortical deficit) scores +2, POCS +1, LACS/PACS 0.'
      ),
      selectInput(
        'ageBand',
        'Age',
        [
          { label: '≤65 years', value: 'le65', points: 0 },
          { label: '66–85 years', value: '66_85', points: 1 },
          { label: '>85 years', value: 'gt85', points: 2 },
        ],
        '66_85',
        'Age band: ≤65 = 0, 66–85 = +1, >85 = +2.'
      ),
      selectInput(
        'premrs',
        'Pre-stroke disability (modified Rankin Scale)',
        [
          { label: 'mRS 0–2 (independent)', value: 'm0_2', points: 0 },
          { label: 'mRS 3–4', value: 'm3_4', points: 1 },
          { label: 'mRS 5 (bedbound, fully dependent)', value: 'm5', points: 2 },
        ],
        'm0_2',
        'Functional status BEFORE this stroke: mRS 0–2 = 0, 3–4 = +1, 5 = +2.'
      ),
      selectInput(
        'nihss',
        'NIHSS on admission',
        [
          { label: '0–4', value: 'n0_4', points: 0 },
          { label: '5–10', value: 'n5_10', points: 1 },
          { label: '≥11', value: 'n11', points: 2 },
        ],
        'n0_4',
        'Baseline NIH Stroke Scale: 0–4 = 0, 5–10 = +1, ≥11 = +2.'
      ),
    ],
    calculate(values) {
      const pts = (v: number | string | boolean | null, map: Record<string, number>) => map[str(v, '')] ?? 0;
      const typePts = pts(values.strokeType, { infarct: 0, hemorrhage: 1 });
      const ocspPts = pts(values.ocsp, { lacs_pacs: 0, pocs: 1, tacs: 2 });
      const agePts = pts(values.ageBand, { le65: 0, '66_85': 1, gt85: 2 });
      const mrsPts = pts(values.premrs, { m0_2: 0, m3_4: 1, m5: 2 });
      const nihssPts = pts(values.nihss, { n0_4: 0, n5_10: 1, n11: 2 });
      const score = typePts + ocspPts + agePts + mrsPts + nihssPts;
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
      let label = '';
      if (score >= 7) {
        riskLevel = 'critical';
        label = 'Very high early-mortality risk';
      } else if (score >= 5) {
        riskLevel = 'high';
        label = 'High early-mortality risk';
      } else if (score >= 3) {
        riskLevel = 'moderate';
        label = 'Intermediate early-mortality risk';
      } else {
        riskLevel = 'low';
        label = 'Lower early-mortality risk';
      }
      return {
        score,
        unit: 'points (0–9)',
        label,
        interpretation: `mSOAR ${score}/9. In derivation and external validation, predicted early mortality rose monotonically from ~3% (lowest scores) to ~42% (highest); AUROC ~0.83–0.84 for in-hospital/90-day mortality. Use for prognosis and case-mix — never as a sole basis for treatment limitation.`,
        riskLevel,
        details: [
          { label: 'Stroke type', value: `+${typePts}` },
          { label: 'OCSP class', value: `+${ocspPts}` },
          { label: 'Age band', value: `+${agePts}` },
          { label: 'Pre-stroke mRS', value: `+${mrsPts}` },
          { label: 'NIHSS band', value: `+${nihssPts}` },
        ],
        recommendations: [
          'Use the estimate to frame, not dictate, goals-of-care conversations',
          'Acute reperfusion decisions remain driven by eligibility criteria, not prognostic scores',
          'For confirmed ICH: manage BP, review anticoagulant/antiplatelet use, neurosurgical consult as appropriate',
        ],
      };
    },
    evidence: {
      summary:
        'mSOAR (Abdul-Rahim et al., Stroke 2016) adds NIHSS to the original SOAR (stroke Subtype, OCSP class, Age, prestroke mRS): ICH +1; POCS +1/TACS +2; age 66–85 +1/>85 +2; prestroke mRS 3–4 +1/5 +2; NIHSS 5–10 +1/≥11 +2 (range 0–9). Predicted early mortality spanned ~3–42%.',
      formula: 'Score = subtype + OCSP + age + prestroke mRS + NIHSS bands.',
      validation:
        'Derived in 1002 Anglia Stroke & Heart Network patients (AUROC 0.83 vs 0.79 for SOAR) and externally validated in 1012 Glasgow patients (AUROC 0.84, good calibration); also validated in 11,073 Chinese registry patients (AUC ~0.78–0.79). A population-level prognostic tool — not a treatment-threshold instrument.',
      references: [
        {
          title: 'Derivation and Validation of a Novel Prognostic Scale (Modified-SOAR) to Predict Early Mortality in Acute Stroke',
          citation: 'Abdul-Rahim AH, Quinn TJ, Alder S, et al. Stroke. 2016;47(1):74-79',
          year: 2016,
          pmid: '26578661',
          doi: '10.1161/STROKEAHA.115.009898',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'High mSOAR with ICH',
        actions: ['Reverse anticoagulation as indicated', 'BP management', 'Neurosurgical evaluation', 'Early goals-of-care discussion'],
      },
      {
        condition: 'High mSOAR with ischemic stroke',
        actions: ['Assess dysphagia/aspiration risk', 'Early palliative-care input if appropriate', 'Document ceiling-of-care wishes'],
      },
    ],
    pearls: [
      'Both ischemic stroke and ICH are scored; hemorrhage adds a point but hemorrhagic conversion of infarct is not the model target.',
      'OCSP is a clinical syndrome classification — TACS requires hemiparesis + sensory loss + hemianopia + new higher-cortical dysfunction.',
      'Pre-stroke mRS refers to baseline disability before the index event, not post-stroke status.',
    ],
  },

  // ─── 7. ASCOD ─────────────────────────────────────────────────────────────
  {
    id: 'ascod-phenotype',
    name: 'ASCOD Algorithm for Ischemic Stroke',
    shortName: 'ASCOD',
    description:
      'Assigns a causality grade (1 potentially causal, 2 uncertain, 3 unlikely, 0 absent, 9 insufficient workup) to each of five ischemic-stroke phenotypes: Atherosclerosis, Small-vessel disease, Cardiac pathology, Other causes, Dissection.',
    category: 'neurology',
    tags: ['ascod', 'asco', 'stroke classification', 'phenotype', 'etiologic workup', 'toast'],
    whenToUse:
      'After diagnostic evaluation of an ischemic stroke, to phenotype all underlying diseases simultaneously rather than forcing a single TOAST-style category.',
    whyUse:
      'ASCOD captures overlapping mechanisms (e.g., atherosclerosis + AF) and assigns each a likelihood grade, exposing both causal mechanisms to treat and gaps in workup (grade 9) that need completion.',
    inputs: [
      selectInput(
        'gradeA',
        'A — Atherothrombosis grade',
        [
          { label: 'A1 — Potentially causal', value: '1', description: 'Ipsilateral atherosclerotic stenosis 50–99% or occlusion with underlying plaque in an intra/extracranial artery supplying the ischemic field; ipsilateral stenosis <50% with endoluminal thrombus; or mobile aortic-arch thrombus.' },
          { label: 'A2 — Causality uncertain', value: '2', description: 'Ipsilateral atherosclerotic stenosis <50% (e.g., 30–50%) without thrombus in an artery supplying the field, or aortic-arch plaque ≥4 mm without a mobile component.' },
          { label: 'A3 — Unlikely causal', value: '3', description: 'Atherosclerosis present but unlikely causal: plaque without significant stenosis ipsilaterally, plaque/stenosis of any degree in arteries NOT supplying the field, aortic plaque <4 mm, or known coronary/peripheral artery disease.' },
          { label: 'A0 — No atherosclerosis detected', value: '0' },
          { label: 'A9 — Insufficient workup', value: '9', description: 'Minimum workup is extra- AND intracranial arterial assessment (duplex/TCD, CTA, MRA, or conventional angiography); maximum adds transesophageal or CTA evaluation of the aortic arch.' },
        ],
        '1',
        'Grade the causal likelihood of atherosclerosis for THIS infarct after vessel imaging.'
      ),
      selectInput(
        'gradeS',
        'S — Small-vessel disease grade',
        [
          { label: 'S1 — Potentially causal', value: '1', description: 'Acute small deep (lacunar) infarct in a single penetrating-artery territory with a compatible lacunar syndrome, attributable to small-vessel disease.' },
          { label: 'S2 — Causality uncertain', value: '2', description: 'Lacunar syndrome or imaging SVD burden (lacunes, leukoaraiosis, microbleeds) where the causal link to the index stroke is uncertain.' },
          { label: 'S3 — Unlikely causal', value: '3', description: 'SVD markers present (e.g., leukoaraiosis, old silent lacunes, microbleeds) but unlikely related to the index stroke.' },
          { label: 'S0 — No small-vessel disease detected', value: '0' },
          { label: 'S9 — Insufficient workup', value: '9', description: 'Brain MRI or CT not performed.' },
        ],
        '3',
        'Grade small-vessel disease after brain imaging.'
      ),
      selectInput(
        'gradeC',
        'C — Cardiac pathology grade',
        [
          { label: 'C1 — Potentially causal', value: '1', description: 'Major-risk source: atrial fibrillation/flutter, intracardiac thrombus, prosthetic valve, mitral stenosis, recent MI, LVEF <30%, endocarditis, cardiac tumor — or an imaging pattern typical of cardiogenic embolism.' },
          { label: 'C2 — Causality uncertain', value: '2', description: 'Minor-risk or unproven sources: PFO, atrial septal aneurysm, spontaneous echo contrast, mitral annular calcification, hypokinetic segments, etc.' },
          { label: 'C3 — Unlikely causal', value: '3', description: 'Cardiac abnormality present but unlikely related (e.g., remote MI without thrombus, mild valve disease).' },
          { label: 'C0 — No cardiac disease detected', value: '0' },
          { label: 'C9 — Insufficient workup', value: '9', description: 'Minimum is EKG plus examination by a trained cardiologist in the absence of cardiac imaging; Holter/echo extend the workup.' },
        ],
        '0',
        'Grade cardiac sources after EKG and cardiac evaluation.'
      ),
      selectInput(
        'gradeO',
        'O — Other causes grade',
        [
          { label: 'O1 — Potentially causal', value: '1', description: 'A determined uncommon cause judged causal: e.g., arteritis/vasculitis, moyamoya, antiphospholipid syndrome, sickle-cell disease, hypercoagulable state, migraine-related infarction.' },
          { label: 'O2 — Causality uncertain', value: '2', description: 'A possible uncommon cause whose link to the stroke is uncertain.' },
          { label: 'O3 — Unlikely causal', value: '3', description: 'Another condition detected but unlikely causal.' },
          { label: 'O0 — No other cause detected', value: '0' },
          { label: 'O9 — Insufficient workup', value: '9', description: 'Other causes cannot be reasonably excluded with the available tests and stroke-specific history.' },
        ],
        '0',
        'Grade uncommon causes (vasculitis, hypercoagulable states, moyamoya, etc.).'
      ),
      selectInput(
        'gradeD',
        'D — Dissection grade',
        [
          { label: 'D1 — Potentially causal', value: '1', description: 'Cervicocephalic arterial dissection demonstrated on imaging (fat-saturated MRI, CTA, MRA, or angiography) in an artery supplying the ischemic field.' },
          { label: 'D2 — Causality uncertain', value: '2', description: 'Suspected but unconfirmed dissection.' },
          { label: 'D3 — Unlikely causal', value: '3', description: 'Imaging abnormality suggesting dissection is present but judged unlikely causal.' },
          { label: 'D0 — Dissection excluded by adequate imaging', value: '0' },
          { label: 'D9 — Insufficient workup', value: '9', description: 'In patients <60 y without an A1/A2/S1/C1/O1 cause: no fat-saturated MRI of the supplying extra/intracranial artery and no x-ray angiography performed within 15 days of onset.' },
        ],
        '0',
        'Grade arterial dissection — essential in younger strokes and those without another grade-1 cause.'
      ),
    ],
    calculate(values) {
      const g = {
        A: str(values.gradeA, '9'),
        S: str(values.gradeS, '9'),
        C: str(values.gradeC, '9'),
        O: str(values.gradeO, '9'),
        D: str(values.gradeD, '9'),
      };
      const phenotype = `A${g.A}-S${g.S}-C${g.C}-O${g.O}-D${g.D}`;
      const names: Record<string, string> = {
        A: 'atherothrombosis',
        S: 'small-vessel disease',
        C: 'cardiac pathology',
        O: 'other cause',
        D: 'dissection',
      };
      const causal = (Object.keys(g) as (keyof typeof g)[]).filter((k) => g[k] === '1').map((k) => names[k]);
      const uncertain = (Object.keys(g) as (keyof typeof g)[]).filter((k) => g[k] === '2').map((k) => names[k]);
      const incomplete = (Object.keys(g) as (keyof typeof g)[]).filter((k) => g[k] === '9').map((k) => names[k]);
      const interpretationParts: string[] = [];
      if (causal.length) interpretationParts.push(`Potentially causal: ${causal.join(', ')}.`);
      if (uncertain.length) interpretationParts.push(`Uncertain causality: ${uncertain.join(', ')}.`);
      if (incomplete.length) interpretationParts.push(`Insufficient workup to grade: ${incomplete.join(', ')} — complete the minimum diagnostic evaluation for these domains.`);
      if (!causal.length && !incomplete.length)
        interpretationParts.push('No grade-1 mechanism; disease present is at most uncertain or unlikely causal — reconsider whether the workup is truly complete.');
      return {
        score: phenotype,
        unit: 'phenotype',
        label: causal.length ? `Causal mechanism(s): ${causal.join(', ')}` : 'No grade-1 causal mechanism',
        interpretation: `ASCOD ${phenotype}. ${interpretationParts.join(' ')}`,
        riskLevel: causal.length ? 'info' : incomplete.length ? 'moderate' : 'info',
        details: (Object.keys(g) as (keyof typeof g)[]).map((k) => ({
          label: `${k} — ${names[k]}`,
          value:
            g[k] === '1'
              ? 'Potentially causal'
              : g[k] === '2'
                ? 'Causality uncertain'
                : g[k] === '3'
                  ? 'Unlikely causal'
                  : g[k] === '0'
                    ? 'Absent'
                    : 'Insufficient workup',
        })),
        recommendations: [
          'Treat every grade-1 (and consider grade-2) mechanism per secondary-prevention guidelines — overlaps are common and all count',
          'Complete the minimum workup for any grade-9 domain before calling the stroke cryptogenic',
          'Recheck D in patients <60 y without another grade-1 cause — dissection workup must be timely (within ~15 days)',
        ],
      };
    },
    evidence: {
      summary:
        'ASCOD (Amarenco et al., Cerebrovasc Dis 2013, update of ASCO 2009) grades each of Atherosclerosis, Small-vessel disease, Cardiac pathology, Other causes, and Dissection as 1 = potentially causal, 2 = uncertain, 3 = unlikely causal (disease present), 0 = absent, 9 = insufficient workup. It replaced the 70% stenosis cutoff with 50% and added the dissection domain and a cardiogenic imaging pattern.',
      formula: 'Phenotype string A#-S#-C#-O#-D# summarizing graded mechanisms.',
      validation:
        'Grade definitions verified against the 2013 ASCOD paper and subsequent applications (e.g., the TIA/minor-stroke ASCOD cohort describing A1/A2/A3 criteria). ASCOD captures disease overlap: in one cohort ~25% had multiple grade 1–2 diseases and 80% had multiple grade 1–3 diseases; C grades tracked with 3-year vascular risk.',
      references: [
        {
          title: 'The ASCOD Phenotyping of Ischemic Stroke (Updated ASCO Phenotyping)',
          citation: 'Amarenco P, Bogousslavsky J, Caplan LR, Donnan GA, Wolf ME, Hennerici MG. Cerebrovasc Dis. 2013;36(1):1-5',
          year: 2013,
          pmid: '23899749',
          doi: '10.1159/000352050',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Any domain graded 9',
        actions: ['Complete minimum workup: brain imaging (S), extra+intracranial vessel imaging (A), EKG + cardiac assessment (C), targeted history/tests (O), vessel-wall or angiographic imaging (D)'],
      },
      {
        condition: 'A1 or A2',
        actions: ['Antiplatelet + high-intensity statin; carotid revascularization for symptomatic severe ipsilateral stenosis'],
      },
      {
        condition: 'C1',
        actions: ['Anticoagulation where indicated (e.g., AF); manage the specific cardiac lesion'],
      },
      {
        condition: 'D1',
        actions: ['Antithrombotic therapy per dissection guidance; avoid neck trauma; imaging follow-up'],
      },
    ],
    pearls: [
      'ASCOD deliberately allows multiple grade-1 causes — do not force a single mechanism when diseases overlap.',
      'Grade 9 is a workup flag, not a diagnosis: an "incomplete workup" stroke is not the same as cryptogenic.',
      'For young patients, assign D only after adequate arterial imaging; otherwise leave D9.',
      'Unlike TOAST, ASCOD preserves information about every coexisting condition — useful for both treatment and research stratification.',
    ],
  },

  // ─── 8. Fisher Grading Scale (original) ──────────────────────────────────
  {
    id: 'fisher-sah-original',
    name: 'Fisher Grading Scale for Subarachnoid Hemorrhage (Original 1980)',
    shortName: 'Fisher (original)',
    description:
      'Original Fisher CT grading (grades 1–4) of aneurysmal SAH by amount and distribution of subarachnoid blood, correlated with delayed cerebral vasospasm risk.',
    category: 'neurology',
    tags: ['fisher', 'sah', 'subarachnoid', 'vasospasm', 'aneurysm', 'ct grading'],
    status: 'legacy',
    supersededBy: 'fisher-grade',
    whenToUse:
      'Grading the admission non-contrast head CT of a patient with aneurysmal subarachnoid hemorrhage to estimate risk of delayed cerebral vasospasm. The Modified Fisher scale is preferred in modern practice.',
    whyUse:
      'The original 1980 Fisher scale established that localized thick subarachnoid blood predicts symptomatic vasospasm (23/24 grade-3 patients vs 1/18 with thin or absent blood). It remains widely quoted, though the Modified Fisher scale refined grade 4.',
    inputs: [
      selectInput(
        'ctPattern',
        'CT appearance of subarachnoid blood',
        [
          { label: 'Grade 1 — No SAH detected on CT', value: '1' },
          { label: 'Grade 2 — Diffuse deposition or vertical layers of subarachnoid blood <1 mm thick', value: '2' },
          { label: 'Grade 3 — Localized clot and/or vertical layer of subarachnoid blood ≥1 mm thick', value: '3' },
          { label: 'Grade 4 — Intracerebral or intraventricular hemorrhage with diffuse or no subarachnoid blood', value: '4' },
        ],
        '2',
        'Classify the worst pattern on the admission non-contrast CT. Vertical layers = blood in fissures and vertical cisterns; thickness ≥1 mm (or clot >5 × 3 mm) defines grade 3.',
        true
      ),
    ],
    calculate(values) {
      const grade = str(values.ctPattern, '1');
      const map: Record<string, { riskLevel: 'low' | 'moderate' | 'high'; label: string; interp: string }> = {
        '1': {
          riskLevel: 'low',
          label: 'Fisher grade 1 — no SAH on CT',
          interp:
            'No subarachnoid blood visible. In the original series, severe vasospasm was almost never seen without thick blood — but a CT-negative clinical SAH still warrants full aneurysm workup (LP/xanthochromia, CTA or DSA).',
        },
        '2': {
          riskLevel: 'moderate',
          label: 'Fisher grade 2 — thin diffuse SAH (<1 mm)',
          interp:
            'Diffuse or thin (<1 mm) subarachnoid blood. Severe vasospasm was rare in the original cohort (1 of 18 cases with absent/thin blood). Vasospasm risk is low but not zero — standard monitoring still applies.',
        },
        '3': {
          riskLevel: 'high',
          label: 'Fisher grade 3 — thick localized SAH (≥1 mm)',
          interp:
            'Localized clot or vertical layer ≥1 mm thick: the highest-risk grade in the original series — severe vasospasm followed in 23 of 24 patients. Institute maximal vasospasm surveillance (serial exams/TCDs), nimodipine, and euvolemia.',
        },
        '4': {
          riskLevel: 'moderate',
          label: 'Fisher grade 4 — ICH/IVH with diffuse or no SAH',
          interp:
            'Intracerebral or intraventricular hemorrhage with diffuse or absent subarachnoid blood. Original Fisher assigned lower vasospasm risk than grade 3, but later data (Modified Fisher) showed IVH/ICH with thick SAH carries HIGH symptomatic-vasospasm risk — interpret in that context.',
        },
      };
      const m = map[grade] ?? map['1'];
      return {
        score: `Grade ${grade}`,
        unit: 'of 4',
        label: m.label,
        interpretation: m.interp,
        riskLevel: m.riskLevel,
        details: [
          { label: 'Original cohort vasospasm correlation', value: grade === '3' ? 'Severe vasospasm in 23/24 patients' : 'Severe vasospasm in 1/18 (thin or absent blood)' },
          { label: 'Note', value: 'Original 1980 scale; Modified Fisher is preferred today' },
        ],
        recommendations: [
          'Neurosurgical consultation for all confirmed aSAH',
          'CTA (or DSA) to identify the aneurysm and plan securing (clip vs coil)',
          'Nimodipine and vasospasm surveillance for grades 3 (and per Modified Fisher, thick SAH + IVH)',
          'Acute hydrocephalus or IVH burden may need ventricular drainage',
        ],
      };
    },
    evidence: {
      summary:
        'Original Fisher scale (Fisher, Kistler, Davis; Neurosurgery 1980): grade 1 = no SAH; grade 2 = diffuse or vertical-layer blood <1 mm; grade 3 = localized clot and/or vertical layer ≥1 mm; grade 4 = ICH or IVH with diffuse or no SAH. In 47 ruptured-aneurysm cases, severe vasospasm followed thick localized blood in 23/24 patients vs 1/18 with thin/absent blood.',
      formula: 'Single CT-pattern item selects grade 1–4.',
      validation:
        'Confirmed against the primary Neurosurgery 1980 article (and its PubMed record). The authors themselves called the partly subjective grading preliminary; subsequent studies (Modified Fisher, Frontera 2006) showed grade-4-type hemorrhage with thick SAH actually carries high vasospasm risk, which is why the modified scale is now recommended.',
      references: [
        {
          title: 'Relation of cerebral vasospasm to subarachnoid hemorrhage visualized by computerized tomographic scanning',
          citation: 'Fisher CM, Kistler JP, Davis JM. Neurosurgery. 1980;6(1):1-9',
          year: 1980,
          pmid: '7354892',
          doi: '10.1227/00006123-198001000-00001',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Any grade',
        actions: ['Neurosurgical/neurointerventional consult', 'Aneurysm imaging (CTA → DSA if needed)', 'Nimodipine; BP and volume management'],
      },
      {
        condition: 'Grade 3 (or thick SAH + IVH)',
        actions: ['Maximal vasospasm surveillance (TCDs, clinical exams)', 'Consider earlier DSA if decline', 'Watch for delayed cerebral ischemia days 4–14'],
      },
    ],
    pearls: [
      'Grade 3 — not grade 4 — carried the highest vasospasm risk in the original scale; the Modified Fisher scale corrects the IVH/ICH group.',
      'Thickness is measured on the CT slice, not estimated clinically: ≥1 mm vertical layer or clot >5 × 3 mm = grade 3.',
      'CT-negative "grade 1" does not exclude SAH — proceed to lumbar puncture when the story fits.',
      'This entry is the ORIGINAL 1980 scale; use the Modified Fisher tool for current prognostication.',
    ],
  },

  // ─── 9. PHASES ────────────────────────────────────────────────────────────
  {
    id: 'phases-score',
    name: 'PHASES Score for Intracranial Aneurysm Rupture',
    shortName: 'PHASES',
    description:
      'Estimates the absolute 5-year risk of rupture of an unruptured intracranial aneurysm from Population, Hypertension, Age, Size, Earlier SAH, and Site.',
    category: 'neurology',
    tags: ['phases', 'aneurysm', 'unruptured aneurysm', 'sah', 'rupture risk'],
    whenToUse:
      'Counseling and management planning (conservative imaging follow-up vs surgical/endovascular repair) for a patient with an incidentally discovered, unruptured intracranial aneurysm.',
    whyUse:
      'PHASES pools six prospective cohorts (8,382 aneurysms) into a simple 6-item score that outputs an absolute 5-year rupture risk — the key number weighed against procedural risk when deciding whether to treat.',
    inputs: [
      selectInput(
        'population',
        'Population (geographic region)',
        [
          { label: 'North American or European (other than Finnish)', value: 'na_eu', points: 0 },
          { label: 'Japanese', value: 'jp', points: 3 },
          { label: 'Finnish', value: 'fi', points: 5 },
        ],
        'na_eu',
        'The pooled cohorts stratified rupture risk by population: Japanese +3, Finnish +5 relative to North American/other European.'
      ),
      yesNo('htn', 'Hypertension', 1, 'Documented hypertension (treated or untreated) adds +1.', false),
      yesNo('age70', 'Age ≥70 years', 1, 'Age 70 or older at the time of aneurysm assessment adds +1.', false),
      selectInput(
        'size',
        'Aneurysm size (maximum diameter)',
        [
          { label: '<7.0 mm', value: 'lt7', points: 0 },
          { label: '7.0–9.9 mm', value: '7_9', points: 3 },
          { label: '10.0–19.9 mm', value: '10_19', points: 6 },
          { label: '≥20.0 mm', value: 'ge20', points: 10 },
        ],
        'lt7',
        'Largest measured aneurysm diameter on angiographic imaging — the dominant risk factor.'
      ),
      yesNo('earlierSah', 'Earlier SAH from another aneurysm', 1, 'Prior subarachnoid hemorrhage from a DIFFERENT aneurysm adds +1.', false),
      selectInput(
        'site',
        'Aneurysm site',
        [
          { label: 'Internal carotid artery (ICA)', value: 'ica', points: 0 },
          { label: 'Middle cerebral artery (MCA)', value: 'mca', points: 2 },
          { label: 'ACA / posterior communicating / posterior circulation', value: 'post', points: 4 },
        ],
        'ica',
        'Anterior cerebral arteries (incl. anterior communicating), posterior communicating artery, and posterior-circulation locations carry the highest site risk (+4); MCA +2; ICA 0.'
      ),
    ],
    calculate(values) {
      const popPts = { na_eu: 0, jp: 3, fi: 5 }[str(values.population, 'na_eu')] ?? 0;
      const sizePts = { lt7: 0, '7_9': 3, '10_19': 6, ge20: 10 }[str(values.size, 'lt7')] ?? 0;
      const sitePts = { ica: 0, mca: 2, post: 4 }[str(values.site, 'ica')] ?? 0;
      const score =
        popPts + (bool(values.htn) ? 1 : 0) + (bool(values.age70) ? 1 : 0) + sizePts + (bool(values.earlierSah) ? 1 : 0) + sitePts;
      const risk = phasesRisk(score);
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
      let label = '';
      if (score >= 12) {
        riskLevel = 'critical';
        label = 'Very high rupture risk (>15%)';
      } else if (score >= 8) {
        riskLevel = 'high';
        label = 'High rupture risk';
      } else if (score >= 5) {
        riskLevel = 'moderate';
        label = 'Intermediate rupture risk';
      } else {
        riskLevel = 'low';
        label = 'Low rupture risk';
      }
      return {
        score,
        unit: `points → ~${risk}% 5-year`,
        label,
        interpretation: `PHASES ${score}: estimated absolute 5-year rupture risk ≈${risk}%${score >= 12 ? ' (all subgroups >15% pooled as very high risk)' : ''}. Weigh this against procedure-related risk, aneurysm morphology, growth, family history, and patient preference through shared decision-making.`,
        riskLevel,
        details: [
          { label: 'Estimated 5-year rupture risk', value: `~${risk}%` },
          { label: 'Population', value: `+${popPts}` },
          { label: 'Size', value: `+${sizePts}` },
          { label: 'Site', value: `+${sitePts}` },
          { label: 'Hypertension / age ≥70 / prior SAH', value: `+${(bool(values.htn) ? 1 : 0) + (bool(values.age70) ? 1 : 0) + (bool(values.earlierSah) ? 1 : 0)}` },
        ],
        recommendations: [
          'All patients: BP control, smoking cessation, education on SAH warning symptoms',
          'Lower risk: periodic CTA/MRA surveillance and follow-up',
          'Higher risk: neurosurgical/neurointerventional review for repair vs continued monitoring',
          'Aneurysm irregularity, growth on surveillance, and family history of SAH raise concern beyond the score',
        ],
      };
    },
    evidence: {
      summary:
        'PHASES (Greving et al., Lancet Neurol 2014) pooled 8,382 unruptured aneurysms from six prospective cohorts: Japanese +3/Finnish +5 population, hypertension +1, age ≥70 +1, size 7–9.9 mm +3 / 10–19.9 +6 / ≥20 +10, earlier SAH from another aneurysm +1, MCA +2 / ACA-Pcom-posterior +4. Score maps to 5-year rupture risk: ≤2 → 0.4%, 3 → 0.7%, 4 → 0.9%, 5 → 1.3%, 6 → 1.7%, 7 → 2.4%, 8 → 3.2%, 9 → 4.3%, 10 → 5.3%, 11 → 7.2%, ≥12 → 17.8%.',
      formula: 'Sum of six domain points; chart-mapped to absolute 5-year rupture risk.',
      validation:
        'Verified against the primary paper and its supplement (the underlying Cox model uses baseline 5-year survival 0.97754 with per-factor coefficients). C-statistic 0.82. The authors capped all estimates >15% as "very high risk" because small subgroups overestimate. Sex, smoking, and aneurysm multiplicity were not retained as predictors; morphology and growth are not captured.',
      references: [
        {
          title: 'Development of the PHASES score for prediction of risk of rupture of intracranial aneurysms: a pooled analysis of six prospective cohort studies',
          citation: 'Greving JP, Wermer MJH, Brown RD Jr, et al. Lancet Neurol. 2014;13(1):59-66',
          year: 2014,
          pmid: '24290159',
          doi: '10.1016/S1474-4422(13)70263-1',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'PHASES ≤4',
        actions: ['Conservative management usually reasonable', 'Surveillance CTA/MRA per local protocol', 'Aggressive risk-factor control'],
      },
      {
        condition: 'PHASES 5–11',
        actions: ['Shared decision-making with neurosurgery/neurointerventional', 'Factor morphology, growth, age, family history, and procedural risk'],
      },
      {
        condition: 'PHASES ≥12',
        actions: ['Specialist review for repair strongly suggested', 'Balance against life expectancy and procedural morbidity'],
      },
    ],
    pearls: [
      'Size dominates: ≥20 mm alone is worth 10 points — but even small aneurysms rupture, and PHASES addresses stable incidentally found lesions only.',
      'A prior SAH from ANOTHER aneurysm counts; a currently ruptured aneurysm is outside the model.',
      'ELAPSS is the complementary score for aneurysm GROWTH risk during follow-up.',
      'Population points reflect cohort geography — apply cautiously to populations not represented (e.g., other ancestries).',
    ],
  },

  // ─── 10. IMPACT ───────────────────────────────────────────────────────────
  {
    id: 'impact-tbi',
    name: 'IMPACT Score for Outcomes after Head Injury (TBI)',
    shortName: 'IMPACT',
    description:
      'Predicts 6-month mortality and unfavorable outcome (death, vegetative state, or severe disability on the Glasgow Outcome Scale) after moderate-to-severe traumatic brain injury using the published IMPACT logistic models.',
    category: 'neurology',
    tags: ['impact', 'tbi', 'head injury', 'prognosis', 'gcs', 'marshall ct'],
    isQuestionnaire: true,
    questionnaire: {
      modeInputId: 'info',
      activeInputIdsByMode: {
        core: ['age', 'motor', 'pupils'],
        extended: ['age', 'motor', 'pupils', 'hypoxia', 'hypotension', 'ctClass', 'tsah', 'edh'],
        lab: ['age', 'motor', 'pupils', 'hypoxia', 'hypotension', 'ctClass', 'tsah', 'edh', 'glucose', 'hb'],
      },
    },
    whenToUse:
      'Patients ≥14 years old with moderate or severe TBI (GCS ≤12), using data from the first 24 hours of admission. Choose the model matching available data: core (exam only), extended (exam + secondary insults + CT), or lab (extended + glucose/hemoglobin).',
    whyUse:
      'The IMPACT models were derived on 8,509 patients and externally validated in the CRASH trial (AUC ~0.80), giving calibrated population-level outcome estimates for counseling, research stratification, and benchmarking.',
    inputs: [
      selectInput(
        'info',
        'Information available',
        [
          { label: 'H&P only (core model)', value: 'core' },
          { label: 'H&P and CT (extended model)', value: 'extended' },
          { label: 'H&P, CT, and labs (lab model)', value: 'lab' },
        ],
        'extended',
        'Each model builds on the previous one: core = age + motor + pupils; extended adds hypoxia, hypotension, Marshall CT class, tSAH, EDH; lab adds glucose and hemoglobin.',
        true
      ),
      numberInput('age', 'Age', {
        unit: 'years',
        min: 14,
        max: 99,
        exampleValue: 35,
        helpText: 'Age in years; the model is validated for patients ≥14 with GCS ≤12.',
      }),
      selectInput(
        'motor',
        'GCS motor score',
        [
          { label: 'None (M1)', value: 'none' },
          { label: 'Extension — decerebrate (M2)', value: 'extension' },
          { label: 'Abnormal flexion — decorticate (M3)', value: 'abnormalFlexion' },
          { label: 'Normal flexion / withdrawal (M4)', value: 'normalFlexion' },
          { label: 'Localizes or obeys (M5–6)', value: 'localizesObeys' },
          { label: 'Untestable / missing', value: 'untestable' },
        ],
        'abnormalFlexion',
        'Best motor response on admission. "Localizes or obeys" is the reference category; sedated/untestable patients use the untestable category.',
        true
      ),
      selectInput(
        'pupils',
        'Pupillary reactivity',
        [
          { label: 'Both pupils react', value: 'both' },
          { label: 'One pupil reacts', value: 'one' },
          { label: 'Neither pupil reacts', value: 'none' },
        ],
        'both',
        'Pupillary light response — a dominant predictor; both unreactive carries the largest coefficient.',
        true
      ),
      yesNo(
        'hypoxia',
        'Hypoxia (confirmed or suspected)',
        null,
        'Documented or clinically suspected hypoxia before/at admission (e.g., SpO₂ <90%, apnea, cyanosis, aspiration).',
        false
      ),
      yesNo(
        'hypotension',
        'Hypotension (confirmed or suspected)',
        null,
        'Documented or suspected hypotension (systolic BP <90 mmHg) before/at admission — a major secondary insult.',
        false
      ),
      selectInput(
        'ctClass',
        'Marshall CT classification',
        [
          { label: 'Diffuse injury I — no visible pathology', value: 'I' },
          { label: 'Diffuse injury II — cisterns present, midline shift 0–5 mm, no lesion >25 mL', value: 'II' },
          { label: 'Diffuse injury III or IV — cisterns compressed/absent or shift >5 mm, no lesion >25 mL', value: 'III_IV' },
          { label: 'Mass lesion V or VI — evacuated or non-evacuated mass >25 mL', value: 'V_VI' },
        ],
        'II',
        'Admission head CT per Marshall classification; diffuse injury II is the reference category (classes III+IV and V+VI are pooled in the published coefficients).',
        true
      ),
      yesNo('tsah', 'Traumatic subarachnoid hemorrhage on CT', null, 'tSAH on the admission CT worsens prognosis (positive coefficient).', false),
      yesNo('edh', 'Epidural hematoma on CT', null, 'An epidural mass is a relatively FAVORABLE finding in this model (negative coefficient — surgically treatable lesion).', false),
      numberInput('glucose', 'Admission glucose', {
        unit: 'mmol/L',
        min: 3,
        max: 20,
        step: 0.1,
        exampleValue: 10,
        helpText: 'First glucose in mmol/L (mg/dL ÷ 18). Higher glucose is associated with worse outcome.',
      }),
      numberInput('hb', 'Admission hemoglobin', {
        unit: 'g/dL',
        min: 6,
        max: 17,
        step: 0.1,
        exampleValue: 11,
        helpText: 'First hemoglobin in g/dL. LOWER hemoglobin is associated with worse outcome.',
      }),
    ],
    calculate(values) {
      const model = str(values.info, 'extended');
      const idx = model === 'core' ? 0 : model === 'extended' ? 1 : 2;
      const age = num(values.age, 35);
      const motor = IMPACT_MOTOR[str(values.motor, 'localizesObeys')] ?? IMPACT_MOTOR.localizesObeys;
      const pupils = IMPACT_PUPILS[str(values.pupils, 'both')] ?? IMPACT_PUPILS.both;
      // LP components: [mortality, unfavorable]
      let lpMort = IMPACT_MODEL.intercept[idx * 2] + IMPACT_MODEL.age[idx * 2] * age + motor[idx][0] + pupils[idx][0];
      let lpUnfav = IMPACT_MODEL.intercept[idx * 2 + 1] + IMPACT_MODEL.age[idx * 2 + 1] * age + motor[idx][1] + pupils[idx][1];
      if (idx >= 1) {
        const e = idx - 1; // extended block 0, lab block 1
        const marshall = IMPACT_MARSHALL[str(values.ctClass, 'II')] ?? IMPACT_MARSHALL.II;
        const tsah = bool(values.tsah) ? 1 : 0;
        const edh = bool(values.edh) ? 1 : 0;
        const hyp = bool(values.hypoxia) ? 1 : 0;
        const htn = bool(values.hypotension) ? 1 : 0;
        lpMort += IMPACT_MODEL.tsah[e * 2] * tsah + IMPACT_MODEL.edh[e * 2] * edh + IMPACT_MODEL.hypoxia[e * 2] * hyp + IMPACT_MODEL.hypotension[e * 2] * htn + marshall[idx][0];
        lpUnfav += IMPACT_MODEL.tsah[e * 2 + 1] * tsah + IMPACT_MODEL.edh[e * 2 + 1] * edh + IMPACT_MODEL.hypoxia[e * 2 + 1] * hyp + IMPACT_MODEL.hypotension[e * 2 + 1] * htn + marshall[idx][1];
      }
      if (idx === 2) {
        const glucose = num(values.glucose, 10);
        const hb = num(values.hb, 11);
        lpMort += IMPACT_MODEL.glucose[0] * glucose + IMPACT_MODEL.hb[0] * hb;
        lpUnfav += IMPACT_MODEL.glucose[1] * glucose + IMPACT_MODEL.hb[1] * hb;
      }
      const pMort = round(100 / (1 + Math.exp(-lpMort)), 1);
      const pUnfav = round(100 / (1 + Math.exp(-lpUnfav)), 1);
      const riskLevel: 'low' | 'moderate' | 'high' | 'critical' =
        pMort >= 60 ? 'critical' : pMort >= 30 ? 'high' : pMort >= 10 ? 'moderate' : 'low';
      const modelName = idx === 0 ? 'core' : idx === 1 ? 'extended' : 'lab';
      return {
        score: pMort,
        unit: '% 6-month mortality',
        label: `${round(pUnfav, 0)}% unfavorable / ${round(pMort, 0)}% mortality at 6 months (${modelName} model)`,
        interpretation: `IMPACT ${modelName} model: predicted 6-month mortality ≈${pMort}% and unfavorable outcome (death, vegetative state, or severe disability) ≈${pUnfav}%. Population-level estimate — it must NOT be used alone to limit aggressive therapy in an individual patient.`,
        riskLevel,
        details: [
          { label: 'Predicted 6-month mortality', value: `${pMort}%` },
          { label: 'Predicted unfavorable outcome (GOS 1–3)', value: `${pUnfav}%` },
          { label: 'Model used', value: `IMPACT ${modelName}` },
          { label: 'Linear predictor (mortality)', value: `${round(lpMort, 2)}` },
        ],
        recommendations: [
          'Use estimates for family counseling, research, and benchmarking — never as a sole withdrawal-of-care criterion',
          'Correct secondary insults urgently: hypoxia, hypotension, hyperglycemia, anemia',
          'Neurosurgical evaluation for mass lesions; ICP management per Brain Trauma Foundation guidance',
        ],
      };
    },
    evidence: {
      summary:
        'IMPACT (Steyerberg et al., PLoS Med 2008): three nested logistic models for 6-month mortality and unfavorable outcome — core (age, GCS motor, pupils), extended (core + hypoxia, hypotension, Marshall CT class, tSAH, EDH), and lab (extended + glucose, hemoglobin). This calculator implements the published coefficient tables (tbi-impact.org model-fit document) directly rather than the rounded score chart: probability = 1/(1+e^−LP).',
      formula:
        'LP = intercept + β(age)·age + β(motor) + β(pupils) [+ β(hypoxia) + β(hypotension) + β(Marshall) + β(tSAH) + β(EDH)] [+ β(glucose)·glucose + β(Hb)·Hb]; p = 1/(1+e^−LP).',
      validation:
        'Derived in 8,509 moderate/severe TBI patients (cross-validation AUC 0.66–0.84) and externally validated on 6,681 CRASH-trial patients (AUC ~0.80, worse-than-predicted outcomes in lower-income strata). Coefficients verified against the official IMPACT model-fit document (intercept −3.109/−2.644 core, −3.787/−3.023 extended, −3.184/−2.470 lab).',
      references: [
        {
          title: 'Predicting Outcome after Traumatic Brain Injury: Development and International Validation of Prognostic Scores Based on Admission Characteristics',
          citation: 'Steyerberg EW, Mushkudiani N, Perel P, et al. PLoS Med. 2008;5(8):e165',
          year: 2008,
          pmid: '18684008',
          doi: '10.1371/journal.pmed.0050165',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Mass lesion or EDH on CT',
        actions: ['Emergent neurosurgical evaluation', 'ICP monitoring where indicated'],
      },
      {
        condition: 'Secondary insults present',
        actions: ['Oxygenate (avoid hypoxia)', 'Restore perfusion (avoid hypotension)', 'Treat hyperglycemia and anemia'],
      },
      {
        condition: 'High predicted mortality',
        actions: ['Early goals-of-care conversation grounded in team judgment', 'Avoid early (first 24–48 h) self-fulfilling withdrawal decisions'],
      },
    ],
    pearls: [
      'The lab model inverts intuition for two inputs: EDH lowers predicted risk (treatable lesion) and lower hemoglobin raises it.',
      'Untestable motor score is a modeled category — do not force a guess when the exam is confounded by sedation/paralysis.',
      'Predictions describe cohorts; individual patients regularly out- and under-perform them — the authors warn against sole use for limiting care.',
      'CRASH and IMPACT-Extended/IMPACT-Lab are the companion models; for on-scene estimation, the simpler CRASH basic model needs no CT.',
    ],
  },

  // ─── 11. Rule of 7s for Lyme Meningitis ──────────────────────────────────
  {
    id: 'lyme-meningitis-7s',
    name: 'Rule of 7s for Lyme Meningitis',
    shortName: 'Rule of 7s',
    description:
      'Identifies children at low risk for Lyme meningitis versus other aseptic meningitis using headache duration, CSF mononuclear-cell percentage, and cranial nerve palsy.',
    category: 'infectious-disease',
    tags: ['lyme', 'meningitis', 'pediatric', 'rule of 7s', 'borrelia', 'aseptic meningitis', 'csf'],
    whenToUse:
      'Children aged 2–18 years in a Lyme-endemic area with CSF pleocytosis (CSF WBC ≥10 cells/mm³, corrected 1 WBC per 500 RBC when RBC >500) being evaluated for Lyme versus aseptic meningitis while serology is pending.',
    whyUse:
      'Lyme meningitis needs antibiotics (and often admission), while viral aseptic meningitis does not. A score of 0 identifies children who can be managed as outpatients awaiting Lyme serology without empiric antibiotics.',
    inputs: [
      yesNo(
        'headache7',
        'Headache ≥7 days',
        1,
        'Headache duration of 7 days or longer scores +1. Shorter headache courses favor viral meningitis.',
        false
      ),
      yesNo(
        'mono70',
        'CSF mononuclear cells ≥70%',
        1,
        'Lymphocytes + monocytes ≥70% of CSF white cells scores +1. Neutrophil-predominant pleocytosis favors enteroviral/other causes.',
        true
      ),
      yesNo(
        'cnPalsy',
        '7th (or other) cranial nerve palsy',
        1,
        'Any cranial neuropathy — classically peripheral facial (CN VII) palsy — scores +1.',
        false
      ),
    ],
    calculate(values) {
      const score =
        (bool(values.headache7) ? 1 : 0) + (bool(values.mono70) ? 1 : 0) + (bool(values.cnPalsy) ? 1 : 0);
      const lowRisk = score === 0;
      return {
        score,
        unit: 'points (0–3)',
        label: lowRisk ? 'Low risk for Lyme meningitis' : 'NOT low risk for Lyme meningitis',
        interpretation: lowRisk
          ? 'Rule of 7s = 0: low risk for Lyme meningitis (pooled sensitivity ~98%, NPV ~100% in meta-analysis). Outpatient management while awaiting Lyme serology may be reasonable — confirm reliable follow-up and no erythema migrans.'
          : `Rule of 7s = ${score}: NOT low risk. Consider empiric antibiotic therapy covering Borrelia burgdorferi appropriate for age (e.g., ceftriaxone; doxycycline in older children per guidance) while serology results return.`,
        riskLevel: lowRisk ? 'low' : 'moderate',
        details: [
          { label: 'Headache ≥7 days', value: bool(values.headache7) ? '+1' : '0' },
          { label: 'CSF mononuclear ≥70%', value: bool(values.mono70) ? '+1' : '0' },
          { label: 'Cranial nerve palsy', value: bool(values.cnPalsy) ? '+1' : '0' },
          { label: 'Threshold', value: 'Score 0 = low risk; 1–3 = not low risk' },
        ],
        recommendations: lowRisk
          ? [
              'Confirm the child is in an endemic area and check carefully for erythema migrans',
              'Consider discharge with clear follow-up and return precautions while serology is pending',
              'Use clinical judgment — the rule aids, not replaces, assessment',
            ]
          : [
              'Treat empirically for Lyme meningitis pending two-tier serology',
              'Ceftriaxone IV (or doxycycline when age-appropriate) per pediatric Lyme guidance',
              'Monitor for other neuroborreliosis features',
            ],
      };
    },
    evidence: {
      summary:
        'Rule of 7s (derived as a logistic model by Avery et al., Pediatrics 2006; prospectively validated by Garro et al., Pediatrics 2009; multicenter validation by Cohn et al., Pediatrics 2012; pooled meta-analysis, Pediatr Infect Dis J 2021): ≥7 days headache +1, ≥70% CSF mononuclear cells +1, 7th or other cranial nerve palsy +1. Score 0 = low risk; pooled sensitivity 98%, specificity 40%, NPV 100%.',
      formula: 'Score = headache ≥7 d + CSF mononuclear ≥70% + cranial nerve palsy (0–3).',
      validation:
        'Verified against the derivation and the 2012 multicenter cohort (423 children: of 130 low-risk, 5 had Lyme meningitis — 96% sensitivity, 41% specificity) and the 2021 four-cohort pooled validation (721 children: sensitivity 98%, NPV 100%). Misses occurred mainly with EM rash or atypical courses — inspect for erythema migrans before discharging low-risk patients.',
      references: [
        {
          title: 'Prediction of Lyme meningitis in children from a Lyme disease-endemic region: a logistic-regression model using history, physical, and laboratory findings',
          citation: 'Avery RA, Frank G, Glutting JJ, Eppes SC. Pediatrics. 2006;117(5):e1-e7',
          year: 2006,
          pmid: '16396843',
          doi: '10.1542/peds.2005-0955',
        },
        {
          title: 'Prospective validation of a clinical prediction model for Lyme meningitis in children',
          citation: 'Garro A, Rutman MS, Simonsen K, Jaeger JL, Chapin K, Lockhart G. Pediatrics. 2009;123(5):e829-e834',
          year: 2009,
          pmid: '19403476',
          doi: '10.1542/peds.2008-2048',
        },
        {
          title: 'Validation of a clinical prediction rule to distinguish Lyme meningitis from aseptic meningitis',
          citation: 'Cohn KA, Thompson AD, Shah SS, et al. Pediatrics. 2012;129(1):e46-e53',
          year: 2012,
          pmid: '22184651',
          doi: '10.1542/peds.2011-1215',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Score 0, endemic area, reliable follow-up',
        actions: ['Consider outpatient management pending two-tier Lyme serology', 'Re-examine for erythema migrans', 'Return precautions for worsening symptoms'],
      },
      {
        condition: 'Score 1–3',
        actions: ['Empiric Lyme meningitis therapy (ceftriaxone; doxycycline per age/guideline)', 'Obtain two-tier serology ± CSF Lyme antibody', 'Admission decisions per clinical status'],
      },
      {
        condition: 'Documented erythema migrans or positive serology',
        actions: ['Treat as Lyme meningitis regardless of score', 'Complete the full antibiotic course'],
      },
    ],
    pearls: [
      'Apply only to children 2–18 y in Lyme-endemic areas WITH CSF pleocytosis (≥10 WBC/mm³, corrected for RBC).',
      'Score 0 does not mean zero risk — pooled sensitivity is ~98%, so rare Lyme meningitis cases are missed; follow-up planning matters.',
      'Cranial nerve palsy counts beyond CN VII — any cranial neuropathy scores the point.',
      'Presence of erythema migrans essentially confirms Lyme disease — the rule is unnecessary (and should not be used to withhold treatment).',
    ],
  },
];
