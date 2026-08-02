# Post-Audit Calculator Changes

**Date:** 2026-07-30  
**Scope:** All calculator source changes made after the scoring audit (494 findings → **0 findings**).  
**Baseline:** `git` HEAD vs working tree under `src/data/calculators/` and `src/utils/helpers.ts`.  

---

## Summary

| Metric | Count |
| :--- | ---: |
| Calculators with any post-audit change | **178** |
| Option-points metadata primarily | ~123 |
| `calculate()` / logic updates | ~54 |
| `details` / unused-input UX fixes | ~44 |
| Automated audit findings remaining | **0** |

### Change types

1. **Option points metadata** — Align `yesNo(..., N)` / option `points: N` with the actual score delta in `calculate()` (or omit points for non-linear / formula flags via `yesNo(..., null)`).
2. **Unused-input / early-exit UX** — Always return a `details` (and sometimes interpretation) checklist so every UI input changes output, without breaking clinical AND/OR logic.
3. **Clinical scoring accuracy** — Match MDCalc / published tables (GRACE, NIHSS, etc.).
4. **Shared helper** — `yesNo` accepts `pointsYes: null` to omit point badges.

### Shared infrastructure

| File | Change |
| :--- | :--- |
| `src/utils/helpers.ts` | `yesNo(id, label, pointsYes, helpText?)` — `pointsYes` may be `null` to omit option points metadata (no “+N” UI chip). |
| `tests/audit-scoring-auto.test.ts` | Smarter unused-input detection (multi-baseline + pairwise enabling of AND/OR gates). |
| `scripts/SCORING_AUDIT_REPORT.md` | Post-fix clean report. |

---

## Major clinical / MDCalc corrections

### `grace` — GRACE ACS Risk Score

**Major clinical fix:** Replaced simplified linear approximation with standard GRACE ACS point tables (age/HR/SBP/Cr bands; cardiac arrest **39**, ST deviation **28**, elevated enzymes **14**, Killip **0/20/39/59**). Aligned with MDCalc GRACE model.

- **File:** `src/data/calculators/cardiology.ts`
- Updated `yesNo('arrest', …)` points: 1 → 39
- Updated `yesNo('st', …)` points: 1 → 28
- Updated `yesNo('enzyme', …)` points: 1 → 14
- Option `points` metadata adjusted (0 → 4 point annotations; sum 0 → 118)
- Updated result `details` content (criterion checklist / input status)
- Updated `calculate()` scoring / branching logic
- Replaced simplified linear GRACE approximation with standard GRACE point tables

### `nihss` — NIH Stroke Scale (NIHSS)

**Major clinical fix:** Expanded to full 15-item NIHSS with separate left/right arm and leg motor scores (max **42**), matching MDCalc NIHSS.

- **File:** `src/data/calculators/gi-neuro-psych.ts`
- Updated result `details` content (criterion checklist / input status)
- Updated `calculate()` scoring / branching logic
- Changed select inputs structure

### `atria-stroke` — ATRIA Stroke Risk Score

**Clinical metadata fix:** Prior stroke correctly reweights age points (not a fixed +8 for all ages). `yesNo` points set to `null` so UI does not show a misleading fixed badge. Age with prior: <65→8, 65–74→7, 75–84→7, ≥85→9.

- **File:** `src/data/calculators/wave2-cardiology.ts`
- Updated `yesNo('priorStroke', …)` points: 1 → null
- Updated `calculate()` scoring / branching logic

### `meld` — MELD Score

**Clinical metadata fix:** Dialysis correctly forces creatinine to 4.0 mg/dL (OPTN). Points metadata omitted (`null`) so UI does not show a false fixed “+N” chip.

- **File:** `src/data/calculators/gi-neuro-psych.ts`
- Updated `yesNo('dialysis', …)` points: 1 → null
- Updated `calculate()` scoring / branching logic

### `fn-pathway` — Febrile Neutropenia Pathway Helper

**Logic fix:** Red-flag risk features always contribute to score (even before fever/ANC gates). Correct weighted points restored (hypotension 3, hypoxia 3, altered 2, etc.). Full criterion `details` on all branches.

- **File:** `src/data/calculators/wave6-heme-onc.ts`
- Updated `yesNo('fever', …)` points: 1 → 0
- Added/expanded `details` so inputs always affect visible output (2 → 4 details blocks)
- Updated `calculate()` scoring / branching logic

### `salt-triage` — SALT Mass Casualty Triage

**Logic fix:** Full SALT algorithm path (walk → minimal; breathing/obeys/pulse/distress/likelySurvive for immediate/delayed/expectant/dead).

- **File:** `src/data/calculators/wave4-icu-vent.ts`
- Updated `calculate()` scoring / branching logic

### `hep-score` — HEP Score (HIT Expert Probability)

Pathway-conditional timing inputs (`timingTypical` / `timingRapid`) had points metadata removed so only the active onset pathway is scored without false option badges.

- **File:** `src/data/calculators/wave6-heme-onc.ts`
- Option `points` metadata adjusted (17 → 8 point annotations; sum 13 → 8)

---

## Full per-calculator changelog

Alphabetical by calculator id. **178** calculators.

### A

#### `abg-stepwise` — Stepwise ABG Interpretation Helper

- **Source file:** `src/data/calculators/wave6-clinical-residual.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('checkGap', …)` points: 1 → 0

#### `acr-albumin` — Urine Albumin–Creatinine Ratio (UACR) Categories

- **Source file:** `src/data/calculators/wave5-nephro-gi.ts`
- **Change categories:** unused-input-details, logic-or-structure
- **Notes:** Sex context in interpretation/`details` (KDIGO A1–A3 thresholds unchanged).
- **Diff summary:**
  - Updated result `details` content (criterion checklist / input status)
  - Updated `calculate()` scoring / branching logic

#### `acs-nsqip-simp` — Surgical Risk Helper (ACS-NSQIP style educational)

- **Source file:** `src/data/calculators/wave3-em-surgery.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('emergency', …)` points: 1 → 2

#### `aed-level` — AED Therapeutic Level Interpreter

- **Source file:** `src/data/calculators/wave2-neuro-psych.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('toxicSx', …)` points: 1 → 0
  - Updated `yesNo('breakthrough', …)` points: 1 → 0

#### `aki-cause` — AKI Cause Likelihood (Pre-renal vs ATN Checklist)

- **Source file:** `src/data/calculators/wave6-clinical-residual.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('shockIschemia', …)` points: 1 → 0
  - Updated `yesNo('fenaHigh', …)` points: 1 → 0
  - Updated `yesNo('muddy', …)` points: 1 → 0
  - Updated `yesNo('noFluidResponse', …)` points: 1 → 0
  - Updated `yesNo('ckRise', …)` points: 1 → 0

#### `akin-aki` — AKIN AKI Staging

- **Source file:** `src/data/calculators/wave3-nephro-icu.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('rrt', …)` points: 1 → 3

#### `anaphylaxis-criteria` — Anaphylaxis Criteria (NIAID/FAAN)

- **Source file:** `src/data/calculators/wave5-tox-psych.ts`
- **Change categories:** option-points, unused-input-details, logic-or-structure
- **Notes:** All NIAID criteria including hypotension_only in `details`.
- **Diff summary:**
  - Updated `yesNo('acute_onset', …)` points: 1 → 0
  - Updated `yesNo('skin_mucosa', …)` points: 1 → 0
  - Updated `yesNo('resp', …)` points: 1 → 0
  - Updated `yesNo('hypotension_endorgan', …)` points: 1 → 0
  - Updated `yesNo('gi_cramp', …)` points: 1 → 0
  - Updated `yesNo('likely_allergen', …)` points: 1 → 0
  - Updated `yesNo('known_allergen', …)` points: 1 → 0
  - Updated `yesNo('hypotension_only', …)` points: 1 → 0
  - Updated result `details` content (criterion checklist / input status)
  - Updated `calculate()` scoring / branching logic

#### `apache2-simp` — APACHE II (Simplified Educational)

- **Source file:** `src/data/calculators/critical-care.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('chronic', …)` points: 1 → 0

#### `arrest-labor` — Arrest of Labor (ACOG Definitions Helper)

- **Source file:** `src/data/calculators/wave6-em-peds.ts`
- **Change categories:** option-points, unused-input-details, logic-or-structure
- **Notes:** parity, epidural, ruptured, adequateUv always in labor details.
- **Diff summary:**
  - Updated `yesNo('epidural', …)` points: 1 → 0
  - Updated `yesNo('ruptured', …)` points: 1 → 0
  - Updated `yesNo('adequateUv', …)` points: 1 → 0
  - Updated `yesNo('malpresentation', …)` points: 1 → 0
  - Added/expanded `details` so inputs always affect visible output (2 → 4 details blocks)
  - Updated `calculate()` scoring / branching logic

#### `asa-physical` — ASA Physical Status Classification

- **Source file:** `src/data/calculators/wave3-em-surgery.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('emergency', …)` points: 1 → 0

#### `ascites-grade` — Clinical Ascites Grade (1–3)

- **Source file:** `src/data/calculators/wave6-clinical-residual.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('refractory', …)` points: 1 → 0
  - Updated `yesNo('infected', …)` points: 1 → 0

#### `ascites-pmm` — Ascites PMN (SBP Diagnosis)

- **Source file:** `src/data/calculators/wave3-gi-hep.ts`
- **Change categories:** option-points, unused-input-details, logic-or-structure
- **Notes:** Symptoms status always in `details`.
- **Diff summary:**
  - Updated `yesNo('symptoms', …)` points: 1 → 0
  - Updated result `details` content (criterion checklist / input status)
  - Updated `calculate()` scoring / branching logic

#### `ascvd-risk` — ASCVD 10-Year Risk (Pooled Cohort, simplified)

- **Source file:** `src/data/calculators/cardiology.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('txHtn', …)` points: 1 → 0
  - Updated `yesNo('dm', …)` points: 1 → 0
  - Updated `yesNo('smoker', …)` points: 1 → 0

#### `aspects` — ASPECTS (Early Ischemic Change)

- **Source file:** `src/data/calculators/missing-neuro-psych.ts`
- **Change categories:** unused-input-details, logic-or-structure
- **Notes:** Entry mode (direct vs region count) always in `details`.
- **Diff summary:**
  - Updated result `details` content (criterion checklist / input status)
  - Updated `calculate()` scoring / branching logic

#### `asq-suicide` — ASQ Suicide Risk Screen

- **Source file:** `src/data/calculators/wave5-tox-psych.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('q5', …)` points: 1 → 0

#### `asthma-exacerbation-peds` — Pediatric Asthma Exacerbation Severity

- **Source file:** `src/data/calculators/wave3-peds-ob.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('altered', …)` points: 1 → 0

#### `atls-class` — ATLS Hemorrhagic Shock Class

- **Source file:** `src/data/calculators/wave3-em-surgery.ts`
- **Change categories:** unused-input-details, logic-or-structure
- **Notes:** Mental status & urine always in `details`.
- **Diff summary:**
  - Updated result `details` content (criterion checklist / input status)
  - Updated `calculate()` scoring / branching logic

#### `atria-stroke` — ATRIA Stroke Risk Score

- **Source file:** `src/data/calculators/wave2-cardiology.ts`
- **Change categories:** option-points, logic-or-structure
- **Notes:** **Clinical metadata fix:** Prior stroke correctly reweights age points (not a fixed +8 for all ages). `yesNo` points set to `null` so UI does not show a misleading fixed badge. Age with prior: <65→8, 65–74→7, 75–84→7, ≥85→9.
- **Diff summary:**
  - Updated `yesNo('priorStroke', …)` points: 1 → null
  - Updated `calculate()` scoring / branching logic

### B

#### `baux-score` — Baux Score (Burn Mortality)

- **Source file:** `src/data/calculators/missing-emergency.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('inhalation', …)` points: 1 → 17

#### `berlin-ards` — Berlin ARDS Definition Helper

- **Source file:** `src/data/calculators/missing-cardio-pulm.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('timing', …)` points: 1 → 0
  - Updated `yesNo('imaging', …)` points: 1 → 0
  - Updated `yesNo('origin', …)` points: 1 → 0
  - Updated `yesNo('peep', …)` points: 1 → 0

#### `berlin-sleep` — Berlin Questionnaire (Sleep Apnea Screen)

- **Source file:** `src/data/calculators/wave6-scores-residual.ts`
- **Change categories:** unused-input-details, logic-or-structure
- **Notes:** HTN and BMI>30 broken out separately in Category 3 `details`.
- **Diff summary:**
  - Updated result `details` content (criterion checklist / input status)
  - Updated `calculate()` scoring / branching logic

#### `bicarb-ckd` — Metabolic Acidosis Treatment Threshold in CKD

- **Source file:** `src/data/calculators/wave5-nephro-gi.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('symptoms', …)` points: 1 → 0

#### `bp-classification` — ACC/AHA Blood Pressure Classification

- **Source file:** `src/data/calculators/wave4-primary-endo.ts`
- **Change categories:** option-points, unused-input-details, logic-or-structure
- **Notes:** End-organ symptoms always in `details`; urgency note if symptoms without crisis BP.
- **Diff summary:**
  - Updated `yesNo('crisisSymptoms', …)` points: 1 → 0
  - Added/expanded `details` so inputs always affect visible output (1 → 2 details blocks)
  - Updated `calculate()` scoring / branching logic

#### `bronchiolitis-severity` — Bronchiolitis Clinical Severity Bands

- **Source file:** `src/data/calculators/wave3-peds-ob.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('apnea', …)` points: 1 → 0
  - Updated `yesNo('highRisk', …)` points: 1 → 0

#### `brugada-criteria` — Brugada ECG Pattern Helper

- **Source file:** `src/data/calculators/wave3-cardio-vasc.ts`
- **Change categories:** option-points, logic-or-structure
- **Notes:** Drug trigger and clinical flags always in `details`.
- **Diff summary:**
  - Updated `yesNo('highLeads', …)` points: 1 → 0
  - Updated `yesNo('fever', …)` points: 1 → 0
  - Updated `yesNo('syncope', …)` points: 1 → 0
  - Updated `yesNo('fhScd', …)` points: 1 → 0
  - Updated `yesNo('drugs', …)` points: 1 → 0
  - Updated `calculate()` scoring / branching logic

#### `buprenorphine-cows` — COWS Readiness for Buprenorphine Induction

- **Source file:** `src/data/calculators/wave6-psych-sleep.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('prior_precip', …)` points: 1 → 0

### C

#### `calvert-carboplatin` — Calvert Carboplatin Dose

- **Source file:** `src/data/calculators/wave2-oncology.ts`
- **Change categories:** option-points, unused-input-details, logic-or-structure
- **Notes:** GFR cap Yes/No always in `details` even when GFR ≤125.
- **Diff summary:**
  - Updated `yesNo('capGfr', …)` points: 1 → 0
  - Updated result `details` content (criterion checklist / input status)
  - Updated `calculate()` scoring / branching logic

#### `canadian-cspine` — Canadian C-Spine Rule

- **Source file:** `src/data/calculators/emergency-misc.ts`
- **Change categories:** option-points, logic-or-structure
- **Notes:** Algorithm preserved; `details` always include high-risk / low-risk / rotate.
- **Diff summary:**
  - Updated `yesNo('highRisk', …)` points: 1 → 0
  - Updated `yesNo('lowRisk', …)` points: 1 → -1
  - Updated `yesNo('rotate', …)` points: 1 → 0
  - Updated `calculate()` scoring / branching logic

#### `canadian-ct-head` — Canadian CT Head Rule

- **Source file:** `src/data/calculators/missing-emergency.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('gcsLow2h', …)` points: 1 → 2
  - Updated `yesNo('openDepressed', …)` points: 1 → 2
  - Updated `yesNo('basalSkull', …)` points: 1 → 2
  - Updated `yesNo('vomit2', …)` points: 1 → 2
  - Updated `yesNo('age65', …)` points: 1 → 2

#### `carbamazepine-level` — Carbamazepine Level Interpretation

- **Source file:** `src/data/calculators/wave5-tox-psych.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('ams', …)` points: 1 → 0
  - Updated `yesNo('seizure', …)` points: 1 → 0

#### `cdi-severity` — C. difficile Infection Severity (IDSA-style)

- **Source file:** `src/data/calculators/wave2-pulm-id.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('hypotension', …)` points: 1 → 2
  - Updated `yesNo('ileus', …)` points: 1 → 2
  - Updated `yesNo('megacolon', …)` points: 1 → 2

#### `ciwa-b` — CIWA-B (Benzodiazepine Withdrawal) Simplified

- **Source file:** `src/data/calculators/wave4-neuro-psych.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('seizureHx', …)` points: 1 → 0
  - Updated `yesNo('highDose', …)` points: 1 → 0
  - Updated `yesNo('concurrentAlcohol', …)` points: 1 → 0

#### `co-oximetry` — Carboxyhemoglobin Severity (COHb)

- **Source file:** `src/data/calculators/wave5-tox-psych.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('neuro', …)` points: 1 → 0
  - Updated `yesNo('cardiac', …)` points: 1 → 0
  - Updated `yesNo('pregnant', …)` points: 1 → 0

#### `concussion-return` — Graduated Return-to-Play (Concussion)

- **Source file:** `src/data/calculators/wave4-neuro-psych.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('symptomFreeRest', …)` points: 1 → 0
  - Updated `yesNo('returnToLearn', …)` points: 1 → 0
  - Updated `yesNo('medicalClearance', …)` points: 1 → 0

#### `corrected-phenytoin` — Corrected Phenytoin (Albumin)

- **Source file:** `src/data/calculators/emergency-misc.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('esrd', …)` points: 1 → 0

#### `crusade` — CRUSADE Bleeding Risk Score

- **Source file:** `src/data/calculators/wave3-cardio-vasc.ts`
- **Change categories:** option-points
- **Notes:** Weighted yesNo points aligned (HF 7, vascular 6, DM 6).
- **Diff summary:**
  - Updated `yesNo('hf', …)` points: 1 → 7
  - Updated `yesNo('vascular', …)` points: 1 → 6
  - Updated `yesNo('dm', …)` points: 1 → 6

#### `cssrs-screen` — C-SSRS Screener (Simplified)

- **Source file:** `src/data/calculators/missing-neuro-psych.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('siNonSpecific', …)` points: 1 → 2
  - Updated `yesNo('siMethod', …)` points: 1 → 3
  - Updated `yesNo('siIntent', …)` points: 1 → 4
  - Updated `yesNo('siPlanIntent', …)` points: 1 → 5
  - Updated `yesNo('behavior', …)` points: 1 → 0

#### `cyanide-toxicity` — Cyanide Toxicity Suspicion Helper

- **Source file:** `src/data/calculators/wave5-tox-psych.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('ams', …)` points: 1 → 2
  - Updated `yesNo('shock', …)` points: 1 → 2

### D

#### `de-winter` — de Winter T-Wave Pattern Helper

- **Source file:** `src/data/calculators/wave4-em-id.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('upslopeStd', …)` points: 2 → 0
  - Updated `yesNo('tallT', …)` points: 2 → 0

#### `delta-troponin` — Delta Troponin Interpreter (Educational)

- **Source file:** `src/data/calculators/wave4-em-id.ts`
- **Change categories:** unused-input-details, logic-or-structure
- **Notes:** Sex-specific URL context in interpretation/`details`.
- **Diff summary:**
  - Updated result `details` content (criterion checklist / input status)
  - Updated `calculate()` scoring / branching logic

#### `digoxin-level-interpret` — Digoxin Level Interpretation

- **Source file:** `src/data/calculators/wave2-cardiology.ts`
- **Change categories:** option-points, unused-input-details, logic-or-structure
- **Notes:** Indication always in `details`.
- **Diff summary:**
  - Updated `yesNo('symptoms', …)` points: 1 → 0
  - Updated `yesNo('renalImpair', …)` points: 1 → 0
  - Updated result `details` content (criterion checklist / input status)
  - Updated `calculate()` scoring / branching logic

#### `duke-activity` — Duke Activity Status Index (DASI)

- **Source file:** `src/data/calculators/wave5-cardio.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('q1', …)` points: 1 → 0.3999999999999999
  - Updated `yesNo('q2', …)` points: 1 → 0.2999999999999998
  - Updated `yesNo('q3', …)` points: 1 → 0.3999999999999999
  - Updated `yesNo('q4', …)` points: 1 → 0.6999999999999997
  - Updated `yesNo('q6', …)` points: 1 → 0.3999999999999999
  - Updated `yesNo('q7', …)` points: 1 → 0.5
  - Updated `yesNo('q9', …)` points: 1 → 0.5999999999999996
  - Updated `yesNo('q10', …)` points: 1 → 0.6999999999999997
  - Updated `yesNo('q11', …)` points: 1 → 0.7999999999999998

#### `duke-criteria` — Modified Duke Criteria (IE Helper)

- **Source file:** `src/data/calculators/extra.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('predisposing', …)` points: 1 → 0
  - Updated `yesNo('fever', …)` points: 1 → 0
  - Updated `yesNo('vascular', …)` points: 1 → 0
  - Updated `yesNo('immuno', …)` points: 1 → 0
  - Updated `yesNo('microMinor', …)` points: 1 → 0

### E

#### `eat-26` — EAT-26 Eating Attitudes Total

- **Source file:** `src/data/calculators/wave6-psych-sleep.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('behaviors', …)` points: 1 → 0

#### `eclampsia-mag` — Magnesium Sulfate for Eclampsia (Educational Dosing)

- **Source file:** `src/data/calculators/wave6-em-peds.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('renalImpair', …)` points: 1 → 0

#### `effect-hf` — EFFECT HF Mortality Score (Simplified)

- **Source file:** `src/data/calculators/wave2-cardiology.ts`
- **Change categories:** option-points
- **Notes:** Weighted comorbidity points aligned (cvd 6, dementia 8, COPD 4, cirrhosis 10, cancer 8).
- **Diff summary:**
  - Updated `yesNo('cvd', …)` points: 1 → 6
  - Updated `yesNo('dementia', …)` points: 1 → 8
  - Updated `yesNo('copd', …)` points: 1 → 4
  - Updated `yesNo('cirrhosis', …)` points: 1 → 10
  - Updated `yesNo('cancer', …)` points: 1 → 8

#### `epinephrine-im-dose` — Epinephrine IM Dose (Anaphylaxis)

- **Source file:** `src/data/calculators/wave5-tox-psych.ts`
- **Change categories:** unused-input-details, logic-or-structure
- **Notes:** Concentration (1:1000 vs autoinjector) in interpretation/`details`.
- **Diff summary:**
  - Updated result `details` content (criterion checklist / input status)
  - Updated `calculate()` scoring / branching logic

#### `euroscore-ii-simp` — EuroSCORE II (Simplified Educational)

- **Source file:** `src/data/calculators/wave2-cardiology.ts`
- **Change categories:** option-points
- **Notes:** Weighted surgical risk points aligned.
- **Diff summary:**
  - Updated `yesNo('extracardiac', …)` points: 1 → 2
  - Updated `yesNo('poorMobility', …)` points: 1 → 2
  - Updated `yesNo('prevCardiacSx', …)` points: 1 → 3
  - Updated `yesNo('copd', …)` points: 1 → 2
  - Updated `yesNo('endocarditis', …)` points: 1 → 3
  - Updated `yesNo('critical', …)` points: 1 → 4
  - Updated `yesNo('dmInsulin', …)` points: 1 → 2
  - Updated `yesNo('recentMi', …)` points: 1 → 2

#### `exchange-transfusion-threshold` — Exchange Transfusion Threshold (Approximate)

- **Source file:** `src/data/calculators/wave5-peds-id.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('abeSigns', …)` points: 1 → -4

### F

#### `fena-contrast` — FENa after Contrast (Timing Helper)

- **Source file:** `src/data/calculators/wave6-clinical-residual.ts`
- **Change categories:** option-points, unused-input-details, logic-or-structure
- **Notes:** onDiuretic always in `details`.
- **Diff summary:**
  - Updated `yesNo('fenaKnown', …)` points: 1 → 0
  - Updated `yesNo('creatinineUp', …)` points: 1 → 0
  - Updated `yesNo('otherCause', …)` points: 1 → 0
  - Updated `yesNo('onDiuretic', …)` points: 1 → 0
  - Updated result `details` content (criterion checklist / input status)
  - Updated `calculate()` scoring / branching logic

#### `fena-diuretic` — FENa on Diuretics + FeUrea

- **Source file:** `src/data/calculators/wave3-nephro-icu.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('onDiuretic', …)` points: 1 → 9.9

#### `fisher-grade` — Modified Fisher CT Grade (SAH)

- **Source file:** `src/data/calculators/missing-neuro-psych.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('ivh', …)` points: 1 → 2

#### `fn-pathway` — Febrile Neutropenia Pathway Helper

- **Source file:** `src/data/calculators/wave6-heme-onc.ts`
- **Change categories:** option-points, unused-input-details, logic-or-structure
- **Notes:** **Logic fix:** Red-flag risk features always contribute to score (even before fever/ANC gates). Correct weighted points restored (hypotension 3, hypoxia 3, altered 2, etc.). Full criterion `details` on all branches.
- **Diff summary:**
  - Updated `yesNo('fever', …)` points: 1 → 0
  - Added/expanded `details` so inputs always affect visible output (2 → 4 details blocks)
  - Updated `calculate()` scoring / branching logic

#### `fomepizole-dose` — Fomepizole Dosing

- **Source file:** `src/data/calculators/wave3-tox-endo-heme.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('onHd', …)` points: 1 → 0

#### `framingham-hf` — Framingham Heart Failure Criteria

- **Source file:** `src/data/calculators/extra.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('ankleEdema', …)` points: 1 → 0
  - Updated `yesNo('nightCough', …)` points: 1 → 0
  - Updated `yesNo('doe', …)` points: 1 → 0
  - Updated `yesNo('hepato', …)` points: 1 → 0
  - Updated `yesNo('pleural', …)` points: 1 → 0
  - Updated `yesNo('hr120', …)` points: 1 → 0
  - Updated `yesNo('vc', …)` points: 1 → 0

#### `free-phenytoin` — Estimated Free Phenytoin

- **Source file:** `src/data/calculators/wave2-neuro-psych.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('esrd', …)` points: 1 → 0
  - Updated `yesNo('toxicSx', …)` points: 1 → 0

### G

#### `gail-model-simplified` — Gail Model (Simplified Educational)

- **Source file:** `src/data/calculators/wave2-oncology.ts`
- **Change categories:** option-points, unused-input-details, logic-or-structure
- **Notes:** Race/ethnicity captured in interpretation/`details` (counseling; official Gail is race-specific).
- **Diff summary:**
  - Updated `yesNo('atypia', …)` points: 1 → 2
  - Updated result `details` content (criterion checklist / input status)
  - Updated `calculate()` scoring / branching logic

#### `gdmt-checklist` — HFrEF GDMT Optimization Checklist

- **Source file:** `src/data/calculators/wave5-cardio.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('arniPreferred', …)` points: 1 → 0
  - Updated `yesNo('loop', …)` points: 1 → 0
  - Updated `yesNo('ivabradine', …)` points: 1 → 0
  - Updated `yesNo('hydralNitrates', …)` points: 1 → 0
  - Updated `yesNo('deviceEligible', …)` points: 1 → 0

#### `gestational-htn` — Gestational Hypertension Diagnostic Helper

- **Source file:** `src/data/calculators/wave3-peds-ob.ts`
- **Change categories:** unused-input-details, logic-or-structure
- **Notes:** severeBp, proteinuria, endOrgan, resolvedPostpartum always in shared details.
- **Diff summary:**
  - Added/expanded `details` so inputs always affect visible output (1 → 5 details blocks)
  - Updated `calculate()` scoring / branching logic

#### `gout-classification` — ACR/EULAR Gout Classification (Simplified)

- **Source file:** `src/data/calculators/wave5-general-misc.ts`
- **Change categories:** unused-input-details, logic-or-structure
- **Notes:** Domain points listed in `details` even on MSU+/no-entry early exits; additive scoring path unchanged (threshold ≥8).
- **Diff summary:**
  - Added/expanded `details` so inputs always affect visible output (2 → 4 details blocks)
  - Updated `calculate()` scoring / branching logic

#### `grace` — GRACE ACS Risk Score

- **Source file:** `src/data/calculators/cardiology.ts`
- **Change categories:** clinical-scoring, option-points, unused-input-details, logic-or-structure
- **Notes:** **Major clinical fix:** Replaced simplified linear approximation with standard GRACE ACS point tables (age/HR/SBP/Cr bands; cardiac arrest **39**, ST deviation **28**, elevated enzymes **14**, Killip **0/20/39/59**). Aligned with MDCalc GRACE model.
- **Diff summary:**
  - Updated `yesNo('arrest', …)` points: 1 → 39
  - Updated `yesNo('st', …)` points: 1 → 28
  - Updated `yesNo('enzyme', …)` points: 1 → 14
  - Option `points` metadata adjusted (0 → 4 point annotations; sum 0 → 118)
  - Updated result `details` content (criterion checklist / input status)
  - Updated `calculate()` scoring / branching logic
  - Replaced simplified linear GRACE approximation with standard GRACE point tables

#### `gwtg-hf` — GWTG-HF Risk Score (Simplified)

- **Source file:** `src/data/calculators/wave2-cardiology.ts`
- **Change categories:** option-points
- **Notes:** COPD points aligned (+3).
- **Diff summary:**
  - Updated `yesNo('copd', …)` points: 1 → 3

### H

#### `hall-criteria` — Hall Criteria (IV → Oral Switch, Pneumonia)

- **Source file:** `src/data/calculators/wave2-pulm-id.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('stable24', …)` points: 1 → 0

#### `heart-pathway` — HEART Pathway

- **Source file:** `src/data/calculators/wave2-cardiology.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('serialTropNeg', …)` points: 1 → 0

#### `hep-score` — HEP Score (HIT Expert Probability)

- **Source file:** `src/data/calculators/wave6-heme-onc.ts`
- **Change categories:** option-points
- **Notes:** Pathway-conditional timing inputs (`timingTypical` / `timingRapid`) had points metadata removed so only the active onset pathway is scored without false option badges.
- **Diff summary:**
  - Option `points` metadata adjusted (17 → 8 point annotations; sum 13 → 8)

#### `hepatic-steatosis-index` — Hepatic Steatosis Index (HSI)

- **Source file:** `src/data/calculators/wave4-primary-endo.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('diabetes', …)` points: 1 → 2

#### `hhs-diagnosis` — HHS Diagnostic Criteria Helper

- **Source file:** `src/data/calculators/wave6-clinical-residual.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('ams', …)` points: 1 → 0

#### `hsp-criteria` — IgA Vasculitis (HSP) EULAR/PRINTO/PRES Criteria

- **Source file:** `src/data/calculators/wave6-em-peds.ts`
- **Change categories:** option-points
- **Notes:** histology domain points aligned (+1).
- **Diff summary:**
  - Updated `yesNo('histology', …)` points: 2 → 1

#### `hypercalcemia-of-malignancy` — Hypercalcemia of Malignancy Helper

- **Source file:** `src/data/calculators/wave6-heme-onc.ts`
- **Change categories:** option-points, unused-input-details, logic-or-structure
- **Notes:** symptoms/neuro always in `details`.
- **Diff summary:**
  - Updated `yesNo('symptoms', …)` points: 1 → 0
  - Updated `yesNo('neuro', …)` points: 1 → 0
  - Updated result `details` content (criterion checklist / input status)
  - Updated `calculate()` scoring / branching logic

#### `hyperkalemia-ecg` — Hyperkalemia ECG Changes (Severity Checklist)

- **Source file:** `src/data/calculators/wave5-nephro-gi.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('prProlong', …)` points: 1 → 2
  - Updated `yesNo('lossP', …)` points: 1 → 3
  - Updated `yesNo('wideQrs', …)` points: 1 → 4
  - Updated `yesNo('sine', …)` points: 1 → 5
  - Updated `yesNo('bradyVf', …)` points: 1 → 6

#### `hypoglycemia-level` — ADA Hypoglycemia Level

- **Source file:** `src/data/calculators/wave4-primary-endo.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('symptoms', …)` points: 1 → 0

### I

#### `iadsps-gdm` — IADPSG Gestational Diabetes Thresholds

- **Source file:** `src/data/calculators/wave6-em-peds.ts`
- **Change categories:** option-points, unused-input-details, logic-or-structure
- **Notes:** Overt-diabetes screen flag always in `details`.
- **Diff summary:**
  - Updated `yesNo('overtCheck', …)` points: 1 → 0
  - Updated result `details` content (criterion checklist / input status)
  - Updated `calculate()` scoring / branching logic

#### `ichd-migraine` — ICHD Migraine Without Aura Helper

- **Source file:** `src/data/calculators/wave2-neuro-psych.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('unilateral', …)` points: 1 → 0
  - Updated `yesNo('pulsating', …)` points: 1 → 0
  - Updated `yesNo('moderateSevere', …)` points: 1 → 0
  - Updated `yesNo('aggravation', …)` points: 1 → 0

#### `improve-bleed` — IMPROVE Bleeding Risk Score

- **Source file:** `src/data/calculators/missing-heme-id-nephro.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('ulcer', …)` points: 1 → 4.5
  - Updated `yesNo('bleed3mo', …)` points: 1 → 4
  - Updated `yesNo('plt', …)` points: 1 → 4
  - Updated `yesNo('age85', …)` points: 1 → 3.5
  - Updated `yesNo('hepatic', …)` points: 1 → 2.5
  - Updated `yesNo('renal', …)` points: 1 → 2.5
  - Updated `yesNo('icu', …)` points: 1 → 2.5
  - Updated `yesNo('cvc', …)` points: 1 → 2
  - Updated `yesNo('rheum', …)` points: 1 → 2
  - Updated `yesNo('cancer', …)` points: 1 → 2
  - Updated `yesNo('age40', …)` points: 1 → 1.5

#### `incomplete-kawasaki` — Incomplete Kawasaki Disease Lab Helper

- **Source file:** `src/data/calculators/wave3-peds-ob.ts`
- **Change categories:** unused-input-details, logic-or-structure
- **Notes:** Lab/echo checklist always in `details` including early returns.
- **Diff summary:**
  - Added/expanded `details` so inputs always affect visible output (1 → 3 details blocks)
  - Updated `calculate()` scoring / branching logic

#### `intermacs` — INTERMACS Patient Profile

- **Source file:** `src/data/calculators/wave3-cardio-vasc.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('tempModifier', …)` points: 1 → 0
  - Updated `yesNo('arrhythmiaModifier', …)` points: 1 → 0

#### `io-needle-size` — IO Needle Selection by Age (Educational)

- **Source file:** `src/data/calculators/wave6-em-peds.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('contraindications', …)` points: 1 → -15

### J

#### `jones-criteria` — Jones Criteria (Acute Rheumatic Fever)

- **Source file:** `src/data/calculators/extra.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('strep', …)` points: 1 → 0
  - Updated `yesNo('carditis', …)` points: 1 → 0
  - Updated `yesNo('arthritis', …)` points: 1 → 0
  - Updated `yesNo('chorea', …)` points: 1 → 0
  - Updated `yesNo('erythema', …)` points: 1 → 0
  - Updated `yesNo('nodules', …)` points: 1 → 0
  - Updated `yesNo('arthralgia', …)` points: 1 → 0
  - Updated `yesNo('fever', …)` points: 1 → 0
  - Updated `yesNo('elevatedAPR', …)` points: 1 → 0
  - Updated `yesNo('prolongedPR', …)` points: 1 → 0

#### `jumpstart-triage` — JumpSTART Pediatric MCI Triage

- **Source file:** `src/data/calculators/wave4-icu-vent.ts`
- **Change categories:** unused-input-details, logic-or-structure
- **Notes:** Full branch snapshot in `details` on every triage outcome.
- **Diff summary:**
  - Added/expanded `details` so inputs always affect visible output (0 → 11 details blocks)
  - Updated `calculate()` scoring / branching logic

### K

#### `kawasaki` — Classic Kawasaki Disease Criteria

- **Source file:** `src/data/calculators/missing-heme-id-nephro.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('fever', …)` points: 1 → 0

#### `kdigo-peds-aki` — Pediatric KDIGO AKI Stage (Creatinine)

- **Source file:** `src/data/calculators/wave3-peds-ob.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('dialysis', …)` points: 1 → 3
  - Updated `yesNo('egfr35', …)` points: 1 → 3

#### `kings-college` — King

- **Source file:** `src/data/calculators/missing-gi-liver.ts`
- **Change categories:** option-points, unused-input-details, logic-or-structure
- **Notes:** Individual triad components always in `details`.
- **Diff summary:**
  - Updated `yesNo('enceph34', …)` points: 1 → 0
  - Updated `yesNo('inr65', …)` points: 1 → 0
  - Updated `yesNo('cr34', …)` points: 1 → 0
  - Updated `yesNo('inr35', …)` points: 1 → 0
  - Updated `yesNo('bili175', …)` points: 1 → 0
  - Updated `yesNo('ageExtreme', …)` points: 1 → 0
  - Updated `yesNo('unfavEtiol', …)` points: 1 → 0
  - Updated `yesNo('jaundiceEnceph7', …)` points: 1 → 0
  - Updated result `details` content (criterion checklist / input status)
  - Updated `calculate()` scoring / branching logic

#### `kocher-criteria` — Kocher Criteria (Pediatric Septic Hip)

- **Source file:** `src/data/calculators/wave2-ortho-trauma.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('crp', …)` points: 1 → 0

### L

#### `lille-score` — Lille Model (Alcoholic Hepatitis)

- **Source file:** `src/data/calculators/missing-gi-liver.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('renal', …)` points: 1 → 0.023000000000000007

#### `lithium-level` — Lithium Level Interpretation

- **Source file:** `src/data/calculators/wave5-tox-psych.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('neuro', …)` points: 1 → 0
  - Updated `yesNo('renal', …)` points: 1 → 0

#### `liver-trauma-aast` — AAST Liver Injury Scale

- **Source file:** `src/data/calculators/wave5-surg-uro-ent.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('unstable', …)` points: 1 → 0
  - Updated `yesNo('blush', …)` points: 1 → 0

### M

#### `maintenance-electrolyte` — Maintenance Electrolytes (Na / K)

- **Source file:** `src/data/calculators/wave6-formulas-misc.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('anuria', …)` points: 1 → 0

#### `mayo-psc` — Mayo Risk Score (PSC)

- **Source file:** `src/data/calculators/missing-gi-liver.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('variceal', …)` points: 1 → 1.24

#### `mdq` — MDQ (Mood Disorder Questionnaire)

- **Source file:** `src/data/calculators/missing-neuro-psych.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('samePeriod', …)` points: 1 → 0

#### `meld` — MELD Score

- **Source file:** `src/data/calculators/gi-neuro-psych.ts`
- **Change categories:** option-points, logic-or-structure
- **Notes:** **Clinical metadata fix:** Dialysis correctly forces creatinine to 4.0 mg/dL (OPTN). Points metadata omitted (`null`) so UI does not show a false fixed “+N” chip.
- **Diff summary:**
  - Updated `yesNo('dialysis', …)` points: 1 → null
  - Updated `calculate()` scoring / branching logic

#### `meld-3-edu` — MELD 3.0 (Educational)

- **Source file:** `src/data/calculators/wave6-clinical-residual.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('dialysis', …)` points: 1 → 8

#### `meld-xi` — MELD-XI Score

- **Source file:** `src/data/calculators/wave3-gi-hep.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('dialysis', …)` points: 1 → 17

#### `methemoglobin-level` — Methemoglobin Severity

- **Source file:** `src/data/calculators/wave5-tox-psych.ts`
- **Change categories:** option-points, unused-input-details, logic-or-structure
- **Notes:** Symptomatic flag always in `details`.
- **Diff summary:**
  - Updated `yesNo('symptomatic', …)` points: 1 → 0
  - Updated `yesNo('severe', …)` points: 1 → 0
  - Updated `yesNo('g6pd', …)` points: 1 → 0
  - Updated result `details` content (criterion checklist / input status)
  - Updated `calculate()` scoring / branching logic

#### `methotrexate-toxicity` — Methotrexate Level–Time Helper

- **Source file:** `src/data/calculators/wave5-tox-psych.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('aki', …)` points: 1 → 0
  - Updated `yesNo('third_space', …)` points: 1 → 0

#### `mets-estimate` — METs Estimate from Activity

- **Source file:** `src/data/calculators/wave5-cardio.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('limitedByChest', …)` points: 1 → 0

#### `milan-criteria` — Milan Criteria (HCC Transplant)

- **Source file:** `src/data/calculators/wave2-oncology.ts`
- **Change categories:** option-points, unused-input-details, logic-or-structure
- **Notes:** Pattern drives branch; always in `details`.
- **Diff summary:**
  - Updated `yesNo('vascular', …)` points: 1 → -1
  - Updated `yesNo('extrahepatic', …)` points: 1 → -1
  - Added/expanded `details` so inputs always affect visible output (1 → 3 details blocks)
  - Updated `calculate()` scoring / branching logic

#### `modified-bishop` — Modified Bishop Score

- **Source file:** `src/data/calculators/wave6-em-peds.ts`
- **Change categories:** unused-input-details, logic-or-structure
- **Notes:** effaceMode always in `details`.
- **Diff summary:**
  - Updated result `details` content (criterion checklist / input status)
  - Updated `calculate()` scoring / branching logic

#### `myxedema` — Myxedema Coma Diagnostic Score (Simplified)

- **Source file:** `src/data/calculators/wave3-tox-endo-heme.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('knownHypo', …)` points: 1 → 10

### N

#### `nac-dosing` — N-Acetylcysteine IV Dosing (21-hour)

- **Source file:** `src/data/calculators/wave3-tox-endo-heme.ts`
- **Change categories:** unused-input-details, logic-or-structure
- **Notes:** 100 kg dose-cap choice always in `details`.
- **Diff summary:**
  - Updated result `details` content (criterion checklist / input status)
  - Updated `calculate()` scoring / branching logic

#### `nafld-fibrosis` — NAFLD Fibrosis Score

- **Source file:** `src/data/calculators/missing-gi-liver.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('ifg', …)` points: 1 → 1.1300000000000001

#### `nccn-distress` — NCCN Distress Thermometer

- **Source file:** `src/data/calculators/wave2-oncology.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('practical', …)` points: 1 → 0
  - Updated `yesNo('family', …)` points: 1 → 0
  - Updated `yesNo('emotional', …)` points: 1 → 0
  - Updated `yesNo('spiritual', …)` points: 1 → 0
  - Updated `yesNo('physical', …)` points: 1 → 0

#### `needle-stick-pep` — Occupational Needle-Stick PEP Helper

- **Source file:** `src/data/calculators/wave5-tox-psych.ts`
- **Change categories:** option-points, unused-input-details, logic-or-structure
- **Notes:** Source HBsAg always in `details`.
- **Diff summary:**
  - Updated `yesNo('source_hbsag', …)` points: 1 → 0
  - Updated `yesNo('within_72h', …)` points: 1 → 0
  - Updated result `details` content (criterion checklist / input status)
  - Updated `calculate()` scoring / branching logic

#### `neer-classification` — Neer Classification (Proximal Humerus)

- **Source file:** `src/data/calculators/wave2-ortho-trauma.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('headSplit', …)` points: 1 → 0
  - Updated `yesNo('dislocation', …)` points: 1 → 0

#### `neonatal-eos-kaiser` — Kaiser Early-Onset Sepsis Calculator (Simplified Educational)

- **Source file:** `src/data/calculators/wave6-em-peds.ts`
- **Change categories:** option-points
- **Notes:** clinicalIllness points aligned with calculate() (+4).
- **Diff summary:**
  - Updated `yesNo('clinicalIllness', …)` points: 3 → 4

#### `neutropenic-colitis` — Neutropenic Colitis (Typhlitis) Risk Features

- **Source file:** `src/data/calculators/wave6-heme-onc.ts`
- **Change categories:** option-points, logic-or-structure
- **Notes:** C. diff flag always in `details` + interpretation note.
- **Diff summary:**
  - Updated `yesNo('cDiff', …)` points: 1 → 0
  - Updated `calculate()` scoring / branching logic

#### `nihss` — NIH Stroke Scale (NIHSS)

- **Source file:** `src/data/calculators/gi-neuro-psych.ts`
- **Change categories:** clinical-scoring, unused-input-details, logic-or-structure
- **Notes:** **Major clinical fix:** Expanded to full 15-item NIHSS with separate left/right arm and leg motor scores (max **42**), matching MDCalc NIHSS.
- **Diff summary:**
  - Updated result `details` content (criterion checklist / input status)
  - Updated `calculate()` scoring / branching logic
  - Changed select inputs structure

### O

#### `oasis-score` — OASIS ICU Score (Simplified Educational)

- **Source file:** `src/data/calculators/wave6-psych-sleep.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('vent', …)` points: 1 → 9
  - Updated `yesNo('elective', …)` points: 1 → -2
  - Updated `yesNo('cancer', …)` points: 1 → 2

#### `odds-to-risk` — Odds ↔ Probability

- **Source file:** `src/data/calculators/wave4-formulas.ts`
- **Change categories:** unused-input-details, logic-or-structure
- **Notes:** probUnit always reflected in output.
- **Diff summary:**
  - Updated result `details` content (criterion checklist / input status)
  - Updated `calculate()` scoring / branching logic

#### `organophosphate` — Organophosphate Severity & Atropine Start

- **Source file:** `src/data/calculators/wave5-tox-psych.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('bronchorrhea', …)` points: 1 → -0.75
  - Updated `yesNo('bradycardia', …)` points: 1 → 0

#### `ort` — Opioid Risk Tool (ORT)

- **Source file:** `src/data/calculators/wave4-neuro-psych.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('fhIllegal', …)` points: 1 → 2
  - Updated `yesNo('fhRx', …)` points: 1 → 4
  - Updated `yesNo('phAlcohol', …)` points: 1 → 3
  - Updated `yesNo('phIllegal', …)` points: 1 → 4
  - Updated `yesNo('phRx', …)` points: 1 → 5
  - Updated `yesNo('sexualAbuse', …)` points: 1 → 3
  - Updated `yesNo('psychAdd', …)` points: 1 → 2

#### `osteoporosis-t` — DXA T-Score Interpretation (WHO)

- **Source file:** `src/data/calculators/wave4-primary-endo.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('fragilityFx', …)` points: 1 → 0

#### `ottawa-ankle` — Ottawa Ankle Rules

- **Source file:** `src/data/calculators/emergency-misc.ts`
- **Change categories:** option-points, logic-or-structure
- **Notes:** **Logic/UX:** Zone-specific Ottawa Ankle Rules preserved; always-on `details` for every criterion so zone and findings always affect output.
- **Diff summary:**
  - Updated `yesNo('malleolarPain', …)` points: 1 → 0
  - Updated `yesNo('midfootPain', …)` points: 1 → 0
  - Updated `yesNo('postLat', …)` points: 1 → 0
  - Updated `yesNo('postMed', …)` points: 1 → 0
  - Updated `yesNo('navicular', …)` points: 1 → 0
  - Updated `yesNo('base5', …)` points: 1 → 0
  - Updated `yesNo('walk', …)` points: 1 → 0
  - Updated `calculate()` scoring / branching logic

#### `ottawa-foot` — Ottawa Foot Rules

- **Source file:** `src/data/calculators/missing-emergency.ts`
- **Change categories:** option-points, logic-or-structure
- **Notes:** Always-on criterion `details` for midfoot pathway.
- **Diff summary:**
  - Updated `yesNo('midfootPain', …)` points: 1 → 0
  - Updated `yesNo('navicular', …)` points: 1 → 0
  - Updated `yesNo('base5', …)` points: 1 → 0
  - Updated `yesNo('walk', …)` points: 1 → 0
  - Updated `calculate()` scoring / branching logic

#### `ottawa-hip` — Ottawa Hip Rules

- **Source file:** `src/data/calculators/wave2-ortho-trauma.ts`
- **Change categories:** option-points, logic-or-structure
- **Notes:** Age/walk/ROM/trauma always in `details`.
- **Diff summary:**
  - Updated `yesNo('traumaPain', …)` points: 1 → 0
  - Updated `yesNo('age65', …)` points: 1 → 0
  - Updated `yesNo('walk', …)` points: 1 → 0
  - Updated `yesNo('limitedRom', …)` points: 1 → 0
  - Updated `calculate()` scoring / branching logic

### P

#### `pals-cpr-depth` — PALS CPR Depth and Rate Reference

- **Source file:** `src/data/calculators/wave6-em-peds.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('advancedAirway', …)` points: 1 → 0

#### `partogram-alert` — Partogram Progress Alert (Educational)

- **Source file:** `src/data/calculators/wave3-peds-ob.ts`
- **Change categories:** option-points, unused-input-details, logic-or-structure
- **Notes:** Parity + educational min rate always in `details`.
- **Diff summary:**
  - Updated `yesNo('ruptured', …)` points: 1 → 0
  - Updated `yesNo('adequateMvus', …)` points: 1 → 0
  - Updated result `details` content (criterion checklist / input status)
  - Updated `calculate()` scoring / branching logic

#### `passive-leg-raise` — Passive Leg Raise (PLR) Interpretation

- **Source file:** `src/data/calculators/wave3-nephro-icu.ts`
- **Change categories:** unused-input-details, logic-or-structure
- **Notes:** Metric label always in interpretation/`details`.
- **Diff summary:**
  - Updated result `details` content (criterion checklist / input status)
  - Updated `calculate()` scoring / branching logic

#### `pc-ptsd` — PC-PTSD-5 Screen

- **Source file:** `src/data/calculators/wave4-neuro-psych.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('trauma', …)` points: 1 → 0
  - Updated `yesNo('q1', …)` points: 1 → 0
  - Updated `yesNo('q2', …)` points: 1 → 0
  - Updated `yesNo('q3', …)` points: 1 → 0
  - Updated `yesNo('q4', …)` points: 1 → 0
  - Updated `yesNo('q5', …)` points: 1 → 0

#### `pecarn-abd` — PECARN Blunt Abdominal Trauma (Simplified)

- **Source file:** `src/data/calculators/wave3-peds-ob.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('distracting', …)` points: 1 → 0

#### `pecarn-head` — PECARN Head Injury (Simplified)

- **Source file:** `src/data/calculators/emergency-misc.ts`
- **Change categories:** option-points, logic-or-structure
- **Notes:** Age-group branch visibility in interpretation/`details` for <2 vs ≥2 years.
- **Diff summary:**
  - Updated `yesNo('gcs14', …)` points: 1 → 2
  - Updated `yesNo('palpable', …)` points: 1 → 2
  - Updated `calculate()` scoring / branching logic

#### `pediatric-sirs` — Pediatric SIRS Criteria

- **Source file:** `src/data/calculators/wave6-em-peds.ts`
- **Change categories:** option-points, unused-input-details
- **Notes:** bands always in `details`.
- **Diff summary:**
  - Updated `yesNo('bands', …)` points: 1 → 0
  - Updated result `details` content (criterion checklist / input status)

#### `peld-score` — PELD Score

- **Source file:** `src/data/calculators/wave3-gi-hep.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('ageUnder1', …)` points: 1 → 4
  - Updated `yesNo('growthFailure', …)` points: 1 → 7

#### `phoenix-sepsis-simp` — Phoenix Sepsis Criteria (Simplified Educational)

- **Source file:** `src/data/calculators/wave6-em-peds.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('infection', …)` points: 1 → 0

#### `phq-a` — PHQ-A (Adolescent) Total Interpretation

- **Source file:** `src/data/calculators/wave5-tox-psych.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('item9', …)` points: 1 → 0

#### `pittsburgh-knee` — Pittsburgh Knee Rules

- **Source file:** `src/data/calculators/wave2-ortho-trauma.ts`
- **Change categories:** option-points, logic-or-structure
- **Notes:** Mechanism/ageExtreme/walk always in `details`.
- **Diff summary:**
  - Updated `yesNo('mechanism', …)` points: 1 → 0
  - Updated `yesNo('ageExtreme', …)` points: 1 → 0
  - Updated `yesNo('walk', …)` points: 1 → 0
  - Updated `calculate()` scoring / branching logic

#### `posum-simp` — POSSUM Surgical Risk (Simplified Educational)

- **Source file:** `src/data/calculators/wave3-em-surgery.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('emergency', …)` points: 1 → 3

#### `potassium-iv-rate` — IV Potassium Rate Safety Check

- **Source file:** `src/data/calculators/wave3-nephro-icu.ts`
- **Change categories:** option-points, unused-input-details, logic-or-structure
- **Notes:** Monitor/ICU flags always in `details`.
- **Diff summary:**
  - Updated `yesNo('monitor', …)` points: 1 → 0
  - Updated `yesNo('icu', …)` points: 1 → 0
  - Updated result `details` content (criterion checklist / input status)
  - Updated `calculate()` scoring / branching logic

#### `pph-class` — Postpartum Hemorrhage Blood Loss Classification

- **Source file:** `src/data/calculators/wave6-em-peds.ts`
- **Change categories:** option-points, unused-input-details, logic-or-structure
- **Notes:** ongoing bleeding always in `details`.
- **Diff summary:**
  - Updated `yesNo('tachycardia', …)` points: 1 → 0
  - Updated `yesNo('hypotension', …)` points: 1 → 0
  - Updated `yesNo('altered', …)` points: 1 → 0
  - Updated `yesNo('ongoing', …)` points: 1 → 0
  - Updated result `details` content (criterion checklist / input status)
  - Updated `calculate()` scoring / branching logic

#### `precise-dapt` — PRECISE-DAPT (Simplified Educational)

- **Source file:** `src/data/calculators/wave3-cardio-vasc.ts`
- **Change categories:** option-points
- **Notes:** priorBleed points aligned (+15).
- **Diff summary:**
  - Updated `yesNo('priorBleed', …)` points: 1 → 15

#### `preeclampsia-criteria` — Preeclampsia Diagnostic Criteria Helper

- **Source file:** `src/data/calculators/missing-peds-ob-tox.ts`
- **Change categories:** unused-input-details, logic-or-structure
- **Notes:** All end-organ flags listed in `details` on every branch.
- **Diff summary:**
  - Added/expanded `details` so inputs always affect visible output (2 → 3 details blocks)
  - Updated `calculate()` scoring / branching logic

#### `prevent-cvd` — Framingham-Style 10-Year Hard CHD Risk (Educational)

- **Source file:** `src/data/calculators/missing-cardio-pulm.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('treatedHtn', …)` points: 1 → 0
  - Updated `yesNo('smoker', …)` points: 1 → 0
  - Updated `yesNo('diabetes', …)` points: 1 → 0

#### `procalcitonin-guide` — Procalcitonin Antibiotic Guidance Bands

- **Source file:** `src/data/calculators/wave2-pulm-id.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('unstable', …)` points: 1 → 0
  - Updated `yesNo('highSuspicion', …)` points: 1 → 0

#### `pth-interpretation` — PTH with Calcium Pattern Interpreter

- **Source file:** `src/data/calculators/wave4-primary-endo.ts`
- **Change categories:** option-points, unused-input-details, logic-or-structure
- **Notes:** CKD context always in `details`/interpretation.
- **Diff summary:**
  - Updated `yesNo('ckd', …)` points: 1 → 0
  - Updated result `details` content (criterion checklist / input status)
  - Updated `calculate()` scoring / branching logic

#### `pulse-pressure-variation` — Pulse Pressure Variation (PPV)

- **Source file:** `src/data/calculators/wave3-nephro-icu.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('valid', …)` points: 1 → 0

### R

#### `rabies-pep` — Rabies Post-Exposure Prophylaxis Helper

- **Source file:** `src/data/calculators/wave5-tox-psych.ts`
- **Change categories:** option-points, unused-input-details, logic-or-structure
- **Notes:** Observation availability always in `details`.
- **Diff summary:**
  - Updated `yesNo('available_observe', …)` points: 1 → 0
  - Updated result `details` content (criterion checklist / input status)
  - Updated `calculate()` scoring / branching logic

#### `race-scale` — RACE Scale (Prehospital LVO)

- **Source file:** `src/data/calculators/wave4-neuro-psych.ts`
- **Change categories:** unused-input-details, logic-or-structure
- **Notes:** Both aphasia and agnosia always appear in `details`.
- **Diff summary:**
  - Updated result `details` content (criterion checklist / input status)
  - Updated `calculate()` scoring / branching logic

#### `renal-trauma-aast` — AAST Kidney Injury Scale

- **Source file:** `src/data/calculators/wave5-surg-uro-ent.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('hemodynamicUnstable', …)` points: 1 → 0

#### `reynolds-risk` — Reynolds Risk Score (Simplified Educational)

- **Source file:** `src/data/calculators/wave3-cardio-vasc.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('smoker', …)` points: 1 → 0
  - Updated `yesNo('parentMi', …)` points: 1 → 0
  - Updated `yesNo('dm', …)` points: 1 → 0

#### `rome-iv-ibs` — Rome IV IBS Criteria Helper

- **Source file:** `src/data/calculators/wave3-em-surgery.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('recurrentPain', …)` points: 1 → 0
  - Updated `yesNo('onset6mo', …)` points: 1 → 0

#### `rule-of-nines` — Rule of Nines (Adult TBSA)

- **Source file:** `src/data/calculators/emergency-misc.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('head', …)` points: 1 → 9
  - Updated `yesNo('antTrunk', …)` points: 1 → 18
  - Updated `yesNo('postTrunk', …)` points: 1 → 18
  - Updated `yesNo('armR', …)` points: 1 → 9
  - Updated `yesNo('armL', …)` points: 1 → 9
  - Updated `yesNo('legR', …)` points: 1 → 18
  - Updated `yesNo('legL', …)` points: 1 → 18

#### `runyon-criteria` — Runyon Criteria (Secondary Peritonitis)

- **Source file:** `src/data/calculators/wave3-gi-hep.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('polyMicro', …)` points: 1 → 0
  - Updated `yesNo('noResponse', …)` points: 1 → 0

### S

#### `salicylate-level` — Salicylate Toxicity Severity Helper

- **Source file:** `src/data/calculators/wave3-tox-endo-heme.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('altered', …)` points: 1 → 0
  - Updated `yesNo('acidemia', …)` points: 1 → 0

#### `salt-triage` — SALT Mass Casualty Triage

- **Source file:** `src/data/calculators/wave4-icu-vent.ts`
- **Change categories:** logic-or-structure
- **Notes:** **Logic fix:** Full SALT algorithm path (walk → minimal; breathing/obeys/pulse/distress/likelySurvive for immediate/delayed/expectant/dead).
- **Diff summary:**
  - Updated `calculate()` scoring / branching logic

#### `saps-iii-simp` — SAPS III Simplified (Educational)

- **Source file:** `src/data/calculators/wave6-psych-sleep.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('infection', …)` points: 1 → 5
  - Updated `yesNo('cancer_meta', …)` points: 1 → 8
  - Updated `yesNo('heme_cancer', …)` points: 1 → 6
  - Updated `yesNo('cirrhosis', …)` points: 1 → 6
  - Updated `yesNo('heart_fail', …)` points: 1 → 4
  - Updated `yesNo('vent', …)` points: 1 → 5

#### `scai-shock` — SCAI Cardiogenic Shock Stages

- **Source file:** `src/data/calculators/wave3-cardio-vasc.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('lactateHigh', …)` points: 1 → 0
  - Updated `yesNo('vasoactive', …)` points: 1 → 0
  - Updated `yesNo('mcs', …)` points: 1 → 0

#### `schwartz-lqts` — Schwartz LQTS Diagnostic Score

- **Source file:** `src/data/calculators/wave5-cardio.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('lowHr', …)` points: 1 → 0.5
  - Updated `yesNo('congenitalDeafness', …)` points: 1 → 0.5

#### `score2-europe` — SCORE2 (Simplified Educational)

- **Source file:** `src/data/calculators/wave3-cardio-vasc.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('smoker', …)` points: 1 → 0

#### `sepsis-3-shock` — Sepsis-3 Septic Shock Helper

- **Source file:** `src/data/calculators/wave2-pulm-id.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('infection', …)` points: 1 → 0
  - Updated `yesNo('fluids', …)` points: 1 → 0
  - Updated `yesNo('vasopressors', …)` points: 1 → 0

#### `serotonin-syndrome` — Hunter Serotonin Toxicity Criteria

- **Source file:** `src/data/calculators/wave3-tox-endo-heme.ts`
- **Change categories:** unused-input-details, logic-or-structure
- **Notes:** Hunter criteria tree: agitation/diaphoresis wired; detail rows for both.
- **Diff summary:**
  - Updated result `details` content (criterion checklist / input status)
  - Updated `calculate()` scoring / branching logic

#### `snellen-logmar` — Snellen to LogMAR

- **Source file:** `src/data/calculators/wave6-scores-residual.ts`
- **Change categories:** unused-input-details, logic-or-structure
- **Notes:** Input mode always in `details`/interpretation.
- **Diff summary:**
  - Updated result `details` content (criterion checklist / input status)
  - Updated `calculate()` scoring / branching logic

#### `sofa-delta` — SOFA Delta (Sepsis-3 Organ Dysfunction)

- **Source file:** `src/data/calculators/missing-heme-id-nephro.ts`
- **Change categories:** option-points
- **Notes:** Infection context always in `details`.
- **Diff summary:**
  - Updated `yesNo('infection', …)` points: 1 → 0

#### `somogyi-dawn` — Somogyi vs Dawn Phenomenon Helper

- **Source file:** `src/data/calculators/wave6-clinical-residual.ts`
- **Change categories:** option-points, unused-input-details, logic-or-structure
- **Notes:** nightSweats always in `details`.
- **Diff summary:**
  - Updated `yesNo('nightSweats', …)` points: 1 → 0
  - Updated `yesNo('cgmHypo', …)` points: 1 → 0
  - Updated result `details` content (criterion checklist / input status)
  - Updated `calculate()` scoring / branching logic

#### `sort-score` — SORT — Surgical Outcome Risk Tool (Simplified)

- **Source file:** `src/data/calculators/wave5-surg-uro-ent.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('highRiskSpecialty', …)` points: 1 → 0.17000000000000004
  - Updated `yesNo('cancer', …)` points: 1 → 0.11

#### `splenic-trauma-aast` — AAST Spleen Injury Scale

- **Source file:** `src/data/calculators/wave5-surg-uro-ent.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('contrastBlush', …)` points: 1 → 0
  - Updated `yesNo('unstable', …)` points: 1 → 0

#### `spot-sign` — CTA Spot Sign Helper (ICH Expansion)

- **Source file:** `src/data/calculators/wave4-neuro-psych.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('ctaDone', …)` points: 1 → 0
  - Updated `yesNo('spotSign', …)` points: 1 → 2

#### `start-triage` — START Triage Helper

- **Source file:** `src/data/calculators/missing-emergency.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('canWalk', …)` points: 1 → -1

#### `status-epilepticus` — Status Epilepticus Time Thresholds

- **Source file:** `src/data/calculators/wave2-neuro-psych.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('recurrent', …)` points: 1 → 0

### T

#### `target-spo2-copd` — Target SpO₂ (COPD vs Normal)

- **Source file:** `src/data/calculators/wave6-formulas-misc.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('onOxygen', …)` points: 1 → 0

#### `tbi-severity` — TBI Severity by GCS

- **Source file:** `src/data/calculators/wave4-neuro-psych.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('intubated', …)` points: 1 → 0
  - Updated `yesNo('postTraumaticAmnesia', …)` points: 1 → 0
  - Updated `yesNo('loc', …)` points: 1 → 0

#### `theophylline-level` — Theophylline Level Interpretation

- **Source file:** `src/data/calculators/wave5-tox-psych.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('seizure', …)` points: 1 → 0
  - Updated `yesNo('unstable', …)` points: 1 → 0

#### `thyroid-function-pattern` — Thyroid Function Pattern Interpreter

- **Source file:** `src/data/calculators/wave4-primary-endo.ts`
- **Change categories:** option-points, unused-input-details, logic-or-structure
- **Notes:** Non-thyroidal illness context always in `details`.
- **Diff summary:**
  - Updated `yesNo('ill', …)` points: 1 → 0
  - Updated result `details` content (criterion checklist / input status)
  - Updated `calculate()` scoring / branching logic

#### `total-daily-insulin` — Weight-Based Total Daily Insulin Estimate

- **Source file:** `src/data/calculators/wave4-primary-endo.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('ketosis', …)` points: 1 → 0

#### `triglyceride-pancreatitis` — Triglyceride Pancreatitis Risk Bands

- **Source file:** `src/data/calculators/wave5-cardio.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('priorPancreatitis', …)` points: 1 → 0
  - Updated `yesNo('diabetes', …)` points: 1 → 0
  - Updated `yesNo('alcohol', …)` points: 1 → 0

#### `triss` — TRISS Survival Probability

- **Source file:** `src/data/calculators/wave2-ortho-trauma.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('age55', …)` points: 1 → -28.9

#### `ttn-vs-rds` — TTN vs RDS Clinical Pattern Helper

- **Source file:** `src/data/calculators/wave6-em-peds.ts`
- **Change categories:** option-points, unused-input-details, logic-or-structure
- **Notes:** prematurityRisk / steroids flag always in `details`.
- **Diff summary:**
  - Updated `yesNo('csection', …)` points: 1 → 2
  - Updated `yesNo('grunting', …)` points: 1 → 0
  - Updated `yesNo('cyanosisO2', …)` points: 1 → 0
  - Updated `yesNo('fluidCXR', …)` points: 1 → 3
  - Updated `yesNo('reticCXR', …)` points: 1 → -3
  - Updated `yesNo('improving6_12', …)` points: 1 → 3
  - Updated `yesNo('worsening', …)` points: 1 → -2
  - Updated `yesNo('prematurityRisk', …)` points: 1 → -2
  - Updated result `details` content (criterion checklist / input status)
  - Updated `calculate()` scoring / branching logic

#### `tuberculosis-risk` — TST Interpretation by Risk Group

- **Source file:** `src/data/calculators/wave2-pulm-id.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('bcg', …)` points: 1 → 0
  - Updated `yesNo('igraPrefer', …)` points: 1 → 0

#### `tumor-lysis-clinical` — Clinical Tumor Lysis Syndrome

- **Source file:** `src/data/calculators/wave6-heme-onc.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('labTls', …)` points: 1 → 0

### V

#### `valproate-level` — Valproate (VPA) Level Bands

- **Source file:** `src/data/calculators/wave5-tox-psych.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('ams', …)` points: 1 → 0
  - Updated `yesNo('hyperNH3', …)` points: 1 → 0

#### `valvular-af` — Valvular AF Definition Helper

- **Source file:** `src/data/calculators/wave5-cardio.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('bioprosthetic', …)` points: 1 → 0
  - Updated `yesNo('modSevMR', …)` points: 1 → 0
  - Updated `yesNo('asOrAR', …)` points: 1 → 0
  - Updated `yesNo('otherNative', …)` points: 1 → 0

#### `vasospasm-risk` — SAH Vasospasm / DCI Risk Window

- **Source file:** `src/data/calculators/wave4-neuro-psych.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('secured', …)` points: 1 → 0
  - Updated `yesNo('nimodipine', …)` points: 1 → 0

#### `vbac-success` — VBAC Success (Grobman Educational Model)

- **Source file:** `src/data/calculators/missing-peds-ob-tox.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('priorVaginal', …)` points: 1 → 5
  - Updated `yesNo('priorVbac', …)` points: 1 → 4
  - Updated `yesNo('recurringIndication', …)` points: 1 → -7
  - Updated `yesNo('induction', …)` points: 1 → -4

### W

#### `warfarin-inr-goal` — Warfarin INR Goal by Indication

- **Source file:** `src/data/calculators/wave5-cardio.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('recentTe', …)` points: 1 → 0

#### `weber-ankle` — Weber Ankle Fracture Classification

- **Source file:** `src/data/calculators/wave2-ortho-trauma.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('medial', …)` points: 1 → 0
  - Updated `yesNo('unstable', …)` points: 1 → 0

#### `wellens-helper` — Wellens Syndrome Helper

- **Source file:** `src/data/calculators/wave3-cardio-vasc.ts`
- **Change categories:** option-points
- **Notes:** Pattern A/B points aligned.
- **Diff summary:**
  - Updated `yesNo('patternA', …)` points: 1 → 2
  - Updated `yesNo('patternB', …)` points: 1 → 2

#### `west-haven-he` — West Haven Hepatic Encephalopathy Grade

- **Source file:** `src/data/calculators/wave5-nephro-gi.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('precipitant', …)` points: 1 → 0

#### `wfns-sah` — WFNS SAH Grade

- **Source file:** `src/data/calculators/wave4-neuro-psych.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('motorDeficit', …)` points: 1 → 0

#### `who-pneumonia` — WHO Pediatric Pneumonia Classification

- **Source file:** `src/data/calculators/wave5-peds-id.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('danger', …)` points: 1 → 2
  - Updated `yesNo('spo2Low', …)` points: 1 → 2
  - Updated `yesNo('malnutrition', …)` points: 1 → 2

#### `wpw-risk` — WPW Accessory Pathway Risk Features

- **Source file:** `src/data/calculators/wave5-cardio.ts`
- **Change categories:** option-points
- **Diff summary:**
  - Updated `yesNo('septalAP', …)` points: 1 → 0
  - Updated `yesNo('intermittentLoss', …)` points: 1 → 0
  - Updated `yesNo('abruptBlockExercise', …)` points: 1 → 0

---

## Index by source file

### `cardiology.ts` (2)

`ascvd-risk`, `grace`

### `critical-care.ts` (1)

`apache2-simp`

### `emergency-misc.ts` (5)

`canadian-cspine`, `corrected-phenytoin`, `ottawa-ankle`, `pecarn-head`, `rule-of-nines`

### `extra.ts` (3)

`duke-criteria`, `framingham-hf`, `jones-criteria`

### `gi-neuro-psych.ts` (2)

`meld`, `nihss`

### `missing-cardio-pulm.ts` (2)

`berlin-ards`, `prevent-cvd`

### `missing-emergency.ts` (4)

`baux-score`, `canadian-ct-head`, `ottawa-foot`, `start-triage`

### `missing-gi-liver.ts` (4)

`kings-college`, `lille-score`, `mayo-psc`, `nafld-fibrosis`

### `missing-heme-id-nephro.ts` (3)

`improve-bleed`, `kawasaki`, `sofa-delta`

### `missing-neuro-psych.ts` (4)

`aspects`, `cssrs-screen`, `fisher-grade`, `mdq`

### `missing-peds-ob-tox.ts` (2)

`preeclampsia-criteria`, `vbac-success`

### `wave2-cardiology.ts` (6)

`atria-stroke`, `digoxin-level-interpret`, `effect-hf`, `euroscore-ii-simp`, `gwtg-hf`, `heart-pathway`

### `wave2-neuro-psych.ts` (4)

`aed-level`, `free-phenytoin`, `ichd-migraine`, `status-epilepticus`

### `wave2-oncology.ts` (4)

`calvert-carboplatin`, `gail-model-simplified`, `milan-criteria`, `nccn-distress`

### `wave2-ortho-trauma.ts` (6)

`kocher-criteria`, `neer-classification`, `ottawa-hip`, `pittsburgh-knee`, `triss`, `weber-ankle`

### `wave2-pulm-id.ts` (5)

`cdi-severity`, `hall-criteria`, `procalcitonin-guide`, `sepsis-3-shock`, `tuberculosis-risk`

### `wave3-cardio-vasc.ts` (8)

`brugada-criteria`, `crusade`, `intermacs`, `precise-dapt`, `reynolds-risk`, `scai-shock`, `score2-europe`, `wellens-helper`

### `wave3-em-surgery.ts` (5)

`acs-nsqip-simp`, `asa-physical`, `atls-class`, `posum-simp`, `rome-iv-ibs`

### `wave3-gi-hep.ts` (4)

`ascites-pmm`, `meld-xi`, `peld-score`, `runyon-criteria`

### `wave3-nephro-icu.ts` (5)

`akin-aki`, `fena-diuretic`, `passive-leg-raise`, `potassium-iv-rate`, `pulse-pressure-variation`

### `wave3-peds-ob.ts` (7)

`asthma-exacerbation-peds`, `bronchiolitis-severity`, `gestational-htn`, `incomplete-kawasaki`, `kdigo-peds-aki`, `partogram-alert`, `pecarn-abd`

### `wave3-tox-endo-heme.ts` (5)

`fomepizole-dose`, `myxedema`, `nac-dosing`, `salicylate-level`, `serotonin-syndrome`

### `wave4-em-id.ts` (2)

`de-winter`, `delta-troponin`

### `wave4-formulas.ts` (1)

`odds-to-risk`

### `wave4-icu-vent.ts` (2)

`jumpstart-triage`, `salt-triage`

### `wave4-neuro-psych.ts` (9)

`ciwa-b`, `concussion-return`, `ort`, `pc-ptsd`, `race-scale`, `spot-sign`, `tbi-severity`, `vasospasm-risk`, `wfns-sah`

### `wave4-primary-endo.ts` (7)

`bp-classification`, `hepatic-steatosis-index`, `hypoglycemia-level`, `osteoporosis-t`, `pth-interpretation`, `thyroid-function-pattern`, `total-daily-insulin`

### `wave5-cardio.ts` (8)

`duke-activity`, `gdmt-checklist`, `mets-estimate`, `schwartz-lqts`, `triglyceride-pancreatitis`, `valvular-af`, `warfarin-inr-goal`, `wpw-risk`

### `wave5-general-misc.ts` (1)

`gout-classification`

### `wave5-nephro-gi.ts` (4)

`acr-albumin`, `bicarb-ckd`, `hyperkalemia-ecg`, `west-haven-he`

### `wave5-peds-id.ts` (2)

`exchange-transfusion-threshold`, `who-pneumonia`

### `wave5-surg-uro-ent.ts` (4)

`liver-trauma-aast`, `renal-trauma-aast`, `sort-score`, `splenic-trauma-aast`

### `wave5-tox-psych.ts` (15)

`anaphylaxis-criteria`, `asq-suicide`, `carbamazepine-level`, `co-oximetry`, `cyanide-toxicity`, `epinephrine-im-dose`, `lithium-level`, `methemoglobin-level`, `methotrexate-toxicity`, `needle-stick-pep`, `organophosphate`, `phq-a`, `rabies-pep`, `theophylline-level`, `valproate-level`

### `wave6-clinical-residual.ts` (7)

`abg-stepwise`, `aki-cause`, `ascites-grade`, `fena-contrast`, `hhs-diagnosis`, `meld-3-edu`, `somogyi-dawn`

### `wave6-em-peds.ts` (12)

`arrest-labor`, `eclampsia-mag`, `hsp-criteria`, `iadsps-gdm`, `io-needle-size`, `modified-bishop`, `neonatal-eos-kaiser`, `pals-cpr-depth`, `pediatric-sirs`, `phoenix-sepsis-simp`, `pph-class`, `ttn-vs-rds`

### `wave6-formulas-misc.ts` (2)

`maintenance-electrolyte`, `target-spo2-copd`

### `wave6-heme-onc.ts` (5)

`fn-pathway`, `hep-score`, `hypercalcemia-of-malignancy`, `neutropenic-colitis`, `tumor-lysis-clinical`

### `wave6-psych-sleep.ts` (4)

`buprenorphine-cows`, `eat-26`, `oasis-score`, `saps-iii-simp`

### `wave6-scores-residual.ts` (2)

`berlin-sleep`, `snellen-logmar`

---

## Original audit → fix mapping (high level)

| Audit defect class | Fix approach |
| :--- | :--- |
| **OPTION_POINTS_MISMATCH** (weighted scores) | Set `yesNo` / option `points` to actual `calculate()` delta (e.g. GRACE arrest 39, CRUSADE HF 7). |
| **OPTION_POINTS_MISMATCH** (formula / non-point) | Set points to `0` or omit (`null`) so UI has no false “+1” badge. |
| **UNUSED_INPUT** (false positive: AND/OR early exit) | Always-on `details` listing each criterion; improve audit baselines. |
| **UNUSED_INPUT** (true dead input) | Wire input into `calculate()` and/or interpretation/`details`. |
| **Clinical drift vs MDCalc** | Replace approximations with published point tables (GRACE, NIHSS). |

## Verification

```bash
npx vitest run
# audit-scoring-auto: 0 findings
# audit-master-suite: 0 findings
# audit-deep-logic: 0 issues
# fixed-formulas: pass
```
