import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCalculator } from '../src/data/calculators';
import {
  getInitialFormValues,
  getMissingQuestionnaireInputs,
  incompleteResult,
} from '../src/utils/helpers';

type Wave1Case = {
  /** ID used in CALCULATOR_AUDIT.md. */
  auditId: string;
  /** Registered ID, when the audit spelling is an alias or stale identifier. */
  registryId?: string;
};

const WAVE1_CASES: Wave1Case[] = [
  { auditId: 'canadian-ct-head' },
  { auditId: 'new-orleans-ct-head' },
  { auditId: 'hestia-pe' },
  { auditId: 'nexus-chest' },
  { auditId: 'years-algorithm' },
  { auditId: 'ottawa-sah-rule' },
  { auditId: 'primary-care-rule-dvt' },
  { auditId: 'catch-rule' },
  { auditId: 'chalice-rule' },
  { auditId: 'pecarn-head' },
  { auditId: 'salt-triage' },
  { auditId: 'jumpstart-triage' },
  { auditId: 'start-triage' },
  { auditId: 'news2' },
  { auditId: 'mews' },
  { auditId: 'wells-hit' },
  { auditId: 'tmacs' },
  { auditId: 'herdoo2' },
  { auditId: 'lower-gi-bleed-oakland' },
  { auditId: 'strangulation-sbo' },
  { auditId: 'sad-persons' },
  { auditId: 'cam-icu' },
  { auditId: 'four-score' },
  { auditId: 'aspects' },
  { auditId: 'ich-score' },
  { auditId: 'fisher-grade' },
  { auditId: 'c-stat' },
  { auditId: 'fast-ed' },
  { auditId: 'race-scale' },
  { auditId: 'func-score' },
  { auditId: '4at' },
  { auditId: 'brief-confusion' },
  { auditId: 'ad8' },
  { auditId: 'gds-15' },
  { auditId: 'finnegan' },
  { auditId: 'step-by-step-fever' },
  { auditId: 'rumack-matthew-time' },
  { auditId: 'forrest-classification' },
  { auditId: 'air-appendicitis' },
  { auditId: 'glasgow-imrie' },
  { auditId: 'maddrey-df' },
  { auditId: 'tokyo-cholangitis' },
  { auditId: 'tokyo-cholecystitis' },
  { auditId: 'varices-baveno' },
  { auditId: 'delta-meld' },
  { auditId: 'osmolar-gap-tox' },
  { auditId: 'methanol', registryId: 'methanol-osmol' },
  { auditId: 'ethylene-glycol-osmol' },
  { auditId: 'dka-resolution' },
  { auditId: 'hhs-diagnosis' },
  { auditId: 'di-diagnosis' },
  { auditId: 'glasgow-outcome' },
  { auditId: 'goese' },
  { auditId: 'milan-criteria' },
  { auditId: 'bclc-hcc' },
];

describe('Wave 1 blank-form production gate', () => {
  afterEach(() => vi.restoreAllMocks());

  it.each(WAVE1_CASES)('$auditId is blocked on a fresh form', ({ auditId, registryId = auditId }) => {
    const calc = getCalculator(registryId);
    expect(calc, `${auditId} must resolve to registered ID ${registryId}`).toBeDefined();
    if (!calc) return;

    const values = getInitialFormValues(calc);
    const missing = getMissingQuestionnaireInputs(calc, values);
    const calculate = vi.spyOn(calc, 'calculate');

    // Mirror CalculatorPage's production ordering: missing required values
    // produce the incomplete result and calculation is never reached.
    const result = missing.length > 0 ? incompleteResult(missing) : calc.calculate(values);

    expect(missing, `${auditId} (${registryId}) has no missing-input gate`).not.toHaveLength(0);
    expect(calculate, `${auditId} (${registryId}) calculated on a blank form`).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      score: '—',
      label: 'Enter all required inputs',
      riskLevel: 'info',
    });
  });

  it('records the methanol audit-to-registry ID mismatch explicitly', () => {
    expect(getCalculator('methanol')).toBeUndefined();
    expect(getCalculator('methanol-osmol')).toBeDefined();
  });
});
