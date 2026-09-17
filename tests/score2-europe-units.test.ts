import { describe, expect, it } from 'vitest';
import { getCalculator } from '../src/data/calculators';
import type { Calculator } from '../src/types/calculator';
import {
  getActiveQuestionnaireInputs,
  getCanonicalValues,
  getExampleFormValues,
  getInitialFormValues,
  getInvalidSelectValues,
  getMissingQuestionnaireInputs,
  getRangeViolations,
  getStepViolations,
  incompleteResult,
  invalidSelectResult,
  rangeBlockedResult,
  stepBlockedResult,
} from '../src/utils/helpers';
import { getUnitOptions, unitInputId } from '../src/utils/units';

const CHOLESTEROL_MGDL_PER_MMOL = 38.67;

function calculator(): Calculator {
  const calc = getCalculator('score2-europe');
  if (!calc) throw new Error('Missing calculator score2-europe');
  return calc;
}

function productionResult(calc: Calculator, values: ReturnType<typeof getInitialFormValues>) {
  const missing = getMissingQuestionnaireInputs(calc, values);
  if (missing.length > 0) return incompleteResult(missing);
  const activeInputs = getActiveQuestionnaireInputs(calc, values);
  const rangeViolations = getRangeViolations(activeInputs, values);
  if (rangeViolations.length > 0) return rangeBlockedResult(rangeViolations);
  const stepViolations = getStepViolations(activeInputs, values);
  if (stepViolations.length > 0) return stepBlockedResult(stepViolations);
  const invalidSelects = getInvalidSelectValues(activeInputs, values);
  if (invalidSelects.length > 0) return invalidSelectResult(invalidSelects);
  return calc.calculate(getCanonicalValues(calc.inputs, values));
}

describe('SCORE2 European cholesterol unit handling', () => {
  it('uses the shared unit-selector convention for both lipid fields', () => {
    const calc = calculator();
    const totalChol = calc.inputs.find((input) => input.id === 'totalChol');
    const hdl = calc.inputs.find((input) => input.id === 'hdl');

    expect(totalChol).toMatchObject({ type: 'number', unit: 'mmol/L', unitKind: 'cholesterol' });
    expect(hdl).toMatchObject({ type: 'number', unit: 'mmol/L', unitKind: 'cholesterol' });
    expect(calc.inputs.some((input) => input.id === 'lipidUnits')).toBe(false);
    expect(getUnitOptions('cholesterol').map(({ value }) => value)).toEqual(['mmol/L', 'mg/dL']);
  });

  it('loads a complete canonical-unit example that passes every production gate', () => {
    const calc = calculator();
    const exampleValues = getExampleFormValues(calc);
    expect(exampleValues[unitInputId('totalChol')]).toBe('mmol/L');
    expect(exampleValues[unitInputId('hdl')]).toBe('mmol/L');

    expect(getMissingQuestionnaireInputs(calc, exampleValues)).toEqual([]);
    const activeInputs = getActiveQuestionnaireInputs(calc, exampleValues);
    expect(getRangeViolations(activeInputs, exampleValues)).toEqual([]);
    expect(getStepViolations(activeInputs, exampleValues)).toEqual([]);
    expect(getInvalidSelectValues(activeInputs, exampleValues)).toEqual([]);

    const result = productionResult(calc, exampleValues);
    expect(result).toMatchObject({ score: 3.4, riskLevel: 'low' });
    expect(result.label).toContain('Lower risk');
  });

  it('keeps mmol/L and equivalent mg/dL profiles on the same score and label', () => {
    const calc = calculator();
    const exampleValues = getExampleFormValues(calc);
    const mmolValues = {
      ...exampleValues,
      [unitInputId('totalChol')]: 'mmol/L',
      [unitInputId('hdl')]: 'mmol/L',
      totalChol: 5.5,
      hdl: 1.3,
    };
    const mgValues = {
      ...exampleValues,
      [unitInputId('totalChol')]: 'mg/dL',
      [unitInputId('hdl')]: 'mg/dL',
      totalChol: 5.5 * CHOLESTEROL_MGDL_PER_MMOL,
      hdl: 1.3 * CHOLESTEROL_MGDL_PER_MMOL,
    };

    const mmolResult = productionResult(calc, mmolValues);
    const mgResult = productionResult(calc, mgValues);
    expect(mgResult.score).toBe(mmolResult.score);
    expect(mgResult.label).toBe(mmolResult.label);
    expect(mgResult.label).not.toMatch(/invalid|too high|too low/i);

    const commonMgResult = productionResult(calc, {
      ...exampleValues,
      [unitInputId('totalChol')]: 'mg/dL',
      [unitInputId('hdl')]: 'mg/dL',
      totalChol: 212,
      hdl: 50,
    });
    expect(commonMgResult.score).toBe(mmolResult.score);
    expect(commonMgResult.label).toBe(mmolResult.label);
  });

  it.each([
    { unit: 'mmol/L', totalChol: 1.9, hdl: 1.3 },
    { unit: 'mmol/L', totalChol: 5.5, hdl: 0.4 },
    { unit: 'mg/dL', totalChol: 70, hdl: 50 },
    { unit: 'mg/dL', totalChol: 212, hdl: 10 },
  ])('fails closed for implausible $unit lipid values', ({ unit, ...lipids }) => {
    const calc = calculator();
    const values = {
      ...getExampleFormValues(calc),
      [unitInputId('totalChol')]: unit,
      [unitInputId('hdl')]: unit,
      ...lipids,
    };
    const result = productionResult(calc, values);

    expect(result).toMatchObject({ score: '—', label: 'Invalid lipid values', riskLevel: 'info' });
    expect(result.interpretation).toMatch(/non-clinical input check/);
  });

  it('blocks calculation until each lipid field has a unit', () => {
    const calc = calculator();
    const values = {
      ...getExampleFormValues(calc),
      [unitInputId('hdl')]: null,
    };
    const missing = getMissingQuestionnaireInputs(calc, values);

    expect(missing.map(({ label }) => label)).toContain('HDL cholesterol — units');
    expect(productionResult(calc, values)).toMatchObject({
      score: '—',
      label: 'Enter all required inputs',
      riskLevel: 'info',
    });
  });

  it('keeps a fresh form incomplete', () => {
    const calc = calculator();
    const values = getInitialFormValues(calc);
    const missing = getMissingQuestionnaireInputs(calc, values);

    expect(missing.length).toBeGreaterThan(0);
    expect(productionResult(calc, values)).toMatchObject({
      score: '—',
      label: 'Enter all required inputs',
      riskLevel: 'info',
    });
  });
});
