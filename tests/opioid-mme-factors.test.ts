import { describe, expect, it, vi } from 'vitest';
import { getCalculator } from '../src/data/calculators';
import {
  getInitialFormValues,
  getMissingQuestionnaireInputs,
  incompleteResult,
} from '../src/utils/helpers';

const calculator = getCalculator('opioid-mme');
if (!calculator) throw new Error('Missing opioid-mme calculator');

const cdc2022Factors = {
  morphine: 1,
  hydrocodone: 1,
  oxycodone: 1.5,
  oxymorphone: 3,
  hydromorphone: 5,
  codeine: 0.15,
  tramadol: 0.2,
  tapentadol: 0.4,
  fentanyl_patch: 2.4,
  methadone: 4.7,
} as const;

function resultFor(opioid: keyof typeof cdc2022Factors, dose = 10, freq = 1) {
  return calculator.calculate({ dose, freq, opioid });
}

describe('Opioid MME CDC 2022 conversion factors', () => {
  it('uses the CDC 2022 values for hydromorphone and tramadol', () => {
    expect(resultFor('hydromorphone', 4).score).toBe(20);
    expect(resultFor('tramadol', 100).score).toBe(20);

    expect(resultFor('hydromorphone', 4).details).toEqual(expect.arrayContaining([
      { label: 'CDC 2022 conversion factor', value: '5' },
    ]));
    expect(resultFor('tramadol', 100).details).toEqual(expect.arrayContaining([
      { label: 'CDC 2022 conversion factor', value: '0.2' },
    ]));
  });

  it.each(Object.entries(cdc2022Factors))('retains the CDC 2022 factor for %s', (opioid, factor) => {
    const result = resultFor(opioid as keyof typeof cdc2022Factors);
    expect(result.score).toBe(10 * factor);
    expect(result.details).toEqual(expect.arrayContaining([
      { label: 'CDC 2022 conversion factor', value: String(factor) },
    ]));
  });

  it('identifies the current CDC source and preserves the opioid-rotation warning', () => {
    expect(calculator.sourceVersion).toBe('CDC Clinical Practice Guideline 2022 MME table');
    expect(calculator.evidence.summary).toMatch(/CDC Clinical Practice Guideline.*2022/i);
    expect(calculator.evidence.summary).toMatch(/hydromorphone ×5\.0.*tramadol ×0\.2/i);
    expect(calculator.evidence.formula).toMatch(/Do not use calculated MME.*replacement opioid dose/i);
    expect(calculator.evidence.validation).toMatch(/not.*opioid rotation/i);
    expect(calculator.evidence.references).toEqual(expect.arrayContaining([
      expect.objectContaining({
        title: expect.stringMatching(/CDC Clinical Practice Guideline.*2022.*MME table/i),
        url: 'https://www.cdc.gov/mmwr/volumes/71/rr/rr7103a1.htm',
      }),
    ]));
    expect(calculator.inputs.find(({ id }) => id === 'dose')?.helpText).toMatch(/Do not use this tool to switch opioids/i);
  });

  it('keeps a fresh form blank and blocked by the required-input gate', () => {
    const freshValues = getInitialFormValues(calculator);
    expect(freshValues).toEqual({ dose: null, freq: null, opioid: null });

    const missing = getMissingQuestionnaireInputs(calculator, freshValues);
    expect(missing.map(({ id }) => id)).toEqual(['dose', 'freq', 'opioid']);

    const calculate = vi.spyOn(calculator, 'calculate');
    const result = incompleteResult(missing);
    expect(result).toMatchObject({ score: '—', label: 'Enter all required inputs', riskLevel: 'info' });
    expect(calculate).not.toHaveBeenCalled();
    calculate.mockRestore();
  });
});
