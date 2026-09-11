import type { Calculator, CalcResult } from '../../types/calculator';
import { num, bool, str, round, yesNo, selectInput, numberInput, riskFromThresholds } from '../../utils/helpers';

/** Weighted ESSDAI domain: option points = activity level × published weight. */
function essdaiDomain(
  id: string,
  label: string,
  weight: number,
  maxLevel: 2 | 3,
  helpText: string = 'Score current Sjögren activity, not damage or infection.',
  descriptions?: string[],
) {
  const names = ['No activity', 'Low', 'Moderate', 'High'];
  const options = [];
  for (let level = 0; level <= maxLevel; level++) {
    const description = descriptions?.[level];
    options.push({
      label: `${names[level]} (level ${level} × wt ${weight} = ${weight * level})`,
      value: level,
      points: weight * level,
      ...(description ? { description } : {}),
    });
  }
  return selectInput(id, label, options, 0, helpText);
}

function rodnanSite(id: string, label: string) {
  return selectInput(
    id,
    label,
    [
      { label: '0 — Uninvolved', value: 0, points: 0 },
      { label: '1 — Mild thickening', value: 1, points: 1 },
      { label: '2 — Moderate thickening', value: 2, points: 2 },
      { label: '3 — Severe (hidebound)', value: 3, points: 3 },
    ],
    0,
  );
}

function bilagGrade(id: string, label: string) {
  return selectInput(id, label, [
    { label: 'E — Never involved', value: 'E' },
    { label: 'D — Inactive (prior involvement)', value: 'D' },
    { label: 'C — Mild activity', value: 'C' },
    { label: 'B — Moderate activity', value: 'B' },
    { label: 'A — Severe / very active', value: 'A' },
  ], 'E');
}

const MRSS_SITES: { id: string; label: string }[] = [
  { id: 'face', label: 'Face' },
  { id: 'chest', label: 'Anterior chest' },
  { id: 'abdomen', label: 'Abdomen' },
  { id: 'rFingers', label: 'Right fingers' },
  { id: 'lFingers', label: 'Left fingers' },
  { id: 'rHands', label: 'Right hands (dorsum)' },
  { id: 'lHands', label: 'Left hands (dorsum)' },
  { id: 'rForearms', label: 'Right forearms' },
  { id: 'lForearms', label: 'Left forearms' },
  { id: 'rUpperArms', label: 'Right upper arms' },
  { id: 'lUpperArms', label: 'Left upper arms' },
  { id: 'rThighs', label: 'Right thighs' },
  { id: 'lThighs', label: 'Left thighs' },
  { id: 'rLegs', label: 'Right legs' },
  { id: 'lLegs', label: 'Left legs' },
  { id: 'rFeet', label: 'Right feet' },
  { id: 'lFeet', label: 'Left feet' },
];

const ESSDAI_DOMAINS: {
  id: string;
  label: string;
  weight: number;
  maxLevel: 2 | 3;
  helpText: string;
  descriptions: string[];
}[] = [
  {
    id: 'constitutional',
    label: 'Constitutional',
    weight: 3,
    maxLevel: 2,
    helpText: 'Score current Sjögren activity, not damage or infection. Exclude infectious fever and voluntary weight loss.',
    descriptions: [
      'No fever, night sweats, or involuntary weight loss from Sjögren activity.',
      'Fever 37.5–38.5 °C and/or night sweats and/or involuntary 5–10% weight loss.',
      'Fever >38.5 °C or involuntary weight loss >10%.',
    ],
  },
  {
    id: 'lymphadenopathy',
    label: 'Lymphadenopathy / lymphoma',
    weight: 4,
    maxLevel: 3,
    helpText: 'Score current Sjögren activity, not damage or infection. Exclude infectious lymphadenopathy.',
    descriptions: [
      'No enlarged nodes or splenomegaly; no current B-cell malignancy.',
      'Nodes ≥1 cm (any region) or ≥2 cm inguinal.',
      'Nodes ≥2 cm (any region) or ≥3 cm inguinal, and/or splenomegaly (palpable or imaging).',
      'Current malignant B-cell proliferative disorder.',
    ],
  },
  {
    id: 'glandular',
    label: 'Glandular',
    weight: 2,
    maxLevel: 2,
    helpText: 'Score current Sjögren activity, not damage or infection. Exclude stone or infection.',
    descriptions: [
      'No glandular swelling.',
      'Parotid ≤3 cm, or limited submandibular or lacrimal swelling.',
      'Parotid >3 cm, or major submandibular or lacrimal swelling.',
    ],
  },
  {
    id: 'articular',
    label: 'Articular',
    weight: 2,
    maxLevel: 3,
    helpText: 'Score current Sjögren activity, not damage or infection. 28-joint synovitis count; exclude osteoarthritis.',
    descriptions: [
      'No currently active articular involvement.',
      'Arthralgia of hands/wrists/ankles/feet plus morning stiffness >30 min (no synovitis).',
      '1–5 of 28 joints with synovitis.',
      '≥6 of 28 joints with synovitis.',
    ],
  },
  {
    id: 'cutaneous',
    label: 'Cutaneous',
    weight: 3,
    maxLevel: 3,
    helpText: 'Score current Sjögren activity, not damage or infection. Stable long-lasting cutaneous damage scores 0.',
    descriptions: [
      'No currently active cutaneous involvement.',
      'Erythema multiforme (EM).',
      'Limited vasculitis or purpura of feet–ankles, or subacute cutaneous lupus (SCLE).',
      'Diffuse vasculitis or purpura, or ulcers related to vasculitis.',
    ],
  },
  {
    id: 'pulmonary',
    label: 'Pulmonary',
    weight: 5,
    maxLevel: 3,
    helpText: 'Score current Sjögren activity, not damage or infection. Tobacco-related or long-stable ILD scores 0.',
    descriptions: [
      'No currently active pulmonary involvement.',
      'Persistent cough or ILD without dyspnoea and with normal PFT.',
      'NYHA II, or DLCO 40–69%, or FVC 60–79%.',
      'NYHA III–IV, or DLCO <40%, or FVC <60%.',
    ],
  },
  {
    id: 'renal',
    label: 'Renal',
    weight: 5,
    maxLevel: 3,
    helpText: 'Score current Sjögren activity, not damage or infection. If biopsied, rate histology first; long-stable proteinuria scores 0.',
    descriptions: [
      'Proteinuria <0.5 g/day, no haematuria/leucocyturia/acidosis; or long-stable damage proteinuria.',
      'Proteinuria 0.5–1 g/day without haematuria or renal failure (GFR ≥60), or RTA without renal failure.',
      'Proteinuria 1–1.5 g/day (GFR ≥60, no haematuria), or RTA with renal failure (GFR <60), or membranous GN / heavy interstitial infiltrate.',
      'Proteinuria >1.5 g/day, haematuria, or GFR <60; or proliferative GN, cryoglobulinaemic GN, or TMA.',
    ],
  },
  {
    id: 'muscular',
    label: 'Muscular',
    weight: 6,
    maxLevel: 3,
    helpText: 'Score current Sjögren activity, not damage or infection. Exclude corticosteroid myopathy. CK as × laboratory ULN.',
    descriptions: [
      'No currently active myositis.',
      'EMG- or biopsy-proven myositis with normal strength and CK ≤2× ULN.',
      'Weakness MRC 4, or CK >2× to ≤4× ULN (EMG/biopsy-proven).',
      'Weakness MRC ≤3, or CK >4× ULN (EMG/biopsy-proven).',
    ],
  },
  {
    id: 'pns',
    label: 'Peripheral nervous system',
    weight: 5,
    maxLevel: 3,
    helpText: 'Score current Sjögren activity, not damage or infection. Non-evolving neuropathy >12 months or non-Sjögren neuropathy scores 0.',
    descriptions: [
      'No currently active PNS involvement.',
      'Pure sensory axonal neuropathy (NCS), trigeminal neuralgia, or proven small-fibre neuropathy.',
      'Axonal motor neuropathy without deficit (MRC 4), cranial nerve of peripheral origin (except trigeminal), ganglionopathy with mild/moderate ataxia, or mild CIDP.',
      'Motor neuropathy with deficit (MRC ≤3), vasculitic mononeuritis multiplex, severe ataxia from ganglionopathy, or severe CIDP.',
    ],
  },
  {
    id: 'cns',
    label: 'Central nervous system',
    weight: 5,
    maxLevel: 3,
    helpText: 'Score current Sjögren activity, not damage or infection. Official table has no Low (level 1) — leave it unused. Damage or non-Sjögren CNS scores 0.',
    descriptions: [
      'No currently active CNS involvement.',
      'Not used on the official ESSDAI table (no Low / level-1 CNS item). Do not select Low.',
      'Cranial nerve involvement of central origin, optic neuritis, or MS-like syndrome (sensory or cognitive).',
      'Cerebral vasculitis (stroke/TIA), seizure, transverse myelitis, lymphocytic meningitis, or MS-like syndrome with motor deficit.',
    ],
  },
  {
    id: 'haematological',
    label: 'Haematological',
    weight: 2,
    maxLevel: 3,
    helpText: 'Score current Sjögren activity, not damage or infection. Autoimmune cytopenia only; exclude iron/vitamin deficiency and drug-induced counts.',
    descriptions: [
      'No autoimmune cytopenia.',
      'Autoimmune neutropenia 1000–1500/µL and/or Hb 10–12 g/dL and/or platelets 100–150 ×10⁹/L, or lymphocytes 500–1000/µL.',
      'Autoimmune neutropenia 500–1000/µL and/or Hb 8–10 g/dL and/or platelets 50–100 ×10⁹/L, or lymphocytes ≤500/µL.',
      'Autoimmune neutropenia <500/µL and/or Hb <8 g/dL and/or platelets <50 ×10⁹/L.',
    ],
  },
  {
    id: 'biological',
    label: 'Biological',
    weight: 1,
    maxLevel: 2,
    helpText: 'Score current Sjögren activity, not damage or infection. IgG in g/L.',
    descriptions: [
      'No clone, hypocomplement, hypergammaglobulinaemia, cryoglobulin, or recent IgG fall.',
      'Clonal component and/or hypocomplement (low C3, C4, or CH50) and/or IgG 16–20 g/L.',
      'Cryoglobulin and/or IgG >20 g/L and/or recent hypogammaglobulinaemia or recent IgG fall (<5 g/L).',
    ],
  },
];

const BILAG_DOMAINS: { id: string; label: string }[] = [
  { id: 'constitutional', label: 'Constitutional' },
  { id: 'mucocutaneous', label: 'Mucocutaneous' },
  { id: 'neuro', label: 'Neuropsychiatric' },
  { id: 'msk', label: 'Musculoskeletal' },
  { id: 'cardiorespiratory', label: 'Cardiorespiratory' },
  { id: 'gi', label: 'Gastrointestinal' },
  { id: 'ophthalmic', label: 'Ophthalmic' },
  { id: 'renal', label: 'Renal' },
  { id: 'hematologic', label: 'Haematologic' },
];

const SPARCC_SITES: { id: string; label: string }[] = [
  { id: 'gtL', label: 'Greater trochanter, left' },
  { id: 'gtR', label: 'Greater trochanter, right' },
  { id: 'quadL', label: 'Quadriceps insertion (patella), left' },
  { id: 'quadR', label: 'Quadriceps insertion (patella), right' },
  { id: 'infraL', label: 'Infrapatellar / tibial tuberosity, left' },
  { id: 'infraR', label: 'Infrapatellar / tibial tuberosity, right' },
  { id: 'achillesL', label: 'Achilles insertion, left' },
  { id: 'achillesR', label: 'Achilles insertion, right' },
  { id: 'plantarL', label: 'Plantar fascia, left' },
  { id: 'plantarR', label: 'Plantar fascia, right' },
  { id: 'medEpiL', label: 'Medial epicondyle, left' },
  { id: 'medEpiR', label: 'Medial epicondyle, right' },
  { id: 'latEpiL', label: 'Lateral epicondyle, left' },
  { id: 'latEpiR', label: 'Lateral epicondyle, right' },
  { id: 'sspinL', label: 'Supraspinatus insertion, left' },
  { id: 'sspinR', label: 'Supraspinatus insertion, right' },
];

const BASFI_ITEMS: { id: string; label: string }[] = [
  { id: 'q1', label: 'Q1 Putting on socks without help' },
  { id: 'q2', label: 'Q2 Bending forward to pick up a pen' },
  { id: 'q3', label: 'Q3 Reaching a high shelf' },
  { id: 'q4', label: 'Q4 Getting up from an armless chair' },
  { id: 'q5', label: 'Q5 Getting up off the floor' },
  { id: 'q6', label: 'Q6 Standing unsupported for 10 minutes' },
  { id: 'q7', label: 'Q7 Climbing 12–15 steps without a rail' },
  { id: 'q8', label: 'Q8 Looking over your shoulder' },
  { id: 'q9', label: 'Q9 Doing physically demanding activities' },
  { id: 'q10', label: 'Q10 Doing a full day’s activities (home/work)' },
];

const ILD_SUBTYPE_PTS: Record<string, number> = {
  ipf: 0,
  unclassifiable: 0,
  hp: -1,
  nsip: -2,
  ctd: -2,
};

const ILD_SUBTYPE_LABEL: Record<string, string> = {
  ipf: 'IPF (0)',
  unclassifiable: 'Unclassifiable ILD (0)',
  hp: 'Chronic hypersensitivity pneumonitis (−1)',
  nsip: 'Idiopathic NSIP (−2)',
  ctd: 'CTD-ILD (−2)',
};

function basmi2(value: number, kind: 'tragus' | 'schober' | 'cervical' | 'side' | 'imd'): number {
  if (kind === 'tragus') {
    if (value < 15) return 0;
    if (value <= 30) return 1;
    return 2;
  }
  if (kind === 'schober') {
    if (value > 4) return 0;
    if (value >= 2) return 1;
    return 2;
  }
  if (kind === 'cervical') {
    if (value > 70) return 0;
    if (value >= 20) return 1;
    return 2;
  }
  if (kind === 'side') {
    if (value > 10) return 0;
    if (value >= 5) return 1;
    return 2;
  }
  if (value > 100) return 0;
  if (value >= 70) return 1;
  return 2;
}

function yn(v: unknown): number {
  return bool(v as boolean | string | number | null | undefined) ? 1 : 0;
}

export const wave7RheumActivityCalcs: Calculator[] = [
  // ─── 1. ACR/EULAR Boolean remission ───────────────────────────────────────
  {
    id: 'boolean-remission-ra',
    name: 'ACR/EULAR Boolean Remission (RA)',
    shortName: 'Boolean RA',
    description:
      'ACR/EULAR Boolean remission for rheumatoid arthritis, with the original 2011 PGA ≤1 definition and the 2022 PGA ≤1.5 revision.',
    category: 'rheumatology',
    tags: ['boolean', 'remission', 'ra', 'acr', 'eular', 'treat-to-target'],
    whenToUse:
      'Documenting Boolean remission in RA treat-to-target, trials, or clinic follow-up when TJC28, SJC28, CRP, and patient global are available.',
    whyUse:
      'Stringent four-variable remission used alongside SDAI/CDAI. The 2022 revision relaxes patient global to reduce false-negative “near-remission” driven by non-inflammatory PGA.',
    inputs: [
      selectInput(
        'revision',
        'Boolean definition',
        [
          { label: 'Original 2011 (PGA ≤1.0)', value: 'original' },
          { label: '2022 revision (PGA ≤1.5)', value: '2022' },
        ],
        '2022',
        'Do not treat this switch as additive points — it only changes the PGA cutoff. Official Boolean 2.0 also uses PGA ≤2; this tool implements the 1.5 cutoff specified for the 2022 update pathway.',
      ),
      numberInput('tjc28', 'Tender joint count (28)', { min: 0, max: 28, step: 1, defaultValue: 0 }),
      numberInput('sjc28', 'Swollen joint count (28)', { min: 0, max: 28, step: 1, defaultValue: 0 }),
      numberInput('crp', 'CRP', {
        unit: 'mg/dL',
        min: 0,
        max: 30,
        step: 0.1,
        defaultValue: 0.3,
        helpText: 'Must be mg/dL (divide mg/L by 10). Threshold ≤1 mg/dL.',
      }),
      numberInput('pga', 'Patient global assessment', {
        unit: '0–10',
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 0.5,
        helpText: '0–10 NRS/VAS. Original Boolean PGA ≤1; 2022 revision PGA ≤1.5.',
      }),
    ],
    calculate(values) {
      const revision = str(values.revision, '2022');
      const tjc = num(values.tjc28, 0);
      const sjc = num(values.sjc28, 0);
      const crp = num(values.crp, 0);
      const pga = num(values.pga, 0);
      const pgaCut = revision === 'original' ? 1 : 1.5;
      const tjcOk = tjc <= 1;
      const sjcOk = sjc <= 1;
      const crpOk = crp <= 1;
      const pgaOk = pga <= pgaCut;
      const remission = tjcOk && sjcOk && crpOk && pgaOk;
      const failed: string[] = [];
      if (!tjcOk) failed.push(`TJC28 ${tjc} > 1`);
      if (!sjcOk) failed.push(`SJC28 ${sjc} > 1`);
      if (!crpOk) failed.push(`CRP ${crp} mg/dL > 1`);
      if (!pgaOk) failed.push(`PGA ${pga} > ${pgaCut} (${revision === 'original' ? '2011' : '2022'} cutoff)`);
      const score = remission ? 1 : 0;
      const result: CalcResult = {
        score,
        label: remission ? 'Boolean remission' : 'Not in Boolean remission',
        interpretation: remission
          ? `Meets ${revision === 'original' ? '2011' : '2022'} Boolean remission (TJC≤1, SJC≤1, CRP≤1 mg/dL, PGA≤${pgaCut}).`
          : `Does not meet ${revision === 'original' ? '2011' : '2022'} Boolean remission. Failed: ${failed.join('; ')}.`,
        riskLevel: remission ? 'normal' : 'high',
        details: [
          { label: 'Definition', value: revision === 'original' ? 'Original 2011 (PGA ≤1.0)' : '2022 revision (PGA ≤1.5)' },
          { label: 'PGA cutoff used', value: String(pgaCut) },
          { label: 'TJC28', value: `${tjc} (${tjcOk ? 'pass' : 'fail'})` },
          { label: 'SJC28', value: `${sjc} (${sjcOk ? 'pass' : 'fail'})` },
          { label: 'CRP', value: `${crp} mg/dL (${crpOk ? 'pass' : 'fail'})` },
          { label: 'PGA', value: `${pga} / 10 (${pgaOk ? 'pass' : 'fail'})` },
        ],
        recommendations: remission
          ? ['Maintain DMARD strategy; consider steroid taper if used', 'Re-score at planned T2T interval']
          : ['Review residual swollen joints and inflammatory labs', 'Do not label remission based on PGA alone'],
      };
      return result;
    },
    evidence: {
      summary:
        '2011 Boolean: TJC28 ≤1 AND SJC28 ≤1 AND CRP ≤1 mg/dL AND PGA ≤1 (0–10). 2022 revision raises PGA to ≤1.5 (Boolean 1.5 pathway; official Boolean 2.0 uses PGA ≤2). Score 1 = remission, 0 = not.',
      formula: 'All four variables must be at target; PGA cutoff depends on selected revision.',
      validation:
        'Felson 2011 ACR/EULAR provisional Boolean; Studenic 2022 revision validated better agreement with SDAI/CDAI remission without loss of radiographic/functional prediction.',
      references: [
        {
          title: 'American College of Rheumatology/EULAR remission criteria for rheumatoid arthritis: 2022 revision',
          citation: 'Studenic P, Aletaha D, de Wit M, et al. Ann Rheum Dis. 2023;82:74-80',
          year: 2023,
          pmid: '35487678',
          doi: '10.1136/ard-2022-223413',
        },
        {
          title: 'American College of Rheumatology/European League Against Rheumatism provisional definition of remission in rheumatoid arthritis for clinical trials',
          citation: 'Felson DT, Smolen JS, Wells G, et al. Arthritis Rheum. 2011;63:573-586',
          year: 2011,
          pmid: '21261701',
          doi: '10.1002/art.30129',
        },
      ],
    },
    nextSteps: [
      { condition: 'Boolean remission', actions: ['Maintain therapy', 'Taper glucocorticoids', 'Monitor for flare'] },
      { condition: 'Not in remission', actions: ['Identify which variable failed', 'Escalate or switch DMARD if activity is inflammatory', 'Address non-inflammatory PGA drivers if joints/CRP are quiet'] },
    ],
    pearls: [
      'CRP must be mg/dL, not mg/L.',
      'PGA 1.2 fails original Boolean (≤1) but meets the 2022 PGA ≤1.5 revision — that is why the definition selector exists.',
      'Official ACR/EULAR Boolean 2.0 uses PGA ≤2; this calculator’s 2022 arm uses 1.5 as specified for the revision pathway.',
    ],
  },

  // ─── 2. RAPID3 ────────────────────────────────────────────────────────────
  {
    id: 'rapid3',
    name: 'RAPID3 (MDHAQ)',
    shortName: 'RAPID3',
    description:
      'Routine Assessment of Patient Index Data 3 — sum of MDHAQ function, pain, and patient global (each 0–10).',
    category: 'rheumatology',
    tags: ['rapid3', 'mdhaq', 'ra', 'patient reported', 'disease activity'],
    whenToUse: 'Room-side RA (and other inflammatory arthritis) activity scoring when joint counts are not being performed.',
    whyUse: 'No joint count or lab required; correlates with DAS28 and CDAI in clinic populations.',
    inputs: [
      numberInput('fn', 'FN — MDHAQ function (0–10)', {
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 1,
        helpText: 'Converted MDHAQ function 0–10 (raw 0–3 × 3.33 is the usual conversion).',
      }),
      numberInput('pn', 'PN — Pain VAS (0–10)', { min: 0, max: 10, step: 0.1, defaultValue: 1 }),
      numberInput('ptgl', 'PTGL — Patient global (0–10)', { min: 0, max: 10, step: 0.1, defaultValue: 1 }),
    ],
    calculate(values) {
      const fn = num(values.fn, 0);
      const pn = num(values.pn, 0);
      const ptgl = num(values.ptgl, 0);
      const score = round(fn + pn + ptgl, 1);
      const r = riskFromThresholds(score, [
        {
          max: 3,
          level: 'normal',
          label: 'Near remission (≤3)',
          interpretation: `RAPID3 ${score}: near-remission band (≤3). Confirm with joint examination when possible.`,
        },
        {
          max: 6,
          level: 'low',
          label: 'Low activity (3.1–6)',
          interpretation: `RAPID3 ${score}: low disease activity.`,
        },
        {
          max: 12,
          level: 'moderate',
          label: 'Moderate activity (6.1–12)',
          interpretation: `RAPID3 ${score}: moderate activity — review DMARD strategy.`,
        },
        {
          max: 30,
          level: 'high',
          label: 'High activity (>12)',
          interpretation: `RAPID3 ${score}: high activity — escalate therapy after excluding damage/fibromyalgia drivers.`,
        },
      ]);
      return {
        score,
        unit: '0–30',
        ...r,
        details: [
          { label: 'FN (function)', value: String(fn) },
          { label: 'PN (pain)', value: String(pn) },
          { label: 'PTGL (patient global)', value: String(ptgl) },
          { label: 'Sum', value: `${fn} + ${pn} + ${ptgl} = ${score}` },
        ],
      };
    },
    evidence: {
      summary:
        'RAPID3 = FN + PN + PTGL (each 0–10; total 0–30). Bands: ≤3 near remission, 3.1–6 low, 6.1–12 moderate, >12 high.',
      formula: 'RAPID3 = FN + PN + PTGL',
      validation: 'Pincus et al.; widely used MDHAQ index, feasible in routine care without formal joint counts.',
      references: [
        {
          title: 'RAPID3 (Routine Assessment of Patient Index Data 3), a rheumatoid arthritis index without formal joint counts',
          citation: 'Pincus T, Swearingen CJ, Bergman MJ, Yazici Y. J Rheumatol. 2008;35:2136-2147',
          year: 2008,
          pmid: '19208659',
          doi: '10.3899/jrheum.080402',
        },
      ],
    },
    nextSteps: [
      { condition: 'RAPID3 >12', actions: ['Full joint count if not done', 'Consider DMARD change', 'Screen infection before biologic switch'] },
      { condition: 'Near remission', actions: ['Maintain therapy', 'Pair with CRP/CDAI when available'] },
    ],
    pearls: [
      'MDHAQ function is a 0–3 mean converted to 0–10; do not enter raw 0–3 here.',
      'High RAPID3 with quiet joints may reflect damage, osteoarthritis, or fibromyalgia rather than inflammatory RA.',
    ],
  },

  // ─── 3. SLICC/ACR Damage Index ────────────────────────────────────────────
  {
    id: 'slicc-sdi',
    name: 'SLICC/ACR Damage Index (SDI)',
    shortName: 'SDI',
    description:
      'SLICC/ACR Damage Index for irreversible SLE damage present for at least 6 months (not current activity).',
    category: 'rheumatology',
    tags: ['slicc', 'sdi', 'lupus', 'damage', 'sle'],
    whenToUse: 'Annual SLE damage documentation, pairing with SLEDAI/BILAG/SLE-DAS activity scores.',
    whyUse: 'Damage predicts mortality and is the standard SLE damage instrument in cohorts and trials.',
    inputs: [
      numberInput('ocular', 'Ocular damage items', { min: 0, max: 2, defaultValue: 0, helpText: 'Cataract; retinal change / optic atrophy (0–2).' }),
      numberInput('neuro', 'Neuropsychiatric damage items', { min: 0, max: 6, defaultValue: 0, helpText: 'CVA (up to 2), seizures, cognitive/psychosis, neuropathy, transverse myelitis (0–6).' }),
      numberInput('renal', 'Renal damage items', { min: 0, max: 3, defaultValue: 0, helpText: 'GFR <50%, proteinuria ≥3.5 g, ESRD (ESRD scores 3).' }),
      numberInput('pulmonary', 'Pulmonary damage items', { min: 0, max: 5, defaultValue: 0, helpText: 'PH, fibrosis, shrinking lung, pleural fibrosis, infarction/resection (0–5).' }),
      numberInput('cv', 'Cardiovascular damage items', { min: 0, max: 6, defaultValue: 0, helpText: 'Angina/CABG, MI (up to 2), cardiomyopathy, valvular disease, pericarditis (0–6).' }),
      numberInput('pvd', 'Peripheral vascular damage items', { min: 0, max: 5, defaultValue: 0, helpText: 'Claudication, minor tissue loss, significant tissue loss (up to 2), venous thrombosis (0–5).' }),
      numberInput('gi', 'Gastrointestinal damage items', { min: 0, max: 6, defaultValue: 0, helpText: 'Infarction/resection (up to 2), mesenteric insufficiency, peritonitis, stricture, pancreatic insufficiency (0–6).' }),
      numberInput('msk', 'Musculoskeletal damage items', { min: 0, max: 7, defaultValue: 0, helpText: 'Atrophy, deforming arthritis, osteoporotic fracture, AVN (up to 2), osteomyelitis, tendon rupture (0–7).' }),
      numberInput('skin', 'Skin damage items', { min: 0, max: 3, defaultValue: 0, helpText: 'Scarring alopecia, extensive scarring, skin ulceration (0–3).' }),
      numberInput('gonadal', 'Premature gonadal failure', { min: 0, max: 1, defaultValue: 0 }),
      numberInput('diabetes', 'Diabetes (damage)', { min: 0, max: 1, defaultValue: 0, helpText: 'Diabetes regardless of treatment, present ≥6 months.' }),
      numberInput('malignancy', 'Malignancy items', { min: 0, max: 2, defaultValue: 0, helpText: 'Each distinct malignancy 1 (max 2), excluding dysplasia.' }),
    ],
    calculate(values) {
      const ocular = num(values.ocular, 0);
      const neuro = num(values.neuro, 0);
      const renal = num(values.renal, 0);
      const pulmonary = num(values.pulmonary, 0);
      const cv = num(values.cv, 0);
      const pvd = num(values.pvd, 0);
      const gi = num(values.gi, 0);
      const msk = num(values.msk, 0);
      const skin = num(values.skin, 0);
      const gonadal = num(values.gonadal, 0);
      const diabetes = num(values.diabetes, 0);
      const malignancy = num(values.malignancy, 0);
      const score =
        ocular + neuro + renal + pulmonary + cv + pvd + gi + msk + skin + gonadal + diabetes + malignancy;
      const r = riskFromThresholds(score, [
        {
          max: 0,
          level: 'low',
          label: 'No damage (0)',
          interpretation: 'SDI 0: no scored irreversible damage. Continue damage-prevention (steroid-sparing, BP, antimalarial).',
        },
        {
          max: 2,
          level: 'moderate',
          label: 'Low–moderate damage (1–2)',
          interpretation: `SDI ${score}: early damage — associated with later accrual; minimise ongoing glucocorticoids.`,
        },
        {
          max: 47,
          level: 'high',
          label: 'Substantial damage (≥3)',
          interpretation: `SDI ${score}: established damage (max 47). Activity control still matters; address organ-specific complications.`,
        },
      ]);
      return {
        score,
        unit: '0–47',
        ...r,
        details: [
          { label: 'Ocular (0–2)', value: String(ocular) },
          { label: 'Neuropsychiatric (0–6)', value: String(neuro) },
          { label: 'Renal (0–3)', value: String(renal) },
          { label: 'Pulmonary (0–5)', value: String(pulmonary) },
          { label: 'Cardiovascular (0–6)', value: String(cv) },
          { label: 'Peripheral vascular (0–5)', value: String(pvd) },
          { label: 'GI (0–6)', value: String(gi) },
          { label: 'MSK (0–7)', value: String(msk) },
          { label: 'Skin (0–3)', value: String(skin) },
          { label: 'Premature gonadal failure (0–1)', value: String(gonadal) },
          { label: 'Diabetes (0–1)', value: String(diabetes) },
          { label: 'Malignancy (0–2)', value: String(malignancy) },
        ],
      };
    },
    evidence: {
      summary:
        'SDI sums irreversible organ items present ≥6 months. Domain maxima: ocular 2, NP 6, renal 3, pulmonary 5, CV 6, PVD 5, GI 6, MSK 7, skin 3, gonadal 1, diabetes 1, malignancy 2 (total 47). Enter item counts per domain. 0 = none, 1–2 moderate, ≥3 high.',
      formula: 'SDI = Σ domain item counts (max 47)',
      validation: 'Gladman / SLICC 1996; damage independently predicts mortality.',
      references: [
        {
          title: 'The development and initial validation of the Systemic Lupus International Collaborating Clinics/American College of Rheumatology damage index for systemic lupus erythematosus',
          citation: 'Gladman D, Ginzler E, Goldsmith C, et al. Arthritis Rheum. 1996;39:363-369',
          year: 1996,
          pmid: '8768226',
          doi: '10.1002/art.1780390303',
        },
      ],
    },
    nextSteps: [
      { condition: 'SDI ≥1', actions: ['Steroid-sparing plan', 'Cardiovascular risk modification', 'Do not score activity items here'] },
      { condition: 'New item vs prior SDI', actions: ['Confirm ≥6 months duration', 'Record date of damage'] },
    ],
    pearls: [
      'Damage ≠ activity: a burned-out nephritis with ESRD scores on SDI, not SLEDAI.',
      'Repeat scoring no more often than every 6–12 months.',
    ],
  },

  // ─── 4. BILAG-2004 simplified domain grades ────────────────────────────────
  {
    id: 'bilag-2004-index',
    name: 'BILAG-2004 (Domain Grades)',
    shortName: 'BILAG-2004',
    description:
      'Simplified BILAG-2004 organ-system grades (A–E) with classic activity classification from the worst grade.',
    category: 'rheumatology',
    tags: ['bilag', 'lupus', 'sle', 'activity', 'organ'],
    whenToUse: 'Organ-based SLE activity for clinic or trials when a full BILAG glossary worksheet is summarised as domain letters.',
    whyUse:
      'BILAG captures intention-to-treat by organ (A = severe, B = moderate, C = mild, D = inactive, E = never). Any A is very high activity.',
    inputs: BILAG_DOMAINS.map((d) => bilagGrade(d.id, d.label)),
    calculate(values) {
      const grades = BILAG_DOMAINS.map((d) => ({
        id: d.id,
        label: d.label,
        grade: str(values[d.id], 'E').toUpperCase(),
      }));
      const counts = { A: 0, B: 0, C: 0, D: 0, E: 0 };
      for (const g of grades) {
        if (g.grade === 'A') counts.A += 1;
        else if (g.grade === 'B') counts.B += 1;
        else if (g.grade === 'C') counts.C += 1;
        else if (g.grade === 'D') counts.D += 1;
        else counts.E += 1;
      }
      const score = `A:${counts.A} B:${counts.B} C:${counts.C} D:${counts.D} E:${counts.E}`;
      let riskLevel: CalcResult['riskLevel'] = 'low';
      let label = 'Inactive (D/E only)';
      let interpretation = `BILAG-2004 ${score}: no current organ activity (D/E only).`;
      if (counts.A > 0) {
        riskLevel = 'critical';
        label = 'Very high activity (any A)';
        interpretation = `BILAG-2004 ${score}: at least one A (severe organ activity) — typically warrants systemic immunosuppression / organ-specific rescue.`;
      } else if (counts.B > 0) {
        riskLevel = 'high';
        label = 'Intermediate / moderate activity (any B, no A)';
        interpretation = `BILAG-2004 ${score}: B-grade disease without A — moderate activity; treatment intensification often indicated.`;
      } else if (counts.C > 0) {
        riskLevel = 'moderate';
        label = 'Mild activity (C only)';
        interpretation = `BILAG-2004 ${score}: C-grade only — mild activity.`;
      }
      return {
        score,
        label,
        interpretation,
        riskLevel,
        details: [
          ...grades.map((g) => ({ label: g.label, value: g.grade })),
          { label: 'Letter tally', value: score },
        ],
        recommendations:
          counts.A > 0
            ? ['Urgent organ work-up for each A domain', 'Induction vs rescue per EULAR SLE guidance']
            : counts.B > 0
              ? ['Escalate or add immunosuppressive therapy', 'Reassess in 2–4 weeks']
              : ['Maintain background HCQ / IS', 'Re-score at next visit'],
      };
    },
    evidence: {
      summary:
        'Nine BILAG-2004 systems graded A–E. This helper records the letter per domain (not the full glossary algorithm). Classification: any A = very high; any B (no A) = intermediate; only C = mild; only D/E = inactive. Numerical schemes (A=12, B=8, C=1, D/E=0) exist but letters are the clinical language.',
      formula: 'Tally of A/B/C/D/E across 9 domains; worst grade drives activity class.',
      validation: 'Isenberg 2005 BILAG-2004; Yee 2010 numerical scoring (A=12, B=8, C=1, D/E=0).',
      references: [
        {
          title: 'BILAG 2004. Development and initial validation of an updated version of the British Isles Lupus Assessment Group disease activity index',
          citation: 'Isenberg DA, Rahman A, Allen E, et al. Rheumatology (Oxford). 2005;44:902-906',
          year: 2005,
          pmid: '15814577',
          doi: '10.1093/rheumatology/keh624',
        },
        {
          title: 'Numerical scoring for the BILAG-2004 index',
          citation: 'Yee CS, Cresswell L, Farewell V, et al. Rheumatology (Oxford). 2010;49:1665-1669',
          year: 2010,
          pmid: '20181671',
          doi: '10.1093/rheumatology/keq026',
        },
      ],
    },
    nextSteps: [
      { condition: 'Any A', actions: ['Organ-specific work-up', 'Induction immunosuppression as indicated', 'Exclude infection'] },
      { condition: 'B without A', actions: ['Intensify therapy', 'Close follow-up'] },
    ],
    pearls: [
      'D vs E does not change numeric intent-to-treat but must be recorded — E = never involved, D = previous involvement now inactive.',
      'Full BILAG requires the glossary definitions; this is a domain-grade recorder.',
    ],
  },

  // ─── 5. SLE-DAS ───────────────────────────────────────────────────────────
  {
    id: 'sle-das',
    name: 'SLE-DAS (Jesus 2019)',
    shortName: 'SLE-DAS',
    description:
      'Systemic Lupus Erythematosus Disease Activity Score — 17-item weighted continuous activity index (Jesus et al., ARD 2019).',
    category: 'rheumatology',
    tags: ['sle-das', 'lupus', 'activity', 'sledai'],
    whenToUse: 'Continuous SLE activity scoring when swollen joints, proteinuria, cytopenias, and organ items are available.',
    whyUse: 'More sensitive to change than SLEDAI-2K; validated remission ≤2.08 and mild ≤7.64 cutoffs.',
    inputs: [
      yesNo('arthritis', 'Arthritis (clinician: present)', null, 'Binary arthritis item (independent of swollen-joint count).'),
      numberInput('sjc', 'Swollen joint count (0–28)', { min: 0, max: 28, defaultValue: 0 }),
      yesNo('mucocutVasc', 'Mucocutaneous vasculitis', null),
      yesNo('localRash', 'Localized cutaneous rash (above the neck)', null),
      yesNo('generalRash', 'Generalized cutaneous rash', null),
      yesNo('alopecia', 'Alopecia', null),
      yesNo('ulcers', 'Mucosal ulcers', null),
      yesNo('hypoC', 'Hypocomplementaemia (low C3 and/or C4)', null),
      yesNo('dsdna', 'Increased anti-dsDNA', null),
      yesNo('pprot', 'Proteinuria >500 mg/24 h', null, 'Binary PProt. Amount is entered separately and only weights the score when this is Yes.'),
      numberInput('prot', 'Proteinuria amount', {
        unit: 'mg/24 h',
        min: 0,
        max: 20000,
        step: 10,
        defaultValue: 0,
        helpText: 'Used as ln(Prot) only when PProt is Yes. Enter 0 if no proteinuria.',
      }),
      yesNo('thromb', 'Thrombocytopenia (<100 × 10⁹/L)', null),
      numberInput('platCount', 'Platelet count', {
        unit: '×10⁹/L',
        min: 1,
        max: 800,
        defaultValue: 250,
        helpText: 'Used as ln(PlatCount) only when thrombocytopenia is Yes.',
      }),
      yesNo('leuk', 'Leukopenia (<3 × 10⁹/L)', null),
      numberInput('leukCount', 'Leukocyte count', {
        unit: '×10⁹/L',
        min: 0.1,
        max: 40,
        step: 0.1,
        defaultValue: 6,
        helpText: 'Used as ln(LeukCount) only when leukopenia is Yes.',
      }),
      yesNo('neuropsych', 'Neuropsychiatric SLE', null),
      yesNo('systemicVasc', 'Systemic vasculitis', null),
      yesNo('cardioPulm', 'Cardiac / pulmonary involvement', null),
      yesNo('myositis', 'Myositis', null),
      yesNo('serositis', 'Serositis', null),
      yesNo('hemolytic', 'Haemolytic anaemia', null),
    ],
    calculate(values) {
      const arthritis = yn(values.arthritis);
      const sjc = num(values.sjc, 0);
      const mucocutVasc = yn(values.mucocutVasc);
      const localRash = yn(values.localRash);
      const generalRash = yn(values.generalRash);
      const alopecia = yn(values.alopecia);
      const ulcers = yn(values.ulcers);
      const hypoC = yn(values.hypoC);
      const dsdna = yn(values.dsdna);
      const pprot = yn(values.pprot);
      const prot = num(values.prot, 0);
      const thromb = yn(values.thromb);
      const platCount = num(values.platCount, 250);
      const leuk = yn(values.leuk);
      const leukCount = num(values.leukCount, 6);
      const neuropsych = yn(values.neuropsych);
      const systemicVasc = yn(values.systemicVasc);
      const cardioPulm = yn(values.cardioPulm);
      const myositis = yn(values.myositis);
      const serositis = yn(values.serositis);
      const hemolytic = yn(values.hemolytic);
      const protLn = Math.log(Math.max(prot, 1));
      const platLn = Math.log(Math.max(platCount, 1));
      const leukLn = Math.log(Math.max(leukCount, 0.1));
      const raw =
        0.366 +
        3.132 * arthritis +
        0.454 * sjc +
        4.408 * mucocutVasc +
        3.138 * localRash +
        3.887 * generalRash +
        0.973 * alopecia +
        2.769 * ulcers +
        0.754 * hypoC +
        0.956 * dsdna +
        (pprot ? -17.584 + 3.811 * protLn : 0) +
        (thromb ? 26.105 - 5.577 * platLn : 0) +
        (leuk ? 6.118 - 5.058 * leukLn : 0) +
        18 * neuropsych +
        18 * systemicVasc +
        18 * cardioPulm +
        9 * myositis +
        6 * serositis +
        9 * hemolytic;
      const score = round(raw, 2);
      const r = riskFromThresholds(score, [
        {
          max: 2.08,
          level: 'normal',
          label: 'Remission-like (≤2.08)',
          interpretation: `SLE-DAS ${score}: remission-like activity (Jesus 2021 cutoff ≤2.08).`,
        },
        {
          max: 7.64,
          level: 'low',
          label: 'Mild activity (≤7.64)',
          interpretation: `SLE-DAS ${score}: mild activity.`,
        },
        {
          max: 200,
          level: 'high',
          label: 'Moderate / severe (>7.64)',
          interpretation: `SLE-DAS ${score}: moderate/severe activity — treat-to-target intensification.`,
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'Arthritis (0/1)', value: String(arthritis) },
          { label: 'SJC28', value: String(sjc) },
          { label: 'Mucocutaneous vasculitis', value: String(mucocutVasc) },
          { label: 'Localized rash', value: String(localRash) },
          { label: 'Generalized rash', value: String(generalRash) },
          { label: 'Alopecia', value: String(alopecia) },
          { label: 'Mucosal ulcers', value: String(ulcers) },
          { label: 'Hypocomplementaemia', value: String(hypoC) },
          { label: 'Increased anti-dsDNA', value: String(dsdna) },
          { label: 'PProt >500 mg/24 h', value: String(pprot) },
          { label: 'Proteinuria mg/24 h', value: String(prot) },
          { label: 'Thrombocytopenia flag', value: String(thromb) },
          { label: 'Platelets ×10⁹/L', value: String(platCount) },
          { label: 'Leukopenia flag', value: String(leuk) },
          { label: 'WBC ×10⁹/L', value: String(leukCount) },
          { label: 'NPSLE', value: String(neuropsych) },
          { label: 'Systemic vasculitis', value: String(systemicVasc) },
          { label: 'Cardiopulmonary', value: String(cardioPulm) },
          { label: 'Myositis', value: String(myositis) },
          { label: 'Serositis', value: String(serositis) },
          { label: 'Haemolytic anaemia', value: String(hemolytic) },
          { label: 'Unrounded', value: String(raw) },
        ],
      };
    },
    evidence: {
      summary:
        'Published SLE-DAS (Jesus 2019 Fig. 1): 0.366 + 3.132·Arthritis + 0.454·SJC + 4.408·mucocutaneous vasculitis + 3.138·local rash + 3.887·general rash + 0.973·alopecia + 2.769·ulcers + 0.754·hypoC + 0.956·anti-dsDNA − 17.584·PProt + 3.811·PProt·ln(Prot) + 26.105·Thromb − 5.577·Thromb·ln(Plat) + 6.118·Leuk − 5.058·Leuk·ln(WBC) + 18·NPSLE + 18·systemic vasculitis + 18·cardiopulmonary + 9·myositis + 6·serositis + 9·haemolysis. Cutoffs: ≤2.08 remission, ≤7.64 mild, >7.64 moderate/severe.',
      formula: 'Weighted 17-item continuous score (ln = natural log). Continuous proteinuria/platelet/WBC terms apply only when the corresponding binary flag is 1.',
      validation: 'Derived and validated against PGA and SLEDAI-2K (n=520); activity category cutoffs validated 2021 (n=1190).',
      references: [
        {
          title: 'Derivation and validation of the SLE Disease Activity Score (SLE-DAS)',
          citation: 'Jesus D, Matos A, Henriques C, et al. Ann Rheum Dis. 2019;78:365-371',
          year: 2019,
          pmid: '30626657',
          doi: '10.1136/annrheumdis-2018-214502',
        },
        {
          title: 'SLE-DAS enables accurate and user-friendly definitions of clinical remission and categories of disease activity',
          citation: 'Jesus D, Larosa M, Henriques C, et al. Ann Rheum Dis. 2021;80:1568-1574',
          year: 2021,
          pmid: '34407927',
          doi: '10.1136/annrheumdis-2021-220363',
        },
      ],
    },
    nextSteps: [
      { condition: 'SLE-DAS >7.64', actions: ['Intensify immunosuppression', 'Map which weighted items drive the score', 'Exclude infection'] },
      { condition: '≤2.08', actions: ['Document remission-like state', 'Taper steroids toward DORIS/LLDAS if not already'] },
    ],
    pearls: [
      'Intercept 0.366 means completely inactive disease still scores ~0.37, which is within the ≤2.08 remission band.',
      'Proteinuria amount, platelet count, and WBC change the numeric score only when their binary flags are Yes — both the flag and the count are required inputs.',
    ],
  },

  // ─── 6. LLDAS ─────────────────────────────────────────────────────────────
  {
    id: 'lldas',
    name: 'Lupus Low Disease Activity State (LLDAS)',
    shortName: 'LLDAS',
    description: 'Asia-Pacific lupus consortium LLDAS treat-to-target definition (Franklyn 2016).',
    category: 'rheumatology',
    tags: ['lldas', 'lupus', 'treat-to-target', 'remission'],
    whenToUse: 'SLE clinic visits to document whether low-disease-activity state is met.',
    whyUse: 'Attainment of LLDAS is associated with less damage and fewer flares.',
    inputs: [
      numberInput('sledai', 'SLEDAI-2K', { min: 0, max: 105, defaultValue: 2, helpText: 'Must be ≤4 with no major organ activity.' }),
      yesNo('majorOrgan', 'Major organ activity present (CNS, vasculitis, nephritis, myositis, etc.)', null),
      yesNo('newActivity', 'New activity vs previous assessment', null),
      numberInput('pga', 'Physician global assessment (0–3)', {
        min: 0,
        max: 3,
        step: 0.1,
        defaultValue: 0.5,
        helpText: 'SELENA-SLEDAI PGA; LLDAS requires ≤1.',
      }),
      numberInput('predDose', 'Prednisone (or equivalent)', { unit: 'mg/day', min: 0, max: 80, step: 0.5, defaultValue: 5 }),
      yesNo('intoleranceIS', 'Intolerance of standard immunosuppressives / antimalarials', null),
    ],
    calculate(values) {
      const sledai = num(values.sledai, 0);
      const majorOrgan = bool(values.majorOrgan);
      const newActivity = bool(values.newActivity);
      const pga = num(values.pga, 0);
      const predDose = num(values.predDose, 0);
      const intoleranceIS = bool(values.intoleranceIS);
      const c1 = sledai <= 4;
      const c2 = !majorOrgan;
      const c3 = !newActivity;
      const c4 = pga <= 1;
      const c5 = predDose <= 7.5;
      const c6 = !intoleranceIS;
      const failed: string[] = [];
      if (!c1) failed.push(`SLEDAI-2K ${sledai} > 4`);
      if (!c2) failed.push('Major organ activity present');
      if (!c3) failed.push('New activity vs previous');
      if (!c4) failed.push(`PGA ${pga} > 1`);
      if (!c5) failed.push(`Prednisone ${predDose} mg > 7.5`);
      if (!c6) failed.push('Standard IS/antimalarial not tolerated');
      const met = c1 && c2 && c3 && c4 && c5 && c6;
      const score = met ? 1 : 0;
      return {
        score,
        label: met ? 'LLDAS met' : 'LLDAS not met',
        interpretation: met
          ? 'All six LLDAS criteria are satisfied (SLEDAI-2K ≤4 without major organ or new activity, PGA ≤1, prednisone ≤7.5 mg/d, standard therapy tolerated).'
          : `LLDAS not met. Failed: ${failed.join('; ')}.`,
        riskLevel: met ? 'normal' : 'high',
        details: [
          { label: 'SLEDAI-2K ≤4', value: `${sledai} (${c1 ? 'pass' : 'fail'})` },
          { label: 'No major organ activity', value: majorOrgan ? 'fail (present)' : 'pass' },
          { label: 'No new activity', value: newActivity ? 'fail (new)' : 'pass' },
          { label: 'PGA ≤1 (0–3)', value: `${pga} (${c4 ? 'pass' : 'fail'})` },
          { label: 'Prednisone ≤7.5 mg/d', value: `${predDose} mg (${c5 ? 'pass' : 'fail'})` },
          { label: 'Standard IS tolerated', value: intoleranceIS ? 'fail (intolerant)' : 'pass' },
          { label: 'Criteria failed', value: failed.length ? failed.join('; ') : 'none' },
        ],
      };
    },
    evidence: {
      summary:
        'LLDAS: (1) SLEDAI-2K ≤4 with no activity in major organ systems, (2) no new features of activity vs previous, (3) PGA ≤1 (0–3), (4) prednisone ≤7.5 mg/day, (5) well-tolerated standard maintenance IS/antimalarials. Score 1 = met, 0 = not.',
      formula: 'All criteria must be true (AND).',
      validation: 'Franklyn / Asia Pacific Lupus Collaboration 2016; LLDAS attainment predicts less damage.',
      references: [
        {
          title: 'Definition and initial validation of a Lupus Low Disease Activity State (LLDAS)',
          citation: 'Franklyn K, Lau CS, Navarra SV, et al. Ann Rheum Dis. 2016;75:1615-1621',
          year: 2016,
          pmid: '26713506',
          doi: '10.1136/annrheumdis-2015-207726',
        },
      ],
    },
    nextSteps: [
      { condition: 'LLDAS met', actions: ['Maintain therapy', 'Continue HCQ unless contraindicated', 'Taper steroids further toward DORIS if feasible'] },
      { condition: 'Not met', actions: ['Treat the failed criterion (activity vs steroid dose vs intolerance)'] },
    ],
    pearls: [
      'SLEDAI ≤4 with new nephritis is NOT LLDAS — major-organ and “no new activity” clauses still apply.',
      'Serology (anti-dsDNA/complement) may be abnormal and still allow LLDAS if clinical items cooperate.',
    ],
  },

  // ─── 7. DORIS remission ───────────────────────────────────────────────────
  {
    id: 'doris-remission',
    name: 'DORIS SLE Remission',
    shortName: 'DORIS',
    description:
      'Definition of Remission in SLE (DORIS): clinical SLEDAI = 0, PGA <0.5, prednisone 0 (complete) or ≤5 mg/day (on treatment). Serology may be positive.',
    category: 'rheumatology',
    tags: ['doris', 'lupus', 'remission', 'sle'],
    whenToUse: 'Documenting SLE clinical remission (complete or on-treatment) in clinic or research.',
    whyUse: '2021 DORIS task force recommended a single clinical remission definition for care and trials.',
    inputs: [
      selectInput(
        'mode',
        'Remission type',
        [
          { label: 'Complete (prednisone 0; antimalarials allowed)', value: 'complete' },
          { label: 'On treatment (prednisone ≤5 mg/day ± stable IS/biologic)', value: 'on-tx' },
        ],
        'on-tx',
      ),
      numberInput('cSledai', 'Clinical SLEDAI (exclude serology)', { min: 0, max: 105, defaultValue: 0 }),
      numberInput('pga', 'Physician global assessment (0–3)', { min: 0, max: 3, step: 0.1, defaultValue: 0.2 }),
      numberInput('predDose', 'Prednisone (or equivalent)', { unit: 'mg/day', min: 0, max: 80, step: 0.5, defaultValue: 0 }),
      yesNo('serologyPositive', 'Serology positive (low complement and/or anti-dsDNA)', null, 'Allowed in DORIS clinical remission; still recorded.'),
    ],
    calculate(values) {
      const mode = str(values.mode, 'on-tx');
      const cSledai = num(values.cSledai, 0);
      const pga = num(values.pga, 0);
      const predDose = num(values.predDose, 0);
      const serologyPositive = bool(values.serologyPositive);
      const clinOk = cSledai === 0;
      const pgaOk = pga < 0.5;
      const predOk = mode === 'complete' ? predDose === 0 : predDose <= 5;
      const met = clinOk && pgaOk && predOk;
      const failed: string[] = [];
      if (!clinOk) failed.push(`clinical SLEDAI ${cSledai} ≠ 0`);
      if (!pgaOk) failed.push(`PGA ${pga} ≥ 0.5`);
      if (!predOk) {
        failed.push(
          mode === 'complete'
            ? `prednisone ${predDose} mg ≠ 0 (complete requires 0)`
            : `prednisone ${predDose} mg > 5`,
        );
      }
      const score = met ? 1 : 0;
      return {
        score,
        label: met
          ? mode === 'complete'
            ? 'DORIS complete remission'
            : 'DORIS remission on treatment'
          : 'Not in DORIS remission',
        interpretation: met
          ? `Meets DORIS ${mode === 'complete' ? 'complete' : 'on-treatment'} clinical remission (cSLEDAI=0, PGA<0.5, prednisone ${mode === 'complete' ? '=0' : '≤5 mg/d'}). Serology is ${serologyPositive ? 'positive (allowed)' : 'negative'}.`
          : `DORIS ${mode === 'complete' ? 'complete' : 'on-treatment'} remission not met. Failed: ${failed.join('; ')}. Serology ${serologyPositive ? 'positive' : 'negative'} (does not itself fail DORIS).`,
        riskLevel: met ? 'normal' : 'high',
        details: [
          { label: 'Mode', value: mode === 'complete' ? 'Complete (prednisone 0)' : 'On treatment (prednisone ≤5)' },
          { label: 'Clinical SLEDAI = 0', value: `${cSledai} (${clinOk ? 'pass' : 'fail'})` },
          { label: 'PGA < 0.5', value: `${pga} (${pgaOk ? 'pass' : 'fail'})` },
          { label: 'Prednisone criterion', value: `${predDose} mg (${predOk ? 'pass' : 'fail'})` },
          { label: 'Serology', value: serologyPositive ? 'Positive (allowed in DORIS clinical remission)' : 'Negative' },
        ],
      };
    },
    evidence: {
      summary:
        'DORIS clinical remission: clinical SLEDAI = 0, PGA <0.5 (0–3), irrespective of serology. Complete: prednisone 0 (antimalarials allowed). On treatment: prednisone ≤5 mg/day with stable antimalarials, immunosuppressives, and/or biologics. Score 1 = met.',
      formula: 'AND of clinical SLEDAI, PGA, and prednisone criterion; serology recorded but not required to be negative.',
      validation: '2021 DORIS task force single recommended definition for care, education, and research.',
      references: [
        {
          title: '2021 DORIS definition of remission in SLE: final recommendations from an international task force',
          citation: 'van Vollenhoven RF, Bertsias G, Doria A, et al. Lupus Sci Med. 2021;8:e000538',
          year: 2021,
          pmid: '34341150',
          doi: '10.1136/lupus-2021-000538',
        },
        {
          title: 'DORIS definition of remission in SLE: recommendations from an international task force (supporting literature)',
          citation: 'van Vollenhoven R, Voskuyl A, Bertsias G, et al. related DORIS consensus reports',
          year: 2020,
          pmid: '32669331',
          doi: '10.1136/annrheumdis-2020-217566',
        },
      ],
    },
    nextSteps: [
      { condition: 'DORIS met', actions: ['Maintain HCQ', 'Avoid steroid creep', 'Surveillance labs'] },
      { condition: 'Not met only because of prednisone', actions: ['Steroid taper if activity is already 0', 'Add steroid-sparing IS if flares on taper'] },
    ],
    pearls: [
      'PGA 0.5 fails DORIS (strictly <0.5), unlike LLDAS which allows PGA ≤1.',
      'Positive serology does not exclude DORIS clinical remission — it must still be recorded.',
    ],
  },

  // ─── 8. BVAS v3 ───────────────────────────────────────────────────────────
  {
    id: 'bvas-v3',
    name: 'BVAS v3 (Organ Point Totals)',
    shortName: 'BVAS v3',
    description:
      'Birmingham Vasculitis Activity Score version 3, entered as points already scored within each organ system (0 to system maximum).',
    category: 'rheumatology',
    tags: ['bvas', 'vasculitis', 'anca', 'activity', 'aav'],
    whenToUse: 'ANCA-associated or other primary systemic vasculitis activity at diagnosis and follow-up.',
    whyUse: 'Standard activity instrument for AAV trials and clinic; 0 implies remission of scored items.',
    inputs: [
      numberInput('general', 'General (max 7)', { min: 0, max: 7, defaultValue: 0, helpText: 'Myalgia, arthralgia/arthritis, fever, weight loss.' }),
      numberInput('cutaneous', 'Cutaneous (max 6)', { min: 0, max: 6, defaultValue: 0 }),
      numberInput('mucousEyes', 'Mucous membranes / eyes (max 6)', { min: 0, max: 6, defaultValue: 0 }),
      numberInput('ent', 'ENT (max 6)', { min: 0, max: 6, defaultValue: 0 }),
      numberInput('chest', 'Chest (max 6)', { min: 0, max: 6, defaultValue: 0 }),
      numberInput('cardiac', 'Cardiovascular (max 6)', { min: 0, max: 6, defaultValue: 0 }),
      numberInput('abdominal', 'Abdominal (max 6)', { min: 0, max: 6, defaultValue: 0 }),
      numberInput('renal', 'Renal (max 12)', { min: 0, max: 12, defaultValue: 0 }),
      numberInput('nervous', 'Nervous system (max 9)', { min: 0, max: 9, defaultValue: 0 }),
    ],
    calculate(values) {
      const general = num(values.general, 0);
      const cutaneous = num(values.cutaneous, 0);
      const mucousEyes = num(values.mucousEyes, 0);
      const ent = num(values.ent, 0);
      const chest = num(values.chest, 0);
      const cardiac = num(values.cardiac, 0);
      const abdominal = num(values.abdominal, 0);
      const renal = num(values.renal, 0);
      const nervous = num(values.nervous, 0);
      const score = general + cutaneous + mucousEyes + ent + chest + cardiac + abdominal + renal + nervous;
      const r = riskFromThresholds(score, [
        {
          max: 0,
          level: 'normal',
          label: 'Remission (0)',
          interpretation: 'BVAS v3 0: no scored current activity. Confirm persistent vs new items on the worksheet.',
        },
        {
          max: 7,
          level: 'low',
          label: 'Persistent / low (1–7)',
          interpretation: `BVAS v3 ${score}: low-range activity. Distinguish persistent vs new/worse items clinically.`,
        },
        {
          max: 15,
          level: 'moderate',
          label: 'Moderate (8–15)',
          interpretation: `BVAS v3 ${score}: moderate vasculitis activity.`,
        },
        {
          max: 80,
          level: 'high',
          label: 'Severe (≥16)',
          interpretation: `BVAS v3 ${score}: high/severe activity — induction or rescue typically indicated.`,
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'General', value: String(general) },
          { label: 'Cutaneous', value: String(cutaneous) },
          { label: 'Mucous membranes / eyes', value: String(mucousEyes) },
          { label: 'ENT', value: String(ent) },
          { label: 'Chest', value: String(chest) },
          { label: 'Cardiac', value: String(cardiac) },
          { label: 'Abdominal', value: String(abdominal) },
          { label: 'Renal', value: String(renal) },
          { label: 'Nervous system', value: String(nervous) },
        ],
      };
    },
    evidence: {
      summary:
        'BVAS v3 sums item weights within nine systems. Enter the points already scored in each system (0 to typical system max). Educational bands: 0 remission, 1–7 low/persistent, 8–15 moderate, ≥16 severe. Full item glossary still required for official scoring.',
      formula: 'BVAS = Σ system points',
      validation: 'Mukhtyar 2009 BVAS v3; standard AAV activity measure.',
      references: [
        {
          title: 'Modification and validation of the Birmingham Vasculitis Activity Score (version 3)',
          citation: 'Mukhtyar C, Lee R, Brown D, et al. Ann Rheum Dis. 2009;68:1827-1832',
          year: 2009,
          pmid: '19116983',
          doi: '10.1136/ard.2008.097279',
        },
      ],
    },
    nextSteps: [
      { condition: 'BVAS ≥8', actions: ['Review induction vs maintenance', 'Infection screen', 'Pair with VDI for damage'] },
      { condition: 'BVAS 0', actions: ['Confirm on-treatment remission', 'Plan taper per PEXIVAS/AAV guidance'] },
    ],
    pearls: [
      'Persistent items score differently from new/worse items on the official form — enter the weighted total you already computed per system.',
      'BVAS is activity; VDI is damage. Do not double-count scars.',
    ],
  },

  // ─── 9. VDI ───────────────────────────────────────────────────────────────
  {
    id: 'vdi-vasculitis',
    name: 'Vasculitis Damage Index (VDI)',
    shortName: 'VDI',
    description: 'Vasculitis Damage Index — irreversible damage present ≥3 months, grouped by organ item counts.',
    category: 'rheumatology',
    tags: ['vdi', 'vasculitis', 'damage', 'aav'],
    whenToUse: 'Damage documentation in AAV / PAN / other primary systemic vasculitis, separate from BVAS activity.',
    whyUse: 'VDI predicts mortality and distinguishes damage from grumbling activity.',
    inputs: [
      numberInput('msk', 'Musculoskeletal items', { min: 0, max: 3, defaultValue: 0 }),
      numberInput('skin', 'Skin items', { min: 0, max: 3, defaultValue: 0 }),
      numberInput('ocular', 'Ocular items', { min: 0, max: 3, defaultValue: 0 }),
      numberInput('ent', 'ENT items', { min: 0, max: 3, defaultValue: 0 }),
      numberInput('pulmonary', 'Pulmonary items', { min: 0, max: 4, defaultValue: 0 }),
      numberInput('cardiac', 'Cardiac items', { min: 0, max: 4, defaultValue: 0 }),
      numberInput('vascular', 'Peripheral vascular items', { min: 0, max: 4, defaultValue: 0 }),
      numberInput('gi', 'Gastrointestinal items', { min: 0, max: 2, defaultValue: 0 }),
      numberInput('renal', 'Renal items', { min: 0, max: 4, defaultValue: 0 }),
      numberInput('neuro', 'Neuropsychiatric items', { min: 0, max: 4, defaultValue: 0 }),
      numberInput('other', 'Other items', { min: 0, max: 3, defaultValue: 0, helpText: 'Gonadal failure, marrow failure, diabetes, malignancy, etc.' }),
    ],
    calculate(values) {
      const msk = num(values.msk, 0);
      const skin = num(values.skin, 0);
      const ocular = num(values.ocular, 0);
      const ent = num(values.ent, 0);
      const pulmonary = num(values.pulmonary, 0);
      const cardiac = num(values.cardiac, 0);
      const vascular = num(values.vascular, 0);
      const gi = num(values.gi, 0);
      const renal = num(values.renal, 0);
      const neuro = num(values.neuro, 0);
      const other = num(values.other, 0);
      const score = msk + skin + ocular + ent + pulmonary + cardiac + vascular + gi + renal + neuro + other;
      const r = riskFromThresholds(score, [
        {
          max: 0,
          level: 'low',
          label: 'No damage (0)',
          interpretation: 'VDI 0: no scored damage items.',
        },
        {
          max: 2,
          level: 'moderate',
          label: 'Low–moderate damage (1–2)',
          interpretation: `VDI ${score}: early damage — associated with later mortality in AAV cohorts.`,
        },
        {
          max: 40,
          level: 'high',
          label: 'High damage (≥3)',
          interpretation: `VDI ${score}: substantial damage. Optimise activity control and organ support.`,
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'MSK', value: String(msk) },
          { label: 'Skin', value: String(skin) },
          { label: 'Ocular', value: String(ocular) },
          { label: 'ENT', value: String(ent) },
          { label: 'Pulmonary', value: String(pulmonary) },
          { label: 'Cardiac', value: String(cardiac) },
          { label: 'Vascular', value: String(vascular) },
          { label: 'GI', value: String(gi) },
          { label: 'Renal', value: String(renal) },
          { label: 'Neuro', value: String(neuro) },
          { label: 'Other', value: String(other) },
        ],
      };
    },
    evidence: {
      summary:
        'VDI counts irreversible items ≥3 months. This helper uses organ item counts with typical maxima (MSK 3, skin 3, ocular 3, ENT 3, lung 4, heart 4, vascular 4, GI 2, renal 4, neuro 4, other 3). 0 none, 1–2 moderate, ≥3 high. Full VDI has 64 dichotomous items.',
      formula: 'VDI = Σ organ item counts',
      validation: 'Exley et al. Vasculitis Damage Index; damage present early and predicts outcome.',
      references: [
        {
          title: 'Development and initial validation of the Vasculitis Damage Index for ANCA-associated vasculitis',
          citation: 'Exley AR, Bacon PA, Luqmani RA, et al. Arthritis Rheum. 1997;40:371-380',
          year: 1997,
          pmid: '11196547',
          doi: '10.1002/art.1780400222',
        },
      ],
    },
    nextSteps: [
      { condition: 'VDI ≥1', actions: ['Separate damage from BVAS activity', 'Organ-specific supportive care', 'Minimise cyclophosphamide / steroid toxicity'] },
    ],
    pearls: ['Score only irreversible items lasting ≥3 months.', 'Hearing loss, nasal bridge collapse, and GFR decline are classic VDI items, not BVAS.'],
  },

  // ─── 10. FFS 2011 ─────────────────────────────────────────────────────────
  {
    id: 'ffs-2011',
    name: 'Five-Factor Score (revised 2011)',
    shortName: 'FFS 2011',
    description:
      'Revised Five-Factor Score for systemic necrotizing vasculitides (GPA, MPA, EGPA, PAN) — 5-year mortality.',
    category: 'rheumatology',
    tags: ['ffs', 'vasculitis', 'prognosis', 'gpa', 'egpa', 'mpa', 'pan'],
    whenToUse: 'Baseline prognostic scoring in GPA, MPA, EGPA, or PAN to inform intensity of induction discussions.',
    whyUse: 'FFS 0 / 1 / ≥2 correspond to ~9% / 21% / 40% 5-year mortality in the FVSG cohort.',
    inputs: [
      selectInput(
        'disease',
        'Disease',
        [
          { label: 'GPA (Wegener)', value: 'gpa' },
          { label: 'MPA', value: 'mpa' },
          { label: 'EGPA (Churg–Strauss)', value: 'egpa' },
          { label: 'PAN', value: 'pan' },
        ],
        'gpa',
        'ENT-absence is scored +1 whenever true, including MPA/PAN (so the item always changes the result).',
      ),
      yesNo('age65', 'Age >65 years', 1),
      yesNo('cardiac', 'Cardiac insufficiency / cardiomyopathy', 1),
      yesNo('gi', 'Gastrointestinal involvement', 1),
      yesNo('renal', 'Renal insufficiency (creatinine ≥150 µmol/L / 1.7 mg/dL)', 1),
      yesNo('entAbsent', 'Absence of ENT involvement', 1, 'Protective when ENT is present (score 0). Absence adds +1 in the 2011 revision.'),
    ],
    calculate(values) {
      const disease = str(values.disease, 'gpa');
      const age65 = yn(values.age65);
      const cardiac = yn(values.cardiac);
      const gi = yn(values.gi);
      const renal = yn(values.renal);
      const entAbsent = yn(values.entAbsent);
      const score = age65 + cardiac + gi + renal + entAbsent;
      const diseaseLabel =
        disease === 'gpa' ? 'GPA' : disease === 'mpa' ? 'MPA' : disease === 'egpa' ? 'EGPA' : 'PAN';
      const r = riskFromThresholds(score, [
        {
          max: 0,
          level: 'low',
          label: 'FFS 0 (~9% 5-year mortality)',
          interpretation: `FFS 2011 = 0 in ${diseaseLabel}: ~9% 5-year mortality in FVSG. Still treat organ-threatening disease on clinical grounds.`,
        },
        {
          max: 1,
          level: 'moderate',
          label: 'FFS 1 (~21% 5-year mortality)',
          interpretation: `FFS 2011 = 1 in ${diseaseLabel}: ~21% 5-year mortality.`,
        },
        {
          max: 5,
          level: 'high',
          label: 'FFS ≥2 (~40% 5-year mortality)',
          interpretation: `FFS 2011 = ${score} in ${diseaseLabel}: ≥2 points, ~40% 5-year mortality — historically used to justify cyclophosphamide-based induction.`,
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'Disease', value: diseaseLabel },
          { label: 'Age >65', value: String(age65) },
          { label: 'Cardiac involvement', value: String(cardiac) },
          { label: 'GI involvement', value: String(gi) },
          { label: 'Renal insufficiency (Cr ≥150)', value: String(renal) },
          { label: 'ENT involvement absent', value: String(entAbsent) },
        ],
      };
    },
    evidence: {
      summary:
        '2011 FFS: +1 each for age >65, cardiac insufficiency, GI involvement, renal insufficiency (stabilised peak creatinine ≥150 µmol/L), and absence of ENT symptoms. Score 0 / 1 / ≥2 ≈ 9% / 21% / 40% 5-year mortality. ENT-absence is always scored when true (including MPA/PAN) so the item remains live; clinically it was derived in GPA/EGPA.',
      formula: 'FFS = age>65 + cardiac + GI + renal + ENT-absent (each 0/1)',
      validation: 'Guillevin / FVSG 2011 revision of the 1996 FFS, n=1108.',
      references: [
        {
          title: 'The Five-Factor Score revisited: assessment of prognoses of systemic necrotizing vasculitides based on the FVSG cohort',
          citation: 'Guillevin L, Pagnoux C, Seror R, et al. Medicine (Baltimore). 2011;90:19-27',
          year: 2011,
          pmid: '21538347',
          doi: '10.1097/MD.0b013e318205a4c6',
        },
      ],
    },
    nextSteps: [
      { condition: 'FFS ≥2', actions: ['Consider cyclophosphamide or rituximab induction per AAV guideline', 'Organ support', 'Pneumocystis prophylaxis'] },
      { condition: 'FFS 0', actions: ['Still treat threatened organs', 'Do not withhold induction solely because FFS is 0'] },
    ],
    pearls: [
      '1996 FFS used proteinuria, creatinine >140, cardiomyopathy, GI, and CNS — do not mix versions.',
      'ENT disease is protective in GPA/EGPA phenotypes; absence of ENT is the scored risk factor.',
    ],
  },

  // ─── 11. ESSDAI ───────────────────────────────────────────────────────────
  {
    id: 'essdai',
    name: 'ESSDAI (Sjögren Activity)',
    shortName: 'ESSDAI',
    description:
      'EULAR Sjögren’s Syndrome Disease Activity Index — 12 weighted domains (0–123).',
    category: 'rheumatology',
    tags: ['essdai', 'sjogren', 'activity', 'eular'],
    whenToUse: 'Systemic activity scoring in primary Sjögren disease for clinic, trials, and biologic eligibility.',
    whyUse: 'EULAR consensus activity index; MCII is a decrease ≥3 points. High activity ≥14.',
    inputs: ESSDAI_DOMAINS.map((d) =>
      essdaiDomain(d.id, `${d.label} (weight ${d.weight})`, d.weight, d.maxLevel, d.helpText, d.descriptions),
    ),
    calculate(values) {
      const rows = ESSDAI_DOMAINS.map((d) => {
        const level = num(values[d.id], 0);
        const pts = d.weight * level;
        return { ...d, level, pts };
      });
      const score = rows.reduce((s, r) => s + r.pts, 0);
      const r = riskFromThresholds(score, [
        {
          max: 4,
          level: 'low',
          label: 'Low activity (<5)',
          interpretation: `ESSDAI ${score}: low systemic activity.`,
        },
        {
          max: 13,
          level: 'moderate',
          label: 'Moderate activity (5–13)',
          interpretation: `ESSDAI ${score}: moderate systemic activity.`,
        },
        {
          max: 123,
          level: 'high',
          label: 'High activity (≥14)',
          interpretation: `ESSDAI ${score}: high systemic activity — typically the trial/biologic band.`,
        },
      ]);
      return {
        score,
        unit: '0–123',
        ...r,
        details: rows.map((row) => ({
          label: `${row.label} (wt ${row.weight})`,
          value: `level ${row.level} → ${row.pts}`,
        })),
      };
    },
    evidence: {
      summary:
        'Domain score = activity level (0–2 or 0–3) × weight. Weights: constitutional 3 (0–2), lymphadenopathy 4 (0–3), glandular 2 (0–2), articular 2 (0–3), cutaneous 3 (0–3), pulmonary 5 (0–3), renal 5 (0–3), muscular 6 (0–3), PNS 5 (0–3), CNS 5 (0–3), haematological 2 (0–3), biological 1 (0–2). Total 0–123. Low <5, moderate 5–13, high ≥14.',
      formula: 'ESSDAI = Σ (level × weight)',
      validation: 'Seror / EULAR 2010; user guide 2015 with domain definitions.',
      references: [
        {
          title: 'EULAR Sjögren’s syndrome disease activity index: development of a consensus systemic disease activity index for primary Sjögren’s syndrome',
          citation: 'Seror R, Ravaud P, Bowman SJ, et al. Ann Rheum Dis. 2010;69:1103-1109',
          year: 2010,
          pmid: '19561383',
          doi: '10.1136/ard.2009.110767',
        },
      ],
    },
    nextSteps: [
      { condition: 'ESSDAI ≥14', actions: ['Systemic therapy discussion', 'Exclude lymphoma in lymphadenopathy/high biological domains', 'Pair with ESSPRI'] },
      { condition: 'Change ≥3 points', actions: ['Counts as MCII / clinically meaningful change'] },
    ],
    pearls: [
      'Biological domain max is 2 (weight 1) — “high” is not available.',
      'ESSDAI is systemic activity; dryness/fatigue/pain live on ESSPRI.',
      'Score current Sjögren activity only — long-lasting damage (≥12 months) and infection score 0.',
      'Official CNS table has no Low (level 1); leave that option unused. Moderate = central cranial nerve, optic neuritis, or MS-like syndrome; High = cerebral vasculitis, seizure, transverse myelitis, or lymphocytic meningitis.',
    ],
  },

  // ─── 12. ESSPRI ───────────────────────────────────────────────────────────
  {
    id: 'esspri',
    name: 'ESSPRI (Sjögren Patient Index)',
    shortName: 'ESSPRI',
    description: 'EULAR Sjögren’s Syndrome Patient Reported Index — mean of dryness, fatigue, and pain VAS (0–10).',
    category: 'rheumatology',
    tags: ['esspri', 'sjogren', 'patient reported', 'dryness'],
    whenToUse: 'Patient-reported symptom burden in Sjögren disease, alongside ESSDAI.',
    whyUse: 'Complementary to ESSDAI; PASS often cited as ESSPRI <5, MCII as decrease ≥1 or 15%.',
    inputs: [
      numberInput('dryness', 'Dryness VAS', { unit: '0–10', min: 0, max: 10, step: 0.1, defaultValue: 4 }),
      numberInput('fatigue', 'Fatigue VAS', { unit: '0–10', min: 0, max: 10, step: 0.1, defaultValue: 6 }),
      numberInput('pain', 'Pain VAS', { unit: '0–10', min: 0, max: 10, step: 0.1, defaultValue: 5 }),
    ],
    calculate(values) {
      const dryness = num(values.dryness, 0);
      const fatigue = num(values.fatigue, 0);
      const pain = num(values.pain, 0);
      const score = round((dryness + fatigue + pain) / 3, 1);
      const r = riskFromThresholds(score, [
        {
          max: 5,
          level: 'low',
          label: 'Patient-acceptable range (≤5)',
          interpretation: `ESSPRI ${score}: at or below the commonly used patient-acceptable symptom state (≤5). Target is ≤5 or a reduction ≥1 point.`,
        },
        {
          max: 10,
          level: 'high',
          label: 'Unsatisfactory symptom state (>5)',
          interpretation: `ESSPRI ${score}: above PASS. Address dryness, fatigue, and pain specifically — these often dissociate from ESSDAI.`,
        },
      ]);
      return {
        score,
        unit: '0–10',
        ...r,
        details: [
          { label: 'Dryness', value: String(dryness) },
          { label: 'Fatigue', value: String(fatigue) },
          { label: 'Pain', value: String(pain) },
          { label: 'Mean', value: `(${dryness} + ${fatigue} + ${pain}) / 3 = ${score}` },
        ],
      };
    },
    evidence: {
      summary: 'ESSPRI = (dryness + fatigue + pain) / 3, each 0–10 VAS. PASS <5 is widely used; MCII ≥1-point or ≥15% reduction.',
      formula: 'ESSPRI = (dryness + fatigue + pain) / 3',
      validation: 'Seror et al. Ann Rheum Dis 2011.',
      references: [
        {
          title: 'EULAR Sjögren’s Syndrome Patient Reported Index (ESSPRI): development of a consensus patient index for primary Sjögren’s syndrome',
          citation: 'Seror R, Ravaud P, Mariette X, et al. Ann Rheum Dis. 2011;70:968-972',
          year: 2011,
          pmid: '21187296',
          doi: '10.1136/ard.2010.143743',
        },
      ],
    },
    nextSteps: [
      { condition: 'ESSPRI >5', actions: ['Optimise topical sicca therapy', 'Sleep / fatigue work-up', 'Analgesic and musculoskeletal review'] },
    ],
    pearls: ['ESSDAI and ESSPRI correlate poorly — score both.', 'A 1-point drop is the usual MCII.'],
  },

  // ─── 13. mRSS ─────────────────────────────────────────────────────────────
  {
    id: 'mrss',
    name: 'Modified Rodnan Skin Score (mRSS)',
    shortName: 'mRSS',
    description: '17-site modified Rodnan skin score (0–3 each; total 0–51) for systemic sclerosis.',
    category: 'rheumatology',
    tags: ['mrss', 'rodnan', 'scleroderma', 'ssc', 'skin'],
    whenToUse: 'SSc skin thickness scoring at baseline and follow-up (diffuse disease especially).',
    whyUse: 'Primary outcome in SSc skin trials; higher scores associate with internal-organ risk in early diffuse SSc.',
    inputs: MRSS_SITES.map((s) => rodnanSite(s.id, s.label)),
    calculate(values) {
      const rows = MRSS_SITES.map((s) => ({ ...s, v: num(values[s.id], 0) }));
      const score = rows.reduce((a, r) => a + r.v, 0);
      const r = riskFromThresholds(score, [
        {
          max: 9,
          level: 'low',
          label: 'Mild (0–9)',
          interpretation: `mRSS ${score}: mild skin thickening band (often limited or early/late treated diffuse).`,
        },
        {
          max: 19,
          level: 'moderate',
          label: 'Moderate (10–19)',
          interpretation: `mRSS ${score}: moderate skin involvement.`,
        },
        {
          max: 31,
          level: 'high',
          label: 'Severe (20–31)',
          interpretation: `mRSS ${score}: severe skin disease — typical of active diffuse SSc; screen lungs/heart/kidneys.`,
        },
        {
          max: 51,
          level: 'critical',
          label: 'Very severe (≥32)',
          interpretation: `mRSS ${score}: very severe thickening. High internal-organ vigilance and trial/therapy consideration.`,
        },
      ]);
      return {
        score,
        unit: '0–51',
        ...r,
        details: rows.map((row) => ({ label: row.label, value: String(row.v) })),
      };
    },
    evidence: {
      summary:
        'mRSS: 17 sites scored 0–3 (normal / mild / moderate / severe hidebound). Sites: face, anterior chest, abdomen, and bilateral fingers, hands, forearms, upper arms, thighs, legs, feet. Total 0–51. Educational bands 0–9 / 10–19 / 20–31 / ≥32.',
      formula: 'mRSS = Σ 17 site scores (0–3)',
      validation: 'Clements / Scleroderma Clinical Trials Consortium; intraobserver reliability is better than interobserver — same examiner should serial-score.',
      references: [
        {
          title: 'Skin thickness score in systemic sclerosis: an assessment of interobserver variability in 3 independent studies',
          citation: 'Clements P, Lachenbruch P, Siebold J, et al. J Rheumatol. 1993;20:1892-1896',
          year: 1993,
          pmid: '1390794',
          doi: '10.3899/jrheum.931892',
        },
        {
          title: 'Skin thickness score as a predictor and correlate of outcome in systemic sclerosis',
          citation: 'Clements PJ, Hurwitz EL, Wong WK, et al. Arthritis Rheum. 2000;43:2445-2454',
          year: 2000,
          pmid: '12528108',
          doi: '10.1002/1529-0131(200011)43:11<2445::AID-ANR11>3.0.CO;2-P',
        },
      ],
    },
    nextSteps: [
      { condition: 'mRSS ≥20 or rising', actions: ['Screen ILD (PFTs/HRCT)', 'Echo / PAH screen', 'Scleroderma renal crisis education', 'Consider mycophenolate / tocilizumab / trial'] },
    ],
    pearls: [
      'Do not score the back or toes; fingers are scored separately from dorsum of hands.',
      'Uninvolved = 0 even if the patient has Raynaud.',
    ],
  },

  // ─── 14. ILD-GAP ──────────────────────────────────────────────────────────
  {
    id: 'ild-gap',
    name: 'ILD-GAP Index (includes CTD-ILD)',
    shortName: 'ILD-GAP',
    description:
      'ILD-GAP prognostic index (Ley et al.) — GAP points plus ILD subtype (CTD-ILD and iNSIP subtract 2).',
    category: 'pulmonary',
    tags: ['ild-gap', 'gap', 'ctd-ild', 'ipf', 'prognosis', 'ild'],
    whenToUse: 'Prognosis in IPF, CTD-ILD, idiopathic NSIP, chronic HP, or unclassifiable ILD when PFTs are available.',
    whyUse: 'Single point model across chronic ILD subtypes; CTD-ILD/NSIP have better adjusted survival (–2).',
    inputs: [
      selectInput(
        'ildSubtype',
        'ILD subtype',
        [
          { label: 'IPF (0)', value: 'ipf', points: 0 },
          { label: 'Unclassifiable ILD (0)', value: 'unclassifiable', points: 0 },
          { label: 'Chronic HP (−1)', value: 'hp', points: -1 },
          { label: 'Idiopathic NSIP (−2)', value: 'nsip', points: -2 },
          { label: 'CTD-ILD (−2)', value: 'ctd', points: -2 },
        ],
        'ctd',
      ),
      selectInput(
        'sex',
        'Sex',
        [
          { label: 'Female (0)', value: 0, points: 0 },
          { label: 'Male (+1)', value: 1, points: 1 },
        ],
        0,
      ),
      selectInput(
        'ageBand',
        'Age',
        [
          { label: '≤60 years (0)', value: 0, points: 0 },
          { label: '61–65 years (+1)', value: 1, points: 1 },
          { label: '>65 years (+2)', value: 2, points: 2 },
        ],
        0,
      ),
      selectInput(
        'fvc',
        'FVC % predicted',
        [
          { label: '>75% (0)', value: 0, points: 0 },
          { label: '50–75% (+1)', value: 1, points: 1 },
          { label: '<50% (+2)', value: 2, points: 2 },
        ],
        0,
      ),
      selectInput(
        'dlco',
        'DLCO % predicted',
        [
          { label: '>55% (0)', value: 0, points: 0 },
          { label: '36–55% (+1)', value: 1, points: 1 },
          { label: '≤35% (+2)', value: 2, points: 2 },
          { label: 'Cannot perform (+3)', value: 3, points: 3 },
        ],
        0,
      ),
    ],
    calculate(values) {
      const ildSubtype = str(values.ildSubtype, 'ctd');
      const sex = num(values.sex, 0);
      const ageBand = num(values.ageBand, 0);
      const fvc = num(values.fvc, 0);
      const dlco = num(values.dlco, 0);
      const subPts = ILD_SUBTYPE_PTS[ildSubtype] ?? 0;
      const score = subPts + sex + ageBand + fvc + dlco;
      const r = riskFromThresholds(score, [
        {
          max: 1,
          level: 'low',
          label: 'Stage I (≤1, including negative)',
          interpretation: `ILD-GAP ${score}: stage I. Approximate 1-year mortality ~3% in the ILD-GAP tables (0–1 band). Negative totals (CTD-ILD/NSIP) stay in stage I and are not reset.`,
        },
        {
          max: 3,
          level: 'moderate',
          label: 'Stage II (2–3)',
          interpretation: `ILD-GAP ${score}: stage II. Approximate 1-year mortality ~9%.`,
        },
        {
          max: 12,
          level: 'high',
          label: 'Stage III (≥4)',
          interpretation: `ILD-GAP ${score}: stage III. 1-year mortality rises into the high teens to >30% as points increase.`,
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'ILD subtype', value: ILD_SUBTYPE_LABEL[ildSubtype] ?? ildSubtype },
          { label: 'Sex points', value: sex === 1 ? 'Male +1' : 'Female 0' },
          { label: 'Age points', value: String(ageBand) },
          { label: 'FVC points', value: String(fvc) },
          { label: 'DLCO points', value: String(dlco) },
          { label: 'Sum', value: `${subPts} + ${sex} + ${ageBand} + ${fvc} + ${dlco} = ${score}` },
        ],
      };
    },
    evidence: {
      summary:
        'GAP: male +1; age ≤60 0, 61–65 +1, >65 +2; FVC >75% 0, 50–75 +1, <50 +2; DLCO >55% 0, 36–55 +1, ≤35 +2, cannot perform +3. ILD-GAP adds subtype: IPF 0, unclassifiable 0, chronic HP −1, CTD-ILD −2, idiopathic NSIP −2. Total −2 to 8. Stages I ≤1 (including negative), II 2–3, III ≥4.',
      formula: 'ILD-GAP = subtype + sex + age + FVC + DLCO',
      validation: 'Original IPF GAP (Ley, Ann Intern Med 2012); ILD-GAP extension across chronic ILD (Ley, Chest).',
      references: [
        {
          title: 'Predicting survival across chronic interstitial lung disease: the ILD-GAP model',
          citation: 'Ley B, Ryerson CJ, Vittinghoff E, et al. Chest. 2012;142:990-996',
          year: 2012,
          pmid: '22842728',
          doi: '10.1378/chest.11-3223',
        },
        {
          title: 'A multidimensional index and staging system for idiopathic pulmonary fibrosis',
          citation: 'Ley B, Ryerson CJ, Vittinghoff E, et al. Ann Intern Med. 2012;156:684-691',
          year: 2012,
          pmid: '22586007',
          doi: '10.7326/0003-4819-156-10-201205150-00004',
        },
      ],
    },
    nextSteps: [
      { condition: 'Stage II–III', actions: ['Transplant referral discussion in IPF/progressive PF-ILD', 'Antifibrotic consideration', 'Immunosuppression review in CTD-ILD'] },
      { condition: 'CTD-ILD stage I', actions: ['Serial PFTs / HRCT per phenotype', 'Treat underlying CTD'] },
    ],
    pearls: [
      'Female, age 50, FVC >75%, DLCO >55%, CTD-ILD = −2, stage I.',
      'IPF and unclassifiable both contribute 0 subtype points — the subtype label is still shown because prognosis counselling differs.',
    ],
  },

  // ─── 15. PASDAS ───────────────────────────────────────────────────────────
  {
    id: 'pasdas',
    name: 'PASDAS (PsA Disease Activity Score)',
    shortName: 'PASDAS',
    description:
      'Psoriatic Arthritis Disease Activity Score (GRACE). Official weighted formula including SF-36 PCS.',
    category: 'rheumatology',
    tags: ['pasdas', 'psa', 'psoriatic arthritis', 'activity', 'grappa'],
    whenToUse: 'Composite PsA activity when 66/68 joints, LEI, dactylitis, CRP, dual globals, and SF-36 PCS are available.',
    whyUse: 'Most responsive GRAPPA composite in several datasets; VLDA ≤1.9, LDA ≤3.2, high ≥5.4.',
    inputs: [
      numberInput('phga', 'Physician global VAS', { unit: '0–100 mm', min: 0, max: 100, step: 1, defaultValue: 0 }),
      numberInput('ptga', 'Patient global VAS', { unit: '0–100 mm', min: 0, max: 100, step: 1, defaultValue: 0 }),
      numberInput('tjc68', 'Tender joint count (68)', { min: 0, max: 68, defaultValue: 0 }),
      numberInput('sjc66', 'Swollen joint count (66)', { min: 0, max: 66, defaultValue: 0 }),
      numberInput('lei', 'Leeds Enthesitis Index', { min: 0, max: 6, defaultValue: 0 }),
      numberInput('dactylitis', 'Tender dactylitis count', { min: 0, max: 20, defaultValue: 0 }),
      numberInput('crp', 'CRP', { unit: 'mg/L', min: 0, max: 200, step: 0.1, defaultValue: 0, helpText: 'mg/L (not mg/dL).' }),
      numberInput('sf36pcs', 'SF-36 physical component summary', {
        min: 0,
        max: 100,
        step: 0.1,
        defaultValue: 50,
        helpText: 'Higher PCS (better function) lowers PASDAS. Population mean ~50.',
      }),
    ],
    calculate(values) {
      const phga = num(values.phga, 0);
      const ptga = num(values.ptga, 0);
      const tjc68 = num(values.tjc68, 0);
      const sjc66 = num(values.sjc66, 0);
      const lei = num(values.lei, 0);
      const dactylitis = num(values.dactylitis, 0);
      const crp = num(values.crp, 0);
      const sf36pcs = num(values.sf36pcs, 50);
      const inner =
        0.18 * Math.sqrt(phga) +
        0.159 * Math.sqrt(ptga) -
        0.253 * Math.sqrt(Math.max(sf36pcs, 0)) +
        0.101 * Math.log(sjc66 + 1) +
        0.048 * Math.log(tjc68 + 1) +
        0.23 * Math.log(lei + 1) +
        0.377 * Math.log(dactylitis + 1) +
        0.102 * Math.log(crp + 1) +
        2;
      const raw = inner * 1.5;
      const score = round(raw, 2);
      const r = riskFromThresholds(score, [
        {
          max: 1.9,
          level: 'normal',
          label: 'Very low (≤1.9)',
          interpretation: `PASDAS ${score}: very low disease activity (VLDA cutoff ≤1.9).`,
        },
        {
          max: 3.2,
          level: 'low',
          label: 'Low (≤3.2)',
          interpretation: `PASDAS ${score}: low disease activity.`,
        },
        {
          max: 5.399,
          level: 'moderate',
          label: 'Moderate (<5.4)',
          interpretation: `PASDAS ${score}: moderate activity.`,
        },
        {
          max: 20,
          level: 'high',
          label: 'High (≥5.4)',
          interpretation: `PASDAS ${score}: high disease activity.`,
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'Physician global (0–100)', value: String(phga) },
          { label: 'Patient global (0–100)', value: String(ptga) },
          { label: 'TJC68', value: String(tjc68) },
          { label: 'SJC66', value: String(sjc66) },
          { label: 'LEI', value: String(lei) },
          { label: 'Dactylitis count', value: String(dactylitis) },
          { label: 'CRP mg/L', value: String(crp) },
          { label: 'SF-36 PCS', value: String(sf36pcs) },
          { label: 'Unrounded', value: String(raw) },
        ],
      };
    },
    evidence: {
      summary:
        'Official GRACE PASDAS = [0.18√PhGA + 0.159√PtGA − 0.253√SF-36 PCS + 0.101 ln(SJC+1) + 0.048 ln(TJC+1) + 0.23 ln(LEI+1) + 0.377 ln(dactylitis+1) + 0.102 ln(CRP mg/L + 1) + 2] × 1.5. VAS 0–100 mm. Cutoffs: VLDA ≤1.9, LDA ≤3.2, high ≥5.4.',
      formula: 'Weighted GRACE equation (ln = natural log).',
      validation: 'Helliwell / GRACE project; cutoffs from GRAPPA exercises (Helliwell 2014).',
      references: [
        {
          title: 'The development of candidate composite disease activity and responder indices for psoriatic arthritis (GRACE project)',
          citation: 'Helliwell PS, FitzGerald O, Fransen J, et al. Ann Rheum Dis. 2013;72:986-991',
          year: 2013,
          pmid: '22798567',
          doi: '10.1136/annrheumdis-2012-201341',
        },
        {
          title: 'Disease activity in psoriatic arthritis: comparing minimal disease activity and PASDAS cutoffs',
          citation: 'Helliwell PS, FitzGerald O, Fransen J. J Rheumatol. 2014;41:1212-1217',
          year: 2014,
          pmid: '24729430',
          doi: '10.3899/jrheum.131172',
        },
      ],
    },
    nextSteps: [
      { condition: 'PASDAS ≥5.4', actions: ['Escalate csDMARD/biologic', 'Address enthesitis/dactylitis specifically', 'Treat skin in parallel'] },
      { condition: '≤3.2', actions: ['Maintain', 'Confirm MDA/VLDA checklist'] },
    ],
    pearls: [
      'SF-36 PCS is subtracted: better physical function lowers PASDAS. Zero disease activity with PCS 50 (population mean) yields ≈0.32, not 0.',
      'CRP is mg/L in the published equation.',
    ],
  },

  // ─── 16. MDA / VLDA PsA ───────────────────────────────────────────────────
  {
    id: 'mda-psa',
    name: 'PsA MDA / VLDA',
    shortName: 'MDA/VLDA',
    description:
      'Minimal Disease Activity (MDA ≥5/7) and Very Low Disease Activity (VLDA 7/7) for psoriatic arthritis.',
    category: 'rheumatology',
    tags: ['mda', 'vlda', 'psa', 'treat-to-target', 'grappa'],
    whenToUse: 'PsA treat-to-target visits when 68/66 joints, skin, pain, global, HAQ, and enthesitis are recorded.',
    whyUse: 'MDA is the GRAPPA/EULAR-endorsed target; VLDA is a near-remission state.',
    inputs: [
      numberInput('tjc68', 'Tender joint count (68)', { min: 0, max: 68, defaultValue: 0, helpText: 'Target ≤1.' }),
      numberInput('sjc66', 'Swollen joint count (66)', { min: 0, max: 66, defaultValue: 0, helpText: 'Target ≤1.' }),
      numberInput('pasi', 'PASI', { min: 0, max: 72, step: 0.1, defaultValue: 0, helpText: 'Skin criterion: PASI ≤1 OR BSA ≤3%.' }),
      numberInput('bsa', 'BSA psoriasis', { unit: '%', min: 0, max: 100, step: 0.1, defaultValue: 0, helpText: 'Skin criterion met if BSA ≤3 even when PASI >1.' }),
      numberInput('pain', 'Patient pain VAS', { unit: '0–100', min: 0, max: 100, defaultValue: 0, helpText: 'Target ≤15.' }),
      numberInput('ptga', 'Patient global VAS', { unit: '0–100', min: 0, max: 100, defaultValue: 0, helpText: 'Target ≤20.' }),
      numberInput('haq', 'HAQ-DI', { min: 0, max: 3, step: 0.125, defaultValue: 0, helpText: 'Target ≤0.5.' }),
      numberInput('enthesitis', 'Tender entheseal points', { min: 0, max: 16, defaultValue: 0, helpText: 'Target ≤1 (LEI or other count as recorded).' }),
    ],
    calculate(values) {
      const tjc68 = num(values.tjc68, 0);
      const sjc66 = num(values.sjc66, 0);
      const pasi = num(values.pasi, 0);
      const bsa = num(values.bsa, 0);
      const pain = num(values.pain, 0);
      const ptga = num(values.ptga, 0);
      const haq = num(values.haq, 0);
      const enthesitis = num(values.enthesitis, 0);
      const c1 = tjc68 <= 1;
      const c2 = sjc66 <= 1;
      const c3 = pasi <= 1 || bsa <= 3;
      const c4 = pain <= 15;
      const c5 = ptga <= 20;
      const c6 = haq <= 0.5;
      const c7 = enthesitis <= 1;
      const score = [c1, c2, c3, c4, c5, c6, c7].filter(Boolean).length;
      const r = riskFromThresholds(score, [
        {
          max: 4,
          level: 'high',
          label: 'Not at MDA (<5/7)',
          interpretation: `MDA criteria met: ${score}/7. Below the MDA target (≥5/7).`,
        },
        {
          max: 6,
          level: 'low',
          label: 'MDA (≥5/7, not VLDA)',
          interpretation: `MDA criteria met: ${score}/7. Minimal disease activity (not VLDA).`,
        },
        {
          max: 7,
          level: 'normal',
          label: 'VLDA (7/7)',
          interpretation: 'All 7/7 criteria met — very low disease activity.',
        },
      ]);
      return {
        score,
        unit: '/7',
        ...r,
        details: [
          { label: 'TJC68 ≤1', value: `${tjc68} (${c1 ? 'pass' : 'fail'})` },
          { label: 'SJC66 ≤1', value: `${sjc66} (${c2 ? 'pass' : 'fail'})` },
          { label: 'PASI ≤1 or BSA ≤3%', value: `PASI ${pasi}, BSA ${bsa}% (${c3 ? 'pass' : 'fail'})` },
          { label: 'Pain VAS ≤15', value: `${pain} (${c4 ? 'pass' : 'fail'})` },
          { label: 'Patient global ≤20', value: `${ptga} (${c5 ? 'pass' : 'fail'})` },
          { label: 'HAQ ≤0.5', value: `${haq} (${c6 ? 'pass' : 'fail'})` },
          { label: 'Enthesitis ≤1', value: `${enthesitis} (${c7 ? 'pass' : 'fail'})` },
        ],
      };
    },
    evidence: {
      summary:
        '7 criteria: TJC68 ≤1, SJC66 ≤1, PASI ≤1 or BSA ≤3%, pain VAS ≤15, patient global ≤20, HAQ ≤0.5, enthesitis ≤1. MDA if ≥5/7; VLDA if 7/7. VAS are 0–100 mm.',
      formula: 'Count of criteria at target (0–7)',
      validation: 'Coates 2010 MDA; van Mens / Coates VLDA 2018–2019.',
      references: [
        {
          title: 'Defining minimal disease activity in psoriatic arthritis: a proposed objective target for treatment',
          citation: 'Coates LC, Fransen J, Helliwell PS. Ann Rheum Dis. 2010;69:48-53',
          year: 2010,
          pmid: '19541753',
          doi: '10.1136/ard.2008.102473',
        },
        {
          title: 'Can we identify patients with psoriatic arthritis who are in very low disease activity / remission?',
          citation: 'van Mens LJJ, van de Sande MGH, Coates LC, et al. related VLDA validation (PMID 30327493)',
          year: 2018,
          pmid: '30327493',
          doi: '10.1093/rheumatology/key344',
        },
      ],
    },
    nextSteps: [
      { condition: '<5/7', actions: ['Treat the failed domains (joints vs skin vs entheses vs function)', 'Escalate per GRAPPA/EULAR'] },
      { condition: '7/7 VLDA', actions: ['Maintain', 'Consider cautious taper in sustained VLDA'] },
    ],
    pearls: [
      'Skin is one criterion with two doors: PASI ≤1 OR BSA ≤3%.',
      'MDA is a state, not a change score — pair with PASDAS/DAPSA for magnitude.',
    ],
  },

  // ─── 17. BASFI 10-item ────────────────────────────────────────────────────
  {
    id: 'basfi-10',
    name: 'BASFI (10-item)',
    shortName: 'BASFI-10',
    description: 'Bath Ankylosing Spondylitis Functional Index — mean of 10 function items (0–10).',
    category: 'rheumatology',
    tags: ['basfi', 'axspa', 'function', 'ankylosing spondylitis'],
    whenToUse: 'When the 10 BASFI questions have been answered and a mean function score is needed (not a precomputed total).',
    whyUse: 'Standard axSpA function PRO; pair with BASDAI/ASDAS and BASMI.',
    inputs: BASFI_ITEMS.map((q) =>
      numberInput(q.id, q.label, { unit: '0–10', min: 0, max: 10, step: 0.1, defaultValue: 0 }),
    ),
    calculate(values) {
      const rows = BASFI_ITEMS.map((q) => ({ ...q, v: num(values[q.id], 0) }));
      const score = round(rows.reduce((s, r) => s + r.v, 0) / 10, 1);
      const r = riskFromThresholds(score, [
        {
          max: 3.9,
          level: 'low',
          label: 'Milder impairment (<4)',
          interpretation: `BASFI ${score}: milder functional limitation.`,
        },
        {
          max: 6.9,
          level: 'moderate',
          label: 'Moderate impairment (4–7)',
          interpretation: `BASFI ${score}: moderate functional impairment — physio plus activity control.`,
        },
        {
          max: 10,
          level: 'high',
          label: 'Severe impairment (≥7)',
          interpretation: `BASFI ${score}: severe functional limitation — multidisciplinary rehab.`,
        },
      ]);
      return {
        score,
        unit: '0–10',
        ...r,
        details: rows.map((row) => ({ label: row.label, value: String(row.v) })),
      };
    },
    evidence: {
      summary: 'BASFI is the arithmetic mean of 10 VAS/NRS items (0 = easy, 10 = impossible). Higher = worse function.',
      formula: 'BASFI = (Q1+…+Q10) / 10',
      validation: 'Calin et al. 1994; standard axSpA functional outcome.',
      references: [
        {
          title: 'A new approach to defining functional ability in ankylosing spondylitis: the development of the Bath Ankylosing Spondylitis Functional Index',
          citation: 'Calin A, Garrett S, Whitelock H, et al. J Rheumatol. 1994;21:2281-2285',
          year: 1994,
          pmid: '7979485',
          doi: '10.3899/jrheum.942281',
        },
      ],
    },
    nextSteps: [
      { condition: 'BASFI ≥4', actions: ['Supervised physiotherapy / exercise', 'Reassess ASDAS/BASDAI', 'Workplace and OT review'] },
    ],
    pearls: [
      'This 10-item scorer coexists with the precomputed-total BASFI interpreter elsewhere in the app.',
      'BASFI is function, not inflammatory activity.',
    ],
  },

  // ─── 18. BASMI ────────────────────────────────────────────────────────────
  {
    id: 'basmi',
    name: 'BASMI (2-step)',
    shortName: 'BASMI',
    description:
      'Bath Ankylosing Spondylitis Metrology Index — five measurements converted to 0–2 (2-step BASMI; total 0–10).',
    category: 'rheumatology',
    tags: ['basmi', 'axspa', 'metrology', 'ankylosing spondylitis'],
    whenToUse: 'AxSpA spinal mobility documentation (clinic or trials).',
    whyUse: 'Simple 0–10 metrology index; higher = worse mobility / more structural limitation.',
    inputs: [
      numberInput('tragus', 'Tragus-to-wall', {
        unit: 'cm',
        min: 5,
        max: 40,
        step: 0.5,
        defaultValue: 12,
        helpText: '<15 cm = 0, 15–30 = 1, >30 = 2.',
      }),
      numberInput('schober', 'Modified Schober (lumbar flexion)', {
        unit: 'cm',
        min: 0,
        max: 8,
        step: 0.1,
        defaultValue: 5,
        helpText: '>4 cm = 0, 2–4 = 1, <2 = 2.',
      }),
      numberInput('cervical', 'Cervical rotation (mean of L/R)', {
        unit: 'degrees',
        min: 0,
        max: 90,
        step: 1,
        defaultValue: 70,
        helpText: '>70° = 0, 20–70 = 1, <20 = 2.',
      }),
      numberInput('sideFlex', 'Lumbar side flexion (mean of L/R)', {
        unit: 'cm',
        min: 0,
        max: 20,
        step: 0.5,
        defaultValue: 12,
        helpText: '>10 cm = 0, 5–10 = 1, <5 = 2.',
      }),
      numberInput('imd', 'Intermalleolar distance', {
        unit: 'cm',
        min: 40,
        max: 130,
        step: 1,
        defaultValue: 110,
        helpText: '>100 cm = 0, 70–100 = 1, <70 = 2.',
      }),
    ],
    calculate(values) {
      const tragus = num(values.tragus, 0);
      const schober = num(values.schober, 0);
      const cervical = num(values.cervical, 0);
      const sideFlex = num(values.sideFlex, 0);
      const imd = num(values.imd, 0);
      const pTragus = basmi2(tragus, 'tragus');
      const pSchober = basmi2(schober, 'schober');
      const pCervical = basmi2(cervical, 'cervical');
      const pSide = basmi2(sideFlex, 'side');
      const pImd = basmi2(imd, 'imd');
      const score = pTragus + pSchober + pCervical + pSide + pImd;
      const r = riskFromThresholds(score, [
        {
          max: 2,
          level: 'low',
          label: 'Mild restriction (0–2)',
          interpretation: `BASMI ${score}/10: mild metrology restriction.`,
        },
        {
          max: 5,
          level: 'moderate',
          label: 'Moderate restriction (3–5)',
          interpretation: `BASMI ${score}/10: moderate spinal mobility limitation.`,
        },
        {
          max: 10,
          level: 'high',
          label: 'Severe restriction (6–10)',
          interpretation: `BASMI ${score}/10: severe metrology restriction — structural damage likely contributes.`,
        },
      ]);
      return {
        score,
        unit: '0–10',
        ...r,
        details: [
          { label: 'Tragus-to-wall', value: `${tragus} cm → ${pTragus} pt` },
          { label: 'Modified Schober', value: `${schober} cm → ${pSchober} pt` },
          { label: 'Cervical rotation', value: `${cervical}° → ${pCervical} pt` },
          { label: 'Lumbar side flexion', value: `${sideFlex} cm → ${pSide} pt` },
          { label: 'Intermalleolar distance', value: `${imd} cm → ${pImd} pt` },
        ],
      };
    },
    evidence: {
      summary:
        '2-step BASMI (Jenkinson): each of 5 measures scored 0/1/2. Tragus-wall <15 / 15–30 / >30; Schober >4 / 2–4 / <2; cervical rotation >70 / 20–70 / <20; side flexion >10 / 5–10 / <5; intermalleolar >100 / 70–100 / <70. Total 0–10. Linear BASMI-10 exists as an alternative.',
      formula: 'BASMI = Σ 5 converted 0–2 scores',
      validation: 'Jenkinson et al. 1994; 2-step version is the original clinic instrument.',
      references: [
        {
          title: 'Defining spinal mobility in ankylosing spondylitis (AS). The Bath AS Metrology Index',
          citation: 'Jenkinson TR, Mallorie PA, Whitelock HC, Kennedy LG, Garrett SL, Calin A. J Rheumatol. 1994;21:1694-1698',
          year: 1994,
          pmid: '7735333',
          doi: '10.3899/jrheum.9401694',
        },
      ],
    },
    nextSteps: [
      { condition: 'BASMI ≥3', actions: ['Physiotherapy emphasising spinal mobility', 'Assess syndesmophytes / hip involvement', 'Treat inflammatory activity (ASDAS) in parallel'] },
    ],
    pearls: [
      'Tragus-to-wall and cervical rotation worsen (higher cm / lower degrees) with kyphosis and fusion.',
      'Use the same examiner and technique for serial scores.',
    ],
  },

  // ─── 19. SPARCC enthesitis ────────────────────────────────────────────────
  {
    id: 'sparcc-enthesitis',
    name: 'SPARCC Enthesitis Index',
    shortName: 'SPARCC',
    description: 'Spondyloarthritis Research Consortium of Canada enthesitis index — 16 paired sites (0–16).',
    category: 'rheumatology',
    tags: ['sparcc', 'enthesitis', 'spa', 'psa', 'axspa'],
    whenToUse: 'Quantifying enthesitis in axSpA or PsA, alongside MASES or LEI.',
    whyUse: '16-site index with good reliability; includes peripheral sites often missed by MASES.',
    inputs: SPARCC_SITES.map((s) => yesNo(s.id, s.label, 1)),
    calculate(values) {
      const rows = SPARCC_SITES.map((s) => ({ ...s, v: yn(values[s.id]) }));
      const score = rows.reduce((a, r) => a + r.v, 0);
      const r = riskFromThresholds(score, [
        {
          max: 0,
          level: 'normal',
          label: 'No SPARCC enthesitis (0)',
          interpretation: 'SPARCC 0: no tender SPARCC sites.',
        },
        {
          max: 3,
          level: 'low',
          label: 'Low (1–3)',
          interpretation: `SPARCC ${score}: few sites — still relevant for MDA (enthesitis ≤1).`,
        },
        {
          max: 7,
          level: 'moderate',
          label: 'Moderate (4–7)',
          interpretation: `SPARCC ${score}: moderate enthesitis burden.`,
        },
        {
          max: 16,
          level: 'high',
          label: 'High (8–16)',
          interpretation: `SPARCC ${score}: extensive enthesitis — NSAID / physio / targeted therapy.`,
        },
      ]);
      return {
        score,
        unit: '0–16',
        ...r,
        details: rows.map((row) => ({ label: row.label, value: row.v ? 'Tender (1)' : 'Not tender (0)' })),
      };
    },
    evidence: {
      summary:
        'SPARCC: 8 paired sites (16 total) scored 0/1 for tenderness: greater trochanter, quadriceps insertion, infrapatellar/tibial tuberosity, Achilles, plantar fascia, medial epicondyle, lateral epicondyle, supraspinatus insertion. Total 0–16.',
      formula: 'SPARCC = number of tender sites (0–16)',
      validation: 'Maksymowych et al. 2009; reliable in SpA.',
      references: [
        {
          title: 'Development and validation of a Spondyloarthritis Research Consortium of Canada (SPARCC) enthesitis index',
          citation: 'Maksymowych WP, Mallon C, Morrow S, et al. Ann Rheum Dis. 2009;68:948-953',
          year: 2009,
          pmid: '18381780',
          doi: '10.1136/ard.2007.087395',
        },
      ],
    },
    nextSteps: [
      { condition: 'SPARCC ≥1', actions: ['Local measures / NSAID', 'Count toward PsA MDA (target ≤1)', 'Distinguish mechanical enthesopathy'] },
    ],
    pearls: [
      'Score each side separately — bilateral Achilles = 2 points.',
      'SPARCC includes epicondyles and plantar fascia, which MASES omits.',
    ],
  },
];
