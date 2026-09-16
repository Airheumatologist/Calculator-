import { describe, expect, it } from 'vitest';
import { calculators, getCalculator } from '../src/data/calculators';
import { educationalClaimIssues, validateRegistry } from '../src/utils/registry';
import {
  getInitialFormValues,
  getInvalidSelectValues,
  getMissingRequiredInputs,
  riskFromThresholds,
} from '../src/utils/helpers';

describe('calculator registry', () => {
  it('has unique ids', () => {
    const ids = calculators.map((calc) => calc.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('passes schema validation', () => {
    expect(validateRegistry(calculators)).toEqual([]);
  });

  it('executes every calculator on its own default/initial-like values without throwing', () => {
    const failures: string[] = [];
    for (const calc of calculators) {
      const values: Record<string, number | string | boolean | null> = {};
      for (const input of calc.inputs) {
        if (input.defaultValue !== undefined) values[input.id] = input.defaultValue;
        else if (input.type === 'boolean') values[input.id] = false;
        else if (input.type === 'select' || input.type === 'segmented') {
          values[input.id] = input.options?.[0]?.value ?? null;
        } else {
          values[input.id] = input.min ?? 1;
        }
      }
      try {
        const result = calc.calculate(values);
        if (result == null || result.label == null) {
          failures.push(`${calc.id}: empty result`);
        }
      } catch (error) {
        failures.push(`${calc.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it('does not prefill patient numeric inputs', () => {
    const calc = getCalculator('ckd-epi');
    expect(calc).toBeDefined();
    const values = getInitialFormValues(calc);
    expect(values.scr).toBeNull();
    expect(values.age).toBeNull();
  });

  it('treats numeric inputs as required unless they opt out', () => {
    expect(getMissingRequiredInputs([{ id: 'age', label: 'Age', type: 'number' }], { age: null })).toEqual([
      { id: 'age', label: 'Age' },
    ]);
    expect(
      getMissingRequiredInputs([{ id: 'extra', label: 'Optional', type: 'number', required: false }], { extra: null })
    ).toEqual([]);
  });

  it('does not let educational approximations make unqualified official/validated claims', () => {
    const issues = calculators.flatMap(educationalClaimIssues);
    expect(issues).toEqual([]);
  });

  it('rejects categorical values that are not in the option set', () => {
    const calc = getCalculator('qtc-bazett');
    expect(calc).toBeDefined();
    const invalid = getInvalidSelectValues(calc!.inputs, { sex: 'X' });
    expect(invalid.map((item) => item.id)).toContain('sex');
  });
});

describe('riskFromThresholds', () => {
  it('requires strictly increasing maxima', () => {
    expect(() =>
      riskFromThresholds(1, [
        { max: 5, level: 'low', label: 'a', interpretation: 'a' },
        { max: 3, level: 'high', label: 'b', interpretation: 'b' },
      ])
    ).toThrow(/strictly increasing/);
  });

  it('uses the first matching bucket', () => {
    const result = riskFromThresholds(2, [
      { max: 1, level: 'low', label: 'low', interpretation: 'low' },
      { max: 10, level: 'high', label: 'high', interpretation: 'high' },
    ]);
    expect(result.label).toBe('high');
  });
});
