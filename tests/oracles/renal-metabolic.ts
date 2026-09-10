import type { OracleCase } from './types';

/** Renal, electrolyte and acid–base oracle cases. */
export const renalMetabolicOracles: OracleCase[] = [
  // ---------------------------------------------------------------- Cockcroft-Gault
  {
    calcId: 'cockcroft-gault',
    description: 'Man, 60 y, 70 kg, SCr 1.0: (140−60)×70 / (72×1.0) = 5600/72 = 77.8 mL/min',
    inputs: { age: 60, weight: 70, scr: 1.0, sex: 1 },
    expect: { score: 77.78, tolerance: 0.1 },
    source: 'Cockcroft DW, Gault MH. Nephron 1976;16(1):31-41.',
  },
  {
    calcId: 'cockcroft-gault',
    description: 'Same patient, female: 77.78 × 0.85 = 66.1 mL/min',
    inputs: { age: 60, weight: 70, scr: 1.0, sex: 0.85 },
    expect: { score: 66.11, tolerance: 0.1 },
    source: 'Cockcroft DW, Gault MH. Nephron 1976;16(1):31-41 — ×0.85 for women.',
  },

  // ---------------------------------------------------------------- CKD-EPI 2021
  {
    calcId: 'ckd-epi',
    description:
      'Woman, 50 y, SCr 1.0: κ=0.7, SCr/κ=1.4286 so min term = 1, max term = 1.4286^−1.2 = 0.65177; 0.9938^50 = 0.73269; 142×0.65177×0.73269×1.012 = 68.6 mL/min/1.73 m²',
    inputs: { scr: 1.0, age: 50, sex: 'F' },
    expect: { score: 68.6, tolerance: 0.6 },
    source: 'Inker LA et al. N Engl J Med 2021;385(19):1737-1749 — CKD-EPI 2021 creatinine equation (race-free).',
  },
  {
    calcId: 'ckd-epi',
    description: 'Man, 50 y, SCr 1.0: κ=0.9, 1.1111^−1.2 = 0.88123; 142×0.88123×0.73269 = 91.7 mL/min/1.73 m²',
    inputs: { scr: 1.0, age: 50, sex: 'M' },
    expect: { score: 91.7, tolerance: 0.6 },
    source: 'Inker LA et al. N Engl J Med 2021;385(19):1737-1749.',
  },

  // ---------------------------------------------------------------- FENa
  {
    calcId: 'fena',
    description: 'FENa = (UNa×PCr)/(PNa×UCr)×100 = (20×2)/(140×100)×100 = 0.286%',
    inputs: { pna: 140, una: 20, pcr: 2, ucr: 100 },
    expect: { score: 0.29, tolerance: 0.01 },
    source: 'Espinel CH. JAMA 1976;236(6):579-581 — FENa <1% suggests pre-renal azotaemia.',
  },
  {
    calcId: 'fena',
    description: 'FENa = (60×1.5)/(140×30)×100 = 90/4200×100 = 2.14%',
    inputs: { pna: 140, una: 60, pcr: 1.5, ucr: 30 },
    expect: { score: 2.14, tolerance: 0.02 },
    source: 'Espinel CH. JAMA 1976;236(6):579-581 — FENa >2% suggests ATN.',
  },

  // ---------------------------------------------------------------- Anion gap family
  {
    calcId: 'anion-gap',
    description: 'AG = Na − (Cl + HCO₃) = 140 − (104 + 24) = 12 mEq/L, albumin 4.0 so no correction',
    inputs: { na: 140, cl: 104, hco3: 24, albumin: 4 },
    expect: { score: 12, tolerance: 0.05 },
    source: 'Emmett M, Narins RG. Medicine (Baltimore) 1977;56(1):38-54 — serum anion gap.',
  },
  {
    calcId: 'anion-gap',
    description: 'AG = 135 − (95 + 10) = 30 mEq/L (high anion gap acidosis)',
    inputs: { na: 135, cl: 95, hco3: 10, albumin: 4 },
    expect: { score: 30, tolerance: 0.05 },
    source: 'Emmett M, Narins RG. Medicine (Baltimore) 1977;56(1):38-54.',
  },
  {
    calcId: 'urine-anion-gap',
    description: 'UAG = UNa + UK − UCl = 40 + 20 − 60 = 0 mEq/L',
    inputs: { una: 40, uk: 20, ucl: 60 },
    expect: { score: 0, tolerance: 0.05 },
    source: 'Batlle DC et al. N Engl J Med 1988;318(10):594-599 — urine anion gap.',
  },
  {
    calcId: 'urine-anion-gap',
    description: 'UAG = 20 + 15 − 80 = −45 mEq/L (negative: appropriate renal NH₄⁺ excretion, e.g. diarrhoea)',
    inputs: { una: 20, uk: 15, ucl: 80 },
    expect: { score: -45, tolerance: 0.05 },
    source: 'Batlle DC et al. N Engl J Med 1988;318(10):594-599.',
  },
  {
    calcId: 'delta-ratio',
    description: 'Δratio = (AG − 12)/(24 − HCO₃) = (20 − 12)/(24 − 12) = 8/12 = 0.67',
    inputs: { ag: 20, hco3: 12, normalAg: 12, normalHco3: 24 },
    expect: { score: 0.67, tolerance: 0.01 },
    source: 'Rastegar A. J Am Soc Nephrol 2007;18(9):2429-2431 — delta ratio interpretation.',
  },

  // ---------------------------------------------------------------- Corrected values
  {
    calcId: 'corrected-calcium',
    description: 'Corrected Ca = 8.0 + 0.8×(4.0 − 2.5) = 8.0 + 1.2 = 9.2 mg/dL',
    inputs: { ca: 8.0, alb: 2.5 },
    expect: { score: 9.2, tolerance: 0.05 },
    source: 'Payne RB et al. BMJ 1973;4(5893):643-646 — albumin correction of total calcium.',
  },
  {
    calcId: 'corrected-calcium',
    description: 'Corrected Ca = 7.0 + 0.8×(4.0 − 2.0) = 7.0 + 1.6 = 8.6 mg/dL',
    inputs: { ca: 7.0, alb: 2.0 },
    expect: { score: 8.6, tolerance: 0.05 },
    source: 'Payne RB et al. BMJ 1973;4(5893):643-646.',
  },
  {
    calcId: 'corrected-sodium',
    description: 'Katz factor: Na 130 + 1.6×(400 − 100)/100 = 130 + 4.8 = 134.8 mEq/L',
    inputs: { na: 130, glu: 400, factor: 1.6 },
    expect: { score: 134.8, tolerance: 0.05 },
    source: 'Katz MA. N Engl J Med 1973;289(16):843-844 — 1.6 mEq/L per 100 mg/dL glucose.',
  },
  {
    calcId: 'corrected-sodium',
    description: 'Hillier factor: Na 130 + 2.4×(400 − 100)/100 = 130 + 7.2 = 137.2 mEq/L',
    inputs: { na: 130, glu: 400, factor: 2.4 },
    expect: { score: 137.2, tolerance: 0.05 },
    source: 'Hillier TA et al. Am J Med 1999;106(4):399-403 — 2.4 mEq/L per 100 mg/dL glucose.',
  },

  // ---------------------------------------------------------------- Osmolality
  {
    calcId: 'serum-osmolality',
    description: '2×140 + 100/18 + 14/2.8 = 280 + 5.556 + 5 = 290.6 mOsm/kg',
    inputs: { na: 140, glu: 100, bun: 14, etoh: 0, measured: 0 },
    expect: { score: 290.56, tolerance: 0.1 },
    source: 'Standard calculated osmolality 2Na + glucose/18 + BUN/2.8 (Purssell RA et al. Ann Emerg Med 2001;38(6):653-659).',
  },
  {
    calcId: 'osmolal-gap',
    description: 'Measured 320 − calculated 290 = 30 mOsm/kg (elevated, >10)',
    inputs: { measured: 320, calculated: 290 },
    expect: { score: 30, tolerance: 0.05 },
    source: 'Purssell RA et al. Ann Emerg Med 2001;38(6):653-659 — osmolal gap.',
  },

  // ---------------------------------------------------------------- Water/sodium
  {
    calcId: 'free-water-deficit',
    description: 'TBW 0.6×70 = 42 L; deficit = 42 × (155/140 − 1) = 42 × 0.10714 = 4.5 L',
    inputs: { weight: 70, na: 155, goalNa: 140, tbw: 0.6 },
    expect: { score: 4.5, tolerance: 0.05 },
    source: 'Adrogué HJ, Madias NE. N Engl J Med 2000;342(20):1493-1499 — free water deficit.',
  },
  {
    calcId: 'winters',
    description: "Winter's formula: expected PaCO₂ = 1.5×12 + 8 = 26 mmHg (±2)",
    inputs: { hco3: 12, paco2: 28 },
    expect: { score: 26, tolerance: 0.5 },
    source: 'Albert MS, Dell RB, Winters RW. Ann Intern Med 1967;66(2):312-322.',
  },

  // ---------------------------------------------------------------- KDIGO AKI
  {
    calcId: 'kdigo-aki',
    description: 'Creatinine stage 2, urine-output stage 1 → overall stage = max(2,1) = 2',
    inputs: { crStage: 2, uopStage: 1 },
    expect: { score: 2 },
    source: 'KDIGO Clinical Practice Guideline for Acute Kidney Injury. Kidney Int Suppl 2012;2(1):1-138 — stage is the worst of the two criteria.',
  },
  {
    calcId: 'kdigo-aki',
    description: 'No creatinine or urine-output criterion met → stage 0',
    inputs: { crStage: 0, uopStage: 0 },
    expect: { score: 0 },
    source: 'KDIGO AKI Guideline 2012.',
  },
];
