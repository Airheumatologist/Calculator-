import { describe, expect, it } from 'vitest';
import { calculators } from '../src/data/calculators';
import { UNITS } from '../src/utils/units';

/**
 * The shared unit convention only works if `unit` (the text the formula was
 * written against) always matches the canonical unit of the declared
 * `unitKind`. A mismatch would silently feed a formula the wrong scale, which
 * no per-calculator test would catch reliably — so it is checked registry-wide.
 */
describe('unitKind ↔ canonical unit invariant', () => {
  it('has no calculator declaring a unitKind whose canonical unit differs from input.unit', () => {
    const mismatches: string[] = [];

    for (const calc of calculators) {
      for (const input of calc.inputs) {
        if (!input.unitKind) continue;
        const definition = UNITS[input.unitKind];
        if (!definition) {
          mismatches.push(`${calc.id}.${input.id}: unknown unit kind ${input.unitKind}`);
          continue;
        }
        if (input.unit !== definition.canonical) {
          mismatches.push(
            `${calc.id}.${input.id}: unit "${String(input.unit)}" but ${input.unitKind} is canonical in "${definition.canonical}"`
          );
        }
        if (!definition.options.some((option) => option.value === definition.canonical && option.factor === 1)) {
          mismatches.push(`${calc.id}.${input.id}: ${input.unitKind} has no factor-1 canonical option`);
        }
      }
    }

    expect(mismatches).toEqual([]);
  });

  it('keeps every unit family resolvable from a stored value', () => {
    for (const [kind, definition] of Object.entries(UNITS)) {
      expect(definition.kind).toBe(kind);
      expect(definition.options.length).toBeGreaterThan(1);
      for (const option of definition.options) {
        expect(option.factor).toBeGreaterThan(0);
        expect(option.label.length).toBeGreaterThan(0);
        expect(option.description.length).toBeGreaterThan(0);
      }
    }
  });
});
