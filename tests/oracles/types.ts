import type { RiskLevel } from '../../src/types/calculator';

/**
 * A single hand-derived clinical oracle case.
 *
 * RULES FOR ADDING CASES (audit finding #3)
 * -----------------------------------------
 * - The expected value MUST be derived independently from the published score
 *   definition (count the points, evaluate the formula on paper). NEVER run the
 *   calculator and paste back whatever it returned; that asserts nothing.
 * - `source` must name the publication or definition the expected value comes
 *   from. The calculator's own `references` entry is acceptable when the
 *   expected value is derivable from the published score definition.
 * - If a hand-derived value disagrees with the implementation, that is a
 *   finding. Fix the implementation, or leave the case out with a comment
 *   explaining the disagreement. Do not bend the case to match the code.
 */
export interface OracleCase {
  /** Registry id of the calculator under test. */
  calcId: string;
  /** Short human description including the hand arithmetic. */
  description: string;
  inputs: Record<string, number | string | boolean | null>;
  expect: {
    /**
     * Hand-derived expected score. Compared numerically when a number is given
     * (the implementation may return it as a formatted string).
     */
    score?: number | string;
    /**
     * Absolute tolerance for numeric comparison, to absorb the implementation's
     * display rounding only. Defaults to 0 (exact) — point sums must be exact.
     */
    tolerance?: number;
    riskLevel?: RiskLevel;
    labelMatches?: RegExp;
  };
  /** Clinical reference the expected value was derived from. */
  source: string;
}
