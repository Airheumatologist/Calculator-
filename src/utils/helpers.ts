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
 * Pass `null` to omit points metadata (formula flags / pathway switches that
 * change score non-linearly and should not show "+N" chips).
 */
export function yesNo(id: string, label: string, pointsYes: number | null = 1, helpText?: string) {
  const options =
    pointsYes === null
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
