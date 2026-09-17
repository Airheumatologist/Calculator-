import { describe, expect, it, vi } from 'vitest';
import { calculators, getCalculator } from '../src/data/calculators';
import type { CalcInput, Calculator } from '../src/types/calculator';
import { validateRegistry } from '../src/utils/registry';
import {
  getActiveQuestionnaireInputs,
  getInitialFormValues,
  getMissingQuestionnaireInputs,
  incompleteResult,
  isQuestionnaireCalculator,
  selectInput,
  yesNo,
} from '../src/utils/helpers';

const DIRECT_VALUES = ['direct', 'override', 'precomputed'];

function ids(entries: { id: string }[]): string[] {
  return entries.map(({ id }) => id).sort();
}

function fixture(inputs: CalcInput[], questionnaire: Calculator['questionnaire']): Calculator {
  return {
    id: 'questionnaire-fixture',
    name: 'Questionnaire fixture',
    shortName: 'Fixture',
    description: 'Test calculator',
    category: 'general',
    tags: [],
    isQuestionnaire: true,
    questionnaire,
    whenToUse: 'Testing only',
    whyUse: 'Testing only',
    inputs,
    calculate: vi.fn(() => ({
      score: 0,
      label: 'Test',
      interpretation: 'Test',
      riskLevel: 'info' as const,
    })),
    evidence: { summary: 'Test', validation: 'Test', references: [{ title: 'Test', citation: 'Test' }] },
    nextSteps: [{ condition: 'Test', actions: ['Test'] }],
  };
}

/**
 * P2 hardening: questionnaire branches are declared, never inferred. The engine
 * used to guess direct-entry fields from ids/labels containing
 * direct/override/precomputed; every questionnaire with a survey/precomputed
 * selector now declares `modeInputId` plus `directInputIds` or
 * `activeInputIdsByMode`, and the registry rejects the implicit form.
 */
describe('questionnaire mode metadata is explicit (P2)', () => {
  it('keeps the registry valid with the explicitness rule in place', () => {
    expect(validateRegistry(calculators)).toEqual([]);
  });

  it('declares a mode input for every survey/precomputed selector in the registry', () => {
    const offenders: string[] = [];
    for (const calc of calculators) {
      for (const input of calc.inputs) {
        if (input.type !== 'select' || !input.options?.length) continue;
        const values = input.options.map((option) => String(option.value).toLowerCase());
        const hasDirect = values.some((value) => DIRECT_VALUES.includes(value));
        const hasOther = values.some((value) => !DIRECT_VALUES.includes(value));
        if (!hasDirect || !hasOther) continue;
        const metadata = typeof calc.questionnaire === 'object' ? calc.questionnaire : undefined;
        if (!isQuestionnaireCalculator(calc) || metadata?.modeInputId !== input.id) {
          offenders.push(`${calc.id}:${input.id}`);
          continue;
        }
        if (!metadata.directInputIds?.length && !metadata.activeInputIdsByMode) {
          offenders.push(`${calc.id}:${input.id} (no branch declaration)`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('rejects a calculator whose branch selector is left implicit', () => {
    const implicit = fixture(
      [
        selectInput('entryMode', 'Mode', [
          { label: 'Survey', value: 'survey' },
          { label: 'Direct', value: 'direct' },
        ]),
        selectInput('score', 'Direct total score', [{ label: '0', value: 0 }]),
      ],
      undefined
    );
    expect(validateRegistry([implicit]).some((error) => /modeInputId/.test(error))).toBe(true);
  });

  it('treats only declared directInputIds as direct-branch fields (no label heuristic)', () => {
    const calc = fixture(
      [
        selectInput('entryMode', 'Mode', [
          { label: 'Survey', value: 'survey' },
          { label: 'Direct', value: 'direct' },
        ]),
        // Looks "direct" but is NOT declared: it must stay a survey field.
        selectInput('mysteryField', 'Direct score override', [
          { label: 'Often', value: 2 },
          { label: 'Never', value: 0 },
        ]),
        // Opaque label, but declared: direct-branch only.
        selectInput('total', 'Over the last two weeks I have felt tired', [
          { label: 'Often', value: 2 },
          { label: 'Never', value: 0 },
        ]),
      ],
      { modeInputId: 'entryMode', directModeValues: ['direct'], directInputIds: ['total'] }
    );

    const survey = ids(getActiveQuestionnaireInputs(calc, { entryMode: 'survey' }));
    expect(survey).toEqual(['mysteryField']);
    const direct = ids(getActiveQuestionnaireInputs(calc, { entryMode: 'direct' }));
    expect(direct).toEqual(['total']);
  });

  it('fails closed when the direct branch declares no fields', () => {
    const calc = fixture(
      [
        selectInput('entryMode', 'Mode', [
          { label: 'Survey', value: 'survey' },
          { label: 'Direct', value: 'direct' },
        ]),
        yesNo('item1', 'Item 1'),
      ],
      { modeInputId: 'entryMode', directModeValues: ['direct'], directInputIds: [] }
    );
    const missing = ids(getMissingQuestionnaireInputs(calc, { entryMode: 'direct' }));
    expect(missing).toEqual(['item1']);
  });

  it('requires exactly the declared direct fields for a real questionnaire', () => {
    const phqA = getCalculator('phq-a');
    if (!phqA) throw new Error('Missing phq-a calculator');
    const direct = ids(getActiveQuestionnaireInputs(phqA, { entryMode: 'direct' }));
    expect(direct).toEqual(['item9', 'score']);
    expect(ids(getMissingQuestionnaireInputs(phqA, { entryMode: 'direct' }))).toEqual(['item9', 'score']);

    const survey = getActiveQuestionnaireInputs(phqA, { entryMode: 'survey' }).map(({ id }) => id);
    expect(survey).not.toContain('score');
    expect(survey.length).toBeGreaterThanOrEqual(9);
  });

  it('gates a fresh questionnaire form before calculate() runs', () => {
    const sample = [
      'phq-a',
      'madrs',
      'ham-d',
      'cat-copd',
      'womac',
      'kujala-score',
      'sic-score',
      'gleason-grade-group',
      'vanderbilt-adhd',
    ];
    for (const id of sample) {
      const calc = getCalculator(id);
      if (!calc) throw new Error(`Missing ${id}`);
      const values = getInitialFormValues(calc);
      const missing = getMissingQuestionnaireInputs(calc, values);
      expect(missing.length, `${id} should gate a fresh form`).toBeGreaterThan(0);
      const result = missing.length > 0 ? incompleteResult(missing) : calc.calculate(values);
      expect(result.label, `${id}`).toBe('Enter all required inputs');
    }
  });

  it('supports shared fields required in both branches via activeInputIdsByMode', () => {
    const vanderbilt = getCalculator('vanderbilt-adhd');
    if (!vanderbilt) throw new Error('Missing vanderbilt-adhd calculator');
    for (const mode of ['survey', 'direct']) {
      const active = ids(getActiveQuestionnaireInputs(vanderbilt, { entryMode: mode }));
      expect(active, `${mode} branch`).toContain('informant');
    }
  });
});
