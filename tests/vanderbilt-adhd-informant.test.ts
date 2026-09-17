import { describe, expect, it } from 'vitest';
import { getCalculator } from '../src/data/calculators';
import { validateCalculator } from '../src/utils/registry';
import {
  getActiveQuestionnaireInputs,
  getExampleFormValues,
  getInitialFormValues,
  getMissingQuestionnaireInputs,
} from '../src/utils/helpers';

const SURVEY_ITEMS = [
  ...Array.from({ length: 9 }, (_, i) => `inatt_${i + 1}`),
  ...Array.from({ length: 9 }, (_, i) => `hyper_${i + 1}`),
  ...Array.from({ length: 8 }, (_, i) => `perf_${i + 1}`),
];

const DIRECT_ITEMS = ['informant', 'inatt', 'hyper', 'perf'];
const DIRECT_COUNT_ITEMS = ['inatt', 'hyper', 'perf'];

const calc = getCalculator('vanderbilt-adhd');
if (!calc) throw new Error('Missing vanderbilt-adhd calculator');

function ids(entries: { id: string }[]): string[] {
  return entries.map(({ id }) => id).sort();
}

describe('Vanderbilt ADHD informant + branch declaration (P1 leftover)', () => {
  it('declares only input ids that exist, and both branches explicitly', () => {
    expect(validateCalculator(calc!)).toEqual([]);
    expect(calc!.questionnaire).toMatchObject({
      modeInputId: 'entryMode',
      directModeValues: ['direct'],
      activeInputIdsByMode: {
        survey: ['informant', ...SURVEY_ITEMS],
        direct: DIRECT_ITEMS,
      },
    });
    // `directInputIds` would exclude the informant from the survey branch, so
    // this calculator lists both branches explicitly instead.
    expect(calc!.questionnaire).not.toHaveProperty('directInputIds');
  });

  it('requires an explicit informant on a fresh form', () => {
    const values = getInitialFormValues(calc!);
    const missing = ids(getMissingQuestionnaireInputs(calc!, values));

    expect(missing).toContain('entryMode');
    expect(missing).toContain('informant');
  });

  it('keeps the informant required when the user switches to direct count entry', () => {
    const values = { ...getInitialFormValues(calc!), entryMode: 'direct' };
    const active = ids(getActiveQuestionnaireInputs(calc!, values));

    expect(active).toEqual([...DIRECT_ITEMS].sort());
    expect(ids(getMissingQuestionnaireInputs(calc!, values))).toEqual([...DIRECT_ITEMS].sort());
    // The direct branch must not require the 26 Likert items.
    expect(active).not.toEqual(expect.arrayContaining(DIRECT_COUNT_ITEMS.map((id) => `${id}_1`)));
  });

  it('keeps the informant required in the interactive survey branch', () => {
    const values = { ...getInitialFormValues(calc!), entryMode: 'survey' };
    const active = ids(getActiveQuestionnaireInputs(calc!, values));

    expect(active).toContain('informant');
    expect(active).toEqual(['informant', ...SURVEY_ITEMS].sort());
  });

  it('fails closed when calculate() is reached without an informant', () => {
    const result = calc!.calculate({ entryMode: 'direct', inatt: 6, hyper: 4, perf: 1 });

    expect(result.score).toBe('—');
    expect(result.label).toBe('Select the informant');
    expect(result.riskLevel).toBe('info');
    expect(result.details).toContainEqual({ label: 'Informant', value: 'Required' });
    expect(result.interpretation).not.toMatch(/parent form|assuming parent/i);
  });

  it('labels the chosen informant instead of assuming a parent form', () => {
    const parent = calc!.calculate({ entryMode: 'direct', informant: 'parent', inatt: 6, hyper: 4, perf: 1 });
    const teacher = calc!.calculate({ entryMode: 'direct', informant: 'teacher', inatt: 6, hyper: 4, perf: 1 });

    expect(parent.details).toContainEqual({ label: 'Informant', value: 'Parent' });
    expect(teacher.details).toContainEqual({ label: 'Informant', value: 'Teacher' });
    expect(parent.label).toBe('Positive ADHD screen (symptom + performance)');
    // inattention 6/9 positive + 1 performance item; hyperactivity 4/9 is below threshold.
    expect(parent.score).toBe(2);
  });

  it('still scores direct counts and the full survey after the informant is chosen', () => {
    const direct = calc!.calculate({ entryMode: 'direct', informant: 'parent', inatt: 5, hyper: 5, perf: 0 });
    expect(direct.label).toBe('Negative screen by common thresholds');
    expect(direct.score).toBe(0);

    const surveyValues: Record<string, number | string> = {
      entryMode: 'survey',
      informant: 'teacher',
    };
    for (const id of SURVEY_ITEMS) surveyValues[id] = id.startsWith('perf_') ? 3 : 0;
    expect(getMissingQuestionnaireInputs(calc!, surveyValues)).toEqual([]);

    const survey = calc!.calculate(surveyValues);
    expect(survey.label).toBe('Negative screen by common thresholds');
    expect(survey.score).toBe(0);
  });

  it('keeps the loadable example complete now that the informant is required', () => {
    const example = getExampleFormValues(calc!);
    expect(example.informant).toBe('parent');
    expect(getMissingQuestionnaireInputs(calc!, example)).toEqual([]);
  });
});
