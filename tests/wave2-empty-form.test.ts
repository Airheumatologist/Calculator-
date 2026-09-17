import { describe, expect, it, vi } from 'vitest';
import { getCalculator } from '../src/data/calculators';
import type { Calculator } from '../src/types/calculator';
import {
  calculatorErrorResult,
  getActiveQuestionnaireInputs,
  getCanonicalValues,
  getExampleFormValues,
  getInitialFormValues,
  getInvalidSelectValues,
  getMissingQuestionnaireInputs,
  getRangeViolations,
  getStepViolations,
  invalidSelectResult,
  incompleteResult,
  rangeBlockedResult,
  stepBlockedResult,
} from '../src/utils/helpers';

const WAVE_2_IDS = [
  'doac-renal-dose',
  'enoxaparin-dose',
  'heparin-bolus',
  'defib-dose-peds',
  'epi-dose-peds',
  'epinephrine-im-dose',
  'nac-dosing',
  'digoxin-fab',
  'fomepizole-dose',
  'total-daily-insulin',
  'correction-dose-insulin',
  'insulin-sensitivity-factor',
  'carb-ratio',
  'basal-bolus-split',
  'levothyroxine-dose',
  'phos-replacement',
  'potassium-deficit',
  'score2-europe',
] as const;

/** The part of CalculatorPage's result pipeline relevant to a fresh form. */
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
  try {
    return calc.calculate(getCanonicalValues(calc.inputs, values));
  } catch {
    return calculatorErrorResult(calc.id);
  }
}

function calculator(id: string): Calculator {
  const calc = getCalculator(id);
  if (!calc) throw new Error(`Missing calculator ${id}`);
  return calc;
}

describe('Wave 2 dosing/crash calculators through the production fresh-form gate', () => {
  it.each(WAVE_2_IDS)('%s does not calculate with a fresh form', (id) => {
    const calc = calculator(id);
    const calculate = vi.fn<Calculator['calculate']>(() => {
      throw new Error(`${id} calculate() must not run for a fresh form`);
    });
    const guardedCalc: Calculator = { ...calc, calculate };
    const values = getInitialFormValues(guardedCalc);
    const missing = getMissingQuestionnaireInputs(guardedCalc, values);

    expect(missing.length, `${id} must have at least one unanswered required input`).toBeGreaterThan(0);
    const result = productionResult(guardedCalc, values);

    expect(calculate).not.toHaveBeenCalled();
    expect(result).toMatchObject({ score: '—', label: 'Enter all required inputs', riskLevel: 'info' });
    expect(result.details?.map(({ label, value }) => ({ label, value }))).toEqual(
      missing.map(({ label }) => ({ label, value: 'Required' }))
    );
  });

  it('does not invoke calculate for incomplete explicit examples, and records the exceptions', () => {
    const incompleteExamples: Record<string, string[]> = {};
    const completeExamples: string[] = [];

    for (const id of WAVE_2_IDS) {
      const calc = calculator(id);
      const values = getExampleFormValues(calc);
      const missing = getMissingQuestionnaireInputs(calc, values);
      if (missing.length > 0) {
        incompleteExamples[id] = missing.map(({ id: inputId }) => inputId);
        continue;
      }

      completeExamples.push(id);
      const result = productionResult(calc, values);
      expect(result.label, `${id} example should produce a result`).not.toBe('Calculator error — result unavailable');
    }

    // These are intentionally reported rather than filled in here: adding
    // calculator-specific sample selections is outside this regression test.
    console.info('Wave 2 incomplete examples:', incompleteExamples);
    console.info('Wave 2 complete examples:', completeExamples);
    expect(completeExamples.length).toBeGreaterThan(0);
  });

  it('loads a complete SCORE2 example and accepts equivalent mg/dL inputs', () => {
    const calc = calculator('score2-europe');
    const exampleValues = getExampleFormValues(calc);
    expect(getMissingQuestionnaireInputs(calc, exampleValues)).toEqual([]);
    const exampleResult = productionResult(calc, exampleValues);
    expect(exampleResult).toMatchObject({ score: 3.4, riskLevel: 'low' });
    expect(exampleResult.label).toContain('Lower risk');

    // The Wave 3 unit selectors convert common mg/dL values before SCORE2.
    const mgDlValues = {
      ...exampleValues,
      totalChol__unit: 'mg/dL',
      hdl__unit: 'mg/dL',
      totalChol: 212,
      hdl: 50,
    };
    const mgDlResult = productionResult(calc, mgDlValues);
    expect(mgDlResult).toMatchObject({ score: 3.4, riskLevel: 'low' });
    expect(mgDlResult.label).toBe(exampleResult.label);
    expect(mgDlResult.label).not.toMatch(/invalid|too high|too low/i);
    console.info('SCORE2 example:', exampleValues, exampleResult.score);
    console.info('SCORE2 common mg/dL values:', mgDlValues, mgDlResult.score);
  });
});
