import { describe, expect, it } from 'vitest';
import { getCalculator } from '../src/data/calculators';
import { getInitialFormValues, getMissingRequiredInputs } from '../src/utils/helpers';

const bova = getCalculator('bova');

describe('BOVA SBP applicability and scoring', () => {
  it('requires an explicit SBP range on a fresh form', () => {
    expect(bova).toBeDefined();
    if (!bova) return;

    const sbp = bova.inputs.find((input) => input.id === 'sbp');
    expect(sbp).toMatchObject({ type: 'select', required: true });
    expect(sbp?.options?.map((option) => option.value)).toEqual(['lt90', '90to100', 'gt100']);
    expect(getInitialFormValues(bova).sbp).toBeNull();
    expect(getMissingRequiredInputs(bova.inputs, getInitialFormValues(bova))).toEqual(
      expect.arrayContaining([{ id: 'sbp', label: 'Systolic blood pressure (SBP) range' }]),
    );
  });

  it('keeps normotensive BOVA scoring intact', () => {
    if (!bova) return;

    const noMarkers = { sbp: 'gt100', hr: false, rv: false, trop: false };
    expect(bova.calculate(noMarkers)).toMatchObject({
      score: 0,
      label: 'BOVA stage I (0–2)',
      riskLevel: 'low',
    });

    expect(bova.calculate({ ...noMarkers, sbp: '90to100' })).toMatchObject({
      score: 2,
      label: 'BOVA stage I (0–2)',
      riskLevel: 'low',
    });
  });

  it('withholds BOVA staging and raises high-risk guidance when SBP is below 90', () => {
    if (!bova) return;

    const result = bova.calculate({ sbp: 'lt90', hr: false, rv: false, trop: false });
    expect(result).toMatchObject({
      score: 'Not applicable',
      label: 'BOVA not applicable — high-risk PE pathway',
      riskLevel: 'critical',
    });
    expect(`${result.interpretation} ${result.alerts?.join(' ')}`).toMatch(/SBP <90/i);
    expect(`${result.interpretation} ${result.alerts?.join(' ')}`).toMatch(/hemodynamic instability|high-risk PE/i);
    expect(`${result.label} ${result.interpretation} ${result.details?.map((d) => d.value).join(' ')}`).not.toMatch(
      /stage [I-III]/i,
    );
  });
});
