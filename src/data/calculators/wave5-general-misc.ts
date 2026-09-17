import type { Calculator } from '../../types/calculator';
import { num, bool, round, yesNo, selectInput, numberInput, riskFromThresholds } from '../../utils/helpers';

type AuditedQuestionnaireCalculator = Calculator;

export const wave5GeneralMiscCalcs: AuditedQuestionnaireCalculator[] = [
  // ─── 1. Mentzer Index ──────────────────────────────────────────────────────
  {
    id: 'mentzer-index',
    name: 'Mentzer Index',
    shortName: 'Mentzer',
    description: 'MCV/RBC ratio to help distinguish iron-deficiency anemia from β-thalassemia trait.',
    category: 'hematology',
    tags: ['mentzer', 'anemia', 'thalassemia', 'mcv', 'iron deficiency'],
    whenToUse: 'Microcytic anemia workup when distinguishing iron deficiency from thalassemia trait is relevant.',
    whyUse: 'Simple bedside ratio; Mentzer <13 favors thalassemia trait, >13 favors iron deficiency (imperfect).',
    inputs: [
      numberInput('mcv', 'MCV', { unit: 'fL', min: 40, max: 120, step: 0.1, exampleValue: 70 }),
      numberInput('rbc', 'RBC count', { unit: '×10⁶/µL', min: 1, max: 8, step: 0.01, exampleValue: 5.5 }),
    ],
    calculate(values) {
      const mcv = num(values.mcv, 70);
      const rbc = num(values.rbc, 5.5);
      if (rbc <= 0) {
        return {
          score: '—',
          label: 'Invalid RBC',
          interpretation: 'RBC count must be positive.',
          riskLevel: 'info',
        };
      }
      const idx = round(mcv / rbc, 2);
      const r = riskFromThresholds(idx, [
        {
          max: 12.99,
          level: 'moderate',
          label: 'Suggests thalassemia trait (<13)',
          interpretation: `Mentzer index ${idx}. Values <13 favor β-thalassemia trait over iron deficiency — confirm with iron studies, Hb electrophoresis/HPLC, and clinical context.`,
        },
        {
          max: 99,
          level: 'low',
          label: 'Suggests iron deficiency (>13)',
          interpretation: `Mentzer index ${idx}. Values >13 favor iron deficiency — check ferritin/iron studies; still exclude mixed disorders and other microcytic causes.`,
        },
      ]);
      return {
        score: idx,
        unit: 'MCV/RBC',
        ...r,
        details: [
          { label: 'MCV', value: `${mcv} fL` },
          { label: 'RBC', value: `${rbc} ×10⁶/µL` },
        ],
      };
    },
    evidence: {
      summary: 'Mentzer index = MCV (fL) ÷ RBC (×10⁶/µL). Classic cutoff 13 separates thalassemia trait (<13) from iron deficiency (>13).',
      formula: 'Mentzer = MCV / RBC',
      validation: 'Mentzer 1973; moderate accuracy only — not a substitute for iron studies and hemoglobinopathy testing.',
      references: [
        {
          title: 'Differentiation of iron deficiency from thalassaemia trait',
          citation: 'Mentzer WC. Lancet. 1973',
          year: 1973,
          pmid: '4123424',
          doi: '10.1016/s0140-6736(73)91446-3',
        },
      ],
    },
    nextSteps: [
      { condition: 'Index <13', actions: ['Ferritin / iron studies', 'Hb electrophoresis or HPLC', 'Family history review'] },
      { condition: 'Index >13', actions: ['Iron studies', 'Treat deficiency if confirmed', 'Recheck indices after repletion'] },
    ],
    pearls: [
      'Mixed iron deficiency + thalassemia trait confounds the index.',
      'RDW, RBC count, and smear morphology add useful context.',
    ],
  },

  // ─── 2. Corrected WBC for nRBCs ────────────────────────────────────────────
  {
    id: 'corrected-wbc-nrbc',
    name: 'Corrected WBC (for nRBCs)',
    shortName: 'Corr. WBC',
    description: 'Corrects automated or reported WBC for circulating nucleated red blood cells (nRBCs).',
    category: 'hematology',
    tags: ['wbc', 'nrbc', 'corrected wbc', 'hematology'],
    whenToUse: 'When nRBCs are reported per 100 WBCs and the leukocyte count needs adjustment for clinical decisions.',
    whyUse: 'Uncorrected WBC overestimates true leukocytes when many nRBCs are counted as white cells.',
    inputs: [
      numberInput('wbc', 'Reported / automated WBC', {
        unit: '×10³/µL',
        min: 0.1,
        max: 200,
        step: 0.1,
        exampleValue: 15,
      }),
      numberInput('nrbc', 'nRBCs per 100 WBCs', {
        unit: '/100 WBC',
        min: 0,
        max: 500,
        step: 1,
        exampleValue: 10,
        helpText: 'Number of nucleated RBCs counted per 100 white cells',
      }),
    ],
    calculate(values) {
      const wbc = num(values.wbc, 15);
      const nrbc = Math.max(0, num(values.nrbc, 0));
      const corrected = round((wbc * 100) / (100 + nrbc), 2);
      const delta = round(wbc - corrected, 2);
      return {
        score: corrected,
        unit: '×10³/µL',
        label: 'Corrected leukocyte count',
        interpretation: `Corrected WBC ≈ ${corrected} ×10³/µL (reported ${wbc}; nRBC ${nrbc}/100 WBC). Correction matters most when nRBCs are high (neonates, severe stress, marrow recovery, hemolysis).`,
        riskLevel: 'info',
        details: [
          { label: 'Reported WBC', value: `${wbc} ×10³/µL` },
          { label: 'nRBC', value: `${nrbc} / 100 WBC` },
          { label: 'Amount subtracted', value: `${delta} ×10³/µL` },
        ],
      };
    },
    evidence: {
      summary: 'Corrected WBC = reported WBC × 100 / (nRBC + 100), where nRBC is nucleated RBCs per 100 WBCs.',
      formula: 'WBC_corr = WBC × 100 / (100 + nRBC)',
      validation: 'Standard laboratory correction used when nRBCs inflate automated WBC counts.',
      references: [
        {
          title: 'Nucleated red blood cells in the blood of medical intensive care patients indicate increased mortality risk',
          citation: 'Stachon A et al. Crit Care. 2007 (nRBC clinical significance; WBC correction formula is standard hematology teaching)',
          year: 2007,
          pmid: '17550592',
          doi: '10.1186/cc5932',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'High nRBC count',
        actions: ['Interpret corrected WBC for infection decisions', 'Evaluate cause of circulating nRBCs', 'Review smear'],
      },
    ],
    pearls: [
      'Some modern analyzers already correct or flag nRBCs — check lab method.',
      'Absolute nRBC count (nRBC/µL) is an alternative reporting format.',
    ],
  },

  // ─── 3. Lean body weight (James) ───────────────────────────────────────────
  {
    id: 'lean-body-weight-james',
    name: 'Lean Body Weight (James)',
    shortName: 'James LBW',
    description: 'Estimates lean body weight with the James equations (sex-specific).',
    category: 'general',
    tags: ['lbw', 'lean body weight', 'james', 'dosing', 'pharmacokinetics'],
    whenToUse: 'Drug dosing or PK estimates that scale to lean mass (e.g., some anesthetics, research equations).',
    whyUse: 'Classic sex-specific LBW formulas; can fail at high BMI (prefer Janmahasatian).',
    inputs: [
      numberInput('weight', 'Total body weight', { unit: 'kg', unitKind: 'weight', min: 30, max: 300, step: 0.1, exampleValue: 80 }),
      numberInput('height', 'Height', { unit: 'cm', min: 120, max: 230, exampleValue: 170 }),
      selectInput('sex', 'Sex', [
        { label: 'Male', value: 'M' },
        { label: 'Female', value: 'F' },
      ]),
    ],
    calculate(values) {
      const w = num(values.weight, 80);
      const h = num(values.height, 170);
      if (h <= 0 || w <= 0) {
        return { score: '—', label: 'Invalid input', interpretation: 'Height and weight must be positive.', riskLevel: 'info' };
      }
      // James: ♂ 1.1·W − 128·(W/H)² ; ♀ 1.07·W − 148·(W/H)²  (W kg, H cm)
      const ratio = w / h;
      const lbw =
        values.sex === 'F' ? 1.07 * w - 148 * ratio * ratio : 1.1 * w - 128 * ratio * ratio;
      const lbwR = round(Math.max(0, lbw), 1);
      const fat = round(Math.max(0, w - lbwR), 1);
      return {
        score: lbwR,
        unit: 'kg',
        label: 'James lean body weight',
        interpretation: `James LBW ≈ ${lbwR} kg (TBW ${w} kg). Estimated fat mass ≈ ${fat} kg. James can underperform at extremes of obesity vs Janmahasatian LBW.`,
        riskLevel: 'info',
        details: [
          { label: 'TBW', value: `${w} kg` },
          { label: 'Estimated fat mass', value: `${fat} kg` },
          { label: 'LBW/TBW', value: `${round((lbwR / w) * 100, 0)}%` },
        ],
      };
    },
    evidence: {
      summary:
        'James LBW: men 1.10·W − 128·(W/H)²; women 1.07·W − 148·(W/H)² (W kg, H cm).',
      formula: 'Sex-specific quadratic in weight/height',
      validation: 'James 1976; still used but may yield non-physiologic values in very high BMI — prefer Janmahasatian in obesity.',
      references: [
        {
          title: 'Research on Obesity (DHSS/MRC report; James LBW equations)',
          citation: 'James WPT. Research on Obesity. London: HMSO; 1976',
          year: 1976,
        },
        {
          title: 'What is the best size descriptor to use for pharmacokinetic studies in the obese?',
          citation: 'Green B, Duffull SB. Br J Clin Pharmacol. 2004 (documents James LBW equations)',
          year: 2004,
          pmid: '15255794',
          doi: '10.1111/j.1365-2125.2004.02157.x',
        },
      ],
    },
    nextSteps: [
      { condition: 'Obesity / PK dosing', actions: ['Compare Janmahasatian LBW', 'Use drug-specific scalar (IBW/ABW/LBW/TBW)'] },
    ],
    pearls: ['Do not use for nutritional “ideal weight” counseling.', 'Negative or implausible LBW at extreme BMI → switch formula.'],
  },

  // ─── 4. Dosing weight selector ─────────────────────────────────────────────
  {
    id: 'dosing-weight-select',
    name: 'Dosing Weight Selector (IBW / ABW / TBW)',
    shortName: 'Dosing Wt',
    description: 'Recommends total, ideal, or adjusted body weight for common adult drug-dosing scenarios.',
    category: 'general',
    tags: ['dosing', 'ibw', 'abw', 'tbw', 'pharmacy', 'obesity'],
    whenToUse: 'Quick educational guide when choosing weight scalar for common inpatient drug classes.',
    whyUse: 'Obesity dosing is drug-specific; this summarizes common practice patterns (always verify monographs).',
    inputs: [
      numberInput('tbw', 'Total body weight (TBW)', { unit: 'kg', unitKind: 'weight', min: 30, max: 400, step: 0.1, exampleValue: 100 }),
      numberInput('height', 'Height', { unit: 'cm', min: 140, max: 220, exampleValue: 170 }),
      selectInput('sex', 'Sex (for Devine IBW)', [
        { label: 'Male', value: 'M' },
        { label: 'Female', value: 'F' },
      ]),
      selectInput('drugClass', 'Drug / scenario', [
        { label: 'Aminoglycosides (gent/tobra)', value: 'amino' },
        { label: 'Vancomycin', value: 'vanco' },
        { label: 'Unfractionated heparin (infusion)', value: 'ufh' },
        { label: 'LMWH (treatment)', value: 'lmwh' },
        { label: 'Acyclovir (IV)', value: 'acyclovir' },
        { label: 'Propofol induction (typical)', value: 'propofol' },
        { label: 'Succinylcholine', value: 'sch' },
        { label: 'Rocuronium / vecuronium', value: 'roc' },
        { label: 'Most mg/kg chemo (protocol)', value: 'chemo' },
        { label: 'General hydrophilic antibiotic (default)', value: 'hydrophilic' },
      ]),
      numberInput('abwFactor', 'AdjBW factor (if used)', {
        min: 0.2,
        max: 0.5,
        step: 0.05,
        exampleValue: 0.4,
        helpText: 'Common aminoglycoside factor 0.4',
      }),
    ],
    calculate(values) {
      const tbw = num(values.tbw, 100);
      const cm = num(values.height, 170);
      const inches = cm / 2.54;
      const over60 = Math.max(0, inches - 60);
      const ibw = values.sex === 'F' ? 45.5 + 2.3 * over60 : 50 + 2.3 * over60;
      const ibwR = round(ibw, 1);
      const f = num(values.abwFactor, 0.4);
      const abwR = round(ibw + f * (tbw - ibw), 1);
      const obese = tbw > ibw * 1.2;
      const cls = String(values.drugClass ?? 'hydrophilic');

      type Rec = { scalar: string; weight: number; note: string };
      const table: Record<string, Rec> = {
        amino: {
          scalar: obese ? 'AdjBW' : 'TBW',
          weight: obese ? abwR : tbw,
          note: 'Aminoglycosides: use TBW if non-obese; AdjBW (IBW+0.4×(TBW−IBW)) if obese; always follow levels.',
        },
        vanco: {
          scalar: 'TBW (often capped)',
          weight: tbw,
          note: 'Vancomycin loading often TBW-based; maintenance may use AUC strategies — institutional caps apply.',
        },
        ufh: {
          scalar: 'TBW (protocol)',
          weight: tbw,
          note: 'Many UFH protocols use TBW with max bolus/infusion caps; follow local nomogram.',
        },
        lmwh: {
          scalar: obese ? 'TBW (cap?)' : 'TBW',
          weight: tbw,
          note: 'LMWH usually TBW; very high BMI may need anti-Xa guidance and dose caps per product.',
        },
        acyclovir: {
          scalar: obese ? 'IBW' : 'TBW',
          weight: obese ? ibwR : tbw,
          note: 'IV acyclovir commonly IBW in obesity to reduce nephrotoxicity risk — verify monograph.',
        },
        propofol: {
          scalar: 'LBW / Adj (practice varies)',
          weight: abwR,
          note: 'Induction often lean/adjusted concepts; infusion practices vary — use clinical titration.',
        },
        sch: {
          scalar: 'TBW',
          weight: tbw,
          note: 'Succinylcholine intubation doses typically TBW-based.',
        },
        roc: {
          scalar: obese ? 'IBW' : 'TBW',
          weight: obese ? ibwR : tbw,
          note: 'Nondepolarizing NMBAs often IBW in obesity for intubation dosing; titrate.',
        },
        chemo: {
          scalar: 'Protocol / BSA',
          weight: tbw,
          note: 'Chemotherapy is regimen-specific (BSA, AUC, caps). Do not substitute this selector for protocol.',
        },
        hydrophilic: {
          scalar: obese ? 'AdjBW or IBW' : 'TBW',
          weight: obese ? abwR : tbw,
          note: 'Hydrophilic drugs often use IBW/AdjBW in obesity; lipophilic more often TBW — drug-specific.',
        },
      };
      const rec = table[cls] ?? table.hydrophilic;
      return {
        score: round(rec.weight, 1),
        unit: 'kg',
        label: `Suggested scalar: ${rec.scalar}`,
        interpretation: `${rec.note} Computed Devine IBW ${ibwR} kg; AdjBW ${abwR} kg; TBW ${tbw} kg.${
          obese ? ' Patient meets common educational “obese” threshold (TBW >120% IBW).' : ''
        }`,
        riskLevel: 'info',
        details: [
          { label: 'TBW', value: `${tbw} kg` },
          { label: 'Devine IBW', value: `${ibwR} kg` },
          { label: 'AdjBW', value: `${abwR} kg` },
          { label: 'Suggested dosing weight', value: `${round(rec.weight, 1)} kg (${rec.scalar})` },
        ],
        recommendations: [
          'Verify primary literature / institutional guideline for each drug',
          'Apply renal/hepatic dose adjustments separately',
        ],
      };
    },
    evidence: {
      summary:
        'Educational selector: computes Devine IBW and AdjBW = IBW + f·(TBW−IBW), then maps common drug classes to usual weight scalars.',
      formula: 'IBW (Devine); AdjBW = IBW + factor×(TBW−IBW)',
      validation: 'Practice-pattern summary only — not a substitute for monographs, PK services, or oncology protocols.',
      references: [
        {
          title: 'Effect of obesity on the pharmacokinetics of drugs in humans',
          citation: 'Hanley MJ et al. Clin Pharmacokinet. 2010',
          year: 2010,
          pmid: '20067334',
          doi: '10.2165/11318100-000000000-00000',
        },
        {
          title: 'Gentamicin therapy (Devine IBW equations)',
          citation: 'McCarron MM, Devine BJ. Drug Intell Clin Pharm. 1974',
          year: 1974,
          doi: '10.1177/106002807400801104',
        },
        {
          title: 'The origin of the "ideal" body weight equations',
          citation: 'Pai MP, Paloucek FP. Ann Pharmacother. 2000',
          year: 2000,
          pmid: '10981254',
          doi: '10.1345/aph.19381',
        },
      ],
    },
    nextSteps: [
      { condition: 'Any dosing decision', actions: ['Confirm drug-specific scalar', 'Check levels/AUC where available', 'Document weight used'] },
    ],
    pearls: [
      '“Obesity” thresholds and factors (0.3–0.4) vary by drug.',
      'Never use this tool alone for chemotherapy or renally cleared high-risk agents without specialist input.',
    ],
  },

  // ─── 5. HR max estimate ────────────────────────────────────────────────────
  {
    id: 'hr-max-estimate',
    name: 'Maximum Heart Rate Estimate',
    shortName: 'HRmax',
    description: 'Estimates maximum heart rate (220 − age and Tanaka 208 − 0.7×age).',
    category: 'cardiology',
    tags: ['hrmax', 'exercise', 'target heart rate', 'fitness'],
    whenToUse: 'Exercise prescription, stress testing context, or educational fitness targets.',
    whyUse: 'Quick population estimate; individual max HR varies widely.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 10, max: 100, exampleValue: 40 }),
      selectInput('formula', 'Primary formula', [
        { label: 'Fox: 220 − age', value: 'fox' },
        { label: 'Tanaka: 208 − 0.7×age', value: 'tanaka' },
      ]),
    ],
    calculate(values) {
      const age = num(values.age, 40);
      const fox = round(220 - age, 0);
      const tanaka = round(208 - 0.7 * age, 0);
      const primary = values.formula === 'tanaka' ? tanaka : fox;
      const label = values.formula === 'tanaka' ? 'Tanaka HRmax' : 'Fox HRmax (220−age)';
      return {
        score: primary,
        unit: 'bpm',
        label,
        interpretation: `Estimated max HR ≈ ${primary} bpm (${label}). Fox 220−age = ${fox}; Tanaka = ${tanaka}. Population estimates — true max requires graded exercise testing.`,
        riskLevel: 'info',
        details: [
          { label: 'Fox (220 − age)', value: `${fox} bpm` },
          { label: 'Tanaka (208 − 0.7×age)', value: `${tanaka} bpm` },
        ],
      };
    },
    evidence: {
      summary: 'Fox: HRmax ≈ 220 − age. Tanaka: HRmax ≈ 208 − 0.7×age (often preferred in adults).',
      formula: 'Fox or Tanaka regression',
      validation: 'Large prediction error (±10–20 bpm common); medications (β-blockers) alter HR response.',
      references: [
        {
          title: 'Age-predicted maximal heart rate revisited',
          citation: 'Tanaka H et al. J Am Coll Cardiol. 2001',
          year: 2001,
          pmid: '11153730',
          doi: '10.1016/s0735-1097(00)01054-8',
        },
      ],
    },
    nextSteps: [
      { condition: 'Exercise Rx', actions: ['Combine with Karvonen target zones', 'Screen for exercise contraindications'] },
    ],
    pearls: ['β-blockers blunt HR — use RPE or measured stress-test max when available.', 'Do not use predicted HRmax as a diagnostic threshold alone.'],
  },

  // ─── 6. Karvonen target HR ─────────────────────────────────────────────────
  {
    id: 'karvonen-hr',
    name: 'Karvonen Target Heart Rate Zone',
    shortName: 'Karvonen',
    description: 'Heart-rate reserve method for training-zone target HR from resting and max HR.',
    category: 'cardiology',
    tags: ['karvonen', 'heart rate reserve', 'exercise', 'target hr'],
    whenToUse: 'Aerobic training zones using heart-rate reserve (HRR).',
    whyUse: 'Accounts for resting HR; preferred over simple %HRmax for many exercise prescriptions.',
    inputs: [
      numberInput('resting', 'Resting HR', { unit: 'bpm', min: 30, max: 120, exampleValue: 70 }),
      numberInput('hrmax', 'Max HR (measured or estimated)', { unit: 'bpm', min: 80, max: 220, exampleValue: 180 }),
      numberInput('lowPct', 'Lower intensity', {
        unit: '% HRR',
        min: 20,
        max: 95,
        exampleValue: 50,
        helpText: 'e.g., 50 for moderate aerobic floor',
      }),
      numberInput('highPct', 'Upper intensity', {
        unit: '% HRR',
        min: 25,
        max: 100,
        exampleValue: 70,
        helpText: 'e.g., 70 for moderate–vigorous ceiling',
      }),
    ],
    calculate(values) {
      const rest = num(values.resting, 70);
      const max = num(values.hrmax, 180);
      const lo = num(values.lowPct, 50) / 100;
      const hi = num(values.highPct, 70) / 100;
      if (max <= rest) {
        return {
          score: '—',
          label: 'Invalid HRs',
          interpretation: 'Max HR must exceed resting HR.',
          riskLevel: 'info',
        };
      }
      const hrr = max - rest;
      const lowHr = round(rest + hrr * Math.min(lo, hi), 0);
      const highHr = round(rest + hrr * Math.max(lo, hi), 0);
      return {
        score: `${lowHr}–${highHr}`,
        unit: 'bpm',
        label: 'Target HR zone (Karvonen)',
        interpretation: `Target zone ${lowHr}–${highHr} bpm using HRR method. HRR = ${hrr} bpm (max ${max} − rest ${rest}). Formula: target = rest + (HRR × intensity).`,
        riskLevel: 'info',
        details: [
          { label: 'Heart-rate reserve', value: `${hrr} bpm` },
          { label: 'Lower target', value: `${lowHr} bpm` },
          { label: 'Upper target', value: `${highHr} bpm` },
        ],
      };
    },
    evidence: {
      summary: 'Karvonen: Target HR = HRrest + (HRmax − HRrest) × intensity fraction.',
      formula: 'THR = HRrest + HRR × %intensity',
      validation: 'Standard ACSM-style exercise prescription approach using heart-rate reserve.',
      references: [
        {
          title: 'The effects of training on heart rate; a longitudinal study',
          citation: 'Karvonen MJ, Kentala E, Mustala O. Ann Med Exp Biol Fenn. 1957',
          year: 1957,
          pmid: '13470504',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Cardiac rehab / disease',
        actions: ['Prefer medically supervised testing', 'Use measured peak HR when possible', 'Consider RPE scales'],
      },
    ],
    pearls: ['Common moderate zone ~40–59% HRR; vigorous ~60–89% HRR (guideline bands vary).', 'Medications alter HR targets.'],
  },

  // ─── 7. Rate-pressure product ──────────────────────────────────────────────
  {
    id: 'rate-pressure-product',
    name: 'Rate-Pressure Product (RPP)',
    shortName: 'RPP',
    description: 'Myocardial oxygen demand index: SBP × heart rate.',
    category: 'cardiology',
    tags: ['rpp', 'double product', 'myocardial oxygen', 'hemodynamics'],
    whenToUse: 'Exercise testing, perioperative or ICU context when estimating myocardial workload.',
    whyUse: 'Simple correlate of myocardial oxygen consumption (MVO₂).',
    inputs: [
      numberInput('sbp', 'Systolic BP', { unit: 'mmHg', min: 60, max: 300, exampleValue: 120 }),
      numberInput('hr', 'Heart rate', { unit: 'bpm', min: 30, max: 250, exampleValue: 80 }),
    ],
    calculate(values) {
      const sbp = num(values.sbp, 120);
      const hr = num(values.hr, 80);
      const rpp = round(sbp * hr, 0);
      const rppk = round(rpp / 1000, 1);
      const r = riskFromThresholds(rpp, [
        {
          max: 11999,
          level: 'low',
          label: 'Lower myocardial demand',
          interpretation: `RPP ${rpp} (${rppk} ×10³). Relatively lower double product at rest/light work — interpret with symptoms and ECG if testing.`,
        },
        {
          max: 19999,
          level: 'moderate',
          label: 'Moderate myocardial demand',
          interpretation: `RPP ${rpp} (${rppk} ×10³). Intermediate workload zone common with mild–moderate activity or stress.`,
        },
        {
          max: 29999,
          level: 'high',
          label: 'High myocardial demand',
          interpretation: `RPP ${rpp} (${rppk} ×10³). High double product — increased MVO₂; relevant for ischemia thresholds during testing or uncontrolled HTN/tachycardia.`,
        },
        {
          max: 999999,
          level: 'critical',
          label: 'Very high myocardial demand',
          interpretation: `RPP ${rpp} (${rppk} ×10³). Very high RPP; address severe hypertension and/or tachycardia; correlate with ischemia risk.`,
        },
      ]);
      return {
        score: rpp,
        unit: 'mmHg·bpm',
        ...r,
        details: [
          { label: 'SBP', value: `${sbp} mmHg` },
          { label: 'HR', value: `${hr} bpm` },
          { label: 'RPP ×10³', value: String(rppk) },
        ],
      };
    },
    evidence: {
      summary: 'Rate-pressure product (double product) = SBP × HR. Surrogate of myocardial oxygen demand.',
      formula: 'RPP = SBP (mmHg) × HR (bpm)',
      validation: 'Correlates with MVO₂ in classic exercise physiology; ischemic thresholds are individual.',
      references: [
        {
          title: 'The rate-pressure product as an index of myocardial oxygen consumption during exercise in patients with angina pectoris',
          citation: 'Gobel FL et al. Circulation. 1978',
          year: 1978,
          pmid: '624164',
          doi: '10.1161/01.cir.57.3.549',
        },
        {
          title: 'Hemodynamic determinants of oxygen consumption of the heart with special reference to the tension-time index',
          citation: 'Sarnoff SJ et al. Am J Physiol. 1958',
          year: 1958,
          pmid: '13498167',
          doi: '10.1152/ajplegacy.1957.192.1.148',
        },
      ],
    },
    nextSteps: [
      { condition: 'High RPP with symptoms', actions: ['Evaluate ischemia', 'Control BP and rate', 'Review meds'] },
    ],
    pearls: ['Some report RPP as SBP×HR/1000.', 'Resting RPP interpretation differs from peak exercise RPP.'],
  },

  // ─── 8. Diastolic shock index ──────────────────────────────────────────────
  {
    id: 'shock-index-diastolic',
    name: 'Diastolic Shock Index',
    shortName: 'SId',
    description: 'Heart rate divided by diastolic blood pressure; marker of vasodilation/shock severity.',
    category: 'emergency',
    tags: ['shock index', 'diastolic', 'sepsis', 'hemodynamics'],
    whenToUse: 'Sepsis, distributive shock, or when diastolic hypotension may signal low vascular tone.',
    whyUse: 'May flag high-risk physiology when classic SI is borderline; studied in septic shock cohorts.',
    inputs: [
      numberInput('hr', 'Heart rate', { unit: 'bpm', min: 20, max: 300, exampleValue: 100 }),
      numberInput('dbp', 'Diastolic BP', { unit: 'mmHg', min: 20, max: 200, exampleValue: 50 }),
    ],
    calculate(values) {
      const hr = num(values.hr, 100);
      const dbp = num(values.dbp, 50);
      if (dbp <= 0 || hr <= 0) {
        return {
          score: '—',
          label: 'Invalid inputs',
          interpretation: 'Enter positive HR and DBP.',
          riskLevel: 'info',
        };
      }
      const sid = round(hr / dbp, 2);
      const r = riskFromThresholds(sid, [
        {
          max: 1.49,
          level: 'low',
          label: 'Lower SId',
          interpretation: `Diastolic shock index ${sid} (HR ${hr} / DBP ${dbp}). Lower range is relatively less concerning, but does not exclude shock.`,
        },
        {
          max: 2.0,
          level: 'moderate',
          label: 'Intermediate SId',
          interpretation: `SId ${sid}. Intermediate elevation — correlate with lactate, mentation, urine output, and classic SI (HR/SBP).`,
        },
        {
          max: 2.5,
          level: 'high',
          label: 'Elevated SId — high concern',
          interpretation: `SId ${sid}. Elevated diastolic SI associated with worse outcomes in septic shock literature — escalate resuscitation and source control assessment.`,
        },
        {
          max: 99,
          level: 'critical',
          label: 'Very high SId',
          interpretation: `SId ${sid}. Markedly elevated — high likelihood of critical vasoplegia/shock physiology; urgent reassessment.`,
        },
      ]);
      return {
        score: sid,
        unit: 'HR/DBP',
        ...r,
        details: [
          { label: 'HR', value: `${hr} bpm` },
          { label: 'DBP', value: `${dbp} mmHg` },
          { label: 'Classic SI (if SBP known)', value: 'Compute separately (HR/SBP)' },
        ],
      };
    },
    evidence: {
      summary: 'Diastolic shock index SId = HR / DBP. Higher values reflect tachycardia with low diastolic pressure (vasodilation).',
      formula: 'SId = heart rate ÷ diastolic BP',
      validation: 'Associated with mortality and vasopressor need in septic shock cohorts; thresholds vary (~1.5–2.5 studied).',
      references: [
        {
          title: 'Diastolic shock index and clinical outcomes in patients with septic shock',
          citation: 'Ospina-Tascón GA et al. Ann Intensive Care. 2020',
          year: 2020,
          pmid: '32296976',
          doi: '10.1186/s13613-020-00658-8',
        },
      ],
    },
    nextSteps: [
      { condition: 'SId ≥2', actions: ['Sepsis bundle elements as indicated', 'Lactate / perfusion assessment', 'Early ICU involvement'] },
    ],
    pearls: [
      'Complement classic SI (HR/SBP) and MAP — do not use in isolation.',
      'Aortic regurgitation and measurement error affect DBP.',
    ],
  },

  // ─── 9. BMI Prime ──────────────────────────────────────────────────────────
  {
    id: 'bmi-prime',
    name: 'BMI Prime',
    shortName: 'BMI′',
    description: 'BMI divided by 25 (upper limit of WHO normal BMI) — dimensionless adiposity index.',
    category: 'endocrinology',
    tags: ['bmi prime', 'obesity', 'adiposity', 'bmi'],
    whenToUse: 'Expressing BMI relative to the upper normal WHO threshold (25 kg/m²).',
    whyUse: 'Values >1.0 indicate BMI above normal range; easy comparison across populations.',
    inputs: [
      numberInput('weight', 'Weight', { unit: 'kg', unitKind: 'weight', min: 20, max: 400, step: 0.1, exampleValue: 80 }),
      numberInput('height', 'Height', { unit: 'cm', min: 100, max: 250, exampleValue: 170 }),
    ],
    calculate(values) {
      const w = num(values.weight, 80);
      const h = num(values.height, 170) / 100;
      if (h <= 0) {
        return { score: '—', label: 'Invalid height', interpretation: 'Height must be positive.', riskLevel: 'info' };
      }
      const bmi = w / (h * h);
      const prime = round(bmi / 25, 2);
      const bmiR = round(bmi, 1);
      const r = riskFromThresholds(prime, [
        {
          max: 0.739,
          level: 'moderate',
          label: 'Underweight range (BMI′ <0.74)',
          interpretation: `BMI′ ${prime} (BMI ${bmiR}). Corresponds to BMI <18.5 — evaluate undernutrition.`,
        },
        {
          max: 1.0,
          level: 'normal',
          label: 'Normal range (BMI′ ≤1.0)',
          interpretation: `BMI′ ${prime} (BMI ${bmiR}). Within or at upper WHO normal BMI (≤25).`,
        },
        {
          max: 1.2,
          level: 'moderate',
          label: 'Overweight (BMI′ 1.01–1.2)',
          interpretation: `BMI′ ${prime} (BMI ${bmiR}). Overweight band (BMI 25–30).`,
        },
        {
          max: 1.4,
          level: 'high',
          label: 'Obesity class I–II range',
          interpretation: `BMI′ ${prime} (BMI ${bmiR}). Roughly obesity class I–II territory — assess comorbidities.`,
        },
        {
          max: 10,
          level: 'high',
          label: 'Severe obesity range',
          interpretation: `BMI′ ${prime} (BMI ${bmiR}). Markedly elevated — comprehensive obesity care pathways.`,
        },
      ]);
      return {
        score: prime,
        unit: 'BMI/25',
        ...r,
        details: [
          { label: 'BMI', value: `${bmiR} kg/m²` },
          { label: 'Reference', value: '25 kg/m² (WHO upper normal)' },
        ],
      };
    },
    evidence: {
      summary: 'BMI Prime = BMI / 25. Dimensionless; 1.0 = BMI 25 kg/m².',
      formula: 'BMI′ = (kg/m²) / 25',
      validation: 'Proposed as an intuitive ratio scale; same limitations as BMI (muscle mass, ethnicity, age).',
      references: [
        {
          title: '"How much should I weigh?"—Quetelet\'s equation, upper weight limits, and BMI prime',
          citation: 'Gadzik J. Conn Med. 2006',
          year: 2006,
          pmid: '16768059',
        },
      ],
    },
    nextSteps: [
      { condition: 'BMI′ >1', actions: ['Lifestyle counseling', 'Screen metabolic syndrome components', 'Waist circumference'] },
    ],
    pearls: ['Ethnic-specific BMI cutoffs differ from 25 for risk labeling.', 'Athletes may have high BMI′ without excess fat.'],
  },

  // ─── 10. Body adiposity index ──────────────────────────────────────────────
  {
    id: 'body-adiposity',
    name: 'Body Adiposity Index (BAI)',
    shortName: 'BAI',
    description: 'Estimates percent body fat from hip circumference and height (no weight required).',
    category: 'endocrinology',
    tags: ['bai', 'body fat', 'adiposity', 'hip circumference'],
    whenToUse: 'When weight is unavailable or as an adjunct adiposity estimate from hip and height.',
    whyUse: 'Does not require a scale; validated against DXA in original Mexican-American cohorts (limitations apply).',
    inputs: [
      numberInput('hip', 'Hip circumference', {
        unit: 'cm',
        min: 50,
        max: 200,
        step: 0.5,
        exampleValue: 100,
        helpText: 'Widest hip/buttock circumference',
      }),
      numberInput('height', 'Height', { unit: 'cm', min: 100, max: 250, exampleValue: 170 }),
      selectInput('sex', 'Sex (for interpretation bands)', [
        { label: 'Female', value: 'F' },
        { label: 'Male', value: 'M' },
      ]),
    ],
    calculate(values) {
      const hip = num(values.hip, 100);
      const hCm = num(values.height, 170);
      const hM = hCm / 100;
      if (hM <= 0) {
        return { score: '—', label: 'Invalid height', interpretation: 'Height must be positive.', riskLevel: 'info' };
      }
      // BAI = (hip_cm / height_m^1.5) − 18
      const bai = round(hip / Math.pow(hM, 1.5) - 18, 1);
      const female = values.sex !== 'M';
      // Approximate healthy body-fat education bands (ACE-style-ish, not BAI-specific gold standard)
      const r = female
        ? riskFromThresholds(bai, [
            {
              max: 20.9,
              level: 'moderate',
              label: 'Lower estimated BF%',
              interpretation: `BAI ${bai}% — lower range for women; correlate with clinical nutrition status.`,
            },
            {
              max: 32.9,
              level: 'normal',
              label: 'Approximate average/fitness range',
              interpretation: `BAI ${bai}% estimated body fat (women educational bands). Not a DXA substitute.`,
            },
            {
              max: 38.9,
              level: 'moderate',
              label: 'Elevated estimated BF%',
              interpretation: `BAI ${bai}% — elevated adiposity estimate; assess metabolic risk.`,
            },
            {
              max: 100,
              level: 'high',
              label: 'High estimated BF%',
              interpretation: `BAI ${bai}% — high adiposity estimate; comprehensive risk assessment.`,
            },
          ])
        : riskFromThresholds(bai, [
            {
              max: 10.9,
              level: 'moderate',
              label: 'Lower estimated BF%',
              interpretation: `BAI ${bai}% — lower range for men; clinical correlation needed.`,
            },
            {
              max: 21.9,
              level: 'normal',
              label: 'Approximate average/fitness range',
              interpretation: `BAI ${bai}% estimated body fat (men educational bands). Not a DXA substitute.`,
            },
            {
              max: 27.9,
              level: 'moderate',
              label: 'Elevated estimated BF%',
              interpretation: `BAI ${bai}% — elevated adiposity estimate; assess metabolic risk.`,
            },
            {
              max: 100,
              level: 'high',
              label: 'High estimated BF%',
              interpretation: `BAI ${bai}% — high adiposity estimate; comprehensive risk assessment.`,
            },
          ]);
      return {
        score: bai,
        unit: '%',
        ...r,
        details: [
          { label: 'Hip', value: `${hip} cm` },
          { label: 'Height', value: `${hCm} cm` },
          { label: 'Formula', value: '(hip / height_m^1.5) − 18' },
        ],
      };
    },
    evidence: {
      summary: 'BAI = (hip circumference in cm) / (height in m)^1.5 − 18 ≈ percent body fat.',
      formula: 'BAI = hip_cm / height_m^1.5 − 18',
      validation: 'Bergman et al. 2011 vs DXA; accuracy varies by sex, race, and age — less reliable than DXA/BIA clinical standards.',
      references: [
        {
          title: 'A better index of body adiposity',
          citation: 'Bergman RN et al. Obesity (Silver Spring). 2011',
          year: 2011,
          pmid: '21372804',
          doi: '10.1038/oby.2011.38',
        },
      ],
    },
    nextSteps: [
      { condition: 'Elevated BAI', actions: ['Metabolic labs as indicated', 'Waist circumference', 'Lifestyle intervention'] },
    ],
    pearls: ['Hip tape measure technique affects result.', 'Prefer DXA/clinical judgment for body-composition decisions.'],
  },

  // ─── 11. Ponderal index ────────────────────────────────────────────────────
  {
    id: 'ponderal-index',
    name: 'Ponderal Index (Corpulence Index)',
    shortName: 'PI',
    description: 'Weight / height³ anthropometric index (alternative to BMI).',
    category: 'general',
    tags: ['ponderal', 'corpulence', 'anthropometry', 'pediatrics'],
    whenToUse: 'Anthropometry when a height-cubed index is preferred (neonatal/pediatric or comparative research contexts).',
    whyUse: 'Less height-dependent than BMI in some populations; used historically and in neonatal assessment variants.',
    inputs: [
      numberInput('weight', 'Weight', { unit: 'kg', unitKind: 'weight', min: 0.5, max: 400, step: 0.1, exampleValue: 70 }),
      numberInput('height', 'Height', { unit: 'cm', min: 40, max: 250, exampleValue: 170 }),
    ],
    calculate(values) {
      const w = num(values.weight, 70);
      const hM = num(values.height, 170) / 100;
      if (hM <= 0) {
        return { score: '—', label: 'Invalid height', interpretation: 'Height must be positive.', riskLevel: 'info' };
      }
      // Corpulence / Rohrer-related: PI = kg / m³
      const pi = round(w / (hM * hM * hM), 1);
      // Adult educational bands roughly map ~12 under, 12–16 normal-ish, etc. (varies widely)
      const r = riskFromThresholds(pi, [
        {
          max: 11.9,
          level: 'moderate',
          label: 'Lower PI',
          interpretation: `Ponderal index ${pi} kg/m³. Lower range — clinical underweight concern depending on age/population norms.`,
        },
        {
          max: 16,
          level: 'normal',
          label: 'Typical adult range (approx.)',
          interpretation: `Ponderal index ${pi} kg/m³. Roughly common adult reference band educationally (~12–16); use age-specific charts when available.`,
        },
        {
          max: 20,
          level: 'moderate',
          label: 'Elevated PI',
          interpretation: `Ponderal index ${pi} kg/m³. Elevated vs common adult educational bands.`,
        },
        {
          max: 100,
          level: 'high',
          label: 'High PI',
          interpretation: `Ponderal index ${pi} kg/m³. High corpulence index — correlate with BMI and clinical adiposity measures.`,
        },
      ]);
      return {
        score: pi,
        unit: 'kg/m³',
        ...r,
        details: [
          { label: 'BMI (for comparison)', value: `${round(w / (hM * hM), 1)} kg/m²` },
          { label: 'Formula', value: 'weight_kg / height_m³' },
        ],
      };
    },
    evidence: {
      summary: 'Ponderal (corpulence) index = mass / height³ (kg/m³). Related to Rohrer index formulations.',
      formula: 'PI = kg / m³',
      validation: 'Historical anthropometric index; neonatal ponderal index uses g/cm³ variants — confirm unit system.',
      references: [
        {
          title: 'Der Index der Körperfülle als Maß des Ernährungszustandes',
          citation: 'Rohrer F. Münch Med Wochenschr. 1921;68:580-582',
          year: 1921,
        },
        {
          title: 'Tri-Ponderal Mass Index vs Body Mass Index in Estimating Body Fat During Adolescence',
          citation: 'Peterson CM et al. JAMA Pediatr. 2017',
          year: 2017,
          pmid: '28505241',
          doi: '10.1001/jamapediatrics.2017.0460',
        },
      ],
    },
    nextSteps: [
      { condition: 'Abnormal PI', actions: ['Compute BMI', 'Use age- and sex-specific growth charts in children'] },
    ],
    pearls: [
      'Neonatal PI often expressed as birth weight (g) / length (cm)³ × 100.',
      'Adult cutoffs are less standardized than WHO BMI.',
    ],
  },

  // ─── 12. DuBois BSA ────────────────────────────────────────────────────────
  {
    id: 'dubois-bsa',
    name: 'BSA (DuBois & DuBois)',
    shortName: 'DuBois BSA',
    description: 'Body surface area using the classic DuBois and DuBois formula.',
    category: 'general',
    tags: ['bsa', 'dubois', 'chemotherapy', 'dosing'],
    whenToUse: 'When a protocol specifies DuBois BSA rather than Mosteller.',
    whyUse: 'Historical gold-standard BSA equation still referenced in physiology and some dosing tables.',
    inputs: [
      numberInput('height', 'Height', { unit: 'cm', min: 50, max: 250, step: 0.1, exampleValue: 170 }),
      numberInput('weight', 'Weight', { unit: 'kg', unitKind: 'weight', min: 10, max: 400, step: 0.1, exampleValue: 70 }),
    ],
    calculate(values) {
      const h = num(values.height, 170);
      const w = num(values.weight, 70);
      if (h <= 0 || w <= 0) {
        return { score: '—', label: 'Invalid input', interpretation: 'Height and weight must be positive.', riskLevel: 'info' };
      }
      const bsa = round(0.007184 * Math.pow(w, 0.425) * Math.pow(h, 0.725), 2);
      const mosteller = round(Math.sqrt((h * w) / 3600), 2);
      return {
        score: bsa,
        unit: 'm²',
        label: 'DuBois BSA',
        interpretation: `DuBois BSA ≈ ${bsa} m². Mosteller for comparison ≈ ${mosteller} m². Document which formula the regimen requires.`,
        riskLevel: 'info',
        details: [
          { label: 'DuBois', value: `${bsa} m²` },
          { label: 'Mosteller (comparison)', value: `${mosteller} m²` },
        ],
        recommendations: ['Pharmacy double-check for chemo', 'Apply protocol BSA caps if any'],
      };
    },
    evidence: {
      summary: 'DuBois: BSA (m²) = 0.007184 × W(kg)^0.425 × H(cm)^0.725.',
      formula: 'BSA = 0.007184 · W^0.425 · H^0.725',
      validation: 'DuBois & DuBois 1916; still a reference method; Mosteller is simpler and closely correlated.',
      references: [
        {
          title: 'A formula to estimate the approximate surface area if height and weight be known',
          citation: 'DuBois D, DuBois EF. Arch Intern Med. 1916 (Nutrition 1989 reprint)',
          year: 1916,
          pmid: '2520314',
        },
      ],
    },
    nextSteps: [
      { condition: 'Chemo dosing', actions: ['Multiply mg/m² × BSA', 'Confirm formula mandated by protocol'] },
    ],
    pearls: ['Slight numeric differences vs Mosteller are expected.', 'Obesity dosing policies may cap BSA.'],
  },

  // ─── 13. Haycock BSA ───────────────────────────────────────────────────────
  {
    id: 'haycock-bsa',
    name: 'BSA (Haycock — Pediatric)',
    shortName: 'Haycock BSA',
    description: 'Body surface area by Haycock formula; often preferred in infants and children.',
    category: 'pediatrics',
    tags: ['bsa', 'haycock', 'pediatric', 'dosing'],
    whenToUse: 'Pediatric BSA estimation for dosing or physiologic indexing when Haycock is preferred.',
    whyUse: 'Better performance than some adult formulas at low body size / pediatrics.',
    inputs: [
      numberInput('height', 'Height / length', { unit: 'cm', min: 30, max: 200, step: 0.1, exampleValue: 100 }),
      numberInput('weight', 'Weight', { unit: 'kg', unitKind: 'weight', min: 1, max: 150, step: 0.1, exampleValue: 15 }),
    ],
    calculate(values) {
      const h = num(values.height, 100);
      const w = num(values.weight, 15);
      if (h <= 0 || w <= 0) {
        return { score: '—', label: 'Invalid input', interpretation: 'Height and weight must be positive.', riskLevel: 'info' };
      }
      const bsa = round(0.024265 * Math.pow(w, 0.5378) * Math.pow(h, 0.3964), 3);
      const mosteller = round(Math.sqrt((h * w) / 3600), 3);
      return {
        score: bsa,
        unit: 'm²',
        label: 'Haycock BSA',
        interpretation: `Haycock BSA ≈ ${bsa} m² (Mosteller comparison ≈ ${mosteller} m²). Commonly used for pediatric drug dosing indexed to surface area.`,
        riskLevel: 'info',
        details: [
          { label: 'Haycock', value: `${bsa} m²` },
          { label: 'Mosteller (comparison)', value: `${mosteller} m²` },
        ],
      };
    },
    evidence: {
      summary: 'Haycock: BSA (m²) = 0.024265 × W(kg)^0.5378 × H(cm)^0.3964.',
      formula: 'BSA = 0.024265 · W^0.5378 · H^0.3964',
      validation: 'Haycock et al. 1978; validated across wide pediatric size range including neonates.',
      references: [
        {
          title: 'Geometric method for measuring body surface area: a height-weight formula validated in infants, children, and adults',
          citation: 'Haycock GB et al. J Pediatr. 1978',
          year: 1978,
          pmid: '650346',
          doi: '10.1016/s0022-3476(78)80601-5',
        },
      ],
    },
    nextSteps: [
      { condition: 'Pediatric dosing', actions: ['Use regimen-specific mg/m² or mg/kg', 'Cross-check with formulary max doses'] },
    ],
    pearls: ['Measure length accurately in infants.', 'Some centers standardize on Mosteller for all ages — follow local policy.'],
  },

  // ─── 14. Robinson IBW ──────────────────────────────────────────────────────
  {
    id: 'robinson-ibw',
    name: 'Ideal Body Weight (Robinson)',
    shortName: 'Robinson IBW',
    description: 'Ideal body weight using the Robinson formula (alternative to Devine).',
    category: 'general',
    tags: ['ibw', 'robinson', 'dosing', 'weight'],
    whenToUse: 'When comparing IBW formulas or a reference cites Robinson rather than Devine.',
    whyUse: 'Slightly different height increments than Devine; sometimes used in anesthesia/PK literature.',
    inputs: [
      numberInput('height', 'Height', { unit: 'cm', min: 140, max: 220, exampleValue: 170 }),
      selectInput('sex', 'Sex', [
        { label: 'Male', value: 'M' },
        { label: 'Female', value: 'F' },
      ]),
    ],
    calculate(values) {
      const inches = num(values.height, 170) / 2.54;
      const over = Math.max(0, inches - 60);
      // Robinson: ♂ 52 + 1.9×(in−60); ♀ 49 + 1.7×(in−60)
      const ibw = values.sex === 'F' ? 49 + 1.7 * over : 52 + 1.9 * over;
      const ibwR = round(ibw, 1);
      const devine = values.sex === 'F' ? 45.5 + 2.3 * over : 50 + 2.3 * over;
      return {
        score: ibwR,
        unit: 'kg',
        label: 'Robinson IBW',
        interpretation: `Robinson IBW ≈ ${ibwR} kg. Devine comparison ≈ ${round(devine, 1)} kg. For height <60 in, formulas are poorly defined — use clinical judgment.`,
        riskLevel: 'info',
        details: [
          { label: 'Height', value: `${round(inches, 1)} in` },
          { label: 'Devine (comparison)', value: `${round(devine, 1)} kg` },
        ],
      };
    },
    evidence: {
      summary: 'Robinson IBW: men 52 kg + 1.9 kg per inch >5 ft; women 49 kg + 1.7 kg per inch >5 ft.',
      formula: '♂ 52 + 1.9·(in−60); ♀ 49 + 1.7·(in−60)',
      validation: 'Robinson et al. 1983 comparison of IBW formulas; differences of a few kg vs Devine are common.',
      references: [
        {
          title: 'Determination of ideal body weight for drug dosage calculations',
          citation: 'Robinson JD et al. Am J Hosp Pharm. 1983',
          year: 1983,
          pmid: '6869387',
          doi: '10.1093/ajhp/40.6.1016',
        },
      ],
    },
    nextSteps: [
      { condition: 'Drug dosing', actions: ['Confirm which IBW formula the protocol assumes', 'Compute AdjBW if obese'] },
    ],
    pearls: ['Devine remains the most common pharmacy default.', 'IBW is not a healthy-weight counseling target.'],
  },

  // ─── 15. Miller IBW ────────────────────────────────────────────────────────
  {
    id: 'miller-ibw',
    name: 'Ideal Body Weight (Miller)',
    shortName: 'Miller IBW',
    description: 'Ideal body weight using the Miller formula.',
    category: 'general',
    tags: ['ibw', 'miller', 'dosing', 'weight'],
    whenToUse: 'Alternative IBW estimate when literature or local practice references Miller.',
    whyUse: 'Another commonly cited IBW equation for comparison with Devine/Robinson/Hamwi.',
    inputs: [
      numberInput('height', 'Height', { unit: 'cm', min: 140, max: 220, exampleValue: 170 }),
      selectInput('sex', 'Sex', [
        { label: 'Male', value: 'M' },
        { label: 'Female', value: 'F' },
      ]),
    ],
    calculate(values) {
      const inches = num(values.height, 170) / 2.54;
      const over = Math.max(0, inches - 60);
      // Miller: ♂ 56.2 + 1.41×(in−60); ♀ 53.1 + 1.36×(in−60)
      const ibw = values.sex === 'F' ? 53.1 + 1.36 * over : 56.2 + 1.41 * over;
      const ibwR = round(ibw, 1);
      const devine = values.sex === 'F' ? 45.5 + 2.3 * over : 50 + 2.3 * over;
      return {
        score: ibwR,
        unit: 'kg',
        label: 'Miller IBW',
        interpretation: `Miller IBW ≈ ${ibwR} kg. Devine comparison ≈ ${round(devine, 1)} kg. Miller tends to estimate higher IBW than Devine at average heights.`,
        riskLevel: 'info',
        details: [
          { label: 'Height', value: `${round(inches, 1)} in` },
          { label: 'Devine (comparison)', value: `${round(devine, 1)} kg` },
        ],
      };
    },
    evidence: {
      summary: 'Miller IBW: men 56.2 + 1.41 kg/inch >5 ft; women 53.1 + 1.36 kg/inch >5 ft.',
      formula: '♂ 56.2 + 1.41·(in−60); ♀ 53.1 + 1.36·(in−60)',
      validation: 'Miller et al. 1983; one of several linear IBW formulas compared in pharmacy literature.',
      references: [
        {
          title: 'The origin of the "ideal" body weight equations',
          citation: 'Pai MP, Paloucek FP. Ann Pharmacother. 2000 (documents Miller IBW coefficients)',
          year: 2000,
          pmid: '10981254',
          doi: '10.1345/aph.19381',
        },
      ],
    },
    nextSteps: [
      { condition: 'Any', actions: ['Standardize institutional IBW formula', 'Document formula used for high-risk drugs'] },
    ],
    pearls: ['Inconsistency between IBW formulas can change mg/kg doses.', 'Prefer protocol-specified equation.'],
  },

  // ─── 16. Janmahasatian LBW ─────────────────────────────────────────────────
  {
    id: 'janmahasatian',
    name: 'Lean Body Weight (Janmahasatian)',
    shortName: 'Janmahasatian LBW',
    description: 'Sex-specific lean body weight from total body weight and BMI (Janmahasatian formula).',
    category: 'general',
    tags: ['lbw', 'janmahasatian', 'obesity', 'pharmacokinetics', 'dosing'],
    whenToUse: 'LBW estimation in normal-weight and obese adults for PK/dosing equations.',
    whyUse: 'Performs better than James LBW across BMI range; widely used in modern PK.',
    inputs: [
      numberInput('weight', 'Total body weight', { unit: 'kg', unitKind: 'weight', min: 30, max: 300, step: 0.1, exampleValue: 90 }),
      numberInput('height', 'Height', { unit: 'cm', min: 120, max: 230, exampleValue: 170 }),
      selectInput('sex', 'Sex', [
        { label: 'Male', value: 'M' },
        { label: 'Female', value: 'F' },
      ]),
    ],
    calculate(values) {
      const w = num(values.weight, 90);
      const hM = num(values.height, 170) / 100;
      if (hM <= 0 || w <= 0) {
        return { score: '—', label: 'Invalid input', interpretation: 'Height and weight must be positive.', riskLevel: 'info' };
      }
      const bmi = w / (hM * hM);
      // Janmahasatian: ♂ 9270·TBW/(6680+216·BMI); ♀ 9270·TBW/(8780+244·BMI)
      const lbw =
        values.sex === 'F'
          ? (9270 * w) / (8780 + 244 * bmi)
          : (9270 * w) / (6680 + 216 * bmi);
      const lbwR = round(lbw, 1);
      return {
        score: lbwR,
        unit: 'kg',
        label: 'Janmahasatian LBW',
        interpretation: `Janmahasatian LBW ≈ ${lbwR} kg at BMI ${round(bmi, 1)}. Preferred over James for obese adults in many PK applications.`,
        riskLevel: 'info',
        details: [
          { label: 'BMI', value: `${round(bmi, 1)} kg/m²` },
          { label: 'TBW', value: `${w} kg` },
          { label: 'LBW/TBW', value: `${round((lbwR / w) * 100, 0)}%` },
        ],
      };
    },
    evidence: {
      summary:
        'Janmahasatian LBW: men (9270·TBW)/(6680+216·BMI); women (9270·TBW)/(8780+244·BMI).',
      formula: 'LBW = 9270·TBW / (sex-specific intercept + slope·BMI)',
      validation: 'Derived and validated vs dual-energy methods; robust across BMI spectrum vs James.',
      references: [
        {
          title: 'Quantification of lean bodyweight',
          citation: 'Janmahasatian S et al. Clin Pharmacokinet. 2005',
          year: 2005,
          pmid: '16176118',
          doi: '10.2165/00003088-200544100-00004',
        },
      ],
    },
    nextSteps: [
      { condition: 'PK dosing', actions: ['Apply drug-specific LBW equations', 'Do not assume all drugs use LBW'] },
    ],
    pearls: ['Uses TBW and BMI only (height enters via BMI).', 'Still an estimate — not measured lean mass.'],
  },

  // ─── 17. ASDAS-CRP ─────────────────────────────────────────────────────────
  {
    id: 'asdas-crp',
    name: 'ASDAS-CRP (Axial SpA)',
    shortName: 'ASDAS-CRP',
    description: 'Ankylosing Spondylitis Disease Activity Score with CRP for axial spondyloarthritis.',
    category: 'rheumatology',
    tags: ['asdas', 'axial spa', 'ankylosing spondylitis', 'crp', 'rheumatology'],
    whenToUse: 'axSpA / AS disease activity monitoring with patient domains and CRP.',
    whyUse: 'ASAS-endorsed composite; preferred over BASDAI alone when CRP is available.',
    inputs: [
      numberInput('backPain', 'Back pain (BASDAI Q2)', {
        unit: '0–10',
        min: 0,
        max: 10,
        step: 0.1,
        exampleValue: 5,
        helpText: 'BASDAI Q2, past week: overall AS neck, back or hip pain. 0=none, 10=very severe.',
      }),
      numberInput('morningStiff', 'Duration of morning stiffness (BASDAI Q6)', {
        unit: '0–10',
        min: 0,
        max: 10,
        step: 0.1,
        exampleValue: 4,
        helpText: 'BASDAI Q6, past week: morning stiffness duration from waking. 0=0 h, 10=2 h or more (VAS, not raw hours).',
      }),
      numberInput('ptGlobal', 'Patient global assessment of disease activity', {
        unit: '0–10',
        min: 0,
        max: 10,
        step: 0.1,
        exampleValue: 5,
        helpText: 'Past week: how active was your spondyloarthritis? 0=not active, 10=very active.',
      }),
      numberInput('peripheral', 'Peripheral pain/swelling (BASDAI Q3)', {
        unit: '0–10',
        min: 0,
        max: 10,
        step: 0.1,
        exampleValue: 2,
        helpText: 'BASDAI Q3, past week: pain/swelling in joints other than neck, back or hips. 0=none, 10=very severe.',
      }),
      numberInput('crp', 'CRP', {
        unit: 'mg/L',
        min: 0,
        max: 200,
        step: 0.1,
        exampleValue: 8,
        helpText: 'mg/L (not mg/dL). If the lab reports mg/dL, multiply by 10. ASDAS uses ln(CRP+1).',
      }),
    ],
    calculate(values) {
      const b = num(values.backPain, 5);
      const m = num(values.morningStiff, 4);
      const g = num(values.ptGlobal, 5);
      const p = num(values.peripheral, 2);
      const crp = Math.max(0, num(values.crp, 8));
      // ASDAS-CRP = 0.12·B + 0.06·M + 0.11·G + 0.07·P + 0.58·ln(CRP+1)
      const score = round(0.12 * b + 0.06 * m + 0.11 * g + 0.07 * p + 0.58 * Math.log(crp + 1), 2);
      const r = riskFromThresholds(score, [
        {
          max: 1.29,
          level: 'normal',
          label: 'Inactive disease (<1.3)',
          interpretation: `ASDAS-CRP ${score}: inactive disease. Continue monitoring; maintain therapy plan as appropriate.`,
        },
        {
          max: 2.09,
          level: 'low',
          label: 'Low disease activity (1.3–<2.1)',
          interpretation: `ASDAS-CRP ${score}: low disease activity. Often acceptable treat-to-target range.`,
        },
        {
          max: 3.5,
          level: 'high',
          label: 'High disease activity (2.1–3.5)',
          interpretation: `ASDAS-CRP ${score}: high disease activity. Consider treatment optimization / biologic eligibility pathways.`,
        },
        {
          max: 20,
          level: 'critical',
          label: 'Very high disease activity (>3.5)',
          interpretation: `ASDAS-CRP ${score}: very high activity. Escalate care; reassess inflammation, adherence, and differential diagnoses.`,
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'CRP', value: `${crp} mg/L` },
          { label: 'ln(CRP+1)', value: String(round(Math.log(crp + 1), 3)) },
        ],
      };
    },
    evidence: {
      summary:
        'ASDAS-CRP = 0.12·back pain + 0.06·morning stiffness + 0.11·patient global + 0.07·peripheral pain + 0.58·ln(CRP+1). Cutoffs: <1.3 inactive; 1.3–<2.1 low; 2.1–3.5 high; >3.5 very high.',
      formula: 'Weighted sum of 0–10 domains + ln(CRP_mg/L + 1)',
      validation: 'ASAS-endorsed; widely used in axSpA trials and treat-to-target strategies.',
      references: [
        {
          title: 'Development of an ASAS-endorsed disease activity score (ASDAS) in patients with ankylosing spondylitis',
          citation: 'Lukas C et al. Ann Rheum Dis. 2009',
          year: 2009,
          pmid: '18625618',
          doi: '10.1136/ard.2008.094870',
        },
        {
          title: 'ASDAS cut-offs',
          citation: 'Machado P et al. Ann Rheum Dis. 2011',
          year: 2011,
          pmid: '21068095',
          doi: '10.1136/ard.2010.138594',
        },
      ],
    },
    nextSteps: [
      { condition: 'ASDAS ≥2.1', actions: ['Review NSAID trial documentation', 'CRP/imaging correlation', 'Biologic / tsDMARD consideration'] },
      { condition: 'ASDAS <1.3', actions: ['Maintain therapy', 'Physiotherapy', 'Scheduled re-score'] },
    ],
    pearls: ['CRP must be mg/L.', 'ASDAS-ESR uses a different formula — not interchangeable.'],
  },

  // ─── 18. DAPSA ─────────────────────────────────────────────────────────────
  {
    id: 'dapsa',
    name: 'DAPSA (Psoriatic Arthritis)',
    shortName: 'DAPSA',
    description: 'Disease Activity in PSoriatic Arthritis score from joints, patient scores, and CRP.',
    category: 'rheumatology',
    tags: ['dapsa', 'psoriatic arthritis', 'psa', 'rheumatology'],
    whenToUse: 'PsA peripheral disease activity assessment and treat-to-target monitoring.',
    whyUse: 'Simple continuous composite validated for PsA; skin disease scored separately (e.g., PASI).',
    inputs: [
      numberInput('tjc', 'Tender joint count (68)', {
        min: 0,
        max: 68,
        exampleValue: 6,
        helpText:
          '68 joints: DIP, PIP, MCP, wrists, elbows, shoulders, AC, SC, TMJ, hips, knees, ankles, midtarsals, MTPs, toe IPs (bilateral). Tender = pain on firm pressure.',
      }),
      numberInput('sjc', 'Swollen joint count (66)', {
        min: 0,
        max: 66,
        exampleValue: 3,
        helpText: 'Same set except hips not scored for swelling (66).',
      }),
      numberInput('pain', 'Patient pain VAS', {
        unit: '0–10',
        min: 0,
        max: 10,
        step: 0.1,
        exampleValue: 4,
        helpText: 'Patient pain due to PsA (typically past week). 0=none, 10=worst.',
      }),
      numberInput('ptGlobal', 'Patient global VAS', {
        unit: '0–10',
        min: 0,
        max: 10,
        step: 0.1,
        exampleValue: 4,
        helpText: 'Patient global PsA activity (typically past week). 0=none, 10=worst imaginable.',
      }),
      numberInput('crp', 'CRP', {
        unit: 'mg/dL',
        min: 0,
        max: 30,
        step: 0.1,
        exampleValue: 0.5,
        helpText: 'mg/dL (divide mg/L by 10)',
      }),
    ],
    calculate(values) {
      const tjc = num(values.tjc, 0);
      const sjc = num(values.sjc, 0);
      const pain = num(values.pain, 0);
      const g = num(values.ptGlobal, 0);
      const crp = num(values.crp, 0);
      const score = round(tjc + sjc + pain + g + crp, 1);
      const r = riskFromThresholds(score, [
        {
          max: 4,
          level: 'normal',
          label: 'Remission (≤4)',
          interpretation: `DAPSA ${score}: remission. Continue therapy and monitor skin/axial domains separately if relevant.`,
        },
        {
          max: 14,
          level: 'low',
          label: 'Low disease activity (≤14)',
          interpretation: `DAPSA ${score}: low disease activity — often treat-to-target acceptable range.`,
        },
        {
          max: 28,
          level: 'moderate',
          label: 'Moderate disease activity (≤28)',
          interpretation: `DAPSA ${score}: moderate activity — consider treatment adjustment.`,
        },
        {
          max: 200,
          level: 'high',
          label: 'High disease activity (>28)',
          interpretation: `DAPSA ${score}: high disease activity — escalate DMARD/biologic strategy as appropriate.`,
        },
      ]);
      return {
        score,
        ...r,
        details: [
          { label: 'TJC68 + SJC66', value: `${tjc} + ${sjc}` },
          { label: 'Pain + PtGA', value: `${pain} + ${g}` },
          { label: 'CRP', value: `${crp} mg/dL` },
        ],
      };
    },
    evidence: {
      summary:
        'DAPSA = TJC68 + SJC66 + patient pain (0–10) + patient global (0–10) + CRP (mg/dL). Remission ≤4; LDA ≤14; MDA ≤28; HDA >28.',
      formula: 'Simple sum of joints, VASs, and CRP',
      validation: 'Schoels / Aletaha validations for PsA disease activity states.',
      references: [
        {
          title: 'Application of the DAREA/DAPSA score for assessment of disease activity in psoriatic arthritis',
          citation: 'Schoels M et al. Ann Rheum Dis. 2010',
          year: 2010,
          pmid: '20525844',
          doi: '10.1136/ard.2009.122259',
        },
        {
          title: 'Disease activity in psoriatic arthritis (PsA): defining remission and treatment success using the DAPSA score',
          citation: 'Schoels MM et al. Ann Rheum Dis. 2016',
          year: 2016,
          pmid: '26269398',
          doi: '10.1136/annrheumdis-2015-207507',
        },
      ],
    },
    nextSteps: [
      { condition: 'DAPSA >14', actions: ['Adjust csDMARD/biologic', 'Assess enthesitis/dactylitis/skin', 'Infection screen before escalation'] },
    ],
    pearls: ['CRP in mg/dL (not mg/L).', 'Does not include skin severity — use PASI/BSA separately.'],
  },

  // ─── 19. HAQ-DI ────────────────────────────────────────────────────────────
  {
    id: 'haq-di',
    name: 'HAQ-DI (Health Assessment Questionnaire Disability Index)',
    shortName: 'HAQ-DI',
    description:
      'Official 20-item HAQ-DI: 2–3 items in each of 8 categories; category score is the worst item, aids/help raise 0–1 to 2, then mean of 8 categories (0–3).',
    category: 'rheumatology',
    tags: ['haq', 'haq-di', 'disability', 'rheumatology', 'function'],
    whenToUse: 'When evaluating functional impairment and physical disability in rheumatoid arthritis, psoriatic arthritis, or other rheumatic conditions.',
    whyUse: 'Gold-standard patient-reported physical function outcome measure in rheumatology trials and treat-to-target clinic care.',
    isQuestionnaire: true,
    questionnaire: {
      modeInputId: 'entryMode',
      directModeValues: ['direct'],
      directInputIds: ['total'],
    },
    inputs: [
      selectInput('entryMode', 'Entry Mode', [
        { label: 'Interactive 20-item HAQ-DI (recommended)', value: 'survey' },
        { label: 'Direct HAQ-DI score override (0–3)', value: 'direct' },
      ], 'survey'),
      selectInput('haq_dress', 'Dressing: Dress yourself, including tying shoelaces and doing buttons', [
        { label: '0 - Without ANY difficulty', value: 0 },
        { label: '1 - With SOME difficulty', value: 1 },
        { label: '2 - With MUCH difficulty', value: 2 },
        { label: '3 - UNABLE to do', value: 3 },
      ], 0),
      selectInput('haq_shampoo', 'Dressing: Shampoo your hair', [
        { label: '0 - Without ANY difficulty', value: 0 },
        { label: '1 - With SOME difficulty', value: 1 },
        { label: '2 - With MUCH difficulty', value: 2 },
        { label: '3 - UNABLE to do', value: 3 },
      ], 0),
      yesNo('haq_c1_aid', 'Dressing aids/help (button hook, zipper pull, or personal assistance)?'),
      selectInput('haq_chair', 'Arising: Stand up from an armless straight chair', [
        { label: '0 - Without ANY difficulty', value: 0 },
        { label: '1 - With SOME difficulty', value: 1 },
        { label: '2 - With MUCH difficulty', value: 2 },
        { label: '3 - UNABLE to do', value: 3 },
      ], 0),
      selectInput('haq_bed', 'Arising: Get in and out of bed', [
        { label: '0 - Without ANY difficulty', value: 0 },
        { label: '1 - With SOME difficulty', value: 1 },
        { label: '2 - With MUCH difficulty', value: 2 },
        { label: '3 - UNABLE to do', value: 3 },
      ], 0),
      yesNo('haq_c2_aid', 'Arising aids/help (built-up or special chair, or personal assistance)?'),
      selectInput('haq_cut', 'Eating: Cut your meat', [
        { label: '0 - Without ANY difficulty', value: 0 },
        { label: '1 - With SOME difficulty', value: 1 },
        { label: '2 - With MUCH difficulty', value: 2 },
        { label: '3 - UNABLE to do', value: 3 },
      ], 0),
      selectInput('haq_cup', 'Eating: Lift a full cup or glass to your mouth', [
        { label: '0 - Without ANY difficulty', value: 0 },
        { label: '1 - With SOME difficulty', value: 1 },
        { label: '2 - With MUCH difficulty', value: 2 },
        { label: '3 - UNABLE to do', value: 3 },
      ], 0),
      selectInput('haq_carton', 'Eating: Open a new milk carton', [
        { label: '0 - Without ANY difficulty', value: 0 },
        { label: '1 - With SOME difficulty', value: 1 },
        { label: '2 - With MUCH difficulty', value: 2 },
        { label: '3 - UNABLE to do', value: 3 },
      ], 0),
      yesNo('haq_c3_aid', 'Eating aids/help (built-up or special utensils, or personal assistance)?'),
      selectInput('haq_walk', 'Walking: Walk outdoors on flat ground', [
        { label: '0 - Without ANY difficulty', value: 0 },
        { label: '1 - With SOME difficulty', value: 1 },
        { label: '2 - With MUCH difficulty', value: 2 },
        { label: '3 - UNABLE to do', value: 3 },
      ], 0),
      selectInput('haq_steps', 'Walking: Climb up five steps', [
        { label: '0 - Without ANY difficulty', value: 0 },
        { label: '1 - With SOME difficulty', value: 1 },
        { label: '2 - With MUCH difficulty', value: 2 },
        { label: '3 - UNABLE to do', value: 3 },
      ], 0),
      yesNo('haq_c4_aid', 'Walking aids/help (cane, crutches, walker, or personal assistance)?'),
      selectInput('haq_wash', 'Hygiene: Wash and dry your entire body', [
        { label: '0 - Without ANY difficulty', value: 0 },
        { label: '1 - With SOME difficulty', value: 1 },
        { label: '2 - With MUCH difficulty', value: 2 },
        { label: '3 - UNABLE to do', value: 3 },
      ], 0),
      selectInput('haq_tub', 'Hygiene: Take a tub bath', [
        { label: '0 - Without ANY difficulty', value: 0 },
        { label: '1 - With SOME difficulty', value: 1 },
        { label: '2 - With MUCH difficulty', value: 2 },
        { label: '3 - UNABLE to do', value: 3 },
      ], 0),
      selectInput('haq_toilet', 'Hygiene: Get on and off the toilet', [
        { label: '0 - Without ANY difficulty', value: 0 },
        { label: '1 - With SOME difficulty', value: 1 },
        { label: '2 - With MUCH difficulty', value: 2 },
        { label: '3 - UNABLE to do', value: 3 },
      ], 0),
      yesNo('haq_c5_aid', 'Hygiene aids/help (raised toilet seat, bathtub seat, long-handled appliances, or personal assistance)?'),
      selectInput('haq_reach', 'Reach: Reach and get down a 5 lb object from just above your head', [
        { label: '0 - Without ANY difficulty', value: 0 },
        { label: '1 - With SOME difficulty', value: 1 },
        { label: '2 - With MUCH difficulty', value: 2 },
        { label: '3 - UNABLE to do', value: 3 },
      ], 0),
      selectInput('haq_bend', 'Reach: Bend down to pick up clothing from the floor', [
        { label: '0 - Without ANY difficulty', value: 0 },
        { label: '1 - With SOME difficulty', value: 1 },
        { label: '2 - With MUCH difficulty', value: 2 },
        { label: '3 - UNABLE to do', value: 3 },
      ], 0),
      yesNo('haq_c6_aid', 'Reach aids/help (long-handled appliances, or personal assistance)?'),
      selectInput('haq_cardoor', 'Grip: Open car doors', [
        { label: '0 - Without ANY difficulty', value: 0 },
        { label: '1 - With SOME difficulty', value: 1 },
        { label: '2 - With MUCH difficulty', value: 2 },
        { label: '3 - UNABLE to do', value: 3 },
      ], 0),
      selectInput('haq_jars', 'Grip: Open jars which have been previously opened', [
        { label: '0 - Without ANY difficulty', value: 0 },
        { label: '1 - With SOME difficulty', value: 1 },
        { label: '2 - With MUCH difficulty', value: 2 },
        { label: '3 - UNABLE to do', value: 3 },
      ], 0),
      selectInput('haq_faucets', 'Grip: Turn faucets on and off', [
        { label: '0 - Without ANY difficulty', value: 0 },
        { label: '1 - With SOME difficulty', value: 1 },
        { label: '2 - With MUCH difficulty', value: 2 },
        { label: '3 - UNABLE to do', value: 3 },
      ], 0),
      yesNo('haq_c7_aid', 'Grip aids/help (jar opener, or personal assistance)?'),
      selectInput('haq_errands', 'Activities: Run errands and shop', [
        { label: '0 - Without ANY difficulty', value: 0 },
        { label: '1 - With SOME difficulty', value: 1 },
        { label: '2 - With MUCH difficulty', value: 2 },
        { label: '3 - UNABLE to do', value: 3 },
      ], 0),
      selectInput('haq_car', 'Activities: Get in and out of a car', [
        { label: '0 - Without ANY difficulty', value: 0 },
        { label: '1 - With SOME difficulty', value: 1 },
        { label: '2 - With MUCH difficulty', value: 2 },
        { label: '3 - UNABLE to do', value: 3 },
      ], 0),
      selectInput('haq_chores', 'Activities: Do chores such as vacuuming or yardwork', [
        { label: '0 - Without ANY difficulty', value: 0 },
        { label: '1 - With SOME difficulty', value: 1 },
        { label: '2 - With MUCH difficulty', value: 2 },
        { label: '3 - UNABLE to do', value: 3 },
      ], 0),
      yesNo('haq_c8_aid', 'Activities aids/help (personal assistance with chores, shopping, or errands)?'),
      numberInput('total', 'Direct HAQ-DI total override (0–3)', {
        min: 0,
        max: 3,
        step: 0.125,
        exampleValue: 1,
        helpText: 'Used if Direct score override mode is selected. Enter the official 20-item HAQ-DI (mean of 8 category scores).',
      }),
    ],
    calculate(values) {
      const mode = String(values.entryMode ?? 'survey');
      let score: number;
      let catScores: number[] = [];

      const categoryScore = (items: number[], aid: boolean) => {
        const worst = Math.max(...items);
        return aid ? Math.max(worst, 2) : worst;
      };

      if (mode === 'direct' || (values.total !== undefined && values.entryMode === undefined && values.haq_dress === undefined && values.haq_c1 === undefined)) {
        score = round(num(values.total, 0), 3);
      } else if (values.haq_c1 !== undefined && values.haq_dress === undefined) {
        const c1 = bool(values.haq_c1_aid) ? Math.max(num(values.haq_c1, 0), 2) : num(values.haq_c1, 0);
        const c2 = bool(values.haq_c2_aid) ? Math.max(num(values.haq_c2, 0), 2) : num(values.haq_c2, 0);
        const c3 = bool(values.haq_c3_aid) ? Math.max(num(values.haq_c3, 0), 2) : num(values.haq_c3, 0);
        const c4 = bool(values.haq_c4_aid) ? Math.max(num(values.haq_c4, 0), 2) : num(values.haq_c4, 0);
        const c5 = bool(values.haq_c5_aid) ? Math.max(num(values.haq_c5, 0), 2) : num(values.haq_c5, 0);
        const c6 = bool(values.haq_c6_aid) ? Math.max(num(values.haq_c6, 0), 2) : num(values.haq_c6, 0);
        const c7 = bool(values.haq_c7_aid) ? Math.max(num(values.haq_c7, 0), 2) : num(values.haq_c7, 0);
        const c8 = bool(values.haq_c8_aid) ? Math.max(num(values.haq_c8, 0), 2) : num(values.haq_c8, 0);
        catScores = [c1, c2, c3, c4, c5, c6, c7, c8];
        score = round(catScores.reduce((a, b) => a + b, 0) / 8, 3);
      } else {
        const c1 = categoryScore([num(values.haq_dress, 0), num(values.haq_shampoo, 0)], bool(values.haq_c1_aid));
        const c2 = categoryScore([num(values.haq_chair, 0), num(values.haq_bed, 0)], bool(values.haq_c2_aid));
        const c3 = categoryScore([num(values.haq_cut, 0), num(values.haq_cup, 0), num(values.haq_carton, 0)], bool(values.haq_c3_aid));
        const c4 = categoryScore([num(values.haq_walk, 0), num(values.haq_steps, 0)], bool(values.haq_c4_aid));
        const c5 = categoryScore([num(values.haq_wash, 0), num(values.haq_tub, 0), num(values.haq_toilet, 0)], bool(values.haq_c5_aid));
        const c6 = categoryScore([num(values.haq_reach, 0), num(values.haq_bend, 0)], bool(values.haq_c6_aid));
        const c7 = categoryScore([num(values.haq_cardoor, 0), num(values.haq_jars, 0), num(values.haq_faucets, 0)], bool(values.haq_c7_aid));
        const c8 = categoryScore([num(values.haq_errands, 0), num(values.haq_car, 0), num(values.haq_chores, 0)], bool(values.haq_c8_aid));

        catScores = [c1, c2, c3, c4, c5, c6, c7, c8];
        const sum = catScores.reduce((a, b) => a + b, 0);
        score = round(sum / 8, 3);
      }

      const r = riskFromThresholds(score, [
        {
          max: 0.99,
          level: 'low',
          label: 'Mild disability (<1)',
          interpretation: `HAQ-DI ${score}: mild functional disability band (common educational cut). Continue function-focused care and treat underlying disease activity.`,
        },
        {
          max: 2,
          level: 'moderate',
          label: 'Moderate disability (1–2)',
          interpretation: `HAQ-DI ${score}: moderate disability. Optimize disease control, PT/OT, and adaptive strategies.`,
        },
        {
          max: 3,
          level: 'high',
          label: 'Severe disability (>2)',
          interpretation: `HAQ-DI ${score}: severe disability. Multidisciplinary support; reassess disease activity, damage, and social supports.`,
        },
      ]);
      const details: { label: string; value: string }[] = [
        { label: 'MCID (approx)', value: '~0.22–0.25 often cited in RA' },
        { label: 'Range', value: '0.00 (no disability) – 3.00 (severe)' },
      ];
      if (mode === 'survey' || catScores.length > 0) {
        details.unshift({
          label: 'Category scores (with aids)',
          value: catScores.join(', '),
        });
      }
      return {
        score,
        unit: '0–3',
        ...r,
        details,
      };
    },
    evidence: {
      summary:
        'Official HAQ-DI uses 20 items in 8 categories. Category score = maximum item in that category; aids/devices or personal assistance raise a category of 0 or 1 to 2; HAQ-DI is the mean of the 8 category scores (need ≥6 categories). Mild <1, moderate 1–2, severe >2 are common educational bands. This is not the 8-item MHAQ.',
      formula: 'HAQ-DI = mean of 8 category scores; category = max(items), then max(category, 2) if aid/help',
      validation: 'Fries et al. original HAQ; widely used PRO in rheumatology trials.',
      references: [
        {
          title: 'Measurement of patient outcome in arthritis',
          citation: 'Fries JF et al. Arthritis Rheum. 1980',
          year: 1980,
          pmid: '7362664',
          doi: '10.1002/art.1780230202',
        },
      ],
    },
    nextSteps: [
      { condition: 'HAQ-DI ≥1', actions: ['PT/OT referral', 'Treat active inflammatory disease', 'Assess work/ADL needs'] },
    ],
    pearls: [
      'Scoring rules for aids/devices matter — use of device or help automatically raises that category to ≥2 (does not lower a 3).',
      'Category score is the worst of 2–3 items, not a single combined activity rating (MHAQ-style 8-item forms are not interchangeable).',
      'HAQ is relatively insensitive to change at low disability levels (floor effects less of an issue than ceiling).',
    ],
  },

  // ─── 20. BASFI ─────────────────────────────────────────────────────────────
  {
    id: 'basfi',
    name: 'BASFI (Bath Ankylosing Spondylitis Functional Index)',
    shortName: 'BASFI',
    description: 'Scores and interprets the Bath Ankylosing Spondylitis Functional Index (0–10) across 10 functional activity items.',
    category: 'rheumatology',
    tags: ['basfi', 'ankylosing spondylitis', 'function', 'axspa'],
    whenToUse: 'When evaluating functional impairment and physical limitation in axial spondyloarthritis / ankylosing spondylitis.',
    whyUse: 'Standard function PRO in axSpA alongside BASDAI/ASDAS disease activity measures endorsed by ASAS.',
    isQuestionnaire: true,
    questionnaire: {
      modeInputId: 'entryMode',
      directModeValues: ['direct'],
      directInputIds: ['total'],
    },
    inputs: [
      selectInput('entryMode', 'Entry Mode', [
        { label: 'Interactive 10-item functional questionnaire (recommended)', value: 'survey' },
        { label: 'Direct BASFI mean override (0–10)', value: 'direct' },
      ], 'survey'),
      numberInput('basfi_q1', '1. Putting on socks or tights without help or aids', { min: 0, max: 10, step: 0.5, exampleValue: 4, helpText: '0 = easy, 10 = impossible' }),
      numberInput('basfi_q2', '2. Bending forward from waist to pick up pen from floor without aid', { min: 0, max: 10, step: 0.5, exampleValue: 4, helpText: '0 = easy, 10 = impossible' }),
      numberInput('basfi_q3', '3. Reaching up to a high shelf without help or aids', { min: 0, max: 10, step: 0.5, exampleValue: 3, helpText: '0 = easy, 10 = impossible' }),
      numberInput('basfi_q4', '4. Getting up out of armless dining room chair without using hands/help', { min: 0, max: 10, step: 0.5, exampleValue: 4, helpText: '0 = easy, 10 = impossible' }),
      numberInput('basfi_q5', '5. Getting up off the floor without help from lying on your back', { min: 0, max: 10, step: 0.5, exampleValue: 5, helpText: '0 = easy, 10 = impossible' }),
      numberInput('basfi_q6', '6. Standing unsupported for 10 minutes without discomfort', { min: 0, max: 10, step: 0.5, exampleValue: 4, helpText: '0 = easy, 10 = impossible' }),
      numberInput('basfi_q7', '7. Climbing 12–14 steps without using a handrail or walking aid', { min: 0, max: 10, step: 0.5, exampleValue: 3, helpText: '0 = easy, 10 = impossible' }),
      numberInput('basfi_q8', '8. Looking over your shoulder without turning your body', { min: 0, max: 10, step: 0.5, exampleValue: 5, helpText: '0 = easy, 10 = impossible' }),
      numberInput('basfi_q9', '9. Doing physically demanding activities (e.g. physio exercises, gardening, sports)', { min: 0, max: 10, step: 0.5, exampleValue: 5, helpText: '0 = easy, 10 = impossible' }),
      numberInput('basfi_q10', '10. Doing a full day\'s activities (at home or at work)', { min: 0, max: 10, step: 0.5, exampleValue: 4, helpText: '0 = easy, 10 = impossible' }),
      numberInput('total', 'Direct BASFI total (mean of 10 items)', {
        min: 0,
        max: 10,
        step: 0.1,
        exampleValue: 4,
        helpText: 'Used if Direct score override mode is selected. Mean 0–10.',
      }),
    ],
    calculate(values) {
      const mode = String(values.entryMode ?? 'survey');
      let score: number;

      if (mode === 'direct' || (values.total !== undefined && values.entryMode === undefined && values.basfi_q1 === undefined)) {
        score = round(num(values.total, 0), 1);
      } else {
        const sum =
          num(values.basfi_q1, 4) +
          num(values.basfi_q2, 4) +
          num(values.basfi_q3, 3) +
          num(values.basfi_q4, 4) +
          num(values.basfi_q5, 5) +
          num(values.basfi_q6, 4) +
          num(values.basfi_q7, 3) +
          num(values.basfi_q8, 5) +
          num(values.basfi_q9, 5) +
          num(values.basfi_q10, 4);
        score = round(sum / 10, 1);
      }

      const r = riskFromThresholds(score, [
        {
          max: 3.9,
          level: 'low',
          label: 'Milder functional impairment (<4)',
          interpretation: `BASFI ${score}: milder functional limitation educationally. Continue exercise/physio; interpret with activity scores.`,
        },
        {
          max: 6.9,
          level: 'moderate',
          label: 'Moderate impairment (4–7)',
          interpretation: `BASFI ${score}: moderate functional impairment. Optimize physio, disease activity control, and workplace adaptations.`,
        },
        {
          max: 10,
          level: 'high',
          label: 'Severe impairment (≥7)',
          interpretation: `BASFI ${score}: severe functional limitation. Multidisciplinary rehab and treat-to-target review.`,
        },
      ]);
      return {
        score,
        unit: '0–10',
        ...r,
        details: [
          { label: 'Score formula', value: 'Mean of 10 NRS/VAS items (0 easy – 10 impossible)' },
          { label: 'Direction', value: 'Higher = worse functional limitation' },
        ],
      };
    },
    evidence: {
      summary: 'BASFI is the mean of 10 function items (0–10). Higher scores indicate worse function in AS/axSpA.',
      formula: 'BASFI = (Sum of 10 items) / 10',
      validation: 'Calin et al. 1994; standard axSpA functional outcome.',
      references: [
        {
          title: 'A new approach to defining functional ability in ankylosing spondylitis: the Bath AS Functional Index',
          citation: 'Calin A et al. J Rheumatol. 1994',
          year: 1994,
          pmid: '7699629',
        },
      ],
    },
    nextSteps: [
      { condition: 'Elevated BASFI', actions: ['Physiotherapy / supervised exercise', 'Reassess ASDAS/BASDAI', 'OT / adaptive equipment'] },
    ],
    pearls: ['BASFI measures function, not acute inflammatory activity.', 'Pair with ASDAS for treat-to-target.'],
  },

  // ─── 21. MASES enthesitis ──────────────────────────────────────────────────
  {
    id: 'mases',
    name: 'MASES (Enthesitis Score)',
    shortName: 'MASES',
    description: 'Scores and interprets the Maastricht Ankylosing Spondylitis Enthesitis Score (0–13 sites).',
    category: 'rheumatology',
    tags: ['mases', 'enthesitis', 'axial spa', 'rheumatology'],
    whenToUse: 'Quantifying enthesitis burden in axSpA / AS clinical care or clinical trials.',
    whyUse: 'Validated 0–13 site count endorsed in SpA research; focuses primarily on axial plus Achilles insertions.',
    isQuestionnaire: true,
    questionnaire: {
      modeInputId: 'entryMode',
      directModeValues: ['direct'],
      directInputIds: ['total'],
    },
    inputs: [
      selectInput('entryMode', 'Entry Mode', [
        { label: 'Interactive 13-site examination (recommended)', value: 'survey' },
        { label: 'Direct tender site count override (0–13)', value: 'direct' },
      ], 'survey'),
      yesNo('mases_r1cc', 'Right 1st costochondral joint tenderness'),
      yesNo('mases_l1cc', 'Left 1st costochondral joint tenderness'),
      yesNo('mases_r7cc', 'Right 7th costochondral joint tenderness'),
      yesNo('mases_l7cc', 'Left 7th costochondral joint tenderness'),
      yesNo('mases_rasis', 'Right Anterior Superior Iliac Spine (ASIS) tenderness'),
      yesNo('mases_lasis', 'Left Anterior Superior Iliac Spine (ASIS) tenderness'),
      yesNo('mases_rpsis', 'Right Posterior Superior Iliac Spine (PSIS) tenderness'),
      yesNo('mases_lpsis', 'Left Posterior Superior Iliac Spine (PSIS) tenderness'),
      yesNo('mases_rcrest', 'Right Iliac Crest tenderness'),
      yesNo('mases_lcrest', 'Left Iliac Crest tenderness'),
      yesNo('mases_l5spin', '5th Lumbar (L5) spinous process tenderness'),
      yesNo('mases_rachilles', 'Right Achilles tendon insertion tenderness'),
      yesNo('mases_lachilles', 'Left Achilles tendon insertion tenderness'),
      numberInput('total', 'Direct MASES total (tender sites override)', {
        min: 0,
        max: 13,
        exampleValue: 2,
        helpText: 'Used if Direct score override mode is selected.',
      }),
    ],
    calculate(values) {
      const mode = String(values.entryMode ?? 'survey');
      let score: number;

      if (mode === 'direct' || (values.total !== undefined && values.entryMode === undefined && values.mases_r1cc === undefined)) {
        score = Math.round(num(values.total, 0));
      } else {
        const siteKeys = [
          'mases_r1cc', 'mases_l1cc', 'mases_r7cc', 'mases_l7cc',
          'mases_rasis', 'mases_lasis', 'mases_rpsis', 'mases_lpsis',
          'mases_rcrest', 'mases_lcrest', 'mases_l5spin',
          'mases_rachilles', 'mases_lachilles',
        ];
        score = siteKeys.reduce((acc, k) => acc + (bool(values[k]) ? 1 : 0), 0);
      }
      const clamped = Math.max(0, Math.min(13, score));
      const r = riskFromThresholds(clamped, [
        {
          max: 0,
          level: 'normal',
          label: 'No scored enthesitis (0)',
          interpretation: 'MASES 0: no tender sites on the 13-site index. Clinical enthesitis outside MASES sites may still exist.',
        },
        {
          max: 2,
          level: 'low',
          label: 'Low enthesitis burden (1–2)',
          interpretation: `MASES ${clamped}: low site count. Local measures and disease activity control; recheck if symptoms persist.`,
        },
        {
          max: 5,
          level: 'moderate',
          label: 'Moderate enthesitis (3–5)',
          interpretation: `MASES ${clamped}: moderate enthesitis burden — integrate with ASDAS and imaging when decisions hinge on enthesitis.`,
        },
        {
          max: 13,
          level: 'high',
          label: 'High enthesitis burden (≥6)',
          interpretation: `MASES ${clamped}: high enthesitis burden. Consider systemic therapy optimization; exclude fibromyalgia tender-point overlap clinically.`,
        },
      ]);
      return {
        score: clamped,
        unit: 'sites / 13',
        ...r,
        details: [
          { label: 'Tender sites', value: `${clamped} / 13 sites` },
          {
            label: 'Sites assessed',
            value: '1st CC (bilat), 7th CC (bilat), ASIS (bilat), PSIS (bilat), Iliac crests (bilat), L5 spinous, Achilles (bilat)',
          },
        ],
      };
    },
    evidence: {
      summary: 'MASES counts tenderness at 13 entheseal sites (0–13). Developed for AS enthesitis quantification.',
      formula: 'Sum of tender MASES sites (0–13)',
      validation: 'Heuft-Dorenbosch et al.; used in SpA RCTs as enthesitis endpoint.',
      references: [
        {
          title: 'Assessment of enthesitis in ankylosing spondylitis',
          citation: 'Heuft-Dorenbosch L et al. Ann Rheum Dis. 2003',
          year: 2003,
          pmid: '12525381',
          doi: '10.1136/ard.62.2.127',
        },
      ],
    },
    nextSteps: [
      { condition: 'MASES ≥3', actions: ['Correlate with ASDAS', 'NSAID / physio optimization', 'Advanced therapy review if refractory'] },
    ],
    pearls: [
      'SPARCC enthesitis index uses different sites — not interchangeable.',
      'Mechanical enthesopathy and FM can inflate scores.',
    ],
  },

  // ─── 22. Gout classification (ACR/EULAR simplified) ────────────────────────
  {
    id: 'gout-classification',
    name: 'ACR/EULAR Gout Classification (Simplified)',
    shortName: 'Gout Class.',
    description: 'Simplified entry + additive points helper for ACR/EULAR 2015 gout classification criteria.',
    category: 'rheumatology',
    tags: ['gout', 'classification', 'acr', 'eular', 'uric acid'],
    whenToUse: 'Educational classification support when crystal-proven gout is absent and clinical likelihood is being scored.',
    whyUse: '≥8 points classifies as gout (with entry criterion). Not a diagnostic substitute for synovial fluid microscopy when available.',
    inputs: [
      selectInput('entry', 'Entry criterion: ≥1 episode of swelling, pain, or tenderness in a peripheral joint/bursa?', [
        { label: 'Yes (required to classify)', value: 'yes' },
        { label: 'No — cannot classify', value: 'no' },
      ]),
      selectInput('msu', 'MSU crystals in symptomatic joint/bursa (or tophus)', [
        { label: 'Not positive / not done', value: 'no', points: 0 },
        { label: 'Yes — sufficient for classification', value: 'pos', points: 100 },
      ], 'no'),
      selectInput(
        'pattern',
        'Pattern of joint/bursa involvement (ever)',
        [
          {
            label: 'Other joint only / none of above',
            value: 0,
            description: 'Neither 1st MTP nor ankle/midfoot in a typical episode',
          },
          {
            label: 'Ankle or midfoot (not 1st MTP)',
            value: 1,
            description: 'Ankle or midfoot involved as part of a mono/oligoarticular episode; 1st MTP never involved',
          },
          {
            label: '1st MTP involvement',
            value: 2,
            description: '1st MTP involved ever in a typical episode (use this even if ankle/midfoot also involved)',
          },
        ],
        0,
        'Ever, as part of a mono- or oligoarticular episode. If 1st MTP was involved, use the 2-point row even if ankle/midfoot also involved.',
      ),
      selectInput(
        'charCount',
        'Characteristics of episode (erythema; can\'t bear touch/pressure; great difficulty walking) — count present',
        [
          { label: 'None', value: 0, description: 'None of the 3 episode features' },
          { label: 'One characteristic', value: 1, description: 'One of: erythema; can\'t bear touch/pressure; great difficulty walking/using the joint' },
          { label: 'Two characteristics', value: 2, description: 'Two of the 3 episode features' },
          { label: 'Three characteristics', value: 3, description: 'All 3: erythema + can\'t bear touch/pressure + great difficulty walking/using the joint' },
        ],
        undefined,
        'Count how many of the 3 features are present in the most typical episode: (1) erythema over the affected joint (patient-reported or physician-observed); (2) cannot bear touch or pressure; (3) great difficulty walking or inability to use the affected joint.',
      ),
      selectInput(
        'timeCourse',
        'Time course: ≥2 of (time to max pain <24h; resolution ≤14d; complete resolution between) — episodes',
        [
          { label: 'No typical episodes', value: 0, description: 'No episode with ≥2 typical time-course features' },
          { label: 'One typical episode', value: 1, description: 'A single episode with ≥2 of: time to max pain <24 h; resolution ≤14 d; complete resolution between attacks' },
          { label: 'Recurrent typical episodes', value: 2, description: 'Two or more typical episodes' },
        ],
        undefined,
        'A typical episode has ≥2 of: time to maximal pain <24 h; resolution of symptoms ≤14 days; complete resolution between symptomatic episodes.',
      ),
      selectInput(
        'tophus',
        'Clinical tophus (draining, chalky, or classic locations)',
        [
          { label: 'Absent', value: 0 },
          { label: 'Present', value: 4 },
        ],
        undefined,
        'Draining or chalk-like subcutaneous nodule under transparent skin, often with overlying vascularity, in typical locations: joints, ears, olecranon bursae, finger pads, tendons (e.g. Achilles).',
      ),
      selectInput(
        'sua',
        'Serum urate (ideally off urate-lowering Rx; highest value)',
        [
          { label: 'Not measured', value: 'not-measured', points: 0, description: 'No serum urate available — contributes 0 points' },
          { label: '<4 mg/dL (<0.24 mmol/L)', value: -4, description: 'Highest SUA <4 mg/dL — negative points' },
          { label: '4–<6 mg/dL (0.24–<0.36)', value: 0, description: 'Highest SUA 4 to <6 mg/dL' },
          { label: '6–<8 mg/dL (0.36–<0.48)', value: 2, description: 'Highest SUA 6 to <8 mg/dL' },
          { label: '8–<10 mg/dL (0.48–<0.60)', value: 3, description: 'Highest SUA 8 to <10 mg/dL' },
          { label: '≥10 mg/dL (≥0.60 mmol/L)', value: 4, description: 'Highest SUA ≥10 mg/dL' },
        ],
        'not-measured',
        'Use the highest serum urate, ideally off urate-lowering therapy. Choose Not measured when no SUA is available; it contributes 0 points. Urate can be normal during a flare — do not use a flare-only low value if a higher off-treatment value exists.',
      ),
      selectInput('synovial', 'Synovial fluid MSU microscopy by trained examiner (if performed)', [
        { label: 'Not done', value: 'not-done' },
        { label: 'Negative', value: 'negative' },
        { label: 'Positive (use MSU sufficient above)', value: 'positive' },
      ]),
      selectInput(
        'imaging',
        'Imaging: urate deposition (DECT/US double contour) in symptomatic region OR gouty erosion',
        [
          { label: 'Neither', value: 'neither' },
          {
            label: 'Urate deposition imaging positive',
            value: 'urate-deposition',
            description: 'US double-contour or DECT urate in a symptomatic (ever) joint/bursa',
          },
          {
            label: 'Gout-related erosion on X-ray',
            value: 'gout-erosion',
            description: 'Plain-film cortical break with sclerotic margin and overhanging edge; exclude DIP OA erosions',
          },
          {
            label: 'Both deposition + erosion',
            value: 'both',
            description: 'Both US/DECT urate deposition and typical gouty erosion (not DIP OA)',
          },
        ],
      ),
    ],
    calculate(values) {
      const patternPts = num(values.pattern, 0);
      const charPts = num(values.charCount, 0);
      const timePts = num(values.timeCourse, 0);
      const tophusPts = num(values.tophus, 0);
      const suaPts = values.sua === 'not-measured' ? 0 : num(values.sua, 0);
      const synovialPoints: Record<string, number> = { 'not-done': 0, negative: -2, positive: 0 };
      const imagingPoints: Record<string, number> = {
        neither: 0,
        'urate-deposition': 4,
        'gout-erosion': 4,
        both: 8,
      };
      const synovialPts = synovialPoints[String(values.synovial)] ?? num(values.synovial, 0);
      const imagingPts = imagingPoints[String(values.imaging)] ?? num(values.imaging, 0);
      const msuPositive = values.msu === 'pos';
      const synovialPositive = values.synovial === 'positive';
      const msuSufficient = msuPositive || synovialPositive;
      const additive =
        patternPts + charPts + timePts + tophusPts + suaPts + synovialPts + imagingPts;
      const domainDetails = (scored: boolean) => [
        { label: 'Joint pattern', value: scored ? `${patternPts} pt` : `${patternPts} pt (not scored — MSU sufficient)` },
        { label: 'Episode characteristics', value: scored ? `${charPts} pt` : `${charPts} pt (not scored — MSU sufficient)` },
        { label: 'Time course', value: scored ? `${timePts} pt` : `${timePts} pt (not scored — MSU sufficient)` },
        { label: 'Clinical tophus', value: scored ? `${tophusPts} pt` : `${tophusPts} pt (not scored — MSU sufficient)` },
        { label: 'Serum urate', value: scored ? `${suaPts} pt` : `${suaPts} pt (not scored — MSU sufficient)` },
        { label: 'Synovial microscopy', value: scored ? `${synovialPts} pt` : `${synovialPts} pt (not scored — MSU sufficient)` },
        { label: 'Imaging', value: scored ? `${imagingPts} pt` : `${imagingPts} pt (not scored — MSU sufficient)` },
        { label: 'Additive domain total', value: scored ? String(round(additive, 0)) : `${round(additive, 0)} (not required — MSU+)` },
      ];

      if (values.entry === 'no') {
        return {
          score: '—',
          label: 'Entry criterion not met',
          interpretation: 'ACR/EULAR classification requires at least one episode of peripheral joint/bursa swelling, pain, or tenderness.',
          riskLevel: 'info',
          details: [
            { label: 'Entry criterion', value: 'Not met' },
            ...domainDetails(false).map((d) =>
              d.label === 'Additive domain total'
                ? { label: d.label, value: `${round(additive, 0)} (not scored — no entry)` }
                : { label: d.label, value: d.value.replace('MSU sufficient', 'no entry') }
            ),
          ],
        };
      }
      if (msuSufficient) {
        return {
          score: 'MSU+',
          label: 'Classifies as gout (crystal proven)',
          interpretation:
            'Positive MSU crystals in a symptomatic joint/bursa (or tophus), including a positive trained-examiner synovial fluid result, is sufficient for classification as gout regardless of score.',
          riskLevel: 'high',
          details: [
            { label: 'Entry criterion', value: 'Met' },
            {
              label: 'Crystal evidence',
              value: [
                msuPositive ? 'MSU crystal field positive' : null,
                synovialPositive ? 'trained-examiner synovial microscopy positive' : null,
              ]
                .filter(Boolean)
                .join('; ')
                .concat(' — sufficient'),
            },
            ...domainDetails(false),
          ],
          recommendations: ['Acute therapy as indicated', 'Long-term urate-lowering plan', 'Lifestyle counseling'],
        };
      }
      const s = round(additive, 0);
      if (s >= 8) {
        return {
          score: s,
          unit: 'points',
          label: 'Classifies as gout (≥8)',
          interpretation: `Total ${s} points (≥8 threshold). Meets ACR/EULAR 2015 classification for gout (simplified educational entry). Clinical diagnosis still requires judgment.`,
          riskLevel: 'high',
          details: [
            { label: 'Entry criterion', value: 'Met' },
            { label: 'MSU crystals', value: 'Not positive / not sufficient alone' },
            { label: 'Threshold', value: '≥8 with entry criterion' },
            ...domainDetails(true),
          ],
          recommendations: ['Confirm clinically', 'Consider aspiration when safe/feasible', 'Address hyperuricemia long-term'],
        };
      }
      return {
        score: s,
        unit: 'points',
        label: 'Does not classify as gout (<8)',
        interpretation: `Total ${s} points (<8). Does not meet classification threshold. Consider alternative arthritis, repeat urate, imaging, or aspiration if still suspected.`,
        riskLevel: 'low',
        details: [
          { label: 'Entry criterion', value: 'Met' },
          { label: 'MSU crystals', value: 'Not positive / not sufficient alone' },
          { label: 'Points needed', value: `${8 - s} more to reach 8` },
          ...domainDetails(true),
        ],
      };
    },
    evidence: {
      summary:
        'ACR/EULAR 2015: entry episode required; MSU crystals sufficient; otherwise additive domains (joint pattern, episode features, time course, tophus, SUA, SF microscopy, imaging) with threshold ≥8.',
      formula: 'Sum of domain points (this tool is a condensed bedside helper)',
      validation: 'Neogi et al. 2015 classification criteria; intended for classification/research — not pure diagnosis.',
      references: [
        {
          title: '2015 Gout classification criteria (ACR/EULAR)',
          citation: 'Neogi T et al. Ann Rheum Dis / Arthritis Rheumatol. 2015',
          year: 2015,
          pmid: '26359487',
          doi: '10.1136/annrheumdis-2015-208237',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score ≥8 or MSU+', actions: ['Treat flare', 'Urate-lowering therapy plan when appropriate', 'Screen comorbidities'] },
      { condition: 'Score <8', actions: ['Synovial fluid analysis if possible', 'Consider CPPD/septic arthritis/other'] },
    ],
    pearls: [
      'Classification ≠ mandatory clinical diagnosis algorithm.',
      'Serum urate can be normal during flares — interpret carefully.',
    ],
  },

  // ─── 23. Kujala score ──────────────────────────────────────────────────────
  {
    id: 'kujala-score',
    name: 'Kujala Patellofemoral Score',
    shortName: 'Kujala',
    description: 'Scores and interprets the Kujala Anterior Knee Pain Scale (0–100) across 13 patellofemoral symptom and function items.',
    category: 'orthopedics',
    tags: ['kujala', 'patellofemoral', 'anterior knee pain', 'ortho'],
    whenToUse: 'When evaluating anterior knee pain, patellofemoral pain syndrome (PFPS), or patellar instability.',
    whyUse: 'Widely validated clinician- and patient-reported outcome measure specifically sensitive to patellofemoral disorders.',
    isQuestionnaire: true,
    questionnaire: {
      modeInputId: 'entryMode',
      directModeValues: ['direct'],
      directInputIds: ['total'],
    },
    inputs: [
      selectInput('entryMode', 'Entry Mode', [
        { label: 'Interactive 13-item assessment (recommended)', value: 'survey' },
        { label: 'Direct Kujala score override (0–100)', value: 'direct' },
      ], 'survey'),
      selectInput('kuj_limp', '1. Limp', [
        { label: '5 - None', value: 5 },
        { label: '3 - Slight or periodical', value: 3 },
        { label: '0 - Constant', value: 0 },
      ], 5),
      selectInput('kuj_support', '2. Support / Weight-bearing', [
        { label: '5 - Full support without pain', value: 5 },
        { label: '3 - Painful', value: 3 },
        { label: '0 - Unable to bear weight', value: 0 },
      ], 5),
      selectInput('kuj_walking', '3. Walking', [
        { label: '5 - Unlimited', value: 5 },
        { label: '3 - More than 2 km', value: 3 },
        { label: '2 - 1 to 2 km', value: 2 },
        { label: '0 - Unable to walk', value: 0 },
      ], 5),
      selectInput('kuj_stairs', '4. Stairs', [
        { label: '10 - No difficulty', value: 10 },
        { label: '8 - Slight pain when descending', value: 8 },
        { label: '5 - Pain both descending and ascending', value: 5 },
        { label: '0 - Unable to use stairs', value: 0 },
      ], 8),
      selectInput('kuj_squatting', '5. Squatting', [
        { label: '5 - No difficulty', value: 5 },
        { label: '4 - Repeated squatting painful', value: 4 },
        { label: '3 - Painful each time', value: 3 },
        { label: '2 - Possible with partial weight', value: 2 },
        { label: '0 - Unable to squat', value: 0 },
      ], 4),
      selectInput('kuj_running', '6. Running', [
        { label: '10 - No difficulty', value: 10 },
        { label: '8 - Pain after more than 2 km', value: 8 },
        { label: '6 - Slight pain from beginning', value: 6 },
        { label: '3 - Severe pain', value: 3 },
        { label: '0 - Unable to run', value: 0 },
      ], 8),
      selectInput('kuj_jumping', '7. Jumping', [
        { label: '10 - No difficulty', value: 10 },
        { label: '7 - Slight difficulty', value: 7 },
        { label: '2 - Constant pain', value: 2 },
        { label: '0 - Unable to jump', value: 0 },
      ], 7),
      selectInput('kuj_sitting', '8. Prolonged sitting with knees flexed ("movie-theater sign")', [
        { label: '10 - No difficulty', value: 10 },
        { label: '8 - Pain after exercise', value: 8 },
        { label: '6 - Constant pain', value: 6 },
        { label: '4 - Pain forces extension of legs', value: 4 },
        { label: '0 - Unable to sit with knees bent', value: 0 },
      ], 8),
      selectInput('kuj_pain', '9. Pain', [
        { label: '10 - None', value: 10 },
        { label: '8 - Slight and occasional', value: 8 },
        { label: '6 - Interferes with sleep', value: 6 },
        { label: '3 - Occasionally severe', value: 3 },
        { label: '0 - Constant and severe', value: 0 },
      ], 8),
      selectInput('kuj_swelling', '10. Swelling', [
        { label: '10 - None', value: 10 },
        { label: '8 - After severe exertion', value: 8 },
        { label: '6 - After daily activities', value: 6 },
        { label: '4 - Every evening', value: 4 },
        { label: '0 - Constant', value: 0 },
      ], 10),
      selectInput('kuj_subluxation', '11. Abnormal painful kneecap (patellar) movements (subluxations)', [
        { label: '10 - None', value: 10 },
        { label: '6 - Occasionally in sports activities', value: 6 },
        { label: '4 - Occasionally in daily activities', value: 4 },
        { label: '2 - At least one documented dislocation', value: 2 },
        { label: '0 - More than two dislocations', value: 0 },
      ], 10),
      selectInput('kuj_atrophy', '12. Atrophy of thigh', [
        { label: '5 - None', value: 5 },
        { label: '3 - Slight (1–2 cm difference)', value: 3 },
        { label: '0 - Severe (>2 cm difference)', value: 0 },
      ], 5),
      selectInput('kuj_flexion', '13. Flexion deficiency', [
        { label: '5 - None', value: 5 },
        { label: '3 - Slight (5–15° loss)', value: 3 },
        { label: '0 - Severe (>15° loss)', value: 0 },
      ], 5),
      numberInput('total', 'Direct Kujala total score override (0–100)', {
        min: 0,
        max: 100,
        exampleValue: 70,
        helpText: 'Used if Direct score override mode is selected.',
      }),
    ],
    calculate(values) {
      const mode = String(values.entryMode ?? 'survey');
      let score: number;

      if (mode === 'direct' || (values.total !== undefined && values.entryMode === undefined && values.kuj_limp === undefined)) {
        score = Math.round(num(values.total, 0));
      } else {
        score =
          num(values.kuj_limp, 5) +
          num(values.kuj_support, 5) +
          num(values.kuj_walking, 5) +
          num(values.kuj_stairs, 8) +
          num(values.kuj_squatting, 4) +
          num(values.kuj_running, 8) +
          num(values.kuj_jumping, 7) +
          num(values.kuj_sitting, 8) +
          num(values.kuj_pain, 8) +
          num(values.kuj_swelling, 10) +
          num(values.kuj_subluxation, 10) +
          num(values.kuj_atrophy, 5) +
          num(values.kuj_flexion, 5);
      }

      // Higher is better
      const r =
        score >= 90
          ? {
              riskLevel: 'normal' as const,
              label: 'Excellent function (≥90)',
              interpretation: `Kujala ${score}/100: excellent patellofemoral function band. Maintain activity progression as appropriate.`,
            }
          : score >= 80
            ? {
                riskLevel: 'low' as const,
                label: 'Good (80–89)',
                interpretation: `Kujala ${score}/100: good function with mild residual symptoms possible.`,
              }
            : score >= 60
              ? {
                  riskLevel: 'moderate' as const,
                  label: 'Fair (60–79)',
                  interpretation: `Kujala ${score}/100: fair — meaningful limitation; structured rehab and activity modification.`,
                }
              : {
                  riskLevel: 'high' as const,
                  label: 'Poor (<60)',
                  interpretation: `Kujala ${score}/100: poor function. Reassess diagnosis (PFPS, instability, cartilage), rehab quality, and surgical indications if refractory.`,
                };
      return {
        score,
        unit: '/100',
        ...r,
        details: [
          { label: 'Direction', value: 'Higher = better function (0–100 scale)' },
          { label: 'Items', value: '13 patellofemoral items' },
        ],
      };
    },
    evidence: {
      summary: 'Kujala AKPS: 0–100 score from 13 items; higher scores indicate better patellofemoral function.',
      formula: 'Sum of 13 weighted items (0–100)',
      validation: 'Kujala et al. 1993; validated in PF pain and patellar instability populations.',
      references: [
        {
          title: 'Scoring of patellofemoral disorders',
          citation: 'Kujala UM et al. Arthroscopy. 1993',
          year: 1993,
          pmid: '8461073',
          doi: '10.1016/s0749-8063(05)80366-4',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score <80', actions: ['Quad/hip strengthening program', 'Activity load management', 'Ortho referral if instability/locking'] },
    ],
    pearls: ['Bands above are educational — publications use continuous scores and MCIDs (~8–10 points often cited).'],
  },

  // ─── 24. Lysholm knee score ────────────────────────────────────────────────
  {
    id: 'lysholm-knee',
    name: 'Lysholm Knee Score',
    shortName: 'Lysholm',
    description: 'Scores and interprets the Lysholm knee score (0–100) across 8 symptom and functional domains.',
    category: 'orthopedics',
    tags: ['lysholm', 'knee', 'acl', 'ligament', 'ortho'],
    whenToUse: 'When evaluating knee ligament, meniscus, or cartilage injury and post-operative recovery.',
    whyUse: 'Classic knee-specific outcome measure for symptoms and function (especially ACL and meniscus injuries).',
    isQuestionnaire: true,
    questionnaire: {
      modeInputId: 'entryMode',
      directModeValues: ['direct'],
      directInputIds: ['total'],
    },
    inputs: [
      selectInput('entryMode', 'Entry Mode', [
        { label: 'Interactive 8-domain questionnaire (recommended)', value: 'survey' },
        { label: 'Direct Lysholm score override (0–100)', value: 'direct' },
      ], 'survey'),
      selectInput('lys_limp', '1. Limp', [
        { label: '5 - None', value: 5 },
        { label: '3 - Slight or periodical', value: 3 },
        { label: '0 - Severe and constant', value: 0 },
      ], 5),
      selectInput('lys_support', '2. Support / Walking aid', [
        { label: '5 - None', value: 5 },
        { label: '2 - Stick or crutch', value: 2 },
        { label: '0 - Weight-bearing impossible', value: 0 },
      ], 5),
      selectInput('lys_locking', '3. Locking', [
        { label: '15 - No locking and no catching sensations', value: 15 },
        { label: '10 - Catching sensations but no locking', value: 10 },
        { label: '6 - Locking occasionally', value: 6 },
        { label: '2 - Locking frequently', value: 2 },
        { label: '0 - Locked joint on examination', value: 0 },
      ], 15),
      selectInput('lys_instability', '4. Instability (giving way)', [
        { label: '25 - Never gives way', value: 25 },
        { label: '20 - Rarely during athletics or other severe exertion', value: 20 },
        { label: '15 - Frequently during athletics or severe exertion (unable to participate)', value: 15 },
        { label: '10 - Occasionally in daily activities', value: 10 },
        { label: '5 - Often in daily activities', value: 5 },
        { label: '0 - Every step', value: 0 },
      ], 20),
      selectInput('lys_pain', '5. Pain', [
        { label: '25 - None', value: 25 },
        { label: '20 - Inconstant and slight during severe exertion', value: 20 },
        { label: '15 - Marked during severe exertion', value: 15 },
        { label: '10 - Marked on or after walking more than 2 km', value: 10 },
        { label: '5 - Marked on or after walking less than 2 km', value: 5 },
        { label: '0 - Constant and severe', value: 0 },
      ], 20),
      selectInput('lys_swelling', '6. Swelling', [
        { label: '10 - None', value: 10 },
        { label: '6 - On severe exertion', value: 6 },
        { label: '2 - On ordinary exertion', value: 2 },
        { label: '0 - Constant', value: 0 },
      ], 6),
      selectInput('lys_stairs', '7. Stair climbing', [
        { label: '10 - No problems', value: 10 },
        { label: '6 - Slightly impaired', value: 6 },
        { label: '2 - One step at a time', value: 2 },
        { label: '0 - Impossible', value: 0 },
      ], 6),
      selectInput('lys_squatting', '8. Squatting', [
        { label: '5 - No problems', value: 5 },
        { label: '4 - Slightly impaired', value: 4 },
        { label: '2 - Not beyond 90 degrees', value: 2 },
        { label: '0 - Impossible', value: 0 },
      ], 4),
      numberInput('total', 'Direct Lysholm total override (0–100)', {
        min: 0,
        max: 100,
        exampleValue: 75,
        helpText: 'Used if Direct score override mode is selected.',
      }),
    ],
    calculate(values) {
      const mode = String(values.entryMode ?? 'survey');
      let score: number;

      if (mode === 'direct' || (values.total !== undefined && values.entryMode === undefined && values.lys_limp === undefined)) {
        score = Math.round(num(values.total, 0));
      } else {
        score =
          num(values.lys_limp, 5) +
          num(values.lys_support, 5) +
          num(values.lys_locking, 15) +
          num(values.lys_instability, 20) +
          num(values.lys_pain, 20) +
          num(values.lys_swelling, 6) +
          num(values.lys_stairs, 6) +
          num(values.lys_squatting, 4);
      }

      const r =
        score >= 95
          ? {
              riskLevel: 'normal' as const,
              label: 'Excellent (≥95)',
              interpretation: `Lysholm ${score}/100: excellent outcome band.`,
            }
          : score >= 84
            ? {
                riskLevel: 'low' as const,
                label: 'Good (84–94)',
                interpretation: `Lysholm ${score}/100: good outcome band with mild residual symptoms possible.`,
              }
            : score >= 65
              ? {
                  riskLevel: 'moderate' as const,
                  label: 'Fair (65–83)',
                  interpretation: `Lysholm ${score}/100: fair — ongoing functional limitation; optimize rehab and reassess instability/meniscal symptoms.`,
                }
              : {
                  riskLevel: 'high' as const,
                  label: 'Poor (<65)',
                  interpretation: `Lysholm ${score}/100: poor outcome band. Re-evaluate structural pathology, rehab adherence, and surgical options.`,
                };
      return {
        score,
        unit: '/100',
        ...r,
        details: [
          { label: 'Direction', value: 'Higher = better (0–100 scale)' },
          { label: 'Domains', value: 'Limp (5), Support (5), Locking (15), Instability (25), Pain (25), Swelling (10), Stairs (10), Squatting (5)' },
        ],
      };
    },
    evidence: {
      summary:
        'Lysholm score 0–100 (higher better). Common bands: excellent ≥95, good 84–94, fair 65–83, poor <65.',
      formula: 'Sum of 8 weighted domain scores (0–100)',
      validation: 'Lysholm & Gillquist 1982; extensively used in ACL and sports knee literature.',
      references: [
        {
          title: 'Evaluation of knee ligament surgery results with special emphasis on use of a scoring scale',
          citation: 'Lysholm J, Gillquist J. Am J Sports Med. 1982',
          year: 1982,
          pmid: '6896798',
          doi: '10.1177/036354658201000306',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score <84', actions: ['Targeted physio', 'Brace/activity modification', 'Imaging if mechanical symptoms'] },
    ],
    pearls: ['Often paired with Tegner activity level.', 'Patient-reported — effort and expectations influence scores.'],
  },

  // ─── 25. SCORTEN (SJS/TEN) ─────────────────────────────────────────────────
  {
    id: 'scorten',
    name: 'SCORTEN (SJS/TEN Severity)',
    shortName: 'SCORTEN',
    description: 'Severity-of-illness score for toxic epidermal necrolysis / SJS predicting hospital mortality.',
    category: 'dermatology',
    tags: ['scorten', 'sjs', 'ten', 'dermatology', 'burn', 'mortality'],
    whenToUse: 'On admission (ideally day 1 and day 3) for patients with SJS/TEN spectrum disease.',
    whyUse: 'Validated mortality predictor guiding intensity of care and counseling.',
    inputs: [
      yesNo('age', 'Age ≥40 years', 1, 'Age at scoring (typically day 1 of admission; re-score day 3).'),
      yesNo('malignancy', 'Presence of malignancy', 1, 'Any current malignancy (solid or hematologic), as in original SCORTEN.'),
      yesNo('hr', 'Heart rate ≥120 bpm', 1, 'Heart rate ≥120 bpm at the time of scoring (day 1 and day 3).'),
      yesNo(
        'bsa',
        'Detached BSA >10%',
        1,
        'Count detached epidermis only (blisters, erosions, Nikolsky-positive skin) — not isolated erythema. Estimate %BSA with Lund-Browder or Wallace rule of nines. Recalculate day 1 and day 3.',
      ),
      yesNo('bun', 'BUN >28 mg/dL (>10 mmol/L)', 1),
      yesNo('glucose', 'Glucose >252 mg/dL (>14 mmol/L)', 1),
      yesNo('bicarb', 'Bicarbonate <20 mEq/L', 1),
    ],
    calculate(values) {
      const score =
        (bool(values.age) ? 1 : 0) +
        (bool(values.malignancy) ? 1 : 0) +
        (bool(values.hr) ? 1 : 0) +
        (bool(values.bsa) ? 1 : 0) +
        (bool(values.bun) ? 1 : 0) +
        (bool(values.glucose) ? 1 : 0) +
        (bool(values.bicarb) ? 1 : 0);

      // Published approximate mortality by SCORTEN
      const mortTable: Record<number, string> = {
        0: '~3%',
        1: '~3%',
        2: '~12%',
        3: '~35%',
        4: '~58%',
        5: '≥90%',
        6: '≥90%',
        7: '≥90%',
      };
      const mort = mortTable[score] ?? '≥90%';
      const r = riskFromThresholds(score, [
        {
          max: 1,
          level: 'moderate',
          label: 'SCORTEN 0–1',
          interpretation: `SCORTEN ${score}: predicted mortality ~3%. Still requires specialized dermatology/burn-unit pathways and culprit-drug cessation.`,
        },
        {
          max: 2,
          level: 'high',
          label: 'SCORTEN 2',
          interpretation: `SCORTEN ${score}: predicted mortality ~12%. Escalate supportive care; consider burn/ICU-capable center.`,
        },
        {
          max: 3,
          level: 'high',
          label: 'SCORTEN 3',
          interpretation: `SCORTEN ${score}: predicted mortality ~35%. High-risk — ICU/burn center care, fluid/electrolyte/ocular/infection management.`,
        },
        {
          max: 7,
          level: 'critical',
          label: 'SCORTEN ≥4',
          interpretation: `SCORTEN ${score}: predicted mortality ${mort}. Critical illness — full intensive supportive care and specialist TEN management.`,
        },
      ]);
      return {
        score,
        unit: 'points',
        ...r,
        details: [
          { label: 'Predicted mortality (classic)', value: mort },
          { label: 'Max score', value: '7' },
        ],
        recommendations: [
          'Stop culprit drug(s)',
          'Supportive care: fluids, wound, ocular, infection surveillance',
          'Consult derm + burn/ICU early',
        ],
      };
    },
    evidence: {
      summary:
        'SCORTEN (0–7): age≥40, malignancy, HR≥120, BSA>10%, BUN>28 mg/dL, glucose>252 mg/dL, HCO₃<20. Mortality rises sharply with score.',
      formula: 'One point per positive criterion',
      validation: 'Bastuji-Garin et al. 2000; validated in SJS/TEN cohorts (performance varies by era/supportive care).',
      references: [
        {
          title: 'SCORTEN: a severity-of-illness score for toxic epidermal necrolysis',
          citation: 'Bastuji-Garin S et al. J Invest Dermatol. 2000',
          year: 2000,
          pmid: '10951229',
          doi: '10.1046/j.1523-1747.2000.00061.x',
        },
      ],
    },
    nextSteps: [
      { condition: 'Any SJS/TEN', actions: ['Drug causality assessment (ALDEN)', 'Transfer criteria to burn center', 'Ophtho consult'] },
      { condition: 'SCORTEN ≥2', actions: ['ICU-capable monitoring', 'Multidisciplinary TEN protocol'] },
    ],
    pearls: [
      'Recalculate on day 3 — score can change.',
      'BSA for SCORTEN is detached epidermis, not total erythema alone.',
    ],
  },
];
