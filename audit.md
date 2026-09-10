# MedCalc Live Audit

## Scope

This audit covered revision `a66352a` and used four parallel reviews plus local execution checks.

- 918 unique calculators across 42 calculator data modules
- 982 application references
- Calculator formulas, defaults, boundaries, option points, input wiring, risk outputs, UI flows, references, audit scripts, and tests
- No calculator source files were changed as part of the audit

## Status

All findings below have been addressed. Each carries a `Status:` line describing what was done and,
where the original finding turned out to be wrong, what the corrected fact is.

Post-fix verification (see [Verification results](#verification-results)): 227 tests across 8 files,
0 lint warnings, 0 npm advisories, 0 audit findings from either automated scoring suite.

## Findings

### High severity

#### 1. Clearing a required numeric input can produce a clinical result

`numberInput()` marks numeric fields as required, but clearing a field converts it to `null` and calculation proceeds. In YEARS, `num(values.ddimer, 0)` converts an empty D-dimer to zero, which can produce **“PE excluded by YEARS”**.

Evidence:

- [`src/components/CalculatorForm.tsx`](src/components/CalculatorForm.tsx#L55-L62)
- [`src/pages/CalculatorPage.tsx`](src/pages/CalculatorPage.tsx#L44-L50)
- [`src/data/calculators/missing-emergency.ts`](src/data/calculators/missing-emergency.ts#L183-L203)

Recommended fix: block calculation while any required input is empty and show an incomplete-input state.

Status: **Fixed.** `getMissingRequiredInputs()` and `incompleteResult()` in `src/utils/helpers.ts` mirror the
existing out-of-range guard; `CalculatorPage` checks them before it ever calls `calculate()`, and the form
marks the empty field. Two follow-on defects surfaced while fixing this and were also fixed:

- `numberInput()` marked *every* numeric input required, including 75 that declare themselves optional in
  their own label or help text. Those now pass `required: false`, so a blank value is a legitimate state.
- Of those 75, 33 fell into the same trap as the D-dimer bug more quietly: a blank field fell back to a
  plausible clinical value (`num(values.hb, 10)`, `num(values.a1c, 5.7)`, `num(values.map, 65)`) and that
  invented measurement entered the score, risk level, or interpretation. Each now takes an explicit
  absent-value path that states the value was not entered instead of substituting one. `pals-cpr-depth`
  was the starkest: it returned "Within educational quality targets" from a compression rate and depth
  nobody had measured.

#### 2. Automated scoring audits do not fail when findings exist

The master and scoring audit tests write findings to JSON but do not assert that the findings array is empty. A future regression can therefore pass CI while reporting defects.

Evidence:

- [`tests/audit-master-suite.test.ts`](tests/audit-master-suite.test.ts#L283-L303)
- [`tests/audit-scoring-auto.test.ts`](tests/audit-scoring-auto.test.ts#L283-L299)

Recommended fix: add an assertion such as `expect(auditFindings).toEqual([])` after writing the report, or fail on any high/critical finding according to an explicit policy.

Status: **Fixed.** `tests/audit-failure-policy.ts` holds the written policy: CRITICAL and HIGH always fail
and can never be allowlisted; any other finding fails unless its `calcId::issueType` is in
`AUDIT_ALLOWLIST` with a reason. The allowlist is empty and a test asserts it stays empty. Failure output
is capped at 25 compact lines so CI stays readable. `tests/audit-failure-policy.test.ts` proves the gate
actually throws rather than trusting that it would.

#### 3. Clinical formula correctness is not comprehensively proven

The suite executes all 918 calculators with synthetic defaults, min/max values, and option permutations, but expected-value assertions cover only a small regression subset. The remaining calculators do not have independent clinical oracle cases.

Recommended fix: add representative expected-value and boundary cases for every calculator, with source-specific clinical references for the expected outputs.

Status: **Partly fixed, gap now measured.** `tests/clinical-oracles.test.ts` runs a data-driven oracle
table (`tests/oracles/`) of 155 cases across 79 calculators. Every expected value was derived by hand from
the published score definition cited in the case's `source` field, not read back from the implementation.
The coverage test prints `ORACLE_COVERAGE: 79/918` and enforces a floor that may only be raised, so the
remaining 839 calculators are a visible number rather than an implied gap. Closing it is ongoing work.

#### 4. The deep-logic audit does not implement the checks its name claims

The test computes `isHigherBetter` but never uses it. The implemented checks cover maximum-input crashes and NaN scores, not risk thresholds, monotonicity, formulas, or interpretation bands.

Evidence: [`tests/audit-deep-logic.test.ts`](tests/audit-deep-logic.test.ts#L7-L58)

Recommended fix: implement explicit threshold, monotonicity, and expected-band assertions or rename the test to reflect its actual coverage.

Status: **Fixed.** The suite now sweeps all 918 calculators at minimum, default, and maximum inputs
(previously maximum only), asserts monotonicity on the 184 purely point-summed calculators, and validates
risk bands and severity direction on 356 ordinal calculators. `isHigherBetter` became an explicit
25-entry id list that drives the inverted-direction assertion. Formula calculators (clearances, ratios,
MELD, FENa) are excluded categorically rather than suppressed individually; one calculator, `aki-cause`,
is an explicit documented exception because its risk level encodes which diagnosis is favoured rather
than a severity.

The original id-substring match (`c.id.includes('glasgow')`) would have wrongly swept in `glasgow-imrie`
and `glasgow-meningococcal`, both higher-is-worse. It never mattered only because the variable was dead.

### Medium severity

#### 5. Reference audit parsers disagree about the inventory

`audit:evidence` reports 981 references and 839 PMIDs. `validate-pmids` scans 979 references and 837 PMIDs because its regex does not parse the two double-quoted reference entries.

Evidence:

- [`scripts/audit-evidence.mjs`](scripts/audit-evidence.mjs#L20-L75)
- [`scripts/validate-pmids.py`](scripts/validate-pmids.py#L25-L57)

Recommended fix: use one shared parser or make both parsers support the same TypeScript literal forms, then regenerate all reports.

Status: **Fixed.** `scripts/lib/reference-parser.mjs` is now the single source of truth — a string-aware
scanner rather than a regex — and emits `scripts/audit-evidence/refs-inventory.json` with a sha256 of the
sources it was built from. `validate-pmids.py` and `audit-pmid-relevance.py` had their own parsers deleted
and read that inventory through `scripts/lib/inventory.py`, which fails loudly (exit 2, "run
`npm run audit:evidence` first") if the inventory is missing or stale rather than silently reporting zero.
Three parsers became one, and both tools now report identical counts.

The two entries the Python regex dropped were `pregnancy-dating` (a title containing an apostrophe inside
a double-quoted string) and `downs-score`, which carried the only PMID that appeared nowhere else — the
source of the 722-vs-723 unique-PMID discrepancy. The old `.mjs` parser counted both but read their
titles as empty, which is also why the curated v5 pass flagged `pregnancy-dating` as its "soft suspect":
a parser artefact, not a citation problem.

#### 6. Checked-in evidence reports are stale and contradictory

The checked-in intermediate relevance report claims 119 mismatches and one DOI mismatch, while the later curated v5 audit reports 838 matched PMID references, zero confirmed mismatches, and one soft suspect. The final report also has stale counts compared with the current inventory.

The curated v5 audit and direct source checks did not confirm the apparent mismatches from the older heuristic report. The repository should identify one authoritative audit output and remove or label obsolete snapshots.

Relevant files:

- `scripts/audit-evidence/PMID-RELEVANCE-SUMMARY.md`
- `scripts/audit-evidence/PMID-AUDIT-FINAL.md`
- `scripts/audit-evidence/pmid-v5-summary.json`

Status: **Fixed.** `scripts/audit-evidence/EVIDENCE-AUDIT.md` plus its machine twin `refs-inventory.json`
are the one authoritative output, regenerated by `npm run audit:evidence` and stamped with a source hash.
`scripts/audit-evidence/README.md` names it, gives the regeneration command, and records that the
heuristic relevance mismatches (EDACS, sPESI, PERC) are false positives from weak title-token matching.
Five megabytes of superseded intermediate snapshots were deleted; four non-regenerable files that document
what was actually changed in `src/` moved to `scripts/audit-evidence/archive/` behind a HISTORICAL banner.

#### 7. Six direct evidence URLs are unavailable

Independent checks found unavailable links for:

- START triage: `https://www.remm.nlm.gov/startadult.htm`
- US Navy body-composition equations: `https://www.usna.edu/PEDept/documents/navypep/Hodgdon_Beckett_1996.pdf`
- WHO waist-ratio publication: `https://www.who.int/publications/i/item/9241208945`
- American Burn Association referral criteria: `https://ameriburn.org/public-resources/burn-center-referral-criteria/`
- ACR Lung-RADS: `https://www.acr.org/Clinical-Resources/Reporting-and-Data-Systems/Lung-Rads`
- ACR LI-RADS: `https://www.acr.org/Clinical-Resources/Reporting-and-Data-Systems/LI-RADS`

These entries do not have alternate identifiers in the affected reference records.

Status: **Fixed, and the finding was overstated — 4 of the 6 were broken, not 6.**

- START triage: host retired, NLM's REMM moved to HHS ASPR → `https://remm.hhs.gov/startadult.htm` (200,
  page title confirmed).
- US Navy: the URL 404s and named the wrong year. The cited work is two separate 1984 NHRC reports, so the
  single reference became two, identified by DOI (`10.21236/ada143890` men, `10.21236/ada146456` women),
  verified through DataCite metadata. No PMID exists for either.
- WHO: reindexed under its 13-digit ISBN → `.../item/9789241501491` (200, 2008 expert consultation).
- ABA: site restructured. Now carries PMID `32123911` (the 2018 eDelphi consensus study the criteria rest
  on) plus the current live ABA page; the record's `year` moved 2018 → 2020 to match the PubMed record.
- Both ACR links are **live**. They return 404 to `curl` because ACR blocks non-browser clients; a real
  browser fetch renders both pages. Whatever produced this finding did a status-code-only check. A link
  checker for this repo must treat that response pattern as inconclusive, or the finding will recur.

#### 8. Calculator controls have accessibility gaps

Numeric inputs have no programmatic `<label>` association. Option buttons expose visual selection but not `aria-pressed`, radio semantics, or group semantics. Live results have no `aria-live` region.

Evidence:

- [`src/components/CalculatorForm.tsx`](src/components/CalculatorForm.tsx#L37-L116)
- [`src/components/LiveResult.tsx`](src/components/LiveResult.tsx#L5-L18)

Status: **Fixed.** Numeric inputs get a real `<label htmlFor>` plus `aria-describedby` for help and error
text. Option lists became `role="radiogroup"` with an accessible name, each option a `role="radio"` with
`aria-checked`, a roving `tabIndex`, and arrow-key selection — radio semantics rather than `aria-pressed`,
because these choices are mutually exclusive and `aria-pressed` cannot express that. The result panel is
`role="status" aria-live="polite" aria-atomic="true"`. Verified in a browser via the accessibility tree.

#### 9. Documentation gives the wrong calculator count

The README architecture diagrams say 922 calculators while the live registry contains 918.

Evidence: [`README.md`](README.md#L97-L101)

Status: **Fixed**, along with four other stale README facts found while checking: the routing section
documented `BrowserRouter` and path routes when the app uses `HashRouter` and hash routes, the Node
requirement said 18+ when Vite 8 requires 20.19+/22.12+, and the directory and registry listings showed
12 of the 42 data modules. The README deliberately still carries no reference counts; it points at
`npm run audit:evidence` instead, which is what stops this finding recurring.

### Low severity

- Declared `step` values are rendered but never validated. **Fixed** — `getStepViolations()` blocks
  calculation and reports the nearest allowed value, using an epsilon so 0.1 steps accept 7.3, and
  accepting either the `min`-offset grid or the zero grid because several existing calculators ship
  defaults that only fit the latter.
- Route changes can briefly calculate a new calculator using the previous calculator's state before the
  reset effect runs. **Fixed** — `values` now lives in one state atom alongside the calculator id it
  belongs to and is reset during render, so no render can pair one calculator with another's values.
- Lint reports 15 warnings, including unused audit-test variables and a comma-expression warning.
  **Fixed** — 0 warnings.
- The production bundle is approximately 2.9 MB minified before gzip. **Partly addressed.** The single
  chunk is now 16 (`manualChunks`), so React caches separately from the data and editing one calculator
  family invalidates ~130–255 kB instead of everything. First-load bytes are essentially unchanged
  (+0.4% chunk overhead): every calculator definition is statically reachable because both pages consume
  the registry synchronously during render, as does the test suite. Real first-load reduction requires the
  home page to consume a lightweight name/category index and `CalculatorPage` to await its data module.
- Production dependency audit reports two high-severity `react-router` advisories. **Fixed** — all six
  advisories resolved (`react-router-dom` 7.18.1 → 7.18.3, `postcss` → 8.5.28, `nanoid` → 3.3.18,
  `vitest` 3.2.7 → 4.1.11). `npm audit` reports 0 vulnerabilities with and without dev dependencies.

## Reference validation

Counts below are current, and higher than the original audit's because fixing finding #7 split one
reference into two and closing the parser gap in #5 exposed one previously invisible unique PMID.

- 982 total references
- 840 PMID references (724 unique)
- 766 DOI references
- 154 direct URLs
- No reference without at least one identifier or link
- All 724 unique PMIDs resolve to PubMed
- Curated v5 relevance audit: 0 confirmed mismatches, and its 1 soft suspect was a parser artefact

The live heuristic relevance script produced apparent mismatches for citations such as EDACS and sPESI, but those are false positives from weak title-token matching, not confirmed citation errors.

## Verification results

- `npm test`: passed, 8 files / 227 tests (was 5 files / 40 tests)
- `npm run build`: passed, 16 chunks, no size warning
- `npx tsc -b`: passed
- `npm run lint`: 0 errors, 0 warnings (was 15 warnings)
- `npm audit`: 0 vulnerabilities (was 6)
- Registry scoring audit output: 0 findings, and both suites now fail the build if that changes
- Deep execution sweep: 0 crashes or NaN results at minimum, default, and maximum inputs
- Clinical oracle coverage: 79/918 calculators, 155 hand-derived cases
- Browser check: home page renders 918 calculators, hash deep-links work, live scoring recomputes,
  no console errors

## Priority order

1. Prevent calculations from running with missing required inputs. **Done**
2. Make automated audits fail on findings. **Done**
3. Consolidate reference parsers and regenerate stale reports. **Done**
4. Add clinical oracle and boundary tests for all calculators. **In progress — 79/918**
5. Repair unavailable reference URLs and address accessibility gaps. **Done**

## Remaining work

1. Oracle cases for the 839 calculators that still have none (finding #3).
2. First-load bundle weight, which needs the pages to load calculator data on demand (low-severity bullet).
3. A link checker that distinguishes a dead URL from a bot-blocked one, so finding #7 does not recur.
