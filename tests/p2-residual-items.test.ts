import { describe, expect, it } from 'vitest';
import { getCalculator } from '../src/data/calculators';

function calculator(id: string) {
  const calc = getCalculator(id);
  if (!calc) throw new Error(`Missing calculator ${id}`);
  return calc;
}

describe('FENa reports a percentage, not a fraction (P2)', () => {
  const fena = calculator('fena');

  it('formats the result as percent sodium excretion', () => {
    // (UNa × PCr) / (PNa × UCr) × 100 = (20 × 2) / (140 × 100) × 100 = 0.29%
    const prerenal = fena.calculate({ pna: 140, una: 20, pcr: 2, ucr: 100 });
    expect(prerenal.score).toBe(0.29);
    expect(prerenal.unit).toBe('%');
    expect(prerenal.label).toBe('Suggests prerenal');

    // (100 × 3) / (140 × 50) × 100 = 4.29%
    const intrinsic = fena.calculate({ pna: 140, una: 100, pcr: 3, ucr: 50 });
    expect(intrinsic.score).toBe(4.29);
    expect(intrinsic.label).toBe('Suggests ATN / intrinsic');
  });

  it('keeps the 1–2% indeterminate band on both boundaries', () => {
    // UNa 70, PNa 140, PCr 2, UCr 100 → exactly 1.00%
    expect(fena.calculate({ pna: 140, una: 70, pcr: 2, ucr: 100 }).label).toBe('Indeterminate');
    // UNa 140, PNa 140, PCr 2, UCr 100 → exactly 2.00%
    expect(fena.calculate({ pna: 140, una: 140, pcr: 2, ucr: 100 }).label).toBe('Indeterminate');
  });

  it('refuses a non-physiologic denominator instead of emitting Infinity', () => {
    const result = fena.calculate({ pna: 0, una: 20, pcr: 2, ucr: 100 });
    expect(result.score).toBe('—');
    expect(result.label).toBe('Invalid denominator');
  });
});

describe('HSP/IgAV renal criterion units (P2)', () => {
  it('states the ACR equivalence in mass units, not the original typo', () => {
    const calc = calculator('hsp-criteria');
    const renal = calc.inputs.find(({ id }) => id === 'renal');
    expect(renal?.helpText).toContain('≥30 mg/mmol');
    expect(renal?.helpText).toContain('≈300 mg/g');
    expect(renal?.helpText).not.toContain('30 mmol/mg (');
  });
});

describe('NRP minute-of-life targets (P2)', () => {
  const nrp = calculator('nrp-oxygen');

  it('lets 6–9 minutes be selected with interpolated targets', () => {
    const minute = nrp.inputs.find(({ id }) => id === 'minute');
    const values = (minute?.options ?? []).map(({ value }) => Number(value));
    expect(values).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

    for (const minuteValue of [6, 7, 8, 9]) {
      const result = nrp.calculate({ minute: minuteValue, spo2: 85, startFiO2: 'term' });
      expect(result.details).toContainEqual({ label: 'Minute', value: String(minuteValue) });
      expect(result.interpretation).toContain('At ' + minuteValue + ' min of life');
    }

    // 8 minutes is the widest interpolated window: 83–91%.
    const eight = nrp.calculate({ minute: 8, spo2: 85, startFiO2: 'term' });
    expect(eight.details).toContainEqual({ label: 'Target range', value: '83–91%' });
    expect(eight.label).toBe('Within NRP target window');
  });

  it('fails closed for an unknown minute instead of using the 5-minute target', () => {
    const result = nrp.calculate({ minute: 12, spo2: 85, startFiO2: 'term' });
    expect(result.score).toBe('—');
    expect(result.label).toBe('Select a minute of life (1–10)');
  });
});

describe('failure-to-thrive terminal bucket (P2)', () => {
  const ftt = calculator('failure-to-thrive');

  it('caps the terminal band at the maximum reachable score of 8', () => {
    const maxed = ftt.calculate({
      waz: 3,
      crossing: true,
      weightLtLength: true,
      poorGain: true,
      redFlags: true,
      ageMonths: 12,
    });
    expect(maxed.score).toBe(8);
    expect(maxed.label).toBe('Severe / high-risk FTT');
    expect(maxed.riskLevel).toBe('critical');

    const mild = ftt.calculate({
      waz: 0,
      crossing: false,
      weightLtLength: false,
      poorGain: false,
      redFlags: false,
      ageMonths: 12,
    });
    expect(mild.score).toBe(0);
    expect(mild.label).toBe('Low concern for FTT');
  });
});

describe('WHO IMCI pneumonia classification (P2)', () => {
  const who = calculator('who-pneumonia');
  const base = { ageBand: 'child', chestIndrawing: false, danger: false, spo2Low: false, malnutrition: false };

  it('classifies by IMCI rules rather than summing points', () => {
    // 12–59 months, RR 45 → fast breathing alone → pneumonia.
    const fast = who.calculate({ ...base, rr: 45 });
    expect(fast.score).toBe(1);
    expect(fast.label).toBe('Pneumonia (fast breathing)');

    // Same child, no fast breathing, no indrawing → cough/cold.
    const cold = who.calculate({ ...base, rr: 30 });
    expect(cold.score).toBe(0);
    expect(cold.label).toBe('Cough/cold (no pneumonia)');

    // Chest indrawing without danger signs → pneumonia (2014 IMCI update).
    const indrawing = who.calculate({ ...base, rr: 30, chestIndrawing: true });
    expect(indrawing.score).toBe(1);
    expect(indrawing.label).toBe('Pneumonia (chest indrawing, no danger signs)');

    // Fast breathing + indrawing is still pneumonia, not severe.
    const both = who.calculate({ ...base, rr: 45, chestIndrawing: true });
    expect(both.score).toBe(1);
    expect(both.label).toBe('Pneumonia (fast breathing + indrawing)');

    // Any danger sign / hypoxaemia / SAM flag escalates to severe.
    for (const flag of ['danger', 'spo2Low', 'malnutrition'] as const) {
      const severe = who.calculate({ ...base, rr: 30, [flag]: true });
      expect(severe.score, `${flag} must escalate`).toBe(2);
      expect(severe.label).toBe('Severe pneumonia (or very severe disease)');
      expect(severe.riskLevel).toBe('critical');
    }
  });

  it('keeps the age-specific fast-breathing thresholds', () => {
    // 2–11 months: ≥50/min counts as fast.
    expect(who.calculate({ ...base, ageBand: 'infant', rr: 50 }).label).toBe('Pneumonia (fast breathing)');
    expect(who.calculate({ ...base, ageBand: 'infant', rr: 49 }).label).toBe('Cough/cold (no pneumonia)');
    // 12–59 months: ≥40/min counts as fast.
    expect(who.calculate({ ...base, rr: 40 }).label).toBe('Pneumonia (fast breathing)');
    expect(who.calculate({ ...base, rr: 39 }).label).toBe('Cough/cold (no pneumonia)');
  });
});
