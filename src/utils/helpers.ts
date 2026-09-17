import type { CalcInput, Calculator, QuestionnaireMetadata, UnitKind } from '../types/calculator';
import {
  getCanonicalValue,
  getInvalidUnitSelections,
  getMissingUnitSelections,
  getUnitExampleValues,
  isUnitField,
  withCanonicalUnits,
} from './units';

export function num(v: number | string | boolean | null | undefined, fallback = 0): number {
  if (v === null || v === undefined || v === '') return fallback;
  if (typeof v === 'boolean') return v ? 1 : 0;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : fallback;
}

const BOOLEAN_TRUE_STRINGS = new Set(['true', 't', 'yes', 'y', '1', 'on']);

export function bool(v: number | string | boolean | null | undefined): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return Number.isFinite(v) && v !== 0;
  if (typeof v !== 'string') return false;
  // Case- and whitespace-insensitive: 'TRUE', ' Yes ', 'Y', '1', 'ON'.
  return BOOLEAN_TRUE_STRINGS.has(v.trim().toLowerCase());
}

export function str(v: number | string | boolean | null | undefined, fallback = ''): string {
  if (v === null || v === undefined) return fallback;
  return String(v);
}

export function round(n: number, decimals = 1): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical' | 'info' | 'normal';

export function riskFromThresholds(
  score: number,
  thresholds: { max: number; level: RiskLevel; label: string; interpretation: string }[]
): { riskLevel: RiskLevel; label: string; interpretation: string } {
  if (!thresholds || thresholds.length === 0) {
    throw new Error('riskFromThresholds requires a non-empty threshold list');
  }
  for (let i = 1; i < thresholds.length; i++) {
    if (!(thresholds[i].max > thresholds[i - 1].max)) {
      throw new Error(
        `riskFromThresholds thresholds must be strictly increasing by max (saw ${thresholds[i - 1].max} then ${thresholds[i].max})`
      );
    }
  }
  for (const t of thresholds) {
    if (score <= t.max) {
      return { riskLevel: t.level, label: t.label, interpretation: t.interpretation };
    }
  }
  const last = thresholds[thresholds.length - 1];
  return { riskLevel: last.level, label: last.label, interpretation: last.interpretation };
}

/**
 * Boolean Yes/No input. Pass `pointsYes` for UI point badges (default 1).
 * Pass `null` or `0` to omit points metadata (formula flags / pathway switches
 * that change score non-linearly, or contextual gates that should not show a
 * misleading "+0" chip).
 */
export function yesNo(
  id: string,
  label: string,
  pointsYes: number | null = 1,
  helpText?: string,
  exampleValue?: boolean,
  required = true
) {
  const options =
    pointsYes === null || pointsYes === 0
      ? [
          { label: 'No', value: false as const },
          { label: 'Yes', value: true as const },
        ]
      : [
          { label: 'No', value: false as const, points: 0 },
          { label: 'Yes', value: true as const, points: pointsYes },
        ];
  return {
    id,
    label,
    type: 'boolean' as const,
    exampleValue,
    options,
    helpText,
    required,
  };
}

export function selectInput(
  id: string,
  label: string,
  options: { label: string; value: string | number; points?: number; description?: string }[],
  exampleValue?: string | number,
  helpText?: string,
  required = true
) {
  return {
    id,
    label,
    type: 'select' as const,
    options,
    exampleValue,
    helpText,
    required,
  };
}

export function numberInput(
  id: string,
  label: string,
  opts: {
    unit?: string;
    unitKind?: UnitKind;
    min?: number;
    max?: number;
    step?: number;
    exampleValue?: number;
    /** @deprecated Ignored; patient defaults must be migrated to exampleValue. */
    defaultValue?: number;
    helpText?: string;
    placeholder?: string;
    /** Set false for inputs the calculator can compute without (blank is a valid state). */
    required?: boolean;
  } = {}
) {
  return {
    id,
    label,
    type: 'number' as const,
    unit: opts.unit,
    unitKind: opts.unitKind,
    min: opts.min,
    max: opts.max,
    step: opts.step ?? 1,
    exampleValue: opts.exampleValue,
    helpText: opts.helpText,
    placeholder: opts.placeholder,
    required: opts.required ?? true,
  };
}

export type MissingRequiredInput = {
  id: string;
  label: string;
};

type CalculatorQuestionnaireShape = Pick<Calculator, 'inputs' | 'isQuestionnaire' | 'questionnaire'>;
type CalculatorValue = number | string | boolean | null | undefined;
type QuestionnaireValues = Record<string, CalculatorValue>;

function metadataFor(calc: CalculatorQuestionnaireShape): QuestionnaireMetadata | undefined {
  return calc.questionnaire && typeof calc.questionnaire === 'object' ? calc.questionnaire : undefined;
}

/**
 * Whether a calculator is explicitly marked as an interactive questionnaire.
 * Branch metadata is declared on the calculator (`isQuestionnaire`,
 * `questionnaire.modeInputId`, `directInputIds`); the engine never infers a
 * branch from input ids or labels.
 */
export function isQuestionnaireCalculator(calc: CalculatorQuestionnaireShape): boolean {
  if (typeof calc.isQuestionnaire === 'boolean') return calc.isQuestionnaire;
  if (typeof calc.questionnaire === 'boolean') return calc.questionnaire;
  return Boolean(calc.questionnaire);
}

/** Find the explicitly declared branch selector for a questionnaire, if any. */
export function getQuestionnaireModeInput(calc: CalculatorQuestionnaireShape): CalcInput | undefined {
  const configuredId = metadataFor(calc)?.modeInputId;
  if (configuredId) return calc.inputs.find((input) => input.id === configuredId);
  return undefined;
}

/** Direct/precomputed branch values must be declared, never guessed. */
function isDirectModeValue(value: CalculatorValue, metadata?: QuestionnaireMetadata): boolean {
  return Boolean(metadata?.directModeValues?.some((candidate) => candidate === value));
}

/**
 * Inputs that can affect the current questionnaire branch. Hidden direct-entry
 * fields are excluded from the survey branch so stale or invalid values there
 * cannot block the active calculation.
 */
export function getActiveQuestionnaireInputs(
  calc: CalculatorQuestionnaireShape,
  values: QuestionnaireValues
): CalcInput[] {
  if (!isQuestionnaireCalculator(calc)) return calc.inputs;

  const modeInput = getQuestionnaireModeInput(calc);
  if (!modeInput) return calc.inputs;

  const metadata = metadataFor(calc);
  const modeValue = values[modeInput.id];
  const modeKey = modeValue === null || modeValue === undefined ? undefined : String(modeValue);
  const configuredIds = modeKey ? metadata?.activeInputIdsByMode?.[modeKey] : undefined;
  if (configuredIds) {
    const activeIds = new Set(configuredIds);
    return calc.inputs.filter((input) => activeIds.has(input.id));
  }

  if (isDirectModeValue(modeValue, metadata)) {
    const directIds = metadata?.directInputIds ?? [];
    if (directIds.length > 0) {
      const activeIds = new Set(directIds);
      return calc.inputs.filter((input) => activeIds.has(input.id));
    }
    // A malformed direct branch should fail closed rather than silently
    // calculating from a default. The missing-input gate will explain what is
    // still required to the user.
    return calc.inputs.filter((input) => input.id !== modeInput.id);
  }

  const directIds = new Set(metadata?.directInputIds ?? []);
  return calc.inputs.filter((input) => input.id !== modeInput.id && !directIds.has(input.id));
}

/** Required/unanswered fields for both marked and inferred questionnaires. */
export function getMissingQuestionnaireInputs(
  calc: CalculatorQuestionnaireShape,
  values: QuestionnaireValues
): MissingRequiredInput[] {
  if (!isQuestionnaireCalculator(calc)) return getMissingRequiredInputs(calc.inputs, values);

  const missing: MissingRequiredInput[] = [];
  const modeInput = getQuestionnaireModeInput(calc);
  if (modeInput && isMissingValue(values[modeInput.id], modeInput.type === 'number')) {
    missing.push({ id: modeInput.id, label: modeInput.label });
  }

  for (const input of getActiveQuestionnaireInputs(calc, values)) {
    // Questionnaire/select/boolean inputs have historically omitted required:
    // true. In a questionnaire, every active item is required unless the data
    // explicitly opts out. This still preserves optional number fields.
    if (input.required === false) continue;
    if (isMissingValue(values[input.id], input.type === 'number')) {
      missing.push({ id: input.id, label: input.label });
    }
  }
  missing.push(...getMissingUnitSelections(getActiveQuestionnaireInputs(calc, values), values));
  return missing;
}

/**
 * `null`, `undefined`, `''` and non-finite numbers count as "not entered".
 * Pass `numeric` for number fields, where an unparseable string ("abc") is
 * also nothing the calculator can use.
 */
export function isMissingValue(
  raw: number | string | boolean | null | undefined,
  numeric = false
): boolean {
  if (raw === null || raw === undefined || raw === '') return true;
  if (typeof raw === 'boolean') return false;
  if (typeof raw === 'number') return !Number.isFinite(raw);
  return numeric ? !Number.isFinite(parseFloat(raw)) : false;
}

/** Patient inputs are required unless they explicitly opt out. */
export function isRequiredInput(input: { type?: string; required?: boolean }): boolean {
  if (input.required === false) return false;
  return true;
}

export function getInitialFormValues(
  calc: CalculatorQuestionnaireShape | undefined
): Record<string, number | string | boolean | null> {
  const values: Record<string, number | string | boolean | null> = {};
  if (!calc) return values;
  for (const input of calc.inputs) {
    values[input.id] = null;
    if (isUnitField(input)) values[`${input.id}__unit`] = null;
  }
  return values;
}

/**
 * Build values for the explicit illustrative-example action. Every field is
 * still blank unless its schema declares an `exampleValue`.
 */
export function getExampleFormValues(
  calc: CalculatorQuestionnaireShape | undefined
): Record<string, number | string | boolean | null> {
  const values = getInitialFormValues(calc);
  if (!calc) return values;
  for (const input of calc.inputs) {
    if (input.exampleValue !== undefined) values[input.id] = input.exampleValue;
  }
  // Explicit unit choices are part of a complete example; every unit field
  // defaults to the canonical unit the formula is written in.
  for (const [id, unit] of Object.entries(getUnitExampleValues(calc.inputs))) {
    values[id] = unit;
  }
  return values;
}

/** Required inputs the user has not filled in yet. Zero is a valid value. */
export function getMissingRequiredInputs(
  inputs: CalcInput[],
  values: Record<string, number | string | boolean | null | undefined>
): MissingRequiredInput[] {
  const missing: MissingRequiredInput[] = [];
  for (const input of inputs) {
    if (!isRequiredInput(input)) continue;
    if (isMissingValue(values[input.id], input.type === 'number')) {
      missing.push({ id: input.id, label: input.label });
    }
  }
  // Unit-aware fields also need their entry unit, but only once a value exists:
  // a blank field should ask for the value, not for its unit.
  missing.push(...getMissingUnitSelections(inputs, values));
  return missing;
}

export type InvalidSelectValue = {
  id: string;
  label: string;
  value: number | string | boolean | null | undefined;
};

/** Select/segmented values that are not in the declared option set. */
export function getInvalidSelectValues(
  inputs: {
    id: string;
    label: string;
    type: string;
    options?: { value: string | number | boolean }[];
    unitKind?: UnitKind;
  }[],
  values: Record<string, number | string | boolean | null | undefined>
): InvalidSelectValue[] {
  const invalid: InvalidSelectValue[] = [];
  for (const input of inputs) {
    if (input.type !== 'select' && input.type !== 'segmented') continue;
    if (!input.options || input.options.length === 0) continue;
    const raw = values[input.id];
    if (isMissingValue(raw, false)) continue;
    if (!input.options.some((option) => option.value === raw)) {
      invalid.push({ id: input.id, label: input.label, value: raw });
    }
  }
  for (const issue of getInvalidUnitSelections(inputs as CalcInput[], values)) {
    invalid.push({ id: issue.id, label: issue.label, value: issue.value });
  }
  return invalid;
}

/**
 * Values as `calculate()` must see them: every unit-aware field converted into
 * its canonical unit. The form keeps showing (and storing) what the user typed.
 */
export function getCanonicalValues(
  inputs: CalcInput[],
  values: Record<string, number | string | boolean | null>
): Record<string, number | string | boolean | null> {
  return withCanonicalUnits(inputs, values);
}

export function invalidSelectResult(invalid: InvalidSelectValue[]): {
  score: string;
  label: string;
  interpretation: string;
  riskLevel: RiskLevel;
  details: { label: string; value: string }[];
} {
  return {
    score: '—',
    label: 'Invalid selection; please change to proceed',
    interpretation: invalid
      .map((item) => `${item.label}: ${String(item.value)} is not an allowed option.`)
      .join(' '),
    riskLevel: 'info',
    details: invalid.map((item) => ({ label: item.label, value: String(item.value) })),
  };
}

export function calculatorErrorResult(id: string): {
  score: string;
  label: string;
  interpretation: string;
  riskLevel: RiskLevel;
  details: { label: string; value: string }[];
} {
  return {
    score: '—',
    label: 'Calculator error — result unavailable',
    interpretation:
      'This tool could not compute a result because of an internal error, not because of missing inputs. Do not interpret this as a clinical score.',
    riskLevel: 'info',
    details: [{ label: 'Calculator', value: id }],
  };
}

/** Live result shown while any required input is still empty; `calculate` must not run. */
export function incompleteResult(missing: MissingRequiredInput[]): {
  score: string;
  label: string;
  interpretation: string;
  riskLevel: RiskLevel;
  details: { label: string; value: string }[];
} {
  const names = missing.map((m) => m.label);
  const list =
    names.length <= 1
      ? names.join('')
      : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

  return {
    score: '—',
    label: 'Enter all required inputs',
    interpretation: names.length
      ? `No result yet — ${list} ${names.length === 1 ? 'is' : 'are'} still empty. Enter every required value to calculate.`
      : 'No result yet — enter every required value to calculate.',
    riskLevel: 'info',
    details: missing.map((m) => ({ label: m.label, value: 'Required' })),
  };
}

export type StepViolation = {
  id: string;
  label: string;
  value: number;
  step: number;
  base: number;
  nearest: number;
};

/** Tolerance for float steps (0.1) where exact modulo arithmetic is unreliable. */
const STEP_EPSILON = 1e-6;

function stepFit(value: number, base: number, step: number): { ok: boolean; nearest: number } {
  const steps = (value - base) / step;
  const rounded = Math.round(steps);
  return {
    ok: Math.abs(steps - rounded) <= STEP_EPSILON * Math.max(1, Math.abs(steps)),
    nearest: round(base + rounded * step, 6),
  };
}

/**
 * A value respects `step` when it is an integer number of steps away from `min`
 * (HTML's step base) or from 0. Both grids are accepted on purpose: several
 * calculators declare a tiny non-round `min` (0.01) next to a coarse `step`
 * (0.1), where the strict HTML rule would reject every sensible value.
 */
export function getStepViolations(
  inputs: { id: string; label: string; type: string; min?: number; step?: number; unitKind?: UnitKind }[],
  values: Record<string, number | string | boolean | null | undefined>
): StepViolation[] {
  const violations: StepViolation[] = [];
  for (const input of inputs) {
    if (input.type !== 'number') continue;
    // `step` is declared in the canonical unit (e.g. 1 kg). A converted entry
    // such as 154 lb = 69.85 kg legitimately sits off that grid, so step
    // strictness only applies to fields without a unit selector. Range checks
    // still run on the canonical value, which is what protects plausibility.
    if (input.unitKind) continue;
    const step = input.step;
    if (step === undefined || !Number.isFinite(step) || step <= 0) continue;
    const raw = values[input.id];
    if (isMissingValue(raw, true)) continue;
    const n = typeof raw === 'number' ? raw : parseFloat(String(raw));
    const hasMin = input.min !== undefined && Number.isFinite(input.min);
    const fromZero = stepFit(n, 0, step);
    const fromMin = hasMin ? stepFit(n, input.min as number, step) : fromZero;
    if (fromZero.ok || fromMin.ok) continue;
    const closer =
      Math.abs(fromMin.nearest - n) < Math.abs(fromZero.nearest - n) ? fromMin : fromZero;
    violations.push({
      id: input.id,
      label: input.label,
      value: n,
      step,
      base: closer === fromMin && hasMin ? (input.min as number) : 0,
      nearest: closer.nearest,
    });
  }
  return violations;
}

export function stepViolationMessage(violation: StepViolation): string {
  return `Must be a multiple of ${violation.step}${
    violation.base !== 0 ? ` from ${violation.base}` : ''
  }; nearest allowed is ${violation.nearest}`;
}

/** Live result shown when a numeric input does not respect its declared step. */
export function stepBlockedResult(violations: StepViolation[]): {
  score: string;
  label: string;
  interpretation: string;
  riskLevel: RiskLevel;
  details: { label: string; value: string }[];
} {
  return {
    score: '—',
    label: 'Invalid step; please change to proceed',
    interpretation: violations
      .map(
        (v) =>
          `${v.label}: ${v.value} is not a multiple of ${v.step}${
            v.base !== 0 ? ` from ${v.base}` : ''
          } (nearest allowed ${v.nearest}).`
      )
      .join(' '),
    riskLevel: 'info',
    details: violations.map((v) => ({
      label: v.label,
      value: `${v.value} (step ${v.step})`,
    })),
  };
}

export type RangeViolation = {
  id: string;
  label: string;
  value: number;
  min?: number;
  max?: number;
  direction: 'low' | 'high';
};

/** Values typed outside an input's min/max (HTML min/max do not block free typing). */
export function getRangeViolations(
  inputs: { id: string; label: string; type: string; min?: number; max?: number; unitKind?: UnitKind }[],
  values: Record<string, number | string | boolean | null | undefined>
): RangeViolation[] {
  const violations: RangeViolation[] = [];
  for (const input of inputs) {
    if (input.type !== 'number') continue;
    if (input.min === undefined && input.max === undefined) continue;
    // Unit-aware fields are judged in the canonical unit, so a 154 lb entry is
    // checked against the kilogram bounds the calculator declares.
    const n = input.unitKind
      ? getCanonicalValue(input as CalcInput, values)
      : (() => {
          const raw = values[input.id];
          if (raw === null || raw === undefined || raw === '') return null;
          const parsed = typeof raw === 'number' ? raw : parseFloat(String(raw));
          return Number.isFinite(parsed) ? parsed : null;
        })();
    if (n === null) continue;
    if (input.min !== undefined && n < input.min) {
      violations.push({
        id: input.id,
        label: input.label,
        value: n,
        min: input.min,
        max: input.max,
        direction: 'low',
      });
    } else if (input.max !== undefined && n > input.max) {
      violations.push({
        id: input.id,
        label: input.label,
        value: n,
        min: input.min,
        max: input.max,
        direction: 'high',
      });
    }
  }
  return violations;
}

export function rangeViolationMessage(direction: 'low' | 'high'): string {
  return direction === 'high'
    ? 'Too high; please change to proceed'
    : 'Too low; please change to proceed';
}

/** Live result shown when any numeric input is outside its declared min/max. */
export function rangeBlockedResult(violations: RangeViolation[]): {
  score: string;
  label: string;
  interpretation: string;
  riskLevel: RiskLevel;
  details: { label: string; value: string }[];
} {
  const hasHigh = violations.some((v) => v.direction === 'high');
  const hasLow = violations.some((v) => v.direction === 'low');
  const label =
    hasHigh && hasLow
      ? 'Out of range; please change to proceed'
      : hasHigh
        ? rangeViolationMessage('high')
        : rangeViolationMessage('low');

  return {
    score: '—',
    label,
    interpretation: violations
      .map((v) =>
        v.direction === 'high'
          ? `${v.label}: too high (maximum ${v.max}).`
          : `${v.label}: too low (minimum ${v.min}).`
      )
      .join(' '),
    riskLevel: 'info',
    details: violations.map((v) => ({
      label: v.label,
      value:
        v.direction === 'high'
          ? `${v.value} (max ${v.max})`
          : `${v.value} (min ${v.min})`,
    })),
  };
}
