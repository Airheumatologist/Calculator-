import { describe, expect, it } from 'vitest';
import { getCalculator } from '../src/data/calculators';
import {
  getActiveQuestionnaireInputs,
  getCanonicalValues,
  getExampleFormValues,
  getInitialFormValues,
  getInvalidSelectValues,
  getMissingQuestionnaireInputs,
  getRangeViolations,
  getStepViolations,
} from '../src/utils/helpers';

/**
 * Regression for the pass-introduced fail-open in `hfa-peff`: the pass replaced
 * the old 0/1/2 biomarker select with `biomarker` (assay) + `biomarkerValue`
 * and marked the value `required: false`. Selecting an assay while leaving the
 * value blank therefore scored the biomarker domain as 0 and produced the
 * reassuring "HFpEF unlikely (0–1)" headline from missing data.
 *
 * Fails before the fix (score 0 / "HFpEF unlikely"), passes after it.
 */
const calc = getCalculator('hfa-peff');
if (!calc) throw new Error('hfa-peff must be registered');

function run(values: Record<string, number | string | boolean | null>) {
  const missing = getMissingQuestionnaireInputs(calc!, values);
  if (missing.length) return { gated: true as const, missing };
  const active = getActiveQuestionnaireInputs(calc!, values);
  expect(getRangeViolations(active, values)).toEqual([]);
  expect(getStepViolations(active, values)).toEqual([]);
  expect(getInvalidSelectValues(active, values)).toEqual([]);
  return { gated: false as const, result: calc!.calculate(getCanonicalValues(calc!.inputs, values)) };
}

describe('hfa-peff biomarker domain fails closed', () => {
  it('refuses to score a selected assay with a blank value', () => {
    for (const assay of ['bnp', 'nt']) {
      const out = run({
        functional: 0,
        morphological: 0,
        rhythm: 'sr',
        biomarker: assay,
        biomarkerValue: null,
      });
      expect(out.gated).toBe(false);
      if (out.gated) continue;
      expect(out.result.score).toBe('—');
      expect(out.result.label).toMatch(/Not measured|Enter the natriuretic peptide value/);
      expect(out.result.interpretation).toMatch(/cannot be scored/i);
      // The reassuring band must never be the headline for missing data.
      expect(out.result.label).not.toMatch(/unlikely/i);
    }
  });

  it('clearing the value after Load example re-blocks instead of rescaling', () => {
    const example = getExampleFormValues(calc!);
    const scored = run(example);
    expect(scored.gated).toBe(false);
    if (scored.gated) return;
    expect(scored.result.score).toBe(1);

    const cleared = { ...example, biomarkerValue: null };
    const out = run(cleared);
    expect(out.gated).toBe(false);
    if (out.gated) return;
    expect(out.result.score).toBe('—');
  });

  it('still scores normally when the assay is explicitly not measured', () => {
    const out = run({
      functional: 1,
      morphological: 0,
      rhythm: 'sr',
      biomarker: 'none',
      biomarkerValue: null,
    });
    expect(out.gated).toBe(false);
    if (out.gated) return;
    expect(out.result.score).toBe(1);
    expect(out.result.label).toMatch(/unlikely/i);
  });

  it('still scores a present value against the rhythm-specific cutoffs', () => {
    const sr = run({ functional: 0, morphological: 0, rhythm: 'sr', biomarker: 'nt', biomarkerValue: 125 });
    const af = run({ functional: 0, morphological: 0, rhythm: 'af', biomarker: 'nt', biomarkerValue: 125 });
    expect(sr.gated || af.gated).toBe(false);
    if (sr.gated || af.gated) return;
    expect(sr.result.score).toBe(1);
    expect(af.result.score).toBe(0);
  });

  it('a fresh form is still gated before calculate() runs', () => {
    const missing = getMissingQuestionnaireInputs(calc!, getInitialFormValues(calc!));
    expect(missing.length).toBeGreaterThan(0);
  });
});
