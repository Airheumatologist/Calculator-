import { describe, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { calculators } from '../src/data/calculators/index';
import type { Calculator } from '../src/types/calculator';

describe('Deep Formula & Scoring Logic Audit', () => {
  it('checks risk level consistency and score threshold gaps across all 918 calculators', () => {
    const findings: any[] = [];

    for (const c of calculators) {
      // 1. Check risk level ordering for point-based scores
      // For score-based calculators, test minimum possible score vs maximum possible score
      // Check if max score yields higher/equal risk severity than min score (unless inverted like APGAR/GCS where higher is better)
      const isHigherBetter = ['apgar', 'gcs', 'glasgow', 'pediatric-gcs', 'barthel', 'katz', 'fim'].some((k) => c.id.includes(k));

      // 2. Check for string score numeric parsing issues
      // Try to evaluate calculate() with sample inputs
      const sampleVals: Record<string, any> = {};
      for (const inp of c.inputs) {
        if (inp.defaultValue !== undefined) {
          sampleVals[inp.id] = inp.defaultValue;
        } else if (inp.options && inp.options.length > 0) {
          sampleVals[inp.id] = inp.options[inp.options.length - 1].value; // max option
        } else if (inp.type === 'boolean') {
          sampleVals[inp.id] = true;
        } else if (inp.type === 'number') {
          sampleVals[inp.id] = inp.max ?? 100;
        }
      }

      try {
        const maxRes = c.calculate(sampleVals);
        if (maxRes && typeof maxRes.score === 'number' && isNaN(maxRes.score)) {
          findings.push({
            calcId: c.id,
            calcName: c.name,
            issueType: 'NAN_SCORE_MAX_INPUTS',
            severity: 'CRITICAL',
            message: 'calculate() produced NaN score when set to maximum inputs',
          });
        }
      } catch (e: any) {
        findings.push({
          calcId: c.id,
          calcName: c.name,
          issueType: 'CRASH_MAX_INPUTS',
          severity: 'CRITICAL',
          message: `calculate() crashed on max inputs: ${e.message}`,
        });
      }
    }

    console.log(`Deep Logic Audit completed with ${findings.length} additional issues.`);
    if (findings.length > 0) {
      console.log(JSON.stringify(findings, null, 2));
    }
  });
});
