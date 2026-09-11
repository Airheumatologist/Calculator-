import type { Calculator, CalcResult } from '../../types/calculator';
import { num, bool, str, round, yesNo, selectInput, numberInput } from '../../utils/helpers';

/** Wave 7 rheumatology classification criteria (ACR/EULAR, CASPAR, ASAS, APS, Behçet, AOSD, IIM). */

const CLASS_PEARL =
  'Classification criteria are for research classification, NOT clinical diagnosis.';

type Opt = { label: string; value: string | number; points?: number; description?: string };

function pts(options: Opt[], raw: unknown): number {
  const found = options.find((o) => o.value === raw);
  return typeof found?.points === 'number' ? found.points : 0;
}

function lab(options: Opt[], raw: unknown): string {
  return options.find((o) => o.value === raw)?.label ?? str(raw as string | number | boolean | null | undefined, 'None');
}

function classResult(
  score: number | string,
  classified: boolean,
  disease: string,
  why: string,
  details: { label: string; value: string }[],
): CalcResult {
  return {
    score,
    unit: typeof score === 'number' ? 'points' : undefined,
    label: classified ? `Classifies as ${disease}` : `Does not classify as ${disease}`,
    interpretation: `${why} ${CLASS_PEARL}`,
    riskLevel: classified ? 'high' : 'low',
    details,
  };
}

function classSteps(disease: string): Calculator['nextSteps'] {
  return [
    {
      condition: `Classifies as ${disease}`,
      actions: [
        `Eligible for ${disease} research classification using these criteria`,
        'Treat according to clinical diagnosis and disease-specific guidelines',
        'Document fulfilled items in the record',
      ],
    },
    {
      condition: 'Does not classify',
      actions: [
        'Do not exclude a clinical diagnosis solely because classification is not met',
        'Reassess domains, serology, imaging, and competing diagnoses',
        'Rescore if new manifestations accrue',
      ],
    },
  ];
}

function classPearls(extra: string[]): string[] {
  return [CLASS_PEARL, ...extra];
}

// ── option tables (shared by inputs + calculate so points stay aligned) ─────

const RA_JOINTS: Opt[] = [
  { label: '1 large joint', value: '1-large', points: 0, description: 'Shoulder, elbow, hip, knee, or ankle' },
  { label: '2–10 large joints', value: '2-10-large', points: 1, description: 'Large = shoulders, elbows, hips, knees, ankles' },
  { label: '1–3 small joints (with or without large)', value: '1-3-small', points: 2, description: 'Small = MCPs, PIPs, 2nd–5th MTPs, thumb IPs, wrists' },
  { label: '4–10 small joints (with or without large)', value: '4-10-small', points: 3, description: 'Do not count DIPs, 1st CMC, or 1st MTP' },
  { label: '>10 joints (at least 1 small)', value: 'gt10', points: 5, description: 'Any combination totaling >10 involved joints including ≥1 small joint' },
];
const RA_SEROLOGY: Opt[] = [
  { label: 'Negative RF and negative ACPA', value: 'neg', points: 0, description: '≤ULN for both RF and ACPA' },
  { label: 'Low-positive RF or low-positive ACPA', value: 'low', points: 2, description: '>ULN but ≤3× ULN' },
  { label: 'High-positive RF or high-positive ACPA', value: 'high', points: 3, description: '>3× ULN for RF or ACPA' },
];
const RA_APR: Opt[] = [
  { label: 'Normal CRP and normal ESR', value: 'normal', points: 0, description: 'Both CRP and ESR ≤ laboratory ULN' },
  { label: 'Abnormal CRP or abnormal ESR', value: 'abnormal', points: 1, description: 'CRP or ESR above laboratory ULN (either counts)' },
];
const RA_DURATION: Opt[] = [
  { label: '<6 weeks', value: 'lt6', points: 0, description: 'Duration of synovitis (not pain alone) <6 weeks' },
  { label: '≥6 weeks', value: 'ge6', points: 1, description: 'Duration of synovitis (tender or swollen joints) ≥6 weeks' },
];

const SLE_CONST: Opt[] = [
  { label: 'None', value: 'none', points: 0 },
  { label: 'Fever', value: 'fever', points: 2, description: '>38.3°C, not infection' },
];
const SLE_HEME: Opt[] = [
  { label: 'None', value: 'none', points: 0 },
  { label: 'Leukopenia', value: 'leukopenia', points: 3, description: 'WBC <4.0×10⁹/L' },
  { label: 'Thrombocytopenia', value: 'thrombocytopenia', points: 4, description: 'Platelets <100×10⁹/L' },
  { label: 'Autoimmune hemolysis', value: 'hemolysis', points: 4, description: 'Reticulocytosis, low haptoglobin, ↑indirect bili or LDH, AND positive Coombs' },
];
const SLE_NEURO: Opt[] = [
  { label: 'None', value: 'none', points: 0 },
  { label: 'Delirium', value: 'delirium', points: 2, description: 'Change in consciousness or cognition; count only if SLE is the most likely cause' },
  { label: 'Psychosis', value: 'psychosis', points: 3, description: 'Hallucinations or delusions without delirium' },
  { label: 'Seizure', value: 'seizure', points: 5, description: 'Primary generalized or focal/complex seizure' },
];
const SLE_MUCO: Opt[] = [
  { label: 'None', value: 'none', points: 0 },
  { label: 'Nonscarring alopecia', value: 'alopecia', points: 2, description: 'Diffuse thinning or broken hairs in a lupus pattern' },
  { label: 'Oral ulcers', value: 'oral-ulcers', points: 2, description: 'Palate, buccal, or tongue ulcers observed by a clinician' },
  { label: 'Subacute cutaneous or discoid lupus', value: 'subacute-discoid', points: 4, description: 'SCLE = annular/psoriasiform photosensitive; discoid = scarring plaques' },
  { label: 'Acute cutaneous lupus (ACLE)', value: 'acle', points: 6, description: 'Malar rash (spares nasolabial folds) or generalized ACLE' },
];
const SLE_SEROSA: Opt[] = [
  { label: 'None', value: 'none', points: 0 },
  { label: 'Pleural or pericardial effusion', value: 'effusion', points: 5, description: 'Imaging-documented effusion; not infection or another more likely cause' },
  { label: 'Acute pericarditis', value: 'pericarditis', points: 6, description: '≥2 of typical pain, rub, ECG ST elevation/PR depression, or new effusion' },
];
const SLE_MSK: Opt[] = [
  { label: 'None', value: 'none', points: 0 },
  { label: 'Joint involvement', value: 'joints', points: 6, description: 'Synovitis (swelling/effusion) in ≥2 joints, or tenderness in ≥2 joints plus ≥30 min morning stiffness' },
];
const SLE_RENAL: Opt[] = [
  { label: 'None', value: 'none', points: 0 },
  { label: 'Proteinuria >0.5 g/24 h', value: 'proteinuria', points: 4, description: '24-h protein >0.5 g or equivalent UPCR' },
  { label: 'Class II or V lupus nephritis', value: 'class-ii-v', points: 8, description: 'ISN/RPS biopsy class II (mesangial) or V (membranous)' },
  { label: 'Class III or IV lupus nephritis', value: 'class-iii-iv', points: 10, description: 'ISN/RPS biopsy class III (focal) or IV (diffuse proliferative)' },
];
const SLE_APL: Opt[] = [
  { label: 'None', value: 'none', points: 0 },
  { label: 'Antiphospholipid antibodies', value: 'positive', points: 2, description: 'LAC and/or aCL IgA/G/M medium–high (>40 U or >99th percentile) and/or anti-β2GPI IgA/G/M' },
];
const SLE_COMP: Opt[] = [
  { label: 'None', value: 'none', points: 0 },
  { label: 'Low C3 or low C4', value: 'low-c3-or-c4', points: 3, description: 'C3 or C4 below laboratory LLN' },
  { label: 'Low C3 AND low C4', value: 'low-c3-and-c4', points: 4, description: 'Both C3 and C4 below laboratory LLN' },
];
const SLE_ABS: Opt[] = [
  { label: 'None', value: 'none', points: 0 },
  { label: 'Anti-dsDNA or anti-Smith', value: 'dsdna-or-sm', points: 6, description: 'Anti-dsDNA above assay ULN (Crithidia or similarly specific assay preferred) or anti-Sm above ULN' },
];

const SSC_SKIN: Opt[] = [
  { label: 'None', value: 'none', points: 0 },
  { label: 'Puffy fingers', value: 'puffy', points: 2, description: 'Non-pitting digital edema of the fingers' },
  { label: 'Sclerodactyly of the fingers', value: 'sclerodactyly', points: 4, description: 'Skin thickening of the fingers distal to the MCPs' },
  { label: 'Skin thickening of both hands proximal to MCP', value: 'proximal', points: 9, description: 'Skin thickening of both hands extending proximal to the MCPs — sufficient alone (9 points)' },
];
const SSC_FINGERTIP: Opt[] = [
  { label: 'None', value: 'none', points: 0 },
  { label: 'Digital tip ulcers', value: 'ulcers', points: 2, description: 'Ischemic ulcers on the fingertip pulp' },
  { label: 'Pitting scars', value: 'pitting', points: 3, description: 'Depressed pitted scars at the digital pulp from prior ischemia' },
];

const PMR_ALG: Opt[] = [
  { label: 'Clinical only (threshold ≥4)', value: 'clinical', description: 'Use clinical items only; classify if score ≥4. US items still add to the displayed total if checked — uncheck them for a pure clinical score' },
  { label: 'Clinical + ultrasound (threshold ≥5)', value: 'us', description: 'Include US items; classify if score ≥5' },
];

const TAK_SEX: Opt[] = [
  { label: 'Male', value: 'male', points: 0 },
  { label: 'Female', value: 'female', points: 1 },
];
const TAK_TERR: Opt[] = [
  { label: '0 territories', value: 0, points: 0 },
  { label: '1 territory', value: 1, points: 1 },
  { label: '2 territories', value: 2, points: 2 },
  { label: '≥3 territories', value: 3, points: 3 },
];

const CASPAR_PSO: Opt[] = [
  { label: 'None', value: 'none', points: 0 },
  { label: 'Family history of psoriasis', value: 'family', points: 1, description: 'First- or second-degree relative with psoriasis' },
  { label: 'Personal history of psoriasis', value: 'personal', points: 1, description: 'Past psoriasis diagnosed by a physician' },
  { label: 'Current psoriasis', value: 'current', points: 2, description: 'Current psoriatic skin or scalp disease judged by a rheumatologist or dermatologist' },
];

const IIM_AGE: Opt[] = [
  { label: '<18 years', value: 'lt18', description: 'First related symptom before age 18 (juvenile-onset band; 0 extra points)' },
  { label: '18–39 years', value: '18-39', description: 'First related symptom at age 18–39' },
  { label: '≥40 years', value: 'ge40', description: 'First related symptom at age ≥40' },
];
const IIM_PATH: Opt[] = [
  { label: 'Without muscle biopsy (threshold ≥5.5)', value: 'without', description: 'Use published without-biopsy weights; probable IIM if score ≥5.5 (definite ≥7.5)' },
  { label: 'With muscle biopsy (threshold ≥6.7)', value: 'with', description: 'Use published with-biopsy weights; probable IIM if score ≥6.7 (definite ≥8.7). Biopsy items score only on this path' },
];
const IIM_SKIN: Opt[] = [
  { label: 'None', value: 'none' },
  { label: "Gottron's papules", value: 'gottron-papules', description: 'Erythematous to violaceous papules over DIP/PIP/MCP extensor surfaces' },
  { label: "Gottron's sign", value: 'gottron-sign', description: 'Macular erythema over knuckles/elbows/knees without papules' },
  { label: 'Heliotrope rash', value: 'heliotrope', description: 'Violaceous periorbital rash ± edema' },
];

const APS_VTE: Opt[] = [
  { label: 'None', value: 'none', points: 0 },
  { label: 'Provoked VTE (high-risk VTE profile)', value: 'provoked', points: 1, description: 'VTE with a major transient risk factor (surgery with GA >30 min, hospital bedbound ≥3 days, cesarean, major trauma/fracture)' },
  { label: 'Unprovoked VTE', value: 'unprovoked', points: 3, description: 'VTE without a high-risk (major transient) VTE profile' },
  { label: 'High-risk thrombophilia + VTE', value: 'high-risk', points: 4, description: 'VTE plus a high-risk thrombophilia (as in the 2023 table)' },
];
const APS_ART: Opt[] = [
  { label: 'None', value: 'none', points: 0 },
  { label: 'Arterial thrombosis with high-risk CVD profile', value: 'high-risk', points: 2, description: 'Arterial event with ≥1 high-risk CVD factor (current smoking, treated HTN, DM, LDL ≥160 mg/dL or on lipid-lowering therapy)' },
  { label: 'Arterial thrombosis without high-risk CVD profile', value: 'unprovoked', points: 4, description: 'Arterial thrombosis without those high-risk CVD factors' },
];
const APS_MICRO: Opt[] = [
  { label: 'None', value: 'none', points: 0 },
  { label: 'Suspected microvascular', value: 'suspected', points: 2, description: 'Livedo / livedo racemosa, aPL nephropathy, or alveolar hemorrhage without histopathology' },
  { label: 'Established microvascular', value: 'established', points: 5, description: 'Biopsy- or unequivocal imaging-proven microvascular disease' },
];
const APS_OB: Opt[] = [
  { label: 'None', value: 'none', points: 0 },
  { label: '≥3 consecutive pre-10-week losses', value: 'early-losses', points: 1, description: '≥3 consecutive unexplained pre-fetal deaths (<10 weeks 0 days)' },
  { label: 'Fetal death 10–16 weeks', value: 'fetal-10-16', points: 1, description: 'Death of a morphologically normal fetus at 10 weeks 0 days through 15 weeks 6 days' },
  { label: 'Placental insufficiency with severe features', value: 'placental', points: 2, description: 'Severe placental insufficiency (e.g. FGR, abnormal UA Dopplers, oligohydramnios) with severe features' },
  { label: 'Pre-eclampsia with severe features <34 weeks', value: 'preeclampsia', points: 3, description: 'Pre-eclampsia with ACOG severe features requiring delivery <34 weeks' },
  { label: 'Fetal death ≥16 weeks', value: 'fetal-ge16', points: 4, description: 'Death of a morphologically normal fetus at ≥16 weeks 0 days' },
];
const APS_VALVE: Opt[] = [
  { label: 'None', value: 'none', points: 0 },
  { label: 'Valve thickening', value: 'thickening', points: 2, description: 'Echo valve thickening without vegetation, not explained by other valve disease' },
  { label: 'Valve vegetation', value: 'vegetation', points: 4, description: 'Echo vegetation (Libman–Sacks type) not explained by infection' },
];
const APS_LAC: Opt[] = [
  { label: 'None / negative', value: 'none', points: 0 },
  { label: 'Positive LAC (single determination)', value: 'single', points: 1, description: 'Positive once; persistence not yet documented' },
  { label: 'Positive LAC (persistent)', value: 'persistent', points: 5, description: 'Positive on two occasions ≥12 weeks apart' },
];
const APS_ACL_IGG: Opt[] = [
  { label: 'None / negative', value: 'none', points: 0 },
  { label: 'Moderate-titer IgG aCL', value: 'moderate', points: 3, description: 'ELISA ~40–79 U (or lab 99th percentile band)' },
  { label: 'High-titer IgG aCL', value: 'high', points: 5, description: 'ELISA ≥80 U (or lab high-titer / >99th percentile high band)' },
];
const APS_ACL_IGM: Opt[] = [
  { label: 'None / negative', value: 'none', points: 0 },
  { label: 'IgM aCL positive', value: 'positive', points: 1, description: 'IgM aCL above the assay positive cut (any titer in this helper)' },
];
const APS_B2_IGG: Opt[] = [
  { label: 'None / negative', value: 'none', points: 0 },
  { label: 'Moderate-titer IgG anti-β2GPI', value: 'moderate', points: 3, description: 'ELISA ~40–79 U (or lab 99th percentile band)' },
  { label: 'High-titer IgG anti-β2GPI', value: 'high', points: 5, description: 'ELISA ≥80 U (or lab high-titer / >99th percentile high band)' },
];
const APS_B2_IGM: Opt[] = [
  { label: 'None / negative', value: 'none', points: 0 },
  { label: 'IgM anti-β2GPI positive', value: 'positive', points: 1, description: 'IgM anti-β2GPI above the assay positive cut (any titer in this helper)' },
];

export const wave7RheumClassCalcs: Calculator[] = [
  // ─── 1. 2010 ACR/EULAR RA ────────────────────────────────────────────────
  {
    id: 'acr-eular-ra-2010',
    name: '2010 ACR/EULAR Rheumatoid Arthritis Classification',
    shortName: 'ACR/EULAR RA',
    description:
      'Additive 2010 ACR/EULAR RA classification (joints, serology, acute-phase reactants, duration). Threshold ≥6 with ≥1 swollen joint and no better alternative diagnosis.',
    category: 'rheumatology',
    tags: ['ra', 'rheumatoid', 'acr', 'eular', 'classification', 'acpa', 'rf'],
    whenToUse:
      'Undifferentiated inflammatory synovitis when classifying RA for research or standardized cohorts.',
    whyUse:
      'Replaced 1987 criteria to capture earlier disease; score ≥6 classifies definite RA when entry is met.',
    inputs: [
      yesNo('entrySwollen', '≥1 swollen joint (entry criterion)', null, 'Required to classify; score is still computed if absent'),
      yesNo('betterAlt', 'Better alternative diagnosis explains the synovitis', null, 'If yes, cannot classify even if points ≥6'),
      selectInput('joints', 'Joint involvement', RA_JOINTS, undefined, 'Large = shoulders, elbows, hips, knees, ankles. Small = MCPs, PIPs, 2nd–5th MTPs, thumb IPs, wrists. Do not count DIPs, 1st CMC, or 1st MTP. Count a joint if tender or swollen; >10 joints needs ≥1 small.'),
      selectInput('serology', 'Serology (RF / ACPA)', RA_SEROLOGY, undefined, 'Negative = ≤ULN for both RF and ACPA; low-positive = >ULN but ≤3× ULN; high-positive = >3× ULN for RF or ACPA.'),
      selectInput('apr', 'Acute-phase reactants', RA_APR, undefined, 'Abnormal = CRP or ESR above the laboratory ULN (either counts).'),
      selectInput('duration', 'Symptom duration', RA_DURATION, undefined, 'Duration of synovitis, not of pain alone.'),
    ],
    calculate(values) {
      const jointPts = pts(RA_JOINTS, values.joints);
      const seroPts = pts(RA_SEROLOGY, values.serology);
      const aprPts = pts(RA_APR, values.apr);
      const durPts = pts(RA_DURATION, values.duration);
      const score = jointPts + seroPts + aprPts + durPts;
      const entry = bool(values.entrySwollen);
      const betterAlt = bool(values.betterAlt);
      const classified = entry && !betterAlt && score >= 6;
      return classResult(
        score,
        classified,
        'RA',
        classified
          ? `Score ${score}/10 (≥6) with swollen-joint entry and no better alternative diagnosis.`
          : `Score ${score}/10. Classification requires ≥6 points, ≥1 swollen joint, and no better alternative diagnosis (entry swollen: ${entry ? 'yes' : 'no'}; better alternative: ${betterAlt ? 'yes' : 'no'}).`,
        [
          { label: 'Entry: ≥1 swollen joint', value: entry ? 'Yes' : 'No' },
          { label: 'Better alternative diagnosis', value: betterAlt ? 'Yes — cannot classify' : 'No' },
          { label: 'Joint involvement', value: `${lab(RA_JOINTS, values.joints)} (${jointPts})` },
          { label: 'Serology', value: `${lab(RA_SEROLOGY, values.serology)} (${seroPts})` },
          { label: 'Acute-phase reactants', value: `${lab(RA_APR, values.apr)} (${aprPts})` },
          { label: 'Duration', value: `${lab(RA_DURATION, values.duration)} (${durPts})` },
          { label: 'Threshold', value: '≥6 with entry' },
        ],
      );
    },
    evidence: {
      summary:
        '2010 ACR/EULAR RA classification uses four additive domains (joints 0–5, serology 0–3, APR 0–1, duration 0–1). Definite RA requires score ≥6 plus ≥1 swollen joint not better explained by another disease.',
      formula: 'Joints (0–5) + serology (0–3) + APR (0–1) + duration (0–1); classify if ≥6 AND entry AND not better alternative',
      validation: 'Aletaha et al., derived and validated in early arthritis cohorts; sensitivity/specificity superior to 1987 criteria for early RA.',
      references: [
        {
          title: '2010 Rheumatoid arthritis classification criteria: an ACR/EULAR collaborative initiative',
          citation: 'Aletaha D et al. Ann Rheum Dis. 2010',
          year: 2010,
          pmid: '20699241',
          doi: '10.1136/ard.2010.138461',
        },
      ],
    },
    nextSteps: classSteps('RA'),
    pearls: classPearls([
      'Typical RA erosions with a compatible history also classify as RA even if the current score is <6.',
      'High-positive serology is >3× ULN for RF or ACPA.',
    ]),
  },

  // ─── 2. 2019 EULAR/ACR SLE ───────────────────────────────────────────────
  {
    id: 'eular-acr-sle-2019',
    name: '2019 EULAR/ACR SLE Classification',
    shortName: 'EULAR/ACR SLE',
    description:
      'Additive 2019 EULAR/ACR SLE classification: ANA entry, highest item per domain, threshold ≥10 with ≥1 clinical domain.',
    category: 'rheumatology',
    tags: ['sle', 'lupus', 'ana', 'eular', 'acr', 'classification'],
    whenToUse: 'When classifying SLE for research after ANA ≥1:80 is documented.',
    whyUse: 'Weighted domains with ANA entry improved specificity versus ACR 1997 and SLICC in validation.',
    inputs: [
      yesNo('ana', 'ANA ≥1:80 on HEp-2 (or equivalent) — entry criterion', null, 'Count an item only if SLE is the most likely explanation; items need not be simultaneous; only the highest item per domain.'),
      selectInput('constitutional', 'Constitutional domain', SLE_CONST, undefined, 'Fever >38.3°C, not infection.'),
      selectInput('hematologic', 'Hematologic domain (highest item)', SLE_HEME, undefined, 'Leukopenia WBC <4.0×10⁹/L; thrombocytopenia <100×10⁹/L; hemolysis = reticulocytosis, low haptoglobin, ↑indirect bili or LDH, AND positive Coombs.'),
      selectInput('neuro', 'Neuropsychiatric domain (highest item)', SLE_NEURO, undefined, 'Delirium = change in consciousness/cognition; psychosis = hallucinations/delusions; seizure = primary generalized or focal. Count only if SLE is the most likely explanation.'),
      selectInput('mucocutaneous', 'Mucocutaneous domain (highest item)', SLE_MUCO, undefined, 'Nonscarring alopecia = diffuse thinning/broken hairs; oral ulcers = palate/buccal/tongue; SCLE = annular/psoriasiform; discoid = scarring plaques; ACLE = malar (spares nasolabial folds) or generalized. Highest item only.'),
      selectInput('serosal', 'Serosal domain (highest item)', SLE_SEROSA, undefined, 'Effusion on imaging; acute pericarditis = ≥2 of typical pain, rub, ECG ST elevation/PR depression, or new effusion.'),
      selectInput('msk', 'Musculoskeletal domain', SLE_MSK, undefined, 'Synovitis (swelling/effusion) in ≥2 joints, or tenderness in ≥2 joints plus ≥30 min morning stiffness.'),
      selectInput('renal', 'Renal domain (highest item)', SLE_RENAL, undefined, 'Proteinuria >0.5 g/24 h or equivalent UPCR; class from ISN/RPS kidney biopsy. Highest item only.'),
      selectInput('apl', 'Antiphospholipid antibodies', SLE_APL, undefined, 'LAC and/or aCL IgA/G/M medium–high (>40 U or >99th percentile) and/or anti-β2GPI IgA/G/M.'),
      selectInput('complement', 'Complement', SLE_COMP, undefined, 'Low = below laboratory LLN. Highest item only (do not add C3-or-C4 plus C3-and-C4).'),
      selectInput('sleAbs', 'SLE-specific antibodies', SLE_ABS, undefined, 'Anti-dsDNA above assay ULN (Crithidia or similarly specific assay preferred) or anti-Sm above ULN. Highest domain item only.'),
    ],
    calculate(values) {
      const constitutional = pts(SLE_CONST, values.constitutional);
      const hematologic = pts(SLE_HEME, values.hematologic);
      const neuro = pts(SLE_NEURO, values.neuro);
      const mucocutaneous = pts(SLE_MUCO, values.mucocutaneous);
      const serosal = pts(SLE_SEROSA, values.serosal);
      const msk = pts(SLE_MSK, values.msk);
      const renal = pts(SLE_RENAL, values.renal);
      const apl = pts(SLE_APL, values.apl);
      const complement = pts(SLE_COMP, values.complement);
      const sleAbs = pts(SLE_ABS, values.sleAbs);
      const clinical = constitutional + hematologic + neuro + mucocutaneous + serosal + msk + renal;
      const score = clinical + apl + complement + sleAbs;
      const ana = bool(values.ana);
      const classified = ana && score >= 10 && clinical > 0;
      return classResult(
        score,
        classified,
        'SLE',
        classified
          ? `Score ${score} (≥10) with ANA entry and at least one clinical domain.`
          : `Score ${score}. Classification requires ANA ≥1:80, ≥10 points, and ≥1 clinical domain (ANA ${ana ? 'positive' : 'negative'}; clinical domain total ${clinical}).`,
        [
          { label: 'ANA ≥1:80 entry', value: ana ? 'Yes' : 'No' },
          { label: 'Constitutional', value: `${lab(SLE_CONST, values.constitutional)} (${constitutional})` },
          { label: 'Hematologic', value: `${lab(SLE_HEME, values.hematologic)} (${hematologic})` },
          { label: 'Neuropsychiatric', value: `${lab(SLE_NEURO, values.neuro)} (${neuro})` },
          { label: 'Mucocutaneous', value: `${lab(SLE_MUCO, values.mucocutaneous)} (${mucocutaneous})` },
          { label: 'Serosal', value: `${lab(SLE_SEROSA, values.serosal)} (${serosal})` },
          { label: 'Musculoskeletal', value: `${lab(SLE_MSK, values.msk)} (${msk})` },
          { label: 'Renal', value: `${lab(SLE_RENAL, values.renal)} (${renal})` },
          { label: 'Antiphospholipid', value: `${lab(SLE_APL, values.apl)} (${apl})` },
          { label: 'Complement', value: `${lab(SLE_COMP, values.complement)} (${complement})` },
          { label: 'SLE-specific antibodies', value: `${lab(SLE_ABS, values.sleAbs)} (${sleAbs})` },
          { label: 'Clinical domain total', value: String(clinical) },
        ],
      );
    },
    evidence: {
      summary:
        '2019 EULAR/ACR SLE: ANA ≥1:80 entry; seven clinical and three immunologic domains; only the highest-weighted item per domain counts; classify if ≥10 with ≥1 clinical criterion.',
      formula: 'Sum of domain maxima; classify if ANA+ AND total ≥10 AND ≥1 clinical domain >0',
      validation: 'Aringer et al. 2019; sensitivity 96% and specificity 93% in the validation cohort.',
      references: [
        {
          title: '2019 EULAR/ACR classification criteria for systemic lupus erythematosus',
          citation: 'Aringer M et al. Ann Rheum Dis. 2019',
          year: 2019,
          pmid: '31383717',
          doi: '10.1136/annrheumdis-2018-214819',
        },
        {
          title: '2019 EULAR/ACR classification criteria for SLE (Arthritis Rheumatol)',
          citation: 'Aringer M et al. Arthritis Rheumatol. 2019',
          year: 2019,
          pmid: '31385462',
          doi: '10.1002/art.40930',
        },
      ],
    },
    nextSteps: classSteps('SLE'),
    pearls: classPearls([
      'Count only the highest item in each domain — do not add alopecia plus ACLE.',
      'Class III/IV lupus nephritis with ANA is sufficient on its own (10 points).',
    ]),
  },

  // ─── 3. 2016 ACR/EULAR Sjögren ───────────────────────────────────────────
  {
    id: 'acr-eular-sjogren-2016',
    name: '2016 ACR/EULAR Primary Sjögren Classification',
    shortName: 'ACR/EULAR Sjögren',
    description:
      'Weighted 2016 ACR/EULAR primary Sjögren classification (focus score, anti-SSA/Ro, ocular staining, Schirmer, unstimulated saliva). Threshold ≥4 with sicca entry.',
    category: 'rheumatology',
    tags: ['sjogren', 'sicca', 'ssa', 'ro', 'classification'],
    whenToUse: 'Suspected primary Sjögren syndrome with dry eye or dry mouth when classifying for research.',
    whyUse: 'Harmonized prior AECG and ACR criteria into a single weighted set.',
    inputs: [
      yesNo('entrySicca', 'Dry eye or dry mouth (entry criterion)', null, 'Positive if daily dry eyes >3 months, sand/gravel sensation, tear substitutes >3×/day, daily dry mouth >3 months, or needs liquids to swallow dry food (AECG questions) — or ESSDAI ≥1. Apply exclusions first (head/neck radiation, active HCV, AIDS, sarcoid, amyloid, GVHD, IgG4-RD).'),
      yesNo('focusScore', 'Labial salivary gland focus score ≥1', 3,
        'Focus = aggregate of ≥50 lymphocytes per 4 mm² of glandular tissue. Focus score ≥1 means at least one such focus.'),
      yesNo('ssa', 'Anti-SSA/Ro positive', 3,
        'Anti-SSA/Ro (Ro60 ± Ro52) above the laboratory positive cut.'),
      yesNo('oss', 'Ocular staining score (OSS) ≥5', 1, 'OSS ≥5 in at least one eye (SICCA OSS method). OSS and van Bijsterveld are alternative ocular-staining methods (do not add both unless both were performed).'),
      yesNo('vanBijsterveld', 'van Bijsterveld score ≥4', 1,
        'van Bijsterveld rose-bengal or lissamine-green score ≥4 in at least one eye (0–9 scale). Alternative to OSS — do not double-count the same staining exam.'),
      yesNo('schirmer', 'Schirmer ≤5 mm/5 min', 1,
        'Unanesthetized Schirmer test: ≤5 mm of wetting at 5 minutes in either eye.'),
      yesNo('saliva', 'Unstimulated whole saliva ≤0.1 mL/min', 1,
        'Unstimulated whole saliva flow ≤0.1 mL/min (typically a 15-minute collection ≤1.5 mL).'),
    ],
    calculate(values) {
      const focus = bool(values.focusScore) ? 3 : 0;
      const ssa = bool(values.ssa) ? 3 : 0;
      const oss = bool(values.oss) ? 1 : 0;
      const vbs = bool(values.vanBijsterveld) ? 1 : 0;
      const schirmer = bool(values.schirmer) ? 1 : 0;
      const saliva = bool(values.saliva) ? 1 : 0;
      const score = focus + ssa + oss + vbs + schirmer + saliva;
      const entry = bool(values.entrySicca);
      const classified = entry && score >= 4;
      return classResult(
        score,
        classified,
        'primary Sjögren',
        classified
          ? `Score ${score} (≥4) with sicca entry.`
          : `Score ${score}. Classification requires ≥4 points and dry eye or dry mouth (entry ${entry ? 'met' : 'not met'}).`,
        [
          { label: 'Sicca entry', value: entry ? 'Yes' : 'No' },
          { label: 'Focus score ≥1', value: bool(values.focusScore) ? 'Yes (3)' : 'No' },
          { label: 'Anti-SSA/Ro', value: bool(values.ssa) ? 'Yes (3)' : 'No' },
          { label: 'OSS ≥5', value: bool(values.oss) ? 'Yes (1)' : 'No' },
          { label: 'van Bijsterveld ≥4', value: bool(values.vanBijsterveld) ? 'Yes (1)' : 'No' },
          { label: 'Schirmer ≤5 mm', value: bool(values.schirmer) ? 'Yes (1)' : 'No' },
          { label: 'Unstimulated saliva ≤0.1 mL/min', value: bool(values.saliva) ? 'Yes (1)' : 'No' },
        ],
      );
    },
    evidence: {
      summary:
        '2016 ACR/EULAR primary Sjögren: among those with sicca, weighted items (focus score 3, anti-SSA/Ro 3, OSS 1, van Bijsterveld 1, Schirmer 1, unstimulated saliva 1); threshold ≥4.',
      formula: '3×FS≥1 + 3×SSA + 1×OSS + 1×vBS + 1×Schirmer + 1×UWS; classify if ≥4 AND sicca entry',
      validation: 'Shiboski et al. 2016; intended to unify AECG 2002 and ACR 2012 sets.',
      references: [
        {
          title: '2016 ACR/EULAR classification criteria for primary Sjögren’s syndrome',
          citation: 'Shiboski CH et al. Ann Rheum Dis. 2017',
          year: 2017,
          pmid: '27789466',
          doi: '10.1136/annrheumdis-2016-210571',
        },
      ],
    },
    nextSteps: classSteps('primary Sjögren'),
    pearls: classPearls([
      'Exclude other conditions that better explain sicca (e.g. head/neck radiation, active HCV, AIDS, sarcoidosis, amyloidosis, GVHD, IgG4-related disease) before applying these criteria.',
      'Both ocular staining methods are listed; many studies use one method only.',
    ]),
  },

  // ─── 4. 2013 ACR/EULAR SSc ───────────────────────────────────────────────
  {
    id: 'acr-eular-ssc-2013',
    name: '2013 ACR/EULAR Systemic Sclerosis Classification',
    shortName: 'ACR/EULAR SSc',
    description:
      '2013 ACR/EULAR SSc classification. Skin thickening proximal to the MCP of both hands scores 9 and is sufficient; otherwise additive items with threshold ≥9.',
    category: 'rheumatology',
    tags: ['scleroderma', 'ssc', 'systemic sclerosis', 'raynaud', 'classification'],
    whenToUse: 'Suspected systemic sclerosis when classifying for research.',
    whyUse: 'Captures limited and early SSc better than 1980 ACR criteria.',
    inputs: [
      selectInput('skin', 'Skin thickening of the fingers', SSC_SKIN, 'none', 'Proximal-to-MCP of both hands is sufficient alone (9 points)'),
      selectInput('fingertip', 'Fingertip lesions', SSC_FINGERTIP, undefined, 'Count only the highest: digital-tip ulcers (2) vs pitting scars (3). Pitting scars = depressed pulp scars from prior ischemia.'),
      yesNo('telangiectasia', 'Telangiectasia', 2,
        'Visible dilated cutaneous vessels, typically of the face, lips, palms, or mucosa (not isolated spider nevi of chronic liver disease).'),
      yesNo('nailfold', 'Abnormal nailfold capillaries', 2, 'Dilated capillary loops and/or avascular dropouts on capillaroscopy (or high-magnification dermatoscope).'),
      yesNo('pahIld', 'PAH and/or ILD', 2, 'PAH documented by RHC (or echo meeting local PAH criteria) and/or ILD on HRCT or restrictive/low-DLCO PFTs.'),
      yesNo('raynaud', 'Raynaud phenomenon', 3, 'Episodic biphasic or triphasic digital color change (white/blue/red), witnessed or convincing history.'),
      yesNo('sscAbs', 'SSc-related autoantibodies (ACA, Scl-70, RNA polymerase III)', 3,
        'Anticentromere (ACA), anti-Scl-70 (topoisomerase I), or anti-RNA polymerase III above the laboratory positive cut.'),
    ],
    calculate(values) {
      const skinPts = pts(SSC_SKIN, values.skin);
      const tipPts = pts(SSC_FINGERTIP, values.fingertip);
      const tel = bool(values.telangiectasia) ? 2 : 0;
      const nail = bool(values.nailfold) ? 2 : 0;
      const lung = bool(values.pahIld) ? 2 : 0;
      const raynaud = bool(values.raynaud) ? 3 : 0;
      const abs = bool(values.sscAbs) ? 3 : 0;
      const score = skinPts + tipPts + tel + nail + lung + raynaud + abs;
      const classified = score >= 9;
      return classResult(
        score,
        classified,
        'SSc',
        classified
          ? `Score ${score} (≥9).`
          : `Score ${score} (<9). Skin thickening of both hands proximal to the MCP is sufficient alone.`,
        [
          { label: 'Skin', value: `${lab(SSC_SKIN, values.skin)} (${skinPts})` },
          { label: 'Fingertip lesions', value: `${lab(SSC_FINGERTIP, values.fingertip)} (${tipPts})` },
          { label: 'Telangiectasia', value: bool(values.telangiectasia) ? 'Yes (2)' : 'No' },
          { label: 'Abnormal nailfold capillaries', value: bool(values.nailfold) ? 'Yes (2)' : 'No' },
          { label: 'PAH and/or ILD', value: bool(values.pahIld) ? 'Yes (2)' : 'No' },
          { label: 'Raynaud phenomenon', value: bool(values.raynaud) ? 'Yes (3)' : 'No' },
          { label: 'SSc-related autoantibodies', value: bool(values.sscAbs) ? 'Yes (3)' : 'No' },
        ],
      );
    },
    evidence: {
      summary:
        '2013 ACR/EULAR SSc: proximal skin thickening of both hands = 9 (sufficient). Otherwise puffy fingers 2 or sclerodactyly 4; fingertip ulcers 2 or pitting scars 3; telangiectasia 2; nailfold 2; PAH/ILD 2; Raynaud 3; SSc antibodies 3. Classify if ≥9.',
      formula: 'Sum of mutually exclusive skin + fingertip + additive items; classify if ≥9',
      validation: 'van den Hoogen et al. 2013; sensitivity 91%, specificity 92% in validation.',
      references: [
        {
          title: '2013 classification criteria for systemic sclerosis (ACR/EULAR)',
          citation: 'van den Hoogen F et al. Ann Rheum Dis. 2013',
          year: 2013,
          pmid: '24092682',
          doi: '10.1136/annrheumdis-2013-204424',
        },
      ],
    },
    nextSteps: classSteps('SSc'),
    pearls: classPearls([
      'Skin thickening proximal to the MCPs of both hands is sufficient by itself.',
      'Count only the highest skin finding and the highest fingertip lesion.',
    ]),
  },

  // ─── 5. 2012 ACR/EULAR PMR ───────────────────────────────────────────────
  {
    id: 'acr-eular-pmr-2012',
    name: '2012 ACR/EULAR Polymyalgia Rheumatica Classification',
    shortName: 'ACR/EULAR PMR',
    description:
      '2012 ACR/EULAR provisional PMR classification. Clinical algorithm threshold ≥4; optional ultrasound algorithm threshold ≥5. Required clinical setting is age ≥50, bilateral shoulder aching, and abnormal CRP/ESR.',
    category: 'rheumatology',
    tags: ['pmr', 'polymyalgia', 'ultrasound', 'classification'],
    whenToUse: 'Age ≥50 with bilateral shoulder aching and raised CRP/ESR when classifying PMR.',
    whyUse: 'Provisional 2012 criteria add optional ultrasound to improve discrimination from RA and shoulder disease.',
    inputs: [
      yesNo('stiffness', 'Morning stiffness >45 minutes', 2,
        'Morning stiffness lasting >45 minutes in the shoulder and/or hip girdle.'),
      yesNo('hip', 'Hip pain or limited range of motion', 1,
        'Hip-girdle pain or restricted hip ROM on exam (not isolated osteoarthritis of one hip).'),
      yesNo('seronegative', 'RF and ACPA negative', 2,
        'Both RF and ACPA ≤ laboratory ULN.'),
      yesNo('noPeripheralSynovitis', 'No other peripheral synovitis', 1,
        'No synovitis of joints other than shoulders and hips (knees, wrists, MCPs, etc. would negate this item).'),
      yesNo('usShoulderHip', 'Ultrasound: ≥1 abnormal shoulder AND ≥1 abnormal hip', 1, 'Abnormal shoulder = subdeltoid bursitis, biceps tenosynovitis, and/or glenohumeral synovitis; abnormal hip = coxofemoral synovitis and/or trochanteric bursitis.'),
      yesNo('usBothShoulders', 'Ultrasound: both shoulders abnormal', 1, 'Each shoulder: subdeltoid bursitis, biceps tenosynovitis, and/or glenohumeral synovitis.'),
      selectInput('algorithm', 'Scoring algorithm', PMR_ALG, 'clinical', 'Ultrasound points always add to the displayed total; the algorithm selects the threshold (4 vs 5)'),
    ],
    calculate(values) {
      const stiffness = bool(values.stiffness) ? 2 : 0;
      const hip = bool(values.hip) ? 1 : 0;
      const seronegative = bool(values.seronegative) ? 2 : 0;
      const noPeriph = bool(values.noPeripheralSynovitis) ? 1 : 0;
      const usSH = bool(values.usShoulderHip) ? 1 : 0;
      const usBoth = bool(values.usBothShoulders) ? 1 : 0;
      const score = stiffness + hip + seronegative + noPeriph + usSH + usBoth;
      const algorithm = str(values.algorithm, 'clinical');
      const threshold = algorithm === 'us' ? 5 : 4;
      const classified = score >= threshold;
      return classResult(
        score,
        classified,
        'PMR',
        classified
          ? `Score ${score} meets the ${algorithm === 'us' ? 'clinical+US ≥5' : 'clinical ≥4'} threshold.`
          : `Score ${score} does not meet the ${algorithm === 'us' ? 'clinical+US ≥5' : 'clinical ≥4'} threshold.`,
        [
          { label: 'Algorithm', value: lab(PMR_ALG, values.algorithm) },
          { label: 'Threshold used', value: `≥${threshold}` },
          { label: 'Morning stiffness >45 min', value: bool(values.stiffness) ? 'Yes (2)' : 'No' },
          { label: 'Hip pain / limited ROM', value: bool(values.hip) ? 'Yes (1)' : 'No' },
          { label: 'RF and ACPA negative', value: bool(values.seronegative) ? 'Yes (2)' : 'No' },
          { label: 'No other peripheral synovitis', value: bool(values.noPeripheralSynovitis) ? 'Yes (1)' : 'No' },
          { label: 'US shoulder + hip', value: bool(values.usShoulderHip) ? 'Yes (1)' : 'No' },
          { label: 'US both shoulders', value: bool(values.usBothShoulders) ? 'Yes (1)' : 'No' },
        ],
      );
    },
    evidence: {
      summary:
        '2012 ACR/EULAR PMR: required age ≥50, bilateral shoulder aching, abnormal CRP/ESR. Additive: stiffness 2, hip 1, RF/ACPA negative 2, no peripheral synovitis 1; optional US shoulder+hip 1 and both shoulders 1. Classify if ≥4 without US algorithm or ≥5 with US.',
      formula: 'Sum of clinical (and US) items; threshold 4 (clinical) or 5 (clinical+US)',
      validation: 'Dasgupta et al. 2012; score ≥4 sensitivity 68% / specificity 78% without US; US algorithm ≥5 specificity 81%.',
      references: [
        {
          title: '2012 provisional classification criteria for polymyalgia rheumatica (EULAR/ACR)',
          citation: 'Dasgupta B et al. Arthritis Rheum. 2012',
          year: 2012,
          pmid: '22389040',
          doi: '10.1002/art.34356',
        },
      ],
    },
    nextSteps: classSteps('PMR'),
    pearls: classPearls([
      'Required setting is age ≥50 + bilateral shoulder aching + raised CRP or ESR — not scored as points.',
      'Ultrasound points are included in the total; choose the matching threshold (4 vs 5).',
    ]),
  },

  // ─── 6. 2022 ACR/EULAR GPA ───────────────────────────────────────────────
  {
    id: 'acr-eular-gpa-2022',
    name: '2022 ACR/EULAR Granulomatosis with Polyangiitis Classification',
    shortName: 'ACR/EULAR GPA',
    description:
      '2022 ACR/EULAR GPA classification. Entry: small/medium-vessel vasculitis with mimics excluded. Threshold ≥5 (includes negative points for MPO-ANCA and eosinophilia).',
    category: 'rheumatology',
    tags: ['gpa', 'wegeners', 'anca', 'pr3', 'vasculitis', 'classification'],
    whenToUse: 'After a clinical diagnosis of small- or medium-vessel vasculitis, to classify GPA for research.',
    whyUse: 'Replaced 1990 ACR vasculitis criteria with a weighted, ANCA-inclusive model.',
    inputs: [
      yesNo('entryVasculitis', 'Small/medium-vessel vasculitis diagnosed and mimics excluded (entry)', null, 'Required to classify; not point-scored. Mimics include infection, cocaine/levamisole, malignancy, and other vasculopathies.'),
      yesNo('nasal', 'Bloody nasal discharge, crusting, congestion, or septal defect/perforation', 3,
        'Bloody nasal discharge, nasal crusting, congestion, or nasal septal defect/perforation attributed to vasculitis.'),
      yesNo('cartilage', 'Cartilaginous involvement (ear, nose, larynx)', 2,
        'Inflammation of ear, nose, or laryngeal cartilage — e.g. auricular chondritis, saddle-nose deformity, or subglottic stenosis.'),
      yesNo('hearing', 'Conductive or sensorineural hearing loss', 1,
        'New conductive or sensorineural hearing loss attributed to vasculitis (audiometry or clinical).'),
      yesNo('pr3', 'c-ANCA or anti-PR3 positive', 5,
        'c-ANCA (IIF) or anti-PR3 immunoassay above the laboratory positive cut.'),
      yesNo('nodules', 'Pulmonary nodules, mass, or cavitation', 2,
        'Chest imaging: nodule(s), mass, or cavity attributed to vasculitis (not infection or malignancy).'),
      yesNo('granuloma', 'Granuloma or giant cells on biopsy', 2,
        'Biopsy showing granulomatous inflammation and/or multinucleated giant cells.'),
      yesNo('sinusImaging', 'Nasal/paranasal sinus inflammation or mastoiditis on imaging', 1,
        'CT/MRI showing sinus inflammation or mastoiditis attributed to vasculitis.'),
      yesNo('gn', 'Pauci-immune glomerulonephritis', 1,
        'Glomerulonephritis with little or no immune deposits (typically RPGN / biopsy-proven).'),
      yesNo('mpo', 'p-ANCA or anti-MPO positive', -1,
        'p-ANCA (IIF) or anti-MPO immunoassay above the laboratory positive cut (subtracts points).'),
      yesNo('eosinophils', 'Eosinophils ≥1×10⁹/L', -4,
        'Peripheral blood eosinophils ≥1.0 × 10⁹/L (≥1000/µL); subtracts points toward EGPA.'),
    ],
    calculate(values) {
      const nasal = bool(values.nasal) ? 3 : 0;
      const cartilage = bool(values.cartilage) ? 2 : 0;
      const hearing = bool(values.hearing) ? 1 : 0;
      const pr3 = bool(values.pr3) ? 5 : 0;
      const nodules = bool(values.nodules) ? 2 : 0;
      const granuloma = bool(values.granuloma) ? 2 : 0;
      const sinus = bool(values.sinusImaging) ? 1 : 0;
      const gn = bool(values.gn) ? 1 : 0;
      const mpo = bool(values.mpo) ? -1 : 0;
      const eos = bool(values.eosinophils) ? -4 : 0;
      const score = nasal + cartilage + hearing + pr3 + nodules + granuloma + sinus + gn + mpo + eos;
      const entry = bool(values.entryVasculitis);
      const classified = entry && score >= 5;
      return classResult(
        score,
        classified,
        'GPA',
        classified
          ? `Score ${score} (≥5) with vasculitis entry.`
          : `Score ${score}. Classification requires ≥5 points and small/medium-vessel vasculitis with mimics excluded (entry ${entry ? 'met' : 'not met'}).`,
        [
          { label: 'Vasculitis entry', value: entry ? 'Yes' : 'No' },
          { label: 'Bloody nasal discharge / crusting / septal defect', value: bool(values.nasal) ? 'Yes (+3)' : 'No' },
          { label: 'Cartilaginous involvement', value: bool(values.cartilage) ? 'Yes (+2)' : 'No' },
          { label: 'Hearing loss', value: bool(values.hearing) ? 'Yes (+1)' : 'No' },
          { label: 'c-ANCA / anti-PR3', value: bool(values.pr3) ? 'Yes (+5)' : 'No' },
          { label: 'Pulmonary nodules / mass / cavity', value: bool(values.nodules) ? 'Yes (+2)' : 'No' },
          { label: 'Granuloma or giant cells', value: bool(values.granuloma) ? 'Yes (+2)' : 'No' },
          { label: 'Sinus inflammation on imaging', value: bool(values.sinusImaging) ? 'Yes (+1)' : 'No' },
          { label: 'Pauci-immune GN', value: bool(values.gn) ? 'Yes (+1)' : 'No' },
          { label: 'p-ANCA / anti-MPO', value: bool(values.mpo) ? 'Yes (−1)' : 'No' },
          { label: 'Eosinophils ≥1×10⁹/L', value: bool(values.eosinophils) ? 'Yes (−4)' : 'No' },
        ],
      );
    },
    evidence: {
      summary:
        '2022 ACR/EULAR GPA: among patients with small/medium-vessel vasculitis, weighted clinical, ANCA, imaging, and biopsy items (PR3 +5; nasal +3; MPO −1; eosinophilia −4). Classify if ≥5.',
      formula: 'Sum of signed item weights; classify if entry AND ≥5',
      validation: 'Robson et al. 2022; validation sensitivity 93%, specificity 94%.',
      references: [
        {
          title: '2022 ACR/EULAR classification criteria for granulomatosis with polyangiitis',
          citation: 'Robson JC et al. Ann Rheum Dis. 2022',
          year: 2022,
          pmid: '35110333',
          doi: '10.1136/annrheumdis-2021-221795',
        },
      ],
    },
    nextSteps: classSteps('GPA'),
    pearls: classPearls([
      'Apply only after a clinical diagnosis of small- or medium-vessel vasculitis; these criteria do not diagnose vasculitis de novo.',
      'Eosinophilia and MPO-ANCA subtract points to steer classification toward EGPA/MPA.',
    ]),
  },

  // ─── 7. 2022 ACR/EULAR MPA ───────────────────────────────────────────────
  {
    id: 'acr-eular-mpa-2022',
    name: '2022 ACR/EULAR Microscopic Polyangiitis Classification',
    shortName: 'ACR/EULAR MPA',
    description:
      '2022 ACR/EULAR MPA classification. Entry: small/medium-vessel vasculitis. Threshold ≥5 (MPO-ANCA +6; nasal disease and PR3/eosinophilia subtract).',
    category: 'rheumatology',
    tags: ['mpa', 'anca', 'mpo', 'vasculitis', 'classification'],
    whenToUse: 'After a clinical diagnosis of small- or medium-vessel vasculitis, to classify MPA for research.',
    whyUse: 'First dedicated MPA classification criteria with ANCA and imaging weights.',
    inputs: [
      yesNo('entryVasculitis', 'Small/medium-vessel vasculitis diagnosed and mimics excluded (entry)', null, 'Required to classify; not point-scored. Mimics include infection, cocaine/levamisole, malignancy, and other vasculopathies.'),
      yesNo('nasal', 'Nasal discharge, crusting, ulcers, or congestion', -3,
        'Nasal discharge, crusting, ulcers, or congestion (subtracts points; steers toward GPA).'),
      yesNo('mpo', 'p-ANCA or anti-MPO positive', 6,
        'p-ANCA (IIF) or anti-MPO immunoassay above the laboratory positive cut.'),
      yesNo('ild', 'Fibrosis or ILD on chest imaging', 3,
        'Chest CT showing pulmonary fibrosis or interstitial lung disease.'),
      yesNo('gn', 'Pauci-immune glomerulonephritis', 3,
        'Glomerulonephritis with little or no immune deposits (typically RPGN / biopsy-proven).'),
      yesNo('pr3', 'c-ANCA or anti-PR3 positive', -1,
        'c-ANCA (IIF) or anti-PR3 immunoassay above the laboratory positive cut (subtracts points).'),
      yesNo('eosinophils', 'Eosinophils ≥1×10⁹/L', -4,
        'Peripheral blood eosinophils ≥1.0 × 10⁹/L (≥1000/µL); subtracts points toward EGPA.'),
    ],
    calculate(values) {
      const nasal = bool(values.nasal) ? -3 : 0;
      const mpo = bool(values.mpo) ? 6 : 0;
      const ild = bool(values.ild) ? 3 : 0;
      const gn = bool(values.gn) ? 3 : 0;
      const pr3 = bool(values.pr3) ? -1 : 0;
      const eos = bool(values.eosinophils) ? -4 : 0;
      const score = nasal + mpo + ild + gn + pr3 + eos;
      const entry = bool(values.entryVasculitis);
      const classified = entry && score >= 5;
      return classResult(
        score,
        classified,
        'MPA',
        classified
          ? `Score ${score} (≥5) with vasculitis entry.`
          : `Score ${score}. Classification requires ≥5 points and vasculitis entry (entry ${entry ? 'met' : 'not met'}).`,
        [
          { label: 'Vasculitis entry', value: entry ? 'Yes' : 'No' },
          { label: 'Nasal discharge / crusting / ulcers', value: bool(values.nasal) ? 'Yes (−3)' : 'No' },
          { label: 'p-ANCA / anti-MPO', value: bool(values.mpo) ? 'Yes (+6)' : 'No' },
          { label: 'Fibrosis or ILD', value: bool(values.ild) ? 'Yes (+3)' : 'No' },
          { label: 'Pauci-immune GN', value: bool(values.gn) ? 'Yes (+3)' : 'No' },
          { label: 'c-ANCA / anti-PR3', value: bool(values.pr3) ? 'Yes (−1)' : 'No' },
          { label: 'Eosinophils ≥1×10⁹/L', value: bool(values.eosinophils) ? 'Yes (−4)' : 'No' },
        ],
      );
    },
    evidence: {
      summary:
        '2022 ACR/EULAR MPA: MPO-ANCA +6, ILD +3, pauci-immune GN +3, nasal disease −3, PR3 −1, eosinophilia −4. Classify if ≥5 after vasculitis entry.',
      formula: 'Sum of signed item weights; classify if entry AND ≥5',
      validation: 'Suppiah et al. 2022; validation sensitivity 91%, specificity 94%.',
      references: [
        {
          title: '2022 ACR/EULAR classification criteria for microscopic polyangiitis',
          citation: 'Suppiah R et al. Ann Rheum Dis. 2022',
          year: 2022,
          pmid: '35110332',
          doi: '10.1136/annrheumdis-2021-221796',
        },
      ],
    },
    nextSteps: classSteps('MPA'),
    pearls: classPearls([
      'Nasal crusting subtracts points and steers classification toward GPA.',
      'Apply only after a clinical vasculitis diagnosis.',
    ]),
  },

  // ─── 8. 2022 ACR/EULAR EGPA ──────────────────────────────────────────────
  {
    id: 'acr-eular-egpa-2022',
    name: '2022 ACR/EULAR Eosinophilic Granulomatosis with Polyangiitis Classification',
    shortName: 'ACR/EULAR EGPA',
    description:
      '2022 ACR/EULAR EGPA classification. Threshold ≥6 (obstructive airway disease +3, nasal polyps +3, eosinophilia +5; PR3-ANCA and hematuria subtract).',
    category: 'rheumatology',
    tags: ['egpa', 'churg-strauss', 'eosinophil', 'anca', 'vasculitis', 'classification'],
    whenToUse: 'After a clinical diagnosis of small- or medium-vessel vasculitis, to classify EGPA for research.',
    whyUse: 'Weighted 2022 criteria distinguish EGPA from GPA/MPA using eosinophils, asthma, and polyps.',
    inputs: [
      yesNo('airway', 'Obstructive airway disease (e.g. asthma)', 3,
        'Physician-diagnosed asthma or other obstructive airway disease (spirometry obstruction or consistent clinical diagnosis).'),
      yesNo('polyps', 'Nasal polyps', 3,
        'Nasal polyps on exam or ENT endoscopy/imaging.'),
      yesNo('mononeuritis', 'Mononeuritis multiplex', 1,
        'Sequential or simultaneous involvement of ≥2 named peripheral nerves (asymmetric sensorimotor deficits), not a length-dependent polyneuropathy alone.'),
      yesNo('eosinophils', 'Eosinophils ≥1×10⁹/L', 5,
        'Peripheral blood eosinophils ≥1.0 × 10⁹/L (≥1000/µL).'),
      yesNo('extravascularEos', 'Extravascular eosinophilic inflammation on biopsy', 2,
        'Biopsy showing eosinophilic inflammation outside blood vessels (e.g. lung, nerve, gut).'),
      yesNo('pr3', 'c-ANCA or anti-PR3 positive', -3,
        'c-ANCA (IIF) or anti-PR3 immunoassay above the laboratory positive cut (subtracts points).'),
      yesNo('hematuria', 'Hematuria', -1, 'Dipstick ≥1+ or >5 RBC/HPF, not explained by infection/stone.'),
    ],
    calculate(values) {
      const airway = bool(values.airway) ? 3 : 0;
      const polyps = bool(values.polyps) ? 3 : 0;
      const mono = bool(values.mononeuritis) ? 1 : 0;
      const eos = bool(values.eosinophils) ? 5 : 0;
      const extra = bool(values.extravascularEos) ? 2 : 0;
      const pr3 = bool(values.pr3) ? -3 : 0;
      const hematuria = bool(values.hematuria) ? -1 : 0;
      const score = airway + polyps + mono + eos + extra + pr3 + hematuria;
      const classified = score >= 6;
      return classResult(
        score,
        classified,
        'EGPA',
        classified ? `Score ${score} (≥6).` : `Score ${score} (<6).`,
        [
          { label: 'Obstructive airway disease', value: bool(values.airway) ? 'Yes (+3)' : 'No' },
          { label: 'Nasal polyps', value: bool(values.polyps) ? 'Yes (+3)' : 'No' },
          { label: 'Mononeuritis multiplex', value: bool(values.mononeuritis) ? 'Yes (+1)' : 'No' },
          { label: 'Eosinophils ≥1×10⁹/L', value: bool(values.eosinophils) ? 'Yes (+5)' : 'No' },
          { label: 'Extravascular eosinophilic inflammation', value: bool(values.extravascularEos) ? 'Yes (+2)' : 'No' },
          { label: 'c-ANCA / anti-PR3', value: bool(values.pr3) ? 'Yes (−3)' : 'No' },
          { label: 'Hematuria', value: bool(values.hematuria) ? 'Yes (−1)' : 'No' },
        ],
      );
    },
    evidence: {
      summary:
        '2022 ACR/EULAR EGPA: obstructive airway disease +3, nasal polyps +3, mononeuritis +1, eosinophils ≥1×10⁹/L +5, extravascular eosinophils +2, PR3 −3, hematuria −1. Classify if ≥6.',
      formula: 'Sum of signed item weights; classify if ≥6',
      validation: 'Grayson et al. 2022; validation sensitivity 85%, specificity 99%.',
      references: [
        {
          title: '2022 ACR/EULAR classification criteria for eosinophilic granulomatosis with polyangiitis',
          citation: 'Grayson PC et al. Ann Rheum Dis. 2022',
          year: 2022,
          pmid: '35110334',
          doi: '10.1136/annrheumdis-2021-221794',
        },
      ],
    },
    nextSteps: classSteps('EGPA'),
    pearls: classPearls([
      'Apply only after a clinical diagnosis of small- or medium-vessel vasculitis with mimics excluded (infection, cocaine/levamisole, malignancy). Asthma + eosinophilia already scores 8 and classifies as EGPA.',
      'PR3-ANCA and hematuria subtract points toward GPA.',
    ]),
  },

  // ─── 9. 2022 ACR/EULAR GCA ───────────────────────────────────────────────
  {
    id: 'acr-eular-gca-2022',
    name: '2022 ACR/EULAR Giant Cell Arteritis Classification',
    shortName: 'ACR/EULAR GCA',
    description:
      '2022 ACR/EULAR GCA classification. Entry: age ≥50. Threshold ≥6 (positive TAB or halo sign +5; ESR/CRP +3; cranial and large-vessel items +2–3).',
    category: 'rheumatology',
    tags: ['gca', 'temporal arteritis', 'large vessel', 'classification'],
    whenToUse: 'Age ≥50 with suspected large-vessel vasculitis when classifying GCA for research.',
    whyUse: 'Incorporates ultrasound halo sign, FDG-PET, and axillary imaging alongside TAB.',
    inputs: [
      numberInput('age', 'Age (years)', { unit: 'years', min: 0, max: 120, step: 1, defaultValue: 70, helpText: 'Entry requires age ≥50; points are still computed if younger' }),
      yesNo('morningStiffness', 'Morning stiffness in shoulders/neck', 2,
        'Morning stiffness of the shoulder girdle and/or neck on waking (PMR-like).'),
      yesNo('claudication', 'Jaw or tongue claudication', 2,
        'Pain in the jaw or tongue provoked by chewing or talking and easing with rest.'),
      yesNo('headache', 'New temporal headache', 2,
        'New-onset headache localized to the temporal region (not a longstanding tension/migraine pattern).'),
      yesNo('scalp', 'Scalp tenderness', 2,
        'Tenderness of the scalp, typically over the temporal arteries.'),
      yesNo('abnormalTA', 'Abnormal temporal artery examination', 2, 'Absent or diminished pulse, tenderness, or cord-like thickening of a temporal artery.'),
      yesNo('visualLoss', 'Sudden visual loss', 3,
        'Sudden visual loss attributed to GCA (amaurosis fugax, AION, or permanent vision loss).'),
      yesNo('axillary', 'Bilateral axillary involvement on imaging', 2, 'Bilateral axillary artery wall thickening, stenosis, or occlusion on US/CTA/MRA.'),
      yesNo('petAorta', 'FDG-PET activity throughout the aorta', 2,
        'Abnormal FDG uptake involving the aorta in a circumferential/large-vessel pattern (not a single atherosclerotic hotspot).'),
      yesNo('esrCrp', 'ESR ≥50 mm/h or CRP ≥10 mg/L', 3,
        'ESR ≥50 mm/h or CRP ≥10 mg/L (10 mg/L = 1.0 mg/dL). Either meets the item.'),
      yesNo('tabHalo', 'Positive temporal artery biopsy or halo sign on TA ultrasound', 5, 'TAB with vasculitis (mononuclear infiltrate ± giant cells), or halo sign = homogeneous hypoechoic mural thickening of the temporal artery on US.'),
    ],
    calculate(values) {
      const age = num(values.age, 0);
      const stiffness = bool(values.morningStiffness) ? 2 : 0;
      const claud = bool(values.claudication) ? 2 : 0;
      const ha = bool(values.headache) ? 2 : 0;
      const scalp = bool(values.scalp) ? 2 : 0;
      const ta = bool(values.abnormalTA) ? 2 : 0;
      const vision = bool(values.visualLoss) ? 3 : 0;
      const ax = bool(values.axillary) ? 2 : 0;
      const pet = bool(values.petAorta) ? 2 : 0;
      const apr = bool(values.esrCrp) ? 3 : 0;
      const tab = bool(values.tabHalo) ? 5 : 0;
      const score = stiffness + claud + ha + scalp + ta + vision + ax + pet + apr + tab;
      const classified = age >= 50 && score >= 6;
      return classResult(
        score,
        classified,
        'GCA',
        classified
          ? `Score ${score} (≥6) at age ${age} (≥50).`
          : `Score ${score}. Classification requires ≥6 points AND age ≥50 (age ${age}).`,
        [
          { label: 'Age', value: `${age} years` },
          { label: 'Age ≥50 entry', value: age >= 50 ? 'Met' : 'Not met' },
          { label: 'Morning stiffness shoulders/neck', value: bool(values.morningStiffness) ? 'Yes (+2)' : 'No' },
          { label: 'Jaw/tongue claudication', value: bool(values.claudication) ? 'Yes (+2)' : 'No' },
          { label: 'New temporal headache', value: bool(values.headache) ? 'Yes (+2)' : 'No' },
          { label: 'Scalp tenderness', value: bool(values.scalp) ? 'Yes (+2)' : 'No' },
          { label: 'Abnormal temporal artery exam', value: bool(values.abnormalTA) ? 'Yes (+2)' : 'No' },
          { label: 'Sudden visual loss', value: bool(values.visualLoss) ? 'Yes (+3)' : 'No' },
          { label: 'Bilateral axillary imaging', value: bool(values.axillary) ? 'Yes (+2)' : 'No' },
          { label: 'FDG-PET throughout aorta', value: bool(values.petAorta) ? 'Yes (+2)' : 'No' },
          { label: 'ESR ≥50 or CRP ≥10 mg/L', value: bool(values.esrCrp) ? 'Yes (+3)' : 'No' },
          { label: 'Positive TAB or halo sign', value: bool(values.tabHalo) ? 'Yes (+5)' : 'No' },
        ],
      );
    },
    evidence: {
      summary:
        '2022 ACR/EULAR GCA: absolute requirement age ≥50. Additive cranial, ischemic, laboratory, biopsy/ultrasound, and large-vessel imaging items. Classify if ≥6.',
      formula: 'Sum of item weights; classify if age ≥50 AND ≥6',
      validation: 'Ponte et al. 2022; validation sensitivity 87%, specificity 95%.',
      references: [
        {
          title: '2022 ACR/EULAR classification criteria for giant cell arteritis',
          citation: 'Ponte C et al. Arthritis Rheumatol. 2022',
          year: 2022,
          pmid: '36350123',
          doi: '10.1002/art.42325',
        },
      ],
    },
    nextSteps: classSteps('GCA'),
    pearls: classPearls([
      'Positive TAB or halo sign is 5 points — still needs 1 more point (e.g. raised ESR/CRP) plus age ≥50.',
      'Do not delay high-dose glucocorticoids for suspected cranial GCA while awaiting classification.',
    ]),
  },

  // ─── 10. 2022 ACR/EULAR TAK ──────────────────────────────────────────────
  {
    id: 'acr-eular-tak-2022',
    name: '2022 ACR/EULAR Takayasu Arteritis Classification',
    shortName: 'ACR/EULAR TAK',
    description:
      '2022 ACR/EULAR Takayasu arteritis classification. Entry: age ≤60 and imaging evidence of large-vessel vasculitis. Threshold ≥5.',
    category: 'rheumatology',
    tags: ['takayasu', 'large vessel', 'vasculitis', 'classification'],
    whenToUse: 'Age ≤60 with imaging evidence of large-vessel vasculitis when classifying Takayasu arteritis.',
    whyUse: 'Modern imaging-inclusive criteria outperform 1990 ACR TAK criteria.',
    inputs: [
      numberInput('age', 'Age (years)', { unit: 'years', min: 0, max: 120, step: 1, defaultValue: 30, helpText: 'Entry requires age ≤60' }),
      yesNo('imagingLVV', 'Imaging evidence of large-vessel vasculitis (entry)', null,
        'CTA, MRA, PET, or catheter angiography showing stenosis, occlusion, aneurysm, or mural thickening of the aorta or its major branches, attributed to vasculitis (not atherosclerosis alone).'),
      selectInput('sex', 'Sex', TAK_SEX),
      yesNo('angina', 'Angina or ischemic cardiac pain', 2,
        'Angina or ischemic cardiac pain attributed to coronary or aortic involvement.'),
      yesNo('claudication', 'Limb claudication', 2,
        'Exertional limb pain (arm or leg) that eases with rest, attributed to arterial stenosis.'),
      yesNo('bruit', 'Arterial bruit', 2,
        'Audible bruit over a large artery (carotid, subclavian, abdominal aorta, or femoral) attributed to TAK.'),
      yesNo('reducedUEPulse', 'Reduced upper-extremity pulse', 2,
        'Diminished or absent brachial or radial pulse on one or both sides.'),
      yesNo('carotid', 'Reduced pulse or tenderness of a carotid artery', 2,
        'Diminished carotid pulse or carotidynia (tenderness over a carotid).'),
      yesNo('bpDiff', 'Blood-pressure difference between arms ≥20 mm Hg', 1,
        'Systolic BP difference ≥20 mm Hg between the two arms (measure both).'),
      selectInput('territories', 'Number of affected arterial territories', TAK_TERR, undefined, 'Count luminal damage (stenosis/occlusion/aneurysm) among 9 territories: thoracic aorta, abdominal aorta, mesenteric, left carotid, right carotid, left subclavian, right subclavian, left renal, right renal.'),
      yesNo('pairedArteries', 'Paired artery involvement', 1, 'Both arteries of a paired set (e.g. both carotids, both subclavians, or both renals).'),
      yesNo('abdominalAorta', 'Abdominal aorta plus renal or mesenteric involvement', 3,
        'Luminal damage of the abdominal aorta AND a renal or mesenteric artery (stenosis, occlusion, or aneurysm).'),
    ],
    calculate(values) {
      const age = num(values.age, 0);
      const imaging = bool(values.imagingLVV);
      const sexPts = pts(TAK_SEX, values.sex);
      const angina = bool(values.angina) ? 2 : 0;
      const claud = bool(values.claudication) ? 2 : 0;
      const bruit = bool(values.bruit) ? 2 : 0;
      const ue = bool(values.reducedUEPulse) ? 2 : 0;
      const carotid = bool(values.carotid) ? 2 : 0;
      const bp = bool(values.bpDiff) ? 1 : 0;
      const terr = pts(TAK_TERR, values.territories);
      const paired = bool(values.pairedArteries) ? 1 : 0;
      const abd = bool(values.abdominalAorta) ? 3 : 0;
      const score = sexPts + angina + claud + bruit + ue + carotid + bp + terr + paired + abd;
      const entry = age <= 60 && imaging;
      const classified = entry && score >= 5;
      return classResult(
        score,
        classified,
        'Takayasu arteritis',
        classified
          ? `Score ${score} (≥5) with age ${age} ≤60 and LVV imaging.`
          : `Score ${score}. Classification requires ≥5 points AND age ≤60 AND LVV imaging (age ${age}; imaging ${imaging ? 'yes' : 'no'}).`,
        [
          { label: 'Age', value: `${age} years` },
          { label: 'Imaging LVV entry', value: imaging ? 'Yes' : 'No' },
          { label: 'Entry (age ≤60 and imaging)', value: entry ? 'Met' : 'Not met' },
          { label: 'Sex', value: `${lab(TAK_SEX, values.sex)} (${sexPts})` },
          { label: 'Angina', value: bool(values.angina) ? 'Yes (+2)' : 'No' },
          { label: 'Limb claudication', value: bool(values.claudication) ? 'Yes (+2)' : 'No' },
          { label: 'Arterial bruit', value: bool(values.bruit) ? 'Yes (+2)' : 'No' },
          { label: 'Reduced UE pulse', value: bool(values.reducedUEPulse) ? 'Yes (+2)' : 'No' },
          { label: 'Carotid pulse reduction/tenderness', value: bool(values.carotid) ? 'Yes (+2)' : 'No' },
          { label: 'BP difference ≥20 mm Hg', value: bool(values.bpDiff) ? 'Yes (+1)' : 'No' },
          { label: 'Affected territories', value: `${lab(TAK_TERR, values.territories)} (${terr})` },
          { label: 'Paired artery involvement', value: bool(values.pairedArteries) ? 'Yes (+1)' : 'No' },
          { label: 'Abdominal aorta + renal/mesenteric', value: bool(values.abdominalAorta) ? 'Yes (+3)' : 'No' },
        ],
      );
    },
    evidence: {
      summary:
        '2022 ACR/EULAR TAK: absolute requirements age ≤60 and LVV imaging. Additive clinical and imaging items (female +1, claudication +2, territories +1 to +3, abdominal aorta plus renal/mesenteric +3). Classify if ≥5.',
      formula: 'Sum of item weights; classify if age ≤60 AND LVV imaging AND ≥5',
      validation: 'Grayson et al. 2022; validation sensitivity 94%, specificity 99%.',
      references: [
        {
          title: '2022 ACR/EULAR classification criteria for Takayasu arteritis',
          citation: 'Grayson PC et al. Ann Rheum Dis. 2022',
          year: 2022,
          pmid: '36351705',
          doi: '10.1136/ard-2022-223482',
        },
      ],
    },
    nextSteps: classSteps('Takayasu arteritis'),
    pearls: classPearls([
      'Age ≤60 plus LVV imaging is mandatory — a high point total without imaging does not classify.',
      'Territories typically include thoracic/abdominal aorta, mesenteric, carotids, subclavians, and renals.',
    ]),
  },

  // ─── 11. CASPAR ──────────────────────────────────────────────────────────
  {
    id: 'caspar-psa',
    name: 'CASPAR Psoriatic Arthritis Classification (2006)',
    shortName: 'CASPAR',
    description:
      'CASPAR 2006 psoriatic arthritis classification. Inflammatory articular disease plus ≥3 points (current psoriasis 2, or personal/family history 1; nail dystrophy, negative RF, dactylitis, juxta-articular new bone).',
    category: 'rheumatology',
    tags: ['psa', 'psoriatic arthritis', 'caspar', 'classification'],
    whenToUse: 'Inflammatory articular disease (joint, spine, or entheseal) when classifying PsA.',
    whyUse: 'Standard research classification for psoriatic arthritis with high specificity.',
    inputs: [
      yesNo('entryInflammatory', 'Inflammatory articular disease (joint, spine, or enthesis) — entry', null, 'Inflammatory joint, spine, or entheseal disease (synovitis, spondylitis, or enthesitis) — not degenerative pain.'),
      selectInput('psoriasis', 'Psoriasis (highest applicable)', CASPAR_PSO, undefined, 'Current psoriasis (rheumatologist or dermatologist) = 2; personal history = 1; family history (1st/2nd degree) = 1. Pick the highest applicable.'),
      yesNo('nail', 'Psoriatic nail dystrophy', 1, 'Onycholysis, pitting, or hyperkeratosis (current).'),
      yesNo('rfNeg', 'Rheumatoid factor negative', 1, 'Negative by any method except latex (typically nephelometry).'),
      yesNo('dactylitis', 'Dactylitis (current or history)', 1, 'Entire-digit swelling (sausage digit), current or historically recorded by a rheumatologist.'),
      yesNo('juxtaBone', 'Juxta-articular new bone formation on radiographs', 1, 'Ill-defined ossification near joint margins on hand/foot radiographs (not osteophytes).'),
    ],
    calculate(values) {
      const pso = pts(CASPAR_PSO, values.psoriasis);
      const nail = bool(values.nail) ? 1 : 0;
      const rf = bool(values.rfNeg) ? 1 : 0;
      const dac = bool(values.dactylitis) ? 1 : 0;
      const bone = bool(values.juxtaBone) ? 1 : 0;
      const score = pso + nail + rf + dac + bone;
      const entry = bool(values.entryInflammatory);
      const classified = entry && score >= 3;
      return classResult(
        score,
        classified,
        'PsA (CASPAR)',
        classified
          ? `Score ${score} (≥3) with inflammatory articular entry.`
          : `Score ${score}. Classification requires inflammatory articular disease plus ≥3 points (entry ${entry ? 'met' : 'not met'}).`,
        [
          { label: 'Inflammatory articular entry', value: entry ? 'Yes' : 'No' },
          { label: 'Psoriasis', value: `${lab(CASPAR_PSO, values.psoriasis)} (${pso})` },
          { label: 'Nail dystrophy', value: bool(values.nail) ? 'Yes (1)' : 'No' },
          { label: 'RF negative', value: bool(values.rfNeg) ? 'Yes (1)' : 'No' },
          { label: 'Dactylitis', value: bool(values.dactylitis) ? 'Yes (1)' : 'No' },
          { label: 'Juxta-articular new bone', value: bool(values.juxtaBone) ? 'Yes (1)' : 'No' },
        ],
      );
    },
    evidence: {
      summary:
        'CASPAR: inflammatory articular disease plus ≥3 of: current psoriasis (2) or personal/family history (1); nail dystrophy (1); RF negative (1); dactylitis (1); juxta-articular bony proliferation (1).',
      formula: 'Highest psoriasis item + nail + RF− + dactylitis + new bone; classify if entry AND ≥3',
      validation: 'Taylor et al. 2006; specificity 98.7%, sensitivity 91.4%.',
      references: [
        {
          title: 'Classification criteria for psoriatic arthritis: development of new criteria from a large international study (CASPAR)',
          citation: 'Taylor W et al. Arthritis Rheum. 2006',
          year: 2006,
          pmid: '16871531',
          doi: '10.1002/art.21972',
        },
      ],
    },
    nextSteps: classSteps('PsA'),
    pearls: classPearls([
      'Current psoriasis is worth 2 points; personal and family history are 1 each and are mutually exclusive with current disease in this tool.',
      'RF must be negative by any method except latex — typically nephelometry.',
    ]),
  },

  // ─── 12. ASAS axial SpA ──────────────────────────────────────────────────
  {
    id: 'asas-axspa',
    name: 'ASAS Axial Spondyloarthritis Classification (2009)',
    shortName: 'ASAS axSpA',
    description:
      'ASAS 2009 axial SpA classification. Entry: back pain ≥3 months with age of onset <45. Imaging arm: sacroiliitis plus ≥1 SpA feature. Clinical arm: HLA-B27 plus ≥2 other SpA features.',
    category: 'rheumatology',
    tags: ['axial spa', 'ankylosing spondylitis', 'asas', 'hla-b27', 'classification'],
    whenToUse: 'Chronic back pain with onset before age 45 when classifying axial SpA.',
    whyUse: 'Defines both radiographic and non-radiographic axial SpA for research.',
    inputs: [
      yesNo('entryBackPain', 'Back pain ≥3 months with age of onset <45 (entry)', null,
        'Chronic back pain lasting ≥3 months, with age at onset <45 years.'),
      yesNo('ibp', 'Inflammatory back pain', null, 'ASAS IBP if ≥4 of 5 — onset <40 y, insidious, improves with exercise, no improvement with rest, night pain (better on getting up).'),
      yesNo('arthritis', 'Arthritis', null, 'Synovitis diagnosed by a physician.'),
      yesNo('enthesitis', 'Heel enthesitis', null, 'Achilles insertion or plantar fascia; physician-diagnosed.'),
      yesNo('uveitis', 'Uveitis', null,
        'Typically acute anterior uveitis diagnosed by an ophthalmologist.'),
      yesNo('dactylitis', 'Dactylitis', null,
        'Entire-digit swelling (sausage digit), current or historically recorded by a physician.'),
      yesNo('psoriasis', 'Psoriasis', null,
        'Physician-diagnosed psoriasis (skin or nail).'),
      yesNo('ibd', 'Inflammatory bowel disease', null,
        'Physician-diagnosed Crohn disease or ulcerative colitis.'),
      yesNo('nsaidResponse', 'Good response to NSAIDs', null, 'Back pain much better within 24–48 h of full-dose NSAID.'),
      yesNo('familySpA', 'Family history of SpA', null, '1st- or 2nd-degree relative with AS/axSpA, psoriasis, acute uveitis, reactive arthritis, or IBD.'),
      yesNo('hlaB27', 'HLA-B27 positive', null),
      yesNo('crp', 'Elevated CRP', null, 'Above lab ULN, attributed to SpA.'),
      yesNo('sacroiliitis', 'Sacroiliitis on MRI or radiograph (imaging arm)', null, 'Radiographic modified New York (bilateral ≥grade 2 or unilateral ≥grade 3) or MRI bone-marrow edema highly suggestive of SpA (ASAS: ≥2 lesions on one slice or 1 lesion on ≥2 slices).'),
    ],
    calculate(values) {
      const entry = bool(values.entryBackPain);
      const ibp = bool(values.ibp);
      const arthritis = bool(values.arthritis);
      const enthesitis = bool(values.enthesitis);
      const uveitis = bool(values.uveitis);
      const dactylitis = bool(values.dactylitis);
      const psoriasis = bool(values.psoriasis);
      const ibd = bool(values.ibd);
      const nsaid = bool(values.nsaidResponse);
      const family = bool(values.familySpA);
      const hla = bool(values.hlaB27);
      const crp = bool(values.crp);
      const sacro = bool(values.sacroiliitis);
      const features: string[] = [];
      if (ibp) features.push('IBP');
      if (arthritis) features.push('arthritis');
      if (enthesitis) features.push('heel enthesitis');
      if (uveitis) features.push('uveitis');
      if (dactylitis) features.push('dactylitis');
      if (psoriasis) features.push('psoriasis');
      if (ibd) features.push('IBD');
      if (nsaid) features.push('NSAID response');
      if (family) features.push('family SpA');
      if (hla) features.push('HLA-B27');
      if (crp) features.push('elevated CRP');
      if (sacro) features.push('sacroiliitis');
      const otherThanSacro = [ibp, arthritis, enthesitis, uveitis, dactylitis, psoriasis, ibd, nsaid, family, hla, crp].filter(Boolean).length;
      const otherThanHla = [ibp, arthritis, enthesitis, uveitis, dactylitis, psoriasis, ibd, nsaid, family, crp, sacro].filter(Boolean).length;
      const imagingArm = sacro && otherThanSacro >= 1;
      const clinicalArm = hla && otherThanHla >= 2;
      const classified = entry && (imagingArm || clinicalArm);
      const arm = imagingArm && clinicalArm ? 'Both arms' : imagingArm ? 'Imaging arm' : clinicalArm ? 'Clinical arm' : 'Not classified';
      return classResult(
        classified ? arm : 'Not classified',
        classified,
        'axial SpA',
        classified
          ? `Meets ASAS axial SpA via ${arm.toLowerCase()} (entry met). Features: ${features.join(', ') || 'none'}.`
          : `Does not meet imaging arm (sacroiliitis + ≥1 SpA feature) or clinical arm (HLA-B27 + ≥2 other SpA features). Entry ${entry ? 'met' : 'not met'}. Features: ${features.join(', ') || 'none'}.`,
        [
          { label: 'Entry (chronic back pain, onset <45)', value: entry ? 'Yes' : 'No' },
          { label: 'Imaging arm', value: imagingArm ? 'Met' : 'Not met' },
          { label: 'Clinical arm', value: clinicalArm ? 'Met' : 'Not met' },
          { label: 'Inflammatory back pain', value: ibp ? 'Yes' : 'No' },
          { label: 'Arthritis', value: arthritis ? 'Yes' : 'No' },
          { label: 'Heel enthesitis', value: enthesitis ? 'Yes' : 'No' },
          { label: 'Uveitis', value: uveitis ? 'Yes' : 'No' },
          { label: 'Dactylitis', value: dactylitis ? 'Yes' : 'No' },
          { label: 'Psoriasis', value: psoriasis ? 'Yes' : 'No' },
          { label: 'IBD', value: ibd ? 'Yes' : 'No' },
          { label: 'Good NSAID response', value: nsaid ? 'Yes' : 'No' },
          { label: 'Family history of SpA', value: family ? 'Yes' : 'No' },
          { label: 'HLA-B27', value: hla ? 'Yes' : 'No' },
          { label: 'Elevated CRP', value: crp ? 'Yes' : 'No' },
          { label: 'Sacroiliitis on imaging', value: sacro ? 'Yes' : 'No' },
          { label: 'SpA features present', value: features.join(', ') || 'none' },
        ],
      );
    },
    evidence: {
      summary:
        'ASAS 2009 axial SpA: in patients with back pain ≥3 months and onset <45 years, either sacroiliitis on MRI/x-ray plus ≥1 SpA feature, or HLA-B27 plus ≥2 other SpA features.',
      formula: 'Imaging arm: sacroiliitis AND ≥1 other SpA feature. Clinical arm: HLA-B27 AND ≥2 other SpA features. Entry required.',
      validation: 'Rudwaleit et al. 2009; imaging-arm sensitivity 66% / specificity 97%; clinical-arm sensitivity 83% / specificity 84% in the original cohort.',
      references: [
        {
          title: 'The development of Assessment of SpondyloArthritis international Society classification criteria for axial spondyloarthritis (part II)',
          citation: 'Rudwaleit M et al. Ann Rheum Dis. 2009',
          year: 2009,
          pmid: '19297344',
          doi: '10.1136/ard.2009.108233',
        },
      ],
    },
    nextSteps: classSteps('axial SpA'),
    pearls: classPearls([
      'HLA-B27 plus sacroiliitis alone is the imaging arm (sacroiliitis + 1 feature), not the clinical arm.',
      'These criteria do not replace a clinical diagnosis of axSpA in everyday practice.',
    ]),
  },

  // ─── 13. ASAS peripheral SpA ─────────────────────────────────────────────
  {
    id: 'asas-perispa',
    name: 'ASAS Peripheral Spondyloarthritis Classification (2011)',
    shortName: 'ASAS pSpA',
    description:
      'ASAS 2011 peripheral SpA classification. Entry: peripheral arthritis, enthesitis, or dactylitis. Classified if ≥1 of psoriasis/IBD/preceding infection/HLA-B27/uveitis/sacroiliitis, OR ≥2 of arthritis/enthesitis/dactylitis/IBP/family SpA.',
    category: 'rheumatology',
    tags: ['peripheral spa', 'asas', 'dactylitis', 'classification'],
    whenToUse: 'Peripheral arthritis, enthesitis, or dactylitis when classifying peripheral SpA.',
    whyUse: 'Companion to ASAS axial criteria for predominantly peripheral disease.',
    inputs: [
      yesNo('entryPeripheral', 'Peripheral arthritis, enthesitis, or dactylitis (entry)', null,
        'Current peripheral arthritis (synovitis), enthesitis, or dactylitis — the presenting peripheral SpA feature.'),
      yesNo('psoriasis', 'Psoriasis', null,
        'Physician-diagnosed psoriasis (skin or nail).'),
      yesNo('ibd', 'Inflammatory bowel disease', null,
        'Physician-diagnosed Crohn disease or ulcerative colitis.'),
      yesNo('infection', 'Preceding infection', null, 'Usually urethritis/cervicitis or acute diarrhea within 1 month before arthritis (reactive-arthritis pattern).'),
      yesNo('hlaB27', 'HLA-B27 positive', null),
      yesNo('uveitis', 'Uveitis', null,
        'Typically acute anterior uveitis diagnosed by an ophthalmologist.'),
      yesNo('sacroiliitis', 'Sacroiliitis on imaging', null,
        'Radiographic modified New York sacroiliitis or MRI bone-marrow edema highly suggestive of SpA.'),
      yesNo('arthritis', 'Arthritis', null,
        'Physician-diagnosed peripheral synovitis.'),
      yesNo('enthesitis', 'Enthesitis', null, 'Physician-diagnosed enthesitis at any site (not only heel).'),
      yesNo('dactylitis', 'Dactylitis', null,
        'Entire-digit swelling (sausage digit), current or historically recorded by a physician.'),
      yesNo('ibp', 'Inflammatory back pain', null, 'ASAS IBP if ≥4 of 5 — onset <40 y, insidious, improves with exercise, no improvement with rest, night pain (better on getting up).'),
      yesNo('familySpA', 'Family history of SpA', null, '1st- or 2nd-degree relative with AS/axSpA, psoriasis, acute uveitis, reactive arthritis, or IBD.'),
    ],
    calculate(values) {
      const entry = bool(values.entryPeripheral);
      const psoriasis = bool(values.psoriasis);
      const ibd = bool(values.ibd);
      const infection = bool(values.infection);
      const hla = bool(values.hlaB27);
      const uveitis = bool(values.uveitis);
      const sacro = bool(values.sacroiliitis);
      const arthritis = bool(values.arthritis);
      const enthesitis = bool(values.enthesitis);
      const dactylitis = bool(values.dactylitis);
      const ibp = bool(values.ibp);
      const family = bool(values.familySpA);
      const catA = [psoriasis, ibd, infection, hla, uveitis, sacro].filter(Boolean).length;
      const catB = [arthritis, enthesitis, dactylitis, ibp, family].filter(Boolean).length;
      const classified = entry && (catA >= 1 || catB >= 2);
      const aList: string[] = [];
      if (psoriasis) aList.push('psoriasis');
      if (ibd) aList.push('IBD');
      if (infection) aList.push('preceding infection');
      if (hla) aList.push('HLA-B27');
      if (uveitis) aList.push('uveitis');
      if (sacro) aList.push('sacroiliitis');
      const bList: string[] = [];
      if (arthritis) bList.push('arthritis');
      if (enthesitis) bList.push('enthesitis');
      if (dactylitis) bList.push('dactylitis');
      if (ibp) bList.push('IBP');
      if (family) bList.push('family SpA');
      return classResult(
        classified ? 'Peripheral SpA classified' : 'Not classified',
        classified,
        'peripheral SpA',
        classified
          ? `Entry met and ${catA >= 1 ? '≥1 category-A feature' : '≥2 category-B features'}. A: ${aList.join(', ') || 'none'}. B: ${bList.join(', ') || 'none'}.`
          : `Requires entry (arthritis/enthesitis/dactylitis) AND (≥1 of psoriasis/IBD/infection/HLA-B27/uveitis/sacroiliitis OR ≥2 of arthritis/enthesitis/dactylitis/IBP/family SpA). Entry ${entry ? 'met' : 'not met'}. A: ${aList.join(', ') || 'none'}. B: ${bList.join(', ') || 'none'}.`,
        [
          { label: 'Entry (arthritis / enthesitis / dactylitis)', value: entry ? 'Yes' : 'No' },
          { label: 'Category A count (≥1 classifies)', value: String(catA) },
          { label: 'Category B count (≥2 classifies)', value: String(catB) },
          { label: 'Psoriasis', value: psoriasis ? 'Yes' : 'No' },
          { label: 'IBD', value: ibd ? 'Yes' : 'No' },
          { label: 'Preceding infection', value: infection ? 'Yes' : 'No' },
          { label: 'HLA-B27', value: hla ? 'Yes' : 'No' },
          { label: 'Uveitis', value: uveitis ? 'Yes' : 'No' },
          { label: 'Sacroiliitis', value: sacro ? 'Yes' : 'No' },
          { label: 'Arthritis', value: arthritis ? 'Yes' : 'No' },
          { label: 'Enthesitis', value: enthesitis ? 'Yes' : 'No' },
          { label: 'Dactylitis', value: dactylitis ? 'Yes' : 'No' },
          { label: 'Inflammatory back pain', value: ibp ? 'Yes' : 'No' },
          { label: 'Family history of SpA', value: family ? 'Yes' : 'No' },
          { label: 'Category A features', value: aList.join(', ') || 'none' },
          { label: 'Category B features', value: bList.join(', ') || 'none' },
        ],
      );
    },
    evidence: {
      summary:
        'ASAS 2011 peripheral SpA: arthritis, enthesitis, or dactylitis plus either ≥1 SpA feature from (psoriasis, IBD, preceding infection, HLA-B27, uveitis, sacroiliitis) or ≥2 from (arthritis, enthesitis, dactylitis, IBP, family SpA).',
      formula: 'Entry AND (≥1 category A OR ≥2 category B)',
      validation: 'Rudwaleit et al. 2011; sensitivity 78%, specificity 82% in the ASAS peripheral cohort.',
      references: [
        {
          title: 'The Assessment of SpondyloArthritis international Society classification criteria for peripheral spondyloarthritis and for spondyloarthritis in general',
          citation: 'Rudwaleit M et al. Ann Rheum Dis. 2011',
          year: 2011,
          pmid: '21109520',
          doi: '10.1136/ard.2010.133645',
        },
      ],
    },
    nextSteps: classSteps('peripheral SpA'),
    pearls: classPearls([
      'Patients who also fulfil axial ASAS criteria are usually classified as axial SpA.',
      'Preceding infection supports reactive arthritis within the peripheral SpA umbrella.',
    ]),
  },

  // ─── 14. Yamaguchi AOSD ──────────────────────────────────────────────────
  {
    id: 'yamaguchi-aosd',
    name: 'Yamaguchi Adult-Onset Still’s Disease Classification',
    shortName: 'Yamaguchi AOSD',
    description:
      'Yamaguchi 1992 AOSD classification. ≥5 criteria including ≥2 major, after excluding infection, malignancy, and other rheumatic disease.',
    category: 'rheumatology',
    tags: ['aosd', 'still', 'yamaguchi', 'ferritin', 'classification'],
    whenToUse: 'Fever of unknown origin with rash/arthralgia when classifying adult-onset Still’s disease.',
    whyUse: 'Most widely used AOSD classification set; high sensitivity after exclusions.',
    inputs: [
      yesNo('fever', 'Major: fever ≥39°C lasting ≥1 week', 1,
        'Fever ≥39°C (102.2°F) lasting ≥1 week (typically quotidian spikes).'),
      yesNo('arthralgia', 'Major: arthralgia lasting ≥2 weeks', 1,
        'Joint pain lasting ≥2 weeks (arthritis not required).'),
      yesNo('rash', 'Major: typical evanescent salmon-colored rash', 1, 'Macular or maculopapular salmon-colored eruption, typically with fever spikes and evanescent (fades as fever falls).'),
      yesNo('leukocytosis', 'Major: WBC ≥10×10⁹/L with ≥80% granulocytes', 1,
        'WBC ≥10 × 10⁹/L with neutrophils/granulocytes ≥80% of the differential.'),
      yesNo('soreThroat', 'Minor: sore throat', 1,
        'Pharyngitis during the febrile episode (often non-exudative).'),
      yesNo('nodesSpleen', 'Minor: lymphadenopathy and/or splenomegaly', 1,
        'Clinically or imaging-documented lymphadenopathy and/or splenomegaly.'),
      yesNo('lft', 'Minor: abnormal LFTs', 1,
        'AST, ALT, or LDH above ULN, not explained by hemolysis or myositis alone.'),
      yesNo('seronegative', 'Minor: negative RF and ANA', 1,
        'Both RF and ANA ≤ laboratory ULN / negative.'),
      yesNo('exclInfection', 'Exclusion: infection (especially sepsis / EBV)', null,
        'If infection (especially sepsis or EBV) better explains the syndrome, Yamaguchi cannot classify — mark Yes to block classification.'),
      yesNo('exclMalignancy', 'Exclusion: malignancy (especially lymphoma)', null,
        'If malignancy (especially lymphoma) better explains the syndrome, mark Yes to block classification.'),
      yesNo('exclRheum', 'Exclusion: other rheumatic disease', null,
        'If another rheumatic disease better explains the syndrome, mark Yes to block classification.'),
    ],
    calculate(values) {
      const fever = bool(values.fever) ? 1 : 0;
      const arthralgia = bool(values.arthralgia) ? 1 : 0;
      const rash = bool(values.rash) ? 1 : 0;
      const leuk = bool(values.leukocytosis) ? 1 : 0;
      const throat = bool(values.soreThroat) ? 1 : 0;
      const nodes = bool(values.nodesSpleen) ? 1 : 0;
      const lft = bool(values.lft) ? 1 : 0;
      const seroneg = bool(values.seronegative) ? 1 : 0;
      const major = fever + arthralgia + rash + leuk;
      const minor = throat + nodes + lft + seroneg;
      const score = major + minor;
      const exclInf = bool(values.exclInfection);
      const exclMal = bool(values.exclMalignancy);
      const exclRheum = bool(values.exclRheum);
      const excluded = exclInf || exclMal || exclRheum;
      const classified = !excluded && score >= 5 && major >= 2;
      return classResult(
        score,
        classified,
        'AOSD (Yamaguchi)',
        classified
          ? `${major} major + ${minor} minor = ${score} (≥5 with ≥2 major); exclusions negative.`
          : `${major} major + ${minor} minor = ${score}. Requires ≥5 criteria including ≥2 major and no exclusions (excluded: ${excluded ? 'yes' : 'no'}).`,
        [
          { label: 'Major count', value: String(major) },
          { label: 'Minor count', value: String(minor) },
          { label: 'Fever ≥39°C ≥1 week', value: bool(values.fever) ? 'Yes' : 'No' },
          { label: 'Arthralgia ≥2 weeks', value: bool(values.arthralgia) ? 'Yes' : 'No' },
          { label: 'Typical rash', value: bool(values.rash) ? 'Yes' : 'No' },
          { label: 'Leukocytosis ≥10k with ≥80% granulocytes', value: bool(values.leukocytosis) ? 'Yes' : 'No' },
          { label: 'Sore throat', value: bool(values.soreThroat) ? 'Yes' : 'No' },
          { label: 'Lymphadenopathy / splenomegaly', value: bool(values.nodesSpleen) ? 'Yes' : 'No' },
          { label: 'Abnormal LFTs', value: bool(values.lft) ? 'Yes' : 'No' },
          { label: 'Negative RF and ANA', value: bool(values.seronegative) ? 'Yes' : 'No' },
          { label: 'Exclusion: infection', value: exclInf ? 'Yes — cannot classify' : 'No' },
          { label: 'Exclusion: malignancy', value: exclMal ? 'Yes — cannot classify' : 'No' },
          { label: 'Exclusion: other rheumatic disease', value: exclRheum ? 'Yes — cannot classify' : 'No' },
        ],
      );
    },
    evidence: {
      summary:
        'Yamaguchi 1992: 4 major (fever, arthralgia, typical rash, leukocytosis with neutrophilia) and 4 minor (sore throat, lymphadenopathy/splenomegaly, liver dysfunction, negative RF+ANA). Classify if ≥5 including ≥2 major after excluding infection, malignancy, and other rheumatic disease.',
      formula: 'Score = major + minor count; classify if ≥5 AND ≥2 major AND no exclusions',
      validation: 'Yamaguchi et al. J Rheumatol 1992; reported sensitivity 96%, specificity 92% with the exclusion process.',
      references: [
        {
          title: 'Preliminary criteria for classification of adult Still’s disease',
          citation: 'Yamaguchi M et al. J Rheumatol. 1992;19:424–30',
          year: 1992,
          pmid: '1578458',
        },
      ],
    },
    nextSteps: classSteps('AOSD'),
    pearls: classPearls([
      'Exclusions are mandatory — infection and lymphoma can mimic AOSD exactly.',
      'Ferritin is supportive clinically but is not a Yamaguchi criterion (it is in Fautrel).',
    ]),
  },

  // ─── 15. Fautrel AOSD ────────────────────────────────────────────────────
  {
    id: 'fautrel-aosd',
    name: 'Fautrel Adult-Onset Still’s Disease Classification',
    shortName: 'Fautrel AOSD',
    description:
      'Fautrel AOSD classification. ≥4 major criteria, or 3 major + 2 minor. Major items include glycosylated ferritin ≤20%. No formal exclusion list.',
    category: 'rheumatology',
    tags: ['aosd', 'still', 'fautrel', 'glycosylated ferritin', 'classification'],
    whenToUse: 'When Yamaguchi exclusions are difficult to apply or glycosylated ferritin is available.',
    whyUse: 'Adds glycosylated ferritin and omits a formal exclusion step.',
    inputs: [
      yesNo('spikeFever', 'Major: spiking fever ≥39°C', 1,
        'Spiking (typically quotidian) fever ≥39°C (102.2°F).'),
      yesNo('arthralgia', 'Major: arthralgia', 1,
        'Joint pain (arthritis not required).'),
      yesNo('transientErythema', 'Major: transient erythema', 1,
        'Transient macular erythema with fever spikes (distinct from the minor “typical Still’s rash”).'),
      yesNo('pharyngitis', 'Major: pharyngitis', 1,
        'Sore throat / pharyngitis during the febrile episode.'),
      yesNo('pmn80', 'Major: PMN ≥80%', 1,
        'Neutrophils ≥80% of the WBC differential.'),
      yesNo('glycFerritin', 'Major: glycosylated ferritin ≤20%', 1,
        'Glycosylated (glycated) ferritin fraction ≤20% of total ferritin.'),
      yesNo('typicalRash', 'Minor: typical rash', null,
        'Typical evanescent salmon-colored macular/maculopapular Still’s rash (the Yamaguchi-type rash). Distinct from the major “transient erythema” item.'),
      yesNo('leukocytosis', 'Minor: leukocytosis ≥10×10⁹/L', null,
        'WBC ≥10 × 10⁹/L.'),
    ],
    calculate(values) {
      const spike = bool(values.spikeFever) ? 1 : 0;
      const arthralgia = bool(values.arthralgia) ? 1 : 0;
      const erythema = bool(values.transientErythema) ? 1 : 0;
      const pharyngitis = bool(values.pharyngitis) ? 1 : 0;
      const pmn = bool(values.pmn80) ? 1 : 0;
      const ferr = bool(values.glycFerritin) ? 1 : 0;
      const major = spike + arthralgia + erythema + pharyngitis + pmn + ferr;
      const rash = bool(values.typicalRash) ? 1 : 0;
      const leuk = bool(values.leukocytosis) ? 1 : 0;
      const minor = rash + leuk;
      const classified = major >= 4 || (major >= 3 && minor >= 2);
      const minorList: string[] = [];
      if (bool(values.typicalRash)) minorList.push('typical rash');
      if (bool(values.leukocytosis)) minorList.push('leukocytosis ≥10k');
      return classResult(
        major,
        classified,
        'AOSD (Fautrel)',
        classified
          ? `${major} major + ${minor} minor meets ≥4 major or 3 major + 2 minor. Minors: ${minorList.join(', ') || 'none'}.`
          : `${major} major + ${minor} minor. Requires ≥4 major or 3 major + 2 minor. Minors: ${minorList.join(', ') || 'none'}.`,
        [
          { label: 'Major count (score)', value: String(major) },
          { label: 'Minor count', value: String(minor) },
          { label: 'Minors present', value: minorList.join(', ') || 'none' },
          { label: 'Spiking fever ≥39°C', value: bool(values.spikeFever) ? 'Yes' : 'No' },
          { label: 'Arthralgia', value: bool(values.arthralgia) ? 'Yes' : 'No' },
          { label: 'Transient erythema', value: bool(values.transientErythema) ? 'Yes' : 'No' },
          { label: 'Pharyngitis', value: bool(values.pharyngitis) ? 'Yes' : 'No' },
          { label: 'PMN ≥80%', value: bool(values.pmn80) ? 'Yes' : 'No' },
          { label: 'Glycosylated ferritin ≤20%', value: bool(values.glycFerritin) ? 'Yes' : 'No' },
          { label: 'Typical rash (minor)', value: bool(values.typicalRash) ? 'Yes' : 'No' },
          { label: 'Leukocytosis ≥10k (minor)', value: bool(values.leukocytosis) ? 'Yes' : 'No' },
        ],
      );
    },
    evidence: {
      summary:
        'Fautrel criteria: 6 major (spiking fever ≥39°C, arthralgia, transient erythema, pharyngitis, PMN ≥80%, glycosylated ferritin ≤20%) and 2 minor (typical rash, WBC ≥10×10⁹/L). Classify if ≥4 major or 3 major + 2 minor.',
      formula: 'Score = major count; classify if majors ≥4 OR (majors ≥3 AND minors ≥2)',
      validation: 'Fautrel et al. Medicine (Baltimore) 2002; later independent validation sensitivity ~87%, specificity ~98%.',
      references: [
        {
          title: 'Proposal for a new set of classification criteria for adult-onset still disease',
          citation: 'Fautrel B et al. Medicine (Baltimore). 2002',
          year: 2002,
          pmid: '11997716',
          doi: '10.1097/00005792-200205000-00003',
        },
      ],
    },
    nextSteps: classSteps('AOSD'),
    pearls: classPearls([
      'Glycosylated ferritin ≤20% is the distinctive Fautrel item and is not in Yamaguchi.',
      'Score displayed is the major-criteria count; minor count is listed in details because it can change classification at 3 majors.',
    ]),
  },

  // ─── 16. 2017 EULAR/ACR IIM ──────────────────────────────────────────────
  {
    id: 'eular-acr-myositis-2017',
    name: '2017 EULAR/ACR Idiopathic Inflammatory Myopathy Classification',
    shortName: 'EULAR/ACR IIM',
    description:
      '2017 EULAR/ACR IIM probability-score classification using published item weights. Probable IIM if ≥5.5 without biopsy or ≥6.7 with biopsy. Skin uses the highest cutaneous lesion (simplified).',
    category: 'rheumatology',
    tags: ['myositis', 'iim', 'dermatomyositis', 'jo1', 'classification'],
    whenToUse: 'Suspected idiopathic inflammatory myopathy when classifying for research (no better alternative explanation).',
    whyUse: 'Data-driven weighted score with and without muscle biopsy; 55% probability cut-off is recommended minimum.',
    inputs: [
      selectInput('path', 'Scoring path', IIM_PATH, undefined, 'Without-biopsy path: probable IIM if ≥5.5 (definite ≥7.5). With-biopsy path: probable ≥6.7 (definite ≥8.7). Biopsy items score only on the with-biopsy path. Weights differ slightly between paths.'),
      selectInput('ageOnset', 'Age of onset of first related symptom', IIM_AGE, undefined, 'Age at first related symptom (weakness, rash, or other IIM feature) — not current age.'),
      yesNo('proxUE', 'Objective symmetric proximal upper-extremity weakness', null,
        'Objective weakness of proximal UE muscles (shoulder girdle / arm) that is symmetric — not pain-limited effort.'),
      yesNo('proxLE', 'Objective symmetric proximal lower-extremity weakness', null,
        'Objective weakness of proximal LE muscles (hip girdle / thigh) that is symmetric.'),
      yesNo('neckFlex', 'Neck flexors relatively weaker than neck extensors', null,
        'On exam, neck flexion is weaker than neck extension (MRC or equivalent).'),
      yesNo('proxGtDist', 'In the legs, proximal muscles relatively weaker than distal', null,
        'Hip/thigh weakness greater than ankle/foot weakness on exam.'),
      selectInput('skin', 'Highest skin manifestation', IIM_SKIN, 'none', 'Published weights are additive across lesions; this tool uses the single highest lesion. Gottron papules = papules over knuckle extensors; Gottron sign = macular erythema over knuckles/elbows/knees; heliotrope = violaceous periorbital rash ± edema.'),
      yesNo('dysphagia', 'Dysphagia or esophageal dysmotility', null,
        'Swallowing difficulty or documented esophageal dysmotility attributed to myositis.'),
      yesNo('jo1', 'Anti-Jo-1 (anti-histidyl-tRNA synthetase) positive', null,
        'Anti-Jo-1 above the laboratory positive cut.'),
      yesNo('enzymes', 'Elevated CK, LDH, AST, or ALT', null, 'CK, LDH, AST, or ALT above ULN, not explained by liver disease alone.'),
      yesNo('bxEndomysial', 'Biopsy: endomysial infiltrate surrounding but not invading myofibres', null,
        'Endomysial inflammatory infiltrate surrounding, but not invading, myofibres (score only on the with-biopsy path).'),
      yesNo('bxPerimysial', 'Biopsy: perimysial and/or perivascular infiltrate', null,
        'Perimysial and/or perivascular inflammatory infiltrate (score only on the with-biopsy path).'),
      yesNo('bxPerifascicular', 'Biopsy: perifascicular atrophy', null,
        'Perifascicular atrophy on muscle biopsy (score only on the with-biopsy path).'),
      yesNo('bxRimmed', 'Biopsy: rimmed vacuoles', null,
        'Rimmed vacuoles on muscle biopsy (IBM-type; score only on the with-biopsy path).'),
    ],
    calculate(values) {
      const withBx = str(values.path) === 'with';
      const age = str(values.ageOnset, 'lt18');
      const skin = str(values.skin, 'none');
      let score = 0;
      if (age === '18-39') score += withBx ? 1.5 : 1.3;
      else if (age === 'ge40') score += withBx ? 2.2 : 2.1;
      if (bool(values.proxUE)) score += 0.7;
      if (bool(values.proxLE)) score += withBx ? 0.5 : 0.8;
      if (bool(values.neckFlex)) score += withBx ? 1.6 : 1.9;
      if (bool(values.proxGtDist)) score += withBx ? 1.2 : 0.9;
      if (skin === 'heliotrope') score += withBx ? 3.2 : 3.1;
      else if (skin === 'gottron-papules') score += withBx ? 2.7 : 2.1;
      else if (skin === 'gottron-sign') score += withBx ? 3.7 : 3.3;
      if (bool(values.dysphagia)) score += withBx ? 0.6 : 0.7;
      if (bool(values.jo1)) score += withBx ? 3.8 : 3.9;
      if (bool(values.enzymes)) score += withBx ? 1.4 : 1.3;
      if (withBx) {
        if (bool(values.bxEndomysial)) score += 1.7;
        if (bool(values.bxPerimysial)) score += 1.2;
        if (bool(values.bxPerifascicular)) score += 1.9;
        if (bool(values.bxRimmed)) score += 3.1;
      }
      const total = round(score, 1);
      const threshold = withBx ? 6.7 : 5.5;
      const classified = total >= threshold;
      return classResult(
        total,
        classified,
        'IIM',
        classified
          ? `Weighted score ${total} meets probable-IIM threshold ${threshold} (${withBx ? 'with' : 'without'} biopsy).`
          : `Weighted score ${total} is below probable-IIM threshold ${threshold} (${withBx ? 'with' : 'without'} biopsy). Definite IIM is ≥7.5 without biopsy or ≥8.7 with biopsy.`,
        [
          { label: 'Path', value: lab(IIM_PATH, values.path) },
          { label: 'Threshold', value: String(threshold) },
          { label: 'Age of onset', value: lab(IIM_AGE, values.ageOnset) },
          { label: 'Proximal UE weakness', value: bool(values.proxUE) ? 'Yes' : 'No' },
          { label: 'Proximal LE weakness', value: bool(values.proxLE) ? 'Yes' : 'No' },
          { label: 'Neck flexors weaker than extensors', value: bool(values.neckFlex) ? 'Yes' : 'No' },
          { label: 'Proximal > distal leg weakness', value: bool(values.proxGtDist) ? 'Yes' : 'No' },
          { label: 'Skin (highest)', value: lab(IIM_SKIN, values.skin) },
          { label: 'Dysphagia', value: bool(values.dysphagia) ? 'Yes' : 'No' },
          { label: 'Anti-Jo-1', value: bool(values.jo1) ? 'Yes' : 'No' },
          { label: 'Elevated muscle enzymes', value: bool(values.enzymes) ? 'Yes' : 'No' },
          { label: 'Biopsy endomysial infiltrate', value: bool(values.bxEndomysial) ? (withBx ? 'Yes (scored)' : 'Yes (not scored — without-biopsy path)') : 'No' },
          { label: 'Biopsy perimysial/perivascular', value: bool(values.bxPerimysial) ? (withBx ? 'Yes (scored)' : 'Yes (not scored — without-biopsy path)') : 'No' },
          { label: 'Biopsy perifascicular atrophy', value: bool(values.bxPerifascicular) ? (withBx ? 'Yes (scored)' : 'Yes (not scored — without-biopsy path)') : 'No' },
          { label: 'Biopsy rimmed vacuoles', value: bool(values.bxRimmed) ? (withBx ? 'Yes (scored)' : 'Yes (not scored — without-biopsy path)') : 'No' },
        ],
      );
    },
    evidence: {
      summary:
        '2017 EULAR/ACR IIM: weighted items for age, weakness pattern, skin, dysphagia, anti-Jo-1, muscle enzymes, and (if performed) biopsy features. Probable IIM (recommended minimum) is score ≥5.5 without biopsy or ≥6.7 with biopsy; definite IIM is ≥7.5 / ≥8.7. This tool scores the highest skin lesion rather than adding overlapping rashes.',
      formula: 'Sum of Lundberg 2017 Table 2 weights (path-specific); classify if ≥5.5 (no biopsy) or ≥6.7 (biopsy)',
      validation: 'Lundberg et al. 2017; probable-IIM cut-off sensitivity/specificity 87%/82% without biopsy and 93%/88% with biopsy.',
      references: [
        {
          title: '2017 EULAR/ACR classification criteria for adult and juvenile idiopathic inflammatory myopathies and their major subgroups',
          citation: 'Lundberg IE et al. Ann Rheum Dis. 2017',
          year: 2017,
          pmid: '29079590',
          doi: '10.1136/annrheumdis-2017-211468',
        },
      ],
    },
    nextSteps: classSteps('IIM'),
    pearls: classPearls([
      'Without characteristic DM skin findings a muscle biopsy is recommended before classification.',
      'Item weights differ slightly with vs without biopsy — select the matching path.',
    ]),
  },

  // ─── 17. 2023 ACR/EULAR APS ──────────────────────────────────────────────
  {
    id: 'acr-eular-aps-2023',
    name: '2023 ACR/EULAR Antiphospholipid Syndrome Classification',
    shortName: 'ACR/EULAR APS',
    description:
      '2023 ACR/EULAR APS classification. Classify if ≥3 clinical points AND ≥3 laboratory points. Lab isotypes are additive in this simplified bedside helper (published solid-phase domain uses the single highest cluster).',
    category: 'rheumatology',
    tags: ['aps', 'antiphospholipid', 'lupus anticoagulant', 'classification'],
    whenToUse: 'aPL-associated clinical events when classifying APS for research.',
    whyUse: 'Much higher specificity than Sydney/Sapporo criteria in the 2023 validation cohort.',
    inputs: [
      selectInput('vte', 'Macrovascular VTE (highest)', APS_VTE, undefined, 'High-risk VTE profile = major transient factor (surgery with GA >30 min, hospital bedbound ≥3 days, cesarean, major trauma/fracture). Optional entry: ≥1 clinical and ≥1 lab criterion within 3 years of each other.'),
      selectInput('arterial', 'Macrovascular arterial thrombosis (highest)', APS_ART, undefined, 'High-risk CVD profile: current smoking, treated HTN, DM, LDL ≥160 mg/dL or on lipid-lowering therapy.'),
      selectInput('microvascular', 'Microvascular domain (highest)', APS_MICRO, undefined, 'Suspected = livedo/livedo racemosa, aPL nephropathy, alveolar hemorrhage without histopathology; established = biopsy- or unequivocal imaging-proven.'),
      selectInput('obstetric', 'Obstetric domain (highest)', APS_OB, undefined, 'Highest obstetric item only. Pre-10-week losses = ≥3 consecutive unexplained. Fetal death bands are 10–16 weeks vs ≥16 weeks. Severe pre-eclampsia is ACOG severe features requiring delivery <34 weeks.'),
      selectInput('valve', 'Cardiac valve domain (highest)', APS_VALVE, undefined, 'Highest valve item only. Thickening vs vegetation on echo; vegetation should not be explained by infection.'),
      yesNo('thrombocytopenia', 'Thrombocytopenia (20–130×10⁹/L)', 2,
        'Platelets 20–130 × 10⁹/L attributed to APS (not TTP, HIT, DIC, or drug-induced). Confirmed on two occasions is preferred.'),
      selectInput('lac', 'Lupus anticoagulant', APS_LAC, undefined, 'Persistent LAC = positive on two occasions ≥12 weeks apart.'),
      selectInput('aclIgg', 'IgG anticardiolipin', APS_ACL_IGG, undefined, 'Moderate ELISA ~40–79 U; high ≥80 U (or lab 99th percentile).'),
      selectInput('aclIgm', 'IgM anticardiolipin', APS_ACL_IGM),
      selectInput('b2Igg', 'IgG anti-β2-glycoprotein I', APS_B2_IGG, undefined, 'Moderate ELISA ~40–79 U; high ≥80 U (or lab 99th percentile).'),
      selectInput('b2Igm', 'IgM anti-β2-glycoprotein I', APS_B2_IGM),
    ],
    calculate(values) {
      const vte = pts(APS_VTE, values.vte);
      const art = pts(APS_ART, values.arterial);
      const micro = pts(APS_MICRO, values.microvascular);
      const ob = pts(APS_OB, values.obstetric);
      const valve = pts(APS_VALVE, values.valve);
      const plt = bool(values.thrombocytopenia) ? 2 : 0;
      const clinical = vte + art + micro + ob + valve + plt;
      const lac = pts(APS_LAC, values.lac);
      const aclG = pts(APS_ACL_IGG, values.aclIgg);
      const aclM = pts(APS_ACL_IGM, values.aclIgm);
      const b2g = pts(APS_B2_IGG, values.b2Igg);
      const b2m = pts(APS_B2_IGM, values.b2Igm);
      const labScore = lac + aclG + aclM + b2g + b2m;
      const score = clinical + labScore;
      const classified = clinical >= 3 && labScore >= 3;
      return classResult(
        score,
        classified,
        'APS',
        classified
          ? `Clinical ${clinical} (≥3) + laboratory ${labScore} (≥3); combined ${score}.`
          : `Clinical ${clinical} (need ≥3) + laboratory ${labScore} (need ≥3); combined ${score}.`,
        [
          { label: 'Clinical points', value: String(clinical) },
          { label: 'Laboratory points', value: String(labScore) },
          { label: 'VTE', value: `${lab(APS_VTE, values.vte)} (${vte})` },
          { label: 'Arterial thrombosis', value: `${lab(APS_ART, values.arterial)} (${art})` },
          { label: 'Microvascular', value: `${lab(APS_MICRO, values.microvascular)} (${micro})` },
          { label: 'Obstetric', value: `${lab(APS_OB, values.obstetric)} (${ob})` },
          { label: 'Cardiac valve', value: `${lab(APS_VALVE, values.valve)} (${valve})` },
          { label: 'Thrombocytopenia', value: bool(values.thrombocytopenia) ? 'Yes (2)' : 'No' },
          { label: 'Lupus anticoagulant', value: `${lab(APS_LAC, values.lac)} (${lac})` },
          { label: 'IgG aCL', value: `${lab(APS_ACL_IGG, values.aclIgg)} (${aclG})` },
          { label: 'IgM aCL', value: `${lab(APS_ACL_IGM, values.aclIgm)} (${aclM})` },
          { label: 'IgG anti-β2GPI', value: `${lab(APS_B2_IGG, values.b2Igg)} (${b2g})` },
          { label: 'IgM anti-β2GPI', value: `${lab(APS_B2_IGM, values.b2Igm)} (${b2m})` },
        ],
      );
    },
    evidence: {
      summary:
        '2023 ACR/EULAR APS: entry of ≥1 clinical and ≥1 lab criterion within 3 years, then additive weighted domains. Classify if ≥3 clinical AND ≥3 laboratory points. This helper adds solid-phase isotypes (published criteria take the single highest solid-phase cluster, so combined IgG aCL + IgG β2GPI may be over-counted here). Moderate ELISA 40–79 units; high ≥80 units.',
      formula: 'Clinical sum (highest per clinical domain) + laboratory sum; classify if clinical ≥3 AND lab ≥3',
      validation: 'Barbhaiya et al. 2023; validation specificity 99% vs 86% for Sydney criteria, sensitivity 84% vs 99%.',
      references: [
        {
          title: 'The 2023 ACR/EULAR antiphospholipid syndrome classification criteria',
          citation: 'Barbhaiya M et al. Arthritis Rheumatol. 2023',
          year: 2023,
          pmid: '37635643',
          doi: '10.1002/art.42624',
        },
      ],
    },
    nextSteps: classSteps('APS'),
    pearls: classPearls([
      'Only the highest item within each clinical domain counts.',
      'Persistent LAC (5 points) already meets the laboratory threshold by itself.',
    ]),
  },

  // ─── 18. Sydney APS ──────────────────────────────────────────────────────
  {
    id: 'sapporo-sydney-aps',
    name: 'Sydney (2006) APS Classification',
    shortName: 'Sydney APS',
    description:
      'Revised Sapporo (Sydney 2006) APS classification: ≥1 clinical (thrombosis or obstetric morbidity) AND ≥1 laboratory criterion (LA, medium/high aCL, or anti-β2GPI) persistent ≥12 weeks.',
    category: 'rheumatology',
    tags: ['aps', 'sapporo', 'sydney', 'antiphospholipid', 'classification'],
    whenToUse: 'When applying the 2006 revised Sapporo APS criteria (still widely used in practice and older trials).',
    whyUse: 'Standard APS classification from 2006 until the 2023 ACR/EULAR criteria.',
    inputs: [
      yesNo('thrombosis', 'Clinical: vascular thrombosis', null, 'Objectively confirmed arterial, venous, or small-vessel thrombosis; exclude superficial venous thrombosis.'),
      yesNo('obstetric', 'Clinical: obstetric morbidity (Sydney definitions)', null, '≥1 unexplained death of a morphologically normal fetus ≥10 weeks; or ≥1 premature birth <34 weeks due to eclampsia/severe pre-eclampsia or placental insufficiency; or ≥3 consecutive unexplained embryonic losses <10 weeks (anatomic/hormonal/chromosomal causes excluded).'),
      yesNo('lac', 'Laboratory: lupus anticoagulant', null,
        'LAC positive by ISTH dilute-RVVT / aPTT-based testing with mixing and confirmation.'),
      yesNo('acl', 'Laboratory: aCL IgG or IgM at medium or high titer', null, 'IgG or IgM >40 GPL/MPL or >99th percentile.'),
      yesNo('b2gpi', 'Laboratory: anti-β2GPI IgG or IgM', null, 'IgG or IgM >99th percentile.'),
      yesNo('persistent', 'Laboratory positivity persistent ≥12 weeks', null,
        'The same laboratory criterion positive on two occasions at least 12 weeks apart. A single positive does not fulfil Sydney lab criteria.'),
    ],
    calculate(values) {
      const thrombosis = bool(values.thrombosis);
      const obstetric = bool(values.obstetric);
      const lac = bool(values.lac);
      const acl = bool(values.acl);
      const b2 = bool(values.b2gpi);
      const persistent = bool(values.persistent);
      const clinical = (thrombosis ? 1 : 0) + (obstetric ? 1 : 0);
      const labN = (lac ? 1 : 0) + (acl ? 1 : 0) + (b2 ? 1 : 0);
      const classified = clinical >= 1 && labN >= 1 && persistent;
      const clinList: string[] = [];
      if (thrombosis) clinList.push('thrombosis');
      if (obstetric) clinList.push('obstetric morbidity');
      const labList: string[] = [];
      if (lac) labList.push('LAC');
      if (acl) labList.push('aCL');
      if (b2) labList.push('anti-β2GPI');
      return classResult(
        classified ? 'APS classified' : 'Not classified',
        classified,
        'APS (Sydney)',
        classified
          ? `≥1 clinical (${clinList.join(', ')}) and ≥1 laboratory (${labList.join(', ')}) persistent ≥12 weeks.`
          : `Requires ≥1 clinical AND ≥1 laboratory criterion persistent ≥12 weeks. Clinical: ${clinList.join(', ') || 'none'}. Lab: ${labList.join(', ') || 'none'}. Persistent: ${persistent ? 'yes' : 'no'}.`,
        [
          { label: 'Vascular thrombosis', value: thrombosis ? 'Yes' : 'No' },
          { label: 'Obstetric morbidity', value: obstetric ? 'Yes' : 'No' },
          { label: 'Lupus anticoagulant', value: lac ? 'Yes' : 'No' },
          { label: 'Medium/high aCL', value: acl ? 'Yes' : 'No' },
          { label: 'Anti-β2GPI', value: b2 ? 'Yes' : 'No' },
          { label: 'Persistent ≥12 weeks', value: persistent ? 'Yes' : 'No' },
          { label: 'Clinical criteria', value: clinList.join(', ') || 'none' },
          { label: 'Laboratory criteria', value: labList.join(', ') || 'none' },
        ],
      );
    },
    evidence: {
      summary:
        'Sydney 2006 revision of Sapporo APS criteria: ≥1 clinical (thrombosis or obstetric) plus ≥1 lab (LA, aCL IgG/M medium-high, or anti-β2GPI) on two occasions ≥12 weeks apart.',
      formula: 'Classify if (≥1 clinical) AND (≥1 laboratory) AND persistence ≥12 weeks',
      validation: 'Miyakis et al. 2006 international consensus; superseded for research by 2023 ACR/EULAR APS criteria.',
      references: [
        {
          title: 'International consensus statement on an update of the classification criteria for definite antiphospholipid syndrome (Sydney revision)',
          citation: 'Miyakis S et al. J Thromb Haemost. 2006',
          year: 2006,
          pmid: '16420554',
          doi: '10.1111/j.1538-7836.2006.01753.x',
        },
      ],
    },
    nextSteps: classSteps('APS'),
    pearls: classPearls([
      'A single positive aPL test does not fulfil Sydney laboratory criteria — persistence ≥12 weeks is required.',
      '2023 ACR/EULAR APS criteria are substantially more specific and should be preferred for new research.',
    ]),
  },

  // ─── 19. ICBD Behçet ─────────────────────────────────────────────────────
  {
    id: 'icbd-behcet',
    name: 'ICBD 2013 Behçet Disease Classification',
    shortName: 'ICBD Behçet',
    description:
      'International Criteria for Behçet’s Disease (2013). Ocular 2, oral 2, genital 2, skin 1, neurologic 1, vascular 1, pathergy 1. Threshold ≥4.',
    category: 'rheumatology',
    tags: ['behcet', 'icbd', 'pathergy', 'classification'],
    whenToUse: 'Suspected Behçet disease when classifying with ICBD (more sensitive than ISG).',
    whyUse: 'ICBD 2014/2013 improved sensitivity versus 1990 ISG criteria, especially outside the Silk Road.',
    inputs: [
      yesNo('ocular', 'Ocular lesions', 2, 'Anterior/posterior uveitis or retinal vasculitis (cells in vitreous count).'),
      yesNo('oral', 'Oral aphthosis', 2, 'Recurrent oral aphthous ulcers (minor, major, or herpetiform), observed or reliable history — not a single sore.'),
      yesNo('genital', 'Genital aphthosis', 2, 'Recurrent genital aphthous ulcers (minor, major, or herpetiform), observed or reliable history.'),
      yesNo('skin', 'Skin lesions', 1, 'Erythema nodosum, papulopustular, or acneiform lesions observed by a physician.'),
      yesNo('neuro', 'Neurologic manifestations', 1, 'Parenchymal (meningoencephalitis) or vascular CNS Behçet — not isolated headache.'),
      yesNo('vascular', 'Vascular manifestations', 1, 'Venous or arterial thrombosis or aneurysm (including pulmonary artery).'),
      yesNo('pathergy', 'Positive pathergy test', 1, '20–22 G needle, oblique intradermal forearm; read at 24–48 h; positive = papule ≥2 mm.'),
    ],
    calculate(values) {
      const ocular = bool(values.ocular) ? 2 : 0;
      const oral = bool(values.oral) ? 2 : 0;
      const genital = bool(values.genital) ? 2 : 0;
      const skin = bool(values.skin) ? 1 : 0;
      const neuro = bool(values.neuro) ? 1 : 0;
      const vascular = bool(values.vascular) ? 1 : 0;
      const pathergy = bool(values.pathergy) ? 1 : 0;
      const score = ocular + oral + genital + skin + neuro + vascular + pathergy;
      const classified = score >= 4;
      return classResult(
        score,
        classified,
        'Behçet (ICBD)',
        classified ? `Score ${score} (≥4).` : `Score ${score} (<4).`,
        [
          { label: 'Ocular lesions', value: bool(values.ocular) ? 'Yes (2)' : 'No' },
          { label: 'Oral aphthosis', value: bool(values.oral) ? 'Yes (2)' : 'No' },
          { label: 'Genital aphthosis', value: bool(values.genital) ? 'Yes (2)' : 'No' },
          { label: 'Skin lesions', value: bool(values.skin) ? 'Yes (1)' : 'No' },
          { label: 'Neurologic manifestations', value: bool(values.neuro) ? 'Yes (1)' : 'No' },
          { label: 'Vascular manifestations', value: bool(values.vascular) ? 'Yes (1)' : 'No' },
          { label: 'Pathergy', value: bool(values.pathergy) ? 'Yes (1)' : 'No' },
        ],
      );
    },
    evidence: {
      summary:
        'ICBD: ocular 2, oral aphthosis 2, genital aphthosis 2, skin 1, neurologic 1, vascular 1, pathergy 1. Classify if ≥4. Oral + genital ulceration already meets threshold.',
      formula: '2×ocular + 2×oral + 2×genital + skin + neuro + vascular + pathergy; classify if ≥4',
      validation: 'International Team for the Revision of the International Criteria for BD, 2014; sensitivity 96%, specificity 88% in the original study versus ISG 81%/96%.',
      references: [
        {
          title: 'The International Criteria for Behçet’s Disease (ICBD): a collaborative study of 27 countries',
          citation: 'International Team for the Revision of the International Criteria for Behçet’s Disease. J Eur Acad Dermatol Venereol. 2014',
          year: 2014,
          pmid: '23441863',
          doi: '10.1111/jdv.12107',
        },
      ],
    },
    nextSteps: classSteps('Behçet disease'),
    pearls: classPearls([
      'Oral + genital aphthosis scores 4 and classifies without pathergy or eye disease.',
      'Pathergy is optional in ICBD (it is one of the ISG “plus 2” items).',
    ]),
  },

  // ─── 20. ISG Behçet ──────────────────────────────────────────────────────
  {
    id: 'isg-behcet',
    name: 'ISG 1990 Behçet Disease Classification',
    shortName: 'ISG Behçet',
    description:
      '1990 International Study Group Behçet criteria: recurrent oral ulceration plus ≥2 of recurrent genital ulceration, eye lesions, skin lesions, or positive pathergy.',
    category: 'rheumatology',
    tags: ['behcet', 'isg', 'pathergy', 'classification'],
    whenToUse: 'When applying classic 1990 ISG Behçet criteria (still cited; less sensitive than ICBD).',
    whyUse: 'Original internationally agreed diagnostic/classification set; high specificity.',
    inputs: [
      yesNo('oral', 'Recurrent oral ulceration (required)', null, 'Minor/major/herpetiform aphthae at least 3 times in 12 months (mandatory).'),
      yesNo('genital', 'Recurrent genital ulceration', null, 'Aphthous ulceration or scarring, documented by physician or patient.'),
      yesNo('eye', 'Eye lesions (uveitis or retinal vasculitis)', null,
        'Anterior or posterior uveitis, or retinal vasculitis, documented by an ophthalmologist (cells in the vitreous count).'),
      yesNo('skin', 'Skin lesions (erythema nodosum, pseudofolliculitis, or acneiform nodules)', null,
        'Erythema nodosum, pseudofolliculitis, papulopustular, or acneiform lesions observed by a physician (not steroid-induced acne alone).'),
      yesNo('pathergy', 'Positive pathergy test', null, '20–22 G needle, oblique intradermal forearm; read at 24–48 h; positive = papule ≥2 mm.'),
    ],
    calculate(values) {
      const oral = bool(values.oral);
      const genital = bool(values.genital);
      const eye = bool(values.eye);
      const skin = bool(values.skin);
      const pathergy = bool(values.pathergy);
      const extras = (genital ? 1 : 0) + (eye ? 1 : 0) + (skin ? 1 : 0) + (pathergy ? 1 : 0);
      const classified = oral && extras >= 2;
      const extraList: string[] = [];
      if (genital) extraList.push('genital');
      if (eye) extraList.push('eye');
      if (skin) extraList.push('skin');
      if (pathergy) extraList.push('pathergy');
      return classResult(
        classified ? 'Behçet classified' : 'Not classified',
        classified,
        'Behçet (ISG)',
        classified
          ? `Recurrent oral ulceration plus ${extras} additional ISG items (${extraList.join(', ')}).`
          : `Requires recurrent oral ulceration plus ≥2 of genital / eye / skin / pathergy. Oral ${oral ? 'yes' : 'no'}; additional items: ${extraList.join(', ') || 'none'}.`,
        [
          { label: 'Recurrent oral ulceration', value: oral ? 'Yes' : 'No' },
          { label: 'Recurrent genital ulceration', value: genital ? 'Yes' : 'No' },
          { label: 'Eye lesions', value: eye ? 'Yes' : 'No' },
          { label: 'Skin lesions', value: skin ? 'Yes' : 'No' },
          { label: 'Pathergy', value: pathergy ? 'Yes' : 'No' },
          { label: 'Additional items (need ≥2)', value: `${extras}: ${extraList.join(', ') || 'none'}` },
        ],
      );
    },
    evidence: {
      summary:
        'ISG 1990: recurrent oral ulceration (at least 3 times in 12 months) plus two of: recurrent genital ulceration, eye lesions, skin lesions, positive pathergy. More specific but less sensitive than ICBD.',
      formula: 'Classify if oral ulceration AND ≥2 of (genital, eye, skin, pathergy)',
      validation: 'International Study Group for Behçet’s Disease, Lancet 1990; improved discrimination versus earlier competing sets.',
      references: [
        {
          title: 'Criteria for diagnosis of Behçet’s disease',
          citation: 'International Study Group for Behçet’s Disease. Lancet. 1990;335:1078–80',
          year: 1990,
          pmid: '1970380',
          doi: '10.1016/0140-6736(90)92643-V',
        },
      ],
    },
    nextSteps: classSteps('Behçet disease'),
    pearls: classPearls([
      'Oral ulceration is mandatory in ISG; ICBD can classify without oral ulcers if other items reach 4.',
      'Pathergy positivity varies by geography and technique.',
    ]),
  },
];
