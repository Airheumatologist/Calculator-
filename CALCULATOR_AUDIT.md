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

## Calculator-level clinical logic and evidence findings

This section is a second-pass clinical audit of individual definitions. The review was split into independent streams for executable formula/branch logic, threshold/interpretation wording, evidence/reference currency, and high-risk specialty calculators, then reconciled. Each item below is tied to a specific calculator ID and was checked against an external primary/guideline source before being labeled confirmed.

This still should **not** be interpreted as an independent re-derivation of every equation in all 1004 calculators. The full corpus was statically screened for suspicious definitions and claims; source-by-source verification was concentrated on flagged calculators. The durable solution remains source-linked golden vectors for every calculator.

### P0 — `ascvd-risk`: current-guideline claim and treatment bands are obsolete

**File:** `src/data/calculators/cardiology.ts`

**Finding**

The calculator implements the 2013 ACC/AHA Pooled Cohort Equations (PCE) and presents the classic PCE categories (<5%, 5–7.4%, 7.5–19.9%, ≥20%) as an ACC/AHA tool for statin decision-making. The executable PCE equation can remain useful as a historical/legacy calculator, but its current-guideline framing and downstream statin recommendations are no longer current as of 2026.

**Why this is confirmed**

The 2026 ACC/AHA multisociety dyslipidemia guideline explicitly replaces the PCE with the AHA PREVENT-ASCVD equations for primary-prevention lipid-lowering decisions in the appropriate population. The guideline uses new 10-year PREVENT-ASCVD categories: low <3%, borderline 3% to <5%, intermediate 5% to <10%, high ≥10%.

**Recommended fix**

- Mark `ascvd-risk` as **legacy / 2013 PCE**.
- Remove wording implying that its PCE bands are the current ACC/AHA statin-decision framework.
- Add/identify a PREVENT-ASCVD calculator for current US primary-prevention lipid decisions.
- Keep PCE output only for historical comparison or contexts that explicitly still call for it.

**Source:** 2026 ACC/AHA/AACVPR/ABC/ACPM/ADA/AGS/APhA/ASPC/NLA/PCNA Guideline on the Management of Dyslipidemia; Circulation/JACC, published March 13, 2026, DOI 10.1161/CIR.0000000000001423.

### P0 — `psi-port`: does not implement the validated PSI class-I first stage

**File:** `src/data/calculators/critical-care.ts`

**Finding**

The calculator directly computes the PSI point total and then maps low scores to a combined `I–II` / `II` output. That is not the published two-stage PSI algorithm. In the validated rule, **Class I is assigned before the point score** using age, comorbidity, mental status, and vital-sign criteria; only patients who fail that screen proceed to point scoring for Classes II–V.

A patient cannot be accurately labeled Class I solely because the eventual point score is low. Conversely, simply combining `I–II` loses an important validated branch of the rule.

**Recommended fix**

Implement Step 1 explicitly:

- age ≤50,
- no neoplastic, liver, CHF, cerebrovascular, or renal disease,
- normal mental status,
- pulse <125/min,
- respiratory rate <30/min,
- SBP ≥90 mmHg,
- temperature ≥35°C and <40°C.

If every Step-1 condition is satisfied, return Class I. Otherwise perform the published point calculation and assign Class II (≤70), III (71–90), IV (91–130), or V (>130).

**Source:** Fine MJ et al. *A Prediction Rule to Identify Low-Risk Patients with Community-Acquired Pneumonia.* N Engl J Med. 1997;336:243-250; and IDSA CAP guideline description of the two-step PSI algorithm.

### P0 — `apgar`: score is being used to drive resuscitation wording

**File:** `src/data/calculators/emergency-misc.ts`

**Finding**

The calculator maps low Apgar totals to action-oriented text such as `0–3: severely depressed — ongoing NRP resuscitation`, and the `nextSteps` block tells users to `Continue NRP` when the 5-minute score is <7.

The score is appropriate for documenting neonatal condition and response to resuscitation, and a score <7 at 5 minutes is a reason to repeat scoring at 5-minute intervals. It should **not** be the trigger that determines whether resuscitation is initiated, which resuscitative steps are used, or when those steps occur.

**Recommended fix**

- Replace score-driven resuscitation instructions with: “Continue/adjust resuscitation according to the NRP physiologic algorithm (heart rate, respirations, oxygenation), not the Apgar total.”
- Keep the valid instruction to repeat Apgar every 5 minutes to 20 minutes when the 5-minute score is <7.
- Explicitly state in the interpretation that resuscitation begins before the 1-minute score and should not wait for or be dictated by Apgar.

**Source:** AAP Committee on Fetus and Newborn / ACOG Committee on Obstetric Practice. *The Apgar Score.* Pediatrics. 2015;136:819-822. DOI 10.1542/peds.2015-2651.

### P1 — `ckd-epi`: eGFR category is mislabeled as a CKD stage without establishing CKD

**File:** `src/data/calculators/nephrology-endo.ts`

**Finding**

The 2021 CKD-EPI creatinine equation itself appears correctly implemented, but the result labels `G1`, `G2`, etc. as `CKD stage G1`, `CKD stage G2`, and so forth based on a single eGFR value.

A single eGFR establishes a **GFR category**, not necessarily chronic kidney disease. G1 and G2 in particular require evidence of kidney damage and chronicity to diagnose CKD. Full CKD classification also incorporates albuminuria/cause.

**Recommended fix**

- Change the output label to `GFR category G1/G2/G3a/...` rather than `CKD stage` unless CKD is already established.
- Add explicit wording: “A single eGFR does not establish CKD; chronicity and/or other markers of kidney damage are required.”
- Preserve the note that albuminuria is needed for CGA risk classification.

**Source:** KDIGO 2024 CKD Guideline and KDIGO nomenclature guidance: use `GFR categories` rather than `CKD stages` when CKD or both GFR/albuminuria status has not been established.

### P1 — `qtc-bazett`: interpretation thresholds are not sex-specific

**File:** `src/data/calculators/cardiology.ts`

**Finding**

The Bazett formula calculation is straightforward, but its interpretation applies fixed bands (`≥460` prolonged, `≥440` borderline) without a sex input, even though the calculator’s own evidence text acknowledges sex-dependent QTc thresholds.

Widely cited adult thresholds define prolonged QTc as >450 ms in males and >460 ms in females; >500 ms is a substantially higher-risk range. A single universal `≥460` “prolonged” threshold undercalls male QTc values in the 451–459 ms range.

**Recommended fix**

Either:

- add sex and use sex-specific adult interpretation bands, or
- remove categorical “normal/borderline/prolonged” labeling and return the corrected QTc with a clearly stated reference-range caveat.

Also retain the existing warning that Bazett overcorrects at high heart rates and undercorrects at low heart rates.

**Source:** Giudicessi JR et al. *The QT Interval.* Circulation. 2019; adult prolonged-QTc thresholds >450 ms (male), >460 ms (female), with particular concern at >500 ms.

### P1 — `rcri`: help text contradicts the original RCRI high-risk-surgery definition

**File:** `src/data/calculators/missing-cardio-pulm.ts`

**Finding**

The input correctly states that Lee RCRI “high-risk surgery” includes **intraperitoneal, intrathoracic, or suprainguinal vascular surgery**, but its help text then says `Do not score laparoscopic cholecystectomy`.

Laparoscopic cholecystectomy is an intraperitoneal operation. If the calculator is intended to reproduce the original Lee RCRI predictor, the blanket exclusion conflicts with the source definition.

**Recommended fix**

- Remove the categorical exclusion of laparoscopic cholecystectomy from the original-RCRI input help.
- If the intent is to adapt RCRI to a newer perioperative framework, do not silently change a source variable; create a separately named modern perioperative risk pathway and document the guideline source.

**Source:** Lee TH et al. *Derivation and prospective validation of a simple index for prediction of cardiac risk of major noncardiac surgery.* Circulation. 1999;100:1043-1049. Original high-risk surgery predictor: intraperitoneal, intrathoracic, or suprainguinal vascular surgery.

### P1 — `duke-criteria`: legacy 2000-style helper is not clearly distinguished from the 2023 Duke-ISCVID criteria

**File:** `src/data/calculators/extra.ts`

**Finding**

The calculator is a simplified major/minor count implementation of the classic Modified Duke clinical criteria. Its basic count logic for definite/possible is consistent with the older framework, but the current Duke-ISCVID criteria were substantially updated in 2023.

The 2023 revision adds/changes, among other items:

- expanded “typical” organisms,
- molecular diagnostics,
- cardiac CT and FDG-PET/CT criteria,
- an intraoperative surgical major criterion,
- updated predisposing conditions and vascular/immunologic definitions.

A generic title `Modified Duke Criteria (IE Helper)` can therefore be mistaken for the current diagnostic classification.

**Recommended fix**

Choose one of two approaches:

1. rename the existing calculator `Modified Duke Criteria (2000 — legacy helper)` and explicitly state that it does not implement Duke-ISCVID 2023; or
2. implement the 2023 Duke-ISCVID criteria as a separate current calculator, retaining the old tool only for historical comparison.

**Source:** Fowler VG et al. *The 2023 Duke-International Society for Cardiovascular Infectious Diseases Criteria for Infective Endocarditis: Updating the Modified Duke Criteria.* Clin Infect Dis. 2023;77:518-526. DOI 10.1093/cid/ciad271.

## Additional calculator-specific wording/evidence items to queue

These were identified during the static sweep but should be treated as lower priority than the confirmed items above:

- **`gestational-age` / Naegele rule:** the evidence/usage text should explicitly state the usual assumptions behind LMP dating (reliable LMP and approximately regular cycle; cycle length can shift the LMP-based estimate) and continue to prioritize first-trimester ultrasound when dating is uncertain.
- **Legacy/current status across the registry:** calculators already labeled `legacy`, `educational`, or `style` are generally much safer than older formulas presented without such a status. Apply the same metadata consistently to PCE, MDRD, older Duke criteria, and any other superseded model.
- **Educational approximations:** definitions such as `SMART2-style` and `QRISK3-style` appropriately warn that they are educational approximations. Add automated checks so any calculator whose name contains `style`, `simplified`, or `educational` cannot emit language such as `validated`, `official`, or `recommended` unless explicitly qualified.

## What was not found in this pass

The review did **not** identify a broad pattern of obvious arithmetic transcription errors in the core formulas inspected (for example, Cockcroft-Gault, 2021 CKD-EPI creatinine, CHA₂DS₂-VASc, HAS-BLED, HEART, qSOFA/SOFA, CURB-65, Wells, Ottawa rules). That is reassuring but is **not equivalent to validation**. Without golden fixtures, the remaining long-tail calculators cannot be certified from static inspection alone.

The next highest-value step is therefore not another prose review: it is to generate a source-linked fixture manifest for all 1004 IDs and make CI execute it.

## Representative implementation observations

These are examples of the systemic findings above, not an exhaustive list of calculator-specific defects:

- `src/data/calculators/nephrology-endo.ts` uses live numeric defaults for Cockcroft-Gault and CKD-EPI inputs. The formulas are easier to demo, but the page displays a completed result before patient-specific values are entered.
- `src/data/calculators/cardiology.ts` demonstrates the large amount of management text and risk interpretation embedded alongside scoring logic; this is precisely the content most likely to drift independently of the formula.
- `src/data/calculators/index.ts` performs only a warning on duplicate IDs rather than failing validation.
- `src/pages/CalculatorPage.tsx` correctly blocks missing/range/step violations, but then catches all remaining exceptions as an “Incomplete” input state.
- `src/utils/helpers.ts` contains useful centralized validation primitives, but their safety depends on every calculator definition using them consistently.

## Suggested implementation order

1. **Correct the P0 calculator-level issues first:** PCE current-guideline framing, PSI class-I logic, and Apgar resuscitation wording.
2. **Correct the P1 calculator-level issues:** CKD-EPI labeling, QTc interpretation, RCRI surgery help text, and legacy Duke status/current alternative.
3. **Introduce registry validation + test runner** and make CI fail on duplicate IDs, invalid input metadata, and execution exceptions.
4. **Remove patient-dependent numeric defaults** and make missing inputs fail closed globally.
5. **Add golden clinical fixtures** for every calculator, prioritizing high-use/high-risk calculators first (anticoagulation, emergency decision rules, ICU scores, renal dosing, pediatrics/obstetrics, toxicology).
6. **Add source/version/review metadata** and distinguish formula validation from management-guidance validation.
7. **Add legacy/current status metadata**, unit handling, and documentation cleanup.

## Minimum acceptance criteria for the next audit

A subsequent audit should be able to assert all of the following automatically:

- every registered calculator has a unique ID;
- every calculator has at least one executable golden fixture tied to a source;
- every numeric input has explicit required/optional semantics;
- no patient-dependent calculator returns a result from untouched demo defaults;
- invalid select values, ranges, and steps are rejected before calculation;
- every calculator can execute its valid fixtures without throwing;
- every clinical management recommendation has a review date and source/version;
- current-vs-legacy status is explicit for every superseded score/model;
- CI runs calculator tests on every pull request.

## Overall assessment

The repository has a strong centralized architecture and already includes useful safeguards for missing questionnaire items, numeric ranges, and numeric step validation. The primary weakness is **verification discipline at scale**: with 1004 calculators, manual review and TypeScript correctness are not enough.

The second-pass clinical review confirms that individual calculator issues do exist, including both executable-logic omissions (PSI class I) and clinically material evidence/interpretation drift (PCE/PREVENT, Apgar, CKD terminology, QTc bands, RCRI definition, Duke criteria generation). These are exactly the failure modes that source-linked golden vectors plus versioned clinical metadata should prevent.

The highest-value long-term fix is to turn calculator correctness into machine-enforced data: schema validation, source-linked golden vectors, current/legacy metadata, and CI failures for any registry or execution inconsistency.
