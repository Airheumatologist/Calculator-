import { describe, expect, it } from 'vitest';
import { getCalculator } from '../src/data/calculators';
import {
  getActiveQuestionnaireInputs,
  getCanonicalValues,
  getMissingQuestionnaireInputs,
} from '../src/utils/helpers';

/**
 * Regression for two branch-declaration defects found by an independent
 * verification pass. Both are the "dangerous direction": a field the formula
 * reads is not active in its own branch, so it is never required and a blank
 * answer silently contributes 0.
 *
 * 1. `sic-score` (pass-introduced regression): the pass-4 declaration listed
 *    only the four SOFA organ domains in the default `organs` branch. INR and
 *    platelets — the coagulation half of the score — became optional, so a user
 *    could score the organ domains alone and still get a "SIC negative" result
 *    (coagulation subscore fixed at 0, which can never satisfy the
 *    platelet+INR > 2 criterion). Fails before the fix (score 1, not gated).
 * 2. `cornell-dementia` (pre-existing, preserved by the explicit metadata):
 *    `directInputIds` listed `csdd_somatic`, which is survey item 7, so item 7
 *    was excluded from the survey branch and scored 0 when left blank.
 */
describe('sic-score requires the coagulation criteria in both branches', () => {
  const calc = getCalculator('sic-score');
  if (!calc) throw new Error('sic-score must be registered');

  it('gates the organ-domain branch when INR or platelets are blank', () => {
    for (const missingId of ['inr', 'platelets']) {
      const values: Record<string, number | string | boolean | null> = {
        inr: 0,
        platelets: 0,
        sofaMode: 'organs',
        directSofa: 0,
        respSofa: 4,
        cvSofa: 4,
        hepSofa: 4,
        renalSofa: 4,
      };
      values[missingId] = null;
      const missing = getMissingQuestionnaireInputs(calc!, values);
      expect(missing.map((m) => m.id), `${missingId} must be required`).toContain(missingId);
    }
  });

  it('gates the precomputed-SOFA branch when INR or platelets are blank', () => {
    const values: Record<string, number | string | boolean | null> = {
      inr: 2,
      platelets: 2,
      sofaMode: 'direct',
      directSofa: 2,
    };
    const withCoag = getMissingQuestionnaireInputs(calc!, values);
    expect(withCoag).toEqual([]);
    expect(getActiveQuestionnaireInputs(calc!, values).map((i) => i.id)).toEqual(
      expect.arrayContaining(['inr', 'platelets', 'directSofa'])
    );

    const blankCoag = { ...values, inr: null, platelets: null };
    expect(getMissingQuestionnaireInputs(calc!, blankCoag).map((m) => m.id)).toEqual(
      expect.arrayContaining(['inr', 'platelets'])
    );
  });

  it('a fully answered organ-domain form still reaches SIC positive', () => {
    const values = {
      inr: 2,
      platelets: 2,
      sofaMode: 'organs',
      directSofa: 0,
      respSofa: 4,
      cvSofa: 0,
      hepSofa: 0,
      renalSofa: 0,
    };
    expect(getMissingQuestionnaireInputs(calc!, values)).toEqual([]);
    const result = calc!.calculate(getCanonicalValues(calc!.inputs, values));
    expect(result.score).toBe(6);
    expect(result.label).toMatch(/positive/i);
  });
});

describe('cornell-dementia keeps survey item 7 inside the survey branch', () => {
  const calc = getCalculator('cornell-dementia');
  if (!calc) throw new Error('cornell-dementia must be registered');

  const items = calc.inputs
    .filter((i) => i.id.startsWith('csdd_'))
    .map((i) => i.id);

  it('requires all 19 items, including item 7 (csdd_somatic)', () => {
    expect(items).toHaveLength(19);
    const values: Record<string, number | string | boolean | null> = {
      entryMode: 'survey',
      score: null,
    };
    for (const id of items) values[id] = 1;
    expect(getMissingQuestionnaireInputs(calc!, values)).toEqual([]);

    const withoutItem7 = { ...values, csdd_somatic: null };
    const missing = getMissingQuestionnaireInputs(calc!, withoutItem7);
    expect(missing.map((m) => m.id)).toContain('csdd_somatic');
  });

  it('item 7 still contributes to the survey total', () => {
    const values: Record<string, number | string | boolean | null> = {
      entryMode: 'survey',
      score: null,
    };
    for (const id of items) values[id] = 0;
    const base = calc!.calculate(getCanonicalValues(calc!.inputs, values));
    const withSomatic = calc!.calculate(
      getCanonicalValues(calc!.inputs, { ...values, csdd_somatic: 2 })
    );
    expect(Number(withSomatic.score) - Number(base.score)).toBe(2);
  });
});
