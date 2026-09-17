import { describe, expect, it } from 'vitest';
import { calculators } from '../src/data/calculators';
import {
  getActiveQuestionnaireInputs,
  getCanonicalValues,
  getInitialFormValues,
  getInvalidSelectValues,
  getMissingQuestionnaireInputs,
  getRangeViolations,
  getStepViolations,
} from '../src/utils/helpers';

/**
 * Registry-wide fail-closed sweep: a freshly opened calculator must never
 * produce a score. The passes fixed this per-ID (waves 1 and 2) for the IDs the
 * original audit called out; this sweep makes the invariant registry-wide, so a
 * future tool whose inputs are all optional (every field defaulting somewhere
 * inside `calculate()`) fails the suite instead of shipping a fabricated score.
 */
describe('blank forms never produce a score', () => {
  it('every calculator is gated before calculate() runs on a fresh form', () => {
    const failOpen: string[] = [];
    const threw: string[] = [];
    for (const calc of calculators) {
      const values = getInitialFormValues(calc);
      const missing = getMissingQuestionnaireInputs(calc, values);
      if (missing.length > 0) continue;
      const active = getActiveQuestionnaireInputs(calc, values);
      const blocked = [
        ...getRangeViolations(active, values),
        ...getStepViolations(active, values),
        ...getInvalidSelectValues(active, values),
      ];
      if (blocked.length > 0) continue;
      try {
        const result = calc.calculate(getCanonicalValues(calc.inputs, values));
        failOpen.push(`${calc.id} -> ${JSON.stringify(result.score)} (${result.label})`);
      } catch (error) {
        threw.push(`${calc.id}: ${String(error)}`);
      }
    }
    expect(threw).toEqual([]);
    expect(failOpen).toEqual([]);
  });
});
