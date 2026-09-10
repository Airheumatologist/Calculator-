import { describe, it, expect } from 'vitest';
import { calculators } from '../src/data/calculators/index';
import type { CalcInput, Calculator } from '../src/types/calculator';

/**
 * Audit: blank optional numeric inputs must not render as a bare 0.
 *
 * A blank optional input reaches calculate() as null. Zero is a real clinical
 * value in many of these fields (a Y-BOCS obsession subtotal of 0 means no
 * obsessions), so a details row that shows a bare 0 for a blank input reports
 * an invented measurement. When the raw value is missing, the row must say so
 * (house wording, see git c9e7a83) or render an explicit placeholder.
 *
 * Method: for every numeric input with required: false, run calculate() twice —
 * once with the field null and all other inputs at defaults, once with the
 * field populated at a non-zero probe value and all other inputs at the same
 * defaults. Only details rows that CHANGE between the two runs depend on the
 * target input; a row that shows 0 in both runs owes that 0 to some other
 * input's default and is not a violation. A violation is a changed row where
 * exactly one number token went from the populated non-zero value to 0 —
 * i.e. the blank was rendered as 0.
 *
 * Two further gates keep the assertion to undisclosed bare zeros:
 *
 * 1. Annotation: the blank-run row value must be bare — the zeroed numeral
 *    carries no unit or formula annotation. '0 mOsm (EtOH/4.6)' or '0 U'
 *    disclose how the 0 arose; only single-letter domain prefixes as in
 *    'A0 M0 F0 L0 V0' (the same prefix before every number) count as bare.
 * 2. Declared blank semantics: inputs whose own label or helpText documents
 *    what blank means ('assumed 0 if unknown', 'Leave 0 if not measured')
 *    are following their disclosed convention, not inventing a value.
 */

type Values = Record<string, number | string | boolean | null>;

function defaultFor(input: CalcInput): number | string | boolean | null {
  if (input.type === 'number') return input.defaultValue ?? input.min ?? 0;
  if (input.type === 'boolean') return false;
  return input.options?.[0]?.value ?? 0;
}

function baseValues(calc: Calculator): Values {
  const values: Values = {};
  for (const input of calc.inputs) values[input.id] = defaultFor(input);
  return values;
}

/**
 * A non-zero value within [min, max] so the populated run shows the field's
 * own contribution rather than a 0 that coincides with blank rendering.
 * Fields where every plausible value is 0 cannot be probed and are skipped.
 */
function probeValue(input: CalcInput): number | null {
  const min = typeof input.min === 'number' ? input.min : undefined;
  const max = typeof input.max === 'number' ? input.max : undefined;
  const mid =
    min !== undefined && max !== undefined ? Math.round(((min + max) / 2) * 10) / 10 : undefined;
  const candidates = [input.defaultValue, mid, max, min];
  for (const c of candidates) {
    if (typeof c !== 'number' || !Number.isFinite(c) || c === 0) continue;
    if (min !== undefined && c < min) continue;
    if (max !== undefined && c > max) continue;
    return c;
  }
  return null;
}

/** The input's label or helpText states what a blank entry means. */
function declaresBlankSemantics(input: CalcInput): boolean {
  return /\bassum|if unknown|leave 0|not measured/i.test(
    `${input.label} ${input.helpText ?? ''}`
  );
}

function numberTokens(s: string): string[] {
  return s.match(/\d+(?:\.\d+)?/g) ?? [];
}

function isBareZero(token: string): boolean {
  return /^0+(?:\.0+)?$/.test(token);
}

/**
 * Bare: no alphabetic unit or annotation. Single uppercase letters directly
 * before a number are domain prefixes ('A0 M0 F0 L0 V0') and are stripped
 * first; a prefix must sit before a number, so a trailing unit ('0 U') or a
 * word ('0 mOsm') keeps the value annotated.
 */
function isBareValue(value: string): boolean {
  const stripped = value.replace(/\b[A-Z]\s*(?=\d+(?:\.\d+)?)/g, '');
  return !/[A-Za-z]/.test(stripped);
}

/** The blank run renders 0 exactly where the populated run showed the value. */
function blankRendersZero(valueBlank: string, valuePopulated: string): boolean {
  if (valueBlank === valuePopulated) return false;
  const a = numberTokens(valueBlank);
  const b = numberTokens(valuePopulated);
  if (a.length !== b.length) return false;
  let diffs = 0;
  let zeroed = false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) continue;
    diffs++;
    if (isBareZero(a[i]) && !isBareZero(b[i])) zeroed = true;
  }
  return diffs === 1 && zeroed;
}

function detailsByLabel(calc: Calculator, values: Values): Map<string, string> {
  const rows = new Map<string, string>();
  for (const row of calc.calculate(values).details ?? []) {
    if (!rows.has(row.label)) rows.set(row.label, row.value);
  }
  return rows;
}

const violations: string[] = [];

for (const calc of calculators) {
  for (const input of calc.inputs) {
    if (input.type !== 'number' || input.required !== false) continue;
    if (declaresBlankSemantics(input)) continue;
    const probe = probeValue(input);
    if (probe === null) continue;
    const blankValues = baseValues(calc);
    blankValues[input.id] = null;
    const populatedValues = baseValues(calc);
    populatedValues[input.id] = probe;
    const blankRows = detailsByLabel(calc, blankValues);
    const populatedRows = detailsByLabel(calc, populatedValues);
    for (const [label, valueBlank] of blankRows) {
      const valuePopulated = populatedRows.get(label);
      if (valuePopulated === undefined) continue;
      if (!isBareValue(valueBlank)) continue;
      if (blankRendersZero(valueBlank, valuePopulated)) {
        violations.push(
          `${calc.id}: input '${input.id}' (${input.label}) blank renders details row '${label}' = '${valueBlank}' (populated: '${valuePopulated}')`
        );
      }
    }
  }
}

describe('Audit: blank optional inputs must read "not entered", not 0', () => {
  it('no details row renders a bare 0 for a blank optional numeric input', () => {
    expect(violations).toEqual([]);
  });
});
