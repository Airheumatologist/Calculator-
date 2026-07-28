import type { Calculator } from '../../types/calculator';
import { num, bool, round, yesNo, selectInput, numberInput, riskFromThresholds } from '../../utils/helpers';

// Keep shared helpers type-checked even if a given calc omits some.
const _sharedHelpers = { bool, yesNo, riskFromThresholds };
void _sharedHelpers;

/** Lund–Browder age-band head/thigh/leg % (one side for limbs; educational). */
function lundBrowderPercents(ageYears: number): {
  head: number;
  thigh: number;
  leg: number;
  note: string;
} {
  // Classic teaching bands (approx). Neck 1%, upper arm 4%, forearm 3%, hand 2.5%,
  // buttock 2.5% each, genitalia 1%, trunk ant/post 13% each are age-stable.
  if (ageYears < 1) {
    return { head: 19, thigh: 5.5, leg: 5, note: 'Infant <1 y: larger head, smaller legs' };
  }
  if (ageYears < 5) {
    return { head: 17, thigh: 6.5, leg: 5, note: 'Age 1–4 y band (simplified)' };
  }
  if (ageYears < 10) {
    return { head: 13, thigh: 8, leg: 5.5, note: 'Age 5–9 y band (simplified)' };
  }
  if (ageYears < 15) {
    return { head: 11, thigh: 8.5, leg: 6, note: 'Age 10–14 y band (simplified)' };
  }
  return { head: 9, thigh: 9, leg: 7, note: 'Adult / ≥15 y proportions' };
}

export const wave4FormulasCalcs: Calculator[] = [
  // ─── 1. Harris–Benedict BMR ────────────────────────────────────────────────
  {
    id: 'harris-benedict',
    name: 'Harris–Benedict BMR (Revised)',
    shortName: 'Harris–Benedict',
    description: 'Estimates basal metabolic rate with the revised Harris–Benedict equations (Roza–Shizgal).',
    category: 'general',
    tags: ['bmr', 'ree', 'nutrition', 'harris-benedict', 'energy'],
    whenToUse: 'Estimate resting energy needs for nutrition planning when a predictive equation is appropriate.',
    whyUse: 'Classic BMR equations; still used educationally (Mifflin–St Jeor often preferred in modern practice).',
    inputs: [
      numberInput('weight', 'Weight', { unit: 'kg', min: 30, max: 300, step: 0.1, defaultValue: 70 }),
      numberInput('height', 'Height', { unit: 'cm', min: 120, max: 230, defaultValue: 170 }),
      numberInput('age', 'Age', { unit: 'years', min: 15, max: 100, defaultValue: 40 }),
      selectInput('sex', 'Sex', [
        { label: 'Male', value: 'M' },
        { label: 'Female', value: 'F' },
      ]),
      selectInput('activity', 'Activity / stress multiplier (optional TDEE)', [
        { label: 'BMR only (×1.0)', value: 1 },
        { label: 'Sedentary (×1.2)', value: 1.2 },
        { label: 'Light activity (×1.375)', value: 1.375 },
        { label: 'Moderate (×1.55)', value: 1.55 },
        { label: 'Very active (×1.725)', value: 1.725 },
        { label: 'Extra active (×1.9)', value: 1.9 },
      ]),
    ],
    calculate(values) {
      const w = num(values.weight, 70);
      const h = num(values.height, 170);
      const age = num(values.age, 40);
      const mult = num(values.activity, 1);
      // Revised Harris–Benedict (Roza & Shizgal, 1984)
      const bmr =
        values.sex === 'F'
          ? 447.593 + 9.247 * w + 3.098 * h - 4.33 * age
          : 88.362 + 13.397 * w + 4.799 * h - 5.677 * age;
      const bmrR = round(bmr, 0);
      const tdee = round(bmr * mult, 0);
      return {
        score: bmrR,
        unit: 'kcal/day',
        label: mult > 1 ? `BMR ${bmrR} · TDEE ≈ ${tdee}` : 'Estimated BMR',
        interpretation:
          mult > 1
            ? `Revised Harris–Benedict BMR ≈ ${bmrR} kcal/day; with multiplier ${mult} → TDEE ≈ ${tdee} kcal/day. Adjust for illness, obesity equations, and measured REE when available.`
            : `Revised Harris–Benedict BMR ≈ ${bmrR} kcal/day. Multiply by activity/stress factors for total energy expenditure.`,
        riskLevel: 'info',
        details: [
          { label: 'BMR', value: `${bmrR} kcal/day` },
          { label: 'TDEE (with factor)', value: `${tdee} kcal/day` },
          { label: 'Multiplier', value: String(mult) },
        ],
      };
    },
    evidence: {
      summary:
        'Revised Harris–Benedict: Men 88.362 + 13.397W + 4.799H − 5.677A; Women 447.593 + 9.247W + 3.098H − 4.330A (W kg, H cm, A years).',
      formula:
        '♂ BMR = 88.362 + 13.397·kg + 4.799·cm − 5.677·age; ♀ BMR = 447.593 + 9.247·kg + 3.098·cm − 4.330·age',
      validation: 'Recalculated from original HB data (Roza & Shizgal 1984); tends to overestimate REE vs indirect calorimetry in some groups.',
      references: [
        {
          title: 'The Harris Benedict equation reevaluated',
          citation: 'Roza AM, Shizgal HM. Am J Clin Nutr. 1984',
          year: 1984,
          pmid: '6741850',
          doi: '10.1093/ajcn/40.1.168',
        },
        {
          title: 'A biometric study of basal metabolism in man',
          citation: 'Harris JA, Benedict FG. Carnegie Institute. 1919',
          year: 1919,
          url: 'https://archive.org/details/biometricstudyof00harruoft',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Nutrition prescription',
        actions: ['Consider Mifflin–St Jeor or measured REE', 'Apply disease-specific stress factors cautiously', 'Reassess with weight trend and intake'],
      },
    ],
    pearls: ['Original 1919 constants differ slightly from the revised equations used here.', 'Activity factors are population averages — critically ill patients need tailored estimates.'],
  },

  // ─── 2. Mifflin–St Jeor ────────────────────────────────────────────────────
  {
    id: 'mifflin-st-jeor',
    name: 'Mifflin–St Jeor REE/BMR',
    shortName: 'Mifflin–St Jeor',
    description: 'Estimates resting energy expenditure (REE) with the Mifflin–St Jeor equation.',
    category: 'general',
    tags: ['bmr', 'ree', 'mifflin', 'nutrition', 'energy'],
    whenToUse: 'Preferred common predictive equation for resting energy needs in many ambulatory adults.',
    whyUse: 'Generally more accurate than Harris–Benedict for contemporary populations.',
    inputs: [
      numberInput('weight', 'Weight', { unit: 'kg', min: 30, max: 300, step: 0.1, defaultValue: 70 }),
      numberInput('height', 'Height', { unit: 'cm', min: 120, max: 230, defaultValue: 170 }),
      numberInput('age', 'Age', { unit: 'years', min: 18, max: 100, defaultValue: 40 }),
      selectInput('sex', 'Sex', [
        { label: 'Male', value: 'M' },
        { label: 'Female', value: 'F' },
      ]),
      selectInput('activity', 'Activity multiplier (optional TDEE)', [
        { label: 'REE only (×1.0)', value: 1 },
        { label: 'Sedentary (×1.2)', value: 1.2 },
        { label: 'Light (×1.375)', value: 1.375 },
        { label: 'Moderate (×1.55)', value: 1.55 },
        { label: 'Very active (×1.725)', value: 1.725 },
        { label: 'Extra active (×1.9)', value: 1.9 },
      ]),
    ],
    calculate(values) {
      const w = num(values.weight, 70);
      const h = num(values.height, 170);
      const age = num(values.age, 40);
      const mult = num(values.activity, 1);
      const ree = 10 * w + 6.25 * h - 5 * age + (values.sex === 'F' ? -161 : 5);
      const reeR = round(ree, 0);
      const tdee = round(ree * mult, 0);
      return {
        score: reeR,
        unit: 'kcal/day',
        label: mult > 1 ? `REE ${reeR} · TDEE ≈ ${tdee}` : 'Estimated REE',
        interpretation: `Mifflin–St Jeor REE ≈ ${reeR} kcal/day${
          mult > 1 ? `; ×${mult} → TDEE ≈ ${tdee} kcal/day` : ''
        }. Prefer indirect calorimetry in ICU/complex nutrition when available.`,
        riskLevel: 'info',
        details: [
          { label: 'REE / BMR', value: `${reeR} kcal/day` },
          { label: 'TDEE', value: `${tdee} kcal/day` },
        ],
      };
    },
    evidence: {
      summary: 'Mifflin–St Jeor: REE = 10·W(kg) + 6.25·H(cm) − 5·age + 5 (men) or −161 (women).',
      formula: 'REE = 10W + 6.25H − 5A + s; s = +5 ♂, −161 ♀',
      validation: 'Often recommended by Academy of Nutrition and Dietetics as a reliable predictive equation in non-obese and obese adults.',
      references: [
        {
          title: 'A new predictive equation for resting energy expenditure in healthy individuals',
          citation: 'Mifflin MD et al. Am J Clin Nutr. 1990',
          year: 1990,
          pmid: '2305711',
          doi: '10.1093/ajcn/51.2.241',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Using for weight goals',
        actions: ['Create calorie deficit/surplus thoughtfully', 'Combine with protein targets and resistance training counseling'],
      },
    ],
    pearls: ['Uses actual body weight in the original derivation; some protocols use adjusted weight in class III obesity.'],
  },

  // ─── 3. Protein needs ──────────────────────────────────────────────────────
  {
    id: 'protein-needs',
    name: 'Daily Protein Needs',
    shortName: 'Protein Needs',
    description: 'Estimates daily protein requirement (g/day) from weight and clinical g/kg target.',
    category: 'general',
    tags: ['protein', 'nutrition', 'icu', 'diet'],
    whenToUse: 'Setting protein goals for healthy adults, illness, or recovery when weight-based targets apply.',
    whyUse: 'Quick g/day from common g/kg ranges used in nutrition support.',
    inputs: [
      numberInput('weight', 'Weight for dosing', {
        unit: 'kg',
        min: 20,
        max: 300,
        step: 0.1,
        defaultValue: 70,
        helpText: 'Use IBW/AdjBW per local nutrition protocol when obese',
      }),
      selectInput('target', 'Protein target', [
        { label: 'RDA healthy adult (~0.8 g/kg)', value: 0.8 },
        { label: 'Active / older adult (~1.2 g/kg)', value: 1.2 },
        { label: 'Illness / wound healing (~1.5 g/kg)', value: 1.5 },
        { label: 'Critical illness common (~1.8 g/kg)', value: 1.8 },
        { label: 'High / burns-range (~2.0 g/kg)', value: 2.0 },
        { label: 'Custom (use g/kg field)', value: 0 },
      ]),
      numberInput('customGkg', 'Custom g/kg (if custom)', {
        unit: 'g/kg/day',
        min: 0.4,
        max: 3,
        step: 0.1,
        defaultValue: 1.2,
      }),
    ],
    calculate(values) {
      const w = num(values.weight, 70);
      const preset = num(values.target, 0.8);
      const gkg = preset === 0 ? num(values.customGkg, 1.2) : preset;
      const grams = round(w * gkg, 0);
      return {
        score: grams,
        unit: 'g/day',
        label: `${grams} g protein/day`,
        interpretation: `≈ ${grams} g/day at ${gkg} g/kg × ${w} kg. Adjust for CKD (often lower), dialysis, burns, and measured needs. Educational estimate only.`,
        riskLevel: 'info',
        details: [
          { label: 'g/kg/day', value: String(gkg) },
          { label: 'Weight used', value: `${w} kg` },
        ],
        recommendations: [
          'Critically ill: often 1.2–2.0 g/kg/day depending on guideline and phase of illness',
          'CKD not on dialysis: protein targets are typically lower — use nephrology/dietitian guidance',
        ],
      };
    },
    evidence: {
      summary: 'Protein (g/day) = weight (kg) × target g/kg/day. Targets vary by age, activity, critical illness, and renal function.',
      formula: 'Protein_g = kg × (g/kg/day)',
      validation: 'ASPEN/ESPEN and RDA frameworks provide ranges; individualize.',
      references: [
        {
          title: 'Guidelines for the provision and assessment of nutrition support therapy in the adult critically ill patient',
          citation: 'McClave SA et al. JPEN. 2016 (ASPEN/SCCM)',
          year: 2016,
          pmid: '26773077',
          doi: '10.1177/0148607115621863',
        },
      ],
    },
    nextSteps: [
      { condition: 'ICU / complex nutrition', actions: ['Dietitian consult', 'Consider nitrogen balance or urea kinetics', 'Align with energy prescription'] },
    ],
    pearls: ['Obese critically ill: many protocols use IBW or AdjBW for protein calculations.'],
  },

  // ─── 4. Nitrogen balance ───────────────────────────────────────────────────
  {
    id: 'nitrogen-balance',
    name: 'Nitrogen Balance',
    shortName: 'N Balance',
    description: 'Estimates nitrogen balance from protein intake and 24-h urine urea nitrogen (UUN).',
    category: 'general',
    tags: ['nitrogen', 'protein', 'nutrition', 'uun', 'icu'],
    whenToUse: 'Assessing catabolic state / adequacy of protein delivery with 24-h UUN collection.',
    whyUse: 'Simple bedside estimate of anabolic vs catabolic nitrogen status.',
    inputs: [
      numberInput('proteinIntake', 'Protein intake (24 h)', { unit: 'g/day', min: 0, max: 400, defaultValue: 100 }),
      numberInput('uun', 'Urine urea nitrogen (24 h)', { unit: 'g/day', min: 0, max: 50, step: 0.1, defaultValue: 10 }),
      numberInput('insensible', 'Insensible / fecal N factor', {
        unit: 'g/day',
        min: 2,
        max: 6,
        step: 0.5,
        defaultValue: 4,
        helpText: 'Classic +4 g/day; some use 2–4 g',
      }),
    ],
    calculate(values) {
      const protein = num(values.proteinIntake, 100);
      const uun = num(values.uun, 10);
      const ins = num(values.insensible, 4);
      const nin = protein / 6.25;
      const nout = uun + ins;
      const bal = round(nin - nout, 1);
      let label = 'Near equilibrium';
      let riskLevel: 'low' | 'moderate' | 'high' | 'info' | 'normal' = 'normal';
      let interpretation = `N balance ≈ ${bal} g/day. Rough equilibrium.`;
      if (bal >= 1) {
        label = 'Positive (anabolic)';
        riskLevel = 'low';
        interpretation = `Positive N balance ≈ +${bal} g/day — net anabolism if collection valid.`;
      } else if (bal <= -1) {
        label = 'Negative (catabolic)';
        riskLevel = bal <= -5 ? 'high' : 'moderate';
        interpretation = `Negative N balance ≈ ${bal} g/day — catabolism or inadequate intake. Review protein delivery and losses.`;
      }
      return {
        score: bal,
        unit: 'g N/day',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'N intake', value: `${round(nin, 1)} g/day (protein/6.25)` },
          { label: 'N output', value: `${round(nout, 1)} g/day (UUN + ${ins})` },
        ],
      };
    },
    evidence: {
      summary: 'N balance = (protein intake g / 6.25) − (UUN g/day + insensible factor, often 4 g).',
      formula: 'N_bal = Protein/6.25 − (UUN + 4)',
      validation: 'Teaching method; incomplete collections, burns, drains, and renal failure limit accuracy.',
      references: [
        {
          title: 'Nitrogen balance in clinical practice (nutrition support teaching)',
          citation: 'Classic clinical nutrition methods; see ASPEN nutrition support curricula',
          year: 2016,
          pmid: '26773077',
          doi: '10.1177/0148607115621863',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Negative balance',
        actions: ['Increase protein if appropriate', 'Treat underlying catabolic driver', 'Verify 24-h collection completeness'],
      },
    ],
    pearls: ['Urea is ~46% nitrogen; UUN assays already report nitrogen grams in standard teaching formulas.', 'Not valid without steady-state intake and complete urine collection.'],
  },

  // ─── 5. Urea reduction ratio ───────────────────────────────────────────────
  {
    id: 'urea-reduction-ratio',
    name: 'Urea Reduction Ratio (URR)',
    shortName: 'URR',
    description: 'Percent reduction in blood urea nitrogen during a hemodialysis session.',
    category: 'nephrology',
    tags: ['dialysis', 'urr', 'hemodialysis', 'adequacy'],
    whenToUse: 'Session adequacy estimate from pre- and post-dialysis BUN.',
    whyUse: 'Simple adequacy metric; target often URR ≥65% for thrice-weekly HD (with caveats).',
    inputs: [
      numberInput('preBun', 'Pre-dialysis BUN', { unit: 'mg/dL', min: 10, max: 200, defaultValue: 60 }),
      numberInput('postBun', 'Post-dialysis BUN', { unit: 'mg/dL', min: 5, max: 150, defaultValue: 20 }),
    ],
    calculate(values) {
      const pre = num(values.preBun, 60);
      const post = num(values.postBun, 20);
      if (pre <= 0) {
        return {
          score: '—',
          label: 'Invalid pre-BUN',
          interpretation: 'Pre-dialysis BUN must be >0.',
          riskLevel: 'info',
        };
      }
      const urr = round(((pre - post) / pre) * 100, 1);
      const r = riskFromThresholds(urr, [
        {
          max: 54.9,
          level: 'high',
          label: 'Low URR',
          interpretation: 'URR <55% suggests inadequate single-session clearance — review access, time, blood flow, recirculation.',
        },
        {
          max: 64.9,
          level: 'moderate',
          label: 'Borderline URR',
          interpretation: 'URR 55–64%: below common ≥65% thrice-weekly target; interpret with Kt/V and clinical status.',
        },
        {
          max: 100,
          level: 'normal',
          label: 'URR at/above common target',
          interpretation: 'URR ≥65% meets a commonly cited thrice-weekly HD adequacy threshold (not a substitute for full care quality).',
        },
      ]);
      return {
        score: urr,
        unit: '%',
        ...r,
        details: [
          { label: 'Pre BUN', value: `${pre} mg/dL` },
          { label: 'Post BUN', value: `${post} mg/dL` },
        ],
      };
    },
    evidence: {
      summary: 'URR = (preBUN − postBUN) / preBUN × 100%. Related to but not identical to Kt/V.',
      formula: 'URR = (BUN_pre − BUN_post) / BUN_pre × 100',
      validation: 'KDOQI adequacy discussions historically used URR ≥65% alongside spKt/V targets.',
      references: [
        {
          title: 'KDOQI Clinical Practice Guideline for Hemodialysis Adequacy: 2015 update',
          citation: 'National Kidney Foundation. Am J Kidney Dis. 2015',
          year: 2015,
          pmid: '26498416',
          doi: '10.1053/j.ajkd.2015.07.015',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Low URR',
        actions: ['Check post-BUN sampling technique', 'Evaluate access recirculation', 'Consider longer/more frequent dialysis', 'Compute spKt/V'],
      },
    ],
    pearls: ['Post-BUN timing and rebound affect both URR and Kt/V.', 'Single-pool metrics do not capture residual kidney function or quality of life.'],
  },

  // ─── 6. spKt/V Daugirdas ───────────────────────────────────────────────────
  {
    id: 'ktv-daugirdas',
    name: 'spKt/V (Daugirdas Second Generation)',
    shortName: 'spKt/V',
    description: 'Single-pool Kt/V for hemodialysis using the Daugirdas second-generation formula.',
    category: 'nephrology',
    tags: ['dialysis', 'kt/v', 'daugirdas', 'adequacy', 'hemodialysis'],
    whenToUse: 'Estimating single-pool dialysis dose from pre/post BUN, session length, UF, and post weight.',
    whyUse: 'Standard clinical approximation of urea kinetic dose for thrice-weekly HD.',
    inputs: [
      numberInput('preBun', 'Pre-dialysis BUN', { unit: 'mg/dL', min: 10, max: 200, defaultValue: 60 }),
      numberInput('postBun', 'Post-dialysis BUN', { unit: 'mg/dL', min: 5, max: 150, defaultValue: 18 }),
      numberInput('hours', 'Session length', { unit: 'hours', min: 1, max: 8, step: 0.25, defaultValue: 4 }),
      numberInput('uf', 'Ultrafiltration volume', { unit: 'L', min: 0, max: 8, step: 0.1, defaultValue: 2 }),
      numberInput('postWeight', 'Post-dialysis weight', { unit: 'kg', min: 20, max: 200, step: 0.1, defaultValue: 70 }),
    ],
    calculate(values) {
      const pre = num(values.preBun, 60);
      const post = num(values.postBun, 18);
      const t = num(values.hours, 4);
      const uf = num(values.uf, 2);
      const w = num(values.postWeight, 70);
      if (pre <= 0 || post <= 0 || w <= 0) {
        return {
          score: '—',
          label: 'Invalid inputs',
          interpretation: 'Need positive pre/post BUN and post weight.',
          riskLevel: 'info',
        };
      }
      const R = post / pre;
      if (R >= 1) {
        return {
          score: '—',
          label: 'No urea reduction',
          interpretation: 'Post-BUN ≥ pre-BUN — check values or sampling.',
          riskLevel: 'high',
        };
      }
      // Daugirdas II: −ln(R − 0.008t) + (4 − 3.5R) × (UF/W)
      const arg = R - 0.008 * t;
      if (arg <= 0) {
        return {
          score: '—',
          label: 'Out of formula range',
          interpretation: 'R − 0.008t ≤ 0; verify BUN ratio and time.',
          riskLevel: 'info',
        };
      }
      const spKtv = round(-Math.log(arg) + (4 - 3.5 * R) * (uf / w), 2);
      const urr = round((1 - R) * 100, 1);
      const r = riskFromThresholds(spKtv, [
        {
          max: 1.19,
          level: 'high',
          label: 'Below common spKt/V target',
          interpretation: 'spKt/V <1.2 often considered inadequate for thrice-weekly HD (targets vary; many aim for ≥1.2 or higher equilibrated targets).',
        },
        {
          max: 1.39,
          level: 'moderate',
          label: 'Near minimal adequacy band',
          interpretation: 'spKt/V 1.2–1.39 near historical minimal targets; clinical programs often aim higher.',
        },
        {
          max: 3,
          level: 'normal',
          label: 'At/above common target band',
          interpretation: 'spKt/V ≥1.4 is a frequent program target range component — still integrate residual function, symptoms, and volume.',
        },
      ]);
      return {
        score: spKtv,
        unit: 'spKt/V',
        ...r,
        details: [
          { label: 'R (post/pre)', value: String(round(R, 3)) },
          { label: 'URR', value: `${urr}%` },
          { label: 'UF/W', value: String(round(uf / w, 3)) },
        ],
      };
    },
    evidence: {
      summary: 'Daugirdas second-generation: spKt/V = −ln(R − 0.008t) + (4 − 3.5R)×(UF/W); R = post/pre BUN, t hours, UF liters, W post-HD kg.',
      formula: 'spKt/V = −ln(R − 0.008·t) + (4 − 3.5·R)·(UF/W)',
      validation: 'Widely used clinical estimate of single-pool urea Kt/V; equilibrated Kt/V is lower due to rebound.',
      references: [
        {
          title: 'Second generation logarithmic estimates of single-pool variable volume Kt/V',
          citation: 'Daugirdas JT. J Am Soc Nephrol. 1993',
          year: 1993,
          pmid: '8305648',
          doi: '10.1681/ASN.V451205',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Low spKt/V',
        actions: ['Optimize blood/dialysate flow and time', 'Assess access', 'Consider more frequent HD', 'Review residual kidney function'],
      },
    ],
    pearls: ['Post-dialysis BUN must be drawn correctly (avoid rebound undershoot from access recirculation sampling errors).'],
  },

  // ─── 7. 4-2-1 hourly fluids ────────────────────────────────────────────────
  {
    id: '4-2-1-hourly',
    name: '4-2-1 Hourly Maintenance Fluids',
    shortName: '4-2-1',
    description: 'Hourly IV maintenance fluid rate by the 4-2-1 (Holliday–Segar hourly) rule.',
    category: 'general',
    tags: ['fluids', '4-2-1', 'maintenance', 'ivf', 'pediatrics'],
    whenToUse: 'Quick hourly maintenance rate from weight when daily 100/50/20 math is not needed.',
    whyUse: 'Bedside mnemonic identical in intent to Holliday–Segar hourly delivery.',
    inputs: [numberInput('weight', 'Weight', { unit: 'kg', min: 1, max: 200, step: 0.1, defaultValue: 20 })],
    calculate(values) {
      const w = num(values.weight, 20);
      let rate: number;
      if (w <= 10) rate = 4 * w;
      else if (w <= 20) rate = 40 + 2 * (w - 10);
      else rate = 60 + 1 * (w - 20);
      const daily = round(rate * 24, 0);
      return {
        score: round(rate, 1),
        unit: 'mL/hr',
        label: 'Hourly maintenance rate',
        interpretation: `4-2-1 rate ≈ ${round(rate, 1)} mL/hr (≈ ${daily} mL/day). Adjust for losses, SIADH risk, heart/renal failure. Prefer isotonic maintenance in many hospitalized children.`,
        riskLevel: 'info',
        details: [
          { label: 'Rule', value: '4 mL/kg/h first 10 kg + 2 next 10 + 1 thereafter' },
          { label: 'Daily equivalent', value: `${daily} mL/day` },
        ],
      };
    },
    evidence: {
      summary: 'Hourly Holliday–Segar: 4 mL/kg/h for first 10 kg, 2 mL/kg/h for next 10 kg, 1 mL/kg/h for each kg above 20.',
      formula: 'rate = 4·min(w,10) + 2·min(max(w−10,0),10) + 1·max(w−20,0)',
      validation: 'Same physiologic basis as Holliday–Segar daily 100/50/20 rule (1957).',
      references: [
        {
          title: 'The maintenance need for water in parenteral fluid therapy',
          citation: 'Holliday MA, Segar WE. Pediatrics. 1957',
          year: 1957,
          pmid: '13431307',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Pediatric IVF',
        actions: ['Choose isotonic fluid per local/AAP guidance', 'Add glucose/K thoughtfully', 'Separate deficit from maintenance'],
      },
    ],
    pearls: ['For adults >60 kg, 4-2-1 often overestimates needs vs ~25–30 mL/kg/day rules — clinical judgment required.'],
  },

  // ─── 8. Brooke burn formula ────────────────────────────────────────────────
  {
    id: 'brooke-formula',
    name: 'Brooke Burn Fluid Formula (Modified)',
    shortName: 'Brooke',
    description: 'Estimates first-24-hour crystalloid resuscitation for major burns (modified Brooke: 2 mL × kg × %TBSA).',
    category: 'emergency',
    tags: ['burn', 'brooke', 'fluids', 'trauma', 'tbsa'],
    whenToUse: 'Alternative to Parkland for burn shock resuscitation planning (still titrate to endpoints).',
    whyUse: 'Lower starting crystalloid estimate (2 mL/kg/%TBSA) than classic Parkland 4 mL; used in some burn protocols.',
    inputs: [
      numberInput('weight', 'Weight', { unit: 'kg', min: 5, max: 200, defaultValue: 70 }),
      numberInput('tbsa', 'TBSA burned', { unit: '%', min: 1, max: 100, defaultValue: 20 }),
    ],
    calculate(values) {
      const w = num(values.weight, 70);
      const tbsa = num(values.tbsa, 20);
      const total = round(2 * w * tbsa, 0);
      const first8 = round(total / 2, 0);
      const next16 = total - first8;
      const parkland = round(4 * w * tbsa, 0);
      return {
        score: total,
        unit: 'mL / 24h',
        label: 'Modified Brooke 24h crystalloid',
        interpretation: `Modified Brooke ≈ ${total} mL LR-type crystalloid in 24h: ½ (${first8} mL) in first 8h from injury, remainder (${next16} mL) over next 16h. Titrate to UOP (~0.5 mL/kg/h adults). Classic Parkland estimate would be ~${parkland} mL.`,
        riskLevel: tbsa >= 20 ? 'high' : 'moderate',
        details: [
          { label: 'First 8 hours', value: `${first8} mL` },
          { label: 'Next 16 hours', value: `${next16} mL` },
          { label: 'Parkland comparator (4 mL)', value: `${parkland} mL` },
        ],
      };
    },
    evidence: {
      summary: 'Modified Brooke crystalloid estimate: 2 mL × kg × %TBSA in 24 hours (half in first 8 hours). Original Brooke included colloid components historically.',
      formula: 'Volume_24h ≈ 2 × weight_kg × %TBSA (modified Brooke crystalloid)',
      validation: 'Historical Army Brooke formula evolved; modern practice emphasizes titration over fixed formulas (ABA).',
      references: [
        {
          title: 'Burn resuscitation — Parkland and Brooke formula teaching',
          citation: 'Classic burn surgery literature; ABA fluid resuscitation principles',
          year: 1979,
          pmid: '4609676',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Major burn',
        actions: ['ABCs / airway if inhalation', 'Burn center transfer criteria', 'Titrate to UOP and perfusion', 'Avoid over-resuscitation'],
      },
    ],
    pearls: ['Original Brooke used 1.5 mL crystalloid + 0.5 mL colloid × kg × %TBSA plus free water — this tool uses the common modified 2 mL crystalloid teaching form.'],
  },

  // ─── 9. Lund–Browder ───────────────────────────────────────────────────────
  {
    id: 'lund-browder',
    name: 'Lund–Browder TBSA (Simplified)',
    shortName: 'Lund–Browder',
    description: 'Age-adjusted burn %TBSA helper using simplified Lund–Browder regional percentages.',
    category: 'emergency',
    tags: ['burn', 'tbsa', 'lund-browder', 'pediatrics'],
    whenToUse: 'Pediatric or age-sensitive TBSA estimates when rule-of-nines is too crude.',
    whyUse: 'Head and leg proportions change with age; Lund–Browder is the preferred chart method.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 0, max: 100, step: 0.5, defaultValue: 3 }),
      numberInput('head', 'Head & neck burned', { unit: '% of region 0–100', min: 0, max: 100, defaultValue: 0, helpText: 'Percent of this region burned (100 = entire region)' }),
      numberInput('antTrunk', 'Anterior trunk burned', { unit: '% of region', min: 0, max: 100, defaultValue: 0 }),
      numberInput('postTrunk', 'Posterior trunk burned', { unit: '% of region', min: 0, max: 100, defaultValue: 0 }),
      numberInput('armR', 'Right arm (whole) burned', { unit: '% of region', min: 0, max: 100, defaultValue: 0 }),
      numberInput('armL', 'Left arm (whole) burned', { unit: '% of region', min: 0, max: 100, defaultValue: 0 }),
      numberInput('legR', 'Right leg (whole) burned', { unit: '% of region', min: 0, max: 100, defaultValue: 0 }),
      numberInput('legL', 'Left leg (whole) burned', { unit: '% of region', min: 0, max: 100, defaultValue: 0 }),
      numberInput('perineum', 'Perineum / genitalia burned', { unit: '% of region', min: 0, max: 100, defaultValue: 0 }),
    ],
    calculate(values) {
      const age = num(values.age, 3);
      const p = lundBrowderPercents(age);
      // Age-stable regions (simplified adult chart teaching values)
      const antTrunkFull = 13;
      const postTrunkFull = 13;
      const armFull = 7; // upper arm 4 + forearm 3 (hand often 2.5 separate; simplified whole-arm ~7–10)
      const perineumFull = 1;
      // Legs: thigh + leg + foot approx = thigh + leg + ~3.5; use thigh+leg+3.5 as whole leg
      const legFull = p.thigh + p.leg + 3.5;

      const frac = (regionInput: number) => Math.min(100, Math.max(0, regionInput)) / 100;

      const tbsa = round(
        frac(num(values.head, 0)) * p.head +
          frac(num(values.antTrunk, 0)) * antTrunkFull +
          frac(num(values.postTrunk, 0)) * postTrunkFull +
          frac(num(values.armR, 0)) * armFull +
          frac(num(values.armL, 0)) * armFull +
          frac(num(values.legR, 0)) * legFull +
          frac(num(values.legL, 0)) * legFull +
          frac(num(values.perineum, 0)) * perineumFull,
        1
      );

      return {
        score: tbsa,
        unit: '% TBSA',
        label: 'Simplified Lund–Browder TBSA',
        interpretation: `Estimated TBSA ≈ ${tbsa}%. ${p.note}. Educational simplification — use a full Lund–Browder chart for clinical documentation when precision matters.`,
        riskLevel: tbsa >= 20 ? 'high' : tbsa >= 10 ? 'moderate' : 'low',
        details: [
          { label: 'Head/neck full region', value: `${p.head}%` },
          { label: 'Each whole leg (approx)', value: `${round(legFull, 1)}%` },
          { label: 'Each arm (simplified)', value: `${armFull}%` },
          { label: 'Ant/post trunk each', value: `${antTrunkFull}%` },
        ],
      };
    },
    evidence: {
      summary: 'Lund–Browder charts assign age-dependent percentages especially to head and lower extremities.',
      formula: 'TBSA = Σ (fraction of region burned × age-specific region %)',
      validation: 'Standard burn surgery method preferred over rule-of-nines in children.',
      references: [
        {
          title: 'The estimation of areas of burns',
          citation: 'Lund CC, Browder NC. Surg Gynecol Obstet. 1944',
          year: 1944,
          url: 'https://www.ncbi.nlm.nih.gov/books/NBK430730/',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'TBSA estimated',
        actions: ['Apply Parkland/Brooke if indicated', 'Burn center criteria', 'Palm method (~1% patient palm) for patchy burns'],
      },
    ],
    pearls: ['This tool collapses arm segments and uses age bands — not a full chart substitute for OR planning.'],
  },

  // ─── 10. Temp C ↔ F ────────────────────────────────────────────────────────
  {
    id: 'temp-c-f',
    name: 'Temperature °C ↔ °F',
    shortName: 'Temp C/F',
    description: 'Converts temperature between Celsius and Fahrenheit.',
    category: 'general',
    tags: ['conversion', 'temperature', 'units'],
    whenToUse: 'Unit conversion for vital signs and labs reported in different systems.',
    whyUse: 'Avoids mis-triage from °C/°F confusion.',
    inputs: [
      selectInput('direction', 'Convert', [
        { label: '°C → °F', value: 'c2f' },
        { label: '°F → °C', value: 'f2c' },
      ]),
      numberInput('value', 'Temperature', { min: -50, max: 120, step: 0.1, defaultValue: 37 }),
    ],
    calculate(values) {
      const v = num(values.value, 37);
      if (values.direction === 'f2c') {
        const c = round(((v - 32) * 5) / 9, 1);
        return {
          score: c,
          unit: '°C',
          label: `${v} °F = ${c} °C`,
          interpretation: `Fahrenheit ${v} → Celsius ${c}. Oral fever often ≥38 °C (100.4 °F).`,
          riskLevel: 'info',
        };
      }
      const f = round((v * 9) / 5 + 32, 1);
      return {
        score: f,
        unit: '°F',
        label: `${v} °C = ${f} °F`,
        interpretation: `Celsius ${v} → Fahrenheit ${f}.`,
        riskLevel: 'info',
      };
    },
    evidence: {
      summary: '°F = °C × 9/5 + 32; °C = (°F − 32) × 5/9.',
      formula: 'F = C·9/5 + 32; C = (F − 32)·5/9',
      validation: 'Exact linear unit conversion.',
      references: [{ title: 'SI and customary temperature scales', citation: 'Standard metrology', year: 2019, url: 'https://www.nist.gov/pml/owm/metric-si/si-units' }],
    },
    nextSteps: [{ condition: 'Fever thresholds', actions: ['Use consistent site (oral/tympanic/core)', 'Interpret neonate fever protocols carefully'] }],
  },

  // ─── 11. Weight lb ↔ kg ────────────────────────────────────────────────────
  {
    id: 'weight-lb-kg',
    name: 'Weight lb ↔ kg',
    shortName: 'lb/kg',
    description: 'Converts body weight between pounds and kilograms.',
    category: 'general',
    tags: ['conversion', 'weight', 'units'],
    whenToUse: 'Drug dosing and charting when weight units differ.',
    whyUse: '1 kg = 2.2046226218 lb (tool uses 2.20462).',
    inputs: [
      selectInput('direction', 'Convert', [
        { label: 'lb → kg', value: 'lb2kg' },
        { label: 'kg → lb', value: 'kg2lb' },
      ]),
      numberInput('value', 'Weight', { min: 0.5, max: 800, step: 0.1, defaultValue: 154 }),
    ],
    calculate(values) {
      const v = num(values.value, 154);
      if (values.direction === 'kg2lb') {
        const lb = round(v * 2.20462, 1);
        return {
          score: lb,
          unit: 'lb',
          label: `${v} kg = ${lb} lb`,
          interpretation: 'Kilograms to pounds.',
          riskLevel: 'info',
        };
      }
      const kg = round(v / 2.20462, 1);
      return {
        score: kg,
        unit: 'kg',
        label: `${v} lb = ${kg} kg`,
        interpretation: 'Pounds to kilograms — prefer kg for most weight-based dosing.',
        riskLevel: 'info',
      };
    },
    evidence: {
      summary: 'kg = lb / 2.20462; lb = kg × 2.20462.',
      formula: '1 kg = 2.20462 lb',
      validation: 'Standard avoirdupois conversion.',
      references: [{ title: 'NIST unit conversion', citation: 'National Institute of Standards and Technology', year: 2019, url: 'https://www.nist.gov/pml/owm/metric-si/si-units' }],
    },
    nextSteps: [{ condition: 'Dosing', actions: ['Confirm scale unit before mg/kg calculations'] }],
  },

  // ─── 12. Length in ↔ cm ────────────────────────────────────────────────────
  {
    id: 'length-in-cm',
    name: 'Length in ↔ cm',
    shortName: 'in/cm',
    description: 'Converts length/height between inches and centimeters.',
    category: 'general',
    tags: ['conversion', 'height', 'length', 'units'],
    whenToUse: 'Height entry for IBW/BMI and pediatric length conversions.',
    whyUse: 'Exact factor 1 in = 2.54 cm.',
    inputs: [
      selectInput('direction', 'Convert', [
        { label: 'in → cm', value: 'in2cm' },
        { label: 'cm → in', value: 'cm2in' },
      ]),
      numberInput('value', 'Length', { min: 1, max: 300, step: 0.1, defaultValue: 67 }),
    ],
    calculate(values) {
      const v = num(values.value, 67);
      if (values.direction === 'cm2in') {
        const inches = round(v / 2.54, 1);
        return {
          score: inches,
          unit: 'in',
          label: `${v} cm = ${inches} in`,
          interpretation: 'Centimeters to inches.',
          riskLevel: 'info',
        };
      }
      const cm = round(v * 2.54, 1);
      return {
        score: cm,
        unit: 'cm',
        label: `${v} in = ${cm} cm`,
        interpretation: 'Inches to centimeters.',
        riskLevel: 'info',
      };
    },
    evidence: {
      summary: 'cm = in × 2.54; in = cm / 2.54.',
      formula: '1 in = 2.54 cm (exact)',
      validation: 'Defined conversion.',
      references: [{ title: 'NIST unit conversion', citation: 'National Institute of Standards and Technology', year: 2019, url: 'https://www.nist.gov/pml/owm/metric-si/si-units' }],
    },
    nextSteps: [{ condition: 'Anthropometrics', actions: ['Use consistent height for IBW/BMI/BSA'] }],
  },

  // ─── 13. Pressure mmHg ↔ kPa ───────────────────────────────────────────────
  {
    id: 'pressure-mmhg-kpa',
    name: 'Pressure mmHg ↔ kPa',
    shortName: 'mmHg/kPa',
    description: 'Converts pressure between mmHg and kilopascals (blood gas / BP contexts).',
    category: 'general',
    tags: ['conversion', 'pressure', 'abg', 'units'],
    whenToUse: 'ABG or BP values reported in kPa vs mmHg.',
    whyUse: '1 mmHg ≈ 0.133322 kPa; 1 kPa ≈ 7.50062 mmHg.',
    inputs: [
      selectInput('direction', 'Convert', [
        { label: 'mmHg → kPa', value: 'mm2kpa' },
        { label: 'kPa → mmHg', value: 'kpa2mm' },
      ]),
      numberInput('value', 'Pressure', { min: 0, max: 300, step: 0.1, defaultValue: 40 }),
    ],
    calculate(values) {
      const v = num(values.value, 40);
      if (values.direction === 'kpa2mm') {
        const mm = round(v * 7.50062, 1);
        return {
          score: mm,
          unit: 'mmHg',
          label: `${v} kPa = ${mm} mmHg`,
          interpretation: 'Kilopascals to mmHg (e.g., PaCO₂ 5.3 kPa ≈ 40 mmHg).',
          riskLevel: 'info',
        };
      }
      const kpa = round(v * 0.133322, 2);
      return {
        score: kpa,
        unit: 'kPa',
        label: `${v} mmHg = ${kpa} kPa`,
        interpretation: 'mmHg to kilopascals.',
        riskLevel: 'info',
      };
    },
    evidence: {
      summary: 'kPa = mmHg × 0.133322; mmHg = kPa × 7.50062.',
      formula: '1 mmHg ≈ 133.322 Pa = 0.133322 kPa',
      validation: 'Standard gas/blood pressure conversion.',
      references: [{ title: 'IUPAC / metrology pressure units', citation: 'Standard conversion factors', year: 2019, url: 'https://www.nist.gov/pml/owm/metric-si/si-units' }],
    },
    nextSteps: [{ condition: 'ABG interpretation', actions: ['Keep PaO₂/PaCO₂ unit-consistent with local normals'] }],
  },

  // ─── 14. Energy kcal ↔ kJ ──────────────────────────────────────────────────
  {
    id: 'energy-kcal-kj',
    name: 'Energy kcal ↔ kJ',
    shortName: 'kcal/kJ',
    description: 'Converts nutritional energy between kilocalories and kilojoules.',
    category: 'general',
    tags: ['conversion', 'energy', 'nutrition', 'units'],
    whenToUse: 'Food labels and nutrition prescriptions across unit systems.',
    whyUse: '1 kcal (thermochemical) = 4.184 kJ.',
    inputs: [
      selectInput('direction', 'Convert', [
        { label: 'kcal → kJ', value: 'kcal2kj' },
        { label: 'kJ → kcal', value: 'kj2kcal' },
      ]),
      numberInput('value', 'Energy', { min: 0, max: 20000, step: 1, defaultValue: 2000 }),
    ],
    calculate(values) {
      const v = num(values.value, 2000);
      if (values.direction === 'kj2kcal') {
        const kcal = round(v / 4.184, 0);
        return {
          score: kcal,
          unit: 'kcal',
          label: `${v} kJ = ${kcal} kcal`,
          interpretation: 'Kilojoules to kilocalories.',
          riskLevel: 'info',
        };
      }
      const kj = round(v * 4.184, 0);
      return {
        score: kj,
        unit: 'kJ',
        label: `${v} kcal = ${kj} kJ`,
        interpretation: 'Kilocalories to kilojoules.',
        riskLevel: 'info',
      };
    },
    evidence: {
      summary: 'kJ = kcal × 4.184; kcal = kJ / 4.184.',
      formula: '1 kcal = 4.184 kJ',
      validation: 'Thermochemical calorie definition used on most nutrition labels.',
      references: [{ title: 'Nutritional energy unit conversion', citation: 'FAO/WHO food energy methods (thermochemical calorie)', year: 2003, url: 'https://www.fao.org/4/y5022e/y5022e04.htm' }],
    },
    nextSteps: [{ condition: 'Diet counseling', actions: ['Pair energy targets with protein and micronutrient goals'] }],
  },

  // ─── 15. NNT ───────────────────────────────────────────────────────────────
  {
    id: 'number-needed-treat',
    name: 'Number Needed to Treat (NNT)',
    shortName: 'NNT',
    description: 'NNT from absolute risk reduction (ARR) between control and experimental event rates.',
    category: 'general',
    tags: ['ebm', 'nnt', 'arr', 'biostatistics'],
    whenToUse: 'Translating trial event rates into a bedside benefit metric.',
    whyUse: 'Communicates how many patients need treatment to prevent one additional event.',
    inputs: [
      numberInput('cer', 'Control event rate (CER)', {
        unit: '%',
        min: 0,
        max: 100,
        step: 0.1,
        defaultValue: 20,
        helpText: 'Event % in control/placebo group',
      }),
      numberInput('eer', 'Experimental event rate (EER)', {
        unit: '%',
        min: 0,
        max: 100,
        step: 0.1,
        defaultValue: 15,
        helpText: 'Event % in treatment group',
      }),
    ],
    calculate(values) {
      const cer = num(values.cer, 20) / 100;
      const eer = num(values.eer, 15) / 100;
      const arr = cer - eer;
      if (arr <= 0) {
        return {
          score: '—',
          label: arr === 0 ? 'No ARR (NNT undefined)' : 'Harm direction (use NNH)',
          interpretation:
            arr < 0
              ? `EER > CER (ARI = ${round((eer - cer) * 100, 2)}%). Benefit NNT not applicable — compute NNH.`
              : 'ARR = 0; NNT is infinite.',
          riskLevel: 'info',
          details: [
            { label: 'CER', value: `${round(cer * 100, 2)}%` },
            { label: 'EER', value: `${round(eer * 100, 2)}%` },
          ],
        };
      }
      const nnt = 1 / arr;
      const nntR = nnt >= 10 ? round(nnt, 1) : round(nnt, 2);
      return {
        score: nntR,
        label: `NNT ≈ ${nntR}`,
        interpretation: `ARR = ${round(arr * 100, 2)} percentage points. Treat ≈ ${nntR} patients to prevent one additional event (over the trial time horizon).`,
        riskLevel: 'info',
        details: [
          { label: 'ARR', value: `${round(arr * 100, 2)}%` },
          { label: 'RRR', value: cer > 0 ? `${round((arr / cer) * 100, 1)}%` : '—' },
        ],
      };
    },
    evidence: {
      summary: 'NNT = 1 / ARR, where ARR = CER − EER (for beneficial reduction in bad events).',
      formula: 'NNT = 1 / (CER − EER)',
      validation: 'Standard EBM teaching metric; always pair with time horizon and baseline risk.',
      references: [
        {
          title: 'An assessment of clinically useful measures of the consequences of treatment',
          citation: 'Laupacis A, Sackett DL, Roberts RS. N Engl J Med. 1988',
          year: 1988,
          pmid: '3374545',
          doi: '10.1056/NEJM198806303182605',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Applying NNT',
        actions: ['State follow-up duration', 'Compare to NNH for net benefit', 'Avoid extrapolating beyond study population'],
      },
    ],
    pearls: ['NNT is specific to baseline risk and duration — not a drug constant.'],
  },

  // ─── 16. NNH ───────────────────────────────────────────────────────────────
  {
    id: 'number-needed-harm',
    name: 'Number Needed to Harm (NNH)',
    shortName: 'NNH',
    description: 'NNH from absolute risk increase (ARI) of an adverse event.',
    category: 'general',
    tags: ['ebm', 'nnh', 'harm', 'biostatistics'],
    whenToUse: 'Quantifying how many patients are treated for one additional adverse event.',
    whyUse: 'Balances NNT discussions with harm metrics.',
    inputs: [
      numberInput('controlAE', 'Control adverse event rate', { unit: '%', min: 0, max: 100, step: 0.1, defaultValue: 5 }),
      numberInput('treatAE', 'Treatment adverse event rate', { unit: '%', min: 0, max: 100, step: 0.1, defaultValue: 8 }),
    ],
    calculate(values) {
      const c = num(values.controlAE, 5) / 100;
      const t = num(values.treatAE, 8) / 100;
      const ari = t - c;
      if (ari <= 0) {
        return {
          score: '—',
          label: ari === 0 ? 'No ARI' : 'No increase (possible benefit)',
          interpretation:
            ari < 0
              ? 'Treatment AE rate lower than control — NNH for increase not applicable.'
              : 'ARI = 0; NNH undefined.',
          riskLevel: 'info',
        };
      }
      const nnh = 1 / ari;
      const nnhR = nnh >= 10 ? round(nnh, 1) : round(nnh, 2);
      return {
        score: nnhR,
        label: `NNH ≈ ${nnhR}`,
        interpretation: `ARI = ${round(ari * 100, 2)} percentage points. Treat ≈ ${nnhR} patients for one additional adverse event (trial horizon).`,
        riskLevel: 'moderate',
        details: [{ label: 'ARI', value: `${round(ari * 100, 2)}%` }],
      };
    },
    evidence: {
      summary: 'NNH = 1 / ARI, where ARI = AE_treatment − AE_control.',
      formula: 'NNH = 1 / (AE_Rx − AE_control)',
      validation: 'Standard harm metric parallel to NNT.',
      references: [
        {
          title: 'An assessment of clinically useful measures of the consequences of treatment',
          citation: 'Laupacis A, Sackett DL, Roberts RS. N Engl J Med. 1988',
          year: 1988,
          pmid: '3374545',
          doi: '10.1056/NEJM198806303182605',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Shared decisions',
        actions: ['Present NNT and NNH together', 'Discuss severity of prevented vs caused events', 'Individualize by baseline risk'],
      },
    ],
  },

  // ─── 17. ARR and RRR ───────────────────────────────────────────────────────
  {
    id: 'arr-rrr',
    name: 'ARR and RRR',
    shortName: 'ARR/RRR',
    description: 'Absolute and relative risk reduction from control and experimental event rates.',
    category: 'general',
    tags: ['ebm', 'arr', 'rrr', 'risk reduction', 'biostatistics'],
    whenToUse: 'Interpreting binary trial outcomes (benefit direction).',
    whyUse: 'ARR drives NNT; RRR can look large when baseline risk is small.',
    inputs: [
      numberInput('cer', 'Control event rate (CER)', { unit: '%', min: 0, max: 100, step: 0.1, defaultValue: 20 }),
      numberInput('eer', 'Experimental event rate (EER)', { unit: '%', min: 0, max: 100, step: 0.1, defaultValue: 15 }),
    ],
    calculate(values) {
      const cer = num(values.cer, 20) / 100;
      const eer = num(values.eer, 15) / 100;
      const arr = cer - eer;
      const arrPct = round(arr * 100, 2);
      const rrr = cer > 0 ? round((arr / cer) * 100, 1) : null;
      const rr = cer > 0 ? round(eer / cer, 3) : null;
      const nnt = arr > 0 ? (1 / arr >= 10 ? round(1 / arr, 1) : round(1 / arr, 2)) : null;

      let interpretation: string;
      if (arr > 0) {
        interpretation = `ARR ${arrPct} percentage points; RRR ${rrr}% (RR ${rr}). NNT ≈ ${nnt}.`;
      } else if (arr < 0) {
        interpretation = `Event rate increased (ARR ${arrPct} pp). Relative change ${rrr}% — consider ARI/NNH framing.`;
      } else {
        interpretation = 'No difference in event rates (ARR = 0).';
      }

      return {
        score: arrPct,
        unit: 'pp ARR',
        label: rrr != null ? `ARR ${arrPct} pp · RRR ${rrr}%` : `ARR ${arrPct} pp`,
        interpretation,
        riskLevel: 'info',
        details: [
          { label: 'CER', value: `${round(cer * 100, 2)}%` },
          { label: 'EER', value: `${round(eer * 100, 2)}%` },
          { label: 'RR', value: rr != null ? String(rr) : '—' },
          { label: 'NNT', value: nnt != null ? String(nnt) : '—' },
        ],
      };
    },
    evidence: {
      summary: 'ARR = CER − EER; RRR = ARR/CER; RR = EER/CER; NNT = 1/ARR (when ARR > 0).',
      formula: 'ARR = CER − EER; RRR = (CER − EER)/CER',
      validation: 'Core EBM identities for dichotomous outcomes.',
      references: [
        {
          title: 'Users\' guides to the medical literature: how to use an article about therapy',
          citation: 'Guyatt GH et al. JAMA (Users\' Guides series)',
          year: 1993,
          pmid: '8411578',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Large RRR, small ARR',
        actions: ['Emphasize absolute benefit for shared decisions', 'Compute NNT'],
      },
    ],
    pearls: ['Marketing often quotes RRR; clinicians should anchor on ARR/NNT.'],
  },

  // ─── 18. Odds ↔ probability ────────────────────────────────────────────────
  {
    id: 'odds-to-risk',
    name: 'Odds ↔ Probability',
    shortName: 'Odds/Prob',
    description: 'Converts between odds and probability (risk).',
    category: 'general',
    tags: ['ebm', 'odds', 'probability', 'bayes'],
    whenToUse: 'Moving between odds ratios / pre-test odds and natural frequencies.',
    whyUse: 'Probability = odds/(1+odds); odds = p/(1−p).',
    inputs: [
      selectInput('direction', 'Convert', [
        { label: 'Odds → probability', value: 'o2p' },
        { label: 'Probability → odds', value: 'p2o' },
      ]),
      numberInput('value', 'Value', {
        min: 0,
        max: 1000,
        step: 0.001,
        defaultValue: 0.25,
        helpText: 'Odds as ratio (e.g., 0.25 or 3:1 → enter 3); probability as % if converting from probability',
      }),
      selectInput('probUnit', 'If probability input, unit is', [
        { label: 'Percent (0–100)', value: 'pct' },
        { label: 'Fraction (0–1)', value: 'frac' },
      ]),
    ],
    calculate(values) {
      if (values.direction === 'p2o') {
        let p = num(values.value, 20);
        if (values.probUnit !== 'frac') p = p / 100;
        p = Math.min(0.9999, Math.max(0.0001, p));
        const odds = p / (1 - p);
        return {
          score: round(odds, 4),
          label: `Odds ≈ ${round(odds, 4)}`,
          interpretation: `Probability ${round(p * 100, 2)}% → odds ${round(odds, 4)} (≈ ${round(odds, 2)}:1).`,
          riskLevel: 'info',
          details: [{ label: 'Probability', value: `${round(p * 100, 2)}%` }],
        };
      }
      const odds = Math.max(0, num(values.value, 0.25));
      const p = odds / (1 + odds);
      return {
        score: round(p * 100, 2),
        unit: '%',
        label: `Probability ≈ ${round(p * 100, 2)}%`,
        interpretation: `Odds ${odds} → probability ${round(p * 100, 2)}% (fraction ${round(p, 4)}).`,
        riskLevel: 'info',
        details: [
          { label: 'Odds', value: String(odds) },
          { label: 'Probability fraction', value: String(round(p, 4)) },
        ],
      };
    },
    evidence: {
      summary: 'p = odds/(1+odds); odds = p/(1−p). Essential for Bayes and logistic model outputs.',
      formula: 'p = o/(1+o); o = p/(1−p)',
      validation: 'Mathematical identity.',
      references: [
        {
          title: 'Nomogram for Bayes theorem',
          citation: 'Fagan TJ. N Engl J Med. 1975',
          year: 1975,
          pmid: '1143310',
          doi: '10.1056/NEJM197507312930513',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Diagnostic reasoning',
        actions: ['Combine with LR via Fagan pathway', 'Prefer natural frequencies for communication'],
      },
    ],
  },

  // ─── 19. Sensitivity / specificity → PPV NPV ───────────────────────────────
  {
    id: 'sensitivity-specificity',
    name: 'PPV / NPV from Sens, Spec, Prevalence',
    shortName: 'PPV/NPV',
    description: 'Computes positive and negative predictive values from sensitivity, specificity, and prevalence.',
    category: 'general',
    tags: ['ebm', 'ppv', 'npv', 'sensitivity', 'specificity', 'diagnostics'],
    whenToUse: 'When sens/spec are known and you need predictive values at a given prevalence.',
    whyUse: 'PPV/NPV depend strongly on prevalence; sens/spec alone mislead.',
    inputs: [
      numberInput('sens', 'Sensitivity', { unit: '%', min: 0.1, max: 100, step: 0.1, defaultValue: 90 }),
      numberInput('spec', 'Specificity', { unit: '%', min: 0.1, max: 100, step: 0.1, defaultValue: 90 }),
      numberInput('prev', 'Prevalence (pre-test probability)', { unit: '%', min: 0.1, max: 99.9, step: 0.1, defaultValue: 10 }),
    ],
    calculate(values) {
      const sens = Math.min(0.999, Math.max(0.001, num(values.sens, 90) / 100));
      const spec = Math.min(0.999, Math.max(0.001, num(values.spec, 90) / 100));
      const prev = Math.min(0.999, Math.max(0.001, num(values.prev, 10) / 100));
      const ppv = (sens * prev) / (sens * prev + (1 - spec) * (1 - prev));
      const npv = (spec * (1 - prev)) / (spec * (1 - prev) + (1 - sens) * prev);
      const lrPos = sens / (1 - spec);
      const lrNeg = (1 - sens) / spec;
      return {
        score: round(ppv * 100, 1),
        unit: '% PPV',
        label: `PPV ${round(ppv * 100, 1)}% · NPV ${round(npv * 100, 1)}%`,
        interpretation: `At prevalence ${round(prev * 100, 1)}% with sens ${round(sens * 100, 1)}% / spec ${round(spec * 100, 1)}%: PPV ${round(ppv * 100, 1)}%, NPV ${round(npv * 100, 1)}%.`,
        riskLevel: 'info',
        details: [
          { label: 'PPV', value: `${round(ppv * 100, 1)}%` },
          { label: 'NPV', value: `${round(npv * 100, 1)}%` },
          { label: 'LR+', value: String(round(lrPos, 2)) },
          { label: 'LR−', value: String(round(lrNeg, 3)) },
        ],
      };
    },
    evidence: {
      summary:
        'PPV = sens·prev / [sens·prev + (1−spec)·(1−prev)]; NPV = spec·(1−prev) / [spec·(1−prev) + (1−sens)·prev].',
      formula: 'Bayes via 2×2 with prevalence as disease prior',
      validation: 'Standard diagnostic biostatistics.',
      references: [
        {
          title: 'Users\' guides to the medical literature: diagnostic tests',
          citation: 'Jaeschke R et al. JAMA Users\' Guides',
          year: 1994,
          url: 'https://pubmed.ncbi.nlm.nih.gov/?term=Jaeschke+diagnostic+likelihood+1994',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Low prevalence + positive test',
        actions: ['Expect lower PPV', 'Confirm with higher-specificity test'],
      },
    ],
    pearls: ['Screening low-prevalence populations drives false positives even with good specificity.'],
  },

  // ─── 20. Diagnostic odds ratio ─────────────────────────────────────────────
  {
    id: 'diagnostic-or',
    name: 'Diagnostic Odds Ratio (DOR)',
    shortName: 'DOR',
    description: 'Diagnostic odds ratio from sensitivity/specificity or a 2×2 table (TP, FP, FN, TN).',
    category: 'general',
    tags: ['ebm', 'diagnostic odds ratio', 'dor', 'diagnostics'],
    whenToUse: 'Single-number summary of diagnostic test discrimination (meta-analysis / education).',
    whyUse: 'DOR = (TP/FN)/(FP/TN) = LR+/LR−; higher favors better overall discrimination.',
    inputs: [
      selectInput('mode', 'Input mode', [
        { label: 'Sensitivity & specificity', value: 'ss' },
        { label: '2×2 counts (TP FP FN TN)', value: 'table' },
      ]),
      numberInput('sens', 'Sensitivity (if sens/spec mode)', { unit: '%', min: 0.1, max: 99.9, step: 0.1, defaultValue: 90 }),
      numberInput('spec', 'Specificity (if sens/spec mode)', { unit: '%', min: 0.1, max: 99.9, step: 0.1, defaultValue: 90 }),
      numberInput('tp', 'True positives', { min: 0, max: 100000, defaultValue: 90 }),
      numberInput('fp', 'False positives', { min: 0, max: 100000, defaultValue: 10 }),
      numberInput('fn', 'False negatives', { min: 0, max: 100000, defaultValue: 10 }),
      numberInput('tn', 'True negatives', { min: 0, max: 100000, defaultValue: 90 }),
    ],
    calculate(values) {
      let dor: number;
      let lrPos: number;
      let lrNeg: number;
      let detailExtra: { label: string; value: string }[] = [];

      if (values.mode === 'table') {
        const tp = num(values.tp, 90);
        const fp = num(values.fp, 10);
        const fn = num(values.fn, 10);
        const tn = num(values.tn, 90);
        if (tp <= 0 || fp <= 0 || fn <= 0 || tn <= 0) {
          return {
            score: '—',
            label: 'Need all cells > 0',
            interpretation: 'DOR undefined if any 2×2 cell is zero (use continuity correction in research).',
            riskLevel: 'info',
          };
        }
        dor = (tp * tn) / (fp * fn);
        const sens = tp / (tp + fn);
        const spec = tn / (tn + fp);
        lrPos = sens / (1 - spec);
        lrNeg = (1 - sens) / spec;
        detailExtra = [
          { label: 'Sensitivity', value: `${round(sens * 100, 1)}%` },
          { label: 'Specificity', value: `${round(spec * 100, 1)}%` },
        ];
      } else {
        const sens = Math.min(0.999, Math.max(0.001, num(values.sens, 90) / 100));
        const spec = Math.min(0.999, Math.max(0.001, num(values.spec, 90) / 100));
        lrPos = sens / (1 - spec);
        lrNeg = (1 - sens) / spec;
        dor = lrPos / lrNeg;
      }

      const dorR = round(dor, 2);
      return {
        score: dorR,
        label: `DOR ≈ ${dorR}`,
        interpretation: `Diagnostic odds ratio ≈ ${dorR}. LR+ ${round(lrPos, 2)}, LR− ${round(lrNeg, 3)}. DOR >1 favors discrimination; interpret with sens/spec, not alone.`,
        riskLevel: 'info',
        details: [
          { label: 'DOR', value: String(dorR) },
          { label: 'LR+', value: String(round(lrPos, 2)) },
          { label: 'LR−', value: String(round(lrNeg, 3)) },
          ...detailExtra,
        ],
      };
    },
    evidence: {
      summary: 'DOR = (TP×TN)/(FP×FN) = LR+/LR− = [sens/(1−sens)] / [(1−spec)/spec].',
      formula: 'DOR = (TP·TN)/(FP·FN) = LR+ / LR−',
      validation: 'Common in diagnostic meta-analysis; insensitive to prevalence but can hide trade-offs between sens and spec.',
      references: [
        {
          title: 'The diagnostic odds ratio: a single indicator of test performance',
          citation: 'Glas AS et al. J Clin Epidemiol. 2003',
          year: 2003,
          pmid: '14615004',
          doi: '10.1016/s0895-4356(03)00177-x',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Test evaluation',
        actions: ['Report sens/spec and LRs alongside DOR', 'Avoid ranking tests by DOR alone'],
      },
    ],
  },

  // ─── 21. CI for proportion ─────────────────────────────────────────────────
  {
    id: 'conf-interval-prop',
    name: '95% CI for a Proportion (Wilson)',
    shortName: 'Wilson CI',
    description: 'Educational 95% confidence interval for a binomial proportion using the Wilson score method.',
    category: 'general',
    tags: ['statistics', 'confidence interval', 'wilson', 'proportion', 'ebm'],
    whenToUse: 'Quick CI around a success proportion (e.g., response rate x/n).',
    whyUse: 'Wilson interval behaves better than simple Wald p±1.96√(p(1-p)/n) near 0 or 1.',
    inputs: [
      numberInput('successes', 'Events / successes (x)', { min: 0, max: 1000000, defaultValue: 20 }),
      numberInput('n', 'Sample size (n)', { min: 1, max: 1000000, defaultValue: 100 }),
    ],
    calculate(values) {
      const x = num(values.successes, 20);
      const n = num(values.n, 100);
      if (n < 1 || x < 0 || x > n) {
        return {
          score: '—',
          label: 'Invalid x/n',
          interpretation: 'Require n ≥ 1 and 0 ≤ x ≤ n.',
          riskLevel: 'info',
        };
      }
      const p = x / n;
      const z = 1.96;
      const z2 = z * z;
      const denom = 1 + z2 / n;
      const center = (p + z2 / (2 * n)) / denom;
      const margin = (z * Math.sqrt((p * (1 - p) / n) + z2 / (4 * n * n))) / denom;
      const lo = round(Math.max(0, center - margin) * 100, 1);
      const hi = round(Math.min(1, center + margin) * 100, 1);
      const pPct = round(p * 100, 1);
      // Wald for comparison
      const waldHalf = n > 0 ? 1.96 * Math.sqrt((p * (1 - p)) / n) : 0;
      const waldLo = round(Math.max(0, p - waldHalf) * 100, 1);
      const waldHi = round(Math.min(1, p + waldHalf) * 100, 1);

      return {
        score: pPct,
        unit: '%',
        label: `Wilson 95% CI ${lo}–${hi}%`,
        interpretation: `Point estimate ${pPct}% (${x}/${n}). Wilson 95% CI ${lo}% to ${hi}%. Educational only — software exact methods may differ slightly.`,
        riskLevel: 'info',
        details: [
          { label: 'Wilson 95% CI', value: `${lo}% – ${hi}%` },
          { label: 'Wald 95% CI (comparison)', value: `${waldLo}% – ${waldHi}%` },
          { label: 'x/n', value: `${x}/${n}` },
        ],
      };
    },
    evidence: {
      summary: 'Wilson score interval centers at (p̂ + z²/2n)/(1+z²/n) with adjusted margin; preferred teaching alternative to Wald.',
      formula: 'Wilson center = (p̂ + z²/(2n))/(1+z²/n); z≈1.96 for 95%',
      validation: 'Better coverage than Wald for small n or extreme p.',
      references: [
        {
          title: 'Probable inference, the law of succession, and statistical inference',
          citation: 'Wilson EB. J Am Stat Assoc. 1927',
          year: 1927,
          doi: '10.1080/01621459.1927.10502953',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Reporting rates',
        actions: ['State x/n explicitly', 'Consider exact binomial CI for small samples'],
      },
    ],
  },

  // ─── 22. Sample size for proportion ────────────────────────────────────────
  {
    id: 'sample-size-prop',
    name: 'Sample Size for a Proportion (Rough)',
    shortName: 'n for Proportion',
    description: 'Rough sample size for estimating a proportion with specified precision (educational Wald formula).',
    category: 'general',
    tags: ['statistics', 'sample size', 'proportion', 'biostatistics'],
    whenToUse: 'Quick planning estimate for a descriptive proportion study.',
    whyUse: 'n ≈ Z²p(1−p)/E² before software simulation / exact methods.',
    inputs: [
      numberInput('p', 'Expected proportion', {
        unit: '%',
        min: 1,
        max: 99,
        step: 1,
        defaultValue: 50,
        helpText: 'Use 50% if unknown (most conservative)',
      }),
      numberInput('margin', 'Desired margin of error (half-width)', { unit: '%', min: 0.5, max: 20, step: 0.5, defaultValue: 5 }),
      selectInput('confidence', 'Confidence level', [
        { label: '90% (Z≈1.645)', value: 1.645 },
        { label: '95% (Z≈1.96)', value: 1.96 },
        { label: '99% (Z≈2.576)', value: 2.576 },
      ]),
    ],
    calculate(values) {
      const p = num(values.p, 50) / 100;
      const e = num(values.margin, 5) / 100;
      const z = num(values.confidence, 1.96);
      if (e <= 0 || p <= 0 || p >= 1) {
        return {
          score: '—',
          label: 'Invalid inputs',
          interpretation: 'Need 0 < p < 1 and margin > 0.',
          riskLevel: 'info',
        };
      }
      const n = (z * z * p * (1 - p)) / (e * e);
      const nR = Math.ceil(n);
      return {
        score: nR,
        unit: 'subjects',
        label: `n ≈ ${nR}`,
        interpretation: `Rough n ≈ ${nR} for expected p=${round(p * 100, 0)}%, margin ±${round(e * 100, 1)}%, Z=${z}. Does not include design effect, dropout, or finite-population correction.`,
        riskLevel: 'info',
        details: [
          { label: 'Raw n', value: String(round(n, 2)) },
          { label: 'Rounded up', value: String(nR) },
          { label: 'Assumed p(1−p)', value: String(round(p * (1 - p), 4)) },
        ],
        recommendations: [
          'Inflate for anticipated nonresponse/dropout',
          'Use specialist software for hypothesis tests, cluster designs, or very low prevalence',
        ],
      };
    },
    evidence: {
      summary: 'n = Z² · p · (1−p) / E² for a Wald CI half-width E around proportion p.',
      formula: 'n = Z²p(1−p)/E²',
      validation: 'Large-sample approximation; educational starting point only.',
      references: [
        {
          title: 'Sample size determination for estimation of proportions (standard biostatistics teaching)',
          citation: 'Lwanga SK, Lemeshow S. WHO sample size manuals / classic methods texts',
          year: 1991,
          url: 'https://apps.who.int/iris/handle/10665/40062',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Grant / protocol planning',
        actions: ['Consult a biostatistician', 'Specify primary endpoint and analysis clearly'],
      },
    ],
    pearls: ['p=0.5 maximizes n for a given margin — safe default when prevalence unknown.'],
  },

  // ─── 23. MCV anemia classification ─────────────────────────────────────────
  {
    id: 'mcv-classify',
    name: 'Anemia MCV Classification',
    shortName: 'MCV Class',
    description: 'Classifies anemia workup pathway by mean corpuscular volume (micro / normo / macro).',
    category: 'hematology',
    tags: ['anemia', 'mcv', 'microcytic', 'macrocytic', 'cbc'],
    whenToUse: 'First branch point after finding low hemoglobin/hematocrit.',
    whyUse: 'MCV directs differential (iron/thalassemia vs bleed/hemolysis/CKD vs B12/folate/etc.).',
    inputs: [
      numberInput('mcv', 'MCV', { unit: 'fL', min: 40, max: 150, defaultValue: 78 }),
      numberInput('hb', 'Hemoglobin (optional)', { unit: 'g/dL', min: 3, max: 20, step: 0.1, defaultValue: 10 }),
    ],
    calculate(values) {
      const mcv = num(values.mcv, 78);
      const hb = num(values.hb, 10);
      let label: string;
      let interpretation: string;
      let riskLevel: 'low' | 'moderate' | 'high' | 'info' = 'info';
      if (mcv < 80) {
        label = 'Microcytic (MCV <80)';
        interpretation = `MCV ${mcv} fL → microcytic pathway. Consider iron deficiency, thalassemia trait, anemia of chronic disease (some), sideroblastic. Check ferritin/iron studies, RDW, Mentzer index.`;
        riskLevel = 'moderate';
      } else if (mcv <= 100) {
        label = 'Normocytic (MCV 80–100)';
        interpretation = `MCV ${mcv} fL → normocytic pathway. Consider acute blood loss, hemolysis, CKD, mixed deficiency, marrow process, early iron deficiency. Check reticulocyte count, hemolysis labs, renal function.`;
        riskLevel = 'moderate';
      } else {
        label = 'Macrocytic (MCV >100)';
        interpretation = `MCV ${mcv} fL → macrocytic pathway. Consider B12/folate deficiency, alcohol, liver disease, hypothyroidism, drugs (e.g., hydroxyurea, AZT), MDS, reticulocytosis. Check B12/folate, smear, meds.`;
        riskLevel = 'moderate';
      }
      if (hb < 7) riskLevel = 'high';
      return {
        score: mcv,
        unit: 'fL',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'MCV class', value: label },
          { label: 'Hb (entered)', value: `${hb} g/dL` },
        ],
        recommendations: ['Always review smear and clinical context', 'Lab reference ranges for MCV may vary slightly'],
      };
    },
    evidence: {
      summary: 'Common teaching cutoffs: microcytic MCV <80 fL, normocytic 80–100, macrocytic >100 fL (lab ranges vary).',
      formula: 'Class = micro if MCV<80; normo if 80–100; macro if >100',
      validation: 'Standard clinical hematology approach to anemia morphologic classification.',
      references: [
        {
          title: 'Approach to the adult with anemia (clinical methods)',
          citation: 'Standard hematology textbooks / ASH educational resources',
          year: 2020,
          url: 'https://www.hematology.org/education/patients/anemia',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Microcytic',
        actions: ['Iron studies / ferritin', 'Consider Hb electrophoresis if thalassemia suspected', 'RDW / Mentzer helper'],
      },
      {
        condition: 'Macrocytic',
        actions: ['B12 and folate', 'Review alcohol/meds', 'Reticulocyte count', 'Smear for megaloblastic changes'],
      },
    ],
  },

  // ─── 24. RDW + MCV pattern ─────────────────────────────────────────────────
  {
    id: 'rdw-anemia',
    name: 'RDW + MCV Anemia Pattern',
    shortName: 'RDW/MCV',
    description: 'Educational helper combining RDW and MCV patterns for common anemia differentials.',
    category: 'hematology',
    tags: ['anemia', 'rdw', 'mcv', 'iron deficiency', 'thalassemia', 'cbc'],
    whenToUse: 'CBC differential hints when both MCV and RDW are available.',
    whyUse: 'Classic teaching tables pair high/normal RDW with micro/normo/macro MCV.',
    inputs: [
      numberInput('mcv', 'MCV', { unit: 'fL', min: 40, max: 150, defaultValue: 75 }),
      numberInput('rdw', 'RDW-CV', {
        unit: '%',
        min: 8,
        max: 40,
        step: 0.1,
        defaultValue: 16,
        helpText: 'Common upper limit of normal ~14.5% (lab-specific)',
      }),
      numberInput('rdwUl', 'RDW upper limit of normal', { unit: '%', min: 12, max: 16, step: 0.1, defaultValue: 14.5 }),
    ],
    calculate(values) {
      const mcv = num(values.mcv, 75);
      const rdw = num(values.rdw, 16);
      const ul = num(values.rdwUl, 14.5);
      const highRdw = rdw > ul;
      const mcvClass = mcv < 80 ? 'micro' : mcv <= 100 ? 'normo' : 'macro';

      let pattern: string;
      let differential: string;
      if (mcvClass === 'micro' && highRdw) {
        pattern = 'Microcytic + ↑RDW';
        differential = 'Classic for iron deficiency; also mixed deficiency, some sideroblastic, transfusion effects.';
      } else if (mcvClass === 'micro' && !highRdw) {
        pattern = 'Microcytic + normal RDW';
        differential = 'Suggests homogeneous microcytosis — thalassemia trait more likely than iron deficiency (still confirm with labs).';
      } else if (mcvClass === 'normo' && highRdw) {
        pattern = 'Normocytic + ↑RDW';
        differential = 'Early iron deficiency, mixed deficiency, myelophthisis, recent transfusion, some hemolysis/recovery patterns.';
      } else if (mcvClass === 'normo' && !highRdw) {
        pattern = 'Normocytic + normal RDW';
        differential = 'Anemia of chronic disease/inflammation, CKD, acute blood loss (before retic response), endocrine causes — broad workup.';
      } else if (mcvClass === 'macro' && highRdw) {
        pattern = 'Macrocytic + ↑RDW';
        differential = 'B12/folate deficiency, MDS, marked reticulocytosis, some drug effects with anisocytosis.';
      } else {
        pattern = 'Macrocytic + normal RDW';
        differential = 'Alcohol, liver disease, medications, hypothyroidism, aplastic processes — still exclude B12/folate.';
      }

      return {
        score: rdw,
        unit: '% RDW',
        label: pattern,
        interpretation: `MCV ${mcv} fL, RDW ${rdw}% (ULN ${ul}%). ${pattern}. ${differential} Educational pattern recognition only.`,
        riskLevel: 'info',
        details: [
          { label: 'MCV class', value: mcvClass },
          { label: 'RDW elevated', value: highRdw ? 'Yes' : 'No' },
        ],
        recommendations: [
          'Confirm with iron studies, B12/folate, retic count, smear as indicated',
          'RDW cutoffs are lab-method dependent',
        ],
      };
    },
    evidence: {
      summary: 'Teaching matrix: iron deficiency often micro+↑RDW; thalassemia trait often micro+normal RDW; megaloblastic often macro+↑RDW.',
      formula: 'Pattern from MCV thresholds + RDW vs lab ULN',
      validation: 'Heuristic only; substantial overlap between conditions.',
      references: [
        {
          title: 'Red cell distribution width in the diagnosis of iron deficiency and thalassemia',
          citation: 'Bessman JD / classic RDW clinical teaching literature',
          year: 1983,
          pmid: '6823861',
          doi: '10.1016/s0002-9149(83)80081-2',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Micro + high RDW',
        actions: ['Ferritin / iron panel', 'Treat iron deficiency if confirmed', 'Seek bleed source when appropriate'],
      },
      {
        condition: 'Micro + normal RDW',
        actions: ['Consider thalassemia workup', 'Still exclude iron deficiency'],
      },
    ],
    pearls: ['RDW-SD vs RDW-CV differ; this tool assumes RDW-CV %.'],
  },
];
