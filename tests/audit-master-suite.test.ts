import { describe, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { calculators } from '../src/data/calculators/index';
import type { CalcInput } from '../src/types/calculator';
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

/**
 * Probe values for a numeric input: declared min, max, midpoint, and
 * defaultValue, deduped. Falls back to 0/100 when the input declares fewer
 * than two distinguishable values (mirrors the min ?? 0 / max ?? 100
 * fallbacks the option-permutation check uses). An input with only one
 * distinct probe value cannot be varied and is skipped by the caller.
 */
function numericProbeValues(inp: CalcInput): number[] {
  const cands: number[] = [];
  if (inp.min !== undefined && Number.isFinite(inp.min)) cands.push(inp.min);
  if (inp.max !== undefined && Number.isFinite(inp.max)) cands.push(inp.max);
  if (
    inp.min !== undefined &&
    inp.max !== undefined &&
    Number.isFinite(inp.min) &&
    Number.isFinite(inp.max) &&
    inp.min < inp.max
  ) {
    cands.push((inp.min + inp.max) / 2);
  }
  if (typeof inp.defaultValue === 'number' && Number.isFinite(inp.defaultValue)) {
    cands.push(inp.defaultValue);
  }
  if (new Set(cands).size < 2) cands.push(0, 100);
  return [...new Set(cands.filter((n) => Number.isFinite(n)))];
}

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

      // -------------------------------------------------------------
      // 6. Unused declared input — static reverse scan
      //    Exact mirror image of the scan above: every DECLARED input
      //    id must appear as `values.<id>` somewhere in
      //    calculate().toString() (same regex as the forward scan).
      //    This catches inputs with no options — e.g. a numeric input
      //    like eclampsia-mag.weightKg that calculate() never reads.
      //    Structural guard: the scan only runs when `values` appears
      //    exactly once outside `values.<id>` member accesses — i.e.
      //    only as the `calculate(values)` parameter. Any other bare
      //    `values` token (bracket access `values[k]`, aliasing
      //    `const v = values`, destructuring, or passing `values` to a
      //    helper) can reach a declared input invisibly to the regex,
      //    so the scan cannot prove an input unused there and is
      //    skipped for that calculator (Check 7 below still covers its
      //    numeric inputs behaviorally).
      // -------------------------------------------------------------
      const bareValuesTokens = [...calcStr.matchAll(/(?<![.\w])values\b(?![.\w])/g)].length;
      if (bareValuesTokens === 1) {
        const accessedIds = new Set(valueAccesses);
        for (const inp of c.inputs) {
          if (!accessedIds.has(inp.id)) {
            auditFindings.push({
              calcId: c.id,
              calcName: c.name,
              category: c.category,
              wave,
              issueType: 'UNUSED_INPUT',
              severity: 'CRITICAL',
              summary: `Input '${inp.id}' (${inp.label}) is declared but never read as values.${inp.id} anywhere in calculate()`,
              details: { inputId: inp.id, label: inp.label, check: 'static reverse scan' },
            });
          }
        }
      }

      // -------------------------------------------------------------
      // 7. Numeric perturbation audit (declared-and-read-but-inert)
      //    Perturb each numeric input (no options) across its min /
      //    mid / max / default and flag it when NO tested configuration
      //    changes the serialized result. An input counts as USED as
      //    soon as one configuration varies, so mode-gated inputs pass
      //    as long as their gating mode is exercised. Configuration
      //    space, capped to stay far below combinatorial:
      //      - four full baselines: all-min / all-max / all-mid /
      //        all-default (options first, booleans false for the first
      //        three; options last, booleans true for all-max);
      //      - one select/boolean "gate" input at a time at every other
      //        option value, rest at the all-min baseline;
      //      - one OTHER numeric at a time across its own probe values,
      //        rest at the all-min baseline (catches inputs that only
      //        matter when a sibling numeric sits near its default,
      //        e.g. hellp astUln vs ast ≈ 2×ULN).
      //    A throw during variation counts as variation (same
      //    convention as the option-permutation check). A per-
      //    calculator call cap is a pure runtime safety valve: inputs
      //    still untested when it trips count as used, never flagged.
      // -------------------------------------------------------------
      const numericTargets = c.inputs.filter(
        (inp) => inp.type === 'number' && !(inp.options && inp.options.length > 0)
      );
      if (numericTargets.length > 0) {
        const numAt = (inp: CalcInput, mode: 'min' | 'max' | 'mid' | 'default'): number => {
          if (mode === 'min') return inp.min ?? 0;
          if (mode === 'max') return inp.max ?? 100;
          if (mode === 'mid') {
            if (
              inp.min !== undefined &&
              inp.max !== undefined &&
              Number.isFinite(inp.min) &&
              Number.isFinite(inp.max) &&
              inp.min < inp.max
            ) {
              return (inp.min + inp.max) / 2;
            }
            return typeof inp.defaultValue === 'number' ? inp.defaultValue : (inp.min ?? 0);
          }
          return typeof inp.defaultValue === 'number' ? inp.defaultValue : (inp.min ?? 0);
        };
        const buildBase = (
          numMode: 'min' | 'max' | 'mid' | 'default',
          optMode: 'first' | 'last',
          boolVal: boolean
        ): Record<string, any> => {
          const v: Record<string, any> = {};
          for (const other of c.inputs) {
            if (other.options && other.options.length > 0) {
              v[other.id] = optMode === 'first' ? other.options[0].value : other.options[other.options.length - 1].value;
            } else if (other.type === 'boolean') {
              v[other.id] = boolVal;
            } else if (other.type === 'number') {
              v[other.id] = numAt(other, numMode);
            }
          }
          return v;
        };
        const minBase = buildBase('min', 'first', false);
        const maxBase = buildBase('max', 'last', true);
        const midBase = buildBase('mid', 'first', false);
        const defBase = buildBase('default', 'first', false);

        const baseCfgs: Record<string, any>[] = [];
        const baseKeys = new Set<string>();
        const addCfg = (cfg: Record<string, any>) => {
          const key = JSON.stringify(cfg);
          if (baseKeys.has(key)) return;
          baseKeys.add(key);
          baseCfgs.push(cfg);
        };
        addCfg(minBase);
        addCfg(maxBase);
        addCfg(midBase);
        addCfg(defBase);
        for (const gate of c.inputs) {
          if (!gate.options || gate.options.length === 0) continue;
          for (const opt of gate.options) {
            if (opt.value === minBase[gate.id]) continue;
            addCfg({ ...minBase, [gate.id]: opt.value });
          }
        }

        const CALL_CAP = 4000;
        let calcCalls = 0;
        for (const t of numericTargets) {
          const probeVals = numericProbeValues(t);
          if (probeVals.length < 2) continue; // single distinct value cannot be varied

          const configs = [...baseCfgs];
          const cfgKeys = new Set(baseKeys);
          for (const n of c.inputs) {
            if (n.id === t.id || n.type !== 'number' || (n.options && n.options.length > 0)) continue;
            for (const v of numericProbeValues(n)) {
              if (v === minBase[n.id]) continue;
              const cfg = { ...minBase, [n.id]: v };
              const key = JSON.stringify(cfg);
              if (cfgKeys.has(key)) continue;
              cfgKeys.add(key);
              configs.push(cfg);
            }
          }

          const variesOutput = (): boolean => {
            for (const cfg of configs) {
              let firstSer: any;
              let haveFirst = false;
              for (const val of probeVals) {
                if (++calcCalls > CALL_CAP) return true; // runtime safety valve — never flags
                try {
                  const ser = JSON.stringify(c.calculate({ ...cfg, [t.id]: val }));
                  if (!haveFirst) {
                    firstSer = ser;
                    haveFirst = true;
                  } else if (ser !== firstSer) {
                    return true;
                  }
                } catch {
                  return true;
                }
              }
            }
            return false;
          };

          if (!variesOutput()) {
            auditFindings.push({
              calcId: c.id,
              calcName: c.name,
              category: c.category,
              wave,
              issueType: 'UNUSED_INPUT',
              severity: 'CRITICAL',
              summary: `Numeric input '${t.id}' (${t.label}) was varied across ${probeVals.join('/')} in ${configs.length} configurations but NEVER affects calculate() output`,
              details: { inputId: t.id, label: t.label, probeVals, configsTested: configs.length, check: 'numeric perturbation' },
            });
          }
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
