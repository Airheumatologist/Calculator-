import type { OracleCase } from './types';

/** Trauma, burns, paediatric, obstetric and haematologic-risk oracle cases. */
export const traumaPedsObOracles: OracleCase[] = [
  // ---------------------------------------------------------------- APGAR
  {
    calcId: 'apgar',
    description: 'Acrocyanosis (1) + HR ≥100 (2) + grimace (1) + some flexion (1) + good cry (2) = 7',
    inputs: { appearance: 1, pulse: 2, grimace: 1, activity: 1, respiration: 2 },
    expect: { score: 7 },
    source: 'Apgar V. Curr Res Anesth Analg 1953;32(4):260-267 — five signs scored 0–2.',
  },
  {
    calcId: 'apgar',
    description: 'Vigorous newborn, all five signs at 2 = 10 (higher is better)',
    inputs: { appearance: 2, pulse: 2, grimace: 2, activity: 2, respiration: 2 },
    expect: { score: 10, riskLevel: 'low' },
    source: 'Apgar V. Curr Res Anesth Analg 1953;32(4):260-267.',
  },
  {
    calcId: 'apgar',
    description: 'No signs present = 0 (requires immediate resuscitation)',
    inputs: { appearance: 0, pulse: 0, grimace: 0, activity: 0, respiration: 0 },
    expect: { score: 0, riskLevel: 'critical' },
    source: 'Apgar V. Curr Res Anesth Analg 1953;32(4):260-267.',
  },

  // ---------------------------------------------------------------- Bishop
  {
    calcId: 'bishop',
    description: 'Dilation 3–4 (2) + effacement 60–70 (2) + station −1/0 (2) + soft (2) + anterior (2) = 10 (favourable)',
    inputs: { dilation: 2, effacement: 2, station: 2, consistency: 2, position: 2 },
    expect: { score: 10 },
    source: 'Bishop EH. Obstet Gynecol 1964;24:266-268 — Bishop score; ≥8 predicts vaginal delivery like spontaneous labour.',
  },
  {
    calcId: 'bishop',
    description: 'Closed, uneffaced, high, firm, posterior cervix = 0 (unfavourable)',
    inputs: { dilation: 0, effacement: 0, station: 0, consistency: 0, position: 0 },
    expect: { score: 0 },
    source: 'Bishop EH. Obstet Gynecol 1964;24:266-268.',
  },

  // ---------------------------------------------------------------- Croup
  {
    calcId: 'westley-croup',
    description: 'Stridor with agitation (1) + mild retractions (1) = 2 (mild croup, ≤2)',
    inputs: { stridor: 1, retract: 1, airEntry: 0, cyanosis: 0, consciousness: 0 },
    expect: { score: 2 },
    source: 'Westley CR et al. Am J Dis Child 1978;132(5):484-487 — Westley croup score.',
  },
  {
    calcId: 'westley-croup',
    description: 'Stridor at rest (2) + severe retractions (3) + markedly decreased air entry (2) + cyanosis with agitation (4) = 11 (severe)',
    inputs: { stridor: 2, retract: 3, airEntry: 2, cyanosis: 4, consciousness: 0 },
    expect: { score: 11 },
    source: 'Westley CR et al. Am J Dis Child 1978;132(5):484-487.',
  },

  // ---------------------------------------------------------------- Burns
  {
    calcId: 'parkland',
    description: 'Parkland = 4 mL × 70 kg × 20% TBSA = 5600 mL in the first 24 h',
    inputs: { weight: 70, tbsa: 20 },
    expect: { score: 5600, tolerance: 1 },
    source: 'Baxter CR, Shires T. Ann N Y Acad Sci 1968;150(3):874-894 — Parkland formula 4 mL/kg/%TBSA lactated Ringer over 24 h.',
  },
  {
    calcId: 'parkland',
    description: 'Parkland = 4 × 50 × 30 = 6000 mL in the first 24 h',
    inputs: { weight: 50, tbsa: 30 },
    expect: { score: 6000, tolerance: 1 },
    source: 'Baxter CR, Shires T. Ann N Y Acad Sci 1968;150(3):874-894.',
  },
  {
    calcId: 'rule-of-nines',
    description: 'Head & neck (9) + anterior trunk (18) + right arm (9) = 36% TBSA',
    inputs: { head: true, antTrunk: true, postTrunk: false, armR: true, armL: false, legR: false, legL: false, perineum: false },
    expect: { score: 36 },
    source: 'Wallace AB. Lancet 1951;1(6653):501-504 — adult rule of nines.',
  },
  {
    calcId: 'rule-of-nines',
    description: 'All regions burned = 9+18+18+9+9+18+18+1 = 100% TBSA',
    inputs: { head: true, antTrunk: true, postTrunk: true, armR: true, armL: true, legR: true, legL: true, perineum: true },
    expect: { score: 100 },
    source: 'Wallace AB. Lancet 1951;1(6653):501-504 — the adult rule of nines sums to 100%.',
  },
  {
    calcId: 'baux-score',
    description: 'Classic Baux = age 40 + TBSA 20 = 60, no inhalation injury',
    inputs: { age: 40, tbsa: 20, inhalation: false },
    expect: { score: 60 },
    source: 'Osler T et al. J Trauma 2010;68(3):690-697 — revised Baux = age + %TBSA + 17 if inhalation injury.',
  },
  {
    calcId: 'baux-score',
    description: 'Revised Baux = 40 + 20 + 17 (inhalation injury) = 77',
    inputs: { age: 40, tbsa: 20, inhalation: true },
    expect: { score: 77 },
    source: 'Osler T et al. J Trauma 2010;68(3):690-697.',
  },
  {
    calcId: 'absi-burn',
    description: 'Female (1) + age 40 → band 21–40 (2) + TBSA 20% → band 11–20 (2), no inhalation or full-thickness = 5',
    inputs: { sex: 1, age: 40, inhalation: false, fullThickness: false, tbsa: 20 },
    expect: { score: 5 },
    source: 'Tobiasen J et al. Ann Emerg Med 1982;11(5):260-262 — ABSI: sex, age decade bands, inhalation, full-thickness, %TBSA in 10% bands.',
  },

  // ---------------------------------------------------------------- Paediatric ortho / ID
  {
    calcId: 'kocher-criteria',
    description: 'Non-weight-bearing + fever >38.5 °C + WBC >12,000 = 3 of 4 classic predictors',
    inputs: { nwb: true, esr40: false, fever: true, wbc12: true, crp: false },
    expect: { score: 3 },
    source: 'Kocher MS et al. J Bone Joint Surg Am 1999;81(12):1662-1670 — four independent predictors.',
  },
  {
    calcId: 'kocher-criteria',
    description: 'All four classic predictors present = 4 (≈99% probability of septic arthritis)',
    inputs: { nwb: true, esr40: true, fever: true, wbc12: true, crp: false },
    expect: { score: 4 },
    source: 'Kocher MS et al. J Bone Joint Surg Am 1999;81(12):1662-1670.',
  },

  // ---------------------------------------------------------------- Cervical spine
  {
    calcId: 'nexus',
    description: 'No NEXUS criteria present = 0 positive criteria (imaging can be safely omitted)',
    inputs: { midline: false, intox: false, ams: false, focal: false, distracting: false },
    expect: { score: 0 },
    source: 'Hoffman JR et al. N Engl J Med 2000;343(2):94-99 — NEXUS low-risk criteria; all five must be absent.',
  },
  {
    calcId: 'nexus',
    description: 'Midline cervical tenderness alone = 1 positive criterion (imaging indicated)',
    inputs: { midline: true, intox: false, ams: false, focal: false, distracting: false },
    expect: { score: 1 },
    source: 'Hoffman JR et al. N Engl J Med 2000;343(2):94-99.',
  },

  // ---------------------------------------------------------------- Thrombosis risk
  {
    calcId: 'wells-hit',
    description: '4Ts: thrombocytopenia 2 + timing 1 + no thrombosis 0 + no other cause 2 = 5 (intermediate, 4–5)',
    inputs: { thrombocytopenia: 2, timing: 1, thrombosis: 0, other: 2 },
    expect: { score: 5 },
    source: 'Lo GK et al. J Thromb Haemost 2006;4(4):759-765 — 4Ts score; 0–3 low, 4–5 intermediate, 6–8 high.',
  },
  {
    calcId: 'wells-hit',
    description: 'All four Ts scored 2 = 8 (high probability, maximum)',
    inputs: { thrombocytopenia: 2, timing: 2, thrombosis: 2, other: 2 },
    expect: { score: 8, riskLevel: 'high' },
    source: 'Lo GK et al. J Thromb Haemost 2006;4(4):759-765.',
  },
  {
    calcId: 'padua',
    description: 'Active cancer (3) + reduced mobility (3) + age ≥70 (1) = 7 (high risk, ≥4)',
    inputs: {
      cancer: true, priorVte: false, reducedMob: true, thrombophilia: false, recentTrauma: false, age70: true,
      heartLung: false, acuteMiStroke: false, infectionRheum: false, obesity: false, hormone: false,
    },
    expect: { score: 7, riskLevel: 'high' },
    source: 'Barbar S et al. J Thromb Haemost 2010;8(11):2450-2457 — Padua Prediction Score; ≥4 = high risk.',
  },
  {
    calcId: 'padua',
    description: 'No Padua risk factors = 0 (low risk)',
    inputs: {
      cancer: false, priorVte: false, reducedMob: false, thrombophilia: false, recentTrauma: false, age70: false,
      heartLung: false, acuteMiStroke: false, infectionRheum: false, obesity: false, hormone: false,
    },
    expect: { score: 0, riskLevel: 'low' },
    source: 'Barbar S et al. J Thromb Haemost 2010;8(11):2450-2457.',
  },
];
