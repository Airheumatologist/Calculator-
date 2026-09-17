import { describe, expect, it } from 'vitest';
import { getCalculator } from '../src/data/calculators';
import { getInitialFormValues, getMissingQuestionnaireInputs } from '../src/utils/helpers';

const mdrd = getCalculator('mdrd');
if (!mdrd) throw new Error('Missing MDRD calculator');

describe('MDRD race-free legacy equation', () => {
  it('exposes only the serum creatinine, age, and sex inputs', () => {
    expect(mdrd.inputs.map((input) => input.id)).toEqual(['scr', 'age', 'sex']);
    expect(mdrd.inputs.some((input) => input.id === 'race')).toBe(false);
  });

  it('matches the IDMS 175 formula for male and female cases', () => {
    expect(mdrd.calculate({ scr: 1, age: 50, sex: 1 }).score).toBe(79);
    expect(mdrd.calculate({ scr: 1, age: 50, sex: 0.742 }).score).toBe(59);
    expect(mdrd.calculate({ scr: 2, age: 65, sex: 1 }).score).toBe(34);
    expect(mdrd.calculate({ scr: 2, age: 65, sex: 0.742 }).score).toBe(25);
  });

  it('ignores an extraneous race value', () => {
    const withoutRace = mdrd.calculate({ scr: 1, age: 50, sex: 1 });
    const withLegacyRace = mdrd.calculate({ scr: 1, age: 50, sex: 1, race: 1.212 });
    expect(withLegacyRace).toEqual(withoutRace);
  });

  it('keeps the legacy status and removes the obsolete race multiplier from copy', () => {
    expect(mdrd.status).toBe('legacy');
    expect(mdrd.supersededBy).toBe('ckd-epi');
    expect(JSON.stringify(mdrd)).not.toMatch(/1\.212|Black/);
  });

  it('blocks a fresh form until all declared required inputs are entered', () => {
    const freshValues = getInitialFormValues(mdrd);
    expect(getMissingQuestionnaireInputs(mdrd, freshValues).map(({ id }) => id)).toEqual(['scr', 'age', 'sex']);
  });
});
