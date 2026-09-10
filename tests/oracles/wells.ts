import type { OracleCase } from './types';

/** Wells criteria for PE and DVT. */
export const wellsOracles: OracleCase[] = [
  // ---------------------------------------------------------------- Wells PE
  {
    calcId: 'wells-pe',
    description: 'Clinical signs of DVT (3) + PE most likely (3) + HR >100 (1.5) = 7.5 (high probability, >6)',
    inputs: { dvt: true, alt: true, hr: true, immob: false, prev: false, hemoptysis: false, malignancy: false },
    expect: { score: 7.5, tolerance: 0.01, riskLevel: 'high' },
    source: 'Wells PS et al. Thromb Haemost 2000;83(3):416-420 — Wells PE weights; >6 high, 2–6 moderate, <2 low.',
  },
  {
    calcId: 'wells-pe',
    description: 'Previous VTE (1.5) + haemoptysis (1) = 2.5 (moderate probability, 2–6)',
    inputs: { dvt: false, alt: false, hr: false, immob: false, prev: true, hemoptysis: true, malignancy: false },
    expect: { score: 2.5, tolerance: 0.01, riskLevel: 'moderate' },
    source: 'Wells PS et al. Thromb Haemost 2000;83(3):416-420.',
  },
  {
    calcId: 'wells-pe',
    description: 'No criteria = 0 (low probability)',
    inputs: { dvt: false, alt: false, hr: false, immob: false, prev: false, hemoptysis: false, malignancy: false },
    expect: { score: 0, tolerance: 0.01, riskLevel: 'low' },
    source: 'Wells PS et al. Thromb Haemost 2000;83(3):416-420.',
  },
  {
    calcId: 'wells-pe',
    description: 'All seven criteria: 3 + 3 + 1.5 + 1.5 + 1.5 + 1 + 1 = 12.5 (maximum)',
    inputs: { dvt: true, alt: true, hr: true, immob: true, prev: true, hemoptysis: true, malignancy: true },
    expect: { score: 12.5, tolerance: 0.01 },
    source: 'Wells PS et al. Thromb Haemost 2000;83(3):416-420.',
  },

  // ---------------------------------------------------------------- Wells DVT
  {
    calcId: 'wells-dvt',
    description: 'Localized tenderness (1) + entire leg swollen (1) + calf ≥3 cm (1) = 3 (high probability, ≥3)',
    inputs: {
      cancer: false, paralysis: false, bedridden: false, tenderness: true, swelling: true, calf: true,
      pitting: false, collat: false, prior: false, alt: false,
    },
    expect: { score: 3, riskLevel: 'high' },
    source: 'Wells PS et al. Lancet 1997;350(9094):1795-1798 — Wells DVT; ≥3 high, 1–2 moderate, ≤0 low.',
  },
  {
    calcId: 'wells-dvt',
    description: 'Active cancer (1) + localized tenderness (1) with an alternative diagnosis at least as likely (−2) = 0 (low probability)',
    inputs: {
      cancer: true, paralysis: false, bedridden: false, tenderness: true, swelling: false, calf: false,
      pitting: false, collat: false, prior: false, alt: true,
    },
    expect: { score: 0, riskLevel: 'low' },
    source: 'Wells PS et al. Lancet 1997;350(9094):1795-1798 — the alternative-diagnosis item subtracts 2 points.',
  },
  {
    calcId: 'wells-dvt',
    description: 'All nine positive items, no alternative diagnosis = 9 (maximum)',
    inputs: {
      cancer: true, paralysis: true, bedridden: true, tenderness: true, swelling: true, calf: true,
      pitting: true, collat: true, prior: true, alt: false,
    },
    expect: { score: 9 },
    source: 'Wells PS et al. Lancet 1997;350(9094):1795-1798.',
  },
];
