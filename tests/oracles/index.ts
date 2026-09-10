import type { OracleCase } from './types';
import { cardiovascularOracles } from './cardiovascular';
import { generalFormulaOracles } from './general-formulas';
import { hepaticGiOracles } from './hepatic-gi';
import { neuroPsychOracles } from './neuro-psych';
import { pulmonaryInfectiousOracles } from './pulmonary-infectious';
import { renalMetabolicOracles } from './renal-metabolic';
import { traumaPedsObOracles } from './trauma-peds-ob';
import { wellsOracles } from './wells';

export type { OracleCase } from './types';

/** Every hand-derived clinical oracle case, run by tests/clinical-oracles.test.ts. */
export const oracleCases: OracleCase[] = [
  ...cardiovascularOracles,
  ...wellsOracles,
  ...pulmonaryInfectiousOracles,
  ...renalMetabolicOracles,
  ...hepaticGiOracles,
  ...neuroPsychOracles,
  ...generalFormulaOracles,
  ...traumaPedsObOracles,
];

export function coveredCalculatorIds(): string[] {
  return [...new Set(oracleCases.map((c) => c.calcId))].sort();
}
