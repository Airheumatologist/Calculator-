import { describe, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { calculators } from '../src/data/calculators/index';
import { assertAuditPolicy, type NormalizedFinding } from './audit-failure-policy';

export interface AuditFinding {
  calcId: string;
  calcName: string;
  category: string;
  wave: string;
  issueType:
    | 'OPTION_POINTS_MISMATCH'
    | 'UNUSED_INPUT'
    | 'MISSING_INPUT_REF'
    | 'TYPE_MISMATCH'
    | 'NAN_SCORE'
    | 'CRASH'
    | 'UNDEFINED_RISK'
    | 'SCORING_LOGIC_BUG'
    | 'FORMULA_DISCREPANCY';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  summary: string;
  details: any;
}

const auditFindings: AuditFinding[] = [];

// Helper to determine wave for a calculator
function getWave(calcId: string, category: string): string {
  const cat = category.toLowerCase();
  if (['cardiology', 'pulmonary'].includes(cat)) return 'Wave A (Cardio & Pulm)';
  if (['critical-care', 'emergency', 'surgery', 'orthopedics'].includes(cat)) return 'Wave B (ICU, EM & Surgery)';
  if (['gastroenterology', 'nephrology', 'endocrinology'].includes(cat)) return 'Wave C (GI, Nephro & Endo)';
  if (['neurology', 'psychiatry'].includes(cat)) return 'Wave D (Neuro & Psych)';
  if (['pediatrics', 'obstetrics', 'toxicology', 'hematology', 'infectious-disease', 'oncology', 'urology', 'otolaryngology', 'dermatology', 'rheumatology', 'geriatrics', 'ophthalmology'].includes(cat)) return 'Wave E (Peds, OB, Heme/Onc, ID & Misc Specialties)';
  return 'Wave F (General, Formulas & Residual)';
}

describe('Master Scoring Audit Suite', () => {
  it('performs comprehensive scoring audit across all 918 calculators', () => {
    for (const c of calculators) {
      const wave = getWave(c.id, c.category);

      // -------------------------------------------------------------
      // 1. Build default values map
      // -------------------------------------------------------------
      const defaultVals: Record<string, any> = {};
      const inputIds = new Set<string>();
      for (const inp of c.inputs) {
        inputIds.add(inp.id);
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

      // -------------------------------------------------------------
      // 2. Execution & Safety Audit (Default, Min, Max)
      // -------------------------------------------------------------
      try {
        const res = c.calculate(defaultVals);
        if (!res) {
          auditFindings.push({
            calcId: c.id,
            calcName: c.name,
            category: c.category,
            wave,
            issueType: 'CRASH',
            severity: 'CRITICAL',
            summary: 'calculate() returned null or undefined for default inputs',
            details: { defaultVals },
          });
        } else {
          if (typeof res.score === 'number' && isNaN(res.score)) {
            auditFindings.push({
              calcId: c.id,
              calcName: c.name,
              category: c.category,
              wave,
              issueType: 'NAN_SCORE',
              severity: 'CRITICAL',
              summary: 'calculate() produced NaN numeric score on default inputs',
              details: { score: res.score },
            });
          }
          if (typeof res.score === 'string' && (res.score.includes('NaN') || res.score.includes('undefined'))) {
            auditFindings.push({
              calcId: c.id,
              calcName: c.name,
              category: c.category,
              wave,
              issueType: 'NAN_SCORE',
              severity: 'CRITICAL',
              summary: `calculate() produced invalid string score '${res.score}' on default inputs`,
              details: { score: res.score },
            });
          }
          if (!res.riskLevel) {
            auditFindings.push({
              calcId: c.id,
              calcName: c.name,
              category: c.category,
              wave,
              issueType: 'UNDEFINED_RISK',
              severity: 'MEDIUM',
              summary: 'calculate() returned empty or undefined riskLevel for default inputs',
              details: { defaultVals },
            });
          }
        }
      } catch (err: any) {
        auditFindings.push({
          calcId: c.id,
          calcName: c.name,
          category: c.category,
          wave,
          issueType: 'CRASH',
          severity: 'CRITICAL',
          summary: `calculate() threw exception on default inputs: ${err.message}`,
          details: { error: err.message },
        });
      }

      // -------------------------------------------------------------
      // 3. Option Points vs Calculation Delta Audit
      // -------------------------------------------------------------
      for (const inp of c.inputs) {
        if (!inp.options) continue;
        const optionsWithPoints = inp.options.filter((o) => typeof o.points === 'number');
        if (optionsWithPoints.length === 0) continue;

        // Baseline: set all other inputs to 0 / first option / false
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
                  auditFindings.push({
                    calcId: c.id,
                    calcName: c.name,
                    category: c.category,
                    wave,
                    issueType: 'OPTION_POINTS_MISMATCH',
                    severity: 'HIGH',
                    summary: `Option '${opt.label}' for input '${inp.id}' declares points=${opt.points}, but calculate() score delta was ${actualDelta} (expected ${expectedDelta})`,
                    details: {
                      inputId: inp.id,
                      optionLabel: opt.label,
                      optionValue: opt.value,
                      declaredPoints: opt.points,
                      zeroOptValue: zeroOpt.value,
                      zeroOptPoints: zeroOpt.points,
                      actualDelta,
                      expectedDelta,
                    },
                  });
                }
              }
            }
          } catch {}
        }
      }

      // -------------------------------------------------------------
      // 4. Unused / Ignored Input Audit
      // -------------------------------------------------------------
      for (const inp of c.inputs) {
        if (!inp.options || inp.options.length < 2) continue;

        const baseVals: Record<string, any> = {};
        for (const other of c.inputs) {
          if (other.options && other.options.length > 0) {
            baseVals[other.id] = other.options[0].value;
          } else if (other.type === 'boolean') {
            baseVals[other.id] = false;
          } else if (other.type === 'number') {
            baseVals[other.id] = other.min ?? 0;
          }
        }

        let firstResSerialized = '';
        let hasVariation = false;

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

        if (!hasVariation) {
          // Double check with another baseline
          const altVals: Record<string, any> = {};
          for (const other of c.inputs) {
            if (other.options && other.options.length > 0) {
              altVals[other.id] = other.options[other.options.length - 1].value;
            } else if (other.type === 'boolean') {
              altVals[other.id] = true;
            } else if (other.type === 'number') {
              altVals[other.id] = other.max ?? 100;
            }
          }

          let altFirstRes = '';
          for (let i = 0; i < inp.options.length; i++) {
            const testVals = { ...altVals, [inp.id]: inp.options[i].value };
            try {
              const res = c.calculate(testVals);
              const ser = JSON.stringify(res);
              if (i === 0) {
                altFirstRes = ser;
              } else if (ser !== altFirstRes) {
                hasVariation = true;
                break;
              }
            } catch {
              hasVariation = true;
              break;
            }
          }
        }

        if (!hasVariation) {
          auditFindings.push({
            calcId: c.id,
            calcName: c.name,
            category: c.category,
            wave,
            issueType: 'UNUSED_INPUT',
            severity: 'CRITICAL',
            summary: `Input '${inp.id}' (${inp.label}) has options but changing them NEVER affects calculate() output in any tested combination`,
            details: { inputId: inp.id, label: inp.label },
          });
        }
      }

      // -------------------------------------------------------------
      // 5. Code inspection of calculate() string representation
      //    to find accesses to undefined input IDs
      // -------------------------------------------------------------
      const calcStr = c.calculate.toString();
      const valueAccesses = [...calcStr.matchAll(/values\.([a-zA-Z0-9_]+)/g)].map((m) => m[1]);
      for (const accessedId of valueAccesses) {
        if (!inputIds.has(accessedId)) {
          auditFindings.push({
            calcId: c.id,
            calcName: c.name,
            category: c.category,
            wave,
            issueType: 'MISSING_INPUT_REF',
            severity: 'CRITICAL',
            summary: `calculate() references values.${accessedId}, but '${accessedId}' is NOT in inputs array!`,
            details: { accessedId },
          });
        }
      }
    }

    const outputPath = path.join(__dirname, '../scripts/master_audit_findings.json');
    fs.writeFileSync(outputPath, JSON.stringify(auditFindings, null, 2));
    console.log(`Master Audit Complete! Wrote ${auditFindings.length} findings to ${outputPath}`);

    // Audit finding #2: the suite must fail CI when it produces findings.
    // See tests/audit-failure-policy.ts for the full, documented policy.
    const normalized: NormalizedFinding[] = auditFindings.map((f) => ({
      calcId: f.calcId,
      issueType: f.issueType,
      severity: f.severity,
      message: f.summary,
    }));
    assertAuditPolicy('Master Scoring Audit Suite', normalized, outputPath);
  });
});
