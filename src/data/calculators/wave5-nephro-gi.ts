import type { Calculator } from '../../types/calculator';
import { num, bool, str, round, yesNo, selectInput, numberInput, riskFromThresholds } from '../../utils/helpers';

export const wave5NephroGiCalcs: Calculator[] = [
  // 1. CKD-EPI 2021 creatinine + cystatin C combined
  {
    id: 'egfr-cys-cr-combined',
    name: 'CKD-EPI 2021 Creatinine–Cystatin eGFR',
    shortName: 'eGFR Cr+Cys',
    description: 'Race-free CKD-EPI 2021 combined creatinine and cystatin C equation for estimated GFR.',
    category: 'nephrology',
    tags: ['egfr', 'ckd-epi', 'cystatin', 'creatinine', 'gfr', 'ckd'],
    whenToUse: 'Confirm eGFR when creatinine alone is unreliable, or when a more accurate estimate would change management.',
    whyUse: 'Combined Cr+CysC equation is more accurate than either marker alone across body composition extremes.',
    inputs: [
      numberInput('scr', 'Serum creatinine', { unit: 'mg/dL', min: 0.1, max: 20, step: 0.01, defaultValue: 1.0 }),
      numberInput('scys', 'Serum cystatin C', { unit: 'mg/L', min: 0.2, max: 10, step: 0.01, defaultValue: 1.0 }),
      numberInput('age', 'Age', { unit: 'years', min: 18, max: 110, defaultValue: 50 }),
      selectInput('sex', 'Sex', [
        { label: 'Female', value: 'F' },
        { label: 'Male', value: 'M' },
      ]),
    ],
    calculate(values) {
      const scr = num(values.scr, 1);
      const scys = num(values.scys, 1);
      const age = num(values.age, 50);
      const female = str(values.sex, 'F') === 'F';
      const kappa = female ? 0.7 : 0.9;
      const alpha = female ? -0.219 : -0.144;
      const scrRatio = scr / kappa;
      const cysRatio = scys / 0.8;
      let egfr =
        135 *
        Math.min(scrRatio, 1) ** alpha *
        Math.max(scrRatio, 1) ** -0.544 *
        Math.min(cysRatio, 1) ** -0.323 *
        Math.max(cysRatio, 1) ** -0.778 *
        0.9961 ** age;
      if (female) egfr *= 0.963;
      egfr = round(egfr, 0);
      let stage = 'G1';
      let riskLevel: 'normal' | 'low' | 'moderate' | 'high' | 'critical' = 'normal';
      if (egfr >= 90) {
        stage = 'G1';
        riskLevel = 'normal';
      } else if (egfr >= 60) {
        stage = 'G2';
        riskLevel = 'low';
      } else if (egfr >= 45) {
        stage = 'G3a';
        riskLevel = 'moderate';
      } else if (egfr >= 30) {
        stage = 'G3b';
        riskLevel = 'moderate';
      } else if (egfr >= 15) {
        stage = 'G4';
        riskLevel = 'high';
      } else {
        stage = 'G5';
        riskLevel = 'critical';
      }
      return {
        score: egfr,
        unit: 'mL/min/1.73 m²',
        label: `eGFR ${egfr} · ${stage}`,
        interpretation: `CKD-EPI 2021 Cr+Cys eGFR ${egfr} mL/min/1.73 m² (${stage}). Prefer over creatinine-only when muscle mass is extreme or confirmation is needed. Add ACR for full CGA staging.`,
        riskLevel,
        details: [
          { label: 'Equation', value: '2021 Cr+CysC, race-free' },
          { label: 'KDIGO G stage', value: stage },
          { label: 'Scr / Scys', value: `${scr} mg/dL / ${scys} mg/L` },
        ],
      };
    },
    evidence: {
      summary:
        '2021 CKD-EPI creatinine–cystatin C: 135 × min(Scr/κ,1)^α × max(Scr/κ,1)^−0.544 × min(Scys/0.8,1)^−0.323 × max(Scys/0.8,1)^−0.778 × 0.9961^Age × (0.963 if female). κ=0.7/0.9, α=−0.219/−0.144 (F/M).',
      formula:
        'eGFR = 135 × min(Scr/κ,1)^α × max(Scr/κ,1)^−0.544 × min(Scys/0.8,1)^−0.323 × max(Scys/0.8,1)^−0.778 × 0.9961^Age × (0.963 if ♀)',
      validation: 'Inker et al. NEJM 2021; combined marker equation reduces bias vs measured GFR compared with creatinine alone.',
      references: [
        {
          title: 'New Creatinine- and Cystatin C–Based Equations to Estimate GFR without Race',
          citation: 'Inker LA et al. N Engl J Med. 2021',
          year: 2021,
          pmid: '34554658',
          doi: '10.1056/NEJMoa2102953',
        },
      ],
    },
    nextSteps: [
      { condition: 'eGFR <60 or discordant with Cr-only', actions: ['Confirm chronicity', 'Urine ACR', 'Review drugs dosed by GFR', 'Nephrology if progressive or eGFR <30'] },
      { condition: 'Borderline for drug dosing', actions: ['Consider measured GFR if high-stakes decision', 'Recheck both markers'] },
    ],
    pearls: [
      'Not for rapidly changing GFR (AKI).',
      'Steroids, thyroid disease, and inflammation can alter cystatin C independent of GFR.',
    ],
  },

  // 2. KFRE 4-variable (educational)
  {
    id: 'kidney-failure-risk',
    name: 'Kidney Failure Risk Equation (KFRE 4-Variable)',
    shortName: 'KFRE',
    description: 'Tangri 4-variable kidney failure risk (age, sex, eGFR, ACR) — educational 2- and 5-year estimates.',
    category: 'nephrology',
    tags: ['kfre', 'ckd', 'prognosis', 'esrd', 'tangri', 'albuminuria'],
    whenToUse: 'Adults with CKD (typically eGFR <60) to estimate 2- and 5-year risk of treated kidney failure.',
    whyUse: 'Guides referral urgency, patient counseling, and planning; validated internationally with regional calibrations.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 18, max: 110, defaultValue: 65 }),
      selectInput('sex', 'Sex', [
        { label: 'Female', value: 'F' },
        { label: 'Male', value: 'M' },
      ]),
      numberInput('egfr', 'eGFR', { unit: 'mL/min/1.73 m²', min: 5, max: 90, defaultValue: 45 }),
      numberInput('acr', 'Urine ACR', { unit: 'mg/g', min: 0.1, max: 10000, step: 0.1, defaultValue: 30, helpText: 'Albumin/creatinine ratio; convert mg/mmol × 8.84 ≈ mg/g' }),
    ],
    calculate(values) {
      const age = num(values.age, 65);
      const male = str(values.sex, 'F') === 'M' ? 1 : 0;
      const egfr = Math.max(num(values.egfr, 45), 1);
      const acr = Math.max(num(values.acr, 30), 0.1);
      // Tangri 4-variable linear predictor (development centering)
      const lp =
        -0.2201 * (age / 10 - 7.036) +
        0.2467 * (male - 0.5642) +
        -0.5567 * (egfr / 5 - 7.222) +
        0.451 * (Math.log(acr) - 5.137);
      const expLp = Math.exp(lp);
      // North America–style baseline survivals commonly used in educational tools
      const risk2 = round((1 - Math.pow(0.975, expLp)) * 100, 1);
      const risk5 = round((1 - Math.pow(0.9365, expLp)) * 100, 1);
      const primary = risk5;
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
      let label = 'Lower 5-year kidney failure risk';
      let interpretation = '';
      if (primary >= 50) {
        riskLevel = 'critical';
        label = 'Very high 5-year risk';
        interpretation = `Estimated ~${risk2}% 2-year and ~${risk5}% 5-year risk of treated kidney failure (educational NA-style KFRE). Urgent nephrology planning, RRT education, and vascular access pathway as appropriate.`;
      } else if (primary >= 20) {
        riskLevel = 'high';
        label = 'High 5-year risk (≥20%)';
        interpretation = `Estimated ~${risk2}% 2-year and ~${risk5}% 5-year risk. Many systems use ≥3–5% 5-year (or ≥10–20% bands) to prioritize specialty care — confirm local referral thresholds.`;
      } else if (primary >= 5) {
        riskLevel = 'moderate';
        label = 'Intermediate 5-year risk';
        interpretation = `Estimated ~${risk2}% 2-year and ~${risk5}% 5-year risk. Optimize BP, RASi/SGLT2i as indicated, ACR control, and nephrology co-management.`;
      } else {
        riskLevel = 'low';
        label = 'Lower 5-year risk (<5%)';
        interpretation = `Estimated ~${risk2}% 2-year and ~${risk5}% 5-year risk. Continue CKD care, risk-factor control, and periodic re-estimation as eGFR/ACR change.`;
      }
      return {
        score: primary,
        unit: '% (5-year)',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: '2-year risk (est.)', value: `${risk2}%` },
          { label: '5-year risk (est.)', value: `${risk5}%` },
          { label: 'eGFR', value: `${egfr} mL/min/1.73 m²` },
          { label: 'ACR', value: `${acr} mg/g` },
          { label: 'Model', value: '4-variable Tangri (educational NA baseline)' },
        ],
        recommendations: [
          'Regional KFRE calibrations (North America vs non-NA) differ — use local tool when available for counseling.',
          'Not for AKI or rapidly changing labs.',
        ],
      };
    },
    evidence: {
      summary:
        '4-variable KFRE uses age, sex, eGFR, and ln(ACR). Linear predictor centered as in Tangri development; 2- and 5-year risks use educational baseline survivals (≈0.975 and 0.9365). Non-NA calibrations differ.',
      formula:
        'LP = −0.2201(age/10−7.036)+0.2467(male−0.5642)−0.5567(eGFR/5−7.222)+0.451(ln ACR−5.137); Risk = 1 − S₀^exp(LP)',
      validation: 'Tangri et al. JAMA 2011 / Kidney Int updates; widely validated. Educational implementation — prefer official regional calculator for formal counseling.',
      references: [
        {
          title: 'A predictive model for progression of chronic kidney disease to kidney failure',
          citation: 'Tangri N et al. JAMA. 2011',
          year: 2011,
          pmid: '21482743',
          doi: '10.1001/jama.2011.451',
        },
        {
          title: 'Multinational assessment of accuracy of equations for predicting risk of kidney failure',
          citation: 'Tangri N et al. JAMA. 2016',
          year: 2016,
          pmid: '26757465',
          doi: '10.1001/jama.2015.18202',
        },
      ],
    },
    nextSteps: [
      { condition: '5-year risk ≥3–5% (local policy)', actions: ['Nephrology referral', 'CKD education', 'CVD risk reduction', 'Medication review'] },
      { condition: '2-year risk >40% or eGFR-based KRT prep criteria', actions: ['RRT modality education', 'Anemia/CKD-MBD/acidosis management', 'Access planning if appropriate'] },
    ],
    pearls: [
      'ACR must be in mg/g (or convert carefully from mg/mmol).',
      'Risk falls as eGFR rises and ACR falls — recheck after optimization.',
    ],
  },

  // 3. Jelliffe CrCl
  {
    id: 'jelliffe',
    name: 'Jelliffe Creatinine Clearance',
    shortName: 'Jelliffe',
    description: 'Estimates creatinine clearance from age, sex, and serum creatinine (Jelliffe equation).',
    category: 'nephrology',
    tags: ['crcl', 'jelliffe', 'creatinine', 'drug dosing', 'gfr'],
    whenToUse: 'Historical or alternative CrCl estimate when Cockcroft–Gault is not preferred; educational comparison.',
    whyUse: 'Simple age/sex/Scr formula historically used for drug dosing; does not require weight.',
    inputs: [
      numberInput('scr', 'Serum creatinine', { unit: 'mg/dL', min: 0.1, max: 20, step: 0.01, defaultValue: 1.0 }),
      numberInput('age', 'Age', { unit: 'years', min: 18, max: 110, defaultValue: 50 }),
      selectInput('sex', 'Sex', [
        { label: 'Male', value: 'M' },
        { label: 'Female', value: 'F' },
      ]),
    ],
    calculate(values) {
      const scr = Math.max(num(values.scr, 1), 0.1);
      const age = num(values.age, 50);
      const female = str(values.sex, 'M') === 'F';
      // Jelliffe: (98 − 0.8×(age − 20)) / Scr ; ×0.9 if female (mL/min/1.73 m²)
      let crcl = (98 - 0.8 * (age - 20)) / scr;
      if (female) crcl *= 0.9;
      crcl = round(Math.max(crcl, 0), 1);
      const r = riskFromThresholds(crcl, [
        { max: 14, level: 'critical', label: 'Very low CrCl', interpretation: `Jelliffe CrCl ≈ ${crcl} mL/min/1.73 m² — kidney failure range if chronic; adjust renally cleared drugs carefully.` },
        { max: 29, level: 'high', label: 'Severely reduced', interpretation: `Jelliffe CrCl ≈ ${crcl} — severely reduced clearance; dose-adjust many renally cleared agents.` },
        { max: 59, level: 'moderate', label: 'Moderately reduced', interpretation: `Jelliffe CrCl ≈ ${crcl} — moderately reduced; review renally cleared medications.` },
        { max: 89, level: 'low', label: 'Mildly reduced', interpretation: `Jelliffe CrCl ≈ ${crcl} — mildly reduced estimate.` },
        { max: 300, level: 'normal', label: 'Normal / high range', interpretation: `Jelliffe CrCl ≈ ${crcl} mL/min/1.73 m².` },
      ]);
      return {
        score: crcl,
        unit: 'mL/min/1.73 m²',
        ...r,
        details: [
          { label: 'Formula', value: female ? '(98−0.8(age−20))/Scr × 0.9' : '(98−0.8(age−20))/Scr' },
          { label: 'Sex factor', value: female ? '0.9' : '1.0' },
        ],
      };
    },
    evidence: {
      summary: 'Jelliffe CrCl (mL/min/1.73 m²) = [98 − 0.8×(age − 20)] / Scr (mg/dL); multiply by 0.9 for females. Weight-independent estimate.',
      formula: 'CrCl = [98 − 0.8(age − 20)] / Scr × (0.9 if female)',
      validation: 'Historical equation; Cockcroft–Gault and CKD-EPI usually preferred for modern dosing and staging respectively.',
      references: [
        {
          title: 'Creatinine clearance: bedside estimate',
          citation: 'Jelliffe RW. Ann Intern Med. 1973',
          year: 1973,
          pmid: '4748282',
          doi: '10.7326/0003-4819-79-4-604',
        },
      ],
    },
    nextSteps: [
      { condition: 'Low CrCl', actions: ['Cross-check with CKD-EPI eGFR', 'Review renally cleared drugs', 'Avoid relying solely on historical equations for staging'] },
    ],
    pearls: [
      'Reports roughly BSA-normalized clearance — not identical to Cockcroft–Gault mL/min.',
      'Unreliable in extremes of muscle mass, pregnancy, and AKI.',
    ],
  },

  // 4. Wright CrCl
  {
    id: 'wright-crcl',
    name: 'Wright Creatinine Clearance / GFR Estimate',
    shortName: 'Wright',
    description: 'Wright equation estimating GFR/CrCl from age, BSA, sex, and serum creatinine (often cited in oncology dosing).',
    category: 'nephrology',
    tags: ['crcl', 'wright', 'gfr', 'bsa', 'oncology', 'carboplatin'],
    whenToUse: 'Alternative GFR estimate when BSA-based formulas are desired (e.g., historical oncology contexts).',
    whyUse: 'Incorporates BSA; sometimes compared with Cockcroft–Gault and measured GFR in chemo dosing literature.',
    inputs: [
      numberInput('scr', 'Serum creatinine', { unit: 'mg/dL', min: 0.1, max: 20, step: 0.01, defaultValue: 1.0 }),
      numberInput('age', 'Age', { unit: 'years', min: 18, max: 100, defaultValue: 55 }),
      numberInput('weight', 'Weight', { unit: 'kg', min: 30, max: 250, step: 0.1, defaultValue: 70 }),
      numberInput('height', 'Height', { unit: 'cm', min: 120, max: 230, defaultValue: 170 }),
      selectInput('sex', 'Sex', [
        { label: 'Male', value: 'M' },
        { label: 'Female', value: 'F' },
      ]),
    ],
    calculate(values) {
      const scr = Math.max(num(values.scr, 1), 0.1);
      const age = num(values.age, 55);
      const wt = num(values.weight, 70);
      const ht = num(values.height, 170);
      const female = str(values.sex, 'M') === 'F';
      const bsa = round(Math.sqrt((ht * wt) / 3600), 2); // Mosteller
      const scrUmol = scr * 88.4;
      // Wright (common form): {[6550 − 38.8×age] × BSA × sexFactor} / Scr(µmol/L)
      const sexFactor = female ? 0.85 : 1;
      const gfr = round(Math.max(((6550 - 38.8 * age) * bsa * sexFactor) / scrUmol, 0), 1);
      const r = riskFromThresholds(gfr, [
        { max: 29, level: 'high', label: 'Low estimated GFR', interpretation: `Wright estimate ≈ ${gfr} mL/min — markedly reduced; renally adjust drugs and consider measured GFR for high-stakes dosing.` },
        { max: 59, level: 'moderate', label: 'Moderately reduced', interpretation: `Wright estimate ≈ ${gfr} mL/min — moderately reduced clearance.` },
        { max: 89, level: 'low', label: 'Mildly reduced / LLN', interpretation: `Wright estimate ≈ ${gfr} mL/min.` },
        { max: 300, level: 'normal', label: 'Normal range estimate', interpretation: `Wright estimate ≈ ${gfr} mL/min.` },
      ]);
      return {
        score: gfr,
        unit: 'mL/min',
        ...r,
        details: [
          { label: 'BSA (Mosteller)', value: `${bsa} m²` },
          { label: 'Scr used', value: `${scr} mg/dL (${round(scrUmol, 0)} µmol/L)` },
          { label: 'Sex factor', value: String(sexFactor) },
        ],
      };
    },
    evidence: {
      summary:
        'Educational Wright form: GFR ≈ {[6550 − 38.8×age] × BSA × (0.85 if female)} / Scr(µmol/L). BSA via Mosteller. Variants exist (race coefficients in some oncology papers).',
      formula: 'GFR = [6550 − 38.8×age] × BSA × sexFactor / (Scr_mg/dL × 88.4)',
      validation: 'Used historically in chemotherapy GFR estimation literature; CKD-EPI preferred for staging; isotope GFR gold standard for precise dosing when needed.',
      references: [
        {
          title: 'Estimation of glomerular filtration rate in cancer patients',
          citation: 'Wright JG et al. Br J Cancer. 2001 (and related Wright formula literature)',
          year: 2001,
          pmid: '11207037',
          doi: '10.1054/bjoc.2000.1643',
        },
      ],
    },
    nextSteps: [
      { condition: 'Chemo dosing decisions', actions: ['Follow protocol-preferred GFR method', 'Consider measured GFR if borderline AUC-critical drugs', 'Do not mix formulas across cycles carelessly'] },
    ],
    pearls: [
      'Result is mL/min (not /1.73 m²).',
      'Low muscle mass underestimates true GFR when Scr is low — interpret cautiously.',
    ],
  },

  // 5. 24h protein excretion
  {
    id: 'protein-24h',
    name: '24-Hour Urine Protein Excretion',
    shortName: '24h Protein',
    description: 'Calculates or interprets 24-hour urinary protein excretion from collection or concentration × volume.',
    category: 'nephrology',
    tags: ['proteinuria', '24h urine', 'nephrotic', 'ckd'],
    whenToUse: 'Quantify proteinuria when a timed collection is available, or convert concentration × volume to g/day.',
    whyUse: 'Reference standard for daily protein excretion; frames nephrotic-range vs sub-nephrotic disease.',
    inputs: [
      selectInput('mode', 'Input mode', [
        { label: 'Concentration × 24h volume', value: 'calc' },
        { label: 'Already measured total (g/day)', value: 'total' },
      ]),
      numberInput('conc', 'Urine protein concentration', {
        unit: 'mg/dL',
        min: 0,
        max: 5000,
        step: 1,
        defaultValue: 100,
        helpText: 'Used if mode = concentration × volume',
      }),
      numberInput('volume', '24-hour urine volume', {
        unit: 'mL',
        min: 100,
        max: 10000,
        defaultValue: 1500,
        helpText: 'Used if mode = concentration × volume',
      }),
      numberInput('totalG', 'Total protein (if already measured)', {
        unit: 'g/day',
        min: 0,
        max: 40,
        step: 0.01,
        defaultValue: 1.5,
        helpText: 'Used if mode = total g/day',
      }),
    ],
    calculate(values) {
      const mode = str(values.mode, 'calc');
      let gDay: number;
      if (mode === 'total') {
        gDay = num(values.totalG, 1.5);
      } else {
        const conc = num(values.conc, 100); // mg/dL
        const vol = num(values.volume, 1500); // mL
        // mg/day = conc(mg/dL) × vol(mL) / 100; g/day = mg/day / 1000
        gDay = (conc * vol) / 100 / 1000;
      }
      gDay = round(gDay, 2);
      let label = 'Normal / minimal';
      let riskLevel: 'normal' | 'low' | 'moderate' | 'high' | 'critical' = 'normal';
      let interpretation = '';
      if (gDay >= 3.5) {
        label = 'Nephrotic-range proteinuria';
        riskLevel = 'high';
        interpretation = `${gDay} g/day — nephrotic-range (≥3.5 g/day). Evaluate for nephrotic syndrome (hypoalbuminemia, edema, hyperlipidemia) and primary vs secondary causes.`;
      } else if (gDay >= 1) {
        label = 'Significant proteinuria';
        riskLevel = 'moderate';
        interpretation = `${gDay} g/day — significant proteinuria. Quantify albuminuria, assess CKD stage, and seek cause (glomerular vs other).`;
      } else if (gDay >= 0.15) {
        label = 'Mildly elevated';
        riskLevel = 'low';
        interpretation = `${gDay} g/day — above typical normal (<0.15 g/day). Correlate with ACR/PCR, hematuria, and eGFR.`;
      } else {
        label = 'Within common normal range';
        riskLevel = 'normal';
        interpretation = `${gDay} g/day — within common normal daily protein excretion (<~150 mg/day). Incomplete collection can falsely lower results.`;
      }
      return {
        score: gDay,
        unit: 'g/day',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Mode', value: mode === 'total' ? 'Entered total' : 'Concentration × volume' },
          { label: 'Nephrotic threshold', value: '≥3.5 g/day' },
        ],
      };
    },
    evidence: {
      summary: '24h protein (g/day) = protein (mg/dL) × volume (mL) / 100_000. Nephrotic-range typically ≥3.5 g/day. Completeness of collection is critical.',
      formula: 'Protein_g/day = (mg/dL × mL_24h) / 100000',
      validation: 'Timed collection remains reference for daily excretion; spot UPCR often substitutes when collection is impractical.',
      references: [
        {
          title: 'KDIGO 2021 Clinical Practice Guideline for the Management of Glomerular Diseases',
          citation: 'Kidney Int. 2021 (proteinuria assessment context)',
          year: 2021,
          pmid: '34556256',
          doi: '10.1016/j.kint.2021.05.021',
          url: 'https://kdigo.org/guidelines/gd/',
        },
      ],
    },
    nextSteps: [
      { condition: 'Nephrotic-range', actions: ['Serum albumin, lipids', 'UPCR/ACR confirmation', 'Serologies / biopsy planning per context', 'Edema and thrombosis risk management'] },
      { condition: 'Incomplete collection suspected', actions: ['Check 24h creatinine excretion vs expected', 'Use spot UPCR'] },
    ],
    pearls: [
      'Orthostatic proteinuria and heavy exercise can elevate excretion transiently.',
      'Dipstick is concentration-dependent — not a substitute for quantification.',
    ],
  },

  // 6. UPCR
  {
    id: 'pcr-protein-creatinine',
    name: 'Urine Protein–Creatinine Ratio (UPCR)',
    shortName: 'UPCR',
    description: 'Calculates UPCR from spot urine protein and creatinine and interprets nephrotic vs sub-nephrotic range.',
    category: 'nephrology',
    tags: ['upcr', 'proteinuria', 'nephrotic', 'spot urine', 'pcr'],
    whenToUse: 'Spot quantification of proteinuria when 24h collection is impractical.',
    whyUse: 'UPCR approximates daily protein excretion (g/day ≈ ratio in g/g) for monitoring and nephrotic-range classification.',
    inputs: [
      numberInput('uprot', 'Urine protein', { unit: 'mg/dL', min: 0, max: 5000, step: 1, defaultValue: 100 }),
      numberInput('ucr', 'Urine creatinine', { unit: 'mg/dL', min: 1, max: 500, step: 1, defaultValue: 100 }),
    ],
    calculate(values) {
      const uprot = num(values.uprot, 100);
      const ucr = Math.max(num(values.ucr, 100), 0.1);
      const ratioMgG = round((uprot / ucr) * 1000, 0); // mg protein / g creatinine
      const ratioGG = round(uprot / ucr, 2); // g/g (approx g/day)
      let label = 'Normal / minimal';
      let riskLevel: 'normal' | 'low' | 'moderate' | 'high' = 'normal';
      let interpretation = '';
      if (ratioGG >= 3.5) {
        label = 'Nephrotic-range UPCR';
        riskLevel = 'high';
        interpretation = `UPCR ${ratioGG} g/g (≈${ratioMgG} mg/g) — nephrotic-range (≥3.5 g/g). Evaluate nephrotic syndrome and glomerular disease.`;
      } else if (ratioGG >= 1) {
        label = 'Significant proteinuria';
        riskLevel = 'moderate';
        interpretation = `UPCR ${ratioGG} g/g — significant proteinuria. Correlate with ACR (if albumin-predominant), eGFR, and clinical syndrome.`;
      } else if (ratioGG >= 0.2) {
        label = 'Mild–moderate elevation';
        riskLevel = 'low';
        interpretation = `UPCR ${ratioGG} g/g — elevated above common normal (~<0.15–0.2 g/g). Confirm on repeat; prefer ACR for CKD staging albuminuria.`;
      } else {
        label = 'Within common normal range';
        riskLevel = 'normal';
        interpretation = `UPCR ${ratioGG} g/g — within common normal limits. ACR is preferred for detecting lower-level albuminuria.`;
      }
      return {
        score: ratioGG,
        unit: 'g/g',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'UPCR', value: `${ratioGG} g/g` },
          { label: 'UPCR', value: `${ratioMgG} mg/g` },
          { label: 'Approx. daily protein', value: `≈ ${ratioGG} g/day (rule of thumb)` },
        ],
      };
    },
    evidence: {
      summary: 'UPCR (g/g) = urine protein (mg/dL) / urine creatinine (mg/dL). Roughly estimates g protein/day. Nephrotic-range often ≥3.5 g/g.',
      formula: 'UPCR (g/g) = Uprotein_mg/dL ÷ UCr_mg/dL',
      validation: 'Good correlation with 24h protein in many settings; first-morning samples reduce variability.',
      references: [
        {
          title: 'Use of single voided urine samples to estimate quantitative proteinuria',
          citation: 'Ginsberg JM et al. N Engl J Med. 1983',
          year: 1983,
          pmid: '6656849',
          doi: '10.1056/NEJM198312223092503',
        },
      ],
    },
    nextSteps: [
      { condition: 'UPCR ≥3.5 g/g', actions: ['Assess albumin, edema, lipids', 'Nephrology referral', 'Consider 24h collection if discordance'] },
      { condition: 'Elevated but sub-nephrotic', actions: ['Check urine ACR', 'BP/RASi optimization', 'Search for CKD cause'] },
    ],
    pearls: [
      'Very dilute or concentrated urine increases noise — creatinine in denominator adjusts for concentration.',
      'Tubular proteinuria and overflow (light chains) may elevate UPCR more than ACR.',
    ],
  },

  // 7. UACR A1–A3
  {
    id: 'acr-albumin',
    name: 'Urine Albumin–Creatinine Ratio (UACR) Categories',
    shortName: 'UACR',
    description: 'Computes UACR and assigns KDIGO albuminuria categories A1–A3.',
    category: 'nephrology',
    tags: ['uacr', 'acr', 'albuminuria', 'kdigo', 'a1', 'a2', 'a3', 'ckd'],
    whenToUse: 'CKD staging (CGA), diabetes screening for albuminuria, and cardiovascular/CKD risk stratification.',
    whyUse: 'Albuminuria category strongly predicts CKD progression and CV events independent of eGFR.',
    inputs: [
      numberInput('ualb', 'Urine albumin', { unit: 'mg/dL', min: 0, max: 2000, step: 0.1, defaultValue: 3 }),
      numberInput('ucr', 'Urine creatinine', { unit: 'mg/dL', min: 1, max: 500, step: 1, defaultValue: 100 }),
      selectInput('sex', 'Sex (optional microalbumin cutoffs context)', [
        { label: 'Not specified', value: 'U' },
        { label: 'Female', value: 'F' },
        { label: 'Male', value: 'M' },
      ]),
    ],
    calculate(values) {
      const ualb = num(values.ualb, 3);
      const ucr = Math.max(num(values.ucr, 100), 0.1);
      const acr = round((ualb / ucr) * 1000, 1); // mg/g
      let cat = 'A1';
      let label = 'A1 — Normal to mildly increased';
      let riskLevel: 'normal' | 'low' | 'moderate' | 'high' = 'normal';
      let interpretation = '';
      if (acr > 300) {
        cat = 'A3';
        label = 'A3 — Severely increased';
        riskLevel = 'high';
        interpretation = `UACR ${acr} mg/g — KDIGO A3 (>300 mg/g). High risk of CKD progression; optimize RASi/SGLT2i as indicated, BP, and nephrology co-management.`;
      } else if (acr >= 30) {
        cat = 'A2';
        label = 'A2 — Moderately increased';
        riskLevel = 'moderate';
        interpretation = `UACR ${acr} mg/g — KDIGO A2 (30–300 mg/g). Confirm on repeat (transient rises with fever/exercise); treat risk factors and consider kidney-protective therapy.`;
      } else {
        cat = 'A1';
        label = 'A1 — Normal to mildly increased';
        riskLevel = 'normal';
        interpretation = `UACR ${acr} mg/g — KDIGO A1 (<30 mg/g). Continue screening per diabetes/CKD guidelines; sex-specific thresholds sometimes used historically for “microalbuminuria.”`;
      }
      return {
        score: acr,
        unit: 'mg/g',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'KDIGO category', value: cat },
          { label: 'A1 / A2 / A3', value: '<30 / 30–300 / >300 mg/g' },
          { label: 'Approx. mg/mmol', value: `${round(acr / 8.84, 2)} (÷8.84)` },
        ],
      };
    },
    evidence: {
      summary: 'UACR (mg/g) = (urine albumin mg/dL ÷ urine creatinine mg/dL) × 1000. KDIGO: A1 <30, A2 30–300, A3 >300 mg/g.',
      formula: 'UACR_mg/g = (Ualb_mg/dL / UCr_mg/dL) × 1000',
      validation: 'Core of KDIGO CGA staging; first-void morning samples preferred; confirm persistent albuminuria.',
      references: [
        {
          title: 'KDIGO 2012 / 2024 CKD evaluation and management (albuminuria categories)',
          citation: 'Kidney Disease: Improving Global Outcomes CKD guidelines',
          year: 2024,
          url: 'https://kdigo.org/guidelines/ckd-evaluation-and-management/',
        },
      ],
    },
    nextSteps: [
      { condition: 'A2–A3', actions: ['Repeat to confirm persistence', 'BP target per guideline', 'RASi if indicated', 'SGLT2i / ns-MRA per indication', 'eGFR staging'] },
      { condition: 'A1 with diabetes', actions: ['Annual rescreen', 'Glycemic and BP control'] },
    ],
    pearls: [
      'mg/mmol × 8.84 ≈ mg/g.',
      'Exercise, infection, fever, and CHF can transiently raise ACR.',
    ],
  },

  // 8. Spot → 24h Na (Kawasaki-style educational)
  {
    id: 'sodium-excretion',
    name: 'Estimated 24-Hour Urine Sodium (Spot / Kawasaki-Style)',
    shortName: '24h Na Est.',
    description: 'Estimates 24-hour urinary sodium excretion from a spot urine Na/Cr using predicted creatinine excretion (Kawasaki-style educational).',
    category: 'nephrology',
    tags: ['sodium', 'urine', 'dietary salt', 'kawasaki', 'hypertension'],
    whenToUse: 'Estimate daily sodium excretion / dietary salt when full 24h collection is unavailable.',
    whyUse: 'Spot estimates support HTN and edema counseling; 24h collection remains more accurate when feasible.',
    inputs: [
      numberInput('una', 'Spot urine sodium', { unit: 'mEq/L', min: 1, max: 300, defaultValue: 80 }),
      numberInput('ucr', 'Spot urine creatinine', { unit: 'mg/dL', min: 1, max: 400, defaultValue: 100 }),
      numberInput('age', 'Age', { unit: 'years', min: 18, max: 100, defaultValue: 50 }),
      numberInput('weight', 'Weight', { unit: 'kg', min: 30, max: 200, step: 0.1, defaultValue: 70 }),
      numberInput('height', 'Height', { unit: 'cm', min: 120, max: 230, defaultValue: 170 }),
      selectInput('sex', 'Sex', [
        { label: 'Male', value: 'M' },
        { label: 'Female', value: 'F' },
      ]),
    ],
    calculate(values) {
      const una = num(values.una, 80);
      const ucr = Math.max(num(values.ucr, 100), 0.1);
      const age = num(values.age, 50);
      const wt = num(values.weight, 70);
      const ht = num(values.height, 170);
      const male = str(values.sex, 'M') === 'M';
      // Predicted 24h Cr excretion (mg/day) — Kawasaki PRCr
      const prCr = male
        ? -2.04 * age + 14.89 * wt + 16.14 * ht - 2244.45
        : -2.04 * age + 14.89 * wt + 16.14 * ht - 2098.82;
      const prCrUse = Math.max(prCr, 100);
      // Kawasaki XNa: UNa (mmol/L) / (UCr mg/dL × 10) × PRCr (mg/day)
      // The ×10 converts creatinine from mg/dL to mg/L so units cancel with PRCr.
      const xNa = (una / (ucr * 10)) * prCrUse;
      // Kawasaki: estimated 24h Na (mEq/day) = 16.3 × √XNa
      const na24 = round(16.3 * Math.sqrt(Math.max(xNa, 0)), 0);
      const saltG = round((na24 * 58.5) / 1000, 1); // NaCl grams approx
      let label = 'Moderate estimated Na excretion';
      let riskLevel: 'low' | 'moderate' | 'high' | 'info' = 'info';
      let interpretation = '';
      if (na24 >= 200) {
        label = 'High estimated Na excretion';
        riskLevel = 'high';
        interpretation = `≈${na24} mEq Na/day (~${saltG} g NaCl/day) — high salt intake pattern. For HTN/CKD/HF, counsel toward <2 g Na/day (~5 g salt) dietary targets as appropriate.`;
      } else if (na24 >= 100) {
        label = 'Moderate estimated Na excretion';
        riskLevel = 'moderate';
        interpretation = `≈${na24} mEq Na/day (~${saltG} g NaCl/day) — moderate range. Spot estimates have wide error; confirm with 24h urine if decisions hinge on value.`;
      } else {
        label = 'Lower estimated Na excretion';
        riskLevel = 'low';
        interpretation = `≈${na24} mEq Na/day (~${saltG} g NaCl/day) — lower estimated excretion. Consider low intake, extrarenal losses, or estimation error.`;
      }
      return {
        score: na24,
        unit: 'mEq/day',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Est. 24h Na', value: `${na24} mEq/day` },
          { label: 'Approx. NaCl', value: `${saltG} g/day` },
          { label: 'Predicted 24h Cr', value: `${round(prCrUse, 0)} mg/day` },
          { label: 'Method', value: 'Kawasaki-style educational' },
        ],
      };
    },
    evidence: {
      summary:
        'Kawasaki-style: PRCr from age/weight/height/sex; XNa = (UNa mEq/L) / (UCr mg/dL × 10) × PRCr; 24h Na ≈ 16.3×√XNa. The ×10 converts Cr mg/dL→mg/L. Educational estimate — not a substitute for timed collection.',
      formula: '24h Na ≈ 16.3 × √[(UNa / (UCr×10)) × PRCr]',
      validation: 'Spot formulas (Kawasaki, Tanaka, INTERSALT, Nerbass) show population utility but individual-level error is substantial.',
      references: [
        {
          title: 'A simple method for estimating 24 h urinary sodium and potassium excretion from second morning voiding urine specimen',
          citation: 'Kawasaki T et al. Clin Exp Pharmacol Physiol. 1993',
          year: 1993,
          pmid: '8432042',
          doi: '10.1111/j.1440-1681.1993.tb01496.x',
        },
      ],
    },
    nextSteps: [
      { condition: 'High estimated Na + HTN/CKD/HF', actions: ['Dietary sodium reduction counseling', 'Dietitian referral', 'Review hidden sodium sources'] },
      { condition: 'Need accurate balance', actions: ['Obtain complete 24h urine Na', 'Assess volume status clinically'] },
    ],
    pearls: [
      'Diuretics and large day-to-day diet swings limit single-spot accuracy.',
      '1 g sodium ≈ 43 mEq; 1 g NaCl ≈ 17 mEq Na.',
    ],
  },

  // 9. Tonicity / effective osmolality
  {
    id: 'tonicity',
    name: 'Effective Osmolality (Tonicity)',
    shortName: 'Tonicity',
    description: 'Calculates effective osmolality (tonicity) as 2×Na + glucose/18; excludes urea.',
    category: 'nephrology',
    tags: ['tonicity', 'osmolality', 'sodium', 'glucose', 'hyponatremia', 'hypernatremia'],
    whenToUse: 'Hyponatremia workup and hypertonic states — assess tonicity that drives water shifts across cell membranes.',
    whyUse: 'Urea is an ineffective osmole; tonicity (not total osm) determines cellular hydration.',
    inputs: [
      numberInput('na', 'Serum sodium', { unit: 'mEq/L', min: 90, max: 190, step: 1, defaultValue: 138 }),
      numberInput('glucose', 'Serum glucose', { unit: 'mg/dL', min: 20, max: 2000, defaultValue: 100 }),
    ],
    calculate(values) {
      const na = num(values.na, 138);
      const glu = num(values.glucose, 100);
      const ton = round(2 * na + glu / 18, 1);
      let label = 'Normal tonicity range';
      let riskLevel: 'normal' | 'low' | 'moderate' | 'high' | 'critical' = 'normal';
      let interpretation = '';
      if (ton < 275) {
        label = 'Hypotonic';
        riskLevel = ton < 260 ? 'high' : 'moderate';
        interpretation = `Effective osm ${ton} mOsm/kg — hypotonic. If hyponatremia is present, this supports true hypotonic hyponatremia (next: volume status, Uosm, UNa).`;
      } else if (ton > 295) {
        label = 'Hypertonic';
        riskLevel = ton > 320 ? 'high' : 'moderate';
        interpretation = `Effective osm ${ton} mOsm/kg — hypertonic. Consider hyperglycemia, mannitol/other effective osmoles, or hypernatremia. Correct Na for glucose when relevant.`;
      } else {
        label = 'Isotonic range (approx.)';
        riskLevel = 'normal';
        interpretation = `Effective osm ${ton} mOsm/kg — roughly isotonic (lab ranges vary ~275–295). Isotonic hyponatremia suggests pseudohyponatremia or isotonic infusions.`;
      }
      return {
        score: ton,
        unit: 'mOsm/kg',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Formula', value: '2×Na + glucose/18' },
          { label: 'Na', value: `${na} mEq/L` },
          { label: 'Glucose', value: `${glu} mg/dL` },
          { label: 'Urea', value: 'Excluded (ineffective osmole)' },
        ],
      };
    },
    evidence: {
      summary: 'Tonicity (effective osmolality) ≈ 2×Na (mEq/L) + glucose (mg/dL)/18. BUN/urea omitted because it freely crosses membranes.',
      formula: 'Effective osm = 2 × Na + glucose/18',
      validation: 'Standard teaching in dysnatremia evaluation; measured osm still needed for osmolal gap toxins.',
      references: [
        {
          title: 'The pathophysiology and treatment of hyponatraemic encephalopathy',
          citation: 'Classic tonicity teaching; Adrogué & Madias hyponatremia reviews',
          year: 2000,
          pmid: '10824078',
          doi: '10.1056/NEJM200005253422107',
        },
      ],
    },
    nextSteps: [
      { condition: 'Hypotonic hyponatremia', actions: ['Assess volume status', 'Uosm, UNa', 'TSH, cortisol as indicated', 'Avoid overly rapid correction'] },
      { condition: 'Hypertonic with high glucose', actions: ['Correct Na for hyperglycemia', 'Treat hyperosmolar state'] },
    ],
    pearls: [
      'Pseudohyponatremia (extreme hyperlipidemia/protein) can show low Na with normal tonicity/measured osm.',
      'Mannitol and glycine irrigation are other effective osmoles not in this formula.',
    ],
  },

  // 10. Boston approach compensation
  {
    id: 'boston-approach',
    name: 'Boston Acid–Base Compensation Rules',
    shortName: 'Boston Rules',
    description: 'Expected compensatory PCO₂ or HCO₃ changes for primary metabolic/respiratory disorders (Boston rules, simplified).',
    category: 'nephrology',
    tags: ['acid-base', 'boston', 'compensation', 'metabolic', 'respiratory', 'abg'],
    whenToUse: 'Bedside check whether compensation is appropriate or a second primary disorder is present.',
    whyUse: 'Simple Δ rules complement Winters formula and full physiologic approaches.',
    inputs: [
      selectInput('disorder', 'Primary disorder', [
        { label: 'Metabolic acidosis', value: 'met_acid' },
        { label: 'Metabolic alkalosis', value: 'met_alk' },
        { label: 'Acute respiratory acidosis', value: 'ac_resp_acid' },
        { label: 'Chronic respiratory acidosis', value: 'ch_resp_acid' },
        { label: 'Acute respiratory alkalosis', value: 'ac_resp_alk' },
        { label: 'Chronic respiratory alkalosis', value: 'ch_resp_alk' },
      ]),
      numberInput('hco3', 'Measured HCO₃⁻', { unit: 'mEq/L', min: 1, max: 60, step: 0.1, defaultValue: 18 }),
      numberInput('pco2', 'Measured PCO₂', { unit: 'mmHg', min: 5, max: 120, defaultValue: 40 }),
    ],
    calculate(values) {
      const disorder = str(values.disorder, 'met_acid');
      const hco3 = num(values.hco3, 18);
      const pco2 = num(values.pco2, 40);
      const dHco3 = hco3 - 24;
      const dPco2 = pco2 - 40;
      let expected: number;
      let expectedLabel: string;
      let rule: string;
      let measuredCompare: number;
      let unit = 'mmHg';

      if (disorder === 'met_acid') {
        // ΔPCO2 ≈ 1.2 × ΔHCO3 (fall)
        expected = round(40 + 1.2 * dHco3, 1);
        expectedLabel = 'Expected PCO₂';
        rule = 'ΔPCO₂ ≈ 1.2 × ΔHCO₃ (respiratory compensation)';
        measuredCompare = pco2;
        unit = 'mmHg';
      } else if (disorder === 'met_alk') {
        // ΔPCO2 ≈ 0.7 × ΔHCO3 (rise)
        expected = round(40 + 0.7 * dHco3, 1);
        expectedLabel = 'Expected PCO₂';
        rule = 'ΔPCO₂ ≈ 0.7 × ΔHCO₃';
        measuredCompare = pco2;
        unit = 'mmHg';
      } else if (disorder === 'ac_resp_acid') {
        expected = round(24 + 0.1 * dPco2, 1);
        expectedLabel = 'Expected HCO₃⁻';
        rule = 'Acute: ΔHCO₃ ≈ 0.1 × ΔPCO₂';
        measuredCompare = hco3;
        unit = 'mEq/L';
      } else if (disorder === 'ch_resp_acid') {
        expected = round(24 + 0.4 * dPco2, 1);
        expectedLabel = 'Expected HCO₃⁻';
        rule = 'Chronic: ΔHCO₃ ≈ 0.4 × ΔPCO₂';
        measuredCompare = hco3;
        unit = 'mEq/L';
      } else if (disorder === 'ac_resp_alk') {
        expected = round(24 + 0.2 * dPco2, 1);
        expectedLabel = 'Expected HCO₃⁻';
        rule = 'Acute: ΔHCO₃ ≈ 0.2 × ΔPCO₂';
        measuredCompare = hco3;
        unit = 'mEq/L';
      } else {
        expected = round(24 + 0.5 * dPco2, 1);
        expectedLabel = 'Expected HCO₃⁻';
        rule = 'Chronic: ΔHCO₃ ≈ 0.5 × ΔPCO₂';
        measuredCompare = hco3;
        unit = 'mEq/L';
      }

      const delta = round(measuredCompare - expected, 1);
      const absDelta = Math.abs(delta);
      let label = 'Compensation roughly appropriate';
      let riskLevel: 'normal' | 'moderate' | 'high' | 'info' = 'info';
      let interpretation = '';
      if (absDelta <= 2) {
        label = 'Within ~2 of expected';
        riskLevel = 'normal';
        interpretation = `${expectedLabel} ≈ ${expected} ${unit}; measured ${measuredCompare}. Difference ${delta} — generally consistent with appropriate compensation for the selected primary disorder (Boston teaching rules).`;
      } else if (absDelta <= 5) {
        label = 'Borderline mismatch';
        riskLevel = 'moderate';
        interpretation = `${expectedLabel} ≈ ${expected} ${unit}; measured ${measuredCompare} (Δ ${delta}). Possible evolving compensation, measurement lag, or mild mixed disorder — integrate clinical context.`;
      } else {
        label = 'Suggests additional process';
        riskLevel = 'high';
        interpretation = `${expectedLabel} ≈ ${expected} ${unit}; measured ${measuredCompare} (Δ ${delta}). Large deviation from Boston expected compensation — consider mixed acid–base disorder.`;
      }
      return {
        score: expected,
        unit,
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Rule', value: rule },
          { label: expectedLabel, value: `${expected} ${unit}` },
          { label: 'Measured comparator', value: `${measuredCompare} ${unit}` },
          { label: 'Difference (meas − exp)', value: String(delta) },
        ],
      };
    },
    evidence: {
      summary:
        'Boston rules (teaching): met. acid ΔPCO₂≈1.2 ΔHCO₃; met. alk ΔPCO₂≈0.7 ΔHCO₃; acute resp acid ΔHCO₃≈0.1 ΔPCO₂; chronic resp acid ≈0.4; acute resp alk ≈0.2; chronic resp alk ≈0.5.',
      formula: 'See disorder-specific Δ rules (reference HCO₃ 24, PCO₂ 40)',
      validation: 'Bedside approximations; Winters formula often used for metabolic acidosis PCO₂. Rules of thumb — not absolute cutoffs.',
      references: [
        {
          title: 'Simple and mixed acid-base disorders: a practical approach',
          citation: 'Narins RG, Emmett M. Medicine (Baltimore). 1980',
          year: 1980,
          pmid: '6774200',
          doi: '10.1097/00005792-198005000-00001',
        },
      ],
    },
    nextSteps: [
      { condition: 'Mismatch with expected compensation', actions: ['Seek second primary disorder', 'Review AG, albumin, lactate, ketones, toxins', 'Repeat ABG/VBG and electrolytes'] },
    ],
    pearls: [
      'Compensation never fully normalizes pH.',
      'Chronicity (hours vs days) changes expected HCO₃ in respiratory disorders.',
    ],
  },

  // 11. Expected HCO3 chronic respiratory acidosis
  {
    id: 'expected-pco2-chronic-resp',
    name: 'Expected HCO₃ — Chronic Respiratory Acidosis',
    shortName: 'Chronic Resp Acid',
    description: 'Expected bicarbonate compensation in chronic respiratory acidosis from PaCO₂.',
    category: 'nephrology',
    tags: ['copd', 'respiratory acidosis', 'compensation', 'hco3', 'abg'],
    whenToUse: 'COPD/chronic hypercapnia — is the HCO₃ rise appropriate for chronic CO₂ retention?',
    whyUse: 'Distinguishes pure chronic compensation from concurrent metabolic acid–base disorders.',
    inputs: [
      numberInput('pco2', 'PaCO₂', { unit: 'mmHg', min: 40, max: 120, defaultValue: 60 }),
      numberInput('hco3', 'Measured HCO₃⁻ (optional compare)', { unit: 'mEq/L', min: 10, max: 60, step: 0.1, defaultValue: 32 }),
    ],
    calculate(values) {
      const pco2 = num(values.pco2, 60);
      const hco3 = num(values.hco3, 32);
      const dP = pco2 - 40;
      // Chronic: HCO3 rises ~0.35–0.4 per 1 mmHg PCO2; use 0.4 Boston
      const expected = round(24 + 0.4 * dP, 1);
      const expectedLow = round(24 + 0.35 * dP, 1);
      const delta = round(hco3 - expected, 1);
      let label = 'Compare measured HCO₃ to expected';
      let riskLevel: 'normal' | 'moderate' | 'high' | 'info' = 'info';
      let interpretation = `For chronic respiratory acidosis at PaCO₂ ${pco2}, expected HCO₃ ≈ ${expected} mEq/L (range ~${expectedLow} using 0.35 rule). Measured ${hco3} (Δ ${delta} vs 0.4 rule).`;
      if (Math.abs(delta) <= 2) {
        label = 'HCO₃ matches chronic compensation';
        riskLevel = 'normal';
        interpretation += ' Appropriate chronic metabolic compensation likely.';
      } else if (hco3 < expected - 2) {
        label = 'HCO₃ lower than expected';
        riskLevel = 'moderate';
        interpretation += ' Lower than expected — consider coexistent metabolic acidosis or not-yet-chronic compensation.';
      } else {
        label = 'HCO₃ higher than expected';
        riskLevel = 'moderate';
        interpretation += ' Higher than expected — consider coexistent metabolic alkalosis (diuretics, vomiting, volume contraction).';
      }
      return {
        score: expected,
        unit: 'mEq/L',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Expected HCO₃ (0.4 rule)', value: `${expected} mEq/L` },
          { label: 'Expected HCO₃ (0.35 rule)', value: `${expectedLow} mEq/L` },
          { label: 'Measured HCO₃', value: `${hco3} mEq/L` },
          { label: 'ΔPaCO₂', value: `${dP} mmHg` },
        ],
      };
    },
    evidence: {
      summary: 'Chronic respiratory acidosis: expected HCO₃ ≈ 24 + 0.4×(PaCO₂ − 40) mEq/L (some texts use 0.35). Renal compensation develops over 3–5 days.',
      formula: 'Expected HCO₃ ≈ 24 + 0.4 × (PaCO₂ − 40)',
      validation: 'Standard ABG teaching rule of thumb; clinical chronicity required.',
      references: [
        {
          title: 'Simple and mixed acid-base disorders',
          citation: 'Narins RG, Emmett M. Medicine (Baltimore). 1980',
          year: 1980,
          pmid: '6774200',
          doi: '10.1097/00005792-198005000-00001',
        },
      ],
    },
    nextSteps: [
      { condition: 'Inappropriate HCO₃', actions: ['Evaluate mixed disorder', 'Review diuretics, NG losses, lactate/ketones', 'Correlate with prior ABGs'] },
    ],
    pearls: ['Expected pH in pure chronic hypercapnia is closer to normal than in acute rises of the same PaCO₂.'],
  },

  // 12. Acute respiratory acidosis helper
  {
    id: 'expected-pco2-acute-resp',
    name: 'Expected pH / HCO₃ — Acute Respiratory Acidosis',
    shortName: 'Acute Resp Acid',
    description: 'Expected acute bicarbonate and approximate pH change for an acute rise in PaCO₂.',
    category: 'nephrology',
    tags: ['respiratory acidosis', 'acute', 'abg', 'pco2', 'ph'],
    whenToUse: 'Acute hypoventilation (opiates, airway, NM weakness) — is the ABG consistent with pure acute CO₂ retention?',
    whyUse: 'Acute buffering only slightly raises HCO₃; larger rises imply chronicity or metabolic alkalosis.',
    inputs: [
      numberInput('pco2', 'PaCO₂', { unit: 'mmHg', min: 40, max: 120, defaultValue: 60 }),
      numberInput('hco3', 'Measured HCO₃⁻', { unit: 'mEq/L', min: 10, max: 50, step: 0.1, defaultValue: 26 }),
      numberInput('ph', 'Measured pH (optional)', { unit: '', min: 6.8, max: 7.8, step: 0.01, defaultValue: 7.25 }),
    ],
    calculate(values) {
      const pco2 = num(values.pco2, 60);
      const hco3 = num(values.hco3, 26);
      const ph = num(values.ph, 7.25);
      const dP = pco2 - 40;
      const expHco3 = round(24 + 0.1 * dP, 1);
      // Rule of thumb: pH falls ~0.008 × ΔPCO2 acutely
      const expPh = round(7.4 - 0.008 * dP, 2);
      const dHco3 = round(hco3 - expHco3, 1);
      const dPh = round(ph - expPh, 2);
      let label = 'Acute compensation estimate';
      let riskLevel: 'moderate' | 'high' | 'critical' | 'info' | 'normal' = 'info';
      if (pco2 >= 80 || ph < 7.2) riskLevel = 'critical';
      else if (pco2 >= 60 || ph < 7.3) riskLevel = 'high';
      else riskLevel = 'moderate';

      let interpretation = `Acute expected HCO₃ ≈ ${expHco3} mEq/L (measured ${hco3}, Δ ${dHco3}). Approximate expected pH ≈ ${expPh} (measured ${ph}, Δ ${dPh}).`;
      if (Math.abs(dHco3) <= 2) {
        label = 'HCO₃ consistent with acute rise';
        interpretation += ' HCO₃ fits acute buffering. Treat hypoventilation cause.';
      } else if (hco3 > expHco3 + 2) {
        label = 'HCO₃ higher than acute expected';
        interpretation += ' Suggests chronic component or coexistent metabolic alkalosis.';
      } else {
        label = 'HCO₃ lower than acute expected';
        interpretation += ' Suggests coexistent metabolic acidosis or lab lag.';
      }
      return {
        score: expHco3,
        unit: 'mEq/L (exp HCO₃)',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Expected HCO₃', value: `${expHco3} mEq/L` },
          { label: 'Approx. expected pH', value: String(expPh) },
          { label: 'ΔPaCO₂', value: `${dP} mmHg` },
          { label: 'Rule', value: 'ΔHCO₃≈0.1×ΔPCO₂; ΔpH≈−0.008×ΔPCO₂' },
        ],
      };
    },
    evidence: {
      summary: 'Acute respiratory acidosis: HCO₃ rises ≈0.1 mEq/L per 1 mmHg PaCO₂; pH falls ≈0.008 per 1 mmHg (teaching approximations).',
      formula: 'Exp HCO₃ = 24 + 0.1(PCO₂−40); Exp pH ≈ 7.40 − 0.008(PCO₂−40)',
      validation: 'Bedside rules of thumb; Henderson–Hasselbalch remains definitive for pH consistency checks.',
      references: [
        {
          title: 'Simple and mixed acid-base disorders',
          citation: 'Narins RG, Emmett M. Medicine (Baltimore). 1980',
          year: 1980,
          pmid: '6774200',
          doi: '10.1097/00005792-198005000-00001',
        },
      ],
    },
    nextSteps: [
      { condition: 'Acute hypercapnia', actions: ['Airway / ventilation support', 'Reverse opioids/sedation', 'NIV or intubation per status'] },
    ],
    pearls: ['A “normal” HCO₃ of 24 with PaCO₂ 80 is not compensated — pH will be severely acidemic.'],
  },

  // 13. High AG causes MUDPILES
  {
    id: 'high-ag-causes',
    name: 'High Anion Gap Acidosis Causes (MUDPILES)',
    shortName: 'MUDPILES',
    description: 'Educational checklist counting MUDPILES etiologies for high anion gap metabolic acidosis.',
    category: 'nephrology',
    tags: ['anion gap', 'mudpiles', 'metabolic acidosis', 'checklist', 'hag'],
    whenToUse: 'Structured differential for HAGMA after confirming elevated anion gap.',
    whyUse: 'Mnemonic-based systematic review reduces missed toxic and metabolic causes.',
    inputs: [
      yesNo('methanol', 'Methanol (or other toxic alcohol) suspected'),
      yesNo('uremia', 'Uremia / advanced CKD'),
      yesNo('dka', 'Diabetic / alcoholic / starvation ketoacidosis'),
      yesNo('paraldehyde', 'Paraldehyde / phenformin (historical) / pyroglutamic (5-oxoproline)'),
      yesNo('iron_isoniazid', 'Iron or isoniazid toxicity'),
      yesNo('lactate', 'Lactic acidosis (type A or B)'),
      yesNo('ethylene', 'Ethylene glycol'),
      yesNo('salicylate', 'Salicylates'),
    ],
    calculate(values) {
      const items: { id: string; label: string }[] = [
        { id: 'methanol', label: 'Methanol' },
        { id: 'uremia', label: 'Uremia' },
        { id: 'dka', label: 'Ketoacidosis' },
        { id: 'paraldehyde', label: 'Paraldehyde/phenformin/pyroglutamate' },
        { id: 'iron_isoniazid', label: 'Iron/INH' },
        { id: 'lactate', label: 'Lactate' },
        { id: 'ethylene', label: 'Ethylene glycol' },
        { id: 'salicylate', label: 'Salicylate' },
      ];
      const positive = items.filter((i) => bool(values[i.id]));
      const score = positive.length;
      let riskLevel: 'info' | 'moderate' | 'high' | 'critical' = 'info';
      if (score >= 3) riskLevel = 'critical';
      else if (score === 2) riskLevel = 'high';
      else if (score === 1) riskLevel = 'moderate';
      return {
        score,
        unit: 'items',
        label: score === 0 ? 'No MUDPILES items flagged' : `${score} potential etiology flag(s)`,
        interpretation:
          score === 0
            ? 'No checklist items selected — still measure lactate, ketones, renal function, toxic alcohols as indicated by history. Mnemonics are aids, not proof.'
            : `Flagged: ${positive.map((p) => p.label).join(', ')}. Prioritize immediately life-threatening causes (lactate, ketones, toxic alcohols, salicylate) with targeted labs and empiric therapy when indicated.`,
        riskLevel,
        details: [
          { label: 'Mnemonic', value: 'MUDPILES' },
          { label: 'Selected', value: positive.length ? positive.map((p) => p.label).join(', ') : 'None' },
        ],
        recommendations: [
          'Also consider GOLDMARK update (Glycols, Oxoproline, L-lactate, D-lactate, Methanol, Aspirin, Renal failure, Ketoacidosis).',
        ],
      };
    },
    evidence: {
      summary: 'MUDPILES: Methanol, Uremia, DKA, Paraldehyde/Phenformin/Pyroglutamate, Iron/INH, Lactate, Ethylene glycol, Salicylates. Educational checklist only.',
      validation: 'Teaching mnemonic; modern GOLDMARK preferred by many educators.',
      references: [
        {
          title: 'Mind the gap (acid-base teaching mnemonics)',
          citation: 'Classic nephrology/EM teaching; Mehta AN et al. related reviews on AG acidosis',
          year: 2008,
          pmid: '38837536',
          doi: '10.1111/imj.16418',
        },
      ],
    },
    nextSteps: [
      { condition: 'HAGMA undifferentiated', actions: ['Lactate, beta-hydroxybutyrate', 'BMP, albumin-corrected AG', 'Osmolal gap if toxin possible', 'Salicylate level when plausible'] },
    ],
    pearls: ['Multiple causes can coexist (e.g., lactate + ketoacidosis in shock + diabetes).'],
  },

  // 14. NAGMA HARDUP
  {
    id: 'nagma-causes',
    name: 'Normal Anion Gap Acidosis Causes (HARDUP)',
    shortName: 'HARDUP',
    description: 'Educational HARDUP checklist for hyperchloremic / normal anion gap metabolic acidosis.',
    category: 'nephrology',
    tags: ['nagma', 'hardup', 'rta', 'hyperchloremic', 'metabolic acidosis'],
    whenToUse: 'Differential diagnosis after confirming NAGMA (normal AG metabolic acidosis).',
    whyUse: 'Structures workup between GI bicarb loss, RTA, dilutions, and drugs.',
    inputs: [
      yesNo('hyperalimentation', 'Hyperalimentation / TPN chloride load / dilution'),
      yesNo('acetazolamide', 'Acetazolamide or other carbonic anhydrase inhibitor'),
      yesNo('rta', 'Renal tubular acidosis (or hypoaldosteronism type 4)'),
      yesNo('diarrhea', 'Diarrhea / pancreaticobiliary / fistula GI HCO₃ loss'),
      yesNo('uretero', 'Uretero-sigmoidostomy / ureteric diversion'),
      yesNo('pancreatic', 'Pancreatic fistula / high-output ileostomy (GI HCO₃ loss)'),
    ],
    calculate(values) {
      const items: { id: string; label: string }[] = [
        { id: 'hyperalimentation', label: 'Hyperalimentation/dilution' },
        { id: 'acetazolamide', label: 'Acetazolamide/CAI' },
        { id: 'rta', label: 'RTA' },
        { id: 'diarrhea', label: 'Diarrhea/GI HCO₃ loss' },
        { id: 'uretero', label: 'Uretero-intestinal diversion' },
        { id: 'pancreatic', label: 'Pancreatic/ileostomy loss' },
      ];
      const positive = items.filter((i) => bool(values[i.id]));
      const score = positive.length;
      return {
        score,
        unit: 'items',
        label: score === 0 ? 'No HARDUP items flagged' : `${score} potential NAGMA etiology flag(s)`,
        interpretation:
          score === 0
            ? 'No items selected. Use urine AG / urine osmolal gap / NH₄ estimates to separate GI vs renal HCO₃ loss; review NS resuscitation and chloride-rich fluids.'
            : `Flagged: ${positive.map((p) => p.label).join(', ')}. Next: volume status, urine electrolytes/AG, K⁺, and medication review.`,
        riskLevel: score >= 2 ? 'high' : score === 1 ? 'moderate' : 'info',
        details: [
          { label: 'Mnemonic', value: 'HARDUP (Hyperalimentation, Acetazolamide, RTA, Diarrhea, Uretero-sigmoidostomy, Pancreatic fistula)' },
          { label: 'Selected', value: positive.length ? positive.map((p) => p.label).join(', ') : 'None' },
        ],
        recommendations: ['Also consider iatrogenic saline, cholestyramine, toluene (can present AG or NAGMA phases), and early CKD.'],
      };
    },
    evidence: {
      summary: 'HARDUP mnemonic for NAGMA teaching. Urine anion gap and urine osmolal gap help distinguish GI HCO₃ loss (high NH₄⁺) from RTA (low NH₄⁺).',
      validation: 'Educational mnemonic — not a validated score.',
      references: [
        {
          title: 'Hyperchloremic metabolic acidosis teaching reviews',
          citation: 'Standard nephrology texts / acid-base monographs',
          year: 2010,
          pmid: '38837536',
          doi: '10.1111/imj.16418',
        },
      ],
    },
    nextSteps: [
      { condition: 'NAGMA + low UOG/positive UAG', actions: ['Evaluate RTA type', 'Check K, urine pH, renin-aldosterone'] },
      { condition: 'NAGMA + GI losses', actions: ['Volume and K repletion', 'Treat underlying diarrhea/fistula'] },
    ],
    pearls: ['Type 4 RTA: hyperkalemic NAGMA with mild HCO₃ depression — common in diabetes and drugs (RASi, NSAIDs, CNIs).'],
  },

  // 15. Ammonium estimate from UOG
  {
    id: 'ammonium',
    name: 'Urine Ammonium Estimate from Osmolal Gap',
    shortName: 'U-NH₄ Est.',
    description: 'Estimates urinary ammonium from urine osmolal gap (UOG) in metabolic acidosis workup.',
    category: 'nephrology',
    tags: ['ammonium', 'nh4', 'urine osmolal gap', 'rta', 'nagma'],
    whenToUse: 'NAGMA: estimate renal NH₄⁺ excretion when direct NH₄ assay is unavailable.',
    whyUse: 'High estimated NH₄⁺ favors extrarenal HCO₃ loss; low NH₄⁺ favors RTA or impaired ammoniagenesis.',
    inputs: [
      numberInput('uosm', 'Measured urine osmolality', { unit: 'mOsm/kg', min: 50, max: 1200, defaultValue: 400 }),
      numberInput('una', 'Urine Na', { unit: 'mEq/L', min: 1, max: 300, defaultValue: 40 }),
      numberInput('uk', 'Urine K', { unit: 'mEq/L', min: 1, max: 200, defaultValue: 20 }),
      numberInput('uurea', 'Urine urea nitrogen', { unit: 'mg/dL', min: 0, max: 2000, defaultValue: 200 }),
      numberInput('uglu', 'Urine glucose', { unit: 'mg/dL', min: 0, max: 1000, defaultValue: 0 }),
    ],
    calculate(values) {
      const uosm = num(values.uosm, 400);
      const una = num(values.una, 40);
      const uk = num(values.uk, 20);
      const uurea = num(values.uurea, 200);
      const uglu = num(values.uglu, 0);
      const calc = round(2 * (una + uk) + uurea / 2.8 + uglu / 18, 1);
      const uog = round(uosm - calc, 1);
      // Teaching: NH4+ concentration roughly approximates UOG (mEq/L ≈ mOsm/kg gap)
      const nh4 = Math.max(uog, 0);
      let label = 'Indeterminate NH₄ estimate';
      let riskLevel: 'info' | 'low' | 'moderate' | 'high' = 'info';
      let interpretation = '';
      if (uog >= 100) {
        label = 'High estimated NH₄⁺ (adequate response)';
        riskLevel = 'low';
        interpretation = `UOG ${uog} mOsm/kg → estimated urine NH₄⁺ roughly ~${round(nh4, 0)} mEq/L range. Suggests robust ammoniagenesis (e.g., diarrhea) rather than classic distal RTA.`;
      } else if (uog <= 40) {
        label = 'Low estimated NH₄⁺';
        riskLevel = 'moderate';
        interpretation = `UOG ${uog} → low estimated NH₄⁺. Suggests impaired renal NH₄⁺ excretion (RTA, hypoaldosteronism, advanced CKD). Confirm clinically.`;
      } else {
        label = 'Intermediate UOG / NH₄ estimate';
        riskLevel = 'info';
        interpretation = `UOG ${uog} mOsm/kg — intermediate. Integrate urine AG, K⁺, urine pH, and clinical picture; other osmoles can confound.`;
      }
      return {
        score: round(nh4, 0),
        unit: 'mEq/L (approx)',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Urine osmolal gap', value: `${uog} mOsm/kg` },
          { label: 'Calculated Uosm', value: `${calc} mOsm/kg` },
          { label: 'Estimated NH₄⁺', value: `~${round(nh4, 0)} mEq/L (≈ UOG teaching rule)` },
        ],
      };
    },
    evidence: {
      summary: 'UOG = Uosm_meas − [2(UNa+UK) + UUN/2.8 + Uglu/18]. Urine NH₄⁺ is often approximated by the UOG in teaching (not exact stoichiometry).',
      formula: 'NH₄⁺ ≈ UOG; UOG = Uosm − (2(UNa+UK) + UUN/2.8 + Uglu/18)',
      validation: 'Standard adjunct when direct NH₄ unavailable; confounded by other unmeasured osmoles.',
      references: [
        {
          title: 'Urine osmolal gap and ammonium excretion',
          citation: 'Dyck RF et al. / nephrology teaching literature',
          year: 1990,
          pmid: '2080786',
          doi: '10.1159/000168150',
        },
      ],
    },
    nextSteps: [
      { condition: 'Low NH₄ estimate + NAGMA', actions: ['RTA workup', 'Med review (CAI, amphotericin, lithium, ifosfamide)', 'Check serum K'] },
      { condition: 'High NH₄ estimate + NAGMA', actions: ['Seek GI HCO₃ loss', 'Volume repletion'] },
    ],
    pearls: ['Direct urine NH₄ measurement is ideal when available.', 'Ketoanion salts and toxins can inflate UOG independent of NH₄⁺.'],
  },

  // 16. Hyperkalemia ECG severity checklist
  {
    id: 'hyperkalemia-ecg',
    name: 'Hyperkalemia ECG Changes (Severity Checklist)',
    shortName: 'HyperK ECG',
    description: 'Checklist of ECG manifestations of hyperkalemia to support urgency of treatment (not a substitute for K⁺ value and clinical context).',
    category: 'nephrology',
    tags: ['hyperkalemia', 'ecg', 'potassium', 'emergency', 'peaked t'],
    whenToUse: 'Known or suspected hyperkalemia — triage membrane-stabilization urgency from ECG features.',
    whyUse: 'ECG changes mark increased risk of arrhythmia; guide calcium, shift, and removal therapies.',
    inputs: [
      numberInput('k', 'Serum K⁺ (if known)', { unit: 'mEq/L', min: 2, max: 12, step: 0.1, defaultValue: 6.2 }),
      yesNo('peakedT', 'Peaked T waves'),
      yesNo('prProlong', 'PR prolongation / flattened P'),
      yesNo('lossP', 'Loss of P waves'),
      yesNo('wideQrs', 'QRS widening'),
      yesNo('sine', 'Sine-wave pattern'),
      yesNo('bradyVf', 'Severe bradyarrhythmia / VT/VF / arrest'),
    ],
    calculate(values) {
      const k = num(values.k, 6.2);
      const flags = [
        bool(values.peakedT) ? 1 : 0,
        bool(values.prProlong) ? 2 : 0,
        bool(values.lossP) ? 3 : 0,
        bool(values.wideQrs) ? 4 : 0,
        bool(values.sine) ? 5 : 0,
        bool(values.bradyVf) ? 6 : 0,
      ];
      const maxSeverity = Math.max(0, ...flags);
      const count = [
        values.peakedT,
        values.prProlong,
        values.lossP,
        values.wideQrs,
        values.sine,
        values.bradyVf,
      ].filter((v) => bool(v)).length;

      let label = 'No listed ECG changes';
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' | 'info' = 'info';
      let interpretation = '';

      if (maxSeverity >= 5 || bool(values.bradyVf)) {
        label = 'Critical ECG toxicity pattern';
        riskLevel = 'critical';
        interpretation = `Critical conduction toxicity pattern (sine wave and/or malignant arrhythmia). Immediate IV calcium, continuous monitoring, shift therapies, emergent K removal, and ACLS as needed. Serum K entered: ${k}.`;
      } else if (maxSeverity >= 4 || bool(values.wideQrs)) {
        label = 'High-risk ECG changes (wide QRS)';
        riskLevel = 'critical';
        interpretation = `QRS widening from hyperkalemia is high-risk. Give IV calcium for membrane stabilization now if not already given; insulin/glucose, β-agonist, bicarb if acidotic, and arrange dialysis if refractory/renal failure.`;
      } else if (maxSeverity >= 2) {
        label = 'Intermediate ECG changes';
        riskLevel = 'high';
        interpretation = `PR changes / P-wave abnormalities with hyperkalemia warrant urgent treatment and monitoring even if QRS still narrow. Do not wait for sine wave.`;
      } else if (maxSeverity === 1) {
        label = 'Early ECG change (peaked T)';
        riskLevel = 'moderate';
        interpretation = `Peaked T waves can be early. Treat based on K level, trajectory, renal function, and symptoms — ECG can lag or be insensitive.`;
      } else {
        label = 'No checklist ECG changes selected';
        riskLevel = k >= 6.5 ? 'high' : k >= 5.5 ? 'moderate' : 'low';
        interpretation = `No selected ECG changes — ECG can be normal despite dangerous hyperkalemia. Treat according to K (${k}), rate of rise, and clinical context.`;
      }
      return {
        score: maxSeverity,
        unit: 'severity tier',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'ECG features selected', value: String(count) },
          { label: 'Serum K', value: `${k} mEq/L` },
          { label: 'Tier', value: '0 none → 1 T peaks → 2–3 atrial → 4 wide QRS → 5–6 sine/arrest' },
        ],
      };
    },
    evidence: {
      summary: 'Classic progression: peaked T → PR/P changes → loss of P → QRS widening → sine wave → VF/asystole. Progression is not strictly linear; ECG may be unchanged at high K.',
      validation: 'Clinical teaching tool; decisions integrate absolute K, chronicity, and ECG.',
      references: [
        {
          title: 'Electrocardiographic manifestations of hyperkalemia',
          citation: 'Classic EM/nephrology reviews; Mattu A et al. Am J Emerg Med. 2000',
          year: 2000,
          pmid: '11043630',
          doi: '10.1053/ajem.2000.7344',
        },
      ],
    },
    nextSteps: [
      { condition: 'Any wide QRS / sine / instability', actions: ['IV calcium', 'Cardiac monitor', 'Shift K (insulin/glucose, albuterol)', 'Emergent dialysis if needed'] },
      { condition: 'Elevated K without ECG changes', actions: ['Still treat if K very high or rising', 'Stop KA-sparing drugs', 'Patiromer or SZC preferred (SPS if used locally)', 'Address cause'] },
    ],
    pearls: [
      'Calcium antagonizes cardiac effects but does not lower serum K.',
      'Chronic hyperkalemia may show fewer ECG changes than acute rises.',
    ],
  },

  // 17. iPTH targets CKD
  {
    id: 'ipth-ckd',
    name: 'iPTH Targets in CKD (KDIGO-Oriented)',
    shortName: 'iPTH CKD',
    description: 'Educational interpretation of intact PTH relative to assay ULN and CKD stage (KDIGO-oriented targets).',
    category: 'nephrology',
    tags: ['pth', 'ckd-mbd', 'ipth', 'kdigo', 'secondary hyperparathyroidism'],
    whenToUse: 'CKD-MBD monitoring — frame iPTH versus stage-based goals and assay upper limit of normal.',
    whyUse: 'Avoids over-treating modest elevations in non-dialysis CKD and anchors dialysis targets to 2–9× ULN.',
    inputs: [
      numberInput('ipth', 'Intact PTH', { unit: 'pg/mL', min: 1, max: 3000, defaultValue: 120 }),
      numberInput('uln', 'Assay upper limit of normal', { unit: 'pg/mL', min: 20, max: 100, defaultValue: 65, helpText: 'Lab-specific ULN' }),
      selectInput('stage', 'CKD stage context', [
        { label: 'G3a–G3b (not on dialysis)', value: 'g3' },
        { label: 'G4 (not on dialysis)', value: 'g4' },
        { label: 'G5 not on dialysis', value: 'g5nd' },
        { label: 'G5D (dialysis)', value: 'g5d' },
      ]),
    ],
    calculate(values) {
      const ipth = num(values.ipth, 120);
      const uln = Math.max(num(values.uln, 65), 1);
      const stage = str(values.stage, 'g3');
      const xUln = round(ipth / uln, 2);
      let label = '';
      let riskLevel: 'normal' | 'low' | 'moderate' | 'high' | 'info' = 'info';
      let interpretation = '';

      if (stage === 'g5d') {
        const low = 2 * uln;
        const high = 9 * uln;
        if (ipth < low) {
          label = 'Below common dialysis target band (<2× ULN)';
          riskLevel = 'moderate';
          interpretation = `iPTH ${ipth} pg/mL (${xUln}× ULN). KDIGO suggests maintaining iPTH in ~2–9× assay ULN in G5D; values <2× raise concern for adynamic bone disease if persistent — avoid over-suppression.`;
        } else if (ipth <= high) {
          label = 'Within common dialysis target band (2–9× ULN)';
          riskLevel = 'normal';
          interpretation = `iPTH ${ipth} pg/mL (${xUln}× ULN) is within the commonly cited KDIGO G5D range (~${low}–${high} pg/mL for this ULN). Trend phosphate, calcium, and prior values.`;
        } else {
          label = 'Above common dialysis target band (>9× ULN)';
          riskLevel = 'high';
          interpretation = `iPTH ${ipth} pg/mL (${xUln}× ULN) exceeds ~9× ULN. Optimize phosphate, vitamin D status, calcimimetics/vitamin D analogs per protocol; consider specialist CKD-MBD management.`;
        }
      } else {
        // Non-dialysis: KDIGO — treat progressive/persistent elevations above ULN, not a fixed 2–9 band
        if (ipth <= uln) {
          label = 'At or below assay ULN';
          riskLevel = 'normal';
          interpretation = `iPTH ${ipth} ≤ ULN (${uln}). In non-dialysis CKD, avoid routine suppression into low ranges; monitor trends with Ca/Phos/25-OH D.`;
        } else if (xUln < 2) {
          label = 'Mildly above ULN';
          riskLevel = 'low';
          interpretation = `iPTH ${ipth} (${xUln}× ULN). Mild secondary hyperparathyroidism common in ${stage.toUpperCase()}. Address phosphate load, vitamin D deficiency, and calcium balance before aggressive PTH-lowering.`;
        } else {
          label = 'Progressive / marked elevation above ULN';
          riskLevel = 'moderate';
          interpretation = `iPTH ${ipth} (${xUln}× ULN). Persistent progressive rise above ULN in non-dialysis CKD may warrant treatment of CKD-MBD drivers (phosphate, vitamin D, etc.) per KDIGO — individualize.`;
        }
      }
      return {
        score: xUln,
        unit: '× ULN',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'iPTH', value: `${ipth} pg/mL` },
          { label: 'Assay ULN', value: `${uln} pg/mL` },
          { label: '× ULN', value: String(xUln) },
          { label: 'Stage context', value: stage },
        ],
      };
    },
    evidence: {
      summary:
        'KDIGO CKD-MBD: in G5D, suggest iPTH in ~2–9× assay ULN. In non-dialysis CKD, evaluate progressive elevations above ULN rather than targeting the dialysis band routinely.',
      formula: '×ULN = iPTH / assay_ULN',
      validation: 'Guideline-oriented educational tool — assay variability is large; trends matter more than single values.',
      references: [
        {
          title: 'KDIGO 2017 Clinical Practice Guideline Update for CKD-MBD',
          citation: 'Kidney Int Suppl. 2017',
          year: 2017,
          pmid: '30675420',
          doi: '10.1016/j.kisu.2017.04.001',
          url: 'https://kdigo.org/guidelines/ckd-mbd/',
        },
      ],
    },
    nextSteps: [
      { condition: 'Elevated iPTH', actions: ['Check Ca, Phos, 25-OH vitamin D, ALP', 'Dietary phosphate counseling', 'Nephrology/CKD-MBD clinic as needed'] },
      { condition: 'Low iPTH on dialysis', actions: ['Review vitamin D analogs/calcimimetics', 'Avoid over-suppression'] },
    ],
    pearls: ['Always use the same assay for serial comparison when possible.', 'Correct severe hypo/hypercalcemia and phosphate first.'],
  },

  // 18. Bicarb threshold CKD
  {
    id: 'bicarb-ckd',
    name: 'Metabolic Acidosis Treatment Threshold in CKD',
    shortName: 'HCO₃ CKD',
    description: 'Interprets serum bicarbonate against KDIGO-oriented alkali therapy thresholds in CKD.',
    category: 'nephrology',
    tags: ['bicarbonate', 'ckd', 'metabolic acidosis', 'alkali', 'kdigo'],
    whenToUse: 'CKD patients with low or borderline total CO₂/HCO₃ to decide on alkali therapy consideration.',
    whyUse: 'Frames alkali consideration in CKD; hard-outcome benefit is uncertain—contemporary guidance prioritizes more severe acidosis and avoiding over-correction.',
    inputs: [
      numberInput('hco3', 'Serum HCO₃⁻ or total CO₂', { unit: 'mEq/L', min: 5, max: 40, step: 0.1, defaultValue: 20 }),
      selectInput('stage', 'CKD stage (context)', [
        { label: 'G3', value: 'g3' },
        { label: 'G4', value: 'g4' },
        { label: 'G5 ND', value: 'g5' },
        { label: 'Dialysis', value: 'dialysis' },
      ]),
      yesNo('symptoms', 'Symptoms possibly related to acidosis (fatigue, dyspnea)'),
    ],
    calculate(values) {
      const hco3 = num(values.hco3, 20);
      const stage = str(values.stage, 'g3');
      const sx = bool(values.symptoms);
      let label = '';
      let riskLevel: 'normal' | 'low' | 'moderate' | 'high' | 'info' = 'info';
      let interpretation = '';

      if (stage === 'dialysis') {
        label = 'Dialysis context';
        riskLevel = hco3 < 18 ? 'moderate' : 'info';
        interpretation = `HCO₃ ${hco3} mEq/L on dialysis — pre/post dialysis values differ; manage via dialysate bath and oral alkali per nephrology protocol rather than non-dialysis thresholds alone.`;
      } else if (hco3 < 18) {
        label = 'Below common treatment threshold (low)';
        riskLevel = 'high';
        interpretation = `HCO₃ ${hco3} mEq/L — clearly below the common KDIGO-oriented threshold (<22) for considering alkali therapy in non-dialysis CKD. Evaluate cause (RTA, diarrhea, residual AG acidosis) and consider oral bicarb if no contraindication.`;
      } else if (hco3 < 22) {
        label = 'Below 22 — consider alkali';
        riskLevel = 'moderate';
        interpretation = `HCO₃ ${hco3} mEq/L — KDIGO suggests considering treatment when HCO₃ <22 mEq/L in CKD to maintain in normal range, unless contraindicated. ${sx ? 'Symptoms present — lower threshold to act.' : 'Individualize vs volume overload/HTN risk from sodium load.'}`;
      } else if (hco3 <= 26) {
        label = 'Within common target range';
        riskLevel = 'normal';
        interpretation = `HCO₃ ${hco3} mEq/L — within common normal/target range for CKD alkali goals. Monitor serially as eGFR declines.`;
      } else {
        label = 'High-normal / elevated HCO₃';
        riskLevel = 'low';
        interpretation = `HCO₃ ${hco3} mEq/L — not an alkali-treatment indication; consider contraction alkalosis, diuretics, or volume issues if elevated.`;
      }
      return {
        score: hco3,
        unit: 'mEq/L',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Common threshold', value: 'Consider alkali if HCO₃ <22 (non-dialysis CKD)' },
          { label: 'Stage', value: stage },
          { label: 'Symptoms flagged', value: sx ? 'Yes' : 'No' },
        ],
      };
    },
    evidence: {
      summary: 'KDIGO CKD guidance: suggest treating chronic metabolic acidosis when HCO₃ <22 mEq/L to maintain HCO₃ in normal range, unless contraindicated.',
      formula: 'Threshold check: HCO₃ < 22 mEq/L → consider alkali therapy',
      validation: 'Guideline-based educational threshold; RCTs mixed on hard outcomes — individualize sodium load and HTN risk.',
      references: [
        {
          title: 'KDIGO CKD evaluation and management (metabolic acidosis recommendations)',
          citation: 'KDIGO CKD guidelines',
          year: 2024,
          url: 'https://kdigo.org/guidelines/ckd-evaluation-and-management/',
        },
      ],
    },
    nextSteps: [
      { condition: 'HCO₃ <18 (or persistently low) in CKD ND', actions: ['Confirm on venous total CO₂', 'Consider oral alkali ± dietary acid reduction if appropriate', 'Monitor BP, edema, and avoid over-correction'] },
    ],
    pearls: [
      'Sodium bicarbonate adds sodium load — caution in uncontrolled HTN or edema.',
      'Exclude respiratory alkalosis compensation misread as “high HCO₃ goal.”',
    ],
  },

  // 19. Mayo endoscopic score UC
  {
    id: 'mayo-score-uc',
    name: 'Mayo Endoscopic Score (Ulcerative Colitis)',
    shortName: 'Mayo Endo',
    description: 'Mayo endoscopic subscore for ulcerative colitis mucosal appearance (0–3).',
    category: 'gastroenterology',
    tags: ['ulcerative colitis', 'mayo', 'endoscopy', 'ibd', 'mucosal healing'],
    whenToUse: 'Colonoscopy/sigmoidoscopy grading of UC inflammatory activity.',
    whyUse: 'Standard endoscopic endpoint in trials and treat-to-target strategies (0–1 often “endoscopic improvement”).',
    inputs: [
      selectInput('endo', 'Endoscopic findings', [
        { label: '0 — Normal or inactive disease', value: 0 },
        { label: '1 — Mild (erythema, decreased vascular pattern, mild friability)', value: 1 },
        { label: '2 — Moderate (marked erythema, absent vascular pattern, friability, erosions)', value: 2 },
        { label: '3 — Severe (spontaneous bleeding, ulceration)', value: 3 },
      ]),
    ],
    calculate(values) {
      const score = num(values.endo, 0);
      const map: Record<number, { label: string; riskLevel: 'normal' | 'low' | 'moderate' | 'high'; interpretation: string }> = {
        0: {
          label: 'Score 0 — Inactive / normal',
          riskLevel: 'normal',
          interpretation: 'Mayo endoscopic 0: normal or inactive mucosa. Consistent with endoscopic remission.',
        },
        1: {
          label: 'Score 1 — Mild',
          riskLevel: 'low',
          interpretation: 'Mayo endoscopic 1: mild activity. Often grouped with 0 as endoscopic improvement in trials; clinical context still matters.',
        },
        2: {
          label: 'Score 2 — Moderate',
          riskLevel: 'moderate',
          interpretation: 'Mayo endoscopic 2: moderate endoscopic activity — typically warrants therapy optimization.',
        },
        3: {
          label: 'Score 3 — Severe',
          riskLevel: 'high',
          interpretation: 'Mayo endoscopic 3: severe activity with ulceration/spontaneous bleeding — escalate therapy; rule out infection (C. diff, CMV) when appropriate.',
        },
      };
      const m = map[score] ?? map[0];
      return { score, unit: 'points', ...m };
    },
    evidence: {
      summary: 'Mayo endoscopic subscore 0–3 based on mucosal appearance. Component of full Mayo score with stool frequency, bleeding, and PGA.',
      validation: 'Widely used in UC trials; central reading reduces variability.',
      references: [
        {
          title: 'Coated oral 5-aminosalicylic acid therapy for mildly to moderately active ulcerative colitis (Mayo score)',
          citation: 'Schroeder KW et al. N Engl J Med. 1987',
          year: 1987,
          pmid: '3317057',
          doi: '10.1056/NEJM198712243172603',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score ≥2', actions: ['Optimize UC therapy', 'Stool infection studies if flare', 'Discuss treat-to-target with patient'] },
      { condition: 'Score 0–1', actions: ['Maintain therapy', 'Surveillance intervals per guidelines'] },
    ],
    pearls: ['Full clinical Mayo also includes stool frequency, rectal bleeding, and physician global assessment.'],
  },

  // 20. Partial Mayo
  {
    id: 'partial-mayo',
    name: 'Partial Mayo Score (Ulcerative Colitis)',
    shortName: 'Partial Mayo',
    description: 'Non-invasive Mayo components: stool frequency, rectal bleeding, and physician global assessment (0–9).',
    category: 'gastroenterology',
    tags: ['ulcerative colitis', 'mayo', 'partial mayo', 'ibd', 'activity'],
    whenToUse: 'Clinic follow-up of UC activity without endoscopy.',
    whyUse: 'Correlates with full Mayo and guides response assessment between scopes.',
    inputs: [
      selectInput('stool', 'Stool frequency', [
        { label: '0 — Normal number of stools', value: 0 },
        { label: '1 — 1–2 stools more than normal', value: 1 },
        { label: '2 — 3–4 stools more than normal', value: 2 },
        { label: '3 — ≥5 stools more than normal', value: 3 },
      ]),
      selectInput('bleed', 'Rectal bleeding', [
        { label: '0 — None', value: 0 },
        { label: '1 — Streaks of blood with stool less than half the time', value: 1 },
        { label: '2 — Obvious blood with stool most of the time', value: 2 },
        { label: '3 — Blood alone passes', value: 3 },
      ]),
      selectInput('pga', 'Physician global assessment', [
        { label: '0 — Normal', value: 0 },
        { label: '1 — Mild disease', value: 1 },
        { label: '2 — Moderate disease', value: 2 },
        { label: '3 — Severe disease', value: 3 },
      ]),
    ],
    calculate(values) {
      const score = num(values.stool, 0) + num(values.bleed, 0) + num(values.pga, 0);
      const r = riskFromThresholds(score, [
        {
          max: 1,
          level: 'normal',
          label: 'Remission (0–1)',
          interpretation: `Partial Mayo ${score}: commonly classified as clinical remission (0–1). Confirm with biomarkers/endoscopy when making major therapy decisions.`,
        },
        {
          max: 4,
          level: 'low',
          label: 'Mild activity (2–4)',
          interpretation: `Partial Mayo ${score}: mild activity. Optimize maintenance; reassess adherence and triggers.`,
        },
        {
          max: 6,
          level: 'moderate',
          label: 'Moderate activity (5–6)',
          interpretation: `Partial Mayo ${score}: moderate activity — consider therapy escalation and rule out infection.`,
        },
        {
          max: 9,
          level: 'high',
          label: 'Severe activity (7–9)',
          interpretation: `Partial Mayo ${score}: severe clinical activity — urgent IBD management; consider hospitalization criteria for acute severe UC if applicable.`,
        },
      ]);
      return {
        score,
        unit: 'points',
        ...r,
        details: [
          { label: 'Stool frequency', value: String(num(values.stool, 0)) },
          { label: 'Rectal bleeding', value: String(num(values.bleed, 0)) },
          { label: 'PGA', value: String(num(values.pga, 0)) },
        ],
      };
    },
    evidence: {
      summary: 'Partial Mayo = stool frequency (0–3) + rectal bleeding (0–3) + PGA (0–3); range 0–9. Remission often ≤1; excludes endoscopic subscore.',
      formula: 'Partial Mayo = stool + bleeding + PGA (each 0–3)',
      validation: 'Widely used for non-invasive UC monitoring; thresholds vary slightly by trial.',
      references: [
        {
          title: 'Coated oral 5-aminosalicylic acid therapy for UC (Mayo score derivation context)',
          citation: 'Schroeder KW et al. N Engl J Med. 1987',
          year: 1987,
          pmid: '3317057',
          doi: '10.1056/NEJM198712243172603',
        },
      ],
    },
    nextSteps: [
      { condition: 'Score ≥5', actions: ['Escalate or bridge therapy per IBD specialist', 'CRP/fecal calprotectin', 'Exclude C. difficile'] },
      { condition: 'Remission', actions: ['Maintain therapy', 'Surveillance planning'] },
    ],
    pearls: ['PGA should reflect overall clinical status, not only patient-reported symptoms.'],
  },

  // 21. SCCAI
  {
    id: 'sccai',
    name: 'Simple Clinical Colitis Activity Index (SCCAI)',
    shortName: 'SCCAI',
    description: 'Walmsley SCCAI for ulcerative colitis clinical activity (symptoms + extracolonic features).',
    category: 'gastroenterology',
    tags: ['sccai', 'ulcerative colitis', 'ibd', 'walmsley', 'activity'],
    whenToUse: 'Quantify UC clinical activity in clinic without endoscopy.',
    whyUse: 'Simple, validated symptom score; remission often SCCAI <3.',
    inputs: [
      selectInput('dayFreq', 'Bowel frequency (day)', [
        { label: '0 — 0–3', value: 0 },
        { label: '1 — 4–6', value: 1 },
        { label: '2 — 7–9', value: 2 },
        { label: '3 — >9', value: 3 },
      ]),
      selectInput('nightFreq', 'Bowel frequency (night)', [
        { label: '0 — 0', value: 0 },
        { label: '1 — 1–3', value: 1 },
        { label: '2 — ≥4', value: 2 },
      ]),
      selectInput('urgency', 'Urgency of defecation', [
        { label: '0 — None', value: 0 },
        { label: '1 — Hurry', value: 1 },
        { label: '2 — Immediately', value: 2 },
        { label: '3 — Incontinence', value: 3 },
      ]),
      selectInput('blood', 'Blood in stool', [
        { label: '0 — None', value: 0 },
        { label: '1 — Trace', value: 1 },
        { label: '2 — Occasionally frank', value: 2 },
        { label: '3 — Usually frank', value: 3 },
      ]),
      selectInput('wellbeing', 'General well-being', [
        { label: '0 — Very well', value: 0 },
        { label: '1 — Slightly below par', value: 1 },
        { label: '2 — Poor', value: 2 },
        { label: '3 — Very poor', value: 3 },
        { label: '4 — Terrible', value: 4 },
      ]),
      yesNo('exColitis', 'Extracolonic features present (arthritis, uveitis, erythema nodosum, pyoderma, etc.)', 1),
    ],
    calculate(values) {
      const score =
        num(values.dayFreq, 0) +
        num(values.nightFreq, 0) +
        num(values.urgency, 0) +
        num(values.blood, 0) +
        num(values.wellbeing, 0) +
        (bool(values.exColitis) ? 1 : 0);
      const r = riskFromThresholds(score, [
        {
          max: 2,
          level: 'normal',
          label: 'Remission (<3)',
          interpretation: `SCCAI ${score}: typically remission (often defined as <3). Continue maintenance and monitoring.`,
        },
        {
          max: 5,
          level: 'low',
          label: 'Mild activity',
          interpretation: `SCCAI ${score}: mild clinical activity — optimize therapy and reassess soon.`,
        },
        {
          max: 10,
          level: 'moderate',
          label: 'Moderate activity',
          interpretation: `SCCAI ${score}: moderate activity — consider escalation and objective inflammation markers.`,
        },
        {
          max: 20,
          level: 'high',
          label: 'Severe activity',
          interpretation: `SCCAI ${score}: severe symptom burden — urgent IBD review; evaluate for acute severe UC if systemic features.`,
        },
      ]);
      return { score, unit: 'points', ...r };
    },
    evidence: {
      summary:
        'SCCAI sums day frequency (0–3), night frequency (0–2), urgency (0–3), blood (0–3), well-being (0–4), plus 1 if extracolonic features. Remission often <3.',
      formula: 'SCCAI = day + night + urgency + blood + wellbeing + extracolonic',
      validation: 'Walmsley 1998; correlates with other UC activity indices.',
      references: [
        {
          title: 'A simple clinical colitis activity index',
          citation: 'Walmsley RS et al. Gut. 1998',
          year: 1998,
          pmid: '9771402',
          doi: '10.1136/gut.43.1.29',
        },
      ],
    },
    nextSteps: [
      { condition: 'SCCAI ≥5', actions: ['Calprotectin/CRP', 'Therapy review', 'Infection screen if flare'] },
    ],
    pearls: ['Extracolonic point is binary in original scoring (present/absent), not per manifestation count in this simplified tool.'],
  },

  // 22. Harvey-Bradshaw Index
  {
    id: 'harvey-bradshaw',
    name: 'Harvey–Bradshaw Index (Crohn Disease)',
    shortName: 'HBI',
    description: 'Simple clinical Crohn disease activity index (Harvey–Bradshaw).',
    category: 'gastroenterology',
    tags: ['crohn', 'hbi', 'harvey-bradshaw', 'ibd', 'activity'],
    whenToUse: 'Clinic assessment of Crohn disease symptom activity.',
    whyUse: 'Faster alternative to full CDAI; remission often HBI ≤4.',
    inputs: [
      selectInput('wellbeing', 'General well-being (yesterday)', [
        { label: '0 — Very well', value: 0 },
        { label: '1 — Slightly below par', value: 1 },
        { label: '2 — Poor', value: 2 },
        { label: '3 — Very poor', value: 3 },
        { label: '4 — Terrible', value: 4 },
      ]),
      selectInput('pain', 'Abdominal pain (yesterday)', [
        { label: '0 — None', value: 0 },
        { label: '1 — Mild', value: 1 },
        { label: '2 — Moderate', value: 2 },
        { label: '3 — Severe', value: 3 },
      ]),
      numberInput('liquidStools', 'Number of liquid stools (yesterday)', { min: 0, max: 30, defaultValue: 1 }),
      selectInput('mass', 'Abdominal mass', [
        { label: '0 — None', value: 0 },
        { label: '1 — Dubious', value: 1 },
        { label: '2 — Definite', value: 2 },
        { label: '3 — Definite and tender', value: 3 },
      ]),
      yesNo('arthralgia', 'Arthralgia', 1),
      yesNo('uveitis', 'Uveitis', 1),
      yesNo('erythemaNodosum', 'Erythema nodosum', 1),
      yesNo('aphthous', 'Aphthous ulcers', 1),
      yesNo('pyoderma', 'Pyoderma gangrenosum', 1),
      yesNo('analFissure', 'Anal fissure', 1),
      yesNo('newFistula', 'New fistula', 1),
      yesNo('abscess', 'Abscess', 1),
    ],
    calculate(values) {
      const complications =
        (bool(values.arthralgia) ? 1 : 0) +
        (bool(values.uveitis) ? 1 : 0) +
        (bool(values.erythemaNodosum) ? 1 : 0) +
        (bool(values.aphthous) ? 1 : 0) +
        (bool(values.pyoderma) ? 1 : 0) +
        (bool(values.analFissure) ? 1 : 0) +
        (bool(values.newFistula) ? 1 : 0) +
        (bool(values.abscess) ? 1 : 0);
      const score =
        num(values.wellbeing, 0) +
        num(values.pain, 0) +
        num(values.liquidStools, 0) +
        num(values.mass, 0) +
        complications;
      const r = riskFromThresholds(score, [
        {
          max: 4,
          level: 'normal',
          label: 'Remission (≤4)',
          interpretation: `HBI ${score}: clinical remission range (≤4). Correlate with biomarkers and imaging/endoscopy for transmural disease.`,
        },
        {
          max: 7,
          level: 'low',
          label: 'Mild activity (5–7)',
          interpretation: `HBI ${score}: mild clinical activity.`,
        },
        {
          max: 16,
          level: 'moderate',
          label: 'Moderate activity (8–16)',
          interpretation: `HBI ${score}: moderate activity — consider therapy optimization and objective assessment.`,
        },
        {
          max: 100,
          level: 'high',
          label: 'Severe activity (>16)',
          interpretation: `HBI ${score}: severe symptom activity — urgent IBD care; evaluate complications (obstruction, abscess).`,
        },
      ]);
      return {
        score,
        unit: 'points',
        ...r,
        details: [
          { label: 'Liquid stools', value: String(num(values.liquidStools, 0)) },
          { label: 'Complication points', value: String(complications) },
        ],
      };
    },
    evidence: {
      summary:
        'HBI = well-being (0–4) + abdominal pain (0–3) + liquid stools (number) + abdominal mass (0–3) + 1 point per complication category. Remission ≤4.',
      formula: 'HBI = wellbeing + pain + liquid_stools + mass + Σ complications',
      validation: 'Harvey & Bradshaw 1980; correlates with CDAI.',
      references: [
        {
          title: 'A simple index of Crohn\'s-disease activity',
          citation: 'Harvey RF, Bradshaw JM. Lancet. 1980',
          year: 1980,
          pmid: '6102236',
          doi: '10.1016/s0140-6736(80)92767-1',
        },
      ],
    },
    nextSteps: [
      { condition: 'HBI ≥8', actions: ['CRP/calprotectin', 'Cross-sectional imaging if complication suspected', 'Therapy escalation with IBD specialist'] },
    ],
    pearls: ['Symptoms may dissociate from objective inflammation — treat-to-target still needs biomarkers/scopes.'],
  },

  // 23. SES-CD interpretation
  {
    id: 'ses-cd',
    name: 'SES-CD (Simple Endoscopic Score for Crohn Disease)',
    shortName: 'SES-CD',
    description: 'Interprets a total Simple Endoscopic Score for Crohn Disease (enter summed score from endoscopy).',
    category: 'gastroenterology',
    tags: ['ses-cd', 'crohn', 'endoscopy', 'ibd', 'mucosal healing'],
    whenToUse: 'After ileocolonoscopy when SES-CD has been scored by segment.',
    whyUse: 'Standard endoscopic activity metric for Crohn; guides mucosal healing targets.',
    inputs: [
      numberInput('total', 'Total SES-CD', {
        min: 0,
        max: 56,
        defaultValue: 8,
        helpText: 'Sum across ileum + 4 colon segments: ulcers, surface ulcerated, surface affected, stenosis (each 0–3)',
      }),
    ],
    calculate(values) {
      const score = num(values.total, 8);
      const r = riskFromThresholds(score, [
        {
          max: 2,
          level: 'normal',
          label: 'Remission (0–2)',
          interpretation: `SES-CD ${score}: endoscopic remission range (commonly 0–2). Supports deep remission strategies when combined with clinical/biomarker remission.`,
        },
        {
          max: 6,
          level: 'low',
          label: 'Mild (3–6)',
          interpretation: `SES-CD ${score}: mild endoscopic activity.`,
        },
        {
          max: 15,
          level: 'moderate',
          label: 'Moderate (7–15)',
          interpretation: `SES-CD ${score}: moderate endoscopic activity — typically warrants therapy optimization.`,
        },
        {
          max: 56,
          level: 'high',
          label: 'Severe (≥16)',
          interpretation: `SES-CD ${score}: severe endoscopic activity — escalate management; assess complications and nutrition.`,
        },
      ]);
      return {
        score,
        unit: 'points',
        ...r,
        details: [
          { label: 'Remission', value: '0–2' },
          { label: 'Mild / moderate / severe', value: '3–6 / 7–15 / ≥16' },
        ],
      };
    },
    evidence: {
      summary:
        'SES-CD scores 5 ileocolonic segments for ulcer size, ulcerated surface, affected surface, and stenosis (0–3 each). Total interpretation bands commonly: 0–2 remission, 3–6 mild, 7–15 moderate, ≥16 severe.',
      formula: 'Enter total SES-CD from endoscopic scoring sheet',
      validation: 'Daperno et al.; widely used in Crohn trials and practice.',
      references: [
        {
          title: 'Development and validation of a new, simplified endoscopic activity score for Crohn\'s disease: the SES-CD',
          citation: 'Daperno M et al. Gastrointest Endosc. 2004',
          year: 2004,
          pmid: '15472670',
          doi: '10.1016/s0016-5107(04)01878-4',
        },
      ],
    },
    nextSteps: [
      { condition: 'SES-CD ≥7', actions: ['Therapy escalation discussion', 'Rule out stricture complications', 'Nutrition assessment'] },
      { condition: 'SES-CD ≤2', actions: ['Maintain regimen', 'Surveillance per risk'] },
    ],
    pearls: ['This tool interprets a precomputed total — it does not score individual segments.'],
  },

  // 24. IBS-SSS
  {
    id: 'ibs-sss',
    name: 'IBS Symptom Severity Score (IBS-SSS)',
    shortName: 'IBS-SSS',
    description: 'Francis IBS Symptom Severity Score (0–500) for irritable bowel syndrome activity.',
    category: 'gastroenterology',
    tags: ['ibs', 'ibs-sss', 'functional', 'severity', 'rome'],
    whenToUse: 'Quantify IBS symptom burden for baseline and treatment response.',
    whyUse: 'Standardized 0–500 scale used in trials and clinics; 50-point change often clinically meaningful.',
    inputs: [
      numberInput('painSev', 'Abdominal pain severity (0–100 VAS)', { min: 0, max: 100, defaultValue: 40 }),
      numberInput('painDays', 'Number of days with pain in last 10 days', { min: 0, max: 10, defaultValue: 4, helpText: 'Score contribution = days × 10' }),
      numberInput('distension', 'Abdominal distension severity (0–100)', { min: 0, max: 100, defaultValue: 30 }),
      numberInput('bowelSat', 'Satisfaction with bowel habits (0–100; 100 = very unhappy)', {
        min: 0,
        max: 100,
        defaultValue: 50,
        helpText: 'Higher = more dissatisfaction',
      }),
      numberInput('interfere', 'Interference with life in general (0–100)', { min: 0, max: 100, defaultValue: 40 }),
    ],
    calculate(values) {
      const painSev = num(values.painSev, 40);
      const painDays = num(values.painDays, 4);
      const distension = num(values.distension, 30);
      const bowelSat = num(values.bowelSat, 50);
      const interfere = num(values.interfere, 40);
      const score = round(painSev + painDays * 10 + distension + bowelSat + interfere, 0);
      const r = riskFromThresholds(score, [
        {
          max: 74,
          level: 'normal',
          label: 'Remission / minimal (<75)',
          interpretation: `IBS-SSS ${score}: remission or minimal symptoms (<75).`,
        },
        {
          max: 174,
          level: 'low',
          label: 'Mild (75–174)',
          interpretation: `IBS-SSS ${score}: mild IBS severity. Lifestyle, diet (e.g., guided low-FODMAP), and reassurance often first-line.`,
        },
        {
          max: 300,
          level: 'moderate',
          label: 'Moderate (175–300)',
          interpretation: `IBS-SSS ${score}: moderate severity — multimodal therapy (diet, neuromodulators, gut-brain behavioral therapy as indicated).`,
        },
        {
          max: 500,
          level: 'high',
          label: 'Severe (>300)',
          interpretation: `IBS-SSS ${score}: severe symptom burden — specialist care, psychological comorbidity screen, and structured treatment plan.`,
        },
      ]);
      return {
        score,
        unit: 'points',
        ...r,
        details: [
          { label: 'Pain severity', value: String(painSev) },
          { label: 'Pain days component', value: String(painDays * 10) },
          { label: 'Distension', value: String(distension) },
          { label: 'Bowel dissatisfaction', value: String(bowelSat) },
          { label: 'Life interference', value: String(interfere) },
        ],
      };
    },
    evidence: {
      summary:
        'IBS-SSS = pain severity + (pain days × 10) + distension + bowel habit dissatisfaction + life interference (each 0–100 domain; total 0–500). Mild 75–174, moderate 175–300, severe >300; <75 remission.',
      formula: 'IBS-SSS = painVAS + 10×painDays_10d + distension + dissatisfaction + interference',
      validation: 'Francis et al. 1997; ≥50-point change often cited as clinically important.',
      references: [
        {
          title: 'The irritable bowel severity scoring system',
          citation: 'Francis CY et al. Aliment Pharmacol Ther. 1997',
          year: 1997,
          pmid: '9146781',
          doi: '10.1046/j.1365-2036.1997.142318000.x',
        },
      ],
    },
    nextSteps: [
      { condition: 'New/severe symptoms', actions: ['Exclude alarm features', 'Basic labs/celiac screen as indicated', 'Rome-compatible diagnosis'] },
      { condition: 'Moderate–severe', actions: ['Dietitian', 'Pharmacologic symptom control', 'Brain-gut behavioral therapy referral'] },
    ],
    pearls: ['Not a diagnostic test — diagnosis remains clinical after appropriate exclusion of organic disease.'],
  },

  // 25. West Haven hepatic encephalopathy grade
  {
    id: 'west-haven-he',
    name: 'West Haven Hepatic Encephalopathy Grade',
    shortName: 'West Haven',
    description: 'West Haven criteria grading of overt hepatic encephalopathy (0–4).',
    category: 'gastroenterology',
    tags: ['hepatic encephalopathy', 'west haven', 'cirrhosis', 'he', 'liver'],
    whenToUse: 'Grade mental status changes in patients with known or suspected cirrhosis/portosystemic shunting.',
    whyUse: 'Universal clinical grading for HE severity, triage, and response to therapy.',
    inputs: [
      selectInput('grade', 'West Haven grade (select best fit)', [
        {
          label: '0 — No abnormality detected',
          value: 0,
        },
        {
          label: '1 — Trivial lack of awareness; euphoria/anxiety; shortened attention; impaired addition',
          value: 1,
        },
        {
          label: '2 — Lethargy/apathy; disorientation for time; personality change; inappropriate behavior; asterixis',
          value: 2,
        },
        {
          label: '3 — Somnolence to semi-stupor; responsive to stimuli; confusion; gross disorientation',
          value: 3,
        },
        {
          label: '4 — Coma (unresponsive to verbal or noxious stimuli)',
          value: 4,
        },
      ]),
      yesNo('precipitant', 'Precipitant identified (infection, bleed, electrolytes, drugs, constipation)'),
    ],
    calculate(values) {
      const grade = num(values.grade, 0);
      const precip = bool(values.precipitant);
      const map: Record<number, { label: string; riskLevel: 'normal' | 'low' | 'moderate' | 'high' | 'critical'; interpretation: string }> = {
        0: {
          label: 'Grade 0 — No overt HE',
          riskLevel: 'normal',
          interpretation: 'No overt HE on West Haven. Consider covert HE testing (psychometrics) if quality-of-life or driving concerns.',
        },
        1: {
          label: 'Grade I — Mild overt HE',
          riskLevel: 'low',
          interpretation: 'West Haven I: mild cognitive/behavioral changes. Seek precipitants; lactulose titration; counsel safety.',
        },
        2: {
          label: 'Grade II — Moderate overt HE',
          riskLevel: 'moderate',
          interpretation: 'West Haven II: clear neuropsychiatric impairment, often with asterixis. Treat precipitants; lactulose ± rifaximin per practice; observe closely.',
        },
        3: {
          label: 'Grade III — Severe HE',
          riskLevel: 'high',
          interpretation: 'West Haven III: somnolent/confused — hospitalize; airway protection awareness; aggressive precipitant workup (infection, bleed, Na, benzos).',
        },
        4: {
          label: 'Grade IV — Coma',
          riskLevel: 'critical',
          interpretation: 'West Haven IV: coma — ICU-level care, airway management, exclude intracranial events if atypical, treat precipitants and intracranial hypertension risk factors.',
        },
      };
      const m = map[grade] ?? map[0];
      return {
        score: grade,
        unit: 'grade',
        label: m.label,
        interpretation: m.interpretation + (precip ? ' Precipitant flagged — prioritize reversal.' : ' Search systematically for precipitants even if not yet found.'),
        riskLevel: m.riskLevel,
        details: [
          { label: 'West Haven grade', value: String(grade) },
          { label: 'Precipitant flagged', value: precip ? 'Yes' : 'No' },
        ],
      };
    },
    evidence: {
      summary: 'West Haven criteria grade HE from 0 (none) to 4 (coma) based on consciousness, behavior, orientation, and neurologic findings.',
      validation: 'AASLD/EASL HE guidelines standard clinical grading; inter-rater variability highest at low grades.',
      references: [
        {
          title: 'Hepatic encephalopathy in chronic liver disease: 2014 practice guideline (AASLD/EASL)',
          citation: 'Vilstrup H et al. Hepatology. 2014',
          year: 2014,
          pmid: '25042402',
          doi: '10.1002/hep.27210',
        },
      ],
    },
    nextSteps: [
      { condition: 'Grade ≥2', actions: ['Hospital observation or admission', 'Lactulose (and rifaximin as indicated)', 'Workup infection, GIB, electrolytes, constipation, sedatives'] },
      { condition: 'Grade 3–4', actions: ['Airway assessment', 'ICU consideration', 'CT head if focal signs/trauma/uncertain diagnosis'] },
    ],
    pearls: [
      'Asterixis is supportive but not required at every grade.',
      'Overt HE is a decompensating event — address transplant candidacy and secondary prophylaxis.',
    ],
  },
];
