import { describe, expect, it } from 'vitest';
import { getCalculator } from '../src/data/calculators';
import {
  getInitialFormValues,
  getMissingRequiredInputs,
  incompleteResult,
} from '../src/utils/helpers';

const calculator = getCalculator('qtc-hodges');
if (!calculator) throw new Error('Missing qtc-hodges calculator');

describe('Hodges QTc input guard', () => {
  it.each([
    ['missing QT', { hr: 70 }],
    ['missing heart rate', { qt: 400 }],
    ['blank QT', { qt: '', hr: 70 }],
    ['blank heart rate', { qt: 400, hr: '' }],
    ['non-numeric QT', { qt: 'not-a-number', hr: 70 }],
    ['non-numeric heart rate', { qt: 400, hr: 'not-a-number' }],
    ['NaN QT', { qt: Number.NaN, hr: 70 }],
    ['infinite QT', { qt: Number.POSITIVE_INFINITY, hr: 70 }],
    ['NaN heart rate', { qt: 400, hr: Number.NaN }],
    ['infinite heart rate', { qt: 400, hr: Number.POSITIVE_INFINITY }],
    ['zero QT', { qt: 0, hr: 70 }],
    ['negative QT', { qt: -1, hr: 70 }],
    ['zero heart rate', { qt: 400, hr: 0 }],
    ['negative heart rate', { qt: 400, hr: -1 }],
    ['QT below declared adult range', { qt: 199, hr: 70 }],
    ['QT above declared adult range', { qt: 801, hr: 70 }],
    ['heart rate below declared adult range', { qt: 400, hr: 29 }],
    ['heart rate above declared adult range', { qt: 400, hr: 221 }],
  ])('fails closed for %s', (_name, values) => {
    const result = calculator.calculate(values);

    expect(result).toMatchObject({
      score: '—',
      unit: 'ms',
      label: 'Invalid QT/HR input',
      riskLevel: 'info',
    });
    expect(result.interpretation).toMatch(/No QTc is available/i);
  });

  it('preserves the published Hodges formula for valid reference inputs', () => {
    expect(calculator.calculate({ qt: 400, hr: 60 })).toMatchObject({
      score: 400,
      unit: 'ms',
      label: 'Normal QTc',
    });
    expect(calculator.calculate({ qt: 420, hr: 80 }).score).toBe(455);
  });

  it('accepts both endpoints of the declared QT and heart-rate ranges', () => {
    expect(calculator.calculate({ qt: 200, hr: 30 }).score).toBe(148);
    expect(calculator.calculate({ qt: 800, hr: 220 }).score).toBe(1080);
  });

  it('keeps a fresh form blank and incomplete until both inputs are entered', () => {
    const fresh = getInitialFormValues(calculator);

    expect(fresh).toEqual({ qt: null, hr: null });
    expect(calculator.inputs.every((input) => input.defaultValue === undefined)).toBe(true);

    const missing = getMissingRequiredInputs(calculator.inputs, fresh);
    expect(missing.map(({ id }) => id)).toEqual(['qt', 'hr']);
    expect(incompleteResult(missing)).toMatchObject({
      score: '—',
      label: 'Enter all required inputs',
      riskLevel: 'info',
    });
  });

  it('states the adult scope, guarded range, and ECG measurement limitations in copy', () => {
    expect(calculator.description).toMatch(/adult ECG/i);
    expect(calculator.whyUse).toMatch(/fails closed/i);
    expect(calculator.evidence.summary).toMatch(/finite QT 200–800 ms and HR 30–220 bpm/i);
    expect(`${calculator.whenToUse} ${calculator.inputs.map((input) => input.helpText).join(' ')}`).toMatch(
      /marked RR variability|unreliable T-wave end/i,
    );
    expect(calculator.evidence.references).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          pmid: '19228821',
          doi: '10.1161/CIRCULATIONAHA.108.191096',
        }),
      ]),
    );
  });
});
