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

  // ---------------------------------------------------------------- Shunt estimate
  {
    calcId: 'shunt-estimate',
    description:
      'Healthy ABG, content method. Hand arithmetic: PAO₂ = 0.21×(760−47) − 40/0.8 = 149.73 − 50 = 99.73. ' +
      'Severinghaus sat(P) = 1/(23400/(P³+150P)+1): sat(95) = 1/(23400/871625+1) = 0.97385; ' +
      'sat(99.73) = 1/(23400/1006881+1) = 0.97729; sat(50) = 1/(23400/132500+1) = 0.84990. ' +
      'Hb 15 → capacity 20.1 mL O₂/dL. CaO₂ = 20.1×0.97385 + 0.003×95 = 19.574 + 0.285 = 19.859; ' +
      'CcO₂ = 20.1×0.97729 + 0.003×99.73 = 19.644 + 0.299 = 19.943; ' +
      'CvO₂ = 20.1×0.84990 + 0.003×50 = 17.083 + 0.150 = 17.233. ' +
      'Qs/Qt = (19.943 − 19.859)/(19.943 − 17.233) = 0.083/2.710 = 3.1% — normal physiologic shunt range (~2–5%).',
    inputs: { pao2: 95, fio2: 0.21, paco2: 40, hb: 15, pvO2: 50, mode: 'content' },
    expect: { score: 3.1, tolerance: 0.1, riskLevel: 'low' },
    source:
      'Severinghaus JW. J Appl Physiol 1979;46(3):599-602 — O₂ dissociation equation SaO₂ = 1/(23400/(PO₂³+150·PO₂)+1); ' +
      'shunt equation Qs/Qt = (CcO₂−CaO₂)/(CcO₂−CvO₂) (West JB, Respiratory Physiology); alveolar gas equation PAO₂ = FiO₂(P_atm−47) − PaCO₂/0.8.',
  },
  {
    calcId: 'shunt-estimate',
    description:
      'Moderate ARDS (P/F 200), content method. Hand arithmetic: PAO₂ = 0.6×713 − 40/0.8 = 427.8 − 50 = 377.8. ' +
      'Severinghaus: sat(120) = 1/(23400/1746000+1) = 0.98677; sat(377.8) = 1/(23400/53981137+1) = 0.99957; ' +
      'sat(40) = 1/(23400/70000+1) = 0.74946. Hb 12 → capacity 16.08. ' +
      'CaO₂ = 16.08×0.98677 + 0.36 = 15.867 + 0.360 = 16.227; ' +
      'CcO₂ = 16.08×0.99957 + 0.003×377.8 = 16.073 + 1.133 = 17.206; ' +
      'CvO₂ = 16.08×0.74946 + 0.12 = 12.051 + 0.120 = 12.171. ' +
      'Qs/Qt = (17.206 − 16.227)/(17.206 − 12.171) = 0.979/5.035 = 19.4%.',
    inputs: { pao2: 120, fio2: 0.6, paco2: 40, hb: 12, pvO2: 40, mode: 'content' },
    expect: { score: 19.4, tolerance: 0.1, riskLevel: 'moderate' },
    source:
      'Severinghaus JW. J Appl Physiol 1979;46(3):599-602 (saturation equation); shunt equation per West JB; ' +
      'Berlin ARDS definition (P/F ≤300 with bilateral infiltrates — ARDS Definition Task Force, JAMA 2012;307(23):2526-2533) frames the clinical scenario.',
  },
  {
    calcId: 'shunt-estimate',
    description:
      'Severe shunt, content method. Hand arithmetic: PAO₂ = 1.0×713 − 40/0.8 = 663. ' +
      'Severinghaus: sat(60) = 1/(23400/225000+1) = 1/1.104 = 0.90580; sat(663) = 1/(23400/291533697+1) = 0.99992; ' +
      'sat(50) = 0.84990. Hb 12 → capacity 16.08. ' +
      'CaO₂ = 16.08×0.90580 + 0.18 = 14.565 + 0.180 = 14.745; ' +
      'CcO₂ = 16.08×0.99992 + 0.003×663 = 16.079 + 1.989 = 18.068; ' +
      'CvO₂ = 16.08×0.84990 + 0.15 = 13.666 + 0.150 = 13.816. ' +
      'Qs/Qt = (18.068 − 14.745)/(18.068 − 13.816) = 3.322/4.251 = 78.2% — very high shunt physiology.',
    inputs: { pao2: 60, fio2: 1.0, paco2: 40, hb: 12, pvO2: 50, mode: 'content' },
    expect: { score: 78.2, tolerance: 0.1, riskLevel: 'critical' },
    source:
      'Severinghaus JW. J Appl Physiol 1979;46(3):599-602 (saturation equation); shunt equation per West JB, Respiratory Physiology.',
  },
  {
    calcId: 'shunt-estimate',
    description:
      'P/F iso-shunt method with PvO₂ blank (must not refuse). Hand arithmetic: P/F = PaO₂/FiO₂ = 120/0.6 = 200, ' +
      'which lands in the 200–299 teaching band → 15% (lookup: ≥400→5, ≥300→10, ≥200→15, ≥150→20, ≥100→25, else 35). ' +
      '15 ≤ 20 → moderate band.',
    inputs: { pao2: 120, fio2: 0.6, paco2: 40, hb: 12, pvO2: null, mode: 'pf' },
    expect: { score: 15, riskLevel: 'moderate' },
    source:
      'Classic iso-shunt teaching bands (Pontoppidan H et al. N Engl J Med 1972;287(15):740-745, respiratory care in acute respiratory failure) ' +
      'as implemented in the calculator’s P/F lookup; arithmetic shown in description.',
  },
  {
    calcId: 'shunt-estimate',
    description:
      'Content method with mixed venous PO₂ blank must refuse rather than assume: at these defaults Qs/Qt spans ~31–78% ' +
      'as PvO₂ ranges 25–50 mmHg, so an assumed value is not an honest estimate. Expect the house refusal (score “—”, info) ' +
      'naming the missing input and pointing at the P/F method.',
    inputs: { pao2: 60, fio2: 1, paco2: 40, hb: 12, pvO2: null, mode: 'content' },
    expect: { score: '—', riskLevel: 'info', labelMatches: /P\/F|PaO₂\/FiO₂/ },
    source:
      'Audit Task 2a house rule for mode-gated refusals (same pattern as new-ballard, wave3-peds-ob.ts): refuse and name the missing input ' +
      'instead of substituting a plausible default; sensitivity argument per shunt equation (West JB).',
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
