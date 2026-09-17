import { describe, expect, it } from 'vitest';
import { getCalculator } from '../src/data/calculators';
import { getInitialFormValues, getMissingQuestionnaireInputs } from '../src/utils/helpers';

const calculator = getCalculator('cholinergic-tox');
if (!calculator) throw new Error('Missing cholinergic-tox calculator');

describe('Cholinergic toxidrome GI/emesis grouping', () => {
  it('counts GI upset and emesis as one overlapping feature', () => {
    const giOnly = calculator.calculate({ gi: true });
    const emesisOnly = calculator.calculate({ emesis: true });
    const both = calculator.calculate({ gi: true, emesis: true });
    const giAndDiarrhea = calculator.calculate({ gi: true, diarrhea: true });

    expect(giOnly.score).toBe(1);
    expect(emesisOnly.score).toBe(1);
    expect(both.score).toBe(1);
    expect(giAndDiarrhea.score).toBe(2);
    expect(both.details).toContainEqual({
      label: 'GI upset / emesis (one feature)',
      value: 'Both selected — counted once',
    });
  });

  it('keeps distinct manifestations additive and reports the ten-feature maximum', () => {
    const result = calculator.calculate({
      salivation: true,
      lacrimation: true,
      urination: true,
      diarrhea: true,
      gi: true,
      emesis: true,
      bronchorrhea: true,
      bradycardia: true,
      miosis: true,
      muscle: true,
      ams: true,
    });

    expect(result.score).toBe(10);
    expect(result.label).toBe('Strong cholinergic toxidrome (6–10)');
    expect(result.details).toContainEqual({ label: 'Distinct feature count', value: '10 / 10' });
  });

  it('leaves every required field unanswered and blocked on a fresh form', () => {
    const freshValues = getInitialFormValues(calculator);
    expect(freshValues).toEqual(Object.fromEntries(calculator.inputs.map(({ id }) => [id, null])));

    const missing = getMissingQuestionnaireInputs(calculator, freshValues);
    expect(missing.map(({ id }) => id)).toEqual(calculator.inputs.map(({ id }) => id));
  });
});
