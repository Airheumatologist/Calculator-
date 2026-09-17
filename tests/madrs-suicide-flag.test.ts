import { describe, expect, it } from 'vitest';
import { getCalculator } from '../src/data/calculators';
import { getInitialFormValues, getMissingQuestionnaireInputs } from '../src/utils/helpers';

const madrs = getCalculator('madrs');
if (!madrs) throw new Error('Missing MADRS calculator');

const zeroSurvey = {
  entryMode: 'survey' as const,
  madrs1: 0,
  madrs2: 0,
  madrs3: 0,
  madrs4: 0,
  madrs5: 0,
  madrs6: 0,
  madrs7: 0,
  madrs8: 0,
  madrs9: 0,
  madrs10: 0,
};

function surveyWithItem10(item10: number) {
  return { ...zeroSurvey, madrs10: item10 };
}

describe('MADRS item-10 suicide safety flag', () => {
  it('flags item 10 independently when the total remains in the recovered range', () => {
    const result = madrs.calculate(surveyWithItem10(4));

    expect(result.score).toBe(4);
    expect(result.riskLevel).toBe('critical');
    expect(result.label).toMatch(/urgent suicide safety flag/i);
    expect(result.alerts).toEqual([
      expect.stringMatching(/item 10 rated 4\/6/i),
    ]);
    expect(result.alerts?.[0]).toMatch(/immediate direct suicide risk assessment/i);
    expect(result.alerts?.[0]).toMatch(/intent|plan|lethal means/i);
    expect(result.interpretation).toMatch(/direct suicide risk assessment/i);
    expect(result.recommendations?.join(' ')).toMatch(/emergency psychiatric care/i);
  });

  it('alerts for an endorsed lower item-10 score but stays quiet when item 10 is zero', () => {
    const passive = madrs.calculate(surveyWithItem10(2));
    const absent = madrs.calculate(surveyWithItem10(0));

    expect(passive.score).toBe(2);
    expect(passive.alerts).toEqual([
      expect.stringMatching(/item 10 endorsed at 2\/6/i),
    ]);
    expect(passive.recommendations?.join(' ')).toMatch(/direct suicide risk assessment/i);
    expect(absent.score).toBe(0);
    expect(absent.alerts).toBeUndefined();
    expect(absent.recommendations).toBeUndefined();
  });

  it('does not infer an item-10 flag from a direct total override or a hidden stale item', () => {
    const result = madrs.calculate({ entryMode: 'direct', score: 4, madrs10: 6 });

    expect(result.score).toBe(4);
    expect(result.alerts).toBeUndefined();
    expect(result.details?.find(({ label }) => label === 'Item 10 (suicidal thoughts)')?.value).toMatch(/unavailable/i);
  });

  it('keeps all ten item responses required on a fresh survey form', () => {
    const missing = getMissingQuestionnaireInputs(madrs, getInitialFormValues(madrs));

    expect(missing.map(({ id }) => id)).toEqual([
      'entryMode',
      'madrs1',
      'madrs2',
      'madrs3',
      'madrs4',
      'madrs5',
      'madrs6',
      'madrs7',
      'madrs8',
      'madrs9',
      'madrs10',
    ]);
  });

  it('uses the published item-10 anchors at 0, 2, 4, and 6', () => {
    const item10 = madrs.inputs.find(({ id }) => id === 'madrs10');
    expect(item10?.options?.find(({ value }) => value === 0)?.label).toMatch(/enjoys life/i);
    expect(item10?.options?.find(({ value }) => value === 2)?.label).toMatch(/weary of life.*fleeting suicidal thoughts/i);
    expect(item10?.options?.find(({ value }) => value === 4)?.label).toMatch(/suicidal thoughts are common.*possible solution.*without a specific plan or intent/i);
    expect(item10?.options?.find(({ value }) => value === 6)?.label).toMatch(/explicit plans.*active preparations/i);
  });
});

