import type { OracleCase } from './types';

/** Pulmonary, infectious disease and critical care oracle cases. */
export const pulmonaryInfectiousOracles: OracleCase[] = [
  // ---------------------------------------------------------------- CURB-65
  {
    calcId: 'curb65',
    description: 'Confusion + urea >7 mmol/L + RR ≥30 = 3 (1 point each)',
    inputs: { confusion: true, urea: true, rr: true, bp: false, age: false },
    expect: { score: 3 },
    source: 'Lim WS et al. Thorax 2003;58(5):377-382 — CURB-65, 1 point per criterion.',
  },
  {
    calcId: 'curb65',
    description: 'No criteria = 0 (30-day mortality ~0.6%, outpatient management)',
    inputs: { confusion: false, urea: false, rr: false, bp: false, age: false },
    expect: { score: 0, riskLevel: 'low' },
    source: 'Lim WS et al. Thorax 2003;58(5):377-382.',
  },
  {
    calcId: 'curb65',
    description: 'All five criteria = 5 (maximum)',
    inputs: { confusion: true, urea: true, rr: true, bp: true, age: true },
    expect: { score: 5 },
    source: 'Lim WS et al. Thorax 2003;58(5):377-382.',
  },

  // ---------------------------------------------------------------- PSI / PORT
  {
    calcId: 'psi-port',
    description: '70-year-old man with CHF (10) and BUN ≥30 (20): 70 + 0 + 10 + 20 = 100 (Class IV, 91–130)',
    inputs: {
      age: 70, sex: 0, nh: false, neoplasm: false, liver: false, chf: true, cerebro: false, renal: false,
      ams: false, rr30: false, sbp90: false, temp35: false, hr125: false, ph735: false, bun30: true,
      na130: false, glu250: false, hct30: false, pao260: false, pleural: false,
    },
    expect: { score: 100 },
    source: 'Fine MJ et al. N Engl J Med 1997;336(4):243-250 — PSI/PORT points: age in years, male +0, CHF +10, BUN ≥30 mg/dL +20.',
  },
  {
    calcId: 'psi-port',
    description: '50-year-old woman with no comorbidity or derangement: 50 − 10 = 40 (Class II)',
    inputs: {
      age: 50, sex: -10, nh: false, neoplasm: false, liver: false, chf: false, cerebro: false, renal: false,
      ams: false, rr30: false, sbp90: false, temp35: false, hr125: false, ph735: false, bun30: false,
      na130: false, glu250: false, hct30: false, pao260: false, pleural: false,
    },
    expect: { score: 40 },
    source: 'Fine MJ et al. N Engl J Med 1997;336(4):243-250 — female sex scores age − 10.',
  },

  // ---------------------------------------------------------------- Centor / McIsaac
  {
    calcId: 'centor',
    description: 'Adult 15–44 with fever (1) and absence of cough (1), no exudate or nodes = 2',
    inputs: { fever: true, noCough: true, tender: false, exudate: false, age: 0 },
    expect: { score: 2 },
    source: 'Centor RM et al. Med Decis Making 1981;1(3):239-246; McIsaac WJ et al. CMAJ 1998;158(1):75-83 (age modifier).',
  },
  {
    calcId: 'centor',
    description: 'Child 3–14 with all four Centor criteria plus age modifier +1 = 5 (maximum)',
    inputs: { fever: true, noCough: true, tender: true, exudate: true, age: 1 },
    expect: { score: 5 },
    source: 'McIsaac WJ et al. CMAJ 1998;158(1):75-83 — maximum modified Centor score is 5.',
  },
  {
    calcId: 'mcisaac',
    description: 'Patient ≥45 (−1) with fever (1) + tender nodes (1) + exudate (1) = 2',
    inputs: { fever: true, noCough: false, tender: true, exudate: true, age: -1 },
    expect: { score: 2 },
    source: 'McIsaac WJ et al. CMAJ 1998;158(1):75-83 — age ≥45 subtracts 1 point.',
  },

  // ---------------------------------------------------------------- SIRS / qSOFA / SOFA
  {
    calcId: 'sirs',
    description: 'Temperature and heart rate criteria met = 2 of 4 (SIRS positive at ≥2)',
    inputs: { temp: true, hr: true, rr: false, wbc: false },
    expect: { score: 2 },
    source: 'Bone RC et al. Chest 1992;101(6):1644-1655 — SIRS, ≥2 of 4 criteria.',
  },
  {
    calcId: 'qsofa',
    description: 'RR ≥22 + altered mentation, SBP >100 = 2 (qSOFA positive at ≥2)',
    inputs: { rr: true, ams: true, sbp: false },
    expect: { score: 2, riskLevel: 'high' },
    source: 'Seymour CW et al. JAMA 2016;315(8):762-774 — qSOFA ≥2 identifies higher risk of poor outcome.',
  },
  {
    calcId: 'qsofa',
    description: 'No qSOFA criteria = 0',
    inputs: { rr: false, ams: false, sbp: false },
    expect: { score: 0, riskLevel: 'low' },
    source: 'Seymour CW et al. JAMA 2016;315(8):762-774.',
  },
  {
    calcId: 'sofa',
    description: 'Resp 2 + coag 1 + liver 0 + CV 3 + CNS 1 + renal 2 = 9',
    inputs: { resp: 2, coag: 1, liver: 0, cv: 3, cns: 1, renal: 2 },
    expect: { score: 9 },
    source: 'Vincent JL et al. Intensive Care Med 1996;22(7):707-710 — SOFA, six organ systems scored 0–4.',
  },
  {
    calcId: 'sofa',
    description: 'All organ systems normal = 0',
    inputs: { resp: 0, coag: 0, liver: 0, cv: 0, cns: 0, renal: 0 },
    expect: { score: 0 },
    source: 'Vincent JL et al. Intensive Care Med 1996;22(7):707-710.',
  },
  {
    calcId: 'sofa',
    description: 'All organ systems maximally deranged = 24 (maximum)',
    inputs: { resp: 4, coag: 4, liver: 4, cv: 4, cns: 4, renal: 4 },
    expect: { score: 24, riskLevel: 'critical' },
    source: 'Vincent JL et al. Intensive Care Med 1996;22(7):707-710 — maximum SOFA is 24.',
  },

  // ---------------------------------------------------------------- NEWS2 / MEWS
  {
    calcId: 'news2',
    description: 'RR 12–20 (0) + SpO₂ 94–95 (1) + supplemental O₂ (2) + temp 38.1–39.0 (1) + SBP 101–110 (1) + HR 91–110 (1) + alert (0) = 6',
    inputs: { rr: 0, spo2: 1, o2air: true, temp: 1, sbp: 1, hr: 1, conscious: 0 },
    expect: { score: 6 },
    source: 'Royal College of Physicians. National Early Warning Score (NEWS) 2, 2017 — aggregate scoring table.',
  },
  {
    calcId: 'news2',
    description: 'All parameters in the normal band, on room air, alert = 0',
    inputs: { rr: 0, spo2: 0, o2air: false, temp: 0, sbp: 0, hr: 0, conscious: 0 },
    expect: { score: 0, riskLevel: 'low' },
    source: 'Royal College of Physicians. NEWS2, 2017.',
  },
  {
    calcId: 'mews',
    description: 'SBP 101–199 (0) + HR 111–129 (2) + RR 21–29 (2) + temp ≥38.5 (2) + alert (0) = 6',
    inputs: { sbp: 0, hr: 2, rr: 2, temp: 2, avpu: 0 },
    expect: { score: 6 },
    source: 'Subbe CP et al. QJM 2001;94(10):521-526 — MEWS aggregate table.',
  },

  // ---------------------------------------------------------------- Gas exchange
  {
    calcId: 'aa-gradient',
    description:
      'Room air (FiO₂ 0.21), PaCO₂ 40, PaO₂ 90, P_atm 760: PAO₂ = 0.21×713 − 40/0.8 = 149.73 − 50 = 99.73; A–a = 9.73 mmHg',
    inputs: { fio2: 0.21, paco2: 40, pao2: 90, age: 40, patm: 760 },
    expect: { score: 9.73, tolerance: 0.1 },
    source: 'Alveolar gas equation, PAO₂ = FiO₂(P_atm − P_H₂O) − PaCO₂/R with P_H₂O 47 mmHg and R 0.8 (West JB, Respiratory Physiology).',
  },
  {
    calcId: 'aa-gradient',
    description: 'FiO₂ 1.0, PaCO₂ 40, PaO₂ 300: PAO₂ = 713 − 50 = 663; A–a = 363 mmHg',
    inputs: { fio2: 1.0, paco2: 40, pao2: 300, age: 60, patm: 760 },
    expect: { score: 363, tolerance: 0.5 },
    source: 'Alveolar gas equation (see above).',
  },
  {
    calcId: 'oxygenation-index',
    description: 'OI = FiO₂ × MAP × 100 / PaO₂ = 0.6 × 15 × 100 / 60 = 15',
    inputs: { fio2: 0.6, map: 15, pao2: 60 },
    expect: { score: 15, tolerance: 0.05 },
    source: 'Ortiz RM et al. J Pediatr 1987;111(3):384-389 — oxygenation index definition.',
  },

  // ---------------------------------------------------------------- Light's criteria
  {
    calcId: 'lights-criteria',
    description:
      'Pleural protein 3.0 / serum 7.0 = 0.43 (<0.5) but pleural LDH 200 / serum LDH 200 = 1.0 (>0.6) → exudate (any one criterion suffices)',
    inputs: { pleuralProtein: 3, serumProtein: 7, pleuralLdh: 200, serumLdh: 200, ldhUln: 200 },
    expect: { labelMatches: /exudat/i },
    source: "Light RW et al. Ann Intern Med 1972;77(4):507-513 — Light's criteria.",
  },
  {
    calcId: 'lights-criteria',
    description:
      'Pleural protein 1.5 / serum 7.0 = 0.21; pleural LDH 80 / serum 200 = 0.40; pleural LDH 80 < ⅔ × 200 = 133 → transudate',
    inputs: { pleuralProtein: 1.5, serumProtein: 7, pleuralLdh: 80, serumLdh: 200, ldhUln: 200 },
    expect: { labelMatches: /transudat/i },
    source: 'Light RW et al. Ann Intern Med 1972;77(4):507-513.',
  },
];
