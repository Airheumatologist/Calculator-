import type { OracleCase } from './types';

/** Hepatology and gastroenterology oracle cases. */
export const hepaticGiOracles: OracleCase[] = [
  // ---------------------------------------------------------------- Child-Pugh
  {
    calcId: 'child-pugh',
    description: 'Bilirubin <2 (1) + albumin 2.8–3.5 (2) + INR <1.7 (1) + mild ascites (2) + no encephalopathy (1) = 7 → Class B',
    inputs: { bili: 1, albumin: 2, inr: 1, ascites: 2, enceph: 1 },
    expect: { score: 7 },
    source: 'Pugh RNH et al. Br J Surg 1973;60(8):646-649 — Child-Pugh, 5 variables scored 1–3; 5–6 = A, 7–9 = B, 10–15 = C.',
  },
  {
    calcId: 'child-pugh',
    description: 'All five variables in the best band = 5 → Class A',
    inputs: { bili: 1, albumin: 1, inr: 1, ascites: 1, enceph: 1 },
    expect: { score: 5 },
    source: 'Pugh RNH et al. Br J Surg 1973;60(8):646-649.',
  },
  {
    calcId: 'child-pugh',
    description: 'All five variables in the worst band = 15 → Class C (maximum)',
    inputs: { bili: 3, albumin: 3, inr: 3, ascites: 3, enceph: 3 },
    expect: { score: 15 },
    source: 'Pugh RNH et al. Br J Surg 1973;60(8):646-649.',
  },

  // ---------------------------------------------------------------- MELD
  {
    calcId: 'meld',
    description:
      'Bili 2.0, INR 1.5, Cr 1.0: 3.78×ln2 (2.6201) + 11.2×ln1.5 (4.5412) + 9.57×ln1 (0) + 6.43 = 13.59 → 14',
    inputs: { bili: 2, inr: 1.5, creat: 1, dialysis: false },
    expect: { score: 14, tolerance: 0.5 },
    source: 'Kamath PS et al. Hepatology 2001;33(2):464-470 — MELD = 3.78·ln(bili) + 11.2·ln(INR) + 9.57·ln(Cr) + 6.43, values <1 set to 1.',
  },
  {
    calcId: 'meld',
    description: 'Bili 4.0, INR 2.0, Cr 2.0: 5.2402 + 7.7632 + 6.6334 + 6.43 = 26.07 → 26',
    inputs: { bili: 4, inr: 2, creat: 2, dialysis: false },
    expect: { score: 26, tolerance: 0.5 },
    source: 'Kamath PS et al. Hepatology 2001;33(2):464-470.',
  },

  // ---------------------------------------------------------------- MELD-Na
  {
    calcId: 'meld-na',
    description: 'MELD 15, Na 135: 15 + 1.32×(137−135) − 0.033×15×(137−135) = 15 + 2.64 − 0.99 = 16.65 → 17',
    inputs: { meld: 15, na: 135 },
    expect: { score: 17, tolerance: 0.5 },
    source: 'Kim WR et al. N Engl J Med 2008;359(10):1018-1026 — MELD-Na = MELD + 1.32(137−Na) − 0.033·MELD·(137−Na).',
  },
  {
    calcId: 'meld-na',
    description: 'MELD 20, Na 125: 20 + 15.84 − 7.92 = 27.92 → 28',
    inputs: { meld: 20, na: 125 },
    expect: { score: 28, tolerance: 0.5 },
    source: 'Kim WR et al. N Engl J Med 2008;359(10):1018-1026 — Na bounded to 125–137.',
  },

  // ---------------------------------------------------------------- GI bleeding
  {
    calcId: 'glasgow-blatchford',
    description: 'BUN 28.1–70 (4) + Hb <10 (6) + SBP 100–109 (1) + HR ≥100 (1) + melena (1) = 13',
    inputs: { bun: 4, hbMale: 6, sbp: 1, hr100: true, melena: true, syncope: false, liver: false, heart: false },
    expect: { score: 13 },
    source: 'Blatchford O et al. Lancet 2000;356(9238):1318-1321 — GBS component weights.',
  },
  {
    calcId: 'glasgow-blatchford',
    description: 'Every component in the lowest band = 0 (candidate for outpatient management)',
    inputs: { bun: 0, hbMale: 0, sbp: 0, hr100: false, melena: false, syncope: false, liver: false, heart: false },
    expect: { score: 0, riskLevel: 'low' },
    source: 'Blatchford O et al. Lancet 2000;356(9238):1318-1321; Stanley AJ et al. Lancet 2009;373(9657):42-47 (GBS 0 = low risk).',
  },
  {
    calcId: 'rockall',
    description: 'Age 60–79 (1) + tachycardia with SBP ≥100 (1) + major comorbidity (2) = 4 (pre-endoscopy)',
    inputs: { age: 1, shock: 1, comorbid: 2 },
    expect: { score: 4 },
    source: 'Rockall TA et al. Gut 1996;38(3):316-321 — pre-endoscopy (clinical) Rockall components.',
  },

  // ---------------------------------------------------------------- Appendicitis / pancreatitis
  {
    calcId: 'alvarado',
    description: 'Migration (1) + anorexia (1) + nausea (1) + RLQ tenderness (2) + fever (1) = 6',
    inputs: { migration: true, anorexia: true, nausea: true, rlq: true, rebound: false, fever: true, leukocytosis: false, leftshift: false },
    expect: { score: 6 },
    source: 'Alvarado A. Ann Emerg Med 1986;15(5):557-564 — MANTRELS, RLQ tenderness and leukocytosis worth 2 each.',
  },
  {
    calcId: 'alvarado',
    description: 'All eight elements present = 10 (maximum)',
    inputs: { migration: true, anorexia: true, nausea: true, rlq: true, rebound: true, fever: true, leukocytosis: true, leftshift: true },
    expect: { score: 10 },
    source: 'Alvarado A. Ann Emerg Med 1986;15(5):557-564.',
  },
  {
    calcId: 'ranson',
    description: 'Age >55 + WBC >16k + glucose >200 at admission = 3 of 5',
    inputs: { age: true, wbc: true, glu: true, ldh: false, ast: false },
    expect: { score: 3 },
    source: "Ranson JH et al. Surg Gynecol Obstet 1974;139(1):69-81 — Ranson's admission criteria (non-gallstone).",
  },

  // ---------------------------------------------------------------- Fibrosis indices
  {
    calcId: 'fib4',
    description: 'FIB-4 = (age×AST)/(platelets×√ALT) = (50×40)/(200×6.3246) = 2000/1264.9 = 1.58',
    inputs: { age: 50, ast: 40, alt: 40, plt: 200 },
    expect: { score: 1.58, tolerance: 0.02 },
    source: 'Sterling RK et al. Hepatology 2006;43(6):1317-1325 — FIB-4; <1.45 excludes advanced fibrosis, >3.25 suggests it.',
  },
  {
    calcId: 'fib4',
    description: 'FIB-4 = (60×80)/(100×6.3246) = 4800/632.46 = 7.59 (>3.25, advanced fibrosis likely)',
    inputs: { age: 60, ast: 80, alt: 40, plt: 100 },
    expect: { score: 7.59, tolerance: 0.03 },
    source: 'Sterling RK et al. Hepatology 2006;43(6):1317-1325.',
  },
  {
    calcId: 'apri',
    description: 'APRI = (AST/ULN)/platelets × 100 = (60/40)/180 × 100 = 1.5/180 × 100 = 0.83',
    inputs: { ast: 60, astUln: 40, plt: 180 },
    expect: { score: 0.83, tolerance: 0.02 },
    source: 'Wai CT et al. Hepatology 2003;38(2):518-526 — APRI.',
  },
  {
    calcId: 'apri',
    description: 'APRI = (200/40)/80 × 100 = 5/80 × 100 = 6.25',
    inputs: { ast: 200, astUln: 40, plt: 80 },
    expect: { score: 6.25, tolerance: 0.02 },
    source: 'Wai CT et al. Hepatology 2003;38(2):518-526.',
  },

  // ---------------------------------------------------------------- Alcoholic hepatitis / ascites
  {
    calcId: 'maddrey-df',
    description: 'DF = 4.6×(18 − 12) + 8 = 27.6 + 8 = 35.6 (≥32 = severe)',
    inputs: { pt: 18, ptControl: 12, bili: 8 },
    expect: { score: 35.6, tolerance: 0.1 },
    source: 'Maddrey WC et al. Gastroenterology 1978;75(2):193-199 — discriminant function.',
  },
  {
    calcId: 'maddrey-df',
    description: 'DF = 4.6×(14 − 12) + 3 = 9.2 + 3 = 12.2 (<32, not severe)',
    inputs: { pt: 14, ptControl: 12, bili: 3 },
    expect: { score: 12.2, tolerance: 0.1 },
    source: 'Maddrey WC et al. Gastroenterology 1978;75(2):193-199.',
  },
  {
    calcId: 'aasld-ascites',
    description: 'SAAG = serum albumin 2.8 − ascites albumin 1.0 = 1.8 g/dL (≥1.1 = portal hypertension)',
    inputs: { serumAlb: 2.8, ascitesAlb: 1.0, ascitesProtein: 1.5 },
    expect: { score: 1.8, tolerance: 0.05 },
    source: 'Runyon BA et al. Ann Intern Med 1992;117(3):215-220 — SAAG ≥1.1 g/dL indicates portal hypertension.',
  },
  {
    calcId: 'aasld-ascites',
    description: 'SAAG = 3.5 − 2.9 = 0.6 g/dL (<1.1, non-portal-hypertensive ascites)',
    inputs: { serumAlb: 3.5, ascitesAlb: 2.9, ascitesProtein: 3.0 },
    expect: { score: 0.6, tolerance: 0.05 },
    source: 'Runyon BA et al. Ann Intern Med 1992;117(3):215-220.',
  },
];
