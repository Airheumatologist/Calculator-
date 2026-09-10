import type { OracleCase } from './types';

/**
 * Hand-derived oracles for wave 7 rheumatology activity / damage / function scores.
 * Expected values are counted from the published definitions cited in `source`.
 */
export const wave7RheumActivityOracles: OracleCase[] = [
  // ── Boolean RA ──────────────────────────────────────────────────────────
  {
    calcId: 'boolean-remission-ra',
    description: 'TJC 0 + SJC 0 + CRP 0.3 mg/dL + PGA 0.5, original 2011 (PGA ≤1) → all pass → remission (1)',
    inputs: { revision: 'original', tjc28: 0, sjc28: 0, crp: 0.3, pga: 0.5 },
    expect: { score: 1, riskLevel: 'normal', labelMatches: /remission/i },
    source: 'Felson DT et al. Arthritis Rheum 2011;63:573 — Boolean: TJC≤1, SJC≤1, CRP≤1 mg/dL, PGA≤1.',
  },
  {
    calcId: 'boolean-remission-ra',
    description: 'Same labs but TJC28 = 2 (>1) → fails Boolean → 0 / high',
    inputs: { revision: 'original', tjc28: 2, sjc28: 0, crp: 0.3, pga: 0.5 },
    expect: { score: 0, riskLevel: 'high' },
    source: 'Felson 2011 Boolean — TJC must be ≤1.',
  },
  {
    calcId: 'boolean-remission-ra',
    description: 'PGA 1.2 with otherwise quiet disease, original 2011 (cutoff 1.0) → fail',
    inputs: { revision: 'original', tjc28: 0, sjc28: 0, crp: 0.3, pga: 1.2 },
    expect: { score: 0, riskLevel: 'high' },
    source: 'Felson 2011 — PGA ≤1. 1.2 fails original Boolean.',
  },
  {
    calcId: 'boolean-remission-ra',
    description: 'PGA 1.2 with otherwise quiet disease, 2022 revision (cutoff 1.5) → pass',
    inputs: { revision: '2022', tjc28: 0, sjc28: 0, crp: 0.3, pga: 1.2 },
    expect: { score: 1, riskLevel: 'normal' },
    source: 'Studenic 2022 Boolean revision pathway — PGA ≤1.5. 1.2 fails 2011 and passes 2022.',
  },

  // ── RAPID3 ──────────────────────────────────────────────────────────────
  {
    calcId: 'rapid3',
    description: 'FN 1 + PN 1 + PTGL 1 = 3 → near remission',
    inputs: { fn: 1, pn: 1, ptgl: 1 },
    expect: { score: 3, riskLevel: 'normal', labelMatches: /near remission/i },
    source: 'Pincus T et al. J Rheumatol 2008 — RAPID3 = FN+PN+PTGL; ≤3 near remission.',
  },
  {
    calcId: 'rapid3',
    description: 'FN 5 + PN 5 + PTGL 5 = 15 → high activity (>12)',
    inputs: { fn: 5, pn: 5, ptgl: 5 },
    expect: { score: 15, riskLevel: 'high' },
    source: 'Pincus RAPID3 bands: >12 high activity.',
  },
  {
    calcId: 'rapid3',
    description: 'FN 2 + PN 2 + PTGL 2 = 6 → low activity (3.1–6; 6 is the top of low)',
    inputs: { fn: 2, pn: 2, ptgl: 2 },
    expect: { score: 6, riskLevel: 'low' },
    source: 'Pincus RAPID3 bands: 3.1–6 low.',
  },

  // ── SLICC SDI ───────────────────────────────────────────────────────────
  {
    calcId: 'slicc-sdi',
    description: 'Renal 2 + CV 1, other domains 0 = 3 → high damage',
    inputs: {
      ocular: 0, neuro: 0, renal: 2, pulmonary: 0, cv: 1, pvd: 0,
      gi: 0, msk: 0, skin: 0, gonadal: 0, diabetes: 0, malignancy: 0,
    },
    expect: { score: 3, riskLevel: 'high' },
    source: 'Gladman D et al. Arthritis Rheum 1996;39:363 — SDI is the sum of domain item counts. 2+1=3.',
  },
  {
    calcId: 'slicc-sdi',
    description: 'All domain counts 0 = 0 → no damage',
    inputs: {
      ocular: 0, neuro: 0, renal: 0, pulmonary: 0, cv: 0, pvd: 0,
      gi: 0, msk: 0, skin: 0, gonadal: 0, diabetes: 0, malignancy: 0,
    },
    expect: { score: 0, riskLevel: 'low' },
    source: 'Gladman 1996 SDI — empty damage inventory is 0.',
  },

  // ── BILAG-2004 ──────────────────────────────────────────────────────────
  {
    calcId: 'bilag-2004-index',
    description: 'Renal A, all other domains E → A:1 B:0 C:0 D:0 E:8, any A = critical',
    inputs: { renal: 'A' },
    expect: { score: 'A:1 B:0 C:0 D:0 E:8', riskLevel: 'critical' },
    source: 'Isenberg DA et al. Rheumatology 2005 — BILAG-2004: any A is severe / very high organ activity. 9 domains, 8 remain E.',
  },
  {
    calcId: 'bilag-2004-index',
    description: 'All nine domains E → A:0 B:0 C:0 D:0 E:9, inactive / low',
    inputs: {},
    expect: { score: 'A:0 B:0 C:0 D:0 E:9', riskLevel: 'low' },
    source: 'BILAG-2004 D/E only = inactive.',
  },

  // ── SLE-DAS ─────────────────────────────────────────────────────────────
  {
    calcId: 'sle-das',
    description: 'All items inactive (intercept only) = 0.366 → rounds to 0.37, remission-like (≤2.08)',
    inputs: {
      arthritis: false, sjc: 0, mucocutVasc: false, localRash: false, generalRash: false,
      alopecia: false, ulcers: false, hypoC: false, dsdna: false, pprot: false, prot: 0,
      thromb: false, platCount: 250, leuk: false, leukCount: 6, neuropsych: false,
      systemicVasc: false, cardioPulm: false, myositis: false, serositis: false, hemolytic: false,
    },
    expect: { score: 0.37, tolerance: 0.01, riskLevel: 'normal' },
    source: 'Jesus D et al. Ann Rheum Dis 2019;78:365 — SLE-DAS intercept 0.366 with all weighted items 0.',
  },
  {
    calcId: 'sle-das',
    description: 'Serositis only: 0.366 + 6 = 6.366 → 6.37, mild (≤7.64)',
    inputs: { serositis: true, sjc: 0, prot: 0, platCount: 250, leukCount: 6 },
    expect: { score: 6.37, tolerance: 0.01, riskLevel: 'low' },
    source: 'Jesus 2019 formula: serositis coefficient = 6. 0.366+6=6.366.',
  },

  // ── LLDAS ───────────────────────────────────────────────────────────────
  {
    calcId: 'lldas',
    description: 'SLEDAI 2, no major organ, no new activity, PGA 0.5, pred 5 mg, IS tolerated → LLDAS',
    inputs: { sledai: 2, majorOrgan: false, newActivity: false, pga: 0.5, predDose: 5, intoleranceIS: false },
    expect: { score: 1, riskLevel: 'normal', labelMatches: /LLDAS met/i },
    source: 'Franklyn K et al. Ann Rheum Dis 2016;75:1615 — LLDAS: SLEDAI≤4, no major/new activity, PGA≤1, pred≤7.5, standard IS tolerated.',
  },
  {
    calcId: 'lldas',
    description: 'Same but prednisone 10 mg (>7.5) → not LLDAS',
    inputs: { sledai: 2, majorOrgan: false, newActivity: false, pga: 0.5, predDose: 10, intoleranceIS: false },
    expect: { score: 0, riskLevel: 'high' },
    source: 'Franklyn 2016 — prednisone must be ≤7.5 mg/day.',
  },

  // ── DORIS ───────────────────────────────────────────────────────────────
  {
    calcId: 'doris-remission',
    description: 'cSLEDAI 0, PGA 0.2, pred 0, complete mode, serology negative → complete remission',
    inputs: { mode: 'complete', cSledai: 0, pga: 0.2, predDose: 0, serologyPositive: false },
    expect: { score: 1, riskLevel: 'normal' },
    source: 'van Vollenhoven 2021 DORIS — clinical SLEDAI=0, PGA<0.5, prednisone 0 for complete remission.',
  },
  {
    calcId: 'doris-remission',
    description: 'cSLEDAI 0, PGA 0.2, pred 5, on-treatment, serology positive (allowed) → on-tx remission',
    inputs: { mode: 'on-tx', cSledai: 0, pga: 0.2, predDose: 5, serologyPositive: true },
    expect: { score: 1, riskLevel: 'normal' },
    source: 'DORIS 2021 — on-treatment allows prednisone ≤5 mg; serology may be positive.',
  },
  {
    calcId: 'doris-remission',
    description: 'Complete mode with prednisone 5 mg → fails complete (requires 0)',
    inputs: { mode: 'complete', cSledai: 0, pga: 0.2, predDose: 5, serologyPositive: false },
    expect: { score: 0, riskLevel: 'high' },
    source: 'DORIS complete remission requires prednisone 0.',
  },

  // ── BVAS v3 ─────────────────────────────────────────────────────────────
  {
    calcId: 'bvas-v3',
    description: 'Renal 12 + chest 4, other systems 0 = 16 → severe / high',
    inputs: {
      general: 0, cutaneous: 0, mucousEyes: 0, ent: 0, chest: 4,
      cardiac: 0, abdominal: 0, renal: 12, nervous: 0,
    },
    expect: { score: 16, riskLevel: 'high' },
    source: 'Mukhtyar C et al. Ann Rheum Dis 2009 — BVAS v3 is the sum of system points. 12+4=16; ≥16 severe.',
  },
  {
    calcId: 'bvas-v3',
    description: 'All systems 0 = remission',
    inputs: {
      general: 0, cutaneous: 0, mucousEyes: 0, ent: 0, chest: 0,
      cardiac: 0, abdominal: 0, renal: 0, nervous: 0,
    },
    expect: { score: 0, riskLevel: 'normal' },
    source: 'BVAS v3 0 = no scored current activity.',
  },

  // ── VDI ─────────────────────────────────────────────────────────────────
  {
    calcId: 'vdi-vasculitis',
    description: 'Renal 2 + cardiac 1 = 3 → high damage',
    inputs: {
      msk: 0, skin: 0, ocular: 0, ent: 0, pulmonary: 0, cardiac: 1,
      vascular: 0, gi: 0, renal: 2, neuro: 0, other: 0,
    },
    expect: { score: 3, riskLevel: 'high' },
    source: 'Exley AR et al. VDI — sum of damage items. 2+1=3.',
  },

  // ── FFS 2011 ────────────────────────────────────────────────────────────
  {
    calcId: 'ffs-2011',
    description: 'Age >65 + renal insufficiency, no other factors = 2 → high (~40% 5-y mortality)',
    inputs: {
      disease: 'gpa', age65: true, cardiac: false, gi: false, renal: true, entAbsent: false,
    },
    expect: { score: 2, riskLevel: 'high' },
    source: 'Guillevin L et al. Medicine 2011;90:19 — FFS 2011: +1 age>65, +1 renal Cr≥150. Two points = ≥2 band (~40% 5-year mortality).',
  },
  {
    calcId: 'ffs-2011',
    description: 'No FFS items in GPA = 0 → low (~9% 5-y mortality)',
    inputs: {
      disease: 'gpa', age65: false, cardiac: false, gi: false, renal: false, entAbsent: false,
    },
    expect: { score: 0, riskLevel: 'low' },
    source: 'Guillevin 2011 — FFS 0 ≈ 9% 5-year mortality.',
  },
  {
    calcId: 'ffs-2011',
    description: 'ENT absent only (MPA) = 1 → moderate',
    inputs: {
      disease: 'mpa', age65: false, cardiac: false, gi: false, renal: false, entAbsent: true,
    },
    expect: { score: 1, riskLevel: 'moderate' },
    source: 'Guillevin 2011 — ENT absence is +1; scored even in MPA so the item remains live.',
  },

  // ── ESSDAI ──────────────────────────────────────────────────────────────
  {
    calcId: 'essdai',
    description: 'Biological moderate (1×2=2) + articular moderate (2×2=4), other domains 0 = 6 → moderate activity',
    inputs: { articular: 2, biological: 2 },
    expect: { score: 6, riskLevel: 'moderate' },
    source: 'Seror R et al. Ann Rheum Dis 2010 — ESSDAI = level × weight. Biological wt 1 × level 2 = 2; articular wt 2 × level 2 = 4; total 6 (moderate 5–13).',
  },
  {
    calcId: 'essdai',
    description: 'All domains no activity = 0 → low',
    inputs: {},
    expect: { score: 0, riskLevel: 'low' },
    source: 'ESSDAI 0 is low activity (<5).',
  },

  // ── ESSPRI ──────────────────────────────────────────────────────────────
  {
    calcId: 'esspri',
    description: 'Dryness 4 + fatigue 6 + pain 5; mean 15/3 = 5.0 → PASS / low',
    inputs: { dryness: 4, fatigue: 6, pain: 5 },
    expect: { score: 5, riskLevel: 'low' },
    source: 'Seror R et al. Ann Rheum Dis 2011 — ESSPRI = mean of 3 VAS. (4+6+5)/3 = 5.0; PASS typically ≤5.',
  },
  {
    calcId: 'esspri',
    description: 'Dryness 8 + fatigue 8 + pain 8; mean = 8.0 → unsatisfactory',
    inputs: { dryness: 8, fatigue: 8, pain: 8 },
    expect: { score: 8, riskLevel: 'high' },
    source: 'ESSPRI mean of three 8s is 8, above PASS.',
  },

  // ── mRSS ────────────────────────────────────────────────────────────────
  {
    calcId: 'mrss',
    description: 'All 17 sites 0 = 0 → mild',
    inputs: {},
    expect: { score: 0, riskLevel: 'low' },
    source: 'Clements P et al. J Rheumatol 1993 — mRSS is the sum of 17 site scores 0–3.',
  },
  {
    calcId: 'mrss',
    description: 'Ten sites scored 2, seven scored 0 = 20 → severe (20–31)',
    inputs: {
      face: 2, chest: 2, abdomen: 2, rFingers: 2, lFingers: 2,
      rHands: 2, lHands: 2, rForearms: 2, lForearms: 2, rUpperArms: 2,
    },
    expect: { score: 20, riskLevel: 'high' },
    source: 'mRSS: 10 × 2 = 20. Educational severe band 20–31.',
  },

  // ── ILD-GAP ─────────────────────────────────────────────────────────────
  {
    calcId: 'ild-gap',
    description: 'Female, age ≤60, FVC >75%, DLCO >55%, CTD-ILD = −2 → stage I',
    inputs: { ildSubtype: 'ctd', sex: 0, ageBand: 0, fvc: 0, dlco: 0 },
    expect: { score: -2, riskLevel: 'low', labelMatches: /stage i/i },
    source: 'Ley B et al. ILD-GAP — CTD-ILD −2, female 0, age ≤60 0, FVC >75 0, DLCO >55 0. Total −2, stage I (≤1).',
  },
  {
    calcId: 'ild-gap',
    description: 'IPF, male, age >65, FVC <50%, DLCO cannot perform = 0+1+2+2+3 = 8 → stage III',
    inputs: { ildSubtype: 'ipf', sex: 1, ageBand: 2, fvc: 2, dlco: 3 },
    expect: { score: 8, riskLevel: 'high' },
    source: 'Ley GAP/ILD-GAP point table. 1+2+2+3 = 8 (IPF subtype 0).',
  },

  // ── PASDAS ──────────────────────────────────────────────────────────────
  {
    calcId: 'pasdas',
    description:
      'All disease-activity zeros, SF-36 PCS 50: [−0.253√50 + 2] × 1.5 = 0.316… → 0.32',
    inputs: { phga: 0, ptga: 0, tjc68: 0, sjc66: 0, lei: 0, dactylitis: 0, crp: 0, sf36pcs: 50 },
    expect: { score: 0.32, tolerance: 0.02, riskLevel: 'normal' },
    source:
      'Helliwell GRACE PASDAS = [0.18√PhGA + 0.159√PtGA − 0.253√PCS + 0.101 ln(SJC+1) + 0.048 ln(TJC+1) + 0.23 ln(LEI+1) + 0.377 ln(dact+1) + 0.102 ln(CRP+1) + 2] × 1.5. √50 ≈ 7.071; 0.253×7.071 ≈ 1.789; (2−1.789)×1.5 ≈ 0.316.',
  },

  // ── MDA / VLDA ──────────────────────────────────────────────────────────
  {
    calcId: 'mda-psa',
    description: 'All 7 criteria at target (zeros) = 7/7 VLDA',
    inputs: { tjc68: 0, sjc66: 0, pasi: 0, bsa: 0, pain: 0, ptga: 0, haq: 0, enthesitis: 0 },
    expect: { score: 7, riskLevel: 'normal', labelMatches: /vlda/i },
    source: 'Coates LC et al. Ann Rheum Dis 2010 — 7/7 criteria = VLDA (van Mens / Coates). TJC≤1, SJC≤1, PASI≤1 or BSA≤3, pain≤15, global≤20, HAQ≤0.5, enthesitis≤1.',
  },
  {
    calcId: 'mda-psa',
    description: 'TJC68 = 10 (fails ≤1), remaining 6 criteria at target = 6/7 MDA (not VLDA)',
    inputs: { tjc68: 10, sjc66: 0, pasi: 0, bsa: 0, pain: 0, ptga: 0, haq: 0, enthesitis: 0 },
    expect: { score: 6, riskLevel: 'low', labelMatches: /mda/i },
    source: 'Coates 2010 MDA: ≥5/7. Six of seven at target is MDA but not VLDA.',
  },
  {
    calcId: 'mda-psa',
    description: 'PASI 4 but BSA 2% still meets the skin criterion (PASI≤1 OR BSA≤3); others at target = 7 VLDA',
    inputs: { tjc68: 0, sjc66: 0, pasi: 4, bsa: 2, pain: 0, ptga: 0, haq: 0, enthesitis: 0 },
    expect: { score: 7, riskLevel: 'normal' },
    source: 'Coates 2010 — skin is PASI ≤1 OR BSA ≤3%. BSA 2% passes even if PASI is 4.',
  },

  // ── BASFI-10 ────────────────────────────────────────────────────────────
  {
    calcId: 'basfi-10',
    description: 'All 10 items = 2 → mean 2.0',
    inputs: { q1: 2, q2: 2, q3: 2, q4: 2, q5: 2, q6: 2, q7: 2, q8: 2, q9: 2, q10: 2 },
    expect: { score: 2, riskLevel: 'low' },
    source: 'Calin A et al. J Rheumatol 1994 — BASFI = mean of 10 items. (10×2)/10 = 2.0.',
  },
  {
    calcId: 'basfi-10',
    description: 'All 10 items = 0 → mean 0.0',
    inputs: { q1: 0, q2: 0, q3: 0, q4: 0, q5: 0, q6: 0, q7: 0, q8: 0, q9: 0, q10: 0 },
    expect: { score: 0, riskLevel: 'low' },
    source: 'BASFI mean of ten zeros is 0.',
  },
  {
    calcId: 'basfi-10',
    description: 'All 10 items = 8 → mean 8.0, severe impairment',
    inputs: { q1: 8, q2: 8, q3: 8, q4: 8, q5: 8, q6: 8, q7: 8, q8: 8, q9: 8, q10: 8 },
    expect: { score: 8, riskLevel: 'high' },
    source: 'BASFI (10×8)/10 = 8, educational severe band ≥7.',
  },

  // ── BASMI ───────────────────────────────────────────────────────────────
  {
    calcId: 'basmi',
    description:
      'Tragus 12 (<15→0) + Schober 5 (>4→0) + cervical 80 (>70→0) + side 12 (>10→0) + IMD 110 (>100→0) = 0',
    inputs: { tragus: 12, schober: 5, cervical: 80, sideFlex: 12, imd: 110 },
    expect: { score: 0, riskLevel: 'low' },
    source: 'Jenkinson TR et al. J Rheumatol 1994 — 2-step BASMI 0/1/2 per measure. All in the 0-point band → 0.',
  },
  {
    calcId: 'basmi',
    description:
      'Tragus 40 (>30→2) + Schober 1 (<2→2) + cervical 10 (<20→2) + side 3 (<5→2) + IMD 50 (<70→2) = 10',
    inputs: { tragus: 40, schober: 1, cervical: 10, sideFlex: 3, imd: 50 },
    expect: { score: 10, riskLevel: 'high' },
    source: '2-step BASMI: each measure in the 2-point band → 10/10.',
  },

  // ── SPARCC ──────────────────────────────────────────────────────────────
  {
    calcId: 'sparcc-enthesitis',
    description: 'Four sites tender (L/R Achilles + L/R plantar) = 4',
    inputs: { achillesL: true, achillesR: true, plantarL: true, plantarR: true },
    expect: { score: 4, riskLevel: 'moderate' },
    source: 'Maksymowych WP et al. Ann Rheum Dis 2009 — SPARCC is 1 point per tender site of 16. 4 sites = 4.',
  },
  {
    calcId: 'sparcc-enthesitis',
    description: 'No tender SPARCC sites = 0',
    inputs: {},
    expect: { score: 0, riskLevel: 'normal' },
    source: 'SPARCC 0 = no tender sites.',
  },
  {
    calcId: 'sparcc-enthesitis',
    description: 'All 16 sites tender = 16',
    inputs: {
      gtL: true, gtR: true, quadL: true, quadR: true, infraL: true, infraR: true,
      achillesL: true, achillesR: true, plantarL: true, plantarR: true,
      medEpiL: true, medEpiR: true, latEpiL: true, latEpiR: true, sspinL: true, sspinR: true,
    },
    expect: { score: 16, riskLevel: 'high' },
    source: 'SPARCC maximum 16 (8 pairs).',
  },
];
