import { describe, expect, it } from 'vitest';
import { getCalculator } from '../src/data/calculators';

/**
 * Pass 3 (evidence refresh): the six IDs that pass 2 deferred because they
 * needed an external source lookup rather than an internal-consistency fix.
 *
 * Sources checked 2026-09-16: KDIGO guideline pages, GOLD 2026 report PDF,
 * AHA/PubMed citations, and current US prescribing information (DailyMed /
 * openFDA label text) for apixaban, rivaroxaban, dabigatran, and edoxaban.
 */

function requireCalc(id: string) {
  const calc = getCalculator(id);
  if (!calc) throw new Error(`Missing ${id} calculator`);
  return calc;
}

describe('DOAC renal dose bands match the current US labels', () => {
  const calc = requireCalc('doac-renal-dose');

  const doseFor = (values: Record<string, unknown>) => calc.calculate(values);

  it('rivaroxaban AF uses 20 mg above CrCl 50 and 15 mg for every CrCl ≤50 (no avoid band)', () => {
    const standard = doseFor({ drug: 'riva', indication: 'af', crcl: 60 });
    expect(String(standard.score)).toBe('20 mg once daily with the evening meal');

    for (const crcl of [50, 40, 20, 10]) {
      const reduced = doseFor({ drug: 'riva', indication: 'af', crcl });
      expect(String(reduced.score), `CrCl ${crcl}`).toBe('15 mg once daily with the evening meal');
      expect(reduced.riskLevel).not.toBe('critical');
    }
    // CrCl <30 is outside the studied range, so the band is flagged but kept.
    expect(doseFor({ drug: 'riva', indication: 'af', crcl: 10 }).riskLevel).toBe('high');
    // The "avoid" rule lives in the VTE indication, not AF.
    expect(String(doseFor({ drug: 'riva', indication: 'vte', crcl: 10 }).score)).toContain('Avoid');
  });

  it('apixaban VTE keeps its dose and states the no-renal-adjustment labeling', () => {
    const result = doseFor({ drug: 'apix', indication: 'vte', crcl: 9, age: 70, weight: 80, creatinine: 1.0 });
    expect(String(result.score)).toContain('10 mg BID ×7 days → 5 mg BID');
    expect(String(result.score)).not.toContain('Avoid');
    expect(result.interpretation ?? '').toContain('no dose adjustment for renal impairment');
    expect(result.interpretation ?? '').toContain('ESRD');
  });

  it('apixaban AF still reduces for ≥2 ABC criteria', () => {
    const reduced = doseFor({ drug: 'apix', indication: 'af', crcl: 70, age: 85, weight: 55, creatinine: 1.0 });
    expect(String(reduced.score)).toBe('2.5 mg BID');
    const standard = doseFor({ drug: 'apix', indication: 'af', crcl: 70, age: 70, weight: 80, creatinine: 1.0 });
    expect(String(standard.score)).toBe('5 mg BID');
  });

  it('dabigatran AF reports 75 mg BID at CrCl 15–30 and no band below 15', () => {
    expect(String(doseFor({ drug: 'dabi', indication: 'af', crcl: 60 }).score)).toBe('150 mg BID');
    expect(String(doseFor({ drug: 'dabi', indication: 'af', crcl: 31 }).score)).toBe('150 mg BID');
    expect(String(doseFor({ drug: 'dabi', indication: 'af', crcl: 20 }).score)).toBe('75 mg BID');
    expect(String(doseFor({ drug: 'dabi', indication: 'af', crcl: 14 }).score)).toContain('cannot be provided');
  });

  it('dabigatran AF honours the listed P-gp inhibitors', () => {
    const mid = doseFor({ drug: 'dabi', indication: 'af', crcl: 45, pgpInhibitors: true });
    expect(String(mid.score)).toContain('75 mg BID');
    const severe = doseFor({ drug: 'dabi', indication: 'af', crcl: 22, pgpInhibitors: true });
    expect(String(severe.score)).toContain('Avoid coadministration');
    expect(severe.riskLevel).toBe('high');
  });

  it('dabigatran VTE has no band at CrCl ≤30, matching the capsule label', () => {
    expect(String(doseFor({ drug: 'dabi', indication: 'vte', crcl: 25 }).score)).toContain('cannot be provided');
    expect(String(doseFor({ drug: 'dabi', indication: 'vte', crcl: 60 }).score)).toContain('150 mg BID');
  });

  it('edoxaban keeps the AF >95 restriction and the VTE reduction criteria', () => {
    expect(String(doseFor({ drug: 'edox', indication: 'af', crcl: 97 }).score)).toContain('Prefer alternative');
    expect(String(doseFor({ drug: 'edox', indication: 'af', crcl: 50 }).score)).toBe('30 mg daily');
    expect(String(doseFor({ drug: 'edox', indication: 'vte', crcl: 80, weight: 55 }).score)).toContain('30 mg daily');
    expect(String(doseFor({ drug: 'edox', indication: 'vte', crcl: 80, weight: 80 }).score)).toContain('60 mg daily');
  });

  it('cites the current labels and the 2023 AF guideline, not the retired 2019 update', () => {
    const titles = (calc.evidence?.references ?? []).map(({ title }) => title).join(' | ');
    expect(titles).toMatch(/XARELTO/);
    expect(titles).toMatch(/PRADAXA/);
    expect(titles).toMatch(/ELIQUIS/);
    expect(titles).toMatch(/SAVAYSA/);
    expect(titles).toMatch(/2023 ACC\/AHA\/ACCP\/HRS/);
    const pmids = (calc.evidence?.references ?? []).map(({ pmid }) => pmid);
    expect(pmids).toContain('38033089');
    expect(pmids).not.toContain('30686041');
  });
});

describe('kawasaki disease cites the current AHA statements', () => {
  const calc = requireCalc('kawasaki');

  it('keeps the 2017 criteria source and adds the 2024 update', () => {
    const pmids = (calc.evidence?.references ?? []).map(({ pmid }) => pmid);
    expect(pmids).toContain('28356445');
    expect(pmids).toContain('39534969');
    expect(calc.evidence?.summary ?? '').toMatch(/2024 AHA statement/);
    expect(calc.evidence?.validation ?? '').toMatch(/2017 statement is the source/);
  });

  it('still applies fever + ≥4 principal criteria', () => {
    const classic = calc.calculate({
      fever: true,
      conjunctivitis: true,
      oral: true,
      extremity: true,
      rash: true,
      nodes: false,
    });
    expect(classic.label).toBe('Meets classic Kawasaki criteria');
    const noFever = calc.calculate({ fever: false, conjunctivitis: true, oral: true, extremity: true, rash: true, nodes: true });
    expect(noFever.label).toBe('Fever criterion not met');
  });
});

describe('KDIGO AKI staging keeps the 2012 thresholds and flags the 2026 revision', () => {
  const calc = requireCalc('kdigo-aki');

  it('documents the in-review 2026 AKI/AKD update', () => {
    expect(calc.evidence?.summary ?? '').toContain('2026');
    expect(calc.evidence?.summary ?? '').toMatch(/public review/);
    expect(calc.evidence?.references?.[0]?.year).toBe(2012);
  });

  it('stages by the worse of the creatinine and urine-output criteria', () => {
    expect(calc.calculate({ crStage: 1, uopStage: 0 }).label).toBe('KDIGO Stage 1');
    expect(calc.calculate({ crStage: 1, uopStage: 3 }).label).toBe('KDIGO Stage 3');
    expect(calc.calculate({ crStage: 0, uopStage: 0 }).label).toBe('No AKI by selected criteria');
  });
});

describe('GOLD grading bands are unchanged in the 2026 report', () => {
  const calc = requireCalc('gold-stage');

  it('keeps the four FEV1 bands', () => {
    expect(calc.calculate({ fev1: 95, ratioOk: 'yes' }).label).toBe('GOLD 1 — Mild');
    expect(calc.calculate({ fev1: 80, ratioOk: 'yes' }).label).toBe('GOLD 1 — Mild');
    expect(calc.calculate({ fev1: 79, ratioOk: 'yes' }).label).toBe('GOLD 2 — Moderate');
    expect(calc.calculate({ fev1: 49, ratioOk: 'yes' }).label).toBe('GOLD 3 — Severe');
    expect(calc.calculate({ fev1: 29, ratioOk: 'yes' }).label).toBe('GOLD 4 — Very severe');
  });

  it('records the GLI-Global reference-equation change from the 2026 report', () => {
    expect(calc.evidence?.summary ?? '').toContain('GLI-Global');
    expect(calc.evidence?.references?.[0]?.url).toBe('https://goldcopd.org/2026-gold-report-and-pocket-guide/');
  });
});

describe('LRINEC scoring is unchanged and its cutoff provenance is explicit', () => {
  const calc = requireCalc('lrinec');
  const max = { crp: 200, wbc: 30, hb: 9, na: 130, cr: 2.0, glucose: 220 };

  it('sums to the published maximum of 13', () => {
    expect(calc.calculate(max).score).toBe(13);
    expect(calc.calculate({ crp: 10, wbc: 8, hb: 14, na: 140, cr: 1.0, glucose: 90 }).score).toBe(0);
  });

  it('distinguishes the derivation cutoff from the commonly used band split', () => {
    expect(calc.evidence?.formula ?? '').toMatch(/PPV 92%/);
    expect(calc.evidence?.formula ?? '').toMatch(/≥6/);
    expect(calc.evidence?.references?.[0]?.pmid).toBe('15241098');
  });
});

describe('VBAC model coefficients and citations match the publications', () => {
  const calc = requireCalc('vbac-success');

  const vbacPercent = (values: Record<string, unknown>) => {
    const result = calc.calculate(values);
    if (typeof result.score !== 'number') throw new Error(`Unexpected VBAC score ${String(result.score)}`);
    return result.score;
  };

  it('reproduces the published logistic equation coefficient by coefficient', () => {
    // w = 3.766 − 0.039(age) − 0.060(BMI) + 0.888(prior VD) + 1.003(prior VBAC)
    //     − 0.632(recurring indication) − 0.671(African American) − 0.680(Hispanic)
    const cases: Array<[Record<string, unknown>, number]> = [
      [{ age: 30, bmi: 28, ethnicity: 'other' }, 3.766 - 0.039 * 30 - 0.06 * 28],
      [{ age: 38, bmi: 22, ethnicity: 'other', priorVaginal: true }, 3.766 - 0.039 * 38 - 0.06 * 22 + 0.888],
      [{ age: 41, bmi: 35, ethnicity: 'aa', priorVaginal: true, priorVbac: true }, 3.766 - 0.039 * 41 - 0.06 * 35 + 0.888 + 1.003 - 0.671],
      [{ age: 25, bmi: 31, ethnicity: 'hispanic', recurringIndication: true }, 3.766 - 0.039 * 25 - 0.06 * 31 - 0.632 - 0.68],
    ];

    for (const [values, w] of cases) {
      const expected = Math.round((1 / (1 + Math.exp(-w))) * 100);
      expect(vbacPercent(values), JSON.stringify(values)).toBe(expected);
    }
  });

  it('cites the 2007 antenatal model plus the admission-time calculators', () => {
    const pmids = (calc.evidence?.references ?? []).map(({ pmid }) => pmid);
    expect(pmids).toContain('17400840');
    expect(pmids).toContain('19813165');
    expect(pmids).toContain('38180754');
    expect(calc.pearls ?? []).toEqual(expect.arrayContaining([expect.stringContaining('race-free')]));
  });
});
