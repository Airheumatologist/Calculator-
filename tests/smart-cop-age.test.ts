import { describe, expect, it } from 'vitest';
import { getCalculator } from '../src/data/calculators';
import {
  getExampleFormValues,
  getInitialFormValues,
  getMissingRequiredInputs,
} from '../src/utils/helpers';

const smartCop = getCalculator('smart-cop');

function values(overrides: Record<string, number | boolean | null> = {}) {
  return {
    age: 40,
    sbp: false,
    multilobar: false,
    albumin: false,
    rr: false,
    hr: false,
    confusion: false,
    oxygen: false,
    ph: false,
    ...overrides,
  };
}

function detail(result: ReturnType<NonNullable<typeof smartCop>['calculate']>, label: string): string {
  return result.details?.find((item) => item.label === label)?.value ?? '';
}

describe('SMART-COP age-adjusted thresholds', () => {
  it('requires age and provides a complete explicit example without pre-filling a fresh form', () => {
    expect(smartCop).toBeDefined();
    if (!smartCop) return;

    const age = smartCop.inputs.find((input) => input.id === 'age');
    expect(age).toMatchObject({
      type: 'number',
      required: true,
      min: 18,
      max: 110,
      step: 1,
      exampleValue: 40,
    });

    const fresh = getInitialFormValues(smartCop);
    expect(fresh.age).toBeNull();
    expect(getMissingRequiredInputs(smartCop.inputs, fresh)).toEqual(
      expect.arrayContaining([{ id: 'age', label: 'Age' }]),
    );

    const example = getExampleFormValues(smartCop);
    expect(getMissingRequiredInputs(smartCop.inputs, example)).toEqual([]);
    expect(example.age).toBe(40);
  });

  it.each([
    {
      age: 49,
      rr: '≥25 breaths/min (age ≤50 years)',
      oxygen: 'PaO₂ <70 mmHg OR SpO₂ ≤93% OR PaO₂/FiO₂ <333',
    },
    {
      age: 50,
      rr: '≥25 breaths/min (age ≤50 years)',
      oxygen: 'PaO₂ <70 mmHg OR SpO₂ ≤93% OR PaO₂/FiO₂ <333',
    },
    {
      age: 51,
      rr: '≥30 breaths/min (age >50 years)',
      oxygen: 'PaO₂ <60 mmHg OR SpO₂ ≤90% OR PaO₂/FiO₂ <250',
    },
  ])('uses the published age band at age $age', ({ age, rr, oxygen }) => {
    if (!smartCop) return;

    const result = smartCop.calculate(values({ age }));
    expect(detail(result, 'Age')).toBe(`${age} years`);
    expect(detail(result, 'RR threshold used')).toBe(rr);
    expect(detail(result, 'Oxygenation threshold used')).toBe(oxygen);
  });

  it('preserves the published weights for criteria that are already assessed', () => {
    if (!smartCop) return;

    const flagged = values({
      sbp: true,
      multilobar: true,
      albumin: true,
      rr: true,
      hr: true,
      confusion: true,
      oxygen: true,
      ph: true,
    });
    const result = smartCop.calculate(flagged);
    expect(result.score).toBe(11);

    const withoutAgeDependentFlags = smartCop.calculate(values({ sbp: true, multilobar: true, albumin: true }));
    expect(withoutAgeDependentFlags.score).toBe(4);
  });

  it('keeps the formula copy synchronized with every age-dependent published cutoff', () => {
    if (!smartCop) return;

    expect(smartCop.evidence.formula).toContain('age ≤50: RR ≥25; age >50: RR ≥30');
    expect(smartCop.evidence.formula).toContain('age ≤50: PaO₂ <70 mmHg OR SpO₂ ≤93% OR PaO₂/FiO₂ <333');
    expect(smartCop.evidence.formula).toContain('age >50: PaO₂ <60 mmHg OR SpO₂ ≤90% OR PaO₂/FiO₂ <250');
  });
});
