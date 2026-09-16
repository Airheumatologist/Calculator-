# Calculator Repository Audit

Repository: `Airheumatologist/Calculator-`

Date: 2026-09-16

## Scope

This is a repo-wide static audit of the registered calculator system. It covers the shared execution path used by all 1004 registered calculators, registry composition across every calculator module, input validation/default behavior, CI/test coverage, result/error handling, evidence metadata, and representative calculator implementations. No calculator implementation code was changed.

This audit does **not** claim independent source-by-source clinical re-derivation of all 1004 formulas. For a clinical calculator library of this size, formula validation should be enforced with source-linked golden test vectors and review metadata rather than a one-time manual pass.

## Executive summary

The largest risks are systemic rather than isolated syntax defects:

1. **There is no automated calculator test suite.** `package.json` has no `test` script, `src/` has no test directory, and CI only runs lint plus type-check/build. This is the highest-priority gap for a 1000+ clinical calculator library.
2. **Calculator correctness depends too heavily on default/fallback behavior.** The shared `num()` helper converts missing/unparseable values to `0` (or another caller-supplied fallback), while missing-input blocking only applies when inputs are explicitly required or inferred as questionnaire items. A malformed calculator definition can therefore produce a plausible result from absent data.
3. **Many patient-dependent numeric calculators start with representative default values.** Because results are live, a user can see a clinically plausible score before entering patient data. This is convenient for demos but unsafe as a default interaction model.
4. **Duplicate calculator IDs only emit `console.warn`.** Duplicate IDs should fail CI/build because `getCalculator()` returns the first match and silently hides the later one.
5. **The page catches all calculator exceptions and re-labels them as “Incomplete.”** A genuine implementation defect can be hidden as an input problem, making failures harder to detect and potentially misleading users.
6. **Shared helper contracts are under-validated.** `riskFromThresholds()` assumes correctly sorted thresholds and a valid terminal bucket; select values are not centrally validated against allowed options; calculator metadata is not schema-validated at registry load.
7. **Clinical evidence and management guidance can drift independently from calculation logic.** There is no required `lastReviewed`, guideline/source version, validation status, or source linkage for individual treatment/next-step thresholds.
8. **README/CI language implies stronger testing than exists.** The README mentions a “test suite,” but the repository currently has no test command and CI does not execute calculator tests.

## Findings and recommended fixes

### P0 — Add a real calculator test suite

**Finding**

- `package.json` scripts: `dev`, `build`, `lint`, `preview`; no `test` command.
- `.github/workflows/ci.yml` runs `npm run lint` and `npm run build` only.
- No test directory is present under `src/`.

**Risk**

TypeScript and linting can prove structural consistency, but they cannot verify that formulas, thresholds, point assignments, branch logic, or interpretations are clinically correct.

**Recommended fix**

Add a test harness that executes every registered calculator and requires at least:

- one known-reference case,
- one boundary case per threshold,
- one missing-input case,
- one invalid-range case,
- one zero-value case where zero is clinically valid,
- one maximum/minimum valid case,
- one unit-sensitive case where applicable.

For scoring systems, include published example patients or independently computed fixtures. Store the source citation beside each fixture.

### P0 — Fail closed on missing/unparseable patient inputs

**Finding**

`num(v, fallback = 0)` returns the fallback for `null`, `undefined`, empty strings, and non-finite parses. Missing-input gating relies on `required` metadata (with special questionnaire logic).

**Risk**

A calculator definition that omits `required: true`, uses a raw input object instead of `numberInput()`, or directly calls `num()` can silently convert missing patient data into zero or a representative fallback and return a plausible result.

**Recommended fix**

- Make all patient-dependent numeric inputs required by default at the schema/registry level, not only through one helper constructor.
- Add a registry validator that rejects numeric inputs with ambiguous missing-value behavior.
- Reserve `num(..., fallback)` for explicitly optional/contextual variables and require an inline justification or metadata flag for any non-zero fallback.
- In CI, statically or dynamically flag calculators whose `calculate()` succeeds when required numeric fields are absent.

### P0 — Remove representative patient defaults from production calculator inputs

**Finding**

Representative defaults are used in patient-dependent numeric calculators (for example, age/weight/creatinine defaults in renal formulas). The UI calculates live as soon as the page opens.

**Risk**

A prefilled score can look like a patient-specific result even when no patient data have been entered. Defaults can also mask missing-input defects in testing and manual review.

**Recommended fix**

- Default patient-specific numeric inputs to blank.
- Keep defaults only for true constants, unit selectors, or explicitly non-patient parameters.
- If demo values are useful, put them behind a clearly labeled “Load example” control rather than using them as production defaults.

### P1 — Make duplicate calculator IDs a hard failure

**Finding**

`src/data/calculators/index.ts` logs duplicate IDs with `console.warn` and still exports the registry.

**Risk**

`getCalculator(id)` uses `find()`, so the first duplicate wins and later definitions are unreachable by ID. This can silently ship the wrong calculator.

**Recommended fix**

Throw during development/build or add a registry-validation test that fails CI on any duplicate `id`.

### P1 — Do not mask implementation exceptions as “Incomplete”

**Finding**

`CalculatorPage.tsx` catches every exception from `calc.calculate(values)` and returns a generic “Incomplete / Adjust inputs to calculate.” result.

**Risk**

A programming defect, undefined property access, arithmetic bug, or unexpected branch can be presented as a user input problem. This reduces observability and can hide broken calculators in production.

**Recommended fix**

- Keep input validation separate from execution errors.
- In development/test, rethrow calculator exceptions.
- In production, show a distinct “Calculator error — result unavailable” state and log the calculator ID plus error to telemetry.
- Add a CI test that executes every calculator over valid fixture inputs and fails on exceptions.

### P1 — Add registry-level schema validation

**Finding**

The TypeScript interfaces permit many semantically invalid states: duplicate input IDs, `min > max`, invalid defaults, select defaults not present in options, empty option lists, unsorted thresholds inside calculator code, and missing evidence references.

**Risk**

Type correctness does not guarantee calculator-definition correctness.

**Recommended fix**

At registry initialization or in CI, validate every calculator for:

- globally unique calculator ID,
- unique input IDs within each calculator,
- non-empty names/descriptions,
- valid category,
- numeric `min <= max`,
- positive step,
- default inside range,
- select/segmented default contained in options,
- unique option values where required,
- at least one evidence reference,
- non-empty next-step conditions/actions,
- questionnaire mode metadata referring only to real input IDs.

### P1 — Validate select/segmented values centrally

**Finding**

Range and step validation cover number inputs, but there is no equivalent central validation that a select/segmented value belongs to the declared option set.

**Risk**

Stale state, malformed deep links/state restoration, future persistence features, or direct manipulation can feed unexpected categorical values into formulas.

**Recommended fix**

Before `calculate()`, reject categorical values that are not present in the active input’s options.

### P1 — Harden threshold helpers

**Finding**

`riskFromThresholds()` assumes the provided thresholds are already sorted by ascending `max`, and values above the final threshold inherit the final bucket.

**Risk**

A single out-of-order threshold silently maps scores to the wrong clinical category.

**Recommended fix**

- Validate strict monotonic ordering.
- Require an explicit terminal threshold or `Infinity` bucket.
- Fail CI on overlapping, duplicated, descending, or gapped threshold schemes when the calculator is intended to cover a continuous score range.

### P1 — Add source/version metadata for every calculator

**Finding**

Evidence metadata contains summary/formula/validation/references but no required review date, source version, guideline edition, or independent verification status.

**Risk**

Statements such as “current,” “preferred,” “recommended,” or treatment thresholds can become stale while the formula remains unchanged.

**Recommended fix**

Extend calculator metadata with fields such as:

- `lastClinicalReviewDate`,
- `reviewedBy`,
- `sourceVersion` / guideline year,
- `validationStatus` (`unverified`, `single-reviewed`, `independently-verified`),
- optional `supersededBy` / `legacy` flag.

Then add a CI report for calculators whose review date exceeds a defined interval.

### P1 — Source treatment recommendations separately from score formulas

**Finding**

Many calculators return `recommendations` and define `nextSteps` in the same object as formula logic.

**Risk**

A score can remain mathematically valid while downstream management recommendations change with guidelines, patient population, or setting.

**Recommended fix**

Treat management guidance as a separately reviewed layer. Require a citation/version for each management threshold or recommendation block. Prefer wording that clearly separates score interpretation from treatment decisions.

### P2 — Resolve README/testing inconsistency

**Finding**

The README states that synchronous registry consumption “cannot be lazy-loaded without breaking the test suite,” but the repository currently has no test script and CI executes no tests.

**Recommended fix**

Either add the referenced test suite or revise the README until it exists.

### P2 — Avoid unit conversion instructions that rely only on free text

**Finding**

Some calculators accept one canonical unit while help text instructs users to manually convert from another unit (for example, creatinine unit conversion guidance).

**Risk**

Manual unit conversion is a common source of order-of-magnitude errors.

**Recommended fix**

Where practical, add a unit selector and perform a tested internal conversion. If only one unit is supported, display it prominently in the input control and reject obviously incompatible magnitudes where clinically defensible.

### P2 — Add consistency checks between evidence text and executable logic

**Finding**

Formula descriptions, evidence summaries, score thresholds, UI labels, and executable code are maintained separately inside each object.

**Risk**

A future edit can update the displayed formula but not the implementation (or vice versa).

**Recommended fix**

Use golden test vectors as the primary guard. Additionally, for simple additive scores, consider a declarative scoring representation from which both UI point labels and score computation are derived.

### P2 — Add explicit legacy/superseded presentation rules

**Finding**

The library intentionally includes legacy tools (for example, legacy stroke-risk or renal equations) alongside current tools.

**Risk**

Search results can place legacy tools next to current alternatives without a consistent visual distinction.

**Recommended fix**

Add first-class metadata such as `status: current | legacy | superseded | research-only` and render that status prominently in search cards and calculator headers.

## Representative implementation observations

These are examples of the systemic findings above, not an exhaustive list of calculator-specific defects:

- `src/data/calculators/nephrology-endo.ts` uses live numeric defaults for Cockcroft-Gault and CKD-EPI inputs. The formulas are easier to demo, but the page displays a completed result before patient-specific values are entered.
- `src/data/calculators/cardiology.ts` demonstrates the large amount of management text and risk interpretation embedded alongside scoring logic; this is precisely the content most likely to drift independently of the formula.
- `src/data/calculators/index.ts` performs only a warning on duplicate IDs rather than failing validation.
- `src/pages/CalculatorPage.tsx` correctly blocks missing/range/step violations, but then catches all remaining exceptions as an “Incomplete” input state.
- `src/utils/helpers.ts` contains useful centralized validation primitives, but their safety depends on every calculator definition using them consistently.

## Suggested implementation order

1. **Introduce registry validation + test runner** and make CI fail on duplicate IDs, invalid input metadata, and execution exceptions.
2. **Remove patient-dependent numeric defaults** and make missing inputs fail closed globally.
3. **Add golden clinical fixtures** for every calculator, prioritizing high-use/high-risk calculators first (anticoagulation, emergency decision rules, ICU scores, renal dosing, pediatrics/obstetrics, toxicology).
4. **Add source/version/review metadata** and distinguish formula validation from management-guidance validation.
5. **Add legacy/current status metadata**, unit handling, and documentation cleanup.

## Minimum acceptance criteria for the next audit

A subsequent audit should be able to assert all of the following automatically:

- every registered calculator has a unique ID;
- every calculator has at least one executable golden fixture tied to a source;
- every numeric input has explicit required/optional semantics;
- no patient-dependent calculator returns a result from untouched demo defaults;
- invalid select values, ranges, and steps are rejected before calculation;
- every calculator can execute its valid fixtures without throwing;
- every clinical management recommendation has a review date and source/version;
- CI runs calculator tests on every pull request.

## Overall assessment

The repository has a strong centralized architecture and already includes useful safeguards for missing questionnaire items, numeric ranges, and numeric step validation. The primary weakness is **verification discipline at scale**: with 1004 calculators, manual review and TypeScript correctness are not enough. The highest-value fix is to turn calculator correctness into machine-enforced data: schema validation, source-linked golden vectors, and CI failures for any registry or execution inconsistency.
