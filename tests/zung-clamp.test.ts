import { describe, expect, it } from 'vitest';
import { getCalculator } from '../src/data/calculators';

const sds = getCalculator('sds-zung');
const sas = getCalculator('sas-zung-anxiety');
if (!sds) throw new Error('Missing sds-zung calculator');
if (!sas) throw new Error('Missing sas-zung-anxiety calculator');

function allItems(prefix: 'sds' | 'sas', value: number | string): Record<string, number | string> {
  const values: Record<string, number | string> = {};
  for (let i = 1; i <= 20; i++) values[`${prefix}${i}`] = value;
  return values;
}

function detail(result: { details?: { label: string; value: string }[] }, label: string): string | undefined {
  return result.details?.find((entry) => entry.label === label)?.value;
}

describe('Zung SDS/SAS clamp regressions (P2 per-ID)', () => {
  it('clamps the SDS direct raw total to the published 20–80 range', () => {
    const low = sds!.calculate({ entryMode: 'direct', score: 5 });
    expect(low.score).toBe(25); // raw clamped to 20 → index (20/80)×100
    expect(detail(low, 'Raw Total')).toBe('20 / 80');
    expect(low.label).toBe('Normal / Non-depressed (Index <50)');

    const high = sds!.calculate({ entryMode: 'direct', score: 500 });
    expect(high.score).toBe(100); // raw clamped to 80
    expect(detail(high, 'Raw Total')).toBe('80 / 80');
    expect(high.label).toBe('Severe / extreme depression (Index ≥70)');
  });

  it('clamps every SDS item to 1–4 so tampered values cannot inflate the index', () => {
    const maxed = sds!.calculate({ entryMode: 'survey', ...allItems('sds', 9) });
    expect(maxed.score).toBe(100);
    expect(detail(maxed, 'Raw Total')).toBe('80 / 80');

    const zeroed = sds!.calculate({ entryMode: 'survey', ...allItems('sds', 0) });
    expect(zeroed.score).toBe(25);
    expect(detail(zeroed, 'Raw Total')).toBe('20 / 80');
  });

  it('keeps the SDS index bands and the item-19 suicide flag', () => {
    expect(sds!.calculate({ entryMode: 'direct', score: 40 }).label).toBe('Mild to moderate depression (Index 50–59)');
    expect(sds!.calculate({ entryMode: 'direct', score: 48 }).label).toBe('Moderate to marked depression (Index 60–69)');

    const survey = { ...allItems('sds', 2), entryMode: 'survey' };
    const notEndorsed = sds!.calculate({ ...survey, sds19: 1 });
    expect(notEndorsed.alerts ?? []).toEqual([]);
    expect(detail(notEndorsed, 'Item 19 (death-related thoughts)')).toContain('a little of the time');

    const endorsed = sds!.calculate({ ...survey, sds19: 2 });
    expect(endorsed.alerts?.join(' ')).toContain('suicide risk assessment');
  });

  it('scores an unanswered SDS item 19 as the 1-point minimum and says so in the details', () => {
    const values: Record<string, number | string> = { entryMode: 'survey', ...allItems('sds', 2), sds19: '' };
    const result = sds!.calculate(values);

    // 19 items × 2 = 38, plus the clamped 1-point minimum for the skipped item.
    expect(detail(result, 'Raw Total')).toBe('39 / 80');
    expect(detail(result, 'Item 19 (death-related thoughts)')).toBe('Not answered');
    expect(result.alerts ?? []).toEqual([]);
  });

  it('clamps the SAS direct raw total and item scores to the published ranges', () => {
    const low = sas!.calculate({ entryMode: 'direct', score: 5 });
    expect(low.score).toBe(20); // raw clamped to 20 → index 25
    expect(detail(low, 'Raw Total')).toBe('20 / 80');
    expect(low.label).toBe('Normal / Below anxiety cutoff (Index <45)');

    const high = sas!.calculate({ entryMode: 'direct', score: 500 });
    expect(high.score).toBe(80);
    expect(detail(high, 'SAS Index')).toBe('100 (= raw × 1.25)');
    expect(high.label).toBe('Extreme anxiety level (Index ≥75)');

    // Off-scale item entries clamp to 1–4 before the index conversion.
    expect(sas!.calculate({ entryMode: 'survey', ...allItems('sas', 9) }).score).toBe(80);
    expect(sas!.calculate({ entryMode: 'survey', ...allItems('sas', 0) }).score).toBe(20);
  });

  it('keeps the SAS band boundaries at index 45, 60, and 75', () => {
    expect(sas!.calculate({ entryMode: 'direct', score: 35 }).label).toBe('Normal / Below anxiety cutoff (Index <45)');
    // SAS reports the raw total; the index (raw × 1.25) drives the band.
    expect(sas!.calculate({ entryMode: 'direct', score: 36 }).score).toBe(36);
    expect(sas!.calculate({ entryMode: 'direct', score: 36 }).label).toBe('Mild to moderate anxiety (Index 45–59)');
    expect(sas!.calculate({ entryMode: 'direct', score: 48 }).label).toBe('Marked to severe anxiety (Index 60–74)');
    expect(sas!.calculate({ entryMode: 'direct', score: 60 }).label).toBe('Extreme anxiety level (Index ≥75)');
  });
});
