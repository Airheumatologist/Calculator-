/**
 * Unit tests for form-level input validation (audit findings #1, step validation).
 * The app has no DOM testing library, so these cover the pure helpers the page
 * and form components delegate to.
 */
import { describe, expect, it } from 'vitest';
import {
  getMissingRequiredInputs,
  getStepViolations,
  incompleteResult,
  isMissingValue,
  num,
  numberInput,
  stepViolationMessage,
} from '../src/utils/helpers';
import { getCalculator } from '../src/data/calculators';

const age = numberInput('age', 'Age', { unit: 'years', min: 0, max: 120, step: 1 });
const weight = numberInput('weight', 'Weight', { unit: 'kg', min: 0, max: 300, step: 0.1 });

describe('getMissingRequiredInputs', () => {
  it('reports required numeric inputs that are null or undefined', () => {
    expect(getMissingRequiredInputs([age, weight], { age: null })).toEqual([
      { id: 'age', label: 'Age' },
      { id: 'weight', label: 'Weight' },
    ]);
  });

  it('treats empty string and non-finite numbers as missing', () => {
    expect(getMissingRequiredInputs([age], { age: '' })).toHaveLength(1);
    expect(getMissingRequiredInputs([age], { age: Number.NaN })).toHaveLength(1);
    expect(getMissingRequiredInputs([age], { age: Number.POSITIVE_INFINITY })).toHaveLength(1);
  });

  it('reports nothing when every required input has a value', () => {
    expect(getMissingRequiredInputs([age, weight], { age: 62, weight: 80.5 })).toEqual([]);
  });

  it('accepts zero as a real value, not a missing one', () => {
    expect(getMissingRequiredInputs([age, weight], { age: 0, weight: 0 })).toEqual([]);
    expect(isMissingValue(0)).toBe(false);
  });

  it('accepts numeric strings from raw input values', () => {
    expect(getMissingRequiredInputs([age], { age: '0' })).toEqual([]);
    expect(getMissingRequiredInputs([age], { age: 'abc' })).toHaveLength(1);
  });

  it('ignores inputs that are not marked required', () => {
    const optional = { id: 'note', label: 'Note', type: 'number' };
    expect(getMissingRequiredInputs([optional], { note: null })).toEqual([]);
  });

  it('is driven by the required flag, not the input type', () => {
    const requiredSelect = { id: 'sex', label: 'Sex', type: 'select', required: true };
    expect(getMissingRequiredInputs([requiredSelect], { sex: null })).toEqual([
      { id: 'sex', label: 'Sex' },
    ]);
    expect(getMissingRequiredInputs([requiredSelect], { sex: 'male' })).toEqual([]);
  });
});

describe('incompleteResult', () => {
  it('returns a blocked result in the same shape as rangeBlockedResult', () => {
    const r = incompleteResult([{ id: 'age', label: 'Age' }]);
    expect(r.score).toBe('—');
    expect(r.riskLevel).toBe('info');
    expect(r.label).toBe('Enter all required inputs');
    expect(r.interpretation).toContain('Age');
    expect(r.details).toEqual([{ label: 'Age', value: 'Required' }]);
  });

  it('names every missing field', () => {
    const r = incompleteResult([
      { id: 'age', label: 'Age' },
      { id: 'weight', label: 'Weight' },
    ]);
    expect(r.interpretation).toContain('Age');
    expect(r.interpretation).toContain('Weight');
    expect(r.details).toHaveLength(2);
  });
});

describe('getStepViolations', () => {
  it('accepts exact multiples of an integer step', () => {
    expect(getStepViolations([age], { age: 62 })).toEqual([]);
    expect(getStepViolations([age], { age: 0 })).toEqual([]);
  });

  it('rejects values that are not multiples of an integer step', () => {
    const [v] = getStepViolations([age], { age: 62.5 });
    expect(v.id).toBe('age');
    expect(v.step).toBe(1);
    expect(v.nearest).toBe(63);
    expect(stepViolationMessage(v)).toContain('multiple of 1');
  });

  it('accepts float-step values that binary floating point cannot represent exactly', () => {
    expect(getStepViolations([weight], { weight: 7.3 })).toEqual([]);
    expect(getStepViolations([weight], { weight: 80.1 })).toEqual([]);
    expect(getStepViolations([weight], { weight: 0.3 })).toEqual([]);
    expect(getStepViolations([weight], { weight: 123.7 })).toEqual([]);
  });

  it('rejects float-step values that fall between steps', () => {
    const [v] = getStepViolations([weight], { weight: 7.35 });
    expect(v.step).toBe(0.1);
    expect(v.value).toBe(7.35);
  });

  it('accepts values on the min-offset grid as well as the zero grid', () => {
    // Lenient on purpose: real calculators pair a tiny min (0.01) with a
    // coarser step (0.1), so only values off both grids are flagged.
    const odd = { id: 'x', label: 'X', type: 'number', min: 1, step: 2, required: true };
    expect(getStepViolations([odd], { x: 7 })).toEqual([]);
    expect(getStepViolations([odd], { x: 8 })).toEqual([]);
    expect(getStepViolations([odd], { x: 7.5 })).toHaveLength(1);

    const fine = { id: 'cp', label: 'Cp', type: 'number', min: 0.01, step: 0.1 };
    expect(getStepViolations([fine], { cp: 20 })).toEqual([]);
    expect(getStepViolations([fine], { cp: 20.05 })).toHaveLength(1);
  });

  it('skips inputs with no usable step and skips empty values', () => {
    const noStep = { id: 'y', label: 'Y', type: 'number' };
    expect(getStepViolations([noStep], { y: 7.3333 })).toEqual([]);
    expect(getStepViolations([{ ...noStep, step: 0 }], { y: 7.3333 })).toEqual([]);
    expect(getStepViolations([age], { age: null })).toEqual([]);
    expect(getStepViolations([age], { age: '' })).toEqual([]);
  });

  it('ignores non-numeric inputs', () => {
    const select = { id: 'sex', label: 'Sex', type: 'select', step: 1 };
    expect(getStepViolations([select], { sex: 'male' })).toEqual([]);
  });
});

describe('regression: YEARS algorithm is gated on D-dimer', () => {
  const years = getCalculator('years-algorithm');

  it('exists with a required numeric D-dimer input', () => {
    expect(years).toBeDefined();
    const ddimer = years!.inputs.find((i) => i.id === 'ddimer');
    expect(ddimer?.type).toBe('number');
    expect(ddimer?.required).toBe(true);
  });

  it('reports blank D-dimer as missing, so the page never calls calculate', () => {
    const values = { dvtSigns: false, hemoptysis: false, peLikely: false, ddimer: null };
    const missing = getMissingRequiredInputs(years!.inputs, values);
    expect(missing.map((m) => m.id)).toEqual(['ddimer']);
    expect(incompleteResult(missing).score).toBe('—');
  });

  it('coerces a blank D-dimer to 0, which is why the gate must run first', () => {
    // num(null, 0) === 0 is the coercion that made an empty D-dimer read as
    // "below threshold"; the page must block before calculate() sees it.
    expect(num(null, 0)).toBe(0);
  });

  it('still calculates once D-dimer is entered', () => {
    const values = { dvtSigns: false, hemoptysis: false, peLikely: false, ddimer: 1200 };
    expect(getMissingRequiredInputs(years!.inputs, values)).toEqual([]);
    expect(years!.calculate(values).label).not.toBe('PE excluded by YEARS');
  });
});
