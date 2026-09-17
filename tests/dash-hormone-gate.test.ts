import { describe, expect, it } from 'vitest';
import { getCalculator } from '../src/data/calculators';
import { getInitialFormValues, getMissingRequiredInputs } from '../src/utils/helpers';

const dash = getCalculator('dash-score-vte');
if (!dash) throw new Error('Missing dash-score-vte calculator');

const baseValues = {
  ddimerPos: false,
  age50orLess: false,
  sex: 'F',
  hormone: false,
};

describe('DASH hormone applicability gate', () => {
  it('requires explicit sex and hormone applicability on a fresh form', () => {
    const sex = dash.inputs.find((input) => input.id === 'sex');
    const hormone = dash.inputs.find((input) => input.id === 'hormone');

    expect(sex).toMatchObject({ id: 'sex', type: 'select', required: true });
    expect(sex?.options?.map((option) => option.value)).toEqual(['F', 'M']);
    expect(hormone).toMatchObject({ id: 'hormone', type: 'boolean', required: true });
    expect(hormone?.label).toMatch(/women only/i);

    const fresh = getInitialFormValues(dash);
    expect(fresh.sex).toBeNull();
    expect(fresh.hormone).toBeNull();
    expect(getMissingRequiredInputs(dash.inputs, fresh).map(({ id }) => id)).toEqual(
      expect.arrayContaining(['sex', 'hormone']),
    );
  });

  it('applies the published −2 hormone-associated VTE deduction for women', () => {
    const result = dash.calculate({ ...baseValues, sex: 'F', hormone: true });

    expect(result.score).toBe(-2);
    expect(result.details?.find(({ label }) => label === 'Points')?.value).toMatch(/hormone Yes \(−2\)/);
  });

  it('does not deduct hormone points for a male profile', () => {
    const result = dash.calculate({ ...baseValues, sex: 'M', hormone: true });

    expect(result.score).toBe(1);
    expect(result.details?.find(({ label }) => label === 'Points')?.value).toMatch(/Male \(\+1\)/);
    expect(result.details?.find(({ label }) => label === 'Points')?.value).toMatch(/Not applicable for male profile/);
    expect(result.interpretation).toMatch(/not applicable to a male profile/i);
    expect(result.alerts?.join(' ')).toMatch(/no −2 deduction/i);
  });

  it('keeps female non-hormone scoring at zero when no other predictors are present', () => {
    const result = dash.calculate({ ...baseValues, sex: 'F', hormone: false });

    expect(result.score).toBe(0);
    expect(result.details?.find(({ label }) => label === 'Points')?.value).toMatch(/hormone No \(0\)/);
  });
});
