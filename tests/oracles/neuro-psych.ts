import type { OracleCase } from './types';

/** Neurology and psychiatry oracle cases. */
export const neuroPsychOracles: OracleCase[] = [
  // ---------------------------------------------------------------- GCS
  {
    calcId: 'gcs',
    description: 'Eye to speech (3) + confused (4) + localizes pain (5) = 12',
    inputs: { eye: 3, verbal: 4, motor: 5 },
    expect: { score: 12 },
    source: 'Teasdale G, Jennett B. Lancet 1974;2(7872):81-84 — GCS = eye (1–4) + verbal (1–5) + motor (1–6).',
  },
  {
    calcId: 'gcs',
    description: 'Fully alert and oriented = 15 (maximum; higher is better)',
    inputs: { eye: 4, verbal: 5, motor: 6 },
    expect: { score: 15, riskLevel: 'low' },
    source: 'Teasdale G, Jennett B. Lancet 1974;2(7872):81-84.',
  },
  {
    calcId: 'gcs',
    description: 'No response in any domain = 3 (minimum possible GCS, not 0)',
    inputs: { eye: 1, verbal: 1, motor: 1 },
    expect: { score: 3, riskLevel: 'critical' },
    source: 'Teasdale G, Jennett B. Lancet 1974;2(7872):81-84 — the scale floor is 3.',
  },

  // ---------------------------------------------------------------- NIHSS
  {
    calcId: 'nihss',
    description: 'LOC 1 + gaze 1 + facial palsy 2 + left arm 3 + language 1 = 8',
    inputs: {
      loc: 1, locQ: 0, locC: 0, gaze: 1, visual: 0, facial: 2, armL: 3, armR: 0, legL: 0, legR: 0,
      ataxia: 0, sensory: 0, language: 1, dysarthria: 0, extinction: 0,
    },
    expect: { score: 8 },
    source: 'Brott T et al. Stroke 1989;20(7):864-870 — NIHSS item sum.',
  },
  {
    calcId: 'nihss',
    description: 'Normal neurological examination = 0',
    inputs: {
      loc: 0, locQ: 0, locC: 0, gaze: 0, visual: 0, facial: 0, armL: 0, armR: 0, legL: 0, legR: 0,
      ataxia: 0, sensory: 0, language: 0, dysarthria: 0, extinction: 0,
    },
    expect: { score: 0 },
    source: 'Brott T et al. Stroke 1989;20(7):864-870.',
  },
  {
    calcId: 'nihss',
    description: 'Every item at its declared maximum = 3+2+2+2+3+3+4+4+4+4+2+2+3+2+2 = 42 (scale maximum)',
    inputs: {
      loc: 3, locQ: 2, locC: 2, gaze: 2, visual: 3, facial: 3, armL: 4, armR: 4, legL: 4, legR: 4,
      ataxia: 2, sensory: 2, language: 3, dysarthria: 2, extinction: 2,
    },
    expect: { score: 42 },
    source: 'Brott T et al. Stroke 1989;20(7):864-870 — NIHSS maximum is 42.',
  },

  // ---------------------------------------------------------------- ABCD2
  {
    calcId: 'abcd2',
    description: 'Age ≥60 (1) + BP ≥140/90 (1) + unilateral weakness (2) + ≥60 min (2) + diabetes (1) = 7 (maximum)',
    inputs: { age: true, bp: true, clinical: 2, duration: 2, dm: true },
    expect: { score: 7, riskLevel: 'high' },
    source: 'Johnston SC et al. Lancet 2007;369(9558):283-292 — ABCD², maximum 7; 6–7 = high risk.',
  },
  {
    calcId: 'abcd2',
    description: 'BP ≥140/90 (1) + speech disturbance without weakness (1) + 10–59 min (1) = 3 (low risk band 0–3)',
    inputs: { age: false, bp: true, clinical: 1, duration: 1, dm: false },
    expect: { score: 3, riskLevel: 'low' },
    source: 'Johnston SC et al. Lancet 2007;369(9558):283-292.',
  },

  // ---------------------------------------------------------------- PHQ / GAD
  {
    calcId: 'phq9',
    description: 'All nine items scored 2 = 18 (moderately severe band 15–19)',
    inputs: { q1: 2, q2: 2, q3: 2, q4: 2, q5: 2, q6: 2, q7: 2, q8: 2, q9: 2 },
    expect: { score: 18 },
    source: 'Kroenke K et al. J Gen Intern Med 2001;16(9):606-613 — PHQ-9 severity bands 0-4/5-9/10-14/15-19/20-27.',
  },
  {
    calcId: 'phq9',
    description: '1+2+1+2+0+1+1+0+0 = 8 (mild band 5–9)',
    inputs: { q1: 1, q2: 2, q3: 1, q4: 2, q5: 0, q6: 1, q7: 1, q8: 0, q9: 0 },
    expect: { score: 8 },
    source: 'Kroenke K et al. J Gen Intern Med 2001;16(9):606-613.',
  },
  {
    calcId: 'phq9',
    description: 'All nine items at 3 = 27 (maximum)',
    inputs: { q1: 3, q2: 3, q3: 3, q4: 3, q5: 3, q6: 3, q7: 3, q8: 3, q9: 3 },
    expect: { score: 27 },
    source: 'Kroenke K et al. J Gen Intern Med 2001;16(9):606-613 — PHQ-9 maximum is 27.',
  },
  {
    calcId: 'phq2',
    description: '2 + 2 = 4 (≥3 is a positive screen)',
    inputs: { q1: 2, q2: 2 },
    expect: { score: 4 },
    source: 'Kroenke K et al. Med Care 2003;41(11):1284-1292 — PHQ-2 cut point ≥3.',
  },
  {
    calcId: 'gad7',
    description: 'All seven items scored 2 = 14 (moderate band 10–14)',
    inputs: { q1: 2, q2: 2, q3: 2, q4: 2, q5: 2, q6: 2, q7: 2 },
    expect: { score: 14 },
    source: 'Spitzer RL et al. Arch Intern Med 2006;166(10):1092-1097 — GAD-7 bands 0-4/5-9/10-14/15-21.',
  },
  {
    calcId: 'gad7',
    description: 'All seven items at 3 = 21 (maximum, severe)',
    inputs: { q1: 3, q2: 3, q3: 3, q4: 3, q5: 3, q6: 3, q7: 3 },
    expect: { score: 21 },
    source: 'Spitzer RL et al. Arch Intern Med 2006;166(10):1092-1097.',
  },

  // ---------------------------------------------------------------- Substance use
  {
    calcId: 'ciwa',
    description: 'Nausea 2 + tremor 3 + sweats 2 + anxiety 2 + agitation 1 + headache 2 = 12',
    inputs: { nausea: 2, tremor: 3, sweats: 2, anxiety: 2, agitation: 1, tactile: 0, auditory: 0, visual: 0, headache: 2, orientation: 0 },
    expect: { score: 12 },
    source: 'Sullivan JT et al. Br J Addict 1989;84(11):1353-1357 — CIWA-Ar, nine 0–7 items plus a 0–4 orientation item.',
  },
  {
    calcId: 'ciwa',
    description: 'No withdrawal features = 0',
    inputs: { nausea: 0, tremor: 0, sweats: 0, anxiety: 0, agitation: 0, tactile: 0, auditory: 0, visual: 0, headache: 0, orientation: 0 },
    expect: { score: 0 },
    source: 'Sullivan JT et al. Br J Addict 1989;84(11):1353-1357.',
  },
  {
    calcId: 'ciwa',
    description: 'All nine 0–7 items at 7 plus orientation 4 = 63 + 4 = 67 (scale maximum)',
    inputs: { nausea: 7, tremor: 7, sweats: 7, anxiety: 7, agitation: 7, tactile: 7, auditory: 7, visual: 7, headache: 7, orientation: 4 },
    expect: { score: 67 },
    source: 'Sullivan JT et al. Br J Addict 1989;84(11):1353-1357 — CIWA-Ar maximum is 67.',
  },
  {
    calcId: 'audit-c',
    description: '2–3 times/week (3) + 5–6 drinks (2) + binge less than monthly (1) = 6',
    inputs: { q1: 3, q2: 2, q3: 1, sex: 'male' },
    expect: { score: 6 },
    source: 'Bush K et al. Arch Intern Med 1998;158(16):1789-1795 — AUDIT-C, three 0–4 items; ≥4 positive in men.',
  },
  {
    calcId: 'audit-c',
    description: 'Never drinks = 0',
    inputs: { q1: 0, q2: 0, q3: 0, sex: 'female' },
    expect: { score: 0 },
    source: 'Bush K et al. Arch Intern Med 1998;158(16):1789-1795.',
  },
  {
    calcId: 'cage',
    description: 'Cut down + guilty = 2 of 4 (≥2 is a positive screen)',
    inputs: { c: true, a: false, g: true, e: false },
    expect: { score: 2 },
    source: 'Ewing JA. JAMA 1984;252(14):1905-1907 — CAGE, ≥2 affirmative answers is clinically significant.',
  },
];
