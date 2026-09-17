import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
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

/**
 * Data files whose calculators may still be missing an `exampleValue`. Files
 * outside this list must load a complete example, so the working set can only
 * grow. The list covers (a) the files a sweep run reports as partial and
 * (b) files whose backfill exists in the working tree but is not part of this
 * commit — they are allowed to stay partial here and are expected to be removed
 * from the list as their examples land. When the list is empty the strict
 * assertion (`expect(offenders).toEqual([])`) can take over.
 */
const PENDING_EXAMPLE_BACKFILL = [
  'cardiology.ts',
  'critical-care.ts',
  'extra.ts',
  'missing-cardio-pulm.ts',
  'missing-emergency.ts',
  'missing-gi-liver.ts',
  'nephrology-endo.ts',
  'wave2-cardiology.ts',
  'wave2-general-lab.ts',
  'wave2-neuro-psych.ts',
  'wave2-oncology.ts',
  'wave2-ortho-trauma.ts',
  'wave2-pulm-id.ts',
  'wave3-cardio-vasc.ts',
  'wave3-em-surgery.ts',
  'wave3-gi-hep.ts',
  'wave3-nephro-icu.ts',
  'wave3-peds-ob.ts',
  'wave3-tox-endo-heme.ts',
  'wave4-em-id.ts',
  'wave4-formulas.ts',
  'wave4-heme-onc.ts',
  'wave4-icu-vent.ts',
  'wave4-neuro-psych.ts',
  'wave4-primary-endo.ts',
  'wave5-cardio.ts',
  'wave5-general-misc.ts',
  'wave5-nephro-gi.ts',
  'wave5-surg-uro-ent.ts',
  'wave5-tox-psych.ts',
  'wave6-clinical-residual.ts',
  'wave6-em-peds.ts',
  'wave6-heme-onc.ts',
  'wave6-psych-sleep.ts',
  'wave6-scores-residual.ts',
  'wave7-fillins.ts',
  'wave7-highuse.ts',
  'wave7-rheum-class.ts',
];

describe('registry-wide example sweep (pass 2)', () => {
  const complete = calculators.filter(
    (calc) => getMissingQuestionnaireInputs(calc, getExampleFormValues(calc)).length === 0
  );

  it('gives every calculator outside the declared backfill set a complete loadable example', () => {
    // "Load example" must produce a calculable case for every registry entry;
    // an example that still trips the missing-input gate is the bug this
    // asserts against.
    //
    // 2026-09-16: the backfill is in progress. `PENDING_EXAMPLE_BACKFILL` lists
    // the data files whose required inputs still lack an `exampleValue`; every
    // file *not* on that list must already be complete, so the set of working
    // examples can only grow. When the list is empty, replace the assertion
    // below with `expect(offenders).toEqual([])`.
    const offenders = calculators
      .map((calc) => ({
        id: calc.id,
        missing: getMissingQuestionnaireInputs(calc, getExampleFormValues(calc)).map((item) => item.id),
      }))
      .filter(({ missing }) => missing.length > 0)
      .map(({ id, missing }) => `${id}: ${missing.join(', ')}`);

    const dataDir = path.resolve(process.cwd(), 'src/data/calculators');
    const fileOf = new Map<string, string>();
    for (const file of readdirSync(dataDir)) {
      if (!file.endsWith('.ts') || file === 'index.ts') continue;
      const text = readFileSync(path.join(dataDir, file), 'utf8');
      for (const match of text.matchAll(/^ {4}id: '([A-Za-z0-9._-]+)',$/gm)) {
        if (!fileOf.has(match[1])) fileOf.set(match[1], file);
      }
    }

    const unexpected = offenders
      .filter((row) => {
        const id = row.split(':')[0];
        return !PENDING_EXAMPLE_BACKFILL.includes(fileOf.get(id) ?? 'UNKNOWN');
      })
      .filter(Boolean);

    const byFile = new Map<string, string[]>();
    for (const row of offenders) {
      const id = row.split(':')[0];
      const file = fileOf.get(id) ?? 'UNKNOWN';
      byFile.set(file, [...(byFile.get(file) ?? []), row]);
    }
    const pendingFiles = [...byFile.keys()].sort();
    const drift = pendingFiles.filter((file) => !PENDING_EXAMPLE_BACKFILL.includes(file));

    console.info(
      `Complete loadable examples: ${complete.length}/${calculators.length} ` +
        `(pending files: ${pendingFiles.length}, partial calculators: ${offenders.length})`
    );
    if (offenders.length > 0) {
      console.info(
        'Remaining "Load example" backfill (calculator: missing input ids):\n' +
          [...byFile.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([file, rows]) => `${file} — ${rows.length} calculators\n  ${rows.join('\n  ')}`)
            .join('\n')
      );
    }
    // Every file that still has gaps must be declared in
    // PENDING_EXAMPLE_BACKFILL; declaring a file that is already complete is
    // allowed (tighten the list as backfilled files land).
    expect(drift).toEqual([]);
    expect(unexpected).toEqual([]);
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
