import { describe, expect, it } from 'vitest';
import { getCalculator } from '../src/data/calculators';
import { getInitialFormValues, getMissingRequiredInputs, incompleteResult } from '../src/utils/helpers';

const calculator = getCalculator('svr-calc');
if (!calculator) throw new Error('Missing svr-calc calculator');

describe('SVR MAP/CVP gradient guard', () => {
  it('fails closed when MAP is below CVP', () => {
    const result = calculator.calculate({ map: 25, cvp: 30, co: 5 });

    expect(result).toMatchObject({
      score: '—',
      unit: 'dyn·s·cm⁻⁵',
      label: 'Invalid MAP/CVP gradient',
      riskLevel: 'info',
    });
    expect(result.interpretation).toMatch(/MAP is below CVP.*negative pressure gradient/i);
    expect(result.interpretation).toMatch(/verify pressure measurements.*leveling.*zeroing/i);
    expect(result.details).toEqual(expect.arrayContaining([
      { label: 'MAP − CVP', value: '-5 mmHg' },
      { label: 'Formula', value: '80 × (MAP − CVP) / CO' },
    ]));
  });

  it('retains a zero-gradient result when MAP equals CVP', () => {
    const result = calculator.calculate({ map: 30, cvp: 30, co: 5 });

    expect(result).toMatchObject({
      score: 0,
      unit: 'dyn·s·cm⁻⁵',
      label: 'Zero MAP−CVP gradient',
      riskLevel: 'info',
    });
    expect(result.interpretation).toMatch(/MAP equals CVP.*zero-gradient SVR of 0/i);
    expect(result.details).toEqual(expect.arrayContaining([
      { label: 'MAP − CVP', value: '0 mmHg' },
    ]));
  });

  it('preserves the SVR formula for a positive pressure gradient', () => {
    const result = calculator.calculate({ map: 70, cvp: 8, co: 5 });

    expect(result).toMatchObject({
      score: 992,
      unit: 'dyn·s·cm⁻⁵',
      label: 'Normal SVR',
    });
    expect(result.details).toEqual(expect.arrayContaining([
      { label: 'SVR (Wood units)', value: '12.4 WU' },
      { label: 'MAP − CVP', value: '62 mmHg' },
    ]));
  });

  it.each([
    ['missing MAP', { cvp: 8, co: 5 }],
    ['missing CVP', { map: 70, co: 5 }],
    ['missing CO', { map: 70, cvp: 8 }],
    ['NaN MAP', { map: Number.NaN, cvp: 8, co: 5 }],
    ['infinite CVP', { map: 70, cvp: Number.POSITIVE_INFINITY, co: 5 }],
    ['zero CO', { map: 70, cvp: 8, co: 0 }],
    ['negative CO', { map: 70, cvp: 8, co: -1 }],
    ['infinite CO', { map: 70, cvp: 8, co: Number.POSITIVE_INFINITY }],
  ])('fails closed for %s', (_name, values) => {
    const result = calculator.calculate(values);

    expect(result).toMatchObject({
      score: '—',
      unit: 'dyn·s·cm⁻⁵',
      label: 'Invalid MAP/CVP/CO input',
      riskLevel: 'info',
    });
    expect(result.interpretation).toMatch(/finite measurements|CO must be > 0/i);
  });

  it('keeps a fresh form blank and blocked by the required-input gate', () => {
    const fresh = getInitialFormValues(calculator);

    expect(fresh).toEqual({ map: null, cvp: null, co: null });
    const missing = getMissingRequiredInputs(calculator.inputs, fresh);
    expect(missing.map(({ id }) => id)).toEqual(['map', 'cvp', 'co']);
    expect(incompleteResult(missing)).toMatchObject({
      score: '—',
      label: 'Enter all required inputs',
      riskLevel: 'info',
    });
  });

  it('documents the pressure-gradient decision and its source', () => {
    expect(calculator.evidence.summary).toMatch(/MAP = CVP.*zero-gradient result.*MAP < CVP.*rejected/i);
    expect(calculator.evidence.formula).toMatch(/MAP − CVP.*CO/);
    expect(calculator.evidence.references).toEqual(expect.arrayContaining([
      expect.objectContaining({
        title: 'Calculating vascular resistances',
        pmid: '9294674',
        doi: '10.1002/clc.4960200918',
      }),
    ]));
  });
});
