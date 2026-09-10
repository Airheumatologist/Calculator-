# MedCalc Live Audit

## Scope

This audit covered revision `a66352a` and used four parallel reviews plus local execution checks.

- 918 unique calculators across 42 calculator data modules
- 981 application references
- Calculator formulas, defaults, boundaries, option points, input wiring, risk outputs, UI flows, references, audit scripts, and tests
- No calculator source files were changed as part of the audit

## Findings

### High severity

#### 1. Clearing a required numeric input can produce a clinical result

`numberInput()` marks numeric fields as required, but clearing a field converts it to `null` and calculation proceeds. In YEARS, `num(values.ddimer, 0)` converts an empty D-dimer to zero, which can produce **“PE excluded by YEARS”**.

Evidence:

- [`src/components/CalculatorForm.tsx`](src/components/CalculatorForm.tsx#L55-L62)
- [`src/pages/CalculatorPage.tsx`](src/pages/CalculatorPage.tsx#L44-L50)
- [`src/data/calculators/missing-emergency.ts`](src/data/calculators/missing-emergency.ts#L183-L203)

Recommended fix: block calculation while any required input is empty and show an incomplete-input state.

#### 2. Automated scoring audits do not fail when findings exist

The master and scoring audit tests write findings to JSON but do not assert that the findings array is empty. A future regression can therefore pass CI while reporting defects.

Evidence:

- [`tests/audit-master-suite.test.ts`](tests/audit-master-suite.test.ts#L283-L303)
- [`tests/audit-scoring-auto.test.ts`](tests/audit-scoring-auto.test.ts#L283-L299)

Recommended fix: add an assertion such as `expect(auditFindings).toEqual([])` after writing the report, or fail on any high/critical finding according to an explicit policy.

#### 3. Clinical formula correctness is not comprehensively proven

The suite executes all 918 calculators with synthetic defaults, min/max values, and option permutations, but expected-value assertions cover only a small regression subset. The remaining calculators do not have independent clinical oracle cases.

Recommended fix: add representative expected-value and boundary cases for every calculator, with source-specific clinical references for the expected outputs.

#### 4. The deep-logic audit does not implement the checks its name claims

The test computes `isHigherBetter` but never uses it. The implemented checks cover maximum-input crashes and NaN scores, not risk thresholds, monotonicity, formulas, or interpretation bands.

Evidence: [`tests/audit-deep-logic.test.ts`](tests/audit-deep-logic.test.ts#L7-L58)

Recommended fix: implement explicit threshold, monotonicity, and expected-band assertions or rename the test to reflect its actual coverage.

### Medium severity

#### 5. Reference audit parsers disagree about the inventory

`audit:evidence` reports 981 references and 839 PMIDs. `validate-pmids` scans 979 references and 837 PMIDs because its regex does not parse the two double-quoted reference entries.

Evidence:

- [`scripts/audit-evidence.mjs`](scripts/audit-evidence.mjs#L20-L75)
- [`scripts/validate-pmids.py`](scripts/validate-pmids.py#L25-L57)

Recommended fix: use one shared parser or make both parsers support the same TypeScript literal forms, then regenerate all reports.

#### 6. Checked-in evidence reports are stale and contradictory

The checked-in intermediate relevance report claims 119 mismatches and one DOI mismatch, while the later curated v5 audit reports 838 matched PMID references, zero confirmed mismatches, and one soft suspect. The final report also has stale counts compared with the current inventory.

The curated v5 audit and direct source checks did not confirm the apparent mismatches from the older heuristic report. The repository should identify one authoritative audit output and remove or label obsolete snapshots.

Relevant files:

- [`scripts/audit-evidence/PMID-RELEVANCE-SUMMARY.md`](scripts/audit-evidence/PMID-RELEVANCE-SUMMARY.md)
- [`scripts/audit-evidence/PMID-AUDIT-FINAL.md`](scripts/audit-evidence/PMID-AUDIT-FINAL.md)
- [`scripts/audit-evidence/pmid-v5-summary.json`](scripts/audit-evidence/pmid-v5-summary.json)

#### 7. Six direct evidence URLs are unavailable

Independent checks found unavailable links for:

- START triage: `https://www.remm.nlm.gov/startadult.htm`
- US Navy body-composition equations: `https://www.usna.edu/PEDept/documents/navypep/Hodgdon_Beckett_1996.pdf`
- WHO waist-ratio publication: `https://www.who.int/publications/i/item/9241208945`
- American Burn Association referral criteria: `https://ameriburn.org/public-resources/burn-center-referral-criteria/`
- ACR Lung-RADS: `https://www.acr.org/Clinical-Resources/Reporting-and-Data-Systems/Lung-Rads`
- ACR LI-RADS: `https://www.acr.org/Clinical-Resources/Reporting-and-Data-Systems/LI-RADS`

These entries do not have alternate identifiers in the affected reference records.

#### 8. Calculator controls have accessibility gaps

Numeric inputs have no programmatic `<label>` association. Option buttons expose visual selection but not `aria-pressed`, radio semantics, or group semantics. Live results have no `aria-live` region.

Evidence:

- [`src/components/CalculatorForm.tsx`](src/components/CalculatorForm.tsx#L37-L116)
- [`src/components/LiveResult.tsx`](src/components/LiveResult.tsx#L5-L18)

#### 9. Documentation gives the wrong calculator count

The README architecture diagrams say 922 calculators while the live registry contains 918.

Evidence: [`README.md`](README.md#L97-L101)

### Low severity

- Declared `step` values are rendered but never validated.
- Route changes can briefly calculate a new calculator using the previous calculator's state before the reset effect runs.
- Lint reports 15 warnings, including unused audit-test variables and a comma-expression warning.
- The production bundle is approximately 2.9 MB minified before gzip.
- Production dependency audit reports two high-severity `react-router` advisories.

## Reference validation

- 981 total references
- 839 PMID references
- 764 DOI references
- 155 direct URLs
- No reference without at least one identifier or link
- All 722 unique PMIDs checked by the strict validator resolved to PubMed
- Curated v5 relevance audit: 838 matched, 0 confirmed mismatches, 1 soft suspect

The live heuristic relevance script produced apparent mismatches for citations such as EDACS and sPESI, but those are false positives from weak title-token matching, not confirmed citation errors.

## Verification results

- `npm test`: passed, 5 files / 40 tests
- `npm run build`: passed
- `npm run lint`: 0 errors, 15 warnings
- Registry scoring audit output: 0 findings
- Deep execution sweep: 0 crashes or NaN results
- Working tree was clean before adding this audit

## Priority order

1. Prevent calculations from running with missing required inputs.
2. Make automated audits fail on findings.
3. Consolidate reference parsers and regenerate stale reports.
4. Add clinical oracle and boundary tests for all calculators.
5. Repair unavailable reference URLs and address accessibility gaps.
