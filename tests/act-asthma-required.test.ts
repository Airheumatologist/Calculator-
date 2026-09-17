import { describe, expect, it } from 'vitest';
import { getCalculator } from '../src/data/calculators';
import {
  getInitialFormValues,
  getMissingQuestionnaireInputs,
} from '../src/utils/helpers';

const calculator = getCalculator('act-asthma');
if (!calculator) throw new Error('Missing ACT asthma calculator');

function survey(answer: number) {
  return {
    entryMode: 'survey' as const,
    act_q1: answer,
    act_q2: answer,
    act_q3: answer,
    act_q4: answer,
    act_q5: answer,
  };
}

describe('Asthma Control Test required-input guard', () => {
  it('blocks fresh, partial, and legacy direct-fallback calls', () => {
    const fresh = getInitialFormValues(calculator);
    const missing = getMissingQuestionnaireInputs(calculator, fresh);

    expect(missing.map(({ id }) => id)).toEqual([
      'entryMode',
      'act_q1',
      'act_q2',
      'act_q3',
      'act_q4',
      'act_q5',
    ]);
    expect(calculator.calculate(fresh)).toMatchObject({
      score: '—',
      label: 'Incomplete ACT',
      riskLevel: 'info',
    });
    expect(calculator.calculate({ entryMode: 'survey', act_q1: 1, total: 18 })).toMatchObject({
      score: '—',
      label: 'Incomplete ACT',
      riskLevel: 'info',
    });
    expect(calculator.calculate({ total: 18 })).toMatchObject({
      score: '—',
      label: 'Incomplete ACT',
      riskLevel: 'info',
    });
    expect(calculator.calculate({ entryMode: 'direct' })).toMatchObject({
      score: '—',
      label: 'Incomplete ACT',
      riskLevel: 'info',
    });
  });

  it('accepts explicitly entered minimum item values and preserves the 5–25 bands', () => {
    const minimum = calculator.calculate(survey(1));
    expect(minimum).toMatchObject({
      score: 5,
      unit: '/25',
      label: 'Very poorly controlled (≤15)',
      riskLevel: 'high',
    });

    const maximum = calculator.calculate(survey(5));
    expect(maximum).toMatchObject({
      score: 25,
      unit: '/25',
      label: 'Total control (25)',
      riskLevel: 'normal',
    });

    expect(calculator.calculate({ ...survey(4), act_q1: 5 })).toMatchObject({
      score: 21,
      label: 'Well controlled (20–24)',
      riskLevel: 'low',
    });
  });

  it('requires an explicit valid direct total and rejects zero or out-of-range responses', () => {
    expect(calculator.calculate({ entryMode: 'direct', total: 5 })).toMatchObject({
      score: 5,
      label: 'Very poorly controlled (≤15)',
    });
    expect(calculator.calculate({ entryMode: 'direct', total: 25 })).toMatchObject({
      score: 25,
      label: 'Total control (25)',
    });
    expect(calculator.calculate({ ...survey(1), act_q3: 0 })).toMatchObject({
      score: '—',
      label: 'Invalid ACT response',
      riskLevel: 'info',
    });
    expect(calculator.calculate({ entryMode: 'direct', total: 0 })).toMatchObject({
      score: '—',
      label: 'Invalid ACT total',
      riskLevel: 'info',
    });
  });
});
