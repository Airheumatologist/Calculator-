import { describe, expect, it } from 'vitest';
import { calculators } from '../src/data/calculators';

/**
 * The unit-selector convention is "selectors, not helpText conversions": the
 * engine converts a unit-aware field before `calculate()` runs, so any helpText
 * that still tells the user to divide/multiply by a factor (e.g. the old
 * "divide by 38.67" cholesterol text) is a double-conversion hazard — a user
 * who follows it and also picks the non-canonical unit converts twice.
 *
 * Fails before the pass-4 cholesterol helpTexts were corrected (6 hits).
 */
const HAND_CONVERSION = /\b(divid(?:e|ing)|multiply|multiplying|convert(?:ed|ing)?)\s+(?:it\s+|them\s+|the\s+value\s+|mg\/dL\s+|by\s+)?(?:by\s+)?\d/i;

describe('unit-aware fields never ask for a hand conversion', () => {
  it('has no divide/multiply-by-factor instruction on any unitKind field', () => {
    const offenders: string[] = [];
    for (const calc of calculators) {
      for (const input of calc.inputs) {
        if (!input.unitKind) continue;
        const text = `${input.helpText ?? ''} ${input.label}`;
        if (HAND_CONVERSION.test(text)) {
          offenders.push(`${calc.id}.${input.id}: ${input.helpText ?? input.label}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

});
