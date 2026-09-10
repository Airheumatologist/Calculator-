import { describe, expect, it } from 'vitest';
import { calculators } from '../src/data/calculators/index';
import type { CalcInput, CalcOption, CalcResult, RiskLevel } from '../src/types/calculator';
import { assertAuditPolicy, type NormalizedFinding } from './audit-failure-policy';

/**
 * Deep formula & scoring logic audit.
 *
 * Audit finding #4: this suite used to compute `isHigherBetter` and never use
 * it, and only checked for crashes and NaN at maximum inputs. It now implements
 * the checks its name claims:
 *
 *   1. Monotonicity of point-based scores (min-point vs max-point selections).
 *   2. Risk band validity + severity direction, using `isHigherBetter`.
 *   3. Crash / NaN sweeps at minimum, default AND maximum inputs.
 */

const RISK_LEVELS: readonly RiskLevel[] = ['low', 'moderate', 'high', 'critical', 'info', 'normal'];

/**
 * Ordinal severity of a RiskLevel. `info` is deliberately absent: it is a
 * non-severity annotation (unit conversions, differentials, reference tables)
 * and comparing it against a real band would be meaningless, so any comparison
 * involving `info` is skipped rather than guessed at.
 */
const SEVERITY_ORDINAL: Partial<Record<RiskLevel, number>> = {
  normal: 0,
  low: 1,
  moderate: 2,
  high: 3,
  critical: 4,
};

/**
 * Calculators where a HIGHER total means a BETTER patient state, so risk
 * severity must fall (never rise) as the point total rises. Matched by exact
 * id, not substring: the previous `c.id.includes('glasgow')` heuristic wrongly
 * swept in `glasgow-imrie` and `glasgow-meningococcal`, which are both
 * higher-is-worse.
 *
 * Every entry below was confirmed against the scale's own definition.
 */
const HIGHER_IS_BETTER_IDS: ReadonlySet<string> = new Set([
  'gcs', // Glasgow Coma Scale — 15 is normal, 3 is comatose
  'pgcs', // Pediatric GCS
  'four-score', // FOUR Score — 16 is intact
  'apgar', // APGAR — 10 is a vigorous newborn
  'rts', // Revised Trauma Score — 7.84 is physiologically normal
  'bishop', // Bishop Score — higher = favourable cervix
  'biophysical-profile', // BPP — 10/10 is reassuring
  'glasgow-outcome', // GOS — 5 is good recovery
  'goese', // GOS-E — 8 is upper good recovery
  'func-score', // FUNC Score — higher predicts functional independence after ICH
  'mini-cog', // Mini-Cog — higher = better cognition
  'clock-draw', // Clock Drawing — higher = better cognition
  'karnofsky', // Karnofsky Performance Status — 100 is normal
  'duke-activity', // DASI — higher METs = better functional capacity
  'mets-estimate', // METs — higher = better exercise tolerance
  'mascc', // MASCC Risk Index — ≥21 identifies LOW-risk febrile neutropenia
  'rochester-criteria', // Rochester — meeting more low-risk criteria is reassuring
  'hall-criteria', // Hall IV→PO switch — more stability criteria met = ready to step down
  'aldrete-score', // Aldrete — higher = ready for PACU discharge
  'intermacs', // INTERMACS profile — higher profile number = less sick
  'braden-scale', // Braden — higher = lower pressure ulcer risk
  'norton-scale', // Norton — higher = lower pressure ulcer risk
  'concussion-return', // Graduated return-to-play — higher stage = further recovered
  'readiness-quit', // Stages of change — higher = more ready to quit
  'gdmt-checklist', // HFrEF GDMT — more pillars on board = better treated
]);

/**
 * Point-based calculators that are genuinely NOT monotonic in risk severity, so
 * the direction assertion does not apply. Kept deliberately tiny and explicit
 * rather than weakening the check globally.
 *
 *  - `aki-cause`: not a severity score at all. It is a differential classifier
 *    whose riskLevel encodes WHICH diagnosis the checklist favours (pre-renal
 *    vs ATN), not how sick the patient is, so severity legitimately moves in
 *    both directions and the score is a non-numeric verdict string.
 */
const NON_MONOTONIC_EXCEPTIONS: ReadonlyMap<string, string> = new Map([
  ['aki-cause', 'Differential classifier (pre-renal vs ATN): riskLevel encodes the favoured diagnosis, not severity.'],
]);

/**
 * Ordinal weight of an option.
 *
 * Tier A: an explicit `points` value. Only Tier A calculators get the numeric
 * score-monotonicity assertion, because a declared `points` field is an
 * unambiguous statement that the input contributes to a point sum.
 *
 * Tier B: no explicit points, but every option value is numeric and the value
 * IS the weight (GCS, APGAR, SOFA, NIHSS and most other classic ordinal scales
 * are authored this way). Tier B is used for the risk-band and
 * severity-direction checks only.
 */
function optionWeight(option: CalcOption): number | undefined {
  if (typeof option.points === 'number') return option.points;
  if (typeof option.value === 'number') return option.value;
  return undefined;
}

function hasExplicitPoints(input: CalcInput): boolean {
  return (input.options ?? []).every((o) => typeof o.points === 'number');
}

interface Scored {
  /** Every input is an option list and every option carries an explicit `points`. */
  tierA: boolean;
  minSelection: Record<string, number | string | boolean>;
  maxSelection: Record<string, number | string | boolean>;
}

function classify(inputs: readonly CalcInput[]): Scored | null {
  const optionInputs = inputs.filter((i) => i.options && i.options.length > 0);
  // A formula calculator (ratios, clearances, conversions) has free numeric
  // inputs; a point-sum calculator does not. Requiring EVERY input to be an
  // option list is what keeps FENa, CKD-EPI, MELD etc. out of this check.
  if (optionInputs.length === 0 || optionInputs.length !== inputs.length) return null;
  if (!optionInputs.every((i) => (i.options ?? []).every((o) => optionWeight(o) !== undefined))) return null;

  const minSelection: Record<string, number | string | boolean> = {};
  const maxSelection: Record<string, number | string | boolean> = {};
  for (const input of optionInputs) {
    const sorted = [...(input.options ?? [])].sort((a, b) => optionWeight(a)! - optionWeight(b)!);
    minSelection[input.id] = sorted[0].value;
    maxSelection[input.id] = sorted[sorted.length - 1].value;
  }

  return { tierA: optionInputs.every(hasExplicitPoints), minSelection, maxSelection };
}

function buildValues(inputs: readonly CalcInput[], mode: 'min' | 'default' | 'max'): Record<string, number | string | boolean> {
  const values: Record<string, number | string | boolean> = {};
  for (const input of inputs) {
    if (mode === 'default' && input.defaultValue !== undefined) {
      values[input.id] = input.defaultValue;
    } else if (input.options && input.options.length > 0) {
      const weighted = input.options.every((o) => optionWeight(o) !== undefined)
        ? [...input.options].sort((a, b) => optionWeight(a)! - optionWeight(b)!)
        : input.options;
      values[input.id] = mode === 'min' ? weighted[0].value : weighted[weighted.length - 1].value;
    } else if (input.type === 'boolean') {
      values[input.id] = mode !== 'min';
    } else if (input.type === 'number') {
      values[input.id] = mode === 'min' ? (input.min ?? 0) : (input.max ?? 100);
    }
  }
  return values;
}

function isBadScore(result: CalcResult): string | null {
  if (typeof result.score === 'number' && Number.isNaN(result.score)) return 'NaN numeric score';
  if (typeof result.score === 'string' && /NaN|undefined|Infinity/.test(result.score)) {
    return `invalid string score '${result.score}'`;
  }
  return null;
}

describe('Deep Formula & Scoring Logic Audit', () => {
  const findings: NormalizedFinding[] = [];
  const push = (calcId: string, issueType: string, severity: string, message: string) =>
    findings.push({ calcId, issueType, severity, message });

  let tierACount = 0;
  let ordinalCount = 0;
  let higherIsBetterChecked = 0;

  for (const c of calculators) {
    // ---------------------------------------------------------------
    // 3. Crash / NaN sweeps — minimum, default AND maximum inputs.
    // ---------------------------------------------------------------
    for (const mode of ['min', 'default', 'max'] as const) {
      const values = buildValues(c.inputs, mode);
      const tag = mode.toUpperCase();
      try {
        const result = c.calculate(values);
        if (!result) {
          push(c.id, `NULL_RESULT_${tag}_INPUTS`, 'CRITICAL', `calculate() returned null/undefined on ${mode} inputs`);
          continue;
        }
        const bad = isBadScore(result);
        if (bad) push(c.id, `NAN_SCORE_${tag}_INPUTS`, 'CRITICAL', `calculate() produced ${bad} on ${mode} inputs`);
        if (!RISK_LEVELS.includes(result.riskLevel)) {
          push(c.id, `INVALID_RISK_LEVEL_${tag}`, 'HIGH', `riskLevel '${result.riskLevel}' is not a declared RiskLevel on ${mode} inputs`);
        }
        if (!result.label || String(result.label).trim() === '') {
          push(c.id, `EMPTY_LABEL_${tag}`, 'HIGH', `empty result label on ${mode} inputs`);
        }
        if (!result.interpretation || String(result.interpretation).trim() === '') {
          push(c.id, `EMPTY_INTERPRETATION_${tag}`, 'HIGH', `empty result interpretation on ${mode} inputs`);
        }
      } catch (err) {
        push(c.id, `CRASH_${tag}_INPUTS`, 'CRITICAL', `calculate() crashed on ${mode} inputs: ${(err as Error).message}`);
      }
    }

    // ---------------------------------------------------------------
    // 1 & 2. Monotonicity and risk-band direction — point-based only.
    // ---------------------------------------------------------------
    const scored = classify(c.inputs);
    if (!scored || NON_MONOTONIC_EXCEPTIONS.has(c.id)) continue;

    ordinalCount += 1;
    if (scored.tierA) tierACount += 1;

    let low: CalcResult;
    let high: CalcResult;
    try {
      low = c.calculate(scored.minSelection);
      high = c.calculate(scored.maxSelection);
    } catch {
      continue; // already reported by the crash sweep above
    }

    const lowScore = Number(low.score);
    const highScore = Number(high.score);

    // Numeric monotonicity is asserted for Tier A only: an explicit `points`
    // field means the total is a point sum, so all-max can never be below
    // all-min. Tier B weights are inferred from option values and are not a
    // strong enough claim to assert arithmetic on.
    if (scored.tierA && Number.isFinite(lowScore) && Number.isFinite(highScore) && highScore < lowScore) {
      push(c.id, 'NON_MONOTONIC_POINT_SUM', 'HIGH', `all-maximum point selection scores ${highScore} but all-minimum scores ${lowScore}`);
    }

    const lowSeverity = SEVERITY_ORDINAL[low.riskLevel];
    const highSeverity = SEVERITY_ORDINAL[high.riskLevel];
    if (lowSeverity === undefined || highSeverity === undefined) continue; // `info` band — not a severity

    if (HIGHER_IS_BETTER_IDS.has(c.id)) {
      higherIsBetterChecked += 1;
      if (highSeverity > lowSeverity) {
        push(
          c.id,
          'INVERTED_RISK_DIRECTION',
          'HIGH',
          `higher-is-better scale, but risk severity RISES from '${low.riskLevel}' (score ${low.score}) to '${high.riskLevel}' (score ${high.score})`,
        );
      }
    } else if (highSeverity < lowSeverity) {
      push(
        c.id,
        'INVERTED_RISK_DIRECTION',
        'HIGH',
        `higher-is-worse scale, but risk severity FALLS from '${low.riskLevel}' (score ${low.score}) to '${high.riskLevel}' (score ${high.score})`,
      );
    }
  }

  it('sweeps every calculator at minimum, default and maximum inputs without crashes, NaN, or empty bands', () => {
    const sweepFindings = findings.filter((f) => /^(CRASH_|NAN_SCORE_|NULL_RESULT_|EMPTY_|INVALID_RISK_LEVEL_)/.test(f.issueType));
    console.log(`Deep Logic Audit: ${calculators.length} calculators swept at min/default/max, ${sweepFindings.length} execution issues.`);
    assertAuditPolicy('Deep Logic Audit (execution sweep)', sweepFindings, 'in-memory (no JSON report)');
  });

  it('enforces monotonicity and risk-band direction on point-based calculators', () => {
    const logicFindings = findings.filter((f) => /^(NON_MONOTONIC_POINT_SUM|INVERTED_RISK_DIRECTION)$/.test(f.issueType));
    console.log(
      `Deep Logic Audit: ${tierACount} point-summed (Tier A) and ${ordinalCount} ordinal (Tier A+B) calculators checked; ` +
        `${higherIsBetterChecked} evaluated as higher-is-better; ${NON_MONOTONIC_EXCEPTIONS.size} explicit exception(s).`,
    );
    assertAuditPolicy('Deep Logic Audit (monotonicity & bands)', logicFindings, 'in-memory (no JSON report)');
  });

  it('keeps the higher-is-better and exception lists honest', () => {
    const ids = new Set(calculators.map((c) => c.id));
    for (const id of HIGHER_IS_BETTER_IDS) {
      expect(ids.has(id), `HIGHER_IS_BETTER_IDS references unknown calculator '${id}'`).toBe(true);
    }
    for (const id of NON_MONOTONIC_EXCEPTIONS.keys()) {
      expect(ids.has(id), `NON_MONOTONIC_EXCEPTIONS references unknown calculator '${id}'`).toBe(true);
    }
    // The whole point of finding #4 was that isHigherBetter was dead code.
    expect(higherIsBetterChecked, 'no higher-is-better calculator was actually exercised').toBeGreaterThan(0);
  });
});
