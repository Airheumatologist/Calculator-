import { describe, expect, it } from 'vitest';
import { calculators, getCalculator, searchCalculators } from '../src/data/calculators';

describe('Los Angeles Motor Scale registry identity', () => {
  it('exposes one LAMS calculator under the stable lams id and makes the old id unavailable', () => {
    const lams = getCalculator('lams');

    expect(lams).toBeDefined();
    expect(getCalculator('laps-score')).toBeUndefined();
    expect(calculators.filter((calculator) => calculator.id === 'lams')).toHaveLength(1);
    expect(new Set(calculators.map((calculator) => calculator.id)).size).toBe(calculators.length);
  });

  it('keeps LAMS metadata searchable and names the scale consistently', () => {
    const lams = getCalculator('lams');
    expect(lams).toBeDefined();
    expect(lams!.name).toBe('LAMS (Los Angeles Motor Scale)');
    expect(lams!.shortName).toBe('LAMS');
    expect(lams!.tags).toContain('lams');
    expect(lams!.evidence.summary).toMatch(/Los Angeles Motor Scale \(LAMS\)/);
    expect(lams!.evidence.validation).toMatch(/Los Angeles Motor Scale \(LAMS\)/);
    expect(searchCalculators('lams')).toContain(lams);
  });

  it('preserves the 0–5 motor scoring and common LVO cutoff', () => {
    const lams = getCalculator('lams');
    expect(lams).toBeDefined();
    const result = lams!.calculate({ face: 1, arm: 2, grip: 2 });

    expect(result.score).toBe(5);
    expect(result.unit).toBe('/5');
    expect(result.label).toBe('Higher LVO probability');
    expect(result.details).toContainEqual({ label: 'Common LVO cutoff', value: '≥4' });
  });
});
