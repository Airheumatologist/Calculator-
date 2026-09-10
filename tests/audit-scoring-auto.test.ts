import { describe, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { calculators } from '../src/data/calculators/index';
import { assertAuditPolicy, type NormalizedFinding } from './audit-failure-policy';
import type { CalcInput } from '../src/types/calculator';

interface Finding {
  calcId: string;
  calcName: string;
  category: string;
  type: 'OPTION_POINTS_MISMATCH' | 'UNUSED_INPUT' | 'TYPE_MISMATCH' | 'NAN_SCORE' | 'CRASH' | 'UNDEFINED_RISK' | 'FORMULA_SCORING_BUG';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  message: string;
  details?: any;
}

const findings: Finding[] = [];

describe('Comprehensive Automated Scoring Audit', () => {
  it('audits all 918 calculators', () => {
    for (const c of calculators) {
      // Build default values map
      const defaultVals: Record<string, any> = {};
      for (const inp of c.inputs) {
        if (inp.defaultValue !== undefined) {
          defaultVals[inp.id] = inp.defaultValue;
        } else if (inp.options && inp.options.length > 0) {
          defaultVals[inp.id] = inp.options[0].value;
        } else if (inp.type === 'boolean') {
          defaultVals[inp.id] = false;
        } else if (inp.type === 'number') {
          defaultVals[inp.id] = inp.min ?? 0;
        }
      }

      // Check default execution
      try {
        const res = c.calculate(defaultVals);
        if (!res) {
          findings.push({
            calcId: c.id,
            calcName: c.name,
            category: c.category,
            type: 'CRASH',
            severity: 'HIGH',
            message: 'calculate() returned null/undefined for default values',
          });
        } else {
          if (typeof res.score === 'number' && isNaN(res.score)) {
            findings.push({
              calcId: c.id,
              calcName: c.name,
              category: c.category,
              type: 'NAN_SCORE',
              severity: 'HIGH',
              message: 'calculate() produced NaN score for default values',
            });
          }
          if (typeof res.score === 'string' && (res.score.includes('NaN') || res.score.includes('undefined'))) {
            findings.push({
              calcId: c.id,
              calcName: c.name,
              category: c.category,
              type: 'NAN_SCORE',
              severity: 'HIGH',
              message: `calculate() produced invalid string score '${res.score}' for default values`,
            });
          }
          if (!res.riskLevel) {
            findings.push({
              calcId: c.id,
              calcName: c.name,
              category: c.category,
              type: 'UNDEFINED_RISK',
              severity: 'MEDIUM',
              message: 'calculate() returned empty/undefined riskLevel for default values',
            });
          }
        }
      } catch (err: any) {
        findings.push({
          calcId: c.id,
          calcName: c.name,
          category: c.category,
          type: 'CRASH',
          severity: 'HIGH',
          message: `calculate() crashed on default values: ${err.message}`,
        });
      }

      // Check option value type mismatches & option point deltas
      for (const inp of c.inputs) {
        if (!inp.options) continue;

        // Check if option value type (string vs number vs boolean) might be mismatched in calculate
        for (const opt of inp.options) {
          const val = opt.value;
          // Check if string representation of boolean or number is used
          if (val === 'true' || val === 'false' || val === '0' || val === '1') {
            // Check if calculate expects boolean/number instead of string
            const testValsStr = { ...defaultVals, [inp.id]: val };
            const testValsRaw = { ...defaultVals, [inp.id]: val === 'true' ? true : val === 'false' ? false : Number(val) };
            try {
              const resStr = c.calculate(testValsStr);
              const resRaw = c.calculate(testValsRaw);
              if (JSON.stringify(resStr) !== JSON.stringify(resRaw)) {
                // If raw (boolean/number) gives different result than string option value, there's a type mismatch!
                findings.push({
                  calcId: c.id,
                  calcName: c.name,
                  category: c.category,
                  type: 'TYPE_MISMATCH',
                  severity: 'HIGH',
                  message: `Input '${inp.id}' option '${opt.label}' has value '${val}' (${typeof val}), but calculate() behaves differently if passed raw boolean/number ${val === 'true' ? true : val === 'false' ? false : Number(val)}`,
                  details: { inputId: inp.id, optValue: val, resStrScore: resStr.score, resRawScore: resRaw.score },
                });
              }
            } catch {}
          }
        }

        // Check Option Points Mismatch
        const optionsWithPoints = inp.options.filter((o) => typeof o.points === 'number');
        if (optionsWithPoints.length > 0) {
          // Construct base values
          const baseVals: Record<string, any> = {};
          for (const other of c.inputs) {
            if (other.id === inp.id) continue;
            if (other.options && other.options.length > 0) {
              const zeroOpt = other.options.find((o) => o.points === 0) || other.options[0];
              baseVals[other.id] = zeroOpt.value;
            } else if (other.type === 'boolean') {
              baseVals[other.id] = false;
            } else if (other.type === 'number') {
              baseVals[other.id] = other.min ?? 0;
            }
          }

          const zeroOpt = inp.options.find((o) => o.points === 0);
          if (zeroOpt) {
            try {
              const zeroVals = { ...baseVals, [inp.id]: zeroOpt.value };
              const zeroRes = c.calculate(zeroVals);
              const zeroNumScore = typeof zeroRes.score === 'number' ? zeroRes.score : parseFloat(String(zeroRes.score));

              for (const opt of optionsWithPoints) {
                if (opt.value === zeroOpt.value) continue;
                const testVals = { ...baseVals, [inp.id]: opt.value };
                const res = c.calculate(testVals);
                const numScore = typeof res.score === 'number' ? res.score : parseFloat(String(res.score));

                if (!isNaN(numScore) && !isNaN(zeroNumScore)) {
                  const actualDelta = numScore - zeroNumScore;
                  const expectedDelta = (opt.points ?? 0) - (zeroOpt.points ?? 0);
                  if (actualDelta !== expectedDelta) {
                    findings.push({
                      calcId: c.id,
                      calcName: c.name,
                      category: c.category,
                      type: 'OPTION_POINTS_MISMATCH',
                      severity: 'HIGH',
                      message: `Input '${inp.id}' option '${opt.label}' (${opt.value}) declares points=${opt.points}, but calculate() score delta was ${actualDelta} (expected ${expectedDelta})`,
                      details: { inputId: inp.id, optionLabel: opt.label, declaredPoints: opt.points, actualDelta, expectedDelta },
                    });
                  }
                }
              }
            } catch {}
          }
        }
      }

      // Check Unused Inputs — try multiple baselines so AND/OR and early-exit
      // pathways are not false-positive flagged when the input is used on another path.
      for (const inp of c.inputs) {
        if (!inp.options || inp.options.length < 2) continue;

        const makeBase = (pick: (other: CalcInput) => any) => {
          const base: Record<string, any> = {};
          for (const other of c.inputs) {
            if (other.id === inp.id) continue;
            base[other.id] = pick(other);
          }
          return base;
        };

        const baselines: Record<string, any>[] = [
          makeBase((o) =>
            o.options?.length
              ? o.options[0].value
              : o.type === 'boolean'
                ? false
                : (o.defaultValue ?? o.min ?? 0)
          ),
          makeBase((o) =>
            o.options?.length
              ? o.options[o.options.length - 1].value
              : o.type === 'boolean'
                ? true
                : (o.defaultValue ?? o.max ?? 100)
          ),
          makeBase((o) =>
            o.options?.length
              ? o.options[Math.floor(o.options.length / 2)].value
              : o.type === 'boolean'
                ? true
                : (o.defaultValue ?? o.min ?? 0)
          ),
          makeBase((o) =>
            o.defaultValue !== undefined
              ? o.defaultValue
              : o.options?.length
                ? o.options[0].value
                : o.type === 'boolean'
                  ? false
                  : (o.min ?? 0)
          ),
        ];

        // Expand: each other option-input set independently to each of its options (enables AND gates)
        for (const other of c.inputs) {
          if (other.id === inp.id || !other.options?.length) continue;
          for (const opt of other.options) {
            const b = makeBase((o) =>
              o.defaultValue !== undefined
                ? o.defaultValue
                : o.options?.length
                  ? o.options[0].value
                  : o.type === 'boolean'
                    ? false
                    : (o.min ?? 0)
            );
            b[other.id] = opt.value;
            baselines.push(b);
          }
        }

        // Pairwise: for small calculators, try enabling two gates
        if (c.inputs.length <= 12) {
          const optionInputs = c.inputs.filter((o) => o.id !== inp.id && o.options && o.options.length >= 2);
          for (let i = 0; i < optionInputs.length; i++) {
            for (let j = i + 1; j < optionInputs.length; j++) {
              const a = optionInputs[i];
              const b = optionInputs[j];
              const base = makeBase((o) =>
                o.defaultValue !== undefined
                  ? o.defaultValue
                  : o.options?.length
                    ? o.options[0].value
                    : o.type === 'boolean'
                      ? false
                      : (o.min ?? 0)
              );
              base[a.id] = a.options![a.options!.length - 1].value;
              base[b.id] = b.options![b.options!.length - 1].value;
              baselines.push(base);
            }
          }
        }

        let hasVariation = false;
        for (const baseVals of baselines) {
          let firstResSerialized = '';
          for (let i = 0; i < inp.options.length; i++) {
            const testVals = { ...baseVals, [inp.id]: inp.options[i].value };
            try {
              const res = c.calculate(testVals);
              const ser = JSON.stringify(res);
              if (i === 0) {
                firstResSerialized = ser;
              } else if (ser !== firstResSerialized) {
                hasVariation = true;
                break;
              }
            } catch {
              hasVariation = true;
              break;
            }
          }
          if (hasVariation) break;
        }

        if (!hasVariation) {
          findings.push({
            calcId: c.id,
            calcName: c.name,
            category: c.category,
            type: 'UNUSED_INPUT',
            severity: 'HIGH',
            message: `Input '${inp.id}' (${inp.label}) has options but changing them never alters calculate() output`,
            details: { inputId: inp.id, label: inp.label },
          });
        }
      }
    }

    const outputPath = path.join(__dirname, '../scripts/auto_audit_results.json');
    fs.writeFileSync(outputPath, JSON.stringify(findings, null, 2));
    console.log(`Wrote ${findings.length} findings to ${outputPath}`);

    // Audit finding #2: the suite must fail CI when it produces findings.
    // See tests/audit-failure-policy.ts for the full, documented policy.
    const normalized: NormalizedFinding[] = findings.map((f) => ({
      calcId: f.calcId,
      issueType: f.type,
      severity: f.severity,
      message: f.message,
    }));
    assertAuditPolicy('Comprehensive Automated Scoring Audit', normalized, outputPath);
  });
});
