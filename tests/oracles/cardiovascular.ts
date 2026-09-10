import type { OracleCase } from './types';

/**
 * Cardiovascular oracle cases. Every expected value is counted / evaluated by
 * hand from the published point definition cited in `source`.
 */
export const cardiovascularOracles: OracleCase[] = [
  // ---------------------------------------------------------------- CHA2DS2-VASc
  {
    calcId: 'cha2ds2-vasc',
    description: '74-year-old woman with hypertension and diabetes: age 65–74 (1) + female (1) + HTN (1) + DM (1) = 4',
    inputs: { chf: false, htn: true, age: 1, dm: true, stroke: false, vascular: false, sex: 1 },
    expect: { score: 4 },
    source: 'Lip GYH et al. Chest 2010;137(2):263-272 — CHA₂DS₂-VASc point definition (C1 H1 A₂2 D1 S₂2 V1 A1 Sc1).',
  },
  {
    calcId: 'cha2ds2-vasc',
    description: '80-year-old man with prior stroke and CHF: age ≥75 (2) + stroke (2) + CHF (1) = 5',
    inputs: { chf: true, htn: false, age: 2, dm: false, stroke: true, vascular: false, sex: 0 },
    expect: { score: 5 },
    source: 'Lip GYH et al. Chest 2010;137(2):263-272.',
  },
  {
    calcId: 'cha2ds2-vasc',
    description: '50-year-old man, no risk factors = 0',
    inputs: { chf: false, htn: false, age: 0, dm: false, stroke: false, vascular: false, sex: 0 },
    expect: { score: 0, riskLevel: 'low' },
    source: 'Lip GYH et al. Chest 2010;137(2):263-272 — score 0 in men is the lowest stroke-risk stratum.',
  },

  // ---------------------------------------------------------------- HAS-BLED
  {
    calcId: 'has-bled',
    description: 'Uncontrolled HTN + renal impairment + labile INR + age >65 + antiplatelet = 5 (1 point each)',
    inputs: { htn: true, renal: true, liver: false, stroke: false, bleed: false, labile: true, elderly: true, drugs: true, alcohol: false },
    expect: { score: 5 },
    source: 'Pisters R et al. Chest 2010;138(5):1093-1100 — HAS-BLED, 1 point per letter (max 9).',
  },
  {
    calcId: 'has-bled',
    description: 'No bleeding risk factors = 0',
    inputs: { htn: false, renal: false, liver: false, stroke: false, bleed: false, labile: false, elderly: false, drugs: false, alcohol: false },
    expect: { score: 0, riskLevel: 'low' },
    source: 'Pisters R et al. Chest 2010;138(5):1093-1100.',
  },

  // ---------------------------------------------------------------- HEART
  {
    calcId: 'heart-score',
    description: 'History 1 + ECG 1 + age ≥65 (2) + 1–2 risk factors (1) + normal troponin (0) = 5',
    inputs: { history: 1, ecg: 1, age: 2, risk: 1, troponin: 0 },
    expect: { score: 5 },
    source: 'Six AJ et al. Neth Heart J 2008;16(6):191-196 — HEART, five 0–2 components.',
  },
  {
    calcId: 'heart-score',
    description: 'All components 0 = 0 (low risk, 0–3)',
    inputs: { history: 0, ecg: 0, age: 0, risk: 0, troponin: 0 },
    expect: { score: 0, riskLevel: 'low' },
    source: 'Six AJ et al. Neth Heart J 2008;16(6):191-196; Backus BE et al. Int J Cardiol 2013;168(3):2153-2158 (0–3 low risk).',
  },
  {
    calcId: 'heart-score',
    description: 'All components 2 = 10 (maximum)',
    inputs: { history: 2, ecg: 2, age: 2, risk: 2, troponin: 2 },
    expect: { score: 10, riskLevel: 'high' },
    source: 'Six AJ et al. Neth Heart J 2008;16(6):191-196 — maximum HEART score is 10; 7–10 is high risk.',
  },

  // ---------------------------------------------------------------- TIMI UA/NSTEMI
  {
    calcId: 'timi-ua',
    description: 'Age ≥65 + ≥3 CAD risk factors + ST deviation = 3 of 7',
    inputs: { age65: true, risk3: true, knownCad: false, asa: false, severe: false, st: true, marker: false },
    expect: { score: 3 },
    source: 'Antman EM et al. JAMA 2000;284(7):835-842 — TIMI UA/NSTEMI, 7 equally weighted predictors.',
  },
  {
    calcId: 'timi-ua',
    description: 'All 7 predictors present = 7',
    inputs: { age65: true, risk3: true, knownCad: true, asa: true, severe: true, st: true, marker: true },
    expect: { score: 7 },
    source: 'Antman EM et al. JAMA 2000;284(7):835-842.',
  },

  // ---------------------------------------------------------------- GRACE
  {
    calcId: 'grace',
    description:
      'Age 45 (25) + HR 60 (3) + SBP 150 (24) + Cr 0.9 mg/dL (7) + Killip I (0) + no arrest/ST/enzymes = 59',
    inputs: { age: 45, hr: 60, sbp: 150, creat: 0.9, killip: 0, arrest: false, st: false, enzyme: false },
    expect: { score: 59, riskLevel: 'low' },
    source:
      'Granger CB et al. Arch Intern Med 2003;163(19):2345-2353 — GRACE in-hospital death point table (age 40-49=25, HR 50-69=3, SBP 140-159=24, Cr 0.8-1.19=7); ≤108 = low risk.',
  },
  {
    calcId: 'grace',
    description:
      'Age 75 (75) + HR 115 (24) + SBP 95 (53) + Cr 2.5 (21) + Killip III (39) + arrest (39) + ST dev (28) + enzymes (14) = 293',
    inputs: { age: 75, hr: 115, sbp: 95, creat: 2.5, killip: 39, arrest: true, st: true, enzyme: true },
    expect: { score: 293, riskLevel: 'high' },
    source: 'Granger CB et al. Arch Intern Med 2003;163(19):2345-2353; >140 = high risk.',
  },

  // ---------------------------------------------------------------- PERC
  {
    calcId: 'perc',
    description: 'All eight PERC criteria negative = 0 (PERC negative, PE effectively excluded in low-risk patients)',
    inputs: { age50: false, hr100: false, o2: false, leg: false, hemoptysis: false, surgery: false, prior: false, hormone: false },
    expect: { score: 0, riskLevel: 'low' },
    source: 'Kline JA et al. J Thromb Haemost 2004;2(8):1247-1255 — PERC requires all 8 criteria negative.',
  },
  {
    calcId: 'perc',
    description: 'Age ≥50 alone = 1 positive criterion (PERC positive)',
    inputs: { age50: true, hr100: false, o2: false, leg: false, hemoptysis: false, surgery: false, prior: false, hormone: false },
    expect: { score: 1 },
    source: 'Kline JA et al. J Thromb Haemost 2004;2(8):1247-1255.',
  },

  // ---------------------------------------------------------------- Revised Geneva
  {
    calcId: 'revised-geneva',
    description: 'Age >65 (1) + previous DVT/PE (3) + HR 75–94 (3) = 7',
    inputs: { age65: true, prior: true, surgery: false, cancer: false, leg: false, hemoptysis: false, hr: 3, painPalp: false },
    expect: { score: 7 },
    source: 'Le Gal G et al. Ann Intern Med 2006;144(3):165-171 — revised Geneva score weights.',
  },
  {
    calcId: 'revised-geneva',
    description: 'No predictors, HR <75 = 0 (low clinical probability, 0–3)',
    inputs: { age65: false, prior: false, surgery: false, cancer: false, leg: false, hemoptysis: false, hr: 0, painPalp: false },
    expect: { score: 0, riskLevel: 'low' },
    source: 'Le Gal G et al. Ann Intern Med 2006;144(3):165-171.',
  },

  // ---------------------------------------------------------------- sPESI
  {
    calcId: 'spesi',
    description: 'No sPESI criteria = 0 (low risk, 30-day mortality ~1%)',
    inputs: { age80: false, cancer: false, cpd: false, hr110: false, sbp100: false, o2: false },
    expect: { score: 0, riskLevel: 'low' },
    source: 'Jiménez D et al. Arch Intern Med 2010;170(15):1383-1389 — sPESI 0 = low risk.',
  },
  {
    calcId: 'spesi',
    description: 'History of cancer (1) + HR ≥110 (1) = 2 (any point ≥1 = high risk)',
    inputs: { age80: false, cancer: true, cpd: false, hr110: true, sbp100: false, o2: false },
    expect: { score: 2, riskLevel: 'high' },
    source: 'Jiménez D et al. Arch Intern Med 2010;170(15):1383-1389 — sPESI ≥1 = high risk.',
  },

  // ---------------------------------------------------------------- MAP
  {
    calcId: 'map',
    description: 'MAP = DBP + (SBP − DBP)/3 = 80 + 40/3 = 93.33 mmHg',
    inputs: { sbp: 120, dbp: 80 },
    // tolerance 0.5: the implementation reports MAP rounded to whole mmHg.
    expect: { score: 93.33, tolerance: 0.5 },
    source: 'Standard haemodynamic definition MAP = DBP + ⅓ pulse pressure (Sesso HD et al. Hypertension 2000;36:801-807).',
  },
  {
    calcId: 'map',
    description: 'SBP 90 / DBP 45: MAP = 45 + 45/3 = 60 mmHg',
    inputs: { sbp: 90, dbp: 45 },
    expect: { score: 60, tolerance: 0.05 },
    source: 'Standard haemodynamic definition MAP = DBP + ⅓ pulse pressure.',
  },

  // ---------------------------------------------------------------- QTc
  {
    calcId: 'qtc-bazett',
    description: 'QT 400 ms at HR 60 → RR = 1.00 s, QTc = 400/√1 = 400 ms',
    inputs: { qt: 400, hr: 60 },
    expect: { score: 400, tolerance: 0.5 },
    source: 'Bazett HC. Heart 1920;7:353-370 — QTc = QT/√RR.',
  },
  {
    calcId: 'qtc-bazett',
    description: 'QT 400 ms at HR 75 → RR = 0.80 s, QTc = 400/√0.8 = 447.2 ms',
    inputs: { qt: 400, hr: 75 },
    expect: { score: 447.2, tolerance: 0.5 },
    source: 'Bazett HC. Heart 1920;7:353-370.',
  },
  {
    calcId: 'qc-fridericia',
    description: 'QT 400 ms at HR 75 → RR = 0.80 s, QTc = 400/∛0.8 = 430.9 ms',
    inputs: { qt: 400, hr: 75 },
    expect: { score: 430.9, tolerance: 0.5 },
    source: 'Fridericia LS. Acta Med Scand 1920;53:469-486 — QTc = QT/RR^(1/3).',
  },

  // ---------------------------------------------------------------- Shock index
  {
    calcId: 'shock-index',
    description: 'HR 90 / SBP 120 = 0.75 (normal range 0.5–0.7 exceeded only marginally)',
    inputs: { hr: 90, sbp: 120 },
    expect: { score: 0.75, tolerance: 0.005 },
    source: 'Allgöwer M, Burri C. Dtsch Med Wochenschr 1967;92(43):1947-1950 — shock index = HR/SBP.',
  },
  {
    calcId: 'shock-index',
    description: 'HR 120 / SBP 80 = 1.5 (markedly elevated)',
    inputs: { hr: 120, sbp: 80 },
    expect: { score: 1.5, tolerance: 0.005 },
    source: 'Allgöwer M, Burri C. Dtsch Med Wochenschr 1967;92(43):1947-1950.',
  },

  // ---------------------------------------------------------------- EDACS
  {
    calcId: 'edacs',
    description: 'Woman aged 55 (age band 51–55 = +6), no other features = 6',
    inputs: { age: 55, sex: 0, riskCad: false, diaphoresis: false, radiates: false, pleuritic: false, reproduced: false },
    expect: { score: 6 },
    source: 'Than M et al. Emerg Med Australas 2014;26(1):34-44 — EDACS age bands (51–55 = 6) plus feature weights.',
  },
  {
    calcId: 'edacs',
    description: 'Man aged 55 (6) + male (6) + diaphoresis (3) + radiation to arm (5) = 20',
    inputs: { age: 55, sex: 6, riskCad: false, diaphoresis: true, radiates: true, pleuritic: false, reproduced: false },
    expect: { score: 20 },
    source: 'Than M et al. Emerg Med Australas 2014;26(1):34-44.',
  },
];
