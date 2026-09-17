import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { calculators } from '../src/data/calculators';

/**
 * Registry-wide input metadata coverage.
 *
 * Two input-metadata fields are load-bearing in the UI and were incomplete
 * across the registry (found via FIB-4, whose four lab fields shipped with
 * bounds but no help text):
 *
 *  - `helpText` — the small line under the label. It carries the operational
 *    definition, scoring anchor, unit, or time window a clinician needs to
 *    answer an item correctly. `src/components/CalculatorForm.tsx` renders it,
 *    and `aria-describedby` wires it to the field.
 *  - `min` / `max` — the upper and lower bounds of a numeric field. They drive
 *    the HTML `min`/`max` attributes, `getRangeViolations()` (which blocks the
 *    result with "Too high/Too low; please change to proceed"), the step
 *    grid, and the `exampleValue` sanity check in `validateCalculator()`.
 *
 * Scope: every declared input, including questionnaire items and survey/direct
 * branch selectors. Help text is expected to be *useful*: the checks below
 * reject placeholders, label restatements, and over-long strings, because the
 * value of the sweep is that a bare or meaningless field fails CI.
 *
 * Run a single data module while you are working on it:
 *
 *     METADATA_AUDIT_FILES=wave6-psych-sleep.ts vitest run tests/input-metadata-coverage.test.ts
 *
 * Without the env var the sweep covers the whole registry.
 */

const CALCULATOR_DIR = join(process.cwd(), 'src/data/calculators');

/** Calculator id → source module basename, for actionable failure output. */
function calculatorFileIndex(): Map<string, string> {
  const index = new Map<string, string>();
  for (const entry of readdirSync(CALCULATOR_DIR)) {
    if (!entry.endsWith('.ts') || entry.startsWith('._') || entry === 'index.ts') continue;
    const source = readFileSync(join(CALCULATOR_DIR, entry), 'utf8');
    for (const match of source.matchAll(/^\s{4}id: '([^']+)'/gm)) {
      if (!index.has(match[1])) index.set(match[1], entry);
    }
  }
  return index;
}

const FILE_BY_ID = calculatorFileIndex();

const SCOPED_FILES = (process.env.METADATA_AUDIT_FILES ?? '')
  .split(',')
  .map((entry) => entry.trim())
  .filter(Boolean);

const inScope = (file: string) => SCOPED_FILES.length === 0 || SCOPED_FILES.includes(file);

const MIN_HELP_TEXT_LENGTH = 4;
const MAX_HELP_TEXT_LENGTH = 600;

const PLACEHOLDERS = new Set(['todo', 'tbd', 'n/a', 'na', 'none', '-', '--', '???', 'help', 'text']);

/**
 * A help text that introduces no token the label does not already contain
 * carries no information ("Age" → "Age", "Total score" → "The total score").
 * Adding a unit or qualifier ("Age" → "Age in years") is fine.
 */
function isLabelRestatement(helpText: string, label: string): boolean {
  const normalize = (value: string) =>
    value
      .toLowerCase()
      .replace(/\([^)]*\)/g, ' ')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  // Parenthetical content counts for the help text ("Pleural effusion (exam or
  // imaging)" does add information); on the label side it is dropped so that a
  // unit note in the label does not excuse a bare help text.
  const help = helpText
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  const cleanLabel = normalize(label);
  if (!help) return true;
  if (help === cleanLabel) return true;
  // "Age" vs "Age of the patient": still a restatement when the help text adds
  // no other token at all.
  const helpTokens = help.split(' ').filter(Boolean);
  const labelTokens = cleanLabel.split(' ').filter(Boolean);
  if (helpTokens.length === 0 || labelTokens.length === 0) return true;
  const labelSet = new Set(labelTokens);
  return helpTokens.every((token) => labelSet.has(token));
}

type Offender = { key: string; file: string; problem: string };

describe('input metadata coverage', () => {
  it('declares helpText on every input and bounds on every numeric input', () => {
    const offenders: Offender[] = [];

    for (const calc of calculators) {
      const file = FILE_BY_ID.get(calc.id) ?? '(unknown module)';
      if (!inScope(file)) continue;

      for (const input of calc.inputs) {
        const key = `${file} :: ${calc.id}.${input.id}`;
        const helpText = typeof input.helpText === 'string' ? input.helpText.trim() : '';

        if (!helpText) {
          offenders.push({ key, file, problem: 'missing helpText' });
        } else if (PLACEHOLDERS.has(helpText.toLowerCase())) {
          offenders.push({ key, file, problem: `placeholder helpText (${helpText})` });
        } else if (helpText.length < MIN_HELP_TEXT_LENGTH) {
          offenders.push({ key, file, problem: `helpText shorter than ${MIN_HELP_TEXT_LENGTH} chars (${helpText})` });
        } else if (helpText.length > MAX_HELP_TEXT_LENGTH) {
          offenders.push({ key, file, problem: `helpText longer than ${MAX_HELP_TEXT_LENGTH} chars (${helpText.length})` });
        } else if (isLabelRestatement(helpText, input.label)) {
          offenders.push({ key, file, problem: `helpText restates the label (${helpText})` });
        }

        if (input.type !== 'number') continue;

        const hasMin = input.min !== undefined && Number.isFinite(input.min);
        const hasMax = input.max !== undefined && Number.isFinite(input.max);
        if (!hasMin || !hasMax) {
          const missing = [!hasMin ? 'min' : null, !hasMax ? 'max' : null].filter(Boolean).join(' and ');
          offenders.push({ key, file, problem: `numeric input missing ${missing}` });
          continue;
        }
        if (!(input.min! < input.max!)) {
          offenders.push({ key, file, problem: `numeric bounds are not increasing (min ${input.min}, max ${input.max})` });
        }
      }
    }

    if (offenders.length > 0) {
      // Grouped by module so parallel workstreams can read off their own files.
      const grouped = new Map<string, Offender[]>();
      for (const offender of offenders) {
        const list = grouped.get(offender.file) ?? [];
        list.push(offender);
        grouped.set(offender.file, list);
      }
      const summary = new Map<string, number>();
      for (const offender of offenders) {
        const kind = offender.problem.replace(/\(.*$/, '').trim();
        summary.set(kind, (summary.get(kind) ?? 0) + 1);
      }
      const report = [...grouped.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([file, list]) => `${file} (${list.length})\n  ${list.map((o) => `${o.key.split(' :: ')[1]} — ${o.problem}`).join('\n  ')}`)
        .join('\n');
      const summaryLine = [...summary.entries()]
        .sort(([, a], [, b]) => b - a)
        .map(([kind, count]) => `${count} × ${kind}`)
        .join('; ');
      console.log(`${offenders.length} input-metadata offenders — ${summaryLine}\n${report}`);
    }

    expect(offenders.map((offender) => offender.key)).toEqual([]);
  });
});
