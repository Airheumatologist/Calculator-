import { describe, expect, it } from 'vitest';
import { getCalculator } from '../src/data/calculators';

const calculator = getCalculator('hcm-risk-scd');
if (!calculator) throw new Error('Missing calculator hcm-risk-scd');

const profile = {
  mwt: 20,
  la: 45,
  lvot: 30,
  fhScd: true,
  nsvt: true,
  syncope: false,
  abnormalBP: false,
};

describe('HCM Risk-SCD age scope and 2023 ESC framing', () => {
  it('does not calculate an adult score below age 16', () => {
    const result = calculator.calculate({ ...profile, age: 15.99 });
    const copy = [
      result.label,
      result.interpretation,
      ...(result.recommendations ?? []),
      ...(result.details?.map(({ value }) => value) ?? []),
    ].join(' ');

    expect(result).toMatchObject({
      score: '—',
      label: 'HCM Risk-SCD not applicable (<16 years)',
      riskLevel: 'info',
    });
    expect(copy).toMatch(/no risk score/i);
    expect(copy).toMatch(/pediatric.*specialist|specialist.*pediatric/i);
    expect(copy).toMatch(/HCM Risk-Kids|PRIMaCY/i);
    expect(copy).toMatch(/not use.*adult.*model|adult.*model.*not/i);
  });

  it('calculates at the exact lower boundary and preserves the published formula', () => {
    const result = calculator.calculate({ ...profile, age: 16 });

    expect(result).toMatchObject({ score: 13.8, unit: '% / 5y', riskLevel: 'high' });
    expect(result.details).toEqual(
      expect.arrayContaining([
        { label: 'Prognostic index', value: '4.3073' },
        { label: 'MWT / LA / LVOT / age', value: '20 mm / 45 mm / 30 mmHg / 16 y' },
      ]),
    );
  });

  it('keeps the validated upper age boundary and computes at age 80', () => {
    const ageInput = calculator.inputs.find((input) => input.id === 'age');
    expect(ageInput).toMatchObject({ min: 16, max: 80 });
    expect(calculator.whenToUse).toMatch(/16–80 years/i);

    const result = calculator.calculate({ ...profile, age: 80 });
    expect(result).toMatchObject({ score: 4.6, unit: '% / 5y', riskLevel: 'moderate' });
  });

  it('does not extrapolate the adult model above age 80', () => {
    const result = calculator.calculate({ ...profile, age: 80.01 });
    const copy = `${result.label} ${result.interpretation} ${(result.recommendations ?? []).join(' ')}`;

    expect(result).toMatchObject({
      score: '—',
      label: 'HCM Risk-SCD not applicable (>80 years)',
      riskLevel: 'info',
    });
    expect(copy).toMatch(/above age 80|above.*80|>80/i);
    expect(copy).toMatch(/HCM specialist/i);
    expect(copy).toMatch(/not.*alone|not.*by itself/i);
  });

  it('keeps ICD language tied to 2023 ESC shared decision-making, not the model alone', () => {
    const resultCopy = calculator.calculate({ ...profile, age: 16 }).interpretation;
    const nextStepCopy = calculator.nextSteps.flatMap(({ actions }) => actions).join(' ');

    expect(resultCopy).toMatch(/2023 ESC/i);
    expect(resultCopy).toMatch(/model output alone does not (determine|mandate)/i);
    expect(calculator.evidence.summary).toMatch(/2023 ESC/i);
    expect(calculator.evidence.summary).toMatch(/aid to shared decision-making/i);
    expect(calculator.evidence.formula).toMatch(/support.*not replace.*2023 ESC/i);
    expect(calculator.evidence.references).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ pmid: '24126876', doi: '10.1093/eurheartj/eht439' }),
        expect.objectContaining({ year: 2023, doi: '10.1093/eurheartj/ehad194' }),
      ]),
    );
    expect(nextStepCopy).toMatch(/2023 ESC/i);
    expect(nextStepCopy).toMatch(/model output alone does not (determine|mandate)/i);
  });
});
