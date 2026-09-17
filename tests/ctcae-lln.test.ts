import { describe, expect, it } from 'vitest';
import { getCalculator } from '../src/data/calculators';
import { getInitialFormValues, getMissingRequiredInputs } from '../src/utils/helpers';

const neutropenia = getCalculator('ctcae-neutropenia');
const thrombocytopenia = getCalculator('ctcae-thrombocytopenia');

if (!neutropenia || !thrombocytopenia) {
  throw new Error('Missing CTCAE neutropenia or thrombocytopenia calculator');
}

describe('CTCAE count-decrease grading with optional LLN', () => {
  it('keeps the measured count required while LLN is optional', () => {
    for (const calculator of [neutropenia, thrombocytopenia]) {
      const countId = calculator.id === 'ctcae-neutropenia' ? 'anc' : 'plt';
      const lln = calculator.inputs.find((input) => input.id === 'lln');
      expect(lln).toMatchObject({ required: false, unit: '×10⁹/L' });
      expect(getMissingRequiredInputs(calculator.inputs, getInitialFormValues(calculator)).map(({ id }) => id)).toEqual([
        countId,
      ]);
    }
  });

  it('uses NCI CTCAE v5.0 absolute ANC boundaries for grades 2–4 without LLN', () => {
    expect(neutropenia.calculate({ anc: 1.49, lln: null }).score).toBe(2);
    expect(neutropenia.calculate({ anc: 1.0, lln: '' }).score).toBe(2);
    expect(neutropenia.calculate({ anc: 0.99, lln: undefined }).score).toBe(3);
    expect(neutropenia.calculate({ anc: 0.5, lln: null }).score).toBe(3);
    expect(neutropenia.calculate({ anc: 0.49, lln: null }).score).toBe(4);
  });

  it('identifies ANC grade 1 only when the entered value is below the supplied LLN', () => {
    expect(neutropenia.calculate({ anc: 1.5, lln: 2.0 })).toMatchObject({ score: 1, label: 'Grade 1 neutropenia' });
    expect(neutropenia.calculate({ anc: 2.0, lln: 2.0 }).score).toBe(0);
    expect(neutropenia.calculate({ anc: 1.8, lln: null })).toMatchObject({
      score: '—',
      label: 'Grade 1 cannot be determined',
      riskLevel: 'info',
    });
  });

  it('uses NCI CTCAE v5.0 absolute platelet boundaries for grades 2–4 without LLN', () => {
    expect(thrombocytopenia.calculate({ plt: 74, lln: null }).score).toBe(2);
    expect(thrombocytopenia.calculate({ plt: 50, lln: '' }).score).toBe(2);
    expect(thrombocytopenia.calculate({ plt: 49, lln: undefined }).score).toBe(3);
    expect(thrombocytopenia.calculate({ plt: 25, lln: null }).score).toBe(3);
    expect(thrombocytopenia.calculate({ plt: 24, lln: null }).score).toBe(4);
  });

  it('identifies platelet grade 1 only when the entered value is below the supplied LLN', () => {
    expect(thrombocytopenia.calculate({ plt: 100, lln: 150 })).toMatchObject({
      score: 1,
      label: 'Grade 1 thrombocytopenia',
    });
    expect(thrombocytopenia.calculate({ plt: 150, lln: 150 }).score).toBe(0);
    expect(thrombocytopenia.calculate({ plt: 90, lln: null })).toMatchObject({
      score: '—',
      label: 'Grade 1 cannot be determined',
      riskLevel: 'info',
    });
  });
});
