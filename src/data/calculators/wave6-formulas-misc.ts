import type { Calculator } from '../../types/calculator';
import { num, bool, round, yesNo, selectInput, numberInput, riskFromThresholds } from '../../utils/helpers';

// Keep shared helpers type-checked even if a given calc omits some.
const _sharedHelpers = { bool, yesNo, riskFromThresholds };
void _sharedHelpers;

export const wave6FormulasMiscCalcs: Calculator[] = [
  // ─── 1. Devine IBW (explicit) ──────────────────────────────────────────────
  {
    id: 'devine-ibw',
    name: 'Devine Ideal Body Weight (Explicit)',
    shortName: 'Devine IBW',
    description: 'Ideal body weight by the classic Devine equations with height shown in cm and inches.',
    category: 'general',
    tags: ['ibw', 'devine', 'dosing', 'weight', 'ideal body weight'],
    whenToUse: 'Pharmacy-style IBW for selected drug dosing and nutrition estimates in adults.',
    whyUse: 'Makes the inch-over-5-ft Devine arithmetic explicit for teaching and double-checks.',
    inputs: [
      numberInput('height', 'Height', { unit: 'cm', min: 140, max: 230, defaultValue: 170, helpText: 'Enter cm; converted internally to inches over 5 ft (60 in).' }),
      selectInput('sex', 'Sex', [
        { label: 'Male', value: 'M' },
        { label: 'Female', value: 'F' },
      ]),
    ],
    calculate(values) {
      const cm = num(values.height, 170);
      const inches = cm / 2.54;
      const over5ft = Math.max(0, inches - 60);
      const base = values.sex === 'F' ? 45.5 : 50;
      const ibw = base + 2.3 * over5ft;
      const ibwR = round(ibw, 1);
      const short =
        inches < 60
          ? ' Height <60 in: formula uses only the sex-specific base (no negative inch term).'
          : '';
      return {
        score: ibwR,
        unit: 'kg',
        label: 'Devine ideal body weight',
        interpretation: `Devine IBW ≈ ${ibwR} kg (${values.sex === 'F' ? '♀ 45.5' : '♂ 50'} + 2.3×${round(over5ft, 1)} in over 5 ft). Height ${cm} cm ≈ ${round(inches, 1)} in.${short} For obesity, many drugs use AdjBW = IBW + 0.4×(TBW−IBW).`,
        riskLevel: 'info',
        details: [
          { label: 'Height', value: `${cm} cm (${round(inches, 1)} in)` },
          { label: 'Inches over 5 ft', value: String(round(over5ft, 1)) },
          { label: 'Base weight', value: `${base} kg` },
          { label: 'Sex', value: values.sex === 'F' ? 'Female' : 'Male' },
        ],
      };
    },
    evidence: {
      summary: 'Devine (1974): Men 50 kg + 2.3 kg per inch over 5 ft; Women 45.5 kg + 2.3 kg per inch over 5 ft.',
      formula: 'IBW_♂ = 50 + 2.3·(in−60); IBW_♀ = 45.5 + 2.3·(in−60); in = cm/2.54',
      validation: 'Widely used clinical pharmacy standard; not a measure of “healthy” weight.',
      references: [
        {
          title: 'Gentamicin therapy (Case Number 25; Devine ideal body weight)',
          citation: 'McCarron MM, Devine BJ. Drug Intell Clin Pharm. 1974;8:650-655',
          year: 1974,
          doi: '10.1177/106002807400801104',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Obesity dosing',
        actions: ['Compute AdjBW when indicated', 'Confirm drug-specific weight scalar in monograph'],
      },
    ],
    pearls: [
      'Devine was derived for aminoglycoside dosing context — not universal for all drugs.',
      'Very short adults: institutional policies may use different floors.',
    ],
  },

  // ─── 2. Rohrer index ───────────────────────────────────────────────────────
  {
    id: 'rohrer-index',
    name: 'Rohrer Index (Ponderal Index)',
    shortName: 'Rohrer',
    description: 'Rohrer / ponderal index = weight / height³ — body mass relative to cubic height.',
    category: 'endocrinology',
    tags: ['rohrer', 'ponderal index', 'adiposity', 'anthropometry'],
    whenToUse: 'Anthropometric assessment when a height³-normalized mass index is preferred to BMI.',
    whyUse: 'Classic alternative to BMI; used in pediatrics (esp. neonatal proportionality/IUGR) and body-composition research.',
    inputs: [
      numberInput('weight', 'Weight', { unit: 'kg', min: 1, max: 400, step: 0.1, defaultValue: 70 }),
      numberInput('height', 'Height', { unit: 'cm', min: 40, max: 230, defaultValue: 170 }),
    ],
    calculate(values) {
      const w = num(values.weight, 70);
      const hCm = num(values.height, 170);
      const hM = hCm / 100;
      if (hM <= 0) {
        return { score: '—', label: 'Invalid height', interpretation: 'Height must be positive.', riskLevel: 'info' };
      }
      // kg / m³ (common SI form of ponderal/Rohrer index)
      const ri = w / (hM * hM * hM);
      const riR = round(ri, 1);
      // Classic g/cm³×100 form: 100 × g / cm³
      const classic = round((100 * (w * 1000)) / (hCm * hCm * hCm), 2);
      const r = riskFromThresholds(ri, [
        {
          max: 11,
          level: 'moderate',
          label: 'Lower mass-for-height³',
          interpretation: `Rohrer index ${riR} kg/m³ (classic ≈ ${classic}). Relatively low mass for height³ — clinical correlation for undernutrition if unexpected.`,
        },
        {
          max: 14,
          level: 'normal',
          label: 'Mid-range Rohrer index',
          interpretation: `Rohrer index ${riR} kg/m³ (classic 100·g/cm³ ≈ ${classic}). Mid educational range; not a diagnostic cut-point system like WHO BMI.`,
        },
        {
          max: 17,
          level: 'moderate',
          label: 'Elevated mass-for-height³',
          interpretation: `Rohrer index ${riR} kg/m³ (classic ≈ ${classic}). Elevated vs typical adult mid-range — interpret with BMI, waist, and body composition.`,
        },
        {
          max: 99,
          level: 'high',
          label: 'High mass-for-height³',
          interpretation: `Rohrer index ${riR} kg/m³ (classic ≈ ${classic}). High cubic-height–normalized mass; assess adiposity and metabolic risk comprehensively.`,
        },
      ]);
      return {
        score: riR,
        unit: 'kg/m³',
        ...r,
        details: [
          { label: 'Weight', value: `${w} kg` },
          { label: 'Height', value: `${hCm} cm` },
          { label: 'Classic form (100·g/cm³)', value: String(classic) },
        ],
      };
    },
    evidence: {
      summary: 'Rohrer (ponderal) index = mass / height³. Reported here as kg/m³; classic teaching form often 100 × weight(g) / height(cm)³.',
      formula: 'RI = kg / m³ = w / (h_m)³; classic = 100·(w_g)/(h_cm)³',
      validation: 'Historical anthropometric index; cutoffs less standardized than BMI for clinical labeling.',
      references: [
        {
          title: 'Der Index der Körperfülle als Maß des Ernährungszustandes',
          citation: 'Rohrer F. Münch Med Wochenschr. 1921;68:580-582',
          year: 1921,
        },
      ],
    },
    nextSteps: [
      { condition: 'Elevated index', actions: ['Pair with BMI and waist measures', 'Metabolic risk screen as indicated'] },
    ],
    pearls: [
      'Unlike BMI (height²), Rohrer uses height³ — more sensitive to height differences.',
      'Neonatal “ponderal index” is related but often reported as g/cm³ × 100.',
    ],
  },

  // ─── 3. Relative fat mass (RFM) ────────────────────────────────────────────
  {
    id: 'relative-fat-mass',
    name: 'Relative Fat Mass (RFM)',
    shortName: 'RFM',
    description: 'Estimates whole-body fat percentage from height-to-waist ratio (Woolcott–Bergman).',
    category: 'endocrinology',
    tags: ['rfm', 'body fat', 'waist', 'adiposity', 'relative fat mass'],
    whenToUse: 'Bedside estimate of % body fat without scales or skinfolds.',
    whyUse: 'Often tracks DXA %fat better than BMI in validation cohorts; sex-specific equations.',
    inputs: [
      numberInput('height', 'Height', { unit: 'cm', min: 120, max: 230, defaultValue: 170 }),
      numberInput('waist', 'Waist circumference', {
        unit: 'cm',
        min: 40,
        max: 200,
        step: 0.5,
        defaultValue: 90,
        helpText: 'Midpoint between lower rib and iliac crest (WHO), at end-expiration, standing — or a protocol-consistent site',
      }),
      selectInput('sex', 'Sex', [
        { label: 'Male', value: 'M' },
        { label: 'Female', value: 'F' },
      ]),
    ],
    calculate(values) {
      const h = num(values.height, 170);
      const wc = num(values.waist, 90);
      if (wc <= 0 || h <= 0) {
        return { score: '—', label: 'Invalid inputs', interpretation: 'Height and waist must be positive.', riskLevel: 'info' };
      }
      const ratio = h / wc;
      const rfm = values.sex === 'F' ? 76 - 20 * ratio : 64 - 20 * ratio;
      const rfmR = round(rfm, 1);
      const female = values.sex === 'F';
      const r = female
        ? riskFromThresholds(rfm, [
            {
              max: 32,
              level: 'normal',
              label: 'Lower / fitness-range RFM (♀ educational)',
              interpretation: `RFM ${rfmR}% (women). Educational body-fat estimate — not a DXA substitute.`,
            },
            {
              max: 39,
              level: 'moderate',
              label: 'Elevated RFM (♀)',
              interpretation: `RFM ${rfmR}%. Elevated adiposity estimate for women — assess metabolic risk and lifestyle factors.`,
            },
            {
              max: 100,
              level: 'high',
              label: 'High RFM (♀)',
              interpretation: `RFM ${rfmR}%. High estimated body fat — comprehensive obesity/metabolic evaluation.`,
            },
          ])
        : riskFromThresholds(rfm, [
            {
              max: 22,
              level: 'normal',
              label: 'Lower / fitness-range RFM (♂ educational)',
              interpretation: `RFM ${rfmR}% (men). Educational body-fat estimate — not a DXA substitute.`,
            },
            {
              max: 29,
              level: 'moderate',
              label: 'Elevated RFM (♂)',
              interpretation: `RFM ${rfmR}%. Elevated adiposity estimate for men — assess cardiometabolic risk.`,
            },
            {
              max: 100,
              level: 'high',
              label: 'High RFM (♂)',
              interpretation: `RFM ${rfmR}%. High estimated body fat — comprehensive risk assessment.`,
            },
          ]);
      return {
        score: rfmR,
        unit: '% fat',
        ...r,
        details: [
          { label: 'Height / waist', value: round(ratio, 2).toString() },
          { label: 'Equation', value: female ? '76 − 20×(H/WC)' : '64 − 20×(H/WC)' },
        ],
      };
    },
    evidence: {
      summary: 'RFM: men 64 − 20×(height/waist); women 76 − 20×(height/waist). Same linear units for height and waist.',
      formula: 'RFM_♂ = 64 − 20·(H/WC); RFM_♀ = 76 − 20·(H/WC)',
      validation: 'Woolcott & Bergman (2018) developed against DXA; performance varies by ethnicity and age.',
      references: [
        {
          title: 'Relative fat mass (RFM) as an estimator of whole-body fat percentage',
          citation: 'Woolcott OO, Bergman RN. Sci Rep. 2018',
          year: 2018,
          pmid: '30030479',
          doi: '10.1038/s41598-018-29362-1',
        },
      ],
    },
    nextSteps: [
      { condition: 'Elevated RFM', actions: ['Waist and metabolic labs', 'Lifestyle counseling', 'Consider formal body composition if management hinges on %fat'] },
    ],
    pearls: [
      'Waist measurement site changes the result — be consistent.',
      'Pregnancy, ascites, and lipodystrophy invalidate simple anthropometry.',
    ],
  },

  // ─── 4. Waist-to-height ratio ───────────────────────────────────────────────
  {
    id: 'waist-height-ratio',
    name: 'Waist-to-Height Ratio (WHtR)',
    shortName: 'WHtR',
    description: 'Waist circumference divided by height with simple cardiometabolic risk bands.',
    category: 'endocrinology',
    tags: ['whtr', 'waist', 'height', 'metabolic risk', 'central obesity'],
    whenToUse: 'Screening central adiposity and cardiometabolic risk across BMI categories.',
    whyUse: '“Keep your waist to less than half your height” teaching rule; often adds risk info beyond BMI alone.',
    inputs: [
      numberInput('waist', 'Waist circumference', { unit: 'cm', min: 40, max: 200, step: 0.5, defaultValue: 90, helpText: 'Midpoint between lower rib and iliac crest (WHO), at end-expiration, standing — or a protocol-consistent site' }),
      numberInput('height', 'Height', { unit: 'cm', min: 100, max: 230, defaultValue: 170 }),
    ],
    calculate(values) {
      const wc = num(values.waist, 90);
      const h = num(values.height, 170);
      if (h <= 0) {
        return { score: '—', label: 'Invalid height', interpretation: 'Height must be positive.', riskLevel: 'info' };
      }
      const whtr = round(wc / h, 3);
      const half = round(h / 2, 1);
      const r = riskFromThresholds(whtr, [
        {
          max: 0.4,
          level: 'moderate',
          label: 'Very low WHtR',
          interpretation: `WHtR ${whtr}. Very low ratio — consider nutritional status if clinically thin; still not a complete risk screen.`,
        },
        {
          max: 0.49,
          level: 'low',
          label: 'Lower risk band (WHtR <0.5)',
          interpretation: `WHtR ${whtr}. Below the common 0.5 threshold (“waist < half height”; half height = ${half} cm). Lower central-adiposity risk band educationally.`,
        },
        {
          max: 0.59,
          level: 'moderate',
          label: 'Increased risk (WHtR 0.5–0.59)',
          interpretation: `WHtR ${whtr}. At/above 0.5 — increased cardiometabolic risk band in many public-health frameworks. Target waist < ${half} cm for the “half height” rule.`,
        },
        {
          max: 2,
          level: 'high',
          label: 'High risk (WHtR ≥0.6)',
          interpretation: `WHtR ${whtr}. Substantially elevated central adiposity marker — prioritize metabolic syndrome assessment and risk-factor control.`,
        },
      ]);
      return {
        score: whtr,
        unit: 'ratio',
        ...r,
        details: [
          { label: 'Waist', value: `${wc} cm` },
          { label: 'Height', value: `${h} cm` },
          { label: 'Half height', value: `${half} cm` },
        ],
      };
    },
    evidence: {
      summary: 'WHtR = waist (cm) / height (cm). Common action level ≥0.5; higher risk often cited around ≥0.6.',
      formula: 'WHtR = WC / height',
      validation: 'Supported in multiple epidemiologic analyses as a simple central obesity marker; cutoffs may vary by age/ethnicity.',
      references: [
        {
          title: "Waist-to-height ratio as an indicator of 'early health risk': simpler and more predictive than using a 'matrix' based on BMI and waist circumference",
          citation: 'Ashwell M, Gibson S. BMJ Open. 2016',
          year: 2016,
          pmid: '26975935',
          doi: '10.1136/bmjopen-2015-010159',
        },
      ],
    },
    nextSteps: [
      { condition: 'WHtR ≥0.5', actions: ['BP, lipids, glucose/A1c', 'Lifestyle intervention', 'Assess other obesity complications'] },
    ],
    pearls: [
      'Works in children and adults with age-appropriate interpretation.',
      'Does not replace BMI for underweight detection alone.',
    ],
  },

  // ─── 5. A Body Shape Index (ABSI) ──────────────────────────────────────────
  {
    id: 'a-body-shape',
    name: 'A Body Shape Index (ABSI)',
    shortName: 'ABSI',
    description: 'Krakauer ABSI: waist circumference normalized to BMI and height — body-shape risk marker.',
    category: 'endocrinology',
    tags: ['absi', 'body shape', 'waist', 'bmi', 'mortality risk'],
    whenToUse: 'When waist-based risk independent of BMI bulk is of interest.',
    whyUse: 'Higher ABSI (more central shape for a given BMI) associates with mortality risk in population studies.',
    inputs: [
      numberInput('waist', 'Waist circumference', { unit: 'cm', min: 40, max: 200, step: 0.5, defaultValue: 90, helpText: 'Midpoint between lower rib and iliac crest (WHO), at end-expiration, standing — or a protocol-consistent site' }),
      numberInput('weight', 'Weight', { unit: 'kg', min: 30, max: 400, step: 0.1, defaultValue: 80 }),
      numberInput('height', 'Height', { unit: 'cm', min: 120, max: 230, defaultValue: 170 }),
    ],
    calculate(values) {
      const wcM = num(values.waist, 90) / 100;
      const w = num(values.weight, 80);
      const hM = num(values.height, 170) / 100;
      if (wcM <= 0 || hM <= 0 || w <= 0) {
        return { score: '—', label: 'Invalid inputs', interpretation: 'Enter positive waist, weight, and height.', riskLevel: 'info' };
      }
      const bmi = w / (hM * hM);
      const absi = wcM / (Math.pow(bmi, 2 / 3) * Math.pow(hM, 1 / 2));
      const absiR = round(absi, 5);
      // Population means often ~0.08; educational bands only
      const r = riskFromThresholds(absi, [
        {
          max: 0.075,
          level: 'low',
          label: 'Lower ABSI (more “compact” shape)',
          interpretation: `ABSI ${absiR}. Lower body-shape index relative to typical adult means (~0.08) — less central shape for BMI/height; not a green light for all risk.`,
        },
        {
          max: 0.083,
          level: 'normal',
          label: 'Mid-range ABSI',
          interpretation: `ABSI ${absiR}. Near common adult mid-range. Use with BMI, metabolic labs, and clinical context.`,
        },
        {
          max: 0.09,
          level: 'moderate',
          label: 'Elevated ABSI',
          interpretation: `ABSI ${absiR}. Higher central shape for given BMI — associated with higher mortality risk in cohort data; risk-factor review advised.`,
        },
        {
          max: 0.2,
          level: 'high',
          label: 'High ABSI',
          interpretation: `ABSI ${absiR}. High body-shape index — prioritize central adiposity and cardiometabolic workup.`,
        },
      ]);
      return {
        score: absiR,
        unit: 'm·(kg/m²)^(−2/3)',
        ...r,
        details: [
          { label: 'BMI', value: `${round(bmi, 1)} kg/m²` },
          { label: 'Waist', value: `${round(wcM * 100, 1)} cm` },
          { label: 'Height', value: `${round(hM * 100, 0)} cm` },
        ],
      };
    },
    evidence: {
      summary: 'ABSI = WC / (BMI^(2/3) × height^(1/2)) with WC and height in meters, BMI in kg/m² (Krakauer & Krakauer 2012).',
      formula: 'ABSI = WC_m / (BMI^(2/3) · √height_m)',
      validation: 'Linked to premature mortality independent of BMI in NHANES analyses; not a bedside diagnostic cut-score system.',
      references: [
        {
          title: 'A new body shape index predicts mortality hazard independently of BMI',
          citation: 'Krakauer NY, Krakauer JC. PLoS One. 2012',
          year: 2012,
          pmid: '22815707',
          doi: '10.1371/journal.pone.0039504',
        },
      ],
    },
    nextSteps: [
      { condition: 'Elevated ABSI', actions: ['Metabolic syndrome components', 'Lifestyle / weight distribution counseling'] },
    ],
    pearls: [
      'Not the same as the burn Abbreviated Burn Severity Index (ABSI).',
      'z-score ABSI vs age/sex norms is used in research more than raw ABSI alone.',
    ],
  },

  // ─── 6. Conicity index ─────────────────────────────────────────────────────
  {
    id: 'conicity-index',
    name: 'Conicity Index',
    shortName: 'Conicity',
    description: 'Valdez conicity index — how “cone-like” the body is from waist, weight, and height.',
    category: 'endocrinology',
    tags: ['conicity', 'waist', 'central obesity', 'anthropometry'],
    whenToUse: 'Research/education on central fat distribution using a theoretically bounded shape index.',
    whyUse: 'Approaches 1.73 for a perfect double cone; higher values imply greater central concentration of mass.',
    inputs: [
      numberInput('waist', 'Waist circumference', { unit: 'cm', min: 40, max: 200, step: 0.5, defaultValue: 90, helpText: 'Midpoint between lower rib and iliac crest (WHO), at end-expiration, standing — or a protocol-consistent site' }),
      numberInput('weight', 'Weight', { unit: 'kg', min: 30, max: 400, step: 0.1, defaultValue: 80 }),
      numberInput('height', 'Height', { unit: 'cm', min: 120, max: 230, defaultValue: 170 }),
    ],
    calculate(values) {
      const wcM = num(values.waist, 90) / 100;
      const w = num(values.weight, 80);
      const hM = num(values.height, 170) / 100;
      if (wcM <= 0 || w <= 0 || hM <= 0) {
        return { score: '—', label: 'Invalid inputs', interpretation: 'Enter positive waist, weight, and height.', riskLevel: 'info' };
      }
      // C = WC / (0.109 × √(W/H))  with WC, H in m; W in kg
      const c = wcM / (0.109 * Math.sqrt(w / hM));
      const cR = round(c, 3);
      const r = riskFromThresholds(c, [
        {
          max: 1.2,
          level: 'low',
          label: 'Lower conicity',
          interpretation: `Conicity index ${cR}. Lower central shape index educationally.`,
        },
        {
          max: 1.25,
          level: 'normal',
          label: 'Mid conicity range',
          interpretation: `Conicity index ${cR}. Mid educational range for adults; interpret with sex-specific research cutoffs when used clinically.`,
        },
        {
          max: 1.35,
          level: 'moderate',
          label: 'Elevated conicity',
          interpretation: `Conicity index ${cR}. Suggests greater central fat distribution — correlate with WHtR, metabolic labs.`,
        },
        {
          max: 2.5,
          level: 'high',
          label: 'High conicity',
          interpretation: `Conicity index ${cR}. High central shape (theoretical max for double cone ≈1.73). High cardiometabolic concern educationally.`,
        },
      ]);
      return {
        score: cR,
        unit: 'index',
        ...r,
        details: [
          { label: 'Waist', value: `${round(wcM * 100, 1)} cm` },
          { label: '√(W/H)', value: String(round(Math.sqrt(w / hM), 3)) },
          { label: 'Theoretical double-cone max', value: '≈1.73' },
        ],
      };
    },
    evidence: {
      summary: 'Conicity index C = WC / (0.109 × √(weight/height)) with WC and height in meters, weight in kg (Valdez 1991).',
      formula: 'C = WC_m / (0.109 · √(kg / height_m))',
      validation: 'Used in epidemiologic studies of central obesity; clinical cutoffs vary by sex and population.',
      references: [
        {
          title: 'A simple model-based index of abdominal adiposity',
          citation: 'Valdez R. J Clin Epidemiol. 1991',
          year: 1991,
          pmid: '1890438',
          doi: '10.1016/0895-4356(91)90059-i',
        },
      ],
    },
    nextSteps: [
      { condition: 'Elevated conicity', actions: ['Assess BP, lipids, glycemia', 'Lifestyle and waist-focused counseling'] },
    ],
    pearls: [
      'Constant 0.109 derives from modeling the human body as a cylinder/cone with assumed density.',
      'Prefer consistent waist measurement protocol.',
    ],
  },

  // ─── 7. Katch–McArdle BMR ──────────────────────────────────────────────────
  {
    id: 'bmr-katch-mcardle',
    name: 'Katch–McArdle BMR',
    shortName: 'Katch–McArdle',
    description: 'Basal metabolic rate from lean body mass: BMR = 370 + 21.6 × LBM (kg).',
    category: 'general',
    tags: ['bmr', 'katch-mcardle', 'lean mass', 'nutrition', 'ree'],
    whenToUse: 'When lean mass is known (DXA, BIA, or estimated) and a fat-free-mass–based BMR is preferred.',
    whyUse: 'Does not require age/sex/height once LBM is available; useful for athletes and recomp scenarios.',
    inputs: [
      numberInput('lbm', 'Lean body mass', {
        unit: 'kg',
        min: 20,
        max: 150,
        step: 0.1,
        defaultValue: 55,
        helpText: 'Fat-free / lean mass in kg',
      }),
      selectInput(
        'activity',
        'Optional activity multiplier (TDEE)',
        [
          { label: 'BMR only (×1.0)', value: 1, description: 'No activity factor — report BMR only' },
          { label: 'Sedentary (×1.2)', value: 1.2, description: 'Little or no exercise; desk/sitting job' },
          { label: 'Light (×1.375)', value: 1.375, description: 'Light exercise/sports 1–3 days/week' },
          { label: 'Moderate (×1.55)', value: 1.55, description: 'Moderate exercise/sports 3–5 days/week' },
          { label: 'Very active (×1.725)', value: 1.725, description: 'Hard exercise/sports 6–7 days/week' },
          { label: 'Extra active (×1.9)', value: 1.9, description: 'Very hard exercise daily, physical job, or twice-daily training' },
        ],
      ),
    ],
    calculate(values) {
      const lbm = num(values.lbm, 55);
      const mult = num(values.activity, 1);
      const bmr = 370 + 21.6 * lbm;
      const bmrR = round(bmr, 0);
      const tdee = round(bmr * mult, 0);
      return {
        score: bmrR,
        unit: 'kcal/day',
        label: mult > 1 ? `BMR ${bmrR} · TDEE ≈ ${tdee}` : 'Katch–McArdle BMR',
        interpretation: `Katch–McArdle BMR ≈ ${bmrR} kcal/day from LBM ${lbm} kg${
          mult > 1 ? `; ×${mult} → TDEE ≈ ${tdee} kcal/day` : ''
        }. Accuracy depends entirely on LBM measurement quality.`,
        riskLevel: 'info',
        details: [
          { label: 'LBM', value: `${lbm} kg` },
          { label: 'BMR', value: `${bmrR} kcal/day` },
          { label: 'TDEE', value: `${tdee} kcal/day` },
        ],
      };
    },
    evidence: {
      summary: 'Katch–McArdle: BMR (kcal/day) = 370 + 21.6 × lean body mass (kg).',
      formula: 'BMR = 370 + 21.6 · LBM_kg',
      validation: 'Derived from residual analysis of REE vs fat-free mass; better when LBM is measured, not guessed.',
      references: [
        {
          title: 'Body composition as a determinant of energy expenditure: a synthetic review and a proposed general prediction equation',
          citation: 'Cunningham JJ. Am J Clin Nutr. 1991 (REE = 370 + 21.6 × FFM; popularized as Katch–McArdle)',
          year: 1991,
          pmid: '1957828',
          doi: '10.1093/ajcn/54.6.963',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Nutrition planning',
        actions: ['Prefer measured LBM (DXA/BIA with caveats)', 'Adjust for illness stress factors separately'],
      },
    ],
    pearls: [
      'If only body fat % is known: LBM = weight × (1 − BF%/100).',
      'Critically ill patients need indirect calorimetry when available.',
    ],
  },

  // ─── 8. TDEE from Harris–Benedict × activity ───────────────────────────────
  {
    id: 'tdee-harris',
    name: 'TDEE (Harris–Benedict × Activity)',
    shortName: 'TDEE Harris',
    description: 'Total daily energy expenditure ≈ revised Harris–Benedict BMR × activity/stress factor.',
    category: 'general',
    tags: ['tdee', 'harris-benedict', 'bmr', 'nutrition', 'calories'],
    whenToUse: 'Estimating total daily calories for ambulatory nutrition counseling from HB BMR and activity.',
    whyUse: 'Explicit TDEE workflow: compute revised Harris–Benedict BMR then scale by activity factor.',
    inputs: [
      numberInput('weight', 'Weight', { unit: 'kg', min: 30, max: 300, step: 0.1, defaultValue: 70 }),
      numberInput('height', 'Height', { unit: 'cm', min: 120, max: 230, defaultValue: 170 }),
      numberInput('age', 'Age', { unit: 'years', min: 15, max: 100, defaultValue: 40 }),
      selectInput('sex', 'Sex', [
        { label: 'Male', value: 'M' },
        { label: 'Female', value: 'F' },
      ]),
      selectInput(
        'activity',
        'Activity / lifestyle factor',
        [
          { label: 'Sedentary (×1.2)', value: 1.2, description: 'Little or no exercise; desk/sitting job' },
          { label: 'Light activity (×1.375)', value: 1.375, description: 'Light exercise/sports 1–3 days/week' },
          { label: 'Moderate (×1.55)', value: 1.55, description: 'Moderate exercise/sports 3–5 days/week' },
          { label: 'Very active (×1.725)', value: 1.725, description: 'Hard exercise/sports 6–7 days/week' },
          { label: 'Extra active (×1.9)', value: 1.9, description: 'Very hard exercise daily, physical job, or twice-daily training' },
        ],
        1.2,
        'Pick the PAL band that matches occupation plus weekly training — not a single gym session.',
      ),
    ],
    calculate(values) {
      const w = num(values.weight, 70);
      const h = num(values.height, 170);
      const age = num(values.age, 40);
      const mult = num(values.activity, 1.2);
      const bmr =
        values.sex === 'F'
          ? 447.593 + 9.247 * w + 3.098 * h - 4.33 * age
          : 88.362 + 13.397 * w + 4.799 * h - 5.677 * age;
      const bmrR = round(bmr, 0);
      const tdee = round(bmr * mult, 0);
      return {
        score: tdee,
        unit: 'kcal/day',
        label: 'Estimated TDEE',
        interpretation: `Revised Harris–Benedict BMR ≈ ${bmrR} kcal/day × activity ${mult} → TDEE ≈ ${tdee} kcal/day. Population average factors — not ICU stress factors.`,
        riskLevel: 'info',
        details: [
          { label: 'BMR (revised HB)', value: `${bmrR} kcal/day` },
          { label: 'Activity factor', value: String(mult) },
          { label: 'TDEE', value: `${tdee} kcal/day` },
        ],
      };
    },
    evidence: {
      summary: 'TDEE ≈ BMR × activity factor. BMR uses revised Harris–Benedict (Roza–Shizgal 1984).',
      formula: 'TDEE = BMR_HB × activity; ♂ BMR = 88.362+13.397W+4.799H−5.677A; ♀ = 447.593+9.247W+3.098H−4.330A',
      validation: 'Activity multipliers are rough averages; Mifflin–St Jeor BMR is often preferred for modern REE, then same multipliers.',
      references: [
        {
          title: 'The Harris Benedict equation reevaluated',
          citation: 'Roza AM, Shizgal HM. Am J Clin Nutr. 1984',
          year: 1984,
          pmid: '6741850',
          doi: '10.1093/ajcn/40.1.168',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Weight goals',
        actions: ['Create modest deficit/surplus from TDEE', 'Track weight trend and adjust', 'Set protein targets separately'],
      },
    ],
    pearls: [
      'Illness, NEAT, and intentional exercise make true TDEE highly individual.',
      'For REE-focused estimates prefer Mifflin or measured calorimetry.',
    ],
  },

  // ─── 9. Fluid deficit from % dehydration ───────────────────────────────────
  {
    id: 'fluid-deficit-percent',
    name: 'Fluid Deficit from % Dehydration',
    shortName: 'Deficit %',
    description: 'Estimates free-fluid volume deficit from percent dehydration × body weight.',
    category: 'general',
    tags: ['dehydration', 'fluid deficit', 'pediatrics', 'volume', 'resuscitation'],
    whenToUse: 'Planning replacement volume after clinical % dehydration estimate (especially pediatrics teaching).',
    whyUse: 'Deficit (L) ≈ weight (kg) × (% dehydration/100); plus ongoing losses and maintenance separately.',
    inputs: [
      numberInput('weight', 'Current / dosing weight', { unit: 'kg', min: 1, max: 200, step: 0.1, defaultValue: 15 }),
      numberInput('percent', 'Estimated dehydration', {
        unit: '%',
        min: 1,
        max: 20,
        step: 0.5,
        defaultValue: 5,
        helpText: 'Clinical % weight loss. WHO-style: some dehydration ~5% (restless, thirsty, sunken eyes, slow skin pinch); severe ≥10% (lethargic, unable to drink, very sunken eyes, very slow pinch). Pre-illness weight if known is gold standard.',
      }),
      selectInput('replaceHours', 'Optional replacement period (for rate)', [
        { label: 'Show volume only', value: 0 },
        { label: 'Replace over 8 hours', value: 8 },
        { label: 'Replace over 24 hours', value: 24 },
        { label: 'Replace over 48 hours', value: 48 },
      ]),
    ],
    calculate(values) {
      const w = num(values.weight, 15);
      const pct = num(values.percent, 5);
      const hours = num(values.replaceHours, 0);
      const deficitL = (w * pct) / 100;
      const deficitMl = round(deficitL * 1000, 0);
      const deficitLR = round(deficitL, 2);
      let rateNote = '';
      let rateMlHr = 0;
      if (hours > 0) {
        rateMlHr = round(deficitMl / hours, 0);
        rateNote = ` If replaced evenly over ${hours} h → ≈ ${rateMlHr} mL/h of deficit fluid (maintenance and ongoing losses extra).`;
      }
      const r = riskFromThresholds(pct, [
        {
          max: 5,
          level: 'moderate',
          label: 'Mild–moderate deficit range',
          interpretation: `Estimated deficit ≈ ${deficitLR} L (${deficitMl} mL) from ${pct}% × ${w} kg.${rateNote} Confirm clinical hydration status; oral rehydration often preferred if mild and tolerated.`,
        },
        {
          max: 9,
          level: 'high',
          label: 'Moderate–severe deficit range',
          interpretation: `Estimated deficit ≈ ${deficitLR} L (${deficitMl} mL).${rateNote} IV rehydration, electrolytes, and frequent reassessment usually required.`,
        },
        {
          max: 25,
          level: 'critical',
          label: 'Severe deficit range',
          interpretation: `Estimated deficit ≈ ${deficitLR} L (${deficitMl} mL).${rateNote} Severe dehydration — ABCs, rapid IV/IO access, shock bolus protocols as indicated, ICU-level care if unstable.`,
        },
      ]);
      return {
        score: deficitMl,
        unit: 'mL',
        ...r,
        details: [
          { label: 'Deficit', value: `${deficitLR} L (${deficitMl} mL)` },
          { label: '% Dehydration', value: `${pct}%` },
          { label: 'Weight', value: `${w} kg` },
          ...(hours > 0 ? [{ label: `Even rate over ${hours} h`, value: `${rateMlHr} mL/h` }] : []),
        ],
      };
    },
    evidence: {
      summary: 'Volume deficit (L) ≈ body weight (kg) × percent dehydration / 100 (1 kg ≈ 1 L body water for teaching).',
      formula: 'Deficit_mL = weight_kg × %dehydration × 10',
      validation: 'Standard pediatric dehydration teaching; actual deficits vary with composition (isonatremic vs hypo/hypernatremic).',
      references: [
        {
          title: 'Evaluation and Management of Dehydration in Children',
          citation: 'Santillanes G, Rose E. Emerg Med Clin North Am. 2018',
          year: 2018,
          pmid: '29622321',
          doi: '10.1016/j.emc.2017.12.004',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Any calculated deficit',
        actions: [
          'Separate deficit, maintenance, and ongoing losses',
          'Choose fluid composition from Na status',
          'Reweigh and reassess frequently',
        ],
      },
    ],
    pearls: [
      'Pre-illness weight if known is gold standard for % loss.',
      'Hypernatremic dehydration needs slower free-water correction planning.',
    ],
  },

  // ─── 10. Maintenance electrolytes (Na/K) ───────────────────────────────────
  {
    id: 'maintenance-electrolyte',
    name: 'Maintenance Electrolytes (Na / K)',
    shortName: 'Maint Na/K',
    description: 'Educational daily maintenance sodium and potassium needs from weight-based mEq/kg ranges.',
    category: 'general',
    tags: ['sodium', 'potassium', 'maintenance', 'electrolytes', 'ivf', 'pediatrics'],
    whenToUse: 'Teaching estimate of daily Na and K requirements when designing maintenance fluids.',
    whyUse: 'Common pediatric teaching: ~2–3 mEq/kg/day Na and ~1–2 mEq/kg/day K (adjust for disease).',
    inputs: [
      numberInput('weight', 'Weight', { unit: 'kg', min: 1, max: 150, step: 0.1, defaultValue: 20 }),
      selectInput('naRate', 'Na target', [
        { label: '2 mEq/kg/day', value: 2, description: 'Low-end pediatric teaching maintenance' },
        { label: '3 mEq/kg/day', value: 3, description: 'Common pediatric teaching target' },
        { label: '4 mEq/kg/day (higher)', value: 4, description: 'Higher — e.g. ongoing GI or third-space Na losses' },
      ], 2, 'Classic pediatric teaching ~2–3 mEq/kg/day Na; increase for ongoing losses. Not a prescription.'),
      selectInput('kRate', 'K target', [
        { label: '1 mEq/kg/day', value: 1, description: 'Low-end teaching maintenance' },
        { label: '2 mEq/kg/day', value: 2, description: 'Common pediatric teaching target' },
        { label: '3 mEq/kg/day (higher)', value: 3, description: 'Higher — e.g. ongoing GI K losses if voiding and K not high' },
      ], 1, 'Classic pediatric teaching ~1–2 mEq/kg/day K. Hold if anuria or hyperkalemia.'),
      yesNo('anuria', 'Anuria / severe oliguria (hold K teaching flag)', 0, 'No urine or severe oliguria (e.g. <0.5 mL/kg/h) — do not add potassium until urine output and K allow.'),
    ],
    calculate(values) {
      const w = num(values.weight, 20);
      const naPerKg = num(values.naRate, 3);
      const kPerKg = num(values.kRate, 2);
      const naDay = round(w * naPerKg, 0);
      const kDay = round(w * kPerKg, 0);
      const anuria = bool(values.anuria);
      return {
        score: naDay,
        unit: 'mEq Na/day',
        label: anuria ? 'Na maintenance · hold K' : 'Maintenance Na & K',
        interpretation: anuria
          ? `Educational Na ≈ ${naDay} mEq/day (${naPerKg} mEq/kg × ${w} kg). K teaching dose would be ${kDay} mEq/day but anuria/severe oliguria — do not add K until urine output and K level allow. Not a prescription.`
          : `Educational maintenance: Na ≈ ${naDay} mEq/day (${naPerKg} mEq/kg), K ≈ ${kDay} mEq/day (${kPerKg} mEq/kg) for ${w} kg. Match to measured labs, renal function, GI losses, and local IVF policy (often isotonic fluids in hospital).`,
        riskLevel: anuria ? 'high' : 'info',
        details: [
          { label: 'Na / day', value: `${naDay} mEq` },
          { label: 'K / day', value: anuria ? `${kDay} mEq (HOLD — anuria flag)` : `${kDay} mEq` },
          { label: 'Na rate', value: `${naPerKg} mEq/kg/day` },
          { label: 'K rate', value: `${kPerKg} mEq/kg/day` },
        ],
        recommendations: [
          'Verify serum K before adding potassium',
          'Increase Na/K for ongoing GI or third-space losses',
          'Reduce free water if SIADH risk',
        ],
      };
    },
    evidence: {
      summary: 'Classic teaching maintenance: sodium ~2–3 mEq/kg/day, potassium ~1–2 mEq/kg/day (Holliday–Segar-era electrolyte education).',
      formula: 'Na_mEq/day = kg × Na_mEq/kg; K_mEq/day = kg × K_mEq/kg',
      validation: 'Educational ranges only; critically ill, renal failure, and SIADH require individualized plans.',
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
        condition: 'Building IVF',
        actions: ['Choose fluid tonicity per guidelines', 'Add K only if voiding and K not high', 'Recheck electrolytes'],
      },
    ],
    pearls: [
      'Adult fixed diets (~50–150 mEq Na/day) differ from pure weight-based pediatric teaching.',
      'Never rely solely on mEq/kg without current labs.',
    ],
  },

  // ─── 11. Peripheral K concentration / rate safety ─────────────────────────
  {
    id: 'potassium-max-peripheral',
    name: 'Peripheral IV Potassium Limits',
    shortName: 'K Peripheral Max',
    description: 'Educational check of peripheral KCl concentration (mEq/L) and infusion rate against common ceilings.',
    category: 'critical-care',
    tags: ['potassium', 'peripheral iv', 'safety', 'kcl', 'infusion'],
    whenToUse: 'Before infusing KCl via peripheral line to screen concentration and mEq/h.',
    whyUse: 'Peripheral max concentration commonly ~10 mEq/100 mL (100 mEq/L) and rate ~10 mEq/h — institution-specific.',
    inputs: [
      numberInput('meq', 'KCl amount', { unit: 'mEq', min: 1, max: 40, step: 1, defaultValue: 10, helpText: 'mEq of KCl in the bag or syringe.' }),
      numberInput('volume', 'Diluent volume', { unit: 'mL', min: 50, max: 1000, step: 10, defaultValue: 100, helpText: 'Typical peripheral ceiling ~10 mEq/100 mL (100 mEq/L).' }),
      numberInput('hours', 'Infusion duration', { unit: 'hours', min: 0.5, max: 12, step: 0.25, defaultValue: 1, helpText: 'Typical peripheral rate ceiling ~10 mEq/h. Never IV push K.' }),
    ],
    calculate(values) {
      const meq = num(values.meq, 10);
      const vol = num(values.volume, 100);
      const hours = num(values.hours, 1);
      const concMeqL = vol > 0 ? round((meq / vol) * 1000, 0) : 9999;
      const concMeq100 = vol > 0 ? round((meq / vol) * 100, 1) : 999;
      const rate = hours > 0 ? round(meq / hours, 1) : 999;
      const maxConc = 100; // mEq/L ≈ 10 mEq/100 mL
      const maxRate = 10; // mEq/h peripheral typical
      const concOk = concMeqL <= maxConc;
      const rateOk = rate <= maxRate;
      let riskLevel: 'normal' | 'moderate' | 'high' | 'critical' = 'normal';
      let label = 'Within common peripheral limits';
      if (!concOk && !rateOk) {
        riskLevel = 'critical';
        label = 'Concentration AND rate exceed typical peripheral max';
      } else if (!concOk || !rateOk) {
        riskLevel = 'high';
        label = !concOk ? 'Concentration exceeds typical peripheral max' : 'Rate exceeds typical peripheral max (10 mEq/h)';
      } else if (concMeqL > 80 || rate > 8) {
        riskLevel = 'moderate';
        label = 'Near peripheral safety ceiling — verify policy';
      }
      return {
        score: concMeqL,
        unit: 'mEq/L',
        label,
        interpretation: `Peripheral bag ≈ ${concMeqL} mEq/L (${concMeq100} mEq/100 mL); rate ${rate} mEq/h. Common teaching ceilings: ≤100 mEq/L (10 mEq/100 mL) and ≤10 mEq/h via peripheral IV. ${
          concOk && rateOk ? 'Within those educational limits.' : 'Outside common limits — dilute further, slow infusion, or use central access per policy. Never IV push K.'
        } Follow institutional ISMP/policy limits.`,
        riskLevel,
        details: [
          { label: 'Concentration', value: `${concMeqL} mEq/L (${concMeq100} mEq/100 mL)` },
          { label: 'Rate', value: `${rate} mEq/h` },
          { label: 'Typical max concentration', value: '100 mEq/L (10 mEq/100 mL)' },
          { label: 'Typical max rate', value: '10 mEq/h peripheral' },
        ],
        recommendations: [
          'Continuous cardiac monitoring for higher rates/concentrations',
          'Recheck K and Mg after replacement',
          'Prefer central line for concentrated/rapid K',
        ],
      };
    },
    evidence: {
      summary: 'Educational peripheral KCl limits often cited: concentration ≤10 mEq/100 mL and rate ≤10 mEq/h (policies vary).',
      formula: 'conc_mEq/L = mEq / L; rate = mEq / hours',
      validation: 'Institutional policies differ; some allow slightly higher concentrations with monitoring. Not a protocol.',
      references: [
        {
          title: 'Treatment of electrolyte disorders in adult patients in the intensive care unit',
          citation: 'Kraft MD, Btaiche IF, Sacks GS, Kudsk KA. Am J Health Syst Pharm. 2005',
          year: 2005,
          pmid: '16085929',
          doi: '10.2146/ajhp040300',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Outside limits',
        actions: ['Increase diluent volume', 'Extend infusion time', 'Switch to central access if appropriate'],
      },
    ],
    pearls: [
      'Premixed 10 mEq/100 mL bags are a common peripheral standard.',
      'Pain and phlebitis increase with concentration — patient comfort matters.',
    ],
  },

  // ─── 12. Sodium content of common IV fluids ────────────────────────────────
  {
    id: 'sodium-content-fluids',
    name: 'Sodium Content of IV Fluids',
    shortName: 'IVF Na',
    description: 'Looks up sodium concentration (mEq/L) of common crystalloids and computes mEq in a given volume.',
    category: 'general',
    tags: ['sodium', 'iv fluids', 'ns', 'lr', 'crystalloid', 'tonicity'],
    whenToUse: 'Quick Na content when choosing or tallying crystalloid sodium load.',
    whyUse: 'Avoids mix-ups between NS (154), LR (~130), half-NS (77), and hypertonic saline.',
    inputs: [
      selectInput('fluid', 'IV fluid', [
        { label: '0.9% NaCl (NS) — 154 mEq/L', value: 154 },
        { label: '0.45% NaCl (½ NS) — 77 mEq/L', value: 77 },
        { label: '0.225% NaCl (¼ NS) — 34 mEq/L', value: 34 },
        { label: 'Lactated Ringer’s — ~130 mEq/L', value: 130 },
        { label: 'Plasma-Lyte / Normosol-R — ~140 mEq/L', value: 140 },
        { label: '3% NaCl — 513 mEq/L', value: 513 },
        { label: 'D5W — 0 mEq/L', value: 0 },
        { label: 'D5 ½ NS — 77 mEq/L', value: 77 },
        { label: 'D5 NS — 154 mEq/L', value: 154 },
      ]),
      numberInput('volume', 'Volume', { unit: 'mL', min: 1, max: 5000, step: 10, defaultValue: 1000 }),
    ],
    calculate(values) {
      const naPerL = num(values.fluid, 154);
      const volMl = num(values.volume, 1000);
      const meq = round((naPerL * volMl) / 1000, 1);
      const tonic =
        naPerL === 0
          ? 'free water (after glucose metabolism)'
          : naPerL < 130
            ? 'hypotonic relative to plasma Na'
            : naPerL <= 154
              ? 'near-isotonic Na content'
              : 'hypertonic';
      return {
        score: naPerL,
        unit: 'mEq/L',
        label: `${meq} mEq Na in volume`,
        interpretation: `Selected fluid has ${naPerL} mEq/L sodium → ${meq} mEq in ${volMl} mL. Class: ${tonic}. LR also contains K, Ca, lactate — not shown here. Values are standard teaching approximations.`,
        riskLevel: naPerL >= 513 ? 'high' : 'info',
        details: [
          { label: 'Na concentration', value: `${naPerL} mEq/L` },
          { label: 'Volume', value: `${volMl} mL` },
          { label: 'Total Na', value: `${meq} mEq` },
        ],
      };
    },
    evidence: {
      summary: 'Standard Na content: NS 154, ½NS 77, LR ~130, 3% saline 513 mEq/L, D5W 0.',
      formula: 'mEq = (mEq/L) × (L)',
      validation: 'Product labeling may vary slightly (e.g., balanced crystalloids); confirm bag label.',
      references: [
        {
          title: 'Crystalloid fluid therapy',
          citation: 'Reddy S, Weinberg L, Young P. Crit Care. 2016;20:59',
          year: 2016,
          pmid: '26976277',
          doi: '10.1186/s13054-016-1217-5',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Hypertonic saline',
        actions: ['Central access preferred for continuous 3%', 'Monitor Na closely', 'Use for specific indications only'],
      },
    ],
    pearls: [
      'NS is slightly hypertonic to plasma; large volumes load chloride.',
      'D5W is isotonic in the bag but free water physiologically after dextrose use.',
    ],
  },

  // ─── 13. Calculated osmolarity of custom IV fluid ──────────────────────────
  {
    id: 'osmolarity-iv-fluid',
    name: 'IV Fluid Calculated Osmolarity',
    shortName: 'IVF Osm',
    description: 'Educational calculated osmolarity from Na, K, glucose, and other osmoles in a custom fluid.',
    category: 'general',
    tags: ['osmolarity', 'iv fluid', 'tonicity', 'glucose', 'electrolytes'],
    whenToUse: 'Estimating theoretical osmolarity of compounded or mixed IV fluids (peripheral vs central comfort).',
    whyUse: 'Peripheral veins generally tolerate lower osmolarity better; teaching threshold often ~900 mOsm/L.',
    inputs: [
      numberInput('na', 'Sodium', { unit: 'mEq/L', min: 0, max: 1000, defaultValue: 154, helpText: 'mEq/L in the bag. Calculated osmolarity ≈ Na + K + Cl + glucose osmoles + other. Peripheral teaching ceiling often ~900 mOsm/L.' }),
      numberInput('k', 'Potassium', { unit: 'mEq/L', min: 0, max: 200, defaultValue: 0 }),
      numberInput('cl', 'Chloride', {
        unit: 'mEq/L',
        min: 0,
        max: 1000,
        defaultValue: 154,
        helpText: 'Counted once (not 2×) — this is the ionic sum Na + K + Cl + glucose + other, not the serum 2×Na formula',
      }),
      numberInput('glucose', 'Glucose / dextrose', {
        unit: 'g/L',
        min: 0,
        max: 500,
        defaultValue: 0,
        helpText: 'e.g., D5 = 50 g/L, D10 = 100 g/L',
      }),
      numberInput('other', 'Other osmoles', {
        unit: 'mOsm/L',
        min: 0,
        max: 500,
        defaultValue: 0,
        helpText: 'Mannitol, Mg, acetate contribution, etc. (approximate)',
      }),
    ],
    calculate(values) {
      const na = num(values.na, 154);
      const k = num(values.k, 0);
      const cl = num(values.cl, 154);
      const glucGL = num(values.glucose, 0);
      const other = num(values.other, 0);
      // Glucose g/L → mOsm/L ≈ g/L / 0.18 (MW 180) = g/L × 5.55
      const glucOsm = glucGL * 5.55;
      // Simple ionic model: Na + K + Cl + glucose + other (not the serum 2Na formula)
      const osm = na + k + cl + glucOsm + other;
      const osmR = round(osm, 0);
      const r = riskFromThresholds(osm, [
        {
          max: 300,
          level: 'normal',
          label: 'Near-isotonic range',
          interpretation: `Calculated osmolarity ≈ ${osmR} mOsm/L. Near plasma (~280–295) — typically peripheral-friendly (verify all additives).`,
        },
        {
          max: 600,
          level: 'moderate',
          label: 'Moderately hypertonic',
          interpretation: `Calculated osmolarity ≈ ${osmR} mOsm/L. Moderately hypertonic — peripheral use often acceptable depending on site and rate; watch phlebitis.`,
        },
        {
          max: 900,
          level: 'high',
          label: 'High osmolarity',
          interpretation: `Calculated osmolarity ≈ ${osmR} mOsm/L. High — prefer large peripheral vein or central access per policy; educational peripheral caution rises above ~900 mOsm/L for many PN/admixtures.`,
        },
        {
          max: 5000,
          level: 'critical',
          label: 'Very high osmolarity',
          interpretation: `Calculated osmolarity ≈ ${osmR} mOsm/L. Very hypertonic — central administration usually required (e.g., concentrated PN, 3% saline continuous).`,
        },
      ]);
      return {
        score: osmR,
        unit: 'mOsm/L',
        ...r,
        details: [
          { label: 'Na + K + Cl', value: `${round(na + k + cl, 0)} mOsm/L equiv` },
          { label: 'Glucose osmoles', value: `${round(glucOsm, 0)} mOsm/L` },
          { label: 'Other', value: `${other} mOsm/L` },
          { label: 'Dextrose %', value: `${round(glucGL / 10, 1)}%` },
        ],
      };
    },
    evidence: {
      summary: 'Approximate fluid osmolarity ≈ Na + K + Cl + (glucose g/L × 5.55) + other osmoles. Serum osmoles use 2·Na + glu/18 + BUN/2.8 instead.',
      formula: 'Osm ≈ [Na] + [K] + [Cl] + 5.55·glucose_g/L + other',
      validation: 'Educational approximation; dissociation factors and activity coefficients ignored. Check manufacturer calculated osmolarity when available.',
      references: [
        {
          title: 'A.S.P.E.N. clinical guidelines: parenteral nutrition ordering, order review, compounding, labeling, and dispensing',
          citation: 'Boullata JI et al. JPEN J Parenter Enteral Nutr. 2014;38:334-377',
          year: 2014,
          pmid: '24531708',
          doi: '10.1177/0148607114521833',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Osm >900',
        actions: ['Prefer central line', 'Dilute if clinically acceptable', 'Monitor infusion site'],
      },
    ],
    pearls: [
      'Tonicity ≠ osmolarity: permeant solutes (glucose, urea) affect measured osm differently in vivo.',
      'LR calculated osm ~273 mOsm/L despite Na 130 because of other anions.',
    ],
  },

  // ─── 14. Glucose infusion rate (GIR) ───────────────────────────────────────
  {
    id: 'glucose-rate-mgkgmin',
    name: 'Glucose Infusion Rate (GIR)',
    shortName: 'GIR',
    description: 'Neonatal/pediatric glucose infusion rate in mg/kg/min from dextrose concentration and fluid rate.',
    category: 'pediatrics',
    tags: ['gir', 'glucose', 'neonate', 'dextrose', 'hypoglycemia', 'tpn'],
    whenToUse: 'Neonates and children on IV dextrose — target GIR for hypo/hyperglycemia management.',
    whyUse: 'Standard NICU metric; typical start ~4–6 mg/kg/min, adjust to glucose.',
    inputs: [
      numberInput('weight', 'Weight', { unit: 'kg', min: 0.4, max: 100, step: 0.01, defaultValue: 3 }),
      numberInput('dextrose', 'Dextrose concentration', {
        unit: '%',
        min: 1,
        max: 30,
        step: 0.5,
        defaultValue: 10,
        helpText: 'e.g., D10 = 10%. Typical neonatal start ~4–6 mg/kg/min. D12.5+ usually needs central access.',
      }),
      numberInput('rate', 'Infusion rate', { unit: 'mL/hr', min: 0.1, max: 200, step: 0.1, defaultValue: 12 }),
    ],
    calculate(values) {
      const w = num(values.weight, 3);
      const dex = num(values.dextrose, 10);
      const rate = num(values.rate, 12);
      if (w <= 0) {
        return { score: '—', label: 'Invalid weight', interpretation: 'Weight must be positive.', riskLevel: 'info' };
      }
      // GIR = (% dextrose × mL/hr) / (6 × kg)   because % = g/100 mL; g/hr×1000mg / (kg×60min)
      // = (dex/100)*rate*1000 / (w*60) = dex*rate / (6*w)
      const gir = (dex * rate) / (6 * w);
      const girR = round(gir, 2);
      const r = riskFromThresholds(gir, [
        {
          max: 4,
          level: 'moderate',
          label: 'Low–modest GIR',
          interpretation: `GIR ${girR} mg/kg/min. Below common neonatal starter range (~4–6); may be appropriate if euglycemic or fluid-restricted — confirm glucose.`,
        },
        {
          max: 8,
          level: 'normal',
          label: 'Typical support range',
          interpretation: `GIR ${girR} mg/kg/min. Common maintenance/support band for many neonates; titrate to bedside glucose and clinical status.`,
        },
        {
          max: 12,
          level: 'moderate',
          label: 'High GIR',
          interpretation: `GIR ${girR} mg/kg/min. Elevated — used for refractory hypoglycemia or high metabolic demand; watch hyperglycemia and fatty liver risk with prolonged high GIR.`,
        },
        {
          max: 30,
          level: 'high',
          label: 'Very high GIR',
          interpretation: `GIR ${girR} mg/kg/min. Very high — verify concentration/rate/weight; central access usually needed for high % dextrose; investigate hyperinsulinism if hypoglycemia despite high GIR.`,
        },
      ]);
      return {
        score: girR,
        unit: 'mg/kg/min',
        ...r,
        details: [
          { label: 'Dextrose', value: `D${dex}` },
          { label: 'Rate', value: `${rate} mL/hr` },
          { label: 'Weight', value: `${w} kg` },
          { label: 'Formula', value: '(% × mL/hr) / (6 × kg)' },
        ],
      };
    },
    evidence: {
      summary: 'GIR (mg/kg/min) = (dextrose % × infusion rate mL/hr) / (6 × weight kg).',
      formula: 'GIR = (%dex · mL/hr) / (6 · kg)',
      validation: 'Standard neonatal intensive care calculation; endogenous glucose production in term newborns ~4–6 mg/kg/min.',
      references: [
        {
          title: 'Postnatal glucose homeostasis in late-preterm and term infants',
          citation: 'Committee on Fetus and Newborn, Adamkin DH. Pediatrics. 2011',
          year: 2011,
          pmid: '21357346',
          doi: '10.1542/peds.2010-3851',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Hypoglycemia',
        actions: ['Increase GIR stepwise', 'Check IV integrity', 'Evaluate for hyperinsulinism if GIR remains high'],
      },
      {
        condition: 'Hyperglycemia',
        actions: ['Reduce GIR', 'Consider insulin protocol if persistent', 'Evaluate sepsis/stress'],
      },
    ],
    pearls: [
      'D12.5 and higher usually need central access.',
      'Multiple drips: sum GIR from each dextrose-containing fluid.',
    ],
  },

  // ─── 15. Insulin drip rate ─────────────────────────────────────────────────
  {
    id: 'insulin-drip-rate',
    name: 'Insulin Drip Rate (units/hr)',
    shortName: 'Insulin U/hr',
    description: 'Converts insulin infusion concentration and pump rate (mL/hr) to units per hour.',
    category: 'endocrinology',
    tags: ['insulin', 'drip', 'infusion', 'dka', 'hhs', 'units'],
    whenToUse: 'DKA/HHS or ICU insulin infusions when verifying units/hr delivery.',
    whyUse: 'Prevents unit errors when bags are mixed at different concentrations (e.g., 1 U/mL).',
    inputs: [
      numberInput('unitsInBag', 'Insulin in bag', { unit: 'units', min: 1, max: 500, defaultValue: 100, helpText: 'Common mix: 100 units in 100 mL = 1 U/mL so mL/hr = U/hr.' }),
      numberInput('bagVolume', 'Bag volume', { unit: 'mL', min: 10, max: 500, defaultValue: 100 }),
      numberInput('rate', 'Pump rate', { unit: 'mL/hr', min: 0.1, max: 50, step: 0.1, defaultValue: 5 }),
    ],
    calculate(values) {
      const units = num(values.unitsInBag, 100);
      const vol = num(values.bagVolume, 100);
      const rate = num(values.rate, 5);
      if (vol <= 0) {
        return { score: '—', label: 'Invalid volume', interpretation: 'Bag volume must be positive.', riskLevel: 'info' };
      }
      const conc = units / vol; // U/mL
      const uhr = round(conc * rate, 2);
      return {
        score: uhr,
        unit: 'units/hr',
        label: 'Insulin delivery rate',
        interpretation: `Concentration ${round(conc, 2)} U/mL × ${rate} mL/hr = ${uhr} units/hr. Verify bag label and independent double-check for high-alert insulin infusions.`,
        riskLevel: uhr >= 15 ? 'high' : uhr >= 10 ? 'moderate' : 'info',
        details: [
          { label: 'Concentration', value: `${round(conc, 2)} U/mL` },
          { label: 'Pump rate', value: `${rate} mL/hr` },
          { label: 'Delivery', value: `${uhr} U/hr` },
        ],
        recommendations: [
          'Use standardized concentrations when possible',
          'Prime tubing carefully (adsorption)',
          'Protocol-driven titration to glucose',
        ],
      };
    },
    evidence: {
      summary: 'units/hr = (units in bag / mL in bag) × mL/hr.',
      formula: 'U/hr = (U_bag / V_mL) · rate_mL/hr',
      validation: 'Dimensional identity; safety depends on correct compounding and labeling.',
      references: [
        {
          title: 'Hyperglycemic crises in adult patients with diabetes',
          citation: 'Kitabchi AE, Umpierrez GE, Miles JM, Fisher JN. Diabetes Care. 2009',
          year: 2009,
          pmid: '19564476',
          doi: '10.2337/dc09-9032',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'DKA protocol',
        actions: ['Typical start often 0.1 U/kg/hr (protocol-specific)', 'Monitor K and glucose q1h initially', 'Overlap SQ basal before stopping drip'],
      },
    ],
    pearls: [
      'Common mix: 100 units in 100 mL NS = 1 U/mL so mL/hr = U/hr.',
      'Insulin is a high-alert medication — two-nurse check.',
    ],
  },

  // ─── 16. mcg/kg/min → mL/hr ────────────────────────────────────────────────
  {
    id: 'mcgkgmin-to-mlhr',
    name: 'mcg/kg/min → mL/hr',
    shortName: 'mcg→mL/hr',
    description: 'Converts weight-based infusion dose (mcg/kg/min) to pump rate (mL/hr) from bag concentration.',
    category: 'critical-care',
    tags: ['infusion', 'mcg/kg/min', 'vasopressor', 'drip rate', 'icu'],
    whenToUse: 'Starting or adjusting vasoactive/inotrope drips ordered in mcg/kg/min.',
    whyUse: 'Standard ICU conversion: mL/hr = (mcg/kg/min × kg × 60) / (mcg/mL).',
    inputs: [
      numberInput('dose', 'Dose', { unit: 'mcg/kg/min', min: 0.01, max: 100, step: 0.01, defaultValue: 5 }),
      numberInput('weight', 'Weight', { unit: 'kg', min: 1, max: 300, step: 0.1, defaultValue: 70 }),
      numberInput('drugMg', 'Drug amount in bag', { unit: 'mg', min: 0.1, max: 1000, step: 0.1, defaultValue: 400 }),
      numberInput('bagMl', 'Bag volume', { unit: 'mL', min: 1, max: 1000, defaultValue: 250 }),
    ],
    calculate(values) {
      const dose = num(values.dose, 5);
      const kg = num(values.weight, 70);
      const mg = num(values.drugMg, 400);
      const bag = num(values.bagMl, 250);
      if (bag <= 0) {
        return { score: '—', label: 'Invalid bag volume', interpretation: 'Bag volume must be positive.', riskLevel: 'info' };
      }
      const mcgPerMl = (mg * 1000) / bag;
      const mlHr = (dose * kg * 60) / mcgPerMl;
      const mlHrR = round(mlHr, 1);
      return {
        score: mlHrR,
        unit: 'mL/hr',
        label: 'Pump rate',
        interpretation: `${dose} mcg/kg/min × ${kg} kg with ${mg} mg / ${bag} mL (${round(mcgPerMl, 1)} mcg/mL) → ${mlHrR} mL/hr. Confirm drug, dilution, and dosing units (mcg vs mg).`,
        riskLevel: 'info',
        details: [
          { label: 'Concentration', value: `${round(mcgPerMl, 1)} mcg/mL` },
          { label: 'Dose', value: `${dose} mcg/kg/min` },
          { label: 'Weight', value: `${kg} kg` },
          { label: 'Rate', value: `${mlHrR} mL/hr` },
        ],
      };
    },
    evidence: {
      summary: 'mL/hr = (mcg/kg/min × weight_kg × 60) / concentration_mcg/mL; concentration_mcg/mL = (mg in bag × 1000) / mL bag.',
      formula: 'mL/hr = (µg/kg/min · kg · 60) / (µg/mL)',
      validation: 'Dimensional conversion used universally in ICU drug libraries.',
      references: [
        {
          title: 'Guidelines for Optimizing Safe Implementation and Use of Smart Infusion Pumps',
          citation: 'Institute for Safe Medication Practices (ISMP). 2020',
          year: 2020,
          url: 'https://www.ismp.org/guidelines/safe-implementation-and-use-smart-pumps',
        },
        {
          title: 'Dose Calculation',
          citation: 'StatPearls [Internet]. NCBI Bookshelf NBK430836 (includes mcg/kg/min infusion examples)',
          year: 2023,
          url: 'https://www.ncbi.nlm.nih.gov/books/NBK430836/',
        },
      ],
    },
    nextSteps: [
      { condition: 'Any vasoactive drip', actions: ['Use smart pump drug library', 'Label line clearly', 'Titrate to MAP/goals'] },
    ],
    pearls: [
      'Watch unit traps: dopamine often mcg/kg/min; nitroprusside same; some drugs are mcg/min not per kg.',
      'Double-check weight (kg not lb).',
    ],
  },

  // ─── 17. mL/hr → mcg/kg/min ────────────────────────────────────────────────
  {
    id: 'mlhr-to-mcgkgmin',
    name: 'mL/hr → mcg/kg/min',
    shortName: 'mL/hr→mcg',
    description: 'Converts pump rate (mL/hr) to weight-based dose (mcg/kg/min) from bag concentration.',
    category: 'critical-care',
    tags: ['infusion', 'mcg/kg/min', 'vasopressor', 'reverse conversion', 'icu'],
    whenToUse: 'When the pump shows mL/hr and you need the equivalent mcg/kg/min.',
    whyUse: 'Reverse of the standard drip equation for handoffs and order verification.',
    inputs: [
      numberInput('rate', 'Pump rate', { unit: 'mL/hr', min: 0.1, max: 200, step: 0.1, defaultValue: 10 }),
      numberInput('weight', 'Weight', { unit: 'kg', min: 1, max: 300, step: 0.1, defaultValue: 70 }),
      numberInput('drugMg', 'Drug amount in bag', { unit: 'mg', min: 0.1, max: 1000, step: 0.1, defaultValue: 400 }),
      numberInput('bagMl', 'Bag volume', { unit: 'mL', min: 1, max: 1000, defaultValue: 250 }),
    ],
    calculate(values) {
      const rate = num(values.rate, 10);
      const kg = num(values.weight, 70);
      const mg = num(values.drugMg, 400);
      const bag = num(values.bagMl, 250);
      if (bag <= 0 || kg <= 0) {
        return { score: '—', label: 'Invalid inputs', interpretation: 'Bag volume and weight must be positive.', riskLevel: 'info' };
      }
      const mcgPerMl = (mg * 1000) / bag;
      const dose = (rate * mcgPerMl) / (kg * 60);
      const doseR = round(dose, 2);
      return {
        score: doseR,
        unit: 'mcg/kg/min',
        label: 'Weight-based dose',
        interpretation: `${rate} mL/hr of ${mg} mg/${bag} mL (${round(mcgPerMl, 1)} mcg/mL) in a ${kg} kg patient → ${doseR} mcg/kg/min.`,
        riskLevel: 'info',
        details: [
          { label: 'Concentration', value: `${round(mcgPerMl, 1)} mcg/mL` },
          { label: 'Rate', value: `${rate} mL/hr` },
          { label: 'Dose', value: `${doseR} mcg/kg/min` },
        ],
      };
    },
    evidence: {
      summary: 'mcg/kg/min = (mL/hr × mcg/mL) / (kg × 60).',
      formula: 'µg/kg/min = (mL/hr · µg/mL) / (kg · 60)',
      validation: 'Exact inverse of the forward drip conversion.',
      references: [
        {
          title: 'Guidelines for Optimizing Safe Implementation and Use of Smart Infusion Pumps',
          citation: 'Institute for Safe Medication Practices (ISMP). 2020',
          year: 2020,
          url: 'https://www.ismp.org/guidelines/safe-implementation-and-use-smart-pumps',
        },
        {
          title: 'Dose Calculation',
          citation: 'StatPearls [Internet]. NCBI Bookshelf NBK430836 (includes mcg/kg/min infusion examples)',
          year: 2023,
          url: 'https://www.ncbi.nlm.nih.gov/books/NBK430836/',
        },
      ],
    },
    nextSteps: [
      { condition: 'Dose seems unexpected', actions: ['Recheck bag concentration', 'Confirm weight', 'Compare to ordered mcg/kg/min'] },
    ],
    pearls: ['If the drug is ordered mcg/min (not per kg), divide total mcg/min by kg only if converting frameworks.'],
  },

  // ─── 18. Drip rate gtt/min ─────────────────────────────────────────────────
  {
    id: 'drip-rate-gtt',
    name: 'IV Drip Rate (gtt/min)',
    shortName: 'gtt/min',
    description: 'Gravity drip rate in drops per minute from volume, time, and tubing drop factor.',
    category: 'general',
    tags: ['gtt', 'drip rate', 'iv', 'drop factor', 'nursing'],
    whenToUse: 'Gravity IV infusions without an electronic pump.',
    whyUse: 'gtt/min = (volume_mL × drop factor) / time_min.',
    inputs: [
      numberInput('volume', 'Volume to infuse', { unit: 'mL', min: 1, max: 5000, defaultValue: 1000 }),
      numberInput('hours', 'Time', { unit: 'hours', min: 0.1, max: 48, step: 0.1, defaultValue: 8 }),
      selectInput('dropFactor', 'Drop factor (tubing)', [
        { label: '10 gtt/mL (macro)', value: 10 },
        { label: '15 gtt/mL (macro)', value: 15 },
        { label: '20 gtt/mL (macro)', value: 20 },
        { label: '60 gtt/mL (microdrip)', value: 60 },
      ]),
    ],
    calculate(values) {
      const vol = num(values.volume, 1000);
      const hours = num(values.hours, 8);
      const df = num(values.dropFactor, 15);
      const mins = hours * 60;
      if (mins <= 0) {
        return { score: '—', label: 'Invalid time', interpretation: 'Time must be positive.', riskLevel: 'info' };
      }
      const gtt = (vol * df) / mins;
      const gttR = round(gtt, 0);
      const mlHr = round(vol / hours, 1);
      return {
        score: gttR,
        unit: 'gtt/min',
        label: 'Gravity drip rate',
        interpretation: `${vol} mL over ${hours} h with ${df} gtt/mL tubing → ≈ ${gttR} drops/min (≈ ${mlHr} mL/hr). Count for 15–60 s and adjust roller clamp; prefer infusion pump when available.`,
        riskLevel: 'info',
        details: [
          { label: 'mL/hr', value: String(mlHr) },
          { label: 'Drop factor', value: `${df} gtt/mL` },
          { label: 'Exact gtt/min', value: String(round(gtt, 1)) },
        ],
      };
    },
    evidence: {
      summary: 'Drops/min = (mL × drop factor gtt/mL) / minutes.',
      formula: 'gtt/min = (V_mL · DF) / t_min',
      validation: 'Standard nursing calculation; rounding to whole drops is practical.',
      references: [
        {
          title: 'Chapter 1 Initiate IV Therapy (gravity drip and drop factor)',
          citation: 'Ernstmeyer K, Christman E, eds. Nursing Advanced Skills. Open RN / Chippewa Valley Technical College. NCBI Bookshelf NBK594499',
          year: 2023,
          url: 'https://www.ncbi.nlm.nih.gov/books/NBK594499/',
        },
        {
          title: 'Dose Calculation (gtt/min = volume × drop factor / minutes)',
          citation: 'StatPearls [Internet]. NCBI Bookshelf NBK430836',
          year: 2023,
          url: 'https://www.ncbi.nlm.nih.gov/books/NBK430836/',
        },
      ],
    },
    nextSteps: [
      { condition: 'Critical meds', actions: ['Use infusion pump, not gravity', 'Independent double-check'] },
    ],
    pearls: [
      'Microdrip 60 gtt/mL: gtt/min numerically equals mL/hr.',
      'Viscous fluids and height of bag affect actual rate.',
    ],
  },

  // ─── 19. Concentration dilution C1V1=C2V2 ──────────────────────────────────
  {
    id: 'concentration-dilution',
    name: 'Concentration Dilution (C₁V₁ = C₂V₂)',
    shortName: 'C1V1=C2V2',
    description: 'Solves dilution problems: stock volume needed or final concentration from C₁V₁ = C₂V₂.',
    category: 'general',
    tags: ['dilution', 'concentration', 'pharmacy', 'c1v1', 'compounding'],
    whenToUse: 'Diluting stock solutions or checking final concentration after mixing.',
    whyUse: 'Core pharmacy/nursing identity for liquid dilutions (same concentration units).',
    inputs: [
      selectInput('solveFor', 'Solve for', [
        { label: 'Stock volume V₁ (need this much concentrate)', value: 'v1' },
        { label: 'Final concentration C₂', value: 'c2' },
        { label: 'Final volume V₂', value: 'v2' },
        { label: 'Stock concentration C₁', value: 'c1' },
      ]),
      numberInput('c1', 'C₁ stock concentration', { min: 0, max: 1e9, step: 0.01, defaultValue: 100, helpText: 'Any unit (%, mg/mL, etc.) — keep consistent' }),
      numberInput('v1', 'V₁ stock volume', { unit: 'mL', min: 0, max: 1e6, step: 0.1, defaultValue: 10 }),
      numberInput('c2', 'C₂ final concentration', { min: 0, max: 1e9, step: 0.01, defaultValue: 10 }),
      numberInput('v2', 'V₂ final volume', { unit: 'mL', min: 0, max: 1e6, step: 0.1, defaultValue: 100 }),
    ],
    calculate(values) {
      const c1 = num(values.c1, 100);
      const v1 = num(values.v1, 10);
      const c2 = num(values.c2, 10);
      const v2 = num(values.v2, 100);
      const mode = String(values.solveFor ?? 'v1');
      let score: number | string = '—';
      let unit = '';
      let label = '';
      let interpretation = '';
      let details: { label: string; value: string }[] = [];

      if (mode === 'v1') {
        if (c1 <= 0) {
          return { score: '—', label: 'Invalid C₁', interpretation: 'Stock concentration must be > 0.', riskLevel: 'info' };
        }
        const need = (c2 * v2) / c1;
        score = round(need, 3);
        unit = 'mL';
        label = 'Stock volume V₁ required';
        const diluent = round(v2 - need, 3);
        interpretation = `V₁ = C₂V₂/C₁ = ${score} mL of stock. Diluent ≈ ${diluent} mL to reach V₂ ${v2} mL (if volumes additive).`;
        details = [
          { label: 'V₁ stock', value: `${score} mL` },
          { label: 'Diluent (approx)', value: `${diluent} mL` },
        ];
      } else if (mode === 'c2') {
        if (v2 <= 0) {
          return { score: '—', label: 'Invalid V₂', interpretation: 'Final volume must be > 0.', riskLevel: 'info' };
        }
        const finalC = (c1 * v1) / v2;
        score = round(finalC, 4);
        unit = 'conc units';
        label = 'Final concentration C₂';
        interpretation = `C₂ = C₁V₁/V₂ = ${score} (same units as C₁).`;
        details = [{ label: 'C₂', value: String(score) }];
      } else if (mode === 'v2') {
        if (c2 <= 0) {
          return { score: '—', label: 'Invalid C₂', interpretation: 'Final concentration must be > 0.', riskLevel: 'info' };
        }
        const finalV = (c1 * v1) / c2;
        score = round(finalV, 3);
        unit = 'mL';
        label = 'Final volume V₂';
        interpretation = `V₂ = C₁V₁/C₂ = ${score} mL.`;
        details = [{ label: 'V₂', value: `${score} mL` }];
      } else {
        if (v1 <= 0) {
          return { score: '—', label: 'Invalid V₁', interpretation: 'Stock volume must be > 0.', riskLevel: 'info' };
        }
        const stockC = (c2 * v2) / v1;
        score = round(stockC, 4);
        unit = 'conc units';
        label = 'Stock concentration C₁';
        interpretation = `C₁ = C₂V₂/V₁ = ${score}.`;
        details = [{ label: 'C₁', value: String(score) }];
      }

      return {
        score,
        unit,
        label,
        interpretation: `${interpretation} Use identical units on both concentrations. Not for solid reconstitutions with displacement volume without adjustment.`,
        riskLevel: 'info',
        details: [
          { label: 'C₁', value: String(c1) },
          { label: 'V₁', value: `${v1} mL` },
          { label: 'C₂', value: String(c2) },
          { label: 'V₂', value: `${v2} mL` },
          ...details,
        ],
      };
    },
    evidence: {
      summary: 'Mass balance for dilutions: C₁V₁ = C₂V₂ when solute amount is conserved.',
      formula: 'C₁V₁ = C₂V₂',
      validation: 'Exact for ideal miscible liquids; account for displacement in some powder reconstitutions.',
      references: [
        {
          title: "Stoklosa and Ansel's Pharmaceutical Calculations (dilution identity C₁V₁ = C₂V₂)",
          citation: "Stockton SJ. Stoklosa and Ansel's Pharmaceutical Calculations. 16th ed. Wolters Kluwer; 2021",
          year: 2021,
        },
      ],
    },
    nextSteps: [
      { condition: 'High-alert drug dilution', actions: ['Independent double-check', 'Label concentration clearly', 'Use smart pumps'] },
    ],
    pearls: [
      'Percent w/v: 1% = 1 g/100 mL = 10 mg/mL.',
      'Never dilute incompatible drugs in the same syringe/bag without reference.',
    ],
  },

  // ─── 20. Base excess estimate ──────────────────────────────────────────────
  {
    id: 'base-excess',
    name: 'Base Excess Estimate (ABG)',
    shortName: 'BE approx',
    description: 'Rule-of-thumb base excess/deficit from pH and HCO₃⁻ (van Slyke-style approximation).',
    category: 'critical-care',
    tags: ['base excess', 'abg', 'acid-base', 'metabolic', 'hco3'],
    whenToUse: 'When ABG reports pH and HCO₃ but BE is missing, or to understand metabolic component educationally.',
    whyUse: 'Approximate BE from pH and bicarbonate; blood-gas analyzers use more complete hemoglobin models.',
    inputs: [
      numberInput('ph', 'pH', { min: 6.5, max: 7.8, step: 0.01, defaultValue: 7.3, helpText: 'Arterial (or carefully interpreted venous) pH from the same sample as HCO₃.' }),
      numberInput('hco3', 'HCO₃⁻', { unit: 'mEq/L', min: 1, max: 60, step: 0.1, defaultValue: 18, helpText: 'mEq/L = mmol/L. Same-sample bicarbonate (not total CO₂ from a metabolic panel unless that is all you have).' }),
    ],
    calculate(values) {
      const ph = num(values.ph, 7.3);
      const hco3 = num(values.hco3, 18);
      // Common educational approximation related to van Slyke:
      // BE ≈ 0.93 × (HCO3 − 24.4 + 14.8 × (pH − 7.4))
      const be = 0.93 * (hco3 - 24.4 + 14.8 * (ph - 7.4));
      const beR = round(be, 1);
      const abs = Math.abs(beR);
      const r = riskFromThresholds(abs, [
        {
          max: 2,
          level: 'normal',
          label: 'Near-normal base excess',
          interpretation: `Estimated BE ≈ ${beR} mEq/L. Near zero — little pure metabolic acid/base disturbance by this approximation (still interpret full ABG/VBG).`,
        },
        {
          max: 5,
          level: 'moderate',
          label: beR < 0 ? 'Mild base deficit' : 'Mild base excess',
          interpretation: `Estimated BE ≈ ${beR} mEq/L (${beR < 0 ? 'mild metabolic acidosis component' : 'mild metabolic alkalosis component'} educationally). Correlate with anion gap, lactate, electrolytes.`,
        },
        {
          max: 10,
          level: 'high',
          label: beR < 0 ? 'Moderate base deficit' : 'Moderate base excess',
          interpretation: `Estimated BE ≈ ${beR} mEq/L. Meaningful metabolic disturbance — identify and treat cause; analyzer BE preferred when available.`,
        },
        {
          max: 40,
          level: 'critical',
          label: beR < 0 ? 'Severe base deficit' : 'Severe base excess',
          interpretation: `Estimated BE ≈ ${beR} mEq/L. Severe metabolic derangement — urgent evaluation and therapy.`,
        },
      ]);
      return {
        score: beR,
        unit: 'mEq/L',
        ...r,
        details: [
          { label: 'pH', value: String(ph) },
          { label: 'HCO₃⁻', value: `${hco3} mEq/L` },
          { label: 'Method', value: '0.93×(HCO₃−24.4+14.8×(pH−7.4))' },
        ],
      };
    },
    evidence: {
      summary: 'Approximate BE ≈ 0.93 × (HCO₃ − 24.4 + 14.8 × (pH − 7.4)). Analyzer BE uses van Slyke equations including hemoglobin.',
      formula: 'BE ≈ 0.93 · (HCO₃ − 24.4 + 14.8 · (pH − 7.4))',
      validation: 'Educational estimate only; not identical to machine-reported standard base excess (SBE).',
      references: [
        {
          title: 'The van Slyke equation',
          citation: 'Siggaard-Andersen O. Scand J Clin Lab Invest Suppl. 1977',
          year: 1977,
          pmid: '13478',
          doi: '10.3109/00365517709098927',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Base deficit',
        actions: ['Check AG, lactate, ketones, renal function', 'Resuscitate perfusion', 'Treat underlying cause'],
      },
      {
        condition: 'Base excess',
        actions: ['Volume status / diuretics / vomiting / mineralocorticoid effects', 'Chloride and volume assessment'],
      },
    ],
    pearls: [
      'Base deficit is the negative of base excess.',
      'Chronic respiratory disorders change HCO₃ — BE helps separate metabolic component.',
    ],
  },

  // ─── 21. pH from HCO3 / PCO2 ratio (Henderson–Hasselbalch) ─────────────────
  {
    id: 'ph-from-ratio',
    name: 'pH from HCO₃ / PCO₂ (Henderson–Hasselbalch)',
    shortName: 'pH from ratio',
    description: 'Calculates pH from bicarbonate and PCO₂ using Henderson–Hasselbalch: pH = 6.1 + log₁₀([HCO₃]/(0.03·PCO₂)).',
    category: 'critical-care',
    tags: ['ph', 'henderson-hasselbalch', 'abg', 'hco3', 'pco2', 'acid-base'],
    whenToUse: 'Teaching acid-base consistency checks or estimating pH from metabolic/respiratory pair.',
    whyUse: 'Shows how the HCO₃:dissolved-CO₂ ratio sets pH.',
    inputs: [
      numberInput('hco3', 'HCO₃⁻', { unit: 'mEq/L', min: 1, max: 60, step: 0.1, defaultValue: 24, helpText: 'mEq/L = mmol/L.' }),
      numberInput('pco2', 'PCO₂', { unit: 'mmHg', min: 5, max: 120, step: 0.1, defaultValue: 40, helpText: 'Arterial PCO₂ in mmHg (same sample as HCO₃). 1 mmHg ≈ 0.133 kPa.' }),
    ],
    calculate(values) {
      const hco3 = num(values.hco3, 24);
      const pco2 = num(values.pco2, 40);
      const dissolved = 0.03 * pco2;
      if (dissolved <= 0 || hco3 <= 0) {
        return { score: '—', label: 'Invalid inputs', interpretation: 'HCO₃ and PCO₂ must be positive.', riskLevel: 'info' };
      }
      const ratio = hco3 / dissolved;
      const ph = 6.1 + Math.log10(ratio);
      const phR = round(ph, 2);
      const r = riskFromThresholds(ph, [
        {
          max: 7.2,
          level: 'critical',
          label: 'Severe acidemia (calc)',
          interpretation: `Calculated pH ${phR} from HCO₃ ${hco3} / (0.03×PCO₂ ${pco2}). Ratio HCO₃:dissolved CO₂ = ${round(ratio, 2)}:1 (normal ~20:1). Severe acidemia territory.`,
        },
        {
          max: 7.35,
          level: 'high',
          label: 'Acidemia (calc)',
          interpretation: `Calculated pH ${phR}. Below normal (7.35–7.45). Ratio ${round(ratio, 2)} (normal ~20).`,
        },
        {
          max: 7.45,
          level: 'normal',
          label: 'Normal pH range (calc)',
          interpretation: `Calculated pH ${phR} within normal 7.35–7.45. HCO₃/(0.03·PCO₂) ≈ ${round(ratio, 2)} (target ~20).`,
        },
        {
          max: 7.55,
          level: 'high',
          label: 'Alkalemia (calc)',
          interpretation: `Calculated pH ${phR}. Above normal — alkalemia. Ratio ${round(ratio, 2)}.`,
        },
        {
          max: 8,
          level: 'critical',
          label: 'Severe alkalemia (calc)',
          interpretation: `Calculated pH ${phR}. Marked alkalemia educationally — verify inputs and clinical context.`,
        },
      ]);
      return {
        score: phR,
        unit: 'pH',
        ...r,
        details: [
          { label: 'Dissolved CO₂ (0.03·PCO₂)', value: `${round(dissolved, 2)} mmol/L` },
          { label: 'HCO₃ / dissolved CO₂', value: round(ratio, 2).toString() },
          { label: 'Normal ratio', value: '~20:1 → pH ≈ 7.40' },
        ],
      };
    },
    evidence: {
      summary: 'Henderson–Hasselbalch: pH = 6.1 + log₁₀([HCO₃⁻] / (0.03 × PCO₂)) with HCO₃ in mEq/L and PCO₂ in mmHg.',
      formula: 'pH = 6.1 + log10(HCO3 / (0.03·PCO2))',
      validation: 'Foundational acid-base relationship; solubility coefficient 0.03 mmol/L/mmHg at body temperature.',
      references: [
        {
          title: 'The Henderson-Hasselbalch equation: its history and limitations',
          citation: 'Po HN, Senozan NM. J Chem Educ. 2001;78:1499-1503',
          year: 2001,
          doi: '10.1021/ed078p1499',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'pH abnormal',
        actions: ['Full ABG interpretation (primary process + compensation)', 'Anion gap if metabolic acidosis', 'Clinical correlation'],
      },
    ],
    pearls: [
      'If calculated pH disagrees with measured pH, suspect lab error, temperature, or non-equilibrium sample.',
      'Winters formulas estimate expected PCO₂ for metabolic disorders — complementary tool.',
    ],
  },

  // ─── 22. Estimated PaO2 from FiO2 ──────────────────────────────────────────
  {
    id: 'pao2-estimated-fio2',
    name: 'Estimated PaO₂ from FiO₂ (Rule of Thumb)',
    shortName: 'PaO₂ ≈ FiO₂×5',
    description: 'Rough expected PaO₂ ≈ FiO₂% × 5 on simple teaching rule (e.g., RA 21% → ~100 mmHg).',
    category: 'pulmonary',
    tags: ['pao2', 'fio2', 'oxygen', 'abg', 'rule of thumb', 'a-a'],
    whenToUse: 'Quick bedside expectation of PaO₂ for a given FiO₂ before comparing to measured ABG.',
    whyUse: 'Simple screen for gas-exchange problems when measured PaO₂ << FiO₂%×5.',
    inputs: [
      numberInput('fio2', 'FiO₂', {
        unit: '%',
        min: 21,
        max: 100,
        defaultValue: 21,
        helpText: 'Percent oxygen (21–100)',
      }),
      numberInput('measuredPao2', 'Measured PaO₂ (optional)', {
        unit: 'mmHg',
        min: 0,
        max: 700,
        defaultValue: 0,
        helpText: 'Enter 0 to skip comparison',
        required: false,
      }),
    ],
    calculate(values) {
      const fio2 = num(values.fio2, 21);
      const measured = num(values.measuredPao2, 0);
      const expected = round(fio2 * 5, 0);
      // Alternate rough rule sometimes taught: PaO2 ≈ FiO2% × 4–5
      const lowBand = round(fio2 * 4, 0);
      let interpretation = `Rule of thumb expected PaO₂ ≈ ${expected} mmHg (FiO₂ ${fio2}% × 5). Rough acceptable band often cited ~${lowBand}–${expected} mmHg (×4–5). Assumes upright, young, healthy lungs at sea level — not a precise prediction.`;
      let riskLevel: 'info' | 'normal' | 'moderate' | 'high' | 'critical' = 'info';
      let label = 'Estimated PaO₂ (×5 rule)';
      if (measured > 0) {
        const ratio = round(measured / expected, 2);
        const pf = round(measured / (fio2 / 100), 0);
        if (measured < lowBand * 0.7) {
          riskLevel = 'high';
          label = 'Measured PaO₂ far below rule-of-thumb';
          interpretation = `Measured PaO₂ ${measured} vs expected ~${expected} (×5 rule). Markedly reduced — evaluate shunt/V̇A/Q̇ mismatch, PE, pneumonia, edema; P/F ≈ ${pf}.`;
        } else if (measured < lowBand) {
          riskLevel = 'moderate';
          label = 'Measured PaO₂ below rough band';
          interpretation = `Measured PaO₂ ${measured} is below ~FiO₂×4 (${lowBand}). Possible impaired gas exchange (ratio to ×5 estimate ${ratio}). P/F ≈ ${pf}.`;
        } else {
          riskLevel = 'normal';
          label = 'Measured PaO₂ near/above rough expectation';
          interpretation = `Measured PaO₂ ${measured} vs ×5 estimate ${expected} mmHg (ratio ${ratio}). Within or above crude teaching expectation. P/F ≈ ${pf}.`;
        }
      }
      return {
        score: expected,
        unit: 'mmHg',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'FiO₂', value: `${fio2}%` },
          { label: 'Expected (×5)', value: `${expected} mmHg` },
          { label: 'Lower rough (×4)', value: `${lowBand} mmHg` },
          ...(measured > 0 ? [{ label: 'Measured PaO₂', value: `${measured} mmHg` }] : []),
        ],
      };
    },
    evidence: {
      summary: 'Teaching rule: expected PaO₂ (mmHg) ≈ FiO₂ (%) × 5 (room air 21×5 ≈ 105). Crude; alveolar gas equation is more rigorous.',
      formula: 'PaO2_est ≈ FiO2_% × 5',
      validation: 'Mnemonic only. Prefer A-a gradient / P/F / SpO₂ trends for clinical decisions.',
      references: [
        {
          title: 'Alveolar Gas Equation',
          citation: 'Hendrix JM, Burns B. StatPearls [Internet]. NCBI Bookshelf NBK482268 (FiO₂%×5 is a bedside approximation of expected PaO₂)',
          year: 2024,
          url: 'https://www.ncbi.nlm.nih.gov/books/NBK482268/',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Measured PaO₂ much less than expected',
        actions: ['Compute A-a gradient or P/F', 'CXR / lung US', 'Consider PE, pneumonia, edema, shunt'],
      },
    ],
    pearls: [
      'Age lowers expected PaO₂ on room air (~80–100 mmHg in elderly).',
      'High altitude reduces inspired PO₂ — rule fails.',
    ],
  },

  // ─── 23. Age-adjusted max HR (Tanaka) ──────────────────────────────────────
  {
    id: 'age-adjust-hr',
    name: 'Maximum Heart Rate (Tanaka)',
    shortName: 'HRmax Tanaka',
    description: 'Predicted maximum heart rate: 208 − 0.7 × age (Tanaka et al.), with optional training zones.',
    category: 'cardiology',
    tags: ['max hr', 'tanaka', 'exercise', 'target heart rate', 'age'],
    whenToUse: 'Exercise prescription and stress-test context when an age-predicted HRmax is needed.',
    whyUse: 'Tanaka equation is often more accurate than the classic 220 − age formula across adult ages.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 10, max: 100, defaultValue: 40 }),
      selectInput('zone', 'Optional training zone display', [
        { label: 'HRmax only', value: 'none' },
        { label: 'Moderate (50–70% HRmax)', value: 'mod' },
        { label: 'Vigorous (70–85% HRmax)', value: 'vig' },
        { label: 'Both zones', value: 'both' },
      ]),
    ],
    calculate(values) {
      const age = num(values.age, 40);
      const hrmax = round(208 - 0.7 * age, 0);
      const classic = round(220 - age, 0);
      const zone = String(values.zone ?? 'none');
      const modLo = round(0.5 * hrmax, 0);
      const modHi = round(0.7 * hrmax, 0);
      const vigLo = round(0.7 * hrmax, 0);
      const vigHi = round(0.85 * hrmax, 0);
      let zoneText = '';
      if (zone === 'mod' || zone === 'both') zoneText += ` Moderate ≈ ${modLo}–${modHi} bpm.`;
      if (zone === 'vig' || zone === 'both') zoneText += ` Vigorous ≈ ${vigLo}–${vigHi} bpm.`;
      return {
        score: hrmax,
        unit: 'bpm',
        label: 'Predicted HRmax (Tanaka)',
        interpretation: `Tanaka HRmax ≈ ${hrmax} bpm (208 − 0.7×${age}). Classic 220−age ≈ ${classic} bpm.${zoneText} Individual max varies; β-blockers and disease lower achievable HR.`,
        riskLevel: 'info',
        details: [
          { label: 'Tanaka HRmax', value: `${hrmax} bpm` },
          { label: '220 − age', value: `${classic} bpm` },
          { label: '50–70% zone', value: `${modLo}–${modHi} bpm` },
          { label: '70–85% zone', value: `${vigLo}–${vigHi} bpm` },
        ],
      };
    },
    evidence: {
      summary: 'Tanaka: HRmax = 208 − 0.7 × age (years). Preferred over 220 − age in many exercise physiology contexts.',
      formula: 'HRmax = 208 − 0.7 · age',
      validation: 'Meta-analysis-derived; still has wide individual scatter (SD often ~10 bpm).',
      references: [
        {
          title: 'Age-predicted maximal heart rate revisited',
          citation: 'Tanaka H, Monahan KD, Seals DR. J Am Coll Cardiol. 2001',
          year: 2001,
          pmid: '11153730',
          doi: '10.1016/s0735-1097(00)01054-8',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Exercise Rx',
        actions: ['Use HRR / Karvonen if resting HR known', 'Screen for contraindications', 'Account for rate-limiting meds'],
      },
    ],
    pearls: [
      'Stress-test “diagnostic” HR targets often use 85% of predicted max.',
      'Do not use predicted max as a hard safety ceiling for all patients.',
    ],
  },

  // ─── 24. Target SpO2 COPD vs normal ────────────────────────────────────────
  {
    id: 'target-spo2-copd',
    name: 'Target SpO₂ (COPD vs Normal)',
    shortName: 'SpO₂ Targets',
    description: 'Educational oxygen saturation targets for COPD/CO₂ retainers vs general acutely ill adults.',
    category: 'pulmonary',
    tags: ['spo2', 'oxygen', 'copd', 'target saturation', 'bts'],
    whenToUse: 'Setting pulse-ox targets when prescribing oxygen in COPD or general acute care.',
    whyUse: 'BTS-style guidance: many COPD patients target 88–92%; most others 94–98% (context-dependent).',
    inputs: [
      selectInput(
        'population',
        'Patient group',
        [
          {
            label: 'COPD / risk of hypercapnic respiratory failure',
            value: 'copd',
            description: 'Target SpO₂ 88–92% unless an individualized ABG-based ceiling exists',
          },
          {
            label: 'General acutely ill (no hypercapnia risk)',
            value: 'general',
            description: 'Target SpO₂ 94–98%',
          },
          {
            label: 'Known prior hypercapnia on O₂',
            value: 'hypercapnia',
            description: 'Target SpO₂ 88–92%; individualize from prior ABGs',
          },
          {
            label: 'Pregnancy (educational)',
            value: 'pregnancy',
            description: 'Target SpO₂ 94–98%; avoid hypoxia',
          },
        ],
        'copd',
        'Hypercapnia-risk is not only COPD — also obesity hypoventilation, neuromuscular disease, severe chest-wall deformity, cystic fibrosis, and prior CO₂ retention on oxygen. Target 88–92% unless an individualized ABG-based ceiling exists. Never withhold O₂ in a crashing airway/hypoxemic emergency.',
      ),
      numberInput('currentSpo2', 'Current SpO₂ (optional)', {
        unit: '%',
        min: 50,
        max: 100,
        required: false,
        helpText: 'Leave blank to show targets only',
      }),
      yesNo('onOxygen', 'Currently on supplemental oxygen', 0),
    ],
    calculate(values) {
      const pop = String(values.population ?? 'copd');
      const spo2 = num(values.currentSpo2, 0);
      const onO2 = bool(values.onOxygen);
      let target = '94–98%';
      let label = 'General target band';
      let interpretation =
        'Most acutely ill adults without hypercapnia risk: target SpO₂ 94–98% (avoid unnecessary high FiO₂).';
      let riskLevel: 'info' | 'low' | 'moderate' | 'high' | 'critical' | 'normal' = 'info';

      if (pop === 'copd') {
        target = '88–92%';
        label = 'COPD / hypercapnia-risk target';
        interpretation =
          'Educational target SpO₂ 88–92% for many patients with COPD or other risk of hypercapnic respiratory failure (BTS-style). Use controlled O₂ (e.g., 24–28% Venturi or 1–2 L/min NC) and ABG when critically ill or rising CO₂ risk.';
      } else if (pop === 'hypercapnia') {
        target = '88–92% (individualize)';
        label = 'Prior hypercapnia on oxygen';
        interpretation =
          'Prior hypercapnic failure on oxygen: usually target 88–92% with close monitoring; some patients need tailored ceilings from prior ABGs. Urgent ABG if drowsy or critically ill.';
      } else if (pop === 'pregnancy') {
        target = '94–98%';
        label = 'Pregnancy educational target';
        interpretation =
          'Pregnancy: avoid hypoxia; educational SpO₂ targets often 94–98%. Obstetric and critical-care input for severe illness.';
      }

      if (spo2 > 0) {
        const [loS, hiS] = target.includes('88') ? [88, 92] : [94, 98];
        if (spo2 < loS - 3) {
          riskLevel = 'high';
          interpretation += ` Current SpO₂ ${spo2}% is below the ${target} band — escalate oxygen carefully and assess work of breathing/ABG.`;
        } else if (spo2 < loS) {
          riskLevel = 'moderate';
          interpretation += ` Current SpO₂ ${spo2}% is slightly below ${target} — titrate O₂ toward target.`;
        } else if (spo2 > hiS && onO2) {
          riskLevel = 'moderate';
          interpretation += ` Current SpO₂ ${spo2}% is above ${target} while on oxygen — wean FiO₂/flow to avoid over-oxygenation (especially COPD).`;
        } else if (spo2 >= loS && spo2 <= hiS) {
          riskLevel = 'normal';
          interpretation += ` Current SpO₂ ${spo2}% is within the ${target} educational target.`;
        } else {
          interpretation += ` Current SpO₂ ${spo2}%.`;
        }
      }

      return {
        score: target,
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Target SpO₂', value: target },
          { label: 'Population', value: pop },
          ...(spo2 > 0 ? [{ label: 'Current SpO₂', value: `${spo2}%` }] : []),
          { label: 'On O₂', value: onO2 ? 'Yes' : 'No' },
        ],
        recommendations: [
          'Document target saturation on oxygen order',
          'Obtain ABG if critically ill, drowsy, or rising O₂ need in COPD',
          'Treat cause of hypoxemia — do not chase SpO₂ alone',
        ],
      };
    },
    evidence: {
      summary: 'BTS emergency oxygen guidance: target 94–98% for most patients; 88–92% for those at risk of hypercapnic respiratory failure (e.g., COPD) unless a different individualized target is set.',
      formula: 'Target bands (educational): COPD 88–92%; general 94–98%',
      validation: 'Guideline-based teaching; always individualize (pneumothorax, CO poisoning, pregnancy, critical illness exceptions).',
      references: [
        {
          title: 'BTS guideline for oxygen use in adults in healthcare and emergency settings',
          citation: 'O’Driscoll BR et al. Thorax. 2017',
          year: 2017,
          pmid: '28507176',
          doi: '10.1136/thoraxjnl-2016-209729',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'COPD on oxygen',
        actions: ['Controlled oxygen delivery', 'ABG after initiation if high risk', 'NIV assessment if acidotic hypercapnia'],
      },
    ],
    pearls: [
      'Target is a range — avoid both hypoxia and unnecessary hyperoxia.',
      'Never withhold oxygen in critical hypoxemia/airway emergency while setting up controlled O₂.',
    ],
  },

  // ─── 25. Modified shock index (MSI = HR/MAP) ───────────────────────────────
  {
    id: 'modified-shock-index',
    name: 'Modified Shock Index (MSI)',
    shortName: 'MSI',
    description: 'Modified shock index = heart rate / mean arterial pressure (MAP).',
    category: 'emergency',
    tags: ['msi', 'modified shock index', 'shock', 'hemodynamics', 'map', 'hr'],
    whenToUse: 'Triage and shock assessment when HR and BP (for MAP) are available.',
    whyUse: 'Incorporates diastolic pressure via MAP; may outperform classic SI (HR/SBP) in some cohorts.',
    inputs: [
      numberInput('hr', 'Heart rate', { unit: 'bpm', min: 20, max: 300, defaultValue: 110, helpText: 'Pulse in beats/min. MSI = HR / MAP; concern often rises above ~1.3.' }),
      numberInput('sbp', 'Systolic BP', { unit: 'mmHg', min: 40, max: 300, defaultValue: 100 }),
      numberInput('dbp', 'Diastolic BP', { unit: 'mmHg', min: 20, max: 200, defaultValue: 60, helpText: 'MAP ≈ DBP + (SBP − DBP)/3.' }),
    ],
    calculate(values) {
      const hr = num(values.hr, 110);
      const sbp = num(values.sbp, 100);
      const dbp = num(values.dbp, 60);
      const map = dbp + (sbp - dbp) / 3;
      if (map <= 0 || hr <= 0) {
        return { score: '—', label: 'Invalid inputs', interpretation: 'Enter positive HR and blood pressures.', riskLevel: 'info' };
      }
      const msi = round(hr / map, 2);
      const si = round(hr / sbp, 2);
      const mapR = round(map, 1);
      const r = riskFromThresholds(msi, [
        {
          max: 0.7,
          level: 'moderate',
          label: 'Low MSI',
          interpretation: `MSI ${msi} (HR ${hr} / MAP ${mapR}). Low MSI can reflect bradycardia or high MAP — still interpret clinically (not “protective” alone).`,
        },
        {
          max: 1.3,
          level: 'low',
          label: 'MSI in common mid-range',
          interpretation: `MSI ${msi}. Mid educational range. Classic SI (HR/SBP) = ${si}. Continue full perfusion assessment.`,
        },
        {
          max: 1.6,
          level: 'moderate',
          label: 'Elevated MSI',
          interpretation: `MSI ${msi}. Elevated modified shock index — higher likelihood of occult shock/need for intervention in some ED studies. Classic SI = ${si}.`,
        },
        {
          max: 2,
          level: 'high',
          label: 'High MSI',
          interpretation: `MSI ${msi}. High — concerning tachycardia relative to MAP (${mapR} mmHg). Escalate resuscitation and workup. Classic SI = ${si}.`,
        },
        {
          max: 10,
          level: 'critical',
          label: 'Very high MSI',
          interpretation: `MSI ${msi}. Very high HR/MAP ratio — critical shock physiology until proven otherwise. Classic SI = ${si}.`,
        },
      ]);
      return {
        score: msi,
        unit: 'HR/MAP',
        ...r,
        details: [
          { label: 'MAP', value: `${mapR} mmHg` },
          { label: 'HR', value: `${hr} bpm` },
          { label: 'Classic SI (HR/SBP)', value: String(si) },
          { label: 'SBP / DBP', value: `${sbp} / ${dbp}` },
        ],
      };
    },
    evidence: {
      summary: 'Modified shock index MSI = HR / MAP, with MAP ≈ DBP + (SBP − DBP)/3. Elevated MSI associated with mortality and need for interventions in emergency cohorts.',
      formula: 'MSI = HR / MAP; MAP = DBP + (SBP−DBP)/3',
      validation: 'Thresholds vary by study (often concern rising above ~1.3); complementary to SI, lactate, and clinical exam.',
      references: [
        {
          title: 'Modified shock index and mortality rate of emergency patients',
          citation: 'Liu YC et al. World J Emerg Med. 2012',
          year: 2012,
          pmid: '25215048',
          doi: '10.5847/wjem.j.issn.1920-8642.2012.02.006',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'MSI elevated',
        actions: ['Reassess ABCs and perfusion', 'Lactate / labs', 'Volume vs pressors as indicated', 'Search for shock etiology'],
      },
    ],
    pearls: [
      'MSI rises when MAP falls or HR rises — captures diastolic hypotension better than SI alone.',
      'Arrhythmias and inaccurate NIBP readings distort both SI and MSI.',
    ],
  },
];
