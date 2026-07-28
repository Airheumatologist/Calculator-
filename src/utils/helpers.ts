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

export function yesNo(id: string, label: string, pointsYes = 1, helpText?: string) {
  return {
    id,
    label,
    type: 'boolean' as const,
    defaultValue: false,
    options: [
      { label: 'No', value: false, points: 0 },
      { label: 'Yes', value: true, points: pointsYes },
    ],
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
  opts: { unit?: string; min?: number; max?: number; step?: number; defaultValue?: number; helpText?: string; placeholder?: string } = {}
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
    required: true,
  };
}
