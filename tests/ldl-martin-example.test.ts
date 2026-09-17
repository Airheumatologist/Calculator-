import { describe, expect, it } from 'vitest';
import { getCalculator } from '../src/data/calculators';
import type { Calculator } from '../src/types/calculator';
import {
  getActiveQuestionnaireInputs,
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

/** The same validation order used by CalculatorPage before calculate(). */
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
  return calc.calculate(values);
}

function calculator(): Calculator {
  const calc = getCalculator('ldl-martin');
  if (!calc) throw new Error('Missing calculator ldl-martin');
  return calc;
}

describe('LDL-C Martin/Hopkins explicit example', () => {
  it('loads a source-table 180-cell worked-check through production gates', () => {
    const calc = calculator();
    const example = getExampleFormValues(calc);

    expect(example).toEqual({ tc: 200, hdl: 50, tg: 350 });
    expect(calc.inputs.map(({ id, unit, min, max }) => ({ id, unit, min, max }))).toEqual([
      { id: 'tc', unit: 'mg/dL', min: 50, max: 600 },
      { id: 'hdl', unit: 'mg/dL', min: 10, max: 150 },
      { id: 'tg', unit: 'mg/dL', min: 20, max: 800 },
    ]);
    expect(getMissingQuestionnaireInputs(calc, example)).toEqual([]);
    expect(getRangeViolations(calc.inputs, example)).toEqual([]);
    expect(getStepViolations(calc.inputs, example)).toEqual([]);
    expect(getInvalidSelectValues(calc.inputs, example)).toEqual([]);

    // Martin SS et al., JAMA 2013, Fig 2: TG 293–399 and non-HDL-C 130–159
    // use factor 7.5. LDL-C = 150 − (350 / 7.5) = 103.3, rounded to 103.
    const result = productionResult(calc, example);
    expect(result).toMatchObject({ score: 103, unit: 'mg/dL' });
    expect(result.label).not.toMatch(/invalid|caution|incomplete|error/i);
    expect(result.details).toEqual([
      { label: 'Non-HDL-C', value: '150 mg/dL' },
      { label: 'TG:VLDL factor (180-cell)', value: '7.5' },
    ]);
    expect(typeof result.score === 'number' && Number.isFinite(result.score)).toBe(true);
  });

  it('keeps the fresh form blank and fail-closed', () => {
    const calc = calculator();
    const fresh = getInitialFormValues(calc);

    expect(fresh).toEqual({ tc: null, hdl: null, tg: null });
    expect(getMissingQuestionnaireInputs(calc, fresh).map(({ id }) => id)).toEqual(['tc', 'hdl', 'tg']);
    expect(productionResult(calc, fresh)).toMatchObject({
      score: '—',
      label: 'Enter all required inputs',
      riskLevel: 'info',
    });
  });
});
