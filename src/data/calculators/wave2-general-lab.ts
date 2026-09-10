import type { Calculator } from '../../types/calculator';
import { num, bool, round, yesNo, selectInput, numberInput, riskFromThresholds, isMissingValue } from '../../utils/helpers';

// Ensure shared helper imports stay type-checked even when unused in this wave.
const _sharedHelpers = { bool, yesNo };
void _sharedHelpers;

/** Approximate Martin/Hopkins TG:VLDL factor from TG + non-HDL strata (educational table). */
function martinHopkinsFactor(tg: number, nonHdl: number): number {
  const tgIdx =
    tg < 80 ? 0 : tg < 120 ? 1 : tg < 160 ? 2 : tg < 200 ? 3 : tg < 300 ? 4 : tg < 400 ? 5 : 6;
  const nhIdx =
    nonHdl < 100 ? 0 : nonHdl < 130 ? 1 : nonHdl < 160 ? 2 : nonHdl < 190 ? 3 : nonHdl < 220 ? 4 : 5;
  // Rows = non-HDL bins; cols = TG bins. Factors ~3–12 (Martin/Hopkins range).
  const factors = [
    [11.9, 9.5, 7.6, 6.5, 5.5, 4.7, 3.9],
    [11.5, 9.0, 7.3, 6.2, 5.3, 4.6, 3.8],
    [11.0, 8.6, 7.0, 6.0, 5.2, 4.5, 3.7],
    [10.5, 8.2, 6.8, 5.8, 5.0, 4.4, 3.6],
    [10.0, 7.8, 6.5, 5.6, 4.9, 4.3, 3.5],
    [9.5, 7.4, 6.2, 5.4, 4.7, 4.1, 3.4],
  ];
  return factors[nhIdx][tgIdx];
}

export const wave2GeneralLabCalcs: Calculator[] = [
  {
    id: 'ldl-sampson',
    name: 'LDL-C (Sampson / NIH Equation)',
    shortName: 'LDL Sampson',
    description: 'Estimates LDL-C with the Sampson-NIH equation; more accurate at higher TG than Friedewald.',
    category: 'endocrinology',
    tags: ['cholesterol', 'ldl', 'lipid', 'sampson'],
    whenToUse: 'Calculated LDL when TG are elevated (validated to ~800 mg/dL) or LDL is low.',
    whyUse: 'Outperforms Friedewald at low LDL and higher TG; usable when Friedewald is invalid.',
    inputs: [
      numberInput('tc', 'Total cholesterol', { unit: 'mg/dL', min: 50, max: 600, defaultValue: 200 }),
      numberInput('hdl', 'HDL-C', { unit: 'mg/dL', min: 10, max: 150, defaultValue: 50 }),
      numberInput('tg', 'Triglycerides', { unit: 'mg/dL', min: 20, max: 1000, defaultValue: 150 }),
    ],
    calculate(values) {
      const tc = num(values.tc, 200);
      const hdl = num(values.hdl, 50);
      const tg = num(values.tg, 150);
      if (tg > 800) {
        return {
          score: '—',
          label: 'Outside validated TG range',
          interpretation: 'Sampson equation validated up to TG ≈800 mg/dL. Prefer direct LDL measurement.',
          riskLevel: 'info',
        };
      }
      const nonHdl = tc - hdl;
      // Sampson-NIH: LDL = TC/0.948 − HDL/0.971 − [TG/8.59 + (TG×nonHDL)/2140 − TG²/16100] − 9.44
      const ldl = round(
        tc / 0.948 - hdl / 0.971 - (tg / 8.59 + (tg * nonHdl) / 2140 - (tg * tg) / 16100) - 9.44,
        0
      );
      const r = riskFromThresholds(ldl, [
        { max: 69, level: 'normal', label: 'Very low / optimal for high-risk', interpretation: 'LDL <70 often targeted in very high-risk ASCVD.' },
        { max: 99, level: 'normal', label: 'Optimal / near optimal', interpretation: 'LDL <100 optimal for many primary-prevention contexts.' },
        { max: 129, level: 'low', label: 'Above optimal / borderline', interpretation: 'LDL 100–129: risk-dependent management.' },
        { max: 159, level: 'moderate', label: 'Borderline high', interpretation: 'LDL 130–159: consider intensity of therapy.' },
        { max: 500, level: 'high', label: 'High / very high', interpretation: 'LDL ≥160: high — lifestyle ± pharmacotherapy per guidelines.' },
      ]);
      return {
        score: ldl,
        unit: 'mg/dL',
        ...r,
        details: [
          { label: 'Non-HDL-C', value: `${round(nonHdl, 0)} mg/dL` },
          { label: 'TG', value: `${tg} mg/dL` },
        ],
      };
    },
    evidence: {
      summary: 'Sampson-NIH equation estimates LDL-C from TC, HDL, and TG with improved accuracy vs Friedewald at higher TG and low LDL.',
      formula: 'LDL = TC/0.948 − HDL/0.971 − [TG/8.59 + (TG×nonHDL)/2140 − TG²/16100] − 9.44 (mg/dL)',
      validation: 'Derived vs β-quantification; accurate with TG up to ~800 mg/dL in original work.',
      references: [
        {
          title: 'A new equation for calculation of LDL-C in normolipidemia and/or hypertriglyceridemia',
          citation: 'Sampson M et al. JAMA Cardiol. 2020',
          year: 2020,
          pmid: '32101259',
          doi: '10.1001/jamacardio.2020.0013',
        },
      ],
    },
    nextSteps: [
      { condition: 'Elevated LDL or high ASCVD risk', actions: ['ASCVD risk assessment', 'Statin intensity per AHA/ACC or ESC', 'Address TG if ≥150–500'] },
      { condition: 'TG very high', actions: ['Direct LDL if TG >800', 'Evaluate for secondary causes of hyperTG'] },
    ],
    pearls: ['Prefer direct LDL or apoB when discordance suspected.', 'Non-HDL and apoB remain useful risk markers when TG elevated.'],
  },
  {
    id: 'ldl-martin',
    name: 'LDL-C (Martin/Hopkins)',
    shortName: 'LDL Martin',
    description: 'Estimates LDL-C using an adjustable TG:VLDL factor (Martin/Hopkins method).',
    category: 'endocrinology',
    tags: ['cholesterol', 'ldl', 'martin', 'hopkins'],
    whenToUse: 'Calculated LDL with better accuracy than Friedewald at low LDL or higher TG (typically TG <400 mg/dL).',
    whyUse: 'AHA-supported alternative; factor varies with TG and non-HDL rather than fixed /5.',
    inputs: [
      numberInput('tc', 'Total cholesterol', { unit: 'mg/dL', min: 50, max: 600, defaultValue: 200 }),
      numberInput('hdl', 'HDL-C', { unit: 'mg/dL', min: 10, max: 150, defaultValue: 50 }),
      numberInput('tg', 'Triglycerides', { unit: 'mg/dL', min: 20, max: 800, defaultValue: 150 }),
    ],
    calculate(values) {
      const tc = num(values.tc, 200);
      const hdl = num(values.hdl, 50);
      const tg = num(values.tg, 150);
      const nonHdl = tc - hdl;
      if (tg >= 400) {
        return {
          score: '—',
          label: 'TG ≥400 — use caution',
          interpretation: 'Original Martin/Hopkins table best validated with TG <400 mg/dL. Consider Sampson equation or direct LDL.',
          riskLevel: 'info',
          details: [{ label: 'Non-HDL-C', value: `${round(nonHdl, 0)} mg/dL` }],
        };
      }
      const factor = martinHopkinsFactor(tg, nonHdl);
      const ldl = round(tc - hdl - tg / factor, 0);
      const r = riskFromThresholds(ldl, [
        { max: 69, level: 'normal', label: 'Very low / high-risk goal range', interpretation: 'LDL <70 common goal in very high-risk ASCVD.' },
        { max: 99, level: 'normal', label: 'Optimal / near optimal', interpretation: 'LDL <100 often acceptable in lower-risk primary prevention.' },
        { max: 129, level: 'low', label: 'Above optimal', interpretation: 'LDL 100–129: individualize with full risk profile.' },
        { max: 159, level: 'moderate', label: 'Borderline high', interpretation: 'LDL 130–159: intensify lifestyle ± therapy.' },
        { max: 500, level: 'high', label: 'High / very high', interpretation: 'LDL ≥160: high — guideline-directed lipid therapy.' },
      ]);
      return {
        score: ldl,
        unit: 'mg/dL',
        ...r,
        details: [
          { label: 'Non-HDL-C', value: `${round(nonHdl, 0)} mg/dL` },
          { label: 'TG:VLDL factor (approx)', value: String(round(factor, 1)) },
        ],
      };
    },
    evidence: {
      summary: 'Martin/Hopkins: LDL = TC − HDL − TG/f, where f is an adjustable factor from TG and non-HDL strata (not fixed 5).',
      formula: 'LDL-C = non-HDL-C − TG/factor(TG, non-HDL)',
      validation: 'Derived from >1.3M lipid profiles; improves accuracy vs Friedewald at low LDL and higher TG. This tool uses a condensed factor table approximation.',
      references: [
        {
          title: 'Comparison of a novel method vs the Friedewald equation for estimating LDL-C',
          citation: 'Martin SS et al. JAMA. 2013',
          year: 2013,
          pmid: '24240933',
          doi: '10.1001/jama.2013.280532',
        },
      ],
    },
    nextSteps: [
      { condition: 'Elevated LDL', actions: ['Full ASCVD risk assessment', 'Statin therapy per guidelines'] },
      { condition: 'TG ≥400', actions: ['Direct LDL or Sampson equation', 'Manage hypertriglyceridemia'] },
    ],
    pearls: ['Factor replaces Friedewald’s fixed 5; typically higher at low TG and lower at high TG.', 'Implementation here approximates the 180-cell table for bedside use.'],
  },
  {
    id: 'non-hdl',
    name: 'Non-HDL Cholesterol',
    shortName: 'Non-HDL',
    description: 'Non-HDL-C = total cholesterol − HDL-C; captures all atherogenic apoB-containing lipoproteins.',
    category: 'endocrinology',
    tags: ['cholesterol', 'lipid', 'non-hdl', 'ascvd'],
    whenToUse: 'Lipid risk assessment, especially when TG elevated or as a secondary treatment target.',
    whyUse: 'Includes LDL, VLDL, IDL, and remnant cholesterol; less dependent on fasting than calculated LDL.',
    inputs: [
      numberInput('tc', 'Total cholesterol', { unit: 'mg/dL', min: 50, max: 600, defaultValue: 200 }),
      numberInput('hdl', 'HDL-C', { unit: 'mg/dL', min: 10, max: 150, defaultValue: 50 }),
    ],
    calculate(values) {
      const tc = num(values.tc, 200);
      const hdl = num(values.hdl, 50);
      const nonHdl = round(tc - hdl, 0);
      const r = riskFromThresholds(nonHdl, [
        { max: 99, level: 'normal', label: 'Very low / intensive goal range', interpretation: 'Non-HDL <100 aligns with very aggressive LDL goals (e.g., LDL <70).' },
        { max: 129, level: 'normal', label: 'Near goal for many high-risk', interpretation: 'Non-HDL <130 often secondary target when LDL goal <100.' },
        { max: 159, level: 'moderate', label: 'Above common targets', interpretation: 'Non-HDL 130–159: above typical high-risk targets.' },
        { max: 189, level: 'moderate', label: 'Elevated', interpretation: 'Non-HDL 160–189: elevated atherogenic burden.' },
        { max: 500, level: 'high', label: 'Markedly elevated', interpretation: 'Non-HDL ≥190: high — evaluate familial hypercholesterolemia patterns and treat intensively.' },
      ]);
      return {
        score: nonHdl,
        unit: 'mg/dL',
        ...r,
        details: [{ label: 'Rule of thumb', value: 'Non-HDL goal ≈ LDL goal + 30' }],
      };
    },
    evidence: {
      summary: 'Non-HDL-C = TC − HDL. Secondary target in many lipid guidelines; correlates with apoB particle burden.',
      formula: 'Non-HDL-C = TC − HDL-C',
      validation: 'Strong association with ASCVD events; useful when TG high or LDL calculation limited.',
      references: [
        {
          title: '2018 AHA/ACC Guideline on the Management of Blood Cholesterol',
          citation: 'Grundy SM et al. Circulation. 2019',
          year: 2018, pmid: '30586774',
          doi: '10.1161/CIR.0000000000000625', },
      ],
    },
    nextSteps: [
      { condition: 'Above goal', actions: ['Intensify lifestyle and statin therapy', 'Add ezetimibe/PCSK9i if very high risk and not at goal'] },
    ],
    pearls: ['Non-HDL goal is typically 30 mg/dL higher than the corresponding LDL goal.'],
  },
  {
    id: 'cholesterol-goals',
    name: 'LDL / Non-HDL Goal Helper (ASCVD Risk Tier)',
    shortName: 'Lipid Goals',
    description: 'Suggests LDL-C and non-HDL-C treatment goals by ASCVD risk category (guideline-oriented).',
    category: 'endocrinology',
    tags: ['ldl', 'goals', 'ascvd', 'statin'],
    whenToUse: 'Setting lipid targets after risk stratification.',
    whyUse: 'Quick bedside reminder of intensity of LDL lowering by risk tier (AHA/ACC and ESC-style).',
    inputs: [
      selectInput(
        'riskTier',
        'ASCVD risk tier',
        [
          { label: 'Low risk (primary prevention)', value: 'low' },
          { label: 'Borderline / intermediate risk', value: 'intermediate' },
          { label: 'High risk (primary prevention)', value: 'high' },
          { label: 'Clinical ASCVD (secondary prevention)', value: 'ascvd' },
          { label: 'Very high risk ASCVD (multiple events / high-risk features)', value: 'very_high' },
        ],
        'high'
      ),
      numberInput('ldl', 'Current LDL-C (optional)', { unit: 'mg/dL', min: 0, max: 400, defaultValue: 120, helpText: 'Optional — for gap-to-goal display', required: false }),
      numberInput('nonHdl', 'Current non-HDL-C (optional)', { unit: 'mg/dL', min: 0, max: 500, defaultValue: 150, required: false }),
    ],
    calculate(values) {
      const tier = String(values.riskTier ?? 'high');
      const ldl = num(values.ldl, 0);
      const nonHdl = num(values.nonHdl, 0);
      const goals: Record<string, { ldl: number; nonHdl: number; label: string; interpretation: string; riskLevel: 'normal' | 'low' | 'moderate' | 'high' | 'info' }> = {
        low: {
          ldl: 100,
          nonHdl: 130,
          label: 'Low-risk targets',
          interpretation: 'Often lifestyle focus; LDL <100 and non-HDL <130 are reasonable reference points. Shared decision-making if risk enhancers present.',
          riskLevel: 'normal',
        },
        intermediate: {
          ldl: 100,
          nonHdl: 130,
          label: 'Intermediate-risk targets',
          interpretation: 'Consider moderate-intensity statin if risk discussion favors therapy. Aim LDL <100 / non-HDL <130; CAC may refine decision.',
          riskLevel: 'low',
        },
        high: {
          ldl: 100,
          nonHdl: 130,
          label: 'High-risk primary prevention',
          interpretation: 'High-intensity or maximal tolerated statin typically indicated. LDL reduction ≥50% and LDL <100 (or lower if preferred).',
          riskLevel: 'moderate',
        },
        ascvd: {
          ldl: 70,
          nonHdl: 100,
          label: 'Secondary prevention goals',
          interpretation: 'High-intensity statin. Target LDL <70 mg/dL and non-HDL <100; add ezetimibe/PCSK9i if above threshold on max statin.',
          riskLevel: 'high',
        },
        very_high: {
          ldl: 55,
          nonHdl: 85,
          label: 'Very high-risk goals',
          interpretation: 'Very high-risk ASCVD: many guidelines favor LDL <55–70 mg/dL (ESC often <55). Maximize LLT including non-statins as needed.',
          riskLevel: 'high',
        },
      };
      const g = goals[tier] ?? goals.high;
      const details: { label: string; value: string }[] = [
        { label: 'LDL goal (approx)', value: `<${g.ldl} mg/dL` },
        { label: 'Non-HDL goal (approx)', value: `<${g.nonHdl} mg/dL` },
      ];
      if (ldl > 0) details.push({ label: 'LDL gap to goal', value: `${round(Math.max(0, ldl - g.ldl), 0)} mg/dL` });
      if (nonHdl > 0) details.push({ label: 'Non-HDL gap to goal', value: `${round(Math.max(0, nonHdl - g.nonHdl), 0)} mg/dL` });
      return {
        score: g.ldl,
        unit: 'mg/dL LDL goal',
        label: g.label,
        interpretation: g.interpretation,
        riskLevel: g.riskLevel,
        details,
        recommendations: [
          'Confirm risk tier with full ASCVD calculator / clinical history',
          'Individualize targets (age, frailty, life expectancy, patient preference)',
        ],
      };
    },
    evidence: {
      summary: 'LDL and non-HDL goals vary by ASCVD risk. AHA/ACC emphasize risk-based statin intensity and LDL thresholds for add-on therapy; ESC uses risk-category LDL targets.',
      validation: 'Guideline synthesis for education — not a substitute for full guideline text or shared decision-making.',
      references: [
        { title: '2018 AHA/ACC cholesterol guideline', citation: 'Grundy SM et al. Circulation. 2019', year: 2018, pmid: '30586774',
          doi: '10.1161/CIR.0000000000000625', },
        { title: '2019 ESC/EAS dyslipidaemia guidelines', citation: 'Mach F et al. Eur Heart J. 2020', year: 2019, pmid: '31504418',
          doi: '10.1093/eurheartj/ehz455', },
      ],
    },
    nextSteps: [
      { condition: 'Not at goal on max statin', actions: ['Add ezetimibe', 'Consider PCSK9 inhibitor / bempedoic acid per indication'] },
      { condition: 'Primary prevention uncertainty', actions: ['Coronary artery calcium scoring', 'Risk-enhancer review'] },
    ],
  },
  {
    id: 'triglyceride-index',
    name: 'Triglyceride-Glucose Index (TyG)',
    shortName: 'TyG Index',
    description: 'TyG index = ln(TG × fasting glucose / 2); surrogate of insulin resistance.',
    category: 'endocrinology',
    tags: ['tyg', 'insulin resistance', 'triglycerides', 'metabolic'],
    whenToUse: 'Bedside estimate of insulin resistance from fasting TG and glucose.',
    whyUse: 'Simple, no insulin assay required; associated with metabolic syndrome and CV risk in studies.',
    inputs: [
      numberInput('tg', 'Fasting triglycerides', { unit: 'mg/dL', min: 30, max: 2000, defaultValue: 150 }),
      numberInput('glucose', 'Fasting glucose', { unit: 'mg/dL', min: 50, max: 500, defaultValue: 100 }),
    ],
    calculate(values) {
      const tg = num(values.tg, 150);
      const glu = num(values.glucose, 100);
      const tyg = round(Math.log(tg * glu / 2), 2);
      const r = riskFromThresholds(tyg, [
        { max: 8.0, level: 'normal', label: 'Lower TyG', interpretation: 'Lower TyG suggests relatively better insulin sensitivity (cutoffs population-dependent).' },
        { max: 8.7, level: 'moderate', label: 'Intermediate TyG', interpretation: 'Intermediate range — correlate with metabolic syndrome features.' },
        { max: 20, level: 'high', label: 'Elevated TyG', interpretation: 'Higher TyG associated with insulin resistance / metabolic risk in observational data.' },
      ]);
      return {
        score: tyg,
        unit: 'index',
        ...r,
        details: [{ label: 'Inputs', value: `TG ${tg} mg/dL × glu ${glu} mg/dL` }],
      };
    },
    evidence: {
      summary: 'TyG = ln[TG (mg/dL) × fasting glucose (mg/dL) / 2]. Surrogate of insulin resistance without insulin measurement.',
      formula: 'TyG = ln(TG × glucose / 2)',
      validation: 'Correlates with HOMA-IR and clamp measures in multiple cohorts; absolute cutoffs vary by population.',
      references: [
        {
          title: 'The product of triglycerides and glucose, a simple measure of insulin sensitivity',
          citation: 'Simental-Mendía LE et al. Metab Syndr Relat Disord. 2008',
          year: 2008, pmid: '19067533',
          doi: '10.1089/met.2008.0034', },
      ],
    },
    nextSteps: [
      { condition: 'Elevated TyG', actions: ['Screen metabolic syndrome components', 'Lifestyle intervention', 'Consider formal diabetes screening'] },
    ],
  },
  {
    id: 'homa-b',
    name: 'HOMA-B (β-Cell Function)',
    shortName: 'HOMA-B',
    description: 'Homeostatic model assessment of pancreatic β-cell function from fasting glucose and insulin.',
    category: 'endocrinology',
    tags: ['homa', 'beta cell', 'insulin', 'diabetes'],
    whenToUse: 'Research or clinical estimate of β-cell function with fasting labs.',
    whyUse: 'Complements HOMA-IR; lower HOMA-B suggests reduced insulin secretion capacity.',
    inputs: [
      numberInput('glucose', 'Fasting glucose', { unit: 'mg/dL', min: 50, max: 400, defaultValue: 100 }),
      numberInput('insulin', 'Fasting insulin', { unit: 'µU/mL', min: 0.5, max: 200, step: 0.1, defaultValue: 10 }),
    ],
    calculate(values) {
      const g = num(values.glucose, 100);
      const i = num(values.insulin, 10);
      if (g <= 63) {
        return {
          score: '—',
          label: 'Glucose too low for formula',
          interpretation: 'HOMA-B denominator (glucose − 63) requires fasting glucose >63 mg/dL.',
          riskLevel: 'info',
        };
      }
      const homaB = round((360 * i) / (g - 63), 1);
      const r = riskFromThresholds(homaB, [
        { max: 50, level: 'high', label: 'Low β-cell function range', interpretation: 'Lower HOMA-B suggests reduced β-cell secretion (cutoffs vary widely).' },
        { max: 100, level: 'moderate', label: 'Low-normal / intermediate', interpretation: 'Intermediate HOMA-B — interpret with HOMA-IR and clinical context.' },
        { max: 200, level: 'normal', label: 'Preserved β-cell estimate', interpretation: 'HOMA-B in a more preserved range for many reference populations.' },
        { max: 1000, level: 'info', label: 'High HOMA-B', interpretation: 'High HOMA-B may reflect compensatory hyperinsulinemia; check for hypoglycemia assay issues if unexpected.' },
      ]);
      return {
        score: homaB,
        unit: '%',
        ...r,
        details: [{ label: 'Companion', value: 'Pair with HOMA-IR for resistance vs secretion' }],
      };
    },
    evidence: {
      summary: 'HOMA-B = (20 × insulin) / (glucose_mmol − 3.5) = (360 × insulin) / (glucose_mg/dL − 63).',
      formula: 'HOMA-B = 360 × I / (G_mg/dL − 63)',
      validation: 'Matthews et al. homeostasis model; surrogates imperfect vs clamp/MMTT but widely used in research.',
      references: [
        { title: 'Homeostasis model assessment', citation: 'Matthews DR et al. Diabetologia. 1985', year: 1985, pmid: '3899825',
          doi: '10.1007/BF00280883', },
      ],
    },
    nextSteps: [
      { condition: 'Low HOMA-B + hyperglycemia', actions: ['Assess for progressive insulin deficiency', 'Diabetes education', 'Consider insulin if indicated'] },
    ],
  },
  {
    id: 'quicki',
    name: 'QUICKI (Insulin Sensitivity)',
    shortName: 'QUICKI',
    description: 'Quantitative insulin sensitivity check index from fasting glucose and insulin.',
    category: 'endocrinology',
    tags: ['insulin sensitivity', 'quicki', 'diabetes'],
    whenToUse: 'Estimate insulin sensitivity without clamp study.',
    whyUse: 'Simple log-based index; correlates with clamp-derived insulin sensitivity.',
    inputs: [
      numberInput('glucose', 'Fasting glucose', { unit: 'mg/dL', min: 50, max: 400, defaultValue: 100 }),
      numberInput('insulin', 'Fasting insulin', { unit: 'µU/mL', min: 0.5, max: 200, step: 0.1, defaultValue: 10 }),
    ],
    calculate(values) {
      const g = num(values.glucose, 100);
      const i = num(values.insulin, 10);
      if (g <= 0 || i <= 0) {
        return { score: '—', label: 'Invalid inputs', interpretation: 'Glucose and insulin must be >0.', riskLevel: 'info' };
      }
      const quicki = round(1 / (Math.log10(i) + Math.log10(g)), 3);
      const r = riskFromThresholds(quicki, [
        { max: 0.3, level: 'high', label: 'Suggests insulin resistance', interpretation: 'QUICKI ≤0.30 often used as a rough IR threshold (lab/population dependent).' },
        { max: 0.33, level: 'moderate', label: 'Borderline sensitivity', interpretation: 'Intermediate QUICKI — correlate clinically.' },
        { max: 0.5, level: 'normal', label: 'Suggests better sensitivity', interpretation: 'Higher QUICKI suggests better insulin sensitivity.' },
      ]);
      return { score: quicki, ...r };
    },
    evidence: {
      summary: 'QUICKI = 1 / [log10(insulin µU/mL) + log10(glucose mg/dL)].',
      formula: 'QUICKI = 1 / (log₁₀ I + log₁₀ G)',
      validation: 'Katz et al.; correlates with hyperinsulinemic-euglycemic clamp better than some simple ratios.',
      references: [
        { title: 'Quantitative insulin sensitivity check index', citation: 'Katz A et al. J Clin Endocrinol Metab. 2000', year: 2000, pmid: '10902785',
          doi: '10.1210/jcem.85.7.6661', },
      ],
    },
    nextSteps: [
      { condition: 'Low QUICKI', actions: ['Lifestyle weight loss / exercise', 'Screen for metabolic syndrome and T2DM'] },
    ],
  },
  {
    id: 'hba1c-ifcc',
    name: 'HbA1c % ↔ IFCC (mmol/mol)',
    shortName: 'A1c Units',
    description: 'Converts HbA1c between NGSP (%) and IFCC (mmol/mol).',
    category: 'endocrinology',
    tags: ['a1c', 'ifcc', 'diabetes', 'units'],
    whenToUse: 'Lab reports using different A1c unit systems.',
    whyUse: 'NGSP % (common in US) vs IFCC mmol/mol (common internationally).',
    inputs: [
      selectInput(
        'direction',
        'Convert from',
        [
          { label: 'NGSP % → IFCC mmol/mol', value: 'to_ifcc' },
          { label: 'IFCC mmol/mol → NGSP %', value: 'to_ngsp' },
        ],
        'to_ifcc'
      ),
      numberInput('value', 'HbA1c value', { min: 1, max: 200, step: 0.1, defaultValue: 7.0, helpText: '% or mmol/mol depending on direction' }),
    ],
    calculate(values) {
      const direction = String(values.direction ?? 'to_ifcc');
      const v = num(values.value, 7);
      if (direction === 'to_ifcc') {
        const ifcc = round(10.929 * (v - 2.15), 0);
        const r = riskFromThresholds(v, [
          { max: 5.6, level: 'normal', label: 'Normal A1c range', interpretation: `${v}% ≈ ${ifcc} mmol/mol.` },
          { max: 6.4, level: 'moderate', label: 'Prediabetes range (NGSP)', interpretation: `${v}% ≈ ${ifcc} mmol/mol. Prediabetes often 5.7–6.4%.` },
          { max: 20, level: 'high', label: 'Diabetes range', interpretation: `${v}% ≈ ${ifcc} mmol/mol. Individualize targets.` },
        ]);
        return {
          score: ifcc,
          unit: 'mmol/mol',
          ...r,
          details: [
            { label: 'NGSP', value: `${v}%` },
            { label: 'IFCC', value: `${ifcc} mmol/mol` },
          ],
        };
      }
      const ngsp = round(0.09148 * v + 2.152, 1);
      const r = riskFromThresholds(ngsp, [
        { max: 5.6, level: 'normal', label: 'Normal A1c range', interpretation: `${v} mmol/mol ≈ ${ngsp}%.` },
        { max: 6.4, level: 'moderate', label: 'Prediabetes range', interpretation: `${v} mmol/mol ≈ ${ngsp}%.` },
        { max: 20, level: 'high', label: 'Diabetes range', interpretation: `${v} mmol/mol ≈ ${ngsp}%.` },
      ]);
      return {
        score: ngsp,
        unit: '%',
        ...r,
        details: [
          { label: 'IFCC', value: `${v} mmol/mol` },
          { label: 'NGSP', value: `${ngsp}%` },
        ],
      };
    },
    evidence: {
      summary: 'IFCC (mmol/mol) = 10.929 × (NGSP% − 2.15); NGSP% = 0.09148 × IFCC + 2.152.',
      formula: 'IFCC = 10.929 × (A1c% − 2.15)',
      validation: 'Master equation linking NGSP and IFCC reference systems.',
      references: [
        { title: 'IFCC reference system for HbA1c', citation: 'Hoelzel W et al. / IFCC consensus', year: 2004, pmid: '14709644',
          doi: '10.1373/clinchem.2003.024802', },
      ],
    },
    nextSteps: [
      { condition: 'Elevated A1c', actions: ['Confirm diagnosis if needed', 'Counsel using eAG', 'Therapy per ADA/EASD'] },
    ],
  },
  {
    id: 'glucose-mg-mmol',
    name: 'Glucose Unit Conversion (mg/dL ↔ mmol/L)',
    shortName: 'Glucose Units',
    description: 'Converts glucose between mg/dL and mmol/L.',
    category: 'endocrinology',
    tags: ['glucose', 'units', 'conversion'],
    whenToUse: 'Interpreting labs reported in different unit systems.',
    whyUse: 'US labs typically use mg/dL; many countries use mmol/L.',
    inputs: [
      selectInput(
        'direction',
        'Convert from',
        [
          { label: 'mg/dL → mmol/L', value: 'to_mmol' },
          { label: 'mmol/L → mg/dL', value: 'to_mg' },
        ],
        'to_mmol'
      ),
      numberInput('value', 'Glucose value', { min: 0.5, max: 2000, step: 0.1, defaultValue: 100 }),
    ],
    calculate(values) {
      const direction = String(values.direction ?? 'to_mmol');
      const v = num(values.value, 100);
      if (direction === 'to_mmol') {
        const mmol = round(v / 18, 2);
        const r = riskFromThresholds(v, [
          { max: 69, level: 'high', label: 'Hypoglycemia range', interpretation: `${v} mg/dL = ${mmol} mmol/L.` },
          { max: 99, level: 'normal', label: 'Normal fasting range (approx)', interpretation: `${v} mg/dL = ${mmol} mmol/L.` },
          { max: 125, level: 'moderate', label: 'Impaired fasting range', interpretation: `${v} mg/dL = ${mmol} mmol/L.` },
          { max: 2000, level: 'high', label: 'Diabetes / marked hyperglycemia', interpretation: `${v} mg/dL = ${mmol} mmol/L.` },
        ]);
        return { score: mmol, unit: 'mmol/L', ...r, details: [{ label: 'mg/dL', value: String(v) }] };
      }
      const mg = round(v * 18, 0);
      const r = riskFromThresholds(mg, [
        { max: 69, level: 'high', label: 'Hypoglycemia range', interpretation: `${v} mmol/L = ${mg} mg/dL.` },
        { max: 99, level: 'normal', label: 'Normal fasting range (approx)', interpretation: `${v} mmol/L = ${mg} mg/dL.` },
        { max: 125, level: 'moderate', label: 'Impaired fasting range', interpretation: `${v} mmol/L = ${mg} mg/dL.` },
        { max: 2000, level: 'high', label: 'Diabetes / marked hyperglycemia', interpretation: `${v} mmol/L = ${mg} mg/dL.` },
      ]);
      return { score: mg, unit: 'mg/dL', ...r, details: [{ label: 'mmol/L', value: String(v) }] };
    },
    evidence: {
      summary: 'Glucose: mmol/L = mg/dL ÷ 18; mg/dL = mmol/L × 18 (molecular weight factor for glucose).',
      formula: 'mg/dL ↔ mmol/L × 18',
      validation: 'Standard clinical chemistry conversion.',
      references: [{ title: 'SI unit conversions for laboratory medicine', citation: 'Clinical chemistry standard conversion factors (mg/dL ↔ mmol/L)', year: 2000, url: 'https://www.nist.gov/pml/owm/metric-si/si-units' }],
    },
    nextSteps: [{ condition: 'Abnormal glucose', actions: ['Interpret in clinical context (fasting vs random)', 'Confirm with A1c / OGTT as appropriate'] }],
  },
  {
    id: 'creatinine-mg-umol',
    name: 'Creatinine Unit Conversion (mg/dL ↔ µmol/L)',
    shortName: 'Cr Units',
    description: 'Converts serum creatinine between mg/dL and µmol/L.',
    category: 'nephrology',
    tags: ['creatinine', 'units', 'conversion'],
    whenToUse: 'Labs reported in different creatinine units.',
    whyUse: 'US often mg/dL; SI units µmol/L elsewhere.',
    inputs: [
      selectInput(
        'direction',
        'Convert from',
        [
          { label: 'mg/dL → µmol/L', value: 'to_umol' },
          { label: 'µmol/L → mg/dL', value: 'to_mg' },
        ],
        'to_umol'
      ),
      numberInput('value', 'Creatinine value', { min: 0.1, max: 3000, step: 0.1, defaultValue: 1.0 }),
    ],
    calculate(values) {
      const direction = String(values.direction ?? 'to_umol');
      const v = num(values.value, 1);
      if (direction === 'to_umol') {
        const umol = round(v * 88.4, 0);
        return {
          score: umol,
          unit: 'µmol/L',
          label: 'Creatinine (SI)',
          interpretation: `${v} mg/dL = ${umol} µmol/L. Always interpret with eGFR/CrCl and trend.`,
          riskLevel: 'info',
          details: [{ label: 'mg/dL', value: String(v) }],
        };
      }
      const mg = round(v / 88.4, 2);
      return {
        score: mg,
        unit: 'mg/dL',
        label: 'Creatinine (conventional)',
        interpretation: `${v} µmol/L = ${mg} mg/dL. Always interpret with eGFR/CrCl and trend.`,
        riskLevel: 'info',
        details: [{ label: 'µmol/L', value: String(v) }],
      };
    },
    evidence: {
      summary: 'Creatinine: µmol/L = mg/dL × 88.4; mg/dL = µmol/L ÷ 88.4.',
      formula: 'µmol/L = mg/dL × 88.4',
      validation: 'Standard SI conversion factor for creatinine.',
      references: [{ title: 'Laboratory unit conversion factors', citation: 'Clinical chemistry standard conversion factors', year: 2000, url: 'https://www.nist.gov/pml/owm/metric-si/si-units' }],
    },
    nextSteps: [{ condition: 'Elevated creatinine', actions: ['Calculate eGFR (CKD-EPI)', 'Review nephrotoxins', 'Assess acuity vs chronic'] }],
  },
  {
    id: 'bilirubin-unit',
    name: 'Bilirubin Unit Conversion (mg/dL ↔ µmol/L)',
    shortName: 'Bili Units',
    description: 'Converts bilirubin between mg/dL and µmol/L.',
    category: 'general',
    tags: ['bilirubin', 'units', 'conversion', 'liver'],
    whenToUse: 'Interpreting bilirubin across unit systems.',
    whyUse: 'Common conversion in hepatology and neonatology contexts.',
    inputs: [
      selectInput(
        'direction',
        'Convert from',
        [
          { label: 'mg/dL → µmol/L', value: 'to_umol' },
          { label: 'µmol/L → mg/dL', value: 'to_mg' },
        ],
        'to_umol'
      ),
      numberInput('value', 'Bilirubin value', { min: 0.1, max: 1000, step: 0.1, defaultValue: 1.0 }),
    ],
    calculate(values) {
      const direction = String(values.direction ?? 'to_umol');
      const v = num(values.value, 1);
      if (direction === 'to_umol') {
        const umol = round(v * 17.1, 1);
        return {
          score: umol,
          unit: 'µmol/L',
          label: 'Bilirubin (SI)',
          interpretation: `${v} mg/dL = ${umol} µmol/L.`,
          riskLevel: 'info',
          details: [{ label: 'mg/dL', value: String(v) }],
        };
      }
      const mg = round(v / 17.1, 2);
      return {
        score: mg,
        unit: 'mg/dL',
        label: 'Bilirubin (conventional)',
        interpretation: `${v} µmol/L = ${mg} mg/dL.`,
        riskLevel: 'info',
        details: [{ label: 'µmol/L', value: String(v) }],
      };
    },
    evidence: {
      summary: 'Bilirubin: µmol/L = mg/dL × 17.1; mg/dL = µmol/L ÷ 17.1.',
      formula: 'µmol/L = mg/dL × 17.1',
      validation: 'Standard clinical chemistry conversion.',
      references: [{ title: 'Laboratory unit conversion factors', citation: 'Clinical chemistry standard conversion factors', year: 2000, url: 'https://www.nist.gov/pml/owm/metric-si/si-units' }],
    },
    nextSteps: [{ condition: 'Elevated bilirubin', actions: ['Fractionate direct/indirect', 'Evaluate hemolysis vs hepatobiliary obstruction'] }],
  },
  {
    id: 'calcium-unit',
    name: 'Calcium Unit Conversion (mg/dL ↔ mmol/L)',
    shortName: 'Ca Units',
    description: 'Converts total calcium between mg/dL and mmol/L.',
    category: 'nephrology',
    tags: ['calcium', 'units', 'conversion'],
    whenToUse: 'Labs reported in different calcium units.',
    whyUse: 'US typically mg/dL; SI mmol/L.',
    inputs: [
      selectInput(
        'direction',
        'Convert from',
        [
          { label: 'mg/dL → mmol/L', value: 'to_mmol' },
          { label: 'mmol/L → mg/dL', value: 'to_mg' },
        ],
        'to_mmol'
      ),
      numberInput('value', 'Calcium value', { min: 0.5, max: 30, step: 0.1, defaultValue: 9.0 }),
    ],
    calculate(values) {
      const direction = String(values.direction ?? 'to_mmol');
      const v = num(values.value, 9);
      if (direction === 'to_mmol') {
        const mmol = round(v * 0.2495, 2);
        const r = riskFromThresholds(v, [
          { max: 8.4, level: 'moderate', label: 'Low range (approx)', interpretation: `${v} mg/dL = ${mmol} mmol/L.` },
          { max: 10.5, level: 'normal', label: 'Typical reference range', interpretation: `${v} mg/dL = ${mmol} mmol/L.` },
          { max: 30, level: 'high', label: 'High range', interpretation: `${v} mg/dL = ${mmol} mmol/L.` },
        ]);
        return { score: mmol, unit: 'mmol/L', ...r, details: [{ label: 'mg/dL', value: String(v) }] };
      }
      const mg = round(v * 4.008, 2);
      const r = riskFromThresholds(mg, [
        { max: 8.4, level: 'moderate', label: 'Low range (approx)', interpretation: `${v} mmol/L = ${mg} mg/dL.` },
        { max: 10.5, level: 'normal', label: 'Typical reference range', interpretation: `${v} mmol/L = ${mg} mg/dL.` },
        { max: 30, level: 'high', label: 'High range', interpretation: `${v} mmol/L = ${mg} mg/dL.` },
      ]);
      return { score: mg, unit: 'mg/dL', ...r, details: [{ label: 'mmol/L', value: String(v) }] };
    },
    evidence: {
      summary: 'Total Ca: mmol/L ≈ mg/dL × 0.2495; mg/dL ≈ mmol/L × 4.008 (atomic weight–based).',
      formula: 'mmol/L = mg/dL × 0.2495',
      validation: 'Standard SI conversion for total calcium.',
      references: [{ title: 'Laboratory unit conversion factors', citation: 'Clinical chemistry standard conversion factors', year: 2000, url: 'https://www.nist.gov/pml/owm/metric-si/si-units' }],
    },
    nextSteps: [
      { condition: 'Abnormal calcium', actions: ['Prefer ionized Ca if critically ill', 'Correct for albumin if total Ca only', 'Check PTH, Mg, vitamin D as indicated'] },
    ],
  },
  {
    id: 'calcium-phosphate-product',
    name: 'Calcium-Phosphate Product',
    shortName: 'Ca × Phos',
    description: 'Product of serum calcium and phosphate; used in CKD-MBD context.',
    category: 'nephrology',
    tags: ['calcium', 'phosphate', 'ckd', 'mbd'],
    whenToUse: 'CKD mineral-bone disorder monitoring.',
    whyUse: 'Historical calcification-risk composite (classic Ca×P <55); KDIGO prefers individual Ca and phosphate targets over the product alone.',
    inputs: [
      numberInput('ca', 'Serum calcium', { unit: 'mg/dL', min: 4, max: 16, step: 0.1, defaultValue: 9.0 }),
      numberInput('phos', 'Serum phosphate', { unit: 'mg/dL', min: 0.5, max: 20, step: 0.1, defaultValue: 4.5 }),
    ],
    calculate(values) {
      const ca = num(values.ca, 9);
      const phos = num(values.phos, 4.5);
      const product = round(ca * phos, 1);
      const r = riskFromThresholds(product, [
        { max: 55, level: 'normal', label: 'Below classic threshold', interpretation: 'Ca×P ≤55 mg²/dL² was a traditional goal; still individualize per KDIGO (treat Ca and P separately).' },
        { max: 70, level: 'moderate', label: 'Elevated product', interpretation: 'Elevated Ca×P — optimize phosphate binders, dialysis adequacy, vitamin D/calcimimetics as indicated.' },
        { max: 200, level: 'high', label: 'Markedly elevated', interpretation: 'High Ca×P associated with soft-tissue/vascular calcification risk — aggressive CKD-MBD management.' },
      ]);
      return {
        score: product,
        unit: 'mg²/dL²',
        ...r,
        details: [
          { label: 'Calcium', value: `${ca} mg/dL` },
          { label: 'Phosphate', value: `${phos} mg/dL` },
        ],
      };
    },
    evidence: {
      summary: 'Ca×P = calcium (mg/dL) × phosphate (mg/dL). Traditional target <55; modern KDIGO emphasizes individual Ca and P targets over a fixed product alone.',
      formula: 'Ca × P (both mg/dL)',
      validation: 'Observational association with calcification and outcomes in dialysis populations; product is a composite, not a standalone treatment target in current KDIGO.',
      references: [
        { title: 'KDIGO CKD-MBD guideline update', citation: 'KDIGO. Kidney Int Suppl. 2017', year: 2017, pmid: '30675420', doi: '10.1016/j.kisu.2017.04.001' },
      ],
    },
    nextSteps: [
      { condition: 'Elevated product', actions: ['Dietary phosphate counseling', 'Binders with meals', 'Review calcium-based binders / vitamin D', 'Dialysis prescription if ESRD'] },
    ],
    pearls: ['Use same unit system for both analytes (both mg/dL or convert consistently).'],
  },
  {
    id: 'fek',
    name: 'Fractional Excretion of Potassium (FEK)',
    shortName: 'FEK',
    description: 'FEK helps evaluate renal potassium handling in hypo- or hyperkalemia.',
    category: 'nephrology',
    tags: ['potassium', 'fek', 'electrolytes', 'aki'],
    whenToUse: 'Hypokalemia workup (renal vs extrarenal losses) and selected hyperkalemia contexts.',
    whyUse: 'Low FEK suggests appropriate renal K conservation; high FEK suggests renal K wasting (context-dependent).',
    inputs: [
      numberInput('pk', 'Plasma K', { unit: 'mEq/L', min: 1, max: 10, step: 0.1, defaultValue: 3.0 }),
      numberInput('uk', 'Urine K', { unit: 'mEq/L', min: 1, max: 200, defaultValue: 20 }),
      numberInput('pcr', 'Plasma creatinine', { unit: 'mg/dL', min: 0.1, max: 20, step: 0.1, defaultValue: 1.0 }),
      numberInput('ucr', 'Urine creatinine', { unit: 'mg/dL', min: 1, max: 500, defaultValue: 100 }),
    ],
    calculate(values) {
      const pk = num(values.pk, 3);
      const uk = num(values.uk, 20);
      const pcr = num(values.pcr, 1);
      const ucr = num(values.ucr, 100);
      const fek = round(((uk * pcr) / (pk * ucr)) * 100, 2);
      let label = 'Indeterminate / context-dependent';
      let interpretation = 'Interpret FEK with volume status, acid-base, and whether hypokalemia or hyperkalemia is present.';
      let riskLevel: 'info' | 'low' | 'moderate' = 'info';
      if (pk < 3.5) {
        if (fek < 6) {
          label = 'Low FEK (hypokalemia)';
          interpretation = 'FEK <6% in hypokalemia suggests appropriate renal conservation → consider GI losses, poor intake, prior diuretic, or shift.';
          riskLevel = 'low';
        } else if (fek > 10) {
          label = 'High FEK (renal K wasting)';
          interpretation = 'FEK >10% in hypokalemia suggests renal potassium wasting (diuretics, RTA, mineralocorticoid excess, etc.).';
          riskLevel = 'moderate';
        }
      } else if (pk > 5) {
        interpretation = `FEK ${fek}% in hyperkalemia: low FEK may suggest impaired distal K secretion (hypoaldo, drugs, CKD); high FEK can still occur with high K load.`;
      }
      return {
        score: fek,
        unit: '%',
        label,
        interpretation,
        riskLevel,
        details: [{ label: 'Formula', value: 'FEK = (UK×PCr)/(PK×UCr)×100' }],
      };
    },
    evidence: {
      summary: 'FEK = (U_K × P_Cr) / (P_K × U_Cr) × 100. Cutoffs for renal vs extrarenal losses in hypokalemia are approximate (~6–10%).',
      formula: 'FEK = (UK × PCr) / (PK × UCr) × 100',
      validation: 'Teaching tool; TTKG historically used but has limitations; 24h urine K often preferred when available.',
      references: [
        { title: 'Evaluation of hypokalemia (FEK teaching)', citation: 'Standard nephrology frameworks for urinary potassium excretion', year: 2015, url: 'https://www.ncbi.nlm.nih.gov/books/NBK482465/' },
      ],
    },
    nextSteps: [
      { condition: 'Renal K wasting', actions: ['Check Mg, bicarb, BP', 'Review diuretics', 'Consider renovascular / mineralocorticoid workup if HTN'] },
      { condition: 'Extrarenal pattern', actions: ['Assess GI losses and intake', 'Replete K and Mg'] },
    ],
  },
  {
    id: 'urine-osmolal-gap',
    name: 'Urine Osmolal Gap (UOG)',
    shortName: 'UOG',
    description: 'Urine osmolal gap estimates unmeasured urine osmoles (mainly NH₄⁺) in metabolic acidosis.',
    category: 'nephrology',
    tags: ['urine', 'osmolality', 'rta', 'acidosis', 'nh4'],
    whenToUse: 'Normal anion gap metabolic acidosis: diarrhea vs RTA differential.',
    whyUse: 'High UOG suggests robust NH₄⁺ excretion (extrarenal HCO₃ loss); low UOG suggests impaired renal acidification (RTA).',
    inputs: [
      numberInput('uosm', 'Measured urine osmolality', { unit: 'mOsm/kg', min: 50, max: 1200, defaultValue: 400 }),
      numberInput('una', 'Urine Na', { unit: 'mEq/L', min: 1, max: 300, defaultValue: 40 }),
      numberInput('uk', 'Urine K', { unit: 'mEq/L', min: 1, max: 200, defaultValue: 20 }),
      numberInput('uurea', 'Urine urea nitrogen', { unit: 'mg/dL', min: 0, max: 2000, defaultValue: 200, helpText: 'UUN; if only urea given, convert appropriately' }),
      numberInput('uglu', 'Urine glucose (optional)', { unit: 'mg/dL', min: 0, max: 1000, defaultValue: 0, required: false }),
    ],
    calculate(values) {
      const uosm = num(values.uosm, 400);
      const una = num(values.una, 40);
      const uk = num(values.uk, 20);
      const uurea = num(values.uurea, 200);
      const ugluMissing = isMissingValue(values.uglu, true);
      const uglu = ugluMissing ? 0 : num(values.uglu, 0);
      const calc = round(2 * (una + uk) + uurea / 2.8 + uglu / 18, 1);
      const gap = round(uosm - calc, 1);
      let label = 'Indeterminate UOG';
      let interpretation = 'UOG roughly estimates NH₄⁺ (and other unmeasured cations). Cutoffs vary; integrate with UAG and clinical picture.';
      let riskLevel: 'info' | 'low' | 'moderate' | 'high' = 'info';
      if (gap >= 100) {
        label = 'High UOG — NH₄⁺ excretion likely adequate';
        interpretation = 'High urine osmolal gap suggests substantial NH₄⁺ excretion (e.g., diarrhea / extrarenal bicarb loss) rather than classic distal RTA.';
        riskLevel = 'low';
      } else if (gap <= 40) {
        label = 'Low UOG — impaired NH₄⁺ excretion possible';
        interpretation = 'Low UOG suggests reduced renal NH₄⁺ excretion (RTA, hypoaldosteronism, advanced CKD). Confirm clinically.';
        riskLevel = 'moderate';
      }
      if (ugluMissing) {
        interpretation +=
          ' Urine glucose was not entered and was excluded from the calculated Uosm — with significant glucosuria the gap is overestimated until glucose osmoles are accounted for.';
      }
      return {
        score: gap,
        unit: 'mOsm/kg',
        label,
        interpretation,
        riskLevel,
        details: [
          {
            label: 'Calculated Uosm',
            value: ugluMissing ? `${calc} mOsm/kg — urine glucose not entered, excluded from calculated Uosm` : `${calc} mOsm/kg`,
          },
          { label: 'Measured Uosm', value: `${uosm} mOsm/kg` },
        ],
      };
    },
    evidence: {
      summary: 'UOG = measured Uosm − [2×(UNa+UK) + UUN/2.8 + Uglucose/18]. High gap ≈ high NH₄⁺; low gap ≈ poor renal acid excretion.',
      formula: 'UOG = Uosm_meas − (2(UNa+UK) + UUN/2.8 + Uglu/18)',
      validation: 'Standard acid-base teaching adjunct to urine anion gap; not perfect if other osmoles (ketoanions, toxins) present.',
      references: [
        { title: 'Urine osmolal gap and ammonium excretion', citation: 'Dyck RF et al. / classic nephrology teaching', year: 1990, pmid: '2080786',
          doi: '10.1159/000168150', },
      ],
    },
    nextSteps: [
      { condition: 'Low UOG + NAGMA', actions: ['Evaluate RTA type', 'Check K, urine pH, aldosterone axis'] },
      { condition: 'High UOG + NAGMA', actions: ['Seek GI bicarb loss', 'Review acetazolamide / other causes'] },
    ],
  },
  {
    id: 'henderson-hasselbalch',
    name: 'Henderson-Hasselbalch (pH from HCO₃ & PCO₂)',
    shortName: 'H-H pH',
    description: 'Calculates expected blood pH from bicarbonate and PCO₂ using Henderson-Hasselbalch.',
    category: 'critical-care',
    tags: ['acid-base', 'ph', 'abg', 'henderson'],
    whenToUse: 'Cross-check ABG/VBG consistency or estimate pH from electrolytes + PCO₂.',
    whyUse: 'Core acid-base relationship between pH, PCO₂, and HCO₃⁻.',
    inputs: [
      numberInput('hco3', 'HCO₃⁻', { unit: 'mEq/L', min: 1, max: 60, step: 0.1, defaultValue: 24 }),
      numberInput('pco2', 'PCO₂', { unit: 'mmHg', min: 5, max: 120, defaultValue: 40 }),
    ],
    calculate(values) {
      const hco3 = num(values.hco3, 24);
      const pco2 = num(values.pco2, 40);
      const dissolved = 0.0307 * pco2;
      if (dissolved <= 0) {
        return { score: '—', label: 'Invalid PCO₂', interpretation: 'PCO₂ must be >0.', riskLevel: 'info' };
      }
      const ph = round(6.1 + Math.log10(hco3 / dissolved), 2);
      const r = riskFromThresholds(ph, [
        { max: 7.2, level: 'critical', label: 'Severe acidemia', interpretation: `Calculated pH ${ph}. Severe acidemia — treat cause urgently; consider ventilation/buffering per context.` },
        { max: 7.35, level: 'high', label: 'Acidemia', interpretation: `Calculated pH ${ph}. Acidemic range.` },
        { max: 7.45, level: 'normal', label: 'Normal pH range', interpretation: `Calculated pH ${ph}. Roughly normal pH (lab-dependent).` },
        { max: 7.55, level: 'moderate', label: 'Alkalemia', interpretation: `Calculated pH ${ph}. Alkalemic range.` },
        { max: 8, level: 'high', label: 'Severe alkalemia', interpretation: `Calculated pH ${ph}. Marked alkalemia.` },
      ]);
      return {
        score: ph,
        unit: 'pH',
        ...r,
        details: [
          { label: '0.0307 × PCO₂', value: String(round(dissolved, 2)) },
          { label: 'HCO₃ / (0.0307×PCO₂)', value: String(round(hco3 / dissolved, 2)) },
        ],
      };
    },
    evidence: {
      summary: 'pH = 6.1 + log10([HCO₃] / (0.0307 × PCO₂)) with HCO₃ in mEq/L and PCO₂ in mmHg.',
      formula: 'pH = 6.1 + log₁₀(HCO₃ / (0.0307 × PCO₂))',
      validation: 'Foundational physical chemistry of blood buffers; solubility coefficient ~0.03–0.0307.',
      references: [
        { title: 'Modern quantitative acid-base chemistry (Stewart) and Henderson-Hasselbalch context', citation: 'Stewart PA. Can J Physiol Pharmacol. 1983', year: 1983, pmid: '6423247',
          doi: '10.1139/y83-207', },
      ],
    },
    nextSteps: [
      { condition: 'Calculated ≠ measured pH', actions: ['Recheck sample integrity', 'Suspect lab error or extreme temperature/abnormal proteins'] },
      { condition: 'Abnormal pH', actions: ['Full acid-base analysis (AG, compensation rules)', 'Treat underlying process'] },
    ],
  },
  {
    id: 'albumin-corrected-ag',
    name: 'Albumin-Corrected Anion Gap',
    shortName: 'Corr. AG',
    description: 'Corrects serum anion gap for hypoalbuminemia.',
    category: 'nephrology',
    tags: ['anion gap', 'albumin', 'acidosis'],
    whenToUse: 'Metabolic acidosis workup with low albumin (ICU, cirrhosis, nephrosis).',
    whyUse: 'Hypoalbuminemia lowers observed AG and can mask a high-AG process.',
    inputs: [
      numberInput('na', 'Sodium', { unit: 'mEq/L', min: 100, max: 180, defaultValue: 140 }),
      numberInput('cl', 'Chloride', { unit: 'mEq/L', min: 70, max: 140, defaultValue: 104 }),
      numberInput('hco3', 'Bicarbonate', { unit: 'mEq/L', min: 1, max: 50, defaultValue: 24 }),
      numberInput('albumin', 'Albumin', { unit: 'g/dL', min: 0.5, max: 6, step: 0.1, defaultValue: 2.5 }),
    ],
    calculate(values) {
      const na = num(values.na, 140);
      const cl = num(values.cl, 104);
      const hco3 = num(values.hco3, 24);
      const alb = num(values.albumin, 2.5);
      const ag = round(na - (cl + hco3), 1);
      const agCorr = round(ag + 2.5 * (4 - alb), 1);
      const elevated = agCorr > 12;
      return {
        score: agCorr,
        unit: 'mEq/L',
        label: elevated ? 'Elevated corrected AG' : 'Normal corrected AG',
        interpretation: elevated
          ? 'Corrected AG elevated: pursue HAGMA causes (lactate, ketones, toxins, uremia, etc.).'
          : 'Corrected AG not elevated (lab normals vary; often ~8–12). If acidotic, consider NAGMA causes.',
        riskLevel: elevated ? 'moderate' : 'normal',
        details: [
          { label: 'Uncorrected AG', value: `${ag} mEq/L` },
          { label: 'Correction', value: `+2.5 × (4 − ${alb}) = ${round(2.5 * (4 - alb), 1)}` },
        ],
      };
    },
    evidence: {
      summary: 'Corrected AG ≈ observed AG + 2.5 × (4 − albumin g/dL). Alternative factors ~2.3–3.0 per 1 g/dL albumin used in literature.',
      formula: 'AG_corr = Na − (Cl + HCO₃) + 2.5 × (4 − albumin)',
      validation: 'Widely taught correction; essential in hypoalbuminemic critically ill patients.',
      references: [
        { title: 'Figge equation / albumin effect on anion gap', citation: 'Figge J et al. Crit Care Med. 1998', year: 1998, pmid: '9824071',
          doi: '10.1097/00003246-199811000-00019', },
      ],
    },
    nextSteps: [
      { condition: 'High corrected AG', actions: ['Lactate, ketones', 'Osmolal gap if toxin risk', 'ABG/VBG'] },
      { condition: 'Normal AG + low HCO₃', actions: ['Urine AG/UOG', 'GI loss vs RTA workup'] },
    ],
  },
  {
    id: 'delta-ratio',
    name: 'Delta Ratio (ΔAG / ΔHCO₃)',
    shortName: 'Delta Ratio',
    description: 'Compares rise in anion gap to fall in bicarbonate to detect mixed acid-base disorders.',
    category: 'nephrology',
    tags: ['delta ratio', 'anion gap', 'acid-base', 'mixed disorder'],
    whenToUse: 'High anion gap metabolic acidosis to detect concurrent NAGMA or metabolic alkalosis.',
    whyUse: 'Pure HAGMA should drop HCO₃ roughly with the rise in AG; deviations suggest a second process.',
    inputs: [
      numberInput('ag', 'Anion gap (prefer albumin-corrected)', { unit: 'mEq/L', min: 0, max: 50, defaultValue: 20 }),
      numberInput('hco3', 'Bicarbonate', { unit: 'mEq/L', min: 1, max: 40, defaultValue: 12 }),
      numberInput('normalAg', 'Normal AG used', { unit: 'mEq/L', min: 6, max: 16, defaultValue: 12 }),
      numberInput('normalHco3', 'Normal HCO₃ used', { unit: 'mEq/L', min: 20, max: 28, defaultValue: 24 }),
    ],
    calculate(values) {
      const ag = num(values.ag, 20);
      const hco3 = num(values.hco3, 12);
      const nAg = num(values.normalAg, 12);
      const nHco3 = num(values.normalHco3, 24);
      const dAg = ag - nAg;
      const dHco3 = nHco3 - hco3;
      if (dHco3 <= 0) {
        return {
          score: '—',
          label: 'No HCO₃ deficit',
          interpretation: 'Delta ratio requires a fall in HCO₃ below the chosen normal. Check for metabolic alkalosis or lab error.',
          riskLevel: 'info',
          details: [{ label: 'ΔAG', value: String(round(dAg, 1)) }],
        };
      }
      const ratio = round(dAg / dHco3, 2);
      let label = 'Indeterminate';
      let interpretation = '';
      let riskLevel: 'info' | 'low' | 'moderate' | 'high' = 'info';
      if (ratio < 0.4) {
        label = 'Low ratio — dominant NAGMA';
        interpretation = 'Δ ratio <0.4: hyperchloremic (NAGMA) component dominates, or AG barely elevated.';
        riskLevel = 'moderate';
      } else if (ratio < 0.8) {
        label = 'Mixed HAGMA + NAGMA';
        interpretation = 'Δ ratio 0.4–0.8: mixed high-AG and normal-AG metabolic acidosis common (e.g., diarrhea + lactate, RTA + ketoacidosis).';
        riskLevel = 'moderate';
      } else if (ratio <= 2.0) {
        label = 'Pure HAGMA range';
        interpretation = 'Δ ratio ~0.8–2.0: consistent with uncomplicated high-AG metabolic acidosis (range varies by cause; lactate often ~1.6).';
        riskLevel = 'low';
      } else {
        label = 'High ratio — HAGMA + metabolic alkalosis';
        interpretation = 'Δ ratio >2: consider concurrent metabolic alkalosis (or pre-existing high HCO₃), e.g., vomiting + lactic acidosis.';
        riskLevel = 'high';
      }
      return {
        score: ratio,
        unit: 'ratio',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'ΔAG', value: String(round(dAg, 1)) },
          { label: 'ΔHCO₃', value: String(round(dHco3, 1)) },
        ],
      };
    },
    evidence: {
      summary: 'Delta ratio = (AG − normal AG) / (normal HCO₃ − measured HCO₃). Helps detect mixed metabolic disorders.',
      formula: 'Δ ratio = (AG − 12) / (24 − HCO₃) [normals adjustable]',
      validation: 'Standard teaching aid; cutoffs approximate and cause-dependent (ketoacidosis vs lactate).',
      references: [
        { title: 'Mixed acid-base disorders and the delta ratio', citation: 'Rastegar A. / classic acid-base reviews', year: 2005, pmid: '17656477',
          doi: '10.1681/ASN.2006121408', },
      ],
    },
    nextSteps: [
      { condition: 'Mixed NAGMA', actions: ['Urine AG/UOG', 'Review saline resuscitation, diarrhea, RTA'] },
      { condition: 'High delta ratio', actions: ['Seek hidden metabolic alkalosis (vomiting, diuretics, volume contraction)'] },
    ],
  },
  {
    id: 'strong-ion-diff',
    name: 'Simplified Strong Ion Difference (SID)',
    shortName: 'SID approx',
    description: 'Educational approximation of apparent SID from major strong ions.',
    category: 'critical-care',
    tags: ['stewart', 'sid', 'acid-base', 'electrolytes'],
    whenToUse: 'Stewart-style acid-base teaching or complex ICU acid-base interpretation adjunct.',
    whyUse: 'Reduced SID (e.g., hyperchloremia) associates with metabolic acidosis; elevated SID with alkalosis.',
    inputs: [
      numberInput('na', 'Sodium', { unit: 'mEq/L', min: 100, max: 180, defaultValue: 140 }),
      numberInput('k', 'Potassium', { unit: 'mEq/L', min: 1, max: 10, step: 0.1, defaultValue: 4.0 }),
      numberInput('ca', 'Calcium (ionized preferred)', { unit: 'mEq/L', min: 0, max: 10, step: 0.1, defaultValue: 2.5, helpText: 'If total Ca in mg/dL, rough mEq/L ≈ mg/dL × 0.5' }),
      numberInput('mg', 'Magnesium', { unit: 'mEq/L', min: 0, max: 10, step: 0.1, defaultValue: 1.5, helpText: 'If mg/dL, mEq/L ≈ mg/dL × 0.8' }),
      numberInput('cl', 'Chloride', { unit: 'mEq/L', min: 70, max: 140, defaultValue: 104 }),
      numberInput('lactate', 'Lactate', { unit: 'mEq/L', min: 0, max: 30, step: 0.1, defaultValue: 1.0 }),
    ],
    calculate(values) {
      const na = num(values.na, 140);
      const k = num(values.k, 4);
      const ca = num(values.ca, 2.5);
      const mg = num(values.mg, 1.5);
      const cl = num(values.cl, 104);
      const lac = num(values.lactate, 1);
      const sid = round(na + k + ca + mg - cl - lac, 1);
      const r = riskFromThresholds(sid, [
        { max: 35, level: 'high', label: 'Low SID — acidosis tendency', interpretation: 'Low apparent SID favors metabolic acidosis (hyperchloremia, high lactate, free water excess effects).' },
        { max: 42, level: 'normal', label: 'Near-normal SID range', interpretation: 'Apparent SID roughly normal (~38–42 mEq/L typical teaching range; method-dependent).' },
        { max: 80, level: 'moderate', label: 'High SID — alkalosis tendency', interpretation: 'Elevated SID favors metabolic alkalosis (e.g., chloride loss, contraction).' },
      ]);
      return {
        score: sid,
        unit: 'mEq/L',
        ...r,
        details: [
          { label: 'Cations', value: `${round(na + k + ca + mg, 1)}` },
          { label: 'Anions (Cl+lac)', value: `${round(cl + lac, 1)}` },
        ],
        recommendations: ['Educational simplified SID — not a full Stewart quantitative analysis (A_tot, pCO₂ required)'],
      };
    },
    evidence: {
      summary: 'Simplified SIDa ≈ (Na⁺ + K⁺ + Ca²⁺ + Mg²⁺) − (Cl⁻ + lactate). Normal ~40 mEq/L depending on ions included.',
      formula: 'SID ≈ (Na+K+Ca+Mg) − (Cl+lactate)',
      validation: 'Stewart approach educational aid; full analysis needs albumin/phosphate (A_tot) and PCO₂. Ion charge units must be consistent (mEq/L).',
      references: [
        { title: 'Modern quantitative acid-base chemistry', citation: 'Stewart PA. Can J Physiol Pharmacol. 1983', year: 1983, pmid: '6423247',
          doi: '10.1139/y83-207', },
        { title: 'Stewart acid-base: clinical applications', citation: 'Kellum JA / Fencl V reviews', year: 2000, pmid: '17893626',
          doi: '10.1097/01.CCM.0000286399.21008.64', },
      ],
    },
    nextSteps: [
      { condition: 'Low SID acidosis', actions: ['Limit hyperchloremic fluids if appropriate', 'Treat lactate source', 'Full AG/osmolal assessment'] },
      { condition: 'High SID alkalosis', actions: ['Volume/Cl repletion if contraction alkalosis', 'Review diuretics/NG losses'] },
    ],
    pearls: ['Enter Ca and Mg in mEq/L (charge), not raw mg/dL, for this approximation.'],
  },
  {
    id: 'free-water-clearance',
    name: 'Free Water Clearance (Cₕ₂ₒ)',
    shortName: 'CH₂O',
    description: 'Free water clearance = urine volume − osmolar clearance; quantifies free water excretion or reabsorption.',
    category: 'nephrology',
    tags: ['free water', 'osmolality', 'hyponatremia', 'clearance'],
    whenToUse: 'Hyponatremia / concentrating-diluting ability assessment with timed urine collection.',
    whyUse: 'Positive CH₂O = net free water excretion (dilute urine); negative = free water reabsorption (concentrated urine).',
    inputs: [
      numberInput('v', 'Urine flow rate (V)', { unit: 'mL/min', min: 0.1, max: 50, step: 0.1, defaultValue: 1.0, helpText: 'Or convert 24h volume: mL/day ÷ 1440' }),
      numberInput('uosm', 'Urine osmolality', { unit: 'mOsm/kg', min: 50, max: 1400, defaultValue: 300 }),
      numberInput('posm', 'Plasma osmolality', { unit: 'mOsm/kg', min: 200, max: 400, defaultValue: 280 }),
    ],
    calculate(values) {
      const v = num(values.v, 1);
      const uosm = num(values.uosm, 300);
      const posm = num(values.posm, 280);
      if (posm <= 0) {
        return { score: '—', label: 'Invalid Posm', interpretation: 'Plasma osmolality must be >0.', riskLevel: 'info' };
      }
      const cosm = round((uosm * v) / posm, 2);
      const ch2o = round(v - cosm, 2);
      let label = 'Near zero free water clearance';
      let interpretation = 'CH₂O near 0: urine roughly isotonic to plasma.';
      let riskLevel: 'info' | 'low' | 'moderate' = 'info';
      if (ch2o > 0.1) {
        label = 'Positive CH₂O — free water excretion';
        interpretation = 'Kidneys excreting electrolyte-free water (urine hypotonic to plasma). Expected in water load; inappropriate if hyponatremic from other causes? Integrate ADH context.';
        riskLevel = 'low';
      } else if (ch2o < -0.1) {
        label = 'Negative CH₂O — free water reabsorption';
        interpretation = 'Net free water reabsorption (concentrated urine). Appropriate if hypernatremia/volume depletion; if hyponatremia with high Uosm, consider ADH effect (SIADH, hypovolemia, etc.).';
        riskLevel = 'moderate';
      }
      return {
        score: ch2o,
        unit: 'mL/min',
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'Cosm', value: `${cosm} mL/min` },
          { label: 'V', value: `${v} mL/min` },
        ],
      };
    },
    evidence: {
      summary: 'Cₕ₂ₒ = V − C_osm; C_osm = (Uosm × V) / Posm. Positive = free water clearance; negative = free water reabsorption.',
      formula: 'CH₂O = V − (Uosm × V)/Posm',
      validation: 'Classic renal physiology; electrolyte-free water clearance variants refine Na-based analysis.',
      references: [
        { title: 'Free water and osmolar clearance (classic renal physiology)', citation: 'Classic renal physiology teaching of CH2O and Cosm', year: 1960, url: 'https://www.ncbi.nlm.nih.gov/books/NBK482389/' },
      ],
    },
    nextSteps: [
      { condition: 'Hyponatremia + negative CH₂O', actions: ['Assess volume status', 'Uosm/UNa for SIADH vs hypovolemia', 'Fluid restriction or saline per diagnosis'] },
      { condition: 'Hypernatremia + positive CH₂O', actions: ['Replace free water', 'Seek DI if polyuria with low Uosm'] },
    ],
  },
  {
    id: 'osmolar-clearance',
    name: 'Osmolar Clearance (Cₒₛₘ)',
    shortName: 'Cosm',
    description: 'Osmolar clearance = (Uosm × V) / Posm; volume of plasma cleared of osmoles per unit time.',
    category: 'nephrology',
    tags: ['osmolality', 'clearance', 'urine'],
    whenToUse: 'With free water clearance calculations and polyuria workups.',
    whyUse: 'Separates osmotic diuresis (high Cosm) from water diuresis (high V with low Uosm).',
    inputs: [
      numberInput('v', 'Urine flow rate (V)', { unit: 'mL/min', min: 0.1, max: 50, step: 0.1, defaultValue: 1.0 }),
      numberInput('uosm', 'Urine osmolality', { unit: 'mOsm/kg', min: 50, max: 1400, defaultValue: 300 }),
      numberInput('posm', 'Plasma osmolality', { unit: 'mOsm/kg', min: 200, max: 400, defaultValue: 280 }),
    ],
    calculate(values) {
      const v = num(values.v, 1);
      const uosm = num(values.uosm, 300);
      const posm = num(values.posm, 280);
      if (posm <= 0) {
        return { score: '—', label: 'Invalid Posm', interpretation: 'Plasma osmolality must be >0.', riskLevel: 'info' };
      }
      const cosm = round((uosm * v) / posm, 2);
      const ch2o = round(v - cosm, 2);
      const r = riskFromThresholds(cosm, [
        { max: 2, level: 'normal', label: 'Typical Cosm range', interpretation: 'Osmolar clearance often ~2–3 mL/min under usual solute loads; higher with osmotic diuresis.' },
        { max: 5, level: 'moderate', label: 'Elevated Cosm', interpretation: 'Elevated osmolar clearance — consider osmotic diuresis (glucose, urea, mannitol, salt).' },
        { max: 50, level: 'high', label: 'Markedly elevated Cosm', interpretation: 'High Cosm with polyuria suggests osmotic diuresis; check urine glucose, urea, electrolytes.' },
      ]);
      return {
        score: cosm,
        unit: 'mL/min',
        ...r,
        details: [
          { label: 'CH₂O', value: `${ch2o} mL/min` },
          { label: 'V', value: `${v} mL/min` },
        ],
      };
    },
    evidence: {
      summary: 'C_osm = (Uosm × V) / Posm. Foundation for free water clearance and polyuria classification.',
      formula: 'Cosm = Uosm × V / Posm',
      validation: 'Standard renal physiology measurement.',
      references: [
        { title: 'Free water and osmolar clearance (classic renal physiology)', citation: 'Classic renal physiology teaching of CH2O and Cosm', year: 1960, url: 'https://www.ncbi.nlm.nih.gov/books/NBK482389/' },
      ],
    },
    nextSteps: [
      { condition: 'Polyuria + high Cosm', actions: ['Urine glucose, urea nitrogen', 'Review mannitol / contrast / salt load'] },
      { condition: 'Polyuria + low Uosm / low Cosm share', actions: ['Water deprivation / desmopressin testing pathway for DI'] },
    ],
  },
  {
    id: 'creatinine-clearance-timed',
    name: 'Creatinine Clearance (Timed Collection)',
    shortName: 'CrCl timed',
    description: 'Classic measured CrCl from urine creatinine, volume, plasma creatinine, and time.',
    category: 'nephrology',
    tags: ['crcl', 'gfr', 'clearance', '24h urine'],
    whenToUse: 'When measured clearance is needed (extremes of muscle mass, amputations, pregnancy, drug dosing uncertainty).',
    whyUse: 'Classic measured clearance from timed urine when eGFR is unreliable; overestimates true GFR vs exogenous-marker methods.',
    inputs: [
      numberInput('ucr', 'Urine creatinine', { unit: 'mg/dL', min: 1, max: 500, defaultValue: 100 }),
      numberInput('volume', 'Urine volume', { unit: 'mL', min: 50, max: 10000, defaultValue: 2000, helpText: 'Total volume over collection period' }),
      numberInput('pcr', 'Plasma creatinine', { unit: 'mg/dL', min: 0.1, max: 20, step: 0.1, defaultValue: 1.0 }),
      numberInput('hours', 'Collection duration', { unit: 'hours', min: 1, max: 48, step: 0.5, defaultValue: 24 }),
    ],
    calculate(values) {
      const ucr = num(values.ucr, 100);
      const vol = num(values.volume, 2000);
      const pcr = num(values.pcr, 1);
      const hours = num(values.hours, 24);
      const tMin = hours * 60;
      if (pcr <= 0 || tMin <= 0) {
        return { score: '—', label: 'Invalid inputs', interpretation: 'Plasma creatinine and time must be >0.', riskLevel: 'info' };
      }
      // CrCl (mL/min) = (UCr mg/dL × V mL) / (PCr mg/dL × t min)
      const crcl = round((ucr * vol) / (pcr * tMin), 1);
      const r = riskFromThresholds(crcl, [
        { max: 29, level: 'high', label: 'Severely reduced', interpretation: 'CrCl <30: major dose adjustments; nephrology involvement as appropriate.' },
        { max: 59, level: 'moderate', label: 'Moderately reduced', interpretation: 'CrCl 30–59: adjust renally cleared meds; stage CKD with chronicity + albuminuria.' },
        { max: 89, level: 'low', label: 'Mildly reduced / low-normal', interpretation: 'Mild reduction possible; compare to CKD-EPI eGFR.' },
        { max: 300, level: 'normal', label: 'Normal / high', interpretation: 'Normal or elevated clearance (high in pregnancy, hyperfiltration).' },
      ]);
      return {
        score: crcl,
        unit: 'mL/min',
        ...r,
        details: [
          { label: 'Collection', value: `${hours} h, ${vol} mL` },
          { label: 'Formula', value: '(UCr × V) / (PCr × t)' },
        ],
      };
    },
    evidence: {
      summary: 'CrCl = (U_Cr × V) / (P_Cr × t) with V in mL and t in minutes → mL/min. Overestimates GFR due to tubular creatinine secretion.',
      formula: 'CrCl (mL/min) = (UCr × Volume_mL) / (PCr × time_min)',
      validation: 'Classic clearance method; incomplete collection is the main error source. CKD-EPI preferred for routine staging.',
      references: [
        { title: 'KDIGO evaluation of kidney function (context for timed CrCl)', citation: 'KDIGO Clinical Practice Guideline for the Evaluation and Management of CKD (related chapters)', year: 2012, url: 'https://kdigo.org/guidelines/ckd-evaluation-and-management/' },
      ],
    },
    nextSteps: [
      { condition: 'Reduced CrCl', actions: ['Renal dose adjustments', 'Avoid nephrotoxins', 'CKD workup if chronic'] },
      { condition: 'Discordant with eGFR', actions: ['Verify complete collection (creatinine excretion rate)', 'Consider measured GFR if critical'] },
    ],
  },
];
