import { describe, expect, it } from 'vitest';
import { getCalculator } from '../src/data/calculators';

const noFlags = {
  sepsis: false,
  unstable: false,
  persistentVomiting: false,
  obstruction: false,
  complicated: false,
  maleAnatomic: false,
  failedOutpt: false,
  social: false,
  imagingConcern: false,
};

describe('pyelo-admission antimicrobial guidance', () => {
  it('uses current, individualized guidance without a blanket FQ-first-line statement', () => {
    const calculator = getCalculator('pyelo-admission');
    if (!calculator) throw new Error('Missing calculator pyelo-admission');

    const result = calculator.calculate(noFlags);
    const recommendations = result.recommendations?.join(' ') ?? '';
    const outpatientActions = calculator.nextSteps
      .find((step) => step.condition === 'Outpatient eligible')
      ?.actions.join(' ') ?? '';

    expect(result.score).toBe(0);
    expect(result.label).toBe('Outpatient management often reasonable');
    expect(recommendations).toMatch(/oral therapy/i);
    expect(recommendations).toMatch(/current guideline/i);
    expect(recommendations).toMatch(/local resistance/i);
    expect(recommendations).toMatch(/susceptibility/i);
    expect(recommendations).toMatch(/patient-specific/i);
    expect(recommendations).not.toMatch(/fluoroquinolone/i);
    expect(recommendations).not.toMatch(/first-line/i);
    expect(outpatientActions).toMatch(/current guideline/i);
    expect(outpatientActions).toMatch(/susceptibility/i);
  });

  it('preserves admission disposition thresholds', () => {
    const calculator = getCalculator('pyelo-admission');
    if (!calculator) throw new Error('Missing calculator pyelo-admission');

    const moderate = calculator.calculate({ ...noFlags, complicated: true });
    expect(moderate.score).toBe(2);
    expect(moderate.label).toBe('Consider observation / short stay');

    const admission = calculator.calculate({ ...noFlags, unstable: true, persistentVomiting: true });
    expect(admission.score).toBe(4);
    expect(admission.label).toBe('Admission recommended');

    const critical = calculator.calculate({ ...noFlags, obstruction: true });
    expect(critical.score).toBe(3);
    expect(critical.label).toBe('Admission recommended');
    expect(critical.riskLevel).toBe('critical');
  });
});
