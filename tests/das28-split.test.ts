import { describe, expect, it } from 'vitest';
import { getCalculator } from '../src/data/calculators';
import {
  getActiveQuestionnaireInputs,
  getExampleFormValues,
  getInitialFormValues,
  getMissingQuestionnaireInputs,
} from '../src/utils/helpers';

const calculator = getCalculator('das28');
if (!calculator) throw new Error('Missing DAS28 calculator');

const baseValues = {
  tjc: 4,
  sjc: 2,
  pga: 30,
};

describe('DAS28 ESR/CRP pathway split', () => {
  it('requires a variant and gates only the selected laboratory input', () => {
    const fresh = getInitialFormValues(calculator);
    expect(getMissingQuestionnaireInputs(calculator, fresh).map(({ id }) => id)).toContain('variant');

    const esrValues = { ...baseValues, variant: 'esr' as const, esr: 20, crp: null };
    expect(getActiveQuestionnaireInputs(calculator, esrValues).map(({ id }) => id)).toEqual([
      'tjc',
      'sjc',
      'esr',
      'pga',
    ]);
    expect(getMissingQuestionnaireInputs(calculator, esrValues)).toEqual([]);

    const crpValues = { ...baseValues, variant: 'crp' as const, esr: null, crp: 20 };
    expect(getActiveQuestionnaireInputs(calculator, crpValues).map(({ id }) => id)).toEqual([
      'tjc',
      'sjc',
      'crp',
      'pga',
    ]);
    expect(getMissingQuestionnaireInputs(calculator, crpValues)).toEqual([]);
  });

  it('loads a complete ESR example while keeping the inactive CRP branch non-blocking', () => {
    const example = getExampleFormValues(calculator);
    expect(example.variant).toBe('esr');
    expect(getMissingQuestionnaireInputs(calculator, { ...example, crp: null })).toEqual([]);
  });

  it('uses the validated DAS28-ESR equation and labels the selected variant', () => {
    const result = calculator.calculate({ ...baseValues, variant: 'esr', esr: 20, crp: null });
    const expected =
      0.56 * Math.sqrt(4) + 0.28 * Math.sqrt(2) + 0.7 * Math.log(20) + 0.014 * 30;

    expect(result.score).toBe(Math.round(expected * 100) / 100);
    expect(result.label).toMatch(/^DAS28-ESR /);
    expect(result.interpretation).toContain('DAS28-ESR');
    expect(result.details).toContainEqual({ label: 'ESR', value: '20 mm/h' });
    expect(result.details?.find(({ label }) => label === 'DAS28-ESR formula')?.value).toContain('ln(ESR)');
  });

  it('uses the validated DAS28-CRP equation and labels the selected variant', () => {
    const result = calculator.calculate({ ...baseValues, variant: 'crp', esr: null, crp: 20 });
    const expected =
      0.56 * Math.sqrt(4) + 0.28 * Math.sqrt(2) + 0.36 * Math.log(20 + 1) + 0.014 * 30 + 0.96;

    expect(result.score).toBe(Math.round(expected * 100) / 100);
    expect(result.label).toMatch(/^DAS28-CRP /);
    expect(result.interpretation).toContain('DAS28-CRP');
    expect(result.details).toContainEqual({ label: 'CRP', value: '20 mg/L' });
    expect(result.details?.find(({ label }) => label === 'DAS28-CRP formula')?.value).toContain('ln(CRP+1)');
  });

  it('returns safe informational results for an invalid logarithm input', () => {
    const esrZero = calculator.calculate({ ...baseValues, variant: 'esr', esr: 0, crp: null });
    expect(esrZero).toMatchObject({ score: '—', riskLevel: 'info' });
    expect(esrZero.label).toMatch(/DAS28-ESR.*valid ESR/i);

    const crpNegative = calculator.calculate({ ...baseValues, variant: 'crp', esr: null, crp: -1 });
    expect(crpNegative).toMatchObject({ score: '—', riskLevel: 'info' });
    expect(crpNegative.label).toMatch(/DAS28-CRP.*valid CRP/i);

    const esrText = calculator.calculate({ ...baseValues, variant: 'esr', esr: 'not-a-number', crp: null });
    expect(esrText).toMatchObject({ score: '—', riskLevel: 'info' });
  });

  it('does not silently choose ESR when the required mode is absent', () => {
    const result = calculator.calculate({ ...baseValues, variant: null, esr: 20, crp: 20 });
    expect(result).toMatchObject({ score: '—', riskLevel: 'info' });
    expect(result.label).toBe('Select a DAS28 variant');
  });
});
