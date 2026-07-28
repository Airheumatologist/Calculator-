/**
 * Regression tests for calculator formulas fixed in the full audit.
 * Each case pins a known clinical/math expectation so regressions fail CI.
 */
import { describe, expect, it } from 'vitest';
import { getCalculator, calculators } from '../src/data/calculators';

function calc(id: string) {
  const c = getCalculator(id);
  if (!c) throw new Error(`Missing calculator: ${id}`);
  return c;
}

function score(id: string, values: Record<string, number | string | boolean | null>) {
  return calc(id).calculate(values);
}

describe('inventory integrity', () => {
  it('has unique calculator ids', () => {
    const ids = calculators.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('does not reintroduce placeholder / duplicate ids', () => {
    const banned = [
      'perc-simplified-centor-duplicate-check',
      'wellscriteria-duplicate-avoid',
      'wells-cellulitis-lrinec',
      'killip-duplicate-avoid-shock-index',
    ];
    for (const id of banned) {
      expect(getCalculator(id), id).toBeUndefined();
    }
  });
});

describe('steroid-conversion', () => {
  it('uses 0.75 mg dex/beta ≡ 20 mg HC (not rounded potency 25)', () => {
    const r = score('steroid-conversion', {
      dose: 20,
      from: 20 / 0.75, // betamethasone
      to: 1, // hydrocortisone
    });
    expect(r.score).toBe(533.3);

    const pred = score('steroid-conversion', {
      dose: 20,
      from: 20 / 0.75,
      to: 4, // prednisone
    });
    expect(pred.score).toBe(133.3);
  });

  it('round-trips classic table: 0.75 mg dex → 20 mg HC', () => {
    const r = score('steroid-conversion', {
      dose: 0.75,
      from: 20 / 0.75,
      to: 1,
    });
    expect(r.score).toBe(20);
  });

  it('pred 5 mg → HC 20 mg', () => {
    const r = score('steroid-conversion', { dose: 5, from: 4, to: 1 });
    expect(r.score).toBe(20);
  });
});

describe('corrected-phenytoin', () => {
  it('uses 0.2 binding factor when not ESRD', () => {
    // 10 / (0.2*2.5 + 0.1) = 10 / 0.6 ≈ 16.7
    const r = score('corrected-phenytoin', { total: 10, alb: 2.5, esrd: false });
    expect(r.score).toBe(16.7);
  });

  it('uses 0.1 binding factor in ESRD (not a no-op 0.2)', () => {
    // 10 / (0.1*2.5 + 0.1) = 10 / 0.35 ≈ 28.6
    const r = score('corrected-phenytoin', { total: 10, alb: 2.5, esrd: true });
    expect(r.score).toBe(28.6);
    const normal = score('corrected-phenytoin', { total: 10, alb: 2.5, esrd: false });
    expect(Number(r.score)).toBeGreaterThan(Number(normal.score));
  });
});

describe('timi-ua', () => {
  it('Antman 14-day risk table is not off-by-one', () => {
    const none = score('timi-ua', {
      age65: false,
      risk3: false,
      knownCad: false,
      asa: false,
      severe: false,
      st: false,
      marker: false,
    });
    expect(none.score).toBe(0);
    expect(none.details?.find((d) => d.label.includes('14-day'))?.value).toBe('4.7%');

    const one = score('timi-ua', {
      age65: true,
      risk3: false,
      knownCad: false,
      asa: false,
      severe: false,
      st: false,
      marker: false,
    });
    expect(one.score).toBe(1);
    expect(one.details?.find((d) => d.label.includes('14-day'))?.value).toBe('4.7%');

    const two = score('timi-ua', {
      age65: true,
      risk3: true,
      knownCad: false,
      asa: false,
      severe: false,
      st: false,
      marker: false,
    });
    expect(two.score).toBe(2);
    expect(two.details?.find((d) => d.label.includes('14-day'))?.value).toBe('8.3%');

    const five = score('timi-ua', {
      age65: true,
      risk3: true,
      knownCad: true,
      asa: true,
      severe: true,
      st: false,
      marker: false,
    });
    expect(five.score).toBe(5);
    expect(five.details?.find((d) => d.label.includes('14-day'))?.value).toBe('26.2%');
  });
});

describe('timi-stemi', () => {
  it('reports ~35.9% for score >8 (does not clamp to 27%)', () => {
    // Max-ish score: age≥75(3)+dm(1)+sbp(3)+hr(2)+killip(2)+wt(1)+ant(1)+time(1) = 14
    const r = score('timi-stemi', {
      age65: false,
      age75: true,
      dmHtnAngina: true,
      sbp100: true,
      hr100: true,
      killip2: true,
      weight67: true,
      anterior: true,
      time4: true,
    });
    expect(Number(r.score)).toBeGreaterThan(8);
    expect(r.details?.find((d) => d.label.includes('30-day'))?.value).toBe('35.9%');
  });

  it('score 0 uses 0.8%', () => {
    const r = score('timi-stemi', {
      age65: false,
      age75: false,
      dmHtnAngina: false,
      sbp100: false,
      hr100: false,
      killip2: false,
      weight67: false,
      anterior: false,
      time4: false,
    });
    expect(r.score).toBe(0);
    expect(r.details?.find((d) => d.label.includes('30-day'))?.value).toBe('0.8%');
  });
});

describe('has-bled', () => {
  it('scores drugs and alcohol separately (max 9)', () => {
    const both = score('has-bled', {
      htn: true,
      renal: true,
      liver: true,
      stroke: true,
      bleed: true,
      labile: true,
      elderly: true,
      drugs: true,
      alcohol: true,
    });
    expect(both.score).toBe(9);

    const drugsOnly = score('has-bled', {
      htn: false,
      renal: false,
      liver: false,
      stroke: false,
      bleed: false,
      labile: false,
      elderly: false,
      drugs: true,
      alcohol: false,
    });
    expect(drugsOnly.score).toBe(1);

    const bothDa = score('has-bled', {
      htn: false,
      renal: false,
      liver: false,
      stroke: false,
      bleed: false,
      labile: false,
      elderly: false,
      drugs: true,
      alcohol: true,
    });
    expect(bothDa.score).toBe(2);
  });
});

describe('apache2-simp', () => {
  it('GCS points = 15 − GCS (not SOFA buckets)', () => {
    const base = {
      age: 40, // 0 age pts
      map: 0,
      hr: 0,
      rr: 0,
      na: 0,
      k: 0,
      cr: 0,
      hct: 0,
      wbc: 0,
      chronic: false,
      admitType: 0,
    };
    const gcs15 = score('apache2-simp', { ...base, gcs: 15 });
    expect(gcs15.score).toBe(0);
    expect(gcs15.details?.find((d) => d.label === 'GCS points')?.value).toContain('0');

    const gcs3 = score('apache2-simp', { ...base, gcs: 3 });
    expect(gcs3.score).toBe(12);
  });

  it('chronic health is +5 emergency OR +2 elective, not both stacked', () => {
    const base = {
      age: 40,
      gcs: 15,
      map: 0,
      hr: 0,
      rr: 0,
      na: 0,
      k: 0,
      cr: 0,
      hct: 0,
      wbc: 0,
    };
    const none = score('apache2-simp', { ...base, chronic: false, admitType: 5 });
    expect(none.score).toBe(0);

    const elect = score('apache2-simp', { ...base, chronic: true, admitType: 2 });
    expect(elect.score).toBe(2);

    const emerg = score('apache2-simp', { ...base, chronic: true, admitType: 5 });
    expect(emerg.score).toBe(5);
  });
});

describe('sodium-excretion (Kawasaki)', () => {
  it('includes ×10 creatinine unit factor (not ~3× overestimate)', () => {
    const r = score('sodium-excretion', {
      una: 80,
      ucr: 100,
      age: 50,
      weight: 70,
      height: 170,
      sex: 'M',
    });
    // Corrected formula ≈ 175 mEq/day; old bug ≈ 550
    expect(Number(r.score)).toBeGreaterThan(140);
    expect(Number(r.score)).toBeLessThan(220);
  });
});

describe('hasford-score', () => {
  it('uses Hasford cutoffs 0.78 / 1.48 (not Sokal 0.8 / 1.2)', () => {
    // Score ~1.3 should be intermediate under Hasford, high under wrong Sokal cutoff
    // age≥50 (0.6666) + spleen 10 (0.42) + blasts 2 (0.1168) + eos 2 (0.0826) ≈ 1.286
    const r = score('hasford-score', {
      age: 55,
      spleen: 10,
      blasts: 2,
      eosinophils: 2,
      basophils: 1,
      platelets: 300,
    });
    expect(Number(r.score)).toBeGreaterThan(1.2);
    expect(Number(r.score)).toBeLessThanOrEqual(1.48);
    expect(r.label.toLowerCase()).toMatch(/intermediate/);
  });

  it('labels high only above 1.48', () => {
    // age≥50 + plt≥1500 alone = 0.6666 + 1.0956 = 1.7622 → high
    const r = score('hasford-score', {
      age: 60,
      spleen: 0,
      blasts: 0,
      eosinophils: 0,
      basophils: 0,
      platelets: 1600,
    });
    expect(Number(r.score)).toBeGreaterThan(1.48);
    expect(r.label.toLowerCase()).toMatch(/high/);
  });
});

describe('meld-na', () => {
  it('caps sodium at 137 for OPTN adjustment (no negative adj at Na 140)', () => {
    const at140 = score('meld-na', { meld: 20, na: 140 });
    const at137 = score('meld-na', { meld: 20, na: 137 });
    expect(at140.score).toBe(at137.score);
    expect(at140.score).toBe(20);
  });

  it('raises score when hyponatremic (MELD > 11)', () => {
    const lowNa = score('meld-na', { meld: 20, na: 125 });
    expect(Number(lowNa.score)).toBeGreaterThan(20);
  });
});

describe('sds-zung', () => {
  it('applies classic cutoffs to SDS index, not raw', () => {
    // raw 50 → index 63 → moderate (not mild if wrongly banding raw)
    const r = score('sds-zung', { score: 50 });
    expect(r.score).toBe(63);
    expect(r.unit).toBe('SDS index');
    expect(r.label.toLowerCase()).toMatch(/moderate/);
  });

  it('raw 40 → index 50 → mild', () => {
    const r = score('sds-zung', { score: 40 });
    expect(r.score).toBe(50);
    expect(r.label.toLowerCase()).toMatch(/mild/);
  });
});

describe('crusade', () => {
  it('uses Subherwal HR ladder (71–80 = +1, 111–120 = +10)', () => {
    const base = {
      hct: 42, // 0
      crcl: 150, // 0
      sbp: 150, // +1 (121–180)
      hf: false,
      vascular: false,
      dm: false,
      sex: 'male',
    };
    const hr75 = score('crusade', { ...base, hr: 75 });
    // +1 (HR) +1 (SBP) = 2
    expect(hr75.score).toBe(2);

    const hr115 = score('crusade', { ...base, hr: 115 });
    // +10 (HR) +1 (SBP) = 11
    expect(hr115.score).toBe(11);
  });

  it('uses Subherwal SBP ladder (≤90 = +10, 101–120 = +5)', () => {
    const base = {
      hct: 42,
      crcl: 150,
      hr: 60, // 0
      hf: false,
      vascular: false,
      dm: false,
      sex: 'male',
    };
    const low = score('crusade', { ...base, sbp: 85 });
    expect(low.score).toBe(10);

    const mid = score('crusade', { ...base, sbp: 110 });
    expect(mid.score).toBe(5);
  });

  it('maps quintile bands including 41–50 high and >50 very high', () => {
    // Force high points: female(+8) + hf(+7) + vascular(+6) + dm(+6) + low hct + low crcl + high hr + low sbp
    const high = score('crusade', {
      hct: 30, // 9
      crcl: 20, // 35
      hr: 130, // 11
      sbp: 80, // 10
      hf: true, // 7
      vascular: true, // 6
      dm: true, // 6
      sex: 'female', // 8
    });
    expect(Number(high.score)).toBeGreaterThan(50);
    expect(high.label.toLowerCase()).toMatch(/very high/);
  });
});

describe('incomplete-kawasaki', () => {
  it('counts albumin and ALT as separate of 6 supplemental labs', () => {
    const r = score('incomplete-kawasaki', {
      feverDays: 6,
      clinicalFeatures: 2,
      crpHigh: true,
      esrHigh: false,
      anemia: true,
      pltHigh: false,
      albuminLow: true,
      altHigh: true,
      wbcHigh: false,
      uaWbc: false,
      echoPos: false,
    });
    // 3 of 6 (anemia, alb, alt) with inflam → treat
    expect(String(r.score)).toBe('3/6 labs');
    expect(r.label.toLowerCase()).toMatch(/labs support incomplete/);
  });

  it('does not treat with only 2 of 6 labs', () => {
    const r = score('incomplete-kawasaki', {
      feverDays: 6,
      clinicalFeatures: 2,
      crpHigh: true,
      esrHigh: false,
      anemia: true,
      pltHigh: false,
      albuminLow: true,
      altHigh: false,
      wbcHigh: false,
      uaWbc: false,
      echoPos: false,
    });
    expect(String(r.score)).toBe('2/6 labs');
    expect(r.label.toLowerCase()).not.toMatch(/labs support incomplete/);
  });
});

describe('peld-score', () => {
  it('floors bilirubin, INR, and albumin at 1.0', () => {
    const low = score('peld-score', {
      bili: 0.5,
      inr: 0.8,
      albumin: 0.5,
      ageUnder1: false,
      growthFailure: false,
    });
    const floored = score('peld-score', {
      bili: 1.0,
      inr: 1.0,
      albumin: 1.0,
      ageUnder1: false,
      growthFailure: false,
    });
    expect(low.score).toBe(floored.score);
  });
});

describe('triss', () => {
  it('exposes age ≥55 wording on the age input', () => {
    const c = calc('triss');
    const ageInput = c.inputs.find((i) => i.id === 'age55');
    expect(ageInput?.label).toMatch(/≥\s*55|>=\s*55/);
  });
});

describe('thyroid-storm-burch', () => {
  it('maps 39.3°C tier to +25 band (classic BWPS °F table)', () => {
    const c = calc('thyroid-storm-burch');
    const temp = c.inputs.find((i) => i.id === 'temp');
    const labels = (temp?.options ?? []).map((o) => o.label);
    expect(labels.some((l) => /38\.9–39\.2/.test(l) && /\(20\)/.test(l))).toBe(true);
    expect(labels.some((l) => /39\.3–39\.9/.test(l) && /\(25\)/.test(l))).toBe(true);
  });
});
