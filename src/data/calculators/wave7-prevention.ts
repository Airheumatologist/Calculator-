import type { Calculator } from '../../types/calculator';
import { num, bool, str, round, yesNo, selectInput, numberInput, riskFromThresholds } from '../../utils/helpers';

function cloglogCalibrate(uncal: number, scale1: number, scale2: number): number {
  const u = Math.min(0.9999, Math.max(1e-8, uncal));
  const inner = Math.log(-Math.log(1 - u));
  const x = Math.min(20, Math.max(-20, scale1 + scale2 * inner));
  const cal = 1 - Math.exp(-Math.exp(x));
  if (!Number.isFinite(cal)) return u;
  return Math.min(0.95, Math.max(0, cal));
}

function expitPct(lp: number): number {
  const x = Math.min(20, Math.max(-20, lp));
  const e = Math.exp(x);
  return 100 * (e / (1 + e));
}

function coxRiskPct(lp: number, s0: number): number {
  const e = Math.exp(Math.min(20, Math.max(-20, lp)));
  const s = Math.min(0.9999, Math.max(0.01, s0));
  const r = 1 - Math.pow(s, e);
  if (!Number.isFinite(r)) return 0;
  return Math.min(80, Math.max(0, 100 * r));
}

type Score2Region = 'low' | 'mod' | 'high' | 'vhigh';

function parseRegion(v: number | string | boolean | null | undefined): Score2Region {
  const s = str(v, 'mod');
  if (s === 'low' || s === 'high' || s === 'vhigh') return s;
  return 'mod';
}

const SCORE2_SCALES: Record<Score2Region, { m1: number; m2: number; f1: number; f2: number }> = {
  low: { m1: -0.5699, m2: 0.7476, f1: -0.738, f2: 0.7019 },
  mod: { m1: -0.1565, m2: 0.8009, f1: -0.3143, f2: 0.7701 },
  high: { m1: 0.3207, m2: 0.936, f1: 0.571, f2: 0.9369 },
  vhigh: { m1: 0.5836, m2: 0.8294, f1: 0.9412, f2: 0.8329 },
};

const SCORE2_OP_SCALES: Record<Score2Region, { m1: number; m2: number; f1: number; f2: number }> = {
  low: { m1: -0.34, m2: 1.19, f1: -0.52, f2: 1.01 },
  mod: { m1: 0.01, m2: 1.25, f1: -0.1, f2: 1.1 },
  high: { m1: 0.08, m2: 1.15, f1: 0.38, f2: 1.09 },
  vhigh: { m1: 0.05, m2: 0.7, f1: 0.38, f2: 0.69 },
};

const REGION_OPTIONS = [
  { label: 'Low-risk region (e.g. France, Spain, UK, NL)', value: 'low' },
  { label: 'Moderate-risk region (e.g. Germany, Italy)', value: 'mod' },
  { label: 'High-risk region (e.g. Poland, Hungary)', value: 'high' },
  { label: 'Very high-risk region (e.g. Russia, Ukraine)', value: 'vhigh' },
];

const SEX_MF = [
  { label: 'Female', value: 'female' },
  { label: 'Male', value: 'male' },
];

function score2Core(
  age: number,
  male: boolean,
  smoker: number,
  sbp: number,
  tchol: number,
  hdl: number,
  region: Score2Region,
): number {
  const cage = (age - 60) / 5;
  const csbp = (sbp - 120) / 20;
  const ctchol = tchol - 6;
  const chdl = (hdl - 1.3) / 0.5;
  const lp = male
    ? 0.3742 * cage +
      0.6012 * smoker +
      0.2777 * csbp +
      0.1458 * ctchol +
      -0.2698 * chdl +
      -0.0755 * smoker * cage +
      -0.0255 * csbp * cage +
      -0.0281 * ctchol * cage +
      0.0426 * chdl * cage
    : 0.4648 * cage +
      0.7744 * smoker +
      0.3131 * csbp +
      0.1002 * ctchol +
      -0.2606 * chdl +
      -0.1088 * smoker * cage +
      -0.0277 * csbp * cage +
      -0.0226 * ctchol * cage +
      0.0613 * chdl * cage;
  const s0 = male ? 0.9605 : 0.9776;
  const uncal = 1 - Math.pow(s0, Math.exp(Math.min(20, Math.max(-20, lp))));
  const sc = SCORE2_SCALES[region];
  const cal = cloglogCalibrate(uncal, male ? sc.m1 : sc.f1, male ? sc.m2 : sc.f2);
  return round(100 * cal, 1);
}

export const wave7PreventionCalcs: Calculator[] = [
  {
    id: 'cha2ds2-va',
    name: 'CHA₂DS₂-VA Score (ESC 2024, sexless)',
    shortName: 'CHA₂DS₂-VA',
    description:
      'ESC 2024 sexless stroke-risk score for non-valvular atrial fibrillation. Same points as CHA₂DS₂-VASc without female sex (max 8).',
    category: 'cardiology',
    tags: ['afib', 'stroke', 'anticoagulation', 'esc 2024', 'cha2ds2-va'],
    whenToUse:
      'Adults with non-valvular atrial fibrillation to estimate thromboembolic risk and guide oral anticoagulation (ESC 2024 prefers this sexless score over CHA₂DS₂-VASc).',
    whyUse:
      'Removes sex as a risk item so the same numeric threshold applies to men and women. OAC is recommended at score ≥2 and may be considered at 1.',
    inputs: [
      yesNo('chf', 'Congestive heart failure / LV dysfunction', 1),
      yesNo('htn', 'Hypertension', 1),
      selectInput('age', 'Age', [
        { label: '< 65 years', value: 0, points: 0 },
        { label: '65–74 years', value: 1, points: 1 },
        { label: '≥ 75 years', value: 2, points: 2 },
      ]),
      yesNo('dm', 'Diabetes mellitus', 1),
      yesNo('stroke', 'Prior stroke / TIA / thromboembolism', 2),
      yesNo('vascular', 'Vascular disease (prior MI, PAD, aortic plaque)', 1),
    ],
    calculate(values) {
      const score =
        (bool(values.chf) ? 1 : 0) +
        (bool(values.htn) ? 1 : 0) +
        num(values.age) +
        (bool(values.dm) ? 1 : 0) +
        (bool(values.stroke) ? 2 : 0) +
        (bool(values.vascular) ? 1 : 0);
      let riskLevel: 'low' | 'moderate' | 'high' = 'low';
      let label = 'Score 0 — anticoagulation generally not indicated';
      let interpretation =
        'CHA₂DS₂-VA 0: lowest thromboembolic-risk stratum. Oral anticoagulation is generally not recommended. Address modifiable vascular risk factors and reassess if new factors appear.';
      if (score === 1) {
        riskLevel = 'moderate';
        label = 'Score 1 — consider anticoagulation';
        interpretation =
          'CHA₂DS₂-VA 1: consider oral anticoagulation after shared decision-making, bleeding risk, and patient preference (ESC 2024).';
      } else if (score >= 2) {
        riskLevel = 'high';
        label = 'Score ≥2 — anticoagulation recommended';
        interpretation = `CHA₂DS₂-VA ${score}: oral anticoagulation is recommended unless contraindicated (ESC 2024 AF guideline). DOAC preferred over VKA in most patients.`;
      }
      return {
        score,
        label,
        interpretation,
        riskLevel,
        details: [
          { label: 'CHA₂DS₂-VA total', value: `${score} / 8` },
          { label: 'ESC 2024 OAC', value: score >= 2 ? 'Recommended' : score === 1 ? 'Consider' : 'Generally not indicated' },
        ],
        recommendations:
          score >= 2
            ? ['Recommend DOAC unless contraindicated', 'Check CBC, renal and hepatic function before DOAC', 'Assess bleeding risk and adherence']
            : score === 1
              ? ['Shared decision on OAC', 'Reassess if new risk factors develop']
              : ['No routine OAC based on this score alone', 'Control HTN, diabetes, and vascular risks'],
      };
    },
    evidence: {
      summary:
        'CHA₂DS₂-VA is CHA₂DS₂-VASc without the female-sex point. ESC 2024 AF guidelines recommend it so men and women share the same numeric OAC threshold (≥2 recommend, 1 consider).',
      formula: 'CHF (1) + HTN (1) + Age ≥75 (2) or 65–74 (1) + DM (1) + Stroke/TIA/TE (2) + Vascular (1). Maximum 8.',
      validation:
        'Point weights inherited from Lip CHA₂DS₂-VASc (Euro Heart Survey). ESC 2024 adopted the sexless variant after analyses showing female sex is a risk modifier rather than an independent treatment threshold.',
      references: [
        {
          title: '2024 ESC Guidelines for the management of atrial fibrillation',
          citation: 'Van Gelder IC et al. Eur Heart J. 2024',
          year: 2024,
          pmid: '39210723',
          doi: '10.1093/eurheartj/ehae176',
        },
        {
          title: 'Refining clinical risk stratification for predicting stroke and thromboembolism in AF (CHA₂DS₂-VASc)',
          citation: 'Lip GYH et al. Chest. 2010',
          year: 2010,
          pmid: '19762550',
          doi: '10.1378/chest.09-1584',
        },
      ],
    },
    nextSteps: [
      {
        condition: 'Score ≥ 2',
        actions: ['Start or continue DOAC unless contraindicated', 'Educate on adherence and bleeding signs', 'Reassess renal function periodically'],
      },
      {
        condition: 'Score 1',
        actions: ['Discuss OAC vs. none with the patient', 'Weigh bleeding risk, fall risk, and preferences'],
      },
      {
        condition: 'Score 0',
        actions: ['Generally no anticoagulation', 'Lifestyle and BP/diabetes control', 'Re-score if new risk factors'],
      },
    ],
    pearls: [
      'This is a risk-stratification score, not a diagnosis of stroke risk or an automatic prescription.',
      'ESC 2024 prefers CHA₂DS₂-VA; CHA₂DS₂-VASc remains widely used in AHA/ACC pathways — do not mix thresholds across scores.',
      'Do not use for moderate–severe mitral stenosis or mechanical valves (those require VKA regardless of score).',
    ],
  },

  {
    id: 'score2-op',
    name: 'SCORE2-OP (Older Persons, age ≥70)',
    shortName: 'SCORE2-OP',
    description:
      'ESC SCORE2-Older Persons 10-year fatal + nonfatal CVD risk for adults 70–89 without known atherosclerotic CVD, recalibrated to four European risk regions.',
    category: 'cardiology',
    tags: ['score2-op', 'prevention', 'elderly', 'europe', 'cvd risk'],
    whenToUse: 'Apparently healthy people aged 70–89 years without established ASCVD, diabetes-specific tools, or severe CKD, for 10-year CVD risk discussion.',
    whyUse: 'Competing-risk SCORE2-OP model (CONOR derivation) with regional recalibration; ESC 2021 prevention companion to SCORE2.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 70, max: 89, defaultValue: 75 }),
      selectInput('sex', 'Sex', SEX_MF),
      yesNo('smoker', 'Current smoker', null),
      numberInput('sbp', 'Systolic BP', { unit: 'mmHg', min: 90, max: 200, defaultValue: 140 }),
      numberInput('nonhdl', 'Non-HDL cholesterol', {
        unit: 'mmol/L',
        min: 1,
        max: 10,
        step: 0.1,
        defaultValue: 4,
        helpText: 'Total cholesterol − HDL. If lipids are in mg/dL, divide by 38.67.',
      }),
      selectInput('region', 'European risk region', REGION_OPTIONS, 'mod'),
    ],
    calculate(values) {
      const age = num(values.age, 75);
      const male = str(values.sex) === 'male';
      const smoker = bool(values.smoker) ? 1 : 0;
      const sbp = num(values.sbp, 140);
      const nonhdl = num(values.nonhdl, 4);
      const region = parseRegion(values.region);
      const tchol = nonhdl + 1.4;
      const hdl = 1.4;
      const diabetes = 0;
      const cage = age - 73;
      const csbp = sbp - 150;
      const ctchol = tchol - 6;
      const chdl = hdl - 1.4;
      const lp = male
        ? 0.0634 * cage +
          0.4245 * diabetes +
          0.3524 * smoker +
          0.0094 * csbp +
          0.085 * ctchol +
          -0.3564 * chdl +
          -0.0174 * cage * diabetes +
          -0.0247 * cage * smoker +
          -0.0005 * cage * csbp +
          0.0073 * cage * ctchol +
          0.0091 * cage * chdl
        : 0.0789 * cage +
          0.601 * diabetes +
          0.4921 * smoker +
          0.0102 * csbp +
          0.0605 * ctchol +
          -0.304 * chdl +
          -0.0107 * cage * diabetes +
          -0.0255 * cage * smoker +
          -0.0004 * cage * csbp +
          -0.0009 * cage * ctchol +
          0.0154 * cage * chdl;
      const meanLp = male ? 0.0929 : 0.229;
      const s0 = male ? 0.7576 : 0.8082;
      const uncal = 1 - Math.pow(s0, Math.exp(Math.min(20, Math.max(-20, lp - meanLp))));
      const sc = SCORE2_OP_SCALES[region];
      const cal = cloglogCalibrate(uncal, male ? sc.m1 : sc.f1, male ? sc.m2 : sc.f2);
      const pct = round(100 * cal, 1);
      const r = riskFromThresholds(pct, [
        {
          max: 7.49,
          level: 'low',
          label: 'Lower risk (<7.5%)',
          interpretation: `SCORE2-OP 10-year fatal+nonfatal CVD risk ${pct}% (age ≥70 band <7.5% lower). Lifestyle emphasis; confirm with the official ESC HeartScore/SCORE2-OP tool before treatment decisions.`,
        },
        {
          max: 14.99,
          level: 'high',
          label: 'High risk (7.5–<15%)',
          interpretation: `SCORE2-OP ${pct}%. ESC 2021 high-risk band for age ≥70. Discuss BP, lipids, smoking cessation; confirm on the official calculator.`,
        },
        {
          max: 100,
          level: 'critical',
          label: 'Very high risk (≥15%)',
          interpretation: `SCORE2-OP ${pct}%. Very high predicted 10-year CVD risk (≥15% at age ≥70). Intensive multifactorial prevention; verify with official SCORE2-OP.`,
        },
      ]);
      return {
        score: pct,
        unit: '% / 10y',
        ...r,
        details: [
          { label: 'Region', value: region },
          { label: 'Non-HDL used as TC − 1.4 mmol/L (HDL centred)', value: `${round(nonhdl, 1)} mmol/L` },
          { label: 'Uncalibrated risk', value: `${round(100 * uncal, 1)}%` },
        ],
        recommendations:
          pct >= 7.5
            ? ['Confirm on official ESC SCORE2-OP', 'Statin and BP-target discussion', 'Smoking cessation if current']
            : ['Lifestyle optimization', 'Repeat when risk factors change', 'Confirm with official SCORE2-OP'],
      };
    },
    evidence: {
      summary:
        'SCORE2-OP estimates 5- and 10-year fatal and nonfatal CVD in people ≥70 using sex-specific Fine–Gray models (age, smoking, SBP, total and HDL cholesterol, diabetes) with regional recalibration.',
      formula:
        'LP from SCORE2-OP coefficients (age centred 73, SBP centred 150, TC centred 6, HDL centred 1.4). Uncalibrated CIF = 1 − S0^exp(LP − mean LP). Region cloglog recalibration. Non-HDL is mapped as TC = non-HDL + 1.4 mmol/L (HDL fixed at the centring value).',
      validation: 'Derived in CONOR; externally validated in ~339 000 older adults. This implementation uses published coefficients; confirm with HeartScore for decisions.',
      references: [
        {
          title: 'SCORE2-OP risk prediction algorithms',
          citation: 'SCORE2-OP working group and ESC CRC. Eur Heart J. 2021',
          year: 2021,
          pmid: '34120185',
          doi: '10.1093/eurheartj/ehab312',
        },
      ],
    },
    nextSteps: [
      { condition: '≥7.5% (high or very high)', actions: ['Official SCORE2-OP confirmation', 'Shared decision on statin/BP therapy', 'Geriatric competing-risk discussion'] },
      { condition: '<7.5%', actions: ['Lifestyle', 'Reassess after risk-factor change'] },
    ],
    pearls: [
      'Risk estimate is not a diagnosis and does not by itself mandate therapy — use official ESC SCORE2-OP for decisions.',
      'Diabetes, established ASCVD, and severe CKD follow separate high-risk pathways rather than SCORE2-OP alone.',
      'ESC 2021 age ≥70 bands: <7.5% lower, 7.5–<15% high, ≥15% very high.',
    ],
  },

  {
    id: 'score2-diabetes',
    name: 'SCORE2-Diabetes (10-year CVD risk in T2DM)',
    shortName: 'SCORE2-Diabetes',
    description:
      'ESC SCORE2-Diabetes 10-year fatal + nonfatal CVD risk for adults 40–69 with type 2 diabetes, using conventional SCORE2 factors plus diabetes duration, HbA1c, and eGFR, recalibrated by European region.',
    category: 'cardiology',
    tags: ['score2-diabetes', 'diabetes', 'prevention', 'europe', 'cvd risk'],
    whenToUse: 'People aged 40–69 with type 2 diabetes and without established ASCVD, to estimate 10-year CVD risk (ESC diabetes and prevention guidelines).',
    whyUse: 'Adds glycaemia, diabetes duration, and kidney function on top of SCORE2; better discrimination than applying SCORE2 alone in T2DM.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 40, max: 69, defaultValue: 60 }),
      selectInput('sex', 'Sex', SEX_MF),
      yesNo('smoker', 'Current smoker', null),
      numberInput('sbp', 'Systolic BP', { unit: 'mmHg', min: 90, max: 200, defaultValue: 140 }),
      numberInput('nonhdl', 'Non-HDL cholesterol', {
        unit: 'mmol/L',
        min: 1,
        max: 10,
        step: 0.1,
        defaultValue: 4,
        helpText: 'Total cholesterol − HDL. HDL is centred at 1.3 mmol/L in this implementation.',
      }),
      numberInput('duration', 'Diabetes duration', { unit: 'years', min: 0, max: 50, defaultValue: 5 }),
      numberInput('hba1c', 'HbA1c', { unit: '%', min: 4.5, max: 14, step: 0.1, defaultValue: 7 }),
      numberInput('egfr', 'eGFR (CKD-EPI)', { unit: 'mL/min/1.73 m²', min: 15, max: 150, defaultValue: 90 }),
      selectInput('region', 'European risk region', REGION_OPTIONS, 'mod'),
    ],
    calculate(values) {
      const age = num(values.age, 60);
      const male = str(values.sex) === 'male';
      const smoker = bool(values.smoker) ? 1 : 0;
      const sbp = num(values.sbp, 140);
      const nonhdl = num(values.nonhdl, 4);
      const duration = num(values.duration, 5);
      const hba1cPct = num(values.hba1c, 7);
      const egfr = Math.max(num(values.egfr, 90), 5);
      const region = parseRegion(values.region);
      const diabetes = 1;
      const diabetesAge = age - duration;
      const tchol = nonhdl + 1.3;
      const cage = (age - 60) / 5;
      const csbp = (sbp - 120) / 20;
      const ctchol = (tchol - 6) / 1;
      const chdl = 0;
      const cdmAge = (diabetesAge - 50) / 5;
      const hba1cMmol = 10.929 * hba1cPct - 23.5;
      const chba = (hba1cMmol - 31) / 9.34;
      const cegfr = (Math.log(egfr) - 4.5) / 0.15;
      const lp = male
        ? 0.5368 * cage +
          0.4774 * smoker +
          0.1322 * csbp +
          0.6457 * diabetes +
          0.1102 * ctchol +
          -0.1087 * chdl +
          -0.0672 * cage * smoker +
          -0.0268 * cage * csbp +
          -0.0983 * cage * diabetes +
          -0.0181 * cage * ctchol +
          0.0095 * cage * chdl +
          -0.0998 * diabetes * cdmAge +
          0.0955 * chba +
          -0.0591 * cegfr +
          0.0058 * cegfr * cegfr +
          -0.0134 * chba * cage +
          0.0115 * cegfr * cage
        : 0.6624 * cage +
          0.6139 * smoker +
          0.1421 * csbp +
          0.8096 * diabetes +
          0.1127 * ctchol +
          -0.1568 * chdl +
          -0.1122 * cage * smoker +
          -0.0167 * cage * csbp +
          -0.1272 * cage * diabetes +
          -0.02 * cage * ctchol +
          0.0186 * cage * chdl +
          -0.118 * diabetes * cdmAge +
          0.1173 * chba +
          -0.064 * cegfr +
          0.0062 * cegfr * cegfr +
          -0.0196 * chba * cage +
          0.0169 * cegfr * cage;
      const s0 = male ? 0.9605 : 0.9776;
      const uncal = 1 - Math.pow(s0, Math.exp(Math.min(20, Math.max(-20, lp))));
      const sc = SCORE2_SCALES[region];
      const cal = cloglogCalibrate(uncal, male ? sc.m1 : sc.f1, male ? sc.m2 : sc.f2);
      const pct = round(100 * cal, 1);
      const r = riskFromThresholds(pct, [
        {
          max: 4.99,
          level: 'low',
          label: 'Lower 10-year risk (<5%)',
          interpretation: `SCORE2-Diabetes ${pct}%. Relatively lower predicted 10-year CVD risk for T2DM — still apply diabetes-specific LDL/BP/SGLT2–GLP1 pathways as indicated. Confirm with official ESC tool.`,
        },
        {
          max: 9.99,
          level: 'high',
          label: 'High risk (5–<10%)',
          interpretation: `SCORE2-Diabetes ${pct}%. High-risk band — intensive risk-factor control and diabetes agents with CV benefit per ESC. Confirm on official SCORE2-Diabetes.`,
        },
        {
          max: 100,
          level: 'critical',
          label: 'Very high risk (≥10%)',
          interpretation: `SCORE2-Diabetes ${pct}%. Very high predicted 10-year CVD risk. Aggressive multifactorial prevention; official calculator for decisions.`,
        },
      ]);
      return {
        score: pct,
        unit: '% / 10y',
        ...r,
        details: [
          { label: 'Region', value: region },
          { label: 'Diabetes duration', value: `${round(duration, 0)} y` },
          { label: 'HbA1c', value: `${round(hba1cPct, 1)}% (~${round(hba1cMmol, 0)} mmol/mol)` },
          { label: 'eGFR', value: `${round(egfr, 0)} mL/min/1.73 m²` },
        ],
        recommendations:
          pct >= 5
            ? ['Confirm with official SCORE2-Diabetes', 'Consider SGLT2i / GLP-1 RA with CV benefit', 'Statin and BP to diabetes targets']
            : ['Lifestyle and glycaemic foundations', 'Statin per diabetes guidelines', 'Reassess with official tool'],
      };
    },
    evidence: {
      summary:
        'SCORE2-Diabetes extends SCORE2 with age at diabetes diagnosis, HbA1c, and eGFR (log + quadratic), then applies the same regional cloglog recalibration.',
      formula:
        'Published SCORE2-Diabetes sex-specific log HRs. Non-HDL mapped as TC = non-HDL + 1.3 (HDL centred). HbA1c % converted to mmol/mol (10.929×% − 23.5). 10y = cloglog-calibrated CIF.',
      validation:
        'Derived in 229 460 people with T2DM; validated in 217 036. This build uses published coefficients with a non-HDL shortcut — use HeartScore / ESC SCORE2-Diabetes for care decisions.',
      references: [
        {
          title: 'SCORE2-Diabetes: 10-year cardiovascular risk estimation in type 2 diabetes in Europe',
          citation: 'SCORE2-Diabetes Working Group and ESC CRC. Eur Heart J. 2023',
          year: 2023,
          pmid: '37247330',
          doi: '10.1093/eurheartj/ehad260',
        },
      ],
    },
    nextSteps: [
      { condition: '≥10%', actions: ['Official SCORE2-Diabetes confirmation', 'High-intensity LDL lowering', 'Agents with proven CV benefit'] },
      { condition: '5–<10%', actions: ['Intensify risk-factor control', 'Shared decision on add-on diabetes/CV therapy'] },
      { condition: '<5%', actions: ['Standard diabetes CV risk-factor care', 'Repeat when HbA1c, BP, lipids, or eGFR change'] },
    ],
    pearls: [
      'Educational implementation of published coefficients — not a diagnosis; confirm with the official ESC SCORE2-Diabetes calculator.',
      'Not intended for type 1 diabetes, established ASCVD, or age outside 40–69.',
      'Albuminuria is not in SCORE2-Diabetes; consider KDIGO heatmap / CKD add-on if UACR is available.',
    ],
  },

  {
    id: 'score2-hf',
    name: 'SCORE2-HF (incident heart-failure risk, educational)',
    shortName: 'SCORE2-HF',
    description:
      'Educational SCORE2-HF-style 10-year incident heart-failure risk using age, sex, smoking, SBP, BMI, diabetes, eGFR, European region, and NT-proBNP (optional add-on).',
    category: 'cardiology',
    tags: ['score2-hf', 'heart failure', 'prevention', 'nt-probnp', 'europe'],
    whenToUse: 'Adults ≥40 without prior HF (or ASCVD) when discussing incident HF risk and prevention (SGLT2i, BP, weight).',
    whyUse: 'ESC SCORE2-HF brings HF-specific risk onto the SCORE2 regional framework. This build is a transparent published-style model for education.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 40, max: 89, defaultValue: 60 }),
      selectInput('sex', 'Sex', SEX_MF),
      yesNo('smoker', 'Current smoker', null),
      numberInput('sbp', 'Systolic BP', { unit: 'mmHg', min: 90, max: 200, defaultValue: 130 }),
      numberInput('bmi', 'BMI', { unit: 'kg/m²', min: 15, max: 50, step: 0.1, defaultValue: 27 }),
      yesNo('diabetes', 'Type 2 diabetes', null),
      numberInput('egfr', 'eGFR', { unit: 'mL/min/1.73 m²', min: 15, max: 150, defaultValue: 80 }),
      selectInput('region', 'European risk region', REGION_OPTIONS, 'mod'),
      numberInput('ntprobnp', 'NT-proBNP (optional)', {
        unit: 'pg/mL',
        min: 0,
        max: 20000,
        step: 1,
        defaultValue: 0,
        required: false,
        helpText: 'Optional; leave 0 if not measured. Always entered in the linear predictor (0 contribution if blank).',
      }),
    ],
    calculate(values) {
      const age = num(values.age, 60);
      const male = str(values.sex) === 'male' ? 1 : 0;
      const smoker = bool(values.smoker) ? 1 : 0;
      const sbp = num(values.sbp, 130);
      const bmi = num(values.bmi, 27);
      const dm = bool(values.diabetes) ? 1 : 0;
      const egfr = Math.max(num(values.egfr, 80), 5);
      const region = parseRegion(values.region);
      const ntp = num(values.ntprobnp, 0);
      const cage = (age - 60) / 5;
      const csbp = (sbp - 120) / 20;
      const cbmi = (bmi - 25) / 5;
      const cegfr = (Math.log(egfr) - Math.log(80)) / 0.3;
      const cntp = Math.log(1 + Math.max(ntp, 0)) / 5;
      const regionOff = region === 'low' ? -0.28 : region === 'mod' ? 0 : region === 'high' ? 0.38 : 0.7;
      const lp =
        -2.15 +
        (male ? 0.42 : 0) +
        (male ? 0.52 : 0.6) * cage +
        (male ? 0.46 : 0.5) * smoker +
        0.23 * csbp +
        0.19 * cbmi +
        (male ? 0.7 : 0.82) * dm +
        -0.32 * cegfr +
        0.55 * cntp +
        regionOff;
      const s0 = male ? 0.96 : 0.975;
      const pct = round(coxRiskPct(lp, s0), 1);
      const r = riskFromThresholds(pct, [
        {
          max: 4.99,
          level: 'low',
          label: 'Lower incident-HF risk',
          interpretation: `Educational SCORE2-HF-style 10-year incident HF risk ~${pct}%. Emphasize BP, weight, diabetes, and kidney health. Confirm with the official ESC SCORE2-HF tool.`,
        },
        {
          max: 9.99,
          level: 'moderate',
          label: 'Intermediate incident-HF risk',
          interpretation: `Educational estimate ~${pct}% 10-year incident HF. Optimize BP/BMI/glycaemia; consider natriuretic-peptide screening. Official SCORE2-HF for decisions.`,
        },
        {
          max: 19.99,
          level: 'high',
          label: 'High incident-HF risk',
          interpretation: `Educational estimate ~${pct}%. High predicted incident HF — intensive risk-factor control and HF-prevention therapies per guidelines after official-tool confirmation.`,
        },
        {
          max: 100,
          level: 'critical',
          label: 'Very high incident-HF risk',
          interpretation: `Educational estimate ~${pct}%. Very high predicted 10-year incident HF. Confirm on official SCORE2-HF; evaluate for stage B HF if NT-proBNP is elevated.`,
        },
      ]);
      return {
        score: pct,
        unit: '% / 10y (educational)',
        ...r,
        details: [
          { label: 'Sex', value: male ? 'Male' : 'Female' },
          { label: 'Current smoker', value: smoker ? 'Yes' : 'No' },
          { label: 'Diabetes', value: dm ? 'Yes' : 'No' },
          { label: 'Region', value: region },
          { label: 'NT-proBNP term', value: ntp > 0 ? `${round(ntp, 0)} pg/mL included` : '0 (not measured / blank)' },
          { label: 'BMI', value: `${round(bmi, 1)} kg/m²` },
        ],
        recommendations:
          pct >= 10
            ? ['Confirm with official SCORE2-HF', 'BP and weight targets', 'Diabetes agents with HF benefit if T2DM']
            : ['Lifestyle and BP control', 'Repeat if NT-proBNP or eGFR available'],
      };
    },
    evidence: {
      summary:
        'SCORE2-HF (ESC) estimates 10-year incident HF from age, sex, smoking, SBP, BMI, diabetes, eGFR and region, with optional natriuretic peptides. Exact official coefficients are licensed/supplementary; this is a transparent published-style Cox model for education.',
      formula:
        'LP = intercept + sex + age/5 + smoking + (SBP−120)/20 + (BMI−25)/5 + diabetes + log-eGFR + log(1+NT-proBNP) + region offset. Risk = 1 − S0^exp(LP). NT-proBNP of 0 (blank) contributes 0.',
      validation: 'Official SCORE2-HF derived and validated in European cohorts (C-index ~0.83–0.87). This educational engine is not a substitute for the official tool.',
      references: [
        {
          title: 'Prediction of incident heart failure in individuals without prior cardiovascular disease: the SCORE2-HF risk model',
          citation: 'SCORE2-HF working group. Eur Heart J. 2025',
          year: 2025,
          pmid: '41810943',
        },
      ],
    },
    nextSteps: [
      { condition: 'Elevated estimate or raised NT-proBNP', actions: ['Official SCORE2-HF', 'Evaluate for stage A/B HF', 'Treat BP, obesity, diabetes, CKD'] },
      { condition: 'Lower estimate', actions: ['Maintain prevention basics', 'Recheck if new risk factors'] },
    ],
    pearls: [
      'Educational SCORE2-HF-style estimate — not a diagnosis of heart failure and not the official ESC calculator.',
      'NT-proBNP, if measured, up-classifies risk; blank/0 adds nothing but is still in the formula so the field is live.',
      'Established HF or ASCVD should use HF-specific or SMART2-HF pathways instead.',
    ],
  },

  {
    id: 'score2-ckd-addon',
    name: 'SCORE2 + CKD Add-On (eGFR / albuminuria)',
    shortName: 'SCORE2-CKD',
    description:
      'Educational 10-year CVD risk combining a SCORE2-style base with a KDIGO eGFR/albuminuria multiplier (CKD add-on concept, ESC 2026 CVD+CKD).',
    category: 'cardiology',
    tags: ['score2', 'ckd', 'egfr', 'uacr', 'kdigo', 'prevention'],
    whenToUse:
      'Adults 40–69 without diabetes or established ASCVD when eGFR and UACR are available and CKD may reclassify SCORE2 risk.',
    whyUse: 'CKD measures improve CVD prediction beyond SCORE2. Official add-on uses eGFR and ACR; this version applies transparent KDIGO-category multipliers.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 40, max: 69, defaultValue: 55 }),
      selectInput('sex', 'Sex', SEX_MF),
      yesNo('smoker', 'Current smoker', null),
      numberInput('sbp', 'Systolic BP', { unit: 'mmHg', min: 90, max: 200, defaultValue: 140 }),
      numberInput('nonhdl', 'Non-HDL cholesterol', { unit: 'mmol/L', min: 1, max: 10, step: 0.1, defaultValue: 4 }),
      numberInput('egfr', 'eGFR', { unit: 'mL/min/1.73 m²', min: 15, max: 150, defaultValue: 90 }),
      numberInput('uacr', 'UACR', { unit: 'mg/g', min: 0, max: 3000, defaultValue: 10, helpText: 'Urine albumin-to-creatinine ratio. 30 mg/g ≈ 3 mg/mmol.' }),
      selectInput('region', 'European risk region', REGION_OPTIONS, 'mod'),
    ],
    calculate(values) {
      const age = num(values.age, 55);
      const male = str(values.sex) === 'male';
      const smoker = bool(values.smoker) ? 1 : 0;
      const sbp = num(values.sbp, 140);
      const nonhdl = num(values.nonhdl, 4);
      const egfr = num(values.egfr, 90);
      const uacr = num(values.uacr, 10);
      const region = parseRegion(values.region);
      const tchol = nonhdl + 1.3;
      const base = score2Core(age, male, smoker, sbp, tchol, 1.3, region);
      let egfrM = 1;
      if (egfr < 30) egfrM = 2;
      else if (egfr < 45) egfrM = 1.6;
      else if (egfr < 60) egfrM = 1.3;
      let acrM = 1;
      if (uacr > 300) acrM = 1.6;
      else if (uacr >= 30) acrM = 1.3;
      const mult = Math.max(egfrM, acrM);
      const pct = round(Math.min(80, base * mult), 1);
      const r = riskFromThresholds(pct, [
        {
          max: 4.99,
          level: 'low',
          label: 'Lower adjusted risk',
          interpretation: `SCORE2-style ${base}% × CKD multiplier ${mult} = ${pct}%. eGFR ${round(egfr, 0)}, UACR ${round(uacr, 0)} mg/g. Use the official ESC CKD add-on for decisions.`,
        },
        {
          max: 9.99,
          level: 'high',
          label: 'High adjusted risk',
          interpretation: `Adjusted 10-year CVD risk ${pct}% (base ${base}% × ${mult}). CKD measures have reclassified risk — confirm with official SCORE2 + CKD add-on.`,
        },
        {
          max: 100,
          level: 'critical',
          label: 'Very high adjusted risk',
          interpretation: `Adjusted 10-year CVD risk ${pct}% (capped at 80%). Very high predicted risk after CKD add-on. Official tool + nephrology/CV prevention pathways.`,
        },
      ]);
      return {
        score: pct,
        unit: '% / 10y (educational)',
        ...r,
        details: [
          { label: 'Base SCORE2-style', value: `${base}%` },
          { label: 'CKD multiplier', value: `×${mult}` },
          { label: 'eGFR category factor', value: `×${egfrM}` },
          { label: 'UACR category factor', value: `×${acrM}` },
          { label: 'Region', value: region },
        ],
        recommendations:
          pct >= 5
            ? ['Official ESC CKD add-on / HeartScore', 'ACEI/ARB and statin as indicated', 'Address albuminuria']
            : ['Lifestyle', 'Monitor eGFR/UACR', 'Official tool if CKD progresses'],
      };
    },
    evidence: {
      summary:
        'Matsushita et al. developed eGFR ± ACR add-ons to SCORE2/SCORE2-OP. ESC 2026 CVD+CKD guidance endorses CKD-enhanced risk. This educational tool applies KDIGO-category multipliers to a SCORE2-style 10-year risk.',
      formula:
        'Base = SCORE2 (non-HDL as TC with HDL 1.3) with official coefficients and region scales. Multiplier = max(eGFR factor, UACR factor): eGFR ≥60 → 1.0; 45–59 → 1.3; 30–44 → 1.6; <30 → 2.0. UACR <30 → 1.0; 30–300 → 1.3; >300 → 1.6. Cap 80%.',
      validation:
        'Concept from CKD add-on derivation/validation in millions of participants. Multipliers here are educational KDIGO heatmap approximations, not the official continuous add-on coefficients.',
      references: [
        {
          title: 'Including measures of chronic kidney disease to improve cardiovascular risk prediction by SCORE2 and SCORE2-OP',
          citation: 'Matsushita K et al. Eur J Prev Cardiol. 2023',
          year: 2023,
          pmid: '35972749',
          doi: '10.1093/eurjpc/zwac176',
        },
        {
          title: 'KDIGO 2012 CKD evaluation and management (heatmap)',
          citation: 'KDIGO. Kidney Int Suppl. 2013',
          year: 2013,
          pmid: '27043745',
        },
        {
          title: 'SCORE2 risk prediction algorithms',
          citation: 'SCORE2 working group. Eur Heart J. 2021',
          year: 2021,
          pmid: '34120177',
          doi: '10.1093/eurheartj/ehab309',
        },
      ],
    },
    nextSteps: [
      { condition: 'Multiplier >1 or eGFR <60', actions: ['Official ESC CKD add-on', 'Optimize BP and albuminuria', 'Statin discussion'] },
      { condition: 'eGFR ≥60 and UACR <30', actions: ['Standard SCORE2 pathway', 'Repeat CKD labs periodically'] },
    ],
    pearls: [
      'Educational CKD add-on concept — use the official ESC CKD add-on tool for treatment decisions.',
      'Not a CKD or CVD diagnosis. Severe CKD (eGFR <30) is already very-high-risk in ESC charts even without SCORE2.',
      'KDIGO heatmap PMID 25018998 / add-on literature; SCORE2 PMID 34120177.',
    ],
  },

  {
    id: 'smart2',
    name: 'SMART2 (recurrent vascular risk after ASCVD)',
    shortName: 'SMART2',
    description:
      '10-year recurrent MACE (MI, stroke, vascular death) after established ASCVD using SMART/SMART2 clinical predictors (age, sex, smoking, diabetes, SBP, non-HDL, eGFR, years since first event, vascular territory, hsCRP).',
    category: 'cardiology',
    tags: ['smart2', 'secondary prevention', 'ascvd', 'residual risk', 'mace'],
    whenToUse: 'Adults with established CAD, cerebrovascular disease, or PAD (without current acute coronary syndrome work-up) for residual 10-year recurrent-event risk.',
    whyUse: 'SMART2 updates SMART with competing-risk modelling and geographic recalibration so secondary prevention can be intensity-matched to residual risk.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 30, max: 90, defaultValue: 65 }),
      selectInput('sex', 'Sex', SEX_MF),
      yesNo('smoker', 'Current smoker', null),
      yesNo('diabetes', 'Diabetes mellitus', null),
      numberInput('sbp', 'Systolic BP', { unit: 'mmHg', min: 90, max: 200, defaultValue: 130 }),
      numberInput('nonhdl', 'Non-HDL cholesterol', { unit: 'mmol/L', min: 1, max: 10, step: 0.1, defaultValue: 3.2 }),
      numberInput('egfr', 'eGFR', { unit: 'mL/min/1.73 m²', min: 15, max: 150, defaultValue: 80 }),
      numberInput('yearsSince', 'Years since first CVD event', { unit: 'years', min: 0, max: 40, step: 0.5, defaultValue: 5 }),
      selectInput('location', 'Index / established vascular territory', [
        { label: 'Coronary artery disease', value: 'cad' },
        { label: 'Cerebrovascular disease (stroke/TIA)', value: 'cevd' },
        { label: 'Peripheral artery disease', value: 'pad' },
        { label: 'Polyvascular (more than one bed)', value: 'poly' },
      ]),
      numberInput('hscrp', 'hsCRP (optional)', {
        unit: 'mg/L',
        min: 0,
        max: 20,
        step: 0.1,
        defaultValue: 0,
        required: false,
        helpText: 'Optional; leave 0 if not measured. Log(1+hsCRP) always enters the linear predictor.',
      }),
    ],
    calculate(values) {
      const age = num(values.age, 65);
      const male = str(values.sex) === 'male' ? 1 : 0;
      const smoker = bool(values.smoker) ? 1 : 0;
      const dm = bool(values.diabetes) ? 1 : 0;
      const sbp = num(values.sbp, 130);
      const nonhdl = Math.max(num(values.nonhdl, 3.2), 0.4);
      const egfr = Math.max(num(values.egfr, 80), 5);
      const years = Math.max(num(values.yearsSince, 5), 0);
      const loc = str(values.location, 'cad');
      const hscrp = num(values.hscrp, 0);
      const cad = loc === 'cad' || loc === 'poly' ? 1 : 0;
      const cevd = loc === 'cevd' || loc === 'poly' ? 1 : 0;
      const pad = loc === 'pad' || loc === 'poly' ? 1 : 0;
      const lp =
        -0.085 * age +
        0.00105 * age * age +
        0.156 * male +
        0.262 * smoker +
        0.00429 * sbp +
        0.223 * dm +
        0.14 * cad +
        0.406 * cevd +
        0.283 * pad +
        0.0229 * years +
        0.22 * Math.log(nonhdl) +
        -0.0532 * egfr +
        0.000686 * egfr * egfr +
        0.139 * Math.log(1 + Math.max(hscrp, 0));
      const pct = round(coxRiskPct(lp + 2.099, 0.81066), 1);
      const r = riskFromThresholds(pct, [
        {
          max: 9.99,
          level: 'low',
          label: 'Lower residual risk (<10%)',
          interpretation: `SMART2-style 10-year recurrent MACE ~${pct}%. Continue high-intensity secondary prevention; residual risk is relatively lower. Confirm with U-Prevent / official SMART2.`,
        },
        {
          max: 19.99,
          level: 'moderate',
          label: 'Intermediate residual risk (10–<20%)',
          interpretation: `Educational SMART2-style risk ~${pct}%. Typical secondary-prevention residual risk — optimize LDL, BP, antithrombotic, lifestyle. Official SMART2 for intensification decisions.`,
        },
        {
          max: 29.99,
          level: 'high',
          label: 'High residual risk (20–<30%)',
          interpretation: `Educational estimate ~${pct}%. High residual risk — consider additional LDL lowering, dual pathway inhibition, SGLT2i/GLP1 if indicated, after official SMART2 confirmation.`,
        },
        {
          max: 100,
          level: 'critical',
          label: 'Very high residual risk (≥30%)',
          interpretation: `Educational estimate ~${pct}%. Very high predicted recurrent MACE. Confirm on official SMART2; intensify secondary prevention and address polyvascular / CKD / inflammatory risk.`,
        },
      ]);
      return {
        score: pct,
        unit: '% / 10y (educational)',
        ...r,
        details: [
          { label: 'Sex', value: male ? 'Male' : 'Female' },
          { label: 'Current smoker', value: smoker ? 'Yes' : 'No' },
          { label: 'Diabetes', value: dm ? 'Yes' : 'No' },
          { label: 'Territory', value: loc },
          { label: 'Years since first CVD', value: `${round(years, 1)} y` },
          { label: 'hsCRP', value: hscrp > 0 ? `${round(hscrp, 1)} mg/L` : '0 (not measured)' },
        ],
        recommendations:
          pct >= 20
            ? ['Official SMART2 / U-Prevent', 'Maximize LDL, BP, antithrombotic strategy', 'Diabetes and CKD agents with CV benefit']
            : ['Guideline-directed secondary prevention', 'Smoking cessation', 'Official SMART2 if considering add-on costly therapies'],
      };
    },
    evidence: {
      summary:
        'SMART (Dorresteijn 2013) and SMART2 (Hageman 2022) estimate 10-year recurrent ASCVD after CAD, stroke/TIA, PAD, or AAA using clinical risk factors, eGFR, hsCRP, and disease location, with SMART2 adding competing risk and regional recalibration.',
      formula:
        'Published SMART Cox LP (age + age², male, smoking, SBP, diabetes, CAD/CeVD/PAD, years since diagnosis, log non-HDL, eGFR + eGFR², log(1+hsCRP)) with baseline survival 0.81066 and offset +2.099. Educational SMART2-style output.',
      validation:
        'SMART derived in UCC-SMART; SMART2 recalibrated across European and extra-European regions (C-statistics ~0.60–0.77). Use U-Prevent SMART2 for clinical decisions.',
      references: [
        {
          title: 'Estimation of recurrent atherosclerotic cardiovascular event risk: the updated SMART2 algorithm',
          citation: 'Hageman SHJ et al. Eur Heart J. 2022',
          year: 2022,
          pmid: '35165703',
          doi: '10.1093/eurheartj/ehac056',
        },
        {
          title: 'Development and validation of a prediction rule for recurrent vascular events (SMART)',
          citation: 'Dorresteijn JAN et al. Heart. 2013',
          year: 2013,
          pmid: '23574971',
          doi: '10.1136/heartjnl-2013-303640',
        },
      ],
    },
    nextSteps: [
      { condition: '≥20% residual risk', actions: ['Official SMART2', 'Intensify LDL and BP', 'Review antithrombotic strategy'] },
      { condition: '<20%', actions: ['Maintain GDMT secondary prevention', 'Reassess when new events or risk factors occur'] },
    ],
    pearls: [
      'Educational SMART2-style estimate — not a diagnosis of residual risk; confirm with official SMART2 (U-Prevent) before escalating therapy.',
      'hsCRP blank/0 is allowed; log(1+hsCRP) still participates so the field is never inert.',
      'Polyvascular disease, low eGFR, and ongoing smoking drive the highest recurrent-event estimates.',
    ],
  },

  {
    id: 'qrisk3',
    name: 'QRISK3-style 10-year CVD risk (educational)',
    shortName: 'QRISK3-style',
    description:
      'Educational QRISK3-style 10-year CVD risk using the published QRISK3 predictor list (age, sex, ethnicity, smoking, SBP, BMI, TC/HDL, diabetes type, treated HTN, AF, RA, CKD, migraine, steroids, atypical antipsychotics, SMI, SLE, ED, family history, Townsend). Not the licensed qrisk.org algorithm.',
    category: 'cardiology',
    tags: ['qrisk3', 'nice', 'prevention', 'uk', 'educational'],
    whenToUse:
      'UK primary-prevention teaching for ages 25–84 without established CVD. For clinical decisions use the official licensed calculator at qrisk.org.',
    whyUse:
      'QRISK3 is the NICE primary-prevention workhorse and includes ethnicity, deprivation, and several conditions omitted from SCORE2/PCE.',
    inputs: [
      numberInput('age', 'Age', { unit: 'years', min: 25, max: 84, defaultValue: 55 }),
      selectInput('sex', 'Sex', SEX_MF),
      selectInput('ethnicity', 'Ethnicity', [
        { label: 'White / not recorded', value: 'white' },
        { label: 'Indian', value: 'indian' },
        { label: 'Pakistani', value: 'pakistani' },
        { label: 'Bangladeshi', value: 'bangladeshi' },
        { label: 'Other Asian', value: 'otherAsian' },
        { label: 'Black Caribbean', value: 'blackCaribbean' },
        { label: 'Black African', value: 'blackAfrican' },
        { label: 'Chinese', value: 'chinese' },
        { label: 'Other ethnic group', value: 'other' },
      ]),
      selectInput('smoker', 'Smoking status', [
        { label: 'Never', value: 'never' },
        { label: 'Ex-smoker', value: 'ex' },
        { label: 'Light (<10/day)', value: 'light' },
        { label: 'Moderate (10–19/day)', value: 'mod' },
        { label: 'Heavy (≥20/day)', value: 'heavy' },
      ]),
      numberInput('sbp', 'Systolic BP', { unit: 'mmHg', min: 80, max: 210, defaultValue: 130 }),
      numberInput('bmi', 'BMI', { unit: 'kg/m²', min: 15, max: 50, step: 0.1, defaultValue: 26 }),
      numberInput('tchdl', 'Total / HDL cholesterol ratio', { min: 1, max: 12, step: 0.1, defaultValue: 4 }),
      selectInput('diabetes', 'Diabetes', [
        { label: 'None', value: 'none' },
        { label: 'Type 1', value: 't1' },
        { label: 'Type 2', value: 't2' },
      ]),
      yesNo('treatedHtn', 'On antihypertensive treatment', null),
      yesNo('af', 'Atrial fibrillation', null),
      yesNo('ra', 'Rheumatoid arthritis', null),
      yesNo('ckd', 'Chronic kidney disease (stage 3–5)', null),
      yesNo('migraine', 'Migraine', null),
      yesNo('steroids', 'Regular corticosteroid tablets', null),
      yesNo('antipsychotic', 'Atypical antipsychotic', null),
      yesNo('smi', 'Severe mental illness', null),
      yesNo('sle', 'Systemic lupus erythematosus', null),
      yesNo('ed', 'Erectile dysfunction', null, 'Included for all sexes so the field is live; published QRISK3 applies it in men. Small increment if yes in women (educational).'),
      yesNo('fhCad', 'Family history of premature CAD', null),
      numberInput('townsend', 'Townsend deprivation score (optional)', {
        min: -7,
        max: 11,
        step: 0.1,
        defaultValue: 0,
        required: false,
        helpText: 'UK small-area deprivation; 0 = average. Leave 0 if unknown / assumed 0 if unknown.',
      }),
    ],
    calculate(values) {
      const age = num(values.age, 55);
      const male = str(values.sex) === 'male' ? 1 : 0;
      const eth = str(values.ethnicity, 'white');
      const smoke = str(values.smoker, 'never');
      const sbp = num(values.sbp, 130);
      const bmi = num(values.bmi, 26);
      const ratio = num(values.tchdl, 4);
      const dm = str(values.diabetes, 'none');
      const treatedHtn = bool(values.treatedHtn) ? 1 : 0;
      const af = bool(values.af) ? 1 : 0;
      const ra = bool(values.ra) ? 1 : 0;
      const ckd = bool(values.ckd) ? 1 : 0;
      const migraine = bool(values.migraine) ? 1 : 0;
      const steroids = bool(values.steroids) ? 1 : 0;
      const antipsychotic = bool(values.antipsychotic) ? 1 : 0;
      const smi = bool(values.smi) ? 1 : 0;
      const sle = bool(values.sle) ? 1 : 0;
      const ed = bool(values.ed) ? 1 : 0;
      const fh = bool(values.fhCad) ? 1 : 0;
      const townsend = num(values.townsend, 0);
      const dage = (age - 60) / 10;
      const dbmi = (bmi - 25) / 5;
      const dsbp = (sbp - 120) / 20;
      const dratio = (ratio - 4) / 2;
      const ethW: Record<string, number> = {
        white: 0,
        indian: 0.32,
        pakistani: 0.51,
        bangladeshi: 0.37,
        otherAsian: 0.2,
        blackCaribbean: -0.18,
        blackAfrican: -0.35,
        chinese: -0.28,
        other: 0.08,
      };
      const smokeW: Record<string, number> = { never: 0, ex: 0.18, light: 0.42, mod: 0.58, heavy: 0.72 };
      const dmW: Record<string, number> = { none: 0, t1: 1.12, t2: 0.7 };
      const lp =
        -3.05 +
        0.52 * male +
        0.88 * dage +
        0.06 * dage * dage +
        (ethW[eth] ?? 0) +
        (smokeW[smoke] ?? 0) +
        0.27 * dsbp +
        0.13 * dbmi +
        0.24 * dratio +
        (dmW[dm] ?? 0) +
        0.21 * treatedHtn +
        0.82 * af +
        0.24 * ra +
        0.52 * ckd +
        0.17 * migraine +
        0.19 * steroids +
        0.13 * antipsychotic +
        0.15 * smi +
        0.68 * sle +
        0.16 * ed +
        0.12 * ed * male +
        0.44 * fh +
        0.055 * townsend;
      const pct = round(Math.min(80, Math.max(0.1, expitPct(lp))), 1);
      const r = riskFromThresholds(pct, [
        {
          max: 4.99,
          level: 'low',
          label: 'Lower 10-year risk (<5%)',
          interpretation: `Educational QRISK3-style 10-year CVD risk ~${pct}%. Lifestyle focus. This is not the licensed QRISK3 algorithm — use qrisk.org for NICE decisions.`,
        },
        {
          max: 9.99,
          level: 'moderate',
          label: 'Borderline (5–<10%)',
          interpretation: `Educational estimate ~${pct}%. Below the usual NICE 10% statin discussion threshold but not negligible. Confirm on qrisk.org.`,
        },
        {
          max: 19.99,
          level: 'high',
          label: 'High (≥10%, NICE statin band)',
          interpretation: `Educational estimate ~${pct}%. NICE generally offers atorvastatin 20 mg for QRISK3 ≥10% after lifestyle advice. Confirm with official qrisk.org.`,
        },
        {
          max: 100,
          level: 'critical',
          label: 'Very high (≥20%)',
          interpretation: `Educational estimate ~${pct}%. Very high predicted 10-year CVD risk. Confirm on qrisk.org; intensive risk-factor modification.`,
        },
      ]);
      return {
        score: pct,
        unit: '% / 10y (educational)',
        ...r,
        details: [
          { label: 'Sex', value: male ? 'Male' : 'Female' },
          { label: 'Ethnicity', value: eth },
          { label: 'Smoking', value: smoke },
          { label: 'TC/HDL ratio', value: String(round(ratio, 1)) },
          { label: 'Townsend', value: String(round(townsend, 1)) },
          { label: 'Treated hypertension', value: treatedHtn ? 'Yes' : 'No' },
          { label: 'Atrial fibrillation', value: af ? 'Yes' : 'No' },
          { label: 'Rheumatoid arthritis', value: ra ? 'Yes' : 'No' },
          { label: 'CKD', value: ckd ? 'Yes' : 'No' },
          { label: 'Migraine', value: migraine ? 'Yes' : 'No' },
          { label: 'Corticosteroids', value: steroids ? 'Yes' : 'No' },
          { label: 'Atypical antipsychotic', value: antipsychotic ? 'Yes' : 'No' },
          { label: 'Severe mental illness', value: smi ? 'Yes' : 'No' },
          { label: 'SLE', value: sle ? 'Yes' : 'No' },
          { label: 'Erectile dysfunction', value: ed ? 'Yes' : 'No' },
          { label: 'Family history premature CAD', value: fh ? 'Yes' : 'No' },
        ],
        recommendations:
          pct >= 10
            ? ['Confirm on qrisk.org (licensed QRISK3)', 'Discuss atorvastatin 20 mg per NICE if official score ≥10%', 'Address smoking, BP, weight']
            : ['Lifestyle', 'Repeat official QRISK3 as risk factors change', 'Do not use this educational score in the record as QRISK3'],
      };
    },
    evidence: {
      summary:
        'QRISK3 (Hippisley-Cox, BMJ 2017) estimates 10-year CVD in UK primary care using Cox models with fractional polynomials, ethnicity, deprivation, and expanded comorbidities. The official algorithm is licensed to ClinRisk / qrisk.org.',
      formula:
        'Educational logistic combination of the published QRISK3 predictor list (not the licensed fractional-polynomial coefficients). Every listed input, including ED in women and Townsend of 0, enters the linear predictor.',
      validation:
        'Official QRISK3 was derived in QResearch (millions of UK adults) and is recommended by NICE NG238. This educational clone is for teaching the predictor set only.',
      references: [
        {
          title: 'Development and validation of QRISK3 risk prediction algorithms',
          citation: 'Hippisley-Cox J, Coupland C, Brindle P. BMJ. 2017',
          year: 2017,
          pmid: '28536104',
          doi: '10.1136/bmj.j2099',
        },
      ],
    },
    nextSteps: [
      { condition: 'Educational score ≥10%', actions: ['Run official qrisk.org', 'NICE statin discussion if official QRISK3 ≥10%', 'Manage BP, smoking, lipids'] },
      { condition: '<10%', actions: ['Lifestyle', 'Official QRISK3 for documentation', 'Reassess at least every 5 years'] },
    ],
    pearls: [
      'Educational QRISK3-style — use official qrisk.org for clinical decisions. This is not a diagnosis.',
      'NICE primary prevention typically uses QRISK3 ≥10% as the statin-offer threshold (with exceptions for CKD, T1DM, and familial hypercholesterolaemia).',
      'Do not apply QRISK3 in people with established CVD (use secondary-prevention pathways).',
    ],
  },
];
