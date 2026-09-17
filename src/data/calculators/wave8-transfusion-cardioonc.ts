import type { Calculator, CalcResult, RiskLevel } from '../../types/calculator';
import { num, bool, str, round, clamp, yesNo, selectInput, numberInput } from '../../utils/helpers';

/** Nadler 1962 total blood volume in litres (height cm → m, weight kg). */
function nadlerTBVL(sex: string, heightCm: number, weightKg: number): number {
  const h = heightCm / 100;
  if (sex === 'F') return 0.3561 * h * h * h + 0.03308 * weightKg + 0.1833;
  return 0.3669 * h * h * h + 0.03219 * weightKg + 0.6041;
}

/** Mosteller BSA in m². */
function bsaMosteller(heightCm: number, weightKg: number): number {
  return Math.sqrt((heightCm * weightKg) / 3600);
}

// ─── HFA-ICOS shared machinery ────────────────────────────────────────────────
// Levels per the published proformas: VH (very high) and H (high) factors
// classify automatically; M2 = 2 medium points, M1 = 1 medium point.
// Low = no risk factors or a single M1; Medium = 2–4 medium points;
// High = ≥5 medium points or any H factor; Very high = any VH factor.
type HfaLevel = 'vh' | 'h' | 'm2' | 'm1';

interface HfaContribution {
  label: string;
  level: HfaLevel;
  points: number;
}

function hfaIcosResult(items: HfaContribution[], therapyLabel: string): CalcResult {
  const vh = items.filter((i) => i.level === 'vh');
  const h = items.filter((i) => i.level === 'h');
  const mediumPoints = items.reduce((sum, i) => sum + i.points, 0);

  let riskLevel: RiskLevel;
  let label: string;
  let interpretation: string;
  const triggered = items.map((i) => i.label);

  if (vh.length > 0) {
    riskLevel = 'critical';
    label = 'Very high cardiotoxicity risk';
    interpretation = `HFA-ICOS baseline CV toxicity risk: VERY HIGH for ${therapyLabel} — ≥1 very-high-risk factor present (${vh
      .map((i) => i.label)
      .join('; ')}). Mandatory cardio-oncology/cardiology assessment before treatment; discuss risks/benefits and consider alternatives, cardioprotection, and intensified surveillance.`;
  } else if (h.length > 0 || mediumPoints >= 5) {
    riskLevel = 'high';
    label = 'High cardiotoxicity risk';
    interpretation = `HFA-ICOS baseline CV toxicity risk: HIGH for ${therapyLabel}${
      h.length > 0 ? ` — high-risk factor(s): ${h.map((i) => i.label).join('; ')}` : ''
    }${mediumPoints >= 5 ? ` — medium-risk factors total ${mediumPoints} points (≥5)` : ''}. Cardio-oncology/cardiology referral before starting; optimise CV risk factors; closer cardiac monitoring.`;
  } else if (mediumPoints >= 2) {
    riskLevel = 'moderate';
    label = 'Medium cardiotoxicity risk';
    interpretation = `HFA-ICOS baseline CV toxicity risk: MEDIUM for ${therapyLabel} — medium-risk factors total ${mediumPoints} points (2–4). Provide closer monitoring, manage CV risk factors, and consider cardio-oncology referral.`;
  } else {
    riskLevel = 'low';
    label = 'Low cardiotoxicity risk';
    interpretation = `HFA-ICOS baseline CV toxicity risk: LOW for ${therapyLabel} — no risk factors or a single medium-1 factor. Continue treatment with routine cardiovascular surveillance.`;
  }

  return {
    score: mediumPoints,
    unit: 'medium-risk points',
    label,
    interpretation,
    riskLevel,
    details: [
      { label: 'Very-high-risk factors', value: vh.length ? vh.map((i) => i.label).join('; ') : 'None' },
      { label: 'High-risk factors', value: h.length ? h.map((i) => i.label).join('; ') : 'None' },
      { label: 'Medium-risk point total', value: String(mediumPoints) },
      { label: 'Factors identified', value: triggered.length ? triggered.join('; ') : 'None' },
    ],
    recommendations: [
      'This tool is a decision-support aid; combine with clinician judgment, patient preferences, and current guidelines/local protocols.',
      'Refer any patient who develops cardiotoxicity during therapy to cardiology, regardless of baseline risk.',
      'Low risk: continue treatment with appropriate CV surveillance. Medium risk: closer monitoring + manage CV risk factors. High/very high: cardio-oncology referral, risk–benefit discussion, intensified monitoring.',
    ],
  };
}

function m(level: HfaLevel, pts: number, label: string, out: HfaContribution[], active: boolean) {
  if (!active) return;
  out.push({ label, level, points: pts });
}

const HFA_MANAGEMENT: { condition: string; actions: string[] }[] = [
  { condition: 'Low risk', actions: ['Continue treatment with routine cardiovascular surveillance per oncologic protocol', 'Baseline ECG and echocardiography per protocol'] },
  { condition: 'Medium risk', actions: ['Manage cardiovascular risk factors', 'Consider cardio-oncology referral', 'Closer cardiac monitoring (imaging/biomarkers)'] },
  { condition: 'High risk', actions: ['Cardio-oncology/cardiology assessment before therapy', 'Optimise risk factors and review regimen alternatives', 'Intensified surveillance during treatment'] },
  { condition: 'Very high risk', actions: ['Mandatory multidisciplinary cardio-oncology assessment', 'Discuss risks/benefits; consider less cardiotoxic alternatives or cardioprotection', 'Intensified monitoring throughout therapy'] },
];

const HFA_PEARLS = [
  'A single very-high-risk factor overrides the point total and classifies the patient as very high risk.',
  'Medium-risk factors carry 1 or 2 points: 2–4 points = medium risk; ≥5 points = high risk even without a high-risk factor.',
  'The proforma is expert-consensus based (HFA-ICOS 2020, adopted by the 2022 ESC cardio-oncology guidelines), not a statistically derived score.',
];

const HFA_REFS = [
  {
    title:
      'Baseline cardiovascular risk assessment in cancer patients scheduled to receive cardiotoxic cancer therapies: a position statement and new risk assessment tools from the Cardio-Oncology Study Group of the Heart Failure Association of the ESC in collaboration with the International Cardio-Oncology Society',
    citation: 'Lyon AR, Dent S, Stanway S, et al. Eur J Heart Fail. 2020;22(11):1945-1960',
    year: 2020,
    pmid: '32463967',
    doi: '10.1002/ejhf.1920',
  },
  {
    title:
      '2022 ESC Guidelines on cardio-oncology developed in collaboration with the European Hematology Association (EHA), the European Society for Therapeutic Radiology and Oncology (ESTRO) and the International Cardio-Oncology Society (IC-OS)',
    citation: 'Lyon AR, López-Fernández T, Couch LS, et al. Eur Heart J. 2022;43(41):4229-4361',
    year: 2022,
    pmid: '36017568',
    doi: '10.1093/eurheartj/ehac244',
  },
];

// ─── Approximate red-cell antigen frequencies by donor population ─────────────
// Antigen-positive rates (%→fraction). Sources: Dean L. Blood Groups and Red
// Cell Antigens (NCBI Bookshelf 2005); Chinese Han donor data (Int J
// Immunogenet 2018, doi:10.1111/iji.12277); standard transfusion-medicine
// tables. Values are approximations — local donor demographics may differ.
const AG_FREQ: Record<string, { label: string; white: number; black: number; asian: number }> = {
  C: { label: 'C (Rh)', white: 0.68, black: 0.27, asian: 0.89 },
  c: { label: 'c (Rh)', white: 0.80, black: 0.96, asian: 0.58 },
  E: { label: 'E (Rh)', white: 0.30, black: 0.22, asian: 0.51 },
  e: { label: 'e (Rh)', white: 0.98, black: 0.96, asian: 0.92 },
  Cw: { label: 'C(w) (Rh)', white: 0.025, black: 0.01, asian: 0.001 },
  D: { label: 'D (Rh)', white: 0.85, black: 0.92, asian: 0.99 },
  K: { label: 'K (Kell)', white: 0.09, black: 0.02, asian: 0.005 },
  k: { label: 'k (Kell)', white: 0.998, black: 1.0, asian: 1.0 },
  Kpa: { label: 'Kp(a) (Kell)', white: 0.02, black: 0.005, asian: 0.003 },
  Kpb: { label: 'Kp(b) (Kell)', white: 0.999, black: 1.0, asian: 0.997 },
  Jka: { label: 'Jk(a) (Kidd)', white: 0.77, black: 0.92, asian: 0.73 },
  Jkb: { label: 'Jk(b) (Kidd)', white: 0.74, black: 0.49, asian: 0.77 },
  Fya: { label: 'Fy(a) (Duffy)', white: 0.66, black: 0.10, asian: 0.85 },
  Fyb: { label: 'Fy(b) (Duffy)', white: 0.83, black: 0.23, asian: 0.16 },
  M: { label: 'M (MNS)', white: 0.78, black: 0.74, asian: 0.61 },
  N: { label: 'N (MNS)', white: 0.72, black: 0.75, asian: 0.64 },
  S: { label: 'S (MNS)', white: 0.55, black: 0.30, asian: 0.11 },
  s: { label: 's (MNS)', white: 0.89, black: 0.93, asian: 0.89 },
  Lea: { label: 'Le(a) (Lewis)', white: 0.22, black: 0.22, asian: 0.18 },
  Leb: { label: 'Le(b) (Lewis)', white: 0.72, black: 0.55, asian: 0.63 },
  Lua: { label: 'Lu(a) (Lutheran)', white: 0.08, black: 0.05, asian: 0.02 },
  Lub: { label: 'Lu(b) (Lutheran)', white: 0.998, black: 1.0, asian: 0.98 },
  P1: { label: 'P1 (P system)', white: 0.79, black: 0.94, asian: 0.30 },
};

export const wave8TransfusionCardioOncCalcs: Calculator[] = [
  // ─── 1. CCI ───────────────────────────────────────────────────────────────
  {
    id: 'cci-platelet',
    name: 'Corrected Count Increment (CCI) for Platelet Transfusion',
    shortName: 'CCI',
    description:
      'Assesses adequacy of platelet-transfusion response using the corrected count increment: platelet increment × BSA ÷ platelet dose. Poor CCI suggests immune (HLA) or nonimmune refractoriness.',
    category: 'hematology',
    tags: ['platelet', 'transfusion', 'refractoriness', 'cci', 'hla', 'alloimmunization'],
    whenToUse:
      'After a platelet transfusion when response is in question — obtain a post-transfusion count at 10–60 min (1-h CCI) or ~20–24 h and compare against expected recovery.',
    whyUse:
      'Objectively quantifies transfusion response adjusted for patient size and platelet dose. Repeated 1-h CCI <7,500 (or <5,000) defines refractoriness and prompts HLA-antibody testing and HLA-matched/crossmatched platelets.',
    inputs: [
      numberInput('prePlt', 'Pre-transfusion platelet count', { unit: '×10⁹/L', min: 0, max: 1500, exampleValue: 20, helpText: 'Platelet count drawn immediately before the transfusion (×10⁹/L = ×10³/µL).' }),
      numberInput('postPlt', 'Post-transfusion platelet count', { unit: '×10⁹/L', min: 0, max: 1500, exampleValue: 42, helpText: 'Collect at 10–60 minutes (1-h CCI) or ~20–24 hours after transfusion, then select the matching timing below.' }),
      selectInput('timing', 'Time after transfusion', [
        { label: '1 hour (10–60 min)', value: '1h' },
        { label: '20–24 hours', value: '20h' },
      ], '1h', 'Interpretation threshold differs by timing: 1-h CCI ≥7,500 is an adequate response; 20–24-h CCI ≥4,500 is adequate.'),
      numberInput('height', 'Height', { unit: 'cm', min: 100, max: 230, exampleValue: 170, helpText: 'Used to compute BSA (Mosteller formula): BSA = √(height×weight/3600).' }),
      numberInput('weight', 'Weight', { unit: 'kg', unitKind: 'weight', min: 30, max: 300, exampleValue: 70, helpText: 'Actual body weight; used with height for the Mosteller BSA.' }),
      numberInput('pltDose', 'Platelet unit content', { unit: '×10¹¹ platelets', min: 0.3, max: 12, step: 0.1, exampleValue: 3.0, helpText: 'One apheresis unit ≈ 3.0×10¹¹ platelets; one pooled concentrate ≈ 0.55×10¹¹. Ask the blood bank for the product’s stated content.' }),
    ],
    calculate(values) {
      const pre = num(values.prePlt, 20);
      const post = num(values.postPlt, 42);
      const timing = str(values.timing, '1h');
      const h = num(values.height, 170);
      const w = num(values.weight, 70);
      const dose = Math.max(num(values.pltDose, 3), 0.1);
      const bsa = bsaMosteller(h, w);
      const increment = post - pre;
      // CCI uses platelet counts per µL: ×10⁹/L × 1000 = /µL
      const cci = round((increment * bsa * 1000) / dose, 0);

      let riskLevel: RiskLevel;
      let label: string;
      let interpretation: string;
      if (timing === '1h') {
        if (cci >= 7500) {
          riskLevel = 'normal';
          label = 'Adequate 1-h response (≥7,500)';
          interpretation = `CCI ${cci} at 1 h — adequate platelet recovery (~20–30% expected). No evidence of refractoriness on this transfusion.`;
        } else if (cci >= 5000) {
          riskLevel = 'moderate';
          label = 'Suboptimal 1-h response (5,000–7,499)';
          interpretation = `CCI ${cci} at 1 h — below the 7,500 threshold for an adequate response. Check for nonimmune consumption (fever, sepsis, bleeding, splenomegaly, DIC, amphotericin, heparin); repeat CCI after a second transfusion before declaring refractoriness.`;
        } else {
          riskLevel = 'high';
          label = 'Poor 1-h response (<5,000)';
          interpretation = `CCI ${cci} at 1 h — markedly inadequate. Poor 1-h recovery suggests immune (alloantibody) refractoriness: order HLA/HPA antibody screen and consider HLA-matched or crossmatched platelets if CCI is poor on ≥2 sequential transfusions.`;
        }
      } else {
        if (cci >= 4500) {
          riskLevel = 'normal';
          label = 'Adequate 20–24-h response (≥4,500)';
          interpretation = `CCI ${cci} at 20–24 h — adequate sustained platelet survival.`;
        } else {
          riskLevel = 'high';
          label = 'Poor 20–24-h response (<4,500)';
          interpretation = `CCI ${cci} at 20–24 h — poor survival. A normal 1-h but poor 24-h CCI pattern suggests nonimmune consumption (infection, fever, bleeding, splenomegaly, DIC); a poor 1-h AND 24-h pattern suggests alloimmune refractoriness.`;
        }
      }
      return {
        score: cci,
        unit: 'CCI',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Platelet increment', value: `${round(increment, 0)} ×10⁹/L` },
          { label: 'BSA (Mosteller)', value: `${round(bsa, 2)} m²` },
          { label: 'Platelet dose', value: `${dose} ×10¹¹` },
          { label: 'Timing', value: timing === '1h' ? '1 hour' : '20–24 hours' },
        ],
        recommendations: [
          'Refractoriness requires a poor CCI on at least two sequential transfusions — do not diagnose from a single product.',
          'If immune refractoriness is suspected: HLA class I antibody screen (PRA), consider HLA-matched, HLA-epitope-matched, or crossmatch-compatible apheresis platelets; prefer ABO-identical fresh platelets.',
          'Supportive hemostatic measures (e.g., antifibrinolytics such as tranexamic acid/aminocaproic acid) may be tried when compatible platelets are unavailable.',
        ],
      };
    },
    evidence: {
      summary:
        'CCI = (post-transfusion − pre-transfusion platelet count, ×10⁹/L) × BSA (m²) ÷ platelets transfused (×10¹¹). BSA by Mosteller. Expected 1-h CCI ≥7,500 (≈20–30% recovery); adequate 24-h CCI ≥4,500. Platelet refractoriness = inadequate CCI on ≥2 transfusions; ~⅔ of refractory episodes are nonimmune.',
      formula: 'CCI = ΔPlt (×10⁹/L) × BSA (m²) ÷ platelets transfused (×10¹¹); BSA = √(H×W/3600)',
      validation:
        'Formula and thresholds consistent with transfusion-medicine references (Vox Sang 2020 educational review; University of Wisconsin Hematology; Pathology Outlines). Thresholds vary slightly by source (5,000 vs 7,500 at 1 h) — the 7,500 cutoff is used as adequate, <5,000 as frankly poor.',
      references: [
        {
          title: 'Indications for transfusion of blood components (CCI methodology)',
          citation: 'Vox Sang. 2020 (educational review)',
          year: 2020,
          doi: '10.1111/voxs.12605',
        },
        {
          title: 'Evaluation of Platelet Refractoriness — University of Wisconsin Hematology',
          citation: 'UW Hematology reference',
          url: 'https://uwhematology.medicine.wisc.edu/home/evaluation-of-platelet-refractoriness/',
        },
        {
          title: 'The Trial to Reduce Alloimmunization to Platelets (TRAP)',
          citation: 'TRAP Study Group. N Engl J Med. 1997;337:1861-1869',
          year: 1997,
        },
      ],
    },
    nextSteps: [
      { condition: 'CCI ≥7,500 (1 h) or ≥4,500 (24 h)', actions: ['Adequate response — continue current transfusion strategy', 'Reassess if clinical bleeding persists'] },
      { condition: 'CCI 5,000–7,499 at 1 h', actions: ['Evaluate nonimmune consumption (fever, sepsis, bleeding, splenomegaly, DIC, drugs)', 'Repeat CCI after next transfusion'] },
      { condition: 'CCI <5,000 at 1 h on ≥2 transfusions', actions: ['HLA class I antibody screen', 'Order HLA-matched/crossmatched or ABO-identical fresh platelets', 'Hematology/transfusion service consult'] },
    ],
    pearls: [
      'A poor 1-h CCI with preserved 24-h count is unusual; poor 1-h suggests alloimmune destruction, while normal 1-h but poor 24-h suggests nonimmune consumption.',
      'CCI corrects for dose and body size; the simpler post-transfusion increment (>10×10⁹/L) is a rough bedside alternative.',
      'Always document product content — apheresis ~3.0×10¹¹ vs pooled concentrates ~0.55×10¹¹ per unit.',
    ],
  },

  // ─── 2. Cryoprecipitate dosing ────────────────────────────────────────────
  {
    id: 'cryo-fibrinogen-dose',
    name: 'Cryoprecipitate Dosing for Fibrinogen Replacement',
    shortName: 'Cryo dose',
    description:
      'Estimates units of cryoprecipitate to raise fibrinogen to a target level: units = Δfibrinogen × plasma volume ÷ fibrinogen content per unit.',
    category: 'hematology',
    tags: ['cryoprecipitate', 'fibrinogen', 'transfusion', 'bleeding', 'hypofibrinogenemia', 'dic'],
    whenToUse:
      'Hypofibrinogenemia with bleeding or before invasive procedures — e.g., massive hemorrhage, DIC, obstetric hemorrhage — when fibrinogen concentrate is unavailable or pooled cryoprecipitate is used.',
    whyUse:
      'Cryoprecipitate fibrinogen content varies (AABB minimum 150 mg/unit, average ~250 mg); a weight- and hematocrit-based dose avoids under- or over-dosing versus empiric pooling.',
    inputs: [
      numberInput('weight', 'Patient weight', { unit: 'kg', unitKind: 'weight', min: 3, max: 300, exampleValue: 70, helpText: 'Actual body weight; plasma volume = 70 mL/kg × weight × (1 − hematocrit).' }),
      numberInput('hct', 'Hematocrit', { unit: '%', min: 5, max: 70, exampleValue: 30, helpText: 'Current hematocrit (%) — used to convert blood volume to plasma volume.' }),
      numberInput('fibInit', 'Initial fibrinogen', { unit: 'mg/dL', min: 0, max: 800, exampleValue: 100, helpText: 'Measured plasma fibrinogen (mg/dL). 100 mg/dL = 1.0 g/L.' }),
      numberInput('fibGoal', 'Goal fibrinogen', { unit: 'mg/dL', min: 50, max: 800, exampleValue: 200, helpText: 'Target fibrinogen (mg/dL). Common targets: ≥100–150 mg/dL bleeding/trauma, ≥150–200 mg/dL obstetric hemorrhage.' }),
      numberInput('fibPerUnit', 'Fibrinogen content per unit', { unit: 'mg', min: 100, max: 500, exampleValue: 250, helpText: 'Average ~250 mg/unit (AABB minimum 150 mg/unit; measured medians up to ~390 mg reported). Ask your blood bank for the local average.' }),
    ],
    calculate(values) {
      const w = num(values.weight, 70);
      const hct = clamp(num(values.hct, 30), 1, 90);
      const fi = num(values.fibInit, 100);
      const fg = num(values.fibGoal, 200);
      const fpu = Math.max(num(values.fibPerUnit, 250), 50);
      const pvMl = 70 * w * (1 - hct / 100);
      const delta = fg - fi;
      const fibNeeded = (delta * pvMl) / 100; // mg
      const rawUnits = fibNeeded / fpu;
      const units = Math.max(0, Math.ceil(rawUnits));
      const pools5 = Math.ceil(units / 5);

      let riskLevel: RiskLevel = 'info';
      let label: string;
      let interpretation: string;
      if (delta <= 0) {
        label = 'No increment required';
        interpretation = `Initial fibrinogen (${fi} mg/dL) already meets or exceeds the goal (${fg} mg/dL). No cryoprecipitate is needed for fibrinogen replacement by this calculation — reassess indication.`;
      } else {
        riskLevel = 'moderate';
        label = `${units} unit${units === 1 ? '' : 's'} of cryoprecipitate`;
        interpretation = `Estimated ${units} unit(s) (~${pools5} × 5-unit pool${pools5 === 1 ? '' : 's'}) to raise fibrinogen from ${fi} to ${fg} mg/dL, assuming ${fpu} mg fibrinogen per unit and plasma volume ${round(
          pvMl,
          0
        )} mL. Recheck fibrinogen after transfusion.`;
      }
      return {
        score: delta <= 0 ? 0 : units,
        unit: 'units',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Plasma volume (est.)', value: `${round(pvMl, 0)} mL` },
          { label: 'Fibrinogen increment needed', value: `${round(delta, 0)} mg/dL → ${round(Math.max(fibNeeded, 0), 0)} mg total` },
          { label: 'Raw calculation', value: `${round(rawUnits, 2)} units → round up to ${units}` },
          { label: 'Approx. 5-unit pools', value: String(pools5) },
        ],
        recommendations: [
          'Request the calculated number of units from the blood bank; units are commonly issued pre-pooled in 5-unit bags.',
          'Fibrinogen concentrate (3–4 g ≈ standard adult dose) is an alternative with standardized content and viral inactivation where available.',
          'Recheck fibrinogen after transfusion — consumption in active bleeding/DIC may exceed the estimate.',
        ],
      };
    },
    evidence: {
      summary:
        'Units = desired fibrinogen increment (mg/dL) × plasma volume (dL) ÷ fibrinogen per unit (mg). Plasma volume = 70 mL/kg × weight × (1 − Hct). Average ~250 mg fibrinogen per unit (AABB minimum 150 mg). Empiric adult dosing of 10 units typically raises fibrinogen ~50–100 mg/dL.',
      formula: 'Units = (goal − initial fibrinogen, mg/dL) × PV (mL)/100 ÷ fibrinogen per unit (mg); PV = 70 mL/kg × weight × (1 − Hct)',
      validation:
        'Matches the AABB transfusion-threshold teaching formula and standard transfusion-medicine textbooks. Actual increment varies with consumption, product content (150–400+ mg/unit), and ongoing losses — verify with post-transfusion fibrinogen.',
      references: [
        {
          title: 'How Do I Select Evidence-Based Transfusion Thresholds for Platelets, Plasma and Cryoprecipitate? (fibrinogen increment formula)',
          citation: 'AABB resource',
          url: 'https://www.aabb.org/docs/default-source/default-document-library/resources/how-do-i-select-evidence-based-transfusion-thresholds-for-platelets-plasma-and-cryoprecipitate.pdf',
        },
        {
          title: 'Immunohematology, Transfusion Medicine, Hemostasis, and Cellular Therapy (cryo dose formula)',
          citation: 'Transfusion medicine textbook. Springer. 2023',
          year: 2023,
          doi: '10.1007/978-3-031-14638-1',
        },
      ],
    },
    nextSteps: [
      { condition: 'Active bleeding with fibrinogen <150–200 mg/dL', actions: ['Transfuse calculated cryo dose (or fibrinogen concentrate)', 'Address bleeding source and other components of coagulopathy', 'Repeat fibrinogen'] },
      { condition: 'Calculated dose differs from institutional pool size', actions: ['Round to local pool size (commonly 5-unit pools)', 'Document indication and target level'] },
    ],
    pearls: [
      'One unit per ~10 kg body weight is a rough empiric adult dose (≈10 units for 70–100 kg).',
      'Obstetric hemorrhage guidelines target fibrinogen ≥150–200 mg/dL — higher than classic 100 mg/dL triggers.',
      'Cryo also supplies factor VIII, vWF, factor XIII, and fibronectin; it is no longer first-line for isolated factor VIII/vWD deficiency where concentrates exist.',
    ],
  },

  // ─── 3. Plasma dosage ─────────────────────────────────────────────────────
  {
    id: 'plasma-dose',
    name: 'Plasma Dosage (FFP Volume)',
    shortName: 'Plasma dose',
    description:
      'Calculates fresh frozen plasma volume and number of units for transfusion in bleeding patients from weight and desired mL/kg dose.',
    category: 'hematology',
    tags: ['ffp', 'plasma', 'transfusion', 'bleeding', 'coagulopathy', 'warfarin'],
    whenToUse:
      'Active bleeding (or high-bleeding-risk procedures) with coagulopathy — e.g., massive transfusion, liver disease with bleeding, warfarin reversal when PCC unavailable — where a weight-based plasma dose is prescribed.',
    whyUse:
      'Underdosing plasma (e.g., 1–2 units regardless of weight) is a common error; coagulation-factor increments require ~10–15 mL/kg, i.e., ~4 units for an average adult.',
    inputs: [
      numberInput('weight', 'Patient weight', { unit: 'kg', unitKind: 'weight', min: 3, max: 300, exampleValue: 70, helpText: 'Actual body weight; plasma dose is prescribed per kg.' }),
      numberInput('doseMlKg', 'Desired plasma dosage', { unit: 'mL/kg', min: 1, max: 30, step: 0.5, exampleValue: 12, helpText: 'Typical dose 10–15 mL/kg for coagulopathy with bleeding; up to 15–20 mL/kg in massive hemorrhage. ~10 mL/kg raises factor levels only modestly.' }),
      numberInput('unitVol', 'Unit volume', { unit: 'mL', min: 100, max: 400, exampleValue: 250, helpText: 'Volume of one plasma unit at your center (typically ~200–250 mL; apheresis units up to ~300 mL).' }),
    ],
    calculate(values) {
      const w = num(values.weight, 70);
      const dose = num(values.doseMlKg, 12);
      const unitVol = Math.max(num(values.unitVol, 250), 50);
      const totalMl = w * dose;
      const rawUnits = totalMl / unitVol;
      const units = Math.max(1, Math.ceil(rawUnits));
      return {
        score: round(totalMl, 0),
        unit: 'mL',
        label: `${round(totalMl, 0)} mL ≈ ${units} unit${units === 1 ? '' : 's'}`,
        interpretation: `Plasma volume ${round(totalMl, 0)} mL (${dose} mL/kg × ${w} kg) → order approximately ${units} unit(s) of ${unitVol} mL. Ensure ABO-compatible plasma; monitor for transfusion reactions.`,
        riskLevel: 'info',
        details: [
          { label: 'Total dose', value: `${round(totalMl, 0)} mL` },
          { label: 'Units (rounded up)', value: `${units} (${round(rawUnits, 2)} exact)` },
          { label: 'Dose basis', value: `${dose} mL/kg × ${w} kg` },
        ],
        recommendations: [
          'Use ABO-compatible plasma; group AB plasma is the universal donor (prefer male/never-transfused donors to reduce TRALI risk).',
          'Plasma is generally inappropriate for isolated INR elevation without bleeding — address vitamin K/PCC first for warfarin reversal.',
          'Large volumes risk TACO and citrate toxicity (especially neonates and liver disease); reassess coagulation tests after transfusion.',
        ],
      };
    },
    evidence: {
      summary:
        'Total plasma volume (mL) = weight (kg) × prescribed dose (mL/kg); units = total volume ÷ unit volume, rounded up. Evidence supports ~10–15 mL/kg to achieve meaningful factor increments; smaller doses yield subtherapeutic increments.',
      formula: 'Volume = weight × dose (mL/kg); Units = ceil(Volume ÷ unit volume)',
      validation:
        'Standard weight-based formula used by transfusion services and transfusion textbooks. Guidelines caution that plasma corrects INR poorly at conventional doses and that ~10–15 mL/kg is required for factor replacement.',
      references: [
        {
          title: 'Immunohematology, Transfusion Medicine, Hemostasis, and Cellular Therapy',
          citation: 'Transfusion medicine textbook. Springer. 2023',
          year: 2023,
          doi: '10.1007/978-3-031-14638-1',
        },
        {
          title: 'AABB plasma transfusion guidance',
          citation: 'AABB Clinical Transfusion Medicine Committee',
          url: 'https://www.aabb.org',
        },
      ],
    },
    nextSteps: [
      { condition: 'Bleeding with coagulopathy', actions: ['Order calculated volume (typically 10–15 mL/kg)', 'Repeat PT/INR, fibrinogen after transfusion', 'Treat the bleeding source'] },
      { condition: 'Warfarin reversal, urgent', actions: ['Prefer 4-factor PCC + vitamin K where available — plasma alone reverses slowly and requires large volumes'] },
    ],
    pearls: [
      'A single FFP unit (~250 mL) is only ~3–4 mL/kg in an adult — subtherapeutic for factor replacement.',
      'Plasma normalizes INR poorly when INR <2; benefit is greatest with marked prolongation and bleeding.',
      'Severe IgA deficiency with anti-IgA antibodies is an absolute contraindication; use IgA-deficient donor plasma if transfusion is essential.',
    ],
  },

  // ─── 4. RBC units to screen ───────────────────────────────────────────────
  {
    id: 'rbc-screen-compatibility',
    name: 'RBC Units to Screen for Compatibility',
    shortName: 'RBC screening',
    description:
      'Estimates how many donor RBC units must be antigen-typed to find a desired number of antigen-negative units, using donor-population antigen frequencies.',
    category: 'hematology',
    tags: ['transfusion', 'alloantibody', 'antigen-negative', 'rbc', 'blood bank', 'compatibility'],
    whenToUse:
      'A patient has one or more RBC alloantibodies and antigen-negative units are needed — estimate the screening workload for the blood bank (units to phenotype per unit required).',
    whyUse:
      'Rare antigen-negative combinations (e.g., K−, Fy(a−b−), Jk(a−b−)) require screening many donors; quantifying expected yield prevents under-ordering and delays.',
    inputs: [
      numberInput('unitsNeeded', 'Number of desired antigen-negative units', { unit: 'units', min: 1, max: 50, exampleValue: 2, helpText: 'How many compatible (antigen-negative) RBC units are needed for transfusion.' }),
      selectInput('race', 'Donor population', [
        { label: 'White (European ancestry)', value: 'white' },
        { label: 'Black (African ancestry)', value: 'black' },
        { label: 'Asian', value: 'asian' },
      ], 'white', 'Antigen frequencies differ by donor population (e.g., Fy(a−b−) common in Black donors, rare elsewhere). If unsure of donor demographics, White is the typical default in US/European centers.'),
      ...Object.entries(AG_FREQ).map(([id, a]) =>
        yesNo(
          `ag_${id}`,
          `Require ${a.label}-negative units`,
          null,
          `Select Yes if the patient has an antibody to ${a.label} (or ${a.label}-negative blood is required). ~${Math.round(a.white * 100)}% of White donors are ${a.label}-positive.`,
          false
        )
      ),
    ],
    calculate(values) {
      const units = num(values.unitsNeeded, 2);
      const race = str(values.race, 'white') as 'white' | 'black' | 'asian';
      const freqKey = race === 'black' ? 'black' : race === 'asian' ? 'asian' : 'white';
      const excluded: string[] = [];
      let p = 1;
      for (const [id, a] of Object.entries(AG_FREQ)) {
        if (bool(values[`ag_${id}`])) {
          p *= 1 - a[freqKey];
          excluded.push(`${a.label}− (${round(a[freqKey] * 100, 1)}% positive)`);
        }
      }
      if (excluded.length === 0) {
        return {
          score: units,
          unit: 'units to screen',
          label: 'No antigen restrictions',
          interpretation: 'No antigens selected for exclusion — expected units to screen equals units needed (ABO/Rh matching aside).',
          riskLevel: 'info',
          details: [{ label: 'Desired units', value: String(units) }],
        };
      }
      const screen = Math.ceil(units / Math.max(p, 1e-4));
      const riskLevel: RiskLevel = p >= 0.2 ? 'low' : p >= 0.05 ? 'moderate' : 'high';
      return {
        score: screen,
        unit: 'units to screen',
        label: `~${screen} donor units to screen`,
        interpretation: `To obtain ${units} antigen-negative unit(s) for ${excluded.join('; ')}, approximately ${screen} donor units must be phenotyped (expected yield ${round(
          p * 100,
          1
        )}% of screened units). Consult the blood bank — inventory and pre-tested antigen-negative stock may reduce screening.`,
        riskLevel,
        details: [
          { label: 'Excluded antigens', value: excluded.join('; ') },
          { label: 'P(unit negative for all)', value: `${round(p * 100, 2)}%` },
          { label: 'Units needed', value: String(units) },
          { label: 'Estimated units to screen', value: `${screen} (= ${units} ÷ ${round(p, 4)})` },
        ],
        recommendations: [
          'Follow AABB Standards for compatibility testing; confirm antibodies by the required serologic/molecular work-up.',
          'For multiple or rare combinations, ask the blood bank about pre-phenotyped antigen-negative inventory and rare donor programs.',
          'Rh-system antigens (C/c/E/e) are inherited as haplotypes — the independence assumption overestimates screening for combined Rh requirements; treat the result as an approximation.',
        ],
      };
    },
    evidence: {
      summary:
        'Units to screen = units needed ÷ ∏(1 − antigen frequencyᵢ) across antigens to exclude, using donor-population antigen frequencies. The independence multiplication is the standard transfusion-medicine approximation.',
      formula: 'N_screen = N_needed ÷ Π(1 − fᵢ)',
      validation:
        'Formula per standard transfusion-medicine texts; antigen frequencies are population approximations (Dean, NCBI 2005; Chinese Han donor study doi:10.1111/iji.12277). Linked alleles (e.g., C/c/E/e haplotypes, M/N, Fya/Fyb) are not truly independent — results are estimates; blood-bank review is recommended.',
      references: [
        {
          title: 'Immunohematology, Transfusion Medicine, Hemostasis, and Cellular Therapy (screening formula)',
          citation: 'Transfusion medicine textbook. Springer. 2023',
          year: 2023,
          doi: '10.1007/978-3-031-14638-1',
        },
        {
          title: 'Blood Groups and Red Cell Antigens (antigen frequency tables)',
          citation: 'Dean L. NCBI Bookshelf. 2005',
          year: 2005,
          url: 'https://www.ncbi.nlm.nih.gov/books/NBK2264/',
        },
        {
          title: 'Frequencies of red blood cell major blood group antigens and phenotypes in the Chinese Han population from Mainland China',
          citation: 'Int J Immunogenet. 2018',
          year: 2018,
          doi: '10.1111/iji.12277',
        },
      ],
    },
    nextSteps: [
      { condition: 'Large screening estimate or rare phenotype', actions: ['Notify blood bank early — procurement may take days', 'Consider autologous or directed donation only per policy', 'Check national rare-donor registries'] },
      { condition: 'Clinically significant antibodies identified', actions: ['Issue antigen-negative, crossmatch-compatible units', 'Document antibodies in transfusion record and patient card'] },
    ],
    pearls: [
      'Fy(a−b−) units are readily found in Black donor populations (~50–68% Fy(a−)) but rare in White donors.',
      'Multiple antibody specificities multiply the required screening — the product of negative frequencies drops quickly.',
      'Antigen frequencies are donor-population dependent; the estimate assumes independence and is most accurate for antigens in different systems.',
    ],
  },

  // ─── 5. DLI volume ────────────────────────────────────────────────────────
  {
    id: 'dli-volume',
    name: 'Donor Lymphocyte Infusion (DLI) Collection Volume',
    shortName: 'DLI volume',
    description:
      'Estimates the volume of whole blood to process by apheresis to yield a prescribed CD3+ T-cell dose for donor lymphocyte infusion.',
    category: 'hematology',
    tags: ['dli', 'donor lymphocyte', 'apheresis', 'transplant', 'gvhd', 'cd3'],
    whenToUse:
      'Planning a non-mobilized lymphocyte apheresis collection from an allogeneic donor to deliver a prescribed CD3+ dose (×10⁶/kg recipient weight) for DLI.',
    whyUse:
      'DLI is prescribed as CD3+ cells per recipient kg, often in escalating doses; the blood volume to process depends on donor lymphocyte/CD3 counts and expected collection efficiency.',
    inputs: [
      numberInput('weight', 'Recipient weight', { unit: 'kg', unitKind: 'weight', min: 10, max: 300, exampleValue: 70, helpText: 'Recipient (patient) weight — the CD3 dose is prescribed per kg of recipient weight.' }),
      numberInput('cd3Dose', 'CD3+ infusion dose', { unit: '×10⁶ cells/kg', min: 0.1, max: 100, step: 0.1, exampleValue: 1, helpText: 'Prescribed CD3+ cells per recipient kg per dose (e.g., 1×10⁶/kg first DLI, escalating to 5–10×10⁶/kg).' }),
      numberInput('doses', 'Number of infusions to recipient', { unit: 'doses', min: 1, max: 10, exampleValue: 1, helpText: 'Number of doses the single collection should be divided into for infusion.' }),
      numberInput('ce', 'Collection efficiency', { unit: '%', min: 10, max: 100, exampleValue: 50, helpText: 'Expected apheresis lymphocyte collection efficiency (typically ~40–60% for non-mobilized lymphocyte collection); confirm with the apheresis unit.' }),
      numberInput('wbc', 'Donor WBC', { unit: '×10⁹/L', min: 1, max: 30, step: 0.1, exampleValue: 6, helpText: 'Donor pre-collection peripheral WBC count (×10⁹/L).' }),
      numberInput('lymphPct', 'Donor total lymphocytes', { unit: '%', min: 1, max: 100, exampleValue: 30, helpText: 'Lymphocyte percentage of donor WBC (from differential).' }),
      numberInput('cd3Pct', 'Donor CD3+ lymphocytes', { unit: '%', min: 1, max: 100, exampleValue: 70, helpText: 'Fraction of donor lymphocytes that are CD3+ T cells (flow cytometry; typically ~60–80%).' }),
    ],
    calculate(values) {
      const w = num(values.weight, 70);
      const dose = num(values.cd3Dose, 1);
      const nDoses = Math.max(1, num(values.doses, 1));
      const ce = clamp(num(values.ce, 50), 1, 100) / 100;
      const wbc = num(values.wbc, 6);
      const lpct = num(values.lymphPct, 30) / 100;
      const cd3pct = num(values.cd3Pct, 70) / 100;
      const cd3PerL = wbc * lpct * cd3pct * 1000; // ×10⁶ cells/L
      const yieldPerL = cd3PerL * ce;
      const needed = dose * w * nDoses; // ×10⁶ cells
      const volL = needed / Math.max(yieldPerL, 0.001);
      return {
        score: round(volL * 1000, 0),
        unit: 'mL',
        label: `Process ~${round(volL, 2)} L of donor blood`,
        interpretation: `To collect ${round(needed, 0)}×10⁶ CD3+ cells (${dose}×10⁶/kg × ${w} kg × ${nDoses} dose${nDoses === 1 ? '' : 's'}) at ${round(
          ce * 100,
          0)}% collection efficiency from a donor with ${round(cd3PerL, 0)}×10⁶ CD3+/L blood, process ≈ ${round(volL, 2)} L (${round(
          volL * 1000,
          0
        )} mL) of whole blood.`,
        riskLevel: 'info',
        details: [
          { label: 'CD3+ needed', value: `${round(needed, 0)} ×10⁶ cells` },
          { label: 'Donor CD3+ concentration', value: `${round(cd3PerL, 0)} ×10⁶/L` },
          { label: 'Expected yield per L processed', value: `${round(yieldPerL, 0)} ×10⁶ cells` },
          { label: 'Blood volume to process', value: `${round(volL, 2)} L` },
        ],
        recommendations: [
          'Discuss the processed volume with apheresis staff; inform the cell-therapy lab how many aliquots/doses are required.',
          'DLI carries GvHD risk — escalating-dose schedules and GvL monitoring per protocol; confirm institutional dose caps.',
        ],
      };
    },
    evidence: {
      summary:
        'Volume processed (L) = required CD3+ cells ÷ (donor CD3+ cells per litre × collection efficiency). CD3+/L = donor WBC (×10⁹/L) × lymphocyte fraction × CD3 fraction × 1000 (→×10⁶/L). Required cells = CD3 dose (×10⁶/kg) × recipient weight × number of doses.',
      formula: 'V = dose × weight × doses ÷ (WBC × lymph% × CD3% × 1000 × CE)',
      validation:
        'Implements the standard DLI-volume computation; apheresis yield modeling (CD3 concentration × volume × efficiency) is standard cellular-therapy practice. Actual yields vary with donor counts and device — confirm expected CE with the apheresis unit.',
      references: [
        {
          title: 'EBMT Handbook: Hematopoietic Stem Cell Transplantation and Cellular Therapies (DLI collection)',
          citation: 'European Society for Blood and Marrow Transplantation',
          url: 'https://www.ebmt.org',
        },
      ],
    },
    nextSteps: [
      { condition: 'Volume acceptable for single apheresis session', actions: ['Schedule non-mobilized lymphocyte collection', 'Aliquot into ordered dose count'] },
      { condition: 'Calculated volume very large', actions: ['Reassess dose escalation step, donor lymphocyte counts, or expected CE', 'Consider multi-session collection per apheresis service'] },
    ],
    pearls: [
      'DLI dosing uses recipient weight, but donor counts determine collection volume.',
      'Escalating schedules (e.g., 1 → 5 → 10 ×10⁶ CD3/kg) allow GvL effect titration against GvHD risk.',
      'A single unmobilized leukapheresis typically processes ~8–12 L of donor blood.',
    ],
  },

  // ─── 6. PBSC collection ───────────────────────────────────────────────────
  {
    id: 'pbsc-collection-yield',
    name: 'Peripheral Blood Stem Cell Collection Yield',
    shortName: 'PBSC yield',
    description:
      'Estimates expected CD34+ cell yield (×10⁶/kg) from pre-apheresis peripheral blood CD34 count, processed blood volume, and collection efficiency.',
    category: 'hematology',
    tags: ['cd34', 'stem cell', 'apheresis', 'mobilization', 'autologous', 'transplant'],
    whenToUse:
      'Before/during mobilized peripheral blood stem cell collection to predict whether the planned processed volume will reach the target CD34+ yield for autologous (or allogeneic) transplant.',
    whyUse:
      'Pre-collection peripheral CD34 count predicts harvest adequacy; projecting yield guides whether to proceed, extend processing, or re-mobilize/add plerixafor.',
    inputs: [
      numberInput('weight', 'Recipient weight', { unit: 'kg', unitKind: 'weight', min: 10, max: 300, exampleValue: 70, helpText: 'Recipient weight — the target yield is expressed per kg.' }),
      numberInput('processed', 'Processed blood volume', { unit: 'L', min: 1, max: 40, exampleValue: 12, helpText: 'Total blood volume planned to be processed on the device (commonly ~2–4 total blood volumes, i.e., ~10–20 L for adults).' }),
      numberInput('cd34', 'Peripheral blood CD34+', { unit: '×10⁶ cells/L', min: 0, max: 2000, exampleValue: 50, helpText: 'Pre-apheresis peripheral CD34+ count by flow cytometry. 50×10⁶/L = 50 cells/µL.' }),
      numberInput('ce', 'Collection efficiency', { unit: '%', min: 10, max: 100, exampleValue: 50, helpText: 'Expected device collection efficiency for CD34+ cells (commonly ~40–60%; device- and operator-dependent).' }),
    ],
    calculate(values) {
      const w = num(values.weight, 70);
      const vol = num(values.processed, 12);
      const cd34 = num(values.cd34, 50);
      const ce = clamp(num(values.ce, 50), 1, 100) / 100;
      const total = cd34 * vol * ce; // ×10⁶ cells
      const perKg = total / w;
      let riskLevel: RiskLevel;
      let label: string;
      let interpretation: string;
      if (perKg >= 4) {
        riskLevel = 'normal';
        label = 'Adequate-to-optimal expected yield (≥4×10⁶/kg)';
        interpretation = `Expected yield ~${round(perKg, 1)}×10⁶ CD34+/kg — meets/exceeds common optimal targets (≥4–5×10⁶/kg) for autologous rescue.`;
      } else if (perKg >= 2) {
        riskLevel = 'low';
        label = 'Adequate expected yield (2–4×10⁶/kg)';
        interpretation = `Expected yield ~${round(perKg, 1)}×10⁶ CD34+/kg — meets the usual minimum for a single autologous transplant (≥2×10⁶/kg) but below optimal targets; extend processing or plan a second day if a higher yield is desired.`;
      } else {
        riskLevel = 'high';
        label = 'Likely inadequate expected yield (<2×10⁶/kg)';
        interpretation = `Expected yield ~${round(perKg, 1)}×10⁶ CD34+/kg — below the usual ≥2×10⁶/kg minimum for autologous rescue. Consider larger processed volumes, re-mobilization, or plerixafor rescue per protocol.`;
      }
      return {
        score: round(perKg, 2),
        unit: '×10⁶ CD34+/kg',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Total CD34+ expected', value: `${round(total, 0)} ×10⁶ cells` },
          { label: 'Yield per kg', value: `${round(perKg, 2)} ×10⁶/kg` },
          { label: 'Inputs', value: `${cd34}×10⁶/L × ${vol} L × ${round(ce * 100, 0)}% CE` },
        ],
        recommendations: [
          'Only validated laboratory CD34 enumeration should drive collection decisions.',
          'Poor peripheral CD34 counts predict poor harvests — many programs trigger plerixafor at peripheral CD34 <10–20/µL.',
        ],
      };
    },
    evidence: {
      summary:
        'Expected total CD34+ (×10⁶) = peripheral CD34 (×10⁶/L) × processed volume (L) × collection efficiency. Per-kg yield = total ÷ recipient weight. ≥2×10⁶/kg is the usual minimum for autologous rescue; ≥4–5×10⁶/kg is optimal and is associated with faster engraftment.',
      formula: 'Yield (×10⁶/kg) = CD34/µL × volume processed (L) × CE ÷ weight (kg)',
      validation:
        'Standard apheresis yield projection used by collection centers; consistent with mobilization/apheresis literature showing pre-collection peripheral CD34 strongly predicts yield.',
      references: [
        {
          title: 'EBMT Handbook: Hematopoietic Stem Cell Transplantation and Cellular Therapies (apheresis yield)',
          citation: 'European Society for Blood and Marrow Transplantation',
          url: 'https://www.ebmt.org',
        },
      ],
    },
    nextSteps: [
      { condition: 'Expected yield ≥2×10⁶/kg', actions: ['Proceed with planned collection', 'Verify product CD34 after collection'] },
      { condition: 'Expected yield <2×10⁶/kg', actions: ['Increase processed volume or collection days', 'Consider plerixafor/re-mobilization per protocol', 'Discuss with apheresis and transplant teams'] },
    ],
    pearls: [
      'Peripheral CD34 count on the morning of collection is the single best predictor of yield.',
      'Large-volume leukapheresis (3–4 TBV) increases yield per session when counts are marginal.',
      'Collection efficiency is device- and technique-dependent; the estimate is a projection, not a guarantee.',
    ],
  },

  // ─── 7. Intrauterine transfusion ──────────────────────────────────────────
  {
    id: 'iut-rbc-dose',
    name: 'Intrauterine RBC Transfusion Dosage',
    shortName: 'IUT dose',
    description:
      'Estimates donor RBC volume for intrauterine transfusion in fetal anemia using estimated fetoplacental blood volume and target hematocrit.',
    category: 'obstetrics',
    tags: ['intrauterine transfusion', 'hdfn', 'fetal anemia', 'iut', 'rh', 'perinatology'],
    whenToUse:
      'Planning an intravascular intrauterine transfusion for fetal anemia (e.g., HDFN) — volume needed to raise fetal hematocrit to target, based on estimated fetal weight and donor-unit hematocrit.',
    whyUse:
      'Accurate volume estimation achieves the target hematocrit without fluid overload — critical in hydropic fetuses that tolerate volume poorly.',
    inputs: [
      numberInput('efw', 'Estimated fetal weight', { unit: 'g', min: 100, max: 5000, exampleValue: 1000, helpText: 'Ultrasound-estimated fetal weight in grams. Fetoplacental blood volume ≈ 1.046 + 0.14 × EFW (g) mL.' }),
      numberInput('hctInit', 'Initial fetal hematocrit', { unit: '%', min: 1, max: 60, exampleValue: 25, helpText: 'Fetal hematocrit from the pre-transfusion cordocentesis sample (%).' }),
      numberInput('hctGoal', 'Goal fetal hematocrit', { unit: '%', min: 30, max: 60, exampleValue: 45, helpText: 'Target post-transfusion fetal hematocrit — typically 45–50%.' }),
      numberInput('hctDonor', 'Hematocrit of transfused RBCs', { unit: '%', min: 50, max: 95, exampleValue: 75, helpText: 'Donor unit hematocrit — typically 75–80% for concentrated IUT units (range 55–85% by storage solution); confirm with the blood bank.' }),
    ],
    calculate(values) {
      const efw = num(values.efw, 1000);
      const hi = num(values.hctInit, 25);
      const hg = num(values.hctGoal, 45);
      const hd = num(values.hctDonor, 75);
      const fpv = 1.046 + 0.14 * efw;
      const delta = hg - hi;
      const vol = delta > 0 && hd > 0 ? (fpv * delta) / hd : 0;
      const giannina = delta > 0 ? 0.02 * efw * (delta / 10) : 0;
      return {
        score: round(vol, 0),
        unit: 'mL',
        label: `Transfuse ~${round(vol, 0)} mL packed RBCs`,
        interpretation:
          delta <= 0
            ? `Goal hematocrit (${hg}%) is not above the initial fetal hematocrit (${hi}%) — no transfusion volume indicated by this calculation.`
            : `Estimated transfusion volume ${round(vol, 0)} mL of donor RBCs (Hct ${hd}%) to raise fetal Hct from ${hi}% to ${hg}%. Fetoplacental blood volume ≈ ${round(
                fpv,
                0
              )} mL. Confirm achieved Hct by post-transfusion sampling.`,
        riskLevel: 'info',
        details: [
          { label: 'Fetoplacental blood volume', value: `${round(fpv, 0)} mL (1.046 + 0.14 × EFW)` },
          { label: 'Required Hct rise', value: `${round(delta, 0)}%` },
          { label: 'Giannina simplified estimate', value: `${round(giannina, 0)} mL (0.02 × EFW × ΔHct per 10%, assumes ~75% donor Hct)` },
        ],
        recommendations: [
          'Perform under continuous ultrasound with post-transfusion fetal Hct/hemoglobin confirmation per protocol.',
          'In hydrops, EFW-based volumes may be less reliable — consider gestational-age-based blood-volume estimates and smaller initial volumes.',
          'In HDFN not due to anti-D, give RhIG to the Rh-negative mother after IUT to prevent D alloimmunization.',
        ],
      };
    },
    evidence: {
      summary:
        'Fetoplacental blood volume = 1.046 + 0.14 × EFW (g) mL; transfusion volume = FPV × (target − initial Hct) ÷ donor Hct (simple dilution, Rodeck/Giannina method). An alternate form uses ÷(donor − target Hct); the Giannina simplification (0.02 × EFW × ΔHct per 10%) performs comparably.',
      formula: 'V = (1.046 + 0.14×EFW) × (Hct_target − Hct_initial) ÷ Hct_donor',
      validation:
        'Matches perinatology protocols (perinatology.com IVT calculator), fetal-therapy guidelines (SFM 2024), and the Giannina/Moise validation, which found the dilution formula more reliable than volume-added models.',
      references: [
        {
          title: 'Assessment of fetal blood volume for computer-assisted management of in utero transfusion',
          citation: 'Giannina G, Moise KJ, Dorman K. Fetal Diagn Ther. 1998',
          year: 1998,
          doi: '10.1159/000263335',
        },
        {
          title: 'SFM Fetal Therapy Practice Guidelines: Intrauterine Blood Transfusion',
          citation: 'Fetal Diagn Ther. 2024',
          year: 2024,
          doi: '10.1055/s-0044-1779752',
        },
        {
          title: 'Intrauterine transfusion and non-invasive treatment options for hemolytic disease of the fetus and newborn',
          citation: 'Expert Rev Hematol. 2017',
          year: 2017,
          doi: '10.1080/17474086.2017.1305265',
        },
      ],
    },
    nextSteps: [
      { condition: 'IUT indicated (e.g., MCA-PSV ≥1.5 MoM or fetal anemia confirmed)', actions: ['Maternal–fetal medicine / fetal-therapy center', 'Prepare irradiated, leukoreduced, CMV-safe, group O Rh-matched donor unit', 'Plan post-procedure monitoring and repeat IUT interval'] },
      { condition: 'Hydropic fetus', actions: ['Use conservative initial volumes', 'Consider GA-based blood-volume tables', 'Intensify post-procedure surveillance'] },
    ],
    pearls: [
      'Target post-IUT hematocrit is usually 45–50%.',
      'Donor units for IUT are concentrated (~75–80% Hct), fresh, irradiated, and leukoreduced.',
      'The dilution formula assumes rapid equilibration — post-transfusion sampling verifies the achieved hematocrit.',
    ],
  },

  // ─── 8. RhIG dose ─────────────────────────────────────────────────────────
  {
    id: 'rhig-dose',
    name: 'Maternal-Fetal Hemorrhage Rh(D) Immune Globulin Dosage',
    shortName: 'RhIG dose',
    description:
      'Calculates the number of RhIG (RhD immune globulin) vials needed after delivery or fetomaternal hemorrhage based on the Kleihauer-Betke fetal-cell percentage.',
    category: 'obstetrics',
    tags: ['rhig', 'rhogam', 'rh d', 'kleihauer', 'fetomaternal hemorrhage', 'alloimmunization', 'hdfn'],
    whenToUse:
      'An RhD-negative mother delivers an RhD-positive infant, or a fetomaternal hemorrhage is quantified by Kleihauer-Betke/flow cytometry — determine the number of 300-µg RhIG vials required.',
    whyUse:
      'One 300-µg vial covers ~30 mL of fetal whole blood; large fetomaternal hemorrhages need additional vials to prevent RhD alloimmunization and future HDFN.',
    inputs: [
      numberInput('maternalBv', 'Maternal blood volume', { unit: 'mL', min: 2000, max: 10000, exampleValue: 5000, helpText: 'Estimated maternal blood volume (~70 mL/kg; e.g., 75 kg ≈ 5,250 mL). Use the institutional estimate if available.' }),
      numberInput('fetalPct', 'Fetal cells in maternal circulation', { unit: '%', min: 0, max: 30, step: 0.01, exampleValue: 0.6, helpText: 'Percentage of fetal red cells from Kleihauer-Betke stain or flow cytometry (0.6% ≈ 30 mL fetal blood in a 5,000-mL maternal volume).' }),
    ],
    calculate(values) {
      const bv = num(values.maternalBv, 5000);
      const pct = num(values.fetalPct, 0.6);
      const fetalMl = (pct / 100) * bv;
      const raw = fetalMl / 30;
      // Standard rule: round to the nearest whole number, then add one vial
      // (conservative; some institutions round up first — noted in pearls).
      const vials = Math.max(1, Math.round(raw) + 1);
      return {
        score: vials,
        unit: 'vials (300 µg)',
        label: `${vials} × 300-µg RhIG vial${vials === 1 ? '' : 's'}`,
        interpretation: `Estimated fetomaternal hemorrhage ≈ ${round(fetalMl, 0)} mL fetal blood (${pct}% of ${round(
          bv,
          0
        )} mL). Each 300-µg vial covers ~30 mL fetal blood → ${round(raw, 1)} vial-equivalents; rounding then adding one gives ${vials} vial(s).`,
        riskLevel: 'info',
        details: [
          { label: 'Fetal blood volume', value: `${round(fetalMl, 0)} mL` },
          { label: 'Raw vial-equivalents', value: `${round(raw, 2)} (= ${round(fetalMl, 0)}/30)` },
          { label: 'RhIG dose (rounded + 1)', value: `${vials} × 300 µg` },
        ],
        recommendations: [
          'Administer RhIG within 72 h of delivery or sensitizing event (sooner if possible); it may still help if given late.',
          'Routine antenatal RhIG at ~28 weeks plus postpartum prophylaxis per guidelines.',
          'Confirm the fetal-cell percentage method (KB stain vs flow cytometry) and institutional rounding policy.',
        ],
      };
    },
    evidence: {
      summary:
        'Fetal blood volume = % fetal cells × maternal blood volume. Each 300-µg RhIG vial covers ~30 mL of fetal whole blood (15 mL fetal RBCs). The standard rule rounds the vial-equivalents to the nearest whole number and adds one vial.',
      formula: 'Vials = round(%fetal × maternal BV ÷ 30 mL) + 1',
      validation:
        'Matches the published transfusion-medicine formula and AABB practice; rounding conventions vary slightly by institution (some round up then add one) — the implemented rule is the common textbook method.',
      references: [
        {
          title: 'Immunohematology, Transfusion Medicine, Hemostasis, and Cellular Therapy (RhIG dose formula)',
          citation: 'Transfusion medicine textbook. Springer. 2023',
          year: 2023,
          doi: '10.1007/978-3-031-14638-1',
        },
        {
          title: 'ACOG Practice Bulletin No. 192: Management of Alloimmunization During Pregnancy',
          citation: 'American College of Obstetricians and Gynecologists. Obstet Gynecol. 2018',
          year: 2018,
        },
      ],
    },
    nextSteps: [
      { condition: 'KB positive / fetal cells detected', actions: ['Administer calculated RhIG vials promptly (≤72 h)', 'Repeat KB testing if a very large FMH is suspected to confirm coverage'] },
      { condition: 'Routine postpartum RhD-negative mother, RhD-positive infant', actions: ['KB/flow-cytometry screening per protocol', 'At least one 300-µg vial even if KB is negative'] },
    ],
    pearls: [
      'A KB of 0.6% ≈ 30 mL fetal blood in a 5,000-mL maternal volume — exactly one 300-µg vial-equivalent.',
      'Under-dosing risks alloimmunization; when in doubt round up.',
      'MICRhoGAM 50 µg is used for early pregnancy events (<12 weeks) where fetal-cell volumes are tiny.',
    ],
  },

  // ─── 9. Neonatal partial exchange ─────────────────────────────────────────
  {
    id: 'neonatal-exchange-polycythemia',
    name: 'Neonatal Partial Exchange Transfusion for Polycythemia',
    shortName: 'Partial exchange',
    description:
      'Estimates the blood volume to remove (and crystalloid to infuse) for partial exchange transfusion in neonatal polycythemia.',
    category: 'pediatrics',
    tags: ['neonate', 'polycythemia', 'partial exchange', 'hyperviscosity', 'nicu'],
    whenToUse:
      'A neonate with symptomatic polycythemia (typically venous Hct ≥65%) or very high Hct (>70%) in whom partial dilutional exchange with isotonic saline is planned.',
    whyUse:
      'Calculates an isovolemic exchange volume to lower hematocrit to ~50–55% while avoiding hypovolemia and the NEC risk associated with colloid/FFP replacement.',
    inputs: [
      numberInput('weight', 'Patient weight', { unit: 'g', min: 300, max: 6000, exampleValue: 3200, helpText: 'Birth/actual weight in grams.' }),
      selectInput('ga', 'Gestational age', [
        { label: 'Term', value: 'term' },
        { label: 'Pre-term', value: 'preterm' },
      ], 'term', 'Estimated blood volume ~90 mL/kg in term infants and ~100 mL/kg in preterm infants (hypervolemia is common in polycythemia).'),
      numberInput('hctInit', 'Hematocrit, initial', { unit: '%', min: 30, max: 90, exampleValue: 70, helpText: 'Venous/central hematocrit before exchange (%).' }),
      numberInput('hctGoal', 'Hematocrit, goal', { unit: '%', min: 40, max: 65, exampleValue: 55, helpText: 'Target hematocrit — usually 50–55%.' }),
    ],
    calculate(values) {
      const wG = num(values.weight, 3200);
      const wKg = wG / 1000;
      const bvMlKg = str(values.ga, 'term') === 'preterm' ? 100 : 90;
      const hi = num(values.hctInit, 70);
      const hg = num(values.hctGoal, 55);
      const delta = hi - hg;
      const vol = delta > 0 ? wKg * bvMlKg * (delta / hi) : 0;
      return {
        score: round(vol, 0),
        unit: 'mL',
        label: `Exchange ~${round(vol, 0)} mL`,
        interpretation:
          delta <= 0
            ? `Initial hematocrit (${hi}%) is already at or below the goal (${hg}%) — partial exchange is not indicated by this calculation.`
            : `Remove ≈${round(vol, 0)} mL of whole blood and infuse an equal volume of 0.9% saline to lower hematocrit from ${hi}% toward ${hg}% (estimated blood volume ${round(
                wKg * bvMlKg,
                0
              )} mL at ${bvMlKg} mL/kg). Perform in aliquots ≤5 mL/kg.`,
        riskLevel: 'info',
        details: [
          { label: 'Weight', value: `${wG} g (${round(wKg, 2)} kg)` },
          { label: 'Estimated blood volume', value: `${round(wKg * bvMlKg, 0)} mL` },
          { label: 'Volume per kg', value: `${round(vol / Math.max(wKg, 0.01), 1)} mL/kg` },
        ],
        recommendations: [
          'Use isotonic crystalloid (0.9% NaCl) — plasma/albumin may add viscosity and FFP is associated with NEC risk.',
          'Exchange in aliquots ≤5 mL/kg over 2–3 min each, withdraw-then-infuse; UAC preferred route per institutional protocol.',
          'Recheck hematocrit after exchange and monitor for NEC and hemodynamic instability.',
        ],
      };
    },
    evidence: {
      summary:
        'Exchange volume = weight (kg) × estimated blood volume (mL/kg) × (initial − desired Hct) ÷ initial Hct. Estimated blood volume ~90 mL/kg term and ~100 mL/kg preterm (hypervolemia is common). Normal saline is the recommended replacement.',
      formula: 'V = weight × BV (mL/kg) × (Hct_i − Hct_d)/Hct_i',
      validation:
        'Formula matches published neonatal partial-exchange protocols (UCSF Benioff consensus uses 90 mL/kg; WA CAHS guideline uses 80 mL/kg; literature cites 80–100 mL/kg by gestation). The implemented 90/100 mL/kg split is within the published range.',
      references: [
        {
          title: 'Consensus Guidelines for Partial Exchange Transfusion for Polycythemia in Neonates',
          citation: 'UCSF Benioff Children’s Hospitals',
          url: 'https://medconnection.ucsfbenioffchildrens.org/polycythemia-guidelines',
        },
        {
          title: 'Yenidoğan polisitemisinde kısmi kan değişimi (partial exchange formula and blood volumes)',
          citation: 'Turk Pediatri Ars. 2020',
          year: 2020,
          doi: '10.4274/tpa.588',
        },
      ],
    },
    nextSteps: [
      { condition: 'Symptomatic infant, Hct ≥65% (or >70% asymptomatic per policy)', actions: ['Proceed with partial exchange per NICU protocol', 'Check glucose, calcium, perfusion; monitor for NEC'] },
      { condition: 'Borderline Hct 60–65%', actions: ['Assess symptoms; conservative management acceptable in many cases', 'Repeat Hct on a central/venous sample (capillary Hct runs high)'] },
    ],
    pearls: [
      'Calculated exchange volume in a term infant is typically ~20–40 mL/kg; re-check the math if far outside this range.',
      'Do not perform simple phlebotomy — removing volume without replacement lowers blood pressure and can worsen viscosity.',
      'Confirm polycythemia on a venous/central sample; capillary heel-stick hematocrits overestimate.',
    ],
  },

  // ─── 10. Sickle cell exchange ─────────────────────────────────────────────
  {
    id: 'sickle-rbc-exchange',
    name: 'Sickle Cell RBC Exchange Volume',
    shortName: 'RBC exchange',
    description:
      'Estimates the volume of donor RBCs needed for manual/simple red-cell exchange in sickle cell disease to reach a target HbS fraction (Nadler blood-volume model).',
    category: 'hematology',
    tags: ['sickle cell', 'red cell exchange', 'rbcx', 'apheresis', 'hbs', 'transfusion'],
    whenToUse:
      'Estimating donor RBC volume for red-cell exchange in sickle cell disease to reduce HbS to a target percentage (e.g., <30%) while maintaining hematocrit.',
    whyUse:
      'Exchange transfusion requires a planned donor volume; a weight/height/hematocrit-based estimate prevents under- or over-ordering of units for the procedure.',
    inputs: [
      selectInput('sex', 'Patient sex', [
        { label: 'Female', value: 'F' },
        { label: 'Male', value: 'M' },
      ], 'M', 'Sex enters the Nadler total-blood-volume equation.'),
      numberInput('height', 'Patient height', { unit: 'cm', min: 60, max: 230, exampleValue: 170, helpText: 'Height in cm for the Nadler blood-volume formula.' }),
      numberInput('weight', 'Patient weight', { unit: 'kg', unitKind: 'weight', min: 10, max: 300, exampleValue: 70, helpText: 'Actual body weight (kg) for the Nadler formula.' }),
      numberInput('hct', 'Patient hematocrit', { unit: '%', min: 10, max: 50, exampleValue: 27, helpText: 'Current hematocrit (%) — typical sickle-cell baselines are ~25–30%.' }),
      numberInput('hbsInit', 'Patient initial HgbS', { unit: '%', min: 1, max: 100, exampleValue: 80, helpText: 'Pre-exchange hemoglobin S fraction. If unknown for an acute exchange, 100% may be assumed (conservative).' }),
      numberInput('hbsGoal', 'Goal HgbS', { unit: '%', min: 0, max: 90, exampleValue: 30, helpText: 'Target post-exchange HbS — commonly ≤30% for acute complications and chronic exchange programs.' }),
      numberInput('hctDonor', 'Hematocrit of transfused RBCs', { unit: '%', min: 40, max: 90, exampleValue: 60, helpText: 'Hematocrit of the donor RBC units (~55–70% depending on additive solution).' }),
    ],
    calculate(values) {
      const sex = str(values.sex, 'M');
      const h = num(values.height, 170);
      const w = num(values.weight, 70);
      const hct = clamp(num(values.hct, 27), 1, 80) / 100;
      const si = Math.max(num(values.hbsInit, 80), 1);
      const sg = clamp(num(values.hbsGoal, 30), 0, si);
      const hd = clamp(num(values.hctDonor, 60), 10, 100) / 100;
      const tbv = nadlerTBVL(sex, h, w) * 1000; // mL
      const rbcVol = tbv * hct;
      const fracReplace = (si - sg) / si;
      const donorMass = rbcVol * fracReplace;
      const donorVol = donorMass / hd;
      const units = donorVol / 350;
      const fcr = sg / si;
      return {
        score: round(donorVol, 0),
        unit: 'mL',
        label: `~${round(donorVol, 0)} mL donor RBCs (~${round(units, 1)} units)`,
        interpretation: `To reduce HbS from ${si}% to ${sg}% (fraction of cells remaining ≈ ${round(
          fcr * 100,
          0
        )}%), replace ≈${round(donorMass, 0)} mL of patient RBC mass → order ≈${round(donorVol, 0)} mL of donor RBCs at Hct ${round(
          hd * 100,
          0
        )}% (~${round(units, 1)} units at 350 mL/unit). This is the simple linear dilution estimate; automated apheresis devices use a logarithmic model and may differ.`,
        riskLevel: 'info',
        details: [
          { label: 'Total blood volume (Nadler)', value: `${round(tbv, 0)} mL` },
          { label: 'Patient RBC volume', value: `${round(rbcVol, 0)} mL` },
          { label: 'RBC mass to replace', value: `${round(donorMass, 0)} mL (${round(fracReplace * 100, 0)}%)` },
          { label: 'Approx. units (350 mL each)', value: String(round(units, 1)) },
        ],
        recommendations: [
          'Use leukoreduced, hemoglobin-S-negative units; extended matching (C, E, K; ± full phenotype/genotype) reduces alloimmunization in SCD.',
          'Keep post-exchange hematocrit ≤~30–33% to avoid hyperviscosity.',
          'Automated erythrocytapheresis devices compute their own volumes (FCR method) — reconcile this estimate with the device calculation.',
        ],
      };
    },
    evidence: {
      summary:
        'Total blood volume by Nadler (1962); patient RBC volume = TBV × Hct. Fraction of RBC mass to replace = (initial − goal HbS)/initial HbS; donor volume = replaced RBC mass ÷ donor-unit hematocrit. Units ≈ volume ÷ 350 mL.',
      formula: 'Donor volume = TBV × Hct × (HbS_i − HbS_goal)/HbS_i ÷ Hct_donor',
      validation:
        'Matches standard manual-exchange estimates; automated devices (e.g., Spectra Optia) use a logarithmic FCR model that may yield different volumes — noted in the result. ASH 2020 guidelines endorse exchange for defined indications.',
      references: [
        {
          title: 'American Society of Hematology 2020 guidelines for sickle cell disease: transfusion support',
          citation: 'Chou ST, Alsawas M, Fasano RM, et al. Blood Adv. 2020;4(2):327-355',
          year: 2020,
          doi: '10.1182/bloodadvances.2019001143',
        },
        {
          title: 'Prediction of blood volume in normal human adults',
          citation: 'Nadler SB, Hidalgo JU, Bloch T. Surgery. 1962;51:224-232',
          year: 1962,
          pmid: '21984146',
        },
      ],
    },
    nextSteps: [
      { condition: 'Acute indication (e.g., severe ACS, stroke, multi-organ failure)', actions: ['Arrange urgent exchange per protocol; consult apheresis/hematology', 'Target post-exchange HbS ≤30% and Hct ≤30–33%'] },
      { condition: 'Chronic exchange program', actions: ['Track pre/post HbS and Hct to refine future volumes', 'Screen for alloimmunization and iron overload'] },
    ],
    pearls: [
      'If pre-exchange HbS% is unavailable for an acute exchange, presuming 100% gives a conservative volume.',
      'Fraction of cells remaining (FCR) = goal HbS ÷ initial HbS — apheresis devices are programmed with this ratio.',
      'Simple top-up transfusion raises Hct but cannot rapidly lower HbS% without exchange when Hb is already near target.',
    ],
  },

  // ─── 11. HFA-ICOS anthracycline ───────────────────────────────────────────
  {
    id: 'hfa-icos-anthracycline',
    name: 'HFA-ICOS Baseline Cardio-Oncology Risk Assessment — Anthracycline Chemotherapy',
    shortName: 'HFA-ICOS anthracycline',
    description:
      'Stratifies baseline cardiovascular toxicity risk (low/medium/high/very high) in patients scheduled to receive anthracycline chemotherapy, per the HFA-ICOS proforma adopted by the 2022 ESC cardio-oncology guidelines.',
    category: 'oncology',
    tags: ['cardio-oncology', 'anthracycline', 'hfa-icos', 'cardiotoxicity', 'ctrcd', 'doxorubicin'],
    whenToUse:
      'Before starting anthracycline-based chemotherapy (e.g., doxorubicin, epirubicin) to stratify baseline risk of cancer therapy-related cardiovascular toxicity.',
    whyUse:
      'The HFA-ICOS proforma standardizes baseline risk stratification and guides cardio-oncology referral, risk-factor optimization, and surveillance intensity (ESC 2022 class IIa).',
    inputs: [
      yesNo('hf', 'Heart failure or cardiomyopathy', null, 'Pre-existing HF/cardiomyopathy or prior cancer therapy-related cardiac dysfunction — a VERY-HIGH-risk factor.', false),
      yesNo('vhd', 'Severe valvular heart disease', null, 'Severe VHD — high-risk factor.', false),
      yesNo('mi', 'Myocardial infarction or previous coronary revascularisation (PCI or CABG)', null, 'Prior MI or coronary revascularization — high-risk factor.', false),
      yesNo('angina', 'Stable angina', null, 'Stable angina — high-risk factor.', false),
      selectInput('lvef', 'Baseline LVEF', [
        { label: '>54%', value: 'normal' },
        { label: '50–54%', value: 'borderline' },
        { label: '<50%', value: 'low' },
      ], 'normal', 'LVEF <50% = high-risk factor; 50–54% = medium-2 (2 points).'),
      yesNo('ctn', 'Elevated baseline troponin', null, 'Above the local laboratory ULN — medium-1 (1 point).', false),
      yesNo('np', 'Elevated baseline BNP or NT-proBNP', null, 'Above the local laboratory ULN — medium-1 (1 point).', false),
      selectInput('age', 'Age', [
        { label: '<65 years', value: 'lt65' },
        { label: '65–79 years', value: 'a6579' },
        { label: '≥80 years', value: 'ge80' },
      ], 'lt65', 'Age ≥80 = high-risk factor; 65–79 = medium-2 (2 points).'),
      yesNo('htn', 'Hypertension', null, 'SBP >140 or DBP >90 mmHg, or on treatment — medium-1 (1 point).', false),
      yesNo('dm', 'Diabetes mellitus', null, 'HbA1c >7.0% (>53 mmol/mol) or on treatment — medium-1 (1 point).', false),
      yesNo('ckd', 'Chronic kidney disease', null, 'eGFR <60 mL/min/1.73 m² — medium-1 (1 point).', false),
      yesNo('prevAnthra', 'Previous anthracycline exposure', null, 'Prior anthracycline treatment — high-risk factor. Also weigh planned cumulative dose (≥250 mg/m² doxorubicin-equivalent is higher risk).', false),
      yesNo('rt', 'Prior radiotherapy to left chest or mediastinum', null, 'Left chest/mediastinal RT — high-risk factor.', false),
      yesNo('nonAnthra', 'Previous non-anthracycline-based chemotherapy', null, 'Other prior chemotherapy — medium-1 (1 point).', false),
      yesNo('smoke', 'Current smoker or significant smoking history', null, 'Medium-1 (1 point).', false),
      yesNo('obese', 'Obesity (BMI >30 kg/m²)', null, 'Medium-1 (1 point).', false),
    ],
    calculate(values) {
      const items: HfaContribution[] = [];
      m('vh', 0, 'Heart failure or cardiomyopathy', items, bool(values.hf));
      m('h', 0, 'Severe valvular heart disease', items, bool(values.vhd));
      m('h', 0, 'MI or previous coronary revascularisation', items, bool(values.mi));
      m('h', 0, 'Stable angina', items, bool(values.angina));
      const lv = str(values.lvef, 'normal');
      if (lv === 'low') items.push({ label: 'LVEF <50%', level: 'h', points: 0 });
      else if (lv === 'borderline') items.push({ label: 'LVEF 50–54%', level: 'm2', points: 2 });
      m('m1', 1, 'Elevated baseline troponin', items, bool(values.ctn));
      m('m1', 1, 'Elevated baseline BNP/NT-proBNP', items, bool(values.np));
      const age = str(values.age, 'lt65');
      if (age === 'ge80') items.push({ label: 'Age ≥80', level: 'h', points: 0 });
      else if (age === 'a6579') items.push({ label: 'Age 65–79', level: 'm2', points: 2 });
      m('m1', 1, 'Hypertension', items, bool(values.htn));
      m('m1', 1, 'Diabetes mellitus', items, bool(values.dm));
      m('m1', 1, 'Chronic kidney disease', items, bool(values.ckd));
      m('h', 0, 'Previous anthracycline exposure', items, bool(values.prevAnthra));
      m('h', 0, 'Prior left chest/mediastinal RT', items, bool(values.rt));
      m('m1', 1, 'Previous non-anthracycline chemotherapy', items, bool(values.nonAnthra));
      m('m1', 1, 'Smoking', items, bool(values.smoke));
      m('m1', 1, 'Obesity', items, bool(values.obese));
      return hfaIcosResult(items, 'anthracycline chemotherapy');
    },
    evidence: {
      summary:
        'HFA-ICOS anthracycline proforma: HF/cardiomyopathy = very high; severe VHD, MI/PCI/CABG, stable angina, LVEF <50%, age ≥80, prior anthracycline, prior left chest/mediastinal RT = high; LVEF 50–54% and age 65–79 = 2 medium points each; elevated troponin/NP, hypertension, diabetes, CKD, prior non-anthracycline chemo, smoking, obesity = 1 point each.',
      formula: 'VH factor → very high; H factor or ≥5 medium points → high; 2–4 medium points → medium; 0–1 → low',
      validation:
        'Items and levels follow the published HFA-ICOS proforma (Eur J Heart Fail 2020) and the consolidated table in the 2022 ESC cardio-oncology guidelines. Validated against the CARDIOTOX registry (Eur Heart J 2024, doi:10.1093/eurheartj/ehae496) showing graded CTRCD risk across categories.',
      references: [...HFA_REFS],
    },
    nextSteps: [...HFA_MANAGEMENT],
    pearls: [
      'Cumulative anthracycline dose also matters — ≥250 mg/m² doxorubicin-equivalent is considered higher risk.',
      'Consider dexrazoxane or liposomal formulations in high/very-high-risk patients when anthracyclines are indicated.',
      ...HFA_PEARLS,
    ],
  },

  // ─── 12. HFA-ICOS HER2 ────────────────────────────────────────────────────
  {
    id: 'hfa-icos-her2',
    name: 'HFA-ICOS Baseline Cardio-Oncology Risk Assessment — HER2-Targeted Therapies',
    shortName: 'HFA-ICOS HER2',
    description:
      'Stratifies baseline cardiovascular toxicity risk in patients scheduled to receive HER2-targeted therapy (trastuzumab, pertuzumab, T-DM1, lapatinib, neratinib, tucatinib).',
    category: 'oncology',
    tags: ['cardio-oncology', 'her2', 'trastuzumab', 'hfa-icos', 'cardiotoxicity', 'breast cancer'],
    whenToUse:
      'Before starting HER2-targeted therapy (trastuzumab-containing regimens, T-DM1, HER2 TKIs) to stratify baseline cardiotoxicity risk.',
    whyUse:
      'HER2 therapy-related LV dysfunction is usually reversible but requires baseline stratification to set echo/biomarker surveillance and cardio-oncology referral thresholds.',
    inputs: [
      yesNo('hf', 'Heart failure or cardiomyopathy', null, 'Pre-existing HF/cardiomyopathy/CTRCD — VERY-HIGH-risk factor.', false),
      yesNo('vhd', 'Severe valvular heart disease', null, 'High-risk factor.', false),
      yesNo('mi', 'Myocardial infarction or CABG', null, 'Prior MI or CABG — high-risk factor.', false),
      yesNo('angina', 'Stable angina', null, 'High-risk factor.', false),
      selectInput('lvef', 'Baseline LVEF', [
        { label: '>54%', value: 'normal' },
        { label: '50–54%', value: 'borderline' },
        { label: '<50%', value: 'low' },
      ], 'normal', 'LVEF <50% = high-risk factor; 50–54% = medium-2 (2 points).'),
      yesNo('arr', 'Arrhythmia', null, 'AF, atrial flutter, VT or VF — medium-2 (2 points).', false),
      yesNo('ctn', 'Elevated baseline troponin', null, 'Above local ULN — medium-2 (2 points).', false),
      yesNo('np', 'Elevated baseline BNP or NT-proBNP', null, 'Above local ULN — medium-2 (2 points).', false),
      selectInput('age', 'Age', [
        { label: '<65 years', value: 'lt65' },
        { label: '65–79 years', value: 'a6579' },
        { label: '≥80 years', value: 'ge80' },
      ], 'lt65', 'Age ≥80 = high-risk factor; 65–79 = medium-2 (2 points).'),
      yesNo('htn', 'Hypertension', null, 'SBP >140 or DBP >90 mmHg, or on treatment — medium-1 (1 point).', false),
      yesNo('dm', 'Diabetes mellitus', null, 'HbA1c >7% or on treatment — medium-1 (1 point).', false),
      yesNo('ckd', 'Chronic kidney disease', null, 'eGFR <60 — medium-1 (1 point).', false),
      selectInput('anthra', 'Anthracycline in current regimen', [
        { label: 'None', value: 'none' },
        { label: 'Sequential — anthracycline before HER2 therapy', value: 'seq' },
        { label: 'Concurrent anthracycline + HER2 therapy', value: 'concurrent' },
      ], 'none', 'Sequential anthracycline in the current protocol = medium-1 (1 point); concurrent anthracycline + trastuzumab = high risk per the proforma footnote.'),
      yesNo('prevTrast', 'Prior trastuzumab cardiotoxicity', null, 'Previous HER2-therapy-related cardiotoxicity — VERY-HIGH-risk factor.', false),
      yesNo('prevAnthra', 'Prior (remote) anthracycline exposure', null, 'Anthracycline for a previous malignancy (not the current protocol) — medium-2 (2 points).', false),
      yesNo('rt', 'Prior radiotherapy to left chest or mediastinum', null, 'Medium-2 (2 points).', false),
      yesNo('smoke', 'Current smoker or significant smoking history', null, 'Medium-1 (1 point).', false),
      yesNo('obese', 'Obesity (BMI >30 kg/m²)', null, 'Medium-1 (1 point).', false),
    ],
    calculate(values) {
      const items: HfaContribution[] = [];
      m('vh', 0, 'Heart failure or cardiomyopathy', items, bool(values.hf));
      m('h', 0, 'Severe valvular heart disease', items, bool(values.vhd));
      m('h', 0, 'MI or CABG', items, bool(values.mi));
      m('h', 0, 'Stable angina', items, bool(values.angina));
      const lv = str(values.lvef, 'normal');
      if (lv === 'low') items.push({ label: 'LVEF <50%', level: 'h', points: 0 });
      else if (lv === 'borderline') items.push({ label: 'LVEF 50–54%', level: 'm2', points: 2 });
      m('m2', 2, 'Arrhythmia', items, bool(values.arr));
      m('m2', 2, 'Elevated baseline troponin', items, bool(values.ctn));
      m('m2', 2, 'Elevated baseline BNP/NT-proBNP', items, bool(values.np));
      const age = str(values.age, 'lt65');
      if (age === 'ge80') items.push({ label: 'Age ≥80', level: 'h', points: 0 });
      else if (age === 'a6579') items.push({ label: 'Age 65–79', level: 'm2', points: 2 });
      m('m1', 1, 'Hypertension', items, bool(values.htn));
      m('m1', 1, 'Diabetes mellitus', items, bool(values.dm));
      m('m1', 1, 'Chronic kidney disease', items, bool(values.ckd));
      const an = str(values.anthra, 'none');
      if (an === 'concurrent') items.push({ label: 'Concurrent anthracycline + HER2 therapy', level: 'h', points: 0 });
      else if (an === 'seq') items.push({ label: 'Sequential anthracycline before HER2 therapy', level: 'm1', points: 1 });
      m('vh', 0, 'Prior trastuzumab cardiotoxicity', items, bool(values.prevTrast));
      m('m2', 2, 'Prior (remote) anthracycline exposure', items, bool(values.prevAnthra));
      m('m2', 2, 'Prior left chest/mediastinal RT', items, bool(values.rt));
      m('m1', 1, 'Smoking', items, bool(values.smoke));
      m('m1', 1, 'Obesity', items, bool(values.obese));
      return hfaIcosResult(items, 'HER2-targeted therapy');
    },
    evidence: {
      summary:
        'HFA-ICOS HER2 proforma: HF/cardiomyopathy and prior trastuzumab cardiotoxicity = very high; severe VHD, MI/CABG, stable angina, LVEF <50%, age ≥80, concurrent anthracycline + trastuzumab = high; LVEF 50–54%, arrhythmia, elevated troponin/NP, age 65–79, remote anthracycline, prior mediastinal RT = 2 points; sequential anthracycline, hypertension, diabetes, CKD, smoking, obesity = 1 point.',
      formula: 'VH → very high; H or ≥5 medium points → high; 2–4 → medium; 0–1 → low',
      validation:
        'Item levels follow the 2020 HFA-ICOS proforma and the consolidated 2022 ESC table, including the footnote that concurrent anthracycline + trastuzumab is high risk. Anthracycline exposure is split into current-regimen and remote items per the proforma.',
      references: [...HFA_REFS],
    },
    nextSteps: [...HFA_MANAGEMENT],
    pearls: [
      'Avoid concurrent anthracycline + trastuzumab when possible — sequential administration lowers risk.',
      'HER2-related dysfunction is often asymptomatic LVEF decline that recovers after interruption — surveillance is the point of this stratification.',
      ...HFA_PEARLS,
    ],
  },

  // ─── 13. HFA-ICOS VEGF ────────────────────────────────────────────────────
  {
    id: 'hfa-icos-vegf',
    name: 'HFA-ICOS Baseline Cardio-Oncology Risk Assessment — VEGF Inhibitors',
    shortName: 'HFA-ICOS VEGF',
    description:
      'Stratifies baseline cardiovascular toxicity risk before VEGF-pathway inhibitor therapy (bevacizumab, ramucirumab, aflibercept; sunitinib, sorafenib, pazopanib, axitinib, cabozantinib, lenvatinib, regorafenib, vandetanib).',
    category: 'oncology',
    tags: ['cardio-oncology', 'vegf', 'sunitinib', 'bevacizumab', 'hfa-icos', 'hypertension', 'cardiotoxicity'],
    whenToUse:
      'Before starting VEGF inhibitors/VEGF-pathway TKIs to stratify risk of hypertension, LV dysfunction, thrombosis, QTc prolongation, and other CV toxicity.',
    whyUse:
      'VEGF inhibitors cause early CV toxicity (hypertension in up to ~80%); baseline stratification guides BP control, ECG/echo surveillance, and cardio-oncology referral.',
    inputs: [
      yesNo('hf', 'Heart failure or cardiomyopathy', null, 'Pre-existing HF/cardiomyopathy/CTRCD — VERY-HIGH-risk factor.', false),
      yesNo('avd', 'Arterial vascular disease (IHD, PCI, CABG, stable angina, TIA, stroke, PVD)', null, 'Any established arterial vascular disease — VERY-HIGH-risk factor for VEGFi.', false),
      yesNo('vt', 'Venous thrombosis (DVT or PE)', null, 'Prior VTE — high-risk factor for VEGFi.', false),
      selectInput('lvef', 'Baseline LVEF', [
        { label: '>54%', value: 'normal' },
        { label: '50–54%', value: 'borderline' },
        { label: '<50%', value: 'low' },
      ], 'normal', 'LVEF <50% = high-risk factor; 50–54% = medium-2 (2 points).'),
      selectInput('qtc', 'QTc', [
        { label: '<450 ms (men) or <460 ms (women)', value: 'normal' },
        { label: '450 to <480 ms (men) or 460 to <480 ms (women)', value: 'borderline' },
        { label: '≥480 ms', value: 'long' },
      ], 'normal', 'QTc ≥480 ms = high-risk factor; borderline QTc = medium-2 (2 points).'),
      yesNo('arr', 'Arrhythmia', null, 'AF, atrial flutter, VT or VF — medium-2 (2 points).', false),
      yesNo('ctn', 'Elevated baseline troponin', null, 'Above local ULN — medium-1 (1 point).', false),
      yesNo('np', 'Elevated baseline BNP or NT-proBNP', null, 'Above local ULN — medium-1 (1 point).', false),
      selectInput('age', 'Age', [
        { label: '<65 years', value: 'lt65' },
        { label: '65–74 years', value: 'a6574' },
        { label: '≥75 years', value: 'ge75' },
      ], 'lt65', 'Age ≥75 = high-risk factor; 65–74 = medium-1 (1 point).'),
      yesNo('htn', 'Hypertension', null, 'SBP >140 or DBP >90 mmHg, or on treatment — HIGH-risk factor for VEGFi (hypertension is a dominant VEGFi toxicity).', false),
      yesNo('dm', 'Diabetes mellitus', null, 'HbA1c >7% or on treatment — medium-1 (1 point).', false),
      yesNo('hlp', 'Hyperlipidemia', null, 'Non-HDL cholesterol >3.8 mmol/L (>145 mg/dL) or on treatment — medium-1 (1 point).', false),
      yesNo('ckd', 'Chronic kidney disease', null, 'eGFR <60 — medium-1 (1 point).', false),
      yesNo('proteinuria', 'Proteinuria', null, 'Medium-1 (1 point).', false),
      yesNo('prevAnthra', 'Prior anthracycline exposure', null, 'High-risk factor.', false),
      yesNo('rt', 'Prior radiotherapy to left chest or mediastinum', null, 'Medium-1 (1 point).', false),
      yesNo('smoke', 'Current smoker or significant smoking history', null, 'Medium-1 (1 point).', false),
      yesNo('obese', 'Obesity (BMI >30 kg/m²)', null, 'Medium-1 (1 point).', false),
    ],
    calculate(values) {
      const items: HfaContribution[] = [];
      m('vh', 0, 'Heart failure or cardiomyopathy', items, bool(values.hf));
      m('vh', 0, 'Arterial vascular disease', items, bool(values.avd));
      m('h', 0, 'Venous thrombosis (DVT/PE)', items, bool(values.vt));
      const lv = str(values.lvef, 'normal');
      if (lv === 'low') items.push({ label: 'LVEF <50%', level: 'h', points: 0 });
      else if (lv === 'borderline') items.push({ label: 'LVEF 50–54%', level: 'm2', points: 2 });
      const qtc = str(values.qtc, 'normal');
      if (qtc === 'long') items.push({ label: 'QTc ≥480 ms', level: 'h', points: 0 });
      else if (qtc === 'borderline') items.push({ label: 'Borderline QTc', level: 'm2', points: 2 });
      m('m2', 2, 'Arrhythmia', items, bool(values.arr));
      m('m1', 1, 'Elevated baseline troponin', items, bool(values.ctn));
      m('m1', 1, 'Elevated baseline BNP/NT-proBNP', items, bool(values.np));
      const age = str(values.age, 'lt65');
      if (age === 'ge75') items.push({ label: 'Age ≥75', level: 'h', points: 0 });
      else if (age === 'a6574') items.push({ label: 'Age 65–74', level: 'm1', points: 1 });
      m('h', 0, 'Hypertension', items, bool(values.htn));
      m('m1', 1, 'Diabetes mellitus', items, bool(values.dm));
      m('m1', 1, 'Hyperlipidemia', items, bool(values.hlp));
      m('m1', 1, 'Chronic kidney disease', items, bool(values.ckd));
      m('m1', 1, 'Proteinuria', items, bool(values.proteinuria));
      m('h', 0, 'Prior anthracycline exposure', items, bool(values.prevAnthra));
      m('m1', 1, 'Prior left chest/mediastinal RT', items, bool(values.rt));
      m('m1', 1, 'Smoking', items, bool(values.smoke));
      m('m1', 1, 'Obesity', items, bool(values.obese));
      return hfaIcosResult(items, 'VEGF inhibitor therapy');
    },
    evidence: {
      summary:
        'HFA-ICOS VEGFi proforma (2022 ESC consolidated table): HF/cardiomyopathy and arterial vascular disease = very high; VTE, LVEF <50%, QTc ≥480 ms, age ≥75, hypertension, prior anthracycline = high; LVEF 50–54%, borderline QTc, arrhythmia = 2 points; elevated troponin/NP, age 65–74, diabetes, hyperlipidemia, CKD, proteinuria, mediastinal RT, smoking, obesity = 1 point.',
      formula: 'VH → very high; H or ≥5 medium points → high; 2–4 → medium; 0–1 → low',
      validation:
        'Follows the 2022 ESC consolidated table. Some third-party reproductions (e.g., ecgwaves) list arterial vascular disease as the only very-high factor and hypertension as medium — the ESC table grades both arterial disease AND HF/cardiomyopathy as very high and hypertension as high; this implementation follows the ESC guideline (primary source).',
      references: [...HFA_REFS],
    },
    nextSteps: [...HFA_MANAGEMENT],
    pearls: [
      'Baseline BP control is critical — target <140/90 mmHg before VEGFi; hypertension is both a risk factor and the dominant on-treatment toxicity.',
      'Check QTc at baseline — several VEGF TKIs prolong QT; correct electrolytes.',
      ...HFA_PEARLS,
    ],
  },

  // ─── 14. HFA-ICOS RAF/MEK ─────────────────────────────────────────────────
  {
    id: 'hfa-icos-raf-mek',
    name: 'HFA-ICOS Baseline Cardio-Oncology Risk Assessment — RAF and MEK Inhibitors',
    shortName: 'HFA-ICOS RAF/MEK',
    description:
      'Stratifies baseline cardiovascular toxicity risk before combination RAF + MEK inhibitor therapy (e.g., dabrafenib/trametinib, encorafenib/binimetinib, vemurafenib/cobimetinib).',
    category: 'oncology',
    tags: ['cardio-oncology', 'raf', 'mek', 'braf', 'hfa-icos', 'melanoma', 'cardiotoxicity'],
    whenToUse:
      'Before starting combination RAF/MEK inhibition (typically BRAF-mutant melanoma, NSCLC, ATC) to stratify risk of LV dysfunction, hypertension, and other CV toxicity.',
    whyUse:
      'MEK-inhibitor-containing regimens cause hypertension and reversible LV dysfunction in a meaningful minority; baseline risk guides echo surveillance and cardio-oncology referral.',
    inputs: [
      yesNo('hf', 'Heart failure or cardiomyopathy', null, 'Pre-existing HF/cardiomyopathy/CTRCD — VERY-HIGH-risk factor.', false),
      yesNo('mi', 'Myocardial infarction or CABG', null, 'High-risk factor.', false),
      yesNo('angina', 'Stable angina', null, 'High-risk factor.', false),
      yesNo('vhd', 'Severe valvular heart disease', null, 'High-risk factor.', false),
      selectInput('lvef', 'Baseline LVEF', [
        { label: '>54%', value: 'normal' },
        { label: '50–54%', value: 'borderline' },
        { label: '<50%', value: 'low' },
      ], 'normal', 'LVEF <50% = high-risk factor; 50–54% = medium-2 (2 points).'),
      yesNo('arr', 'Arrhythmia', null, 'AF, atrial flutter, VT or VF — medium-1 (1 point) for RAF/MEK.', false),
      yesNo('ctn', 'Elevated baseline troponin', null, 'Above local ULN — medium-2 (2 points).', false),
      yesNo('np', 'Elevated baseline BNP or NT-proBNP', null, 'Above local ULN — medium-2 (2 points).', false),
      selectInput('age', 'Age', [
        { label: '<60 years', value: 'lt60' },
        { label: '60–64 years', value: 'a6064' },
        { label: '65–79 years', value: 'a6579' },
        { label: '≥80 years', value: 'ge80' },
      ], 'lt60', 'Age ≥80 = high; 65–79 = medium-2 (2 points); ≥60 (60–64) = medium-1 (1 point).'),
      yesNo('htn', 'Hypertension', null, 'SBP >140 or DBP >90 mmHg, or on treatment — medium-1 (1 point).', false),
      yesNo('dm', 'Diabetes mellitus', null, 'HbA1c >7% or on treatment — medium-1 (1 point).', false),
      yesNo('ckd', 'Chronic kidney disease', null, 'eGFR <60 — medium-1 (1 point).', false),
      yesNo('prevAnthra', 'Prior anthracycline exposure', null, 'High-risk factor.', false),
      yesNo('rt', 'Prior radiotherapy to left chest or mediastinum', null, 'Medium-2 (2 points).', false),
      yesNo('smoke', 'Current smoker or significant smoking history', null, 'Medium-1 (1 point).', false),
      yesNo('obese', 'Obesity (BMI >30 kg/m²)', null, 'Medium-1 (1 point).', false),
    ],
    calculate(values) {
      const items: HfaContribution[] = [];
      m('vh', 0, 'Heart failure or cardiomyopathy', items, bool(values.hf));
      m('h', 0, 'MI or CABG', items, bool(values.mi));
      m('h', 0, 'Stable angina', items, bool(values.angina));
      m('h', 0, 'Severe valvular heart disease', items, bool(values.vhd));
      const lv = str(values.lvef, 'normal');
      if (lv === 'low') items.push({ label: 'LVEF <50%', level: 'h', points: 0 });
      else if (lv === 'borderline') items.push({ label: 'LVEF 50–54%', level: 'm2', points: 2 });
      m('m1', 1, 'Arrhythmia', items, bool(values.arr));
      m('m2', 2, 'Elevated baseline troponin', items, bool(values.ctn));
      m('m2', 2, 'Elevated baseline BNP/NT-proBNP', items, bool(values.np));
      const age = str(values.age, 'lt60');
      if (age === 'ge80') items.push({ label: 'Age ≥80', level: 'h', points: 0 });
      else if (age === 'a6579') items.push({ label: 'Age 65–79', level: 'm2', points: 2 });
      else if (age === 'a6064') items.push({ label: 'Age 60–64', level: 'm1', points: 1 });
      m('m1', 1, 'Hypertension', items, bool(values.htn));
      m('m1', 1, 'Diabetes mellitus', items, bool(values.dm));
      m('m1', 1, 'Chronic kidney disease', items, bool(values.ckd));
      m('h', 0, 'Prior anthracycline exposure', items, bool(values.prevAnthra));
      m('m2', 2, 'Prior left chest/mediastinal RT', items, bool(values.rt));
      m('m1', 1, 'Smoking', items, bool(values.smoke));
      m('m1', 1, 'Obesity', items, bool(values.obese));
      return hfaIcosResult(items, 'RAF + MEK inhibitor therapy');
    },
    evidence: {
      summary:
        'HFA-ICOS RAF/MEK proforma (2022 ESC consolidated table): HF/cardiomyopathy = very high; MI/CABG, stable angina, severe VHD, LVEF <50%, age ≥80, prior anthracycline = high; LVEF 50–54%, arrhythmia is M1 (others M2 — see below), elevated troponin/NP, age 65–79, prior mediastinal RT = 2 points; arrhythmia, hypertension, diabetes, CKD, age ≥60, smoking, obesity = 1 point.',
      formula: 'VH → very high; H or ≥5 medium points → high; 2–4 → medium; 0–1 → low',
      validation:
        'Follows the 2022 ESC consolidated table. Some simplified tools collapse age to a single ≥65 item and omit the LVEF <50% row (implicit in cardiomyopathy); this implementation uses the full proforma bands (age ≥60/65–79/≥80; LVEF three-band) for fidelity to the primary table.',
      references: [...HFA_REFS],
    },
    nextSteps: [...HFA_MANAGEMENT],
    pearls: [
      'MEK-inhibitor LV dysfunction is usually asymptomatic and reversible — scheduled echocardiography catches it early.',
      'Hypertension commonly worsens on RAF/MEK therapy; optimize BP at baseline.',
      ...HFA_PEARLS,
    ],
  },

  // ─── 15. HFA-ICOS BCR-ABL ─────────────────────────────────────────────────
  {
    id: 'hfa-icos-bcr-abl',
    name: 'HFA-ICOS Baseline Cardio-Oncology Risk Assessment — Multi-Targeted Kinase Inhibitors for CML',
    shortName: 'HFA-ICOS BCR-ABL',
    description:
      'Stratifies baseline cardiovascular toxicity risk in CML patients before second/third-generation BCR-ABL TKIs (ponatinib, nilotinib, dasatinib, bosutinib).',
    category: 'oncology',
    tags: ['cardio-oncology', 'cml', 'bcr-abl', 'tki', 'ponatinib', 'nilotinib', 'hfa-icos'],
    whenToUse:
      'Before starting a second- or third-generation BCR-ABL TKI for CML — especially ponatinib and nilotinib, which carry arterial-thrombotic and vascular risk.',
    whyUse:
      'Ponatinib/nilotinib arterial occlusive events concentrate in patients with baseline CV disease and risk factors; the proforma guides TKI selection and vascular surveillance.',
    inputs: [
      yesNo('avd', 'Arterial vascular disease (IHD, PCI, CABG, stable angina, TIA, stroke, PVD)', null, 'Established arterial vascular disease — VERY-HIGH-risk factor for BCR-ABL TKIs.', false),
      yesNo('tkiThromb', 'Arterial thrombosis with TKI', null, 'Arterial thrombotic event during previous TKI therapy — VERY-HIGH-risk factor.', false),
      yesNo('hf', 'Heart failure or LVSD', null, 'HF or LV systolic dysfunction — high-risk factor.', false),
      yesNo('tkiLvsd', 'Previous BCR-ABL TKI-mediated LVSD', null, 'LV systolic dysfunction attributed to a prior BCR-ABL TKI — VERY-HIGH-risk factor (prior same-class cardiotoxicity).', false),
      yesNo('abpi', 'Abnormal ankle-brachial index (≤0.9)', null, 'ABPI ≤0.9 — high-risk factor.', false),
      yesNo('pah', 'Pulmonary arterial hypertension', null, 'Resting peak systolic PA pressure ≥35 mmHg on echocardiography — high-risk factor.', false),
      yesNo('lvefLow', 'Baseline LVEF <50%', null, 'High-risk factor.', false),
      yesNo('vte', 'Venous thromboembolism (DVT/PE)', null, 'Medium-2 (2 points).', false),
      yesNo('arr', 'Arrhythmia', null, 'AF, atrial flutter, VT or VF — medium-2 (2 points).', false),
      selectInput('qtc', 'QTc', [
        { label: '<450 ms (men) or <460 ms (women)', value: 'normal' },
        { label: '450 to <480 ms (men) or 460 to <480 ms (women)', value: 'borderline' },
        { label: '≥480 ms', value: 'long' },
      ], 'normal', 'QTc ≥480 ms = high-risk factor (nilotinib prolongs QT); borderline = medium-2 (2 points).'),
      selectInput('age', 'Age', [
        { label: '<60 years', value: 'lt60' },
        { label: '60–64 years', value: 'a6064' },
        { label: '65–74 years', value: 'a6574' },
        { label: '≥75 years', value: 'ge75' },
      ], 'lt60', 'Age ≥75 = high; 65–74 = medium-2 (2 points); ≥60 (60–64) = medium-1 (1 point).'),
      yesNo('cvdScore', 'CVD 10-year risk score >20%', null, 'High 10-year cardiovascular risk estimate — high-risk factor.', false),
      yesNo('htn', 'Hypertension', null, 'SBP >140 or DBP >90 mmHg, or on treatment — medium-1 (1 point).', false),
      yesNo('dm', 'Diabetes mellitus', null, 'HbA1c >7% or on treatment — medium-1 (1 point).', false),
      yesNo('hlp', 'Hyperlipidemia', null, 'Non-HDL >3.8 mmol/L or on treatment — medium-1 (1 point).', false),
      yesNo('ckd', 'Chronic kidney disease', null, 'eGFR <60 — medium-1 (1 point).', false),
      yesNo('thrombophilia', 'Family history of thrombophilia', null, 'Medium-1 (1 point).', false),
      yesNo('smoke', 'Current smoker or significant smoking history', null, 'High-risk factor for BCR-ABL TKIs.', false),
      yesNo('obese', 'Obesity (BMI >30 kg/m²)', null, 'Medium-1 (1 point).', false),
    ],
    calculate(values) {
      const items: HfaContribution[] = [];
      m('vh', 0, 'Arterial vascular disease', items, bool(values.avd));
      m('vh', 0, 'Arterial thrombosis with TKI', items, bool(values.tkiThromb));
      m('h', 0, 'Heart failure or LVSD', items, bool(values.hf));
      m('vh', 0, 'Previous BCR-ABL TKI-mediated LVSD', items, bool(values.tkiLvsd));
      m('h', 0, 'Abnormal ABPI (≤0.9)', items, bool(values.abpi));
      m('h', 0, 'Pulmonary arterial hypertension', items, bool(values.pah));
      m('h', 0, 'Baseline LVEF <50%', items, bool(values.lvefLow));
      m('m2', 2, 'Venous thromboembolism', items, bool(values.vte));
      m('m2', 2, 'Arrhythmia', items, bool(values.arr));
      const qtc = str(values.qtc, 'normal');
      if (qtc === 'long') items.push({ label: 'QTc ≥480 ms', level: 'h', points: 0 });
      else if (qtc === 'borderline') items.push({ label: 'Borderline QTc', level: 'm2', points: 2 });
      const age = str(values.age, 'lt60');
      if (age === 'ge75') items.push({ label: 'Age ≥75', level: 'h', points: 0 });
      else if (age === 'a6574') items.push({ label: 'Age 65–74', level: 'm2', points: 2 });
      else if (age === 'a6064') items.push({ label: 'Age 60–64', level: 'm1', points: 1 });
      m('h', 0, 'CVD 10-year risk >20%', items, bool(values.cvdScore));
      m('m1', 1, 'Hypertension', items, bool(values.htn));
      m('m1', 1, 'Diabetes mellitus', items, bool(values.dm));
      m('m1', 1, 'Hyperlipidemia', items, bool(values.hlp));
      m('m1', 1, 'Chronic kidney disease', items, bool(values.ckd));
      m('m1', 1, 'Family history of thrombophilia', items, bool(values.thrombophilia));
      m('h', 0, 'Smoking', items, bool(values.smoke));
      m('m1', 1, 'Obesity', items, bool(values.obese));
      return hfaIcosResult(items, 'BCR-ABL TKI therapy for CML');
    },
    evidence: {
      summary:
        'HFA-ICOS BCR-ABL TKI proforma (2022 ESC consolidated table): arterial vascular disease and arterial thrombosis with TKI = very high; HF/LVSD, abnormal ABPI, pulmonary hypertension, LVEF <50%, QTc ≥480 ms, age ≥75, CVD risk >20%, smoking = high; VTE, arrhythmia, borderline QTc, age 65–74 = 2 points; age ≥60, hypertension, diabetes, hyperlipidemia, CKD, thrombophilia family history, obesity = 1 point. Previous BCR-ABL TKI-mediated LVSD is additionally graded very high (prior same-class cardiotoxicity).',
      formula: 'VH → very high; H or ≥5 medium points → high; 2–4 → medium; 0–1 → low',
      validation:
        'Follows the 2022 ESC consolidated table for item levels. "Previous BCR-ABL TKI-mediated LVSD" appears in the original proforma input set and is graded very high by analogy to other prior-drug-cardiotoxicity items (prior trastuzumab, prior PI cardiotoxicity = VH); flagged as the least-ambiguous reasonable grading in validation.',
      references: [...HFA_REFS],
    },
    nextSteps: [...HFA_MANAGEMENT],
    pearls: [
      'Arterial events (MI, stroke, PAOD) dominate ponatinib/nilotinib toxicity — the proforma weights vascular disease heavily.',
      'Consider imatinib or bosutinib (lower vascular toxicity) in high/very-high-risk patients when response goals permit.',
      'Dasatinib is associated with pleural effusion and pulmonary hypertension — PAH is a scored factor.',
      ...HFA_PEARLS,
    ],
  },

  // ─── 16. HFA-ICOS myeloma ─────────────────────────────────────────────────
  {
    id: 'hfa-icos-myeloma',
    name: 'HFA-ICOS Baseline Cardio-Oncology Risk Assessment — Multiple Myeloma Therapies',
    shortName: 'HFA-ICOS myeloma',
    description:
      'Stratifies baseline cardiovascular toxicity risk before multiple myeloma therapy with proteasome inhibitors (carfilzomib, bortezomib, ixazomib) and/or immunomodulatory drugs (lenalidomide, pomalidomide, thalidomide).',
    category: 'oncology',
    tags: ['cardio-oncology', 'myeloma', 'carfilzomib', 'proteasome inhibitor', 'imid', 'hfa-icos', 'amyloidosis'],
    whenToUse:
      'Before starting proteasome-inhibitor- or IMiD-containing myeloma regimens — especially carfilzomib, which carries hypertension/HF and thrombotic risk.',
    whyUse:
      'MM patients are often older with cardiac comorbidity and amyloidosis; baseline stratification guides cardioprotection, hydration strategy, thromboprophylaxis, and monitoring.',
    inputs: [
      yesNo('hf', 'Heart failure or cardiomyopathy', null, 'Pre-existing HF/cardiomyopathy/CTRCD — VERY-HIGH-risk factor.', false),
      yesNo('piTox', 'Prior proteasome inhibitor cardiotoxicity', null, 'CV toxicity attributed to a prior proteasome inhibitor — VERY-HIGH-risk factor.', false),
      yesNo('vte', 'Venous thrombosis (DVT or PE)', null, 'Prior VTE — VERY-HIGH-risk factor for MM therapy (IMiD thrombotic risk).', false),
      yesNo('amyloid', 'Cardiac amyloidosis', null, 'Cardiac (AL or other) amyloidosis — VERY-HIGH-risk factor.', false),
      yesNo('avd', 'Arterial vascular disease (IHD, PCI, CABG, stable angina, TIA, stroke, PVD)', null, 'Established arterial vascular disease — VERY-HIGH-risk factor.', false),
      yesNo('imidTox', 'Prior immunomodulatory drug CV toxicity', null, 'CV toxicity attributed to a prior IMiD — high-risk factor.', false),
      selectInput('lvef', 'Baseline LVEF', [
        { label: '>54%', value: 'normal' },
        { label: '50–54%', value: 'borderline' },
        { label: '<50%', value: 'low' },
      ], 'normal', 'LVEF <50% = high-risk factor; 50–54% = medium-2 (2 points).'),
      yesNo('arr', 'Arrhythmia', null, 'AF, atrial flutter, VT or VF — medium-2 (2 points).', false),
      yesNo('lvh', 'Left ventricular hypertrophy', null, 'LVH on baseline echocardiography — medium-1 (1 point).', false),
      yesNo('ctn', 'Elevated baseline troponin', null, 'Above local ULN — medium-2 (2 points).', false),
      yesNo('np', 'Elevated baseline BNP or NT-proBNP', null, 'Above local ULN — high-risk factor for MM therapy.', false),
      selectInput('age', 'Age', [
        { label: '<64 years', value: 'lt64' },
        { label: '65–74 years', value: 'a6574' },
        { label: '≥75 years', value: 'ge75' },
      ], 'lt64', 'Age ≥75 = high; 65–74 = medium-1 (1 point).'),
      yesNo('htn', 'Hypertension', null, 'SBP >140 or DBP >90 mmHg, or on treatment — medium-1 (1 point).', false),
      yesNo('dm', 'Diabetes mellitus', null, 'HbA1c >7% or on treatment — medium-1 (1 point).', false),
      yesNo('hlp', 'Hyperlipidemia', null, 'Non-HDL >3.8 mmol/L or on treatment — medium-1 (1 point).', false),
      yesNo('ckd', 'Chronic kidney disease', null, 'eGFR <60 — medium-1 (1 point).', false),
      yesNo('thrombophilia', 'Family history of thrombophilia', null, 'Medium-1 (1 point).', false),
      yesNo('prevAnthra', 'Prior anthracycline exposure', null, 'High-risk factor.', false),
      yesNo('rt', 'Prior radiotherapy to left chest, mediastinum, or thoracic spine', null, 'Medium-1 (1 point).', false),
      yesNo('dex', 'High-dose dexamethasone >160 mg/month', null, 'Current high-dose dexamethasone — medium-1 (1 point).', false),
      yesNo('smoke', 'Current smoker or significant smoking history', null, 'Medium-1 (1 point).', false),
      yesNo('obese', 'Obesity (BMI >30 kg/m²)', null, 'Medium-1 (1 point).', false),
    ],
    calculate(values) {
      const items: HfaContribution[] = [];
      m('vh', 0, 'Heart failure or cardiomyopathy', items, bool(values.hf));
      m('vh', 0, 'Prior proteasome inhibitor cardiotoxicity', items, bool(values.piTox));
      m('vh', 0, 'Venous thrombosis (DVT/PE)', items, bool(values.vte));
      m('vh', 0, 'Cardiac amyloidosis', items, bool(values.amyloid));
      m('vh', 0, 'Arterial vascular disease', items, bool(values.avd));
      m('h', 0, 'Prior IMiD CV toxicity', items, bool(values.imidTox));
      const lv = str(values.lvef, 'normal');
      if (lv === 'low') items.push({ label: 'LVEF <50%', level: 'h', points: 0 });
      else if (lv === 'borderline') items.push({ label: 'LVEF 50–54%', level: 'm2', points: 2 });
      m('m2', 2, 'Arrhythmia', items, bool(values.arr));
      m('m1', 1, 'Left ventricular hypertrophy', items, bool(values.lvh));
      m('m2', 2, 'Elevated baseline troponin', items, bool(values.ctn));
      m('h', 0, 'Elevated baseline BNP/NT-proBNP', items, bool(values.np));
      const age = str(values.age, 'lt64');
      if (age === 'ge75') items.push({ label: 'Age ≥75', level: 'h', points: 0 });
      else if (age === 'a6574') items.push({ label: 'Age 65–74', level: 'm1', points: 1 });
      m('m1', 1, 'Hypertension', items, bool(values.htn));
      m('m1', 1, 'Diabetes mellitus', items, bool(values.dm));
      m('m1', 1, 'Hyperlipidemia', items, bool(values.hlp));
      m('m1', 1, 'Chronic kidney disease', items, bool(values.ckd));
      m('m1', 1, 'Family history of thrombophilia', items, bool(values.thrombophilia));
      m('h', 0, 'Prior anthracycline exposure', items, bool(values.prevAnthra));
      m('m1', 1, 'Prior chest/mediastinal/thoracic-spine RT', items, bool(values.rt));
      m('m1', 1, 'High-dose dexamethasone', items, bool(values.dex));
      m('m1', 1, 'Smoking', items, bool(values.smoke));
      m('m1', 1, 'Obesity', items, bool(values.obese));
      return hfaIcosResult(items, 'multiple myeloma therapy (PI/IMiD)');
    },
    evidence: {
      summary:
        'HFA-ICOS MM proforma (2022 ESC consolidated table): HF/cardiomyopathy, prior PI cardiotoxicity, VTE, cardiac amyloidosis, arterial vascular disease = very high; prior IMiD CV toxicity, LVEF <50%, elevated natriuretic peptides, age ≥75, prior anthracycline = high; LVEF 50–54%, arrhythmia, elevated troponin = 2 points; LVH, age 65–74, hypertension, diabetes, hyperlipidemia, CKD, thrombophilia family history, thoracic RT, high-dose dexamethasone, smoking, obesity = 1 point.',
      formula: 'VH → very high; H or ≥5 medium points → high; 2–4 → medium; 0–1 → low',
      validation:
        'Follows the 2022 ESC consolidated table; the RT item is labeled "prior thoracic spine radiotherapy" in the proforma — implemented as chest/mediastinum/thoracic spine per the proforma row.',
      references: [...HFA_REFS],
    },
    nextSteps: [...HFA_MANAGEMENT],
    pearls: [
      'Screen for cardiac amyloidosis in MM patients with elevated NP, LVH, or low-voltage ECG — it is a very-high-risk factor.',
      'IMiDs require thromboprophylaxis assessment; prior VTE is a very-high-risk factor.',
      'Carfilzomib infusions need cautious hydration — volume overload can precipitate HF in high-risk patients.',
      ...HFA_PEARLS,
    ],
  },

  // ─── 17. ICE score ────────────────────────────────────────────────────────
  {
    id: 'ice-score',
    name: 'Immune Effector Cell Encephalopathy (ICE) Score',
    shortName: 'ICE score',
    description:
      '10-point bedside neurocognitive assessment for patients receiving CAR T-cell and other immune effector cell therapies; feeds the ASTCT ICANS grade.',
    category: 'oncology',
    tags: ['ice', 'icans', 'car t', 'neurotoxicity', 'astct', 'encephalopathy'],
    whenToUse:
      'Serial neurocognitive monitoring during and after CAR T-cell or other immune effector cell therapy, and whenever neurologic change is suspected.',
    whyUse:
      'The ICE score is the cognitive component of the ASTCT ICANS consensus grade — objective serial scoring detects neurotoxicity early and standardizes grading across teams.',
    inputs: [
      yesNo('oriYear', 'Orientation — year correct', 1, 'Ask the patient to state the year; +1 if correct.', true),
      yesNo('oriMonth', 'Orientation — month correct', 1, '+1 if the month is correct.', true),
      yesNo('oriCity', 'Orientation — city correct', 1, '+1 if the city is correct.', true),
      yesNo('oriHospital', 'Orientation — hospital correct', 1, '+1 if the hospital is correct.', true),
      selectInput('naming', 'Naming — ability to name three objects', [
        { label: 'None correct', value: 0, points: 0 },
        { label: 'One correct', value: 1, points: 1 },
        { label: 'Two correct', value: 2, points: 2 },
        { label: 'All three correct', value: 3, points: 3 },
      ], 3, 'Point to three objects (e.g., clock, pen, button) and ask the patient to name them; 1 point per correct object.'),
      yesNo('commands', 'Following commands — simple command performed', 1, 'E.g., "show me 2 fingers" or "close your eyes and stick out your tongue"; +1 if performed.', true),
      yesNo('writing', 'Writing — writes a standard sentence', 1, 'E.g., "Our national bird is the bald eagle"; +1 if a legible standard sentence is written.', true),
      yesNo('attention', 'Attention — counts backward from 100 by 10', 1, '+1 if the patient counts backward from 100 by 10.', true),
    ],
    calculate(values) {
      const score =
        (bool(values.oriYear) ? 1 : 0) +
        (bool(values.oriMonth) ? 1 : 0) +
        (bool(values.oriCity) ? 1 : 0) +
        (bool(values.oriHospital) ? 1 : 0) +
        num(values.naming, 0) +
        (bool(values.commands) ? 1 : 0) +
        (bool(values.writing) ? 1 : 0) +
        (bool(values.attention) ? 1 : 0);
      let riskLevel: RiskLevel;
      let label: string;
      let interpretation: string;
      if (score === 10) {
        riskLevel = 'normal';
        label = 'ICE 10/10 — no impairment';
        interpretation = 'ICE score 10 — intact neurocognitive function. Continue scheduled monitoring; ICE <10 suggests possible ICANS.';
      } else if (score >= 7) {
        riskLevel = 'low';
        label = 'ICE 7–9 — ICANS grade 1 cognitive level';
        interpretation = `ICE ${score}/10 — impaired. If attributable to immune effector cell therapy this corresponds to ICANS grade 1 cognition; evaluate for other causes and increase monitoring frequency.`;
      } else if (score >= 3) {
        riskLevel = 'moderate';
        label = 'ICE 3–6 — ICANS grade 2 cognitive level';
        interpretation = `ICE ${score}/10 — moderate impairment; corresponds to ICANS grade 2 cognition if attributable to therapy. Assess for other neurologic signs (seizure, motor weakness, raised ICP) — the overall ICANS grade is the most severe feature.`;
      } else {
        riskLevel = 'high';
        label = 'ICE 0–2 — ICANS grade 3 cognitive level';
        interpretation = `ICE ${score}/10 — severe impairment; corresponds to ICANS grade 3 cognition if attributable to therapy. Note: ICE cannot be assessed in an unarousable patient — stupor/coma is grade 4. Escalate per ICANS protocol (consider corticosteroids, ICU evaluation).`;
      }
      return {
        score,
        unit: '/10',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Orientation (0–4)', value: String((bool(values.oriYear) ? 1 : 0) + (bool(values.oriMonth) ? 1 : 0) + (bool(values.oriCity) ? 1 : 0) + (bool(values.oriHospital) ? 1 : 0)) },
          { label: 'Naming (0–3)', value: String(num(values.naming, 0)) },
          { label: 'Commands / writing / attention (0–3)', value: String((bool(values.commands) ? 1 : 0) + (bool(values.writing) ? 1 : 0) + (bool(values.attention) ? 1 : 0)) },
        ],
        recommendations: [
          'Rule out other causes of encephalopathy (sedatives, metabolic derangements, infection, stroke, seizure).',
          'Apply the ICE result to the ASTCT ICANS consensus grade — the overall grade uses the most severe domain (ICE, seizure, motor findings, raised ICP, consciousness).',
          'ICE <10 should prompt increased monitoring frequency and notification of the cellular-therapy team.',
        ],
      };
    },
    evidence: {
      summary:
        'ICE = orientation to year/month/city/hospital (4) + naming three objects (3) + following a simple command (1) + writing a standard sentence (1) + attention counting backward from 100 by 10 (1) = 0–10. ICE 7–9 → ICANS grade 1 cognition; 3–6 → grade 2; 0–2 → grade 3; patient unarousable → grade 4.',
      formula: 'ICE (0–10) = orientation(4) + naming(3) + commands(1) + writing(1) + attention(1)',
      validation:
        'Items and point values match the ASTCT consensus ICE tool (Lee et al. 2019). ICE is the cognitive component of the ICANS grade — the overall grade also incorporates seizures, motor weakness, raised ICP, and consciousness.',
      references: [
        {
          title: 'ASTCT Consensus Grading for Cytokine Release Syndrome and Neurologic Toxicity Associated with Immune Effector Cells',
          citation: 'Lee DW, Santomasso BD, Locke FL, et al. Biol Blood Marrow Transplant. 2019;25(4):625-638',
          year: 2019,
          pmid: '30592986',
          doi: '10.1016/j.bbmt.2018.12.758',
        },
      ],
    },
    nextSteps: [
      { condition: 'ICE 10', actions: ['Continue scheduled monitoring per cellular-therapy protocol'] },
      { condition: 'ICE 7–9', actions: ['Assess for ICANS grade 1; increase monitoring frequency', 'Exclude alternative causes'] },
      { condition: 'ICE ≤6 or any seizure/motor deficit/raised ICP', actions: ['Urgent cellular-therapy team notification', 'Grade per ASTCT ICANS; corticosteroids per protocol for grade ≥2', 'ICU evaluation for grade ≥3'] },
    ],
    pearls: [
      'ICE is a cognitive screen only — the ICANS grade is the worst feature across ICE, seizure, motor, and consciousness domains.',
      'An unarousable patient cannot perform ICE tasks and is ICANS grade 4 by definition.',
      'Baseline ICE before infusion documents premorbid deficits.',
    ],
  },

  // ─── 18. irAE colitis ─────────────────────────────────────────────────────
  {
    id: 'irae-colitis',
    name: 'Immune-Related Adverse Events — GI Toxicity (Colitis/Diarrhea) Grading',
    shortName: 'irAE colitis',
    description:
      'CTCAE-based grading of immune checkpoint inhibitor–associated diarrhea/colitis with grade-specific ASCO management.',
    category: 'oncology',
    tags: ['irae', 'colitis', 'diarrhea', 'checkpoint inhibitor', 'ctcae', 'asco', 'immunotherapy'],
    whenToUse:
      'An adult develops diarrhea or colitis symptoms while on immune checkpoint inhibitor therapy — grade severity to direct work-up and management.',
    whyUse:
      'CTCAE grading standardizes irAE severity and maps directly to ASCO management (hold vs continue ICPi, corticosteroid dose, infliximab, endoscopy).',
    inputs: [
      selectInput('grade', 'CTCAE grade for diarrhea/colitis', [
        { label: 'Grade 1 — increase of <4 stools/day over baseline; mild increase in ostomy output', value: 1 },
        { label: 'Grade 2 — increase of 4–6 stools/day over baseline; moderate increase in ostomy output', value: 2 },
        { label: 'Grade 3 — increase of ≥7 stools/day, incontinence, hospitalization indicated, severe ostomy output, limiting self-care/ADL', value: 3 },
        { label: 'Grade 4 — life-threatening consequences; urgent intervention indicated', value: 4 },
      ], 2, 'Select the CTCAE severity that best matches stool-frequency increase, symptoms, and functional impact. Grade the worst feature if multiple apply.'),
    ],
    calculate(values) {
      const g = num(values.grade, 2);
      const map: Record<number, { rl: RiskLevel; interp: string; recs: string[] }> = {
        1: {
          rl: 'low',
          interp:
            'Grade 1 ICPi colitis/diarrhea. Continue ICPi (or hold temporarily and resume if toxicity stays ≤grade 1); monitor for dehydration, dietary changes, expedited contact. Further diagnostic work-up is not recommended; GI consult if prolonged.',
          recs: [
            'Continue or briefly hold ICPi; monitor hydration and symptoms.',
            'No mandatory work-up for grade 1; evaluate if persistent.',
          ],
        },
        2: {
          rl: 'moderate',
          interp:
            'Grade 2 ICPi colitis. Hold ICPi until recovery to grade ≤1 (consider permanently stopping CTLA-4; PD-1/PD-L1 may restart after recovery). Recommended work-up: CBC, CMP, TSH, ESR, CRP; stool culture, C. difficile, ova/parasites, CMV; calprotectin/lactoferrin; consider CT and endoscopy (ulceration predicts steroid-refractory disease). Start prednisone 1 mg/kg/day unless transient; GI consult.',
          recs: [
            'Hold ICPi until ≤grade 1; taper steroids ≥4–6 weeks before resuming.',
            'Complete stool infectious work-up and inflammatory markers; consider endoscopy for early infliximab stratification.',
            'Prednisone 1 mg/kg/day; supportive loperamide only after infection excluded.',
          ],
        },
        3: {
          rl: 'high',
          interp:
            'Grade 3 ICPi colitis. Consider permanently discontinuing CTLA-4 agents (PD-1/PD-L1 restart only if recovery to ≤grade 1). Corticosteroids 1–2 mg/kg/day; hospitalize if dehydrated/electrolyte imbalance. If symptoms persist 3–5 days or recur, escalate to IV steroids or infliximab; colonoscopy if on immunosuppression (rule out CMV) or refractory.',
          recs: [
            'Hold/discontinue ICPi per agent; corticosteroids 1–2 mg/kg/day.',
            'Complete the grade-2 work-up immediately; consider early infliximab if refractory.',
          ],
        },
        4: {
          rl: 'critical',
          interp:
            'Grade 4 ICPi colitis — life-threatening. Permanently discontinue ICPi. Admit when indicated; methylprednisolone 1–2 mg/kg/day until improvement to grade ≤1 then taper ≥4–6 weeks. Early infliximab 5–10 mg/kg if steroid-refractory within 2–3 days; lower-GI endoscopy if refractory or infection concern (vedolizumab is an alternative to anti-TNF).',
          recs: [
            'Permanently discontinue ICPi; urgent GI and oncology management.',
            'IV methylprednisolone; early infliximab for steroid-refractory disease.',
          ],
        },
      };
      const entry = map[g];
      return {
        score: g,
        unit: 'CTCAE grade',
        label: `Grade ${g} immune-related colitis`,
        interpretation: entry.interp,
        riskLevel: entry.rl,
        recommendations: entry.recs,
        details: [{ label: 'CTCAE grade', value: `G${g}` }],
      };
    },
    evidence: {
      summary:
        'Grading follows CTCAE diarrhea criteria (stool increase over baseline, ostomy output, ADL impact, life-threat) applied to ICPi colitis; management per ASCO irAE guideline (Brahmer 2018).',
      formula: 'Single-criterion CTCAE grade selection (1–4)',
      validation:
        'Grade definitions match the ASCO guideline; updated ASCO (2021, Schneider et al.) guidance is substantially concordant.',
      references: [
        {
          title: 'Management of Immune-Related Adverse Events in Patients Treated With Immune Checkpoint Inhibitor Therapy: ASCO Guideline',
          citation: 'Brahmer JR, Lacchetti C, Schneider BJ, et al. J Clin Oncol. 2018;36(17):1714-1768',
          year: 2018,
          pmid: '29442540',
          doi: '10.1200/JCO.2017.77.6385',
        },
        {
          title: 'Common Terminology Criteria for Adverse Events (CTCAE) v5.0',
          citation: 'NCI/CTEP',
          url: 'https://ctep.cancer.gov/protocoldevelopment/electronic_applications/ctc.htm',
        },
      ],
    },
    nextSteps: [
      { condition: 'Grade ≥2', actions: ['Stool infectious work-up + inflammatory markers', 'Corticosteroids per grade; GI consult', 'Consider endoscopy for infliximab stratification'] },
      { condition: 'Steroid-refractory', actions: ['Infliximab 5–10 mg/kg (or vedolizumab if anti-TNF contraindicated)', 'Repeat endoscopy if no response'] },
    ],
    pearls: [
      'Infection (especially C. difficile and CMV on immunosuppression) must be excluded before escalating immunosuppression.',
      'Endoscopic ulceration predicts corticosteroid-refractory disease and supports early infliximab.',
      'Colitis can recur on ICPi rechallenge — document grade and management for shared decision-making.',
    ],
  },

  // ─── 19. irAE hepatitis ───────────────────────────────────────────────────
  {
    id: 'irae-hepatitis',
    name: 'Immune-Related Adverse Events — GI Toxicity (Hepatitis) Grading',
    shortName: 'irAE hepatitis',
    description:
      'Grades immune checkpoint inhibitor–associated hepatitis by AST/ALT and total bilirubin with grade-specific ASCO management.',
    category: 'oncology',
    tags: ['irae', 'hepatitis', 'checkpoint inhibitor', 'alt', 'ast', 'bilirubin', 'asco', 'immunotherapy'],
    whenToUse:
      'An adult develops AST/ALT or bilirubin elevation or hepatitis symptoms while on immune checkpoint inhibitor therapy.',
    whyUse:
      'Grade drives ICPi continuation vs hold/discontinuation, corticosteroid dose, and escalation to mycophenolate — and infliximab should be avoided in hepatic irAEs.',
    inputs: [
      selectInput('grade', 'CTCAE/ASCO grade for immune-related hepatitis', [
        { label: 'Grade 1 — asymptomatic; AST/ALT >ULN–3×ULN and/or total bilirubin >ULN–1.5×ULN', value: 1 },
        { label: 'Grade 2 — asymptomatic; AST/ALT >3–5×ULN and/or total bilirubin >1.5–3×ULN', value: 2 },
        { label: 'Grade 3 — symptomatic liver dysfunction, biopsy fibrosis, compensated cirrhosis, or chronic-hepatitis reactivation; AST/ALT 5–20×ULN and/or bilirubin 3–10×ULN', value: 3 },
        { label: 'Grade 4 — decompensated liver function (ascites, coagulopathy, encephalopathy, coma); AST/ALT >20×ULN and/or bilirubin >10×ULN', value: 4 },
      ], 2, 'Grade by the highest applicable transaminase/bilirubin threshold or clinical severity.'),
    ],
    calculate(values) {
      const g = num(values.grade, 2);
      const map: Record<number, { rl: RiskLevel; interp: string; recs: string[] }> = {
        1: {
          rl: 'low',
          interp:
            'Grade 1 ICPi hepatitis. Continue ICPi with close monitoring; consider alternate etiologies; check AST/ALT/bilirubin 1–2× weekly; supportive care.',
          recs: ['Continue ICPi; monitor liver tests 1–2×/week.', 'Evaluate alternative causes if persistent.'],
        },
        2: {
          rl: 'moderate',
          interp:
            'Grade 2 ICPi hepatitis. Hold ICPi temporarily — resume if recovery to ≤grade 1 on prednisone ≤10 mg/day. Consider corticosteroid 0.5–1 mg/kg/day if abnormal elevation persists with significant symptoms over 3–5 days; monitor every ~3 days. Work up other causes (viral hepatitis, alcohol, iron studies, thromboembolism, imaging for metastasis; ANA/SMA/ANCA if autoimmune suspicion; CK for isolated transaminase rise).',
          recs: [
            'Hold ICPi; consider prednisone 0.5–1 mg/kg/day for persistent/symptomatic elevation.',
            'Work up viral/alcoholic/vascular/metastatic causes; stop unnecessary hepatotoxins.',
          ],
        },
        3: {
          rl: 'high',
          interp:
            'Grade 3 ICPi hepatitis. Corticosteroids 1–2 mg/kg methylprednisolone or equivalent; if refractory or no improvement after ~3 days add mycophenolate mofetil or azathioprine (check TPMT before azathioprine). Labs daily–every other day; inpatient monitoring for AST/ALT >8×ULN or bilirubin >3×ULN. Avoid infliximab (potential liver failure).',
          recs: ['High-dose corticosteroids; escalate to mycophenolate/azathioprine if refractory.', 'Avoid infliximab in immune-mediated hepatitis.'],
        },
        4: {
          rl: 'critical',
          interp:
            'Grade 4 ICPi hepatitis — decompensated. Permanently discontinue ICPi; methylprednisolone 2 mg/kg/day; add mycophenolate if no improvement in ~3 days; daily labs, inpatient care; hepatology consult; consider transfer to a tertiary center. Avoid infliximab.',
          recs: ['Permanently discontinue ICPi; IV methylprednisolone 2 mg/kg/day.', 'Hepatology consult; taper over ~4–6 weeks once ≤grade 1.'],
        },
      };
      const entry = map[g];
      return {
        score: g,
        unit: 'grade',
        label: `Grade ${g} immune-related hepatitis`,
        interpretation: entry.interp,
        riskLevel: entry.rl,
        recommendations: entry.recs,
        details: [{ label: 'Grade', value: `G${g}` }],
      };
    },
    evidence: {
      summary:
        'Grading uses AST/ALT and total bilirubin multiples of ULN with clinical qualifiers (symptoms, decompensation) per CTCAE/ASCO; management per Brahmer 2018 ASCO guideline.',
      formula: 'Single-criterion grade selection (1–4) by AST/ALT and bilirubin ×ULN',
      validation:
        'Thresholds match the ASCO guideline (AST/ALT 3/5/20×ULN and bilirubin 1.5/3/10×ULN boundaries).',
      references: [
        {
          title: 'Management of Immune-Related Adverse Events in Patients Treated With Immune Checkpoint Inhibitor Therapy: ASCO Guideline',
          citation: 'Brahmer JR, Lacchetti C, Schneider BJ, et al. J Clin Oncol. 2018;36(17):1714-1768',
          year: 2018,
          pmid: '29442540',
          doi: '10.1200/JCO.2017.77.6385',
        },
      ],
    },
    nextSteps: [
      { condition: 'Grade ≥2', actions: ['Hold ICPi; corticosteroids per grade', 'Exclude viral hepatitis and other causes; hepatology if severe/refractory'] },
      { condition: 'Steroid-refractory', actions: ['Mycophenolate mofetil (or azathioprine after TPMT check)', 'Do NOT use infliximab'] },
    ],
    pearls: [
      'Check CK for isolated transaminase elevation — ICPi myositis can mimic hepatitis.',
      'Concurrent colitis + hepatitis: use systemic agents active for both and avoid anti-TNF.',
      'Liver biopsy is not routinely required but can clarify autoimmune vs other patterns.',
    ],
  },

  // ─── 20. irAE pneumonitis ─────────────────────────────────────────────────
  {
    id: 'irae-pneumonitis',
    name: 'Immune-Related Adverse Events — Lung Toxicity (Pneumonitis) Grading',
    shortName: 'irAE pneumonitis',
    description:
      'Grades immune checkpoint inhibitor pneumonitis by symptoms and extent of lung-parenchyma involvement with grade-specific ASCO management.',
    category: 'oncology',
    tags: ['irae', 'pneumonitis', 'checkpoint inhibitor', 'lung', 'asco', 'immunotherapy'],
    whenToUse:
      'An adult develops respiratory symptoms or new CT infiltrates consistent with pneumonitis while on immune checkpoint inhibitor therapy.',
    whyUse:
      'Pneumonitis is a leading cause of fatal irAEs; CTCAE grading by symptom severity and parenchymal extent directs hold/discontinuation and immunosuppression intensity.',
    inputs: [
      selectInput('grade', 'CTCAE grade for pneumonitis', [
        { label: 'Grade 1 — asymptomatic; confined to one lobe or <25% of lung parenchyma; clinical/diagnostic observations only', value: 1 },
        { label: 'Grade 2 — symptomatic; >1 lobe or 25–50% of parenchyma; medical intervention indicated; limiting instrumental ADL', value: 2 },
        { label: 'Grade 3 — severe symptoms; hospitalization required; all lobes or >50% of parenchyma; limiting self-care ADL; oxygen indicated', value: 3 },
        { label: 'Grade 4 — life-threatening respiratory compromise; urgent intervention indicated (e.g., intubation)', value: 4 },
      ], 2, 'Grade by symptom severity and CT extent of parenchymal inflammation.'),
    ],
    calculate(values) {
      const g = num(values.grade, 2);
      const map: Record<number, { rl: RiskLevel; interp: string; recs: string[] }> = {
        1: {
          rl: 'low',
          interp:
            'Grade 1 ICPi pneumonitis (radiographic only). Hold ICPi if radiographic progression; repeat CT in 3–4 weeks and spirometry/DLCO; may resume if improved/resolved — otherwise treat as grade 2. Weekly history, exam, pulse oximetry (±CXR).',
          recs: ['Monitor weekly; repeat CT in 3–4 weeks.', 'Escalate to grade-2 management if symptomatic or progressive.'],
        },
        2: {
          rl: 'moderate',
          interp:
            'Grade 2 ICPi pneumonitis. Hold ICPi until resolution to ≤grade 1; prednisone 1–2 mg/kg/day tapered over 4–6 weeks. Consider bronchoscopy with BAL and empirical antibiotics; monitor every ~3 days; treat as grade 3 if no improvement in 48–72 h. Infectious work-up (nasal swab, sputum, blood and urine cultures) for grade ≥2.',
          recs: ['Hold ICPi; prednisone 1–2 mg/kg/day.', 'Bronchoscopy/BAL and empirical antibiotics as indicated; infectious work-up.'],
        },
        3: {
          rl: 'high',
          interp:
            'Grade 3 ICPi pneumonitis. Permanently discontinue ICPi; empirical antibiotics; IV (methyl)prednisolone 1–2 mg/kg/day; if no improvement after 48 h add infliximab 5 mg/kg or mycophenolate IV or IVIG or cyclophosphamide; bronchoscopy ± biopsy; admit and consult pulmonary/infectious disease.',
          recs: ['Permanently discontinue ICPi; IV steroids + admission.', 'Add second immunosuppressant if no response in 48 h.'],
        },
        4: {
          rl: 'critical',
          interp:
            'Grade 4 ICPi pneumonitis — life-threatening respiratory compromise. Permanently discontinue ICPi; ICU-level care; IV methylprednisolone 1–2 mg/kg/day plus early additional immunosuppression (infliximab/mycophenolate/IVIG/cyclophosphamide) if no response in 48 h; pulmonary and ID consults; bronchoscopy/BAL ± biopsy.',
          recs: ['Permanently discontinue ICPi; ICU management.', 'Combination immunosuppression for non-responders.'],
        },
      };
      const entry = map[g];
      return {
        score: g,
        unit: 'grade',
        label: `Grade ${g} immune-related pneumonitis`,
        interpretation: entry.interp,
        riskLevel: entry.rl,
        recommendations: entry.recs,
        details: [{ label: 'Grade', value: `G${g}` }],
      };
    },
    evidence: {
      summary:
        'CTCAE-based grading: grade 1 asymptomatic/<25% parenchyma; grade 2 symptomatic/25–50%/instrumental ADL; grade 3 severe/>50%/hospitalization/oxygen; grade 4 life-threatening. Management per ASCO irAE guideline.',
      formula: 'Single-criterion grade selection (1–4)',
      validation:
        'Definitions match CTCAE pneumonitis criteria as applied in the ASCO guideline.',
      references: [
        {
          title: 'Management of Immune-Related Adverse Events in Patients Treated With Immune Checkpoint Inhibitor Therapy: ASCO Guideline',
          citation: 'Brahmer JR, Lacchetti C, Schneider BJ, et al. J Clin Oncol. 2018;36(17):1714-1768',
          year: 2018,
          pmid: '29442540',
          doi: '10.1200/JCO.2017.77.6385',
        },
      ],
    },
    nextSteps: [
      { condition: 'Grade ≥2', actions: ['Hold ICPi; corticosteroids; infectious work-up', 'Bronchoscopy with BAL if uncertain or severe'] },
      { condition: 'No improvement in 48–72 h', actions: ['Escalate one grade of management', 'Add infliximab, mycophenolate, IVIG, or cyclophosphamide'] },
    ],
    pearls: [
      'Biopsy is generally unnecessary when the picture is typical — reserve it to exclude lymphangitic tumor or infection.',
      'Pneumonitis may present with only imaging changes; review baseline and serial CTs carefully.',
      'Prolonged steroid courses (>12 weeks) may warrant PJP prophylaxis per institutional policy.',
    ],
  },

  // ─── 21. irAE nephritis ───────────────────────────────────────────────────
  {
    id: 'irae-nephritis',
    name: 'Immune-Related Adverse Events — Renal Toxicity (Nephritis) Grading',
    shortName: 'irAE nephritis',
    description:
      'Grades immune checkpoint inhibitor–associated nephritis/AKI by creatinine elevation with grade-specific ASCO management.',
    category: 'oncology',
    tags: ['irae', 'nephritis', 'aki', 'checkpoint inhibitor', 'creatinine', 'asco', 'immunotherapy'],
    whenToUse:
      'An adult develops creatinine elevation or nephritis features while on immune checkpoint inhibitor therapy, after other causes are considered.',
    whyUse:
      'ICPi nephritis (typically acute interstitial nephritis) is graded by creatinine fold-elevation; grade determines holding ICPi, steroid dose, biopsy timing, and nephrology referral.',
    inputs: [
      selectInput('grade', 'CTCAE grade for creatinine increase', [
        { label: 'Grade 1 — creatinine increase >0.3 mg/dL; creatinine 1.5–2.0× baseline', value: 1 },
        { label: 'Grade 2 — creatinine 2–3× above baseline', value: 2 },
        { label: 'Grade 3 — creatinine >3× baseline or >4.0 mg/dL; hospitalization indicated', value: 3 },
        { label: 'Grade 4 — life-threatening consequences; dialysis indicated', value: 4 },
      ], 2, 'Grade by creatinine relative to the patient’s baseline (not ULN).'),
    ],
    calculate(values) {
      const g = num(values.grade, 2);
      const map: Record<number, { rl: RiskLevel; interp: string; recs: string[] }> = {
        1: {
          rl: 'low',
          interp:
            'Grade 1 ICPi nephritis/AKI. Consider temporarily holding ICPi while alternative etiologies are evaluated (recent IV contrast, dehydration, nephrotoxic medications, UTI); monitor creatinine weekly. Even changes <1.5× baseline can be meaningful.',
          recs: ['Evaluate alternative causes; weekly creatinine.', 'May continue ICPi if another cause explains the rise.'],
        },
        2: {
          rl: 'moderate',
          interp:
            'Grade 2 ICPi nephritis. Hold ICPi temporarily; nephrology consultation; rule out other causes (contrast, medications, volume status). If other etiologies excluded, prednisone 0.5–1 mg/kg/day; if worsening/no improvement use 1–2 mg/kg/day and permanently discontinue ICPi. Taper over 4–6 weeks if improved to ≤grade 1; consider resumption after risk–benefit discussion.',
          recs: ['Hold ICPi; nephrology consult.', 'Prednisone 0.5–1 mg/kg/day once other causes excluded.'],
        },
        3: {
          rl: 'high',
          interp:
            'Grade 3 ICPi nephritis. Permanently discontinue ICPi; nephrology consult; evaluate other causes; corticosteroids 1–2 mg/kg/day. Kidney biopsy is discouraged until corticosteroid treatment has been attempted; presume ICPi nephritis when no other cause is found.',
          recs: ['Permanently discontinue ICPi; high-dose steroids.', 'Nephrology consult; biopsy only if no response or diagnostic doubt.'],
        },
        4: {
          rl: 'critical',
          interp:
            'Grade 4 ICPi nephritis — life-threatening/dialysis indicated. Permanently discontinue ICPi; urgent nephrology management; corticosteroids 1–2 mg/kg/day; support including renal replacement therapy as needed.',
          recs: ['Permanently discontinue ICPi; urgent nephrology.', 'High-dose corticosteroids; RRT as indicated.'],
        },
      };
      const entry = map[g];
      return {
        score: g,
        unit: 'grade',
        label: `Grade ${g} immune-related nephritis`,
        interpretation: entry.interp,
        riskLevel: entry.rl,
        recommendations: entry.recs,
        details: [{ label: 'Grade', value: `G${g}` }],
      };
    },
    evidence: {
      summary:
        'Grading by creatinine fold-elevation over baseline per CTCAE (1.5–2×, 2–3×, >3× or >4.0 mg/dL, dialysis); management per ASCO irAE guideline.',
      formula: 'Single-criterion grade selection (1–4) by creatinine vs baseline',
      validation:
        'Thresholds match CTCAE creatinine-increase criteria and the ASCO guideline.',
      references: [
        {
          title: 'Management of Immune-Related Adverse Events in Patients Treated With Immune Checkpoint Inhibitor Therapy: ASCO Guideline',
          citation: 'Brahmer JR, Lacchetti C, Schneider BJ, et al. J Clin Oncol. 2018;36(17):1714-1768',
          year: 2018,
          pmid: '29442540',
          doi: '10.1200/JCO.2017.77.6385',
        },
      ],
    },
    nextSteps: [
      { condition: 'Grade ≥2', actions: ['Hold ICPi; exclude contrast/drug/volume causes', 'Prednisone 0.5–2 mg/kg/day; nephrology consult'] },
      { condition: 'No response to steroids', actions: ['Kidney biopsy to confirm AIN and exclude other pathology'] },
    ],
    pearls: [
      'Routine urinalysis mainly serves to exclude UTI and other causes — sterile pyuria/WBC casts support AIN.',
      'Check creatinine before every ICPi dose; small rises can herald progressive nephritis.',
      'Most ICPi nephritis responds to corticosteroids; biopsy is reserved for non-response or diagnostic uncertainty.',
    ],
  },

  // ─── 22. irAE diabetes ────────────────────────────────────────────────────
  {
    id: 'irae-diabetes',
    name: 'Immune-Related Adverse Events — Endocrine Toxicity (Diabetes Mellitus) Grading',
    shortName: 'irAE diabetes',
    description:
      'Grades immune checkpoint inhibitor–associated hyperglycemia/new-onset diabetes by fasting glucose, symptoms, and ketoacidosis risk.',
    category: 'oncology',
    tags: ['irae', 'diabetes', 'hyperglycemia', 'checkpoint inhibitor', 'dka', 'asco', 'endocrine'],
    whenToUse:
      'An adult develops new or worsening hyperglycemia while on immune checkpoint inhibitor therapy — grade severity and screen for insulin-deficient (type-1-like) diabetes/DKA.',
    whyUse:
      'ICPi can precipitate fulminant insulin-deficient diabetes and DKA; grading by glucose and symptoms directs insulin initiation, endocrine referral, and ICPi holding.',
    inputs: [
      selectInput('grade', 'Grade for hyperglycemia/diabetes', [
        { label: 'Grade 1 — asymptomatic or mild; fasting glucose >160 mg/dL (>8.9 mmol/L); no ketosis or evidence of T1DM', value: 1 },
        { label: 'Grade 2 — moderate symptoms, able to perform ADLs; fasting glucose >160–250 mg/dL (8.9–13.9 mmol/L); ketosis or evidence of T1DM at any glucose level', value: 2 },
        { label: 'Grade 3 — severe symptoms, medically significant/life-threatening, unable to perform ADLs; fasting glucose >250–500 mg/dL (13.9–27.8 mmol/L)', value: 3 },
        { label: 'Grade 4 — severe symptoms, life-threatening consequences; fasting glucose >500 mg/dL (>27.8 mmol/L)', value: 4 },
      ], 2, 'Grade by fasting glucose and symptoms; ketosis or evidence of type 1 diabetes upgrades severity.'),
    ],
    calculate(values) {
      const g = num(values.grade, 2);
      const map: Record<number, { rl: RiskLevel; interp: string; recs: string[] }> = {
        1: {
          rl: 'low',
          interp:
            'Grade 1 ICPi hyperglycemia. May continue ICPi with close clinical and laboratory follow-up; consider oral agents for new-onset type 2 diabetes; screen for T1DM if acute onset or ketosis concern (anion gap, urine ketones, C-peptide, autoantibodies).',
          recs: ['Continue ICPi; monitor glucose closely.', 'Screen for insulin-deficient diabetes if onset is abrupt.'],
        },
        2: {
          rl: 'moderate',
          interp:
            'Grade 2 ICPi hyperglycemia. May hold ICPi until glucose is controlled; titrate oral therapy/consider insulin for worsening type 2; administer insulin for T1DM or uncertain diagnosis; urgent endocrine (preferred) consult for T1DM; admit if ketoacidosis signs.',
          recs: ['Hold ICPi until controlled; start insulin if T1DM suspected.', 'Urgent endocrine consult; check for ketosis/DKA.'],
        },
        3: {
          rl: 'high',
          interp:
            'Grade 3 ICPi hyperglycemia. Hold ICPi until toxicity recovers to ≤grade 1; urgent endocrine consult; initiate insulin; admit if DKA concern, symptomatic, or unable to see endocrinology promptly.',
          recs: ['Hold ICPi; insulin therapy; urgent endocrine consult.', 'Admit if ketotic, symptomatic, or DKA risk.'],
        },
        4: {
          rl: 'critical',
          interp:
            'Grade 4 ICPi hyperglycemia — life-threatening (e.g., DKA/HHS). Hold ICPi; emergency insulin and inpatient/ICU management; urgent endocrinology.',
          recs: ['Emergency insulin; admit (ICU if DKA/HHS).', 'Urgent endocrine consult.'],
        },
      };
      const entry = map[g];
      return {
        score: g,
        unit: 'grade',
        label: `Grade ${g} immune-related hyperglycemia/diabetes`,
        interpretation: entry.interp,
        riskLevel: entry.rl,
        recommendations: entry.recs,
        details: [{ label: 'Grade', value: `G${g}` }],
      };
    },
    evidence: {
      summary:
        'Grading by fasting glucose bands (>160, >160–250, >250–500, >500 mg/dL) with symptom/ketosis modifiers per ASCO; management prioritizes insulin and endocrine referral.',
      formula: 'Single-criterion grade selection (1–4) by fasting glucose and symptoms',
      validation:
        'Thresholds match the ASCO guideline; distinguishing insulin-deficient (type-1-like) diabetes from type 2 is emphasized as critical.',
      references: [
        {
          title: 'Management of Immune-Related Adverse Events in Patients Treated With Immune Checkpoint Inhibitor Therapy: ASCO Guideline',
          citation: 'Brahmer JR, Lacchetti C, Schneider BJ, et al. J Clin Oncol. 2018;36(17):1714-1768',
          year: 2018,
          pmid: '29442540',
          doi: '10.1200/JCO.2017.77.6385',
        },
      ],
    },
    nextSteps: [
      { condition: 'Any new hyperglycemia', actions: ['Check anion gap and urine/serum ketones', 'C-peptide and islet autoantibodies (GAD, IA-2, insulin, ZnT8) if T1DM suspected'] },
      { condition: 'Ketosis or DKA', actions: ['Insulin; admit', 'Hold ICPi until controlled'] },
    ],
    pearls: [
      'ICPi-related diabetes is typically insulin-deficient and can present abruptly with DKA — insulin is the treatment of choice when in doubt.',
      'Monitor glucose at baseline, each cycle during induction (~12 weeks), then every 3–6 weeks.',
      'Corticosteroids do NOT reverse islet-cell destruction — treat with insulin, not immunosuppression.',
    ],
  },

  // ─── 23. irAE hypothyroidism ──────────────────────────────────────────────
  {
    id: 'irae-hypothyroid',
    name: 'Immune-Related Adverse Events — Endocrine Toxicity (Hypothyroidism) Grading',
    shortName: 'irAE hypothyroid',
    description:
      'Grades immune checkpoint inhibitor–associated hypothyroidism by TSH and symptom severity with grade-specific ASCO management.',
    category: 'oncology',
    tags: ['irae', 'hypothyroidism', 'tsh', 'checkpoint inhibitor', 'asco', 'endocrine', 'levothyroxine'],
    whenToUse:
      'An adult develops hypothyroidism symptoms or abnormal TSH/free T4 while on immune checkpoint inhibitor therapy.',
    whyUse:
      'Thyroid irAEs are among the most common endocrinopathies; grading by TSH and symptoms decides thyroid hormone replacement and whether ICPi is held.',
    inputs: [
      selectInput('grade', 'Grade for hypothyroidism', [
        { label: 'Grade 1 — TSH <10 mIU/L and asymptomatic', value: 1 },
        { label: 'Grade 2 — moderate symptoms, able to perform ADLs; TSH persistently >10 mIU/L', value: 2 },
        { label: 'Grade 3–4 — severe symptoms, medically significant or life-threatening consequences, unable to perform ADLs', value: 3 },
      ], 1, 'Grade by TSH elevation and symptom/functional severity; grade 3–4 covers severe disease including myxedema.'),
    ],
    calculate(values) {
      const g = num(values.grade, 1);
      const map: Record<number, { rl: RiskLevel; interp: string; recs: string[] }> = {
        1: {
          rl: 'low',
          interp:
            'Grade 1 ICPi hypothyroidism (TSH <10 mIU/L, asymptomatic). Continue ICPi with close follow-up and monitoring of TSH and free thyroxine every 4–6 weeks.',
          recs: ['Continue ICPi; monitor TSH/free T4 every 4–6 weeks.', 'Treat if TSH rises persistently >10 mIU/L or symptoms develop.'],
        },
        2: {
          rl: 'moderate',
          interp:
            'Grade 2 ICPi hypothyroidism. May hold ICPi until symptoms resolve to baseline; consider endocrinology consult; consider thyroid hormone supplementation in symptomatic patients with any TSH elevation or asymptomatic patients with TSH persistently >10 mIU/L (~4 weeks apart); monitor TSH every 6–8 weeks while titrating; use free T4 short-term to confirm adequacy when initially low.',
          recs: ['Consider levothyroxine; hold ICPi until symptoms resolve.', 'Titrate to normal TSH; monitor every 6–8 weeks.'],
        },
        3: {
          rl: 'high',
          interp:
            'Grade 3–4 ICPi hypothyroidism — severe symptoms/myxedema concern. Hold ICPi until symptoms resolve with supplementation; endocrinology consult; consider admission for IV therapy if myxedema signs (bradycardia, hypothermia); supplement thyroid hormone and reassess as in grade 2.',
          recs: ['Hold ICPi; thyroid hormone replacement (IV if myxedema).', 'Endocrinology consult; admit for severe features.'],
        },
      };
      const entry = map[g];
      return {
        score: g,
        unit: 'grade',
        label: g === 3 ? 'Grade 3–4 immune-related hypothyroidism' : `Grade ${g} immune-related hypothyroidism`,
        interpretation: entry.interp,
        riskLevel: entry.rl,
        recommendations: entry.recs,
        details: [{ label: 'Grade', value: `G${g}` }],
      };
    },
    evidence: {
      summary:
        'Grading per ASCO: grade 1 asymptomatic TSH <10 mIU/L; grade 2 moderate symptoms or persistent TSH >10 mIU/L; grade 3–4 severe/life-threatening (e.g., myxedema). Management per ASCO irAE guideline.',
      formula: 'Single-criterion grade selection (1–3) by TSH and symptoms',
      validation:
        'Matches the ASCO guideline; distinguishes primary hypothyroidism from central hypothyroidism due to ICPi hypophysitis (check free T4 with TSH).',
      references: [
        {
          title: 'Management of Immune-Related Adverse Events in Patients Treated With Immune Checkpoint Inhibitor Therapy: ASCO Guideline',
          citation: 'Brahmer JR, Lacchetti C, Schneider BJ, et al. J Clin Oncol. 2018;36(17):1714-1768',
          year: 2018,
          pmid: '29442540',
          doi: '10.1200/JCO.2017.77.6385',
        },
      ],
    },
    nextSteps: [
      { condition: 'Elevated TSH', actions: ['Check free T4 — low free T4 with non-elevated TSH suggests central hypothyroidism (hypophysitis)', 'Start levothyroxine if symptomatic or TSH persistently >10 mIU/L'] },
      { condition: 'Severe features (bradycardia, hypothermia)', actions: ['Admit; IV thyroid replacement for myxedema', 'Evaluate for concurrent hypophysitis/adrenal insufficiency before thyroid hormone (steroids first if adrenal insufficiency possible)'] },
    ],
    pearls: [
      'Always pair TSH with free T4 — a low/normal TSH with low free T4 suggests hypophysitis, not primary hypothyroidism.',
      'ICPi thyroiditis often begins with a transient thyrotoxic phase before hypothyroidism.',
      'Check for adrenal insufficiency before starting thyroid hormone if central disease is possible.',
    ],
  },
];
