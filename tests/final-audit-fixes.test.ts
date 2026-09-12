import { describe, expect, it } from 'vitest';
import { getCalculator } from '../src/data/calculators';

/**
 * Regression tests for findings in final_audit.md that were independently
 * confirmed against source (false positives from the audit are not encoded).
 */
function calc(id: string) {
  const c = getCalculator(id);
  expect(c, `unknown calculator ${id}`).toBeDefined();
  return c!;
}

function n(raw: number | string): number {
  if (typeof raw === 'number') return raw;
  const m = String(raw).replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : Number.NaN;
}

describe('authenticated final_audit critical fixes', () => {
  it('organophosphate: 5 kg mild does not get a 1 mg adult floor', () => {
    const r = calc('organophosphate').calculate({
      severity: 'mild',
      weight: 5,
      bronchorrhea: false,
      bradycardia: false,
    });
    expect(n(r.score)).toBeCloseTo(0.1, 2);
    expect(n(r.score)).toBeLessThan(0.3);
  });

  it('organophosphate: 5 kg severe is 0.05 mg/kg (0.25 mg), not below mild', () => {
    const mild = n(
      calc('organophosphate').calculate({
        severity: 'mild',
        weight: 5,
        bronchorrhea: false,
        bradycardia: false,
      }).score,
    );
    const severe = n(
      calc('organophosphate').calculate({
        severity: 'severe',
        weight: 5,
        bronchorrhea: false,
        bradycardia: false,
      }).score,
    );
    expect(severe).toBeCloseTo(0.25, 2);
    expect(severe).toBeGreaterThanOrEqual(mild);
  });

  it('organophosphate: 70 kg mild remains 1 mg adult start', () => {
    const r = calc('organophosphate').calculate({
      severity: 'mild',
      weight: 70,
      bronchorrhea: false,
      bradycardia: false,
    });
    expect(n(r.score)).toBe(1);
  });

  it('canadian-ct-head: GCS 13 at assessment is not rule-negative', () => {
    const r = calc('canadian-ct-head').calculate({
      gcs: 13,
      gcsLow2h: false,
      openDepressed: false,
      basalSkull: false,
      vomit2: false,
      age65: false,
      amnesia30: false,
      dangerousMech: false,
    });
    expect(`${r.label} ${r.interpretation}`.toLowerCase()).not.toMatch(/not required|rule negative/);
    expect(r.riskLevel).not.toBe('low');
  });

  it('canadian-ct-head: GCS 15 with no criteria stays rule-negative', () => {
    const r = calc('canadian-ct-head').calculate({
      gcs: 15,
      gcsLow2h: false,
      openDepressed: false,
      basalSkull: false,
      vomit2: false,
      age65: false,
      amnesia30: false,
      dangerousMech: false,
    });
    expect(r.riskLevel).toBe('low');
  });

  it('sle-das: PProt yes with proteinuria 0 does not score remission', () => {
    const r = calc('sle-das').calculate({
      arthritis: false,
      sjc: 0,
      mucocutVasc: false,
      localRash: false,
      generalRash: false,
      alopecia: false,
      ulcers: false,
      hypoC: false,
      dsdna: false,
      pprot: true,
      prot: 0,
      thromb: false,
      platCount: 250,
      leuk: false,
      leukCount: 6,
      neuropsych: false,
      systemicVasc: false,
      cardioPulm: false,
      myositis: false,
      serositis: false,
      hemolytic: false,
    });
    expect(n(r.score) === -17.22 || Number.isNaN(n(r.score)) || r.score === '—').toBe(true);
    if (!Number.isNaN(n(r.score)) && r.score !== '—') {
      expect(n(r.score)).not.toBeCloseTo(-17.22, 1);
    }
    expect(`${r.label} ${r.interpretation}`.toLowerCase()).not.toMatch(/remission/);
  });

  it('inr-calc: INR 2.5 is typical therapeutic, not sub-therapeutic', () => {
    const r = calc('inr-calc').calculate({ pt: 30, mnpt: 12, isi: 1 });
    expect(n(r.score)).toBeCloseTo(2.5, 1);
    expect(r.label.toLowerCase()).not.toMatch(/sub-?\s*\/?\s*low-therapeutic|sub-therapeutic/);
    expect(r.label.toLowerCase()).toMatch(/therapeutic/);
  });

  it('tmacs: age and sex do not enter the linear predictor', () => {
    const base = {
      ecgIschemia: false,
      tropRatio: 0,
      radiatingPain: false,
      vomiting: false,
      sweating: false,
      hypotension: false,
      worseningAngina: false,
    };
    const a = calc('tmacs').calculate({ ...base, male: true, age: 90 });
    const b = calc('tmacs').calculate({ ...base, male: false, age: 40 });
    expect(n(a.score)).toBeCloseTo(n(b.score), 5);
  });

  it('wifi-diabetic-foot: W2-I2-fI1 is clinical stage 4 (high), not a moderate sum', () => {
    const r = calc('wifi-diabetic-foot').calculate({ wound: 2, ischemia: 2, infection: 1 });
    expect(n(r.score)).toBe(4);
    expect(r.riskLevel).toBe('high');
    expect(`${r.label} ${r.interpretation}`).toMatch(/stage 4/i);
  });

  it('dehydration-who: isolated sunken eyes is Plan A, not Plan B', () => {
    const r = calc('dehydration-who').calculate({
      condition: 0,
      eyes: 1,
      thirst: 0,
      skin: 0,
    });
    expect(String(r.score)).toBe('A');
    expect(r.label.toLowerCase()).toMatch(/no dehydration/);
  });

  it('dehydration-who: two “some” signs is Plan B', () => {
    const r = calc('dehydration-who').calculate({
      condition: 1,
      eyes: 1,
      thirst: 0,
      skin: 0,
    });
    expect(String(r.score)).toBe('B');
  });

  it('lintula-score: includes RLQ +4 and bowel sounds +4 (max 32)', () => {
    const r = calc('lintula-score').calculate({
      sex: 2,
      intensity: 2,
      relocation: true,
      vomiting: true,
      fever: true,
      guarding: true,
      rebound: true,
      bowelSounds: 4,
      rlqPain: true,
    });
    expect(n(r.score)).toBe(32);
    expect(r.riskLevel).toBe('high');
  });

  it('cormack-lehane: Grade 4 returns clinical grade 4, not 5', () => {
    const r = calc('cormack-lehane').calculate({ grade: 5 });
    const score = r.score;
    expect(String(score) === '4' || n(score) === 4).toBe(true);
    expect(r.label).toMatch(/grade 4/i);
  });
});

describe('authenticated final_audit high-severity fixes', () => {
  it('ripasa: score 5 is intermediate, not low', () => {
    const r = calc('ripasa').calculate({
      sex: 0,
      age: 0,
      rlqPain: false,
      migration: false,
      anorexia: true,
      nausea: true,
      duration: 0,
      rlqTender: true,
      guarding: false,
      rebound: true,
      rovsing: false,
      fever: true,
      wbc: false,
      negUA: false,
      foreign: false,
    });
    expect(n(r.score)).toBe(5);
    expect(r.riskLevel).not.toBe('low');
  });

  it('gestational-age: EDD uses local calendar date, not UTC ISO', () => {
    const r = calc('gestational-age').calculate({
      lmpYear: 2026,
      lmpMonth: 1,
      lmpDay: 1,
      refYear: 2026,
      refMonth: 1,
      refDay: 1,
    });
    const edd = r.details?.find((d) => /edd/i.test(d.label))?.value;
    expect(edd).toBe('2026-10-08');
  });

  it('news2: single parameter of 3 is urgent review even if total ≤4', () => {
    const r = calc('news2').calculate({
      rr: 3,
      spo2: 0,
      o2air: false,
      temp: 0,
      sbp: 0,
      hr: 0,
      conscious: 0,
    });
    expect(n(r.score)).toBe(3);
    expect(r.riskLevel).not.toBe('low');
  });

  it('boolean-remission-ra: PGA 2.0 still meets Boolean 2.0', () => {
    const r = calc('boolean-remission-ra').calculate({
      tjc28: 0,
      sjc28: 0,
      crp: 0.5,
      pga: 2.0,
      revision: '2022',
    });
    expect(n(r.score)).toBe(1);
    expect(`${r.label} ${r.interpretation}`.toLowerCase()).toMatch(/remission/);
  });

  it('score2-diabetes: 5–<10% band is moderate, not high', () => {
    const r = calc('score2-diabetes').calculate({
      age: 50,
      sex: 'female',
      smoker: false,
      sbp: 120,
      nonhdl: 3,
      duration: 1,
      hba1c: 6.5,
      egfr: 90,
      region: 'low',
    });
    const pct = n(r.score);
    if (pct >= 5 && pct < 10) {
      expect(r.riskLevel).toBe('moderate');
      expect(r.label.toLowerCase()).not.toMatch(/^high/);
    }
  });

  it('body-roundness-index: BRI <3.4 is not labeled protective', () => {
    const r = calc('body-roundness-index').calculate({ height: 180, waist: 60 });
    expect(n(r.score)).toBeLessThan(3.4);
    expect(`${r.label} ${r.interpretation}`.toLowerCase()).toMatch(/u-shaped|increased mortality|hr 1\.25/i);
    expect(`${r.label} ${r.interpretation}`.toLowerCase()).not.toMatch(/lower observed mortality than mid/);
  });});
