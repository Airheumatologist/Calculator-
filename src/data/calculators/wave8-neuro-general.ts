import type { Calculator } from '../../types/calculator';
import { num, bool, str, yesNo, selectInput, riskFromThresholds } from '../../utils/helpers';

/** Washington University global CDR algorithm (Morris 1993 scoring rules). */
function cdrGlobal(m: number, sec: number[]): number {
  if (m === 0) {
    return sec.filter((s) => s >= 0.5).length >= 2 ? 0.5 : 0;
  }
  if (m === 0.5) {
    return sec.filter((s) => s >= 1).length >= 3 ? 1 : 0.5;
  }
  const equal = sec.filter((s) => s === m).length;
  const greater = sec.filter((s) => s > m);
  const less = sec.filter((s) => s < m);
  if (equal >= 3) return m;
  // Three secondary categories on one side of M and two on the other → CDR = M.
  if ((greater.length === 3 && less.length === 2) || (less.length === 3 && greater.length === 2)) {
    return m;
  }
  if (greater.length >= 3 || less.length >= 3) {
    const side = greater.length > less.length ? greater : less;
    const counts = new Map<number, number>();
    for (const s of side) counts.set(s, (counts.get(s) ?? 0) + 1);
    let bestScore = m;
    let bestCount = -1;
    for (const [score, count] of counts) {
      // Ties on one side of M resolve to the tied score closest to M.
      if (count > bestCount || (count === bestCount && Math.abs(score - m) < Math.abs(bestScore - m))) {
        bestScore = score;
        bestCount = count;
      }
    }
    // When M ≥ 1, CDR cannot be 0: floor at 0.5 when the majority of secondary
    // categories are scored 0.
    if (bestScore === 0) return 0.5;
    return bestScore;
  }
  return m;
}

const ALS_ITEMS = [
  'speech', 'salivation', 'swallowing', 'handwriting', 'dressing', 'turning',
  'walking', 'stairs', 'dyspnea', 'orthopnea', 'respInsufficiency',
];

/** Wave 8 neurology/general calculators: epilepsy, ALS, MG, neuropathy, dementia, migraine, Parkinson disease, neurosurgical adverse events, and trunk control. */
export const wave8NeuroGeneralCalcs: Calculator[] = [
  // ─── 1. REST-LGS ───────────────────────────────────────────────────────────
  {
    id: 'rest-lgs',
    name: 'Refractory Epilepsy Screening Tool for Lennox-Gastaut Syndrome (REST-LGS)',
    shortName: 'REST-LGS',
    description:
      'Eight-item screening tool for possible Lennox-Gastaut syndrome in patients with drug-resistant epilepsy: 4 major criteria (3 points each) and 4 minor criteria (1 point each).',
    category: 'neurology',
    tags: ['epilepsy', 'lennox-gastaut', 'lgs', 'seizure', 'rest-lgs', 'refractory', 'screening'],
    whenToUse:
      'Any patient with drug-resistant epilepsy in whom Lennox-Gastaut syndrome is a consideration — LGS is often diagnosed years after onset, so the tool is useful in adults as well as children.',
    whyUse:
      'REST-LGS was developed by modified Delphi consensus and validated on blinded records: most confirmed LGS cases met 3 major and 2–3 minor criteria, while non-LGS drug-resistant epilepsy met ≤1 major and 1–2 minor criteria. It prompts a structured history (including easily missed items such as childhood helmet use) to identify patients who need a full LGS work-up.',
    inputs: [
      yesNo('seizureTypes', '≥2 seizure types', 3, 'MAJOR criterion (3 points). Any combination of seizure types (e.g., tonic, atonic, atypical absence, myoclonic, focal, generalized tonic-clonic). Ask the family or caregiver if unsure.', true),
      yesNo('onsetBefore12', 'Seizure onset before age 12 years', 3, 'MAJOR criterion (3 points). First seizure occurred before the 12th birthday.', true),
      yesNo('ssw', 'EEG with generalized slow spike-and-wave (<2.5 Hz)', 3, 'MAJOR criterion (3 points). History of generalized slow spike-and-wave (SSW) discharges below 2.5 Hz on any prior EEG — review old reports.', true),
      yesNo('cognitive', 'Cognitive impairment since childhood', 3, 'MAJOR criterion (3 points). Past or current learning difficulties, special education, autism, intellectual disability, or developmental delay.', true),
      yesNo('asmFailures', 'Persistent seizures despite ≥2 antiseizure medications', 1, 'MINOR criterion (1 point). Ongoing seizures despite adequate trials of at least two ASMs.', true),
      yesNo('nonDrug', 'History of VNS, ketogenic diet, or epilepsy surgery', 1, 'MINOR criterion (1 point). Vagal nerve stimulator, ketogenic or other dietary therapy, or any epilepsy surgery.', false),
      yesNo('helmet', 'Seizure-related helmet use or head/face injuries', 1, 'MINOR criterion (1 point). Current or past helmet use for seizures, or documented seizure-related head or facial injuries.', false),
      yesNo('eegOther', 'Other characteristic EEG abnormality', 1, 'MINOR criterion (1 point). Any one of: multifocal spikes, symptomatic generalized discharges, generalized polyspikes, generalized periods of attenuation of background/electrodecrement, or paroxysmal fast activity.', false),
    ],
    calculate(values) {
      const major =
        (bool(values.seizureTypes) ? 3 : 0) +
        (bool(values.onsetBefore12) ? 3 : 0) +
        (bool(values.ssw) ? 3 : 0) +
        (bool(values.cognitive) ? 3 : 0);
      const minor =
        (bool(values.asmFailures) ? 1 : 0) +
        (bool(values.nonDrug) ? 1 : 0) +
        (bool(values.helmet) ? 1 : 0) +
        (bool(values.eegOther) ? 1 : 0);
      const score = major + minor;
      const band =
        score > 11
          ? {
              riskLevel: 'high' as const,
              label: 'Likely LGS',
              interpretation:
                'Score >11 is consistent with likely Lennox-Gastaut syndrome. Arrange a full LGS work-up — sleep and wake EEG (slow spike-and-wave, paroxysmal fast activity), brain MRI, and referral to a comprehensive epilepsy center.',
            }
          : score >= 8
            ? {
                riskLevel: 'moderate' as const,
                label: 'Possible LGS',
                interpretation:
                  'Score 8–11 suggests possible Lennox-Gastaut syndrome. Missing or unknown history can lower the score — pursue old EEGs and records and consider epilepsy specialist review rather than ruling LGS out.',
              }
            : {
                riskLevel: 'low' as const,
                label: 'Unlikely LGS',
                interpretation:
                  'Score <8 makes Lennox-Gastaut syndrome unlikely on current information. A low score driven by missing data does not definitively exclude LGS; reassess if new history or EEG findings emerge.',
              };
      return {
        score,
        unit: 'points (0–16)',
        label: band.label,
        interpretation: band.interpretation,
        riskLevel: band.riskLevel,
        details: [
          { label: 'Major criteria points (3 pts each)', value: `${major} / 12` },
          { label: 'Minor criteria points (1 pt each)', value: `${minor} / 4` },
          { label: 'Interpretation bands', value: '>11 likely · 8–11 possible · <8 unlikely' },
        ],
        recommendations: [
          'This is a screening tool, not a diagnosis — confirm with EEG (slow spike-and-wave, paroxysmal fast activity), MRI, and specialist evaluation.',
          'Consider epilepsy gene panel/chromosomal microarray and metabolic testing when imaging is unrevealing.',
          'Refer likely or possible cases to a comprehensive epilepsy center for multidisciplinary management.',
        ],
      };
    },
    evidence: {
      summary:
        'REST-LGS comprises 8 criteria (4 major, 4 minor) developed by modified Delphi consensus for identifying LGS among patients with drug-resistant epilepsy. "Yes" answers score 3 points for major and 1 point for minor criteria (total 0–16); scores >11 indicate likely LGS, 8–11 possible LGS, and <8 unlikely LGS.',
      formula:
        'Total = 3 × (number of major criteria met) + 1 × (number of minor criteria met). >11 likely LGS; 8–11 possible; <8 unlikely.',
      validation:
        'Validated on 200 blinded records at 2 epilepsy centers (1:1 confirmed LGS vs drug-resistant epilepsy): most LGS cases met 3 major and 2–3 minor criteria vs ≤1 major and 1–2 minor for non-LGS DRE. Inter-rater reliability moderate to good (κ 0.41–0.80); Cronbach α 0.64. A 2024 multicenter real-world cohort applied the updated tool to ILAE LGS criteria.',
      references: [
        {
          title: 'The refractory epilepsy screening tool for Lennox-Gastaut syndrome (REST-LGS)',
          citation: 'Piña-Garza JE, Boyce D, Tworek DM, et al. Epilepsy Behav. 2019;90:148-153',
          year: 2019,
          pmid: '30537670',
          doi: '10.1016/j.yebeh.2018.11.016',
        },
        {
          title: 'Real-world use of the updated refractory epilepsy screening tool for Lennox-Gastaut syndrome',
          citation: 'Wolf SM, Boyce D, Peña P, et al. Epilepsia Open. 2024;9(4):1277-1286',
          year: 2024,
          pmid: '38726917',
          doi: '10.1002/epi4.12952',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Score >11 (likely LGS)',
        actions: ['Sleep/wake EEG for slow spike-and-wave and paroxysmal fast activity', 'Brain MRI for structural etiologies', 'Refer to comprehensive epilepsy center', 'Discuss LGS-specific therapies (e.g., cannabidiol, rufinamide, felbamate, VNS, ketogenic diet)'],
      },
      {
        condition: 'Score 8–11 (possible LGS)',
        actions: ['Retrieve historical EEGs and pediatric records', 'Ask family about helmet use, injuries, schooling, and developmental history', 'Genetic testing (epilepsy panel, chromosomal microarray) if unrevealing', 'Epilepsy specialist review'],
      },
      {
        condition: 'Score <8',
        actions: ['Reassess if new seizure types or EEG data emerge', 'Continue standard drug-resistant epilepsy evaluation'],
      },
    ],
    pearls: [
      'Diagnosis of LGS takes an average of 12–15 years after onset — many patients are adults before identification, so apply the tool to adults with childhood-onset drug-resistant epilepsy.',
      'Major criteria carry 3 points each; the triad of multiple seizure types, slow spike-and-wave, and cognitive impairment dominates the score.',
      'Unknown answers effectively score 0 — low scores from missing data do not exclude LGS; ask caregivers.',
    ],
  },

  // ─── 2. ALSFRS-R ───────────────────────────────────────────────────────────
  {
    id: 'alsfrs-r',
    name: 'Revised ALS Functional Rating Scale (ALSFRS-R)',
    shortName: 'ALSFRS-R',
    description:
      'Twelve-item functional rating scale for amyotrophic lateral sclerosis (0–48): bulbar, fine motor, gross motor, and respiratory domains. Item 5 uses the alternate gastrostomy scale when >50% of nutrition is via G-tube.',
    category: 'neurology',
    tags: ['als', 'alsfrs', 'alsfrs-r', 'amyotrophic lateral sclerosis', 'motor neuron', 'functional rating'],
    isQuestionnaire: true,
    questionnaire: {
      modeInputId: 'gtube',
      activeInputIdsByMode: {
        no: [...ALS_ITEMS.slice(0, 4), 'cutting', ...ALS_ITEMS.slice(4)],
        yes: [...ALS_ITEMS.slice(0, 4), 'cuttingGtube', ...ALS_ITEMS.slice(4)],
      },
    },
    whenToUse:
      'Baseline and serial assessment of functional status in patients with ALS — in clinic and in trials; also used to time discussions about noninvasive ventilation and feeding support.',
    whyUse:
      'The ALSFRS-R is the standard functional outcome in ALS research and care. Baseline score and rate of decline (points/month) carry prognostic information, and the three respiratory items capture ventilatory decline that the original ALSFRS underweighted.',
    inputs: [
      selectInput('gtube', 'Gastrostomy with >50% of daily nutrition via G-tube?', [
        { label: 'No', value: 'no' },
        { label: 'Yes', value: 'yes' },
      ], 'no', 'Selects which version of item 5 (cutting food and handling utensils) is scored, per the published ALSFRS-R form.'),
      selectInput('speech', 'Speech', [
        { label: 'Normal', value: 4, points: 4 },
        { label: 'Detectable speech disturbance', value: 3, points: 3 },
        { label: 'Intelligible with repeating', value: 2, points: 2 },
        { label: 'Speech combined with nonvocal communications', value: 1, points: 1 },
        { label: 'Loss of useful speech', value: 0, points: 0 },
      ], 3, 'Bulbar item 1. Rate the worst consistent performance.'),
      selectInput('salivation', 'Salivation', [
        { label: 'Normal', value: 4, points: 4 },
        { label: 'Slight but definite excess of saliva in mouth; may have nighttime drooling', value: 3, points: 3 },
        { label: 'Moderately excessive saliva; may have minimal drooling', value: 2, points: 2 },
        { label: 'Marked excess of saliva with some drooling', value: 1, points: 1 },
        { label: 'Marked drooling; requires constant tissue or handkerchief', value: 0, points: 0 },
      ], 3, 'Bulbar item 2.'),
      selectInput('swallowing', 'Swallowing', [
        { label: 'Normal eating habits', value: 4, points: 4 },
        { label: 'Early eating problems; occasional choking', value: 3, points: 3 },
        { label: 'Dietary consistency changes', value: 2, points: 2 },
        { label: 'Needs supplemental tube feedings', value: 1, points: 1 },
        { label: 'Nothing by mouth; exclusively parenteral or enteral feeding', value: 0, points: 0 },
      ], 2, 'Bulbar item 3.'),
      selectInput('handwriting', 'Handwriting', [
        { label: 'Normal', value: 4, points: 4 },
        { label: 'Slow or sloppy; all words are legible', value: 3, points: 3 },
        { label: 'Not all words are legible', value: 2, points: 2 },
        { label: 'Able to grip pen but unable to write', value: 1, points: 1 },
        { label: 'Unable to grip pen', value: 0, points: 0 },
      ], 2, 'Fine motor item 4.'),
      selectInput('cutting', 'Cutting food and handling utensils (no gastrostomy)', [
        { label: 'Normal', value: 4, points: 4 },
        { label: 'Somewhat slow and clumsy, but no help needed', value: 3, points: 3 },
        { label: 'Can cut most foods, although clumsy and slow; some help needed', value: 2, points: 2 },
        { label: 'Food must be cut by someone, but can still feed slowly', value: 1, points: 1 },
        { label: 'Needs to be fed', value: 0, points: 0 },
      ], 3, 'Fine motor item 5a — used when the patient does NOT have a gastrostomy supplying >50% of nutrition.'),
      selectInput('cuttingGtube', 'Cutting food and handling utensils (gastrostomy scale)', [
        { label: 'Normal', value: 4, points: 4 },
        { label: 'Clumsy, but able to perform all manipulations independently', value: 3, points: 3 },
        { label: 'Some help needed with closures and fasteners', value: 2, points: 2 },
        { label: 'Provides minimal assistance to caregiver', value: 1, points: 1 },
        { label: 'Unable to perform any aspect of task', value: 0, points: 0 },
      ], 3, 'Fine motor item 5b — the published alternate scale for patients with gastrostomy (>50% of nutrition via G-tube).'),
      selectInput('dressing', 'Dressing and hygiene', [
        { label: 'Normal function', value: 4, points: 4 },
        { label: 'Independent and complete self-care with effort or decreased efficiency', value: 3, points: 3 },
        { label: 'Intermittent assistance or substitute methods', value: 2, points: 2 },
        { label: 'Needs attendant for self-care', value: 1, points: 1 },
        { label: 'Total dependence', value: 0, points: 0 },
      ], 3, 'Fine motor item 6.'),
      selectInput('turning', 'Turning in bed and adjusting bed clothes', [
        { label: 'Normal', value: 4, points: 4 },
        { label: 'Somewhat slow and clumsy, but no help needed', value: 3, points: 3 },
        { label: 'Can turn alone or adjust sheets, but with great difficulty', value: 2, points: 2 },
        { label: 'Can initiate, but not turn or adjust sheets alone', value: 1, points: 1 },
        { label: 'Helpless', value: 0, points: 0 },
      ], 3, 'Gross motor item 7.'),
      selectInput('walking', 'Walking', [
        { label: 'Normal', value: 4, points: 4 },
        { label: 'Early ambulation difficulties', value: 3, points: 3 },
        { label: 'Walks with assistance', value: 2, points: 2 },
        { label: 'Nonambulatory functional movement', value: 1, points: 1 },
        { label: 'No purposeful leg movement', value: 0, points: 0 },
      ], 3, 'Gross motor item 8.'),
      selectInput('stairs', 'Climbing stairs', [
        { label: 'Normal', value: 4, points: 4 },
        { label: 'Slow', value: 3, points: 3 },
        { label: 'Mild unsteadiness or fatigue', value: 2, points: 2 },
        { label: 'Needs assistance', value: 1, points: 1 },
        { label: 'Cannot do', value: 0, points: 0 },
      ], 3, 'Gross motor item 9.'),
      selectInput('dyspnea', 'Dyspnea', [
        { label: 'None', value: 4, points: 4 },
        { label: 'Occurs when walking', value: 3, points: 3 },
        { label: 'Occurs with one or more of the following: eating, bathing, dressing', value: 2, points: 2 },
        { label: 'Occurs at rest; difficulty breathing when either sitting or lying', value: 1, points: 1 },
        { label: 'Significant difficulty; considering using mechanical respiratory support', value: 0, points: 0 },
      ], 3, 'Respiratory item 10.'),
      selectInput('orthopnea', 'Orthopnea', [
        { label: 'None', value: 4, points: 4 },
        { label: 'Some difficulty sleeping at night due to shortness of breath; does not routinely use >2 pillows', value: 3, points: 3 },
        { label: 'Needs extra pillows in order to sleep (>2)', value: 2, points: 2 },
        { label: 'Can only sleep sitting up', value: 1, points: 1 },
        { label: 'Unable to sleep', value: 0, points: 0 },
      ], 3, 'Respiratory item 11.'),
      selectInput('respInsufficiency', 'Respiratory insufficiency', [
        { label: 'None', value: 4, points: 4 },
        { label: 'Intermittent use of BiPAP', value: 3, points: 3 },
        { label: 'Continuous use of BiPAP during the night', value: 2, points: 2 },
        { label: 'Continuous use of BiPAP during the night and day', value: 1, points: 1 },
        { label: 'Invasive mechanical ventilation by intubation or tracheostomy', value: 0, points: 0 },
      ], 4, 'Respiratory item 12.'),
    ],
    calculate(values) {
      const gtube = str(values.gtube, 'no') === 'yes';
      const cutting = gtube ? num(values.cuttingGtube) : num(values.cutting);
      const items: { label: string; v: number }[] = [
        { label: 'Speech', v: num(values.speech) },
        { label: 'Salivation', v: num(values.salivation) },
        { label: 'Swallowing', v: num(values.swallowing) },
        { label: 'Handwriting', v: num(values.handwriting) },
        { label: `Cutting food/utensils (${gtube ? 'gastrostomy' : 'standard'} scale)`, v: cutting },
        { label: 'Dressing and hygiene', v: num(values.dressing) },
        { label: 'Turning in bed', v: num(values.turning) },
        { label: 'Walking', v: num(values.walking) },
        { label: 'Climbing stairs', v: num(values.stairs) },
        { label: 'Dyspnea', v: num(values.dyspnea) },
        { label: 'Orthopnea', v: num(values.orthopnea) },
        { label: 'Respiratory insufficiency', v: num(values.respInsufficiency) },
      ];
      const score = items.reduce((a, b) => a + b.v, 0);
      const resp = num(values.dyspnea) + num(values.orthopnea) + num(values.respInsufficiency);
      const band = riskFromThresholds(score, [
        { max: 12, level: 'critical', label: 'Severe functional impairment', interpretation: 'ALSFRS-R ≤12/48 — profound disability. Prioritize respiratory support decisions, nutrition, communication aids, and goals-of-care discussions.' },
        { max: 24, level: 'high', label: 'Marked functional impairment', interpretation: 'ALSFRS-R 13–24/48 — major disability across domains. Multidisciplinary ALS clinic review; address mobility, feeding, and ventilatory planning.' },
        { max: 36, level: 'moderate', label: 'Moderate functional impairment', interpretation: 'ALSFRS-R 25–36/48 — moderate disability. Track rate of decline; discuss NIV and nutrition planning proactively.' },
        { max: 48, level: 'low', label: 'Preserved function', interpretation: 'ALSFRS-R ≥37/48 — relatively preserved function. Continue serial monitoring; rate of decline is more informative than a single score.' },
      ]);
      const alerts: string[] = [];
      if (num(values.dyspnea) <= 1 || num(values.orthopnea) <= 1) {
        alerts.push('Rest/nocturnal dyspnea reported — assess for noninvasive ventilation (FVC/SNF, MIP, capnography) and discuss respiratory support.');
      }
      if (num(values.swallowing) <= 1) {
        alerts.push('Tube feeding already required or exclusively enteral — confirm nutrition plan and aspiration precautions.');
      }
      return {
        score,
        unit: '/48',
        label: band.label,
        interpretation: `${band.interpretation} Higher scores indicate better function (48 = normal); ALSFRS-R has no official severity bands — labels shown are pragmatic ranges.`,
        riskLevel: band.riskLevel,
        details: [
          ...items.map((i) => ({ label: i.label, value: `${i.v} / 4` })),
          { label: 'Respiratory subscore (items 10–12)', value: `${resp} / 12` },
        ],
        recommendations: [
          'Report score together with disease duration — monthly decline (ΔALSFRS-R) is the key prognostic metric.',
          'Refer to a multidisciplinary ALS/MND clinic; revisit goals of care, NIV, and gastrostomy as scores fall.',
        ],
        alerts,
      };
    },
    evidence: {
      summary:
        'The ALSFRS-R rates 12 functions (speech, salivation, swallowing, handwriting, cutting food/handling utensils, dressing and hygiene, turning in bed, walking, climbing stairs, dyspnea, orthopnea, respiratory insufficiency) each 0–4, total 0–48. Item 5 has an alternate scale for patients with gastrostomy (>50% of nutrition via G-tube). Higher scores = better function.',
      formula: 'ALSFRS-R = sum of 12 items, each scored 0–4 (maximum 48; 48 = normal function).',
      validation:
        'Developed from BDNF phase III trial data to add respiratory items to the original ALSFRS; extensively validated and used as the standard functional endpoint in ALS trials. Severity labels shown here are pragmatic ranges — the scale has no official severity bands; interpret absolute score with disease duration and slope.',
      references: [
        {
          title: 'The ALSFRS-R: a revised ALS functional rating scale that incorporates assessments of respiratory function',
          citation: 'Cedarbaum JM, Stambler N, Malta E, et al; BDNF ALS Study Group (Phase III). J Neurol Sci. 1999;169(1-2):13-21',
          year: 1999,
          pmid: '10540002',
          doi: '10.1016/S0022-510X(99)00210-5',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Any respiratory item ≤1 or declining respiratory subscore',
        actions: ['Spirometry/supine FVC, SNIP/MIP, nocturnal capnography or oximetry', 'Discuss and initiate noninvasive ventilation as appropriate', 'Goals-of-care conversation'],
      },
      {
        condition: 'Swallowing item ≤2 or weight loss',
        actions: ['Dietitian and SLP assessment', 'Discuss gastrostomy timing before respiratory status declines'],
      },
      {
        condition: 'Any score',
        actions: ['Multidisciplinary ALS clinic follow-up', 'Re-score at each visit and document rate of decline'],
      },
    ],
    pearls: [
      '48 is normal; the slope (points lost per month) predicts survival better than a single value.',
      'Use the gastrostomy variant of item 5 whenever >50% of nutrition is delivered via G-tube — otherwise upper-limb disability is underestimated.',
      'A drop in the respiratory items can precede symptoms of overt ventilatory failure — act early.',
    ],
  },

  // ─── 3. MG-ADL ─────────────────────────────────────────────────────────────
  {
    id: 'mg-adl',
    name: 'Myasthenia Gravis Activities of Daily Living (MG-ADL)',
    shortName: 'MG-ADL',
    description:
      'Eight-item patient-reported severity scale for myasthenia gravis (0–24): talking, chewing, swallowing, breathing, grooming, arising from a chair, diplopia, and ptosis.',
    category: 'neurology',
    tags: ['myasthenia gravis', 'mg-adl', 'mg', 'adl', 'neuromuscular', 'ptosis', 'diplopia'],
    isQuestionnaire: true,
    whenToUse:
      'Routine symptom-severity tracking in established MG — clinic visits, telehealth, and trials. Keep the recall window consistent (e.g., past 7 days) between administrations.',
    whyUse:
      'The MG-ADL is a brief (≈10-minute) validated patient-reported measure that correlates with the Quantitative MG (QMG) score. A ≥2-point change is the minimal clinically important difference, and a score ≤1 is the "minimal symptom expression" treatment target.',
    inputs: [
      selectInput('talking', 'Talking', [
        { label: 'Normal', value: 0, points: 0 },
        { label: 'Intermittent slurring or nasal speech', value: 1, points: 1 },
        { label: 'Constant slurring or nasal, but can be understood', value: 2, points: 2 },
        { label: 'Difficult to understand speech', value: 3, points: 3 },
      ], 1, 'Bulbar item — slurred or nasal speech from fatigable weakness.'),
      selectInput('chewing', 'Chewing', [
        { label: 'Normal', value: 0, points: 0 },
        { label: 'Fatigue with solid food', value: 1, points: 1 },
        { label: 'Fatigue with soft food', value: 2, points: 2 },
        { label: 'Gastric tube', value: 3, points: 3 },
      ], 1, 'Jaw-fatigue item; gastric tube scores 3.'),
      selectInput('swallowing', 'Swallowing', [
        { label: 'Normal', value: 0, points: 0 },
        { label: 'Rare episode of choking', value: 1, points: 1 },
        { label: 'Frequent choking, necessitating changes in diet', value: 2, points: 2 },
        { label: 'Gastric tube', value: 3, points: 3 },
      ], 1, 'Dysphagia item; gastric tube scores 3.'),
      selectInput('breathing', 'Breathing', [
        { label: 'Normal', value: 0, points: 0 },
        { label: 'Shortness of breath with exertion', value: 1, points: 1 },
        { label: 'Shortness of breath at rest', value: 2, points: 2 },
        { label: 'Ventilator dependence', value: 3, points: 3 },
      ], 1, 'Respiratory item — rest dyspnea or ventilator use warrants urgent evaluation.'),
      selectInput('grooming', 'Ability to brush teeth or comb hair', [
        { label: 'No impairment', value: 0, points: 0 },
        { label: 'Extra effort, but no rest periods needed', value: 1, points: 1 },
        { label: 'Rest periods needed', value: 2, points: 2 },
        { label: 'Cannot do one of these functions', value: 3, points: 3 },
      ], 1, 'Upper-limb fatigable weakness item.'),
      selectInput('chair', 'Ability to arise from a chair', [
        { label: 'No impairment', value: 0, points: 0 },
        { label: 'Mild; sometimes uses arms', value: 1, points: 1 },
        { label: 'Moderate; always uses arms', value: 2, points: 2 },
        { label: 'Severe; requires assistance', value: 3, points: 3 },
      ], 1, 'Proximal lower-limb weakness item.'),
      selectInput('diplopia', 'Double vision', [
        { label: 'None', value: 0, points: 0 },
        { label: 'Occurs, but not daily', value: 1, points: 1 },
        { label: 'Daily, but not constant', value: 2, points: 2 },
        { label: 'Constant', value: 3, points: 3 },
      ], 1, 'Ocular item.'),
      selectInput('ptosis', 'Eyelid droop', [
        { label: 'None', value: 0, points: 0 },
        { label: 'Occurs, but not daily', value: 1, points: 1 },
        { label: 'Daily, but not constant', value: 2, points: 2 },
        { label: 'Constant', value: 3, points: 3 },
      ], 1, 'Ocular item.'),
    ],
    calculate(values) {
      const items = [
        { label: 'Talking', v: num(values.talking) },
        { label: 'Chewing', v: num(values.chewing) },
        { label: 'Swallowing', v: num(values.swallowing) },
        { label: 'Breathing', v: num(values.breathing) },
        { label: 'Brush teeth / comb hair', v: num(values.grooming) },
        { label: 'Arise from chair', v: num(values.chair) },
        { label: 'Double vision', v: num(values.diplopia) },
        { label: 'Eyelid droop', v: num(values.ptosis) },
      ];
      const score = items.reduce((a, b) => a + b.v, 0);
      const band = riskFromThresholds(score, [
        { max: 1, level: 'normal', label: 'Minimal symptom expression (≤1)', interpretation: 'MG-ADL ≤1 — treatment goal reached. Reinforce adherence; consider de-escalation and longer visit intervals with remote monitoring.' },
        { max: 6, level: 'low', label: 'Mild symptom burden', interpretation: 'MG-ADL 2–6 — mild residual symptoms. Review adherence and triggers; consider whether therapy optimization is warranted.' },
        { max: 12, level: 'moderate', label: 'Moderate symptom burden', interpretation: 'MG-ADL 7–12 — active symptom burden. Reassess regimen, exacerbating factors (infection, thyroid, medications), and escalation options.' },
        { max: 24, level: 'high', label: 'High symptom burden', interpretation: 'MG-ADL ≥13 — substantial disability. Escalate therapy and evaluate for impending crisis; check FVC/NIF.' },
      ]);
      const alerts: string[] = [];
      if (num(values.breathing) >= 2) {
        alerts.push('Shortness of breath at rest or ventilator dependence — measure FVC and NIF urgently; evaluate for myasthenic crisis and consider emergency referral.');
      }
      if (num(values.swallowing) === 3) {
        alerts.push('Gastric-tube-level dysphagia — aspiration risk; review airway protection and nutrition.');
      }
      return {
        score,
        unit: '/24',
        label: band.label,
        interpretation: `${band.interpretation} Higher scores indicate more symptoms; a ≥2-point change is the minimal clinically important difference.`,
        riskLevel: band.riskLevel,
        details: items.map((i) => ({ label: i.label, value: `${i.v} / 3` })),
        recommendations: [
          'Interpret alongside the neurologic exam, FVC/NIF, and patient goals.',
          'Aim for MG-ADL ≤1 (minimal symptom expression) when titrating therapy.',
          'If the score stays elevated despite treatment, confirm adherence and look for infection, thyroid disease, or offending drugs (e.g., magnesium, aminoglycosides, beta-blockers, immune checkpoint inhibitors).',
        ],
        alerts,
      };
    },
    evidence: {
      summary:
        'The MG-ADL is an 8-item patient-reported profile derived from the physician-based QMG; each item scores 0–3 (total 0–24). In 254 encounters the mean score was 4.89 and correlated with the QMG (r 0.583). A ≥2-point change is clinically meaningful; ≤1 defines minimal symptom expression.',
      formula: 'MG-ADL = sum of 8 items, each 0–3 (maximum 24; higher = more symptomatic).',
      validation:
        'Wolfe et al. validated the MG-ADL against the QMG in 254 consecutive MG encounters. Subsequent studies confirmed test-retest reliability, responsiveness, and a minimal clinically important difference of about 2 points; it is a standard secondary endpoint in MG trials.',
      references: [
        {
          title: 'Myasthenia gravis activities of daily living profile',
          citation: 'Wolfe GI, Herbelin L, Nations SP, et al. Neurology. 1999;52(7):1487-1489',
          year: 1999,
          doi: '10.1212/wnl.52.7.1487',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Breathing item ≥2',
        actions: ['Urgent FVC and NIF', 'Assess for myasthenic crisis; ED referral if borderline', 'Review triggers and rescue/escalation therapy'],
      },
      {
        condition: 'Score remains >1 despite treatment',
        actions: ['Confirm adherence and dosing', 'Screen for infection, thyroid dysfunction, and aggravating drugs', 'Consider steroid-sparing agents, biologics, or thymectomy evaluation'],
      },
      {
        condition: 'Score ≤1',
        actions: ['Reinforce adherence', 'Consider gradual de-escalation per specialist guidance', 'Extend follow-up intervals with patient-reported monitoring'],
      },
    ],
    pearls: [
      'Keep the recall window constant (e.g., last 7 days) between visits or scores are not comparable.',
      'Gastric tube use scores 3 on both chewing and swallowing — record it even when the patient cannot trial oral intake.',
      'Bulbar and respiratory items matter most for safety — do not chase cosmetic ocular scores at the expense of systemic control.',
    ],
  },

  // ─── 4. MGFA Clinical Classification ───────────────────────────────────────
  {
    id: 'mgfa-class',
    name: 'Myasthenia Gravis Foundation of America (MGFA) Clinical Classification',
    shortName: 'MGFA Class',
    description:
      'MGFA clinical classification of myasthenia gravis severity (Class I–V with a/b subdivisions) based on the most severely affected muscle group.',
    category: 'neurology',
    tags: ['myasthenia gravis', 'mgfa', 'classification', 'neuromuscular', 'severity'],
    whenToUse:
      'Classifying maximal disease severity in myasthenia gravis for clinical documentation, trials, and outcome reporting. For fluctuating disease, use the worst weakness observed during the evaluation period.',
    whyUse:
      'The MGFA class is the consensus severity taxonomy for MG — it standardizes communication and pairs with the QMG score and MGFA Post-Intervention Status to track change over time.',
    inputs: [
      selectInput('cls', 'MGFA class (worst affected muscle group)', [
        { label: 'Class I — any ocular muscle weakness (may include eye closure); all other muscles normal', value: 'I' },
        { label: 'Class IIa — mild non-ocular weakness, predominantly limb/axial muscles', value: 'IIa' },
        { label: 'Class IIb — mild non-ocular weakness, predominantly oropharyngeal/respiratory muscles', value: 'IIb' },
        { label: 'Class IIIa — moderate non-ocular weakness, predominantly limb/axial muscles', value: 'IIIa' },
        { label: 'Class IIIb — moderate non-ocular weakness, predominantly oropharyngeal/respiratory muscles', value: 'IIIb' },
        { label: 'Class IVa — severe non-ocular weakness, predominantly limb/axial muscles', value: 'IVa' },
        { label: 'Class IVb — severe non-ocular weakness, predominantly oropharyngeal/respiratory muscles (includes feeding tube without intubation)', value: 'IVb' },
        { label: 'Class V — intubation, with or without mechanical ventilation (excluding routine post-op management)', value: 'V' },
      ], 'IIa', 'Class is defined by the most severely affected muscles, not the number of muscles involved. Ocular weakness of any severity may accompany classes II–IV. The a/b subdivisions designate predominant limb/axial (a) vs oropharyngeal/respiratory (b) involvement.'),
    ],
    calculate(values) {
      const cls = str(values.cls, 'I');
      const map: Record<string, { label: string; riskLevel: 'low' | 'moderate' | 'high' | 'critical'; interpretation: string }> = {
        I: {
          label: 'MGFA Class I (ocular)',
          riskLevel: 'low',
          interpretation: 'Any ocular muscle weakness; may have weakness of eye closure. All other muscle strength is normal. Ocular MG — monitor for generalization (~half generalize, usually within 2 years).',
        },
        IIa: {
          label: 'MGFA Class IIa (mild, limb/axial predominant)',
          riskLevel: 'low',
          interpretation: 'Mild weakness affecting muscles other than ocular, predominantly limb and/or axial muscles; may have lesser oropharyngeal involvement and ocular weakness of any severity.',
        },
        IIb: {
          label: 'MGFA Class IIb (mild, oropharyngeal/respiratory predominant)',
          riskLevel: 'moderate',
          interpretation: 'Mild weakness affecting muscles other than ocular, predominantly oropharyngeal and/or respiratory muscles; may have lesser or equal limb involvement and ocular weakness of any severity. Monitor swallowing and ventilation closely.',
        },
        IIIa: {
          label: 'MGFA Class IIIa (moderate, limb/axial predominant)',
          riskLevel: 'moderate',
          interpretation: 'Moderate weakness affecting muscles other than ocular, predominantly limb and/or axial muscles; may have lesser oropharyngeal involvement and ocular weakness of any severity.',
        },
        IIIb: {
          label: 'MGFA Class IIIb (moderate, oropharyngeal/respiratory predominant)',
          riskLevel: 'high',
          interpretation: 'Moderate weakness affecting muscles other than ocular, predominantly oropharyngeal and/or respiratory muscles; may have lesser or equal limb involvement and ocular weakness of any severity. Bulbar/respiratory predominance raises crisis risk — check FVC/NIF.',
        },
        IVa: {
          label: 'MGFA Class IVa (severe, limb/axial predominant)',
          riskLevel: 'high',
          interpretation: 'Severe weakness affecting muscles other than ocular, predominantly limb and/or axial muscles; may have lesser oropharyngeal involvement and ocular weakness of any severity.',
        },
        IVb: {
          label: 'MGFA Class IVb (severe, oropharyngeal/respiratory predominant)',
          riskLevel: 'critical',
          interpretation: 'Severe weakness affecting muscles other than ocular, predominantly oropharyngeal and/or respiratory muscles; may have lesser or equal limb involvement and ocular weakness of any severity. A feeding tube without intubation places the patient in class IVb — highest pre-crisis tier.',
        },
        V: {
          label: 'MGFA Class V (intubated)',
          riskLevel: 'critical',
          interpretation: 'Defined by intubation, with or without mechanical ventilation, except when employed during routine postoperative management — myasthenic crisis.',
        },
      };
      const r = map[cls] ?? map.I;
      return {
        score: cls,
        label: r.label,
        interpretation: r.interpretation,
        riskLevel: r.riskLevel,
        details: [
          { label: 'Assigned class', value: `MGFA ${cls}` },
          { label: 'Basis', value: 'Most severely affected muscle group during the evaluation period' },
        ],
        recommendations: [
          'Pair the MGFA class with the Quantitative MG (QMG) score and MGFA Post-Intervention Status for follow-up.',
          'Class is defined by the worst muscle group — do not average across domains.',
          'B-predominant classes (IIb–IVb) warrant swallowing evaluation and pulmonary function (FVC/NIF) monitoring.',
        ],
        alerts:
          cls === 'V' || cls === 'IVb' || cls === 'IIIb'
            ? ['Oropharyngeal/respiratory-predominant disease — monitor for myasthenic crisis; measure FVC/NIF and secure airway contingency.']
            : undefined,
      };
    },
    evidence: {
      summary:
        'The MGFA Clinical Classification stratifies MG by the most severely affected muscle group: Class I = isolated ocular; Class II = mild non-ocular weakness; III = moderate; IV = severe; V = intubation. Classes II–IV are subdivided (a = predominantly limb/axial; b = predominantly oropharyngeal/respiratory). Ocular weakness of any severity may coexist in II–IV.',
      formula: 'Class assigned by the worst affected muscle group; a/b suffix = predominant distribution (limb/axial vs oropharyngeal/respiratory).',
      validation:
        'Developed by the MGFA Medical/Scientific Advisory Board Task Force as the consensus classification for clinical research; published simultaneously in Annals of Thoracic Surgery and Neurology (2000) and remains the standard MG severity taxonomy.',
      references: [
        {
          title: 'Myasthenia gravis: recommendations for clinical research standards. Task Force of the Medical Scientific Advisory Board of the Myasthenia Gravis Foundation of America',
          citation: 'Jaretzki A 3rd, Barohn RJ, Ernstoff RM, et al. Ann Thorac Surg. 2000;70(1):327-334',
          year: 2000,
          pmid: '10921745',
          doi: '10.1016/s0003-4975(00)01595-2',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Class IIIb, IVb, or V',
        actions: ['Measure FVC and NIF', 'Swallowing/aspiration evaluation', 'Escalate immunotherapy; plan airway and ICU contingencies'],
      },
      {
        condition: 'Class I–II',
        actions: ['Symptomatic therapy (e.g., pyridostigmine) and monitoring', 'Reassess periodically for generalization'],
      },
      {
        condition: 'Any class',
        actions: ['Document MGFA Post-Intervention Status at follow-up', 'Consider QMG for objective serial measurement'],
      },
    ],
    pearls: [
      'A feeding tube without intubation is class IVb; intubation (outside routine post-op care) is class V.',
      'Use the worst weakness during the evaluation period — MG fluctuates, so a snapshot exam can understate severity.',
      'The "b" subdivision flags bulbar/respiratory predominance, which carries the highest risk of crisis.',
    ],
  },

  // ─── 5. ONLS ───────────────────────────────────────────────────────────────
  {
    id: 'onls',
    name: 'Overall Neuropathy Limitations Scale (ONLS)',
    shortName: 'ONLS',
    description:
      'Disability scale for peripheral neuropathy: arm grade (0–5) + leg grade (0–7) = total 0–12. Derived from the ODSS with added running/stair assessment.',
    category: 'neurology',
    tags: ['neuropathy', 'onls', 'odss', 'gbs', 'cidp', 'disability', 'peripheral nerve'],
    whenToUse:
      'Quantifying activity limitation from peripheral neuropathy — especially Guillain-Barré syndrome, CIDP, and paraprotein-associated demyelinating neuropathy — for baseline severity and treatment response.',
    whyUse:
      'The ONLS extends the Overall Disability Sum Score with running/stair questions to reduce its ceiling effect. It is the standard disability endpoint in immune-neuropathy trials; a 1-point step in either grade is a clinically meaningful change (except arm grade 0↔1).',
    inputs: [
      selectInput('arm', 'Arm grade', [
        { label: '0 — Normal', value: 0, points: 0 },
        { label: '1 — Minor symptoms in one or both arms but not affecting any listed function', value: 1, points: 1 },
        { label: '2 — Disability in one or both arms affecting but not preventing any listed function', value: 2, points: 2 },
        { label: '3 — Disability in one or both arms preventing at least one but not all listed functions', value: 3, points: 3 },
        { label: '4 — Disability in both arms preventing all listed functions but purposeful movement still possible', value: 4, points: 4 },
        { label: '5 — Disability in both arms preventing all purposeful movements', value: 5, points: 5 },
      ], 1, 'Listed arm functions: washing and drying the whole body, brushing teeth, dressing/undressing (including buttons and zips), eating and drinking, and using a knife and fork together.'),
      selectInput('leg', 'Leg grade', [
        { label: '0 — Walking/climbing stairs/running not affected', value: 0, points: 0 },
        { label: '1 — Walking/climbing stairs/running affected, but gait does not look abnormal', value: 1, points: 1 },
        { label: '2 — Walks independently but gait looks abnormal', value: 2, points: 2 },
        { label: '3 — Requires unilateral support to walk 10 m (stick, single crutch, one arm)', value: 3, points: 3 },
        { label: '4 — Requires bilateral support to walk 10 m (sticks, crutches, crutch and arm, frame)', value: 4, points: 4 },
        { label: '5 — Requires wheelchair to travel 10 m but can stand and walk 1 m with the help of one person', value: 5, points: 5 },
        { label: '6 — Restricted to wheelchair; cannot stand and walk 1 m with help, but makes some purposeful leg movements', value: 6, points: 6 },
        { label: '7 — Restricted to wheelchair or bed most of the day; no purposeful leg movements', value: 7, points: 7 },
      ], 2, 'Based on difficulty running/climbing stairs, difficulty walking, gait appearance, 10 m mobility aid requirement, and ankle-foot orthosis use.'),
    ],
    calculate(values) {
      const arm = num(values.arm);
      const leg = num(values.leg);
      const score = arm + leg;
      const band = riskFromThresholds(score, [
        { max: 1, level: 'low', label: 'Minimal limitation', interpretation: 'ONLS ≤1 — minimal or no activity limitation from neuropathy. Note: arm-grade 0↔1 changes are not considered clinically significant on the adjusted ONLS.' },
        { max: 4, level: 'moderate', label: 'Mild–moderate limitation', interpretation: 'ONLS 2–4 — independent ambulation preserved but function clearly limited. Review disease-modifying treatment and rehabilitation needs.' },
        { max: 7, level: 'high', label: 'Marked limitation', interpretation: 'ONLS 5–7 — walking aids or equivalent limitation. Escalate immunotherapy review, physiotherapy, and fall prevention.' },
        { max: 12, level: 'critical', label: 'Severe limitation', interpretation: 'ONLS ≥8 — wheelchair dependence or near-total limitation. Specialist review; comprehensive rehabilitation and support services.' },
      ]);
      return {
        score,
        unit: '/12',
        label: band.label,
        interpretation: `${band.interpretation} Total = arm grade (${arm}/5) + leg grade (${leg}/7); higher = more limitation.`,
        riskLevel: band.riskLevel,
        details: [
          { label: 'Arm grade', value: `${arm} / 5` },
          { label: 'Leg grade', value: `${leg} / 7` },
          { label: 'Clinically meaningful change', value: '1-point step in either grade (except arm 0↔1)' },
        ],
        recommendations: [
          'Track the arm and leg grades separately — a 1-point step in either is clinically meaningful.',
          'The adjusted ONLS ignores arm-grade changes between 0 and 1 when judging treatment response.',
          'Use alongside impairment measures (e.g., MRC sum score, grip strength) and nerve conduction findings.',
        ],
      };
    },
    evidence: {
      summary:
        'The ONLS modifies the Overall Disability Sum Score by adding difficulty running/climbing stairs to the leg checklist. Arm grade 0–5 and leg grade 0–7 sum to 0–12; 0 = no limitations and 5/7 = no purposeful movement.',
      formula: 'ONLS = arm grade (0–5) + leg grade (0–7).',
      validation:
        'Graham & Hughes (2006) showed the ONLS retains the reliability and validity of the ODSS in GBS, CIDP, and paraprotein-associated demyelinating neuropathy while reducing the ceiling effect; it is widely used as the disability endpoint in immune-neuropathy studies.',
      references: [
        {
          title: 'A modified peripheral neuropathy scale: the Overall Neuropathy Limitations Scale',
          citation: 'Graham RC, Hughes RA. J Neurol Neurosurg Psychiatry. 2006;77(8):973-976',
          year: 2006,
          doi: '10.1136/jnnp.2005.081547',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Leg grade ≥3',
        actions: ['Physiotherapy and gait-aid assessment', 'Fall-prevention plan', 'Review immunotherapy adequacy in immune-mediated neuropathy'],
      },
      {
        condition: 'Arm grade ≥3',
        actions: ['Occupational therapy assessment', 'Adaptive equipment for feeding, grooming, and dressing'],
      },
      {
        condition: 'Any score',
        actions: ['Re-score at each visit; document arm and leg grades separately', 'Use adjusted ONLS convention for response assessment'],
      },
    ],
    pearls: [
      'Score the worst consistent performance — the scale measures limitation, not momentary fatigue.',
      'Ankle-foot orthoses inform the leg-grade decision but are not a separate scored item.',
      'A 1-point step in either grade is a real change — except arm grade 0↔1, which the adjusted ONLS disregards.',
    ],
  },

  // ─── 6. Clinical Dementia Rating ───────────────────────────────────────────
  {
    id: 'cdr-dementia',
    name: 'Clinical Dementia Rating (CDR) Scale',
    shortName: 'CDR',
    description:
      'Six-domain dementia staging scale. Computes the global CDR (Washington University algorithm, memory-weighted) and the CDR Sum of Boxes (0–18).',
    category: 'neurology',
    tags: ['dementia', 'cdr', 'alzheimer', 'cognition', 'memory', 'staging', 'sum of boxes'],
    isQuestionnaire: true,
    whenToUse:
      'Staging dementia severity (typically Alzheimer disease) after a semistructured interview with the patient and a reliable informant; also used for trial eligibility and longitudinal tracking.',
    whyUse:
      'The global CDR is the standard dementia staging instrument; the CDR Sum of Boxes adds granularity within stages for monitoring progression. Both derive from the same six box scores.',
    inputs: [
      selectInput('memory', 'Memory (M)', [
        { label: 'No memory loss or slight inconsistent forgetfulness', value: 0, points: 0 },
        { label: 'Mild consistent forgetfulness; partial recollection of events; "benign" forgetfulness', value: 0.5, points: 0.5 },
        { label: 'Moderate memory loss; more marked for recent events; interferes with everyday activities', value: 1, points: 1 },
        { label: 'Severe memory loss; only highly learned material retained; new material rapidly lost', value: 2, points: 2 },
        { label: 'Severe memory loss; only fragments remain', value: 3, points: 3 },
      ], 1, 'Primary category for the global CDR algorithm.'),
      selectInput('orientation', 'Orientation (O)', [
        { label: 'Fully oriented', value: 0, points: 0 },
        { label: 'Fully oriented except for slight difficulty with time relationships', value: 0.5, points: 0.5 },
        { label: 'Moderate difficulty with time relationships; oriented for place and person at examination but may have geographic disorientation', value: 1, points: 1 },
        { label: 'Severe difficulty with time relationships; usually disoriented to time, often to place', value: 2, points: 2 },
        { label: 'Oriented to person only', value: 3, points: 3 },
      ], 0.5, 'Secondary category.'),
      selectInput('judgment', 'Judgment and problem solving (JPS)', [
        { label: 'Solves everyday problems well; judgment good in relation to past performance', value: 0, points: 0 },
        { label: 'Slight impairment in solving problems, similarities, and differences', value: 0.5, points: 0.5 },
        { label: 'Moderate difficulty in handling complex problems; social judgment usually maintained', value: 1, points: 1 },
        { label: 'Severely impaired in handling problems, similarities, and differences; social judgment usually impaired', value: 2, points: 2 },
        { label: 'Unable to make judgments or solve problems', value: 3, points: 3 },
      ], 0.5, 'Secondary category.'),
      selectInput('community', 'Community affairs (CA)', [
        { label: 'Independent function at usual level in job, shopping, business and financial affairs, volunteer and social groups', value: 0, points: 0 },
        { label: 'Slight impairment in these activities', value: 0.5, points: 0.5 },
        { label: 'Unable to function independently at these activities although may still be engaged in some; appears normal to casual inspection', value: 1, points: 1 },
        { label: 'No pretense of independent function outside home; appears well enough to be taken to functions outside a family home', value: 2, points: 2 },
        { label: 'No pretense of independent function outside home; appears too ill to be taken to functions outside a family home', value: 3, points: 3 },
      ], 0.5, 'Secondary category.'),
      selectInput('homeHobbies', 'Home and hobbies (HH)', [
        { label: 'Life at home, hobbies, and intellectual interests well maintained', value: 0, points: 0 },
        { label: 'Life at home, hobbies, and intellectual interests slightly impaired', value: 0.5, points: 0.5 },
        { label: 'Mild but definite impairment of function at home; more difficult chores abandoned; more complicated hobbies and interests abandoned', value: 1, points: 1 },
        { label: 'Only simple chores preserved; very restricted interests, poorly maintained', value: 2, points: 2 },
        { label: 'No significant function in home', value: 3, points: 3 },
      ], 0.5, 'Secondary category.'),
      selectInput('personalCare', 'Personal care (PC)', [
        { label: 'Fully capable of self-care', value: 0, points: 0 },
        { label: 'Needs prompting', value: 1, points: 1 },
        { label: 'Requires assistance in dressing, hygiene, keeping of personal effects', value: 2, points: 2 },
        { label: 'Requires much help with personal care; frequent incontinence', value: 3, points: 3 },
      ], 0, 'Secondary category — by convention, personal care has no 0.5 rating.'),
    ],
    calculate(values) {
      const m = num(values.memory);
      const sec = [
        num(values.orientation),
        num(values.judgment),
        num(values.community),
        num(values.homeHobbies),
        num(values.personalCare),
      ];
      const global = cdrGlobal(m, sec);
      const sob = m + sec.reduce((a, b) => a + b, 0);
      const stage =
        global === 0
          ? { label: 'CDR 0 — no dementia', level: 'normal' as const }
          : global === 0.5
            ? { label: 'CDR 0.5 — very mild/questionable dementia', level: 'low' as const }
            : global === 1
              ? { label: 'CDR 1 — mild dementia', level: 'moderate' as const }
              : global === 2
                ? { label: 'CDR 2 — moderate dementia', level: 'high' as const }
                : { label: 'CDR 3 — severe dementia', level: 'critical' as const };
      return {
        score: global,
        label: stage.label,
        interpretation: `Global CDR ${global} (0 = none, 0.5 = questionable/very mild, 1 = mild, 2 = moderate, 3 = severe). CDR Sum of Boxes = ${sob}/18, which gives finer granularity within stages.`,
        riskLevel: stage.level,
        details: [
          { label: 'Memory (primary)', value: `${m}` },
          { label: 'Orientation', value: `${sec[0]}` },
          { label: 'Judgment & problem solving', value: `${sec[1]}` },
          { label: 'Community affairs', value: `${sec[2]}` },
          { label: 'Home & hobbies', value: `${sec[3]}` },
          { label: 'Personal care', value: `${sec[4]}` },
          { label: 'CDR Sum of Boxes', value: `${sob} / 18` },
        ],
        recommendations: [
          'Base box scores on interviews with both the patient and a reliable informant — the CDR is not a bedside cognitive test.',
          'Use CDR-SOB for tracking progression within a stage.',
          'For Alzheimer disease, mild–moderate severity supports cholinesterase-inhibitor trials; moderate–severe supports memantine; early AD may qualify for amyloid-targeting therapy evaluation.',
        ],
      };
    },
    evidence: {
      summary:
        'The CDR rates six domains — memory (primary), orientation, judgment & problem solving, community affairs, home & hobbies, and personal care — on a 0/0.5/1/2/3 scale (personal care 0–3). The global CDR applies the Washington University scoring rules: CDR = M when ≥3 secondary categories equal M, the majority secondary score when ≥3 lie on one side (except the 3-vs-2 split, which returns M), with special rules for M = 0 and M = 0.5. CDR-SOB is the simple sum (0–18).',
      formula: 'Global CDR by WashU algorithm (memory-weighted); CDR-SOB = sum of all 6 box scores (0–18).',
      validation:
        'Implemented per the published Morris (1993) scoring rules including tie-breaking (tied secondary scores closest to M), the M = 0.5 rule (CDR = 1 when ≥3 secondary categories ≥1), the M = 0 rule (CDR = 0.5 when ≥2 secondary categories impaired), and the floor that CDR cannot be 0 when M ≥ 1. Validated neuropathologically and standardized for multicenter use (CERAD, ADCS).',
      references: [
        {
          title: 'The Clinical Dementia Rating (CDR): current version and scoring rules',
          citation: 'Morris JC. Neurology. 1993;43(11):2412-2414',
          year: 1993,
          pmid: '8232972',
          doi: '10.1212/wnl.43.11.2412-a',
        },
        {
          title: 'A new clinical scale for the staging of dementia',
          citation: 'Hughes CP, Berg L, Danziger WL, et al. Br J Psychiatry. 1982;140:566-572',
          year: 1982,
          pmid: '7104545',
          doi: '10.1192/bjp.140.6.566',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'CDR ≥0.5',
        actions: ['Confirm with informant-based interview and cognitive testing (e.g., MoCA)', 'Exclude reversible causes (B12, TSH, depression, medications, structural lesions)', 'Discuss driving, safety, and advance planning'],
      },
      {
        condition: 'CDR 1–2 (mild–moderate)',
        actions: ['Consider cholinesterase inhibitor if Alzheimer disease', 'Caregiver education and support services', 'Specialist referral for biomarker/therapy eligibility'],
      },
      {
        condition: 'CDR 3 (severe)',
        actions: ['Memantine consideration', 'Comprehensive caregiver support', 'Home safety, supervision, and long-term care planning'],
      },
    ],
    pearls: [
      'Memory is the primary category — the global score weights it above the other five boxes.',
      'Personal care has no 0.5 rating by convention.',
      'CDR-SOB is more sensitive to within-stage change than the global score — use both.',
      'A CDR of 0.5 corresponds to questionable/very mild impairment (often MCI) — it does not by itself diagnose dementia.',
    ],
  },

  // ─── 7. NINCDS-ADRDA ───────────────────────────────────────────────────────
  {
    id: 'nincds-adrda',
    name: 'NINCDS-ADRDA Criteria for Alzheimer Disease',
    shortName: 'NINCDS-ADRDA',
    description:
      '1984 McKhann criteria for Alzheimer disease: definite (probable + histopathology), probable (all 6 criteria), or possible (alternative presentations) AD.',
    category: 'neurology',
    tags: ['alzheimer', 'dementia', 'nincds', 'adrda', 'diagnosis', 'mckhann'],
    isQuestionnaire: true,
    whenToUse:
      'Diagnostic classification of Alzheimer disease in clinical or research settings — the classic alternative to the newer biomarker-based IWG-2 criteria.',
    whyUse:
      'The NINCDS-ADRDA criteria operationalize probable, possible, and definite AD. Probable AD requires all six clinical criteria; definite AD adds histopathologic confirmation.',
    inputs: [
      yesNo('pDementia', 'Dementia established by clinical exam and confirmed by neuropsychological tests', null, 'Probable criterion 1 of 6: dementia documented by the Mini-Mental Test, Blessed Dementia Scale, or similar, and confirmed by neuropsychological testing.', true),
      yesNo('pTwoDeficits', 'Deficits in ≥2 areas of cognition', null, 'Probable criterion 2 of 6: two or more cognitive domains impaired (e.g., memory plus language or visuospatial function).', true),
      yesNo('pProgressive', 'Progressive worsening of memory and other cognitive functions', null, 'Probable criterion 3 of 6: documented progressive decline.', true),
      yesNo('pConscious', 'No disturbance of consciousness', null, 'Probable criterion 4 of 6: the deficits occur without clouded consciousness (no delirium).', true),
      yesNo('pOnset', 'Onset between ages 40 and 90 years', null, 'Probable criterion 5 of 6: onset after age 40 and before age 90, most often after 65.', true),
      yesNo('pExclude', 'Absence of other disorders that could account for the deficits', null, 'Probable criterion 6 of 6: no systemic or brain disease sufficient to explain the progressive memory/cognitive deficits.', true),
      yesNo('xVariant', 'Atypical onset, presentation, or course without another sufficient cause', null, 'POSSIBLE AD pattern 1: dementia syndrome with variations in onset, presentation, or clinical course, in the absence of other disorders sufficient to cause dementia.', false),
      yesNo('xSecond', 'Second systemic or brain disorder present but not considered the cause', null, 'POSSIBLE AD pattern 2: a second systemic or brain disorder sufficient to produce dementia is present but is not considered the cause.', false),
      yesNo('xSingle', 'Single, gradually progressive severe cognitive deficit without other cause', null, 'POSSIBLE AD pattern 3 (research use): a single, gradually progressive severe cognitive deficit in the absence of another identifiable cause.', false),
      yesNo('histo', 'Histopathologic evidence (biopsy or autopsy)', null, 'Required for DEFINITE AD — plus all criteria for probable AD.', false),
    ],
    calculate(values) {
      const probable = [
        values.pDementia,
        values.pTwoDeficits,
        values.pProgressive,
        values.pConscious,
        values.pOnset,
        values.pExclude,
      ].every((v) => bool(v));
      const anyPossible = bool(values.xVariant) || bool(values.xSecond) || bool(values.xSingle);
      const histo = bool(values.histo);
      const probableMet = [
        bool(values.pDementia),
        bool(values.pTwoDeficits),
        bool(values.pProgressive),
        bool(values.pConscious),
        bool(values.pOnset),
        bool(values.pExclude),
      ].filter(Boolean).length;
      let label: string;
      let interpretation: string;
      let riskLevel: 'low' | 'moderate' | 'high' | 'info';
      if (probable && histo) {
        label = 'Definite Alzheimer disease';
        interpretation = 'All six probable-AD criteria are met AND histopathologic evidence is present — definite AD by NINCDS-ADRDA.';
        riskLevel = 'high';
      } else if (probable) {
        label = 'Probable Alzheimer disease';
        interpretation = 'All six probable-AD criteria are met — probable AD. Definite AD additionally requires histopathologic confirmation (biopsy or autopsy).';
        riskLevel = 'high';
      } else if (anyPossible) {
        label = 'Possible Alzheimer disease';
        interpretation = `Probable criteria are incomplete (${probableMet}/6 met) but a possible-AD pattern applies (atypical course, a second non-causative disorder, or a single progressive deficit). Possible AD by NINCDS-ADRDA.`;
        riskLevel = 'moderate';
      } else {
        label = 'Criteria not met';
        interpretation = `Only ${probableMet}/6 probable criteria are met and no possible-AD pattern applies — NINCDS-ADRDA criteria for AD are not fulfilled. Reconsider alternative diagnoses.`;
        riskLevel = 'info';
      }
      return {
        score: label,
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Probable criteria met', value: `${probableMet} / 6` },
          { label: 'Possible-AD pattern present', value: anyPossible ? 'Yes' : 'No' },
          { label: 'Histopathologic evidence', value: histo ? 'Yes' : 'No' },
        ],
        recommendations: [
          'Exclude reversible causes (B12 deficiency, hypothyroidism, depression, structural lesions, delirium) before diagnosing probable AD.',
          'Consider biomarker confirmation (amyloid/tau PET or CSF) where available — modern criteria incorporate these.',
          'Possible or atypical presentations warrant specialist evaluation for alternative or mixed dementias.',
        ],
      };
    },
    evidence: {
      summary:
        'The 1984 NINCDS-ADRDA Work Group criteria: probable AD requires dementia confirmed by neuropsychological testing, deficits in ≥2 cognitive domains, progressive course, no disturbance of consciousness, onset age 40–90, and exclusion of other causes. Possible AD covers atypical courses, coincident non-causative disorders, or a single progressive deficit. Definite AD = probable AD + histopathology.',
      formula: 'Probable AD = all 6 criteria; possible AD = one of 3 alternative patterns; definite AD = probable + histopathology.',
      validation:
        'The criteria showed high accuracy for probable AD against neuropathology (sensitivity ~81%, specificity ~73% in classic studies) and remain a reference standard, though modern biomarker criteria (IWG-2, NIA-AA) refine early and atypical diagnosis.',
      references: [
        {
          title: 'Clinical diagnosis of Alzheimer disease: report of the NINCDS-ADRDA Work Group under the auspices of Department of Health and Human Services Task Force on Alzheimer Disease',
          citation: 'McKhann G, Drachman D, Folstein M, et al. Neurology. 1984;34(7):939-944',
          year: 1984,
          pmid: '6610841',
          doi: '10.1212/wnl.34.7.939',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Probable or definite AD',
        actions: ['Stage severity (e.g., CDR)', 'Discuss cholinesterase inhibitor therapy', 'Caregiver support, driving/safety assessment, advance care planning'],
      },
      {
        condition: 'Possible AD',
        actions: ['Specialist evaluation for mixed or alternative dementia', 'Biomarker or imaging work-up where available', 'Re-evaluate after treating comorbid contributors'],
      },
      {
        condition: 'Criteria not met',
        actions: ['Screen for depression, delirium, medication effects, and other dementias', 'Repeat neuropsychological assessment over time'],
      },
    ],
    pearls: [
      'Probable AD is an exclusion diagnosis — every criterion must be present.',
      'Definite AD still requires histopathology under these 1984 criteria; biomarker evidence alone does not make "definite" here.',
      'Onset must be age 40–90 — very early or very late presentations fall outside probable AD.',
    ],
  },

  // ─── 8. mTOQ-4 ─────────────────────────────────────────────────────────────
  {
    id: 'mtoq-4',
    name: 'Migraine Treatment Optimization Questionnaire-4 (mTOQ-4)',
    shortName: 'mTOQ-4',
    description:
      'Four-item questionnaire on acute migraine treatment efficacy (0–8): 2-hour pain freedom, 24-hour sustained relief, ability to plan activities, and perceived control.',
    category: 'neurology',
    tags: ['migraine', 'mtoq', 'mtoq-4', 'headache', 'acute treatment', 'treatment optimization'],
    isQuestionnaire: true,
    whenToUse:
      'Assessing whether a patient’s current acute migraine medication is working — at follow-up visits or when deciding to switch acute therapy.',
    whyUse:
      'The mTOQ-4 is validated against outcomes including new-onset chronic migraine: inadequate acute treatment efficacy is associated with chronification, so a low score is a prompt to optimize therapy.',
    inputs: [
      selectInput('painfree', 'After taking your migraine medication, are you pain-free within 2 hours for most attacks?', [
        { label: 'Never or rarely', value: 0, points: 0 },
        { label: 'Less than half the time', value: 1, points: 1 },
        { label: 'Half the time or greater', value: 2, points: 2 },
      ], 2, 'Ask about the medication(s) currently used to treat headaches.'),
      selectInput('sustained', 'Does 1 dose usually relieve your headache and keep it away for at least 24 hours?', [
        { label: 'Never or rarely', value: 0, points: 0 },
        { label: 'Less than half the time', value: 1, points: 1 },
        { label: 'Half the time or greater', value: 2, points: 2 },
      ], 2, 'Sustained relief item.'),
      selectInput('plan', 'Are you comfortable enough with your migraine medication to be able to plan your daily activities?', [
        { label: 'Never or rarely', value: 0, points: 0 },
        { label: 'Less than half the time', value: 1, points: 1 },
        { label: 'Half the time or greater', value: 2, points: 2 },
      ], 2, 'Confidence/planning item.'),
      selectInput('control', 'After taking your medication, do you feel in control of your migraines enough to return to normal function?', [
        { label: 'Never or rarely', value: 0, points: 0 },
        { label: 'Less than half the time', value: 1, points: 1 },
        { label: 'Half the time or greater', value: 2, points: 2 },
      ], 2, 'Perceived control item.'),
    ],
    calculate(values) {
      const score =
        num(values.painfree) + num(values.sustained) + num(values.plan) + num(values.control);
      const band = riskFromThresholds(score, [
        { max: 0, level: 'high', label: 'Very poor treatment efficacy', interpretation: 'mTOQ-4 = 0 — very poor acute treatment efficacy. Change the acute-treatment strategy; inadequate efficacy is associated with new-onset chronic migraine.' },
        { max: 5, level: 'moderate', label: 'Poor treatment efficacy', interpretation: 'mTOQ-4 1–5 — poor efficacy. Discuss alternative acute treatments (class switch, dose/formulation change, treating earlier in the attack).' },
        { max: 7, level: 'low', label: 'Moderate treatment efficacy', interpretation: 'mTOQ-4 6–7 — moderate efficacy. Fine-tune therapy and attack-treatment timing; review for residual gaps.' },
        { max: 8, level: 'normal', label: 'Maximum treatment efficacy', interpretation: 'mTOQ-4 = 8 — maximum efficacy. Continue current acute therapy and reassess periodically.' },
      ]);
      return {
        score,
        unit: '/8',
        label: band.label,
        interpretation: `${band.interpretation} Response options: never/rarely = 0, <half the time = 1, ≥half the time = 2.`,
        riskLevel: band.riskLevel,
        details: [
          { label: 'Pain-free within 2 h', value: `${num(values.painfree)} / 2` },
          { label: 'Sustained 24-h relief', value: `${num(values.sustained)} / 2` },
          { label: 'Can plan daily activities', value: `${num(values.plan)} / 2` },
          { label: 'Feels in control / normal function', value: `${num(values.control)} / 2` },
        ],
        recommendations:
          score < 8
            ? [
                'Discuss alternative acute treatments — dose optimization, alternate triptan, gepant/ditan, or combination strategies.',
                'Review attack timing (treat early while pain is mild), formulation (non-oral if vomiting), and medication-overuse risk.',
              ]
            : ['Continue current regimen; reassess if attack frequency or response changes.'],
      };
    },
    evidence: {
      summary:
        'The mTOQ-4 asks about 2-hour pain freedom, 24-hour sustained relief, ability to plan daily activities, and perceived control with current acute medication. Responses score never/rarely = 0, less than half the time = 1, half the time or more = 2 (total 0–8): 0 = very poor, 1–5 = poor, 6–7 = moderate, 8 = maximum treatment efficacy.',
      formula: 'mTOQ-4 = sum of 4 items (0–2 each); bands 0 / 1–5 / 6–7 / 8.',
      validation:
        'Derived from the validated mTOQ questionnaire; in the AMPP study the 4-item version predicted new-onset chronic migraine (ineffective acute treatment increased chronification risk). It is included in the American Headache Society consensus as a treatment-response measure.',
      references: [
        {
          title: 'Validity and reliability of the migraine-treatment optimization questionnaire',
          citation: 'Lipton RB, Kolodner K, Bigal ME, et al. Cephalalgia. 2009;29(7):751-759',
          year: 2009,
          doi: '10.1111/j.1468-2982.2008.01786.x',
        },
        {
          title: 'Ineffective acute treatment of episodic migraine is associated with new-onset chronic migraine',
          citation: 'Lipton RB, Fanning KM, Serrano D, et al. Neurology. 2015;84(7):688-695',
          year: 2015,
          doi: '10.1212/WNL.0000000000001256',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Score 0–5 (very poor/poor)',
        actions: ['Switch or optimize acute therapy (class, dose, formulation)', 'Screen for medication overuse headache', 'Consider preventive therapy if attack frequency is high'],
      },
      {
        condition: 'Score 6–7 (moderate)',
        actions: ['Treat earlier in the attack', 'Address residual efficacy gaps (e.g., add NSAID or antiemetic)'],
      },
      {
        condition: 'Score 8',
        actions: ['Maintain current plan', 'Monitor for medication-overuse thresholds (triptans ≤9 days/month, simple analgesics ≤14 days/month)'],
      },
    ],
    pearls: [
      'Ask about the medication actually being used — the mTOQ-4 rates current acute therapy, not migraine overall.',
      'A suboptimal score is a treatment-optimization trigger: inadequate acute efficacy predicts progression to chronic migraine.',
      'The 4-item version drops the tolerability question — assess side effects separately.',
    ],
  },

  // ─── 9. Webster Rating Scale ───────────────────────────────────────────────
  {
    id: 'webster-pd',
    name: 'Webster Rating Scale for Parkinson Disease',
    shortName: 'Webster',
    description:
      'Ten-item clinician-rated disability scale for Parkinson disease (0–30): bradykinesia, rigidity, posture, arm swing, gait, tremor, facies, seborrhea, speech, and self-care.',
    category: 'neurology',
    tags: ['parkinson', 'webster', 'disability', 'rating scale', 'movement disorder'],
    status: 'legacy',
    isQuestionnaire: true,
    whenToUse:
      'Historical/secondary quantification of overall Parkinson disease disability. The MDS-UPDRS and Hoehn & Yahr are preferred in contemporary practice.',
    whyUse:
      'The Webster scale (1968) was among the first standardized PD disability measures and still appears in older literature and some clinics; each of 10 items scores 0–3.',
    inputs: [
      selectInput('bradykinesia', 'Bradykinesia of hands', [
        { label: 'None', value: 0, points: 0 },
        { label: 'Detectable slowing of supination-pronation rate; beginning difficulty in hand dexterity', value: 1, points: 1 },
        { label: 'Moderate slowing of supination-pronation rate (1 or both sides); moderately impaired hand function; micrographia present', value: 2, points: 2 },
        { label: 'Severe slowing of supination-pronation rate; unable to write; marked difficulty with utensils', value: 3, points: 3 },
      ], 1, 'Rapid alternating hand movements and handwriting.'),
      selectInput('rigidity', 'Rigidity', [
        { label: 'Non-detectable', value: 0, points: 0 },
        { label: 'Detectable rigidity in neck and shoulders; activation phenomenon present; mild negative resting arm rigidity (1 or both)', value: 1, points: 1 },
        { label: 'Moderate rigidity (neck and shoulders); resting rigidity present if not on meds', value: 2, points: 2 },
        { label: 'Severe rigidity (neck and shoulders); resting rigidity cannot be reversed by meds', value: 3, points: 3 },
      ], 1, 'Includes activation phenomenon and response to medication.'),
      selectInput('posture', 'Posture', [
        { label: 'Normal posture; head flexed forward <4 inches', value: 0, points: 0 },
        { label: 'Beginning poker spine; head flexed forward >5 inches', value: 1, points: 1 },
        { label: 'Beginning arm flexion; head flexed up to 6 inches; 1 or both arms raised but still below waist', value: 2, points: 2 },
        { label: 'Simian posture onset; head flexed forward >6 inches; hands elevated above waist; hands sharply flexed; beginning interphalangeal extension, knees flexed', value: 3, points: 3 },
      ], 1, 'Observe standing posture and arm position.'),
      selectInput('armSwing', 'Upper extremity swing', [
        { label: 'Swings both arms well', value: 0, points: 0 },
        { label: 'One arm swing definitely decreased', value: 1, points: 1 },
        { label: 'One arm fails to swing', value: 2, points: 2 },
        { label: 'Both arms fail to swing', value: 3, points: 3 },
      ], 1, 'Observe spontaneous arm swing while walking.'),
      selectInput('gait', 'Gait', [
        { label: 'Steps out well with 18–30 inch stride; turns about effortlessly', value: 0, points: 0 },
        { label: 'Gait shortened to 12–18 inch stride; beginning to strike one heel; turnaround time slowing; requires several steps', value: 1, points: 1 },
        { label: 'Stride moderately shortened to 6–12 inches; both heels starting to strike floor forcefully', value: 2, points: 2 },
        { label: 'Onset of shuffling gait; steps <3 inches; occasional stuttering-type or blocking gait; walks on toes; turns around very slowly', value: 3, points: 3 },
      ], 1, 'Stride length, heel strike, turning, and festination/blocking.'),
      selectInput('tremor', 'Tremor', [
        { label: 'No detectable tremor', value: 0, points: 0 },
        { label: '<1 inch of peak-to-peak tremor movement (limbs or head) at rest or in either hand while walking or during finger-to-nose test', value: 1, points: 1 },
        { label: 'Maximum tremor envelope fails to exceed 4 inches; severe but not constant tremor; retains some hand control', value: 2, points: 2 },
        { label: 'Tremor envelope >4 inches; constant severe tremor; persistent while awake unless pure cerebellar type; writing and feeding self impossible', value: 3, points: 3 },
      ], 1, 'Rate the largest tremor amplitude observed.'),
      selectInput('facies', 'Facies', [
        { label: 'Normal; full animation; no stare', value: 0, points: 0 },
        { label: 'Detectable immobility; mouth closed; beginning anxiety/depression features', value: 1, points: 1 },
        { label: 'Moderate immobility; emotion breaks through at markedly increased threshold; lips parted sometimes; moderate appearance of anxiety/depression; drooling may be present', value: 2, points: 2 },
        { label: 'Frozen facies; mouth opens ≥0.25 inch; severe drooling', value: 3, points: 3 },
      ], 1, 'Facial animation, mouth position, and drooling.'),
      selectInput('seborrhea', 'Seborrhea', [
        { label: 'None', value: 0, points: 0 },
        { label: 'Increased perspiration; secretions thin', value: 1, points: 1 },
        { label: 'Obvious oiliness present; secretion much thicker', value: 2, points: 2 },
        { label: 'Marked seborrhea; entire face and head covered by thick secretions', value: 3, points: 3 },
      ], 1, 'Facial oiliness and perspiration.'),
      selectInput('speech', 'Speech', [
        { label: 'Clear, loud, resonant, easily understood', value: 0, points: 0 },
        { label: 'Beginning of hoarseness; loss of inflection and resonance; good volume; still easily understood', value: 1, points: 1 },
        { label: 'Moderate hoarseness/weakness; constant monotone unvaried pitch; beginning of dysarthria, hesitance, stuttering; difficult to understand', value: 2, points: 2 },
        { label: 'Marked harshness/weakness; very difficult to hear and understand', value: 3, points: 3 },
      ], 1, 'Volume, pitch variation, articulation, intelligibility.'),
      selectInput('selfCare', 'Self-care', [
        { label: 'No impairment', value: 0, points: 0 },
        { label: 'Still provides full self-care but rate of dressing definitely impeded; able to live alone; may be employable', value: 1, points: 1 },
        { label: 'Requires help in certain critical areas; very slow in performing most activities but manages by taking much time', value: 2, points: 2 },
        { label: 'Continuously disabled; unable to dress/feed self or walk alone', value: 3, points: 3 },
      ], 1, 'Global independence item.'),
    ],
    calculate(values) {
      const items = [
        { label: 'Bradykinesia of hands', v: num(values.bradykinesia) },
        { label: 'Rigidity', v: num(values.rigidity) },
        { label: 'Posture', v: num(values.posture) },
        { label: 'Upper extremity swing', v: num(values.armSwing) },
        { label: 'Gait', v: num(values.gait) },
        { label: 'Tremor', v: num(values.tremor) },
        { label: 'Facies', v: num(values.facies) },
        { label: 'Seborrhea', v: num(values.seborrhea) },
        { label: 'Speech', v: num(values.speech) },
        { label: 'Self-care', v: num(values.selfCare) },
      ];
      const score = items.reduce((a, b) => a + b.v, 0);
      const band = riskFromThresholds(score, [
        { max: 0, level: 'normal', label: 'No measurable disability', interpretation: 'Webster 0/30 — no detectable parkinsonian disability on this scale.' },
        { max: 10, level: 'low', label: 'Mild disability', interpretation: 'Webster 1–10/30 — mild disability (commonly used convention band). Track over time.' },
        { max: 20, level: 'moderate', label: 'Moderate disability', interpretation: 'Webster 11–20/30 — moderate disability (convention band). Review medication optimization and therapy services.' },
        { max: 30, level: 'high', label: 'Severe disability', interpretation: 'Webster 21–30/30 — severe disability (convention band). Consider advanced therapies and comprehensive support planning.' },
      ]);
      return {
        score,
        unit: '/30',
        label: band.label,
        interpretation: `${band.interpretation} Higher scores indicate greater disability.`,
        riskLevel: band.riskLevel,
        details: items.map((i) => ({ label: i.label, value: `${i.v} / 3` })),
        recommendations: [
          'For contemporary assessment and trials, prefer the MDS-UPDRS plus Hoehn & Yahr staging.',
          'Significant or rapid deterioration warrants medication review and evaluation for complications or comorbidity.',
        ],
      };
    },
    evidence: {
      summary:
        'The Webster scale rates 10 clinical features — bradykinesia of hands, rigidity, posture, upper-extremity swing, gait, tremor, facies, seborrhea, speech, and self-care — each 0–3 (total 0–30; higher = worse).',
      formula: 'Webster total = sum of 10 items, each 0–3 (maximum 30).',
      validation:
        'Published by Webster in 1968 as a standardized disability analysis for Parkinson disease and widely used in the levodopa-era literature. Mild 1–10, moderate 11–20, severe 21–30 are convention bands used in secondary sources rather than formal validated cutoffs; largely superseded by MDS-UPDRS.',
      references: [
        {
          title: 'Critical analysis of the disability in Parkinson disease',
          citation: 'Webster DD. Mod Treat. 1968;5(2):257-282',
          year: 1968,
          pmid: '5655944',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Score rising or ≥11',
        actions: ['Optimize dopaminergic therapy and dosing schedule', 'Physical, occupational, and speech therapy referrals', 'Evaluate for advanced therapies (e.g., DBS, infusion) when fluctuations emerge'],
      },
      {
        condition: 'Any score',
        actions: ['Confirm diagnosis and review for atypical parkinsonism if early falls, autonomic failure, or poor levodopa response', 'Screen non-motor features (mood, cognition, autonomic) not captured by this scale'],
      },
    ],
    pearls: [
      'The scale omits non-motor features — supplement with mood, cognition, and autonomic assessment.',
      'Rate during a defined medication state ("on" vs "off") and record which you used.',
      'This is a legacy instrument: for trials and most clinics, use MDS-UPDRS.',
    ],
  },

  // ─── 10. Schwab & England ADL ──────────────────────────────────────────────
  {
    id: 'schwab-england',
    name: 'Schwab and England Activities of Daily Living Scale',
    shortName: 'Schwab & England',
    description:
      'Global functional-independence rating (0–100% in 10% steps) developed for Parkinson disease; describes how completely and quickly the patient performs daily chores.',
    category: 'neurology',
    tags: ['parkinson', 'schwab', 'england', 'adl', 'functional status', 'independence'],
    whenToUse:
      'Quick global estimate of functional independence — originally for Parkinson disease but applied broadly to neurologic illness; useful as a clinician- or patient-rated snapshot and for serial trending.',
    whyUse:
      'The Schwab & England scale is the standard ADL percentage used in PD studies (it is the ADL section of the UPDRS Part II summary and appears in Hoehn & Yahr descriptions); a ≥10% decline is generally clinically meaningful.',
    inputs: [
      selectInput('pct', 'Level of independence', [
        { label: '100% — Completely independent: does all chores without difficulty; essentially normal; unaware of any difficulty', value: 100 },
        { label: '90% — Completely independent: all chores with some difficulty; may take twice as long; beginning to be aware of difficulty', value: 90 },
        { label: '80% — Mostly independent: chores take twice as long; conscious of difficulty and slowness', value: 80 },
        { label: '70% — Not completely independent: more difficulty with some chores; takes 3–4× longer for some; spends much of the day on chores', value: 70 },
        { label: '60% — Some dependency: can do most chores but exceedingly slowly and with much effort; errors; some chores impossible', value: 60 },
        { label: '50% — More dependent: needs help with half of chores; slower and has difficulty with everything', value: 50 },
        { label: '40% — Very dependent: can assist with all chores but does few alone', value: 40 },
        { label: '30% — Mostly dependent: with effort, can sometimes do a few chores alone or begin alone; much help needed', value: 30 },
        { label: '20% — Severely dependent: can help slightly with some chores but nothing alone', value: 20 },
        { label: '10% — Completely dependent: helpless; complete invalid', value: 10 },
        { label: '0% — Bedridden: vegetative functions such as swallowing, bladder, and bowel functions impaired', value: 0 },
      ], 80, 'Choose the description that best matches the patient’s current day-to-day function, not a single good or bad hour.'),
    ],
    calculate(values) {
      const pct = num(values.pct, 100);
      const band = riskFromThresholds(-pct, [
        { max: -80, level: 'low', label: 'Independent', interpretation: `${pct}% — independent in daily activities (≥80%). Routine monitoring; encourage exercise and fall-risk review.` },
        { max: -50, level: 'moderate', label: 'Partially dependent', interpretation: `${pct}% — partial dependence (50–70%). Needs help with some chores; arrange OT/PT, home safety evaluation, and caregiver support.` },
        { max: -20, level: 'high', label: 'Dependent', interpretation: `${pct}% — substantial dependence (20–40%). Much help needed; plan supervised living supports and caregiver services.` },
        { max: 0, level: 'critical', label: 'Fully dependent', interpretation: `${pct}% — complete dependence (0–10%). Comprehensive care planning, swallowing/skin/bowel-bladder care, and goals-of-care discussion.` },
      ]);
      return {
        score: pct,
        unit: '%',
        label: band.label,
        interpretation: `${band.interpretation} Higher percentage = more independent (100% = completely independent).`,
        riskLevel: band.riskLevel,
        details: [
          { label: 'Independence level', value: `${pct}%` },
          { label: 'Anchor', value: '100% = completely independent; 0% = bedridden, vegetative functions impaired' },
        ],
        recommendations: [
          'A decline of ≥10% between visits is generally clinically meaningful — investigate the cause.',
          'Pair with disease-specific scales (e.g., MDS-UPDRS, Hoehn & Yahr) for a complete picture.',
        ],
      };
    },
    evidence: {
      summary:
        'The Schwab & England scale rates functional independence in 11 grades from 100% (completely independent, essentially normal) to 0% (bedridden with impaired vegetative functions), describing speed, completeness, and errors in daily chores.',
      formula: 'Single percentage rating 0–100% in 10% increments.',
      validation:
        'Introduced by Schwab & England for the Third Symposium on Parkinson Disease (1969) as a projection technique for surgical evaluation; adopted into the UPDRS ADL section and PD research. It is a global rater estimate rather than an itemized instrument.',
      references: [
        {
          title: 'Projection technique for evaluating surgery in Parkinson disease',
          citation: 'Schwab RS, England AC Jr. In: Gillingham FJ, Donaldson MC, eds. Third Symposium on Parkinson Disease. Edinburgh: E & S Livingstone; 1969:152-157',
          year: 1969,
        },
      ],
    },
    nextSteps: [
      {
        condition: '≤70%',
        actions: ['Occupational and physical therapy assessment', 'Home safety and fall-prevention evaluation', 'Introduce caregiver support services'],
      },
      {
        condition: '≤40%',
        actions: ['Assess need for assisted living or caregiver hours', 'Swallowing, skin integrity, and bowel/bladder care review', 'Goals-of-care discussion'],
      },
      {
        condition: 'Any rating',
        actions: ['Trend the percentage over time', 'Document whether rated in medication "on" or "off" state for PD patients'],
      },
    ],
    pearls: [
      'Rate typical function across the day — not best or worst moments.',
      'For PD, record whether the rating reflects the "on" or "off" medication state; they can differ by 20% or more.',
      'The same anchors appear inside the UPDRS ADL section, so scores are often quoted alongside Hoehn & Yahr stage.',
    ],
  },

  // ─── 11. TDN Grade ─────────────────────────────────────────────────────────
  {
    id: 'tdn-grade',
    name: 'Therapy-Disability-Neurology (TDN) Grade',
    shortName: 'TDN Grade',
    description:
      'Multidimensional severity grade for neurosurgical adverse events: Therapy (T1–T5, Clavien-Dindo/Landriel-Ibañez based), Disability (D1–D5, mRS based), and Neurology (N1–N2, new deficit). The worst dimension sets the TDN grade.',
    category: 'neurology',
    tags: ['tdn', 'adverse events', 'neurosurgery', 'complications', 'clavien-dindo', 'mrs', 'grading'],
    whenToUse:
      'Grading the severity of adverse events or complications after neurosurgical (or other neurologic) interventions — for documentation, quality improvement, and research.',
    whyUse:
      'Therapy-only classifications (Clavien-Dindo, Landriel-Ibañez) underrate events that need no treatment — e.g., an untreatable new hemiparesis. The TDN adds disability (mRS) and new neurologic deficits, and correlates with length of stay, cost, and KPS deterioration.',
    inputs: [
      selectInput('therapy', 'Therapy dimension — what did the adverse event require?', [
        { label: 'T1 — No treatment/intervention, or only allowed modalities (antiemetics, antipyretics, analgesics, diuretics, electrolytes, physiotherapy, bedside opening of wound infection)', value: 1 },
        { label: 'T2 — Pharmacological treatment, blood transfusion, or total parenteral nutrition', value: 2 },
        { label: 'T3 — Surgical, endoscopic, or radiologic intervention', value: 3 },
        { label: 'T4 — Life-threatening; requires intensive care management', value: 4 },
        { label: 'T5 — Resulted in death', value: 5 },
      ], 1, 'Based on the Clavien-Dindo and Landriel-Ibañez classifications; use the most invasive therapy actually required by the adverse event.'),
      selectInput('disability', 'Disability dimension — worst mRS resulting from the event', [
        { label: 'D1 — No impact on daily activities (mRS 0–1)', value: 1 },
        { label: 'D2 — Hinders at least one activity of daily living (mRS 2–3)', value: 2 },
        { label: 'D3 — Hinders walking or prevents attending to own bodily needs (mRS 4)', value: 3 },
        { label: 'D4 — Bedridden, needing constant help, incontinent (mRS 5)', value: 4 },
        { label: 'D5 — Death (mRS 6)', value: 5 },
      ], 1, 'Only count deterioration caused by the adverse event relative to the preoperative/baseline state, at discharge or follow-up.'),
      selectInput('neurology', 'Neurology dimension — new neurologic deficit?', [
        { label: 'N1 — No new neurologic deficit', value: 1 },
        { label: 'N2 — Any new neurologic deficit attributable to the adverse event', value: 2 },
      ], 1, 'Binary: any new deficit (even untreatable, e.g., new facial palsy) raises the grade to at least 2 — the key advantage over therapy-only systems.'),
    ],
    calculate(values) {
      const t = num(values.therapy, 1);
      const d = num(values.disability, 1);
      const n = num(values.neurology, 1);
      const grade = Math.max(t, d, n);
      const map: Record<number, { label: string; riskLevel: 'low' | 'moderate' | 'high' | 'critical'; interpretation: string }> = {
        1: {
          label: 'TDN 1 — minor event',
          riskLevel: 'low',
          interpretation: 'Adverse event needing no disallowed therapy, without impact on daily activities and without new neurologic deficit.',
        },
        2: {
          label: 'TDN 2 — moderate event',
          riskLevel: 'moderate',
          interpretation: 'Event requiring pharmacologic treatment/transfusion/TPN, hindering at least one ADL (mRS 2–3), or causing any new neurologic deficit.',
        },
        3: {
          label: 'TDN 3 — severe event',
          riskLevel: 'high',
          interpretation: 'Event requiring an invasive procedure, hindering walking, or preventing the patient from attending to own bodily needs (mRS 4).',
        },
        4: {
          label: 'TDN 4 — life-threatening event',
          riskLevel: 'critical',
          interpretation: 'Life-threatening event requiring ICU management, or leaving the patient bedridden, in need of constant help, incontinent (mRS 5).',
        },
        5: {
          label: 'TDN 5 — fatal event',
          riskLevel: 'critical',
          interpretation: 'Adverse event resulting in death (within 30 days of surgery in the original definition). Grade 5 always corresponds to T5D5N2.',
        },
      };
      const r = map[grade];
      return {
        score: grade,
        label: r.label,
        interpretation: `${r.interpretation} Composite T${t}D${d}N${n} — the overall TDN grade equals the worst dimension.`,
        riskLevel: r.riskLevel,
        details: [
          { label: 'Therapy (T)', value: `T${t}` },
          { label: 'Disability (D)', value: `D${d}` },
          { label: 'Neurology (N)', value: `N${n}` },
          { label: 'Composite', value: `T${t}D${d}N${n}` },
        ],
        recommendations: [
          'Report the three dimensions separately (e.g., T3D4N1) alongside the overall grade — surveyed neurosurgeons recommend dimension-level reporting.',
          'Only deterioration attributable to the adverse event counts in the D and N dimensions.',
          'Track grades over time to identify complication-reduction and quality-improvement targets.',
        ],
      };
    },
    evidence: {
      summary:
        'The TDN grade classifies neurosurgical adverse events in three dimensions: Therapy (T1–T5, from Clavien-Dindo/Landriel-Ibañez), Disability (D1–D5, mapped to mRS 0–6), and Neurology (N1 no deficit / N2 any new deficit). The overall grade is the worst dimension; grade 5 always corresponds to T5D5N2.',
      formula: 'TDN = max(T, D, N), where T/D are 1–5 and N is 1 (no new deficit) or 2 (new deficit).',
      validation:
        'Validated on 6071 interventions across two centers (development and external validation): grade correlated with length of stay, treatment cost, and KPS deterioration at discharge and follow-up. A 2025 international survey showed substantial inter-rater (α 0.66) and intra-rater (α 0.79) reliability.',
      references: [
        {
          title: 'Adverse Events in Neurosurgery: The Novel Therapy-Disability-Neurology Grade',
          citation: 'Terrapon APR, Zattra CM, Voglis S, et al. Neurosurgery. 2021;89(2):236-245',
          year: 2021,
          pmid: '33887774',
        },
        {
          title: 'International survey-based assessment of the reliability, validity, and interpretability of the TDN grade for neurosurgical adverse events',
          citation: 'Sci Rep. 2025',
          year: 2025,
          doi: '10.1038/s41598-025-21065-8',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'TDN 4–5',
        actions: ['Root-cause/morbidity review', 'Document disability and neurologic dimensions at follow-up', 'Quality-improvement escalation'],
      },
      {
        condition: 'Any new neurologic deficit (N2)',
        actions: ['Document deficit and expected trajectory', 'Rehabilitation referral', 'Reassess mRS at follow-up for the D dimension'],
      },
      {
        condition: 'All events',
        actions: ['Record T, D, and N dimensions in the chart', 'Share composite and dimensions with the multidisciplinary team'],
      },
    ],
    pearls: [
      'A severe but untreatable deficit (e.g., new facial palsy) is at least TDN 2 even if it needs no therapy — that is the point of the system.',
      'Allowed T1 therapies: antiemetics, antipyretics, analgesics, diuretics, electrolytes, physiotherapy, and bedside opening of wound infections.',
      'In the original definition, death within 30 days of surgery is an adverse event (TDN 5, always T5D5N2).',
    ],
  },

  // ─── 12. Trunk Impairment Scale ────────────────────────────────────────────
  {
    id: 'trunk-impairment',
    name: 'Trunk Impairment Scale (TIS)',
    shortName: 'TIS',
    description:
      'Seventeen-item measure of trunk motor control after stroke (also validated in Parkinson disease and MS): static sitting balance (0–7), dynamic sitting balance (0–10), and coordination (0–6); total 0–23.',
    category: 'neurology',
    tags: ['trunk', 'balance', 'sitting', 'stroke', 'tis', 'rehabilitation', 'verheyden'],
    isQuestionnaire: true,
    whenToUse:
      'Quantifying trunk control in sitting — after stroke (primary use) and also validated in Parkinson disease, multiple sclerosis, TBI, and cerebral palsy. Performed by a trained examiner; do not estimate from history.',
    whyUse:
      'The TIS measures static and dynamic sitting balance plus trunk coordination, scores movement quality, and guides treatment. It correlates with the Barthel Index (r ≈0.86) and Trunk Control Test (r ≈0.83) and predicts functional outcome after stroke.',
    inputs: [
      selectInput('ssb1', 'Static 1 — maintains starting position 10 s without support', [
        { label: 'Falls or needs arm support', value: 0, points: 0 },
        { label: 'Maintains position for 10 s', value: 2, points: 2 },
      ], 2, 'Sitting on edge of bed/table without back or arm support, thighs supported, knees 90°, feet flat, arms resting on legs, head/trunk midline. If scored 0, the TOTAL TIS score is 0.'),
      selectInput('ssb2', 'Static 2 — legs crossed passively by examiner (non-affected/stronger leg over affected/weaker), keeps position 10 s', [
        { label: 'Falls or needs arm support', value: 0, points: 0 },
        { label: 'Maintains position for 10 s', value: 2, points: 2 },
      ], 2, 'Examiner crosses the legs; the patient must keep the seated position unsupported.'),
      selectInput('ssb3', 'Static 3 — patient actively crosses non-affected/stronger leg over affected/weaker leg', [
        { label: 'Falls', value: 0, points: 0 },
        { label: 'Needs arm support', value: 1, points: 1 },
        { label: 'Displaces trunk ≥10 cm or assists with arm', value: 2, points: 2 },
        { label: 'Moves without trunk or arm compensation', value: 3, points: 3 },
      ], 3, 'Score the quality of the active leg-crossing, not just completion.'),
      selectInput('dsb1', 'Dynamic 1 — touches seat with elbow on MORE affected side, returns to start', [
        { label: 'Does not reach seat, falls, or uses arm', value: 0, points: 0 },
        { label: 'Touches seat without help and returns', value: 1, points: 1 },
      ], 1, 'Lateral flexion initiated from the shoulder girdle. If 0, items 2–3 are also 0.'),
      selectInput('dsb2', 'Dynamic 2 — repeat: appropriate trunk movement (shortening flexion side, lengthening opposite side)?', [
        { label: 'No appropriate trunk movement', value: 0, points: 0 },
        { label: 'Appropriate trunk movement', value: 1, points: 1 },
      ], 1, 'If 0, item 3 is also 0.'),
      selectInput('dsb3', 'Dynamic 3 — repeat: free of compensatory strategies (arm, hip, knee, foot)?', [
        { label: 'Compensation used', value: 0, points: 0 },
        { label: 'No compensatory strategy used', value: 1, points: 1 },
      ], 1, 'Watch for substitution by the arm or lower limb.'),
      selectInput('dsb4', 'Dynamic 4 — touches seat with elbow on LESS affected side, returns to start', [
        { label: 'Does not reach seat, falls, or uses arm', value: 0, points: 0 },
        { label: 'Touches seat without help and returns', value: 1, points: 1 },
      ], 1, 'If 0, items 5–6 are also 0.'),
      selectInput('dsb5', 'Dynamic 5 — repeat: appropriate trunk movement?', [
        { label: 'No appropriate trunk movement', value: 0, points: 0 },
        { label: 'Appropriate trunk movement', value: 1, points: 1 },
      ], 1, 'If 0, item 6 is also 0.'),
      selectInput('dsb6', 'Dynamic 6 — repeat: free of compensatory strategies?', [
        { label: 'Compensation used', value: 0, points: 0 },
        { label: 'No compensatory strategy used', value: 1, points: 1 },
      ], 1, ''),
      selectInput('dsb7', 'Dynamic 7 — lifts pelvis from seat on MORE affected side, returns to start', [
        { label: 'Cannot lift pelvis / no appropriate trunk movement', value: 0, points: 0 },
        { label: 'Lifts pelvis with appropriate trunk movement', value: 1, points: 1 },
      ], 1, 'Lateral flexion initiated from the pelvic girdle (unilateral hip lift). If 0, item 8 is also 0.'),
      selectInput('dsb8', 'Dynamic 8 — repeat: free of compensatory strategies?', [
        { label: 'Compensation used', value: 0, points: 0 },
        { label: 'No compensatory strategy used', value: 1, points: 1 },
      ], 1, ''),
      selectInput('dsb9', 'Dynamic 9 — lifts pelvis from seat on LESS affected side, returns to start', [
        { label: 'Cannot lift pelvis / no appropriate trunk movement', value: 0, points: 0 },
        { label: 'Lifts pelvis with appropriate trunk movement', value: 1, points: 1 },
      ], 1, 'If 0, item 10 is also 0.'),
      selectInput('dsb10', 'Dynamic 10 — repeat: free of compensatory strategies?', [
        { label: 'Compensation used', value: 0, points: 0 },
        { label: 'No compensatory strategy used', value: 1, points: 1 },
      ], 1, ''),
      selectInput('coo1', 'Coordination 1 — rotates upper trunk (shoulder girdle) 6 times', [
        { label: 'No rotation possible', value: 0, points: 0 },
        { label: 'Asymmetric rotation', value: 1, points: 1 },
        { label: 'Symmetric rotation', value: 2, points: 2 },
      ], 2, 'Horizontal-plane rotation initiated from the shoulder girdle, 6 cycles.'),
      selectInput('coo2', 'Coordination 2 — repeats shoulder-girdle rotations within 10 s', [
        { label: 'Not completed within 10 s', value: 0, points: 0 },
        { label: '6 rotations within 10 s', value: 1, points: 1 },
      ], 1, 'Timed repetition of coordination item 1.'),
      selectInput('coo3', 'Coordination 3 — rotates lower trunk (pelvic girdle) 6 times', [
        { label: 'No rotation possible', value: 0, points: 0 },
        { label: 'Asymmetric rotation', value: 1, points: 1 },
        { label: 'Symmetric rotation', value: 2, points: 2 },
      ], 2, 'Horizontal-plane rotation initiated from the pelvic girdle.'),
      selectInput('coo4', 'Coordination 4 — repeats pelvic-girdle rotations within 10 s', [
        { label: 'Not completed within 10 s', value: 0, points: 0 },
        { label: '6 rotations within 10 s', value: 1, points: 1 },
      ], 1, 'Timed repetition of coordination item 3.'),
    ],
    calculate(values) {
      const ssb = num(values.ssb1) + num(values.ssb2) + num(values.ssb3);
      // Per the published rules, failing a primary task zeroes its dependent
      // quality items regardless of what the observer selected.
      const d1 = num(values.dsb1) === 1 ? 1 : 0;
      const d2 = d1 === 1 && num(values.dsb2) === 1 ? 1 : 0;
      const d3 = d2 === 1 && num(values.dsb3) === 1 ? 1 : 0;
      const d4 = num(values.dsb4) === 1 ? 1 : 0;
      const d5 = d4 === 1 && num(values.dsb5) === 1 ? 1 : 0;
      const d6 = d5 === 1 && num(values.dsb6) === 1 ? 1 : 0;
      const d7 = num(values.dsb7) === 1 ? 1 : 0;
      const d8 = d7 === 1 && num(values.dsb8) === 1 ? 1 : 0;
      const d9 = num(values.dsb9) === 1 ? 1 : 0;
      const d10 = d9 === 1 && num(values.dsb10) === 1 ? 1 : 0;
      const dsb = d1 + d2 + d3 + d4 + d5 + d6 + d7 + d8 + d9 + d10;
      const coo = num(values.coo1) + num(values.coo2) + num(values.coo3) + num(values.coo4);
      // If the patient cannot maintain the starting position (item 1 = 0),
      // the total TIS score is 0.
      const score = num(values.ssb1) === 0 ? 0 : ssb + dsb + coo;
      const band = riskFromThresholds(-score, [
        { max: -20, level: 'low', label: 'Near-normal trunk control', interpretation: `TIS ${score}/23 — near-normal trunk control.` },
        { max: -14, level: 'moderate', label: 'Mild–moderate trunk impairment', interpretation: `TIS ${score}/23 — mild to moderate trunk impairment; target selective lateral flexion and rotation deficits in therapy.` },
        { max: -7, level: 'high', label: 'Marked trunk impairment', interpretation: `TIS ${score}/23 — marked trunk impairment; prioritize sitting-balance work and safety during transfers.` },
        { max: 0, level: 'critical', label: 'Severe trunk impairment', interpretation: `TIS ${score}/23 — severe trunk impairment; supervised sitting and assisted transfers required.` },
      ]);
      return {
        score,
        unit: '/23',
        label: band.label,
        interpretation: `${band.interpretation} Higher = better trunk performance. Subscales: static ${ssb}/7, dynamic ${dsb}/10, coordination ${coo}/6.`,
        riskLevel: band.riskLevel,
        details: [
          { label: 'Static sitting balance', value: `${ssb} / 7` },
          { label: 'Dynamic sitting balance', value: `${dsb} / 10` },
          { label: 'Coordination', value: `${coo} / 6` },
          { label: 'Rule applied', value: num(values.ssb1) === 0 ? 'Item 1 = 0 → total TIS = 0' : 'Dependent quality items auto-zeroed when primary task failed' },
        ],
        recommendations: [
          'Allow 3 attempts per item and record the best; correct between attempts but allow no practice session.',
          'Target the weakest subscale in rehabilitation — static control before dynamic and coordination tasks.',
          'Repeat periodically to document recovery; combine with gait and functional-independence measures.',
        ],
      };
    },
    evidence: {
      summary:
        'The TIS (Verheyden 2004) has 17 items: static sitting balance (3 items, 0–7), dynamic sitting balance (10 items, 0–10: elbow-to-seat and pelvis-lift tasks each side with trunk-movement and compensation checks), and coordination (4 items, 0–6: symmetric shoulder/pelvic-girdle rotation plus timed repetition within 10 s). If the first item scores 0, the total is 0.',
      formula: 'TIS = static (0–7) + dynamic (0–10) + coordination (0–6); total 0–23, higher = better.',
      validation:
      'In stroke patients the TIS showed item κ 0.62–1.0, subscale ICCs 0.85–0.99, total-score test-retest and interobserver ICCs 0.96/0.99, correlations with Barthel Index (r 0.86) and Trunk Control Test (r 0.83), and predictive validity for discharge FIM. Also validated in MS, Parkinson disease, TBI, and cerebral palsy.',
      references: [
        {
          title: 'The Trunk Impairment Scale: a new tool to measure motor impairment of the trunk after stroke',
          citation: 'Verheyden G, Nieuwboer A, Mertin J, et al. Clin Rehabil. 2004;18(3):326-334',
          year: 2004,
          doi: '10.1191/0269215504cr733oa',
        },
        {
          title: 'Development of a new measure to assess trunk impairment after stroke (Trunk Impairment Scale)',
          citation: 'Verheyden G, Nieuwboer A, Mertin J, et al. Am J Phys Med Rehabil. 2004;83(9):667-674',
          year: 2004,
          doi: '10.1097/01.phm.0000137308.10562.20',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Static item 1 = 0',
        actions: ['Total TIS = 0 by rule — provide supported sitting and assisted transfers', 'Reassess basic postural control before attempting further items'],
      },
      {
        condition: 'Low dynamic subscore',
        actions: ['Train selective lateral trunk flexion from shoulder and pelvic girdle', 'Reduce compensatory arm/leg strategies with tactile and verbal cueing'],
      },
      {
        condition: 'Low coordination subscore',
        actions: ['Practice symmetric upper- and lower-trunk rotation against time', 'Progress to functional reaching and turning tasks'],
      },
    ],
    pearls: [
      'Same starting position for every item: edge of bed/table, thighs fully supported, knees 90°, feet flat and hip-width, arms on legs, head/trunk midline.',
      'A score of 0 on item 1 sets the whole TIS to 0 — do not skip ahead and sum the rest.',
      'The dynamic items reward quality, not just completion — watch for compensations and truncated trunk movement.',
      'Timed coordination items use a 10-second window for 6 rotations.',
    ],
  },
];
