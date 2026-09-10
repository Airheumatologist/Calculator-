import type { OracleCase } from './types';

/** Anthropometric, haematologic and general laboratory formula oracle cases. */
export const generalFormulaOracles: OracleCase[] = [
  // ---------------------------------------------------------------- BMI / BSA
  {
    calcId: 'bmi',
    description: 'BMI = 70 / 1.70² = 70 / 2.89 = 24.22 kg/m² (normal weight)',
    inputs: { weight: 70, height: 170 },
    expect: { score: 24.22, tolerance: 0.05 },
    source: 'WHO Technical Report Series 894 (2000) — BMI = weight(kg)/height(m)²; 18.5–24.9 normal.',
  },
  {
    calcId: 'bmi',
    description: 'BMI = 100 / 2.89 = 34.60 kg/m² (obesity class I, 30.0–34.9)',
    inputs: { weight: 100, height: 170 },
    expect: { score: 34.6, tolerance: 0.05 },
    source: 'WHO Technical Report Series 894 (2000).',
  },
  {
    calcId: 'who-bmi-class',
    description: 'BMI 27.0 falls in the WHO overweight/pre-obese band (25.0–29.9)',
    inputs: { bmi: 27, asian: 0 },
    expect: { labelMatches: /overweight|pre-?obes/i },
    source: 'WHO Technical Report Series 894 (2000) — BMI classification bands.',
  },
  {
    calcId: 'who-bmi-class',
    description: 'BMI 17.0 falls in the WHO underweight band (<18.5)',
    inputs: { bmi: 17, asian: 0 },
    expect: { labelMatches: /underweight/i },
    source: 'WHO Technical Report Series 894 (2000).',
  },
  {
    calcId: 'bsa',
    description: 'Mosteller BSA = √(170 × 70 / 3600) = √3.30556 = 1.818 m²',
    inputs: { height: 170, weight: 70 },
    expect: { score: 1.82, tolerance: 0.02 },
    source: 'Mosteller RD. N Engl J Med 1987;317(17):1098 — BSA = √(ht[cm]×wt[kg]/3600).',
  },
  {
    calcId: 'bsa',
    description: 'Mosteller BSA = √(180 × 80 / 3600) = √4 = 2.00 m² exactly',
    inputs: { height: 180, weight: 80 },
    expect: { score: 2.0, tolerance: 0.01 },
    source: 'Mosteller RD. N Engl J Med 1987;317(17):1098.',
  },

  // ---------------------------------------------------------------- Body weight
  {
    calcId: 'ibw',
    description: 'Devine male: 170 cm = 66.929 in; 50 + 2.3×(66.929 − 60) = 50 + 15.94 = 65.9 kg',
    inputs: { height: 170, sex: 'M' },
    expect: { score: 65.94, tolerance: 0.1 },
    source: 'Devine BJ. Drug Intell Clin Pharm 1974;8:650-655 — IBW = 50 (men) / 45.5 (women) + 2.3 kg per inch over 5 ft.',
  },
  {
    calcId: 'ibw',
    description: 'Devine female: 45.5 + 15.94 = 61.4 kg at 170 cm',
    inputs: { height: 170, sex: 'F' },
    expect: { score: 61.44, tolerance: 0.1 },
    source: 'Devine BJ. Drug Intell Clin Pharm 1974;8:650-655.',
  },
  {
    calcId: 'abw',
    description: 'AdjBW = IBW + 0.4×(TBW − IBW) = 70 + 0.4×30 = 82 kg',
    inputs: { tbw: 100, ibw: 70, factor: 0.4 },
    expect: { score: 82, tolerance: 0.05 },
    source: 'Bauer LA. Applied Clinical Pharmacokinetics — adjusted body weight with a 0.4 correction factor.',
  },

  // ---------------------------------------------------------------- Haematology
  {
    calcId: 'anc',
    description: 'ANC = WBC×1000 × (segs + bands)/100 = 4000 × 0.50 = 2000 cells/µL',
    inputs: { wbc: 4, neut: 50, bands: 0 },
    expect: { score: 2000, tolerance: 1 },
    source: 'Standard differential arithmetic; ANC <500/µL defines severe neutropenia (IDSA febrile neutropenia guideline, Freifeld AG et al. Clin Infect Dis 2011;52(4):e56-e93).',
  },
  {
    calcId: 'anc',
    description: 'ANC = 1000 × (20 + 5)/100 = 250 cells/µL (severe neutropenia, <500)',
    inputs: { wbc: 1.0, neut: 20, bands: 5 },
    expect: { score: 250, tolerance: 1 },
    source: 'Freifeld AG et al. Clin Infect Dis 2011;52(4):e56-e93.',
  },
  {
    calcId: 'transferrin-sat',
    description: 'TSAT = serum iron / TIBC × 100 = 60/300 × 100 = 20%',
    inputs: { iron: 60, tibc: 300 },
    expect: { score: 20, tolerance: 0.1 },
    source: 'Camaschella C. N Engl J Med 2015;372(19):1832-1843 — transferrin saturation definition.',
  },
  {
    calcId: 'transferrin-sat',
    description: 'TSAT = 30/400 × 100 = 7.5% (iron deficient, <20%)',
    inputs: { iron: 30, tibc: 400 },
    expect: { score: 7.5, tolerance: 0.1 },
    source: 'Camaschella C. N Engl J Med 2015;372(19):1832-1843.',
  },

  // ---------------------------------------------------------------- Comorbidity
  {
    calcId: 'charlson-comorbidity',
    description: 'Age 45 (0 age points) with MI (1) + CHF (1) + uncomplicated diabetes (1) = 3',
    inputs: {
      age: 45, mi: true, chf: true, pvd: false, cva: false, dementia: false, copd: false, ctd: false,
      pud: false, liverMild: false, dm: true, dmEnd: false, hemiplegia: false, ckd: false, tumor: false,
      leukemia: false, lymphoma: false, liverSevere: false, mets: false, aids: false,
    },
    expect: { score: 3 },
    source: 'Charlson ME et al. J Chronic Dis 1987;40(5):373-383; age adjustment adds 1 point per decade from age 50 (Charlson ME et al. J Clin Epidemiol 1994;47(11):1245-1251), so 0 at age 45.',
  },
  {
    calcId: 'charlson-comorbidity',
    description: 'Age 45 with metastatic solid tumour (6) + AIDS (6) = 12',
    inputs: {
      age: 45, mi: false, chf: false, pvd: false, cva: false, dementia: false, copd: false, ctd: false,
      pud: false, liverMild: false, dm: false, dmEnd: false, hemiplegia: false, ckd: false, tumor: false,
      leukemia: false, lymphoma: false, liverSevere: false, mets: true, aids: true,
    },
    expect: { score: 12 },
    source: 'Charlson ME et al. J Chronic Dis 1987;40(5):373-383 — metastatic solid tumour and AIDS weigh 6 each.',
  },
];
