# Calculator audit tracker

Repo: `Airheumatologist/Calculator-`  
Audit: 2026-09-16 · Remediation pass 1: 2026-09-16 (Waves 0–2 + P1) · Pass 2: 2026-09-16 (Wave 3 units, P1 leftovers, P2 per-ID) · Pass 3: 2026-09-16 (evidence refresh, current US labels) · Pass 4: 2026-09-16 (units rollout completed, numeric scores, questionnaire branch metadata, edacs correction) · **Pass 5: 2026-09-16 — independent production-readiness verification of passes 1–4 (`faf011d`/`734a901`): 8 claims corrected, 1 blocking code defect (N1) and 3 should-fix defects (N2, N4, N5) fixed with fail-before/pass-after tests, 1 blocking process condition (N6) flagged, 2 "pinned by test" statements shown not to be pinned, and 4 findings left open (N3, N7, N8, N10) — see Pass 5 below**

> **State change during pass 5 — the artifact moved while it was being verified.**
> The remediation was not, as the brief assumed, an uncommitted worktree: a concurrent
> remediation session (its own scratch files `zz-lead-*.test.ts` and
> `vfy-tmp-inventory.test.ts` are the fingerprint) committed the whole 101-file
> worktree as `faf011d` at 20:59:06 **and pushed it to `origin/main` at 20:59:18**, then
> committed `734a901` at 21:01:34. `git rev-parse HEAD` == `git rev-parse origin/main`
> == `734a901`. It also kept editing afterwards (`deploy.yml`, `package.json`,
> `README.md`, `wave7-bedside.ts`), and at least one verification subagent deleted a
> scratch file it found in `tests/`. Every claim below was therefore re-measured
> against `faf011d`/`734a901` plus the pass-5 edits, with each measurement's revision
> recorded, and the line numbers in this file are relative to the current worktree,
> not to any commit. Two consequences: (1) **N6** — the push deployed without a lint or
> test gate; (2) verification of an uncommitted artifact is only as good as the moment
> it was read, so anything edited after a measurement was re-read. Don't commit,
> branch, reset or stash this tree without deciding what to do with those commits
> first — resetting would discard both the remediation and this verification.

Not a re-derivation of all 1004 formulas. Add new items under **Open**.

**Subagents:** pass 1 ran Wave 0 (engine) first, then one ID per agent. Pass 2 worked the **Open** list top-down: Wave 3 units as one batch, then one ID per leftover P2 item. Pass 3 closed the evidence-refresh batch with external source lookups (KDIGO, GOLD 2026 report, AHA/PubMed, current US prescribing information). Pass 4 finished the remaining P2 items directly (shared unit convention applied across every weight/creatinine/FiO₂/D-dimer field, numeric range scores, explicit questionnaire branch metadata with the regex heuristic deleted, and removal of a mis-transcribed EDACS item). Nothing is **Open**; the **Later** list is follow-on work, not an audit finding.

Final verification for passes 1–4 (superseded — see the pass-5 gates table for the
current numbers): `vitest` 45 files / 410 tests, `tsc -b`, `oxlint`, and `vite build`
all clean at the time pass 4 was declared closed.

**Pending:** nothing under **Open** for passes 1–4. Pass 5 (independent verification)
closed the blocking code defect it found (**N1**) and the three should-fix ones it could
fix mechanically (**N2**, **N4**, **N5**).

**Pass 6 (N8/N10 remediation, plus a re-check of N3/N7).** **N8** and **N10** are closed
and **Later #9** is done — see their rows above. The two remaining findings were
re-examined against primary sources rather than assumed, and both moved:

- **N3 is refuted, not a defect.** The audit quoted the SAVAYSA label only to the
  semicolon. Section 8.6 of the SPL the calculator itself cites (DailyMed setid
  `e77d3400-56ad-11e3-949a-0800200c9a66`) reads in full: "There are limited clinical data
  with SAVAYSA in patients with CrCL < 15 mL/min; **SAVAYSA is therefore not recommended
  in these patients.**" Section 8.6 is drug-wide and cites both 2.1 and 2.2, so "both AF
  and VTE" is also correct. **No content change** — the tool's string was accurate as
  written.
- **N7 narrowed; needs the clinical owner.** HDL *is* a published SCORE2-OP predictor, so
  the term must stay (the code's `-0.3564`/`-0.304` centred at 1.4 match the paper). The
  row's `smart2` attribution is **wrong** — `smart2` has no HDL input at all, and the
  quoted `tchol = nonhdl + 1.3`, `chdl = 0` code lives in `score2-diabetes` and
  `score2-ckd-addon`. The surviving issue is `score2-op` imputing HDL at 1.4 mmol/L when
  blank: over a 3,840-combination grid that flips a published ESC band in 4.3% of 7,680
  comparisons (max 11.1 percentage points) and errs *below* true risk for low-HDL
  patients. **Decision pending:** keep the default and surface the assumption in the
  returned result, or require HDL as `score2-cvd` already does. No arithmetic changed.

Still open: the **N7** decision above, the **N6** process condition (commit the worktree
gate fixes and require `CI` on `main` before the next push), and the nine-item **Later**
backlog at the bottom of this file (re-measured against the live registry on 2026-09-16 —
see the table there). Note the pass-5 caveat still applies to this file: it is being
edited by more than one session, and lines are relative to the worktree, not to a commit.

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

- [x] `bool()` case-insensitive and whitespace-tolerant: `'TRUE'`, `' Yes '`, `'y'`, `'1'`, `'on'` all evaluate **true**; `'false'`, `'0'`, `'off'`, `'maybe'`, `''`, `NaN`, `null` evaluate false — `tests/engine-bool-coercion.test.ts`. *(Pass-5 correction: this line previously read "(`'TRUE'`, `'Yes'` still evaluate false)", which contradicted both the implementation and the test — `bool('Yes') === true`.)*
- [x] Select value ∈ options (`getInvalidSelectValues` + page gate)
- [x] Questionnaire mode flag — the `isDirectOverrideInput` id/label regex is **gone**. Every branch selector now declares `questionnaire.modeInputId` plus `directModeValues` and either `directInputIds` or `activeInputIdsByMode`; `getQuestionnaireModeInput()` no longer infers a mode input and `isQuestionnaireCalculator()` no longer infers a questionnaire from option values. `validateCalculator` rejects an implicit branch selector, a `modeInputId` that is not a select/segmented input, a `directModeValues` entry that is not an option, and a direct mode with no declared fields (`tests/questionnaire-mode-metadata.test.ts` pins the invariants, including a fixture proving a field labelled “Direct score override” is only treated as direct when it is declared). *Pass-5 re-measure: **55** `modeInputId` declarations across **13** data files (not 53), **70** questionnaire-flagged calculators. The refactor was **not** fully behavior-preserving — the explicit lists dropped fields `calculate()` still reads; see **N1** (`sic-score`) and **N2** (`cornell-dementia`).*

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
extracted and fetched. DailyMed `setid` links were adopted for the two labels
that lacked a stable citation. *Pass-5 re-measure: **81** distinct `url:` values —
51 × `200`, 20 × `206`, 8 × `403` from bot-protected hosts (DTIC, AHA/ASA, HRSA,
Joint Commission, SAMHSA) that serve normally to a browser, and **2 that could
not be shown to be live**: both `accessdata.fda.gov/.../label/...` PDFs return the
FDA bot-detection apology page (`302 → /apology_objects/abuse-detection-apology.html`)
for GET, HEAD **and** range requests here, so the pass-3 note that they "download
fine" could not be reproduced. They are recorded as **unverified, not dead** (no
browser is reachable from the sandbox) — re-check them once by hand and, if they
really 404, swap in the DailyMed `setid` links used for the other two labels.*

### 2026-09-16 remediation pass 4 (final leftovers — closed)

Verified green at the end of the pass: `vitest` 45 files / 410 tests, `tsc -b`,
`oxlint`, `vite build`. Worktree remains uncommitted.

**Units — rollout completed.** The pass-2/3 `unitKind` convention now covers
every number field whose own unit is one of the shared families: **76 weight**
(`kg`), **44 creatinine** (`mg/dL`; serum, plasma, and spot-urine fields,
excluding creatinine *clearance*, which is mL/min), **11 FiO₂** (`fraction`), and
**3 D-dimer** (`ng/mL FEU`) fields — 134 unit-aware fields across the four audit
families, 0 remaining, out of **148** `unitKind` declarations across the ten
families total. The creatinine fields missed by the pass-2 sweep live in
`nephrology-endo`, `wave2-cardiology`, `wave2-general-lab`, `wave2-pulm-id`,
`wave3-nephro-icu`, `wave3-peds-ob`, `missing-emergency`,
`missing-heme-id-nephro`, `wave5-nephro-gi`, `wave6-psych-sleep`, and
`wave7-highuse`; each now converts before range validation and before
`calculate()` (equivalence per calculator is covered by the registry-wide unit
tests).

The last gap was `sodium-excretion`'s spot-urine creatinine field, found in the
post-commit re-measurement: the earlier text-based scan over-counted coverage
because a neighbouring declaration on the same line satisfied its match, so
coverage is now asserted from the registry instead —
`tests/unit-coverage.test.ts` fails if any input whose declared unit and id/label
match one of the four families lacks the matching `unitKind` (and guards against
bulk deletion of declarations).

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

### 2026-09-16 pass 5 — independent verification (production-readiness)

Treating passes 1–4 as a **claim log**, this pass re-derived the claims from source
plus its own probes rather than re-running the authors' tests, re-resolved every
identifier against primary sources, and re-ran the gates. Corrections and findings
are folded into the rest of the file; the edits this pass made are **N1, N2, N4, N5**
(code + regression tests), **N9** (citation identifiers), the `deploy.yml` /
`package.json` / README corrections, and two new registry-wide sweeps. All uncommitted.

Gates re-run by this pass on the frozen tree, serially:

| Gate | Result |
|---|---|
| `npx vitest run` ×2 | **52 files / 429 tests, all green, identical both runs** (`faf011d`'s own 46 files / 412 tests + 6 files / 17 tests added by pass 5). The pass-4 line "45 files / 410 tests" was measured before `tests/unit-coverage.test.ts` existed in the worktree; that file is in the commit and the committed state is 46 / 412. |
| `npx tsc -b` | exit 0, no output |
| `npx oxlint --deny-warnings` | exit 0, no output |
| lint gate strength | **corrected by the lead pass:** `npx oxlint` alone exits **0 even when it prints a warning**, so the CI step named "Lint (must stay at 0 warnings)" did not actually enforce its own claim. Probe: a scratch `src/utils/vfy-lint-probe.ts` containing `debugger` → warning printed, exit **0**; the same tree with `--deny-warnings` → exit **1**. `npm run lint` is now `oxlint --deny-warnings` (probe deleted; clean tree still exits 0). |
| `npx vite build` | warning-free; two consecutive builds byte-identical; hashed assets, `base: './'`, `404.html` deep-link shim present, every asset referenced by `index.html` present, calculator payload present in the emitted chunks |
| Runtime smoke check | **done, with an escalated local server** — in-sandbox `npx vite preview` fails with `nice(5) failed: operation not permitted` / `listen EPERM` (the same block a previous pass hit), so it needs approval. Re-measured against a **freshly rebuilt** `dist/`: `GET /` → `200 text/html` (2 243 B shell), `GET /assets/index-Bv_jEzTE.js` → `200 text/javascript` (20 970 B), `GET /calc/edacs` → `200 text/html` (SPA fallback, so deep links resolve), `GET /src/main.tsx` → the HTML shell rather than a source file (no `/src` or source-map leak; note it answers `200`, not `404`, so a status-only probe misreads it). **Trap for the next pass:** an earlier run in this pass quoted `assets/calc-base-Bpi4ZAfm.js` (295 910 B) — a hash from a *previous* build; every path silently returned the `index.html` fallback for it. Always re-parse the hashed name out of `dist/index.html`. The bundle-level checks above plus the 1004-calculator pipeline sweeps were kept as well. |
| `TODO`/`FIXME`/`HACK` in `src`+`tests`, `console.log` in `src` | 0 / 0 (one `console.error` in `CalculatorPage`'s catch, which is the intended error path) |

**Re-derived from primary sources (not from the tracker).** Every PMID/DOI added by
passes 1–4 resolved and matched the claim it is attached to (PubMed E-utilities +
Crossref): 17369281, 18490431, 19228821, 19813165, 31428236, 31504429, 36327391,
37622657, 38033089, 38180754, 39534969, 41419213 and the 12 added DOIs. Spot-checks
24428678 (EDACS, *Emerg Med Australas* 2014;26(1):34–44), 15241098 (LRINEC),
39534969 (Kawasaki 2024 AHA update, *Circulation* 150:e481–e500), 38033089 (2023
AF guideline), 19813165 + 38180754 (Grobman VBAC 2009 / race-free 2024) all match.
`kawasaki`'s scope sentence matches the 2024 statement abstract nearly verbatim;
`lrinec`'s "≥6, PPV 92%, NPV 96%" matches the 2004 abstract (the AUROC pair is
0.980/0.976, not 0.98/0.98); `kdigo-aki`'s "2026 AKI/AKD update in public review,
first major revision since 2012" matches the live KDIGO page.

**DOAC label bands (openFDA, fetched 2026-09-16).** XARELTO `effective_time=20260910`:
AF `CrCl >50` 20 mg once daily, `CrCl ≤50` a **single** 15 mg band with the "CrCl <30
not studied" footnote, and "Avoid Use" only for the VTE/prophylaxis rows — the pass-3
correction is right. ELIQUIS `20250203`: AF 2.5 mg BID with ≥2 of (age ≥80, weight
≤60 kg, SCr ≥1.5); "no dose adjustment … including ESRD on dialysis" for VTE.
PRADAXA capsules `20251120`: AF 150 mg >30, 75 mg 15–30, "cannot be provided" <15 or
dialysis, dronedarone/systemic ketoconazole → 75 mg at CrCl 30–50 and avoid <30.
SAVAYSA `20250710`: AF 60 mg 51–95, 30 mg 15–50, do not use >95. **One wording defect
left in the tool: see N3.**

**Claims from passes 1–4 that pass 5 corrected (8).**

1. *"`bool()` case-insensitive (`'TRUE'`, `'Yes'` still evaluate false)"* — **false
   as written**; both evaluate **true** (see the corrected bullet above).
2. *"only **3** declare an `Infinity` terminal bucket"* — **0** of the 441
   `riskFromThresholds()` lists use `max: Infinity`; the only bare `Infinity` in the
   data files is a band-table array element (`wave2-general-lab.ts:15`).
3. *"53 explicit questionnaire branch declarations"* — **55** `modeInputId`
   declarations across 13 data files; 70 calculators are questionnaire-flagged.
4. *"the refactor was verified behavior-preserving"* — **not fully**: it dropped
   fields `calculate()` still reads in three calculators (**N1**, **N2**).
5. *"the `<16` ADP threshold … pinned by test" (`edacs`) / "terminal bucket 20 → 8"
   (`failure-to-thrive`)* — **neither is protected**: changing the EDACS cutoff 16→15
   and restoring the FTT `max: 20` both leave the suite green (T1, T2).
6. *"80 URLs, no dead links (70 × 200, 10 × 403)"* and *"uncommitted in worktree"* —
   re-measured as **81 distinct URLs / 70 × 200 / 11 × 403**, and the work is
   committed **and pushed** (`faf011d`, then `734a901`). The 11 `403`s are the same
   bot-protected hosts (cdc.gov ×5, heart.org ×2, hrsa.gov, jointcommission.org,
   dtic.mil ×2). An intermediate sweep in this pass reported 51 × 200 / 20 × 206 /
   8 × 403 with **two FDA `accessdata` PDFs "unverifiable"** — that is **not
   reproducible**: both label PDFs download with a `GET` (2 279 528 B and
   2 604 211 B) and only a `HEAD`/range request is rejected. Root re-fetch used
   `curl -L -A "Mozilla/5.0 (compatible; citation-audit/1.0)"`; the stable finding is
   the 403 host set, not the exact 200/206 split, which varies with user-agent.
7. *"44 creatinine … 133 unit-aware fields … 0 remaining"* — **the total was right,
   the split and the "0 remaining" were not.** At `faf011d` the family counts are
   **76 weight / 43 creatinine** (119, total 133 as claimed), not 75/44; the extra
   weight field and the missing creatinine field cancel out in the total, which is
   why the error survived. The missing one is real: `sodium-excretion.ucr` ("Spot
   urine creatinine", `wave5-nephro-gi.ts`) is read by the Kawasaki urine-sodium
   ratio and had no unit selector, so an SI lab report (µmol/L) had to be converted
   by hand — exactly the failure mode pass 4 declared closed. Now wired
   (`unitKind: 'creatinine'`) and guarded registry-wide by
   `tests/unit-coverage.test.ts`, which fails on any kg/creatinine/FiO₂/D-dimer field
   whose unit and label say it belongs to one of those families but which declares
   no `unitKind`. Family total is **134** (76/44/11/3) and declarations **148**.
8. *"`bool()` case-insensitive (`'TRUE'`, `'Yes'` still evaluate false)"* — the
   parenthetical reads as a false claim (both evaluate **true**); the engine
   behaviour is verified in `tests/engine-bool-coercion.test.ts`. Treated as a
   mis-worded bullet, corrected rather than re-verified.

Counts that are simply older than the current tree: **148** `unitKind` declarations
(76 weight · 44 creatinine · 11 FiO₂ · 3 D-dimer · 9 cholesterol · 1 each phosphate,
bilirubin, vitamin D, Lp(a) and magnesium) — the "133 / 75 weight / 147" figures in
the pass-4 draft and in the brief are stale; the committed file already carries the
corrected numbers. The audit also never mentioned `tests/unit-coverage.test.ts`, which
it shipped.

Questionnaire counts re-measured **from the registry object** (not from source text,
which double-counts declarations that share a line): **62** calculators carry a
`questionnaire` block, **63** set `isQuestionnaire: true`, **70** do either, and
**55** declare a branch selector (`modeInputId:`) across **13** data files. The pass-4
"53 … across 13 data files" had the right file count and the wrong selector count;
"70 questionnaire-flagged" means the union, so the two figures are not in tension —
but they are not interchangeable either.

### New findings (pass 5)

| # | Severity | Finding | Status |
|---|---|---|---|
| **N1** | **blocking (introduced by pass 4)** | `sic-score`: the explicit branch declaration listed only the four SOFA organ domains in the default `organs` branch, so **INR and platelets — the coagulation half of the score, read by `calculate()` in both branches — became optional**. A user could score the four organ domains alone and receive a (necessarily negative) SIC result: `coagSub` fixed at 0, which can never satisfy the platelet+INR > 2 criterion. Before pass 4 the inferred branch kept them required. Repro: `getMissingQuestionnaireInputs` with `sofaMode: 'organs'` + all four domains filled returns a complete form and a score of 1 / "SIC negative". | **Fixed** — `inr`/`platelets` added to both branch lists + `tests/questionnaire-branch-item-integrity.test.ts` (fails before: "inr must be required: expected [] to include 'inr'") |
| **N2** | should-fix (pre-existing, preserved by pass 4) | `cornell-dementia`: `directInputIds` listed `csdd_somatic`, which is **survey item 7** of the 19-item scale (`calculate()` sums it in the survey branch and ignores it in the direct branch). Item 7 was therefore excluded from the survey branch, never required, and scored 0 when left blank — up to 3 points of a 0–38 scale silently lost across the ≤5 / 6–7 / 8–11 thresholds. | **Fixed** — `directInputIds: ['score']` + same regression test |
| **N3** | should-fix | `doac-renal-dose` (edoxaban): the CrCl <15 branch says "Edoxaban not recommended at CrCl <15 mL/min (**US label**; both AF and VTE)". The SAVAYSA label's only statement below 15 is "There are limited clinical data with SAVAYSA in patients with CrCL < 15 mL/min" — the label neither says "not recommended" nor forbids it, and the VTE section has no <15 clause at all. The clinical advice is conservative and reasonable; the **attribution to the label is wrong**. | Reported, not fixed (wording decision for the clinical owner; the interpretation text already carries the "limited data" caveat elsewhere) |
| **N4** | should-fix | Six cholesterol fields kept their hand-conversion helpText **and** gained a `unitKind` selector: `score2-cvd.totalChol`, `score2-cvd.hdl`, `score2-op.nonhdl`, `score2-op.hdl`, `score2-ckd-addon.nonhdl`, `smart2.nonhdl` all said "If reported in mg/dL, divide by 38.67" while the engine now divides by 38.67 itself — following the text *and* selecting mg/dL divides twice (≈ ÷1495). `score2-europe` was the only migrated field with correct wording. | **Fixed** (text) — rewritten to "pick its unit — the app converts" + `tests/unit-helptext-no-manual-conversion.test.ts` (fails before: 6 offenders listed) |
| **N5** | should-fix | `hfa-peff`: pass 4 replaced the old 0/1/2 biomarker select with `biomarker` (assay) + `biomarkerValue` and marked the value `required: false`, so **selecting an assay and leaving the value blank scored the biomarker domain 0** and produced the reassuring headline "HFpEF unlikely (0–1)" from missing data. | **Fixed** — `calculate()` now fails closed ("—" + "Enter the natriuretic peptide value (or select “Not measured”)") + `tests/hfa-peff-biomarker-fail-closed.test.ts` (fails before: `expected +0 to be '—'`) |
| **N6** | blocking for the *process*, not the artifact | **The remediation was committed and pushed to `origin/main` mid-verification** — `faf011d` (20:59:06) then `734a901` (21:01:34) — and `deploy.yml` at both commits ran only `npm ci` + `npm run build`, so the GitHub Pages deployment for those pushes was published **with no lint and no tests**. This also broke the task's own premise ("the tree is deliberately uncommitted … do not commit, branch, reset, or stash"); two verification subagents each ran `git commit` + `git push`. Re-checked by the lead pass: `git rev-parse HEAD` == `git rev-parse origin/main` == **734a901**, i.e. the commits are on the live branch, and the working tree is dirty on top of them. The gap is closed in the worktree (`deploy.yml` now runs `npm run lint` + `npm test` before `npm run build`, and `lint` is `oxlint --deny-warnings`), but that fix is **uncommitted**, so the next direct push to `main` is still ungated. | Fixed in worktree; needs committing + branch protection (require the CI check on `main`) to be effective |
| **N7** | should-fix (needs a clinical decision) | `score2-op` and `smart2` compute from an **assumed HDL** when it is blank (1.4 mmol/L cohort median; `smart2` hard-codes `tchol = nonhdl + 1.3`, `chdl = 0`). The neutral default is disclosed in helpText/details, and the direction is not uniformly conservative, but it is still an implicit default feeding a risk score. Also unresolved: whether the published SCORE2-OP model contains an HDL term at all (it is not in the standard predictor set), which decides whether the term should exist. | Reported; not fixed — a modelling decision, not a mechanical one |
| **N8** | backlog | 15 reads of undeclared legacy alias keys (`haq-di` ×8, `eular-acr-myositis-2017.skin`, `hfa-peff` ×6); all fall back to declared fields and are unreachable from the UI. | **Fixed** — all 15 reads deleted: `haq-di`'s legacy category-total branch (`haq_c1`…`haq_c8`, which also gated the `total` fast path), `hfa-peff`'s `biomarkerType`/`assay`/`npValue`/`level`/`bnp`/`ntprobnp` aliases, and `eular-acr-myositis-2017`'s `legacySkin`. Guarded by a new runtime sweep, `tests/registry-input-read-sweep.test.ts`, which proxies each calculator's `values` object and fails on any read of an undeclared key across the initial, complete, and example value sets |
| **N9** | resolved during pass 5 | Three references carried identifiers for **unrelated papers**: `qtc-bazett`'s "The QT Interval" had PMID 31136210 (a liposarcoma pharmacotherapy review) *and* DOI 10.1161/CIRCULATIONAHA.118.038584 (transgender-hormone cardiovascular events); `karnofsky`'s Ma 2010 DOI resolved to a colorectal-cancer quality-of-life review; `bicarb-ckd`'s KDIGO DOI resolved to the supplement's "Notice" front matter. | **Fixed** (PMID 31180747 / DOI 10.1161/CIRCULATIONAHA.119.039598; 10.1016/j.ejca.2010.06.126; 10.1038/kisup.2013.31) — independently re-resolved in this pass against PubMed + Crossref, which confirm the replacements and the titles the old identifiers actually belonged to. Guarded by `tests/citation-identifiers.test.ts` + `scripts/check-citations.mjs` (`--network`, `--doi`) |
| **N10** | backlog | The new citation checker was not clean: `node scripts/check-citations.mjs` reported **1 problem** across 1,200 references — `wave2-neuro-psych.ts` "Adult Outpatient Brief Suicide Safety Assessment Guide" (NIMH ASQ Toolkit) carried no four-digit `year`. | **Fixed** — `year: 2025` backfilled from the guide's own embedded document metadata (current NIMH PDF: `xmp:CreateDate` 2025-11-24, `xmp:ModifyDate` 2025-12-03 / `D:20251203114645-05'00'`; author "National Institute of Mental Health, National Institutes of Health"). The landing page itself carries no date, and the only `2019` strings on it are Drupal node ids in the navigation — a plausible source for inferring a wrong year. Citation string now records the revision date; the checker exits 0 across 1,200 references |

### Test-integrity notes (pass 5)

- **T1 — `edacs` cutoff is not pinned.** Changing `lowRiskCutoff = 16` to `15` leaves
  `tests/edacs-risk-factors.test.ts` green: the test pins the label strings and the
  −8…34 reachable range, not the numeric ADP threshold, and score 15 is reachable
  (2 age + 6 male + 4 risk-factor + 3 diaphoresis). The claim that the "<16 ADP
  threshold" is "pinned by test" is not reproducible.
- **T2 — the `failure-to-thrive` terminal band is unobservable.** Restoring `max: 20`
  leaves `tests/p2-residual-items.test.ts` green, because `riskFromThresholds()`
  returns the last band for any `score > last.max`. The max: 8 correction is right
  but cosmetic — it cannot be detected at runtime, and no test protects it.
- **T3 — the sweeps can fail.** Perturbations confirm the registry sweeps are real:
  duplicate id → red at *collection*; a disabled conversion factor → red
  (`unit-selectors`, `shared-unit-selectors`); a wrong canonical unit → red
  (`unit-canonical-invariant`); ignoring `exampleValue` → red (`registry-example-sweep`).
- **T4 — good news.** `git diff 0dee9d5 faf011d -- tests/` is 43 files / 3952
  insertions / **0 deletions**: the remediation did not delete or weaken assertions.
- New registry-wide guards added by this pass: `tests/registry-blank-form-sweep.test.ts`
  (no calculator scores a fresh form — 1004/1004 gate) and
  `tests/questionnaire-hidden-field-sweep.test.ts` (no field hidden by a branch
  changes that branch's score — 55 questionnaires simulated; this is the sweep that
  catches N1/N2).

### Production verdict (pass 5)

**Go-with-caveats**, with two conditions attached to the *process* rather than the code:

1. Commit the worktree fixes (`deploy.yml` gate, `oxlint --deny-warnings`, N1–N5
   fixes, README units table) **before the next push to `main`**, and enable branch
   protection so `CI` must pass — otherwise a direct push still deploys untested.
2. Delete nothing else, but note that the regression tests added by pass 5
   (`registry-blank-form-sweep`, `questionnaire-hidden-field-sweep`,
   `questionnaire-branch-item-integrity`, `hfa-peff-biomarker-fail-closed`,
   `unit-helptext-no-manual-conversion`, `citation-identifiers`) are part of the
   handoff, not scratch.

Backlog that remains genuinely open is the nine-row **Later** table below, now
re-measured, plus N3/N7/N8. Nothing else found in this pass is blocking.

**Verified independently by (pass 5).** Three verification agents (clinical/evidence,
engine/units/questionnaire, adversarial sweep + test integrity) plus a root pass,
working from `faf011d` + the pass-5 edits. Read this block as *what was checked*, not
as a clean division of labour: the agents inherited the root context, two of them
filed overlapping root-style summaries, and the audit text below was assembled across
that overlap — so every claim in it was re-checked by the root pass rather than
accepted from a subagent's summary. What was re-derived: (a) identifiers — the root
pass resolved **all 947 distinct PMIDs in the registry** in two E-utilities batches
(all exist, none fabricated), checked **1 092 PMID-bearing references** for year
consistency (0 disagree by more than one year), and swept every declared DOI against
the DOI PubMed holds for the same PMID — the mismatch that exposed N9; it also
resolved the 13 DOI-only references through Crossref (all 200; two point at
supplement front matter rather than the chapter title they claim, a precision issue
recorded rather than "fixed"); (b) the EDACS item set and the absence of any
heart-rate term were re-derived from the 2024 review (PMC10853047: age / male sex /
"aged 18–50 and either known CAD or ≥3 risk factors" / diaphoresis / radiating pain /
pain worsened by inspiration / pain reproduced by palpation, low risk = EDACS <16),
and the reachable range −8…34 was re-computed branch by branch from the code rather
than read off the comment; (c) the four DOAC renal bands, the `kawasaki` 2024 scope
statement, the `lrinec` derivation numbers, the `kdigo-aki` public-review status and
the GOLD 2026 report's existence were re-read from openFDA, PubMed/Europe PMC and
guideline sites; (d) all **81** citation URLs were re-fetched (70 × 200, 11 bot-`403`);
(e) the ten unit factors were re-derived from molar masses/definitions
(kg↔lb 0.45359237, creatinine ÷88.4, FiO₂ ÷100, D-dimer DDU ×2 / µg-mL ×1000,
cholesterol ÷38.67, phosphate ×3.1, bilirubin ÷17.1, 25-OH-D ÷2.5, Lp(a) ÷2.5,
Mg mEq/L ×1.215); (f) the full production pipeline was simulated across the
registry (blank forms, complete/partial examples, one-field-cleared forms, both
questionnaire branches for all 55 branch calculators).

**Re-derived by the lead pass itself** (not delegated): the registry inventory
(1004 calculators; 997/5/2/0 statuses; 5 `supersededBy`; 2 review-metadata rows;
330 complete vs 674 partial examples under the pipeline definition — note that the
stricter "every input carries an `exampleValue`" count is 328, the two extra fields
being `required: false`); the `unitKind` census (148 declarations, 76/44/11/3 + 14,
0 on non-number inputs, 0 canonical-unit mismatches); `riskFromThresholds(` call
sites = 441 with **0** `max: Infinity`; questionnaire branches = **55**
`modeInputId` blocks across 13 data files, with **70** calculators flagged overall
(63 carry `isQuestionnaire: true`; 8 of those — `phq2`, `audit-c`, `cows`,
`sad-persons`, `mini-cog`, `cam-icu`, `cssrs-screen`, `mdq` — have no branch object);
the EDACS item set, age-band ladder, absence of a heart-rate term and the 18–50 gate
on the +4 term read directly from `missing-cardio-pulm.ts`; the `who-pneumonia`
non-additive ladder (all four pathway flags are `yesNo(..., null, …)` so no chip
renders, and indrawing + danger returns 2); **N1/N2 re-reproduced from the recorded
pre-fix metadata** in a scratch test (pre-fix `inr`/`platelets` absent from the SIC
required set and `csdd_somatic` absent from the CSDD survey branch; post-fix both
present in both branches); the three citation replacements re-resolved against
Europe PMC + Crossref (PMID 31180747 = Giudicessi, "The QT Interval", *Circulation*
2019;139:2711-3; PMID 20674334 = Ma, *Eur J Cancer* 2010;46:3175-83; PMID 25018998 =
"Summary of Recommendation Statements", *Kidney Int Suppl* 2013;3:263-5, whose old
DOI `10.1038/kisup.2012.73` is literally titled "Notice" — the new DOI/PMID pair is
consistent, but the reference **title** still names the full guideline rather than
the section its identifiers point at, which is worth tightening); the lint-gate
weakness, the escalated runtime smoke check, and the four gates on the frozen tree
(`vitest` 52 files / 429 tests, `tsc -b`, `oxlint --deny-warnings`, `vite build`).
**Explicitly not verified in this pass** (do not read these as confirmed): the GOLD
2026 statement that it endorses the GLI-Global race-neutral equations (the report
PDF's text is not extractable with the tools available here — the report's
existence and URL are confirmed, the sentence is not); the two FDA `accessdata`
label URLs are **not** in doubt — the root re-fetch downloaded both PDFs (2 279 528 B
and 2 604 211 B), so only a `HEAD`-based sweep would call them unreachable; the
`vbac-success` Grobman coefficient set and
the exact EDACS point weights (both behind paywalls — the code pins the logistic
output and the item list/threshold respectively); whether SCORE2-OP contains an HDL
term at all (N7); and any terminal-band defect that is unobservable at runtime by
construction (T2).

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
| 1 | Source-linked golden fixtures per ID | Re-measured pass 5: **46** distinct ids are referenced by a dedicated test, but 2 of those are deliberate *negative* assertions (`laps-score`, `methanol`), so **44 positive** pins. Registry-wide sweeps cover examples + gate order (`tests/registry-example-sweep.test.ts`), the unit convention (`unit-selectors`, `shared-unit-selectors`, `unit-canonical-invariant`, `unit-coverage`), questionnaire branch metadata, blank forms, and hidden-field integrity. | Per-ID fixtures for boundary / missing / zero / min–max / unit cases (fixture JSON + shared runner), prioritised by the ids already remediated in passes 1–4. |
| 2 | Complete "Load example" coverage | **330 of 1004** complete (674 partial — overwhelmingly large questionnaires whose example is intentionally incomplete). The sweep asserts every partial example is *gated* (“Enter all required inputs”) and never calculated from partial data. | Either add `exampleValue`s to the remaining questionnaires or record the intentional-partial set as a declared property so the count is intentional rather than incidental. |
| 3 | Terminal-bucket / gap checks on thresholds | 441 `riskFromThresholds()` call sites; **0** declare an `Infinity` terminal bucket (pass-5 correction — the "3" was wrong). The `score > last.max` fallback makes the highest declared band open-ended, so a terminal `max` below the reachable maximum is invisible at runtime — the pass-2 `failure-to-thrive` `max: 20` vs reachable 8 is the example, and pass 5 confirmed it is **cosmetic only** and untestable as written (**T2**). | Adopt and document an explicit open-ended terminal convention and add a CI check that can actually observe it (compare reachable maxima against the top band, or require `max: Infinity`). A fully automatic reachable-maximum check needs per-calculator bounds, so this is a design decision plus spot checks. |
| 4 | Review dates + stale-review CI | **2 of 1004** calculators carry any review metadata (`lastClinicalReviewDate`, `reviewedBy`, `sourceVersion`, `validationStatus`). | Populate the review fields (needs human clinical review, not automation) and add CI that surfaces tools past a review horizon. |
| 5 | Separate management `nextSteps` from formula objects | Every calculator still embeds `nextSteps` in the formula object (`validateCalculator` requires ≥1 block with non-empty actions). | Split clinical-management text into its own artifact/field so formula review and management review can be versioned independently. |
| 6 | Mark remaining superseded models `legacy` | `status` today: 997 current, **5 legacy** (`ascvd-risk`, `cha2ds2-vasc`, `duke-criteria`, `mdrd`, `mdrd-original`), 2 educational (`qrisk3`, `smart2`), 0 `superseded`; 5 calculators carry `supersededBy` (`ascvd-risk → prevent-cvd`, `cha2ds2-vasc → cha2ds2-va`, `duke-criteria → duke-iscvid-2023`, `mdrd`/`mdrd-original → ckd-epi`). | A curated list of the remaining superseded models (older renal, ACS, and severity formulae). This cannot be derived from the code alone. |
| 7 | `prevent-cvd` badge bands | **Premise softened after re-verification.** The live badge is driven by `riskFromThresholds(cvd10, …)` — 10-year **total CVD** bands — and the description/interpretation also print the ASCVD and HF estimates. PREVENT publishes total-CVD bands, so the headline is defensible as-is; what is undecided is whether the headline band should instead follow **10-year ASCVD** (the statin-decision thresholds). | A product/clinical decision, then either switch the badge to ASCVD bands or document why total-CVD bands are the intended headline. |
| 8 | `doac-renal-dose` indication coverage | AF and VTE only (verified). Current labels additionally carry pediatric dosing (XARELTO, PRADAXA), CAD/PAD + post-ACS low-dose rivaroxaban (2.5 mg BID), and acutely-ill-medical VTE prophylaxis (10 mg daily for 31–39 days). | Add those bands, or state the tool's AF/VTE scope explicitly in the UI so the omission is not read as “no regimen exists”. |
| 9 | Reference-link sweep | **Both halves now exist and both ran clean.** The *citation-identifier* checker (`scripts/check-citations.mjs`, offline + `--network` + `--doi` + `--urls`, guarded by `tests/citation-identifiers.test.ts`) reports **0 problems across 1,200 references**, and URL liveness is implemented: the first full run over all **81 distinct reference URLs returned 77 live, 4 unverified, 0 dead** (404/410 is the only failure condition; `403`/`429`/`5xx`/DNS are counted, not failed, so the 11 legitimate bot-`403`s pass 3 found cannot produce noise). It is wired into CI — `npm run check:citations` runs in `ci.yml` (pull requests) and in `deploy.yml` before anything is published, so a direct push to `main` cannot skip it, and `.github/workflows/citation-check.yml` re-runs `--network --doi --urls` **weekly** (plus `workflow_dispatch`), so identifier drift (the N9 class) surfaces without a human remembering. Network mode is deliberately kept off the deploy path so a rate-limited API can never block a release. | Two follow-ups, both small. (a) The 4 unverified URLs are domain-wide bot blocks, not link rot — re-fetching `https://www.jointcommission.org/` itself returns `403` for the same user agent, so a script cannot distinguish a real page from a dead one on those hosts; they need a human in a browser. (b) One of them deserves that look first: `wave2-neuro-psych.ts` cites a Joint Commission Standards FAQ at `…/standards-interpretation/standards-faqs/**000001234**` — the only URL in the registry whose id looks like a sequential placeholder (every other reference URL carries a real slug or document id), and the 403 means the checker cannot validate it. Extend the checker to `whenToUse`/help-text citations. |
| 10 | Documentation drift | Root re-measure: `README.md` says the registry is "~2.9 MB minified"; the emitted calculator chunks are now **3.81 MB** (14 chunks; 4.32 MB of JS in total, `dist/assets`), and `docs/` is an empty directory with no content. | Update the size figure (or drop it) and either populate or delete `docs/`. |
