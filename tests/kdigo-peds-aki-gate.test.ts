import { describe, expect, it } from 'vitest';
import { getCalculator } from '../src/data/calculators';
import { getInitialFormValues, getMissingQuestionnaireInputs } from '../src/utils/helpers';

const calculator = getCalculator('kdigo-peds-aki');
if (!calculator) throw new Error('Missing calculator kdigo-peds-aki');

const noOverrides = { dialysis: false, egfr35: false };

describe('Pediatric KDIGO AKI absolute creatinine Stage 3 gate', () => {
  it('requires an acute rise of at least 0.5 mg/dL when current Cr is at least 4.0', () => {
    const unchangedHighBaseline = calculator.calculate({
      baselineCr: 4.0,
      currentCr: 4.0,
      ...noOverrides,
    });
    expect(unchangedHighBaseline.score).toBe(0);

    const belowGate = calculator.calculate({
      baselineCr: 3.6,
      currentCr: 4.0,
      ...noOverrides,
    });
    expect(belowGate.score).toBe(1);
    expect(belowGate.interpretation).toMatch(/absolute Stage 3 gate not met/i);
    expect(belowGate.details?.find(({ label }) => label === 'Absolute Cr Stage 3 gate')?.value).toMatch(/Not met/);

    const atGate = calculator.calculate({
      baselineCr: 3.5,
      currentCr: 4.0,
      ...noOverrides,
    });
    expect(atGate.score).toBe(3);
    expect(atGate.interpretation).toMatch(/Cr ≥4\.0 with acute Δ≥0\.5/);
    expect(atGate.details?.find(({ label }) => label === 'Absolute Cr Stage 3 gate')?.value).toMatch(/Met/);
  });

  it('keeps the ratio, RRT, and pediatric eGFR Stage 3 gates', () => {
    expect(calculator.calculate({ baselineCr: 1, currentCr: 3, ...noOverrides }).score).toBe(3);
    expect(calculator.calculate({ baselineCr: 4, currentCr: 4, dialysis: true, egfr35: false }).score).toBe(3);
    expect(calculator.calculate({ baselineCr: 4, currentCr: 4, dialysis: false, egfr35: true }).score).toBe(3);
  });

  it('leaves a fresh form incomplete', () => {
    const values = getInitialFormValues(calculator);
    const missing = getMissingQuestionnaireInputs(calculator, values);

    expect(missing.map(({ id }) => id)).toEqual(['baselineCr', 'currentCr', 'dialysis', 'egfr35']);
  });
});
