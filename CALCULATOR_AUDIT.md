# Calculator audit tracker

Repo: `Airheumatologist/Calculator-`  
Audit: 2026-09-16 · Remediation pass 1: 2026-09-16 (Waves 0–2 + P1) · Pass 2: 2026-09-16 (Wave 3 units, P1 leftovers, P2 per-ID) · Pass 3: 2026-09-16 (evidence refresh, current US labels) · Pass 4: 2026-09-16 (units rollout completed, numeric scores, questionnaire branch metadata, edacs correction) — **all audit items closed, uncommitted in worktree**

Not a re-derivation of all 1004 formulas. Add new items under **Open**.

**Subagents:** pass 1 ran Wave 0 (engine) first, then one ID per agent. Pass 2 worked the **Open** list top-down: Wave 3 units as one batch, then one ID per leftover P2 item. Pass 3 closed the evidence-refresh batch with external source lookups (KDIGO, GOLD 2026 report, AHA/PubMed, current US prescribing information). Pass 4 finished the remaining P2 items directly (shared unit convention applied across every weight/creatinine/FiO₂/D-dimer field, numeric range scores, explicit questionnaire branch metadata with the regex heuristic deleted, and removal of a mis-transcribed EDACS item). Nothing is **Open**; the **Later** list is follow-on work, not an audit finding.

Final verification for the whole pass: `vitest` 45 files / 410 tests, `tsc -b`,
`oxlint`, and `vite build` all clean.

**Pending:** nothing under **Open**. The only outstanding work is the nine-item
**Later** backlog at the bottom of this file (re-measured against the live
registry on 2026-09-16 — see the table there).

## Done

### Systemic
- Vitest + `npm test` in CI; registry schema, unique IDs, execute-without-throw
- Duplicate IDs throw at registry load
- Exceptions show “Calculator error — result unavailable” (not “Incomplete”)
- Select/segmented values validated before `calculate()`
- `riskFromThresholds()` requires strictly increasing `max`
- Number fields blank on load (`getInitialFormValues`); required unless `required: false`
- `status` / `supersededBy` badges in search + header
- Optional review fields on `Calculator`: `lastClinicalReviewDate`, `reviewedBy`, `sourceVersion`, `validationStatus`
- Educational/style/simplified tools cannot emit unqualified `validated` / `official` / `recommended` (CI)
- README documents `npm test`

### Clinical
| ID | Fix |
|---|---|
| `ascvd-risk` | Legacy 2013 PCE; points to `prevent-cvd` |
| `psi-port` | Fine step-1 Class I, then II–V by points |
| `apgar` | NRP physiology, not score-driven resus |
| `ckd-epi` | GFR category, not CKD stage |
| `qtc-bazett` | Sex-specific adult bands |
| `rcri` | Removed lap-chole exclusion |
| `duke-criteria` | Legacy 2000; `supersededBy: duke-iscvid-2023` |
| `gestational-age` | LMP / 28-day / ultrasound caveats |
| `cha2ds2-vasc` | `status: legacy` → `cha2ds2-va` |
| `mdrd`, `mdrd-original` | `status: legacy` → `ckd-epi` |
| `qrisk3`, `smart2` | `status: educational` |

### 2026-09-16 remediation pass 1 (engine + P0 waves + P1)

Verified green: `vitest` 32 files / 306 tests, `tsc -b`, `oxlint`. One regression test per item under `tests/`.

**Wave 0 — fail-closed defaults (engine + schema, no per-formula rewrites)**

- Patient `defaultValue` removed everywhere and now rejected by `validateCalculator`; values migrated to `exampleValue`
- Fresh/reset forms fully blank (`getInitialFormValues` → `null`); no implicit `options[0]`, no all-No yesNo
- Only the explicit **Load example** action (`getExampleFormValues`) prefills, and only from `exampleValue`
- Production gates in `CalculatorPage`/`CalculatorForm`: missing → “Enter all required inputs”, then range, step, and invalid-select gates; `calculate()` is never reached
- `isRequiredInput` now defaults every input to required unless `required: false` (was number-only)
- Tests: `wave0-defaults`, `registry`, `audit-fixes`

**Wave 1 — blank-form rule-out:** all 55 listed IDs (incl. sentinel blanks `glasgow-outcome`/`goese`, `milan-criteria`, `bclc-hcc`) gate on a fresh form — `wave1-empty-form.test.ts`. Registry note: audit `methanol` is registered as `methanol-osmol`.

**Wave 2 — blank-form dosing/crash:** all 18 listed IDs gate on a fresh form; examples load only via **Load example** — `wave2-empty-form.test.ts`.

**Wave 4 — formula P0s**

| ID | Fix | Test |
|---|---|---|
| `score2-op` | diabetes contributes points | `score2-op-diabetes` |
| `bova` | SBP&lt;90 no longer scored as Stage I | `bova-sbp` |
| `mdrd` | Black ×1.212 removed | `mdrd-race` |
| `pyelo-admission` | fluoroquinolone first-line removed | `pyelo-admission-antibiotics` |

**P1 — all but two IDs fixed** (one test each): `abg-stepwise` 7.35 boundary · `act-asthma`, `buprenorphine-cows` required inputs · `caprini` arthroscopic/laparo points · `charlson-comorbidity` CVA+hemiplegia hierarchy · `cholinergic-tox` GI/emesis double-count · `ctcae-*` LLN optional · `dapt-score` required age band · `das28` ESR/CRP split · `dash-score-vte` female hormone gate · `hcm-risk-scd` age 16–80 + 2023 ESC language · `hfa-peff` rhythm input · `kdigo-peds-aki` +0.5 gate · `laps-score` renamed to `lams` · `ldl-martin` source-checkable example · `madrs` direct item-10 suicide flag · `opioid-mme` factors pinned to the CDC 2022 table (×5.0 / ×0.2 — the tracker’s `4 / 0.1` is the legacy table) · `pediatric-ett-size` blocks &lt;2 y · `qtc-hodges` guard · `sle-das` bidirectional lab gate · `smart-cop` required age · `svr-calc` MAP&lt;CVP guard

**Wave 3 — units (partial):** `score2-europe` now has a cholesterol mg/dL ↔ mmol/L selector; phosphate and bilirubin unit selectors added.

### P0 — Wave 3 units: closed

- [x] `score2-europe` mg/dL ↔ mmol/L selector
- [x] Selectors, not helpText conversions: FiO₂ % ↔ fraction, D-dimer FEU/DDU, creatinine µmol/L, weight kg/lb, cholesterol mg/dL ↔ mmol/L
- [x] Adopt one shared unit-selector convention (engine-owned; per-calculator selectors removed)

**Wave 3 — shared unit-selector convention (2026-09-16, pass 2).** Engine-declared
rather than per-calculator: a numeric field opts in with `unitKind`
(`weight` · `creatinine` · `fio2` · `ddimer` · `cholesterol`) while `unit` states the
canonical unit the formula is written in. `src/utils/units.ts` owns the option sets
and factors; the form renders the selector inline (`kg | lb`, `mg/dL | µmol/L`,
`fraction | %`, `FEU | DDU | ng/mL | µg/mL`); the choice is stored under
`${inputId}__unit`; `getCanonicalValues()` converts before range validation and
before `calculate()`, so formulas only ever see canonical units.

- Fail closed: a filled unit field with no unit chosen blocks the calculation
  (“Weight — units” in the missing list), an unknown stored unit is an invalid
  selection, and an unconvertible entry reaches `calculate()` as `null` rather than
  as a raw number in the wrong unit.
- Range checks run on the canonical value; `step` grids are skipped for
  unit-converted fields (154 lb = 69.85 kg is a valid entry, not a step violation).
- 120 fields wired: 76 weight, 21 creatinine, 11 FiO₂, 3 D-dimer, 9 cholesterol
  (`score2-europe` migrated off its bespoke `lipidUnits` select).
- `age-adjusted-ddimer` dropped its redundant FEU/DDU assay select — the unit
  selector now carries the assay (DDU × 2 = FEU) and the cutoff stays in ng/mL FEU.
- Tests: `tests/unit-selectors.test.ts` (convention, conversions, fail-closed
  behaviour, example completeness across the registry, and kg/lb · mg/dL/µmol/L ·
  fraction/% · FEU/DDU equivalence per calculator).

**Last per-calculator selects migrated (pass 2).** The pass-1 one-off selects for
phosphate, bilirubin, vitamin D, Lp(a), and magnesium were the last unit choices
living outside the shared convention — each carried its own factor inside
`calculate()`. They are now `unitKind`s (`phosphate` ×3.1, `bilirubin` ÷17.1,
`vitaminD` ÷2.5, `lpa` ÷2.5, `magnesium` ×1.2) with conversion done by
`getCanonicalValues()`, so `phos-replacement`, `df-units`, `vitamin-d-status`,
`lipoprotein-a-risk`, and `mag-toxicity` no longer convert anything themselves
(125 unit-aware fields total). `tests/shared-unit-selectors.test.ts` pins gating,
example defaults, and SI↔US equivalence per calculator. `probUnit` in
`wave4-formulas.ts` stays local: it selects pretest-probability *semantics*
(% vs fraction), not an analyte unit.

### 2026-09-16 remediation pass 2 (P1 leftovers + P2 per-ID)

Verified green: `vitest` 40 files / 369 tests at the time of writing; by the end of the pass the tree held 43 files / 384 tests (`tsc -b`, `oxlint` green), so the counts below are a snapshot, not a ceiling. Pass 3 re-verified 44 files / 402 tests.

- `edacs` — age gate re-verified as published (the tracker entry was wrong: the +4 item is “aged 18–50 with known CAD or ≥3 risk factors”). A pass-2 addition of a heart-rate ≥100 (+3) item was **removed in pass 4** — the published score has seven items and no vital signs — `tests/edacs-risk-factors.test.ts`
- `gina-control` — blank form gates all four control questions — `tests/gina-control-empty-form.test.ts`
- `vanderbilt-adhd` — explicit informant in both branches; `calculate()` fails closed without it — `tests/vanderbilt-adhd-informant.test.ts`
- `hsp-criteria` — ACR equivalence corrected to ≈300 mg/g (the KDIGO pairing), not the suggested ≈3 mg/mmol
- `nrp-oxygen` — 6–9 min interpolated windows; an unknown minute fails closed
- `failure-to-thrive` — terminal bucket 20 → 8 (the reachable maximum)
- `who-pneumonia` — single IMCI ladder, no double-evaluated danger branch
- `fena`, `sds-zung`, `sas-zung-anxiety` — percent/clamp regression tests; the SAS clamps were genuinely missing
- `warfarin-inr-goal`, `fluid-bolus-peds` — string score triaged as the repo-wide display convention and pinned
- Tests for the above: `tests/p2-residual-items.test.ts`, `tests/zung-clamp.test.ts`, `tests/range-score-contract.test.ts`
- Registry-wide sweeps added while verifying: `tests/registry-example-sweep.test.ts` (every complete example runs the production pipeline with no `NaN`/`undefined`/`Infinity`/`null` in any rendered field and no gate rejection; every incomplete example is *gated*, never calculated from partial data) and `tests/unit-canonical-invariant.test.ts` (`unit` always equals the canonical unit of its `unitKind`, with a factor-1 canonical option in every family)

#### P1 — closed (detail)

- [x] `edacs` — **the tracker was wrong: keep the age gate.** The published EDACS defines the term as “aged 18–50 years and either known CAD or ≥3 risk factors”, so the gate stays (pinned in `tests/edacs-risk-factors.test.ts`). The pass-2 note that “heart rate ≥100 (+3) was missing” was a mis-transcription and is corrected in pass 4: the 2014 derivation lists exactly seven items — age band, male sex, that gated risk-factor term, diaphoresis, radiation, pleuritic pain (−4), palpation-reproduced pain (−6) — with a reachable range of −8 to 34 and the <16 ADP threshold. The `hr` input and its +3 term were removed; the item list, range, and threshold are now pinned by test. Verified against Than M et al., Emerg Med Australas 2014;26(1):34–44 (PMID 24428678) and the 2024 review PMC10853047, “Chest Pain Risk Stratification in the Emergency Department: Current Perspectives”.
- [x] `gina-control` — item-level blank-form gate + band regression test (`tests/gina-control-empty-form.test.ts`).
- [x] `vanderbilt-adhd` — the informant is now an explicit requirement in **both** branches. Because `directInputIds` are direct-branch-only (they are excluded from the survey branch), the calculator declares both branches explicitly: `questionnaire: { modeInputId: 'entryMode', directModeValues: ['direct'], activeInputIdsByMode: { survey: ['informant', 26 items], direct: ['informant', 'inatt', 'hyper', 'perf'] } }`, and `calculate()` fails closed with “Select the informant” instead of assuming a parent form (`tests/vanderbilt-adhd-informant.test.ts`).

#### P2 — hardening (detail)

Engine:

- [x] `bool()` case-insensitive (`'TRUE'`, `'Yes'` still evaluate false) — `tests/engine-bool-coercion.test.ts`
- [x] Select value ∈ options (`getInvalidSelectValues` + page gate)
- [x] Questionnaire mode flag — the `isDirectOverrideInput` id/label regex is **gone**. All 53 branch selectors (51 questionnaires migrated in pass 4 plus `vanderbilt-adhd` and the two unflagged branch tools `gleason-grade-group` / `sic-score`) now declare `questionnaire.modeInputId` plus `directModeValues` and either `directInputIds` or `activeInputIdsByMode`; `getQuestionnaireModeInput()` no longer infers a mode input and `isQuestionnaireCalculator()` no longer infers a questionnaire from option values. `validateCalculator` rejects an implicit branch selector, a `modeInputId` that is not a select/segmented input, a `directModeValues` entry that is not an option, and a direct mode with no declared fields. The refactor was verified behavior-preserving: every migrated calculator's active-field set in both modes was captured before the change and compared after (`tests/questionnaire-mode-metadata.test.ts` now pins the invariants, including a fixture proving a field labelled “Direct score override” is only treated as direct when it is declared).

Per-ID (pass-2 status):

| ID | Bug |
|---|---|
| `hsp-criteria` | **fixed, with a tracker correction:** “≥30 mg/mmol (≥30 mmol/mg)” → “≥30 mg/mmol (≈300 mg/g …)”. The suggested “≈3 mg/mmol” was wrong — 30 mg/mmol is the KDIGO A3 threshold paired with 300 mg/g (30 mmol/mg is a unit typo in the original publication). |
| `nrp-oxygen` | **fixed:** 6–9 min are selectable with linearly interpolated windows (labelled as interpolated; NRP only publishes 5- and 10-min anchors), and an out-of-range minute now returns “Select a minute of life (1–10)” instead of silently using the 5-minute target. |
| `failure-to-thrive` | **fixed:** terminal bucket capped at the maximum reachable score of 8 (was 20). |
| `who-pneumonia` | **fixed:** the class is a 0/1/2 IMCI classification, not a point sum. Pass 2 replaced the redundant branch ladder (`danger` evaluated twice) with a single ladder: danger sign / hypoxaemia / SAM → severe; then indrawing (with or without fast breathing); then fast breathing alone; else cough/cold. Pass 4 removed the misleading additive `+1`/`+2` chips from the four pathway flags (`points: null`), set `unit: 'class (0–2)'`, and states in the interpretation and formula that the classification is non-additive (any single severe feature defines severe pneumonia). `tests/p2-residual-items.test.ts` pins indrawing + danger → 2 (not 3). |
| `warfarin-inr-goal` `fluid-bolus-peds` | **fixed in pass 4 (pass 2 triage reversed).** Both now return a numeric `score`: `warfarin-inr-goal` headlines the lower limit of the goal range (`2` / `2.5` / `1.5`, `unit: 'INR (goal lower limit)'`) and keeps the full range in the label, interpretation, and details; `fluid-bolus-peds` returns `10 × weight`, `20 × weight`, or — for the “Both” option — the typical initial 20 mL/kg volume, with both volumes still shown in the label and details. `tests/range-score-contract.test.ts` pins numeric scores plus the visible ranges. Other range-style tools (blood pressure `"120/80"` etc.) are unchanged. |
| `fena` | **fixed:** `%/fraction regression test` added (`tests/p2-residual-items.test.ts`) — the result is a percent (0.29, 4.29), the 1–2% band is inclusive at both boundaries, and a zero denominator returns “Invalid denominator” rather than `Infinity`. |
| `sds-zung` `sas-zung-anxiety` | **fixed:** `tests/zung-clamp.test.ts` pins the SDS clamp (raw 20–80, items 1–4, item-19 suicide flag) and the SAS clamp — the SAS direct total was **not** clamped and off-scale item values were summed unclamped, both now clamped like SDS. |
Optional-default strip is done for `naloxone-infusion`, `ett-depth`, `pulmonary-score`, `hyperkalemia-ecg`, `expected-pco2-*` (now `required: false` + `exampleValue`).

### 2026-09-16 remediation pass 3 (evidence refresh)

Verified green: `vitest` 44 files / 402 tests, `tsc -b`, `oxlint`. New test file:
`tests/evidence-refresh.test.ts` (18 tests) pins every change below.

Sources used: KDIGO guideline pages, the GOLD 2026 report PDF, PubMed/Europe PMC
records, and the current US prescribing information (DailyMed/openFDA label text)
for apixaban, rivaroxaban, dabigatran, and edoxaban.

**`doac-renal-dose` — two label errors fixed, two bands tightened.** The helper
was synthesised from older labeling, and two of its branches contradicted the
labels that are current today:

- **Rivaroxaban AF: the `Avoid (CrCl <15)` branch was wrong.** The current
  XARELTO label (revision effective 2026-09-10) gives a *single* 15 mg
  once-daily band for all CrCl ≤50 mL/min — including ESRD maintained on
  intermittent hemodialysis — after 20 mg once daily above 50. The "avoid below
  15" rule belongs to the VTE and prophylaxis indications. The AF branch is now
  15 mg once daily with a caution that CrCl <30 was outside the studied range.
- **Apixaban VTE: the `Avoid / specialist (CrCl <15)` branch was wrong.** The
  US ELIQUIS label recommends *no* dose adjustment for renal impairment,
  including ESRD on dialysis (CrCl <15 was not enrolled, so that band rests on
  PK/PD data). The 10 mg BID ×7 days → 5 mg BID regimen is now returned at every
  CrCl, with the data-gap caveat moved into the interpretation.
- **Dabigatran AF: 75 mg BID at CrCl 15–30 is the US label, not a hedge.** The
  old text ("may allow… many regions avoid") is replaced by the capsule label
  bands: 150 mg BID >30, 75 mg BID 15–30, no recommendation <15 or on dialysis.
  The listed P-gp inhibitors are now wired in as well (dronedarone or systemic
  ketoconazole → 75 mg BID at CrCl 30–50, avoid coadministration below 30).
- **Dabigatran VTE** now reads "no dosing recommendation at CrCl ≤30 or on
  dialysis" instead of the ambiguous "many labels".
- Citations replaced/extended: the retired **2019** AF focused update is gone in
  favour of the **2023 ACC/AHA/ACCP/HRS AF guideline** (PMID 38033089), and the
  XARELTO and PRADAXA labels are cited alongside SAVAYSA and ELIQUIS.

| ID | Finding |
|---|---|
| `kawasaki` | The **2024 AHA update** ("Update on Diagnosis and Management of Kawasaki Disease", Circulation 2024;150(23):e481–e500, PMID 39534969, with 2025 corrections) is now cited next to the 2017 statement. Its stated scope is diagnosis, cardiac imaging, and long-term management since 2017, and it adds criteria for North American patients at high risk of coronary artery aneurysms rather than re-deriving the classic criteria — so the fever + ≥4-of-5 logic stays, and the evidence text points readers to the statement for the newer risk definition. |
| `kdigo-aki` | The 2012 thresholds are still the published standard and are unchanged: KDIGO has a **2026 AKI/AKD update in public review** (first major revision since 2012; folds acute kidney disease into one framework and revises definitions to include biomarkers). A caveat in the evidence block flags it as pending. |
| `gold-stage` | Grading bands verified unchanged in the **GOLD 2026 report** (a major revision): it "continues to recommend using the FEV1 as a percentage of the predicted value", but now endorses the **GLI-Global race-neutral** reference equations, with ATS/ERS preferring z-score bands that reclassify some patients. The denominator caveat is recorded. |
| `lrinec` | Citation verified (`Wong CH et al. Crit Care Med. 2004;32(7):1535-41`, PMID 15241098). The evidence text now separates the **derivation cutoff (≥6; PPV 92%, NPV 96%, AUROC 0.98/0.98)** from the ≤5 / 6–7 / ≥8 band split, which is a later refinement rather than part of the original derivation. |
| `vbac-success` | Coefficients re-verified against two independent peer-reviewed reproductions of the equation (w = 3.766 − 0.039·age − 0.060·BMI − 0.671·AA − 0.680·Hispanic + 0.888·prior VD + 1.003·prior VBAC − 0.632·recurring indication); the test file pins the logistic output numerically. **Grobman 2009** admission model (Am J Perinatol 26(10):693–701, PMID 19813165) is now cited for the model the interpretation refers to, plus the 2024 **race-free** admission calculator (Am J Obstet Gynecol 2024;230(3S):S804–S806, PMID 38180754). |

**Reference-link sweep (new).** Every distinct citation URL in `src/` was
extracted and fetched: 80 URLs, **no dead links** — 70 resolved `200` and 10
`403` from bot-protected hosts (CDC, AHA, ASA, HRSA, Joint Commission) that
serve normally to a browser. The FDA `accessdata` label PDFs reject `HEAD`
requests but download fine (recorded so a future sweep does not misread them as
404s). DailyMed `setid` links were adopted for the two labels that lacked a
stable citation.

### 2026-09-16 remediation pass 4 (final leftovers — closed)

Verified green at the end of the pass: `vitest` 45 files / 410 tests, `tsc -b`,
`oxlint`, `vite build`. Worktree remains uncommitted.

**Units — rollout completed.** The pass-2/3 `unitKind` convention now covers
every number field whose own unit is one of the shared families: 75 weight (`kg`),
44 creatinine (`mg/dL`; serum, plasma, and spot-urine fields, excluding
creatinine *clearance* which is mL/min), 11 FiO₂ (`fraction`), and 3 D-dimer
(`ng/mL FEU`) fields — 133 unit-aware fields, 0 remaining. The 7 creatinine
fields missed by the pass-2 sweep live in `nephrology-endo`, `wave2-cardiology`,
`wave2-general-lab`, `wave2-pulm-id`, `wave3-nephro-icu`, `wave3-peds-ob`,
`missing-emergency`, `missing-heme-id-nephro`, `wave5-nephro-gi`,
`wave6-psych-sleep`, and `wave7-highuse`; each now converts before range
validation and before `calculate()` (equivalence per calculator is covered by the
registry-wide unit tests).

**Per-ID leftovers closed.**

| ID | Fix |
|---|---|
| `who-pneumonia` | additive point chips removed; non-additive IMCI class stated in the interpretation and evidence formula |
| `warfarin-inr-goal` | numeric score (goal lower limit) with the range kept in label/interpretation/details |
| `fluid-bolus-peds` | numeric score for all three dose options (“Both” headlines the 20 mL/kg volume, both stay visible) |
| `edacs` | pass-2 heart-rate (+3) item removed — not part of the published seven-item score; item list, −8…34 reachable range, <16 threshold, and the age-gated +4 term pinned by test |

**Questionnaire branches — engine heuristic removed.** See the P2 entry above:
53 branch selectors declare their fields explicitly, `helpers.ts` no longer
infers direct fields from ids/labels or the mode input from option values, and
`registry.ts` rejects implicit declarations. Two tools that had branch selectors
without any questionnaire flag (`gleason-grade-group`, `sic-score`) were marked
as questionnaires with both branches declared, so their inactive branch fields
are no longer wrongly required.

**External verification performed in this pass** (read-only network fetches):
the rivaroxaban AF renal band added in pass 3 was re-verified against the current
XARELTO label via openFDA (`CrCl >50`: 20 mg once daily; `CrCl ≤50`: 15 mg once
daily, single band, footnote that CrCl <30 was not studied) — the pass-3 text is
correct, and the "avoid <15" rule is confined to the VTE/prophylaxis
indications. The EDACS item list was verified against the 2014 derivation
(PMID 24428678) and the 2024 review PMC10853047.

## Open

Nothing pending. The remaining backlog below is explicit follow-on work, not an
audit finding.

### Later

Backlog re-measured 2026-09-16 against the live registry (1004 calculators) and the
source tree, so each row states its real scope rather than a restatement of the
original finding. None of these are remediation items: every P0/P1/P2 finding is
closed. Rows 7 and 8 are clinical-content decisions; the rest are engineering
hardening.

| # | Item | Verified state | What remains |
|---|---|---|---|
| 1 | Source-linked golden fixtures per ID | 46 of 1004 ids are pinned by a dedicated test. Registry-wide sweeps already cover examples + gate order (`tests/registry-example-sweep.test.ts`), the unit convention (`tests/unit-selectors.test.ts`, `shared-unit-selectors`, `unit-canonical-invariant`), and questionnaire branch metadata. | Per-ID fixtures for boundary / missing / zero / min–max / unit cases (fixture JSON + shared runner), prioritised by the ids already remediated in passes 1–4. |
| 2 | Complete "Load example" coverage | **330 of 1004** complete (674 partial — overwhelmingly large questionnaires whose example is intentionally incomplete). The sweep asserts every partial example is *gated* (“Enter all required inputs”) and never calculated from partial data. | Either add `exampleValue`s to the remaining questionnaires or record the intentional-partial set as a declared property so the count is intentional rather than incidental. |
| 3 | Terminal-bucket / gap checks on thresholds | 441 `riskFromThresholds()` call sites; only **3** declare an `Infinity` terminal bucket. The `score > last.max` fallback makes the highest declared band open-ended, so a terminal `max` below the reachable maximum is invisible — that is exactly the pass-2 `failure-to-thrive` bug (`max: 20` vs reachable max 8). | Adopt and document an explicit open-ended terminal convention (e.g. `max: Infinity`) and add a CI check. A fully automatic reachable-maximum check needs per-calculator bounds, so this is a design decision plus spot checks. |
| 4 | Review dates + stale-review CI | **2 of 1004** calculators carry any review metadata (`lastClinicalReviewDate`, `reviewedBy`, `sourceVersion`, `validationStatus`). | Populate the review fields (needs human clinical review, not automation) and add CI that surfaces tools past a review horizon. |
| 5 | Separate management `nextSteps` from formula objects | Every calculator still embeds `nextSteps` in the formula object (`validateCalculator` requires ≥1 block with non-empty actions). | Split clinical-management text into its own artifact/field so formula review and management review can be versioned independently. |
| 6 | Mark remaining superseded models `legacy` | `status` today: 997 current, **5 legacy** (`ascvd-risk`, `cha2ds2-vasc`, `duke-criteria`, `mdrd`, `mdrd-original`), 2 educational (`qrisk3`, `smart2`), 0 `superseded`; 5 calculators carry `supersededBy` (`ascvd-risk → prevent-cvd`, `cha2ds2-vasc → cha2ds2-va`, `duke-criteria → duke-iscvid-2023`, `mdrd`/`mdrd-original → ckd-epi`). | A curated list of the remaining superseded models (older renal, ACS, and severity formulae). This cannot be derived from the code alone. |
| 7 | `prevent-cvd` badge bands | **Premise softened after re-verification.** The live badge is driven by `riskFromThresholds(cvd10, …)` — 10-year **total CVD** bands — and the description/interpretation also print the ASCVD and HF estimates. PREVENT publishes total-CVD bands, so the headline is defensible as-is; what is undecided is whether the headline band should instead follow **10-year ASCVD** (the statin-decision thresholds). | A product/clinical decision, then either switch the badge to ASCVD bands or document why total-CVD bands are the intended headline. |
| 8 | `doac-renal-dose` indication coverage | AF and VTE only (verified). Current labels additionally carry pediatric dosing (XARELTO, PRADAXA), CAD/PAD + post-ACS low-dose rivaroxaban (2.5 mg BID), and acutely-ill-medical VTE prophylaxis (10 mg daily for 31–39 days). | Add those bands, or state the tool's AF/VTE scope explicitly in the UI so the omission is not read as “no regimen exists”. |
| 9 | Reference-link sweep | Pass 3 ran the sweep by hand (80 URLs, 10 bot-`403`s, FDA `accessdata` PDFs needing `GET` not `HEAD`); there is no script and no CI job (`scripts/` does not exist). | Check in a link-check script plus a scheduled/CI run, and extend it to `whenToUse`/help-text citations, not just `evidence.references`. |
