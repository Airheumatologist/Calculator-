import { describe, expect, it } from 'vitest';
import { getCalculator } from '../src/data/calculators';
import { getInitialFormValues, getMissingQuestionnaireInputs } from '../src/utils/helpers';

const calculator = getCalculator('pediatric-ett-size');
if (!calculator) throw new Error('Missing calculator pediatric-ett-size');

function result(age: number, tubeType: 'uncuffed' | 'cuffed' = 'uncuffed') {
  return calculator.calculate({ age, tubeType });
}

describe('Pediatric ETT age-formula scope', () => {
  it('does not provide an age-formula size below age 2 and gives alternative guidance', () => {
    for (const age of [1.99, 1.5]) {
      const underTwo = result(age);
      const copy = `${underTwo.label} ${underTwo.interpretation} ${underTwo.recommendations?.join(' ')} ${underTwo.details?.map(({ value }) => value).join(' ')}`;

      expect(underTwo.score).toBe('—');
      expect(underTwo.label).toMatch(/not applicable/i);
      expect(copy).toMatch(/under 2|below 2|<2/i);
      expect(copy).toMatch(/neonatal|infant/i);
      expect(copy).toMatch(/weight|length/i);
    }

    // The gate applies to both tube choices; neither branch may leak a numeric size.
    expect(result(1.99, 'cuffed')).toMatchObject({
      score: '—',
      label: 'Age-based ETT formula not applicable (<2 years)',
      riskLevel: 'info',
    });
  });

  it('keeps the existing equations at the exact age-2 boundary', () => {
    expect(result(2, 'uncuffed')).toMatchObject({
      score: 4.5,
      unit: 'mm ID',
      label: 'Uncuffed ≈ 4.5 mm',
    });
    expect(result(2, 'cuffed')).toMatchObject({
      score: 4,
      unit: 'mm ID',
      label: 'Cuffed ≈ 4 mm',
    });
  });

  it('preserves older boundary calculations', () => {
    expect(result(16, 'uncuffed')).toMatchObject({
      score: 8,
      label: 'Uncuffed ≈ 8 mm',
    });
    expect(result(16, 'cuffed')).toMatchObject({
      score: 7.5,
      label: 'Cuffed ≈ 7.5 mm',
    });
  });

  it('states the age scope in calculator metadata and leaves a fresh form incomplete', () => {
    expect(calculator.description).toMatch(/≥2 years only/i);
    expect(calculator.whenToUse).toMatch(/≥2 years/i);
    expect(calculator.evidence.formula).toMatch(/Age ≥2 years only/i);
    expect(calculator.evidence.formula).toMatch(/Age <2 years.*weight- or length-based guidance/i);
    expect(calculator.evidence.references.some(({ title }) => /Pocket Book.*Hospital Care for Children/i.test(title))).toBe(true);

    const initial = getInitialFormValues(calculator);
    expect(getMissingQuestionnaireInputs(calculator, initial).map(({ id }) => id)).toEqual(['age', 'tubeType']);
  });
});
