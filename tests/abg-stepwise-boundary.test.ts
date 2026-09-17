import { describe, expect, it } from 'vitest';
import { getCalculator } from '../src/data/calculators';

const calculator = getCalculator('abg-stepwise');
if (!calculator) throw new Error('Missing calculator abg-stepwise');

const baseValues = {
  paco2: 40,
  hco3: 24,
  na: 140,
  cl: 104,
  albumin: 4,
  checkGap: false,
};

function resultAt(ph: number) {
  return calculator.calculate({ ...baseValues, ph });
}

describe('ABG stepwise pH boundaries', () => {
  it('keeps the inclusive lower normal boundary at pH 7.35', () => {
    const result = resultAt(7.35);

    expect(result.interpretation).toContain('Step 1: pH normal-range (7.35–7.45)');
    expect(result.interpretation).not.toContain('Step 1: Acidemia');
    expect(result.label).toBe('Indeterminate');
  });

  it('classifies values immediately below and above the lower boundary correctly', () => {
    expect(resultAt(7.34).interpretation).toContain('Step 1: Acidemia (pH <7.35)');
    expect(resultAt(7.36).interpretation).toContain('Step 1: pH normal-range (7.35–7.45)');
  });

  it('keeps the inclusive upper normal boundary and flags values above it', () => {
    expect(resultAt(7.45).interpretation).toContain('Step 1: pH normal-range (7.35–7.45)');
    expect(resultAt(7.45).interpretation).not.toContain('Step 1: Alkalemia');
    expect(resultAt(7.46).interpretation).toContain('Step 1: Alkalemia (pH >7.45)');
  });
});
