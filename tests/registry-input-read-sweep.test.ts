import { describe, expect, it } from 'vitest';
import { calculators } from '../src/data/calculators';
import { getExampleFormValues, getInitialFormValues } from '../src/utils/helpers';

/**
 * Registry sweep for the N8 defect class: `calculate()` reading a key from
 * `values` that no `inputs` entry declares.
 *
 * Such a read can never be populated from the form, so it silently evaluates to
 * `undefined` — a legacy alias left behind by a rename. N8 found 15 of them
 * (`haq-di` read `haq_c1`…`haq_c8`, `hfa-peff` read `biomarkerType`/`assay`/
 * `npValue`/`level`/`bnp`/`ntprobnp`, and `eular-acr-myositis-2017` read
 * `skin`).
 *
 * A regex sweep over source text cannot do this job: 27 of the keys it reports
 * are false positives from template-literal ids (`` `q${i + 1}` ``) and from
 * declaration helpers (`gdsForward('gds1', …)`). So this guard records the keys
 * each calculator ACTUALLY reads at runtime, by passing a Proxy and letting the
 * registry itself decide what is declared.
 *
 * Unit-selector keys (`<id>__unit`) are declared by the form via
 * `getInitialFormValues`, so they are part of the allowed set.
 */
function declaredKeys(calc: (typeof calculators)[number]): Set<string> {
  const keys = new Set<string>();
  for (const input of calc.inputs) {
    keys.add(input.id);
    keys.add(`${input.id}__unit`);
  }
  return keys;
}

/** Fills every input so the sweep walks deeper than the blank-form guards. */
function completeValues(calc: (typeof calculators)[number]) {
  const values: Record<string, number | string | boolean | null> = {};
  for (const input of calc.inputs) {
    if (input.type === 'boolean') values[input.id] = false;
    else if (input.type === 'select' || input.type === 'segmented') {
      values[input.id] = input.options?.[0]?.value ?? null;
    } else values[input.id] = input.defaultValue ?? input.min ?? 1;
  }
  return values;
}

/**
 * A caller that never set the questionnaire branch selector. The branching
 * heuristics in several calculators explicitly test `values.<modeInputId> ===
 * undefined`, and that is the exact path `haq-di`'s dead `haq_c1` read sat on,
 * so sweeping only form-like inputs would miss it.
 */
function withoutBranchSelector(calc: (typeof calculators)[number], values: Record<string, unknown>) {
  const modeInputId = (calc as { questionnaire?: { modeInputId?: string } }).questionnaire?.modeInputId;
  if (!modeInputId) return values;
  const copy = { ...values };
  delete copy[modeInputId];
  return copy;
}

function valueFor(input: (typeof calculators)[number]['inputs'][number]): number | string | boolean | null {
  if (input.type === 'boolean') return false;
  if (input.type === 'select' || input.type === 'segmented') return input.options?.[0]?.value ?? null;
  return input.defaultValue ?? input.min ?? 1;
}

/**
 * Callers that populate exactly one field. This matters because several
 * calculators branch on "key A is absent AND key B is absent", and a dense
 * value set hides that path: with every key present-but-null the guard
 * short-circuits before the second absence test is ever evaluated.
 */
function sparseValueSets(calc: (typeof calculators)[number]) {
  const sets: Record<string, unknown>[] = [];
  for (const input of calc.inputs) {
    sets.push({ [input.id]: valueFor(input) });
    sets.push({ [input.id]: null });
    // Every option, not just the first: `hfa-peff` only reaches its `bnp`
    // alias fallback when the selected assay is BNP.
    for (const option of input.options ?? []) {
      if (option.value !== valueFor(input)) sets.push({ [input.id]: option.value });
    }
  }
  return sets;
}

/**
 * Explores the key space adaptively. A dead read can hide behind a branch that
 * is only entered when ANOTHER dead key is present (`haq_c2`…`haq_c8` live
 * behind `values.haq_c1 !== undefined`), and no sweep of declared inputs can
 * ever reach it. So each round re-seeds from the keys the previous round was
 * observed to read, which is what turns the undeclared keys into reachable
 * ones. Rounds are bounded because the key universe is finite.
 */
function undeclaredReads(calc: (typeof calculators)[number], seedSets: Record<string, unknown>[]) {
  const declared = declaredKeys(calc);
  const undeclared = new Set<string>();
  const seenKeys = new Set<string>();
  let frontier = seedSets;

  for (let round = 0; round < 6 && frontier.length > 0; round++) {
    const discovered = new Set<string>();
    for (const values of frontier) {
      let reads: Set<string>;
      try {
        reads = readsFor(calc, values);
      } catch {
        // A throw on these synthetic value sets is out of scope here; the
        // "executes every calculator" test in registry.test.ts owns that.
        continue;
      }
      for (const key of reads) {
        if (!declared.has(key)) undeclared.add(key);
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          discovered.add(key);
        }
      }
    }
    frontier = [...discovered].map((key) => ({ [key]: 1 }));
  }
  return undeclared;
}

function readsFor(calc: (typeof calculators)[number], base: Record<string, unknown>): Set<string> {
  const reads = new Set<string>();
  const observed = new Proxy(base as Record<string, unknown>, {
    get(target, property) {
      if (typeof property === 'string') reads.add(property);
      return target[property];
    },
    has(target, property) {
      if (typeof property === 'string') reads.add(property);
      return property in target;
    },
  });
  calc.calculate(observed as never);
  return reads;
}

describe('calculators only read keys they declare', () => {
  it('never reads an undeclared input key in any execution path', () => {
    const problems: string[] = [];
    for (const calc of calculators) {
      const formLike = [
        getInitialFormValues(calc),
        completeValues(calc),
        { ...completeValues(calc), ...getExampleFormValues(calc) },
      ];
      const seedSets = [
        ...formLike,
        ...formLike.map((values) => withoutBranchSelector(calc, values)),
        ...sparseValueSets(calc),
      ];
      for (const key of undeclaredReads(calc, seedSets)) {
        problems.push(`${calc.id} reads undeclared input key "${key}"`);
      }
    }
    expect(problems).toEqual([]);
  });

  // A guard that cannot fail is not a guard. Plant two dead reads — one
  // directly reachable, one hidden behind the first — and require the sweep to
  // name both. The second one only surfaces if the adaptive rounds work.
  it('detects planted undeclared reads', () => {
    const planted = {
      id: 'planted-alias',
      inputs: [{ id: 'real', type: 'number', label: 'Real' }],
      calculate(values: Record<string, number | undefined>) {
        if (values.legacyGate !== undefined) return (values.legacyHidden ?? 0) + (values.real ?? 0);
        return values.real ?? 0;
      },
    } as unknown as (typeof calculators)[number];

    const seedSets = [getInitialFormValues(planted), completeValues(planted)];
    expect([...undeclaredReads(planted, seedSets)].sort()).toEqual(['legacyGate', 'legacyHidden']);
  });
});
