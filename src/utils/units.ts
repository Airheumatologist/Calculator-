import type { CalcInput, UnitKind } from '../types/calculator';

/**
 * Shared unit-selector convention.
 *
 * A calculator declares the canonical unit for a numeric field in
 * `CalcInput.unit` and marks the field with `unitKind`. The engine then:
 *
 *   1. renders one selector per unit family next to the field,
 *   2. stores the choice under `${inputId}__unit`,
 *   3. converts the entered value into the canonical unit before range
 *      validation and before `calculate()` runs,
 *   4. refuses to calculate while the entry unit is still unselected.
 *
 * Conversions are declared once here so every calculator that accepts, say,
 * pounds behaves identically, and so the clinical formulas only ever see the
 * canonical unit they were written for.
 */

export interface UnitOption {
  /** Stored identifier for the choice; also what lands in `values`. */
  value: string;
  /** Short chip label rendered in the form. */
  label: string;
  description: string;
  /** canonicalValue = enteredValue * factor */
  factor: number;
}

export interface UnitDefinition {
  kind: UnitKind;
  /** Option value treated as canonical; matches `CalcInput.unit` of its fields. */
  canonical: string;
  /** Canonical unit text, e.g. `kg`. */
  canonicalLabel: string;
  options: UnitOption[];
}

const KG_PER_LB = 0.45359237;
const UMOL_PER_MGDL_CREATININE = 88.4;
const MGDL_PER_MMOL_CHOLESTEROL = 38.67;
const MGDL_PER_MMOL_PHOSPHATE = 3.1;
const UMOL_PER_MGDL_BILIRUBIN = 17.1;
const NGML_PER_NMOL_VITAMIN_D = 0.4;
const MGDL_PER_NMOL_LPA = 0.4;
const MGDL_PER_MEQ_MAGNESIUM = 1.2;

export const UNITS: Record<UnitKind, UnitDefinition> = {
  weight: {
    kind: 'weight',
    canonical: 'kg',
    canonicalLabel: 'kg',
    options: [
      { value: 'kg', label: 'kg', description: 'Kilograms (canonical unit for every dosing formula).', factor: 1 },
      { value: 'lb', label: 'lb', description: 'Pounds; converted to kilograms (1 lb = 0.45359237 kg).', factor: KG_PER_LB },
    ],
  },
  creatinine: {
    kind: 'creatinine',
    canonical: 'mg/dL',
    canonicalLabel: 'mg/dL',
    options: [
      { value: 'mg/dL', label: 'mg/dL', description: 'Conventional (US) creatinine units.', factor: 1 },
      {
        value: 'umol/L',
        label: 'µmol/L',
        description: 'SI creatinine units; divided by 88.4 to reach mg/dL.',
        factor: 1 / UMOL_PER_MGDL_CREATININE,
      },
    ],
  },
  fio2: {
    kind: 'fio2',
    canonical: 'fraction',
    canonicalLabel: 'fraction',
    options: [
      { value: 'fraction', label: 'fraction', description: 'Fraction of inspired oxygen, 0.21–1.00 (room air 0.21).', factor: 1 },
      { value: 'percent', label: '%', description: 'Percent oxygen, 21–100% (divided by 100).', factor: 0.01 },
    ],
  },
  ddimer: {
    kind: 'ddimer',
    canonical: 'ng/mL FEU',
    canonicalLabel: 'ng/mL FEU',
    options: [
      {
        value: 'ng/mL FEU',
        label: 'ng/mL FEU',
        description: 'Fibrinogen-equivalent units; numerically identical to µg/L FEU.',
        factor: 1,
      },
      { value: 'ug/mL FEU', label: 'µg/mL FEU', description: 'µg/mL (mg/L) FEU; ×1000 to ng/mL.', factor: 1000 },
      {
        value: 'ng/mL DDU',
        label: 'ng/mL DDU',
        description: 'D-dimer units; ×2 to convert to fibrinogen-equivalent units.',
        factor: 2,
      },
      { value: 'ug/mL DDU', label: 'µg/mL DDU', description: 'µg/mL (mg/L) DDU; ×2000 to ng/mL FEU.', factor: 2000 },
    ],
  },
  cholesterol: {
    kind: 'cholesterol',
    canonical: 'mmol/L',
    canonicalLabel: 'mmol/L',
    options: [
      { value: 'mmol/L', label: 'mmol/L', description: 'SI cholesterol units used by the published risk models.', factor: 1 },
      {
        value: 'mg/dL',
        label: 'mg/dL',
        description: 'Conventional US units; divided by 38.67 to reach mmol/L.',
        factor: 1 / MGDL_PER_MMOL_CHOLESTEROL,
      },
    ],
  },
  phosphate: {
    kind: 'phosphate',
    canonical: 'mg/dL',
    canonicalLabel: 'mg/dL',
    options: [
      { value: 'mg/dL', label: 'mg/dL', description: 'Conventional (US) phosphate units.', factor: 1 },
      {
        value: 'mmol/L',
        label: 'mmol/L',
        description: 'SI phosphate units; ×3.1 to reach mg/dL (1 mmol/L ≈ 3.1 mg/dL).',
        factor: MGDL_PER_MMOL_PHOSPHATE,
      },
    ],
  },
  bilirubin: {
    kind: 'bilirubin',
    canonical: 'mg/dL',
    canonicalLabel: 'mg/dL',
    options: [
      { value: 'mg/dL', label: 'mg/dL', description: 'Conventional (US) total bilirubin units.', factor: 1 },
      {
        value: 'umol/L',
        label: 'µmol/L',
        description: 'SI bilirubin units; ÷17.1 to reach mg/dL (17.1 µmol/L = 1 mg/dL).',
        factor: 1 / UMOL_PER_MGDL_BILIRUBIN,
      },
    ],
  },
  vitaminD: {
    kind: 'vitaminD',
    canonical: 'ng/mL',
    canonicalLabel: 'ng/mL',
    options: [
      { value: 'ng/mL', label: 'ng/mL', description: 'Conventional 25-OH vitamin D units.', factor: 1 },
      {
        value: 'nmol/L',
        label: 'nmol/L',
        description: 'SI 25-OH vitamin D units; ÷2.5 to reach ng/mL.',
        factor: NGML_PER_NMOL_VITAMIN_D,
      },
    ],
  },
  lpa: {
    kind: 'lpa',
    canonical: 'mg/dL',
    canonicalLabel: 'mg/dL',
    options: [
      { value: 'mg/dL', label: 'mg/dL', description: 'Lp(a) mass units; bands are defined in mg/dL.', factor: 1 },
      {
        value: 'nmol/L',
        label: 'nmol/L',
        description: 'Lp(a) molar units; ÷2.5 is a commonly cited approximation — assays are not interchangeable.',
        factor: MGDL_PER_NMOL_LPA,
      },
    ],
  },
  magnesium: {
    kind: 'magnesium',
    canonical: 'mg/dL',
    canonicalLabel: 'mg/dL',
    options: [
      { value: 'mg/dL', label: 'mg/dL', description: 'Conventional (US) serum magnesium units.', factor: 1 },
      {
        value: 'mEq/L',
        label: 'mEq/L',
        description: '×1.2 to reach mg/dL (≈ mg/dL ÷ 1.2 in the other direction).',
        factor: MGDL_PER_MEQ_MAGNESIUM,
      },
    ],
  },
};

/** Key that stores a field's chosen entry unit. */
export function unitInputId(inputId: string): string {
  return `${inputId}__unit`;
}

export function getUnitDefinition(kind: UnitKind): UnitDefinition {
  return UNITS[kind];
}

export function getUnitOptions(kind: UnitKind): UnitOption[] {
  return UNITS[kind].options;
}

export function getUnitOption(kind: UnitKind, value: string | number | boolean | null | undefined): UnitOption | undefined {
  if (typeof value !== 'string') return undefined;
  return UNITS[kind].options.find((option) => option.value === value);
}

export function unitFields(inputs: CalcInput[]): CalcInput[] {
  return inputs.filter((input) => Boolean(input.unitKind) && input.type === 'number');
}

export type UnitIssue = {
  id: string;
  label: string;
  value?: string | number | boolean | null;
};

function unitFieldLabel(input: CalcInput): string {
  return `${input.label} — units`;
}

function hasEnteredValue(
  raw: number | string | boolean | null | undefined
): boolean {
  if (raw === null || raw === undefined || raw === '') return false;
  if (typeof raw === 'boolean') return true;
  if (typeof raw === 'number') return Number.isFinite(raw);
  return Number.isFinite(parseFloat(raw));
}

/**
 * Unit fields that need a choice before the calculator can run. Reported only
 * once a value has been typed, so a still-empty field asks for the value rather
 * than for a unit — including optional fields, because an entered number cannot
 * be interpreted without knowing what unit it is in.
 */
export function getMissingUnitSelections(
  inputs: CalcInput[],
  values: Record<string, number | string | boolean | null | undefined>
): { id: string; label: string }[] {
  const missing: { id: string; label: string }[] = [];
  for (const input of unitFields(inputs)) {
    if (!hasEnteredValue(values[input.id])) continue;
    const stored = values[unitInputId(input.id)];
    // A present-but-unknown unit is reported by the invalid-selection gate, not
    // as a missing answer.
    const unselected = stored === null || stored === undefined || stored === '';
    if (unselected) missing.push({ id: unitInputId(input.id), label: unitFieldLabel(input) });
  }
  return missing;
}

/** Unit choices that are not part of the declared option set (tampered state). */
export function getInvalidUnitSelections(
  inputs: CalcInput[],
  values: Record<string, number | string | boolean | null | undefined>
): UnitIssue[] {
  const invalid: UnitIssue[] = [];
  for (const input of unitFields(inputs)) {
    const stored = values[unitInputId(input.id)];
    if (stored === null || stored === undefined || stored === '') continue;
    const kind = input.unitKind as UnitKind;
    if (!getUnitOption(kind, stored)) {
      invalid.push({ id: unitInputId(input.id), label: unitFieldLabel(input), value: stored });
    }
  }
  return invalid;
}

/**
 * Value converted to the canonical unit, or `null` when it cannot be used yet
 * (blank, unparseable, or still missing a unit choice).
 */
export function getCanonicalValue(
  input: CalcInput,
  values: Record<string, number | string | boolean | null | undefined>
): number | null {
  const raw = values[input.id];
  if (raw === null || raw === undefined || raw === '') return null;
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw));
  if (!Number.isFinite(n)) return null;
  if (!input.unitKind) return n;
  const option = getUnitOption(input.unitKind, values[unitInputId(input.id)]);
  if (!option) return null;
  return n * option.factor;
}

export function isUnitField(input: CalcInput): boolean {
  return Boolean(input.unitKind) && input.type === 'number';
}

/**
 * Copy of `values` in which every unit-aware field holds its canonical value.
 * `calculate()` therefore only ever sees the units its formula was written for.
 */
export function withCanonicalUnits(
  inputs: CalcInput[],
  values: Record<string, number | string | boolean | null>
): Record<string, number | string | boolean | null> {
  const out: Record<string, number | string | boolean | null> = { ...values };
  for (const input of unitFields(inputs)) {
    // Unconvertible entries (no unit chosen, unparseable text) become `null`
    // rather than leaking a raw number into a formula that assumes canonical
    // units.
    out[input.id] = getCanonicalValue(input, values);
  }
  return out;
}

/** Canonical example values for the derived unit keys (used by "Load example"). */
export function getUnitExampleValues(inputs: CalcInput[]): Record<string, string> {
  const example: Record<string, string> = {};
  for (const input of unitFields(inputs)) {
    const kind = input.unitKind as UnitKind;
    example[unitInputId(input.id)] = UNITS[kind].canonical;
  }
  return example;
}
