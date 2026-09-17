import { describe, expect, it, vi } from 'vitest';
import { getCalculator } from '../src/data/calculators';
import type { Calculator } from '../src/types/calculator';
import {
  getActiveQuestionnaireInputs,
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

const GINA_ITEMS = ['daySx', 'night', 'reliever', 'activity'] as const;

function calculator(id: string): Calculator {
  const calc = getCalculator(id);
  if (!calc) throw new Error(`Missing calculator ${id}`);
  return calc;
}

/** The part of CalculatorPage's result pipeline relevant to a fresh form. */
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
  return calc.calculate(values);
}

describe('GINA symptom control blank-form gate (P1 leftover)', () => {
  const calc = calculator('gina-control');

  it('declares all four GINA control questions and leaves them blank on load', () => {
    for (const id of GINA_ITEMS) {
      const input = calc.inputs.find((candidate) => candidate.id === id);
      expect(input, `gina-control must declare ${id}`).toBeDefined();
      expect(input).toMatchObject({ type: 'boolean' });
      expect(input?.required).not.toBe(false);
      // No exampleValue means "Load example" cannot pre-answer a control question.
      expect(input?.exampleValue).toBeUndefined();
    }
  });

  it('returns "Enter all required inputs" instead of a well-controlled result', () => {
    const calculate = vi.fn<Calculator['calculate']>(() => {
      throw new Error('gina-control calculate() must not run for a fresh form');
    });
    const guardedCalc: Calculator = { ...calc, calculate };
    const values = getInitialFormValues(guardedCalc);
    const missing = getMissingQuestionnaireInputs(guardedCalc, values);

    expect(missing.map(({ id }) => id).sort()).toEqual([...GINA_ITEMS].sort());
    const result = productionResult(guardedCalc, values);

    expect(calculate).not.toHaveBeenCalled();
    expect(result).toMatchObject({ score: '—', label: 'Enter all required inputs', riskLevel: 'info' });
  });

  it('shows why a blank form was previously reported as well controlled', () => {
    // calculate() itself treats an unset box as "no symptom"; the production
    // gate above is what keeps a fresh form from reporting control.
    const blank = calc.calculate(getInitialFormValues(calc));
    expect(blank.label).toBe('Well controlled');
    expect(blank.score).toBe(0);
  });

  it.each([
    [[false, false, false, false], 0, 'Well controlled', 'normal'],
    [[true, false, false, false], 1, 'Partly controlled', 'moderate'],
    [[true, true, false, false], 2, 'Partly controlled', 'moderate'],
    [[true, true, true, false], 3, 'Uncontrolled', 'high'],
    [[true, true, true, true], 4, 'Uncontrolled', 'high'],
  ] as const)(
    'classifies %j as %s criteria → %s',
    (answers, score, label, riskLevel) => {
      const values: Record<string, boolean> = {};
      GINA_ITEMS.forEach((id, index) => {
        values[id] = answers[index];
      });

      expect(getMissingQuestionnaireInputs(calc, values)).toEqual([]);
      const result = calc.calculate(values);
      expect(result.score).toBe(score);
      expect(result.label).toBe(label);
      expect(result.riskLevel).toBe(riskLevel);
    }
  );
});
