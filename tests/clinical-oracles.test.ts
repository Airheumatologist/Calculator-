import { describe, expect, it } from 'vitest';
import { calculators, getCalculator } from '../src/data/calculators';
import { oracleCases, coveredCalculatorIds, type OracleCase } from './oracles';

/**
 * Clinical oracle harness (audit finding #3).
 *
 * The automated audits execute all 918 calculators with synthetic values, but
 * that only proves they do not crash. These cases assert EXPECTED VALUES that
 * were derived by hand from the published score definitions cited in each
 * case's `source`, so a silently wrong formula fails CI.
 *
 * Coverage is deliberately partial and is reported honestly by the gate at the
 * bottom of this file rather than being implied.
 */

function numericScore(raw: number | string): number {
  if (typeof raw === 'number') return raw;
  // Implementations may format a score as e.g. "24.2", "24.2 kg/m²" or "0.29 %".
  const match = String(raw).replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : Number.NaN;
}

function runCase(oracle: OracleCase) {
  const calculator = getCalculator(oracle.calcId);
  expect(calculator, `oracle references unknown calculator '${oracle.calcId}'`).toBeDefined();
  const result = calculator!.calculate(oracle.inputs);
  expect(result, `${oracle.calcId} returned no result`).toBeTruthy();

  if (oracle.expect.score !== undefined) {
    if (typeof oracle.expect.score === 'number') {
      const actual = numericScore(result.score);
      expect(Number.isNaN(actual), `${oracle.calcId}: score '${result.score}' is not numeric`).toBe(false);
      const tolerance = oracle.expect.tolerance ?? 0;
      expect(
        Math.abs(actual - oracle.expect.score) <= tolerance,
        `${oracle.calcId}: expected ${oracle.expect.score} (±${tolerance}) from the published definition, got ${result.score}. ${oracle.description}`,
      ).toBe(true);
    } else {
      expect(String(result.score), oracle.description).toBe(oracle.expect.score);
    }
  }

  if (oracle.expect.riskLevel !== undefined) {
    expect(result.riskLevel, `${oracle.calcId}: ${oracle.description}`).toBe(oracle.expect.riskLevel);
  }

  if (oracle.expect.labelMatches !== undefined) {
    const haystack = `${result.label} ${result.interpretation}`;
    expect(
      oracle.expect.labelMatches.test(haystack),
      `${oracle.calcId}: expected label/interpretation to match ${oracle.expect.labelMatches}, got '${result.label}' / '${result.interpretation}'`,
    ).toBe(true);
  }
}

const byCalculator = new Map<string, OracleCase[]>();
for (const oracle of oracleCases) {
  const bucket = byCalculator.get(oracle.calcId) ?? [];
  bucket.push(oracle);
  byCalculator.set(oracle.calcId, bucket);
}

describe('clinical oracles', () => {
  for (const [calcId, cases] of byCalculator) {
    describe(calcId, () => {
      for (const oracle of cases) {
        it(oracle.description, () => runCase(oracle));
      }
    });
  }
});

describe('oracle table integrity', () => {
  it('every case names a real calculator and only its declared inputs', () => {
    for (const oracle of oracleCases) {
      const calculator = getCalculator(oracle.calcId);
      expect(calculator, `unknown calculator '${oracle.calcId}'`).toBeDefined();
      const declared = new Set(calculator!.inputs.map((i) => i.id));
      for (const key of Object.keys(oracle.inputs)) {
        expect(declared.has(key), `${oracle.calcId}: '${key}' is not a declared input`).toBe(true);
      }
    }
  });

  it('every case cites a clinical source and asserts something', () => {
    for (const oracle of oracleCases) {
      expect(oracle.source.trim().length, `${oracle.calcId}: missing source`).toBeGreaterThan(20);
      const asserts =
        oracle.expect.score !== undefined || oracle.expect.riskLevel !== undefined || oracle.expect.labelMatches !== undefined;
      expect(asserts, `${oracle.calcId}: case asserts nothing — ${oracle.description}`).toBe(true);
    }
  });
});

/**
 * ORACLE COVERAGE GATE
 *
 * ORACLE_COVERAGE_FLOOR is the number of distinct calculators that actually
 * have at least one hand-derived oracle case today. It exists so the remaining
 * gap stays visible instead of implied, and so coverage cannot silently regress
 * when someone deletes cases.
 *
 * THIS CONSTANT MUST ONLY EVER BE RAISED. Never lower it to make a red build
 * green: removing oracle coverage is the regression the gate is here to catch.
 */
const ORACLE_COVERAGE_FLOOR = 80;

describe('oracle coverage', () => {
  it('reports oracle coverage honestly and does not regress', () => {
    const covered = coveredCalculatorIds();
    console.log(`ORACLE_COVERAGE: ${covered.length}/${calculators.length}`);
    console.log(`ORACLE_CASES: ${oracleCases.length}`);
    console.log(`ORACLE_UNCOVERED: ${calculators.length - covered.length} calculators still have no expected-value case`);

    expect(
      covered.length,
      `oracle coverage fell to ${covered.length} calculators, below the floor of ${ORACLE_COVERAGE_FLOOR}. ` +
        'Raise the floor when you add coverage; never lower it.',
    ).toBeGreaterThanOrEqual(ORACLE_COVERAGE_FLOOR);
  });
});
