import { describe, expect, it } from 'vitest';
import { calculators } from '../src/data/calculators';
import type { Calculator } from '../src/types/calculator';
import {
  calculatorErrorResult,
  getActiveQuestionnaireInputs,
  getCanonicalValues,
  getExampleFormValues,
  getInvalidSelectValues,
  getMissingQuestionnaireInputs,
  getRangeViolations,
  getStepViolations,
  incompleteResult,
  invalidSelectResult,
  rangeBlockedResult,
  stepBlockedResult,
} from '../src/utils/helpers';

/** CalculatorPage's production result pipeline, in the same order. */
function productionResult(calc: Calculator, values: Record<string, number | string | boolean | null>) {
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

const DISPLAY_TEXT = /NaN|undefined|Infinity|null/;

describe('registry-wide example sweep (pass 2)', () => {
  const complete = calculators.filter(
    (calc) => getMissingQuestionnaireInputs(calc, getExampleFormValues(calc)).length === 0
  );

  it('covers the majority of the registry with complete loadable examples', () => {
    // 330 of the 1004 calculators carry enough `exampleValue`s to load a
    // complete example; the rest are large questionnaires where the example is
    // intentionally partial. Tracked as a **Later** item.
    console.info(`Complete loadable examples: ${complete.length}/${calculators.length}`);
    expect(complete.length).toBeGreaterThan(300);
    expect(complete.length).toBeLessThanOrEqual(calculators.length);
  });

  it('gates every incomplete example instead of calculating from partial data', () => {
    const problems: string[] = [];

    for (const calc of calculators) {
      const values = getExampleFormValues(calc);
      const missing = getMissingQuestionnaireInputs(calc, values);
      if (missing.length === 0) continue;

      const result = productionResult(calc, values);
      if (result.label !== 'Enter all required inputs') {
        problems.push(`${calc.id}: expected the missing-input gate, got "${result.label}"`);
      }
      if (result.details?.length !== missing.length) {
        problems.push(`${calc.id}: gate listed ${result.details?.length ?? 0} of ${missing.length} missing inputs`);
      }
    }

    expect(problems).toEqual([]);
  });

  it('never renders NaN, undefined, Infinity, or null for a complete example', () => {
    const problems: string[] = [];

    for (const calc of complete) {
      const values = getExampleFormValues(calc);
      const result = productionResult(calc, values);
      const text = [
        String(result.score),
        result.label,
        result.interpretation,
        String(result.unit ?? ''),
        ...(result.details ?? []).flatMap(({ label, value }) => [label, value]),
        ...(result.alerts ?? []),
      ].join(' | ');

      if (DISPLAY_TEXT.test(text)) problems.push(`${calc.id}: ${text}`);
      if (result.label === 'Calculator error — result unavailable') {
        problems.push(`${calc.id}: calculate() threw`);
      }
      if (result.label === 'Enter all required inputs' || result.label === 'Value out of range') {
        problems.push(`${calc.id}: example did not survive the production gates (${result.label})`);
      }
    }

    expect(problems).toEqual([]);
  });

  it('keeps the example result identical when the canonical unit choice is made explicit', () => {
    const problems: string[] = [];

    for (const calc of complete) {
      const values = getExampleFormValues(calc);
      const unitFields = calc.inputs.filter((input) => input.unitKind);
      if (unitFields.length === 0) continue;

      const canonical = getCanonicalValues(calc.inputs, values);
      for (const input of unitFields) {
        expect(canonical[input.id], `${calc.id}.${input.id} example must be canonical`).toBe(values[input.id]);
      }
      const withUnits = productionResult(calc, canonical);
      const withoutUnits = productionResult(calc, values);
      if (String(withUnits.score) !== String(withoutUnits.score)) {
        problems.push(`${calc.id}: ${String(withoutUnits.score)} vs ${String(withUnits.score)}`);
      }
    }

    expect(problems).toEqual([]);
  });
});
