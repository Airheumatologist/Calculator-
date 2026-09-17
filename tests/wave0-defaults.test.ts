import { describe, expect, it, vi } from 'vitest';
import { calculators } from '../src/data/calculators';
import { numberInput, getExampleFormValues, getInitialFormValues, getMissingQuestionnaireInputs, getMissingRequiredInputs, selectInput, yesNo } from '../src/utils/helpers';
import { validateCalculator, validateRegistry } from '../src/utils/registry';
import type { Calculator, CalcInput } from '../src/types/calculator';

function calculatorWithInputs(inputs: CalcInput[]): Calculator {
  return {
    id: 'wave0-test',
    name: 'Wave 0 test',
    shortName: 'Wave 0',
    description: 'Test calculator',
    category: 'general',
    tags: [],
    whenToUse: 'Testing only',
    whyUse: 'Testing only',
    inputs,
    calculate: vi.fn(() => ({
      score: 0,
      label: 'Test',
      interpretation: 'Test',
      riskLevel: 'info',
    })),
    evidence: { summary: 'Test', validation: 'Test', references: [{ title: 'Test', citation: 'Test' }] },
    nextSteps: [{ condition: 'Test', actions: ['Test'] }],
  };
}

describe('Wave 0 fail-closed form defaults', () => {
  const inputs = [
    yesNo('flag', 'Flag', null, undefined, true),
    selectInput('choice', 'Choice', [
      { label: 'First', value: 'first' },
      { label: 'Second', value: 'second' },
    ], 'second'),
    numberInput('age', 'Age', { min: 0, max: 120, exampleValue: 42 }),
  ];

  it('leaves boolean, select, and number inputs blank on a fresh/reset form', () => {
    expect(yesNo('fresh-flag', 'Fresh flag')).not.toHaveProperty('defaultValue');
    expect(selectInput('fresh-choice', 'Fresh choice', [{ label: 'Only', value: 'only' }])).not.toHaveProperty('defaultValue');
    expect(numberInput('fresh-age', 'Fresh age')).not.toHaveProperty('defaultValue');
    expect(getInitialFormValues({ inputs })).toEqual({ flag: null, choice: null, age: null });
  });

  it('loads only declared examples through the explicit example path', () => {
    expect(getExampleFormValues({ inputs })).toEqual({ flag: true, choice: 'second', age: 42 });
    expect(getInitialFormValues({ inputs })).toEqual({ flag: null, choice: null, age: null });
  });

  it('recognizes blank boolean/select/number fields as required and gates calculation', () => {
    const calc = calculatorWithInputs(inputs);
    const values = getInitialFormValues(calc);
    const missing = getMissingQuestionnaireInputs(calc, values);
    expect(missing.map(({ id }) => id)).toEqual(['flag', 'choice', 'age']);

    if (missing.length === 0) calc.calculate(values);
    expect(calc.calculate).not.toHaveBeenCalled();
    expect(getMissingRequiredInputs(inputs, values)).toEqual(missing);
  });

  it('rejects a legacy patient defaultValue while validating example values', () => {
    const legacy = calculatorWithInputs([
      { id: 'age', label: 'Age', type: 'number', defaultValue: 40 },
    ] as CalcInput[]);
    expect(validateCalculator(legacy).some((error) => /defaultValue/.test(error))).toBe(true);

    const badExample = calculatorWithInputs([
      { id: 'age', label: 'Age', type: 'number', min: 0, max: 120, exampleValue: 180 },
    ]);
    expect(validateCalculator(badExample)).toContain('wave0-test: input age exampleValue above max');
  });

  it('keeps the registry free of patient defaults and accepts migrated examples', () => {
    expect(validateRegistry(calculators)).toEqual([]);
    expect(calculators.flatMap((calc) => calc.inputs).every((input) => input.defaultValue === undefined)).toBe(true);
    expect(calculators.flatMap((calc) => calc.inputs).some((input) => input.exampleValue !== undefined)).toBe(true);
  });
});
