import { describe, expect, it } from 'vitest';
import { getCalculator } from '../src/data/calculators';
import { getInitialFormValues, getMissingRequiredInputs } from '../src/utils/helpers';

const calculator = getCalculator('buprenorphine-cows');
if (!calculator) throw new Error('Missing buprenorphine-cows calculator');

const noGuidance = /(?:ready|induction|dose|mg)/i;

describe('Buprenorphine COWS required-input guard', () => {
  it('keeps a fresh form blank and returns no readiness or dosing guidance', () => {
    const fresh = getInitialFormValues(calculator);

    expect(fresh).toEqual({ cows: null, last_opioid: null, prior_precip: null });
    expect(getMissingRequiredInputs(calculator.inputs, fresh).map(({ id }) => id)).toEqual([
      'cows',
      'last_opioid',
      'prior_precip',
    ]);

    const result = calculator.calculate(fresh);
    expect(result).toMatchObject({ score: '—', unit: 'COWS', label: 'Enter all required inputs', riskLevel: 'info' });
    expect(result.interpretation).not.toMatch(noGuidance);
    expect(result.recommendations).toBeUndefined();
  });

  it.each([
    ['COWS only', { cows: 10 }],
    ['COWS and opioid context', { cows: 10, last_opioid: 'short' }],
    ['COWS and history', { cows: 10, prior_precip: false }],
    ['opioid context and history', { last_opioid: 'short', prior_precip: false }],
  ])('fails closed for partial inputs: %s', (_name, values) => {
    const result = calculator.calculate(values);

    expect(result.score).toBe('—');
    expect(result.riskLevel).toBe('info');
    expect(result.interpretation).not.toMatch(noGuidance);
    expect(result.recommendations).toBeUndefined();
  });

  it('treats zero COWS and an explicit negative history as valid answers', () => {
    const result = calculator.calculate({ cows: 0, last_opioid: 'short', prior_precip: false });

    expect(result).toMatchObject({
      score: 0,
      unit: 'COWS',
      label: 'Minimal withdrawal — induction premature (traditional)',
    });
  });

  it.each([
    ['out-of-range COWS', { cows: 49, last_opioid: 'short', prior_precip: false }],
    ['unknown opioid context', { cows: 10, last_opioid: 'unknown', prior_precip: false }],
    ['non-boolean history', { cows: 10, last_opioid: 'short', prior_precip: 'not-entered' }],
  ])('fails closed for malformed direct values: %s', (_name, values) => {
    const result = calculator.calculate(values);

    expect(result).toMatchObject({ score: '—', unit: 'COWS', label: 'Invalid input', riskLevel: 'info' });
    expect(result.interpretation).not.toMatch(noGuidance);
    expect(result.recommendations).toBeUndefined();
  });

  it('preserves the complete valid score without inferring omitted context', () => {
    const result = calculator.calculate({ cows: 10, last_opioid: 'short', prior_precip: false });

    expect(result.score).toBe(10);
    expect(result.label).toBe('Mild–moderate — often ready for traditional induction');
    expect(result.interpretation).toMatch(/COWS 10/);
  });

  it('cites official SAMHSA induction guidance', () => {
    expect(calculator.evidence.references).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: expect.stringMatching(/TIP 63/i),
          url: expect.stringMatching(/samhsa\.gov/i),
        }),
      ]),
    );
  });
});
