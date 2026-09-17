import { describe, expect, it, vi } from 'vitest';
import { getCalculator } from '../src/data/calculators';
import {
  getInitialFormValues,
  getMissingQuestionnaireInputs,
  incompleteResult,
} from '../src/utils/helpers';

const calculator = getCalculator('caprini');
if (!calculator) throw new Error('Missing caprini calculator');

const surgeryInputs = calculator.inputs.filter(({ id }) =>
  ['minorSurg', 'majorSurg', 'arthroscopic', 'laparoscopic'].includes(id),
);

describe('Caprini surgery categories', () => {
  it('declares the 2005 RAM arthroscopic and laparoscopic 2-point factors', () => {
    expect(surgeryInputs.map(({ id }) => id)).toEqual([
      'minorSurg',
      'majorSurg',
      'arthroscopic',
      'laparoscopic',
    ]);
    expect(calculator.inputs.find(({ id }) => id === 'arthroscopic')).toMatchObject({
      label: 'Arthroscopic surgery (2)',
      options: expect.arrayContaining([{ label: 'Yes', value: true, points: 2 }]),
    });
    expect(calculator.inputs.find(({ id }) => id === 'laparoscopic')).toMatchObject({
      label: 'Laparoscopic surgery >45 min (2)',
      options: expect.arrayContaining([{ label: 'Yes', value: true, points: 2 }]),
    });
  });

  it.each([
    ['minor surgery', { minorSurg: true }, 1],
    ['major open surgery >45 min', { majorSurg: true }, 2],
    ['arthroscopic surgery', { arthroscopic: true }, 2],
    ['laparoscopic surgery >45 min', { laparoscopic: true }, 2],
  ] as const)('scores %s in its intended surgery tier', (_name, values, score) => {
    expect(calculator.calculate(values).score).toBe(score);
  });

  it('does not double-count mutually exclusive surgery categories for one case', () => {
    expect(calculator.calculate({ minorSurg: true, arthroscopic: true }).score).toBe(2);
    expect(calculator.calculate({ majorSurg: true, laparoscopic: true }).score).toBe(2);
    expect(calculator.calculate({ majorSurg: true, arthroscopic: true, laparoscopic: true }).score).toBe(2);
  });

  it('keeps the fresh form unanswered and blocked by the required-input gate', () => {
    const freshValues = getInitialFormValues(calculator);
    expect(freshValues.minorSurg).toBeNull();
    expect(freshValues.majorSurg).toBeNull();
    expect(freshValues.arthroscopic).toBeNull();
    expect(freshValues.laparoscopic).toBeNull();

    const missingIds = getMissingQuestionnaireInputs(calculator, freshValues).map(({ id }) => id);
    expect(missingIds).toEqual(expect.arrayContaining([
      'minorSurg',
      'majorSurg',
      'arthroscopic',
      'laparoscopic',
    ]));

    const calculate = vi.spyOn(calculator, 'calculate');
    const result = missingIds.length > 0 ? incompleteResult(
      getMissingQuestionnaireInputs(calculator, freshValues),
    ) : calculator.calculate(freshValues);
    expect(result).toMatchObject({ score: '—', label: 'Enter all required inputs', riskLevel: 'info' });
    expect(calculate).not.toHaveBeenCalled();
  });
});
