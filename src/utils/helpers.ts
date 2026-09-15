import type { CalcInput, Calculator, QuestionnaireMetadata } from '../types/calculator';

export function num(v: number | string | boolean | null | undefined, fallback = 0): number {
  if (v === null || v === undefined || v === '') return fallback;
  if (typeof v === 'boolean') return v ? 1 : 0;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : fallback;
}

export function bool(v: number | string | boolean | null | undefined): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (v === 'true' || v === 'yes' || v === '1') return true;
  return false;
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
    return { riskLevel: 'info', label: '—', interpretation: '' };
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
export function yesNo(id: string, label: string, pointsYes: number | null = 1, helpText?: string) {
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
    defaultValue: false,
    options,
    helpText,
  };
}

export function selectInput(
  id: string,
  label: string,
  options: { label: string; value: string | number; points?: number; description?: string }[],
  defaultValue?: string | number,
  helpText?: string
) {
  return {
    id,
    label,
    type: 'select' as const,
    options,
    defaultValue: defaultValue ?? options[0]?.value,
    helpText,
  };
}

export function numberInput(
  id: string,
  label: string,
  opts: {
    unit?: string;
    min?: number;
    max?: number;
    step?: number;
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
    min: opts.min,
    max: opts.max,
    step: opts.step ?? 1,
    defaultValue: opts.defaultValue,
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

const QUESTIONNAIRE_MODE_VALUES = new Set(['survey', 'questionnaire', 'checkboxes', 'regions', 'items', 'itemized']);
const DIRECT_MODE_VALUES = new Set(['direct', 'override', 'precomputed']);

function metadataFor(calc: CalculatorQuestionnaireShape): QuestionnaireMetadata | undefined {
  return calc.questionnaire && typeof calc.questionnaire === 'object' ? calc.questionnaire : undefined;
}

function optionValueIs(value: string | number | boolean, candidates: Set<string>): boolean {
  return typeof value === 'string' && candidates.has(value.toLowerCase());
}

function isQuestionnaireModeInput(input: CalcInput): boolean {
  if (!input.options || input.options.length === 0) return false;
  const hasDirectMode = input.options.some((option) => optionValueIs(option.value, DIRECT_MODE_VALUES));
  const hasQuestionnaireMode = input.options.some((option) => optionValueIs(option.value, QUESTIONNAIRE_MODE_VALUES));
  return hasDirectMode && hasQuestionnaireMode;
}

function isDirectModeValue(
  modeInput: CalcInput,
  value: CalculatorValue,
  metadata?: QuestionnaireMetadata
): boolean {
  if (metadata?.directModeValues?.some((candidate) => candidate === value)) return true;
  if (typeof value !== 'string') return false;
  if (!modeInput.options?.some((option) => option.value === value)) return false;
  return DIRECT_MODE_VALUES.has(value.toLowerCase());
}

/** Whether a calculator is explicitly or conventionally marked as an interactive questionnaire. */
export function isQuestionnaireCalculator(calc: CalculatorQuestionnaireShape): boolean {
  if (typeof calc.isQuestionnaire === 'boolean') return calc.isQuestionnaire;
  if (typeof calc.questionnaire === 'boolean') return calc.questionnaire;
  if (calc.questionnaire) return true;
  return calc.inputs.some(isQuestionnaireModeInput);
}

/** Find the branch selector for a questionnaire, if it has one. */
export function getQuestionnaireModeInput(calc: CalculatorQuestionnaireShape): CalcInput | undefined {
  const configuredId = metadataFor(calc)?.modeInputId;
  if (configuredId) return calc.inputs.find((input) => input.id === configuredId);
  return calc.inputs.find(isQuestionnaireModeInput);
}

function isDirectOverrideInput(input: CalcInput): boolean {
  const id = input.id.toLowerCase();
  const text = `${input.id} ${input.label}`.toLowerCase();
  return (
    id.startsWith('direct') ||
    /\b(direct|override|precomputed)\b/.test(text) ||
    /\b(score|total|raw)\b.*\b(if|entry|input)\b/.test(text)
  );
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

  if (isDirectModeValue(modeInput, modeValue, metadata)) {
    const directIds = metadata?.directInputIds ?? calc.inputs.filter(isDirectOverrideInput).map((input) => input.id);
    if (directIds.length > 0) {
      const activeIds = new Set(directIds);
      return calc.inputs.filter((input) => activeIds.has(input.id));
    }
    // A malformed direct branch should fail closed rather than silently
    // calculating from a default. The missing-input gate will explain what is
    // still required to the user.
    return calc.inputs.filter((input) => input.id !== modeInput.id);
  }

  return calc.inputs.filter((input) => input.id !== modeInput.id && !isDirectOverrideInput(input));
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

/** Required inputs the user has not filled in yet. Zero is a valid value. */
export function getMissingRequiredInputs(
  inputs: { id: string; label: string; type?: string; required?: boolean }[],
  values: Record<string, number | string | boolean | null | undefined>
): MissingRequiredInput[] {
  const missing: MissingRequiredInput[] = [];
  for (const input of inputs) {
    if (input.required !== true) continue;
    if (isMissingValue(values[input.id], input.type === 'number')) {
      missing.push({ id: input.id, label: input.label });
    }
  }
  return missing;
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
  inputs: { id: string; label: string; type: string; min?: number; step?: number }[],
  values: Record<string, number | string | boolean | null | undefined>
): StepViolation[] {
  const violations: StepViolation[] = [];
  for (const input of inputs) {
    if (input.type !== 'number') continue;
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
  inputs: { id: string; label: string; type: string; min?: number; max?: number }[],
  values: Record<string, number | string | boolean | null | undefined>
): RangeViolation[] {
  const violations: RangeViolation[] = [];
  for (const input of inputs) {
    if (input.type !== 'number') continue;
    if (input.min === undefined && input.max === undefined) continue;
    const raw = values[input.id];
    if (raw === null || raw === undefined || raw === '') continue;
    const n = typeof raw === 'number' ? raw : parseFloat(String(raw));
    if (!Number.isFinite(n)) continue;
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
