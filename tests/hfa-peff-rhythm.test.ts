import { describe, expect, it } from 'vitest';
import { getCalculator } from '../src/data/calculators';
import { getExampleFormValues, getInitialFormValues, getMissingRequiredInputs } from '../src/utils/helpers';

const hfa = getCalculator('hfa-peff');
if (!hfa) throw new Error('Missing hfa-peff calculator');

function biomarkerPoints(values: Record<string, number | string | boolean | null>) {
  const result = hfa.calculate(values);
  const detail = result.details?.find(({ label }) => label === 'Biomarker');
  return Number(detail?.value);
}

describe('HFA-PEFF rhythm-specific natriuretic-peptide scoring', () => {
  it('requires an explicit rhythm on a fresh form and provides an example', () => {
    const rhythm = hfa.inputs.find((input) => input.id === 'rhythm');

    expect(rhythm).toMatchObject({ type: 'select', required: true, exampleValue: 'sr' });
    expect(rhythm?.options?.map(({ value }) => value)).toEqual(['sr', 'af']);

    const fresh = getInitialFormValues(hfa);
    expect(fresh.rhythm).toBeNull();
    expect(getMissingRequiredInputs(hfa.inputs, fresh).map(({ id }) => id)).toEqual(
      expect.arrayContaining(['rhythm']),
    );

    const example = getExampleFormValues(hfa);
    expect(example).toMatchObject({ rhythm: 'sr', biomarker: 'nt', biomarkerValue: 125 });
  });

  it.each([
    ['sinus rhythm BNP below minor cutoff', 'sr', 'bnp', 34, 0],
    ['sinus rhythm BNP at minor cutoff', 'sr', 'bnp', 35, 1],
    ['sinus rhythm BNP at major boundary', 'sr', 'bnp', 80, 1],
    ['sinus rhythm BNP above major boundary', 'sr', 'bnp', 81, 2],
    ['atrial fibrillation BNP below minor cutoff', 'af', 'bnp', 104, 0],
    ['atrial fibrillation BNP at minor cutoff', 'af', 'bnp', 105, 1],
    ['atrial fibrillation BNP at major boundary', 'af', 'bnp', 240, 1],
    ['atrial fibrillation BNP above major boundary', 'af', 'bnp', 241, 2],
    ['sinus rhythm NT-proBNP below minor cutoff', 'sr', 'nt', 124, 0],
    ['sinus rhythm NT-proBNP at minor cutoff', 'sr', 'nt', 125, 1],
    ['sinus rhythm NT-proBNP at major boundary', 'sr', 'nt', 220, 1],
    ['sinus rhythm NT-proBNP above major boundary', 'sr', 'nt', 221, 2],
    ['atrial fibrillation NT-proBNP below minor cutoff', 'af', 'nt', 374, 0],
    ['atrial fibrillation NT-proBNP at minor cutoff', 'af', 'nt', 375, 1],
    ['atrial fibrillation NT-proBNP at major boundary', 'af', 'nt', 660, 1],
    ['atrial fibrillation NT-proBNP above major boundary', 'af', 'nt', 661, 2],
  ])('%s', (_label, rhythm, biomarker, level, expected) => {
    expect(
      biomarkerPoints({
        functional: 0,
        morphological: 0,
        rhythm,
        biomarker,
        biomarkerValue: level,
      }),
    ).toBe(expected);
  });

  it('keeps the functional and morphological domains additive and unchanged', () => {
    const result = hfa.calculate({
      functional: 2,
      morphological: 1,
      rhythm: 'af',
      biomarker: 'none',
      biomarkerValue: null,
    });

    expect(result.score).toBe(3);
    expect(result.details).toEqual(
      expect.arrayContaining([
        { label: 'Functional', value: '2' },
        { label: 'Morphological', value: '1' },
        { label: 'Biomarker', value: '0' },
      ]),
    );
  });

  it('documents the original rhythm-specific consensus bands in the calculator copy', () => {
    expect(hfa.evidence.summary).toMatch(/sinus rhythm.*125–220.*35–80.*>220.*>80/i);
    expect(hfa.evidence.summary).toMatch(/AF.*375–660.*105–240.*>660.*>240/i);
    expect(hfa.evidence.formula).toMatch(/375–660/);
    expect(hfa.evidence.formula).toMatch(/major is strictly above/i);
  });
});
