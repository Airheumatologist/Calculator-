import { describe, expect, it } from 'vitest';
import { calculators } from '../src/data/calculators';
import {
  getActiveQuestionnaireInputs,
  getCanonicalValues,
  getMissingQuestionnaireInputs,
  isQuestionnaireCalculator,
} from '../src/utils/helpers';

/**
 * Registry-wide questionnaire branch sweep — the "dangerous direction".
 *
 * A field that is hidden in the active branch must not influence that branch's
 * score. If it does, the value the formula depends on cannot be entered (or is
 * never required), so the tool silently computes from a blank: exactly the
 * `sic-score` (INR/platelets hidden in the default branch) and
 * `cornell-dementia` (survey item 7 listed as a direct-only field) defects
 * found by the independent verification pass.
 *
 * Every questionnaire is run in its non-direct branch with a plausible value in
 * every field, then each field the branch hides is perturbed. Any change in the
 * score, or any change in gating, fails.
 */
type Vals = Record<string, number | string | boolean | null>;

const CANONICAL_UNIT: Record<string, string> = {
  weight: 'kg',
  creatinine: 'mg/dL',
  fio2: 'fraction',
  ddimer: 'ng/mL FEU',
  cholesterol: 'mmol/L',
  phosphate: 'mg/dL',
  bilirubin: 'mg/dL',
  vitaminD: 'ng/mL',
  lpa: 'mg/dL',
  magnesium: 'mg/dL',
};

function plausible(calc: (typeof calculators)[number]): Vals {
  const values: Vals = {};
  for (const input of calc.inputs) {
    if (input.type === 'number') {
      values[input.id] =
        typeof input.exampleValue === 'number'
          ? input.exampleValue
          : ((input.min ?? 1) + (input.max ?? (input.min ?? 1) + 2)) / 2;
    } else if (input.type === 'select' || input.type === 'segmented') {
      const options = input.options ?? [];
      values[input.id] = (options.find((o) => o.value === input.exampleValue) ?? options[1] ?? options[0])
        ?.value as Vals[string];
    } else {
      values[input.id] = input.exampleValue === undefined ? false : (input.exampleValue as boolean);
    }
    if (input.unitKind) values[`${input.id}__unit`] = CANONICAL_UNIT[input.unitKind];
  }
  return values;
}

function run(calc: (typeof calculators)[number], values: Vals) {
  const missing = getMissingQuestionnaireInputs(calc, values);
  if (missing.length) return { gated: missing.map((m) => m.id) };
  const result = calc.calculate(getCanonicalValues(calc.inputs, values));
  return { gated: null, score: result.score, label: result.label };
}

describe('questionnaire branches hide only fields they do not score', () => {
  it('no hidden field changes the active branch result', () => {
    const problems: string[] = [];
    let simulated = 0;

    for (const calc of calculators) {
      if (!isQuestionnaireCalculator(calc)) continue;
      const meta =
        calc.questionnaire && typeof calc.questionnaire === 'object' ? calc.questionnaire : undefined;
      if (!meta?.modeInputId) continue;
      const modeInput = calc.inputs.find((i) => i.id === meta.modeInputId);
      if (!modeInput?.options?.length) continue;

      const activeValue = modeInput.options
        .map((o) => o.value)
        .find((v) => !(meta.directModeValues ?? []).includes(v as string));
      if (activeValue === undefined) continue;

      const base = plausible(calc);
      base[meta.modeInputId] = activeValue as Vals[string];
      const baseline = run(calc, base);
      if (baseline.gated) continue; // incomplete by design; nothing to compare
      simulated += 1;

      const visible = new Set([
        meta.modeInputId,
        ...getActiveQuestionnaireInputs(calc, base).map((i) => i.id),
      ]);
      for (const input of calc.inputs) {
        if (visible.has(input.id)) continue;
        const perturbed: Vals = { ...base };
        if (input.type === 'number') {
          const raw = base[input.id];
          perturbed[input.id] = (typeof raw === 'number' ? raw : 0) + 5;
        } else if (input.type === 'select' || input.type === 'segmented') {
          const optionValues = (input.options ?? []).map((o) => o.value);
          const index = optionValues.findIndex((v) => v === base[input.id]);
          perturbed[input.id] = optionValues[(index + 1) % optionValues.length] as Vals[string];
        } else {
          perturbed[input.id] = !base[input.id];
        }
        const after = run(calc, perturbed);
        if (after.gated) {
          problems.push(
            `${calc.id}: hidden field ${input.id} changes gating (${after.gated.join(', ')})`
          );
        } else if (JSON.stringify(after.score) !== JSON.stringify(baseline.score)) {
          problems.push(
            `${calc.id}: hidden field ${input.id} moves the score ${JSON.stringify(baseline.score)} -> ${JSON.stringify(after.score)}`
          );
        }
      }
    }

    expect(simulated).toBeGreaterThanOrEqual(50);
    expect(problems).toEqual([]);
  });
});
