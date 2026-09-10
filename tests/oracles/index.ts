import type { OracleCase } from './types';
import { cardiovascularOracles } from './cardiovascular';
import { generalFormulaOracles } from './general-formulas';
import { hepaticGiOracles } from './hepatic-gi';
import { neuroPsychOracles } from './neuro-psych';
import { pulmonaryInfectiousOracles } from './pulmonary-infectious';
import { renalMetabolicOracles } from './renal-metabolic';
import { traumaPedsObOracles } from './trauma-peds-ob';
import { wellsOracles } from './wells';
import { wave7PreventionOracles } from './wave7-prevention';
import { wave7RheumClassOracles } from './wave7-rheum-class';
import { wave7RheumActivityOracles } from './wave7-rheum-activity';
import { wave7BedsideOracles } from './wave7-bedside';
import { wave7HighuseOracles } from './wave7-highuse';
import { wave7FillinsOracles } from './wave7-fillins';

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
  ...wave7PreventionOracles,
  ...wave7RheumClassOracles,
  ...wave7RheumActivityOracles,
  ...wave7BedsideOracles,
  ...wave7HighuseOracles,
  ...wave7FillinsOracles,
];

export function coveredCalculatorIds(): string[] {
  return [...new Set(oracleCases.map((c) => c.calcId))].sort();
}
