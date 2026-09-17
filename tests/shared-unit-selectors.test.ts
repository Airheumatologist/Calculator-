import { describe, expect, it } from 'vitest';
import { getCalculator } from '../src/data/calculators';
import {
  getExampleFormValues,
  getInitialFormValues,
  getMissingQuestionnaireInputs,
} from '../src/utils/helpers';
import { UNITS, getInvalidUnitSelections, unitInputId, withCanonicalUnits } from '../src/utils/units';

/**
 * P0 Wave 3, last bullet: the remaining per-calculator unit selectors
 * (phosphate, bilirubin, vitamin D, Lp(a), magnesium) now ride the shared
 * `unitKind` convention in `src/utils/units.ts` instead of local selects and
 * ad-hoc conversion factors inside `calculate()`.
 */
const MIGRATED = [
  { id: 'phos-replacement', field: 'phos', kind: 'phosphate', canonical: 'mg/dL' },
  { id: 'df-units', field: 'bili', kind: 'bilirubin', canonical: 'mg/dL' },
  { id: 'vitamin-d-status', field: 'level', kind: 'vitaminD', canonical: 'ng/mL' },
  { id: 'lipoprotein-a-risk', field: 'lpa', kind: 'lpa', canonical: 'mg/dL' },
  { id: 'mag-toxicity', field: 'mg', kind: 'magnesium', canonical: 'mg/dL' },
] as const;

describe('shared unit-selector convention (migrated calculators)', () => {
  it.each(MIGRATED)('$id declares $field through unitKind, not a local select', ({ id, field, kind, canonical }) => {
    const calc = getCalculator(id);
    if (!calc) throw new Error(`Missing calculator ${id}`);

    const input = calc.inputs.find((candidate) => candidate.id === field);
    expect(input).toMatchObject({ id: field, type: 'number', unitKind: kind, unit: canonical });
    expect(UNITS[kind as keyof typeof UNITS].canonical).toBe(canonical);

    // The per-calculator unit select is gone; no other input mentions a unit choice.
    const localSelect = calc.inputs.filter(
      (candidate) => candidate.type === 'select' && /unit/i.test(candidate.id)
    );
    expect(localSelect).toEqual([]);
  });

  it.each(MIGRATED)('$id gates on the unit choice once a value is entered', ({ id, field }) => {
    const calc = getCalculator(id);
    if (!calc) throw new Error(`Missing calculator ${id}`);
    const unitKey = unitInputId(field);

    // Blank form: ask for the value, not the unit.
    const blank = getInitialFormValues(calc);
    expect(getMissingQuestionnaireInputs(calc, blank).map(({ id: missing }) => missing)).not.toContain(unitKey);

    // Entered value without a unit choice: block with an explicit unit request.
    const valueOnly = { ...blank, [field]: 1 };
    const missing = getMissingQuestionnaireInputs(calc, valueOnly).map(({ id: missingId }) => missingId);
    expect(missing).toContain(unitKey);
    expect(missing).not.toContain(field);

    // Unknown unit values are rejected as invalid rather than converted.
    const tampered = { ...valueOnly, [unitKey]: 'stone' };
    expect(getInvalidUnitSelections(calc.inputs, tampered).map(({ id: bad }) => bad)).toContain(unitKey);
  });

  it.each(MIGRATED)('$id example loads with the canonical unit selected', ({ id, field, canonical }) => {
    const calc = getCalculator(id);
    if (!calc) throw new Error(`Missing calculator ${id}`);
    const example = getExampleFormValues(calc);

    expect(example[unitInputId(field)]).toBe(canonical);
    expect(getMissingQuestionnaireInputs(calc, example)).toEqual([]);
  });

  it('converts SI entries to the canonical unit the formula expects', () => {
    const phos = getCalculator('phos-replacement');
    if (!phos) throw new Error('Missing phos-replacement calculator');
    // 1.0 mmol/L ≈ 3.1 mg/dL → just above the mild Clark band.
    const siPhos = phos.calculate(
      withCanonicalUnits(phos.inputs, { phos: 1, weight: 70, [unitInputId('phos')]: 'mmol/L' })
    );
    const usPhos = phos.calculate(
      withCanonicalUnits(phos.inputs, { phos: 3.1, weight: 70, [unitInputId('phos')]: 'mg/dL' })
    );
    expect(siPhos.label).toBe('No routine repletion');
    expect(usPhos.label).toBe(siPhos.label);

    const df = getCalculator('df-units');
    if (!df) throw new Error('Missing df-units calculator');
    // 136.8 µmol/L = 8 mg/dL exactly (17.1 µmol/L = 1 mg/dL): DF = 4.6 × 6 + 8 = 35.6 → severe.
    const siBili = df.calculate(
      withCanonicalUnits(df.inputs, { pt: 18, control: 12, bili: 136.8, inr: null, [unitInputId('bili')]: 'umol/L' })
    );
    const usBili = df.calculate(
      withCanonicalUnits(df.inputs, { pt: 18, control: 12, bili: 8, inr: null, [unitInputId('bili')]: 'mg/dL' })
    );
    expect(siBili.score).toBe(usBili.score);
    expect(siBili.score).toBe(35.6);
    expect(siBili.details).toContainEqual({ label: 'Bilirubin used', value: '8 mg/dL' });

    const mag = getCalculator('mag-toxicity');
    if (!mag) throw new Error('Missing mag-toxicity calculator');
    // 5 mEq/L × 1.2 = 6 mg/dL.
    const meq = mag.calculate(withCanonicalUnits(mag.inputs, { mg: 5, [unitInputId('mg')]: 'mEq/L' }));
    const mgdl = mag.calculate(withCanonicalUnits(mag.inputs, { mg: 6, [unitInputId('mg')]: 'mg/dL' }));
    expect(meq.score).toBe(mgdl.score);
    expect(meq.label).toBe(mgdl.label);

    const lpa = getCalculator('lipoprotein-a-risk');
    if (!lpa) throw new Error('Missing lipoprotein-a-risk calculator');
    const molar = lpa.calculate(withCanonicalUnits(lpa.inputs, { lpa: 125, [unitInputId('lpa')]: 'nmol/L' }));
    const mass = lpa.calculate(withCanonicalUnits(lpa.inputs, { lpa: 50, [unitInputId('lpa')]: 'mg/dL' }));
    expect(molar.score).toBe(mass.score);
    expect(molar.label).toBe('Elevated — risk enhancer');

    const vitD = getCalculator('vitamin-d-status');
    if (!vitD) throw new Error('Missing vitamin-d-status calculator');
    const nmol = vitD.calculate(withCanonicalUnits(vitD.inputs, { level: 50, [unitInputId('level')]: 'nmol/L' }));
    const ngml = vitD.calculate(withCanonicalUnits(vitD.inputs, { level: 20, [unitInputId('level')]: 'ng/mL' }));
    expect(nmol.score).toBe(ngml.score);
    expect(nmol.label).toBe('Insufficiency (20–29 ng/mL)');
  });
});
