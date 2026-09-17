import { describe, expect, it } from 'vitest';
import { calculators as allCalculators, getCalculator } from '../src/data/calculators';
import type { Calculator, UnitKind } from '../src/types/calculator';
import {
  getActiveQuestionnaireInputs,
  getCanonicalValues,
  getExampleFormValues,
  getInitialFormValues,
  getInvalidSelectValues,
  getMissingQuestionnaireInputs,
  getRangeViolations,
  getStepViolations,
  incompleteResult,
  invalidSelectResult,
  rangeBlockedResult,
  stepBlockedResult,
} from '../src/utils/helpers';
import { UNITS, getCanonicalValue, getUnitOptions, unitInputId } from '../src/utils/units';

type Values = ReturnType<typeof getInitialFormValues>;

/** The production gate order used by CalculatorPage. */
function productionResult(calc: Calculator, values: Values) {
  const missing = getMissingQuestionnaireInputs(calc, values);
  if (missing.length > 0) return incompleteResult(missing);
  const activeInputs = getActiveQuestionnaireInputs(calc, values);
  const rangeViolations = getRangeViolations(activeInputs, values);
  if (rangeViolations.length > 0) return rangeBlockedResult(rangeViolations);
  const stepViolations = getStepViolations(activeInputs, values);
  if (stepViolations.length > 0) return stepBlockedResult(stepViolations);
  const invalidSelects = getInvalidSelectValues(activeInputs, values);
  if (invalidSelects.length > 0) return invalidSelectResult(invalidSelects);
  return calc.calculate(getCanonicalValues(calc.inputs, values));
}

function calculator(id: string): Calculator {
  const calc = getCalculator(id);
  if (!calc) throw new Error(`Missing calculator ${id}`);
  return calc;
}

describe('shared unit-selector convention', () => {
  it('declares each family once, with a canonical option that matches the calculator unit label', () => {
    for (const [kind, definition] of Object.entries(UNITS) as [UnitKind, (typeof UNITS)[UnitKind]][]) {
      expect(definition.kind).toBe(kind);
      const canonical = definition.options.find((option) => option.value === definition.canonical);
      expect(canonical, `${kind} canonical option`).toBeDefined();
      expect(canonical?.factor).toBe(1);
      expect(canonical?.label).toBe(definition.canonicalLabel);
    }
  });

  it('only marks fields whose declared unit is that family’s canonical unit', () => {
    const offenders: string[] = [];
    for (const calc of allCalculators) {
      for (const input of calc.inputs) {
        if (!input.unitKind || input.type !== 'number') continue;
        const expected = UNITS[input.unitKind].canonicalLabel;
        if (input.unit !== expected) {
          offenders.push(`${calc.id}.${input.id}: unit ${String(input.unit)} (expected ${expected})`);
        }
        if (input.unitKind !== 'fio2' && input.unitKind !== 'ddimer' && input.unitKind !== 'cholesterol') {
          expect(input.min, `${calc.id}.${input.id} min`).toBeDefined();
          expect(input.max, `${calc.id}.${input.id} max`).toBeDefined();
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('converts each family into canonical units', () => {
    const weight = { id: 'weight', label: 'Weight', type: 'number' as const, unitKind: 'weight' as const };
    expect(getCanonicalValue(weight, { weight: 154, weight__unit: 'lb' })).toBeCloseTo(69.85, 2);
    expect(getCanonicalValue(weight, { weight: 70, weight__unit: 'kg' })).toBe(70);

    const creat = { id: 'scr', label: 'Creatinine', type: 'number' as const, unitKind: 'creatinine' as const };
    expect(getCanonicalValue(creat, { scr: 88.4, scr__unit: 'umol/L' })).toBeCloseTo(1, 6);
    expect(getCanonicalValue(creat, { scr: 1, scr__unit: 'mg/dL' })).toBe(1);

    const fio2 = { id: 'fio2', label: 'FiO₂', type: 'number' as const, unitKind: 'fio2' as const };
    expect(getCanonicalValue(fio2, { fio2: 40, fio2__unit: 'percent' })).toBeCloseTo(0.4, 6);
    expect(getCanonicalValue(fio2, { fio2: 0.4, fio2__unit: 'fraction' })).toBe(0.4);

    const ddimer = { id: 'ddimer', label: 'D-dimer', type: 'number' as const, unitKind: 'ddimer' as const };
    expect(getCanonicalValue(ddimer, { ddimer: 0.5, ddimer__unit: 'ug/mL FEU' })).toBe(500);
    expect(getCanonicalValue(ddimer, { ddimer: 250, ddimer__unit: 'ng/mL DDU' })).toBe(500);

    // Without a unit choice nothing can be converted yet.
    expect(getCanonicalValue(weight, { weight: 154 })).toBeNull();
  });

  it('blocks calculating until every filled unit field has a unit, and never on a fresh form', () => {
    const calc = calculator('cockcroft-gault');
    const fresh = getInitialFormValues(calc);
    const freshMissing = getMissingQuestionnaireInputs(calc, fresh).map(({ id }) => id);
    expect(freshMissing).toContain('weight');
    expect(freshMissing).not.toContain(unitInputId('weight'));

    const typed = { ...fresh, age: 70, weight: 154, scr: 1, sex: 1 };
    const missing = getMissingQuestionnaireInputs(calc, typed);
    expect(missing.map(({ label }) => label)).toEqual(['Weight — units', 'Serum creatinine — units']);

    const complete = {
      ...typed,
      [unitInputId('weight')]: 'lb',
      [unitInputId('scr')]: 'mg/dL',
    };
    expect(getMissingQuestionnaireInputs(calc, complete)).toEqual([]);
  });

  it('fails closed on a tampered unit value and accepts every declared option', () => {
    const calc = calculator('ckd-epi');
    const values = {
      ...getExampleFormValues(calc),
      scr: 1.2,
      age: 70,
      sex: 'F',
      [unitInputId('scr')]: 'grains',
    };
    expect(getInvalidSelectValues(calc.inputs, values)).toEqual([
      { id: unitInputId('scr'), label: 'Serum creatinine — units', value: 'grains' },
    ]);
    expect(productionResult(calc, values)).toMatchObject({
      score: '—',
      label: 'Invalid selection; please change to proceed',
    });

    for (const option of getUnitOptions('creatinine')) {
      expect(getInvalidSelectValues(calc.inputs, { ...values, [unitInputId('scr')]: option.value })).toEqual([]);
    }
  });

  it('validates ranges in canonical units and skips canonical step grids for converted entries', () => {
    const calc = calculator('cockcroft-gault');
    const example = getExampleFormValues(calc);

    const weight = calc.inputs.find((input) => input.id === 'weight');
    expect(weight).toMatchObject({ min: 20, max: 300 });

    const outrageouslyHeavy = { ...example, weight: 800, [unitInputId('weight')]: 'lb' };
    expect(getRangeViolations(calc.inputs, outrageouslyHeavy).map(({ id, direction }) => `${id}:${direction}`)).toEqual([
      'weight:high',
    ]);

    // 154 lb = 69.85 kg sits off the `step: 1` kilogram grid but is a valid entry.
    const pounds = { ...example, weight: 154, [unitInputId('weight')]: 'lb' };
    expect(getStepViolations(calc.inputs, pounds)).toEqual([]);
  });

  it('requires a unit for an optional field once a value is entered, and never leaks the raw number', () => {
    const calc = calculator('score2-op');
    const hdl = calc.inputs.find((input) => input.id === 'hdl');
    expect(hdl).toMatchObject({ required: false, unit: 'mmol/L', unitKind: 'cholesterol' });

    const withHdlNoUnit = {
      ...getExampleFormValues(calc),
      sex: 'male',
      smoker: false,
      hdl: 60,
      [unitInputId('hdl')]: null,
    };
    expect(getMissingQuestionnaireInputs(calc, withHdlNoUnit).map(({ label }) => label)).toEqual([
      'HDL cholesterol (optional) — units',
    ]);
    expect(getCanonicalValues(calc.inputs, withHdlNoUnit).hdl).toBeNull();

    // The optional field stays optional while it is left empty.
    const withoutHdl = { ...withHdlNoUnit, hdl: null };
    expect(getMissingQuestionnaireInputs(calc, withoutHdl)).toEqual([]);
    expect(productionResult(calc, withoutHdl).label).not.toBe('Enter all required inputs');
  });

  it('ships a complete example for every unit field in the registry', () => {
    const offenders: string[] = [];
    for (const calc of allCalculators) {
      const example = getExampleFormValues(calc);
      for (const input of calc.inputs) {
        if (!input.unitKind) continue;
        if (example[input.id] === undefined || example[input.id] === null) {
          offenders.push(`${calc.id}.${input.id} has no exampleValue`);
        }
        if (example[unitInputId(input.id)] !== UNITS[input.unitKind].canonical) {
          offenders.push(`${calc.id}.${input.id} example unit is not canonical`);
        }
      }
      if (getMissingQuestionnaireInputs(calc, example).some(({ id }) => id.endsWith('__unit'))) {
        offenders.push(`${calc.id} still asks for a unit after loading its example`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('unit selectors change units, not answers', () => {
  it('weight: pounds and the equivalent kilograms produce the same creatinine clearance', () => {
    const calc = calculator('cockcroft-gault');
    const base = { ...getExampleFormValues(calc), age: 70, scr: 1.2, sex: 1 };
    const kilograms = { ...base, weight: 80, [unitInputId('weight')]: 'kg' };
    const pounds = { ...base, weight: 80 * 2.2046226218, [unitInputId('weight')]: 'lb' };

    const kgResult = productionResult(calc, kilograms);
    const lbResult = productionResult(calc, pounds);
    expect(lbResult.score).toBe(kgResult.score);
    expect(lbResult.label).toBe(kgResult.label);
  });

  it('creatinine: µmol/L and the equivalent mg/dL produce the same eGFR', () => {
    const calc = calculator('ckd-epi');
    const base = { ...getExampleFormValues(calc), age: 70, sex: 'F' };
    const mgdl = { ...base, scr: 1.2, [unitInputId('scr')]: 'mg/dL' };
    const umol = { ...base, scr: 1.2 * 88.4, [unitInputId('scr')]: 'umol/L' };

    const mgResult = productionResult(calc, mgdl);
    const siResult = productionResult(calc, umol);
    expect(siResult.score).toBe(mgResult.score);
    expect(siResult.label).toBe(mgResult.label);
  });

  it('FiO₂: percent and the equivalent fraction produce the same P/F ratio', () => {
    const calc = calculator('pf-ratio');
    const fraction = { ...getExampleFormValues(calc), pao2: 80, fio2: 0.4, [unitInputId('fio2')]: 'fraction' };
    const percent = { ...fraction, fio2: 40, [unitInputId('fio2')]: 'percent' };

    const fractionResult = productionResult(calc, fraction);
    const percentResult = productionResult(calc, percent);
    expect(percentResult.score).toBe(200);
    expect(percentResult.score).toBe(fractionResult.score);
    expect(percentResult.label).toBe(fractionResult.label);
  });

  it('D-dimer: DDU and µg/mL FEU entries are compared against the FEU cutoff', () => {
    const calc = calculator('age-adjusted-ddimer');
    const base = { ...getExampleFormValues(calc), age: 70 };

    const feu = { ...base, ddimer: 600, [unitInputId('ddimer')]: 'ng/mL FEU' };
    const ddu = { ...base, ddimer: 300, [unitInputId('ddimer')]: 'ng/mL DDU' };
    const ugml = { ...base, ddimer: 0.6, [unitInputId('ddimer')]: 'ug/mL FEU' };

    const feuResult = productionResult(calc, feu);
    const dduResult = productionResult(calc, ddu);
    const ugmlResult = productionResult(calc, ugml);

    expect(feuResult.score).toBe(700);
    expect(dduResult.score).toBe(feuResult.score);
    expect(ugmlResult.score).toBe(feuResult.score);
    expect(dduResult.label).toBe(feuResult.label);
    expect(ugmlResult.label).toBe(feuResult.label);
    expect(feuResult.details?.find((detail) => detail.label === 'Measured D-dimer')?.value).toBe('600 ng/mL FEU');
  });
});
