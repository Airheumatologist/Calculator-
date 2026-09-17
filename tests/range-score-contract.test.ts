import { describe, expect, it } from 'vitest';
import { getCalculator } from '../src/data/calculators';

/**
 * P2 fix: `warfarin-inr-goal` and `fluid-bolus-peds` used to headline a
 * display string (`"2-3"`, `"100 / 200"`) in `Result.score`. Both now return a
 * numeric score and keep the range/pair in the label, interpretation, and
 * details, so the headline number is always machine-readable. (Other tools
 * such as blood pressure still legitimately score `"120/80"`; they are out of
 * scope here.)
 */
describe('range-style score contract', () => {
  it('warfarin-inr-goal reports a numeric lower goal limit plus the full range', () => {
    const calc = getCalculator('warfarin-inr-goal');
    if (!calc) throw new Error('Missing warfarin-inr-goal calculator');

    const indication = calc.inputs.find(({ id }) => id === 'indication');
    expect(indication?.type).toBe('select');
    const options = indication?.options ?? [];
    expect(options.length).toBeGreaterThan(5);

    for (const option of options) {
      const result = calc.calculate({ indication: option.value, recentTe: false });
      expect(typeof result.score, `${String(option.value)} score must be numeric`).toBe('number');
      expect(result.unit).toBe('INR (goal lower limit)');
      expect(result.label).toContain('INR goal');
      expect(String(result.score)).not.toMatch(/NaN|undefined/);
      // The published range stays visible in the label and details.
      const target = result.details?.find(({ label }) => label === 'Target range')?.value ?? '';
      const labelRange = /(\d+(?:\.\d+)?)\s*[–-]\s*(\d+(?:\.\d+)?)/.exec(result.label);
      const detailRange = /(\d+(?:\.\d+)?)\s*[–-]\s*(\d+(?:\.\d+)?)/.exec(target);
      expect(labelRange ?? detailRange, `${String(option.value)} keeps a visible range`).not.toBeNull();
      const [, low, high] = labelRange ?? detailRange!;
      expect(Number(low)).toBe(result.score);
      expect(Number(low)).toBeLessThan(Number(high));
    }

    // Spot-check the guideline anchors the table is built from.
    expect(calc.calculate({ indication: 'af', recentTe: false }).score).toBe(2);
    expect(calc.calculate({ indication: 'vte', recentTe: false }).score).toBe(2);
    expect(calc.calculate({ indication: 'mvr', recentTe: false }).score).toBe(2.5);
    expect(calc.calculate({ indication: 'onx', recentTe: false }).score).toBe(1.5);
  });

  it('warfarin-inr-goal keeps the recent-thromboembolism warning in the interpretation', () => {
    const calc = getCalculator('warfarin-inr-goal');
    if (!calc) throw new Error('Missing warfarin-inr-goal calculator');

    const flagged = calc.calculate({ indication: 'af', recentTe: true });
    const quiet = calc.calculate({ indication: 'af', recentTe: false });

    expect(flagged.score).toBe(quiet.score);
    expect(flagged.interpretation).toContain('Recent TE flag');
    expect(quiet.interpretation).not.toContain('Recent TE flag');
  });

  it('fluid-bolus-peds reports a numeric volume for every dose option', () => {
    const calc = getCalculator('fluid-bolus-peds');
    if (!calc) throw new Error('Missing fluid-bolus-peds calculator');

    const single20 = calc.calculate({ weight: 15, dose: 20, fluid: 'crystalloid' });
    expect(single20.score).toBe(300);
    expect(single20.unit).toBe('mL');

    const single10 = calc.calculate({ weight: 15, dose: 10, fluid: 'crystalloid' });
    expect(single10.score).toBe(150);

    const both = calc.calculate({ weight: 15, dose: 0, fluid: 'crystalloid' });
    // "Both" headlines the typical initial 20 mL/kg bolus…
    expect(both.score).toBe(300);
    expect(typeof both.score).toBe('number');
    // …while both reference volumes stay visible.
    expect(both.label).toContain('10 mL/kg = 150 mL');
    expect(both.label).toContain('20 mL/kg = 300 mL');
    expect(both.details).toContainEqual({ label: '10 mL/kg', value: '150 mL' });
    expect(both.details).toContainEqual({ label: '20 mL/kg', value: '300 mL' });

    for (const result of [single20, single10, both]) {
      expect(typeof result.score).toBe('number');
      expect(String(result.score)).not.toMatch(/NaN|undefined/);
      expect(String(result.score).length).toBeGreaterThan(0);
    }
  });
});
