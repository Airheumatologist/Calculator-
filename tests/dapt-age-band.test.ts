import { describe, expect, it } from 'vitest';
import { getCalculator } from '../src/data/calculators';
import {
  getInitialFormValues,
  getInvalidSelectValues,
  getMissingRequiredInputs,
  incompleteResult,
  invalidSelectResult,
} from '../src/utils/helpers';

const baseline = {
  smoker: false,
  dm: false,
  miPresentation: false,
  priorPciMi: false,
  stentSmall: false,
  paclitaxel: false,
  chfEf: false,
  veinGraft: false,
};

function dapt() {
  const calc = getCalculator('dapt-score');
  if (!calc) throw new Error('Missing calculator dapt-score');
  return calc;
}

function productionResult(values: Record<string, number | string | boolean | null>) {
  const calc = dapt();
  const missing = getMissingRequiredInputs(calc.inputs, values);
  if (missing.length > 0) return incompleteResult(missing);
  const invalid = getInvalidSelectValues(calc.inputs, values);
  if (invalid.length > 0) return invalidSelectResult(invalid);
  return calc.calculate(values);
}

describe('DAPT age-band requirement and points', () => {
  it('requires ageBand on a fresh form before the production calculator can run', () => {
    const calc = dapt();
    const fresh = getInitialFormValues(calc);

    expect(calc.inputs.find((input) => input.id === 'ageBand')).toMatchObject({
      type: 'select',
      required: true,
    });
    expect(fresh.ageBand).toBeNull();
    expect(getMissingRequiredInputs(calc.inputs, fresh)).toEqual(
      expect.arrayContaining([{ id: 'ageBand', label: 'Age' }]),
    );
    expect(productionResult({ ...fresh, ...baseline })).toMatchObject({
      score: '—',
      label: 'Enter all required inputs',
      riskLevel: 'info',
    });
  });

  it.each([null, undefined, '', 1, -3, '0', Number.NaN])(
    'fails closed when ageBand is %s', (ageBand) => {
      const result = dapt().calculate({ ...baseline, ageBand });

      expect(result).toMatchObject({ score: '—', label: 'Invalid age band', riskLevel: 'info' });
      expect(result.interpretation).toMatch(/No clinical score is available/i);
    },
  );

  it.each([
    { ageBand: -2, label: '≥ 75 years (−2)' },
    { ageBand: -1, label: '65–74 years (−1)' },
    { ageBand: 0, label: '< 65 years (0)' },
  ])('retains the published age points for $label', ({ ageBand, label }) => {
    const calc = dapt();
    const ageInput = calc.inputs.find((input) => input.id === 'ageBand');

    expect(ageInput?.options?.find((option) => option.value === ageBand)?.label).toBe(label);
    expect(calc.calculate({ ...baseline, ageBand })).toMatchObject({
      score: ageBand,
      riskLevel: 'low',
    });
  });

  it('keeps the exact categorical boundary labels', () => {
    const ageInput = dapt().inputs.find((input) => input.id === 'ageBand');
    expect(ageInput?.options?.map((option) => option.label)).toEqual([
      '≥ 75 years (−2)',
      '65–74 years (−1)',
      '< 65 years (0)',
    ]);
  });
});
