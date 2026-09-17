import { describe, expect, it } from 'vitest';
import { getCalculator } from '../src/data/calculators';
import { getInitialFormValues, getMissingQuestionnaireInputs } from '../src/utils/helpers';

const calc = getCalculator('edacs');
if (!calc) throw new Error('Missing edacs calculator');

type Answers = {
  age: number;
  riskCad?: boolean;
  diaphoresis?: boolean;
  radiates?: boolean;
  pleuritic?: boolean;
  reproduced?: boolean;
  sex?: number;
};

function scoreWith({
  age,
  riskCad = false,
  diaphoresis = false,
  radiates = false,
  pleuritic = false,
  reproduced = false,
  sex = 0,
}: Answers): number {
  const result = calc!.calculate({ age, sex, riskCad, diaphoresis, radiates, pleuritic, reproduced });
  if (typeof result.score !== 'number') throw new Error(`Unexpected EDACS score ${result.score}`);
  return result.score;
}

/**
 * P1 leftover: the tracker flagged the +4 term as "still age-gated" and asked
 * for re-verification against the published score. The gate is correct - the
 * published item is "aged 18-50 years and either known CAD or >=3 risk factors"
 * (Than M et al., Emerg Med Australas 2014;26:34-44; the same item list is
 * reproduced in the 2024 review PMC10853047, "Chest Pain Risk Stratification
 * in the Emergency Department: Current Perspectives"). That list has exactly
 * seven items and no heart-rate term, so the "heart rate >=100 (+3)" input a
 * pass-2 agent added was removed.
 */
describe('EDACS published items (P1 leftover)', () => {
  it('gates the +4 "known CAD / >=3 risk factors" term to age 18-50', () => {
    expect(scoreWith({ age: 45, riskCad: true })).toBe(6); // 2 age + 4 risk
    expect(scoreWith({ age: 45, riskCad: false })).toBe(2);
    expect(scoreWith({ age: 50, riskCad: true })).toBe(8); // 4 age + 4 risk
    expect(scoreWith({ age: 51, riskCad: true })).toBe(6); // 6 age, gate excludes
    expect(scoreWith({ age: 70, riskCad: true })).toBe(12); // 12 age, gate excludes
  });

  it('keeps the published 2/5/3/-4/-6 terms and the <16 ADP threshold', () => {
    expect(scoreWith({ age: 45, diaphoresis: true })).toBe(5);
    expect(scoreWith({ age: 45, radiates: true })).toBe(7);
    expect(scoreWith({ age: 45, pleuritic: true })).toBe(-2);
    expect(scoreWith({ age: 45, reproduced: true })).toBe(-4);

    const highRisk = calc!.calculate({
      age: 40,
      sex: 6,
      riskCad: true,
      diaphoresis: true,
      radiates: true,
      pleuritic: false,
      reproduced: false,
    });
    expect(highRisk.score).toBe(20); // 2 age + 6 male + 4 risk + 3 diaphoresis + 5 radiation
    expect(highRisk.label).toBe('Not low-risk (EDACS ≥16)');

    const lowest = calc!.calculate({
      age: 30,
      sex: 0,
      riskCad: false,
      diaphoresis: false,
      radiates: false,
      pleuritic: true,
      reproduced: true,
    });
    expect(lowest.score).toBe(-8); // 2 age - 4 pleuritic - 6 palpation
    expect(lowest.label).toBe('Low-risk EDACS (<16)');
    expect(lowest.interpretation).toContain('troponins are negative');
  });

  it('scores the published item set only, with a reachable range of -8 to 34', () => {
    expect(calc!.inputs.map(({ id }) => id)).toEqual([
      'age',
      'sex',
      'riskCad',
      'diaphoresis',
      'radiates',
      'pleuritic',
      'reproduced',
    ]);

    const scores: number[] = [];
    for (const age of [18, 45, 50, 51, 70, 86, 95]) {
      for (const sex of [0, 6]) {
        for (const riskCad of [false, true]) {
          for (const diaphoresis of [false, true]) {
            for (const radiates of [false, true]) {
              for (const pleuritic of [false, true]) {
                for (const reproduced of [false, true]) {
                  scores.push(scoreWith({ age, sex, riskCad, diaphoresis, radiates, pleuritic, reproduced }));
                }
              }
            }
          }
        }
      }
    }
    expect(Math.min(...scores)).toBe(-8);
    // 20 (age >=86) + 6 (male) + 3 (diaphoresis) + 5 (radiation); the +4 risk
    // term cannot combine with the oldest age bands.
    expect(Math.max(...scores)).toBe(34);
  });

  it('gates the calculator on a fresh form', () => {
    const missing = getMissingQuestionnaireInputs(calc!, getInitialFormValues(calc!)).map(({ id }) => id);
    expect(missing).toContain('age');
    expect(missing).toContain('sex');
    expect(missing).toContain('riskCad');
  });
});
