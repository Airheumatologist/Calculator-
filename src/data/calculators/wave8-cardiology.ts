import type { Calculator, RiskLevel } from '../../types/calculator';
import { num, bool, str, round, clamp, yesNo, selectInput, numberInput, riskFromThresholds } from '../../utils/helpers';

/* ─── GARFIELD-AF Cox model (Fox et al., BMJ Open 2017; published source
 * equations, GARFIELD-AF registry). Three outcome-specific linear predictors;
 * time-specific baseline survivals at 6 months, 1 year, and 2 years.
 * Risk% = 100 × (1 − S₀^exp(LP)). Continuous variables are modeled as linear
 * splines anchored at 65 yr (age), 75 kg (weight), 120/min (pulse), 80 mmHg (DBP). */
const GARFIELD_S0 = {
  mortality: { m6: 0.987921904, y1: 0.9790643336, y2: 0.962450119 },
  stroke: { m6: 0.9955506465, y1: 0.9925445321, y2: 0.987574311 },
  bleed: { m6: 0.9968755499, y1: 0.9946821686, y2: 0.991720115 },
} as const;

function garfieldRisk(s0: number, lp: number): number {
  const p = 1 - Math.pow(s0, Math.exp(clamp(lp, -20, 20)));
  return round(clamp(p, 0, 1) * 100, 1);
}

function villaltaSeverity(score: number): { level: RiskLevel; label: string; interpretation: string } {
  if (score < 5) {
    return {
      level: 'normal',
      label: 'No post-thrombotic syndrome',
      interpretation: 'Villalta score <5: criteria for post-thrombotic syndrome are not met.',
    };
  }
  if (score <= 9) {
    return {
      level: 'low',
      label: 'Mild PTS',
      interpretation: 'Villalta 5–9: mild post-thrombotic syndrome. Conservative measures such as elastic compression stockings are usually appropriate.',
    };
  }
  if (score <= 14) {
    return {
      level: 'moderate',
      label: 'Moderate PTS',
      interpretation: 'Villalta 10–14: moderate post-thrombotic syndrome. Optimize compression therapy and consider vascular referral if lifestyle-limiting.',
    };
  }
  return {
    level: 'high',
    label: 'Severe PTS',
    interpretation: 'Villalta ≥15 (or any venous ulcer): severe post-thrombotic syndrome. Vascular specialist referral, wound care, and consideration of interventional options are warranted.',
  };
}

export const wave8CardiologyCalcs: Calculator[] = [
  // ─── 1. GARFIELD-AF ────────────────────────────────────────────────────────
  {
    id: 'garfield-af',
    name: 'GARFIELD-AF Risk Tool',
    shortName: 'GARFIELD-AF',
    description:
      'Cox regression risk tool from the GARFIELD-AF registry estimating 6-month, 1-year, and 2-year risk of all-cause mortality, ischemic stroke/systemic embolism, and major bleeding (incl. hemorrhagic stroke) in newly diagnosed atrial fibrillation, with and without anticoagulation.',
    category: 'cardiology',
    tags: ['atrial fibrillation', 'af', 'stroke', 'bleeding', 'mortality', 'anticoagulation', 'garfield'],
    whenToUse:
      'Adults with newly diagnosed atrial fibrillation when weighing the risks and benefits of oral anticoagulation. The tool simultaneously estimates mortality, stroke/systemic embolism, and major bleeding under no OAC, NOAC, or VKA treatment.',
    whyUse:
      'Unlike single-outcome scores (CHA₂DS₂-VASc, HAS-BLED), GARFIELD-AF integrates 16 predictors into competing-outcome Cox models that let the clinician compare expected event rates under each anticoagulation strategy.',
    inputs: [
      selectInput('sex', 'Sex', [
        { label: 'Male', value: 'M' },
        { label: 'Female', value: 'F' },
      ], 'F', 'Female sex carries a negative coefficient (−0.31) in the mortality model — a modestly protective association in the GARFIELD-AF cohort.'),
      numberInput('age', 'Age', { unit: 'years', min: 18, max: 110, exampleValue: 72, helpText: 'Age enters as a linear spline anchored at 65 years: steeper mortality risk increase above 65 (0.065/yr) than below (0.031/yr).' }),
      numberInput('weight', 'Weight', { unit: 'kg', min: 30, max: 250, step: 0.5, exampleValue: 80, helpText: 'Weight in kilograms; only values ≤75 kg affect the model — lower weight raises predicted mortality.' }),
      yesNo('hf', 'Heart failure', null, 'History of heart failure at AF diagnosis; raises predicted mortality and stroke risk.', true),
      yesNo('vascular', 'Vascular disease', null, 'Prior myocardial infarction, peripheral artery disease, or aortic plaque — contributes to all three models.', false),
      yesNo('priorStroke', 'Prior stroke / TIA / systemic embolism', null, 'Documented previous stroke, TIA, or systemic embolism; the strongest single predictor of subsequent stroke (β 0.80).', false),
      yesNo('bleeding', 'History of bleeding', null, 'Prior clinically relevant bleeding event; raises both stroke and major-bleeding risk.', false),
      yesNo('carotid', 'Carotid occlusive disease', null, 'Documented carotid occlusive disease; enters only the major-bleeding model.', false),
      yesNo('diabetes', 'Diabetes mellitus', null, 'Diabetes at baseline; contributes to mortality, stroke, and bleeding models.', false),
      yesNo('ckd', 'Moderate-to-severe chronic kidney disease', null, 'CKD stage 3–5 (eGFR <60 mL/min) at baseline; contributes to all three models.', false),
      yesNo('dementia', 'Dementia', null, 'Documented dementia; raises predicted mortality and stroke risk.', false),
      yesNo('smoking', 'Current smoker', null, 'Active cigarette smoking at baseline.', false),
      yesNo('antiplatelet', 'Antiplatelet treatment', null, 'Concurrent antiplatelet therapy (e.g., aspirin, P2Y12 inhibitor); enters only the bleeding model (+0.24).', false),
      selectInput('ethnicity', 'Ethnicity', [
        { label: 'Caucasian', value: 'caucasian' },
        { label: 'Hispanic / Latino', value: 'hispanic' },
        { label: 'Asian', value: 'asian' },
        { label: 'Black / mixed / other', value: 'black' },
      ], 'caucasian', 'Ethnicity coefficients apply only to the mortality model (Caucasian is the reference group). Race-based terms may not generalize — interpret cautiously.'),
      numberInput('pulse', 'Pulse', { unit: 'beats/min', min: 30, max: 220, exampleValue: 78, helpText: 'Heart rate at presentation. The mortality spline is anchored at 120/min: lower pulse is protective; the bleeding model applies a small continuous penalty above 120.' }),
      numberInput('dbp', 'Diastolic blood pressure', { unit: 'mm Hg', min: 20, max: 160, exampleValue: 75, helpText: 'DBP at presentation. In the mortality model, DBP <80 mmHg raises predicted risk; in the stroke model, DBP >80 mmHg adds risk.' }),
      selectInput('oac', 'Anticoagulation strategy to evaluate', [
        { label: 'No oral anticoagulant', value: 'none' },
        { label: 'NOAC (direct oral anticoagulant)', value: 'noac' },
        { label: 'VKA (vitamin K antagonist, e.g., warfarin)', value: 'vka' },
      ], 'noac', 'Select the treatment scenario to display: OAC lowers predicted mortality and stroke (negative coefficients) but raises predicted major bleeding (positive coefficients).'),
    ],
    calculate(values) {
      const female = str(values.sex, 'M') === 'F' ? 1 : 0;
      const age = num(values.age, 65);
      const weight = num(values.weight, 75);
      const pulse = num(values.pulse, 80);
      const dbp = num(values.dbp, 80);
      const hf = bool(values.hf) ? 1 : 0;
      const vasc = bool(values.vascular) ? 1 : 0;
      const stroke0 = bool(values.priorStroke) ? 1 : 0;
      const bleed0 = bool(values.bleeding) ? 1 : 0;
      const carotid = bool(values.carotid) ? 1 : 0;
      const dm = bool(values.diabetes) ? 1 : 0;
      const ckd = bool(values.ckd) ? 1 : 0;
      const dem = bool(values.dementia) ? 1 : 0;
      const smoke = bool(values.smoking) ? 1 : 0;
      const ap = bool(values.antiplatelet) ? 1 : 0;
      const eth = str(values.ethnicity, 'caucasian');
      const hispanic = eth === 'hispanic' ? 1 : 0;
      const asian = eth === 'asian' ? 1 : 0;
      const black = eth === 'black' ? 1 : 0;
      const oac = str(values.oac, 'none');
      const noac = oac === 'noac' ? 1 : 0;
      const vka = oac === 'vka' ? 1 : 0;

      // Mortality linear predictor (piecewise splines as published)
      const lpMort =
        -0.306202287 * female +
        0.693789082 * hf +
        0.306120964 * vasc +
        0.26585298 * stroke0 +
        0.385407386 * bleed0 +
        0.280133213 * dm +
        0.377903886 * ckd +
        0.489453313 * dem +
        0.345481149 * smoke +
        -0.414591263 * noac +
        -0.18593561 * vka +
        0.157023564 * hispanic +
        -0.609609055 * asian +
        0.375675102 * black +
        (age <= 65 ? 0.031050027 * (age - 65) : 0.064594824 * (age - 65)) +
        (weight <= 75 ? -0.021535182 * (weight - 75) : 0) +
        (pulse <= 120 ? 0.007678035 * (pulse - 120) : 0) +
        (dbp <= 80 ? -0.019304333 * (dbp - 80) : 0);

      // Ischemic stroke / systemic embolism linear predictor
      const lpStroke =
        0.233182644 * hf +
        0.197919709 * vasc +
        0.800863063 * stroke0 +
        0.29883967 * bleed0 +
        0.211995445 * dm +
        0.349516938 * ckd +
        0.513221391 * dem +
        0.478831506 * smoke +
        -0.572199357 * noac +
        -0.352373263 * vka +
        0.039138147 * (age - 65) +
        (dbp > 80 ? 0.01590016 * (dbp - 80) : 0);

      // Major bleeding (incl. hemorrhagic stroke) linear predictor
      const lpBleed =
        0.168950627 * vasc +
        0.782237771 * bleed0 +
        0.316245771 * carotid +
        0.498686574 * ckd +
        0.24232543 * noac +
        0.609713354 * vka +
        0.236620846 * ap +
        0.176898047 * dm +
        0.043476276 * (age - 65) +
        0.004167103 * (pulse - 120);

      const mort1 = garfieldRisk(GARFIELD_S0.mortality.y1, lpMort);
      const mort6 = garfieldRisk(GARFIELD_S0.mortality.m6, lpMort);
      const mort2 = garfieldRisk(GARFIELD_S0.mortality.y2, lpMort);
      const strk1 = garfieldRisk(GARFIELD_S0.stroke.y1, lpStroke);
      const strk6 = garfieldRisk(GARFIELD_S0.stroke.m6, lpStroke);
      const strk2 = garfieldRisk(GARFIELD_S0.stroke.y2, lpStroke);
      const bld1 = garfieldRisk(GARFIELD_S0.bleed.y1, lpBleed);
      const bld6 = garfieldRisk(GARFIELD_S0.bleed.m6, lpBleed);
      const bld2 = garfieldRisk(GARFIELD_S0.bleed.y2, lpBleed);

      const scenario = oac === 'noac' ? 'NOAC' : oac === 'vka' ? 'VKA' : 'no OAC';
      const { riskLevel, label } = riskFromThresholds(mort1, [
        { max: 2, level: 'low' as RiskLevel, label: 'Low 1-year mortality', interpretation: '' },
        { max: 6, level: 'moderate' as RiskLevel, label: 'Intermediate 1-year mortality', interpretation: '' },
        { max: 12, level: 'high' as RiskLevel, label: 'High 1-year mortality', interpretation: '' },
        { max: Infinity, level: 'critical' as RiskLevel, label: 'Very high 1-year mortality', interpretation: '' },
      ]);
      const interpretation =
        `With ${scenario}, estimated 1-year risks are: death ${mort1}%, ischemic stroke/systemic embolism ${strk1}%, ` +
        `major bleeding ${bld1}%. Compare scenarios by switching the anticoagulation input.`;
      return {
        score: mort1,
        unit: '% 1-yr mortality',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Mortality — 6 mo / 1 yr / 2 yr', value: `${mort6}% / ${mort1}% / ${mort2}%` },
          { label: 'Ischemic stroke/SE — 6 mo / 1 yr / 2 yr', value: `${strk6}% / ${strk1}% / ${strk2}%` },
          { label: 'Major bleeding — 6 mo / 1 yr / 2 yr', value: `${bld6}% / ${bld1}% / ${bld2}%` },
          { label: 'Scenario', value: scenario },
          { label: 'Model', value: 'GARFIELD-AF Cox models (Fox et al., BMJ Open 2017; published source equations)' },
        ],
        recommendations: [
          'Toggle the anticoagulation strategy to compare expected mortality, stroke, and bleeding under no OAC, NOAC, and VKA.',
          'Stroke prevention in AF should follow guideline thresholds (e.g., CHA₂DS₂-VASc) — GARFIELD-AF provides complementary absolute-risk context for shared decision-making.',
          'Modifiable bleeding risks (uncontrolled hypertension, labile INR, antiplatelet co-therapy, alcohol) should be addressed rather than withholding OAC.',
        ],
      };
    },
    evidence: {
      summary:
        'GARFIELD-AF integrates three Cox proportional-hazards models (all-cause mortality, ischemic stroke/systemic embolism, major bleeding incl. hemorrhagic stroke) derived from >52,000 patients with newly diagnosed AF in the prospective global GARFIELD-AF registry. Continuous variables enter as linear splines anchored at age 65, weight 75 kg, pulse 120/min, and DBP 80 mmHg.',
      formula:
        'Risk(t) = 1 − S₀(t)^exp(LP). S₀ at 6 mo/1 yr/2 yr: mortality 0.98792/0.97906/0.96245; stroke 0.99555/0.99254/0.98757; bleeding 0.99688/0.99468/0.99172. LPs use the published outcome-specific coefficients.',
      validation:
        'C-statistics (treated patients): mortality 0.77, stroke/SE 0.69, bleeding 0.66 — superior to CHA₂DS₂-VASc and HAS-BLED overall and in low-risk strata. Externally validated in ORBIT-AF and Danish nationwide registries (Dalgaard et al. 2022). Source equations implemented verbatim from the GARFIELD-AF registry publication.',
      references: [
        {
          title: 'Improved risk stratification of patients with atrial fibrillation: an integrated GARFIELD-AF tool for the prediction of mortality, stroke and bleed in patients with and without anticoagulation',
          citation: 'Fox KAA, Lucas JE, Pieper KS, et al. BMJ Open. 2017;7:e017157',
          year: 2017,
          doi: '10.1136/bmjopen-2017-017157',
        },
        {
          title: 'GARFIELD-AF risk score for mortality, stroke, and bleeding within 2 years in patients with atrial fibrillation',
          citation: 'Dalgaard F, Pieper K, Verheugt F, et al. Eur Heart J Qual Care Clin Outcomes. 2022;8:674-683',
          year: 2022,
          doi: '10.1093/ehjqcco/qcab028',
        },
        {
          title: 'GARFIELD-AF Risk Tool — source equations',
          citation: 'GARFIELD-AF Registry',
          url: 'https://af.garfieldregistry.org/wp-content/uploads/2021/06/GARFIELD-AF-Risk-Tool-Equations.pdf',
        },
      ],
    },
    nextSteps: [
      { condition: 'Stroke risk favors anticoagulation', actions: ['Initiate OAC per AF guidelines — a DOAC is preferred over VKA in eligible patients', 'Address modifiable bleeding risk factors', 'Reassess periodically'] },
      { condition: 'High predicted bleeding relative to stroke benefit', actions: ['Do not withhold OAC solely for bleeding score — correct reversible factors', 'Prefer DOAC over VKA', 'Review antiplatelet co-therapy for ongoing indication'] },
    ],
    pearls: [
      'The tool evaluates three competing outcomes simultaneously — use it to frame the anticoagulation discussion, not as a stand-alone decision.',
      'Ethnicity coefficients apply only to the mortality model and reflect registry associations that may not generalize; interpret with caution.',
      'The model was derived in newly diagnosed AF; it is not intended for long-standing AF or for peri-procedural decisions.',
    ],
  },

  // ─── 2. ARC-HBR ────────────────────────────────────────────────────────────
  {
    id: 'arc-hbr',
    name: 'ARC-HBR Criteria for High Bleeding Risk',
    shortName: 'ARC-HBR',
    description:
      'Academic Research Consortium consensus definition identifying patients undergoing PCI at high bleeding risk (BARC 3–5 bleeding ≥4% or intracranial hemorrhage ≥1% at 1 year): ≥1 major OR ≥2 minor criteria.',
    category: 'cardiology',
    tags: ['pci', 'bleeding', 'dapt', 'arc-hbr', 'antiplatelet', 'stent'],
    whenToUse: 'Before or after percutaneous coronary intervention to identify patients at high bleeding risk and guide DAPT duration and regimen.',
    whyUse:
      'ARC-HBR is the first consensus-standardized HBR definition, validated to identify patients with ≥4% 1-year BARC 3–5 bleeding. It supports abbreviated DAPT strategies and safer antithrombotic selection.',
    inputs: [
      yesNo('majOac', 'MAJOR — anticipated long-term oral anticoagulation', null, 'Planned long-term OAC (VKA or NOAC) after PCI.', false),
      yesNo('majCkd', 'MAJOR — severe/end-stage CKD (eGFR <30 mL/min)', null, 'eGFR <30 mL/min/1.73 m² or dialysis dependence.', false),
      yesNo('majAnemia', 'MAJOR — hemoglobin <11 g/dL', null, 'Baseline hemoglobin below 11 g/dL.', false),
      yesNo('majBleed', 'MAJOR — spontaneous bleeding requiring hospitalization or transfusion in past 6 months (or any time if recurrent)', null, 'Major-criterion bleeding history.', false),
      yesNo('majPlatelets', 'MAJOR — moderate/severe thrombocytopenia (platelets <100×10⁹/L)', null, 'Baseline platelet count below 100 ×10⁹/L.', false),
      yesNo('majDiathesis', 'MAJOR — chronic bleeding diathesis', null, 'e.g., von Willebrand disease or other inherited/acquired bleeding disorder.', false),
      yesNo('majCirrhosis', 'MAJOR — liver cirrhosis with portal hypertension', null, 'Cirrhosis complicated by portal hypertension.', false),
      yesNo('majCancer', 'MAJOR — active malignancy within past 12 months (excl. nonmelanoma skin cancer)', null, 'Active cancer diagnosed or treated in the last 12 months.', false),
      yesNo('majIchSpont', 'MAJOR — previous spontaneous intracranial hemorrhage (any time)', null, 'Any prior spontaneous (non-traumatic) ICH.', false),
      yesNo('majIchTrauma', 'MAJOR — previous traumatic ICH within past 12 months', null, 'Traumatic intracranial hemorrhage in the last 12 months.', false),
      yesNo('majAvm', 'MAJOR — brain arteriovenous malformation', null, 'Known cerebral AVM.', false),
      yesNo('majStroke', 'MAJOR — moderate/severe ischemic stroke within past 6 months', null, 'Moderate-to-severe ischemic stroke (NIHSS ≥5) within 6 months.', false),
      yesNo('majSurgery', 'MAJOR — nondeferrable major surgery on DAPT', null, 'Major surgery that cannot be deferred while on dual antiplatelet therapy.', false),
      yesNo('majTraumaSx', 'MAJOR — recent major surgery or major trauma within 30 days before PCI', null, 'Major surgery or major trauma in the 30 days preceding PCI.', false),
      yesNo('minAge', 'Minor — age ≥75 years', null, 'Age 75 or older at PCI.', false),
      yesNo('minCkd', 'Minor — moderate CKD (eGFR 30–59 mL/min)', null, 'eGFR 30–59 mL/min/1.73 m².', false),
      yesNo('minAnemia', 'Minor — hemoglobin 11–12.9 g/dL (men) or 11–11.9 g/dL (women)', null, 'Mild anemia in the sex-specific minor-criterion range.', false),
      yesNo('minBleed', 'Minor — spontaneous bleeding requiring hospitalization/transfusion within past 12 months not meeting the major criterion', null, 'Bleeding within 6–12 months, or bleeding not meeting major-criterion severity.', false),
      yesNo('minNsaid', 'Minor — long-term oral NSAIDs or corticosteroids', null, 'Chronic daily oral NSAID or steroid use.', false),
      yesNo('minStroke', 'Minor — any ischemic stroke not meeting the major criterion', null, 'Any prior ischemic stroke outside the major-criterion window/severity.', false),
    ],
    calculate(values) {
      const major = [
        bool(values.majOac), bool(values.majCkd), bool(values.majAnemia), bool(values.majBleed),
        bool(values.majPlatelets), bool(values.majDiathesis), bool(values.majCirrhosis),
        bool(values.majCancer), bool(values.majIchSpont), bool(values.majIchTrauma),
        bool(values.majAvm), bool(values.majStroke), bool(values.majSurgery), bool(values.majTraumaSx),
      ].filter(Boolean).length;
      const minor = [
        bool(values.minAge), bool(values.minCkd), bool(values.minAnemia), bool(values.minBleed),
        bool(values.minNsaid), bool(values.minStroke),
      ].filter(Boolean).length;
      const hbr = major >= 1 || minor >= 2;
      return {
        score: `${major} major / ${minor} minor`,
        label: hbr ? 'High bleeding risk (ARC-HBR)' : 'Not high bleeding risk',
        interpretation: hbr
          ? `Meets ARC-HBR definition (${major} major, ${minor} minor criteria): expected 1-year BARC 3–5 bleeding ≥4% or ICH ≥1%. Favor abbreviated DAPT and bleeding-mitigation strategies.`
          : `Does not meet ARC-HBR definition (${major} major, ${minor} minor criteria). Standard DAPT durations per guideline indication.`,
        riskLevel: hbr ? 'high' : 'low',
        details: [
          { label: 'Major criteria present', value: String(major) },
          { label: 'Minor criteria present', value: String(minor) },
          { label: 'Rule', value: '≥1 major OR ≥2 minor → HBR' },
        ],
        recommendations: hbr
          ? [
              'Prefer contemporary DES over BMS even in HBR patients.',
              'Consider abbreviated DAPT (commonly 1–3 months) then single antiplatelet therapy; individualize by ischemic risk.',
              'If OAC is required, use a DOAC where possible and drop aspirin after the periprocedural period (single antithrombotic strategy per guidelines).',
              'PPI co-therapy for GI protection; address hypertension and other modifiable bleeding factors.',
            ]
          : [
              'Standard DAPT duration per indication (ACS vs chronic coronary syndrome).',
              'Reassess bleeding risk if status changes (new anemia, surgery, stroke, malignancy).',
            ],
      };
    },
    evidence: {
      summary:
        'The 2019 ARC-HBR consensus defined 14 major and 6 minor clinical criteria. A patient is at high bleeding risk if ≥1 major or ≥2 minor criteria are present, corresponding to a 1-year BARC 3–5 bleeding risk ≥4% or ICH ≥1%.',
      formula: 'HBR = (≥1 major criterion) OR (≥2 minor criteria)',
      validation:
        'Consensus definition validated in multiple PCI cohorts; in LEADERS FREE (1.7 criteria/patient) 1-year BARC 3–5 bleeding was 7.2%. Numerous validation studies confirm stepwise increase in bleeding with more criteria.',
      references: [
        {
          title: 'Defining high bleeding risk in patients undergoing percutaneous coronary intervention: a consensus document from the Academic Research Consortium for High Bleeding Risk',
          citation: 'Urban P, Mehran R, Colleran R, et al. Circulation. 2019;140:240-261',
          year: 2019,
          doi: '10.1161/CIRCULATIONAHA.119.040167',
        },
        {
          title: 'Defining high bleeding risk in patients undergoing percutaneous coronary intervention (ARC-HBR consensus document)',
          citation: 'Urban P, Mehran R, Colleran R, et al. Eur Heart J. 2019;40:2632-2653',
          year: 2019,
          doi: '10.1093/eurheartj/ehz372',
        },
      ],
    },
    nextSteps: [
      { condition: 'Meets ARC-HBR', actions: ['Plan abbreviated DAPT (1–3 months) where ischemic risk permits', 'Prefer newer-generation DES', 'GI protection (PPI)', 'Close bleeding surveillance'] },
      { condition: 'Does not meet ARC-HBR', actions: ['Guideline-standard DAPT duration', 'Reassess if new criteria develop'] },
    ],
    pearls: [
      'The definition is binary, but bleeding risk rises with the number of criteria — a patient with 3+ criteria is at especially high risk.',
      'Always weigh bleeding against ischemic risk (complex PCI, ACS presentation, stent specifics) before shortening DAPT.',
      'Active malignancy, prior ICH, and thrombocytopenia warrant multi-disciplinary input before PCI when feasible.',
    ],
  },

  // ─── 3. CHADS-65 ───────────────────────────────────────────────────────────
  {
    id: 'chads-65',
    name: 'CHADS-65 (Canadian Cardiovascular Society AF Guideline)',
    shortName: 'CHADS-65',
    description:
      'CCS algorithm guiding oral anticoagulation in nonvalvular atrial fibrillation/flutter: anticoagulate if age ≥65 or any CHADS₂ risk factor (heart failure, hypertension, diabetes, prior stroke/TIA).',
    category: 'cardiology',
    tags: ['atrial fibrillation', 'stroke prevention', 'anticoagulation', 'ccs', 'chads65', 'canadian'],
    whenToUse: 'Patients with nonvalvular AF or atrial flutter when deciding whether oral anticoagulation is indicated under Canadian Cardiovascular Society guidance.',
    whyUse:
      'CHADS-65 simplifies the stroke-prevention decision to age ≥65 or any CHADS₂ risk factor — the explicit CCS recommendation — rather than the tiered CHA₂DS₂-VASc approach used elsewhere.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 18, max: 110, exampleValue: 66, helpText: 'Age ≥65 alone is an indication for OAC under CCS guidance, regardless of other factors.' }),
      yesNo('chf', 'Heart failure', null, 'Clinical heart failure (any ejection fraction) or LV dysfunction.', false),
      yesNo('htn', 'Hypertension', null, 'Documented hypertension or current antihypertensive treatment.', false),
      yesNo('dm', 'Diabetes mellitus', null, 'Type 1 or type 2 diabetes.', false),
      yesNo('stroke', 'Prior stroke or TIA', null, 'Previous ischemic stroke, TIA, or systemic embolism.', false),
    ],
    calculate(values) {
      const age = num(values.age, 0);
      const chads2 = (bool(values.chf) ? 1 : 0) + (bool(values.htn) ? 1 : 0) + (num(values.age, 0) >= 75 ? 1 : 0) + (bool(values.dm) ? 1 : 0) + (bool(values.stroke) ? 2 : 0);
      const indicate = age >= 65 || bool(values.chf) || bool(values.htn) || bool(values.dm) || bool(values.stroke);
      return {
        score: indicate ? 'OAC indicated' : 'No OAC for stroke prevention',
        label: indicate ? 'Oral anticoagulation recommended' : 'Anticoagulation not indicated by CHADS-65',
        interpretation: indicate
          ? `Age ${age} with CHADS₂ score ${chads2}: CCS guidance recommends OAC (DOAC preferred over warfarin for nonvalvular AF) because the patient is ≥65 or has ≥1 CHADS₂ risk factor.`
          : `Age <65 and CHADS₂ score 0: anticoagulation for stroke prevention is not recommended. Consider antiplatelet therapy only for atherosclerotic indications (CAD/PAD), not for AF itself.`,
        riskLevel: indicate ? 'moderate' : 'low',
        details: [
          { label: 'CHADS₂ score (informational)', value: String(chads2) },
          { label: 'Trigger', value: age >= 65 ? 'Age ≥65' : '≥1 CHADS₂ risk factor (or none)' },
        ],
        recommendations: indicate
          ? [
              'Use a DOAC in preference to warfarin for eligible nonvalvular AF patients (CCS recommendation).',
              'Assess bleeding risk (e.g., HAS-BLED) to identify and correct modifiable factors — not to withhold OAC.',
              'Shared decision-making; reassess stroke risk periodically as status changes.',
            ]
          : [
              'No anticoagulation for stroke prevention; aspirin is not a substitute for OAC and is only for separate atherosclerotic indications.',
              'Reassess at follow-up — new hypertension, diabetes, HF, stroke/TIA, or reaching age 65 changes the indication.',
            ],
      };
    },
    evidence: {
      summary:
        'The CCS approach recommends OAC for AF patients aged ≥65, or younger patients with ≥1 CHADS₂ risk factor (CHF, hypertension, diabetes, prior stroke/TIA). Age ≥65 was adopted as the dominant, unweighted driver of stroke risk.',
      formula: 'OAC indicated if age ≥65 OR CHADS₂ ≥1 (CHF, HTN, DM, or prior stroke/TIA)',
      validation:
        'Expert-consensus pathway from the CCS/CHRS 2020 AF guidelines rather than a derived regression model; aligns with population data showing age as the strongest continuous stroke predictor.',
      references: [
        {
          title: 'The 2020 Canadian Cardiovascular Society/Canadian Heart Rhythm Society Comprehensive Guidelines for the Management of Atrial Fibrillation',
          citation: 'Andrade JG, Aguilar M, Atzema C, et al. Can J Cardiol. 2020;36:1847-1948',
          year: 2020,
          doi: '10.1016/j.cjca.2020.09.001',
        },
      ],
    },
    nextSteps: [
      { condition: 'OAC indicated', actions: ['Start DOAC unless specific contraindication (mechanical valve, moderate-severe mitral stenosis, advanced CKD limits)', 'Baseline renal function and bleeding review', 'Educate on adherence and bleeding signs'] },
      { condition: 'Not indicated', actions: ['Periodic reassessment of risk factors', 'Address cardiovascular risk factors'] },
    ],
    pearls: [
      'CHADS-65 intentionally omits vascular disease, sex, and age 65–74 gradations — the CCS judged them unnecessary once the ≥65 rule applies.',
      'Do not use for valvular AF (moderate/severe mitral stenosis or mechanical valve) — warfarin is required there.',
      'Bleeding scores flag modifiable risk but should rarely override the OAC indication.',
    ],
  },

  // ─── 4. AUB-HAS2 ───────────────────────────────────────────────────────────
  {
    id: 'aub-has2',
    name: 'AUB-HAS2 Cardiovascular Risk Index',
    shortName: 'AUB-HAS2',
    description:
      'Six-item preoperative cardiovascular risk index for noncardiac surgery predicting 30-day death, MI, or stroke: age ≥75, hemoglobin <12 g/dL, history of heart disease, angina/dyspnea, vascular surgery, emergency surgery.',
    category: 'cardiology',
    tags: ['perioperative', 'noncardiac surgery', 'cardiac risk', 'aub-has2', 'preop'],
    whenToUse: 'Preoperative cardiovascular risk stratification of adults undergoing noncardiac surgery.',
    whyUse:
      'AUB-HAS2 uses six readily available elements and outperformed the Revised Cardiac Risk Index across >1.1 million NSQIP surgeries and prospective validation.',
    inputs: [
      selectInput('age', 'Age', [
        { label: '<75 years', value: 0, points: 0 },
        { label: '≥75 years', value: 1, points: 1 },
      ], 1, 'Age ≥75 contributes 1 point.'),
      selectInput('hgb', 'Hemoglobin', [
        { label: '≥12 g/dL', value: 0, points: 0 },
        { label: '<12 g/dL', value: 1, points: 1 },
      ], 0, 'Preoperative hemoglobin below 12 g/dL contributes 1 point.'),
      yesNo('heartDisease', 'History of heart disease', 1, 'Prior MI, coronary angioplasty, cardiac surgery, heart failure, atrial fibrillation, or moderate/severe valvular disease on echocardiography.', false),
      yesNo('symptoms', 'Angina or dyspnea', 1, 'Current anginal symptoms or dyspnea at baseline.', false),
      yesNo('vascular', 'Vascular surgery', 1, 'Planned procedure is vascular surgery.', false),
      yesNo('emergency', 'Emergency surgery', 1, 'Non-elective/emergency procedure.', false),
    ],
    calculate(values) {
      const score =
        num(values.age) + num(values.hgb) +
        (bool(values.heartDisease) ? 1 : 0) + (bool(values.symptoms) ? 1 : 0) +
        (bool(values.vascular) ? 1 : 0) + (bool(values.emergency) ? 1 : 0);
      const { riskLevel, label, interpretation } = riskFromThresholds(score, [
        { max: 1, level: 'low' as RiskLevel, label: 'Low risk', interpretation: 'AUB-HAS2 0–1: low 30-day cardiovascular risk (score-0 patients had <0.5% event rates in most NSQIP subgroups). No further cardiovascular testing required — optimize existing therapy.' },
        { max: 3, level: 'moderate' as RiskLevel, label: 'Intermediate risk', interpretation: 'AUB-HAS2 2–3: intermediate risk. Consider baseline ECG and biomarkers (BNP/troponin) or further evaluation if results would change management.' },
        { max: Infinity, level: 'high' as RiskLevel, label: 'High risk', interpretation: 'AUB-HAS2 >3: high risk for 30-day death, MI, or stroke. Consider cardiology consultation, biomarkers, and optimization; do not delay truly urgent surgery.' },
      ]);
      return {
        score,
        unit: 'points',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Elements present', value: `${score} of 6` },
        ],
        recommendations: [
          'Combine with functional capacity assessment (e.g., DASI) and procedure-specific risk.',
          'Ensure optimal medical therapy; do not delay urgent/emergent surgery for the score alone.',
        ],
      };
    },
    evidence: {
      summary:
        'AUB-HAS2 assigns 1 point each to age ≥75, hemoglobin <12 g/dL, history of heart disease, angina or dyspnea, vascular surgery, and emergency surgery (range 0–6). Score 0–1 low, 2–3 intermediate, >3 high risk of death/MI/stroke at 30 days.',
      formula: 'Sum of six dichotomous items (0–6)',
      validation:
        'Derived in the AUB-POCES cohort (Dakik et al., JACC 2019), prospectively validated, and externally tested in 1,167,278 NSQIP surgeries where it outperformed RCRI in every surgical subgroup.',
      references: [
        {
          title: 'A new index for pre-operative cardiovascular evaluation',
          citation: 'Dakik HA, Chehab O, Eldirani M, et al. J Am Coll Cardiol. 2019;73:3067-3078',
          year: 2019,
          doi: '10.1016/j.jacc.2019.04.023',
        },
        {
          title: 'AUB-HAS2 Cardiovascular Risk Index: performance in surgical subpopulations and comparison to the Revised Cardiac Risk Index',
          citation: 'Dakik HA, Sbaity E, Msheik A, et al. J Am Heart Assoc. 2020;9:e016228',
          year: 2020,
          doi: '10.1161/JAHA.119.016228',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score 0–1', actions: ['Proceed to surgery without further cardiac testing', 'Continue optimal medical therapy'] },
      { condition: 'Score 2–3', actions: ['Baseline ECG and consider BNP/troponin', 'Optimize cardiovascular therapy', 'Postoperative troponin surveillance if indicated'] },
      { condition: 'Score >3', actions: ['Cardiology consultation', 'Consider stress testing/echo if it would change management', 'Shared decision-making about urgency vs risk'] },
    ],
    pearls: [
      'Anemia (<12 g/dL) is a modifiable element — consider evaluation and correction before elective surgery.',
      'Score 0 identifies very low-risk patients in whom testing is wasteful.',
      'Do not apply to cardiac surgery — this index is for noncardiac procedures only.',
    ],
  },

  // ─── 5. ORBI ───────────────────────────────────────────────────────────────
  {
    id: 'orbi-score',
    name: 'ORBI Risk Score (Observatoire Régional Breton sur l’Infarctus)',
    shortName: 'ORBI',
    description:
      'Eleven-item score predicting development of in-hospital cardiogenic shock in STEMI patients without shock on admission who undergo primary PCI.',
    category: 'cardiology',
    tags: ['stemi', 'cardiogenic shock', 'primary pci', 'orbi', 'risk score'],
    whenToUse:
      'After primary PCI for STEMI in patients who did not present in cardiogenic shock, to stratify risk of subsequent in-hospital shock and plan monitoring intensity.',
    whyUse:
      'ORBI combines admission clinical variables with post-PCI angiographic results to identify patients warranting higher-level monitoring; validated externally in the RICO cohort (c-statistic 0.80).',
    inputs: [
      selectInput('age', 'Age', [
        { label: '≤70 years', value: 0, points: 0 },
        { label: '>70 years', value: 2, points: 2 },
      ], 2, 'Age above 70 years contributes 2 points.'),
      yesNo('stroke', 'Previous stroke/TIA', 2, 'Documented prior stroke or transient ischemic attack.', false),
      yesNo('arrest', 'Cardiac arrest at presentation', 3, 'Out-of-hospital or in-hospital cardiac arrest at presentation.', false),
      yesNo('anterior', 'Anterior myocardial infarction', 1, 'Anterior-wall STEMI location.', false),
      selectInput('fmcDelay', 'First medical contact-to-primary PCI delay', [
        { label: '≤90 min', value: 0, points: 0 },
        { label: '>90 min', value: 2, points: 2 },
      ], 0, 'Delay from first medical contact to primary PCI exceeding 90 minutes adds 2 points.'),
      selectInput('killip', 'Killip class on admission', [
        { label: 'I — no signs of heart failure', value: 0, points: 0 },
        { label: 'II — rales/S3 or elevated JVP', value: 2, points: 2 },
        { label: 'III — frank pulmonary edema', value: 6, points: 6 },
      ], 0, 'Killip IV (established cardiogenic shock) patients were excluded from derivation — the score applies only to patients without shock on admission.'),
      selectInput('hr', 'Heart rate on admission', [
        { label: '≤90 beats/min', value: 0, points: 0 },
        { label: '>90 beats/min', value: 3, points: 3 },
      ], 3, 'Admission heart rate above 90/min adds 3 points.'),
      yesNo('lowBp', 'SBP <125 mmHg AND pulse pressure <45 mmHg', 4, 'Both conditions must be present on admission to score the 4 points.', false),
      selectInput('glucose', 'Glucose on admission', [
        { label: '≤10 mmol/L (≤180 mg/dL)', value: 0, points: 0 },
        { label: '>10 mmol/L (>180 mg/dL)', value: 3, points: 3 },
      ], 0, 'Admission glycemia above 10 mmol/L adds 3 points, independent of diabetic status.'),
      yesNo('lmain', 'Left main coronary artery culprit lesion', 5, 'LMCA culprit on angiography — the heaviest single item (5 points).', false),
      selectInput('timi', 'Post-primary PCI TIMI flow', [
        { label: 'TIMI 3', value: 0, points: 0 },
        { label: 'TIMI <3', value: 5, points: 5 },
      ], 0, 'Post-PCI TIMI flow grade below 3 adds 5 points.'),
    ],
    calculate(values) {
      const score =
        num(values.age) + (bool(values.stroke) ? 2 : 0) + (bool(values.arrest) ? 3 : 0) +
        (bool(values.anterior) ? 1 : 0) + num(values.fmcDelay) + num(values.killip) +
        num(values.hr) + (bool(values.lowBp) ? 4 : 0) + num(values.glucose) +
        (bool(values.lmain) ? 5 : 0) + num(values.timi);
      const { riskLevel, label, interpretation } = riskFromThresholds(score, [
        { max: 7, level: 'low' as RiskLevel, label: 'Low risk', interpretation: 'ORBI 0–7: low risk of in-hospital cardiogenic shock (~1.3% observed in derivation, 3.1% in validation). Routine post-PCI monitoring.' },
        { max: 10, level: 'moderate' as RiskLevel, label: 'Low-to-intermediate risk', interpretation: 'ORBI 8–10: low-to-intermediate risk (~6.6% derivation, 10.6% validation). Consider enhanced monitoring.' },
        { max: 12, level: 'high' as RiskLevel, label: 'Intermediate-to-high risk', interpretation: 'ORBI 11–12: intermediate-to-high risk (~11.7% derivation, 18.1% validation). Higher-level care (stepdown/ICU) and hemodynamic surveillance are reasonable.' },
        { max: Infinity, level: 'critical' as RiskLevel, label: 'High risk', interpretation: 'ORBI ≥13: high risk (~31.8% derivation, 34.1% validation). Plan ICU-level monitoring, early shock-team/advanced HF involvement, and preemptive MCS/vasopressor pathways.' },
      ]);
      return {
        score,
        unit: 'points',
        label,
        interpretation,
        riskLevel,
        details: [{ label: 'Band', value: label }],
        recommendations: [
          'Score applies after primary PCI — it incorporates post-procedural TIMI flow and culprit anatomy.',
          'A low score does not exclude later shock; escalate promptly if hemodynamics deteriorate.',
          'Use alongside (not instead of) early mortality scores such as TIMI or GRACE.',
        ],
      };
    },
    evidence: {
      summary:
        'ORBI was derived from 6,838 STEMI patients without shock on admission undergoing primary PCI in the Brittany ORBI registry and externally validated in 2,208 RICO patients. Eleven weighted items stratify four risk categories for in-hospital cardiogenic shock.',
      formula:
        'Age >70 (+2), prior stroke/TIA (+2), cardiac arrest (+3), anterior MI (+1), FMC-to-PCI >90 min (+2), Killip II (+2)/III (+6), HR >90 (+3), SBP <125 & PP <45 mmHg (+4), glucose >10 mmol/L (+3), LM culprit (+5), post-PCI TIMI <3 (+5). Bands: 0–7 low, 8–10 low-intermediate, 11–12 intermediate-high, ≥13 high.',
      validation:
        'Observed in-hospital CS 1.3%/6.6%/11.7%/31.8% across bands (derivation) and 3.1%/10.6%/18.1%/34.1% (RICO validation); c-statistic 0.84/0.80.',
      references: [
        {
          title: 'Predicting the development of in-hospital cardiogenic shock in patients with ST-segment elevation myocardial infarction treated by primary percutaneous coronary intervention: the ORBI risk score',
          citation: 'Auffret V, Cottin Y, Leurent G, et al. Eur Heart J. 2018;39:2090-2102',
          year: 2018,
          pmid: '29554243',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score ≤7', actions: ['Routine post-PCI monitoring', 'Reassess on clinical change'] },
      { condition: 'Score 8–12', actions: ['Stepdown/ICU-level monitoring', 'Serial hemodynamic assessment', 'Caution with early beta-blocker/ACE-I in borderline patients'] },
      { condition: 'Score ≥13', actions: ['ICU admission', 'Early shock-team/advanced HF consultation', 'Pre-planned vasopressor/inotrope and MCS pathway', 'Strict urine output and perfusion monitoring'] },
    ],
    pearls: [
      'The score is computed post-PCI — its two heaviest items (LM culprit, TIMI <3) are angiographic.',
      'Killip IV patients already have shock; ORBI is for those who do not.',
      'Do not confuse with ORBIT (AF bleeding) or ORBIT-AF — entirely different tools.',
    ],
  },

  // ─── 6. Shanghai Score ─────────────────────────────────────────────────────
  {
    id: 'shanghai-brugada',
    name: 'Shanghai Score for Brugada Syndrome',
    shortName: 'Shanghai Score',
    description:
      'Consensus diagnostic score for Brugada syndrome combining ECG patterns, clinical history, family history, and genetic testing; only the highest-scoring item in each domain counts.',
    category: 'cardiology',
    tags: ['brugada', 'syncope', 'sudden death', 'ecg', 'shanghai', 'arrhythmia'],
    whenToUse: 'Evaluation of suspected Brugada syndrome when a type 1–3 Brugada ECG pattern or compatible clinical/family history is present.',
    whyUse:
      'Standardizes BrS diagnosis across ECG, clinical, family, and genetic domains; ≥3.5 = probable/definite BrS. Validated in the Okayama cohort.',
    inputs: [
      selectInput('ecg', 'ECG (12-lead/ambulatory) — highest applicable item', [
        { label: 'No Brugada ECG pattern', value: 0, points: 0 },
        { label: 'Type 2 or 3 pattern that converts to type 1 with provocative drug challenge', value: 2, points: 2 },
        { label: 'Fever-induced type 1 pattern at nominal or high leads', value: 3, points: 3 },
        { label: 'Spontaneous type 1 pattern at nominal or high leads', value: 3.5, points: 3.5 },
      ], 3.5, 'Only the single highest ECG item counts. Spontaneous type 1 (coved ST elevation ≥2 mm in ≥1 right precordial lead) scores 3.5.'),
      selectInput('clinical', 'Clinical history — highest applicable item', [
        { label: 'No clinical history', value: 0, points: 0 },
        { label: 'Atrial flutter/fibrillation in a patient <30 years without alternative etiology', value: 0.5, points: 0.5 },
        { label: 'Syncope of unclear mechanism/etiology', value: 1, points: 1 },
        { label: 'Suspected arrhythmic syncope', value: 2, points: 2 },
        { label: 'Nocturnal agonal respirations', value: 2, points: 2 },
        { label: 'Unexplained cardiac arrest or documented VF/polymorphic VT', value: 3, points: 3 },
      ], 0, 'Only the highest clinical-history item counts.'),
      selectInput('family', 'Family history — highest applicable item', [
        { label: 'No family history', value: 0, points: 0 },
        { label: 'Unexplained sudden death <45 yrs in 1st/2nd-degree relative with negative autopsy', value: 0.5, points: 0.5 },
        { label: 'Suspicious SCD (fever, nocturnal, Brugada-aggravating drugs) in 1st/2nd-degree relative', value: 1, points: 1 },
        { label: '1st/2nd-degree relative with definite Brugada syndrome', value: 2, points: 2 },
      ], 0, 'Only the highest family-history item counts.'),
      selectInput('genetic', 'Genetic test result', [
        { label: 'No pathogenic mutation in a BrS susceptibility gene (or not tested)', value: 0, points: 0 },
        { label: 'Probable pathogenic mutation in a BrS susceptibility gene (e.g., SCN5A)', value: 0.5, points: 0.5 },
      ], 0, 'A probable pathogenic variant adds 0.5 point; a negative or absent test does not exclude BrS.'),
    ],
    calculate(values) {
      const ecg = num(values.ecg);
      const score = ecg + num(values.clinical) + num(values.family) + num(values.genetic);
      let riskLevel: RiskLevel;
      let label: string;
      let interpretation: string;
      if (score >= 3.5 && ecg >= 3) {
        riskLevel = 'high';
        label = 'Probable/definite Brugada syndrome';
        interpretation = `Shanghai score ${score} (≥3.5 with a type 1 ECG pattern): probable/definite Brugada syndrome. Refer to a cardiologist/electrophysiologist for risk stratification and management.`;
      } else if (score >= 3.5) {
        riskLevel = 'moderate';
        label = 'Score ≥3.5 but no type 1 ECG pattern';
        interpretation = `Shanghai score ${score}: reaches the ≥3.5 threshold only through non-ECG domains. A type 1 Brugada ECG pattern (spontaneous, fever-, or drug-induced) is required for BrS diagnosis — consider a provocative drug challenge and expert review.`;
      } else if (score >= 2) {
        riskLevel = 'moderate';
        label = 'Possible Brugada syndrome';
        interpretation = `Shanghai score ${score} (2–3.4): possible BrS — not diagnostic. Consider drug challenge, high-lead ECGs, family screening, and specialist referral.`;
      } else {
        riskLevel = 'low';
        label = 'Non-diagnostic';
        interpretation = `Shanghai score ${score} (<2): does not support a BrS diagnosis. Evaluate alternative causes of the presentation.`;
      }
      return {
        score,
        unit: 'points',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'ECG domain', value: String(ecg) },
          { label: 'Clinical domain', value: String(num(values.clinical)) },
          { label: 'Family domain', value: String(num(values.family)) },
          { label: 'Genetic domain', value: String(num(values.genetic)) },
        ],
        recommendations: [
          'Treat fever promptly — fever is a common arrhythmia trigger in BrS.',
          'Avoid Brugada-aggravating drugs (see brugadadrugs.org list).',
          'Score is diagnostic, not prognostic — arrhythmic risk stratification is a separate exercise.',
        ],
      };
    },
    evidence: {
      summary:
        'The Shanghai Score was proposed by the 2016 HRS/EHRA/APHRS/SOLAECE J-Wave syndromes consensus. Four domains (ECG, clinical history, family history, genetics) each contribute only their single highest item. ≥3.5 = probable/definite BrS, 2–3.4 = possible, <2 = non-diagnostic.',
      formula: 'Sum of highest item in each of 4 domains (ECG ≤3.5, clinical ≤3, family ≤2, genetic ≤0.5)',
      validation:
        'Validated by Kawada et al. in 393 patients: no arrhythmic events occurred in possible/non-diagnostic patients during ~8-year follow-up; scores ≥3.5 correlated with VF risk. A type 1 ECG pattern is required for BrS diagnosis.',
      references: [
        {
          title: 'J-Wave syndromes expert consensus conference report: emerging concepts and gaps in knowledge',
          citation: 'Antzelevitch C, Yan GX, Ackerman MJ, et al. Heart Rhythm. 2016;13:e295-e324',
          year: 2016,
          pmid: '27423412',
          doi: '10.1016/j.hrthm.2016.07.024',
        },
        {
          title: 'Shanghai Score system for diagnosis of Brugada syndrome: validation of the score system and reclassification of the patients',
          citation: 'Kawada S, Morita H, Antzelevitch C, et al. JACC Clin Electrophysiol. 2018;4:724-730',
          year: 2018,
          pmid: '29929664',
          doi: '10.1016/j.jacep.2018.02.009',
        },
      ],
    },
    nextSteps: [
      { condition: 'Probable/definite BrS', actions: ['Electrophysiology referral', 'Arrhythmic risk stratification (symptoms, EPS, ECG markers)', 'Family screening and genetic counseling', 'ICD discussion if prior arrest/syncope of arrhythmic origin'] },
      { condition: 'Possible/non-diagnostic', actions: ['Consider procainamide/ajmaline/flecainide challenge under monitoring', 'High right-precordial lead ECG', 'Reassess if new clinical events'] },
    ],
    pearls: [
      'Only the highest item per domain counts — do not sum multiple items within a domain.',
      'Drug-induced or fever-induced type 1 patterns score less than spontaneous and require supporting clinical criteria.',
      'A pathogenic variant alone (0.5) never establishes BrS — the ECG phenotype is required.',
    ],
  },

  // ─── 7. Gillmore staging (NAC) ─────────────────────────────────────────────
  {
    id: 'gillmore-attr-cm',
    name: 'Gillmore Staging System for ATTR-CM',
    shortName: 'Gillmore (NAC)',
    description:
      'UK National Amyloidosis Centre staging for transthyretin cardiac amyloidosis using NT-proBNP (>3000 pg/mL) and eGFR (<45 mL/min/1.73 m²) thresholds.',
    category: 'cardiology',
    tags: ['amyloidosis', 'attr', 'cardiomyopathy', 'staging', 'nt-probnp', 'heart failure'],
    whenToUse: 'Patients with confirmed transthyretin amyloid cardiomyopathy (wild-type or variant) at diagnosis to estimate prognosis.',
    whyUse:
      'Two routine biomarkers stratify median survival from ~69 to ~24 months; the system is widely adopted for counseling, treatment-intensity discussions, and trial stratification.',
    inputs: [
      numberInput('ntprobnp', 'NT-proBNP', { unit: 'pg/mL', min: 5, max: 100000, exampleValue: 2500, helpText: 'Threshold >3000 pg/mL scores one point toward higher stage. Use a value not drawn during acute decompensation if possible.' }),
      numberInput('egfr', 'eGFR', { unit: 'mL/min/1.73 m²', min: 5, max: 150, exampleValue: 60, helpText: 'Threshold <45 mL/min/1.73 m² scores one point toward higher stage.' }),
    ],
    calculate(values) {
      const nt = num(values.ntprobnp);
      const egfr = num(values.egfr);
      const points = (nt > 3000 ? 1 : 0) + (egfr < 45 ? 1 : 0);
      const stage = points === 0 ? 'I' : points === 1 ? 'II' : 'III';
      const medians: Record<string, string> = { I: '~69 months', II: '~47 months', III: '~24 months' };
      const { riskLevel, label } = riskFromThresholds(points, [
        { max: 0, level: 'low' as RiskLevel, label: 'Stage I', interpretation: '' },
        { max: 1, level: 'moderate' as RiskLevel, label: 'Stage II', interpretation: '' },
        { max: 2, level: 'high' as RiskLevel, label: 'Stage III', interpretation: '' },
      ]);
      return {
        score: `Stage ${stage}`,
        label,
        interpretation: `NAC/Gillmore Stage ${stage} (${points} of 2 abnormal: NT-proBNP ${nt > 3000 ? '>' : '≤'}3000 pg/mL, eGFR ${egfr < 45 ? '<' : '≥'}45). Estimated median survival ${medians[stage]} in the derivation cohort.`,
        riskLevel,
        details: [
          { label: 'NT-proBNP >3000 pg/mL', value: nt > 3000 ? 'Yes' : 'No' },
          { label: 'eGFR <45 mL/min/1.73 m²', value: egfr < 45 ? 'Yes' : 'No' },
          { label: 'Median survival (derivation)', value: medians[stage] },
        ],
        recommendations: [
          'Confirm ATTR subtype (TTR genetic testing for hereditary vs wild-type).',
          'Discuss disease-modifying therapy (e.g., tafamidis/stabilizers, silencers where available) — benefit is greatest in earlier stages.',
          'Stage III patients have less proven benefit from stabilizer therapy and higher palliative-care needs.',
        ],
      };
    },
    evidence: {
      summary:
        'Gillmore et al. derived a three-stage system at the UK National Amyloidosis Centre: Stage I = neither threshold exceeded; II = one; III = both (NT-proBNP >3000 pg/mL and eGFR <45). Median survival was 69.2, 46.7, and 24.1 months respectively.',
      formula: 'Stage = count of abnormal biomarkers (0–2) among NT-proBNP >3000 pg/mL and eGFR <45',
      validation:
        'Derived in 869 ATTR-CM patients and validated externally; staging predicts survival in both wild-type and hereditary ATTR-CM and retains prognostic value in the tafamidis era.',
      references: [
        {
          title: 'A new staging system for cardiac transthyretin amyloidosis',
          citation: 'Gillmore JD, Damy T, Fontana M, et al. Eur Heart J. 2018;39:2799-2806',
          year: 2018,
          pmid: '29048471',
          doi: '10.1093/eurheartj/ehx628',
        },
      ],
    },
    nextSteps: [
      { condition: 'Stage I–II', actions: ['Initiate/continue disease-modifying therapy', 'Manage congestion (tolerated diuretics)', 'Surveillance biomarkers and imaging'] },
      { condition: 'Stage III', actions: ['Advanced HF/palliative input', 'Individualize disease-modifying therapy (reduced proven benefit)', 'Frequent reassessment'] },
    ],
    pearls: [
      'Stage I patients have the best outcomes and the most to gain from early therapy — do not delay treatment.',
      'NT-proBNP should ideally be measured in a compensated state; AKI acutely lowers eGFR and can misstage.',
      'Grogan (Mayo) staging is an alternative using troponin T instead of eGFR.',
    ],
  },

  // ─── 8. Grogan staging (Mayo) ──────────────────────────────────────────────
  {
    id: 'grogan-attr-cm',
    name: 'Grogan Staging System for ATTR-CM',
    shortName: 'Grogan (Mayo)',
    description:
      'Mayo Clinic staging for wild-type transthyretin cardiac amyloidosis using NT-proBNP (>3000 pg/mL) and troponin T (>0.05 ng/mL) thresholds.',
    category: 'cardiology',
    tags: ['amyloidosis', 'attr', 'wild-type', 'cardiomyopathy', 'troponin', 'staging'],
    whenToUse: 'Patients with wild-type ATTR cardiomyopathy at diagnosis for prognostic staging when troponin T is available.',
    whyUse:
      'The Mayo system complements Gillmore staging by using a cardiac injury marker (troponin T) instead of renal function; median survival differs markedly by stage.',
    inputs: [
      numberInput('ntprobnp', 'NT-proBNP', { unit: 'pg/mL', min: 5, max: 100000, exampleValue: 3200, helpText: 'Threshold >3000 pg/mL scores one point.' }),
      numberInput('tropT', 'Troponin T', { unit: 'ng/mL', min: 0, max: 10, step: 0.01, exampleValue: 0.04, helpText: 'Threshold >0.05 ng/mL (=50 ng/L) scores one point. Uses troponin T, not troponin I.' }),
    ],
    calculate(values) {
      const nt = num(values.ntprobnp);
      const trop = num(values.tropT);
      const points = (nt > 3000 ? 1 : 0) + (trop > 0.05 ? 1 : 0);
      const stage = points === 0 ? 'I' : points === 1 ? 'II' : 'III';
      const medians: Record<string, string> = { I: '~66 months', II: '~40 months', III: '~20 months' };
      const { riskLevel, label } = riskFromThresholds(points, [
        { max: 0, level: 'low' as RiskLevel, label: 'Stage I', interpretation: '' },
        { max: 1, level: 'moderate' as RiskLevel, label: 'Stage II', interpretation: '' },
        { max: 2, level: 'high' as RiskLevel, label: 'Stage III', interpretation: '' },
      ]);
      return {
        score: `Stage ${stage}`,
        label,
        interpretation: `Grogan/Mayo Stage ${stage} (${points} of 2 abnormal: NT-proBNP ${nt > 3000 ? '>' : '≤'}3000 pg/mL, troponin T ${trop > 0.05 ? '>' : '≤'}0.05 ng/mL). Median survival ${medians[stage]} in the derivation cohort.`,
        riskLevel,
        details: [
          { label: 'NT-proBNP >3000 pg/mL', value: nt > 3000 ? 'Yes' : 'No' },
          { label: 'Troponin T >0.05 ng/mL', value: trop > 0.05 ? 'Yes' : 'No' },
          { label: 'Median survival (derivation)', value: medians[stage] },
        ],
        recommendations: [
          'Derived in wild-type ATTR — the Gillmore system applies to both wild-type and variant disease.',
          'Initiate disease-modifying therapy early where indicated.',
        ],
      };
    },
    evidence: {
      summary:
        'Grogan et al. (Mayo Clinic) staged wild-type ATTR-CM by two biomarkers: Stage I = NT-proBNP ≤3000 pg/mL and troponin T ≤0.05 ng/mL; II = one abnormal; III = both abnormal. Median survival ~66, 40, and 20 months.',
      formula: 'Stage = count of abnormal biomarkers (0–2) among NT-proBNP >3000 pg/mL and troponin T >0.05 ng/mL',
      validation:
        'Derived from the Mayo Clinic wild-type ATTR-CM cohort (n≈130); subsequently compared and combined with NAC staging in larger cohorts.',
      references: [
        {
          title: 'Natural history of wild-type transthyretin cardiac amyloidosis and risk stratification using a novel staging system',
          citation: 'Grogan M, Scott CG, Kyle RA, et al. J Am Coll Cardiol. 2016;68:1014-1020',
          year: 2016,
          pmid: '27585501',
          doi: '10.1016/j.jacc.2016.06.033',
        },
      ],
    },
    nextSteps: [
      { condition: 'Stage I–II', actions: ['Disease-modifying therapy evaluation', 'Volume management', 'Periodic restaging'] },
      { condition: 'Stage III', actions: ['Advanced HF consultation', 'Goals-of-care discussion', 'Individualized therapy'] },
    ],
    pearls: [
      'Requires troponin T specifically — do not substitute troponin I.',
      'Renal dysfunction elevates troponin T; interpret in context.',
      'Mayo and NAC stages are frequently reported together in amyloid centers.',
    ],
  },

  // ─── 9. PRIMaCY ────────────────────────────────────────────────────────────
  {
    id: 'primacy-score',
    name: 'PRIMaCY Score (Precision Medicine for Cardiomyopathy)',
    shortName: 'PRIMaCY',
    status: 'educational',
    validationStatus: 'unverified',
    description:
      'Educational approximation of the PRIMaCY sudden cardiac death risk model for pediatric hypertrophic cardiomyopathy. The published model is a boosted penalized-spline competing-risk algorithm distributed only as a web tool; this implementation applies its published hazard ratios and qualitative nonlinear relationships.',
    category: 'cardiology',
    tags: ['hcm', 'pediatric', 'sudden cardiac death', 'scd', 'icd', 'primacy', 'cardiomyopathy'],
    whenToUse:
      'Educational exploration of PRIMaCY risk factors in children (<18 years at diagnosis) with primary HCM. For a numeric 5-year SCD estimate, use the official PRIMaCY calculator (primacycalculator.com).',
    whyUse:
      'PRIMaCY is the first externally validated pediatric-HCM SCD model in the published literature, incorporating pediatric-specific features — age at diagnosis, echo z-scores, LVOT gradient (inverse association above 100 mmHg), NSVT, syncope, and genotype.',
    inputs: [
      numberInput('ageDx', 'Age at diagnosis', { unit: 'years', min: 0, max: 18, step: 0.1, exampleValue: 10, helpText: 'Risk increased with age at diagnosis in the derivation cohort (nonlinear).' }),
      numberInput('ivsdZ', 'Max interventricular septal diameter z-score', { unit: 'z', min: -3, max: 15, step: 0.1, exampleValue: 4, helpText: 'BSA-adjusted z-score from the echo report (e.g., Boston z-score). Higher z → higher modeled risk.' }),
      numberInput('lvpwdZ', 'Max LV posterior wall diameter z-score', { unit: 'z', min: -3, max: 15, step: 0.1, exampleValue: 3, helpText: 'BSA-adjusted z-score from the echo report. Higher z → higher modeled risk.' }),
      numberInput('laZ', 'Left atrial diameter z-score (end systole)', { unit: 'z', min: -3, max: 15, step: 0.1, exampleValue: 2, helpText: 'LA diameter z-score at end systole (parasternal long axis). Higher z → higher modeled risk.' }),
      numberInput('lvot', 'Peak LV outflow tract gradient', { unit: 'mmHg', min: 0, max: 250, exampleValue: 30, helpText: 'Resting/provoked peak LVOT gradient. In the model, risk is flat ≤100 mmHg and INVERSELY associated above 100 mmHg — unlike in adults.' }),
      yesNo('nsvt', 'Nonsustained VT in prior 6 months', null, '≥3 consecutive ventricular beats >120 bpm lasting <30 s on monitor — HR ≈2.6 in the clinical/genetic model.', false),
      yesNo('syncope', 'Unexplained syncope in prior 6 months', null, 'Unexplained syncope — HR ≈7.2, the strongest categorical predictor.', false),
      selectInput('genotype', 'Genotype status', [
        { label: 'Not tested', value: 'unknown' },
        { label: 'Tested — no pathogenic variant found', value: 'negative' },
        { label: 'Tested — pathogenic/likely pathogenic variant', value: 'positive' },
      ], 'unknown', 'A causal variant modestly raised risk vs confirmed-negative testing (HR ≈1.3). Untested patients are handled separately by the model.'),
    ],
    calculate(values) {
      const age = num(values.ageDx, 10);
      const ivsd = num(values.ivsdZ);
      const lvpw = num(values.lvpwdZ);
      const la = num(values.laZ);
      const lvot = num(values.lvot);
      const nsvt = bool(values.nsvt);
      const sync = bool(values.syncope);
      const geno = str(values.genotype, 'unknown');
      // Educational approximation: published ln(HR) for categorical predictors;
      // disclosed approximate weights for the published nonlinear continuous effects.
      const pi =
        Math.log(2.58) * (nsvt ? 1 : 0) +
        Math.log(7.23) * (sync ? 1 : 0) +
        Math.log(1.32) * (geno === 'positive' ? 1 : 0) +
        0.05 * (age - 10) +
        0.25 * ivsd +
        0.20 * lvpw +
        0.15 * la +
        (lvot > 100 ? -0.01 * (lvot - 100) : 0);
      const { riskLevel, label } = riskFromThresholds(pi, [
        { max: 0.8, level: 'low' as RiskLevel, label: 'Lower weighted risk burden', interpretation: '' },
        { max: 2.0, level: 'moderate' as RiskLevel, label: 'Intermediate weighted risk burden', interpretation: '' },
        { max: Infinity, level: 'high' as RiskLevel, label: 'Higher weighted risk burden', interpretation: '' },
      ]);
      const drivers: string[] = [];
      if (sync) drivers.push('unexplained syncope (strongest predictor)');
      if (nsvt) drivers.push('NSVT');
      if (geno === 'positive') drivers.push('pathogenic variant');
      if (ivsd >= 6 || lvpw >= 6) drivers.push('massive hypertrophy (z ≥6)');
      if (la >= 3) drivers.push('LA enlargement');
      if (lvot > 100) drivers.push('LVOT gradient >100 (inverse association in this model)');
      return {
        score: round(pi, 2),
        unit: 'weighted index',
        label,
        interpretation:
          `Educational risk-factor index ${round(pi, 2)} — NOT the published PRIMaCY percentage. ` +
          (drivers.length ? `Main drivers: ${drivers.join('; ')}. ` : 'No major categorical drivers. ') +
          'Obtain the exact 5-year SCD probability from the official PRIMaCY calculator for ICD shared decision-making.',
        riskLevel,
        details: [
          { label: 'Approx. index', value: String(round(pi, 2)) },
          { label: 'Categorical predictors', value: [sync && 'syncope', nsvt && 'NSVT', geno === 'positive' && 'genotype+'].filter(Boolean).join(', ') || 'None' },
          { label: 'Z-scores (IVS / LVPW / LA)', value: `${ivsd} / ${lvpw} / ${la}` },
          { label: 'Published model tertiles (derivation)', value: '<4.7% / 4.7–8.3% / >8.3% 5-year SCD' },
        ],
        recommendations: [
          'Use the official PRIMaCY tool for the numeric estimate before ICD discussions.',
          'Do not base ICD decisions on a single factor — combine model output with clinical judgment and family preference.',
          'Treat modifiable contributors (e.g., myectomy for obstruction) on their own merits.',
        ],
      };
    },
    evidence: {
      summary:
        'PRIMaCY (Miron et al., Circulation 2020) is a competing-risk, model-boosted cause-specific hazard model for 5-year SCD in childhood-onset HCM. Categorical effects: NSVT HR 2.58, unexplained syncope HR 7.23, pathogenic variant HR 1.32; continuous predictors (age at diagnosis, IVSD/LVPWD/LA z-scores, LVOT gradient) enter as penalized b-splines — LVOT risk is flat ≤100 mmHg and falls above 100.',
      formula: 'Boosted cause-specific hazard model — no closed-form published equation; this implementation approximates PI with ln(HR) weights plus disclosed linear continuous terms.',
      validation:
        'Derivation c-statistic 0.75–0.76; SHaRe external validation 0.71–0.72. Independent validation (europace 2024) found lower discrimination (0.66) and calibration — reinforcing that only the official model should drive ICD decisions.',
      references: [
        {
          title: 'A validated model for sudden cardiac death risk prediction in pediatric hypertrophic cardiomyopathy',
          citation: 'Miron A, Lafreniere-Roula M, Steve Fan CP, et al. Circulation. 2020;142:217-229',
          year: 2020,
          pmid: '32418493',
          doi: '10.1161/CIRCULATIONAHA.120.047235',
        },
      ],
    },
    nextSteps: [
      { condition: 'Any high-burden features (syncope, NSVT, extreme z-scores)', actions: ['Compute official PRIMaCY estimate', 'Pediatric cardiomyopathy/EP review', 'Discuss ICD risks/benefits with shared decision-making'] },
      { condition: 'Lower burden', actions: ['Periodic reassessment (annually or with clinical change)', 'Continue guideline surveillance echo/Holter'] },
    ],
    pearls: [
      'LVOT obstruction is NOT a risk amplifier in the pediatric model — risk falls above 100 mmHg, opposite to adult intuition.',
      'Family history of SCD had no independent association in PRIMaCY — do not add points for it.',
      'Echo z-scores (Boston system) are standard on pediatric reports; use them rather than raw millimeters.',
    ],
  },

  // ─── 10. CPES ──────────────────────────────────────────────────────────────
  {
    id: 'cpes-score',
    name: 'Composite Pulmonary Embolism Shock (CPES) Score',
    shortName: 'CPES',
    description:
      'Six-item score identifying normotensive shock (depressed cardiac index despite preserved blood pressure) in intermediate-risk pulmonary embolism.',
    category: 'pulmonary',
    tags: ['pulmonary embolism', 'pe', 'normotensive shock', 'rv strain', 'cpes', 'flash'],
    whenToUse: 'Intermediate-risk (hemodynamically stable) acute PE when assessing for occult hypoperfusion/normotensive shock and the need for escalation.',
    whyUse:
      'Over one-third of intermediate-risk PE patients in FLASH had normotensive shock; CPES stratifies this risk (0% at score 0 to 58% at score 6) and predicts adverse in-hospital outcomes.',
    inputs: [
      yesNo('troponin', 'Elevated troponin', 1, 'Troponin above the assay upper reference limit — marker of RV ischemia/injury.', false),
      yesNo('bnp', 'Elevated BNP', 1, 'BNP or NT-proBNP above the institutional cutoff — marker of RV wall stress.', false),
      yesNo('rvDysfxn', 'Moderate or severe RV dysfunction', 1, 'Moderate-to-severe right ventricular dysfunction on echocardiography or CT.', false),
      yesNo('saddle', 'Saddle PE location', 1, 'Thrombus straddling the pulmonary artery bifurcation — central thrombus burden.', false),
      yesNo('dvt', 'Concomitant DVT', 1, 'Concurrent deep vein thrombosis — potential for additional embolization.', false),
      yesNo('tachy', 'Tachycardia ≥100 beats/min', 1, 'Heart rate ≥100/min — marker of cardiovascular compensation.', false),
    ],
    calculate(values) {
      const score =
        (bool(values.troponin) ? 1 : 0) + (bool(values.bnp) ? 1 : 0) + (bool(values.rvDysfxn) ? 1 : 0) +
        (bool(values.saddle) ? 1 : 0) + (bool(values.dvt) ? 1 : 0) + (bool(values.tachy) ? 1 : 0);
      const { riskLevel, label, interpretation } = riskFromThresholds(score, [
        { max: 0, level: 'low' as RiskLevel, label: 'Lowest risk', interpretation: 'CPES 0: normotensive shock was not observed (0%) in the FLASH derivation. Standard anticoagulation and monitoring.' },
        { max: 2, level: 'moderate' as RiskLevel, label: 'Lower-intermediate risk', interpretation: 'CPES 1–2: below the ≥3 high-risk cutoff; continue standard management with monitoring for deterioration.' },
        { max: 5, level: 'high' as RiskLevel, label: 'High risk (≥3)', interpretation: 'CPES ≥3: high risk — associated with markedly worse in-hospital outcomes (22% vs 2.4% composite of death/arrest/decompensation). Consider ICU/stepdown monitoring, RV reassessment, and early PERT involvement.' },
        { max: Infinity, level: 'critical' as RiskLevel, label: 'Highest risk (6)', interpretation: 'CPES 6: 58% normotensive shock prevalence in FLASH — strong consideration for advanced reperfusion therapy evaluation.' },
      ]);
      return {
        score,
        unit: 'points',
        label,
        interpretation,
        riskLevel,
        details: [{ label: 'Items present', value: `${score} of 6` }],
        recommendations: [
          'Score does not diagnose shock — it estimates probability of reduced cardiac index despite normal BP.',
          'Escalate monitoring for lactate, worsening tachycardia, hypoxia, and end-organ hypoperfusion.',
          'In high scores, consider catheter-directed intervention or mechanical thrombectomy evaluation if RV dysfunction worsens.',
        ],
      };
    },
    evidence: {
      summary:
        'CPES prespecifies six equally weighted items (troponin, BNP, RV dysfunction, saddle PE, DVT, tachycardia ≥100). In the FLASH registry, normotensive shock (CI ≤2.2 with hypoperfusion despite SBP ≥90) prevalence rose from 0% at score 0 to 58.3% at score 6.',
      formula: 'Sum of 6 dichotomous items (0–6); high ≥3',
      validation:
        'Derived in FLASH (n=384 intermediate-risk PE); independently validated in thrombectomy cohorts and linked to adverse in-hospital outcomes (aHR 1.81/point; ≥3 vs <3 aHR 6.48).',
      references: [
        {
          title: 'Prevalence and predictors of cardiogenic shock in intermediate-risk pulmonary embolism: insights from the FLASH registry',
          citation: 'Bangalore S, Horowitz JM, Beam DM, et al. JACC Cardiovasc Interv. 2023;16:958-972',
          year: 2023,
          doi: '10.1016/j.jcin.2023.02.004',
        },
        {
          title: 'Composite Pulmonary Embolism Shock Score and risk of adverse outcomes in patients with pulmonary embolism',
          citation: 'Zhang RS, Yuriditsky E, Zhang P, et al. Circ Cardiovasc Interv. 2024;17:e014088',
          year: 2024,
          doi: '10.1161/CIRCINTERVENTIONS.124.014088',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score <3', actions: ['Standard anticoagulation', 'Routine monitoring', 'Reassess on deterioration'] },
      { condition: 'Score ≥3', actions: ['Stepdown/ICU monitoring', 'Repeat RV assessment', 'Early PERT/interventional consultation', 'Prepare escalation pathway (CDT/mechanical thrombectomy)'] },
    ],
    pearls: [
      'Apply only to hemodynamically stable (intermediate-risk) PE — overt hypotension is already high-risk.',
      'A saddle PE on CT is anatomic, not hemodynamic — combine with RV assessment.',
      'All items weight equally; a single biomarker abnormality alone yields a low score.',
    ],
  },

  // ─── 11. PE-SARD ───────────────────────────────────────────────────────────
  {
    id: 'pe-sard',
    name: 'PE-SARD Score (PE Syncope-Anemia-Renal Dysfunction)',
    shortName: 'PE-SARD',
    description:
      'Three-item score estimating early (in-hospital) major bleeding risk in acute pulmonary embolism: syncope +1.5, anemia +2.5, renal dysfunction +1.',
    category: 'pulmonary',
    tags: ['pulmonary embolism', 'bleeding', 'pe-sard', 'anticoagulation', 'thrombolysis'],
    whenToUse: 'Acute PE at presentation when estimating early major bleeding risk before choosing anticoagulation and reperfusion strategies.',
    whyUse:
      'Simple 3-item score outperformed VTE-BLEED, RIETE, and BACS for early major bleeding in the derivation cohort and supports choosing between systemic thrombolysis and catheter-based/surgical options.',
    inputs: [
      yesNo('anemia', 'Anemia (hemoglobin <12 g/dL)', 2.5, 'Baseline hemoglobin below 12 g/dL — the heaviest item (+2.5).', false),
      yesNo('syncope', 'Syncope', 1.5, 'Syncope at PE presentation (+1.5).', false),
      yesNo('renal', 'Renal dysfunction (eGFR <60 mL/min)', 1, 'eGFR below 60 mL/min at presentation (+1).', false),
    ],
    calculate(values) {
      const score = (bool(values.anemia) ? 2.5 : 0) + (bool(values.syncope) ? 1.5 : 0) + (bool(values.renal) ? 1 : 0);
      const { riskLevel, label, interpretation } = riskFromThresholds(score, [
        { max: 0, level: 'low' as RiskLevel, label: 'Low bleeding risk', interpretation: 'PE-SARD 0: low early major-bleeding risk (~1% observed). Proceed with guideline-concordant anticoagulation ± reperfusion.' },
        { max: 2.5, level: 'moderate' as RiskLevel, label: 'Intermediate bleeding risk', interpretation: 'PE-SARD 1–2.5: intermediate risk. Address modifiable factors and monitor closely.' },
        { max: Infinity, level: 'high' as RiskLevel, label: 'High bleeding risk', interpretation: 'PE-SARD >2.5: high risk (~9% early major bleeding in derivation). Favor lower-bleeding-risk anticoagulants, catheter-based/surgical reperfusion over systemic lysis, and IVC filter if anticoagulation is contraindicated.' },
      ]);
      return {
        score,
        unit: 'points',
        label,
        interpretation,
        riskLevel,
        details: [{ label: 'Score', value: `${score} of 5` }],
        recommendations: [
          'Review antiplatelet/NSAID co-therapy.',
          'Prefer LMWH/DOAC over UFH where bleeding concern is high.',
          'If reperfusion is needed in a high-risk patient, consider catheter-directed or surgical routes rather than systemic thrombolysis.',
        ],
      };
    },
    evidence: {
      summary:
        'Derived from a 2,754-patient multicenter prospective PE registry: syncope (+1.5), anemia Hgb <12 (+2.5), renal dysfunction eGFR <60 (+1). Bands: 0 low (~1% bleeding), 1–2.5 intermediate, >2.5 high (~9%).',
      formula: 'Syncope 1.5 + anemia 2.5 + renal dysfunction 1.0 (0–5); low 0, intermediate 1–2.5, high >2.5',
      validation:
        'C-index 0.74 with internal bootstrap validation; outperformed VTE-BLEED, RIETE, and BACS. External validation in a Swiss ≥65 cohort showed weaker discrimination (AUC 0.52–0.60) — transportability to older populations is uncertain.',
      references: [
        {
          title: 'An original risk score to predict early major bleeding in acute pulmonary embolism: the Syncope, Anemia, Renal Dysfunction (PE-SARD) bleeding score',
          citation: 'Chopard R, Piazza G, Falvo N, et al. Chest. 2021;160:1832-1843',
          year: 2021,
          doi: '10.1016/j.chest.2021.06.048',
        },
      ],
    },
    nextSteps: [
      { condition: 'Low risk (0)', actions: ['Standard anticoagulation ± reperfusion per guideline'] },
      { condition: 'Intermediate (1–2.5)', actions: ['Correct modifiable bleeding factors', 'Closer monitoring'] },
      { condition: 'High (>2.5)', actions: ['Prefer LMWH/DOAC', 'Catheter-based or surgical reperfusion over systemic lysis', 'Consider IVC filter if anticoagulation unsafe'] },
    ],
    pearls: [
      'Syncope marks early bleeding risk in this score — an unusual but validated predictor.',
      'Only three items; it supplements, not replaces, full bleeding assessment.',
      'External validation in elderly patients was weaker — use extra caution above 65.',
    ],
  },

  // ─── 12. PAPi ──────────────────────────────────────────────────────────────
  {
    id: 'papi',
    name: 'Pulmonary Artery Pulsatility Index (PAPi)',
    shortName: 'PAPi',
    description:
      'Invasive hemodynamic index of right ventricular function: PAPi = (PA systolic − PA diastolic) / right atrial pressure. Used in acute inferior MI, cardiogenic shock, and LVAD evaluation.',
    category: 'cardiology',
    tags: ['papi', 'right ventricle', 'rv failure', 'cardiogenic shock', 'lvad', 'hemodynamics', 'pulmonary artery'],
    whenToUse: 'When right-heart catheterization data are available to quantify RV function — e.g., inferior MI with suspected RV involvement, cardiogenic shock phenotyping, or LVAD candidacy.',
    whyUse:
      'PAPi distills PA pulse pressure relative to RAP into a single RV-performance index; low values consistently flag severe RV dysfunction across populations.',
    inputs: [
      numberInput('pasp', 'PA systolic pressure (PASP)', { unit: 'mm Hg', min: 5, max: 150, exampleValue: 35, helpText: 'Pulmonary artery systolic pressure from right-heart catheterization.' }),
      numberInput('padp', 'PA diastolic pressure (PADP)', { unit: 'mm Hg', min: 0, max: 100, exampleValue: 18, helpText: 'Pulmonary artery diastolic pressure.' }),
      numberInput('rap', 'Right atrial pressure (RAP)', { unit: 'mm Hg', min: 0, max: 50, exampleValue: 12, helpText: 'Mean right atrial (central venous) pressure; must be >0 to compute.' }),
    ],
    calculate(values) {
      const pasp = num(values.pasp);
      const padp = num(values.padp);
      const rap = num(values.rap);
      if (rap <= 0) {
        return {
          score: '—',
          label: 'Invalid inputs',
          interpretation: 'Right atrial pressure must be >0 mmHg to compute PAPi.',
          riskLevel: 'info',
          details: [],
        };
      }
      const papi = round((pasp - padp) / rap, 2);
      const { riskLevel, label, interpretation } = riskFromThresholds(papi, [
        { max: 1, level: 'critical' as RiskLevel, label: 'Severe RV dysfunction', interpretation: 'PAPi <1.0: consistently associated with severe RV dysfunction and high adverse-outcome risk — consider escalation (inotropes, pulmonary vasodilators, MCS) in the appropriate context.' },
        { max: 2, level: 'high' as RiskLevel, label: 'Possible RV dysfunction', interpretation: 'PAPi 1.0–2.0: possible RV dysfunction. In LVAD cohorts PAPi <1.85 predicted post-LVAD RV failure; in inferior MI, <0.9 flagged severe RV involvement. Optimize preload/afterload and monitor closely.' },
        { max: Infinity, level: 'low' as RiskLevel, label: 'Lower-risk range', interpretation: 'PAPi >2.0: generally associated with lower risk of severe RV failure — does not exclude adverse outcomes; interpret with the full hemodynamic picture.' },
      ]);
      return {
        score: papi,
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'PA pulse pressure', value: `${pasp - padp} mmHg` },
          { label: 'PAPi', value: String(papi) },
        ],
        recommendations: [
          'Thresholds are population- and context-dependent — apply LVAD, shock, or MI-specific literature cutoffs.',
          'Integrate with RAP/PCWP ratio, cardiac index, and mixed venous saturation.',
          'Reassess after interventions; trends are often more useful than a single value.',
        ],
      };
    },
    evidence: {
      summary: 'PAPi = (PASP − PADP)/RAP. Originally derived in acute inferior MI (PAPi <0.9 predicted severe RV dysfunction) and extended to LVAD evaluation (<1.85 predicted post-implant RV failure) and cardiogenic shock cohorts.',
      formula: 'PAPi = (PA systolic − PA diastolic) / right atrial pressure',
      validation:
        'Validated across inferior-MI, LVAD, heart-failure, and cardiogenic-shock populations; absolute cutoffs vary by cohort, so fixed universal thresholds are discouraged.',
      references: [
        {
          title: 'The pulmonary artery pulsatility index identifies severe right ventricular dysfunction in acute inferior myocardial infarction',
          citation: 'Korabathina R, Heffernan KS, Paruchuri V, et al. Catheter Cardiovasc Interv. 2012;80:593-600',
          year: 2012,
          doi: '10.1002/ccd.23309',
        },
        {
          title: 'Pulmonary artery pulsatility index predicts right ventricular failure after left ventricular assist device implantation',
          citation: 'Kang G, Ha R, Banerjee D. J Heart Lung Transplant. 2016;35:67-73',
          year: 2016,
          doi: '10.1016/j.healun.2015.06.009',
        },
      ],
    },
    nextSteps: [
      { condition: 'PAPi <1.0', actions: ['Urgent RV-failure evaluation', 'Optimize preload/afterload/contractility', 'Consider inotropes, pulmonary vasodilators, or MCS', 'Advanced HF/shock-team consultation'] },
      { condition: 'PAPi 1.0–2.0', actions: ['Close hemodynamic monitoring', 'Targeted optimization', 'Repeat measurements after intervention'] },
      { condition: 'PAPi >2.0', actions: ['Standard hemodynamic management', 'Reassess if clinical status changes'] },
    ],
    pearls: [
      'PAPi requires an accurate RAP — transduce and zero the catheter carefully.',
      'In inferior MI, the classic derivation cutoff was <0.9; LVAD literature uses ~1.85.',
      'A rising PAPi after diuresis/inotrope adjustment often tracks with RV recovery.',
    ],
  },

  // ─── 13. NRPE ──────────────────────────────────────────────────────────────
  {
    id: 'nrpe',
    name: 'Natriuretic Response Prediction Equation (NRPE)',
    shortName: 'NRPE',
    description:
      'Predicts cumulative 6-hour sodium output after an IV loop diuretic dose using a spot urine sample (1–2 h post-dose): eGFR×(BSA/1.73)×(serum Cr/urine Cr)×60×3.25×(urine Na/1000).',
    category: 'nephrology',
    tags: ['diuretic', 'natriuresis', 'heart failure', 'urine sodium', 'nrpe', 'decongestion'],
    whenToUse: 'Acute decompensated heart failure after an IV loop diuretic dose to rapidly assess natriuretic response from a spot urine sample.',
    whyUse:
      'Predicts 6-hour sodium output within 1–2 hours of dosing (AUC ~0.95) — far faster than timed urine collections — enabling same-day diuretic titration.',
    inputs: [
      numberInput('egfr', 'eGFR', { unit: 'mL/min/1.73 m²', min: 5, max: 150, exampleValue: 45, helpText: 'BSA-indexed eGFR; the equation rescales it by BSA/1.73 to absolute GFR.' }),
      numberInput('height', 'Height', { unit: 'cm', min: 100, max: 230, exampleValue: 170, helpText: 'Used with weight to compute BSA (Mosteller).' }),
      numberInput('weight', 'Weight', { unit: 'kg', min: 30, max: 300, step: 0.5, exampleValue: 75, helpText: 'Used with height to compute BSA.' }),
      numberInput('scr', 'Serum creatinine', { unit: 'mg/dL', unitKind: 'creatinine', min: 0.1, max: 15, step: 0.01, exampleValue: 1.2, helpText: 'Serum creatinine at the time of the spot urine sample. The formula uses the serum/urine creatinine ratio, so any consistent units work.' }),
      numberInput('ucr', 'Urine creatinine (spot)', { unit: 'mg/dL', unitKind: 'creatinine', min: 5, max: 600, step: 1, exampleValue: 60, helpText: 'Creatinine concentration in the spot urine collected 1–2 h after the diuretic dose. (US mg/dL; if reported in µmol/L or mmol/L select the matching entry unit.)' }),
      numberInput('una', 'Urine sodium (spot)', { unit: 'mmol/L', min: 1, max: 300, exampleValue: 60, helpText: 'Spot urine sodium concentration 1–2 h after the diuretic dose.' }),
    ],
    calculate(values) {
      const egfr = num(values.egfr);
      const ht = num(values.height, 170);
      const wt = num(values.weight, 75);
      const scr = num(values.scr);
      const ucr = num(values.ucr);
      const una = num(values.una);
      if (ucr <= 0 || scr <= 0) {
        return {
          score: '—',
          label: 'Invalid inputs',
          interpretation: 'Serum and urine creatinine must be >0 to compute the NRPE.',
          riskLevel: 'info',
          details: [],
        };
      }
      const bsa = Math.sqrt((ht * wt) / 3600);
      const output = round(egfr * (bsa / 1.73) * (scr / ucr) * 60 * 3.25 * (una / 1000), 0);
      const { riskLevel, label, interpretation } = riskFromThresholds(output, [
        { max: 50, level: 'high' as RiskLevel, label: 'Poor natriuretic response', interpretation: 'Predicted 6-h Na output ≤50 mmol: poor response — twice-daily dosing at this response yields a positive sodium balance. Escalate dose or add sequential nephron blockade.' },
        { max: 100, level: 'moderate' as RiskLevel, label: 'Suboptimal response', interpretation: 'Predicted 6-h Na output 50–100 mmol: suboptimal — optimize dose/frequency or add a synergistic diuretic; reassess sodium intake.' },
        { max: Infinity, level: 'low' as RiskLevel, label: 'Excellent response', interpretation: 'Predicted 6-h Na output >100 mmol: excellent response — continue current regimen and monitor for over-diuresis and renal function.' },
      ]);
      return {
        score: output,
        unit: 'mmol Na⁺ (6 h)',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'BSA (Mosteller)', value: `${round(bsa, 2)} m²` },
          { label: 'Absolute GFR used', value: `${round(egfr * (bsa / 1.73), 1)} mL/min` },
          { label: 'Serum:urine creatinine ratio', value: String(round(scr / ucr, 3)) },
        ],
        recommendations: [
          'Collect the spot urine 1–2 h after the IV loop dose (bladder emptied at dosing).',
          'Poor response → escalate loop dose or add thiazide-type diuretic/acetazolamide; consider ultrafiltration if refractory.',
          'Recheck after each dose change — response is dose-specific.',
        ],
      };
    },
    evidence: {
      summary:
        'The NRPE multiplies instantaneous urine-formation rate (eGFR rescaled to BSA × serum/urine creatinine) by spot urine sodium and a 3.25-h constant to predict cumulative 6-hour sodium output after a loop diuretic.',
      formula: 'Na output (mmol) = eGFR × (BSA/1.73) × (SCr/UCr) × 60 min × 3.25 h × (UNa/1000)',
      validation:
        'Derivation correlation r=0.91 with measured output and AUC 0.95 for poor response (<50 mmol); prospectively validated (JACC 2021) and externally validated (ESC Heart Failure 2024).',
      references: [
        {
          title: 'Rapid and highly accurate prediction of poor loop diuretic natriuretic response in patients with heart failure',
          citation: 'Testani JM, Brisco MA, Turner JM, et al. Circ Heart Fail. 2016;9:e002370',
          year: 2016,
          doi: '10.1161/CIRCHEARTFAILURE.115.002370',
        },
        {
          title: 'Natriuretic equation to predict loop diuretic response in patients with heart failure',
          citation: 'Rao VS, Planavsky N, Hanberg JS, et al. J Am Coll Cardiol. 2021;77:623-635',
          year: 2021,
          doi: '10.1016/j.jacc.2020.12.022',
        },
      ],
    },
    nextSteps: [
      { condition: 'Poor response (≤50 mmol)', actions: ['Increase loop diuretic dose', 'Add sequential nephron blockade (thiazide-type)', 'Consider acetazolamide or ultrafiltration if refractory'] },
      { condition: 'Suboptimal (50–100 mmol)', actions: ['Adjust dose/frequency', 'Add synergistic diuretic', 'Reassess dietary sodium'] },
      { condition: 'Excellent (>100 mmol)', actions: ['Continue regimen', 'Monitor K⁺, Mg²⁺, renal function for over-diuresis'] },
    ],
    pearls: [
      'Urine creatinine and serum creatinine must share the same units — the ratio is unitless.',
      'Do not apply to non–loop-diuretic dosing or to chronic stable patients; it predicts response to a specific IV dose.',
      'A spot urine sodium <50–70 mmol/L soon after dosing is itself a strong poor-response signal.',
    ],
  },

  // ─── 14. Geneva VTE prophylaxis ────────────────────────────────────────────
  {
    id: 'geneva-vte-prophylaxis',
    name: 'Geneva Risk Score for VTE Prophylaxis',
    shortName: 'Geneva RAM',
    description:
      'Risk assessment model for hospitalized medical patients: eleven 2-point and eight 1-point risk factors; score ≥3 identifies patients who should receive thromboprophylaxis.',
    category: 'hematology',
    tags: ['vte', 'prophylaxis', 'geneva', 'medical inpatient', 'thromboprophylaxis', 'dvt', 'pe'],
    whenToUse: 'Acutely ill medical inpatients on admission (and when status changes) to decide on pharmacologic VTE prophylaxis.',
    whyUse:
      'In the prospective ESTIMATE cohort the Geneva score identified low-risk patients with 0.6% 90-day VTE (vs 3.2% in high risk), with higher sensitivity than IMPROVE or Padua for ruling out prophylaxis need.',
    inputs: [
      yesNo('cardiac', 'Cardiac failure', 2, 'Acute or decompensated chronic cardiac failure.', false),
      yesNo('resp', 'Respiratory failure', 2, 'Acute or decompensated respiratory failure.', false),
      yesNo('stroke', 'Recent stroke (<3 months)', 2, 'Ischemic or hemorrhagic stroke within 3 months.', false),
      yesNo('mi', 'Recent myocardial infarction (<4 weeks)', 2, 'MI within the last 4 weeks.', false),
      yesNo('infection', 'Acute infectious disease (incl. sepsis)', 2, 'Active infection including sepsis.', false),
      yesNo('rheumatic', 'Acute rheumatic disease', 2, 'Active rheumatologic/inflammatory disease flare.', false),
      yesNo('cancer', 'Active malignancy', 2, 'Active cancer (ongoing or under treatment).', false),
      yesNo('myeloprolif', 'Myeloproliferative syndrome', 2, 'e.g., polycythemia vera, essential thrombocythemia.', false),
      yesNo('nephrotic', 'Nephrotic syndrome', 2, 'Active nephrotic syndrome.', false),
      yesNo('priorVte', 'Any prior VTE', 2, 'Personal history of DVT or PE.', false),
      yesNo('hypercoag', 'Known hypercoagulable state', 2, 'Thrombophilia (e.g., antiphospholipid, factor V Leiden homozygous, protein C/S deficiency).', false),
      yesNo('immob', 'Immobilization ≥3 days (<30 min walking/day)', 1, 'Bed rest or markedly reduced mobility expected ≥3 days.', false),
      yesNo('travel', 'Recent travel >6 hours', 1, 'Long-haul travel in the recent period.', false),
      yesNo('age', 'Age >60 years', 1, 'Age over 60.', false),
      yesNo('bmi', 'BMI >30 kg/m²', 1, 'Obesity BMI >30.', false),
      yesNo('cvi', 'Chronic venous insufficiency', 1, 'e.g., significant varicose veins, post-thrombotic changes.', false),
      yesNo('preg', 'Pregnancy', 1, 'Current pregnancy or early postpartum.', false),
      yesNo('hormone', 'Hormonal therapy (contraceptive or replacement)', 1, 'Estrogen-containing therapy.', false),
      yesNo('dehydration', 'Dehydration', 1, 'Clinically significant dehydration.', false),
    ],
    calculate(values) {
      const two = ['cardiac', 'resp', 'stroke', 'mi', 'infection', 'rheumatic', 'cancer', 'myeloprolif', 'nephrotic', 'priorVte', 'hypercoag']
        .reduce((s, k) => s + (bool(values[k]) ? 2 : 0), 0);
      const one = ['immob', 'travel', 'age', 'bmi', 'cvi', 'preg', 'hormone', 'dehydration']
        .reduce((s, k) => s + (bool(values[k]) ? 1 : 0), 0);
      const score = two + one;
      const high = score >= 3;
      return {
        score,
        unit: 'points',
        label: high ? 'High risk — prophylaxis indicated' : 'Low risk — prophylaxis generally not indicated',
        interpretation: high
          ? `Geneva score ${score} ≥3: high VTE risk (≈3.2% symptomatic VTE/death at 90 days in ESTIMATE). Initiate pharmacologic prophylaxis after bleeding-risk review.`
          : `Geneva score ${score} <3: low VTE risk (≈0.6% at 90 days). Pharmacologic prophylaxis is generally not indicated — mobilize and reassess if status changes.`,
        riskLevel: high ? 'high' : 'low',
        details: [
          { label: '2-point factors present', value: String(two / 2) },
          { label: '1-point factors present', value: String(one) },
        ],
        recommendations: high
          ? [
              'Start LMWH/UFH prophylaxis after bleeding assessment.',
              'Early mobilization; mechanical prophylaxis if anticoagulation contraindicated.',
              'Reassess daily — new factors change the score.',
            ]
          : [
              'Early mobilization; reassess if clinical status changes.',
              'Mechanical measures only if clinically indicated.',
            ],
      };
    },
    evidence: {
      summary:
        'The Geneva RAM assigns 2 points to major medical risk factors (heart/respiratory failure, recent stroke or MI, acute infection/rheumatic disease, active cancer, myeloproliferative or nephrotic syndrome, prior VTE, thrombophilia) and 1 point to minor factors (immobilization, long travel, age >60, BMI >30, venous insufficiency, pregnancy, hormones, dehydration). ≥3 = high risk.',
      formula: 'Σ(2-point items) + Σ(1-point items); high risk ≥3',
      validation:
        'Prospectively validated in the 1,478-patient multicentre ESTIMATE cohort: 90-day VTE 3.2% (high) vs 0.6% (low); negative LR 0.28 — better rule-out performance than the Padua score.',
      references: [
        {
          title: 'Identifying acutely ill medical patients requiring thromboprophylaxis',
          citation: 'Chopard P, Spirk D, Bounameaux H. J Thromb Haemost. 2006;4:915-916',
          year: 2006,
          doi: '10.1111/j.1538-7836.2006.01818.x',
        },
        {
          title: 'Multicentre validation of the Geneva Risk Score for hospitalised medical patients at risk of venous thromboembolism (ESTIMATE)',
          citation: 'Nendaz M, Spirk D, Kucher N, et al. Thromb Haemost. 2014;112:1174-1179',
          year: 2014,
          doi: '10.1160/TH13-05-0427',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score ≥3', actions: ['Pharmacologic prophylaxis per protocol', 'Bleeding-risk check first', 'Mechanical prophylaxis if anticoagulation unsafe'] },
      { condition: 'Score <3', actions: ['Mobilization', 'Serial reassessment'] },
    ],
    pearls: [
      'Distinct from the (revised/original) Geneva scores used for PE diagnostic probability.',
      'Apply to medical inpatients — surgical patients need Caprini-type assessment.',
      'Always pair the VTE score with a bleeding-risk assessment (e.g., IMPROVE bleeding).',
    ],
  },

  // ─── 15. IMPEDE-VTE ────────────────────────────────────────────────────────
  {
    id: 'impede-vte',
    name: 'IMPEDE VTE Score',
    shortName: 'IMPEDE-VTE',
    description:
      'VTE risk score for patients with multiple myeloma starting chemotherapy, especially immunomodulatory (IMiD) therapy. Score ≥4 supports anticoagulant (rather than aspirin) thromboprophylaxis per NCCN.',
    category: 'hematology',
    tags: ['multiple myeloma', 'vte', 'thalidomide', 'lenalidomide', 'imid', 'impede', 'thromboprophylaxis'],
    whenToUse: 'Newly diagnosed multiple myeloma within ~6 months of starting systemic therapy, to choose aspirin vs anticoagulant prophylaxis.',
    whyUse:
      'Derived in 4,446 VA patients and externally validated in SEER-Medicare, IMPEDE-VTE outperformed IMWG/NCCN guideline risk stratification (c-statistic ~0.64–0.68).',
    inputs: [
      yesNo('imid', 'Immunomodulatory drug (IMiD) use', 4, 'Thalidomide, lenalidomide, or pomalidomide-containing regimen.', true),
      yesNo('bmi', 'BMI ≥25 kg/m²', 1, 'Body mass index ≥25.', false),
      yesNo('fracture', 'Pelvic, hip, or femur fracture', 4, 'Pathologic or traumatic fracture of pelvis, hip, or femur.', false),
      yesNo('esa', 'Erythropoiesis-stimulating agent', 1, 'Current or planned ESA use (e.g., epoetin, darbepoetin).', false),
      yesNo('doxo', 'Doxorubicin use', 3, 'Doxorubicin-containing regimen.', false),
      selectInput('dex', 'Dexamethasone use', [
        { label: 'None', value: 0, points: 0 },
        { label: 'Low dose', value: 2, points: 2 },
        { label: 'High dose', value: 4, points: 4 },
      ], 2, 'High-dose dexamethasone (e.g., 40 mg ×4 days/weekly schedules) scores 4; low dose scores 2.'),
      yesNo('asian', 'Asian / Pacific Islander ethnicity', null, 'Protective factor (−3 points) in the derivation cohort.', false),
      yesNo('vteHx', 'History of VTE before myeloma diagnosis', 5, 'Prior documented VTE — the heaviest positive item (+5).', false),
      yesNo('cvc', 'Tunneled line / central venous catheter', 2, 'Presence of a CVC or tunneled line.', false),
      selectInput('prophylaxis', 'Existing thromboprophylaxis', [
        { label: 'None', value: 0, points: 0 },
        { label: 'Prophylactic LMWH or aspirin', value: -3, points: -3 },
        { label: 'Therapeutic LMWH or warfarin', value: -4, points: -4 },
      ], 0, 'Existing anticoagulation lowers the score (protective terms).'),
    ],
    calculate(values) {
      const score =
        (bool(values.imid) ? 4 : 0) + (bool(values.bmi) ? 1 : 0) + (bool(values.fracture) ? 4 : 0) +
        (bool(values.esa) ? 1 : 0) + (bool(values.doxo) ? 3 : 0) + num(values.dex) +
        (bool(values.asian) ? -3 : 0) + (bool(values.vteHx) ? 5 : 0) + (bool(values.cvc) ? 2 : 0) +
        num(values.prophylaxis);
      const high = score >= 4;
      return {
        score,
        unit: 'points',
        label: high ? 'Higher VTE risk — anticoagulant prophylaxis' : 'Lower VTE risk — aspirin prophylaxis',
        interpretation: high
          ? `IMPEDE-VTE ${score} ≥4: NCCN-informed strategy favors anticoagulant thromboprophylaxis (e.g., enoxaparin 40 mg daily, rivaroxaban 10 mg daily, apixaban 2.5 mg BID, or warfarin INR 2–3) while on myeloma therapy.`
          : `IMPEDE-VTE ${score} ≤3: lower VTE risk — aspirin 81–325 mg daily is a reasonable prophylaxis option per NCCN-informed guidance.`,
        riskLevel: high ? 'high' : 'low',
        details: [{ label: 'Score', value: String(score) }],
        recommendations: [
          'Weigh bleeding risk before anticoagulant prophylaxis.',
          'Continue prophylaxis while on myeloma therapy; reassess with regimen changes.',
          'Earlier derivation/validation reports used slightly different integer weights — this implementation uses the final published score.',
        ],
      };
    },
    evidence: {
      summary:
        'IMPEDE-VTE (Sanfilippo et al., Am J Hematol 2019) assigns: IMiD +4, BMI ≥25 +1, pelvic/hip/femur fracture +4, ESA +1, doxorubicin +3, dexamethasone low +2/high +4, Asian race −3, prior VTE +5, CVC +2, prophylactic LMWH/aspirin −3, therapeutic anticoagulation −4. NCCN-informed cutoff: ≥4 → anticoagulant prophylaxis.',
      formula: 'Weighted sum (−7 to ~+28); ≥4 = higher risk',
      validation:
        'Derivation c-statistic 0.66 (VA registry), external validation 0.64 (SEER-Medicare) and 0.68 (Cleveland Clinic, 6-month VTE 5.0% low / 12.6% intermediate / 24.1% high).',
      references: [
        {
          title: 'Predicting venous thromboembolism in multiple myeloma: development and validation of the IMPEDE VTE score',
          citation: 'Sanfilippo KM, Luo S, Wang TF, et al. Am J Hematol. 2019;94:1176-1184',
          year: 2019,
          doi: '10.1002/ajh.25603',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score ≥4', actions: ['Anticoagulant thromboprophylaxis (LMWH, rivaroxaban, apixaban, or warfarin)', 'Bleeding review', 'Continue through IMiD therapy duration'] },
      { condition: 'Score ≤3', actions: ['Aspirin 81–325 mg daily', 'Reassess with regimen or status changes'] },
    ],
    pearls: [
      'IMiD exposure and prior VTE dominate the score — prior VTE (+5) alone crosses the anticoagulant threshold.',
      'Asian race is protective (−3) in this model, reflecting lower observed VTE rates.',
      'Do not confuse IMPEDE-VTE (myeloma) with IMPROVE/IMPROVEDD (general medical inpatients).',
    ],
  },

  // ─── 16. TRiP(cast) ────────────────────────────────────────────────────────
  {
    id: 'trip-cast',
    name: 'TRiP(cast) Score — Thrombosis Risk Prediction for Cast Immobilization',
    shortName: 'TRiP(cast)',
    description:
      'Predicts 3-month VTE risk in adults with lower-limb trauma requiring cast immobilization, combining trauma severity, immobilization type, and patient risk factors; ≥7 = high risk.',
    category: 'orthopedics',
    tags: ['vte', 'cast', 'immobilization', 'lower limb', 'trauma', 'trip', 'prophylaxis'],
    whenToUse: 'Adults with lower-limb trauma requiring cast/brace immobilization, to decide on thromboprophylaxis during immobilization.',
    whyUse:
      'Derived from three population-based case-control studies, TRiP(cast) separates low-risk patients (who can forgo prophylaxis) from those at ~2%+ 3-month VTE risk who merit LMWH.',
    inputs: [
      selectInput('trauma', 'Trauma severity (choose most severe)', [
        {
          label: 'Low-risk (single malleolar ankle fracture, patellar dislocation, (meta)tarsal/forefoot fracture, non-severe knee/ankle sprain grade 1–2, significant muscle injury)',
          value: 1, points: 1,
        },
        {
          label: 'Intermediate-risk (bi/trimalleolar ankle fracture, patellar fracture, ankle dislocation/Lisfranc, severe knee sprain with edema/hemarthrosis, severe ankle sprain grade 3)',
          value: 2, points: 2,
        },
        {
          label: 'High-risk (fibula and/or tibia shaft fracture, tibial plateau fracture, Achilles tendon rupture)',
          value: 3, points: 3,
        },
      ], 1, 'Score the most severe applicable injury.'),
      selectInput('immob', 'Immobilization type', [
        { label: 'Other cast or bracing with plantar support', value: 0, points: 0 },
        { label: 'Foot cast (ankle free) or semi-rigid without plantar support', value: 1, points: 1 },
        { label: 'Lower-leg cast', value: 2, points: 2 },
        { label: 'Upper-leg cast', value: 3, points: 3 },
      ], 2, 'More extensive immobilization scores higher.'),
      selectInput('age', 'Age', [
        { label: '<35 years', value: 0, points: 0 },
        { label: '≥35 and <55 years', value: 1, points: 1 },
        { label: '≥55 and <75 years', value: 2, points: 2 },
        { label: '≥75 years', value: 3, points: 3 },
      ], 0, 'Age band points.'),
      selectInput('sex', 'Sex', [
        { label: 'Female', value: 0, points: 0 },
        { label: 'Male', value: 1, points: 1 },
      ], 0, 'Male sex adds 1 point in this model.'),
      selectInput('bmi', 'BMI', [
        { label: '<25 kg/m²', value: 0, points: 0 },
        { label: '≥25 and <35 kg/m²', value: 1, points: 1 },
        { label: '≥35 kg/m²', value: 2, points: 2 },
      ], 0, 'BMI band points.'),
      yesNo('fhVte', 'Family history of VTE (first-degree relative)', 2, 'VTE in a first-degree relative.', false),
      yesNo('priorVte', 'Personal history of VTE or known major thrombophilia', 4, 'Prior DVT/PE or major thrombophilia — heaviest item (+4).', false),
      yesNo('hormone', 'Oral contraceptives or estrogenic hormone therapy', 4, 'Current estrogen-containing therapy (+4).', false),
      yesNo('cancer', 'Cancer diagnosis within past 5 years', 3, 'Active or recent malignancy.', false),
      yesNo('preg', 'Pregnancy or puerperium', 3, 'Current pregnancy or postpartum period.', false),
      yesNo('otherImmob', 'Other immobilization within past 3 months', 2, 'Hospital admission, bedridden status, flight >6 h, and/or lower-limb paralysis within 3 months.', false),
      yesNo('surgery', 'Surgery within past 3 months', 2, 'Any surgery within 3 months.', false),
      yesNo('comorbid', 'Comorbidity (HF, RA, CKD, COPD, and/or IBD)', 1, 'Heart failure, rheumatoid arthritis, chronic kidney disease, COPD, or inflammatory bowel disease.', false),
      yesNo('cvi', 'Chronic venous insufficiency (varicose veins)', 1, 'Varicose veins or chronic venous insufficiency.', false),
    ],
    calculate(values) {
      const score =
        num(values.trauma) + num(values.immob) + num(values.age) + num(values.sex) + num(values.bmi) +
        (bool(values.fhVte) ? 2 : 0) + (bool(values.priorVte) ? 4 : 0) + (bool(values.hormone) ? 4 : 0) +
        (bool(values.cancer) ? 3 : 0) + (bool(values.preg) ? 3 : 0) + (bool(values.otherImmob) ? 2 : 0) +
        (bool(values.surgery) ? 2 : 0) + (bool(values.comorbid) ? 1 : 0) + (bool(values.cvi) ? 1 : 0);
      const high = score >= 7;
      return {
        score,
        unit: 'points',
        label: high ? 'High VTE risk — consider thromboprophylaxis' : 'Lower VTE risk',
        interpretation: high
          ? `TRiP(cast) ${score} ≥7: high 3-month VTE risk — anticoagulant prophylaxis (e.g., LMWH) for the immobilization period can be considered after individualized risk-benefit discussion.`
          : `TRiP(cast) ${score} <7: lower 3-month VTE risk — routine prophylaxis is generally not required; mobilize as tolerated and reassess if factors change.`,
        riskLevel: high ? 'high' : 'low',
        details: [
          { label: 'Trauma/immobilization points', value: String(num(values.trauma) + num(values.immob)) },
          { label: 'Patient-factor points', value: String(score - num(values.trauma) - num(values.immob)) },
        ],
        recommendations: high
          ? [
              'Discuss LMWH prophylaxis for the immobilization duration.',
              'Review bleeding risk and patient preference.',
              'Reassess if immobilization type or duration changes.',
            ]
          : ['Encourage mobilization within immobilization limits', 'Reassess if additional risk factors emerge'],
      };
    },
    evidence: {
      summary:
        'L-TRiP(cast) was derived from three population-based case-control studies of lower-limb cast immobilization. Trauma severity (1–3), immobilization type (0–3), age (0–3), sex, BMI (0–2), and patient factors (prior VTE/thrombophilia +4, hormones +4, cancer +3, pregnancy +3, other immobilization +2, surgery +2, comorbidity +1, venous insufficiency +1, family history +2) sum to the score; ≥7 is high risk.',
      formula: 'Weighted sum (≥7 high risk for 3-month VTE)',
      validation:
        'Validated across the MEGA, MAPP, and POT-(K)CAST case-control studies; high-score patients had ~2%+ 3-month symptomatic VTE vs ~0.1–0.4% at low scores.',
      references: [
        {
          title: 'Venous thrombosis risk after cast immobilization of the lower extremity: derivation and validation of a clinical prediction score, L-TRiP(cast), in three population-based case-control studies',
          citation: 'Nemeth B, van Adrichem RA, van Hylckama Vlieg A, et al. PLoS Med. 2015;12:e1001899',
          year: 2015,
          pmid: '26555140',
          doi: '10.1371/journal.pmed.1001899',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score ≥7', actions: ['Consider LMWH for immobilization period', 'Shared decision-making', 'Reassess at cast changes'] },
      { condition: 'Score <7', actions: ['Mobilization as permitted', 'Education on VTE symptoms', 'Reassess if new risk factors'] },
    ],
    pearls: [
      'Choose the most severe applicable trauma — do not sum injuries.',
      'Upper-leg casts and high-risk injuries drive most of the injury-side points.',
      'Estrogen therapy and prior VTE/thrombophilia are the dominant patient-side items.',
    ],
  },

  // ─── 17. Villalta ──────────────────────────────────────────────────────────
  {
    id: 'villalta-pts',
    name: 'Villalta Score for Post-Thrombotic Syndrome',
    shortName: 'Villalta',
    description:
      'ISTH-adopted scale grading post-thrombotic syndrome after lower-extremity DVT: 5 symptoms + 6 clinical signs each scored 0–3, plus a venous-ulcer rule (ulcer → severe).',
    category: 'hematology',
    tags: ['pts', 'post-thrombotic syndrome', 'dvt', 'villalta', 'venous insufficiency', 'ulcer'],
    whenToUse: 'Follow-up of patients after lower-extremity DVT (typically ≥3–6 months) to diagnose and grade post-thrombotic syndrome severity.',
    whyUse:
      'Villalta is the ISTH-recommended clinical scale for PTS: standardized, reproducible grading that guides compression therapy, vascular referral, and ulcer management.',
    isQuestionnaire: true,
    inputs: [
      selectInput('pain', 'Symptom — pain', [
        { label: 'Absent', value: 0, points: 0 }, { label: 'Mild', value: 1, points: 1 }, { label: 'Moderate', value: 2, points: 2 }, { label: 'Severe', value: 3, points: 3 },
      ], 0, 'Patient-reported leg pain severity.'),
      selectInput('cramps', 'Symptom — cramps', [
        { label: 'Absent', value: 0, points: 0 }, { label: 'Mild', value: 1, points: 1 }, { label: 'Moderate', value: 2, points: 2 }, { label: 'Severe', value: 3, points: 3 },
      ], 0, 'Patient-reported cramping severity.'),
      selectInput('heaviness', 'Symptom — heaviness', [
        { label: 'Absent', value: 0, points: 0 }, { label: 'Mild', value: 1, points: 1 }, { label: 'Moderate', value: 2, points: 2 }, { label: 'Severe', value: 3, points: 3 },
      ], 0, 'Patient-reported leg heaviness severity.'),
      selectInput('paresthesia', 'Symptom — paresthesia', [
        { label: 'Absent', value: 0, points: 0 }, { label: 'Mild', value: 1, points: 1 }, { label: 'Moderate', value: 2, points: 2 }, { label: 'Severe', value: 3, points: 3 },
      ], 0, 'Patient-reported paresthesia severity.'),
      selectInput('pruritus', 'Symptom — pruritus', [
        { label: 'Absent', value: 0, points: 0 }, { label: 'Mild', value: 1, points: 1 }, { label: 'Moderate', value: 2, points: 2 }, { label: 'Severe', value: 3, points: 3 },
      ], 0, 'Patient-reported itching severity.'),
      selectInput('edema', 'Sign — pretibial edema', [
        { label: 'Absent', value: 0, points: 0 }, { label: 'Mild', value: 1, points: 1 }, { label: 'Moderate', value: 2, points: 2 }, { label: 'Severe', value: 3, points: 3 },
      ], 0, 'Clinician-graded pretibial edema.'),
      selectInput('induration', 'Sign — skin induration', [
        { label: 'Absent', value: 0, points: 0 }, { label: 'Mild', value: 1, points: 1 }, { label: 'Moderate', value: 2, points: 2 }, { label: 'Severe', value: 3, points: 3 },
      ], 0, 'Clinician-graded skin induration/lipodermatosclerosis.'),
      selectInput('pigment', 'Sign — hyperpigmentation', [
        { label: 'Absent', value: 0, points: 0 }, { label: 'Mild', value: 1, points: 1 }, { label: 'Moderate', value: 2, points: 2 }, { label: 'Severe', value: 3, points: 3 },
      ], 0, 'Clinician-graded hyperpigmentation.'),
      selectInput('redness', 'Sign — redness', [
        { label: 'Absent', value: 0, points: 0 }, { label: 'Mild', value: 1, points: 1 }, { label: 'Moderate', value: 2, points: 2 }, { label: 'Severe', value: 3, points: 3 },
      ], 0, 'Clinician-graded redness.'),
      selectInput('ectasia', 'Sign — venous ectasia', [
        { label: 'Absent', value: 0, points: 0 }, { label: 'Mild', value: 1, points: 1 }, { label: 'Moderate', value: 2, points: 2 }, { label: 'Severe', value: 3, points: 3 },
      ], 0, 'Clinician-graded venous ectasia.'),
      selectInput('calfPain', 'Sign — pain on calf compression', [
        { label: 'Absent', value: 0, points: 0 }, { label: 'Mild', value: 1, points: 1 }, { label: 'Moderate', value: 2, points: 2 }, { label: 'Severe', value: 3, points: 3 },
      ], 0, 'Clinician-graded pain elicited by calf compression.'),
      yesNo('ulcer', 'Venous ulcer present', null, 'If a venous ulcer is present and the summed score is <15, the score is assigned 15 (severe PTS).', false),
    ],
    calculate(values) {
      let total = ['pain', 'cramps', 'heaviness', 'paresthesia', 'pruritus', 'edema', 'induration', 'pigment', 'redness', 'ectasia', 'calfPain']
        .reduce((s, k) => s + num(values[k]), 0);
      const ulcer = bool(values.ulcer);
      const raw = total;
      if (ulcer && total < 15) total = 15;
      const { level, label, interpretation } = villaltaSeverity(total);
      return {
        score: total,
        unit: 'points',
        label,
        interpretation: ulcer ? `${interpretation} Venous ulcer present — assigned ≥15 by the Villalta rule.` : interpretation,
        riskLevel: level,
        details: [
          { label: 'Items subtotal', value: String(raw) },
          { label: 'Venous ulcer', value: ulcer ? 'Present (score set to ≥15)' : 'Absent' },
        ],
        recommendations: level === 'normal'
          ? ['Continue DVT follow-up; reassess if symptoms develop']
          : [
              'Elastic compression stockings for mild–moderate PTS.',
              'Leg elevation and activity modification.',
              'Vascular referral for moderate–severe or ulcerated disease.',
              'Wound care and infection surveillance for ulcers.',
            ],
      };
    },
    evidence: {
      summary:
        'The Villalta scale scores 5 symptoms (pain, cramps, heaviness, paresthesia, pruritus) and 6 signs (pretibial edema, skin induration, hyperpigmentation, redness, venous ectasia, pain on calf compression) each 0–3. PTS: ≥5; mild 5–9; moderate 10–14; severe ≥15 or any venous ulcer.',
      formula: 'Sum of 11 graded items; ulcer → minimum score 15',
      validation:
        'Adopted by the ISTH as the standard PTS measure; shows good inter-rater reliability and correlation with quality of life in prospective DVT cohorts.',
      references: [
        {
          title: 'Determinants and time course of the postthrombotic syndrome after acute deep venous thrombosis',
          citation: 'Kahn SR, Shrier I, Julian JA, et al. Ann Intern Med. 2008;149:698-707',
          year: 2008,
          pmid: '19017588',
          doi: '10.7326/0003-4819-149-10-200811180-00004',
        },
        {
          title: 'Assessment of validity and reproducibility of a clinical scale for the post-thrombotic syndrome (Villalta scale)',
          citation: 'Villalta S, Bagatella P, Piccioli A, et al. Haemostasis. 1994;24:158a (abstract)',
          year: 1994,
        },
      ],
    },
    nextSteps: [
      { condition: 'No PTS (<5)', actions: ['Routine follow-up', 'Reassess on symptom development'] },
      { condition: 'Mild–moderate (5–14)', actions: ['Elastic compression stockings', 'Leg elevation', 'Self-care education'] },
      { condition: 'Severe (≥15 or ulcer)', actions: ['Vascular specialist referral', 'Wound care for ulcers', 'Consider interventional options for lifestyle-limiting disease'] },
    ],
    pearls: [
      'Symptoms are patient-reported; signs are clinician-graded — use both.',
      'Any venous ulcer defines severe PTS regardless of subtotal.',
      'Apply to the same (ipsilateral) leg as the index DVT, typically ≥3–6 months out.',
    ],
  },

  // ─── 18. VIRSTA ────────────────────────────────────────────────────────────
  {
    id: 'virsta',
    name: 'VIRSTA Score',
    shortName: 'VIRSTA',
    description:
      'Prediction score for infective endocarditis risk in Staphylococcus aureus bacteremia, guiding priority for (urgent) echocardiography. Score ≥3 = high risk → urgent echo.',
    category: 'infectious-disease',
    tags: ['endocarditis', 'staphylococcus aureus', 'bacteremia', 'echocardiography', 'virsta', 'tee'],
    whenToUse: 'Within ~48 hours of documented Staphylococcus aureus bacteremia to stratify infective-endocarditis risk and prioritize echocardiography.',
    whyUse:
      'In the 2,008-patient VIRSTA cohort, score ≤2 had 1.1% IE (NPV 98.8%) vs 17.4% at ≥3 — the strongest validated rule-out tool for IE in SAB.',
    inputs: [
      yesNo('emboli', 'Cerebral or peripheral emboli', 5, 'Embolic events (e.g., stroke, septic peripheral emboli) — heaviest item (+5).', false),
      yesNo('meningitis', 'Meningitis', 5, 'Concurrent meningitis (+5).', false),
      yesNo('device', 'Permanent intracardiac device or previous IE', 4, 'Prosthetic valve, CIED, or prior infective endocarditis.', false),
      yesNo('ivdu', 'Intravenous drug use', 4, 'Current or recent IV drug use.', false),
      yesNo('valve', 'Pre-existing native valve disease', 3, 'Known native valvular heart disease.', false),
      yesNo('persist', 'Persistent bacteremia', 3, 'Positive blood cultures persisting ≥48 h despite appropriate therapy.', false),
      yesNo('vertebral', 'Vertebral osteomyelitis', 2, 'Concurrent vertebral osteomyelitis.', false),
      yesNo('community', 'Community or non-nosocomial healthcare-associated acquisition', 2, 'SAB acquired in the community or non-nosocomial healthcare setting.', false),
      yesNo('sepsis', 'Severe sepsis or shock', 1, 'Severe sepsis or septic shock at presentation.', false),
      yesNo('crp', 'C-reactive protein >190 mg/L', 1, 'CRP above 190 mg/L.', false),
    ],
    calculate(values) {
      const score =
        (bool(values.emboli) ? 5 : 0) + (bool(values.meningitis) ? 5 : 0) + (bool(values.device) ? 4 : 0) +
        (bool(values.ivdu) ? 4 : 0) + (bool(values.valve) ? 3 : 0) + (bool(values.persist) ? 3 : 0) +
        (bool(values.vertebral) ? 2 : 0) + (bool(values.community) ? 2 : 0) +
        (bool(values.sepsis) ? 1 : 0) + (bool(values.crp) ? 1 : 0);
      const high = score >= 3;
      return {
        score,
        unit: 'points',
        label: high ? 'High IE risk — urgent echocardiography' : 'Low IE risk',
        interpretation: high
          ? `VIRSTA ${score} ≥3: high infective-endocarditis risk (~17% in derivation). Perform urgent echocardiography (TEE when TTE is unrevealing or risk is high) to guide therapy duration and surgical evaluation.`
          : `VIRSTA ${score} ≤2: low IE risk (~1.1%; NPV ~99%). It may be reasonable to forgo echocardiography in selected patients — recalculate if complications arise or cultures remain positive.`,
        riskLevel: high ? 'high' : 'low',
        details: [{ label: 'Score', value: String(score) }],
        recommendations: high
          ? [
              'Urgent echocardiography — TEE if TTE negative and suspicion persists.',
              'Infectious diseases consultation; prolonged IV therapy if IE confirmed.',
              'Evaluate need for surgical intervention early.',
            ]
          : [
              'Continue appropriate antibiotics and source control.',
              'Repeat blood cultures to confirm clearance.',
              'Rescore if new embolic signs or persistent bacteremia emerge.',
            ],
      };
    },
    evidence: {
      summary:
        'The VIRSTA score (Tubiana et al., J Infect 2016) weights 10 predictors: cerebral/peripheral emboli +5, meningitis +5, intracardiac device/prior IE +4, IV drug use +4, native valve disease +3, persistent bacteremia +3, vertebral osteomyelitis +2, community/non-nosocomial acquisition +2, severe sepsis +1, CRP >190 +1. ≥3 = high risk.',
      formula: 'Weighted sum (0–30); high risk ≥3',
      validation:
        'Derived and internally validated in 2,008 SAB patients (NPV 98.8% at ≤2). External validations (Colombia, Netherlands) confirmed NPV ~99% and sensitivity ~97–99%, at the cost of ~70% classified high risk.',
      references: [
        {
          title: 'The VIRSTA score, a prediction score to estimate risk of infective endocarditis and determine priority for echocardiography in patients with Staphylococcus aureus bacteremia',
          citation: 'Tubiana S, Duval X, Alla F, et al. J Infect. 2016;72:544-552',
          year: 2016,
          pmid: '26916042',
          doi: '10.1016/j.jinf.2016.02.003',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score ≥3', actions: ['Urgent echocardiography (TEE if indicated)', 'ID consultation', 'Prolonged IV antibiotics if IE', 'Assess surgical indications'] },
      { condition: 'Score ≤2', actions: ['Standard SAB management', 'Confirm culture clearance', 'Rescore on clinical change'] },
    ],
    pearls: [
      'Persistent bacteremia (≥48 h on therapy) is a red flag — rescore once follow-up cultures return.',
      'A negative VIRSTA does not absolutely exclude IE; clinical judgment prevails.',
      'Many centers still echo most SAB patients — VIRSTA prioritizes rather than replaces echocardiography.',
    ],
  },
];
