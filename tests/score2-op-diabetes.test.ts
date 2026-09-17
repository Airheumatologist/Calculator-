import { describe, expect, it } from 'vitest';
import { getCalculator } from '../src/data/calculators';
import { getExampleFormValues, getInitialFormValues, getMissingQuestionnaireInputs } from '../src/utils/helpers';

const calculator = getCalculator('score2-op');
if (!calculator) throw new Error('Missing score2-op calculator');

function profile(age: number, sex: 'male' | 'female', diabetes: boolean) {
  return {
    age,
    sex,
    smoker: false,
    diabetes,
    sbp: 140,
    nonhdl: 4,
    hdl: 1.4,
    region: 'mod',
  };
}

describe('SCORE2-OP diabetes predictor', () => {
  it('declares diabetes as a required boolean and gates it on a fresh form', () => {
    const diabetesInput = calculator.inputs.find(({ id }) => id === 'diabetes');
    expect(diabetesInput).toMatchObject({
      id: 'diabetes',
      type: 'boolean',
      required: true,
      exampleValue: false,
    });

    const missing = getMissingQuestionnaireInputs(calculator, getInitialFormValues(calculator));
    expect(missing.map(({ id }) => id)).toContain('diabetes');
  });

  it('keeps the explicit example complete once categorical fields are supplied', () => {
    const exampleValues = getExampleFormValues(calculator);
    expect(exampleValues.diabetes).toBe(false);

    const completedExample = {
      ...exampleValues,
      sex: 'male',
      smoker: false,
      region: 'mod',
    };
    expect(getMissingQuestionnaireInputs(calculator, completedExample)).toEqual([]);
    expect(calculator.calculate(completedExample).score).toBe(16.3);
  });

  it.each([
    ['male', 70, false, 11.2],
    ['male', 70, true, 19.4],
    ['male', 73, false, 14.0],
    ['male', 73, true, 22.7],
    ['male', 89, false, 42.0],
    ['male', 89, true, 47.9],
    ['female', 70, false, 8.0],
    ['female', 70, true, 15.5],
    ['female', 73, false, 10.4],
    ['female', 73, true, 19.2],
    ['female', 89, false, 38.0],
    ['female', 89, true, 53.6],
  ] as const)('%s age %i diabetes=%s follows the published model', (sex, age, diabetes, expected) => {
    expect(calculator.calculate(profile(age, sex, diabetes)).score).toBe(expected);
  });
});
