import { describe, expect, it } from 'vitest';
import { getCalculator } from '../src/data/calculators';
import { getInitialFormValues, getMissingQuestionnaireInputs } from '../src/utils/helpers';

const calculator = getCalculator('charlson-comorbidity');
if (!calculator) throw new Error('Missing calculator charlson-comorbidity');

function calculate(overrides: Record<string, number | string | boolean | null> = {}) {
  return calculator.calculate({ age: 40, ...overrides });
}

describe('Charlson cerebrovascular disease / hemiplegia hierarchy', () => {
  it.each([
    ['neither condition', {}, 0],
    ['CVA/TIA without hemiplegia', { cva: true }, 1],
    ['hemiplegia/paraplegia', { hemiplegia: true }, 2],
    ['both CVA/TIA and hemiplegia', { cva: true, hemiplegia: true }, 2],
  ])('%s contributes the source-defined points', (_caseName, flags, expectedPoints) => {
    expect(calculate(flags).score).toBe(expectedPoints);
  });

  it('reports that the higher hemiplegia tier supersedes CVA/TIA instead of double-counting', () => {
    const result = calculate({ cva: true, hemiplegia: true });
    const hierarchyDetail = result.details?.find(({ label }) => label === 'CVA/hemiplegia hierarchy');

    expect(hierarchyDetail?.value).toMatch(/\+2/);
    expect(hierarchyDetail?.value).toMatch(/superseded/i);
    expect(hierarchyDetail?.value).toMatch(/no double-counting/i);
    expect(calculator.inputs.find(({ id }) => id === 'cva')?.helpText).toMatch(/higher tier supersedes/i);
    expect(calculator.inputs.find(({ id }) => id === 'hemiplegia')?.helpText).toMatch(/supersedes.*CVA\/TIA/i);
  });

  it('keeps unrelated comorbidity weights additive', () => {
    expect(calculate({ mi: true }).score).toBe(1);
    expect(calculate({ mi: true, cva: true, hemiplegia: true }).score).toBe(3);
  });

  it('does not calculate a fresh form until age and condition answers are entered', () => {
    const values = getInitialFormValues(calculator);
    const missing = getMissingQuestionnaireInputs(calculator, values);

    expect(missing.map(({ id }) => id)).toContain('age');
    expect(missing.map(({ id }) => id)).toContain('cva');
    expect(missing.map(({ id }) => id)).toContain('hemiplegia');
    expect(missing).toHaveLength(calculator.inputs.length);
  });
});
